#!/usr/bin/env bash
# 아이프터나우 자동편집 키트 — macOS / Linux 준비 스크립트.  키트 폴더에서:  bash setup/setup.sh
set -e
cd "$(dirname "$0")/.."
missing=0
need() { if command -v "$1" >/dev/null 2>&1; then echo "[확인] $1"; else echo "[없음] $1 — $2"; missing=1; fi; }
need node   "https://nodejs.org 에서 20 이상 설치 (macOS: brew install node)"
need ffmpeg "macOS: brew install ffmpeg / Ubuntu: sudo apt install ffmpeg"
need python3 "Python 3.10~3.12"
[ "$missing" = 1 ] && { echo "위 항목을 설치한 뒤 다시 실행하세요."; exit 1; }
major=$(node -v | sed 's/v//' | cut -d. -f1); [ "$major" -lt 20 ] && { echo "Node $major → 20 이상이 필요합니다."; exit 1; }
[ -d .venv-asr ] || python3 -m venv .venv-asr
.venv-asr/bin/python -m pip install --upgrade pip >/dev/null
.venv-asr/bin/python -m pip install faster-whisper numpy
echo
echo "준비 완료. 다음: node reel/engine/new-reel.mjs 내-릴스-이름 원본.mp4"
echo "처음 받아쓰기 때 음성 인식 모델(small, 약 0.5GB)을 한 번 내려받습니다."
