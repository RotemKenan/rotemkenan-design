// DXF import (venue) and export (new design plan). Internal unit: cm.
import DxfParser from 'dxf-parser';
import { state, itemOf, isRound } from './state.js';

const INSUNITS_TO_CM = { 1: 2.54, 2: 30.48, 4: 0.1, 5: 1, 6: 100 };
const NAMED_UNITS = { mm: 0.1, cm: 1, m: 100 };

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
    minX = Math.min(minX, s.x1, s.x2); maxX = Math.max(maxX, s.x1, s.x2);
    minY = Math.min(minY, s.y1, s.y2); maxY = Math.max(maxY, s.y1, s.y2);
  }
  if (!isFinite(minX)) return { minX: 0, minY: 0, maxX: 2000, maxY: 1500 };
  return { minX, minY, maxX, maxY };
}

export const visibleSegments = (venue) => (venue ? venue.segments.filter((s) => venue.layers[s.layer] !== false) : []);

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
export function footprint(p, item) {
  const c = Math.cos((p.rot * Math.PI) / 180), s = Math.sin((p.rot * Math.PI) / 180);
  const hw = item.w / 2, hd = item.d / 2;
  return [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]].map(([x, y]) => ({ x: p.x + x * c - y * s, y: p.y + x * s + y * c }));
}

export function exportDxf() {
  const out = [];
  const g = (code, val) => out.push(String(code), String(val));
  const line = (a, b, layer) => { g(0, 'LINE'); g(8, layer); g(10, a.x.toFixed(2)); g(20, a.y.toFixed(2)); g(30, 0); g(11, b.x.toFixed(2)); g(21, b.y.toFixed(2)); g(31, 0); };
  const layerName = (k) => `FURN_${k.replace(/[A-Z]/g, (m) => '_' + m).toUpperCase()}`;

  g(0, 'SECTION'); g(2, 'HEADER'); g(9, '$INSUNITS'); g(70, 5); g(0, 'ENDSEC');
  g(0, 'SECTION'); g(2, 'ENTITIES');
  for (const s of visibleSegments(state.venue)) line({ x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 }, `VENUE_${s.layer}`.slice(0, 31));
  for (const p of state.placed) {
    const it = itemOf(p); if (!it) continue;
    const layer = layerName(it.kind);
    if (isRound(it)) {
      g(0, 'CIRCLE'); g(8, layer); g(10, p.x.toFixed(2)); g(20, p.y.toFixed(2)); g(30, 0); g(40, (it.w / 2).toFixed(2));
    } else {
      const pts = footprint(p, it);
      pts.forEach((a, i) => line(a, pts[(i + 1) % 4], layer));
    }
    g(0, 'TEXT'); g(8, 'LABELS'); g(10, p.x.toFixed(2)); g(20, p.y.toFixed(2)); g(30, 0); g(40, 12); g(1, it.name); g(72, 1); g(11, p.x.toFixed(2)); g(21, p.y.toFixed(2)); g(31, 0);
  }
  g(0, 'ENDSEC'); g(0, 'EOF');
  return out.join('\n');
}
