# AIFTER reel engine

Talking-head reel → finished HyperFrames composition. One engine for every reel; each video only writes `content.mjs`.
Reference project: `examples/reels-002` (copy it under `videos/`).

## Steps (run from the project folder, `npm run <step>`)

| Step | Automatic? | Does |
| --- | --- | --- |
| `node reel/engine/new-reel.mjs <name> [raw.mp4]` | yes | scaffold `videos/<name>` (run from the kit folder) |
| write `script.txt` | person | the script exactly as read |
| `cut` | yes | ASR word times → last complete take per sentence → pause removal → re-transcribe → verify (`data/cut-log.json`) |
| write `data/video.json` | Claude | sentence→beat map, face-return sentences, twist, one object + palette per beat, face crop |
| `plan` | yes | shots from caption timing + `rules.default.json`: pose mix, face returns, no-repeat entrances, object rules |
| write `content.mjs` | Claude | anchors, beat screens, HUD items, chapters, seam card, cover, screen SFX + animations |
| `build` | yes | `index.html`: layout loop, transitions, captions, HUD, chapters, cover, SFX placement, asset copy |
| `check`, `render` | yes | HyperFrames lint/runtime/layout, draft render |
| `review` | yes + look | layout check at every shot + frame sheets `review/shots.jpg`, `review/chapters.jpg` — look at every tile before sharing |

## What the engine guarantees
- Rhythm and mix from the reference dissection (`rules.default.json`): ~1.6 s shots, face-only ≈12 %, split ≈43 %, full graphic ≈45 %.
- No identical entrance twice in a row, no entrance over 30 % (`motion` pools: wipe/pixel/zoom/panel/skeleton/expand/slide/cut/rack/punch).
- SFX (optional): build `reel/engine/assets/sfx-lib` from Kenney CC0 packs with `setup/make-sfx-lib.py`; without it the build is silent. Variants rotate, never the same file twice in a row.
- Style: clean (neutral bases, one accent `#F4C542`, red only for errors); chapter markers instead of outlined big words;
  hand-drawn rings as one smooth stroke.

## What stays per video (say so in the reel)
- Screen content and object choice are written by Claude for each video. Mark illustrative screens `예시`; use real numbers only.

## Licenses
Engine code: MIT (see LICENSE). SFX: not shipped (Kenney CC0 if you build the library). Lottie `check.json`: LottieFiles "success tick" (Lottie Simple License).
Fonts copied at build: Pretendard (OFL), Nanum Pen Script (OFL). GSAP and lottie-web load from CDN.
