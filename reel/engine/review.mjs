// AIFTER reel engine — review step (user rule 2026-10-13: test renders too must be checked for overlaps, clipping, empty
// shots before they are shown). Automated layout check alone missed real defects, so this also prepares frame sheets for a
// human/Claude look at every shot.
// 1) hyperframes check --at every shot midpoint + every face-shot chapter frame + cover → layout issues
// 2) if output/<render>.mp4 exists: one frame per shot near its end + chapter enter/exit frames → review/shots.jpg, review/chapters.jpg
// Usage: node .agents/skills/aifter-video-production/scripts/reel/engine/review.mjs <projectDir> [render.mp4]
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const P = path.resolve(process.argv[2] || '.');
const plan = JSON.parse(fs.readFileSync(path.join(P, 'data/shot-plan.json'), 'utf8'));
const pkg = JSON.parse(fs.readFileSync(path.join(P, 'package.json'), 'utf8'));
const hf = (pkg.scripts.check.match(/hyperframes@[\d.]+/) || ['hyperframes'])[0];
const SH = plan.shots, D = plan.stats.duration;
const out = path.join(P, 'review'); fs.mkdirSync(out, { recursive: true });

const mids = SH.map(h => ((h.a + h.b) / 2).toFixed(2));
const faces = SH.filter(h => h.pose === 'F').map(h => (h.a + .7).toFixed(2));
const at = [...new Set([...mids, ...faces, (D + .7).toFixed(2)])].join(',');
const c = spawnSync('npx', ['--yes', hf, 'check', '--at', at], { cwd: P, encoding: 'utf8', shell: true, maxBuffer: 64 << 20 });
const txt = (c.stdout || '') + (c.stderr || '');
const section = (name, next) => { const i = txt.indexOf(name); if (i < 0) return ''; const j = next ? txt.indexOf(next, i + 1) : -1; return txt.slice(i, j < 0 ? undefined : j); };
const layout = section('\nLayout', '\nMotion'), lint = section('\nLint', '\nRuntime'), rt = section('\nRuntime', '\nLayout');
const issues = (layout.match(/✗[^\n]*/g) || []);
fs.writeFileSync(path.join(out, 'check.txt'), txt);
console.log(`check: lint ${/0 errors/.test(lint) ? 'ok' : 'ISSUES'} · runtime ${/0 errors/.test(rt) ? 'ok' : 'ISSUES'} · layout ${issues.length} error(s) at ${at.split(',').length} samples (review/check.txt)`);
issues.slice(0, 12).forEach(l => console.log('  ' + l.slice(0, 200)));

const mp4 = process.argv[3] ? path.resolve(process.argv[3]) : (fs.existsSync(path.join(P, 'output')) ? fs.readdirSync(path.join(P, 'output')).filter(f => f.endsWith('.mp4')).map(f => path.join(P, 'output', f)).sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] : null);
if (!mp4) { console.log('no render found — run the render, then review again for frame sheets'); process.exit(issues.length ? 1 : 0); }
const sheet = (name, times, cols) => {
  const dir = path.join(out, name); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
  times.forEach((t, i) => spawnSync('ffmpeg', ['-v', 'error', '-ss', String(Math.max(0, t)), '-i', mp4, '-frames:v', '1', '-vf', 'scale=200:-1', path.join(dir, `f_${String(i).padStart(3, '0')}.jpg`), '-y']));
  const rows = Math.ceil(times.length / cols);
  spawnSync('ffmpeg', ['-v', 'error', '-i', path.join(dir, 'f_%03d.jpg'), '-vf', `tile=${cols}x${rows}:padding=3:color=white`, path.join(out, name + '.jpg'), '-y']);
  return path.join(out, name + '.jpg');
};
const shots = sheet('shots', [...SH.map(h => h.b - .25), D + 1.2], 10);
const chapterTimes = SH.filter(h => h.pose === 'F').flatMap(h => [h.a + .12, h.a + .7, h.b - .08]);
const chaps = chapterTimes.length ? sheet('chapters', chapterTimes, 9) : null;
console.log(`frames: ${path.relative(P, shots)}${chaps ? ' · ' + path.relative(P, chaps) : ''} (from ${path.basename(mp4)}) — look at every tile for overlaps, clipped text, empty or broken shots before sharing`);
process.exit(issues.length ? 1 : 0);
