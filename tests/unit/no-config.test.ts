// A bare clone has no `.env.local`, so there are no project settings. The app must still make every card that code
// decides alone: "Do you want coffee or tea?" gave no card at all on such a copy (judge round 2, 16 Nov 2026: the
// partner screen's make() returned early when there was no engine). This test walks the app's own path with the
// settings forced empty: webConfig() -> pickEngine() -> makeCard(), for every one-tap question of judge mode.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { COPY } from '../../core/copy';
import { NullEngine, type Engine } from '../../core/engine';
import { makeCard } from '../../core/pipeline';
import { SAMPLE_PROFILE, SAMPLE_QUESTIONS } from '../../core/sample';
import { webConfig } from '../../web/src/ai/config';
import { pickEngine } from '../../web/src/ai/pick';

const labels = (c: { choices: { label: string }[] }) => c.choices.map((x) => x.label);

describe('no project settings (a bare clone): rules-only cards still work', () => {
  let engine: Engine;
  beforeAll(() => {
    // whatever .env.local this machine has, the test runs as a clone without one
    vi.stubEnv('VITE_FIREBASE_API_KEY', '');
    vi.stubEnv('VITE_FIREBASE_APP_ID', '');
    engine = pickEngine(webConfig());
  });
  afterAll(() => vi.unstubAllEnvs());
  const make = (q: string, allowCloud = false) => makeCard(q, { profile: SAMPLE_PROFILE, support: 'more', engine, allowCloud, deviceReady: false });

  it('with no settings the app picks the rules-only engine, which reports no device model and no cloud', async () => {
    expect(webConfig()).toBeNull();
    expect(engine).toBeInstanceOf(NullEngine);
    expect(engine.cloudConfigured).toBe(false);
    expect(await engine.deviceStatus()).toBe('unavailable');
    await expect(engine.runDevice('x')).rejects.toThrow(NullEngine.WHY);
    await expect(engine.runCloud('x')).rejects.toThrow(NullEngine.WHY);
  });

  it('"Do you want coffee or tea?" gives coffee / tea / something else, badge source "code"', async () => {
    const c = await make('Do you want coffee or tea?');
    expect(c.blocked).toBeFalsy();
    expect(labels(c)).toEqual(['coffee', 'tea', 'something else']);
    expect(c.source).toBe('code');
    expect(c.say).toBeTruthy();
    expect(c.cloudPayload).toBeNull();
  });

  for (const s of SAMPLE_QUESTIONS.filter((x) => x.group === 'code' || x.q.startsWith('How was therapy'))) {
    it(`judge chip "${s.short}" makes a card the person can answer`, async () => {
      const c = await make(s.q);
      expect(c.blocked).toBeFalsy();
      expect(c.source).toBe('code');
      expect(c.choices.filter((x) => x.role === 'answer').length).toBeGreaterThanOrEqual(2);
      expect(c.choices.filter((x) => x.role === 'escape').length).toBe(1);
    });
  }

  it('the memory chip still coaches ("tell, don\'t test") with no settings', async () => {
    const c = await make('What year did we get married?');
    expect(c.kind).toBe('no-quiz');
    expect(c.coach).toBe(COPY.coach.test);
  });

  for (const s of SAMPLE_QUESTIONS.filter((x) => x.group === 'model')) {
    for (const allowCloud of [false, true]) {
      it(`open question "${s.short}" (cloud help ${allowCloud ? 'on' : 'off'}): an honest "no card", no model call, nothing sent`, async () => {
        const c = await make(s.q, allowCloud);
        expect(c.blocked).toBe(COPY.notes.notReadyNoCloud);
        expect(c.choices).toEqual([]);
        expect(c.cloudPayload).toBeNull();
        expect(c.trace?.filter((t) => t.step !== 'code').every((t) => t.ran === 'skipped')).toBe(true);
      });
    }
  }

  it('the partner screen no longer refuses to make a card when there are no settings', () => {
    const main = readFileSync(join(__dirname, '..', '..', 'web/src/main.ts'), 'utf8');
    const make = main.slice(main.indexOf('async function make('), main.indexOf('function onPersonTap('));
    expect(make).toContain('makeCard(');
    expect(make).not.toMatch(/!state\.engine|!cfg/);
    expect(main).toContain('engine: pickEngine(cfg)');
  });
});
