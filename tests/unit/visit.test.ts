// "Before a doctor visit" (core/visit.ts). Pinned: the list is fixed and short; every card is made with no model
// (an engine that throws on any call); never more than three choices and a way out; the two pain questions follow only
// a yes; the page shows every answer exactly as given, with the date, the fixed footer, and no line that interprets;
// nothing here is advice or a medical word beyond the questions; and no step that builds a request can read it.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { P4 } from '../../core/copy4';
import { VISIT, VISIT_MAX, nextVisit, visitCard, visitElse, visitRows, visitText, visitTotal, type VisitAnswer, type VisitRecord } from '../../core/visit';
import { EMPTY_PROFILE, type Card } from '../../core/types';
import { visitScreen } from '../../web/src/phase4';

const ROOT = join(__dirname, '..', '..');
const read = (f: string) => readFileSync(join(ROOT, f), 'utf8');
const AT = new Date(2026, 10, 22, 18, 40).getTime();
const ans = (id: VisitAnswer['id'], label: string, out = false): VisitAnswer => ({ id, q: VISIT.find((v) => v.id === id)!.q, label, at: AT, ...(out ? { out: true } : {}) });
const pages = (c: Card): Card[] => { const out: Card[] = []; for (let p: Card | null | undefined = c; p; p = p.nextPage) out.push(p); return out; };

describe('the list is fixed, short and general', () => {
  it('five to eight cards: eight after a yes to pain, six otherwise', () => {
    expect(VISIT_MAX).toBe(8);
    expect(VISIT.map((v) => v.id)).toEqual(['pain', 'where', 'bad', 'sleep', 'appetite', 'mood', 'worry', 'ask']);
    expect(visitTotal([ans('pain', 'no')])).toBe(6);
    expect(visitTotal([ans('pain', 'yes')])).toBe(8);
  });
  it('the questions, word for word (a change here is a change to a vetted list)', () => {
    expect(VISIT.map((v) => v.q)).toEqual(['Are you in pain?', 'Where does it hurt?', 'How bad is the pain?', 'How have you been sleeping?', 'How is your appetite?', 'How have you been feeling in yourself?', 'What worries you most?', 'What do you want to ask the doctor?']);
  });
  it('names no illness, no medicine by name, no dose, and gives no advice', () => {
    const all = JSON.stringify(VISIT);
    expect(all).not.toMatch(/stroke|diabet|depress|dementia|infection|blood pressure|insulin|metformin|aspirin|\bmg\b|dose|should|must|try to|need to/i);
  });
  it('the order: pain first; "where" and "how bad" only after a yes', () => {
    expect(nextVisit([])?.id).toBe('pain');
    expect(nextVisit([ans('pain', 'yes')])?.id).toBe('where');
    expect(nextVisit([ans('pain', 'yes'), ans('where', 'your right shoulder')])?.id).toBe('bad');
    expect(nextVisit([ans('pain', 'no')])?.id).toBe('sleep');
    expect(nextVisit([ans('pain', 'not sure')])?.id).toBe('sleep');
    expect(nextVisit(VISIT.map((v) => ans(v.id, 'yes')))).toBeNull();
  });
});

