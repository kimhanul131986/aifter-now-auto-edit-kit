// Shared helpers for talking-head reels: script ↔ ASR alignment, take selection, caption chunking, audio roles.
// Cut times always come from ASR word timestamps and ffmpeg silence detection — never from a model's guess.
import { spawnSync } from 'child_process';

export const norm = s => s.normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

export const splitSentences = script =>
  script.replace(/\r/g, '').split(/(?<=[.?!])\s+|\n+/).map(s => s.trim()).filter(s => norm(s).length > 0);

function lev(a, b) {
  const m = a.length, n = b.length; let prev = Array.from({ length: n + 1 }, (_, j) => j), cur = new Array(n + 1);
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    [prev, cur] = [cur, prev];
  }
  return prev[n];
}
export const similarity = (a, b) => (a.length || b.length) ? 1 - lev(a, b) / Math.max(a.length, b.length) : 1;

// Every place a sentence was spoken: windows of whole words whose text resembles the sentence.
export function findTakes(sentence, words, minScore = 0.6) {
  const target = norm(sentence), wn = words.map(w => norm(w.text)), out = [];
  for (let i = 0; i < words.length; i++) {
    let txt = '';
    for (let j = i; j < words.length; j++) {
      txt += wn[j];
      if (txt.length < target.length * 0.7) continue;
      if (txt.length > target.length * 1.3) break;
      const score = similarity(target, txt);
      if (score >= minScore) out.push({ i, j, start: words[i].start, end: words[j].end, score });
    }
  }
  // keep the best window per overlapping cluster
  out.sort((a, b) => b.score - a.score);
  const kept = [];
  for (const c of out) if (!kept.some(k => c.i <= k.j && k.i <= c.j)) kept.push(c);
  return kept.sort((a, b) => a.start - b.start);
}

// Pick one take per sentence in script order. Prefer complete takes; among complete ones prefer the LAST
// (a retake usually follows a fumble). Returns [{sentence, take|null, alternatives}].
export function selectTakes(sentences, words, { complete = 0.8 } = {}) {
  const cands = sentences.map(s => findTakes(s, words));
  const N = sentences.length, best = new Map();
  const solve = (k, after) => {                       // max total score for sentences k.. starting after `after`
    if (k === N) return { score: 0, picks: [] };
    const key = k + ':' + after; if (best.has(key)) return best.get(key);
    let res = { ...solve(k + 1, after) }; res = { score: res.score, picks: [null, ...res.picks] };
    for (const c of cands[k]) {
      if (c.start < after) continue;
      const rest = solve(k + 1, c.end), bonus = (c.score >= complete ? 1 : 0) + c.start * 1e-4;
      const s = c.score + bonus + rest.score;
      if (s > res.score) res = { score: s, picks: [c, ...rest.picks] };
    }
    best.set(key, res); return res;
  };
  const { picks } = solve(0, -1);
  // A sentence ASR could not match (e.g. English names heard as Korean): take the words between its neighbours.
  picks.forEach((p, k) => {
    if (p) return;
    const after = picks.slice(0, k).reverse().find(Boolean)?.end ?? -1, before = picks.slice(k + 1).find(Boolean)?.start ?? Infinity;
    const idx = words.map((w, n) => n).filter(n => words[n].start >= after - 1e-6 && words[n].end <= before + 1e-6);
    if (idx.length) picks[k] = { i: idx[0], j: idx.at(-1), start: words[idx[0]].start, end: words[idx.at(-1)].end,
      score: similarity(norm(sentences[k]), idx.map(n => norm(words[n].text)).join('')), gapFill: true };
  });
  return sentences.map((s, k) => ({ sentence: s, take: picks[k], alternatives: cands[k].length }));
}

export const ffmpegLog = args => spawnSync('ffmpeg', ['-hide_banner', '-nostats', ...args], { encoding: 'utf8', maxBuffer: 64 << 20 }).stderr || '';

