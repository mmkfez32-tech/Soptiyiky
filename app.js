'use strict';
/* VibeTune Music — Web App / PWA (PRD v1.0). Tanpa iklan, tanpa SDK pihak ketiga. */
const VERSION = '1.0.0';
const NATIVE = /VibeTuneAPK/.test(navigator.userAgent);
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = s => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const mb = b => (b / 1048576).toFixed(b < 1048576 ? 2 : 1) + ' MB';
const uid8 = () => Math.random().toString(36).slice(2, 10);
const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } }
};

/* ---------- ikon ---------- */
const I = {
  home: '<path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  lib: '<path d="M4 4v16M9 4v16"/><path d="M14 5l5 14"/>',
  dl: '<path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  play: '<path d="M7 4.5v15l13-7.5z"/>', pause: '<path d="M6 4h4v16H6zM14 4h4v16h-4z"/>',
  next: '<path d="M5 4l10 8-10 8zM19 5v14"/>', prev: '<path d="M19 4L9 12l10 8zM5 5v14"/>',
  shuf: '<path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>',
  rep: '<path d="M17 2l4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', down: '<path d="M6 9l6 6 6-6"/>', trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>',
  vol: '<path d="M11 5L6 9H2v6h4l5 4zM15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>',
  note: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  check: '<path d="M5 12l5 5L20 7"/>', up: '<path d="M18 15l-6-6-6 6"/>', edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  spin: '<path d="M21 12a9 9 0 1 1-6.2-8.6"/>', back: '<path d="M15 18l-6-6 6-6"/>', x: '<path d="M18 6L6 18M6 6l12 12"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>', bm: '<path d="M6 3h12v18l-6-4-6 4z"/>'
};
const ic = (n, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${I[n]}</svg>`;
const icF = n => `<svg class="f" viewBox="0 0 24 24" aria-hidden="true">${I[n]}</svg>`;

/* ---------- IndexedDB (unduhan offline) ---------- */
const DB = {
  _db: null,
  open() {
    if (this._db) return Promise.resolve(this._db);
    return new Promise((res, rej) => {
      const r = indexedDB.open('vibetune', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('downloads', { keyPath: 'key' });
      r.onsuccess = () => { this._db = r.result; res(r.result); };
      r.onerror = () => rej(r.error);
    });
  },
  async tx(mode, fn) {
    const db = await this.open();
    return new Promise((res, rej) => {
      const t = db.transaction('downloads', mode), s = t.objectStore('downloads');
      const rq = fn(s); t.oncomplete = () => res(rq && rq.result); t.onerror = () => rej(t.error);
    });
  },
  put(v) { return this.tx('readwrite', s => s.put(v)); },
  get(k) { return this.tx('readonly', s => s.get(k)); },
  del(k) { return this.tx('readwrite', s => s.delete(k)); },
  all() { return this.tx('readonly', s => s.getAll()); }
};

/* ---------- state ---------- */
let CAT = { artists: [], albums: [], tracks: [] };
const T = id => CAT.tracks.find(t => t.id === id);
const AL = id => CAT.albums.find(a => a.id === id);
const AR = id => CAT.artists.find(a => a.id === id);
const artistOf = t => CAT.artists.find(a => a.name === t.artist);
const albumOf = t => CAT.albums.find(a => a.title === t.album);
const SYS_PLAYLISTS = [
  { id: 'sys-santai', name: 'Santai Pagi', description: 'Lagu pelan untuk memulai hari.', tracks: ['t1', 't2', 't7'], c1: '#34d399', c2: '#0f766e' },
  { id: 'sys-fokus', name: 'Fokus Belajar', description: 'Teman belajar tanpa distraksi.', tracks: ['t3', 't7', 't2', 't8'], c1: '#a7f3d0', c2: '#047857' },
  { id: 'sys-energi', name: 'Energi Malam', description: 'Beat cepat untuk semangat.', tracks: ['t4', 't5', 't6'], c1: '#22d3ee', c2: '#4f46e5' }
];
let session = LS.get('vt_session', null);
let UD = null; // data pengguna
let dlMap = {};  // trackId -> record unduhan (tanpa blob) untuk user aktif
const dlProg = {}; // trackId -> persen
const udKey = () => 'vt_ud_' + session.id;
function loadUD() {
  UD = Object.assign({ favs: [], playlists: [], savedAlbums: [], savedArtists: [], history: [], settings: {} }, LS.get(udKey(), {}));
  UD.settings = Object.assign({ theme: 'auto', quality: 'auto', history: true, limitMB: 200 }, UD.settings);
}
const saveUD = () => LS.set(udKey(), UD);
async function refreshDl() {
  dlMap = {};
  try {
    for (const r of await DB.all()) if (r.uid === session.id) {
      if (r.expiry && r.expiry < Date.now()) { await DB.del(r.key); continue; } // lisensi offline habis
      dlMap[r.tid] = { tid: r.tid, size: r.size, at: r.at, expiry: r.expiry };
    }
  } catch (e) { console.warn('IndexedDB tidak tersedia', e); }
}
const isDl = id => !!dlMap[id];
const playable = t => t && (navigator.onLine || isDl(t.id));

/* ---------- util UI ---------- */
let toastT;
function toast(m) { const e = $('#toast'); e.textContent = m; e.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => e.classList.remove('show'), 2600); }
function applyTheme() {
  const t = UD ? UD.settings.theme : 'auto';
  const dark = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = dark ? '#0b1210' : '#10b981';
}
const cover = (o, cls = '') => `<div class="cover ${cls}" style="--c1:${o.c1 || '#34d399'};--c2:${o.c2 || '#065f46'}">${ic('note')}</div>`;
const trCover = (t, cls = '') => { const a = albumOf(t) || {}; return cover(a, cls); };
function modal(html, onMount) {
  const m = $('#modal'); m.innerHTML = `<div class="mbox">${html}</div>`; m.classList.remove('hidden');
  m.onclick = e => { if (e.target === m) closeModal(); };
  if (onMount) onMount(m);
  const f = m.querySelector('input,textarea,button'); if (f) f.focus();
}
const closeModal = () => { const m = $('#modal'); m.classList.add('hidden'); m.innerHTML = ''; };

/* ---------- autentikasi (lokal; hash PBKDF2, tidak menyimpan kata sandi asli) ---------- */
const enc = new TextEncoder();
const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
async function hashPw(pw, salt) {
  if (crypto && crypto.subtle) {
    const k = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
    return b64(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations: 120000 }, k, 256));
  }
  let h = 5381; const s = salt + pw; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return 'x' + h;
}
async function register(name, email, pw) {
  const acc = LS.get('vt_accounts', []);
  email = email.trim().toLowerCase();
  if (!name.trim()) throw 'Nama tampilan wajib diisi.';
  if (!/^\S+@\S+\.\S+$/.test(email)) throw 'Format email tidak valid.';
  if (pw.length < 6) throw 'Kata sandi minimal 6 karakter.';
  if (acc.some(a => a.email === email)) throw 'Email sudah terdaftar.';
  const salt = uid8() + uid8();
  const a = { id: 'u' + uid8(), name: name.trim(), email, salt, hash: await hashPw(pw, salt), created: new Date().toISOString() };
  acc.push(a); LS.set('vt_accounts', acc); return a;
}
async function login(email, pw) {
  const a = LS.get('vt_accounts', []).find(x => x.email === email.trim().toLowerCase());
  if (!a || a.hash !== await hashPw(pw, a.salt)) throw 'Email atau kata sandi salah.';
  return a;
}
async function startSession(s) {
  session = s; LS.set('vt_session', s); loadUD(); applyTheme(); await refreshDl();
}
function logout() { P.audio.pause(); P.queue = []; P.idx = -1; session = null; localStorage.removeItem('vt_session'); UD = null; renderChrome(); updatePlayerUI(); location.hash = '#/login'; }

/* ---------- pemutar ---------- */
const P = { audio: new Audio(), queue: [], idx: -1, shuffle: false, repeat: 'off', obj: null, state: 'idle', stack: [], vol: LS.get('vt_vol', 0.8) };
P.audio.preload = 'auto'; P.audio.volume = P.vol;
const cur = () => T(P.queue[P.idx]);
function setState(s, msg) { P.state = s; P.msg = msg || ''; updatePlayerUI(); }
async function playQueue(ids, i = 0) {
  const list = ids.filter(id => T(id)); if (!list.length) return;
  P.queue = list; P.idx = Math.min(i, list.length - 1); P.stack = [];
  await loadCurrent();
}
async function loadCurrent() {
  const t = cur(); if (!t) return;
  if (P.obj) { URL.revokeObjectURL(P.obj); P.obj = null; }
  setState('loading');
  let src = null;
  await refreshDlOne(t.id);
  if (isDl(t.id)) {
    try { const r = await DB.get(session.id + ':' + t.id); if (r && r.blob) { P.obj = URL.createObjectURL(r.blob); src = P.obj; } } catch { }
  }
  if (!src) {
    if (!navigator.onLine) { setState('error', 'Offline: lagu ini belum diunduh.'); toast('Lagu belum diunduh — tidak bisa diputar offline'); return; }
    if (!t.streaming_allowed) { setState('error', 'Lagu tidak tersedia untuk streaming.'); return; }
    src = t.audio;
  }
  P.audio.src = src;
  try {
    await P.audio.play();
    if (UD.settings.history) { UD.history = [t.id, ...UD.history.filter(x => x !== t.id)].slice(0, 30); saveUD(); }
  } catch (e) {
    if (e && e.name === 'NotAllowedError') setState('paused'); else setState('error', 'Gagal memuat audio.');
  }
  mediaSession(t); highlight();
}
async function refreshDlOne(id) {
  try { const r = await DB.get(session.id + ':' + id); if (r && r.expiry && r.expiry < Date.now()) { await DB.del(r.key); delete dlMap[id]; toast('Masa offline lagu ini sudah habis'); } } catch { }
}
function toggle() { if (!cur()) return; if (P.audio.paused) { if (!P.audio.src) loadCurrent(); else P.audio.play().catch(() => setState('error', 'Gagal memutar.')); } else P.audio.pause(); }
function next(auto) {
  if (!P.queue.length) return;
  P.stack.push(P.idx);
  let n;
  if (P.shuffle && P.queue.length > 1) { do { n = Math.floor(Math.random() * P.queue.length); } while (n === P.idx); }
  else { n = P.idx + 1; if (n >= P.queue.length) { if (P.repeat === 'all' || !auto) n = 0; else { P.audio.pause(); P.audio.currentTime = 0; P.stack.pop(); setState('paused'); return; } } }
  P.idx = n; loadCurrent();
}
function prev() {
  if (!P.queue.length) return;
  if (P.audio.currentTime > 3) { P.audio.currentTime = 0; return; }
  P.idx = P.stack.length ? P.stack.pop() : (P.idx - 1 + P.queue.length) % P.queue.length; loadCurrent();
}
P.audio.addEventListener('play', () => setState('playing'));
P.audio.addEventListener('pause', () => { if (P.state !== 'error' && P.state !== 'loading') setState('paused'); });
P.audio.addEventListener('playing', () => setState('playing'));
P.audio.addEventListener('waiting', () => setState('loading'));
P.audio.addEventListener('ended', () => { if (P.repeat === 'one') { P.audio.currentTime = 0; P.audio.play(); } else next(true); });
P.audio.addEventListener('error', () => { if (P.audio.src) setState('error', navigator.onLine ? 'File audio tidak tersedia.' : 'Koneksi terputus. Putar lagu yang sudah diunduh.'); });
P.audio.addEventListener('timeupdate', updateProgress);
P.audio.addEventListener('loadedmetadata', updateProgress);
function mediaSession(t) {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: t.artist, album: t.album, artwork: [{ src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }] });
  navigator.mediaSession.setActionHandler('play', toggle); navigator.mediaSession.setActionHandler('pause', toggle);
  navigator.mediaSession.setActionHandler('nexttrack', () => next(false)); navigator.mediaSession.setActionHandler('previoustrack', prev);
  try { navigator.mediaSession.setActionHandler('seekto', e => { P.audio.currentTime = e.seekTime; }); } catch { }
}
const range = (el, v) => { el.style.setProperty('--p', v + '%'); el.value = v; };
function updateProgress() {
  const d = P.audio.duration || (cur() ? cur().duration : 0), c = P.audio.currentTime || 0, pct = d ? c / d * 100 : 0;
  document.querySelectorAll('[data-seek]').forEach(el => { if (!el.dragging) range(el, pct); });
  document.querySelectorAll('[data-cur]').forEach(el => el.textContent = fmt(c));
  document.querySelectorAll('[data-dur]').forEach(el => el.textContent = fmt(d));
  $('#miniplayer').style.setProperty('--prog', pct + '%');
}
function stateLabel() {
  return { loading: 'Memuat…', error: P.msg, idle: '', paused: '', playing: '' }[P.state] || '';
}
function updatePlayerUI() {
  const t = cur(), mp = $('#miniplayer');
  mp.classList.toggle('empty-q', !t || !session);
  const pl = P.state === 'playing', ld = P.state === 'loading';
  const pbtn = `<button class="play" data-a="toggle" aria-label="${pl ? 'Jeda' : 'Putar'}">${ld ? ic('spin', 'ld') : icF(pl ? 'pause' : 'play')}</button>`;
  if (t) {
    mp.innerHTML = `<div class="info" data-a="openfull" role="button" tabindex="0" aria-label="Buka pemutar">${trCover(t, 's')}<div class="meta"><div class="t">${esc(t.title)}</div><div class="a">${P.state === 'error' ? '<span style="color:#ef4444">' + esc(P.msg) + '</span>' : esc(t.artist)}</div></div></div>
    <div class="ctrls"><button class="ib hide-m" data-a="prev" aria-label="Sebelumnya">${icF('prev')}</button>${pbtn}<button class="ib" data-a="next" aria-label="Berikutnya">${icF('next')}</button></div>
    <div class="mini-seek"><span data-cur>0:00</span><input type="range" min="0" max="100" step="0.1" value="0" data-seek aria-label="Posisi lagu"><span data-dur>0:00</span></div>
    <div class="vol"><span class="ib" style="width:30px">${ic('vol')}</span><input type="range" min="0" max="100" value="${P.vol * 100}" data-vol aria-label="Volume"></div>`;
    range($('[data-vol]', mp), P.vol * 100);
  }
  const fp = $('#fullplayer');
  if (t) {
    const wasOpen = fp.classList.contains('open');
    fp.innerHTML = `<div class="hd"><button class="ib" data-a="closefull" aria-label="Tutup pemutar">${ic('down')}</button><b>Sedang diputar</b><span style="width:38px"></span></div>
    <div class="big">${trCover(t)}</div>
    <div class="tt"><div style="min-width:0"><h2>${esc(t.title)}</h2><div class="sub">${esc(t.artist)} · ${esc(t.album)}</div></div><button class="ib ${UD.favs.includes(t.id) ? 'on' : ''}" data-a="fav" data-id="${t.id}" aria-label="Favorit">${ic('heart')}</button></div>
    <input class="seek" type="range" min="0" max="100" step="0.1" value="0" data-seek aria-label="Posisi lagu">
    <div class="times"><span data-cur>0:00</span><span data-dur>0:00</span></div>
    <div class="pstate ${P.state === 'error' ? 'err' : ''}">${esc(stateLabel())}</div>
    <div class="ctrls"><button class="ib ${P.shuffle ? 'act' : ''}" data-a="shuffle" aria-label="Acak" aria-pressed="${P.shuffle}">${ic('shuf')}</button><button class="ib" data-a="prev" aria-label="Sebelumnya">${icF('prev')}</button>${pbtn}<button class="ib" data-a="next" aria-label="Berikutnya">${icF('next')}</button><button class="ib ${P.repeat !== 'off' ? 'act' : ''}" data-a="repeat" aria-label="Ulangi: ${P.repeat}" style="position:relative">${ic('rep')}${P.repeat === 'one' ? '<b style="position:absolute;font-size:10px;top:11px;left:16px">1</b>' : ''}</button></div>
    <div class="vol"><span class="ib" style="width:30px">${ic('vol')}</span><input type="range" min="0" max="100" value="${P.vol * 100}" data-vol aria-label="Volume"></div>
    <div class="acts"><button class="btn ghost sm" data-a="addpl" data-id="${t.id}">${ic('plus')} Playlist</button>${dlBtn(t, true)}</div>`;
    range($('[data-vol]', fp), P.vol * 100);
    if (!wasOpen) fp.classList.remove('open');
  }
  updateProgress(); highlight();
}
function highlight() {
  const t = cur();
  document.querySelectorAll('.row[data-id]').forEach(r => r.classList.toggle('cur', !!t && r.dataset.id === t.id));
}
document.addEventListener('input', e => {
  const el = e.target;
  if (el.matches('[data-seek]')) { el.dragging = true; const d = P.audio.duration || (cur() && cur().duration) || 0; P.audio.currentTime = d * el.value / 100; range(el, +el.value); clearTimeout(el._t); el._t = setTimeout(() => el.dragging = false, 400); }
  if (el.matches('[data-vol]')) { P.vol = el.value / 100; P.audio.volume = P.vol; LS.set('vt_vol', P.vol); document.querySelectorAll('[data-vol]').forEach(v => range(v, +el.value)); }
});

/* ---------- unduhan ---------- */
function dlBtn(t, text) {
  if (!t.download_allowed) return text ? '<span class="tag n">Hanya streaming</span>' : '';
  if (dlProg[t.id] != null) return `<span class="tag" data-dlstat="${t.id}">${dlProg[t.id]}%</span>`;
  if (isDl(t.id)) return text ? `<button class="btn ghost sm" data-a="undl" data-id="${t.id}">${ic('trash')} Hapus unduhan</button>` : `<button class="ib on" data-a="undl" data-id="${t.id}" aria-label="Hapus unduhan" title="Sudah diunduh — ketuk untuk hapus">${ic('check')}</button>`;
  return text ? `<button class="btn ghost sm" data-a="dl" data-id="${t.id}">${ic('dl')} Unduh</button>` : `<button class="ib" data-a="dl" data-id="${t.id}" aria-label="Unduh ${esc(t.title)}">${ic('dl')}</button>`;
}
async function download(id) {
  const t = T(id); if (!t || !t.download_allowed) { toast('Lagu ini tidak diizinkan untuk diunduh'); return; }
  if (!navigator.onLine) { toast('Perlu internet untuk mengunduh'); return; }
  if (dlProg[id] != null || isDl(id)) return;
  const used = Object.values(dlMap).reduce((s, d) => s + d.size, 0);
  if (used >= UD.settings.limitMB * 1048576) { toast('Batas penyimpanan unduhan tercapai. Hapus unduhan atau ubah batas di Pengaturan.'); return; }
  dlProg[id] = 0; refreshButtons();
  try {
    const r = await fetch(t.audio); if (!r.ok) throw new Error('HTTP ' + r.status);
    const total = +r.headers.get('content-length') || 0; const chunks = []; let got = 0;
    if (r.body && r.body.getReader) {
      const rd = r.body.getReader();
      for (; ;) { const { done, value } = await rd.read(); if (done) break; chunks.push(value); got += value.length; if (total) { dlProg[id] = Math.round(got / total * 100); document.querySelectorAll(`[data-dlstat="${id}"]`).forEach(e => e.textContent = dlProg[id] + '%'); } }
    } else { const b = await r.blob(); chunks.push(b); got = b.size; }
    const blob = new Blob(chunks, { type: 'audio/mpeg' });
    const rec = { key: session.id + ':' + id, uid: session.id, tid: id, blob, size: blob.size, at: Date.now(), expiry: Date.now() + 30 * 864e5, status: 'done' };
    await DB.put(rec); dlMap[id] = { tid: id, size: rec.size, at: rec.at, expiry: rec.expiry };
    toast('“' + t.title + '” siap diputar offline');
  } catch (e) { console.warn(e); toast('Gagal mengunduh “' + t.title + '”'); }
  delete dlProg[id]; refreshButtons();
}
async function undownload(id) { try { await DB.del(session.id + ':' + id); } catch { } delete dlMap[id]; toast('Unduhan dihapus'); refreshButtons(); }
function refreshButtons() { route(true); updatePlayerUI(); }

/* ---------- komponen ---------- */
function trackRow(t, ctx, i, opt = {}) {
  const off = !playable(t);
  return `<div class="row ${off ? 'off' : ''}" data-id="${t.id}" data-a="play" data-ctx="${esc(ctx)}" data-i="${i}" role="button" tabindex="0" aria-label="Putar ${esc(t.title)}">
    ${opt.num ? `<span class="num">${i + 1}</span>` : ''}${trCover(t, 's')}
    <div class="meta"><div class="t">${esc(t.title)}</div><div class="a">${esc(t.artist)}</div></div>
    ${isDl(t.id) ? '<span class="tag">Offline</span>' : off ? '<span class="tag n">Online saja</span>' : ''}
    <button class="ib ${UD.favs.includes(t.id) ? 'on' : ''}" data-a="fav" data-id="${t.id}" aria-label="Favorit">${ic('heart')}</button>
    ${dlBtn(t)}
    ${opt.remove ? `<button class="ib" data-a="${opt.remove}" data-id="${t.id}" data-pl="${opt.pl}" aria-label="Hapus dari playlist">${ic('x')}</button>` : `<button class="ib" data-a="addpl" data-id="${t.id}" aria-label="Tambah ke playlist">${ic('plus')}</button>`}
    ${opt.move ? `<button class="ib" data-a="mvup" data-i="${i}" data-pl="${opt.pl}" aria-label="Naik">${ic('up')}</button><button class="ib" data-a="mvdn" data-i="${i}" data-pl="${opt.pl}" aria-label="Turun">${ic('down')}</button>` : ''}
    <span class="dur">${fmt(t.duration)}</span></div>`;
}
const albumCard = a => `<button class="card" data-go="#/album/${a.id}">${cover(a)}<b>${esc(a.title)}</b><span>${esc(a.artist)} · ${a.year}</span></button>`;
const artistCard = a => `<button class="card" data-go="#/artist/${a.id}">${cover(a, 'round')}<b>${esc(a.name)}</b><span>Artis</span></button>`;
const plCard = p => `<button class="card" data-go="#/playlist/${p.id}">${cover(p.c1 ? p : { c1: '#10b981', c2: '#064e3b' })}<b>${esc(p.name)}</b><span>${p.tracks.length} lagu</span></button>`;
const emptyBox = (m, i = 'note') => `<div class="empty">${ic(i)}<div>${m}</div></div>`;
const myPl = id => UD.playlists.find(p => p.id === id);
const getPl = id => SYS_PLAYLISTS.find(p => p.id === id) || myPl(id);
const ctxIds = ctx => {
  if (ctx === 'all') return CAT.tracks.map(t => t.id);
  const [k, id] = ctx.split(':');
  if (k === 'album') return CAT.tracks.filter(t => albumOf(t) && albumOf(t).id === id).map(t => t.id);
  if (k === 'artist') return CAT.tracks.filter(t => artistOf(t) && artistOf(t).id === id).map(t => t.id);
  if (k === 'pl') { const p = getPl(id); return p ? p.tracks : []; }
  if (k === 'favs') return UD.favs.filter(T);
  if (k === 'hist') return UD.history.filter(T);
  if (k === 'search') return (window.__sr || []);
  if (k === 'dl') return Object.keys(dlMap).filter(T);
  if (k === 'one') return [id];
  return [];
};

/* ---------- halaman ---------- */
const pages = {};
pages.home = () => {
  const hist = UD.history.filter(T).slice(0, 6).map(T);
  const name = session.guest ? 'Tamu' : session.name;
  const h = new Date().getHours(), greet = h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 19 ? 'Selamat sore' : 'Selamat malam';
  const seen = new Set([...UD.history, ...UD.favs]);
  const favArtists = new Set([...UD.favs, ...UD.history].map(id => T(id) && T(id).artist));
  let rec = CAT.tracks.filter(t => !seen.has(t.id) && (favArtists.has(t.artist) || !favArtists.size));
  if (rec.length < 3) rec = CAT.tracks.filter(t => !UD.history.slice(0, 3).includes(t.id));
  rec = rec.slice(0, 5);
  return `<div class="hero"><h2>${greet}, ${esc(name)}!</h2><p>Musik tanpa iklan, bisa diputar online maupun offline.</p><div class="acts"><button class="btn white" data-a="playall">${icF('play')} Putar semua</button><button class="btn ghost" data-go="#/search">${ic('search')} Cari musik</button><button class="btn ghost" data-go="#/library">${ic('lib')} Library</button></div></div>
  ${hist.length ? `<div class="sec"><h2>Baru diputar</h2><div class="panel">${hist.map((t, i) => trackRow(t, 'hist', i)).join('')}</div></div>` : ''}
  <div class="sec"><h2>Playlist pilihan</h2><div class="hscroll">${SYS_PLAYLISTS.map(plCard).join('')}</div></div>
  <div class="sec"><h2>Album</h2><div class="hscroll">${CAT.albums.map(albumCard).join('')}</div></div>
  <div class="sec"><h2>Artis</h2><div class="hscroll">${CAT.artists.map(artistCard).join('')}</div></div>
  <div class="sec"><div class="sec-h"><h2>Rekomendasi untukmu</h2><span class="sub">${UD.history.length || UD.favs.length ? 'berdasarkan putaran & favoritmu' : 'lagu populer di VibeTune'}</span></div><div class="panel">${rec.map((t, i) => trackRow(t, 'one:' + t.id, i)).join('')}</div></div>`;
};
pages.search = () => `<h2>Cari</h2><div class="search">${ic('search')}<input id="q" type="search" placeholder="Judul lagu, artis, album, playlist" aria-label="Cari" autocomplete="off" value="${esc(window.__q || '')}"></div><div id="results"></div>`;
function renderResults() {
  const q = (window.__q || '').trim().toLowerCase(), box = $('#results'); if (!box) return;
  if (!q) { box.innerHTML = `<h3>Jelajahi</h3><div class="hscroll">${CAT.albums.map(albumCard).join('')}</div>` + emptyBox('Ketik untuk mencari lagu, artis, album, atau playlist.', 'search'); return; }
  const tr = CAT.tracks.filter(t => (t.title + ' ' + t.artist + ' ' + t.album).toLowerCase().includes(q));
  const ar = CAT.artists.filter(a => a.name.toLowerCase().includes(q));
  const al = CAT.albums.filter(a => (a.title + ' ' + a.artist).toLowerCase().includes(q));
  const pl = [...SYS_PLAYLISTS, ...UD.playlists].filter(p => p.name.toLowerCase().includes(q));
  window.__sr = tr.map(t => t.id);
  if (!tr.length && !ar.length && !al.length && !pl.length) { box.innerHTML = emptyBox(`Tidak ada hasil untuk “${esc(window.__q)}”. Coba kata kunci lain.`, 'search'); return; }
  box.innerHTML = (tr.length ? `<h3>Lagu</h3><div class="panel">${tr.map((t, i) => trackRow(t, 'search', i)).join('')}</div>` : '') +
    (ar.length ? `<div class="sec"><h3>Artis</h3><div class="hscroll">${ar.map(artistCard).join('')}</div></div>` : '') +
    (al.length ? `<div class="sec"><h3>Album</h3><div class="hscroll">${al.map(albumCard).join('')}</div></div>` : '') +
    (pl.length ? `<div class="sec"><h3>Playlist</h3><div class="hscroll">${pl.map(plCard).join('')}</div></div>` : '');
  highlight();
}
pages.album = id => {
  const a = AL(id); if (!a) return emptyBox('Album tidak ditemukan.');
  const ts = ctxIds('album:' + id).map(T), saved = UD.savedAlbums.includes(id);
  return `<div class="top">${cover(a)}<div><span class="sub">ALBUM</span><h1>${esc(a.title)}</h1><div class="sub"><a class="link" href="#/artist/${AR(a.artist.toLowerCase().replace(/ /g, '-')) ? a.artist.toLowerCase().replace(/ /g, '-') : ''}">${esc(a.artist)}</a> · ${a.year} · ${ts.length} lagu</div>
  <div class="acts"><button class="btn" data-a="playctx" data-ctx="album:${id}">${icF('play')} Putar</button><button class="btn ghost" data-a="savealbum" data-id="${id}">${ic('bm')} ${saved ? 'Tersimpan' : 'Simpan'}</button></div></div></div>
  <div class="panel">${ts.map((t, i) => trackRow(t, 'album:' + id, i, { num: 1 })).join('')}</div>`;
};
pages.artist = id => {
  const a = AR(id); if (!a) return emptyBox('Artis tidak ditemukan.');
  const ts = ctxIds('artist:' + id).map(T), saved = UD.savedArtists.includes(id);
  return `<div class="top">${cover(a, 'round')}<div><span class="sub">ARTIS</span><h1>${esc(a.name)}</h1><div class="sub">${ts.length} lagu</div>
  <div class="acts"><button class="btn" data-a="playctx" data-ctx="artist:${id}">${icF('play')} Putar</button><button class="btn ghost" data-a="saveartist" data-id="${id}">${ic('bm')} ${saved ? 'Tersimpan' : 'Ikuti'}</button></div></div></div>
  <h3>Lagu populer</h3><div class="panel">${ts.map((t, i) => trackRow(t, 'artist:' + id, i, { num: 1 })).join('')}</div>
  <div class="sec"><h3>Album</h3><div class="hscroll">${CAT.albums.filter(x => x.artist === a.name).map(albumCard).join('')}</div></div>`;
};
pages.playlist = id => {
  const p = getPl(id); if (!p) return emptyBox('Playlist tidak ditemukan.');
  const mine = !!myPl(id), ts = p.tracks.filter(T).map(T);
  return `<div class="top">${cover(p.c1 ? p : { c1: '#10b981', c2: '#064e3b' })}<div><span class="sub">PLAYLIST${mine ? '' : ' PILIHAN'}</span><h1>${esc(p.name)}</h1><div class="sub">${esc(p.description || '')} ${p.description ? '·' : ''} ${ts.length} lagu</div>
  <div class="acts"><button class="btn" data-a="playctx" data-ctx="pl:${id}" ${ts.length ? '' : 'disabled'}>${icF('play')} Putar</button>
  ${mine ? `<button class="btn ghost" data-a="editpl" data-id="${id}">${ic('edit')} Ubah</button><button class="btn ghost danger" style="color:#ef4444" data-a="delpl" data-id="${id}">${ic('trash')} Hapus</button>` : ''}</div></div></div>
  ${ts.length ? `<div class="panel">${ts.map((t, i) => trackRow(t, 'pl:' + id, i, mine ? { num: 1, remove: 'rmpl', pl: id, move: ts.length > 1, } : { num: 1 })).join('')}</div>` : emptyBox('Playlist masih kosong. Tambahkan lagu dengan tombol + di daftar lagu.', 'lib')}`;
};
let libTab = 'favs';
pages.library = () => {
  const tabs = [['favs', 'Favorit'], ['pl', 'Playlist'], ['saved', 'Tersimpan'], ['hist', 'Riwayat']];
  let body = '';
  if (libTab === 'favs') { const ts = UD.favs.filter(T).map(T); body = ts.length ? `<div class="panel">${ts.map((t, i) => trackRow(t, 'favs', i)).join('')}</div>` : emptyBox('Belum ada lagu favorit. Ketuk ikon hati pada lagu.', 'heart'); }
  if (libTab === 'pl') body = `<div class="acts" style="margin:0 0 14px"><button class="btn" data-a="newpl">${ic('plus')} Buat playlist</button></div>` + (UD.playlists.length ? `<div class="grid">${UD.playlists.map(plCard).join('')}</div>` : emptyBox('Kamu belum punya playlist.', 'lib'));
  if (libTab === 'saved') { const al = UD.savedAlbums.map(AL).filter(Boolean), ar = UD.savedArtists.map(AR).filter(Boolean); body = (al.length || ar.length) ? (al.length ? `<h3>Album</h3><div class="grid">${al.map(albumCard).join('')}</div>` : '') + (ar.length ? `<div class="sec"><h3>Artis</h3><div class="grid">${ar.map(artistCard).join('')}</div></div>` : '') : emptyBox('Simpan album atau ikuti artis dari halaman detailnya.', 'bm'); }
  if (libTab === 'hist') {
    if (!UD.settings.history) body = emptyBox('Riwayat pemutaran dimatikan. Aktifkan di Pengaturan.', 'info');
    else { const ts = UD.history.filter(T).map(T); body = ts.length ? `<div class="acts" style="margin:0 0 14px"><button class="btn ghost sm" data-a="clrhist">${ic('trash')} Hapus riwayat</button></div><div class="panel">${ts.map((t, i) => trackRow(t, 'hist', i)).join('')}</div>` : emptyBox('Belum ada riwayat pemutaran.', 'note'); }
  }
  return `<h2>Library</h2><div class="tabs" role="tablist">${tabs.map(([k, n]) => `<button role="tab" aria-selected="${libTab === k}" class="${libTab === k ? 'on' : ''}" data-a="tab" data-id="${k}">${n}</button>`).join('')}</div>${body}`;
};
pages.downloads = () => {
  const list = Object.values(dlMap).filter(d => T(d.tid)), used = list.reduce((s, d) => s + d.size, 0), lim = UD.settings.limitMB * 1048576;
  const avail = CAT.tracks.filter(t => t.download_allowed && !isDl(t.id));
  return `<h2>Downloads</h2><div class="panel" style="padding:16px;margin-bottom:18px"><div class="sec-h"><b>Penyimpanan unduhan</b><span class="sub">${mb(used)} dari ${UD.settings.limitMB} MB</span></div><div class="bar" style="margin-top:8px"><i style="width:${Math.min(100, used / lim * 100)}%"></i></div><div class="sub" id="est" style="margin-top:6px"></div></div>
  ${list.length ? `<div class="acts" style="margin:0 0 12px"><button class="btn sm" data-a="playctx" data-ctx="dl">${icF('play')} Putar semua offline</button><button class="btn ghost sm" data-a="deldl">${ic('trash')} Hapus semua</button></div>
  <div class="panel">${list.map((d, i) => { const t = T(d.tid); return trackRow(t, 'dl', i).replace('<span class="dur">', `<span class="sub" style="white-space:nowrap">${mb(d.size)} · s/d ${new Date(d.expiry).toLocaleDateString('id-ID')}</span><span class="dur">`); }).join('')}</div>` : emptyBox('Belum ada lagu yang diunduh. Unduh lagu agar bisa diputar tanpa internet.', 'dl')}
  ${avail.length ? `<div class="sec"><h3>Tersedia untuk diunduh</h3><div class="panel">${avail.map((t, i) => trackRow(t, 'one:' + t.id, i)).join('')}</div></div>` : ''}
  <p class="sub">Lagu yang tidak diizinkan diunduh oleh sumbernya hanya bisa di-stream. Lisensi offline berlaku sampai tanggal yang tertera.</p>`;
};
pages.settings = () => {
  const s = UD.settings, list = Object.values(dlMap), used = list.reduce((a, d) => a + d.size, 0);
  return `<h2>Profil &amp; Pengaturan</h2>
  <div class="panel" style="margin-bottom:18px"><div class="set"><div style="display:flex;gap:12px;align-items:center">${cover({ c1: '#10b981', c2: '#064e3b' }, 's round')}<div><b>${esc(session.guest ? 'Mode Tamu' : session.name)}</b><small>${esc(session.guest ? 'Data hanya di perangkat ini' : session.email)}</small></div></div>
  <div style="display:flex;gap:8px">${session.guest ? '' : '<button class="btn ghost sm" data-a="editname">Ubah nama</button>'}<button class="btn ghost sm" data-a="logout">${session.guest ? 'Masuk / Daftar' : 'Keluar'}</button></div></div></div>
  <div class="panel">
  <div class="set"><div>Tema<small>Terang, gelap, atau ikuti perangkat</small></div><select data-set="theme" aria-label="Tema"><option value="auto" ${s.theme === 'auto' ? 'selected' : ''}>Otomatis</option><option value="light" ${s.theme === 'light' ? 'selected' : ''}>Terang</option><option value="dark" ${s.theme === 'dark' ? 'selected' : ''}>Gelap</option></select></div>
  <div class="set"><div>Kualitas streaming<small>Mengikuti kemampuan sumber &amp; jaringan</small></div><select data-set="quality" aria-label="Kualitas"><option value="auto" ${s.quality === 'auto' ? 'selected' : ''}>Otomatis</option><option value="low" ${s.quality === 'low' ? 'selected' : ''}>Hemat data</option><option value="high" ${s.quality === 'high' ? 'selected' : ''}>Tinggi</option></select></div>
  <div class="set"><div>Simpan riwayat pemutaran<small>Untuk “Baru diputar” &amp; rekomendasi</small></div><label class="sw"><input type="checkbox" data-set="history" ${s.history ? 'checked' : ''} aria-label="Riwayat"><i></i></label></div>
  <div class="set"><div>Batas unduhan<small>Terpakai ${mb(used)}</small></div><select data-set="limitMB" aria-label="Batas unduhan">${[50, 100, 200, 500].map(v => `<option value="${v}" ${s.limitMB === v ? 'selected' : ''}>${v} MB</option>`).join('')}</select></div>
  <div class="set"><div>Kelola unduhan<small>${list.length} lagu tersimpan offline</small></div><button class="btn ghost sm" data-go="#/downloads">Buka</button></div>
  <div class="set"><div>Tentang aplikasi<small>Versi ${VERSION}, kebijakan privasi</small></div><button class="btn ghost sm" data-go="#/about">Lihat</button></div>
  </div>${!NATIVE ? `<div class="acts"><button class="btn hidden" id="installBtn" data-a="install">${ic('dl')} Pasang aplikasi (PWA)</button></div><p class="sub" id="iosHint"></p>` : ''}`;
};
pages.about = () => `<h2>Tentang VibeTune Music</h2><div class="panel" style="padding:18px">
  <p><b>VibeTune Music</b> v${VERSION} — pemutar musik online &amp; offline tanpa iklan.</p>
  <h3>Bebas iklan</h3><p>Tidak ada banner, iklan video, pop-up promosi, maupun SDK iklan pihak ketiga.</p>
  <h3>Sumber musik</h3><p>Seluruh lagu di versi ini adalah <b>musik orisinal hasil sintesis proyek</b>. Setiap lagu punya catatan sumber &amp; izin. Fitur unduh hanya muncul untuk lagu yang diizinkan.</p>
  <h3>Kebijakan privasi</h3><p>Data akun, playlist, favorit, dan riwayat disimpan di perangkat kamu (penyimpanan lokal browser). Kata sandi tidak disimpan sebagai teks biasa. Tidak ada pelacakan atau pengiriman data ke pihak ketiga.</p>
  <h3>Catatan lisensi lagu</h3><div>${CAT.tracks.map(t => `<div class="sub" style="margin:4px 0"><b>${esc(t.title)}</b> — ${esc(t.license_note)}</div>`).join('')}</div></div>`;
pages.login = () => authView('login');
function authView(mode) {
  const reg = mode === 'register';
  return `<div class="auth"><form class="authbox" id="authForm" novalidate><div class="logo">${icF('note').replace('<svg', '<svg style="fill:none;stroke:#fff"')}</div><h2>VibeTune Music</h2><p class="sub">${reg ? 'Buat akun baru' : 'Masuk untuk melanjutkan'}</p>
  ${reg ? '<label for="fn">Nama tampilan</label><input id="fn" autocomplete="name">' : ''}
  <label for="fe">Email</label><input id="fe" type="email" autocomplete="email"><label for="fp">Kata sandi</label><input id="fp" type="password" autocomplete="${reg ? 'new-password' : 'current-password'}">
  <div class="err-t" id="aerr" role="alert"></div><button class="btn" type="submit">${reg ? 'Daftar' : 'Masuk'}</button>
  <button class="btn ghost" type="button" data-a="guest" style="margin-top:10px;color:var(--tx)">Lanjut sebagai tamu</button>
  <p class="sub" style="text-align:center;margin-top:14px">${reg ? 'Sudah punya akun?' : 'Belum punya akun?'} <a class="link" href="#/${reg ? 'login' : 'register'}">${reg ? 'Masuk' : 'Daftar'}</a></p></form></div>`;
}
pages.register = () => authView('register');

/* ---------- router & chrome ---------- */
const NAV = [['home', 'Home', 'home'], ['search', 'Search', 'search'], ['library', 'Library', 'lib'], ['downloads', 'Downloads', 'dl'], ['settings', 'Profile', 'user']];
function renderChrome() {
  const authed = !!session;
  $('#app').classList.toggle('hidden', false);
  $('#sidebar').style.display = authed ? '' : 'none';
  $('#bottomnav').style.display = authed ? '' : 'none';
  if (!authed) { $('#app').style.gridTemplateColumns = '1fr'; } else { $('#app').style.gridTemplateColumns = ''; }
  const cur = (location.hash.slice(2) || 'home').split('/')[0];
  const active = k => (k === cur || (k === 'settings' && cur === 'about') || (k === 'home' && ['album', 'artist', 'playlist'].includes(cur))) ? 'on' : '';
  $('#sidenav').innerHTML = NAV.map(([k, n, i]) => `<a href="#/${k}" class="${active(k)}" ${active(k) ? 'aria-current="page"' : ''}>${ic(i)}${n}</a>`).join('');
  $('#bottomnav').innerHTML = NAV.map(([k, n, i]) => `<a href="#/${k}" class="${active(k)}" ${active(k) ? 'aria-current="page"' : ''}>${ic(i)}${n}</a>`).join('');
}
let lastScroll = 0;
function route(keep) {
  const parts = (location.hash.slice(2) || 'home').split('/'); let pg = parts[0];
  if (!session && pg !== 'register') pg = 'login';
  if (session && (pg === 'login' || pg === 'register')) { location.hash = '#/home'; return; }
  if (!pages[pg]) pg = 'home';
  const main = $('#main'); lastScroll = main.scrollTop;
  $('#view').innerHTML = session || pg === 'register' || pg === 'login' ? pages[pg](parts[1]) : '';
  renderChrome();
  if (keep) main.scrollTop = lastScroll; else main.scrollTop = 0;
  if (pg === 'search') renderResults();
  if (pg === 'downloads' && navigator.storage && navigator.storage.estimate) navigator.storage.estimate().then(e => { const el = $('#est'); if (el && e.quota) el.innerHTML = `Perangkat: ${mb(e.usage)} terpakai dari ${mb(e.quota)}`; }).catch(() => { });
  if (pg === 'settings' && deferredPrompt) { const b = $('#installBtn'); if (b) b.classList.remove('hidden'); }
  if (pg === 'settings' && /iphone|ipad/i.test(navigator.userAgent) && $('#iosHint')) $('#iosHint').textContent = 'Di iPhone/iPad: buka menu Bagikan di Safari lalu pilih “Tambah ke Layar Utama”.';
  highlight();
}
window.addEventListener('hashchange', () => route());
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; const b = $('#installBtn'); if (b) b.classList.remove('hidden'); });
window.addEventListener('appinstalled', () => { deferredPrompt = null; toast('VibeTune terpasang!'); });
function netUI() { $('#netbar').classList.toggle('hidden', navigator.onLine); $('#main').style.paddingTop = navigator.onLine ? '' : '44px'; if (session && UD) route(true); }
window.addEventListener('online', () => { toast('Kembali online'); netUI(); });
window.addEventListener('offline', netUI);

/* ---------- aksi ---------- */
function playlistModal(p) {
  modal(`<h3>${p ? 'Ubah playlist' : 'Playlist baru'}</h3><label for="pn">Nama</label><input id="pn" maxlength="60" value="${esc(p ? p.name : '')}"><label for="pd">Deskripsi</label><textarea id="pd" rows="2" maxlength="140">${esc(p ? p.description : '')}</textarea><div class="err-t" id="perr"></div><div class="acts"><button class="btn ghost" data-a="closemodal">Batal</button><button class="btn" id="psave">Simpan</button></div>`,
    m => $('#psave', m).onclick = () => {
      const n = $('#pn', m).value.trim(); if (!n) { $('#perr', m).textContent = 'Nama playlist wajib diisi.'; return; }
      if (p) { p.name = n; p.description = $('#pd', m).value.trim(); } else UD.playlists.push({ id: 'p' + uid8(), name: n, description: $('#pd', m).value.trim(), created: Date.now(), tracks: [], c1: '#10b981', c2: '#064e3b' });
      saveUD(); closeModal(); toast(p ? 'Playlist diperbarui' : 'Playlist dibuat'); route(true);
    });
}
function addToPlaylist(tid) {
  const t = T(tid);
  modal(`<h3>Tambah ke playlist</h3><div class="sub" style="margin-bottom:10px">${esc(t.title)}</div>${UD.playlists.length ? UD.playlists.map(p => `<div class="row" data-a="pladd" data-pl="${p.id}" data-id="${tid}" role="button" tabindex="0">${cover(p, 's')}<div class="meta"><div class="t">${esc(p.name)}</div><div class="a">${p.tracks.length} lagu</div></div>${p.tracks.includes(tid) ? '<span class="tag">Sudah ada</span>' : ''}</div>`).join('') : '<div class="sub">Belum ada playlist.</div>'}<div class="acts"><button class="btn ghost" data-a="closemodal">Tutup</button><button class="btn" data-a="newpl2" data-id="${tid}">${ic('plus')} Playlist baru</button></div>`);
}
function confirmBox(msg, ok, danger = true) {
  modal(`<h3>Konfirmasi</h3><p>${msg}</p><div class="acts"><button class="btn ghost" data-a="closemodal">Batal</button><button class="btn ${danger ? 'danger' : ''}" id="cok">Ya, lanjutkan</button></div>`, m => $('#cok', m).onclick = () => { closeModal(); ok(); });
}
const A = {
  play(el) { const ids = ctxIds(el.dataset.ctx), t = T(el.dataset.id); if (!playable(t)) { toast(navigator.onLine ? 'Lagu tidak tersedia' : 'Offline: unduh lagu ini dulu agar bisa diputar'); return; } playQueue(ids, ids.indexOf(t.id)); },
  playctx(el) { const ids = ctxIds(el.dataset.ctx).filter(id => playable(T(id))); if (!ids.length) { toast('Tidak ada lagu yang bisa diputar'); return; } playQueue(ids, 0); },
  playall() { const ids = CAT.tracks.filter(playable).map(t => t.id); playQueue(ids, 0); },
  toggle, next() { next(false); }, prev,
  shuffle() { P.shuffle = !P.shuffle; toast('Acak ' + (P.shuffle ? 'aktif' : 'mati')); updatePlayerUI(); },
  repeat() { P.repeat = { off: 'all', all: 'one', one: 'off' }[P.repeat]; toast('Ulangi: ' + { off: 'mati', all: 'semua', one: 'satu lagu' }[P.repeat]); updatePlayerUI(); },
  openfull() { $('#fullplayer').classList.add('open'); }, closefull() { $('#fullplayer').classList.remove('open'); },
  fav(el) { const id = el.dataset.id, i = UD.favs.indexOf(id); if (i >= 0) UD.favs.splice(i, 1); else UD.favs.unshift(id); saveUD(); toast(i >= 0 ? 'Dihapus dari favorit' : 'Ditambahkan ke favorit'); route(true); updatePlayerUI(); },
  dl(el) { download(el.dataset.id); }, undl(el) { undownload(el.dataset.id); },
  deldl() { confirmBox('Hapus semua lagu yang sudah diunduh?', async () => { for (const id of Object.keys(dlMap)) { try { await DB.del(session.id + ':' + id); } catch { } } dlMap = {}; toast('Semua unduhan dihapus'); route(true); updatePlayerUI(); }); },
  addpl(el) { addToPlaylist(el.dataset.id); },
  pladd(el) { const p = myPl(el.dataset.pl); if (p.tracks.includes(el.dataset.id)) { toast('Lagu sudah ada di playlist'); return; } p.tracks.push(el.dataset.id); saveUD(); closeModal(); toast('Ditambahkan ke “' + p.name + '”'); route(true); },
  newpl() { playlistModal(null); },
  newpl2(el) { const id = el.dataset.id; modal(`<h3>Playlist baru</h3><label for="pn">Nama</label><input id="pn" maxlength="60"><div class="err-t" id="perr"></div><div class="acts"><button class="btn ghost" data-a="closemodal">Batal</button><button class="btn" id="psave">Buat &amp; tambahkan</button></div>`, m => $('#psave', m).onclick = () => { const n = $('#pn', m).value.trim(); if (!n) { $('#perr', m).textContent = 'Nama playlist wajib diisi.'; return; } UD.playlists.push({ id: 'p' + uid8(), name: n, description: '', created: Date.now(), tracks: [id], c1: '#10b981', c2: '#064e3b' }); saveUD(); closeModal(); toast('Playlist dibuat'); route(true); }); },
  editpl(el) { playlistModal(myPl(el.dataset.id)); },
  delpl(el) { const p = myPl(el.dataset.id); confirmBox(`Hapus playlist “${esc(p.name)}”?`, () => { UD.playlists = UD.playlists.filter(x => x.id !== p.id); saveUD(); toast('Playlist dihapus'); location.hash = '#/library'; libTab = 'pl'; }); },
  rmpl(el) { const p = myPl(el.dataset.pl); p.tracks = p.tracks.filter(x => x !== el.dataset.id); saveUD(); route(true); },
  mvup(el) { const p = myPl(el.dataset.pl), i = +el.dataset.i; if (i > 0) { [p.tracks[i - 1], p.tracks[i]] = [p.tracks[i], p.tracks[i - 1]]; saveUD(); route(true); } },
  mvdn(el) { const p = myPl(el.dataset.pl), i = +el.dataset.i; if (i < p.tracks.length - 1) { [p.tracks[i + 1], p.tracks[i]] = [p.tracks[i], p.tracks[i + 1]]; saveUD(); route(true); } },
  savealbum(el) { const id = el.dataset.id, i = UD.savedAlbums.indexOf(id); i >= 0 ? UD.savedAlbums.splice(i, 1) : UD.savedAlbums.push(id); saveUD(); toast(i >= 0 ? 'Dihapus dari library' : 'Album disimpan'); route(true); },
  saveartist(el) { const id = el.dataset.id, i = UD.savedArtists.indexOf(id); i >= 0 ? UD.savedArtists.splice(i, 1) : UD.savedArtists.push(id); saveUD(); toast(i >= 0 ? 'Tidak lagi diikuti' : 'Artis disimpan'); route(true); },
  tab(el) { libTab = el.dataset.id; route(true); },
  clrhist() { UD.history = []; saveUD(); route(true); },
  closemodal: closeModal,
  logout() { logout(); },
  async guest() { await startSession({ id: 'guest', name: 'Tamu', guest: true }); location.hash = '#/home'; route(); },
  editname() { modal(`<h3>Ubah nama</h3><label for="nn">Nama tampilan</label><input id="nn" value="${esc(session.name)}" maxlength="40"><div class="acts"><button class="btn ghost" data-a="closemodal">Batal</button><button class="btn" id="nsave">Simpan</button></div>`, m => $('#nsave', m).onclick = () => { const n = $('#nn', m).value.trim(); if (!n) return; session.name = n; LS.set('vt_session', session); const acc = LS.get('vt_accounts', []); const a = acc.find(x => x.id === session.id); if (a) { a.name = n; LS.set('vt_accounts', acc); } closeModal(); route(true); }); },
  async install() { if (!deferredPrompt) return; deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; const b = $('#installBtn'); if (b) b.classList.add('hidden'); }
};
document.addEventListener('click', e => {
  const g = e.target.closest('[data-go]'); if (g) { location.hash = g.dataset.go; return; }
  const a = e.target.closest('[data-a]'); if (!a) return;
  if (a.matches('[data-a=play]') && e.target.closest('button[data-a]') && e.target.closest('button[data-a]') !== a) { /* tombol di dalam baris menang */ }
  const btn = e.target.closest('button[data-a],[data-a=pladd]') || a;
  const fn = A[btn.dataset.a]; if (fn) { e.stopPropagation(); fn(btn); }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeModal(); $('#fullplayer').classList.remove('open'); }
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[role=button][data-a]')) { e.preventDefault(); e.target.click(); }
  if (e.key === ' ' && !/INPUT|TEXTAREA|SELECT|BUTTON/.test(e.target.tagName) && session) { e.preventDefault(); toggle(); }
});
document.addEventListener('input', e => { if (e.target.id === 'q') { window.__q = e.target.value; clearTimeout(window.__qt); window.__qt = setTimeout(renderResults, 120); } });
document.addEventListener('change', e => {
  const k = e.target.dataset && e.target.dataset.set; if (!k) return;
  UD.settings[k] = e.target.type === 'checkbox' ? e.target.checked : (k === 'limitMB' ? +e.target.value : e.target.value);
  saveUD(); if (k === 'theme') applyTheme(); toast('Pengaturan disimpan');
});
document.addEventListener('submit', async e => {
  if (e.target.id !== 'authForm') return; e.preventDefault();
  const reg = location.hash === '#/register', err = $('#aerr'); err.textContent = '';
  try {
    const a = reg ? await register($('#fn').value, $('#fe').value, $('#fp').value) : await login($('#fe').value, $('#fp').value);
    await startSession({ id: a.id, name: a.name, email: a.email, guest: false }); location.hash = '#/home'; route();
  } catch (x) { err.textContent = typeof x === 'string' ? x : 'Terjadi kesalahan. Coba lagi.'; }
});

/* ---------- start ---------- */
async function boot() {
  if (session) loadUD(); // sinkron, sebelum event/route apa pun yang butuh UD
  try {
    const r = await fetch('catalog.json'); CAT = await r.json();
  } catch (e) {
    try { CAT = await (await fetch('catalog.json', { cache: 'force-cache' })).json(); } catch { CAT = { artists: [], albums: [], tracks: [] }; }
  }
  if (session) await refreshDl();
  applyTheme(); matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
  if (!location.hash) location.hash = session ? '#/home' : '#/login';
  $('#app').classList.remove('hidden'); netUI(); route(); updatePlayerUI();
  setTimeout(() => $('#splash').classList.add('out'), 900);
  if ('serviceWorker' in navigator && !NATIVE && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(e => console.warn('SW gagal', e));
}
boot();
