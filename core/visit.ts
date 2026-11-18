// "Before a doctor visit": a short, fixed set of questions the person answers at home, unhurried, and one page of
// their own answers with the date, to show or print in the room. The doctor then reads the person's answers, not the
// carer's summary of them.
//
// The questions are a FIXED list, written and checked by us, in this file (VISIT). No model writes, picks, orders or
// rewords a question, and no model reads an answer: there is no engine in this flow at all (the two cards the rules
// make, "Are you in pain?" and the body map, are made with an engine that cannot run a model). The list asks about
// general things only (pain, sleep, appetite, mood, what worries the person, what they want to ask); it names no
// illness, no medicine and no symptom of one, and it never suggests what an answer means.
// What the app never does here: advise, interpret, score, or mark an answer "less sure". An answer about pain is shown
// exactly as it was given. The page says whose answers these are, when and how they were given, and that it is not a
// medical record.
// Privacy: the answers are kept on this device only (IndexedDB key 'visit'), apart from the history and the journal
// of the day, so no step that builds a request can read them. This file is not imported by any such step
// (tests/unit/visit.test.ts).

import { P4 } from './copy4';
import { NullEngine } from './engine';
import { finish, makeCard } from './pipeline';
import type { Card, Profile, SupportLevel } from './types';

export type VisitId = 'pain' | 'where' | 'bad' | 'sleep' | 'appetite' | 'mood' | 'worry' | 'ask';

export interface VisitQuestion {
  id: VisitId;
  q: string;
  /** The short name of the row on the page. */
  row: string;
  /** Fixed choices, three to a screen (a second list is the next screen). Without them the app's rules make the card from the question. */
  pages?: string[][];
  /** The way out of this card. */
  out?: string;
  /** Asked only when the answer to 'pain' was yes. */
  ifPain?: boolean;
}

/** The fixed, vetted list. Order matters: pain first, the open-ended two last. Eight cards at most, six without pain. */
export const VISIT: VisitQuestion[] = [
  { id: 'pain', q: 'Are you in pain?', row: 'Pain' },
  { id: 'where', q: 'Where does it hurt?', row: 'Where it hurts', ifPain: true },
  { id: 'bad', q: 'How bad is the pain?', row: 'How bad', pages: [['a little', 'quite bad', 'very bad']], out: 'not sure', ifPain: true },
  { id: 'sleep', q: 'How have you been sleeping?', row: 'Sleep', pages: [['well', 'so-so', 'badly']] },
  { id: 'appetite', q: 'How is your appetite?', row: 'Appetite', pages: [['good', 'so-so', 'poor']] },
  { id: 'mood', q: 'How have you been feeling in yourself?', row: 'Mood', pages: [['good', 'so-so', 'low']] },
  { id: 'worry', q: 'What worries you most?', row: 'Worries most', pages: [['talking', 'my body', 'nothing much'], ['my family', 'money or work', 'what happens next']] },
  { id: 'ask', q: 'What do you want to ask the doctor?', row: 'Wants to ask the doctor', pages: [['my speech', 'my tablets', 'getting stronger'], ['driving', 'going out', 'what happens next']] },
];
export const VISIT_MAX = VISIT.length;

export interface VisitAnswer { id: VisitId; q: string; label: string; at: number; /** The way out was chosen ("something else", "not sure"). */ out?: boolean }
export interface VisitRecord {
  startedAt: number; answers: VisitAnswer[]; done: boolean;
  /** Phase 5, the carer's part of the page (core/since.ts): the day of the last visit, and up to three questions picked from the fixed list. */
  since?: number;
  carerAsk?: string[];
}

/** The question to ask next, or null at the end. The two questions about the pain follow only a yes to the first. */
export function nextVisit(answers: VisitAnswer[]): VisitQuestion | null {
  const got = new Set(answers.map((a) => a.id));
  const pain = answers.find((a) => a.id === 'pain');
  return VISIT.find((v) => !got.has(v.id) && (!v.ifPain || pain?.label.toLowerCase() === 'yes')) ?? null;
}
/** How many questions this run will hold, by the answers so far (eight after a yes to pain, six otherwise). */
export function visitTotal(answers: VisitAnswer[]): number {
  const pain = answers.find((a) => a.id === 'pain');
  return VISIT.filter((v) => !v.ifPain || !pain || pain.label.toLowerCase() === 'yes').length;
}

