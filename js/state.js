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
  { id: 'bistro-black', kind: 'bistro', shape: 'round', name: 'Bistro table, black', w: 70, d: 70, h: 75, seatH: 0, seats: 2, color: '#1b1918', finish: 'lacquer' },
  { id: 'bistro-walnut', kind: 'bistro', shape: 'round', name: 'Bistro table, walnut top', w: 70, d: 70, h: 75, seatH: 0, seats: 2, color: '#b07a4f', finish: 'walnut', supplier: 'Harmonia', sku: '3201-24' },
  { id: 'bistro-candle', kind: 'bistro', shape: 'round', cloth: '#ece5d8', candle: true, name: 'Bistro + linen & hurricane', w: 70, d: 70, h: 75, seatH: 0, seats: 2, color: '#1b1918', finish: 'lacquer' },
  { id: 'club-leather', kind: 'club', name: 'Vintage leather armchair', w: 80, d: 85, h: 90, seatH: 45, color: '#7a4526', finish: 'leather', supplier: 'Harmonia', sku: '3451' },
  { id: 'channel-sofa', kind: 'channelSofa', name: 'Channel velvet sofa, chocolate', w: 200, d: 73, h: 80, seatH: 45, color: '#3b2419', finish: 'velvet', supplier: 'Sugoy Design', known: ['d', 'h'] },
  { id: 'curved-green', kind: 'curvedSofa', name: 'Curved velvet sofa, green', w: 346, d: 120, h: 80, seatH: 45, color: '#1f5a3c', finish: 'velvet', supplier: 'Sugoy Design', innerW: 200, notes: 'Outer arc Ø346, inner arc Ø200 (supplier)', known: ['w', 'innerW'] },
  { id: 'curved-rust', kind: 'curvedSofa', name: 'Curved velvet sofa, rust', w: 346, d: 120, h: 80, seatH: 45, color: '#8a3f22', finish: 'velvet', supplier: 'Sugoy Design', innerW: 200, notes: 'Outer arc Ø346, inner arc Ø200 (supplier)', known: ['w', 'innerW'] },
  { id: 'slipper-rust', kind: 'slipper', name: 'Velvet slipper chair, rust', w: 60, d: 70, h: 80, seatH: 45, color: '#7e3a1f', finish: 'velvet', supplier: 'Sugoy Design' },
  { id: 'slipper-green', kind: 'slipper', name: 'Velvet slipper chair, green', w: 60, d: 70, h: 80, seatH: 45, color: '#5f7744', finish: 'velvet', supplier: 'Sugoy Design' },
  { id: 'channel-chair-green', kind: 'channelSofa', name: 'Channel velvet armchair, olive', w: 80, d: 75, h: 75, seatH: 45, color: '#4d5e33', finish: 'velvet' },
  { id: 'bench-burgundy', kind: 'bench', name: 'Armless velvet bench sofa, burgundy', w: 160, d: 70, h: 85, seatH: 45, color: '#6e1020', finish: 'velvet' },
  { id: 'armchair-navy', kind: 'loungeChair', name: 'Navy velvet armchair, black steel frame', w: 70, d: 75, h: 95, seatH: 45, color: '#25365a', finish: 'velvet' },
  { id: 'slipper-teal', kind: 'slipper', name: 'Velvet slipper chair, teal', w: 60, d: 70, h: 80, seatH: 45, color: '#3f7a72', finish: 'velvet', supplier: 'Sugoy Design' },
  { id: 'curved-navy', kind: 'curvedSofa', name: 'Curved velvet sofa, navy', w: 346, d: 120, h: 80, seatH: 45, innerW: 200, color: '#1c2a52', finish: 'velvet', supplier: 'Sugoy Design', notes: 'Same model as green / rust: outer arc Ø346, inner Ø200', known: ['w', 'innerW'] },
  { id: 'curved-brown', kind: 'curvedSofa', name: 'Curved velvet sofa, chocolate', w: 346, d: 120, h: 80, seatH: 45, innerW: 200, color: '#4a2716', finish: 'velvet', supplier: 'Sugoy Design', notes: 'Same model as green / rust: outer arc Ø346, inner Ø200', known: ['w', 'innerW'] },
  { id: 'pouf-damask', kind: 'pouf', shape: 'round', name: 'Fringed pouf, gothic damask velvet', w: 50, d: 50, h: 45, seatH: 45, color: '#ffffff', finish: 'velvet', texture: 'assets/textures/pouf-damask.jpg', trim: '#a8402e' },
  { id: 'pouf-tiger', kind: 'pouf', shape: 'round', name: 'Fringed pouf, tiger velvet', w: 50, d: 50, h: 45, seatH: 45, color: '#ffffff', finish: 'velvet', texture: 'assets/textures/pouf-tiger.jpg', trim: '#8f2a22' },
  { id: 'pouf-ikat', kind: 'pouf', shape: 'round', name: 'Fringed pouf, wine ikat velvet', w: 50, d: 50, h: 45, seatH: 45, color: '#ffffff', finish: 'velvet', texture: 'assets/textures/pouf-ikat.jpg', trim: '#9a3226' },
  { id: 'pouf-acanthus', kind: 'pouf', shape: 'round', name: 'Fringed pouf, acanthus velvet', w: 50, d: 50, h: 45, seatH: 45, color: '#ffffff', finish: 'velvet', texture: 'assets/textures/pouf-acanthus.jpg', trim: '#a8452e' },
  { id: 'pouf-rust', kind: 'pouf', shape: 'round', name: 'Fringed pouf, plain rust velvet', w: 50, d: 50, h: 45, seatH: 45, color: '#9a2e14', finish: 'velvet', trim: '#a8452e' },
  { id: 'cushion-fringe', kind: 'cushion', name: 'Fringed velvet cushion, ochre print', w: 50, d: 15, h: 50, seatH: 0, color: '#ffffff', finish: 'velvet', texture: 'assets/textures/cushion-fringe.jpg', trim: '#8a6a2a', notes: 'Decor — usually placed on sofas' },
].map((it) => ({ seats: 0, measured: false, supplier: '', sku: '', notes: '', stock: 1, known: [], ...it, photo: I(it.id) }));

