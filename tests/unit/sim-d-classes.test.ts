// The classes of mistake the held-out run of 16 Nov 2026 (set D, 90 questions, run through the app three ways) found,
// one group of tests per class. Every question here is a NEW phrasing written for this file: none is a sentence of
// set D, so that set is not the only check that the class is fixed. The family is the test fixture (Alan; Maria
// asking), not the sample family the run used.
import { describe, expect, it } from 'vitest';
import { COPY } from '../../core/copy';
import type { DeviceStatus, Engine, ModelResult } from '../../core/engine';
import { partnerActions } from '../../core/actions';
import { cloudRetryWait, makeCard } from '../../core/pipeline';
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
void everyPage; // used by the groups below

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

describe('D-b. a failed cloud call (HTTP 429 on the free tier, a network error) never becomes a card made of About me', () => {
  // the message the SDK gave in the run of 16 Nov, shortened; the free tier allows 15 requests a minute
  const QUOTA = () => new Error('AI: Error fetching from https://example.invalid/v1beta/models/m:generateContent: [429 ] You exceeded your current quota, please check your plan and billing details. Please retry in 41.3s.');
  const BUSY = () => new Error('AI: Error fetching from https://example.invalid/v1beta/models/m:generateContent: [429 ] Resource has been exhausted (e.g. check quota).');
  const NET = () => new TypeError('Failed to fetch');
  const ABOUT = [...PROFILE.places, ...PROFILE.foods, ...PROFILE.tv, ...PROFILE.music, ...PROFILE.people.map((p) => p.name)];
  const waits: number[] = [];
  const sleep = async (ms: number) => { waits.push(ms); };
  const OPEN = ['Where shall I put your slippers?', 'Where do you want the lamp to go?', 'What did the plumber leave behind?', 'What shall we take to the neighbours?', 'Where would you like your chair?'];

  it.each(OPEN)('429 with a long wait named: no second try, no card, an honest reason and a way out: %s', async (q) => {
    waits.length = 0;
    const e = new Scripted(null, ANY);
    e.fail = [QUOTA()];
    const card = await ask(q, e, 'more', PROFILE, { sleep });
    expect(e.calls).toEqual(['cloud']);
    expect(waits).toEqual([]);
    expect(card.blocked).toBe(COPY.notes.cloudBusyBlocked);
    expect(card.choices).toEqual([]);
    expect(card.nextPage ?? null).toBeNull();
    // nothing from About me anywhere the partner would read it aloud
    for (const w of ABOUT) expect(card.say.toLowerCase(), w).not.toContain(w.replace(/^the\s+/i, '').toLowerCase());
    // the badge is "No card" (a blocked card), never "No AI needed"; the tail is "may have left"
    expect(card.cloudPayload).toBeNull();
    expect(card.cloudAttempted).toBeTruthy();
    expect(cardReceipt(card, PROFILE)).toMatchObject({ source: 'blocked', left: false, attempted: true });
    expect(card.trace!.find((t) => t.step === 'stripped')).toMatchObject({ ran: 'failed', used: false });
    // the way out: ask again
    expect(card.retry).toBe(q);
    expect(partnerActions(card, { less: false, hasAnswers: false })[0]).toMatchObject({ act: 'retry', label: COPY.card.retry });
  });

  it('429 with no wait named: one more try after a short wait; the second answer is the card, and the first request is counted as "may have left"', async () => {
    waits.length = 0;
    const e = new Scripted(null, { topic: 'neighbours', kind: 'choice', choices: ['flowers', 'a cake', 'wine'] });
    e.fail = [BUSY()];
    const card = await ask('What shall we take to the neighbours?', e, 'more', PROFILE, { sleep });
    expect(e.calls).toEqual(['cloud', 'cloud']);
    expect(waits).toHaveLength(1);
    expect(waits[0]).toBeGreaterThan(0);
    expect(waits[0]).toBeLessThanOrEqual(3100);
    expect(card.blocked ?? null).toBeNull();
    expect(card.source).toBe('in-cloud');
    expect(answers(card)).toEqual(['flowers', 'a cake']);
    expect(card.cloudPayload).toBeTruthy();
    expect(card.cloudAttempted).toBeTruthy();
    expect(card.notes).toContain(COPY.notes.cloudRetried);
    expect(cardReceipt(card, PROFILE)).toMatchObject({ left: true, attempted: true });
  });

  it('busy twice: two tries and no more, then the honest state', async () => {
    const e = new Scripted(null, ANY);
    e.fail = [BUSY(), BUSY()];
    const card = await ask('Where do you want the lamp to go?', e, 'more', PROFILE, { sleep });
    expect(e.calls).toEqual(['cloud', 'cloud']);
    expect(card.blocked).toBe(COPY.notes.cloudBusyBlocked);
    expect(card.choices).toEqual([]);
  });

  it('a network error is retried once too; when it fails again the card says cloud help did not answer', async () => {
    const e = new Scripted(null, ANY);
    e.fail = [NET(), NET()];
    const card = await ask('What did the plumber leave behind?', e, 'more', PROFILE, { sleep });
    expect(e.calls).toEqual(['cloud', 'cloud']);
    expect(card.blocked).toBe(COPY.notes.cloudDownBlocked);
    expect(card.retry).toBe('What did the plumber leave behind?');
  });

  it('a request that certainly did not leave (offline) is not retried and is not counted as "may have left"', async () => {
    const e = new Scripted(null, ANY);
    e.fail = [Object.assign(new TypeError('Failed to fetch'), { notSent: true })];
    const card = await ask('Where would you like your chair?', e, 'more', PROFILE, { sleep });
    expect(e.calls).toEqual(['cloud']);
    expect(card.blocked).toBe(COPY.notes.cloudDownBlocked);
    expect(card.cloudAttempted ?? null).toBeNull();
    expect(card.unsentPayload).toBeTruthy();
  });

  it('a card the on-device step made is kept when the cloud is busy, with its own badge', async () => {
    // two mood words send this card to the cloud for a second opinion
    const e = new Scripted({ topic: 'afternoon', kind: 'choice', choices: ['happy film', 'sad film', 'a walk'] }, ANY);
    e.fail = [QUOTA()];
    const card = await ask('What shall we do after the physio has gone?', e, 'mild', PROFILE, { sleep });
    expect(e.calls).toEqual(['device', 'cloud']);
    expect(card.blocked ?? null).toBeNull();
    expect(card.source).toBe('on-device');
    expect(answers(card)).toEqual(['happy film', 'sad film', 'a walk']);
    expect(card.cloudAttempted).toBeTruthy();
    expect(card.retry ?? null).toBeNull();
  });

  it('a two-in-one question keeps its second half reachable and asks both again on "Try again"', async () => {
    const e = new Scripted(null, ANY);
    e.fail = [QUOTA()];
    const card = await ask('Where shall I put your slippers, and do you want the heating on?', e, 'more', PROFILE, { sleep });
    expect(card.blocked).toBe(COPY.notes.cloudBusyBlocked);
    expect(card.pending).toBe('Do you want the heating on?');
    expect(card.retry).toBe('Where shall I put your slippers? Do you want the heating on?');
    expect(partnerActions(card, { less: false, hasAnswers: false }).map((a) => a.act)).toEqual(['retry', 'next']);
  });

  it('when to try once more: within about 3 s if the service allows, never when it names a longer wait', () => {
    expect(cloudRetryWait(QUOTA())).toBeNull();
    expect(cloudRetryWait(BUSY())).toBe(1200);
    expect(cloudRetryWait(NET())).toBe(1200);
    expect(cloudRetryWait(new Error('[429 ] Too many requests. Please retry in 2s.'))).toBe(2100);
    expect(cloudRetryWait(new Error('[503 ] The model is overloaded. Please try again later.'))).toBe(1200);
    expect(cloudRetryWait(new Error('[400 ] API key not valid.'))).toBeNull();
    expect(cloudRetryWait(new Error('cloud answer was not valid JSON'))).toBeNull();
    expect(cloudRetryWait(Object.assign(new Error('Failed to fetch'), { notSent: true }))).toBeNull();
  });
});
