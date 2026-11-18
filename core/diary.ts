// The diary: what the person chose and asked for, and what the carer logged with one tap (drank, ate, toilet, slept,
// pain), by day, week and month, and by topic. For the carer's side only: the person's screens never show it.
//
// Rules only: no AI reads the diary to write it, sort it or count it. It is kept in IndexedDB on this device
// (web/src/store.ts, key 'diary') and nowhere else; "Delete the diary" removes it. This file is pure (no DOM, no
// storage, no network) and imports types only; no file that builds a prompt or a request for a model imports it
// (tests/unit/privacy-phase3.test.ts), so a diary entry cannot be in a request. The insights (core/insights.ts) read
// it on this device and hand a model nothing but their own counted lines.
//
// What a diary is not: a record of what happened. It holds only what was entered in this app. A day with no drink in
// it may be a day when nobody logged one, and every count the app shows says so.

import { careAnswer } from './reliability';
import type { TopicId } from './topics';

/** The carer's one-tap log. */
export type LogKind = 'drank' | 'ate' | 'toilet' | 'slept' | 'pain' | 'fall' | 'tablets';
// (18 Nov, judge round 6: a fall and "tablets taken". The tablets are a log line and nothing more: the app counts
// no dose, reminds of none and draws no line from them.)
export const LOG_KINDS: LogKind[] = ['drank', 'ate', 'toilet', 'slept', 'pain', 'fall', 'tablets'];
/** What a "Fall" entry is called once the carer noted a blow to the head. */
export const FALL_HEAD = 'fall: hit head';

export type DiaryTopic = TopicId | 'other';

export interface DiaryEntry {
  id: string;
  /** When (ms since the epoch, this device's clock). */
  at: number;
  /** 'log': the carer tapped it. 'answer': the person confirmed it on a card. 'need': the person pointed to it on the needs board. */
  kind: 'log' | 'answer' | 'need';
  /** For a log: which one. */
  log?: LogKind;
  /** For an answer: the question as the card showed it. */
  q?: string;
  /** The answer, the need, or the log's word. */
  label: string;
  topic: DiaryTopic;
  /** The answer-reliability guard marked it (core/reliability.ts). */
  lessSure?: boolean;
}

/** About a year of heavy use; the oldest entries fall off past it. */
export const DIARY_CAP = 6000;

const LOG_TOPIC: Record<LogKind, DiaryTopic> = { drank: 'food', ate: 'food', toilet: 'body', slept: 'rest', pain: 'body', fall: 'body', tablets: 'body' };
const NEED_TOPIC: Record<string, DiaryTopic> = { toilet: 'body', drink: 'food', food: 'food', pain: 'body', tired: 'rest', 'too hot': 'body', 'too cold': 'body', 'call someone': 'people', "something's wrong": 'body' };
const lc = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
let seq = 0;
const newId = (at: number) => `d${at.toString(36)}${(seq++ % 1296).toString(36)}`;

/** Which topic a question is about, by its words, for a question that came from no topic (a typed one). */
export function guessTopic(q: string): DiaryTopic {
  const s = lc(q);
  if (/\b(?:pain|hurt|hurts|toilet|wash|hot|cold|comfortable|glasses|hearing|side|sore)\b/.test(s)) return 'body';
  if (/\b(?:hungry|eat|drink|tea|coffee|water|juice|milk|snack|meal|sweet|savoury|more|thirsty|breakfast|lunch|dinner|supper)\b/.test(s)) return 'food';
  if (/\b(?:tired|sleep|slept|lie down|rest|bed|chair|noisy|curtains|nap)\b/.test(s)) return 'rest';
  if (/\b(?:call|visitor|visit|see|photos|company|alone|stay with)\b/.test(s)) return 'people';
  if (/\b(?:feel|feeling|bothering|worried|quiet time|stop for now|sad|upset)\b/.test(s)) return 'feel';
  if (/\b(?:tv|music|news|film|radio|paper|watch|listen)\b/.test(s)) return 'fun';
  if (/\b(?:go out|stay in|drive|garden|walk|exercises|weekend|today|morning|afternoon|go)\b/.test(s)) return 'plans';
  return 'other';
}

export function logEntry(log: LogKind, at: number): DiaryEntry {
  return { id: newId(at), at, kind: 'log', log, label: log, topic: LOG_TOPIC[log] };
}
export function needEntry(label: string, at: number): DiaryEntry {
  return { id: newId(at), at, kind: 'need', label, topic: NEED_TOPIC[lc(label)] ?? 'other' };
}
/** `topic` is the topic the conversation started from, when it started from one; else it is guessed from the words. */
export function answerEntry(a: { q: string; label: string; at: number; lessSure?: boolean }, topic?: DiaryTopic | null): DiaryEntry {
  return { id: newId(a.at), at: a.at, kind: 'answer', q: a.q, label: a.label, topic: topic ?? guessTopic(a.q), ...(a.lessSure ? { lessSure: true } : {}) };
}

