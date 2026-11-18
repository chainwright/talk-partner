// The answer-reliability guard (core/reliability.ts): rules only. Pinned here: "yes" to 4 of the last 5 yes / no cards
// within 10 minutes; the same place on the screen 4 times in a row; what is marked "less sure"; the next either-or in
// a different order with no choice lost; and that none of it can reach the person's screen or a request.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { COPY } from '../../core/copy';
import { MIN_CARDS, MIN_SPAN_MS, RELIABLE, SAME_POS, WINDOW_MS, YES_MIN, YES_OF, careAnswer, markLessSure, reliability, reorder, tapsFrom, type Tap } from '../../core/reliability';
import { needsCard } from '../../core/needs';
import { answeredScreen, cardScreen, personSimple } from '../../web/src/simple';
import { guardBlock } from '../../web/src/diary';

const ROOT = join(__dirname, '..', '..');
const T0 = new Date(2026, 10, 20, 19, 0).getTime();
const min = (n: number) => T0 + n * 60000;
const yn = (n: number, yes: boolean): Tap => ({ at: min(n), yn: true, yes, pos: yes ? 0 : 1, of: 2 });
const pick = (n: number, pos: number, of = 2): Tap => ({ at: min(n), yn: false, yes: false, pos, of });

describe('"yes" to nearly every yes / no question', () => {
  it(`${YES_MIN} of the last ${YES_OF} within 10 minutes is noticed, 3 of 5 is not`, () => {
    expect(YES_MIN).toBe(4); expect(YES_OF).toBe(5); expect(WINDOW_MS).toBe(600000);
    expect(reliability([yn(0, true), yn(1, false), yn(2, true), yn(3, false), yn(4, true)], min(4)).flags).toEqual([]);
    const r = reliability([yn(0, true), yn(1, true), yn(2, false), yn(3, true), yn(4, true)], min(4));
    expect(r.flags).toEqual(['yes-run']);
    expect(r.since).toBe(min(0));
  });
  it('four in a row are enough; three are not', () => {
    expect(reliability([yn(0, true), yn(1, true), yn(2, true)], min(2))).toBe(RELIABLE);
    expect(reliability([yn(0, true), yn(1, true), yn(2, true), yn(3, true)], min(3)).flags).toContain('yes-run');
  });
  it('only the last five count: an older "no" run does not hide a new "yes" run', () => {
    const taps = [yn(0, false), yn(1, false), yn(2, true), yn(3, true), yn(4, true), yn(5, true), yn(6, true)];
    expect(reliability(taps, min(6)).since).toBe(min(2));
  });
  it('answers more than 10 minutes old do not count, and the flag goes by itself', () => {
    const taps = [yn(0, true), yn(1, true), yn(2, true), yn(3, true)];
    expect(reliability(taps, min(3)).flags.length).toBeGreaterThan(0);
    expect(reliability(taps, min(14))).toBe(RELIABLE);
    expect(reliability([yn(-30, true), yn(-20, true), yn(0, true), yn(1, true)], min(1))).toBe(RELIABLE);
  });
  it('an either-or answer is not a "yes"', () => {
    expect(reliability([pick(0, 0), pick(1, 1), pick(2, 0), pick(3, 1), pick(4, 0)], min(4))).toBe(RELIABLE);
  });
});

