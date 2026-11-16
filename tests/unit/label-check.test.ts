// build spec §2.5, the label check table: applied to the model's copied options and to the code parser's pair.
// A side is rewritten (whole noun phrase, About-me item, shared time words dropped, the person's side) or rejected
// (a question, a leftover, a pronoun, a negative, too long); the pair is rejected when the sides are the same, synonyms,
// or not on one axis. Written 11 Nov 2026; all examples new.
import { describe, expect, it } from 'vitest';
import type { DeviceStatus, Engine, ModelResult } from '../../core/engine';
import { makeCard } from '../../core/pipeline';
import { cloudTextRequest, pictureRequestBody } from '../../core/requests';
import { checkPair, codePair, isTimeOnly, validateOptions } from '../../core/rules';
import type { ModelOutput, Profile } from '../../core/types';
import { PROFILE } from './fixtures';

const LAKE: Profile = { ...PROFILE, places: ['the cottage up at the lake', 'the bowling green'], tv: ['Country Calendar'], music: ['Johnny Cash'] };

describe('rewrites', () => {
  it('keeps the whole noun phrase as the question has it', () => {
    expect(checkPair(['fish chips', 'pie'], 'Fish and chips or a pie?')).toEqual(['fish and chips', 'pie']);
    expect(checkPair(['mince toast', 'soup'], 'Mince on toast or soup for tea?')).toEqual(['mince on toast', 'soup']);
  });
  it('snaps a side to the About-me item written in full in the question', () => {
    expect(checkPair(['cottage', 'hotel'], 'Do you want the cottage up at the lake or a hotel?', LAKE)).toEqual(['cottage up at the lake', 'hotel']);
    expect(checkPair(['Calendar', 'Cash'], 'Country Calendar or Johnny Cash tonight?', LAKE)).toEqual(['Country Calendar', 'Johnny Cash']);
  });
  it('drops a time phrase shared by both sides instead of gluing it to one', () => {
    expect(checkPair(['Raglan beach', 'garden centre this weekend'], 'Raglan beach or the garden centre this weekend?')).toEqual(['Raglan beach', 'garden centre']);
    expect(checkPair(['porridge', 'toast this morning'], 'Porridge or toast this morning?')).toEqual(['porridge', 'toast']);
  });
  it('a phrase that only looks like a time tail is kept', () => {
    expect(checkPair(['walk to the shops', 'stay in the warm'], 'Do you want to walk to the shops or stay in the warm?')).toEqual(['walk to the shops', 'stay in the warm']);
  });
  it("writes from the person's side with names when a pronoun would flip", () => {
    expect(checkPair(['you paid it', 'I paid it'], 'Was it you paid it or I paid it?', PROFILE)).toEqual(['Alan paid it', 'Maria paid it']);
    expect(checkPair(['you paid it', 'I paid it'], 'Was it you paid it or I paid it?')).toEqual(['you paid it', 'I paid it']); // no names known: left as typed
  });
  it('strips a leading article', () => {
    expect(checkPair(['the news', 'a film'], 'The news or a film?')).toEqual(['news', 'film']);
  });
});

describe('rejections', () => {
  it('a dangling function word is cut, as the spec\'s "Good" column shows ("lamb roast for" -> "lamb roast")', () => {
    expect(checkPair(['lamb roast for', 'a nap'], 'Lamb roast for tea or a nap?')).toEqual(['lamb roast', 'nap']);
  });
  it.each([
    [['going to have', 'a nap'], 'Are you going to have a bath or a nap?', 'a verb fragment'],
    [['one', 'grey'], 'This one or the grey?', 'a pronoun'],
    [['it', 'that'], 'It or that?', 'a pronoun'],
    [['will I do it', 'will I cancel it'], 'Will I do it or will I cancel it?', 'a question'],
    [['is something bothering you', 'tired'], 'Is something bothering you or are you tired?', "the partner's question words"],
    [['sick of losing', "don't mind"], 'Sick of losing or don\'t mind?', 'a negative and an idiom'],
    [['walk along the front by the pier', 'home'], 'Walk along the front by the pier or home?', 'more than five words'],
    [['soup', 'soup'], 'Soup or soup?', 'the same twice'],
    [['tired', 'sleepy'], 'Tired or sleepy?', 'synonyms'],
    [['the hospital', 'Thursday'], 'The hospital or Thursday?', 'not on one axis'],
    [['', 'tea'], 'Or tea?', 'an empty side'],
  ] as [[string, string], string, string][])('%j (%s)', (pair, q) => {
    expect(checkPair(pair, q)).toBeNull();
  });

  it('both sides on one axis: two times, or two things', () => {
    expect(checkPair(['Tuesday', 'Thursday'], 'Tuesday or Thursday?')).toEqual(['Tuesday', 'Thursday']);
    expect(checkPair(['after lunch', '3 pm'], 'After lunch or 3 pm?')).toEqual(['after lunch', '3 pm']);
    expect(isTimeOnly('after your nap')).toBe(false);
    expect(isTimeOnly('Thursday')).toBe(true);
    expect(isTimeOnly('the hospital')).toBe(false);
  });
});

