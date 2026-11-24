import { FX, draw, actIndex, FINISHES, setFinish } from './main.js';
import { LABELS } from './config.js';

const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const easeIO = x => x < 0 ? 0 : x > 1 ? 1 : (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const DUR = 10, N = LABELS.length, pad = n => String(n).padStart(2, '0');
window.FX = FX; // handy for debugging in the console
const sc = $('#sc'), tt = $('#tt'), pp = $('#pp');

let lastAct = -2, lastInt = 0, tour = null, snd = false;
const ob = FX.orbit;
let mode = 'reveal', playing = true, t0 = performance.now(), last = t0, dragging = false, curChap = -1;

/* ---------- 3D spec cards (one per HUD callout) ---------- */
const cardsEl = $('#cards');
cardsEl.innerHTML = LABELS.map((L, i) => `
  <button class="card" data-i="${i}" aria-label="${L.title}">
    <span class="float"><span class="face">
      <span class="num">${pad(i + 1)}</span>
      <h3 class="ln" style="--d:0">${L.title}</h3>
      <p class="ln" style="--d:1">${L.sub}</p>
      <p class="meta ln" style="--d:2">${L.meta}</p>
    </span></span>
  </button>`).join('');
const cards = $$('.card');
cards.forEach((c, i) => {
  const f = c.querySelector('.face');
  c.addEventListener('pointermove', e => {
    const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    f.style.setProperty('--ry', ((x - .5) * 28).toFixed(1) + 'deg');
    f.style.setProperty('--rx', ((.5 - y) * 22).toFixed(1) + 'deg');
    f.style.setProperty('--gx', (x * 100).toFixed(0) + '%');
    f.style.setProperty('--gy', (y * 100).toFixed(0) + '%');
    c.classList.add('hot');
  });
  c.addEventListener('pointerleave', () => {
    c.classList.remove('hot');
    f.style.setProperty('--rx', '0deg'); f.style.setProperty('--ry', '0deg');
  });
  c.addEventListener('click', () => {
    tourStop(); if (mode === 'free') setMode('focus');
    if (mode === 'scroll') window.scrollTo({ top: (i + 1) * innerHeight, behavior: 'smooth' });
    else FX.target = i + 1;
  });
});
function setActive(i) {
  cards.forEach((c, j) => c.classList.toggle('active', j === i));
  const el = $('.card.active');
  if (el && mode === 'focus' && matchMedia('(max-width:900px),(max-height:640px)').matches)
    el.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
}

/* ---------- focus-frame slider ---------- */
const fsr = $('#fsr'), fsName = $('#fsName'), fsNum = $('#fsNum');
$('#ticks').innerHTML = ['◎', ...LABELS.map((_, i) => i + 1)].map((l, v) => `<button data-v="${v}">${l}</button>`).join('');
$$('#ticks button').forEach(b => b.onclick = () => { if (mode === 'focus') { tourStop(); FX.target = +b.dataset.v; } });
fsr.addEventListener('pointerdown', () => { dragging = true; tourStop(); });
fsr.addEventListener('input', () => { if (mode === 'focus') FX.target = +fsr.value; });
fsr.addEventListener('change', () => { dragging = false; const v = +fsr.value; FX.target = v < .5 ? 0 : Math.min(N, Math.round(v)); });
addEventListener('pointerup', () => { if (dragging) { dragging = false; const v = +fsr.value; FX.target = v < .5 ? 0 : Math.min(N, Math.round(v)); } });
addEventListener('keydown', e => {
  if (mode !== 'focus') return;
  if (e.key.startsWith('Arrow') || e.key === 'Escape') tourStop();
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') FX.target = Math.min(N, Math.round(FX.target) + 1);
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') FX.target = Math.max(0, Math.round(FX.target) - 1);
  else if (e.key === 'Escape') FX.target = 0;
  else return;
  e.preventDefault();
});

/* ---------- scroll demo chapters ---------- */
const CH = [
  { kick: 'SCROLL TO REVEAL', lines: ['Meet the', 'controller.'], sub: 'Rendered live in your browser. It moves as you scroll.' },
  ...LABELS.map((L, i) => ({ kick: `${pad(i + 1)} / ${pad(N)}`, lines: [L.title], sub: L.sub, meta: L.meta })),
  { kick: '360°', lines: ['Every angle.', 'Every reflection.'], sub: 'Keep scrolling. You control the spin.' },
  { kick: 'THE END', lines: ['Built to', 'be felt.'], sub: '', cta: true },
];
const LAST = CH.length - 1, SPIN_CH = N + 1;
$('#scroller').innerHTML = CH.map((c, i) => {
  let d = 0; const ln = (cls, txt) => `<span class="ln ${cls}" style="--d:${d++}">${txt}</span>`;
  return `<section class="chap" data-i="${i}"><div class="txt">
    ${ln('kick', c.kick)}<h2>${c.lines.map(l => ln('', l)).join('')}</h2>
    ${c.sub ? ln('sub', c.sub) : ''}${c.meta ? ln('meta', c.meta) : ''}
    ${c.cta ? `<div class="ln cta" style="--d:${d++}"><button data-go="top">↑ Replay</button><button data-go="focus">Explore parts →</button></div>` : ''}
  </div></section>`;
}).join('');
const chaps = $$('.chap');
$('#rail').innerHTML = CH.map((_, i) => `<button data-i="${i}" aria-label="Section ${i + 1}"></button>`).join('');
const dots = $$('#rail button');
dots.forEach(d => d.onclick = () => window.scrollTo({ top: +d.dataset.i * innerHeight, behavior: 'smooth' }));
$('#scroller').addEventListener('click', e => {
  const g = e.target.closest('[data-go]'); if (!g) return;
  if (g.dataset.go === 'top') window.scrollTo({ top: 0, behavior: 'smooth' }); else setMode('focus');
});
const setVh = () => document.documentElement.style.setProperty('--vh', innerHeight + 'px');
setVh(); addEventListener('resize', setVh);

/* ---------- modes ---------- */
function setMode(m) {
  const prev = mode; mode = m;
  document.body.dataset.mode = m;
  document.documentElement.classList.toggle('sm', m === 'scroll');
  $$('#modes button').forEach(b => b.classList.toggle('on', b.dataset.m === m));
  FX.on = m !== 'reveal'; curChap = -1; tourStop();
  if (m === 'reveal' || m === 'scroll') Object.assign(ob, { yaw: 0, pitch: 0, zoom: 1, vy: 0 });
  if (m === 'reveal') {
    FX.v = FX.target = 0; FX.ht = null; FX.act = -1; setActive(-1);
    playing = true; t0 = performance.now() - (+sc.value) * 1000; pp.textContent = 'Pause';
  } else if (m === 'focus') {
    scrollTo(0, 0); FX.pt = 3.6; FX.ht = 99;
    if (prev === 'reveal') FX.v = 0; FX.target = FX.target > 0 ? FX.target : 1;
  } else if (m === 'free') {
    scrollTo(0, 0); FX.pt = 3.6; FX.ht = 99; FX.v = FX.target = 0; lastInt = performance.now();
  } else { // scroll
    scrollTo(0, 0); FX.pt = 1; FX.v = FX.target = 0; FX.ht = null;
  }
  history.replaceState(null, '', m === 'reveal' ? location.pathname : '#' + m);
}
$$('#modes button').forEach(b => b.onclick = () => setMode(b.dataset.m));

/* scroll position -> timeline time + focus target. s = scrollY / viewport height (0 … N+2) */
function scrollMap(s) {
  if (s < .6) return { t: 1 + s / .6 * 2.6, v: s >= .5 ? 1 : 0, ht: 'tl' };            // intro: scrub the reveal
  if (s < N + .5) return { t: 3.6, v: clamp(Math.round(s), 1, N), ht: 99 };           // one part per screen
  if (s < N + 1.5) return { t: 3.6 + (s - N - .5) * 5, v: 0, ht: 99 };                // scroll = 360° spin
  return { t: 8.6 + (s - N - 1.5) * 1.2, v: 0, ht: 99 };                              // settle + outro
}


/* =====================================================================
   ADVANCED FEATURES (live page only – never part of the MP4 render)
   ===================================================================== */

/* ---------- free orbit: drag to rotate (with inertia), wheel / pinch to zoom, idle auto-rotate ---------- */
const wrap = $('#wrap'), pts = new Map();
let drag = null, pinch = 0;
wrap.addEventListener('pointerdown', e => {
  if (mode !== 'free') return;
  pts.set(e.pointerId, e); wrap.setPointerCapture(e.pointerId); wrap.classList.add('grab');
  drag = { x: e.clientX, y: e.clientY }; lastInt = performance.now(); tourStop();
  if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); }
});
wrap.addEventListener('pointermove', e => {
  if (!drag || !pts.has(e.pointerId)) return;
  pts.set(e.pointerId, e); lastInt = performance.now();
  if (pts.size === 2) { // two-finger pinch zoom
    const [a, b] = [...pts.values()], d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    if (pinch) ob.zoom = clamp(ob.zoom * d / pinch, .7, 2.4); pinch = d; return;
  }
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
  ob.yaw += dx * .008; ob.pitch = clamp(ob.pitch + dy * .005, -.7, .7); ob.vy = dx * .008 * 60;
});
const endDrag = e => { pts.delete(e.pointerId); pinch = 0; if (!pts.size) { drag = null; wrap.classList.remove('grab'); } };
wrap.addEventListener('pointerup', endDrag); wrap.addEventListener('pointercancel', endDrag);
wrap.addEventListener('wheel', e => {
  if (mode !== 'free') return; e.preventDefault(); lastInt = performance.now(); tourStop();
  ob.zoom = clamp(ob.zoom * Math.exp(-e.deltaY * .0015), .7, 2.4);
}, { passive: false });
function stepOrbit(dt) {
  if (mode !== 'free' || (tour && tour.k === 6)) return;
  if (!drag) {
    ob.yaw += ob.vy * dt; ob.vy *= Math.exp(-dt * 2.5);                       // inertia
    ob.pitch *= Math.exp(-dt * .5);                                           // settle level
    if (performance.now() - lastInt > 3500 && !FX.pad && !tour) ob.yaw += dt * .35; // idle turntable
  }
}
const resetView = () => { tourStop(); Object.assign(ob, { yaw: Math.round(ob.yaw / (Math.PI * 2)) * Math.PI * 2, pitch: 0, zoom: 1, vy: 0 }); };

