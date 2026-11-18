// "Talk about a photo": the carer picks one of the family's own photos, and the app offers a few easy choice
// questions about it, for talking for its own sake. Never a test: no "Who is this?", no "Do you remember?", no "What
// is this?" (the rules of this app refuse memory questions everywhere else too).
//
// The rules' questions (every device): built from the photo's word (the one word the carer gave it) and About them.
// A person's photo leads to a call or a visit; a place's to going there again; a food's to having some; any photo to
// "How does this photo make you feel?" and "Who shall we show this photo to?".
//
// The on-device step (where the browser's Gemini Nano takes a picture, through Firebase AI Logic, ONLY_ON_DEVICE): the
// model is shown the photo and a fixed instruction, and names up to four things it sees. Code checks every word and
// offers them as the choices of one more question, "What in this photo shall we talk about?". The model is told not to
// name, describe or guess anything about people, and code drops any word about a person's looks, age, health or mood
// whatever the model said. There is NO cloud path for a photo: this file builds no request, and the engine's `lookDevice`
// throws on any answer that did not come from this device.

import { P4 } from './copy4';
import { NullEngine } from './engine';
import { finish, makeCard } from './pipeline';
import { hasNegative, isEscapeLabel } from './rules';
import type { Card, Profile, SupportLevel } from './types';

/** The fixed instruction of the on-device step. The same for every family; nothing from About them is in it. */
export const LOOK_SYSTEM_PROMPT = `You are shown one family photo. Name what can be seen in it, in plain everyday words.
"things": up to four things, animals or kinds of place in the picture (for example: dog, garden, cake, boat, beach, table). One or two words each, lower case, no repeats.
Do not name, describe or guess anything about people: no names, no ages, no looks, no health, no feelings. Do not read out writing in the picture.
If you are not sure what something is, leave it out.
Reply as JSON: {"things": ["...", "..."]}.`;
export const LOOK_PROMPT = 'Name the things in this photo.';
export const LOOK_SCHEMA = {
  type: 'object',
  properties: { things: { type: 'array', items: { type: 'string' }, maxItems: 4 } },
  required: ['things'],
} as const;

/** Words about a person's looks, age, body, health or mood, and words that judge: never from a model onto a card. */
const ABOUT_A_PERSON = /\b(?:man|men|woman|women|boy|girl|child|children|kid|kids|baby|person|people|lady|gentleman|guy|adult|elderly|old|young|aged|senior|fat|thin|bald|grey|gray|wrinkl\w*|ugly|pretty|beautiful|handsome|sick|ill|frail|weak|patient|disabled|wheelchair|walker|cane|crutch\w*|hospital|bandage|scar|sad|happy|angry|crying|smil\w*|tired|confused|drunk|dead|grave|coffin|funeral|face|hair|skin|body|nude|naked)\b/i;

