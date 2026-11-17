// The classes of mistake the held-out run of 16 Nov 2026 (set D, 90 questions, run through the app three ways) found,
// one group of tests per class. Every question here is a NEW phrasing written for this file: none is a sentence of
// set D, so that set is not the only check that the class is fixed. The family is the test fixture (Alan; Maria
// asking), not the sample family the run used.
import { describe, expect, it } from 'vitest';
import { COPY } from '../../core/copy';
import type { DeviceStatus, Engine, ModelResult } from '../../core/engine';
import { partnerActions } from '../../core/actions';
import { cloudRetryWait, makeCard, quizOverrideCard } from '../../core/pipeline';
import { cardReceipt, sentLine } from '../../core/receipt';
import { cloudTextRequest, pictureRequestBody } from '../../core/requests';
import { findLeaks, restoreNames, stripQuestion } from '../../core/strip';
import { quizKind, quizRephrase } from '../../core/rules';
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
  const OPEN = ['Where shall I put your slippers?', 'Where do you want the lamp to go?', 'What does the plumber need from us?', 'What shall we take to the neighbours?', 'Where would you like your chair?'];

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
    const card = await ask('What does the plumber need from us?', e, 'more', PROFILE, { sleep });
    expect(e.calls).toEqual(['cloud', 'cloud']);
    expect(card.blocked).toBe(COPY.notes.cloudDownBlocked);
    expect(card.retry).toBe('What does the plumber need from us?');
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

/** The three engine states a card can be made in: rules alone, the on-device model, cloud help only. */
const STATES: [string, () => Scripted][] = [['rules alone', () => new Scripted(null)], ['on-device model', () => new Scripted(ANY)], ['cloud help only', () => new Scripted(null, ANY)]];
const ABOUT_WORDS = [...PROFILE.places, ...PROFILE.foods, ...PROFILE.tv, ...PROFILE.music, ...PROFILE.people.map((p) => p.name)].map((w) => w.replace(/^the\s+/i, '').toLowerCase());
const noAboutMe = (text: string, q: string) => { for (const w of ABOUT_WORDS) if (!q.toLowerCase().includes(w)) expect(text.toLowerCase(), `${q} / ${w}`).not.toMatch(new RegExp(`\\b${w}\\b`)); };

describe('D-1. a question that tests where they are, or what happened earlier, is caught: no card, no invented tiles', () => {
  const ORIENTATION = [
    'Do you know where you are?', 'Where are you right now, Alan?', 'Can you tell me where we are?', 'What town are we in?',
    'What building is this?', 'So where are we?', 'What season is it?', "Who's the president now?", 'Where do you live?',
  ];
  const RECALL = [
    'What did you have for lunch at the centre?', 'What did you do at physio this morning?', 'What have you eaten today?',
    'What did the nurse tell you?', 'What did Grace say on the phone?', 'So what did you watch last night?', 'Alan, what did you buy at the market?',
  ];
  for (const [state, engine] of STATES) {
    it.each([...ORIENTATION, ...RECALL])(`${state}: %s`, async (q) => {
      const e = engine();
      const card = await ask(q, e);
      expect(card.kind).toBe('no-quiz');
      expect(card.choices).toEqual([]);
      expect(card.nextPage ?? null).toBeNull();
      expect(e.calls).toEqual([]); // no model is asked to make up choices, and nothing is sent
      expect(card.say.startsWith(COPY.notes.tellPrefix)).toBe(true);
      noAboutMe(card.say, q);
    });
  }
  it('which kind it is decides what the partner is told', () => {
    for (const q of ORIENTATION) expect(quizKind(q, PROFILE), q).toBe('place');
    for (const q of RECALL) expect(quizKind(q, PROFILE), q).toBe('recall');
    expect(quizRephrase('Do you know where you are?', 'Maria', new Date(), PROFILE)).toBe('Say where you are: "We\'re at …".');
    expect(quizRephrase('What did the nurse tell you?', 'Maria', new Date(), PROFILE)).toMatch(/ask yes \/ no about one real thing at a time/);
  });
  it('a recall question is not called "you know this one": the partner may not know either', async () => {
    const recall = await ask('What did you do at physio this morning?', new Scripted(null));
    expect(recall.coach).toBe(COPY.coach.recall);
    const place = await ask('What town are we in?', new Scripted(null));
    expect(place.coach).toBe(COPY.coach.test);
  });
  it('"make a card anyway" has nothing real to offer for these, so it makes none (never About-me places or foods)', () => {
    for (const q of ['Do you know where you are?', 'What did you have for lunch at the pub?', 'What town are we in?']) {
      const c = quizOverrideCard(q, PROFILE, 'more');
      expect(c.blocked, q).toBe(COPY.memory.overrideNone);
      expect(c.choices, q).toEqual([]);
    }
  });
  it.each([
    'What did you want for supper?', 'What did you think of the sermon?', 'What did you fancy doing later?', 'Where are we going on Saturday?',
    'Where are you sore?', 'What did you enjoy most about the trip?', 'Where would you like to live?',
  ])('not a test: %s', (q) => {
    expect(quizKind(q, PROFILE)).toBeNull();
  });
  it('a recall question that names real options is a choice card with exactly those options', async () => {
    for (const [, engine] of STATES) {
      const card = await ask('What did you have at the cafe, the soup or the pie?', engine());
      expect(card.kind).toBe('choice');
      expect(answers(card)).toEqual(['soup', 'pie']);
    }
  });
});

