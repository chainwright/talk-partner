// build spec §5.2 property tests (seeded, repeatable): card invariants over random questions, random model
// output and random engine states, plus the picture gate. Written 11 Nov 2026.
import { describe, expect, it } from 'vitest';
import { COPY } from '../../core/copy';
import type { DeviceStatus, Engine, ModelResult } from '../../core/engine';
import { pictureFor } from '../../core/pictures';
import { makeCard } from '../../core/pipeline';
import { cloudTextRequest } from '../../core/requests';
import { codePair, fromAboutMe, hasNegative } from '../../core/rules';
import { findLeaks, hasPlaceholder, isGenericWord } from '../../core/strip';
import type { Card, ModelOutput, Profile, SupportLevel } from '../../core/types';

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}
const pick = <T,>(r: () => number, xs: T[]) => xs[Math.floor(r() * xs.length)];
const maybe = (r: () => number, p: number) => r() < p;

const PROFILE: Profile = {
  personName: 'Eileen',
  partnerName: 'Gerry',
  people: [
    { id: 'a', name: 'Gerry', relation: 'husband', household: true },
    { id: 'b', name: 'Niamh', relation: 'daughter', household: false },
    { id: 'c', name: 'Cillian', relation: 'grandson', household: false },
    { id: 'd', name: 'Mairead', relation: 'sister', household: false },
  ],
  foods: ['brown bread', 'bacon and cabbage', 'apple tart'],
  places: ['the strand', 'the GAA club', "Mairead's house"],
  tv: ['the Late Late Show', 'the hurling'],
  music: ['Christy Moore', 'the Dubliners'],
  other: ['a collie called Bran'],
};
const PROFILE_WORDS = ['Eileen', 'Gerry', 'Niamh', 'Cillian', 'Mairead', 'cabbage', 'tart', 'strand', 'GAA', 'hurling', 'Christy', 'Dubliners', 'Bran'];

// pools: ordinary things, times, people, plus the kinds of junk a small model produces
const THINGS = ['soup', 'a sandwich', 'the crossword', 'a walk', 'the radio', 'fish and chips', 'a bath', 'the garden', 'the news', 'a nap', 'toast', 'the paper', 'brown bread', 'the strand', 'Christy Moore'];
const ACTIONS = ['go for a walk', 'sit in the garden', 'ring Niamh', 'watch the hurling', 'have a rest', 'put the radio on', 'go to the strand', 'stay in'];
const TIMES = ['now', 'later', 'after lunch', 'this afternoon', 'tonight', 'tomorrow', 'Saturday', 'half past ten', 'before tea'];
const MOODS = ['good', 'bad', 'tired', 'happy', 'fine', 'sad'];
const JUNK = ["don't mind", 'not now', 'both', 'Place A', 'Person B', 'Name A', 'yes', 'no', 'listen music', 'one', 'it', 'Tadhg', 'blue', 'red', 'nothing'];
const PREFIX = ['', '', '', 'Nurse asks: ', 'Carer - ', 'Ma, ', 'Eileen, '];
const SUFFIX = ['', '', '', ', love', ', pet', ', do you know'];

function randomQuestion(r: () => number): string {
  const kind = Math.floor(r() * 10);
  let q: string;
  switch (kind) {
    case 0: q = `${pick(r, ['Do you want', 'Shall I get you', 'Would you like', 'Are you ready for', 'Have you had'])} ${pick(r, THINGS)}`; break;
    case 1: q = `${pick(r, ['Do you want', 'Would you rather have', '', 'Shall we have'])} ${pick(r, THINGS)} or ${pick(r, THINGS)}`.trim(); break;
    case 2: q = `Do you want to ${pick(r, ACTIONS)}, or would you rather ${pick(r, ACTIONS)}`; break;
    case 3: q = `What do you want to ${pick(r, ['do', 'eat', 'watch', 'listen to', 'have'])} ${pick(r, TIMES)}`; break;
    case 4: q = `Who should we ${pick(r, ['ring', 'invite', 'visit', 'ask'])} ${pick(r, TIMES)}`; break;
    case 5: q = `Where shall we go ${pick(r, TIMES)}`; break;
    case 6: q = `When do you want ${pick(r, THINGS)}`; break;
    case 7: q = `How was ${pick(r, ['the walk', 'the soup', 'therapy', 'the scan', 'the new nurse'])}`; break;
    case 8: q = pick(r, ['How much does your knee hurt', 'Where does it hurt', 'How bad is the ache', 'What year did we move here', "What's my name", 'How old is Cillian now']); break;
    default: q = `${pick(r, ['Why are you upset', 'What do you need', 'Which jumper do you want', 'What should I tell Niamh', 'What would cheer you up'])}`;
  }
  return `${pick(r, PREFIX)}${q}${pick(r, SUFFIX)}?`;
}

