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
import { crisisAnswer, crisisWords, healthOf, type HealthKind, type RedPlace } from './redflag';
import { careAnswer, DRINK_FOOD_WORDS } from './reliability';
import { HOW_BAD, WEAK_NUMB, WHERE_HURTS } from './topics';
import type { Card, Profile, SupportLevel } from './types';

export type { OwnFallbackWhy, OwnGuardKind };

const lc = (s: string) => s.toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim();

// a crisis said in the carer's words (core/redflag.ts, crisisWords): never to a model, the safety screen's words instead
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
  if (crisisWords(s) || crisisAnswer(s)) return 'crisis';
  if (RED_WORDS.test(s.replace(/\bfall(?:s|ing)? asleep\b/g, ''))) return 'red';
  // (phase 17, judge round 12: "Is your smile lopsided?", "Are you OK, you look grey", "check your sugar" reached the AI
  // path or a plain card) the health word lists of core/redflag.ts: a warning sign is 'red', any other health matter 'care'
  const h = healthOf(s);
  if (h === 'chest' || h === 'heart' || h === 'stroke' || h === 'fall' || h === 'unwell') return 'red';
  if (h) return 'care';
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
  // (phase 17) a health matter the rules cannot word: a yes / no of the app's own that keeps the health step after it
  const h = kind === 'crisis' ? null : healthOf(s);
  if (h === 'chest') return CHEST_Q;
  if (h === 'heart') return HEART_Q;
  if (h === 'stroke') return WEAK_NUMB;
  if (h === 'fall') return FALL_Q;
  if (h === 'unwell' || h === 'sugar') return UNWELL_Q;
  if (h === 'limb') return WHERE_HURTS;
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
  const health = kind === 'crisis' ? null : healthOf(q);
  const own = { asked: q, guard: kind, ...(health ? { matter: health } : {}) };
  // (phase 18, judge round 13: "I can't go on" typed became the feelings card, and an answer on its second or third page
  // had lost the guard) every page of the card carries what the carer's words were about
  const paged = (c: Card | null | undefined): Card | null => (c ? { ...c, own, nextPage: paged(c.nextPage) } : null);
  return paged(card)!;
}

/** The app's own yes / no questions for a health matter the rules cannot make a card from (never in the trees). */
export const CHEST_Q = 'Do you have chest pain or tightness?';
/** Phase 18: a pain where the heart can be felt (core/redflag.ts, healthOf "heart"), when the rules cannot word the carer's own. */
export const HEART_Q = 'Do you have pain in your jaw, a shoulder, your upper back or your upper stomach?';
export const FALL_Q = 'Did you have a fall?';
export const UNWELL_Q = 'Do you feel unwell?';

/**
 * Phase 17 (judge round 12, health P0s 3 and 4: seats 13b, 01, 05, 02n): what follows an answer to a card the guard made
 * for a health matter. The carer never reads a green tick or a bare "Ask another question" under it: the end line is a
 * red box (`alert`), the call box stays over it for the rest of the conversation (web/src/main.ts, p5.urgent), and the
 * next question goes on to where it hurts or how bad. `red` is the conversation's red flag for "How bad is the pain?"
 * (core/tree.ts): after a chest answer every amount says call now. The worst case of every line is a call not needed.
 *   - chest: any answer but "no" says call now, whatever the amount, even if it has happened before;
 *   - stroke: "yes" says call now and note the time; "no" or "not sure" is checked by the carer (arms and smile);
 *   - limb (a pain in an arm, a leg, a hand, the face): the weakness question first, then how bad;
 *   - fall, unwell, sugar, pain: what to look for and when to call, then where it hurts.
 * `{them}`, `{They}`, `{their}` take the name; `{number}` the number the call buttons use.
 */
export interface OwnStep { next: string[]; end: string; alert: true; red: RedPlace | null; now: boolean }
const yesish = (l: string) => l !== 'no';
export function ownAfter(health: HealthKind, label: string, number: string, name = ''): OwnStep {
  const l = lc(label);
  const no = l === 'no';
  const unsure = l === 'not sure';
  let r: { next: string[]; end: string; red: RedPlace | null; now?: true };
  switch (health) {
    case 'chest':
      r = yesish(l)
        ? { next: [HOW_BAD], end: OWN_END.chest, red: 'chest', now: true }
        : { next: [WHERE_HURTS], end: OWN_END.chestNo, red: null };
      break;
    // (phase 18, judge round 13) the upper stomach, the upper back, the jaw, a shoulder: as the chest, whatever the amount
    case 'heart':
      r = yesish(l)
        ? { next: [HOW_BAD], end: OWN_END.heart, red: 'heart', now: true }
        : { next: [WHERE_HURTS], end: OWN_END.heartNo, red: null };
      break;
    case 'stroke':
      r = no || unsure ? { next: [WHERE_HURTS], end: no ? OWN_END.strokeNo : OWN_END.strokeUnsure, red: 'sign-check' } : { next: [], end: OWN_END.stroke, red: 'sign', now: true };
      break;
    case 'limb':
      r = no ? { next: [WHERE_HURTS], end: OWN_END.painNo, red: null } : { next: [WEAK_NUMB, HOW_BAD], end: OWN_END.limb, red: 'limb' };
      break;
    case 'fall':
      r = no ? { next: [WHERE_HURTS], end: OWN_END.fallNo, red: null } : { next: [WHERE_HURTS], end: OWN_END.fall, red: null };
      break;
    case 'unwell':
      r = { next: [WHERE_HURTS], end: OWN_END.unwell, red: null };
      break;
    case 'sugar':
      r = { next: [UNWELL_Q], end: OWN_END.sugar, red: null };
      break;
    default:
      r = no ? { next: [], end: OWN_END.painNo, red: null } : { next: [WHERE_HURTS, HOW_BAD], end: OWN_END.pain, red: null };
  }
  const n = name.trim();
  const end = r.end.replace(/\{them\}/g, n || 'them').replace(/\{They\}/g, n || 'They').replace(/\{they\}/g, n || 'they').replace(/\{their\}/g, n ? `${n}'s` : 'their').replace(/\{number\}/g, number || 'the emergency number');
  return { next: r.next, end, alert: true, red: r.red, now: !!r.now };
}

