// End-to-end run of the ON-DEVICE leg against the real SDK and the real model (no stand-in):
// Firebase AI Logic `ONLY_ON_DEVICE` with Gemini Nano in Chrome, the family's About-me lists in the prompt.
// It needs a desktop Chrome that already has Gemini Nano, started with a remote debugging port and its own profile:
//
//   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --remote-debugging-port=9335 \
//       --user-data-dir=/path/to/a/profile/with/the/model --no-first-run about:blank
//   npm run dev                                        (in another shell)
//   node scripts/e2e-ondevice.mjs --port 9335 [--url http://localhost:5179/] [--out devlog/ondevice_proof_1]
//
// What it records (the log is written to <out>/RUN_LOG.md, screenshots next to it):
//   1. page load: which hosts were contacted (must be the app's own only);
//   2. open questions with cloud help OFF: the private step answers, the SDK reports `inferenceSource=on_device`,
//      the card offers About-me names and places, and no host but the app's is contacted;
//   3. cloud help ON: an all-About-me card still stays on this computer; a weak card goes to the cloud with the
//      question only (`inferenceSource=in_cloud`);
//   4. network OFF: the question-only step falls back to the device (`PREFER_IN_CLOUD` -> `inferenceSource=on_device`);
//   5. the same questions in a Chrome WITHOUT the model (a throwaway profile), cloud help on: what the cloud alone
//      offers (general choices, where section 2 gave the family's own), and a name in a question swapped for
//      "Person A" before it is sent.
// Every source in the log is the SDK's own `inferenceSource`, printed by the engine as `[ai-logic] …` console lines.
// Exit code 0 only if every check passes.
import { spawn, execSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const PORT = Number(arg('--port', '0'));
const URL_ = arg('--url', 'http://localhost:5179/');
const OUT = arg('--out', 'devlog/ondevice_proof_1');
const CHROME = process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const APP_HOST = new URL(URL_).host;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const git = (c) => { try { return execSync(`git ${c}`).toString().trim(); } catch { return 'unknown'; } };
if (!PORT) { console.error('usage: node scripts/e2e-ondevice.mjs --port <remote debugging port of a Chrome that has Gemini Nano>'); process.exit(2); }

mkdirSync(OUT, { recursive: true });
const lines = [];
const log = (s = '') => { lines.push(s); console.log(s); };
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok }); log(`- ${ok ? 'PASS' : '**FAIL**'}  ${name}${detail ? `  (${detail})` : ''}`); };
// never echo tokens or keys: the SDK prints the App Check debug token in debug mode
const redact = (l) => l.replace(/[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}/gi, '[token]').replace(/AIza[\w-]{30,}/g, '[key]').replace(/\b1:\d{6,}:web:[0-9a-f]+/g, '[app-id]');

