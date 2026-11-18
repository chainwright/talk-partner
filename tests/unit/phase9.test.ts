// Phase 9 (18 Nov 2026), the fixes of judge round 8. Every new or changed line is walked on its worst case: could it
// make a tired carer dismiss pain or a need?
import { describe, expect, it } from 'vitest';
import { COPY } from '../../core/copy';
import { LATER_LABEL, answerEntry, diaryText, laterEntry, logEntry, tags, type DiaryEntry } from '../../core/diary';
import { LATER_MS, addLater, cleanLater, doneLater, laterCare, laterPain, shownLater } from '../../core/later';
import { sinceLines } from '../../core/since';
import { laterBlock } from '../../web/src/simple';
import { NOW, when } from './week';

const H = 3_600_000;
/** The HTML with the apostrophe put back (esc writes &#39;). */
const un = (h: string) => h.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');

describe('1. P0 health: a care question left for later (pain, the body, the toilet, a drink, feelings)', () => {
  it('knows a care question by its topic or its words; "tea or coffee?" is not one', () => {
    for (const q of ['Are you in pain?', 'Does it hurt?', 'Do you need the toilet?', 'Would you like something to drink?', 'Are you thirsty?', 'How are you feeling?', 'Is something wrong?']) expect(laterCare(q), q).toBe(true);
    expect(laterCare('Shall we go out?', 'body')).toBe(true);
    for (const q of ['Would you like tea or coffee?', 'Shall we watch the football?', 'Do you want to call Beth?']) expect(laterCare(q), q).toBe(false);
    expect(laterPain('Are you in pain?')).toBe(true);
    expect(laterPain('Do you need the toilet?')).toBe(false);
  });
  it('worst case: pain left for later 30 hours ago is still on Home, pinned first, with the "don\'t wait" line', () => {
    let xs = addLater([], 'Are you in pain?', NOW - 30 * H);
    xs = addLater(xs, 'Would you like tea or coffee?', NOW - 60_000);
    xs = addLater(xs, 'Shall we go out?', NOW - 2 * 60_000);
    const shown = shownLater(xs, NOW);
    expect(shown.map((x) => x.q)).toEqual(['Are you in pain?', 'Would you like tea or coffee?', 'Shall we go out?']);
    expect(shown[0]).toMatchObject({ care: true, pain: true });
    const html = un(laterBlock(shown.map((x, i) => ({ q: x.q, time: '14:37', i, care: !!x.care, pain: !!x.pain }))));
    expect(html).toContain("If the pain is new or strong, don't wait: call the nurse or doctor.");
    expect((html.match(/later-pain/g) ?? []).length).toBe(1);
    expect(html).toContain(COPY.simple.later.careNote);
    // a week on, still there; an ordinary question of the same age is gone
    const week = addLater(addLater([], 'Do you need the toilet?', NOW - 7 * 24 * H), 'Shall we go out?', NOW - 7 * 24 * H);
    expect(shownLater(week, NOW).map((x) => x.q)).toEqual(['Do you need the toilet?']);
  });
  it('worst case: "Done" then "Not yet" keeps the pain question; only "Yes, I found out" takes it off', () => {
    const xs = addLater([], 'Are you in pain?', NOW - 30 * H);
    const pain = xs[0];
    expect(doneLater(xs, pain, false)).toEqual(xs);
    expect(shownLater(doneLater(xs, pain, false), NOW).map((x) => x.q)).toEqual(['Are you in pain?']);
    expect(doneLater(xs, pain, true)).toEqual([]);
    // "Done" asks first: the block shows "Did you find out?" with Yes and Not yet, and no second "Done"
    const asking = un(laterBlock([{ q: pain.q, time: '14:37', i: 0, care: true, pain: true, asking: true }]));
    expect(asking).toContain('Did you find out?');
    expect(asking).toContain('data-act="later-found"');
    expect(asking).toContain('data-act="later-notyet"');
    expect(asking).not.toContain('data-act="later-done"');
    expect(asking).toContain("don't wait");
  });
  it('other questions keep the phase 8 behaviour: the newest two of a day, "Done" at once', () => {
    let xs = addLater([], 'Would you like tea or coffee?', NOW - 3 * H);
    xs = addLater(xs, 'Shall we go out?', NOW - 2 * H);
    xs = addLater(xs, 'Shall we watch TV?', NOW - H);
    xs = addLater(xs, 'Old one?', NOW - LATER_MS - 1);
    expect(shownLater(xs, NOW).map((x) => x.q)).toEqual(['Shall we watch TV?', 'Shall we go out?']);
    expect(doneLater(xs, xs[xs.length - 1], false)).toHaveLength(xs.length - 1);
    const html = un(laterBlock([{ q: 'Shall we go out?', time: '14:37', i: 0 }]));
    expect(html).toContain(COPY.simple.later.note);
    expect(html).not.toContain("don't wait");
  });
  it('care questions are never pushed out by many ordinary ones, and survive a reload (by their words)', () => {
    let xs = addLater([], 'Are you in pain?', NOW - 50 * H);
    for (let i = 0; i < 20; i++) xs = addLater(xs, `Shall we do thing ${i}?`, NOW - (20 - i) * 60_000);
    expect(xs.some((x) => x.q === 'Are you in pain?')).toBe(true);
    const back = cleanLater(JSON.parse(JSON.stringify(xs)));
    expect(shownLater(back, NOW)[0]).toMatchObject({ q: 'Are you in pain?', care: true, pain: true });
    // a row stored by phase 8 (no flags) is known again as a care question
    expect(cleanLater([{ q: 'Do you need the toilet?', at: 1 }])).toEqual([{ q: 'Do you need the toilet?', at: 1, care: true }]);
  });
  it('is written to the diary as "left for later", counts as nothing, and the visit page names it', () => {
    const e = laterEntry('Are you in pain?', when(5, '14:37'), 'body');
    expect(e).toMatchObject({ kind: 'later', q: 'Are you in pain?', label: LATER_LABEL, topic: 'body' });
    expect(tags(e)).toEqual([]);
    expect(diaryText([e], { log: COPY.simple.diary.log, lessSure: 'less sure', need: 'Pointed to' })).toContain('14:37  Left for later: Are you in pain?');
    const diary: DiaryEntry[] = [logEntry('drank', when(4, '09:00')), e];
    const s = sinceLines(diary, when(0, '00:00'), NOW);
    const line = s.lines.find((l) => l.startsWith('Left for later'))!;
    expect(line).toBe('Left for later: "Are you in pain?" (Sat 21 Nov). Ask about it at the visit if it was not asked again.');
    expect(s.sources[s.lines.indexOf(line)].ids).toEqual([e.id]);
    // nothing left for later: no such line
    expect(sinceLines([logEntry('drank', when(4, '09:00')), answerEntry({ q: 'Tea?', label: 'tea', at: when(4, '10:00') })], when(0, '00:00'), NOW).lines.join(' ')).not.toContain('Left for later');
  });
});
