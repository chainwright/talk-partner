// firestore.rules, run for real: every request below is made as a stranger would make it (the REST API, no sign-in),
// and the rules must answer as the comment at the top of firestore.rules says: a page may ADD a feedback note that
// passes the checks, and nothing else.
//
//   npm run test:rules
//       starts the Firestore emulator with firestore.rules (it needs Java) and runs every case: notes that must be
//       accepted, notes that must be refused, and every read, change and delete. Nothing leaves this computer.
//   node scripts/rules-check.mjs --live [--project talk-partner]
//       the refusals only, against the deployed rules. Every request must be refused, so this run writes nothing.
//       (If App Check is enforced for Firestore, a refusal here may be App Check's and not the rules': the log
//       prints the server's own reason for each.)
//
// Exit code 0 only if every case is answered as expected.
import { execSync } from 'node:child_process';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const LIVE = process.argv.includes('--live');
const EMU = process.env.FIRESTORE_EMULATOR_HOST;
if (!LIVE && !EMU) { console.error('No emulator: run `npm run test:rules`, or pass --live for the refusals against the deployed rules.'); process.exit(2); }
const PROJECT = arg('--project', LIVE ? 'talk-partner' : process.env.GCLOUD_PROJECT || 'demo-talk-partner');
const ROOT = `${LIVE ? 'https://firestore.googleapis.com' : `http://${EMU}`}/v1`;
const DB = `projects/${PROJECT}/databases/(default)`;
const DOCS = `${DB}/documents`;
const commit = (() => { try { return execSync('git rev-parse HEAD').toString().trim(); } catch { return 'unknown'; } })();

