// The diary (core/diary.ts): entries from the carer's one-tap log, the confirmed answers and the needs board; today,
// week and month; the timeline by day; the topic filter; what an entry counts as; and the "less sure" marks.
import { describe, expect, it } from 'vitest';
import { DIARY_CAP, LOG_KINDS, SAME_EVENT_MS, addEntry, answerEntry, byDay, dayText, dayWord, diaryText, events, guessTopic, inSpan, logEntry, markDiary, needEntry, removeEntry, spanRange, tags, timeText, type DiaryEntry, type LogKind } from '../../core/diary';
import { COPY } from '../../core/copy';
import { TOPIC_BASE } from '../../core/topics';
import { NOW, WEEK, weekDiary, when } from './week';

const ans = (q: string, label: string, at: number, topic?: DiaryEntry['topic']) => answerEntry({ q, label, at }, topic);

describe('entries', () => {
  it('the one-tap log: five kinds, each with its time and its topic', () => {
    expect(LOG_KINDS).toEqual(['drank', 'ate', 'toilet', 'slept', 'pain', 'fall', 'tablets']);
    const e = logEntry('drank', when(0, '09:02'));
    expect(e).toMatchObject({ kind: 'log', log: 'drank', topic: 'food', at: when(0, '09:02') });
    expect(LOG_KINDS.map((k) => logEntry(k, 1).topic)).toEqual(['food', 'food', 'body', 'rest', 'body', 'body', 'body']);
    expect(Object.keys(COPY.simple.diary.log)).toEqual(LOG_KINDS);
  });
  it('an answer keeps its question, and its topic is the conversation\'s or is read from the words', () => {
    expect(ans('Would you like milk in it?', 'yes', 5, 'food').topic).toBe('food');
    expect(ans('Does your shoulder hurt?', 'yes', 5).topic).toBe('body');
    expect(ans('What is the capital of France?', 'Paris', 5).topic).toBe('other');
    for (const t of TOPIC_BASE) for (const q of t.questions.slice(0, 2)) expect([t.id, 'food', 'plans']).toContain(guessTopic(q));
  });
  it('a need from the board has its topic', () => {
    expect(needEntry('toilet', 1).topic).toBe('body');
    expect(needEntry('call someone', 1).topic).toBe('people');
    for (const l of COPY.needs.tiles) expect(needEntry(l, 1).topic).not.toBe('other');
  });
  it('added in order of time, capped, never an empty one; one can be taken out again (Undo)', () => {
    let d: DiaryEntry[] = [];
    d = addEntry(d, logEntry('ate', 50));
    d = addEntry(d, logEntry('drank', 10));
    expect(d.map((e) => e.at)).toEqual([10, 50]);
    expect(addEntry(d, { ...logEntry('ate', 60), label: ' ' })).toBe(d);
    expect(addEntry(d, logEntry('ate', 70), 2).map((e) => e.at)).toEqual([50, 70]);
    expect(removeEntry(d, d[0].id).length).toBe(1);
    expect(DIARY_CAP).toBeGreaterThanOrEqual(3000);
    expect(new Set([logEntry('ate', 5).id, logEntry('ate', 5).id]).size).toBe(2);
  });
});

