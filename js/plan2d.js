// Interactive 2D plan: venue lines + furniture, drag / rotate / duplicate / delete.
import { state, emit, itemOf, newId, isRound } from './state.js';
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
  view.scale = Math.min((r.width - 80) / w, (r.height - 140) / h);
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
  ctx.strokeStyle = '#2f2a26'; ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (const s of visibleSegments(state.venue)) {
    const a = toScreen(s.x1, s.y1), b = toScreen(s.x2, s.y2);
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
  }
  ctx.stroke();

  // furniture: floors first (dance floor, stage) so seating draws on top
  const bad = clean ? new Set() : overlaps();
  const order = [...state.placed].sort((a, b) => (['danceFloor', 'stage'].includes(itemOf(b)?.kind) ? 1 : 0) - (['danceFloor', 'stage'].includes(itemOf(a)?.kind) ? 1 : 0));
  for (const p of order) {
    const it = itemOf(p); if (!it) continue;
    drawItem(p, it, state.selection.includes(p.id), bad.has(p.id));
  }
  if (!clean) drawOverlay();

  // scale bar
  ctx.fillStyle = '#8a7f75'; ctx.font = '11px Inter';
  ctx.fillRect(16, 16, step, 3); ctx.fillText('1 m', 16, 32);
}

function drawItem(p, it, selected, clash) {
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

  ctx.fillStyle = it.color; ctx.strokeStyle = clash ? '#d23c2a' : selected ? '#c27a3a' : '#5a514a'; ctx.lineWidth = selected || clash ? 2.5 : 1;
  if (selected) { ctx.shadowColor = 'rgba(194,122,58,.55)'; ctx.shadowBlur = 10; }
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
  const R = it.w / 2, r = Math.min(R - 20, (it.innerW || it.w - 110) / 2), span = Math.PI / 3;
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
      ctx.strokeStyle = '#c27a3a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(h.x, h.y); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(h.x, h.y, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#c27a3a'; ctx.font = '10px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('↻', h.x, h.y + 1);
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
  if (marquee) {
    const a = toScreen(marquee.x0, marquee.y0), b = toScreen(marquee.x1, marquee.y1);
    ctx.fillStyle = 'rgba(194,122,58,.08)'; ctx.strokeStyle = '#c27a3a'; ctx.setLineDash([5, 4]);
    ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y); ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y); ctx.setLineDash([]);
  }
  if (hover && !drag) { const it = itemOf(hover); if (it) { const c = toScreen(hover.x, hover.y); label(c.x, c.y - (Math.max(it.w, it.d) / 2) * view.scale - 14, `${tName(it)} · ${it.w}×${it.d}`, '#1b1918'); } }
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
  if (!n) return out;
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
function sat(A, B) {
  for (const P of [A, B]) for (let i = 0; i < P.length; i++) {
    const a = P[i], b = P[(i + 1) % P.length], nx = b.y - a.y, ny = a.x - b.x;
    const pr = (Q) => Q.map((q) => q.x * nx + q.y * ny);
    const pa = pr(A), pb = pr(B);
    if (Math.max(...pa) <= Math.min(...pb) + 0.5 || Math.max(...pb) <= Math.min(...pa) + 0.5) return false;
  }
  return true;
}
export function overlaps() {
  const bad = new Set(), list = state.placed.map((p) => ({ p, it: itemOf(p) })).filter((o) => o.it && o.it.kind !== 'danceFloor');
  const polys = list.map((o) => polyOf(o.p, o.it));
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++)
    if (sat(polys[i], polys[j])) { bad.add(list[i].p.id); bad.add(list[j].p.id); }
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
export function worldAt(clientX, clientY) { const r = canvas.getBoundingClientRect(); return toWorld(clientX - r.left, clientY - r.top); }

function rotateHandle(p, it) { // screen position of the rotate knob above the selected item
  const c = toScreen(p.x, p.y), a = (p.rot * Math.PI) / 180, dist = (Math.max(it.w, it.d) / 2) * view.scale + 22;
  return { x: c.x - Math.sin(a) * dist, y: c.y - Math.cos(a) * dist };
}

let hover = null, marquee = null, live = null;

canvas.addEventListener('pointerdown', (e) => {
  const { sx, sy } = rel(e), w = toWorld(sx, sy);
  canvas.setPointerCapture(e.pointerId);
  if (e.button === 1 || e.button === 2 || spaceDown) { drag = { mode: 'pan', sx: e.clientX, sy: e.clientY, ox: view.ox, oy: view.oy }; return; }
  const sel = selection();
  if (sel.length === 1) {
    const it = itemOf(sel[0]), h = rotateHandle(sel[0], it);
    if (Math.hypot(sx - h.x, sy - h.y) < 10) { drag = { mode: 'rotate', p: sel[0] }; return; }
  }
  const p = hit(w.x, w.y);
  if (p) {
    if (e.shiftKey || e.ctrlKey || e.metaKey) setSelection(state.selection.includes(p.id) ? state.selection.filter((i) => i !== p.id) : [...state.selection, p.id]);
    else if (!state.selection.includes(p.id)) setSelection([p.id]);
    if (p.locked) { drag = null; return; }
    drag = { mode: 'move', start: w, items: selection().filter((q) => !q.locked).map((q) => ({ q, x: q.x, y: q.y })) };
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
  for (const o of drag.items) { o.q.x = snap(o.x + dx); o.q.y = snap(o.y + dy); }
  live = drag.items.length === 1 ? drag.items[0].q : null;
  emit('move');
});
canvas.addEventListener('pointerup', () => {
  if (drag?.mode === 'marquee') {
    const x0 = Math.min(marquee.x0, marquee.x1), x1 = Math.max(marquee.x0, marquee.x1), y0 = Math.min(marquee.y0, marquee.y1), y1 = Math.max(marquee.y0, marquee.y1);
    setSelection(state.placed.filter((p) => p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1).map((p) => p.id));
    marquee = null;
  }
  if (drag?.mode === 'move' || drag?.mode === 'rotate') emit('placed');
  drag = null; live = null; canvas.style.cursor = 'grab'; draw();
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
  if (/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName)) return;
  if (!document.querySelector('#planView.active, #threeView.active')) return;
  const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
  if (e.code === 'Space') { spaceDown = true; return; }
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
    const s = e.shiftKey ? 50 : 10;
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
