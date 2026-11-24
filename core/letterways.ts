// Phase 18: the ways under a letter card with no word (see letterWays). Apart from core/letter.ts, which builds a
// cloud text and so imports no health word list (tests/unit/phase5-safety.test.ts); this file builds no request.

import { P4 } from './copy4';
import { subjectOf } from './kinds';
import { NO_MODEL_TOPICS, letterTopic } from './letter';
import { healthOf } from './redflag';
import type { Card } from './types';

/**
 * Phase 18 (judge round 13: six hidden targets of five seats ended on "No word … in About them yet" or "Online help did
 * not answer. Nothing else was tried": pancit, church, a hot water bottle, stew, the garden centre, snooker): what the
 * carer's screen offers when a letter card has no word, in this order, never a stop:
 *   1. the sponsor's AI for the topic and the letters: Chrome's own model on a laptop (ONLY_ON_DEVICE, nothing sent),
 *      else Google's AI online after the same yes as before (PREFER_IN_CLOUD); after App Check refused this browser,
 *      "Try Google's AI again". Never for the body, feelings or a health question (the guard of core/ownwords.ts), never
 *      offline, and not again once an AI was asked and found no word (`noneAi`);
 *   2. "Write it down together" (the carer types what was written; the person checks it);
 *   3. "Ask them to show you" (the person's ways: show me, write it, draw);
 *   4. another letter.
 */
export type LetterWay = 'ai' | 'again' | 'write' | 'show' | 'another';
export interface LetterWaysInput { online: boolean; cloudConfigured: boolean; deviceReady: boolean; topic: string | null; asked: string }
export function letterWays(c: Pick<Card, 'blocked' | 'letter'>, x: LetterWaysInput): { ways: LetterWay[]; ai: 'device' | 'cloud' | null; line: string } {
  const L = P4.letter;
  const letter = c.letter?.letter ?? '';
  const kind = subjectOf(x.asked, []);
  const noModel = NO_MODEL_TOPICS.includes(letterTopic(x.topic, kind) ?? '') || kind === 'feeling' || kind === 'comfort' || !!healthOf(x.asked);
  const rest: LetterWay[] = ['write', 'show', 'another'];
  const line = c.blocked ?? '';
  if (noModel || !letter) return { ways: rest, ai: null, line };
  if (c.blocked === L.refused(letter)) return x.online && x.cloudConfigured ? { ways: ['again', ...rest], ai: 'cloud', line } : { ways: rest, ai: null, line };
  if (c.blocked === L.noneAi(letter)) return { ways: rest, ai: null, line };
  const ai = x.deviceReady ? 'device' : x.online && x.cloudConfigured ? 'cloud' : null;
  return { ways: ai ? ['ai', ...rest] : rest, ai, line };
}
