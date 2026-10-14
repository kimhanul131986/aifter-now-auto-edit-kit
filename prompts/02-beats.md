# 02. 단락 나누기 → data/video.json

`npm run cut` 이 끝난 뒤, 릴스 폴더에서 Claude Code에 붙여 넣으세요.

```
script.txt 를 reel/reel-lib.mjs 의 splitSentences 로 문장 번호와 함께 보여 줘. 그다음 data/video.json 을 써 줘.

- beats: 문장 번호 → 단락 번호. 단락은 6~8개, 한 단락은 한 가지 이야기.
- faceAt: 이야기가 꺾이는 문장(먼저, 다음은, 근데, 그래서, 그래도 … 로 시작하거나 단락 첫 문장). 첫 문장은 넣지 마. 전체의 12% 안팎이 되게.
- twist: 반전 문장 하나(펀치인). 없으면 -1.
- objects: 단락마다 화면에 보여 줄 물건 하나. 같은 물건을 연속으로 쓰지 말고, 한 물건은 최대 2번.
  예: 휴대폰, 프레임 격자, 터미널 출력, 게이지, 말풍선, 파형, 카운터, 체크리스트, 입력→결과 흐름, 전후 비교, 슬라이더, 댓글창
- palette: dark / light 를 번갈아.
- faceS: assets/presenter.mp4 에서 한 프레임을 뽑아 격자를 그려 보고, 분할 화면 얼굴 창(760×820)에 눈·입이 들어오게 object-position 세로 %를 정해.

쓴 다음 npm run plan 을 돌려 objects.issues 와 motion.maxShare(0.3 이하)를 확인해 줘.
```
