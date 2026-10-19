import {
  state, PRESETS, INVENTORY, onChange, emit, addFurniture, serialize, load, itemOf,
  newProject, saveProject, listProjects, openProject, deleteProject, restoreLastProject, newId,
  commitHistory, undo, redo, canUndo, canRedo, saveInventory,
} from './state.js';
import { parseVenue, demoVenue, exportDxf, looksLikeDxf, VENUE_LIBRARY } from './dxf.js';
import { blobToDataUrl } from './pptx.js';
import { traceImage, strokesToSegments, dimensionsFor, readDimensions, toMetres } from './trace.js';
import { suggestLayout, composeDesign } from './layout.js';
import { findInventory, seatsOf } from './match.js';
import * as plan from './plan2d.js';
import * as view3d from './view3d.js';
import { initInventory, renderInventory, showPreview } from './inventory.js';
import { initMood, renderMood, renderSidebarPalette, getActiveColor } from './mood.js';
import { buildPresentation } from './present.js';
import { t, applyLang, getLang, itemName } from './i18n.js';

const $ = (id) => document.getElementById(id);
let currentView = 'plan';
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function toast(msg) {
  const el = $('toast'); el.textContent = msg; el.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 3200);
}
function download(name, content, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
// Default event names follow the current language until the user types their own.
const DEFAULT_NAMES = ['New event', 'אירוע חדש', ''];
const eventLabel = (name) => (DEFAULT_NAMES.includes(name || '') ? t('newEventName') : name);
const fileBase = () => (state.eventName || 'event').replace(/[\\/:*?"<>|]/g, '').trim() || 'event';
plan.setNamer(itemName);

// ---------- views ----------
function showView(v) {
  currentView = v;
  if (v !== '3d' && v !== 'split') view3d.stopWalk();
  document.querySelectorAll('.tabs button').forEach((x) => x.classList.toggle('active', x.dataset.view === v));
  const split = v === 'split';
  $('stage').classList.toggle('split', split);
  $('planView').classList.toggle('active', v === 'plan' || split);
  $('threeView').classList.toggle('active', v === '3d' || split);
  $('moodView').classList.toggle('active', v === 'mood');
  $('invView').classList.toggle('active', v === 'inventory');
  $('presentView').classList.toggle('active', v === 'present');
  requestAnimationFrame(() => {
    if (v === 'plan' || split) { plan.resize(); plan.fit(); }
    if (v === '3d' || split) { view3d.rebuild(); view3d.resize(); }
    if (v === 'inventory') { renderInventory(); showPreview(); }
    if (v === 'present') { $('presentDoc').innerHTML = `<p class="hint">${t('building')}</p>`; setTimeout(buildPresentation, 30); }
  });
}
document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => showView(b.dataset.view)));
document.querySelectorAll('[data-goto]').forEach((b) => b.addEventListener('click', () => showView(b.dataset.goto)));
const show3d = () => currentView === '3d' || currentView === 'split';

// ---------- events (projects) ----------
async function renderEventSelect() {
  const all = await listProjects().catch(() => []);
  const cur = all.find((p) => p.id === state.id);
  if (cur) Object.assign(cur, { eventName: state.eventName, brief: state.brief }); else all.unshift({ id: state.id, eventName: state.eventName, brief: state.brief });
  $('eventSelect').innerHTML = all.map((p) => `<option value="${p.id}" ${p.id === state.id ? 'selected' : ''}>${esc(eventLabel(p.eventName))}${p.brief?.date ? ' · ' + p.brief.date : ''}</option>`).join('');
}
$('eventSelect').onchange = async (e) => { await saveProject(); await openProject(e.target.value); afterOpen(); toast(t('opened')); };
$('newEvent').onclick = async () => { await saveProject(); newProject(t('newEventName')); await saveProject(); afterOpen(); showView('mood'); $('eventName').select(); };
$('dupEvent').onclick = async () => { await saveProject(); load({ ...JSON.parse(serialize()), id: newId('ev'), eventName: `${state.eventName} (2)` }); await saveProject(); afterOpen(); closeMenu(); };
$('delEvent').onclick = async () => {
  if (!confirm(t('confirmDelete', { name: state.eventName || t('untitled') }))) return;
  await deleteProject(state.id);
  if (!(await restoreLastProject())) { newProject(t('newEventName')); await saveProject(); }
  afterOpen(); closeMenu();
};
$('exportProject').onclick = () => { download(`${fileBase()}.event.json`, serialize(), 'application/json'); closeMenu(); };
$('importProject').onchange = async (e) => {
  const f = e.target.files[0]; if (!f) return;
  try { const data = JSON.parse(await f.text()); load({ ...data, id: data.id || newId('ev') }); await saveProject(); afterOpen(); toast(t('opened')); } catch { toast(t('badFile')); }
  e.target.value = ''; closeMenu();
};
const closeMenu = () => document.querySelector('.menu')?.removeAttribute('open');
function afterOpen() { renderEventSelect(); plan.fit(); if (show3d()) view3d.rebuild(); }

// ---------- brief ----------
const briefFields = { briefClient: 'client', briefType: 'type', briefDate: 'date', briefGuests: 'guests', briefVenue: 'venueName' };
for (const [id, k] of Object.entries(briefFields)) $(id).addEventListener('change', (e) => { state.brief[k] = k === 'guests' ? +e.target.value : e.target.value; emit('brief'); });
$('eventName').addEventListener('input', (e) => { state.eventName = e.target.value; emit('brief'); });
function renderBrief() {
  $('eventName').value = DEFAULT_NAMES.includes(state.eventName || '') ? '' : state.eventName;
  for (const [id, k] of Object.entries(briefFields)) $(id).value = state.brief[k] || '';
  $('briefType').value = state.brief.type || 'wedding';
}
function renderStats() {
  const seats = state.placed.reduce((s, p) => s + seatsOf(itemOf(p)), 0); // tables' chairs + people on sofas, armchairs, poufs, chairs
  const g = +state.brief.guests || 0, lines = [];
  if (g) lines.push(`<b>${t('seatsOf', { seats, guests: g })}</b> — ${seats >= g ? `<span class="ok">${t('seatsOk')}</span>` : `<span class="warn">${t('seatsShort', { n: g - seats })}</span>`}`);
  else if (seats) lines.push(t('seatsOnly', { seats }));
  for (const inv of INVENTORY) {
    const used = state.placed.filter((p) => itemOf(p)?.invId === inv.id).length;
    if (inv.stock > 0 && used > inv.stock) lines.push(`<span class="warn">${t('overStock', { name: esc(itemName({ ...inv, invId: inv.id })), used, stock: inv.stock })}</span>`);
  }
  const clash = plan.overlaps().size;
  if (clash) lines.push(`<span class="warn">${t('clashes', { n: clash })}</span>`);
  $('guestStats').innerHTML = lines.join('<br>');
}

// ---------- venue ----------
function setVenueFromDxf(text, name) {
  state.venue = parseVenue(text, $('venueUnits').value);
  state.venue.wallHeight = +$('wallHeight').value || 320;
  toast(t('dxfLoaded', { name, n: state.venue.segments.length }));
  emit('venue'); plan.fit();
}
$('venueFile').addEventListener('change', async (e) => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try {
    // Decide by file name first: some systems label .dxf files as "image/vnd.dxf".
    const isCad = /\.(dxf|dwg)$/i.test(f.name) || /dxf|dwg/i.test(f.type);
    if (!isCad && (f.type.startsWith('image/') || /\.(png|jpe?g|heic|heif|webp|gif)$/i.test(f.name))) {
      // A screenshot / photo of the plan: place it to scale as a background to design on.
      const src = await blobToDataUrl(f, 2400);
      const img = await new Promise((r, j) => { const i = new Image(); i.onload = () => r(i); i.onerror = () => j(new Error('image')); i.src = src; });
      // Place it roughly first (2000 cm wide), then the user marks the room corners and types width + length.
      const w = 2000, h = Math.round((w * img.height) / img.width);
      state.venue = { segments: [], layers: {}, wallHeight: +$('wallHeight').value || 320, image: { src, x: 0, y: 0, w, h, opacity: 0.7 } };
      emit('venue'); showView(currentView === 'split' ? 'split' : 'plan'); plan.fit();
      calibrateRoom();
      return;
    }
    if (/\.dwg$/i.test(f.name)) { toast(t('dwgClosed')); return; }
    const text = await f.text();
    if (!looksLikeDxf(text)) { toast(t('notDxf')); return; }
    setVenueFromDxf(text, f.name);
  } catch (err) { toast(t('dxfError', { msg: String(err.message).slice(0, 80) })); }
});
function renderVenueLibrary() {
  $('venueLibrary').innerHTML = `<option value="">${t('venueLibrary')}</option>` + VENUE_LIBRARY.map((v, i) => `<option value="${i}">${esc(getLang() === 'he' ? v.he : v.en)}</option>`).join('');
}
$('venueLibrary').addEventListener('change', async (e) => {
  const v = VENUE_LIBRARY[e.target.value]; e.target.value = ''; if (!v) return;
  try { setVenueFromDxf(await (await fetch(v.file)).text(), getLang() === 'he' ? v.he : v.en); } catch (err) { toast(t('dxfError', { msg: err.message })); }
});
$('demoVenue').addEventListener('click', () => {
  if (state.venue && !confirm(t('confirmDemo'))) return;
  state.venue = demoVenue(); emit('venue'); plan.fit();
  if (!state.furniture.length) {
    addFurniture(PRESETS[0], 18); addFurniture(PRESETS[4], 1); addFurniture(PRESETS[10], 1);
    addFurniture(PRESETS[9], 1); addFurniture(PRESETS[8], 1); addFurniture(PRESETS[12], 4);
    const inv = (id) => INVENTORY.find((i) => i.id === id);
    addFurniture(inv('curved-rust'), 2); addFurniture(inv('slipper-green'), 4); addFurniture(inv('low-round-linen'), 2); addFurniture(inv('bistro-candle'), 6); addFurniture(inv('pouf-damask'), 2);
  }
  toast(t('demoLoaded'));
});
$('wallHeight').addEventListener('change', () => { if (state.venue) { state.venue.wallHeight = +$('wallHeight').value; emit('venue'); } });
function renderLayers() {
  $('demoVenue').classList.toggle('hidden', !!state.venue);
  $('scaleBtn').classList.toggle('hidden', !state.venue?.image);
  const box = $('layerList'); box.innerHTML = '';
  if (!state.venue) return;
  $('wallHeight').value = state.venue.wallHeight || 320;
  for (const name of Object.keys(state.venue.layers)) {
    const l = document.createElement('label');
    l.innerHTML = `<span><input type="checkbox" ${state.venue.layers[name] ? 'checked' : ''}/> ${esc(name)}</span>`;
    l.querySelector('input').addEventListener('change', (e) => { state.venue.layers[name] = e.target.checked; emit('venue'); });
    box.append(l);
  }
}

