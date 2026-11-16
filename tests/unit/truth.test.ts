// 16 Nov 2026, judge round 2 truth pass: four lines on screen contradicted the card's own trace. Each is pinned here.
//   1. "Decided by: the model proposed" on a card no model answered.
//   2. "0 failed" in the session line next to a failed cloud step (blocked cards were skipped by the tally).
//   3. "device card kept" when there was no device card.
//   4. "nothing left this computer" after a cloud request that was sent and then failed.
// Plus the welcome line "Everything runs on this computer", which was false with cloud help on.
import { describe, expect, it } from 'vitest';
import { COPY } from '../../core/copy';
import type { CloudError, DeviceStatus, Engine, ModelResult } from '../../core/engine';
import { makeCard } from '../../core/pipeline';
import { cardReceipt, sessionReceipt, sessionTally } from '../../core/receipt';
import { cloudTextRequest, pictureRequestBody } from '../../core/requests';
import { SAMPLE_PROFILE } from '../../core/sample';
import type { ModelOutput } from '../../core/types';

type Cloud = 'ok' | 'error-after-send' | 'offline-not-sent' | 'bad-json' | 'unconfigured';
class E implements Engine {
  label = 'truth';
  modes = { device: 'ONLY_ON_DEVICE', cloud: 'PREFER_IN_CLOUD', pictures: 'ONLY_IN_CLOUD' };
  readonly cloudConfigured: boolean;
  /** What reached the "network" of this stand-in: recorded before any failure, like a real request. */
  wire: string[] = [];
  constructor(private c: Cloud, private dev: ModelOutput | null = null) { this.cloudConfigured = c !== 'unconfigured'; }
  async deviceStatus(): Promise<DeviceStatus> { return this.dev ? 'available' : 'unavailable'; }
  async prepareDevice() {}
  async runDevice(): Promise<ModelResult> { if (!this.dev) throw new Error('no model'); return { text: JSON.stringify(this.dev), source: 'on-device', ms: 4 }; }
  cloudRequest(q: string) { return cloudTextRequest(q); }
  async runCloud(q: string): Promise<ModelResult> {
    if (this.c === 'offline-not-sent') throw Object.assign(new Error('Failed to fetch'), { notSent: true }) as CloudError;
    this.wire.push(q);
    if (this.c === 'error-after-send') throw new Error('429 quota exceeded');
    if (this.c === 'bad-json') return { text: 'sorry, I cannot', source: 'in-cloud', ms: 8 };
    return { text: '{"topic":"weekend","kind":"choice","choices":["a walk","a film"]}', source: 'in-cloud', ms: 8 };
  }
  pictureRequest(w: string) { return pictureRequestBody(w); }
  async picture() { return null; }
}
const env = (e: E, allowCloud = true) => ({ profile: SAMPLE_PROFILE, support: 'more' as const, engine: e, allowCloud, deviceReady: false });
const OPEN = 'What do you want to do this weekend with Jenny?';
const W = COPY.how.why;

describe('1. who decided: never "the model proposed" when no model answered', () => {
  it('no model, cloud off: no card, and the why says no model answered', async () => {
    const c = await makeCard(OPEN, env(new E('ok'), false));
    expect(c.blocked).toBeTruthy();
    expect(c.why!.proposed).toBeNull();
    expect(c.why!.decided).toBe(W.decidedBy.blockedNoModel);
    expect(c.why!.decided).not.toMatch(/model proposed/);
  });
  it('no model, the cloud step failed: the same', async () => {
    const c = await makeCard(OPEN, env(new E('error-after-send')));
    expect(c.blocked).toBeTruthy();
    expect(c.why!.decided).toBe(W.decidedBy.blockedNoModel);
  });
  it('no settings at all on this copy: the same', async () => {
    const c = await makeCard(OPEN, env(new E('unconfigured')));
    expect(c.why!.decided).toBe(W.decidedBy.blockedNoModel);
  });
  it('a model answered and its choices did not survive: "fewer than two choices survived"', async () => {
    const e = new E('unconfigured', { topic: 'shirt', kind: 'choice', choices: ['blue shirt', 'red shirt'] });
    const c = await makeCard('Which shirt for the doctor?', { ...env(e), deviceReady: true });
    expect(c.blocked).toBeTruthy();
    expect(c.why!.proposed).not.toBeNull();
    expect(c.why!.decided).toBe(W.decidedBy.blocked);
  });
});

describe('2. the session line counts a failed step on a card that ended as "no card"', () => {
  it('one code card, one cloud card, one failed cloud card with no card', async () => {
    const cards = [
      await makeCard('Do you want coffee or tea?', env(new E('ok'))),
      await makeCard(OPEN, env(new E('ok'))),
      await makeCard(OPEN, env(new E('error-after-send'))),
      await makeCard(OPEN, env(new E('ok'), false)),
    ];
    expect(cards[2].trace!.find((t) => t.step === 'stripped')!.ran).toBe('failed');
    const n = sessionTally(cards);
    expect(n).toEqual({ code: 1, cloud: 1, device: 0, none: 2, failed: 1 });
    expect(COPY.how.tallyShort(n)).toBe('1 no AI · 0 on this computer · 1 cloud help · 2 no card · 1 failed');
    expect(n.code + n.cloud + n.device + n.none).toBe(cards.length);
  });
});

