# Viva Question Bank — Chat With YouTube (RAG System)

## How to use this

Read through once for understanding, then use the **cheat sheet** at the end for
last-minute review. Practice saying the **2-minute pitch** out loud at least twice —
examiners often just want to see you can explain your own project fluently before
they start asking specifics.

---

## Section 1: Conceptual (RAG & AI basics)

**Q: What is RAG (Retrieval-Augmented Generation)?**
A: RAG is a technique that combines an information retrieval system with a large
language model. Instead of relying only on what the LLM learned during training,
the system first retrieves relevant passages from a content collection — here, a
video's transcript — then gives those passages to the LLM as context so it can
generate an answer grounded in that specific content.

**Q: How is this different from just using ChatGPT?**
A: ChatGPT (or any base LLM) only knows what it learned during training and has no
access to a specific video's spoken content. If you ask it about a video it's never
seen, it can only guess or refuse. This system fetches and indexes the actual
transcript of the video, retrieves the exact relevant moments, and gives them to the
LLM as context — so the answer is grounded in the video rather than the model's
general knowledge.

**Q: What is an embedding?**
A: An embedding is a numerical vector representation of text that captures its
meaning. Texts with similar meaning get vectors that are close together in this
high-dimensional space, even if they use completely different words. This is what
allows "semantic" search, as opposed to matching exact keywords.

**Q: Why do you need a vector database / FAISS?**
A: Once every transcript chunk is converted into an embedding vector, we need an
efficient way to find which vectors are closest to a query's vector. Comparing
against every chunk one by one would be slow at scale. FAISS is a library built
specifically for fast similarity search over large collections of vectors.

**Q: What is semantic search vs keyword search?**
A: Keyword search matches literal words or phrases — it fails if the query uses a
synonym or different phrasing than what was actually said. Semantic search compares
meaning via embeddings, so a question like "how does the model get better with more
data" can match a passage that talks about "scaling laws" even though no words
overlap.

**Q: What is hallucination in LLMs, and how does this project reduce it?**
A: Hallucination is when a language model generates a confident, plausible-sounding
answer that is actually false or fabricated, typically because it's asked about
something outside its training data. This project reduces hallucination by
explicitly instructing the model to answer only from the retrieved transcript
context, and to say so when the answer isn't present in that context, rather than
guessing.

**Q: What is chunking and why is it necessary?**
A: Chunking is splitting the transcript into smaller pieces before embedding them.
It's necessary because embedding an entire two-hour transcript as one vector would
lose fine-grained detail (you couldn't tell which part of the video matched your
query), and because language models have a limited context window, so you can only
feed in a limited amount of text at answer time. Here, chunks are also kept short in
time-span specifically so each one is a useful "jump to this moment" target, not just
a manageable amount of text.

---

## Section 2: Architecture & design

**Q: Walk me through what happens when I paste a YouTube link.**
A: The system first tries to fetch the video's existing captions directly using
youtube-transcript-api. If that fails, it falls back to yt-dlp, which reaches the
same caption tracks through a different code path. If the video has no captions at
all, it downloads the audio and transcribes it using Groq's hosted Whisper model.
Whichever path succeeds, the result is a list of timestamped transcript segments.
These are flattened into a word stream and split into overlapping, fixed-size chunks,
each still carrying a start and end timestamp. Each chunk is converted into a vector
embedding using a sentence-transformer model, and all vectors are added to a FAISS
index. Every chunk is tagged with metadata recording which video it came from and
its timestamp range.

**Q: Walk me through what happens when I ask a question.**
A: First, the system checks whether the question is "broad" (like a summary
request) or "specific." For specific questions, it checks for literal patterns —
years or quoted phrases — and does an exact text match for those first, then fills
the rest with vector similarity search — this is the hybrid retrieval step. For
broad questions, it skips retrieval and sends the whole transcript text instead.
Either way, the retrieved content (with source video and timestamp metadata) is
placed into a prompt and sent to the Groq API, which generates the final answer
with a timestamp citation.

**Q: Why does this project need three different ways to get a transcript?**
A: Not every video is in the same state: some have manually-written captions, some
only have YouTube's auto-generated captions, and some have captions disabled
entirely. youtube-transcript-api is the fastest way to read either of the first two,
but it can be rate-limited or blocked on some networks. yt-dlp reaches the same
captions through a different mechanism, so it's a useful second attempt. Neither
helps if the video genuinely has no captions, so as a last resort the system
transcribes the audio itself using an ASR model. Layering all three makes the system
usable across the full range of videos a student might actually want to ask
questions about.

**Q: Why did you choose FAISS over a full database?**
A: For the scale of a single-user, personal-use application, FAISS is simpler to set
up (an in-memory library, not a separate server process), free, and fast enough. A
full vector database like Pinecone or Weaviate would add operational complexity and,
in Pinecone's case, ongoing cost, without meaningful benefit at this scale.