function randomOutput(r: () => number, q: string): ModelOutput {
  const pool = [...THINGS, ...TIMES, ...MOODS, ...JUNK, ...PROFILE.people.map((p) => p.name)];
  const n = Math.floor(r() * 5);
  const choices = Array.from({ length: n }, () => pick(r, pool));
  const pair = codePair(q, PROFILE);
  const options = maybe(r, 0.5) && pair ? [...pair] : maybe(r, 0.5) ? [pick(r, pool), pick(r, pool)] : [];
  const topic = maybe(r, 0.3) ? pick(r, ['again', 'Person A', 'the', 'love', '']) : maybe(r, 0.3) && choices.length ? choices[0] : pick(r, ['tea', 'this weekend', 'walk', 'pain', 'dinner', 'Tadhg']);
  return { topic, kind: pick(r, ['choice', 'choice', 'yesno', 'feeling']), choices, options };
}

type ModelState = 'ready' | 'empty' | 'throws' | 'absent';
type CloudState = 'off' | 'unconfigured' | 'throws' | 'offline' | 'ok';

class RandomEngine implements Engine {
  label = 'random';
  modes = { device: 'ONLY_ON_DEVICE', cloud: 'PREFER_IN_CLOUD' };
  deviceCalls: string[] = [];
  cloudCalls: string[] = [];
  readonly cloudConfigured: boolean;
  constructor(readonly m: ModelState, readonly c: CloudState, private dev: ModelOutput, private cloud: ModelOutput) {
    this.cloudConfigured = c !== 'unconfigured';
  }
  async deviceStatus(): Promise<DeviceStatus> { return this.m === 'absent' ? 'unavailable' : 'available'; }
  async prepareDevice() {}
  async runDevice(p: string): Promise<ModelResult> {
    this.deviceCalls.push(p);
    if (this.m === 'throws') throw new Error('device failed');
    return { text: this.m === 'empty' ? '{}' : JSON.stringify(this.dev), source: 'on-device', ms: 1 };
  }
  cloudRequest(q: string) { return cloudTextRequest(q); }
  async runCloud(q: string): Promise<ModelResult> {
    this.cloudCalls.push(q);
    if (this.c === 'throws' || this.c === 'unconfigured') throw new Error('cloud failed');
    return { text: JSON.stringify(this.cloud), source: this.c === 'offline' ? 'on-device' : 'in-cloud', ms: 1 };
  }
}

const cap = (s: SupportLevel) => (s === 'mild' ? 3 : 2);

