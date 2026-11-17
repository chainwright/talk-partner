// The classes of mistake the last held-out run of the rehearsal found (set E, 90 questions, run through the app three
// ways on 16 Nov 2026, late), one group of tests per class. Every question here is a NEW phrasing written for this
// file: none is a sentence of set E, so that set is not the only check that the class is fixed. The family is the
// test fixture (Alan; Maria asking), not the sample family the run used.
import { describe, expect, it } from 'vitest';
import { COPY } from '../../core/copy';
import type { DeviceStatus, Engine, ModelResult } from '../../core/engine';
import { makeCard } from '../../core/pipeline';
import { cloudTextRequest, pictureRequestBody } from '../../core/requests';
import { codePair, quizKind, quizRephrase } from '../../core/rules';
import type { Card, ModelOutput, Profile, SupportLevel } from '../../core/types';
import { PROFILE } from './fixtures';

/** A scripted engine: null = that step is not there. Every call is recorded. */
class Scripted implements Engine {
  label = 'scripted';
  modes = { device: 'ONLY_ON_DEVICE', cloud: 'PREFER_IN_CLOUD', pictures: 'ONLY_IN_CLOUD' };
  calls: string[] = [];
  sent: string[] = [];
  cloudConfigured: boolean;
  constructor(public dev: ModelOutput | null, private cloud: ModelOutput | null = null) { this.cloudConfigured = !!cloud; }
  async deviceStatus(): Promise<DeviceStatus> { return this.dev ? 'available' : 'unavailable'; }
  async prepareDevice() {}
  async runDevice(): Promise<ModelResult> { this.calls.push('device'); return { text: JSON.stringify(this.dev), source: 'on-device', ms: 3 }; }
  cloudRequest(q: string) { return cloudTextRequest(q); }
  async runCloud(q: string): Promise<ModelResult> { this.calls.push('cloud'); this.sent.push(q); return { text: JSON.stringify(this.cloud), source: 'in-cloud', ms: 4 }; }
  pictureRequest(w: string) { return pictureRequestBody(w); }
  async picture() { return null; }
}
/** What a model returns when it has not understood: loose words, and "options" that are not the question's. */
const JUNK: ModelOutput = { topic: 'thing', kind: 'choice', choices: ['one thing', 'another thing', 'a third thing'], options: ['thing now', 'other'] };
const ask = (q: string, e: Scripted, support: SupportLevel = 'more', profile: Profile = PROFILE) =>
  makeCard(q, { profile, support, engine: e, allowCloud: e.cloudConfigured, deviceReady: e.dev !== null });
const answers = (c: Card) => c.choices.filter((x) => x.role === 'answer').map((x) => x.label);
/** The three ways a card is made: no model at all, the on-device model, cloud help only. */
const STATES: [string, (dev?: ModelOutput, cloud?: ModelOutput) => Scripted][] = [
  ['rules alone', () => new Scripted(null)],
  ['on-device model', (dev = JUNK) => new Scripted(dev)],
  ['cloud help only', (_dev, cloud = JUNK) => new Scripted(null, cloud)],
];

describe('E-1. options named in the question always make a card, from the question\'s own words', () => {
  // set E: "… now or after you eat?" had no card without a model, and "No good choices came out" on some on-device runs
  const PAIRS: [string, string[]][] = [
    ['Do you want the eye drops now or when you go up to bed?', ['now', 'when you go up to bed']],
    ['Shall I run your bath before supper or once the news is over?', ['before supper', 'once the news is over']],
    ['Do you want your inhaler now or after your shower?', ['now', 'after your shower']],
    ['Should I carry the tray or do you want to manage it yourself?', ['carry the tray', 'manage it yourself']],
    ['Shall I post it for you or would you rather take it yourself?', ['post it for you', 'take it yourself']],
    ['Should I ring Grace about the scan this afternoon or hold off?', ['ring Grace', 'hold off']],
    ['Shall I book the taxi for Friday or hold off?', ['book the taxi', 'hold off']],
    ['Do you want me to read it out or can you see it?', ['read it out', 'see it']],
  ];
  for (const [state, engine] of STATES) {
    it.each(PAIRS)(`${state}: %s`, async (q, want) => {
      const e = engine();
      const card = await ask(q, e);
      expect(card.blocked ?? null).toBeNull();
      expect(card.kind).toBe('choice');
      expect(answers(card)).toEqual(want);
      expect(card.choices.filter((c) => c.role === 'escape')).toHaveLength(1);
      // the options are in the question: nothing is sent to be guessed at
      expect(e.calls).not.toContain('cloud');
      // every word on a tile is the partner's own
      for (const label of want) for (const w of label.toLowerCase().split(/\s+/)) expect(q.toLowerCase()).toContain(w);
    });
  }
  it('a model whose copied options fail the check gives the same card as no model', async () => {
    for (const [q] of PAIRS) {
      const none = await ask(q, new Scripted(null));
      for (const bad of [JUNK, { ...JUNK, options: [] }, { ...JUNK, options: ['yes', 'no'] }, { topic: '', kind: 'yesno' as const, choices: ['yes', 'no'] }]) {
        const withModel = await ask(q, new Scripted(bad));
        expect(answers(withModel)).toEqual(answers(none));
        expect(withModel.topic).toBe(none.topic);
      }
    }
  });
  it('the strict reading still wins where it holds, and "or not" is still one proposal', () => {
    expect(codePair('Shall we go now or later?', PROFILE)).toEqual(['now', 'later']);
    expect(codePair('Do you want the red one or the green one?', PROFILE)).toEqual(['red one', 'green one']);
    expect(codePair('Do you want a lift or not?', PROFILE)).toBeNull();
    expect(codePair('Do you want a rest, or is that a no?', PROFILE)).toBeNull();
    // a list in front is three options, not a pair read off its last two pieces
    expect(codePair('Do you want toast, an egg, or would you rather wait for lunch?', PROFILE)).toBeNull();
  });
});

