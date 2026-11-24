// Phase 16: "Ask in your own words" as the first action on the first screen (design/PHASE16_AI_FIRST_BRIEF.md).
// Written before the code it pins (failing first): the guard (care, warning-sign and crisis words never reach a model,
// whatever this browser could run), the refusal path (the rules' best card, labelled "Made by the app's rules (no AI)",
// never a blank), Back one step at a time (the blocked card that waits is no step of its own), and the first screen's
// order (the own-words field first, the topics after it as "Or pick a topic").
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { COPY } from '../../core/copy';
import { P16 } from '../../core/copy16';
import type { DeviceStatus, Engine, ModelResult } from '../../core/engine';
import { fallbackLine, fallbackWhy, NEAREST, ownCard, ownFallbackCard, ownGuard, ownWaiting } from '../../core/ownwords';
import { makeCard } from '../../core/pipeline';
import { cloudTextRequest } from '../../core/requests';
import { SAMPLE_PROFILE } from '../../core/sample';
import { topics } from '../../core/topics';
import { EMPTY_PROFILE, type Card } from '../../core/types';
import { homeScreen, type HomeModel } from '../../web/src/simple';
import { EVERYDAY_10, OPEN_18 } from '../fixtures/phase16_questions';

/** An engine that records every call. `answer`: what a model call returns; else every call is refused. */
class Spy implements Engine {
  label = 'spy';
  modes = { device: 'ONLY_ON_DEVICE', cloud: 'PREFER_IN_CLOUD' };
  cloudConfigured = true;
  calls: { leg: string; text: string }[] = [];
  constructor(private answer: string | null = null, private refuse = 'Firebase AI Logic: App Check token fetch failed (403)') {}
  /** As the web client does (core/engine.ts, checkedCloud): App Check first; a refused browser sends nothing. */
  async checkCloud() { if (!this.answer && /app check/i.test(this.refuse)) throw new Error(this.refuse); }
  async deviceStatus(): Promise<DeviceStatus> { return 'available'; }
  async prepareDevice() {}
  async runDevice(prompt: string): Promise<ModelResult> { this.calls.push({ leg: 'device', text: prompt }); if (this.answer) return { text: this.answer, source: 'on-device', ms: 5 }; throw new Error('no model here'); }
  cloudRequest(q: string) { return cloudTextRequest(q); }
  async runCloud(q: string): Promise<ModelResult> { this.calls.push({ leg: 'cloud', text: q }); if (this.answer) return { text: this.answer, source: 'in-cloud', ms: 5 }; throw new Error(this.refuse); }
}
const CARD = JSON.stringify({ topic: 'lunch', kind: 'choice', choices: ['soup', 'a sandwich'], options: [] });
const env = (engine: Engine, over: Partial<Parameters<typeof makeCard>[1]> = {}) => ({ profile: SAMPLE_PROFILE, support: 'more' as const, engine, allowCloud: true, deviceReady: true, ...over });
const answers = (c: Card) => c.choices.filter((x) => x.role === 'answer').map((x) => x.label);

// what a carer types about care, a warning sign or a crisis: never to a model
const GUARDED: [string, 'care' | 'red' | 'crisis'][] = [
  ['Where does it hurt the most today?', 'care'],
  ["What's bothering you, love?", 'care'],
  ['Is your tummy sore after lunch?', 'care'],
  ['Do you need the loo before we go?', 'care'],
  ['What did the doctor say about your tablets?', 'care'],
  ['How are you feeling about Beth coming?', 'care'],
  ['Is your chest tight again?', 'red'],
  ['Did you fall in the bathroom?', 'red'],
  ['Are you dizzy when you stand up?', 'red'],
  ['Does your arm feel weak or numb?', 'red'],
  ['Is it hard to breathe right now?', 'red'],
  ["He says he can't go on, what do I ask?", 'crisis'],
  ['Do you want to hurt yourself?', 'crisis'],
  ['Are you thinking about ending your life?', 'crisis'],
];

