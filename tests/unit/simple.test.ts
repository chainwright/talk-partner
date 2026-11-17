// The simple view (direction A, 17 Nov 2026): its words and its decisions. What is pinned here:
//   - "this phone / this tablet / this computer" is chosen from what the browser reports, for every string in COPY;
//   - the privacy lines never promise more than the app does ("nothing else", "only the question": the request also
//     holds the app's fixed instructions), and they follow what has happened this session;
//   - the line under a card says who made it and what left, from the card itself (the badge's own vocabulary);
//   - the consent sheet comes up only for a question the cloud step could try, with cloud help off;
//   - the three ready questions are what their small lines say: two made by rules alone, one open.
import { afterEach, describe, expect, it } from 'vitest';
import { COPY, copyDevice, deviceKindFrom, deviceWords, setCopyDevice } from '../../core/copy';
import type { DeviceStatus, Engine, ModelResult } from '../../core/engine';
import { makeCard, needsNoModel } from '../../core/pipeline';
import { cloudTextRequest } from '../../core/requests';
import { madeWhere, privacyLines, sheetWanted, tryNote, whereLine } from '../../core/simple';
import { EMPTY_PROFILE, type Card } from '../../core/types';
import { PROFILE } from './fixtures';

function strings(v: unknown, out: string[] = []): string[] {
  if (typeof v === 'string') out.push(v);
  else if (typeof v === 'function') { const r = (v as (...a: unknown[]) => unknown)('About Frank', 2, 3); strings(r, out); }
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out));
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => strings(x, out));
  return out;
}

class Fake implements Engine {
  label = 'fake';
  modes = { device: 'ONLY_ON_DEVICE', cloud: 'PREFER_IN_CLOUD' };
  cloudConfigured = true;
  calls: string[] = [];
  constructor(private o: { device?: string; cloud?: string | Error } = {}) {}
  async deviceStatus(): Promise<DeviceStatus> { return this.o.device ? 'available' : 'unavailable'; }
  async prepareDevice() {}
  async runDevice(): Promise<ModelResult> { this.calls.push('device'); if (!this.o.device) throw new Error('no model'); return { text: this.o.device, source: 'on-device', ms: 3 }; }
  cloudRequest(q: string) { return cloudTextRequest(q); }
  async runCloud(): Promise<ModelResult> { this.calls.push('cloud'); if (this.o.cloud instanceof Error) throw this.o.cloud; if (!this.o.cloud) throw new Error('no cloud'); return { text: this.o.cloud, source: 'in-cloud', ms: 3 }; }
}
const OPEN = COPY.simple.tries[2];
const CLOUD_ANSWER = '{"topic":"weekend","kind":"choice","choices":["a walk","a film","a meal out"]}';
const DEVICE_ANSWER = '{"topic":"weekend","kind":"choice","choices":["allotment","library","pub"]}';
const ABOUT = 'About Alan';
const make = (q: string, e: Engine, allowCloud: boolean, deviceReady: boolean): Promise<Card> => makeCard(q, { profile: PROFILE, support: 'more', engine: e, allowCloud, deviceReady });

afterEach(() => setCopyDevice('computer'));

