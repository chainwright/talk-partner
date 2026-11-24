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
/**
 * Phase 18 (judge round 13, seats 13b and 01: a typed "Do you want to die?" answered "no", and a typed "I can't go on"
 * answered "good", dropped the crisis box): a crisis said in the carer's own words, the list core/ownwords.ts guards
 * with and the diary tags by. Here, so that this file still imports nothing and the diary can read it. The worst case
 * of a wrong false is a crisis treated as an everyday question, so the list errs on the side of a match.
 */
const CRISIS_WORDS = /\b(?:can'?t go on|cannot go on|can'?t carry on|want(?:s|ed)? to die|(?:wish|wishes|wished) (?:he|she|they|i|you) (?:was|were) dead|better off dead|better off without (?:me|you|him|her|them)|kill(?:ing)? (?:him|her|them|my|your)sel(?:f|ves)|suicid\w*|end(?:ing)? (?:it all|(?:his|her|their|my|your) li(?:fe|ves))|take (?:his|her|their|my|your) own li(?:fe|ves)|taking (?:his|her|their|my|your) own li(?:fe|ves)|harm(?:ing)? (?:him|her|them|my|your)sel(?:f|ves)|hurt(?:ing)? (?:him|her|them|my|your)sel(?:f|ves)|no point (?:in )?(?:living|going on|carrying on)|not worth living|(?:don'?t|do not|doesn'?t|does not) want to (?:live|be here)(?: any ?more)?|want to live any ?more|give up on (?:life|living|everything)|(?:too many|all (?:his|her|their|my|your)) (?:tablets|pills) on purpose|overdos\w*)\b/;
export const crisisWords = (s: string): boolean => CRISIS_WORDS.test(String(s ?? '').toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, ' ').trim());
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
  // (phase 18, judge round 13, the SLP's seat: chest, then "somewhere else", dropped the call line; any answer keeps it)
  if (/^where in the (?:head|chest)\b/.test(q)) return true;
  // (phase 18) the places where a heart pain can be felt: the upper stomach, the upper back, the jaw, a shoulder
  if (redPlace(q, l) === 'heart') return true;
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
export type RedPlace = 'chest' | 'head' | 'heart' | 'sign' | 'sign-check' | 'limb';
/**
 * Phase 18 (judge round 13, the nurse's and the SLP's seats): a pain in the upper stomach, the upper back (between the
 * shoulders), the jaw or a shoulder can be the heart. On a pain or "where" question, any amount then says to call now,
 * like the chest: never "Ask again in an hour". The worst case of this rule is a call that was not needed.
 */
const HEART_PLACE = /\b(?:upper (?:stomach|tummy|belly|abdomen|back)|top of (?:the |your |his |her )?(?:stomach|tummy)|jaw|jaws|shoulders?|between (?:the |your |his |her |my )?shoulders?|shoulder ?blades?)\b/;
/**
 * Phase 17 (judge round 12, seat 13b, ADV-02n-2's kin): which red flag of a conversation wins when a later answer brings
 * another one. 'limb' (a pain in an arm, a leg, a hand, the feet or the face, the weakness question not answered yet) is
 * the weakest: a later "no" or "not sure" to the weakness question ('sign-check') or any call-now flag replaces it.
 */
export const redRank = (r: RedPlace | null): number => (r === null ? 0 : r === 'limb' ? 1 : r === 'sign-check' ? 2 : 3);
/** Phase 18: the red flags whose "how bad" ends and call box say "whatever the amount", like the chest. */
export const chestLike = (r: RedPlace | null | undefined): boolean => r === 'chest' || r === 'heart';
const LIMB_PLACE = /\b(?:arm|arms|hand|hands|leg|legs|foot|feet|face)\b/;
const RED_SIGN_Q = /\b(?:breath|breathe|breathing|breathless|weak|weakness|numb|numbness)\b/;
export function redPlace(asked: string, label: string): RedPlace | null {
  const q = lc(asked);
  const l = lc(label);
  // (phase 15, judge round 11, the novice carer's seat: a "no" or "not sure" to sudden weakness or numbness is not a
  // clear no: a later "a little" pain must not end on "Ask again in an hour", it says to check the arms and the smile)
  if ((l === 'no' || l === 'not sure') && /\b(?:weak|weakness|numb|numbness)\b/.test(q)) return 'sign-check';
  // (phase 18, judge round 13: "Where in the chest?" then "somewhere else" lost the flag) the region itself is the flag
  if (/^where in the chest\b/.test(q)) return 'chest';
  if (/^where in the head\b/.test(q)) return 'head';
  // (phase 18) a yes to a pain in the upper stomach, the upper back, the jaw or a shoulder
  if ((l === 'yes' || l === 'not sure') && HEART_PLACE.test(q) && (PAIN_Q.test(q) || /\bache|aching|sore\b/.test(q))) return 'heart';
  if (/^(?:somewhere else|something else|not sure|no)$/.test(l)) return null;
  if (HEART_PLACE.test(l) && (PAIN_Q.test(q) || /^where\b/.test(q))) return 'heart';
  if (/\bchest\b/.test(l) && (PAIN_Q.test(q) || /^where\b/.test(q))) return 'chest';
  if (/\b(?:head|headache)\b/.test(l) && (PAIN_Q.test(q) || /^where\b/.test(q))) return 'head';
  if (l === 'yes' && RED_SIGN_Q.test(q)) return 'sign';
  // (phase 17) an arm, a leg, a hand, the feet or the face named as the place of a pain: the stroke check is owed, even
  // when the depth limit cuts the weakness question (core/tree.ts: "a little" then ends on the check, never "in an hour")
  if (LIMB_PLACE.test(l) && (PAIN_Q.test(q) || /^where\b/.test(q))) return 'limb';
  return null;
}

