// Phase 18b (a live walk in Chrome with Gemini Nano on a desktop, 24 Nov 2026): Food & drink, "Are you hungry?" yes,
// "a snack or a meal?", "something else", the first letters of "stew": S gave sandwich, soup, sausages; ST gave
// strawberries, steam, stir (two of three are not food: the AI's words were checked for the letters, not for the
// topic); STE gave steamer, steaks, and "stew" never came. Written before the code (failing first):
//   1. every topic's own words are many more, so the rules reach a common word in three letters or fewer;
//   2. inside a known topic an AI word stays only when it is a word of the topic, or the model named it a word of the
//      topic's kind (the letter step's schema has a kind for each word); the rules' words come first;
//   3. a health place found by its letters leads on as the doctor does (pain first).
import { describe, expect, it } from 'vitest';
import { NullEngine, type DeviceStatus, type Engine, type ModelResult } from '../../core/engine';
import { LETTER_CLOUD_TASK, LETTER_CLOUD_TASK_MORE, NO_MODEL_TOPICS, TOPIC_WORDS, letterCard, letterCloudText, letterDeviceAsk, letterEnd, letterPairsOf, letterTopic } from '../../core/letter';
import { subjectOf } from '../../core/kinds';
import { makeCard } from '../../core/pipeline';
import { LETTER_KINDS, LETTER_SCHEMA, LETTER_SYSTEM_PROMPT } from '../../core/prompt';
import { cloudTextRequest, letterRequest } from '../../core/requests';
import { SAMPLE_PROFILE } from '../../core/sample';
import { topicOf } from '../../core/topics';
import { EMPTY_PROFILE, type Card, type Profile } from '../../core/types';

const P = SAMPLE_PROFILE;
const words = (c: Card) => c.choices.filter((x) => x.role === 'answer').map((x) => x.spoken);
const bare = (s: string) => s.toLowerCase().trim().replace(/^(?:the|a|an|my|your|our|some)\s+/, '');

