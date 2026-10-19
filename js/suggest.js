// Seat suggestions: finds free spots that keep walkways clear and proposes inventory pieces as "ghosts".
// Rules (cm): 90 walkway around new lounge pieces (120 for the main aisle is kept by the 90+90 of facing pieces),
// 60 behind a chair at a table so it can be pulled out and passed behind, 15 from walls, 60 per person at tables.
import { state, INVENTORY, itemOf, isRound } from './state.js';
import { venueBounds, visibleSegments, footprint } from './dxf.js';
import { shapesOf, sat } from './plan2d.js';
import { seatsOf } from './match.js';

export const RULES = { door: 120, walkway: 90, behindChair: 60, wall: 15, perSeat: 60 };
const TABLES = ['bistro', 'cocktail', 'counter', 'bar', 'roundTable', 'rectTable'];

// a rectangle in an item's own frame (x across, y toward its back) placed in the world
function rectAt(p, x0, y0, x1, y1) {
  const a = (p.rot * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(([x, y]) => ({ x: p.x + x * c - y * s, y: p.y + x * s + y * c }));
}
function segHitsPoly(sg, P) {
  const inside = (q) => { let o = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a.y > q.y) !== (b.y > q.y) && q.x < ((b.x - a.x) * (q.y - a.y)) / (b.y - a.y) + a.x) o = !o; } return o; };
  if (inside({ x: sg.x1, y: sg.y1 }) || inside({ x: sg.x2, y: sg.y2 })) return true;
  const cr = (p1, p2, p3, p4) => { const d = (a, b, c) => (c.x - a.x) * (b.y - a.y) - (c.y - a.y) * (b.x - a.x); const d1 = d(p3, p4, p1), d2 = d(p3, p4, p2), d3 = d(p1, p2, p3), d4 = d(p1, p2, p4); return d1 * d2 < 0 && d3 * d4 < 0; };
  for (let i = 0; i < P.length; i++) if (cr({ x: sg.x1, y: sg.y1 }, { x: sg.x2, y: sg.y2 }, P[i], P[(i + 1) % P.length])) return true;
  return false;
}
function insideRoom(q, segs) { let n = 0; for (const s of segs) if ((s.y1 > q.y) !== (s.y2 > q.y) && q.x < ((s.x2 - s.x1) * (q.y - s.y1)) / (s.y2 - s.y1) + s.x1) n++; return n % 2 === 1; }
const bbox = (P) => ({ x0: Math.min(...P.map((q) => q.x)), x1: Math.max(...P.map((q) => q.x)), y0: Math.min(...P.map((q) => q.y)), y1: Math.max(...P.map((q) => q.y)) });
const boxHit = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

