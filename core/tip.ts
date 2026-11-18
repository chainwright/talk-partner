// The tip of the day, for the carer: one sentence about the carer's own questions, never about the person.
//
// Built from flags the rules already set on each card as it is made (core/pipeline.ts, core/narrow.ts): the question
// asked two things at once (`pending`), it asked the person to remember something (`no-quiz`), the rules could not
// make its choices because it was open, or the choices did not fit and more were shown after "something else".
// The app keeps the flags of today's questions on this device (web/src/store.ts, key 'asks'): four yes / no marks and
// a time per question, never the question's words. Counting and choosing the tip are rules. Where the browser has
// Gemini Nano the sentence may be put into plainer words on the device (core/reword.ts, ONLY_ON_DEVICE); everywhere
// else the fixed sentence stands. There is no cloud step. This file imports the copy and a type, and nothing else.

import { COPY } from './copy';
import type { Card } from './types';

export interface Ask {
  at: number;
  /** An open question: the rules could not make its choices (an AI was asked, or no card was made). */
  open: boolean;
  /** Two things in one question. */
  two: boolean;
  /** It asked the person to remember something. */
  quiz: boolean;
  /** The choices did not fit, and more were shown (a narrowing step after "something else"). */
  again: boolean;
}
export const ASKS_CAP = 300;
/** No tip before this many questions today: too little to say anything from. */
export const TIP_MIN = 3;

/** The flags of one card, read from the card the pipeline made. */
export function askOf(card: Pick<Card, 'kind' | 'pending' | 'source' | 'blocked' | 'narrow'>, at: number): Ask {
  const again = !!card.narrow;
  const quiz = card.kind === 'no-quiz';
  return { at, two: !!card.pending, quiz, again, open: !again && !quiz && (card.source !== 'code' || !!card.blocked) };
}

export function addAsk(asks: Ask[], a: Ask, cap = ASKS_CAP): Ask[] {
  return [...asks, a].slice(-cap);
}

export interface Tip { kind: 'two' | 'quiz' | 'again' | 'open' | 'good'; text: string; base: string }

/**
 * Today's tip, or null before three questions. One tip only, the most useful first: two things at once, a memory
 * question, choices that did not fit twice or more, mostly open questions; and when none of these happened, one line
 * that says what went well.
 */
export function tipOfDay(asks: Ask[], now: number): Tip | null {
  const d = new Date(now);
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const today = asks.filter((a) => a.at >= start && a.at <= now);
  if (today.length < TIP_MIN) return null;
  const T = COPY.simple.dayTip;
  const n = (k: 'two' | 'quiz' | 'again' | 'open') => today.filter((a) => a[k]).length;
  const base = T.base(today.length);
  if (n('two') >= 1) return { kind: 'two', text: T.two(n('two')), base };
  if (n('quiz') >= 1) return { kind: 'quiz', text: T.quiz(n('quiz')), base };
  if (n('again') >= 2) return { kind: 'again', text: T.again(n('again')), base };
  if (n('open') >= 2 && n('open') * 2 >= today.length) return { kind: 'open', text: T.open(n('open')), base };
  return { kind: 'good', text: T.good(today.length), base };
}
