// The 11 build rules from the on-device validation (pre-period validation runs 1-10),
// ported from run_nano_v6.py / run_nano_v7.py and the run 8-10 notes. Pure functions, no DOM, no model.
//
//  1 splitQuestion        two-part questions are split in code
//  2 isAuxYesNo           aux-verb question with no "or" -> yes / no / not sure
//  3 orPair               "X or Y?" keeps exactly X and Y (+ escape); no "both" except body sides
//  4 body map             pain/body "where" -> fixed two-step body map; pain level -> none / a little / some / a lot
//  5 feelingSubtype       feeling questions get a fixed scale by subtype
//  6 (prompt)             the model only gives topic + kind + <=3 choices (see prompt.ts)
//  7 spokenLine           the spoken line is the partner's own question + the options, built in code
//  8 escapeFor            who -> someone else, where -> somewhere else, else something else
//  9 householdFilter      household members are excluded from call / visit / invite
// 10 timeScaleFilter      time choices stay on one scale
// 11 route                >=2 mood words / comparative echoed / duplicate head noun -> cloud
// plus overlapFilter      category next to its member, relation next to its named person

import { isOrdinaryOpener } from './strip';
import type { BodyRegion, FeelingSubtype, Person, Profile, RouteDecision } from './types';

const lc = (s: string) => s.toLowerCase();
const words = (s: string) => lc(s).match(/[a-z']+/g) ?? [];

/** "Carer asks: ...", "Kylie asks - ...", "From the nurse: ..." -> the question itself. */
const ROLE = '(?:carer|caregiver|nurse|therapist|speech therapist|physio|physiotherapist|doctor|gp|aide|support worker|home help|ot)';
const SPEAKER = [
  new RegExp(`^\\s*(?:from\\s+)?(?:the\\s+|your\\s+)?${ROLE}(?:\\s+(?:asks|asked|says|wants to know))?\\s*[:\\-–]\\s+`, 'i'),
  new RegExp(`^\\s*${ROLE}\\s+(?:asks|asked|wants to know)\\s+`, 'i'),
  /^\s*(?:From\s+)?[A-Z][\p{L}'-]+(?:\s+(?:asks|asked|says|wants to know))?\s*[:\-–]\s+/u,
  /^\s*[A-Z][\p{L}'-]+\s+(?:asks|wants to know)\s+/u,
];
export function stripSpeaker(q: string): string {
  const m = SPEAKER.map((re) => re.exec(q)).find(Boolean);
  if (!m) return q;
  const rest = q.slice(m[0].length).trim();
  return rest.split(/\s+/).length >= 2 ? rest : q;
}

export function normalizeQuestion(q: string): string {
  let s = stripSpeaker(q.replace(/\s+/g, ' ').trim());
  s = s.replace(/[.!]+$/, '').trim();
  if (!s) return '';
  if (!s.endsWith('?')) s += '?';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const QWORD = '(?:are|is|am|was|were|do|does|did|would|will|can|could|should|shall|have|has|had|what|where|who|when|which|how|why|if so)';

// ---------------------------------------------------------------- rule 1
/** Rule 1. Split two questions in one. Returns [first, second|null]. The first part is shown; "Next" shows the second. */
export function splitQuestion(q: string): [string, string | null] {
  const s = normalizeQuestion(q);
  const patterns: RegExp[] = [
    // "..., and if so, ..." / "..., and do you ..." (comma + and + a question start)
    new RegExp(`,\\s*and\\s+(?:then\\s+|also\\s+)?(?=${QWORD}\\b)`, 'i'),
    // two question marks: "Did you eat? What did you have?"
    /\?\s+(?=\w)/,
    // "... and are you ...?" without a comma: only when "and" is followed by aux + you, or a wh-word + aux
    /\s+and\s+(?=(?:are|do|did|would|will|can|could|should|have)\s+you\b|(?:what|where|who|when|which|how|why)\s+(?:do|did|would|will|is|are|was|should|shall)\b)/i,
    // simulation 16.11 (two questions not split): "... and should I turn the TV off?", "... and is your back still
    // sore?". After "and", any question start: an auxiliary and a pronoun subject, or a be / modal verb and a noun
    // subject ("is your back", "can Tyler"). "do / have + the ..." is left alone: "go and do the shopping" is one question.
    /\s+and\s+(?:then\s+|also\s+)?(?=(?:are|is|was|were|do|does|did|would|will|can|could|should|shall|have|has)\s+(?:you|I|we|it|they|he|she|there|that|this)\b|(?:are|is|was|were|would|will|can|could|should|shall)\s+(?:the|your|my|our|his|her|[A-Z][a-z]+)\b|(?:what|where|who|when|which|how|why)(?:'s\b|\s+(?:do|does|did|would|will|is|are|was|should|shall|can|could|about)\b))/,
  ];
  // "Do you want to go out today, and if so where?": the second question is one word. It is asked in full, with the
  // first question's own words ("Where do you want to go out today?"); set E, 16 Nov: the two stayed one yes / no card
  // and "where" was never asked.
  const cond = /^(.*\S)\s*,?\s+and\s+(?:if\s+so|if\s+you\s+do|if\s+yes)\s*,?\s*(where|when)(?:\s+to)?\s*\?\s*$/i.exec(s);
  if (cond && AUX_START.test(cond[1]) && !/\bor\b/i.test(cond[1]) && cond[1].split(' ').length >= 3) {
    const first = cond[1].replace(/[\s,?]+$/, '');
    return [`${first}?`, `${capitalize(lc(cond[2]))} ${first.charAt(0).toLowerCase()}${first.slice(1)}?`];
  }
  for (const re of patterns) {
    const m = re.exec(s);
    if (!m) continue;
    const first = s.slice(0, m.index).replace(/[\s,?]+$/, '');
    let second = s.slice(m.index + m[0].length).trim();
    second = second.replace(/^(?:if so|also|then|and)\s*,?\s*/i, '');
    if (first.split(' ').length >= 3 && second.split(' ').length >= 3) {
      return [first + '?', normalizeQuestion(capitalize(second))];
    }
  }
  return [s, null];
}

// ---------------------------------------------------------------- rule 2
const AUX_START = /^\s*(did|do|does|are|is|am|was|were|can|could|should|shall|will|would|have|has|had|may|might|must)\b/i;
/** §2.4: a subject-less offer is one proposal too: "You want coffee?", "Want kringle?", "Fancy a run?", "Up for bowls?", "Need the loo?", "You hungry?". */
const OFFER_START = /^\s*(?:you\s+)?(?:want|wanna|fancy|need|like|feel like|up for|ready for|hungry for|keen on)\b|^\s*you\s+(?:hungry|thirsty|cold|warm|tired|sleepy|comfy|comfortable|ok|okay|alright|all right|ready|sure)\b/i;
/** "Ma, you want coffee?": a leading address word or name followed by a comma is not part of the question's shape. */
const VOCATIVE = /^\s*(?:[A-Z][\p{L}'-]+|ma|mum|mom|mam|dad|pa|love|hen|pet|mate|dear|darling|hon|honey|sweetheart|duck|lovey|chuck|sweetie|luv),\s*/iu;
/** "…, Frank?", "…, hon?": the person being spoken to, at the end of the question. */
const VOCATIVE_END = /\s*,\s*(?!(?:Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day\b|(?:January|February|March|April|June|July|August|September|October|November|December)\b)(?:[A-Z][\p{L}'-]+|ma|mum|mom|mam|dad|pa|love|hen|pet|mate|dear|darling|hon|honey|sweetheart|duck|lovey|chuck|sweetie|luv)\s*\?\s*$/u;
/** The question without the address word at either end. */
export function stripAddress(q: string): string {
  return stripVocative(q).replace(VOCATIVE_END, '?');
}
/** The question without a leading "Ma, " / "Eileen, ": the shape checks below look at what comes after it. */
export function stripVocative(q: string): string {
  return q.replace(VOCATIVE, '');
}
/** Rule 2. An aux-verb question (or a subject-less offer) with no "or" becomes yes / no / not sure. */
export function isAuxYesNo(q: string): boolean {
  const s = stripVocative(q);
  const tag = TAG_Q.test(s.replace(/[’]/g, "'")) && !/^(?:what|where|who|whom|when|which|why|how)\b/i.test(s);
  return (AUX_START.test(s) || OFFER_START.test(s) || tag) && !/\bor\b/i.test(s);
}
/**
 * "You've taken your morning pills, haven't you?", "It's warm enough in here, isn't it?", "You're coming, right?":
 * a plain statement with a tag is one proposal, so yes / no (set D, 16 Nov: no card without a model). A statement
 * with "not" in it is turned round first (positiveForm), so here yes always means yes.
 */
const TAG_Q = /^(?:you|we|it|he|she|they|that|this|there|[A-Z][a-z]+|(?:the|your|my|our)\s+[a-z]+)(?:'ve|'re|'s|'ll|'d)?\s+(?!(?:not|never)\b)[^?]*?,\s*(?:(?:haven't|hasn't|hadn't|don't|doesn't|didn't|aren't|isn't|wasn't|weren't|won't|wouldn't|can't|couldn't|shouldn't)\s+(?:you|we|it|he|she|they|there)|right|yeah|eh|huh)\s*\?\s*$/;

const Q_OPENER = /^(?:did|do|does|are|is|am|was|were|can|could|should|shall|will|would|have|has|had|may|might|must|what|where|who|whom|when|which|why|how|want|wanna|fancy|need|don't|doesn't|didn't|aren't|isn't|won't|wouldn't|can't|couldn't|shouldn't|haven't|hasn't)\b/i;
/**
 * "Tyler's got a game Saturday, do you want to go watch?": something the partner says, then the question. Returns the
 * statement (as typed, up to its comma) and the question after it; null when the text does not open with a statement.
 * Set D, 16 Nov: such a question was not read as yes / no (no card without a model; with one, a card of TV shows).
 * The statement is at least two words (one word and a comma is the person being spoken to), is not a question or an
 * offer itself, and what follows the comma starts like a question.
 */
export function leadIn(q: string): { context: string; q: string } | null {
  const s = q.trim();
  for (const m of s.matchAll(/\s*[,;:–-]\s+|\.\s+/g)) {
    const context = s.slice(0, m.index).trim();
    const rest = s.slice(m.index! + m[0].length).trim();
    if (context.includes('?')) return null;
    if (!Q_OPENER.test(rest)) continue;
    if (context.split(/\s+/).length < 2 || rest.split(/\s+/).length < 2) return null;
    // "…, do you?", "…, isn't it?": a tag belongs to the sentence before it
    if (/^[\p{L}'’]+\s+(?:you|we|it|he|she|they|there|i)\s*\?\s*$/iu.test(rest)) return null;
    const c = stripVocative(context);
    if (Q_OPENER.test(c) || OFFER_START.test(c) || /\bor\b/i.test(context)) return null;
    // "For lunch, …", "If you're cold, …", "Later on, …" belong to the question: only a statement is set apart
    if (/^(?:for|at|on|in|after|before|if|when|since|as|while|because|so|then|now|later|today|tonight|tomorrow|well|ok|okay|right|and|but|with|about|by)\b/i.test(c)) return null;
    // a title's full stop ("Dr. Patel's office called, …") is not the end of the statement
    if (m[0].startsWith('.') && /\b(?:dr|mr|mrs|ms|st|rev|prof)$/i.test(context)) continue;
    return { context: s.slice(0, m.index! + m[0].length).trimEnd(), q: capitalize(rest) };
  }
  return null;
}

/** Rule 2 (part). "..., or not (yet)?" offers no second option: it is a yes / no question. */
export function isOrNot(q: string): boolean {
  return /,?\s+or\s+(?:not|no)\b(?:\s+(?:yet|really|now|today))?\s*\?\s*$/i.test(q);
}

// ---------------------------------------------------------------- rule 2 (part): negative questions, opt-out tails
// Simulation 16.11: "You don't want to go out tonight, do you?" became yes / no, and "yes" read both ways. A negative
// question is asked the plain way instead ("Do you want to go out tonight?"): then yes means yes. The partner is told.
const NEG_AUX: Record<string, string> = {
  "don't": 'do', "doesn't": 'does', "didn't": 'did', "aren't": 'are', "isn't": 'is', "wasn't": 'was', "weren't": 'were', "won't": 'will',
  "wouldn't": 'would', "can't": 'can', cannot: 'can', "couldn't": 'could', "shouldn't": 'should', "haven't": 'have', "hasn't": 'has', "hadn't": 'had',
};
const CONTRACTED: Record<string, string> = { "'re": 'are', "'s": 'is', "'ve": 'have', "'ll": 'will', "'d": 'would' };
const POS_AUX = '(?:do|does|did|are|is|was|were|will|would|can|could|should|have|has|had)';
const NEG_AUX_RE = `(?:${Object.keys(NEG_AUX).join('|')})`;
const PRON = '(?:you|we|it|he|she|they|there|that|this)';
const NOUN_SUBJ = `(?:${PRON}|(?:the|your|my|our|his|her)\\s+[a-z]+|[A-Z][a-z]+)`;
const TAG = `(?:\\s*,\\s*(?:${POS_AUX}|${NEG_AUX_RE})\\s+${PRON}|\\s*,\\s*(?:right|eh|yeah|huh|no))?`;

/**
 * The plain (positive) form of a negative yes / no question, or null when the question is not one.
 *   "You don't want the telly on, do you?"   -> "Do you want the telly on?"
 *   "Aren't you hungry?"                      -> "Are you hungry?"
 *   "You're not cold, are you?"               -> "Are you cold?"
 *   "Do you not want your tea?"               -> "Do you want your tea?"
 * Only questions with an explicit auxiliary are rewritten; "Why don't we …?" is a suggestion and is left alone.
 */
export function positiveForm(q: string): string | null {
  const voc = VOCATIVE.exec(q)?.[0] ?? '';
  const s = q.slice(voc.length).replace(/[’]/g, "'").trim();
  if (!/\?\s*$/.test(s)) return null;
  const body = s.replace(/\s*\?\s*$/, '');
  const subj = (x: string) => (/^(?:you|we|it|he|she|they|there|that|this|the|your|my|our|his|her)\b/i.test(x) ? x.charAt(0).toLowerCase() + x.slice(1) : x);
  // the patterns below ignore case, so a name as subject is checked here: "Don't worry …" has no subject
  const okSubj = (x: string) => new RegExp(`^(?:${PRON}|(?:the|your|my|our|his|her)\\s+[a-z]+)$`, 'i').test(x) || /^[A-Z][a-z]+$/.test(x);
  const out = (aux: string, who: string, rest: string) => {
    const r = rest.replace(/\s+/g, ' ').trim();
    return r ? `${voc}${voc ? aux : capitalize(aux)} ${subj(who)} ${r}?` : null;
  };
  // "Don't you want …?", "Isn't the soup hot?"
  let m = new RegExp(`^(${NEG_AUX_RE})\\s+(${NOUN_SUBJ})\\s+(.+?)${TAG}$`, 'i').exec(body);
  if (m && okSubj(m[2])) return out(NEG_AUX[lc(m[1])], m[2], m[3]);
  // "Do you not want …?", "Are you not hungry?"
  m = new RegExp(`^(${POS_AUX})\\s+(${NOUN_SUBJ})\\s+not\\s+(.+?)${TAG}$`, 'i').exec(body);
  if (m && okSubj(m[2])) return out(lc(m[1]), m[2], m[3]);
  // "You don't want …, do you?", "You're not cold, are you?", "It is not too hot?"
  m = new RegExp(`^(${PRON})(?:\\s+(${NEG_AUX_RE})|('re|'s|'ve|'ll|'d)\\s+not|\\s+(${POS_AUX})\\s+not)\\s+(.+?)${TAG}$`, 'i').exec(body);
  if (m) return out(m[2] ? NEG_AUX[lc(m[2])] : m[3] ? CONTRACTED[lc(m[3])] : lc(m[4]), m[1], m[5]);
  return null;
}

/** "nothing", "neither", "just quiet", "no one": a real choice at the end of a list of things, shown as its own tile. */
// (since set E, 16 Nov, also "not at all", "not today", "no thanks" and, after a pair like "better or worse", "the same")
const NONE_OPTION = /^(?:just\s+|maybe\s+)?(nothing|neither|none|no\s+one|nobody|quiet|peace\s+and\s+quiet|silence|nowhere|not\s+at\s+all|not\s+(?:today|tonight|now|yet|just\s+yet|right\s+now|this\s+(?:week|time|morning|afternoon|evening|weekend))|no\s+thanks|no\s+thank\s+you|(?:about\s+)?the\s+same|same)(?:\s+(?:at\s+all|for\s+now|of\s+them|of\s+those|of\s+these|today|tonight|yet|just\s+yet|right\s+now|now))?$/i;
/** True for the "nothing / neither / quiet" tile of a list. */
export const isNoneOption = (label: string): boolean => NONE_OPTION.test(label.trim());
const OPT_OUT = /\s*,?\s+or\s+(?:is\s+that\s+a\s+no|would\s+you\s+rather\s+not|(?:do|would)\s+you\s+not|don't\s+you|not\s+really|not\s+bothered|are\s+you\s+(?:fine|ok|okay|alright|all\s+right|good|happy|sorted|set)(?:\s+(?:as\s+you\s+are|for\s+now|as\s+it\s+is|without|without\s+one))?|is\s+it\s+(?:fine|ok|okay|alright|all\s+right)(?:\s+as\s+it\s+is)?|shall\s+i\s+leave\s+it|should\s+i\s+leave\s+it|leave\s+it|never\s+mind|nothing(?:\s+for\s+now)?)\s*\?\s*$/i;
/**
 * "Do you want to rest, or is that a no?", "Something to drink, or are you fine?": one proposal and a way to decline,
 * not two options (simulation 16.11: no card, or a card "something to drink / fine"). Returns the proposal alone, to
 * be asked as yes / no; null when the question does not end that way.
 */
export function optOutTrim(q: string): string | null {
  const s = q.replace(/[’]/g, "'");
  const m = OPT_OUT.exec(s);
  if (!m) return null;
  const first = s.slice(0, m.index).replace(/[\s,]+$/, '');
  if (first.split(/\s+/).length < 2 || /\bor\b/i.test(first)) return null;
  // "the radio on, the TV on, or nothing?": two things are offered and "nothing" is the third choice, not a "no" to
  // one proposal (set D, 16 Nov: it became a yes / no card about the radio)
  if (NONE_OPTION.test(m[0].replace(/^[\s,]*or\s+/i, '').replace(/\s*\?\s*$/, '')) && first.split(/\s*,\s*/).filter((x) => x && !ADDRESS.has(lc(x))).length >= 2) return null;
  const t = stripVocative(first);
  return AUX_START.test(t) || OFFER_START.test(t) ? `${first}?` : null;
}

/**
 * The question as the card asks it: a negative question in its plain form, a proposal without its opt-out tail.
 * `why` says which, for the coaching line; null when the question is used as typed.
 */
export function plainQuestion(q: string): { q: string; why: 'negative' | 'optOut' } | null {
  const trimmed = optOutTrim(q);
  const pos = positiveForm(trimmed ?? q);
  if (pos) return { q: pos, why: 'negative' };
  return trimmed ? { q: trimmed, why: 'optOut' } : null;
}

// ---------------------------------------------------------------- rule 3
const LEAD =/^(?:is it|is the room too|is the room|do you want to|do you want|would you like to|would you like|shall we|should we|go to|me to|to|the|on)\s+/i;
// ("than this morning" after "better or worse" belongs to both sides)
const TRAIL = /\s+(?:that|which|who|for|than)\b.*$/i;
const FRAME = new Set(['you', 'like', 'want', 'to', 'we', 'i', 'me', 'would', 'do', 'does', 'shall', 'should', 'is', 'are', 'it', 'the', 'a', 'an', 'some', 'too', 'prefer', 'rather', 'have', 'could', 'can', 'will', 'be']);

function cleanSide(x: string): string {
  // "or just text her", "or maybe the red one": the adverb is not part of the option
  x = x.trim().replace(/^(?:just|maybe|perhaps|else|rather)\s+(?=\S)/i, '');
  for (let i = 0; i < 4; i++) {
    const y = x.replace(LEAD, '');
    if (y === x) break;
    x = y;
  }
  x = x.replace(TRAIL, '').trim();
  return x.replace(/^(?:the|a|an|too|some)\s+/i, '');
}

const DET = new Set(['the', 'a', 'an', 'your', 'my', 'our', 'his', 'her', 'some']);
/** Words that describe the thing after them and so belong to an option: "ice cream", "hot chocolate", "big blue cup". */
const MODIFIER = new Set(('ice iced hot cold warm orange apple tomato chicken beef fish cheese peanut french fried scrambled boiled poached mashed baked roast ' +
  'green black white brown red blue grey gray pink yellow purple navy new old big small little long short thick thin sharp dull fresh sweet plain sparkling ' +
  'decaf herbal fruit chocolate vanilla strawberry lemon mint clean dry wet front top bottom brown wholemeal soft hard light dark heavy').split(' '));
const SHARED_END = /^(?:better|best|easier|nicer|okay|ok|alright|instead|then)$/i;
const PREP = new Set(['by', 'at', 'of', 'in', 'near', 'with', 'from', 'on']);
const PARTICLE = new Set(['on', 'off', 'in', 'out', 'up', 'down']);
/** Verbs that own the particle after them ("turn on", "carry on"): there the particle is part of the option. */
const PHRASAL = new Set(['turn', 'switch', 'put', 'keep', 'leave', 'carry', 'go', 'get', 'come', 'move', 'hold', 'hang', 'log', 'sign', 'try', 'it', 'them', 'that', 'this']);
const NEG = /\b(?:not|no|never|none|nothing|nobody|neither|nor)\b|n't\b|\bdont\b/i;

/** Rule 3. "... X or Y?" with short alternatives -> [X, Y]; null when the sides are not short phrases. */
export function orPair(q: string): [string, string] | null {
  // "…, Frank?" at the end is the person being spoken to, not part of the second option (set D, 16 Nov: "card for the
  // barber")
  q = stripAddress(q);
  if (/,\s*or\s/i.test(q)) return commaOrPair(q);
  const m = /([\p{L}\p{N}' -]+?)\s+or\s+([\p{L}\p{N}' -]+?)\s*\?\s*$/u.exec(q);
  if (!m) return clausePair(q);
  // a time both sides share ("… easier or harder today?") is not part of the second, so it is not counted off the first
  const st = sharedTail(q);
  const right = st && m[2].trim().split(/\s+/).length > st.split(/\s+/).length ? m[2].replace(new RegExp(`\\s+${esc(st)}\\s*$`, 'i'), '') : m[2];
  const bw = cleanSide(right).split(/\s+/).filter(Boolean);
  // "Is morning or afternoon better?": the word both sides share is not part of the second
  while (bw.length > 1 && SHARED_END.test(bw[bw.length - 1])) bw.pop();
  // "Bus or taxi to the clinic?", "Cocoa or tea before bed?": where or when both happen is not part of the second
  // thing. Only after one word that is a thing, not a movement ("go to the lounge" stays whole), and only when the
  // first side has no such phrase of its own.
  if (bw.length > 2 && /^(?:before|after|until|till|to)$/i.test(bw[1]) && (lc(bw[1]) !== 'to' || /^(?:the|my|your|our)$/i.test(bw[2]))
    && !/^(?:go|come|walk|stay|sit|lie|drive|head|pop|move|get|run|nip|back|out|up|down|over|listen|talk|speak|wait)$/i.test(bw[0])
    && !new RegExp(`\\b${lc(bw[1])}\\b`, 'i').test(m[1])) bw.length = 1;
  if (!bw.length) return null;
  // a long or clause-like second option ("or stay here with the dog?"): parse both sides as clauses
  if (bw.length > 4 || (['give', 'stay', 'go', 'keep', 'leave', 'wait'].includes(lc(bw[0])) && bw.length > 2)) return clausePair(q);
  // the same when the lead words taken off the second side were its verb ("… or go to the lounge?" is not "lounge")
  if (/^(?:go|stay|sit|come|walk|wait)\s+(?:to|in|at|on|with|by)\s+\S+\s+\S/i.test(m[2].trim())) return clausePair(q);
  const n = bw.length;
  const left = m[1].split(/\s+/).filter(Boolean);
  // "The snooker on or Pointless?": "on" says the telly is on; the option is "snooker"
  // (only "on" / "off" after a thing: "lie down", "go out", "stay in", "turn it off" keep their particle. Simulation
  // 16.11: "lie down or sit in the chair" lost "down" and the tile read "lie")
  const lastLeft = lc(left[left.length - 1]);
  if (left.length > 1 && (lastLeft === 'on' || lastLeft === 'off') && !PHRASAL.has(lc(left[left.length - 2])) && !PARTICLE.has(lc(bw[0]))) left.pop();
  let start = Math.max(0, left.length - n);
  while (start > 0 && DET.has(lc(left[start - 1]))) start--;
  // keep the whole noun phrase ("the park by the canal", not "canal") when it opens the question or follows "the"
  // (not after "with" / "from" / "on": "Pills with juice or water?" offers juice or water, not "pills with juice")
  if (start > 1 && PREP.has(lc(left[start - 1])) && !/^(?:with|from|on)$/i.test(left[start - 1]) && (start - 2 === 0 || DET.has(lc(left[start - 3])))) {
    start -= 2;
    while (start > 0 && DET.has(lc(left[start - 1]))) start--;
  }
  // "ice cream or fruit", "red wine or white": a word that describes the thing belongs to the option (set D, 16 Nov:
  // the tile read "cream")
  for (let i = 0; i < 2 && start > 0 && left.length - start < 4 && MODIFIER.has(lc(left[start - 1])); i++) start--;
  let aw = cleanSide(left.slice(start).join(' ')).split(/\s+/).filter(Boolean);
  // "Would you like cocoa or hot milk?": a two-word right side must not pull "like" into the left option
  while (aw.length > 1 && FRAME.has(lc(aw[0]))) aw = aw.slice(1);
  const a = aw.join(' ');
  const b = bw.join(' ');
  if (!a || aw.length > 4) return clausePair(q);
  // "book the taxi for Friday or hold off": counting two words off the left gave "for Friday" against "hold off". A
  // left side that opens with a preposition the right side does not share is the tail of a clause: read both as clauses.
  if (aw.length > 1 && /^(?:for|to|at|on|with|by|from|about|in)$/i.test(aw[0]) && lc(bw[0]) !== lc(aw[0]) && !isTimeOnly(b)) return clausePair(q) ?? [a, b];
  // "take the dog out or stay home": the second side is something to do, and two words counted off the first gave
  // "dog out". Read both as clauses.
  if (bw.length >= 2 && ACTION_START.test(b) && !ACTION_START.test(a) && !LIST_VERB.test(`${a} x`)) return clausePair(q) ?? [a, b];
  if (lc(a) === lc(b) || NEG.test(a) || NEG.test(b)) return null;
  return [a, b];
}

const AUX = '(?:is|was|are|were|am|do|does|did|would|will|can|could|should|shall|have|has|had)';
const SUBJ = '(?:it|that|this|you|we|i|they|he|she|there)';
const CLAUSE_LEAD = [
  // "So we could go for a walk, or …": what the partner puts before the first of the things on offer
  /^(?:so\s+|well\s+|now\s+|ok\s+|okay\s+)?(?:we|you|i)\s+(?:could|can|might)\s+(?:either\s+|just\s+|always\s+)?/i,
  new RegExp(`^(?:are\\s+you\\s+|you\\s+)?up\\s+for\\s+`, 'i'),
  new RegExp(`^(?:did|do|would|will)\\s+you\\s+(?:mean|want|like|prefer|rather|fancy|need)\\s+(?:to\\s+)?`, 'i'),
  new RegExp(`^(?:would|do|will)\\s+you\\s+`, 'i'),
  new RegExp(`^(?:you\\s+)?(?:want|fancy|prefer|rather|mean|need)\\s+(?:to\\s+)?`, 'i'),
  new RegExp(`^(?:shall|should|can|could|will)\\s+(?:we|i)\\s+`, 'i'),
  /^(?:would|will|is|was)\s+it\s+be\s+(?:better|best|easier|nicer)\s+(?:to\s+|if\s+(?:we|i)\s+)?/i,
  // ("do it yourself", "do that first": there "do" is the verb of the option, not the question's auxiliary)
  new RegExp(`^(?!do\\s+(?:it|that|this)\\b)${AUX}\\s+${SUBJ}\\s+(?:just\\s+|still\\s+|really\\s+)?`, 'i'),
  /^(?:just|maybe|perhaps|still|rather|or|else|instead)\s+/i,
  /^(?:a\s+)?bit\s+(?:of\s+a\s+)?/i,
  /^(?:me|us)\s+to\s+/i,
  /^(?:tell|ask)\s+(?:her|him|them|[A-Z][a-z]+|Person [A-Z])\s+to\s+/,
];
const DAYRE = '(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)s?';
const TAIL = new RegExp(`\\s+(?:again|already|then|now|today|tonight|tomorrow|instead|anyway|though|first|later on|for now|for a bit|for a while|at the moment|right now|any more|anymore|this arvo|this avo|last\\s+(?:time|night|week)|this\\s+(?:time|morning|afternoon|evening|week|weekend|spring|summer|autumn|fall|winter|year|month)|next\\s+(?:week|time)|(?:(?:on|for|by|this|next|last)\\s+)?${DAYRE})$`, 'i');
const CUT = /\s+(?:till|until|because|since|so that|so|if|when|before|while|as|now that|seeing as)\b.*$/i;
const FUNC_END = /\s+(?:for|to|at|with|and|of|the|a|an|by|from|about|your|my|our|some)$/i;
const PLACE_PP = /\s+(?:at|in)\s+(?:home|the\s+\w+|a\s+\w+|my\s+\w+|your\s+\w+|our\s+\w+|\w+'s(?:\s+\w+)?)$/i;
const ASIDE = /^(?:now|now that|seeing as|since|because|as|while|when|if|though|although|love|dear|darling|mate|pet|hon|honestly|then|by the way|you know|i mean|i reckon|i think|i guess)\b/i;

/** Shorten one side to its head phrase: lead words and asides off, then trailing time words and dangling prepositions. */
function clauseOption(x: string, other = ''): string {
  let s = x.trim().replace(/[?.!]+$/, '');
  s = s.replace(/\bon (?:your|my|her|his) own\b/i, 'alone').replace(/\bby (?:yourself|myself)\b/i, 'alone');
  for (let i = 0; i < 5; i++) {
    const y = CLAUSE_LEAD.reduce((acc, re) => acc.replace(re, ''), s);
    if (y === s) break;
    s = y;
  }
  // "Is something bothering you" -> "something bothering me" (the person's own words)
  const some = new RegExp(`^${AUX}\\s+(something|anything)\\s+(.*)$`, 'i').exec(s);
  if (some) s = `${some[1]} ${some[2]}`.replace(/\byou\b/gi, 'me');
  // "Is the soup alright" / "Has Pickles got enough seed": an aux + subject is not part of the option
  // (the name is matched with its capital: without that, "do your exercises" lost "do your")
  const auxWord = new RegExp(`^(?!do\\s+(?:it|that|this)\\b)${AUX}\\s+`, 'i').exec(s);
  const subj = auxWord ? /^(?:(?:[Tt]he|[Yy]our|[Mm]y|[Oo]ur|[Tt]hat|[Tt]his)\s+\w+|[A-Z][\p{L}']+|(?:Person|Thing|Place|Food|Show|Music) [A-Z])\s+/u.exec(s.slice(auxWord[0].length)) : null;
  if (auxWord && subj && s.slice(auxWord[0].length + subj[0].length).trim()) s = s.slice(auxWord[0].length + subj[0].length);
  s = s.replace(CUT, '');
  for (let i = 0; i < 4; i++) {
    const y = s.replace(TAIL, '').replace(FUNC_END, '');
    if (y === s) break;
    s = y;
  }
  // "fish and chips at the beach" -> "fish and chips": a place phrase is dropped when the option says what
  if (s.split(/\s+/).length > 2 && !/^(?:go|going|stay|eat|sit|be|meet|walk)\b/i.test(s)) s = s.replace(PLACE_PP, '');
  s = s.replace(/^(?:a|an)\s+/i, '');
  let w = s.split(/\s+/).filter(Boolean);
  if (w.length > 4) {
    // cut at the first preposition after the head words ("come in with you at the clinic on Main Street")
    const k = w.findIndex((x, i) => i >= 2 && /^(?:at|on|to|for|from|about|during|after|before|near|by|with)$/i.test(x) && !(i === 2 && /^with$/i.test(x)));
    if (k > 0) w = w.slice(0, k);
    // no cut point ("walk to the post office"): keep up to five words rather than split a name
    if (w.length > 5) w = w.slice(0, 4);
    s = w.join(' ');
    for (let i = 0; i < 3; i++) s = s.replace(FUNC_END, '');
  }
  s = s.replace(/^(?:a|an)\s+/i, '').trim();
  void other;
  return /^[A-Z][a-z]/.test(s) && !/^(?:[A-Z][a-z]+\s+){0,2}[A-Z][a-z]+$/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s;
}

/** The part of the left side that holds the first option: asides and a leading statement ("Ann's here,") dropped. */
function leftClause(left: string): string | null {
  let segs = left.split(/\s*,\s*/).map((x) => x.trim()).filter(Boolean);
  // "Are you happy, Graham, or ...": a name or "love" after a full clause is the person being spoken to
  if (segs.length > 1 && /^(?:[A-Z][a-z']+|love|dear|darling|pet|hon|mate)$/.test(segs[segs.length - 1]) && segs[segs.length - 2].split(/\s+/).length >= 3) segs = segs.slice(0, -1);
  if (segs.length === 1) return segs[0];
  const kept = segs.filter((x, i) => i === 0 || !ASIDE.test(x)).filter((x) => x.split(/\s+/).length > 1 || segs.length === 1);
  // a list ("tea, coffee, or juice"): every piece short and verbless -> not an either-or pair
  if (segs.slice(1).some((x) => x.split(/\s+/).length <= 2 && !ASIDE.test(x))) return null;
  const q = kept.filter((x) => new RegExp(`^(?:${AUX}|want|fancy|shall|should|up for|would|will|need)\\b`, 'i').test(x));
  if (q.length) return q[q.length - 1];
  return kept[0] ?? null;
}

const LABEL_BAD = new RegExp(`^(?!(?:do|have)\\s+(?:it|that|this|the|your)\\b)(?:${AUX}\\s+(?:you|i|we|it|that|this|there|he|she|they|the|your)|what|where|who|when|which|how|why)\\b`, 'i');

/**
 * Rule 3 (part). "A ..., or B ...?" is an either-or question even when the sides are long clauses. Each side is
 * shortened to its head phrase. Not for "..., or not?" (that is yes/no) and not for a list ("tea, coffee, or juice?").
 */
export function clausePair(q: string): [string, string] | null {
  if (isOrNot(q)) return null;
  const m = /^(.*\S)\s*,?\s+or\s+(.*?)\s*\?\s*$/i.exec(q.trim().replace(VOCATIVE_END, '?'));
  if (!m) return null;
  const left = leftClause(m[1]);
  if (!left) return null;
  const right = m[2].split(/\s*,\s*/)[0];
  // "Wheel of Fortune on": "on" after a thing says it is switched on; the option is the thing ("turn the TV on" keeps it)
  const offOn = (x: string) => { const w = x.split(/\s+/); return w.length > 1 && /^(?:on|off)$/i.test(w[w.length - 1]) && !w.slice(0, -1).some((v) => PHRASAL.has(lc(v))) ? w.slice(0, -1).join(' ') : x; };
  const a = offOn(clauseOption(left, right));
  const b = offOn(clauseOption(right, left));
  const aw = a.split(/\s+/).filter(Boolean);
  const bw = b.split(/\s+/).filter(Boolean);
  if (!aw.length || !bw.length || aw.length > 5 || bw.length > 5) return null;
  if (LABEL_BAD.test(a) || LABEL_BAD.test(b)) return null;
  if (lc(a) === lc(b) || NEG.test(a) || NEG.test(b)) return null;
  return [a, b];
}

const stem = (w: string) => lc(w).replace(/'s$/, '').replace(/(?:ing|ed|es|s)$/, '');
// ("do it for you", "do your exercises": there "do" is the verb of the option, not a question's auxiliary left over)
const LEFTOVER_START = new RegExp(`^(?!(?:do|have)\\s+(?:it|that|this|your|my|the|some|a|an)\\b)(?:is|was|are|were|am|do|does|did|would|will|can|could|should|shall|want|wanna|like|rather|prefer|fancy|mean|need|shall|should|would|will|could|can|going|gonna)\\b`, 'i');
// ("you" is not here: "help you", "come with you" are whole options; a leftover "do you" is caught by its first word)
const LEFTOVER_END = /\b(?:to|for|at|with|of|the|a|an|and|or|have|be|going|get|do|is|are|was|were|your|i|we|my)$/i;
// (a bare "you" is what is left of "thank you" or "help you" when a side is counted off one word short)
const PRONOUN_ONLY = /^(?:it|that|this|one|ones|them|those|these|either|both|something|anything|you)$/i;

/**
 * Validate options the on-device model copied out of an either-or question: exactly two, each 1-4 words, every
 * word in the question (or the same word stem), no leftover question verbs at the start, no dangling word at the
 * end, not a bare pronoun, no negative, and the two differ. Then the label check (§2.5) that the code parser's
 * pair also passes. Returns the cleaned pair, or null to fall back.
 */
export function validateOptions(options: unknown, q: string, profile?: Profile): [string, string] | null {
  if (!Array.isArray(options)) return null;
  const opts = options.filter((x): x is string => typeof x === 'string').map((x) => x.replace(/[?.!,;:"]+/g, ' ').replace(/\s+/g, ' ').trim()).filter(Boolean);
  if (opts.length !== 2) return null;
  const qw = new Set(words(q));
  const qs = new Set(words(q).map(stem));
  const out: string[] = [];
  for (let o of opts) {
    o = o.replace(/^(?:the|a|an)\s+/i, '');
    const ow = words(o);
    if (!ow.length || ow.length > 4) return null;
    if (!ow.every((w) => qw.has(w) || qs.has(stem(w)))) return null;
    if (LEFTOVER_START.test(o) || LEFTOVER_END.test(o) || PRONOUN_ONLY.test(o) || NEG.test(o)) return null;
    if (clipped(o, q)) return null;
    out.push(o);
  }
  const pair = checkPair([out[0], out[1]], q, profile);
  // where the code is sure of the two options (a time against a time clause, a name against a name), a copy that
  // differs from them is not used
  const sure = surePair(q, profile);
  return pair && sure && (lc(pair[0]) !== lc(sure[0]) || lc(pair[1]) !== lc(sure[1])) ? null : pair;
}

/**
 * True when a copied option is a piece cut out of a longer phrase of the question: its words do not stand together
 * there ("after eat" of "after you eat", "text jen" of "text her"), or wherever they do stand the phrase goes on with
 * a particle, a preposition or its object ("turn the TV" + "on", "try" + "it yourself", "Honey to sit" + "with you").
 * Set E, 16 Nov: such tiles came from the on-device model's copy and passed the check; now the pair read in code is used.
 */
function clipped(option: string, q: string): boolean {
  const ow = words(option);
  const qw = words(q);
  const same = (a: string, b: string) => a === b || stem(a) === stem(b);
  // where the option's words stand together in the question (a small linking word may sit between two of them)
  const ends: number[] = [];
  for (let i = 0; i < qw.length; i++) {
    let k = i;
    let ok = true;
    for (let n = 0; n < ow.length && ok; n++) {
      if (n > 0 && k < qw.length && !same(qw[k], ow[n]) && new RegExp(`^${LINKERS}$`).test(qw[k])) k++;
      if (k < qw.length && same(qw[k], ow[n])) k++; else ok = false;
    }
    if (ok) ends.push(k);
  }
  if (!ends.length) return true;
  // The copy is whole only when the question goes on, after it, with a word that ends an option: "or", "and", a time
  // both sides share, or nothing. Anything else continues the phrase ("striped" + "shirt", "try" + "it yourself",
  // "Honey to sit" + "with you"). "on" / "off" after a thing ("the Antiques Roadshow on") only say it is switched on;
  // after a verb that owns them ("turn the TV" + "on") they are part of the option.
  const verb = ow.some((w) => PHRASAL.has(w) && !/^(?:it|them|that|this)$/.test(w));
  const ends_ = (w: string) => /^(?:or|and|than|then|but|please|instead|too|either|now|later|soon|today|tonight|tomorrow|first|again|this|next|morning|afternoon|evening|weekend)$/.test(w) || new RegExp(`^${DAYRE}$`).test(w) || ADDRESS.has(w) || (!verb && /^(?:on|off)$/.test(w))
    // after two or more words a place or company phrase may follow ("stay in" + "by the fire"); after one word it is
    // the rest of the option ("coffee" + "with milk")
    || (ow.length >= 2 && !verb && /^(?:by|with|at|in|near|from|for|to)$/.test(w));
  // "Honey to sit": a name and the start of what they would do is a piece of a clause, never an option
  if (/^[A-Z][\p{L}'-]+\s+to\s+[a-z]+$/u.test(option.trim())) return true;
  return ends.every((k) => k < qw.length && !ends_(qw[k]));
}

// ---------------------------------------------------------------- rule 3: the label check (build spec §2.5)
const LINKERS = '(?:and|or|of|the|a|an|on|with|by|in|at|for)';
const TIME_ONLY = /^(?:now|later|soon|today|tonight|tomorrow|yesterday|morning|afternoon|evening|night|teatime|lunchtime|bedtime|weekend|week|month|monday|tuesday|wednesday|thursday|friday|saturday|sunday|this|next|last|the|on|at|in|after|before|early|late|first|thing|\d+(?::\d+)?|am|pm|o'clock|half|quarter|past|to)$/i;
const FEMALE = /^(?:wife|daughter|sister|mother|mum|mom|granddaughter|niece|aunt|auntie|grandmother|gran|nan|girlfriend|daughter-in-law|sister-in-law|mother-in-law)$/i;
const MALE = /^(?:husband|son|brother|father|dad|grandson|nephew|uncle|grandfather|grandad|grandpa|boyfriend|son-in-law|brother-in-law|father-in-law)$/i;

/** Every word is a time word (or a small word around one): "Thursday", "3 pm", "after lunch", "before bed". */
export function isTimeOnly(label: string): boolean {
  const ws = label.trim().split(/\s+/).filter(Boolean);
  if (!ws.length) return false;
  if (ws.length <= 3 && /^(?:after|before|till|until|by)$/i.test(ws[0]) && !/^(?:your|my|our|his|her|the)$/i.test(ws[1] ?? '')) return true;
  return ws.every((w) => TIME_ONLY.test(w.replace(/[.,]/g, ''))) && ws.some((w) => !/^(?:the|on|at|in|this|next|last|to|past|half|quarter)$/i.test(w));
}

/** "fish chips" -> "fish and chips": the whole noun phrase as the question has it, when the label skipped a linking word. */
function expandFromQuestion(label: string, q: string): string {
  const ws = label.split(/\s+/).filter(Boolean);
  if (ws.length < 2 || new RegExp(`\\b${esc(label)}\\b`, 'i').test(q)) return label;
  const re = new RegExp(`\\b${ws.map(esc).join(`(?:\\s+${LINKERS})?\\s+`)}\\b`, 'i');
  const m = re.exec(q);
  if (!m || m[0].split(/\s+/).length > ws.length + 2) return label;
  // the question's sentence-initial capital is not part of the label
  return /^[a-z]/.test(label) && /^[A-Z][a-z]/.test(m[0]) ? m[0].charAt(0).toLowerCase() + m[0].slice(1) : m[0];
}

/**
 * A label takes the capitals the question gave it in mid-sentence ("Wheel of Fortune", "Jenny did it"): shortening a
 * side lowers its first letter, which is right for the word that only opens the sentence and wrong for a name.
 */
function questionCase(label: string, q: string): string {
  if (!/^[a-z]/.test(label)) return label;
  const m = new RegExp(`(?<![\\p{L}\\p{N}])${esc(label)}(?![\\p{L}\\p{N}])`, 'iu').exec(q);
  if (!m || m[0] === label) return label;
  // the capital of the first word of the question (or of a sentence in it) is not the word's own
  const before = q.slice(0, m.index);
  return /(?:^|[.?!:;])\s*["'“‘(-]*\s*$/.test(before) || VOCATIVE.test(before) && !before.replace(VOCATIVE, '').trim() ? label : m[0];
}

/** "I paid it" / "you paid it" flip when the partner reads them aloud: use the names when About me has them. */
function personSide(label: string, profile?: Profile): string {
  if (!profile) return label;
  if (profile.partnerName && /^i\s+(?!mean\b|think\b)[a-z]/i.test(label)) return label.replace(/^i\b/i, profile.partnerName);
  if (profile.personName && /^you\s+(?!want|like|mean|know|think|fancy|need|rather|prefer)[a-z]/i.test(label)) return label.replace(/^you\b/i, profile.personName);
  return label;
}

/** The time phrase the question ends with, shared by both sides ("...or the garden centre this weekend?"). */
function sharedTail(q: string): string | null {
  const m = /\b((?:this|next|on|for|by|at)\s+(?:weekend|morning|afternoon|evening|night|week|month|year|spring|summer|autumn|fall|winter|lunch|dinner|tea|breakfast|supper|bedtime|teatime|christmas|easter|monday|tuesday|wednesday|thursday|friday|saturday|sunday|arvo|avo)|in the (?:morning|afternoon|evening)|tonight|today|tomorrow|later|now)\s*\?\s*$/i.exec(q);
  return m ? m[1] : null;
}

/**
 * The §2.5 label check, applied to both the model's copied options and the code parser's pair. A side is
 * rewritten (noun phrase completed from the question, snapped to an About-me item, a shared time phrase dropped,
 * a subject pronoun replaced by the name) or rejected (a question or leftover, a bare pronoun, a negative, too long).
 * The pair is rejected when the sides are the same, synonyms, or not on one axis (a time against a thing).
 */
export function checkPair(pair: [string, string], q: string, profile?: Profile): [string, string] | null {
  const out = checkSides(pair, q, profile);
  return out ? [out[0], out[1]] : null;
}

/** One side of the label check: cleaned and completed, or null when it cannot be a label. */
function checkSide(side: string, q: string, tail: string | null, profile?: Profile): string | null {
  // punctuation around a side ("- toast", "toast,") is never part of a label
  let s = side.replace(/[?.!,;:"]+/g, ' ').replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '').replace(/\s+/g, ' ').trim().replace(/^(?:the|a|an)\s+/i, '');
  if (tail) s = s.replace(new RegExp(`\\s+${esc(tail)}$`, 'i'), '');
  for (let i = 0; i < 3; i++) s = s.replace(FUNC_END, '');
  s = s.replace(/^(?:the|a|an)\s+/i, '').trim();
  if (!s) return null;
  // "when you go up to bed" is a time the partner offered, not a question left over
  const whenClause = /^when\s+(?:you|we|i|he|she|they|it|the|your|my|our)\s+[a-z']+/i.test(s) && isTimeLike(s);
  if ((LABEL_BAD.test(s) && !whenClause) || LEFTOVER_START.test(s) || LEFTOVER_END.test(s) || PRONOUN_ONLY.test(s) || NEG.test(s)) return null;
  s = expandFromQuestion(s, q);
  s = questionCase(s, q);
  // a name About me knows is written as About me writes it ("text jen" -> "text Jen")
  if (profile) s = s.split(' ').map((w) => { const p = findPerson(w, profile); const bare = w.replace(/['’]s$/, ''); return p && bare === lc(bare) ? (lc(p.nickname ?? '') === bare ? p.nickname! : p.name) + w.slice(bare.length) : w; }).join(' ');
  if (profile) s = snapToQuestionItem(s, q, profile);
  s = personSide(s, profile);
  if (s.split(/\s+/).length > (isTimeLike(s) ? 6 : 5)) return null;
  return s;
}

/** Words that can stand for a whole thing once its noun has been said: "your left hand or your right", "red wine or white". */
const ELLIPTIC = new Set(['left', 'right', 'other', 'red', 'blue', 'green', 'grey', 'gray', 'black', 'white', 'brown', 'pink', 'yellow', 'purple', 'navy', 'big', 'small', 'little', 'new', 'old', 'long', 'short', 'thick', 'thin', 'hot', 'cold', 'warm', 'top', 'bottom', 'front', 'first', 'second', 'upstairs', 'downstairs']);
/**
 * A pair in which one side leaves a word unsaid gets it back from the other side:
 *   "your left hand" / "your right"                    -> "your right hand"
 *   "clinic on Willow Street" / "one at Mercy Hospital" -> "clinic at Mercy Hospital"
 * (set E, 16 Nov: tiles "your right", "one at Mercy Hospital"). Anything else is returned as it came.
 */
function completeEllipsis(sides: string[]): string[] {
  if (sides.length !== 2) return sides;
  const strip = (x: string) => x.trim().replace(/^(?:the|a|an)\s+/i, '');
  const out = sides.map(strip);
  for (const [i, j] of [[0, 1], [1, 0]]) {
    const a = out[j].split(/\s+/); const b = out[i].split(/\s+/);
    const noun = a.find((w) => !DET.has(lc(w)) && !ELLIPTIC.has(lc(w)) && !MODIFIER.has(lc(w)));
    // "one at Mercy Hospital": "one" stands for the first thing named on the other side
    if (lc(b[0]) === 'one' && b.length > 1 && noun && lc(noun) !== 'one' && /^[a-z]/.test(noun)) out[i] = [noun, ...b.slice(1)].join(' ');
    // "the blue shirt or the green one": "one" at the end stands for the other side's noun
    else if (lc(b[b.length - 1]) === 'one' && b.length >= 2 && a.length === b.length && lc(a[a.length - 1]) !== 'one' && !ELLIPTIC.has(lc(a[a.length - 1])) && /^[a-z]+$/.test(a[a.length - 1])) out[i] = [...b.slice(0, -1), a[a.length - 1]].join(' ');
    // "your right": an adjective alone, where the other side is that kind of adjective and then its noun
    else if (ELLIPTIC.has(lc(b[b.length - 1])) && a.length >= 2 && ELLIPTIC.has(lc(a[a.length - 2])) && !ELLIPTIC.has(lc(a[a.length - 1])) && a.length === b.length + 1) out[i] = `${out[i]} ${a[a.length - 1]}`;
  }
  return out;
}

/** The label check for two or more sides: every side passes, no two are the same or synonyms, all on one axis. */
function checkSides(sides0: string[], q: string, profile?: Profile, list = false, oneAxis = true): string[] | null {
  const tail = sharedTail(stripAddress(q));
  const out: string[] = [];
  const sides = list ? sides0 : completeEllipsis(sides0);
  for (const side of sides) {
    const s = checkSide(side, q, tail, profile);
    if (!s) return null;
    out.push(s);
  }
  for (let i = 0; i < out.length; i++) for (let j = i + 1; j < out.length; j++) {
    if (lc(out[i]) === lc(out[j])) return null;
    const g = SYNONYMS.findIndex((grp) => grp.includes(lc(out[i])));
    if (g >= 0 && SYNONYMS[g].includes(lc(out[j]))) return null;
    if (oneAxis && isTimeOnly(out[i]) !== isTimeOnly(out[j])) return null;
  }
  // In a list, the capital that only opens the sentence is not part of the first label ("Soup, a sandwich, or
  // leftovers?" -> "soup"): lowered when no other item starts with a capital and the word is not a name About me
  // knows. A pair keeps the question's own capital: "Raglan beach or the garden centre?" may be a place name.
  const first = out[0];
  if (list && /^[A-Z][a-z]/.test(first) && new RegExp(`^\\s*(?:the\\s+|a\\s+|an\\s+)?${esc(first.split(/\s+/)[0])}\\b`).test(q) && out.slice(1).every((o) => !/^[A-Z]/.test(o))
    && !(profile && (findPerson(first, profile) || snapToQuestionItem(first, q, profile) !== first
      // an About-me entry keeps the capital only when About me writes it with one ("Elvis", not "lamb")
      || [...profile.foods, ...profile.places, ...profile.tv, ...profile.music, ...(profile.other ?? [])].some((e) => e.replace(/^the\s+/i, '') === first)))) {
    out[0] = first.charAt(0).toLowerCase() + first.slice(1);
  }
  // A pair: the first label loses the sentence's capital when its first word is an everyday opening word ("Coffee or
  // tea?", "Red wine or white?"); any other capital may be a name and stays.
  if (!list && /^[A-Z][a-z]+(?:\s+[a-z']+)*$/.test(first) && isOrdinaryOpener(first.split(/\s+/)[0]) && new RegExp(`^\\s*${esc(first.split(/\s+/)[0])}\\b`).test(stripVocative(q))
    && !(profile && (findPerson(first, profile) || [...profile.foods, ...profile.places, ...profile.tv, ...profile.music, ...(profile.other ?? [])].some((e) => e.replace(/^the\s+/i, '') === first)))) {
    out[0] = first.charAt(0).toLowerCase() + first.slice(1);
  }
  return out;
}

/** A side that says when: a time word or phrase ("tonight", "at 6"), or a clause that sets a moment ("after you eat"). */
function isTimeLike(side: string): boolean {
  const ws = side.trim().split(/\s+/).filter(Boolean);
  return isTimeOnly(side) || (ws.length >= 2 && ws.length <= 6 && /^(?:after|before|once|when|while)$/i.test(ws[0]));
}

/**
 * "Do you want your pills now or after you eat?": the second side says when, so the first option is the time the
 * left side ends with ("now"), not its last words counted off ("pills now"). set E, 16 Nov: such a question had no
 * card without a model, and with one only in some runs.
 */
function timePair(q: string): [string, string] | null {
  const m = /^(.*\S)\s*,?\s+or\s+(.*?)\s*\?\s*$/i.exec(stripAddress(q).trim());
  if (!m) return null;
  const right = m[2].trim().replace(/^(?:maybe|just|else|perhaps|rather)\s+/i, '').replace(new RegExp(`^on\\s+(?=${DAYRE}$)`, 'i'), '');
  if (!isTimeLike(right)) return null;
  const tail = timeTail(m[1]);
  return tail ? [tail, right] : null;
}

/** The time a clause ends with ("… call Tyler this morning" -> "this morning"), or null. */
function timeTail(clause: string): string | null {
  const tail = new RegExp(`\\b((?:right\\s+)?now|later(?:\\s+on)?|soon|today|tonight|tomorrow|first|straight\\s+away|(?:this|tomorrow|in\\s+the)\\s+(?:morning|afternoon|evening)|${DAYRE}|at\\s+\\d{1,2}(?::\\d{2})?(?:\\s*[ap]m)?|(?:before|after|with)\\s+(?:lunch|dinner|tea|breakfast|supper|bed|church|work|school|the\\s+\\w+))$`, 'i').exec(clause.replace(/[\s,]+$/, ''));
  return tail ? tail[1] : null;
}

/**
 * The last reading of an either-or, used only when every stricter one failed the label check: each side as its
 * clause, shortened, with no demand that the two sit on one axis ("tell Jen" against "wait"). The sides are still
 * the question's own words, never a question, a bare pronoun or a negative.
 */
function loosePair(q: string): [string, string] | null {
  if (isOrNot(q)) return null;
  const m = /^(.*\S)\s*,?\s+or\s+(.*?)\s*\?\s*$/i.exec(stripAddress(q).trim());
  if (!m || /\bor\b/i.test(m[1])) return null;
  const segs = m[1].split(/\s*,\s*/).filter(Boolean);
  // a list in front ("soup, a sandwich, or would you rather …") is three options, not a pair
  // (after a wh-question the comma only sets the options apart: "What shall I say to her, thank you or sorry?")
  const wh = /^(?:what|which|who|whom|where|when|how)\b/i.test(stripVocative(segs[0] ?? ''));
  if (!(wh && segs.length === 2) && segs.slice(1).some((x) => x.split(/\s+/).length <= 2 && !ASIDE.test(x))) return null;
  const a = clauseOption(segs[segs.length - 1] ?? '');
  const b = clauseOption(m[2].split(/\s*,\s*/)[0]);
  if (!a || !b || a.split(/\s+/).length > 5 || b.split(/\s+/).length > 5) return null;
  return [a, b];
}

/**
 * The code parser's pair after the same label check as the model's options. Several readings are tried, the strict
 * one first: short sides counted off around "or"; a time against a time clause; each side as a clause; and last the
 * same without the one-axis demand. The first that passes the label check is the pair, so a question that names its
 * two options gets a card from them whatever a model made of it (set E, 16 Nov: "No good choices came out" on some
 * runs of "… now or after you eat?", no card at all without a model).
 */
/**
 * "Do you want Honey to sit with you tonight, or Carol?", "Should Maria or Grace take you?": the choice is between two
 * people, and each option is the name alone (set E, 16 Nov: "Honey to sit" against "you"). The second side is one
 * name; the first is the name that stands in the left clause (one About me knows, else the only capitalised word
 * there that does not open the sentence).
 */
function namePair(q: string, profile?: Profile): [string, string] | null {
  const s = stripAddress(q).trim();
  const isName = (w: string) => /^[A-Z][\p{L}'-]+$/u.test(w) && !/^(?:Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day$|^(?:January|February|March|April|May|June|July|August|September|October|November|December|I|TV)$/.test(w);
  // two names side by side in the middle of the question
  const mid = /(?<=\s)([A-Z][\p{L}'-]+)\s+or\s+([A-Z][\p{L}'-]+)(?=\s+[a-z])/u.exec(s);
  if (mid && isName(mid[1]) && isName(mid[2]) && (!profile || findPerson(mid[1], profile) || findPerson(mid[2], profile) || isPartnerName(mid[1], profile) || isPartnerName(mid[2], profile))) return [mid[1], mid[2]];
  const m = /^(.*\S)\s*,?\s+or\s+(?:maybe\s+|just\s+)?([A-Z][\p{L}'-]+)\s*\?\s*$/u.exec(s);
  if (!m || !isName(m[2]) || /\bor\b/i.test(m[1])) return null;
  const caps = (m[1].match(/(?<=\s)[A-Z][\p{L}'-]+/gu) ?? []).filter(isName);
  // only where the left clause goes on after the name ("Honey to sit with you"): "… tea or Horlicks?" is read as before
  const known = profile ? caps.filter((w) => findPerson(w, profile) || isPartnerName(w, profile)) : [];
  const pick = known.length === 1 ? known[0] : caps.length === 1 ? caps[0] : null;
  if (!pick || lc(pick) === lc(m[2])) return null;
  const after = m[1].slice(m[1].indexOf(pick) + pick.length).trim();
  if (!after || !(profile && (findPerson(m[2], profile) || isPartnerName(m[2], profile) || findPerson(pick, profile) || isPartnerName(pick, profile)) || /^to\s+[a-z]+/.test(after))) return null;
  return [pick, m[2]];
}

/** The two readings the code is sure of: a time against a time clause, and one name against another. Null when neither applies. */
function surePair(q: string, profile?: Profile): [string, string] | null {
  const tp = isOrNot(q) ? null : timePair(q);
  const timed = tp ? checkSides(tp, q, profile, false, false) : null;
  if (timed) return [timed[0], timed[1]];
  const np = namePair(q, profile);
  return np ? checkPair(np, q, profile) : null;
}

export function codePair(q: string, profile?: Profile): [string, string] | null {
  const same = (x: [string, string] | null, y: [string, string] | null) => !!x && !!y && x[0] === y[0] && x[1] === y[1];
  // "… now or after you eat?", "… before supper or once the news is over?": when the second side says when and the
  // first ends with a time, those two are the options, whatever else could be counted off
  const sure = surePair(q, profile);
  if (sure) return sure;
  const rx = orPair(q);
  const strict = rx ? checkPair(rx, q, profile) : null;
  if (strict) return strict;
  // "…, or not?" and "…, or is that a no?" are one proposal, never a pair
  if (isOrNot(q) || optOutTrim(q)) return null;
  const cp = clausePair(q);
  const clause = cp && !same(cp, rx) ? checkPair(cp, q, profile) : null;
  if (clause) return clause;
  for (const cand of [cp, loosePair(q)]) {
    const loose = cand ? checkSides(cand, q, profile, false, false) : null;
    if (loose) return [loose[0], loose[1]];
  }
  return null;
}

const QUESTION_LEAD = new RegExp(`^(?:${AUX}|want|wanna|fancy|shall|should|would|will|need|up for|you|what|where|who|when|which|how|why|let's)\\b`, 'i');
const LIST_VERB = /^(?:put\s+on|put|watch|make|cook|have|get|wear|play|listen\s+to|go\s+to|visit|ring|call|phone|text|ask|invite|message|email|tell|order|try|read|eat|drink|take|bring|buy|use|see|find|fetch|do|pick)\s+(?:you\s+|us\s+|me\s+)?(?:the\s+|a\s+|an\s+|some\s+)?/i;
/** An item that is something to do, by its first word. */
const ACTION_START = /^(?:wait|rest|sit|stay|go|walk|sleep|write|leave|lie|stand|come|run|drive|play|try|watch|listen|talk|speak|stop|start|carry|keep|turn|switch|open|close|shut|wash|cook|make|help|send|pay|check|hold|move|look|think|finish|skip|nap|relax|give|have|do|let|just)\b/i;
/** A piece of a list that starts a question: an auxiliary with its subject ("do you …"), or an offer. "do your exercises" and "have a rest" are things to do. */
const LIST_Q = new RegExp(`^(?:(?:is|was|are|were|am|do|does|did|can|could|have|has|had)\\s+(?:you|we|i|it|they|he|she|that|this|there)\\b|want|wanna|fancy|shall|should|would|will|need|up for)\\b`, 'i');
/**
 * Three or more options named in the question ("Soup, a sandwich, or leftovers for lunch?", "Tea, coffee or juice?"):
 * every one of them is an option. Simulation 16.11: such a list was read as a pair and the first option was lost.
 * Returns the options after the same label check a pair gets, or null when the question is not a list of short things.
 */
export function orList(q: string, profile?: Profile): string[] | null {
  // "Soup, a sandwich, or leftovers?" opens like "Graham, coffee or tea?": a capitalised word and a comma. The first
  // word is someone being spoken to only when it is an address word, a name About me knows, or a question follows it;
  // otherwise it is the first option. (This is where the simulation's "Soup" was lost: it was taken for a name.)
  let s = q.trim().replace(VOCATIVE_END, '?');
  const v = VOCATIVE.exec(s);
  if (v) {
    const word = v[0].replace(/[,\s]+$/, '').trim();
    const rest = s.slice(v[0].length);
    const spokenTo = ADDRESS.has(lc(word)) || (!!profile && (lc(word) === lc(profile.personName) || lc(word) === lc(profile.partnerName) || !!findPerson(word, profile)));
    // with no name in About me to check against, "Graham, coffee or tea?" keeps its old reading (a name, then a pair)
    const cannotTell = !profile?.personName && !rest.includes(',');
    if (spokenTo || cannotTell || QUESTION_LEAD.test(rest)) s = rest;
  }
  const m = /^(.*\S)\s*,?\s+or\s+([^,?]+?)\s*\?\s*$/i.exec(s);
  if (!m) return null;
  // "…, or not?" after one proposal is a yes / no; after two or more things ("this morning or tonight, or not today?")
  // it is the last of the choices
  const several = /\bor\b/i.test(m[1]) || m[1].split(/\s*,\s*/).filter((x) => x && !ADDRESS.has(lc(x))).length >= 2;
  if ((isOrNot(s) && !several) || optOutTrim(s)) return null;
  // the last item may be "nothing" / "neither" / "just quiet": a real choice, kept as its own tile (set D, 16 Nov:
  // "Jen or Tyler, or neither?" lost "neither", "…, or just quiet?" lost an option)
  const none = NONE_OPTION.exec(m[2].trim());
  // "X, or Y, or Z": each "or" only joins the list. "X or Y, or neither": the first piece holds two of the options.
  let head = m[1].replace(/,\s*$/, '').split(/\s*,\s*/).map((x) => x.trim().replace(/^or\s+/i, '')).filter(Boolean);
  if (head.length === 1 && none) head = head[0].split(/\s+or\s+/i).map((x) => x.trim()).filter(Boolean);
  // a lead-in before the question itself ("For lunch, do you want soup, …") is not an option
  let k = -1;
  head.forEach((x, i) => { if (LIST_Q.test(x)) k = i; });
  if (k > 0) head = head.slice(k);
  // nor is a first piece that only says what for or when ("For lunch, soup, a sandwich, or leftovers?", "Tonight,
  // pasta, pizza or a salad?"), when none of the things after it is of that shape (set E, 16 Nov: a tile "for lunch")
  const sets = (x: string) => /^(?:for|at|on|in|after|before|with|about|by|during)\s+\S/i.test(x) || isTimeOnly(x) || /^(?:so|well|now|ok|okay|right|then|as\s+for\s+\S+)$/i.test(x);
  if (head.length >= 2 && sets(head[0]) && ![...head.slice(1), m[2]].some(sets) && head.length + (none ? 0 : 1) >= 3) head = head.slice(1);
  if (head.length < 2) return null;
  // a list is short pieces; a piece that starts a question of its own ("…, or do you want …") is not read here
  if (!head.slice(1).every((x) => x.split(/\s+/).length <= 4 && !ASIDE.test(x) && !LIST_Q.test(x) && !/\bor\b/i.test(x))) return null;
  if (LIST_Q.test(m[2]) || LABEL_BAD.test(m[2])) return null;
  const last = none ? [] : [m[2]];
  // "… call Tyler this morning or tonight, or not at all?": when every other item says when, so does the first
  const when = [...head.slice(1), ...last].every(isTimeLike) ? timeTail(head[0]) : null;
  const items = [when ?? clauseOption(head[0]), ...[...head.slice(1), ...last].map((x) => clauseOption(x))];
  // the verb the whole list hangs on is not part of the first option ("Shall I put on cricket, westerns, or …")
  // (only when the others are things: in "ring Grace, or write to her, or wait" each item has its own verb)
  const bare = items[0].replace(LIST_VERB, '');
  if (bare && !items.slice(1).some((x) => LIST_VERB.test(x) || ACTION_START.test(x))) items[0] = bare;
  // nor is a tail that belongs to all of them part of the last ("… or ice cream with it?")
  items[items.length - 1] = items[items.length - 1].replace(/\s+(?:with|for|on|in|to)\s+(?:it|that|them|this|you|me|us)$/i, '');
  // "the radio on, the TV on": "on" says the thing is switched on; the option is the thing ("turn it on" keeps it)
  for (let i = 0; i < items.length; i++) {
    const w = items[i].split(/\s+/);
    if (w.length > 1 && /^(?:on|off)$/i.test(w[w.length - 1]) && !PHRASAL.has(lc(w[w.length - 2]))) items[i] = w.slice(0, -1).join(' ');
  }
  if (items.some((x) => !x || x.split(/\s+/).length > 4)) return null;
  const checked = checkSides(items, q, profile, true);
  if (!checked) return null;
  return none ? [...checked, lc(none[1]).replace(/\s+/g, ' ')] : checked;
}

const NOTICE = /^(?:oh,?\s+)?(?:(?:is|was)\s+(?:that|this)\s+(?!(?:better|ok|okay|alright|all|enough|too|comfortable|comfy|sore|painful|warm|cold|hot|right|good|nice|fine|what|where|who|how|why)\b)(?:the\s+|a\s+|an\s+|your\s+|my\s+|our\s+)?[\p{L}'’-]+(?:\s+[\p{L}'’-]+){0,3}|(?:did\s+you\s+|do\s+you\s+|can\s+you\s+)?(?:hear|see|smell)\s+that|(?:you\s+)?know\s+what|guess\s+what)\s*\?$/iu;
/**
 * "Is that the phone? Do you want to answer it?": the first question only points at something both can hear or see;
 * the one that wants an answer is the second. Returns the pointing part (kept in the line to say) and the question;
 * null when the text does not open that way. Set E, 16 Nov: it was split in two, and on the first card "no" read as
 * "that is not the phone".
 */
export function noticeLead(q: string): { context: string; q: string } | null {
  const m = /^(.+?\?)\s+(\S.*)$/.exec(q.replace(/\s+/g, ' ').trim());
  if (!m || !NOTICE.test(stripVocative(m[1])) || m[2].split(/\s+/).length < 2) return null;
  return { context: m[1], q: normalizeQuestion(m[2]) };
}

/**
 * "Where does it hurt? Head, back, stomach?", "What shall I put on? The radio or a record?": an open question and
 * then the answers the partner offers for it. One question, and its options are exactly the ones named. Returns the
 * question and the options after the label check; null when what follows is a question of its own ("… Is it your
 * head?"), a single word, or anything longer than a short list. Set E, 16 Nov: the list was split off as a second
 * question and lost an item, and the first card showed parts of the body nobody had named.
 */
export function listedAnswers(q: string, profile?: Profile): { q: string; options: string[] } | null {
  const m = /^(.+?\?)\s+(\S[^?]*?)\s*[?.]?\s*$/.exec(q.replace(/\s+/g, ' ').trim());
  if (!m) return null;
  const first = normalizeQuestion(m[1]);
  if (!/^(?:what|where|which|who|whom|when|how)\b/i.test(stripVocative(first))) return null;
  const rest = m[2].trim();
  let items = rest.split(/\s*,\s*(?:or\s+)?|\s+or\s+/i).map((x) => x.trim()).filter(Boolean);
  if (items.length < 2 || items.some((x) => x.split(/\s+/).length > 3 || QUESTION_LEAD.test(x) || LABEL_BAD.test(x))) return null;
  const none = NONE_OPTION.exec(items[items.length - 1]);
  if (none) items = items.slice(0, -1);
  items = items.map((x) => x.replace(/^(?:maybe\s+|perhaps\s+)?(?:your|my|the|a|an|some)\s+/i, ''));
  if (items.length < 2) return null;
  const checked = checkSides(items, `${rest}?`, profile, true, false);
  if (!checked) return null;
  return { q: first, options: none ? [...checked, lc(none[1]).replace(/\s+/g, ' ')] : checked };
}

/** The options code reads from the question: a list of three or more, else the either-or pair. */
export function codeOptions(q: string, profile?: Profile): string[] | null {
  return orList(q, profile) ?? withSame(codePair(q, profile));
}

const OPPOSITES: [string, string][] = [['better', 'worse'], ['more', 'less'], ['easier', 'harder'], ['stronger', 'weaker'], ['warmer', 'cooler'], ['warmer', 'colder'], ['hotter', 'colder'], ['louder', 'quieter'], ['faster', 'slower'], ['higher', 'lower'], ['bigger', 'smaller'], ['tighter', 'looser'], ['lighter', 'heavier'], ['brighter', 'darker'], ['lighter', 'darker'], ['longer', 'shorter']];
/**
 * "Is the hip any better or worse than this morning?" names two ends and leaves out the middle. A pair of opposite
 * comparatives gets "the same" as a third tile (set E, 16 Nov: "about the same" could only go through the way out).
 */
export function withSame<T extends string[] | null>(pair: T): T | string[] {
  if (!pair || pair.length !== 2) return pair;
  const [a, b] = pair.map((x) => lc(x).replace(/^(?:any|a\s+bit|a\s+little|much|getting|feeling)\s+/, ''));
  return OPPOSITES.some(([x, y]) => (a === x && b === y) || (a === y && b === x)) ? [...pair, 'the same'] : pair;
}

/**
 * "…, or rest. Which one?", "Tea or coffee? Which would you like?": the words that only ask the person to choose are
 * not part of the last option. Returns the question without them (set E, 16 Nov: a tile "rest Which one").
 */
export function dropWhichOne(q: string): string {
  const m = /^(.*\bor\b.*?)\s*[.?!,;:–-]\s*(?:so\s+|now\s+)?(?:which\s+(?:one|is\s+it|would\s+you\s+(?:like|prefer|rather)|do\s+you\s+(?:want|fancy|prefer)|sounds\s+(?:good|best|better)|will\s+it\s+be|shall\s+it\s+be)|what\s+do\s+you\s+(?:think|reckon|say|fancy)|what\s+would\s+you\s+like|what\s+will\s+it\s+be|what'll\s+it\s+be|what's\s+it\s+to\s+be|your\s+(?:choice|pick|call)|you\s+(?:choose|pick|decide))[^?]*[?.!]*\s*$/i.exec(q.replace(/[’]/g, "'").replace(/\s+/g, ' ').trim());
  return m ? `${m[1].replace(/[\s,.;:]+$/, '')}?` : q;
}

/**
 * A plain either-or ("Do you want coffee or tea?"): a short question, no comma, and the pair the code parser read is
 * two options of one or two words each. Such a card needs no model at all. A longer or twisted either-or ("Nina
 * Simone, or would you rather have the Antiques Roadshow on?") still gets the model's copy of the options, which the
 * label check then accepts or rejects: there the model reads better than the parser does.
 */
export function plainPair(q: string, pair: [string, string]): boolean {
  return !q.includes(',') && words(q).length <= 9 && pair.every((p) => words(p).length <= 2);
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ---------------------------------------------------------------- headline (build spec §2.5, §2.16, §2.2)
/** Words a partner uses to address the person: never part of a headline or a label. */
export const ADDRESS = new Set(['ma', 'mum', 'mom', 'mam', 'dad', 'pa', 'love', 'hen', 'pet', 'mate', 'dear', 'darling', 'hon', 'honey', 'sweetheart', 'duck', 'lovey', 'chuck', 'sweetie', 'luv']);
const ADVERB_ONLY = new Set(['again', 'already', 'then', 'still', 'yet', 'just', 'really', 'also', 'too', 'ever', 'never', 'anyway', 'else', 'instead', 'maybe', 'perhaps']);
const NOT_A_TOPIC = new Set([...ADVERB_ONLY, 'wanna', 'gonna', 'gotta', 'me', 'us', 'more', 'kind', 'sort', 'type', 'better', 'best', 'easier', 'bit', 'while', 'moment', 'minute', 'rather', 'something', 'anything', 'both', 'either', 'one', 'ones', 'thing', 'things', 'way', 'lot']);
const PAIR_CATEGORY: [string, string[]][] = [
  ['drink', ['tea', 'coffee', 'water', 'juice', 'milk', 'cocoa', 'hot milk', 'hot chocolate', 'squash', 'beer', 'wine', 'cuppa', 'cup of tea', 'brew']],
  ['clothes', ['shirt', 'jumper', 'sweater', 'cardigan', 'jacket', 'coat', 'trousers', 'dress', 'skirt', 'socks', 'shoes', 'slippers', 'hat', 'scarf', 'blue one', 'red one']],
  ['when', ['now', 'later', 'today', 'tonight', 'tomorrow', 'morning', 'afternoon', 'evening', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']],
];

/** A model topic that is one function word or adverb, a placeholder, or empty is no headline (§2.16). */
export function validTopic(t: string | undefined, options: string[] = []): string {
  const c = cleanTopic(t ?? '');
  if (!c) return '';
  const l = lc(c);
  if (/\b(?:Person|Food|Place|Show|Music|Thing|Name) [A-Z]\b/.test(c)) return '';
  const ws = l.split(' ');
  if (ws.length === 1 && (STOP.has(l) || ADVERB_ONLY.has(l) || ADDRESS.has(l))) return '';
  for (const o of options.map(lc)) if (l === o || l.includes(o) || o.includes(l)) return '';
  return c;
}

/**
 * Headline for an or-pair: the shared topic, never one of the options. In order: the question's own time or topic
 * words left once the two sides are removed ("this weekend", "lunch"); a category both sides belong to ("drink");
 * the model's topic when it names neither side; the pair itself when short; else "which one".
 */
export function orHeadline(q: string, all: string[], profile?: Profile, modelTopic = ''): string {
  let s = q.replace(/[?.!]+$/, '');
  // the "nothing / neither" tile of a list is taken out of the question like any side, but the topic is what the
  // other sides share
  const pair = all.some(isNoneOption) ? all.filter((x) => !isNoneOption(x)) : all;
  for (const side of all) {
    const re = new RegExp(`\\b${esc(side)}(?:'s|s|es)?\\b`, 'i');
    if (re.test(s)) s = s.replace(re, ' ');
    else for (const w of words(side)) s = s.replace(new RegExp(`\\b${esc(w)}(?:'s|s|es)?\\b`, 'gi'), ' ');
  }
  s = s.replace(/\s+/g, ' ').trim();
  const time = /\b((?:this|next|on|for)\s+(?:weekend|morning|afternoon|evening|week|month|year|lunch|dinner|tea|breakfast|supper|christmas|easter|birthday|monday|tuesday|wednesday|thursday|friday|saturday|sunday|arvo|avo)|tonight|today|tomorrow)\b/i.exec(s);
  if (time) return time[1].replace(/^(?:for|on)\s+/i, '').replace(/^(?:Tonight|Today|Tomorrow|This|Next)\b/, (w) => lc(w));
  // what is left of a clause that belonged to one side ("… or wait till she calls us?" -> "till she calls us") is no
  // topic: simulation 16.11, headline "till calls"
  s = s.replace(CUT, '');
  const name = lc(profile?.personName ?? '');
  const content = (s.match(/[A-Za-z][A-Za-z'-]*/g) ?? []).filter((w) => {
    // ("that's tingling": the contraction is its first word, which is no topic)
    const l = lc(w).replace(/'(?:s|re|ve|ll|d)$/, '');
    return !STOP.has(l) && !ADDRESS.has(l) && !NOT_A_TOPIC.has(l) && !FRAME.has(l) && !DET.has(l) && !PREP.has(l) && !/^(?:or|and|not|no)$/.test(l) && l !== name && !/^[A-Z]/.test(w);
  });
  if (content.length) return content.slice(0, 3).join(' ');
  const low = pair.map((p) => lc(p).replace(/^(?:the|a|an)\s+/, ''));
  for (const [cat, members] of PAIR_CATEGORY) if (low.every((p) => members.includes(p) || members.some((m) => p.endsWith(` ${m}`)))) return cat;
  if (profile) {
    const lists: [string, string[]][] = [['who', profile.people.map((p) => p.name)], ['where to', profile.places], ['food', profile.foods], ['TV', profile.tv], ['music', profile.music]];
    for (const [cat, items] of lists) if (items.length && low.every((p) => items.map((i) => lc(i).replace(/^the\s+/, '')).includes(p))) return cat;
  }
  if (pair.every(isTimeOnly)) return 'when';
  const mt = validTopic(modelTopic, pair);
  if (mt) return mt;
  // "clinic on Willow Street" / "clinic at Mercy Hospital": the thing both sides are a kind of
  const shared = words(pair[0] ?? '').find((w) => !STOP.has(w) && !DET.has(w) && !PREP.has(w) && !NOT_A_TOPIC.has(w) && w !== name && pair.every((p) => (words(p) as string[]).includes(w)));
  if (shared && pair.length >= 2 && pair.every((p) => words(p).length > 1)) return shared;
  const joined = pair.length === 2 ? `${pair[0]} or ${pair[1]}` : '';
  if (joined && joined.split(/\s+/).length <= 5) return joined;
  return 'which one';
}

// ---------------------------------------------------------------- rule 10 (part): numbers as figures (§2.9)
const UNITS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };
const TENS_ORD: Record<string, number> = { twentieth: 20, thirtieth: 30, fortieth: 40, fiftieth: 50, sixtieth: 60, seventieth: 70, eightieth: 80, ninetieth: 90, hundredth: 100 };
const TENS: Record<string, number> = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const UNIT_ORD: Record<string, number> = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9 };
const suffix = (n: number) => (n % 100 >= 11 && n % 100 <= 13 ? 'th' : n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd' : n % 10 === 3 ? 'rd' : 'th');
const UNIT_RE = Object.keys(UNITS).join('|');

/**
 * Rule 10 (part). Times and big ordinals are written as figures on a card: "half past ten" -> "10:30", "three pm" ->
 * "3 pm", "eightieth" -> "80th". On a "when" card, a bare number word becomes a figure too ("eleven" -> "11").
 */
export function figures(label: string, whenCard = false): string {
  let s = label;
  s = s.replace(new RegExp(`\\bhalf\\s+past\\s+(${UNIT_RE}|\\d{1,2})\\b`, 'gi'), (_, h) => `${UNITS[lc(h)] ?? h}:30`);
  s = s.replace(new RegExp(`\\bquarter\\s+past\\s+(${UNIT_RE}|\\d{1,2})\\b`, 'gi'), (_, h) => `${UNITS[lc(h)] ?? h}:15`);
  s = s.replace(new RegExp(`\\bquarter\\s+to\\s+(${UNIT_RE}|\\d{1,2})\\b`, 'gi'), (_, h) => `${((UNITS[lc(h)] ?? Number(h)) + 10) % 12 + 1}:45`);
  s = s.replace(new RegExp(`\\b(${UNIT_RE})\\s+o'?clock\\b`, 'gi'), (_, h) => `${UNITS[lc(h)]}:00`);
  s = s.replace(new RegExp(`\\b(${UNIT_RE}|\\d{1,2})\\s*(am|pm|a\\.m\\.|p\\.m\\.)\\b`, 'gi'), (_, h, ap) => `${UNITS[lc(h)] ?? h} ${lc(ap).replace(/\./g, '')}`);
  s = s.replace(new RegExp(`\\b(${Object.keys(TENS).join('|')})[\\s-](${Object.keys(UNIT_ORD).join('|')})\\b`, 'gi'), (_, t, u) => { const n = TENS[lc(t)] + UNIT_ORD[lc(u)]; return `${n}${suffix(n)}`; });
  s = s.replace(new RegExp(`\\b(${Object.keys(TENS_ORD).join('|')})\\b`, 'gi'), (_, t) => { const n = TENS_ORD[lc(t)]; return `${n}${suffix(n)}`; });
  if (whenCard) s = s.replace(new RegExp(`\\b(${UNIT_RE})\\b(?=\\s*$|\\s+(?:in the|tonight|tomorrow|today))`, 'gi'), (_, h) => String(UNITS[lc(h)]));
  return s;
}

/**
 * "Calendar" when the question says "Country Calendar" (an About-me item): an option that is part of an About-me
 * item written in full in the question takes the whole item.
 */
export function snapToQuestionItem(option: string, q: string, profile: Profile): string {
  const lq = lc(q);
  const lo = lc(option).replace(/^the\s+/, '');
  for (const item of [...profile.foods, ...profile.places, ...profile.tv, ...profile.music, ...(profile.other ?? []), ...profile.people.map((p) => p.name)]) {
    const it = lc(item).replace(/^the\s+/, '');
    if (it.length > lo.length && new RegExp(`\\b${it.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(lq) && new RegExp(`\\b${lo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(it)) {
      return item.replace(/^the\s+/i, '');
    }
  }
  return option;
}

/** Kept for callers: "X, or Y?" with a comma. */
export function commaOrPair(q: string): [string, string] | null {
  if (!/,\s*or\s/i.test(q)) return null;
  return clausePair(q);
}

/** Any "or" question that is not "or not": it offers options, so it is never a plain yes/no card. */
export function offersOptions(q: string): boolean {
  return /\bor\b/i.test(q) && !isOrNot(q);
}

const BODY_SIDE = /\b(hand|hands|arm|arms|leg|legs|foot|feet|side|sides|ear|ears|eye|eyes|knee|knees|shoulder|shoulders)\b/i;
/** Rule 3 (part). No "both", except body sides ("both hands"). */
export function dropBoth(choices: string[], q: string): string[] {
  if (BODY_SIDE.test(q)) return choices;
  return choices.filter((c) => !/^both\b/i.test(c.trim()));
}

// ---------------------------------------------------------------- rule 4
const BODY_WORD = /\b(hurt|hurts|hurting|pain|painful|ache|aches|aching|numb|sore)\b/i;
const MEDICINE = /\b(medicine|medication|tablet|tablets|pill|pills|relief|killers?|cream)\b/i;

const PAIN_NOUN = /\b(pain|pains|ache|aches|aching|sore|soreness|hurting|headache|backache|toothache)\b/i;
const NOT_THE_PAIN = /\b(clinic|nurse|doctor|appointment|team|specialist|management)\b/i;
const NUM = '(?:0|1|zero|one|nought)';
const NUM_TOP = '(?:5|10|five|ten)';
const NUMBER_SCALE = new RegExp(`\\b(?:from\\s+)?(${NUM})\\s*(?:to|-|–)\\s*(${NUM_TOP})\\b|\\bout\\s+of\\s+(${NUM_TOP})\\b`, 'i');
const NUM_VALUE: Record<string, number> = { zero: 0, nought: 0, one: 1, five: 5, ten: 10 };

const BODY_PARTS = '(?:back|hips?|knees?|shoulders?|neck|head|legs?|arms?|foot|feet|hands?|wrists?|ankles?|elbows?|stomach|tummy|belly|chest|throat|tooth|teeth|jaw|ears?|fingers?|toes?|ribs|joints?|wound|scar|stitches|bruise)';
const BODY_PART = new RegExp(`\\b${BODY_PARTS}\\b`, 'i');
/** "How's your hip?", "How is that knee today?", "How are your feet, love?": the part, then the end of the question or a time. */
const HOW_PART = new RegExp(`^\\s*(?:and\\s+|so\\s+)?how(?:'s|\\s+is|\\s+are|\\s+was|\\s+were)\\s+(?:your|the|that|this)\\s+(?:(?:bad|sore|poor|left|right|other|dodgy|new|lower|upper)\\s+)?${BODY_PARTS}(?=\\s*(?:[?,.]|$|today|now|tonight|this\\b|feeling|doing|holding|after|since|at\\s+the\\s+moment|these\\s+days|on\\s+a\\s+scale|out\\s+of|from\\s+(?:0|1|zero|one)|(?:0|1|zero|one)\\s*(?:to|-)))`, 'i');

/** The number scale a question names ("from 0 to 10", "1-5", "out of ten"), or null. */
export function numberScale(q: string): { lo: number; hi: number } | null {
  const m = NUMBER_SCALE.exec(q);
  if (!m) return null;
  const n = (x: string) => NUM_VALUE[lc(x)] ?? Number(x);
  return m[3] ? { lo: 0, hi: n(m[3]) } : { lo: n(m[1]), hi: n(m[2]) };
}

/**
 * Rule 4. "How much pain / how bad is the ache" -> fixed pain level card. Since the simulation of 16.11 also: a "how
 * is" question about the pain itself ("How's the pain in your arm today?" got the general good / bad scale), and any
 * pain question that names a number scale.
 */
export function isPainLevel(q: string): boolean {
  if (MEDICINE.test(q)) return /\bpain\s+(level|score)\b/i.test(q);
  // "How's your hip?", "How's your back today, zero to ten?": asking after a part of the body is asking about pain
  // (set D, 16 Nov: both got the general good / bad card, and the number was lost)
  if (HOW_PART.test(stripVocative(q))) return true;
  if (BODY_PART.test(q) && !!numberScale(q) && !/\b(where|which)\b/i.test(q)) return true;
  if (/\bhow\s+(much|bad)\b/i.test(q) && (BODY_WORD.test(q) || PAIN_NOUN.test(q))) return true;
  if (/\bpain\s+(level|score)\b/i.test(q)) return true;
  if (FEELING_Q.test(stripVocative(q)) && PAIN_NOUN.test(q) && !NOT_THE_PAIN.test(q)) return true;
  return (BODY_WORD.test(q) || PAIN_NOUN.test(q)) && !!numberScale(q) && !/\b(where|which)\b/i.test(q);
}

/**
 * The number line for a scale the question named: every number, in order ("0" … "10"), so the person can point at
 * the number itself. (Before set D of 16 Nov the card showed two or three ranges, "a lot (6 to 10)", and the number
 * was lost.) Null when the scale is too long for one line.
 */
export function painNumbers(scale: { lo: number; hi: number }): string[] | null {
  const n = scale.hi - scale.lo + 1;
  if (n < 2 || n > 11) return null;
  return Array.from({ length: n }, (_, i) => String(scale.lo + i));
}

/** Rule 4. Pain or body "where" questions -> fixed two-step body map (never model choices: a safety rule). */
export function isBodyWhere(q: string): boolean {
  if (MEDICINE.test(q) || isPainLevel(q)) return false;
  return (BODY_WORD.test(q) && /\b(where|which|what)\b/i.test(q)) || /\bwhere does it hurt\b/i.test(q);
}

/** Pain level, by support: up to 3 steps at "mild", 2 at "more"/"most" (KB §7 rule 5). */
export const PAIN_LEVELS: Record<'mild' | 'more', string[]> = { mild: ['a little', 'some', 'a lot'], more: ['a little', 'a lot'] };
/** Step 1 of the body map: one body part per target (never "chest or stomach" on one tile). */
export const BODY_REGIONS: BodyRegion[] = ['head', 'chest', 'stomach', 'back', 'arms', 'legs'];
/** Step 2: where in that part. */
export const BODY_DETAIL: Record<BodyRegion, string[]> = {
  head: ['top of head', 'face', 'eyes', 'ears', 'mouth', 'neck'],
  chest: ['left side', 'middle', 'right side'],
  stomach: ['upper stomach', 'lower stomach'],
  back: ['upper back', 'lower back'],
  arms: ['left arm', 'right arm', 'hands'],
  legs: ['left leg', 'right leg', 'feet'],
};

// ---------------------------------------------------------------- rule 5
const FEELING_Q = /^\s*(how\s+(was|is|are|were|did|do\s+you\s+(find|feel|like))|how's|what\s+do\s+you\s+think\s+(of|about))\b/i;
export function isFeelingQuestion(q: string): boolean {
  return FEELING_Q.test(stripVocative(q));
}

const MEALS = ['lunch', 'dinner', 'breakfast', 'supper', 'tea', 'meal', 'soup', 'food', 'sandwich', 'cake', 'curry', 'stew', 'pie', 'coffee'];
const ROLE_NOUNS = ['carer', 'caregiver', 'nurse', 'doctor', 'therapist', 'neighbour', 'neighbor', 'cleaner', 'driver', 'helper', 'physio', 'him', 'her', 'them'];

/** Rule 5. Which scale a feeling question gets. */
export function feelingSubtype(q: string, profile?: Profile): FeelingSubtype {
  const s = lc(q);
  const foods = (profile?.foods ?? []).map(lc);
  if (/\b(taste|tasted|tasty|flavou?r)\b/.test(s)) return 'taste';
  const how = /^\s*how\s+(?:was|is|were|are)\s+(?:the\s+|your\s+|that\s+)?([a-z]+)/.exec(s);
  if (how && (MEALS.includes(how[1]) || foods.includes(how[1]))) return 'taste';
  if (/\b(result|results|score|scores|outcome)\b/.test(s) || /^\s*how\s+did\s+(?:the\s+|your\s+)?(?:scan|test|tests|exam|match|game|interview|appointment)\s+go\b/.test(s)) return 'result';
  const think = /\bthink\s+(?:of|about)\s+(?:the\s+new\s+|your\s+new\s+|the\s+|your\s+|our\s+)?([a-z']+)/.exec(s);
  if (think) {
    const w = think[1];
    const names = (profile?.people ?? []).map((p) => lc(p.name));
    if (ROLE_NOUNS.includes(w) || names.includes(w.replace(/'s$/, ''))) return 'person';
    if (/ing$/.test(w) || ['idea', 'plan', 'suggestion'].includes(w)) return 'idea';
  }
  if (/\b(the idea|the plan|a good idea)\b/.test(s)) return 'idea';
  return 'general';
}

/** Feeling scales by subtype and support (rule 4: no negatives in a choice; rule 5: 2 choices at "more"). */
// Since set E (16 Nov) a scale that runs from good to bad has its middle at every support level: with "good / bad"
// alone, "so-so" and "a bit sad" could only go through the way out. A scale is one idea on one line, so its three
// steps stand on one card also at "2 at a time" (like three options the partner named, and the pain number line).
export const FEELING_SCALES: Record<FeelingSubtype, Record<'mild' | 'more', string[]>> = {
  general: { mild: ['good', 'so-so', 'bad'], more: ['good', 'so-so', 'bad'] },
  taste: { mild: ['tasty', 'plain', 'too salty'], more: ['tasty', 'plain'] },
  idea: { mild: ['good idea', 'leave it'], more: ['good idea', 'leave it'] },
  result: { mild: ['good', 'so-so', 'bad'], more: ['good', 'so-so', 'bad'] },
  person: { mild: ['like them', 'okay', 'unhappy'], more: ['like them', 'okay', 'unhappy'] },
};

/** KB §7 rule 5: up to 3 choices (plus the escape) at "mild"; 2 at "more" and "most". */
export function choiceCap(support: 'mild' | 'more' | 'most'): number {
  return support === 'mild' ? 3 : 2;
}
export const scaleLevel = (support: 'mild' | 'more' | 'most'): 'mild' | 'more' => (support === 'mild' ? 'mild' : 'more');

// ---------------------------------------------------------------- rule 8
/** Rule 8. The escape choice by question type. */
export function escapeFor(q: string, answers: string[] = [], profile?: Profile): string {
  q = stripVocative(q);
  if (/^\s*(who|whom)\b/i.test(q) || /^\s*which\s+(person|one of them)\b/i.test(q)) return 'someone else';
  if (/^\s*where\b/i.test(q)) return 'somewhere else';
  const real = answers.filter((a) => !NONE_OPTION.test(a));
  if (profile && real.length >= 2 && real.every((a) => findPerson(a, profile) || isPartnerName(a, profile))) return 'someone else';
  // "Honey or Carol": a name About me knows next to one it does not is still a choice between people
  if (profile && real.length >= 2 && real.every((a) => /^[A-Z][\p{L}'-]+$/u.test(a.trim())) && real.some((a) => findPerson(a, profile) || isPartnerName(a, profile))) return 'someone else';
  return 'something else';
}

// ---------------------------------------------------------------- rule 9
// (with the -ing and past forms since set D of 16 Nov: "Who do you think was calling just now?" offered "you", the partner)
const CONTACT = /\b(call|calls|calling|called|ring|rings|ringing|rang|phone|phones|phoning|phoned|visit|visits|visiting|visited|invite|invites|inviting|invited|text|texting|texted|message|messaging|messaged|write\s+to|at\s+the\s+door|knocking|knocked)\b/i;
const GENERIC_PERSON = /\b(another person|someone|somebody|other person|a friend)\b/i;
const SEE = /\b(see|seeing|meet|meeting|have\s+(?:over|round|around)|come\s+(?:over|round|around|by)|drop\s+in|pop\s+(?:in|round|over)|talk\s+to|speak\s+to|chat\s+(?:to|with)|catch\s+up\s+with|hear\s+from|skype|facetime)\b/i;
const ON_SCREEN = /\b(tv|telly|television|film|movie|show|programme|program|match|game|win|play|sing|stage|concert)\b/i;

/**
 * A question about getting in touch with someone: call / visit / invite, and, on a "who" question, see / meet / have
 * over (simulation 16.11: "Who do you want to see this week?" got no card with cloud help only, and offered "you",
 * who lives here, on this computer). "Who do you want to see win?" and "see on TV" are not contact.
 */
export function isContactQ(q: string): boolean {
  if (CONTACT.test(q)) return true;
  const s = stripVocative(q);
  return (/^\s*(who|whom)\b/i.test(s) || /^\s*which\s+(person|one of them)\b/i.test(s)) && SEE.test(s) && !ON_SCREEN.test(s);
}

export function findPerson(label: string, profile: Profile): Person | undefined {
  const w = new Set(words(label).map((x) => x.replace(/'s$/, '')));
  return profile.people.find((p) => (p.name && w.has(lc(p.name))) || (p.nickname && w.has(lc(p.nickname))));
}
export function isPartnerName(label: string, profile: Profile): boolean {
  return !!profile.partnerName && words(label).map((x) => x.replace(/'s$/, '')).includes(lc(profile.partnerName));
}

/**
 * Rule 9. For call / visit / invite questions, household members (and the partner) are removed,
 * and a generic "another person" choice is replaced by a named person who does not live in the home.
 */
export function householdFilter(choices: string[], q: string, profile: Profile): string[] {
  if (!isContactQ(q)) return choices;
  const out = choices.filter((c) => {
    const p = findPerson(c, profile);
    return !(p && p.household) && !isPartnerName(c, profile);
  });
  const used = new Set(out.map((c) => findPerson(c, profile)?.id).filter(Boolean));
  const spare = profile.people.filter((p) => !p.household && !used.has(p.id));
  return out
    .map((c) => {
      if (!GENERIC_PERSON.test(c)) return c;
      const p = spare.shift();
      return p ? c.replace(GENERIC_PERSON, p.name) : '';
    })
    .filter(Boolean);
}

/**
 * Rule 9 (part, "never invent names"). On who / call / visit / invite questions, a capitalised name the profile
 * doesn't know is dropped (the on-device model sometimes makes one up). Real people come from About me only.
 */
export function inventedNameFilter(choices: string[], q: string, profile: Profile): string[] {
  // also on any question about a name or about who someone is: simulation 16.11, "…granddaughter's name again?" put
  // a made-up "Emma" on the next page
  if (!/^\s*(who|whom)\b/i.test(stripVocative(q)) && !isContactQ(q) && !ABOUT_A_NAME.test(q)) return choices;
  const known = new Set(
    [profile.partnerName, ...profile.people.map((p) => p.name), ...profile.people.map((p) => p.nickname ?? ''), ...profile.places, ...profile.tv, ...profile.music, ...profile.foods,
      // a name the partner typed in the question is theirs, not the model's
      ...(q.match(/\b[A-Z][a-z']+\b/g) ?? []).map((w) => w.replace(/'s$/, ''))]
      .filter(Boolean).map(lc),
  );
  return choices.filter((c) => {
    const caps = c.split(/\s+/).filter((w) => /^[A-Z][a-z']+$/.test(w)).map((w) => lc(w).replace(/'s$/, ''));
    return caps.every((w) => known.has(w) || [...known].some((k) => k.split(' ').includes(w)));
  });
}

const ABOUT_A_NAME = /\bnames?\b|\bcalled\b|\bwho(?:'s|\s+is|\s+are|\s+was|\s+were)\b/i;

/**
 * The person the card is for is never one of its choices on a question about people (simulation 16.11: "What's our
 * grandson's name?" offered "Frank", the person himself, on the next page).
 */
export function selfFilter(choices: string[], q: string, profile: Profile): string[] {
  const me = lc(profile.personName ?? '');
  if (!me || (questionType(q) !== 'who' && !isContactQ(q) && !ABOUT_A_NAME.test(q))) return choices;
  return choices.filter((c) => !words(c).map((w) => w.replace(/'s$/, '')).includes(me));
}

// ---------------------------------------------------------------- rule 10
const DAY = new Set(['today', 'tomorrow', 'tonight', 'next week', 'this week', 'weekend', 'the weekend', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']);
const PART = new Set(['morning', 'afternoon', 'evening', 'night', 'now', 'later', 'soon']);
/** Rule 10. Time choices stay on one scale: days or parts of the day, never mixed. */
export function timeScaleFilter(choices: string[]): string[] {
  const lows = choices.map(lc);
  const nDay = lows.filter((x) => DAY.has(x)).length;
  const nPart = lows.filter((x) => PART.has(x)).length;
  if (!nDay || !nPart) return choices;
  const keep = nDay >= nPart ? DAY : PART;
  return choices.filter((c) => !(DAY.has(lc(c)) || PART.has(lc(c))) || keep.has(lc(c)));
}

// ---------------------------------------------------------------- overlap
const CATEGORIES: Record<string, string[]> = {
  toys: ['doll', 'game', 'ball', 'puzzle', 'teddy', 'lego'],
  clothes: ['shirt', 'jacket', 'sweater', 'jumper', 'socks', 'trousers', 'dress', 'shoes', 'coat', 'scarf', 'hat'],
  drinks: ['tea', 'coffee', 'water', 'juice', 'milk'],
  sweets: ['chocolate', 'cake', 'biscuits'],
};
const PEOPLE_CATEGORIES = ['family', 'people', 'friends', 'relatives', 'grandchildren', 'kids', 'children', 'someone'];

/** Category and name overlap: drop a category next to one of its members, and a relation word next to the named person. */
export function overlapFilter(choices: string[], profile: Profile): string[] {
  const lows = choices.map((c) => lc(c).trim());
  const cats: Record<string, string[]> = {
    ...CATEGORIES,
    food: profile.foods.map(lc),
    music: profile.music.map(lc),
    tv: profile.tv.map(lc),
  };
  const drop = new Set<number>();
  lows.forEach((c, i) => {
    const members = cats[c] ?? cats[c.replace(/s$/, '')];
    if (members && lows.some((o, j) => j !== i && members.includes(o))) drop.add(i);
    if (PEOPLE_CATEGORIES.includes(c) && choices.some((o, j) => j !== i && findPerson(o, profile))) drop.add(i);
    const rel = profile.people.find((p) => p.relation && lc(p.relation) === c);
    if (rel && choices.some((o, j) => j !== i && findPerson(o, profile)?.id === rel.id)) drop.add(i);
    // one choice fully inside another ("Emma" next to "Emma's photo"): keep the shorter, plainer word
    if (lows.some((o, j) => j !== i && o !== c && o.length < c.length && new RegExp(`\\b${o.replace(/[^a-z0-9' ]/g, '')}\\b`).test(c))) drop.add(i);
  });
  return choices.filter((_, i) => !drop.has(i));
}

// ---------------------------------------------------------------- fit, negatives, made-up options
/** KB §7 rule 4: no negatives in a choice ("don't mind", "not great"). The escape "not sure" is added by code. */
export function hasNegative(choice: string): boolean {
  return NEG.test(choice);
}

const TIME_WORD = /\b(now|later|soon|today|tonight|tomorrow|yesterday|ago|morning|afternoon|evening|night|lunchtime|teatime|bedtime|weekend|week|month|monday|tuesday|wednesday|thursday|friday|saturday|sunday|o'clock|half past|quarter|noon|midday|early|late|after|before|\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/i;
const PERSONISH = /\b(friend|mate|neighbou?r|carer|nurse|doctor|gp|therapist|physio|driver|boss|family|someone|somebody|nobody|everyone|brother|sister|mum|dad|mother|father|son|daughter|uncle|aunt|cousin|wife|husband|grandson|granddaughter|grandchild|grandchildren|vicar|priest|teacher|colleague|workmate|postman|postie|cleaner|hairdresser|barber|chemist|pharmacist|dentist|optician|plumber|builder|landlord|butcher|milkman|manager|coach|captain|team|people|kids|children|grandkids|partner|pal|lads?|girls|boys|man|woman|lady|bloke|guy|minister|councillor|vet)\b/i;
const PAST_LIFE = /\b(used to|when you were|back then|years ago|growing up|at school|at work|in the army|in the war|on the buses|best (?:mate|friend|pal)|old (?:mate|friend|pal|boss|job)|first (?:job|car|house|love|boss))\b/i;
const SAY_Q = /^\s*what\b.*\b(say|tell|write|text|message)\b/i;

export type QType = 'who' | 'where' | 'when' | 'say' | 'what';
export function questionType(q: string): QType {
  q = stripVocative(q);
  if (/^\s*(who|whom)\b/i.test(q) || /^\s*which\s+(person|one of them)\b/i.test(q)) return 'who';
  if (/^\s*where\b/i.test(q)) return 'where';
  if (/^\s*(when|what\s+time|what\s+day)\b/i.test(q)) return 'when';
  if (SAY_Q.test(q)) return 'say';
  return 'what';
}

function isProfileThing(c: string, profile: Profile): boolean {
  const l = lc(c);
  return [...profile.foods, ...profile.places, ...profile.tv, ...profile.music].some((x) => {
    const e = lc(x).replace(/^the\s+/, '');
    return e === l.replace(/^the\s+/, '');
  });
}

/**
 * Choices that don't fit the question's type: a "who" question gets people, a "where" question places,
 * a "when" question times, a "what to say" question things one would say. Family and carer are not offered
 * for a person from the past ("Who was your best mate at school?"). Returns the kept choices and the dropped ones.
 */
export function fitFilter(choices: string[], q: string, profile: Profile): { kept: string[]; dropped: string[] } {
  const t = questionType(q);
  const pastLife = PAST_LIFE.test(q);
  const isPerson = (c: string) => !!findPerson(c, profile) || isPartnerName(c, profile) || PERSONISH.test(c) || /^[A-Z][a-z]+$/.test(c.trim());
  const isMood = (c: string) => c.trim().split(/\s+/).length === 1 && MOOD_WORDS.has(lc(c.trim()));
  const fits = (c: string): boolean => {
    // whatever the type: no bare yes/no words on a choice card, no broken grammar, no question as a label
    if (YESNO_WORD.test(c.trim()) || BROKEN.test(c.trim()) || (LABEL_BAD.test(c.trim()) && /\byou\b/i.test(c))) return false;
    if (t === 'who') {
      if (!isPerson(c) || isMood(c) || TIME_WORD.test(c) || isProfileThing(c, profile)) return false;
      if (pastLife && (findPerson(c, profile) || isPartnerName(c, profile))) return false;
      return true;
    }
    if (t === 'where') return !(findPerson(c, profile) || isPartnerName(c, profile) || isMood(c) || (TIME_WORD.test(c) && !isProfileThing(c, profile)));
    if (t === 'when') return TIME_WORD.test(c);
    if (t === 'say') return !isMood(c);
    return true;
  };
  const kept: string[] = [];
  const dropped: string[] = [];
  for (const c of choices) {
    // two choices that mean the same thing ("relax" and "rest") are one choice
    const g = SYNONYMS.findIndex((grp) => grp.includes(lc(c.trim())));
    const dup = g >= 0 && kept.some((k) => SYNONYMS[g].includes(lc(k.trim())));
    (fits(c) && !dup ? kept : dropped).push(c);
  }
  return { kept, dropped };
}

const YESNO_WORD = /^(?:yes|no|yeah|yep|nope|okay|ok|sure|maybe|alright|all right)$/i;
/** A verb that needs a little word before its object: "listen music", "talk Ann" are broken labels. */
const BROKEN = /^(?:listen|look|talk|wait|speak|worry|think|go|come|chat)\s+(?!(?:to|at|for|out|in|up|on|about|home|back|away|over|round|around|down|with|alone|now|later|off|outside|inside|shopping|swimming|walking|fishing|together|there|here|soon|again|tomorrow|today|tonight|early|late|by|first|next|along|straight|right)\b)[a-z]+/i;
const SYNONYMS = [
  ['relax', 'rest', 'have a rest', 'chill', 'take it easy', 'put my feet up'],
  ['tired', 'sleepy', 'exhausted', 'worn out'],
  ['sad', 'down', 'low', 'upset', 'fed up'],
  ['okay', 'ok', 'fine', 'alright', 'all right'],
  ['later', 'another time', 'not now'],
  ['music', 'songs', 'listen to music', 'some music'],
];

// ---------------------------------------------------------------- KB §7 rule 9: no quiz questions
// A question is a test when it asks the person to retrieve something rather than to choose or to say what they
// think. Four kinds, matched by structure (not by a list of known questions):
//   now       a fact about the present: the day, the date, the month, the year, the time
//   identity  who someone is: "What's my name?", "Who am I?", "Who's this?"
//   remember  any question that asks them to remember or recall ("Do you remember ...", "Remember when ...?")
//   fact      a past or personal fact with a single right answer: a year, a date, an age, a name, "when did ...",
//             "how long ago", "how many ... have we got"
//   place     where they are now, the season, who is in charge: an orientation test ("Where are we right now?")
//   recall    what happened earlier today or lately ("What did you have for breakfast?", "What did he say?"): the
//             answer has to be retrieved, the app cannot know it either, and any tile would be made up. Only "what
//             did … / what have you had …"; a "who" or "where" question about the past still gets a card
export type QuizKind = 'now' | 'identity' | 'remember' | 'fact' | 'place' | 'recall';
const KIN = 'wife|husband|son|daughter|sister|brother|mother|father|mum|mom|dad|grandson|granddaughter|grandchild|grandchildren|grandkids|niece|nephew|aunt|auntie|uncle|cousin|children|kids|doctor|gp|carer|nurse|neighbour|neighbor';

const NOW_Q = /\bwhat\s+(?:day|date|month|year|time)\s+(?:is\s+it|it\s+is)\b|\bwhat(?:'s|\s+is)\s+(?:today'?s|the)\s+(?:date|day)\b|\bwhat\s+day\s+(?:is\s+)?(?:it\s+)?today\b|\bwhat(?:'s|\s+is)\s+the\s+time\b/i;
const IDENTITY_Q = /\bwhat(?:'s|\s+is)\s+my\s+name\b|\bwho\s+am\s+i\b|\bknow\s+who\s+i\s+am\b|\bwho(?:'s|\s+is)\s+(?:this|that)(?:\s+in\s+the\s+(?:photo|picture))?\s*\?/i;
const REMEMBER_Q = /\b(?:remember|recall)\b(?!\s+to\b)|\bdo\s+you\s+mind\s+(?:when|the\s+time)\b/i;
const FACT_TARGET = [
  /\b(?:what|which)\s+year\b/i,
  /\b(?:what|which)\s+(?:month|date|day)\s+(?:was|were|did|had)\b/i,
  /\bwhen\s+(?:was|were|did|had)\s+(?!the\s+last\s+time)(?:that|it|we|you|they|he|she|the|our|your|my|his|her|\w+)\b/i,
  /\bhow\s+(?:long\s+ago|many\s+years)\b/i,
  /\bhow\s+old\s+(?:is|was|are|were|will)\s+(?!you\s+feel)/i,
  /\bwhen(?:'s|\s+is)\s+(?:your|our|my|his|her|their|\w+'s)\s+(?:birthday|anniversary)\b/i,
  /\bhow\s+many\s+\w+\s+(?:have\s+we\s+got|do\s+we\s+have|have\s+you\s+got|did\s+we\s+have)\b/i,
  /\bwhat(?:'s|\s+is|\s+was|\s+were)\s+(?:the\s+|his\s+|her\s+|their\s+|its\s+|\w+'s\s+)?names?\b/i,
  // simulation 16.11: "What's our grandson's name?" was not caught (two words before "name") and became a card of names.
  // Any question that asks for someone's or something's name is a test: the partner knows it.
  /\bwhat(?:'s|\s+is|\s+was|\s+were|\s+are)\s+(?:[\w'’-]+\s+){0,5}names?\b/i,
  /\b(?:know|tell\s+me|say|give\s+me)\s+(?:[\w'’-]+\s+){0,5}names?\b/i,
  /\bwhat\s+(?:do|did)\s+(?:we|you|they)\s+(?:name|call)\b/i,
  new RegExp(`\\bwho(?:'s|\\s+is|\\s+are)\\s+(?:our|your|my)\\s+(?:${KIN})s?\\b`, 'i'),
  // the time or day of something that is already fixed ("What time is the doctor tomorrow?", "When does the nurse
  // come?"): the partner knows it. Not "what time is it" (that is 'now'), not a wish ("when do you want …", "when
  // should …"), not "when is a good time", not the person's own plan ("when are you going to bed?").
  /\b(?:what\s+time|what\s+day|when)(?:'s|\s+is|\s+are|\s+does)\s+(?!it\b|you\b|(?:a\s+|the\s+)?(?:good|best|better|easiest|right|convenient)\b)/i,
  /\bwhat(?:'s|\s+is|\s+was|\s+were)\s+(?:[\w'’-]+\s+){0,5}(?:called|named)\s*\??$/i,
  /\bwhat\s+do\s+(?:we|you)\s+call\b/i,
  /\bwho\s+(?:was|were)\s+(?:that|the|those)\b/i,
];

// Set D of the rehearsal (16 Nov): "Where are we right now?" became a card of About-me places, "What did you have for
// breakfast?" a card of invented foods.
const PLACE_Q = [
  /^\s*(?:so\s+|now\s+|and\s+)?where\s+(?:are|'re)\s+(?:we|you)(?:\s+(?:right\s+now|now|today|at\s+the\s+moment|at|just\s+now))?\s*\?\s*$/i,
  /\b(?:do\s+you\s+know|can\s+you\s+tell\s+me|tell\s+me|any\s+idea)\s+where\s+(?:we|you)\s+are\b/i,
  /\bwhat\s+(?:place|town|city|state|country|county|building|floor|room|street|hospital|season)\s+(?:is\s+(?:this|it)|are\s+(?:we|you)\s+(?:in|on|at)|(?:we|you)\s+are\s+(?:in|on|at))\b/i,
  /\bwhat(?:'s|\s+is)\s+this\s+(?:place|building|room|town|city)\b/i,
  /\bwhere\s+do\s+(?:you|we)\s+live\b/i,
  /\bwhat(?:'s|\s+is)\s+(?:your|our)\s+(?:address|phone\s+number)\b/i,
  /\bwho(?:'s|\s+is)\s+the\s+(?:president|prime\s+minister|king|queen|governor|mayor)\b/i,
];
/** "did you want …" is a polite way to ask what they want now; "what did you think of / enjoy / remember most …" asks them to share, not to retrieve. */
const NOT_RECALL = '(?:want|need|mean|think|like|fancy|prefer|decide|make\\s+of|feel|have\\s+in\\s+mind|hope|expect|say\\s+you\\s+(?:want|need)|remember|recall|enjoy|love|miss)\\b';
const RECALL_SUBJ = "(?:you|we|he|she|they|the\\s+[a-z]+|your\\s+[a-z]+|[A-Z][\\p{L}'-]+)";
const RECALL_Q = [
  // (no "i" flag: a capital marks a name as the subject, "What did Tyler say?")
  new RegExp(`^\\s*(?:[Ss]o\\s+|[Aa]nd\\s+|[Tt]hen\\s+)?[Ww]hat\\s+did\\s+${RECALL_SUBJ}\\s+(?!${NOT_RECALL})`, 'u'),
  /^\s*(?:so\s+|and\s+)?what\s+(?:have|had)\s+you\s+(?:had|eaten|done|been\s+doing|watched|seen|drunk)\b/i,
];
/**
 * A "when did" question about what only the person can feel or know ("When did the pain start?", "When did you last
 * eat?") is not a test: the partner does not know the answer and needs it (set D, 16 Nov: "When did the pain start,
 * this morning or last night?" was refused as a memory test).
 */
const OWN_EXPERIENCE = /\bwhen\s+did\s+(?:the|your|that|this|it|you)\b[^?]*\b(?:pain|pains|ache|aches|aching|hurt|hurting|sore|soreness|headache|dizz\w+|sick\w*|nausea|itch\w*|rash|swelling|cough\w*|fever|bleed\w*|numb\w*|tingl\w+|cramp\w*|feel\w*|notice)\b|\bwhen\s+did\s+(?:it|this|that)\s+(?:start|begin|come\s+on|get\s+(?:bad|worse))\b|\bwhen\s+did\s+you\s+last\b|\bwhen\s+(?:was|were)\s+(?:your|the)\s+last\b/i;

/**
 * "Can you tell me who the president is?", "Do you know what month it is?", "Tell me what you had for lunch?": a test
 * asked politely is still a test (set E, 16 Nov: it became a yes / no card, and "no" read as "I don't know" from a
 * man who knew and could not say it). Returns the plain questions such a sentence wraps ("Who is the president?"),
 * so each can be checked like a question asked straight; empty when the sentence is not of that shape.
 */
const ASK_WRAPPER = /^\s*(?:so\s+|now\s+|and\s+|ok\s+|okay\s+)?(?:(?:can|could|will|would)\s+you\s+(?:please\s+|just\s+)?(?:tell|remind|show)\s+me|(?:do|did)\s+you\s+(?:happen\s+to\s+|still\s+)?know|(?:have\s+you\s+)?(?:got\s+)?any\s+idea|(?:please\s+)?(?:tell|remind)\s+me|are\s+you\s+able\s+to\s+(?:tell|say)(?:\s+me)?|i\s+wonder\s+if\s+you\s+(?:know|can\s+tell\s+me))\s+(?=(?:who|what|where|when|which|how)\b)/i;
function directForms(q: string): string[] {
  const w = ASK_WRAPPER.exec(q);
  if (!w) return [];
  const inner = q.slice(w[0].length).replace(/[?.!\s]+$/, '').trim();
  const out = [`${capitalize(inner)}?`];
  // "who the president is" -> "Who is the president?"; "what month it is" -> "What month is it?"
  const be = /^((?:who|what|where|when|which|how\s+old)(?:\s+(?:day|date|month|year|time|season|town|city|place|floor|room|building))?)\s+(.+?)\s+(is|are|was|were|am)((?:\s+(?:today|now|right\s+now|at\s+the\s+moment|tonight|again|in\s+the\s+(?:photo|picture)))*)$/i.exec(inner);
  if (be) out.push(`${capitalize(be[1])} ${be[3]} ${be[2]}${be[4]}?`);
  // "what you had for lunch" -> "What did you had for lunch?" (only its shape is read, not its grammar)
  const did = /^what\s+(you|we|he|she|they)\s+((?:had|ate|did|watched|saw|drank|said|told|bought|cooked|made|read)\b.*)$/i.exec(inner);
  if (did) out.push(`What did ${did[1]} ${did[2]}?`);
  return out;
}

/** The kind of test a question is, and the question as it reads when asked straight (itself, unless it was wrapped). */
function quizForm(q: string, profile?: Profile): { kind: QuizKind; q: string } | null {
  if (!/\?\s*$/.test(q)) return null;
  // the wrapped question first: its kind is the more exact one ("… tell me what my name is?" is about who I am)
  for (const d of directForms(stripAddress(q))) {
    const kind = quizKindOf(d, profile);
    if (kind) return { kind, q: d };
  }
  const straight = quizKindOf(q, profile);
  return straight ? { kind: straight, q } : null;
}

export function quizKind(q: string, profile?: Profile): QuizKind | null {
  return quizForm(q, profile)?.kind ?? null;
}

const UNSEEN_CONTACT = /\bon\s+the\s+(?:phone|telephone|line)\b|\bat\s+the\s+door\b|\b(?:phoned|phoning|called|calling|rang|ringing|knocking|knocked|texted|texting|messaged|visited|visiting)\b|\b(?:came|come|dropped|popped|stopped|called)\s+(?:by|round|around|over|in)\b|\b(?:talking|speaking|chatting)\s+(?:to|with)\b/i;
/**
 * "Who was that on the phone with you?", "Who were you talking to?", "Who came by while I was out?": someone the
 * person was in touch with and the partner was not. The partner does not know the answer, so it is not a test (set
 * E, 16 Nov: refused with "You know this one"). Not a wish ("Who shall we ring?") and not a face on a screen or in a
 * photo.
 */
export function isUnseenContact(q: string): boolean {
  const s = stripAddress(q).replace(/[’]/g, "'");
  return /^\s*(?:so\s+|and\s+)?who\b/i.test(s) && UNSEEN_CONTACT.test(s)
    && !/\b(?:should|shall|would|want|wanna|like|could|can|will|might|need|going\s+to|gonna)\b/i.test(s)
    && !/\b(?:photo|photograph|picture|album|tv|telly|television|film|movie|show|programme|program|radio)\b/i.test(s)
    // further back than today it is a question to memory again ("Who were those people at the door yesterday?")
    && !/\b(?:yesterday|last\s+(?:night|week|month|year|time)|ago|the\s+other\s+(?:day|week)|back\s+then)\b/i.test(s);
}

const UNGUESSABLE = [
  /\bwhat\b[^?]*\b(?:trying|tried|want|wanted|wanting|going|meant|mean|about)\s+to\s+(?:tell|say|ask|show)\b/i,
  /\bwhat\s+(?:do|did)\s+you\s+mean\b/i,
  /\bwhat\s+(?:are|were)\s+you\s+(?:saying|telling\s+me|asking(?:\s+me)?|on\s+about|getting\s+at)\b/i,
  /^\s*(?:sorry,?\s+|pardon,?\s+)?(?:what\s+was\s+that|what\s+did\s+you\s+(?:just\s+)?say|what\s+is\s+it|what's\s+that)(?:\s+(?:again|just\s+now|just\s+then))?\s*\?\s*$/i,
];
/**
 * "What were you trying to tell me earlier?", "What do you mean?", "What did you say?": the answer is whatever is in
 * the person's head, and no list could hold it. Any tile would be a guess (set E, 16 Nov: "problem / joke / news"
 * from the on-device model, "family / pain / home" from the cloud). Not when the partner offers options herself.
 */
export function isUnguessable(q: string): boolean {
  const s = stripAddress(q).replace(/[’]/g, "'");
  return /\?\s*$/.test(s) && !offersOptions(s) && UNGUESSABLE.some((re) => re.test(s));
}

function quizKindOf(q: string, profile?: Profile): QuizKind | null {
  if (!/\?\s*$/.test(q)) return null;
  if (isUnseenContact(q) || isUnguessable(q)) return null;
  if (NOW_Q.test(q)) return 'now';
  if (IDENTITY_Q.test(q)) return 'identity';
  // "Who is Tyler?": asking who a person in About me is
  const who = /^\s*who(?:'s|\s+is)\s+([\p{L}'-]+)\s*\?\s*$/iu.exec(stripVocative(q));
  if (who && profile && (findPerson(who[1], profile) || isPartnerName(who[1], profile))) return 'identity';
  // "What do you remember about the trip?" asks them to share, not to retrieve one right answer: a normal card
  if (REMEMBER_Q.test(q) && !/\bwhat\s+(?:do|did)\s+you\s+(?:remember|recall)\s+(?:about|of|most|best)\b/i.test(q)) return 'remember';
  const s = stripAddress(q);
  if (PLACE_Q.some((re) => re.test(s))) return 'place';
  if (OWN_EXPERIENCE.test(q)) return null;
  if (FACT_TARGET.some((re) => re.test(q))) return 'fact';
  // a recall question in which the partner names real options ("…, soup or a sandwich?") is a choice, not a test
  if (RECALL_Q.some((re) => re.test(s)) && !codeOptions(q, profile)) return 'recall';
  return null;
}
/** Rule 9: a question that asks the person to retrieve a fact, a name or the date is a test, not a conversation. */
export function isQuiz(q: string, profile?: Profile): boolean {
  return quizKind(q, profile) !== null;
}

const GENERIC_TELL = "If you know it, say it: \"It was …\". If you don't: \"I can't think of it either. Shall we look it up together?\"";

/**
 * The line for a fact question depends on its type (§2.10): a past year or date, a future date, an age, a name.
 * One "It was …" template for all of them read wrongly on ages and future dates.
 */
function factLine(q: string, profile?: Profile): string {
  const s = q.replace(/\?\s*$/, '');
  if (/\bhow\s+old\b/i.test(s)) {
    if (/\bhow\s+old\s+(?:are|were)\s+you\b/i.test(s)) return "If you know it, say it: \"You're …\".";
    const m = /\bhow\s+old\s+(?:is|was|will)\s+(?:your\s+|my\s+|our\s+)?([A-Z][\p{L}'-]+|[a-z-]+)/iu.exec(s);
    const who = m?.[1] ?? '';
    const person = profile?.people.find((p) => lc(p.name) === lc(who) || lc(p.relation) === lc(who));
    const rel = person?.relation ?? (/^[a-z]/.test(who) ? who : '');
    if (FEMALE.test(rel)) return "If you know it, say it: \"She's …\".";
    if (MALE.test(rel)) return "If you know it, say it: \"He's …\".";
    if (who && /^[A-Z]/.test(who)) return `If you know it, say it: "${who} is …".`;
    return "If you know it, say it: \"They're …\".";
  }
  if (/\bnames?\b|\bcalled\b|\bwhat\s+do\s+(?:we|you)\s+call\b|\bwho\s+(?:was|were)\s+(?:that|those)\b/i.test(s)) {
    const past = /\b(?:was|were|did)\b/i.test(s);
    return `If you know it, say it: "${past ? 'It was' : "It's"} …". If you don't: "I can't think of it either."`;
  }
  if (/\bwhat\s+time\b/i.test(s) && !/\b(?:was|were|did)\b/i.test(s)) return "If you know it, say it: \"It's at …\".";
  if (/\b(?:when|what\s+day)(?:'s|\s+is|\s+are|\s+does|\s+will)\b|\bnext\b/i.test(s) && !/\b(?:was|were|did)\b/i.test(s)) return "If you know it, say it: \"It's on …\".";
  if (/\bhow\s+many\b/i.test(s)) return "If you know it, say it: \"We've got …\".";
  return GENERIC_TELL;
}

/**
 * What the partner says instead. Only a "now" question gets today's date or time; a past event ("What year did
 * we marry?") never does. "Do you remember our trip?" becomes "I was thinking about our trip."
 */
export function quizRephrase(asked: string, partnerName: string, now = new Date(), profile?: Profile): string {
  // a test asked politely ("Can you tell me when …?") gets the line of the plain question it wraps
  const form = quizForm(asked, profile);
  const k = form?.kind ?? null;
  const q = form?.q ?? asked;
  if (k === 'identity' && /\bmy\s+name\b|\bwho\s+am\s+i\b|who\s+i\s+am\b/i.test(q)) return `It's me, ${partnerName || 'your partner'}.`;
  const named = /^\s*who(?:'s|\s+is)\s+([\p{L}'-]+)\s*\?\s*$/iu.exec(stripVocative(q));
  const person = named && profile ? findPerson(named[1], profile) : undefined;
  if (k === 'identity' && person?.relation) return `${person.name} is your ${person.relation}.`;
  if (k === 'now') {
    if (/\btime\b/i.test(q)) return `It's ${now.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' })} now.`;
    if (/\byear\b/i.test(q)) return `It's ${now.getFullYear()}.`;
    if (/\bmonth\b/i.test(q)) return `It's ${now.toLocaleDateString('en-GB', { month: 'long' })}.`;
    const day = now.toLocaleDateString('en-GB', { weekday: 'long' });
    const date = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
    return `It's ${day} today, ${date}.`;
  }
  if (k === 'place') return /\b(?:president|prime\s+minister|king|queen|governor|mayor|season|address|phone\s+number|live)\b/i.test(q) ? "Say it yourself: \"It's …\"." : "Say where you are: \"We're at …\".";
  if (k === 'recall') return "If you know, say it: \"You …\". If you don't know either, ask yes / no about one real thing at a time: \"Was it …?\"";
  if (k === 'remember' && !FACT_TARGET.some((re) => re.test(q)) && !/\b(?:who|what|which|where|how)\b/i.test(q.replace(/^.*?\b(?:remember|recall)\b/i, ''))) {
    // reminiscence: share the memory instead of asking whether they have it
    const m = /\b(?:remember|recall|mind)\s+(.*?)\s*[?,]*\s*$/i.exec(q);
    let topic = (m?.[1] ?? '').replace(/\b(?:do|can|could)\s+you\s*$/i, '').trim();
    topic = topic.replace(/\byour\b/gi, 'your').replace(/,\s*(?:love|dear|darling|hen|pet|mum|dad|[A-Z][a-z]+)\s*$/u, '').trim();
    if (topic) return `I was thinking about ${topic}.`;
  }
  return factLine(q, profile);
}

const COLOURS = /^(red|blue|green|grey|gray|black|white|brown|pink|yellow|purple|navy|cream|beige|orange|dark|light|striped|checked|woolly|thick|thin|warm|new|old)$/i;
/**
 * Made-up options: the question asks which of the person's own things ("Which coat ...?") and two or more choices
 * are that thing with an invented detail ("blue coat", "red coat") that nothing in the question or About me supports.
 */
export function madeUpVariants(choices: string[], q: string, profile: Profile): boolean {
  const m = /^\s*(?:which|what)\s+([a-z]+)/i.exec(q);
  if (!m) return false;
  const noun = lc(m[1]).replace(/s$/, '');
  const known = new Set(words([q, ...profile.foods, ...profile.places, ...profile.tv, ...profile.music, ...(profile.other ?? [])].join(' ')));
  const variants = choices.filter((c) => {
    const ws = words(c);
    // a bare colour ("blue / red / grey" for "Which jumper?") is the same invention without the noun (held-out 1 #8)
    if (ws.length === 1) return COLOURS.test(ws[0]) && !known.has(ws[0]);
    if (ws[ws.length - 1].replace(/s$/, '') !== noun) return false;
    return ws.slice(0, -1).some((w) => !known.has(w) && COLOURS.test(w));
  });
  return variants.length >= 2;
}

/** "cheese toast" -> "cheese on toast": a choice made of exactly an About-me item's words takes that item's wording. */
export function snapToProfile(choice: string, profile: Profile): string {
  const key = (s: string) => [...new Set(words(s).filter((w) => !['the', 'a', 'an', 'on', 'with', 'and', 'of', 'by', 'at', 'in'].includes(w)))].sort().join(' ');
  const k = key(choice);
  if (!k || k.split(' ').length < 2) return choice;
  for (const e of [...profile.foods, ...profile.places, ...profile.tv, ...profile.music]) {
    if (key(e) === k) return e.replace(/^the\s+/i, '');
  }
  return choice;
}

/**
 * Which About-me list a card label comes from ("Jenny" -> people, "lake" for "the lake" -> places), or null when it is
 * not an About-me entry. Used to say, per card, which choices only this computer could have offered: the cloud step
 * never sees About me.
 */
export function fromAboutMe(label: string, profile: Profile): string | null {
  const key = (s: string) => lc(s).replace(/^the\s+/, '').trim();
  const k = key(label);
  if (!k) return null;
  const lists: [string, string[]][] = [
    ['people', profile.people.flatMap((p) => [p.name, p.nickname ?? ''])],
    ['places', profile.places], ['foods', profile.foods], ['TV', profile.tv], ['music', profile.music], ['other', profile.other ?? []],
  ];
  for (const [name, entries] of lists) if (entries.some((e) => e && key(e) === k)) return name;
  return null;
}

// ---------------------------------------------------------------- rule 7
/** Rule 7. The spoken line: the partner's own question, then the options in order. */
export function spokenLine(asked: string, spokenChoices: string[]): string {
  const opts = spokenChoices.filter(Boolean);
  if (!opts.length) return asked;
  let list: string;
  if (opts.length === 1) list = opts[0];
  else if (opts.length === 2) list = `${opts[0]} or ${opts[1]}`;
  else list = `${opts.slice(0, -1).join(', ')}, or ${opts[opts.length - 1]}`;
  return `${asked} ${capitalize(list)}?`;
}

// ---------------------------------------------------------------- rule 11
export const MOOD_WORDS = new Set(['good', 'okay', 'ok', 'bad', 'hard', 'happy', 'funny', 'fine', 'busy', 'better', 'same', 'easier', 'harder', 'sad', 'tired', 'difficult', 'hurts', 'great', 'nice', 'lonely', 'boring', 'worse']);
const ESCAPES = new Set(['something else', 'someone else', 'somewhere else', 'not sure']);

/**
 * Rule 11. Send a choice card to the cloud when the device answer looks weak:
 * >= 2 mood words among the answers, a comparative echoed from the question, a duplicate head noun,
 * or fewer than 2 usable answers. Or-pairs and fixed cards (yes/no, feeling, body, pain) stay on device.
 */
export function route(kind: string, q: string, answers: string[], isOrPair: boolean, limits: { moodWords: number; minChoices: number } = { moodWords: 2, minChoices: 2 }): RouteDecision {
  const reasons: string[] = [];
  if (kind !== 'choice' || isOrPair) return { to: 'device', reasons };
  const core = answers.map(lc).filter((c) => !ESCAPES.has(c));
  const qw = new Set(words(q));
  // the two thresholds are settings (core/models.ts): 2 and 2 in code, changeable through Firebase Remote Config
  if (core.filter((c) => c.split(/\s+/).some((w) => MOOD_WORDS.has(w))).length >= limits.moodWords) reasons.push(limits.moodWords === 2 ? 'two or more mood words' : `${limits.moodWords} or more mood words`);
  if (core.some((c) => qw.has(c) && /er$/.test(c))) reasons.push('comparative echoed from the question');
  const heads = core.map((c) => (c.split(/\s+/).pop() ?? '').replace(/s+$/, ''));
  if (new Set(heads).size < heads.length) reasons.push('duplicate head noun');
  if (core.length < limits.minChoices) reasons.push(limits.minChoices === 2 ? 'fewer than two usable choices' : `fewer than ${limits.minChoices} usable choices`);
  return { to: reasons.length ? 'cloud' : 'device', reasons };
}

// ---------------------------------------------------------------- topic
const STOP = new Set(('a an the you your yours we our us me my i it its is are am was were do does did would will can could should shall have has had ' +
  'what where who whom when which why how want need like to for of on in at about with go going get got some any this that these those ' +
  'there here think feel find make made please right now so if and or but be been being he she him her his hers they them their its').split(' '));
/** Fallback topic when no model ran: up to three content words of the question, address words and the person's name left out (§2.2). */
export function heuristicTopic(q: string, profile?: Profile): string {
  const name = lc(profile?.personName ?? '');
  const ws = (q.match(/[A-Za-z']+/g) ?? []).filter((w) => !STOP.has(lc(w)) && !ADDRESS.has(lc(w)) && lc(w) !== name);
  return ws.slice(0, 3).join(' ').toLowerCase() || 'question';
}

const YN_FRAME = [
  /^(?:is|would|will)\s+(?:it|that)\s+(?:be\s+)?(?:ok|okay|alright|all right|fine|good|better)\s+(?:if|to|for|with\s+you\s+if)\s+/i,
  /^(?:do|did|does|would|will|can|could|should|shall|may|might|must|have|has|had|are|is|am|was|were)\s+(?:you|we|i|it|they|he|she|there|that|this)\s+/i,
  /^(?:do|did|does|would|will|can|could|should|shall|may|might|must|have|has|had|are|is|am|was|were)\s+/i,
  /^you\s+/i,
  /^(?:you|we|it|they|he|she)(?:'ve|'re|'s|'ll|'d)\s+/i,
  /^(?:want|wanna|need|like|fancy|feel\s+like|mind|care)\s+(?:to\s+|for\s+|if\s+)?/i,
  /^(?:me|us)\s+to\s+/i,
  /^(?:just|still|really|maybe|perhaps|also)\s+/i,
];
const YN_DET = /^(?:the|a|an|your|my|our|some|any)$/i;

/**
 * The headline of a yes / no card: the proposal itself, in the question's own words and order, at most four words
 * ("Did you take your pills this morning?" -> "take pills this morning", "Is it okay if Tyler comes over Saturday?"
 * -> "Tyler comes over Saturday"). Before the simulation of 16.11 it was the first three content words wherever they
 * stood ("take pills morning", "okay tyler comes"), with names in lower case.
 */
export function yesNoTopic(q: string, profile?: Profile): string {
  let s = stripVocative(q).replace(/[?.!]+\s*$/, '').replace(/\s*,\s*(?:love|dear|darling|hen|pet|mate|hon|[A-Z][a-z]+)\s*$/, '').trim();
  const start = s;
  for (let i = 0; i < 6; i++) {
    const y = YN_FRAME.reduce((acc, re) => acc.replace(re, ''), s);
    if (y === s) break;
    s = y;
  }
  s = s.replace(CUT, '').split(/\s*,\s*/)[0];
  const name = lc(profile?.personName ?? '');
  let ws = s.split(/\s+/).filter((w) => w && lc(w) !== name && !ADDRESS.has(lc(w)));
  // a word left dangling by the cut goes; "on" / "in" / "off" at the end of a phrase that was not cut is its own word ("kettle on")
  let cut = false;
  const trimEnd = () => { while (ws.length > 1 && (cut ? /^(?:for|to|at|with|and|of|the|a|an|by|from|about|your|my|our|some|or|if|in|on)$/i : /^(?:for|to|at|with|and|of|the|a|an|by|from|about|your|my|our|some|or|if)$/i).test(ws[ws.length - 1])) ws.pop(); };
  // "a bit", "a little", "for you" after the proposal are not part of it
  let phrase = ws.join(' ').replace(/\s+(?:a\s+)?(?:bit|little|while|moment|minute)$/i, '').replace(/\s+(?:for|with|to)\s+(?:you|me|us)$/i, '');
  ws = phrase.split(/\s+/).filter(Boolean);
  // too long: first the time it ends with goes ("this morning", "on Friday"), then the small words
  for (let i = 0; i < 3 && ws.length > 4; i++) { phrase = ws.join(' ').replace(TAIL, ''); ws = phrase.split(/\s+/).filter(Boolean); }
  if (ws.length > 4) ws = ws.filter((w) => !YN_DET.test(w));
  cut = ws.length > 4;
  ws = ws.slice(0, 4);
  trimEnd();
  while (ws.length > 1 && YN_DET.test(ws[0])) ws.shift();
  phrase = ws.join(' ');
  // the capital that only opens the sentence goes; a name keeps its own
  if (phrase && start.startsWith(phrase.split(' ')[0]) && /^[A-Z][a-z]/.test(phrase) && !(profile && findPerson(phrase.split(' ')[0], profile))) phrase = phrase.charAt(0).toLowerCase() + phrase.slice(1);
  return phrase && !/^(?:it|that|this|so|one)$/i.test(phrase) ? phrase : heuristicTopic(q, profile);
}

// ---------------------------------------------------------------- open questions: allowed sources (§2.6)
const EAT_Q = /\b(?:eat|eating|food|dinner|lunch|breakfast|supper|cook|cooking|meal|hungry|for\s+(?:your\s+|our\s+)?tea)\b/i;
// (set D, 16 Nov: "What do you feel like watching?" was not read as a TV question, so Johnny Cash stood on its next page)
const WATCH_Q = /\b(?:watch|watching|telly|tv|television|programme|program|show|film|movie)\b/i;
/** A food question About me cannot answer: its foods are meals the person likes, not desserts, snacks or what is in the cupboard. */
const FOOD_OTHER = /\b(?:dessert|pudding|afters|sweet|snack|breakfast|drink|pantry|larder|cupboard|fridge|freezer|grocer\w*|shopping|list|run\s+out|out\s+of|buy|pick\s+up)\b/i;
/** A "where" question about the two of them going somewhere: only then is a place from About me an answer ("Where shall we hang this?" and "Where do you want the lamp to go?" are not). */
const GO_Q = /\b(?:we|you|i)\s+(?:(?:want|like|fancy|wish|need|rather|prefer|love|feel\s+like|going|gonna|would|should|shall|could|can|to|just|maybe|all|both|ever|usually|still)\s+)*(?:go|going|gone|visit|visiting|drive|driving|walk|walking|head|heading|pop|eat|eating|meet|meeting|spend|spending|stop\s+(?:off|by)|be|have\s+(?:lunch|dinner|tea|coffee|a\s+drink|a\s+day\s+out))\b|\b(?:trip|outing|day\s+out|holiday)\b|\btake\s+(?:you|us)\b/i;
/** "What do you want to do today?", "Any plans for the weekend?": places, TV and music from About me all fit. */
const DO_Q = /\bwhat\b[^?]*\b(?:to|we|you|i)\s+do\b|\bwhat\b[^?]*\b(?:doing|up\s+to)\b|\bplans?\b/i;
/** "What shall we talk about?", "What are you thinking about?": anything in About me may be the answer. */
const TALK_Q = /\b(?:talk|chat)\s+about\b|\b(?:remember|recall)\b|\bthinking\s+(?:about|of)\b|\bon\s+your\s+mind\b|\bmiss(?:ing)?\b|\blooking\s+forward\b|\bfavou?rite\b|\blike\s+best\b/i;
const LISTEN_Q = /\b(?:listen|listening|music|song|songs|record|records|radio|put on|play)\b/i;
/** Without the two words that also fit the telly ("put on", "play"): only then is a TV entry certainly the wrong kind. */
const LISTEN_ONLY = /\b(?:listen|listening|music|song|songs|record|records|radio|sing|tune|tunes|album)\b/i;
const UPSET_Q = /\b(?:upset|wrong|bothering|the matter|on your mind|worried|worrying|troubling|cross|angry|sad)\b/i;
// "What do you need?" / "Is there something you need?" are open; "You need something?" is a yes/no offer (§2.4 wins over §2.6)
const NEED_Q = /\bwhat\s+(?:do\s+you|is\s+it\s+you|would\s+you)\s+need\b|\bwhat\s+(?:do\s+you\s+)?need\b|\b(?:something|anything)\s+(?:that\s+)?you\s+need\b/i;
const GENERIC_WHERE = /^(?:go out|stay (?:home|in|here)|out|in|inside|outside|nowhere|anywhere|somewhere|home)$/i;

/**
 * §2.6: choices on an open question may come only from the question's words, an About-me list of the same kind
 * as the question asks for, or a small fixed set for the question type. When the model's proposal leaves fewer than
 * two answers, this fills from the list of the right kind (people for who, places for where, foods for eat, TV for
 * watch, music for listen) or the fixed set (pain / family for "why upset"; toilet / pain for "need something").
 * Returns the filled list and which source was used, or null when no source of the right kind exists.
 */
export function sourceFill(answers: string[], q: string, profile: Profile, cap: number): { answers: string[]; source: string } | null {
  // a question that names its own options is never completed from a list: the options are in the question
  if (offersOptions(q)) return null;
  const t = questionType(q);
  let pool: string[] = [];
  let source = '';
  if (t === 'who') {
    // only a contact question ("who shall we ring / invite") asks for the family; "who do you fancy on the quiz" does not
    if (!isContactQ(q) || PAST_LIFE.test(q)) return null;
    pool = contactPool(profile);
    source = 'people from About me';
  } else if (t === 'where') {
    // only where the question is about going somewhere (set D, 16 Nov: "Where do you want to sit?" was completed
    // with the lake and church)
    if (!GO_Q.test(q)) return null;
    pool = profile.places; source = 'places from About me';
  }
  else if (t === 'what' && EAT_Q.test(q) && !FOOD_OTHER.test(q)) { pool = profile.foods; source = 'foods from About me'; }
  else if (t === 'what' && WATCH_Q.test(q)) { pool = profile.tv; source = 'TV from About me'; }
  else if (t === 'what' && LISTEN_Q.test(q)) {
    // About me may hold one artist only: the radio is the one general choice that is always true, and no second
    // artist is ever made up (simulation 16.11: a TV show and a team stood in as music)
    pool = profile.music.length ? [...profile.music, 'radio'] : [];
    source = profile.music.length >= cap ? 'music from About me' : 'music from About me and the radio';
  }
  else if (UPSET_Q.test(q)) { pool = ['pain', 'family']; source = 'a fixed set for this kind of question'; }
  else if (NEED_Q.test(q)) { pool = ['toilet', 'pain']; source = 'a fixed set for this kind of question'; }
  if (!pool.length) return null;
  const out = [...answers];
  const have = new Set(out.map(lc));
  for (const p of pool) {
    const item = p.replace(/^the\s+/i, '');
    if (out.length >= cap) break;
    if (!have.has(lc(item)) && !have.has(lc(p))) { out.push(item); have.add(lc(item)); }
  }
  return out.length >= 2 ? { answers: out, source } : null;
}

/** The About-me list a label belongs to, also when it is a name-like part of an entry ("Packers" of "Packers games"). */
function aboutList(label: string, profile: Profile): string | null {
  const exact = fromAboutMe(label, profile);
  if (exact) return exact;
  const ws = words(label);
  if (!ws.length || !/\b[A-Z][a-z]/.test(label)) return null;
  const lists: [string, string[]][] = [['places', profile.places], ['foods', profile.foods], ['TV', profile.tv], ['music', profile.music], ['other', profile.other ?? []]];
  for (const [name, entries] of lists) if (entries.some((e) => { const ew = new Set(words(e)); return ws.every((w) => ew.has(w)); })) return name;
  return null;
}

/**
 * An About-me entry of another kind than the question asks for is not an answer: a TV show is not music, a place is
 * not a food (simulation 16.11: "What do you feel like listening to?" offered "Packers" and "Wheel of Fortune").
 * Since set D of 16 Nov the check is the other way round: an entry stays only where the question invites its list
 * (see aboutFit below). Returns the kept choices and the dropped ones.
 */
export function wrongListFilter(choices: string[], q: string, profile: Profile): { kept: string[]; dropped: string[] } {
  const fits = aboutFit(q);
  if (!fits) return { kept: choices, dropped: [] };
  const kept: string[] = [];
  const dropped: string[] = [];
  for (const c of choices) {
    const list = aboutList(c, profile);
    // an entry the partner named in the question is theirs to offer, whatever its list ("… about Scarborough?")
    const named = new RegExp(`(?<![\\p{L}\\p{N}])${esc(c.trim().replace(/^the\s+/i, ''))}(?![\\p{L}\\p{N}])`, 'iu').test(q);
    (list && list !== 'people' && !fits.has(list) && !named ? dropped : kept).push(c);
  }
  return { kept, dropped };
}

/**
 * Which About-me lists a question invites answers from, or null when the check does not apply (a who / when / what-
 * to-say question: other rules decide there). Set D, 16 Nov: the on-device model put the family's dinners on a
 * dessert card, on the pantry and on the grocery list, and a place from About me under "Where do you want to sit?".
 * An About-me entry is a good answer only where the question asks for that kind of thing:
 *   foods   a meal question (eat, dinner, lunch, cook…), not dessert / snack / breakfast / drink / shopping
 *   places  a "where" question about going somewhere; "what shall we do"
 *   TV      watch / telly / film; "what shall we do"; "put on" / "play" (with music)
 *   music   listen / music / radio; "what shall we do"; "put on" / "play"
 *   other   (a pet, a team, a hobby) wherever the kind of the question is not certain, as before
 * and anything from About me on "what shall we talk about / what are you thinking about".
 */
export function aboutFit(q: string): Set<string> | null {
  const t = questionType(q);
  if (t !== 'what' && t !== 'where') return null;
  if (TALK_Q.test(q)) return new Set(['places', 'foods', 'TV', 'music', 'other']);
  const fits = new Set<string>();
  if (t === 'where') {
    if (GO_Q.test(q)) fits.add('places');
    return fits;
  }
  const eat = EAT_Q.test(q) && !FOOD_OTHER.test(q);
  const watch = WATCH_Q.test(q);
  const listenOnly = LISTEN_ONLY.test(q);
  const listen = LISTEN_Q.test(q);
  if (eat) fits.add('foods');
  if (watch) fits.add('TV');
  if (listenOnly) fits.add('music');
  // "put on" / "play" fit the telly and the record player alike
  if (listen && !listenOnly && !watch) { fits.add('TV'); fits.add('music'); }
  if (DO_Q.test(q) && !FOOD_OTHER.test(q)) { fits.add('places'); fits.add('TV'); fits.add('music'); fits.add('other'); }
  // an entry under "other" goes only where the kind is certain (what the family listens to is in the music list)
  const certain = [eat, watch, listenOnly].filter(Boolean).length === 1;
  if (!certain) fits.add('other');
  return fits;
}

const PLACE_NOUN = /\b(?:where|hotel|street|road|house|town|village|city|shop|pub|church|chapel|beach|school|place|cottage|caravan|park|hospital|club|café|cafe|restaurant)\b/i;
const PET_NOUN = /\b(?:dog|cat|pet|puppy|kitten|horse|pony|bird|budgie|rabbit|hamster|team|club)\b/i;
const IDENTITY_Q_LOOSE = /\bwho(?:'s|\s+is)\s+(?:this|that)\b|\bwho\s+am\s+i\b|\bmy\s+name\b/i;

/**
 * §2.10 override ("I really don't know the answer: make a card"): a recognition card for a memory question may hold
 * only About-me items of the right kind, never invented distractors. People for a who / name question, places for a
 * place question, "other" entries for a pet or a team. A year, a date, an age or a time has no safe pool: null.
 */
export function recognitionPool(q: string, profile: Profile): { items: string[]; source: string } | null {
  const s = stripVocative(q);
  // where they are now, or what happened earlier: nothing in About me is the answer, so there is no safe pool
  if (['place', 'recall'].includes(quizKind(q, profile) ?? '')) return null;
  if (/\b(?:year|date|month|day|time|how\s+old|how\s+long|how\s+many|birthday|anniversary)\b/i.test(s)) return null;
  if (/^\s*(?:who|whom)\b/i.test(s) || /\bwho\s+(?:was|were|is|are|came|rang|phoned|visited)\b/i.test(s) || IDENTITY_Q_LOOSE.test(s)) {
    return { items: profile.people.map((p) => p.name).filter(Boolean), source: 'people from About me' };
  }
  if (PET_NOUN.test(s) && (profile.other ?? []).length) return { items: profile.other, source: 'other things from About me' };
  if (PLACE_NOUN.test(s)) return { items: profile.places, source: 'places from About me' };
  if (/\b(?:name|called)\b/i.test(s)) return { items: profile.people.map((p) => p.name).filter(Boolean), source: 'people from About me' };
  return null;
}

/** On a "where" question with places in About me, a generic "stay home / go out" is not a place (§2.6, held-out 4 #20). */
export function dropGenericWhere(answers: string[], q: string, profile: Profile): string[] {
  if (questionType(q) !== 'where' || profile.places.length < 2) return answers;
  return answers.filter((a) => !GENERIC_WHERE.test(a.trim()));
}

const GENERIC_WHO = /^(?:(?:a|an|the|some|your|our|my|their)\s+)?(?:famil(?:y|ies)|family members?|friends?|relatives?|relations?|someone|somebody|anyone|people|kids|children|grandchildren|grandkids|loved ones?)$/i;

/** The people a call / visit / invite question can offer: named in About me, not living here, not the partner. */
export function contactPool(profile: Profile): string[] {
  return profile.people.filter((p) => p.name && !p.household && lc(p.name) !== lc(profile.partnerName)).map((p) => p.name);
}

/**
 * On a "who shall we call / visit / invite" question with at least two such people in About me, a general word
 * ("family", "a friend") or a bare relation word of someone listed ("daughter") is not an answer: the card offers the
 * people themselves. This is what a step with no About me (the cloud step) returns, so the names are put in by code
 * on this computer afterwards; nothing more is sent.
 */
export function dropGenericWho(answers: string[], q: string, profile: Profile): string[] {
  if (questionType(q) !== 'who' || !isContactQ(q) || PAST_LIFE.test(q) || contactPool(profile).length < 2) return answers;
  const relations = new Set(profile.people.map((p) => lc(p.relation)).filter(Boolean));
  return answers.filter((a) => {
    const t = a.trim();
    if (findPerson(t, profile)) return true;
    return !GENERIC_WHO.test(t) && !relations.has(lc(t).replace(/^(?:a|an|the|your|our|my|their)\s+/, ''));
  });
}

/**
 * On a "who shall we call / visit / invite" question the people About me names (who do not live here) all stand on
 * the card, first and in About-me order; a specific role a model offered ("doctor") comes after them. Set E, 16 Nov:
 * with cloud help only the card read "doctor / Jenny": the cloud's role word had taken a place, Tyler was gone and
 * there was no next page, while on this computer the same question gave Jenny / Tyler and then doctor.
 */
export function contactFirst(answers: string[], q: string, profile: Profile): string[] {
  if (questionType(q) !== 'who' || !isContactQ(q) || PAST_LIFE.test(q) || offersOptions(q)) return answers;
  const pool = contactPool(profile);
  if (pool.length < 2) return answers;
  const others = answers.filter((a) => !findPerson(a, profile) && !isPartnerName(a, profile));
  return [...pool, ...others];
}

/**
 * The times an open "when" question gets: a fixed line of three, chosen in code by what the question is about, the
 * same in every engine state. Set E, 16 Nov: "When do you want to go to bed tonight?" gave 8 pm / 9 pm / 10 pm on two
 * on-device runs, "early / late / now" on the third and "soon / later / now" from the cloud. Null when the question is
 * not an open "when" (it names its own options, or it asks for a fixed time the partner knows: that is a test).
 *   bed, sleep, tonight, this evening     8 pm / 9 pm / 10 pm          dinner, supper, tea        5 pm / 6 pm / 7 pm
 *   getting up, breakfast, the morning    7 am / 8 am / 9 am           lunch                      12 noon / 1 pm / 2 pm
 *   the afternoon, a nap                  1 pm / 2 pm / 3 pm           today                      this morning / this afternoon / this evening
 *   something that began or happened      today / yesterday / before that
 *   a visit, a call, an outing, "what day"  today / tomorrow / at the weekend
 *   anything else                         now / in a while / later today
 */
export function whenChoices(q: string, profile?: Profile): string[] | null {
  if (questionType(q) !== 'when' || offersOptions(q) || isQuiz(q, profile)) return null;
  const s = lc(stripAddress(q));
  if (/\bwhen\s+(?:did|was|were|have|has|had)\b|\blast\s+(?:time|have|had|eat|ate|go|went|see|saw)\b|\bwhen\b[^?]*\b(?:start|started|begin|began)\b/.test(s)) return ['today', 'yesterday', 'before that'];
  if (/\b(?:dinner|supper|evening\s+meal|tea\s+tonight|eat\s+tonight|eat\s+this\s+evening)\b/.test(s)) return ['5 pm', '6 pm', '7 pm'];
  if (/\blunch\b/.test(s)) return ['12 noon', '1 pm', '2 pm'];
  if (/\b(?:bed|sleep|turn\s+in|lights\s+out|tonight|this\s+evening|evening)\b/.test(s)) return ['8 pm', '9 pm', '10 pm'];
  if (/\b(?:get\s+up|getting\s+up|wake|woken|breakfast|tomorrow\s+morning|this\s+morning|in\s+the\s+morning)\b/.test(s)) return ['7 am', '8 am', '9 am'];
  if (/\b(?:this\s+afternoon|afternoon|nap)\b/.test(s)) return ['1 pm', '2 pm', '3 pm'];
  if (/\btoday\b/.test(s)) return ['this morning', 'this afternoon', 'this evening'];
  if (/^what\s+day\b/.test(s.trim()) || /\b(?:visit|visiting|come\s+(?:over|round|by)|see|trip|outing|holiday|call|ring|phone|invite|this\s+week|weekend|appointment|hairdresser|barber|shopping)\b/.test(s)) return ['today', 'tomorrow', 'at the weekend'];
  return ['now', 'in a while', 'later today'];
}

const FILLER = /^(?:(?:the|some|any|an?)\s+)?(?:other|others|another|something|anything|everything|else|etc|misc|miscellaneous|more|stuff|things?|none|various|whatever|house|home|items?|options?|choices?|n\/a|unknown|other\s+(?:things?|stuff|options?|items?))$/i;
const BREAKS_OFF = /\s(?:about|to|for|with|of|the|a|an|and|or|at|on|from|by|into)$/i;
/**
 * Words a model adds to make up the number, which are no choice at all: "other", "something", "things", or a phrase
 * that breaks off ("talk about"). Set E, 16 Nov: the next page of a dinner card held "cheese", "house", "other".
 * ("house" / "home" are fillers only where the question is not about a place.)
 */
export function fillerFilter(choices: string[], q: string): { kept: string[]; dropped: string[] } {
  const where = questionType(q) === 'where';
  const kept: string[] = [];
  const dropped: string[] = [];
  for (const c of choices) {
    const t = c.trim();
    const filler = (FILLER.test(t) && !(where && /^(?:(?:the|at)\s+)?(?:house|home)$/i.test(t))) || (BREAKS_OFF.test(t) && !PHRASAL.has(lc(t.split(/\s+/).slice(-2)[0] ?? '')));
    (filler ? dropped : kept).push(c);
  }
  return { kept, dropped };
}

/**
 * When the card already holds two or more of the family's own entries for this kind of question (their foods on a
 * meal question, their places, shows, music), a general word a model put after them is dropped: it was the model's
 * third guess, not something the family listed, and on the next page it reads as if it were theirs. People are the
 * exception: on a "who to call" card a role ("doctor") after the family is a real choice.
 */
export function besideOwnFilter(choices: string[], q: string, profile: Profile): { kept: string[]; dropped: string[] } {
  const own = choices.filter((c) => { const l = fromAboutMe(c, profile); return !!l && l !== 'people'; });
  if (own.length < 2 || questionType(q) === 'who') return { kept: choices, dropped: [] };
  const named = (c: string) => new RegExp(`(?<![\\p{L}\\p{N}])${esc(c.trim().replace(/^the\s+/i, ''))}(?![\\p{L}\\p{N}])`, 'iu').test(q);
  const kept = choices.filter((c) => !!fromAboutMe(c, profile) || named(c));
  return { kept, dropped: choices.filter((c) => !kept.includes(c)) };
}

export function cleanTopic(t: string): string {
  return t.replace(/[^\w\s'-]/g, '').replace(/\s+/g, ' ').trim().split(' ').slice(0, 4).join(' ');
}
