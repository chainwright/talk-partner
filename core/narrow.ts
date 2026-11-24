// "Something else" without a dead end: the narrowing card.
//
// When the person points to the way out ("something else"), the carer is offered one tap that asks an AI for the
// next, broader choices, built from the question and the choices that did not fit ("Would you like tea or coffee?" ->
// something else -> "a cold drink / something to eat / a rest"). At most two levels (NARROW_LEVELS); after that the
// screen says what a therapist would: ask them to show you, or write it down together.
//
// Where it runs (both through Firebase AI Logic, the same two steps as an open question; core/pipeline.ts):
//   - on this device (ONLY_ON_DEVICE, `engine.runDevice`), where the browser has Gemini Nano. This prompt also holds
//     the answers confirmed so far today and the About-me lists: they never leave the device.
//   - else online help (PREFER_IN_CLOUD, `engine.runCloud`), only when the carer has turned it on. That request holds
//     the question and the choices that did not fit, About-me words swapped out (stripQuestion, then the same leak
//     gate), and never the answers so far: what the person chose is personal and stays here.
//   - with neither, there is no narrowing card, and the card says why (and holds the line that would go, so the
//     consent sheet can show it).
// The model only proposes. The same guards as every card decide: a way out is never a choice, nothing that was already
// offered comes back, no invented names, no negative wording, at least two real choices or no card, never a generic
// title. The card is marked (`Card.narrow`) and the screen says in plain words that an AI made this follow-up.
//
// Broader, never more of the same (18 Nov 2026). One recorded run of the cloud model answered "tea or coffee ->
// something else" with water / juice / milk and then hot chocolate / malt drink / herbal tea: three more drinks, twice.
// So (core/kinds.ts): the request says in words that the next choices must be different kinds, not one more thing of
// the kind that did not fit; a proposed choice that is one more thing of the refused subject, or names a kind that was
// refused, is dropped; and when fewer than two choices are left after that, the rules make the card themselves
// ("something cold / something sweet", then "something to eat / a rest / help with something"). Such a card says the
// rules made it and that an AI was asked first (`Card.narrow.by === 'rules'`, source 'code').

import { COPY } from './copy';
import { checkedCloud, type CloudError } from './engine';
import { cloudWasAppCheck, finish, noEscapeOnly, parseModelOutput, type PipelineEnv } from './pipeline';
import { devicePrompt } from './prompt';
import { broader, sameKind, subjectOf } from './kinds';
import { hasNegative, inventedNameFilter, isEscapeLabel, snapToProfile, validTopic } from './rules';
import { findLeaks, hasPlaceholder, restoreNames, stripQuestion } from './strip';
import type { Card, ModelOutput, Source, StepTrace } from './types';

/** Two narrowing steps, then the screen stops offering one. */
export const NARROW_LEVELS = 2;

export interface NarrowInput {
  /** The question that was asked (the card the person left through the way out). */
  asked: string;
  /** Every choice offered so far for it and not taken (this card's, and the ones before it). */
  rejected: string[];
  /** The step this card would be: 1 or 2. */
  level: number;
  /** Answers confirmed so far today, for the on-device step only. */
  sofar: { q: string; label: string }[];
  /** What was learned about the person on this device (core/prefs.ts), as short lines: for the on-device step only, never the cloud text. */
  learned?: string[];
  /**
   * Phase 14: asked from the screen before handing over ("Find more choices", core/findmore.ts), not after the way out:
   * `rejected` holds the choices on the card, and the request says so in those words (FIND_TASK).
   */
  offered?: boolean;
}

const N = COPY.notes;
const W = COPY.how.why;
const T = COPY.notes.trace;
const lc = (s: string) => s.toLowerCase().trim();
const R_BROADER = 'the rules: broader kinds of answer (core/kinds.ts)';
/** A model answer that could not be read: nothing proposed, so the rules make the card. */
const EMPTY_OUTPUT: ModelOutput = { topic: '', kind: 'choice', choices: [] };

