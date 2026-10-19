// Finds Rotem's inventory pieces inside a mood board: each PowerPoint picture is compared with every inventory
// photo (colour histogram + a small shape thumbnail, after trimming the white product background).
// Also: a rough "how many people can sit" estimate for any piece.
import { INVENTORY } from './state.js';
import { HE_NAMES } from './i18n.js';

const load = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });

async function features(src) {
  const img = await load(src);
  const S = 96, c = document.createElement('canvas'); c.width = S; c.height = S;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0, S, S);
  const d = g.getImageData(0, 0, S, S).data;
  // bounding box of the object (anything not near-white / near-transparent)
  let x0 = S, y0 = S, x1 = 0, y1 = 0;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = (y * S + x) * 4;
    if (d[i + 3] > 40 && (d[i] < 225 || d[i + 1] < 225 || d[i + 2] < 225)) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 <= x0 || y1 <= y0) { x0 = 0; y0 = 0; x1 = S - 1; y1 = S - 1; }
  const hist = new Float32Array(64), shape = new Float32Array(144);
  let n = 0;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const i = (y * S + x) * 4, r = d[i], gg = d[i + 1], b = d[i + 2];
    const bg = d[i + 3] < 40 || (r > 225 && gg > 225 && b > 225);
    const cx = Math.min(11, Math.floor(((x - x0) / (x1 - x0 + 1)) * 12)), cy = Math.min(11, Math.floor(((y - y0) / (y1 - y0 + 1)) * 12));
    shape[cy * 12 + cx] += bg ? 0 : 1;
    if (bg) continue;
    hist[(r >> 6) * 16 + (gg >> 6) * 4 + (b >> 6)]++; n++;
  }
  if (n) for (let k = 0; k < 64; k++) hist[k] /= n;
  const norm = Math.hypot(...shape) || 1; for (let k = 0; k < 144; k++) shape[k] /= norm;
  return { hist, shape, aspect: (x1 - x0 + 1) / (y1 - y0 + 1) };
}

function similarity(a, b) {
  let h = 0, s = 0;
  for (let k = 0; k < 64; k++) h += Math.min(a.hist[k], b.hist[k]);
  for (let k = 0; k < 144; k++) s += a.shape[k] * b.shape[k];
  const ar = Math.min(a.aspect, b.aspect) / Math.max(a.aspect, b.aspect);
  return 0.5 * h + 0.35 * s + 0.15 * ar;
}

let invFeatures = null;
async function inventoryFeatures() {
  if (!invFeatures) invFeatures = Promise.all(INVENTORY.map(async (it) => ({ it, f: await features(it.photo).catch(() => null) })));
  return invFeatures;
}

// Returns [{ inv, score, from: 'photo' | 'text', image }] — best inventory match per picture, plus names found in the slide text.
export async function findInventory(images, text = '') {
  const inv = (await inventoryFeatures()).filter((x) => x.f);
  const found = new Map();
  for (const src of images) {
    const f = await features(src).catch(() => null); if (!f) continue;
    const ranked = inv.map((x) => ({ it: x.it, s: similarity(f, x.f) })).sort((a, b) => b.s - a.s);
    const best = ranked[0];
    if (best && best.s > 0.72) {
      const prev = found.get(best.it.id);
      if (!prev || prev.score < best.s) found.set(best.it.id, { inv: best.it, score: best.s, from: 'photo', image: src, count: (prev?.count || 0) + 1 });
      else prev.count++;
    }
  }
  const low = text.toLowerCase();
  for (const it of INVENTORY) {
    const names = [it.name, HE_NAMES[it.id]].filter(Boolean).map((s) => s.toLowerCase());
    if (!found.has(it.id) && names.some((n) => low.includes(n))) found.set(it.id, { inv: it, score: 1, from: 'text', count: 1 });
  }
  return [...found.values()].sort((a, b) => b.score - a.score);
}

// Rough seating per piece: people sit about 60–65 cm apart on sofas; single seats count 1.
export function seatsOf(it) {
  if (!it) return 0;
  if (it.seats) return it.seats;
  switch (it.kind) {
    case 'curvedSofa': { const R = it.w / 2, r = (it.innerW || it.w - 110) / 2, mid = (R + r) / 2; const span = Math.acos(Math.max(-0.2, Math.min(0.95, (R - (it.d || R)) / r))); return Math.max(2, Math.floor((2 * span * mid) / 65)); }
    case 'sofa': case 'channelSofa': case 'bench': return Math.max(1, Math.floor((it.w - (it.kind === 'bench' ? 0 : 30)) / 60));
    case 'club': case 'slipper': case 'loungeChair': case 'armchair': case 'pouf': case 'chair': case 'stool': return 1;
    default: return 0;
  }
}
