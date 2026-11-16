// Screenshots of every screen at phone (390 × 844) and desktop (1280 × 900) widths, with layout checks:
// no horizontal scroll, and "Show to person" above the fold on the phone (build spec §5.3).
// Uses its own headless Chrome with a throwaway profile; makes only code cards (no model, no cloud call).
//
// Usage: npm run dev (in another shell), then  node scripts/shots.mjs [--url http://localhost:5179/] [--out devlog/shots_day3]
// A subset: --only 03,04,05 (the flow still runs in full)
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
    // compare with the emulated width, not innerWidth: with mobile emulation the layout viewport widens to fit an
    // overflowing page, so innerWidth grew with it and an 8px overflow on the repair card passed unseen (16 Nov 2026)
    const iw = SIZES[size].width;
    check(`${size} ${name}: no horizontal scroll`, sw <= iw, `${sw} <= ${iw}`);
  };
  const nav = async (hash) => { await send('Page.navigate', { url: `${URL_}${hash}` }); await waitFor('!!document.querySelector("main")'); await sleep(300); };
  const click = async (sel) => { await js(`(() => { const b = document.querySelector(${JSON.stringify(sel)}); if (!b) return false; b.click(); return true; })()`); await sleep(350); };
  const chip = async (q) => { await click(`.chip[data-q="${q}"]`); await waitFor('!!document.querySelector("#result .badge")'); await sleep(300); };
  // typing a question on the partner screen (no chips outside judge mode)
  const ask = async (q) => { await js(`(() => { const i = document.querySelector('#q'); i.value = ${JSON.stringify(q)}; i.dispatchEvent(new Event('input', { bubbles: true })); document.querySelector('#ask').requestSubmit(); return true; })()`); await waitFor('!!document.querySelector("#result .badge")'); await sleep(300); };
  /** Bottom edge of each selector in the viewport (undefined when absent), plus the lowest tile on the person's card. */
  const edges = async (sels) => js(`(() => { const b = (s) => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().bottom) : undefined; };
    const tiles = [...document.querySelectorAll('#person .tile')].map((t) => t.getBoundingClientRect().bottom);
    return { ...Object.fromEntries(${JSON.stringify(sels)}.map((s) => [s, b(s)])), tiles: tiles.length ? Math.round(Math.max(...tiles)) : undefined, n: tiles.length }; })()`);
  // The fold: the phone is 390 × 844 as shot; the desktop frame a judge reads is 1280 × 800 (shots are 900 tall so
  // the whole page is in the file). `fold()` sets the height, runs the checks, saves the frame as seen, restores.
  const FOLD = { phone: 844, desktop: 800 };
  const withFold = async (fn) => {
    if (size === 'desktop') { await send('Emulation.setDeviceMetricsOverride', { ...SIZES.desktop, height: FOLD.desktop }); await sleep(200); }
    await fn(FOLD[size]);
    if (size === 'desktop') await setSize('desktop');
  };
  const frame = async (name) => {
    if (ONLY && !ONLY.includes(name.slice(0, 2))) return;
    await js('document.fonts.ready.then(() => true)'); await sleep(150);
    const r = await send('Page.captureScreenshot', { format: 'png' }); // the viewport only: the frame as a judge sees it
    writeFileSync(join(OUT, `${size}_${name}.png`), Buffer.from(r.result.data, 'base64'));
  };
  /** Above the fold: question box, coaching line, "Say this", the badge line and the main actions; the person's card on the desktop. */
  // `all`: every main action (show, less, next, stuck) must fit (the partner screen); otherwise the main pair (show,
  // less). Judge mode gets the pair: its chips sit above the card, and the status line is two to four lines depending on
  // what the SDK reports for the helper, so the third action row lands at 750–813 px on the desktop and 754–882 px on the phone.
  const aboveFold = async (label, fold, needCoach, all) => {
    const sels = ['#q', '.badge-line', '.say', '[data-act=show]', '[data-act=less]', '[data-act=next]', '[data-act=stuck]', '[data-act=recap]', '.coach', '#person .headline'];
    const e = await edges(sels);
    const must = ['#q', '.badge-line', '.say', '[data-act=show]', '[data-act=less]'].concat(all ? ['[data-act=next]', '[data-act=stuck]'] : []).concat(needCoach ? ['.coach'] : []);
    const okLeft = must.every((s) => e[s] !== undefined && e[s] <= fold);
    check(`${size} ${label}: question, badge line, coaching line, "Say this" and the actions above the fold (${fold}px)`, okLeft, must.map((s) => `${s} ${e[s]}`).join(', '));
    if (size === 'desktop') {
      const okRight = e['#person .headline'] !== undefined && e.n >= 2 && e.tiles <= fold;
      check(`${size} ${label}: the person's card (headline and ${e.n} tiles) fits the same frame`, okRight, `headline ${e['#person .headline']}, lowest tile ${e.tiles}`);
    }
  };

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
    // day 6: judge mode reads badge → why this card → where each step ran → privacy receipt, all open, top to bottom
    const order = await js(`(() => { const y = (s) => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().top) : undefined; }; return ['#result .badge', '#result .why[open]', '#result details[open] .trace', '.receipt[open]'].map(y); })()`);
    check(`${s} judge mode: badge → why this card → where each step ran → privacy receipt, each open, in that order`, order.every((v, i) => v !== undefined && (i === 0 || v > order[i - 1])), order.join(' < '));
    const groups = await js('document.querySelectorAll(".chips.group").length');
    check(`${s} judge mode: the sample questions sit in groups above the card; the session line is one line under the receipt`, groups === 3 && (await js('document.querySelector(".chips.group").getBoundingClientRect().top < document.querySelector("#result").getBoundingClientRect().top && document.querySelector(".judge").getBoundingClientRect().top > document.querySelector(".receipt").getBoundingClientRect().top && !document.querySelector(".judge").open')), `${groups} groups`);
    // the one-frame wow (field review, item ★2): the partner's question and the correction on the left, the person's card on the right
    await withFold(async (fold) => { await aboveFold('judge mode, double question', fold, true, false); await frame('23-wow-frame'); });
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
    // day 6: the partner screen outside judge mode: one closed fold ("How this card was made") holds the rest
    await click('[data-act="leave-demo"]');
    await waitFor('!document.querySelector(".chip") && !!document.querySelector("#q")');
    await ask('How was therapy today, and did you eat?');
    await shot('22-partner-normal');
    const folded = await js(`(() => { const m = document.querySelector('#made'); if (!m || m.open) return 'no closed #made';
      const hidden = ['#result .why', '#result .trace', '#result #sent', '#result .receipt'].map((s) => { const e = document.querySelector(s); return e ? (m.contains(e) && !e.checkVisibility()) : s + ' missing'; });
      return hidden.every((h) => h === true) ? 'ok' : JSON.stringify(hidden); })()`);
    check(`${s} partner screen: why / where each step ran / what was sent / receipt are all inside the closed fold`, folded === 'ok', folded);
    const line = await js('document.querySelector("#result .badge-line")?.innerText.replace(/\\s+/g, " ")');
    check(`${s} partner screen: the badge line is visible and says what left this computer`, !!line && /left this computer/.test(line), line);
    await withFold(async (fold) => { await aboveFold('partner screen, double question', fold, true, true); await frame('24-partner-frame'); });
    // the fold opens: by hand, and from the blocked card's "Show what would be sent" (which must open the fold around it too)
    await js('(() => { document.querySelector("#made").open = true; return true; })()');
    await sleep(200);
    await shot('25-made-open');
    await ask('What do you want to do this weekend?');
    await click('[data-act="show-sent"]');
    const opened = await js('(() => { const m = document.querySelector("#made"), s = document.querySelector("#sent"); return !!m && m.open && !!s && s.open && s.checkVisibility(); })()');
    check(`${s} partner screen: "Show what would be sent" opens the fold and the panel inside it`, opened === true, String(opened));
    await nav('#/demo');
    await waitFor('!!document.querySelector(".chip")');
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
