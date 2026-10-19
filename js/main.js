import { state, PRESETS, INVENTORY, onChange, emit, addFurniture, serialize, load } from './state.js';
import { parseVenue, demoVenue, exportDxf } from './dxf.js';
import { readMoodBoard } from './pptx.js';
import { suggestLayout } from './layout.js';
import * as plan from './plan2d.js';
import * as view3d from './view3d.js';
import { initInventory, renderInventory, showPreview } from './inventory.js';

const $ = (id) => document.getElementById(id);
let activeSwatch = null;
let currentView = 'plan';

function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 3200);
}

function download(name, content, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
const fileBase = () => (state.eventName || 'event').replace(/[^\w\- ]/g, '').trim() || 'event';

// ---------- tabs ----------
document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('.tabs button').forEach((x) => x.classList.toggle('active', x === b));
  currentView = b.dataset.view;
  $('planView').classList.toggle('active', currentView === 'plan');
  $('threeView').classList.toggle('active', currentView === '3d');
  $('moodView').classList.toggle('active', currentView === 'mood');
  $('invView').classList.toggle('active', currentView === 'inventory');
  if (currentView === 'inventory') { renderInventory(); showPreview(); }
  if (currentView === 'plan') plan.resize();
  if (currentView === '3d') { view3d.rebuild(); view3d.resize(); }
}));

// ---------- venue ----------
$('venueFile').addEventListener('change', async (e) => {
  const f = e.target.files[0]; if (!f) return;
  if (/\.dwg$/i.test(f.name)) { toast('DWG is a closed format — please save it as DXF first (see hint).'); return; }
  try {
    state.venue = parseVenue(await f.text(), $('venueUnits').value);
    state.venue.wallHeight = +$('wallHeight').value || 320;
    toast(`Loaded ${f.name}: ${state.venue.segments.length} lines`);
    emit('venue'); plan.fit();
  } catch (err) { toast('Could not read DXF: ' + err.message); }
  e.target.value = '';
});
$('demoVenue').addEventListener('click', () => {
  state.venue = demoVenue(); emit('venue'); plan.fit();
  if (!state.furniture.length) {
    addFurniture(PRESETS[0], 18); addFurniture(PRESETS[4], 1); addFurniture(PRESETS[10], 1);
    addFurniture(PRESETS[9], 1); addFurniture(PRESETS[8], 1); addFurniture(PRESETS[12], 4);
    addFurniture(INVENTORY[10], 2); addFurniture(INVENTORY[12], 4); addFurniture(INVENTORY[1], 2); addFurniture(INVENTORY[6], 6);
  }
  toast('Demo hall loaded (28 × 18 m)');
});
$('wallHeight').addEventListener('change', () => { if (state.venue) { state.venue.wallHeight = +$('wallHeight').value; emit('venue'); } });

function renderLayers() {
  const box = $('layerList'); box.innerHTML = '';
  if (!state.venue) return;
  for (const name of Object.keys(state.venue.layers)) {
    const l = document.createElement('label');
    l.innerHTML = `<span><input type="checkbox" ${state.venue.layers[name] ? 'checked' : ''}/> ${name}</span>`;
    l.querySelector('input').addEventListener('change', (e) => { state.venue.layers[name] = e.target.checked; emit('venue'); });
    box.append(l);
  }
}

// ---------- mood board ----------
$('moodFile').addEventListener('change', async (e) => {
  const f = e.target.files[0]; if (!f) return;
  toast('Reading mood board…');
  try {
    state.mood = await readMoodBoard(f);
    toast(`Mood board: ${state.mood.images.length} images, ${state.mood.palette.length} colours`);
    emit('mood');
  } catch (err) { toast('Could not read PowerPoint: ' + err.message); }
  e.target.value = '';
});

function renderMood() {
  const pal = $('palette'); pal.innerHTML = '';
  state.mood.palette.forEach((c) => {
    const s = document.createElement('div');
    s.className = 'swatch' + (c === activeSwatch ? ' active' : ''); s.style.background = c; s.title = c;
    s.onclick = () => { activeSwatch = activeSwatch === c ? null : c; renderMood(); };
    pal.append(s);
  });
  const gal = $('moodGallery');
  if (state.mood.images.length) gal.innerHTML = state.mood.images.map((src) => `<img src="${src}" alt="">`).join('');
}

// ---------- furniture ----------
$('presetSelect').innerHTML = PRESETS.map((p, i) => `<option value="${i}">${p.name}</option>`).join('') + '<option value="custom">Custom item…</option>';
$('addPreset').addEventListener('click', () => {
  const v = $('presetSelect').value;
  addFurniture(v === 'custom' ? { kind: 'custom', name: 'Custom item', w: 100, d: 60, h: 80, seats: 0, color: '#d8cbb8' } : PRESETS[v], 1);
});

const renderGallery = () => ($('inventory').innerHTML = INVENTORY.map((p, i) => `<button class="inv" data-i="${i}" title="Add to this event (${p.w}×${p.d}×${p.h} cm)"><img src="${p.photo}" alt="">${p.name}</button>`).join(''));
renderGallery();
document.addEventListener('inventory-changed', renderGallery);
initInventory(toast);
$('inventory').addEventListener('click', (e) => {
  const b = e.target.closest('.inv'); if (!b) return;
  const p = INVENTORY[b.dataset.i];
  const existing = state.furniture.find((f) => f.invId === p.id);
  if (existing) { existing.qty++; emit('furniture'); toast(`${p.name}: ${existing.qty}`); } else addFurniture(p, 1);
});

