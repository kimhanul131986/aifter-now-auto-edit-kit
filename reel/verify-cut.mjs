// Verify a cut master (or a final render) against the script: re-transcribed words must contain every sentence
// exactly once and in order; no join may land on speech; no black or frozen stretch; loudness near −14 LUFS.
// Usage: node verify-cut.mjs --video cut.mp4 --words cut-words.json --script script.txt [--edl edl.json] [--final]
// Exit code 1 when a blocking problem is found.
import fs from 'fs';
import { splitSentences, findTakes, ffmpegLog, rmsWindows, meanLevel } from './reel-lib.mjs';

const arg = k => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : undefined; };
const video = arg('video'), words = JSON.parse(fs.readFileSync(arg('words'), 'utf8'));
const sentences = splitSentences(fs.readFileSync(arg('script'), 'utf8'));
const edl = arg('edl') ? JSON.parse(fs.readFileSync(arg('edl'), 'utf8')) : null;
const block = [], warn = [];

// 1. every sentence once, in order (missing / duplicated / reordered)
let lastStart = -1;
sentences.forEach((s, k) => {
  const takes = findTakes(s, words, 0.6).filter(t => t.score >= 0.7);
  if (!takes.length) {
    const weak = findTakes(s, words, 0.4).filter(t => t.start > lastStart).sort((a, b) => b.score - a.score)[0];
    if (weak) lastStart = weak.start;
    (weak ? warn : block).push(weak ? `sentence ${k + 1} only weakly heard (${weak.score.toFixed(2)}) @${weak.start.toFixed(2)}s — names/English often mis-heard; listen: "${s}"`
      : `MISSING sentence ${k + 1}: "${s}"`);
    return;
  }
  if (takes.length > 1) block.push(`DUPLICATE sentence ${k + 1} heard ${takes.length}× @${takes.map(t => t.start.toFixed(2)).join(', ')}s: "${s}"`);
  if (takes[0].start < lastStart) warn.push(`sentence ${k + 1} appears before the previous one — order changed?`);
  lastStart = takes[0].start;
});

// 2. joins: ASR word times drift ±0.1–0.2 s, so judge each join by the sound itself — speech-level audio
//    right at a join means a first or last syllable was clipped.
if (edl) { const mean = meanLevel(video);
  for (const s of edl.segs.slice(1)) {
    const t = s.edit_in, w = rmsWindows(video, Math.max(0, t - 0.03), t + 0.03), loud = Math.max(...w.map(x => x.db));
    // noisy phone takes: loudness normalisation lifts the room tone, so compare with the local noise floor too
    const around = rmsWindows(video, Math.max(0, t - 0.5), t + 0.5).map(x => x.db).sort((a, b) => a - b);
    const floor = around[Math.floor(around.length * 0.1)] ?? -120;
    if (w.length && loud > mean - 10 && loud > floor + 8) {
      const near = words.find(x => x.start < t + 0.1 && x.end > t - 0.1);
      warn.push(`join @${t.toFixed(2)}s is loud (${(mean - loud).toFixed(0)} dB under speech)${near ? ` near "${near.text}"` : ''} — listen for a clipped syllable`);
    }
  }
}

// 3. picture and sound health
const black = [...ffmpegLog(['-i', video, '-vf', 'blackdetect=d=0.25:pix_th=0.10', '-an', '-f', 'null', '-']).matchAll(/black_start:([\d.]+) black_end:([\d.]+)/g)];
black.forEach(m => block.push(`black frames ${(+m[1]).toFixed(2)}–${(+m[2]).toFixed(2)}s`));
const frozen = [...ffmpegLog(['-i', video, '-vf', 'freezedetect=n=0.001:d=1.5', '-an', '-f', 'null', '-']).matchAll(/freeze_start: ([\d.]+)[\s\S]*?freeze_end: ([\d.]+)/g)];
frozen.forEach(m => (arg('final') !== undefined ? warn : block).push(`frozen picture ${(+m[1]).toFixed(2)}–${(+m[2]).toFixed(2)}s`));
const r128 = ffmpegLog(['-i', video, '-vn', '-af', 'ebur128=peak=true', '-f', 'null', '-']).split('Summary:').pop();
const lufs = +(r128.match(/I:\s+(-?[\d.]+) LUFS/) || [, NaN])[1], peak = +(r128.match(/Peak:\s+(-?[\d.]+) dBFS/) || [, NaN])[1];
if (!(lufs > -16 && lufs < -12)) warn.push(`loudness ${lufs} LUFS (target −14 ±2)`);
if (peak > -1) warn.push(`true peak ${peak} dBFS (keep ≤ −1)`);

console.log(`verify: ${sentences.length} sentences · loudness ${lufs} LUFS · peak ${peak} dBFS`);
block.forEach(m => console.log('BLOCK ' + m));
warn.forEach(m => console.log('CHECK ' + m));
if (!block.length && !warn.length) console.log('OK — nothing missing, duplicated or clipped');
process.exit(block.length ? 1 : 0);
