// 3D models for every furniture kind. Units: metres (plan data is cm). Shared by the scene view,
// the inventory preview and the GLB exporter.
import * as THREE from 'three';
import { state } from './state.js';
import { chairPositions, curvedGeom } from './plan2d.js';
import { texMat, photoMat } from './textures.js';

export const M = 0.01; // cm → m

const mat = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0, ...opts });
const shade = (hex, k) => new THREE.Color(hex).multiplyScalar(k);

function mesh(geo, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  return m;
}

function chair(color) {
  const g = new THREE.Group();
  const frame = mat('#c8a46a', { metalness: 0.6, roughness: 0.35 });
  g.add(mesh(new THREE.BoxGeometry(0.42, 0.05, 0.42), mat(color), 0, 0.46, 0));
  g.add(mesh(new THREE.BoxGeometry(0.42, 0.45, 0.03), frame, 0, 0.7, -0.2));
  for (const [x, z] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) g.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.46), frame, x, 0.23, z));
  return g;
}

const BLACK = () => mat('#141210', { roughness: 0.35, metalness: 0.1 });

// Cabriole leg: curved tube with a small foot, kicking outward at the bottom.
function cabrioleLeg(h, sx, sz, m) {
  const out = 0.05;
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, h, 0), new THREE.Vector3(-out * sx, h * 0.6, -out * sz),
    new THREE.Vector3(out * 0.4 * sx, h * 0.18, out * 0.4 * sz), new THREE.Vector3(out * 0.9 * sx, 0.03, out * 0.9 * sz),
  ]);
  const g = new THREE.Group();
  g.add(mesh(new THREE.TubeGeometry(curve, 16, 0.028, 8), m));
  g.add(mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.04, 8), m, out * 0.9 * sx, 0.02, out * 0.9 * sz));
  return g;
}

// Square linen cloth draped over a top (corners hang lower).
function linenCloth(size, top, color, drop = 0.18) {
  const geo = new THREE.PlaneGeometry(size, size, 24, 24);
  geo.rotateX(-Math.PI / 2); geo.rotateY(Math.PI / 4);
  const pos = geo.attributes.position, half = top / 2;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), r = Math.max(Math.abs(x), Math.abs(z));
    const over = Math.max(0, Math.hypot(x, z) - half);
    pos.setY(i, -Math.min(over * 1.4, drop + r * 0.1));
  }
  geo.computeVertexNormals();
  return mesh(geo, texMat('linen', color, 4, { side: THREE.DoubleSide }));
}

function hurricane(h) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.3, 24, 1, true), mat('#d9d2c6', { transparent: true, opacity: 0.35, roughness: 0.05, side: THREE.DoubleSide }), 0.12, h + 0.16, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.02, 24), mat('#b08d57', { metalness: 0.8, roughness: 0.3 }), 0.12, h + 0.01, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.12, 12), mat('#f6efe2'), 0.12, h + 0.08, 0));
  const flame = new THREE.PointLight('#ffb866', 1.2, 2.5, 2); flame.position.set(0.12, h + 0.2, 0); g.add(flame);
  for (const x of [-0.1, -0.18]) {
    g.add(mesh(new THREE.CylinderGeometry(0.035, 0.02, 0.08, 16, 1, true), mat('#ffffff', { transparent: true, opacity: 0.3, roughness: 0.05, side: THREE.DoubleSide }), x, h + 0.15, x / 3));
    g.add(mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.1), mat('#ffffff', { transparent: true, opacity: 0.4 }), x, h + 0.06, x / 3));
  }
  return g;
}

