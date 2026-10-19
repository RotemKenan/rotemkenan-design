// Inventory tab: measurements, live 3D preview, top-view drawing, GLB + DXF downloads per piece.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import JSZip from 'jszip';
import { INVENTORY, saveInventory, emit } from './state.js';
import { buildItem } from './models.js';
import { itemDxf, itemOutline } from './dxf.js';
import { TEXTURE_TYPES } from './textures.js';

const $ = (id) => document.getElementById(id);
let selected = INVENTORY[0];
let renderer, scene, camera, controls, model;

export function download(name, content, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(content instanceof Blob ? content : new Blob([content], { type }));
  a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

export function renderInventory() {
  const body = $('invRows');
  body.innerHTML = '';
  for (const it of INVENTORY) {
    const tr = document.createElement('tr');
    if (it === selected) tr.className = 'sel';
    const num = (k, show = true) => show
      ? `<input type="number" data-k="${k}" value="${it[k] ?? ''}" class="${!it.measured && !(it.known || []).includes(k) ? 'est' : ''}" title="${!it.measured && !(it.known || []).includes(k) ? 'Estimate — please measure' : 'Confirmed'}">`
      : '–';
    tr.innerHTML = `
      <td><img src="${it.photo}" alt=""></td>
      <td><input class="txt" data-k="name" value="${it.name.replace(/"/g, '&quot;')}" style="width:170px"></td>
      <td>${num('w')}</td><td>${num('d')}</td><td>${num('h')}</td>
      <td>${num('seatH', it.seatH > 0 || ['club', 'slipper', 'channelSofa', 'curvedSofa'].includes(it.kind))}</td>
      <td>${num('innerW', it.kind === 'curvedSofa')}</td>
      <td><select data-k="finish">${TEXTURE_TYPES.map((t) => `<option ${t === it.finish ? 'selected' : ''}>${t}</option>`).join('')}</select>
          <input type="color" data-k="color" value="${it.color}" title="Colour"></td>
      <td><input type="number" data-k="stock" value="${it.stock}" min="0"></td>
      <td><input class="txt" data-k="supplier" value="${it.supplier || ''}" placeholder="Supplier"><br><input class="txt" data-k="sku" value="${it.sku || ''}" placeholder="SKU"></td>
      <td><input type="checkbox" data-k="measured" ${it.measured ? 'checked' : ''}></td>
      <td class="files"><button data-a="glb" title="3D model with textures">GLB</button><button data-a="dxf" title="Top-view block for AutoCAD">DXF</button></td>`;
    tr.addEventListener('click', (e) => { if (e.target.closest('input,select,button')) return; select(it); });
    tr.querySelectorAll('[data-k]').forEach((inp) => inp.addEventListener('change', () => {
      const k = inp.dataset.k;
      it[k] = inp.type === 'checkbox' ? inp.checked : inp.type === 'number' ? Math.max(0, +inp.value) : inp.value;
      saveInventory(); emit('furniture');
      if (k === 'measured') renderInventory();
      if (it === selected) showPreview();
      document.dispatchEvent(new CustomEvent('inventory-changed'));
    }));
    tr.querySelector('[data-a=glb]').onclick = async () => download(`${it.id}.glb`, await exportGlb(it), 'model/gltf-binary');
    tr.querySelector('[data-a=dxf]').onclick = () => download(`${it.id}.dxf`, itemDxf(it), 'application/dxf');
    body.append(tr);
  }
}

function select(it) { selected = it; renderInventory(); showPreview(); }

function initPreview() {
  const host = $('invPreviewHost');
  renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  host.append(renderer.domElement);
  scene = new THREE.Scene();
  scene.background = new THREE.Color('#ece6dd');
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  const key = new THREE.DirectionalLight('#fff4e6', 1.6); key.position.set(2, 4, 3); key.castShadow = true; scene.add(key);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(4, 48), new THREE.ShadowMaterial({ opacity: 0.18 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  camera = new THREE.PerspectiveCamera(35, 1, 0.05, 50);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  const loop = () => { requestAnimationFrame(loop); controls.update(); renderer.render(scene, camera); };
  loop();
}

export function showPreview() {
  if (!renderer) initPreview();
  const host = $('invPreviewHost'), r = host.getBoundingClientRect();
  if (r.width) { renderer.setSize(r.width, r.height); camera.aspect = r.width / r.height; camera.updateProjectionMatrix(); }
  if (model) scene.remove(model);
  model = buildItem(selected, { chairs: false });
  scene.add(model);
  const size = Math.max(selected.w, selected.d, selected.h) / 100;
  const dist = size * 2.2 + 0.5;
  camera.position.set(dist * 0.55, dist * 0.5, dist * 0.75);
  controls.target.set(0, selected.h / 200, 0);
  $('invPreviewInfo').innerHTML = `<strong>${selected.name}</strong> · ${selected.w} × ${selected.d} × H ${selected.h} cm
    ${selected.measured ? '<span style="color:#3d7a4f"> ✓ measured</span>' : '<span style="color:#b0602a"> · estimate</span>'}
    ${topViewSvg(selected)}<p class="hint">Top view = the DXF block. Back of seats is at the top; base point = centre.</p>`;
}

// Top-view drawing with dimension lines, from the same outline as the DXF block.
function topViewSvg(it) {
  const ents = itemOutline(it), pad = Math.max(it.w, it.d) * 0.22 + 10;
  const ext = Math.max(it.w, it.d) / 2 + 5;
  const vb = `${-ext - pad} ${-ext - pad} ${2 * (ext + pad)} ${2 * (ext + pad)}`;
  const sw = ext / 90;
  const paths = ents.map((e) => {
    if (e.t === 'LINE') return `<line x1="${e.x1}" y1="${-e.y1}" x2="${e.x2}" y2="${-e.y2}"/>`;
    if (e.t === 'CIRCLE') return `<circle cx="${e.x}" cy="${-e.y}" r="${e.r}"/>`;
    const a0 = (e.a0 * Math.PI) / 180, a1 = (e.a1 * Math.PI) / 180;
    const p = (a) => `${e.x + e.r * Math.cos(a)} ${-(e.y + e.r * Math.sin(a))}`;
    return `<path d="M ${p(a0)} A ${e.r} ${e.r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 0 ${p(a1)}"/>`;
  }).join('');
  const hw = it.w / 2, hd = it.d / 2, fs = ext / 7;
  return `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="#1b1918" stroke-width="${sw * 1.4}">${paths}</g>
    <g stroke="#8a3f22" stroke-width="${sw}" fill="#8a3f22" font-size="${fs}" font-family="Inter" text-anchor="middle">
      <line x1="${-hw}" y1="${hd + pad * 0.5}" x2="${hw}" y2="${hd + pad * 0.5}"/><text x="0" y="${hd + pad * 0.5 + fs * 1.1}" stroke="none">${it.w}</text>
      <line x1="${hw + pad * 0.5}" y1="${-hd}" x2="${hw + pad * 0.5}" y2="${hd}"/><text x="${hw + pad * 0.5 + fs * 0.4}" y="0" stroke="none" text-anchor="start">${it.d}</text>
    </g></svg>`;
}

export function exportGlb(it) {
  const obj = buildItem(it, { chairs: false });
  obj.name = it.id;
  obj.userData = { name: it.name, widthCm: it.w, depthCm: it.d, heightCm: it.h, seatHeightCm: it.seatH, units: 'metres', front: '+Z (back of seats at -Z)', supplier: it.supplier, sku: it.sku };
  return new Promise((resolve, reject) => new GLTFExporter().parse(obj, (buf) => resolve(new Blob([buf], { type: 'model/gltf-binary' })), reject, { binary: true, maxTextureSize: 1024 }));
}

export async function exportAllZip() {
  const zip = new JSZip();
  const rows = [['id', 'name', 'width_cm', 'depth_cm', 'height_cm', 'seat_height_cm', 'inner_diameter_cm', 'finish', 'colour', 'stock', 'supplier', 'sku', 'measured', 'notes']];
  for (const it of INVENTORY) {
    zip.file(`3d/${it.id}.glb`, await exportGlb(it));
    zip.file(`dwg-dxf/${it.id}.dxf`, itemDxf(it));
    rows.push([it.id, it.name, it.w, it.d, it.h, it.seatH || '', it.innerW || '', it.finish, it.color, it.stock, it.supplier, it.sku, it.measured ? 'yes' : 'estimate', it.notes]);
  }
  zip.file('inventory.csv', '﻿' + rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n'));
  zip.file('inventory.json', JSON.stringify(INVENTORY, null, 2));
  return zip.generateAsync({ type: 'blob' });
}

function printSheet() {
  let el = $('printSheet');
  if (!el) { el = document.createElement('div'); el.id = 'printSheet'; document.body.append(el); }
  el.innerHTML = `<h2>Rotem Kenan — Inventory measuring sheet</h2>
    <p>Measure at the widest points, in cm. The current value in the app is shown in brackets — write the measured value next to it.</p>
    <table><tr><th>Photo</th><th>Piece</th><th>W</th><th>D</th><th>H</th><th>Seat H</th><th>Inner Ø</th><th>Qty in stock</th><th>Notes</th></tr>
    ${INVENTORY.map((it) => `<tr><td><img src="${it.photo}"></td><td>${it.name}</td>
      <td class="box">(${it.w})</td><td class="box">(${it.d})</td><td class="box">(${it.h})</td><td class="box">${it.seatH ? `(${it.seatH})` : ''}</td>
      <td class="box">${it.kind === 'curvedSofa' ? `(${it.innerW})` : '—'}</td><td class="box">(${it.stock})</td><td style="width:22%"></td></tr>`).join('')}
    </table>`;
  window.print();
}

export function initInventory(toast) {
  renderInventory();
  $('invPrint').onclick = printSheet;
  $('invAllZip').onclick = async () => { toast('Building models…'); download('rotem-kenan-inventory.zip', await exportAllZip()); };
  $('invExport').onclick = () => download('inventory.json', JSON.stringify(INVENTORY, null, 2), 'application/json');
  $('invImport').onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try {
      for (const it of JSON.parse(await f.text())) {
        const cur = INVENTORY.find((x) => x.id === it.id);
        cur ? Object.assign(cur, it) : INVENTORY.push(it);
      }
      saveInventory(); emit('furniture'); renderInventory(); showPreview(); toast('Inventory imported');
    } catch { toast('That file is not an inventory export.'); }
    e.target.value = '';
  };
}
