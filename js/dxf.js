// DXF import (venue) and export (new design plan). Internal unit: cm.
import DxfParser from 'dxf-parser';
import { state, itemOf, isRound } from './state.js';
import { curvedGeom, chairPositions } from './plan2d.js';

const INSUNITS_TO_CM = { 1: 2.54, 2: 30.48, 4: 0.1, 5: 1, 6: 100 };
const NAMED_UNITS = { mm: 0.1, cm: 1, m: 100 };

// Venue plans that ship with the app (traced by hand), selectable without uploading a file.
export const VENUE_LIBRARY = [
  { file: 'assets/venues/ambassadors-hall.dxf', en: 'Ambassadors hall — empty (18.84 × 9.15 m)', he: 'אולם אמבסדורס — ריק (18.84 × 9.15 מ׳)' },
];

// A file is DXF only if it is text that starts with group code 0 / SECTION (or 999 comment).
export function looksLikeDxf(text) { return /^\s*(0|999)\s*\r?\n/.test(text.slice(0, 200)) && /SECTION/.test(text.slice(0, 2000)); }

export function parseVenue(text, unitsChoice = 'auto') {
  const dxf = new DxfParser().parseSync(text);
  const insunits = dxf.header?.$INSUNITS;
  let scale = NAMED_UNITS[unitsChoice] ?? INSUNITS_TO_CM[insunits] ?? 0.1; // most venue plans are mm

  const segs = [];
  const push = (a, b, layer) => segs.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, layer });
  const arcPts = (c, r, a0, a1) => {
    if (a1 < a0) a1 += Math.PI * 2;
    const n = Math.max(8, Math.ceil((a1 - a0) / (Math.PI / 24)));
    return Array.from({ length: n + 1 }, (_, i) => {
      const a = a0 + ((a1 - a0) * i) / n;
      return { x: c.x + r * Math.cos(a), y: c.y + r * Math.sin(a) };
    });
  };
  const chain = (pts, layer, closed) => {
    for (let i = 0; i < pts.length - 1; i++) push(pts[i], pts[i + 1], layer);
    if (closed && pts.length > 2) push(pts[pts.length - 1], pts[0], layer);
  };

  for (const e of dxf.entities || []) {
    const layer = e.layer || '0';
    switch (e.type) {
      case 'LINE': push(e.vertices[0], e.vertices[1], layer); break;
      case 'LWPOLYLINE':
      case 'POLYLINE': chain(e.vertices, layer, e.shape || e.closed); break;
      case 'CIRCLE': chain(arcPts(e.center, e.radius, 0, Math.PI * 2), layer); break;
      case 'ARC': chain(arcPts(e.center, e.radius, e.startAngle, e.endAngle), layer); break;
      default: break; // text, hatches, dimensions and inserts are skipped
    }
  }
  if (!segs.length) throw new Error('No lines found in this DXF.');

  // Normalise to cm with origin at bottom-left.
  let minX = Infinity, minY = Infinity;
  segs.forEach((s) => { minX = Math.min(minX, s.x1, s.x2); minY = Math.min(minY, s.y1, s.y2); });
  segs.forEach((s) => {
    s.x1 = (s.x1 - minX) * scale; s.x2 = (s.x2 - minX) * scale;
    s.y1 = (s.y1 - minY) * scale; s.y2 = (s.y2 - minY) * scale;
  });
  const layers = {};
  segs.forEach((s) => (layers[s.layer] = true));
  return { segments: segs, layers, wallHeight: 320 };
}

export function venueBounds(venue) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const s of visibleSegments(venue)) {
    if (/dim/i.test(s.layer)) continue;
    minX = Math.min(minX, s.x1, s.x2); maxX = Math.max(maxX, s.x1, s.x2);
    minY = Math.min(minY, s.y1, s.y2); maxY = Math.max(maxY, s.y1, s.y2);
  }
  // The room walls define the bounds; a plan image only counts while no walls exist yet.
  if (venue?.image && !isFinite(minX)) { const im = venue.image; minX = im.x || 0; minY = im.y || 0; maxX = minX + im.w; maxY = minY + im.h; }
  if (!isFinite(minX)) return { minX: 0, minY: 0, maxX: 2000, maxY: 1500 };
  return { minX, minY, maxX, maxY };
}

export const visibleSegments = (venue) => (venue ? (venue.segments || []).filter((s) => venue.layers[s.layer] !== false) : []);

