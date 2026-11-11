// Venue looks: the real finishes of a known hall on top of its traced walls —
// floor, carpet, wall colour, column cladding, ceiling beams, chandeliers, windows and curtains.
// The ceiling group is shown only while the camera is inside the room (eye level / walking).
import * as THREE from 'three';
import { photoMat } from './textures.js';
import { visibleSegments } from './dxf.js';

const M = 0.01;

export const LOOKS = {
  kingDavid: { en: 'King David Hotel — President Hall', he: 'מלון המלך דוד — אולם הנשיאים', wallHeight: 500, walls: '#ecdcb3' },
};

// Events made before looks existed: recognise the hall by the name written on its plan and switch its look on once.
// A look the user turned off is stored as '' and is left alone.
export function autoLook(venue) {
  if (!venue || venue.look !== undefined) return;
  if ((venue.texts || []).some((t) => /President Hall/i.test(t.s))) {
    venue.look = 'kingDavid';
    if ((venue.wallHeight || 320) === 320) venue.wallHeight = LOOKS.kingDavid.wallHeight;
  }
}

const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra });
function canvasTex(w, h, draw, rx = 1, ry = 1) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 8;
  return t;
}
const box = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; return o; };

// ---- painted patterns, drawn after the hall's photos ----
// navy carpet with pale-blue and cream scrolls
const carpetTex = (rx, ry) => canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#1d2858'; g.fillRect(0, 0, w, h);
  g.lineCap = 'round';
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    const cx = x * 64 + (y % 2 ? 32 : 0) + 16, cy = y * 64 + 32;
    g.strokeStyle = '#7f94c8'; g.lineWidth = 5; g.beginPath(); g.arc(cx, cy, 16, 0.3, Math.PI * 1.6); g.stroke();
    g.strokeStyle = '#d8cfb4'; g.lineWidth = 3; g.beginPath(); g.arc(cx + 6, cy - 2, 8, Math.PI, Math.PI * 2.6); g.stroke();
  }
}, rx, ry);
// column capital: cream bands with navy-ringed rosettes between dark lines
const capitalTex = () => canvasTex(256, 160, (g, w, h) => {
  g.fillStyle = '#e8d6a0'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#3a2a20'; for (const y of [0, 74, 148]) g.fillRect(0, y, w, 12);
  for (const row of [43, 117]) for (let i = 0; i < 3; i++) {
    const x = 43 + i * 85;
    g.fillStyle = '#26315f'; g.beginPath(); g.arc(x, row, 25, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#9c3b28'; for (let k = 0; k < 8; k++) { const a = (k * Math.PI) / 4; g.beginPath(); g.arc(x + Math.cos(a) * 13, row + Math.sin(a) * 13, 6, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#e8d6a0'; g.beginPath(); g.arc(x, row, 6, 0, Math.PI * 2); g.fill();
  }
});
// ceiling beam sides: red and cream ribbon stripes, gold blocks, a pale-blue band of small rosettes
const beamTex = (rx) => canvasTex(256, 128, (g, w, h) => {
  g.fillStyle = '#efe3c0'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#b8473a'; for (let i = 0; i < 4; i++) g.fillRect(0, 14 + i * 14, w, 7);
  g.fillStyle = '#b39647'; for (let x = 0; x < w; x += 64) g.fillRect(x, 8, 12, 64);
  g.fillStyle = '#a9c0d0'; g.fillRect(0, 86, w, 34);
  g.fillStyle = '#26315f'; for (let x = 16; x < w; x += 32) { g.beginPath(); g.arc(x, 103, 9, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = '#c4573f'; for (let x = 16; x < w; x += 32) { g.beginPath(); g.arc(x, 103, 4, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = '#3a2a20'; g.fillRect(0, 80, w, 4); g.fillRect(0, 122, w, 6);
}, rx, 1);

// columns are drawn as 4 lines each: group them back into rectangles
function columnRects(segs) {
  const cols = segs.filter((s) => /col/i.test(s.layer)), out = [];
  for (const s of cols) {
    const mx = (s.x1 + s.x2) / 2, my = (s.y1 + s.y2) / 2;
    let r = out.find((o) => Math.abs(o.cx - mx) < 80 && Math.abs(o.cy - my) < 80);
    if (!r) out.push((r = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity, cx: mx, cy: my }));
    r.x0 = Math.min(r.x0, s.x1, s.x2); r.x1 = Math.max(r.x1, s.x1, s.x2); r.y0 = Math.min(r.y0, s.y1, s.y2); r.y1 = Math.max(r.y1, s.y1, s.y2);
  }
  return out.filter((r) => r.x1 - r.x0 > 20 && r.y1 - r.y0 > 20);
}

function column(r, H) {
  const g = new THREE.Group(), w = (r.x1 - r.x0) * M, d = (r.y1 - r.y0) * M;
  const marble = photoMat('assets/textures/kd-marble-red.jpg', Math.max(1, w / 0.45), Math.max(1, (H - 0.75) / 1.1), { roughness: 0.25, sheen: 0, clearcoat: 0.6, clearcoatRoughness: 0.2 });
  const base = 0.14, cap = 0.6;
  g.add(box(w + 0.06, base, d + 0.06, photoMat('assets/textures/kd-marble-red.jpg', 1, 0.2, { roughness: 0.3, sheen: 0, color: new THREE.Color('#9a8a82') }), 0, base / 2, 0));
  g.add(box(w, H - base - cap, d, marble, 0, base + (H - base - cap) / 2, 0));
  const capM = new THREE.MeshStandardMaterial({ map: capitalTex(), roughness: 0.7 }), cream = std('#e8d6a0');
  g.add(box(w + 0.1, cap, d + 0.1, [capM, capM, cream, cream, capM, capM], 0, H - cap / 2, 0));
  g.position.set(((r.x0 + r.x1) / 2) * M, 0, -((r.y0 + r.y1) / 2) * M);
  return g;
}

// one cluster of star-flower lamps hanging from the ceiling
function chandelier(H) {
  const g = new THREE.Group(), drop = Math.min(2.2, H * 0.45);
  const brass = std('#c9b27a', { metalness: 0.7, roughness: 0.35 }), glass = std('#fff6e0', { emissive: '#ffe2a8', emissiveIntensity: 0.9, roughness: 0.3 });
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, drop), brass); rod.position.y = H - drop / 2; g.add(rod);
  [[0.0, 7, 0.55], [0.55, 5, 0.38], [1.0, 3, 0.2]].forEach(([dy, n, rad]) => {
    const y = H - drop + dy;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, x = Math.cos(a) * rad, z = Math.sin(a) * rad;
      const star = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.07, 6, 1, true), glass); star.position.set(x, y, z); star.rotation.x = Math.PI; g.add(star);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, rad || 0.01), brass); arm.position.set(x / 2, y + 0.03, z / 2); arm.rotation.z = Math.PI / 2; arm.rotation.y = -a; g.add(arm);
    }
  });
  return g;
}