describe('E-2. a test asked politely ("Can you tell me who …?") is still a test: no card, tell-don\'t-test', () => {
  // set E: "Can you tell me who the president is?" became yes / no, and "no" read as "I don't know"
  const TESTS: [string, string][] = [
    ['Could you tell me who the prime minister is?', 'place'],
    ['Can you tell me what year it is?', 'now'],
    ['Tell me what day it is today?', 'now'],
    ['Do you know who the mayor is?', 'place'],
    ['Can you tell me where we are?', 'place'],
    ['Could you tell me what my name is?', 'identity'],
    ['Can you remind me when Leo\'s birthday is?', 'fact'],
    ['Any idea how old Grace is?', 'fact'],
    ['Can you tell me what you had for lunch?', 'recall'],
    ['Would you tell me what town this is?', 'place'],
  ];
  for (const [state, engine] of STATES) {
    it.each(TESTS)(`${state}: %s`, async (q, kind) => {
      const e = engine();
      const card = await ask(q, e);
      expect(quizKind(q, PROFILE)).toBe(kind);
      expect(card.kind).toBe('no-quiz');
      expect(card.choices).toEqual([]);
      expect(card.coach).toMatch(/tell, don't test/i);
      expect(card.say.startsWith(COPY.notes.tellPrefix)).toBe(true);
      // no model is asked to make tiles for it
      expect(e.calls).toEqual([]);
    });
  }
  it('the line to say is the one for the plain question', () => {
    expect(quizRephrase("Can you remind me when Leo's birthday is?", 'Maria', new Date(), PROFILE)).toContain("It's on");
    expect(quizRephrase('Could you tell me what my name is?', 'Maria', new Date(), PROFILE)).toBe("It's me, Maria.");
    expect(quizRephrase('Can you tell me what year it is?', 'Maria', new Date(2026, 10, 17), PROFILE)).toBe("It's 2026.");
  });
  it('the same opening before a real question is not a test', async () => {
    for (const q of ['Can you tell me what you want for supper?', 'Do you know where your glasses are?', 'Can you tell me which one you like?', 'Could you show me where it hurts?', 'Can you tell me how you feel?']) {
      expect(quizKind(q, PROFILE)).toBeNull();
      expect((await ask(q, new Scripted(null))).kind).not.toBe('no-quiz');
    }
  });
});

describe('E-3. "Who was that on the phone?": the partner does not know, so it is not a test; the card is the people About me names', () => {
  // set E: refused with "You know this one: tell, don't test", no card
  const QUESTIONS = [
    'Who was that at the door just now?',
    'Who were you talking to on the phone?',
    'Who was it that rang this morning?',
    'Who came by while I was at the shops?',
    'Who was that calling earlier?',
    "Who's that on the phone, Alan?",
  ];
  for (const [state, engine] of STATES) {
    it.each(QUESTIONS)(`${state}: %s`, async (q) => {
      const e = engine();
      const card = await ask(q, e);
      expect(quizKind(q, PROFILE)).toBeNull();
      expect(card.blocked ?? null).toBeNull();
      expect(card.kind).toBe('choice');
      // Grace, Leo and Peter do not live there; Maria is asking, Sam lives there, Alan is the person
      expect(answers(card)).toEqual(['Grace', 'Leo']);
      expect(card.choices.find((c) => c.role === 'escape')?.label).toBe('someone else');
      expect(answers(card.nextPage!)).toEqual(['Peter']);
      expect(card.coach ?? null).toBeNull();
      expect(card.source).toBe('code');
      // nothing is asked of a model, so nothing can be made up and nothing is sent
      expect(e.calls).toEqual([]);
      expect(card.cloudPayload).toBeNull();
    });
  }
  it('at three a card all three stand on one page', async () => {
    expect(answers(await ask('Who was that at the door just now?', new Scripted(null), 'mild'))).toEqual(['Grace', 'Leo', 'Peter']);
  });
  it('with fewer than two such people in About me the question goes the usual way (no card made of one name)', async () => {
    const few: Profile = { ...PROFILE, people: PROFILE.people.slice(0, 3) };
    const card = await ask('Who was that at the door just now?', new Scripted(null), 'more', few);
    expect(card.blocked).toBeTruthy();
    expect(card.kind).not.toBe('no-quiz');
  });
  it('a face in a photo or on the telly, and a fact, are still tests; a wish is still an open question', async () => {
    for (const q of ['Who was that man in the photo?', 'Who was the first man on the moon?', 'Who was that on the telly last night?']) expect(quizKind(q, PROFILE)).not.toBeNull();
    const wish = await ask('Who shall we ring tonight?', new Scripted({ topic: 'call', kind: 'choice', choices: ['Grace', 'Leo'] }));
    expect(wish.source).toBe('on-device');
  });
});
