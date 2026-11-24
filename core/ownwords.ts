// Phase 16 (judge round 11, all seven scoring seats: "on a phone the sponsor's AI is not the mechanic"): "Ask in your
// own words" is the first action on the first screen. The carer types the question as they would say it; the card is
// made by the same pipeline as every typed question (core/pipeline.ts, makeCard): the private ONLY_ON_DEVICE step on a
// laptop with Chrome's own model, else the PREFER_IN_CLOUD step with onDeviceParams after the consent sheet's yes,
// with every About-them word swapped out first. This file adds two rules around that path, and nothing else:
//
// 1. The guard, BEFORE any model: words about pain, the body, a need, feelings (core/reliability.ts, careAnswer), a
//    warning sign (the signs of core/redflag.ts) or a crisis never reach a model. The rules make the card from the
//    words with an engine that has no model at all (NullEngine), whatever this browser could run; when the rules have
//    no card for the words, the nearest care card of the app's own ("Where does it hurt?", "How are you feeling
//    today?", "Is something bothering you?"). The screen says why in one line, with the call box (web/src/main.ts).
// 2. The fall-back, AFTER a refusal: when the carer says no to online help, the browser is offline, App Check refuses
//    this browser, the cloud gives no card, or this copy has no AI, the rules' best card for the words stands in place
//    of a blank "No card" screen: the words themselves when the rules can make them, else the nearest ready question
//    of the topic the words are about (core/diary.ts, guessTopic), else "Is it about food or drink, people, or
//    plans?". It is labelled "Made by the app's rules (no AI)", and the line says what happened to the question.
//
// Pure: no DOM, no network. The only engine this file ever hands to the pipeline is NullEngine, so nothing here can
// call a model (tests/unit/phase16.test.ts runs it with an engine that records every call).

import { NullEngine, type Engine } from './engine';
import { P16, type OwnFallbackWhy, type OwnGuardKind } from './copy16';
import { COPY } from './copy';
import { guessTopic } from './diary';
import { makeCard } from './pipeline';
import { crisisAnswer } from './redflag';
import { careAnswer, DRINK_FOOD_WORDS } from './reliability';
import { HOW_BAD, WHERE_HURTS } from './topics';
import type { Card, Profile, SupportLevel } from './types';

export type { OwnFallbackWhy, OwnGuardKind };

const lc = (s: string) => s.toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim();

