// The privacy receipt: per card and per session, what left this computer. Every number is counted on the real
// payload string the pipeline recorded for that card (`Card.cloudPayload`: the request body as this app built it,
// kept only when the SDK reported that the cloud answered), never estimated from the question. A card where nothing
// left counts 0 bytes. The counted text is kept in the receipt so a judge can check the byte count by hand.
//
// Not counted here, and said so in the UI: the SDK's own transport around that body (headers, the App Check token).
// It carries no family data; the copy-truth tests (tests/unit/copy.test.ts) cover what the body may contain.

import { findLeaks } from './strip';
import type { Card, Profile } from './types';

export interface CardReceipt {
  asked: string;
  /** Badge source of the card, or 'blocked' when there was no card. */
  source: 'on-device' | 'in-cloud' | 'code' | 'blocked';
  /** True when the SDK reported that the cloud answered this card's stripped question. */
  left: boolean;
  /** UTF-8 bytes of the request body this app built for the cloud step (0 when nothing left). */
  bodyBytes: number;
  /** UTF-8 bytes of the partner's question inside it, after the About-me swap (0 when nothing left). */
  questionBytes: number;
  /** The exact text the bytes were counted on (compact JSON), or null when nothing left. */
  sentText: string | null;
  /** About-me words swapped for a label before sending: people (names, nicknames, relation words, "Name A") and the rest. */
  namesWithheld: number;
  otherWithheld: number;
  /** Checks run on the sent text itself after the fact: About-me words found in it, and whether any photo bytes are in it. */
  leaksFound: number;
  photoFound: boolean;
  /** The stripped question ran on this computer because the cloud was unreachable: nothing left. */
  offline: boolean;
}

export interface SessionReceipt {
  cards: number;
  cardsLeft: number;
  bodyBytes: number;
  questionBytes: number;
  namesWithheld: number;
  otherWithheld: number;
  leaksFound: number;
  photosFound: number;
  offlineRuns: number;
  perCard: CardReceipt[];
}

export const utf8Bytes = (s: string): number => new TextEncoder().encode(s).length;

const ASKS = 'Partner asks: ';

/** The stripped question inside a recorded payload (the one variable part of the body). */
export function questionInPayload(payloadJson: string): string {
  try {
    const o = JSON.parse(payloadJson);
    const text: unknown = o?.contents?.[0]?.parts?.[0]?.text;
    if (typeof text !== 'string') return '';
    return text.startsWith(ASKS) ? text.slice(ASKS.length) : text;
  } catch {
    return '';
  }
}

/** "Person A ← Jenny" lines -> how many were people (Person / Name labels) and how many other About-me entries. */
export function countSwaps(swaps: string[] | undefined): { names: number; other: number } {
  let names = 0;
  let other = 0;
  for (const s of swaps ?? []) {
    if (/^(?:Person|Name) [A-Z] ←/.test(s)) names++;
    else if (/^(?:Food|Place|Show|Music|Thing) [A-Z] ←/.test(s)) other++;
  }
  return { names, other };
}

export function cardReceipt(card: Card, profile: Profile): CardReceipt {
  const left = !!card.cloudPayload;
  // the body is shown pretty-printed on the partner screen; the bytes are counted on its compact form
  const sentText = left ? JSON.stringify(JSON.parse(card.cloudPayload!)) : null;
  const question = sentText ? questionInPayload(sentText) : '';
  const { names, other } = left ? countSwaps(card.cloudSwaps) : { names: 0, other: 0 };
  return {
    asked: card.asked,
    source: card.blocked ? 'blocked' : card.source,
    left,
    bodyBytes: sentText ? utf8Bytes(sentText) : 0,
    questionBytes: question ? utf8Bytes(question) : 0,
    sentText,
    namesWithheld: names,
    otherWithheld: other,
    leaksFound: sentText ? findLeaks(question, profile).length : 0,
    photoFound: !!sentText && sentText.includes('data:image'),
    offline: !!card.ranOffline,
  };
}

/** Every card made this session, in order; paged cards (body map, override) count once. */
export function sessionReceipt(cards: Card[], profile: Profile): SessionReceipt {
  const perCard = cards.map((c) => cardReceipt(c, profile));
  const sum = (f: (r: CardReceipt) => number) => perCard.reduce((n, r) => n + f(r), 0);
  return {
    cards: perCard.length,
    cardsLeft: perCard.filter((r) => r.left).length,
    bodyBytes: sum((r) => r.bodyBytes),
    questionBytes: sum((r) => r.questionBytes),
    namesWithheld: sum((r) => r.namesWithheld),
    otherWithheld: sum((r) => r.otherWithheld),
    leaksFound: sum((r) => r.leaksFound),
    photosFound: perCard.filter((r) => r.photoFound).length,
    offlineRuns: perCard.filter((r) => r.offline).length,
    perCard,
  };
}
