// The Frank week fixture (tests/fixtures/frank-week.json) put on real dates: Monday 16 Nov 2026 to Sunday 22 Nov, and
// "now" is that Sunday at 12:00, by this machine's clock (as the app reads it).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DiaryEntry } from '../../core/diary';
import type { Answered } from '../../core/history';
import type { HealthNotes } from '../../core/insights';
import type { Profile } from '../../core/types';

interface Row { d: number; t: string; kind: 'log' | 'answer' | 'need'; log?: DiaryEntry['log']; q?: string; label: string; topic?: DiaryEntry['topic']; pos?: number; of?: number; yn?: boolean; lessSure?: boolean }
export const WEEK = JSON.parse(readFileSync(join(__dirname, '..', 'fixtures', 'frank-week.json'), 'utf8')) as {
  profile: Profile; health: HealthNotes; entries: Row[];
  expect: { week: string[]; fewDrinksDay: number; fewDrinks: number; sweets: number; lessSure: number; lessSureDay: number };
};
export const MONDAY = 16;
export const when = (d: number, t: string) => { const [h, m] = t.split(':').map(Number); return new Date(2026, 10, MONDAY + d, h, m).getTime(); };
export const NOW = when(6, '12:00');
const LOG_TOPIC = { drank: 'food', ate: 'food', toilet: 'body', slept: 'rest', pain: 'body' } as const;

/** The week as diary entries. `withMarks: false` leaves the "less sure" marks out, for the test that the guard sets them itself. */
export function weekDiary(withMarks = true): DiaryEntry[] {
  return WEEK.entries.map((r, i) => ({ id: `w${i}`, at: when(r.d, r.t), kind: r.kind, ...(r.log ? { log: r.log } : {}), ...(r.q ? { q: r.q } : {}), label: r.label, topic: r.topic ?? LOG_TOPIC[r.log!], ...(withMarks && r.lessSure ? { lessSure: true } : {}) }));
}
/** The week's answers as the history keeps them, with where each choice stood. */
export function weekHistory(): Answered[] {
  return WEEK.entries.filter((r) => r.kind === 'answer').map((r) => ({ q: r.q!, topic: '', label: r.label, at: when(r.d, r.t), pos: r.pos, of: r.of, yn: r.yn }));
}
