// What the second run of set E still showed (17 Nov 2026, RESULTS_SIM_E2 §6), one group of tests per class. Every
// question here is a NEW phrasing written for this file, and the family is the test fixture (Alan; Maria asking), not
// the sample family the run used. The sentences of set E were not read while these fixes and tests were written.
import { describe, expect, it } from 'vitest';
import type { DeviceStatus, Engine, ModelResult } from '../../core/engine';
import { makeCard, needsNoModel } from '../../core/pipeline';
import { badgeKind, modelAsked } from '../../core/receipt';
import { cloudTextRequest } from '../../core/requests';
import { codePair, wholePair } from '../../core/rules';
import type { Card, ModelOutput, Profile, SupportLevel } from '../../core/types';
import { PROFILE } from './fixtures';

/** A scripted engine: null = that step is not there. Every call is recorded. */
class Scripted implements Engine {
  label = 'scripted';
  modes = { device: 'ONLY_ON_DEVICE', cloud: 'PREFER_IN_CLOUD' };
  calls: string[] = [];
  sent: string[] = [];
  cloudConfigured: boolean;
  constructor(public dev: ModelOutput | null, private cloud: ModelOutput | null = null) { this.cloudConfigured = !!cloud; }
  async deviceStatus(): Promise<DeviceStatus> { return this.dev ? 'available' : 'unavailable'; }
  async prepareDevice() {}
  async runDevice(): Promise<ModelResult> { this.calls.push('device'); return { text: JSON.stringify(this.dev), source: 'on-device', ms: 3 }; }
  cloudRequest(q: string) { return cloudTextRequest(q); }
  async runCloud(q: string): Promise<ModelResult> { this.calls.push('cloud'); this.sent.push(q); return { text: JSON.stringify(this.cloud), source: 'in-cloud', ms: 4 }; }
}
/** What a model returns when it has not understood: loose words, and "options" that are not the question's. */
const JUNK: ModelOutput = { topic: 'thing', kind: 'choice', choices: ['one thing', 'another thing', 'a third thing'], options: ['thing now', 'other'] };
const ask = (q: string, e: Scripted, support: SupportLevel = 'more', profile: Profile = PROFILE) =>
  makeCard(q, { profile, support, engine: e, allowCloud: e.cloudConfigured, deviceReady: e.dev !== null });
const answers = (c: Card) => c.choices.filter((x) => x.role === 'answer').map((x) => x.label);
const everyPage = (c: Card) => { const out: string[] = []; for (let p: Card | null | undefined = c; p; p = p.nextPage) out.push(...answers(p)); return out; };
void everyPage;

describe('E2-1. a pair the code reads whole is the card at once: the on-device model is not asked, so nobody waits for it', () => {
  // set E, second run: 12 cards on this computer waited about 3 s for the model and then showed the pair read in code
  const WHOLE: [string, string[]][] = [
    ['Um, would you like the window open or shut for the night?', ['open', 'shut']],
    ['Would you like your bath this morning, or once you have had lunch?', ['this morning', 'once you have had lunch']],
    ['Shall I tell Grace about it now, or wait?', ['tell Grace about it', 'wait']],
    ['Do you want Biscuit on your lap this evening, or Maria?', ['Biscuit', 'Maria']],
    ['Is the knee any better or worse than it was last night?', ['better', 'worse', 'the same']],
    ['Would you like to go to the pub or the library this afternoon, love?', ['pub', 'library']],
    ['Shall I switch the lamp on or leave it dark?', ['switch the lamp on', 'leave it dark']],
    ['Shall I ring the surgery today or leave it till Monday?', ['ring the surgery', 'leave it']],
  ];
  it.each(WHOLE)('no model call, badge "No AI needed": %s', async (q, want) => {
    expect(needsNoModel(q, PROFILE)).toBe(true);
    const e = new Scripted(JUNK);
    const card = await ask(q, e);
    expect(e.calls).toEqual([]);
    expect(answers(card)).toEqual(want);
    expect(modelAsked(card)).toBe(false);
    expect(badgeKind(card)).toBe('code');
    // the same card with no model in the browser at all
    expect(answers(await ask(q, new Scripted(null)))).toEqual(want);
  });
  // a side that breaks off, or the tail of a name: the code does not stand by such a reading, so the model is still
  // asked for its copy, and the badge says so when the copy is not used
  const BROKEN = [
    'Well, shall I put the radio on for you or keep it peaceful?',
    'Shall we walk down to the library, or would you rather we went to the market?',
    'Nina Simone, or would you rather have the Antiques Roadshow on?',
    'Shall I do the buttons for you, or do you want to have a go yourself?',
  ];
  it.each(BROKEN)('the model is still asked: %s', async (q) => {
    expect(wholePair(codePair(q, PROFILE)!, q)).toBe(false);
    expect(needsNoModel(q, PROFILE)).toBe(false);
    const e = new Scripted(JUNK);
    const card = await ask(q, e);
    expect(e.calls).toEqual(['device']);
    expect(badgeKind(card)).toBe('codeAsked');
  });
  it('a copy the model made of such a question is still used when it passes the check', async () => {
    const card = await ask(BROKEN[1], new Scripted({ topic: 'outing', kind: 'choice', choices: [], options: ['the library', 'the market'] }));
    expect(answers(card)).toEqual(['library', 'market']);
    expect(badgeKind(card)).toBe('device');
  });
});
