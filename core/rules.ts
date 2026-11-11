// The 11 build rules from the on-device validation (validation/VALIDATION_2026-11-09.md, runs 1-10),
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
    new RegExp(`,\\s*and\\s+(?=${QWORD}\\b)`, 'i'),
    // two question marks: "Did you eat? What did you have?"
    /\?\s+(?=\w)/,
    // "... and are you ...?" without a comma: only when "and" is followed by aux + you, or a wh-word + aux
    /\s+and\s+(?=(?:are|do|did|would|will|can|could|should|have)\s+you\b|(?:what|where|who|when|which|how|why)\s+(?:do|did|would|will|is|are|was|should|shall)\b)/i,
  ];
  for (const re of patterns) {
    const m = re.exec(s);
    if (!m) continue;
    const first = s.slice(0, m.index).replace(/[\s,?]+$/, '');
    let second = s.slice(m.index + m[0].length).trim();
    second = second.replace(/^if so\s*,?\s*/i, '');
    if (first.split(' ').length >= 3 && second.split(' ').length >= 3) {
      return [first + '?', normalizeQuestion(capitalize(second))];
    }
  }
  return [s, null];
}

// ---------------------------------------------------------------- rule 2
const AUX_START = /^\s*(did|do|does|are|is|am|was|were|can|could|should|shall|will|would|have|has|had|may|might|must)\b/i;
/** Rule 2. An aux-verb question with no "or" becomes yes / no / not sure. */
export function isAuxYesNo(q: string): boolean {
  return AUX_START.test(q) && !/\bor\b/i.test(q);
}

/** Rule 2 (part). "..., or not (yet)?" offers no second option: it is a yes / no question. */
export function isOrNot(q: string): boolean {
  return /,?\s+or\s+(?:not|no)\b(?:\s+(?:yet|really|now|today))?\s*\?\s*$/i.test(q);
}

// ---------------------------------------------------------------- rule 3
const LEAD = /^(?:is it|is the room too|is the room|do you want to|do you want|would you like to|would you like|shall we|should we|go to|me to|to|the|on)\s+/i;
const TRAIL = /\s+(?:that|which|who|for)\b.*$/i;
const FRAME = new Set(['you', 'like', 'want', 'to', 'we', 'i', 'me', 'would', 'do', 'does', 'shall', 'should', 'is', 'are', 'it', 'the', 'a', 'an', 'some', 'too', 'prefer', 'rather', 'have', 'could', 'can', 'will', 'be']);

function cleanSide(x: string): string {
  x = x.trim();
  for (let i = 0; i < 4; i++) {
    const y = x.replace(LEAD, '');
    if (y === x) break;
    x = y;
  }
  x = x.replace(TRAIL, '').trim();
  return x.replace(/^(?:the|a|an|too|some)\s+/i, '');
}

const DET = new Set(['the', 'a', 'an', 'your', 'my', 'our', 'his', 'her', 'some']);
const PREP = new Set(['by', 'at', 'of', 'in', 'near', 'with', 'from', 'on']);
const PARTICLE = new Set(['on', 'off', 'in', 'out', 'up', 'down']);
const NEG = /\b(?:not|no|never|none|nothing|nobody|neither|nor)\b|n't\b|\bdont\b/i;

