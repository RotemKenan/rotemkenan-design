// Interactive 2D plan: venue lines + furniture, drag / rotate / duplicate / delete.
import { state, emit, itemOf, newId, isRound, VIEWER } from './state.js';
import { seatsOf } from './match.js';
import { venueBounds, visibleSegments, footprint, itemOutline } from './dxf.js';

const canvas = document.getElementById('planCanvas');
const ctx = canvas.getContext('2d');
const view = { scale: 0.3, ox: 40, oy: 40 }; // screen = world*scale + offset (y flipped)
let drag = null;

const toScreen = (x, y) => ({ x: x * view.scale + view.ox, y: canvas.height / dpr() - (y * view.scale + view.oy) });
const toWorld = (sx, sy) => ({ x: (sx - view.ox) / view.scale, y: (canvas.height / dpr() - sy - view.oy) / view.scale });
const dpr = () => window.devicePixelRatio || 1;

export function resize() {
  const r = canvas.getBoundingClientRect();
  if (!r.width) return;
  canvas.width = r.width * dpr(); canvas.height = r.height * dpr();
  draw();
}

export function fit() {
  const r = canvas.getBoundingClientRect();
  if (!r.width) return;
  const b = state.venue ? venueBounds(state.venue) : { minX: 0, minY: 0, maxX: 2000, maxY: 1500 };
  const w = b.maxX - b.minX, h = b.maxY - b.minY;
  view.scale = Math.min((r.width - 150) / w, (r.height - 170) / h); // room for the dimension lines
  view.ox = (r.width - w * view.scale) / 2 - b.minX * view.scale;
  view.oy = (r.height - h * view.scale) / 2 - b.minY * view.scale + 30;
  draw();
}

