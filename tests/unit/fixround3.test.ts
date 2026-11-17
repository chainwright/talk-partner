// Fix round 3 after held-out run 3: on-device option extraction validated in code, the person's own name,
// wider memory/quiz detection, and no escape-only cards. All examples are new: none come from any held-out set.
import { describe, expect, it } from 'vitest';
import type { DeviceStatus, Engine, ModelResult } from '../../core/engine';
import { cloudTextRequest } from '../../core/requests';
import { makeCard } from '../../core/pipeline';
import { aboutBlock } from '../../core/prompt';
import { isQuiz, snapToQuestionItem, validateOptions } from '../../core/rules';
import { findLeaks, stripQuestion } from '../../core/strip';
import type { ModelOutput, Profile } from '../../core/types';
import { PROFILE } from './fixtures';

const TV: Profile = { ...PROFILE, tv: ['Antiques Roadshow', 'Countryfile'], music: ['Nina Simone', 'brass bands'] };

class Fake implements Engine {
  label = 'fake';
  modes = { device: 'ONLY_ON_DEVICE', cloud: 'PREFER_IN_CLOUD' };
  cloudConfigured = true;
  optionCalls: string[] = [];
  cloudCalls: string[] = [];
  constructor(private dev: ModelOutput, private options: unknown = null, private cloud: ModelOutput = { topic: 'x', kind: 'choice', choices: ['one thing', 'another thing'] }) {}
  async deviceStatus(): Promise<DeviceStatus> { return 'available'; }
  async prepareDevice() {}
  // one on-device call: the card and, for an either-or question, the options copied out of it
  async runDevice(p: string): Promise<ModelResult> { this.optionCalls.push(p); return { text: JSON.stringify({ ...this.dev, options: this.options ?? [] }), source: 'on-device', ms: 5 }; }
  cloudRequest(q: string) { return cloudTextRequest(q); }
  async runCloud(q: string): Promise<ModelResult> { this.cloudCalls.push(q); return { text: JSON.stringify(this.cloud), source: 'in-cloud', ms: 7 }; }
}
const env = (engine: Engine, profile: Profile = PROFILE) => ({ profile, support: 'more' as const, engine, allowCloud: true, deviceReady: true });
const labels = (c: { choices: { label: string }[] }) => c.choices.map((x) => x.label);
const yesno: ModelOutput = { topic: 'x', kind: 'yesno', choices: ['yes', 'no'] };

describe('validateOptions: the model copies, code checks', () => {
  it.each([
    [['Countryfile', 'the snooker'], 'Countryfile or the snooker tonight?', ['Countryfile', 'snooker']],
    [['walk the dog', 'stay in'], 'Shall we walk the dog, or would you rather stay in by the fire?', ['walk the dog', 'stay in']],
    [['take the dogs out', 'stay home'], 'Do you want to take the dog out or stay home?', ['take the dogs out', 'stay home']],
  ])('accepts %j', (opts, q, want) => {
    expect(validateOptions(opts, q, TV)).toEqual(want);
  });

  it.each([
    [['want tea', 'coffee'], 'Do you want tea or coffee?', 'a leftover question verb'],
    [['tea', 'coffee'], 'Kettle on, or a cold drink?', 'words not in the question'],
    [['going to have', 'a nap'], 'Are you going to have a nap or a bath?', 'a dangling end'],
    [['it', 'that'], 'This one or that?', 'bare pronouns'],
    [['tea', 'coffee', 'water'], 'Tea, coffee or water?', 'three options'],
    [['not now', 'later'], 'Not now, or later?', 'a negative'],
    [['soup', 'soup'], 'Soup or soup?', 'the same twice'],
    [['a long walk round the park', 'tv'], 'A long walk round the park or the tv?', 'more than four words'],
    ['soup', 'Soup or salad?', 'not a list'],
  ] as [unknown, string, string][])('rejects %j (%s)', (opts, q) => {
    expect(validateOptions(opts, q as string, TV)).toBeNull();
  });

  it('a part of an About-me item written in full takes the whole item', () => {
    expect(validateOptions(['Simone', 'Roadshow'], 'Nina Simone, or would you rather have the Antiques Roadshow on?', TV)).toEqual(['Nina Simone', 'Antiques Roadshow']);
    expect(snapToQuestionItem('bands', 'Brass bands or a bit of quiet?', TV)).toBe('brass bands');
    expect(snapToQuestionItem('quiet', 'Brass bands or a bit of quiet?', TV)).toBe('quiet');
  });
});