const INV_KEY = 'rk-inventory';
export const INVENTORY = (() => {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(INV_KEY) || '{}'); } catch { /* private mode */ }
  const list = DEFAULT_INVENTORY.map((d) => ({ ...d, ...(saved[d.id] || {}) }));
  for (const [id, it] of Object.entries(saved)) if (!list.some((d) => d.id === id)) list.push(it); // pieces added later
  return list;
})();

export function saveInventory() {
  try { localStorage.setItem(INV_KEY, JSON.stringify(Object.fromEntries(INVENTORY.map((it) => [it.id, it])))); } catch { /* storage blocked */ }
  // keep event furniture copies in sync with the measured sizes
  for (const f of state.furniture) {
    const src = INVENTORY.find((it) => it.id === f.invId);
    if (src) Object.assign(f, { w: src.w, d: src.d, h: src.h, seatH: src.seatH, color: src.color, finish: src.finish, name: src.name });
  }
}

export const isRound = (it) => it.shape === 'round' || ['roundTable', 'cocktail', 'plant'].includes(it.kind);

let uid = Date.now() % 100000;
export const newId = (p = 'id') => `${p}${(uid++).toString(36)}`;

export const state = {
  eventName: '',
  venue: null,        // { segments:[{x1,y1,x2,y2,layer}], layers:{name:bool}, bounds, unitsScale, wallHeight }
  mood: { palette: [], images: [] },
  furniture: [],      // catalog entries: {id, kind, name, w, d, h, seats, color, qty}
  placed: [],         // {id, itemId, x, y, rot}
  selectedId: null,
};

const listeners = new Set();
export const onChange = (fn) => listeners.add(fn);
export function emit(reason) { listeners.forEach((fn) => fn(reason)); }

export const itemOf = (p) => state.furniture.find((f) => f.id === p.itemId);

export function serialize() {
  return JSON.stringify({ ...state, selectedId: null, version: 1 });
}

export function load(json) {
  const data = typeof json === 'string' ? JSON.parse(json) : json;
  Object.assign(state, { eventName: '', venue: null, mood: { palette: [], images: [] }, furniture: [], placed: [] }, data);
  state.selectedId = null;
  emit('load');
}

export function addFurniture(preset, qty = 1) {
  const f = { ...structuredClone(preset), id: newId('f'), qty, invId: preset.id && preset.photo ? preset.id : undefined };
  state.furniture.push(f);
  emit('furniture');
  return f;
}