export function draw(clean = false) {
  const k = dpr();
  ctx.setTransform(k, 0, 0, k, 0, 0);
  const W = canvas.width / k, H = canvas.height / k;
  ctx.clearRect(0, 0, W, H);

  // 1m grid
  ctx.strokeStyle = '#f1ece6'; ctx.lineWidth = 1;
  const step = 100 * view.scale;
  if (step > 6) {
    for (let x = view.ox % step; x < W; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = (H - view.oy) % step; y < H; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  }

  // venue
  if (state.venue?.image && state.venue.layers?.PHOTO !== false) drawUnderlay(state.venue.image);
  ctx.strokeStyle = '#2f2a26'; ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (const s of visibleSegments(state.venue)) {
    const a = toScreen(s.x1, s.y1), b = toScreen(s.x2, s.y2);
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
  }
  ctx.stroke();

  if (state.venue && !state.venue.layers?.DIMENSIONS) drawOverallDims();
  for (const m of state.measures || []) drawMeasure(m.a, m.b, '#2f6f8f');

  // venue texts (dimensions, labels)
  for (const tx of state.venue?.texts || []) {
    if (state.venue.layers?.[tx.layer] === false) continue;
    const c = toScreen(tx.x, tx.y);
    ctx.save(); ctx.translate(c.x, c.y); ctx.rotate((-(tx.rot || 0) * Math.PI) / 180);
    ctx.fillStyle = '#5a1f2a'; ctx.font = `${Math.max(10, tx.h * view.scale)}px Assistant, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(tx.s, 0, 0); ctx.restore();
  }

  // furniture: floors first (dance floor, stage) so seating draws on top
  const bad = clean || VIEWER ? new Set() : overlaps(); // clients never see the overlap warnings
  const order = [...state.placed].sort((a, b) => (['danceFloor', 'stage'].includes(itemOf(b)?.kind) ? 1 : 0) - (['danceFloor', 'stage'].includes(itemOf(a)?.kind) ? 1 : 0));
  for (const p of order) {
    const it = itemOf(p); if (!it) continue;
    drawItem(p, it, state.selection.includes(p.id), bad.has(p.id));
  }
  if (!clean) drawOverlay();
  if (!clean) drawGhosts();
  if (!clean && document.getElementById('seatsToggle')?.checked) drawSeatBadges();

  // scale bar
  ctx.fillStyle = '#8a7f75'; ctx.font = '11px Inter';
  ctx.fillRect(16, 16, step, 3); ctx.fillText('1 m', 16, 32);
}

const underlayCache = new Map();
function drawUnderlay(im) {
  let img = underlayCache.get(im.src);
  if (!img) { img = new Image(); img.onload = () => draw(); img.src = im.src; underlayCache.set(im.src, img); }
  if (!img.complete) return;
  const a = toScreen(im.x || 0, (im.y || 0) + im.h), b = toScreen((im.x || 0) + im.w, im.y || 0);
  ctx.globalAlpha = im.opacity ?? 0.7; ctx.drawImage(img, a.x, a.y, b.x - a.x, b.y - a.y); ctx.globalAlpha = 1;
}

// A text note on the plan: words in a soft box, sized in cm so they scale with the plan
function drawNote(p, it, selected) {
  const c = toScreen(p.x, p.y), text = p.label || '…';
  const fs = it.d * 0.55 * view.scale;
  ctx.save(); ctx.translate(c.x, c.y); ctx.rotate((-p.rot * Math.PI) / 180);
  ctx.font = `600 ${fs}px Assistant, Inter, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const need = Math.round(ctx.measureText(text).width / view.scale + it.d * 0.6);
  if (Math.abs(need - it.w) > 2) it.w = need; // the box follows the text
  const w = it.w * view.scale, d = it.d * view.scale;
  ctx.fillStyle = it.color || 'rgba(255,255,255,.88)'; ctx.strokeStyle = selected ? '#b07a3e' : '#5a1f2a'; ctx.lineWidth = selected ? 2.5 : 1.2;
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-w / 2, -d / 2, w, d, d * 0.2) : ctx.rect(-w / 2, -d / 2, w, d); ctx.fill(); ctx.stroke();
  ctx.fillStyle = it.ink || '#5a1f2a'; ctx.fillText(text, 0, fs * 0.06);
  ctx.restore();
}
export function editNote(p) {
  const v = prompt(document.documentElement.lang === 'he' ? 'הטקסט שיופיע על התוכנית:' : 'Text to show on the plan:', p.label || '');
  if (v === null) return false;
  p.label = v.trim(); emit('placed'); return true;
}
canvas.addEventListener('dblclick', (e) => {
  if (VIEWER) return;
  const { sx, sy } = rel(e), w = toWorld(sx, sy), p = hit(w.x, w.y);
  if (p && itemOf(p)?.kind === 'note') editNote(p);
});

function drawItem(p, it, selected, clash) {
  if (it.kind === 'note') return drawNote(p, it, selected);
  const c = toScreen(p.x, p.y);
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate((-p.rot * Math.PI) / 180);
  const w = it.w * view.scale, d = it.d * view.scale;
  const round = isRound(it);

  // chairs
  if (it.seats > 0) {
    ctx.fillStyle = '#d9cfc3';
    const cs = 45 * view.scale;
    for (const ch of chairPositions(it)) {
      ctx.save(); ctx.translate(ch.x * view.scale, -ch.y * view.scale); ctx.rotate(-ch.a);
      ctx.fillRect(-cs / 2, -cs / 2, cs, cs); ctx.restore();
    }
  }

  ctx.fillStyle = it.color; ctx.strokeStyle = clash ? '#d23c2a' : selected ? '#b07a3e' : '#5a514a'; ctx.lineWidth = selected || clash ? 2.5 : 1;
  if (selected) { ctx.shadowColor = 'rgba(176,122,62,.55)'; ctx.shadowBlur = 10; }
  ctx.beginPath();
  if (it.kind === 'curvedSofa') curvedPath(ctx, it, view.scale);
  else if (round) ctx.arc(0, 0, w / 2, 0, Math.PI * 2); else ctx.rect(-w / 2, -d / 2, w, d);
  if (it.kind === 'danceFloor') ctx.setLineDash([6, 4]);
  ctx.fill(); ctx.stroke(); ctx.setLineDash([]); ctx.shadowBlur = 0;
  if (p.locked) { ctx.fillStyle = '#857a70'; ctx.font = '10px Inter'; ctx.fillText('🔒', w / 2 - 6, -d / 2 + 10); }
  if (it.invId) { // same detail lines as the DXF block
    ctx.lineWidth = 0.8; ctx.strokeStyle = selected ? '#b08d57' : 'rgba(255,255,255,.7)';
    ctx.beginPath();
    for (const e of itemOutline(it)) if (e.t === 'LINE') { ctx.moveTo(e.x1 * view.scale, -e.y1 * view.scale); ctx.lineTo(e.x2 * view.scale, -e.y2 * view.scale); }
    ctx.stroke();
  }

  if (view.scale > 0.15) {
    ctx.rotate((p.rot * Math.PI) / 180);
    ctx.font = `${Math.max(9, Math.min(13, 14 * view.scale * 3))}px Inter`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const label = p.label || (it.kind === 'roundTable' || it.kind === 'rectTable' ? String(tableNumber(p)) : '');
    if (!label) { ctx.restore(); return; }
    const [r, g, b] = [1, 3, 5].map((i) => parseInt((it.color || '#ffffff').slice(i, i + 2), 16) || 255);
    ctx.fillStyle = 0.2126 * r + 0.7152 * g + 0.0722 * b < 110 ? '#f3eee6' : '#2f2a26';
    ctx.fillText(label, 0, 0);
  }
  ctx.restore();
}

// Curved sofa: arc band, outer Ø = w, inner Ø = innerW. Like every seat, the back is at +y and it faces -y.
export function curvedGeom(it) {
  const R = it.w / 2, r = Math.min(R - 20, (it.innerW || it.w - 110) / 2);
  // How far the arc wraps follows the real depth: depth = R − r·cos(span) (outer back to the tips of the inner arc).
  const span = Math.acos(Math.max(-0.2, Math.min(0.95, (R - (it.d || R)) / r)));
  return { R, r, a0: Math.PI / 2 - span, a1: Math.PI / 2 + span, cy: it.d / 2 - R };
}
function curvedPath(c, it, k) {
  const g = curvedGeom(it);
  // canvas y is flipped relative to item space
  c.arc(0, -g.cy * k, g.R * k, -g.a1, -g.a0);
  c.arc(0, -g.cy * k, g.r * k, -g.a0, -g.a1, true);
  c.closePath();
}

function drawOverlay() {
  const sel = selection();
  if (sel.length === 1) { // rotate knob
    const it = itemOf(sel[0]); if (it) {
      const c = toScreen(sel[0].x, sel[0].y), h = rotateHandle(sel[0], it);
      ctx.strokeStyle = '#b07a3e'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(h.x, h.y); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(h.x, h.y, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#b07a3e'; ctx.font = '10px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('↻', h.x, h.y + 1);
    }
  }
  if (live && state.venue) { // distance to the nearest wall while dragging
    const it = itemOf(live), wd = it && wallDistance(live, it);
    if (wd && wd.d < 600) {
      const a = toScreen(wd.from.x, wd.from.y), b = toScreen(wd.to.x, wd.to.y);
      ctx.strokeStyle = '#2f6f8f'; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.setLineDash([]);
      label((a.x + b.x) / 2, (a.y + b.y) / 2, `${Math.round(wd.d)} cm`, '#2f6f8f');
    }
  }
  if (measuring) {
    const h = measuring.hover;
    if (h) { const H = toScreen(h.x, h.y); ctx.strokeStyle = '#2f6f8f'; ctx.beginPath(); ctx.arc(H.x, H.y, 5, 0, Math.PI * 2); ctx.stroke(); }
    if (measuring.a && h) drawMeasure(measuring.a, h, '#2f6f8f');
  }
  if (calib) {
    ctx.fillStyle = '#5a1f2a'; ctx.strokeStyle = '#5a1f2a'; ctx.lineWidth = 2;
    const pts = calib.pts.map((q) => toScreen(q.x, q.y));
    pts.forEach((q) => { ctx.beginPath(); ctx.arc(q.x, q.y, 6, 0, Math.PI * 2); ctx.fill(); });
    if (calibHover && pts.length === 1) { ctx.setLineDash([6, 4]); ctx.strokeRect(pts[0].x, pts[0].y, calibHover.x - pts[0].x, calibHover.y - pts[0].y); ctx.setLineDash([]); }
  }
  if (magnetLine && drag) {
    const it = itemOf(magnetLine);
    if (it) { ctx.save(); const c = toScreen(magnetLine.x, magnetLine.y); ctx.translate(c.x, c.y); ctx.rotate((-magnetLine.rot * Math.PI) / 180); ctx.strokeStyle = '#2f6f8f'; ctx.lineWidth = 2; ctx.setLineDash([5, 3]); ctx.strokeRect((-it.w / 2) * view.scale - 3, (-it.d / 2) * view.scale - 3, it.w * view.scale + 6, it.d * view.scale + 6); ctx.restore(); }
  }
  if (marquee) {
    const a = toScreen(marquee.x0, marquee.y0), b = toScreen(marquee.x1, marquee.y1);
    ctx.fillStyle = 'rgba(176,122,62,.08)'; ctx.strokeStyle = '#b07a3e'; ctx.setLineDash([5, 4]);
    ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y); ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y); ctx.setLineDash([]);
  }
  if (hover && !drag) { const it = itemOf(hover); if (it) { const c = toScreen(hover.x, hover.y); label(c.x, c.y - (Math.max(it.w, it.d) / 2) * view.scale - 14, `${tName(it)} · ${it.w}×${it.d}`, '#1b1918'); } }
}
// suggestion ghosts: see-through pieces with a dashed green outline; click one to place it
let ghosts = [];
export const setGhosts = (g) => { ghosts = g || []; draw(); };
function drawGhosts() {
  for (const g of ghosts) {
    ctx.save(); ctx.globalAlpha = 0.4; drawItem({ ...g, id: 'ghost' }, g.inv, false, false); ctx.restore();
    const P = footprint(g, g.inv).map((q) => toScreen(q.x, q.y));
    ctx.save(); ctx.strokeStyle = '#2e8b57'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
    ctx.beginPath(); P.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.closePath(); ctx.stroke(); ctx.restore();
    const c = toScreen(g.x, g.y);
    ctx.save(); ctx.fillStyle = '#2e8b57'; ctx.beginPath(); ctx.arc(c.x, c.y, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 11px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(`+${g.seats}`, c.x, c.y + 0.5); ctx.restore();
  }
}
function ghostAt(x, y) {
  for (let i = ghosts.length - 1; i >= 0; i--) { const g = ghosts[i], a = (-g.rot * Math.PI) / 180, dx = x - g.x, dy = y - g.y;
    const u = dx * Math.cos(a) - dy * Math.sin(a), v = dx * Math.sin(a) + dy * Math.cos(a);
    if (Math.abs(u) <= g.inv.w / 2 && Math.abs(v) <= g.inv.d / 2) return i; }
  return -1;
}
// seat-count badges: the number each piece adds to the seat total
function drawSeatBadges() {
  let total = 0;
  ctx.font = 'bold 12px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const p of state.placed) {
    const n = seatsOf(itemOf(p)); if (!n) continue; total += n;
    const c = toScreen(p.x, p.y), r = n > 9 ? 11 : 9;
    ctx.fillStyle = '#2f6f8f'; ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.fillText(String(n), c.x, c.y + 0.5);
  }
  ctx.font = 'bold 13px Inter'; const txt = `Σ ${total}`, w = ctx.measureText(txt).width + 16;
  ctx.fillStyle = '#2f6f8f'; ctx.fillRect(canvas.clientWidth - w - 16, 12, w, 24);
  ctx.fillStyle = '#fff'; ctx.fillText(txt, canvas.clientWidth - w / 2 - 16, 24);
}
function label(x, y, text, color) {
  ctx.font = '11px Inter'; const w = ctx.measureText(text).width + 10;
  ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.fillRect(x - w / 2, y - 9, w, 18);
  ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y);
}
export let tName = (it) => it.name;
export const setNamer = (fn) => (tName = fn);
function tableNumber(p) {
  const tables = state.placed.filter((q) => ['roundTable', 'rectTable'].includes(itemOf(q)?.kind));
  return tables.indexOf(p) + 1;
}