describe('property: card invariants over random questions, model output and engine states', () => {
  it('400 cards', async () => {
    const r = rng(20261112);
    for (let n = 0; n < 400; n++) {
      const q = randomQuestion(r);
      const m = pick(r, ['ready', 'ready', 'empty', 'throws', 'absent'] as ModelState[]);
      const c = pick(r, ['off', 'unconfigured', 'throws', 'offline', 'ok'] as CloudState[]);
      const support = pick(r, ['mild', 'more', 'most'] as SupportLevel[]);
      const e = new RandomEngine(m, c, randomOutput(r, q), randomOutput(r, q));
      const card: Card = await makeCard(q, { profile: PROFILE, support, engine: e, allowCloud: c !== 'off', deviceReady: m !== 'absent' });
      const ctx = `#${n} [${m}/${c}/${support}] ${q}\n  -> ${JSON.stringify(card.choices.map((x) => x.label))} topic=${card.topic} blocked=${card.blocked ?? ''}`;
      const ans = card.choices.filter((x) => x.role === 'answer');
      const esc = card.choices.filter((x) => x.role === 'escape');

      // exactly one escape on a shown card; none on a blocked one
      if (card.blocked) expect(card.choices, ctx).toEqual([]);
      else {
        expect(esc, ctx).toHaveLength(1);
        expect(ans.length, ctx).toBeGreaterThanOrEqual(2);
        // (a feeling scale keeps its middle at every level: three steps on one line; so does the pain scale, since 17 Nov)
        // (so does the fixed line of three times an open "when" question gets)
        // (and, since 17 Nov, exactly three of the family's own About-me entries: they share one card, and the card says so)
        expect(ans.length, ctx).toBeLessThanOrEqual(card.kind === 'feeling' || (card.kind === 'pain' && !card.scale) || card.notes.includes(COPY.notes.timeLine) || card.notes.includes(COPY.notes.ownAll) ? 3 : cap(support));
        if (card.notes.includes(COPY.notes.ownAll)) { expect(support, ctx).not.toBe('most'); for (const a of ans) expect(fromAboutMe(a.label, PROFILE), ctx).toBeTruthy(); }
      }
      // no negative words (the yes / no card's own "no" is the one exception), no "both" (no body sides in these
      // questions), no placeholder, never the headline
      for (const a of ans) {
        if (card.kind !== 'yesno') expect(hasNegative(a.label), ctx).toBe(false);
        expect(/^both\b/i.test(a.label), ctx).toBe(false);
        expect(hasPlaceholder(a.label), ctx).toBe(false);
        expect(a.label.toLowerCase(), ctx).not.toBe(card.topic.toLowerCase());
      }
      expect(hasPlaceholder(card.topic), ctx).toBe(false);
      // the spoken line carries every choice in order
      let at = 0;
      for (const ch of card.choices) {
        const i = card.say.toLowerCase().indexOf(ch.spoken.toLowerCase(), at);
        expect(i, ctx).toBeGreaterThanOrEqual(0);
        at = i + ch.spoken.length;
      }
      // any parseable "X or Y?" yields that card whatever the engine state, with nothing sent
      const pair = codePair(card.asked, PROFILE);
      if (pair) {
        expect(card.blocked ?? null, ctx).toBeNull();
        // the model's copy wins when it passes the same check; it may differ from the code's parse only in case
        expect(ans.map((x) => x.label.toLowerCase()), ctx).toEqual(pair.map((p) => p.toLowerCase()));
        for (const a of ans) expect(a.label, ctx).toMatch(/^[\p{L}\p{N}].*[\p{L}\p{N}]$|^[\p{L}\p{N}]$/u);
        expect(e.cloudCalls, ctx).toHaveLength(0);
        expect(pair.map((p) => p.toLowerCase()), ctx).not.toContain(card.topic.toLowerCase());
      }
      // the privacy boundary
      for (const p of e.deviceCalls) expect(hasPlaceholder(p), ctx).toBe(false);
      for (const s of e.cloudCalls) {
        expect(findLeaks(s, PROFILE), ctx).toEqual([]);
        for (const w of PROFILE_WORDS) expect(s.toLowerCase(), ctx).not.toContain(w.toLowerCase());
      }
      if (card.cloudPayload) { expect(c, ctx).toBe('ok'); expect(e.cloudCalls, ctx).toHaveLength(1); }
      if (c === 'off' || c === 'unconfigured') expect(e.cloudCalls, ctx).toHaveLength(0);
      // the picture gate: a cloud picture request carries a lower-case generic word with no digits
      for (const ch of card.choices) {
        if (ch.picture.type === 'cloud') {
          const category = ['food', 'a place', 'a TV show', 'music'].includes(ch.picture.word);
          if (!category) expect(ch.picture.word, ctx).toMatch(/^[a-z][a-z '-]*$/);
          expect(isGenericWord(ch.picture.word, PROFILE), ctx).toBe(true);
          for (const w of PROFILE_WORDS) expect(ch.picture.word.toLowerCase(), ctx).not.toContain(w.toLowerCase());
        }
      }
    }
  });
});

describe('property: the picture gate', () => {
  it('a random capitalised word or a word with a digit never yields a cloud picture request', () => {
    const r = rng(7);
    const alpha = 'abcdefghijklmnopqrstuvwxyz';
    for (let n = 0; n < 300; n++) {
      const len = 3 + Math.floor(r() * 7);
      let w = '';
      for (let i = 0; i < len; i++) w += alpha[Math.floor(r() * 26)];
      const capitalised = w.charAt(0).toUpperCase() + w.slice(1);
      expect(pictureFor(capitalised, PROFILE).type, capitalised).not.toBe('cloud');
      expect(pictureFor(`${w}${Math.floor(r() * 100)}`, PROFILE).type, w).not.toBe('cloud');
      expect(pictureFor(`${w} ${capitalised}`, PROFILE).type, w).not.toBe('cloud');
    }
  });
  it('a lower-case generic word may; an About-me item asks for its kind; a name never', () => {
    expect(pictureFor('umbrella', PROFILE)).toEqual({ type: 'cloud', word: 'umbrella' });
    expect(pictureFor('apple tart', PROFILE)).toEqual({ type: 'cloud', word: 'food' });
    expect(pictureFor('Bran', PROFILE)).toEqual({ type: 'word' });
    expect(pictureFor('Niamh', PROFILE).type).toBe('person');
  });
});
