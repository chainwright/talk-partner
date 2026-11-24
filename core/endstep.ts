// Phase 17b (the owner's rule of 24 Nov 2026: "this principle works for ANY topic"): what the carer's screen offers
// after a confirmed answer, in one pure function the screen and the dead-end audit (tests/unit/phase17-deadends.test.ts)
// both call. Before, this lived inside web/src/main.ts, so a test could only read the trees, not what the screen did.
//
// The order, as the screen had it: a card of more choices, a first-letter word or a word the carer typed ends on what
// to do; a health card the guard made from the carer's own words ends on a red box (core/ownwords.ts, ownAfter); then
// the trees (core/tree.ts, after); then the older follow-ups (core/topics.ts); then a typed "want something?" (typedStep).

import { letterEnd } from './letter';
import { moreChoices, shownOn, type MoreSubject, type Way } from './more';
import { ownAfter } from './ownwords';
import type { RedPlace } from './redflag';
import { followUps } from './topics';
import { after, openKind, typedStep, type OpenKind } from './tree';
import type { Card, Profile } from './types';
import { P7 } from './copy7';

/**
 * Phase 17b: the ways to find WHICH one, under the end line of an answer that leaves a kind of thing open and has no
 * question left to ask. The first is a step the rules make; the first letter is always there, inside the topic.
 */
export interface OpenEnd {
  kind: OpenKind;
  ways: Way[];
  /** The kind for "More choices like these" (core/more.ts), when there is one. */
  subject: MoreSubject | null;
  /** The topic of the first-letter helper (core/letter.ts, TOPIC_WORDS), when there is one. */
  topic: string | null;
  /** The first three of the more choices, for the button's second line. */
  moreFirst: string[];
}
export interface AnswerStep { follow: string[]; end: string; alert?: true; red?: RedPlace | null; now?: boolean; open?: OpenEnd }

const OPEN_SUBJECT: Record<OpenKind, MoreSubject | null> = { food: 'food', drink: 'drink', people: 'people', place: 'place', activity: 'activity', about: null, body: null };
/** The first-letter topic of each open kind (core/letter.ts, TOPIC_WORDS). */
export const OPEN_TOPIC: Record<OpenKind, string | null> = { food: 'food', drink: 'drink', people: 'people', place: 'plans', activity: 'fun', about: null, body: 'body' };

/** The ways under the end line for an open kind: more of the kind, or what it is about; the body card for the body. */
export function openEnd(kind: OpenKind, card: Pick<Card, 'choices' | 'nextPage' | 'more' | 'narrow' | 'letter'> | null, profile: Profile): OpenEnd {
  const subject = OPEN_SUBJECT[kind];
  const shown = card && Array.isArray(card.choices) ? shownOn(card as Card).filter((x) => !/^(?:yes|no|not sure)$/i.test(x)) : [];
  const more = subject ? moreChoices(subject, shown, profile) : [];
  const first: Way[] = kind === 'body' ? ['where', 'needs'] : kind === 'about' ? ['about'] : more.length ? ['more'] : [];
  return { kind, ways: [...first, 'letter', 'show'], subject: more.length ? subject : null, topic: OPEN_TOPIC[kind], moreFirst: more.slice(0, 3) };
}

