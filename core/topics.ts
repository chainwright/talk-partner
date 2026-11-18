// The topics on the first screen of the simple view: seven subjects, each with a few typical questions a carer can
// tap instead of inventing one (recognition, not recall; design/USER_FIRST.md, design/topics_2026-11-17/TOPICS.md).
// Pure: a list of strings and string templates over About them. No model is involved in building the list, and every
// question here except the one marked `ai` is made into a card by the rules alone, with no model and nothing sent
// (tests/unit/topics.test.ts runs each one through the pipeline with an engine that refuses every call).
//
// Two rules from the judges' round of 17 Nov 2026:
//  - a question filled in from About them is ADDED under the generic question, never in place of it ("tea or coffee"
//    is always there, whatever foods the family listed);
//  - each person who does not live there gets one yes / no row, "Would you like to call <name>?" (one thing at a
//    time: an either-or of two names asks "which", not "whether").

import type { Card, Profile } from './types';

export type TopicId = 'food' | 'body' | 'rest' | 'people' | 'feel' | 'plans' | 'fun';

export interface TopicQuestion {
  q: string;
  /** Filled in from About them (shown with the person's own tag). */
  own?: boolean;
  /** An open question: the rules cannot make its choices, an AI suggests them (on the device, or online after a yes). */
  ai?: boolean;
}

export interface Topic { id: TopicId; label: string; questions: TopicQuestion[] }

/** The one open question in the list, kept on purpose: it is where the AI shows. */
export const AI_QUESTION = 'What do you want to do this weekend?';

/** The generic questions: the same on every device and for every family. 41 questions, 40 made by the rules. */
export const TOPIC_BASE: { id: TopicId; label: string; questions: string[] }[] = [
  { id: 'food', label: 'Food & drink', questions: ['Are you hungry?', 'Would you like something to drink?', 'Would you like tea or coffee?', 'Would you like a hot drink or a cold drink?', 'Would you like water, juice or milk?', 'Would you like some more?'] },
  { id: 'body', label: 'Body & care', questions: ['Do you need the toilet?', 'Are you in pain?', 'Are you too hot or too cold?', 'Would you like a wash now or later?', 'Are you comfortable?', 'Would you like your glasses or your hearing aid?'] },
  { id: 'rest', label: 'Rest & sleep', questions: ['Are you tired?', 'Would you like to lie down?', 'Would you like to rest in the bed or the chair?', 'How did you sleep?', 'Is it too noisy in here?', 'Would you like the curtains open or closed?'] },
  { id: 'people', label: 'People & family', questions: ['Would you like a visitor today?', 'Do you want to call someone?', 'Would you like to look at some photos?', 'Would you like company, or some time alone?', 'Would you like me to stay with you?'] },
  { id: 'feel', label: 'Feelings', questions: ['How are you feeling today?', 'Is something bothering you?', 'Would you like to talk about how you feel now, or later?', 'Do you want some quiet time?', 'Shall we stop for now?'] },
  { id: 'plans', label: 'Today & plans', questions: ['Would you like to stay in or go out?', 'Would you like to go out this morning or this afternoon?', 'Would you like to go for a drive?', 'Would you like to sit in the garden?', 'Would you like to go for a walk?', 'Do you want to do your exercises now or later?', AI_QUESTION] },
  { id: 'fun', label: 'TV, music & hobbies', questions: ['Would you like TV or music?', 'Would you like to watch the news or a film?', 'Would you like some music on?', 'Is the TV too loud?', 'Would you like the radio on?', 'Would you like to look at the paper?'] },
];

/** The people About them names who do not live there, by the name the family uses (the nickname first), at most three. */
export function awayNames(profile: Profile): string[] {
  return profile.people.filter((p) => !p.household && p.name.trim()).map((p) => (p.nickname?.trim() || p.name.trim())).slice(0, 3);
}

const clean = (xs: string[]) => xs.map((x) => x.trim()).filter(Boolean);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** The questions About them adds, each with the generic question it stands under. */
export function ownQuestions(profile: Profile): { under: string; q: string }[] {
  const out: { under: string; q: string }[] = [];
  const foods = clean(profile.foods);
  const places = clean(profile.places);
  const tv = clean(profile.tv);
  const music = clean(profile.music);
  const away = awayNames(profile);
  if (foods.length >= 2) out.push({ under: 'Would you like tea or coffee?', q: `Would you like ${foods[0]} or ${foods[1]}?` });
  else if (foods.length === 1) out.push({ under: 'Would you like tea or coffee?', q: `Would you like ${foods[0]}?` });
  if (away.length) out.push({ under: 'Would you like a visitor today?', q: `Would you like to see ${away[0]}?` });
  for (const name of away) out.push({ under: 'Do you want to call someone?', q: `Would you like to call ${name}?` });
  if (places.length >= 2) out.push({ under: 'Would you like to go for a drive?', q: `Where would you like to go? ${cap(places[0])} or ${places[1]}?` });
  if (tv.length) out.push({ under: 'Would you like to watch the news or a film?', q: `Would you like to watch ${tv[0]}?` });
  if (music.length) out.push({ under: 'Would you like some music on?', q: `Would you like to listen to ${music[0]}?` });
  return out;
}

