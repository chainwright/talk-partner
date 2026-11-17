// End-to-end check of a copy with NO project settings (what a judge gets from a bare clone, no .env.local).
// Starts its own dev server with the Firebase settings forced empty, opens judge mode in a headless Chrome with a
// throwaway profile, clicks the one-tap questions and checks that every rules-only card appears, that an open
// question gets an honest "No card", and that the page contacts no host but its own. Since 17 Nov it also presses the
// microphone (the notice only; nothing listens) and, with the network switched off in the browser, runs the quick-needs
// board from the first tap to the partner's line.
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
  // judge mode on a copy with no settings: the recording of the on-device step is one link away, labelled, and nothing is contacted for it
  await js(`document.querySelector('[data-act="recorded"]')?.click()`); await sleep(200);
  const rec = await js(`document.querySelector('#recorded .recorded')?.innerText.replace(/\\s+/g, ' ') ?? ''`);
  check('the recording of the on-device step opens from its link and is labelled as a recording; no cloud step is offered on this copy', /^recording Recorded on our machine on 17 Nov 2026/i.test(rec) && /Not made in this browser/.test(rec) && /inferenceSource=on_device/.test(rec) && /no project settings, so the cloud step cannot run here either/.test(rec) && !(await js(`!!document.querySelector('#recorded a[href="#/cloud"]')`)), rec.slice(0, 120));

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

  // Typed questions (not chips), one per class the rehearsal of 16 Nov found: all read in code, so they work here too.
  const type = async (q) => { await js(`(() => { const i = document.querySelector('#q'); i.value = ${JSON.stringify(q)}; i.dispatchEvent(new Event('input', { bubbles: true })); document.querySelector('#ask').requestSubmit(); })()`); await sleep(150); await settled(); };
  const act = (a) => js(`!!document.querySelector('#result [data-act="${a}"]')`);
  await type('What time is the dentist on Thursday? Shall I come in with you?');
  const firstHalf = { badge: await badge(), coach: await js(`document.querySelector('.coach')?.innerText ?? ''`), next: await js(`document.querySelector('#result [data-act="next"]')?.innerText ?? ''`) };
  await js(`document.querySelector('#result [data-act="next"]')?.click()`); await sleep(150); await settled();
  const secondHalf = { tiles: await tiles(), say: await js(`document.querySelector('#result .say')?.innerText ?? ''`) };
  check('two questions, the first with no card: "Next: second question" is there and shows the second',
    firstHalf.badge === 'No card' && /tell, don't test/.test(firstHalf.coach) && firstHalf.next === 'Next: second question' && JSON.stringify(secondHalf.tiles) === JSON.stringify(['yes', 'no', 'not sure']) && secondHalf.say.startsWith('Shall I come in with you?'),
    JSON.stringify({ firstHalf, secondHalf }));
  await type('Porridge, toast, or a boiled egg this morning?');
  const three = await tiles();
  check('three options named in the question are three tiles, and "No AI needed"', JSON.stringify(three) === JSON.stringify(['porridge', 'toast', 'boiled egg', 'something else']) && (await badge()) === 'No AI needed' && !(await act('next')), JSON.stringify(three));
  await shot('noconfig-03-three-options');
  await type("You don't want the lamp on, do you?");
  const neg = { tiles: await tiles(), say: await js(`document.querySelector('#result .say')?.innerText ?? ''`), coach: await js(`document.querySelector('.coach')?.innerText ?? ''`), headline: await js(`document.querySelector('#person .headline')?.innerText ?? ''`) };
  check('a negative question is asked the plain way: the line to say and the headline have no "don\'t", and the partner is told',
    JSON.stringify(neg.tiles) === JSON.stringify(['yes', 'no', 'not sure']) && neg.say.startsWith('Do you want the lamp on?') && !/don't|not\b(?! sure)/i.test(neg.say + neg.headline) && /plain way/.test(neg.coach), JSON.stringify(neg));

  // the one number under the chips, after every card of this run: nothing was handed to any cloud step, and (next check) no other host was contacted
  const bytes = await js(`document.querySelector('#bytes')?.innerText.replace(/\\s+/g, ' ') ?? ''`);
  check('the number under the chips reads "0 bytes left this computer" after every card of this run', /^0 bytes left this computer \d+ cards this session · page load not counted/.test(bytes), bytes);

  // 17 Nov: voice input for the partner's question. The button is there where the browser has speech recognition;
  // nothing listens until the notice has been read and agreed to, and this run never agrees (no sound is used here).
  const mic = await js(`(() => { const m = document.querySelector('#mic'), mk = document.querySelector('#make'), q = document.querySelector('#q'); if (!m) return { has: false, api: !!(window.SpeechRecognition || window.webkitSpeechRecognition) };
    const before = document.querySelector('#voice').hidden, between = q.getBoundingClientRect().right <= m.getBoundingClientRect().left && m.getBoundingClientRect().right <= mk.getBoundingClientRect().left; m.click(); const v = document.querySelector('#voice');
    const r = { has: true, api: !!(window.SpeechRecognition || window.webkitSpeechRecognition), between, before, shown: !v.hidden, text: v.innerText.replace(/\\s+/g, ' '), pressed: document.querySelector('#mic').getAttribute('aria-pressed'), field: q.value };
    document.querySelector('[data-act="voice-no"]').click(); r.after = document.querySelector('#voice').hidden; return r; })()`);
  check('the microphone sits between the question field and "Make card"; its first press only shows where spoken words go (the browser, in Chrome possibly Google), and nothing listens',
    mic.has && mic.api && mic.between && mic.before === true && mic.shown && /your browser's speech recognition/.test(mic.text) && /In Chrome, your speech may be sent to Google/.test(mic.text) && /their speech is never recognised/.test(mic.text) && mic.pressed === 'false' && mic.after === true, JSON.stringify(mic));

  // 17 Nov: the quick-needs board, with the network switched off in the browser first: one tap from the partner
  // screen, nine tiles (each a picture and its word), the tick / cross check, the partner's line, the way out, and
  // "pain" leading on to the body card. Everything from here on runs offline.
  await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  const offline = await js(`fetch('/?offline-probe=' + Date.now()).then(() => false, () => true)`);
  check('the network is off for the rest of this run (a request to the app\'s own host fails)', offline === true && (await js('navigator.onLine')) === false, `fetch failed: ${offline}`);
  const made0 = Number((await js(`document.querySelector('#bytes')?.innerText ?? ''`)).match(/(\d+) cards? this session/)?.[1] ?? -1);
  await js(`document.querySelector('[data-act="needs"]').click()`);
  await waitFor(`!!document.querySelector('.person.full .tiles.needs')`, 4000); await sleep(400);
  const board = await js(`(() => { const t = [...document.querySelectorAll('#person .tile')]; const r = t.map((x) => x.getBoundingClientRect());
    return { hash: location.hash, headline: document.querySelector('#person .headline')?.innerText ?? '', words: t.map((x) => x.querySelector('span')?.innerText ?? ''), pictures: t.filter((x) => x.querySelector('svg[role="img"]')).length,
      smallest: Math.round(Math.min(...r.map((b) => Math.min(b.width, b.height)))), lowest: Math.round(Math.max(...r.map((b) => b.bottom))), screen: innerHeight, wide: document.documentElement.scrollWidth <= innerWidth, images: document.querySelectorAll('#person img').length,
      other: [...document.querySelectorAll('#person *')].filter((e) => !e.closest('.tile') && !e.closest('#exit') && e.children.length === 0 && e.innerText?.trim()).map((e) => e.innerText) }; })()`);
  check('offline: "Quick needs" opens the board full screen in one tap: nine tiles, each a picture and its word, every target at least 64 px, all on one screen, nothing else on it but the keyword',
    board.hash === '#/needs' && board.headline === 'I need' && JSON.stringify(board.words) === JSON.stringify(['toilet', 'drink', 'food', 'pain', 'tired', 'too hot', 'too cold', 'call someone', 'something else']) && board.pictures === 9 && board.images === 0 && board.smallest >= 64 && board.lowest <= board.screen && board.wide && JSON.stringify(board.other) === JSON.stringify(['I need']), JSON.stringify(board));
  await shot('noconfig-04-needs-board-offline');
  const tap = async (i) => { await js(`document.querySelector('#person .tile[data-i="${i}"]').click()`); await waitFor(`!!document.querySelector('#person [data-confirm="yes"]')`, 3000); await sleep(200); };
  const verify = () => js(`({ headline: document.querySelector('#person .headline')?.innerText ?? '', word: document.querySelector('#person .confirm-pic p')?.innerText ?? '', picture: !!document.querySelector('#person .confirm-pic svg'), yes: document.querySelector('[data-confirm="yes"]')?.innerText ?? '', tick: !!document.querySelector('[data-confirm="yes"] svg'), change: document.querySelector('[data-confirm="change"]')?.innerText ?? '', cross: !!document.querySelector('[data-confirm="change"] svg') })`);
  await tap(0);
  const v1 = await verify();
  check('offline: a tap on "toilet" asks "So: toilet. Right?" with the picture, the word, a tick and a cross', v1.headline === 'So: toilet. Right?' && v1.word === 'toilet' && v1.picture && v1.yes === 'yes' && v1.tick && v1.change === 'change' && v1.cross, JSON.stringify(v1));
  await shot('noconfig-05-needs-check');
  // the cross goes back to the board, nothing chosen; then "drink" and the tick
  await js(`document.querySelector('[data-confirm="change"]').click()`); await sleep(300);
  const backToBoard = await js(`document.querySelectorAll('#person .tiles.needs .tile').length`);
  await tap(1);
  await js(`document.querySelector('[data-confirm="yes"]').click()`); await sleep(300);
  const done = await js(`({ person: document.querySelector('#person').innerText.replace(/\\s+/g, ' ').trim(), picture: !!document.querySelector('#person .answered svg') })`);
  check('offline: the cross returns to the board; after the tick the person\'s screen shows the need (picture and word) and no coaching, praise or score',
    backToBoard === 9 && done.picture && done.person === 'I need drink', JSON.stringify({ backToBoard, ...done }));
  // the partner's side (the press-and-hold exit leads here): the line for the partner, the badge, and nothing of it on the card pane
  await js(`location.hash = '#/demo'`); await waitFor(`!!document.querySelector('#result .need-line')`, 3000); await sleep(200);
  const side = await js(`({ done: document.querySelector('#result .done')?.innerText ?? '', line: document.querySelector('#result .need-line')?.innerText ?? '', badge: document.querySelector('#result .badge')?.innerText ?? '', tail: document.querySelector('#result .badge-line .tail')?.innerText ?? '', pane: document.querySelector('#person').innerText.replace(/\\s+/g, ' ').trim(), acts: [...document.querySelectorAll('#result .actions button')].map((b) => b.innerText) })`);
  check('offline: the partner\'s side says what was chosen and gives one short line for it ("Hold up two real drinks and let them point."), badge "No AI needed", nothing left; the card pane holds no such line',
    side.done === 'Chose "drink" and confirmed it.' && side.line === 'Hold up two real drinks and let them point.' && side.badge === 'No AI needed' && /nothing left this computer/.test(side.tail) && side.pane === 'I need drink' && side.acts.includes("We're stuck"), JSON.stringify(side));
  await shot('noconfig-06-needs-partner-side');
  // "pain" leads on to the body card (made in code, so it is there offline too)
  await js(`document.querySelector('[data-act="needs"]').click()`); await waitFor(`!!document.querySelector('.person.full .tiles.needs')`, 4000); await sleep(300);
  await tap(3); await js(`document.querySelector('[data-confirm="yes"]').click()`); await sleep(300);
  await js(`location.hash = '#/demo'`); await waitFor(`!!document.querySelector('#result .need-line')`, 3000); await sleep(200);
  const pain = { line: await js(`document.querySelector('#result .need-line')?.innerText ?? ''`), safety: await js(`document.querySelector('#result .safety')?.innerText ?? ''`) };
  await js(`document.querySelector('#result .chip[data-q="Where does it hurt?"]').click()`); await sleep(150); await settled();
  const body = { tiles: await tiles(), badge: await badge(), kind: await js(`document.querySelector('#person').dataset.kind`) };
  check('offline: after "pain" the partner is one tap from "Where does it hurt?", and the body card is made with no network',
    /where it hurts/i.test(pain.line) && /Not for emergencies/.test(pain.safety) && body.kind === 'body' && body.badge === 'No AI needed' && (body.tiles?.length ?? 0) >= 3, JSON.stringify({ pain, body }));
  // the way out: "something else" is checked like any choice and sends the partner back to the question box
  await js(`document.querySelector('[data-act="needs"]').click()`); await waitFor(`!!document.querySelector('.person.full .tiles.needs')`, 4000); await sleep(300);
  await tap(8);
  const v2 = await verify();
  await js(`document.querySelector('[data-confirm="yes"]').click()`); await sleep(300);
  await js(`location.hash = '#/demo'`); await waitFor(`!!document.querySelector('#result .need-line')`, 3000); await sleep(200);
  const out = await js(`({ done: document.querySelector('#result .done')?.innerText ?? '', line: document.querySelector('#result .need-line')?.innerText ?? '', field: !!document.querySelector('#q') && !document.querySelector('#q').disabled, stuck: !!document.querySelector('#result [data-act="stuck"]') })`);
  check('offline: "something else" gets the same check, then hands back to the question box and "We\'re stuck"',
    v2.headline === 'So: something else. Right?' && out.done === 'They chose "something else".' && /question box/.test(out.line) && out.field && out.stuck, JSON.stringify({ v2: v2.headline, ...out }));
  const made1 = await js(`document.querySelector('#bytes')?.innerText.replace(/\\s+/g, ' ') ?? ''`);
  check('offline: the boards and the body card are counted like every card made in code, and the number still reads "0 bytes left this computer"',
    new RegExp(`^0 bytes left this computer ${made0 + 4} cards this session`).test(made1), `${made0} cards before, then: ${made1}`);

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
