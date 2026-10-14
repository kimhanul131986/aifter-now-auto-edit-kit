// In-page runtime shared by every reel: helpers, layout/transition loop driven by shot-plan.json, captions, glows.
// Returned as a string that build.mjs places inside the composition's <script>. Seek-safe: one paused GSAP timeline.
export const runtime = ({ E, D, SH, X, CH, FACE, OBJ, CAPY, STAGE, B, LOT, rules }) => `
window.__timelines=window.__timelines||{};
const tl=gsap.timeline({paused:true});
const Q=s=>document.querySelector(s),QA=s=>Array.from(document.querySelectorAll(s));
const E=${E},D=${D},SH=${JSON.stringify(SH.map(h => ({ a: h.a, b: h.b, pose: h.pose, screen: h.screen, punch: h.punch, enter: h.enter, si: h.si })))},X=${JSON.stringify(X)};
const CH=${JSON.stringify(CH.map(c => [c.start, c.end]))};
const FACE=${JSON.stringify(FACE)},OBJ=${JSON.stringify(OBJ)},CAPY=${JSON.stringify(CAPY)},STAGE=${JSON.stringify(STAGE)};
const B=${JSON.stringify(B)},S0=B;
const IN={duration:.3,ease:'power3.out'},POP={duration:.22,ease:'back.out(2)'};
const fi=(t,v)=>({...v,immediateRender:false});
const count=(sel,v0,v1,t0,d,fmt=v=>v.toLocaleString('en-US'))=>{const e=Q(sel),n=Math.max(2,Math.min(40,Math.round(d*14)));tl.set(e,{textContent:fmt(v0)},0);for(let k=1;k<=n;k++){const p=1-Math.pow(1-k/n,3);tl.set(e,{textContent:fmt(Math.round(v0+(v1-v0)*p))},t0+d*k/n)}};
const countSet=(sel,v0,v1,t0,d,fmt=v=>v.toLocaleString('en-US'))=>{const e=Q(sel),n=Math.max(2,Math.min(40,Math.round(d*14)));for(let k=1;k<=n;k++){const p=1-Math.pow(1-k/n,3);tl.set(e,{textContent:fmt(Math.round(v0+(v1-v0)*p))},t0+d*k/n)}};

// number-wheel: each column rolls through one extra revolution and lands on its digit, staggered left to right
const wheelOn=(sel,t)=>QA(sel+' .ws').forEach((e,k)=>{const st=+e.dataset.stops;tl.fromTo(e,{yPercent:0},fi(t+k*.08,{yPercent:-100*st/(st+1),duration:.9,ease:'power3.out'}),t+k*.08)});
// hand-drawn stroke draw-on (hw-* recipe)
const hwDraw=(sel,t,d=.55)=>{const e=Q(sel),n=e.getTotalLength();tl.set(e,{strokeDasharray:n,strokeDashoffset:n},0);tl.to(e,{strokeDashoffset:0,duration:d,ease:'power2.inOut'},t)};
// Lottie driven from the GSAP timeline (registry runtime seeks Lottie to absolute time, so one-shots placed mid-video are driven by a proxy)
const LOT=${JSON.stringify(LOT)};
const lot=(sel,key,loop)=>{const a=lottie.loadAnimation({container:Q(sel),renderer:'svg',loop:false,autoplay:false,animationData:JSON.parse(JSON.stringify(LOT[key]))});a.goToAndStop(0,true);return a};
const lotPlay=(a,sel,t0,t1,frames)=>{const o={f:0};tl.set(sel,{opacity:0},0);tl.set(sel,{opacity:1},t0);tl.fromTo(o,{f:0},fi(t0,{f:frames,duration:t1-t0,ease:'none',onUpdate:()=>a.goToAndStop(o.f%a.totalFrames,true)}),t0)};

// ---- layout + motion from the plan. Each shot's entrance comes from shot-plan.json (enter); no shot reuses the previous shot's motion.
// Recipes: wipe = directional-wipe, pixel = grid-pixelate-wipe, zoom = zoom-through-transition, panel = panel-reveal, skeleton = skeleton-reveal.
const MD=${JSON.stringify(rules.motion.durations)};
const OUT=new Set(['wipe','pixel','zoom']);
const EZ='power3.inOut';
SH.forEach((h,i)=>{const p=SH[i-1],n=SH[i+1],P=h.pose,d=MD[h.enter]||0;
  // face window + caption seam: animated for an in-place expand, set otherwise
  if(h.enter==='expand'){tl.to('#face',{...FACE[P],duration:d,ease:EZ},h.a);tl.to('#caps',{y:CAPY[P],duration:d,ease:EZ},h.a);}
  else{tl.set('#face',FACE[P],h.a);tl.set('#caps',{y:CAPY[P]},h.a);}
  tl.set('#presenter',{objectPosition:OBJ[P],scale:1,filter:'blur(0px)'},h.a);
  if(h.enter==='punch')tl.fromTo('#presenter',{scale:1,filter:'blur(8px)'},fi(h.a,{scale:${rules.punchIn.scale},filter:'blur(0px)',duration:d,ease:'power3.out'}),h.a);
  if(h.enter==='rack')tl.fromTo('#presenter',{scale:1.08,filter:'blur(12px)'},fi(h.a,{scale:1,filter:'blur(0px)',duration:d,ease:'power2.out'}),h.a);
  if(!h.screen)return;
  const s='#'+h.screen,H=P==='G'?1920:880,prev=p&&p.screen?'#'+p.screen:null;
  tl.set(s,{zIndex:2+i},h.a);
  if(h.enter==='expand'){tl.to(s,{height:H,duration:d,ease:EZ},h.a);tl.to(s+' .stage',{...STAGE[P],duration:d,ease:EZ},h.a);}
  else{tl.set(s,{opacity:h.enter==='pixel'?0:1,height:H,clipPath:'inset(0% 0% 0% 0%)',x:0,scale:1,filter:'blur(0px)'},h.a);tl.set(s+' .stage',STAGE[P],h.a);}
  // hide when the screen is no longer on: at its own end, or after the next shot's transition has covered it
  if(!(n&&n.screen===h.screen))tl.set(s,{opacity:0},n&&OUT.has(n.enter)?n.a+MD[n.enter]:h.b);
  if(h.enter==='wipe'){tl.fromTo(s,{clipPath:'inset(0% 100% 0% 0%)',x:60,scale:1.04},fi(h.a,{clipPath:'inset(0% 0% 0% 0%)',x:0,scale:1,duration:d,ease:EZ}),h.a);
    if(prev)tl.to(prev,{x:-70,scale:.96,filter:'blur(5px)',duration:d,ease:EZ},h.a);
    tl.fromTo(s+' .sweep',{x:0,opacity:1},fi(h.a+.08,{x:1500,opacity:1,duration:d,ease:'power2.inOut'}),h.a+.08);tl.set(s+' .sweep',{opacity:0},h.a+d+.1);}
  if(h.enter==='pixel'){tl.set('#pix',{height:H},h.a);const c=QA('#pix i').filter((e,k)=>Math.floor(k/9)*120<H);
    tl.to(c,{scale:1.02,duration:.22,stagger:{amount:.14,from:'center'},ease:'power2.in'},h.a);tl.set(s,{opacity:1},h.a+.25);
    tl.to(c,{scale:0,duration:.22,stagger:{amount:.14,from:'edges'},ease:'power2.out'},h.a+.25);}
  if(h.enter==='zoom'){if(prev)tl.to(prev,{scale:1.35,filter:'blur(10px)',opacity:0,duration:.3,ease:'power2.in'},h.a);
    tl.fromTo(s,{scale:.82,filter:'blur(8px)',opacity:0},fi(h.a,{scale:1,filter:'blur(0px)',opacity:1,duration:d,ease:'power3.out'}),h.a);}
  if(h.enter==='panel')tl.fromTo(s,{clipPath:'inset(50% 0% 50% 0%)'},fi(h.a,{clipPath:'inset(0% 0% 0% 0%)',duration:d,ease:EZ}),h.a);
  if(h.enter==='slide')tl.fromTo(s+' .stage',{y:STAGE[P].y+160,opacity:0},fi(h.a,{y:STAGE[P].y,opacity:1,duration:d,ease:EZ}),h.a);
  if(h.enter==='skeleton'){tl.fromTo(s+' .skel',{opacity:1,backgroundPosition:'100% 0'},fi(h.a,{backgroundPosition:'-100% 0',duration:d-.1,ease:'none'}),h.a);tl.to(s+' .skel',{opacity:0,duration:.2},h.a+d-.1);}
});
CH.forEach(([a],i)=>{tl.set('#cl'+i,{opacity:1},a);tl.set('#cl'+i,{opacity:0},i<CH.length-1?CH[i+1][0]:D-.02)});
Object.entries(S0).forEach(([s,[a,b]])=>{tl.fromTo('#'+s+' .g1',{x:-120,y:-60},fi(a,{x:420,y:200,duration:b-a,ease:'sine.inOut'}),a);tl.fromTo('#'+s+' .g2',{x:120,y:60},fi(a,{x:-380,y:-180,duration:b-a,ease:'sine.inOut'}),a)});


`;
