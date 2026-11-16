// Cloud backup in the user's own Google Drive — a hidden folder only this app can see.
// Every event and the inventory are kept there and synced between devices.
// Signing in happens in Google's own window; no password or key is stored in the app
// (Google's sign-in gives a pass that expires after about an hour).
import { state, load, emit, listProjects, putProject, deleteProject, inventoryRaw, inventoryUpdated, setInventoryRaw } from './state.js';

// The app's public Google sign-in ID (OAuth client ID). Not a secret: it only says "this is Rotem's Event Studio".
export const CLIENT_ID = '';
const clientId = () => { try { return localStorage.getItem('rk-cloud-client') || CLIENT_ID; } catch { return CLIENT_ID; } };
export const setClientId = (v) => { try { v ? localStorage.setItem('rk-cloud-client', v.trim()) : localStorage.removeItem('rk-cloud-client'); } catch { /* storage blocked */ } };
export const hasClientId = () => !!clientId();

const SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const API = 'https://www.googleapis.com/drive/v3', UP = 'https://www.googleapis.com/upload/drive/v3';
const INFO = 'rk-cloud', KNOWN = 'rk-cloud-known', GONE = 'rk-cloud-deleted';
let token = null, tokenExp = 0;

const getJSON = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const setJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage blocked */ } };
export const cloudInfo = () => getJSON(INFO, {});
export const cloudOn = () => !!cloudInfo().on;
export const signedIn = () => !!token && Date.now() < tokenExp - 60000;
const status = (s, extra = {}) => { setJSON(INFO, { ...cloudInfo(), ...extra }); document.dispatchEvent(new CustomEvent('cloud-status', { detail: s })); };

function loadGis() {
  return new Promise((res, rej) => {
    if (window.google?.accounts?.oauth2) return res();
    const s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client';
    s.onload = res; s.onerror = () => rej(Object.assign(new Error('offline'), { offline: true })); document.head.appendChild(s);
  });
}
// Must be called from a click (Google opens its sign-in window).
export async function signIn() {
  if (!clientId()) throw Object.assign(new Error('setup'), { setup: true });
  if (signedIn()) return token;
  await loadGis();
  return new Promise((res, rej) => {
    const tc = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId(), scope: SCOPE,
      callback: (r) => { if (r.error) return rej(new Error(r.error)); token = r.access_token; tokenExp = Date.now() + (r.expires_in || 3600) * 1000; status('signed-in', { on: true }); res(token); },
      error_callback: (e) => rej(new Error(e?.type || 'popup_closed')),
    });
    tc.requestAccessToken({ prompt: cloudOn() ? '' : 'consent' });
  });
}
export function signOut() { token = null; tokenExp = 0; setJSON(INFO, {}); setJSON(KNOWN, []); status('off'); }

