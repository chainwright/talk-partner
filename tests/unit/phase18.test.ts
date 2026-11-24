// Phase 18 (judge round 13, nine seats on the live build 0852ce8), written before the code and seen failing
// (devlog/evidence_phase18/failing_first.txt). The worst case of every rule here is a line that leads a carer to
// dismiss pain, a need, a crisis or a warning sign; each test reads the screen's own function, not a copy of it.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { P4 } from '../../core/copy4';
import { P5 } from '../../core/copy5';
import type { DeviceStatus, Engine, ModelResult } from '../../core/engine';
import { checkedCloud, NullEngine } from '../../core/engine';
import { answerStep } from '../../core/endstep';
import { insights } from '../../core/insights';
import { letterCard } from '../../core/letter';
import { letterWays } from '../../core/letterways';
import { laterCard } from '../../core/laterask';
import { addLater, cleanLater, laterNode } from '../../core/later';
import { narrowChoices, FIND_TASK } from '../../core/narrow';
import { ownAfter, ownCard, ownCrisisAfter, ownGuard } from '../../core/ownwords';
import { bodyDetailCard, makeCard } from '../../core/pipeline';
import { crisisWords, healthOf, redPlace, urgentAnswer } from '../../core/redflag';
import { cloudTextRequest } from '../../core/requests';
import { SAMPLE_PROFILE } from '../../core/sample';
import { speakable } from '../../core/speak';
import { HOW_BAD, WHERE_HURTS } from '../../core/topics';
import { after } from '../../core/tree';
import { EMPTY_PROFILE, type Card, type Profile } from '../../core/types';
import { answerEntry, type DiaryEntry } from '../../core/diary';
import { svgPicto } from '../../web/src/pictos';

const ROOT = join(__dirname, '..', '..');
const read = (f: string) => readFileSync(join(ROOT, f), 'utf8');

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
const env = (engine: Engine, profile: Profile = SAMPLE_PROFILE) => ({ profile, support: 'more' as const, engine, allowCloud: true, deviceReady: true });
const rules = (profile: Profile = SAMPLE_PROFILE) => ({ profile, support: 'more' as const, engine: new NullEngine(), allowCloud: false, deviceReady: false });
const pages = (c: Card) => { const out: Card[] = []; for (let p: Card | null | undefined = c; p; p = p.nextPage) out.push(p); return out; };
const choicesOf = (c: Card) => pages(c).flatMap((p) => p.choices).filter((x, i, all) => all.findIndex((y) => y.label === x.label) === i);
const ctx = (chain: string[], o: { out?: boolean; red?: never } = {}) => ({ profile: SAMPLE_PROFILE, chain, number: '911', red: null, out: !!o.out, crisisLine: '988' });

// ---------------------------------------------------------------------------------------------------------------- 1
// The typed crisis wordings of the round (seats 13b, 01 rev a) and the worst cases we could think of.
const CRISIS = [
  "I can't go on", 'I cant go on', 'Do you want to die?', 'do u want to end it all', 'Do you wish you were dead?',
  'Do you want to kill yourself?', 'Are you thinking of hurting yourself?', 'Do you feel like ending your life?',
  'Is life not worth living?', "Don't you want to live any more?", 'Do you feel you would be better off dead?',
  'Are you thinking about suicide?', 'Have you thought of taking your own life?', 'Do you want to give up on life?',
  'Do you feel there is no point in living?', 'Would they be better off without you?', 'Have you taken too many tablets on purpose?',
];

