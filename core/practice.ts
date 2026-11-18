// "For the speech therapist" (phase 7, 18 Nov 2026): how the conversations at home went, as counts, on one page the
// carer takes to the session. A speech therapist coaches the partner; this shows what happened between sessions.
//
// Rules only. The page is built here, on the device, from a small log of what was done in the app: one row for a
// question asked, an answer confirmed, a "No, something else", a start by the person, "We're stuck". A ROW HOLDS NO
// WORD of a question or of an answer: a time, a kind, a topic of the app's seven, and yes / no marks. No model reads
// the log or writes a line, and no file that builds a prompt or a request imports this one
// (tests/unit/phase7-practice.test.ts).
//
// Never a grade: every line is a count and says what it counts. No line says the carer or the person did well or
// badly, and none says what to do. The person's own data stays out unless the carer ticks "Include the needs and pain
// answers": only then does the page hold the needs pointed to and the pain answers of the span, from the diary, with
// the fixed sentence on whom to tell and when to call wherever a pain was strong or in the head or the chest.
//
// The log starts on the day this build first ran on the device: nothing from before is in it, and the page says so.

import { P5 } from './copy5';
import { P6 } from './copy6';
import { P8 } from './copy8';
import { dayText, daysBefore, eventGroups, tags, timeText, type DiaryEntry } from './diary';
import { DEFAULT_NUMBER, WRONG_TILE } from './redflag';
import { TOPIC_BASE, type TopicId } from './topics';

export type PracticeTopic = TopicId | 'other';
/** Where the question came from: tapped from the app's own lists, typed by the carer, or spoken by the carer. */
export type AskedBy = 'app' | 'typed' | 'spoken';
/** The card an answer was confirmed on, as far as the count needs it. */
export type Via = 'card' | 'more' | 'about' | 'letter' | 'typed' | 'narrow' | 'needs' | 'body' | 'repair' | 'turn';

export type PracticeEvent =
  /** A question that became a card or a line to say. `start`: it began a new conversation. `second`: the second half of a question the app split. */
  | { k: 'ask'; at: number; topic: PracticeTopic; by: AskedBy; two?: true; quiz?: true; start?: true; second?: true }
  /** "I really don't know the answer: make a card", after a memory question. */
  | { k: 'anyway'; at: number }
  /** "Yes" on the check. `esc`: the confirmed choice was the way out ("something else"). */
  | { k: 'answer'; at: number; via: Via; esc?: true }
  /** "No, something else" on the check. */
  | { k: 'no'; at: number }
  /** The person started ("… wants to say something"). */
  | { k: 'turn'; at: number }
  /** "We're stuck" was opened. `after`: from the ways after "something else". */
  | { k: 'stuck'; at: number; after?: true }
  /** The needs board was opened from the first screen (a new conversation). */
  | { k: 'board'; at: number };

export interface PracticeLog {
  /** When this device began to count (the first run of a build that has the log). */
  since: number;
  events: PracticeEvent[];
}
export const PRACTICE_CAP = 5000;
/** An open "something else" with nothing confirmed for this long is over. */
export const EPISODE_MS = 30 * 60 * 1000;
export const PRACTICE_QUESTIONS = 3;
export type PracticeSpan = 'week' | 'month';
const SPAN_DAYS: Record<PracticeSpan, number> = { week: 7, month: 30 };

export const newLog = (now: number): PracticeLog => ({ since: now, events: [] });
/** Whatever was stored, as a log: rows without a time or a known kind are dropped. */
export function cleanLog(raw: unknown, now: number): PracticeLog {
  const x = (raw ?? {}) as Partial<PracticeLog>;
  const kinds = ['ask', 'anyway', 'answer', 'no', 'turn', 'stuck', 'board'];
  const events = Array.isArray(x.events) ? x.events.filter((e) => !!e && typeof e.at === 'number' && Number.isFinite(e.at) && kinds.includes(e.k)) : [];
  return { since: typeof x.since === 'number' && Number.isFinite(x.since) && x.since <= now ? x.since : now, events };
}
export function addEvent(log: PracticeLog, e: PracticeEvent, cap = PRACTICE_CAP): PracticeLog {
  return { since: log.since, events: [...log.events, e].slice(-cap) };
}

export type Helped = 'more' | 'letter' | 'typed' | 'narrow' | 'needs' | 'body' | 'next';
export const HELPED: Helped[] = ['more', 'letter', 'typed', 'narrow', 'needs', 'body', 'next'];
const HELPED_BY: Partial<Record<Via, Helped>> = { more: 'more', letter: 'letter', typed: 'typed', narrow: 'narrow', needs: 'needs', body: 'body', card: 'next' };

