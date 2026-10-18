// Suggests a layout: stage on the wall facing the entrance, dance floor in front of it,
// bar / buffet along the side walls, lounges near the entrance and dining tables filling the rest.
import { state, newId } from './state.js';
import { venueBounds, visibleSegments } from './dxf.js';

const CHAIR_ZONE = 55;   // chairs + sitting space around a table
const AISLE = 90;        // walking aisle between items

export function seatedHalf(item) {
  const extra = item.seats > 0 ? CHAIR_ZONE : 0;
  return { hw: item.w / 2 + extra, hd: item.d / 2 + extra };
}

function extent(item, rot) {
  const { hw, hd } = seatedHalf(item);
  return rot % 180 === 0 ? { hw, hd } : { hw: hd, hd: hw };
}

function segHitsRect(s, r) {
  // Liang–Barsky clip of segment against rect
  let t0 = 0, t1 = 1;
  const dx = s.x2 - s.x1, dy = s.y2 - s.y1;
  const tests = [[-dx, s.x1 - r.x0], [dx, r.x1 - s.x1], [-dy, s.y1 - r.y0], [dy, r.y1 - s.y1]];
  for (const [p, q] of tests) {
    if (p === 0) { if (q < 0) return false; continue; }
    const t = q / p;
    if (p < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; }
  }
  return true;
}

export function suggestLayout() {
  const venue = state.venue;
  if (!venue) throw new Error('Upload a venue plan first.');
  const b = venueBounds(venue);
  const segs = visibleSegments(venue);
  const rects = [];
  const placed = [];

  // Entrance = the wall side with the biggest gap; default bottom. We simply detect which side has least wall length.
  const side = entranceSide(segs, b);
  // Work in a local frame where the entrance is at the bottom (y = minY) and the stage wall at the top.
  const frame = makeFrame(side, b);

  const fits = (x, y, hw, hd, gap) => {
    const r = { x0: x - hw - gap, x1: x + hw + gap, y0: y - hd - gap, y1: y + hd + gap };
    if (r.x0 < b.minX || r.x1 > b.maxX || r.y0 < b.minY || r.y1 > b.maxY) return false;
    const inner = { x0: x - hw - 5, x1: x + hw + 5, y0: y - hd - 5, y1: y + hd + 5 };
    if (segs.some((s) => segHitsRect(s, inner))) return false;
    return !rects.some((o) => r.x0 < o.x1 && r.x1 > o.x0 && r.y0 < o.y1 && r.y1 > o.y0);
  };

  const put = (item, lx, ly, localRot = 0, gap = 20) => {
    const { x, y } = frame.toWorld(lx, ly);
    const rot = (localRot + frame.rot) % 360;
    const { hw, hd } = extent(item, rot);
    if (!fits(x, y, hw, hd, gap)) return false;
    rects.push({ x0: x - hw, x1: x + hw, y0: y - hd, y1: y + hd });
    placed.push({ id: newId('p'), itemId: item.id, x, y, rot });
    return true;
  };

  // Scan local positions in a given order until it fits.
  const scan = (item, candidates, localRot = 0, gap = 20) => {
    for (const [lx, ly] of candidates) if (put(item, lx, ly, localRot, gap)) return true;
    return false;
  };

  const W = frame.W, H = frame.H;
  const byKind = (k) => state.furniture.filter((f) => f.kind === k);
  const each = (k, fn) => byKind(k).forEach((f) => { for (let i = 0; i < (f.qty || 1); i++) fn(f, i); });
  const along = (from, to, step) => { const out = []; for (let v = from; from <= to ? v <= to : v >= to; v += from <= to ? step : -step) out.push(v); return out; };

  // 1. Stage & chuppah on the far wall, centred.
  each('stage', (f) => scan(f, along(0, W / 2, 25).flatMap((dx) => [[W / 2 + dx, H - f.d / 2 - 40], [W / 2 - dx, H - f.d / 2 - 40]]), 0));
  each('chuppah', (f) => scan(f, along(0, W / 2, 25).flatMap((dx) => [[W / 2 - dx, H - f.d / 2 - 60], [W / 2 + dx, H - f.d / 2 - 60]]), 0));

  // 2. Dance floor in front of the stage.
  const stageDepth = byKind('stage').length ? Math.max(...byKind('stage').map((s) => s.d)) + 60 : 60;
  each('danceFloor', (f) => scan(f, along(H - stageDepth - f.d / 2 - 20, f.d / 2, 25).flatMap((y) => [[W / 2, y], [W / 2 - 150, y], [W / 2 + 150, y]]), 0, 10));

  // 3. Bride & groom / head tables beside the dance floor, facing it.
  const head = state.furniture.filter((f) => f.kind === 'rectTable' && f.seats <= 4);
  const headSpots = along(H - stageDepth - 120, H / 3, 25).flatMap((y) => along(560, W / 2 - 200, 40).flatMap((dx) => [[W / 2 - dx, y], [W / 2 + dx, y]]));
  head.forEach((f) => { for (let i = 0; i < f.qty; i++) scan(f, headSpots, 0); });

  // 4. Bar & buffet against the side walls.
  each('bar', (f, i) => scan(f, along(H * 0.35, H - 100, 25).map((y) => [i % 2 ? W - f.d / 2 - 40 : f.d / 2 + 40, y]), 90));
  each('buffet', (f, i) => scan(f, along(H * 0.4, H - 100, 25).map((y) => [i % 2 ? f.d / 2 + 40 : W - f.d / 2 - 40, y]), 90));

  // 5. Lounge corners near the entrance.
  const lounge = [...byKind('sofa'), ...byKind('armchair')];
  lounge.forEach((f) => { for (let i = 0; i < f.qty; i++) scan(f, along(f.d / 2 + 80, H / 3, 25).flatMap((y) => along(f.w / 2 + 60, W / 3, 30).flatMap((x) => [[x, y], [W - x, y]])), 0, 15); });
  each('cocktail', () => scan(byKind('cocktail')[0], along(220, H / 2, 40).flatMap((y) => along(W / 2 - 400, W / 2 + 400, 60).map((x) => [x, y])), 0, 60));

  // 6. Dining tables: fill the room on a grid from the dance floor outward.
  const dining = state.furniture.filter((f) => (f.kind === 'roundTable') || (f.kind === 'rectTable' && f.seats > 4));
  const candidates = [];
  for (let y = 60; y < H; y += 20) for (let x = 60; x < W; x += 20) candidates.push([x, y]);
  const focus = [W / 2, H - stageDepth - 300];
  candidates.sort((a, c) => Math.hypot(a[0] - focus[0], a[1] - focus[1]) - Math.hypot(c[0] - focus[0], c[1] - focus[1]));
  let missing = 0;
  dining.forEach((f) => { for (let i = 0; i < f.qty; i++) if (!scan(f, candidates, 0, AISLE / 2)) missing++; });

  // 7. Florals: flank the stage / chuppah, then corners.
  each('plant', () => scan(byKind('plant')[0], [[W / 2 - 330, H - 80], [W / 2 + 330, H - 80], [60, H - 60], [W - 60, H - 60], [60, 60], [W - 60, 60], ...candidates], 0, 10));

  state.placed = placed;
  return { missing, entrance: side };
}

