// 16 Nov 2026 (judge round 2, P0-1): what the on-device step does that the cloud step cannot. The private step gets
// the About-me lists, so its card can offer the family's own names and places; the cloud step never sees them. A card
// from the private step whose every answer is an About-me entry therefore stays on this computer even with cloud help
// on, and says which answers came from About me. Fakes stand in for the SDK here; the real run is in
// devlog/ondevice_proof_1/.
import { describe, expect, it } from 'vitest';
import { COPY } from '../../core/copy';
import type { DeviceStatus, Engine, ModelResult } from '../../core/engine';
import { makeCard, needsNoModel } from '../../core/pipeline';
import { cloudTextRequest, pictureRequestBody } from '../../core/requests';
import { fromAboutMe, plainPair } from '../../core/rules';
import { SAMPLE_PROFILE } from '../../core/sample';
import type { ModelOutput } from '../../core/types';

class Fake implements Engine {
  label = 'fake';
  modes = { device: 'ONLY_ON_DEVICE', cloud: 'PREFER_IN_CLOUD', pictures: 'ONLY_IN_CLOUD' };
  cloudConfigured = true;
  deviceCalls: string[] = [];
  cloudCalls: string[] = [];
  constructor(private dev: ModelOutput, private cloud: ModelOutput = { topic: 'call', kind: 'choice', choices: ['family', 'friend'] }) {}
  async deviceStatus(): Promise<DeviceStatus> { return 'available'; }
  async prepareDevice() {}
  async runDevice(p: string): Promise<ModelResult> { this.deviceCalls.push(p); return { text: JSON.stringify(this.dev), source: 'on-device', ms: 3 }; }
  cloudRequest(q: string) { return cloudTextRequest(q); }
  async runCloud(q: string): Promise<ModelResult> { this.cloudCalls.push(q); return { text: JSON.stringify(this.cloud), source: 'in-cloud', ms: 3 }; }
  pictureRequest(w: string) { return pictureRequestBody(w); }
  async picture() { return null; }
}
const env = (e: Engine, allowCloud = true) => ({ profile: SAMPLE_PROFILE, support: 'more' as const, engine: e, allowCloud, deviceReady: true });
const labels = (c: { choices: { label: string }[] }) => c.choices.map((x) => x.label);

describe('fromAboutMe: which list a label comes from', () => {
  it.each([['Jenny', 'people'], ['Jen', 'people'], ['tyler', 'people'], ['lake', 'places'], ['the lake', 'places'], ['church', 'places'], ['pot roast', 'foods'], ['Wheel of Fortune', 'TV'], ['Johnny Cash', 'music']])('%s -> %s', (label, list) => {
    expect(fromAboutMe(label, SAMPLE_PROFILE)).toBe(list);
  });
  it.each(['family', 'friend', 'Dr Smith', 'stay home', 'go out', ''])('%s is not an About-me entry', (label) => {
    expect(fromAboutMe(label, SAMPLE_PROFILE)).toBeNull();
  });
});

