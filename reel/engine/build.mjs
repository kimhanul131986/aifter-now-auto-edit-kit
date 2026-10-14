// AIFTER reel engine — composition builder.
// Reads <project>/data/shot-plan.json (from plan.mjs) and <project>/content.mjs (per-video screens written by Claude) and writes
// <project>/index.html. The engine owns layout, transitions, captions, HUD, chapter markers, seam card, cover, SFX placement
// and asset copying; content.mjs owns only what is specific to one video.
// Usage: node .agents/skills/aifter-video-production/scripts/reel/engine/build.mjs <projectDir>
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { runtime } from './runtime.mjs';

const P = path.resolve(process.argv[2] || '.');
const ENG = path.dirname(fileURLToPath(import.meta.url));
// portable lookups: walk up from the engine folder so the engine works inside this repo and as a standalone kit
const findUp = rel => { let d = ENG; for (;;) { const c = path.join(d, rel); if (fs.existsSync(c)) return c; const up = path.dirname(d); if (up === d) return null; d = up; } };
const rd = p => fs.readFileSync(p, 'utf8');
const plan = JSON.parse(rd(path.join(P, 'data/shot-plan.json')));
const rules = JSON.parse(rd(fs.existsSync(path.join(P, 'data/rules.json')) ? path.join(P, 'data/rules.json') : path.join(ENG, 'rules.default.json')));
const V = JSON.parse(rd(path.join(P, 'data/video.json')));
const content = (await import(pathToFileURL(path.join(P, 'content.mjs')).href)).default;

const D = plan.stats.duration, SH = plan.shots, CH = plan.chunks, MSTAT = plan.stats.motion;
const at = txt => { const c = CH.find(c => c.text.includes(txt)); if (!c) throw new Error('anchor not found in captions: ' + txt); return +c.start.toFixed(3); };
const BS = bi => SH.find(h => h.screen === `b${bi + 1}`).a, BE = bi => SH.filter(h => h.beat === bi).at(-1).b;
const ctx = { V, D, SH, CH, MSTAT, BS, BE, at };
const X = content.anchors(ctx);
const cover = content.cover || null;
const E = +(D + (cover ? (cover.hold ?? 1.4) : 0)).toFixed(2);

// ---------- captions (script text, keywords highlighted) ----------
const KEY = content.keywords || [];
const capHtml = CH.map((c, i) => `<div class="cl" id="cl${i}"><span>${c.text.split(' ').map(w => KEY.includes(w) ? `<b>${w}</b>` : w).join(' ')}</span></div>`).join('');