export interface PracticeCounts {
  from: number; to: number;
  /** The log began inside the span: the day it began, else null. */
  began: number | null;
  asked: number;
  byTopic: { topic: PracticeTopic; n: number }[];
  app: number; typed: number; spoken: number;
  two: number; second: number; quiz: number; anyway: number;
  /** "Something else": how often it was confirmed, and in how many conversations. */
  elseTaps: number; elseTalks: number;
  helped: Record<Helped, number>;
  /** Conversations with a "something else" after which no answer was confirmed. */
  helpedNone: number;
  stuck: number; stuckAfter: number;
  turns: number;
  checkYes: number; checkNo: number;
  /** Nothing at all was counted in the span. */
  empty: boolean;
}

/** The span as moments: the last 7 or 30 calendar days, today among them, ending now. */
export function practiceRange(span: PracticeSpan, now: number): { from: number; to: number } {
  return { from: daysBefore(now, SPAN_DAYS[span] - 1), to: now };
}

/**
 * Every count of the page. Pure: the same log, span and moment give the same numbers.
 *
 * "Something else" is counted twice over: each time it was confirmed (`elseTaps`), and once for the conversation it
 * was in (`elseTalks`). A conversation with a "something else" ends in exactly one way: the first answer confirmed
 * after it (by more choices, the first letter, a typed word, the AI's choices, the needs board, the body card, or
 * another question), or none (a new conversation started, 30 minutes passed, or the span ended). "What is it about?"
 * and a tile of "We're stuck" are steps on the way, not an end. So the ways and "none" add up to `elseTalks`.
 */
export function practiceCounts(log: PracticeLog, span: PracticeSpan, now: number): PracticeCounts {
  const { from, to } = practiceRange(span, now);
  const events = log.events.filter((e) => e.at >= from && e.at <= to).sort((a, b) => a.at - b.at);
  const asks = events.filter((e): e is Extract<PracticeEvent, { k: 'ask' }> => e.k === 'ask');
  const topics: PracticeTopic[] = [...TOPIC_BASE.map((t) => t.id), 'other'];
  const helped = Object.fromEntries(HELPED.map((h) => [h, 0])) as Record<Helped, number>;
  let elseTaps = 0; let elseTalks = 0; let helpedNone = 0;
  let open: number | null = null;
  const close = () => { if (open !== null) { helpedNone++; open = null; } };
  for (const e of events) {
    if (open !== null && e.at - open > EPISODE_MS) close();
    if ((e.k === 'ask' && e.start) || e.k === 'turn' || e.k === 'board') { close(); continue; }
    if (e.k !== 'answer') continue;
    if (e.esc) { elseTaps++; if (open === null) elseTalks++; open = e.at; continue; }
    const how = HELPED_BY[e.via];
    if (open !== null && how) { helped[how]++; open = null; } else if (open !== null) open = e.at;
  }
  close();
  const stuck = events.filter((e): e is Extract<PracticeEvent, { k: 'stuck' }> => e.k === 'stuck');
  return {
    from, to, began: log.since > from ? log.since : null,
    asked: asks.length,
    byTopic: topics.map((topic) => ({ topic, n: asks.filter((a) => a.topic === topic).length })).filter((x) => x.n > 0),
    app: asks.filter((a) => a.by === 'app').length, typed: asks.filter((a) => a.by === 'typed').length, spoken: asks.filter((a) => a.by === 'spoken').length,
    two: asks.filter((a) => a.two).length, second: asks.filter((a) => a.second).length, quiz: asks.filter((a) => a.quiz).length, anyway: events.filter((e) => e.k === 'anyway').length,
    elseTaps, elseTalks, helped, helpedNone,
    stuck: stuck.length, stuckAfter: stuck.filter((s) => s.after).length,
    turns: events.filter((e) => e.k === 'turn').length,
    checkYes: events.filter((e) => e.k === 'answer').length, checkNo: events.filter((e) => e.k === 'no').length,
    empty: events.length === 0,
  };
}

