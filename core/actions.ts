// Which buttons stand under a card on the partner screen. Pure, so the rule can be tested without a browser:
// whenever a question was split in two, "Next: second question" is there, whatever became of the first part.
// (Simulation 16.11: a first part with no card had no button at all, and the second question could not be reached,
// although the note on the card promised "Next shows the second".)

import { COPY } from './copy';
import type { Card } from './types';

export type PartnerAct = 'show' | 'less' | 'next' | 'recap' | 'stuck' | 'unstuck' | 'override' | 'retry';
export interface PartnerAction { act: PartnerAct; label: string; primary?: boolean }

export function partnerActions(c: Card, ui: { less: boolean; hasAnswers: boolean }): PartnerAction[] {
  const K = COPY.card;
  const out: PartnerAction[] = [];
  const nextLabel = c.pending ? K.nextSecond : c.nextPage ? (c.kind === 'body' ? K.nextWhere : K.nextMore) : '';
  // the second question never depends on the first having a card
  const second: PartnerAction[] = c.pending ? [{ act: 'next', label: K.nextSecond }] : [];
  if (c.kind === 'no-quiz') return [{ act: 'override', label: COPY.memory.override }, ...second];
  if (c.kind === 'repair') return [{ act: 'show', label: K.show, primary: true }, { act: 'unstuck', label: K.unstuck }];
  // cloud help failed and nothing stands in for it: the way out is to ask again (or to just ask, as the card says)
  if (c.blocked) return c.retry ? [{ act: 'retry', label: K.retry, primary: true }, ...second] : second;
  if (ui.less) return [{ act: 'less', label: K.lessOff }, ...second];
  out.push({ act: 'show', label: K.show, primary: true }, { act: 'less', label: K.less });
  if (nextLabel) out.push({ act: 'next', label: nextLabel });
  if (ui.hasAnswers) out.push({ act: 'recap', label: K.recap });
  out.push({ act: 'stuck', label: K.stuck });
  return out;
}
