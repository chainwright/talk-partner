// Phase 17 G (the owner's own test on his phone, live 21bb1e0, 24 Nov 2026), written before the code (failing first:
// devlog/evidence_phase17/): (1) a yes to a typed "want something?" never ends; (2) the first letter stays inside the
// topic; (3) letter by letter: P, then I, then Z narrows the guess, the AI asked for it with the topic and the letters.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { DeviceStatus, Engine, ModelResult } from '../../core/engine';
import { letterCard, letterCloudText, letterDeviceAsk, letterWords } from '../../core/letter';
import { cloudTextRequest } from '../../core/requests';
import { SAMPLE_PROFILE } from '../../core/sample';
import { EMPTY_PROFILE, type Card, type Profile } from '../../core/types';

const ROOT = join(__dirname, '..', '..');
const labels = (c: Card) => c.choices.filter((x) => x.role === 'answer').map((x) => x.spoken.toLowerCase());

class Fake implements Engine {
  label = 'fake'; modes = { device: 'ONLY_ON_DEVICE', cloud: 'PREFER_IN_CLOUD' }; cloudConfigured = true;
  device: string[] = []; cloud: string[] = [];
  constructor(private words: string[]) {}
  async deviceStatus(): Promise<DeviceStatus> { return 'available'; }
  async prepareDevice() {}
  async runDevice(p: string): Promise<ModelResult> { this.device.push(p); return { text: JSON.stringify({ topic: '', kind: 'choice', choices: this.words }), source: 'on-device', ms: 3 }; }
  cloudRequest(q: string) { return cloudTextRequest(q); }
  async runCloud(q: string): Promise<ModelResult> { this.cloud.push(q); return { text: JSON.stringify({ words: this.words }), source: 'in-cloud', ms: 3 }; }
}
const env = (e: Engine, o: { device?: boolean; cloud?: boolean } = {}, profile: Profile = EMPTY_PROFILE) => ({ profile, support: 'more' as const, engine: e, allowCloud: !!o.cloud, deviceReady: !!o.device });

describe('G1. a yes to a typed "want something?" goes on to what it is', () => {
  it('"I would like to something?" yes, and "Do you want anything?" not sure: next "Is it about food or drink, people, or plans?"', async () => {
    const { typedStep, WHAT_TOPIC } = await import('../../core/tree');
    for (const [q, l] of [['I would like to something?', 'yes'], ['Do you want anything?', 'not sure'], ['Do you need something?', 'yes']]) {
      const s = typedStep!(q, l, { ...EMPTY_PROFILE, personName: 'Frank' });
      expect(s?.next, q).toEqual([WHAT_TOPIC]);
      expect(s?.end, q).toMatch(/find out what it is/);
    }
    expect(typedStep!('I would like to something?', 'no')).toBeNull();
    const main = readFileSync(join(ROOT, 'web/src/main.ts'), 'utf8');
    expect(main).toContain("const typed = !out && !fu.length && c.kind === 'yesno' ? typedStep(c.asked, p.label, state.profile) : null;");
  });
});

describe('G2. the first letter stays inside the topic', () => {
  it('Food & drink, P: pizza, pasta, potatoes, pie; never pain, priest or photos', () => {
    const ws = letterWords({ asked: 'Would you like a snack or a meal?', letter: 'P', rejected: ['snack', 'meal'], topic: 'food' }, EMPTY_PROFILE);
    expect(ws.slice(0, 4)).toEqual(expect.arrayContaining(['pasta', 'potatoes']));
    expect(ws).toEqual(expect.arrayContaining(['pizza', 'pie']));
    expect(ws).not.toEqual(expect.arrayContaining(['pain']));
    for (const w of ['pain', 'priest', 'photos']) expect(ws).not.toContain(w);
  });
  it('the topic also comes from the question when the caller has none ("tea or coffee?" then P: no pain)', () => {
    const ws = letterWords({ asked: 'Would you like tea or coffee?', letter: 'P', rejected: ['tea', 'coffee'] }, EMPTY_PROFILE);
    expect(ws).not.toContain('pain');
    expect(ws.length).toBeGreaterThanOrEqual(2);
  });
  it('the same flow with I keeps the topic as well: ice cream, iced tea', () => {
    expect(letterWords({ asked: 'Would you like a snack or a meal?', letter: 'I', rejected: [], topic: 'food' }, EMPTY_PROFILE)).toEqual(expect.arrayContaining(['ice cream', 'iced tea']));
  });
});