function renderFurniture() {
  const list = $('furnitureList'); list.innerHTML = '';
  for (const f of state.furniture) {
    const el = document.createElement('div'); el.className = 'fitem';
    el.innerHTML = `
      ${f.photo ? `<img class="thumb" src="${f.photo}" alt="">` : ''}
      <button class="color" title="Colour" style="background:${f.color}"></button>
      <input class="name" value="${f.name.replace(/"/g, '&quot;')}" />
      <div class="btns"><button data-a="place" title="Place one on the plan">＋</button><button data-a="del" title="Remove">✕</button></div>
      <div class="dims">
        <label>W cm<input type="number" data-k="w" value="${f.w}"></label>
        <label>D cm<input type="number" data-k="d" value="${f.d}"></label>
        <label>H cm<input type="number" data-k="h" value="${f.h}"></label>
        <label>Seats<input type="number" data-k="seats" value="${f.seats}"></label>
        <label>Qty<input type="number" data-k="qty" value="${f.qty}"></label>
      </div>`;
    el.querySelector('.name').onchange = (e) => { f.name = e.target.value; emit('furniture'); };
    el.querySelectorAll('.dims input').forEach((inp) => (inp.onchange = () => { f[inp.dataset.k] = Math.max(0, +inp.value); emit('furniture'); }));
    el.querySelector('.color').onclick = () => {
      if (activeSwatch) { f.color = activeSwatch; emit('furniture'); return; }
      const picker = document.createElement('input'); picker.type = 'color'; picker.value = f.color;
      picker.oninput = () => { f.color = picker.value; emit('furniture'); }; picker.click();
    };
    el.querySelector('[data-a=place]').onclick = () => plan.placeAtCenter(f);
    el.querySelector('[data-a=del]').onclick = () => {
      state.furniture = state.furniture.filter((x) => x !== f);
      state.placed = state.placed.filter((p) => p.itemId !== f.id); emit('furniture');
    };
    list.append(el);
  }
}

// ---------- inspector ----------
function renderInspector() {
  const box = $('inspector');
  const p = state.placed.find((q) => q.id === state.selectedId);
  if (!p) { box.classList.add('hidden'); return; }
  const it = state.furniture.find((f) => f.id === p.itemId);
  box.classList.remove('hidden');
  box.innerHTML = `<strong>${it.name}</strong>
    <label>X (cm)<input type="number" data-k="x" value="${Math.round(p.x)}"></label>
    <label>Y (cm)<input type="number" data-k="y" value="${Math.round(p.y)}"></label>
    <label>Rotation°<input type="number" data-k="rot" step="15" value="${Math.round(p.rot)}"></label>
    <div class="row"><button data-a="dup">Duplicate</button><button data-a="del">Delete</button></div>`;
  box.querySelectorAll('input').forEach((inp) => (inp.onchange = () => { p[inp.dataset.k] = +inp.value; emit('placed'); }));
  box.querySelector('[data-a=dup]').onclick = () => plan.duplicate(p);
  box.querySelector('[data-a=del]').onclick = () => { state.placed = state.placed.filter((q) => q !== p); state.selectedId = null; emit('placed'); };
}

// ---------- layout / export ----------
$('autoLayout').addEventListener('click', () => {
  try {
    if (!state.furniture.length) { toast('Add furniture to your selection first.'); return; }
    const { missing } = suggestLayout();
    emit('placed');
    toast(missing ? `Layout suggested — ${missing} table(s) did not fit. Try smaller tables or fewer guests.` : 'Layout suggested ✨ Drag anything to refine it.');
  } catch (err) { toast(err.message); }
});
$('clearLayout').addEventListener('click', () => { state.placed = []; state.selectedId = null; emit('placed'); });
$('exportDxf').addEventListener('click', () => download(`${fileBase()} - plan.dxf`, exportDxf(), 'application/dxf'));
$('fitView').addEventListener('click', plan.fit);

// ---------- 3D ----------
document.querySelectorAll('[data-cam]').forEach((b) => b.addEventListener('click', () => view3d.setCamera(b.dataset.cam)));
$('lightMood').addEventListener('change', (e) => view3d.setLighting(e.target.value));
$('renderShot').addEventListener('click', () => view3d.snapshot('render'));
$('renderAll').addEventListener('click', () => view3d.renderAll());

// ---------- project save / load ----------
$('eventName').addEventListener('input', (e) => { state.eventName = e.target.value; autosave(); });
$('saveProject').addEventListener('click', () => { autosave(true); toast('Saved in this browser'); });
$('exportProject').addEventListener('click', () => download(`${fileBase()}.event.json`, serialize(), 'application/json'));
$('importProject').addEventListener('change', async (e) => {
  const f = e.target.files[0]; if (!f) return;
  try { load(await f.text()); plan.fit(); toast('Project opened'); } catch { toast('That file is not an event project.'); }
  e.target.value = '';
});

let saveTimer;
function autosave(now) {
  clearTimeout(saveTimer);
  const go = () => { try { localStorage.setItem('rk-event-project', serialize()); } catch { /* storage full or blocked */ } };
  now ? go() : (saveTimer = setTimeout(go, 800));
}

// ---------- reactions ----------
onChange((reason) => {
  if (['load', 'venue'].includes(reason)) renderLayers();
  if (['load', 'mood'].includes(reason)) renderMood();
  if (['load', 'furniture', 'mood'].includes(reason)) renderFurniture();
  if (reason === 'load') $('eventName').value = state.eventName;
  renderInspector();
  plan.draw();
  if (currentView === '3d' && reason !== 'move' && reason !== 'select') view3d.rebuild();
  if (reason !== 'select') autosave();
});

window.addEventListener('resize', () => { plan.resize(); view3d.resize(); });

try {
  const saved = localStorage.getItem('rk-event-project');
  if (saved) load(saved); else emit('load');
} catch { emit('load'); }
plan.resize();
plan.fit();