/** The carer's picks, as they may stand on the page: only questions of the fixed list, three at most, in the list's order. */
export function pickedPractice(picked: unknown): string[] {
  const xs = Array.isArray(picked) ? picked : [];
  return P8.practice.questions.filter((q) => xs.includes(q)).slice(0, PRACTICE_QUESTIONS);
}
/** A tap on a question: on, or off; a fourth is not taken. */
export function togglePractice(picked: string[], q: string): string[] {
  const now = pickedPractice(picked);
  if (now.includes(q)) return now.filter((x) => x !== q);
  return now.length >= PRACTICE_QUESTIONS ? now : pickedPractice([...now, q]);
}

export interface PracticeInput {
  log: PracticeLog;
  span: PracticeSpan;
  now: number;
  name: string;
  /** "phone", "tablet" or "computer". */
  device: string;
  /** Read aloud is on (the setting as it stands now). */
  speak: boolean;
  /** The carer's picks from the fixed list. */
  questions: string[];
  /** The diary, ONLY when "Include the needs and pain answers" is ticked; null otherwise (the page then holds nothing of it). */
  diary: DiaryEntry[] | null;
  number?: string;
  /** Phase 8: how many answers of the span the answer check marked "less sure" (a count only; no word of them). */
  lessSure?: number;
  /** Phase 8: with the box off, whether the diary of the span holds a pain answer or "something's wrong" (one yes or no; nothing of the entries). */
  flag?: boolean;
}
export interface PracticeSection { id: 'asked' | 'fit' | 'turn' | 'health' | 'ask'; heading: string; lines: string[] }
export interface PracticeReport {
  title: string; sub: string;
  /** Under the title: what the numbers are, and from when. */
  notes: string[];
  /** The call sentence, at the top, when a pain line below carries it; '' otherwise. */
  call: string;
  sections: PracticeSection[];
  footer: string;
  counts: PracticeCounts;
}

/** A strong pain, a pain in the head or the chest, or the board's "something's wrong": the entries the call sentence stands for. */
const urgentEntry = (e: DiaryEntry) => tags(e).some((t) => t === 'strong-pain' || t === 'place-pain') || (e.kind === 'need' && e.label.toLowerCase().trim() === WRONG_TILE);
/** The diary of the span holds such an entry: the screen says so while the box is off (the page itself holds nothing of the diary then). */
export function practiceUrgent(diary: DiaryEntry[], span: PracticeSpan, now: number): boolean {
  const { from, to } = practiceRange(span, now);
  return diary.some((e) => e.at >= from && e.at <= to && urgentEntry(e));
}

/** Phase 8: the diary of the span holds a pain answer or "something's wrong": the one yes or no the page may carry with the box off. */
export function practiceFlag(diary: DiaryEntry[], span: PracticeSpan, now: number): boolean {
  const { from, to } = practiceRange(span, now);
  return diary.some((e) => e.at >= from && e.at <= to && (tags(e).includes('pain') || urgentEntry(e)));
}
/** Phase 8: the answers of the span the answer check marked "less sure", counted. */
export function lessSureCount(history: { at: number; lessSure?: boolean }[], span: PracticeSpan, now: number): number {
  const { from, to } = practiceRange(span, now);
  return history.filter((h) => h.lessSure && h.at >= from && h.at <= to).length;
}

/** The lines of "Needs and pain answers": only what was entered, with the fixed sentence wherever the call box would stand in the app. */
function healthLines(diary: DiaryEntry[], from: number, to: number, name: string, number: string): { lines: string[]; urgent: boolean } {
  const K = P8.practice;
  const entries = diary.filter((e) => e.at >= from && e.at <= to).sort((a, b) => a.at - b.at);
  const needs = new Map<string, number>();
  for (const e of entries) if (e.kind === 'need') needs.set(e.label, (needs.get(e.label) ?? 0) + 1);
  const pain = eventGroups(entries, 'pain');
  const said = entries.filter((e) => e.kind === 'answer' && tags(e).includes('pain'));
  const urgent = entries.some(urgentEntry);
  const when = (at: number) => `${dayText(at)} ${timeText(at)}`;
  // (a month can hold many: the latest are named, and the line says how many came before)
  const latest = (xs: string[], max: number) => `${xs.length > max ? `${xs.length - max} earlier, then ` : ''}${xs.slice(-max).join('; ')}`;
  const quoted = (s: string) => `"${s.replace(/"/g, "'")}"`;
  return {
    urgent,
    lines: [
      K.healthSub(name),
      needs.size ? K.needs([...needs.entries()].sort((a, b) => b[1] - a[1]).map(([l, n]) => `${l} ${n}`).join(', ')) : K.needsNone,
      ...(pain.length ? [K.pain(pain.length, latest(pain.map((g) => when(g.at)), 6))] : [K.painNone]),
      ...(said.length ? [K.painAnswers(latest(said.map((e) => `${when(e.at)} ${quoted(e.q ?? '')} ${quoted(e.label)}`), 9))] : []),
      ...(urgent ? [P5.insights.painAct(number)] : []),
    ],
  };
}

