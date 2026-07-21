"""
transcript_fetcher.py
----------------------
Pulls a transcript for a YouTube video with a 3-layer fallback chain:

  1. youtube-transcript-api  -> works when captions exist and YouTube
     isn't rate-limiting the caller's IP.
  2. yt-dlp subtitle download -> different code path to the same caption
     tracks; often succeeds when (1) is blocked.
  3. yt-dlp audio download + Groq Whisper (whisper-large-v3) -> last
     resort for videos with captions disabled entirely.

Every layer returns the same shape:
    List[dict] with keys: start (float, seconds), end (float, seconds), text (str)

So nothing downstream (chunker.py) needs to know which layer produced it.
"""

import os
import re
import tempfile
import subprocess
from dataclasses import dataclass
from typing import List, Optional

from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import (
    TranscriptsDisabled,
    NoTranscriptFound,
    VideoUnavailable,
)


@dataclass
class TranscriptSegment:
    start: float
    end: float
    text: str

    def to_dict(self):
        return {"start": self.start, "end": self.end, "text": self.text}


class TranscriptFetchError(Exception):
    """Raised when all fallback layers have been exhausted."""


VIDEO_ID_PATTERNS = [
    r"(?:youtube\.com\/watch\?v=)([A-Za-z0-9_-]{11})",
    r"(?:youtu\.be\/)([A-Za-z0-9_-]{11})",
    r"(?:youtube\.com\/embed\/)([A-Za-z0-9_-]{11})",
    r"(?:youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})",
    r"^([A-Za-z0-9_-]{11})$",  # bare video ID
]


def get_video_id(url_or_id: str) -> str:
    """Extract the 11-char YouTube video ID from any common URL shape."""
    url_or_id = url_or_id.strip()
    for pattern in VIDEO_ID_PATTERNS:
        m = re.search(pattern, url_or_id)
        if m:
            return m.group(1)
    raise ValueError(f"Could not parse a YouTube video ID from: {url_or_id}")


# ---------------------------------------------------------------------------
# Layer 1: youtube-transcript-api
# ---------------------------------------------------------------------------

def _fetch_via_transcript_api(video_id: str, languages: List[str]) -> List[TranscriptSegment]:
    ytt_api = YouTubeTranscriptApi()
    transcript_list = ytt_api.list(video_id)

    transcript = None
    try:
        transcript = transcript_list.find_transcript(languages)
    except NoTranscriptFound:
        # fall back to auto-generated in any language, then translate to English
        try:
            transcript = transcript_list.find_generated_transcript(languages)
        except NoTranscriptFound:
            # last resort: take whatever transcript exists and translate it
            available = list(transcript_list)
            if not available:
                raise
            transcript = available[0]
            if transcript.is_translatable:
                transcript = transcript.translate("en")

    fetched = transcript.fetch()
    return [
        TranscriptSegment(start=s.start, end=s.start + s.duration, text=s.text)
        for s in fetched
    ]


# ---------------------------------------------------------------------------
# Layer 2: yt-dlp subtitle download (VTT) -> parse
# ---------------------------------------------------------------------------

def _vtt_timestamp_to_seconds(ts: str) -> float:
    # ts format: HH:MM:SS.mmm
    h, m, s = ts.split(":")
    return int(h) * 3600 + int(m) * 60 + float(s)


