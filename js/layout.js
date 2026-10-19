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
  ['bar', 'counter'].forEach((k) => each(k, (f, i) => scan(f, along(H * 0.35, H - 100, 25).map((y) => [i % 2 ? W - f.d / 2 - 40 : f.d / 2 + 40, y]), 90)));
  each('buffet', (f, i) => scan(f, along(H * 0.4, H - 100, 25).map((y) => [i % 2 ? f.d / 2 + 40 : W - f.d / 2 - 40, y]), 90));

  // 5. Lounge corners near the entrance.
  const lounge = ['sofa', 'armchair', 'curvedSofa', 'channelSofa', 'bench', 'club', 'loungeChair', 'slipper', 'pouf', 'lowTable', 'cushion'].flatMap(byKind);
  lounge.forEach((f) => { for (let i = 0; i < f.qty; i++) scan(f, along(f.d / 2 + 80, H / 3, 25).flatMap((y) => along(f.w / 2 + 60, W / 3, 30).flatMap((x) => [[x, y], [W - x, y]])), 180, 15); });
  [...byKind('cocktail'), ...byKind('bistro')].forEach((f) => { for (let i = 0; i < f.qty; i++) scan(f, along(220, H / 2, 40).flatMap((y) => along(W / 2 - 400, W / 2 + 400, 60).map((x) => [x, y])), 0, 60); });

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

