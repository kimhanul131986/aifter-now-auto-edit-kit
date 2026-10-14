# 03. 화면 쓰기 → content.mjs

`npm run plan` 다음에 붙여 넣으세요. 예시는 `examples/reels-002/content.mjs` 입니다.

```
content.mjs 를 써 줘. reel/engine/README.md 의 구조와 examples/reels-002/content.mjs 를 먼저 읽어.

규칙
- 단락마다 data/video.json 의 objects 에 정한 물건으로 화면 하나(h.scr('b1', h.bg(0), ...)). 머리글은 h.hdr(k, '작은 표시').
- 화면 속 숫자는 실제로 잰 값만. 실제 화면이 없으면 footers 에 '예시 화면 · 기능 설명용'이라고 적어.
- 움직임은 말과 맞춰: anchors 에 문구 → 시각을 만들고(at('문구')), script 에서 그 시각에 상태가 바뀌게(체크, 숫자 바퀴 wheelOn, 펜 메모 pen, 타이핑 typeTxt).
- 화면 하나에 새 요소는 하나씩만. 화면 안에서 0.5~1초마다 무언가 바뀌게.
- 얼굴 장면 위 큰 글자는 쓰지 말고 chapters 로(번호는 머리글과 같게). 외곽선 두른 글씨 금지.
- hud: 영상 전체에서 하나씩 쌓이는 항목 4~6개. cover: 마지막 썸네일 문구 두 줄.
- sfx: add(시각, 종류, 크기) — 종류는 reel/engine/assets/sfx-lib/manifest.json 에 있는 것만(라이브러리를 만들지 않았으면 비워 둬도 됨).
- styles/beats.css 에는 이 영상 화면에만 쓰는 스타일만. 색은 무채색 + 강조색 #F4C542 하나, 오류 표시만 빨강.

쓴 다음 npm run build → npm run check 를 돌리고, 오류가 0이 될 때까지 고쳐 줘.
```
