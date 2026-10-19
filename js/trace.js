// Turns a plan image (screenshot / photo of a drawing) into CAD-like line segments.
// Dark pixels are grouped into connected shapes; tiny shapes (text, dimension numbers) are dropped;
// the rest is vectorised into horizontal and vertical strokes (curves become short steps).

const DARK = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b < 150 || (r > 150 && g < 100 && b < 100);

export async function traceImage(src, maxW = 1600) {
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  const N = Math.min(maxW, img.width), M = Math.round((img.height * N) / img.width);
  const c = document.createElement('canvas'); c.width = N; c.height = M;
  const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0, N, M);
  const px = ctx.getImageData(0, 0, N, M).data;
  const mask = new Uint8Array(N * M);
  for (let i = 0; i < N * M; i++) mask[i] = DARK(px[i * 4], px[i * 4 + 1], px[i * 4 + 2]) ? 1 : 0;

  // Keep only connected shapes big enough to be architecture (drops letters and numbers).
  const keep = new Uint8Array(N * M), seen = new Uint8Array(N * M), minSize = Math.max(14, N * 0.035);
  for (let s = 0; s < N * M; s++) {
    if (!mask[s] || seen[s]) continue;
    const stack = [s], comp = []; seen[s] = 1;
    let x0 = N, x1 = 0, y0 = M, y1 = 0;
    while (stack.length) {
      const p = stack.pop(); comp.push(p);
      const x = p % N, y = (p / N) | 0;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= N || ny >= M) continue;
        const q = ny * N + nx; if (mask[q] && !seen[q]) { seen[q] = 1; stack.push(q); }
      }
    }
    if (Math.max(x1 - x0, y1 - y0) >= minSize) for (const p of comp) keep[p] = 1;
  }

  // Runs along one axis, merged across neighbouring rows/columns into strokes.
  const strokes = [];
  const scan = (horizontal) => {
    const A = horizontal ? M : N, B = horizontal ? N : M, at = (a, b) => keep[horizontal ? a * N + b : b * N + a];
    let open = [];
    for (let a = 0; a <= A; a++) {
      const runs = [];
      if (a < A) for (let b = 0; b < B; ) { if (!at(a, b)) { b++; continue; } let e = b; while (e < B && at(a, e)) e++; runs.push([b, e - 1]); b = e; }
      const next = [];
      for (const r of runs) {
        const g = open.find((o) => Math.abs(o.s - r[0]) <= 2 && Math.abs(o.e - r[1]) <= 2 && !o.used);
        if (g) { g.used = true; next.push({ s: Math.min(g.s, r[0]), e: Math.max(g.e, r[1]), a0: g.a0, a1: a }); }
        else next.push({ s: r[0], e: r[1], a0: a, a1: a });
      }
      for (const o of open) if (!o.used) {
        const len = o.e - o.s + 1, thick = o.a1 - o.a0 + 1;
        if (len >= 3 && len >= thick * 1.5) strokes.push(horizontal ? { x1: o.s, y1: (o.a0 + o.a1) / 2, x2: o.e + 1, y2: (o.a0 + o.a1) / 2, len } : { x1: (o.a0 + o.a1) / 2, y1: o.s, x2: (o.a0 + o.a1) / 2, y2: o.e + 1, len });
      }
      open = next.map((o) => ({ ...o, used: false }));
    }
  };
  scan(true); scan(false);
  return { strokes, N, M };
}

// Convert traced strokes (image pixels) to venue segments (cm) for an image placed at im {x,y,w,h},
// sorting them into layers: long strokes on the room outline are walls, the rest are drawing details.
export function strokesToSegments({ strokes, N, M }, im, room) {
  const X = (u) => im.x + (u / N) * im.w, Y = (v) => im.y + im.h - (v / M) * im.h;
  const near = (v, t) => Math.abs(v - t) < 35;
  return strokes.map((s) => {
    const seg = { x1: X(s.x1), y1: Y(s.y1), x2: X(s.x2), y2: Y(s.y2) };
    const len = Math.hypot(seg.x2 - seg.x1, seg.y2 - seg.y1);
    const horiz = Math.abs(seg.y2 - seg.y1) < 1, mx = (seg.x1 + seg.x2) / 2, my = (seg.y1 + seg.y2) / 2;
    const onOutline = horiz ? (near(my, 0) || near(my, room.L)) && mx > -35 && mx < room.W + 35
      : (near(mx, 0) || near(mx, room.W)) && my > -35 && my < room.L + 35;
    seg.layer = len >= 25 && onOutline ? 'WALLS' : 'DETAIL';
    return seg;
  }).filter((s) => Math.hypot(s.x2 - s.x1, s.y2 - s.y1) > 2);
}

