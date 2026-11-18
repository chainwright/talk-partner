// "Something else" without a dead end (core/narrow.ts): after the way out, an AI suggests the next, broader choices
// from the question and what did not fit. Pinned here: where it runs (on the device first; online help only when it
// is on; never both), what each step is given (the answers so far stay on the device; the cloud text passes the same
// strip and leak gate), the same card guards (a way out is no choice, nothing offered before comes back, no invented
// name, at least two real choices or no card, never a generic title), and two levels at most.
import { describe, expect, it } from 'vitest';
import type { DeviceStatus, Engine, ModelResult } from '../../core/engine';
import { NullEngine } from '../../core/engine';
import { NARROW_LEVELS, canNarrow, narrowAsk, narrowCard, narrowChoices, narrowDeviceAsk, narrowInput, type NarrowInput } from '../../core/narrow';
import { makeCard } from '../../core/pipeline';
import { questionInPayload, sessionReceipt } from '../../core/receipt';
import { cloudTextRequest } from '../../core/requests';
import { SAMPLE_PROFILE } from '../../core/sample';
import { madeWhere, sheetWanted } from '../../core/simple';
import { EMPTY_PROFILE, type Card, type ModelOutput } from '../../core/types';

class Fake implements Engine {
  label = 'fake';
  modes = { device: 'ONLY_ON_DEVICE', cloud: 'PREFER_IN_CLOUD' };
  cloudConfigured = true;
  device: string[] = [];
  cloud: string[] = [];
  constructor(private o: { device?: ModelOutput | string; cloud?: ModelOutput | string | Error } = {}) {}
  async deviceStatus(): Promise<DeviceStatus> { return this.o.device ? 'available' : 'unavailable'; }
  async prepareDevice() {}
  async runDevice(p: string): Promise<ModelResult> { this.device.push(p); if (!this.o.device) throw new Error('no model'); return { text: typeof this.o.device === 'string' ? this.o.device : JSON.stringify(this.o.device), source: 'on-device', ms: 4 }; }
  cloudRequest(q: string) { return cloudTextRequest(q); }
  async runCloud(q: string): Promise<ModelResult> { this.cloud.push(q); if (this.o.cloud instanceof Error) throw this.o.cloud; if (!this.o.cloud) throw new Error('no cloud'); return { text: typeof this.o.cloud === 'string' ? this.o.cloud : JSON.stringify(this.o.cloud), source: 'in-cloud', ms: 5 }; }
}
const out = (choices: string[], topic = 'something else'): ModelOutput => ({ topic, kind: 'choice', choices });
const env = (engine: Engine, o: { allowCloud?: boolean; deviceReady?: boolean; profile?: typeof SAMPLE_PROFILE } = {}) => ({ profile: o.profile ?? SAMPLE_PROFILE, support: 'more' as const, engine, allowCloud: o.allowCloud ?? false, deviceReady: o.deviceReady ?? false });
const first = (q = 'Would you like tea or coffee?') => makeCard(q, env(new NullEngine()));
const SOFAR = [{ q: 'Are you in pain?', label: 'yes' }, { q: 'Would you like to call Jen?', label: 'no' }];
const input = async (): Promise<NarrowInput> => narrowInput(await first(), SOFAR);
const labels = (c: Card) => c.choices.map((x) => x.label);
const GENERIC = /^(?:question|which one|choices|something else)$/i;

describe('what a narrowing step is built from', () => {
  it('the question, and every choice that was offered and not taken (later pages too)', async () => {
    const i = await input();
    expect(i).toEqual({ asked: 'Would you like tea or coffee?', rejected: ['tea', 'coffee'], level: 1, sofar: SOFAR });
    const paged = await makeCard('Would you like water, juice, milk or squash?', env(new NullEngine()));
    expect(narrowInput(paged, []).rejected).toEqual(['water', 'juice', 'milk', 'squash']);
  });
  it('the next level adds its own choices to what did not fit, and counts up', async () => {
    const one = await narrowCard(await input(), env(new Fake({ device: out(['a cold drink', 'something to eat', 'a rest']) }), { deviceReady: true }));
    const two = narrowInput(one, []);
    expect(two.level).toBe(2);
    expect(two.rejected).toEqual(['tea', 'coffee', 'a cold drink', 'something to eat', 'a rest']);
  });
  it('the text both steps get holds the question and what did not fit, and nothing the person chose', async () => {
    const i = await input();
    expect(narrowAsk(i)).toBe('Would you like tea or coffee? They did not want: tea, coffee. What else could it be? Do not give more of the same kind as the ones they did not want. Give two or three broader, different kinds of answer: a kind such as "something cold" or "something to eat", not one more single thing.');
    expect(narrowAsk(i)).not.toMatch(/pain|Jen|yes/);
    // only the on-device text adds the answers so far
    expect(narrowDeviceAsk(i)).toContain('Answered earlier today: "Are you in pain?" -> yes; "Would you like to call Jen?" -> no.');
  });
});

