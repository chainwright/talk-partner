// Screenshots of every screen at phone (390 × 844) and desktop (1280 × 900) widths, with layout checks:
// no horizontal scroll, and "Show to person" above the fold on the phone (REBUILD_SPEC §5.3).
// Uses its own headless Chrome with a throwaway profile; makes only code cards (no model, no cloud call).
//
// Usage: npm run dev (in another shell), then  node scripts/shots.mjs [--url http://localhost:5179/] [--out devlog/shots_day3]
// Design previews: --url 'http://localhost:5179/?theme=signal' --out devlog/design_dirs/signal --only 03,04,05
import { spawn, execSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const URL_ = arg('--url', 'http://localhost:5179/');
const OUT = arg('--out', 'devlog/shots_day3');
const ONLY = arg('--only', '') ? arg('--only', '').split(',') : null; // keep only these shot numbers (the flow still runs in full)
const PORT = 9342;
const CHROME = process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const commit = (() => { try { return execSync('git rev-parse HEAD').toString().trim(); } catch { return 'unknown'; } })();

const profile = mkdtempSync(join(tmpdir(), 'tp-shots-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
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

mkdirSync(OUT, { recursive: true });
try {
  const ws = new WebSocket(await cdpTarget());
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const js = async (expr) => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;
  const waitFor = async (expr, ms = 15000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await js(expr)) return true; await sleep(150); } return false; };
  await send('Page.enable');
  await send('Runtime.enable');

  const SIZES = { phone: { width: 390, height: 844, mobile: true, deviceScaleFactor: 2 }, desktop: { width: 1280, height: 900, mobile: false, deviceScaleFactor: 1 } };
  let size = 'desktop';
  const setSize = async (s) => { size = s; await send('Emulation.setDeviceMetricsOverride', SIZES[s]); await sleep(150); };
  const shot = async (name) => {
    if (ONLY && !ONLY.includes(name.slice(0, 2))) return;
    await js('document.fonts.ready.then(() => true)');
    // design previews animate in; stills show the settled state (motion is recorded by scripts/motion.mjs)
    await js(`(() => { if (!document.querySelector('#tp-still')) { const st = document.createElement('style'); st.id = 'tp-still'; st.textContent = '*, *::before, *::after { animation: none !important; transition: none !important; }'; document.head.append(st); } return true; })()`);
    await sleep(250);
    const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
    writeFileSync(join(OUT, `${size}_${name}.png`), Buffer.from(r.result.data, 'base64'));
    const sw = await js('document.documentElement.scrollWidth');
    const iw = await js('window.innerWidth');
    check(`${size} ${name}: no horizontal scroll`, sw <= iw, `${sw} <= ${iw}`);
  };
  const nav = async (hash) => { await send('Page.navigate', { url: `${URL_}${hash}` }); await waitFor('!!document.querySelector("main")'); await sleep(300); };
  const click = async (sel) => { await js(`(() => { const b = document.querySelector(${JSON.stringify(sel)}); if (!b) return false; b.click(); return true; })()`); await sleep(350); };
  const chip = async (q) => { await click(`.chip[data-q="${q}"]`); await waitFor('!!document.querySelector("#result .badge")'); await sleep(300); };

  for (const s of ['phone', 'desktop']) {
    await setSize(s);
    // first run
    await send('Page.navigate', { url: URL_ });
    await waitFor('!!document.querySelector("main")');
    await js('indexedDB.deleteDatabase("talk-partner")');
    await nav('#/welcome');
    await shot('01-welcome');
    // About me, empty (the real profile)
    await click('[data-act="welcome-setup"]');
    await waitFor('!!document.querySelector("#about")');
    await click('[data-act="person-add"]');
    await shot('02-about-empty');
    // judge mode: sample family, chips, coffee/tea code card
    await nav('#/demo');
    await waitFor('!!document.querySelector(".chip")');
    await shot('03-judge-mode');
    await chip('Do you want coffee or tea?');
    await shot('04-partner-card-coffee-tea');
    if (s === 'phone') {
      const top = await js('document.querySelector("[data-act=show]")?.getBoundingClientRect().bottom');
      check('phone: "Show to person" above the fold (390 × 844)', top !== undefined && top <= 844, `bottom at ${Math.round(top)}px`);
    }
    // full-screen person view, then a tap and the confirm step
    await click('[data-act="show"]');
    await waitFor('!!document.querySelector(".person.full")');
    await shot('05-person-choices');
    await js('document.querySelector("#person .tile[data-i=\\"0\\"]").click()');
    await sleep(400);
    await shot('06-person-confirm');
    await click('[data-confirm="yes"]');
    await shot('07-person-answered');
    // back on the partner screen: answered line and recap
    await nav('#/demo');
    await waitFor('!!document.querySelector("#result")');
    // (the session state survives: the hash change re-renders the same page)
    await shot('08-partner-answered');
    // body map and the "your left arm" step
    await chip('Where does it hurt?');
    await js('document.querySelector("#person .tile[data-i=\\"1\\"]").click()'); // chest
    await sleep(300);
    await shot('09-body-detail');
    // memory question and the override
    await chip('What year did we get married?');
    await shot('10-memory');
    await click('[data-act="override"]');
    await shot('11-memory-override');
    // open question with no model and cloud help off: blocked, with the inline offer
    await chip('What do you want to do this weekend?');
    await shot('12-blocked-offer');
    // less support
    await chip('Do you need the toilet?');
    await click('[data-act="less"]');
    await shot('13-less-support');
    // day 5: the coaching line on a double question, "why this card" (open in judge mode), the repair card
    await chip('How was therapy today, and did you eat?');
    await shot('18-double-question-coach');
    await chip('Should we ring Jen or Tyler?');
    await shot('19-why-this-card');
    await click('[data-act="stuck"]');
    await waitFor('!!document.querySelector(".tiles.repair")');
    await shot('20-stuck-partner');
    await click('[data-act="show"]');
    await waitFor('!!document.querySelector(".person.full .tiles.repair")');
    await shot('21-repair-person');
    await nav('#/demo');
    await click('[data-act="unstuck"]');
    // About me with the sample family, cloud help consent, how this works
    await nav('#/about');
    await shot('14-about-sample');
    await nav('#/cloud');
    await shot('15-cloud-consent');
    await js('(() => { const c = document.querySelector("#consent"); c.checked = true; c.dispatchEvent(new Event("change", { bubbles: true })); })()');
    await sleep(200);
    await click('[data-act="cloud-on"]');
    await shot('16-cloud-on');
    await click('[data-act="cloud-off"]');
    await nav('#/how');
    await shot('17-how-this-works');
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
