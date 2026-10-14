// reels-002 본편 — content for the AIFTER reel engine. Script v1.1 (briefs/reels-002-ai-auto-editor.md).
// Every number on screen is real: the reference dissection (benchmark doc "분석한 릴스 C"), this video's own cut (data/edl.json)
// and shot plan. Dry run uses a TTS placeholder; rerun cut → plan → build on the real take.
import fs from 'fs';
const J = p => JSON.parse(fs.readFileSync(new URL(p, import.meta.url), 'utf8'));
const edl = J('./data/edl.json');
const src = edl.segs.at(-1).src_out;                       // raw take length used by the cut
const mmss = s => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

export default {
  anchors: ({ at }) => ({
    prog: at('프로그램 한 번도'), open: at('안 열고'),
    input: at('찍은 영상이랑'), cc: at('클로드 코드에'),
    takes: at('틀린 테이크'), last: at('마지막에 제대로'), gap: at('빈 구간도'), len: at('전부 잘라'),
    subs: at('자막은'), twist: at('근데 진짜'),
    c6k: at('댓글 6천'), slice: at('받은 릴스를'), often: at('화면이 몇 초마다'), face: at('바뀌는지, 얼굴은'), num: at('나오는지 숫자로'),
    rule: at('그 규칙'), mine: at('제 영상에'), now: at('지금 이 화면'),
    gfx: at('그래픽 내용만'), each: at('문장마다'),
    kit: at('제가 쓴'), kit2: at('설치 방법'), follow: at('팔로우하고'), send: at('키트 보내'),
  }),
  keywords: ['편집', '프로그램', '한', '번도', '클로드', '틀린', '테이크는', '버리고,', '빈', '구간도', '그대로', '진짜는', '6천', '0.5초마다', '숫자로', '규칙', '지금', '화면이에요.', '그래픽', '키트로', '자동편집', '키트'],
  titles: ['편집 프로그램', '넣은 것', '컷 편집', '자막', '해부', '적용', '자동 범위', '키트'],
  footers: { b1: '실제 제작 방식', b2: '실제 실행 명령', b3: '이 영상의 실제 컷', b4: '실제 자막 방식', b5: '레퍼런스 실측값', b6: '이 영상의 실제 배치', b7: '실제 자동 범위', b8: '' },

  screens: (h, X, ctx) => {
    const SH = ctx.SH, D = ctx.D;
    const share = p => Math.round(100 * SH.filter(s => s.pose === p).reduce((t, s) => t + s.b - s.a, 0) / D);
    const mean = (D / SH.length).toFixed(1);
    return `
${h.scr('b1', h.bg(0), `${h.hdr(0, '0회')}
  <div class="card dark pad"><i class="skel"></i><div class="klab">열어 본 편집 앱</div>
    <div class="apps3">${['영상 편집 앱', '자막 앱', '모션 앱'].map((s, k) => `<div class="ap" id="ap${k}"><i></i><span>${s}</span><b class="x" id="apx${k}">0회</b></div>`).join('')}</div>
    <div class="termtile" id="termtile"><b>&gt;_</b><span>터미널 하나</span></div></div>`)}
${h.scr('b2', h.bg(1), `${h.hdr(1, '영상 + 대본')}
  <div class="card light pad"><i class="skel"></i>
    <div class="ins">${['source-raw.mp4', 'script.txt'].map((s, k) => `<span class="in" id="inp${k}">${s}</span>`).join('<i class="plus">+</i>')}</div>
    <div class="term"><div class="tbar"><i></i><i></i><i></i><span>claude code</span></div>
      ${['npm run cut', 'npm run plan', 'npm run build', 'npm run render'].map((c, k) => `<div class="tl2" id="tl${k}"><em>$</em> ${c}<u id="tk${k}">✓</u></div>`).join('')}</div>
    <div class="proof" id="proof"><img src="assets/proof/faster-whisper-github.png"><div><b>faster-whisper</b><small>받아쓰기 · MIT · ★25.8k (2026-10-13 캡처)</small></div></div></div>`)}
${h.scr('b3', h.bg(2), `${h.hdr(2, '자동')}
  <div class="card dark pad"><i class="skel"></i><div class="klab">한 문장, 테이크 3번</div>
    <div class="takes">${[0, 1, 2].map(k => `<div class="tk" id="tkr${k}"><small>테이크 ${k + 1}</small><div class="wv">${Array.from({ length: 28 }, (_, i) => `<i style="height:${(12 + Math.abs(Math.sin(i * (1.1 + k * .3))) * 46).toFixed(0)}px"></i>`).join('')}</div><b id="tkb${k}">${k === 2 ? '남김' : '버림'}</b></div>`).join('')}</div>
    <div class="len"><div><small>원본</small><b>${mmss(src)}</b></div><i>→</i><div class="hot"><small>완성</small><b>${mmss(edl.total)}</b></div></div></div>`)}
${h.scr('b4', h.bg(3), `${h.hdr(3, '대본 그대로')}
  <div class="card light pad"><i class="skel"></i><div class="klab">대본 한 줄</div>
    <div class="sline" id="sline">자막은 대본 그대로 붙고요.</div>
    <div class="chunks">${['자막은', '대본 그대로', '붙고요.'].map((w, k) => `<span class="ck2" id="cp${k}">${w}</span>`).join('')}</div>
    <div class="tl3"><i></i>${[0, 1, 2].map(k => `<u id="cm${k}" style="left:${8 + k * 30}%"></u>`).join('')}</div></div>`)}
${h.scr('b5', h.bg(4), `${h.hdr(4, '레퍼런스')}
  <div class="card dark pad"><i class="skel"></i>
    <div class="dg"><div class="ph5" id="ph5"><i class="scan" id="scan5"></i></div><div class="tiles5">${Array.from({ length: 48 }, (_, i) => `<i id="t5_${i}"></i>`).join('')}</div></div>
    <div class="st3">
      <div id="st0"><b>${h.wheel('w103', '103')}</b><small>장 (0.5초마다)</small></div>
      <div id="st1"><b>${h.wheel('w16', '1.6')}</b><small>초마다 화면 전환</small></div>
      <div id="st2"><b>${h.wheel('w12', '12')}</b><small>% 얼굴만</small></div></div></div>`)}
${h.scr('b6', h.bg(5), `${h.hdr(5, '이 영상')}
  <div class="card light pad"><i class="skel"></i>
    <div class="rc"><div class="rcol"><small>규칙 (레퍼런스)</small><b>1.6초</b><span>얼굴 12 · 분할 43 · 그래픽 45</span></div><i class="arr" id="arr">→</i>
      <div class="rcol hot" id="mine"><small>지금 이 영상</small><b>${mean}초</b><span>얼굴 ${share('F')} · 분할 ${share('S')} · 그래픽 ${share('G')}</span></div></div>
    <div class="mini" id="mini">${SH.map(s => `<i class="p${s.pose}" style="flex:${(s.b - s.a).toFixed(2)}"></i>`).join('')}</div>
    <div class="mnote">장면 ${SH.length}개 · 같은 전환 연속 <b>${ctx.MSTAT.repeatsInRow}번</b></div></div>`)}
${h.scr('b7', h.bg(6), `${h.hdr(6, '정직하게')}
  <div class="card dark pad"><i class="skel"></i>
    <div class="cols2"><div class="cl2" id="col0"><small>자동</small>${['컷 편집', '자막', '장면 배치', '전환', '효과음'].map(s => `<span>${s}</span>`).join('')}</div>
      <div class="cl2 me" id="col1"><small>클로드에게 시킴</small><span>문장별 화면 내용</span></div></div></div>`)}
${h.scr('b8', h.bg(7), `${h.hdr(7, '댓글로 받기')}
  <div class="card light pad"><i class="skel"></i>
    <div class="kitbox" id="kitbox"><small>아이프터나우 키트</small><b>자동편집 키트</b>
      ${['편집 스크립트', '설치 방법', '프롬프트 4종'].map((s, k) => `<div class="ki" id="ki${k}"><div class="lot kchk" id="kc${k}"></div><span>${s}</span></div>`).join('')}</div>
    <div class="cin3"><span id="ctx8"></span><i class="caret"></i><div class="csend3" id="csend8">게시</div></div><b class="cheart" id="cheart8">♥</b></div>`)}
`;
  },

  hud: X => ({ label: '자동 편집', items: [['컷', X.takes], ['자막', X.subs], ['해부', X.c6k], ['적용', X.rule], ['키트', X.kit2]] }),
  chapters: [[5, '05', '진짜는'], [9, '07', '솔직히'], [10, '08', '키트']],
  seam: { beat: 'b6', icon: '✓', text: '이 영상 = 규칙 그대로', value: '적용' },
  cover: { tag: '아이프터나우', lines: ['편집 프로그램,', '한 번도 안 열었어요'], sub: '댓글에 자동편집 → 키트', hold: 1.4 },
  css: 'styles/beats.css',

  sfx: (add, X, ctx) => {
    [0, 1, 2].forEach(k => add(X.open + .1 + k * .18, 'stamp', .3)); add(X.open + .8, 'confirm', .3);
    add(X.input, 'pop', .3); add(X.input + .3, 'pop', .3); [0, 1, 2, 3].forEach(k => add(X.cc + .2 + k * .35, 'type', .25));
    add(X.takes + .3, 'snip', .3); add(X.last + .1, 'confirm', .3); add(X.gap + .2, 'wipe', .25); add(X.len + .1, 'hit', .3);
    [0, 1, 2].forEach(k => add(X.subs + .4 + k * .3, 'pop', .26));
    add(X.slice, 'rise', .2); add(X.often + .1, 'tick', .3); add(X.face + .1, 'tick', .3); add(X.num + .1, 'hit', .3);
    add(X.mine + .1, 'zoom', .26); add(X.now + .1, 'lock', .4);
    add(X.each, 'pop', .3);
    [0, 1, 2].forEach(k => add(X.kit2 + k * .3, 'confirm', .28)); add(X.follow + .6, 'type', .3); add(X.follow + .9, 'type', .3); add(X.send, 'cut', .35); add(X.send + .15, 'pop', .3);
  },

  script: X => `
// ---- b1: three editing apps appear and each gets a 0회 stamp; the single terminal tile lights
{const [a,b]=B.b1;QA('.ap').forEach((e,k)=>tl.fromTo(e,{opacity:0,y:30},fi(a+.1+k*.12,{opacity:1,y:0,duration:.3,ease:'power3.out'}),a+.1+k*.12));
 [0,1,2].forEach(k=>tl.fromTo('#apx'+k,{opacity:0,scale:1.8},fi(X.open+.1+k*.18,{opacity:1,scale:1,duration:.2,ease:'power4.in'}),X.open+.1+k*.18));
 QA('.ap').forEach((e,k)=>tl.to(e,{filter:'grayscale(1)',opacity:.45,duration:.2},X.open+.2+k*.18));
 tl.fromTo('#termtile',{opacity:0,scale:.85},fi(X.open+.8,{opacity:1,scale:1,...POP}),X.open+.8);}
// ---- b2: inputs drop in, the four real commands run one by one, the real ASR repo card slides in
{const [a,b]=B.b2;[0,1].forEach(k=>tl.fromTo('#inp'+k,{opacity:0,y:-30},fi(X.input+k*.3,{opacity:1,y:0,...POP}),X.input+k*.3));
 [0,1,2,3].forEach(k=>{const t=X.cc+.2+k*.35;tl.fromTo('#tl'+k,{opacity:0,x:-20},fi(t,{opacity:1,x:0,duration:.2}),t);tl.fromTo('#tk'+k,{opacity:0},fi(t+.25,{opacity:1,duration:.1}),t+.25)});
 tl.fromTo('#proof',{opacity:0,y:40},fi(b-1.1,{opacity:1,y:0,...IN}),b-1.1);}
// ---- b3: three takes; the first two are crossed out, the last is kept; then the length card
{const [a,b]=B.b3;QA('.tk').forEach((e,k)=>tl.fromTo(e,{opacity:0,x:-30},fi(a+.1+k*.15,{opacity:1,x:0,duration:.25}),a+.1+k*.15));
 [0,1].forEach(k=>{tl.to('#tkr'+k,{opacity:.35,duration:.2},X.takes+.3+k*.2);tl.fromTo('#tkb'+k,{opacity:0,scale:1.6},fi(X.takes+.3+k*.2,{opacity:1,scale:1,duration:.2}),X.takes+.3+k*.2)});
 tl.fromTo('#tkb2',{opacity:0,scale:.6},fi(X.last+.1,{opacity:1,scale:1,...POP}),X.last+.1);tl.to('#tkr2',{borderColor:'#F4C542',duration:.15},X.last+.1);
 QA('#tkr2 .wv i').forEach((e,i)=>{if(i%4===3)tl.to(e,{scaleY:0,duration:.2},X.gap+.2+i*.01)});
 tl.set('.len',{opacity:0},0);tl.fromTo('.len',{opacity:0,y:30},fi(X.len,{opacity:1,y:0,...IN}),X.len);}
// ---- b4: the script line splits into caption chunks that drop onto the timeline
{const [a,b]=B.b4;tl.fromTo('#sline',{opacity:0,y:20},fi(a+.1,{opacity:1,y:0,...IN}),a+.1);
 [0,1,2].forEach(k=>{const t=X.subs+.4+k*.3;tl.fromTo('#cp'+k,{opacity:0,y:-40},fi(t,{opacity:1,y:0,...POP}),t);tl.fromTo('#cm'+k,{scaleY:0},fi(t,{scaleY:1,duration:.15}),t)});
 tl.to('#sline',{opacity:.3,duration:.3},X.subs+.4);}
// ---- b5: a scan runs down the phone, frames fill in order, the three measured numbers roll
{const [a,b]=B.b5;tl.fromTo('#scan5',{y:0},fi(X.slice,{y:430,duration:X.often-X.slice,ease:'none'}),X.slice);
 QA('.tiles5 i').forEach((e,i)=>tl.to(e,{backgroundColor:i%7===0?'#F4C542':'#ffffff55',duration:.05},X.slice+(X.often-X.slice)*i/48));
 tl.set('#st0,#st1,#st2',{opacity:0},0);[['#st0',X.slice+.6,'#w103'],['#st1',X.often+.1,'#w16'],['#st2',X.face+.1,'#w12']].forEach(([s,t,w])=>{tl.to(s,{opacity:1,duration:.15},t);wheelOn(w,t+.05)});}
// ---- b6: rules card → this video's own numbers; the mini timeline of all shots draws in
{const [a,b]=B.b6;tl.set('#mine,#arr',{opacity:0},0);tl.fromTo('#arr',{opacity:0,x:-20},fi(X.mine,{opacity:1,x:0,duration:.25}),X.mine);
 tl.fromTo('#mine',{opacity:0,scale:.85},fi(X.mine+.1,{opacity:1,scale:1,...POP}),X.mine+.1);
 QA('#mini i').forEach((e,i,arr)=>tl.fromTo(e,{scaleY:0},fi(X.now+i*(.9/arr.length),{scaleY:1,duration:.12}),X.now+i*(.9/arr.length)));}
// ---- b7: automatic column, then the one thing Claude was asked to do
{const [a,b]=B.b7;tl.fromTo('#col0',{opacity:0,x:-40},fi(a+.1,{opacity:1,x:0,...IN}),a+.1);QA('#col0 span').forEach((e,k)=>tl.fromTo(e,{opacity:0},fi(a+.2+k*.1,{opacity:1,duration:.15}),a+.2+k*.1));
 tl.fromTo('#col1',{opacity:0,x:40},fi(X.each,{opacity:1,x:0,...POP}),X.each);}
// ---- b8: kit box fills with three checks, then the keyword is typed and sent
{const [a,b]=B.b8;tl.fromTo('#kitbox',{opacity:0,y:30},fi(a+.1,{opacity:1,y:0,...IN}),a+.1);
 [0,1,2].forEach(k=>{const t=X.kit2+k*.3;tl.fromTo('#ki'+k,{opacity:.3},fi(t,{opacity:1,duration:.15}),t);lotPlay(lot('#kc'+k,'check'),'#kc'+k,t,t+1,44)});
 typeTxt('#ctx8','자동편집',X.follow+.5,.6);tl.fromTo('#csend8',{scale:1},fi(X.send,{scale:.88,duration:.07,yoyo:true,repeat:1}),X.send);
 tl.fromTo('#cheart8',{opacity:0,y:0,scale:.6},fi(X.send+.15,{opacity:1,y:-160,scale:1.2,duration:.5,ease:'power2.out'}),X.send+.15);tl.to('#cheart8',{opacity:0,duration:.15},X.send+.6);}
`,
};
