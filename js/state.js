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

// Rotem's own inventory. Dimensions marked ~ are estimates — adjust in the furniture list.
const I = (photo) => `assets/inventory/${photo}.jpg`;
export const INVENTORY = [
  { kind: 'lowTable', shape: 'round', legs: 'cabriole', name: 'Low round table, black cabriole', w: 90, d: 90, h: 45, seats: 0, color: '#1b1918', photo: I('low-round-black') },
  { kind: 'lowTable', shape: 'round', legs: 'cabriole', cloth: '#ece5d8', name: 'Low round table + linen', w: 90, d: 90, h: 45, seats: 0, color: '#1b1918', photo: I('low-round-linen') },
  { kind: 'lowTable', shape: 'square', legs: 'cabriole', name: 'Low square table, black cabriole', w: 80, d: 80, h: 45, seats: 0, color: '#1b1918', photo: I('low-square-black') },
  { kind: 'lowTable', shape: 'square', legs: 'cabriole', cloth: '#ece5d8', name: 'Low square table + linen', w: 80, d: 80, h: 45, seats: 0, color: '#1b1918', photo: I('low-square-linen') },
  { kind: 'bistro', shape: 'round', name: 'Bistro table, black', w: 70, d: 70, h: 75, seats: 2, color: '#1b1918', photo: I('bistro-black') },
  { kind: 'bistro', shape: 'round', name: 'Bistro table, walnut top', w: 70, d: 70, h: 75, seats: 2, color: '#8a5f3c', photo: I('bistro-walnut') },
  { kind: 'bistro', shape: 'round', cloth: '#ece5d8', candle: true, name: 'Bistro + linen & hurricane', w: 70, d: 70, h: 75, seats: 2, color: '#1b1918', photo: I('bistro-candle') },
  { kind: 'club', name: 'Vintage leather armchair', w: 80, d: 85, h: 90, seats: 0, color: '#7a4526', photo: I('club-leather') },
  { kind: 'channelSofa', name: 'Channel velvet sofa, chocolate', w: 200, d: 73, h: 80, seats: 0, color: '#3b2419', photo: I('channel-sofa') },
  { kind: 'curvedSofa', name: 'Curved velvet sofa, green', w: 346, d: 120, h: 80, seats: 0, color: '#1f5a3c', photo: I('curved-green') },
  { kind: 'curvedSofa', name: 'Curved velvet sofa, rust', w: 346, d: 120, h: 80, seats: 0, color: '#8a3f22', photo: I('curved-rust') },
  { kind: 'slipper', name: 'Velvet slipper chair, rust', w: 60, d: 70, h: 80, seats: 0, color: '#7e3a1f', photo: I('slipper-rust') },
  { kind: 'slipper', name: 'Velvet slipper chair, green', w: 60, d: 70, h: 80, seats: 0, color: '#5f7744', photo: I('slipper-green') },
];

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
  const f = { id: newId('f'), qty, ...structuredClone(preset) };
  state.furniture.push(f);
  emit('furniture');
  return f;
}
