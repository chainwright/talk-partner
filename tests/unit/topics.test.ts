// The topics on the first screen (core/topics.ts): every question in the list makes its card by the rules alone, with
// no model and nothing sent, for three families (an empty About them, the sample family, the test fixture); the one
// open question is the exception and is marked. The family's own questions are added, never swapped in. After an
// answer there is a next question wherever a "yes" would otherwise lead nowhere.
import { describe, expect, it } from 'vitest';
import type { DeviceStatus, Engine, ModelResult } from '../../core/engine';
import { bodyDetailCard, makeCard, needsNoModel } from '../../core/pipeline';
import { cloudTextRequest } from '../../core/requests';
import { SAMPLE_PROFILE } from '../../core/sample';
import { AI_QUESTION, HOW_BAD, TOPIC_BASE, WHAT_BOTHERS, WHERE_HURTS, WHICH_SIDE, asksWho, awayNames, callQuestion, followUps, nextInTopic, offersRefused, ownQuestions, topicOf, topics } from '../../core/topics';
import { EMPTY_PROFILE, type Card, type Profile } from '../../core/types';
import { PROFILE } from './fixtures';

/** Every model call is refused and counted: a card that still comes out was made by the rules. */
class Refuse implements Engine {
  label = 'refuse';
  modes = { device: 'ONLY_ON_DEVICE', cloud: 'PREFER_IN_CLOUD' };
  cloudConfigured = true;
  calls: string[] = [];
  async deviceStatus(): Promise<DeviceStatus> { return 'available'; }
  async prepareDevice() {}
  async runDevice(): Promise<ModelResult> { this.calls.push('device'); throw new Error('no'); }
  cloudRequest(q: string) { return cloudTextRequest(q); }
  async runCloud(): Promise<ModelResult> { this.calls.push('cloud'); throw new Error('no'); }
}
const FAMILIES: [string, Profile][] = [['empty', { ...EMPTY_PROFILE, people: [] }], ['sample (Frank)', SAMPLE_PROFILE], ['fixture (Alan)', PROFILE]];
const ask = async (q: string, profile: Profile) => { const e = new Refuse(); const c = await makeCard(q, { profile, support: 'more', engine: e, allowCloud: true, deviceReady: true }); return { c, e }; };
const labels = (c: Card) => c.choices.map((x) => x.label);

describe('the topic list', () => {
  it('seven topics, 41 generic questions, one of them open', () => {
    expect(TOPIC_BASE.map((t) => t.label)).toEqual(['Food & drink', 'Body & care', 'Rest & sleep', 'People & family', 'Feelings', 'Today & plans', 'TV, music & hobbies']);
    const all = TOPIC_BASE.flatMap((t) => t.questions);
    expect(all).toHaveLength(41);
    expect(new Set(all).size).toBe(41);
    expect(all.filter((q) => q === AI_QUESTION)).toHaveLength(1);
    for (const t of TOPIC_BASE) { expect(t.questions.length).toBeGreaterThanOrEqual(5); expect(t.questions.length).toBeLessThanOrEqual(7); }
  });
  it('every question asks one thing: one question mark, at most twelve words, no "and"', () => {
    for (const q of TOPIC_BASE.flatMap((t) => t.questions)) {
      expect(q.split('?').length - 1, q).toBe(1);
      expect(q.split(/\s+/).length, q).toBeLessThanOrEqual(12);
      expect(q, q).not.toMatch(/\band\b/i);
    }
  });
  it('no memory test and nothing about tablets in the list', () => {
    for (const q of TOPIC_BASE.flatMap((t) => t.questions)) expect(q).not.toMatch(/remember|have you taken|tablets|pills|what day|feeling down/i);
  });
  for (const [name, profile] of FAMILIES) {
    it(`${name}: 40 of the 41 generic questions, and every own question, make a card by the rules with no model call`, async () => {
      const list = topics(profile).flatMap((t) => t.questions);
      let byRules = 0;
      for (const { q, ai } of list) {
        const { c, e } = await ask(q, profile);
        if (ai) { expect(needsNoModel(q, profile), q).toBe(false); expect(e.calls, q).not.toEqual([]); continue; }
        expect(needsNoModel(q, profile), q).toBe(true);
        expect(e.calls, q).toEqual([]);
        expect(c.blocked, q).toBeFalsy();
        expect(c.source, q).toBe('code');
        expect(c.cloudPayload, q).toBeNull();
        expect(c.choices.filter((x) => x.role === 'answer').length, q).toBeGreaterThanOrEqual(2);
        expect(c.choices.filter((x) => x.role === 'answer').length, q).toBeLessThanOrEqual(3);
        expect(c.choices.filter((x) => x.role === 'escape'), q).toHaveLength(1);
        expect(c.pending, q).toBeNull();
        expect(c.topic, q).not.toMatch(/^(?:question|which one|choices)$/);
        byRules++;
      }
      expect(byRules).toBe(list.length - 1);
      expect(list.filter((x) => !x.own)).toHaveLength(41);
    });
  }
});

