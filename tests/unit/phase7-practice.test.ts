// Phase 7, part B (19 Nov 2026): "For the speech therapist", how the conversations at home went. Counts only, from a
// log that holds no word of a question or an answer; never a grade. Pinned here: every count (no events at all, one
// question, the two spans), the conversations with a "something else" (each ends one way, so the ways add up), the
// needs and pain answers only when ticked, with the 20-minute merge and the call sentence on the worst case, the
// words that must never stand on the page, the questions, the screen, and the boundary: no prompt or request file
// knows the log.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { P6 } from '../../core/copy6';
import { P8 } from '../../core/copy8';
import type { DiaryEntry, LogKind } from '../../core/diary';
import { EPISODE_MS, GRADE_WORDS, HELPED, PRACTICE_CAP, addEvent, cleanLog, newLog, ownWording, pickedPractice, practiceCounts, practiceReport, practiceText, practiceUrgent, togglePractice, type PracticeEvent, type PracticeInput, type PracticeLog, type Via } from '../../core/practice';
import { practiceLink, practiceScreen } from '../../web/src/care7';
import { diaryScreen } from '../../web/src/diary';
import { shareSheet } from '../../web/src/phase6';
import { NOW, when } from './week';

const ROOT = join(__dirname, '..', '..');
const read = (f: string) => readFileSync(join(ROOT, f), 'utf8');
const imports = (f: string) => [...read(f).matchAll(/^import [^;]*? from '([^']+)';$/gms)].map((m) => m[1]);
const unesc = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const K = P8.practice;
const MIN = 60 * 1000;
const T0 = when(5, '10:00'); // Saturday 21 Nov, 10:00
const START = when(-30, '08:00'); // the log began long before the span
const ask = (at: number, o: Partial<Extract<PracticeEvent, { k: 'ask' }>> = {}): PracticeEvent => ({ k: 'ask', at, topic: 'food', by: 'app', start: true, ...o });
const yes = (at: number, via: Via = 'card'): PracticeEvent => ({ k: 'answer', at, via });
const out = (at: number, via: Via = 'card'): PracticeEvent => ({ k: 'answer', at, via, esc: true });
const logOf = (events: PracticeEvent[], since = START): PracticeLog => ({ since, events });
const input = (events: PracticeEvent[], o: Partial<PracticeInput> = {}): PracticeInput => ({ log: logOf(events), span: 'week', now: NOW, name: 'Frank', device: 'phone', speak: false, questions: [], diary: null, ...o });
const lines = (m: PracticeInput) => { const r = practiceReport(m); return [r.title, r.sub, ...r.notes, ...(r.call ? [r.call] : []), ...r.sections.flatMap((s) => [s.heading, ...s.lines]), r.footer]; };
const sec = (m: PracticeInput, id: string) => practiceReport(m).sections.find((s) => s.id === id)!.lines;
const TOPIC: Record<LogKind, DiaryEntry['topic']> = { drank: 'food', ate: 'food', toilet: 'body', slept: 'rest', pain: 'body', fall: 'body', tablets: 'body' };
const tap = (id: string, k: LogKind, d: number, t: string): DiaryEntry => ({ id, at: when(d, t), kind: 'log', log: k, label: k, topic: TOPIC[k] });
const ans = (id: string, q: string, label: string, d: number, t: string): DiaryEntry => ({ id, at: when(d, t), kind: 'answer', q, label, topic: 'body' });
const need = (id: string, label: string, d: number, t: string): DiaryEntry => ({ id, at: when(d, t), kind: 'need', label, topic: 'body' });

/** A week that goes through every line the page can hold. */
const FULL: PracticeEvent[] = [
  ask(T0, { topic: 'food' }), yes(T0 + MIN),
  ask(T0 + 2 * MIN, { topic: 'food', start: undefined }), out(T0 + 3 * MIN), yes(T0 + 4 * MIN, 'about'), yes(T0 + 5 * MIN, 'more'),
  ask(T0 + 10 * MIN, { topic: 'body', by: 'typed', two: true }), { k: 'no', at: T0 + 11 * MIN }, yes(T0 + 12 * MIN),
  ask(T0 + 13 * MIN, { topic: 'body', by: 'typed', second: true }), yes(T0 + 14 * MIN),
  ask(T0 + 20 * MIN, { topic: 'other', by: 'spoken', quiz: true }), { k: 'anyway', at: T0 + 21 * MIN },
  ask(T0 + 30 * MIN, { topic: 'people' }), out(T0 + 31 * MIN), { k: 'stuck', at: T0 + 32 * MIN, after: true }, yes(T0 + 33 * MIN, 'repair'), out(T0 + 34 * MIN, 'letter'), yes(T0 + 36 * MIN, 'letter'),
  { k: 'turn', at: T0 + 40 * MIN }, yes(T0 + 41 * MIN, 'turn'), out(T0 + 42 * MIN, 'turn'),
  { k: 'board', at: T0 + 50 * MIN }, yes(T0 + 51 * MIN, 'needs'),
  { k: 'stuck', at: T0 + 55 * MIN },
];

