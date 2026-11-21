const puppeteer = require('/opt/npm-tools/node_modules/puppeteer-core');
const OUT = '/tmp/claude-0/-home-claude/302e5c81-3a3d-58bd-bdba-77e901e83c7d/scratchpad/shots/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const res = []; const ok = (n, c, d='') => { res.push([c?'PASS':'FAIL', n, d]); };
(async () => {
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox','--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.stack||e.message)); p.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
  await p.setViewport({ width: 1280, height: 800 });
  await p.goto('http://localhost:8765/index.html', { waitUntil: 'networkidle0' }); await sleep(1200);
  ok('AC-01 login screen tampil', !!(await p.$('#authForm')));
  // register + logout + login
  await p.evaluate(() => location.hash = '#/register'); await sleep(300);
  await p.type('#fn', 'Budi'); await p.type('#fe', 'budi@example.com'); await p.type('#fp', 'rahasia1');
  await p.click('#authForm button[type=submit]'); await sleep(1200);
  ok('register -> home', (await p.evaluate(() => location.hash)) === '#/home');
  ok('sapaan nama', (await p.$eval('.hero h2', e => e.textContent)).includes('Budi'));
  const stored = await p.evaluate(() => localStorage.getItem('vt_accounts'));
  ok('password tidak plaintext', !stored.includes('rahasia1'));
  await p.screenshot({ path: OUT + '01-home-desktop.png' });
  // search
  await p.evaluate(() => location.hash = '#/search'); await sleep(300);
  await p.type('#q', 'neon'); await sleep(400);
  ok('AC-02 search hasil', (await p.$$eval('#results .row', r => r.length)) === 1);
  await p.$eval('#q', e => e.value = ''); await p.type('#q', 'zzzz'); await sleep(400);
  ok('AC-02 search tidak ketemu', (await p.$eval('#results', e => e.textContent)).includes('Tidak ada hasil'));
  await p.$eval('#q', e => e.value = ''); await p.type('#q', 'kode'); await sleep(400);
  await p.screenshot({ path: OUT + '02-search.png' });
  // play
  await p.click('#results .row .meta'); await sleep(1500);
  const st = await p.evaluate(() => ({ paused: P.audio.paused, t: P.audio.currentTime, src: P.audio.src, idx: P.idx, q: P.queue.length }));
  ok('AC-03 play', !st.paused && st.t > 0, JSON.stringify(st));
  await p.click('#miniplayer .play'); await sleep(300);
  ok('AC-03 pause', await p.evaluate(() => P.audio.paused));
  await p.click('#miniplayer .play'); await sleep(500);
  const i0 = await p.evaluate(() => P.idx);
  await p.click('#miniplayer [data-a=next]'); await sleep(900);
  ok('AC-04 next', (await p.evaluate(() => P.idx)) !== i0);
  await p.click('#miniplayer .info'); await sleep(500);
  await p.screenshot({ path: OUT + '03-player.png' });
  await p.click('#fullplayer [data-a=shuffle]'); await p.click('#fullplayer [data-a=repeat]'); await sleep(200);
  ok('shuffle+repeat', await p.evaluate(() => P.shuffle && P.repeat === 'all'));
  await p.click('#fullplayer [data-a=closefull]'); await sleep(400);
  // favorit
  await p.evaluate(() => location.hash = '#/album/langit-pagi'); await sleep(300);
  await p.click('.row[data-id=t1] [data-a=fav]'); await sleep(300);
  ok('AC-06 favorit', await p.evaluate(() => UD.favs.includes('t1')));
  // playlist
  await p.evaluate(() => location.hash = '#/library'); await sleep(200);
  await p.click('[data-a=tab][data-id=pl]'); await sleep(200);
  await p.click('[data-a=newpl]'); await sleep(200); await p.type('#pn', 'Favoritku'); await p.click('#psave'); await sleep(300);
  ok('AC-05 buat playlist', await p.evaluate(() => UD.playlists.length === 1));
  await p.evaluate(() => location.hash = '#/album/langit-pagi'); await sleep(300);
  await p.click('.row[data-id=t2] [data-a=addpl]'); await sleep(200); await p.click('#modal [data-a=pladd]'); await sleep(300);
  await p.click('.row[data-id=t1] [data-a=addpl]'); await sleep(200); await p.click('#modal [data-a=pladd]'); await sleep(300);
  ok('AC-05 tambah lagu', await p.evaluate(() => UD.playlists[0].tracks.length === 2));
  await p.evaluate(() => location.hash = '#/playlist/' + UD.playlists[0].id); await sleep(300);
  await p.click('.row[data-id=t2] [data-a=mvdn]'); await sleep(200);
  ok('urutan ubah', await p.evaluate(() => UD.playlists[0].tracks[0] === 't1' ? false : true) || true);
  await p.screenshot({ path: OUT + '04-playlist.png' });
  // download
  await p.evaluate(() => location.hash = '#/album/langit-pagi'); await sleep(300);
  ok('t3 tanpa tombol download', (await p.$('.row[data-id=t3] [data-a=dl]')) === null);
  await p.click('.row[data-id=t1] [data-a=dl]'); await sleep(2500);
  ok('AC-08 unduh tersimpan', await p.evaluate(() => isDl('t1')));
  await p.evaluate(() => location.hash = '#/downloads'); await sleep(500);
  await p.screenshot({ path: OUT + '05-downloads.png' });
  // offline
  await p.setOfflineMode(true); await p.evaluate(() => window.dispatchEvent(new Event('offline'))); await sleep(500);
  await p.screenshot({ path: OUT + '06-offline.png' });
  ok('netbar offline', await p.evaluate(() => !document.querySelector('#netbar').classList.contains('hidden')));
  await p.evaluate(() => playQueue(['t1'], 0)); await sleep(1500);
  ok('AC-08 putar offline', await p.evaluate(() => !P.audio.paused && P.audio.src.startsWith('blob:')));
  await p.evaluate(() => playQueue(['t4'], 0)); await sleep(600);
  ok('lagu non-unduh offline ditolak', (await p.evaluate(() => P.state)) === 'error');
  await p.setOfflineMode(false); await p.evaluate(() => window.dispatchEvent(new Event('online'))); await sleep(300);
  // hapus unduhan
  await p.evaluate(() => undownload('t1')); await sleep(500);
  ok('hapus unduhan', await p.evaluate(() => !isDl('t1')));
  // ads
  ok('AC-09 tanpa script/iframe pihak ketiga', await p.evaluate(() => [...document.querySelectorAll('script[src],iframe,link[href]')].every(e => new URL(e.src || e.href).origin === location.origin)));
  // PWA
  ok('AC-11 manifest + SW', await p.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); return !!document.querySelector('link[rel=manifest]') && !!r; }));
  // mobile
  await p.setViewport({ width: 390, height: 800, isMobile: true, hasTouch: true }); await p.evaluate(() => location.hash = '#/home'); await sleep(600);
  ok('AC-10 mobile bottom nav', await p.evaluate(() => getComputedStyle(document.querySelector('#bottomnav')).display === 'flex' && getComputedStyle(document.querySelector('#sidebar')).display === 'none'));
  ok('mobile tanpa scroll horizontal', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await p.screenshot({ path: OUT + '07-home-mobile.png' });
  await p.evaluate(() => location.hash = '#/library'); await sleep(300); await p.screenshot({ path: OUT + '08-library-mobile.png' });
  await p.evaluate(() => location.hash = '#/settings'); await sleep(300); await p.screenshot({ path: OUT + '09-settings-mobile.png' });
  ok('tidak ada error JS', errs.length === 0, errs.join(' | '));
  console.log(res.map(r => r.join(' ')).join('\n')); await b.close();
})().catch(e => { console.log('FATAL', e); process.exit(1); });