/** A new list with the entry added, oldest first; the oldest fall off past the cap. */
export function addEntry(diary: DiaryEntry[], e: DiaryEntry, cap = DIARY_CAP): DiaryEntry[] {
  if (!e.label.trim()) return diary;
  return [...diary, e].sort((a, b) => a.at - b.at).slice(-cap);
}
export function removeEntry(diary: DiaryEntry[], id: string): DiaryEntry[] {
  return diary.filter((e) => e.id !== id);
}

// ---------------------------------------------------------------- days, weeks, months
export type Span = 'today' | 'week' | 'month';
export const SPAN_DAYS: Record<Span, number> = { today: 1, week: 7, month: 30 };

/** Local midnight of the day `t` is in. */
export function dayStart(t: number): number {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}
/** Local midnight `n` calendar days before the day `t` is in (so a change of the clocks does not move a day). */
export function daysBefore(t: number, n: number): number {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - n).getTime();
}
/** The span as moments: today, the last 7 days or the last 30 days, each with today in it and ending now. */
export function spanRange(span: Span, now: number): { from: number; to: number } {
  return { from: daysBefore(now, SPAN_DAYS[span] - 1), to: now };
}
/** The entries of the span, oldest first, of one topic or of all. */
export function inSpan(diary: DiaryEntry[], span: Span, now: number, topic: DiaryTopic | 'all' = 'all'): DiaryEntry[] {
  const { from, to } = spanRange(span, now);
  return diary.filter((e) => e.at >= from && e.at <= to && (topic === 'all' || e.topic === topic)).sort((a, b) => a.at - b.at);
}

export interface DiaryDay { day: number; entries: DiaryEntry[] }
/** The entries by calendar day, the newest day first; inside a day, the earliest first (a timeline). */
export function byDay(entries: DiaryEntry[]): DiaryDay[] {
  const m = new Map<number, DiaryEntry[]>();
  for (const e of entries) { const d = dayStart(e.at); (m.get(d) ?? m.set(d, []).get(d)!).push(e); }
  return [...m.entries()].sort((a, b) => b[0] - a[0]).map(([day, xs]) => ({ day, entries: xs.sort((a, b) => a.at - b.at) }));
}

const two = (n: number) => String(n).padStart(2, '0');
/** "09:02", by this device's clock. */
export function timeText(at: number): string {
  const d = new Date(at);
  return `${two(d.getHours())}:${two(d.getMinutes())}`;
}
const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "Wed 18 Nov". */
export function dayText(day: number): string {
  const d = new Date(day);
  return `${WEEKDAY[d.getDay()]} ${d.getDate()} ${MONTH[d.getMonth()]}`;
}
/** "Today", "Yesterday", or nothing. */
export function dayWord(day: number, now: number): '' | 'Today' | 'Yesterday' {
  return dayStart(day) === dayStart(now) ? 'Today' : dayStart(day) === daysBefore(now, 1) ? 'Yesterday' : '';
}

// ---------------------------------------------------------------- what an entry counts as (for the insights)
export type Tag = 'drink' | 'food' | 'sweet' | 'toilet' | 'sleep' | 'bad-sleep' | 'pain' | 'tired' | 'fall' | 'fall-head' | 'tablets' | 'low-mood' | 'strong-pain' | 'place-pain';

const DRINK = /^(?:tea|coffee|water|juice|milk|a drink|drink|squash|cocoa|hot chocolate|lemonade|a cup of tea|a glass of water)$/;
const SWEET = /\b(?:sweet|sweets|biscuit|biscuits|cake|chocolate|ice cream|pudding|dessert|candy|cookie|cookies|jam|honey|toffee|doughnut|pastry|pie)\b/;
const NOT_AN_ANSWER = /^(?:yes|no|not sure|something else|someone else|somewhere else)$/;
const FOOD_Q = /\b(?:snack|meal|eat|sweet|savoury|breakfast|lunch|dinner|supper|pudding)\b/;

/**
 * What an entry counts as. A drink counts when the person chose it by name on a card (tea, coffee, water, juice,
 * milk), said yes to "something to drink", pointed to it on the board, or it was logged; a food likewise. "Yes" to
 * "Are you hungry?" is not a meal, and "a hot drink" is one step on the way to "tea", so neither is counted.
 */
