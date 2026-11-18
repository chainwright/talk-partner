// The answer-reliability guard. Rules only, no AI, on this device.
//
// Why: yes / no and pointing are not always reliable for a person with aphasia, most of all when they are tired
// ("yes" to everything; the same place on the screen every time). The diary and the insights count answers, so an
// unreliable run must not look like a fact (design/DISCOVERY_2026-11-17.md, risk 1).
//
// What is noticed, from the confirmed answers kept on this device (core/history.ts: `pos`, `of`, `yn`, `at`):
//   - "yes" to at least 4 of the last 5 yes / no cards, all within 10 minutes;
//   - the same place on the screen picked at least 4 times in a row, all within 10 minutes (the brief's rule has no
//     time limit; one is used here so that "tea, first on the card, every morning" is a preference and not a flag).
// What follows, on the carer's side only:
//   - the answers of that run are marked `lessSure` in the history and the diary;
//   - one gentle line for the carer ("They may be tired. Try again later, or check with a different question.");
//   - the next either-or cards put their choices in a different order (`reorder`). A yes / no card keeps its order
//     (yes first is a habit worth keeping): the line asks the carer to check with a different question instead.
// Never about pain, the toilet, help or a need (18 Nov, the second role-play: after "Are you in pain? Yes" the line
// said "may be tired", and a carer could have dismissed real pain). Such an answer (`careAnswer`) does not count
// toward a run, is never marked "less sure", and no line stands on its screen. And not in an ordinary fast flow: the
// guard speaks only when the run took at least 2 minutes, or at least 5 answers fall within those ten minutes.
// Nothing here is ever shown on the person's screen: no line, no mark, no count (tests/unit/reliability.test.ts).
// This file imports nothing; no file that builds a prompt or a request imports it.

/** One confirmed answer, as the guard reads it. */
export interface Tap {
  at: number;
  /** The card was a yes / no card, and the answer was "yes". */
  yn: boolean;
  yes: boolean;
  /** Where the choice stood among the answers (0 = first), and how many answers there were. */
  pos: number;
  of: number;
}

export const WINDOW_MS = 10 * 60 * 1000;
/** "Yes" to at least YES_MIN of the last YES_OF yes / no cards. */
export const YES_OF = 5;
export const YES_MIN = 4;
/** The same position this many times in a row. */
export const SAME_POS = 4;

/** The guard speaks only when the run took at least this long, or the window holds at least MIN_CARDS answers. */
export const MIN_SPAN_MS = 2 * 60 * 1000;
export const MIN_CARDS = 5;

/** An answer about pain, the toilet, help or a need: the guard never counts it, marks it or speaks on it. */
export function careAnswer(q: string, label = ''): boolean {
  return /\b(?:pain|hurt|hurts|hurting|sore|ache|aches|toilet|bathroom|loo|help|need|needs|emergency|unwell|sick|dizzy|breathe|breathing)\b/i.test(q) || /^(?:in pain|pain|toilet|help)$/i.test(label.trim());
}

export type Flag = 'yes-run' | 'same-position';
export interface Reliability {
  flags: Flag[];
  /** The moment of the first answer of the run: answers from then on are "less sure". Null when nothing is flagged. */
  since: number | null;
  /** The position that was picked every time, when that is what was noticed (for `reorder`). */
  pos: number | null;
}
export const RELIABLE: Reliability = { flags: [], since: null, pos: null };

/** The answers of the history that the guard can read (the ones that recorded where the choice stood). */
export function tapsFrom(history: { q?: string; label: string; at: number; pos?: number; of?: number; yn?: boolean }[]): Tap[] {
  return history
    .filter((h) => typeof h.pos === 'number' && typeof h.of === 'number' && !careAnswer(h.q ?? '', h.label))
    .map((h) => ({ at: h.at, yn: !!h.yn, yes: !!h.yn && h.label.trim().toLowerCase() === 'yes', pos: h.pos!, of: h.of! }))
    .sort((a, b) => a.at - b.at);
}

/** What the guard notices at `now` in the answers so far. Pure: the same answers and the same moment give the same result. */
export function reliability(taps: Tap[], now: number): Reliability {
  const recent = taps.filter((t) => t.at <= now && t.at > now - WINDOW_MS);
  const flags: Flag[] = [];
  let since: number | null = null;
  let pos: number | null = null;
  // "yes" to at least 4 of the last 5 yes / no cards
  // (not in an ordinary fast flow: the run took 2 minutes or more, or 5 answers or more are in the window)
  const slow = (first: number, last: number) => last - first >= MIN_SPAN_MS || recent.length >= MIN_CARDS;
  const yn = recent.filter((t) => t.yn).slice(-YES_OF);
  if (yn.filter((t) => t.yes).length >= YES_MIN && slow(yn[0].at, yn[yn.length - 1].at)) { flags.push('yes-run'); since = yn[0].at; }
  // the same place on the screen at least 4 times in a row (cards with one answer only cannot show it)
  const placed = recent.filter((t) => t.of >= 2);
  let run = 0;
  for (let i = placed.length - 1; i >= 0 && placed[i].pos === placed[placed.length - 1].pos; i--) run++;
  if (run >= SAME_POS && slow(placed[placed.length - run].at, placed[placed.length - 1].at)) {
    flags.push('same-position');
    pos = placed[placed.length - 1].pos;
    const first = placed[placed.length - run].at;
    since = since === null ? first : Math.min(since, first);
  }
  return flags.length ? { flags, since, pos } : RELIABLE;
}

/** A new list with every answer of the run marked "less sure". Nothing else is changed, and nothing is removed. */
export function markLessSure<T extends { at: number; lessSure?: boolean; q?: string; label?: string }>(xs: T[], r: Reliability, now: number): T[] {
  if (r.since === null) return xs;
  const since = r.since;
  return xs.map((x) => (x.at >= since && x.at <= now && !x.lessSure && !careAnswer(x.q ?? '', x.label ?? '') ? { ...x, lessSure: true } : x));
}

/**
 * The same answers in a different order, for the next either-or card while the guard is on: turned by one place, so
 * no answer stands where it stood (with two answers they swap). Every answer that came in goes out, once.
 */
export function reorder<T>(answers: T[]): T[] {
  return answers.length < 2 ? answers : [...answers.slice(1), answers[0]];
}