/** Rule 3. "... X or Y?" with short alternatives -> [X, Y]; null when the sides are not short phrases. */
export function orPair(q: string): [string, string] | null {
  if (/,\s*or\s/i.test(q)) return commaOrPair(q);
  const m = /([\p{L}\p{N}' -]+?)\s+or\s+([\p{L}\p{N}' -]+?)\s*\?\s*$/u.exec(q);
  if (!m) return clausePair(q);
  const bw = cleanSide(m[2]).split(/\s+/).filter(Boolean);
  if (!bw.length) return null;
  // a long or clause-like second option ("or stay here with the dog?"): parse both sides as clauses
  if (bw.length > 4 || (['give', 'stay', 'go', 'keep', 'leave', 'wait'].includes(lc(bw[0])) && bw.length > 2)) return clausePair(q);
  const n = bw.length;
  const left = m[1].split(/\s+/).filter(Boolean);
  // "The snooker on or Pointless?": "on" says the telly is on; the option is "snooker"
  if (left.length > 1 && PARTICLE.has(lc(left[left.length - 1])) && !PARTICLE.has(lc(bw[0]))) left.pop();
  let start = Math.max(0, left.length - n);
  while (start > 0 && DET.has(lc(left[start - 1]))) start--;
  // keep the whole noun phrase ("the park by the canal", not "canal") when it opens the question or follows "the"
  if (start > 1 && PREP.has(lc(left[start - 1])) && (start - 2 === 0 || DET.has(lc(left[start - 3])))) {
    start -= 2;
    while (start > 0 && DET.has(lc(left[start - 1]))) start--;
  }
  let aw = cleanSide(left.slice(start).join(' ')).split(/\s+/).filter(Boolean);
  // "Would you like cocoa or hot milk?": a two-word right side must not pull "like" into the left option
  while (aw.length > 1 && FRAME.has(lc(aw[0]))) aw = aw.slice(1);
  const a = aw.join(' ');
  const b = bw.join(' ');
  if (!a || aw.length > 4) return clausePair(q);
  if (lc(a) === lc(b) || NEG.test(a) || NEG.test(b)) return null;
  return [a, b];
}

