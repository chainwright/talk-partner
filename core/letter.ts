// The first-letter helper. When "something else" was the answer and the choices so far did not fit, many people with
// aphasia still know how their word starts (first-letter cueing and alphabet supplementation are standard techniques
// of speech and language therapy). The person points to one letter on a big alphabet; the app offers two or three
// words that start with it, with "something else" as the way out.
//
// Where the words come from, in this order:
//   1. About them, by rules: the people, the pets and other things, the foods, the places, TV and music, and the
//      usual answers learned on this device (handed in as plain words). A word counts when it starts with the letter
//      (no "the / a / my"), or, after those, when its last word does ("ginger biscuits" under B).
//   2. the everyday words this app has a picture for, the question's own topic first.
//   3. only when the rules find fewer than two: a model adds words, through Firebase AI Logic.
//      - on this device (ONLY_ON_DEVICE, `engine.runDevice`), where the browser has Gemini Nano: the prompt holds the
//        question, the letter, what did not fit, About them and the learned words. Nothing leaves the device.
//      - else online help (PREFER_IN_CLOUD, `engine.runCloud`), only when the carer has said yes: that text holds the
//        question (About-them words swapped out, then the leak gate) and the letter, and nothing else. Not what was
//        refused, not a learned word, not a name.
// The model only proposes. Code keeps a word only if it starts with the letter, was not refused, is no name the family
// did not give (a capitalised word that About them does not hold counts as one, so the request asks for lower case), is not negative, is at most three words, and is not alcohol, tobacco or a medicine (the family can
// add any word of their own in About them; a model does not bring those in).
// Dignity: the letter screen is offered, never required; "No, I don't know" is always there; nothing counts a miss.

import { P4 } from './copy4';
import { checkedCloud, type CloudError } from './engine';
import { placeOf, subjectOf, type Subject } from './kinds';
import { finish, parseModelOutput, type PipelineEnv } from './pipeline';
import { devicePrompt, letterContext } from './prompt';
import { hasNegative, inventedNameFilter, isEscapeLabel, snapToProfile } from './rules';
import { findLeaks, hasPlaceholder, restoreNames, stripQuestion } from './strip';
import type { Card, Profile, Source, StepTrace } from './types';

export const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
/** The alphabet on the person's screen: six letters to a row (five rows; the last row holds Y, Z and the way out). */
export const LETTER_COLUMNS = 6;

export interface LetterInput {
  /** The question the person left through the way out ('' when the helper was opened on the stuck card). */
  asked: string;
  letter: string;
  /** Every choice offered so far and not taken: never offered again. */
  rejected: string[];
  /** Usual answers learned on this device (core/prefs.ts), as plain words: for the rules and the on-device step only. */
  learned?: string[];
  /** The topic of the question ('food', 'people' …), when it is one of the app's own: its everyday words come first. */
  topic?: string | null;
  /** Phase 17: the question is about a health matter (the caller reads core/redflag.ts): no model adds a word. */
  rulesOnly?: boolean;
}

/**
 * Phase 17 (the owner's own test on his phone, 24 Nov 2026: Food & drink, "something else", the first letter P gave
 * "pain, priest, photos", the words of other topics): the words of a topic, for the first letter and for the letters
 * after it. The rules stay inside the topic when it is known; a word of another topic is never offered for it.
 */