describe('1. a crisis: any answer, typed or on a card of the tree, keeps the crisis box and the call line', () => {
  for (const q of CRISIS) {
    it(`"${q}" is a crisis; every answer on every page of its card keeps the crisis line, never "A good day"`, async () => {
      expect(ownGuard(q)).toBe('crisis');
      expect(crisisWords(q)).toBe(true);
      const spy = new Spy();
      const c = await ownCard(q, env(spy));
      expect(spy.calls).toEqual([]);
      expect(c.own?.guard).toBe('crisis');
      // (each answer on the page the person sees it on: every page of the card carries the guard)
      for (const page of pages(c)) for (const p of page.choices.filter((x) => !(x.role === 'escape' && page.nextPage))) {
        expect(page.own?.guard, `${q}: page "${page.choices.map((x) => x.label).join(', ')}"`).toBe('crisis');
        const s = answerStep(page, p, ctx([q], { out: p.role === 'escape' }));
        expect(s.crisis, `${q} [${p.label}]`).toBe(true);
        expect(s.alert).toBe(true);
        expect(s.follow).toEqual([]);
        expect(s.open).toBeUndefined();
        expect(s.end).toMatch(/call 911 now/);
        expect(s.end).toMatch(/988/);
        expect(s.end).not.toMatch(/good day|Nothing to fix|Nothing is bothering|That is fine|Good\./i);
      }
    });
  }
  it('"no", "good" and "not sure" each have their own line, and none of them ends it', () => {
    expect(ownCrisisAfter('no', '911', '988', 'Frank').end).toMatch(/^Frank pointed to no\. A "no" does not end it/);
    expect(ownCrisisAfter('not sure', '911', '988', 'Frank').end).toMatch(/^Not sure is not a no\./);
    expect(ownCrisisAfter('good', '911', '988', 'Frank').end).toMatch(/^Frank pointed to "good"\. After words like these an answer does not end it/);
    expect(ownCrisisAfter('yes', '999', '116 123', '').end).toMatch(/call 999 now; otherwise call 116 123/);
    // no crisis line known: the doctor or nurse, never a made-up number
    expect(ownCrisisAfter('no', '112', '112', '').end).toMatch(/otherwise call their doctor or nurse now/);
  });
  it('everyday words are not a crisis: "go on a trip", "dying for a cup of tea", "end of the film"', () => {
    for (const q of ['Shall we go on a trip?', "I'm dying for a cup of tea", 'Do you want to see the end of the film?', 'Shall we give the soup a go?', 'Would you like to go on the porch?']) expect(crisisWords(q), q).toBe(false);
  });
  it('the screen draws the crisis box over the answer, and the phone given back opens the safety screen', () => {
    const main = read('web/src/main.ts');
    expect(main).toContain("step0.crisis ? ownCrisisBox({ line: P16.crisisBox, number: callNumber(), crisisLine: crisisLineNow(), guess: numberGuess() }) : ''");
    // (phase 19: and the safety screen is told what was asked and pointed to, crisisAsked)
    expect(main).toContain("else if (state.confirmed && (crisisAnswer(state.picked?.label ?? '') || state.card?.own?.guard === 'crisis')) { crisisFrom = crisisAsked(); toCrisis(); }");
    // the person's own "Not now" on a crisis card: the safety screen, never Home alone
    expect(main).toContain("if (c.own?.guard === 'crisis') { makeSeq++; state.busy = false; resetCard(); crisisFrom = { q: c.own.asked, label: C.simple.person.notNow }; toCrisis(); return; }");
  });
  it('the diary keeps a typed crisis: its answer is tagged "crisis", so the week and the next carer read it first', async () => {
    const e = answerEntry({ q: 'Do you want to die?', label: 'no', at: 1 }, 'feelings' as never) as DiaryEntry;
    const now = 2 * 86_400_000;
    const lines = insights([{ ...e, at: now - 1000 }], { emergency: '', helpline: '', text: '', toggles: {} } as never, 'week', now, '911');
    expect(lines[0].id).toBe('crisis');
    expect(lines[0].level).toBe('crisis');
  });
});

