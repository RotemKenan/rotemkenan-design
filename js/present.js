// Client presentation: cover, mood, palette, floor plan, 3D views and furniture list. Print → PDF.
import { state, itemOf } from './state.js';
import { t, itemName, getLang } from './i18n.js';
import { snapshotPlan } from './plan2d.js';
import { captureViews } from './view3d.js';
import { ROLES } from './mood.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function eventDate() {
  if (!state.brief.date) return '';
  try { return new Date(state.brief.date).toLocaleDateString(getLang() === 'he' ? 'he-IL' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); } catch { return state.brief.date; }
}

export function buildPresentation() {
  const doc = document.getElementById('presentDoc');
  const m = state.mood, b = state.brief;
  const suppliers = document.getElementById('presentSuppliers').checked;
  const planImg = state.placed.length || state.venue ? snapshotPlan() : '';
  const views = state.placed.length ? captureViews() : [];
  const counts = state.furniture.map((f) => ({ f, n: state.placed.filter((p) => p.itemId === f.id).length })).filter((o) => o.n);
  const typeKey = { wedding: 'typeWedding', henna: 'typeHenna', barmitzvah: 'typeBar', birthday: 'typeBirthday', corporate: 'typeCorporate', private: 'typePrivate' }[b.type];

  doc.innerHTML = `
    <section class="p-page p-cover" style="--c1:${m.roles.walls || '#efe8dc'};--c2:${m.roles.florals || '#8a3f22'}">
      ${m.images[0] ? `<div class="p-hero" style="background-image:url(${m.images[0]})"></div>` : ''}
      <div class="p-cover-text">
        <img src="assets/logo.svg" alt="" class="p-logo">
        <p class="p-kicker">${esc(t('pCover'))}</p>
        <h1><bdi>${esc(state.eventName || t('untitled'))}</bdi></h1>
        <p class="p-meta">${[t(typeKey), eventDate(), b.venueName, b.guests ? `${b.guests} ${t('pGuests')}` : ''].filter(Boolean).map(esc).join(' · ')}</p>
        ${b.client ? `<p class="p-meta">${esc(b.client)}</p>` : ''}
        ${m.name ? `<p class="p-mood-name"><bdi>“${esc(m.name)}”</bdi></p>` : ''}
      </div>
    </section>

    ${m.images.length || m.palette.length ? `<section class="p-page">
      <h2>${esc(t('pMood'))}${m.name ? ` — <bdi>${esc(m.name)}</bdi>` : ''}</h2>
      ${m.keywords.length ? `<p class="p-keywords">${m.keywords.map(esc).join(' · ')}</p>` : ''}
      <div class="p-mood">${m.images.slice(0, 9).map((src) => `<img src="${src}" alt="">`).join('')}</div>
      <h3>${esc(t('pPalette'))}</h3>
      <div class="p-palette">${m.palette.map((c) => `<div><i style="background:${c}"></i><span>${c}</span></div>`).join('')}</div>
      <div class="p-roles">${ROLES.filter((r) => m.roles[r]).map((r) => `<div><i style="background:${m.roles[r]}"></i>${esc(t('role' + r[0].toUpperCase() + r.slice(1)))}</div>`).join('')}</div>
      ${m.notes ? `<p class="p-notes">${esc(m.notes)}</p>` : ''}
    </section>` : ''}

    ${planImg ? `<section class="p-page"><h2>${esc(t('pPlan'))}</h2><img class="p-plan" src="${planImg}" alt=""></section>` : ''}

    ${views.length ? `<section class="p-page"><h2>${esc(t('pViews'))}</h2><div class="p-views">${views.map((v) => `<img src="${v.url}" alt="">`).join('')}</div></section>` : ''}

    ${counts.length ? `<section class="p-page"><h2>${esc(t('pFurniture'))}</h2>
      <table class="p-table"><thead><tr><th></th><th>${esc(t('pPieces'))}</th><th>${esc(t('pSize'))}</th><th>${esc(t('pQty'))}</th>${suppliers ? `<th>${esc(t('supplier'))}</th>` : ''}</tr></thead><tbody>
      ${counts.map(({ f, n }) => `<tr><td>${f.photo ? `<img src="${f.photo}" alt="">` : `<i class="p-dot" style="background:${f.color}"></i>`}</td><td>${esc(itemName(f))}</td><td>${f.w}×${f.d}×${f.h}</td><td>${n}</td>${suppliers ? `<td>${esc([f.supplier, f.sku].filter(Boolean).join(' · '))}</td>` : ''}</tr>`).join('')}
      </tbody></table></section>` : ''}

    <footer class="p-footer">${esc(t('pPrepared'))}</footer>`;
}
