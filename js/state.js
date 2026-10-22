// Central project state. All lengths are in centimetres.

// A shared view-only link (#v=…) opens the plan read-only: nothing can be moved and nothing is saved.
export const VIEWER = /^#v2?=/.test(location.hash);

export const PRESETS = [
  { kind: 'roundTable', name: 'Round table Ø180', w: 180, d: 180, h: 76, seats: 12, color: '#f4efe6' },
  { kind: 'roundTable', name: 'Round table Ø150', w: 150, d: 150, h: 76, seats: 10, color: '#f4efe6' },
  { kind: 'rectTable', name: 'Banquet table 240×100', w: 240, d: 100, h: 76, seats: 10, color: '#f4efe6' },
  { kind: 'rectTable', name: 'Knight table 400×120', w: 400, d: 120, h: 76, seats: 16, color: '#c9b79c' },
  { kind: 'rectTable', name: 'Bride & groom table', w: 300, d: 90, h: 76, seats: 2, color: '#ffffff' },
  { kind: 'cocktail', name: 'Cocktail table Ø70', w: 70, d: 70, h: 110, seats: 0, color: '#ffffff' },
  { kind: 'sofa', name: 'Lounge sofa', w: 210, d: 90, h: 80, seats: 0, color: '#d8cbb8' },
  { kind: 'armchair', name: 'Armchair', w: 80, d: 80, h: 80, seats: 0, color: '#d8cbb8' },
  { kind: 'bar', name: 'Bar counter', w: 400, d: 70, h: 110, seats: 0, color: '#7a6450' },
  { kind: 'stage', name: 'Stage / DJ', w: 500, d: 300, h: 40, seats: 0, color: '#3a3330' },
  { kind: 'danceFloor', name: 'Dance floor', w: 600, d: 600, h: 2, seats: 0, color: '#efe7da' },
  { kind: 'chuppah', name: 'Chuppah / Arch', w: 250, d: 250, h: 260, seats: 0, color: '#ffffff' },
  { kind: 'plant', name: 'Floral / plant', w: 60, d: 60, h: 150, seats: 0, color: '#8fa07e' },
  { kind: 'chair', name: 'Chair', w: 45, d: 50, h: 90, seats: 0, color: '#c8a46a' },
  { kind: 'buffet', name: 'Buffet station', w: 300, d: 80, h: 90, seats: 0, color: '#f4efe6' },
];