// ---------- inventory gallery: click to add, drag onto the plan ----------
const invLabel = (p) => itemName({ ...p, invId: p.id });
function renderGallery() {
  const q = $('invSearch').value.trim().toLowerCase();
  $('inventory').innerHTML = INVENTORY.map((p, i) => ({ p, i })).filter(({ p }) => !q || p.name.toLowerCase().includes(q) || invLabel(p).toLowerCase().includes(q))
    .map(({ p, i }) => `<button class="inv" draggable="true" data-i="${i}" title="${esc(invLabel(p))} · ${p.w}×${p.d}×${p.h} cm"><img src="${p.photo}" alt="" draggable="false">${esc(invLabel(p))}</button>`).join('');
}
$('invSearch').addEventListener('input', renderGallery);
document.addEventListener('inventory-changed', renderGallery);
const furnitureFor = (inv) => state.furniture.find((f) => f.invId === inv.id) || addFurniture(inv, 0);
function placeItem(f, x, y) {
  if (x === undefined) plan.placeAtCenter(f); else plan.placeAt(f, x, y);
  f.qty = Math.max(f.qty, state.placed.filter((p) => p.itemId === f.id).length);
  emit('furniture');
}
$('inventory').addEventListener('click', (e) => {
  const b = e.target.closest('.inv'); if (!b) return;
  if (currentView !== 'plan' && currentView !== 'split' && currentView !== '3d') showView('plan');
  placeItem(furnitureFor(INVENTORY[b.dataset.i]));
});
$('inventory').addEventListener('dragstart', (e) => {
  const b = e.target.closest('.inv'); if (!b) return;
  e.dataTransfer.setData('text/x-inv', b.dataset.i); e.dataTransfer.effectAllowed = 'copy';
});
const canvasEl = $('planCanvas');
canvasEl.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
canvasEl.addEventListener('drop', (e) => {
  e.preventDefault();
  const i = e.dataTransfer.getData('text/x-inv'); if (i === '') return;
  const w = plan.worldAt(e.clientX, e.clientY);
  placeItem(furnitureFor(INVENTORY[+i]), w.x, w.y);
});

