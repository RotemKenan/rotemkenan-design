// Mood board tab: images (PowerPoint or photos), editable palette, colour roles, lighting, templates.
import { state, emit } from './state.js';
import { readMoodBoard, blobToDataUrl, paletteFromImages, dedupe } from './pptx.js';
import { t, getLang } from './i18n.js';

const $ = (id) => document.getElementById(id);
export const ROLES = ['walls', 'floor', 'linen', 'chairs', 'accent', 'florals'];
let activeColor = null;
export const getActiveColor = () => activeColor;

// Starting moods built around Rotem's inventory colours.
export const TEMPLATES = [
  { id: 'velvet', en: 'Burnt Velvet Evening', he: 'ערב קטיפה חמה', keywords: ['warm', 'intimate', 'vintage', 'candlelit'],
    palette: ['#8a3f22', '#7a4526', '#4d5e33', '#ece5d8', '#1b1918', '#c9a25a', '#d9c9b4', '#5a4030'],
    roles: { walls: '#d9c9b4', floor: '#5a4030', linen: '#ece5d8', chairs: '#1b1918', accent: '#c9a25a', florals: '#8a3f22' }, light: 'candle' },
  { id: 'damask', en: 'Bohemian Damask', he: 'בוהו דמשק', keywords: ['rich', 'layered', 'moody', 'fringe'],
    palette: ['#6e1020', '#b08a3e', '#7a4a22', '#5a1a1e', '#e3d3bb', '#1b1918', '#a8452e', '#3b2419'],
    roles: { walls: '#3b2419', floor: '#5a1a1e', linen: '#e3d3bb', chairs: '#6e1020', accent: '#b08a3e', florals: '#a8452e' }, light: 'candle' },
  { id: 'garden', en: 'Garden Linen', he: 'פשתן בגן', keywords: ['fresh', 'natural', 'airy', 'daylight'],
    palette: ['#efe8dc', '#9aa58e', '#5f7744', '#fbf8f3', '#8a5f3c', '#d8c3a0', '#c9b79c'],
    roles: { walls: '#fbf8f3', floor: '#c9b79c', linen: '#efe8dc', chairs: '#8a5f3c', accent: '#d8c3a0', florals: '#9aa58e' }, light: 'day' },
  { id: 'navy', en: 'Midnight Navy & Brass', he: 'נייבי לילה ופליז', keywords: ['elegant', 'deep', 'glamour', 'jazz'],
    palette: ['#1c2a52', '#3f7a72', '#b8914a', '#f2ece2', '#2a2a2e', '#6e1020', '#25365a'],
    roles: { walls: '#2a2a2e', floor: '#1c2a52', linen: '#f2ece2', chairs: '#25365a', accent: '#b8914a', florals: '#6e1020' }, light: 'evening' },
];

export function renderMood() {
  const m = state.mood;
  $('moodName').value = m.name || '';
  $('moodKeywords').value = (m.keywords || []).join(', ');
  $('moodNotes').value = m.notes || '';
  $('moodLight').value = m.light || 'evening';

  $('moodTemplates').innerHTML = TEMPLATES.map((tp) => `<button class="tpl" data-tpl="${tp.id}">${tp.palette.slice(0, 5).map((c) => `<i style="background:${c}"></i>`).join('')}<span>${getLang() === 'he' ? tp.he : tp.en}</span></button>`).join('');

  // palette editor
  const pe = $('paletteEdit'); pe.innerHTML = '';
  m.palette.forEach((c, i) => {
    const sw = document.createElement('div');
    sw.className = 'swatch-edit' + (c === activeColor ? ' active' : '');
    sw.innerHTML = `<button class="sw" style="background:${c}" title="${c}"></button><input type="color" value="${c}"><button class="x" title="${t('remove')}">×</button>`;
    sw.querySelector('.sw').onclick = () => { activeColor = activeColor === c ? null : c; renderMood(); renderSidebarPalette(); };
    sw.querySelector('input').onchange = (e) => {
      const old = m.palette[i]; m.palette[i] = e.target.value;
      for (const r of ROLES) if (m.roles[r] === old) m.roles[r] = e.target.value;
      emit('mood');
    };
    sw.querySelector('.x').onclick = () => { m.palette.splice(i, 1); emit('mood'); };
    pe.append(sw);
  });

  // roles
  $('roles').innerHTML = ROLES.map((r) => `<div class="role" data-role="${r}">
      <span>${t('role' + r[0].toUpperCase() + r.slice(1))}</span>
      <span class="role-sw" style="background:${m.roles[r] || 'transparent'}">${m.roles[r] ? '' : t('none')}</span>
      <span class="role-picks">${m.palette.map((c) => `<button data-c="${c}" style="background:${c}" class="${m.roles[r] === c ? 'on' : ''}"></button>`).join('')}</span>
    </div>`).join('');

  // gallery
  const gal = $('moodGallery');
  gal.innerHTML = m.images.map((src, i) => `<figure><img src="${src}" alt=""><button data-del="${i}" title="${t('removeImage')}">×</button></figure>`).join('');
  renderSidebarPalette();
}

