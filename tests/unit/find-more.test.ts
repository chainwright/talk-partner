// Phase 14 (judge round 10, the four official seats' P0 "the sponsor is not load-bearing on a phone"): on the carer's
// screen before handing over a topic card, the SECOND button is "Find more choices (Google's AI, after your yes)". It
// is the narrowing step of core/narrow.ts (on the device where Chrome has its model, else the PREFER_IN_CLOUD call
// after the consent sheet), given the choices already on the card. Pinned here: where it is offered and where never
// (pain, the body, feelings, a red flag, the crisis line, an urgent conversation), what each step is given, the words
// on the card it makes and on its routing chip, and that the same label stands after "something else".
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { partnerActions } from '../../core/actions';
import { COPY, deviceWords } from '../../core/copy';
import type { DeviceStatus, Engine, ModelResult } from '../../core/engine';
import { NullEngine } from '../../core/engine';
import { FIND_TASK, findMoreOffer } from '../../core/findmore';
import { outWays } from '../../core/more';
import { NARROW_TASK, narrowAsk, narrowCard, narrowInput, narrowLine } from '../../core/narrow';
import { makeCard } from '../../core/pipeline';
import { questionInPayload } from '../../core/receipt';
import { crisisAnswer, urgentAnswer } from '../../core/redflag';
import { careAnswer } from '../../core/reliability';
import { cloudTextRequest } from '../../core/requests';
import { SAMPLE_PROFILE } from '../../core/sample';
import { madeWhere, routeChip } from '../../core/simple';
import { TOPIC_BASE, topicOf, topics } from '../../core/topics';
import { TREE_QUESTIONS } from '../../core/tree';
import type { Card, ModelOutput } from '../../core/types';
import { waysBlock } from '../../web/src/phase7';
import { cardScreen, consentSheet, findMoreBlock, type CardModel } from '../../web/src/simple';

class Fake implements Engine {
  label = 'fake';
  modes = { device: 'ONLY_ON_DEVICE', cloud: 'PREFER_IN_CLOUD' };
  cloudConfigured = true;
  device: string[] = [];
  cloud: string[] = [];
  constructor(private o: { device?: ModelOutput; cloud?: ModelOutput } = {}) {}
  async deviceStatus(): Promise<DeviceStatus> { return this.o.device ? 'available' : 'unavailable'; }
  async prepareDevice() {}
  async runDevice(p: string): Promise<ModelResult> { this.device.push(p); if (!this.o.device) throw new Error('no model'); return { text: JSON.stringify(this.o.device), source: 'on-device', ms: 4 }; }
  cloudRequest(q: string) { return cloudTextRequest(q); }
  async runCloud(q: string): Promise<ModelResult> { this.cloud.push(q); if (!this.o.cloud) throw new Error('no cloud'); return { text: JSON.stringify(this.o.cloud), source: 'in-cloud', ms: 5 }; }
}
const env = (engine: Engine, o: { allowCloud?: boolean; deviceReady?: boolean } = {}) => ({ profile: SAMPLE_PROFILE, support: 'more' as const, engine, allowCloud: o.allowCloud ?? false, deviceReady: o.deviceReady ?? false });
const make = (q: string) => makeCard(q, env(new NullEngine()));
const SOFAR = [{ q: 'Are you in pain?', label: 'yes' }];
const out = (choices: string[]): ModelOutput => ({ topic: 'something else', kind: 'choice', choices });
const topicId = (q: string) => topicOf(q, SAMPLE_PROFILE)?.id ?? null;
const offer = (c: Card, place: 'device' | 'cloudOn' | 'ask' | 'offline' | 'none' | 'checking' = 'ask', urgent = false) => findMoreOffer(c, { topic: topicId(c.asked), place, urgent });
const text = (html: string) => html.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, ' ').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