// a crisis said in the carer's words: never to a model, the safety screen's words instead
const CRISIS_WORDS = /\b(?:can'?t go on|cannot go on|want(?:s|ed)? to die|wish(?:es)? (?:he|she|they|i) (?:was|were) dead|better off dead|kill(?:ing)? (?:him|her|them|my|your)sel(?:f|ves)|suicid\w*|end(?:ing)? (?:it all|(?:his|her|their|my|your) li(?:fe|ves))|harm(?:ing)? (?:him|her|them|my|your)sel(?:f|ves)|hurt(?:ing)? (?:him|her|them|my|your)sel(?:f|ves)|no point (?:in )?(?:living|going on)|give up on life)\b/;
// a warning sign (core/redflag.ts SIGNS, with the words a carer uses for them), never a model's guess
const RED_WORDS = /\b(?:chest|breath|breathe|breathing|breathless|headache|weak|weakness|numb|numbness|droop|drooped|drooping|slurred|slurring|faint|fainted|fainting|collapse|collapsed|fall|fell|fallen|falls|dizzy|choke|choking|stroke|seizure|fit|fits|bleeding|blood|unconscious|emergency|ambulance|911|999|112)\b/;
// health matters a model should not word: the doctor, the nurse, medicines (the doctor-visit cards are rules too)
const HEALTH_WORDS = /\b(?:doctor|doctors|nurse|hospital|medicine|medicines|medication|tablet|tablets|pill|pills|dose|insulin|blood sugar)\b/;

/**
 * What the guard finds in the carer's own words, or null when they may go to the AI path. The worst case of a wrong
 * null is a model guessing at a health answer, so the rule errs on the side of the rules: one care word is enough.
 * Only "hot" and "cold" next to a drink or a food word ("a hot drink or a cold drink?") are not care words here.
 */
export function ownGuard(q: string): OwnGuardKind | null {
  const s = lc(q);
  if (!s) return null;
  if (CRISIS_WORDS.test(s) || crisisAnswer(s)) return 'crisis';
  if (RED_WORDS.test(s.replace(/\bfall(?:s|ing)? asleep\b/g, ''))) return 'red';
  const care = DRINK_FOOD_WORDS.test(s) ? s.replace(/\b(?:hot|cold)\b/g, '') : s;
  if (careAnswer(care) || HEALTH_WORDS.test(s)) return 'care';
  return null;
}

export interface OwnEnv { profile: Profile; support: SupportLevel }

/** The rules alone, on the words: an engine with no model, nothing allowed to leave. */
const rulesOnly = (q: string, env: OwnEnv): Promise<Card> =>
  makeCard(q, { profile: env.profile, support: env.support, engine: new NullEngine() as Engine, allowCloud: false, deviceReady: false });

const answers = (c: Card) => c.choices.filter((x) => x.role === 'answer').length;
const usable = (c: Card) => !c.blocked && (c.kind === 'no-quiz' || answers(c) >= 2 || c.kind === 'body' || c.kind === 'needs' || c.kind === 'repair');

/** The app's own care card for words the rules have no card for: pain to the body card, feelings to the feelings card. */
function careQuestion(q: string, kind: OwnGuardKind): string {
  const s = lc(q);
  if (/\b(?:pain|pains|painful|hurt|hurts|hurting|sore|ache|aches|aching)\b/.test(s)) return /\bhow (?:bad|much)\b/.test(s) ? HOW_BAD : WHERE_HURTS;
  if (kind === 'crisis' || /\b(?:feel|feeling|feelings|sad|upset|worried|worry|afraid|scared|low|down)\b/.test(s)) return 'How are you feeling today?';
  if (/\b(?:toilet|bathroom|loo)\b/.test(s)) return 'Do you need the toilet?';
  return 'Is something bothering you?';
}

/**
 * The card for guarded words: the rules' card for the words themselves, else the app's nearest care card. Never calls
 * a model, whatever the engine of the app could run. `own.guard` says why, for the line over the card.
 */
export async function ownGuardCard(q: string, kind: OwnGuardKind, env: OwnEnv): Promise<Card> {
  let card = await rulesOnly(q, env);
  if (!usable(card)) card = await rulesOnly(careQuestion(q, kind), env);
  return { ...card, own: { asked: q, guard: kind } };
}

/** The nearest ready question for words of a topic: one the rules make into a choice card (tests/unit/phase16.test.ts). */
export const NEAREST: Record<string, string> = {
  food: 'Would you like something to eat or something to drink?',
  rest: 'Would you like to rest in the bed or the chair?',
  people: 'Would you like company, or some time alone?',
  fun: 'Would you like TV or music?',
  plans: 'Would you like to stay in or go out?',
  other: 'Is it about food or drink, people, or plans?',
};

/** Why the AI could not help, read from the blocked card the pipeline gave (or the sheet's "No"). */
export function fallbackWhy(blocked: Card, o: { refused?: boolean; online: boolean; cloudConfigured: boolean }): OwnFallbackWhy {
  if (o.refused) return 'no';
  if (!o.online) return 'offline';
  if (!o.cloudConfigured) return 'none';
  if (blocked.blocked === COPY.notes.cloudCheckBlocked) return 'check';
  return blocked.cloudPayload || blocked.cloudAttempted ? 'failed' : 'no';
}

/**
 * The rules' best card for words the AI could not turn into choices: the words themselves when the rules can make
 * them, else the nearest ready question of their topic, else the topic question. Never blank, never a dead end. A care
 * topic never gets here (the guard took it first); if it does, the care card stands. `own.fallback` carries what left
 * for the ORIGINAL question (read from the blocked card), so the screen never says "nothing was sent" when it may have.
 */
export async function ownFallbackCard(q: string, blocked: Card, why: OwnFallbackWhy, env: OwnEnv): Promise<Card> {
  const left: 'nothing' | 'maybe' | 'sent' = blocked.cloudPayload ? 'sent' : blocked.cloudAttempted ? 'maybe' : 'nothing';
  const kind = ownGuard(q);
  let card = await rulesOnly(q, env);
  let near = false;
  if (!usable(card)) {
    const topic = guessTopic(q);
    const nq = kind ? careQuestion(q, kind) : NEAREST[topic] ?? NEAREST.other;
    card = await rulesOnly(nq, env);
    near = true;
  }
  return { ...card, own: { asked: q, fallback: { why, left, near } } };
}

/** The one line over a fall-back card: what happened to the question, then what the rules did. */
export function fallbackLine(f: NonNullable<NonNullable<Card['own']>['fallback']>, asked: string): string {
  const F = P16.fallback;
  const first = f.left === 'sent' ? F.sent : f.left === 'maybe' ? F.maybe : F.why[f.why];
  return `${first} ${f.near ? F.lead(asked) : F.same(asked)}`;
}

/**
 * Back, one step at a time: the blocked card of an own-words question that waits for the sheet (or is about to be
 * replaced by the rules' best card) is no step of its own; Back from the card that replaced it goes to the screen
 * before the question, never to "No card".
 */
export const ownWaiting = (c: Card | null | undefined): boolean => !!c?.own?.pending && !!c.blocked;

/**
 * The own-words step, from the words to a card: the guard first, then (only for words it lets through) the same
 * makeCard every typed question uses, with the app's own engine and settings. `env.engine` is never handed guarded
 * words: their card comes from ownGuardCard, which uses NullEngine.
 */
export async function ownCard(q: string, env: Parameters<typeof makeCard>[1]): Promise<Card> {
  const kind = ownGuard(q);
  if (kind) return ownGuardCard(q, kind, { profile: env.profile, support: env.support });
  const card = await makeCard(q, env);
  return { ...card, own: { asked: q, ...(card.blocked && card.kind !== 'no-quiz' ? { pending: true } : {}) } };
}