describe('either-or cards: one on-device call with options; validated, else the cloud', () => {
  it('device options pass: they become the card, whatever the regex would cut', async () => {
    // (the default family: without the show in About me the code reads only "Roadshow", the tail of a name, so the
    // model is asked; with it there, the code reads the pair whole and since 17 Nov no model runs: next test)
    const e = new Fake(yesno, ['Nina Simone', 'Antiques Roadshow']);
    const c = await makeCard('Nina Simone, or would you rather have the Antiques Roadshow on?', env(e));
    expect(labels(c)).toEqual(['Nina Simone', 'Antiques Roadshow', 'something else']);
    expect(c.notes.join(' ')).toMatch(/copied from the question by the on-device model/);
    const e2 = new Fake(yesno, ['Nina Simone', 'Antiques Roadshow']);
    const c2 = await makeCard('Nina Simone, or would you rather have the Antiques Roadshow on?', env(e2, TV));
    expect(labels(c2)).toEqual(['Nina Simone', 'Antiques Roadshow', 'something else']);
    expect(e2.optionCalls).toHaveLength(0);
    expect(e.cloudCalls).toHaveLength(0);
  });

  // Changed 11 Nov 2026 (build spec §1.4 step 3, the coffee/tea bug): the pre-period behaviour sent this card to the
  // cloud. A valid code pair is now never thrown away because a model ran, so the card is the same in every engine state.
  it('device options fail the check: the code pair from the question is used, no cloud call', async () => {
    const e = new Fake(yesno, ['want to sit', 'stay'], { topic: 'out', kind: 'choice', choices: ['garden', 'stay in'], options: ['sit out in the garden', 'stay in'] });
    const c = await makeCard('Shall we sit out in the garden for a while, or would you rather stay in?', env(e));
    expect(e.cloudCalls).toHaveLength(0);
    expect(c.notes.join(' ')).toMatch(/did not pass the check; the options were read from the question in code/);
    expect(labels(c)).toEqual(['sit out in the garden', 'stay in', 'something else']);
    // a pair the code reads whole asks no model at all (17 Nov): the same kind of card, at once
    const e2 = new Fake(yesno, ['want to walk', 'stay']);
    const c2 = await makeCard('Do you want to walk to the shops or stay in the warm?', env(e2));
    expect(e2.optionCalls).toHaveLength(0);
    expect(labels(c2)).toEqual(['walk to the shops', 'stay in the warm', 'something else']);
  });

  it('device options fail and the code parser finds no pair either: the card goes to the cloud', async () => {
    const e = new Fake(yesno, ['want to', 'it'], { topic: 'out', kind: 'choice', choices: ['shops', 'home'], options: ['the shops', 'home'] });
    const c = await makeCard('Is it the shops, or are we going home, or what?', env(e));
    expect(c.notes.join(' ')).toMatch(/did not pass the check\./);
    expect(e.cloudCalls).toHaveLength(1);
  });

  it('no model at all: the rules parser still makes the card on the device', async () => {
    const e = new Fake(yesno);
    const c = await makeCard('Do you want to walk to the post office or stay in the warm?', { ...env(e), deviceReady: false });
    expect(labels(c)).toEqual(['walk to the post office', 'stay in the warm', 'something else']);
    expect(e.cloudCalls).toHaveLength(0);
  });

  it('both fail: the card goes to the cloud', async () => {
    const e = new Fake({ topic: 'x', kind: 'choice', choices: ['yes', 'no'] }, [], { topic: 'lunch', kind: 'choice', choices: ['soup', 'sandwich'] });
    const c = await makeCard('Do you want soup, a sandwich, or would you rather wait for tea?', env(e));
    expect(e.cloudCalls).toHaveLength(1);
    expect(c.route.reasons).toContain('either-or options not found');
    expect(labels(c)).toEqual(['soup', 'sandwich', 'something else']);
  });

  it('a card that needs the model is one on-device call, either-or or not', async () => {
    const e = new Fake({ topic: 'tea', kind: 'choice', choices: ['stew', 'pie'] }, ['stew', 'pie']);
    const c = await makeCard("What's for tea tonight?", env(e));
    expect(e.optionCalls).toHaveLength(1);
    expect(labels(c)).toEqual(['stew', 'pie', 'something else']); // options on a non-either-or question are ignored
    const e2 = new Fake(yesno, ['Nina Simone', 'Antiques Roadshow']);
    await makeCard('Nina Simone, or would you rather have the Antiques Roadshow on?', env(e2));
    expect(e2.optionCalls).toHaveLength(1);
  });
});