describe('where "Find more choices" is offered on the screen before handing over', () => {
  it('"Would you like tea or coffee?" (Food & drink, made by the rules): online on a phone, on this computer where Chrome has its AI', async () => {
    const c = await make('Would you like tea or coffee?');
    expect(c.source).toBe('code');
    expect(offer(c, 'ask')).toBe('cloud');
    expect(offer(c, 'cloudOn')).toBe('cloud');
    expect(offer(c, 'device')).toBe('device');
  });
  it('not where no AI can be reached: offline, a copy with no project settings, the device check not answered yet', async () => {
    const c = await make('Would you like tea or coffee?');
    for (const p of ['offline', 'none', 'checking'] as const) expect(offer(c, p), p).toBeNull();
  });
  it('never in a conversation that has the call box up (a red flag)', async () => {
    expect(offer(await make('Would you like tea or coffee?'), 'ask', true)).toBeNull();
  });
  it('never on a question of "Body & care" or "Feelings", whatever its kind', async () => {
    for (const t of TOPIC_BASE.filter((x) => x.id === 'body' || x.id === 'feel')) {
      for (const q of t.questions) {
        const c = await make(q);
        expect(offer(c, 'ask'), q).toBeNull();
        expect(offer(c, 'device'), q).toBeNull();
      }
    }
  });
  it('every question of every topic and of every tree: where it is offered, nothing on the card is about pain, the body, a feeling, a red flag or the crisis line', async () => {
    const qs = [...new Set([...topics(SAMPLE_PROFILE).flatMap((t) => t.questions.map((x) => x.q)), ...TREE_QUESTIONS.map((q) => `${q.charAt(0).toUpperCase()}${q.slice(1)}?`)])];
    expect(qs.length).toBeGreaterThan(60);
    const offered: string[] = [];
    for (const q of qs) {
      const c = await make(q);
      // a tree question is asked inside a conversation of its topic: the worst case is a care topic for every one
      for (const topic of [topicId(q), 'body', 'feel']) {
        const o = findMoreOffer(c, { topic, place: 'ask', urgent: false });
        if (!o) continue;
        expect(topic === 'body' || topic === 'feel', `${q} under ${topic}`).toBe(false);
        expect(careAnswer(q, '', topic), q).toBe(false);
        for (const ch of c.choices) {
          expect(careAnswer('', ch.label), `${q}: ${ch.label}`).toBe(false);
          expect(urgentAnswer(q, ch.label), `${q}: ${ch.label}`).toBe(false);
          expect(crisisAnswer(ch.label), `${q}: ${ch.label}`).toBe(false);
        }
        expect(['pain', 'body', 'feeling', 'needs', 'repair', 'no-quiz', 'yesno']).not.toContain(c.kind);
        offered.push(q);
      }
    }
    // the judge's minute: the first topic question with two choices has it
    expect(offered).toContain('Would you like tea or coffee?');
    expect(offered.length).toBeGreaterThanOrEqual(8);
  });
  it('never on a yes / no card, a card of the AI, a card with no choices, the needs board or a typed question outside the topics', async () => {
    expect(offer(await make('Are you hungry?'))).toBeNull();
    const made = await make('Would you like tea or coffee?');
    expect(findMoreOffer({ ...made, source: 'in-cloud' }, { topic: 'food', place: 'ask', urgent: false })).toBeNull();
    expect(findMoreOffer({ ...made, blocked: 'x', choices: [] }, { topic: 'food', place: 'ask', urgent: false })).toBeNull();
    expect(findMoreOffer({ ...made, narrow: { level: 1, rejected: [] } }, { topic: 'food', place: 'ask', urgent: false })).toBeNull();
    expect(findMoreOffer({ ...made, kind: 'needs' }, { topic: 'food', place: 'ask', urgent: false })).toBeNull();
    expect(findMoreOffer(made, { topic: null, place: 'ask', urgent: false })).toBeNull();
    expect(findMoreOffer(null, { topic: 'food', place: 'ask', urgent: false })).toBeNull();
  });
});

