// Phase 17 (judge round 12): the health guard of "Ask in your own words" and the health lines for others, written
// before the code they pin (failing first on the round's build; the log is in devlog/evidence_phase17/).
// The worst case asked of every line here: no automatic line may lead a carer to dismiss pain, a need or a warning sign.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { DeviceStatus, Engine, ModelResult } from '../../core/engine';
import { ownAfter, ownCard, ownGuard, OWN_END } from '../../core/ownwords';
import { makeCard } from '../../core/pipeline';
import { cloudTextRequest } from '../../core/requests';
import { SAMPLE_PROFILE } from '../../core/sample';
import { healthOf, healthWarning, redPlace, redRank } from '../../core/redflag';
import { answerEntry, guessTopic, tags, urgentDay, type DiaryEntry } from '../../core/diary';
import { handoverText } from '../../core/share';
import { rulesSummary, daySummary } from '../../core/summary';
import { insights, NO_HEALTH } from '../../core/insights';
import { visitAlert } from '../../core/visit';
import { P12 } from '../../core/copy12';
import { COPY } from '../../core/copy';
import { after, WEAK_NUMB } from '../../core/tree';
import { guardExempt } from '../../core/reliability';
import { HOW_BAD, WHERE_HURTS } from '../../core/topics';

const ROOT = join(__dirname, '..', '..');
const NOW = new Date(2026, 10, 24, 18, 0).getTime();

/** An engine that records every call and would answer every one of them. */
class Spy implements Engine {
  label = 'spy';
  modes = { device: 'ONLY_ON_DEVICE', cloud: 'PREFER_IN_CLOUD' };
  cloudConfigured = true;
  calls: string[] = [];
  async checkCloud() {}
  async deviceStatus(): Promise<DeviceStatus> { return 'available'; }
  async prepareDevice() {}
  async runDevice(p: string): Promise<ModelResult> { this.calls.push(p); return { text: JSON.stringify({ topic: 'x', kind: 'choice', choices: ['a', 'b'], options: [] }), source: 'on-device', ms: 1 }; }
  cloudRequest(q: string) { return cloudTextRequest(q); }
  async runCloud(q: string): Promise<ModelResult> { this.calls.push(q); return { text: JSON.stringify({ topic: 'x', kind: 'choice', choices: ['a', 'b'], options: [] }), source: 'in-cloud', ms: 1 }; }
}
const env = (engine: Engine) => ({ profile: SAMPLE_PROFILE, support: 'more' as const, engine, allowCloud: true, deviceReady: true });

// The round's phrasings (seats 13b, 05, 02n, 13) and the worst cases we could think of, misspelt ones included.
const RED: string[] = [
  'Is your chest tight again?', 'Any pressure in your chest?', 'Does your chest feel heavy?', 'Is it hard to get your breath?',
  'Are you short of breath?', 'Is your heart racing?', 'Does your arm feel funny?', 'Is your smile lopsided?',
  'you dont seem yourself, whats up with your face', 'Is your face OK?', 'Is your hand numb?', 'Does your leg feel heavy?',
  'Can you lift your arm?', 'Is your speech slurred?', 'Are you seeing double?', 'Are you confused?', 'Is he more muddled than usual?',
  'Are you OK, you look grey', 'You look pale, are you alright?', 'Are you alright?', 'Are you OK?', 'Do you feel sick?',
  'Are you sweaty?', 'Do you feel dizzy?', 'Did you fall?', 'Have you had a fall?', 'Did you slip in the bathroom?',
  'Is something wrong?', 'You are not yourself today, are you?', 'Did you choke on that?', 'Is it hard to swallow?',
];
const CARE: string[] = [
  'Shall we check your sugar before tea?', 'Is your blood sugar low?', 'Did you take your insulin?', 'Does your arm hurt?',
  'Does your knee ache?', 'Is your back still sore today, love?', 'Have you got a headache?', 'Does your tummy hurt?',
  'Is your blood pressure OK?', 'Are you diabetic?',
];
const EVERYDAY: string[] = [
  'Do you want sugar in your tea?', 'Milk and sugar?', 'Are your shoes too tight?', 'No pressure, but shall we go out?',
  'What do you fancy for lunch today?', 'Do you want to plan a trip to the lake?', 'Would you like a hot drink or a cold drink?',
  'Did you fall asleep in the chair?', 'Who do you want to ring this afternoon?',
];

