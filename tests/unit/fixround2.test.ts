// Fix round 2 after held-out run 2: long either-or questions, speaker prefixes, label cuts, weak device options,
// single-part body map, and no quiz questions (KB §7 rule 9). All examples are new: none come from any held-out set.
import { describe, expect, it } from 'vitest';
import type { DeviceStatus, Engine, ModelResult } from '../../core/engine';
import { cloudTextRequest, pictureRequestBody } from '../../core/requests';
import { makeCard } from '../../core/pipeline';
import { BODY_DETAIL, BODY_REGIONS, fitFilter, isQuiz, normalizeQuestion, orPair, quizRephrase } from '../../core/rules';
import type { ModelOutput, SupportLevel } from '../../core/types';
import { PROFILE } from './fixtures';

class Fake implements Engine {
  label = 'fake';
  modes = { device: 'ONLY_ON_DEVICE', cloud: 'PREFER_IN_CLOUD', pictures: 'ONLY_IN_CLOUD' };
  cloudConfigured = true;
  deviceCalls: string[] = [];
  cloudCalls: string[] = [];
  constructor(private dev: ModelOutput, private cloud: ModelOutput = { topic: 'x', kind: 'choice', choices: ['one thing', 'another thing'] }) {}
  async deviceStatus(): Promise<DeviceStatus> { return 'available'; }
  async prepareDevice() {}
  async runDevice(p: string): Promise<ModelResult> { this.deviceCalls.push(p); return { text: JSON.stringify(this.dev), source: 'on-device', ms: 5 }; }
  cloudRequest(q: string) { return cloudTextRequest(q); }
  async runCloud(q: string): Promise<ModelResult> { this.cloudCalls.push(q); return { text: JSON.stringify(this.cloud), source: 'in-cloud', ms: 7 }; }
  pictureRequest(w: string) { return pictureRequestBody(w); }
  async picture() { return null; }
}
const env = (engine: Engine, support: SupportLevel = 'more') => ({ profile: PROFILE, support, engine, allowCloud: true, deviceReady: true });
const labels = (c: { choices: { label: string }[] }) => c.choices.map((x) => x.label);
const yesno: ModelOutput = { topic: 'x', kind: 'yesno', choices: ['yes', 'no'] };

describe('either-or with long sides: two options, each cut to its head phrase', () => {
  it.each([
    ["Sam's here, do you want to say hello now, or should I ask him to come back after tea?", ['say hello', 'come back after tea']],
    ['Has the cat had her dinner, or shall I feed her?', ['had her dinner', 'feed her']],
    ['Do you fancy the garden show on Saturday, or is it too much for you right now?', ['the garden show', 'too much for you']],
    ["Would you like to keep the caravan, now we don't use it, or sell it this spring?", ['keep the caravan', 'sell it']],
    ['Do you want to come shopping with me or stay at home with the dog?', ['come shopping with me', 'stay at home']],
    ['Would you rather I drove you to the dentist, or would you rather take the bus on your own?', ['I drove you', 'take the bus alone']],
    ['Should we ring the bank about the missing card before they close, or would it be better to phone the police first?', ['ring the bank', 'phone the police']],
  ])('%s', (q, pair) => {
    expect(orPair(q)).toEqual(pair);
  });

  it('a long either-or the parser cannot shorten is still never a yes/no card', async () => {
    const q = 'Do you want soup, a sandwich, or would you rather wait for tea?';
    expect(orPair(q)).toBeNull(); // a list in front: left to the model
    const e = new Fake(yesno, { topic: 'lunch', kind: 'choice', choices: ['soup', 'sandwich'] });
    const c = await makeCard(q, env(e));
    expect(c.kind).toBe('choice');
    expect(labels(c)).not.toContain('yes');
    expect(labels(c)).toEqual(['soup', 'sandwich', 'something else']);
    expect(e.cloudCalls).toHaveLength(1); // the device's yes/no was unfit, so the card went to the cloud
  });

  it('the either-or card overrides a yes/no from the model', async () => {
    const c = await makeCard('Has the cat had her dinner, or shall I feed her?', env(new Fake({ ...yesno, options: ['had her dinner', 'feed her'] })));
    expect(labels(c)).toEqual(['had her dinner', 'feed her', 'something else']);
  });
});

