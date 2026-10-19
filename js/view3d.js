// 3D visualisation of the plan with camera presets and PNG renders.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { state, itemOf } from './state.js';
import { venueBounds, visibleSegments } from './dxf.js';
import { buildItem, M } from './models.js';

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