$('addPreset').addEventListener('click', () => {
  const v = $('presetSelect').value;
  const f = addFurniture(v === 'custom' ? { kind: 'custom', name: 'Custom item', w: 100, d: 60, h: 80, seats: 0, color: '#d8cbb8' } : PRESETS[v], 0);
  placeItem(f);
});
function renderPresets() {
  $('presetSelect').innerHTML = PRESETS.map((p, i) => `<option value="${i}">${esc(itemName(p))}</option>`).join('') + `<option value="custom">${t('custom')}</option>`;
}

function renderFurniture() {
  const list = $('furnitureList'); list.innerHTML = '';
  for (const f of state.furniture) {
    const placed = state.placed.filter((p) => p.itemId === f.id).length;
    const el = document.createElement('div'); el.className = 'fitem';
    el.innerHTML = `
      ${f.photo ? `<img class="thumb" src="${f.photo}" alt="">` : `<button class="color" title="Colour" style="background:${f.color}"></button>`}
      <div class="fmeta"><div class="fname">${esc(itemName(f))}</div><div class="hint">${f.w}×${f.d}×${f.h} · ${t('placedOf', { placed, qty: f.qty })}</div></div>
      <div class="btns">
        ${f.photo && !f.texture ? `<button class="color sm" title="Colour" style="background:${f.color}"></button>` : ''}
        <button data-a="place" title="${t('place')}">＋</button><button data-a="del" title="${t('remove')}">✕</button></div>
      <details class="dims-wrap"><summary>⚙</summary><div class="dims">
        <label>W<input type="number" data-k="w" value="${f.w}"></label>
        <label>D<input type="number" data-k="d" value="${f.d}"></label>
        <label>H<input type="number" data-k="h" value="${f.h}"></label>
        <label>${t('seat')}<input type="number" data-k="seats" value="${f.seats}"></label>
        <label>${t('qty')}<input type="number" data-k="qty" value="${f.qty}"></label>
      </div></details>`;
    el.querySelectorAll('.dims input').forEach((inp) => (inp.onchange = () => { f[inp.dataset.k] = Math.max(0, +inp.value); emit('furniture'); }));
    el.querySelectorAll('.color').forEach((b) => (b.onclick = () => {
      const c = getActiveColor();
      if (c) { f.color = c; emit('furniture'); return; }
      const picker = document.createElement('input'); picker.type = 'color'; picker.value = f.color;
      picker.oninput = () => { f.color = picker.value; emit('furniture'); }; picker.click();
    }));
    el.querySelector('[data-a=place]').onclick = () => placeItem(f);
    el.querySelector('[data-a=del]').onclick = () => {
      state.furniture = state.furniture.filter((x) => x !== f);
      state.placed = state.placed.filter((p) => p.itemId !== f.id); emit('furniture');
    };
    el.addEventListener('click', (e) => { if (e.target.closest('button,input,details')) return; state.selection = state.placed.filter((p) => p.itemId === f.id).map((p) => p.id); emit('select'); });
    list.append(el);
  }
}