// ---------------------------------------------------------------------------------------------------------------- 2
describe('2. the chest and the trunk: no answer of the chest leaves the call line, and no amount waits an hour', () => {
  it('"Where in the chest?" with "somewhere else" (or "something else") still puts the call box and the chest line up', () => {
    for (const l of ['somewhere else', 'something else', 'middle', 'your left side']) {
      expect(urgentAnswer('Where in the chest?', l), l).toBe(true);
      expect(redPlace('Where in the chest?', l), l).toBe('chest');
    }
    const chest = bodyDetailCard('chest', SAMPLE_PROFILE);
    const s = after(chest, 'somewhere else', SAMPLE_PROFILE, [WHERE_HURTS, chest.asked], '911');
    expect(s.alert).toBe(true);
    expect(s.end).toMatch(/call 911 now, whatever the amount/);
  });
  it('the upper stomach, the upper back (between the shoulders), the jaw and a shoulder: every amount says call now, never "Ask again in an hour"', () => {
    const cases: [string, string][] = [['Where in the stomach?', 'upper stomach'], ['Where in the back?', 'upper back'], [WHERE_HURTS, 'jaw'], [WHERE_HURTS, 'shoulder'], ['Does it hurt between the shoulders?', 'yes']];
    for (const [q, l] of cases) {
      const red = redPlace(q, l);
      expect(red, `${q} ${l}`).toBe('heart');
      for (const amount of ['a little', 'quite bad', 'very bad', 'not sure']) {
        const end = after({ asked: HOW_BAD, kind: 'scale' as never }, amount, SAMPLE_PROFILE, [q, HOW_BAD], '911', red).end;
        expect(end, `${l} ${amount}`).toMatch(/call 911 now, whatever the amount/);
        expect(end).not.toMatch(/in an hour/);
      }
    }
    // and on the body card itself, the line comes at once, as a red box
    for (const [region, l] of [['stomach', 'upper stomach'], ['back', 'upper back']] as const) {
      const c = bodyDetailCard(region, SAMPLE_PROFILE);
      const s = after(c, l, SAMPLE_PROFILE, [WHERE_HURTS, c.asked], '911');
      expect(s.alert, l).toBe(true);
      expect(s.end).toMatch(/call 911 now, whatever the amount/);
      expect(s.next).toContain(HOW_BAD);
    }
    // the lower stomach and the lower back keep the ordinary step
    expect(redPlace('Where in the stomach?', 'lower stomach')).toBeNull();
  });
  it('typed: "Does your jaw hurt?", "Pain between your shoulders?", "Is your upper tummy sore?" are guarded and end on the chest-type call line', () => {
    for (const q of ['Does your jaw hurt?', 'Any pain between your shoulders?', 'Is your upper tummy sore?', 'Does your shoulder ache?', 'Is your upper back hurting?']) {
      expect(healthOf(q), q).toBe('heart');
      expect(ownGuard(q), q).toBe('red');
      const s = ownAfter('heart', 'yes', '911', 'Frank');
      expect(s.end).toMatch(/call 911 now, whatever the amount/);
      expect(s.red).toBe('heart');
      expect(s.next).toEqual([HOW_BAD]);
    }
    expect(ownAfter('heart', 'no', '911').end).toMatch(/whatever the amount/);
  });
  it('the red page never puts chest pain behind "if it is new or sudden"; it has its own line', () => {
    expect(P5.sudden.also.join(' ')).not.toMatch(/chest/i);
    expect(P5.sudden.chest('911')).toBe('Chest pain, tightness or trouble breathing: call 911 now, even if it has happened before. Do not wait to see if it passes.');
    expect(P5.sudden.notSudden).toMatch(/not chest pain or trouble breathing/);
    expect(P5.sudden.boxChest('911')).toBe('Chest pain, tightness or trouble breathing: call 911 now, even if it has happened before.');
    const p5 = read('web/src/phase5.ts');
    expect(p5).toContain('<div class="urgent" id="sudden-chest">${ALERT}<div><b>${esc(S.chest(m.number))}</b></div></div>');
    // the box over a chest question or answer uses the chest line, never "if this is new or sudden"
    const main = read('web/src/main.ts');
    expect(main).toContain("const boxMode = (c?: Card | null): BoxMode => (chestLike(p5.red) || chestLike(c?.own?.matter as RedPlace | undefined) ? 'chest' : p5.signNow ? 'now' : 'new');");
    expect(main).toContain("urgentBox(callNumber(), 'urgent', numberGuess(), boxMode(c))");
  });
  it('the diary heads a chest or head line with "Call now, whatever the amount", never "if it is new or sudden"', async () => {
    const { COPY } = await import('../../core/copy');
    expect(COPY.simple.insights.level.now).toBe('Call now, whatever the amount, and tell the doctor or nurse');
    const at = 2 * 86_400_000 - 5000;
    const d: DiaryEntry[] = [answerEntry({ q: 'Where in the chest?', label: 'middle', at }, 'body' as never)];
    const lines = insights(d, { emergency: '', helpline: '', text: '', toggles: {} } as never, 'week', at + 1000, '911');
    const chest = lines.find((x) => /chest/i.test(`${x.text} ${x.act ?? ''}`));
    expect(chest?.level).toBe('now');
  });
});