// Chair centres around a table in item-local coords (cm); a = angle of the chair's tangent (faces the table at a - π/2).
export function chairPositions(it) {
  const out = [], n = it.seats;
  if (!n || it.invId || it.photo) return out; // inventory tables come alone — chairs are placed as separate pieces
  if (isRound(it)) {
    const r = it.w / 2 + 25;
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; out.push({ x: Math.cos(a) * r, y: Math.sin(a) * r, a: a + Math.PI / 2 }); }
  } else if (n <= 4) { // head table: one long side, facing the room
    for (let i = 0; i < n; i++) out.push({ x: -it.w / 2 + ((i + 0.5) * it.w) / n, y: it.d / 2 + 25, a: Math.PI });
  } else {
    const ends = it.w > 300 ? 2 : 0;
    const perSide = Math.floor((n - ends) / 2);
    for (let i = 0; i < perSide; i++) {
      const x = -it.w / 2 + ((i + 0.5) * it.w) / perSide;
      out.push({ x, y: it.d / 2 + 25, a: Math.PI }, { x, y: -it.d / 2 - 25, a: 0 });
    }
    if (ends) out.push({ x: -it.w / 2 - 25, y: 0, a: -Math.PI / 2 }, { x: it.w / 2 + 25, y: 0, a: Math.PI / 2 });
  }
  return out;
}

