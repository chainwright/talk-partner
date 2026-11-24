// 16 Nov 2026 (judge round 2, should-fix): three things a carer tripped on.
//  1. With cloud help only, "Who should we call tonight?" offered "family / friend": the cloud step never sees About
//     me. The general words are now replaced on this computer by the people About me names; nothing more is sent.
//  2. At two choices a card, a third good choice ("visit family") was dropped without a word. It now sits on a next page.
//  3. "Less support" and "Support: more (2 choices)" read backwards. They are named by what the person sees.
// Fakes stand in for the SDK; the answers they return are the ones recorded in the review's drive log.
import { describe, expect, it } from 'vitest';
import { COPY } from '../../core/copy';
import type { DeviceStatus, Engine, ModelResult } from '../../core/engine';
import { makeCard } from '../../core/pipeline';
import { cloudTextRequest } from '../../core/requests';
import { dropGenericWho } from '../../core/rules';
import { SAMPLE_PROFILE } from '../../core/sample';
import type { Card, ModelOutput, SupportLevel } from '../../core/types';
import { PROFILE } from './fixtures';

class CloudOnly implements Engine {
  label = 'fake';
  modes = { device: 'ONLY_ON_DEVICE', cloud: 'PREFER_IN_CLOUD' };
  cloudConfigured = true;
  cloudCalls: string[] = [];
  constructor(private cloud: ModelOutput) {}
  async deviceStatus(): Promise<DeviceStatus> { return 'unavailable'; }
  async prepareDevice() {}
  async runDevice(): Promise<ModelResult> { throw new Error('no device model'); }
  cloudRequest(q: string) { return cloudTextRequest(q); }
  async runCloud(q: string): Promise<ModelResult> { this.cloudCalls.push(q); return { text: JSON.stringify(this.cloud), source: 'in-cloud', ms: 3 }; }
}
const env = (e: Engine, support: SupportLevel = 'more', profile = SAMPLE_PROFILE) => ({ profile, support, engine: e, allowCloud: true, deviceReady: false });
const answers = (c: Card) => c.choices.filter((x) => x.role === 'answer').map((x) => x.label);
const R = COPY.how.why.rules;

describe('a "who to call" card made with cloud help offers the people About me names', () => {
  it('family / friend from the cloud become Jenny / Tyler, added by code; the person who lives here is left out', async () => {
    const e = new CloudOnly({ topic: 'call', kind: 'choice', choices: ['family', 'friend'] });
    const c = await makeCard('Who should we call tonight?', env(e));
    expect(answers(c)).toEqual(['Jenny', 'Tyler']);
    expect(c.choices.at(-1)!.label).toBe('someone else');
    expect(c.source).toBe('in-cloud');
    expect(c.why!.dropped).toEqual([{ label: 'family', rule: R.genericWho }, { label: 'friend', rule: R.genericWho }, { label: 'Beth', rule: R.overCap }]);
    expect(c.why!.added).toEqual([{ label: 'Jenny', from: 'people from About me' }, { label: 'Tyler', from: 'people from About me' }, { label: 'Beth', from: 'people from About me' }]);
    expect(c.why!.kept).toEqual([]);
    expect(c.notes).toContain(COPY.notes.completedFrom('people from About me'));
  });
  it('nothing about the people leaves: the request holds no name, and no list of people', async () => {
    const e = new CloudOnly({ topic: 'call', kind: 'choice', choices: ['family', 'friend'] });
    const c = await makeCard('Who should we call tonight?', env(e));
    expect(e.cloudCalls).toEqual(['Who should we call tonight?']);
    // (the fixed instructions mention "Person A" as a label to keep; the question itself is all that is added to them)
    for (const w of ['Jenny', 'Jen ', 'Tyler', 'Carol']) expect(c.cloudPayload).not.toContain(w);
    expect(c.cloudPayload).toBe(JSON.stringify(cloudTextRequest('Who should we call tonight?'), null, 2));
  });
  it('a named person the cloud could not know is never there; a specific role the cloud offers stays, after the family', async () => {
    // (until set E, 16 Nov, the role took a place on the first page and Tyler was left off)
    const e = new CloudOnly({ topic: 'call', kind: 'choice', choices: ['the doctor', 'a friend'] });
    const c = await makeCard('Who should we ring about the tablets?', env(e));
    expect(answers(c)).toEqual(['Jenny', 'Tyler']);
    expect(c.nextPage?.choices.filter((x) => x.role === 'answer').map((x) => x.label)).toEqual(['Beth', 'the doctor']);
  });
  it('a bare relation word of someone listed counts as general', () => {
    expect(dropGenericWho(['daughter', 'Grace', 'the nurse'], 'Who shall we invite on Sunday?', PROFILE)).toEqual(['Grace', 'the nurse']);
  });
  it.each([
    ['Who do you want to sit next to at the party?', SAMPLE_PROFILE], // not a call / visit / invite question
    ['Who was your best friend at school?', SAMPLE_PROFILE], // a person from the past: the family is not offered
    ['Who should we call tonight?', { ...SAMPLE_PROFILE, people: SAMPLE_PROFILE.people.slice(0, 2) }], // one person to offer: not a choice
  ])('left alone: %s', (q, profile) => {
    expect(dropGenericWho(['family', 'a friend'], q, profile)).toEqual(['family', 'a friend']);
  });
});

describe('a choice over the limit goes to the next page instead of being dropped', () => {
  const cloud = { topic: 'weekend', kind: 'choice' as const, choices: ['stay home', 'go out', 'visit family'] };
  it('two at a time: page 1 has two, page 2 has "visit family", each with the way out', async () => {
    const c = await makeCard('What do you want to do this weekend?', env(new CloudOnly(cloud)));
    expect(c.choices.map((x) => x.label)).toEqual(['stay home', 'go out', 'something else']);
    expect(c.nextPage).toBeTruthy();
    expect(c.nextPage!.choices.map((x) => x.label)).toEqual(['visit family', 'something else']);
    expect(c.nextPage!.nextPage ?? null).toBeNull();
    expect(c.notes).toContain(COPY.notes.moreOnNext('visit family', 'something else'));
    expect(c.why!.dropped).toEqual([{ label: 'visit family', rule: R.overCap }]);
    expect(R.overCap).toMatch(/next page/);
  });
  it('the next page says where the card was made and what left, like the first', async () => {
    const c = await makeCard('What do you want to do this weekend?', env(new CloudOnly(cloud)));
    const p = c.nextPage!;
    expect(p.trace).toEqual(c.trace);
    expect(p.source).toBe('in-cloud');
    expect(p.cloudPayload).toBe(c.cloudPayload);
    expect(p.why).toBe(c.why);
  });
  it('three at a time: all three on one card, no next page', async () => {
    const c = await makeCard('What do you want to do this weekend?', env(new CloudOnly(cloud), 'mild'));
    expect(answers(c)).toEqual(['stay home', 'go out', 'visit family']);
    expect(c.nextPage ?? null).toBeNull();
    expect(c.why!.dropped).toEqual([]);
  });
});

describe('the support controls are named by what the person sees', () => {
  it('the button that hides the choices says so', () => {
    expect(COPY.card.less).toBe('Hide the choices');
    expect(JSON.stringify(COPY)).not.toMatch(/Less support/);
  });
  it('the setting counts choices; it does not say "more" for fewer', () => {
    expect(COPY.support.label).toBe('Choices on a card');
    expect(COPY.support.options).toEqual({ mild: '3 at a time', more: '2 at a time', most: '2 at a time, larger tiles' });
  });
});
