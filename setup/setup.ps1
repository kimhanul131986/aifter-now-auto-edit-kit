# 아이프터나우 자동편집 키트 — Windows 준비 스크립트
# 키트 폴더에서 실행:  powershell -ExecutionPolicy Bypass -File setup\setup.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Need($name, $hint) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) { Write-Host "[없음] $name — $hint" -ForegroundColor Red; $script:missing = $true }
  else { Write-Host "[확인] $name" -ForegroundColor Green }
}
$missing = $false
Need 'node'   'https://nodejs.org 에서 20 이상 설치'
Need 'ffmpeg' 'winget install Gyan.FFmpeg  (설치 후 터미널 재시작)'
Need 'py'     'https://www.python.org 에서 Python 3.10~3.12 설치 (py 런처 포함)'
if ($missing) { Write-Host '위 항목을 설치한 뒤 다시 실행하세요.'; exit 1 }

$nodeMajor = [int]((node -v).TrimStart('v').Split('.')[0])
if ($nodeMajor -lt 20) { Write-Host "Node $nodeMajor → 20 이상이 필요합니다." -ForegroundColor Red; exit 1 }

if (-not (Test-Path '.venv-asr')) {
  $pyv = '-3.12'; try { py -3.12 -c "print(1)" | Out-Null } catch { $pyv = '-3' }
  py $pyv -m venv .venv-asr
}
.\.venv-asr\Scripts\python -m pip install --upgrade pip | Out-Null
.\.venv-asr\Scripts\python -m pip install faster-whisper numpy
Write-Host ''
Write-Host '준비 완료. 다음: node reel\engine\new-reel.mjs 내-릴스-이름 원본.mp4' -ForegroundColor Green
Write-Host '처음 받아쓰기 때 음성 인식 모델(small, 약 0.5GB)을 한 번 내려받습니다.'