function entranceSide(segs, b) {
  const tol = 30, len = { bottom: 0, top: 0, left: 0, right: 0 };
  for (const s of segs) {
    const l = Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
    if (Math.abs(s.y1 - b.minY) < tol && Math.abs(s.y2 - b.minY) < tol) len.bottom += l;
    if (Math.abs(s.y1 - b.maxY) < tol && Math.abs(s.y2 - b.maxY) < tol) len.top += l;
    if (Math.abs(s.x1 - b.minX) < tol && Math.abs(s.x2 - b.minX) < tol) len.left += l;
    if (Math.abs(s.x1 - b.maxX) < tol && Math.abs(s.x2 - b.maxX) < tol) len.right += l;
  }
  const W = b.maxX - b.minX, H = b.maxY - b.minY;
  const open = { bottom: W - len.bottom, top: W - len.top, left: H - len.left, right: H - len.right };
  return Object.entries(open).sort((a, c) => c[1] - a[1])[0][0];
}

function makeFrame(side, b) {
  const W0 = b.maxX - b.minX, H0 = b.maxY - b.minY;
  switch (side) {
    case 'top': return { W: W0, H: H0, rot: 180, toWorld: (x, y) => ({ x: b.maxX - x, y: b.maxY - y }) };
    case 'left': return { W: H0, H: W0, rot: 270, toWorld: (x, y) => ({ x: b.minX + y, y: b.maxY - x }) };
    case 'right': return { W: H0, H: W0, rot: 90, toWorld: (x, y) => ({ x: b.maxX - y, y: b.minY + x }) };
    default: return { W: W0, H: H0, rot: 0, toWorld: (x, y) => ({ x: b.minX + x, y: b.minY + y }) };
  }
}
