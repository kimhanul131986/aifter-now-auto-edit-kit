// AIFTER reel engine — rule-driven shot planner.
// Caption timing (cut timeline) + rules → <project>/data/shot-plan.json. Boundaries come from caption chunks, poses from the
// reference mix and the face-return rule, entrances from the no-repeat motion pools, screens from the sentence→beat map.
// Per-video input: <project>/data/video.json (beats, faceAt, twist, objects, palette, faceS). Rules: <project>/data/rules.json
// if present, else rules.default.json next to this file.
// Usage: node .agents/skills/aifter-video-production/scripts/reel/engine/plan.mjs <projectDir>
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { splitSentences, findTakes, chunkCaption, timeChunks } from '../reel-lib.mjs';

const P = path.resolve(process.argv[2] || '.');
const here = path.dirname(fileURLToPath(import.meta.url));
const f = rel => path.join(P, rel.replace(/^\.\.\//, ''));
const rulesPath = fs.existsSync(f('../data/rules.json')) ? f('../data/rules.json') : path.join(here, 'rules.default.json');
const R = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
const V = JSON.parse(fs.readFileSync(f('../data/video.json'), 'utf8'));
const words = JSON.parse(fs.readFileSync(f('../data/cut-words.json'), 'utf8'));
const edl = JSON.parse(fs.readFileSync(f('../data/edl.json'), 'utf8'));
const D = +edl.total.toFixed(2);
const sentences = splitSentences(fs.readFileSync(f('../script.txt'), 'utf8'));

// 1. caption chunks with their sentence index (same timing as the review captions)
let after = -1;
const chunks = [];
sentences.forEach((s, si) => {
  const take = findTakes(s, words, 0.6).filter(t => t.start > after).sort((a, b) => b.score - a.score)[0];
  if (!take) throw new Error(`no timing for sentence ${si + 1}`);
  after = take.start;
  timeChunks(chunkCaption(s), take, words).forEach(c => chunks.push({ ...c, si }));
});

// 2. shot boundaries: group chunks toward the target length, never across a sentence, split anything over max
const { target, min, max } = R.shot;
const groups = [];
for (let si = 0; si < sentences.length; si++) {
  const cs = chunks.filter(c => c.si === si), local = [];
  let cur = null;
  for (const c of cs) {
    if (!cur) cur = { a: c.start, b: c.end, si };
    else cur.b = c.end;
    if (cur.b - cur.a >= target * 0.8) { local.push(cur); cur = null; }
  }
  if (cur) { if (local.length && cur.b - cur.a < min) local.at(-1).b = cur.b; else local.push(cur); }
  groups.push(...local);
}
// close the gaps: each shot runs until the next one starts (lead 0.06 s like the earlier reels)
groups.forEach((g, i) => { g.a = i ? +(g.a - 0.06).toFixed(3) : 0; });
groups.forEach((g, i) => { g.b = i < groups.length - 1 ? groups[i + 1].a : D; });
// pauses are now inside the shots: split each into round(d / target) equal parts
const split = [];
for (const g of groups) {
  const n = Math.max(1, Math.round((g.b - g.a) / target)), d = (g.b - g.a) / n;
  for (let k = 0; k < n; k++) split.push({ a: g.a + d * k, b: k === n - 1 ? g.b : g.a + d * (k + 1), si: g.si, part: k });
}

// 3. poses
const first = s => s.trim().split(/\s+/)[0].replace(/[^\p{L}]/gu, '');
const FF = R.faceFull, shots = [];
for (const g of split) {
  const wantF = shots.at(-1)?.si !== g.si && (V.faceAt ? V.faceAt.includes(g.si) : FF.onSentenceStart.includes(first(sentences[g.si]))) && !(FF.neverFirst && !shots.length)
    && !(FF.neverTwiceInRow && shots.at(-1)?.pose === 'F');
  shots.push({ ...g, pose: wantF ? 'F' : null });
}
// face shots are capped; the time they give up goes to the next shot
shots.forEach((h, i) => { if (h.pose === 'F' && h.b - h.a > FF.maxShot && shots[i + 1]) { h.b = +(h.a + FF.maxShot).toFixed(3); shots[i + 1].a = h.b; } });
const used = { F: 0, S: 0, G: 0 };
shots.forEach((h, i) => {
  if (!h.pose) {
    if (i === 0) h.pose = 'S';                               // hook: action on top, face below
    else {
      const total = h.b, deficit = p => R.mix[p] * total - used[p];
      const prev = shots[i - 1].pose;
      h.pose = ['S', 'G'].sort((p, q) => (deficit(q) - deficit(p)) || (p === prev ? 1 : -1))[0];
      if (h.pose === prev && Math.abs(deficit('S') - deficit('G')) < 0.6) h.pose = prev === 'S' ? 'G' : 'S';
    }
  }
  used[h.pose] += h.b - h.a;
  h.beat = V.beats ? V.beats[h.si] : h.si; h.screen = h.pose === 'F' ? null : (V.beats ? `b${h.beat + 1}` : `s${h.si + 1}`);
  h.punch = h.pose === 'F' && (V.beats ? h.si === V.twist : h.si + 1 === V.twist);
  h.a = +h.a.toFixed(3); h.b = +h.b.toFixed(3);
});

// 4. entrance / transition per shot: pick from the pool that fits the change, never the same as the previous shot,
//    least-used first so no single motion dominates
const M = R.motion, count = {};
shots.forEach((h, i) => {
  const p = shots[i - 1];
  let pool;
  if (h.punch) pool = ['punch'];
  else if (h.pose === 'F') pool = M.faceEnter;
  else if (!p || p.pose === 'F') pool = M.newScreenFromFace;
  else if (p.screen === h.screen) pool = M.sameScreen;
  else pool = M.newScreenFromGraphic;
  const ok = pool.filter(t => !(M.noRepeatInRow && p && t === p.enter));
  const pick = (ok.length ? ok : pool).slice().sort((a, b) => (count[a] || 0) - (count[b] || 0))[0];
  h.enter = pick; count[pick] = (count[pick] || 0) + 1;
});

// 5. screen objects (one per sentence, from video.json) checked against the object rules
const O = R.objects, objs = V.objects || [], useCount = {};
objs.forEach(o => useCount[o] = (useCount[o] || 0) + 1);
const objIssues = [];
objs.forEach((o, k) => { if (O.noRepeatInRow && k && o === objs[k - 1]) objIssues.push(`object ${o} repeats at sentence ${k + 1}`); });
Object.entries(useCount).forEach(([o, n]) => { if (n > O.maxUses) objIssues.push(`object ${o} used ${n}x (max ${O.maxUses})`); });
(V.palette || []).forEach((p, k, a) => { if (O.paletteAlternate && k && p === a[k - 1]) objIssues.push(`palette ${p} twice in a row at sentence ${k + 1}`); });
shots.forEach(h => { h.object = h.screen ? objs[V.beats ? h.beat : h.si] : null; });

const gaps = shots.map(h => h.b - h.a), sorted = [...gaps].sort((a, b) => a - b);
const repeats = shots.filter((h, i) => i && h.enter === shots[i - 1].enter).length;
const share = Object.fromEntries(Object.entries(count).map(([k, v]) => [k, +(v / shots.length).toFixed(2)]));
const stats = {
  duration: D, shots: shots.length,
  meanShot: +(D / shots.length).toFixed(2), medianShot: +sorted[Math.floor(sorted.length / 2)].toFixed(2),
  minShot: +sorted[0].toFixed(2), maxShot: +sorted.at(-1).toFixed(2),
  mix: Object.fromEntries(Object.entries(used).map(([k, v]) => [k, +(v / D).toFixed(3)])),
  motion: { count, share, repeatsInRow: repeats, maxShare: Math.max(...Object.values(share)), limit: M.maxShare },
  objects: { kinds: Object.keys(useCount).length, useCount, issues: objIssues },
  target: { shot: target, mix: R.mix },
};
fs.writeFileSync(f('../data/shot-plan.json'), JSON.stringify({ stats, shots, chunks }, null, 1));
console.log(JSON.stringify(stats));
shots.forEach(h => console.log(`${h.a.toFixed(2).padStart(6)}-${h.b.toFixed(2).padStart(6)} ${h.pose}${h.punch ? '*' : ' '} ${(h.screen ?? '--').padEnd(3)} ${h.enter}`));
