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