describe('the counts of the page, one by one', () => {
  const c = practiceCounts(logOf(FULL), 'week', NOW);
  it('questions asked, by topic, and where each came from', () => {
    expect(c.asked).toBe(6);
    expect(c.byTopic).toEqual([{ topic: 'food', n: 2 }, { topic: 'body', n: 2 }, { topic: 'people', n: 1 }, { topic: 'other', n: 1 }]);
    expect([c.app, c.typed, c.spoken]).toEqual([3, 2, 1]);
    expect(c.app + c.typed + c.spoken).toBe(c.asked);
  });
  it('what the app flagged: two things in one (and the second half asked), a memory question (and "make a card" after it)', () => {
    expect([c.two, c.second, c.quiz, c.anyway]).toEqual([1, 1, 1, 1]);
  });
  it('"something else": four times confirmed, in three conversations; each conversation ends one way', () => {
    expect([c.elseTaps, c.elseTalks]).toEqual([4, 3]);
    expect(c.helped).toEqual({ more: 1, letter: 1, typed: 0, narrow: 0, needs: 0, body: 0, next: 0 });
    // (the person's own start ended on "something else", and then the needs board was opened from the first screen: nothing was confirmed after it)
    expect(c.helpedNone).toBe(1);
    expect(HELPED.reduce((n, h) => n + c.helped[h], 0) + c.helpedNone).toBe(c.elseTalks);
  });
  it('"What is it about?" and a tile of "We\'re stuck" are steps on the way, not the end of it', () => {
    const viaAbout = practiceCounts(logOf([ask(T0), out(T0 + MIN), yes(T0 + 2 * MIN, 'about')]), 'week', NOW);
    expect([viaAbout.elseTalks, viaAbout.helpedNone]).toEqual([1, 1]);
    const viaRepair = practiceCounts(logOf([ask(T0), out(T0 + MIN), yes(T0 + 2 * MIN, 'repair'), yes(T0 + 3 * MIN, 'typed')]), 'week', NOW);
    expect(viaRepair.helped.typed).toBe(1);
    expect(viaRepair.helpedNone).toBe(0);
  });
  it('each way is told apart: the AI\'s choices, the needs board, the body card, another question of the same conversation', () => {
    for (const [via, how] of [['narrow', 'narrow'], ['needs', 'needs'], ['body', 'body'], ['card', 'next'], ['typed', 'typed'], ['letter', 'letter'], ['more', 'more']] as [Via, string][]) {
      const x = practiceCounts(logOf([ask(T0), out(T0 + MIN), yes(T0 + 2 * MIN, via)]), 'week', NOW);
      expect(x.helped[how as keyof typeof x.helped], via).toBe(1);
      expect(x.helpedNone, via).toBe(0);
    }
  });
  it('a "something else" with nothing confirmed for 30 minutes is over: an answer an hour later is not counted as what helped', () => {
    const x = practiceCounts(logOf([ask(T0), out(T0 + MIN), yes(T0 + MIN + EPISODE_MS + MIN, 'letter')]), 'week', NOW);
    expect([x.elseTalks, x.helpedNone, x.helped.letter]).toEqual([1, 1, 0]);
    const within = practiceCounts(logOf([ask(T0), out(T0 + MIN), yes(T0 + EPISODE_MS, 'letter')]), 'week', NOW);
    expect([within.helpedNone, within.helped.letter]).toEqual([0, 1]);
  });
  it('the person started, "We\'re stuck", and the check', () => {
    expect(c.turns).toBe(1);
    expect([c.stuck, c.stuckAfter]).toEqual([2, 1]);
    expect(c.checkYes).toBe(FULL.filter((e) => e.k === 'answer').length);
    expect(c.checkNo).toBe(1);
  });
  it('on 400 made-up logs the ways and "none" add up to the conversations, and no count is negative or more than the rows', () => {
    let seed = 7;
    const rnd = (n: number) => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
    const VIAS: Via[] = ['card', 'more', 'about', 'letter', 'typed', 'narrow', 'needs', 'body', 'repair', 'turn'];
    for (let run = 0; run < 400; run++) {
      const events: PracticeEvent[] = [];
      let at = when(rnd(7), '08:00');
      for (let i = 0; i < 5 + rnd(40); i++) {
        at += rnd(50) * MIN;
        const k = rnd(10);
        events.push(k < 3 ? ask(at, { start: rnd(2) ? true : undefined, by: (['app', 'typed', 'spoken'] as const)[rnd(3)], two: rnd(5) ? undefined : true }) : k < 6 ? yes(at, VIAS[rnd(VIAS.length)]) : k < 8 ? out(at, VIAS[rnd(VIAS.length)]) : k === 8 ? { k: 'turn', at } : { k: 'no', at });
      }
      const x = practiceCounts(logOf(events), 'month', NOW + 3 * 24 * 60 * MIN);
      expect(x.asked + x.checkYes + x.checkNo + x.turns).toBeGreaterThan(0);
      expect(HELPED.reduce((n, h) => n + x.helped[h], 0) + x.helpedNone).toBe(x.elseTalks);
      expect(x.elseTaps).toBeGreaterThanOrEqual(x.elseTalks);
      expect(x.app + x.typed + x.spoken).toBe(x.asked);
      expect(x.byTopic.reduce((n, t) => n + t.n, 0)).toBe(x.asked);
    }
  });
});

