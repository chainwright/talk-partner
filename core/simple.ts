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
  const what = left === 'sent' ? (c.narrow ? S.left.sentNarrow(o.about) : S.left.sent(o.about)) : left === 'maybe' ? S.left.maybe : S.left.nothing;
  const lines = [who, what];
  if (o.spoken) lines.push(S.left.voice);
  return { maker, left, spoken: !!o.spoken, lines };
}

/** Phase 8: the routing chip of a card an AI made (where the SDK ran it, and why); null for a card of the rules. */
export interface RouteChip { where: 'device' | 'cloud'; text: string; why: string }
export function routeChip(c: Card | null | undefined, about: string): RouteChip | null {
  if (!c) return null;
  const R = COPY.simple.route;
  const k = badgeKind(c);
  if (k === 'device') return { where: 'device', text: R.device, why: c.why?.personal?.length ? R.whyPersonal(about) : R.whyDevice };
  if (k === 'offline') return { where: 'device', text: R.device, why: R.whyOffline };
  if (k === 'cloud') {
    const priv = c.trace?.find((t) => t.step === 'private');
    return { where: 'cloud', text: R.cloud, why: priv && (priv.ran === 'on-device' || priv.ran === 'failed') ? R.whyNoCard : R.whyNoDevice };
  }
  return null;
}

/**
 * The privacy line at the foot of the first screen and the answered screen, by what has happened this session. It is
 * never a fixed sentence: once a question went to the cloud, may have gone, or was spoken, the line says so.
 */
export function privacyLines(i: { cloudOn: boolean; settingsAsked: boolean; sent: number; maybe: number; clips: number; /** Phase 12: waits for online help the carer stopped (the question may have gone). */ stopped?: number }): string[] {
  const P = COPY.simple.privacy;
  const out: string[] = [];
  if (i.sent) out.push(P.sent(i.sent));
  if (i.maybe) out.push(P.maybe(i.maybe));
  if (i.stopped) out.push(P.stopped(i.stopped));
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
  /** The browser reports a connection. Without one, online help cannot be reached. */
  online: boolean;
}

/** Where a typed open question would get its choices here: the AI in this browser, online help, or nowhere. */
export type AiPlace = 'device' | 'cloudOn' | 'ask' | 'offline' | 'none' | 'checking';
export function aiPlace(i: WhereInput): AiPlace {
  if (!i.configured) return 'none';
  if (i.device === 'checking') return 'checking';
  if (i.device === 'available') return 'device';
  if (!i.online) return 'offline';
  return i.cloudOn ? 'cloudOn' : 'ask';
}

/**
 * The plain AI line of the first screen: what the AI is for, then where it runs on this device. On a phone there is no
 * AI in the browser (Chrome's built-in model is desktop only), so the second sentence there says "online", and that
 * the app asks first. Nothing is said about this device before its capability check has answered.
 */
export function aiLines(i: WhereInput): string[] {
  const A = COPY.simple.ai;
  const place = aiPlace(i);
  if (place === 'none') return [A.none];
  if (place === 'checking') return [A.line];
  return [A.line, A[place]];
}

/** The tag on the one open question in the topics: "needs internet", or that the AI is on this device. */
export function aiTag(i: WhereInput): string {
  const T = COPY.simple.aiTag;
  const place = aiPlace(i);
  return place === 'device' ? T.device : place === 'offline' ? T.offline : place === 'none' ? T.none : place === 'checking' ? T.checking : T.net;
}

/** Phase 9: the tag on Home's sample open question, by where its AI would run here; null when this copy has no AI. */
export function tryAiTag(i: WhereInput): string | null {
  const place = aiPlace(i);
  return place === 'none' ? null : COPY.simple.tryAi.tag[place];
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

/**
 * A question that needs online help, asked with no connection: the screen says "needs the internet" instead of
 * offering a sheet that could not send anything. True when online help could have made this card (it was wanted, or
 * it was on and the request never left), and the browser reports no connection.
 */
export function needsInternet(c: Card | null, i: { online: boolean; cloudConfigured: boolean }): boolean {
  return !!c && !!c.blocked && c.kind !== 'no-quiz' && !i.online && i.cloudConfigured && (!!c.unsentPayload || !!c.retry);
}