describe('phase 16: the guard, before any model', () => {
  for (const [q, kind] of GUARDED) {
    it(`"${q}" is ${kind}: the rules make the card, the engine gets no call, on a laptop with Chrome's AI and with online help on`, async () => {
      expect(ownGuard(q)).toBe(kind);
      const spy = new Spy(CARD);
      const c = await ownCard(q, env(spy));
      expect(spy.calls).toEqual([]);
      expect(c.source).toBe('code');
      expect(c.blocked ?? null).toBeNull();
      expect(c.cloudPayload ?? null).toBeNull();
      expect(c.cloudAttempted ?? null).toBeNull();
      expect(c.own?.guard).toBe(kind);
      expect(P16.guard[kind]).toMatch(/did not go to any AI/);
    });
  }
  it('the gap it closes: before phase 16 an open care question went to the on-device model and to the cloud', async () => {
    const spy = new Spy(null, 'Failed to fetch');
    await makeCard("What's bothering you, love?", env(spy, { sleep: async () => {} }));
    expect(spy.calls.map((x) => x.leg)).toEqual(['device', 'cloud', 'cloud']);
  });
  it('a crisis gets the feelings card, pain the body card: never a blank', async () => {
    expect((await ownCard("He says he can't go on, what do I ask?", env(new Spy()))).asked).toBe('How are you feeling today?');
    expect((await ownCard('Where does it hurt the most today?', env(new Spy()))).kind).toBe('body');
  });
  it('a drink that is hot or cold is not a care word; "fall asleep" is not a fall', () => {
    expect(ownGuard('Would you like a hot drink or a cold drink?')).toBeNull();
    expect(ownGuard('Do you want a cold juice?')).toBeNull();
    expect(ownGuard('Did you fall asleep in the chair?')).not.toBe('red');
  });
  it('everyday words go through: the open question reaches the AI path (the model is the mechanic)', async () => {
    const spy = new Spy(CARD);
    const c = await ownCard('What would you like for lunch?', env(spy, { deviceReady: false }));
    expect(ownGuard('What would you like for lunch?')).toBeNull();
    expect(spy.calls.map((x) => x.leg)).toEqual(['cloud']);
    expect(c.source).toBe('in-cloud');
    expect(answers(c)).toEqual(['soup', 'a sandwich']);
  });
  it('the cloud never gets a family name: the same name swap as every typed question', async () => {
    const spy = new Spy(CARD);
    await ownCard('What shall we take to Beth on Sunday?', env(spy, { deviceReady: false }));
    expect(spy.calls).toHaveLength(1);
    expect(spy.calls[0].text).not.toMatch(/Beth/);
  });
});

