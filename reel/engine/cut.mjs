// AIFTER reel engine — cut step: word-timestamp ASR → script-aligned take selection + pause removal → re-transcribe → verify.
// Inputs: <project>/source-raw.mp4, <project>/script.txt. Outputs: data/raw-words.json, data/edl.json, data/cut-report.txt,
// assets/presenter.mp4, data/cut-words.json, data/cut-log.json (timings + verify result).
// Python: $ASR_PY, else <repo>/videos/.venv-asr/Scripts/python(.exe) or bin/python (needs faster-whisper).
// Usage: node .agents/skills/aifter-video-production/scripts/reel/engine/cut.mjs <projectDir>
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const P = path.resolve(process.argv[2] || '.');
const ENG = path.dirname(fileURLToPath(import.meta.url));
const REEL = path.resolve(ENG, '..');
const findUp = rel => { let d = ENG; for (;;) { const c = path.join(d, rel); if (fs.existsSync(c)) return c; const up = path.dirname(d); if (up === d) return null; d = up; } };
const py = process.env.ASR_PY || ['.venv-asr/Scripts/python.exe', '.venv-asr/bin/python', 'videos/.venv-asr/Scripts/python.exe', 'videos/.venv-asr/bin/python'].map(findUp).find(Boolean);
if (!py) throw new Error('No ASR python. Create it: py -3.12 -m venv videos/.venv-asr && videos/.venv-asr/Scripts/python -m pip install faster-whisper (or set ASR_PY)');
for (const need of ['source-raw.mp4', 'script.txt']) if (!fs.existsSync(path.join(P, need))) throw new Error('missing ' + need);
fs.mkdirSync(path.join(P, 'data'), { recursive: true }); fs.mkdirSync(path.join(P, 'assets'), { recursive: true });

const log = { steps: {} };
const run = (name, cmd, args) => { const t = Date.now(); const r = spawnSync(cmd, args, { cwd: P, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  log.steps[name] = { sec: +((Date.now() - t) / 1000).toFixed(1), code: r.status, out: (r.stdout || '').trim().split('\n').slice(-4) };
  process.stdout.write(`${name}: ${log.steps[name].sec}s\n${r.stdout || ''}`); if (r.status && name !== 'verify') { process.stderr.write(r.stderr || ''); process.exit(r.status); } return r; };

run('transcribe-raw', py, [path.join(REEL, 'transcribe.py'), 'source-raw.mp4', 'data/raw-words.json']);
run('edl+render', 'node', [path.join(REEL, 'auto-edl.mjs'), '--source', 'source-raw.mp4', '--words', 'data/raw-words.json', '--script', 'script.txt', '--out', 'data', '--render', 'assets/presenter.mp4']);
run('transcribe-cut', py, [path.join(REEL, 'transcribe.py'), 'assets/presenter.mp4', 'data/cut-words.json']);
const v = run('verify', 'node', [path.join(REEL, 'verify-cut.mjs'), '--video', 'assets/presenter.mp4', '--words', 'data/cut-words.json', '--script', 'script.txt', '--edl', 'data/edl.json']);
log.verify = { ok: v.status === 0, lines: (v.stdout || '').trim().split('\n') };
log.totalSec = +Object.values(log.steps).reduce((s, x) => s + x.sec, 0).toFixed(1);
fs.writeFileSync(path.join(P, 'data/cut-log.json'), JSON.stringify(log, null, 1));
console.log(`cut done in ${log.totalSec}s · verify ${log.verify.ok ? 'OK' : 'BLOCK'} · report data/cut-report.txt`);
process.exit(v.status || 0);