// Rotem's own inventory. Sizes in cm. `measured: false` = estimate, waiting for a tape-measure check
// in the Inventory tab. Edits are kept in this browser and can be exported / imported as JSON.
const I = (photo) => `assets/inventory/${photo}.jpg`;
const DEFAULT_INVENTORY = [
  { id: 'low-round-black', kind: 'lowTable', shape: 'round', legs: 'cabriole', name: 'Low round table, black cabriole', w: 90, d: 90, h: 45, seatH: 0, color: '#1b1918', finish: 'lacquer' },
  { id: 'low-round-linen', kind: 'lowTable', shape: 'round', legs: 'cabriole', cloth: '#ece5d8', name: 'Low round table + linen', w: 90, d: 90, h: 45, seatH: 0, color: '#1b1918', finish: 'lacquer', notes: 'Cloth approx. 90×90 cm, laid diagonally' },
  { id: 'low-square-black', kind: 'lowTable', shape: 'square', legs: 'cabriole', name: 'Low square table, black cabriole', w: 80, d: 80, h: 45, seatH: 0, color: '#1b1918', finish: 'lacquer' },
  { id: 'low-square-linen', kind: 'lowTable', shape: 'square', legs: 'cabriole', cloth: '#ece5d8', name: 'Low square table + linen', w: 80, d: 80, h: 45, seatH: 0, color: '#1b1918', finish: 'lacquer' },
  { id: 'bistro-black', kind: 'bistro', shape: 'round', name: 'Bistro table, black', w: 70, d: 70, h: 75, seatH: 0, color: '#1b1918', finish: 'lacquer' },
  { id: 'bistro-walnut', kind: 'bistro', shape: 'round', name: 'Bistro table, walnut top', w: 70, d: 70, h: 75, seatH: 0, color: '#b07a4f', finish: 'walnut', supplier: 'Harmonia', sku: '3201-24' },
  { id: 'bistro-oak', kind: 'bistro', shape: 'round', name: 'Café table, oak top, black iron base', w: 70, d: 70, h: 75, seatH: 0, color: '#c98a4a', finish: 'walnut', supplier: 'Harmonia', sku: '24-3206', notes: 'Ø70 from supplier; height is a typical dining height — please measure', known: ['w', 'd'] },
  { id: 'bistro-candle', kind: 'bistro', shape: 'round', cloth: '#ece5d8', candle: true, name: 'Bistro + linen & hurricane', w: 70, d: 70, h: 75, seatH: 0, color: '#1b1918', finish: 'lacquer' },
  { id: 'round-table-black-90', kind: 'bistro', shape: 'round', legs: 'cabriole', name: 'Round dining table, black wood, curved legs', w: 90, d: 90, h: 75, seatH: 0, color: '#1b1918', finish: 'lacquer', supplier: 'Harmonia', sku: '4258-4187', stock: 1, notes: 'Ø90, height 75 (supplier)', known: ['w', 'd', 'h'] },
  { id: 'bar-table-black-90-cabriole', kind: 'bistro', shape: 'round', legs: 'cabriole', name: 'Round bar table, black, curved legs (high)', w: 90, d: 90, h: 110, seatH: 0, color: '#1b1918', finish: 'lacquer', supplier: 'Harmonia', sku: '4187-4221', stock: 1, notes: 'Ø90, height 110 (supplier)', known: ['w', 'd', 'h'] },
  { id: 'sofa-boot-black', kind: 'sofa', armless: true, name: 'Sofa "Boot" 1.6 m, black bouclé, armless', w: 160, d: 80, h: 80, seatH: 48, color: '#1e1c1b', finish: 'velvet', supplier: 'Sugoy Design', sku: '', stock: 12, notes: 'Supplier sizes: length 160, depth 80, seat depth 50, height 80. Armless — modules can stand side by side.', known: ['w', 'd', 'h'] },
  { id: 'sofa-boot-black-200', kind: 'sofa', armless: true, name: 'Sofa "Boot" 2 m, black bouclé, armless', w: 200, d: 80, h: 80, seatH: 48, color: '#1e1c1b', finish: 'velvet', supplier: 'Sugoy Design', sku: '', stock: 12, notes: 'Supplier sizes: length 200, depth 80, seat depth 50, height 80, seat height 48. Armless — modules can stand side by side. Also suits dining-table height.', known: ['w', 'd', 'h'] },
  { id: 'channel-sofa-black', kind: 'channelSofa', name: 'Sofa "Tiffany", black channel velvet', w: 200, d: 73, h: 80, seatH: 45, color: '#161414', finish: 'velvet', supplier: 'Sugoy Design', sku: '', stock: 22, notes: 'Supplier sizes: length 200, depth 73, height 80, seat height 45. Can be raised to dining-table height.', known: ['w', 'd', 'h'] },
  { id: 'channel-sofa-rust', kind: 'channelSofa', name: 'Sofa "Tiffany", terracotta channel velvet', w: 200, d: 73, h: 80, seatH: 45, color: '#7a3416', finish: 'velvet', supplier: 'Sugoy Design', sku: '', stock: 22, notes: 'Supplier sizes: length 200, depth 73, height 80, seat height 45. Can be raised to dining-table height.', known: ['w', 'd', 'h'] },
  { id: 'channel-chair-black', kind: 'channelSofa', name: 'Armchair "Tiffany", black channel velvet', w: 73, d: 70, h: 79, seatH: 45, color: '#161414', finish: 'velvet', supplier: 'Sugoy Design', sku: '', stock: 22, notes: 'Supplier sizes: width 73, depth 70, height 79, seat height 45.', known: ['w', 'd', 'h'] },
  { id: 'armchair-alejandro', kind: 'armchair', style: 'baroque', name: 'Armchair "Alejandro", black velvet, carved black wood', w: 70, d: 70, h: 100, seatH: 44, color: '#161414', finish: 'velvet', trim: '#141210', supplier: 'Sugoy Design', sku: '', stock: 8, notes: 'Supplier sizes: width 70, depth 70, height 100, seat height 44. Brass studs.', known: ['w', 'd', 'h'] },
  { id: 'slipper-rafael-brown', kind: 'slipper', name: 'Armchair "Rafael", dark brown velvet, armless', w: 63, d: 78, h: 83, seatH: 44, color: '#3a2a24', finish: 'velvet', supplier: 'Sugoy Design', sku: '', stock: 20, notes: 'Supplier sizes: width 63, depth 78, height 83, seat height 44.', known: ['w', 'd', 'h'] },
  { id: 'slipper-rafael-rose', kind: 'slipper', name: 'Armchair "Rafael", smoked burgundy suede, armless', w: 63, d: 78, h: 83, seatH: 44, color: '#8a2f2c', finish: 'velvet', supplier: 'Sugoy Design', sku: '', stock: 23, notes: 'Supplier sizes: width 63, depth 78, height 83, seat height 44. Suede (זמש), colour "בורדו מעושן".', known: ['w', 'd', 'h'] },
  { id: 'channel-chair-brown-leather', kind: 'channelSofa', name: 'Armchair "Tiffany", brown faux leather', w: 73, d: 70, h: 79, seatH: 45, color: '#6b4a36', finish: 'leather', supplier: 'Sugoy Design', sku: '', stock: 22, notes: 'Supplier sizes: width 73, depth 70, height 79, seat height 45. Faux leather (דמוי עור).', known: ['w', 'd', 'h'] },
  { id: 'bar-table-black', kind: 'bistro', shape: 'round', name: 'Bar table, black round top, black iron base', w: 80, d: 80, h: 110, seatH: 0, color: '#1b1918', finish: 'lacquer', supplier: 'Harmonia', sku: '2046-3028', notes: 'Ø80 from supplier; height is a typical bar height — please measure', known: ['w', 'd'] },
  { id: 'bar-stool-wood', kind: 'stool', shape: 'round', name: 'Bar stool, wood seat, black hairpin legs', w: 40, d: 40, h: 75, seatH: 75, color: '#c49a6c', finish: 'walnut', supplier: 'Harmonia', sku: '2003', stock: 59, notes: 'Sizes are typical bar-stool sizes — please measure', known: [] },
  { id: 'venice-chair-black', kind: 'chair', name: 'Venice chair, black (medallion back, leather seat)', w: 48, d: 55, h: 98, seatH: 47, color: '#2a211e', finish: 'leather', supplier: 'Harmonia', sku: '5095', stock: 100, notes: 'Sizes are typical for this chair style — please measure', known: [] },
  { id: 'club-leather', kind: 'club', name: 'Vintage leather armchair', w: 80, d: 85, h: 90, seatH: 45, color: '#7a4526', finish: 'leather', supplier: 'Harmonia', sku: '3451' },
  { id: 'channel-sofa', kind: 'channelSofa', name: 'Channel velvet sofa, chocolate', w: 200, d: 73, h: 80, seatH: 45, color: '#3b2419', finish: 'velvet', supplier: 'Sugoy Design', known: ['d', 'h'] },
  { id: 'curved-green', kind: 'curvedSofa', name: 'Curved velvet sofa, green', w: 346, d: 150, h: 87, seatH: 48, innerW: 200, color: '#1f5a3c', finish: 'velvet', supplier: 'Sugoy Design', notes: 'Supplier: outer arc Ø3.46 m, inner Ø2.00 m, length 3.30 m, seat width 78 cm', known: ['w', 'd', 'h', 'seatH', 'innerW'] },
  { id: 'curved-rust', kind: 'curvedSofa', name: 'Curved velvet sofa, rust', w: 346, d: 150, h: 87, seatH: 48, innerW: 200, color: '#8a3f22', finish: 'velvet', supplier: 'Sugoy Design', notes: 'Supplier: outer arc Ø3.46 m, inner Ø2.00 m, length 3.30 m, seat width 78 cm', known: ['w', 'd', 'h', 'seatH', 'innerW'] },
  { id: 'slipper-rust', kind: 'slipper', name: 'Velvet slipper chair, rust', w: 60, d: 70, h: 80, seatH: 45, color: '#7e3a1f', finish: 'velvet', supplier: 'Sugoy Design' },
  { id: 'slipper-green', kind: 'slipper', name: 'Velvet slipper chair, green', w: 60, d: 70, h: 80, seatH: 45, color: '#5f7744', finish: 'velvet', supplier: 'Sugoy Design' },
  { id: 'channel-chair-green', kind: 'channelSofa', name: 'Channel velvet armchair, olive', w: 80, d: 75, h: 75, seatH: 45, color: '#4d5e33', finish: 'velvet' },
  { id: 'bench-burgundy', kind: 'bench', name: 'Armless velvet bench sofa, burgundy', w: 160, d: 70, h: 85, seatH: 45, color: '#6e1020', finish: 'velvet' },
  { id: 'armchair-navy', kind: 'loungeChair', name: 'Navy velvet armchair, black steel frame', w: 70, d: 75, h: 95, seatH: 45, color: '#25365a', finish: 'velvet' },
  { id: 'slipper-teal', kind: 'slipper', name: 'Velvet slipper chair, teal', w: 60, d: 70, h: 80, seatH: 45, color: '#3f7a72', finish: 'velvet', supplier: 'Sugoy Design' },
  { id: 'curved-navy', kind: 'curvedSofa', name: 'Curved velvet sofa, navy', w: 346, d: 150, h: 87, seatH: 48, innerW: 200, color: '#1c2a52', finish: 'velvet', supplier: 'Sugoy Design', notes: 'Supplier: outer arc Ø3.46 m, inner Ø2.00 m, length 3.30 m, seat width 78 cm', known: ['w', 'd', 'h', 'seatH', 'innerW'] },
  { id: 'curved-brown', kind: 'curvedSofa', name: 'Curved velvet sofa, chocolate', w: 346, d: 150, h: 87, seatH: 48, innerW: 200, color: '#4a2716', finish: 'velvet', supplier: 'Sugoy Design', notes: 'Supplier: outer arc Ø3.46 m, inner Ø2.00 m, length 3.30 m, seat width 78 cm', known: ['w', 'd', 'h', 'seatH', 'innerW'] },
  { id: 'curved-burgundy', kind: 'curvedSofa', name: 'Curved velvet sofa, burgundy', w: 346, d: 150, h: 87, seatH: 48, innerW: 200, color: '#6a1426', finish: 'velvet', supplier: 'Sugoy Design', stock: 16, measured: true, notes: 'Supplier: outer arc Ø3.46 m, inner Ø2.00 m, length 3.30 m, seat width 78 cm, 16 in stock', known: ['w', 'd', 'h', 'seatH', 'innerW'] },
  { id: 'counter-marble', kind: 'counter', name: 'Wood counter, brass trim, black marble top', w: 180, d: 79, h: 90, seatH: 0, color: '#2a2a2c', finish: 'marble', notes: 'Depth 79 cm and height 90 cm measured; length is an estimate — please measure', known: ['d', 'h'] },
  { id: 'pouf-damask', kind: 'pouf', shape: 'round', name: 'Fringed pouf, gothic damask velvet', w: 50, d: 50, h: 45, seatH: 45, color: '#ffffff', finish: 'velvet', texture: 'assets/textures/pouf-damask.jpg', trim: '#a8402e' },
  { id: 'pouf-tiger', kind: 'pouf', shape: 'round', name: 'Fringed pouf, tiger velvet', w: 50, d: 50, h: 45, seatH: 45, color: '#ffffff', finish: 'velvet', texture: 'assets/textures/pouf-tiger.jpg', trim: '#8f2a22' },
  { id: 'pouf-ikat', kind: 'pouf', shape: 'round', name: 'Fringed pouf, wine ikat velvet', w: 50, d: 50, h: 45, seatH: 45, color: '#ffffff', finish: 'velvet', texture: 'assets/textures/pouf-ikat.jpg', trim: '#9a3226' },
  { id: 'pouf-acanthus', kind: 'pouf', shape: 'round', name: 'Fringed pouf, acanthus velvet', w: 50, d: 50, h: 45, seatH: 45, color: '#ffffff', finish: 'velvet', texture: 'assets/textures/pouf-acanthus.jpg', trim: '#a8452e' },
  { id: 'pouf-rust', kind: 'pouf', shape: 'round', name: 'Fringed pouf, plain rust velvet', w: 50, d: 50, h: 45, seatH: 45, color: '#9a2e14', finish: 'velvet', trim: '#a8452e' },
  { id: 'cushion-fringe', kind: 'cushion', name: 'Fringed velvet cushion, ochre print', w: 50, d: 15, h: 50, seatH: 0, color: '#ffffff', finish: 'velvet', texture: 'assets/textures/cushion-fringe.jpg', trim: '#8a6a2a', notes: 'Decor — usually placed on sofas' },
].map((it) => ({ seats: 0, measured: false, supplier: '', sku: '', notes: '', stock: null, known: [], ...it, photo: I(it.id) }));