// Pauses between words: threshold is relative to the take's mean loudness (rooms and mics differ).
export function silences(file, { below = 15, d = 0.04 } = {}) {
  const mean = meanLevel(file);
  const log = ffmpegLog(['-i', file, '-vn', '-af', `silencedetect=noise=${(mean - below).toFixed(1)}dB:d=${d}`, '-f', 'null', '-']);
  const out = []; let s = null;
  for (const l of log.split(/\r?\n/)) {
    const a = l.match(/silence_start: ([\d.]+)/); if (a) s = +a[1];
    const b = l.match(/silence_end: ([\d.]+)/); if (b && s !== null) { out.push([s, +b[1]]); s = null; }
  }
  return out;
}
// 10 ms RMS levels (dBFS) for [t0, t1).
export function rmsWindows(file, t0, t1) {
  const log = ffmpegLog(['-ss', t0.toFixed(3), '-t', (t1 - t0).toFixed(3), '-i', file, '-vn', '-af',
    'aresample=48000,asetnsamples=480,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level', '-f', 'null', '-']);
  return [...log.matchAll(/RMS_level=(-?[\d.]+|-inf)/g)].map((m, k) => ({ t: t0 + k * 0.01 + 0.005, db: m[1] === '-inf' ? -120 : +m[1] }));
}
export const meanLevel = file => +(ffmpegLog(['-i', file, '-vn', '-af', 'volumedetect', '-f', 'null', '-']).match(/mean_volume: (-?[\d.]+)/) || [, -20])[1];

// Move a cut to the quietest 10 ms inside [lo, hi], preferring `want` when levels tie within 3 dB.
export function snapCut(file, lo, hi, want) {
  if (hi - lo < 0.02) return { t: want, db: null };
  const w = rmsWindows(file, lo, hi); if (!w.length) return { t: want, db: null };
  const min = Math.min(...w.map(x => x.db));
  const ok = w.filter(x => x.db <= min + 3).sort((a, b) => Math.abs(a.t - want) - Math.abs(b.t - want))[0];
  return { t: ok.t, db: ok.db };
}
export const inSilence = (t, sil, tol = 0.03) => sil.some(([a, b]) => t >= a - tol && t <= b + tol);