// ---------- inspector ----------
function renderInspector() {
  const box = $('inspector');
  const sel = plan.selection();
  $('alignBar').classList.toggle('hidden', sel.length < 2);
  if (!sel.length) { box.classList.add('hidden'); return; }
  box.classList.remove('hidden');
  if (sel.length > 1) {
    box.innerHTML = `<strong>${t('selectedN', { n: sel.length })}</strong>
      <div class="row"><button data-a="rl">${t('rotateL')}</button><button data-a="rr">${t('rotateR')}</button></div>
      <div class="row"><button data-a="dup">${t('duplicate')}</button><button data-a="del" class="danger">${t('delete')}</button></div>`;
  } else {
    const p = sel[0], it = itemOf(p);
    box.innerHTML = `${it.photo ? `<img src="${it.photo}" alt="">` : ''}<strong>${esc(itemName(it))}</strong>
      <div class="size-row">
        <label>${t('widthCm')}<input type="number" min="1" data-size="w" value="${it.w}"></label>
        <label>${t('depthCm')}<input type="number" min="1" data-size="d" value="${it.d}"></label>
        <label>${t('heightCm')}<input type="number" min="1" data-size="h" value="${it.h}"></label>
      </div>
      ${it.invId ? `<span class="hint">${t('sizeSaved')}</span>` : ''}
      <label>${t('x')}<input type="number" data-k="x" value="${Math.round(p.x)}"></label>
      <label>${t('y')}<input type="number" data-k="y" value="${Math.round(p.y)}"></label>
      <label>${t('rotation')}<input type="number" data-k="rot" step="15" value="${Math.round(p.rot)}"></label>
      <label>${t('label')}<input type="text" data-k="label" value="${esc(p.label || '')}"></label>
      ${!it.invId && (it.seats || ['roundTable', 'rectTable'].includes(it.kind)) ? `<label>${t('seat')}<input type="number" data-seats value="${it.seats}" min="0"></label>` : ''}
      <label class="chk"><input type="checkbox" data-lock ${p.locked ? 'checked' : ''}> ${t('lock')}</label>
      <div class="row"><button data-a="rl">${t('rotateL')}</button><button data-a="rr">${t('rotateR')}</button></div>
      <div class="row"><button data-a="dup">${t('duplicate')}</button><button data-a="del" class="danger">${t('delete')}</button></div>`;
    box.querySelectorAll('input[data-k]').forEach((inp) => (inp.onchange = () => { p[inp.dataset.k] = inp.type === 'number' ? +inp.value : inp.value; emit('placed'); }));
    // Size: changes this piece everywhere in the event; for inventory pieces it also becomes the saved default size.
    box.querySelectorAll('[data-size]').forEach((inp) => (inp.onchange = () => {
      const k = inp.dataset.size, v = Math.max(1, Math.round(+inp.value || 0));
      it[k] = v;
      const inv = INVENTORY.find((x) => x.id === it.invId);
      if (inv) { inv[k] = v; saveInventory(); document.dispatchEvent(new CustomEvent('inventory-changed')); }
      emit('furniture'); toast(t('sizeUpdated'));
    }));
    const seats = box.querySelector('[data-seats]'); if (seats) seats.onchange = () => { it.seats = Math.max(0, +seats.value); emit('furniture'); };
    box.querySelector('[data-lock]').onchange = (e) => { p.locked = e.target.checked; emit('placed'); };
  }
  box.querySelector('[data-a=rl]').onclick = () => plan.rotateSelection(-15);
  box.querySelector('[data-a=rr]').onclick = () => plan.rotateSelection(15);
  box.querySelector('[data-a=dup]').onclick = () => plan.duplicateSelection();
  box.querySelector('[data-a=del]').onclick = () => plan.deleteSelection();
}
document.querySelectorAll('[data-align]').forEach((b) => (b.onclick = () => plan.align(b.dataset.align)));

