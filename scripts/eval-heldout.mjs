// Scores the card pipeline against a labelled set of partner questions (default: eval/heldout_r2.json).
//
//   node scripts/eval-heldout.mjs                      rules alone: the shared core with no model at all (runs anywhere)
//   node scripts/eval-heldout.mjs --port 9335          the real app in a Chrome that has Gemini Nano, cloud help off:
//                                                      the on-device step (Firebase AI Logic, ONLY_ON_DEVICE) answers
//                                                      the open questions. Needs `npm run dev` in another shell.
//   options: --set FILE  --out DIR (default devlog/evidence_r2)  --url http://localhost:5179/
//
// What is measured: whether the card matches the label we wrote for the question (the scoring rules are in the set's
// "about" block). The labels are the authors'. It is not a user trial. Exit code 0 when the run completed, whatever
// the score; 1 when it could not run.
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const SET = resolve(ROOT, arg('--set', 'eval/heldout_r2.json'));
const OUT = resolve(ROOT, arg('--out', 'devlog/evidence_r2'));
const PORT = Number(arg('--port', '0'));
const URL_ = arg('--url', 'http://localhost:5179/');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const git = (c) => { try { return execSync(`git ${c}`, { cwd: ROOT }).toString().trim(); } catch { return 'unknown'; } };
const lc = (s) => String(s).toLowerCase().trim();

const raw = readFileSync(SET, 'utf8');
const set = JSON.parse(raw);
const sha = createHash('sha256').update(raw).digest('hex');

/**
 * One observation -> { ok, why }. `obs`: { kind, blocked, answers: string[], escape: string|null, coach: string }.
 * `withModel` is false for the rules-alone pass: an open question is then correct when no card is made.
 */
function score(item, obs, withModel) {
  const e = item.expect;
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
    const bad = obs.answers.filter((a) => (e.forbid ?? []).map(lc).includes(lc(a)));
    if (bad.length) return fail(`an answer that should not be offered: ${bad.join(', ')}`);
    if (e.personal) {
      const n = obs.answers.filter((a) => e.personal.map(lc).includes(lc(a))).length;
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
      rows.push({ item, obs, ...score(item, obs, false) });
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
  await send('Page.navigate', { url: `${URL_}#/demo` }); await send('Page.reload');
  await waitFor(`!!document.querySelector('.chip')`);
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
    const obs = await js(`(() => { const p = document.querySelector('#person'); const t = [...p.querySelectorAll('.tile')];
      return { kind: p.dataset.kind, blocked: !!p.dataset.blocked, answers: t.filter((x) => !x.classList.contains('escape')).map((x) => x.querySelector('span').innerText),
        escape: t.find((x) => x.classList.contains('escape'))?.querySelector('span').innerText ?? null, coach: document.querySelector('#result .coach')?.innerText ?? '',
        badge: document.querySelector('#result .badge')?.innerText ?? '', why: document.querySelector('#result .why p')?.innerText ?? '' }; })()`);
    obs.ms = ms;
    obs.sdk = consoleLines.filter((l) => l.startsWith('[ai-logic]')).map((l) => (l.match(/leg=\w+ mode=\w+ inferenceSource=\w+/) ?? [l])[0]);
    obs.outside = [...new Set(outside)];
    rows.push({ item, obs, ...score(item, obs, true) });
    console.log(`${rows.at(-1).ok ? 'ok  ' : 'MISS'} ${item.id}. ${item.q} -> ${obs.blocked ? 'no card' : `${obs.answers.join(' / ')} / [${obs.escape}]`} (${ms} ms)`);
  }
  const version = (await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json()).Browser;
  ws.close();
  return { rows, status, version };
}

