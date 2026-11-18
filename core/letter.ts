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
import { within, type CloudError } from './engine';
import { placeOf, subjectOf, type Subject } from './kinds';
import { finish, parseModelOutput, type PipelineEnv } from './pipeline';
import { devicePrompt } from './prompt';
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
}

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
  const every = [...(i.topic && EVERYDAY[i.topic] ? EVERYDAY[i.topic] : []), ...Object.values(EVERYDAY).flat()];
  const ordered = [...own.filter((w) => startsWith(w, i.letter)), ...own.filter((w) => !startsWith(w, i.letter) && holds(w, i.letter)), ...every.filter((w) => startsWith(w, i.letter))]
    .filter((w, k, xs) => !gone.has(lc(w)) && xs.findIndex((x) => lc(x) === lc(w)) === k);
  const kind = subjectOf(i.asked, i.rejected);
  const people = new Set(profile.people.flatMap((p) => [lc(p.name), lc(p.nickname ?? '')]).filter(Boolean));
  const rank = (w: string) => (kind && kind !== 'people' && ofKind(w, kind, profile) ? 0 : people.has(lc(w)) ? 1 : 2);
  return ordered.map((w, k) => ({ w, k, r: rank(w) })).sort((x, y) => x.r - y.r || x.k - y.k).map((x) => x.w);
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
/** The text online help gets: the question, About-them words swapped out, and the letter. Nothing else. */
export function letterCloudText(asked: string, letter: string, profile: Profile): { text: string; map: Record<string, string> } {
  const s = asked.trim() ? stripQuestion(asked, profile) : { text: '', map: {} };
  return { text: `${s.text ? `${s.text} ` : ''}They cannot say the word. It starts with the letter "${letter.toUpperCase()}". ${LETTER_TASK}`, map: s.map };
}
/** The text the on-device step gets. It holds what did not fit and the learned words: it never goes to the cloud step. */
export function letterDeviceAsk(i: LetterInput): string {
  return `${i.asked.trim() ? `${i.asked.trim()} ` : ''}${i.rejected.length ? `They did not want: ${i.rejected.join(', ')}. ` : ''}They cannot say the word. It starts with the letter "${i.letter.toUpperCase()}". ${LETTER_TASK}${i.learned?.length ? ` Usual answers on this device (hints only): ${i.learned.slice(0, 6).join(', ')}.` : ''}`;
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

  // 1. the rules alone, when they find two words or more
  if (rules.length >= 2) return make(rules, 'rules', 'code', 0, null, []);

  // 2. on this device, where the browser has the model: About them and what did not fit are in this prompt
  if (env.deviceReady) {
    try {
      const r = await engine.runDevice(devicePrompt(letterDeviceAsk(i), profile));
      trace.push(T('private', r.source, 'got the question, the letter, what did not fit and the About me lists', false, r.ms));
      const o = parseModelOutput(r.text);
      const { kept, dropped } = letterChoices(o?.choices ?? [], i, profile);
      const words = [...rules, ...kept.filter((k) => !rules.some((x) => lc(x) === lc(k)))];
      if (kept.length && words.length >= 1) return make(words, 'device', r.source, r.ms, o?.choices ?? [], dropped);
    } catch (e) {
      trace.push(T('private', 'failed', (e as Error).message));
    }
    // the model on this device was asked and added nothing: the rules' one word stands, or there is no card
    return rules.length ? make(rules, 'rules', 'code', 0, null, []) : none(L.noneAi(letter));
  }
  trace.push(T('private', 'skipped', 'the private helper is not ready on this computer'));

  // 3. online help, only after the carer's yes: the question (About-them words swapped out) and the letter
  const stripped = letterCloudText(i.asked, letter, profile);
  const preview = JSON.stringify(engine.cloudRequest(stripped.text), null, 2);
  const swaps = Object.entries(stripped.map).map(([k, v]) => `${v} → ${k}`);
  const orRules = (blocked: string, extra: Partial<Card> = {}) => (rules.length ? make(rules, 'rules', 'code', 0, null, [], extra.cloudAttempted ? extra : {}) : none(blocked, extra));
  if (!engine.cloudConfigured) { trace.push(T('stripped', 'skipped', 'cloud help is not configured on this copy')); return orRules(L.none(profile.personName.trim(), letter)); }
  if (findLeaks(stripped.text, profile).length) { trace.push(T('stripped', 'skipped', 'not sent: the question still held an About me word')); return orRules(L.none(profile.personName.trim(), letter)); }
  if (!env.allowCloud) { trace.push(T('stripped', 'skipped', 'cloud help is off')); return orRules(L.none(profile.personName.trim(), letter), { unsentPayload: preview, cloudSwaps: swaps }); }
  try {
    const r = await within(engine.runCloud(stripped.text), env.cloudWaitMs);
    trace.push(T('stripped', r.source, 'got the question and the letter, About me words swapped out', false, r.ms));
    const sent = r.source === 'in-cloud';
    const left: Partial<Card> = { cloudPayload: sent ? preview : null, unsentPayload: sent ? null : preview, ranOffline: !sent, cloudSwaps: swaps };
    const o = parseModelOutput(r.text);
    const proposed = (o?.choices ?? []).map((c) => restoreNames(c, stripped.map));
    const { kept, dropped } = letterChoices(proposed, i, profile);
    const words = [...rules, ...kept.filter((k) => !rules.some((x) => lc(x) === lc(k)))];
    if (words.length) return make(words, kept.length ? 'cloud' : 'rules', kept.length ? r.source : 'code', r.ms, proposed, dropped, left);
    return none(L.noneAi(letter), left);
  } catch (e) {
    trace.push(T('stripped', 'failed', (e as Error).message));
    const left: Partial<Card> = (e as CloudError).notSent ? { unsentPayload: preview, cloudSwaps: swaps } : { cloudAttempted: preview, cloudAttempts: 1, cloudSwaps: swaps };
    return rules.length ? make(rules, 'rules', 'code', 0, null, [], left) : none(L.failed, left);
  }
}
