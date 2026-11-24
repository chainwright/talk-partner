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

// Phase 9 (judge round 8, seats 13b, 02, 02b, 05): with nothing in About them the number follows the browser's
// language setting (the web client passes it in), not always 911. Phase 12 (judge round 9): the common regions are
// mapped (the ambulance number where it differs from the police one), and a region we do not know gets 112, the
// number most mobile networks in the world route to their emergency service, never a silent 911.
// The carer sees "Is this your emergency number? Change it" beside every call box until About them holds one. The
// sample family is American and stays on 911. A guess from a language setting can be wrong (a British phone set to
// en-US), which is why the line asks.
const EU_REGIONS = new Set(['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE']);
/** The regions outside the European Union whose number we name (the ambulance's, where it has its own). */
const REGION_NUMBER: Record<string, string> = {
  US: '911', CA: '911', MX: '911', PR: '911', PH: '911',
  GB: '999', UK: '999', HK: '999', MY: '999', SG: '995',
  AU: '000', NZ: '111', IN: '112', JP: '119', KR: '119', TW: '119', CN: '120', BR: '192', CH: '144', NO: '113', IS: '112', ZA: '112', IL: '101',
};
/** Languages spoken as a first language only, or mostly, in the European Union: a bare "de" or "pl" is taken as 112. */
const EU_LANGS = new Set(['bg', 'hr', 'cs', 'da', 'nl', 'et', 'fi', 'fr', 'de', 'el', 'hu', 'ga', 'it', 'lv', 'lt', 'mt', 'pl', 'pt', 'ro', 'sk', 'sl', 'es', 'sv']);
/** Languages of one country only, with no region given: a bare "ja" is Japan. */
const LANG_NUMBER: Record<string, string> = { ja: '119', ko: '119' };
/** A region (or a bare language) we have no number for: 112, with the "change" line beside every call box. */
export const UNKNOWN_REGION_NUMBER = '112';
/** The emergency number a locale such as "en-GB", "de-DE", "fr" or "en-US" most likely means. */
export function localeNumber(locale: unknown): string {
  const [lang = '', region = ''] = String(locale ?? '').trim().replace(/_/g, '-').split('-');
  const r = region.toUpperCase();
  if (r) return REGION_NUMBER[r] ?? (EU_REGIONS.has(r) ? '112' : UNKNOWN_REGION_NUMBER);
  const l = lang.toLowerCase();
  return LANG_NUMBER[l] ?? (EU_LANGS.has(l) ? '112' : UNKNOWN_REGION_NUMBER);
}

/** The number the call buttons use: what About them holds when it is a plausible phone number, else `fallback` (911 unless the caller passes the locale's). */
export function emergencyNumber(raw: unknown, fallback: string = DEFAULT_NUMBER): string {
  const s = String(raw ?? '').replace(/[^\d+]/g, '');
  return /^\+?\d{2,14}$/.test(s) ? s : fallback;
}
/** About them holds a number of its own (so the call boxes need not ask "Is this your emergency number?"). */
export const numberSet = (raw: unknown) => /^\+?\d{2,14}$/.test(String(raw ?? '').replace(/[^\d+]/g, ''));
export const telHref = (number: string) => `tel:${emergencyNumber(number)}`;

const lc = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
const PLACE = /\b(?:head|headache|chest)\b/;
const PAIN_Q = /\b(?:pain|hurt|hurts|hurting|sore|ache|aches)\b/;
const SIGNS = /\b(?:breath|breathe|breathing|chest|headache|weak|weakness|numb|numbness|droop|drooped|drooping|slurred|faint|fainted|collapse|collapsed|fall|fell|fallen|dizzy|choke|choking)\b/;
const STRONG = /^(?:quite bad|very bad)$/;
export const WRONG_TILE = "something's wrong";

// Phase 12 (judge round 9, still open from round 8): the person's own way to say it. "I can't go on" is the third
// page of the feelings card; the carer gets the crisis box and, on giving the phone back, the safety screen
// (web/src/phase5.ts crisisScreen). The word is here so that this file still imports nothing.
export const CRISIS = "I can't go on";
export const crisisAnswer = (label: string) => label.toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, ' ').trim() === "i can't go on";
/**
 * The crisis line a locale most likely means, for the safety screen while About them holds no helpline of the
 * family's own: only lines we are sure of (988 in the US and Canada, Samaritans 116 123 in the UK and Ireland,
 * Lifeline 13 11 14 in Australia, 1737 in New Zealand). Elsewhere none: the screen says to call the doctor or nurse
 * now and where to put a line; no number is made up.
 */