/* ---------- finishes ---------- */
$('#swatches').innerHTML = Object.entries(FINISHES).map(([id, f]) =>
  `<button data-f="${id}" title="${f.name}" style="background:#${f.shell.toString(16).padStart(6, '0')}"></button>`).join('');
const sw = $$('#swatches button');
const pickFinish = id => { setFinish(id); sw.forEach(b => b.classList.toggle('on', b.dataset.f === id)); try { localStorage.setItem('cr-finish', id); } catch (e) {} };
sw.forEach(b => b.onclick = () => pickFinish(b.dataset.f));
{ let id = 'arctic'; try { id = localStorage.getItem('cr-finish') || id; } catch (e) {} pickFinish(FINISHES[id] ? id : 'arctic'); }

/* ---------- auto tour: visits each part, then a full 360° spin, then loops ---------- */
const tourBtn = $('#tourBtn'), HOLD = 3.2, SPIN = 5;
function tourStart() {
  if (mode === 'reveal' || mode === 'scroll') setMode('focus');
  if (mode === 'free') Object.assign(ob, { zoom: 1, pitch: 0, vy: 0 });
  tour = { k: 0, t: 0, base: ob.yaw, prevMode: mode }; FX.target = 1; tourBtn.classList.add('on'); tourBtn.innerHTML = '&#9632; Stop';
}
function tourStop() { if (!tour) return; tour = null; tourBtn.classList.remove('on'); tourBtn.innerHTML = '&#9654; Tour'; }
function stepTour(dt) {
  if (!tour) return; tour.t += dt;
  if (tour.k < N) { if (tour.t > HOLD) { tour.k++; tour.t = 0; FX.target = tour.k < N ? tour.k + 1 : 0; tour.base = ob.yaw; } }
  else if (tour.k === N) { // full turn from wherever the yaw currently is
    ob.yaw = tour.base + Math.PI * 2 * easeIO(tour.t / SPIN);
    if (tour.t > SPIN) { tour.k = 0; tour.t = 0; ob.yaw = tour.base; FX.target = 1; }
  }
}
tourBtn.onclick = () => tour ? tourStop() : tourStart();