/** The same, over the answers of one conversation or one page: one urgent answer is enough. */
export const urgentAny = (answers: { q?: string; label: string }[]) => answers.some((a) => urgentAnswer(a.q ?? '', a.label));

/**
 * Phase 17 (judge round 12, a health P0: seats 13b, 01, 05): which health matter the carer's own words are about, so
 * that the own-words card ("Ask in your own words") never ends a health answer on a green tick or a bare "Ask another
 * question", and the notes for others lead with it. Pure word lists, no model. The worst case of a wrong null is a
 * health question treated as an everyday one, so every list errs on the side of a health match: one word is enough.
 *   - 'chest': the chest, tightness or pressure, breathing, the heart. Any answer but "no" says call now, whatever the
 *     amount, even if it has happened before ("Is your chest tight again?" must not read "if new or sudden").
 *   - 'heart' (phase 18): a pain, an ache or soreness in the upper stomach, the upper back, the jaw or a shoulder: like
 *     the chest, any answer but "no" says call now, whatever the amount.
 *   - 'stroke': the face, the smile, speech, sight, sudden weakness or numbness, an arm or a leg that feels wrong, new
 *     confusion or drowsiness, a fit.
 *   - 'fall': a fall.
 *   - 'unwell': "are you OK", "you look grey", pale, sweaty, sick, dizzy, faint, a fever, "not yourself".
 *   - 'sugar': diabetes, the blood sugar, insulin, a hypo, the blood pressure.
 *   - 'limb': a pain in an arm, a hand, a leg, a foot or the face: the stroke check is asked first.
 *   - 'pain': any other pain, hurt, ache or soreness.
 * Ordered by urgency: the first that matches is the answer.
 */
