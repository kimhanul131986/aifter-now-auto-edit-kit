// AIFTER reel engine — scaffold a new reel project under videos/<name>.
// Creates ./videos/<name> under the current folder (the repo root or the kit root).
// Usage: node <engine>/new-reel.mjs <name> [raw.mp4]
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ENG = path.dirname(fileURLToPath(import.meta.url));
const name = process.argv[2];
if (!name || !/^[a-z0-9-]+$/.test(name)) throw new Error('usage: new-reel.mjs <kebab-name> [raw.mp4]');
const P = path.join(process.cwd(), 'videos', name);
if (fs.existsSync(P)) throw new Error('exists: ' + P);
const E = path.relative(P, ENG).split(path.sep).join('/');
const HF = 'hyperframes@0.8.149';
const w = (rel, s) => { fs.mkdirSync(path.dirname(path.join(P, rel)), { recursive: true }); fs.writeFileSync(path.join(P, rel), s); };

w('package.json', JSON.stringify({ name, private: true, type: 'module', scripts: {
  cut: `node ${E}/cut.mjs .`, plan: `node ${E}/plan.mjs .`, build: `node ${E}/build.mjs .`, dev: `npx --yes ${HF} preview`,
  check: `npx --yes ${HF} check`, render: `npx --yes ${HF} render --quality draft --workers 2 -o output/draft.mp4`, review: `node ${E}/review.mjs .` } }, null, 2) + '\n');
w('hyperframes.json', JSON.stringify({ $schema: 'https://hyperframes.heygen.com/schema/hyperframes.json', registry: 'https://raw.githubusercontent.com/heygen-com/hyperframes/main/registry',
  paths: { blocks: 'compositions', components: 'compositions/components', assets: 'assets' }, media: { autoProxy: true }, authoringSkill: 'general-video', registryItems: [] }, null, 2) + '\n');
w('meta.json', JSON.stringify({ id: name, name }) + '\n');
w('script.txt', '대본을 사용자가 읽은 그대로 붙여 넣는다. 한 줄에 여러 문장이어도 된다.\n');
w('data/video.json', JSON.stringify({
  _note: 'Per-video input. beats: sentence index -> beat (screen) index. faceAt: sentences where the story turns (face-only shot). twist: punch-in sentence. objects/palette: one per beat, no object twice in a row, palette alternates dark/light. faceS: object-position of the face window in split shots.',
  beats: [0], faceAt: [], twist: -1, objects: ['card'], palette: ['dark'], faceS: '50% 20%' }, null, 1) + '\n');
w('styles/beats.css', '/* per-video screen styles; engine base.css already has the clean style tokens */\n');
w('content.mjs', `// Per-video content for the AIFTER reel engine. Write the screens for each beat; the engine does the rest.
export default {
  // anchors: phrase -> time (start of the caption chunk containing it)
  anchors: ({ at }) => ({ start: 0 }),
  keywords: [],                       // caption words to highlight (exact tokens incl. punctuation)
  titles: ['첫 단락'],                 // screen header title per beat
  footers: { b1: '' },                // small source note per screen: 실제 값 / 예시 화면 · 기능 설명용 / 화자의 주관
  screens: (h, X, ctx) => \`
\${h.scr('b1', h.bg(0), \`\${h.hdr(0, '')}
  <div class="card dark pad"><i class="skel"></i><div class="klab">라벨</div></div>\`)}
\`,
  hud: X => ({ label: '체크', items: [] }),   // [[word, time], ...] — fills as each item is said
  chapters: [],                       // [[sentence index, '03', '단어'], ...] on face-only shots
  seam: null,                         // { beat: 'b2', icon: '✓', text: '...', value: '...' }
  cover: { tag: '아이프터나우', lines: ['첫 줄,', '강조 줄'], sub: '', hold: 1.4 },
  css: 'styles/beats.css',
  sfx: (add, X, ctx) => {},           // add(time, family, gain) — families in engine/assets/sfx-lib/manifest.json
  script: X => \`\`,                  // in-page GSAP for this video's screens (tl, fi, IN, POP, wheelOn, hwDraw, pen, typeTxt, lot, lotPlay, B, X)
};
`);
if (process.argv[3]) fs.copyFileSync(path.resolve(process.argv[3]), path.join(P, 'source-raw.mp4'));
console.log(`created videos/${name}. Next: script.txt → npm run cut → video.json beats → npm run plan → content.mjs → npm run build → npm run check → npm run render → npm run review`);
