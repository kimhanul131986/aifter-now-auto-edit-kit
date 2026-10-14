# 예시: 아이프터나우 릴스 "편집 프로그램 한 번도 안 열고 만들었어요"

이 키트로 실제로 만든 릴스의 설정 파일입니다(영상 파일은 없음).

- `script.txt` — 촬영 대본(v1.2). 원본·완성 길이는 말하지 않고 화면에 실측값이 자동으로 나옵니다.
- `data/video.json` — 문장 → 단락, 얼굴 장면, 반전, 단락별 화면 물건·색
- `content.mjs` — 단락 화면 8개와 움직임
- `styles/beats.css` — 이 영상 화면 스타일

## 따라 하기
1. 이 폴더를 `videos/my-reel`로 복사하고 내 영상을 `source-raw.mp4`로 넣기
2. `package.json`이 없으면 `node reel/engine/new-reel.mjs my-reel 내영상.mp4`로 만든 뒤 위 파일들을 덮어쓰기
3. 화면 b2의 증거 카드 이미지는 직접 캡처:
   `npx playwright screenshot --browser chromium --viewport-size "430,932" https://github.com/SYSTRAN/faster-whisper assets/proof/faster-whisper-github.png`
4. `npm run cut` → `npm run plan` → `npm run build` → `npm run render` → `npm run review`