describe("the person's own name", () => {
  const P: Profile = { ...PROFILE, personName: 'Dennis' };
  it('is swapped before the cloud and caught by the leak check', () => {
    const s = stripQuestion('Are you comfy, Dennis, or shall I get a blanket?', P);
    expect(s.text).toBe('Are you comfy, Person A, or shall I get a blanket?');
    expect(findLeaks('Are you comfy, Dennis?', P)).toContain('Dennis');
  });
  it('a cloud-routed question with the name sends no name', async () => {
    const e = new Fake({ topic: 'x', kind: 'choice', choices: ['happy', 'fine', 'sad'] }, null, { topic: 'x', kind: 'choice', choices: ['the garden', 'a film'] });
    await makeCard('What would cheer you up, Dennis?', env(e, P));
    expect(e.cloudCalls).toEqual(['What would cheer you up, Person A?']);
  });
  it('the device prompt knows it', () => {
    expect(aboutBlock(P)).toContain('The person is Dennis.');
  });
  it('a vocative name does not break an either-or', async () => {
    const e = new Fake(yesno, null);
    const c = await makeCard('Are you comfy, Dennis, or shall I get a blanket?', env(e, P));
    expect(c.kind).toBe('choice');
    expect(labels(c)).not.toContain('yes');
  });
});

describe('KB §7 rule 9: memory and quiz questions, wider', () => {
  it.each([
    'How old is your sister now?', 'What was the name of the hotel in Tenby?', 'Remember when we went to Skye, what year was that?',
    "What's today's date?", 'What time is it, do you know?', 'Do you remember who came to the wedding?',
    'Is the dentist on Monday or Tuesday, do you remember?', 'How many grandchildren have we got?', "When's Mia's birthday?",
    'Who was that man from the bank?', 'When did we move into this house?', 'What month is it?',
  ])('quiz: %s', (q) => expect(isQuiz(q)).toBe(true));

  it.each([
    'What did you remember most about Skye?', 'Remember to take your coat?', 'How many sugars do you want?', 'What time do you want lunch?', 'Who do you want to ring?',
    'When do you want to go to the shops?', 'How old do you feel today?', 'When was the last time you had a drink?', 'What would you like for tea?',
  ])('not a quiz: %s', (q) => expect(isQuiz(q)).toBe(false));
});

describe('no escape-only cards', () => {
  it('fewer than two answers after the cloud: just ask normally, no card', async () => {
    const e = new Fake({ topic: 'x', kind: 'choice', choices: ['happy'] }, null, { topic: 'x', kind: 'choice', choices: ['Place Z'] });
    const c = await makeCard('Who do you fancy on the quiz show?', env(e));
    expect(c.choices).toEqual([]);
    expect(c.say).toBe('Just ask normally: Who do you fancy on the quiz show?');
    expect(c.blocked).toBeTruthy();
  });
});