describe('a card of About-me answers from the private step stays on this computer', () => {
  // the real on-device answer of 16 Nov 2026 for this question: two real people and one invented name
  const who: ModelOutput = { topic: 'call', kind: 'choice', choices: ['Jenny', 'Tyler', 'Dr Smith'] };

  it('cloud help ON: the cloud is not asked, the card offers the real names, nothing is sent', async () => {
    const e = new Fake(who);
    const c = await makeCard('Who should we call tonight?', env(e));
    expect(e.deviceCalls).toHaveLength(1);
    expect(e.deviceCalls[0]).toContain('ABOUT (kept on this device');
    expect(e.cloudCalls).toEqual([]);
    expect(labels(c)).toEqual(['Jenny', 'Tyler', 'someone else']);
    expect(c.source).toBe('on-device');
    expect(c.cloudPayload).toBeNull();
    expect(c.unsentPayload ?? null).toBeNull();
    expect(c.why!.personal).toEqual(['Jenny', 'Tyler']);
    expect(c.why!.dropped).toEqual([{ label: 'Dr Smith', rule: COPY.how.why.rules.inventedName }]);
    expect(c.notes).toContain(COPY.notes.personalKept);
    expect(c.trace!.find((t) => t.step === 'private')).toMatchObject({ ran: 'on-device', used: true });
    expect(c.trace!.find((t) => t.step === 'stripped')).toMatchObject({ ran: 'skipped', why: COPY.notes.trace.cloudNotNeeded });
  });

  it('places: "the lake" on the card as "lake" still counts as About me', async () => {
    const e = new Fake({ topic: 'this weekend', kind: 'choice', choices: ['lake', 'church', 'Packers game'] });
    const c = await makeCard('What do you want to do this weekend?', env(e));
    expect(labels(c)).toEqual(['lake', 'church', 'something else']);
    expect(c.why!.personal).toEqual(['lake', 'church']);
    expect(e.cloudCalls).toEqual([]);
  });

  it('the same question without the device model: the cloud card cannot offer the names (it never had them)', async () => {
    const e = new Fake(who);
    const c = await makeCard('Who should we call tonight?', { ...env(e), deviceReady: false });
    expect(e.deviceCalls).toEqual([]);
    expect(e.cloudCalls).toEqual(['Who should we call tonight?']);
    for (const w of ['Jenny', 'Jen', 'Tyler', 'Carol', 'Frank']) expect(JSON.stringify(cloudTextRequest(e.cloudCalls[0]))).not.toContain(w);
    expect(c.source).toBe('in-cloud');
  });

  it('a weak device card that is not all About me still goes to the cloud, as before', async () => {
    const e = new Fake({ topic: 'message', kind: 'choice', choices: ['happy', 'fine', 'sad'] }, { topic: 'message', kind: 'choice', choices: ['thank you', 'come soon'] });
    const c = await makeCard('What should I tell Jenny when she rings?', env(e));
    expect(e.cloudCalls).toEqual(['What should I tell Person A when she rings?']);
    expect(c.source).toBe('in-cloud');
    expect(c.why!.personal).toEqual([]);
  });

  it('a weak card with one About-me answer among others is not "all About me": the cloud is asked', async () => {
    const e = new Fake({ topic: 'weekend', kind: 'choice', choices: ['happy', 'lake', 'sad'] });
    const c = await makeCard('What do you want to do this weekend?', env(e));
    expect(e.cloudCalls).toHaveLength(1);
    expect(c.notes).not.toContain(COPY.notes.personalKept);
  });
});

describe('needsNoModel: where a model call would only add a wait', () => {
  it.each(['Do you want coffee or tea?', 'Should we ring Jen or Tyler?', 'Do you need the toilet?', 'How was therapy today?', 'Where does it hurt?', 'How bad is the pain?', 'What year did we get married?', 'Do you want tea or not?'])('%s runs no model', (q) => {
    expect(needsNoModel(q, SAMPLE_PROFILE)).toBe(true);
  });
  it.each(['What do you want to do this weekend?', 'Who should we call tonight?', 'Which shirt for the doctor?', 'Nina Simone, or would you rather have the Antiques Roadshow on?', 'Do you want to walk to the shops or stay in the warm?', 'Do you want soup, a sandwich, or would you rather wait for tea?'])('%s asks the model', (q) => {
    expect(needsNoModel(q, SAMPLE_PROFILE)).toBe(false);
  });
  it('plainPair: short, no comma, one or two words a side', () => {
    expect(plainPair('Do you want coffee or tea?', ['coffee', 'tea'])).toBe(true);
    expect(plainPair('Tea, or coffee?', ['tea', 'coffee'])).toBe(false);
    expect(plainPair('Do you want to walk to the shops or stay in the warm?', ['walk to the shops', 'stay in the warm'])).toBe(false);
  });
});
