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
// Phase 10 (19 Nov 2026, design/PHASE10_BRIEF.md): the second starter is now "I want to talk about…", and it leads
// first to what the family put in About them, pictured: "me" (the person's own news), up to three people, up to two
// places, and "the news / TV", three to a screen. The last screen's way out leads to the topics above, so nothing of
// phase 4 is lost. The carer reads "Frank wants to talk about Beth." and three questions by the kind of thing picked
// (talkAsk): a person, a place, the news, or the person's own news. Each is a card the rules make, and each answer
// has its step in core/tree.ts. With About them empty there are no people or places: "me" and "the news / TV" stay,
// so the screen still has two real choices. Still rules only, on every device: no model and no request.
//
// Rules only: fixed cards, no model, no request, nothing sent. This module imports the copy, the topics and the types,
// so it cannot reach an engine or the network.
// Safety: a card the person started is never counted by the answer check (core/reliability.ts), and the check's line
// ("may be tired") is never shown on a screen that follows from it: what the person chose to say is taken as said.

import { P10 } from './copy10';
import { P4 } from './copy4';
import { TOPIC_BASE, awayNames, type TopicId } from './topics';
import { TELL, TELL_NEWS, TELL_WHEN } from './tree';
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
const base = (asked: string, turn: NonNullable<Card['turn']>) => ({
  asked, pending: null, topic: '', kind: 'choice' as const, source: 'code' as const, route: { to: 'device' as const, reasons: [] }, cloudPayload: null, notes: [S.note], ms: 0, turn, trace: trace(),
  why: { proposed: null, decided: S.why, kept: [], added: [], dropped: [], headline: 'fixed' },
});
const escape = (label: string): Choice => ({ label, spoken: label, role: 'escape', picture: { type: 'builtin', id: 'something else' } });

/** The card the person starts from: three starters and the way out. */
/** The starters' words on the person's screen (phase 10: "I want to talk about…" in place of "I want to tell you something"). */
export const STARTER_LABEL: Record<Starter, string> = { need: S.starters.need, tell: P10.turn.talk, feel: S.starters.feel };
export function turnCard(): Card {
  const choices: Choice[] = [...STARTERS.map((k): Choice => ({ label: STARTER_LABEL[k], spoken: STARTER_LABEL[k], role: 'answer', picture: { type: 'builtin', id: PICTURE[k] } })), escape('something else')];
  return { ...base(S.ask, 'start'), choices, say: 'What would you like to do: ask for something, talk about something, or say how you feel?' };
}
/** Which starter a label of that card is, or null for the way out. */
/**
 * The question kept for later when the person taps "Not now" on their own start. On the starters and on "I want to
 * talk about…" the asked line is the app's helper line or the person's own words, which read wrongly as a question
 * on Home; the carer gets one they can ask. Every other question (a need, a feeling, pain) is kept as it was asked.
 */
export const laterQuestion = (asked: string): string => (asked === S.ask || asked === P10.turn.talkAsk ? P10.turn.laterAsk : asked);
export const starterOf = (label: string): Starter | null => STARTERS.find((k) => STARTER_LABEL[k] === label) ?? null;

// ---------------------------------------------------------------- phase 10: "I want to talk about…"
export type TalkKind = 'me' | 'person' | 'place' | 'news';
export interface TalkPick { kind: TalkKind; word: string; household?: boolean }
/** How many of each About them gives this screen: three people and two places at most, so it stays three screens or fewer. */
export const TALK_PEOPLE = 3;
export const TALK_PLACES = 2;
const nameOf = (p: Profile['people'][number]) => p.nickname?.trim() || p.name.trim();

/**
 * What the person can pick on "I want to talk about…", in order: their own news, the family's people (those who do
 * not live there first; never the carer using the app), the family's places, the news / TV. Rules: About them only.
 */
export function talkItems(profile: Profile): TalkPick[] {
  const partner = profile.partnerName.trim().toLowerCase();
  const people = profile.people.filter((p) => nameOf(p) && nameOf(p).toLowerCase() !== partner && p.name.trim().toLowerCase() !== partner);
  const ordered = [...people.filter((p) => !p.household), ...people.filter((p) => p.household)];
  const seen = new Set<string>();
  const once = (w: string) => { const k = w.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; };
  const who = ordered.map((p) => ({ kind: 'person' as const, word: nameOf(p), household: p.household })).filter((x) => once(x.word)).slice(0, TALK_PEOPLE);
  const where = profile.places.map((x) => x.trim()).filter(Boolean).filter(once).slice(0, TALK_PLACES).map((word) => ({ kind: 'place' as const, word }));
  return [{ kind: 'me', word: S.me }, ...who, ...where, { kind: 'news', word: P10.turn.news }];
}