// ---------- base design from the mood board ----------
let pickRows = [];
const pickLabel = (inv) => itemName({ ...inv, invId: inv.id });
function renderPick() {
  const list = $('pickList');
  list.innerHTML = pickRows.length ? '' : `<p class="hint">${t('pickNone')}</p>`;
  pickRows.forEach((r) => {
    const row = document.createElement('label'); row.className = 'pick-row';
    row.innerHTML = `<input type="checkbox" ${r.on ? 'checked' : ''}><img src="${r.inv.photo}" alt=""><span>${esc(pickLabel(r.inv))}<small>${t({ photo: 'pickFromPhoto', text: 'pickFromText', event: 'pickFromEvent', manual: 'add' }[r.from] || 'add')} · ${r.inv.w}×${r.inv.d}${seatsOf(r.inv) ? ' · ' + t('seatEstimate', { n: seatsOf(r.inv) }) : ''}</small></span><input type="number" min="1" value="${r.qty}">`;
    row.querySelector('[type=checkbox]').onchange = (e) => { r.on = e.target.checked; renderPickSeats(); };
    row.querySelector('[type=number]').onchange = (e) => { r.qty = Math.max(1, +e.target.value || 1); renderPickSeats(); };
    list.append(row);
  });
  $('pickAdd').innerHTML = INVENTORY.map((it, i) => `<option value="${i}">${esc(pickLabel(it))}</option>`).join('');
  renderPickSeats();
}
function renderPickSeats() {
  const n = pickRows.filter((r) => r.on).reduce((s, r) => s + seatsOf(r.inv) * r.qty, 0);
  $('pickSeats').textContent = n ? t('seatsAbout', { n }) : '';
}
function openPick(rows) { pickRows = rows; renderPick(); $('pickDialog').showModal(); }
document.addEventListener('mood-pptx', async (e) => {
  toast(t('findingPieces'));
  const found = await findInventory(e.detail.images, e.detail.text).catch(() => []);
  openPick(found.map((f) => ({ inv: f.inv, qty: f.count || 1, on: true, from: f.from })));
});
$('composeFromMood').addEventListener('click', async () => {
  // pieces already chosen for this event, or else whatever the mood board pictures show
  let rows = state.furniture.filter((f) => f.invId).map((f) => ({ inv: INVENTORY.find((i) => i.id === f.invId), qty: Math.max(1, f.qty), on: true, from: 'event' })).filter((r) => r.inv);
  if (!rows.length && state.mood.images.length) {
    toast(t('findingPieces'));
    rows = (await findInventory(state.mood.images, state.mood.pptxText || '').catch(() => [])).map((f) => ({ inv: f.inv, qty: f.count || 1, on: true, from: f.from }));
  }
  openPick(rows);
});
$('pickAddBtn').onclick = () => {
  const inv = INVENTORY[$('pickAdd').value]; if (!inv) return;
  const r = pickRows.find((x) => x.inv.id === inv.id);
  if (r) { r.qty++; r.on = true; } else pickRows.push({ inv, qty: 1, on: true, from: 'manual' });
  renderPick();
};
$('pickClose').onclick = () => $('pickDialog').close();
function applyPick() {
  const chosen = pickRows.filter((r) => r.on);
  const items = chosen.map((r) => { const f = furnitureFor(r.inv); f.qty = r.qty; return { f, qty: r.qty }; });
  emit('furniture');
  return items;
}
$('pickOnly').onclick = () => { applyPick(); $('pickDialog').close(); };
$('pickCompose').onclick = () => {
  const items = applyPick();
  if (!state.venue) { $('pickDialog').close(); toast(t('needVenue')); return; }
  const r = composeDesign(items);
  $('pickDialog').close();
  emit('placed'); showView('plan'); plan.fit();
  toast(r.missing ? t('composedMissing', { m: r.missing }) : t('composed', { n: r.placedCount }));
};

