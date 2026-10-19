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

export function draw() {
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

  // furniture
  for (const p of state.placed) {
    const it = itemOf(p); if (!it) continue;
    drawItem(p, it, p.id === state.selectedId);
  }

  // scale bar
  ctx.fillStyle = '#8a7f75'; ctx.font = '11px Inter';
  ctx.fillRect(16, 16, step, 3); ctx.fillText('1 m', 16, 32);
}

function drawItem(p, it, selected) {
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

  ctx.fillStyle = it.color; ctx.strokeStyle = selected ? '#b08d57' : '#5a514a'; ctx.lineWidth = selected ? 2.5 : 1;
  ctx.beginPath();
  if (it.kind === 'curvedSofa') curvedPath(ctx, it, view.scale);
  else if (round) ctx.arc(0, 0, w / 2, 0, Math.PI * 2); else ctx.rect(-w / 2, -d / 2, w, d);
  if (it.kind === 'danceFloor') ctx.setLineDash([6, 4]);
  ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
  if (it.invId) { // same detail lines as the DXF block
    ctx.lineWidth = 0.8; ctx.strokeStyle = selected ? '#b08d57' : 'rgba(255,255,255,.7)';
    ctx.beginPath();
    for (const e of itemOutline(it)) if (e.t === 'LINE') { ctx.moveTo(e.x1 * view.scale, -e.y1 * view.scale); ctx.lineTo(e.x2 * view.scale, -e.y2 * view.scale); }
    ctx.stroke();
  }

  if (view.scale > 0.15) {
    ctx.rotate((p.rot * Math.PI) / 180);
    ctx.fillStyle = '#2f2a26'; ctx.font = `${Math.max(9, Math.min(13, 14 * view.scale * 3))}px Inter`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const label = it.kind === 'roundTable' || it.kind === 'rectTable' ? String(tableNumber(p)) : shortName(it.name);
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

const shortName = (n) => n.split(/[ \/(]/)[0];
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

function hit(wx, wy) {
  for (let i = state.placed.length - 1; i >= 0; i--) {
    const p = state.placed[i], it = itemOf(p); if (!it) continue;
    const a = (-p.rot * Math.PI) / 180, dx = wx - p.x, dy = wy - p.y;
    const lx = dx * Math.cos(a) - dy * Math.sin(a), ly = dx * Math.sin(a) + dy * Math.cos(a);
    if (Math.abs(lx) <= it.w / 2 && Math.abs(ly) <= it.d / 2) return p;
  }
  return null;
}

const snap = (v) => (document.getElementById('snapToggle').checked ? Math.round(v / 10) * 10 : v);

canvas.addEventListener('pointerdown', (e) => {
  const r = canvas.getBoundingClientRect();
  const w = toWorld(e.clientX - r.left, e.clientY - r.top);
  const p = hit(w.x, w.y);
  state.selectedId = p?.id || null;
  drag = p ? { mode: 'move', p, dx: w.x - p.x, dy: w.y - p.y } : { mode: 'pan', sx: e.clientX, sy: e.clientY, ox: view.ox, oy: view.oy };
  canvas.setPointerCapture(e.pointerId);
  canvas.style.cursor = 'grabbing';
  emit('select');
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  if (drag.mode === 'pan') { view.ox = drag.ox + (e.clientX - drag.sx); view.oy = drag.oy - (e.clientY - drag.sy); draw(); return; }
  const r = canvas.getBoundingClientRect();
  const w = toWorld(e.clientX - r.left, e.clientY - r.top);
  drag.p.x = snap(w.x - drag.dx); drag.p.y = snap(w.y - drag.dy);
  emit('move');
});
canvas.addEventListener('pointerup', () => { if (drag?.mode === 'move') emit('placed'); drag = null; canvas.style.cursor = 'grab'; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  const sx = e.clientX - r.left, sy = e.clientY - r.top, before = toWorld(sx, sy);
  view.scale *= e.deltaY < 0 ? 1.12 : 1 / 1.12;
  const after = toScreen(before.x, before.y);
  view.ox += sx - after.x; view.oy -= sy - after.y;
  draw();
}, { passive: false });

window.addEventListener('keydown', (e) => {
  if (!document.getElementById('planView').classList.contains('active') || /INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName)) return;
  const p = state.placed.find((q) => q.id === state.selectedId); if (!p) return;
  if (e.key === 'r' || e.key === 'R') { p.rot = (p.rot + (e.shiftKey ? -15 : 15) + 360) % 360; emit('placed'); }
  else if (e.key === 'Delete' || e.key === 'Backspace') { state.placed = state.placed.filter((q) => q !== p); state.selectedId = null; emit('placed'); }
  else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') { e.preventDefault(); duplicate(p); }
  else if (e.key.startsWith('Arrow')) {
    const s = e.shiftKey ? 50 : 10;
    if (e.key === 'ArrowLeft') p.x -= s; if (e.key === 'ArrowRight') p.x += s; if (e.key === 'ArrowUp') p.y += s; if (e.key === 'ArrowDown') p.y -= s;
    e.preventDefault(); emit('placed');
  }
});

export function duplicate(p) {
  const it = itemOf(p);
  const q = { ...p, id: newId('p'), x: p.x + it.w + 60, y: p.y };
  state.placed.push(q); state.selectedId = q.id; emit('placed');
}

export function placeAtCenter(item) {
  const r = canvas.getBoundingClientRect();
  const c = toWorld(r.width / 2, r.height / 2);
  const p = { id: newId('p'), itemId: item.id, x: snap(c.x), y: snap(c.y), rot: 0 };
  state.placed.push(p); state.selectedId = p.id; emit('placed');
}

export { footprint };
