// Fonts leave no trace: a headless run that logs every network request while the app is used in the default look
// and in each design-direction preview, then checks that (1) every request goes to the app's own host (so no font
// service is ever contacted), (2) the default look requests no font file at all, and (3) each preview theme loads its
// families from /fonts/ with status 200. Same throwaway headless Chrome as scripts/shots.mjs; code cards only.
//
// Usage: npm run dev (in another shell), then  node scripts/fonts-check.mjs [--url http://localhost:5179/]
import { spawn, execSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const URL_ = arg('--url', 'http://localhost:5179/');
const PORT = 9344;
const CHROME = process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const commit = (() => { try { return execSync('git rev-parse HEAD').toString().trim(); } catch { return 'unknown'; } })();

/** The families each preview theme uses (web/src/themes.css) and the folder each lives in (web/public/fonts/). */
const THEMES = {
  '': [],
  signal: ['overpass', 'atkinson-hyperlegible-next'],
  marker: ['lexend', 'public-sans'],
  twosides: ['instrument-sans', 'ibm-plex-mono', 'atkinson-hyperlegible-next'],
};

const profile = mkdtempSync(join(tmpdir(), 'tp-fonts-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--window-size=1280,900', 'about:blank'], { stdio: 'ignore' });
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`); };

async function cdpTarget() {
  for (let i = 0; i < 50; i++) {
    try {
      const page = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find((t) => t.type === 'page');
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
  let requests = [];
  const statuses = new Map();
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
    if (m.method === 'Network.requestWillBeSent') requests.push(m.params.request.url);
    if (m.method === 'Network.responseReceived') statuses.set(m.params.response.url, m.params.response.status);
  });
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const js = async (expr) => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;
  const waitFor = async (expr, ms = 15000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await js(expr)) return true; await sleep(150); } return false; };
  await send('Network.enable');
  await send('Network.setCacheDisabled', { cacheDisabled: true });
  await send('Page.enable');
  await send('Runtime.enable');
  const appHost = new URL(URL_).host;

  for (const [theme, families] of Object.entries(THEMES)) {
    requests = [];
    statuses.clear();
    const base = theme ? `${URL_}?theme=${theme}` : URL_;
    // the same path a judge takes: first screen, judge mode, a card (the pane and the trace), the full-screen card
    await send('Page.navigate', { url: `${base}#/welcome` });
    await waitFor('!!document.querySelector("main.welcome")');
    await send('Page.navigate', { url: `${base}#/demo` });
    await waitFor('!!document.querySelector(".chip")');
    await js('document.querySelector(\'.chip[data-q="Do you want coffee or tea?"]\').click()');
    await waitFor('!!document.querySelector("#result .badge")');
    await js('document.querySelector("[data-act=show]").click()');
    await waitFor('!!document.querySelector(".person.full")');
    await js('document.fonts.ready.then(() => true)');
    await sleep(400);

    const label = theme || 'default';
    const hosts = [...new Set(requests.map((u) => { try { return new URL(u).host; } catch { return u.slice(0, 30); } }))];
    check(`${label}: every request goes to ${appHost} (no font service, no other host)`, hosts.every((h) => h === appHost), hosts.join(', '));
    check(`${label}: nothing from fonts.googleapis.com / fonts.gstatic.com`, !requests.some((u) => /googleapis|gstatic/.test(u)));
    const fontReqs = requests.filter((u) => /\/fonts\/.*\.woff2$/.test(u));
    const loaded = await js('[...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family.replace(/"/g, "")).filter((v, i, a) => a.indexOf(v) === i)');
    if (!theme) {
      check('default: no font file requested at all', fontReqs.length === 0, fontReqs.join(', ') || 'none');
      check('default: no webfont loaded', (loaded ?? []).length === 0, (loaded ?? []).join(', ') || 'none');
    } else {
      for (const fam of families) {
        const mine = fontReqs.filter((u) => u.includes(`/fonts/${fam}/`));
        const ok = mine.length > 0 && mine.every((u) => statuses.get(u) === 200);
        check(`${theme}: ${fam} served from /fonts/ with 200`, ok, mine.map((u) => `${u.split('/').pop()}→${statuses.get(u)}`).join(', ') || 'no request');
      }
      const other = fontReqs.filter((u) => !families.some((f) => u.includes(`/fonts/${f}/`)));
      check(`${theme}: no font outside its own families`, other.length === 0, other.join(', ') || 'none');
      console.log(`      ${theme}: loaded families ${JSON.stringify(loaded)}`);
    }
  }
  ws.close();
} catch (e) {
  check('run completed', false, String(e));
} finally {
  chrome.kill('SIGTERM');
  await sleep(500);
  rmSync(profile, { recursive: true, force: true });
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\ncommit ${commit}  ${results.length - failed}/${results.length} checks passed  ${new Date().toISOString()}`);
process.exit(failed ? 1 : 0);