describe('where it runs: on this device first, online help only when it is on', () => {
  it('on a device with the model: made there from the question, what did not fit, the answers so far and About me; nothing sent, the cloud never called', async () => {
    const e = new Fake({ device: out(['a cold drink', 'something to eat', 'a rest'], 'what else'), cloud: out(['x', 'y']) });
    const c = await narrowCard(await input(), env(e, { deviceReady: true, allowCloud: true }));
    expect(labels(c)).toEqual(['a cold drink', 'something to eat', 'a rest', 'something else']);
    expect(c.source).toBe('on-device');
    expect(c.cloudPayload).toBeNull();
    expect(e.cloud).toEqual([]);
    expect(e.device).toHaveLength(1);
    expect(e.device[0]).toContain('ABOUT (kept on this device');
    expect(e.device[0]).toContain('"Are you in pain?" -> yes');
    expect(c.narrow).toEqual({ level: 1, rejected: ['tea', 'coffee'] });
    expect(c.trace?.map((t) => [t.step, t.ran, t.used])).toEqual([['private', 'on-device', true], ['stripped', 'skipped', false], ['code', 'on-device', true]]);
    expect(madeWhere(c, { about: 'About Frank' })).toMatchObject({ maker: 'device', left: 'nothing' });
  });
  it('no model in the browser (every phone), online help on: the cloud gets the question and what did not fit, names swapped out, and never the answers so far', async () => {
    const e = new Fake({ cloud: out(['a cold drink', 'something to eat', 'a rest'], 'drink') });
    const i: NarrowInput = { asked: 'Would you like to call Jen or Tyler?', rejected: ['Jen', 'Tyler'], level: 1, sofar: SOFAR };
    const c = await narrowCard(i, env(e, { allowCloud: true }));
    expect(e.device).toEqual([]);
    expect(e.cloud).toHaveLength(1);
    expect(e.cloud[0]).not.toMatch(/Jen|Jenny|Tyler|Frank|Carol/);
    expect(e.cloud[0]).not.toMatch(/pain|-> yes|earlier today/);
    expect(e.cloud[0]).toMatch(/^Would you like to call Person [A-Z] or Person [A-Z]\? They did not want: Person [A-Z], Person [A-Z]\./);
    expect(c.source).toBe('in-cloud');
    expect(c.cloudPayload).toBeTruthy();
    expect(questionInPayload(c.cloudPayload!)).toBe(e.cloud[0]);
    expect(madeWhere(c, { about: 'About Frank' })).toMatchObject({ maker: 'cloud', left: 'sent' });
    // the line under it says what went for THIS step: the question and what did not fit, never an answer
    expect(madeWhere(c, { about: 'About Frank' }).lines[1]).toBe("Sent to Google: the question and the choices that did not fit, with any names you listed swapped out, and the app's fixed instructions. Nothing from About Frank, and never the answers they chose.");
    // it is counted in the session's receipt like any card that left
    expect(sessionReceipt([c], SAMPLE_PROFILE).cardsLeft).toBe(1);
  });
  it('no model here and online help off: no card, nothing sent, and the card holds the line that would go so the consent sheet can show it', async () => {
    const e = new Fake({ cloud: out(['a', 'b']) });
    const c = await narrowCard(await input(), env(e));
    expect(c.blocked).toBeTruthy();
    expect(c.choices).toEqual([]);
    expect(e.cloud).toEqual([]);
    expect(e.device).toEqual([]);
    expect(c.cloudPayload).toBeNull();
    expect(questionInPayload(c.unsentPayload!)).toBe(narrowAsk(await input()));
    expect(sheetWanted(c, { cloudOn: false, cloudConfigured: true })).toBe(true);
    expect(c.narrow?.level).toBe(1);
  });
  it('a copy with no project settings: no card, and no line that would go', async () => {
    const c = await narrowCard(await input(), env(new NullEngine(), { allowCloud: true }));
    expect(c.blocked).toBeTruthy();
    expect(c.unsentPayload ?? null).toBeNull();
  });
  it('the on-device answer is unusable: online help is tried when it is on, and only then', async () => {
    const e = new Fake({ device: 'not json', cloud: out(['a cold drink', 'something to eat']) });
    const on = await narrowCard(await input(), env(e, { deviceReady: true, allowCloud: true }));
    expect(on.source).toBe('in-cloud');
    expect(labels(on)).toEqual(['a cold drink', 'something to eat', 'something else']);
    const e2 = new Fake({ device: 'not json', cloud: out(['a', 'b']) });
    const off = await narrowCard(await input(), env(e2, { deviceReady: true }));
    // online help is off: it is not asked, and since 18 Nov the rules make the broader choices (a model was asked)
    expect(off.blocked).toBeFalsy();
    expect(off.source).toBe('code');
    expect(off.narrow?.by).toBe('rules');
    expect(e2.cloud).toEqual([]);
  });
  it('online help fails: no card, and the card never says "nothing was sent"', async () => {
    const c = await narrowCard(await input(), env(new Fake({ cloud: new Error('503 unavailable') }), { allowCloud: true }));
    expect(c.blocked).toBeTruthy();
    expect(c.cloudAttempted).toBeTruthy();
    expect(madeWhere(c, { about: 'About Frank' }).left).toBe('maybe');
    // the browser knew it was offline: it certainly did not leave
    const off = await narrowCard(await input(), env(new Fake({ cloud: Object.assign(new Error('offline'), { notSent: true }) }), { allowCloud: true }));
    expect(off.cloudAttempted ?? null).toBeNull();
    expect(madeWhere(off, { about: 'About Frank' }).left).toBe('nothing');
  });
  it('online help that neither answers nor fails is not waited for for ever: no card, and "may have left"', async () => {
    const hang = new Fake({ cloud: out(['a', 'b']) });
    hang.runCloud = () => new Promise<never>(() => { /* never settles */ });
    const c = await narrowCard(await input(), { ...env(hang, { allowCloud: true }), cloudWaitMs: 20 });
    expect(c.blocked).toBeTruthy();
    expect(c.cloudAttempted).toBeTruthy();
    expect(c.trace?.find((t) => t.step === 'stripped')?.why).toMatch(/no answer within/);
    // the same limit holds for an open question
    const q = await makeCard('What do you want to do this weekend?', { ...env(hang, { allowCloud: true }), cloudWaitMs: 20 });
    expect(q.blocked).toBeTruthy();
    expect(q.retry).toBeTruthy();
    expect(madeWhere(q, { about: 'About Frank' }).left).toBe('maybe');
  });
  it('a question that still holds an About-me word after stripping is not sent', async () => {
    // a nickname inside another word is not swapped by the stripper; the leak gate is the last check
    const i: NarrowInput = { asked: 'Would you like chili?', rejected: ['yes'], level: 1, sofar: [] };
    const e = new Fake({ cloud: out(['soup', 'toast']) });
    const c = await narrowCard(i, env(e, { allowCloud: true }));
    for (const sent of e.cloud) expect(sent).not.toMatch(/chili|pot roast/);
    expect(c.cloudPayload ?? '').not.toMatch(/chili/);
  });
});