/* ---------- sound: soundtrack synced to the reveal + synthesised UI blips ---------- */
const aud = new Audio('/audio.wav'); aud.loop = true; aud.preload = 'auto';
const sndBtn = $('#sndBtn'); let ac = null;
function toggleSound() {
  snd = !snd; sndBtn.classList.toggle('on', snd);
  if (snd && !ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
  if (ac && ac.state === 'suspended') ac.resume();
  if (!snd) aud.pause();
}
function blip(f) {
  if (!ac) return; const o = ac.createOscillator(), g = ac.createGain(), n = ac.currentTime;
  o.type = 'sine'; o.frequency.setValueAtTime(f, n); o.frequency.exponentialRampToValueAtTime(f * 1.8, n + .09);
  g.gain.setValueAtTime(.0001, n); g.gain.exponentialRampToValueAtTime(.07, n + .01); g.gain.exponentialRampToValueAtTime(.0001, n + .2);
  o.connect(g).connect(ac.destination); o.start(n); o.stop(n + .22);
}
function stepAudio(t) {
  if (snd && mode === 'reveal' && playing) {
    if (aud.paused) aud.play().catch(() => {});
    const d = Math.abs(aud.currentTime - t); if (d > .25 && d < DUR - .25) aud.currentTime = t;
  } else if (!aud.paused) aud.pause();
}
sndBtn.onclick = toggleSound;
pp.addEventListener('click', () => { if (!playing) aud.pause(); });

/* ---------- screenshot ---------- */
function shot() {
  const cv = $('#c'); cv.toBlob(b => {
    if (!b) return; const a = document.createElement('a'); a.href = URL.createObjectURL(b);
    a.download = `controller-reveal-${Date.now()}.png`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  });
  const f = $('#snap'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
}
$('#shotBtn').onclick = shot;

/* ---------- gamepad: plug a real controller in and the 3D model mirrors it live ---------- */
let padIdx = -1; const padBadge = $('#padBadge');
addEventListener('gamepadconnected', e => { padIdx = e.gamepad.index; padBadge.classList.add('on'); padBadge.textContent = 'GAMEPAD LIVE · ' + e.gamepad.id.slice(0, 22).toUpperCase(); });
addEventListener('gamepaddisconnected', e => { if (e.gamepad.index === padIdx) { padIdx = -1; FX.pad = null; padBadge.classList.remove('on'); } });
let padStart = false;
function pollPad() {
  const gp = padIdx >= 0 && navigator.getGamepads ? navigator.getGamepads()[padIdx] : null;
  if (!gp) { FX.pad = null; return; }
  const dz = v => Math.abs(v) < .08 ? 0 : v;
  FX.pad = { a: [0, 1, 2, 3].map(i => dz(gp.axes[i] || 0)), b: gp.buttons.map(x => x.value) };
  const st = !!(gp.buttons[9] && gp.buttons[9].pressed); // Start toggles the tour
  if (st && !padStart) tour ? tourStop() : tourStart(); padStart = st;
}

/* ---------- hotkeys ---------- */
addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (k === 's') shot();
  else if (k === 'm') toggleSound();
  else if (k === 't') tour ? tourStop() : tourStart();
  else if (k === 'r') resetView();
  else if (k === 'f') { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.(); }
  else if (/^[0-6]$/.test(k) && (mode === 'focus' || mode === 'free')) { tourStop(); if (mode === 'free') setMode('focus'); FX.target = +k; }
  else return;
  e.preventDefault();
});

