// 3D visualisation of the plan with camera presets and PNG renders.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { state, itemOf, emit } from './state.js';
import { venueBounds, visibleSegments } from './dxf.js';
import { buildItem, M } from './models.js';
import { texMat } from './textures.js';

const host = document.getElementById('threeHost');
let renderer, scene, camera, controls, root, lights, framed = false;
const groups = new Map(); // placed id → THREE.Group
let selBoxes = [];

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

  const loop = () => { requestAnimationFrame(loop); if (!host.offsetParent) return; controls.update(); selBoxes.forEach((b) => b.update()); renderer.render(scene, camera); };
  loop();
  initPicking();
}

// ---------- click to select, drag on the floor to move ----------
function initPicking() {
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hitPt = new THREE.Vector3();
  let drag = null, down = null;
  const el = renderer.domElement;
  const setRay = (e) => { const r = el.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); };
  const pidOf = (obj) => { while (obj && !obj.userData.pid) obj = obj.parent; return obj?.userData.pid; };
  el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    down = { x: e.clientX, y: e.clientY };
    setRay(e);
    const hits = ray.intersectObjects([...groups.values()], true);
    const pid = hits.length ? pidOf(hits[0].object) : null;
    if (!pid) return;
    const p = state.placed.find((q) => q.id === pid);
    if (!state.selection.includes(pid)) { state.selection = e.shiftKey ? [...state.selection, pid] : [pid]; state.selectedId = pid; emit('select'); }
    if (p.locked) return;
    ray.ray.intersectPlane(floor, hitPt);
    drag = { start: hitPt.clone(), items: state.placed.filter((q) => state.selection.includes(q.id) && !q.locked).map((q) => ({ q, x: q.x, y: q.y })) };
    controls.enabled = false;
    el.setPointerCapture(e.pointerId);
  });
  el.addEventListener('pointermove', (e) => {
    if (!drag) return;
    setRay(e);
    if (!ray.ray.intersectPlane(floor, hitPt)) return;
    const dx = (hitPt.x - drag.start.x) / M, dy = -(hitPt.z - drag.start.z) / M;
    const snap = document.getElementById('snapToggle')?.checked ? (v) => Math.round(v / 10) * 10 : (v) => v;
    for (const o of drag.items) { o.q.x = snap(o.x + dx); o.q.y = snap(o.y + dy); }
    emit('move');
  });
  el.addEventListener('pointerup', (e) => {
    if (drag) { drag = null; controls.enabled = true; emit('placed'); return; }
    if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 4) { // plain click on empty space
      setRay(e);
      if (!ray.intersectObjects([...groups.values()], true).length && state.selection.length) { state.selection = []; state.selectedId = null; emit('select'); }
    }
    down = null;
  });
}

// Move existing models to match the plan (cheap — used while dragging). Returns false if a full rebuild is needed.
export function sync() {
  if (!root) return false;
  if (groups.size !== state.placed.length) { rebuild(); return true; }
  for (const p of state.placed) {
    const g = groups.get(p.id); if (!g) { rebuild(); return true; }
    g.position.set(p.x * M, 0, -p.y * M); g.rotation.y = (p.rot * Math.PI) / 180;
  }
  highlight();
  return true;
}

