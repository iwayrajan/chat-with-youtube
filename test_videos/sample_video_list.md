# Sample test videos

Unlike `pdf-rag-chat/test_pdfs`, these can't be generated as fictional files — a
YouTube video has to actually exist and be hosted there. Also, YouTube's own
auto-captioning has gotten aggressive enough that "no captions at all" is now the
rare case rather than the common one, and caption availability can change over
time. So instead of pinning specific video IDs that might go stale, use this guide
to pick three current videos yourself, one for each fallback layer, right before a
demo — takes under a minute.

## How to check a video's caption status before using it as a demo

```bash
yt-dlp --list-subs "https://www.youtube.com/watch?v=VIDEO_ID"
```
- Output lists something under **"Available subtitles"** (not just "automatic
  captions") → good pick for **Layer 1** (manual/official captions).
- Output lists entries only under **"Available automatic captions"** → good pick
  for testing that Layer 1 still succeeds (auto-captions are still captions
  `youtube-transcript-api` can read), or to specifically demo the **Layer 2**
  fallback by simulating Layer 1 being unavailable (see note below).
- Output lists **neither** → this is your **Layer 3** (Whisper) test video.

## Picking each layer's demo video

**Layer 1 (manual captions) — easiest to guarantee:**
Any current talk on TED's official YouTube channel. TED reviews and publishes
human-quality captions for its own conference talks (not TEDx, which varies) —
confirmed reliable as of this writing. Pick any one under ~15 minutes so the demo
doesn't take long to index.

**Layer 2 (yt-dlp fallback) — harder to demo directly:**
This layer only triggers when `youtube-transcript-api` itself is blocked (e.g. by
an IP rate-limit), not based on the video. You generally can't force this from the
video choice alone. To actually see this path run, either:
  - Deploy the app somewhere with a datacenter IP (e.g. Streamlit Cloud) where
    blocks are more common, or
  - Temporarily rename/break the `youtube-transcript-api` import in
    `transcript_fetcher.py` to force a fall-through, run the demo, then revert.

**Layer 3 (Whisper) — most reliable to demo with your own clip:**
Rather than hunting for a real public video with zero captions (increasingly
rare), record or export a short 30-60 second clip yourself (phone recording, a
voice memo turned into a video, or any personal clip), upload it as an unlisted
YouTube video, and confirm with `yt-dlp --list-subs` that it has no subtitle
tracks. This guarantees the fallback actually triggers, rather than hoping a
found video stays uncaptioned.

## Suggested test script (in this order)

**1. Add one Layer 1 video (any TED talk)**

- Ask: *"Summarize this video"*
  Shows off whole-transcript mode — should give a coherent overview instead of a
  disjointed answer stitched from random chunks.

- Ask about a specific year or number mentioned in the talk (check the transcript
  first for one that appears more than once, e.g. if the speaker mentions both
  "in 2015" and "in 2020")
  Shows off hybrid retrieval — pure vector search struggles to tell two similar
  years apart, since both produce nearly identical embeddings.

- Ask a natural-language question that doesn't use the speaker's exact wording
  (e.g. if they said "the numbers didn't add up," ask "did the results match
  expectations?")
  Tests semantic search rather than exact keyword matching.

**2. Add a second video on a different topic (now both are loaded)**

- Ask a question that could plausibly relate to either video's general subject
  A good answer should cite the correct source video, showing the tool doesn't
  blend content across unrelated videos even when topics are adjacent.

- Ask something highly specific to only one of the two videos
  Should retrieve only from the relevant video and cite it correctly.

- Try removing one video from the loaded-videos panel and asking a question only
  the remaining video can answer, to confirm videos can be managed without
  restarting the app.

**3. Add the Layer 3 (Whisper) test clip**

- Confirm in the UI that the "source" shown after indexing says Whisper
  transcription was used, not YouTube captions.
- Ask a simple factual question about the clip's content to confirm the
  transcription came through usable, and that the timestamp citation still jumps
  the player correctly.

## Note on quota

The Whisper fallback path uses more of your Groq free-tier quota than the
captions-based paths (audio transcription is a heavier operation than a short
chat completion) — worth keeping the Layer 3 test clip short (well under a
minute) to conserve quota during repeated demos.
