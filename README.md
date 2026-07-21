# Chat with YouTube (local RAG, CPU-only)

Paste a YouTube link, ask questions, get answers grounded in the video's transcript —
cited with clickable timestamps that jump the player. No GPU, no paid API.

## How it works

1. **YouTube URL → transcript**, via a 3-layer fallback chain:
   - `youtube-transcript-api` (fastest — no download)
   - `yt-dlp` subtitle download (used when layer 1 is blocked but captions exist)
   - `yt-dlp` audio download + **Groq Whisper** transcription (used only if the
     video has no captions at all)
2. **Chunking** — transcript segments are flattened into a word stream and windowed
   by word count with overlap, same idea as the PDF tool's page chunking, except
   each chunk carries a timestamp range instead of a page number.
3. **Embeddings** (`sentence-transformers`, model: `all-MiniLM-L6-v2`) — same model
   as the PDF tool, runs on CPU, no API needed.
4. **Vector search** (`faiss-cpu`) — local, in-memory index, no server to run.
5. **Hybrid retrieval** — literal exact-match pass first (section numbers, years,
   quoted phrases) merged with vector search results, same rationale as the PDF
   tool's `retrieve_hybrid`.
6. **Answer generation** (Groq's free API) — retrieved chunks are stuffed into a
   prompt and sent to a fast open-weight model, cited by timestamp instead of page.

## Setup

```bash
python3 -m venv venv
source venv/bin/activate        # on Windows: venv\Scripts\activate
pip install -r requirements.txt
```

`yt-dlp`'s Whisper fallback path needs `ffmpeg` installed on the system (for audio
extraction). If you don't have it: `apt install ffmpeg` / `brew install ffmpeg`.

## Get a free Groq API key

1. Go to https://console.groq.com/keys
2. Sign up with email or Google (no credit card required)
3. Create an API key and copy it

Paste it into the app's sidebar when you run it, or set it as an environment
variable `GROQ_API_KEY` so it's pre-filled. Note: the Whisper fallback layer also
uses this same key, so a video with no captions will need it to transcribe at all.

## Run it

```bash
streamlit run app.py
```

From there:

1. Paste your Groq API key in the sidebar
2. Paste a YouTube URL and click "Add video"
3. Wait for transcript fetch + indexing (a spinner shows progress; this takes
   longer if it falls back to Whisper transcription)
4. Ask questions in the chat box
5. Click "▶ Jump to <timestamp>" under any retrieved moment to seek the player there

## Notes

- First run downloads the embedding model (~90MB) from Hugging Face — needs
  internet once, then it's cached locally.
- Videos with captions disabled (auto or manual) will fall back to Whisper
  transcription, which is slower and uses your Groq quota for both transcription
  and the chat answers.
- Some videos may still fail entirely (region-locked, age-restricted, or private) —
  the error message shows which of the three fallback layers were tried and why
  each failed.
- The "Show retrieved moments" expander under each answer shows exactly what
  context the model saw, and lets you jump the player to any cited moment.

## Files

- `app.py` — Streamlit UI (add video, chat, jumpable player)
- `rag.py` — the RAG pipeline logic (reusable outside the UI too)
- `transcript_fetcher.py` — the 3-layer transcript fallback chain
- `requirements.txt` — dependencies

## Reusing the PDF tool's delivery pipeline

Not built yet, but the plan for parity with `pdf-rag-chat`:

- `student_config.json` + `scripts/generate_all.sh` — same config-driven
  report/deck/viva-bank generation, once this app's structure has settled
- `report_template/` and `presentation/` — adapt the existing generators'
  chapter/slide content to describe transcript-based retrieval instead of
  PDF-based retrieval (the architecture diagram, most of chapters 1-3 and 8,
  and roughly half the viva question bank carry over almost unchanged)
- `tracker/Student_Order_Tracker.xlsx` — same tracker, just a second product row