const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`); };
const call = async (method, path, body, owner = false) => {
  const r = await fetch(`${ROOT}/${path}`, { method, headers: { 'Content-Type': 'application/json', ...(owner ? { Authorization: 'Bearer owner' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  let j = null; try { j = await r.json(); } catch { /* no body */ }
  const err = Array.isArray(j) ? j[0]?.error : j?.error;
  return { status: err?.code ?? r.status, reason: err?.status ?? '', message: String(err?.message ?? '').slice(0, 90), json: j };
};
const str = (s) => ({ stringValue: s });
let n = 0;
const newId = () => `rules-check-${Date.now()}-${++n}`;
/** The write the web SDK makes for addDoc: the fields, plus "set createdAt to the server's time", only if the document is new. */
const add = (fields, { serverTime = true, collection = 'feedback', id = newId() } = {}) => call('POST', `${DOCS}:commit`, {
  writes: [{ update: { name: `${DOCS}/${collection}/${id}`, fields }, ...(serverTime ? { updateTransforms: [{ fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' }] } : {}), currentDocument: { exists: false } }],
}).then((r) => ({ ...r, id }));
const NOTE = { text: str('The tick and cross are clear.'), role: str('slt'), version: str('0.2.0'), commit: str('27abd80c1f3e') };
const without = (key) => Object.fromEntries(Object.entries(NOTE).filter(([k]) => k !== key));
const denied = (r) => r.status === 403;

console.log(`firestore.rules against ${LIVE ? `the deployed rules of project ${PROJECT} (refusals only: this run writes nothing)` : `the Firestore emulator at ${EMU}`}; commit ${commit}; ${new Date().toISOString()}`);

// ---- notes that must be accepted (the emulator only: the live run writes nothing)
const made = [];
if (!LIVE) {
  const ok = [
    ['a plain note with the server\'s time', NOTE],
    ['a note with an email address', { ...NOTE, email: str('a.b@example.org') }],
    ['a note with no role said', { ...NOTE, role: str('') }],
    ['role "carer"', { ...NOTE, role: str('carer') }],
    ['role "person"', { ...NOTE, role: str('person') }],
    ['role "other"', { ...NOTE, role: str('other') }],
    ['a note of exactly 1000 characters', { ...NOTE, text: str('a'.repeat(1000)) }],
    ['a build with no commit ("unknown")', { ...NOTE, commit: str('unknown') }],
    ['a full 40-character commit hash', { ...NOTE, commit: str('a'.repeat(40)) }],
  ];
  for (const [name, fields] of ok) {
    const r = await add(fields);
    if (r.status === 200) made.push(r.id);
    check(`accepted: ${name}`, r.status === 200, `${r.status} ${r.reason} ${r.message}`);
  }
  // what was stored, read as the owner (the emulator's own bypass): the fields as sent, and the server's time
  const got = await call('GET', `${DOCS}/feedback/${made[0]}`, null, true);
  const f = got.json?.fields ?? {};
  check('the stored note has the fields as sent and a time the server set', f.text?.stringValue === NOTE.text.stringValue && f.role?.stringValue === 'slt' && typeof f.createdAt?.timestampValue === 'string' && Math.abs(Date.now() - Date.parse(f.createdAt.timestampValue)) < 120000 && Object.keys(f).sort().join() === 'commit,createdAt,role,text,version', JSON.stringify(Object.keys(f).sort()));
}

// ---- notes that must be refused
const bad = [
  ['no text', without('text')],
  ['an empty text', { ...NOTE, text: str('') }],
  ['a text of 1001 characters', { ...NOTE, text: str('a'.repeat(1001)) }],
  ['a text that is not a string', { ...NOTE, text: { integerValue: '5' } }],
  ['no role field', without('role')],
  ['a role the form does not offer', { ...NOTE, role: str('admin') }],
  ['a role that is not a string', { ...NOTE, role: { booleanValue: true } }],
  ['an extra field', { ...NOTE, admin: { booleanValue: true } }],
  ['an email with no "@"', { ...NOTE, email: str('nonsense') }],
  ['an email with a space', { ...NOTE, email: str('a b@example.org') }],
  ['an email of 255 characters', { ...NOTE, email: str(`${'a'.repeat(243)}@example.org`) }],
  ['an email that is not a string', { ...NOTE, email: { integerValue: '1' } }],
  ['no version', without('version')],
  ['a version of 21 characters', { ...NOTE, version: str('1'.repeat(21)) }],
  ['no commit', without('commit')],
  ['a commit that is not a hash', { ...NOTE, commit: str('HEAD; drop') }],
];
for (const [name, fields] of bad) {
  const r = await add(fields);
  check(`refused: ${name}`, denied(r), `${r.status} ${r.reason} ${r.message}`);
}
{
  const r = await add({ ...NOTE, createdAt: { timestampValue: '2020-01-01T00:00:00Z' } }, { serverTime: false });
  check('refused: a time set by the sender', denied(r), `${r.status} ${r.reason} ${r.message}`);
  const r2 = await add(NOTE, { serverTime: false });
  check('refused: no time at all', denied(r2), `${r2.status} ${r2.reason} ${r2.message}`);
  const r3 = await add(NOTE, { collection: 'notes' });
  check('refused: a valid note written to any other collection', denied(r3), `${r3.status} ${r3.reason} ${r3.message}`);
  const r4 = await add(NOTE, { collection: 'feedback/x/replies' });
  check('refused: a valid note written under a note', denied(r4), `${r4.status} ${r4.reason} ${r4.message}`);
}

// ---- reading, changing and deleting: refused whether the note exists or not
const target = made[0] ?? 'rules-check-no-such-note';
const g = await call('GET', `${DOCS}/feedback/${target}`);
check(`refused: reading a note${made.length ? ' that exists' : ''}`, denied(g), `${g.status} ${g.reason} ${g.message}`);
const l = await call('GET', `${DOCS}/feedback?pageSize=1`);
check('refused: listing the notes', denied(l), `${l.status} ${l.reason} ${l.message}`);
const q = await call('POST', `${DOCS}:runQuery`, { structuredQuery: { from: [{ collectionId: 'feedback' }], limit: 1 } });
check('refused: a query over the notes', denied(q), `${q.status} ${q.reason} ${q.message}`);
const u = await call('PATCH', `${DOCS}/feedback/${target}?updateMask.fieldPaths=text`, { fields: { text: str('changed') } });
check(`refused: changing a note${made.length ? ' that exists' : ''}`, denied(u), `${u.status} ${u.reason} ${u.message}`);
const d = await call('DELETE', `${DOCS}/feedback/${target}`);
check(`refused: deleting a note${made.length ? ' that exists' : ''}`, denied(d), `${d.status} ${d.reason} ${d.message}`);
if (!LIVE) {
  // an accepted note cannot be written over by a second "create" with the same id
  const again = await add({ ...NOTE, text: str('overwrite') }, { id: target });
  check('refused: a second note with the id of one that exists', again.status !== 200, `${again.status} ${again.reason} ${again.message}`);
  const still = await call('GET', `${DOCS}/feedback/${target}`, null, true);
  check('after all of that the first note is unchanged', still.json?.fields?.text?.stringValue === NOTE.text.stringValue, still.json?.fields?.text?.stringValue ?? 'gone');
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