// The speech, face and arm wordings of a stroke a carer might type (seat 13b: "Are your words worse?" got a green tick).
const STROKE = [
  'Are your words worse?', 'Are your words worse than yesterday?', 'Is your speech worse today?', 'Is talking harder today?',
  'Is your voice different?', 'Have your words gone?', 'Has his speech changed?', 'Is she talking nonsense?', 'Is he talking gibberish?',
  'Are you struggling to speak more than usual?', 'Is your face lower on one side?', 'Is your mouth crooked?', 'Does your face look uneven?',
  'Is one side of your face sagging?', 'Is your arm weaker?', 'Can you raise both arms?', 'Is your grip weaker today?', 'Is your leg dragging?',
  'Are you suddenly unable to speak?', 'Do your words come out wrong today?', 'Are you losing your balance?', 'Do you feel woozy?', 'Are you unsteady on your feet?',
];
describe('2. speech, face and arm: every stroke wording is guarded and gets the stroke check', () => {
  for (const q of STROKE) {
    it(`"${q}": guarded "red", and its answers end on the stroke check, never a green tick`, () => {
      expect(ownGuard(q), q).toBe('red');
      const h = healthOf(q);
      expect(['stroke', 'unwell'], `${q}: ${h}`).toContain(h);
      if (h === 'stroke') for (const l of ['yes', 'no', 'not sure']) expect(ownAfter('stroke', l, '911').end).toMatch(/call 911 now/);
    });
  }
  it('everyday talk is not a stroke sign: "Shall we talk about the news?", "a funny film", "the words of the song"', () => {
    for (const q of ['Shall we talk about the news?', 'Would you like a funny film?', 'Do you know the words of the song?', 'Do you want to speak to Beth?', 'Shall we lift the blinds?']) expect(healthOf(q), q).toBeNull();
  });
});

// ---------------------------------------------------------------------------------------------------------------- 3
describe('3. "Ask it again" brings back the stored question and its node exactly', () => {
  it('a body card left for later keeps its region: "Where in the arms?" comes back as the body card, never as a typed question', async () => {
    const arms = bodyDetailCard('arms', SAMPLE_PROFILE);
    const node = laterNode(arms);
    expect(node).toEqual({ kind: 'body', region: 'arms' });
    const xs = addLater([], arms.asked, 10, 'body', null, node);
    // stored and read back (IndexedDB): the node stays
    const back = cleanLater(JSON.parse(JSON.stringify(xs)));
    expect(back[0].node).toEqual({ kind: 'body', region: 'arms' });
    const c = await laterCard(back[0], rules());
    expect(c?.kind).toBe('body');
    expect(c?.bodyStep).toBe(2);
    expect(c?.asked).toBe('Where in the arms?');
    expect(c?.blocked).toBeFalsy();
    expect(choicesOf(c!).map((x) => x.label)).toEqual(choicesOf(arms).map((x) => x.label));
  });
  it('the first step of the body card and a guarded own-words card come back as they were; a health question never waits for the consent sheet', async () => {
    const where = await makeCard(WHERE_HURTS, rules());
    expect(laterNode(where)).toEqual({ kind: 'body' });
    expect((await laterCard({ q: WHERE_HURTS, at: 1, node: { kind: 'body' } }, rules()))?.bodyStep).toBe(1);
    const own = await ownCard('Is your chest tight again?', env(new Spy()));
    const node = laterNode(own);
    expect(node).toEqual({ kind: 'guard', guard: 'red', asked: 'Is your chest tight again?' });
    const spy = new Spy();
    const c = await laterCard({ q: own.asked, at: 1, node: node! }, { ...env(spy) });
    expect(spy.calls).toEqual([]);
    expect(c?.own?.matter).toBe('chest');
    expect(c?.blocked).toBeFalsy();
    // a health question stored by an older build (no node): rebuilt by the guard, never sent to the sheet
    const old = await laterCard({ q: 'Where in the chest?', at: 1 }, env(spy));
    expect(old?.kind).toBe('body');
    expect(old?.asked).toBe('Where in the chest?');
    const old2 = await laterCard({ q: 'Does your arm hurt?', at: 1 }, env(spy));
    expect(spy.calls).toEqual([]);
    expect(old2?.own?.guard).toBeTruthy();
    // an everyday question has no node: the screen asks it as before
    expect(await laterCard({ q: 'Would you like tea or coffee?', at: 1 }, env(spy))).toBeNull();
  });
  it('the screen rebuilds the card from the node (web/src/main.ts), never make(x.q) for a stored node', () => {
    const main = read('web/src/main.ts');
    expect(main).toContain('if (a === \'later-ask\') { void askLaterAgain(x); } else render();');
    expect(main).toContain('const card = await laterCard(x, { profile: state.profile, support: state.settings.support, engine: state.engine, allowCloud: false, deviceReady: false });');
    expect(main).toContain('leaveForLater(q, careTopic(c), laterNode(c.kind === \'repair\' ? state.before : c));');
  });
});