// ---------- base design from a mood board selection ----------
// Builds lounge "islands" from the chosen pieces and packs them into the room with walking aisles:
// curved sofas in facing pairs around a low table with poufs, straight sofas with armchairs across a table,
// armchair pairs, bistro clusters, counters along the walls. Everything stays editable afterwards.
// items: [{ f (event furniture entry), qty }]. Returns { placedCount, missing }.
export function composeDesign(items) {
  const venue = state.venue;
  if (!venue) throw new Error('Upload a venue plan first.');
  const segs = visibleSegments(venue), walls = segs.filter((s) => /wall/i.test(s.layer));
  const use = walls.length ? walls : segs;
  const b = use.length ? use.reduce((o, s) => ({ minX: Math.min(o.minX, s.x1, s.x2), maxX: Math.max(o.maxX, s.x1, s.x2), minY: Math.min(o.minY, s.y1, s.y2), maxY: Math.max(o.maxY, s.y1, s.y2) }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }) : venueBounds(venue);
  const W = b.maxX - b.minX, H = b.maxY - b.minY;

  const pool = {};
  for (const { f, qty } of items) for (let i = 0; i < qty; i++) (pool[f.kind] ||= []).push(f);
  const take = (...kinds) => { for (const k of kinds) if (pool[k]?.length) return pool[k].shift(); return null; };
  const left = () => Object.values(pool).reduce((s, a) => s + a.length, 0);
  const armchairKinds = ['club', 'slipper', 'loungeChair', 'armchair'];
  const isArmchair = (f) => armchairKinds.includes(f.kind) || (f.kind === 'channelSofa' && f.w < 120);
  // channel armchair is stored as channelSofa — move narrow ones to the armchair pool
  if (pool.channelSofa) { pool.armchair = [...(pool.armchair || []), ...pool.channelSofa.filter(isArmchair)]; pool.channelSofa = pool.channelSofa.filter((f) => !isArmchair(f)); }

  // A cluster = members relative to its centre (rot: 0 means back toward +y, facing -y).
  const clusters = [];
  const table = () => take('lowTable');
  const addPoufs = (members, n, rx, ry) => { for (let i = 0; i < n; i++) { const p = take('pouf'); if (!p) break; members.push({ f: p, dx: i % 2 ? rx : -rx, dy: ry, rot: 0 }); } };

  // 1. curved sofas: facing pairs around a table, poufs closing the circle
  while (pool.curvedSofa?.length) {
    const a = take('curvedSofa'), bb = take('curvedSofa'), m = [];
    const off = a.d / 2 + 35;
    m.push({ f: a, dx: 0, dy: off, rot: 0 });
    if (bb) m.push({ f: bb, dx: 0, dy: -off, rot: 180 });
    const t = table(); if (t) m.push({ f: t, dx: 0, dy: bb ? 0 : off - a.d / 2 - t.d / 2 - 45, rot: 0 });
    addPoufs(m, 2, a.w / 2 - 10, bb ? 0 : -20);
    clusters.push(m);
  }
  // 2. straight sofas with armchairs across a table
  while (pool.channelSofa?.length || pool.sofa?.length || pool.bench?.length) {
    const s = take('channelSofa', 'sofa', 'bench'), m = [{ f: s, dx: 0, dy: s.d / 2 + 50, rot: 0 }];
    const t = table(); if (t) m.push({ f: t, dx: 0, dy: 0, rot: 0 });
    for (const dx of [-s.w / 4, s.w / 4]) { const c = take('armchair', 'club', 'slipper', 'loungeChair'); if (c) m.push({ f: c, dx, dy: -(c.d / 2 + 60), rot: 180 }); }
    clusters.push(m);
  }
  // 3. armchairs in facing pairs (a conversation corner)
  while (armchairKinds.some((k) => pool[k]?.length)) {
    const a = take(...armchairKinds), c = take(...armchairKinds), m = [{ f: a, dx: 0, dy: a.d / 2 + 45, rot: 0 }];
    if (c) m.push({ f: c, dx: 0, dy: -(c.d / 2 + 45), rot: 180 });
    const t = table(); if (t) m.push({ f: t, dx: 0, dy: 0, rot: 0 });
    else if (c) { m[0].dy -= 15; m[1].dy += 15; }
    addPoufs(m, 1, (a.w / 2 + 40), 0);
    clusters.push(m);
  }
  // 4. bistro / cocktail tables in groups of 3, with chairs if any were chosen
  while (pool.bistro?.length || pool.cocktail?.length) {
    const m = [];
    for (let i = 0; i < 3; i++) { const t = take('bistro', 'cocktail'); if (!t) break; m.push({ f: t, dx: (i - 1) * 140, dy: 0, rot: 0 }); for (const s of [1, -1]) { const ch = take('stool', 'chair'); if (ch) m.push({ f: ch, dx: (i - 1) * 140, dy: s * 60, rot: s > 0 ? 0 : 180 }); } }
    clusters.push(m);
  }
  // 5. whatever is left (low tables, poufs, chairs…) as small groups
  for (const k of Object.keys(pool)) while (pool[k].length && !['counter', 'bar', 'buffet', 'stage', 'danceFloor', 'cushion'].includes(k)) {
    const m = []; for (let i = 0; i < 3 && pool[k].length; i++) { const f = pool[k].shift(); m.push({ f, dx: (i - 1) * (f.w + 50), dy: 0, rot: 0 }); }
    clusters.push(m);
  }

  // Packing: walls first for counters / bars / buffets, then clusters from the middle outward.
  const rects = [], placed = [];
  const fpr = (f, rot) => (rot % 180 === 0 ? { hw: f.w / 2, hd: f.d / 2 } : { hw: f.d / 2, hd: f.w / 2 });
  const free = (r, gap) => r.x0 - gap >= b.minX && r.x1 + gap <= b.maxX && r.y0 - gap >= b.minY && r.y1 + gap <= b.maxY
    && !segs.some((s) => segHitsRect(s, { x0: r.x0 - 5, x1: r.x1 + 5, y0: r.y0 - 5, y1: r.y1 + 5 }))
    && !rects.some((o) => r.x0 - gap < o.x1 && r.x1 + gap > o.x0 && r.y0 - gap < o.y1 && r.y1 + gap > o.y0);
  const tryCluster = (m, cx, cy, turn, gap) => {
    const rot = (r) => (r + turn) % 360, a = (turn * Math.PI) / 180;
    const placedM = m.map((o) => ({ ...o, x: cx + o.dx * Math.cos(a) - o.dy * Math.sin(a), y: cy + o.dx * Math.sin(a) + o.dy * Math.cos(a), r: rot(o.rot) }));
    const boxes = placedM.map((o) => { const { hw, hd } = fpr(o.f, o.r); return { x0: o.x - hw, x1: o.x + hw, y0: o.y - hd, y1: o.y + hd }; });
    const all = boxes.reduce((u, r) => ({ x0: Math.min(u.x0, r.x0), x1: Math.max(u.x1, r.x1), y0: Math.min(u.y0, r.y0), y1: Math.max(u.y1, r.y1) }));
    if (!free(all, gap)) return false;
    rects.push(all);
    for (const o of placedM) placed.push({ id: newId('p'), itemId: o.f.id, x: Math.round(o.x), y: Math.round(o.y), rot: o.r });
    return true;
  };
  // wall pieces
  let missing = 0;
  for (const k of ['counter', 'bar', 'buffet']) (pool[k] || []).forEach((f, i) => {
    const spots = [];
    for (let x = b.minX + f.w / 2 + 80; x < b.maxX - f.w / 2 - 80; x += 40) spots.push([x, b.maxY - f.d / 2 - 30, 0], [x, b.minY + f.d / 2 + 30, 180]);
    spots.sort((p, q) => Math.abs(p[0] - (b.minX + b.maxX) / 2) - Math.abs(q[0] - (b.minX + b.maxX) / 2));
    if (!spots.some(([x, y, r]) => tryCluster([{ f, dx: 0, dy: 0, rot: 0 }], x, y, r, 40))) missing++;
  });
  // islands: candidate centres on a grid, centre-out, alternating orientation for a livelier composition
  const cand = [];
  for (let y = b.minY + 100; y < b.maxY - 100; y += 30) for (let x = b.minX + 100; x < b.maxX - 100; x += 30) cand.push([x, y]);
  const cx0 = (b.minX + b.maxX) / 2, cy0 = (b.minY + b.maxY) / 2;
  cand.sort((p, q) => Math.hypot((p[0] - cx0) / W, (p[1] - cy0) / H) - Math.hypot((q[0] - cx0) / W, (q[1] - cy0) / H));
  clusters.sort((p, q) => q.length - p.length);
  clusters.forEach((m, i) => {
    const turns = W >= H ? (i % 2 ? [90, 0] : [0, 90]) : [90, 0];
    if (!turns.some((tn) => cand.some(([x, y]) => tryCluster(m, x, y, tn, 75)))) missing += m.length;
  });
  state.placed = [...state.placed.filter((p) => p.locked), ...placed];
  return { placedCount: placed.length, missing, left: left() };
}
