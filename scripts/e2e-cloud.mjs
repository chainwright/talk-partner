// End-to-end check of the CLOUD step against the REAL Firebase AI Logic project (no stand-in model).
// Launches its own headless Chrome with a throwaway profile (so no Gemini Nano), opens judge mode on the dev server,
// and makes cards:
//   1. "Do you want coffee or tea?"  -> code card, nothing sent
//   2. cloud help turned on through the consent screen, then an open question with a name in it -> the stripped leg
//      (PREFER_IN_CLOUD) answers; badge from inferenceSource; "What was sent" holds "Person A", not the name
//   and around it, Firebase Remote Config (added 16 Nov 2026): not asked while cloud help is off; with its hosts
//   blocked the defaults in the code run and a card is made at once; unblocked, "How this works" shows the three
//   values as "from Remote Config", and the settings request holds no question and no About-me word
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
  const settingsBodies = [];
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
    if (m.method === 'Network.requestWillBeSent') {
      const h = new URL(m.params.request.url).host || m.params.request.url.slice(0, 20);
      hosts.set(h, (hosts.get(h) ?? 0) + 1);
      if (/remoteconfig|installations/.test(h)) settingsBodies.push(`${m.params.request.url.replace(/key=[^&]+/, 'key=[key]')} ${m.params.request.postData ?? ''}`);
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
  // judge mode's first step needs the on-device model. This browser has none: the status line must say so plainly
  // (once the check stands, a few seconds) and the first card, made in code, must stay as it is.
  await waitFor(`/Gemini Nano (?:in this browser|is not downloaded)/.test(document.querySelector('#status').innerText)`, 12000);
  const noNano = await js(`({ status: document.querySelector('#status').innerText, tiles: [...document.querySelectorAll('#person .tile span')].map(e => e.innerText), badge: document.querySelector('#result .badge')?.innerText ?? '', lit: document.querySelector('.chip.on')?.dataset.q ?? '' })`);
  console.log(`status line once the check stands: ${noNano.status}`);
  check('no on-device model in this browser: the status line says so plainly, and the first card (made in code) stays',
    // (a browser that could run the model but has not downloaded it says that instead: a throwaway profile on a capable machine)
    /(?:No Gemini Nano in this browser, so the on-device step can't run here|Gemini Nano is not downloaded in this browser, so the on-device step can't run yet)\. The card shown is made in code\./.test(noNano.status) && JSON.stringify(noNano.tiles) === JSON.stringify(['coffee', 'tea', 'something else']) && noNano.badge === 'No AI needed' && noNano.lit === 'Do you want coffee or tea?', JSON.stringify(noNano));

  // the recording of the on-device step (judge mode, no on-device model here): one link under the status line; behind
  // it a card labelled as a recording, with its date and the SDK's report. Opening it makes no card, contacts no
  // host and leaves cloud help off: the cloud step still needs the consent screen.
  const recLink = await js(`document.querySelector('[data-act="recorded"]')?.innerText ?? ''`);
  await js(`document.querySelector('[data-act="recorded"]')?.click()`); await sleep(300);
  const rec = await js(`({ text: document.querySelector('#recorded .recorded')?.innerText.replace(/\\s+/g, ' ') ?? '', tag: document.querySelector('#recorded .rec-tag')?.innerText ?? '', tiles: [...document.querySelectorAll('#recorded .rec-tiles span')].map(e => e.innerText),
    consent: document.querySelector('#recorded a[href="#/cloud"]')?.innerText ?? '', nav: [...document.querySelectorAll('header nav a')].map((a) => a.innerText).find((t) => t.startsWith('Cloud help')),
    card: [...document.querySelectorAll('#person .tile span')].map(e => e.innerText), badge: document.querySelector('#result .badge')?.innerText ?? '', bytes: document.querySelector('#bytes')?.innerText.replace(/\\s+/g, ' ') ?? '' })`);
  console.log(`recording: ${rec.text}`);
  check('no on-device model here: the link "See what the on-device step makes" opens a card labelled as a recording, with its date, commit and inferenceSource=on_device',
    recLink === 'See what the on-device step makes →' && /^recording$/i.test(rec.tag) && /Recorded on our machine on 17 Nov 2026 \(UTC\), at commit 8ace9f0/.test(rec.text) && /Not made in this browser/.test(rec.text) && /inferenceSource=on_device/.test(rec.text) && JSON.stringify(rec.tiles) === JSON.stringify(['lake', 'church', 'something else']), `${recLink} · ${rec.tag} · ${rec.tiles.join(' / ')}`);
  check('opening the recording made no card and left cloud help off: the first card stays, 0 bytes, and the cloud step is offered through the consent screen only',
    rec.nav === 'Cloud help: off' && JSON.stringify(rec.card) === JSON.stringify(['coffee', 'tea', 'something else']) && rec.badge === 'No AI needed' && /^0 bytes left this computer 1 card this session/.test(rec.bytes) && /read and turn on/.test(rec.consent), `${rec.nav} · ${rec.card.join(' / ')} · ${rec.bytes.slice(0, 48)} · link: ${rec.consent}`);
  await shot('00-recording-of-the-on-device-step');

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

  // Remote Config, part 1: with cloud help off it is not asked, and "How this works" says so with the defaults
  const settings = () => js(`(() => { const s = document.querySelector('#settings'); return s ? { status: s.dataset.status, text: s.querySelector('p')?.innerText ?? '', rows: [...s.querySelectorAll('tr[data-setting]')].map((r) => ({ key: r.dataset.setting, from: r.dataset.from, value: r.querySelector('b')?.innerText ?? '' })) } : null; })()`);
  const DEFAULTS = { cloud_text_model: 'gemini-3.5-flash-lite', route_mood_words: '2', route_min_choices: '2' };
  const allFrom = (s, from) => !!s && s.rows.length === 3 && s.rows.every((r) => r.from === from);
  const areDefaults = (s) => !!s && s.rows.every((r) => DEFAULTS[r.key] === r.value);
  await js(`location.hash = '#/how'`); await sleep(500);
  const off = await settings();
  check('Remote Config is not asked while cloud help is off: "How this works" shows the three defaults in the code, and no settings host was contacted',
    off?.status === 'off' && allFrom(off, 'default') && areDefaults(off) && settingsBodies.length === 0, JSON.stringify(off?.rows));

  // Remote Config, part 2: its hosts blocked (as when offline). Turning cloud help on must not hold anything up.
  await send('Network.setBlockedURLs', { urls: ['*firebaseremoteconfig*', '*firebaseinstallations*'] });
  await js(`location.hash = '#/cloud'`); await sleep(500);
  await js(`document.querySelector('#consent').click()`); await sleep(300);
  await js(`document.querySelector('[data-act="cloud-on"]').click()`); await sleep(100);
  await js(`location.hash = '#/demo'`); await sleep(300);
  const tCard = Date.now();
  await js(`document.querySelector('.chip[data-q="Do you need the toilet?"]').click()`);
  await waitFor(`document.querySelectorAll('#person .tile').length === 3 && document.querySelector('#result .badge')?.innerText === 'No AI needed'`, 5000);
  const cardMs = Date.now() - tCard;
  const cardTiles = await js(`[...document.querySelectorAll('#person .tile span')].map(e => e.innerText)`);
  await js(`location.hash = '#/how'`);
  await waitFor(`['failed', 'fetched'].includes(document.querySelector('#settings')?.dataset.status)`, 15000);
  const blocked = await settings();
  check('Remote Config unreachable: a card is made at once all the same, and the defaults in the code are in use',
    JSON.stringify(cardTiles) === JSON.stringify(['yes', 'no', 'not sure']) && cardMs < 3000 && blocked?.status === 'failed' && allFrom(blocked, 'default') && areDefaults(blocked), `card in ${cardMs} ms; ${blocked?.status}: ${blocked?.text}`);
  await send('Network.setBlockedURLs', { urls: [] });

  // Remote Config, part 3: reachable. The page is loaded again (cloud help is remembered), so it is asked at load.
  settingsBodies.length = 0;
  await send('Page.navigate', { url: `${URL_}#/how` }); await sleep(300);
  await send('Page.reload'); await sleep(800);
  await waitFor(`['failed', 'fetched'].includes(document.querySelector('#settings')?.dataset.status)`, 20000);
  const fetched = await settings();
  console.log(`Remote Config: ${fetched?.text} ${JSON.stringify(fetched?.rows)}`);
  check('Remote Config answered: "How this works" shows the cloud model and both routing thresholds as "from Remote Config"', fetched?.status === 'fetched' && allFrom(fetched, 'remote'), JSON.stringify(fetched));
  const body = settingsBodies.join(' ');
  check('the settings request went to Firebase Remote Config and holds no question and no About-me word',
    settingsBodies.some((b) => /firebaseremoteconfig\.googleapis\.com/.test(b)) && !/Partner asks|Jenny|Tyler|Carol|Frank|lake|church|pot roast|chili|Wheel|Packers|Johnny/i.test(body), `${settingsBodies.length} requests, ${body.length} characters`);
  await js(`location.hash = '#/demo'`); await sleep(800);
  await waitFor(`!!document.querySelector('.chip')`);
  const cloudNav = await js(`[...document.querySelectorAll('header nav a')].map((a) => a.innerText).find((t) => t.startsWith('Cloud help'))`);
  check('cloud help turned on through the consent screen', cloudNav === 'Cloud help: on', cloudNav);
  const bytesOn = await js(`document.querySelector('#bytes')?.innerText.replace(/\\s+/g, ' ') ?? ''`);
  check('with cloud help on and no cloud card yet, the number says "0 bytes of any question left this computer" and names the settings request as not counted', /^0 bytes of any question left this computer/.test(bytesOn) && /settings request/.test(bytesOn), bytesOn);
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
  // judge mode, a card after the first: the panels are folded behind one summary line, and one click opens all three
  const fold = await js(`(() => { const m = document.querySelector('#result #made'); if (!m) return null; const all = (f) => ['.why', '.trace', '#sent'].every((s) => f(m.querySelector(s)));
    const r = { open: m.open, line: m.querySelector('summary').innerText, hidden: all((e) => !!e && !e.checkVisibility()), receiptOpen: document.querySelector('.receipt')?.open };
    m.querySelector('summary').click(); r.after = m.open && all((e) => !!e && e.checkVisibility()); return r; })()`);
  check('judge mode, a card after the first: why / where each step ran / what was sent are behind one summary line, the receipt is closed, and one click opens all three',
    !!fold && fold.open === false && fold.hidden && fold.receiptOpen === false && fold.after === true && /^How this card was made: .+ · \d+ kept, \d+ added, \d+ dropped by a rule\./.test(fold.line), JSON.stringify(fold));
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
  // the model the request names is the one "How this works" shows as in use (from Remote Config on this run)
  const modelSent = (() => { try { return JSON.parse(payload).model; } catch { return ''; } })();
  check('the cloud request names the model Remote Config gave', !!modelSent && modelSent === fetched?.rows.find((r) => r.key === 'cloud_text_model')?.value, modelSent);
  // the one number: what the app handed to the cloud step, counted on the same request "What was sent" shows
  const bytes2 = await js(`(() => { const pre = document.querySelector('#sent pre')?.textContent ?? ''; let n = -1; try { n = new TextEncoder().encode(JSON.stringify(JSON.parse(pre))).length; } catch { /* no payload */ }
    return { text: document.querySelector('#bytes')?.innerText.replace(/\\s+/g, ' ') ?? '', counted: n, mint: document.querySelector('#bytes').classList.contains('none') }; })()`);
  check('after the cloud answered the number is the size of that request, and it is called "handed to cloud help", not "0 bytes left"',
    bytes2.counted > 0 && !bytes2.mint && bytes2.text.startsWith(`${bytes2.counted.toLocaleString('en-US')} bytes handed to cloud help`) && !/^0 bytes/.test(bytes2.text), `${bytes2.text.slice(0, 90)} (request counted by hand: ${bytes2.counted} bytes)`);
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
  await js(`(() => { const m = document.querySelector('#made'); if (m) m.open = true; return true; })()`);
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