// ---------------------------------------------------------------------------------------------------------------- 4
describe('4. letters with no word: the sponsor\'s AI for the topic and the letters, then "Write it", then "Show me"', () => {
  const noWord = async (letter: string, topic: string | null, engine: Engine = new NullEngine(), o: { allowCloud?: boolean; asked?: string; rejected?: string[] } = {}) =>
    letterCard({ asked: o.asked ?? '', letter, rejected: o.rejected ?? [], topic }, { profile: SAMPLE_PROFILE, support: 'more', engine, allowCloud: !!o.allowCloud, deviceReady: false });
  it('never "Online help did not answer. Nothing else was tried."; the line says what happened', () => {
    expect(JSON.stringify(P4)).not.toMatch(/Nothing else was tried/);
    expect(P4.letter.kept('GA')).toBe('You kept it on this phone. No word that starts with GA is in About them yet.');
    expect(P4.letter.refused('GA')).toBe('Google could not check this browser, so nothing was sent. No word that starts with GA is in About them yet.');
  });
  it('the ways, in this order: the AI (phone: online after the yes; laptop: Chrome\'s own model), "Write it", "Show me", another letter', async () => {
    const c = await noWord('XQ', 'food');
    expect(c.blocked).toBeTruthy();
    expect(letterWays(c, { online: true, cloudConfigured: true, deviceReady: false, topic: 'food', asked: '' }).ways).toEqual(['ai', 'write', 'show', 'another']);
    expect(letterWays(c, { online: true, cloudConfigured: false, deviceReady: true, topic: 'food', asked: '' }).ways).toEqual(['ai', 'write', 'show', 'another']);
    expect(letterWays(c, { online: true, cloudConfigured: false, deviceReady: true, topic: 'food', asked: '' }).ai).toBe('device');
    // offline, or no AI on this copy: still never a stop
    expect(letterWays(c, { online: false, cloudConfigured: true, deviceReady: false, topic: 'food', asked: '' }).ways).toEqual(['write', 'show', 'another']);
  });
  it('never the AI on the body, feelings or a health question: write it and show me only', async () => {
    for (const topic of ['body', 'feel']) {
      const c = await noWord('XQ', topic);
      expect(letterWays(c, { online: true, cloudConfigured: true, deviceReady: true, topic, asked: '' }).ways, topic).toEqual(['write', 'show', 'another']);
    }
    const c = await noWord('XQ', null, new NullEngine(), { asked: 'Where does it hurt?' });
    expect(letterWays(c, { online: true, cloudConfigured: true, deviceReady: true, topic: null, asked: 'Where does it hurt?' }).ways).toEqual(['write', 'show', 'another']);
  });
  it('after App Check refused this browser: the line says so, "Try Google\'s AI again" comes first, and the sheet does not come back by itself', async () => {
    const refusing: Engine = Object.assign(new Spy(), { checkCloud: async () => { throw new Error('appCheck/fetch-status-error 403'); } });
    // (phase 18b: GA now has the garden centre in the places list; YO has no place word)
    const c = await noWord('YO', 'plans', refusing, { allowCloud: true, asked: 'Would you like to go out this morning or this afternoon?', rejected: ['garden'] });
    expect(c.blocked).toBe(P4.letter.refused('YO'));
    const w = letterWays(c, { online: true, cloudConfigured: true, deviceReady: false, topic: 'plans', asked: c.asked });
    expect(w.ways).toEqual(['again', 'write', 'show', 'another']);
    const main = read('web/src/main.ts');
    // after "Just this once" the sheet is never shown again by itself for the same letters
    expect(main).toContain('state.sheet = !once && simpleView() && isOnline()');
  });
  it('after "No, keep it here": "You kept it on this phone", then the ways; the AI stays one tap away', async () => {
    const c = await noWord('YO', 'plans', new Spy(), { asked: 'Would you like to go out this morning or this afternoon?', rejected: ['garden'] });
    expect(c.unsentPayload).toBeTruthy();
    const kept = { ...c, blocked: P4.letter.kept('YO') };
    expect(letterWays(kept, { online: true, cloudConfigured: true, deviceReady: false, topic: 'plans', asked: c.asked }).ways).toEqual(['ai', 'write', 'show', 'another']);
  });
  it('the letters of "I want to say something > Today & plans" stay in places: C is church, not coffee', async () => {
    const main = read('web/src/main.ts');
    expect(main).toContain(': chainTopic(asked) ?? turnTopic();');
    const c = await letterCard({ asked: '', letter: 'CH', rejected: [], topic: 'plans' }, rules());
    expect(c.choices.filter((x) => x.role === 'answer').map((x) => x.label)).toContain('church');
  });
});

