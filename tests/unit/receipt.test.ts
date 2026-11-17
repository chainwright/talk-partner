// Day 4 (12 Nov 2026): the privacy receipt counts bytes on the payload the card recorded, never on an estimate, and
// says 0 whenever nothing left this computer (cloud off, cloud unreachable, a code card, a blocked card).
import { describe, expect, it } from 'vitest';
import { COPY } from '../../core/copy';
import type { DeviceStatus, Engine, ModelResult } from '../../core/engine';
import { makeCard } from '../../core/pipeline';
import { cardReceipt, countSwaps, questionInPayload, sentLine, sessionReceipt, utf8Bytes } from '../../core/receipt';
import { cloudTextRequest } from '../../core/requests';
import { SAMPLE_PROFILE } from '../../core/sample';
import { stripQuestion } from '../../core/strip';
import type { ModelOutput, Profile } from '../../core/types';

type CloudState = 'off' | 'offline' | 'ok' | 'throws';
class E implements Engine {
  label = 'receipt';
  modes = { device: 'ONLY_ON_DEVICE', cloud: 'PREFER_IN_CLOUD' };
  cloudConfigured = true;
  sent: string[] = [];
  constructor(private c: CloudState, private dev: ModelOutput | null = null) {}
  async deviceStatus(): Promise<DeviceStatus> { return this.dev ? 'available' : 'unavailable'; }
  async prepareDevice() {}
  async runDevice(): Promise<ModelResult> { if (!this.dev) throw new Error('no model'); return { text: JSON.stringify(this.dev), source: 'on-device', ms: 5 }; }
  cloudRequest(q: string) { return cloudTextRequest(q); }
  async runCloud(q: string): Promise<ModelResult> {
    if (this.c === 'throws') throw new Error('cloud failed');
    this.sent.push(q);
    return { text: '{"topic":"weekend","kind":"choice","choices":["the lake","church"]}', source: this.c === 'offline' ? 'on-device' : 'in-cloud', ms: 9 };
  }
}
const env = (e: E, c: CloudState, profile: Profile = SAMPLE_PROFILE, dev = false) => ({ profile, support: 'more' as const, engine: e, allowCloud: c !== 'off', deviceReady: dev });
const Q = 'What should we do at the lake with Jen this weekend?';

