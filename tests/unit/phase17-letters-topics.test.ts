// Phase 17b (the owner's rule of 24 Nov 2026: "this principle works for ANY topic"): the first letter, and every letter
// added after it, stay inside the topic of the conversation, for EVERY topic of the first screen, not only food.
// For each topic a hidden target that is NOT on the first card is reached by the rules alone (no AI), letter by letter
// as the screen does it ("Add the next letter": the words shown are refused, the letters so far stay), and every word
// on every letter card belongs to the topic. The body and feelings are never handed to a model, even where one is ready.
import { describe, expect, it } from 'vitest';
import { NullEngine, type DeviceStatus, type Engine, type ModelResult } from '../../core/engine';
import { TOPIC_WORDS, letterCard, letterTopic } from '../../core/letter';
import { subjectOf } from '../../core/kinds';
import { makeCard } from '../../core/pipeline';
import { cloudTextRequest } from '../../core/requests';
import { SAMPLE_PROFILE } from '../../core/sample';
import { topicOf } from '../../core/topics';
import type { Card, Profile } from '../../core/types';

const P = SAMPLE_PROFILE;
const words = (c: Card) => c.choices.filter((x) => x.role === 'answer').map((x) => x.spoken);
const bare = (s: string) => s.toLowerCase().trim().replace(/^(?:the|a|an|my|your|our|some)\s+/, '');

/** A model that is always ready and records every call: for the body and feelings it must never be called. */
class Recorder implements Engine {
  label = 'recorder'; modes = { device: 'ONLY_ON_DEVICE', cloud: 'PREFER_IN_CLOUD' }; cloudConfigured = true;
  calls: string[] = [];
  async deviceStatus(): Promise<DeviceStatus> { return 'available'; }
  async prepareDevice() {}
  async runDevice(p: string): Promise<ModelResult> { this.calls.push(p); return { text: JSON.stringify({ topic: '', kind: 'choice', choices: ['sandwich', 'scotch'] }), source: 'on-device', ms: 1 }; }
  cloudRequest(q: string) { return cloudTextRequest(q); }
  async runCloud(q: string): Promise<ModelResult> { this.calls.push(q); return { text: JSON.stringify({ words: ['sandwich'] }), source: 'in-cloud', ms: 1 }; }
}

/** The words a topic may show: its own list and About them's words of that topic. */
function allowed(topic: string, p: Profile): string[] {
  const own: Record<string, string[]> = {
    people: p.people.flatMap((x) => [x.name, x.nickname ?? '']).filter(Boolean),
    food: [...p.foods], drink: [...p.foods], plans: [...p.places], fun: [...p.tv, ...p.music], rest: [], body: [], feel: [],
  };
  // (Food & drink is one topic on the first screen: a drink question shows the drinks first, then its foods)
  return [...TOPIC_WORDS[topic], ...(topic === 'food' || topic === 'drink' ? [...TOPIC_WORDS.drink, ...TOPIC_WORDS.food] : []), ...own[topic]].map(bare);
}

interface Walk { reached: boolean; letters: string; cards: string[][]; topic: string | null }
/** The screen's way: the first card's words refused, then one letter, then "Add the next letter" until the target shows. */
async function reach(question: string, target: string, profile: Profile, engine: Engine = new NullEngine(), device = false): Promise<Walk> {
  const first = await makeCard(question, { profile, support: 'more', engine: new NullEngine(), allowCloud: false, deviceReady: false });
  const shown: string[] = [];
  for (let p: Card | null | undefined = first; p; p = p.nextPage) shown.push(...words(p));
  expect(shown.map(bare), `${target} must not be on the first card`).not.toContain(bare(target));
  const topic = topicOf(question, profile)?.id ?? null;
  const cards: string[][] = [];
  let rejected = [...shown];
  for (let n = 1; n <= Math.min(6, target.replace(/^the\s+/i, '').length); n++) {
    const letters = target.replace(/^the\s+/i, '').slice(0, n).toUpperCase();
    const c = await letterCard({ asked: question, letter: letters, rejected, topic }, { profile, support: 'more', engine, allowCloud: device, deviceReady: device });
    const ws = words(c);
    cards.push(ws);
    // two letters at least, always: the target must still be there when the next letter is added
    if (ws.some((w) => bare(w) === bare(target)) && n >= 2) return { reached: true, letters, cards, topic: letterTopic(topic, subjectOf(question, rejected)) };
    if (!ws.some((w) => bare(w) === bare(target))) rejected = [...rejected, ...ws];
  }
  return { reached: false, letters: '', cards, topic };
}