/** One CDP session on the first page of a Chrome, with the network and console recorded. */
async function attach(port) {
  let wsUrl;
  for (let i = 0; i < 50 && !wsUrl; i++) {
    try { wsUrl = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page')?.webSocketDebuggerUrl; } catch { /* not up yet */ }
    if (!wsUrl) await sleep(200);
  }
  if (!wsUrl) throw new Error(`no Chrome page on port ${port}`);
  const ws = new WebSocket(wsUrl);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  let id = 0;
  const pending = new Map();
  const s = { reqs: [], failed: new Set(), console: [] };
  const byId = new Map();
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
    if (m.method === 'Network.requestWillBeSent' && /^https?:/.test(m.params.request.url)) {
      const r = { id: m.params.requestId, method: m.params.request.method, url: m.params.request.url.replace(/\?.*/, ''), host: new URL(m.params.request.url).host, failed: false };
      byId.set(r.id, r); s.reqs.push(r);
    }
    if (m.method === 'Network.loadingFailed') { const r = byId.get(m.params.requestId); if (r) r.failed = m.params.errorText || true; }
    if (m.method === 'Network.requestServedFromCache') { const r = byId.get(m.params.requestId); if (r) r.cached = true; }
    if (m.method === 'Network.responseReceived' && (m.params.response.fromDiskCache || m.params.response.fromPrefetchCache)) { const r = byId.get(m.params.requestId); if (r) r.cached = true; }
    if (m.method === 'Runtime.consoleAPICalled') s.console.push(m.params.args.map((a) => a.value ?? a.description).join(' '));
  });
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const js = async (expr) => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true, userGesture: true })).result?.result?.value;
  const waitFor = async (expr, ms = 20000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await js(expr)) return Date.now() - t0; await sleep(200); } return -1; };
  const shot = async (name, full = false) => {
    const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: full });
    writeFileSync(join(OUT, `${name}.png`), Buffer.from(r.result.data, 'base64'));
    log(`  screenshot: \`${OUT}/${name}.png\``);
  };
  await send('Network.enable'); await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  const mark = () => { s.reqs.length = 0; s.console.length = 0; };
  const outside = () => s.reqs.filter((r) => r.host !== APP_HOST);
  const aiLines = () => s.console.filter((l) => l.startsWith('[ai-logic]'));
  /** Type a question, submit, wait for the card; return what is on screen. */
  const ask = async (q) => {
    mark();
    const t0 = Date.now();
    await js(`(() => { const q = document.querySelector('#q'); q.value = ${JSON.stringify(q)}; document.querySelector('#ask').requestSubmit(); })()`);
    await sleep(300);
    await waitFor(`document.querySelector('#make') && !document.querySelector('#make').disabled`, 120000);
    const ms = Date.now() - t0;
    await sleep(1200); // let late requests show up in the log
    const v = await js(`({ badge: document.querySelector('#result .badge')?.innerText ?? '', tail: document.querySelector('#result .badge-line .tail')?.innerText ?? '',
      tiles: [...document.querySelectorAll('#person .tile span')].map((e) => e.innerText), why: document.querySelector('.why p')?.innerText ?? '',
      trace: [...document.querySelectorAll('.trace li')].map((e) => e.innerText.replace(/\\n/g, ' — ')), notes: document.querySelector('.notes')?.innerText ?? '',
      sentQuestion: (document.querySelector('#sent pre')?.textContent.match(/Partner asks:[^"\\\\]*/) ?? [''])[0], sentHead: document.querySelector('#sent p')?.innerText ?? '' })`);
    log(`\n**Asked:** "${q}"  (${ms} ms from submit to card)`);
    log(`- badge line: ${v.badge} ${v.tail}`);
    log(`- tiles on the person's card: ${v.tiles.join(' / ') || '(none)'}`);
    log(`- why: ${v.why}`);
    for (const t of v.trace) log(`- trace: ${t}`);
    if (v.notes) log(`- notes: ${v.notes.replace(/\n/g, ' | ')}`);
    log(`- what was sent: ${v.sentHead}${v.sentQuestion ? ` \`${v.sentQuestion}\`` : ''}`);
    log(`- SDK report (console): ${aiLines().map((l) => `\`${l}\``).join(', ') || '(no model call)'}`);
    const out = outside();
    log(`- requests to hosts other than ${APP_HOST}: ${out.length ? out.map((r) => `${r.method} ${r.url}${r.failed ? ` [failed: ${r.failed}]` : r.cached ? ' [from the browser cache, no network]' : ''}`).join('; ') : 'none'}`);
    return { ...v, ms, ai: aiLines(), outside: out };
  };
  const setCloud = async (on) => {
    await js(`location.hash = '#/cloud'`); await sleep(500);
    if (on) { await js(`(() => { const c = document.querySelector('#consent'); if (c && !c.checked) c.click(); })()`); await sleep(300); await js(`document.querySelector('[data-act="cloud-on"]')?.click()`); }
    else await js(`document.querySelector('[data-act="cloud-off"]')?.click()`);
    if (on) {
      // Turning cloud help on asks Firebase Remote Config for the settings (once per page load). Its requests are
      // waited for and logged here, so they are not counted against the card that is asked next.
      mark();
      await sleep(300); await js(`location.hash = '#/how'`);
      await waitFor(`['failed', 'fetched'].includes(document.querySelector('#settings')?.dataset.status)`, 20000);
      await sleep(500);
      const st = await js(`(() => { const s = document.querySelector('#settings'); return s ? { status: s.dataset.status, text: s.querySelector('p')?.innerText ?? '', rows: [...s.querySelectorAll('tr[data-setting]')].map((r) => r.dataset.setting + ' = ' + (r.querySelector('b')?.innerText ?? '') + ' (' + r.dataset.from + ')') } : null; })()`);
      settings = st;
      log(`\n**Remote Config** (asked when cloud help was turned on): ${st?.text ?? 'no panel'} ${st ? st.rows.join('; ') : ''}`);
      log(`- its requests: ${[...new Set(outside().map((r) => r.host))].join(', ') || 'none (answered from the browser\'s copy)'}`);
    }
    await sleep(300); await js(`location.hash = '#/demo'`); await sleep(600);
    return js(`[...document.querySelectorAll('header nav a')].map((a) => a.innerText).find((t) => t.startsWith('Cloud help'))`);
  };
  let settings = null;
  const offline = (off) => send('Network.emulateNetworkConditions', { offline: off, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  return { send, js, waitFor, shot, ask, setCloud, offline, mark, outside, aiLines, s, settings: () => settings, close: () => ws.close() };
}

const ABOUT = { people: ['Jenny', 'Jen', 'Tyler'], places: ['lake', 'the lake', 'church', 'hardware store'], foods: ['pot roast', 'chili'] };
const fromAbout = (tiles) => tiles.filter((t) => Object.values(ABOUT).flat().includes(t));
const ON_DEVICE = /leg=private mode=ONLY_ON_DEVICE inferenceSource=on_device/;

let throwaway = null;
let profile = null;
try {
  const version = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json();
  log(`# On-device proof run`);
  log(`\n- date: ${new Date().toISOString()}`);
  log(`- commit: \`${git('rev-parse HEAD')}\` (${git('describe --tags --always')}); working tree ${git('status --porcelain') ? 'has uncommitted changes' : 'clean'}`);
  log(`- browser: ${version.Browser}, ${version['User-Agent'].includes('Headless') ? 'headless' : 'with a window'}, attached on port ${PORT}`);
  log(`- app: ${URL_} (the dev server of this commit), judge mode, the made-up sample family (Frank; Carol asking; Jenny "Jen", Tyler; the lake, church, hardware store; pot roast, chili)`);
  log(`- SDK: firebase ${JSON.parse(execSync('cat node_modules/firebase/package.json').toString()).version}, @firebase/ai ${JSON.parse(execSync('cat node_modules/@firebase/ai/package.json').toString()).version}`);

  const c = await attach(PORT);
  // a clean start: no saved settings from an earlier run (cloud help off is the default)
  await c.send('Page.navigate', { url: `${URL_}#/demo` }); await sleep(800);
  await c.send('Storage.clearDataForOrigin', { origin: new URL(URL_).origin, storageTypes: 'indexeddb,local_storage' });
  c.mark();
  await c.send('Page.reload'); await sleep(500);
  await c.waitFor(`!!document.querySelector('.chip')`);

  log(`\n## 1. Page load`);
  const t0 = Date.now();
  const firstStatus = await c.js(`document.querySelector('#status').innerText`);
  log(`- status line right after load: "${firstStatus}"`);
  const ready = await c.waitFor(`document.querySelector('#status').innerText.startsWith('Ready on this computer')`, 120000);
  log(`- status line became "Ready on this computer." after ${ready < 0 ? 'more than 120 s' : `${Math.round((Date.now() - t0) / 100) / 10} s`} (the model is loaded into memory by one fixed warm-up sentence, no About me in it)`);
  check('the private helper is ready in this browser', ready >= 0, await c.js(`document.querySelector('#status').innerText`));
  log(`- SDK report for the warm-up: ${c.aiLines().map((l) => `\`${l}\``).join(', ') || '(none)'}`);
  const warmMs = Number((c.aiLines()[0]?.match(/ms=(\d+)/) ?? [])[1] ?? 0);
  log(`- ${warmMs > 8000 ? `this was a cold start (the browser had just been started): the warm-up took ${(warmMs / 1000).toFixed(1)} s` : `the model was already in this browser's memory (warm-up ${(warmMs / 1000).toFixed(1)} s); a cold start, right after the browser starts, takes much longer (README, "Limits, stated")`}`);
  check('loading the app and warming the model contacted no host but the app itself', c.outside().length === 0, c.outside().map((r) => r.host).join(', ') || `${c.s.reqs.length} requests, all to ${APP_HOST}`);
  const cloudNav = await c.js(`[...document.querySelectorAll('header nav a')].map((a) => a.innerText).find((t) => t.startsWith('Cloud help'))`);
  check('cloud help is off', cloudNav === 'Cloud help: off', cloudNav);

  log(`\n## 1b. Judge mode's first step, with no click`);
  log(`The first frame is a card made in code (coffee or tea). When the model is ready the app itself asks "What do you want to do this weekend?"; nothing below was clicked or typed.`);
  const tStep = Date.now();
  const stepDone = await c.waitFor(`document.querySelector('#status .step')?.dataset.step === 'done' && document.querySelector('#result .badge')?.innerText === 'On this computer'`, 60000);
  await sleep(800);
  const st = await c.js(`({ status: document.querySelector('#status').innerText, badge: document.querySelector('#result .badge')?.innerText ?? '', tail: document.querySelector('#result .badge-line .tail')?.innerText ?? '',
    tiles: [...document.querySelectorAll('#person .tile span')].map((e) => e.innerText), lit: document.querySelector('.chip.on')?.dataset.q ?? '', sentHead: document.querySelector('#sent p')?.innerText ?? '',
    trace: [...document.querySelectorAll('.trace li')].map((e) => e.innerText.replace(/\\n/g, ' — ')), bytes: document.querySelector('#bytes')?.innerText.replace(/\\s+/g, ' ') ?? '' })`);
  log(`- the card appeared ${stepDone < 0 ? 'not at all in 60 s' : `${Math.round((Date.now() - tStep) / 100) / 10} s after "Ready"`}`);
  log(`- status line: "${st.status}"`);
  log(`- badge line: ${st.badge} ${st.tail}`);
  log(`- tiles on the person's card: ${st.tiles.join(' / ') || '(none)'}; chip lit: "${st.lit}"`);
  for (const t of st.trace) log(`- trace: ${t}`);
  log(`- what was sent: ${st.sentHead}; under the chips: ${st.bytes}`);
  log(`- SDK report (console), warm-up and this card: ${c.aiLines().map((l) => `\`${l}\``).join(', ')}`);
  log(`- requests to hosts other than ${APP_HOST} since page load: ${c.outside().length ? c.outside().map((r) => r.host).join(', ') : 'none'}`);
  check('the first step ran by itself: a card for the weekend question, badge "On this computer", its chip lit', stepDone >= 0 && st.badge === 'On this computer' && st.lit === 'What do you want to do this weekend?', `${st.badge}; lit: ${st.lit}`);
  check('the SDK reported inferenceSource=on_device for it (the second on-device call of the page, after the warm-up)', c.aiLines().length === 2 && c.aiLines().every((l) => ON_DEVICE.test(l)), c.aiLines().join(' | '));
  check('its choices are the family\'s own, from About me, and the card says so', fromAbout(st.tiles).length >= 2 && /nothing left this computer/.test(st.tail) && /from About me/.test(st.tail), `${st.tiles.join(' / ')} ${st.tail}`);
  check('nothing was sent for it and no other host was contacted', c.outside().length === 0 && /Nothing sent/.test(st.sentHead) && /^0 bytes left this computer/.test(st.bytes), `${c.outside().length} outside requests; ${st.bytes.slice(0, 60)}`);
  await c.shot('00-first-step-on-device');

  log(`\n## 2. Cloud help OFF: the private step, with About me, on this computer`);
  const cases = [
    ['Who should we call tonight?', 'people'],
    ['What do you want to do this weekend?', 'places'],
    ['What would you like for dinner?', 'foods'],
    ['Where shall we go on Sunday?', 'places'],
  ];
  let n = 0;
  const onDevice = {}; // question -> the answers offered on this computer, compared in section 5 with the cloud's
  for (const [q, kind] of cases) {
    const r = await c.ask(q);
    n++;
    onDevice[q] = r.tiles.slice(0, -1);
    const mine = fromAbout(r.tiles);
    check(`"${q}": badge "On this computer"`, r.badge === 'On this computer', r.badge);
    check(`"${q}": the SDK reported inferenceSource=on_device for the private step`, r.ai.length === 1 && ON_DEVICE.test(r.ai[0]), r.ai.join(' '));
    check(`"${q}": the card offers the family's own ${kind} from About me`, mine.length >= 2 && mine.every((t) => ABOUT[kind].includes(t)), mine.join(', '));
    check(`"${q}": nothing was sent and no other host was contacted`, r.outside.length === 0 && /nothing left this computer/.test(r.tail) && /Nothing sent/.test(r.sentHead), `${r.outside.length} outside requests`);
    if (n === 1) await c.shot('01-on-device-who-to-call');
    if (n === 2) await c.shot('02-on-device-weekend');
    if (n === 1) await c.shot('01-on-device-who-to-call-full', true);
  }
  log(`\nA card that code decides alone runs no model, even here:`);
  const tea = await c.ask('Do you want coffee or tea?');
  check('"Do you want coffee or tea?": "No AI needed", no model call, instant', tea.badge === 'No AI needed' && tea.ai.length === 0 && JSON.stringify(tea.tiles) === JSON.stringify(['coffee', 'tea', 'something else']), `${tea.badge}, ${tea.ai.length} model calls`);

  log(`\n## 3. Cloud help ON: the two steps side by side`);
  const nav = await c.setCloud(true);
  check('cloud help was turned on through the consent screen', nav === 'Cloud help: on', nav);
  check('turning cloud help on asked Firebase Remote Config, and the three settings in use came from it', c.settings()?.status === 'fetched' && c.settings().rows.length === 3 && c.settings().rows.every((r) => / \(remote\)$/.test(r)), c.settings()?.rows.join('; ') ?? 'no settings panel');
  const again = await c.ask('Who should we call tonight?');
  check('an all-About-me card stays on this computer with cloud help on: the cloud is not asked', again.badge === 'On this computer' && again.outside.length === 0 && again.ai.length === 1 && ON_DEVICE.test(again.ai[0]), `${again.badge}; ${again.outside.length} outside requests`);
  await c.shot('03-cloud-on-card-stays-here');
  // "which shirt": the screen cannot know their shirts, so the device card never holds up and the cloud step is asked
  const tell = await c.ask('Which shirt for the doctor?');
  const wentToCloud = tell.ai.some((l) => /leg=stripped mode=PREFER_IN_CLOUD inferenceSource=in_cloud/.test(l));
  check('a card the device could not make well goes to the cloud step (inferenceSource=in_cloud)', wentToCloud && tell.badge === 'Cloud help (question only)', `${tell.badge}; ${tell.ai.join(' ')}`);
  check('the request went through Firebase AI Logic', tell.outside.some((r) => /firebasevertexai\.googleapis\.com/.test(r.host)), [...new Set(tell.outside.map((r) => r.host))].join(', '));
  check('what was sent is the question only', tell.sentQuestion === 'Partner asks: Which shirt for the doctor?' && /Sent for this card/.test(tell.sentHead), tell.sentQuestion);
  check('both steps ran for this card: the private step on this computer, then the question-only step in the cloud', tell.ai.length === 2 && ON_DEVICE.test(tell.ai[0]), tell.ai.join(' '));
  await c.shot('04-hybrid-device-then-cloud', true);

  log(`\n## 4. Network OFF: the question-only step falls back to this computer`);
  await c.offline(true);
  const off = await c.ask('Which shirt for the doctor?');
  const fell = off.ai.some((l) => /leg=stripped mode=PREFER_IN_CLOUD inferenceSource=on_device/.test(l));
  check('PREFER_IN_CLOUD fell back to the device: the SDK reported inferenceSource=on_device for the question-only step', fell, off.ai.join(' '));
  check('badge "Ran on this computer (offline)", and the card says nothing was sent', off.badge === 'Ran on this computer (offline)' && /nothing left this computer/.test(off.tail), `${off.badge} ${off.tail}`);
  check('every request to another host failed or was read from the browser cache (the network was off)', off.outside.every((r) => r.failed || r.cached), off.outside.map((r) => `${r.host}: ${r.failed || (r.cached ? 'cache' : 'went out')}`).join('; ') || 'no requests');
  await c.shot('05-offline-fallback', true);
  const offWho = await c.ask('Who should we call tonight?');
  check('offline, the private step works as before', offWho.badge === 'On this computer' && fromAbout(offWho.tiles).length >= 2, offWho.tiles.join(' / '));
  await c.offline(false);
  const receipt = await c.js(`[document.querySelector('#bytes')?.innerText.replace(/\\s+/g, ' ') ?? '', document.querySelector('.receipt .counted p')?.textContent ?? ''].join(' | ')`);
  const session = await c.js(`document.querySelector('details.judge summary')?.innerText ?? ''`);
  log(`\n- privacy receipt for this session: ${receipt}`);
  log(`- session line: ${session}`);
  await c.setCloud(false);
  c.close();

  log(`\n## 5. The same questions in a Chrome without the model (throwaway profile), cloud help on`);
  profile = mkdtempSync(join(tmpdir(), 'tp-nomodel-'));
  throwaway = spawn(CHROME, ['--headless=new', '--remote-debugging-port=9344', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--window-size=1280,900', 'about:blank'], { stdio: 'ignore' });
  const d = await attach(9344);
  await d.send('Page.navigate', { url: `${URL_}#/demo` });
  await d.waitFor(`!!document.querySelector('.chip')`); await sleep(1500);
  log(`- status line: "${await d.js(`document.querySelector('#status').innerText`)}"`);
  await d.setCloud(true);
  for (const q of ['What do you want to do this weekend?', 'What would you like for dinner?', 'Who should we call tonight?']) {
    const r = await d.ask(q);
    check(`without the model, "${q}" is answered by the cloud step, which has no About me`, r.badge === 'Cloud help (question only)' && r.ai.every((l) => /inferenceSource=in_cloud/.test(l)) && !/Jenny|Tyler|pot roast|chili|lake/.test(r.sentQuestion), `${r.badge}; sent: ${r.sentQuestion}`);
    if (q.startsWith('Who')) await d.shot('06-no-model-cloud-who-to-call');
    else {
      // the open questions the judge path opens on: the cloud step has never seen About me, the step on this computer has
      const cloudMine = fromAbout(r.tiles);
      log(`- same question, the two steps: on this computer ${onDevice[q].join(' / ')}; from the cloud ${r.tiles.slice(0, -1).join(' / ')}`);
      check(`"${q}": the two steps give different cards (About-me entries on this computer, none from the cloud)`, fromAbout(onDevice[q]).length >= 2 && cloudMine.length === 0, `on this computer: ${onDevice[q].join(' / ')}; cloud: ${r.tiles.slice(0, -1).join(' / ')}`);
      if (q.includes('weekend')) await d.shot('08-no-model-cloud-weekend');
    }
  }
  const named = await d.ask('What should we get Jenny for her birthday?');
  check('a name in the question is swapped before it is sent: "Person A", not "Jenny"', named.badge === 'Cloud help (question only)' && /Person A/.test(named.sentQuestion) && !/Jenny|Jen\b/.test(named.sentQuestion) && /1 name/.test(named.tail), `${named.sentQuestion}; ${named.tail}`);
  await d.shot('07-no-model-cloud-person-a', true);
  d.close();
} catch (e) {
  check('run completed', false, String(e));
} finally {
  if (throwaway) { throwaway.kill('SIGTERM'); await sleep(800); }
  if (profile) rmSync(profile, { recursive: true, force: true });
}

const failed = results.filter((r) => !r.ok).length;
log(`\n## Result\n${results.length - failed}/${results.length} checks passed at commit \`${git('rev-parse HEAD')}\`.`);
writeFileSync(join(OUT, 'RUN_LOG.md'), `${lines.map(redact).join('\n')}\n`);
process.exit(failed ? 1 : 0);
