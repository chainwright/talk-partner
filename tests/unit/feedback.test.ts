// "Send feedback" (17 Nov 2026): the note's checks (core/feedback.ts), the one write (web/src/feedback.ts, against a
// recording stand-in for the Firebase packages), and that the page's checks and firestore.rules say the same thing.
// The rules themselves are run by scripts/rules-check.mjs: against the Firestore emulator (every case) and against
// the deployed rules (refusals only). The real write from a real browser is in devlog/evidence_live/.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { COPY } from '../../core/copy';
import { EMAIL_MAX, FEEDBACK_COLLECTION, FEEDBACK_MAX, FEEDBACK_ROLES, feedbackDoc } from '../../core/feedback';

const read = (p: string) => readFileSync(join(__dirname, '..', '..', p), 'utf8');
const BUILD = { version: '0.2.0', commit: '27abd80c1f3e' };

const rec = { apps: [] as string[], appChecks: [] as string[], dbs: [] as string[], adds: [] as { db: string; path: string; data: Record<string, unknown> }[] };
let fail: Error | null = null;
vi.mock('firebase/app', () => ({
  initializeApp: (_o: unknown, name = '[DEFAULT]') => { rec.apps.push(name); return { name }; },
  getApps: () => rec.apps.map((name) => ({ name })),
}));
vi.mock('firebase/app-check', () => ({
  initializeAppCheck: (app: { name: string }) => { rec.appChecks.push(app.name); },
  ReCaptchaEnterpriseProvider: class { constructor(public key: string) {} },
}));
vi.mock('firebase/firestore/lite', () => ({
  getFirestore: (app: { name: string }) => { rec.dbs.push(app.name); return { app: app.name }; },
  collection: (db: { app: string }, path: string) => ({ db: db.app, path }),
  serverTimestamp: () => ({ __server: 'REQUEST_TIME' }),
  addDoc: async (col: { db: string; path: string }, data: Record<string, unknown>) => {
    if (fail) throw fail;
    rec.adds.push({ db: col.db, path: col.path, data });
    return { id: 'note-1' };
  },
}));
const { sendFeedback } = await import('../../web/src/feedback');
const CFG = { firebase: { apiKey: 'k', appId: 'a', projectId: 'p' }, recaptchaEnterpriseSiteKey: 'site' };

beforeEach(() => { rec.apps = []; rec.appChecks = []; rec.dbs = []; rec.adds = []; fail = null; (globalThis as any).self = globalThis; });

describe('feedback: the note is checked before it is written', () => {
  it('a plain note: trimmed text, the role, the build, and no email field at all', () => {
    const r = feedbackDoc({ text: '  The tick and cross are clear.  ', role: 'slt', email: '' }, BUILD);
    expect(r).toEqual({ ok: true, doc: { text: 'The tick and cross are clear.', role: 'slt', version: '0.2.0', commit: '27abd80c1f3e' } });
    expect(r.ok && 'email' in r.doc).toBe(false);
  });
  it('an email is kept only when one was typed, trimmed', () => {
    const r = feedbackDoc({ text: 'x', role: '', email: ' a.b@example.org ' }, BUILD);
    expect(r.ok && r.doc.email).toBe('a.b@example.org');
    expect(r.ok && r.doc.role).toBe('');
  });
  it('empty, too long and a broken email are refused, in that order', () => {
    expect(feedbackDoc({ text: '   ', role: '', email: 'nonsense' }, BUILD)).toEqual({ ok: false, error: 'empty' });
    expect(feedbackDoc({ text: 'a'.repeat(FEEDBACK_MAX + 1), role: '', email: '' }, BUILD)).toEqual({ ok: false, error: 'long' });
    expect(feedbackDoc({ text: 'a'.repeat(FEEDBACK_MAX), role: '', email: '' }, BUILD).ok).toBe(true);
    for (const email of ['nonsense', 'a@b', 'a b@c.de', '@c.de', 'a@@c.de', `${'a'.repeat(EMAIL_MAX)}@c.de`]) {
      expect(feedbackDoc({ text: 'x', role: '', email }, BUILD), email).toEqual({ ok: false, error: 'email' });
    }
  });
  it('a role the form does not offer is stored as "not said"; a commit that is not a hash as "unknown"', () => {
    const r = feedbackDoc({ text: 'x', role: 'admin', email: '' }, { version: '0.2.0', commit: 'HEAD; drop' });
    expect(r).toEqual({ ok: true, doc: { text: 'x', role: '', version: '0.2.0', commit: 'unknown' } });
  });
  it('the note has exactly the fields the rules allow, and nothing about the family or the browser', () => {
    const r = feedbackDoc({ text: 'x', role: 'carer', email: 'a@b.cd' }, BUILD);
    expect(r.ok && Object.keys(r.doc).sort()).toEqual(['commit', 'email', 'role', 'text', 'version']);
  });
});