describe('today, week, month', () => {
  const d = weekDiary();
  it('today is since midnight; the week is the last 7 calendar days with today; the month the last 30', () => {
    expect(spanRange('today', NOW)).toEqual({ from: when(6, '00:00'), to: NOW });
    expect(spanRange('week', NOW).from).toBe(when(0, '00:00'));
    expect(spanRange('month', NOW).from).toBe(when(-23, '00:00'));
    expect(inSpan(d, 'today', NOW).length).toBe(WEEK.entries.filter((r) => r.d === 6).length);
    expect(inSpan(d, 'week', NOW).length).toBe(WEEK.entries.length);
    const older = addEntry(d, logEntry('drank', when(-3, '10:00')));
    expect(inSpan(older, 'week', NOW).length).toBe(WEEK.entries.length);
    expect(inSpan(older, 'month', NOW).length).toBe(WEEK.entries.length + 1);
  });
  it('nothing from after now', () => {
    expect(inSpan(addEntry(d, logEntry('drank', NOW + 1000)), 'week', NOW).length).toBe(WEEK.entries.length);
  });
  it('the timeline: the newest day first, and inside a day the earliest first', () => {
    const days = byDay(inSpan(d, 'week', NOW));
    expect(days.length).toBe(7);
    expect(days.map((x) => dayText(x.day))).toEqual(['Sun 22 Nov', 'Sat 21 Nov', 'Fri 20 Nov', 'Thu 19 Nov', 'Wed 18 Nov', 'Tue 17 Nov', 'Mon 16 Nov']);
    for (const day of days) expect(day.entries.map((e) => e.at)).toEqual([...day.entries.map((e) => e.at)].sort((a, b) => a - b));
    expect(timeText(when(0, '09:02'))).toBe('09:02');
    expect(dayWord(days[0].day, NOW)).toBe('Today');
    expect(dayWord(days[1].day, NOW)).toBe('Yesterday');
    expect(dayWord(days[2].day, NOW)).toBe('');
  });
  it('the topic filter', () => {
    const body = inSpan(d, 'week', NOW, 'body');
    expect(body.length).toBeGreaterThan(0);
    expect(body.every((e) => e.topic === 'body')).toBe(true);
    expect(inSpan(d, 'week', NOW, 'all').length).toBe(WEEK.entries.length);
    expect(inSpan(d, 'today', NOW, 'people')).toEqual([]);
  });
});

describe('what an entry counts as', () => {
  it('a drink: named on a card, yes to "something to drink", logged, or pointed to on the board; "a hot drink" is a step on the way, not one', () => {
    expect(tags(ans('Would you like tea or coffee?', 'tea', 1, 'food'))).toEqual(['drink']);
    expect(tags(logEntry('drank', 1))).toEqual(['drink']);
    expect(tags(needEntry('drink', 1))).toEqual(['drink']);
    expect(tags(ans('Would you like something to drink?', 'yes', 1, 'food'))).toEqual(['drink']);
    expect(tags(ans('Would you like something to drink?', 'no', 1, 'food'))).toEqual([]);
    expect(tags(ans('Would you like a hot drink or a cold drink?', 'hot drink', 1, 'food'))).toEqual([]);
    expect(tags(ans('Would you like milk in it?', 'yes', 1, 'food'))).toEqual([]);
  });
  it('food and something sweet; "yes" to "Are you hungry?" is not a meal', () => {
    expect(tags(ans('Are you hungry?', 'yes', 1, 'food'))).toEqual([]);
    expect(tags(ans('Would you like a snack or a meal?', 'meal', 1, 'food'))).toEqual(['food']);
    expect(tags(ans('Would you like ginger biscuits or porridge?', 'ginger biscuits', 1, 'food'))).toEqual(['sweet', 'food']);
    expect(tags(ans('Would you like something sweet or something savoury?', 'something sweet', 1, 'food'))).toEqual(['sweet', 'food']);
    expect(tags(ans('Would you like a snack or a meal?', 'something else', 1, 'food'))).toEqual([]);
    expect(tags(logEntry('ate', 1))).toEqual(['food']);
  });
  it('pain, the toilet, tired, a bad night', () => {
    expect(tags(ans('Are you in pain?', 'yes', 1))).toEqual(['pain']);
    expect(tags(ans('Are you in pain?', 'no', 1))).toEqual([]);
    expect(tags(ans('Where does it hurt?', 'right shoulder', 1))).toEqual(['pain']);
    expect(tags(ans('How are you feeling today?', 'in pain', 1))).toEqual(['pain']);
    expect(tags(ans('How bad is the pain?', 'quite bad', 1))).toEqual(['pain', 'strong-pain']);
    expect(tags(ans('How bad is the pain?', 'a little', 1))).toEqual(['pain']);
    // (phase 5) the second step of the body card is a pain entry too, and the head and the chest are told apart
    expect(tags(ans('Where in the chest?', 'middle', 1))).toEqual(['pain', 'place-pain']);
    expect(tags(ans('Where in the legs?', 'your left knee', 1))).toEqual(['pain']);
    expect(tags(ans('Where in the head?', 'somewhere else', 1))).toEqual([]);
    expect(tags(ans('How are you feeling today?', 'sad', 1))).toEqual(['low-mood']);
    expect(tags(ans('Do you need the toilet?', 'yes', 1))).toEqual(['toilet']);
    expect(tags(ans('Are you tired?', 'yes', 1))).toEqual(['tired']);
    expect(tags(ans('How did you sleep?', 'bad', 1))).toEqual(['bad-sleep']);
    expect(tags(logEntry('pain', 1))).toEqual(['pain']);
    expect(tags(needEntry('too hot', 1))).toEqual([]);
  });
  it('"tea" on a card and "Drank" tapped a few minutes later are one drink', () => {
    const t = when(0, '09:00');
    expect(SAME_EVENT_MS).toBe(20 * 60000);
    expect(events([ans('Would you like tea or coffee?', 'tea', t, 'food'), logEntry('drank', t + 5 * 60000), logEntry('drank', t + 90 * 60000)], 'drink')).toEqual([t + 5 * 60000, t + 90 * 60000]);
  });
  it('every tap on the log counts: three "Drank" in the same minute are three drinks, as the timeline shows them', () => {
    const t = when(0, '08:10');
    expect(events([logEntry('drank', t), logEntry('drank', t), logEntry('drank', t + 20000)], 'drink').length).toBe(3);
    // a card and ONE tap are one drink; a second tap is a second drink
    expect(events([ans('Would you like tea or coffee?', 'tea', t, 'food'), logEntry('drank', t + 60000), logEntry('drank', t + 120000)], 'drink').length).toBe(2);
    // a tap logged just before the card is the same drink too
    expect(events([logEntry('drank', t - 60000), ans('Would you like tea or coffee?', 'tea', t, 'food')], 'drink').length).toBe(1);
    // the answers of one conversation are one drink: yes to "something to drink", then "tea"
    expect(events([ans('Would you like something to drink?', 'yes', t, 'food'), ans('Would you like tea or coffee?', 'tea', t + 60000, 'food')], 'drink').length).toBe(1);
    // two cards hours apart are two
    expect(events([ans('Would you like tea or coffee?', 'tea', t, 'food'), ans('Would you like water, juice or milk?', 'water', t + 3 * 3600000, 'food')], 'drink').length).toBe(2);
  });
});