// ---------- layout / export ----------
$('autoLayout').addEventListener('click', () => {
  if (!state.furniture.length) { toast(t('addFirst')); return; }
  if (!state.venue) { toast(t('needVenue')); return; }
  try {
    const { missing } = suggestLayout();
    emit('placed');
    toast(missing ? t('layoutMissing', { n: missing }) : t('layoutDone'));
  } catch (err) { toast(err.message); }
});
$('clearLayout').addEventListener('click', () => { state.placed = state.placed.filter((p) => p.locked); state.selection = []; emit('placed'); });
$('exportDxf').addEventListener('click', () => download(`${fileBase()} - plan.dxf`, exportDxf(), 'application/dxf'));
$('fitView').addEventListener('click', plan.fit);
// Tap two opposite room corners, then type the real width and length: the plan image is stretched to fit
// (screenshots are often not to scale in both directions) and the 4 room walls are drawn.
const askMetres = (msg, def = '') => toMetres(parseFloat(String(prompt(msg, def) || '').replace(',', '.')));
function calibrateRoom() {
  $('stage').scrollIntoView({ behavior: 'smooth', block: 'start' });
  toast(t('cornersStep'));
  plan.startCalibrate(async (a, b) => {
    const im = state.venue?.image; if (!im) return;
    // Read the sizes written on the plan around the room (image pixels of the tapped corners).
    toast(t('readingDims'));
    const nat = await new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = im.src; });
    const toPx = (q) => ({ u: ((q.x - (im.x || 0)) / im.w) * nat.width, v: (1 - (q.y - (im.y || 0)) / im.h) * nat.height });
    const pa = toPx(a), pb = toPx(b);
    const found = await readDimensions(im.src, { x0: Math.min(pa.u, pb.u), x1: Math.max(pa.u, pb.u), y0: Math.min(pa.v, pb.v), y1: Math.max(pa.v, pb.v) });
    const W = askMetres(t('askRoomWidth'), found.w ?? ''); if (!(W > 0)) return;
    const L = askMetres(t('askRoomLength'), found.l ?? ''); if (!(L > 0)) return;
    const dx = Math.abs(b.x - a.x), dy = Math.abs(b.y - a.y); if (dx < 1 || dy < 1) return;
    const kx = (W * 100) / dx, ky = (L * 100) / dy, x0 = Math.min(a.x, b.x), y0 = Math.min(a.y, b.y);
    // move the room's bottom-left corner to 0,0 and scale each axis
    im.x = ((im.x || 0) - x0) * kx; im.y = ((im.y || 0) - y0) * ky; im.w *= kx; im.h *= ky;
    const Wc = W * 100, Lc = L * 100;
    toast(t('tracing'));
    // Trace the picture into CAD lines, add dimension lines, then hide the photo (it stays as a layer).
    traceImage(im.src).then((tr) => {
      const traced = strokesToSegments(tr, im, { W: Wc, L: Lc });
      const walls = traced.filter((s) => s.layer === 'WALLS').length;
      const outline = walls < 4 ? [[0, 0, Wc, 0], [Wc, 0, Wc, Lc], [Wc, Lc, 0, Lc], [0, Lc, 0, 0]].map(([x1, y1, x2, y2]) => ({ x1, y1, x2, y2, layer: 'WALLS' })) : [];
      const dims = dimensionsFor(Wc, Lc);
      state.venue.segments = [...outline, ...traced, ...dims.segs];
      state.venue.texts = dims.texts;
      state.venue.layers = { WALLS: true, DETAIL: true, DIMENSIONS: true, PHOTO: false };
      emit('venue'); plan.fit(); toast(t('roomDone', { w: W, l: L }));
    }).catch(() => toast(t('traceFail')));
  });
}
$('scaleBtn').addEventListener('click', calibrateRoom);
function renderMeasureUi() {
  const on = plan.isMeasuring();
  $('measureBtn').textContent = on ? t('measureOn') : t('measure');
  $('measureBtn').classList.toggle('primary', on);
  $('clearMeasures').classList.toggle('hidden', !(state.measures || []).length);
}
$('measureBtn').addEventListener('click', () => { if (plan.toggleMeasure()) toast(t('measureHint')); renderMeasureUi(); });
$('clearMeasures').addEventListener('click', () => { state.measures = []; emit('measure'); });
$('undoBtn').onclick = () => emit('undo');
$('undoTop').onclick = () => emit('undo');
$('redoTop').onclick = () => emit('redo');
$('redoBtn').onclick = () => emit('redo');