/** What a card that was left through the way out hands to the next step: its question, and all that did not fit. */
export function narrowInput(card: Card, sofar: { q: string; label: string }[]): NarrowInput {
  const shown: string[] = [];
  for (let p: Card | null | undefined = card; p; p = p.nextPage) shown.push(...p.choices.filter((c) => c.role === 'answer').map((c) => c.label));
  const rejected = [...(card.narrow?.rejected ?? []), ...shown].filter((x, i, all) => all.findIndex((y) => lc(y) === lc(x)) === i);
  return { asked: card.asked, rejected, level: (card.narrow?.level ?? 0) + 1, sofar };
}

/** True while another narrowing step may follow this card (a choice card, left through its own way out). */
export function canNarrow(card: Card, label: string): boolean {
  return (card.kind === 'choice' || card.kind === 'yesno' || card.kind === 'feeling') && !card.blocked && lc(label) !== 'not sure' && (card.narrow?.level ?? 0) < NARROW_LEVELS;
}

/** The text both steps get: the question, and the choices that did not fit. Nothing the person chose. */
export function narrowAsk(i: Pick<NarrowInput, 'asked' | 'rejected' | 'offered'>): string {
  return `${narrowFacts(i)} ${i.offered ? FIND_TASK : NARROW_TASK}`;
}
/** The part that comes from the conversation (and is stripped of About-me words before the cloud step). */
const narrowFacts = (i: Pick<NarrowInput, 'asked' | 'rejected' | 'offered'>) => `${i.asked}${i.rejected.length ? ` ${i.offered ? 'On the card already' : 'They did not want'}: ${i.rejected.join(', ')}.` : ''}`;
/** The part that is the app's own fixed wording: the same for every question, so it is not put through the name guesser. */
export const NARROW_TASK = 'What else could it be? Do not give more of the same kind as the ones they did not want, and none of those again. Give two or three broader, different kinds of answer: a kind such as "something cold" or "something to eat", not one more single thing.';
/**
 * Phase 14: the fixed task for "Find more choices" on the screen before handing over, where nothing was turned down
 * yet: the choices are only "on the card already". The same guards decide afterwards (narrowChoices).
 */
export const FIND_TASK = 'What else could they want? Do not give more of the same kind as the ones on the card already, and none of those again. Give two or three broader, different kinds of answer: a kind such as "something cold" or "something to eat", not one more single thing.';
/** The part of a narrowing request that comes from the conversation, for the consent sheet: the fixed task cut off. */
export const narrowLine = (text: string) => text.split(` ${NARROW_TASK}`)[0].split(` ${FIND_TASK}`)[0].replace(/^Partner asks:\s*/, '');
/** The on-device step also gets the answers confirmed so far today. This text never goes to the cloud step. */
export function narrowDeviceAsk(i: NarrowInput): string {
  const so = i.sofar.slice(-6).map((a) => `"${a.q}" -> ${a.label}`).join('; ');
  const known = (i.learned ?? []).slice(0, 6).join(' ');
  return `${narrowAsk(i)}${so ? ` Answered earlier today: ${so}.` : ''}${known ? ` Learned on this device over time (hints only): ${known}` : ''}`;
}

/** The guards: what of a model's proposal may stand on a narrowing card. */
export function narrowChoices(raw: string[], i: Pick<NarrowInput, 'asked' | 'rejected'>, env: Pick<PipelineEnv, 'profile'>): { kept: string[]; dropped: { label: string; rule: string }[] } {
  const R = W.rules;
  const dropped: { label: string; rule: string }[] = [];
  const gone = new Set(i.rejected.map(lc));
  const subject = subjectOf(i.asked, i.rejected);
  const kept: string[] = [];
  for (const c0 of raw) {
    const c = snapToProfile(String(c0).replace(/[.!?]+$/, '').trim(), env.profile);
    if (!c) continue;
    const rule = isEscapeLabel(c) ? R.escapeWord
      : gone.has(lc(c)) ? R.repeat
      : kept.some((k) => lc(k) === lc(c)) ? R.repeat
      : sameKind(c, subject, i.rejected) ? R.sameKind
      : hasNegative(c) ? R.negative
      : hasPlaceholder(c) || c.split(/\s+/).length > 4 ? R.filler
      : inventedNameFilter([c], 'Who is it?', env.profile).length === 0 ? R.inventedName
      : '';
    if (rule) dropped.push({ label: c, rule }); else kept.push(c);
  }
  for (const c of kept.slice(3)) dropped.push({ label: c, rule: R.overThree });
  return { kept: kept.slice(0, 3), dropped };
}

