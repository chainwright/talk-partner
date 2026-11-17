// Builds the ONLY text that may leave the device: the partner's question with EVERY About-me term replaced by a
// neutral placeholder. People (names, and relation words that point at one person) -> "Person A"; foods ->
// "Food A"; places -> "Place A"; TV -> "Show A"; music -> "Music A"; other About-me entries -> "Thing A".
// The placeholder map stays on the device and is used to put the real words back into the cloud's answer.
// The profile itself is never part of a cloud payload; findLeaks() is the last check before anything is sent.

import type { Profile } from './types';

export interface Stripped {
  text: string;
  /** "Place A" -> the words it replaced. Stays on the device; used to restore the cloud's answer. */
  map: Record<string, string>;
}

type Kind = 'Person' | 'Food' | 'Place' | 'Show' | 'Music' | 'Thing' | 'Name';

/**
 * Capitalised words that are ordinary English, not someone's name: these stay in the cloud text. Any other
 * capitalised word that is not in About me becomes "Name A" (§2.19, a heuristic). Since the simulation of 16 Nov
 * (set D: "Dr. Patel's office called…", "Mike from next door…" went as typed) that includes the word that opens a
 * sentence, unless it is in ORDINARY_OPENERS below, and the word after a title ("Dr. Patel", "aunt linda").
 * When the code cannot tell a name from a word, the word is swapped: a label too many costs a little of the cloud's
 * understanding, a name too many is someone's name on the wire.
 */
