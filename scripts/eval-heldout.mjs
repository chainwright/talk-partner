// Scores the card pipeline against a labelled set of partner questions (default: eval/heldout_r2.json).
//
//   node scripts/eval-heldout.mjs                      rules alone: the shared core with no model at all (runs anywhere)
//   node scripts/eval-heldout.mjs --port 9335          the real app in a Chrome that has Gemini Nano, cloud help off:
//                                                      the on-device step (Firebase AI Logic, ONLY_ON_DEVICE) answers
//                                                      the open questions. Needs `npm run dev` in another shell.
//   options: --set FILE  --out DIR (default: a new folder devlog/eval_runs/<time>, so no saved run is overwritten)
//            --url http://localhost:5179/
//
// What is measured: whether the card matches the label we wrote for the question (the scoring rules are in the set's
// "about" block). The labels are the authors'. It is not a user trial. Exit code 0 when the run completed, whatever
// the score; 1 when it could not run.
//
// Two things were changed after the first runs of 16 Nov 2026, both making the score stricter or fairer, and the
// report says so:
//  - a list entry is matched without its article and plural endings ("Packers game" is the About-me entry
//    "Packers games"; the first scorer compared whole strings and failed that card);
//  - label amendments in eval/<set>_amendments.json are applied on top of the sealed set (two labels were too kind).
//    The report gives the open-question result with and without them.
// The headline of the report is the open questions, because that is where a model is needed at all: rules alone make
// no card for them. Counting "no card" as correct there (as the first report did) hid what the model adds.
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const SET = resolve(ROOT, arg('--set', 'eval/heldout_r2.json'));
const OUT = resolve(ROOT, arg('--out', `devlog/eval_runs/${new Date().toISOString().replace(/[-:]/g, '').replace(/\..*/, '').replace('T', '-')}`));
const PORT = Number(arg('--port', '0'));
const URL_ = arg('--url', 'http://localhost:5179/');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const git = (c) => { try { return execSync(`git ${c}`, { cwd: ROOT }).toString().trim(); } catch { return 'unknown'; } };
const lc = (s) => String(s).toLowerCase().trim();
/** For list entries (About me, forbidden answers): case, a leading article and plural endings do not make a different entry. */
const fold = (s) => lc(s).replace(/^(?:the|a|an)\s+/, '').split(/\s+/).map((w) => (w.length > 3 ? w.replace(/s$/, '') : w)).join(' ');
const inList = (label, list) => (list ?? []).map(fold).includes(fold(label));

const raw = readFileSync(SET, 'utf8');
const set = JSON.parse(raw);
const sha = createHash('sha256').update(raw).digest('hex');
// label amendments written after the first runs (stricter only); the sealed set itself is never edited
const AMEND_FILE = SET.replace(/\.json$/, '_amendments.json');
const amendRaw = existsSync(AMEND_FILE) ? readFileSync(AMEND_FILE, 'utf8') : null;
const amendments = amendRaw ? JSON.parse(amendRaw) : { amend: {}, aboutMe: [] };
const amendSha = amendRaw ? createHash('sha256').update(amendRaw).digest('hex') : null;
const amended = (item) => {
  const a = amendments.amend[String(item.id)];
  return a ? { ...item.expect, forbid: [...(item.expect.forbid ?? []), ...(a.forbidAdd ?? [])] } : item.expect;
};
const CODE = ['either-or', 'yes-no', 'feeling', 'pain', 'body', 'memory'];
const isOpen = (item) => !CODE.includes(item.type);
// read once, before anything is written: whether the tree was clean when the run started
const TREE = git('status --porcelain');

/**
 * One observation -> { ok, why }. `obs`: { kind, blocked, answers: string[], escape: string|null, coach: string }.
 * `e` is the label (the sealed one, or the amended one). `withModel` is false for the rules-alone pass: an open
 * question then makes no card, which is right (a wrong card would be an error) but is not a card anyone can answer
 * with; the report counts it separately.
 */