const NO_MODEL = new NullEngine();
/** The card of one question. Fixed choices where the list gives them; otherwise the app's rules, with no model to call. */
export async function visitCard(v: VisitQuestion, profile: Profile, support: SupportLevel): Promise<Card> {
  const mark = (c: Card): Card => { for (let p: Card | null | undefined = c; p; p = p.nextPage) { p.visit = v.id; p.notes = [P4.visit.note]; } return c; };
  if (!v.pages) {
    const card = await makeCard(v.q, { profile, support, engine: NO_MODEL, allowCloud: false, deviceReady: false });
    if (card.source !== 'code' || card.blocked) throw new Error(`the rules made no card for "${v.q}"`);
    return mark(card);
  }
  const base = {
    asked: v.q, pending: null, topic: '', kind: 'choice' as const, source: 'code' as const, route: { to: 'device' as const, reasons: [] }, cloudPayload: null, notes: [P4.visit.note], ms: 0,
    trace: [
      { step: 'private' as const, ran: 'skipped' as const, why: 'not needed: a fixed question', used: false },
      { step: 'stripped' as const, ran: 'skipped' as const, why: 'not needed: a fixed question', used: false },
      { step: 'code' as const, ran: 'on-device' as const, why: 'a fixed question', used: true },
    ],
    why: { proposed: null, decided: P4.visit.why, kept: [], added: [], dropped: [], headline: 'the question' },
  };
  let next: Card | null = null;
  for (let k = v.pages.length - 1; k >= 0; k--) {
    const card: Card = finish(base, v.pages[k], [v.out ?? 'something else'], profile, 'mild', 3);
    card.nextPage = next;
    next = card;
  }
  return mark(next!);
}

/**
 * Phase 9 (judge round 8, the carer's seat): the answer as it stands on the page. The second step of "Where does it
 * hurt?" ("Where in the chest?", then "middle") keeps the part of the body with it: "chest, middle", so the doctor
 * reads where it hurts and not only "middle". Any other answer stands exactly as given.
 */
export function visitLabel(c: Pick<Card, 'visit' | 'bodyStep' | 'region'>, label: string): string {
  if (c.visit !== 'where' || c.bodyStep !== 2 || !c.region) return label;
  return `${c.region}, ${label.replace(/^your\s+/i, '')}`;
}

const two = (n: number) => String(n).padStart(2, '0');
export const visitDate = (at: number) => new Date(at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
export const visitTime = (at: number) => { const d = new Date(at); return `${two(d.getHours())}:${two(d.getMinutes())}`; };

/** The rows of the page, in the order of the list: the short name, the question as asked, the answer as given, the time. */
export function visitRows(r: VisitRecord): { row: string; q: string; label: string; time: string; out: boolean }[] {
  return VISIT.flatMap((v) => r.answers.filter((a) => a.id === v.id).map((a) => ({ row: v.row, q: a.q, label: a.label, time: visitTime(a.at), out: !!a.out })));
}
/** True when the way out of the last question was chosen: the page then asks for time for it. */
export const visitElse = (r: VisitRecord) => r.answers.some((a) => a.id === 'ask' && a.out);

/** The page as plain text, for "Copy as text". */
export function visitText(r: VisitRecord, name: string): string {
  const V = P4.visit;
  const rows = visitRows(r).map((x) => `${x.q} ${x.label} (${x.time})`);
  return [V.pageTitle(name), V.pageSub(visitDate(r.startedAt)), ...(r.done ? [] : [V.part(r.answers.length, visitTotal(r.answers))]), '', ...rows, ...(visitElse(r) ? ['', V.elseNote] : []), '', V.footer(name)].join('\n');
}