describe('3. "kept" is said only when a card made on this computer exists', () => {
  it('cloud failed, no device card: the note does not say a card was kept', async () => {
    const c = await makeCard(OPEN, env(new E('error-after-send')));
    expect(c.notes.join(' ')).toMatch(/Cloud step failed \(429 quota exceeded\)\./);
    expect(c.notes.join(' ')).not.toMatch(/kept/);
  });
  it('cloud failed, a weak device card exists: the note says it is kept, and it is on screen', async () => {
    const e = new E('error-after-send', { topic: 'message', kind: 'choice', choices: ['good news', 'bad news'] });
    const c = await makeCard('What should I tell Jenny when she rings?', { ...env(e), deviceReady: true });
    expect(e.wire).toHaveLength(1);
    expect(c.source).toBe('on-device');
    expect(c.blocked).toBeFalsy();
    expect(c.notes.join(' ')).toMatch(/the card made on this computer is kept/);
  });
  it('cloud failed, and the device card had no usable choices: nothing is "kept"', async () => {
    const e = new E('error-after-send', { topic: 'message', kind: 'choice', choices: ['happy', 'fine', 'sad'] });
    const c = await makeCard('What should I tell Jenny when she rings?', { ...env(e), deviceReady: true });
    expect(c.blocked).toBeTruthy();
    expect(c.notes.join(' ')).not.toMatch(/kept/);
  });
  it('cloud help off and the device card did not hold up: no card, and no "kept"', async () => {
    const e = new E('ok', { topic: 'shirt', kind: 'choice', choices: ['blue shirt', 'red shirt'] });
    const c = await makeCard('Which shirt for the doctor?', { ...env(e, false), deviceReady: true });
    expect(c.blocked).toBeTruthy();
    expect(c.notes.join(' ')).toMatch(/Cloud help could try this one, but it is off\./);
    expect(c.notes.join(' ')).not.toMatch(/kept/);
  });
  it('a code card says the cloud step was not needed because the rules made it, not because of a device card', async () => {
    const c = await makeCard('Do you want coffee or tea?', env(new E('ok')));
    expect(c.trace!.find((t) => t.step === 'stripped')!.why).toBe(COPY.notes.trace.notNeeded);
    expect(COPY.notes.trace.notNeeded).not.toMatch(/from this computer|device/);
  });
});

describe('4. a request that was sent and then failed is never "nothing left this computer"', () => {
  it('an error after the request went out: recorded as attempted, with the body; not as "not sent"', async () => {
    const e = new E('error-after-send');
    const c = await makeCard(OPEN, env(e));
    expect(e.wire).toEqual(['What do you want to do this weekend with Person A?']);
    expect(c.cloudPayload).toBeNull();
    expect(c.unsentPayload ?? null).toBeNull();
    expect(c.cloudAttempted).toContain('Person A');
    expect(c.cloudAttempted).not.toContain('Jenny');
    const r = cardReceipt(c, SAMPLE_PROFILE);
    expect(r.left).toBe(false);
    expect(r.attempted).toBe(true);
    expect(r.attemptBytes).toBeGreaterThan(0);
    const s = sessionReceipt([c], SAMPLE_PROFILE);
    expect(s.attempts).toBe(1);
    expect(COPY.judge.receipt.summary(s)).toMatch(/1 cloud request failed after being handed to the SDK: the question may have left/);
  });
  it('the cloud answered with something unusable: the question did leave, and the receipt counts it', async () => {
    const e = new E('bad-json');
    const c = await makeCard(OPEN, env(e));
    expect(e.wire).toHaveLength(1);
    expect(c.cloudPayload).toContain('Person A');
    expect(c.blocked).toBeTruthy();
    const r = cardReceipt(c, SAMPLE_PROFILE);
    expect(r.left).toBe(true);
    expect(r.bodyBytes).toBeGreaterThan(0);
    expect(r.namesWithheld).toBe(1);
  });
  it('the engine knows it was not sent (offline): then, and only then, it is shown as not sent', async () => {
    const e = new E('offline-not-sent');
    const c = await makeCard(OPEN, env(e));
    expect(e.wire).toEqual([]);
    expect(c.cloudAttempted ?? null).toBeNull();
    expect(c.unsentPayload).toContain('Person A');
    expect(cardReceipt(c, SAMPLE_PROFILE).attempted).toBe(false);
  });
  it('the badge tail has a line for it that does not say "nothing left"', () => {
    expect(COPY.badge.tail.attempted).toMatch(/may have left/);
    expect(COPY.badge.tail.attempted).not.toMatch(/nothing left/);
  });
});

describe('the welcome screen', () => {
  it('does not say that everything runs on this computer', () => {
    expect(COPY.welcome.local).not.toMatch(/everything/i);
    expect(COPY.welcome.local).toMatch(/About me/);
  });
});