describe('1. every topic has many more words of its own', () => {
  const min: Record<string, number> = { food: 250, drink: 60, plans: 120, fun: 120, rest: 30, people: 50 };
  for (const [topic, n] of Object.entries(min)) {
    it(`${topic}: at least ${n} plain words, each once, in lower case, no alcohol, tobacco or medicine`, () => {
      const ws = TOPIC_WORDS[topic];
      expect(ws.length, topic).toBeGreaterThanOrEqual(n);
      expect(new Set(ws.map(bare)).size, `${topic}: a word twice`).toBe(ws.length);
      for (const w of ws) {
        expect(w, w).toBe(w.toLowerCase());
        expect(w, w).toMatch(/^[a-z][a-z' -]*[a-z]$/);
        // (ginger ale is a soft drink, on the list since phase 17b)
        if (w !== 'ginger ale') expect(w, w).not.toMatch(/\b(?:beer|wine|whisky|whiskey|vodka|gin|rum|brandy|cider|lager|ale|alcohol|cigarettes?|tobacco|pills?|tablets?|medicines?|medication)\b/);
      }
    });
  }
  it('the words asked for by the walk are there', () => {
    for (const w of ['stew', 'steak', 'salmon', "shepherd's pie", 'stir fry', 'scrambled eggs', 'beef', 'burger', 'burrito', 'curry', 'chili', 'meatloaf', 'mashed potatoes', 'macaroni and cheese', 'tacos', 'hot dog', 'ribs', 'roast chicken', 'turkey', 'toast', 'bagel', 'crackers', 'peanut butter']) expect(TOPIC_WORDS.food, w).toContain(w);
    for (const w of ['church', 'garden centre', 'park', 'shops', 'pharmacy', 'library', 'hairdresser', "doctor's"]) expect(TOPIC_WORDS.plans, w).toContain(w);
    for (const w of ['snooker', 'darts', 'bingo', 'crosswords', 'knitting', 'gardening', 'news', 'quiz shows']) expect(TOPIC_WORDS.fun, w).toContain(w);
  });
  it('the body and feelings keep their short lists, and stay rules only', () => {
    expect(TOPIC_WORDS.body).toEqual(['toilet', 'glasses', 'hearing aid', 'wash', 'pain', 'doctor', 'nurse', 'bath', 'shower', 'teeth', 'blanket']);
    expect(TOPIC_WORDS.feel).toEqual(['tired', 'worried', 'company', 'happy', 'sad', 'lonely', 'bored', 'scared']);
    expect(NO_MODEL_TOPICS).toEqual(['body', 'feel']);
  });
});

/** The screen's way: the first card's words refused, then one letter, then "Add the next letter" until the target shows. */
async function reach(question: string, target: string, profile: Profile, pre: string[] = []): Promise<{ letters: string; cards: string[][]; topic: string | null }> {
  const first = await makeCard(question, { profile, support: 'more', engine: new NullEngine(), allowCloud: false, deviceReady: false });
  const shown: string[] = [...pre];
  for (let p: Card | null | undefined = first; p; p = p.nextPage) shown.push(...words(p));
  expect(shown.map(bare), `${target} must not be on the first card`).not.toContain(bare(target));
  const topic = topicOf(question, profile)?.id ?? null;
  const cards: string[][] = [];
  let rejected = [...shown];
  for (let n = 1; n <= 3; n++) {
    const letters = target.slice(0, n).toUpperCase();
    const c = await letterCard({ asked: question, letter: letters, rejected, topic }, { profile, support: 'more', engine: new NullEngine(), allowCloud: false, deviceReady: false });
    const ws = words(c);
    cards.push(ws);
    if (ws.some((w) => bare(w) === bare(target))) return { letters, cards, topic: letterTopic(topic, subjectOf(question, rejected)) };
    rejected = [...rejected, ...ws];
  }
  return { letters: '', cards, topic };
}

const TARGETS: { topic: string; question: string; target: string }[] = [
  { topic: 'food', question: 'Would you like a snack or a meal?', target: 'stew' },
  { topic: 'food', question: 'Would you like a snack or a meal?', target: 'steak' },
  { topic: 'food', question: 'Would you like a snack or a meal?', target: 'burrito' },
  { topic: 'food', question: 'Would you like a snack or a meal?', target: 'curry' },
  { topic: 'food', question: 'Would you like a snack or a meal?', target: 'salmon' },
  { topic: 'food', question: 'Would you like a snack or a meal?', target: 'meatloaf' },
  { topic: 'drink', question: 'Would you like water, juice or milk?', target: 'lemonade' },
  { topic: 'drink', question: 'Would you like water, juice or milk?', target: 'cranberry juice' },
  { topic: 'plans', question: 'Would you like to stay in or go out?', target: 'garden centre' },
  { topic: 'plans', question: 'Would you like to stay in or go out?', target: 'pharmacy' },
  { topic: 'plans', question: 'Would you like to stay in or go out?', target: 'library' },
  { topic: 'fun', question: 'Would you like to watch the news or a film?', target: 'snooker' },
  { topic: 'fun', question: 'Would you like to watch the news or a film?', target: 'bingo' },
  { topic: 'fun', question: 'Would you like to watch the news or a film?', target: 'knitting' },
  { topic: 'rest', question: 'Would you like to rest in the bed or the chair?', target: 'recliner' },
  { topic: 'people', question: 'Would you like company, or some time alone?', target: 'grandma' },
];

describe('1b. a hidden target is reached by the rules alone, in three letters or fewer', () => {
  for (const k of TARGETS) {
    it(`${k.topic}: "${k.question}" then "something else": "${k.target}" by its letters, every word of the topic`, async () => {
      const w = await reach(k.question, k.target, P);
      expect(w.letters, JSON.stringify(w.cards)).not.toBe('');
      expect(w.topic).toBe(k.topic);
      const own = [...P.foods, ...P.places, ...P.tv, ...P.music, ...P.people.flatMap((x) => [x.name, x.nickname ?? ''])].map(bare);
      const ok = [...TOPIC_WORDS[k.topic], ...(k.topic === 'drink' || k.topic === 'food' ? [...TOPIC_WORDS.drink, ...TOPIC_WORDS.food] : [])].map(bare);
      for (const ws of w.cards) for (const x of ws) expect([...ok, ...own], `${k.topic}: "${x}"`).toContain(bare(x));
    });
  }
  it('the walk of 24 Nov: "Are you hungry?" yes, "a snack or a meal?", "something else": ST holds stew, never steam or stir', async () => {
    const c = await letterCard({ asked: 'Would you like a snack or a meal?', letter: 'ST', rejected: ['snack', 'meal', 'sandwich', 'soup', 'salad'], topic: 'food' }, { profile: P, support: 'more', engine: new NullEngine(), allowCloud: false, deviceReady: false });
    expect(words(c)).toContain('stew');
    for (const w of ['steam', 'stir', 'steamer']) expect(words(c)).not.toContain(w);
  });
});

/** A model that answers with the same words: on the card's schema (no kind of each word). */
class Basic implements Engine {
  label = 'off-topic'; modes = { device: 'ONLY_ON_DEVICE', cloud: 'PREFER_IN_CLOUD' }; cloudConfigured = true;
  device: string[] = []; cloud: string[] = []; card = 0;
  constructor(protected ws: string[], protected kinds: string[] | null) {}
  async deviceStatus(): Promise<DeviceStatus> { return 'available'; }
  async prepareDevice() {}
  async runDevice(p: string): Promise<ModelResult> { this.card++; this.device.push(p); return { text: JSON.stringify({ topic: '', kind: 'choice', choices: this.ws.slice(0, 3) }), source: 'on-device', ms: 2 }; }
  cloudRequest(q: string) { return cloudTextRequest(q); }
  async runCloud(q: string): Promise<ModelResult> { this.cloud.push(q); return { text: JSON.stringify({ topic: '', kind: 'choice', choices: this.ws.slice(0, 3) }), source: 'in-cloud', ms: 2 }; }
}
/** With the cloud letter step: `{"kind", "words", "kinds"}`. */
class OffTopic extends Basic {
  letterRequest(t: string) { return letterRequest(t); }
  async runLetter(t: string): Promise<ModelResult> { this.cloud.push(t); return { text: JSON.stringify({ kind: 'food', words: this.ws, ...(this.kinds ? { kinds: this.kinds } : {}) }), source: 'in-cloud', ms: 2 }; }
}
describe('2. inside a known topic, an AI word stays only when it is of the topic', () => {
  const I = { asked: 'Would you like a snack or a meal?', letter: 'STE', rejected: ['snack', 'meal'], topic: 'food' };
  const env = (e: Engine, o: { device?: boolean; cloud?: boolean }) => ({ profile: EMPTY_PROFILE, support: 'more' as const, engine: e, allowCloud: !!o.cloud, deviceReady: !!o.device });
  it('the letter step\'s schema has a kind for each word, from the same closed list; the instructions say so', () => {
    expect(LETTER_SCHEMA.properties.kinds).toMatchObject({ type: 'array', items: { type: 'string', enum: LETTER_KINDS }, minItems: 4, maxItems: 4 });
    expect(LETTER_SCHEMA.required).toContain('kinds');
    expect(LETTER_SYSTEM_PROMPT).toMatch(/"kinds"/);
  });
  it('the request says which words, when the topic is known: only food words (dishes and foods), on this device and online', () => {
    const t = letterCloudText(I.asked, I.letter, EMPTY_PROFILE, 'food').text;
    expect(t).toMatch(/Only food and drink words \(dishes, foods and drinks\)/);
    expect(t.endsWith(LETTER_CLOUD_TASK_MORE)).toBe(true);
    expect(letterCloudText(I.asked, 'S', EMPTY_PROFILE, 'food').text.endsWith(LETTER_CLOUD_TASK)).toBe(true);
    expect(letterDeviceAsk(I)).toMatch(/Only food and drink words \(dishes, foods and drinks\)/);
    expect(letterCloudText('What is it?', 'X', EMPTY_PROFILE, null).text).not.toMatch(/Only /);
  });
  it('the answer is read with its kinds: {"words", "kinds"}; without kinds, none', () => {
    expect(letterPairsOf('{"kind":"food","words":["steam","stew"],"kinds":["other","food"]}')).toEqual([{ word: 'steam', kind: 'other' }, { word: 'stew', kind: 'food' }]);
    expect(letterPairsOf('{"topic":"","kind":"choice","choices":["steam","stew"]}')).toEqual([{ word: 'steam', kind: null }, { word: 'stew', kind: null }]);
  });
  it('online after the yes: "steam" and "stir" (kind other) are dropped under food; "steamed pudding" (kind food) stays; the rules\' words first', async () => {
    const e = new OffTopic(['steam', 'stir', 'steamed pudding', 'steering'], ['other', 'other', 'food', 'other']);
    const c = await letterCard({ ...I, letter: 'STE' }, env(e, { cloud: true }));
    expect(words(c)).toContain('steamed pudding');
    for (const w of ['steam', 'stir', 'steering']) expect(words(c)).not.toContain(w);
    expect(c.why?.dropped.find((d) => d.label === 'steam')?.rule).toMatch(/not a word of the topic/);
    expect(words(c)[0]).toBe('stew');
  });
  it('a model that names no kind (an engine without the letter step): only words the app knows for the topic stay', async () => {
    const e = new Basic(['steam', 'stir', 'steak'], null);
    const c = await letterCard({ ...I, letter: 'ST' }, env(e, { device: true }));
    expect(e.card).toBe(1);
    expect(words(c)).not.toContain('steam');
    expect(words(c)).not.toContain('stir');
    const cloud = new Basic(['steam', 'stir', 'stew'], null);
    const c2 = await letterCard({ ...I, letter: 'ST' }, env(cloud, { cloud: true }));
    for (const w of ['steam', 'stir']) expect(words(c2)).not.toContain(w);
  });
  it('a kind that is wrong is still checked against what the app knows: a word of another topic ("shower", "shops" said to be food) is dropped', async () => {
    const e = new OffTopic(['shower', 'shops', 'shortbread', 'shoes'], ['food', 'food', 'food', 'other']);
    const c = await letterCard({ ...I, letter: 'SH' }, env(e, { cloud: true }));
    for (const w of ['shower', 'shops', 'shoes']) expect(words(c)).not.toContain(w);
  });
  it('with no topic known, the kinds do not narrow: a word of any kind that starts with the letter can stand', async () => {
    const e = new OffTopic(['xylophone', 'x-ray', 'xmas', 'xerox'], ['activity', 'other', 'other', 'other']);
    const c = await letterCard({ asked: 'What is it?', letter: 'X', rejected: [] }, env(e, { cloud: true }));
    expect(words(c)).toEqual(expect.arrayContaining(['xylophone', 'x-ray']));
  });
});

describe('3. a health place found by its letters leads on as the doctor does', () => {
  for (const w of ["doctor's", 'hospital', 'pharmacy', 'dentist', 'chemist', 'clinic']) {
    it(`"${w}": pain first, never only "a word"`, () => {
      expect(letterEnd(w).follow).toEqual(['Are you in pain?']);
      expect(letterEnd(w).end).not.toMatch(/yes or no question about it next/);
    });
  }
});

// Phase 18c (the coordinator's live test of 7d7a8fe in desktop Chrome with Gemini Nano, 24 Nov 2026: Food & drink,
// "Are you hungry?" yes, "a snack or a meal?", "something else", S, "something else", "Add the next letter", T: the
// person's screen stayed empty for over 3 minutes; the on-device letter step on its own schema never answered).
// Written before the fix: every model call on the letter path has the hard wait of the other steps, and when it runs
// out or fails the rules' words show at once; the device stays on the card's schema, which Nano answers.
/** A model that never answers, on this device and online. */
class Never implements Engine {
  label = 'never'; modes = { device: 'ONLY_ON_DEVICE', cloud: 'PREFER_IN_CLOUD' }; cloudConfigured = true;
  device = 0; cloud = 0; letterStep = 0;
  async deviceStatus(): Promise<DeviceStatus> { return 'available'; }
  async prepareDevice() {}
  runDevice(): Promise<ModelResult> { this.device++; return new Promise<never>(() => { /* never settles */ }); }
  cloudRequest(q: string) { return cloudTextRequest(q); }
  runCloud(): Promise<ModelResult> { this.cloud++; return new Promise<never>(() => { /* never settles */ }); }
  letterRequest(t: string) { return letterRequest(t); }
  runLetter(): Promise<ModelResult> { this.cloud++; return new Promise<never>(() => { /* never settles */ }); }
  /** An engine method the letter path must not use any more (the schema Nano did not answer). */
  letterDevice(): Promise<ModelResult> { this.letterStep++; return new Promise<never>(() => { /* never settles */ }); }
}
/** The walk of the live test, as the screen does it: the first card refused, S, its words refused, then T. */
async function liveWalk(engine: Engine, o: { device?: boolean; cloud?: boolean; wait?: number } = {}) {
  const q = 'Would you like a snack or a meal?';
  const first = await makeCard(q, { profile: P, support: 'more', engine: new NullEngine(), allowCloud: false, deviceReady: false });
  const refused = ['yes', ...words(first)];
  const env = { profile: P, support: 'more' as const, engine, allowCloud: !!o.cloud, deviceReady: !!o.device, deviceWaitMs: o.wait ?? 40, cloudWaitMs: o.wait ?? 40 };
  const s = await letterCard({ asked: q, letter: 'S', rejected: refused, topic: 'food' }, env);
  const st = await letterCard({ asked: q, letter: 'ST', rejected: [...refused, ...words(s)], topic: 'food' }, env);
  return { s, st };
}
describe('4. the letter path never waits for ever (the live test of 24 Nov)', () => {
  it('the exact walk with Gemini Nano that never answers: ST shows the rules\' words (stew among them) when the wait runs out', async () => {
    const e = new Never();
    const t0 = Date.now();
    const { s, st } = await liveWalk(e, { device: true, wait: 40 });
    expect(Date.now() - t0).toBeLessThan(2000);
    expect(words(s).length).toBeGreaterThanOrEqual(2);
    expect(words(st)).toContain('stew');
    expect(st.letter?.by).toBe('rules');
    for (const w of ['steam', 'stir']) expect(words(st)).not.toContain(w);
    expect(e.letterStep).toBe(0);
    expect(e.device).toBeGreaterThanOrEqual(1);
    expect(st.trace?.find((t) => t.step === 'private')?.ran).toBe('failed');
  });
  it('the same walk online after the yes, with an answer that never comes: the rules\' words when the wait runs out', async () => {
    const e = new Never();
    const { st } = await liveWalk(e, { cloud: true, wait: 40 });
    expect(words(st)).toContain('stew');
    expect(e.cloud).toBeGreaterThanOrEqual(1);
  });
  it('no rules word and a model that never answers: a card that says so, with its ways, never an empty wait', async () => {
    const e = new Never();
    const c = await letterCard({ asked: 'Would you like a snack or a meal?', letter: 'XQ', rejected: [], topic: 'food' }, { profile: P, support: 'more', engine: e, allowCloud: false, deviceReady: true, deviceWaitMs: 40 });
    expect(c.choices).toEqual([]);
    expect(c.blocked).toBeTruthy();
  });
  it('the device leg waits as long as online help does, by default (core/engine.ts, CLOUD_WAIT_MS)', async () => {
    const src = (await import('node:fs')).readFileSync(new URL('../../core/letter.ts', import.meta.url), 'utf8');
    expect(src).toContain('within(engine.runDevice(devicePrompt(letterDeviceAsk(i), profile)), env.deviceWaitMs ?? CLOUD_WAIT_MS)');
    expect(src).not.toMatch(/engine\.letterDevice/);
  });
  it('the fallback on a real Nano-like answer (the card\'s schema, off-topic words): steam and stir dropped, stew from the rules', async () => {
    const e = new Basic(['strawberries', 'steam', 'stir'], null);
    const { st } = await liveWalk(e, { device: true });
    expect(e.card).toBeGreaterThanOrEqual(1);
    expect(words(st)).toContain('stew');
    for (const w of ['steam', 'stir']) expect(words(st)).not.toContain(w);
  });
});
