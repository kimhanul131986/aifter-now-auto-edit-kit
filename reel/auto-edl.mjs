// Cut list from a raw take: script ↔ ASR alignment picks one take per sentence (last complete retake wins),
// cut points sit on word boundaries and are checked against ffmpeg silence detection.
// Usage: node auto-edl.mjs --source raw.mp4 --words raw-words.json --script script.txt --out data/ [--render assets/presenter.mp4]
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { splitSentences, selectTakes, snapCut, meanLevel } from './reel-lib.mjs';

const arg = k => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : undefined; };
const src = arg('source'), outDir = arg('out') || '.', render = arg('render');
const words = JSON.parse(fs.readFileSync(arg('words'), 'utf8'));
const script = fs.readFileSync(arg('script'), 'utf8');
const HEAD = +(arg('head') ?? 0.08), TAIL = +(arg('tail') ?? 0.14), FIRST_HEAD = 0.3, LAST_TAIL = 0.45;

const dur = +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', src], { encoding: 'utf8' }).trim();
const sentences = splitSentences(script);
const picks = selectTakes(sentences, words);
const mean = meanLevel(src);
const report = [];

// sentence spans → padded segments that never reach into a neighbouring word
const spans = picks.filter(p => p.take).map(p => [p.take.start, p.take.end, p]);
const merged = [];
for (const [a, b, p] of spans) { const l = merged.at(-1); if (l && a - l[1] < HEAD + TAIL + 0.06) { l[1] = b; l[2].push(p); } else merged.push([a, b, [p]]); }
const segs = []; let edit = 0;
merged.forEach(([a, b], k) => {
  const prevEnd = Math.max(0, ...words.filter(w => w.end <= a + 1e-6).map(w => w.end));
  const nextStart = Math.min(dur, ...words.filter(w => w.start >= b - 1e-6).map(w => w.start));
  // snap each cut to the quietest 10 ms near the wanted pad (keeps ≥20 ms from the word, still removes the pause)
  const head = k ? HEAD : FIRST_HEAD, tail = k === merged.length - 1 ? LAST_TAIL : TAIL;
  const iLo = Math.max(prevEnd, a - head - 0.08, 0), iHi = Math.max(iLo, a - 0.02);
  const oLo = Math.min(b + 0.04, dur), oHi = Math.min(nextStart, b + tail + 0.08, dur);
  let ci = snapCut(src, iLo, iHi, a - head), co = snapCut(src, oLo, Math.max(oLo, oHi), b + tail);
  // still speech-level? ASR word edges drift, so widen the search once before giving up
  if (ci.db !== null && ci.db > mean - 15) ci = snapCut(src, Math.max(prevEnd - 0.1, iLo - 0.2, 0), iHi, a - head);
  if (co.db !== null && co.db > mean - 15) co = snapCut(src, oLo, Math.min(nextStart + 0.1, oHi + 0.25, dur), b + tail);
  const inn = Math.max(0, ci.t), out = Math.min(dur, co.t);
  for (const [c, label] of [[ci, 'in'], [co, 'out']]) if (c.db !== null && c.db > mean - 15) report.push(`cut ${label} @${c.t.toFixed(2)}s (segment ${k + 1}) is only ${(mean - c.db).toFixed(0)} dB under the speech level — a syllable may clip`);
  const last = segs.at(-1);
  if (last && inn - last.src_out < 0.15) { edit += out - last.src_out; last.src_out = +out.toFixed(3); return; } // < 0.15 s removed: not worth a join
  segs.push({ src_in: +inn.toFixed(3), src_out: +out.toFixed(3), edit_in: +edit.toFixed(3) });
  edit += out - inn;
});

picks.forEach((p, k) => {
  if (!p.take) report.push(`MISSING sentence ${k + 1}: "${p.sentence}"`);
  else if (p.take.gapFill) report.push(`gap-filled sentence ${k + 1} from words between its neighbours (match ${p.take.score.toFixed(2)}): "${p.sentence}" — listen to confirm`);
  else if (p.take.score < 0.8) report.push(`weak match (${p.take.score.toFixed(2)}) sentence ${k + 1}: "${p.sentence}" — ASR or a fumbled take`);
  if (p.alternatives > 1) report.push(`retake: sentence ${k + 1} was spoken ${p.alternatives}× — kept @${p.take?.start.toFixed(2)}s`);
});

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'edl.json'), JSON.stringify({
  total: +edit.toFixed(3), segs,
  sentences: picks.map(p => ({ text: p.sentence, src_start: p.take?.start ?? null, src_end: p.take?.end ?? null, score: p.take ? +p.take.score.toFixed(3) : null, i: p.take?.i, j: p.take?.j })),
}, null, 1));
const graph = [
  ...segs.map((s, i) => `[0:v]trim=start=${s.src_in}:end=${s.src_out},setpts=PTS-STARTPTS[v${i}]`),
  ...segs.map((s, i) => { const d = s.src_out - s.src_in; return `[0:a]atrim=start=${s.src_in}:end=${s.src_out},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.012,afade=t=out:st=${(d - 0.012).toFixed(3)}:d=0.012[a${i}]`; }),
  segs.map((_, i) => `[v${i}][a${i}]`).join('') + `concat=n=${segs.length}:v=1:a=1[vc][ac]`,
  '[vc]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1[v]', '[ac]loudnorm=I=-14:TP=-1.5:LRA=9,aresample=48000,alimiter=limit=0.8:level=false[a]',
].join(';');
fs.writeFileSync(path.join(outDir, 'ffmpeg-graph.txt'), graph);
fs.writeFileSync(path.join(outDir, 'cut-report.txt'), [`segments ${segs.length} · total ${edit.toFixed(2)}s · source ${dur.toFixed(2)}s`, ...report].join('\n') + '\n');
console.log(`segments ${segs.length} · total ${edit.toFixed(2)}s · ${report.length} notes → ${path.join(outDir, 'cut-report.txt')}`);

if (render) execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', src, '-/filter_complex', path.join(outDir, 'ffmpeg-graph.txt'), '-map', '[v]', '-map', '[a]', '-r', '30',
  '-c:v', 'libx264', '-crf', '16', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', render], { stdio: 'inherit' });