const INV_KEY = 'rk-inventory', INV_VERSION = 2;
export const INVENTORY = (() => {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(INV_KEY) || '{}'); } catch { /* private mode */ }
  // Sizes confirmed by a supplier (the `known` fields) replace older saved estimates once per data update.
  const fresh = saved.__v !== INV_VERSION;
  const list = DEFAULT_INVENTORY.map((d) => {
    const mine = { ...(saved[d.id] || {}) };
    if (fresh) for (const k of d.known || []) delete mine[k];
    return { ...d, ...mine, known: d.known };
  });
  for (const [id, it] of Object.entries(saved)) if (id !== '__v' && !list.some((d) => d.id === id)) list.push(it); // pieces added later
  return list;
})();

export function saveInventory() {
  try { localStorage.setItem(INV_KEY, JSON.stringify({ __v: INV_VERSION, ...Object.fromEntries(INVENTORY.map((it) => [it.id, it])) })); } catch { /* storage blocked */ }
  // keep event furniture copies in sync with the measured sizes
  for (const f of state.furniture) {
    const src = INVENTORY.find((it) => it.id === f.invId);
    if (src) Object.assign(f, { innerW: src.innerW, w: src.w, d: src.d, h: src.h, seatH: src.seatH, color: src.color, finish: src.finish, name: src.name });
  }
}

