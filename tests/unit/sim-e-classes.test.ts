// The classes of mistake the last held-out run of the rehearsal found (set E, 90 questions, run through the app three
// ways on 16 Nov 2026, late), one group of tests per class. Every question here is a NEW phrasing written for this
// file: none is a sentence of set E, so that set is not the only check that the class is fixed. The family is the
// test fixture (Alan; Maria asking), not the sample family the run used.
import { describe, expect, it } from 'vitest';
import type { DeviceStatus, Engine, ModelResult } from '../../core/engine';
import { makeCard } from '../../core/pipeline';
import { cloudTextRequest, pictureRequestBody } from '../../core/requests';
import { codePair } from '../../core/rules';
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
