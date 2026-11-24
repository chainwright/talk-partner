// Phase 19 (judge round 14, ten seats on the live build cb54ec0), written before the code and seen failing
// (devlog/evidence_phase19/failing_first.txt). The worst case of each rule: a false record of what the person said in a
// crisis; a note for the next carer that is softer than the screen for a pain that can be the heart; a misspelt
// health question that reaches the AI or ends on a green tick; a doctor page that casts doubt on a "yes" to pain.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { P4 } from '../../core/copy4';
import { answerEntry, tags, type DiaryEntry } from '../../core/diary';
import { answerStep } from '../../core/endstep';
import type { DeviceStatus, Engine, ModelResult } from '../../core/engine';
import { insights } from '../../core/insights';
import { letterWords, sameWord, letterEnd } from '../../core/letter';
import { moreChoices } from '../../core/more';
import { CHEST_Q, HEART_Q, ownAfter, ownCard, ownFallbackCard, ownGuard, shownCard, OWN_END } from '../../core/ownwords';
import { makeCard } from '../../core/pipeline';
import { healthOf, healthText } from '../../core/redflag';
import { cloudTextRequest } from '../../core/requests';
import { SAMPLE_PROFILE } from '../../core/sample';
import { handoverText } from '../../core/share';
import { sinceLines } from '../../core/since';
import { EMPTY_PROFILE, type Card, type Profile } from '../../core/types';
import { visitRows, visitText, type VisitRecord } from '../../core/visit';
import { crisisScreen } from '../../web/src/phase5';
import { laterBlock } from '../../web/src/simple';

const ROOT = join(__dirname, '..', '..');
const read = (f: string) => readFileSync(join(ROOT, f), 'utf8');
const HOUR = 3600_000;
const NOW = new Date(2026, 10, 24, 15, 0).getTime();

class Spy implements Engine {
  label = 'spy';
  modes = { device: 'ONLY_ON_DEVICE', cloud: 'PREFER_IN_CLOUD' };
  cloudConfigured = true;
  calls: string[] = [];
  async checkCloud() {}
  async deviceStatus(): Promise<DeviceStatus> { return 'unavailable'; }
  async prepareDevice() {}
  async runDevice(p: string): Promise<ModelResult> { this.calls.push(p); return { text: JSON.stringify({ topic: 'x', kind: 'choice', choices: ['a', 'b'], options: [] }), source: 'on-device', ms: 1 }; }
  cloudRequest(q: string) { return cloudTextRequest(q); }
  async runCloud(q: string): Promise<ModelResult> { this.calls.push(q); return { text: JSON.stringify({ topic: 'lunch', kind: 'choice', choices: ['a sandwich', 'soup'], options: [] }), source: 'in-cloud', ms: 1 }; }
}
const env = (engine: Engine, profile: Profile = SAMPLE_PROFILE) => ({ profile, support: 'more' as const, engine, allowCloud: true, deviceReady: false });
const entry = (q: string, label: string, at: number): DiaryEntry => answerEntry({ q, label, at }, 'body');
const h = (diary: DiaryEntry[], open?: { q: string; at: number; pain?: boolean; red?: 'chest' | 'head' | 'heart' | 'sign' }[]) => handoverText({ diary, health: null, learned: [], name: 'Frank', now: NOW, number: '911', open });