// Caption chunks of 2–4 eojeol cut at meaning boundaries (hongik guide). Never start a chunk with a bound noun
// or auxiliary that leans on the word before it ("쓸 / 수 있는", "한 / 것 같은", "까먹지 / 않도록").
// Prefer breaks after connective endings (a comma after a clause counts; a comma inside a noun list does not).
// Chosen by DP over all valid break sets.
const CONNECTIVE = /(고|서|면|며|데|지만|는데|니까|으니|도록|려고|하고|이고|해서|해도|때|요)[,]?$|(든|건),$/;
const BOUND_NOUN = /^(수|것|건|게|걸|중|적|때|등|듯|뿐|번|줄|데|만큼)(은|는|도|만|이|가|을|를|에|에서|으로|로|요|이에요|입니다)?[.?!,]?$/;
const AUXILIARY = /^(보면|보니|봐|않|못하|있|없|싶|같|하는지|해야|돼|되|해줘|해줍|드려|주세요|만에)/;
const NO_START = { test: word => BOUND_NOUN.test(word) || AUXILIARY.test(word) };
export function chunkCaption(sentence, { min = 2, max = 4, target = 3 } = {}) {
  const w = sentence.trim().split(/\s+/), n = w.length;
  if (n <= max) return [w.join(' ')];
  // never split a number from its counter (백 / 명, 7만 / 개)
  const NUMBER = /^([0-9.,]+[만천백]?|한|두|세|네|다섯|열|백|천|만|몇)$/, COUNTER = /^(명|개|가지|번|배|원|살|분|초|시간|일|달|년|줄|장|편)/;
  const canBreakBefore = k => !NO_START.test(w[k]) && !(NUMBER.test(w[k - 1]) && COUNTER.test(w[k])); // break between k-1 and k
  // adverbs lean forward and objects stay with their verb, so breaking right after them costs extra
  // so do modifiers (같은 요금제, 최대 절반) and the items of a comma list (조사, 코딩, 테스트)
  const ADVERB = /^(최근|진짜|정말|무조건|바로|전부|다|딱|잘게|길게|알아서|한번에|먼저|이미|아주|너무|꼭|최대|최소|약|더|점점|계속)$/;
  const MODIFIER = /^(같은|맞는|좋은|많은|새로운|다른|모든|이런|그런|어떤|이|그|저|한|두|세|네|몇)$|(넘는|하는|있는|없는|쓰는|되는|싶은|만든)$/;
  const breakBonus = k => { const raw = w[k - 1], prev = raw.replace(/[.?!,]$/, '');
    const listItem = raw.endsWith(',') && !CONNECTIVE.test(raw);
    return (CONNECTIVE.test(raw) ? -1.5 : 0) + (ADVERB.test(prev) || MODIFIER.test(prev) ? 2 : 0)
      + (/[을를]$/.test(prev) ? 1 : 0) + (listItem ? 4 : 0) + (/[가이]$/.test(prev) && /(넘는|하는|있는|없는|되는)$/.test(w[k]) ? 2 : 0)
      + (/(까지|부터)$/.test(prev) ? 1 : 0) + (/[^만]지$/.test(prev) && /지[,]?$/.test(w[k]) ? 2 : 0); }; // 쉬운지 어려운지
  const cost = new Array(n + 1).fill(Infinity), from = new Array(n + 1).fill(-1); cost[0] = 0;
  for (const hardMax of [max, max + 1]) {                        // relax to 5 only if 2–4 is impossible
    for (let e = 1; e <= n; e++) {
      for (let s = Math.max(0, e - hardMax); s <= e - min; s++) {
        if (cost[s] === Infinity || (s > 0 && !canBreakBefore(s))) continue;
        const len = e - s, c = cost[s] + (len - target) ** 2 + (s > 0 ? breakBonus(s) : 0) + (len > max ? 4 : 0);
        if (c < cost[e]) { cost[e] = c; from[e] = s; }
      }
    }
    if (cost[n] < Infinity) break;
  }
  if (cost[n] === Infinity) return [w.join(' ')];
  const out = []; for (let e = n; e > 0; e = from[e]) out.unshift(w.slice(from[e], e).join(' '));
  return out;
}

// Time each chunk inside the sentence's take by character share of the matched ASR words.
export function timeChunks(chunks, take, words) {
  const ws = words.slice(take.i, take.j + 1), total = chunks.reduce((n, c) => n + norm(c).length, 0) || 1;
  const wl = ws.map(w => norm(w.text).length || 1), wt = wl.reduce((a, b) => a + b, 0);
  // nearest word boundary to the chunk's character share (ASR may split or merge words differently)
  const bounds = []; { let acc = 0; for (let k = 1; k < ws.length; k++) { acc += wl[k - 1]; bounds.push({ f: acc / wt, t: ws[k].start }); } }
  const at = frac => bounds.length ? bounds.reduce((b, x) => Math.abs(x.f - frac) < Math.abs(b.f - frac) ? x : b).t : ws[0].start;
  let acc = 0;
  return chunks.map((text, k) => { const start = k ? at(acc / total) : take.start; acc += norm(text).length; return { text, start }; })
    .map((c, k, arr) => ({ ...c, end: k < arr.length - 1 ? arr[k + 1].start : take.end }));
}