describe('4. after a card of the AI, a kind of thing ("meat") asks "Which one?" with more choices', () => {
  it('"What would you like for dinner tonight?" > meat: "Which meat would you like?", more choices, the first letter, show or write', async () => {
    const base = await makeCard('Would you like meat or fish?', rules());
    const cloud: Card = { ...base, asked: 'What would you like for dinner tonight?', source: 'in-cloud', own: { asked: 'What would you like for dinner tonight?' } };
    const s = answerStep(cloud, { label: 'meat', role: 'answer' }, ctx(['What would you like for dinner tonight?']));
    expect(s.follow).toEqual([]);
    expect(s.open?.ways[0]).toBe('which');
    expect(s.open?.which).toBe('Which meat would you like?');
    expect(s.open?.ways).toEqual(['which', 'more', 'letter', 'show']);
    expect(s.open?.topic).toBe('food');
    // a yes, a no or the way out are not kinds of things
    expect(answerStep(cloud, { label: 'yes', role: 'answer' }, ctx([cloud.asked])).open?.ways[0]).not.toBe('which');
  });
  it('never on the body, a feeling or a health card of the AI path', async () => {
    const own = await ownCard('Does your arm hurt?', env(new Spy()));
    const s = answerStep(own, { label: 'yes', role: 'answer' }, ctx([own.asked]));
    expect(s.open?.which).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------------------------------------------- 5
describe('5. App Check at the app\'s start, on phones only; the wait line matches the real limit', () => {
  it('the start warms App Check on a phone (never on a laptop, never offline: warmCloud\'s own rules)', () => {
    const main = read('web/src/main.ts');
    expect(main).toContain('  render(); void refreshDevice().then(() => { if (handheld()) warmCloud(); judgeStep(); });');
  });
  it('measured: a first try that fails late and its retry stay inside the 20 s the screen promises (scaled to 400 ms)', async () => {
    const { makeCard: mk } = await import('../../core/pipeline');
    const WAIT = 400;
    let n = 0;
    const slow: Engine = Object.assign(new Spy(), {
      checkCloud: () => new Promise<void>((res) => setTimeout(res, 150)),
      runCloud: () => { n++; return n === 1 ? new Promise<ModelResult>((_, rej) => setTimeout(() => rej(Object.assign(new Error('429 Too Many Requests, retry in 1s'), { status: 429 })), 150)) : new Promise<ModelResult>(() => { /* never answers */ }); },
    });
    const t0 = Date.now();
    await mk('What would you like to do this weekend?', { ...env(slow, EMPTY_PROFILE), deviceReady: false, cloudWaitMs: WAIT, sleep: async () => {} });
    expect(Date.now() - t0).toBeLessThan(WAIT + 120);
  });
  it('the line says the real limit', async () => {
    const { P9 } = await import('../../core/copy9');
    expect(P9.wait.slow(12)).toBe('Online help is still working (12 s). It stops by itself at 20 s.');
    // and the one wait of checkedCloud never passes it either
    const t0 = Date.now();
    await checkedCloud({ checkCloud: () => new Promise<void>((res) => setTimeout(res, 50)) }, () => new Promise(() => { /* never */ }), 200).catch(() => null);
    expect(Date.now() - t0).toBeLessThan(260);
  });
});

// ---------------------------------------------------------------------------------------------------------------- 6
describe('6. arm, hand, leg and foot pictures are drawn from behind: the person\'s left is on the viewer\'s left', () => {
  it('the left arm and the left leg are highlighted on the left (x < 48), on the figure seen from behind', () => {
    const left = svgPicto('body:left arm');
    const right = svgPicto('body:right arm');
    expect(left).toContain('M48 31v31'); // the spine: the figure from behind
    expect(left).toMatch(/M34 30l-12 28" stroke="#d9453c"/);
    expect(right).toMatch(/M62 30l12 28" stroke="#d9453c"/);
    expect(svgPicto('body:left leg')).toMatch(/M38 64l-4 26" stroke="#d9453c"/);
    for (const p of ['arms', 'hands', 'legs', 'feet', 'left leg', 'right leg']) expect(svgPicto(`body:${p}`), p).toContain('M48 31v31');
    // the head, the face and the chest stay seen from the front
    for (const p of ['face', 'chest', 'middle']) expect(svgPicto(`body:${p}`), p).not.toContain('M48 31v31');
  });
  it('the three pain faces stay three different pictures', async () => {
    const { builtinPicto } = await import('../../web/src/pictos');
    const xs = ['pain mild', 'pain medium', 'pain strong'].map((x) => builtinPicto(x));
    expect(new Set(xs).size).toBe(3);
    expect(new Set(['pain mild', 'pain medium', 'pain strong'].map((x) => svgPicto(x))).size).toBe(3);
  });
});

// ---------------------------------------------------------------------------------------------------------------- 7
describe('7. "Find more" never returns its own prompt\'s examples; Read aloud never speaks a pain or health card', () => {
  it('the two kinds named in the task are dropped from a Find more answer', () => {
    expect(FIND_TASK).toMatch(/"something cold" or "something to eat"/);
    const { kept, dropped } = narrowChoices(['something cold', 'something to eat', 'a walk'], { asked: 'Would you like tea or coffee?', rejected: ['tea', 'coffee'], offered: true }, { profile: SAMPLE_PROFILE });
    expect(kept).toEqual(['a walk']);
    expect(dropped.map((d) => d.label)).toEqual(['something cold', 'something to eat']);
  });
  it('Read aloud: never on the body card, the pain scale, a health question or a card with "in pain" or "I can\'t go on" on it', async () => {
    const where = await makeCard(WHERE_HURTS, rules());
    const how = await makeCard(HOW_BAD, rules());
    const inPain = await makeCard('Are you in pain?', rules());
    const feel = await makeCard('How are you feeling today?', rules());
    const tea = await makeCard('Would you like tea or coffee?', rules());
    expect(speakable(where)).toBe(false);
    expect(speakable(how)).toBe(false);
    expect(speakable(inPain)).toBe(false);
    expect(speakable(feel)).toBe(false);
    expect(speakable(bodyDetailCard('chest', SAMPLE_PROFILE))).toBe(false);
    expect(speakable(tea)).toBe(true);
  });
});