// Dimension lines with ticks and labels outside the room (width along the top, length on the left).
export function dimensionsFor(W, L) {
  const off = 70, tick = 15, segs = [], texts = [];
  const add = (x1, y1, x2, y2) => segs.push({ x1, y1, x2, y2, layer: 'DIMENSIONS' });
  add(0, L + off, W, L + off); add(0, L + off - tick, 0, L + off + tick); add(W, L + off - tick, W, L + off + tick);
  add(-off, 0, -off, L); add(-off - tick, 0, -off + tick, 0); add(-off - tick, L, -off + tick, L);
  texts.push({ x: W / 2, y: L + off + 22, h: 26, s: `${(W / 100).toFixed(2)} m`, rot: 0, layer: 'DIMENSIONS' });
  texts.push({ x: -off - 24, y: L / 2, h: 26, s: `${(L / 100).toFixed(2)} m`, rot: 90, layer: 'DIMENSIONS' });
  return { segs, texts };
}

// Reads the dimension numbers written just outside the room on a plan image (e.g. "18.84" above the top wall,
// "9.15" written sideways next to a side wall). room = the room's corners in image pixels {x0,y0,x1,y1}.
// Returns { w, l } in metres when found. Uses Tesseract OCR from the CDN; any failure just returns {}.
const OCR_URL = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.esm.min.js';
export async function readDimensions(src, room) {
  try {
    const T = await import(OCR_URL), createWorker = T.createWorker || T.default?.createWorker;
    const worker = await createWorker('eng');
    await worker.setParameters({ tessedit_char_whitelist: '0123456789.,', tessedit_pageseg_mode: '11' });
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
    const { x0, y0, x1, y1 } = room, W = x1 - x0, H = y1 - y0, k = 3;
    // Crop a strip (optionally turned a quarter), enlarge it and erase everything bigger than a character.
    const strip = (x, y, w, h, dir) => {
      const c = document.createElement('canvas'), turned = dir !== 0;
      c.width = Math.round((turned ? h : w) * k); c.height = Math.round((turned ? w : h) * k);
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
      g.translate(c.width / 2, c.height / 2); g.rotate((dir * Math.PI) / 2);
      g.drawImage(img, x, y, w, h, (-w * k) / 2, (-h * k) / 2, w * k, h * k);
      return textOnly(c, (img.width / 70) * k);
    };
    const read = async (c) => readNums((await worker.recognize(c)).data.text);
    const readNums = (tx) => (tx.match(/\d{1,4}(?:[.,]\d{1,2})?/g) || [])
      .filter((s) => s.replace(/\D/g, '').length >= 3).map((s) => toMetres(Number(s.replace(',', '.')))).filter((m) => m >= 2 && m <= 200);
    const bh = H * 0.15, bw = W * 0.1;
    const across = [...(await read(strip(x0, y0 - bh, W, bh * 1.15, 0))), ...(await read(strip(x0, y1 - bh * 0.15, W, bh * 1.15, 0)))];
    const down = [];
    for (const dir of [1, -1]) down.push(...(await read(strip(x1 - bw * 0.2, y0, bw * 1.2, H, dir))), ...(await read(strip(x0 - bw, y0, bw * 1.2, H, dir))));
    // The whole plan read normally (no digit-only filter) often catches the horizontal size best.
    await worker.setParameters({ tessedit_char_whitelist: '', tessedit_pageseg_mode: '3' });
    const page = (await read(img)).filter((m) => !down.includes(m));
    if (page.length) across.unshift(...page);
    await worker.terminate();
    const w = across.filter((m) => !down.includes(m))[0] ?? across[0], l = down.filter((m) => m !== w).sort((a, b) => b - a)[0];
    return { w, l };
  } catch { return {}; }
}

// Keeps only character-sized dark shapes; long lines (walls, dimension lines, door swings) are erased.
function textOnly(c, maxSide) {
  const g = c.getContext('2d'), N = c.width, M = c.height, d = g.getImageData(0, 0, N, M), px = d.data;
  const dark = new Uint8Array(N * M), seen = new Uint8Array(N * M);
  for (let i = 0; i < N * M; i++) dark[i] = px[i * 4] * 0.3 + px[i * 4 + 1] * 0.59 + px[i * 4 + 2] * 0.11 < 160 ? 1 : 0;
  for (let s0 = 0; s0 < N * M; s0++) {
    if (!dark[s0] || seen[s0]) continue;
    const st = [s0], comp = []; seen[s0] = 1;
    let xa = N, xb = 0, ya = M, yb = 0;
    while (st.length) {
      const p = st.pop(); comp.push(p);
      const x = p % N, y = (p / N) | 0;
      if (x < xa) xa = x; if (x > xb) xb = x; if (y < ya) ya = y; if (y > yb) yb = y;
      for (const q of [p - 1, p + 1, p - N, p + N]) if (q >= 0 && q < N * M && dark[q] && !seen[q]) { seen[q] = 1; st.push(q); }
    }
    if (xb - xa > maxSide || yb - ya > maxSide) for (const p of comp) px[p * 4] = px[p * 4 + 1] = px[p * 4 + 2] = 255;
  }
  g.putImageData(d, 0, 0);
  return c;
}

// Plans give sizes in metres (18.84) or centimetres (1884): anything above 100 is taken as cm.
export const toMetres = (v) => (v > 100 ? v / 100 : v);
