// "Today in short" (core/summary.ts): two to four plain sentences of today's answers. Pinned here: the person's
// answers never go to a cloud step (the module cannot even reach one), the on-device model's words are used only when
// they came from the device and pass the check, and the rules write it everywhere else.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Engine, ModelResult } from '../../core/engine';
import { NullEngine } from '../../core/engine';
import { SUMMARY_SCHEMA, SUMMARY_SYSTEM_PROMPT, checkSummary, daySummary, rulesSummary, summaryPrompt, todays, type DayAnswer } from '../../core/summary';

const NOW = new Date(2026, 10, 17, 18, 0).getTime();
const at = (h: number, m = 0) => new Date(2026, 10, 17, h, m).getTime();
const DAY: DayAnswer[] = [
  { q: 'How are you feeling today?', label: 'so-so', at: at(9) },
  { q: 'Would you like tea or coffee?', label: 'tea', at: at(9, 5) },
  { q: 'Are you in pain?', label: 'yes', at: at(11) },
  { q: 'Where in the legs?', label: 'your left leg', at: at(11, 1) },
  { q: 'Would you like to call Jen?', label: 'yes', at: at(15) },
];
const engine = (r: ModelResult | Error) => { const calls: string[] = []; return { calls, summarizeDevice: async (p: string) => { calls.push(p); if (r instanceof Error) throw r; return r; } }; };
const good = { sentences: ['Frank felt so-so this morning and had pain in the left leg.', 'Frank chose tea and wanted to call Jen.'] };

describe('today\'s answers', () => {
  it('since local midnight, oldest first; yesterday\'s are not in it', () => {
    const hist = [{ at: at(15) }, { at: new Date(2026, 10, 16, 23, 59).getTime() }, { at: at(0, 1) }, { at: NOW + 1000 }];
    expect(todays(hist, NOW).map((h) => h.at)).toEqual([at(0, 1), at(15)]);
  });
});

describe('the rules\' own summary: no AI, nothing sent', () => {
  it('two to four plain sentences: how many, how they felt, what they chose, in the questions\' own words', () => {
    const s = rulesSummary(DAY, 'Frank');
    expect(s.length).toBeGreaterThanOrEqual(2);
    expect(s.length).toBeLessThanOrEqual(4);
    expect(s[0]).toBe('Frank answered 5 questions today by pointing, and confirmed each answer.');
    expect(s[1]).toBe('How they felt: "How are you feeling today": so-so; and "Are you in pain": yes.');
    expect(s[2]).toBe('What they chose: "Would you like tea or coffee": tea; "Where in the legs": your left leg; and "Would you like to call Jen": yes.');
  });
  it('with no name it says "They"; with one answer it is still a sentence; with none it says so', () => {
    expect(rulesSummary(DAY.slice(1, 2))[0]).toBe('They answered 1 question today by pointing, and confirmed each answer.');
    expect(rulesSummary(DAY.slice(1, 2))).toHaveLength(2);
    expect(rulesSummary([])).toEqual(['No answers have been confirmed today yet.']);
  });
  it('a question asked twice counts once, with its last answer', () => {
    const s = rulesSummary([...DAY, { q: 'Would you like tea or coffee?', label: 'coffee', at: at(16) }], 'Frank');
    expect(s[0]).toContain('5 questions');
    expect(s.join(' ')).toContain('"Would you like tea or coffee": coffee');
    expect(s.join(' ')).not.toContain(': tea');
  });
  it('a long day stays four sentences at most, and says how many more there are', () => {
    const many = Array.from({ length: 14 }, (_, i) => ({ q: `Would you like thing ${i}?`, label: 'yes', at: at(8, i) }));
    const s = rulesSummary(many, '');
    expect(s.length).toBeLessThanOrEqual(4);
    expect(s[s.length - 1]).toBe('9 more answers are in the list above.');
  });
  it('adds nothing of its own: no advice, no praise, no exclamation mark', () => {
    expect(rulesSummary(DAY, 'Frank').join(' ')).not.toMatch(/should|well done|great|!|because|probably/i);
  });
});