export function renderSidebarPalette() {
  const pal = $('palette'); pal.innerHTML = '';
  for (const c of state.mood.palette) {
    const s = document.createElement('button');
    s.className = 'swatch' + (c === activeColor ? ' active' : ''); s.style.background = c; s.title = c;
    s.onclick = () => { activeColor = activeColor === c ? null : c; renderSidebarPalette(); };
    pal.append(s);
  }
}

async function addFiles(files, toast) {
  const m = state.mood;
  for (const f of files) {
    try {
      if (/\.pptx$/i.test(f.name)) {
        toast(t('reading'));
        const r = await readMoodBoard(f);
        m.images.push(...r.images);
        m.palette = dedupe([...m.palette, ...r.palette]).slice(0, 14);
        toast(t('moodLoaded', { images: r.images.length, colors: r.palette.length }));
      } else if (f.type.startsWith('image/')) {
        m.images.push(await blobToDataUrl(f, 1000));
      }
    } catch (err) { toast(t('pptError', { msg: err.message })); }
  }
  if (!m.palette.length && m.images.length) m.palette = dedupe(await paletteFromImages(m.images.slice(0, 12))).slice(0, 10);
  autoRoles();
  emit('mood');
}

// Fill empty roles from the palette: lightest → walls/linen, darkest → floor/chairs, most saturated → florals/accent.
function autoRoles() {
  const m = state.mood, pal = m.palette; if (!pal.length) return;
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const lum = (h) => { const [r, g, b] = rgb(h); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const sat = (h) => { const c = rgb(h); return Math.max(...c) - Math.min(...c); };
  const byLum = [...pal].sort((a, b) => lum(b) - lum(a)), bySat = [...pal].sort((a, b) => sat(b) - sat(a));
  const pick = { walls: byLum[0], linen: byLum[1] || byLum[0], floor: byLum[byLum.length - 2] || byLum.at(-1), chairs: byLum.at(-1), florals: bySat[0], accent: bySat[1] || bySat[0] };
  for (const r of ROLES) if (!m.roles[r]) m.roles[r] = pick[r];
}

// Push the mood into the design: linen on all tables, florals on plants, lighting preset.
export function applyMood() {
  const m = state.mood;
  for (const f of state.furniture) {
    if (['roundTable', 'rectTable', 'buffet', 'cocktail'].includes(f.kind) && m.roles.linen) f.color = m.roles.linen;
    if (f.kind === 'plant' && m.roles.florals) f.color = m.roles.florals;
    if (f.kind === 'chuppah' && m.roles.linen) f.color = m.roles.linen;
  }
  document.getElementById('lightMood').value = m.light || 'evening';
  emit('furniture');
}

export function initMood(toast) {
  const m = () => state.mood;
  $('moodName').oninput = (e) => { m().name = e.target.value; emit('moodText'); };
  $('moodKeywords').onchange = (e) => { m().keywords = e.target.value.split(/[,،]/).map((s) => s.trim()).filter(Boolean); emit('moodText'); };
  $('moodNotes').oninput = (e) => { m().notes = e.target.value; emit('moodText'); };
  $('moodLight').onchange = (e) => { m().light = e.target.value; emit('moodText'); };
  $('moodFile').onchange = async (e) => { await addFiles([...e.target.files], toast); e.target.value = ''; };
  const drop = $('moodDrop');
  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', async (e) => { e.preventDefault(); drop.classList.remove('over'); await addFiles([...e.dataTransfer.files], toast); });
  $('moodGallery').onclick = (e) => { const i = e.target.dataset.del; if (i !== undefined) { m().images.splice(+i, 1); emit('mood'); } };
  $('addColor').onclick = () => { m().palette.push(activeColor || '#b5532c'); emit('mood'); };
  $('extractColors').onclick = async () => { if (!m().images.length) return; m().palette = dedupe([...m().palette, ...(await paletteFromImages(m().images.slice(0, 12)))]).slice(0, 14); emit('mood'); };
  $('roles').onclick = (e) => {
    const role = e.target.closest('.role')?.dataset.role; if (!role) return;
    const c = e.target.dataset.c || activeColor; if (!c) { toast(t('pickRole')); return; }
    m().roles[role] = c; emit('mood');
  };
  $('moodTemplates').onclick = (e) => {
    const tp = TEMPLATES.find((x) => x.id === e.target.closest('.tpl')?.dataset.tpl); if (!tp) return;
    Object.assign(m(), { name: m().name || (getLang() === 'he' ? tp.he : tp.en), keywords: m().keywords.length ? m().keywords : tp.keywords, palette: [...tp.palette], roles: { ...tp.roles }, light: tp.light });
    emit('mood');
  };
  $('applyMood').onclick = () => { applyMood(); toast(t('moodApplied')); };
}