function report(title, rows, withModel, extra = []) {
  const TYPES = [...new Set(set.questions.map((q) => q.type))];
  const CODE = ['either-or', 'yes-no', 'feeling', 'pain', 'body', 'memory'];
  const n = (f) => rows.filter(f).length;
  const frac = (f) => `${n((r) => f(r) && r.ok)}/${n(f)}`;
  const L = [];
  L.push(`# ${title}`, '');
  L.push(`- date: ${new Date().toISOString()}`);
  L.push(`- commit: \`${git('rev-parse HEAD')}\`${git('status --porcelain') ? ' (working tree has uncommitted changes)' : ' (clean working tree)'}`);
  L.push(`- set: \`${SET.replace(`${ROOT}/`, '')}\`, ${set.questions.length} questions, sha256 \`${sha}\``);
  L.push(`- command: \`node scripts/eval-heldout.mjs${PORT ? ` --port ${PORT}` : ''}\``, ...extra, '');
  L.push('**What this is.** ' + set.about.what, '');
  L.push('## Result', '');
  L.push(`| Kind of question | Correct |`, `|---|---|`);
  for (const t of TYPES) L.push(`| ${t}${!withModel && !CODE.includes(t) ? ' (open: correct = no card, passed on to a model)' : ''} | ${frac((r) => r.item.type === t)} |`);
  L.push(`| **questions the rules decide alone** (${CODE.join(', ')}) | **${frac((r) => CODE.includes(r.item.type))}** |`);
  L.push(`| **open questions** (who, where, what)${withModel ? ', answered by the on-device model' : ': no card made, passed on'} | **${frac((r) => !CODE.includes(r.item.type))}** |`);
  L.push(`| **all** | **${frac(() => true)}** |`, '');
  if (withModel) {
    const open = rows.filter((r) => !CODE.includes(r.item.type));
    const anyCard = open.filter((r) => !r.obs.blocked && r.obs.answers.length >= 2).length;
    const onDev = rows.filter((r) => r.obs.sdk.some((l) => /inferenceSource=on_device/.test(l))).length;
    const ms = open.map((r) => r.obs.ms).sort((a, b) => a - b);
    L.push(`Open questions that got any card with two or more answers: ${anyCard}/${open.length}. Cards for which the SDK reported \`inferenceSource=on_device\`: ${onDev}/${rows.length} (the rest ran no model). Requests to hosts other than the app's own during the run: ${rows.some((r) => r.obs.outside.length) ? [...new Set(rows.flatMap((r) => r.obs.outside))].join(', ') : 'none'}. Time from submit to card on the open questions: median ${ms[Math.floor(ms.length / 2)]} ms, range ${ms[0]}–${ms.at(-1)} ms.`, '');
  }
  L.push('## Misses', '');
  const misses = rows.filter((r) => !r.ok);
  if (!misses.length) L.push('None.');
  for (const r of misses) L.push(`- ${r.item.id}. (${r.item.type}) "${r.item.q}": ${r.why}`);
  L.push('', '## Every question', '', `| # | Kind | Question | Card | ${withModel ? 'Ran | ' : ''}Correct |`, `|---|---|---|---|${withModel ? '---|' : ''}---|`);
  for (const r of rows) {
    const card = r.obs.blocked ? `no card (${r.obs.kind})` : `${r.obs.kind}: ${r.obs.answers.join(' / ')}${r.obs.escape ? ` / [${r.obs.escape}]` : ''}`;
    L.push(`| ${r.item.id} | ${r.item.type} | ${r.item.q} | ${card} | ${withModel ? `${r.obs.sdk.length ? r.obs.sdk.map((l) => l.replace(/^leg=(\w+) mode=\w+ inferenceSource=(\w+)$/, '$1: $2')).join(', ') : 'no model'} | ` : ''}${r.ok ? 'yes' : 'no'} |`);
  }
  L.push('', '## Limits', '', '- The labels are the authors\' own, written the same day as the last rule change; a second labeller has not checked them.', '- One made-up family, two choices at a time, one answer per question; the model\'s answers vary between runs.', '- "Correct" means the card matches the label, not that a person with aphasia could answer with it. The timed trial in `devlog/TRIAL_PROTOCOL.md` has not been run.');
  return `${L.join('\n')}\n`;
}

mkdirSync(OUT, { recursive: true });
const stem = SET.split('/').pop().replace(/\.json$/, '');
try {
  if (PORT) {
    const { rows, status, version } = await devicePass();
    const f = join(OUT, `${stem}_ondevice.md`);
    writeFileSync(f, report('Held-out set, the real app with the on-device model (cloud help off)', rows, true, [`- browser: ${version}, attached on port ${PORT}; status line: "${status}"`, `- app: ${URL_} (the dev server of this commit), judge mode`]));
    writeFileSync(join(OUT, `${stem}_ondevice.json`), `${JSON.stringify(rows.map((r) => ({ id: r.item.id, q: r.item.q, type: r.item.type, ok: r.ok, why: r.why, ...r.obs })), null, 1)}\n`);
    console.log(`\n${rows.filter((r) => r.ok).length}/${rows.length} correct -> ${f}`);
  } else {
    const rows = await rulesPass();
    const f = join(OUT, `${stem}_rules.md`);
    writeFileSync(f, report('Held-out set, rules alone (no model, no network)', rows, false));
    console.log(`${rows.filter((r) => r.ok).length}/${rows.length} correct -> ${f}`);
  }
} catch (e) {
  console.error(`eval could not run: ${e.message}`);
  process.exit(1);
}