function localPoint(p, wx, wy) {
  const a = (-p.rot * Math.PI) / 180, dx = wx - p.x, dy = wy - p.y;
  return { x: dx * Math.cos(a) - dy * Math.sin(a), y: dx * Math.sin(a) + dy * Math.cos(a) };
}
function hit(wx, wy) {
  for (let i = state.placed.length - 1; i >= 0; i--) {
    const p = state.placed[i], it = itemOf(p); if (!it) continue;
    const l = localPoint(p, wx, wy);
    if (Math.abs(l.x) <= it.w / 2 + 4 && Math.abs(l.y) <= it.d / 2 + 4) return p;
  }
  return null;
}

// ---------- geometry helpers: overlaps & wall distance ----------
const CHAIR_ZONE = 50;
function polyOf(p, it) {
  const extra = it.seats > 0 ? CHAIR_ZONE : 0;
  return footprint(p, { w: it.w + extra * 2, d: it.d + extra * 2 });
}
export function sat(A, B) {
  for (const P of [A, B]) for (let i = 0; i < P.length; i++) {
    const a = P[i], b = P[(i + 1) % P.length], nx = b.y - a.y, ny = a.x - b.x;
    const pr = (Q) => Q.map((q) => q.x * nx + q.y * ny);
    const pa = pr(A), pb = pr(B);
    if (Math.max(...pa) <= Math.min(...pb) + 0.5 || Math.max(...pb) <= Math.min(...pa) + 0.5) return false;
  }
  return true;
}
// A curved sofa is checked as 8 small blocks along its arc, so its open middle stays free (tables go there).
export function shapesOf(p, it) {
  if (it.kind !== 'curvedSofa') return [polyOf(p, it)];
  const g = curvedGeom(it), n = 8, a = (p.rot * Math.PI) / 180, out = [];
  for (let i = 0; i < n; i++) {
    const t0 = g.a0 + ((g.a1 - g.a0) * i) / n, t1 = g.a0 + ((g.a1 - g.a0) * (i + 1)) / n;
    const pts = [[g.r, t0], [g.R, t0], [g.R, t1], [g.r, t1]].map(([r, t]) => ({ x: r * Math.cos(t), y: g.cy + r * Math.sin(t) }));
    out.push(pts.map((q) => ({ x: p.x + q.x * Math.cos(a) - q.y * Math.sin(a), y: p.y + q.x * Math.sin(a) + q.y * Math.cos(a) })));
  }
  return out;
}
export function overlaps() {
  const bad = new Set(), list = state.placed.map((p) => ({ p, it: itemOf(p) })).filter((o) => o.it && o.it.kind !== 'danceFloor' && o.it.kind !== 'note');
  const shapes = list.map((o) => shapesOf(o.p, o.it));
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++)
    if (shapes[i].some((A) => shapes[j].some((B) => sat(A, B)))) { bad.add(list[i].p.id); bad.add(list[j].p.id); }
  return bad;
}
function wallDistance(p, it) {
  let best = null;
  const poly = footprint(p, it);
  for (const s of visibleSegments(state.venue)) {
    const dx = s.x2 - s.x1, dy = s.y2 - s.y1, L2 = dx * dx + dy * dy; if (L2 < 100) continue;
    for (const q of poly) {
      const t = Math.max(0, Math.min(1, ((q.x - s.x1) * dx + (q.y - s.y1) * dy) / L2));
      const ex = s.x1 + t * dx, ey = s.y1 + t * dy, dd = Math.hypot(q.x - ex, q.y - ey);
      if (!best || dd < best.d) best = { d: dd, from: q, to: { x: ex, y: ey } };
    }
  }
  return best;
}