export type HealthKind = 'chest' | 'heart' | 'stroke' | 'fall' | 'unwell' | 'sugar' | 'limb' | 'pain';
const H_LC = (s: string) => s.toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim();
// "tight" and "pressure" that are not about the body: shoes, a lid, "no pressure", "sleep tight"
const NOT_BODY_TIGHT = /\b(?:(?:shoes?|socks?|boots?|slippers?|trousers|jeans|belt|collar|waist(?:band)?|ring|watch(?:strap)?|lid|jar|cap|bandage|sock) (?:is |are |feel |feels |too |a bit |very )*(?:too )?tight|tight (?:shoes?|socks?|trousers|jeans|belt|collar|lid|jar|squeeze)|sleep tight|hold (?:on )?tight|no pressure|under pressure|water pressure|tyre pressure|tire pressure|peer pressure|blood pressure)\b/g;
const H_CHEST = /\b(?:chest|chests|tight|tighter|tightness|pressure|squeez\w*|crushing|breath|breaths|breathe|breathing|breathless\w*|short of breath|wheez\w*|heart|hearts|heartbeat|palpitation\w*|angina|gasp\w*)\b/;
// a part of the body that, with an odd feeling, is a stroke sign; with a pain, the stroke check comes first
const H_LIMB = /\b(?:arm|arms|hand|hands|leg|legs|foot|feet|fingers?|toes?|wrist|wrists|elbow|elbows|knee|knees|ankle|ankles|shoulder|shoulders|face|facial|mouth|lip|lips|cheek|cheeks|eye|eyes|side)\b/;
const H_STROKE = /\b(?:smile|smiling|lopsided|droop\w*|weak|weaker|weakness|numb|numbness|tingl\w*|pins and needles|slur\w*|speech|talking funny|talk funny|speak (?:properly|clearly)|vision|blurr\w*|double vision|seeing double|blind|can'?t see|confus\w*|muddled|drowsy|won'?t wake|unresponsive|seizure|seizures|a fit|having a fit|fitting|stroke|strokes|paralys\w*|gibberish|talking nonsense|making no sense|dragg\w*|crooked|uneven|sagg\w*|balance|unsteady|wobbly|woozy|giddy|spinning)\b/;
// (phase 18, judge round 13, the nurse's seat: "Are your words worse than yesterday?" slipped the guard and got a green
// tick) a change in the words, the speech or the voice: worse, harder, gone, different, wrong, either way round
const H_SPEECH = /\b(?:words?|talk\w*|speak\w*|speech|voice)\b.{0,24}\b(?:worse|harder|gone|stopped|different|changed?|funny|strange|odd|wrong|jumbled|mixed up|slow(?:er)?)\b|\b(?:worse|harder|gone|different|changed?|lost|losing)\b.{0,16}\b(?:words?|speech|voice|talking|speaking)\b|\b(?:struggl\w*|trouble|difficult\w*) (?:to |with |in )?(?:speak\w*|talk\w*|getting (?:the |your |his |her )?words? out)\b.{0,20}\b(?:more|than usual|today|now|new|sudden\w*)\b|\bsudden\w* (?:can'?t|cannot|unable to) (?:speak|talk|say)\b|\bunable to (?:speak|talk)\b/;
const H_HEART = /\b(?:upper (?:stomach|tummy|belly|abdomen|back)|top of (?:the |your |his |her )?(?:stomach|tummy)|jaw|jaws|shoulders?|between (?:the |your |his |her |my )?shoulders?|shoulder ?blades?)\b/;
const H_LIMB_ODD = /\b(?:funny|different|odd|strange|weird|dead|heavy|lower|lift|raise|grip|can'?t move|cannot move|won'?t move|not working|useless|floppy|(?:what'?s|what is) (?:up|wrong) with|wrong with|happened to|ok|okay|alright|all right)\b/;
const H_FALL = /\b(?:fall|falls|fell|fallen|falling|tripped|trip over|slipped|slip over|did you slip|collapse\w*|on the floor)\b/;
const H_UNWELL = /\b(?:are you (?:ok|okay|alright|all right)|you (?:look|seem|seems|looks|feel) (?:grey|gray|pale|unwell|ill|poorly|off|strange|odd|clammy|sweaty|hot|flushed|different|funny|rough)|(?:look|looks|looking|seem|seems) (?:grey|gray|pale|unwell|ill|poorly|clammy|sweaty|flushed)|not (?:yourself|himself|herself|themselves|right|well)|(?:something|anything)(?:'s| is)? wrong|grey|gray|pale|clammy|sweat\w*|vomit\w*|sick|throw(?:ing)? up|nause\w*|unwell|poorly|ill|fever\w*|(?:a|your|his|her|their|high) temperature|shiver\w*|faint\w*|dizzy|dizziness|light-?headed|blackout|passed out|pass out|bleed\w*|blood|choke|choking|swallow\w*|cough\w*)\b/;
const H_SUGAR = /\b(?:diabet\w*|blood sugar|sugar levels?|insulin|hypo|hypos|glucose|blood pressure|bp)\b/;
// "sugar" on its own is a health matter, unless it goes into a drink or a food ("sugar in your tea", "milk and sugar")
const SUGAR_WORD = /\bsugar\b/;
const SUGAR_FOOD = /\b(?:sugar in (?:it|that|this|your|his|her|their|the|my)?\s*(?:tea|coffee|drink|cup|porridge|cereal|cake)?|milk and sugar|sugar and milk|sugar or (?:sweetener|honey|not)|any sugar|some sugar|one sugar|two sugars?|no sugar|sugar,? please|brown sugar|icing sugar|sugar on)\b/;
const H_PAIN = /\b(?:pain|pains|painful|hurt|hurts|hurting|sore|soreness|ache|aches|aching|achy|headache|headaches|tummy ache|stomach ache|cramp\w*|throb\w*)\b/;
const H_HEAD = /\b(?:head|headache|headaches)\b/;

export function healthOf(q: string): HealthKind | null {
  const s = H_LC(q);
  if (!s) return null;
  const body = s.replace(NOT_BODY_TIGHT, ' ');
  if (H_CHEST.test(body)) return 'chest';
  if (H_STROKE.test(s) || H_SPEECH.test(s) || (H_LIMB.test(s) && H_LIMB_ODD.test(s))) return 'stroke';
  if (H_HEART.test(s) && (H_PAIN.test(s) || /\b(?:hurt\w*|sore\w*|ach\w*|pain\w*)\b/.test(s))) return 'heart';
  if (H_FALL.test(s.replace(/\bfall(?:s|ing)? asleep\b/g, ''))) return 'fall';
  if (H_UNWELL.test(s)) return 'unwell';
  if (H_SUGAR.test(s) || (SUGAR_WORD.test(s) && !SUGAR_FOOD.test(s))) return 'sugar';
  if (H_LIMB.test(s) && H_PAIN.test(s)) return 'limb';
  if (H_PAIN.test(s) || H_HEAD.test(s)) return 'pain';
  return null;
}

/**
 * Phase 17: an answer to a health question that is a warning the next carer must read first (core/diary.ts, the tag
 * 'warning'): anything but "no" to a question about the chest or breathing, a stroke sign, a fall or the blood sugar;
 * any answer to "are you OK / you look grey" (a yes there does not take the look away). A pain keeps its own tags, and
 * the body card's places and the pain scale theirs ('place-pain', 'strong-pain').
 */
export function healthWarning(q: string, label: string): boolean {
  const h = healthOf(q);
  if (!h || h === 'pain' || h === 'limb' || /^(?:where\b|how bad\b)/.test(H_LC(q))) return false;
  const l = H_LC(label);
  if (/^(?:something else|someone else|somewhere else)$/.test(l)) return false;
  return h === 'unwell' ? true : l !== 'no';
}