// a pleated curtain panel (plane with folds)
function curtain(w, h, mat) {
  const geo = new THREE.PlaneGeometry(w, h, 24, 1), p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin((p.getX(i) / w) * Math.PI * 9) * 0.04);
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat); m.castShadow = true; return m;
}

// Builds the look. Returns { group, ceiling, floorMat, wallMat } — view3d uses the materials for its floor and walls.
export function buildLook(venue, { wallH, cx, cz, W, D }) {
  const look = LOOKS[venue?.look]; if (!look) return null;
  const segs = visibleSegments(venue), group = new THREE.Group(), ceiling = new THREE.Group();
  const cols = columnRects(segs);
  cols.forEach((r) => group.add(column(r, wallH)));

  // main room box (President Hall: walls measured from the column grid, see the drawing's dimensions)
  let room;
  if (cols.length >= 4) {
    const x0 = Math.min(...cols.map((r) => r.x0)), x1 = Math.max(...cols.map((r) => r.x1)), y0 = Math.min(...cols.map((r) => r.y0)), y1 = Math.max(...cols.map((r) => r.y1));
    room = { x0: x0 - 473, x1: x1 + 287, y0: y0 - 222, y1: y1 + 214 };
  } else room = { x0: (cx - W / 2) / M, x1: (cx + W / 2) / M, y0: -(cz + D / 2) / M, y1: -(cz - D / 2) / M };
  const rw = (room.x1 - room.x0) * M, rd = (room.y1 - room.y0) * M, rcx = ((room.x0 + room.x1) / 2) * M, rcz = -((room.y0 + room.y1) / 2) * M;

  // carpet with a navy border, 1.1 m in from the walls (marble shows around it)
  const cw = rw - 2.2, cd = rd - 2.2;
  const border = new THREE.Mesh(new THREE.PlaneGeometry(cw, cd), std('#16204a', { roughness: 1 }));
  border.rotation.x = -Math.PI / 2; border.position.set(rcx, 0.006, rcz); border.receiveShadow = true; group.add(border);
  const carpet = new THREE.Mesh(new THREE.PlaneGeometry(cw - 0.5, cd - 0.5), new THREE.MeshStandardMaterial({ map: carpetTex((cw - 0.5) / 0.9, (cd - 0.5) / 0.9), roughness: 1 }));
  carpet.rotation.x = -Math.PI / 2; carpet.position.set(rcx, 0.008, rcz); carpet.receiveShadow = true; group.add(carpet);

  // ceiling: a plane facing down plus painted beams on the column lines and around the room
  // lit from below by the chandeliers: a little self-light keeps the cream ceiling from going dark
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W + 2, D + 2), std('#f2ead6', { side: THREE.DoubleSide, emissive: '#e9dcbb', emissiveIntensity: 0.45 }));
  ceil.rotation.x = Math.PI / 2; ceil.position.set(cx, wallH, cz); ceiling.add(ceil);
  const bw = 0.55, bh = 0.5, cream = std('#efe3c0', { emissive: '#e9dcbb', emissiveIntensity: 0.3 });
  const beam = (x0, z0, x1, z1) => {
    const len = Math.hypot(x1 - x0, z1 - z0), side = new THREE.MeshStandardMaterial({ map: beamTex(len / 1.2), roughness: 0.8, emissive: '#ffffff', emissiveMap: beamTex(len / 1.2), emissiveIntensity: 0.25 });
    const b = box(len, bh, bw, [cream, cream, cream, std('#a9c0d0', { emissive: '#a9c0d0', emissiveIntensity: 0.3 }), side, side], (x0 + x1) / 2, wallH - bh / 2, (z0 + z1) / 2);
    b.rotation.y = -Math.atan2(z1 - z0, x1 - x0); b.castShadow = false; ceiling.add(b);
  };
  const X0 = room.x0 * M, X1 = room.x1 * M, Z0 = -room.y1 * M, Z1 = -room.y0 * M;
  const colX = [...new Set(cols.map((r) => Math.round((r.x0 + r.x1) / 2)))].map((v) => v * M);
  const colZ = [...new Set(cols.map((r) => Math.round((r.y0 + r.y1) / 2)))].map((v) => -v * M);
  colZ.forEach((z) => beam(X0, z, X1, z));
  colX.forEach((x) => beam(x, Z0, x, Z1));
  beam(X0 + bw / 2, Z0 + bw / 2, X1 - bw / 2, Z0 + bw / 2); beam(X0 + bw / 2, Z1 - bw / 2, X1 - bw / 2, Z1 - bw / 2);
  beam(X0 + bw / 2, Z0 + bw / 2, X0 + bw / 2, Z1 - bw / 2); beam(X1 - bw / 2, Z0 + bw / 2, X1 - bw / 2, Z1 - bw / 2);

  // chandeliers in the middle of each ceiling bay between the beams
  const xs = [X0, ...colX.sort((a, b) => a - b), X1], zs = [Z0, ...colZ.sort((a, b) => a - b), Z1];
  for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < zs.length - 1; j++) {
    const ch = chandelier(wallH), sx = xs[i + 1] - xs[i], sz = zs[j + 1] - zs[j];
    const n = sx > 6 ? 2 : 1; // long bays get two
    for (let k = 0; k < n; k++) { const c = ch.clone(); c.position.set(xs[i] + (sx * (k + 0.5)) / n, 0, zs[j] + sz / 2); ceiling.add(c); }
  }

  // tall windows with damask curtains on the walls of the bay beyond the main room
  const curtainMat = photoMat('assets/textures/kd-curtain.jpg', 2, 1, { side: THREE.DoubleSide, roughness: 0.85 });
  const daylight = std('#f6f3e8', { emissive: '#fff8e6', emissiveIntensity: 0.7, roughness: 0.2 });
  for (const s of segs) {
    if (!/wall/i.test(s.layer) || Math.max(s.x1, s.x2) > room.x0 - 30) continue;
    const len = Math.hypot(s.x2 - s.x1, s.y2 - s.y1) * M; if (len < 1.5) continue;
    const mx = ((s.x1 + s.x2) / 2) * M, mz = -((s.y1 + s.y2) / 2) * M;
    let nx = -(s.y2 - s.y1), nz = -(s.x2 - s.x1); const nl = Math.hypot(nx, nz); nx /= nl; nz /= nl;
    if ((rcx - mx) * nx + (rcz - mz) * nz < 0) { nx = -nx; nz = -nz; } // face into the room
    const ang = Math.atan2(nx, nz), wh = Math.min(3.4, wallH * 0.68);
    const win = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(1.3, len - 1.4), wh), daylight);
    win.position.set(mx + nx * 0.09, 0.7 + wh / 2, mz + nz * 0.09); win.rotation.y = ang; group.add(win);
    const ch = wallH - 0.35;
    for (const side of [-1, 1]) {
      const c = curtain(0.75, ch, curtainMat), off = Math.min(1.3, len - 1.4) / 2 + 0.2;
      c.position.set(mx + nx * 0.16 + Math.cos(ang) * side * off, ch / 2 + 0.02, mz + nz * 0.16 - Math.sin(ang) * side * off); c.rotation.y = ang; group.add(c);
    }
    const val = box(Math.min(len, 2.6), 0.4, 0.08, curtainMat, mx + nx * 0.18, wallH - 0.2, mz + nz * 0.18); val.rotation.y = ang; group.add(val);
  }

  // dark wood doors with glass panes in each door opening (pairs of door leaves on the plan), wall above them
  const doorTex = canvasTex(128, 256, (g, w, h) => {
    g.fillStyle = '#3b1f14'; g.fillRect(0, 0, w, h);
    for (const x0 of [8, 68]) for (let j = 0; j < 6; j++) { g.fillStyle = j === 5 ? '#4a2a1c' : '#b9c4c6'; g.fillRect(x0 + 6, 10 + j * 40, 40, 32); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x0 + 8, 12 + j * 40, 12, 28); }
  });
  const doorMat = new THREE.MeshStandardMaterial({ map: doorTex, roughness: 0.45 }), lintelMat = std(look.walls, { roughness: 0.92 });
  const leaves = segs.filter((q) => /door/i.test(q.layer)).map((q) => ({ q, len: Math.hypot(q.x2 - q.x1, q.y2 - q.y1) })).filter((o) => o.len > 50 && o.len < 160);
  // a leaf line starts at its hinge, on the wall
  const hinge = (q) => q; // (x1, y1) is the hinge in the traced plans
  const used = new Set();
  for (const a of leaves) {
    if (used.has(a)) continue;
    const b2 = leaves.find((o) => o !== a && !used.has(o) && Math.hypot(o.q.x1 - a.q.x1, o.q.y1 - a.q.y1) < a.len * 2 + 20 && Math.hypot(o.q.x1 - a.q.x1, o.q.y1 - a.q.y1) > 30);
    if (!b2) continue;
    used.add(a); used.add(b2);
    const A = hinge(a.q), B = hinge(b2.q), wdt = Math.hypot(B.x1 - A.x1, B.y1 - A.y1) * M;
    const mx = ((A.x1 + B.x1) / 2) * M, mz = -((A.y1 + B.y1) / 2) * M, ang = -Math.atan2(-(B.y1 - A.y1), B.x1 - A.x1);
    const dh = Math.min(3.0, wallH - 0.4);
    const d = box(wdt, dh, 0.08, doorMat, mx, dh / 2, mz); d.rotation.y = ang; group.add(d);
    const l = box(wdt, wallH - dh, 0.15, lintelMat, mx, dh + (wallH - dh) / 2, mz); l.rotation.y = ang; group.add(l);
  }

  group.add(ceiling);
  const floorMat = photoMat('assets/textures/kd-marble-floor.jpg', W / 0.7, D / 0.7, { roughness: 0.3, sheen: 0, clearcoat: 0.4 });
  const wallMat = std(look.walls, { roughness: 0.92 });
  return { group, ceiling, floorMat, wallMat, room: { cx: rcx, cz: rcz, W: rw, D: rd } };
}
