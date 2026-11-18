// "Left for later" (phase 8, judge round 7: the carer's, the SLP's, the nurse's and the discovery seats). "Later" was
// the one soft dead end: the tile of "We're stuck" and the answer "later" to "Do you want to tell me now or later?"
// gave the carer a line to say ("Later, then. We will come back to it. And come back.") and kept nothing to come back
// to. Supported Conversation's tip is "give a time when you will return… Make sure you do return".
//
// Rules only, on this device (IndexedDB key 'later'): the question that was left, and when. No answer, no name beyond
// the question as it was asked. Home shows the newest two of the last 24 hours, each with "Ask it again" and "Done";
// nothing nags after a day. Never for the sample family. No file that builds a prompt or a request imports this one.

export interface Later { q: string; at: number }
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
/** One more left for later: the same question is kept once, with the newest time; the newest few are kept. */
export function addLater(xs: Later[], q: string, at: number): Later[] {
  return [...xs.filter((x) => x.q !== q), { q, at }].sort((a, b) => a.at - b.at).slice(-LATER_MAX * 3);
}
/** What Home shows: the newest two of the last 24 hours, newest first. */
export function shownLater(xs: Later[], now: number): Later[] {
  return xs.filter((x) => now - x.at < LATER_MS && x.at <= now).sort((a, b) => b.at - a.at).slice(0, LATER_MAX);
}
/** Whatever was stored, as the list: rows without a question or a time are dropped. */
export function cleanLater(raw: unknown): Later[] {
  return Array.isArray(raw) ? raw.filter((x): x is Later => !!x && typeof x.q === 'string' && x.q.trim() !== '' && typeof x.at === 'number' && Number.isFinite(x.at)).map((x) => ({ q: x.q.slice(0, 300), at: x.at })) : [];
}