/** Words of a card of more choices that are themselves a kind of thing ("something sweet", "a friend"): still to be found. */
const MORE_KINDS: Partial<Record<MoreSubject, RegExp>> = { food: /^(?:something sweet|something savoury|a hot meal|a cold meal|a snack)$/i, people: /^(?:a friend|a neighbour)$/i };
/** After a word was found (a card of more choices, the first letter, or typed): a person or a place leads on with one tap. */
function wordFollow(word: string, profile: Profile): string[] {
  const w = word.trim();
  const lw = w.toLowerCase();
  const person = profile.people.find((p) => [p.name, p.nickname ?? ''].some((n) => n.trim() && n.trim().toLowerCase() === lw));
  if (person && !person.household) return [`Would you like to call ${w}?`, `Would you like to see ${w}?`];
  if (lw === 'a walk' || lw === 'walk') return ['Would you like to go for a walk?'];
  if (lw === 'a drive' || lw === 'drive') return ['Would you like to go for a drive?'];
  if (lw === 'stay in') return ['Would you like TV or music?'];
  if (lw === 'tv') return ['Would you like to watch the news or a film?'];
  if (lw === 'music') return ['Would you like quiet music or lively music?'];
  if (lw === 'the garden' || lw === 'garden') return ['Would you like to sit in the garden?'];
  if (profile.places.some((p) => p.trim().toLowerCase() === lw)) return [`Would you like to go to ${w}?`];
  return [];
}
export interface AnswerCtx {
  profile: Profile;
  /** The questions of this conversation so far, this card's included. */
  chain: string[];
  /** The number the call buttons use. */
  number: string;
  /** The conversation's red flag (core/redflag.ts), for "How bad is the pain?". */
  red: RedPlace | null;
  /** The person chose the way out ("something else", "not sure"): the screen then shows the ways (core/more.ts, outWays). */
  out: boolean;
}

type C = Pick<Card, 'asked' | 'kind' | 'bodyStep' | 'more' | 'letter' | 'typed' | 'own'>;
const head = (q: string) => q.split('?')[0].trim().toLowerCase();

export function answerStep(c: C, pick: { label: string; spoken?: string; role: string }, x: AnswerCtx): AnswerStep {
  const name = x.profile.personName.trim();
  const word = pick.spoken || pick.label;
  const asked = (q: string) => [...x.chain, c.asked].some((a) => head(a) === head(q));
  // (phase 17b) a word that was found: a person or a place leads on with one tap, never only a line to read
  const found = (s: { follow: string[]; end: string }): AnswerStep => {
    const more = s.follow.length ? s.follow : wordFollow(word, x.profile).filter((q) => !asked(q));
    return { follow: more, end: s.end };
  };
  if (c.typed) return x.out ? { follow: [], end: '' } : found(letterEnd(word));
  if (c.more) {
    if (x.out) return { follow: [], end: '' };
    const end = P7.more.end(c.more.subject, word, name);
    // (phase 17b) "something sweet", "a friend" on a card of more choices: which one is still open
    if (MORE_KINDS[c.more.subject]?.test(word)) return { follow: [], end, open: openEnd(c.more.subject === 'people' ? 'people' : 'food', c as Card, x.profile) };
    return found({ follow: [], end });
  }
  if (c.letter) return x.out ? { follow: [], end: '' } : found(letterEnd(word));
  const h = c.own?.matter;
  if (h && c.kind === 'yesno' && !/^is it suddenly weak or numb\b/i.test(c.asked)) {
    const s = ownAfter(h, pick.label, x.number, name);
    const asked = new Set([...x.chain, c.asked].map(head));
    return { follow: s.next.filter((q) => !asked.has(head(q))), end: s.end, alert: true, red: s.red, now: s.now };
  }
  const step = after(c, pick.label, x.profile, x.chain.length ? x.chain : [c.asked], x.number, x.red);
  // (phase 17b) an answer that leaves a kind of thing open, with no question left: the ways to find which one
  const open = (follow: string[], kind: OpenKind | null) => (!x.out && !follow.length && kind ? { open: openEnd(kind, c as Card, x.profile) } : {});
  if (step.next.length || step.end) return { follow: step.next, end: step.end, ...(step.alert ? { alert: step.alert } : {}), ...open(step.next, openKind(c, pick.label)) };
  const fu = x.out || pick.role !== 'answer' ? [] : followUps(c, pick.label, x.profile);
  const typed = !x.out && !fu.length && c.kind === 'yesno' ? typedStep(c.asked, pick.label, x.profile) : null;
  if (typed) { const follow = typed.next.filter((q) => !x.chain.includes(q)); return { follow, end: typed.end, ...open(follow, 'about') }; }
  return { follow: fu, end: '' };
}