describe('phase 16: refusal and offline, the rules\' best card', () => {
  it('App Check refuses: the blocked card waits, then the fall-back is a rules card with two choices and the label', async () => {
    const spy = new Spy(null);
    const blocked = await ownCard('What do you fancy doing this afternoon?', env(spy, { deviceReady: false }));
    expect(blocked.blocked).toBeTruthy();
    expect(ownWaiting(blocked)).toBe(true);
    const why = fallbackWhy(blocked, { online: true, cloudConfigured: true });
    expect(why).toBe('check');
    const f = await ownFallbackCard(blocked.own!.asked, blocked, why, { profile: SAMPLE_PROFILE, support: 'more' });
    expect(f.blocked ?? null).toBeNull();
    expect(f.source).toBe('code');
    expect(answers(f).length).toBeGreaterThanOrEqual(2);
    expect(f.own?.fallback?.near).toBe(true);
    expect(fallbackLine(f.own!.fallback!, 'What do you fancy doing this afternoon?')).toMatch(/could not check this browser, so nothing was sent/);
    expect(P16.rulesLabel).toBe("Made by the app's rules (no AI)");
  });
  it('the carer says no on the sheet, or is offline, or the copy has no AI: a card every time, and nothing was sent', async () => {
    for (const o of [{ refused: true, online: true, cloudConfigured: true }, { online: false, cloudConfigured: true }, { online: true, cloudConfigured: false }]) {
      const spy = new Spy(null);
      const blocked = await ownCard('What do you want to watch tonight?', env(spy, { deviceReady: false, allowCloud: false }));
      expect(spy.calls).toEqual([]);
      const why = fallbackWhy(blocked, o);
      const f = await ownFallbackCard('What do you want to watch tonight?', blocked, why, { profile: SAMPLE_PROFILE, support: 'more' });
      expect(answers(f).length).toBeGreaterThanOrEqual(2);
      expect(fallbackLine(f.own!.fallback!, 'x')).toMatch(/nothing was sent/);
    }
  });
  it('a question that may have left is never called "nothing was sent"', async () => {
    const spy = new Spy(null, 'Failed to fetch');
    const blocked = await ownCard('What do you fancy doing this afternoon?', env(spy, { deviceReady: false, sleep: async () => {} }));
    const f = await ownFallbackCard('What do you fancy doing this afternoon?', blocked, fallbackWhy(blocked, { online: true, cloudConfigured: true }), { profile: SAMPLE_PROFILE, support: 'more' });
    expect(f.own?.fallback?.left).toBe('maybe');
    expect(fallbackLine(f.own!.fallback!, 'x')).not.toMatch(/nothing was sent/);
  });
  it('every nearest ready question is made by the rules alone into a card with two or more choices', async () => {
    for (const q of Object.values(NEAREST)) {
      const spy = new Spy(null);
      const c = await makeCard(q, env(spy, { profile: EMPTY_PROFILE }));
      expect(spy.calls, q).toEqual([]);
      expect(c.blocked ?? null, q).toBeNull();
      expect(answers(c).length, q).toBeGreaterThanOrEqual(2);
    }
  });
  it('every question of the labelled set gets a card on the refusal path: no blank, no dead end', async () => {
    for (const q of [...OPEN_18, ...EVERYDAY_10.map((x) => x.q)]) {
      const spy = new Spy(null);
      const first = await ownCard(q, env(spy, { deviceReady: false, allowCloud: false }));
      const c = first.blocked && first.kind !== 'no-quiz' ? await ownFallbackCard(q, first, 'no', { profile: SAMPLE_PROFILE, support: 'more' }) : first;
      expect(c.blocked ?? null, q).toBeNull();
    }
  });
});

describe('phase 16: the first screen and the web client', () => {
  const S = COPY.simple;
  const model: HomeModel = { name: 'Frank', aboutLink: false, busy: false, error: null, question: '', howOpen: false, topics: topics(EMPTY_PROFILE), topicOpen: null, aiTag: S.aiTag.net, ai: [S.ai.line, S.ai.ask], privacy: [S.privacy.none], micHtml: '<button id="mic"></button>', voiceHtml: '', ownWhere: P16.own.where.ask };
  const html = homeScreen(model);
  it('"Ask in your own words" is the first action: before quick needs, before the topics', () => {
    const own = html.indexOf('id="own-h"');
    expect(own).toBeGreaterThan(0);
    expect(own).toBeLessThan(html.indexOf('data-act="needs"'));
    expect(own).toBeLessThan(html.indexOf('id="topics"'));
    expect(html).toContain(P16.own.heading);
    expect(html.replace(/&#39;/g, "'")).toContain(P16.own.never);
    expect(html.replace(/&#39;/g, "'")).toContain(P16.own.where.ask);
  });
  it('the topics are the second path, "Or pick a topic"; there is one question field on the screen', () => {
    expect(html).toContain(`>${P16.own.topicsHeading}<`);
    expect(html).not.toContain(S.ownHeading);
    expect(html.split('id="q"').length - 1).toBe(1);
  });
  it('typed only: the own-words field has no microphone (a recording cannot be screened before it reaches a model)', () => {
    expect(html).not.toContain('id="mic"');
  });
  const main = readFileSync(join(__dirname, '..', '..', 'web/src/main.ts'), 'utf8');
  it('the web client routes the own-words form through ownCard, the fall-back and Back', () => {
    expect(main).toMatch(/\(own \? ownCard : makeCard\)\(q,/);
    expect(main).toMatch(/ownFallbackCard\(/);
    expect(main).toMatch(/ownWaiting\(/);
    // "No, not now" on the sheet of an own-words question brings the rules' best card, never "No card"
    expect(main).toMatch(/case 'sheet-no':[^\n]*ownRefused\(/);
  });
});
