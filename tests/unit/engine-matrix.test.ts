// build spec §2.5 non-negotiable regression: "Do you want coffee or tea?" gives coffee / tea / something else in
// EVERY engine state. Plus the matrix invariants (§5.1): or-pairs always give a card; blocked cards carry no choices;
// "sent" only when the source is in-cloud; the private leg never gets a stripped prompt; the stripped leg never gets
// the profile. Extended 11 Nov 2026: seven card shapes × seven model states × five cloud states.
import { describe, expect, it } from 'vitest';
import type { DeviceStatus, Engine, ModelResult } from '../../core/engine';
import { makeCard } from '../../core/pipeline';
import { cloudTextRequest, pictureRequestBody } from '../../core/requests';
import { SAMPLE_PROFILE } from '../../core/sample';
import { findLeaks, hasPlaceholder } from '../../core/strip';
import type { Card, ModelOutput } from '../../core/types';

type ModelState = 'ready' | 'garbage-options' | 'wrong-kind' | 'topic-is-option' | 'empty' | 'throws' | 'absent';
type CloudState = 'off' | 'unconfigured' | 'throws' | 'offline-device-fallback' | 'ok';

class MatrixEngine implements Engine {
  label = 'matrix';
  modes = { device: 'ONLY_ON_DEVICE', cloud: 'PREFER_IN_CLOUD', pictures: 'ONLY_IN_CLOUD' };
  deviceCalls: string[] = [];
  cloudCalls: string[] = [];
  readonly cloudConfigured: boolean;
  constructor(private m: ModelState, private c: CloudState, private deviceOut: ModelOutput, private cloudOut: ModelOutput = { topic: 'weekend', kind: 'choice', choices: ['Place A', 'Place B'] }) {
    this.cloudConfigured = c !== 'unconfigured';
  }
  async deviceStatus(): Promise<DeviceStatus> { return this.m === 'absent' ? 'unavailable' : 'available'; }
  async prepareDevice() {}
  async runDevice(prompt: string): Promise<ModelResult> {
    this.deviceCalls.push(prompt);
    if (this.m === 'throws') throw new Error('device failed');
    if (this.m === 'empty') return { text: '', source: 'on-device', ms: 1 };
    let o: ModelOutput = this.deviceOut;
    // the model's topic "coffee" must never filter out the option "coffee"
    if (this.m === 'garbage-options') o = { ...o, options: ['want coffee', 'or'] };
    if (this.m === 'wrong-kind') o = { ...o, kind: 'yesno', choices: ['yes', 'no'] };
    if (this.m === 'topic-is-option') o = { ...o, topic: o.options?.[0] ?? o.choices[0] ?? 'x' };
    return { text: JSON.stringify(o), source: 'on-device', ms: 1 };
  }
  cloudRequest(q: string) { return cloudTextRequest(q); }
  async runCloud(q: string): Promise<ModelResult> {
    this.cloudCalls.push(q);
    if (this.c === 'throws' || this.c === 'unconfigured') throw new Error('cloud failed');
    return { text: JSON.stringify(this.cloudOut), source: this.c === 'offline-device-fallback' ? 'on-device' : 'in-cloud', ms: 1 };
  }
  pictureRequest(w: string) { return pictureRequestBody(w); }
  async picture() { return null; }
}

const MODELS: ModelState[] = ['ready', 'garbage-options', 'wrong-kind', 'topic-is-option', 'empty', 'throws', 'absent'];
const CLOUDS: CloudState[] = ['off', 'unconfigured', 'throws', 'offline-device-fallback', 'ok'];
const labels = (c: Card) => c.choices.map((x) => x.label);
const answers = (c: Card) => c.choices.filter((x) => x.role === 'answer');
const env = (e: MatrixEngine, m: ModelState, c: CloudState) => ({
  profile: SAMPLE_PROFILE, support: 'more' as const, engine: e, allowCloud: c !== 'off', deviceReady: m !== 'absent',
});
const PROFILE_WORDS = ['Frank', 'Carol', 'Jenny', 'Tyler', 'pot roast', 'chili', 'the lake', 'hardware store', 'Wheel of Fortune', 'Johnny Cash'];