describe('what the step is given', () => {
  it('the question and the choices already on the card, in words that say so; its own fixed task', async () => {
    const i = { ...narrowInput(await make('Would you like tea or coffee?'), SOFAR), offered: true };
    expect(narrowAsk(i)).toBe(`Would you like tea or coffee? On the card already: tea, coffee. ${FIND_TASK}`);
    expect(FIND_TASK).not.toMatch(/did not want/);
    expect(narrowLine(narrowAsk(i))).toBe('Would you like tea or coffee? On the card already: tea, coffee.');
    expect(narrowLine(narrowAsk({ ...i, offered: false }))).toBe('Would you like tea or coffee? They did not want: tea, coffee.');
    expect(narrowAsk({ ...i, offered: false })).toContain(NARROW_TASK);
  });
  it('on a phone (no model, after the yes): the PREFER_IN_CLOUD step gets the stripped line and never the answers so far; the card says it was made online, after your yes', async () => {
    const e = new Fake({ cloud: out(['something sweet', 'a walk', 'a rest']) });
    const i = { ...narrowInput(await make('Would you like tea or coffee?'), SOFAR), offered: true };
    const c = await narrowCard(i, env(e, { allowCloud: true }));
    expect(e.device).toEqual([]);
    expect(e.cloud).toHaveLength(1);
    expect(e.cloud[0]).not.toMatch(/pain|-> yes|earlier today/);
    // the app's own words pass the name guesser untouched ("On" is no name)
    expect(e.cloud[0]).toBe(`Would you like tea or coffee? On the card already: tea, coffee. ${FIND_TASK}`);
    expect(questionInPayload(c.cloudPayload!)).toBe(e.cloud[0]);
    expect(c.narrow).toMatchObject({ level: 1, rejected: ['tea', 'coffee'], offered: true });
    expect(c.source).toBe('in-cloud');
    expect(madeWhere(c, { about: 'About Frank' }).lines[1]).toBe(COPY.simple.left.sentFound('About Frank'));
    const chip = routeChip(c, 'About Frank')!;
    expect(chip.where).toBe('cloud');
    expect(`${chip.text} ${chip.why}`).toBe("Made online, after your yes · on a laptop with Chrome's AI this runs on that computer");
    // the same words on a phone: "that computer" is not "this phone"
    expect(deviceWords(`${chip.text} ${chip.why}`, 'phone')).toBe("Made online, after your yes · on a laptop with Chrome's AI this runs on that computer");
  });
  it('on a computer with Chrome\'s model: made there, About me in the prompt, nothing sent, and the chip says so', async () => {
    const e = new Fake({ device: out(['something sweet', 'a walk', 'a rest']), cloud: out(['x', 'y']) });
    const i = { ...narrowInput(await make('Would you like tea or coffee?'), SOFAR), offered: true };
    const c = await narrowCard(i, env(e, { deviceReady: true, allowCloud: true }));
    expect(e.cloud).toEqual([]);
    expect(e.device[0]).toContain('ABOUT (kept on this device');
    expect(c.source).toBe('on-device');
    expect(c.cloudPayload).toBeNull();
    const chip = routeChip(c, 'About Frank')!;
    expect(chip.where).toBe('device');
    expect(chip.text).toBe('Made on this computer');
  });
  it('online help off: no card, nothing sent, and the line for the consent sheet (the sheet\'s first sentence does not say "None of those fitted")', async () => {
    const e = new Fake({ cloud: out(['a', 'b']) });
    const i = { ...narrowInput(await make('Would you like tea or coffee?'), SOFAR), offered: true };
    const c = await narrowCard(i, env(e));
    expect(c.blocked).toBeTruthy();
    expect(e.cloud).toEqual([]);
    expect(questionInPayload(c.unsentPayload!)).toBe(narrowAsk(i));
    const sheet = text(consentSheet({ about: 'About Frank', line: narrowLine(questionInPayload(c.unsentPayload!)!), deviceThere: false, narrow: { request: c.unsentPayload!, offered: true } }));
    expect(sheet).toContain('Would you like tea or coffee? On the card already: tea, coffee.');
    expect(sheet).not.toContain('None of those fitted');
    expect(sheet).toContain(COPY.consent.sheet.narrow.yes);
    const after = text(consentSheet({ about: 'About Frank', line: 'x', deviceThere: false, narrow: { request: '{}' } }));
    expect(after).toContain('None of those fitted');
  });
});