export function buildItem(it, { chairs = true } = {}) {
  const g = new THREE.Group();
  const w = it.w * M, d = it.d * M, h = it.h * M, c = it.color;
  const accent = state.mood.roles?.florals || state.mood.palette[1] || '#c8a46a';
  switch (it.kind) {
    case 'roundTable': {
      g.add(mesh(new THREE.CylinderGeometry(w / 2 + 0.02, w / 2 + 0.15, h, 48, 1, true), mat(c, { side: THREE.DoubleSide, roughness: 0.9 }), 0, h / 2, 0));
      g.add(mesh(new THREE.CylinderGeometry(w / 2 + 0.02, w / 2 + 0.02, 0.01, 48), mat(c, { roughness: 0.9 }), 0, h, 0));
      g.add(centerpiece(accent, h));
      break;
    }
    case 'rectTable': case 'buffet': {
      g.add(mesh(new THREE.BoxGeometry(w, h, d), mat(c, { roughness: 0.9 }), 0, h / 2, 0));
      if (it.kind === 'rectTable') for (let x = -w / 2 + 0.6; x < w / 2 - 0.3; x += 1.2) { const cp = centerpiece(accent, h); cp.position.x = x; g.add(cp); }
      break;
    }
    case 'cocktail':
      g.add(mesh(new THREE.CylinderGeometry(w / 2, 0.25, h, 32, 1, true), mat(c, { side: THREE.DoubleSide }), 0, h / 2, 0));
      g.add(mesh(new THREE.CylinderGeometry(w / 2, w / 2, 0.02, 32), mat(c), 0, h, 0));
      break;
    case 'sofa': case 'armchair': {
      const m = texMat(it.finish || 'velvet', c, 2);
      g.add(mesh(new THREE.BoxGeometry(w, 0.42, d), m, 0, 0.21, 0));
      g.add(mesh(new THREE.BoxGeometry(w, h - 0.42, 0.18), m, 0, 0.42 + (h - 0.42) / 2, -d / 2 + 0.09));
      g.add(mesh(new THREE.BoxGeometry(0.15, 0.25, d), m, -w / 2 + 0.075, 0.55, 0));
      g.add(mesh(new THREE.BoxGeometry(0.15, 0.25, d), m, w / 2 - 0.075, 0.55, 0));
      break;
    }
    case 'bar':
      g.add(mesh(new THREE.BoxGeometry(w, h, d), mat(c, { roughness: 0.4 }), 0, h / 2, 0));
      g.add(mesh(new THREE.BoxGeometry(w + 0.06, 0.04, d + 0.1), mat('#e9e4dc', { roughness: 0.2 }), 0, h + 0.02, 0));
      break;
    case 'stage':
      g.add(mesh(new THREE.BoxGeometry(w, h, d), mat(c, { roughness: 0.5 }), 0, h / 2, 0));
      g.add(mesh(new THREE.BoxGeometry(1.4, 0.9, 0.6), mat('#1d1a18'), 0, h + 0.45, -d / 4));
      break;
    case 'danceFloor':
      g.add(mesh(new THREE.BoxGeometry(w, Math.max(h, 0.02), d), mat(c, { roughness: 0.08, metalness: 0.1 }), 0, 0.01, 0));
      break;
    case 'chuppah': {
      const m = mat(c, { roughness: 0.6 });
      for (const [x, z] of [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]]) g.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, h), m, x, h / 2, z));
      g.add(mesh(new THREE.BoxGeometry(w + 0.1, 0.03, d + 0.1), mat(c, { transparent: true, opacity: 0.7, side: THREE.DoubleSide }), 0, h, 0));
      for (const x of [-w / 2, w / 2]) g.add(mesh(new THREE.SphereGeometry(0.35, 16, 12), mat(accent, { roughness: 1 }), x, h, d / 2));
      break;
    }
    case 'plant':
      g.add(mesh(new THREE.CylinderGeometry(w / 3, w / 4, 0.4, 20), mat('#e7e0d6'), 0, 0.2, 0));
      const foliage = mesh(new THREE.SphereGeometry(w / 2, 20, 16), mat(c, { roughness: 1 }), 0, 0.4 + h * 0.35, 0);
      foliage.scale.set(1, (h * 0.8) / w, 1);
      g.add(foliage);
      break;
    case 'lowTable': {
      const m = texMat(it.finish || 'lacquer', c, 1), round = it.shape === 'round';
      g.add(mesh(round ? new THREE.CylinderGeometry(w / 2, w / 2, 0.05, 48) : new THREE.BoxGeometry(w, 0.05, d), m, 0, h - 0.025, 0));
      const lx = round ? w * 0.3 : w / 2 - 0.06, lz = round ? d * 0.3 : d / 2 - 0.06;
      for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { const l = cabrioleLeg(h - 0.05, sx, sz, m); l.position.set(lx * sx, 0, lz * sz); g.add(l); }
      if (it.cloth) { const cl = linenCloth(Math.max(w, d) * 1.05, Math.max(w, d), it.cloth, 0.14); cl.position.y = h + 0.005; g.add(cl); }
      break;
    }
    case 'bistro': {
      const m = texMat('iron', '#1a1816', 2);
      g.add(mesh(new THREE.CylinderGeometry(w / 2, w / 2 - 0.02, 0.04, 48), texMat(it.finish || 'lacquer', c, 1), 0, h - 0.02, 0));
      g.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, h - 0.2), m, 0, (h - 0.2) / 2 + 0.16, 0));
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2 + Math.PI / 4;
        const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0.22, 0), new THREE.Vector3(Math.cos(a) * 0.15, 0.2, Math.sin(a) * 0.15), new THREE.Vector3(Math.cos(a) * 0.27, 0.02, Math.sin(a) * 0.27));
        g.add(mesh(new THREE.TubeGeometry(curve, 12, 0.018, 6), m));
      }
      if (it.cloth) { const cl = linenCloth(1.05, w, it.cloth, 0.32); cl.position.y = h + 0.005; g.add(cl); }
      if (it.candle) g.add(hurricane(h));
      break;
    }
    case 'club': {
      const m = texMat(it.finish || 'leather', c, 1.5);
      g.add(mesh(new THREE.BoxGeometry(w, 0.3, d), m, 0, 0.27, 0));
      g.add(mesh(new THREE.BoxGeometry(w - 0.2, 0.12, d - 0.15), m, 0, 0.48, 0.05));
      g.add(mesh(new THREE.BoxGeometry(w, h - 0.12, 0.16), m, 0, 0.12 + (h - 0.12) / 2, -d / 2 + 0.08));
      for (const x of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(0.12, 0.55, d), m, x * (w / 2 - 0.06), 0.4, 0));
      for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(mesh(new THREE.CylinderGeometry(0.02, 0.015, 0.12), mat('#3a2216'), x * (w / 2 - 0.06), 0.06, z * (d / 2 - 0.06)));
      break;
    }
    case 'slipper': {
      const m = texMat(it.finish || 'velvet', c, 1.5);
      g.add(mesh(new THREE.BoxGeometry(w, 0.44, d), m, 0, 0.24, 0));
      g.add(mesh(new THREE.BoxGeometry(w, h - 0.44, 0.12), m, 0, 0.46 + (h - 0.46) / 2, -d / 2 + 0.06));
      break;
    }
    case 'channelSofa': {
      const m = texMat(it.finish || 'velvet', c, 3);
      g.add(mesh(new THREE.BoxGeometry(w, 0.32, d), m, 0, 0.3, 0));
      g.add(mesh(new THREE.BoxGeometry(w, h - 0.14, 0.16), m, 0, 0.14 + (h - 0.14) / 2, -d / 2 + 0.08));
      for (const x of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(0.14, h - 0.2, d), m, x * (w / 2 - 0.07), 0.14 + (h - 0.2) / 2, 0));
      const groove = mat(shade(c, 0.6), { roughness: 1 });
      for (let x = -w / 2 + 0.12; x < w / 2 - 0.1; x += 0.1) g.add(mesh(new THREE.BoxGeometry(0.008, h - 0.5, 0.01), groove, x, 0.46 + (h - 0.5) / 2, -d / 2 + 0.165));
      for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(mesh(new THREE.CylinderGeometry(0.012, 0.006, 0.14), BLACK(), x * (w / 2 - 0.05), 0.07, z * (d / 2 - 0.05)));
      break;
    }
    case 'curvedSofa': {
      const cg = curvedGeom(it), m = texMat(it.finish || 'velvet', c, 1.2);
      const band = (r0, r1, y0, y1) => {
        const s = new THREE.Shape();
        s.absarc(0, 0, r1 * M, cg.a0, cg.a1, false);
        s.absarc(0, 0, r0 * M, cg.a1, cg.a0, true);
        const geo = new THREE.ExtrudeGeometry(s, { depth: y1 - y0, bevelEnabled: false, curveSegments: 48 });
        geo.rotateX(-Math.PI / 2); // shape (x,y) → (x,-z); extrude goes up
        const mm = mesh(geo, m, 0, y0, -cg.cy * M);
        return mm;
      };
      g.add(band(cg.r, cg.R, 0.08, 0.45));          // seat
      g.add(band(cg.R - 14, cg.R, 0.45, h));        // back
      for (const f of [0.15, 0.5, 0.85]) {
        const a = cg.a0 + (cg.a1 - cg.a0) * f, rr = (cg.R + cg.r) / 2 * M;
        g.add(mesh(new THREE.BoxGeometry(0.07, 0.08, 0.07), BLACK(), Math.cos(a) * rr, 0.04, -cg.cy * M - Math.sin(a) * rr));
      }
      break;
    }
    case 'counter': { // wooden counter on a recessed plinth, brass trim, black marble top
      const wood = texMat('walnut', '#3a2a24', 2, { roughness: 0.5 }), brass = mat('#b8914a', { metalness: 0.85, roughness: 0.3 });
      const top = 0.04, plinth = 0.12;
      g.add(mesh(new THREE.BoxGeometry(w - 0.12, plinth, d - 0.12), wood, 0, plinth / 2, 0));
      g.add(mesh(new THREE.BoxGeometry(w - 0.02, h - plinth - top, d - 0.02), wood, 0, plinth + (h - plinth - top) / 2, 0));
      for (const y of [h - top - 0.16, plinth + 0.18]) g.add(mesh(new THREE.BoxGeometry(w, 0.025, d), brass, 0, y, 0));
      g.add(mesh(new THREE.BoxGeometry(w + 0.02, top, d + 0.02), brass, 0, h - top / 2, 0));
      g.add(mesh(new THREE.BoxGeometry(w - 0.03, 0.006, d - 0.03), texMat('marble', c, 2), 0, h + 0.003, 0));
      break;
    }
    case 'chair': {
      g.add(chair(c)); // back toward +y in plan, seat facing -y, like every seat
      break;
    }
    case 'pouf': {
      const r = w / 2, fringeH = h * 0.42;
      const tiles = 3, tileH = ((Math.PI * w) / tiles) * 0.38; // photo crops are ~2.6:1
      const body = it.texture ? photoMat(it.texture, tiles, (h - 0.02) / tileH) : texMat('velvet', c, 2);
      const top = it.texture ? photoMat(it.texture, 1.2, 1.2) : body;
      g.add(mesh(new THREE.CylinderGeometry(r, r, h - 0.02, 48, 1, true), body, 0, (h - 0.02) / 2, 0));
      const cap = mesh(new THREE.CylinderGeometry(r - 0.01, r, 0.04, 48), [body, top, top], 0, h - 0.02, 0);
      g.add(cap);
      const piping = texMat('velvet', new THREE.Color(it.trim || '#7a2418').multiplyScalar(0.6), 4);
      for (const y of [h - 0.05, h - 0.13]) { const t = mesh(new THREE.TorusGeometry(r + 0.004, 0.008, 8, 64), piping, 0, y, 0); t.rotation.x = Math.PI / 2; g.add(t); }
      const fringe = photoMat('assets/textures/fringe.jpg', 6, 1, { side: THREE.DoubleSide, color: new THREE.Color(it.trim || '#ffffff') });
      g.add(mesh(new THREE.CylinderGeometry(r + 0.012, r + 0.028, fringeH, 64, 1, true), fringe, 0, fringeH / 2 + 0.005, 0));
      const band = mesh(new THREE.TorusGeometry(r + 0.013, 0.012, 8, 64), piping, 0, fringeH, 0); band.rotation.x = Math.PI / 2; g.add(band);
      break;
    }
    case 'cushion': {
      const face = it.texture ? photoMat(it.texture, 1, 1) : texMat('velvet', c, 1);
      const side = texMat('velvet', it.trim || '#8a6a2a', 2);
      const cu = mesh(new THREE.BoxGeometry(w, h, d), [side, side, side, side, face, face], 0, h / 2, 0);
      g.add(cu);
      break;
    }
    case 'bench': {
      const m = texMat(it.finish || 'velvet', c, 2.5);
      g.add(mesh(new THREE.BoxGeometry(w, 0.33, d), m, 0, 0.12 + 0.165, 0));
      g.add(mesh(new THREE.BoxGeometry(w, h - 0.12, 0.15), m, 0, 0.12 + (h - 0.12) / 2, -d / 2 + 0.075));
      const groove = mat(shade(c, 0.55), { roughness: 1 });
      const panels = Math.max(2, Math.round(w / 0.4));
      for (let i = 1; i < panels; i++) g.add(mesh(new THREE.BoxGeometry(0.008, h - 0.47, 0.01), groove, -w / 2 + (w * i) / panels, 0.45 + (h - 0.45) / 2, -d / 2 + 0.152));
      for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(mesh(new THREE.CylinderGeometry(0.01, 0.007, 0.12), BLACK(), x * (w / 2 - 0.06), 0.06, z * (d / 2 - 0.06)));
      break;
    }
    case 'loungeChair': { // upholstered shell on a black steel frame with an X stretcher
      const m = texMat(it.finish || 'velvet', c, 1.5), steel = texMat('iron', '#151413', 2);
      const legH = 0.2;
      g.add(mesh(new THREE.BoxGeometry(w - 0.14, 0.18, d - 0.1), m, 0, legH + 0.09 + 0.12, 0.03));
      g.add(mesh(new THREE.BoxGeometry(w - 0.1, h - legH, 0.1), m, 0, legH + (h - legH) / 2, -d / 2 + 0.05));
      for (const x of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(0.08, 0.42, d), m, x * (w / 2 - 0.04), legH + 0.21 + 0.1, 0));
      for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(mesh(new THREE.CylinderGeometry(0.01, 0.01, legH + 0.1), steel, x * (w / 2 - 0.08), (legH + 0.1) / 2, z * (d / 2 - 0.08)));
      const diag = Math.hypot(w - 0.16, d - 0.16);
      for (const s of [1, -1]) { const b = mesh(new THREE.CylinderGeometry(0.008, 0.008, diag), steel, 0, 0.08, 0); b.rotation.z = Math.PI / 2; b.rotation.y = s * Math.atan2(d - 0.16, w - 0.16); g.add(b); }
      break;
    }
    default:
      g.add(mesh(new THREE.BoxGeometry(w, h, d), mat(c), 0, h / 2, 0));
  }
  if (chairs) for (const ch of chairPositions(it)) {
    const cm = chair(state.mood.roles?.chairs || state.mood.palette[2] || '#e8e0d4');
    cm.position.set(ch.x * M, 0, -ch.y * M);
    cm.rotation.y = ch.a + Math.PI;
    g.add(cm);
  }
  return g;
}

function centerpiece(color, h) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.25, 16), mat('#ffffff', { transparent: true, opacity: 0.5, roughness: 0.05 }), 0, h + 0.13, 0));
  g.add(mesh(new THREE.SphereGeometry(0.2, 16, 12), mat(color, { roughness: 1 }), 0, h + 0.35, 0));
  const flame = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.12, 12), mat('#fff5e0', { emissive: '#ffcc88', emissiveIntensity: 2 }), 0.28, h + 0.06, 0);
  g.add(flame);
  return g;
}