export const isRound = (it) => it.shape === 'round' || ['roundTable', 'cocktail', 'plant'].includes(it.kind);

let uid = Date.now() % 100000;
export const newId = (p = 'id') => `${p}${(uid++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const blankMood = () => ({
  name: '', keywords: [], notes: '', images: [], palette: [],
  roles: { walls: '', floor: '', linen: '', chairs: '', accent: '', florals: '' }, light: 'evening',
});
const blankProject = () => ({
  id: newId('ev'), eventName: '', updated: Date.now(),
  brief: { client: '', type: 'wedding', date: '', guests: 0, venueName: '', notes: '' },
  venue: null, mood: blankMood(), furniture: [], placed: [], measures: [], renders: [],
});

export const state = { ...blankProject(), selection: [], selectedId: null };

const listeners = new Set();
export const onChange = (fn) => listeners.add(fn);
export function emit(reason) { listeners.forEach((fn) => fn(reason)); }

export const itemOf = (p) => state.furniture.find((f) => f.id === p.itemId);

const PERSISTED = ['id', 'eventName', 'updated', 'brief', 'venue', 'mood', 'furniture', 'placed', 'measures', 'renders'];
export const snapshot = () => Object.fromEntries(PERSISTED.map((k) => [k, state[k]]));
export const serialize = () => JSON.stringify({ ...snapshot(), version: 2 });

export function load(json) {
  const data = typeof json === 'string' ? JSON.parse(json) : json;
  const base = blankProject();
  Object.assign(state, base, data, { selection: [], selectedId: null });
  state.mood = { ...blankMood(), ...(data.mood || {}), roles: { ...blankMood().roles, ...(data.mood?.roles || {}) } };
  state.brief = { ...base.brief, ...(data.brief || {}) };
  history.length = 0; future.length = 0; lastSnap = JSON.stringify([state.furniture, state.placed]);
  emit('load');
}
export const newProject = (name = '') => load({ ...blankProject(), eventName: name });

// ---------- undo / redo (furniture + placement) ----------
const history = [], future = [];
let lastSnap = '[[],[]]';
export function commitHistory() {
  const now = JSON.stringify([state.furniture, state.placed]);
  if (now === lastSnap) return;
  history.push(lastSnap); if (history.length > 80) history.shift();
  future.length = 0; lastSnap = now;
}
function restore(snap) { [state.furniture, state.placed] = JSON.parse(snap); lastSnap = snap; state.selection = state.selection.filter((id) => state.placed.some((p) => p.id === id)); }
export function undo() { if (!history.length) return false; future.push(lastSnap); restore(history.pop()); return true; }
export function redo() { if (!future.length) return false; history.push(lastSnap); restore(future.pop()); return true; }
export const canUndo = () => history.length > 0;
export const canRedo = () => future.length > 0;

// ---------- projects: IndexedDB (mood images make projects too big for localStorage) ----------
const DB = 'rk-event-studio', STORE = 'projects';
function db() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'id' });
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
async function tx(mode, fn) {
  const d = await db();
  return new Promise((res, rej) => { const t = d.transaction(STORE, mode); const out = fn(t.objectStore(STORE)); t.oncomplete = () => res(out?.result ?? out); t.onerror = () => rej(t.error); });
}
export async function saveProject() { state.updated = Date.now(); const snap = JSON.parse(serialize()); await tx('readwrite', (s) => s.put(snap)); try { localStorage.setItem('rk-current', state.id); } catch { /* ignore */ } }
export async function listProjects() { const all = await tx('readonly', (s) => s.getAll()); return (all || []).sort((a, b) => b.updated - a.updated); }
export async function openProject(id) { const all = await listProjects(); const p = all.find((x) => x.id === id); if (p) load(p); return !!p; }
export async function deleteProject(id) { await tx('readwrite', (s) => s.delete(id)); }
export async function restoreLastProject() {
  let cur = null; try { cur = localStorage.getItem('rk-current'); } catch { /* ignore */ }
  const all = await listProjects().catch(() => []);
  const p = all.find((x) => x.id === cur) || all[0];
  if (p) { load(p); return true; }
  try { const old = localStorage.getItem('rk-event-project'); if (old) { load({ ...JSON.parse(old), id: newId('ev') }); return true; } } catch { /* ignore */ }
  return false;
}

export function addFurniture(preset, qty = 1) {
  const f = { ...structuredClone(preset), id: newId('f'), qty, invId: preset.id && preset.photo ? preset.id : undefined };
  state.furniture.push(f);
  emit('furniture');
  return f;
}

// ---------- view-only share links: the plan packed into the URL ----------
const unb64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
async function pipe(bytes, stream) { return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer()); }
// Some phone browsers (older iPhones) cannot (de)compress natively — fall back to a small library then.
const fflate = () => import('https://cdn.jsdelivr.net/npm/fflate@0.8.2/esm/browser.js');
async function deflate(bytes) { try { return await pipe(bytes, new CompressionStream('deflate-raw')); } catch { return (await fflate()).deflateSync(bytes, { level: 9 }); } }
async function inflate(bytes) {
  try { return await pipe(bytes, new DecompressionStream('deflate-raw')); } catch { /* try the library */ }
  try { return (await fflate()).inflateSync(bytes); } catch (e) { throw Object.assign(new Error('cut'), { cut: /EOF|end|invalid/i.test(e.message) }); }
}
// Compact form: only what the viewer draws, numbers rounded to whole cm, pieces as [item, x, y, rot].
const SHARE_KEYS = ['kind', 'legs', 'armless', 'style', 'name', 'w', 'd', 'h', 'seats', 'seatCount', 'color', 'finish', 'shape', 'innerW', 'seatH', 'cloth', 'candle', 'trim', 'invId', 'photo', 'texture'];
const isData = (v) => typeof v === 'string' && v.startsWith('data:');
export async function packShare() {
  const segs = state.venue?.segments || [], layers = [...new Set(segs.map((q) => q.layer))];
  const fid = state.furniture.map((f) => f.id);
  const data = {
    n: state.eventName, b: state.brief,
    v: state.venue && { L: layers, s: segs.map((q) => [q.x1, q.y1, q.x2, q.y2].map(Math.round).concat(layers.indexOf(q.layer))), t: state.venue.texts, l: state.venue.layers, h: state.venue.wallHeight },
    f: state.furniture.map((o) => Object.fromEntries(SHARE_KEYS.filter((k) => o[k] != null && o[k] !== '' && !isData(o[k])).map((k) => [k, o[k]]))),
    p: state.placed.map((q) => [fid.indexOf(q.itemId), Math.round(q.x), Math.round(q.y), Math.round(q.rot)].concat(q.label ? [q.label] : [])),
    m: { palette: state.mood.palette, roles: state.mood.roles, light: state.mood.light },
  };
  const z = await deflate(new TextEncoder().encode(JSON.stringify(data)));
  let out = '';
  for (let i = 0; i < z.length; i += 8192) out += String.fromCharCode(...z.subarray(i, i + 8192));
  return `${location.origin}${location.pathname}#v2=${btoa(out).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;
}
export async function unpackShare(hash = location.hash) {
  const v2 = hash.startsWith('#v2=');
  let z;
  try { z = unb64u(hash.slice(v2 ? 4 : 3).replace(/[^A-Za-z0-9_-]/g, '')); } catch { throw Object.assign(new Error('cut'), { cut: true }); }
  const d = JSON.parse(new TextDecoder().decode(await inflate(z)));
  if (!v2) return d; // links made before the compact form
  const furniture = d.f.map((o, i) => ({ ...o, id: `f${i}` }));
  return {
    eventName: d.n, brief: d.b, furniture, mood: d.m,
    venue: d.v && { segments: d.v.s.map(([x1, y1, x2, y2, li]) => ({ x1, y1, x2, y2, layer: d.v.L[li] })), texts: d.v.t, layers: d.v.l, wallHeight: d.v.h },
    placed: d.p.map(([fi, x, y, rot, label], i) => ({ id: `p${i}`, itemId: `f${fi}`, x, y, rot, ...(label ? { label } : {}) })),
  };
}