describe('the family\'s own questions are added under the generic one, never in its place', () => {
  it('with an empty About them there is none', () => {
    expect(ownQuestions({ ...EMPTY_PROFILE, people: [] })).toEqual([]);
    expect(topics({ ...EMPTY_PROFILE, people: [] }).flatMap((t) => t.questions).some((q) => q.own)).toBe(false);
  });
  it('"tea or coffee" is always there, and the family\'s foods come right after it', () => {
    for (const [, profile] of FAMILIES) {
      const food = topics(profile).find((t) => t.id === 'food')!.questions.map((x) => x.q);
      expect(food).toContain('Would you like tea or coffee?');
    }
    const food = topics(SAMPLE_PROFILE).find((t) => t.id === 'food')!.questions;
    const i = food.findIndex((x) => x.q === 'Would you like tea or coffee?');
    expect(food[i + 1]).toEqual({ q: 'Would you like pot roast or chili?', own: true });
  });
  it('every generic question stays in every topic, whatever About them holds', () => {
    for (const [, profile] of FAMILIES) {
      const got = topics(profile);
      for (const t of TOPIC_BASE) expect(got.find((x) => x.id === t.id)!.questions.filter((x) => !x.own).map((x) => x.q)).toEqual(t.questions);
    }
  });
  it('one yes / no "call <name>?" row per person who does not live there, by the name the family uses; nobody who lives there', () => {
    expect(awayNames(SAMPLE_PROFILE)).toEqual(['Jen', 'Tyler']);
    const people = topics(SAMPLE_PROFILE).find((t) => t.id === 'people')!.questions;
    expect(people.map((x) => x.q)).toEqual([
      'Would you like a visitor today?', 'Would you like to see Jen?', 'Do you want to call someone?', 'Would you like to call Jen?', 'Would you like to call Tyler?',
      'Would you like to look at some photos?', 'Would you like company, or some time alone?', 'Would you like me to stay with you?',
    ]);
    expect(people.map((x) => x.q).join(' ')).not.toContain('Carol');
    expect(awayNames(PROFILE)).toEqual(['Grace', 'Leo', 'Peter']);
  });
  it('a call row is one thing at a time: a yes / no card with the name on it, and nothing sent', async () => {
    const { c, e } = await ask('Would you like to call Tyler?', SAMPLE_PROFILE);
    expect(c.kind).toBe('yesno');
    expect(labels(c)).toEqual(['yes', 'no', 'not sure']);
    expect(c.topic).toBe('call Tyler');
    expect(e.calls).toEqual([]);
  });
  it('places, a show and music from About them each add one question', () => {
    const own = ownQuestions(SAMPLE_PROFILE).map((o) => o.q);
    expect(own).toContain('Where would you like to go? The lake or church?');
    expect(own).toContain('Would you like to watch Wheel of Fortune?');
    expect(own).toContain('Would you like to listen to Johnny Cash?');
    expect(ownQuestions({ ...EMPTY_PROFILE, people: [], foods: ['porridge'] }).map((o) => o.q)).toEqual(['Would you like porridge?']);
  });
  it('a card made from the family\'s own foods shows them whole', async () => {
    expect(labels((await ask('Would you like pot roast or chili?', SAMPLE_PROFILE)).c)).toEqual(['pot roast', 'chili', 'something else']);
  });
  it('a question knows its topic and the one after it', () => {
    expect(topicOf('Are you hungry?', EMPTY_PROFILE)?.id).toBe('food');
    expect(topicOf('Would you like to call Jen?', SAMPLE_PROFILE)?.id).toBe('people');
    expect(topicOf('Something I typed?', SAMPLE_PROFILE)).toBeNull();
    expect(nextInTopic('Are you hungry?', EMPTY_PROFILE)).toBe('Would you like something to drink?');
    expect(nextInTopic('Would you like some more?', EMPTY_PROFILE)).toBeNull();
    // (18 Nov, the role-play) after "tea or coffee -> something else" the next question to try never offers a refused
    // choice again, and stays with drinks: not "strong tea with milk or porridge" (tea again, and a food beside a drink)
    const family = { ...EMPTY_PROFILE, foods: ['strong tea with milk', 'porridge', 'ginger biscuits'] };
    expect(nextInTopic('Would you like tea or coffee?', family)).toBe('Would you like strong tea with milk or porridge?');
    expect(nextInTopic('Would you like tea or coffee?', family, ['tea', 'coffee'])).toBe('Would you like a hot drink or a cold drink?');
    expect(offersRefused('Would you like strong tea with milk or porridge?', ['tea', 'coffee'])).toBe(true);
    expect(offersRefused('Would you like a hot drink or a cold drink?', ['hot drink', 'cold drink'])).toBe(true);
    expect(offersRefused('Would you like water, juice or milk?', ['tea', 'coffee'])).toBe(false);
    // every topic question, with its own choices refused: what is tried next never names one of them
    for (const t of topics(family)) for (const x of t.questions) {
      const refused = x.q.replace(/^.*?\b(?:like|want)\b/i, '').replace(/[?]/g, '').split(/,| or /).map((w) => w.trim()).filter((w) => w.split(' ').length <= 3 && w.length > 2);
      const next = nextInTopic(x.q, family, refused);
      if (next) expect(offersRefused(next, refused), `${x.q} -> ${next}`).toBe(false);
    }
    expect(nextInTopic('Would you like water, juice or milk?', family, ['water', 'juice', 'milk'])).toBeNull(); // "some more" is not a drink question
    // the open question is never offered as the next try
    expect(nextInTopic('Do you want to do your exercises now or later?', EMPTY_PROFILE)).toBeNull();
  });
});

