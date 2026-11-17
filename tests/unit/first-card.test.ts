// Judge mode opens with one card already made (web/src/main.ts, `firstCard`). That is only honest if the card needs
// no model and sends nothing on any copy: with or without project settings, with or without the on-device model,
// with cloud help on or off. Pinned here. Written 16 Nov 2026.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { DeviceStatus, Engine, ModelResult } from '../../core/engine';
import { makeCard, needsNoModel } from '../../core/pipeline';
import { cardReceipt } from '../../core/receipt';
import { cloudTextRequest } from '../../core/requests';
import { COPY } from '../../core/copy';
import { SAMPLE_FIRST, SAMPLE_PROFILE, SAMPLE_QUESTIONS, SAMPLE_STEP } from '../../core/sample';

/** An engine that records every call and fails it: the first card must never reach one. */
class Tripwire implements Engine {
  label = 'tripwire';
  modes = { device: 'ONLY_ON_DEVICE', cloud: 'PREFER_IN_CLOUD' };
  cloudConfigured = true;
  calls: string[] = [];
  async deviceStatus(): Promise<DeviceStatus> { return 'available'; }
  async prepareDevice() {}
  async runDevice(): Promise<ModelResult> { this.calls.push('device'); throw new Error('must not run'); }
  cloudRequest(q: string) { return cloudTextRequest(q); }
  async runCloud(): Promise<ModelResult> { this.calls.push('cloud'); throw new Error('must not run'); }
}

describe('the card judge mode opens with', () => {
  it('is one of the one-tap questions, from the group that code reads alone', () => {
    expect(SAMPLE_QUESTIONS.find((s) => s.q === SAMPLE_FIRST)?.group).toBe('code');
    expect(needsNoModel(SAMPLE_FIRST, SAMPLE_PROFILE)).toBe(true);
  });
  for (const allowCloud of [false, true]) for (const deviceReady of [false, true]) for (const support of ['mild', 'more', 'most'] as const) {
    it(`cloud help ${allowCloud ? 'on' : 'off'}, on-device model ${deviceReady ? 'ready' : 'missing'}, support "${support}": no model call, nothing sent, a full card`, async () => {
      const e = new Tripwire();
      const c = await makeCard(SAMPLE_FIRST, { profile: SAMPLE_PROFILE, support, engine: e, allowCloud, deviceReady });
      expect(e.calls).toEqual([]);
      expect(c.blocked).toBeFalsy();
      expect(c.source).toBe('code');
      expect(c.choices.filter((x) => x.role === 'answer').map((x) => x.label)).toEqual(['coffee', 'tea']);
      expect(c.choices.filter((x) => x.role === 'escape')).toHaveLength(1);
      expect(c.cloudPayload ?? null).toBeNull();
      expect(c.cloudAttempted ?? null).toBeNull();
      const r = cardReceipt(c, SAMPLE_PROFILE);
      expect(r.left).toBe(false);
      expect(r.bodyBytes).toBe(0);
      expect((c.trace ?? []).filter((t) => t.ran === 'on-device' || t.ran === 'in-cloud' || t.ran === 'failed').filter((t) => t.step !== 'code')).toEqual([]);
    });
  }
  it('the web client makes it before the first draw and draws it without an entrance', () => {
    const main = readFileSync(join(__dirname, '..', '..', 'web/src/main.ts'), 'utf8');
    expect(main).toMatch(/=== 'demo'\) await enterDemo\(\);\s*\n\s*render\(\);/);
    expect(main).toContain("if (!lifted && !(r === 'partner' && state.first)) app.classList.add('enter');");
  });
});

