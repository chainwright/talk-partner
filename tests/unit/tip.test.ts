// The tip of the day (core/tip.ts): one sentence for the carer about the carer's own questions, from flags the rules
// set on each card. Pinned here: what is flagged, which tip wins, no tip before three questions, and the wording.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { NullEngine } from '../../core/engine';
import { makeCard } from '../../core/pipeline';
import { TIP_MIN, addAsk, askOf, tipOfDay, type Ask } from '../../core/tip';
import { EMPTY_PROFILE } from '../../core/types';

const NOW = new Date(2026, 10, 22, 20, 0).getTime();
const ask = (o: Partial<Ask> = {}, minsAgo = 10): Ask => ({ at: NOW - minsAgo * 60000, open: false, two: false, quiz: false, again: false, ...o });
const env = { profile: EMPTY_PROFILE, support: 'more' as const, engine: new NullEngine(), allowCloud: false, deviceReady: false };

describe('the flags, read from the card the pipeline made', () => {
  it('a plain question has none; two things at once, a memory question and an open question each have theirs', async () => {
    expect(askOf(await makeCard('Would you like tea or coffee?', env), 1)).toEqual({ at: 1, open: false, two: false, quiz: false, again: false });
    expect(askOf(await makeCard('Are you hungry and do you want to go out?', env), 1)).toMatchObject({ two: true });
    expect(askOf(await makeCard('What year did we get married?', env), 1)).toMatchObject({ quiz: true, open: false });
    expect(askOf(await makeCard('What do you want to do this weekend?', env), 1)).toMatchObject({ open: true, quiz: false });
  });
  it('a narrowing card is "the choices did not fit", not an open question', () => {
    expect(askOf({ kind: 'choice', pending: null, source: 'in-cloud', blocked: null, narrow: { level: 1, rejected: [] } }, 1)).toMatchObject({ again: true, open: false });
  });
  it('what is kept holds no word of the question', () => {
    expect(Object.keys(ask()).sort()).toEqual(['again', 'at', 'open', 'quiz', 'two']);
    expect(addAsk([ask(), ask()], ask(), 2).length).toBe(2);
  });
});

describe('the tip', () => {
  it(`none before ${TIP_MIN} questions today; yesterday's questions do not count`, () => {
    expect(tipOfDay([ask({ two: true }), ask()], NOW)).toBeNull();
    expect(tipOfDay([ask({ two: true }, 60 * 30), ask({}, 60 * 30), ask({}, 60 * 30), ask()], NOW)).toBeNull();
  });
  it('two things at once comes first', () => {
    const t = tipOfDay([ask({ two: true }), ask({ quiz: true }), ask({ open: true }), ask({ two: true })], NOW)!;
    expect(t).toEqual({ kind: 'two', text: "2 of today's questions asked two things at once. One thing at a time is easier to answer by pointing.", base: 'From your 4 questions today. About the questions, never about them.' });
  });
  it('then a memory question, then choices that did not fit twice, then mostly open questions', () => {
    expect(tipOfDay([ask({ quiz: true }), ask(), ask()], NOW)!.text).toBe("One of today's questions asked them to remember something. Telling works better than testing: say what you know, then ask what they want.");
    expect(tipOfDay([ask({ again: true }), ask(), ask()], NOW)!.kind).toBe('good');
    expect(tipOfDay([ask({ again: true }), ask({ again: true }), ask()], NOW)!.kind).toBe('again');
    expect(tipOfDay([ask({ open: true }), ask({ open: true }), ask(), ask()], NOW)!.kind).toBe('open');
    expect(tipOfDay([ask({ open: true }), ask({ open: true }), ask(), ask(), ask()], NOW)!.kind).toBe('good');
  });
  it('when nothing was flagged: what went well, with its count', () => {
    expect(tipOfDay([ask(), ask(), ask()], NOW)).toMatchObject({ kind: 'good', text: "Each of today's 3 questions asked one clear thing. That is what makes pointing work." });
  });
  it('every tip is about the questions: warm, no blame, nothing about the person\'s ability, no medical word', () => {
    const tips = [[ask({ two: true }), ask(), ask()], [ask({ quiz: true }), ask(), ask()], [ask({ again: true }), ask({ again: true }), ask()], [ask({ open: true }), ask({ open: true }), ask()], [ask(), ask(), ask()]].map((x) => tipOfDay(x, NOW)!);
    expect(new Set(tips.map((t) => t.kind)).size).toBe(5);
    for (const t of tips) expect(`${t.text} ${t.base}`).not.toMatch(/wrong|mistake|bad|fail|you should|you must|cannot|can't|confus|deficit|doctor|score/i);
  });
  it('the file imports the copy and a type only: no engine, no request, no diary', () => {
    const imports = [...readFileSync(join(__dirname, '..', '..', 'core/tip.ts'), 'utf8').matchAll(/^import .* from '(.+)';$/gm)].map((m) => m[1]);
    expect(imports.sort()).toEqual(['./copy', './types']);
  });
});