describe('no days, one question, and the two spans', () => {
  it('a log with nothing in it: every line stands with a nought, the page says nothing was counted, and no line is broken', () => {
    const m = input([], { name: '' });
    const all = lines(m);
    expect(practiceReport(m).counts.empty).toBe(true);
    expect(all).toContain(K.empty);
    expect(sec(m, 'asked')).toEqual(['Questions asked: 0. Counted: each question that became a card or a line to say.', "Picked from the app's own questions (one thought each): 0. Typed by the carer: 0. Spoken by the carer: 0.", K.noFlags]);
    expect(sec(m, 'fit')).toEqual(['"Something else" was chosen: 0 times.', '"We\'re stuck" (show, write or draw) was opened: 0 times.']);
    expect(sec(m, 'turn')).toEqual(['The person started the conversation ("They want to say something"): 0 times.', 'The check ("So: tea. Right?"): "Yes" 0 times, "No, something else" 0 times.', 'Read aloud is off on this phone today.']);
    for (const l of all) expect(l, l).not.toMatch(/undefined|NaN|null|\[object/);
  });
  it('one question and one answer: singular words, and no line for what did not happen', () => {
    const m = input([ask(T0, { topic: 'food' }), yes(T0 + MIN)]);
    expect(sec(m, 'asked')).toEqual(['Questions asked: 1. Counted: each question that became a card or a line to say.', 'By topic: Food & drink 1.', "Picked from the app's own questions (one thought each): 1. Typed by the carer: 0. Spoken by the carer: 0.", K.noFlags]);
    expect(sec(m, 'turn')[1]).toBe('The check ("So: tea. Right?"): "Yes" 1 time, "No, something else" 0 times.');
    expect(lines(m)).not.toContain(K.empty);
    const one = input([ask(T0), out(T0 + MIN)]);
    expect(sec(one, 'fit')).toEqual(['"Something else" was chosen: 1 time, in 1 conversation. Counted: each time it was confirmed on a card.', 'After it, no answer was confirmed: 1 time. Counted: a new conversation started, or 30 minutes passed.', '"We\'re stuck" (show, write or draw) was opened: 0 times.']);
  });
  it('the last 7 days hold today and the six days before; the last 30 days hold more; a row from before the span is in neither count of it', () => {
    const events = [ask(when(0, '00:00')), ask(when(-1, '23:59')), ask(when(-23, '00:00')), ask(when(-24, '23:59')), ask(NOW + MIN)];
    expect(practiceCounts(logOf(events), 'week', NOW).asked).toBe(1);
    expect(practiceCounts(logOf(events), 'month', NOW).asked).toBe(3);
    expect(practiceReport(input(events)).sub).toBe('Conversations with Frank, the last 7 days (Mon 16 Nov to Sun 22 Nov).');
    expect(practiceReport(input(events, { span: 'month', name: '' })).sub).toBe('Conversations at home, the last 30 days (Sat 24 Oct to Sun 22 Nov).');
  });
  it('when the app began to count inside the span, the page says from which day; otherwise it does not', () => {
    const m = input([ask(T0)], { log: logOf([ask(T0)], when(4, '09:00')) });
    expect(practiceReport(m).notes).toContain('The app began to count these on Fri 20 Nov: nothing from before that day is in the numbers.');
    expect(practiceReport(input([ask(T0)])).notes.some((n) => n.startsWith('The app began'))).toBe(false);
  });
  it('every line says what it counts: the brief\'s sentence stands under the title, on the phone, the tablet and the computer', () => {
    expect(practiceReport(input([])).notes[0]).toBe('Counted by the app from this phone. Only what was entered here.');
    expect(practiceReport(input([], { device: 'tablet' })).notes[0]).toBe('Counted by the app from this tablet. Only what was entered here.');
    expect(practiceReport(input([], { speak: true, device: 'computer' })).sections.find((s) => s.id === 'turn')!.lines[2]).toBe('Read aloud is on on this computer today.');
  });
});

describe('the person\'s own data stays out unless the box is ticked', () => {
  const diary: DiaryEntry[] = [
    ans('p1', 'Are you in pain?', 'yes', 1, '09:00'), ans('p2', 'Where does it hurt?', 'chest', 1, '09:01'), ans('p3', 'How bad is the pain?', 'quite bad', 1, '09:02'), tap('p4', 'pain', 1, '09:10'),
    tap('p5', 'pain', 3, '20:00'),
    need('n1', 'toilet', 2, '10:00'), need('n2', 'toilet', 2, '15:00'), need('n3', 'drink', 4, '11:00'),
    tap('d1', 'drank', 2, '08:00'), tap('f1', 'fall', 2, '18:00'),
  ];
  it('off (the default): the page holds nothing of the diary, on its worst case as well (a pain in the chest, quite bad)', () => {
    const t = practiceText(input(FULL, { diary: null }));
    expect(t).toContain(K.healthOffLine);
    for (const w of ['chest', 'quite bad', 'toilet', 'hurt', 'Drank', 'Fall', 'Call 911']) expect(t, w).not.toContain(w);
    expect(practiceReport(input(FULL)).call).toBe('');
  });
  it('off, with such a pain in the diary of the span: the screen tells the carer, with whom to tell and when to call (the page itself stays without it)', () => {
    expect(practiceUrgent(diary, 'week', NOW)).toBe(true);
    expect(practiceUrgent(diary.filter((e) => e.id !== 'p2' && e.id !== 'p3'), 'week', NOW)).toBe(false);
    expect(practiceUrgent([need('w', "something's wrong", 1, '10:00')], 'week', NOW)).toBe(true);
    expect(practiceUrgent([ans('old', 'Where does it hurt?', 'head', -20, '10:00')], 'week', NOW)).toBe(false);
    const html = unesc(practiceScreen({ name: 'Frank', device: 'phone', span: 'week', report: practiceReport(input(FULL)), health: false, warn: K.healthWarn('911'), picked: [], any: true }));
    expect(html).toContain('id="practice-warn"');
    expect(html).toContain('Tell the doctor or nurse. If it is new or sudden, call 911 now.');
    expect(html.slice(html.indexOf('id="practice-page"'))).not.toContain('chest');
  });
  it('ticked: the needs pointed to with their counts, the pain entered, the answers as given; a card answer and a tap within 20 minutes count once', () => {
    const h = sec(input(FULL, { diary }), 'health');
    expect(h[0]).toBe('From the diary: what Frank pointed to, and what the family logged. Not a medical record.');
    expect(h[1]).toBe('Needs board, pointed to: toilet 2, drink 1.');
    // (Tuesday: three answers of one conversation and one "Pain" tap nine minutes later are one entry; Thursday's tap is the second)
    expect(h[2]).toBe('Pain: entered 2 times (Tue 17 Nov 09:10; Thu 19 Nov 20:00). A card answer and a tap within 20 minutes count once.');
    expect(h[3]).toBe('The answers as given: Tue 17 Nov 09:00 "Are you in pain?" "yes"; Tue 17 Nov 09:01 "Where does it hurt?" "chest"; Tue 17 Nov 09:02 "How bad is the pain?" "quite bad".');
    // (no drink and no fall: the box is for the needs and the pain answers, and for nothing else of the diary)
    expect(h.join(' ')).not.toMatch(/Drank|Fall|drank|fall/);
  });
  it('ticked, the worst case: a strong pain or a pain in the chest puts the call sentence at the top, and whom to tell under the answers', () => {
    const r = practiceReport(input(FULL, { diary, number: '999' }));
    expect(r.call).toBe('Call 999 now if this is new or sudden: see the pain lines below.');
    expect(r.sections.find((s) => s.id === 'health')!.lines.at(-1)).toBe('Tell the doctor or nurse. If it is new or sudden, call 999 now.');
    const t = practiceText(input(FULL, { diary }));
    expect(t.split('\n')[1]).toBe('Call 911 now if this is new or sudden: see the pain lines below.');
    // a pain that is neither strong nor in the head or the chest has no call sentence, and still the line that takes it as said
    const mild = practiceReport(input(FULL, { diary: [ans('m1', 'Are you in pain?', 'yes', 1, '09:00'), ans('m2', 'How bad is the pain?', 'a little', 1, '09:01')] }));
    expect(mild.call).toBe('');
    expect(mild.sections.find((s) => s.id === 'health')!.lines).toContain('Pain: entered 1 time (Tue 17 Nov 09:00). A card answer and a tap within 20 minutes count once.');
  });
  it('ticked, with nothing entered: "none entered" is said as a gap, never as "no pain"', () => {
    const h = sec(input([], { diary: [] }), 'health');
    expect(h).toEqual(['From the diary: what Frank pointed to, and what the family logged. Not a medical record.', 'Needs board: nothing pointed to in this time.', 'Pain: none entered. That does not show there was none.']);
  });
  it('ticked, a month of pain: the latest are named, the line says how many came before, and the call sentence still stands for one that is not named', () => {
    const many: DiaryEntry[] = [ans('h0', 'Where does it hurt?', 'head', -20, '09:00'), ...Array.from({ length: 12 }, (_, i) => tap(`t${i}`, 'pain', -10 + i, '10:00'))];
    const r = practiceReport(input([], { span: 'month', diary: many }));
    const h = r.sections.find((s) => s.id === 'health')!.lines;
    expect(h[2]).toContain('Pain: entered 13 times (7 earlier, then ');
    expect(r.call).toContain('Call 911 now');
  });
  it('the board\'s "something\'s wrong" carries the call sentence as well', () => {
    const r = practiceReport(input([], { diary: [need('w', "something's wrong", 1, '10:00')] }));
    expect(r.call).toContain('Call 911 now if this is new or sudden');
  });
});

describe('never a grade, never advice, never a guessed pronoun', () => {
  const diary: DiaryEntry[] = [ans('p1', 'Is the pain bad?', 'very bad', 1, '09:00'), ans('p2', 'How bad is the pain?', 'quite bad', 1, '09:02'), ans('p3', 'Where does it hurt?', 'head', 1, '09:03'), need('n1', "something's wrong", 2, '10:00'), need('n2', 'pain', 2, '10:05')];
  const cases: PracticeInput[] = [
    input([]), input([], { name: '' }), input(FULL), input(FULL, { name: '', speak: true, span: 'month' }), input(FULL, { diary, questions: [...K.questions] }), input(FULL, { diary: [], device: 'computer' }),
    input([ask(T0, { by: 'typed', two: true, quiz: true }), ...Array.from({ length: 30 }, (_, i) => out(T0 + (i + 1) * MIN)), ...Array.from({ length: 30 }, (_, i): PracticeEvent => ({ k: 'no', at: T0 + (40 + i) * MIN }))], { name: 'Sam' }),
  ];
  it('no line of the page holds good, bad, well done, poor, should, must or failed (the person\'s own answers, in quotes, are theirs)', () => {
    let n = 0;
    for (const m of cases) for (const l of [...lines(m), ...practiceText(m).split('\n')]) { n++; expect(ownWording(l), l).not.toMatch(GRADE_WORDS); }
    expect(n).toBeGreaterThan(200);
    // the test can fail: a line that grades is caught, and a quoted answer is not
    expect(GRADE_WORDS.test(ownWording('Frank did well: a good week.'))).toBe(true);
    expect(GRADE_WORDS.test(ownWording('You should ask fewer questions.'))).toBe(true);
    expect(GRADE_WORDS.test(ownWording('The answers as given: "How bad is the pain?" "very bad".'))).toBe(false);
  });
  it('nor do the fixed words around it: the screen\'s own lines, the questions for the therapist, the sheet', () => {
    const fixed = [K.link, K.linkSub, K.heading, K.lead('Frank'), K.lead(''), K.lock('phone'), K.healthBox, K.healthOff, K.healthOn, K.qHeading, K.qLead, K.print, K.share, K.del, K.sheetHeading, K.sheetHealthOn, K.sheetHealthOff, ...K.questions, ...Object.values(K.helped), ...Object.values(K.sec), ...Object.values(K.spans)];
    for (const l of fixed) { expect(l, l).not.toMatch(GRADE_WORDS); expect(l, l).not.toContain('!'); }
  });
  it('no line praises, scolds or tells anyone what to do, and none has an exclamation mark', () => {
    for (const m of cases) for (const l of lines(m)) {
      expect(l, l).not.toMatch(/\b(?:great|excellent|better|worse|improve|improved|too many|too few|not enough|need to|needs to|ought|try to|well|badly|correct|wrong answer|mistake|progress|score:|\d+ ?%)\b/i);
      expect(l, l).not.toContain('!');
    }
  });
  it('no "he", "she", "him", "her" or "his": the name, or "the person"; and never "them can"', () => {
    for (const m of cases) for (const l of lines(m)) {
      expect(ownWording(l), l).not.toMatch(/\b(?:he|she|him|her|his|hers|himself|herself)\b/i);
      expect(l, l).not.toMatch(/\bthem (?:can|is|has|are|have|was|will|started)\b/i);
    }
    expect(sec(input(FULL), 'turn')[0]).toBe('Frank started the conversation ("Frank wants to say something"): 1 time.');
    expect(practiceReport(input(FULL, { name: '' })).notes[1]).toBe('These are counts to talk over. They are not a score of the family or of the person.');
  });
});

describe('"Questions for the therapist": fixed, picked by the carer, three at most', () => {
  it('ten fixed questions; a pick is kept only when it is one of them, three at most, in the list\'s order', () => {
    expect(K.questions.length).toBe(10);
    expect(new Set(K.questions).size).toBe(10);
    expect(pickedPractice([K.questions[5], 'Is the carer any good?', K.questions[0], K.questions[9], K.questions[2]])).toEqual([K.questions[0], K.questions[2], K.questions[5]]);
    expect(pickedPractice(null)).toEqual([]);
    expect(pickedPractice('x')).toEqual([]);
  });
  it('a tap puts a question on, a second tap takes it off, a fourth is not taken', () => {
    let p: string[] = [];
    for (const i of [0, 1, 2]) p = togglePractice(p, K.questions[i]);
    expect(p).toEqual(K.questions.slice(0, 3));
    expect(togglePractice(p, K.questions[3])).toEqual(p);
    expect(togglePractice(p, K.questions[1])).toEqual([K.questions[0], K.questions[2]]);
  });
  it('the picked ones close the page; with none picked there is no such section', () => {
    const m = input(FULL, { questions: [K.questions[1], K.questions[6]] });
    expect(practiceReport(m).sections.at(-1)).toEqual({ id: 'ask', heading: 'QUESTIONS FOR THE THERAPIST', lines: ['The family wants to ask:', '- What helps after "something else"?', '- What helps the person to start a conversation?'] });
    expect(practiceReport(input(FULL)).sections.map((s) => s.id)).toEqual(['asked', 'fit', 'turn', 'health']);
  });
});

describe('the text for the share sheet, and the screen', () => {
  it('the text starts with the first line of every shared text, holds every line of the page in its order, and ends with what it is not', () => {
    const m = input(FULL, { questions: [K.questions[0]] });
    const t = practiceText(m).split('\n');
    expect(t[0]).toBe(P6.share.stamp('Sun 22 Nov, 12:00'));
    expect(t[1]).toBe('');
    expect(t[2]).toBe('For the speech therapist: How the conversations at home went');
    expect(t.at(-1)).toBe('Counted by fixed rules on this phone. No AI. Not an assessment and not a medical record.');
    const r = practiceReport(m);
    const body = t.join('\n');
    let at = 0;
    for (const l of [r.sub, ...r.notes, ...r.sections.flatMap((s) => [s.heading, ...s.lines]), r.footer]) { const k = body.indexOf(l, at); expect(k, l).toBeGreaterThanOrEqual(at); at = k; }
    expect(body).not.toMatch(/data:|<img|undefined/);
  });
  it('the screen shows the page before anything leaves: the box is off, the controls are not printed, Print and Share stand under the page', () => {
    const html = practiceScreen({ name: 'Frank', device: 'phone', span: 'week', report: practiceReport(input(FULL)), health: false, warn: '', picked: [], any: true });
    expect(html).toMatch(/<input type="checkbox" id="practice-health" ><span>Include the needs and pain answers<\/span>/);
    expect(html).toContain('id="practice-controls"');
    expect(html).toMatch(/class="no-print stack practice-controls"/);
    expect(html.indexOf('id="practice-page"')).toBeLessThan(html.indexOf('id="practice-print"'));
    expect(html.indexOf('id="practice-print"')).toBeLessThan(html.indexOf('id="practice-share"'));
    expect(html).toContain('data-act="back"');
    expect(html).toContain('data-act="home"');
    expect(html).not.toContain('id="practice-warn"');
    for (const l of practiceReport(input(FULL)).sections.flatMap((s) => s.lines)) expect(unesc(html), l).toContain(l.replace(/^- /, ''));
    // three questions picked: the others cannot be ticked
    const full = practiceScreen({ name: '', device: 'phone', span: 'month', report: practiceReport(input([], { span: 'month', name: '' })), health: true, warn: '', picked: K.questions.slice(0, 3), any: false });
    expect(full.match(/data-practice-q="\d" checked/g)!.length).toBe(3);
    expect(full.match(/data-practice-q="\d"\s+disabled/g)!.length).toBe(7);
    expect(full).not.toContain('id="practice-del"');
    expect(full).toMatch(/id="practice-month"[^>]*aria-selected="true"/);
  });
  it('the way in is on the diary screen, with or without entries', () => {
    const model = (any: boolean) => ({ name: 'Frank', tab: 'today' as const, topic: 'all' as const, now: NOW, entries: [], any, logged: null, insights: null, tip: { tip: null, words: null, off: false }, copied: false, deleted: false });
    expect(diaryScreen(model(false))).toContain('id="practice-link"');
    expect(diaryScreen(model(true))).toContain('href="#/practice"');
    expect(practiceLink()).toContain('How the conversations went: counts only, no grade.');
  });
  it('the sheet of phase 6 shows this text with its own heading and no box: what is in it was decided on the page', () => {
    const text = practiceText(input(FULL));
    const html = shareSheet({ kind: 'practice', text, health: false, hasHealth: true, risky: ['fluid limit from the doctor'], canShare: true, device: 'phone', status: '', page: { heading: K.sheetHeading, note: K.sheetHealthOff } });
    expect(html).toContain('Share this with the speech therapist?');
    expect(html).not.toContain('id="share-health"');
    expect(html).toContain('This text leaves the phone through the app you pick (message, email). Talk Partner keeps no copy and has no server.');
    expect(unesc(html.split('<pre class="q" id="share-text" tabindex="0">')[1].split('</pre>')[0])).toBe(text);
    expect(html).toContain('id="share-go"');
    expect(html).toContain('id="share-copy"');
    // the sheet of phase 6 is as it was for its own two texts
    expect(shareSheet({ kind: 'family', text: 'x', health: false, hasHealth: true, risky: [], canShare: true, device: 'phone', status: '' })).toContain('id="share-health"');
  });
});

describe('the log: rows with no word in them, kept on this device, known to no prompt', () => {
  it('a row holds a time, a kind and marks: no field of it can hold a question or an answer', () => {
    const src = read('core/practice.ts');
    const union = src.slice(src.indexOf('export type PracticeEvent ='), src.indexOf('export interface PracticeLog'));
    expect(union).not.toMatch(/: string/);
    for (const e of FULL) for (const [k, v] of Object.entries(e)) {
      if (typeof v === 'string') expect(['ask', 'anyway', 'answer', 'no', 'turn', 'stuck', 'board', 'food', 'body', 'rest', 'people', 'feel', 'plans', 'fun', 'other', 'app', 'typed', 'spoken', 'card', 'more', 'about', 'letter', 'narrow', 'needs', 'repair'], `${k}=${v}`).toContain(v);
      else expect(typeof v === 'number' || v === true || v === undefined, `${k}`).toBe(true);
    }
  });
  it('whatever was stored comes back as a log; a new one starts now; the oldest rows fall off past the cap', () => {
    expect(cleanLog(undefined, NOW)).toEqual({ since: NOW, events: [] });
    expect(cleanLog({ since: 'x', events: [{ k: 'ask', at: 1 }, { k: 'nope', at: 2 }, null, { k: 'no' }] }, NOW)).toEqual({ since: NOW, events: [{ k: 'ask', at: 1 }] });
    expect(cleanLog({ since: NOW + 5, events: [] }, NOW).since).toBe(NOW);
    let log = newLog(5);
    for (let i = 0; i < PRACTICE_CAP + 10; i++) log = addEvent(log, { k: 'no', at: i });
    expect(log.events.length).toBe(PRACTICE_CAP);
    expect(log.events[0].at).toBe(10);
    expect(log.since).toBe(5);
  });
  it('the page writes a row for a question, the check, a start by the person, "We\'re stuck"; never for the sample family, never for a doctor-visit question', () => {
    const main = read('web/src/main.ts');
    expect(main).toContain("function notePractice(e: PracticeEvent) {\n  if (state.demo) return;");
    expect(main.match(/notePractice\(\{ k: '(\w+)'/g)!.map((x) => x.slice(19, -1)).sort()).toEqual(['answer', 'anyway', 'ask', 'ask', 'board', 'no', 'stuck', 'turn']);
    expect(main).toContain("if (t.dataset.confirm === 'yes' && state.picked && !c.visit) notePractice(");
    expect(main).toContain("if (t.dataset.confirm === 'change' && state.picked && !c.visit) notePractice(");
    // the rows are built from marks of the card, never from its words
    for (const call of main.match(/notePractice\(\{[^;]*\}\);/g)!) expect(call, call.slice(0, 60)).not.toMatch(/label|asked|\.say|spoken:|lastQuestion/);
    // the diary is handed to the builder only with the box ticked, and the box is off again once the page was left
    expect(main).toContain('diary: p8.health && !state.demo ? state.diary : null');
    expect(main).toContain("if (r !== 'practice') p8.health = false;");
  });
  it('printing and sharing: Print is the browser\'s own, Share goes through the sheet of phase 6 with the page\'s text; nothing else hands it over', () => {
    const main = read('web/src/main.ts');
    expect(main.match(/navigator\.share\(/g)!.length).toBe(1);
    expect(main.match(/practiceText\(/g)!.length).toBe(1);
    expect(main).toContain("case 'page-print': window.print(); break;");
    expect(main).toContain("if (kind === 'practice') return practiceText(practiceInput());");
  });
  it('no engine, prompt or request file knows the log, the page or its words; the builder imports the copy, the diary, the topics and the call number only', () => {
    expect(imports('core/practice.ts').sort()).toEqual(['./copy5', './copy6', './copy8', './diary', './redflag', './topics']);
    const builders = ['core/prompt.ts', 'core/requests.ts', 'core/strip.ts', 'core/pipeline.ts', 'core/narrow.ts', 'core/summary.ts', 'core/reword.ts', 'core/engine.ts', 'core/rules.ts', 'core/speak.ts', 'core/letter.ts', 'core/phototalk.ts', 'core/tip.ts', 'core/insights.ts', ...readdirSync(join(ROOT, 'web/src/ai')).filter((f) => f.endsWith('.ts')).map((f) => `web/src/ai/${f}`)];
    for (const f of builders) for (const i of imports(f)) expect(/\/(?:practice|passport|copy8|care7)$/.test(i), `${f} imports ${i}`).toBe(false);
    expect(imports('web/src/care7.ts').every((i) => /core\/(?:copy8|passport|practice)$|^\.\/simple$/.test(i))).toBe(true);
    const pkg = JSON.parse(read('package.json')) as { dependencies: Record<string, string> };
    expect(Object.keys(pkg.dependencies)).toEqual(['firebase']);
  });
});