describe('every card is made with no model', () => {
  it.each(VISIT.map((v) => [v.id, v] as const))('%s: by the rules or from the fixed choices, at most three and a way out on every screen', async (_id, v) => {
    const card = await visitCard(v, { ...EMPTY_PROFILE, personName: 'Frank' }, 'more');
    for (const p of pages(card)) {
      expect(p.source).toBe('code');
      expect(p.cloudPayload).toBeNull();
      expect(p.unsentPayload ?? null).toBeNull();
      expect(p.visit).toBe(v.id);
      if (v.pages) {
        expect(p.choices.filter((x) => x.role === 'answer').length).toBeLessThanOrEqual(3);
        expect(p.choices.filter((x) => x.role === 'escape')).toHaveLength(1);
      }
    }
    if (v.pages) expect(pages(card).map((p) => p.choices.filter((x) => x.role === 'answer').map((x) => x.label))).toEqual(v.pages);
  });
  it('core/visit.ts has no engine but the one that cannot run a model, and no network', () => {
    const src = read('core/visit.ts');
    expect(src).toContain('const NO_MODEL = new NullEngine();');
    expect(src).not.toMatch(/runDevice|runCloud|rewordCloud|rewordDevice|lookDevice|summarizeDevice|fetch\(|firebase/);
  });
  it('"What worries you most?" does not presume a worry: "nothing much" is on its first screen', () => {
    expect(VISIT.find((v) => v.id === 'worry')!.pages![0]).toContain('nothing much');
  });
});

describe('the page: the person\'s own answers, as given', () => {
  const r: VisitRecord = { startedAt: AT, done: true, answers: [ans('pain', 'yes'), ans('where', 'your right shoulder'), ans('bad', 'very bad'), ans('sleep', 'badly'), ans('appetite', 'so-so'), ans('mood', 'low'), ans('worry', 'talking'), ans('ask', 'something else', true)] };
  const html = visitScreen({ name: 'Frank', record: r, copied: false });
  it('every answer stands exactly as it was given, with its question and time, in the order of the list', () => {
    expect(visitRows(r).map((x) => x.label)).toEqual(['yes', 'your right shoulder', 'very bad', 'badly', 'so-so', 'low', 'talking', 'something else']);
    for (const x of visitRows(r)) { expect(html).toContain(`<b>${x.label}</b>`); expect(html).toContain(x.q); }
    expect(html).toContain('18:40');
  });
  it('whose answers, when and how; the fixed footer; "something else" asks for time', () => {
    expect(html).toContain("Frank&#39;s own answers");
    expect(html).toContain('Answered at home, with a family member&#39;s help, on Sun, 22 Nov 2026.');
    expect(P4.visit.footer('Frank')).toBe("Frank's answers, in Frank's own words where possible. Not a medical record.");
    expect(P4.visit.footer('')).toBe('Their answers, in their own words where possible. Not a medical record.');
    expect(html).toContain('Not a medical record.');
    expect(visitElse(r)).toBe(true);
    expect(html).toContain(P4.visit.elseNote);
  });
  it('health safety, the worst case (pain: yes, very bad; mood: low): nothing marks an answer less sure, nothing says tired or later, nothing interprets', () => {
    const page = html.slice(html.indexOf('id="visit-page"'), html.indexOf('</section>'));
    expect(page).not.toMatch(/less sure|may be tired|try again later|probably|means|normal|nothing to worry|fine\b/i);
    expect(visitText(r, 'Frank')).not.toMatch(/less sure|may be tired|try again later/i);
    // outside the printed page the carer is told not to wait with strong or new pain
    expect(html.slice(html.indexOf('</section>'))).toContain(P4.visit.safety);
    expect(P4.visit.safety).toMatch(/do not wait for the visit: call the nurse or doctor/);
  });
  it('with no pain the safety line is not shown; a run that was stopped says how far it got', () => {
    const part: VisitRecord = { startedAt: AT, done: false, answers: [ans('pain', 'no'), ans('sleep', 'well')] };
    const h = visitScreen({ name: '', record: part, copied: false });
    expect(h).not.toContain(P4.visit.safety);
    expect(h).toContain('2 of 6 questions were answered.');
    expect(h).toContain('data-act="visit-resume"');
  });
  it('as text: the same rows and the footer', () => {
    const t = visitText(r, 'Frank');
    expect(t).toContain('How bad is the pain? very bad (18:40)');
    expect(t.trim().endsWith('Not a medical record.')).toBe(true);
  });
  it('before the first answer: what it is, that the list is fixed, that it stays here', () => {
    const h = visitScreen({ name: 'Frank', record: null, copied: false });
    expect(h).toContain(P4.visit.fixed);
    expect(h).toContain(P4.visit.lock);
    expect(h).toContain('data-act="visit-start"');
    // the wait line names the person, as everywhere else
    expect(h).toContain('Wait. Count to ten. Don&#39;t answer for Frank.');
    expect(visitScreen({ name: '', record: null, copied: false })).toContain('answer for them.');
  });
});

describe('the privacy boundary: the visit answers are read by no step that builds a request', () => {
  const builders = ['core/prompt.ts', 'core/requests.ts', 'core/strip.ts', 'core/pipeline.ts', 'core/narrow.ts', 'core/letter.ts', 'core/phototalk.ts', 'core/summary.ts', 'core/reword.ts', 'core/engine.ts', 'core/rules.ts', 'core/kinds.ts', 'core/insights.ts', 'core/diary.ts', 'core/history.ts', 'core/backup.ts', 'web/src/ai/firebaseEngine.ts', 'web/src/ai/app.ts', 'web/src/ai/remoteConfig.ts', 'web/src/voice.ts', 'web/src/diary.ts'];
  it.each(builders)('%s does not import core/visit.ts', (f) => {
    expect(read(f)).not.toMatch(/from\s+['"][^'"]*\/visit['"]/);
  });
  it('the web client keeps them under their own key, apart from the history and the journal, and hands them to no model call', () => {
    const main = read('web/src/main.ts');
    expect(main).toContain("void kvSet('visit', state.p4.visit);");
    for (const call of [...main.matchAll(/(?:await |void )?(?:makeCard|narrowCard|letterCard|rewordOnDevice|daySummary|photoTalkCard)\([\s\S]*?\}?\);/g)].map((m) => m[0])) expect(call, call.slice(0, 80)).not.toMatch(/p4\.visit|visit\b/);
    for (const m of main.matchAll(/state\.engine\.(\w+)\(([^)]*)\)/g)) expect(m[2], m[0]).not.toMatch(/visit/);
    const confirm = main.slice(main.indexOf('function p4Confirm('), main.indexOf('function turnHtml('));
    expect(confirm.slice(0, confirm.indexOf('// the person started'))).not.toMatch(/addAnswer|addEntry|state\.history|state\.diary|markLessSure|reliability\(/);
  });
});