describe('this phone / this tablet / this computer', () => {
  const UA = {
    pixel: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36',
    iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
    androidTablet: 'Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
    ipad: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
    windows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
  };
  it('names the device from what the browser reports', () => {
    expect(deviceKindFrom({ userAgent: UA.pixel })).toBe('phone');
    expect(deviceKindFrom({ userAgent: UA.iphone })).toBe('phone');
    expect(deviceKindFrom({ userAgent: UA.androidTablet })).toBe('tablet');
    expect(deviceKindFrom({ userAgent: UA.ipad })).toBe('tablet');
    expect(deviceKindFrom({ userAgent: UA.mac, platform: 'MacIntel', maxTouchPoints: 0 })).toBe('computer');
    // iPadOS posing as a Mac: a "Mac" with a touch screen
    expect(deviceKindFrom({ userAgent: UA.mac, platform: 'MacIntel', maxTouchPoints: 5 })).toBe('tablet');
    expect(deviceKindFrom({ userAgent: UA.windows, platform: 'Win32', maxTouchPoints: 10 })).toBe('computer'); // a touch laptop is a computer
    expect(deviceKindFrom({ userAgent: UA.windows, mobile: true })).toBe('phone'); // the browser's own "mobile" hint
    expect(deviceKindFrom({})).toBe('computer');
  });
  it('swaps the word, keeps the capital, and leaves a computer\'s text as written', () => {
    expect(deviceWords('Nothing left this computer. This computer is fine.', 'phone')).toBe('Nothing left this phone. This phone is fine.');
    expect(deviceWords('Saved on this computer.', 'tablet')).toBe('Saved on this tablet.');
    expect(deviceWords('Saved on this computer.', 'computer')).toBe('Saved on this computer.');
    expect(deviceWords('a computer with Chrome', 'phone')).toBe('a computer with Chrome');
  });
  it('the default is "computer": COPY is the text as written', () => {
    expect(copyDevice()).toBe('computer');
    expect(COPY.badge.tail.kept).toBe('nothing left this computer');
  });
  for (const kind of ['phone', 'tablet'] as const) {
    it(`on a ${kind}, no string in COPY says "this computer", and functions follow too`, () => {
      setCopyDevice(kind);
      expect(strings(COPY).filter((s) => /this computer/i.test(s))).toEqual([]);
      expect(COPY.badge.tail.kept).toBe(`nothing left this ${kind}`);
      expect(COPY.ask.againTitle(2)).toContain(`on this ${kind}`);
      expect(COPY.simple.privacy.none).toBe(`Nothing you asked has left this ${kind}.`);
      // a function that returns an object of strings
      const n = COPY.judge.receipt.number({ cards: 1, cardsLeft: 0, bodyBytes: 0, namesWithheld: 0, otherWithheld: 0, attempts: 0, attemptBytes: 0 });
      expect(n.label).toBe(`left this ${kind}`);
      expect(n.state).toBe('none');
      // the sentence about where Gemini Nano can run is not turned into "Gemini Nano on this phone"
      expect(COPY.how.routing).not.toMatch(new RegExp(`Gemini Nano on this ${kind}`));
      expect(COPY.how.routing).toContain('desktop Chrome');
    });
  }
  it('going back to "computer" restores every string and the original functions', () => {
    const before = JSON.stringify(strings(COPY));
    const fn = COPY.card.chose;
    setCopyDevice('phone');
    expect(JSON.stringify(strings(COPY))).not.toBe(before);
    setCopyDevice('computer');
    expect(JSON.stringify(strings(COPY))).toBe(before);
    expect(COPY.card.chose).toBe(fn);
  });
  it('the card pipeline\'s own lines follow the device (a phone with no on-device model)', async () => {
    setCopyDevice('phone');
    const c = await make(OPEN, new Fake(), false, false);
    expect(c.blocked).toBe("The private helper isn't ready on this phone, so there are no choices for this one.");
  });
});

