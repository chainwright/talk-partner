// The simple view's own decisions (direction A, 17 Nov 2026), pure so they can be tested without a browser. The
// simple view draws less than the full view and computes nothing about a card: everything here is read from the
// `Card` the pipeline made, the session receipt and the settings. Words come from core/copy.ts (`simple`).

import { COPY } from './copy';
import type { DeviceStatus } from './engine';
import { badgeKind, type BadgeKind } from './receipt';
import type { Card } from './types';

export interface MadeWhere {
  /** Who made the card: the badge's own vocabulary (core/receipt.ts), so the simple line and the badge cannot disagree. */
  maker: BadgeKind;
  /** What left for it: read from the recorded payload, as the receipt does. */
  left: 'nothing' | 'sent' | 'maybe';
  /** The recording of a spoken question went to the cloud before the card was made. */
  spoken: boolean;
  /** The sentences to show, in order. */
  lines: string[];
}

/**
 * "Was this card made on this device or with online help?", in plain words, for the line under every card in the
 * simple view. Two facts, each from the card: who made it (`badgeKind`: the SDK's report for an AI card, the card
 * rules otherwise) and what left for it (`cloudPayload` only when the cloud answered; `cloudAttempted` when a request
 * was handed over and failed, which is never called "nothing sent").
 */
export function madeWhere(c: Card, o: { spoken?: boolean; about: string }): MadeWhere {
  const S = COPY.simple;
  const maker = badgeKind(c);
  const left = c.cloudPayload ? 'sent' : c.cloudAttempted ? 'maybe' : 'nothing';
  const who = maker === 'device' && c.why?.personal?.length ? S.made.devicePersonal(o.about) : S.made[maker];
  const what = left === 'sent' ? S.left.sent(o.about) : left === 'maybe' ? S.left.maybe : S.left.nothing;
  const lines = [who, what];
  if (o.spoken) lines.push(S.left.voice);
  return { maker, left, spoken: !!o.spoken, lines };
}

/**
 * The privacy line at the foot of the first screen and the answered screen, by what has happened this session. It is
 * never a fixed sentence: once a question went to the cloud, may have gone, or was spoken, the line says so.
 */
export function privacyLines(i: { cloudOn: boolean; settingsAsked: boolean; sent: number; maybe: number; clips: number }): string[] {
  const P = COPY.simple.privacy;
  const out: string[] = [];
  if (i.sent) out.push(P.sent(i.sent));
  if (i.maybe) out.push(P.maybe(i.maybe));
  if (i.clips) out.push(P.voice(i.clips));
  if (!out.length) out.push(i.cloudOn ? P.cloudOn : P.none);
  if (i.settingsAsked) out.push(P.settings);
  return out;
}

export interface WhereInput {
  /** This copy has project settings (a copy without them runs the card rules only). */
  configured: boolean;
  device: DeviceStatus | 'checking';
  cloudOn: boolean;
  about: string;
}

/** Where the AI runs, in one line on the first screen: by what this browser has and whether online help is on. */
export function whereLine(i: WhereInput): string {
  const W = COPY.simple.where;
  if (!i.configured) return W.noConfig;
  if (i.device === 'checking') return W.checking;
  if (i.device === 'available') return i.cloudOn ? W.deviceCloudOn(i.about) : W.device(i.about);
  return i.cloudOn ? W.cloudOn(i.about) : W.cloudOff;
}

/** The small line under a ready question: how its card will be made here. `open` is the one open question of the three. */
export function tryNote(open: boolean, i: Omit<WhereInput, 'about'>): string {
  const T = COPY.simple.tryNote;
  if (!open) return T.code;
  if (!i.configured) return T.openNone;
  if (i.device === 'checking') return T.openChecking;
  if (i.device === 'available') return T.openDevice;
  return i.cloudOn ? T.openCloudOn : T.openAsk;
}

/**
 * The consent sheet comes up for a card only when all of this holds: there is no card, cloud help is off, this copy
 * can reach the cloud, and the pipeline recorded what the cloud step would have been sent (`unsentPayload`), which it
 * does only for a question the cloud step could try. So it never comes up for a card made on the device, for a
 * question the rules refuse (a memory test), or on a copy with no project settings.
 */
export function sheetWanted(c: Card | null, i: { cloudOn: boolean; cloudConfigured: boolean }): boolean {
  return !!c && !!c.blocked && !i.cloudOn && i.cloudConfigured && !!c.unsentPayload;
}
