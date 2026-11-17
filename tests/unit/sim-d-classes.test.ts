// The classes of mistake the held-out run of 16 Nov 2026 (set D, 90 questions, run through the app three ways) found,
// one group of tests per class. Every question here is a NEW phrasing written for this file: none is a sentence of
// set D, so that set is not the only check that the class is fixed. The family is the test fixture (Alan; Maria
// asking), not the sample family the run used.
import { describe, expect, it } from 'vitest';
import { COPY } from '../../core/copy';
import type { DeviceStatus, Engine, ModelResult } from '../../core/engine';
import { makeCard } from '../../core/pipeline';
import { cardReceipt, sentLine } from '../../core/receipt';
import { cloudTextRequest, pictureRequestBody } from '../../core/requests';
import { findLeaks, restoreNames, stripQuestion } from '../../core/strip';
import type { Card, ModelOutput, Profile, SupportLevel } from '../../core/types';
import { PROFILE } from './fixtures';

/** A scripted engine: null = that step is not there. Every call is recorded; `fail` makes the next cloud calls throw. */
class Scripted implements Engine {
  label = 'scripted';
  modes = { device: 'ONLY_ON_DEVICE', cloud: 'PREFER_IN_CLOUD', pictures: 'ONLY_IN_CLOUD' };
  calls: string[] = [];
  sent: string[] = [];
  fail: Error[] = [];
  cloudConfigured: boolean;
  constructor(private dev: ModelOutput | null, private cloud: ModelOutput | null = null) { this.cloudConfigured = !!cloud; }
  async deviceStatus(): Promise<DeviceStatus> { return this.dev ? 'available' : 'unavailable'; }
  async prepareDevice() {}
  async runDevice(): Promise<ModelResult> { this.calls.push('device'); return { text: JSON.stringify(this.dev), source: 'on-device', ms: 3 }; }
  cloudRequest(q: string) { return cloudTextRequest(q); }
  async runCloud(q: string): Promise<ModelResult> {
    this.calls.push('cloud'); this.sent.push(q);
    const e = this.fail.shift();
    if (e) throw e;
    return { text: JSON.stringify(this.cloud), source: 'in-cloud', ms: 4 };
  }
  pictureRequest(w: string) { return pictureRequestBody(w); }
  async picture() { return null; }
}
const ANY: ModelOutput = { topic: 'thing', kind: 'choice', choices: ['one thing', 'another thing', 'a third thing'] };
const YES: ModelOutput = { topic: 'visit', kind: 'yesno', choices: ['yes', 'no'] };
const ask = (q: string, e: Scripted, support: SupportLevel = 'more', profile: Profile = PROFILE, extra: object = {}) =>
  makeCard(q, { profile, support, engine: e, allowCloud: e.cloudConfigured, deviceReady: e['dev' as keyof Scripted] !== null, ...extra });
const answers = (c: Card) => c.choices.filter((x) => x.role === 'answer').map((x) => x.label);
const everyPage = (c: Card) => { const out: string[] = []; for (let p: Card | null | undefined = c; p; p = p.nextPage) out.push(...answers(p)); return out; };
void [ANY, YES, ask, answers, everyPage, COPY, cardReceipt, sentLine];