// ---------- markup helpers handed to content.screens ----------
const hwHash = (n, seed) => { const x = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453; return (x - Math.floor(x)) * 2 - 1; };
// pen ring: one smooth tilted stroke that overshoots its start (no per-point jitter)
const hwLoop = (w, h, seed) => { const cx = w / 2, cy = h / 2, rx = w / 2 - 10, ry = h / 2 - 10, n = 24, tilt = -0.06 + hwHash(1, seed) * .03;
  const Pt = Array.from({ length: n + 1 }, (_, i) => { const u = i / n, a = -Math.PI * .85 + u * Math.PI * 2.18, r = .95 + .08 * u;
    const x = Math.cos(a) * rx * r, y = Math.sin(a) * ry * r; return [cx + x * Math.cos(tilt) - y * Math.sin(tilt), cy + x * Math.sin(tilt) + y * Math.cos(tilt)]; });
  let d = `M ${Pt[0][0].toFixed(1)} ${Pt[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) { const p0 = Pt[Math.max(0, i - 1)], p1 = Pt[i], p2 = Pt[i + 1], p3 = Pt[Math.min(n, i + 2)];
    d += ` C ${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`; }
  return d; };
const BG = { dark: ['bg-night', 'bg-black', 'bg-violet', 'bg-steel'], light: ['bg-paper', 'bg-mint', 'bg-lilac'] };
const h = {
  hwLoop,
  scr: (id, bg, inner) => `<div id="${id}" class="scr ${bg}"><div class="dots"></div><div class="glow g1"></div><div class="glow g2"></div><div class="stage">${inner}</div><i class="sweep"></i><div class="src">${(content.footers || {})[id] || ''}</div></div>`,
  hdr: (k, pill) => `<div class="hdr"><b class="tile">${String(k + 1).padStart(2, '0')}</b><span class="hn">${content.titles[k]}</span><div class="pill"><span>${pill}</span></div></div>`,
  wheel: (id, v) => `<span class="wh" id="${id}">${[...v].map(c => /\d/.test(c) ? `<span class="wd"><span class="ws" data-stops="${10 + +c}">${Array.from({ length: 11 + +c }, (_, n) => `<span>${n % 10}</span>`).join('')}</span></span>` : `<span class="wc">${c}</span>`).join('')}</span>`,
  pen: (id, style, note, dir = 'left') => `<div class="pen" id="${id}" style="${style}"><svg viewBox="0 0 160 90"><path d="${dir === 'left' ? 'M150 8 C120 20 70 30 30 74 M30 74 L58 70 M30 74 L36 48' : 'M10 70 C40 40 90 30 150 30 M150 30 L126 18 M150 30 L130 48'}"/></svg><span>${note}</span></div>`,
  bg: k => { const pal = V.palette[k], list = BG[pal]; return list[k % list.length] + (pal === 'light' ? ' lt' : ''); },
};
const layers = content.screens(h, X, ctx);

// ---------- engine-owned overlays: HUD, chapter markers, seam card, cover ----------
const hudSpec = content.hud ? content.hud(X) : null;
const HUD = hudSpec ? hudSpec.items : [];
const hud = hudSpec ? `<div id="hud"><span class="hl">${hudSpec.label}</span><div class="hs">${HUD.map(([w], k) => `<i id="hu${k}"><span>${w}</span></i>`).join('')}</div><b id="hun">0/${HUD.length}</b><div class="hbar"><i id="hubar"></i></div></div>` : '';
const CHAP = content.chapters || [];
const chaps = CHAP.length ? `<div id="chaps"><i class="scrim" id="scrim"></i>${CHAP.map(([, n, w], k) => `<div class="chap" id="ch${k}"><em>${n}</em><b><span>${w}</span></b><u></u></div>`).join('')}</div>` : '';
const seam = content.seam || null;
const seamHtml = seam ? `<div id="strad"><i>${seam.icon}</i><span>${seam.text}</span><b>${seam.value}</b></div>` : '';
const coverHtml = cover ? `<div id="cover"><div class="cv"><em>${cover.tag}</em>${cover.lines.map((l, k) => `<b${k === cover.lines.length - 1 ? ' class="y"' : ''}><span>${l}</span></b>`).join('')}<u></u>${cover.sub ? `<small>${cover.sub}</small>` : ''}</div></div>` : '';

// ---------- Lottie ----------
const LOT = { check: JSON.parse(rd(path.join(ENG, 'assets/check.json'))), ...(content.lottie || {}) };

// ---------- SFX: engine events (shots, HUD, chapters, cover) + content events; variants rotate, no file twice in a row ----------
const LIBDIR = findUp('assets/sfx-lib/manifest.json') ? path.dirname(findUp('assets/sfx-lib/manifest.json')) : null;
const LIB = LIBDIR ? JSON.parse(rd(path.join(LIBDIR, 'manifest.json'))) : null;   // no library → silent build (kits ship without sounds)
// collect events first, then assign files in time order so the no-repeat rule holds on the final timeline
const ev = [];
const add = (t, fam, v = .3) => { if (!LIB) return; if (!LIB[fam] || !LIB[fam].length) throw new Error('sfx family ' + fam); ev.push([Math.max(0, +t.toFixed(3)), fam, v]); };
const GAIN = { cut: .35, expand: .28, slide: .3, wipe: .35, pixel: .3, zoom: .28, panel: .35, skeleton: .22, rack: .3, punch: .5 };
const FAMOF = { slide: 'wipe' };
SH.forEach((s, i) => { if (i) add(s.a, FAMOF[s.enter] || s.enter, GAIN[s.enter] ?? .3); });
HUD.forEach(([, t]) => add(t + .27, 'slot', .3));
if (content.sfx) content.sfx(add, X, ctx);
if (cover) add(D, 'punch', .5);
const sfx = [], famIdx = {}; let lastFile = null;
ev.sort((a, b) => a[0] - b[0]).forEach(([t, fam, v]) => { const list = LIB[fam];
  let k = famIdx[fam] || 0, pick = list[k % list.length]; if (pick.file === lastFile && list.length > 1) { k++; pick = list[k % list.length]; }
  famIdx[fam] = k + 1; lastFile = pick.file; sfx.push([t, pick.file, Math.min(pick.dur, 1.6), v]); });
const busy = []; const lane = (t, d) => { let i = 0; while ((busy[i] || 0) > t + 1e-6) i++; busy[i] = t + d; return 3 + i; };
const audio = sfx.map(([t, file, d, v], i) => `<audio id="sx${i}" src="assets/sfx-lib/${file}" data-start="${t}" data-duration="${d}" data-volume="${v}" data-track-index="${lane(t, d)}"></audio>`).join('\n');
const sfxStats = { events: sfx.length, files: new Set(sfx.map(s => s[1])).size, families: new Set(sfx.map(s => s[1].replace(/_\d+\.mp3$/, ''))).size, repeatsInRow: sfx.filter((s, k) => k && s[1] === sfx[k - 1][1]).length };

// ---------- assets: copy only what this composition references into <project>/assets ----------
const need = (src, dst) => { fs.mkdirSync(path.dirname(dst), { recursive: true }); if (!fs.existsSync(dst) || fs.statSync(dst).size !== fs.statSync(src).size) fs.copyFileSync(src, dst); };
new Set(sfx.map(s => s[1])).forEach(file => need(path.join(LIBDIR, file), path.join(P, 'assets/sfx-lib', file)));
['Pretendard-ExtraBold.woff2', 'Pretendard-SemiBold.woff2', 'NanumPenScript-Regular.ttf'].forEach(fn => { const src = findUp(path.join('assets/fonts', fn)); if (!src) throw new Error('font not found: assets/fonts/' + fn); need(src, path.join(P, 'assets', fn)); });

// ---------- layout constants ----------
const css = rd(path.join(ENG, 'base.css')) + (content.css ? rd(path.join(P, content.css)) : '');
const FACE = { F: { left: 0, top: 0, width: 1080, height: 1920, borderRadius: 0 }, S: { left: 160, top: 900, width: 760, height: 820, borderRadius: 44 }, G: { left: 0, top: 0, width: 1080, height: 1920, borderRadius: 0 } };
const OBJ = { F: '50% 0%', S: V.faceS || '50% 4%', G: '50% 0%' };
const CAPY = { F: 1300, S: 836, G: 1330 };
const STAGE = { S: { y: 0, scale: 1 }, G: { y: 340, scale: 1.08 } };
const B = Object.fromEntries(V.objects.map((_, k) => [`b${k + 1}`, [BS(k), BE(k)]]));

const script = runtime({ E, D, SH, X, CH, FACE, OBJ, CAPY, STAGE, B, LOT, rules }) + `
// ---- engine helpers for content
const pen=(id,t)=>{hwDraw('#'+id+' path',t,.4);tl.fromTo('#'+id+' span',{opacity:0,y:8},fi(t+.3,{opacity:1,y:0,duration:.25}),t+.3)};
const typeTxt=(sel,txt,t0,d)=>{const e=Q(sel),ch=[...txt];tl.set(e,{textContent:''},0);ch.forEach((c,i)=>tl.set(e,{textContent:ch.slice(0,i+1).join('')},t0+d*(i+1)/ch.length))};
// ---- HUD: hidden on face-only shots and after the last line; items fill when said
${HUD.length ? `{SH.forEach(h=>tl.set('#hud',{opacity:h.pose==='F'?0:1},h.a));tl.set('#hud',{opacity:0},D);
 ${JSON.stringify(HUD.map(x => x[1]))}.forEach((t0,n)=>{const t=t0+.25,N=${HUD.length};
  tl.to('#hu'+n,{backgroundColor:'#F4C542',borderColor:'#F4C542',borderStyle:'solid',duration:.12},t);tl.fromTo('#hu'+n+' span',{opacity:0,y:16},fi(t,{opacity:1,y:0,...POP}),t);
  tl.fromTo('#hu'+n,{scale:1},fi(t,{scale:1.12,duration:.1,yoyo:true,repeat:1}),t);tl.set('#hun',{textContent:(n+1)+'/'+N},t);tl.to('#hubar',{scaleX:(n+1)/N,duration:.3,ease:'power2.out'},t)});}` : ''}
// ---- per-video screen animations (content.mjs)
${content.script(X, ctx)}
// ---- chapter markers on face-only shots: index, masked title, drawn rule, soft scrim
${JSON.stringify(CHAP)}.forEach(([si],k)=>{const h=SH.find(x=>x.pose==='F'&&x.si===si);if(!h)return;const c='#ch'+k,t=h.a+.05;
  tl.set(c,{opacity:1},t);tl.fromTo('#scrim',{opacity:0},fi(t,{opacity:1,duration:.25}),t);tl.set('#scrim',{opacity:0},h.b);
  tl.fromTo(c+' em',{opacity:0,x:-24},fi(t,{opacity:1,x:0,duration:.25,ease:'power3.out'}),t);
  tl.fromTo(c+' b span',{yPercent:110},fi(t+.06,{yPercent:0,duration:.42,ease:'power4.out'}),t+.06);
  tl.fromTo(c+' u',{scaleX:0},fi(t+.25,{scaleX:1,duration:.4,ease:'power3.inOut'}),t+.25);
  tl.to(c,{opacity:0,y:-10,duration:.15},h.b-.15);tl.set(c,{y:0},h.b)});
${seam ? `// ---- seam card on the split shots of one beat; the caption steps down for those shots
SH.forEach(h=>{if(h.screen==='${seam.beat}'&&h.pose==='S'){tl.fromTo('#strad',{opacity:0,scale:.8,y:20},fi(h.a+.1,{opacity:1,scale:1,y:0,...POP}),h.a+.1);tl.set('#strad',{opacity:0},h.b);tl.set('#caps',{y:1450},h.a+.001)}});` : ''}
${cover ? `// ---- cover after the last line (thumbnail frame)
{tl.set('#face',{opacity:0},D);tl.set('#cover',{opacity:1},D);tl.fromTo('#cover em',{opacity:0,x:-24},fi(D+.05,{opacity:1,x:0,duration:.25}),D+.05);
 QA('#cover b span').forEach((e,k)=>tl.fromTo(e,{yPercent:110},fi(D+.1+k*.12,{yPercent:0,duration:.45,ease:'power4.out'}),D+.1+k*.12));
 tl.fromTo('#cover u',{scaleX:0},fi(D+.45,{scaleX:1,duration:.45,ease:'power3.inOut'}),D+.45);tl.fromTo('#cover small',{opacity:0},fi(D+.7,{opacity:1,duration:.3}),D+.7);}` : ''}
tl.set({},{},E);
window.__timelines.main=tl;
`;

const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=1080, height=1920"><script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script><script src="https://cdnjs.cloudflare.com/ajax/libs/bodymovin/5.12.2/lottie.min.js"></script><style>${css}</style></head><body>
<div id="root" data-composition-id="main" data-width="1080" data-height="1920" data-duration="${E}">
<div id="face" data-layout-allow-overflow><video id="presenter" class="clip" src="assets/presenter.mp4" data-start="0" data-duration="${D}" data-has-audio="true" data-track-index="0" playsinline data-layout-allow-overflow></video></div>
<div id="g" data-layout-allow-overlap>${layers}</div>
${hud}
${chaps}
${seamHtml}
${coverHtml}
<div id="pix" data-layout-allow-overlap>${'<i></i>'.repeat(9 * 16)}</div>
<div id="caps" data-layout-allow-caption-zone>${capHtml}</div>
${audio}
</div><script>${script}</script></body></html>`;
fs.writeFileSync(path.join(P, 'index.html'), html);
console.log(JSON.stringify({ index: html.length, D, E, shots: SH.length, captions: CH.length, sfx: LIB ? sfxStats : 'off (no assets/sfx-lib found)' }));
