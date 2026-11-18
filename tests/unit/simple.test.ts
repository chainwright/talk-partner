// The simple view (direction A, 17 Nov 2026): its words and its decisions. What is pinned here:
//   - "this phone / this tablet / this computer" is chosen from what the browser reports, for every string in COPY;
//   - the privacy lines never promise more than the app does ("nothing else", "only the question": the request also
//     holds the app's fixed instructions), and they follow what has happened this session;
//   - the line under a card says who made it and what left, from the card itself (the badge's own vocabulary);
//   - the consent sheet comes up only for a question the cloud step could try, with cloud help off;
//   - the plain AI line and the tag on the one open topic question say where the AI runs here: on a phone, online.
import { afterEach, describe, expect, it } from 'vitest';
import { COPY, copyDevice, deviceKindFrom, deviceWords, setCopyDevice } from '../../core/copy';
import type { DeviceStatus, Engine, ModelResult } from '../../core/engine';
import { makeCard, needsNoModel } from '../../core/pipeline';
import { cloudTextRequest } from '../../core/requests';
import { aiLines, aiPlace, aiTag, madeWhere, needsInternet, privacyLines, sheetWanted } from '../../core/simple';
import { AI_QUESTION } from '../../core/topics';
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
const OPEN = AI_QUESTION;
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
    const w = madeWhere(await make('Do you want coffee or tea?', e, true, true), { about: ABOUT });
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
    const w = madeWhere(await make('Do you want coffee or tea?', new Fake(), false, false), { about: ABOUT, spoken: true });
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
    expect(sheetWanted(await make('Do you want coffee or tea?', new Fake(), false, false), on)).toBe(false);
    expect(sheetWanted(await make(OPEN, new Fake({ device: DEVICE_ANSWER }), false, true), on)).toBe(false);
    expect(sheetWanted(await make('What year did we get married?', new Fake(), false, false), on)).toBe(false);
    expect(sheetWanted(null, on)).toBe(false);
  });
});

describe('the first screen: the plain AI line and where the AI runs here', () => {
  const base = { configured: true, device: 'unavailable' as const, cloudOn: false, online: true };
  it('the open topic question is open, and a plain topic question is not', () => {
    expect(needsNoModel(AI_QUESTION, EMPTY_PROFILE)).toBe(false);
    expect(needsNoModel('Would you like tea or coffee?', EMPTY_PROFILE)).toBe(true);
  });
  it('where a typed open question would get its choices, by what this browser has', () => {
    expect(aiPlace(base)).toBe('ask');
    expect(aiPlace({ ...base, cloudOn: true })).toBe('cloudOn');
    expect(aiPlace({ ...base, device: 'available' })).toBe('device');
    expect(aiPlace({ ...base, device: 'available', online: false })).toBe('device'); // the model in the browser needs no connection
    expect(aiPlace({ ...base, online: false })).toBe('offline');
    expect(aiPlace({ ...base, cloudOn: true, online: false })).toBe('offline');
    expect(aiPlace({ ...base, device: 'checking' })).toBe('checking');
    expect(aiPlace({ ...base, configured: false })).toBe('none');
  });
  it('one plain sentence of what the AI is for, then where it runs on this device', () => {
    const A = COPY.simple.ai;
    expect(aiLines(base)).toEqual([A.line, A.ask]);
    expect(aiLines({ ...base, cloudOn: true })).toEqual([A.line, A.cloudOn]);
    expect(aiLines({ ...base, device: 'available' })).toEqual([A.line, A.device]);
    expect(aiLines({ ...base, online: false })).toEqual([A.line, A.offline]);
    // nothing is said about this device before its check has answered
    expect(aiLines({ ...base, device: 'checking' })).toEqual([A.line]);
    expect(aiLines({ ...base, configured: false })).toEqual([A.none]);
    expect(A.line).toMatch(/AI suggests the answers/);
    expect(A.line).toMatch(/topic questions above do not need it/);
    expect(A.device).toMatch(/nothing is sent/);
    expect(A.ask).toMatch(/asks you first/);
    expect(A.cloudOn).not.toMatch(/nothing is sent/i);
  });
  it('on a phone the line says the AI is online: a phone has no AI in the browser', () => {
    setCopyDevice('phone');
    expect(aiLines(base)[1]).toBe("On this phone that AI is online (Google's): the app asks you first, and shows the line that would go.");
    expect(aiLines({ ...base, online: false })[1]).toMatch(/^You are offline, and that AI needs the internet/);
  });
  it('the tag on the open topic question', () => {
    const T = COPY.simple.aiTag;
    expect(aiTag(base)).toBe(T.net);
    expect(aiTag({ ...base, cloudOn: true })).toBe(T.net);
    expect(aiTag({ ...base, device: 'available' })).toBe(T.device);
    expect(aiTag({ ...base, online: false })).toBe(T.offline);
    expect(aiTag({ ...base, configured: false })).toBe(T.none);
  });
  it('a question that needs online help, asked offline, is said to need the internet; a rules card never is', async () => {
    const blocked = await make(OPEN, new Fake(), false, false);
    const i = { online: false, cloudConfigured: true };
    expect(needsInternet(blocked, i)).toBe(true);
    expect(needsInternet(blocked, { ...i, online: true })).toBe(false);
    expect(needsInternet(blocked, { ...i, cloudConfigured: false })).toBe(false);
    expect(needsInternet(await make('Do you want coffee or tea?', new Fake(), false, false), i)).toBe(false);
    expect(needsInternet(await make('What year did we get married?', new Fake(), false, false), i)).toBe(false);
    expect(needsInternet(null, i)).toBe(false);
  });
});