def _fetch_via_ytdlp_subs(video_id: str, languages: List[str]) -> List[TranscriptSegment]:
    import yt_dlp
    import webvtt

    url = f"https://www.youtube.com/watch?v={video_id}"
    with tempfile.TemporaryDirectory() as tmp:
        outtmpl = os.path.join(tmp, "%(id)s.%(ext)s")
        ydl_opts = {
            "skip_download": True,
            "writesubtitles": True,
            "writeautomaticsub": True,
            "subtitleslangs": languages + ["en"],
            "subtitlesformat": "vtt",
            "outtmpl": outtmpl,
            "quiet": True,
            "no_warnings": True,
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        vtt_files = [f for f in os.listdir(tmp) if f.endswith(".vtt")]
        if not vtt_files:
            raise TranscriptFetchError("yt-dlp found no subtitle files")

        # prefer a requested language file if present, else take the first
        chosen = vtt_files[0]
        for lang in languages:
            for f in vtt_files:
                if f".{lang}." in f:
                    chosen = f
                    break

        segments = []
        for caption in webvtt.read(os.path.join(tmp, chosen)):
            segments.append(
                TranscriptSegment(
                    start=_vtt_timestamp_to_seconds(caption.start),
                    end=_vtt_timestamp_to_seconds(caption.end),
                    text=caption.text.replace("\n", " ").strip(),
                )
            )
        return segments


# ---------------------------------------------------------------------------
# Layer 3: yt-dlp audio download -> Groq Whisper transcription
# ---------------------------------------------------------------------------

def _fetch_via_whisper(video_id: str, groq_api_key: str) -> List[TranscriptSegment]:
    import yt_dlp
    from groq import Groq

    url = f"https://www.youtube.com/watch?v={video_id}"
    with tempfile.TemporaryDirectory() as tmp:
        outtmpl = os.path.join(tmp, "audio.%(ext)s")
        ydl_opts = {
            "format": "bestaudio/best",
            "outtmpl": outtmpl,
            "postprocessors": [{
                "key": "FFmpegExtractAudio",
                "preferredcodec": "mp3",
                "preferredquality": "64",
            }],
            "quiet": True,
            "no_warnings": True,
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        audio_path = os.path.join(tmp, "audio.mp3")
        if not os.path.exists(audio_path):
            raise TranscriptFetchError("Audio download failed; ffmpeg may be missing")

        client = Groq(api_key=groq_api_key)
        with open(audio_path, "rb") as f:
            transcription = client.audio.transcriptions.create(
                file=f,
                model="whisper-large-v3",
                response_format="verbose_json",
            )

        segments = []
        for seg in transcription.segments:
            segments.append(
                TranscriptSegment(start=seg["start"], end=seg["end"], text=seg["text"].strip())
            )
        return segments


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def get_video_title(video_id: str) -> str:
    """Lightweight metadata-only lookup (no download) for display purposes."""
    import yt_dlp

    url = f"https://www.youtube.com/watch?v={video_id}"
    ydl_opts = {"quiet": True, "no_warnings": True, "skip_download": True}
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            return info.get("title") or video_id
    except Exception:
        return video_id


def fetch_transcript(
    url_or_id: str,
    languages: Optional[List[str]] = None,
    groq_api_key: Optional[str] = None,
) -> dict:
    """
    Returns:
        {
            "video_id": str,
            "segments": List[dict],   # start, end, text
            "source": "captions" | "ytdlp_captions" | "whisper",
        }
    Raises TranscriptFetchError if every layer fails.
    """
    languages = languages or ["en", "hi"]
    video_id = get_video_id(url_or_id)
    errors = []

    try:
        segments = _fetch_via_transcript_api(video_id, languages)
        return {"video_id": video_id, "segments": [s.to_dict() for s in segments], "source": "captions"}
    except (TranscriptsDisabled, NoTranscriptFound, VideoUnavailable, Exception) as e:
        errors.append(f"transcript-api: {e}")

    try:
        segments = _fetch_via_ytdlp_subs(video_id, languages)
        return {"video_id": video_id, "segments": [s.to_dict() for s in segments], "source": "ytdlp_captions"}
    except Exception as e:
        errors.append(f"yt-dlp captions: {e}")

    if groq_api_key:
        try:
            segments = _fetch_via_whisper(video_id, groq_api_key)
            return {"video_id": video_id, "segments": [s.to_dict() for s in segments], "source": "whisper"}
        except Exception as e:
            errors.append(f"whisper: {e}")
    else:
        errors.append("whisper: skipped (no GROQ_API_KEY provided)")

    raise TranscriptFetchError(
        "Could not obtain a transcript for this video after all fallback layers.\n"
        + "\n".join(errors)
    )
