import { describe, expect, it } from 'vitest';
import type { DeviceStatus, Engine, ModelResult } from '../../core/engine';
import { cloudTextRequest, pictureRequestBody } from '../../core/requests';
import { assemble, bodyDetailCard, makeCard, parseModelOutput } from '../../core/pipeline';
import { aboutBlock, devicePrompt } from '../../core/prompt';
import { isGenericWord, restoreNames, stripQuestion } from '../../core/strip';
import type { ModelOutput } from '../../core/types';
import { PROFILE } from './fixtures';

class FakeEngine implements Engine {
  label = 'fake';
  modes = { device: 'ONLY_ON_DEVICE', cloud: 'PREFER_IN_CLOUD', pictures: 'ONLY_IN_CLOUD' };
  deviceCalls: string[] = [];
  cloudCalls: string[] = [];
  constructor(
    public cloudConfigured: boolean,
    private deviceOut: ModelOutput | ((p: string) => ModelOutput),
    private cloudOut: ModelOutput = { topic: 'x', kind: 'choice', choices: ['a', 'b'] },
  ) {}
  async deviceStatus(): Promise<DeviceStatus> { return 'available'; }
  async prepareDevice() {}
  async runDevice(prompt: string): Promise<ModelResult> {
    this.deviceCalls.push(prompt);
    const o = typeof this.deviceOut === 'function' ? this.deviceOut(prompt) : this.deviceOut;
    return { text: JSON.stringify(o), source: 'on-device', ms: 900 };
  }
  cloudRequest(q: string) { return cloudTextRequest(q); }
  async runCloud(q: string): Promise<ModelResult> {
    if (!this.cloudConfigured) throw new Error('cloud not configured');
    this.cloudCalls.push(q);
    return { text: JSON.stringify(this.cloudOut), source: 'in-cloud', ms: 1500 };
  }
  pictureRequest(w: string) { return pictureRequestBody(w); }
  async picture() { return null; }
}

const env = (engine: Engine, extra: Partial<Parameters<typeof makeCard>[1]> = {}) => ({
  profile: PROFILE, support: 'more' as const, engine, allowCloud: true, deviceReady: true, ...extra,
});
const labels = (c: { choices: { label: string }[] }) => c.choices.map((x) => x.label);
const PROFILE_WORDS = ['Maria', 'Sam', 'Grace', 'Leo', 'Peter', 'lamb', 'omelette', 'allotment', 'westerns', 'Elvis', 'opera', 'grandson', 'daughter'];