// Sound roles (hongik guide + our SFX kit). Volumes are linear gains relative to the voice at 1.0.
export const SFX_ROLES = {
  hook: { file: 'riser', volume: 0.35, lead: 1.15 },       // 1.2 s riser that ends on the hit (starts `lead` s before it)
  card: { file: 'pop', volume: 0.25, lead: 0 },             // a card or panel appears
  transition: { file: 'swoosh', volume: 0.22, lead: 0.12 }, // only meaning-changing transitions
  underline: { file: 'marker', volume: 0.25, lead: 0 },     // highlight / underline / focus bracket
  count: { file: 'tick', volume: 0.12, lead: 0 },           // count-up landing, not every digit
  click: { file: 'tap', volume: 0.3, lead: 0 },
  impact: { file: 'impact', volume: 0.4, lead: 0 },          // hook hit / big number lands (use sparingly)
  type: { file: 'type', volume: 0.2, lead: 0 },              // one pass under a typing input (not per character)
  glitch: { file: 'glitch', volume: 0.22, lead: 0 },         // keyword hit on kinetic type
  transitionSoft: { file: 'swoosh_soft', volume: 0.2, lead: 0.08 },
  transitionHeavy: { file: 'swoosh_heavy', volume: 0.26, lead: 0.2 },
};
// Music bed starts ~15 dB under the voice, then is tuned by ear; duck further while speech is active.
export const BGM = { startDb: -15, duckDb: -6, attack: 0.08, release: 0.35 };
export const dbToGain = db => Math.pow(10, db / 20);

// <audio> tags for SFX cues [{role, t}] on the edit timeline. Overlapping sounds get their own track (greedy lanes).
export function sfxAudioTags(cues, { dir = 'assets/sfx', ext = 'mp3', durations = {}, firstTrack = 3, idPrefix = 'sfx' } = {}) {
  const lanes = [];
  return cues.map((c, k) => {
    const r = SFX_ROLES[c.role]; if (!r) throw new Error(`unknown SFX role "${c.role}"`);
    const start = Math.max(0, c.t - r.lead), dur = durations[r.file] ?? 1;
    let lane = lanes.findIndex(end => end <= start); if (lane < 0) lane = lanes.push(0) - 1; lanes[lane] = start + dur;
    return `<audio id="${idPrefix}-${k}" src="${dir}/${r.file}.${ext}" data-start="${start.toFixed(2)}" data-duration="${dur.toFixed(2)}" data-volume="${(c.volume ?? r.volume).toFixed(2)}" data-track-index="${firstTrack + lane}" data-label="${c.role}"></audio>`;
  }).join('\n');
}

// Music bed: static baseline at BGM.startDb under the voice, then GSAP volume tweens that duck it further while
// speech is active (spans [[start, end], ...] on the edit timeline, e.g. caption chunks). Paste the tweens into the
// composition's paused timeline; the runtime applies timeline volume keyframes in preview and render alike.
export function bgmTag(src, duration, { id = 'bgm', track = 9 } = {}) {
  return `<audio id="${id}" src="${src}" data-start="0" data-duration="${duration.toFixed(2)}" data-volume="${dbToGain(BGM.startDb).toFixed(3)}" data-track-index="${track}" data-label="bgm"></audio>`;
}
export function bgmDuckTweens(spans, { id = 'bgm', gap = 0.4 } = {}) {
  const base = dbToGain(BGM.startDb), duck = dbToGain(BGM.startDb + BGM.duckDb), merged = [];
  for (const [a, b] of [...spans].sort((x, y) => x[0] - y[0])) { const l = merged.at(-1); if (l && a - l[1] < gap) l[1] = Math.max(l[1], b); else merged.push([a, b]); }
  return merged.map(([a, b]) =>
    `tl.to('#${id}', { volume: ${duck.toFixed(3)}, duration: ${BGM.attack}, ease: 'none' }, ${Math.max(0, a - BGM.attack).toFixed(2)});\n` +
    `tl.to('#${id}', { volume: ${base.toFixed(3)}, duration: ${BGM.release}, ease: 'none' }, ${b.toFixed(2)});`).join('\n');
}

// Instagram Reels overlay zones on a 1080×1920 frame (approximate; confirm on a phone screenshot before posting).
// Keep captions and key graphics inside SAFE; the bottom band holds account name, caption and audio label,
// the right column holds like/comment/share buttons.
export const IG_SAFE = { left: 60, right: 1080 - 150, top: 210, bottom: 1920 - 440 };
export const inSafe = ({ x, y, w, h }) => x >= IG_SAFE.left && x + w <= IG_SAFE.right && y >= IG_SAFE.top && y + h <= IG_SAFE.bottom;