export function demoVenue() {
  // 28m × 18m hall with entrance gap, two columns and a window wall.
  const W = 2800, H = 1800, segs = [];
  const L = (x1, y1, x2, y2, layer = 'WALLS') => segs.push({ x1, y1, x2, y2, layer });
  L(0, 0, 1200, 0); L(1600, 0, W, 0); L(W, 0, W, H); L(W, H, 0, H); L(0, H, 0, 0);
  L(1200, 0, 1200, -40, 'DOORS'); L(1600, 0, 1600, -40, 'DOORS');
  for (const [cx, cy] of [[933, 900], [1866, 900]]) { L(cx - 25, cy - 25, cx + 25, cy - 25, 'COLUMNS'); L(cx + 25, cy - 25, cx + 25, cy + 25, 'COLUMNS'); L(cx + 25, cy + 25, cx - 25, cy + 25, 'COLUMNS'); L(cx - 25, cy + 25, cx - 25, cy - 25, 'COLUMNS'); }
  for (let x = 300; x < W - 300; x += 500) L(x, H - 15, x + 300, H - 15, 'WINDOWS');
  return { segments: segs, layers: { WALLS: true, DOORS: true, COLUMNS: true, WINDOWS: true }, wallHeight: 320, demo: true };
}

// ---------- Export: DXF R12 ASCII, in cm ----------
// Every furniture piece is a BLOCK (base point = centre, back of seats toward +Y, front toward -Y),
// placed with INSERT + rotation, so in AutoCAD each piece can be selected, moved and counted as one object.

export function footprint(p, item) {
  const c = Math.cos((p.rot * Math.PI) / 180), s = Math.sin((p.rot * Math.PI) / 180);
  const hw = item.w / 2, hd = item.d / 2;
  return [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]].map(([x, y]) => ({ x: p.x + x * c - y * s, y: p.y + x * s + y * c }));
}

const SEATING = ['sofa', 'armchair', 'club', 'slipper', 'channelSofa', 'bench', 'loungeChair', 'chair'];

// Top-view outline of one item in its own coordinates (cm).
export function itemOutline(it) {
  const e = [];
  const L = (x1, y1, x2, y2) => e.push({ t: 'LINE', x1, y1, x2, y2 });
  const rect = (hw, hd, cx = 0, cy = 0) => { L(cx - hw, cy - hd, cx + hw, cy - hd); L(cx + hw, cy - hd, cx + hw, cy + hd); L(cx + hw, cy + hd, cx - hw, cy + hd); L(cx - hw, cy + hd, cx - hw, cy - hd); };
  const hw = it.w / 2, hd = it.d / 2;
  if (it.kind === 'curvedSofa') {
    const g = curvedGeom(it), deg = (r) => (r * 180) / Math.PI;
    const back = Math.min(16, (g.R - g.r) / 3);
    for (const r of [g.R, g.r, g.R - back]) e.push({ t: 'ARC', x: 0, y: g.cy, r, a0: deg(g.a0), a1: deg(g.a1) });
    for (const a of [g.a0, g.a1]) L(Math.cos(a) * g.r, g.cy + Math.sin(a) * g.r, Math.cos(a) * g.R, g.cy + Math.sin(a) * g.R);
  } else if (isRound(it)) {
    e.push({ t: 'CIRCLE', x: 0, y: 0, r: hw });
    if (it.kind === 'pouf') e.push({ t: 'CIRCLE', x: 0, y: 0, r: hw - 4 }); // fringe line
    if (it.kind === 'bistro') e.push({ t: 'CIRCLE', x: 0, y: 0, r: Math.min(hw * 0.8, 28) }, { t: 'CIRCLE', x: 0, y: 0, r: 4 });
  } else {
    rect(hw, hd);
    if (SEATING.includes(it.kind)) {
      const back = Math.min(18, it.d * 0.22), arm = ['slipper', 'bench'].includes(it.kind) ? 0 : Math.min(15, it.w * 0.15);
      L(-hw, hd - back, hw, hd - back);                                  // backrest
      if (arm) { L(-hw + arm, -hd, -hw + arm, hd - back); L(hw - arm, -hd, hw - arm, hd - back); } // arms
    }
  }
  if (it.cloth) { const c = Math.max(it.w, it.d) * 0.75; L(0, -c, c, 0); L(c, 0, 0, c); L(0, c, -c, 0); L(-c, 0, 0, -c); }
  return e;
}

export const blockName = (it) => (it.invId || it.id || it.name).toString().toUpperCase().replace(/[^A-Z0-9]+/g, '_').slice(0, 30);