function score(item, obs, withModel, e = amended(item)) {
  const fail = (why) => ({ ok: false, why });
  if (e.noCard) {
    if (obs.kind !== e.kind || !obs.blocked || obs.answers.length) return fail(`expected no card (${e.kind}), got ${obs.kind}${obs.blocked ? '' : ' with a card'}`);
    return /tell, don't test/i.test(obs.coach) ? { ok: true, why: '' } : fail('no "tell, don\'t test" line');
  }
  if (e.open && !withModel) {
    return obs.blocked && !obs.answers.length ? { ok: true, why: '' } : fail(`rules alone made a ${obs.kind} card: ${obs.answers.join(' / ')}`);
  }
  if (obs.blocked) return fail('no card');
  if (obs.kind !== e.kind) return fail(`expected ${e.kind}, got ${obs.kind}`);
  if (e.answers) {
    const got = obs.answers.map(lc);
    if (got.length !== e.answers.length || !e.answers.every((alts, i) => alts.map(lc).includes(got[i]))) return fail(`answers: ${obs.answers.join(' / ') || '(none)'}`);
  }
  if (e.escape && !e.escape.map(lc).includes(lc(obs.escape ?? ''))) return fail(`way out: ${obs.escape ?? '(none)'}`);
  if (e.open) {
    if (obs.answers.length < 2) return fail(`fewer than two answers: ${obs.answers.join(' / ')}`);
    const bad = obs.answers.filter((a) => inList(a, e.forbid));
    if (bad.length) return fail(`an answer that should not be offered: ${bad.join(', ')}`);
    if (e.personal) {
      const n = obs.answers.filter((a) => inList(a, e.personal)).length;
      if (n < (e.personalMin ?? 2)) return fail(`${n} of the expected About-me answers (need ${e.personalMin ?? 2}): ${obs.answers.join(' / ')}`);
    }
  }
  return { ok: true, why: '' };
}

async function rulesPass() {
  // the shared core is TypeScript: load it through Vite (already a dev dependency), no browser, no network
  const { createServer } = await import('vite');
  const server = await createServer({ configFile: false, root: ROOT, logLevel: 'silent', appType: 'custom', server: { middlewareMode: true, ws: false, hmr: false, watch: null }, optimizeDeps: { noDiscovery: true } });
  try {
    const { makeCard } = await server.ssrLoadModule('/core/pipeline.ts');
    const { NullEngine } = await server.ssrLoadModule('/core/engine.ts');
    const { SAMPLE_PROFILE } = await server.ssrLoadModule('/core/sample.ts');
    const rows = [];
    for (const item of set.questions) {
      const c = await makeCard(item.q, { profile: SAMPLE_PROFILE, support: 'more', engine: new NullEngine(), allowCloud: false, deviceReady: false });
      const obs = { kind: c.kind, blocked: !!c.blocked, answers: c.choices.filter((x) => x.role === 'answer').map((x) => x.label), escape: c.choices.find((x) => x.role === 'escape')?.label ?? null, coach: c.coach ?? '', source: c.source };
      rows.push({ item, obs, ...score(item, obs, false), sealedOk: score(item, obs, false, item.expect).ok });
    }
    return rows;
  } finally { await server.close(); }
}