describe('device card', () => {
  it('keeps model choices, adds the escape, builds the spoken line, stays on device', async () => {
    const e = new FakeEngine(true, { topic: 'tea', kind: 'choice', choices: ['lamb', 'rice', 'salad'] });
    const c = await makeCard('What would you like for tea tonight?', env(e, { support: 'mild' }));
    expect(labels(c)).toEqual(['lamb', 'rice', 'salad', 'something else']);
    expect(c.say).toBe('What would you like for tea tonight? Lamb, rice, salad, or something else?');
    expect(c.source).toBe('on-device');
    expect(c.cloudPayload).toBeNull();
    expect(e.cloudCalls).toHaveLength(0);
  });

  it('the profile goes only into the device prompt', async () => {
    const e = new FakeEngine(true, { topic: 'tea', kind: 'choice', choices: ['lamb', 'rice', 'salad'] });
    await makeCard('What would you like for tea tonight?', env(e));
    expect(e.deviceCalls[0]).toContain('ABOUT (kept on this device');
    expect(e.deviceCalls[0]).toContain('Grace (daughter)');
  });

  it('aux-verb question becomes yes / no / not sure whatever the model says', async () => {
    const e = new FakeEngine(true, { topic: 'radio', kind: 'choice', choices: ['radio 4', 'music'] });
    const c = await makeCard('Do you want the radio on?', env(e));
    expect(c.kind).toBe('yesno');
    expect(labels(c)).toEqual(['yes', 'no', 'not sure']);
  });

  it('or-pair overrides model choices', async () => {
    const e = new FakeEngine(true, { topic: 'drink', kind: 'choice', choices: ['tea', 'coffee', 'water'], options: ['cocoa', 'hot milk'] });
    const c = await makeCard('Would you like cocoa or hot milk?', env(e));
    expect(labels(c)).toEqual(['cocoa', 'hot milk', 'something else']);
  });

  it('feeling question gets the general scale', async () => {
    const e = new FakeEngine(true, { topic: 'walk', kind: 'feeling', choices: ['lovely', 'windy'] });
    const c = await makeCard('How was the walk by the river?', env(e));
    expect(labels(c)).toEqual(['good', 'bad', 'something else']);
    const m = await makeCard('How was the walk by the river?', env(e, { support: 'mild' }));
    expect(labels(m)).toEqual(['good', 'okay', 'bad', 'something else']);
  });

  it('taste and person subtypes', () => {
    const o: ModelOutput = { topic: 'x', kind: 'feeling', choices: [] };
    expect(labels(assemble('How did the stew taste?', null, o, PROFILE, 'mild', 'on-device'))).toEqual(['tasty', 'plain', 'too salty', 'something else']);
    expect(labels(assemble('How did the stew taste?', null, o, PROFILE, 'more', 'on-device'))).toEqual(['tasty', 'plain', 'something else']);
    expect(labels(assemble('What do you think of the new nurse?', null, o, PROFILE, 'mild', 'on-device'))).toEqual(['like them', 'okay', 'unhappy', 'something else']);
    expect(labels(assemble('What do you think about painting the hall?', null, o, PROFILE, 'more', 'on-device'))).toEqual(['good idea', 'leave it', 'something else']);
  });

  it("the partner's own name shows as 'you' and is read as 'me'", async () => {
    const e = new FakeEngine(true, { topic: 'smile', kind: 'choice', choices: ['Leo', 'Maria', 'Grace'] });
    const c = await makeCard('Who made you smile today?', env(e));
    expect(labels(c)).toEqual(['Leo', 'you', 'someone else']);
    expect(c.say).toBe('Who made you smile today? Leo, me, or someone else?');
    expect(c.choices[1].picture).toEqual({ type: 'person', personId: null, initial: 'M' });
  });

  it('household members are not offered for a visit', async () => {
    const e = new FakeEngine(true, { topic: 'visit', kind: 'choice', choices: ['Sam', 'Grace', 'Peter'] });
    const c = await makeCard('Who should visit at the weekend?', env(e));
    expect(labels(c)).toEqual(['Grace', 'Peter', 'someone else']);
  });

  it('"more support" shows two answers and one escape', async () => {
    const e = new FakeEngine(true, { topic: 'tea', kind: 'choice', choices: ['lamb', 'rice', 'salad'] });
    const c = await makeCard('What would you like for tea tonight?', env(e, { support: 'more' }));
    expect(labels(c)).toEqual(['lamb', 'rice', 'something else']);
  });

  it('"most support" shows two answers and one escape', async () => {
    const e = new FakeEngine(true, { topic: 'tea', kind: 'choice', choices: ['lamb', 'rice', 'salad'] });
    const c = await makeCard('What would you like for tea tonight?', env(e, { support: 'most' }));
    expect(labels(c)).toEqual(['lamb', 'rice', 'something else']);
  });

  it('pictures: built-in for fixed words, person for names, cloud for generic words', async () => {
    const e = new FakeEngine(true, { topic: 'call', kind: 'choice', choices: ['Grace', 'swimming'] });
    const c = await makeCard('What shall we do this afternoon?', env(e));
    expect(c.choices.map((x) => x.picture.type)).toEqual(['person', 'cloud', 'builtin']);
  });
});

describe('split, body map, pain', () => {
  it('a two-part question shows the first part and keeps the second for Next', async () => {
    const e = new FakeEngine(true, { topic: 'post', kind: 'yesno', choices: ['yes', 'no'] });
    const c = await makeCard('Has the post come, and do you want me to read it to you?', env(e));
    expect(c.asked).toBe('Has the post come?');
    expect(c.pending).toBe('Do you want me to read it to you?');
  });

  it('body "where" questions use the fixed map and never call a model', async () => {
    const e = new FakeEngine(true, { topic: 'x', kind: 'choice', choices: ['a', 'b'] });
    const c = await makeCard('Where does it ache?', env(e));
    expect(c.kind).toBe('body');
    // "more support": two at a time, one body part per target; "somewhere else" leads to the next two
    expect(labels(c)).toEqual(['head', 'chest', 'somewhere else']);
    expect(c.say).toBe('Where does it ache? Head, chest, or somewhere else?');
    expect(labels(c.nextPage!)).toEqual(['stomach', 'back', 'somewhere else']);
    expect(labels(c.nextPage!.nextPage!)).toEqual(['arms', 'legs', 'somewhere else']);
    expect(c.nextPage!.nextPage!.nextPage).toBeNull();
    expect(e.deviceCalls).toHaveLength(0);
    const m = await makeCard('Where does it ache?', env(e, { support: 'mild' }));
    expect(labels(m)).toEqual(['head', 'chest', 'stomach', 'somewhere else']);
    expect(labels(m.nextPage!)).toEqual(['back', 'arms', 'legs', 'somewhere else']);
  });

  it('step 2 narrows the region', () => {
    const c = bodyDetailCard('legs', PROFILE, 'more');
    expect(c.bodyStep).toBe(2);
    // Changed 11 Nov 2026 (build spec §2.11): "left" is the person's own left, so the card says "your left leg".
    expect(labels(c)).toEqual(['your left leg', 'your right leg', 'somewhere else']);
    expect(labels(c.nextPage!)).toEqual(['feet', 'somewhere else']);
    expect(c.choices.map((x) => x.picture)).toEqual([{ type: 'builtin', id: 'body:left leg' }, { type: 'builtin', id: 'body:right leg' }, { type: 'builtin', id: 'somewhere else' }]);
    expect(c.say).toBe('Where in the legs? Your left leg, your right leg, or somewhere else?');
  });

  it('pain amount: a little / a lot at "more", three steps at "mild"', async () => {
    const e = new FakeEngine(true, { topic: 'x', kind: 'choice', choices: ['a', 'b'] });
    const c = await makeCard('How much does your knee hurt now?', env(e));
    expect(labels(c)).toEqual(['a little', 'a lot', 'something else']);
    const m = await makeCard('How much does your knee hurt now?', env(e, { support: 'mild' }));
    expect(labels(m)).toEqual(['a little', 'some', 'a lot', 'something else']);
  });
});