// ---------------------------------------------------------------------------------------------------------------- 1
describe('1. a typed crisis question: what was asked and what they pointed to, never "They chose I can\'t go on"', () => {
  const Q = 'Do you want to end your life?';
  for (const a of ['no', 'not sure', 'good', 'Not now']) {
    it(`"${Q}" answered "${a}": the safety screen, the handover, the week and the visit page quote it as asked`, () => {
      const scr = crisisScreen({ name: 'Frank', number: '911', line: '988', lineGuess: false, numberGuess: false, asked: { q: Q, label: a } });
      expect(scr).not.toMatch(/chose (?:&quot;|")I can(?:&#39;|')t go on/);
      expect(scr).toContain(`Asked &quot;${Q}&quot; and pointed to &quot;${a}&quot;`);
      // the crisis line and the call buttons stay
      expect(scr).toMatch(/href="tel:911"/);
      expect(scr).toMatch(/988/);
      const e = entry(Q, a, NOW - HOUR);
      expect(tags(e)).toContain('crisis');
      const note = h([e]);
      expect(note).not.toMatch(/"I can't go on" was chosen/);
      expect(note).toContain(`Asked "${Q}" and pointed to "${a}"`);
      expect(note).toMatch(/call 911 now/);
      const week = insights([e], { emergency: '', helpline: '', text: '', toggles: {} } as never, 'week', NOW, '911');
      expect(week[0].id).toBe('crisis');
      expect(week[0].text).not.toMatch(/was chosen/);
      expect(week[0].text).toContain(`Asked "${Q}" and pointed to "${a}"`);
      const since = sinceLines([e], NOW - 48 * HOUR, NOW, [], 'Frank', '911', '988');
      expect(since.lines.join('\n')).not.toMatch(/Said "I can't go on"/);
      expect(since.lines.join('\n')).toContain(`Asked "${Q}" and pointed to "${a}"`);
    });
  }
  it('the person\'s own "I can\'t go on" tile is still written as their choice', () => {
    const e = entry('How are you feeling today?', "I can't go on", NOW - HOUR);
    expect(h([e])).toMatch(/"I can't go on" was chosen/);
    expect(crisisScreen({ name: 'Frank', number: '911', line: '988', lineGuess: false, numberGuess: false })).toMatch(/Frank chose &quot;I can&#39;t go on&quot;|Frank chose "I can't go on"/);
  });
  it('the screen passes what was asked and answered to the safety screen', () => {
    const main = read('web/src/main.ts');
    expect(main).toMatch(/crisisScreen\(\{[^}]*asked: crisisAsked\(\)/);
    expect(main).toMatch(/function crisisAsked\(\)/);
  });
});

// ---------------------------------------------------------------------------------------------------------------- 2
describe('2. the next carer reads what the screen said for the heart places, and every warning question asked', () => {
  const cases: [string, string][] = [['Where in the stomach?', 'upper stomach'], ['Where in the back?', 'upper back'], ['Where does it hurt?', 'jaw'], ['Where does it hurt?', 'shoulder'], ['Where in the chest?', 'middle']];
  for (const [q, l] of cases) for (const amount of ['a little', 'quite bad', 'not sure']) {
    it(`${q} ${l}, then "${amount}": the note leads with call now whatever the amount, never "Ask again on your shift"`, () => {
      const d = [entry(q, l, NOW - 2 * HOUR), entry('How bad is the pain?', amount, NOW - 2 * HOUR + 60_000)];
      expect(tags(d[0])).toContain('place-pain');
      const note = h(d);
      expect(note).not.toMatch(/Ask again on your shift/);
      expect(note).toMatch(/Call 911 now, whatever the amount/);
      // the call line is above the counts: it leads
      expect(note.indexOf('whatever the amount')).toBeLessThan(note.indexOf('For the next carer'));
    });
  }
  it('typed "Does your jaw hurt?" yes: the warning line of the note is the chest-type line', () => {
    const note = h([entry('Does your jaw hurt?', 'yes', NOW - HOUR)]);
    expect(note).toMatch(/call now, whatever the amount/);
    expect(note).not.toMatch(/If it is new or sudden and 911 was not called/);
  });
  it('a chest question left for later: STILL OPEN says call now whatever the amount, never "if it is sudden or severe"', () => {
    const note = h([], [{ q: 'How bad is the pain?', at: NOW - HOUR, pain: true, red: 'chest' }]);
    expect(note).toMatch(/Chest pain: call 911 now, whatever the amount/);
    expect(note).not.toMatch(/if it is sudden or severe/);
    const heart = h([], [{ q: 'How bad is the pain?', at: NOW - HOUR, pain: true, red: 'heart' }]);
    expect(heart).toMatch(/call 911 now, whatever the amount/);
    expect(heart).not.toMatch(/if it is sudden or severe/);
  });
  it('the handover is given the red flag of each question left for later', () => {
    expect(read('web/src/main.ts')).toMatch(/open: shownLater\(p8later\.list, Date\.now\(\)\)\.filter\(\(x\) => x\.care\)\.map\(\(x\) => \(\{ q: x\.q, at: x\.at, pain: !!x\.pain, \.\.\.\(x\.red \? \{ red: x\.red \} : \{\}\) \}\)\)/);
  });
  it('Home: a red question left for later is drawn at the very top, red, with its call line (never a calm green card lower down)', () => {
    const block = laterBlock([{ q: 'How bad is the pain?', time: '15:09', i: 0, care: true, pain: true, red: 'chest' }], '<div class="later-signs"></div>', '911');
    expect(block).toMatch(/class="later-item care red"/);
    expect(block).toMatch(/Chest pain was pointed to \(15:09\): call 911 now, whatever the amount/);
    const simple = read('web/src/simple.ts');
    expect(simple).toContain("const painLater = (m.laterHtml ?? '').includes('later-pain');");
  });
  it('"Not now" inside a chest flow: the carer\'s line is a red box, never "Come back to it later, and say when"', () => {
    const main = read('web/src/main.ts');
    expect(main).toMatch(/p9notNow\?\.red \? nowAlert\(P19\.notNowRed\(p9notNow\.red, name, callNumber\(\)\), callNumber\(\), numberGuess\(\)\)/);
  });
  it('a warning question answered "no" stays in the note as asked and answered', () => {
    const note = h([entry('Is your chest tight again?', 'no', NOW - HOUR), entry('Is your smile lopsided?', 'no', NOW - HOUR + 1000)]);
    expect(note).toMatch(/"Is your chest tight again\?" no \(/);
    expect(note).toMatch(/"Is your smile lopsided\?" no \(/);
    expect(note).toMatch(/A yes or no can be wrong after a stroke/);
    expect(note).toMatch(/call 911 now, whatever the amount/);
  });
});

// ---------------------------------------------------------------------------------------------------------------- 3
describe('3. the guard reads misspellings, text-speak and a body part named alone', () => {
  const red = ['Is ur chesst hurtin?', 'Can u breth ok?', 'can u brethe', 'cant breath', 'is ur chets tight', 'does ur hart hurt', 'shortness of breth', 'ur brething funny', 'u ok?', 'r u ok', 'u ok luv', 'chest hurtin'];
  for (const q of red) it(`"${q}" is guarded as a warning sign, never the AI`, async () => {
    expect(ownGuard(q), q).toBe('red');
    const spy = new Spy();
    const c = await ownCard(q, env(spy));
    expect(spy.calls, q).toEqual([]);
    expect(c.own?.guard).toBe('red');
  });
  const care = ['hed hurt?', 'does ur hed hurt', 'is ur hed sore', 'ur back hurtin?', 'ur tummy sore'];
  for (const q of care) it(`"${q}" is kept from the AI`, async () => {
    expect(ownGuard(q), q).not.toBeNull();
    const spy = new Spy();
    await ownCard(q, env(spy));
    expect(spy.calls, q).toEqual([]);
  });
  it('a body part named alone, with no pain word: the rules\' body card with the heart-place line', async () => {
    for (const q of ['shoulder', 'hows ur shoulder today', 'how is your shoulder?', 'your jaw?']) {
      expect(healthOf(q), q).toBe('heart');
      expect(ownGuard(q), q).toBe('red');
      const spy = new Spy();
      const c = await ownCard(q, env(spy));
      expect(spy.calls, q).toEqual([]);
      expect(c.own?.matter, q).toBe('heart');
      expect(c.asked, q).not.toMatch(/stay in or go out|eat or drink/);
      expect(ownAfter('heart', 'yes', '911').end).toBe(OWN_END.heart.replace('{number}', '911'));
    }
    for (const q of ['my arm', 'hows ur arm', 'your leg?', 'his hand today']) {
      expect(healthOf(q), q).toBe('limb');
      const spy = new Spy();
      const c = await ownCard(q, env(spy));
      expect(spy.calls, q).toEqual([]);
      expect(c.own?.matter, q).toBe('limb');
      expect(ownAfter('limb', 'yes', '911').end).toMatch(/can come from the heart: call 911 now/);
    }
    expect(HEART_Q).toMatch(/shoulder/);
    expect(CHEST_Q).toMatch(/chest/);
  });
  it('ordinary words near the health words are left alone', () => {
    for (const q of ['Do you want to play chess?', 'Have you had lunch?', 'Shall I turn the heat up?', 'Have you heard from Jen?', 'Shall we paint?', 'Would you like some bread?', 'Shall I hold your hand?', 'Which side of the bed?', 'Would you like a hand with that?', 'Do you want something fizzy?', 'Are you hungry?', 'Would you like a cup of tea?']) {
      expect(healthOf(q), q).toBeNull();
    }
    expect(healthText('Is ur chesst hurtin?')).toBe('is your chest hurting?');
    expect(healthText('Can u breth ok?')).toBe('can you breath ok?');
  });
});

// ---------------------------------------------------------------------------------------------------------------- 4
describe('4. the visit page: no doubt line under a "yes" to pain', () => {
  const rec = (label: string): VisitRecord => ({ startedAt: NOW, done: true, answers: [{ id: 'pain', q: 'Are you in pain?', label, at: NOW }] });
  it('"Are you in pain?" yes: no "A yes or no can be wrong… please check", a line that takes the yes as a yes', () => {
    const r = visitRows(rec('yes'))[0];
    expect(r.check).toBe(false);
    expect(r.note).not.toContain(P4.visit.check);
    expect(r.note).toMatch(/a yes to pain is taken as a yes/i);
    expect(visitText(rec('yes'), 'Frank')).not.toContain(P4.visit.check);
  });
  it('"Are you in pain?" no: a line to watch, not the generic check', () => {
    const r = visitRows(rec('no'))[0];
    expect(r.check).toBe(false);
    expect(r.note).toMatch(/watch/i);
  });
  it('the screen prints the row\'s own line', () => {
    expect(read('web/src/phase4.ts')).toContain('x.note ? `<small class="vr-check">${esc(x.note)}</small>` : \'\'');
  });
});

// ---------------------------------------------------------------------------------------------------------------- 5
describe('5. online help: a late answer is kept, a carer\'s retry clears the refusal, the stand-in keeps the words', () => {
  it('a cloud answer that comes after the wait is handed to onLate as a card of the AI', async () => {
    let release: (v: ModelResult) => void = () => {};
    const slow: Engine = { ...new Spy(), label: 'slow', modes: { device: 'ONLY_ON_DEVICE', cloud: 'PREFER_IN_CLOUD' }, cloudConfigured: true, checkCloud: async () => {}, deviceStatus: async () => 'unavailable', prepareDevice: async () => {}, runDevice: async () => ({ text: '', source: 'on-device', ms: 0 }), cloudRequest: (q: string) => cloudTextRequest(q), runCloud: () => new Promise<ModelResult>((res) => { release = res; }) } as Engine;
    let late: Card | null = null;
    const c = await makeCard('What do you fancy for lunch today?', { ...env(slow, EMPTY_PROFILE), cloudWaitMs: 30, onLate: (x: Card) => { late = x; } } as never);
    expect(c.blocked).toBeTruthy();
    release({ text: JSON.stringify({ topic: 'lunch', kind: 'choice', choices: ['a sandwich', 'soup'], options: [] }), source: 'in-cloud', ms: 40 });
    await new Promise((r) => setTimeout(r, 10));
    expect(late).not.toBeNull();
    expect(late!.blocked ?? null).toBeNull();
    expect(late!.source).toBe('in-cloud');
    expect(late!.choices.map((x) => x.label)).toEqual(expect.arrayContaining(['a sandwich', 'soup']));
    expect(late!.late).toBe(true);
  });
  it('the screen puts a late card in place of the stand-in only while that card is still shown, labelled', () => {
    const main = read('web/src/main.ts');
    expect(main).toMatch(/onLate: \(late\) => lateCard\(seq, q, late\)/);
    expect(main).toMatch(/function lateCard\(/);
    expect(read('core/copy19.ts')).toMatch(/late:/);
  });
  it('a carer-started cloud step clears the in-page App Check refusal first', () => {
    const main = read('web/src/main.ts');
    for (const act of ["case 'sheet-yes': state.sheet = false; carerCloud();", "case 'sheet-always': state.sheet = false; carerCloud();", "case 'try-ai': if (!state.busy) { carerCloud();", "case 'find-more': if (state.card && !state.picked && !state.busy) { carerCloud();"]) expect(main, act).toContain(act);
    expect(main).toMatch(/function carerCloud\(\) \{ state\.engine\.retryCloudCheck\?\.\(\); p17\.warm = p17\.warm === 'refused' \? 'idle' : p17\.warm; \}/);
  });
  it('the stand-in keeps the carer\'s words: "lunch" is never turned into "eat or drink?"', async () => {
    for (const q of ['What do you fancy for lunch today?', 'What would you like for dinner?', 'What shall we have for breakfast?']) {
      const spy = new Spy();
      const blocked = await makeCard(q, { ...env(spy, EMPTY_PROFILE), allowCloud: false } as never);
      const f = await ownFallbackCard(q, blocked, 'check', { profile: EMPTY_PROFILE, support: 'more' });
      const s = shownCard(f);
      expect(s.asked, q).toBe(q);
      expect(s.say, q).toMatch(new RegExp(`^${q.replace(/[?]/g, '\\?')}`));
      expect(f.choices.map((x) => x.label).join(' '), q).not.toMatch(/drink/);
      expect(f.choices.filter((x) => x.role === 'answer').length).toBeGreaterThanOrEqual(2);
    }
  });
  it('the carer\'s and the person\'s screens show the kept words', () => {
    const main = read('web/src/main.ts');
    expect(main).toContain('return { card: card ? shownCard(card) : card, busy, less, picked, confirmed, recap, answers, pic: picture, waitPic: builtinPicto(\'listen\'), full };');
    expect(main).toContain('name, card: shownCard(c), less: state.less');
  });
});

// ---------------------------------------------------------------------------------------------------------------- 6
describe('6. letters: inside the chosen kind, no spelling twins, nothing rejected again, a next step after the word', () => {
  it('after "something sweet", C gives sweet foods first and no drink in the first three', () => {
    const w = letterWords({ asked: 'Would you like something sweet or something savoury?', letter: 'C', rejected: [], topic: 'food', kind: 'something sweet' }, EMPTY_PROFILE).slice(0, 3);
    expect(w.some((x) => /^(?:coffee|cocoa|cola|cranberry juice|cider)$/.test(x)), w.join(', ')).toBe(false);
    expect(w.some((x) => /cake|custard|chocolate|cookie|crumble|cream/.test(x)), w.join(', ')).toBe(true);
  });
  it('after "a hot meal", no drink and no sweet in the first three', () => {
    const w = letterWords({ asked: 'Would you like a hot meal or a cold meal?', letter: 'C', rejected: [], topic: 'food', kind: 'a hot meal' }, EMPTY_PROFILE).slice(0, 3);
    expect(w.some((x) => /^(?:coffee|cocoa|cola|cake|custard|chocolate|cookies)$/.test(x)), w.join(', ')).toBe(false);
  });
  it('spelling variants and plurals are one word: yoghurt/yogurt, shop/shops, book/books, mum/mom', () => {
    expect(sameWord('yoghurt', 'yogurt')).toBe(true);
    expect(sameWord('shop', 'the shops')).toBe(true);
    expect(sameWord('a walk', 'go for a walk')).toBe(true);
    expect(sameWord('mum', 'mom')).toBe(true);
    expect(sameWord('tea', 'toast')).toBe(false);
    for (const [letter, topic] of [['Y', 'food'], ['SH', 'plans'], ['B', 'fun'], ['M', 'people'], ['CR', 'fun']] as const) {
      const w = letterWords({ asked: '', letter, rejected: [], topic }, EMPTY_PROFILE);
      for (let i = 0; i < w.length; i++) for (let j = i + 1; j < w.length; j++) expect(sameWord(w[i], w[j]), `${letter}: ${w[i]} / ${w[j]}`).toBe(false);
    }
  });
  it('"More choices like these" never offers a word already shown and passed in the conversation', () => {
    const more = moreChoices('place', ['garden', 'go for a walk', 'go for a drive'], EMPTY_PROFILE);
    for (const x of more) expect(/garden|walk|drive/.test(x), x).toBe(false);
    const main = read('web/src/main.ts');
    expect(main).toContain('moreChoices(subject, [...shownOn(c), ...p19.passed], state.profile)');
    expect(main).toContain('moreCard(subject, c.aboutWhat ? [] : [...shownOn(c), ...p19.passed].filter');
  });
  it('"The word is: X." always has a next step: a question to tap, and a line that says what to do', () => {
    for (const w of ['barber', 'crumpets', 'darts', 'crossword', 'pizza', 'rice pudding', 'Maisie', 'thing']) {
      const s = answerStep({ asked: 'It starts with B. Is it one of these?', kind: 'choice', letter: { letter: 'B', rejected: [] } } as never, { label: w, role: 'answer' }, { profile: EMPTY_PROFILE, chain: ['x'], number: '911', red: null, out: false });
      expect(s.follow.length, w).toBeGreaterThan(0);
      expect(s.end, w).not.toMatch(/Ask a yes or no question about it next\.$/);
    }
    expect(letterEnd('barber', EMPTY_PROFILE).follow[0]).toBe('Would you like to go to the barber?');
    expect(letterEnd('pizza', EMPTY_PROFILE).end).toMatch(/Bring it/);
  });
});

// ---------------------------------------------------------------------------------------------------------------- 7
describe('7. the sample family names no show, team or singer', () => {
  it('no third-party name in the sample family or anywhere in the app\'s code', () => {
    const s = JSON.stringify(SAMPLE_PROFILE);
    expect(s).not.toMatch(/Wheel of Fortune|Packers|Johnny Cash/);
    expect(SAMPLE_PROFILE.tv).toEqual(['the quiz show', 'football']);
    expect(SAMPLE_PROFILE.music).toEqual(['old country songs']);
    for (const f of ['core/sample.ts', 'core/rules.ts', 'core/strip.ts', 'web/src/main.ts']) expect(read(f), f).not.toMatch(/Wheel of Fortune|Packers|Johnny Cash/);
  });
});
