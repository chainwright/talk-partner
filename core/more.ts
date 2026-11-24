// After "something else": how the carer finds out WHAT else, one step at a time (18 Nov 2026, after the owner's walk
// on his phone: the screen jumped to another topic, "Next: Are you hungry?", and he did not know what to do).
//
// Rules only, on the device, with no connection needed. No model is asked, and nothing is sent:
//   - `outWays`: what the screen offers after the way out, in order. The first is always a step the rules make: more
//     choices of the same kind, or "What is it about?", or, for the body and feelings, the body card and the needs
//     board. Never a question of another topic. The AI's narrowing step is the last way, never the first.
//   - `moreCard`: the next pages of the same kind (drinks: water, juice, milk, tea, coffee, then the family's own),
//     three at a time, "something else" on every page.
//   - `aboutWhatCard`: "What is it about?" (a drink, food, a person, a place, my body, a feeling), for when the kind is
//     not known.
//   - `typedCard`: after "show me" or "write it" the carer types what they understood, and the person confirms it.
// The family's words come from About them and stay on the device like every card the rules make.

import { P7 } from './copy7';
import { placeOf, subjectOf } from './kinds';
import { sameWord, wordKey } from './letter';
import { finish } from './pipeline';
import { CARE_TOPICS, careAnswer } from './reliability';
import type { Card, Profile, SupportLevel } from './types';

export type MoreSubject = 'drink' | 'food' | 'people' | 'place' | 'activity';
export const MORE_SUBJECTS: MoreSubject[] = ['drink', 'food', 'people', 'place', 'activity'];
/** Three choices and the way out on the person's screen, as everywhere. */
export const MORE_PAGE = 3;
/** Four pages at most: after twelve choices of one kind the list has not helped. */
export const MORE_MAX = 12;

/** The fixed part of each list, in the order it is offered. Every word has a picture of ours. */
const FIXED: Record<MoreSubject, string[]> = {
  drink: ['water', 'juice', 'milk', 'tea', 'coffee'],
  food: ['something sweet', 'something savoury', 'a hot meal', 'a cold meal', 'a snack'],
  people: ['a friend', 'a neighbour', 'the carer', 'the nurse', 'the doctor'],
  place: ['the garden', 'a walk', 'a drive', 'stay in'],
  activity: ['tv', 'music', 'radio', 'the paper', 'photos'],
};

const bare = (s: string) => s.toLowerCase().replace(/[.!?]+$/, '').replace(/^(?:the|a|an|some|my|your|more)\s+/, '').replace(/\s+/g, ' ').trim();
const isDrink = (w: string) => { const p = placeOf(w, 'drink'); return !!p && p.subject === 'drink' && p.as === 'item'; };

/** The family's own words of a kind, from About them. */
function own(subject: MoreSubject, profile: Profile): string[] {
  if (subject === 'drink') return [...profile.foods, ...profile.other].filter(isDrink);
  if (subject === 'food') return profile.foods.filter((w) => !isDrink(w));
  if (subject === 'people') return profile.people.map((p) => p.name).filter((n) => n.trim() && bare(n) !== bare(profile.partnerName));
  if (subject === 'place') return profile.places;
  return [...profile.tv, ...profile.music];
}

/** What the question was about, when it is a kind the rules have more choices of. Null otherwise. */
export function moreSubject(asked: string, shown: string[]): MoreSubject | null {
  const s = subjectOf(asked, shown.filter((x) => !/^(?:yes|no|not sure)$/i.test(x.trim())));
  return s && (MORE_SUBJECTS as string[]).includes(s) ? (s as MoreSubject) : null;
}

/**
 * More choices of one kind, minus everything that was already shown. Drinks and food: the fixed list, then the
 * family's own. People, places and things to do: the family's own first (they are the likeliest), then the fixed list.
 */
export function moreChoices(subject: MoreSubject, shown: string[], profile: Profile): string[] {
  const mine = own(subject, profile).map((w) => w.trim()).filter(Boolean);
  const all = subject === 'drink' || subject === 'food' ? [...FIXED[subject], ...mine] : [...mine, ...FIXED[subject]];
  // (phase 19, judge round 14, seat 01: "the garden, a walk, a drive" offered again after "go for a walk" was passed)
  // one word whatever its article, plural, spelling or "go for a" (core/letter.ts, sameWord)
  const gone = new Set(shown.map(wordKey));
  return all.filter((w, i) => !gone.has(wordKey(w)) && all.findIndex((x) => sameWord(x, w)) === i).slice(0, MORE_MAX);
}

/** Every choice the person has been shown on this card and on the cards it came from (never offered again). */
export function shownOn(card: Card): string[] {
  const out = [...(card.more?.shown ?? []), ...(card.narrow?.rejected ?? []), ...(card.letter?.rejected ?? [])];
  for (let p: Card | null | undefined = card; p; p = p.nextPage) out.push(...p.choices.filter((c) => c.role === 'answer').map((c) => c.label));
  return out.filter((x, i) => out.findIndex((y) => bare(y) === bare(x)) === i);
}

const base = (asked: string, note: string, why: string): Omit<Card, 'choices' | 'say'> => ({
  asked, pending: null, topic: '', kind: 'choice', source: 'code', route: { to: 'device', reasons: [] }, cloudPayload: null, notes: [note], ms: 0,
  trace: [
    { step: 'private', ran: 'skipped', why: 'not needed: the rules made this card', used: false },
    { step: 'stripped', ran: 'skipped', why: 'not needed: the rules made this card', used: false },
    { step: 'code', ran: 'on-device', why: 'the rules made this card', used: true },
  ],
  why: { proposed: null, decided: why, kept: [], added: [], dropped: [], headline: 'the question' },
});

