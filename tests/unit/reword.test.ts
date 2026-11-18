// "Plainer words" (core/reword.ts): the one job a model has in the insights and the tip. The rules' lines go in; what
// comes back stands only if code says so. Pinned here: the check, the fall-back to the rules' own words, the request.
import { describe, expect, it } from 'vitest';
import type { ModelResult } from '../../core/engine';
import { CLOUD_TEXT_MODEL } from '../../core/models';
import { REWORD_MAX, REWORD_SYSTEM_PROMPT, checkReworded, rewordOnDevice, rewordRequest } from '../../core/reword';

const SRC = ['Something sweet was chosen 3 times in the last 7 days.', 'Few drinks were entered on Wed 18 Nov: 2.'];
const json = (lines: unknown) => JSON.stringify({ lines });

describe('the check', () => {
  it('plainer words for each line, the same count, pass', () => {
    expect(checkReworded(json(['Sweet things were picked 3 times over the last 7 days.', 'On Wed 18 Nov only 2 drinks were written down.']), SRC)).toEqual(['Sweet things were picked 3 times over the last 7 days.', 'On Wed 18 Nov only 2 drinks were written down.']);
    expect(checkReworded(`Here you go: ${json(['1. Sweet things: 3 times in 7 days.', '2. On Wed 18 Nov, 2 drinks.'])}`, SRC)).toEqual(['Sweet things: 3 times in 7 days.', 'On Wed 18 Nov, 2 drinks.']);
  });
  it.each([
    ['not JSON', 'Sweet things were picked 3 times.'],
    ['one line for two', json(['Sweet things 3 times in 7 days and 2 drinks on Wed 18 Nov.'])],
    ['three lines for two', json(['Sweets: 3 in 7 days.', 'Wed 18 Nov: 2 drinks.', 'Take care.'])],
    ['a number that was not there', json(['Sweet things were picked 3 times in 7 days, about 40 grams.', 'On Wed 18 Nov, 2 drinks.'])],
    ['a number that went missing', json(['Sweet things were picked often in the last 7 days.', 'On Wed 18 Nov, 2 drinks.'])],
    ['a name that was not there', json(['Sweet things were picked 3 times in 7 days by Frank.', 'On Wed 18 Nov, 2 drinks.'])],
    ['a diagnosis', json(['Sweet things were picked 3 times in 7 days, which suggests diabetes is not controlled, a diagnosis to check.', 'On Wed 18 Nov, 2 drinks.'])],
    ['a medicine', json(['Sweet things were picked 3 times in 7 days; check the insulin.', 'On Wed 18 Nov, 2 drinks.'])],
    ['"should"', json(['Sweet things were picked 3 times in 7 days. You should cut down.', 'On Wed 18 Nov, 2 drinks.'])],
    ['a diet', json(['Sweet things were picked 3 times in 7 days. A low-sugar diet helps.', 'On Wed 18 Nov, 2 drinks.'])],
    ['more to drink', json(['Sweet things were picked 3 times in 7 days.', 'On Wed 18 Nov only 2 drinks. Try to offer a drink more often.'])],
    ['more to drink, other words', json(['Sweet things were picked 3 times in 7 days.', 'On Wed 18 Nov only 2 drinks: give more water.'])],
    ['an exclamation', json(['Sweet things were picked 3 times in 7 days!', 'On Wed 18 Nov, 2 drinks.'])],
    ['too long', json([`Sweet things 3 times in 7 days ${'and so on '.repeat(40)}`, 'On Wed 18 Nov, 2 drinks.'])],
    ['not a string', json(['Sweet things 3 times in 7 days.', 2])],
    ['an empty line', json(['Sweet things 3 times in 7 days.', ' '])],
  ])('refused: %s', (_name, raw) => {
    expect(checkReworded(raw, SRC)).toBeNull();
  });
  it('a word of the source is not refused in the answer (the doctor\'s plan stays the doctor\'s plan)', () => {
    const src = ["No drink was chosen or logged on Wed 18 Nov. A fluid limit from the doctor is noted here: go by the doctor's plan."];
    expect(checkReworded(json(["Nothing to drink was written down on Wed 18 Nov. The doctor set a fluid limit, so go by the doctor's plan."]), src)).not.toBeNull();
    expect(REWORD_MAX).toBeGreaterThan(100);
  });
});

describe('on the device, or the rules\' own words', () => {
  const engine = (r: Partial<ModelResult> | Error) => ({ rewordDevice: async () => { if (r instanceof Error) throw r; return { text: '', source: 'on-device' as const, ms: 1, ...r }; } });
  it('no model here, no step on the engine, nothing to word: the rules\' words, and the engine is not called', async () => {
    let called = 0;
    const e = { rewordDevice: async () => { called++; return { text: json(SRC), source: 'on-device' as const, ms: 1 }; } };
    expect(await rewordOnDevice(SRC, 'p', e, false)).toEqual({ lines: SRC, source: 'rules' });
    expect(await rewordOnDevice(SRC, 'p', {}, true)).toEqual({ lines: SRC, source: 'rules' });
    expect(await rewordOnDevice([], 'p', e, true)).toEqual({ lines: [], source: 'rules' });
    expect(called).toBe(0);
  });
  it('the model\'s words when they pass; the rules\' words when they do not, when it throws, and when the answer did not come from the device', async () => {
    const good = json(['Sweet things: 3 times in 7 days.', 'On Wed 18 Nov, 2 drinks.']);
    expect(await rewordOnDevice(SRC, 'p', engine({ text: good }), true)).toEqual({ lines: ['Sweet things: 3 times in 7 days.', 'On Wed 18 Nov, 2 drinks.'], source: 'on-device' });
    expect((await rewordOnDevice(SRC, 'p', engine({ text: json(['You should see a doctor.', 'x']) }), true)).source).toBe('rules');
    expect((await rewordOnDevice(SRC, 'p', engine(new Error('no model')), true)).source).toBe('rules');
    expect((await rewordOnDevice(SRC, 'p', engine({ text: good, source: 'in-cloud' }), true)).source).toBe('rules');
  });
});

describe('the request for online help', () => {
  it('holds the text it was given, the fixed instructions and the answer format, and nothing else', () => {
    const r = rewordRequest('1. A line.');
    expect(r).toEqual({ model: CLOUD_TEXT_MODEL, mode: 'PREFER_IN_CLOUD', contents: [{ role: 'user', parts: [{ text: '1. A line.' }] }], systemInstruction: REWORD_SYSTEM_PROMPT, generationConfig: { responseMimeType: 'application/json', responseJsonSchema: r.generationConfig.responseJsonSchema } });
    expect(rewordRequest.length).toBeLessThanOrEqual(2);
  });
  it('the fixed instructions forbid advice, a diagnosis, medicines, doses and a diet', () => {
    for (const w of ['advice', 'diagnosis', 'medicines', 'doses', 'diet', 'names']) expect(REWORD_SYSTEM_PROMPT).toContain(w);
  });
});