// ---------- 3D ----------
document.querySelectorAll('[data-cam]').forEach((b) => b.addEventListener('click', () => view3d.setCamera(b.dataset.cam)));
$('lightMood').addEventListener('change', (e) => { state.mood.light = e.target.value; view3d.setLighting(e.target.value); emit('moodText'); });
$('renderShot').addEventListener('click', () => view3d.snapshot('render'));
// walking mode tools
document.addEventListener('walk-mode', (e) => {
  $('walkTools').classList.toggle('hidden', !e.detail);
  document.querySelector('[data-cam="walk"]').classList.toggle('primary', e.detail);
  if (e.detail) toast(t('walkHint'));
});
$('walkExit').onclick = () => view3d.stopWalk();
$('walkSnap').onclick = () => openRender(view3d.capture(2400, 1350, 'image/jpeg'));
$('walkBeauty').onclick = async () => { toast(t('rendering')); await new Promise((r) => setTimeout(r, 60)); openRender(await view3d.beautyRender()); };
let lastRender = null;
function openRender(url) { lastRender = url; $('renderImg').src = url; $('renderDialog').showModal(); }
$('renderClose').onclick = () => $('renderDialog').close();
$('renderSave').onclick = () => { const a = document.createElement('a'); a.href = lastRender; a.download = `${fileBase()} - view ${(state.renders || []).length + 1}.jpg`; a.click(); };
$('renderToDeck').onclick = () => { (state.renders ||= []).push(lastRender); emit('renders'); toast(t('addedToDeck')); $('renderDialog').close(); };
$('renderAll').addEventListener('click', () => view3d.renderAll());