/** The end lines of `ownAfter`, word for word (tests/unit/phase17.test.ts reads them). Rules' words, never a model's. */
export const OWN_END = {
  chest: 'Chest pain or tightness, or trouble breathing: call {number} now, whatever the amount, even if it has happened before. Do not wait to see if it passes. Note the time it started.',
  chestNo: '{They} pointed to no. A yes or no can be wrong after a stroke: watch {their} breathing and colour. Any chest pain or tightness, or trouble breathing: call {number} now, whatever the amount.',
  heart: 'Upper stomach, upper back, jaw or shoulder pain can come from the heart: call {number} now, whatever the amount, even if it has happened before. Do not wait to see if it passes. Note the time it started.',
  heartNo: '{They} pointed to no. A yes or no can be wrong after a stroke: watch {their} breathing and colour. Any pain in the chest, the upper stomach, the upper back, the jaw or a shoulder: call {number} now, whatever the amount.',
  stroke: 'This can be a stroke: call {number} now, and note the time it started. Do not wait to see if it passes.',
  strokeNo: '{They} pointed to no. A yes or no can be wrong after a stroke: check it yourself now. Ask {them} to smile and lift both arms. If one side drops, the face droops or the speech is new and slurred, call {number} now.',
  strokeUnsure: '{They} pointed to not sure. Check it yourself now: ask {them} to smile and lift both arms. If one side drops, the face droops or the speech is new and slurred, call {number} now.',
  limb: 'A pain in an arm, a leg, a hand or the face: ask first whether it is suddenly weak or numb. Sudden weakness or numbness: call {number} now.',
  fall: 'A fall: call {number} now if the head was hit, if getting up is not possible, or if there is new pain. Do not lift {them} if it hurts to move.',
  fallNo: '{They} pointed to no. If you saw or heard a fall, go by what you saw: ask where it hurts, and call {number} if the head was hit.',
  unwell: 'Look for signs of being unwell: grey, pale, sweaty, confused, or not {their} usual self. If it is new or sudden, call {number} now. Check the face and arms: ask {them} to smile and lift both arms.',
  sugar: 'Shaking, sweating, confusion or drowsiness: call {number} now. Otherwise go by the plan from {their} doctor or nurse.',
  pain: 'In pain. Ask where it hurts first, then how bad. A pain that is new, sudden or strong: call {number}.',
  painNo: 'No pain, {they} pointed. A yes or no can be wrong after a stroke: watch {their} face and movements, and ask again soon. A pain that is new, sudden or strong: call {number}.',
};

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

/**
 * Phase 18 (judge round 13, a health P0: seats 13b and 01): what follows ANY answer to a card the guard made from a
 * crisis in the carer's own words ("Do you want to die?", "I can't go on" typed, which the rules may turn into "How are
 * you feeling today?"). Never "A good day. Nothing to fix.", never "None of these", never a next question that changes
 * the topic: one red box with what to do (the safety screen's own steps, core/copy12.ts), the crisis box with both call
 * buttons over it (web/src/main.ts), and the safety screen when the phone is given back. A "no" does not end it.
 * `line` is the crisis line the call buttons use (core/redflag.ts, crisisLineFor); when it is only the emergency number
 * itself or none, the line names the doctor or nurse, never a made-up number.
 */
export interface OwnCrisisStep { next: string[]; end: string; alert: true; crisis: true }
export function ownCrisisAfter(label: string, number: string, line: string, name = ''): OwnCrisisStep {
  const l = lc(label);
  const n = name.trim();
  const They = n || 'They';
  const them = n || 'them';
  const call = `If ${n || 'they'} may harm themselves, or have, call ${number || 'the emergency number'} now; otherwise call ${line && line !== number ? line : `${n ? `${n}'s` : 'their'} doctor or nurse`} now, with ${them} beside you.`;
  const first = l === 'no' ? `${They} pointed to no. A "no" does not end it: stay near, and still make the call.`
    : l === 'not sure' ? `Not sure is not a no. Stay with ${them} now.`
    : l === 'yes' || crisisAnswer(l) ? `Take it seriously. Stay with ${them} now.`
    : `${They} pointed to "${label.trim()}". After words like these an answer does not end it: stay near, and still make the call.`;
  return { next: [], end: `${first} ${call} Tell ${n ? `${n}'s` : 'their'} doctor or nurse today.`, alert: true, crisis: true };
}