describe('G3. letter by letter: the guess narrows', () => {
  it('the rules filter the topic\'s words by the letters so far: P, PI, PIZ', () => {
    const at = (letter: string) => letterWords({ asked: 'Would you like a snack or a meal?', letter, rejected: [], topic: 'food' }, EMPTY_PROFILE);
    expect([...at('PI')].sort()).toEqual(['pie', 'pizza']);
    expect(at('PIZ')).toEqual(['pizza']);
  });
  it('two letters or more: the AI is asked with the topic and the letters (on this device), its words first, every word starts with the letters', async () => {
    const e = new Fake(['pizza', 'pickles', 'pie', 'pain']);
    const c = await letterCard({ asked: 'Would you like a snack or a meal?', letter: 'PI', rejected: [], topic: 'food' }, env(e, { device: true }, SAMPLE_PROFILE));
    expect(e.device).toHaveLength(1);
    expect(e.device[0]).toMatch(/It starts with the letters "PI", in this order\./);
    expect(c.letter?.by).toBe('device');
    for (const w of labels(c)) expect(w.startsWith('pi'), w).toBe(true);
    expect(labels(c)).toContain('pickles');
  });
  it('online after the yes: the cloud text holds the question with names swapped, the letters and the topic, nothing else', async () => {
    const t = letterCloudText('What would you like for lunch?', 'PI', SAMPLE_PROFILE, 'food');
    expect(t.text).toMatch(/It starts with the letters "PI"/);
    expect(t.text).toMatch(/start with those letters/);
    expect(letterDeviceAsk({ asked: '', letter: 'PI', rejected: [], topic: 'people' })).toMatch(/The topic is people\./);
    const e = new Fake(['pizza', 'pie']);
    const c = await letterCard({ asked: 'Would you like a snack or a meal?', letter: 'PI', rejected: [], topic: 'food' }, env(e, { cloud: true }));
    expect(e.cloud).toHaveLength(1);
    expect(c.letter?.by).toBe('cloud');
  });
  it('without an AI the rules alone give the card; on the body or a health question no model is ever asked', async () => {
    const e = new Fake(['pain', 'paracetamol']);
    const off = await letterCard({ asked: 'Would you like a snack or a meal?', letter: 'PI', rejected: [], topic: 'food' }, env(e));
    expect(labels(off)).toEqual(expect.arrayContaining(['pizza', 'pie']));
    expect(off.letter?.by).toBe('rules');
    for (const i of [{ asked: 'Where does it hurt?', letter: 'PA', rejected: [], topic: 'body' }, { asked: 'Is your chest tight again?', letter: 'TI', rejected: [], topic: null, rulesOnly: true }]) {
      const s = new Fake(['pain', 'tight']);
      await letterCard(i, env(s, { device: true, cloud: true }));
      expect(s.device).toEqual([]);
      expect(s.cloud).toEqual([]);
    }
  });
  it('the screens: "Add the next letter" on the letter card\'s way out; the alphabet shows the letters so far', async () => {
    const { letterGrid, letterAddButton } = await import('../../web/src/phase4');
    expect(letterAddButton!('P')).toContain('data-act="letter-add"');
    expect(letterAddButton!('P')).toContain('Add the next letter (P…)');
    expect(letterGrid({ holdHtml: '', prefix: 'PI' } as never)).toContain('It starts with PI. Do you know the next letter?');
    const main = readFileSync(join(ROOT, 'web/src/main.ts'), 'utf8');
    expect(main).toContain("case 'letter-add': {");
    expect(main).toContain('letter: `${l.prefix ?? \'\'}${t.dataset.letter!}`');
  });
});