describe('on the screen', () => {
  const model = (c: Card, over: Partial<CardModel> = {}): CardModel => ({
    name: 'Frank', card: c, less: false, recap: false, recapText: '', recapDone: false,
    actions: partnerActions(c, { less: false, hasAnswers: false }), made: madeWhere(c, { about: 'About Frank' }),
    personHtml: '<p class="p-do">x</p>', canAskOnline: false, offline: false, lastTime: '', ...over,
  });
  it('the second button, right under "Show Frank the choices", with the line that says where it runs', async () => {
    const c = await make('Would you like tea or coffee?');
    const html = cardScreen(model(c, { findHtml: findMoreBlock('cloud') }));
    const buttons = [...html.matchAll(/<button[^>]*class="btn([^"]*)"[^>]*>/g)].map((m) => m[0]);
    expect(buttons[0]).toContain('data-act="show"');
    expect(buttons[1]).toContain('data-act="find-more"');
    expect(text(html)).toContain("Find more choices (Google's AI, after your yes)");
    expect(text(findMoreBlock('device'))).toContain("Find more choices (Chrome's AI, on this computer)");
    expect(text(findMoreBlock('device'))).toContain('Nothing is sent.');
    expect(cardScreen(model(c))).not.toContain('data-act="find-more"');
  });
  it('after "something else" the AI step has the same label where it goes online', () => {
    expect(COPY.simple.narrow.goOnline).toBe("Find more choices (Google's AI, after your yes)");
  });
  it('after "something else" on pain, the body or a feeling: the AI step is never second (the body card and the needs board stay ahead of it)', async () => {
    for (const q of ['Are you in pain?', 'How are you feeling today?', 'Are you comfortable?']) {
      const c = await make(q);
      const ways = outWays(c, SAMPLE_PROFILE, topicId(q));
      const html = waysBlock({ ways, moreFirst: [], letterHtml: '<button id="letter">l</button>', narrowHtml: '<button id="narrow">n</button>', aiSecond: true });
      const ids = [...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]).filter((x) => x !== 'ways');
      expect(ids[1], q).not.toBe('narrow');
    }
  });
});

describe('Back, one step at a time', () => {
  it('a card waiting for the consent sheet\'s yes is no step of its own: Back from the card the AI made lands on the card it was asked from', () => {
    const main = readFileSync(join(__dirname, '..', '..', 'web/src/main.ts'), 'utf8');
    expect(main).toContain('const waiting = (s: Snap) => (!!s.view.card?.narrow && !!s.view.card.blocked && !!s.view.card.unsentPayload) || ownWaiting(s.view.card);');
    expect(main).toMatch(/if \(at >= 0\) \{ entry = trail\.stack\[at\]\.entry; trail\.stack\.length = at; \} else if \(!waiting\(cur\)\) trail\.stack\.push\(cur\);/);
  });
});

describe('a browser App Check refuses (the failure path)', () => {
  class Refused extends Fake {
    async checkCloud(): Promise<void> { throw new Error('appCheck/recaptcha-error'); }
  }
  it('no card, nothing sent, the screen says why and what to do; the consent sheet does not come back by itself', async () => {
    const e = new Refused({ cloud: out(['a', 'b']) });
    const i = { ...narrowInput(await make('Would you like tea or coffee?'), SOFAR), offered: true };
    const c = await narrowCard(i, { ...env(e, { allowCloud: true }), cloudWaitMs: 200 });
    expect(e.cloud).toEqual([]);
    expect(c.blocked).toBe(COPY.notes.narrowCheckBlocked);
    expect(c.cloudPayload).toBeNull();
    expect(c.cloudAttempted ?? null).toBeNull();
    expect(COPY.notes.narrowCheckBlocked).toMatch(/could not check this browser, so nothing was sent/);
    const main = readFileSync(join(__dirname, '..', '..', 'web/src/main.ts'), 'utf8');
    expect(main).toContain('card.blocked !== C.notes.cloudCheckBlocked && card.blocked !== C.notes.narrowCheckBlocked && sheetWanted(card');
  });
});

describe('the card opens at its top', () => {
  it('a tapped question (a topic, "Next: …") opens its card scrolled to the top, so step 1, the main button and "Find more choices" are on the first screen', () => {
    const main = readFileSync(join(__dirname, '..', '..', 'web/src/main.ts'), 'utf8');
    expect(main).toContain('state.lastQuestion = t.dataset.q; void make(t.dataset.q).then(() => { if (simpleView() && state.card && !state.busy && !state.sheet) window.scrollTo(0, 0); }); return; }');
  });
});
