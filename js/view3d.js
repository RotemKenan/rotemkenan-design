// 3D visualisation of the plan with camera presets and PNG renders.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { state, itemOf } from './state.js';
import { venueBounds, visibleSegments } from './dxf.js';
import { chairPositions, curvedGeom } from './plan2d.js';

const M = 0.01; // cm → m
const host = document.getElementById('threeHost');
let renderer, scene, camera, controls, root, lights, framed = false;

function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  camera = new THREE.PerspectiveCamera(50, 1, 0.1, 500);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI / 2 - 0.02;

  const loop = () => { requestAnimationFrame(loop); controls.update(); renderer.render(scene, camera); };
  loop();
}

export function resize() {
  if (!renderer) return;
  const r = host.getBoundingClientRect();
  if (!r.width) return;
  renderer.setSize(r.width, r.height);
  camera.aspect = r.width / r.height; camera.updateProjectionMatrix();
}

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
  return mesh(geo, mat(color, { roughness: 0.95, side: THREE.DoubleSide }));
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

function buildItem(it) {
  const g = new THREE.Group();
  const w = it.w * M, d = it.d * M, h = it.h * M, c = it.color;
  const accent = state.mood.palette[1] || '#c8a46a';
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
      const m = mat(c, { roughness: 1 });
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
      const m = BLACK(), round = it.shape === 'round';
      g.add(mesh(round ? new THREE.CylinderGeometry(w / 2, w / 2, 0.05, 48) : new THREE.BoxGeometry(w, 0.05, d), m, 0, h - 0.025, 0));
      const lx = round ? w * 0.3 : w / 2 - 0.06, lz = round ? d * 0.3 : d / 2 - 0.06;
      for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { const l = cabrioleLeg(h - 0.05, sx, sz, m); l.position.set(lx * sx, 0, lz * sz); g.add(l); }
      if (it.cloth) { const cl = linenCloth(Math.max(w, d) * 1.05, Math.max(w, d), it.cloth, 0.14); cl.position.y = h + 0.005; g.add(cl); }
      break;
    }
    case 'bistro': {
      const m = mat('#141210', { roughness: 0.5, metalness: 0.4 });
      g.add(mesh(new THREE.CylinderGeometry(w / 2, w / 2 - 0.02, 0.04, 48), mat(c, { roughness: 0.5 }), 0, h - 0.02, 0));
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
      const m = mat(c, { roughness: 0.45, metalness: 0.05 });
      g.add(mesh(new THREE.BoxGeometry(w, 0.3, d), m, 0, 0.27, 0));
      g.add(mesh(new THREE.BoxGeometry(w - 0.2, 0.12, d - 0.15), m, 0, 0.48, 0.05));
      g.add(mesh(new THREE.BoxGeometry(w, h - 0.12, 0.16), m, 0, 0.12 + (h - 0.12) / 2, -d / 2 + 0.08));
      for (const x of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(0.12, 0.55, d), m, x * (w / 2 - 0.06), 0.4, 0));
      for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(mesh(new THREE.CylinderGeometry(0.02, 0.015, 0.12), mat('#3a2216'), x * (w / 2 - 0.06), 0.06, z * (d / 2 - 0.06)));
      break;
    }
    case 'slipper': {
      const m = mat(c, { roughness: 1 });
      g.add(mesh(new THREE.BoxGeometry(w, 0.44, d), m, 0, 0.24, 0));
      g.add(mesh(new THREE.BoxGeometry(w, h - 0.44, 0.12), m, 0, 0.46 + (h - 0.46) / 2, -d / 2 + 0.06));
      break;
    }
    case 'channelSofa': {
      const m = mat(c, { roughness: 0.9 });
      g.add(mesh(new THREE.BoxGeometry(w, 0.32, d), m, 0, 0.3, 0));
      g.add(mesh(new THREE.BoxGeometry(w, h - 0.14, 0.16), m, 0, 0.14 + (h - 0.14) / 2, -d / 2 + 0.08));
      for (const x of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(0.14, h - 0.2, d), m, x * (w / 2 - 0.07), 0.14 + (h - 0.2) / 2, 0));
      const groove = mat(shade(c, 0.6), { roughness: 1 });
      for (let x = -w / 2 + 0.12; x < w / 2 - 0.1; x += 0.1) g.add(mesh(new THREE.BoxGeometry(0.008, h - 0.3, 0.01), groove, x, 0.3 + (h - 0.3) / 2 + 0.07, -d / 2 + 0.165));
      for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(mesh(new THREE.CylinderGeometry(0.012, 0.006, 0.14), BLACK(), x * (w / 2 - 0.05), 0.07, z * (d / 2 - 0.05)));
      break;
    }
    case 'curvedSofa': {
      const cg = curvedGeom(it), m = mat(c, { roughness: 1 });
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
    default:
      g.add(mesh(new THREE.BoxGeometry(w, h, d), mat(c), 0, h / 2, 0));
  }
  for (const ch of chairPositions(it)) {
    const cm = chair(state.mood.palette[2] || '#e8e0d4');
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

export function rebuild() {
  if (!renderer) init();
  if (root) scene.remove(root);
  root = new THREE.Group();
  scene.add(root);
  const b = state.venue ? venueBounds(state.venue) : { minX: 0, minY: 0, maxX: 2000, maxY: 1500 };
  const W = (b.maxX - b.minX) * M, D = (b.maxY - b.minY) * M;
  const cx = (b.minX + b.maxX) / 2 * M, cz = -(b.minY + b.maxY) / 2 * M;
  const pal = state.mood.palette;

  // floor
  const floor = mesh(new THREE.PlaneGeometry(W + 4, D + 4), mat(pal[3] ? shade(pal[3], 0.9) : '#cdbfae', { roughness: 0.55 }), cx, 0, cz);
  floor.rotation.x = -Math.PI / 2; root.add(floor);

  // walls from venue segments
  const wallH = (state.venue?.wallHeight || 320) * M;
  const wallMat = mat(pal[0] ? shade(pal[0], 1) : '#f2ece4', { roughness: 0.95 });
  for (const s of visibleSegments(state.venue)) {
    const dx = (s.x2 - s.x1) * M, dz = -(s.y2 - s.y1) * M, len = Math.hypot(dx, dz);
    if (len < 0.05) continue;
    const isCol = /col/i.test(s.layer), isWin = /win|glass/i.test(s.layer);
    const h = isWin ? wallH * 0.75 : wallH;
    const m = isWin ? mat('#cfe3ef', { transparent: true, opacity: 0.25, roughness: 0.05 }) : isCol ? mat('#e8e2da') : wallMat;
    const wmesh = mesh(new THREE.BoxGeometry(len, h, isCol ? 0.5 : 0.15), m, (s.x1 + s.x2) / 2 * M, (isWin ? wallH * 0.15 : 0) + h / 2, -(s.y1 + s.y2) / 2 * M);
    wmesh.rotation.y = Math.atan2(-dz, dx);
    root.add(wmesh);
  }

  for (const p of state.placed) {
    const it = itemOf(p); if (!it) continue;
    const g = buildItem(it);
    g.position.set(p.x * M, 0, -p.y * M);
    g.rotation.y = (p.rot * Math.PI) / 180;
    root.add(g);
  }

  setLighting(document.getElementById('lightMood').value, { cx, cz, W, D, wallH });
  root.userData = { cx, cz, W, D, wallH };
  if (!framed) { setCamera('perspective'); framed = true; }
}

export function setLighting(mood, dims = root?.userData) {
  if (!dims) return;
  if (lights) scene.remove(lights);
  lights = new THREE.Group();
  const { cx, cz, W, D, wallH } = dims;
  const presets = {
    evening: { bg: '#1f1a17', amb: ['#ffdcb0', 0.35], key: ['#ffd2a0', 1.2], spot: '#ffbf80', exp: 1.0 },
    day: { bg: '#e9e4dc', amb: ['#ffffff', 0.8], key: ['#ffffff', 2.2], spot: '#ffffff', exp: 1.1 },
    party: { bg: '#120f1a', amb: ['#a58cff', 0.25], key: ['#ff9ad5', 0.8], spot: '#8fd3ff', exp: 1.0 },
  };
  const P = presets[mood] || presets.evening;
  scene.background = new THREE.Color(P.bg);
  renderer.toneMappingExposure = P.exp;
  lights.add(new THREE.HemisphereLight(P.amb[0], '#3a2f28', P.amb[1]));
  const key = new THREE.DirectionalLight(P.key[0], P.key[1]);
  key.position.set(cx + W * 0.3, wallH * 4, cz + D * 0.4); key.target.position.set(cx, 0, cz);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -W, right: W, top: D, bottom: -D, far: 200 });
  lights.add(key, key.target);
  // a soft grid of ceiling pin-spots
  const nx = Math.max(2, Math.round(W / 6)), nz = Math.max(2, Math.round(D / 6));
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const l = new THREE.PointLight(P.spot, mood === 'day' ? 2 : 6, 9, 2);
    l.position.set(cx - W / 2 + (W * (i + 0.5)) / nx, wallH - 0.2, cz - D / 2 + (D * (j + 0.5)) / nz);
    lights.add(l);
  }
  scene.add(lights);
}