describe('A. typed-question health guard: these words never reach a model', () => {
  for (const q of RED) {
    it(`"${q}" is a warning sign: the rules make the card, no engine call`, async () => {
      expect(ownGuard(q)).toBe('red');
      const spy = new Spy();
      const c = await ownCard(q, env(spy));
      expect(spy.calls).toEqual([]);
      expect(c.source).toBe('code');
      expect(c.own?.guard).toBe('red');
      expect(c.own?.matter).toBeTruthy();
    });
  }
  for (const q of CARE) {
    it(`"${q}" is a health matter: the rules make the card, no engine call`, async () => {
      expect(ownGuard(q)).not.toBeNull();
      const spy = new Spy();
      const c = await ownCard(q, env(spy));
      expect(spy.calls).toEqual([]);
      expect(c.own?.matter).toBeTruthy();
    });
  }
  it('everyday words are not health words: sugar in a drink, tight shoes, "no pressure", a trip, "fall asleep"', () => {
    for (const q of EVERYDAY) expect(healthOf(q), q).toBeNull();
  });
  it('the chest comes first: any chest, tightness or breathing word is "chest"', () => {
    for (const q of ['Is your chest tight again?', 'Any pressure in your chest?', 'Are you short of breath?', 'Is your heart racing?']) expect(healthOf(q)).toBe('chest');
    expect(healthOf('Does your arm hurt?')).toBe('limb');
    expect(healthOf('Is your smile lopsided?')).toBe('stroke');
    expect(healthOf('Are you OK, you look grey')).toBe('unwell');
    expect(healthOf('Shall we check your sugar before tea?')).toBe('sugar');
  });
});

describe('A. after a health answer: a red box with what to do, then where or how bad; never a green tick', () => {
  it('chest: every answer but "no" says call now, whatever the amount, even if it has happened before', () => {
    for (const l of ['yes', 'not sure', 'tightness', 'pain']) {
      const s = ownAfter('chest', l, '911', 'Frank');
      expect(s.end).toBe('Chest pain or tightness, or trouble breathing: call 911 now, whatever the amount, even if it has happened before. Do not wait to see if it passes. Note the time it started.');
      expect(s.end).not.toMatch(/if (?:this|it) is new or sudden/);
      expect(s.red).toBe('chest');
      expect(s.now).toBe(true);
      expect(s.next).toEqual([HOW_BAD]);
    }
    // the "how bad" after it: every amount calls now
    for (const amount of ['a little', 'quite bad', 'very bad', 'not sure']) expect(after({ asked: HOW_BAD, kind: 'scale' as never }, amount, SAMPLE_PROFILE, ['Is your chest tight again?', HOW_BAD], '911', 'chest').end).toMatch(/call 911 now, whatever the amount/);
  });
  it('chest "no" is not the end: watch the breathing, call now if there is any chest pain', () => {
    const s = ownAfter('chest', 'no', '911');
    expect(s.end).toMatch(/A yes or no can be wrong after a stroke/);
    expect(s.end).toMatch(/call 911 now, whatever the amount/);
    expect(s.next).toEqual([WHERE_HURTS]);
  });
  it('a stroke sign: yes calls now; no and not sure are checked by the carer, never left there', () => {
    expect(ownAfter('stroke', 'yes', '999').end).toMatch(/This can be a stroke: call 999 now, and note the time/);
    for (const l of ['no', 'not sure']) {
      const s = ownAfter('stroke', l, '999');
      expect(s.end).toMatch(/smile and lift both arms/);
      expect(s.end).toMatch(/call 999 now/);
      expect(s.red).toBe('sign-check');
    }
  });
  it('a limb pain: the weakness question first, then how bad', () => {
    const s = ownAfter('limb', 'yes', '911');
    expect(s.next).toEqual([WEAK_NUMB, HOW_BAD]);
    expect(s.red).toBe('limb');
    expect(s.end).toMatch(/suddenly weak or numb/);
  });
  it('every answer of every health kind: an alert line with the number, and a next step or a check', () => {
    for (const h of ['chest', 'stroke', 'fall', 'unwell', 'sugar', 'limb', 'pain'] as const) {
      for (const l of ['yes', 'no', 'not sure']) {
        const s = ownAfter(h, l, '911', 'Frank');
        expect(s.alert, `${h} ${l}`).toBe(true);
        expect(s.end, `${h} ${l}`).toMatch(/911/);
        // worst case: no line that tells a carer to wait or to doubt the answer
        expect(s.end, `${h} ${l}`).not.toMatch(/in an hour|may be tired|try again later|nothing to do|good\b|that is fine/i);
      }
    }
    for (const v of Object.values(OWN_END)) expect(v).not.toMatch(/\{(?!them\}|They\}|they\}|their\}|number\})/);
  });
  it('the screen: a health card keeps the call box, the answer box is neutral, and one call box stands when an alert carries its own', () => {
    const main = readFileSync(join(ROOT, 'web/src/main.ts'), 'utf8');
    expect(main).toContain("if (own && (card.own?.guard === 'red' || card.own?.matter)) p5.urgent = true;");
    expect(main).toContain('const ownStep = ownHealthStep(c, p.label);');
    expect(main).toContain("leadHtml: `${!alertHtml && (p5.urgent || urgentAnswer(c.asked, p.label)) ? urgentBox(");
    const simple = readFileSync(join(ROOT, 'web/src/simple.ts'), 'utf8');
    expect(simple).toContain("m.neutral ? ' neutral'");
    expect(COPY.simple.answeredNeutral).toBe('They answered');
  });
});