/**
 * The card of more choices: pages of three with "something else" on each; the last page's "something else" is the
 * real way out. Null when the rules have nothing left of this kind. `shown` is what the person has already been shown.
 */
export function moreCard(subject: MoreSubject, shown: string[], profile: Profile): Card | null {
  const list = moreChoices(subject, shown, profile);
  if (!list.length) return null;
  const pages: string[][] = [];
  for (let i = 0; i < list.length; i += MORE_PAGE) pages.push(list.slice(i, i + MORE_PAGE));
  let next: Card | null = null;
  for (let k = pages.length - 1; k >= 0; k--) {
    const card: Card = finish(base(P7.more.ask[subject], P7.more.note, P7.more.why), pages[k], ['something else'], profile, 'mild', MORE_PAGE);
    // (what was shown before this page, so that nothing is offered twice after its way out)
    card.more = { subject, shown: [...shown, ...pages.slice(0, k).flat()] };
    card.nextPage = next;
    next = card;
  }
  return next;
}

/** Which kind an answer of "What is it about?" leads to; 'body' and 'feeling' lead to a question, not to a list. */
export const ABOUT_LEADS: Record<string, MoreSubject | 'body' | 'feeling'> = { 'a drink': 'drink', food: 'food', 'a person': 'people', 'a place': 'place', 'my body': 'body', 'a feeling': 'feeling' };
const ABOUT_PICTURE: Record<string, string> = { 'a drink': 'drink', food: 'food', 'a person': 'family', 'a place': 'go out', 'my body': 'body:body', 'a feeling': 'okay' };

/** "What is it about?": six pictures, three at a time, for when the kind is not known. Fixed: no model, nothing personal. */
export function aboutWhatCard(profile: Profile): Card {
  const items = [...P7.about.items];
  let next: Card | null = null;
  for (let k = Math.ceil(items.length / MORE_PAGE) - 1; k >= 0; k--) {
    const card: Card = finish(base(P7.about.ask, P7.about.note, P7.about.why), items.slice(k * MORE_PAGE, (k + 1) * MORE_PAGE), ['something else'], profile, 'mild', MORE_PAGE);
    for (const c of card.choices) if (ABOUT_PICTURE[c.label]) c.picture = { type: 'builtin', id: ABOUT_PICTURE[c.label] };
    card.aboutWhat = true;
    card.nextPage = next;
    next = card;
  }
  return next!;
}

export const TYPED_MAX = 40;
/** What the carer typed, as it may stand on a card: one line, no markup characters, forty characters at most. */
export const typedWord = (raw: string) => raw.replace(/[<>{}[\]\\]/g, '').replace(/\s+/g, ' ').trim().slice(0, TYPED_MAX);

/**
 * After "show me" or "write it": the word the carer typed, as the one choice of a card under the question that was
 * open. The person points to it, and the usual check follows ("So: juice. Right?"). The carer's word is only a guess
 * until the person's own taps say yes: the app picks and confirms nothing. `asked` is the question that was open.
 */
export function typedCard(raw: string, asked: string, profile: Profile, support: SupportLevel): Card | null {
  const word = typedWord(raw);
  if (!word) return null;
  const card = finish(base(asked.trim() || P7.understood.q, P7.understood.note, P7.understood.why), [word], ['something else'], profile, support, 1);
  if (!card.choices.some((c) => c.role === 'answer')) return null;
  card.typed = true;
  return card;
}

/** Phase 18: 'which', the AI's "Which one?" after a kind of thing was picked on a card of the AI (core/endstep.ts). */
export type Way = 'more' | 'about' | 'where' | 'needs' | 'letter' | 'show' | 'narrow' | 'which';

/**
 * What the carer is offered after "something else" on this card, in order. The first is a step the rules make on the
 * device; the AI's step is last. `topic` is the topic the conversation started from, when it is known.
 *   - the body and feelings (by topic, or by the question's words): "Show me where" (the body card) and the needs
 *     board come first, never a list of guesses and never another topic;
 *   - a kind the rules have more of: "More choices like these";
 *   - otherwise "What is it about?" (not after that card itself, and not after a used-up list of more choices);
 *   - then the first letter, then "show me / write it", then the AI.
 */
export function outWays(card: Card, profile: Profile, topic: string | null): Way[] {
  const rest: Way[] = ['letter', 'show', 'narrow'];
  if (card.kind === 'repair' || card.kind === 'needs') return rest;
  const subject = card.more?.subject ?? moreSubject(card.asked, shownOn(card));
  // (a question of "Body & care" or "Feelings", a body, pain or feeling card, or care words in a question that is
  // about no kind the rules have a list of: "a hot drink or a cold drink?" holds "hot" and "cold" and is about drinks)
  const care = (topic !== null && CARE_TOPICS.includes(topic)) || card.kind === 'body' || card.kind === 'pain' || card.kind === 'feeling' || (!subject && careAnswer(card.asked, '', null));
  if (care) return [...(card.kind === 'body' ? [] : ['where' as Way]), 'needs', ...rest];
  if (card.aboutWhat || card.typed) return rest;
  if (subject && moreChoices(subject, shownOn(card), profile).length) return ['more', ...rest];
  return card.more || card.letter ? rest : ['about', ...rest];
}