// ---------- selection ----------
export const selection = () => state.placed.filter((p) => state.selection.includes(p.id));
function setSelection(ids) { state.selection = ids; state.selectedId = ids[ids.length - 1] || null; emit('select'); }

const snapOn = () => document.getElementById('snapToggle')?.checked;
const snap = (v) => (snapOn() ? Math.round(v / 10) * 10 : v);
const rel = (e) => { const r = canvas.getBoundingClientRect(); return { sx: e.clientX - r.left, sy: e.clientY - r.top }; };
// Page coordinates of a plan point (used by tests and tooltips).
export function clientAt(x, y) { const r = canvas.getBoundingClientRect(), s = toScreen(x, y); return { x: r.left + s.x, y: r.top + s.y }; }
export function worldAt(clientX, clientY) { const r = canvas.getBoundingClientRect(); return toWorld(clientX - r.left, clientY - r.top); }

function rotateHandle(p, it) { // screen position of the rotate knob above the selected item
  const c = toScreen(p.x, p.y), a = (p.rot * Math.PI) / 180, dist = (Math.max(it.w, it.d) / 2) * view.scale + 22;
  return { x: c.x - Math.sin(a) * dist, y: c.y - Math.cos(a) * dist };
}

let hover = null, marquee = null, live = null, magnetLine = null;

// Finds where piece p (item it) should click onto the nearest other piece: squared to its angle,
// touching one of its sides, centred or flush with an end. Returns { x, y, rot, line } or null.
const MAGNET = 30; // cm
function magnet(p, it, skip) {
  let best = null;
  for (const q of state.placed) {
    if (skip.has(q.id)) continue;
    const iq = itemOf(q); if (!iq || iq.kind === 'danceFloor' || iq.kind === 'curvedSofa') continue;
    if (Math.hypot(p.x - q.x, p.y - q.y) > (Math.max(it.w, it.d) + Math.max(iq.w, iq.d)) / 2 + MAGNET) continue;
    const turns = Math.round((p.rot - q.rot) / 90);
    const rot = ((q.rot + turns * 90) % 360 + 360) % 360, odd = Math.abs(turns) % 2 === 1;
    const pw = odd ? it.d : it.w, pd = odd ? it.w : it.d, qa = (-q.rot * Math.PI) / 180;
    const lx = (p.x - q.x) * Math.cos(qa) - (p.y - q.y) * Math.sin(qa), ly = (p.x - q.x) * Math.sin(qa) + (p.y - q.y) * Math.cos(qa);
    // Each axis on its own: snap any edge (or the centre) of p to any edge (or the centre) of q.
    const snapAxis = (v, ph, qh) => {
      let bestV = v, bd = MAGNET;
      for (const target of [-qh, qh]) for (const edge of [-ph, ph]) { const nv = target - edge, d = Math.abs(v - nv); if (d < bd) { bd = d; bestV = nv; } }
      if (Math.abs(v) < bd) bestV = 0;
      return bestV;
    };
    let cx = snapAxis(lx, pw / 2, iq.w / 2), cy = snapAxis(ly, pd / 2, iq.d / 2);
    // never overlap: if the pieces still cross, push out along the shallower side so they just touch
    const ox = (iq.w + pw) / 2 - Math.abs(cx), oy = (iq.d + pd) / 2 - Math.abs(cy);
    if (ox > 0.5 && oy > 0.5) { if (ox < oy) cx = Math.sign(cx || 1) * (iq.w + pw) / 2; else cy = Math.sign(cy || 1) * (iq.d + pd) / 2; }
    const cands = [{ lx: cx, ly: cy }];
    for (const c of cands) {
      const dist = Math.hypot(c.lx - lx, c.ly - ly);
      if (dist > MAGNET || (best && dist >= best.dist)) continue;
      const a = (q.rot * Math.PI) / 180;
      best = { dist, rot, x: q.x + c.lx * Math.cos(a) - c.ly * Math.sin(a), y: q.y + c.lx * Math.sin(a) + c.ly * Math.cos(a), line: q };
    }
  }
  return best;
}

// Room calibration: the user taps two points on the plan; cb receives both points (world cm).
let calib = null, calibHover = null;