describe('after an answer there is a next step where a "yes" would lead nowhere', () => {
  const card = (asked: string, kind: Card['kind'] = 'yesno') => ({ asked, kind });
  it('pain: yes -> where -> which side -> how bad', () => {
    expect(followUps(card('Are you in pain?'), 'yes', EMPTY_PROFILE)).toEqual([WHERE_HURTS]);
    expect(followUps(card('Are you in pain?'), 'no', EMPTY_PROFILE)).toEqual([]);
    const hands = bodyDetailCard('arms', EMPTY_PROFILE, 'more');
    expect(followUps(hands, 'hands', EMPTY_PROFILE)).toEqual([WHICH_SIDE, HOW_BAD]);
    expect(followUps(hands, 'your left arm', EMPTY_PROFILE)).toEqual([HOW_BAD]);
    expect(followUps(bodyDetailCard('legs', EMPTY_PROFILE), 'feet', EMPTY_PROFILE)).toEqual([WHICH_SIDE, HOW_BAD]);
    expect(followUps(bodyDetailCard('head', EMPTY_PROFILE), 'neck', EMPTY_PROFILE)).toEqual([HOW_BAD]);
    expect(followUps(card('Which side?', 'choice'), 'left', EMPTY_PROFILE)).toEqual([HOW_BAD]);
  });
  it('"which side" is a card with left and right on it, in the person\'s own words, by the rules', async () => {
    const { c, e } = await ask(WHICH_SIDE, EMPTY_PROFILE);
    expect(labels(c)).toEqual(['left', 'right', 'something else']);
    expect(c.asked).toBe('Which side?');
    expect(e.calls).toEqual([]);
  });
  it('the body map itself names left and right for arms, legs and chest', () => {
    for (const region of ['arms', 'legs', 'chest'] as const) {
      const all: string[] = [];
      for (let c: Card | null | undefined = bodyDetailCard(region, EMPTY_PROFILE); c; c = c.nextPage) all.push(...labels(c));
      expect(all.some((l) => /\bleft\b/.test(l)) && all.some((l) => /\bright\b/.test(l)), region).toBe(true);
    }
  });
  it('feelings: a "yes" to "is something bothering you" leads to what it is about, one idea with a way out', async () => {
    expect(followUps(card('Is something bothering you?'), 'yes', EMPTY_PROFILE)).toEqual([WHAT_BOTHERS]);
    expect(followUps(card('Are you worried about something?'), 'yes', EMPTY_PROFILE)).toEqual([WHAT_BOTHERS]);
    expect(followUps(card('Is something bothering you?'), 'no', EMPTY_PROFILE)).toEqual([]);
    const { c, e } = await ask(WHAT_BOTHERS, EMPTY_PROFILE);
    expect(labels(c)).toEqual(['body', 'people', 'plans', 'something else']);
    expect(c.blocked).toBeFalsy();
    expect(e.calls).toEqual([]);
    expect(followUps({ asked: 'How are you feeling today?', kind: 'feeling' }, 'bad', EMPTY_PROFILE)).toEqual(['Is something bothering you?', 'Are you in pain?']);
    expect(followUps({ asked: 'How are you feeling today?', kind: 'feeling' }, 'in pain', EMPTY_PROFILE)).toEqual([WHERE_HURTS]);
  });
  it('"call someone": yes leads to one name at a time; with nobody listed the carer types a name', () => {
    expect(followUps(card('Do you want to call someone?'), 'yes', SAMPLE_PROFILE)).toEqual(['Would you like to call Jen?', 'Would you like to call Tyler?']);
    expect(asksWho(card('Do you want to call someone?'), 'yes', SAMPLE_PROFILE)).toBe(false);
    expect(followUps(card('Do you want to call someone?'), 'yes', EMPTY_PROFILE)).toEqual([]);
    expect(asksWho(card('Do you want to call someone?'), 'yes', EMPTY_PROFILE)).toBe(true);
    expect(asksWho(card('Do you want to call someone?'), 'no', EMPTY_PROFILE)).toBe(false);
    expect(callQuestion(' Tyler? ')).toBe('Would you like to call Tyler?');
  });
  it('a typed name makes a yes / no card by the rules, also for a name About them does not know', async () => {
    const { c, e } = await ask(callQuestion('Marguerite'), EMPTY_PROFILE);
    expect(c.kind).toBe('yesno');
    expect(e.calls).toEqual([]);
  });
  it('every follow-up is itself a question the rules make a card for', async () => {
    const seen = new Set<string>();
    const cases: [string, Card['kind'], string][] = [
      ['Are you in pain?', 'yesno', 'yes'], ['Is something bothering you?', 'yesno', 'yes'], ['Would you like something to drink?', 'yesno', 'yes'], ['Are you tired?', 'yesno', 'yes'],
      ['Would you like to lie down?', 'yesno', 'yes'], ['Would you like to stay in or go out?', 'choice', 'go out'], ['Would you like TV or music?', 'choice', 'TV'], ['Would you like TV or music?', 'choice', 'music'],
      ['Are you comfortable?', 'yesno', 'no'], ['Would you like a hot drink or a cold drink?', 'choice', 'hot drink'], ['Would you like a hot drink or a cold drink?', 'choice', 'cold drink'],
      ['Are you hungry?', 'yesno', 'yes'], ['Do you want to call someone?', 'yesno', 'yes'], ['Would you like a visitor today?', 'yesno', 'yes'], ['How are you feeling today?', 'feeling', 'bad'],
    ];
    for (const [asked, kind, label] of cases) for (const q of followUps({ asked, kind }, label, SAMPLE_PROFILE)) seen.add(q);
    for (const q of [WHICH_SIDE, HOW_BAD, WHERE_HURTS]) seen.add(q);
    expect(seen.size).toBeGreaterThanOrEqual(12);
    for (const q of seen) {
      const { c, e } = await ask(q, SAMPLE_PROFILE);
      expect(e.calls, q).toEqual([]);
      expect(c.blocked, q).toBeFalsy();
    }
  });
});
