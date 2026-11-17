// The quick-needs board: a fixed board of everyday needs the person can point to, one tap from the partner screen.
// Toilet, drink, food, pain, tired, too hot, too cold, call someone, and the way out. It is a card like any other
// (the same tick / cross check after a tap, the same partner side), but nothing about it is decided at run time: no
// model, no About me, no request. This module imports the copy and the types and nothing else, so the board cannot
// reach an engine or the network (tests/unit/needs.test.ts checks the imports).
//
// Why a board of eight, when a card holds two or three choices: these are the needs that cannot wait for a question
// to be typed. It is our design choice, not something the sources measured; nobody living with aphasia has used it.

import { COPY } from './copy';
import type { Card, Choice } from './types';

const N = COPY.needs;

/** The partner's next move after the person has confirmed a need with the tick. Never shown on the person's screen. */
export function needLine(label: string): string {
  return N.lines[label] ?? '';
}

export function needsCard(): Card {
  const tile = (label: string, role: Choice['role']): Choice => ({ label, spoken: label, role, picture: { type: 'builtin', id: label } });
  const T = COPY.notes.trace;
  return {
    asked: N.ask, pending: null, topic: N.headline, kind: 'needs',
    choices: [...N.tiles.map((l) => tile(l, 'answer')), tile(N.escape, 'escape')],
    say: N.say, source: 'code', route: { to: 'device', reasons: [] }, cloudPayload: null, notes: [N.note], ms: 0,
    trace: [
      { step: 'private', ran: 'skipped', why: T.notNeeded, used: false },
      { step: 'stripped', ran: 'skipped', why: T.notNeeded, used: false },
      { step: 'code', ran: 'on-device', why: T.codeRan, used: true },
    ],
    why: { proposed: null, decided: COPY.how.why.decidedBy.needs, kept: [], added: [], dropped: [], headline: COPY.how.why.headlineFrom.fixed },
  };
}