**Q: Why sentence-transformers/MiniLM instead of a bigger embedding model?**
A: MiniLM is a compact model (~22 million parameters) that runs efficiently on a
CPU with no GPU required, while still producing good-quality embeddings for
semantic search. Larger embedding models would be more accurate but slower and
often require a GPU to run at a reasonable speed — not necessary for this project's
scale.

**Q: Why Groq instead of OpenAI or another paid API — and why also use it for
transcription?**
A: Groq offers a generous free tier and very fast inference for open-weight models
like Llama, which suits a personal/academic project where cost and speed both
matter. Using Groq's hosted Whisper model for the transcription fallback as well
means the whole project depends on a single API provider and a single free tier,
rather than needing a second paid service just for the rare videos with no
captions.

**Q: What's the difference between the indexing phase and the query phase?**
A: Indexing happens once per submitted video: transcript fetching, chunking,
embedding, and adding to the FAISS index. Querying happens every time the user asks
a question: retrieval against the already-built index, followed by answer
generation. Separating these means the expensive transcript-fetching and embedding
steps only happen once per video, not on every question.

---

## Section 3: Technical deep-dive

**Q: What is hybrid retrieval and why did you implement it, specifically for
video content?**
A: Hybrid retrieval combines exact keyword/identifier matching with vector
similarity search. I implemented it after finding that vector search alone
performed poorly on questions containing years or exact quoted phrases — for
example, "what happened in 2017" and "what happened in 2019" produce nearly
identical embeddings because the model captures general meaning, not exact digit
sequences. This matters more for video than for a typical document, because
questions about a video's content often reference a specific year, date, or an
exact remembered phrase from what was said. The system detects these patterns in a
question, searches for literal matches first, then fills any remaining slots with
vector search results.

**Q: How do you detect a "broad" question like a summary request?**
A: I check the question against a list of signal phrases — words like "summarize,"
"overview," "main points," "tl;dr," and similar. If any of these appear, the system
treats it as a whole-video question and skips the normal retrieval path.

