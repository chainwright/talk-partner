// "Left for later" (phase 8, judge round 7: the carer's, the SLP's, the nurse's and the discovery seats). "Later" was
// the one soft dead end: the tile of "We're stuck" and the answer "later" to "Do you want to tell me now or later?"
// gave the carer a line to say ("Later, then. We will come back to it. And come back.") and kept nothing to come back
// to. Supported Conversation's tip is "give a time when you will return… Make sure you do return".
//
// Rules only, on this device (IndexedDB key 'later'): the question that was left, and when. No answer, no name beyond
// the question as it was asked. Home shows the newest two of the last 24 hours, each with "Ask it again" and "Done";
// nothing nags after a day. Never for the sample family. No file that builds a prompt or a request imports this one.
//
// Phase 9 (judge round 8, a health P0: seats 01f, 02, 12, 13, 13b, 05): a question about pain, the body, the toilet,
// a drink or feelings is not "tea or coffee". Such a "care" question left for later is pinned first on Home and never
// expires; its "Done" asks "Did you find out?" and "Not yet" keeps it; it is written to the diary (a "left for later"
// entry, core/diary.ts), so the visit page's "Since the last visit" names it (core/since.ts). Under a pain question
// the carer reads that new or strong pain does not wait. Other questions keep the phase 8 behaviour.

import { careAnswer } from './reliability';

export interface Later {
  q: string;
  at: number;
  /** Phase 9: a question about pain, the body, the toilet, a drink or feelings (`laterCare`): pinned, never expires. */
  care?: true;
  /** Phase 9: a question about pain (`laterPain`): the "don't wait" line stands under it. */
  pain?: true;
}
export const LATER_MAX = 2;
export const LATER_MS = 24 * 60 * 60 * 1000;

/** The questions that put a conversation off when the answer is "later" (an answer to "a wash now or later?" is an answer, not a deferral). */
const DEFER_Q = /^(?:do you want to tell me now or later|would you like to talk about how you feel now,? or later)\??$/i;

/**
 * The question to come back to, or null: the tile "later" of "We're stuck" (the question it was opened over), or
 * "later" to a question that asks whether to talk now or later (that question).
 */
export function laterOf(o: { asked: string; label: string; repair: boolean; before: string | null }): string | null {
  if (o.label.trim().toLowerCase() !== 'later') return null;
  if (o.repair) return o.before?.trim() || null;
  return DEFER_Q.test(o.asked.trim()) ? o.asked.trim() : null;
}
const PAIN_WORDS = /\b(?:pain|pains|painful|hurt|hurts|hurting|sore|ache|aches|aching|headache|headaches)\b/i;
// (a drink as a need: "Would you like something to drink?", "Are you thirsty?"; "tea or coffee?" is a preference, not a care question)
const DRINK_WORDS = /\b(?:drink|drinks|drinking|thirsty|water)\b/i;
/** Phase 9: a question about pain, the body, the toilet, a drink or feelings (by its topic where known, else by its words). */
export function laterCare(q: string, topic: string | null = null): boolean {
  return careAnswer(q, '', topic) || DRINK_WORDS.test(q);
}
/** Phase 9: a question about pain: the carer reads "If the pain is new or strong, don't wait…" under it. */
export function laterPain(q: string): boolean {
  return PAIN_WORDS.test(q);
}
const flagged = (q: string, at: number, topic: string | null): Later => ({ q, at, ...(laterCare(q, topic) ? { care: true as const } : {}), ...(laterPain(q) ? { pain: true as const } : {}) });

/**
 * One more left for later: the same question is kept once, with the newest time. Every care question is kept (they
 * never expire); of the others, the newest few.
 */
export function addLater(xs: Later[], q: string, at: number, topic: string | null = null): Later[] {
  const before = xs.find((x) => x.q === q);
  const x = flagged(q, at, topic);
  if (before?.care) x.care = true;
  const all = [...xs.filter((y) => y.q !== q), x].sort((a, b) => a.at - b.at);
  const others = all.filter((y) => !y.care).slice(-LATER_MAX * 3);
  return all.filter((y) => y.care || others.includes(y));
}
/** What Home shows: every care question first (newest first, whatever its age), then the newest two others of the last 24 hours. */
export function shownLater(xs: Later[], now: number): Later[] {
  const newest = (a: Later, b: Later) => b.at - a.at;
  const care = xs.filter((x) => x.care).sort(newest);
  const others = xs.filter((x) => !x.care && now - x.at < LATER_MS && x.at <= now).sort(newest).slice(0, LATER_MAX);
  return [...care, ...others];
}
/**
 * "Done" on Home. A care question asks "Did you find out?" first: only a yes (`foundOut`) takes it off; "Not yet"
 * keeps it as it was. Any other question goes at once.
 */
export function doneLater(xs: Later[], x: Later, foundOut: boolean): Later[] {
  if (x.care && !foundOut) return xs;
  return xs.filter((y) => y !== x);
}
/** Whatever was stored, as the list: rows without a question or a time are dropped; a care question is known again by its words. */
export function cleanLater(raw: unknown): Later[] {
  return Array.isArray(raw) ? raw.filter((x): x is Later => !!x && typeof x.q === 'string' && x.q.trim() !== '' && typeof x.at === 'number' && Number.isFinite(x.at)).map((x) => {
    const y = flagged(x.q.slice(0, 300), x.at, null);
    if (x.care === true) y.care = true;
    return y;
  }) : [];
}