describe('"less sure"', () => {
  it('answers of the run are marked; a log the carer tapped never is', () => {
    const t = when(4, '19:00');
    const d = [logEntry('drank', t - 1000), ans('Are you tired?', 'yes', t), logEntry('ate', t + 1000), ans('Are you hungry?', 'yes', t + 2000)];
    const m = markDiary(d, t, t + 5000);
    // (phase 8: a yes to "Are you hungry?" is a need and is taken as said: the guard leaves drink and food questions alone)
    expect(m.map((e) => !!e.lessSure)).toEqual([false, true, false, false]);
    // an answer about pain or the toilet is never marked, wherever it stands in the run
    const care = [ans('Are you in pain?', 'yes', t + 100), ans('Do you need the toilet?', 'yes', t + 200), ans('How are you feeling today?', 'in pain', t + 300), ans('Are you tired?', 'yes', t + 400)];
    expect(markDiary(care, t, t + 5000).map((e) => !!e.lessSure)).toEqual([false, false, false, true]);
    expect(markDiary(d, null, t)).toBe(d);
  });
  it('the text for a visit says it, with the time and the question, and holds no count and no advice', () => {
    const W = { log: COPY.simple.diary.log as Record<LogKind, string>, lessSure: COPY.simple.guard.lessSure, need: COPY.simple.diary.need };
    const text = diaryText(inSpan(weekDiary(), 'week', NOW), W);
    expect(text.startsWith('Mon 16 Nov\n  07:40  Would you like tea or coffee? tea')).toBe(true);
    expect(text).toContain('  19:00  Are you tired? yes (less sure)');
    expect(text).toContain('  10:30  Drank');
    expect(text).not.toMatch(/\bshould\b|worth|doctor/i);
  });
});