// ---------- measuring ----------
let measuring = null; // { a?: point } while the measure tool is on
export const isMeasuring = () => !!measuring;
export function toggleMeasure(on = !measuring) { measuring = on ? {} : null; canvas.style.cursor = on ? 'crosshair' : 'grab'; draw(); return !!measuring; }
// Snap to a wall/door end point within ~12 px, so measurements start exactly at corners and openings.
function snapPoint(w, from, ortho) {
  let best = null, bd = 12 / view.scale;
  for (const s of visibleSegments(state.venue)) for (const q of [{ x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 }]) {
    const d = Math.hypot(q.x - w.x, q.y - w.y); if (d < bd) { bd = d; best = q; }
  }
  let p = best ? { ...best } : { ...w };
  if (ortho && from) { if (Math.abs(p.x - from.x) > Math.abs(p.y - from.y)) p.y = from.y; else p.x = from.x; }
  return p;
}
const fmtLen = (cm) => (cm >= 100 ? `${(cm / 100).toFixed(2)} m` : `${Math.round(cm)} cm`);
function drawMeasure(a, b, color) {
  const A = toScreen(a.x, a.y), B = toScreen(b.x, b.y), ang = Math.atan2(B.y - A.y, B.x - A.x), nx = -Math.sin(ang) * 6, ny = Math.cos(ang) * 6;
  ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y);
  ctx.moveTo(A.x - nx, A.y - ny); ctx.lineTo(A.x + nx, A.y + ny); ctx.moveTo(B.x - nx, B.y - ny); ctx.lineTo(B.x + nx, B.y + ny); ctx.stroke();
  label((A.x + B.x) / 2, (A.y + B.y) / 2 - 10, fmtLen(Math.hypot(b.x - a.x, b.y - a.y)), color);
}
function drawOverallDims() {
  // Room size from the walls only (door swings and units sticking out are not part of the room).
  const segs = visibleSegments(state.venue), walls = segs.filter((q) => /wall/i.test(q.layer));
  const use = walls.length ? walls : segs; if (!use.length) return;
  const b = use.reduce((o, q) => ({ minX: Math.min(o.minX, q.x1, q.x2), maxX: Math.max(o.maxX, q.x1, q.x2), minY: Math.min(o.minY, q.y1, q.y2), maxY: Math.max(o.maxY, q.y1, q.y2) }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
  const off = 70;
  drawMeasure({ x: b.minX, y: b.maxY + off }, { x: b.maxX, y: b.maxY + off }, '#5a1f2a');
  const A = toScreen(b.maxX + off, b.minY), B = toScreen(b.maxX + off, b.maxY);
  ctx.strokeStyle = '#5a1f2a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y);
  ctx.moveTo(A.x - 6, A.y); ctx.lineTo(A.x + 6, A.y); ctx.moveTo(B.x - 6, B.y); ctx.lineTo(B.x + 6, B.y); ctx.stroke();
  ctx.save(); ctx.translate(A.x + 14, (A.y + B.y) / 2); ctx.rotate(-Math.PI / 2); label(0, 0, fmtLen(b.maxY - b.minY), '#5a1f2a'); ctx.restore();
}
export function startCalibrate(cb) { calib = { pts: [], cb }; canvas.style.cursor = 'crosshair'; draw(); }

canvas.addEventListener('pointerdown', (e) => {
  const { sx, sy } = rel(e), w = toWorld(sx, sy);
  if (measuring) {
    const pt = snapPoint(w, measuring.a, e.shiftKey);
    if (!measuring.a) { measuring.a = pt; draw(); return; }
    (state.measures ||= []).push({ a: measuring.a, b: pt }); measuring = {}; emit('measure'); return;
  }
  if (calib) {
    calib.pts.push(w); draw();
    if (calib.pts.length === 2) { const [a, b] = calib.pts, cb = calib.cb; calib = null; canvas.style.cursor = 'grab'; setTimeout(() => cb(a, b), 30); }
    return;
  }
  canvas.setPointerCapture(e.pointerId);
  if (VIEWER || e.button === 1 || e.button === 2 || spaceDown) { drag = { mode: 'pan', sx: e.clientX, sy: e.clientY, ox: view.ox, oy: view.oy }; return; }
  const sel = selection();
  if (sel.length === 1) {
    const it = itemOf(sel[0]), h = rotateHandle(sel[0], it);
    if (Math.hypot(sx - h.x, sy - h.y) < 10) { drag = { mode: 'rotate', p: sel[0] }; return; }
  }
  const gi = ghosts.length ? ghostAt(w.x, w.y) : -1;
  if (gi >= 0) { const [g] = ghosts.splice(gi, 1); canvas.dispatchEvent(new CustomEvent('ghost-accept', { detail: [g] })); draw(); return; }
  const p = hit(w.x, w.y);
  if (p) {
    // Shift/Ctrl on a piece that is already selected: keep the group for dragging; it is only un-selected on a plain click (no drag)
    const toggleOff = (e.shiftKey || e.ctrlKey || e.metaKey) && state.selection.includes(p.id) ? p.id : null;
    if ((e.shiftKey || e.ctrlKey || e.metaKey) && !toggleOff) setSelection([...state.selection, p.id]);
    else if (!state.selection.includes(p.id)) setSelection([p.id]);
    if (p.locked) { drag = null; return; }
    drag = { mode: 'move', start: w, lead: p, toggleOff, items: selection().filter((q) => !q.locked).map((q) => ({ q, x: q.x, y: q.y, rot: q.rot })) };
  } else if (e.shiftKey) {
    marquee = { x0: w.x, y0: w.y, x1: w.x, y1: w.y }; drag = { mode: 'marquee' };
  } else {
    if (state.selection.length) setSelection([]);
    drag = { mode: 'pan', sx: e.clientX, sy: e.clientY, ox: view.ox, oy: view.oy };
  }
  canvas.style.cursor = 'grabbing';
});
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('pointermove', (e) => {
  const { sx, sy } = rel(e), w = toWorld(sx, sy);
  if (calib) { calibHover = { x: sx, y: sy }; draw(); return; }
  if (measuring) { measuring.hover = snapPoint(w, measuring.a, e.shiftKey); draw(); return; }
  if (!drag) {
    const h = hit(w.x, w.y);
    if (h !== hover) { hover = h; draw(); }
    canvas.style.cursor = h ? (h.locked ? 'not-allowed' : 'move') : 'grab';
    return;
  }
  if (drag.mode === 'pan') { view.ox = drag.ox + (e.clientX - drag.sx); view.oy = drag.oy - (e.clientY - drag.sy); draw(); return; }
  if (drag.mode === 'marquee') { marquee.x1 = w.x; marquee.y1 = w.y; draw(); return; }
  if (drag.mode === 'rotate') {
    const c = drag.p, ang = (Math.atan2(-(w.x - c.x), w.y - c.y) * 180) / Math.PI;
    c.rot = ((e.altKey ? Math.round(ang) : Math.round(ang / 15) * 15) + 360) % 360;
    emit('move'); return;
  }
  const dx = w.x - drag.start.x, dy = w.y - drag.start.y;
  // the whole selection moves by one shared step (snapped on the piece under the pointer), so the group keeps its exact shape
  const L0 = drag.items.find((o) => o.q === drag.lead) || drag.items[0];
  const mx = L0 ? snap(L0.x + dx) - L0.x : dx, my = L0 ? snap(L0.y + dy) - L0.y : dy;
  if (Math.hypot(dx, dy) > 2) drag.moved = true;
  for (const o of drag.items) { o.q.x = o.x + mx; o.q.y = o.y + my; o.q.rot = o.rot; }
  // Magnet: the piece under the pointer clicks onto a neighbour (same angle, edge to edge, aligned); the group follows.
  magnetLine = null;
  const lead = drag.items.find((o) => o.q === drag.lead);
  if (lead && document.getElementById('magnetToggle')?.checked) {
    const m = magnet(lead.q, itemOf(lead.q), new Set(drag.items.map((o) => o.q.id)));
    if (m) {
      // a group only slides into place; turning it would change the arrangement
      const ddx = m.x - lead.q.x, ddy = m.y - lead.q.y, dr = drag.items.length > 1 ? 0 : m.rot - lead.q.rot, a = (dr * Math.PI) / 180;
      for (const o of drag.items) {
        const rx = o.q.x - lead.q.x, ry = o.q.y - lead.q.y;
        o.q.x = lead.q.x + ddx + rx * Math.cos(a) - ry * Math.sin(a); o.q.y = lead.q.y + ddy + rx * Math.sin(a) + ry * Math.cos(a);
        o.q.rot = (o.q.rot + dr + 360) % 360;
      }
      magnetLine = m.line;
    }
  }
  live = drag.items.length === 1 ? drag.items[0].q : null;
  emit('move');
});
canvas.addEventListener('pointerup', () => {
  if (drag?.mode === 'marquee') {
    const x0 = Math.min(marquee.x0, marquee.x1), x1 = Math.max(marquee.x0, marquee.x1), y0 = Math.min(marquee.y0, marquee.y1), y1 = Math.max(marquee.y0, marquee.y1);
    setSelection(state.placed.filter((p) => p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1).map((p) => p.id));
    marquee = null;
  }
  if (drag?.mode === 'move' && drag.toggleOff && !drag.moved) setSelection(state.selection.filter((i) => i !== drag.toggleOff));
  else if (drag?.mode === 'move' || drag?.mode === 'rotate') emit('placed');
  drag = null; live = null; magnetLine = null; canvas.style.cursor = 'grab'; draw();
});
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const { sx, sy } = rel(e), before = toWorld(sx, sy);
  view.scale *= e.deltaY < 0 ? 1.12 : 1 / 1.12;
  const after = toScreen(before.x, before.y);
  view.ox += sx - after.x; view.oy -= sy - after.y;
  draw();
}, { passive: false });