describe('the words of the new first screen and the person\'s screens', () => {
  const S = COPY.simple;
  it('no default "him" or "her": the name from About them, else "them"', () => {
    expect(S.hope('')).toBe("When the words won't come, let them point.");
    expect(S.hope('Frank')).toBe("When the words won't come, let Frank point.");
    expect(S.wait('')).toBe("Wait. Count to ten. Don't answer for them.");
    expect(S.wait('Rosa')).toBe("Wait. Count to ten. Don't answer for Rosa.");
    const all = strings(S).join(' \n ');
    expect(all).not.toMatch(/\b(?:him|his|he|she|her|hers)\b/i);
  });
  it('four steps, and the title says so', () => {
    expect(S.how.title).toBe('How it works: 4 steps');
    expect(S.how.steps('')).toHaveLength(4);
    expect(S.how.steps('Frank')[2]).toBe('Frank points at the answer. No words needed');
    expect(S.how.steps('')[2]).toBe('They point at the answer. No words needed');
  });
  it('the person\'s screens: the instruction, the check and the finish', () => {
    const P = S.person;
    expect(P.point).toBe('Point to your answer');
    expect(P.so('tea')).toBe('So: tea. Right?');
    expect([P.yes, P.no]).toEqual(['Yes', 'No, something else']);
    expect(P.thanks).toBe('Thank you.');
    expect(P.done('tea')).toBe('Tea.');
    expect(P.hold).toMatch(/^Carer:/);
  });
  it('"the computer" is the device in hand too: on a phone the finish button says "Give the phone back"', () => {
    expect(S.person.give).toBe('Give the computer back');
    setCopyDevice('phone');
    expect(COPY.simple.person.give).toBe('Give the phone back');
    expect(COPY.simple.how.steps('')[1]).toBe('Turn the phone to them and say it out loud');
    expect(COPY.simple.step2('Frank')).toBe('Turn the phone to Frank');
    setCopyDevice('tablet');
    expect(COPY.simple.person.give).toBe('Give the tablet back');
    expect(deviceWords('On a computer with Chrome', 'phone')).toBe('On a computer with Chrome');
  });
});