describe('D-1b. the line to say never reads options that are not on the screen', () => {
  const OPEN = ['Where shall we keep the spare keys?', 'What do you fancy watching?', 'What shall we cook on Sunday?', 'Who shall we ask to drive on Friday?', 'What should I get from the chemist?'];
  it.each(OPEN)('rules alone, no card: %s', async (q) => {
    const card = await ask(q, new Scripted(null));
    expect(card.blocked).toBeTruthy();
    expect(card.choices).toEqual([]);
    expect(card.say).toBe(COPY.notes.justAsk(q));
    noAboutMe(card.say, q);
    expect(card.say).not.toMatch(/or some(?:thing|one|where) else/i);
  });
  it('a model answered and nothing usable came out: the same', async () => {
    const e = new Scripted({ topic: 'keys', kind: 'choice', choices: ['yes'] });
    const card = await ask('Where shall we keep the spare keys?', e);
    if (card.blocked) {
      expect(card.say).toBe(COPY.notes.justAsk('Where shall we keep the spare keys?'));
      noAboutMe(card.say, 'Where shall we keep the spare keys?');
    } else {
      // every option read aloud is on the card or on its next page
      for (const a of everyPage(card)) expect(card.say.toLowerCase() + (card.nextPage?.say.toLowerCase() ?? '')).toContain(a.toLowerCase());
    }
  });
});

describe('D-2. "when did it start, A or B?" about what only the person can feel is a two-option card, not a memory test', () => {
  const PAIRS: [string, string[]][] = [
    ['When did your shoulder start hurting, yesterday or today?', ['yesterday', 'today']],
    ['When did the dizziness come on, before lunch or after lunch?', ['before lunch', 'after lunch']],
    ['When did the headache start, on Monday or on Tuesday?', ['Monday', 'Tuesday']],
    ['When did you last eat, at breakfast or at lunch?', ['at breakfast', 'at lunch']],
    ['When did you start feeling sick, in the night or this morning?', ['night', 'this morning']],
    ['When did it come on, last night or this morning?', ['last night', 'this morning']],
  ];
  for (const [state, engine] of STATES) {
    it.each(PAIRS)(`${state}: %s`, async (q, want) => {
      const e = engine();
      const card = await ask(q, e);
      expect(card.kind).toBe('choice');
      expect(card.blocked ?? null).toBeNull();
      expect(answers(card)).toEqual(want);
      expect(card.choices.filter((c) => c.role === 'escape')).toHaveLength(1);
      expect(card.coach ?? null).toBeNull();
    });
  }
  it.each(['When did the rash start?', 'When did you last have a drink?', 'When did your knee start aching?', 'When was your last tablet?'])('with no options named it is an open question, not a test: %s', (q) => {
    expect(quizKind(q, PROFILE)).toBeNull();
  });
  it.each(['When did we move to this house, 1980 or 1985?', 'When did Leo start school?', 'When did we get the cat?', "When is Grace's birthday, May or June?"])('a fact the partner knows is still a test: %s', (q) => {
    expect(quizKind(q, PROFILE)).toBe('fact');
  });
});
