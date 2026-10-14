# 아이프터나우 자동편집 키트

찍은 영상과 대본을 넣으면 컷 편집·자막·장면 배치·전환·HUD·챕터·커버까지 붙은 세로 릴스(1080×1920)를 만들어 주는 도구 모음입니다.
아이프터나우 릴스 `편집 프로그램 안 열고 만든 영상`에서 실제로 쓴 그대로입니다.

## 먼저 알아 둘 것: 자동인 것과 아닌 것

| 단계 | 자동? | 설명 |
| --- | --- | --- |
| 컷 편집 | 자동 | 문장마다 **마지막으로 끝까지 말한 테이크**만 남기고 말 사이 쉼을 자릅니다. 얼굴·발성 분석이 아니라 이 규칙입니다. |
| 검사 | 자동 | 편집본을 다시 받아 적어 대본과 비교합니다. 누락·중복·말 잘림을 잡습니다. |
| 자막 | 자동 | 대본 원문을 받아쓰기 시각에 맞춰 2~4어절씩 붙입니다. |
| 장면 배치·전환 | 자동 | 잘 된 릴스를 해부한 규칙(평균 1.6초 전환, 얼굴만 나오는 장면 약 12% 등)으로 배치합니다. 같은 전환은 연속으로 쓰지 않습니다. |
| 단락 나누기·화면 내용 | **Claude Code에게 시킴** | 영상마다 다릅니다. `prompts/` 프롬프트를 쓰면 됩니다. |
| 렌더 | 자동 | HyperFrames로 MP4를 만듭니다. |
| 최종 검수 | 자동 + 눈으로 확인 | 레이아웃 검사와 장면별 프레임 시트를 만들어 줍니다. 마지막 확인은 직접 보세요. |

비용: 키트의 도구는 무료(오픈소스)입니다. 화면을 쓰게 시키는 **Claude Code는 유료 구독**이 필요합니다.

## 준비 (한 번)

필요한 것: Node 20 이상, FFmpeg, Python 3.10~3.12, Claude Code.

```
Windows:  powershell -ExecutionPolicy Bypass -File setup\setup.ps1
macOS:    bash setup/setup.sh
```

## 촬영 팁
- 세로 9:16, 1080p 이상, 고정 카메라, 조용한 방.
- 문장마다 2~3번 말하고, 틀리면 1초 쉬고 **그 문장 처음부터** 다시 말하세요. 마지막 테이크가 남습니다.
- 대본을 `script.txt`에 읽은 그대로 저장하세요.

## 만들기 (키트 폴더에서)

```
node reel/engine/new-reel.mjs my-reel 원본.mp4     # videos/my-reel 생성
# videos/my-reel/script.txt 에 대본 붙여 넣기
cd videos/my-reel
npm run cut       # 컷 + 검사 (data/cut-report.txt 확인)
# Claude Code: prompts/02-beats.md 로 data/video.json 작성
npm run plan      # 장면 배치
# Claude Code: prompts/03-screens.md 로 content.mjs 작성
npm run build
npm run check
npm run render    # output/draft.mp4
npm run review    # review/shots.jpg, review/chapters.jpg — 모든 칸을 눈으로 확인
```

예시 프로젝트: `examples/reels-002/` — 아이프터나우 릴스를 실제로 만든 설정 파일(영상 제외). 사용법은 그 폴더의 README.

## 효과음 (선택)
키트에는 효과음 파일이 없습니다. 효과음 없이도 빌드됩니다. 넣고 싶으면 Kenney의 무료(CC0) 팩 4개를 받아 라이브러리를 만드세요.
1. kenney.nl/assets 에서 `Interface Sounds`, `UI Audio`, `Digital Audio`, `Impact Sounds` 다운로드. 각 zip을 같은 이름 폴더(`kenney_interface-sounds` 등)로 한 폴더 안에 압축 해제
2. `.venv-asr\Scripts\python setup\make-sfx-lib.py <압축 푼 폴더> reel\engine\assets\sfx-lib`

## 레퍼런스 규칙 바꾸기
다른 계정 스타일을 따르고 싶으면 `prompts/01-dissect.md`로 그 릴스를 해부하고, 결과를 `videos/<이름>/data/rules.json`에 넣으세요. 없으면 `reel/engine/rules.default.json`을 씁니다.

## 라이선스
- 키트 코드: MIT (`LICENSE`)
- 폰트: Pretendard (SIL OFL 1.1), Nanum Pen Script (SIL OFL 1.1) — `assets/fonts/` 라이선스 파일 참고
- 체크 애니메이션: LottieFiles "success tick" (Lottie Simple License)
- 렌더 시 CDN에서 GSAP, lottie-web을 불러옵니다. HyperFrames는 `npx`로 실행됩니다.