export const TOPIC_WORDS: Record<string, string[]> = {
  // (the commonest words first: three fit on a card)
  food: ['tea', 'coffee', 'water', 'juice', 'milk', 'sandwich', 'soup', 'toast', 'bread', 'cheese', 'chicken', 'pizza', 'pasta', 'potatoes', 'pie', 'eggs', 'fish', 'rice', 'cake', 'biscuits', 'chocolate', 'ice cream', 'fruit', 'apple', 'banana', 'salad', 'vegetables', 'porridge', 'cereal', 'yoghurt', 'ham', 'bacon', 'beans', 'butter', 'carrots', 'chips', 'crisps', 'custard', 'grapes', 'gravy', 'honey', 'hot chocolate', 'iced tea', 'jam', 'jelly', 'lamb', 'lemonade', 'melon', 'muffin', 'mushrooms', 'noodles', 'nuts', 'oatmeal', 'omelette', 'onions', 'orange juice', 'oranges', 'pancakes', 'peas', 'pears', 'pudding', 'quiche', 'raisins', 'roast beef', 'sausages', 'scone', 'spaghetti', 'strawberries', 'sweets', 'tomatoes', 'tuna', 'waffles', 'cocoa'],
  plans: ['bakery', 'bank', 'beach', 'cafe', 'church', 'garden', 'hairdresser', 'library', 'lake', 'market', 'park', 'post office', 'river', 'shop', 'town', 'walk', 'drive', 'exercises', 'kitchen', 'bedroom', 'porch'],
  people: ['family', 'friend', 'neighbour', 'visitor', 'carer', 'priest', 'brother', 'sister', 'son', 'daughter', 'wife', 'husband', 'grandchild', 'grandson', 'granddaughter', 'mother', 'father', 'aunt', 'uncle', 'cousin', 'doctor', 'nurse', 'physio', 'speech therapist'],
  fun: ['tv', 'music', 'news', 'film', 'radio', 'paper', 'puzzle', 'cards', 'crossword', 'quiz show', 'football', 'golf', 'gardening', 'photos', 'book', 'bingo', 'painting', 'piano'],
  rest: ['bed', 'chair', 'quiet', 'nap', 'pillow', 'blanket', 'sofa', 'sleep'],
  // (phase 17b: a drink question keeps its letters to drinks: "tea or coffee?", then "something else", then L is lemonade, never lamb)
  drink: ['tea', 'coffee', 'water', 'juice', 'milk', 'hot chocolate', 'cocoa', 'iced tea', 'lemonade', 'orange juice', 'apple juice', 'squash', 'smoothie', 'milkshake', 'cola', 'ginger ale', 'herbal tea', 'green tea', 'hot milk', 'decaf', 'soda', 'tonic'],
  body: ['toilet', 'glasses', 'hearing aid', 'wash', 'pain', 'doctor', 'nurse', 'bath', 'shower', 'teeth', 'blanket'],
  feel: ['tired', 'worried', 'company', 'happy', 'sad', 'lonely', 'bored', 'scared'],
};
/** Phase 17: topics whose words are about the body or feelings: a model never adds a word there (the health guard). */
export const NO_MODEL_TOPICS = ['body', 'feel'];

/** The everyday words this app has a drawing for, by topic. */
export const EVERYDAY: Record<string, string[]> = {
  food: ['tea', 'coffee', 'water', 'juice', 'milk', 'snack', 'meal', 'drink', 'food'],
  body: ['toilet', 'glasses', 'hearing aid', 'wash', 'pain', 'doctor', 'nurse'],
  rest: ['bed', 'chair', 'quiet'],
  people: ['family', 'friend', 'neighbour', 'visitor', 'carer', 'priest', 'photos'],
  feel: ['tired', 'worried', 'company'],
  plans: ['walk', 'garden', 'drive', 'exercises'],
  fun: ['tv', 'music', 'news', 'film', 'radio', 'paper'],
};

const lc = (s: string) => s.toLowerCase().trim();
const bare = (s: string) => lc(s).replace(/^(?:the|a|an|my|your|our|some)\s+/, '');
/** True when the word starts with the letter (articles left out). */
export const startsWith = (word: string, letter: string) => bare(word).startsWith(letter.toLowerCase());
/** True when a later word of it does ("ginger biscuits" under B): offered after the words that start with the letter. */
const holds = (word: string, letter: string) => bare(word).split(/\s+/).slice(1).some((w) => w.length >= 3 && w.startsWith(letter.toLowerCase()));