describe('the same place on the screen every time', () => {
  it(`${SAME_POS} times in a row is noticed, with the place; 3 times is not; a different place breaks the run`, () => {
    expect(reliability([pick(0, 1), pick(1, 1), pick(2, 1)], min(2))).toBe(RELIABLE);
    const r = reliability([pick(0, 0), pick(1, 1), pick(2, 1), pick(3, 1), pick(4, 1)], min(4));
    expect(r).toEqual({ flags: ['same-position'], since: min(1), pos: 1 });
    expect(reliability([pick(0, 1), pick(1, 1), pick(2, 0), pick(3, 1), pick(4, 1)], min(4))).toBe(RELIABLE);
  });
  it('a card with one answer cannot show it, and tea first every morning is a preference, not a flag', () => {
    expect(reliability([pick(0, 0, 1), pick(1, 0, 1), pick(2, 0, 1), pick(3, 0, 1)], min(3))).toBe(RELIABLE);
    const mornings = [0, 1, 2, 3, 4].map((d): Tap => ({ at: T0 + d * 86400000, yn: false, yes: false, pos: 0, of: 2 }));
    expect(reliability(mornings, mornings[4].at)).toBe(RELIABLE);
  });
  it('both at once: the run starts at the earlier of the two', () => {
    const r = reliability([pick(0, 0), yn(1, true), yn(2, true), yn(3, true), yn(4, true)], min(4));
    expect(r.flags).toEqual(['yes-run', 'same-position']);
    expect(r.since).toBe(min(0));
  });
});

describe('never about pain, the toilet, help or a need; never in an ordinary fast flow', () => {
  const sec = (n: number, yes = true): Tap => ({ at: T0 + n * 1000, yn: true, yes, pos: yes ? 0 : 1, of: 2 });
  it('which answers the guard does not read', () => {
    for (const q of ['Are you in pain?', 'Does it hurt?', 'Where does it hurt?', 'Do you need the toilet?', 'Do you need help?', 'How bad is the pain?', 'What do you need?']) expect(careAnswer(q, 'yes'), q).toBe(true);
    expect(careAnswer('How are you feeling today?', 'in pain')).toBe(true);
    for (const q of ['Are you tired?', 'Are you hungry?', 'Would you like tea or coffee?', 'Would you like some music on?']) expect(careAnswer(q, 'yes'), q).toBe(false);
  });
  it('a "yes" to pain or the toilet does not count toward a run, and is never marked', () => {
    const h = [['Are you tired?', 0], ['Are you in pain?', 1], ['Do you need the toilet?', 2], ['Are you hungry?', 3], ['Would you like some music on?', 4]].map(([q, n]) => ({ q: q as string, label: 'yes', at: min(n as number), pos: 0, of: 2, yn: true }));
    // five "yes" in a row, two of them about pain and the toilet: three count, and that is not a run
    expect(tapsFrom(h).length).toBe(3);
    expect(reliability(tapsFrom(h), min(4))).toBe(RELIABLE);
    const more = [...h, { q: 'Would you like the radio on?', label: 'yes', at: min(5), pos: 0, of: 2, yn: true }];
    const r = reliability(tapsFrom(more), min(5));
    expect(r.flags).toContain('yes-run');
    expect(markLessSure(more, r, min(5)).map((x) => !!(x as { lessSure?: boolean }).lessSure)).toEqual([true, false, false, true, true, true]);
  });
  it('pain -> where -> how bad, and three quick "yes" before it, is an ordinary flow: nothing is said', () => {
    expect(MIN_SPAN_MS).toBe(120000); expect(MIN_CARDS).toBe(5);
    // four "yes" in 30 seconds, four cards in all: too fast and too few to say anything
    expect(reliability([sec(0), sec(10), sec(20), sec(30)], T0 + 30000)).toBe(RELIABLE);
    // the same four over two minutes are a run
    expect(reliability([sec(0), sec(40), sec(80), sec(120)], T0 + 120000).flags).toContain('yes-run');
    // and so are five cards, however fast
    expect(reliability([sec(0), sec(10), sec(20), sec(30), sec(40)], T0 + 40000).flags).toContain('yes-run');
  });
  it('the line is the headline and one sentence; the rest is under "More"', () => {
    const html = guardBlock({ name: 'Frank', flags: ['yes-run'] });
    expect(html).toMatch(/<b>Frank may be tired\. Try again later, or check with a different question\.<\/b><small>These answers are marked &quot;less sure&quot; in the diary\.<\/small><details class="guard-more"><summary>More<\/summary>/);
    expect(html.slice(html.indexOf('<details'))).toContain('Answers about pain, the body, feelings, the toilet or a need are never marked: take them as said.');
  });
});