async function devicePass() {
  let wsUrl;
  try { wsUrl = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find((t) => t.type === 'page')?.webSocketDebuggerUrl; } catch { /* below */ }
  if (!wsUrl) throw new Error(`no Chrome page on port ${PORT}`);
  const ws = new WebSocket(wsUrl);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  let id = 0;
  const pending = new Map();
  const consoleLines = [];
  const outside = [];
  const appHost = new URL(URL_).host;
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
    if (m.method === 'Runtime.consoleAPICalled') consoleLines.push(m.params.args.map((a) => a.value ?? a.description).join(' '));
    if (m.method === 'Network.requestWillBeSent' && /^https?:/.test(m.params.request.url) && new URL(m.params.request.url).host !== appHost) outside.push(new URL(m.params.request.url).host);
  });
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const js = async (expr) => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true, userGesture: true })).result?.result?.value;
  const waitFor = async (expr, ms = 60000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await js(expr)) return true; await sleep(200); } return false; };
  await send('Network.enable'); await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: `${URL_}#/cloud` });
  await waitFor(`!!document.querySelector('main')`); await sleep(500);
  await js(`document.querySelector('[data-act="cloud-off"]')?.click()`); await sleep(300); // cloud help off: the device step alone
  // a hash change does not load the page again: mark the old document, reload, and wait for the new one
  await send('Page.navigate', { url: `${URL_}#/demo` }); await sleep(300);
  await js(`window.__before = true`); await send('Page.reload');
  await waitFor(`!window.__before && document.readyState === 'complete' && !!document.querySelector('.chip') && !!document.querySelector('#status')`);
  await js(`(() => { const s = document.querySelector('#support'); if (s.value !== 'more') { s.value = 'more'; s.dispatchEvent(new Event('change', { bubbles: true })); } })()`);
  const ready = await waitFor(`/Ready/.test(document.querySelector('#status').innerText)`, 180000);
  const status = await js(`document.querySelector('#status').innerText`);
  const cloud = await js(`[...document.querySelectorAll('header nav a')].map((a) => a.innerText).find((t) => t.startsWith('Cloud help'))`);
  if (!ready) throw new Error(`the on-device model is not ready in this Chrome: "${status}"`);
  if (cloud !== 'Cloud help: off') throw new Error(`cloud help must be off for this pass: "${cloud}"`);
  const rows = [];
  for (const item of set.questions) {
    consoleLines.length = 0; outside.length = 0;
    const t0 = Date.now();
    await js(`(() => { const q = document.querySelector('#q'); q.value = ${JSON.stringify(item.q)}; document.querySelector('#ask').requestSubmit(); })()`);
    await sleep(250);
    await waitFor(`document.querySelector('#make') && !document.querySelector('#make').disabled`, 120000);
    const ms = Date.now() - t0;
    await sleep(300);
    const obs = await js(`(() => { const m = document.querySelector('#made'); if (m) m.open = true; const p = document.querySelector('#person'); const t = [...p.querySelectorAll('.tile')];
      return { kind: p.dataset.kind, blocked: !!p.dataset.blocked, answers: t.filter((x) => !x.classList.contains('escape')).map((x) => x.querySelector('span').innerText),
        escape: t.find((x) => x.classList.contains('escape'))?.querySelector('span').innerText ?? null, coach: document.querySelector('#result .coach')?.innerText ?? '',
        badge: document.querySelector('#result .badge')?.innerText ?? '', why: document.querySelector('#result .why p')?.innerText ?? '' }; })()`);
    obs.ms = ms;
    obs.sdk = consoleLines.filter((l) => l.startsWith('[ai-logic]')).map((l) => (l.match(/leg=\w+ mode=\w+ inferenceSource=\w+/) ?? [l])[0]);
    obs.outside = [...new Set(outside)];
    rows.push({ item, obs, ...score(item, obs, true), sealedOk: score(item, obs, true, item.expect).ok });
    console.log(`${rows.at(-1).ok ? 'ok  ' : 'MISS'} ${item.id}. ${item.q} -> ${obs.blocked ? 'no card' : `${obs.answers.join(' / ')} / [${obs.escape}]`} (${ms} ms)`);
  }
  const version = (await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json()).Browser;
  ws.close();
  return { rows, status, version };
}

/** Open-question counts, the same for both passes: a card made, a card matching the label, a card with About-me answers. */
function openCounts(rows) {
  const open = rows.filter((r) => isOpen(r.item));
  const card = (r) => !r.obs.blocked && r.obs.answers.length >= 2;
  const mine = (r) => r.obs.answers.filter((x) => inList(x, amendments.aboutMe));
  const asksPersonal = open.filter((r) => r.item.expect.personal);
  return {
    n: open.length,
    made: open.filter(card).length,
    matched: open.filter((r) => card(r) && r.ok).length,
    matchedSealed: open.filter((r) => card(r) && r.sealedOk).length,
    personal: open.filter((r) => card(r) && r.ok && mine(r).length >= 1).length,
    asked: asksPersonal.length,
    askedGot: asksPersonal.filter((r) => card(r) && r.ok).length,
    wrong: open.filter((r) => card(r) && !r.ok).length,
    passedOn: open.filter((r) => !card(r)).length,
  };
}

