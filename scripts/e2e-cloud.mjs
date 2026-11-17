// End-to-end check of the CLOUD step against the REAL Firebase AI Logic project (no stand-in model).
// Launches its own headless Chrome with a throwaway profile (so no Gemini Nano), opens judge mode on the dev server,
// and makes cards:
//   1. "Do you want coffee or tea?"  -> code card, nothing sent
//   2. cloud help turned on through the consent screen, then an open question with a name in it -> the stripped leg
//      (PREFER_IN_CLOUD) answers; badge from inferenceSource; "What was sent" holds "Person A", not the name
// Updated 16 Nov 2026 to the current screens (judge-mode chips, the consent screen, the #sent panel): it had kept the
// 11 Nov selectors and failed 2/9. The on-device step has its own script: scripts/e2e-ondevice.mjs.
// Logs every network host the page contacted and the commit hash. Exit code 0 only if every check passes.
//
// Usage: npm run dev (in another shell), then  node scripts/e2e-cloud.mjs [--url http://localhost:5179] [--shots DIR]
import { spawn, execSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const URL_ = arg('--url', 'http://localhost:5179/');
const SHOTS = arg('--shots', null);
const PORT = 9341;
const CHROME = process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const commit = (() => { try { return execSync('git rev-parse HEAD').toString().trim(); } catch { return 'unknown'; } })();

const profile = mkdtempSync(join(tmpdir(), 'tp-e2e-'));
const chrome = spawn(CHROME, [`--headless=new`, `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--window-size=1280,900', 'about:blank'], { stdio: 'ignore' });
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`); };

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
  const hosts = new Map();
  const consoleLines = [];
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
    if (m.method === 'Network.requestWillBeSent') {
      const h = new URL(m.params.request.url).host || m.params.request.url.slice(0, 20);
      hosts.set(h, (hosts.get(h) ?? 0) + 1);
    }
    if (m.method === 'Runtime.consoleAPICalled') consoleLines.push(m.params.args.map((a) => a.value ?? a.description).join(' '));
  });
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const js = async (expr) => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;
  const shot = async (name) => {
    if (!SHOTS) return;
    mkdirSync(SHOTS, { recursive: true });
    const r = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(join(SHOTS, `${name}.png`), Buffer.from(r.result.data, 'base64'));
  };
  const waitFor = async (expr, ms = 45000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await js(expr)) return true; await sleep(300); } return false; };

  await send('Network.enable');
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Page.navigate', { url: `${URL_}#/demo` });
  await waitFor(`!!document.querySelector('.chip')`);
  await sleep(1500);
  const status = await js(`document.querySelector('#status').innerText`);
  console.log(`device status line: ${status}`);

  // page load with cloud help OFF: which hosts did loading the app contact?
  const loadHosts = [...hosts.entries()].map(([h, n]) => `${h}×${n}`).join(', ');
  console.log(`hosts contacted on page load (cloud help off): ${loadHosts}`);
  const appHost = new URL(URL_).host;
  check('page load with cloud help off contacts only the app host', [...hosts.keys()].every((h) => h === appHost), loadHosts);

  // 1. code card
  hosts.clear();
  await js(`document.querySelector('.chip[data-q="Do you want coffee or tea?"]').click()`);
  await waitFor(`document.querySelectorAll('#person .tile').length > 0`);
  const tiles1 = await js(`[...document.querySelectorAll('#person .tile span')].map(e => e.innerText)`);
  const badge1 = await js(`document.querySelector('#result .badge')?.innerText`);
  check('coffee/tea card is coffee / tea / something else', JSON.stringify(tiles1) === JSON.stringify(['coffee', 'tea', 'something else']), JSON.stringify(tiles1));
  check('coffee/tea needs no AI', badge1 === 'No AI needed', badge1);
  const aiHosts1 = [...hosts.keys()].filter((h) => /googleapis|firebase/.test(h));
  check('coffee/tea sent nothing to Firebase/Google', aiHosts1.length === 0, aiHosts1.join(', ') || 'no Google hosts');
  const bytes1 = await js(`document.querySelector('#bytes')?.innerText.replace(/\\s+/g, ' ') ?? ''`);
  check('before any cloud request the number under the chips reads "0 bytes left this computer"', /^0 bytes left this computer/.test(bytes1), bytes1);
  await shot('01-coffee-tea');

  // 2. open question through the stripped leg, cloud help on
  await js(`location.hash = '#/cloud'`); await sleep(500);
  await js(`document.querySelector('#consent').click()`); await sleep(300);
  await js(`document.querySelector('[data-act="cloud-on"]').click()`); await sleep(300);
  await js(`location.hash = '#/demo'`); await sleep(600);
  const cloudNav = await js(`[...document.querySelectorAll('header nav a')].map((a) => a.innerText).find((t) => t.startsWith('Cloud help'))`);
  check('cloud help turned on through the consent screen', cloudNav === 'Cloud help: on', cloudNav);
  hosts.clear(); consoleLines.length = 0;
  const t0 = Date.now();
  await js(`(() => { const q = document.querySelector('#q'); q.value = 'What do you want to do this weekend with Jenny?'; document.querySelector('#ask').requestSubmit(); })()`);
  await waitFor(`document.querySelector('#make') && !document.querySelector('#make').disabled && !!document.querySelector('#result .badge')`, 60000);
  const ms = Date.now() - t0;
  const badge2 = await js(`document.querySelector('#result .badge')?.innerText`);
  const tiles2 = await js(`[...document.querySelectorAll('#person .tile span')].map(e => e.innerText)`);
  const notes = await js(`document.querySelector('.notes')?.innerText ?? ''`);
  console.log(`open question -> badge "${badge2}", tiles ${JSON.stringify(tiles2)}, ${ms} ms\nnotes: ${notes}`);
  check('open question answered by the cloud leg (inferenceSource in_cloud)', badge2 === 'Cloud help (question only)', badge2);
  check('the card has at least two answers plus one escape', (tiles2?.length ?? 0) >= 3, JSON.stringify(tiles2));
  const sent = await js(`document.querySelector('#sent').innerText`);
  const payload = await js(`document.querySelector('#sent pre')?.textContent ?? ''`);
  const tail = await js(`document.querySelector('#result .badge-line .tail')?.innerText ?? ''`);
  const report = consoleLines.filter((l) => l.startsWith('[ai-logic]'));
  console.log(`SDK report: ${report.join(' | ')}`);
  check('the SDK reported inferenceSource=in_cloud for the stripped leg', report.length === 1 && /leg=stripped mode=PREFER_IN_CLOUD inferenceSource=in_cloud/.test(report[0]), report.join(' | '));
  check('the badge line says the question left with 1 name swapped out', /1 name and 0 other About me words swapped out/.test(tail), tail);
  check('the sent payload has "Person A", not the name', /Person A/.test(payload) && !/Jenny/.test(payload), payload.match(/Partner asks:[^"]*/)?.[0] ?? '');
  check('the panel says it was sent', /Sent for this card/.test(sent));
  // "What was sent" by default: one line (the question after the swap) and the size; the exact request is folded, one click opens it
  const folded = await js(`(() => { const d = document.querySelector('#sent details.exact'), pre = d?.querySelector('pre'); const line = document.querySelector('#sent .sent-line');
    const before = { line: line?.querySelector('code')?.innerText ?? '', size: line?.querySelector('span')?.innerText ?? '', open: d?.open, seen: pre?.checkVisibility() };
    d?.querySelector('summary').click(); return { ...before, opened: d?.open, seenAfter: pre?.checkVisibility(), bytes: new TextEncoder().encode(JSON.stringify(JSON.parse(pre?.textContent ?? '{}'))).length }; })()`);
  check('"What was sent" shows one line and the size by default; the exact request is folded and one click opens it',
    folded.line === 'Partner asks: What do you want to do this weekend with Person A?' && folded.size.startsWith(`${folded.bytes.toLocaleString('en-US')} bytes`) && folded.open === false && folded.seen === false && folded.opened === true && folded.seenAfter === true, JSON.stringify(folded));
  const aiHosts2 = [...hosts.keys()].filter((h) => /googleapis|firebase|recaptcha/.test(h));
  check('the request went to Firebase AI Logic', aiHosts2.some((h) => /firebasevertexai\.googleapis\.com/.test(h)), aiHosts2.join(', '));
  // the one number: what the app handed to the cloud step, counted on the same request "What was sent" shows
  const bytes2 = await js(`(() => { const pre = document.querySelector('#sent pre')?.textContent ?? ''; let n = -1; try { n = new TextEncoder().encode(JSON.stringify(JSON.parse(pre))).length; } catch { /* no payload */ }
    return { text: document.querySelector('#bytes')?.innerText.replace(/\\s+/g, ' ') ?? '', counted: n }; })()`);
  check('after the cloud answered the number is the size of that request, and it is called "handed to cloud help", not "0 bytes left"',
    bytes2.counted > 0 && bytes2.text.startsWith(`${bytes2.counted.toLocaleString('en-US')} bytes handed to cloud help`) && !/^0 bytes/.test(bytes2.text), `${bytes2.text.slice(0, 90)} (request counted by hand: ${bytes2.counted} bytes)`);
  await shot('02-cloud-card');

  // 2b. a third choice the model gave is not dropped at two a card: it is on the next page (only when the model gave three)
  const moreBtn = await js(`document.querySelector('[data-act="next"]')?.innerText ?? ''`);
  if (/more choices/.test(moreBtn)) {
    await js(`document.querySelector('[data-act="next"]').click()`); await sleep(500);
    const tilesNext = await js(`[...document.querySelectorAll('#person .tile span')].map(e => e.innerText)`);
    check('a third choice from the model is on the next page, with the way out', (tilesNext?.length ?? 0) === 2 && !tiles2.slice(0, 2).includes(tilesNext[0]), JSON.stringify(tilesNext));
  } else console.log(`next page: not offered on this run (the model gave ${Math.max(0, (tiles2?.length ?? 1) - 1)} choices)`);

  // 3. "who to call" with cloud help only: the cloud gets the bare question; code puts in the people About me names
  consoleLines.length = 0;
  await js(`document.querySelector('.chip[data-q="Who should we call tonight?"]').click()`);
  await sleep(300);
  await waitFor(`document.querySelector('#make') && !document.querySelector('#make').disabled && !!document.querySelector('#result .badge')`, 60000);
  const tiles3 = await js(`[...document.querySelectorAll('#person .tile span')].map(e => e.innerText)`);
  const payload3 = await js(`document.querySelector('#sent pre')?.textContent ?? ''`);
  const why3 = await js(`document.querySelector('#result .why p')?.innerText ?? ''`);
  const report3 = consoleLines.filter((l) => l.startsWith('[ai-logic]'));
  console.log(`who to call -> tiles ${JSON.stringify(tiles3)}\nwhy: ${why3}\nSDK report: ${report3.join(' | ')}`);
  // the model's answer varies between runs ("family, friend" or "family, friend, doctor"): a specific role may keep a
  // place, a general word may not, and at least one person from About me is on the card
  check('"who to call" with cloud help only: no general word, at least one person About me names, "someone else" as the way out',
    (tiles3 ?? []).some((t) => ['Jenny', 'Tyler'].includes(t)) && !(tiles3 ?? []).some((t) => /^(?:family|friends?|someone|relatives?)$/i.test(t)) && !(tiles3 ?? []).includes('Carol') && tiles3?.at(-1) === 'someone else', JSON.stringify(tiles3));
  check('the cloud answered it (inferenceSource=in_cloud) and got the bare question: no name in the request', report3.length === 1 && /inferenceSource=in_cloud/.test(report3[0]) && /Partner asks: Who should we call tonight\?/.test(payload3) && !/Jenny|Tyler|Carol|Frank/.test(payload3), payload3.match(/Partner asks:[^"]*/)?.[0] ?? '');
  await shot('03-cloud-who-to-call');

  console.log(`hosts contacted during the cloud card: ${[...hosts.entries()].map(([h, n]) => `${h}×${n}`).join(', ')}`);
  // never echo tokens: the SDK prints the App Check debug token in debug mode
  const redact = (l) => l.replace(/[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}/gi, '[token]').replace(/AIza[\w-]{30,}/g, '[key]');
  const errs = consoleLines.filter((l) => /error|denied|403|failed/i.test(l)).map(redact);
  if (errs.length) console.log(`console: ${errs.slice(0, 5).join(' | ')}`);
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