const AUX = '(?:is|was|are|were|am|do|does|did|would|will|can|could|should|shall|have|has|had)';
const SUBJ = '(?:it|that|this|you|we|i|they|he|she|there)';
const CLAUSE_LEAD = [
  new RegExp(`^(?:are\\s+you\\s+|you\\s+)?up\\s+for\\s+`, 'i'),
  new RegExp(`^(?:did|do|would|will)\\s+you\\s+(?:mean|want|like|prefer|rather|fancy|need)\\s+(?:to\\s+)?`, 'i'),
  new RegExp(`^(?:would|do|will)\\s+you\\s+`, 'i'),
  new RegExp(`^(?:you\\s+)?(?:want|fancy|prefer|rather|mean|need)\\s+(?:to\\s+)?`, 'i'),
  new RegExp(`^(?:shall|should|can|could|will)\\s+(?:we|i)\\s+`, 'i'),
  /^(?:would|will|is|was)\s+it\s+be\s+(?:better|best|easier|nicer)\s+(?:to\s+|if\s+(?:we|i)\s+)?/i,
  new RegExp(`^${AUX}\\s+${SUBJ}\\s+(?:just\\s+|still\\s+|really\\s+)?`, 'i'),
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
  const aux = new RegExp(`^${AUX}\\s+(?:(?:the|your|my|our|that|this)\\s+\\w+|[A-Z][\\p{L}']+|(?:Person|Thing|Place|Food|Show|Music) [A-Z])\\s+`, 'iu').exec(s);
  if (aux && s.slice(aux[0].length).trim()) s = s.slice(aux[0].length);
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

const LABEL_BAD = new RegExp(`^(?:${AUX}\\s+(?:you|i|we|it|that|this|there|he|she|they|the|your)|what|where|who|when|which|how|why)\\b`, 'i');

/**
 * Rule 3 (part). "A ..., or B ...?" is an either-or question even when the sides are long clauses. Each side is
 * shortened to its head phrase. Not for "..., or not?" (that is yes/no) and not for a list ("tea, coffee, or juice?").
 */
export function clausePair(q: string): [string, string] | null {
  if (isOrNot(q)) return null;
  const m = /^(.*\S)\s*,?\s+or\s+(.*?)\s*\?\s*$/i.exec(q.trim());
  if (!m) return null;
  const left = leftClause(m[1]);
  if (!left) return null;
  const right = m[2].split(/\s*,\s*/)[0];
  const a = clauseOption(left, right);
  const b = clauseOption(right, left);
  const aw = a.split(/\s+/).filter(Boolean);
  const bw = b.split(/\s+/).filter(Boolean);
  if (!aw.length || !bw.length || aw.length > 5 || bw.length > 5) return null;
  if (LABEL_BAD.test(a) || LABEL_BAD.test(b)) return null;
  if (lc(a) === lc(b) || NEG.test(a) || NEG.test(b)) return null;
  return [a, b];
}

const stem = (w: string) => lc(w).replace(/'s$/, '').replace(/(?:ing|ed|es|s)$/, '');
const LEFTOVER_START = new RegExp(`^(?:is|was|are|were|am|do|does|did|would|will|can|could|should|shall|want|wanna|like|rather|prefer|fancy|mean|need|shall|should|would|will|could|can|going|gonna)\\b`, 'i');
const LEFTOVER_END = /\b(?:to|for|at|with|of|the|a|an|and|or|have|be|going|get|do|is|are|was|were|you|your|i|we|my)$/i;
const PRONOUN_ONLY = /^(?:it|that|this|one|ones|them|those|these|either|both|something|anything)$/i;

/**
 * Validate options the on-device model copied out of an either-or question: exactly two, each 1-4 words, every
 * word in the question (or the same word stem), no leftover question verbs at the start, no dangling word at the
 * end, not a bare pronoun, no negative, and the two differ. Returns the cleaned pair, or null to fall back.
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
    out.push(profile ? snapToQuestionItem(o, q, profile) : o);
  }
  if (lc(out[0]) === lc(out[1])) return null;
  return [out[0], out[1]];
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

/** Rule 4. "How much pain / how bad is the ache" -> fixed pain level card. */
export function isPainLevel(q: string): boolean {
  return (/\bhow\s+(much|bad)\b/i.test(q) && BODY_WORD.test(q) && !MEDICINE.test(q)) || /\bpain\s+(level|score)\b/i.test(q);
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
  return FEELING_Q.test(q);
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
export const FEELING_SCALES: Record<FeelingSubtype, Record<'mild' | 'more', string[]>> = {
  general: { mild: ['good', 'okay', 'bad'], more: ['good', 'bad'] },
  taste: { mild: ['tasty', 'plain', 'too salty'], more: ['tasty', 'plain'] },
  idea: { mild: ['good idea', 'leave it'], more: ['good idea', 'leave it'] },
  result: { mild: ['good', 'bad'], more: ['good', 'bad'] },
  person: { mild: ['like them', 'okay', 'unhappy'], more: ['like them', 'unhappy'] },
};

/** KB §7 rule 5: up to 3 choices (plus the escape) at "mild"; 2 at "more" and "most". */
export function choiceCap(support: 'mild' | 'more' | 'most'): number {
  return support === 'mild' ? 3 : 2;
}
export const scaleLevel = (support: 'mild' | 'more' | 'most'): 'mild' | 'more' => (support === 'mild' ? 'mild' : 'more');

// ---------------------------------------------------------------- rule 8
/** Rule 8. The escape choice by question type. */
export function escapeFor(q: string, answers: string[] = [], profile?: Profile): string {
  if (/^\s*(who|whom)\b/i.test(q) || /^\s*which\s+(person|one of them)\b/i.test(q)) return 'someone else';
  if (/^\s*where\b/i.test(q)) return 'somewhere else';
  if (profile && answers.length >= 2 && answers.every((a) => findPerson(a, profile) || isPartnerName(a, profile))) return 'someone else';
  return 'something else';
}

// ---------------------------------------------------------------- rule 9
const CONTACT = /\b(call|calls|ring|phone|visit|visits|invite|invites|text|message|write\s+to)\b/i;
const GENERIC_PERSON = /\b(another person|someone|somebody|other person|a friend)\b/i;

export function findPerson(label: string, profile: Profile): Person | undefined {
  const w = new Set(words(label).map((x) => x.replace(/'s$/, '')));
  return profile.people.find((p) => p.name && w.has(lc(p.name)));
}
export function isPartnerName(label: string, profile: Profile): boolean {
  return !!profile.partnerName && words(label).map((x) => x.replace(/'s$/, '')).includes(lc(profile.partnerName));
}

/**
 * Rule 9. For call / visit / invite questions, household members (and the partner) are removed,
 * and a generic "another person" choice is replaced by a named person who does not live in the home.
 */
export function householdFilter(choices: string[], q: string, profile: Profile): string[] {
  if (!CONTACT.test(q)) return choices;
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
  if (!/^\s*(who|whom)\b/i.test(q) && !CONTACT.test(q)) return choices;
  const known = new Set(
    [profile.partnerName, ...profile.people.map((p) => p.name), ...profile.places, ...profile.tv, ...profile.music, ...profile.foods]
      .filter(Boolean).map(lc),
  );
  return choices.filter((c) => {
    const caps = c.split(/\s+/).filter((w) => /^[A-Z][a-z']+$/.test(w)).map((w) => lc(w).replace(/'s$/, ''));
    return caps.every((w) => known.has(w) || [...known].some((k) => k.split(' ').includes(w)));
  });
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

const TIME_WORD = /\b(now|later|soon|today|tonight|tomorrow|morning|afternoon|evening|night|lunchtime|teatime|bedtime|weekend|week|month|monday|tuesday|wednesday|thursday|friday|saturday|sunday|o'clock|half past|quarter|noon|midday|early|late|after|before|\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/i;
const PERSONISH = /\b(friend|mate|neighbou?r|carer|nurse|doctor|gp|therapist|physio|driver|boss|family|someone|somebody|nobody|everyone|brother|sister|mum|dad|mother|father|son|daughter|uncle|aunt|cousin|wife|husband|grandson|granddaughter|grandchild|grandchildren|vicar|priest|teacher|colleague|workmate|postman|postie|cleaner|hairdresser|barber|chemist|pharmacist|dentist|optician|plumber|builder|landlord|butcher|milkman|manager|coach|captain|team|people|kids|children|grandkids|partner|pal|lads?|girls|boys|man|woman|lady|bloke|guy|minister|councillor|vet)\b/i;
const PAST_LIFE = /\b(used to|when you were|back then|years ago|growing up|at school|at work|in the army|in the war|on the buses|best (?:mate|friend|pal)|old (?:mate|friend|pal|boss|job)|first (?:job|car|house|love|boss))\b/i;
const SAY_Q = /^\s*what\b.*\b(say|tell|write|text|message)\b/i;

export type QType = 'who' | 'where' | 'when' | 'say' | 'what';
export function questionType(q: string): QType {
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
export type QuizKind = 'now' | 'identity' | 'remember' | 'fact';

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
  /\bwhat(?:'s|\s+is|\s+was|\s+were)\s+(?:\w+\s+){0,3}(?:called|named)\s*\??$/i,
  /\bwhat\s+do\s+(?:we|you)\s+call\b/i,
  /\bwho\s+(?:was|were)\s+(?:that|the|those)\b/i,
];

export function quizKind(q: string): QuizKind | null {
  if (!/\?\s*$/.test(q)) return null;
  if (NOW_Q.test(q)) return 'now';
  if (IDENTITY_Q.test(q)) return 'identity';
  // "What do you remember about the trip?" asks them to share, not to retrieve one right answer: a normal card
  if (REMEMBER_Q.test(q) && !/\bwhat\s+(?:do|did)\s+you\s+(?:remember|recall)\s+(?:about|of|most|best)\b/i.test(q)) return 'remember';
  if (FACT_TARGET.some((re) => re.test(q))) return 'fact';
  return null;
}
/** Rule 9: a question that asks the person to retrieve a fact, a name or the date is a test, not a conversation. */
export function isQuiz(q: string): boolean {
  return quizKind(q) !== null;
}

const GENERIC_TELL = "If you know it, say it: \"It was …\". If you don't: \"I can't think of it either. Shall we look it up together?\"";

/**
 * What the partner says instead. Only a "now" question gets today's date or time; a past event ("What year did
 * we marry?") never does. "Do you remember our trip?" becomes "I was thinking about our trip."
 */
export function quizRephrase(q: string, partnerName: string, now = new Date()): string {
  const k = quizKind(q);
  if (k === 'identity' && /\bmy\s+name\b|\bwho\s+am\s+i\b|who\s+i\s+am\b/i.test(q)) return `It's me, ${partnerName || 'your partner'}.`;
  if (k === 'now') {
    if (/\btime\b/i.test(q)) return `It's ${now.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' })} now.`;
    if (/\byear\b/i.test(q)) return `It's ${now.getFullYear()}.`;
    if (/\bmonth\b/i.test(q)) return `It's ${now.toLocaleDateString('en-GB', { month: 'long' })}.`;
    const day = now.toLocaleDateString('en-GB', { weekday: 'long' });
    const date = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
    return `It's ${day} today, ${date}.`;
  }
  if (k === 'remember' && !FACT_TARGET.some((re) => re.test(q)) && !/\b(?:who|what|which|where|how)\b/i.test(q.replace(/^.*?\b(?:remember|recall)\b/i, ''))) {
    // reminiscence: share the memory instead of asking whether they have it
    const m = /\b(?:remember|recall|mind)\s+(.*?)\s*[?,]*\s*$/i.exec(q);
    let topic = (m?.[1] ?? '').replace(/\b(?:do|can|could)\s+you\s*$/i, '').trim();
    topic = topic.replace(/\byour\b/gi, 'your').replace(/,\s*(?:love|dear|darling|hen|pet|mum|dad|[A-Z][a-z]+)\s*$/u, '').trim();
    if (topic) return `I was thinking about ${topic}.`;
  }
  return GENERIC_TELL;
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
    if (ws.length < 2 || ws[ws.length - 1].replace(/s$/, '') !== noun) return false;
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
export function route(kind: string, q: string, answers: string[], isOrPair: boolean): RouteDecision {
  const reasons: string[] = [];
  if (kind !== 'choice' || isOrPair) return { to: 'device', reasons };
  const core = answers.map(lc).filter((c) => !ESCAPES.has(c));
  const qw = new Set(words(q));
  if (core.filter((c) => c.split(/\s+/).some((w) => MOOD_WORDS.has(w))).length >= 2) reasons.push('two or more mood words');
  if (core.some((c) => qw.has(c) && /er$/.test(c))) reasons.push('comparative echoed from the question');
  const heads = core.map((c) => (c.split(/\s+/).pop() ?? '').replace(/s+$/, ''));
  if (new Set(heads).size < heads.length) reasons.push('duplicate head noun');
  if (core.length < 2) reasons.push('fewer than two usable choices');
  return { to: reasons.length ? 'cloud' : 'device', reasons };
}

// ---------------------------------------------------------------- topic
const STOP = new Set(('a an the you your yours we our us me my i it its is are am was were do does did would will can could should shall have has had ' +
  'what where who whom when which why how want like to for of on in at about with go going get got some any this that these those ' +
  'there here think feel find make made please right now so if and or but be been being he she him her his hers they them their its').split(' '));
/** Fallback topic when no model ran: up to three content words of the question. */
export function heuristicTopic(q: string): string {
  const ws = (q.match(/[A-Za-z']+/g) ?? []).filter((w) => !STOP.has(lc(w)));
  return ws.slice(0, 3).join(' ').toLowerCase() || 'question';
}

export function cleanTopic(t: string): string {
  return t.replace(/[^\w\s'-]/g, '').replace(/\s+/g, ' ').trim().split(' ').slice(0, 4).join(' ');
}
