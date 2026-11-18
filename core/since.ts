// "Since the last visit" (phase 5, 18 Nov 2026): on the doctor-visit page, under the person's own answers and
// visibly apart from them, what the family entered in the diary since a day the carer names: pain days, falls,
// days with no drink entered, low days, bad nights. And up to three questions for the doctor, picked by the carer
// from a fixed list (core/copy5.ts).
//
// Rules only: counts by day, each with its days, from the diary on this device. No model reads the diary or writes a
// line, and nothing is sent. A line says what was entered and never what it means; a gap is called a gap. The
// questions are fixed text: no model writes or picks one.
// This file imports the diary and the copy; no file that builds a prompt or a request imports it.

import { P5 } from './copy5';
import { byDay, dayStart, dayText, daysBefore, events, tags, type DiaryEntry } from './diary';

export const SINCE_DAYS = 30;
export const SINCE_MAX_DAYS = 120;
export const SINCE_QUESTIONS = 3;

/** The day to count from: the carer's own date when it is a day in the last 120, else 30 days back. */
export function sinceFrom(since: number | null | undefined, now: number): number {
  const lo = daysBefore(now, SINCE_MAX_DAYS);
  return typeof since === 'number' && since >= lo && since <= now ? dayStart(since) : daysBefore(now, SINCE_DAYS);
}
/** "2026-11-18" for a date field, by this device's clock, and back. */
export function isoDay(t: number): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function fromIsoDay(s: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const t = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime();
  return Number.isFinite(t) ? t : null;
}

const uniqueDays = (ts: number[]) => [...new Set(ts.map(dayStart))].sort((a, b) => a - b);
const named = (ds: number[], max = 5) => `${ds.slice(-max).map(dayText).join(', ')}${ds.length > max ? `, and ${ds.length - max} more` : ''}`;

export interface Since { from: number; to: number; lines: string[]; any: boolean; /** A strong pain, a pain in the head or the chest, or a fall with a blow to the head is among the entries. */ urgent: boolean }

/** The lines of "Since the last visit". Pure: the same diary, day and moment give the same lines. */
export function sinceLines(diary: DiaryEntry[], since: number | null | undefined, now: number): Since {
  const S = P5.since;
  const from = sinceFrom(since, now);
  const entries = diary.filter((e) => e.at >= from && e.at <= now).sort((a, b) => a.at - b.at);
  if (!entries.length) return { from, to: now, lines: [S.none], any: false, urgent: false };
  const tagged = (t: Parameters<typeof events>[1]) => entries.filter((e) => tags(e).includes(t));
  const pain = uniqueDays(events(entries, 'pain'));
  const hard = uniqueDays([...tagged('strong-pain'), ...tagged('place-pain')].map((e) => e.at));
  const falls = tagged('fall');
  const days = byDay(entries);
  const dry = days.filter((d) => d.day !== dayStart(now) && events(d.entries, 'drink').length === 0).length;
  const low = uniqueDays(tagged('low-mood').map((e) => e.at));
  const nights = uniqueDays(events(entries, 'bad-sleep'));
  const lines = [
    S.pain(pain.length, named(pain)),
    ...(hard.length ? [S.strong(named(hard))] : []),
    S.falls(falls.length, named(uniqueDays(falls.map((e) => e.at)))),
    S.drinks(dry, days.filter((d) => d.day !== dayStart(now)).length),
    S.mood(low.length, named(low)),
    S.sleep(nights.length, named(nights)),
  ];
  return { from, to: now, lines, any: true, urgent: hard.length > 0 || tagged('fall-head').length > 0 };
}

/** The carer's picks, as they may stand on the page: only questions of the fixed list, three at most, in the list's order. */
export function pickedQuestions(picked: unknown): string[] {
  const xs = Array.isArray(picked) ? picked : [];
  return P5.since.questions.filter((q) => xs.includes(q)).slice(0, SINCE_QUESTIONS);
}
/** A tap on a question: on, or off; a fourth is not taken. */
export function toggleQuestion(picked: string[], q: string): string[] {
  const now = pickedQuestions(picked);
  if (now.includes(q)) return now.filter((x) => x !== q);
  return now.length >= SINCE_QUESTIONS ? now : pickedQuestions([...now, q]);
}

/** The block as plain text, for "Copy as text" under the person's own answers. */
export function sinceText(s: Since, questions: string[], name: string): string {
  const S = P5.since;
  return [S.heading, S.sub(name), S.span(dayText(s.from), dayText(s.to)), ...s.lines, ...(questions.length ? ['', `${S.qPrinted}:`, ...questions.map((q) => `- ${q}`)] : []), '', S.note].join('\n');
}
