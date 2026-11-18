// "[Name] wants to say something": the person starts the conversation. Until now every conversation started with the
// carer's question. One big button on the first screen opens the person's screen with three starters and the way out:
// "I need something", "I want to tell you something", "I feel…". Each leads on, still on the person's screen:
//   - need: the quick-needs board (core/needs.ts);
//   - tell: the topics as a picture menu, three to a screen (the way out of the first screen leads to the next three;
//     the last screen's way out is the real one), then one card on what in that topic it is about ("Who is it
//     about?" with up to three of the family's names; "Is it about today, or another day?"; …). The carer then gets
//     questions about the TELLING (core/tree.ts, TELL: good news or a worry, did something happen, now or later), not
//     offers: the role-play of 18 Nov got "Would you like to see Beth?" when Frank wanted to tell something about her.
//     "Body & care" has no such card and leads the carer to "Are you in pain?" first;
//   - feel: the feelings card the rules make for "How are you feeling today?".
// The carer then reads "[Name] started this: …" over the answer, with up to three questions to ask next.
//
// Rules only: fixed cards, no model, no request, nothing sent. This module imports the copy, the topics and the types,
// so it cannot reach an engine or the network.
// Safety: a card the person started is never counted by the answer check (core/reliability.ts), and the check's line
// ("may be tired") is never shown on a screen that follows from it: what the person chose to say is taken as said.

import { P4 } from './copy4';
import { TOPIC_BASE, awayNames, type TopicId } from './topics';
import { TELL } from './tree';
import type { Card, Choice, Profile, StepTrace } from './types';

export type Starter = 'need' | 'tell' | 'feel';
export const STARTERS: Starter[] = ['need', 'tell', 'feel'];
/** The question the "I feel…" starter leads to: made by the rules (core/pipeline.ts), never a model. */
export const FEEL_QUESTION = 'How are you feeling today?';

const S = P4.turn;
const PICTURE: Record<Starter, string> = { need: 'show me', tell: 'family', feel: 'good' };
const TOPIC_PICTURE: Record<TopicId, string> = { food: 'food', body: 'body:whole', rest: 'bed', people: 'family', feel: 'good', plans: 'plans', fun: 'tv' };
/** The topics of the picture menu, in the order they are offered (feelings have their own starter). */
export const MENU: TopicId[] = ['people', 'plans', 'fun', 'food', 'body', 'rest'];

const trace = (): StepTrace[] => [
  { step: 'private', ran: 'skipped', why: 'not needed: this card is made by rules alone', used: false },
  { step: 'stripped', ran: 'skipped', why: 'not needed: this card is made by rules alone', used: false },
  { step: 'code', ran: 'on-device', why: 'applied the card rules', used: true },
];
const base = (asked: string, turn: 'start' | 'topics' | 'about') => ({
  asked, pending: null, topic: '', kind: 'choice' as const, source: 'code' as const, route: { to: 'device' as const, reasons: [] }, cloudPayload: null, notes: [S.note], ms: 0, turn, trace: trace(),
  why: { proposed: null, decided: S.why, kept: [], added: [], dropped: [], headline: 'fixed' },
});
const escape = (label: string): Choice => ({ label, spoken: label, role: 'escape', picture: { type: 'builtin', id: 'something else' } });

/** The card the person starts from: three starters and the way out. */
export function turnCard(): Card {
  const choices: Choice[] = [...STARTERS.map((k): Choice => ({ label: S.starters[k], spoken: S.starters[k], role: 'answer', picture: { type: 'builtin', id: PICTURE[k] } })), escape('something else')];
  return { ...base(S.ask, 'start'), choices, say: S.say };
}
/** Which starter a label of that card is, or null for the way out. */
export const starterOf = (label: string): Starter | null => STARTERS.find((k) => S.starters[k] === label) ?? null;

/** The topics as a picture menu: three to a screen, "something else" leading to the next three, then the real way out. */
export function topicMenu(): Card {
  const label = (id: TopicId) => TOPIC_BASE.find((t) => t.id === id)!.label;
  const page = (ids: TopicId[], next: Card | null): Card => ({
    ...base(S.topicsAsk, 'topics'),
    choices: [...ids.map((id): Choice => ({ label: label(id), spoken: label(id), role: 'answer', picture: { type: 'builtin', id: TOPIC_PICTURE[id] } })), escape('something else')],
    say: `${S.topicsAsk} ${ids.map(label).join(', ')}, or something else?`, nextPage: next,
  });
  return page(MENU.slice(0, 3), page(MENU.slice(3), null));
}
/** The topic a label of the menu names, or null. */
export const menuTopic = (label: string): TopicId | null => TOPIC_BASE.find((t) => t.label === label)?.id ?? null;

const ABOUT_PICTURE: Record<string, string> = { today: 'now', 'another day': 'later', TV: 'tv', music: 'music', food: 'food', 'a drink': 'drink', 'last night': 'bed', now: 'now' };
/**
 * After a topic, still on the person's screen: what in it this is about. People: up to three of the family's names
 * and "someone else". Null when there is nothing to ask (no names in About them; "Body & care", which goes to the
 * carer at once).
 */
export function aboutCard(topic: TopicId, profile: Profile): Card | null {
  if (topic === 'people') {
    const names = awayNames(profile);
    if (!names.length) return null;
    const choices: Choice[] = names.map((n): Choice => {
      const p = profile.people.find((x) => (x.nickname?.trim() || x.name.trim()) === n);
      return { label: n, spoken: n, role: 'answer', picture: { type: 'person', personId: p?.id ?? null, initial: n.charAt(0).toUpperCase() } };
    });
    return { ...base(S.aboutAsk.people, 'about'), choices: [...choices, escape('someone else')], say: `${S.aboutAsk.people} ${names.join(', ')}, or someone else?` };
  }
  if (topic === 'body' || topic === 'feel') return null;
  const labels = S.aboutChoices[topic];
  return {
    ...base(S.aboutAsk[topic], 'about'),
    choices: [...labels.map((l): Choice => ({ label: l, spoken: l, role: 'answer', picture: { type: 'builtin', id: ABOUT_PICTURE[l] } })), escape('something else')],
    say: `${S.aboutAsk[topic]} ${labels.join(', ')}, or something else?`,
  };
}

/** For "Body & care" the carer asks about pain first: a body matter is never met with "good news or a worry?". */
export const BODY_FIRST = ['Are you in pain?', 'Are you comfortable?', 'Do you need the toilet?'];

/**
 * What the carer reads and can ask after a start: the line ("Frank started this: there is something to tell you."),
 * what it is about (the topic, and what in it), and for a topic three questions about the telling. Rules; every
 * question is one the trees know.
 */
export function turnLead(starter: Starter | 'else', name: string, topic: TopicId | null, what = ''): { line: string; about: string; ask: string[] } {
  const line = S.lines[starter](name);
  if (starter !== 'tell' || !topic) return { line, about: '', ask: [] };
  return { line, about: S.about(TOPIC_BASE.find((t) => t.id === topic)!.label, what), ask: topic === 'body' ? BODY_FIRST : TELL };
}