describe('the same card guards as every card', () => {
  it('a way out is no choice, nothing offered before comes back, no doubles, no negatives, no invented name, three at most', () => {
    const i = { asked: 'Would you like tea or coffee?', rejected: ['tea', 'coffee'] };
    const r = narrowChoices(['Tea', 'something else', 'a cold drink', 'A cold drink', 'not a drink', 'Marguerite', 'something to eat', 'a rest', 'a walk', 'other'], i, { profile: SAMPLE_PROFILE });
    expect(r.kept).toEqual(['a cold drink', 'something to eat', 'a rest']);
    expect(r.dropped.map((d) => d.label)).toEqual(['Tea', 'something else', 'A cold drink', 'not a drink', 'Marguerite', 'other', 'a walk']);
  });
  it('fewer than two real choices from the model: the rules make the broader choices, and the card says so (never a card with one choice)', async () => {
    for (const choices of [['something else'], ['tea', 'coffee'], ['a rest'], ['a rest', 'other'], []]) {
      const c = await narrowCard(await input(), env(new Fake({ cloud: out(choices) }), { allowCloud: true }));
      expect(c.blocked, JSON.stringify(choices)).toBeFalsy();
      expect(labels(c)).toEqual(['something cold', 'something sweet', 'something else']);
      expect(c.source).toBe('code');
      expect(c.narrow).toMatchObject({ level: 1, by: 'rules' });
      expect(madeWhere(c, { about: 'About Frank' })).toMatchObject({ maker: 'codeAsked', left: 'sent' });
    }
  });
  it('the rules have nothing broader left either: no narrowing card', async () => {
    const used: NarrowInput = { asked: 'Zzz?', rejected: ['food or drink', 'my body', 'something to do', 'a person', 'a place', 'a feeling'], level: 2, sofar: [] };
    const c = await narrowCard(used, env(new Fake({ cloud: out(['a place']) }), { allowCloud: true }));
    expect(c.blocked).toBeTruthy();
    expect(c.choices).toEqual([]);
  });
  it.each(['question', 'which one', 'choices', 'something else', '', 'a rest', 'Frank'])('never a generic title, a choice or the person\'s name as the title (model topic "%s")', async (topic) => {
    const c = await narrowCard(await input(), env(new Fake({ cloud: out(['a cold drink', 'a rest'], topic) }), { allowCloud: true }));
    expect(c.blocked).toBeFalsy();
    expect(c.topic).not.toMatch(GENERIC);
    expect(labels(c).map((l) => l.toLowerCase())).not.toContain(c.topic.toLowerCase());
    expect(c.topic).not.toContain('Frank');
  });
  it('exactly one way out, no two tiles alike, and the line to say names what is on the card', async () => {
    const c = await narrowCard(await input(), env(new Fake({ cloud: out(['a cold drink', 'something to eat', 'a rest', 'a nap']) }), { allowCloud: true }));
    expect(c.choices.filter((x) => x.role === 'escape').map((x) => x.label)).toEqual(['something else']);
    expect(new Set(labels(c)).size).toBe(c.choices.length);
    expect(c.say).toBe('Something else, then: a cold drink, something to eat, a rest, or something else?');
    expect(c.asked).toBe('Would you like tea or coffee?');
    expect(c.why?.decided).toContain('the same rules checked them');
    expect(c.notes.join(' ')).toContain('A narrowing card (1 of 2)');
  });
  it('a placeholder the cloud left in a choice never reaches the card', async () => {
    const i: NarrowInput = { asked: 'Would you like to call Jen or Tyler?', rejected: ['Jen', 'Tyler'], level: 1, sofar: [] };
    const c = await narrowCard(i, env(new Fake({ cloud: out(['Person C', 'a visit', 'a letter']) }), { allowCloud: true }));
    expect(labels(c).join(' ')).not.toMatch(/Person [A-Z]/);
  });
});

describe('two levels, then the screen stops offering it', () => {
  it(`NARROW_LEVELS is ${NARROW_LEVELS}`, () => { expect(NARROW_LEVELS).toBe(2); });
  it('offered after the way out of a choice, a yes / no or a feeling card; not after "not sure", and not after the second step', async () => {
    const card = await first();
    expect(canNarrow(card, 'something else')).toBe(true);
    expect(canNarrow(await first('How are you feeling today?'), 'something else')).toBe(true);
    expect(canNarrow(await first('Are you hungry?'), 'not sure')).toBe(false);
    expect(canNarrow({ ...card, narrow: { level: 1, rejected: [] } }, 'something else')).toBe(true);
    expect(canNarrow({ ...card, narrow: { level: 2, rejected: [] } }, 'something else')).toBe(false);
    expect(canNarrow({ ...card, kind: 'needs' }, 'something else')).toBe(false);
  });
  it('a third step is never numbered past the second', async () => {
    const c = await narrowCard({ ...(await input()), level: 5 }, env(new Fake({ cloud: out(['a', 'b']) }), { allowCloud: true, profile: EMPTY_PROFILE }));
    expect(c.narrow?.level).toBe(2);
  });
});