describe('D-a. a name that is not in About me never reaches the cloud request as typed', () => {
  // names the fixture family does not list, in the positions set D found open: after a title, opening the sentence
  const NAMES = ['Okafor', 'Brenda', 'Stan', 'Nguyen', 'Ruth', 'Hank', 'Delgado', 'Winnie'];
  const TEMPLATES: ((n: string) => string)[] = [
    (n) => `Dr. ${n} rang back, do you want to talk to her?`,
    (n) => `Mr ${n} is at the door, shall I let him in?`,
    (n) => `Mrs. ${n}'s cat got out again, should we help look?`,
    (n) => `Ms ${n} left a message, do you want to hear it?`,
    (n) => `Aunt ${n} wants to visit on Friday, is that all right?`,
    (n) => `Did Uncle ${n} say when he's coming?`,
    (n) => `Pastor ${n} asked after you, what should I tell him?`,
    (n) => `${n} sent a card, do you want me to read it?`,
    (n) => `${n}'s bringing the grandkids over, do you want to see them?`,
    (n) => `I spoke to the nurse. ${n} can come Tuesday, is that good?`,
    (n) => `What should we send ${n} for the wedding?`,
    (n) => `dr. ${n.toLowerCase()} wants to change the tablets, are you okay with that?`,
    (n) => `Is aunt ${n.toLowerCase()} still coming for lunch?`,
    (n) => `Shall we ask pastor ${n.toLowerCase()} to come by?`,
    (n) => `Did you want to ring mrs ${n.toLowerCase()} back?`,
  ];
  it('title + name, a name that opens a sentence, a lowercase name after a title: the label goes, the name comes back here', () => {
    for (const n of NAMES) for (const t of TEMPLATES) {
      const q = t(n);
      const s = stripQuestion(q, PROFILE);
      expect(s.text.toLowerCase(), q).not.toContain(n.toLowerCase());
      expect(s.text, q).toMatch(/\bName [A-Z]\b/);
      expect(restoreNames(s.text, s.map), q).toBe(q);
      expect(findLeaks(s.text, PROFILE), q).toEqual([]);
    }
  });
  it('the title itself stays, so the cloud still knows what kind of person it is', () => {
    expect(stripQuestion('Dr. Okafor rang back, do you want to talk to her?', PROFILE).text).toBe('Dr. Name A rang back, do you want to talk to her?');
    expect(stripQuestion('Shall we ask pastor ruth to come by?', PROFILE).text).toBe('Shall we ask pastor Name A to come by?');
    expect(stripQuestion('Pastor Stan asked after you, what should I tell him?', PROFILE).text).toBe('Pastor Name A asked after you, what should I tell him?');
  });
  it('a full name after a title: both capitalised words go', () => {
    expect(stripQuestion('Is Dr. Anita Okafor in on Mondays?', PROFILE).text).toBe('Is Dr. Name A Name B in on Mondays?');
  });
  it('when the code cannot tell a name from a word, it swaps: an unlisted word that opens a sentence goes as a label', () => {
    const s = stripQuestion('Zumba again on Thursday, do you want to go?', PROFILE);
    expect(s.text).toBe('Name A again on Thursday, do you want to go?');
    expect(restoreNames(s.text, s.map)).toBe('Zumba again on Thursday, do you want to go?');
  });
  it('a name that is also a month or an auxiliary is swapped where the next word shows it is a name', () => {
    expect(stripQuestion("Will's popping round later, is that okay?", PROFILE).text).toBe("Name A's popping round later, is that okay?");
    expect(stripQuestion('May called about the church sale, do you want to help?', PROFILE).text).toBe('Name A called about the church sale, do you want to help?');
    expect(stripQuestion('Will you come for a drive?', PROFILE).text).toBe('Will you come for a drive?');
    expect(stripQuestion('May I open the window?', PROFILE).text).toBe('May I open the window?');
  });
  it.each([
    'Porridge or toast this morning?', 'Shower before breakfast, or after?', 'Tablets with water or with milk?', 'Hungry yet?',
    'Rate the pain for me, zero to ten.', 'What do you want to do today?', 'Did you miss lunch?', 'Is the doctor coming on Monday?',
    'Has the nurse called about the results?', 'Is your aunt coming at the weekend?', 'Do you want the TV on?', 'Slippers or shoes?',
  ])('ordinary words stay as typed: %s', (q) => {
    expect(stripQuestion(q, PROFILE).text).toBe(q);
  });
  it('the request the engine gets, the "Sent" line and the receipt are the same text, and none of them holds the name', async () => {
    for (const q of ['Dr. Okafor rang back, do you want to talk to her?', 'Brenda from the choir says hello, do you want her to come in?', 'What should we send aunt winnie for the wedding?']) {
      const e = new Scripted(null, q.startsWith('What') ? ANY : YES);
      const card = await ask(q, e);
      expect(e.sent, q).toHaveLength(1);
      const wire = e.sent[0];
      expect(wire, q).not.toMatch(/okafor|brenda|winnie/i);
      expect(card.cloudPayload, q).toBeTruthy();
      expect(card.cloudPayload!, q).not.toMatch(/okafor|brenda|winnie/i);
      expect(sentLine(card.cloudPayload!).text, q).toBe(`Partner asks: ${wire}`);
      const r = cardReceipt(card, PROFILE);
      expect(r.sentText!, q).toContain(JSON.stringify(`Partner asks: ${wire}`));
      expect(r.sentText!, q).not.toMatch(/okafor|brenda|winnie/i);
      expect(r.namesWithheld, q).toBe(1);
      // the partner's own screen still shows which word was swapped; that list never leaves
      expect(card.cloudSwaps!.join(' '), q).toMatch(/Name A ← (?:Okafor|Brenda|winnie)/);
    }
  });
});