/** Three to a screen; a last screen of one gets one from the screen before, so every screen has two real choices or more. */
export function pages<T>(xs: T[], size = 3): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += size) out.push(xs.slice(i, i + size));
  if (out.length > 1 && out[out.length - 1].length === 1) out[out.length - 1].unshift(out[out.length - 2].pop()!);
  return out;
}

/**
 * "I want to talk about…" on the person's screen: the pictured people and places of About them, "me" and "the news /
 * TV", three to a screen. "something else" turns to the next screen; on the last it leads to the topics (topicMenu).
 */
export function talkMenu(profile: Profile): Card {
  const own = profile.personName.trim();
  const pic = (x: TalkPick): Choice['picture'] => {
    if (x.kind === 'me') return { type: 'person', personId: null, initial: (own || 'M').charAt(0).toUpperCase() };
    if (x.kind === 'person') { const p = profile.people.find((y) => nameOf(y) === x.word); return { type: 'person', personId: p?.id ?? null, initial: x.word.charAt(0).toUpperCase() }; }
    return { type: 'builtin', id: x.kind === 'news' ? 'news' : 'go out' };
  };
  const ps = pages(talkItems(profile));
  let next: Card | null = topicMenu();
  for (let i = ps.length - 1; i >= 0; i--) {
    const xs = ps[i];
    next = { ...base(P10.turn.talkAsk, 'talk'), choices: [...xs.map((x): Choice => ({ label: x.word, spoken: x.word, role: 'answer', picture: pic(x) })), escape('something else')], say: P10.turn.talkSay(xs.map((x) => x.word)), nextPage: next };
  }
  return next!;
}
/** What a label of the talk screen is, by About them; null for a word that is not on it. */
export function talkPick(label: string, profile: Profile): TalkPick | null {
  return talkItems(profile).find((x) => x.word === label) ?? null;
}

/**
 * The carer's line and three questions for what the person picked. Rules templates per kind; the telling comes first
 * (the role-play of 18 Nov: an offer to call is not what someone with news wants first), an offer last.
 */
export function talkLead(pick: TalkPick, name: string): { line: string; ask: string[] } {
  const A = P10.turn.ask;
  const L = P10.turn.line;
  switch (pick.kind) {
    case 'me': return { line: L.me(name), ask: TELL };
    case 'person': return { line: L.person(name, pick.word), ask: pick.household ? [TELL_NEWS, A.happenedWith(pick.word), TELL_WHEN] : [TELL_NEWS, A.visit(pick.word), A.call(pick.word)] };
    case 'place': return { line: L.place(name, pick.word), ask: [A.happenedAt(pick.word), TELL_NEWS, A.go(pick.word)] };
    case 'news': return { line: L.news(name), ask: [A.news, TELL_NEWS, A.tvOn] };
  }
}

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
    // (phase 8, judge round 7, the SLP's and the person's seats: the person's own news is the commonest subject, so "me"
    // comes first, with their initial; then two names at most, and the way out: three choices and "someone else")
    const two = names.slice(0, 2);
    const own = profile.personName.trim();
    const me: Choice = { label: S.me, spoken: S.me, role: 'answer', picture: { type: 'person', personId: null, initial: (own || 'M').charAt(0).toUpperCase() } };
    const choices: Choice[] = [me, ...two.map((n): Choice => {
      const p = profile.people.find((x) => (x.nickname?.trim() || x.name.trim()) === n);
      return { label: n, spoken: n, role: 'answer', picture: { type: 'person', personId: p?.id ?? null, initial: n.charAt(0).toUpperCase() } };
    })];
    return { ...base(S.aboutAsk.people, 'about'), choices: [...choices, escape('someone else')], say: `${S.aboutAsk.people} ${[S.me, ...two].join(', ')}, or someone else?` };
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
  // ("me" on the person's screen is the person: the carer reads "Frank's own news", or "their own news")
  const who = what === S.me ? S.aboutMe(name) : what;
  return { line, about: S.about(TOPIC_BASE.find((t) => t.id === topic)!.label, who), ask: topic === 'body' ? BODY_FIRST : TELL };
}