describe('cloud routing and the privacy boundary', () => {
  const weak: ModelOutput = { topic: 'message', kind: 'choice', choices: ['happy', 'fine', 'sad'] };
  const fromCloud: ModelOutput = { topic: 'message for Person A', kind: 'choice', choices: ['thank you', 'come soon', 'love you'] };

  it('a weak device card goes to the cloud with ONLY the stripped question', async () => {
    const e = new FakeEngine(true, weak, fromCloud);
    const c = await makeCard('What should I tell Grace when she rings?', env(e));
    expect(e.cloudCalls).toEqual(['What should I tell Person A when she rings?']);
    expect(c.source).toBe('in-cloud');
    expect(c.route.to).toBe('cloud');
    expect(c.topic).toBe('message for Grace'); // restored on device
    expect(labels(c)).toEqual(['thank you', 'come soon', 'something else']);
    // the exact payload shown in the panel holds no profile data
    for (const w of PROFILE_WORDS) expect(c.cloudPayload).not.toContain(w);
    expect(c.cloudPayload).toContain('Person A');
  });

  it('cloud not configured: device card kept, payload shown as not sent', async () => {
    const e = new FakeEngine(false, weak);
    const c = await makeCard('What should I tell Grace when she rings?', env(e));
    expect(c.source).toBe('on-device');
    expect(c.cloudPayload).toBeNull();
    expect(c.unsentPayload).toContain('Person A');
    expect(c.notes.join(' ')).toMatch(/not configured/);
  });

  it('cloud switched off: nothing is sent', async () => {
    const e = new FakeEngine(true, weak, fromCloud);
    const c = await makeCard('What should I tell Grace when she rings?', env(e, { allowCloud: false }));
    expect(e.cloudCalls).toHaveLength(0);
    expect(c.cloudPayload).toBeNull();
  });

  it('device model missing: no silent fallback; open questions are blocked, not sent', async () => {
    const e = new FakeEngine(false, weak);
    const c = await makeCard('What would you like to listen to?', env(e, { deviceReady: false }));
    expect(c.blocked).toBeTruthy();
    expect(e.deviceCalls).toHaveLength(0);
    expect(e.cloudCalls).toHaveLength(0);
  });

  it('device model missing: code-only cards still work locally', async () => {
    const e = new FakeEngine(false, weak);
    const c = await makeCard('Are you warm enough?', env(e, { deviceReady: false }));
    expect(c.blocked).toBeFalsy();
    expect(c.source).toBe('code');
    expect(labels(c)).toEqual(['yes', 'no', 'not sure']);
  });

  it('device model missing + cloud allowed: the cloud gets only the stripped question', async () => {
    const e = new FakeEngine(true, weak, { topic: 'music', kind: 'choice', choices: ['radio', 'records'] });
    const c = await makeCard('What would Peter like to listen to?', env(e, { deviceReady: false }));
    expect(e.cloudCalls).toEqual(['What would Person A like to listen to?']);
    expect(c.source).toBe('in-cloud');
  });
});

describe('helpers', () => {
  it('stripQuestion replaces every profile name and long numbers', () => {
    const s = stripQuestion("Shall Sam drive you to Leo's school? Call 07700 900123", PROFILE);
    expect(s.text).toBe("Shall Person A drive you to Person B's school? Call [number]");
    expect(restoreNames('Person B', s.map)).toBe('Leo');
  });
  it('isGenericWord rejects names', () => {
    expect(isGenericWord('umbrella', PROFILE)).toBe(true);
    expect(isGenericWord('library', PROFILE)).toBe(false); // an About me place
    expect(isGenericWord("Grace's house", PROFILE)).toBe(false);
  });
  it('aboutBlock marks the household', () => {
    expect(aboutBlock(PROFILE)).toContain('Maria and Sam live with them');
    expect(devicePrompt('Q?', PROFILE).endsWith('Partner asks: Q?')).toBe(true);
  });
  it('parseModelOutput tolerates junk', () => {
    expect(parseModelOutput('nonsense')).toBeNull();
    expect(parseModelOutput('```json\n{"topic":"t","kind":"weird","choices":["a",1]}\n```')).toEqual({ topic: 't', kind: 'choice', choices: ['a'], options: [] });
  });
  it('the picture request carries one word and nothing else', () => {
    const body = JSON.stringify(pictureRequestBody('umbrella'));
    expect(body).toContain('Word: umbrella');
    for (const w of PROFILE_WORDS) expect(body).not.toContain(w);
  });
});