function report(title, rows, withModel, extra = []) {
  const TYPES = [...new Set(set.questions.map((q) => q.type))];
  const n = (f) => rows.filter(f).length;
  const frac = (f) => `${n((r) => f(r) && r.ok)}/${n(f)}`;
  const o = openCounts(rows);
  const closedOk = n((r) => !isOpen(r.item) && r.ok);
  const closedN = n((r) => !isOpen(r.item));
  const L = [];
  L.push(`# ${title}`, '');
  L.push(`- date: ${new Date().toISOString()}`);
  L.push(`- commit: \`${git('rev-parse HEAD')}\`${TREE ? ` (uncommitted changes in ${TREE.split('\n').length} file(s) when the run started)` : ' (clean working tree when the run started)'}`);
  L.push(`- set: \`${SET.replace(`${ROOT}/`, '')}\`, ${set.questions.length} questions, sha256 \`${sha}\``);
  if (amendSha) L.push(`- label amendments (stricter, written after the first runs): \`${AMEND_FILE.replace(`${ROOT}/`, '')}\`, questions ${Object.keys(amendments.amend).join(', ')}, sha256 \`${amendSha}\``);
  L.push(`- command: \`node scripts/eval-heldout.mjs${PORT ? ` --port ${PORT}` : ''}\``, ...extra, '');
  L.push('**What this is.** ' + set.about.what, '');
  L.push('## Result', '');
  L.push(`### Open questions (who, where, what): ${o.n} of the ${rows.length}`, '');
  L.push('These are the questions the rules cannot answer: the choices are not in the question. A model is needed, and the family\'s own names, places and foods are only in About me, which only the on-device step sees.', '');
  L.push(`| On the ${o.n} open questions | ${withModel ? 'On-device model (this run)' : 'Rules alone (this run)'} |`, '|---|---|');
  L.push(`| a card with two or more answers was made | ${o.made}/${o.n} |`);
  L.push(`| the card matched our label | **${o.matched}/${o.n}** |`);
  L.push(`| the card matched our label and offers the family's own entries from About me (a personal card) | **${o.personal}/${o.n}** |`);
  L.push(`| of the ${o.asked} questions whose label asks for About-me answers: the card gave them | ${o.askedGot}/${o.asked} |`);
  L.push(`| a card was made and it is wrong by our label | ${o.wrong}/${o.n} |`);
  L.push(`| no card: the partner is told to ask normally | ${o.passedOn}/${o.n} |`, '');
  if (withModel && amendSha) L.push(`With the labels as first sealed (before the amendments to questions ${Object.keys(amendments.amend).join(' and ')}), ${o.matchedSealed}/${o.n} open cards would have matched.`, '');
  if (!withModel) L.push(`Rules alone make no card for an open question. That is the right thing to do without a model (no wrong card: ${o.wrong}/${o.n}), and it leaves the partner with nothing to show. The first version of this report counted those ${o.passedOn} as "correct", which put rules alone at ${closedOk + o.passedOn}/${rows.length} and made the model look worth nothing; that total is not a count of cards and we no longer quote it.`, '');
  L.push(`### Questions the rules decide alone (${CODE.join(', ')}): ${closedN} of the ${rows.length}`, '');
  L.push(`| Kind of question | Matched our label |`, `|---|---|`);
  for (const t of TYPES.filter((x) => CODE.includes(x))) L.push(`| ${t} | ${frac((r) => r.item.type === t)} |`);
  L.push(`| **all ${closedN}** | **${closedOk}/${closedN}** |`, '');
  L.push('### By kind, open questions', '', `| Kind of question | Card matched our label |`, `|---|---|`);
  for (const t of TYPES.filter((x) => !CODE.includes(x))) L.push(`| ${t} | ${n((r) => r.item.type === t && r.ok && !r.obs.blocked && r.obs.answers.length >= 2)}/${n((r) => r.item.type === t)} |`);
  L.push('', `**Cards (or, for a memory question, the "tell, don't test" line) matching our label, all ${rows.length} questions: ${closedOk + o.matched}/${rows.length}** (${closedOk}/${closedN} where the rules decide, ${o.matched}/${o.n} open).`, '');
  if (withModel) {
    const open = rows.filter((r) => isOpen(r.item));
    const onDev = rows.filter((r) => r.obs.sdk.some((l) => /inferenceSource=on_device/.test(l))).length;
    const ms = open.map((r) => r.obs.ms).sort((a, b) => a - b);
    L.push(`Cards for which the SDK reported \`inferenceSource=on_device\`: ${onDev}/${rows.length} (the rest ran no model). Requests to hosts other than the app's own during the run: ${rows.some((r) => r.obs.outside.length) ? [...new Set(rows.flatMap((r) => r.obs.outside))].join(', ') : 'none'}. Time from submit to card on the open questions: median ${ms[Math.floor(ms.length / 2)]} ms, range ${ms[0]}–${ms.at(-1)} ms.`, '');
  }
  L.push('## Misses', '');
  const misses = rows.filter((r) => !r.ok);
  if (!misses.length) L.push('None.');
  for (const r of misses) L.push(`- ${r.item.id}. (${r.item.type}) "${r.item.q}": ${r.why}`);
  L.push('', '## Every question', '', `| # | Kind | Question | Card | ${withModel ? 'Ran | ' : ''}Matched |`, `|---|---|---|---|${withModel ? '---|' : ''}---|`);
  for (const r of rows) {
    const card = r.obs.blocked ? `no card (${r.obs.kind})` : `${r.obs.kind}: ${r.obs.answers.join(' / ')}${r.obs.escape ? ` / [${r.obs.escape}]` : ''}`;
    const verdict = !withModel && isOpen(r.item) ? (r.ok ? 'no card (passed on)' : 'no: a card was made') : r.ok ? 'yes' : 'no';
    L.push(`| ${r.item.id} | ${r.item.type} | ${r.item.q} | ${card} | ${withModel ? `${r.obs.sdk.length ? r.obs.sdk.map((l) => l.replace(/^leg=(\w+) mode=\w+ inferenceSource=(\w+)$/, '$1: $2')).join(', ') : 'no model'} | ` : ''}${verdict} |`);
  }
  L.push('', '## Limits', '', '- The labels are the authors\' own, written the same day as the last rule change; a second labeller has not checked them. Two were made stricter after reading the first runs.', '- One made-up family, two choices at a time, one answer per question; the model\'s answers vary between runs, so the open-question counts move by one or two from run to run.', '- "Matched" means the card matches the label, not that a person with aphasia could answer with it. The timed trial in `devlog/TRIAL_PROTOCOL.md` has not been run.');
  return { text: `${L.join('\n')}\n`, o, closedOk, closedN };
}