describe('privacy receipt: counted on the recorded payload', () => {
  it('cloud answered: bytes are the UTF-8 length of the compact request body, the question inside it is the stripped one', async () => {
    const e = new E('ok');
    const card = await makeCard(Q, env(e, 'ok'));
    expect(card.source).toBe('in-cloud');
    const r = cardReceipt(card, SAMPLE_PROFILE);
    expect(r.left).toBe(true);
    expect(r.sentText).toBe(JSON.stringify(JSON.parse(card.cloudPayload!)));
    expect(r.bodyBytes).toBe(utf8Bytes(r.sentText!));
    expect(r.bodyBytes).toBeGreaterThan(0);
    // the one variable part of the body is exactly what the engine was given
    expect(e.sent).toEqual([questionInPayload(r.sentText!)]);
    const stripped = stripQuestion(Q, SAMPLE_PROFILE);
    expect(questionInPayload(r.sentText!)).toBe(stripped.text);
    expect(r.questionBytes).toBe(utf8Bytes(stripped.text));
    // "Jen" is a person, "the lake" a place
    expect(r.namesWithheld).toBe(1);
    expect(r.otherWithheld).toBe(1);
    expect(Object.keys(stripped.map).sort()).toEqual(['Person A', 'Place A']);
    expect(r.leaksFound).toBe(0);
    expect(r.photoFound).toBe(false);
    expect(r.offline).toBe(false);
    expect(r.sentText).not.toMatch(/Jen|lake|Frank|Carol/);
  });

  it('UTF-8, not string length: a curly apostrophe is 3 bytes', () => {
    expect(utf8Bytes("Jen’s")).toBe(7);
    expect(utf8Bytes('abc')).toBe(3);
  });

  it('cloud unreachable (ran on this computer): nothing left, 0 bytes, marked offline', async () => {
    const card = await makeCard(Q, env(new E('offline'), 'offline'));
    expect(card.ranOffline).toBe(true);
    const r = cardReceipt(card, SAMPLE_PROFILE);
    expect(r).toMatchObject({ left: false, bodyBytes: 0, questionBytes: 0, sentText: null, namesWithheld: 0, otherWithheld: 0, offline: true });
  });

  it('cloud help off, cloud failed, a code card and a blocked card: 0 bytes each', async () => {
    const off = await makeCard(Q, env(new E('off'), 'off'));
    expect(off.blocked).toBeTruthy();
    expect(cardReceipt(off, SAMPLE_PROFILE)).toMatchObject({ left: false, bodyBytes: 0, source: 'blocked' });
    const failed = await makeCard(Q, env(new E('throws'), 'throws'));
    expect(cardReceipt(failed, SAMPLE_PROFILE)).toMatchObject({ left: false, bodyBytes: 0 });
    const code = await makeCard('Do you want coffee or tea?', env(new E('ok'), 'ok'));
    expect(cardReceipt(code, SAMPLE_PROFILE)).toMatchObject({ left: false, bodyBytes: 0, source: 'code' });
    // the device card was good enough: the cloud step was skipped, so nothing left even with cloud help on
    const dev = await makeCard('What do you want for dinner?', env(new E('ok', { topic: 'dinner', kind: 'choice', choices: ['pot roast', 'chili', 'soup'] }), 'ok', SAMPLE_PROFILE, true));
    expect(dev.source).toBe('on-device');
    expect(cardReceipt(dev, SAMPLE_PROFILE)).toMatchObject({ left: false, bodyBytes: 0, source: 'on-device' });
  });

  it('the session receipt sums the cards and counts offline runs', async () => {
    const cards = [
      await makeCard(Q, env(new E('ok'), 'ok')),
      await makeCard('Who should we call tonight?', env(new E('ok'), 'ok')),
      await makeCard(Q, env(new E('offline'), 'offline')),
      await makeCard('Do you need the toilet?', env(new E('ok'), 'ok')),
    ];
    const s = sessionReceipt(cards, SAMPLE_PROFILE);
    expect(s.cards).toBe(4);
    expect(s.cardsLeft).toBe(2);
    expect(s.offlineRuns).toBe(1);
    expect(s.bodyBytes).toBe(s.perCard[0].bodyBytes + s.perCard[1].bodyBytes);
    expect(s.questionBytes).toBe(s.perCard[0].questionBytes + s.perCard[1].questionBytes);
    expect(s.namesWithheld).toBe(s.perCard[0].namesWithheld + s.perCard[1].namesWithheld);
    expect(s.leaksFound).toBe(0);
    expect(s.photosFound).toBe(0);
    expect(sessionReceipt([], SAMPLE_PROFILE)).toMatchObject({ cards: 0, cardsLeft: 0, bodyBytes: 0 });
  });

  it('the after-the-fact check really looks: a photo and an About-me word planted in a payload are found', () => {
    const photo = 'data:image/jpeg;base64,/9j/4AAQ';
    const planted: Parameters<typeof cardReceipt>[0] = {
      asked: Q, pending: null, topic: 'x', kind: 'choice', choices: [], say: '', source: 'in-cloud', route: { to: 'cloud', reasons: [] }, notes: [], ms: 0,
      cloudPayload: JSON.stringify(cloudTextRequest(`What should we do at the lake with Jenny ${photo}?`), null, 2), cloudSwaps: [],
    };
    const r = cardReceipt(planted, SAMPLE_PROFILE);
    expect(r.leaksFound).toBeGreaterThan(0);
    expect(r.photoFound).toBe(true);
  });

  it('countSwaps: people and unknown names are names; foods, places, shows, music and things are the rest', () => {
    expect(countSwaps(['Person A ← Jenny', 'Name A ← Whitby', 'Place A ← the lake', 'Food B ← chili', 'Show A ← Packers games'])).toEqual({ names: 2, other: 3 });
    expect(countSwaps(undefined)).toEqual({ names: 0, other: 0 });
  });
});

describe('"What was sent" in one line', () => {
  it('the line is the user part of the recorded request, and the size is the receipt\'s own count of the whole request', () => {
    const req = cloudTextRequest('What do you want to do this weekend with Person A?');
    const pretty = JSON.stringify(req, null, 2); // as the pipeline records it for the panel
    const s = sentLine(pretty);
    expect(s.text).toBe('Partner asks: What do you want to do this weekend with Person A?');
    expect(s.bytes).toBe(utf8Bytes(JSON.stringify(req)));
    expect(s.text).toBe(`Partner asks: ${questionInPayload(pretty)}`);
  });
  it('the size line says what the rest of the request is', () => {
    expect(COPY.sent.size(4505)).toBe('4,505 bytes with the fixed instructions and the answer format, which are the same for every question');
  });
  it('something that is not a request is still counted, with no line', () => {
    expect(sentLine('not json')).toEqual({ text: '', bytes: 8 });
  });
});