export function tags(e: DiaryEntry): Tag[] {
  const l = lc(e.label);
  const q = lc(e.q ?? '');
  if (e.kind === 'log') return e.log === 'drank' ? ['drink'] : e.log === 'ate' ? ['food'] : e.log === 'toilet' ? ['toilet'] : e.log === 'slept' ? ['sleep'] : e.log === 'fall' ? (l === FALL_HEAD ? ['fall', 'fall-head'] : ['fall']) : e.log === 'tablets' ? ['tablets'] : ['pain'];
  if (e.kind === 'need') return l === 'drink' ? ['drink'] : l === 'food' ? ['food'] : l === 'toilet' ? ['toilet'] : l === 'pain' ? ['pain'] : l === 'tired' ? ['tired'] : [];
  const out: Tag[] = [];
  if (DRINK.test(l) || (/\bsomething to drink\b/.test(q) && l === 'yes')) out.push('drink');
  if (SWEET.test(l)) out.push('sweet');
  if (!NOT_AN_ANSWER.test(l) && !DRINK.test(l) && !/\bdrink\b/.test(l) && (FOOD_Q.test(q) || (e.topic === 'food' && /^would you like\b/.test(q) && !/\bdrink\b|\bmilk in it\b|\bsome more\b/.test(q)))) out.push('food');
  if (/\btoilet\b/.test(q) && l === 'yes') out.push('toilet');
  if ((/\b(?:in pain|hurt|hurts|hurting|sore)\b/.test(q) && l === 'yes') || l === 'in pain' || /^where does it hurt\b/.test(q) || (/^how bad is the pain\b/.test(q) && l !== 'not sure')) out.push('pain');
  if ((/\btired\b/.test(q) && l === 'yes') || l === 'tired') out.push('tired');
  if (/^how did you sleep\b/.test(q) && l === 'bad') out.push('bad-sleep');
  // (phase 5) what the insights look at day by day: a strong pain, a pain in the head or the chest, a low day
  if (/^how bad is the pain\b/.test(q) && /^(?:quite bad|very bad)$/.test(l)) out.push('strong-pain');
  // (the second step of the body card asks "Where in the chest?": a place chosen there is a pain entry too)
  if (/^where in the \w+\b/.test(q) && !/^some(?:where|thing) else$/.test(l) && !out.includes('pain')) out.push('pain');
  if ((/^where in the (?:head|chest)\b/.test(q) && !/^some(?:where|thing) else$/.test(l)) || (/^where does it hurt\b/.test(q) && /\b(?:head|chest)\b/.test(l))) out.push('place-pain');
  if (/^how are you feeling today\b/.test(q) && /^(?:sad|bad)$/.test(l)) out.push('low-mood');
  return out;
}

/** A card and a tap of the same thing less than this apart are one event ("tea" on a card, then "Drank" tapped). */
export const SAME_EVENT_MS = 20 * 60 * 1000;

/**
 * The moments something of this kind was entered, oldest first. Every tap on the log counts by itself: carers log
 * afterwards, several at once, so three "Drank" in one minute are three drinks, as the timeline shows them. What is
 * merged: a card answer and one tap of the same thing within 20 minutes (the tea on the card is the tea that was
 * drunk), and the answers of one conversation ("something to drink? yes", then "tea").
 */
export function events(entries: DiaryEntry[], tag: Tag): number[] {
  return eventGroups(entries, tag).map((g) => g.at);
}

/** One counted event, and the entries behind it: the first id is the entry that is counted, the rest were merged into it. */
export interface EventGroup { at: number; ids: string[] }

/**
 * The same count as `events`, with the entries each event was counted from (phase 6: an insight line can show where
 * it came from). `events` is this list's moments, so the two cannot differ.
 */
export function eventGroups(entries: DiaryEntry[], tag: Tag): EventGroup[] {
  const hits = [...entries].filter((e) => tags(e).includes(tag)).sort((a, b) => a.at - b.at);
  const logs = hits.filter((e) => e.kind === 'log').map((e) => ({ at: e.at, ids: [e.id], paired: false }));
  const out: EventGroup[] = logs.map((l) => l);
  let lastCard = -Infinity;
  let lastGroup: EventGroup | null = null;
  for (const e of hits) {
    if (e.kind === 'log') continue;
    // one more answer of the same conversation: the same event as the one before it
    if (e.at - lastCard < SAME_EVENT_MS && lastGroup) { lastCard = e.at; lastGroup.ids.push(e.id); continue; }
    lastCard = e.at;
    const near = logs.filter((l) => !l.paired && Math.abs(l.at - e.at) < SAME_EVENT_MS).sort((a, b) => Math.abs(a.at - e.at) - Math.abs(b.at - e.at))[0];
    if (near) { near.paired = true; near.ids.push(e.id); lastGroup = near; } else { lastGroup = { at: e.at, ids: [e.id] }; out.push(lastGroup); }
  }
  return out.map((g) => ({ at: g.at, ids: g.ids })).sort((a, b) => a.at - b.at);
}

/** The diary with every entry of the guard's run marked "less sure" (core/reliability.ts): answers only, never a log. */
export function markDiary(diary: DiaryEntry[], since: number | null, now: number): DiaryEntry[] {
  if (since === null) return diary;
  return diary.map((e) => (e.kind === 'answer' && e.at >= since && e.at <= now && !e.lessSure && !careAnswer(e.q ?? '', e.label, e.topic) ? { ...e, lessSure: true } : e));
}

/** The span as plain text, for "Copy for a visit": day by day, a time and what was entered. No count, no advice. */
export function diaryText(entries: DiaryEntry[], words: { log: Record<LogKind, string>; lessSure: string; need: string }): string {
  return byDay(entries).reverse().map((d) => `${dayText(d.day)}\n${d.entries.map((e) => `  ${timeText(e.at)}  ${e.kind === 'log' ? words.log[e.log!] : e.kind === 'need' ? `${words.need} ${e.label}` : `${e.q} ${e.label}`}${e.lessSure ? ` (${words.lessSure})` : ''}`).join('\n')}`).join('\n');
}