/** Checks that hold for every card in every cell. */
function invariants(card: Card, e: MatrixEngine, c: CloudState) {
  for (const p of e.deviceCalls) {
    expect(p).toContain('ABOUT (kept on this device');
    expect(hasPlaceholder(p)).toBe(false); // the private leg never receives a stripped prompt
  }
  for (const q of e.cloudCalls) {
    for (const w of PROFILE_WORDS) expect(q.toLowerCase()).not.toContain(w.toLowerCase());
    expect(findLeaks(q, SAMPLE_PROFILE)).toEqual([]);
    expect(q).not.toContain('ABOUT');
  }
  // "sent" means the question left this computer AND the cloud answered (the answer may still be rejected)
  if (card.cloudPayload) {
    expect(e.cloudCalls).toHaveLength(1);
    expect(c).toBe('ok');
    expect(card.cloudPayload).toBe(JSON.stringify(cloudTextRequest(e.cloudCalls[0]), null, 2));
  }
  if (c === 'offline-device-fallback' && e.cloudCalls.length) {
    expect(card.cloudPayload).toBeNull();
    expect(card.ranOffline).toBe(true);
  }
  if (c === 'off' || c === 'unconfigured') expect(e.cloudCalls).toHaveLength(0);
  if (card.blocked) expect(card.choices).toEqual([]); // §2.13: nothing to show
  else {
    expect(answers(card).length).toBeGreaterThanOrEqual(2);
    expect(card.choices.filter((x) => x.role === 'escape')).toHaveLength(1);
    expect(answers(card).length).toBeLessThanOrEqual(2); // support "more"
  }
  for (const ch of card.choices) {
    expect(hasPlaceholder(ch.label)).toBe(false);
    expect(ch.label.toLowerCase()).not.toBe(card.topic.toLowerCase()); // §2.16: the headline is never one of the options
  }
  expect(hasPlaceholder(card.topic)).toBe(false);
  // the spoken line carries every choice in order
  let at = 0;
  for (const ch of card.choices) {
    const i = card.say.toLowerCase().indexOf(ch.spoken.toLowerCase(), at);
    expect(i, `"${ch.spoken}" in "${card.say}"`).toBeGreaterThanOrEqual(0);
    at = i + ch.spoken.length;
  }
}

describe('coffee or tea, every engine state', () => {
  for (const m of MODELS) for (const c of CLOUDS) {
    it(`model ${m} × cloud ${c}`, async () => {
      const e = new MatrixEngine(m, c, { topic: 'coffee', kind: 'yesno', choices: ['yes', 'no'], options: ['coffee', 'tea'] });
      const card = await makeCard('Do you want coffee or tea?', env(e, m, c));
      expect(labels(card)).toEqual(['coffee', 'tea', 'something else']);
      expect(card.topic).toBe('drink'); // §2.5: the shared topic, the same in every state
      expect(card.say).toBe('Do you want coffee or tea? Coffee, tea, or something else?');
      expect(card.blocked ?? null).toBeNull();
      expect(e.cloudCalls).toHaveLength(0);
      expect(card.cloudPayload).toBeNull();
      invariants(card, e, c);
    });
  }
});

describe('matrix invariants on an open question', () => {
  for (const m of MODELS) for (const c of CLOUDS) {
    it(`model ${m} × cloud ${c}`, async () => {
      // a weak device card (two mood words) routes to the stripped leg when cloud help is on
      const e = new MatrixEngine(m, c, { topic: 'weekend', kind: 'choice', choices: ['good', 'bad'] });
      const card = await makeCard('What do you want to do this weekend with Jenny?', env(e, m, c));
      invariants(card, e, c);
    });
  }
});