// ---------- presentation ----------
$('buildPresent').onclick = () => buildPresentation();
$('printPresent').onclick = () => { document.body.classList.add('printing-present'); window.print(); setTimeout(() => document.body.classList.remove('printing-present'), 500); };
$('presentSuppliers').onchange = () => buildPresentation();

// ---------- language ----------
$('langToggle').onclick = () => { applyLang(getLang() === 'he' ? 'en' : 'he'); $('saveState').textContent = '✓ ' + t('saved'); refreshAll(); };
function refreshAll() {
  renderVenueLibrary(); renderMeasureUi(); renderPresets(); renderGallery(); renderFurniture(); renderMood(); renderStats(); renderInspector(); renderEventSelect(); plan.draw();
  if (currentView === 'inventory') renderInventory();
  if (currentView === 'present') buildPresentation();
}

// ---------- saving ----------
let saveTimer;
function autosave() {
  $('saveState').textContent = t('saving');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try { await saveProject(); $('saveState').textContent = '✓ ' + t('saved'); } catch { $('saveState').textContent = '⚠'; }
    renderEventSelect();
  }, 600);
}
window.addEventListener('beforeunload', () => { saveProject(); });

// ---------- reactions ----------
let rebuild3d, commitTimer;
function refreshUndo() { $('undoBtn').disabled = $('undoTop').disabled = !canUndo(); $('redoBtn').disabled = $('redoTop').disabled = !canRedo(); }
onChange((reason) => {
  if (reason === 'undo' || reason === 'redo') {
    if (reason === 'undo' ? undo() : redo()) emit('restored');
    return;
  }
  if (reason === 'load') { saveInventory(); /* event copies pick up corrected inventory sizes */ renderBrief(); renderLayers(); renderMood(); $('lightMood').value = state.mood.light || 'evening'; }
  if (reason === 'venue') renderLayers();
  if (['measure', 'measureMode', 'load'].includes(reason)) renderMeasureUi();
  if (reason === 'mood') renderMood();
  // one user action can fire several changes in a row — record them as a single undo step
  if (reason === 'furniture' || reason === 'placed') { clearTimeout(commitTimer); commitTimer = setTimeout(() => { commitHistory(); refreshUndo(); }, 0); }
  if (['furniture', 'placed', 'mood', 'load', 'restored'].includes(reason)) renderFurniture();
  refreshUndo();
  if (reason !== 'move') renderInspector();
  if (reason !== 'moodText') { plan.draw(); if (reason !== 'move') renderStats(); }
  if (show3d()) {
    if (reason === 'move' || reason === 'select') view3d.sync();
    else if (['placed', 'furniture', 'venue', 'mood', 'load', 'restored'].includes(reason)) { clearTimeout(rebuild3d); rebuild3d = setTimeout(() => view3d.rebuild(), 120); }
  }
  if (reason !== 'select' && reason !== 'move') autosave();
});
onChange((reason) => { if (reason === 'select') renderSidebarPalette(); });

window.addEventListener('resize', () => { plan.resize(); view3d.resize(); });

// ---------- start ----------
applyLang();
renderVenueLibrary();
renderPresets();
renderGallery();
initInventory(toast);
initMood(toast);
(async () => {
  const ok = await restoreLastProject().catch(() => false);
  if (!ok) newProject(t('newEventName'));
  await saveProject().catch(() => {});
  renderEventSelect();
  plan.resize();
  plan.fit();
})();