function writer() {
  const out = [];
  const g = (code, val) => out.push(String(code), typeof val === 'number' ? (Math.round(val * 100) / 100).toString() : String(val));
  const ent = (e, layer) => {
    if (e.t === 'LINE') { g(0, 'LINE'); g(8, layer); g(10, e.x1); g(20, e.y1); g(30, 0); g(11, e.x2); g(21, e.y2); g(31, 0); }
    if (e.t === 'CIRCLE') { g(0, 'CIRCLE'); g(8, layer); g(10, e.x); g(20, e.y); g(30, 0); g(40, e.r); }
    if (e.t === 'ARC') { g(0, 'ARC'); g(8, layer); g(10, e.x); g(20, e.y); g(30, 0); g(40, e.r); g(50, e.a0); g(51, e.a1); }
  };
  const text = (x, y, hgt, str, layer = 'LABELS') => { g(0, 'TEXT'); g(8, layer); g(10, x); g(20, y); g(30, 0); g(40, hgt); g(1, str); g(72, 1); g(11, x); g(21, y); g(31, 0); };
  const block = (name, ents, layer) => {
    g(0, 'BLOCK'); g(8, 0); g(2, name); g(70, 0); g(10, 0); g(20, 0); g(30, 0); g(3, name);
    ents.forEach((e) => ent(e, layer));
    g(0, 'ENDBLK'); g(8, 0);
  };
  const insert = (name, x, y, rot, layer) => { g(0, 'INSERT'); g(8, layer); g(2, name); g(10, x); g(20, y); g(30, 0); g(50, rot || 0); };
  const header = () => { g(0, 'SECTION'); g(2, 'HEADER'); g(9, '$ACADVER'); g(1, 'AC1009'); g(9, '$INSUNITS'); g(70, 5); g(0, 'ENDSEC'); };
  return { g, ent, text, block, insert, header, done: () => { g(0, 'EOF'); return out.join('\n'); } };
}

const layerOf = (it) => `FURN_${it.kind.replace(/[A-Z]/g, (m) => '_' + m).toUpperCase()}`;
const sizeLabel = (it) => `${it.w}x${it.d} H${it.h}cm`;

// One DXF per inventory item: block + one insert at 0,0 + size label.
export function itemDxf(it) {
  const w = writer();
  w.header();
  w.g(0, 'SECTION'); w.g(2, 'BLOCKS'); w.block(blockName(it), itemOutline(it), layerOf(it)); w.g(0, 'ENDSEC');
  w.g(0, 'SECTION'); w.g(2, 'ENTITIES');
  w.insert(blockName(it), 0, 0, 0, layerOf(it));
  w.text(0, -it.d / 2 - 15, 6, it.name);
  w.text(0, -it.d / 2 - 25, 5, sizeLabel(it));
  w.g(0, 'ENDSEC');
  return w.done();
}

export function exportDxf() {
  const w = writer();
  const items = [...new Set(state.placed.map(itemOf).filter(Boolean))];
  w.header();
  w.g(0, 'SECTION'); w.g(2, 'BLOCKS');
  items.forEach((it) => w.block(blockName(it), itemOutline(it), layerOf(it)));
  w.block('CHAIR', [{ t: 'LINE', x1: -22, y1: -22, x2: 22, y2: -22 }, { t: 'LINE', x1: 22, y1: -22, x2: 22, y2: 22 }, { t: 'LINE', x1: 22, y1: 22, x2: -22, y2: 22 }, { t: 'LINE', x1: -22, y1: 22, x2: -22, y2: -22 }, { t: 'LINE', x1: -22, y1: -16, x2: 22, y2: -16 }], 'FURN_CHAIRS');
  w.g(0, 'ENDSEC');
  w.g(0, 'SECTION'); w.g(2, 'ENTITIES');
  for (const s of visibleSegments(state.venue)) w.ent({ t: 'LINE', x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2 }, `VENUE_${s.layer}`.slice(0, 31));
  for (const tx of state.venue?.texts || []) if (state.venue.layers?.[tx.layer] !== false) { w.g(0, 'TEXT'); w.g(8, `VENUE_${tx.layer}`); w.g(10, tx.x); w.g(20, tx.y); w.g(30, 0); w.g(40, tx.h); w.g(1, tx.s); w.g(50, tx.rot || 0); w.g(72, 1); w.g(11, tx.x); w.g(21, tx.y); w.g(31, 0); }
  for (const p of state.placed) {
    const it = itemOf(p); if (!it) continue;
    w.insert(blockName(it), p.x, p.y, p.rot, layerOf(it));
    const a = (p.rot * Math.PI) / 180;
    for (const ch of chairPositions(it)) {
      const x = p.x + ch.x * Math.cos(a) - ch.y * Math.sin(a), y = p.y + ch.x * Math.sin(a) + ch.y * Math.cos(a);
      w.insert('CHAIR', x, y, p.rot + ((ch.a - Math.PI) * 180) / Math.PI, 'FURN_CHAIRS'); // chair block faces +Y
    }
    w.text(p.x, p.y, 12, it.name);
  }
  w.g(0, 'ENDSEC');
  return w.done();
}