/** One question of each card shape, with what must hold in every cell and which cells may call the cloud. */
const SHAPES: { q: string; dev: ModelOutput; cloud?: ModelOutput; same: boolean; check: (card: Card, e: MatrixEngine, m: ModelState, c: CloudState) => void }[] = [
  {
    q: 'Shall we keep the old radio, or would you rather give it away?',
    dev: { topic: 'radio', kind: 'choice', choices: ['keep', 'sell'], options: ['keep the old radio', 'give it away'] },
    same: true,
    check: (card, e) => {
      expect(labels(card)).toEqual(['keep the old radio', 'give it away', 'something else']);
      expect(e.cloudCalls).toHaveLength(0); // §2.12: an or-pair that passes the check never routes
      expect(['keep the old radio', 'give it away']).not.toContain(card.topic);
    },
  },
  {
    q: 'Ma, you want coffee?',
    dev: { topic: 'coffee', kind: 'choice', choices: ['coffee with creamer', 'tea'] },
    same: true,
    check: (card, e) => {
      expect(card.kind).toBe('yesno');
      expect(labels(card)).toEqual(['yes', 'no', 'not sure']);
      expect(card.topic).toBe('coffee');
      expect(e.cloudCalls).toHaveLength(0);
    },
  },
  {
    q: 'How was the walk?',
    dev: { topic: 'walk', kind: 'choice', choices: ['lovely', 'windy'] },
    same: true,
    check: (card, e) => {
      expect(card.kind).toBe('feeling');
      expect(labels(card)).toEqual(['good', 'bad', 'something else']);
      expect(e.cloudCalls).toHaveLength(0);
    },
  },
  {
    q: 'Where is the pain?',
    dev: { topic: 'pain', kind: 'choice', choices: ['knee', 'hip'] },
    same: true,
    check: (card, e) => {
      expect(card.kind).toBe('body');
      expect(labels(card)).toEqual(['head', 'chest', 'somewhere else']);
      expect(e.deviceCalls).toHaveLength(0); // §2.11: never a model
      expect(e.cloudCalls).toHaveLength(0);
    },
  },
  {
    q: 'How bad is the pain today?',
    dev: { topic: 'pain', kind: 'choice', choices: ['awful', 'fine'] },
    same: true,
    check: (card, e) => {
      expect(card.kind).toBe('pain');
      expect(labels(card)).toEqual(['a little', 'a lot', 'something else']);
      expect(e.deviceCalls).toHaveLength(0);
      expect(e.cloudCalls).toHaveLength(0);
    },
  },
  {
    q: 'What year did we get married?',
    dev: { topic: 'wedding', kind: 'choice', choices: ['1970', '1975'] },
    same: true,
    check: (card, e) => {
      expect(card.kind).toBe('no-quiz');
      expect(card.choices).toEqual([]);
      expect(card.blocked).not.toMatch(/KB|rule/);
      expect(e.deviceCalls).toHaveLength(0);
      expect(e.cloudCalls).toHaveLength(0);
    },
  },
  {
    q: 'What shall we have for tea tonight?',
    dev: { topic: 'tea tonight', kind: 'choice', choices: ['pot roast', 'chili'] },
    cloud: { topic: 'tea', kind: 'choice', choices: ['soup', 'a sandwich'] },
    same: false,
    check: (card, e, m, c) => {
      const modelRan = !['empty', 'throws', 'absent'].includes(m);
      if (modelRan) {
        // a clean device card stays on the device, whatever the cloud state
        expect(card.source).toBe('on-device');
        expect(labels(card)).toEqual(['pot roast', 'chili', 'something else']);
        expect(e.cloudCalls).toHaveLength(0);
      } else if (c === 'ok') {
        expect(card.source).toBe('in-cloud');
        expect(labels(card)).toEqual(['soup', 'a sandwich', 'something else']);
        expect(card.cloudPayload).toContain('Partner asks: What shall we have for tea tonight?');
      } else if (c === 'offline-device-fallback') {
        expect(card.ranOffline).toBe(true);
        expect(card.cloudPayload).toBeNull();
      } else if (c === 'throws') {
        // the cloud failed: §2.6 completes the card from the About-me foods rather than show nothing
        expect(card.blocked ?? null).toBeNull();
        expect(labels(card)).toEqual(['pot roast', 'chili', 'something else']);
        expect(card.cloudPayload).toBeNull();
      } else {
        // no model and no cloud allowed: never a silent fallback; the payload is shown as "not sent"
        expect(card.blocked).toBeTruthy();
        expect(card.unsentPayload).toContain('Partner asks: What shall we have for tea tonight?');
        expect(e.cloudCalls).toHaveLength(0);
      }
    },
  },
];

describe('every card shape, every engine state', () => {
  for (const shape of SHAPES) {
    describe(shape.q, () => {
      let reference: string | null = null;
      for (const m of MODELS) for (const c of CLOUDS) {
        it(`model ${m} × cloud ${c}`, async () => {
          const e = new MatrixEngine(m, c, shape.dev, shape.cloud);
          const card = await makeCard(shape.q, env(e, m, c));
          invariants(card, e, c);
          shape.check(card, e, m, c);
          if (shape.same) {
            // a code-determined card is identical in every state: same labels, headline and spoken line
            const key = JSON.stringify([labels(card), card.topic, card.say, card.kind]);
            reference ??= key;
            expect(key).toBe(reference);
          }
        });
      }
    });
  }
});