/** The topics as the first screen shows them: every generic question, and the family's own right under theirs. */
export function topics(profile: Profile): Topic[] {
  const own = ownQuestions(profile);
  return TOPIC_BASE.map((t) => ({
    id: t.id, label: t.label,
    questions: t.questions.flatMap((q): TopicQuestion[] => [
      q === AI_QUESTION ? { q, ai: true } : { q },
      ...own.filter((o) => o.under === q).map((o) => ({ q: o.q, own: true })),
    ]),
  }));
}

/** Which topic a question belongs to (its generic list or the family's own rows), or null for a typed question. */
export function topicOf(q: string, profile: Profile): Topic | null {
  return topics(profile).find((t) => t.questions.some((x) => x.q === q)) ?? null;
}

/** The question after `q` in its topic, for "Try: …" when the person chose the way out. Null at the end of a topic. */
export function nextInTopic(q: string, profile: Profile): string | null {
  const t = topicOf(q, profile);
  if (!t) return null;
  const rest = t.questions.slice(t.questions.findIndex((x) => x.q === q) + 1).filter((x) => !x.ai);
  return rest[0]?.q ?? null;
}

// ---------------------------------------------------------------- what to ask next (no dead end after an answer)
export const WHERE_HURTS = 'Where does it hurt?';
export const WHICH_SIDE = 'Which side? Left or right?';
export const HOW_BAD = 'How bad is the pain?';
/** After a "yes" to a feelings opener: one idea (what it is about), three domains and the way out. Made by the rules. */
export const WHAT_BOTHERS = 'What is bothering you? Your body, people, or plans?';

const norm = (s: string) => s.toLowerCase().replace(/[^a-z ]+/g, '').replace(/\s+/g, ' ').trim();
const HAS_SIDE = /\b(?:left|right|middle|both)\b/i;
/** Parts of the body with no left and right worth asking about. */
const NO_SIDE = /\b(?:head|face|eyes|mouth|neck|top of head|stomach|upper stomach|lower stomach|upper back|lower back|back|chest)\b/i;

/**
 * The questions the carer is offered right after a confirmed answer, most useful first; each is one tap and each is
 * made by the rules. A "yes" never ends in a dead end: pain leads to where, where to which side and how bad, "is
 * something bothering you" to what it is about, "call someone" to the people About them names. Empty when nothing
 * follows (then "Ask another question" is the only way on, as before).
 */
export function followUps(card: Pick<Card, 'asked' | 'kind' | 'bodyStep'>, label: string, profile: Profile): string[] {
  const a = norm(card.asked);
  const l = norm(label);
  const yes = l === 'yes';
  if (card.kind === 'body') {
    // the first step of the body map leads to its second by itself; after the second: which side, then how bad
    if (card.bodyStep !== 2) return [];
    return HAS_SIDE.test(label) || NO_SIDE.test(label) ? [HOW_BAD] : [WHICH_SIDE, HOW_BAD];
  }
  if (a === 'which side') return [HOW_BAD];
  if (/\bin pain\b|\bdoes (?:it|anything) hurt\b|\bare you (?:hurting|sore)\b/.test(a) && yes) return [WHERE_HURTS];
  if (card.kind === 'feeling' && l === 'in pain') return [WHERE_HURTS];
  if (/\b(?:bothering|worried|worrying|upset|the matter|on your mind)\b/.test(a) && card.kind === 'yesno' && yes) return [WHAT_BOTHERS];
  if (card.kind === 'feeling' && l === 'bad') return ['Is something bothering you?', 'Are you in pain?'];
  if (a === 'do you want to call someone' && yes) return awayNames(profile).map((n) => `Would you like to call ${n}?`);
  if (a === 'would you like a visitor today' && yes) return awayNames(profile).map((n) => `Would you like to see ${n}?`);
  if (a === 'would you like something to drink' && yes) return ['Would you like tea or coffee?', 'Would you like water, juice or milk?'];
  if (a === 'would you like a hot drink or a cold drink') return l === 'hot drink' ? ['Would you like tea or coffee?'] : l === 'cold drink' ? ['Would you like water, juice or milk?'] : [];
  if (a === 'are you hungry' && yes) { const own = ownQuestions(profile).find((o) => o.under === 'Would you like tea or coffee?'); return own ? [own.q] : []; }
  if (a === 'are you tired' && yes) return ['Would you like to lie down?', 'Would you like to rest in the bed or the chair?'];
  if (a === 'would you like to lie down' && yes) return ['Would you like to rest in the bed or the chair?'];
  if (a === 'would you like to stay in or go out' && l === 'go out') return ['Would you like to go out this morning or this afternoon?', ...ownQuestions(profile).filter((o) => o.under === 'Would you like to go for a drive?').map((o) => o.q)];
  if (a === 'would you like tv or music') return l === 'tv' ? ['Would you like to watch the news or a film?'] : l === 'music' ? ['Would you like some music on?'] : [];
  if (a === 'are you comfortable' && l === 'no') return ['Are you in pain?', 'Are you too hot or too cold?'];
  return [];
}

/** "Do you want to call someone?" answered yes, and About them names nobody to call: the carer types one name. */
export function asksWho(card: Pick<Card, 'asked'>, label: string, profile: Profile): boolean {
  return norm(card.asked) === 'do you want to call someone' && norm(label) === 'yes' && awayNames(profile).length === 0;
}
/** The yes / no question for a name the carer typed (one thing at a time). */
export function callQuestion(name: string): string {
  return `Would you like to call ${name.trim().replace(/[?.!]+$/, '')}?`;
}