let spaceDown = false;
window.addEventListener('keyup', (e) => { if (e.code === 'Space') spaceDown = false; });

// Keyboard shortcuts work in the plan, 3D and split views.
let clipboard = [];
window.addEventListener('keydown', (e) => {
  if (VIEWER) return;
  if (/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName)) return;
  if (!document.querySelector('#planView.active, #threeView.active')) return;
  const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
  if (e.code === 'Space') { spaceDown = true; return; }
  if (e.key === 'Escape' && measuring) { toggleMeasure(false); emit('measureMode'); return; }
  if (mod && k === 'z') { e.preventDefault(); emit(e.shiftKey ? 'redo' : 'undo'); return; }
  if (mod && k === 'y') { e.preventDefault(); emit('redo'); return; }
  if (mod && k === 'a') { e.preventDefault(); setSelection(state.placed.map((p) => p.id)); return; }
  const sel = selection(); if (!sel.length) return;
  if (k === 'r') { rotateSelection(e.shiftKey ? -15 : 15); }
  else if (e.key === 'Delete' || e.key === 'Backspace') { deleteSelection(); }
  else if (e.key === 'Escape') setSelection([]);
  else if (mod && k === 'd') { e.preventDefault(); duplicateSelection(); }
  else if (mod && k === 'c') clipboard = sel.map((p) => ({ ...p }));
  else if (mod && k === 'v' && clipboard.length) { e.preventDefault(); pasteFrom(clipboard); }
  else if (e.key.startsWith('Arrow')) {
    const s = e.altKey ? 1 : e.shiftKey ? 50 : 10;
    for (const p of sel) { if (p.locked) continue; if (e.key === 'ArrowLeft') p.x -= s; if (e.key === 'ArrowRight') p.x += s; if (e.key === 'ArrowUp') p.y += s; if (e.key === 'ArrowDown') p.y -= s; }
    e.preventDefault(); emit('placed');
  }
});

