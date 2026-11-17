// End-to-end check of a copy with NO project settings (what a judge gets from a bare clone, no .env.local).
// Starts its own dev server with the Firebase settings forced empty, opens judge mode in a headless Chrome with a
// throwaway profile, clicks the one-tap questions and checks that every rules-only card appears, that an open
// question gets an honest "No card", and that the page contacts no host but its own.
// Exit code 0 only if every check passes.
//
// Usage: node scripts/e2e-noconfig.mjs [--shots DIR]
import { spawn, execSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const SHOTS = arg('--shots', null);
const APP_PORT = 5181;
const PORT = 9343;
const URL_ = `http://localhost:${APP_PORT}/#/demo`;
const CHROME = process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const commit = (() => { try { return execSync('git rev-parse HEAD').toString().trim(); } catch { return 'unknown'; } })();

// Vite gives process.env priority over .env files, so empty values here mean "no settings" even on a machine that has .env.local
const vite = spawn('npx', ['vite', '--port', String(APP_PORT), '--strictPort'], {
  stdio: 'ignore',
  env: { ...process.env, VITE_FIREBASE_API_KEY: '', VITE_FIREBASE_APP_ID: '', VITE_APPCHECK_DEBUG_TOKEN: '', VITE_RECAPTCHA_ENTERPRISE_SITE_KEY: '' },
});
const profile = mkdtempSync(join(tmpdir(), 'tp-noconfig-'));
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
async function serverUp() {
  for (let i = 0; i < 75; i++) {
    try { if ((await fetch(`http://localhost:${APP_PORT}/`)).ok) return; } catch { /* not up yet */ }
    await sleep(200);
  }
  throw new Error('the dev server did not start');
}

try {
  await serverUp();
  const ws = new WebSocket(await cdpTarget());
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  let id = 0;
  const pending = new Map();
  const hosts = new Map();
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
    if (m.method === 'Network.requestWillBeSent' && /^https?:/.test(m.params.request.url)) {
      const h = new URL(m.params.request.url).host;
      hosts.set(h, (hosts.get(h) ?? 0) + 1);
    }
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
  const chip = (q) => js(`document.querySelector('.chip[data-q=${JSON.stringify(q)}]').click()`);
  const tiles = () => js(`[...document.querySelectorAll('#person .tile span')].map(e => e.innerText)`);
  const badge = () => js(`document.querySelector('#result .badge')?.innerText`);
  const settled = () => waitFor(`document.querySelector('#make') && !document.querySelector('#make').disabled && !!document.querySelector('#result .badge')`);

  await send('Network.enable');
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Page.navigate', { url: URL_ });
  await waitFor(`!!document.querySelector('.chip')`);
  await sleep(800);
  const status = await js(`document.querySelector('#status').innerText`);
  console.log(`status line: ${status}`);
  check('the copy really has no project settings', /no project settings/.test(status ?? ''), status);

  // judge mode opens with one card already made, before any click: read in code, so it is there on a bare clone too
  const first = await js(`({ tiles: [...document.querySelectorAll('#person .tile span')].map(e => e.innerText), badge: document.querySelector('#result .badge')?.innerText ?? '', tail: document.querySelector('#result .badge-line .tail')?.innerText ?? '', lit: document.querySelector('.chip.on')?.dataset.q ?? '', enter: document.querySelector('#app').classList.contains('enter') })`);
  check('judge mode opens with a card already made, before any click: coffee / tea / something else, "No AI needed", nothing left',
    JSON.stringify(first?.tiles) === JSON.stringify(['coffee', 'tea', 'something else']) && first.badge === 'No AI needed' && /nothing left this computer/.test(first.tail) && first.lit === 'Do you want coffee or tea?' && first.enter === false, JSON.stringify(first));

  await chip('What year did we get married?');
  await settled();
  await chip('Do you want coffee or tea?');
  await settled();
  const t1 = await tiles();
  check('coffee/tea card is coffee / tea / something else', JSON.stringify(t1) === JSON.stringify(['coffee', 'tea', 'something else']), JSON.stringify(t1));
  check('coffee/tea badge is "No AI needed"', (await badge()) === 'No AI needed', await badge());
  await shot('noconfig-01-coffee-tea');

  for (const q of ['Do you need the toilet?', 'Should we ring Jen or Tyler?', 'Where does it hurt?', 'How was therapy today, and did you eat?']) {
    await chip(q);
    await settled();
    const t = await tiles();
    check(`"${q}" makes a card`, (t?.length ?? 0) >= 3 && (await badge()) === 'No AI needed', JSON.stringify(t));
  }

  await chip('What year did we get married?');
  await settled();
  const coach = await js(`document.querySelector('.coach')?.innerText ?? ''`);
  check('the memory question coaches instead of quizzing', /tell, don't test/.test(coach), coach);

  await chip('What do you want to do this weekend?');
  await settled();
  const warn = await js(`document.querySelector('#result .warn')?.innerText ?? ''`);
  check('an open question gets an honest "No card"', (await badge()) === 'No card' && /not configured on this copy/.test(warn), `${await badge()} · ${warn}`);
  await shot('noconfig-02-open-question');

  // the one number under the chips, after every card of this run: nothing was handed to any cloud step, and (next check) no other host was contacted
  const bytes = await js(`document.querySelector('#bytes')?.innerText.replace(/\\s+/g, ' ') ?? ''`);
  check('the number under the chips reads "0 bytes left this computer" after every card of this run', /^0 bytes left this computer \d+ cards this session · page load not counted/.test(bytes), bytes);

  const all = [...hosts.entries()].map(([h, n]) => `${h}×${n}`).join(', ');
  check('no host contacted but the app itself', [...hosts.keys()].every((h) => h === `localhost:${APP_PORT}`), all);
  ws.close();
} catch (e) {
  check('run completed', false, String(e));
} finally {
  chrome.kill('SIGTERM');
  vite.kill('SIGTERM');
  await sleep(800);
  rmSync(profile, { recursive: true, force: true });
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\ncommit ${commit}  ${results.length - failed}/${results.length} checks passed  ${new Date().toISOString()}`);
process.exit(failed ? 1 : 0);
