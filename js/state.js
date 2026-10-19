// Central project state. All lengths are in centimetres.

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
  { id: 'bar-table-black', kind: 'bistro', shape: 'round', name: 'Bar table, black round top, black iron base', w: 80, d: 80, h: 110, seatH: 0, color: '#1b1918', finish: 'lacquer', supplier: 'Harmonia', sku: '2046-3028', notes: 'Ø80 from supplier; height is a typical bar height — please measure', known: ['w', 'd'] },
  { id: 'bar-stool-wood', kind: 'stool', shape: 'round', name: 'Bar stool, wood seat, black hairpin legs', w: 40, d: 40, h: 75, seatH: 75, color: '#c49a6c', finish: 'walnut', supplier: 'Harmonia', sku: '2003', stock: 59, notes: 'Sizes are typical bar-stool sizes — please measure', known: [] },
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
  venue: null, mood: blankMood(), furniture: [], placed: [], measures: [],
});

export const state = { ...blankProject(), selection: [], selectedId: null };

const listeners = new Set();
export const onChange = (fn) => listeners.add(fn);
export function emit(reason) { listeners.forEach((fn) => fn(reason)); }

export const itemOf = (p) => state.furniture.find((f) => f.id === p.itemId);

const PERSISTED = ['id', 'eventName', 'updated', 'brief', 'venue', 'mood', 'furniture', 'placed', 'measures'];
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