mkdirSync(OUT, { recursive: true });
const stem = SET.split('/').pop().replace(/\.json$/, '');
try {
  if (PORT) {
    const { rows, status, version } = await devicePass();
    const f = join(OUT, `${stem}_ondevice.md`);
    const rep = report('Held-out set, the real app with the on-device model (cloud help off)', rows, true, [`- browser: ${version}, attached on port ${PORT}; status line: "${status}"`, `- app: ${URL_} (the dev server of this commit), judge mode`]);
    writeFileSync(f, rep.text);
    writeFileSync(join(OUT, `${stem}_ondevice.json`), `${JSON.stringify(rows.map((r) => ({ id: r.item.id, q: r.item.q, type: r.item.type, ok: r.ok, okWithSealedLabel: r.sealedOk, why: r.why, ...r.obs })), null, 1)}\n`);
    console.log(`\nopen questions: ${rep.o.matched}/${rep.o.n} cards matched the label, ${rep.o.personal}/${rep.o.n} personal; rules-decided: ${rep.closedOk}/${rep.closedN} -> ${f.replace(`${ROOT}/`, '')}`);
  } else {
    const rows = await rulesPass();
    const f = join(OUT, `${stem}_rules.md`);
    const rep = report('Held-out set, rules alone (no model, no network)', rows, false);
    writeFileSync(f, rep.text);
    console.log(`open questions: ${rep.o.made}/${rep.o.n} cards made (rules alone make none); rules-decided: ${rep.closedOk}/${rep.closedN} -> ${f.replace(`${ROOT}/`, '')}`);
  }
} catch (e) {
  console.error(`eval could not run: ${e.message}`);
  process.exit(1);
}
