// REBUILD_SPEC §2.5 non-negotiable regression: "Do you want coffee or tea?" gives coffee / tea / something else in
// EVERY engine state. Plus the matrix invariants: "sent" only when the source is in-cloud, the private leg never gets
// a stripped prompt, the stripped leg never gets the profile, a blocked card has no choices.
import { describe, expect, it } from 'vitest';
import type { DeviceStatus, Engine, ModelResult } from '../../core/engine';
import { makeCard } from '../../core/pipeline';
import { cloudTextRequest, pictureRequestBody } from '../../core/requests';
import { SAMPLE_PROFILE } from '../../core/sample';
import type { ModelOutput } from '../../core/types';

type ModelState = 'ready' | 'garbage-options' | 'empty' | 'throws' | 'absent';
type CloudState = 'off' | 'unconfigured' | 'throws' | 'offline-device-fallback' | 'ok';

class MatrixEngine implements Engine {
  label = 'matrix';
  modes = { device: 'ONLY_ON_DEVICE', cloud: 'PREFER_IN_CLOUD', pictures: 'ONLY_IN_CLOUD' };
  deviceCalls: string[] = [];
  cloudCalls: string[] = [];
  readonly cloudConfigured: boolean;
  constructor(private m: ModelState, private c: CloudState, private deviceOut: ModelOutput) {
    this.cloudConfigured = c !== 'unconfigured';
  }
  async deviceStatus(): Promise<DeviceStatus> { return this.m === 'absent' ? 'unavailable' : 'available'; }
  async prepareDevice() {}
  async runDevice(prompt: string): Promise<ModelResult> {
    this.deviceCalls.push(prompt);
    if (this.m === 'throws') throw new Error('device failed');
    if (this.m === 'empty') return { text: '', source: 'on-device', ms: 1 };
    // the model's topic "coffee" must never filter out the option "coffee"
    const o = this.m === 'garbage-options' ? { ...this.deviceOut, options: ['want coffee', 'or'] } : this.deviceOut;
    return { text: JSON.stringify(o), source: 'on-device', ms: 1 };
  }
  cloudRequest(q: string) { return cloudTextRequest(q); }
  async runCloud(q: string): Promise<ModelResult> {
    this.cloudCalls.push(q);
    if (this.c === 'throws' || this.c === 'unconfigured') throw new Error('cloud failed');
    const o: ModelOutput = { topic: 'weekend', kind: 'choice', choices: ['Place A', 'Place B'] };
    return { text: JSON.stringify(o), source: this.c === 'offline-device-fallback' ? 'on-device' : 'in-cloud', ms: 1 };
  }
  pictureRequest(w: string) { return pictureRequestBody(w); }
  async picture() { return null; }
}

const MODELS: ModelState[] = ['ready', 'garbage-options', 'empty', 'throws', 'absent'];
const CLOUDS: CloudState[] = ['off', 'unconfigured', 'throws', 'offline-device-fallback', 'ok'];
const labels = (c: { choices: { label: string }[] }) => c.choices.map((x) => x.label);
const env = (e: MatrixEngine, m: ModelState, c: CloudState) => ({
  profile: SAMPLE_PROFILE, support: 'more' as const, engine: e, allowCloud: c !== 'off', deviceReady: m !== 'absent',
});
const PROFILE_WORDS = ['Frank', 'Carol', 'Jenny', 'Tyler', 'pot roast', 'chili', 'the lake', 'hardware store', 'Wheel of Fortune', 'Johnny Cash'];

describe('coffee or tea, every engine state', () => {
  for (const m of MODELS) for (const c of CLOUDS) {
    it(`model ${m} × cloud ${c}`, async () => {
      const e = new MatrixEngine(m, c, { topic: 'coffee', kind: 'yesno', choices: ['yes', 'no'], options: ['coffee', 'tea'] });
      const card = await makeCard('Do you want coffee or tea?', env(e, m, c));
      expect(labels(card)).toEqual(['coffee', 'tea', 'something else']);
      expect(card.blocked ?? null).toBeNull();
      expect(e.cloudCalls).toHaveLength(0);
      expect(card.cloudPayload).toBeNull();
    });
  }
});

describe('matrix invariants on an open question', () => {
  for (const m of MODELS) for (const c of CLOUDS) {
    it(`model ${m} × cloud ${c}`, async () => {
      // a weak device card (two mood words) routes to the stripped leg when cloud help is on
      const e = new MatrixEngine(m, c, { topic: 'weekend', kind: 'choice', choices: ['good', 'bad'] });
      const card = await makeCard('What do you want to do this weekend with Jenny?', env(e, m, c));
      for (const p of e.deviceCalls) expect(p).toContain('ABOUT (kept on this device');
      for (const q of e.cloudCalls) for (const w of PROFILE_WORDS) expect(q.toLowerCase()).not.toContain(w.toLowerCase());
      // "sent" is claimed only for a real in-cloud answer
      // "sent" means the question left this computer AND the cloud answered (the answer may still be rejected)
      if (card.cloudPayload) {
        expect(e.cloudCalls).toHaveLength(1);
        expect(['ok']).toContain(c);
      }
      if (c === 'offline-device-fallback' && e.cloudCalls.length) {
        expect(card.cloudPayload).toBeNull();
        expect(card.ranOffline).toBe(true);
      }
      if (c === 'off') expect(e.cloudCalls).toHaveLength(0);
      if (card.blocked) expect(card.choices.filter((x) => x.role === 'answer')).toHaveLength(0);
      else expect(card.choices.filter((x) => x.role === 'answer').length).toBeGreaterThanOrEqual(2);
      expect(card.choices.filter((x) => x.role === 'escape').length).toBeLessThanOrEqual(1);
    });
  }
});