/* ---------- reveal-mode player ---------- */
pp.onclick = () => { playing = !playing; pp.textContent = playing ? 'Pause' : 'Play'; if (playing) t0 = performance.now() - (+sc.value) * 1000; };
sc.oninput = () => { playing = false; pp.textContent = 'Play'; };

/* ---------- main loop ---------- */
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  let t;
  if (mode === 'reveal') {
    if (playing) sc.value = ((now - t0) / 1000) % DUR;
    t = +sc.value; FX.ht = null; tt.textContent = t.toFixed(1) + 's';
  } else {
    FX.idle += dt;
    let tgt = 3.6;
    if (mode === 'scroll') {
      const s = scrollY / innerHeight, m = scrollMap(s);
      tgt = m.t; FX.target = m.v; FX.ht = m.ht === 'tl' ? FX.pt : m.ht;
      const cur = clamp(Math.round(s), 0, LAST);
      if (cur !== curChap) {
        curChap = cur;
        chaps.forEach((c, i) => c.classList.toggle('on', i === cur));
        dots.forEach((d, i) => d.classList.toggle('on', i === cur));
        $('#hint').classList.toggle('off', cur !== 0);
      }
    }
    FX.pt += (tgt - FX.pt) * (1 - Math.exp(-dt * (mode === 'scroll' ? 10 : 6)));
    t = FX.pt;
    const d = FX.target - FX.v;
    FX.v = Math.abs(d) < .001 ? FX.target : FX.v + d * (1 - Math.exp(-dt * (dragging ? 14 : 5)));
    if (!dragging) fsr.value = FX.v;
  }
  const a = actIndex(FX.on ? FX.v : 0);
  if (a !== FX.act) { FX.act = a; FX.lineT = 0; setActive(a); }
  FX.lineT += dt;
  if (a !== lastAct) { if (snd && mode !== 'reveal') blip(a < 0 ? 330 : 520 + a * 70); lastAct = a; }
  pollPad(); stepOrbit(dt); stepTour(dt); stepAudio(t);
  draw(t);
  if (FX.on) {
    fsName.textContent = a < 0 ? 'OVERVIEW' : LABELS[a].title;
    fsNum.textContent = `${pad(a + 1)}/${pad(N)}`;
  }
  if (!manual) requestAnimationFrame(frame);
}
const manual = /manual/.test(location.search); // ?manual -> no auto loop; call __frame(ms) yourself (for tests)
window.__frame = frame;
if (!window.__render) {
  const h = location.hash.slice(1);
  if (h === 'focus' || h === 'scroll' || h === 'free') setMode(h);
  if (!manual) requestAnimationFrame(frame);
}