export function highlight() {
  if (!scene) return;
  selBoxes.forEach((b) => scene.remove(b));
  selBoxes = state.selection.map((id) => groups.get(id)).filter(Boolean).map((g) => { const b = new THREE.BoxHelper(g, '#e8a24a'); scene.add(b); return b; });
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

export function rebuild() {
  if (!renderer) init();
  if (root) scene.remove(root);
  root = new THREE.Group();
  scene.add(root);
  const b = state.venue ? venueBounds(state.venue) : { minX: 0, minY: 0, maxX: 2000, maxY: 1500 };
  const W = (b.maxX - b.minX) * M, D = (b.maxY - b.minY) * M;
  const cx = (b.minX + b.maxX) / 2 * M, cz = -(b.minY + b.maxY) / 2 * M;
  const roles = state.mood.roles || {};

  // floor
  const floorMat = roles.floor ? texMat('walnut', roles.floor, Math.max(W, D) / 1.5, { roughness: 0.5 }) : mat('#cdbfae', { roughness: 0.55 });
  const floor = mesh(new THREE.PlaneGeometry(W + 4, D + 4), floorMat, cx, 0, cz);
  floor.rotation.x = -Math.PI / 2; root.add(floor);
  if (state.venue?.image && state.venue.layers?.PHOTO !== false) {
    const im = state.venue.image, tex = new THREE.TextureLoader().load(im.src);
    tex.colorSpace = THREE.SRGBColorSpace;
    const plan = mesh(new THREE.PlaneGeometry(im.w * M, im.h * M), new THREE.MeshStandardMaterial({ map: tex, transparent: true, opacity: 0.85, roughness: 0.9 }), ((im.x || 0) + im.w / 2) * M, 0.005, -((im.y || 0) + im.h / 2) * M);
    plan.rotation.x = -Math.PI / 2; plan.castShadow = false; root.add(plan);
  }

  // walls from venue segments
  const wallH = (state.venue?.wallHeight || 320) * M;
  const wallMat = texMat('linen', roles.walls || '#f2ece4', 3, { roughness: 0.95 });
  for (const s of visibleSegments(state.venue)) {
    const dx = (s.x2 - s.x1) * M, dz = -(s.y2 - s.y1) * M, len = Math.hypot(dx, dz);
    if (len < 0.05) continue;
    const isCol = /col/i.test(s.layer), isWin = /win|glass/i.test(s.layer);
    // Doors, furniture, labels and the client's old layout are only marked on the floor; fixed units are low counters.
    const flat = /door|furn|table|station|chair|label|note|text|dim|client|hatch|detail/i.test(s.layer);
    const fixed = !flat && /fix|counter|cabinet|bar/i.test(s.layer);
    const h = flat ? 0.01 : fixed ? 0.95 : isWin ? wallH * 0.75 : wallH;
    const m = flat ? mat('#6f5a52') : isWin ? mat('#cfe3ef', { transparent: true, opacity: 0.25, roughness: 0.05 }) : isCol ? mat('#e8e2da') : fixed ? mat('#d8cfc3') : wallMat;
    const wmesh = mesh(new THREE.BoxGeometry(len, h, flat ? 0.03 : isCol ? 0.5 : 0.15), m, (s.x1 + s.x2) / 2 * M, (isWin ? wallH * 0.15 : 0) + h / 2, -(s.y1 + s.y2) / 2 * M);
    wmesh.rotation.y = Math.atan2(-dz, dx);
    root.add(wmesh);
  }

  groups.clear();
  for (const p of state.placed) {
    const it = itemOf(p); if (!it) continue;
    const g = buildItem(it);
    g.userData.pid = p.id;
    g.position.set(p.x * M, 0, -p.y * M);
    g.rotation.y = (p.rot * Math.PI) / 180;
    groups.set(p.id, g);
    root.add(g);
  }

  setLighting(document.getElementById('lightMood').value, { cx, cz, W, D, wallH });
  highlight();
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
    candle: { bg: '#120d0a', amb: ['#ffb877', 0.18], key: ['#ffb877', 0.45], spot: '#ffa95e', exp: 1.15 },
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
    walk: [[cx - W * 0.25, eye, cz + D * 0.3], [cx + W * 0.1, 1.2, cz - D * 0.2]],
  };
  const [pos, tgt] = views[name] || views.perspective;
  camera.position.set(...pos); controls.target.set(...tgt); controls.update();
}

// Render the current camera at high resolution and return a PNG data URL (selection boxes hidden).
export function capture(w = 2400, h = 1350, type = 'image/png') {
  if (!renderer) rebuild();
  selBoxes.forEach((b) => (b.visible = false));
  const old = renderer.getSize(new THREE.Vector2());
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL(type, 0.9);
  renderer.setSize(old.x, old.y, false); camera.aspect = old.x / old.y || 1; camera.updateProjectionMatrix();
  selBoxes.forEach((b) => (b.visible = true));
  return url;
}

export function snapshot(name = 'render') {
  const a = document.createElement('a');
  a.href = capture(); a.download = `${(state.eventName || 'event').replace(/[\\/:*?"<>|]/g, '')} - ${name}.png`; a.click();
}

// Renders of several angles (for the presentation).
export function captureViews(names = ['perspective', 'entrance', 'walk', 'corner']) {
  rebuild();
  const saved = [camera.position.clone(), controls.target.clone()];
  const out = names.map((n) => { setCamera(n); return { name: n, url: capture(1600, 900, 'image/jpeg') }; });
  camera.position.copy(saved[0]); controls.target.copy(saved[1]); controls.update();
  return out;
}

export function renderAll() {
  ['perspective', 'entrance', 'walk', 'stage', 'corner', 'top'].forEach((v, i) => setTimeout(() => { setCamera(v); controls.update(); snapshot(v); }, i * 500));
}

// Close-up of a plan point (cm), used for detail checks.
export function lookAt(x, y) {
  camera.position.set(x * M + 2.5, 1.7, -y * M - 3); controls.target.set(x * M, 0.4, -y * M); controls.update();
}