const CASES: { topic: string; question: string; target: string }[] = [
  { topic: 'food', question: 'Would you like a snack or a meal?', target: 'pancakes' },
  { topic: 'drink', question: 'Would you like water, juice or milk?', target: 'lemonade' },
  { topic: 'people', question: 'Would you like company, or some time alone?', target: 'Tyler' },
  { topic: 'plans', question: 'Would you like to stay in or go out?', target: 'library' },
  { topic: 'fun', question: 'Would you like to watch the news or a film?', target: 'Wheel of Fortune' },
  { topic: 'fun', question: 'Would you like TV or music?', target: 'piano' },
  { topic: 'rest', question: 'Would you like to rest in the bed or the chair?', target: 'sofa' },
  { topic: 'feel', question: 'How are you feeling today?', target: 'scared' },
  { topic: 'body', question: 'Would you like your glasses or your hearing aid?', target: 'shower' },
];

describe('17b. topic-locked letters for every topic: a hidden target reached by the rules, letter by letter', () => {
  for (const k of CASES) {
    it(`${k.topic}: "${k.question}" then "something else": ${k.target} is reached, and every word is of the topic`, async () => {
      const w = await reach(k.question, k.target, P);
      expect(w.reached, JSON.stringify(w.cards)).toBe(true);
      expect(w.topic).toBe(k.topic);
      const ok = allowed(k.topic, P);
      for (const ws of w.cards) for (const x of ws) expect(ok, `${k.topic}: "${x}" is not of the topic (${JSON.stringify(w.cards)})`).toContain(bare(x));
      process.stderr.write(`letters ${k.topic}: ${k.target} reached with ${w.letters}: ${w.cards.map((c) => c.join(', ')).join(' | ')}\n`);
    });
  }
  it('people: B gives the family (Beth) and family words, never the dog, a food or a place', async () => {
    const c = await letterCard({ asked: 'Would you like company, or some time alone?', letter: 'B', rejected: [], topic: 'people' }, { profile: P, support: 'more', engine: new NullEngine(), allowCloud: false, deviceReady: false });
    expect(words(c)[0]).toBe('Beth');
    expect(words(c)).not.toContain('Bo');
    expect(words(c).join(' ')).not.toMatch(/biscuit|bread|beach|bank/);
  });
  it('drink: L is lemonade first (drinks before the foods of the topic), never the lake; CO narrows to drinks that start with CO', async () => {
    const env = { profile: P, support: 'more' as const, engine: new NullEngine(), allowCloud: false, deviceReady: false };
    const l = words(await letterCard({ asked: 'Would you like tea or coffee?', letter: 'L', rejected: ['tea', 'coffee'], topic: 'food' }, env));
    expect(l[0]).toBe('lemonade');
    expect(l.join(' ')).not.toMatch(/lake|Beth|library/);
    // (live walk 24 Nov on c749bb0: water, juice or milk → something else → L gave lemonade, lamb: a drink question shows drinks only)
    expect(l.join(' ')).not.toMatch(/lamb|lasagne|lettuce|lentil/);
    const co = words(await letterCard({ asked: 'Would you like tea or coffee?', letter: 'CO', rejected: ['tea', 'coffee'], topic: 'food' }, env));
    expect(co.length).toBeGreaterThan(0);
    for (const x of co) expect(x.toLowerCase().startsWith('co')).toBe(true);
  });
  it('plans: "the lake" and "lake" are one word on the card', async () => {
    const c = await letterCard({ asked: 'Would you like to stay in or go out?', letter: 'L', rejected: [], topic: 'plans' }, { profile: P, support: 'more', engine: new NullEngine(), allowCloud: false, deviceReady: false });
    expect(words(c).filter((w) => bare(w) === 'lake')).toHaveLength(1);
  });
  for (const [topic, question, letters] of [['feel', 'How are you feeling today?', 'SC'], ['body', 'Would you like your glasses or your hearing aid?', 'SH'], ['body', 'Are you comfortable?', 'S'], ['feel', 'Is something bothering you?', 'S']] as const) {
    it(`${topic}: "${question}" with ${letters}: the rules only, never a model, even where one is ready; nothing unrelated`, async () => {
      const e = new Recorder();
      const c = await letterCard({ asked: question, letter: letters, rejected: [], topic }, { profile: P, support: 'more', engine: e, allowCloud: true, deviceReady: true });
      expect(e.calls).toEqual([]);
      for (const x of words(c)) expect(TOPIC_WORDS[topic].map(bare), `${topic}: ${x}`).toContain(bare(x));
      expect(words(c)).not.toContain('sandwich');
    });
  }
});
