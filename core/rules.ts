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
/** §2.4: a subject-less offer is one proposal too: "You want coffee?", "Want kringle?", "Fancy a run?", "Up for bowls?", "Need the loo?", "You hungry?". */
const OFFER_START = /^\s*(?:you\s+)?(?:want|wanna|fancy|need|like|feel like|up for|ready for|hungry for|keen on)\b|^\s*you\s+(?:hungry|thirsty|cold|warm|tired|sleepy|comfy|comfortable|ok|okay|alright|all right|ready|sure)\b/i;
/** "Ma, you want coffee?": a leading address word or name followed by a comma is not part of the question's shape. */
const VOCATIVE = /^\s*(?:[A-Z][\p{L}'-]+|ma|mum|mom|mam|dad|pa|love|hen|pet|mate|dear|darling|hon|honey|sweetheart|duck|lovey|chuck|sweetie|luv),\s*/iu;
/** The question without a leading "Ma, " / "Eileen, ": the shape checks below look at what comes after it. */
export function stripVocative(q: string): string {
  return q.replace(VOCATIVE, '');
}
/** Rule 2. An aux-verb question (or a subject-less offer) with no "or" becomes yes / no / not sure. */
export function isAuxYesNo(q: string): boolean {
  const s = stripVocative(q);
  return (AUX_START.test(s) || OFFER_START.test(s)) && !/\bor\b/i.test(s);
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
  q = stripVocative(q);
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
    out.push(o);
  }
  return checkPair([out[0], out[1]], q, profile);
}

// ---------------------------------------------------------------- rule 3: the label check (build spec §2.5)
const LINKERS = '(?:and|or|of|the|a|an|on|with|by|in|at|for)';
const TIME_ONLY = /^(?:now|later|soon|today|tonight|tomorrow|morning|afternoon|evening|night|teatime|lunchtime|bedtime|weekend|week|month|monday|tuesday|wednesday|thursday|friday|saturday|sunday|this|next|last|the|on|at|in|after|before|early|late|first|thing|\d+(?::\d+)?|am|pm|o'clock|half|quarter|past|to)$/i;
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

/** "I paid it" / "you paid it" flip when the partner reads them aloud: use the names when About me has them. */
function personSide(label: string, profile?: Profile): string {
  if (!profile) return label;
  if (profile.partnerName && /^i\s+(?!mean\b|think\b)[a-z]/i.test(label)) return label.replace(/^i\b/i, profile.partnerName);
  if (profile.personName && /^you\s+(?!want|like|mean|know|think|fancy|need|rather|prefer)[a-z]/i.test(label)) return label.replace(/^you\b/i, profile.personName);
  return label;
}

/** The time phrase the question ends with, shared by both sides ("...or the garden centre this weekend?"). */
function sharedTail(q: string): string | null {
  const m = /\b((?:this|next|on|for|by|at)\s+(?:weekend|morning|afternoon|evening|night|week|month|lunch|dinner|tea|breakfast|supper|bedtime|teatime|christmas|easter|monday|tuesday|wednesday|thursday|friday|saturday|sunday|arvo|avo)|in the (?:morning|afternoon|evening)|tonight|today|tomorrow|later|now)\s*\?\s*$/i.exec(q);
  return m ? m[1] : null;
}

/**
 * The §2.5 label check, applied to both the model's copied options and the code parser's pair. A side is
 * rewritten (noun phrase completed from the question, snapped to an About-me item, a shared time phrase dropped,
 * a subject pronoun replaced by the name) or rejected (a question or leftover, a bare pronoun, a negative, too long).
 * The pair is rejected when the sides are the same, synonyms, or not on one axis (a time against a thing).
 */
export function checkPair(pair: [string, string], q: string, profile?: Profile): [string, string] | null {
  const tail = sharedTail(q);
  const out: string[] = [];
  for (const side of pair) {
    // punctuation around a side ("- toast", "toast,") is never part of a label
    let s = side.replace(/[?.!,;:"]+/g, ' ').replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '').replace(/\s+/g, ' ').trim().replace(/^(?:the|a|an)\s+/i, '');
    if (tail) s = s.replace(new RegExp(`\\s+${esc(tail)}$`, 'i'), '');
    for (let i = 0; i < 3; i++) s = s.replace(FUNC_END, '');
    s = s.replace(/^(?:the|a|an)\s+/i, '').trim();
    if (!s) return null;
    if (LABEL_BAD.test(s) || LEFTOVER_START.test(s) || LEFTOVER_END.test(s) || PRONOUN_ONLY.test(s) || NEG.test(s)) return null;
    s = expandFromQuestion(s, q);
    if (profile) s = snapToQuestionItem(s, q, profile);
    s = personSide(s, profile);
    if (s.split(/\s+/).length > 5) return null;
    out.push(s);
  }
  const [a, b] = out;
  if (lc(a) === lc(b)) return null;
  const g = SYNONYMS.findIndex((grp) => grp.includes(lc(a)));
  if (g >= 0 && SYNONYMS[g].includes(lc(b))) return null;
  if (isTimeOnly(a) !== isTimeOnly(b)) return null;
  return [a, b];
}

/** The code parser's pair after the same label check as the model's options. */
export function codePair(q: string, profile?: Profile): [string, string] | null {
  const rx = orPair(q);
  return rx ? checkPair(rx, q, profile) : null;
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
const NOT_A_TOPIC = new Set([...ADVERB_ONLY, 'bit', 'while', 'moment', 'minute', 'rather', 'something', 'anything', 'both', 'either', 'one', 'ones', 'thing', 'things', 'way', 'lot']);
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
export function orHeadline(q: string, pair: [string, string], profile?: Profile, modelTopic = ''): string {
  let s = q.replace(/[?.!]+$/, '');
  for (const side of pair) {
    const re = new RegExp(`\\b${esc(side)}(?:'s|s|es)?\\b`, 'i');
    if (re.test(s)) s = s.replace(re, ' ');
    else for (const w of words(side)) s = s.replace(new RegExp(`\\b${esc(w)}(?:'s|s|es)?\\b`, 'gi'), ' ');
  }
  s = s.replace(/\s+/g, ' ').trim();
  const time = /\b((?:this|next|on|for)\s+(?:weekend|morning|afternoon|evening|week|month|year|lunch|dinner|tea|breakfast|supper|christmas|easter|birthday|monday|tuesday|wednesday|thursday|friday|saturday|sunday|arvo|avo)|tonight|today|tomorrow)\b/i.exec(s);
  if (time) return time[1].replace(/^(?:for|on)\s+/i, '');
  const name = lc(profile?.personName ?? '');
  const content = (s.match(/[A-Za-z][A-Za-z'-]*/g) ?? []).filter((w) => {
    const l = lc(w);
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
  const joined = `${pair[0]} or ${pair[1]}`;
  if (joined.split(/\s+/).length <= 5) return joined;
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
  q = stripVocative(q);
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
    [profile.partnerName, ...profile.people.map((p) => p.name), ...profile.people.map((p) => p.nickname ?? ''), ...profile.places, ...profile.tv, ...profile.music, ...profile.foods]
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
  if (/\bwhen(?:'s|\s+is|\s+will)\b|\bnext\b/i.test(s) && !/\b(?:was|were|did)\b/i.test(s)) return "If you know it, say it: \"It's on …\".";
  if (/\bhow\s+many\b/i.test(s)) return "If you know it, say it: \"We've got …\".";
  return GENERIC_TELL;
}

/**
 * What the partner says instead. Only a "now" question gets today's date or time; a past event ("What year did
 * we marry?") never does. "Do you remember our trip?" becomes "I was thinking about our trip."
 */
export function quizRephrase(q: string, partnerName: string, now = new Date(), profile?: Profile): string {
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
  'what where who whom when which why how want need like to for of on in at about with go going get got some any this that these those ' +
  'there here think feel find make made please right now so if and or but be been being he she him her his hers they them their its').split(' '));
/** Fallback topic when no model ran: up to three content words of the question, address words and the person's name left out (§2.2). */
export function heuristicTopic(q: string, profile?: Profile): string {
  const name = lc(profile?.personName ?? '');
  const ws = (q.match(/[A-Za-z']+/g) ?? []).filter((w) => !STOP.has(lc(w)) && !ADDRESS.has(lc(w)) && lc(w) !== name);
  return ws.slice(0, 3).join(' ').toLowerCase() || 'question';
}

// ---------------------------------------------------------------- open questions: allowed sources (§2.6)
const EAT_Q = /\b(?:eat|food|dinner|lunch|breakfast|supper|cook|meal|hungry|fancy for tea|have for tea)\b/i;
const WATCH_Q = /\b(?:watch|telly|tv|television|programme|program|show|film|movie)\b/i;
const LISTEN_Q = /\b(?:listen|music|song|songs|record|records|radio|put on|play)\b/i;
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
  const t = questionType(q);
  let pool: string[] = [];
  let source = '';
  if (t === 'who') {
    // only a contact question ("who shall we ring / invite") asks for the family; "who do you fancy on the quiz" does not
    if (!CONTACT.test(q) || PAST_LIFE.test(q)) return null;
    pool = contactPool(profile);
    source = 'people from About me';
  } else if (t === 'where') { pool = profile.places; source = 'places from About me'; }
  else if (t === 'what' && EAT_Q.test(q)) { pool = profile.foods; source = 'foods from About me'; }
  else if (t === 'what' && WATCH_Q.test(q)) { pool = profile.tv; source = 'TV from About me'; }
  else if (t === 'what' && LISTEN_Q.test(q)) { pool = profile.music; source = 'music from About me'; }
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
  if (questionType(q) !== 'who' || !CONTACT.test(q) || PAST_LIFE.test(q) || contactPool(profile).length < 2) return answers;
  const relations = new Set(profile.people.map((p) => lc(p.relation)).filter(Boolean));
  return answers.filter((a) => {
    const t = a.trim();
    if (findPerson(t, profile)) return true;
    return !GENERIC_WHO.test(t) && !relations.has(lc(t).replace(/^(?:a|an|the|your|our|my|their)\s+/, ''));
  });
}

export function cleanTopic(t: string): string {
  return t.replace(/[^\w\s'-]/g, '').replace(/\s+/g, ' ').trim().split(' ').slice(0, 4).join(' ');
}
