"""Word-timestamp transcription for talking-head takes.

Usage:
  .venv-asr/Scripts/python reel/transcribe.py <video> <out.json> [model]

Writes [{"text", "start", "end"}, ...] in seconds. Audio is decoded with ffmpeg to 16 kHz mono and passed as a
numpy array (PyAV path breaks on newer Pythons). Timing only: captions still use the user's script.
Setup once: run setup/setup.ps1 (Windows) or setup/setup.sh (macOS/Linux)
"""
import json
import subprocess
import sys

import numpy as np
from faster_whisper import WhisperModel
from faster_whisper.vad import VadOptions, get_speech_timestamps


def load_audio(path):
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", "16000", "-f", "s16le", "-"],
        check=True, capture_output=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768.0


def speech_chunks(audio, sr=16000, max_len=8.0):
    """Split at pauses so each retake is transcribed on its own. Whisper over long windows drops or merges
    repeated takes (seen on a 2.5 min retake-heavy phone recording: a 30 s window vanished, and larger
    models collapsed identical retakes into one)."""
    spans = get_speech_timestamps(audio, VadOptions(min_silence_duration_ms=350, speech_pad_ms=150))
    chunks, cur = [], None
    for sp in spans:
        a, b = sp["start"] / sr, sp["end"] / sr
        if cur and b - cur[0] <= max_len and a - cur[1] < 0.3:
            cur[1] = b
        else:
            if cur:
                chunks.append(cur)
            cur = [a, b]
    if cur:
        chunks.append(cur)
    return chunks


def main():
    src, out = sys.argv[1], sys.argv[2]
    model_name = sys.argv[3] if len(sys.argv) > 3 else "small"
    model = WhisperModel(model_name, device="cpu", compute_type="int8")
    audio, sr = load_audio(src), 16000
    words = []
    for a, b in speech_chunks(audio):
        segments, _ = model.transcribe(audio[int(a * sr):int(b * sr)], language="ko", word_timestamps=True,
                                       vad_filter=False, condition_on_previous_text=False)
        for seg in segments:
            for w in seg.words or []:
                text = w.word.strip()
                if text:
                    words.append({"text": text, "start": round(a + w.start, 3), "end": round(a + w.end, 3)})
    with open(out, "w", encoding="utf-8") as f:
        json.dump(words, f, ensure_ascii=False, indent=1)
    print(f"words {len(words)} -> {out}")


if __name__ == "__main__":
    main()