export function suggestSeats(maxSeats = Infinity) {
  const segs = visibleSegments(state.venue).filter((s) => !/dim/i.test(s.layer));
  if (!segs.length) return [];
  // loose wall ends mark doors and openings: keep a clear zone in front of them
  const ends = new Map(), key = (x, y) => `${Math.round(x / 5)},${Math.round(y / 5)}`;
  for (const sg of segs) for (const [x, y] of [[sg.x1, sg.y1], [sg.x2, sg.y2]]) { const k = key(x, y); ends.set(k, { x, y, n: (ends.get(k)?.n || 0) + 1 }); }
  const doorEnds = [...ends.values()].filter((e) => e.n === 1);
  const nearDoor = (g, it) => doorEnds.some((e) => Math.hypot(e.x - g.x, e.y - g.y) < RULES.door + Math.max(it.w, it.d) / 2);
  const obstacles = [];
  const addObs = (P, owner) => obstacles.push({ P, b: bbox(P), owner });
  for (const p of state.placed) { const it = itemOf(p); if (it && it.kind !== 'danceFloor') for (const P of shapesOf(p, it)) addObs(P, p.id); }
  const free = (P, ignore, wallsOnly = false) => {
    const b = bbox(P);
    if (!wallsOnly)     for (const o of obstacles) if (o.owner !== ignore && boxHit(b, o.b) && sat(P, o.P)) return false;
    for (const s of segs) if (boxHit(b, { x0: Math.min(s.x1, s.x2), x1: Math.max(s.x1, s.x2), y0: Math.min(s.y1, s.y2), y1: Math.max(s.y1, s.y2) }) && segHitsPoly(s, P)) return false;
    return true;
  };
  // stock: how many of each inventory piece are still unused
  const used = {}; for (const p of state.placed) { const it = itemOf(p); if (it?.invId) used[it.invId] = (used[it.invId] || 0) + 1; }
  const inEvent = new Set(state.furniture.map((f) => f.invId).filter(Boolean));
  const left = (inv) => (inv.stock > 0 ? inv.stock - (used[inv.id] || 0) : 99);
  const pick = (ok) => INVENTORY.filter((v) => ok(v) && left(v) > 0 && seatsOf(v) > 0).sort((a, b) => inEvent.has(b.id) - inEvent.has(a.id))[0];
  const ghosts = []; let total = 0;
  const take = (inv, g, why) => { used[inv.id] = (used[inv.id] || 0) + 1; ghosts.push({ inv, ...g, seats: seatsOf(inv), why }); total += seatsOf(inv); };

  // 1) seats at tables that have room around them
  for (const p of state.placed) {
    const it = itemOf(p); if (!it || !TABLES.includes(it.kind) || seatsOf(it) > 0) continue;
    const high = it.h >= 95 || it.kind === 'counter' || it.kind === 'bar';
    const inv = pick((v) => (high ? v.kind === 'stool' : v.kind === 'chair'));
    if (!inv) continue;
    const spots = [];
    if (isRound(it)) {
      const r = it.w / 2 + inv.d / 2 - 8, n = Math.max(2, Math.min(it.w < 100 ? 4 : 12, Math.floor((2 * Math.PI * r) / RULES.perSeat)));
      for (let i = 0; i < n; i++) { const a = (i / n) * 2 * Math.PI + (p.rot * Math.PI) / 180; spots.push({ x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r }); }
    } else {
      const a = (p.rot * Math.PI) / 180, k = Math.floor(it.w / RULES.perSeat);
      for (const side of [-1, 1]) for (let i = 0; i < k; i++) {
        const u = -it.w / 2 + RULES.perSeat * (i + 0.5), v = side * (it.d / 2 + inv.d / 2 - 8);
        spots.push({ x: p.x + u * Math.cos(a) - v * Math.sin(a), y: p.y + u * Math.sin(a) + v * Math.cos(a) });
      }
    }
    for (const s of spots) {
      if (total >= maxSeats) break;
      const g = { x: s.x, y: s.y, rot: (Math.atan2(-(s.x - p.x), s.y - p.y) * 180) / Math.PI };
      const body = footprint(g, inv), room = rectAt(g, -inv.w / 2, -inv.d / 2, inv.w / 2, inv.d / 2 + RULES.behindChair);
      if (!insideRoom(g, segs) || nearDoor(g, inv) || !free(body, p.id) || !free(room, p.id)) continue;
      take(inv, g, 'table'); addObs(body, 'ghost'); addObs(room, 'ghost-zone');
    }
  }

  // 2) lounge pieces in open floor, backs to the wall where possible, walkway kept all round
  const b = venueBounds(state.venue), step = 30;
  for (let guard = 0; guard < 40 && total < maxSeats; guard++) {
    const LOUNGE = ['sofa', 'channelSofa', 'bench', 'armchair', 'club', 'slipper', 'loungeChair', 'pouf'];
    const cands = INVENTORY.filter((v) => LOUNGE.includes(v.kind) && left(v) > 0 && seatsOf(v) > 0).sort((a, c) => inEvent.has(c.id) - inEvent.has(a.id) || seatsOf(c) - seatsOf(a)).slice(0, 6);
    let best = null, inv = null;
    for (const cand of cands) { best = place(cand); if (best) { inv = cand; break; } }
    if (!best) break;
    take(inv, best.g, 'lounge'); addObs(best.body, 'ghost');
    addObs(rectAt(best.g, -inv.w / 2, -inv.d / 2 - RULES.walkway, inv.w / 2, inv.d / 2), 'ghost-zone'); // its own walkway stays free
  }
  function place(inv) {
    let best = null;
    for (let x = b.minX + step; x < b.maxX; x += step) for (let y = b.minY + step; y < b.maxY; y += step) {
      if (!insideRoom({ x, y }, segs)) continue;
      for (const rot of [0, 90, 180, 270]) {
        const g = { x, y, rot }, hw = inv.w / 2, hd = inv.d / 2;
        if (nearDoor(g, inv)) continue;
        const body = footprint(g, inv);
        // walkway in front and at the sides; behind only a wall gap
        const clear = rectAt(g, -hw - RULES.walkway, -hd - RULES.walkway, hw + RULES.walkway, hd + RULES.wall);
        if (!free(clear)) continue;
        const backProbe = rectAt(g, -hw, hd + RULES.wall, hw, hd + RULES.wall + 25); // a wall right behind = lounge along the wall
        if (free(backProbe, null, true)) continue; // lounge pieces go with their back to a wall, never floating in the room
        const score = Math.hypot(x - (b.minX + b.maxX) / 2, y - (b.minY + b.maxY) / 2) * 0.01;
        if (!best || score > best.score) best = { g, body, score };
      }
    }
    return best;
  }
  return ghosts;
}
