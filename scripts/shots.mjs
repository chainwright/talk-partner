// Screenshots of every screen at phone (390 × 844) and desktop (1280 × 900) widths, with layout checks:
// no horizontal scroll, and "Show to person" above the fold on the phone (build spec §5.3).
// Uses its own headless Chrome with a throwaway profile; makes only code cards (no model, no cloud call).
// Since 17 Nov it also opens the quick-needs board and runs voice input in the real page: Chrome's fake microphone
// (a test tone), the real recorder, and the model's answer scripted at the network (the request to Firebase AI Logic
// is caught before it leaves and answered here, so this run makes no cloud call and uses none of the quota).
//
// Usage: npm run dev (in another shell), then  node scripts/shots.mjs [--url http://localhost:5179/] [--out devlog/shots_day3]
// A subset: --only 03,04,05 (the flow still runs in full)
import { spawn, execSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const URL_ = arg('--url', 'http://localhost:5179/');
const OUT = arg('--out', 'devlog/shots_day3');
const ONLY = arg('--only', '') ? arg('--only', '').split(',') : null; // keep only these shot numbers (the flow still runs in full)
const PORT = 9342;
const CHROME = process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// the longest status line the app can show, read from the copy module so this check follows the wording
const COPY_SRC = readFileSync(new URL('../core/copy.ts', import.meta.url), 'utf8');
const copyLine = (key) => (new RegExp(`\\b${key}: (["'])(.*?)\\1,\\n`).exec(COPY_SRC)?.[2] ?? '').replace(/\\(['"])/g, '$1');
const LONGEST_STATUS = `${copyLine('unavailable')} ${copyLine('unavailableCloudOff')} <a href="#/cloud">Turn on cloud help</a>`;
const commit = (() => { try { return execSync('git rev-parse HEAD').toString().trim(); } catch { return 'unknown'; } })();

const profile = mkdtempSync(join(tmpdir(), 'tp-shots-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', 'about:blank'], { stdio: 'ignore' });
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
    // judge mode opens with a finished card (coffee or tea, read in code), not an empty pane, and without an entrance
    const firstCard = await js(`(() => { const p = document.querySelector('#person'); const t = [...p.querySelectorAll('.tile')]; const r = p.getBoundingClientRect();
      return { n: t.length, headline: p.querySelector('.headline')?.innerText ?? '', top: Math.round(r.top), lowest: t.length ? Math.round(Math.max(...t.map((x) => x.getBoundingClientRect().bottom))) : 0, enter: document.querySelector('#app').classList.contains('enter'), lit: document.querySelector('.chip.on')?.innerText ?? '', ear: !!p.querySelector('.listening') }; })()`);
    check(`${s} judge mode, first frame: a finished card is on screen before any click (headline, three tiles, its chip lit, no entrance)`,
      firstCard.n === 3 && firstCard.headline === 'drink' && !firstCard.ear && !firstCard.enter && firstCard.lit === 'coffee or tea?', JSON.stringify(firstCard));
    check(`${s} judge mode, first frame: ${s === 'desktop' ? 'the whole card' : "the card's top"} is in the first screen`, s === 'desktop' ? firstCard.lowest <= 800 : firstCard.top < 844, s === 'desktop' ? `lowest tile ${firstCard.lowest}px of 800` : `card top ${firstCard.top}px of 844`);
    // the same frame once the check for the on-device model has answered: in a browser without the model the status
    // line then says so in judge mode ("… the on-device step can't run … The card shown is made in code"), which is
    // longer than "Checking…"; the card must still start in the first screen
    await waitFor(`!/^Checking/.test(document.querySelector('#status').innerText.trim())`, 12000);
    const settled = await js(`(() => { const p = document.querySelector('#person'); const t = [...p.querySelectorAll('.tile')]; return { top: Math.round(p.getBoundingClientRect().top), lowest: t.length ? Math.round(Math.max(...t.map((x) => x.getBoundingClientRect().bottom))) : 0, status: document.querySelector('#status').innerText.trim() }; })()`);
    check(`${s} judge mode, first frame once the status line says there is no on-device model to show: ${s === 'desktop' ? 'the whole card' : "the card's top"} is still in the first screen`,
      /on-device step can't run/.test(settled.status) && (s === 'desktop' ? settled.lowest <= 800 : settled.top < 844), `${s === 'desktop' ? `lowest tile ${settled.lowest}px of 800` : `card top ${settled.top}px of 844`}; "${settled.status}"`);
    const num = await js(`(() => { const b = document.querySelector('#bytes'), r = b?.getBoundingClientRect(), c = document.querySelector('.receipt .counted'); return { text: b?.innerText.replace(/\\s+/g, ' ') ?? '', size: b ? parseFloat(getComputedStyle(b.querySelector('b')).fontSize) : 0, bottom: r ? Math.round(r.bottom) : -1, howOpen: c ? c.open : null, howSeen: c ? c.querySelector('p').checkVisibility() : null }; })()`);
    check(`${s} judge mode: one number at display size ("0 bytes left this computer")${s === 'desktop' ? ' in the first screen' : ''}; "How this is counted" is folded behind one link`,
      /^0 bytes left this computer/.test(num.text) && num.size >= 28 && (s !== 'desktop' || num.bottom <= 800) && num.howOpen === false && num.howSeen === false, JSON.stringify(num));
    await shot('03-judge-mode');
    await chip('Do you want coffee or tea?');
    await shot('04-partner-card-coffee-tea');
    if (s === 'phone') {
      const top = await js('document.querySelector("[data-act=show]")?.getBoundingClientRect().bottom');
      check('phone: "Show to person" above the fold (390 × 844)', top !== undefined && top <= 844, `bottom at ${Math.round(top)}px`);
      // judge mode on a phone: the person's card follows the actions, before the panels (it was at 3714 of 4216 px)
      const pc = await js(`(() => { const y = (s, k) => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect()[k] + scrollY) : -1; };
        const tiles = [...document.querySelectorAll('#person .tile')].map((t) => t.getBoundingClientRect().bottom + scrollY);
        return { card: y('#person', 'top'), headline: y('#person .headline', 'top'), tiles: Math.round(Math.max(...tiles)), n: tiles.length, actions: y('#result .actions', 'bottom'), why: y('#result #made', 'top'), page: document.documentElement.scrollHeight }; })()`);
      check('phone judge mode: the person\'s card starts in the first screen, right after the actions and before "How this card was made"', pc.n >= 2 && pc.card >= pc.actions && pc.card <= 844 && pc.tiles < pc.why, JSON.stringify(pc));
      check('phone judge mode: the whole card (headline and every tile) is within the first two screens', pc.n >= 2 && pc.tiles <= 2 * 844, `lowest tile ends at ${pc.tiles}px of ${pc.page}px`);
    }
    // full-screen person view, then a tap and the confirm step
    // "Show to person" lifts the card: a view transition on the card itself, about 250 ms, then the full-screen card
    const lifted = await js(`(async () => { const root = document.documentElement, t0 = performance.now(); document.querySelector('[data-act="show"]').click();
      let seen = false, named = '', pseudo = 0, ms = -1;
      for (let i = 0; i < 120; i++) { await new Promise((r) => requestAnimationFrame(r));
        if (root.dataset.lift === '1') { seen = true; named = getComputedStyle(document.querySelector('#person')).viewTransitionName; pseudo = Math.max(pseudo, document.getAnimations().filter((a) => (a.effect?.pseudoElement ?? '').includes('view-transition')).length); }
        else if (seen) { ms = Math.round(performance.now() - t0); break; } }
      return { seen, named, pseudo, ms, full: !!document.querySelector('.person.full'), enter: document.querySelector('#app').classList.contains('enter') }; })()`);
    check(`${s} "Show to person" lifts the card: a view transition on the card itself, over within half a second, ending on the full-screen card`,
      lifted.seen && lifted.named === 'tp-card' && lifted.pseudo > 0 && lifted.ms > 0 && lifted.ms <= 500 && lifted.full && !lifted.enter, JSON.stringify(lifted));
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
    // "Hide the choices" (the person sees the headline only)
    await chip('Do you need the toilet?');
    await click('[data-act="less"]');
    await shot('13-less-support');
    // day 5: the coaching line on a double question, "why this card" (open in judge mode), the repair card
    await chip('How was therapy today, and did you eat?');
    await shot('18-double-question-coach');
    if (s === 'phone') {
      // the tallest partner side there is (a coaching line, a two-line "say this", four actions): the person's card
      // must still start in the first screen, headline included (it started at 851 to 893 px before 16 Nov 2026)
      const dq = await js(`(() => { const y = (s) => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().top + scrollY) : -1; };
        return { card: y('#person'), headline: y('#person .headline'), coach: y('#result .coach'), status: document.querySelector('#status').innerText.length }; })()`);
      check('phone judge mode, two questions in one (coaching line): the person\'s card and its headline start above the 844 px fold', dq.coach > 0 && dq.card > 0 && dq.card <= 844 && dq.headline > 0 && dq.headline <= 844, JSON.stringify(dq));
      // the same with the longest status line the app can show (a browser that cannot run the on-device model, cloud
      // help off), put into the status element for the measurement; the next card redraws the real one
      const worst = await js(`(() => { const st = document.querySelector('#status'); const keep = st.innerHTML; st.innerHTML = ${JSON.stringify(`<span class="dot off"></span>${LONGEST_STATUS}`)};
        const y = (s) => Math.round(document.querySelector(s).getBoundingClientRect().top + scrollY); const r = { card: y('#person'), headline: y('#person .headline'), statusLines: Math.round(st.getBoundingClientRect().height) }; st.innerHTML = keep; return r; })()`);
      check('phone judge mode, the same card under the longest status line: card and headline still above the fold', worst.card <= 844 && worst.headline <= 844, JSON.stringify(worst));
    }
    // 17 Nov: under a card after the first, the panels are one summary line and the receipt is closed
    const folded2 = await js(`(() => { const m = document.querySelector('#result #made'); if (!m) return { missing: true }; const r = { open: m.open, line: m.querySelector('summary').innerText.slice(0, 40), lineHeight: Math.round(m.getBoundingClientRect().height), receiptOpen: document.querySelector('.receipt').open };
      m.open = true; document.querySelector('.receipt').open = true; return r; })()`);
    check(`${s} judge mode, a card after the first: "How this card was made" is one closed summary line and the receipt is closed`, folded2.open === false && folded2.receiptOpen === false && /^How this card was made: /.test(folded2.line ?? '') && folded2.lineHeight <= (s === 'phone' ? 150 : 90), JSON.stringify(folded2));
    // day 6: once opened, judge mode reads badge → why this card → where each step ran → privacy receipt, top to bottom
    const order = await js(`(() => { const y = (s) => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().top) : undefined; }; return ['#result .badge', '#result .why[open]', '#result details[open] .trace', '.receipt[open]'].map(y); })()`);
    check(`${s} judge mode, the fold and the receipt opened: badge → why this card → where each step ran → privacy receipt, in that order`, order.every((v, i) => v !== undefined && (i === 0 || v > order[i - 1])), order.join(' < '));
    const groups = await js('document.querySelectorAll(".chips.group").length');
    check(`${s} judge mode: the sample questions sit in groups above the card; the session line is one line under the receipt`, groups === 3 && (await js('document.querySelector(".chips.group").getBoundingClientRect().top < document.querySelector("#result .badge-line").getBoundingClientRect().top && document.querySelector(".judge").getBoundingClientRect().top > document.querySelector(".receipt").getBoundingClientRect().top && !document.querySelector(".judge").open')), `${groups} groups`);
    // the one-frame wow (field review, item ★2): the partner's question and the correction on the left, the person's card on the right
    await withFold(async (fold) => { await aboveFold('judge mode, double question', fold, true, false); await frame('23-wow-frame'); });
    await chip('Should we ring Jen or Tyler?');
    await shot('19-why-this-card');
    await click('[data-act="stuck"]');
    await waitFor('!!document.querySelector(".tiles.repair")');
    await shot('20-stuck-partner');
    // the same press under prefers-reduced-motion: no transition is started, the screen simply changes
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    const calm = await js(`(async () => { const root = document.documentElement; document.querySelector('[data-act="show"]').click(); let seen = false;
      for (let i = 0; i < 30; i++) { await new Promise((r) => requestAnimationFrame(r)); if (root.dataset.lift === '1') seen = true; }
      return { seen, full: !!document.querySelector('.person.full'), pseudo: document.getAnimations().filter((a) => (a.effect?.pseudoElement ?? '').includes('view-transition')).length }; })()`);
    check(`${s} "Show to person" under prefers-reduced-motion: no transition, the full-screen card is simply there`, !calm.seen && calm.full && calm.pseudo === 0, JSON.stringify(calm));
    await send('Emulation.setEmulatedMedia', { features: [] });
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
    // the partner's own usual questions: confirmed answers put up to three one-tap chips above the question field
    const none = await js('document.querySelectorAll(".chips.again .chip").length');
    const answer = async (q) => { await ask(q); await js('document.querySelector("#person .tile[data-i=\\"0\\"]").click()'); await sleep(400); await click('[data-confirm="yes"]'); };
    await answer('Do you need the toilet?'); await answer('Do you want coffee or tea?'); await answer('do you want coffee or tea');
    const again = await js(`(() => { const c = [...document.querySelectorAll('.chips.again .chip')]; return { chips: c.map((x) => x.innerText), titles: c.map((x) => x.title), above: c.length ? c[0].getBoundingClientRect().bottom <= document.querySelector('#q').getBoundingClientRect().top : false, wide: document.documentElement.scrollWidth }; })()`);
    check(`${s} partner screen: no chips before any answer; after three confirmed answers the two questions sit above the field, the one answered twice first`,
      none === 0 && JSON.stringify(again.chips) === JSON.stringify(['Do you want coffee or tea?', 'Do you need the toilet?']) && /^Answered 2 times/.test(again.titles[0]) && again.above && again.wide <= SIZES[s].width, JSON.stringify(again));
    await click('.chips.again .chip:nth-child(2)');
    await waitFor('!!document.querySelector("#result .badge")'); await sleep(300);
    const reasked = await js(`({ q: document.querySelector('#q').value, tiles: [...document.querySelectorAll('#person .tile span')].map((e) => e.innerText), picked: !!document.querySelector('#person .confirm-pic, #person .answered'), last: document.querySelector('#result .last')?.innerText ?? '' })`);
    check(`${s} partner screen: a tap on a chip asks that question again; the card is fresh (no choice made), and "last time" is a line for the partner only`,
      reasked.q === 'Do you need the toilet?' && reasked.tiles.length === 3 && !reasked.picked && /Last time/.test(reasked.last), JSON.stringify(reasked));
    await shot('26-asked-before');
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

    // 17 Nov: the quick-needs board. One tap from the partner screen (the top bar), full screen, one board.
    await nav('#/demo');
    await waitFor('!!document.querySelector(".chip")');
    const pill = await js(`(() => { const b = document.querySelector('.top [data-act="needs"]'); if (!b) return null; const r = b.getBoundingClientRect(); return { text: b.innerText, h: Math.round(r.height), top: Math.round(r.top + scrollY), bottom: Math.round(r.bottom + scrollY), topbar: Math.round(document.querySelector('.top').getBoundingClientRect().height) }; })()`);
    check(`${s} "Quick needs" is in the top bar of the partner screen, in the first row`, !!pill && pill.text === 'Quick needs' && pill.h >= 36 && pill.bottom <= 60, JSON.stringify(pill));
    await click('.top [data-act="needs"]');
    await waitFor('!!document.querySelector(".person.full .tiles.needs")');
    await sleep(400);
    const board = await js(`(() => { const t = [...document.querySelectorAll('#person .tile')]; const r = t.map((x) => x.getBoundingClientRect());
      return { n: t.length, words: t.filter((x) => x.querySelector('span')?.innerText.trim()).length, pictures: t.filter((x) => x.querySelector('svg[role="img"]')).length, smallest: Math.round(Math.min(...r.map((b) => Math.min(b.width, b.height)))),
        gap: Math.round(Math.min(...r.slice(1).map((b, i) => (Math.abs(b.top - r[i].top) < 2 ? b.left - r[i].right : b.top - r[i].bottom)))), lowest: Math.round(Math.max(...r.map((b) => b.bottom))), page: document.documentElement.scrollHeight,
        font: Math.min(...t.map((x) => parseFloat(getComputedStyle(x).fontSize))), clipped: t.filter((x) => x.scrollWidth > x.clientWidth + 1).map((x) => x.innerText), bg: getComputedStyle(document.querySelector('#person')).backgroundColor, ink: getComputedStyle(t[0]).color }; })()`);
    check(`${s} quick-needs board: nine tiles, each a picture and its word, all on one screen with no scrolling (${SIZES[s].height}px)`, board.n === 9 && board.words === 9 && board.pictures === 9 && board.lowest <= SIZES[s].height && board.page <= SIZES[s].height, JSON.stringify(board));
    check(`${s} quick-needs board: every target at least 64 px with space between, words at least 22 px and never clipped, dark ink on white`, board.smallest >= 64 && board.gap >= 8 && board.font >= 22 && board.clipped.length === 0 && board.bg === 'rgb(255, 255, 255)' && board.ink === 'rgb(15, 20, 26)', `smallest side ${board.smallest}px, gap ${board.gap}px, font ${board.font}px, clipped ${JSON.stringify(board.clipped)}`);
    await shot('27-needs-board');
    await js('document.querySelector("#person .tile[data-i=\\"0\\"]").click()');
    await waitFor('!!document.querySelector("#person [data-confirm=yes]")');
    await sleep(300);
    const chk = await js(`({ headline: document.querySelector('#person .headline').innerText, tick: !!document.querySelector('[data-confirm="yes"] svg'), cross: !!document.querySelector('[data-confirm="change"] svg'), h: Math.round(Math.min(...[...document.querySelectorAll('#person [data-confirm]')].map((b) => Math.min(b.getBoundingClientRect().width, b.getBoundingClientRect().height)))) })`);
    check(`${s} quick-needs board: a tap is checked with a tick and a cross ("So: toilet. Right?")`, chk.headline === 'So: toilet. Right?' && chk.tick && chk.cross && chk.h >= 64, JSON.stringify(chk));
    await shot('28-needs-check');
    await click('[data-confirm="yes"]');
    await nav('#/demo');
    await waitFor('!!document.querySelector("#result .need-line")');
    const pside = await js(`({ line: document.querySelector('#result .need-line').innerText, pane: document.querySelector('#person').innerText.replace(/\\s+/g, ' ').trim() })`);
    check(`${s} quick-needs board: the partner's line is on the partner's side only`, pside.line === 'Go now. The rest can wait.' && pside.pane === 'I need toilet', JSON.stringify(pside));
    await shot('29-needs-partner-side');

    // 17 Nov: voice input for the partner's question, in the real page. The microphone is Chrome's fake device (a test
    // tone), the recorder and the decoding are the browser's own, and the request the SDK makes is caught at the
    // network and answered here: no sound reaches Google and no cloud call is made. What this shows is the wiring:
    // the notice before the first use, the recording state and the stop, one request per recording with a WAV in it,
    // the words in the field and nothing submitted, what the lines say afterwards, a blocked microphone, no
    // connection, and a browser that cannot record. What it does not show: that speech is understood (the "answer"
    // is ours).
    const hasMic = await js(`!!document.querySelector('#mic')`);
    if (!hasMic) {
      // a copy with no project settings: no cloud step, so no voice input and no button
      const v0 = await js(`({ status: document.querySelector('#status').innerText, form: [...document.querySelector('#ask').children].map((e) => e.id) })`);
      check(`${s} voice input: this copy has no project settings, so there is no microphone button and the question form is field and button`, /no project settings|rules only/i.test(v0.status) && JSON.stringify(v0.form) === '["q","make"]', JSON.stringify(v0));
      continue;
    }
    const ai = { calls: [], appCheck: 0 };
    const cors = [{ name: 'Access-Control-Allow-Origin', value: '*' }, { name: 'Access-Control-Allow-Headers', value: '*' }, { name: 'Access-Control-Allow-Methods', value: 'POST, GET, OPTIONS' }];
    const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64');
    let answerWith = { transcript: 'do you want coffee or tea' };
    const onPaused = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.method !== 'Fetch.requestPaused') return;
      const { requestId, request } = m.params;
      if (request.method === 'OPTIONS') { void send('Fetch.fulfillRequest', { requestId, responseCode: 204, responseHeaders: cors }); return; }
      if (/firebaseappcheck\.googleapis\.com/.test(request.url)) {
        ai.appCheck++;
        void send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [...cors, { name: 'Content-Type', value: 'application/json' }], body: b64({ token: 'scripted.by.shots', ttl: '3600s' }) });
        return;
      }
      if (!/:generateContent/.test(request.url)) { void send('Fetch.failRequest', { requestId, errorReason: 'BlockedByClient' }); return; }
      ai.calls.push({ url: request.url, body: request.postData ?? '' });
      void send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [...cors, { name: 'Content-Type', value: 'application/json' }], body: b64({ candidates: [{ content: { role: 'model', parts: [{ text: JSON.stringify(answerWith) }] }, finishReason: 'STOP', index: 0 }] }) });
    };
    ws.addEventListener('message', onPaused);
    // every request to a Google API host is caught: App Check's token exchange, and the SDK's model request
    await send('Fetch.enable', { patterns: [{ urlPattern: '*.googleapis.com/*' }] });
    const errs = await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__errors = []; addEventListener('error', (e) => window.__errors.push(String(e.message))); addEventListener('unhandledrejection', (e) => window.__errors.push(String(e.reason)));` });
    await send('Page.reload'); await sleep(600);
    await nav('#/demo');
    await waitFor('!!document.querySelector(".chip")'); await sleep(300);
    const cardsMade = () => js(`Number((document.querySelector('#bytes')?.innerText ?? '').match(/(\\d+) cards? this session/)?.[1] ?? -1)`);
    const voiceNow = () => js(`({ phase: document.querySelector('#mic')?.dataset.phase, pressed: document.querySelector('#mic')?.getAttribute('aria-pressed'), label: document.querySelector('#mic')?.getAttribute('aria-label'), line: document.querySelector('#voice').innerText.replace(/\\s+/g, ' '), hidden: document.querySelector('#voice').hidden, bar: !!document.querySelector('#voice .rec-bar'), q: document.querySelector('#q').value, bytes: document.querySelector('#bytes').innerText.replace(/\\s+/g, ' ') })`);
    const v0 = await js(`({ hidden: document.querySelector('#voice').hidden, label: document.querySelector('#mic').getAttribute('aria-label'), w: Math.round(document.querySelector('#mic').getBoundingClientRect().width), h: Math.round(document.querySelector('#mic').getBoundingClientRect().height) })`);
    await click('#mic');
    const v1 = await voiceNow();
    check(`${s} voice input: a microphone button (at least 44 px) next to the question field; the first press says the recording goes to Google's cloud, and starts nothing`,
      v0.hidden && v0.label === 'Speak your question' && v0.w >= 44 && v0.h >= 44 && !v1.hidden && /sends the recording to Google's cloud/.test(v1.line) && /their speech is never recorded/.test(v1.line) && v1.phase === 'idle' && ai.calls.length === 0 && ai.appCheck === 0, JSON.stringify({ v0, v1 }));
    await shot('30-voice-notice');
    const before = await cardsMade();
    await click('[data-act="voice-ok"]');
    await waitFor(`document.querySelector('#mic')?.dataset.phase === 'recording'`, 8000);
    await sleep(1800); // the fake microphone's tone needs a moment to be in the recording
    const v2 = await voiceNow();
    check(`${s} voice input: after the yes it records (the button is lit and reads "Stop recording", the line says so, the time limit is drawn), and nothing has been sent yet`,
      v2.phase === 'recording' && v2.pressed === 'true' && v2.label === 'Stop recording' && /^Recording\. Say your question, then press the microphone again\. It stops by itself after 15 seconds\./.test(v2.line) && v2.bar && ai.calls.length === 0 && /^0 bytes left this computer/.test(v2.bytes), JSON.stringify({ v2, calls: ai.calls.length }));
    await shot('31-voice-recording');
    await click('#mic');
    await waitFor(`document.querySelector('#mic')?.dataset.phase === 'idle' && !!document.querySelector('#q').value`, 15000); await sleep(300);
    const v4 = await js(`({ q: document.querySelector('#q').value, pressed: document.querySelector('#mic').getAttribute('aria-pressed'), line: document.querySelector('#voice').innerText, busy: document.querySelector('#make').disabled, focus: document.activeElement?.id, bytes: document.querySelector('#bytes').innerText.replace(/\\s+/g, ' ') })`);
    let sentBody = {}; try { sentBody = JSON.parse(ai.calls[0]?.body ?? '{}'); } catch { /* checked below */ }
    const part = sentBody.contents?.[0]?.parts?.find((x) => x.inlineData)?.inlineData ?? {};
    const wav = Buffer.from(part.data ?? '', 'base64');
    const sentInfo = { calls: ai.calls.length, model: /models\/([^:]+):generateContent/.exec(ai.calls[0]?.url ?? '')?.[1], mime: part.mimeType, riff: wav.subarray(0, 4).toString('latin1'), rate: wav.length > 28 ? wav.readUInt32LE(24) : 0, seconds: wav.length > 44 ? +((wav.length - 44) / 32000).toFixed(1) : 0, schema: JSON.stringify(sentBody.generationConfig ?? {}).includes('transcript'), instruction: /Do not answer the question/.test(JSON.stringify(sentBody.systemInstruction ?? '')), text: JSON.stringify(sentBody.contents?.[0]?.parts?.filter((x) => x.text).map((x) => x.text)) };
    check(`${s} voice input: the second press ends the recording and one request goes to Firebase AI Logic: a 16 kHz WAV as inline data, the transcribe instruction and the transcript schema, and no word of About me`,
      sentInfo.calls === 1 && sentInfo.mime === 'audio/wav' && sentInfo.riff === 'RIFF' && sentInfo.rate === 16000 && sentInfo.seconds >= 1 && sentInfo.seconds <= 15 && sentInfo.schema && sentInfo.instruction && !/Carol|Frank|Jenny|lake|church|pot roast/.test(ai.calls[0].body), JSON.stringify(sentInfo));
    check(`${s} voice input: the words fill the field as a question and nothing is submitted (no new card; the field has the focus for changes); the session figure now counts the recording`,
      v4.q === 'Do you want coffee or tea?' && v4.pressed === 'false' && /Check the words/.test(v4.line) && !v4.busy && v4.focus === 'q' && (await cardsMade()) === before && /^[\d,]+ bytes handed to Google's cloud by this app 1 recording of a spoken question/.test(v4.bytes) && !/^0 bytes/.test(v4.bytes), JSON.stringify({ v4, before, after: await cardsMade() }));
    await js(`(() => { document.querySelector('#ask').requestSubmit(); return true; })()`);
    await waitFor(`document.querySelector('#make') && !document.querySelector('#make').disabled && !!document.querySelector('#result .badge')`); await sleep(300);
    const v5 = await js(`({ tiles: [...document.querySelectorAll('#person .tile span')].map((e) => e.innerText), tail: document.querySelector('#result .badge-line .tail').innerText, privacy: document.querySelector('#privacy').innerText, person: document.querySelector('#person').innerText })`);
    check(`${s} voice input: the card made from the spoken question is the usual one, and its line says the recording went to Google's cloud, never only "nothing left this computer"; the person's card says nothing of it`,
      JSON.stringify(v5.tiles) === JSON.stringify(['coffee', 'tea', 'something else']) && /the question was spoken: its recording went to Google's cloud to be turned into text · nothing else left this computer/.test(v5.tail) && !/· nothing left this computer/.test(v5.tail) && /Except what you spoke into the microphone/.test(v5.privacy) && !/spoken|speech|microphone|recording/i.test(v5.person) && ai.calls.length === 1, JSON.stringify(v5));
    await shot('32-voice-card');
    // a tapped question after it is not marked as spoken
    await chip('Do you need the toilet?');
    const v6 = await js(`document.querySelector('#result .badge-line .tail').innerText`);
    // the model hears no words: one plain sentence, the field untouched (the notice is not shown again: it was agreed to)
    answerWith = { transcript: '' };
    await click('#mic');
    await waitFor(`document.querySelector('#mic')?.dataset.phase === 'recording'`, 8000); await sleep(1500);
    await click('#mic');
    await waitFor(`document.querySelector('#mic')?.dataset.phase === 'idle'`, 15000); await sleep(300);
    const v7 = await voiceNow();
    check(`${s} voice input: a tapped question after it is not marked as spoken; a recording with no words in it gives one plain sentence and leaves the field alone (one more request, counted)`,
      /^· nothing left this computer/.test(v6) && /Nothing was heard/.test(v7.line) && v7.q === 'Do you need the toilet?' && ai.calls.length === 2 && /2 recordings of a spoken question/.test(v7.bytes), JSON.stringify({ v6, v7, calls: ai.calls.length }));
    // no connection: nothing is recorded, and the line says why
    await send('Network.enable');
    await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    await sleep(300);
    await click('#mic'); await sleep(400);
    const v8 = await voiceNow();
    await send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    check(`${s} voice input: with no connection nothing is recorded and the line says voice input needs one`, v8.phase === 'idle' && /Voice input needs a connection/.test(v8.line) && ai.calls.length === 2, JSON.stringify(v8));
    // the microphone blocked by the browser: a plain sentence, no exception
    await js(`(() => { navigator.mediaDevices.getUserMedia = () => Promise.reject(Object.assign(new Error('denied'), { name: 'NotAllowedError' })); return true; })()`);
    await sleep(300);
    await click('#mic'); await sleep(500);
    const v9 = await js(`({ line: document.querySelector('#voice').innerText, phase: document.querySelector('#mic').dataset.phase, errors: window.__errors })`);
    check(`${s} voice input: a blocked microphone gives one plain sentence, no error, and no request`, /The microphone is blocked for this page/.test(v9.line) && v9.phase === 'idle' && v9.errors.length === 0 && ai.calls.length === 2, JSON.stringify(v9));
    // a browser that cannot record: no button, no line, and the page works as before
    const none2 = await send('Page.addScriptToEvaluateOnNewDocument', { source: `Object.defineProperty(window, 'MediaRecorder', { value: undefined, configurable: true });` });
    await send('Page.reload'); await sleep(600);
    await nav('#/demo');
    await waitFor('!!document.querySelector(".chip")'); await sleep(300);
    await chip('Do you want coffee or tea?');
    const v10 = await js(`({ mic: !!document.querySelector('#mic'), line: document.querySelector('#voice')?.hidden, tiles: document.querySelectorAll('#person .tile').length, errors: window.__errors, form: [...document.querySelector('#ask').children].map((e) => e.id) })`);
    check(`${s} voice input: in a browser that cannot record there is no microphone button, no error, and the question form is as it was`, v10.mic === false && v10.line === true && v10.tiles === 3 && v10.errors.length === 0 && JSON.stringify(v10.form) === '["q","make"]', JSON.stringify(v10));
    await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: none2.result.identifier });
    await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: errs.result.identifier });
    await send('Fetch.disable');
    ws.removeEventListener('message', onPaused);
    await send('Page.reload'); await sleep(600);
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
