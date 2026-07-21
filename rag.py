"""
Core RAG pipeline: YouTube video -> transcript (with fallback chain) -> chunks
-> embeddings -> FAISS index -> retrieval.

Deliberately mirrors rag.py from the PDF tool method-for-method:
  pdf_to_pages         -> get_transcript_segments
  chunk_page_text       -> chunk_transcript
  _rebuild_index        -> identical
  retrieve              -> identical
  retrieve_hybrid        -> identical approach, extended with a quoted-phrase
                            exact-match case (useful for "what did they say
                            about X" style questions on spoken content)
  add_pdf                -> add_video
  remove_pdf             -> remove_video
  get_full_text          -> identical
  is_broad_question       -> identical concept, video-flavored trigger phrases

Supports multiple videos indexed together, same as the PDF tool supports
multiple files - each chunk is tagged with its source video and a start/end
timestamp instead of a page number.
"""

import re
import numpy as np
import faiss
from sentence_transformers import SentenceTransformer

from transcript_fetcher import fetch_transcript, get_video_title, TranscriptFetchError


class YouTubeRag:
    def __init__(self, embed_model_name: str = "all-MiniLM-L6-v2"):
        # Loaded once, reused across the session
        self.embed_model = SentenceTransformer(embed_model_name)
        self.index = None

        self.chunks: list[str] = []
        # chunk_meta[i] = {"source": title, "video_id": ..., "start": sec, "end": sec}
        self.chunk_meta: list[dict] = []

        # full_text_by_source["source_name"] -> full transcript text, for
        # whole-video questions (summaries) scoped to one video or all combined.
        self.full_text_by_source: dict[str, str] = {}

        # source_name -> video_id, so the UI can render/seek the right player
        # without needing to re-derive it from chunk_meta each time.
        self.video_id_by_source: dict[str, str] = {}

    # ---------- Step 1: YouTube video -> transcript segments ----------
    def get_transcript_segments(self, url_or_id: str, groq_api_key: str = None) -> dict:
        """
        Returns {"video_id": ..., "segments": [{"start", "end", "text"}, ...], "source": fetch layer used}
        Raises TranscriptFetchError if every fallback layer fails.
        """
        return fetch_transcript(url_or_id, groq_api_key=groq_api_key)

    # ---------- Step 2: Chunking (word-windowed, timestamps carried through) ----------
    def chunk_transcript(self, segments: list[dict], max_words: int = 250, overlap_words: int = 40) -> list[dict]:
        """
        Flattens transcript segments into a word stream (each word inherits its
        segment's start/end time), then windows over it exactly like the PDF
        tool windows over page words - same max_words/overlap_words knobs -
        except the "position" carried per chunk is a timestamp range, not a
        page number.
        """
        words_with_ts = []
        for seg in segments:
            for w in seg["text"].split():
                words_with_ts.append((w, seg["start"], seg["end"]))

        if not words_with_ts:
            return []

        chunks = []
        step = max_words - overlap_words
        i = 0
        while i < len(words_with_ts):
            window = words_with_ts[i:i + max_words]
            if not window:
                break
            text = " ".join(w for w, _, _ in window)
            chunks.append({
                "text": text,
                "start": window[0][1],
                "end": window[-1][2],
            })
            if i + max_words >= len(words_with_ts):
                break
            i += step
        return chunks

    # ---------- Step 3: Embeddings + Index (rebuilt over all chunks so far) ----------
    def _rebuild_index(self):
        if not self.chunks:
            self.index = None
            return
        embeddings = self.embed_model.encode(
            self.chunks, show_progress_bar=False, convert_to_numpy=True
        )
        dimension = embeddings.shape[1]
        index = faiss.IndexFlatL2(dimension)
        index.add(np.array(embeddings).astype("float32"))
        self.index = index

    # ---------- Step 4: Retrieval (returns chunk + metadata pairs) ----------
    def retrieve(self, query: str, k: int = 4) -> list[dict]:
        """Returns [{"text": chunk, "source": ..., "video_id": ..., "start": sec, "end": sec}, ...]"""
        if self.index is None or not self.chunks:
            return []
        query_vec = self.embed_model.encode([query], convert_to_numpy=True).astype("float32")
        k = min(k, len(self.chunks))
        distances, indices = self.index.search(query_vec, k)
        results = []
        for i in indices[0]:
            if i == -1:
                continue
            results.append({"text": self.chunks[i], **self.chunk_meta[i]})
        return results

    def retrieve_hybrid(self, query: str, k: int = 4) -> list[dict]:
        """
        Same rationale as the PDF tool: vector search alone struggles with
        exact identifiers, because embeddings capture meaning, not literal
        digit sequences - "chapter 3.1.2" and "chapter 3.2.2" look nearly
        identical to the embedding model.

        Extended for spoken content with one addition: quoted phrases in the
        question ("what did he mean by 'compounding returns'") are also
        treated as exact-match candidates first, since a viewer asking about
        a specific phrase they heard wants the literal sentence it appeared
        in, not just a semantically similar one.
        """
        if self.index is None or not self.chunks:
            return []

        # Dotted identifiers (section numbers like "3.2.1") OR bare 4-digit
        # numbers (years like "2017") - video content leans much more on
        # spoken years/dates than a written document does, so the PDF tool's
        # dotted-only pattern would silently miss "what happened in 2017".
        identifier_pattern = r"\b\d+(?:\.\d+){1,3}\b|\b\d{4}\b"
        identifiers = re.findall(identifier_pattern, query)

        quoted_pattern = r"[\"']([^\"']{3,})[\"']"
        quoted_phrases = re.findall(quoted_pattern, query)

        exact_terms = identifiers + quoted_phrases

        exact_matches = []
        if exact_terms:
            for i, chunk in enumerate(self.chunks):
                chunk_lower = chunk.lower()
                if any(term.lower() in chunk_lower for term in exact_terms):
                    exact_matches.append({"text": chunk, **self.chunk_meta[i]})

        vector_matches = self.retrieve(query, k=k)

        seen = set()
        combined = []
        for item in exact_matches + vector_matches:
            key = item["text"]
            if key not in seen:
                combined.append(item)
                seen.add(key)
            if len(combined) >= max(k, len(exact_matches)):
                break

        return combined

    # ---------- End to end setup ----------
    def add_video(
        self,
        url_or_id: str,
        source_name: str = None,
        groq_api_key: str = None,
        max_words: int = 250,
        overlap_words: int = 40,
    ) -> dict:
        """
        Adds one YouTube video into the shared index. Can be called multiple
        times for multiple videos - each call appends rather than replacing.

        Returns {"num_chunks": int, "source": str, "video_id": str, "fetch_layer": str}
        fetch_layer tells the UI which fallback layer produced the transcript
        (captions / ytdlp_captions / whisper) so it can be shown to the user.
        """
        result = self.get_transcript_segments(url_or_id, groq_api_key=groq_api_key)
        video_id = result["video_id"]
        segments = result["segments"]
        # Fetch the real title for a readable UI label unless the caller
        # passed one explicitly (e.g. a re-index) or the lookup fails, in
        # which case the raw video ID is still a usable fallback label.
        source_name = source_name or get_video_title(video_id)

        chunks = self.chunk_transcript(segments, max_words=max_words, overlap_words=overlap_words)
        for c in chunks:
            self.chunks.append(c["text"])
            self.chunk_meta.append({
                "source": source_name,
                "video_id": video_id,
                "start": c["start"],
                "end": c["end"],
            })

        self.full_text_by_source[source_name] = " ".join(c["text"] for c in chunks)
        self.video_id_by_source[source_name] = video_id
        self._rebuild_index()

        return {
            "num_chunks": len(chunks),
            "source": source_name,
            "video_id": video_id,
            "fetch_layer": result["source"],
        }

    def remove_video(self, source_name: str):
        """Removes a previously added video from the index."""
        keep_indices = [i for i, m in enumerate(self.chunk_meta) if m["source"] != source_name]
        self.chunks = [self.chunks[i] for i in keep_indices]
        self.chunk_meta = [self.chunk_meta[i] for i in keep_indices]
        self.full_text_by_source.pop(source_name, None)
        self.video_id_by_source.pop(source_name, None)
        self._rebuild_index()

    def get_full_text(self, source_name: str = None) -> str:
        """Full transcript for one video, or all loaded videos combined if none specified."""
        if source_name:
            return self.full_text_by_source.get(source_name, "")
        return "\n\n".join(
            f"=== {name} ===\n{text}" for name, text in self.full_text_by_source.items()
        )

    @staticmethod
    def is_broad_question(query: str) -> bool:
        """
        Detects whole-video questions (summaries, overviews) that vector
        retrieval handles poorly, since there's no specific passage to match
        against - same idea as the PDF tool, phrased for video content.
        """
        broad_signals = [
            "summar", "what is this video about", "overview of",
            "what does this video cover", "main points", "key takeaways",
            "tl;dr", "gist of", "what's it about", "what happens in this video",
            "what's the video about",
        ]
        q = query.lower()
        return any(signal in q for signal in broad_signals)

    @staticmethod
    def format_timestamp(seconds: float) -> str:
        seconds = int(seconds)
        h, rem = divmod(seconds, 3600)
        m, s = divmod(rem, 60)
        if h:
            return f"{h}:{m:02d}:{s:02d}"
        return f"{m}:{s:02d}"
