// The Miller family's week (design/PERSONA_SCENARIO.md, tests/fixtures/frank-week.json) through the guard, the diary
// and the insights: Thursday's sweet choices with diabetes noted are worth mentioning to the doctor or nurse;
// Wednesday's two drinks are said with their base; Friday evening's "yes" to everything is marked "less sure".
import { describe, expect, it } from 'vitest';
import { COPY } from '../../core/copy';
import { byDay, dayText, events, inSpan, markDiary } from '../../core/diary';
import { NO_HEALTH, insights } from '../../core/insights';
import { markLessSure, reliability, tapsFrom } from '../../core/reliability';
import { MONDAY, NOW, WEEK, weekDiary, weekHistory, when } from './week';

describe('Frank\'s week', () => {
  it('the fixture is a week: Monday to Sunday, entries on every day', () => {
    expect(new Date(2026, 10, MONDAY).getDay()).toBe(1);
    expect(byDay(inSpan(weekDiary(), 'week', NOW)).length).toBe(7);
  });
  it('Friday evening: the guard marks exactly the answers the fixture says, by itself, as each answer comes in', () => {
    let history = weekHistory();
    let diary = weekDiary(false);
    const flagged: string[] = [];
    // each answer in turn, as the app does it on a confirmed "yes"
    for (const a of weekHistory()) {
      const r = reliability(tapsFrom(history.filter((h) => h.at <= a.at)), a.at);
      if (r.flags.length && !flagged.length) flagged.push(dayText(a.at), ...r.flags);
      history = markLessSure(history, r, a.at);
      diary = markDiary(diary, r.since, a.at);
    }
    expect(flagged).toEqual(['Fri 20 Nov', 'yes-run', 'same-position']);
    const want = WEEK.entries.map((r) => !!r.lessSure);
    expect(diary.map((e) => !!e.lessSure)).toEqual(want);
    expect(want.filter(Boolean).length).toBe(WEEK.expect.lessSure);
    expect(history.filter((h) => h.lessSure).every((h) => dayText(h.at) === 'Fri 20 Nov')).toBe(true);
    expect(diary).toEqual(weekDiary(true));
  });
  it('the week\'s lines, in order: sweets (with diabetes noted), Wednesday\'s drinks, Friday\'s "less sure"', () => {
    const xs = insights(weekDiary(), WEEK.health, 'week', NOW);
    expect(xs.map((x) => x.id)).toEqual(WEEK.expect.week);
    expect(xs[0]).toEqual({ id: 'sweets', level: 'mention', text: 'Something sweet was chosen 3 times in the last 7 days.', noted: 'Diabetes is noted here.', base: 'Chosen 3 times in 7 days. Only what was entered here.' });
    expect(COPY.simple.insights.level[xs[0].level]).toBe('Worth mentioning to the doctor or nurse');
    expect(xs[1]).toEqual({ id: 'few-drinks', level: 'mention', text: 'Few drinks were entered on Wed 18 Nov: 2.', noted: '', base: 'Counted that day: 2. Every "Drank" tap counts, and every drink chosen on a card (tea, coffee, water, juice, milk, or yes to "something to drink"); a card and a tap within 20 minutes count once. Only what was entered here.' });
    expect(xs[2].text.startsWith('5 answers on Fri 20 Nov are marked "less sure"')).toBe(true);
    expect(xs[2].base).toBe('5 of 25 answers in 7 days.');
  });
  it('the counts behind them', () => {
    const d = weekDiary();
    const day = (n: number) => d.filter((e) => e.at >= when(n, '00:00') && e.at < when(n + 1, '00:00'));
    expect([0, 1, 2, 3, 4, 5].map((n) => events(day(n), 'drink').length)).toEqual([5, 4, 2, 4, 3, 3]);
    expect(events(d, 'sweet').length).toBe(WEEK.expect.sweets);
    expect(new Set(events(d, 'pain').map((t) => dayText(t))).size).toBe(1);
  });
  it('without the diabetes note the sweets are not a line: the note is what makes them worth mentioning', () => {
    expect(insights(weekDiary(), NO_HEALTH, 'week', NOW).map((x) => x.id)).toEqual(['few-drinks', 'less-sure']);
  });
  it('no line names Frank, his family, or what he chose', () => {
    const text = insights(weekDiary(), WEEK.health, 'week', NOW).map((x) => `${x.text} ${x.noted} ${x.base}`).join(' ');
    for (const w of ['Frank', 'Carol', 'Beth', 'Tom', 'Bo', 'ginger', 'porridge', 'Patel']) expect(text).not.toContain(w);
  });
});