export function setCamera(name) {
  const { cx, cz, W, D, wallH } = root.userData;
  const eye = 1.65;
  const stage = state.placed.find((p) => itemOf(p)?.kind === 'stage');
  const sx = stage ? stage.x * M : cx, sz = stage ? -stage.y * M : cz - D / 2;
  const views = {
    perspective: [[cx, Math.max(W, D) * 0.55, cz + D * 0.9], [cx, 0, cz]],
    top: [[cx, Math.max(W, D) * 1.1, cz + 0.01], [cx, 0, cz]],
    entrance: [[cx + (cx - sx) * 0.9, eye, cz + (cz - sz) * 0.9], [sx, 1, sz]],
    stage: [[sx, eye + 0.6, sz], [cx + (cx - sx), 0.8, cz + (cz - sz)]],
    corner: [[cx - W / 2 + 0.8, wallH - 0.3, cz + D / 2 - 0.8], [cx, 0.6, cz]],
  };
  const [pos, tgt] = views[name] || views.perspective;
  camera.position.set(...pos); controls.target.set(...tgt); controls.update();
}

export function snapshot(name = 'render') {
  const w = 2400, h = 1350;
  const old = renderer.getSize(new THREE.Vector2());
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL('image/png');
  renderer.setSize(old.x, old.y, false); camera.aspect = old.x / old.y; camera.updateProjectionMatrix();
  const a = document.createElement('a');
  a.href = url; a.download = `${(state.eventName || 'event').replace(/[^\w\- ]/g, '')} - ${name}.png`; a.click();
}

export function renderAll() {
  ['perspective', 'entrance', 'stage', 'corner', 'top'].forEach((v, i) => setTimeout(() => { setCamera(v); controls.update(); snapshot(v); }, i * 500));
}

// Close-up of a plan point (cm), used for detail checks.
export function lookAt(x, y) {
  camera.position.set(x * M + 2.5, 1.7, -y * M - 3); controls.target.set(x * M, 0.4, -y * M); controls.update();
}
