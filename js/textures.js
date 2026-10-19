// Procedural, seamless material textures (velvet, leather, linen, walnut, lacquer, cast iron).
// Textures are greyscale detail maps; the furniture colour tints them, so recolouring keeps the texture.
import * as THREE from 'three';

const SIZE = 512;
const cache = new Map();

function rng(seed) { return () => ((seed = (seed * 16807) % 2147483647) / 2147483647); }

// Tileable value noise
function noise(cells, rand) {
  const g = Array.from({ length: cells * cells }, rand);
  const at = (x, y) => g[((y + cells) % cells) * cells + ((x + cells) % cells)];
  return (u, v) => {
    const x = u * cells, y = v * cells, xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = at(xi, yi) + (at(xi + 1, yi) - at(xi, yi)) * sx;
    const b = at(xi, yi + 1) + (at(xi + 1, yi + 1) - at(xi, yi + 1)) * sx;
    return a + (b - a) * sy;
  };
}
const fbm = (layers) => (u, v) => layers.reduce((s, [n, w]) => s + n(u, v) * w, 0);

const PAINTERS = {
  velvet(u, v, n) { return 0.78 + 0.16 * n.soft(u, v) + 0.06 * n.fine(u, v) + 0.05 * Math.sin((u + n.soft(u, v) * 0.3) * Math.PI * 6); },
  leather(u, v, n) {
    const crack = Math.abs(n.cell(u, v) - 0.5) < 0.012 ? -0.18 : 0;
    return 0.7 + 0.25 * n.soft(u, v) + 0.08 * n.fine(u, v) + crack;
  },
  linen(u, v, n, x, y) {
    const weave = ((x >> 1) % 2 === (y >> 1) % 2) ? 0.04 : -0.04;
    const slub = Math.max(0, n.lineU(v) - 0.75) * 0.5 - Math.max(0, n.lineV(u) - 0.8) * 0.4;
    return 0.9 + weave + slub + 0.05 * n.fine(u, v);
  },
  walnut(u, v, n) {
    const ring = Math.sin((v * 22 + n.soft(u, v) * 6 + n.fine(u, v) * 0.6) * Math.PI);
    return 0.62 + 0.18 * ring * ring + 0.12 * n.soft(u, v) + 0.06 * n.fine(u * 0.2, v);
  },
  lacquer(u, v, n) { return 0.92 + 0.08 * n.soft(u, v); },
  iron(u, v, n) { return 0.75 + 0.2 * n.fine(u, v) + 0.05 * n.soft(u, v); },
};

const PBR = {
  velvet: { roughness: 1, sheen: 1, sheenRoughness: 0.4 },
  leather: { roughness: 0.5, metalness: 0.05, clearcoat: 0.25 },
  linen: { roughness: 0.95 },
  walnut: { roughness: 0.55, clearcoat: 0.2 },
  lacquer: { roughness: 0.25, clearcoat: 0.6 },
  iron: { roughness: 0.6, metalness: 0.5 },
};

function makeTexture(type) {
  if (cache.has(type)) return cache.get(type);
  const rand = rng(type.split('').reduce((a, c) => a + c.charCodeAt(0) * 97, 7));
  const n = {
    soft: fbm([[noise(4, rand), 0.6], [noise(8, rand), 0.4]]),
    fine: fbm([[noise(64, rand), 0.5], [noise(128, rand), 0.5]]),
    cell: noise(12, rand),
  };
  n.lineU = ((f) => (v) => f(0.5, v))(noise(96, rand));
  n.lineV = ((f) => (u) => f(u, 0.3))(noise(96, rand));
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(SIZE, SIZE);
  const paint = PAINTERS[type];
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    const val = Math.max(0, Math.min(1, paint(x / SIZE, y / SIZE, n, x, y)));
    const i = (y * SIZE + x) * 4;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = val * 255; img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.name = type;
  cache.set(type, tex);
  return tex;
}

// repeat = how many tiles across a face (≈ 1 tile per 50cm looks right for fabrics).
export function texMat(type, color, repeat = 1, extra = {}) {
  const base = makeTexture(type);
  const map = base.clone();
  map.needsUpdate = true;
  map.repeat.set(repeat, repeat);
  return new THREE.MeshPhysicalMaterial({ color, map, bumpMap: map, bumpScale: type === 'linen' || type === 'leather' ? 1.2 : 0.4, ...PBR[type], ...(PBR[type].sheen ? { sheenColor: new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.35) } : {}), ...extra });
}

export const TEXTURE_TYPES = Object.keys(PAINTERS);

// Fabric from a real photo crop (patterned velvets, cushion prints, fringe). Tinted white = original colours.
const loader = new THREE.TextureLoader();
const photoCache = new Map();
const pending = new Set();
function photoTexture(url) {
  if (photoCache.has(url)) return photoCache.get(url);
  let done;
  const p = new Promise((r) => (done = r));
  pending.add(p);
  const tex = loader.load(url, () => { pending.delete(p); done(); }, undefined, () => { pending.delete(p); done(); });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  photoCache.set(url, tex);
  return tex;
}
export function photoMat(url, rx = 1, ry = 1, extra = {}) {
  const map = photoTexture(url).clone();
  map.repeat.set(rx, ry);
  return new THREE.MeshPhysicalMaterial({ map, roughness: 0.9, sheen: 0.6, sheenRoughness: 0.5, sheenColor: new THREE.Color('#fff2e0'), ...extra });
}
// Resolves once every photo texture requested so far has loaded (needed before exporting GLB files).
export const texturesReady = () => Promise.all([...pending]);