const COMMON_CAPS = new Set([
  'i', "i'm", "i'll", "i'd", "i've", 'a', 'ok', 'okay', 'tv', 'gp', 'nhs', 'bbc', 'itv', 'pc', 'dvd', 'cd', 'id', 'ps',
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
  'christmas', 'xmas', 'easter', 'halloween', 'thanksgiving', 'hogmanay', 'boxing', 'new', 'year', 'eve', 'god', 'lent', 'advent', 'remembrance',
  'mum', 'mummy', 'mom', 'mam', 'ma', 'dad', 'daddy', 'pa', 'nan', 'nana', 'nanna', 'gran', 'granny', 'grandma', 'grandad', 'granddad', 'grandpa', 'auntie', 'aunt', 'uncle',
  'mr', 'mrs', 'ms', 'miss', 'dr', 'doctor', 'nurse', 'sir', 'madam', 'love', 'father', 'reverend', 'vicar',
  'english', 'french', 'spanish', 'italian', 'german', 'chinese', 'indian', 'thai', 'greek', 'turkish', 'polish', 'british', 'american', 'scottish', 'welsh', 'irish', 'australian',
  'covid', 'wifi', 'wi-fi', 'ipad', 'iphone', 'facebook', 'youtube', 'netflix', 'zoom', 'skype', 'whatsapp', 'amazon', 'google', 'spotify', 'radio', 'tesco', 'asda', 'aldi', 'lidl', 'sainsbury',
  'yes', 'no', 'oh', 'ah', 'hi', 'hello', 'thanks', 'sorry', 'please', 'right', 'well', 'so', 'then', 'also', 'and', 'or', 'but', 'if', 'the', 'what', 'who', 'where', 'when', 'how', 'why', 'which',
  'do', 'does', 'did', 'is', 'are', 'was', 'were', 'can', 'could', 'should', 'shall', 'will', 'would', 'have', 'has', 'had', 'you', 'we', 'it', 'he', 'she', 'they', 'your', 'my', 'our', 'his', 'her',
]);
/** Where a word starts a sentence: at the start, or after a sentence end (or an opening quote / dash after one). */
const SENTENCE_START = /(?:^|[.?!:;]|\n)\s*["'“‘(-]*\s*$/;

/**
 * Words that often open a partner's question and are not names: the things asked about ("Coffee or tea?", "Pills
 * with juice?"), what to do ("Rate that headache"), how someone is ("Hungry?"). A word that opens a sentence and is
 * not here (nor in COMMON_CAPS) is treated as a name and swapped. The list is not complete and does not need to be:
 * a missing word is swapped for a label and put back on this computer.
 */
const ORDINARY_OPENERS = new Set((
  // asking, telling, offering
  'want wanna fancy need like feel ready up time let lets tell ask say show point rate give take put get go come sit stand lie rest wait look listen ' +
  'try pick choose think remember know mind care keep leave stay turn switch open close shut bring call ring phone text write read watch play eat drink ' +
  'cook make wear wash walk drive sleep wake help stop start finish use find see hear meet visit invite send pay buy sell check hold lift move push pull ' +
  'feeling going doing having getting coming wanting thinking looking sitting eating sleeping hurting talking speaking ' +
  // how someone is
  'hungry thirsty cold warm hot tired sleepy comfy comfortable sore dizzy sick better worse fine good bad happy sad scared worried upset bored busy lonely ' +
  'enough more less too still again maybe perhaps really just only even also now later soon today tonight tomorrow yesterday here there never always ' +
  'sometimes usually already almost about after before during until since because although though while once twice first next last then ' +
  // small words
  'an any some this that these those all both each every either neither none nothing something anything everything nobody someone anyone everyone ' +
  'not no on in at by for from with without of to into onto over under up down out off near around through between ' +
  'me us him them mine yours ours their theirs its there\'s here\'s that\'s what\'s who\'s where\'s when\'s how\'s it\'s he\'s she\'s we\'re ' +
  'you\'re they\'re you\'ve we\'ve they\'ve you\'ll we\'ll they\'ll you\'d we\'d let\'s don\'t doesn\'t didn\'t isn\'t aren\'t wasn\'t weren\'t won\'t wouldn\'t ' +
  'can\'t couldn\'t shouldn\'t haven\'t hasn\'t hadn\'t might must may one two three four five six seven eight nine ten zero ' +
  // food and drink
  'coffee tea water juice milk cocoa beer wine soda pop lemonade squash soup sandwich toast eggs egg oatmeal porridge cereal bacon sausage cheese ' +
  'bread butter jam honey fruit apple banana orange grapes berries salad chicken beef pork fish ham turkey rice pasta noodles potato potatoes chips fries ' +
  'pizza burger pie cake cookie cookies biscuit biscuits chocolate ice cream yogurt yoghurt pudding dessert snack breakfast lunch dinner supper meal ' +
  'leftovers stew curry beans peas carrots vegetables veg meat sugar salt pepper sauce ketchup ' +
  // home, care, body, clothes
  'shower bath toilet bathroom loo bed bedroom kitchen porch garden yard garage door window light lights lamp heat heating fan blanket pillow chair ' +
  'recliner couch sofa table tv telly television radio music news film movie show game phone remote glasses hearing teeth dentures pills pill tablets ' +
  'tablet medicine meds walker wheelchair cane stick frame car bus taxi shop shops store church doctor nurse hospital clinic appointment therapy physio ' +
  'exercise exercises walk nap sleep rest shirt jumper sweater cardigan jacket coat trousers pants jeans dress skirt socks shoes slippers hat scarf gloves ' +
  'pyjamas pajamas robe red blue green grey gray black white brown pink yellow big small old new ' +
  'pain ache back hip knee shoulder neck head leg legs arm arms foot feet hand hands stomach chest ' +
  'cash card money mail post letter paper newspaper book puzzle crossword cards photo photos picture pictures dog cat pet ' +
  'mother father sister brother wife husband son daughter grandson granddaughter kids children family friend friends neighbour neighbor ' +
  'morning afternoon evening night weekend week month birthday holiday home outside inside upstairs downstairs somewhere anywhere nowhere'
).split(/\s+/));

/** A word before a name: "Dr. Patel", "Aunt Linda", "Pastor Dave". The title stays; the word after it is swapped. */
const TITLES = new Set(['dr', 'doctor', 'mr', 'mrs', 'ms', 'miss', 'mx', 'aunt', 'auntie', 'aunty', 'uncle', 'pastor', 'father', 'fr', 'reverend', 'rev', 'sister', 'brother', 'nurse', 'prof', 'professor', 'cousin', 'grandma', 'grandpa', 'granny', 'nana', 'coach', 'officer', 'deacon', 'rabbi', 'bishop', 'minister', 'judge', 'captain', 'sergeant', 'sgt', 'sir', 'lady', 'lord']);
/** Titles that are also everyday words in lower case ("did you miss lunch", "sir"): a lowercase word after them is left alone. */
const TITLE_CAPS_ONLY = new Set(['miss', 'sir', 'lady', 'lord', 'judge', 'captain', 'minister', 'officer', 'coach', 'brother', 'sister', 'father']);
const DETERMINER = new Set(['the', 'a', 'an', 'your', 'my', 'our', 'his', 'her', 'their', 'that', 'this', 'which', 'what', 'any', 'some', 'no', 'every', 'another', 'other']);
/** Lowercase words that follow a title in ordinary speech ("the doctor called", "aunt is coming"): not a name. */
const AFTER_TITLE_NOT_NAME = new Set((
  'called calls calling phoned phones rang rings said says came comes coming went goes going visited visits visiting wants wanted asked asks told tells ' +
  'sent wrote texted emailed left arrived is was will would can could should has had does did might may must and or but who that which when if so ' +
  'about again today tomorrow tonight yesterday now later soon here there too also still never always just really appointment visit office surgery ' +
  'practice clinic call said\'s').split(/\s+/));
/** Names that are also ordinary capitalised words (a month, an auxiliary): a name only where the next word says so. */
const NAME_OR_WORD = new Set(['will', 'may', 'june', 'april', 'august']);
const NAME_CONTEXT = /^(?:['’]s\b|\s+(?:is|was|has|had|says|said|called|calls|rang|phoned|wants|wanted|came|comes|and|from)\b)/i;

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const lc = (s: string) => s.toLowerCase();
const norm = (w: string) => lc(w).replace(/[’]/g, "'").replace(/'s$/, '').replace(/'$/, '');

/** Words that carry no personal information on their own: they join an entry's words, or name a whole category. */
const LINK = new Set(['the', 'a', 'an', 'by', 'at', 'on', 'in', 'of', 'with', 'and', 'to', 'no', 'near', 'from', 'for', 'my', 'our', 'your', 'his', 'her']);
const GENERIC = new Set([
  ...LINK,
  'music', 'food', 'tv', 'telly', 'show', 'shows', 'programme', 'programmes', 'film', 'films', 'place', 'places', 'thing', 'things',
  'tea', 'dinner', 'lunch', 'breakfast', 'supper', 'meal', 'drink', 'old', 'new', 'big', 'little', 'small', 'good', 'nice', 'best',
  'one', 'ones', 'some', 'any', 'bit', 'day', 'days', 'time', 'week', 'weekend', 'today', 'tonight', 'sunday', 'saturday',
  // words that name a whole kind of thing: "a game" is not the family's "Packers games", "the store" not their "hardware store"
  // (set D, 16 Nov: "Tyler's got a game Saturday" went as "a Show A Saturday")
  'game', 'games', 'match', 'store', 'shop', 'shops',
  // function words: never a key on their own ("is" in "The Price Is Right", "up" in "the cottage up at the lake")
  'is', 'are', 'was', 'were', 'be', 'been', 'am', 'do', 'does', 'did', 'have', 'has', 'had', 'will', 'would', 'can', 'could',
  'it', 'its', 'he', 'she', 'we', 'they', 'i', 'me', 'you', 'him', 'them', 'us', 'their', 'this', 'that', 'these', 'those',
  'up', 'down', 'out', 'off', 'over', 'under', 'into', 'onto', 'round', 'around', 'about', 'after', 'before', 'back', 'away',
  'right', 'left', 'just', 'all', 'more', 'most', 'very', 'so', 'too', 'not', 'or', 'but', 'if', 'as', 'than', 'then', 'there', 'here',
  'what', 'who', 'where', 'when', 'how', 'why', 'which', 'called', 'every', 'each', 'other', 'own', 'same', 'first', 'last',
]);

interface Term {
  kind: Kind;
  /** the About-me entry as written */
  entry: string;
  /** distinctive words: any of these in the question is a profile term */
  keys: Set<string>;
  /** all content words of the entry (keys + generic ones), used to extend a matched span */
  words: Set<string>;
  /** for people: the name restored in place of the placeholder */
  restoreAs?: string;
}

const WORD = /[\p{L}\p{N}'’]+/gu;
function contentWords(entry: string): string[] {
  return (entry.match(WORD) ?? []).map(norm).filter((w) => w && !LINK.has(w));
}

/** A word and its plural / singular forms: "scone" also matches "scones", "darts" also "dart" (§2.19). */
function plurals(w: string): string[] {
  if (w.length < 3 || /\d/.test(w)) return [w];
  const out = new Set([w]);
  if (/(?:s|x|z|ch|sh)$/.test(w)) out.add(`${w}es`);
  if (/[^s]y$/.test(w) && !/[aeiou]y$/.test(w)) out.add(`${w.slice(0, -1)}ies`);
  out.add(`${w}s`);
  if (w.length >= 4 && /[^s]s$/.test(w)) out.add(w.slice(0, -1));
  if (w.length >= 5 && /(?:ses|xes|zes|ches|shes)$/.test(w)) out.add(w.slice(0, -2));
  if (w.length >= 5 && /ies$/.test(w)) out.add(`${w.slice(0, -3)}y`);
  return [...out];
}

/** Every About-me entry, as a term the stripper looks for. Exported for the leak check and the tests. */
export function profileTerms(p: Profile): Term[] {
  const terms: Term[] = [];
  const add = (kind: Kind, entry: string, restoreAs?: string) => {
    const e = entry.trim();
    if (!e) return;
    const ws = contentWords(e);
    // an entry made only of generic words ("tea") still counts: then all its words are keys
    const keys = ws.filter((w) => !GENERIC.has(w));
    const base = keys.length ? keys : ws;
    terms.push({ kind, entry: e, keys: new Set(base.flatMap(plurals)), words: new Set(ws.flatMap(plurals)), restoreAs });
  };
  // names and nicknames ("Jen" for Jenny): each is swapped and restored as the exact word typed (§2.19)
  const names = [p.personName, p.partnerName, ...p.people.map((x) => x.name), ...p.people.map((x) => x.nickname ?? '')].filter(Boolean);
  for (const n of Array.from(new Set(names))) add('Person', n, n);
  for (const f of p.foods) add('Food', f);
  for (const f of p.places) add('Place', f);
  for (const f of p.tv) add('Show', f);
  for (const f of p.music) add('Music', f);
  for (const f of p.other ?? []) add('Thing', f);
  return terms;
}

interface Tok { w: string; start: number; end: number }
// Whole words only: a contraction ("isn't", "Pat'll") is one token and never split; a possessive "'s" stays outside.
const tokens = (s: string): Tok[] => [...s.matchAll(WORD)].map((m) => {
  const raw = m[0].replace(/['’]s$/i, '').replace(/['’]$/, '');
  return { w: norm(m[0]), start: m.index!, end: m.index! + raw.length };
});

/**
 * Spans in `text` that belong to `term`, boundary-aware:
 *  1. the whole entry as written (without a leading "the"), on word boundaries;
 *  2. otherwise runs that START and END on a key word of the entry, joined only by the entry's own words or small
 *     linking words ("park by the canal"), so no dangling function word ("cottage up") is ever swapped.
 */
function spans(text: string, term: Term): [number, number][] {
  const out: [number, number][] = [];
  const whole = term.entry.replace(/^the\s+/i, '');
  const re = new RegExp(`(?<![\\p{L}\\p{N}'’])${esc(whole)}(?![\\p{L}\\p{N}])(?!['’](?!s\\b)\\p{L})`, 'giu');
  for (const m of text.matchAll(re)) out.push([m.index!, m.index! + m[0].length]);
  const taken = (a: number, b: number) => out.some(([x, y]) => a < y && b > x);
  const ts = tokens(text);
  // two tokens belong to one phrase only when just spaces (or a possessive/plural apostrophe) sit between them:
  // never across a comma, a dash or a placeholder already written
  const joined = (x: number) => /^(?:['’]s?)?\s+$/.test(text.slice(ts[x - 1].end, ts[x].start));
  let i = 0;
  while (i < ts.length) {
    if (!term.keys.has(ts[i].w) || taken(ts[i].start, ts[i].end)) { i++; continue; }
    let j = i;
    for (;;) {
      let k = j + 1;
      while (k < ts.length && k - j <= 3 && joined(k) && !term.keys.has(ts[k].w) && (term.words.has(ts[k].w) || LINK.has(ts[k].w))) k++;
      if (k < ts.length && joined(k) && term.keys.has(ts[k].w) && !taken(ts[k].start, ts[k].end)) { j = k; continue; }
      break;
    }
    out.push([ts[i].start, ts[j].end]);
    i = j + 1;
  }
  return out.sort((a, b) => a[0] - b[0]);
}

const PLACEHOLDER = /\b(?:Person|Food|Place|Show|Music|Thing|Name) [A-Z]\b/g;
const ARTICLE = '(?:(?:your|my|our|his|her|their|the)\\s+)?';

export function stripQuestion(q: string, profile: Profile): Stripped {
  const map: Record<string, string> = {};
  const next: Record<Kind, number> = { Person: 0, Food: 0, Place: 0, Show: 0, Music: 0, Thing: 0, Name: 0 };
  const labelFor = new Map<string, string>();
  // one label per exact wording found, so the person's card gets back exactly the words the partner typed
  const label = (t: Term, found: string, restoreAs?: string) => {
    const back = restoreAs ?? found;
    const id = `${t.kind}:${back}`;
    let l = labelFor.get(id);
    if (!l) {
      l = `${t.kind} ${String.fromCharCode(65 + next[t.kind]++)}`;
      labelFor.set(id, l);
      map[l] = back;
    }
    return l;
  };

  let text = q;
  // long digit runs (phone numbers, door codes) never leave either
  text = text.replace(/\d[\d\s-]{4,}\d/g, '[number]');

  // people first: names, then relation words that point at exactly one known person ("your granddaughter")
  const terms = profileTerms(profile);
  const people = terms.filter((t) => t.kind === 'Person');
  for (const t of people.sort((a, b) => b.entry.length - a.entry.length)) {
    const re = new RegExp(`(?<![\\p{L}\\p{N}'’])${esc(t.entry)}(?![\\p{L}\\p{N}])(?!['’](?!s\\b)\\p{L})`, 'giu');
    text = text.replace(re, (found) => label(t, found));
  }
  const rels = new Map<string, string[]>();
  for (const p of profile.people) {
    const r = lc(p.relation ?? '').trim();
    if (r && p.name) rels.set(r, [...(rels.get(r) ?? []), p.name]);
  }
  for (const [rel, who] of [...rels.entries()].sort((a, b) => b[0].length - a[0].length)) {
    const re = new RegExp(`\\b${ARTICLE}${esc(rel)}\\b`, 'gi');
    if (who.length === 1) {
      const t = people.find((x) => x.entry === who[0]) ?? { kind: 'Person' as const, entry: who[0], keys: new Set<string>(), words: new Set<string>(), restoreAs: who[0] };
      text = text.replace(re, () => label(t, who[0], who[0]));
    } else {
      text = text.replace(re, 'someone');
    }
  }

  // then every other About-me entry, longest first so "the park by the canal" wins over a shorter overlap.
  // Placeholders already written are masked so their words ("Place", "A") can't join a later match.
  const masked: string[] = [];
  const mask = (s: string) => s.replace(PLACEHOLDER, (m) => String.fromCharCode(0xe100 + masked.push(m) - 1));
  const things = terms.filter((t) => t.kind !== 'Person').sort((a, b) => b.entry.length - a.entry.length);
  text = mask(text);
  for (const t of things) {
    const sp = spans(text, t);
    for (const [s, e] of [...sp].reverse()) {
      const found = text.slice(s, e);
      text = text.slice(0, s) + mask(label(t, found)) + text.slice(e);
    }
  }
  // last: a capitalised word that is not ordinary English and not in About me is probably a name the partner didn't
  // list ("a trip to Whitby", "ring Pauline", "Mike from next door…"), and so is the word after a title, whatever
  // its case ("Dr. Patel", "aunt linda"). It goes as "Name A" and comes back on the device.
  const nameTerm: Term = { kind: 'Name', entry: '', keys: new Set(), words: new Set() };
  const all = tokens(text);
  const ordinary = (w: string) => ORDINARY_OPENERS.has(w) || GENERIC.has(w) || (w.length > 3 && ORDINARY_OPENERS.has(w.replace(/(?:es|s)$/, '')));
  const names = all.filter((tk, i) => {
    const raw = text.slice(tk.start, tk.end);
    if (/\p{N}/u.test(raw)) return false;
    const low = lc(raw);
    const cap = /^\p{Lu}/u.test(raw);
    const prev = i > 0 ? all[i - 1] : null;
    const title = prev && /^\.?\s+$/.test(text.slice(prev.end, tk.start)) ? lc(text.slice(prev.start, prev.end)) : '';
    if (title && TITLES.has(title)) {
      // "Dr. Patel", "Aunt May": any capitalised word after a title but a small function word
      if (cap) return !GENERIC.has(low);
      // "dr. patel", "aunt linda": a lowercase word after a title, unless the title is used as a plain noun
      // ("the doctor called", "your aunt is coming") or is an everyday word itself ("miss lunch")
      const before = i > 1 ? lc(text.slice(all[i - 2].start, all[i - 2].end)) : '';
      return !TITLE_CAPS_ONLY.has(title) && !DETERMINER.has(before) && !ordinary(low) && !ordinary(tk.w) && !AFTER_TITLE_NOT_NAME.has(low) && !COMMON_CAPS.has(low);
    }
    if (!cap || TITLES.has(low)) return false;
    if (/^\p{Lu}+$/u.test(raw) && raw.length <= 4 && low !== 'i') { if (COMMON_CAPS.has(low) || raw.length <= 3) return false; } // an acronym (TV, GP, NHS) stays
    // (a plural counts as its word: "Mondays")
    if (COMMON_CAPS.has(low) || COMMON_CAPS.has(tk.w) || (low.length > 4 && low.endsWith('s') && COMMON_CAPS.has(low.slice(0, -1)))) {
      // "Will's coming over", "May called": a name where the next word says so; else the ordinary word
      return NAME_OR_WORD.has(low) && NAME_CONTEXT.test(text.slice(tk.end)) && !/^\s+(?:you|we|i|it|they|he|she|there|the|a|an|your|my|our)\b/i.test(text.slice(tk.end));
    }
    // the word that opens a sentence: a name unless it is a word partners open questions with
    if (SENTENCE_START.test(text.slice(0, tk.start))) return !ordinary(low) && !ordinary(tk.w);
    return true;
  });
  // labels in reading order (the first unknown name is "Name A"), replaced from the end so offsets stay valid
  const lbls = names.map((tk) => mask(label(nameTerm, text.slice(tk.start, tk.end))));
  for (let i = names.length - 1; i >= 0; i--) text = text.slice(0, names[i].start) + lbls[i] + text.slice(names[i].end);

  text = text.replace(/[\ue100-\uefff]/g, (c) => masked[c.charCodeAt(0) - 0xe100]);
  return { text, map };
}

export function restoreNames(s: string, map: Record<string, string>): string {
  let out = s;
  for (const [label, name] of Object.entries(map)) out = out.replace(new RegExp(`\\b${esc(label)}\\b`, 'gi'), name);
  return out;
}

/** A placeholder the cloud made up (not in the map, so nothing can be restored). */
export function hasPlaceholder(s: string): boolean {
  return new RegExp(PLACEHOLDER.source).test(s);
}

/**
 * Every About-me string found in `text`: full entries, names, relation words and each entry's distinctive words.
 * Empty means the text is safe to send. Used in tests and as the last gate before a cloud call.
 */
export function findLeaks(text: string, profile: Profile): string[] {
  const hits = new Set<string>();
  const low = lc(text);
  const ws = new Set(tokens(text).map((t) => t.w));
  for (const t of profileTerms(profile)) {
    if (new RegExp(`\\b${esc(lc(t.entry))}\\b`).test(low)) hits.add(t.entry);
    for (const k of t.keys) if (ws.has(k)) hits.add(k);
  }
  for (const p of profile.people) {
    const r = lc(p.relation ?? '').trim();
    if (r && new RegExp(`\\b${esc(r)}\\b`).test(low)) hits.add(r);
  }
  return [...hits];
}

/** A picture word may go to the cloud only when it holds no About-me term and no digits. */
export function isGenericWord(word: string, profile: Profile): boolean {
  return !findLeaks(word, profile).length && !/\d/.test(word) && !hasPlaceholder(word);
}

/**
 * The word sent for a picture. A generic word goes as it is. An About-me item goes as its neutral category
 * ("food", "a place", "a TV show", "music"), so the picture still shows the kind of thing; a name never goes.
 */
export function pictureWord(label: string, profile: Profile): string | null {
  if (isGenericWord(label, profile)) return label;
  const ws = new Set(tokens(label).map((t) => t.w));
  const t = profileTerms(profile).find((x) => x.kind !== 'Person' && [...x.keys].some((k) => ws.has(k)));
  const CATEGORY: Record<Kind, string | null> = { Person: null, Food: 'food', Place: 'a place', Show: 'a TV show', Music: 'music', Thing: null, Name: null };
  return t ? CATEGORY[t.kind] : null;
}
