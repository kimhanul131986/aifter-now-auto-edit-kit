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


def load_audio(path):
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", "16000", "-f", "s16le", "-"],
        check=True, capture_output=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768.0


def main():
    src, out = sys.argv[1], sys.argv[2]
    model_name = sys.argv[3] if len(sys.argv) > 3 else "small"
    model = WhisperModel(model_name, device="cpu", compute_type="int8")
    segments, _ = model.transcribe(load_audio(src), language="ko", word_timestamps=True,
                                   vad_filter=False, condition_on_previous_text=False)
    words = []
    for seg in segments:
        for w in seg.words or []:
            text = w.word.strip()
            if text:
                words.append({"text": text, "start": round(w.start, 3), "end": round(w.end, 3)})
    with open(out, "w", encoding="utf-8") as f:
        json.dump(words, f, ensure_ascii=False, indent=1)
    print(f"words {len(words)} -> {out}")


if __name__ == "__main__":
    main()