/** The narrowing card for `i`, or a card with no choices that says why there is none. Never throws. */
export async function narrowCard(i: NarrowInput, env: PipelineEnv): Promise<Card> {
  const { profile, support, engine } = env;
  const trace: StepTrace[] = [];
  const level = Math.min(i.level, NARROW_LEVELS);
  const base = {
    asked: i.asked, pending: null, topic: '', kind: 'choice' as const, source: 'code' as Source, ms: 0, cloudPayload: null,
    notes: [N.narrow(level, NARROW_LEVELS)], route: { to: 'device' as const, reasons: [i.offered ? 'more choices asked before handing over' : 'narrowing after the way out'] }, narrow: { level, rejected: i.rejected, ...(i.offered ? { offered: true as const } : {}) },
  };
  const none = (blocked: string, extra: Partial<Card> = {}): Card => ({
    ...base, choices: [], say: N.justAsk(i.asked), blocked, trace: done(trace, null),
    why: { proposed: null, decided: W.decidedBy.narrowBlocked, kept: [], added: [], dropped: [], headline: W.headlineFrom.question }, ...extra,
  });
  /** The rules' own broader choices (core/kinds.ts), for when a model was asked and fewer than two of its choices could stand. */
  const ruled = (why: Card['why'], ms: number, extra: Partial<Card>): Card | null => {
    const own = broader(i.asked, i.rejected);
    if (own.length < 2) return null;
    const card = finish({ ...base, source: 'code', ms, topic: '', notes: [...base.notes, N.narrowRules], narrow: { ...base.narrow, by: 'rules' }, ...extra }, own, ['something else'], profile, support, 3);
    card.say = `${N.narrowSay} ${card.choices.map((c) => c.spoken).join(', ').replace(/, ([^,]*)$/, ', or $1')}?`;
    card.why = { proposed: why?.proposed ?? null, decided: W.decidedBy.narrowRules, kept: [], added: own.map((label) => ({ label, from: R_BROADER })), dropped: why?.dropped ?? [], headline: W.headlineFrom.question };
    return { ...card, trace: done(trace, null) };
  };
  const build = (o: ModelOutput, source: Source, ms: number, step: 'private' | 'stripped', extra: Partial<Card>, orRules: boolean): Card => {
    const { kept, dropped } = narrowChoices(o.choices ?? [], i, env);
    // never a generic title, and never one of the choices: the person's screen shows the question itself
    let topic = validTopic(o.topic, kept);
    if (topic && profile.personName && lc(topic).includes(lc(profile.personName))) topic = '';
    const card = finish({ ...base, source, ms, topic, route: { to: source === 'in-cloud' ? 'cloud' : 'device', reasons: base.route.reasons }, ...extra }, kept, ['something else'], profile, support, 3);
    card.say = `${N.narrowSay} ${card.choices.map((c) => c.spoken).join(', ').replace(/, ([^,]*)$/, ', or $1')}?`;
    card.why = { proposed: { step, topic: o.topic, kind: o.kind, choices: o.choices ?? [], options: o.options ?? [] }, decided: W.decidedBy.narrow, kept, added: [], dropped, headline: topic ? W.headlineFrom.model : W.headlineFrom.question };
    const checked = noEscapeOnly(card);
    if (!checked.blocked) return { ...checked, trace: done(trace, step) };
    // fewer than two real choices were left (more of the same kind, or nothing usable): the rules make the card
    const own = orRules ? ruled(card.why, ms, extra) : null;
    return own ?? { ...checked, blocked: N.narrowNone, trace: done(trace, null), why: { ...card.why, decided: W.decidedBy.narrowBlocked } };
  };

  // 1. on this device, where the browser has the model: the prompt holds About me and the answers so far
  let onDevice: { why: Card['why']; ms: number } | null = null;
  if (env.deviceReady) {
    try {
      const r = await engine.runDevice(devicePrompt(narrowDeviceAsk(i), profile));
      trace.push({ step: 'private', ran: r.source, why: T.narrowDevice, ms: r.ms, used: false });
      // an answer that cannot be read proposes nothing; online help is tried next when it is on, else the rules
      const card = build(parseModelOutput(r.text) ?? EMPTY_OUTPUT, r.source, r.ms, 'private', {}, false);
      if (!card.blocked) return card;
      onDevice = { why: card.why, ms: r.ms };
    } catch (e) {
      trace.push({ step: 'private', ran: 'failed', why: (e as Error).message, used: false });
    }
  } else {
    trace.push({ step: 'private', ran: 'skipped', why: T.deviceNotReady, used: false });
  }
  /** Online help cannot be asked: the rules stand in when the on-device model was asked and gave nothing usable. */
  const stop = (blocked: string, extra: Partial<Card> = {}): Card => (onDevice && ruled(onDevice.why, onDevice.ms, {})) || none(blocked, extra);

  // 2. online help, only when it is on: the question and what did not fit, About-me words swapped out
  const facts = stripQuestion(narrowFacts(i), profile);
  const stripped = { ...facts, text: `${facts.text} ${i.offered ? FIND_TASK : NARROW_TASK}` };
  const preview = JSON.stringify(engine.cloudRequest(stripped.text), null, 2);
  const swaps = Object.entries(stripped.map).map(([k, v]) => `${v} → ${k}`);
  if (!engine.cloudConfigured) { trace.push({ step: 'stripped', ran: 'skipped', why: T.cloudUnconfigured, used: false }); return stop(N.narrowNeedsAi); }
  if (findLeaks(stripped.text, profile).length) { trace.push({ step: 'stripped', ran: 'skipped', why: T.cloudLeak, used: false }); return stop(N.narrowNone, { notes: [...base.notes, N.leak] }); }
  if (!env.allowCloud) { trace.push({ step: 'stripped', ran: 'skipped', why: T.cloudOff, used: false }); return stop(N.narrowNeedsAi, { unsentPayload: preview, cloudSwaps: swaps }); }
  try {
    const r = await checkedCloud(engine, () => engine.runCloud(stripped.text), env.cloudWaitMs);
    trace.push({ step: 'stripped', ran: r.source, why: r.source === 'in-cloud' ? T.narrowCloud : T.cloudOffline, ms: r.ms, used: false });
    const sent = r.source === 'in-cloud';
    const left: Partial<Card> = { cloudPayload: sent ? preview : null, unsentPayload: sent ? null : preview, ranOffline: !sent, cloudSwaps: swaps };
    const o = parseModelOutput(r.text) ?? { ...EMPTY_OUTPUT };
    o.topic = restoreNames(o.topic, stripped.map).replace(/\b(?:Person|Food|Place|Show|Music|Thing|Name) [A-Z]\b/g, '').trim();
    o.choices = (o.choices ?? []).map((c) => restoreNames(c, stripped.map));
    const card = build(o, r.source, r.ms, 'stripped', left, true);
    return card.blocked ? { ...card, ...left, choices: [] } : card;
  } catch (e) {
    trace.push({ step: 'stripped', ran: 'failed', why: (e as Error).message, used: false });
    // (phase 14) App Check refused this browser first: nothing left, and the screen says so (no sheet again by itself)
    if (cloudWasAppCheck(e) && (e as CloudError).notSent) return none(N.narrowCheckBlocked, { unsentPayload: preview, cloudSwaps: swaps });
    // handed to the SDK, then an error: it may have left, unless the engine knows it did not
    return none(N.narrowFailed, (e as CloudError).notSent ? { unsentPayload: preview, cloudSwaps: swaps } : { cloudAttempted: preview, cloudAttempts: 1, cloudSwaps: swaps, retry: i.asked });
  }
}

/** The trace in the fixed order private, stripped, code, with the step whose answer is on the card marked. */
function done(trace: StepTrace[], used: 'private' | 'stripped' | null): StepTrace[] {
  const by = (s: StepTrace['step']) => trace.find((t) => t.step === s);
  const priv = by('private') ?? { step: 'private' as const, ran: 'skipped' as const, why: T.deviceNotReady, used: false };
  const strip = by('stripped') ?? { step: 'stripped' as const, ran: 'skipped' as const, why: T.cloudNotNeeded, used: false };
  return [{ ...priv, used: used === 'private' }, { ...strip, used: used === 'stripped' }, { step: 'code', ran: 'on-device', why: T.codeRan, used: true }];
}