async function api(url, opts = {}) {
  const r = await fetch(url, { ...opts, headers: { Authorization: `Bearer ${token}`, ...(opts.headers || {}) } });
  if (r.status === 401) { token = null; throw Object.assign(new Error('expired'), { expired: true }); }
  if (!r.ok && r.status !== 404) throw new Error(`drive ${r.status}`);
  return r;
}
async function listFiles() {
  const out = []; let page = '';
  do {
    const r = await (await api(`${API}/files?spaces=appDataFolder&pageSize=1000&fields=nextPageToken,files(id,name,appProperties)${page ? `&pageToken=${page}` : ''}`)).json();
    out.push(...(r.files || [])); page = r.nextPageToken || '';
  } while (page);
  return out;
}
const download = async (id) => (await api(`${API}/files/${id}?alt=media`)).text();
// resumable upload: works for big events (mood-board pictures make them several MB)
async function upload(name, text, props, id) {
  const meta = id ? { appProperties: props } : { name, parents: ['appDataFolder'], appProperties: props };
  const start = await api(`${UP}/files${id ? `/${id}` : ''}?uploadType=resumable`, { method: id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json; charset=UTF-8' }, body: JSON.stringify(meta) });
  const where = start.headers.get('Location');
  const r = await fetch(where, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: text });
  if (!r.ok) throw new Error(`upload ${r.status}`);
  return (await r.json()).id;
}
const remove = (id) => api(`${API}/files/${id}`, { method: 'DELETE' });

// Two-way sync. Newer copy wins per event; an event deleted on one device is deleted on the others.
let syncing = null;
export function syncAll() { syncing ||= doSync().finally(() => { syncing = null; }); return syncing; }
async function doSync() {
  if (!signedIn()) throw Object.assign(new Error('signin'), { signin: true });
  status('syncing');
  const files = await listFiles(), byName = new Map(files.map((f) => [f.name, f]));
  const local = await listProjects(), known = new Set(getJSON(KNOWN, [])), gone = new Set(getJSON(GONE, []));
  let down = 0, up = 0, reloadInv = false;
  // deletions made here while offline
  for (const id of gone) { const f = byName.get(`event-${id}.json`); if (f) { await remove(f.id); byName.delete(f.name); } }
  setJSON(GONE, []);
  // events
  // an untouched empty event (each device opens one) is not worth sending around
  const blank = (p) => !p.placed?.length && !p.venue?.segments?.length && !(p.mood?.images || []).some(Boolean);
  for (const p of local) {
    if (!p.id) continue;
    const f = byName.get(`event-${p.id}.json`);
    if (!f) {
      if (known.has(p.id)) { await deleteProject(p.id); if (p.id === state.id) emit('cloud-deleted'); continue; } // deleted on another device
      if (blank(p)) continue;
      await upload(`event-${p.id}.json`, JSON.stringify(p), { updated: String(p.updated || 0), name: (p.eventName || '').slice(0, 100) }); up++;
      continue;
    }
    const remoteAt = +f.appProperties?.updated || 0, localAt = p.updated || 0;
    if (localAt > remoteAt) { await upload(f.name, JSON.stringify(p), { updated: String(localAt), name: (p.eventName || '').slice(0, 100) }, f.id); up++; }
    else if (remoteAt > localAt) { const q = JSON.parse(await download(f.id)); await putProject(q); down++; if (q.id === state.id) { load(q); emit('restored'); } }
  }
  for (const f of byName.values()) {
    const m = /^event-(.+)\.json$/.exec(f.name); if (!m || local.some((p) => p.id === m[1])) continue;
    await putProject(JSON.parse(await download(f.id))); down++;
  }
  // inventory
  const invFile = byName.get('inventory.json'), invAt = inventoryUpdated(), remoteInvAt = +invFile?.appProperties?.updated || 0;
  if (invFile && remoteInvAt > invAt) { setInventoryRaw(await download(invFile.id), remoteInvAt); reloadInv = true; down++; }
  else if (inventoryRaw() && (!invFile || invAt > remoteInvAt)) { await upload('inventory.json', inventoryRaw(), { updated: String(invAt || Date.now()) }, invFile?.id); up++; }
  setJSON(KNOWN, (await listProjects()).filter((p) => !blank(p) || byName.has(`event-${p.id}.json`)).map((p) => p.id));
  status('synced', { on: true, last: Date.now() });
  return { up, down, reloadInv };
}

// After a local save: upload just this event (when signed in), a few seconds after the last change.
let pushTimer;
export function pushSoon() {
  if (!cloudOn()) return;
  clearTimeout(pushTimer);
  if (!signedIn()) { status('needs-signin'); return; }
  status('pending');
  pushTimer = setTimeout(() => syncAll().catch(() => status('needs-signin')), 6000);
}
export function noteDeleted(id) {
  if (!cloudOn()) return;
  setJSON(GONE, [...getJSON(GONE, []), id]);
  setJSON(KNOWN, getJSON(KNOWN, []).filter((k) => k !== id));
  pushSoon();
}
