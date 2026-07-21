"""
Chat with YouTube - RAG chat over a YouTube video's transcript.
Paste one or more YouTube links -> ask questions -> answers grounded in
retrieved transcript chunks, cited with timestamps you can click to jump to
in the video, via Groq's free API.

Run with: streamlit run app.py
"""

import os

import streamlit as st
from groq import Groq

from rag import YouTubeRag
from transcript_fetcher import TranscriptFetchError

st.set_page_config(page_title="Chat with YouTube", page_icon="🎥", layout="wide")

# ---------------- Sidebar: API key + settings ----------------
with st.sidebar:
    st.header("Settings")

    default_key = os.environ.get("GROQ_API_KEY", "")
    groq_key = st.text_input(
        "Groq API key",
        value=default_key,
        type="password",
        help="Free key from https://console.groq.com/keys — never stored, only used in this session.",
    )

    model_name = st.selectbox(
        "Groq model",
        ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
        help="70B is smarter but slower; 8B is near-instant.",
    )

    top_k = st.slider("Chunks to retrieve per question", 2, 8, 4)

    st.markdown("---")
    st.caption(
        "Pipeline: YouTube link → transcript (captions, or yt-dlp, or Groq "
        "Whisper if captions are disabled) → chunks tagged with source + "
        "timestamp → embeddings (sentence-transformers, CPU) → FAISS index → "
        "Groq LLM for the answer."
    )
    st.caption(
        "Note: if a video has no captions at all, transcription falls back "
        "to Groq Whisper, which needs the Groq key above and takes longer."
    )

# ---------------- Session state ----------------
if "chat_history" not in st.session_state:
    st.session_state.chat_history = []
if "loaded_videos" not in st.session_state:
    st.session_state.loaded_videos = set()
if "active_video_id" not in st.session_state:
    st.session_state.active_video_id = None
if "seek_time" not in st.session_state:
    st.session_state.seek_time = 0


@st.cache_resource(show_spinner=False)
def get_rag_engine():
    return YouTubeRag()


rag = get_rag_engine()

# ---------------- Main: add video(s) ----------------
st.title("🎥 Chat with YouTube")
st.caption("A small local RAG pipeline — paste one or more YouTube links, then ask questions across all of them.")

with st.form("add_video_form", clear_on_submit=True):
    url_input = st.text_input("YouTube URL", placeholder="https://www.youtube.com/watch?v=...")
    submitted = st.form_submit_button("Add video")

if submitted and url_input:
    with st.spinner("Fetching transcript and indexing... (this can take a minute if it falls back to Whisper)"):
        try:
            result = rag.add_video(url_input, groq_api_key=groq_key or None)
            st.session_state.loaded_videos.add(result["source"])
            st.session_state.active_video_id = result["video_id"]
            st.session_state.seek_time = 0

            layer_label = {
                "captions": "existing captions",
                "ytdlp_captions": "existing captions (via yt-dlp)",
                "whisper": "Groq Whisper transcription (no captions were available)",
            }.get(result["fetch_layer"], result["fetch_layer"])

            st.success(f"Indexed video into {result['num_chunks']} chunks, using {layer_label}.")
        except TranscriptFetchError as e:
            st.error(f"Couldn't get a transcript for that video:\n\n{e}")
        except ValueError as e:
            st.error(str(e))

# ---------------- Loaded videos panel ----------------
if st.session_state.loaded_videos:
    with st.expander(f"📺 Loaded videos ({len(st.session_state.loaded_videos)})", expanded=False):
        for source_name in sorted(st.session_state.loaded_videos):
            col1, col2, col3 = st.columns([4, 1, 1])
            col1.write(source_name)
            if col2.button("Watch", key=f"watch_{source_name}"):
                st.session_state.active_video_id = rag.video_id_by_source.get(source_name)
                st.session_state.seek_time = 0
                st.rerun()
            if col3.button("Remove", key=f"remove_{source_name}"):
                rag.remove_video(source_name)
                st.session_state.loaded_videos.discard(source_name)
                if rag.video_id_by_source.get(source_name) == st.session_state.active_video_id:
                    st.session_state.active_video_id = None
                st.rerun()

# ---------------- Video player (jumpable) ----------------
if st.session_state.active_video_id:
    st.video(
        f"https://www.youtube.com/watch?v={st.session_state.active_video_id}",
        start_time=int(st.session_state.seek_time),
    )

# ---------------- Chat ----------------
if st.session_state.loaded_videos:
    for msg in st.session_state.chat_history:
        with st.chat_message(msg["role"]):
            st.markdown(msg["content"])

    question = st.chat_input("Ask a question across all loaded videos...")

    if question:
        if not groq_key:
            st.error("Add your Groq API key in the sidebar first (it's free, no credit card needed).")
        else:
            st.session_state.chat_history.append({"role": "user", "content": question})
            with st.chat_message("user"):
                st.markdown(question)

            with st.chat_message("assistant"):
                is_broad = YouTubeRag.is_broad_question(question)

                spinner_msg = (
                    "This looks like a whole-video question, using the full transcript instead of search..."
                    if is_broad
                    else "Retrieving relevant moments and generating an answer..."
                )

                with st.spinner(spinner_msg):
                    if is_broad:
                        # Summaries/overviews need the whole transcript, not
                        # similarity-matched fragments - vector search has
                        # nothing relevant to match a broad question against.
                        retrieved = []
                        context = rag.get_full_text()
                        # Groq free models have limited context; trim defensively.
                        context = context[:24000]
                    else:
                        retrieved = rag.retrieve_hybrid(question, k=top_k)
                        context = "\n\n---\n\n".join(
                            f"[Source: {item['source']}, timestamp {YouTubeRag.format_timestamp(item['start'])}]\n{item['text']}"
                            for item in retrieved
                        )

                    prompt = f"""Answer the question using ONLY the context below. \
If the answer isn't in the context, say you don't have enough information from the video(s). \
When you use information from the context, mention which video and roughly what timestamp it came from.

Context:
{context}

Question: {question}

Answer:"""

                    try:
                        client = Groq(api_key=groq_key)
                        response = client.chat.completions.create(
                            model=model_name,
                            messages=[{"role": "user", "content": prompt}],
                            temperature=0.2,
                        )
                        answer = response.choices[0].message.content
                    except Exception as e:
                        answer = f"Error calling Groq API: {e}"

                    st.markdown(answer)

                    if is_broad:
                        with st.expander("Show what the model actually saw"):
                            st.caption("Whole-video mode: full transcript was sent, not retrieved chunks.")
                            st.markdown(context)
                    else:
                        with st.expander("Show retrieved moments (what the model actually saw)"):
                            for i, item in enumerate(retrieved, 1):
                                label = YouTubeRag.format_timestamp(item["start"])
                                col1, col2 = st.columns([5, 1])
                                col1.markdown(f"**Moment {i}** — *{item['source']}, {label}*\n\n{item['text']}")
                                if col2.button(f"▶ Jump to {label}", key=f"jump_{i}_{item['start']}"):
                                    st.session_state.active_video_id = item["video_id"]
                                    st.session_state.seek_time = int(item["start"])
                                    st.rerun()

            st.session_state.chat_history.append({"role": "assistant", "content": answer})
else:
    st.info("Paste a YouTube link above to get started.")
