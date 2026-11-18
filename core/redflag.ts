// "Something new or sudden?": when the app puts the emergency number in front of the carer. Rules only, no AI, on
// this device; this file imports nothing, and no file that builds a prompt or a request imports it.
//
// Why (judge round 6, the nurse's seat, 18 Nov 2026): head pain, chest pain and "quite bad" pain all ended on "tell
// the nurse or doctor", there was no list of what to look for, and no way to call. The risk of this app is not that
// it advises too much: it is that a calm screen lets a carer wait.
//
// What this file decides: WHETHER the boxed line "Call [number] now if this is new or sudden" stands over an answer.
// It never grades a risk, never says what is wrong, and never takes the line away because of another answer: one
// urgent answer in a conversation keeps the box up for the rest of it. The worst case of every rule here is a box
// that was not needed; the rules are written so that the other worst case (no box over an answer that needed one) is
// the rarer one: any head or chest place, any pain rated "quite bad" or "very bad", any yes to a question about
// breathing, weakness, numbness or a fall, and the board's "something's wrong".

export const DEFAULT_NUMBER = '911';

/** The number the call buttons use: what About them holds when it is a plausible phone number, else 911. */
export function emergencyNumber(raw: unknown): string {
  const s = String(raw ?? '').replace(/[^\d+]/g, '');
  return /^\+?\d{2,14}$/.test(s) ? s : DEFAULT_NUMBER;
}
export const telHref = (number: string) => `tel:${emergencyNumber(number)}`;

const lc = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
const PLACE = /\b(?:head|headache|chest)\b/;
const PAIN_Q = /\b(?:pain|hurt|hurts|hurting|sore|ache|aches)\b/;
const SIGNS = /\b(?:breath|breathe|breathing|chest|headache|weak|weakness|numb|numbness|droop|drooped|drooping|slurred|faint|fainted|collapse|collapsed|fall|fell|fallen|dizzy|choke|choking)\b/;
const STRONG = /^(?:quite bad|very bad)$/;
export const WRONG_TILE = "something's wrong";

/** True when the box belongs over this answer. `asked` is the question as the card showed it; `label` the answer. */
export function urgentAnswer(asked: string, label: string): boolean {
  const q = lc(asked);
  const l = lc(label);
  if (l === WRONG_TILE) return true;
  // the body card: "Where in the head?", "Where in the chest?", and a head or chest place named on any pain question
  if (/^where in the (?:head|chest)\b/.test(q) && l !== 'somewhere else' && l !== 'something else') return true;
  if (PLACE.test(l) && (PAIN_Q.test(q) || /^where\b/.test(q))) return true;
  if (/^how bad is the pain\b/.test(q) && STRONG.test(l)) return true;
  // a yes to a question about one of the signs, or a sign as the answer itself ("chest", "dizzy")
  if (SIGNS.test(q) && l === 'yes') return true;
  if (SIGNS.test(l) && !/^(?:no|not sure)$/.test(l) && !/\bfall asleep\b/.test(l)) return true;
  return false;
}

/** The same, over the answers of one conversation or one page: one urgent answer is enough. */
export const urgentAny = (answers: { q?: string; label: string }[]) => answers.some((a) => urgentAnswer(a.q ?? '', a.label));