export function rotateSelection(deg) {
  const sel = selection().filter((p) => !p.locked); if (!sel.length) return;
  if (sel.length === 1) sel[0].rot = (sel[0].rot + deg + 360) % 360;
  else { // rotate the group around its centre
    const cx = sel.reduce((s, p) => s + p.x, 0) / sel.length, cy = sel.reduce((s, p) => s + p.y, 0) / sel.length, a = (deg * Math.PI) / 180;
    for (const p of sel) { const dx = p.x - cx, dy = p.y - cy; p.x = cx + dx * Math.cos(a) - dy * Math.sin(a); p.y = cy + dx * Math.sin(a) + dy * Math.cos(a); p.rot = (p.rot + deg + 360) % 360; }
  }
  emit('placed');
}
export function deleteSelection() { state.placed = state.placed.filter((q) => !state.selection.includes(q.id) || q.locked); setSelection([]); emit('placed'); }
function pasteFrom(list, offset = 80) {
  const copies = list.map((p) => ({ ...p, id: newId('p'), x: p.x + offset, y: p.y - offset, locked: false }));
  state.placed.push(...copies); setSelection(copies.map((c) => c.id)); emit('placed');
}
export function duplicateSelection() { pasteFrom(selection()); }
export const duplicate = (p) => pasteFrom([p]);

// Align / distribute the selection (left, centre, right, top, middle, bottom, spread horizontally / vertically)
export function align(mode) {
  const sel = selection().filter((p) => !p.locked); if (sel.length < 2) return;
  const xs = sel.map((p) => p.x), ys = sel.map((p) => p.y);
  const set = { left: () => sel.forEach((p) => (p.x = Math.min(...xs))), right: () => sel.forEach((p) => (p.x = Math.max(...xs))), centerX: () => sel.forEach((p) => (p.x = (Math.min(...xs) + Math.max(...xs)) / 2)),
    top: () => sel.forEach((p) => (p.y = Math.max(...ys))), bottom: () => sel.forEach((p) => (p.y = Math.min(...ys))), centerY: () => sel.forEach((p) => (p.y = (Math.min(...ys) + Math.max(...ys)) / 2)),
    spreadX: () => { const s = [...sel].sort((a, b) => a.x - b.x), x0 = s[0].x, x1 = s[s.length - 1].x; s.forEach((p, i) => (p.x = x0 + ((x1 - x0) * i) / (s.length - 1))); },
    spreadY: () => { const s = [...sel].sort((a, b) => a.y - b.y), y0 = s[0].y, y1 = s[s.length - 1].y; s.forEach((p, i) => (p.y = y0 + ((y1 - y0) * i) / (s.length - 1))); } };
  set[mode]?.(); emit('placed');
}

export function placeAt(item, x, y) {
  const p = { id: newId('p'), itemId: item.id, x: snap(x), y: snap(y), rot: 0 };
  state.placed.push(p); setSelection([p.id]); emit('placed');
  return p;
}
export function placeAtCenter(item) {
  const r = canvas.getBoundingClientRect();
  const c = r.width ? toWorld(r.width / 2, r.height / 2) : { x: 500, y: 500 };
  return placeAt(item, c.x, c.y);
}

// Render the whole plan (fitted) to an image, e.g. for the client presentation.
export function snapshotPlan(width = 1800, height = 1100) {
  const saved = { ...view }, w0 = canvas.width, h0 = canvas.height, savedSel = state.selection;
  state.selection = []; state.selectedId = null;
  canvas.width = width; canvas.height = height;
  const k = dpr();
  const b = state.venue ? venueBounds(state.venue) : { minX: 0, minY: 0, maxX: 2000, maxY: 1500 };
  view.scale = Math.min((width / k - 60) / (b.maxX - b.minX), (height / k - 60) / (b.maxY - b.minY));
  view.ox = (width / k - (b.maxX - b.minX) * view.scale) / 2 - b.minX * view.scale;
  view.oy = (height / k - (b.maxY - b.minY) * view.scale) / 2 - b.minY * view.scale;
  draw(true);
  const url = canvas.toDataURL('image/png');
  Object.assign(view, saved); canvas.width = w0; canvas.height = h0; state.selection = savedSel; state.selectedId = savedSel[savedSel.length - 1] || null;
  draw();
  return url;
}

export { footprint };
