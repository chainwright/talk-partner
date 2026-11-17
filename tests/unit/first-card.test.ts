// Judge mode opens with one card already made (web/src/main.ts, `firstCard`). That is only honest if the card needs
// no model and sends nothing on any copy: with or without project settings, with or without the on-device model,
// with cloud help on or off. Pinned here. Written 16 Nov 2026.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { DeviceStatus, Engine, ModelResult } from '../../core/engine';
import { makeCard, needsNoModel } from '../../core/pipeline';
import { cardReceipt } from '../../core/receipt';
import { cloudTextRequest, pictureRequestBody } from '../../core/requests';
import { SAMPLE_FIRST, SAMPLE_PROFILE, SAMPLE_QUESTIONS } from '../../core/sample';

/** An engine that records every call and fails it: the first card must never reach one. */
class Tripwire implements Engine {
  label = 'tripwire';
  modes = { device: 'ONLY_ON_DEVICE', cloud: 'PREFER_IN_CLOUD', pictures: 'ONLY_IN_CLOUD' };
  cloudConfigured = true;
  calls: string[] = [];
  async deviceStatus(): Promise<DeviceStatus> { return 'available'; }
  async prepareDevice() {}
  async runDevice(): Promise<ModelResult> { this.calls.push('device'); throw new Error('must not run'); }
  cloudRequest(q: string) { return cloudTextRequest(q); }
  async runCloud(): Promise<ModelResult> { this.calls.push('cloud'); throw new Error('must not run'); }
  pictureRequest(w: string) { return pictureRequestBody(w); }
  async picture() { this.calls.push('picture'); return null; }
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