describe('A. a limb pain whose weakness question was skipped still ends on the stroke check (core/tree.ts)', () => {
  it('"Where in the arms? your left arm" flags the limb; "a little" then checks the arms and the smile, never "in an hour"', () => {
    expect(redPlace('Where in the arms?', 'your left arm')).toBe('limb');
    for (const amount of ['a little', 'not sure']) {
      const s = after({ asked: HOW_BAD, kind: 'scale' as never }, amount, SAMPLE_PROFILE, ['Where does it hurt?', 'Where in the arms?', HOW_BAD], '911', 'limb');
      expect(s.end).toMatch(/lift both arms and smile/);
      expect(s.end).not.toMatch(/in an hour/);
      expect(s.alert).toBe(true);
    }
    // a weakness answer outranks it
    expect(redRank('sign-check')).toBeGreaterThan(redRank('limb'));
    expect(redRank('chest')).toBeGreaterThan(redRank('sign-check'));
  });
});

const ans = (q: string, label: string, at: number): DiaryEntry => answerEntry({ q, label, at });

describe('A. the notes for others lead with a health answer', () => {
  const chest = ans('Is your chest tight again?', 'yes', NOW - 3600000);
  it('the diary files it as the body, tags it a warning, and the day gets no tip', () => {
    expect(guessTopic('Is your chest tight again?')).toBe('body');
    expect(tags(chest)).toContain('warning');
    expect(urgentDay([chest], NOW)).toBe(true);
    expect(tags(ans('Is your chest tight again?', 'no', NOW))).not.toContain('warning');
    expect(tags(ans('Are you OK, you look grey?', 'yes', NOW))).toContain('warning');
    expect(healthWarning('Do you want sugar in your tea?', 'yes')).toBe(false);
  });
  it('"For the next carer" leads with it: the question, the answer, the time, call now whatever the amount', () => {
    const t = handoverText({ diary: [ans('Would you like tea or coffee?', 'tea', NOW - 7200000), chest], health: null, learned: [], name: 'Frank', now: NOW, number: '911' });
    const lines = t.split('\n');
    expect(lines[1]).toMatch(/^Warning signs asked about: "Is your chest tight again\?" yes \(Tue 17:00\)\./);
    expect(lines[1]).toMatch(/whatever the amount, even if it has happened before/);
  });
  it('"Today in short" files it as health, first, and no model words that day', async () => {
    const day = [{ q: 'Would you like tea or coffee?', label: 'tea', at: NOW - 7200000 }, { q: 'Is your chest tight again?', label: 'yes', at: NOW - 3600000 }];
    const s = rulesSummary(day, 'Frank');
    expect(s[1]).toBe('Health: "Is your chest tight again": yes.');
    const calls: string[] = [];
    const r = await daySummary(day, 'Frank', { summarizeDevice: async (p: string) => { calls.push(p); return { text: '{"sentences":["a.","b."]}', source: 'on-device', ms: 1 }; } }, true);
    expect(r.source).toBe('rules');
    expect(calls).toEqual([]);
  });
  it('"What stands out" names it with the call line', () => {
    const xs = insights([chest], NO_HEALTH, 'week', NOW, '911');
    expect(xs[0]).toMatchObject({ id: 'warning', level: 'call', urgent: true });
    expect(xs[0].act).toMatch(/call now, whatever the amount/);
  });
});