describe('the on-device model words it, code checks it', () => {
  it('the instructions ask for two to four sentences from the list only, and the format says the same', () => {
    expect(SUMMARY_SYSTEM_PROMPT).toMatch(/2 to 4 short plain sentences/);
    expect(SUMMARY_SYSTEM_PROMPT).toMatch(/Use only what is in the list/);
    expect(SUMMARY_SCHEMA.properties.sentences).toMatchObject({ minItems: 2, maxItems: 4 });
    expect(summaryPrompt(DAY, 'Frank')).toContain('1. How are you feeling today? -> so-so');
    expect(summaryPrompt(DAY, 'Frank')).toContain('The person is Frank.');
  });
  it('a good answer from the device is used, and marked as written on the device', async () => {
    const e = engine({ text: JSON.stringify(good), source: 'on-device', ms: 900 });
    const s = await daySummary(DAY, 'Frank', e, true);
    expect(s).toEqual({ sentences: good.sentences, source: 'on-device' });
    expect(e.calls).toHaveLength(1);
  });
  it('an answer that did not come from the device is refused: the rules write it', async () => {
    const s = await daySummary(DAY, 'Frank', engine({ text: JSON.stringify(good), source: 'in-cloud', ms: 5 }), true);
    expect(s.source).toBe('rules');
    expect(s.sentences).toEqual(rulesSummary(DAY, 'Frank'));
  });
  it('the model is not asked where the browser has none, on an engine without the step, or for a single answer', async () => {
    const e = engine({ text: JSON.stringify(good), source: 'on-device', ms: 1 });
    expect((await daySummary(DAY, 'Frank', e, false)).source).toBe('rules');
    expect((await daySummary(DAY.slice(0, 1), 'Frank', e, true)).source).toBe('rules');
    expect(e.calls).toEqual([]);
    expect((await daySummary(DAY, 'Frank', new NullEngine() as Engine, true)).source).toBe('rules');
  });
  it('the model fails: the rules write it', async () => {
    expect((await daySummary(DAY, 'Frank', engine(new Error('no model')), true)).source).toBe('rules');
  });
  it.each([
    ['not JSON', 'Frank had a nice day.'],
    ['one sentence', JSON.stringify({ sentences: ['Frank chose tea.'] })],
    ['five sentences', JSON.stringify({ sentences: ['a.', 'b.', 'c.', 'd.', 'e.'] })],
    ['a name that is not in the answers', JSON.stringify({ sentences: ['Frank chose tea.', 'Later he talked with Margaret about it.'] })],
    ['a number that is not in the answers', JSON.stringify({ sentences: ['Frank chose tea.', 'The pain was 8 out of ten.'] })],
    ['an exclamation mark', JSON.stringify({ sentences: ['Frank chose tea.', 'What a day!'] })],
    ['a sentence that runs on', JSON.stringify({ sentences: ['Frank chose tea.', 'x'.repeat(260)] })],
  ])('an answer with %s is not used', async (_, text) => {
    expect(checkSummary(text, DAY, 'Frank')).toBeNull();
    expect((await daySummary(DAY, 'Frank', engine({ text, source: 'on-device', ms: 1 }), true)).source).toBe('rules');
  });
});

describe('the person\'s answers never reach a cloud step', () => {
  const src = readFileSync(join(__dirname, '..', '..', 'core/summary.ts'), 'utf8');
  it('the module calls the on-device summary step and nothing else of the engine', () => {
    const calls = [...src.matchAll(/engine\.(\w+)\(/g)].map((m) => m[1]);
    expect(calls).toEqual(['summarizeDevice']);
    expect(src).not.toMatch(/runCloud|cloudRequest|transcribe|stripQuestion|fetch\(/);
  });
  it('the engine\'s summary step is ONLY_ON_DEVICE and throws on any other source', () => {
    const eng = readFileSync(join(__dirname, '..', '..', 'web/src/ai/firebaseEngine.ts'), 'utf8');
    const step = eng.slice(eng.indexOf('async summarizeDevice('), eng.indexOf('/** A model name from Remote Config'));
    expect(step).toContain('mode: InferenceMode.ONLY_ON_DEVICE');
    expect(step).toContain('this.local');
    expect(step).not.toMatch(/inCloudParams|PREFER_|this\.ai\b|this\.cloud\b/);
    expect(step).toMatch(/inferenceSource !== InferenceSource\.ON_DEVICE\) throw/);
  });
  it('with a cloud-only engine the summary is the rules\', and no call is made at all', async () => {
    const cloudOnly = { runCloud: () => { throw new Error('must not be called'); } };
    const s = await daySummary(DAY, 'Frank', cloudOnly as never, true);
    expect(s.source).toBe('rules');
  });
});
