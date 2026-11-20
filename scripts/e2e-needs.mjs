// End-to-end check of the two things that need no AI of ours, against any copy of the app (the dev server or the
// hosted site): the quick-needs board with the network switched off after the page has loaded, and the microphone
// button for the partner's question (the notice only: this run has no microphone and nothing is recorded).
// Launches its own headless Chrome with a throwaway profile. Makes no model call and no cloud request.
// Exit code 0 only if every check passes.
//
// Usage: node scripts/e2e-needs.mjs [--url http://localhost:5179/] [--shots DIR]
//        node scripts/e2e-needs.mjs --url https://talk-partner.web.app/
import { spawn, execSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const URL_ = arg('--url', 'http://localhost:5179/').replace(/\/?$/, '/');
const SHOTS = arg('--shots', null);
const PORT = 9344;
const CHROME = process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const commit = (() => { try { return execSync('git rev-parse HEAD').toString().trim(); } catch { return 'unknown'; } })();
const HOST = new URL(URL_).host;

const profile = mkdtempSync(join(tmpdir(), 'tp-needs-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--window-size=1280,900', 'about:blank'], { stdio: 'ignore' });
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`); };

async function cdpTarget() {
  for (let i = 0; i < 50; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
      const page = list.find((t) => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch { /* not up yet */ }
    await sleep(200);
  }
  throw new Error('Chrome did not start');
}

try {
  const ws = new WebSocket(await cdpTarget());
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  let id = 0;
  const pending = new Map();
  const hosts = new Map(); // every host the page asked, for the whole run
  const offlineAsked = []; // requests the page started after the network was switched off
  const offlinePictures = []; // (phase 11) the bundled picture files asked for then, on the app's own host
  const errors = [];
  let isOffline = false;
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
    if (m.method === 'Network.requestWillBeSent' && /^https?:/.test(m.params.request.url)) {
      const u = new URL(m.params.request.url);
      hosts.set(u.host, (hosts.get(u.host) ?? 0) + 1);
      // (phase 11) a bundled picture file on the app's own host: this run bypasses the service worker, so with the
      // network off it fails and the tile shows our drawing instead (web/src/pictos.ts, pictoFallback); counted apart
      if (isOffline && u.host === new URL(URL_).host && /^\/pictures\/[a-z_]+\.webp$/.test(u.pathname)) offlinePictures.push(u.pathname);
      else if (isOffline && !u.pathname.includes('offline-probe')) offlineAsked.push(`${u.host}${u.pathname}`);
    }
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails?.exception?.description ?? m.params.exceptionDetails?.text ?? 'exception');
  });
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const js = async (expr) => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;
  const shot = async (name) => {
    if (!SHOTS) return;
    mkdirSync(SHOTS, { recursive: true });
    const r = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(join(SHOTS, `${name}.png`), Buffer.from(r.result.data, 'base64'));
  };
  const waitFor = async (expr, ms = 15000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await js(expr)) return true; await sleep(150); } return false; };
  const settled = () => waitFor(`document.querySelector('#make') && !document.querySelector('#make').disabled && !!document.querySelector('#result .badge')`);

  await send('Network.enable');
  // A production build has a service worker, and the offline switch below acts on the page, not on a worker: the
  // page's requests skip the worker here, so "the network is off" is true of every request this run can make.
  // (The app with its worker and the connection off is driven by scripts/pwa-check.py and scripts/e2e-simple.py.)
  await send('Network.setBypassServiceWorker', { bypass: true });
  await send('Runtime.enable');
  await send('Page.enable');
  console.log(`url: ${URL_}`);
  console.log(`browser: ${(await send('Browser.getVersion')).result?.product ?? 'unknown'}`);
  await send('Page.navigate', { url: `${URL_}#/demo` });
  await waitFor(`!!document.querySelector('.chip')`);
  // let the first frame settle (fonts, the capability check) before the network goes away
  await js('document.fonts.ready.then(() => true)');
  await waitFor(`!/^Checking/.test(document.querySelector('#status').innerText.trim())`, 12000);
  await sleep(1500);
  console.log(`status line: ${await js(`document.querySelector('#status').innerText.replace(/\\s+/g, ' ')`)}`);

  // the microphone: there on a copy with project settings (voice input is a model call through Firebase AI Logic),
  // between the field and "Make card"; the first press says where the recording goes and starts nothing; this run
  // then says "Not now", so nothing is recorded and nothing is sent. On a copy with no settings there is no button.
  const hostsBeforeMic = [...hosts.keys()].join(',');
  const mic = await js(`(() => { const m = document.querySelector('#mic'), mk = document.querySelector('#make'), q = document.querySelector('#q'); if (!m) return { has: false, status: document.querySelector('#status').innerText };
    const before = document.querySelector('#voice').hidden, between = q.getBoundingClientRect().right <= m.getBoundingClientRect().left && m.getBoundingClientRect().right <= mk.getBoundingClientRect().left, label = m.getAttribute('aria-label'), size = Math.round(Math.min(m.getBoundingClientRect().width, m.getBoundingClientRect().height));
    m.click(); const v = document.querySelector('#voice');
    const r = { has: true, between, before, label, size, shown: !v.hidden, text: v.innerText.replace(/\\s+/g, ' '), pressed: document.querySelector('#mic').getAttribute('aria-pressed'), phase: document.querySelector('#mic').dataset.phase };
    document.querySelector('[data-act="voice-no"]').click(); r.after = document.querySelector('#voice').hidden; return r; })()`);
  if (mic.has) {
    check('the microphone button is there, between the question field and "Make card", at least 44 px', mic.between && mic.label === 'Speak your question' && mic.size >= 44, JSON.stringify({ between: mic.between, label: mic.label, size: mic.size }));
    check('its first press only says where the recording goes (to Google\'s cloud, with any names said; for the partner\'s question only), and nothing is recorded', mic.before === true && mic.shown && /sends the recording to Google's cloud/.test(mic.text ?? '') && /with any names you say/.test(mic.text ?? '') && /their speech is never recorded/.test(mic.text ?? '') && mic.pressed === 'false' && mic.phase === 'idle' && mic.after === true, mic.text);
    check('the notice never says the recording stays on this computer, and showing it contacted no host', !/on this computer|on-device|stays/i.test(mic.text ?? '') && [...hosts.keys()].join(',') === hostsBeforeMic, `hosts: ${[...hosts.keys()].join(', ')}`);
  } else {
    check('this copy has no project settings, so it has no microphone button (voice input is a cloud model call)', /no project settings|rules only/i.test(mic.status ?? ''), mic.status);
  }
  await shot('needs-00-partner-screen');

  // from here on the network is off: the board must open, be checked and hand over to the partner with no request
  const before = [...hosts.entries()].map(([h, n]) => `${h}×${n}`).join(', ');
  await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  isOffline = true;
  // (a path the service worker of a production build does not keep: the page itself would come from its kept copy)
  const off = await js(`fetch('/offline-probe-' + Date.now(), { cache: 'no-store' }).then(() => false, () => true)`);
  check('the network is off for the rest of this run (a request to the app\'s own host fails)', off === true && (await js('navigator.onLine')) === false, `fetch failed: ${off}`);

  await js(`document.querySelector('[data-act="needs"]').click()`);
  await waitFor(`!!document.querySelector('.person.full .tiles.needs')`, 4000); await sleep(400);
  // (phase 11) with no service worker the picture files cannot load: every tile of the board must still show a
  // picture (our drawing, the fallback in web/src/pictos.ts), never a broken image. With the worker they come from
  // its cache (pwa-check.py).
  await waitFor(`[...document.querySelectorAll('#person img.pic')].length === 0`, 4000);
  const fallback = await js(`(() => { const t = [...document.querySelectorAll('#person .tile')]; return { n: t.length, drawn: t.filter((x) => x.querySelector('svg[role="img"]') || x.querySelector('img.pic')?.naturalWidth > 0).length, broken: [...document.querySelectorAll('#person img.pic')].filter((i) => i.complete && !i.naturalWidth).length }; })()`);
  check('offline, no service worker (phase 11): the picture files cannot load, and every tile of the board shows our drawing instead, none broken', fallback && fallback.n >= 9 && fallback.drawn === fallback.n && fallback.broken === 0, `${JSON.stringify(fallback)}; files asked: ${offlinePictures.length}`);
  const board = await js(`(() => { const t = [...document.querySelectorAll('#person .tile')]; const r = t.map((x) => x.getBoundingClientRect());
    return { hash: location.hash, headline: document.querySelector('#person .headline')?.innerText ?? '', words: t.map((x) => x.querySelector('span')?.innerText ?? ''), pictures: t.filter((x) => x.querySelector('svg[role="img"], img.pic[alt]')).length,
      smallest: Math.round(Math.min(...r.map((b) => Math.min(b.width, b.height)))), lowest: Math.round(Math.max(...r.map((b) => b.bottom))), screen: innerHeight, images: document.querySelectorAll('#person img').length, broken: [...document.querySelectorAll('#person img')].filter((i) => i.complete && !i.naturalWidth).length,
      font: getComputedStyle(t[0]).fontFamily.split(',')[0], fontLoaded: document.fonts.check(getComputedStyle(t[0]).font) }; })()`);
  check('offline: "Quick needs" opens the board full screen in one tap: ten tiles (nine needs since phase 5, and the way out), each a picture and its word, every target at least 64 px, all on one screen',
    board.hash === '#/needs' && board.headline === 'I need' && JSON.stringify(board.words) === JSON.stringify(['toilet', 'drink', 'food', 'pain', 'tired', 'too hot', 'too cold', 'call someone', "something's wrong", 'something else']) && board.pictures === 10 && board.broken === 0 && board.smallest >= 64 && board.lowest <= board.screen, JSON.stringify(board));
  await shot('needs-01-board-offline');
  const tap = async (i) => { await js(`document.querySelector('#person .tile[data-i="${i}"]').click()`); await waitFor(`!!document.querySelector('#person [data-confirm="yes"]')`, 3000); await sleep(200); };
  await tap(0);
  const v1 = await js(`({ headline: document.querySelector('#person .headline')?.innerText ?? '', word: document.querySelector('#person .confirm-pic p')?.innerText ?? '', picture: !!document.querySelector('#person .confirm-pic :is(svg, img.pic)'), tick: !!document.querySelector('[data-confirm="yes"] svg'), cross: !!document.querySelector('[data-confirm="change"] svg') })`);
  check('offline: a tap on "toilet" asks "So: toilet. Right?" with the picture, the word, a tick and a cross', v1.headline === 'So: toilet. Right?' && v1.word === 'toilet' && v1.picture && v1.tick && v1.cross, JSON.stringify(v1));
  await shot('needs-02-check-offline');
  await js(`document.querySelector('[data-confirm="yes"]').click()`); await sleep(300);
  const done = await js(`({ person: document.querySelector('#person').innerText.replace(/\\s+/g, ' ').trim(), picture: !!document.querySelector('#person .answered :is(svg, img.pic)') })`);
  // the press-and-hold exit, as a partner would use it (600 ms on the cross, top right)
  await js(`(() => { const e = document.querySelector('#exit'); e.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); return true; })()`);
  await waitFor(`!!document.querySelector('#result .need-line')`, 4000); await sleep(300);
  const side = await js(`({ hash: location.hash, done: document.querySelector('#result .done')?.innerText ?? '', line: document.querySelector('#result .need-line')?.innerText ?? '', badge: document.querySelector('#result .badge')?.innerText ?? '', tail: document.querySelector('#result .badge-line .tail')?.innerText ?? '', pane: document.querySelector('#person').innerText.replace(/\\s+/g, ' ').trim() })`);
  check('offline: after the tick the person\'s screen shows the need and nothing else; press-and-hold on the cross leads to the partner\'s side, which has the line for it, "No AI needed", nothing left',
    done.picture && done.person === 'I need toilet' && side.done === 'Chose "toilet" and confirmed it.' && side.line === 'Go now. The rest can wait.' && side.badge === 'No AI needed' && /nothing left this computer/.test(side.tail) && side.pane === 'I need toilet', JSON.stringify({ done, side }));
  await shot('needs-03-partner-side-offline');
  // "pain" leads on to the body card, made in code
  await js(`document.querySelector('[data-act="needs"]').click()`); await waitFor(`!!document.querySelector('.person.full .tiles.needs')`, 4000); await sleep(300);
  await tap(3); await js(`document.querySelector('[data-confirm="yes"]').click()`); await sleep(300);
  await js(`location.hash = '#/demo'`); await waitFor(`!!document.querySelector('#result .need-line')`, 3000); await sleep(200);
  await js(`document.querySelector('#result .chip[data-q="Where does it hurt?"]').click()`); await sleep(150); await settled();
  const body = await js(`({ kind: document.querySelector('#person').dataset.kind, badge: document.querySelector('#result .badge')?.innerText ?? '', tiles: [...document.querySelectorAll('#person .tile span')].map((e) => e.innerText) })`);
  check('offline: after "pain" one tap asks "Where does it hurt?", and the body card is made with no network', body.kind === 'body' && body.badge === 'No AI needed' && body.tiles.length >= 3, JSON.stringify(body));
  // the way out
  await js(`document.querySelector('[data-act="needs"]').click()`); await waitFor(`!!document.querySelector('.person.full .tiles.needs')`, 4000); await sleep(300);
  await tap(9); // (the tenth tile since phase 5: the way out comes after "something's wrong")
  const v2 = await js(`document.querySelector('#person .headline')?.innerText ?? ''`);
  await js(`document.querySelector('[data-confirm="yes"]').click()`); await sleep(300);
  await js(`location.hash = '#/demo'`); await waitFor(`!!document.querySelector('#result .need-line')`, 3000); await sleep(200);
  const out = await js(`({ done: document.querySelector('#result .done')?.innerText ?? '', line: document.querySelector('#result .need-line')?.innerText ?? '', field: !!document.querySelector('#q') && !document.querySelector('#q').disabled, stuck: !!document.querySelector('#result [data-act="stuck"]') })`);
  check('offline: "something else" gets the same check, then hands back to the question box and "We\'re stuck"', v2 === 'So: something else. Right?' && out.done === 'They chose "something else".' && /question box/.test(out.line) && out.field && out.stuck, JSON.stringify({ v2, ...out }));

  check('offline: the page started no request for any of it, other than the bundled picture files on its own host', offlineAsked.length === 0, offlineAsked.length ? offlineAsked.join(', ') : 'none');
  check('no script error on the page', errors.length === 0, errors.join(' | ').slice(0, 300));
  console.log(`hosts the page contacted while the network was on (page load): ${before}`);
  check('before the network went off, the page had contacted no host but its own', [...hosts.keys()].every((h) => h === HOST), before);
  ws.close();
} catch (e) {
  check('run completed', false, String(e));
} finally {
  chrome.kill('SIGTERM');
  await sleep(800);
  rmSync(profile, { recursive: true, force: true });
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\ncommit ${commit}  ${results.length - failed}/${results.length} checks passed  ${new Date().toISOString()}`);
process.exit(failed ? 1 : 0);