/** What may stand of the model's answer: short lower-case everyday words, nothing about a person, none twice, four at most. */
export function checkedThings(raw: string, photoWord = ''): string[] {
  let parsed: unknown;
  try { parsed = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)); } catch { return []; }
  const things = (parsed as { things?: unknown })?.things;
  if (!Array.isArray(things)) return [];
  const out: string[] = [];
  for (const t of things) {
    if (typeof t !== 'string') continue;
    const w = t.toLowerCase().replace(/[^a-z' -]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/^(?:a|an|the|some)\s+/, '');
    if (!w || w.length > 24 || w.split(' ').length > 2 || ABOUT_A_PERSON.test(w) || hasNegative(w) || isEscapeLabel(w)) continue;
    if (out.includes(w) || w === photoWord.toLowerCase().trim()) continue;
    out.push(w);
  }
  return out.slice(0, 4);
}

export type PhotoKind = 'person' | 'place' | 'food' | 'other';
const lc = (s: string) => s.toLowerCase().trim().replace(/^(?:the|a|an|my|our)\s+/, '');
/** What the photo's word is, by About them: a person the family named, a place, a food, or something else. Never a guess from the picture. */
export function photoKind(word: string, profile: Profile): PhotoKind {
  const w = lc(word);
  if (profile.people.some((p) => lc(p.name) === w || (p.nickname && lc(p.nickname) === w))) return 'person';
  if (profile.places.some((p) => lc(p) === w)) return 'place';
  if (profile.foods.some((f) => lc(f) === w)) return 'food';
  return 'other';
}

export interface PhotoQuestion {
  q: string;
  /** Fixed choices; without them the app's rules make the card from the question (a yes / no). */
  choices?: string[];
  out?: string;
  /** The on-device model named the choices from the picture. */
  ai?: boolean;
}

/** The rules' questions for a photo: three, the one about what the photo shows first. No model. */
export function photoQuestions(word: string, profile: Profile): PhotoQuestion[] {
  const Q = P4.photo.q;
  const w = word.trim();
  const kind = photoKind(w, profile);
  const self = new Set([lc(profile.personName), lc(profile.partnerName)]);
  const person = kind === 'person' ? profile.people.find((p) => lc(p.name) === lc(w) || (p.nickname && lc(p.nickname) === lc(w))) : null;
  const away = profile.people.filter((p) => !p.household && p.name.trim() && !self.has(lc(p.name)) && lc(p.name) !== lc(w) && lc(p.nickname ?? '') !== lc(w)).map((p) => p.nickname?.trim() || p.name.trim()).slice(0, 3);
  const first: PhotoQuestion = kind === 'person' ? { q: person && !person.household ? Q.call(w) : Q.more(w) }
    : kind === 'place' ? { q: Q.go(w) }
    : kind === 'food' ? { q: Q.have(w) }
    : { q: Q.more(w) };
  const show: PhotoQuestion = away.length >= 2 ? { q: Q.show, choices: away, out: 'someone else' } : away.length === 1 ? { q: Q.showOne(away[0]) } : { q: Q.another };
  return [first, { q: Q.feel, choices: [...Q.feelChoices] }, show];
}

/** What the carer reads after an answer to "How does this photo make you feel?" ('' for any other question or answer). */
export function photoEnd(asked: string, label: string, name: string): string {
  if (asked !== P4.photo.q.feel) return '';
  const l = label.toLowerCase().trim();
  return l === 'good' ? P4.photo.felt.good : l === 'mixed' ? P4.photo.felt.mixed(name) : l === 'sad' ? P4.photo.felt.sad(name) : '';
}

/** One more question, from what the on-device model saw: null when fewer than two words could stand. */
export function thingsQuestion(things: string[]): PhotoQuestion | null {
  return things.length >= 2 ? { q: P4.photo.q.things, choices: things.slice(0, 3), ai: true } : null;
}

const NO_MODEL = new NullEngine();
/** The card of any of the questions: fixed choices, or the app's rules from the question, with an engine that cannot run a model. */
export async function photoTalkCard(pq: PhotoQuestion, profile: Profile, support: SupportLevel): Promise<Card> {
  if (pq.choices) return photoCard(pq, profile, support);
  const card = await makeCard(pq.q, { profile, support, engine: NO_MODEL, allowCloud: false, deviceReady: false });
  card.photoTalk = 'rules';
  card.notes = [P4.photo.note];
  return card;
}

/** The card of a question with fixed choices. */
export function photoCard(pq: PhotoQuestion, profile: Profile, support: SupportLevel): Card {
  const P = P4.photo;
  const card = finish({
    asked: pq.q, pending: null, topic: '', kind: 'choice', source: pq.ai ? 'on-device' : 'code', route: { to: 'device', reasons: ['a family photo'] }, cloudPayload: null, notes: [P.note], ms: 0,
    photoTalk: pq.ai ? 'device' : 'rules',
    trace: [
      { step: 'private', ran: pq.ai ? 'on-device' : 'skipped', why: pq.ai ? 'looked at the photo on this computer' : 'not needed', used: !!pq.ai },
      { step: 'stripped', ran: 'skipped', why: 'never: a photo has no cloud step', used: false },
      { step: 'code', ran: 'on-device', why: 'applied the card rules', used: true },
    ],
    why: { proposed: pq.ai ? { step: 'private', topic: '', kind: 'choice', choices: pq.choices ?? [], options: [] } : null, decided: pq.ai ? P.whyAi : P.why, kept: pq.ai ? pq.choices ?? [] : [], added: [], dropped: [], headline: 'the question' },
  }, pq.choices ?? [], [pq.out ?? 'something else'], profile, support, 3);
  return card;
}