describe('both sources go through the same check', () => {
  it("the model's copied options", () => {
    expect(validateOptions(['you paid it', 'I paid it'], 'Was it you paid it or I paid it?', PROFILE)).toEqual(['Alan paid it', 'Maria paid it']);
    expect(validateOptions(['hospital', 'Thursday'], 'The hospital or Thursday?', PROFILE)).toBeNull();
    expect(validateOptions(['garden centre this weekend', 'beach'], 'The beach or the garden centre this weekend?', PROFILE)).toEqual(['garden centre', 'beach']);
  });
  it("the code parser's pair", () => {
    expect(codePair('Raglan beach or the garden centre this weekend?')).toEqual(['Raglan beach', 'garden centre']);
    expect(codePair('Do you want the cottage up at the lake or a hotel?', LAKE)).toEqual(['cottage up at the lake', 'hotel']);
    expect(codePair('Tired or sleepy?')).toBeNull();
    expect(codePair('Shall we try the hospital, or Thursday?')).toBeNull();
  });
});

class Fake implements Engine {
  label = 'fake';
  modes = { device: 'ONLY_ON_DEVICE', cloud: 'PREFER_IN_CLOUD', pictures: 'ONLY_IN_CLOUD' };
  cloudConfigured = true;
  cloudCalls: string[] = [];
  constructor(private dev: ModelOutput, private cloud: ModelOutput = { topic: 'x', kind: 'choice', choices: ['one thing', 'another thing'] }) {}
  async deviceStatus(): Promise<DeviceStatus> { return 'available'; }
  async prepareDevice() {}
  async runDevice(): Promise<ModelResult> { return { text: JSON.stringify(this.dev), source: 'on-device', ms: 3 }; }
  cloudRequest(q: string) { return cloudTextRequest(q); }
  async runCloud(q: string): Promise<ModelResult> { this.cloudCalls.push(q); return { text: JSON.stringify(this.cloud), source: 'in-cloud', ms: 3 }; }
  pictureRequest(w: string) { return pictureRequestBody(w); }
  async picture() { return null; }
}
const env = (engine: Engine, allowCloud = true) => ({ profile: PROFILE, support: 'more' as const, engine, allowCloud, deviceReady: true });
const labels = (c: { choices: { label: string }[] }) => c.choices.map((x) => x.label);

describe('on a card', () => {
  it('a pair the check rejects goes to the cloud (consent on) or is blocked (consent off), never shown as is', async () => {
    const q = 'Shall we try the hospital, or Thursday?';
    const e = new Fake({ topic: 'x', kind: 'choice', choices: ['yes', 'no'], options: ['the hospital', 'Thursday'] }, { topic: 'appointment', kind: 'choice', choices: ['hospital', 'Thursday'] });
    const sent = await makeCard(q, env(e));
    expect(e.cloudCalls).toHaveLength(1);
    expect(sent.route.reasons).toContain('either-or options not found');
    expect(labels(sent)).not.toContain('yes');
    const off = await makeCard(q, env(new Fake({ topic: 'x', kind: 'choice', choices: ['yes', 'no'], options: ['the hospital', 'Thursday'] }), false));
    expect(off.blocked).toBeTruthy();
    expect(off.choices).toEqual([]);
  });

  it('the shared time phrase is in the headline, not on a tile', async () => {
    const c = await makeCard('Raglan beach or the garden centre this weekend?', env(new Fake({ topic: 'weekend', kind: 'choice', choices: ['beach', 'garden centre this weekend'], options: ['Raglan beach', 'garden centre this weekend'] })));
    expect(labels(c)).toEqual(['Raglan beach', 'garden centre', 'something else']);
    expect(c.topic).toBe('this weekend');
    expect(c.say).toBe('Raglan beach or the garden centre this weekend? Raglan beach, garden centre, or something else?');
  });
});