// ---------- full backup: every event + the inventory in one file ----------
export async function backupAll() {
  await saveProject();
  return JSON.stringify({ kind: 'rk-backup', version: 1, date: new Date().toISOString(), events: await listProjects(), inventory: localStorage.getItem(INV_KEY) });
}
// Restores a backup next to what is here: an event in both places keeps whichever copy was saved last.
export async function restoreAll(text) {
  const b = JSON.parse(text);
  if (b.kind !== 'rk-backup') throw new Error('not a backup');
  const mine = new Map((await listProjects()).map((p) => [p.id, p]));
  let n = 0;
  for (const ev of b.events || []) {
    const cur = mine.get(ev.id);
    if (!cur || (ev.updated || 0) >= (cur.updated || 0)) { await tx('readwrite', (s) => s.put(ev)); n++; }
  }
  if (b.inventory) {
    const theirs = JSON.parse(b.inventory), here = JSON.parse(localStorage.getItem(INV_KEY) || '{}');
    localStorage.setItem(INV_KEY, JSON.stringify({ ...here, ...theirs }));
  }
  return n;
}

export async function renameProject(id, name) {
  const p = (await listProjects()).find((x) => x.id === id); if (!p) return;
  p.eventName = name; await tx('readwrite', (s) => s.put(p));
}