**Q: What happens if a video has no captions and Whisper transcription fails too
(for example, ffmpeg isn't installed)?**
A: The system surfaces a clear error message naming which of the three fallback
layers were attempted and why each one failed, rather than crashing or hanging
silently. This makes it easy to diagnose, for example, whether the failure is
network-related, a missing dependency, or a video that's genuinely inaccessible
(private, age-restricted, or region-locked).

**Q: How do you handle multiple videos at once?**
A: Each video is processed independently and added to a single shared FAISS index.
Every chunk carries metadata recording which source video it came from, so when
multiple videos are loaded, retrieval can pull relevant chunks from any of them,
and the final answer cites the correct source video per chunk.

**Q: How is timestamp-level citation achieved, and how does the "jump to this
moment" feature work?**
A: Every transcript segment returned by the transcript-fetching layer already
carries a start and end time. When segments are flattened into a word stream and
regrouped into chunks, each chunk's start and end timestamp is derived from the
timestamps of the words it contains. That timestamp is attached as metadata to the
chunk and included in the citation shown to the user. Clicking the citation in the
interface passes that timestamp to the embedded video player's start-time
parameter, seeking it directly to that moment.

**Q: What's the chunk overlap for and why does it matter?**
A: When the transcript's word stream is split into fixed-size chunks, a small
overlap between consecutive chunks helps preserve context that spans a chunk
boundary — for example, a sentence that starts near the end of one chunk and
continues into the next won't lose its full meaning in either chunk.

**Q: What are the limitations of your system?**
A: It currently only supports YouTube as a video source; it re-processes videos
from scratch each session rather than persisting the index; the Whisper fallback
path depends on ffmpeg being installed on the host machine; it uses a simple
pattern-based detection for broad questions rather than a learned classifier; and
retrieval quality hasn't been measured with formal metrics like precision or
recall, only manual testing.

---

## Section 4: Testing & evaluation

**Q: How did you test your system?**
A: I tested it manually against a set of representative scenarios: adding videos
in each of the three transcript-availability states (manual captions, auto-captions
only, no captions), asking specific factual questions, asking for summaries, asking
about a quoted phrase or a specific year, adding multiple videos together, removing
a loaded video, asking questions with no relevant content in the transcript, and
clicking a timestamp citation to confirm the player seeks correctly. All test cases
produced the expected behavior.

**Q: What would you do to formally evaluate retrieval quality?**
A: I would build a small labeled test set of questions with known correct source
timestamps, then measure standard information-retrieval metrics like precision@k
and recall@k — checking what fraction of retrieved chunks are actually relevant,
and what fraction of relevant chunks get retrieved.

**Q: What edge cases did you consider?**
A: Videos with no captions at all, questions with no answer in the transcript,
multiple videos with overlapping topics, questions referencing a year that also
appears elsewhere in the transcript in an unrelated context, and videos that fail
every transcript-fetching layer (private, age-restricted, or region-locked videos).

---

## Section 5: Tricky / comparative questions examiners like to ask

**Q: Why not just feed the whole transcript into the LLM's context window?**
A: For short videos this can work, and the system actually does this for
whole-video summary questions. But for longer videos, the transcript may exceed
the model's context window, and even when it fits, sending the entire transcript on
every question is slower and, for paid APIs, more expensive than retrieving only
the relevant few chunks.

**Q: Why not just use YouTube's own auto-generated summary or chapters
feature?**
A: YouTube's built-in features are a closed system you can't inspect, customize, or
query with arbitrary natural-language questions — you get a fixed summary or a
fixed chapter list, not an answer to your own specific question, and no way to
verify the answer against an exact cited moment. Building the retrieval pipeline
manually also demonstrates understanding of how grounding and retrieval actually
work underneath, rather than treating it as a black box — which is the point of an
academic project.

**Q: What if two loaded videos contain contradictory information?**
A: Currently, the system would retrieve relevant chunks from both and pass them to
the LLM, which may either mention both perspectives or favor whichever chunk
appears more relevant to the specific question. The system doesn't currently have
explicit conflict-resolution logic; this is a reasonable direction for future work.

**Q: Is this system scalable to hundreds of videos?**
A: The current FAISS index (IndexFlatL2) performs an exact, brute-force search
across all vectors, which is fine for a personal collection but would slow down at
a much larger scale. For hundreds or thousands of videos, an approximate
nearest-neighbor index (like FAISS's IVF or HNSW index types) would trade a small
amount of accuracy for much faster search.

**Q: What are the privacy/cost implications of the Whisper fallback path?**
A: Transcribing audio through Groq's API means, for videos with no captions, the
audio itself (not just retrieved text chunks) leaves the local machine and is sent
to a third-party service. It also uses more of the free API quota than the
captions-based paths, since audio transcription is a heavier operation than a
short chat completion — a consideration if a student loads many uncaptioned videos
in one session.

---

## Cheat sheet — one-pager

| Component | Tool used | One-line justification |
|---|---|---|
| Transcript (primary) | youtube-transcript-api | Fastest — reads existing captions with no download |
| Transcript (fallback 1) | yt-dlp | Reaches the same captions when the primary method is blocked |
| Transcript (fallback 2) | yt-dlp + Groq Whisper | Last resort for videos with no captions at all |
| Chunking | Custom (word-count + timestamp-aware overlap) | Keeps chunks short enough to be a useful "jump to" target |
| Embeddings | sentence-transformers (all-MiniLM-L6-v2) | Runs on CPU, no GPU needed, good quality-to-speed ratio |
| Vector search | FAISS (IndexFlatL2) | Fast, free, in-memory, no server to run |
| Retrieval strategy | Hybrid (keyword + vector) | Fixes vector search's weakness on years and quoted phrases |
| Answer generation | Groq API (Llama models) | Free tier, fast inference, no local GPU needed |
| Interface | Streamlit | Chat UI plus an embedded, jumpable video player |

---

## 2-minute pitch script

Practice saying this out loud until it's fluent — it's meant to sound natural, not
memorized word-for-word.

> "My project is a system that lets you paste a YouTube link and ask questions
> about the video in plain English, and get answers that are actually grounded in
> what was said — with the exact timestamp cited, and a click to jump the player
> straight there — instead of a generic AI response.
>
> The way it works: when you paste a link, I first try to grab the video's existing
> captions. If that's blocked, I fall back to a different tool that reaches the
> same captions a different way. And if the video has no captions at all, I
> transcribe the audio myself using Whisper. Either way, I end up with a timestamped
> transcript, which I split into short, overlapping chunks — short enough that each
> one is a useful moment to jump to, not just a chunk of text.
>
> Each chunk gets converted into a vector embedding using a small model that runs on
> a regular CPU, and all those vectors go into a FAISS index for fast search.
>
> When you ask a question, the system decides whether it's a broad question — like
> asking for a summary — or a specific one, like asking about a particular year or
> an exact phrase. Broad questions get the whole transcript as context. Specific
> questions go through what I call hybrid retrieval: I check if the question
> mentions something like a year or a quoted phrase, and if so, I search for that
> exact text first, because I found that pure vector search actually confuses
> similar years — it can't reliably tell '2017' from '2019' since they mean almost
> the same thing to an embedding model. Vector search fills in the rest.
>
> Whatever's retrieved gets sent to a large language model through Groq's API, which
> is free and fast, and it generates an answer that cites exactly which video and
> timestamp the information came from — and clicking that citation jumps the
> embedded player right to that second.
>
> The whole thing runs on a normal laptop, no GPU, no paid subscriptions — which was
> a deliberate design goal, to show this is achievable without specialized
> infrastructure."

---

## Tips for the actual viva

- If you don't know an answer, say what you *do* know and reason toward it out
  loud — examiners often care more about your thought process than a perfect
  answer.
- If asked "why did you choose X," always have a *comparison in mind* (what you
  didn't choose, and why) — this cheat sheet's justification column is built for
  exactly that.
- Expect at least one "what would you improve" question — Chapter 8 (Future
  Scope) in the report is your prepared answer.
- Expect at least one question specifically about the transcript fallback chain —
  it's the one part of this project with no direct equivalent in a typical
  PDF-based RAG project, so examiners often probe it to see if you actually
  understand it or just copied it.