// 16 Nov 2026, later: the first card is made in code, so by itself it shows no model. What follows it, with no click,
// is judge mode's first step (web/src/main.ts, `judgeStep`): when the on-device model is ready the app asks one open,
// personal question and the model on this computer makes the card from About me. Pinned here: which question, that
// the step can send nothing, and what the client does when there is no model or the judge acts first. The real model
// is exercised in scripts/e2e-ondevice.mjs (section 1b).
describe('the first step judge mode runs by itself after that card', () => {
  /** The on-device step answers; any cloud call is recorded and fails. */
  class DeviceOnly extends Tripwire {
    constructor(private answer: string) { super(); }
    async runDevice(): Promise<ModelResult> { this.calls.push('device'); return { text: this.answer, source: 'on-device', ms: 3 }; }
  }
  const main = readFileSync(join(__dirname, '..', '..', 'web/src/main.ts'), 'utf8');
  const step = main.slice(main.indexOf('function judgeStep()'), main.indexOf('async function make('));

  it('is the first one-tap question: open and personal, so code cannot decide it and a model has to', () => {
    expect(SAMPLE_STEP).toBe(SAMPLE_QUESTIONS[0].q);
    expect(SAMPLE_QUESTIONS[0].group).toBe('model');
    expect(needsNoModel(SAMPLE_STEP, SAMPLE_PROFILE)).toBe(false);
  });
  it('made as the client makes it (cloud help left out): the on-device step answers with About-me places, the badge source is on-device, nothing is sent', async () => {
    const e = new DeviceOnly('{"topic":"weekend","kind":"choice","choices":["the lake","church","hardware store"]}');
    const c = await makeCard(SAMPLE_STEP, { profile: SAMPLE_PROFILE, support: 'more', engine: e, allowCloud: false, deviceReady: true });
    expect(e.calls).toEqual(['device']);
    expect(c.source).toBe('on-device');
    expect(c.blocked).toBeFalsy();
    // (since 17 Nov the three places the model named share the card; before, the third stood on the next page)
    expect(c.why?.personal).toEqual(['the lake', 'church', 'hardware store']);
    expect(c.nextPage ?? null).toBeNull();
    expect(c.trace?.find((t) => t.step === 'private')).toMatchObject({ ran: 'on-device', used: true });
    expect(cardReceipt(c, SAMPLE_PROFILE).left).toBe(false);
  });
  it('a weak on-device answer still sends nothing in this step, even where cloud help is set up and was on', async () => {
    // two mood words would send a card for a cloud second opinion; the step is made with cloud help left out
    const e = new DeviceOnly('{"topic":"weekend","kind":"choice","choices":["good","fine"]}');
    const c = await makeCard(SAMPLE_STEP, { profile: SAMPLE_PROFILE, support: 'more', engine: e, allowCloud: false, deviceReady: true });
    expect(e.calls).toEqual(['device']);
    expect(c.cloudPayload ?? null).toBeNull();
    expect(c.cloudAttempted ?? null).toBeNull();
  });
  it('the client leaves cloud help out of it, runs it only on an untouched first card with a loaded model, and shows only a card the device made', () => {
    expect(step).toContain('allowCloud: false');
    expect(step).toContain("if (step !== 'waiting' || !state.demo || !state.first || state.busy) return;");
    expect(step).toContain("state.device !== 'available' || state.warming || !warmOk");
    expect(step).toContain("if (card.blocked || card.source !== 'on-device') { step = 'failed'; patchDevice(); return; }");
    // a question the judge asks or types first cancels it
    expect(main).toContain("if (step === 'waiting') step = 'cancelled'; // the judge asked something first");
    expect(main).toMatch(/t\.id === 'q'\) \{ state\.lastQuestion = t\.value; if \(step === 'waiting'\) step = 'cancelled'; return; \}/);
  });
  it('the status line has a plain sentence for each case: no model in this browser, not downloaded, running, done, no card this time', () => {
    const J = COPY.judge.step;
    expect(J.none).toBe("No Gemini Nano in this browser, so the on-device step can't run here. The card shown is made in code.");
    expect(J.notDownloaded).toMatch(/not downloaded in this browser, so the on-device step can't run yet/);
    expect(J.running(SAMPLE_STEP)).toContain(SAMPLE_STEP);
    expect(J.waiting(SAMPLE_STEP)).toMatch(/Nothing is sent/);
    expect(J.done).toMatch(/made by Gemini Nano on this computer/);
    expect(J.failed).toMatch(/the card made in code stays/);
    // "no Gemini Nano here" is said only once the check stands
    expect(main).toContain('if (stepPending && !deviceFinal) return');
  });
});