/** The page: its title, what the numbers are, the sections, the footer. Pure; the screen and the shared text both draw it. */
export function practiceReport(m: PracticeInput): PracticeReport {
  const K = P8.practice;
  const c = practiceCounts(m.log, m.span, m.now);
  const number = m.number || DEFAULT_NUMBER;
  const label = (t: PracticeTopic) => (t === 'other' ? K.topicOther : TOPIC_BASE.find((x) => x.id === t)!.label);
  const health = m.diary ? healthLines(m.diary, c.from, c.to, m.name, number) : null;
  const asked: string[] = [
    K.asked(c.asked),
    ...(c.byTopic.length ? [K.byTopic(c.byTopic.map((x) => `${label(x.topic)} ${x.n}`).join(', '))] : []),
    K.source(c.app, c.typed, c.spoken),
    ...(c.two ? [K.two(c.two), ...(c.second ? [K.second(c.second)] : [])] : []),
    ...(c.quiz ? [K.quiz(c.quiz), ...(c.anyway ? [K.anyway(c.anyway)] : [])] : []),
    ...(!c.two && !c.quiz ? [K.noFlags] : []),
  ];
  const ways = HELPED.filter((h) => c.helped[h] > 0);
  const fit: string[] = [
    c.elseTaps ? K.elseLine(c.elseTaps, c.elseTalks) : K.elseNone,
    ...(ways.length ? [K.helpedHead, ...ways.map((h) => K.helpedLine(K.helped[h], c.helped[h]))] : []),
    ...(c.elseTalks ? [K.helpedNone(c.helpedNone)] : []),
    K.stuck(c.stuck, c.stuckAfter),
  ];
  const turn: string[] = [K.turn(m.name, c.turns), K.check(c.checkYes, c.checkNo), ...(m.lessSure !== undefined ? [K.lessSure(m.lessSure)] : []), K.speak(m.speak, m.device)];
  const questions = pickedPractice(m.questions);
  return {
    title: K.title,
    sub: K.sub(m.name, m.span === 'week' ? '7 days' : '30 days', dayText(c.from), dayText(c.to)),
    notes: [K.base(m.device), K.notScore(m.name), ...(c.began !== null ? [K.began(dayText(c.began))] : []), ...(c.empty ? [K.empty] : [])],
    call: health?.urgent ? P6.share.call(number, K.callWhere) : '',
    sections: [
      { id: 'asked', heading: K.sec.asked, lines: asked },
      { id: 'fit', heading: K.sec.fit, lines: fit },
      { id: 'turn', heading: K.sec.turn, lines: turn },
      { id: 'health', heading: K.sec.health, lines: health ? health.lines : [K.healthOffLine, ...(m.flag ? [K.healthFlag] : [])] },
      ...(questions.length ? [{ id: 'ask' as const, heading: K.sec.ask, lines: [`${K.qPrinted}:`, ...questions.map((q) => `- ${q}`)] }] : []),
    ],
    footer: K.footer(m.device),
    counts: c,
  };
}

/** "Sun 22 Nov, 12:00", as the first line of every shared text has it (core/share.ts). */
const stampWhen = (at: number) => `${dayText(at)}, ${timeText(at)}`;

/** The page as plain text, for the share sheet: the same lines as the printed page, under the first line every shared text has. */
export function practiceText(m: PracticeInput): string {
  const r = practiceReport(m);
  return [
    P6.share.stamp(stampWhen(m.now)),
    ...(r.call ? [r.call] : []),
    '',
    `${P8.practice.kicker}: ${r.title}`,
    r.sub,
    ...r.notes,
    ...r.sections.flatMap((s) => ['', s.heading, ...s.lines]),
    '',
    r.footer,
  ].join('\n');
}

/** The words the page must never hold (the brief's list): no line grades anyone or says what to do. */
export const GRADE_WORDS = /\b(?:good|bad|well done|poor|should|must|failed)\b/i;
/** A line with the person's own answers taken out (they stand in double quotes, as given): what is left is the app's wording. */
export const ownWording = (line: string) => line.replace(/"[^"]*"/g, '""');