describe('speaker prefixes are not part of the question', () => {
  it.each([
    ['Nurse asks: Are your feet cold?', 'Are your feet cold?'],
    ['Maggie asks: Tea or coffee?', 'Tea or coffee?'],
    ['From the physio: did you do your exercises?', 'Did you do your exercises?'],
    ['Support worker - shall we go out now?', 'Shall we go out now?'],
  ])('%s', (q, want) => {
    expect(normalizeQuestion(q)).toBe(want);
  });

  it('a prefixed aux question is still yes/no and the prefix is not spoken', async () => {
    const c = await makeCard('Nurse asks: Are your feet cold?', env(new Fake({ topic: 'feet', kind: 'choice', choices: ['cold', 'warm'] })));
    expect(labels(c)).toEqual(['yes', 'no', 'not sure']);
    expect(c.say).toBe('Are your feet cold? Yes, no, or not sure?');
  });
});

describe('label cuts', () => {
  it.each([
    ['Roast chicken for Saturday when the boys visit, or something lighter?', ['roast chicken', 'something lighter']],
    ['Is something worrying you, or are you just sleepy?', ['something worrying me', 'sleepy']],
    ['Pie and mash at the café, or soup at home?', ['pie and mash', 'soup']],
  ])('%s', (q, pair) => {
    const p = orPair(q)!;
    expect(p).toEqual(pair);
    for (const side of p) expect(side).not.toMatch(/\s(?:for|to|at|on|in|with|of|the)$/i);
  });
});

describe('weak device options go to the cloud', () => {
  it('broken grammar, bare yes/no words and synonyms are unfit', () => {
    expect(fitFilter(['relax', 'listen music'], 'What would cheer you up this afternoon?', PROFILE)).toEqual({ kept: ['relax'], dropped: ['listen music'] });
    expect(fitFilter(['rest', 'relax', 'a walk'], 'What would cheer you up this afternoon?', PROFILE).kept).toEqual(['rest', 'a walk']);
    expect(fitFilter(['yes', 'okay', 'later'], 'What about the hairdresser?', PROFILE).kept).toEqual(['later']);
    expect(fitFilter(['listen to music', 'go out', 'come soon'], 'What would cheer you up?', PROFILE).kept).toEqual(['listen to music', 'go out', 'come soon']);
  });

  it('a device card that fails the fit check is routed to the cloud', async () => {
    const e = new Fake({ topic: 'cheer', kind: 'choice', choices: ['relax', 'listen music', 'rest'] }, { topic: 'cheer', kind: 'choice', choices: ['a walk', 'music'] });
    const c = await makeCard('What would cheer you up this afternoon?', env(e));
    expect(e.cloudCalls).toHaveLength(1);
    expect(c.route.reasons).toContain("a choice didn't fit the question");
    expect(labels(c)).toEqual(['a walk', 'music', 'something else']);
  });
});

describe('body map: one body part per target, still two steps', () => {
  it('no step-1 or step-2 label bundles two parts', () => {
    for (const r of BODY_REGIONS) expect(r).not.toMatch(/\bor\b/);
    for (const list of Object.values(BODY_DETAIL)) for (const d of list) expect(d).not.toMatch(/\bor\b/);
  });
  it('pointing at a part leads to where in that part', async () => {
    const c = await makeCard('Where is it sore?', env(new Fake(yesno)));
    expect(labels(c)).toEqual(['head', 'chest', 'somewhere else']);
    expect(c.bodyStep).toBe(1);
  });
});

describe('KB §7 rule 9: no quiz questions', () => {
  it.each([
    "What's my name?", 'Do you know who I am, love?', 'What day is it today?', 'Can you remember the name of the street we lived on?',
    'What was the dog called?', 'What do you call this thing?', "Who's this in the photo?", "What's her name, the new nurse?",
  ])('quiz: %s', (q) => expect(isQuiz(q)).toBe(true));

  it.each([
    'What do you remember about our holiday in Wales?', 'What do you want to call the kitten?', 'What would you like for dinner?',
    'What day shall we go to the market?', 'Who do you want to see this week?',
  ])('not a quiz: %s', (q) => expect(isQuiz(q)).toBe(false));

  it('no card and no model call; the partner gets a statement instead', async () => {
    const e = new Fake(yesno);
    const c = await makeCard("What's my name, love?", env(e));
    expect(c.kind).toBe('no-quiz');
    expect(c.choices).toEqual([]);
    // Changed 11 Nov 2026 (REBUILD_SPEC §2.10): plain words, no rule number on screen
    expect(c.blocked).toMatch(/asks them to remember/);
    expect(c.blocked).not.toMatch(/KB|rule \d/);
    expect(c.say).toBe("Tell, don't test: It's me, Maria.");
    expect(e.deviceCalls).toHaveLength(0);
  });

  it('the date is told, not asked', () => {
    expect(quizRephrase('What day is it?', 'Maria', new Date(2026, 10, 12))).toBe("It's Thursday today, 12 November.");
  });
});