describe('feedback: the one write', () => {
  it('adds one document to the "feedback" collection on the default app, after App Check, with the server\'s time', async () => {
    const doc = { text: 'x', role: 'other' as const, version: '0.2.0', commit: '27abd80c1f3e' };
    expect(await sendFeedback(CFG, doc)).toBe('note-1');
    expect(rec.apps).toEqual(['[DEFAULT]']);
    expect(rec.appChecks).toEqual(['[DEFAULT]']);
    expect(rec.dbs).toEqual(['[DEFAULT]']);
    expect(rec.adds).toEqual([{ db: '[DEFAULT]', path: FEEDBACK_COLLECTION, data: { ...doc, createdAt: { __server: 'REQUEST_TIME' } } }]);
    expect(FEEDBACK_COLLECTION).toBe('feedback');
  });
  it('a refused or failed write throws, so the form can say so and keep the words', async () => {
    fail = new Error('permission-denied');
    await expect(sendFeedback(CFG, { text: 'x', role: '', version: '0.2.0', commit: 'unknown' })).rejects.toThrow(/permission-denied/);
    expect(rec.adds).toEqual([]);
  });
  it('the module only adds: it imports no way to read, change or delete', () => {
    const src = read('web/src/feedback.ts');
    expect(src).toMatch(/import \{ addDoc, collection, getFirestore, serverTimestamp \} from 'firebase\/firestore\/lite';/);
    expect(src).not.toMatch(/\b(?:getDoc|getDocs|setDoc|updateDoc|deleteDoc|query|onSnapshot)\b/);
  });
});

describe('feedback: the rules on the server repeat the page\'s checks', () => {
  const rules = read('firestore.rules');
  it('create only; no read, update or delete; and no other collection is opened', () => {
    expect(rules).toMatch(/match \/feedback\/\{note\} \{\s*allow create: if validNote\(request\.resource\.data\);\s*allow read, update, delete: if false;/);
    expect(rules.match(/\ballow\b/g)).toHaveLength(2);
    expect(rules.match(/\bmatch \//g)).toHaveLength(2); // the documents root and /feedback
    expect(rules).not.toMatch(/if true|\{document=\*\*\}/);
  });
  it('the same limits, roles and fields as core/feedback.ts', () => {
    expect(rules).toContain(`d.text.size() <= ${FEEDBACK_MAX}`);
    expect(rules).toContain(`d.email.size() <= ${EMAIL_MAX}`);
    expect(rules).toContain(`d.role in [${['', ...FEEDBACK_ROLES].map((r) => `'${r}'`).join(', ')}]`);
    expect(rules).toContain("d.keys().hasOnly(['text', 'role', 'email', 'version', 'commit', 'createdAt'])");
    expect(rules).toContain("d.keys().hasAll(['text', 'role', 'version', 'commit', 'createdAt'])");
    expect(rules).toContain('d.createdAt == request.time');
  });
  it('firebase.json deploys that file', () => {
    expect(JSON.parse(read('firebase.json')).firestore).toMatchObject({ rules: 'firestore.rules', database: '(default)' });
  });
});

describe('feedback: the screen', () => {
  const F = COPY.feedback;
  const main = read('web/src/main.ts');
  it('asks for no patient details, in view next to the field, and says where the note goes', () => {
    expect(F.noPatients).toMatch(/^Please don't include patient details/);
    expect(main).toContain('<span class="fb-warn">${F.noPatients}</span>');
    expect(F.where).toMatch(/stored in our database in Google's cloud/);
    expect(F.where).toMatch(/none of your questions, no cards, nothing from About me/);
  });
  it('the email and the role are marked optional, and every stored role has its words', () => {
    expect(F.emailLabel).toMatch(/optional/);
    expect(F.roleLabel).toMatch(/optional/);
    for (const r of ['', ...FEEDBACK_ROLES]) expect(F.roles[r], r).toBeTruthy();
    expect(F.roles.slt).toBe('a speech-language therapist');
  });
  it('offline, or on a copy with no settings, the button is off and a sentence says why', () => {
    expect(main).toContain("const note = !cfg ? F.noConfig : off ? F.offline : fb.error ? F.errors[fb.error] : '';");
    expect(main).toContain("${!cfg || off || sending ? 'disabled' : ''}");
    expect(F.offline).toMatch(/needs a connection/);
  });
  it('nothing about feedback is loaded or sent before "Send": the Firestore module is imported in the submit handler only', () => {
    expect(main.match(/import\('\.\/feedback'\)/g)).toHaveLength(1);
    expect(main).not.toMatch(/from '\.\/feedback'/);
    const submit = main.slice(main.indexOf('async function submitFeedback()'), main.indexOf('// the connection coming or going'));
    expect(submit.indexOf('feedbackDoc(')).toBeLessThan(submit.indexOf("import('./feedback')"));
    // only the checked note is handed over: not the profile, not the cards, not the question
    expect(submit).toContain('sendFeedback(cfg, checked.doc)');
    expect(submit).not.toMatch(/state\.(?:profile|made|history|lastQuestion|answers)/);
  });
  it('it is reachable from the partner\'s side and from "How this works"', () => {
    expect(main.match(/href="#\/feedback"/g)).toHaveLength(2);
  });
  it('the text field cannot take more than the limit', () => {
    expect(main).toContain('<textarea id="fb-text" rows="6" maxlength="${FEEDBACK_MAX}"');
    expect(F.errors.long).toContain('1,000');
    expect(FEEDBACK_MAX).toBe(1000);
  });
});