describe('A. the visit page and "I can\'t go on" for others: never softer than the screen', () => {
  it('head or chest pain on the visit page: call now, whatever the amount', () => {
    const A = (id: string, q: string, label: string) => ({ id, q, label, at: NOW }) as never;
    expect(visitAlert([A('pain', 'Are you in pain?', 'yes'), A('where', 'Where in the head?', 'head, top of head')], '911')).toBe('Pain in the head (top of head): call 911 now, whatever the amount. Do not wait to see if it passes.');
  });
  it('"I can\'t go on" lines for others: take it seriously, call first; never "tell the doctor today" first', () => {
    for (const line of [P12.crisis.insightAct('911', '988'), P12.crisis.handover('Tue 05:46', '911', '988'), P12.crisis.since('Tue 05:46', '911', '988')]) {
      expect(line).toMatch(/Take it seriously, every time/);
      expect(line).toMatch(/call 911 now; otherwise call 988, a crisis line, now/);
      expect(line.indexOf('call 911 now')).toBeLessThan(line.indexOf('doctor or nurse'));
    }
    const I = COPY.simple.insights;
    expect(I.level.crisis).toBe('Take it seriously, every time: call now');
    expect(insights([ans('How are you feeling today?', "I can't go on", NOW)], NO_HEALTH, 'week', NOW)[0].level).toBe('crisis');
  });
});

describe('A. the answer check never doubts a request for company, a call or a health answer (seat 13, ADV-13-3)', () => {
  it('"Would you like me to stay with you? Yes" and the like are left alone; the line never says "tired, try again later"', () => {
    for (const q of ['Would you like me to stay with you?', 'Would you like a visitor today?', 'Do you want to call Beth?', 'Do you want a hug?', 'Is your chest tight again?', 'Shall we check your sugar before tea?']) expect(guardExempt(q, 'yes'), q).toBe(true);
    expect(COPY.simple.guard.line('Frank')).not.toMatch(/tired|try again later/i);
    // never on a card before its answer
    const main = readFileSync(join(ROOT, 'web/src/main.ts'), 'utf8');
    expect(main).toContain("      guardHtml: '',");
  });
});

describe('A. worst case over every automatic line of the trees and the guard: nothing tells a carer to wait after a warning', () => {
  it('after a chest, head or sign flag, no "how bad" end says "in an hour"', () => {
    for (const red of ['chest', 'head', 'sign', 'sign-check', 'limb'] as const) for (const a of ['a little', 'quite bad', 'very bad', 'not sure']) {
      expect(after({ asked: HOW_BAD, kind: 'scale' as never }, a, SAMPLE_PROFILE, [HOW_BAD], '911', red).end, `${red} ${a}`).not.toMatch(/in an hour/);
    }
  });
  it('the guard never hands a health question to makeCard (the model path)', async () => {
    for (const q of [...RED, ...CARE]) {
      const spy = new Spy();
      await ownCard(q, env(spy));
      expect(spy.calls, q).toEqual([]);
    }
    // contrast: without the guard the same model path would have been asked
    const spy = new Spy();
    await makeCard('you dont seem yourself, whats up with your face', env(spy));
    expect(spy.calls.length).toBeGreaterThan(0);
  });
});