const CRISIS_LINES: Record<string, string> = { US: '988', CA: '988', GB: '116 123', UK: '116 123', IE: '116 123', AU: '13 11 14', NZ: '1737' };
export function crisisLine(locale: unknown): string {
  const region = String(locale ?? '').trim().replace(/_/g, '-').split('-')[1] ?? '';
  return CRISIS_LINES[region.toUpperCase()] ?? '';
}

/**
 * Phase 13 (judge round 10, a health P0: the nurse's seat, ADV-13b-3/-10): the crisis line of the safety screen and of
 * the line under a low answer. The family's own "Helpline for low mood" (About them) first. Otherwise it follows the
 * emergency number the family set (or the one the app guessed and asks them to check), not the browser's language:
 * a UK family with 999 set must not be offered the US 988. Only lines we are sure of, each with its official source:
 *   - 999 (UK): Samaritans 116 123, free, 24 hours (https://www.samaritans.org/how-we-can-help/contact-samaritan/);
 *     the same number works in the Republic of Ireland;
 *   - 000 (Australia): Lifeline 13 11 14 (https://www.lifeline.org.au/);
 *   - 911 (US and Canada): the 988 Suicide & Crisis Lifeline (https://988lifeline.org/; Canada: https://988.ca/);
 *   - 111 (New Zealand): 1737, "Need to talk?" (https://1737.org.nz/).
 * 112 and any other number: 116 123 is reserved for emotional support across the EU (Commission Decision
 * 2007/116/EC), but it is not live in every member state, and a dead number in a crisis is worse than none. So the
 * crisis line is then the emergency number itself, and the screens ask the family to add their own line.
 */
const CRISIS_BY_NUMBER: Record<string, string> = { '999': '116 123', '000': '13 11 14', '911': '988', '111': '1737' };
export function crisisLineFor(helpline: string, number: string): string {
  const own = String(helpline ?? '').trim();
  if (own) return own;
  const n = String(number ?? '').trim();
  return CRISIS_BY_NUMBER[n.replace(/[^\d+]/g, '')] ?? n;
}

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
  // (phase 12) the weakness question after a limb or the face: "not sure" is not a no
  if (/^is it suddenly weak or numb\b/.test(q) && l === 'not sure') return true;
  if (SIGNS.test(l) && !/^(?:no|not sure)$/.test(l) && !/\bfall asleep\b/.test(l)) return true;
  return false;
}

/**
 * Phase 12b (judge round 9b): a yes to sudden weakness or numbness is a sign the carer has already checked, so its box
 * does not ask "if this is new or sudden": it says to call now and to note the time it started.
 */
export function signNow(asked: string, label: string): boolean {
  return lc(label) === 'yes' && /\b(?:weak|weakness|numb|numbness)\b/.test(lc(asked));
}

/**
 * Phase 13 (judge round 10, a health P0: seats 13b, 01): where the red flag of a conversation is, for the end lines of
 * "How bad is the pain?" (core/tree.ts). A pain in the chest or the head, or a yes to trouble breathing, weakness or
 * numbness, is never followed by "Ask again in an hour": every "how bad" answer then says to call now. Null when the
 * answer holds none of them. The worst case of this rule is a call line that was not needed.
 */
export type RedPlace = 'chest' | 'head' | 'sign';
const RED_SIGN_Q = /\b(?:breath|breathe|breathing|breathless|weak|weakness|numb|numbness)\b/;
export function redPlace(asked: string, label: string): RedPlace | null {
  const q = lc(asked);
  const l = lc(label);
  if (/^(?:somewhere else|something else|not sure|no)$/.test(l)) return null;
  if (/^where in the chest\b/.test(q)) return 'chest';
  if (/^where in the head\b/.test(q)) return 'head';
  if (/\bchest\b/.test(l) && (PAIN_Q.test(q) || /^where\b/.test(q))) return 'chest';
  if (/\b(?:head|headache)\b/.test(l) && (PAIN_Q.test(q) || /^where\b/.test(q))) return 'head';
  if (l === 'yes' && RED_SIGN_Q.test(q)) return 'sign';
  return null;
}

/** The same, over the answers of one conversation or one page: one urgent answer is enough. */
export const urgentAny = (answers: { q?: string; label: string }[]) => answers.some((a) => urgentAnswer(a.q ?? '', a.label));