/** One thing from a line of "anything else" in About them: "Bo (dog)" and "Bo is his dog" are Bo; any other whole sentence is not a word. */
function thing(line: string): string {
  const named = line.trim().match(/^(\p{Lu}[\p{L}'-]*)\s+(?:is|was)\b/u);
  if (named) return named[1];
  const w = line.split(/[(,:;]/)[0].trim();
  return w && w.split(/\s+/).length <= 3 && !/["?.]/.test(w) ? w : '';
}

/** Every word About them holds that could be on a card, the closest to the person first. Never the person's or the carer's own name. */
export function ownWords(profile: Profile, learned: string[] = []): string[] {
  const self = new Set([lc(profile.personName), lc(profile.partnerName)].filter(Boolean));
  const people = profile.people.map((p) => (p.nickname?.trim() || p.name.trim())).filter((n) => n && !self.has(lc(n)));
  const all = [...people, ...profile.other.map(thing), ...profile.foods, ...profile.places, ...profile.tv, ...profile.music, ...learned.filter((w) => !/^(?:yes|no|not sure|something else|someone else|somewhere else)$/i.test(w.trim()))];
  return all.map((w) => w.trim()).filter((w, i, xs) => w && xs.findIndex((x) => lc(x) === lc(w)) === i);
}

/**
 * What a tile says for a word: the word itself when it starts with the letter; when a later word of it does, that
 * word first and the rest in brackets ("ginger biscuits" under B is "biscuits (ginger)"), so that every tile under
 * "It starts with B" starts with B (the role-play of 18 Nov: "ginger biscuits" under B confused the reader).
 */
export function letterLabel(word: string, letter: string): string {
  if (startsWith(word, letter)) return word;
  const ws = word.trim().replace(/^(?:the|a|an|my|your|our|some)\s+/i, '').split(/\s+/);
  const k = ws.findIndex((w, n) => n > 0 && w.length >= 3 && w.toLowerCase().startsWith(letter.toLowerCase()));
  return k < 0 ? word : `${ws.slice(k).join(' ')} (${ws.slice(0, k).join(' ')})`;
}

/** The About-them lists that are of a kind of thing. */
const LISTS: Partial<Record<Subject, (p: Profile) => string[]>> = { food: (p) => p.foods, place: (p) => p.places, activity: (p) => [...p.tv, ...p.music] };
/** True when the word is of the kind the conversation is about: by the app's list of kinds (core/kinds.ts), any word of it ("strong tea with milk" is a drink), or by the About-them list it stands in. */
function ofKind(word: string, kind: Subject, profile: Profile): boolean {
  const b = bare(word);
  if ([b, ...b.split(/\s+/)].some((w) => placeOf(w)?.subject === kind || placeOf(w, kind)?.subject === kind)) return true;
  return (LISTS[kind]?.(profile) ?? []).some((x) => lc(x) === lc(word));
}

/**
 * The rules' candidates for a letter. No model. Within each group About them comes first (a word that starts with the
 * letter before one whose later word does), then everyday words (the question's topic first). The groups, in order:
 * words of the kind the conversation is about, when that is known ("tea or coffee?" then "something else": drinks),
 * then the people, then the rest.
 */
export function letterWords(i: LetterInput, profile: Profile): string[] {
  const gone = new Set(i.rejected.map(lc));
  const own = ownWords(profile, i.learned);
  // (phase 17) the topic of the conversation: by the caller's topic, else by what the question is about
  const kind = subjectOf(i.asked, i.rejected);
  const topic = letterTopic(i.topic ?? null, kind);
  // (phase 17b) drinks: the drinks first, then the foods of "Food & drink" (one topic on the first screen), nothing else
  const every = topic === 'drink' ? [...TOPIC_WORDS.drink, ...TOPIC_WORDS.food] : topic ? TOPIC_WORDS[topic] : Object.values(EVERYDAY).flat();
  // inside a known topic only its own words: the topic's list, and About them's words of that topic (phase 17b: for
  // EVERY topic). People: the family's names, never their foods or places; the body, feelings and rest: the list only.
  const inTopic = (w: string) => !topic || TOPIC_WORDS[topic].some((x) => bare(x) === bare(w)) || (OWN_IN[topic]?.(w, profile) ?? false) || (KIND_IN[topic] && kind && KIND_IN[topic].includes(kind) ? ofKind(w, kind, profile) : false);
  const starts = own.filter((w) => startsWith(w, i.letter));
  const later = own.filter((w) => !startsWith(w, i.letter) && holds(w, i.letter));
  // (a word of another topic is not offered inside a known topic: "the lake" under food was the owner's complaint)
  // (phase 17b: "the lake" and "lake" are one word)
  const ordered = [...starts.filter(inTopic), ...later.filter(inTopic), ...every.filter((w) => startsWith(w, i.letter))]
    .filter((w, k, xs) => !gone.has(lc(w)) && !gone.has(bare(w)) && xs.findIndex((x) => bare(x) === bare(w)) === k)
    // a topic word the family's own words already hold ("biscuits" beside "ginger biscuits") is not offered twice
    .filter((w, _k, xs) => !(topic && every.includes(w)) || !xs.some((x) => x !== w && bare(x).split(/\s+/).includes(lc(w))));
  if (topic) {
    // inside the topic, the kind the question is about first ("tea or coffee?": a drink before a food)
    const first = (w: string) => (topic === 'drink' ? (drinkWord(w) ? 0 : 1) : kind && kind !== 'people' && ofKind(w, kind, profile) ? 0 : 1);
    return ordered.map((w, k) => ({ w, k })).sort((x, y) => first(x.w) - first(y.w) || x.k - y.k).map((x) => x.w);
  }
  const people = new Set(profile.people.flatMap((p) => [lc(p.name), lc(p.nickname ?? '')]).filter(Boolean));
  const rank = (w: string) => (kind && kind !== 'people' && ofKind(w, kind, profile) ? 0 : people.has(lc(w)) ? 1 : 2);
  return ordered.map((w, k) => ({ w, k, r: rank(w) })).sort((x, y) => x.r - y.r || x.k - y.k).map((x) => x.w);
}

/** Phase 17b: About them's words that belong to a topic. */
const eq = (xs: string[], w: string) => xs.some((x) => bare(x) === bare(w));
const drinkWord = (w: string) => { const b = bare(w); return eq(TOPIC_WORDS.drink, w) || [b, ...b.split(/\s+/)].some((x) => placeOf(x, 'drink')?.subject === 'drink' && placeOf(x, 'drink')?.as === 'item'); };
const OWN_IN: Record<string, (w: string, p: Profile) => boolean> = {
  people: (w, p) => eq(p.people.flatMap((x) => [x.name, x.nickname ?? '']).filter((n) => n.trim()), w),
  food: (w, p) => eq(p.foods, w) || drinkWord(w),
  drink: (w, p) => drinkWord(w) || eq([...p.foods, ...TOPIC_WORDS.food], w),
  plans: (w, p) => eq(p.places, w),
  fun: (w, p) => eq([...p.tv, ...p.music], w),
};
/** The kinds (core/kinds.ts) whose words a topic takes from About them; none for the body, feelings and rest. */
const KIND_IN: Record<string, string[]> = { food: ['food', 'drink'], drink: ['drink', 'food'], plans: ['place'], fun: ['activity'] };

/** Phase 17: the topic of a letter step: the caller's topic, else the kind of thing the question is about (core/kinds.ts). */
const KIND_TOPIC: Record<string, string> = { food: 'food', drink: 'drink', place: 'plans', activity: 'fun', people: 'people' };
export function letterTopic(topic: string | null, kind: string | null | undefined): string | null {
  // (phase 17b) a drink question inside "Food & drink": the drinks
  if (topic === 'food' && kind === 'drink') return 'drink';
  if (topic && TOPIC_WORDS[topic]) return topic;
  return kind && KIND_TOPIC[kind] ? KIND_TOPIC[kind] : null;
}

/** What a model may not bring onto a card by itself. */
const NOT_FROM_A_MODEL = /\b(?:beer|beers|wine|whisky|whiskey|vodka|gin|rum|brandy|bourbon|cider|lager|ale|alcohol|booze|cigarette|cigarettes|cigar|cigars|tobacco|vape|pill|pills|tablet|tablets|medicine|medicines|medication|drug|drugs|painkiller|painkillers|aspirin|ibuprofen|paracetamol|morphine|insulin)\b/i;

/** The guards: which of a model's words may stand on a first-letter card. */
export function letterChoices(raw: string[], i: Pick<LetterInput, 'letter' | 'rejected'>, profile: Profile): { kept: string[]; dropped: { label: string; rule: string }[] } {
  const gone = new Set(i.rejected.map(lc));
  const kept: string[] = [];
  const dropped: { label: string; rule: string }[] = [];
  for (const c0 of raw) {
    const c = snapToProfile(String(c0).replace(/[.!?]+$/, '').trim(), profile);
    if (!c) continue;
    const rule = !startsWith(c, i.letter) ? 'does not start with the letter'
      : isEscapeLabel(c) ? 'a way out is not a word'
      : gone.has(lc(c)) || kept.some((k) => lc(k) === lc(c)) ? 'already offered'
      : hasNegative(c) ? 'negative wording'
      : hasPlaceholder(c) || c.split(/\s+/).length > 3 ? 'not a short word'
      : NOT_FROM_A_MODEL.test(c) ? 'alcohol, tobacco or a medicine: only the family adds those'
      : inventedNameFilter([c], 'Who is it?', profile).length === 0 ? 'a name the family did not give'
      : '';
    if (rule) dropped.push({ label: c, rule }); else kept.push(c);
  }
  return { kept, dropped };
}

/** The app's own fixed wording of the request: the same for every family. */
export const LETTER_TASK = 'Give two or three everyday things, people by role, or places that could be the answer and start with that letter. One or two words each, written in lower case. No names of people.';
/** Phase 9: the cloud step's own task: exactly 4 words (its schema holds 4); code keeps those that start with the letter. */
export const LETTER_CLOUD_TASK = 'Give exactly 4 everyday words that start with that letter and could be the answer. One or two words each, in lower case. No names of people.';
/** The text online help gets: the question, About-them words swapped out, and the letter. Nothing else. */
export function letterCloudText(asked: string, letter: string, profile: Profile, topic: string | null = null): { text: string; map: Record<string, string> } {
  const s = asked.trim() ? stripQuestion(asked, profile) : { text: '', map: {} };
  return { text: `${s.text ? `${s.text} ` : ''}They cannot say the word. ${startsLine(letter)} ${topicLine(topic, subjectOf(asked, []))}${letterContext(subjectOf(asked, []))} ${letter.length > 1 ? LETTER_CLOUD_TASK_MORE : LETTER_CLOUD_TASK}`, map: s.map };
}
/** Phase 17: one letter, or the letters pointed to so far ("It starts with the letters P, I."). */
const startsLine = (letter: string) => (letter.length > 1 ? `It starts with the letters "${letter.toUpperCase()}", in this order.` : `It starts with the letter "${letter.toUpperCase()}".`);
const TOPIC_NAMES: Record<string, string> = { food: 'food and drink', plans: 'places and plans', people: 'people', fun: 'TV, music and hobbies', rest: 'rest and sleep', drink: 'drinks' };
/** Phase 17: the topic of the conversation, when the app knows it and the kind of thing does not already say it. */
const topicLine = (topic: string | null, kind: string | null | undefined) => (topic && TOPIC_NAMES[topic] && !kind ? `The topic is ${TOPIC_NAMES[topic]}. ` : '');
/** Phase 17: the cloud step's task for two letters or more. */
export const LETTER_CLOUD_TASK_MORE = 'Give exactly 4 everyday words that start with those letters and could be the answer. One or two words each, in lower case. No names of people.';
/**
 * Phase 9: the words of a letter answer: `{"kind", "words"}` from the letter step's own schema, or a card's
 * `{"choices"}` from an engine without it. Anything else gives none.
 */
export function letterWordsOf(text: string): string[] {
  try {
    const o = JSON.parse(text) as { words?: unknown };
    if (Array.isArray(o?.words)) return o.words.filter((w): w is string => typeof w === 'string').slice(0, 8);
  } catch { /* not the letter step's JSON: the card's parser below */ }
  return parseModelOutput(text)?.choices ?? [];
}
/** The text the on-device step gets. It holds what did not fit and the learned words: it never goes to the cloud step. */
export function letterDeviceAsk(i: LetterInput): string {
  const kind = subjectOf(i.asked, i.rejected);
  return `${i.asked.trim() ? `${i.asked.trim()} ` : ''}${i.rejected.length ? `They did not want: ${i.rejected.join(', ')}. ` : ''}They cannot say the word. ${startsLine(i.letter)} ${topicLine(letterTopic(i.topic ?? null, kind), kind)}${letterContext(kind)} ${i.letter.length > 1 ? LETTER_TASK.replace('start with that letter', 'start with those letters') : LETTER_TASK}${i.learned?.length ? ` Usual answers on this device (hints only): ${i.learned.slice(0, 6).join(', ')}.` : ''}`;
}

/**
 * What the carer reads after a word was confirmed on a first-letter card. A word about pain, the toilet, or the doctor
 * or nurse is never left as "a word": it leads on at once (where it hurts; go now; is it pain).
 */
export function letterEnd(word: string): { follow: string[]; end: string } {
  const w = lc(word);
  if (/^(?:pain|in pain)$/.test(w)) return { follow: ['Where does it hurt?'], end: P4.letter.care.pain };
  if (w === 'toilet') return { follow: [], end: P4.letter.care.toilet };
  if (w === 'doctor' || w === 'nurse') return { follow: ['Are you in pain?'], end: P4.letter.care.help(w) };
  return { follow: [], end: P4.letter.end(word) };
}

const T = (step: StepTrace['step'], ran: StepTrace['ran'], why: string, used = false, ms?: number): StepTrace => ({ step, ran, why, used, ...(ms === undefined ? {} : { ms }) });

/**
 * The card for a letter, or a card with no choices that says why there is none. Never throws. A model is asked only
 * when the rules find fewer than two words; the cloud only when `env.allowCloud` (the carer's yes).
 */
export async function letterCard(i: LetterInput, env: PipelineEnv): Promise<Card> {
  const { profile, support, engine } = env;
  const L = P4.letter;
  const letter = i.letter.toUpperCase();
  const rules = letterWords(i, profile);
  const asked = L.cardAsk(letter);
  const base = { asked, pending: null, topic: '', kind: 'choice' as const, ms: 0, cloudPayload: null, notes: [L.note], route: { to: 'device' as const, reasons: ['the first letter'] } };
  const trace: StepTrace[] = [];
  const done = (used: 'private' | 'stripped' | null): StepTrace[] => [
    { ...(trace.find((t) => t.step === 'private') ?? T('private', 'skipped', 'not needed: About them had the words')), used: used === 'private' },
    { ...(trace.find((t) => t.step === 'stripped') ?? T('stripped', 'skipped', 'not needed')), used: used === 'stripped' },
    T('code', 'on-device', 'applied the card rules', true),
  ];
  const make = (words: string[], by: 'rules' | 'device' | 'cloud', source: Source, ms: number, proposed: string[] | null, dropped: { label: string; rule: string }[], extra: Partial<Card> = {}): Card => {
    const card = finish({ ...base, source, ms, route: { to: by === 'cloud' ? 'cloud' : 'device', reasons: base.route.reasons }, letter: { letter, rejected: i.rejected, by }, ...extra }, words, ['something else'], profile, support, 3);
    // every tile starts with the letter; the carer says the family's own word, which is also what a photo and "refused" go by
    for (const c of card.choices) if (c.role === 'answer') c.label = letterLabel(c.spoken, letter);
    card.say = L.say(letter, card.choices.filter((c) => c.role === 'answer').map((c) => c.spoken));
    const own = new Set(ownWords(profile, i.learned).map(lc));
    card.why = {
      proposed: proposed ? { step: by === 'cloud' ? 'stripped' : 'private', topic: '', kind: 'choice', choices: proposed, options: [] } : null, decided: L.why,
      kept: proposed ? card.choices.filter((c) => c.role === 'answer' && !rules.some((r) => lc(r) === lc(c.spoken))).map((c) => c.label) : [],
      added: card.choices.filter((c) => c.role === 'answer' && rules.some((r) => lc(r) === lc(c.spoken))).map((c) => ({ label: c.label, from: own.has(lc(c.spoken)) ? 'About them' : 'everyday words' })),
      dropped, headline: 'the question',
      personal: card.choices.filter((c) => c.role === 'answer' && own.has(lc(c.spoken))).map((c) => c.spoken),
    };
    card.trace = done(by === 'device' ? 'private' : by === 'cloud' ? 'stripped' : null);
    return card;
  };
  const none = (blocked: string, extra: Partial<Card> = {}): Card => ({
    ...base, source: 'code', choices: [], say: '', blocked, letter: { letter, rejected: i.rejected, by: 'rules' }, trace: done(null),
    why: { proposed: null, decided: L.why, kept: [], added: [], dropped: [], headline: 'the question' }, ...extra,
  });

  // (phase 17) two letters or more: the letters narrow the guess, and the AI is asked for it (on this device, or online
  // after the carer's yes); its words come first, the rules' fill up. Never on the body or feelings, never for a
  // question about health (the guard of core/ownwords.ts): the rules only, there.
  const multi = letter.length > 1;
  const kind = subjectOf(i.asked, i.rejected);
  const noModel = NO_MODEL_TOPICS.includes(letterTopic(i.topic ?? null, kind) ?? '') || kind === 'feeling' || kind === 'comfort' || !!i.rulesOnly;
  // (two letters or more: the rules' and the AI's words in turn, so the card holds both; a plural of a word is the word)
  const one = (w: string) => lc(w).replace(/(?:es|s)$/, '');
  const merge = (kept: string[]) => {
    const fresh = kept.filter((k) => !rules.some((x) => one(x) === one(k))).filter((k, n, xs) => xs.findIndex((x) => one(x) === one(k)) === n);
    if (!multi) return [...rules, ...fresh];
    const out: string[] = [];
    for (let n = 0; n < Math.max(rules.length, fresh.length); n++) { if (rules[n]) out.push(rules[n]); if (fresh[n]) out.push(fresh[n]); }
    return out;
  };
  if (noModel) return rules.length ? make(rules, 'rules', 'code', 0, null, []) : none(L.noneAi(letter));
  // 1. the rules alone, when they find two words or more (one letter), or when no AI can be asked (two letters or more)
  if (rules.length >= 2 && (!multi || (!env.deviceReady && !(env.allowCloud && engine.cloudConfigured)))) return make(rules, 'rules', 'code', 0, null, []);

  // 2. on this device, where the browser has the model: About them and what did not fit are in this prompt
  if (env.deviceReady) {
    try {
      const r = await engine.runDevice(devicePrompt(letterDeviceAsk(i), profile));
      trace.push(T('private', r.source, 'got the question, the letter, what did not fit and the About me lists', false, r.ms));
      const o = parseModelOutput(r.text);
      const { kept, dropped } = letterChoices(o?.choices ?? [], i, profile);
      const words = merge(kept);
      if (kept.length && words.length >= 1) return make(words, 'device', r.source, r.ms, o?.choices ?? [], dropped);
    } catch (e) {
      trace.push(T('private', 'failed', (e as Error).message));
    }
    // the model on this device was asked and added nothing: the rules' one word stands, or there is no card
    return rules.length ? make(rules, 'rules', 'code', 0, null, []) : none(L.noneAi(letter));
  }
  trace.push(T('private', 'skipped', 'the private helper is not ready on this computer'));

  // 3. online help, only after the carer's yes: the question (About-them words swapped out) and the letter
  const stripped = letterCloudText(i.asked, letter, profile, letterTopic(i.topic ?? null, kind));
  const preview = JSON.stringify(engine.letterRequest ? engine.letterRequest(stripped.text) : engine.cloudRequest(stripped.text), null, 2);
  const swaps = Object.entries(stripped.map).map(([k, v]) => `${v} → ${k}`);
  const orRules = (blocked: string, extra: Partial<Card> = {}) => (rules.length ? make(rules, 'rules', 'code', 0, null, [], extra.cloudAttempted ? extra : {}) : none(blocked, extra));
  if (!engine.cloudConfigured) { trace.push(T('stripped', 'skipped', 'cloud help is not configured on this copy')); return orRules(L.none(profile.personName.trim(), letter)); }
  if (findLeaks(stripped.text, profile).length) { trace.push(T('stripped', 'skipped', 'not sent: the question still held an About me word')); return orRules(L.none(profile.personName.trim(), letter)); }
  if (!env.allowCloud) { trace.push(T('stripped', 'skipped', 'cloud help is off')); return orRules(L.none(profile.personName.trim(), letter), { unsentPayload: preview, cloudSwaps: swaps }); }
  try {
    const r = await checkedCloud(engine, () => (engine.runLetter ? engine.runLetter(stripped.text) : engine.runCloud(stripped.text)), env.cloudWaitMs);
    trace.push(T('stripped', r.source, 'got the question and the letter, About me words swapped out', false, r.ms));
    const sent = r.source === 'in-cloud';
    const left: Partial<Card> = { cloudPayload: sent ? preview : null, unsentPayload: sent ? null : preview, ranOffline: !sent, cloudSwaps: swaps };
    // (phase 9) the 4 words of the letter step's own schema; code keeps those that start with the letter (letterChoices)
    const proposed = letterWordsOf(r.text).map((c) => restoreNames(c, stripped.map));
    const { kept, dropped } = letterChoices(proposed, i, profile);
    const words = merge(kept);
    if (words.length) return make(words, kept.length ? 'cloud' : 'rules', kept.length ? r.source : 'code', r.ms, proposed, dropped, left);
    return none(L.noneAi(letter), left);
  } catch (e) {
    trace.push(T('stripped', 'failed', (e as Error).message));
    const left: Partial<Card> = (e as CloudError).notSent ? { unsentPayload: preview, cloudSwaps: swaps } : { cloudAttempted: preview, cloudAttempts: 1, cloudSwaps: swaps };
    return rules.length ? make(rules, 'rules', 'code', 0, null, [], left) : none(L.failed, left);
  }
}