describe('what follows', () => {
  it('the answers of the run are marked "less sure", the ones before it are not, and none is removed', () => {
    const h = [{ label: 'tea', at: min(-60), pos: 0, of: 2 }, ...[0, 1, 2, 3].map((n) => ({ label: 'yes', at: min(n), pos: 0, of: 2, yn: true }))];
    const r = reliability(tapsFrom(h), min(3));
    const marked = markLessSure(h, r, min(3));
    expect(marked.map((x) => !!(x as { lessSure?: boolean }).lessSure)).toEqual([false, true, true, true, true]);
    expect(marked.length).toBe(h.length);
    expect(markLessSure(h, RELIABLE, min(3))).toBe(h);
  });
  it('an answer kept before the guard existed (no place recorded) is simply not read', () => {
    expect(tapsFrom([{ label: 'yes', at: 1 }, { label: 'yes', at: 2, pos: 0, of: 2, yn: true }])).toEqual([{ at: 2, yn: true, yes: true, pos: 0, of: 2 }]);
  });
  it('the next either-or in a different order: every choice once, none where it stood', () => {
    expect(reorder(['tea', 'coffee'])).toEqual(['coffee', 'tea']);
    expect(reorder(['water', 'juice', 'milk'])).toEqual(['juice', 'milk', 'water']);
    expect(reorder(['only'])).toEqual(['only']);
    for (const xs of [['a', 'b'], ['a', 'b', 'c']]) { const out = reorder(xs); expect([...out].sort()).toEqual([...xs].sort()); xs.forEach((x, i) => expect(out[i]).not.toBe(x)); }
  });
});

describe('never on the person\'s screen, never in a request', () => {
  const G = COPY.simple.guard;
  it('the line is for the carer: gentle, no "wrong", no score', () => {
    const html = guardBlock({ name: 'Frank', flags: ['yes-run', 'same-position'] });
    expect(html).toContain('Frank may be tired. Try again later, or check with a different question.');
    expect(guardBlock({ name: '', flags: ['yes-run'] })).toContain('They may be tired.');
    expect(guardBlock({ name: 'Frank', flags: [] })).toBe('');
    expect(`${G.line('x')} ${G.yes} ${G.place} ${G.marked}`).not.toMatch(/wrong|unreliable|fail|score|\d+ ?%|confus/i);
  });
  it('the person\'s screens are drawn from a model that has no field for it, and hold none of its words', () => {
    const card = needsCard();
    const pic = () => '';
    const screens = [
      personSimple({ card, busy: false, less: false, picked: null, confirmed: false, recap: false, answers: [], pic, waitPic: '', full: true }),
      personSimple({ card, busy: false, less: false, picked: card.choices[0], confirmed: false, recap: false, answers: [], pic, waitPic: '', full: true }),
      personSimple({ card, busy: false, less: false, picked: card.choices[0], confirmed: true, recap: false, answers: [], pic, waitPic: '', full: true }),
      personSimple({ card, busy: false, less: false, picked: null, confirmed: false, recap: true, answers: [{ topic: 'drink', label: 'tea' }], pic, waitPic: '', full: true }),
    ].join(' ');
    expect(screens).not.toMatch(/tired\. Try|less sure|diary|same place|may be tired/i);
    const src = readFileSync(join(ROOT, 'web/src/simple.ts'), 'utf8');
    const person = src.slice(src.indexOf('export function personSimple'), src.indexOf('// ---------------------------------------------------------------- "Today in short"'));
    expect(person).not.toMatch(/guard|lessSure|diary|insight/i);
  });
  it('the carer\'s screens show it when it is handed in, and not otherwise', () => {
    expect(typeof cardScreen).toBe('function');
    expect(typeof answeredScreen).toBe('function');
  });
  it('the file imports nothing', () => {
    expect(readFileSync(join(ROOT, 'core/reliability.ts'), 'utf8')).not.toMatch(/^\s*import\s/m);
  });
});