describe('the simple view\'s privacy lines say what is sent, never more', () => {
  const lines = [...strings(COPY.simple), ...strings(COPY.consent.sheet)];
  it('no line says "nothing else", "only the question" or "only your question"', () => {
    expect(lines.filter((s) => /nothing else|only (?:the|your) question|question only|and nothing more/i.test(s))).toEqual([]);
  });
  it('every line that says a question is sent names the fixed instructions, or is a count of questions', () => {
    expect(COPY.simple.left.sent(ABOUT)).toMatch(/fixed instructions/);
    expect(COPY.consent.sheet.sent).toMatch(/fixed instructions/);
    expect(COPY.consent.sheet.sent).toMatch(/can be missed/);
    expect(COPY.consent.sheet.sent).toMatch(/leave out health details/);
  });
  it('the sheet names the receiver, the free tier\'s data use and the settings request', () => {
    const K = COPY.consent.sheet;
    expect(K.bodyNoDevice(ABOUT)).toMatch(/Google's Gemini, through Firebase AI Logic/);
    expect(K.data).toMatch(/free tier.*may use what is sent/);
    expect(K.after).toMatch(/asks Firebase once for its settings/);
    expect(K.no).not.toMatch(/all on this/); // the microphone still sends a recording, so "No" does not promise that
  });
  it('the "never sent" line lists the items the copy-truth tests check, and the answers', () => {
    const never = COPY.consent.sheet.never('About me');
    for (const item of COPY.privacy.neverSentItems) expect(never).toContain(item);
    expect(never).toContain('answers');
  });
  it('the foot line follows the session', () => {
    const P = COPY.simple.privacy;
    expect(privacyLines({ cloudOn: false, settingsAsked: false, sent: 0, maybe: 0, clips: 0 })).toEqual([P.none]);
    expect(privacyLines({ cloudOn: true, settingsAsked: true, sent: 0, maybe: 0, clips: 0 })).toEqual([P.cloudOn, P.settings]);
    const after = privacyLines({ cloudOn: true, settingsAsked: true, sent: 2, maybe: 1, clips: 1 });
    expect(after).toEqual([P.sent(2), P.maybe(1), P.voice(1), P.settings]);
    expect(after.join(' ')).not.toMatch(/Nothing you asked has left|No question has left/);
    // a spoken question with cloud help off: the recording went, so "nothing has left" is gone
    expect(privacyLines({ cloudOn: false, settingsAsked: false, sent: 0, maybe: 0, clips: 1 })).toEqual([P.voice(1)]);
  });
});

describe('the line under a card: made on this device, or with online help', () => {
  it('a card the rules make alone: no AI, nothing sent', async () => {
    const e = new Fake({ device: DEVICE_ANSWER, cloud: CLOUD_ANSWER });
    const w = madeWhere(await make(COPY.simple.tries[0], e, true, true), { about: ABOUT });
    expect(e.calls).toEqual([]);
    expect(w).toMatchObject({ maker: 'code', left: 'nothing', spoken: false });
    expect(w.lines).toEqual([COPY.simple.made.code, COPY.simple.left.nothing]);
  });
  it('a card the on-device model made from About me: says so, nothing sent', async () => {
    const c = await make(OPEN, new Fake({ device: DEVICE_ANSWER }), false, true);
    const w = madeWhere(c, { about: ABOUT });
    expect(c.source).toBe('on-device');
    expect(w).toMatchObject({ maker: 'device', left: 'nothing' });
    expect(w.lines[0]).toBe(c.why?.personal?.length ? COPY.simple.made.devicePersonal(ABOUT) : COPY.simple.made.device);
    expect(w.lines[1]).toBe(COPY.simple.left.nothing);
  });
  it('a card made with online help: says so, and says what was sent', async () => {
    const c = await make(OPEN, new Fake({ cloud: CLOUD_ANSWER }), true, false);
    const w = madeWhere(c, { about: ABOUT });
    expect(c.source).toBe('in-cloud');
    expect(c.cloudPayload).toBeTruthy();
    expect(w).toMatchObject({ maker: 'cloud', left: 'sent' });
    expect(w.lines).toEqual([COPY.simple.made.cloud, COPY.simple.left.sent(ABOUT)]);
    // what the line says was sent is what the recorded request holds: the question and the fixed instructions
    const sent = JSON.parse(c.cloudPayload!) as { contents: { parts: { text: string }[] }[]; systemInstruction: string };
    expect(sent.contents[0].parts[0].text).toMatch(/^Partner asks: /);
    expect(sent.systemInstruction.length).toBeGreaterThan(50);
    // and nothing from About me is in it
    for (const word of ['Alan', 'Maria', 'allotment', 'lamb', 'Biscuit']) expect(c.cloudPayload).not.toContain(word);
  });
  it('online help was asked and failed: no card, and never "nothing was sent"', async () => {
    const c = await makeCard(OPEN, { profile: PROFILE, support: 'more', engine: new Fake({ cloud: new Error('503') }), allowCloud: true, deviceReady: false, sleep: async () => {} });
    const w = madeWhere(c, { about: ABOUT });
    expect(w).toMatchObject({ maker: 'none', left: 'maybe' });
    expect(w.lines).toEqual([COPY.simple.made.none, COPY.simple.left.maybe]);
  });
  it('a spoken question adds that its recording went to Google', async () => {
    const w = madeWhere(await make(COPY.simple.tries[0], new Fake(), false, false), { about: ABOUT, spoken: true });
    expect(w.spoken).toBe(true);
    expect(w.lines[2]).toBe(COPY.simple.left.voice);
  });
});

describe('the consent sheet comes up only when a question needs online help', () => {
  const on = { cloudOn: false, cloudConfigured: true };
  it('an open question, no on-device model, cloud help off: yes, and the card holds the line that would go', async () => {
    const c = await make(OPEN, new Fake(), false, false);
    expect(c.blocked).toBeTruthy();
    expect(c.unsentPayload).toContain('Partner asks: What do you want to do this weekend?');
    expect(sheetWanted(c, on)).toBe(true);
  });
  it('not when cloud help is already on, and not on a copy with no project settings', async () => {
    const c = await make(OPEN, new Fake(), false, false);
    expect(sheetWanted(c, { cloudOn: true, cloudConfigured: true })).toBe(false);
    expect(sheetWanted(c, { cloudOn: false, cloudConfigured: false })).toBe(false);
  });
  it('not for a card the rules made, not for a card the on-device model made, not for a memory question, not with no card at all', async () => {
    expect(sheetWanted(await make(COPY.simple.tries[0], new Fake(), false, false), on)).toBe(false);
    expect(sheetWanted(await make(OPEN, new Fake({ device: DEVICE_ANSWER }), false, true), on)).toBe(false);
    expect(sheetWanted(await make('What year did we get married?', new Fake(), false, false), on)).toBe(false);
    expect(sheetWanted(null, on)).toBe(false);
  });
});

describe('the first screen: the three ready questions and where the AI runs', () => {
  it('the first two are made by rules alone, on any copy; the third is open', () => {
    expect(needsNoModel(COPY.simple.tries[0], EMPTY_PROFILE)).toBe(true);
    expect(needsNoModel(COPY.simple.tries[1], EMPTY_PROFILE)).toBe(true);
    expect(needsNoModel(COPY.simple.tries[2], EMPTY_PROFILE)).toBe(false);
  });
  it('the small line under each says how its card is made here', () => {
    const T = COPY.simple.tryNote;
    const base = { configured: true, device: 'unavailable' as const, cloudOn: false };
    expect(tryNote(false, base)).toBe(T.code);
    expect(tryNote(true, base)).toBe(T.openAsk);
    expect(tryNote(true, { ...base, cloudOn: true })).toBe(T.openCloudOn);
    expect(tryNote(true, { ...base, device: 'available' })).toBe(T.openDevice);
    expect(tryNote(true, { ...base, device: 'checking' })).toBe(T.openChecking);
    expect(tryNote(true, { ...base, configured: false })).toBe(T.openNone);
  });
  it('the routing line names both halves of the hybrid, by what this browser has', () => {
    const W = COPY.simple.where;
    const base = { configured: true, device: 'unavailable' as const, cloudOn: false, about: ABOUT };
    expect(whereLine(base)).toBe(W.cloudOff);
    expect(whereLine({ ...base, cloudOn: true })).toBe(W.cloudOn(ABOUT));
    expect(whereLine({ ...base, device: 'available' })).toBe(W.device(ABOUT));
    expect(whereLine({ ...base, device: 'available', cloudOn: true })).toBe(W.deviceCloudOn(ABOUT));
    expect(whereLine({ ...base, device: 'checking' })).toBe(W.checking);
    expect(whereLine({ ...base, configured: false })).toBe(W.noConfig);
    // with the on-device model and cloud help off, "nothing is sent" is said; with cloud help on, it is not
    expect(W.device(ABOUT)).toMatch(/Nothing is sent/);
    expect(W.deviceCloudOn(ABOUT)).not.toMatch(/Nothing is sent/);
    expect(W.cloudOff).toMatch(/asks you first/);
  });
});
