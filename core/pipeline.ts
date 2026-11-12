// The card pipeline. The model proposes topic + kind + <=3 choices; code decides everything else.
// Privacy boundary: devicePrompt() (with the profile) only goes to engine.runDevice (ONLY_ON_DEVICE).
// engine.runCloud only ever receives stripQuestion(...).text.
// "Why this card" (Card.why) is written here, on the values the rules worked on, as they are worked on.

import { COPY } from './copy';
import type { Engine } from './engine';
import { pictureFor } from './pictures';
import { cloudPrompt, devicePrompt } from './prompt';
import {
  BODY_DETAIL, BODY_REGIONS, FEELING_SCALES, PAIN_LEVELS, choiceCap, codePair, dropBoth, dropGenericWhere, escapeFor, feelingSubtype, figures, fitFilter, hasNegative,
  heuristicTopic, householdFilter, isQuiz, offersOptions, orHeadline, questionType, quizRephrase, validateOptions, validTopic, inventedNameFilter, isAuxYesNo, isBodyWhere, isFeelingQuestion, isOrNot, isPainLevel, isPartnerName,
  madeUpVariants, orPair, overlapFilter, recognitionPool, route, scaleLevel, snapToProfile, sourceFill, spokenLine, splitQuestion, stripVocative, timeScaleFilter,
} from './rules';
import { findLeaks, hasPlaceholder, restoreNames, stripQuestion } from './strip';
import type { BodyRegion, Card, CardWhy, Choice, ModelOutput, Profile, Source, StepTrace, SupportLevel } from './types';

const N = COPY.notes;
const T = COPY.notes.trace;
const W = COPY.how.why;

const WH_START = /^\s*(?:what|where|who|whom|when|which|why|how)\b/i;

export function parseModelOutput(text: string): ModelOutput | null {
  try {
    const m = text.match(/\{[\s\S]*\}/);
    const o = JSON.parse(m ? m[0] : text);
    if (!o || typeof o !== 'object') return null;
    const kind = ['feeling', 'yesno', 'choice'].includes(o.kind) ? o.kind : 'choice';
    const choices = Array.isArray(o.choices) ? o.choices.filter((c: unknown) => typeof c === 'string') : [];
    const options = Array.isArray(o.options) ? o.options.filter((c: unknown) => typeof c === 'string') : [];
    return { topic: typeof o.topic === 'string' ? o.topic : '', kind, choices, options };
  } catch {
    return null;
  }
}

/** Questions where code alone fixes the choices (the model only adds a topic). */
export function codeDetermined(q: string, profile?: Profile): boolean {
  return isQuiz(q) || isPainLevel(q) || isBodyWhere(q) || !!codePair(q, profile) || isAuxYesNo(q) || isOrNot(q) || isFeelingQuestion(q);
}

function toChoices(answers: string[], escapes: string[], profile: Profile): Choice[] {
  const mk = (label: string, role: Choice['role']): Choice => {
    const isMe = role === 'answer' && isPartnerName(label, profile);
    // Rule 7: never the partner's own name on the card. The person points at "you"; the partner reads "me".
    const shown = isMe ? label.replace(new RegExp(`\\b${profile.partnerName}\\b`, 'i'), 'you') : label;
    const spoken = isMe ? label.replace(new RegExp(`\\b${profile.partnerName}\\b`, 'i'), 'me') : label;
    return { label: shown, spoken, role, picture: pictureFor(isMe ? 'you' : label, profile) };
  };
  return [...answers.map((a) => mk(a, 'answer')), ...escapes.map((e) => mk(e, 'escape'))];
}

/** KB §7 rule 5: up to 3 choices at "mild", 2 at "more" and "most"; always exactly one escape. Numbers as figures (§2.9). */
function finish(base: Omit<Card, 'choices' | 'say'>, answers: string[], escapes: string[], profile: Profile, support: SupportLevel): Card {
  const when = questionType(base.asked) === 'when';
  const choices = toChoices(answers.slice(0, choiceCap(support)).map((a) => figures(a, when)), escapes.slice(0, 1), profile);
  return { ...base, choices, say: spokenLine(base.asked, choices.map((c) => c.spoken)) };
}

/**
 * A fixed list longer than the support level allows (the body map) is shown a few at a time:
 * the escape on one page ("somewhere else") leads to the next page; the last page's escape is the real one.
 */
function paged(base: Omit<Card, 'choices' | 'say'>, list: string[], escape: string, profile: Profile, support: SupportLevel): Card {
  const cap = choiceCap(support);
  const pages: string[][] = [];
  for (let i = 0; i < list.length; i += cap) pages.push(list.slice(i, i + cap));
  let next: Card | null = null;
  for (let i = pages.length - 1; i >= 0; i--) {
    const card = finish({ ...base, notes: [...base.notes, ...(pages.length > 1 ? [N.page(i + 1, pages.length, escape)] : [])] }, pages[i], [escape], profile, support);
    card.nextPage = next;
    next = card;
  }
  return next!;
}

/** The "why" record as it is being written: drops and additions in the order they happened. */
interface WhyTrack {
  dropped: CardWhy['dropped'];
  added: CardWhy['added'];
}
const lc = (s: string) => s.toLowerCase();

/**
 * Model or cloud choices -> clean answer list, plus why any were rejected (rules 3, 4, 9, 10 and fit), plus the §2.6 fill.
 * Every choice that leaves the list is written to `why.dropped` with the rule that removed it, at the moment it is removed;
 * every choice code puts in is written to `why.added` with where it came from.
 */
function cleanChoices(asked: string, topic: string, raw: string[], profile: Profile, support: SupportLevel, why: WhyTrack): { answers: string[]; rejected: string[]; filled: string | null } {
  const R = W.rules;
  const rejected: string[] = [];
  const drop = (label: string, rule: string) => why.dropped.push({ label, rule });
  /** Labels in `before` that are not in `after` (by count, so a dropped duplicate is recorded too). */
  const diff = (before: string[], after: string[], rule: string) => {
    const left = [...after];
    for (const b of before) {
      const i = left.findIndex((a) => lc(a) === lc(b));
      if (i >= 0) left.splice(i, 1); else drop(b, rule);
    }
  };
  let answers = raw.map((c) => snapToProfile(c.replace(/[.!?]+$/, '').trim(), profile)).filter(Boolean);
  let next = answers.filter((c) => lc(c) !== lc(topic));
  diff(answers, next, R.sameAsTopic); answers = next;
  const seen = new Set<string>();
  next = answers.filter((c) => !seen.has(lc(c)) && !!seen.add(lc(c)));
  diff(answers, next, R.repeat); answers = next;
  const negs = answers.filter(hasNegative);
  next = answers.filter((c) => !hasNegative(c));
  diff(answers, next, R.negative); answers = next;
  const unrestored = answers.filter(hasPlaceholder);
  if (unrestored.length) rejected.push('made-up options');
  next = answers.filter((c) => !hasPlaceholder(c));
  diff(answers, next, R.madeUpLabel); answers = next;
  next = dropBoth(answers, asked); diff(answers, next, R.both); answers = next;
  next = timeScaleFilter(answers); diff(answers, next, R.timeScale); answers = next;
  next = householdFilter(answers, asked, profile);
  diff(answers, next, R.household);
  // a generic "someone" replaced by a named person who does not live here is an addition from About me
  for (const a of next) if (!answers.some((b) => lc(b) === lc(a))) why.added.push({ label: a, from: 'people from About me' });
  answers = next;
  const named = inventedNameFilter(answers, asked, profile);
  if (named.length < answers.length) rejected.push('made-up options');
  diff(answers, named, R.inventedName); answers = named;
  const fit = fitFilter(answers, asked, profile);
  if (fit.dropped.length) rejected.push("a choice didn't fit the question");
  for (const d of fit.dropped) drop(d, R.fit);
  answers = fit.kept;
  if (madeUpVariants(answers, asked, profile)) {
    // invented details of the person's own things: none of these can be offered
    rejected.push('made-up options');
    for (const a of answers) drop(a, R.madeUpVariant);
    answers = [];
  }
  next = overlapFilter(answers, profile); diff(answers, next, R.overlap); answers = next;
  next = answers.slice(0, 3); diff(answers, next, R.overThree); answers = next;
  // §2.6: a generic "stay home / go out" is not a place when About me has places to offer instead
  const placed = dropGenericWhere(answers, asked, profile);
  const droppedGeneric = placed.length < answers.length;
  diff(answers, placed, R.genericWhere);
  answers = placed;
  if (negs.length && answers.length < 2) rejected.push('negative wording');
  // §2.6: fewer than two answers -> fill from the About-me list of the same kind, or the fixed set for the question type
  let filled: string | null = null;
  if (answers.length < 2 || droppedGeneric) {
    const f = sourceFill(answers, asked, profile, choiceCap(support));
    if (f) {
      for (const a of f.answers) if (!answers.some((b) => lc(b) === lc(a))) why.added.push({ label: a, from: f.source });
      answers = f.answers;
      filled = f.source;
    }
  }
  if (droppedGeneric && !filled) rejected.push("a choice didn't fit the question");
  return { answers, rejected: [...new Set(rejected)], filled };
}

/** The proposal as the rules saw it, for the "why" record. */
function proposal(o: ModelOutput | null, step: 'private' | 'stripped'): CardWhy['proposed'] {
  return o ? { step, topic: o.topic, kind: o.kind, choices: [...o.choices], options: [...(o.options ?? [])] } : null;
}

/** The finished "why": kept = the card's answers that code did not add. */
function whyFor(card: Card, proposed: CardWhy['proposed'], decided: string, headline: string, track: WhyTrack): CardWhy {
  const addedLabels = new Set(track.added.map((a) => lc(a.label)));
  const kept = proposed ? card.choices.filter((c) => c.role === 'answer' && !addedLabels.has(lc(c.label)) && !addedLabels.has(lc(c.spoken))).map((c) => c.label) : [];
  return { proposed, decided, kept, added: track.added, dropped: track.dropped, headline };
}

/** A fixed card (yes/no, feeling, pain, body, memory): nothing the model proposed is on it. */
function fixedWhy(o: ModelOutput | null, step: 'private' | 'stripped', decided: string, headline: string): CardWhy {
  const dropped = (o?.choices ?? []).map((label) => ({ label, rule: W.rules.fixed }));
  return { proposed: proposal(o, step), decided, kept: [], added: [], dropped, headline };
}

/**
 * Pure assembly: from the question and (optionally) the model's output to a finished card.
 * Applies rules 2-5 and 7-11. Exported for unit tests.
 * `meta.step` names the step that produced `o` (default: private); `meta.pairFrom` says whether `pairIn` came from
 * the model's copied options or from the code parser (default: model when `o` is present, else code).
 */
export function assemble(
  asked: string, pending: string | null, o: ModelOutput | null, profile: Profile, support: SupportLevel,
  source: Source, ms = 0, pairIn: [string, string] | null = null, useRules = true,
  meta: { step?: 'private' | 'stripped'; pairFrom?: 'model' | 'code' } = {},
): Card {
  const step = meta.step ?? 'private';
  // §2.16: the model's topic is a headline only when it names an idea (not one function word, not a placeholder,
  // not one of its own choices: then the topic is wrong, not the choice)
  let topic = validTopic(o?.topic);
  if (topic && (o?.choices ?? []).some((c) => lc(c) === lc(topic))) topic = '';
  let headlineFrom: string = topic ? W.headlineFrom.model : W.headlineFrom.question;
  topic ||= heuristicTopic(asked, profile);
  const base = { asked, pending, topic, source, ms, cloudPayload: null, notes: [] as string[], route: { to: 'device' as const, reasons: [] as string[] } };

  if (isQuiz(asked)) {
    // KB §7 rule 9: never a quiz. No card; the partner gets a statement to say instead. No rule number on screen (§2.10).
    const card: Card = {
      ...base, source: 'code', kind: 'no-quiz', choices: [],
      say: `${N.tellPrefix}${quizRephrase(asked, profile.partnerName, new Date(), profile)}`,
      blocked: N.memoryBlocked,
    };
    card.why = fixedWhy(o, step, W.decidedBy.quiz, W.headlineFrom.question);
    return card;
  }
  if (isPainLevel(asked)) {
    const card = finish({ ...base, source: 'code', topic: validTopic(o?.topic) || 'pain', kind: 'pain' }, [...PAIN_LEVELS[scaleLevel(support)]], [escapeFor(asked)], profile, support);
    card.why = fixedWhy(o, step, W.decidedBy.pain, validTopic(o?.topic) ? W.headlineFrom.model : W.headlineFrom.fixed);
    return card;
  }
  if (isBodyWhere(asked)) {
    const card = paged({ ...base, source: 'code', topic: 'where it hurts', kind: 'body', bodyStep: 1 }, [...BODY_REGIONS], 'somewhere else', profile, support);
    for (let c: Card | null | undefined = card; c; c = c.nextPage) c.why = fixedWhy(o, step, W.decidedBy.body, W.headlineFrom.fixed);
    return card;
  }

  // either-or options: from the on-device model when it passed validation, else the code parser (same label check)
  const pair: [string, string] | null = pairIn ?? (useRules ? codePair(asked, profile) : null);
  const pairFrom = meta.pairFrom ?? (pairIn && o ? 'model' : 'code');
  let kind: Card['kind'] = o?.kind ?? 'choice';
  if (isAuxYesNo(asked) || isOrNot(asked)) kind = 'yesno';
  // a question that offers options ("..., or would you rather ...?") is never a plain yes / no card
  if (kind === 'yesno' && offersOptions(asked) && !isOrNot(asked)) kind = 'choice';
  // §2.4: yes / no is for a single proposal only; a wh-question is never yes / no whatever the model says
  if (kind === 'yesno' && WH_START.test(stripVocative(asked))) kind = 'choice';
  if (isFeelingQuestion(asked)) kind = 'feeling';
  else if (kind === 'feeling') kind = 'choice';
  if (pair) kind = 'choice';

  // §2.18: a code-determined card is identical in every engine state, so its headline comes from the question, not the
  // model, and its badge says "No AI needed" even when a model ran: nothing of the model's answer is on the card
  if (kind === 'yesno') {
    const card = finish({ ...base, source: 'code', topic: heuristicTopic(asked, profile), kind }, ['yes', 'no'], ['not sure'], profile, support);
    card.why = fixedWhy(o, step, W.decidedBy.yesno, W.headlineFrom.question);
    return card;
  }
  if (kind === 'feeling') {
    const subtype = feelingSubtype(asked, profile);
    const card = finish({ ...base, source: 'code', topic: heuristicTopic(asked, profile), kind, subtype }, [...FEELING_SCALES[subtype][scaleLevel(support)]], ['something else'], profile, support);
    card.why = fixedWhy(o, step, W.decidedBy.feeling, W.headlineFrom.question);
    return card;
  }

  const track: WhyTrack = { dropped: [], added: [] };
  let answers: string[];
  let rejected: string[] = [];
  let filled: string | null = null;
  let headline = topic;
  let decided: string;
  if (pair) {
    answers = [...pair]; // rule 3: exactly the two options the partner offered
    headline = orHeadline(asked, pair, profile, o?.topic); // §2.5: the shared topic, never one of the options
    headlineFrom = W.headlineFrom.pair;
    decided = pairFrom === 'model' ? W.decidedBy.pairModel : W.decidedBy.pairCode;
    if (o) {
      // the model's own options that failed the check, and its loose choices: neither is on an either-or card
      if (pairFrom === 'code') for (const x of o.options ?? []) track.dropped.push({ label: x, rule: W.rules.optionsFailed });
      for (const c of o.choices) if (!pair.some((p) => lc(p) === lc(c))) track.dropped.push({ label: c, rule: W.rules.orOnly });
    }
  } else {
    decided = W.decidedBy.open;
    ({ answers, rejected, filled } = cleanChoices(asked, topic, o?.choices ?? [], profile, support, track));
    // §2.16: the headline is never one of the options (a filled answer may coincide with the model's topic)
    if (answers.some((a) => lc(a) === lc(headline))) {
      headline = heuristicTopic(asked, profile);
      headlineFrom = W.headlineFrom.question;
      if (answers.some((a) => lc(a) === lc(headline))) headline = 'choices';
    }
    // the support level's limit (the same cut finish() makes), recorded here so the why says which choice it took
    for (const a of answers.slice(choiceCap(support))) track.dropped.push({ label: a, rule: W.rules.overCap });
  }
  const r = route('choice', asked, answers, !!pair);
  if (!pair && offersOptions(asked)) rejected.push('either-or options not found');
  if (!pair) for (const why of rejected) if (!r.reasons.includes(why)) r.reasons.push(why);
  if (r.reasons.length) r.to = 'cloud';
  const notes = [...base.notes];
  if (filled && answers.length >= 2) {
    // §2.6: the card was completed from About me or the fixed set; the cloud (which has neither) can't do better
    notes.push(N.completedFrom(filled));
    r.to = 'device';
    r.reasons = [];
  }
  const card = finish({ ...base, notes, topic: headline, kind: 'choice', route: r }, answers, [escapeFor(asked, answers, profile)], profile, support);
  card.why = whyFor(card, proposal(o, step), decided, headlineFrom, track);
  return card;
}

/**
 * Step 2 of the body map: narrow the region the person pointed at. "Left" is always the person's own left: the
 * figure faces the viewer, so the label on the card says "your left arm" (§2.11).
 */
export function bodyDetailCard(region: BodyRegion, profile: Profile, support: SupportLevel = 'more'): Card {
  const asked = `Where in the ${region}?`;
  const base = { asked, pending: null, topic: region, kind: 'body' as const, bodyStep: 2 as const, region, source: 'code' as const, ms: 0, cloudPayload: null, notes: [], route: { to: 'device' as const, reasons: [] } };
  const labels = BODY_DETAIL[region].map((d) => (/^(?:left|right)\b/.test(d) ? `your ${d}` : d));
  const card = paged(base, labels, 'somewhere else', profile, support);
  for (let c: Card | null | undefined = card; c; c = c.nextPage) {
    c.trace = codeOnlyTrace();
    c.why = fixedWhy(null, 'private', W.decidedBy.body, W.headlineFrom.fixed);
  }
  return card;
}

/** The trace of a card that needed no model at all. */
function codeOnlyTrace(): StepTrace[] {
  return [
    { step: 'private', ran: 'skipped', why: T.notNeeded, used: false },
    { step: 'stripped', ran: 'skipped', why: T.notNeeded, used: false },
    { step: 'code', ran: 'on-device', why: T.codeRan, used: true },
  ];
}

/**
 * The "we're stuck" repair card (SCA "get the message out"): three ways for the person to get the message across
 * (show me, write it, draw) and two ways to leave it for now (later, change topic). Fixed, never a model, never an
 * answer: its tiles have the role 'repair', so a tap never enters the recap. The partner line is built in code.
 */
export function repairCard(profile: Profile): Card {
  const R = COPY.repair;
  const tiles = [R.tiles.showMe, R.tiles.writeIt, R.tiles.draw, R.tiles.later, R.tiles.changeTopic];
  const choices: Choice[] = tiles.map((label) => ({ label, spoken: label, role: 'repair', picture: pictureFor(label, profile) }));
  const card: Card = {
    asked: R.ask, pending: null, topic: R.headline, kind: 'repair', choices, say: spokenLine(R.ask, tiles), source: 'code',
    route: { to: 'device', reasons: [] }, cloudPayload: null, notes: [R.note], ms: 0, trace: codeOnlyTrace(),
  };
  card.why = { proposed: null, decided: W.decidedBy.repair, kept: [], added: [], dropped: [], headline: W.headlineFrom.fixed };
  return card;
}

/**
 * §2.10 override: the partner really doesn't know the answer to a memory question and asks for a card anyway.
 * The card is a recognition card from About-me items of the right kind only (people, places, pets); it never
 * invents distractors. When About me has nothing of that kind, the card is blocked: just ask normally.
 */
export function quizOverrideCard(asked: string, profile: Profile, support: SupportLevel): Card {
  const [q] = splitQuestion(asked);
  const why: CardWhy = { proposed: null, decided: W.decidedBy.recognition, kept: [], added: [], dropped: [], headline: W.headlineFrom.question };
  const base = { asked: q, pending: null, topic: heuristicTopic(q, profile), kind: 'choice' as const, source: 'code' as const, ms: 0, cloudPayload: null, notes: [N.recognition], route: { to: 'device' as const, reasons: [] }, trace: codeOnlyTrace(), why };
  const pool = recognitionPool(q, profile);
  const items = (pool?.items ?? []).map((i) => i.replace(/^the\s+/i, '')).filter((i, k, all) => i && all.indexOf(i) === k);
  if (items.length < 2) {
    return { ...base, notes: [], choices: [], say: N.justAsk(q), blocked: COPY.memory.overrideNone, why: { ...why, decided: W.decidedBy.blocked } };
  }
  why.added = items.map((label) => ({ label, from: pool!.source }));
  const escape = pool!.source.startsWith('people') ? 'someone else' : pool!.source.startsWith('places') ? 'somewhere else' : 'something else';
  const first = finish({ ...base, notes: [...base.notes, N.completedFrom(pool!.source)] }, items, [escape], profile, support);
  if (items.length <= choiceCap(support)) return first;
  // more items than the level allows: page them, like the body map
  return paged({ ...base, notes: [...base.notes, N.completedFrom(pool!.source)] }, items, escape, profile, support);
}

export interface PipelineEnv {
  profile: Profile;
  support: SupportLevel;
  engine: Engine;
  /** Partner has switched the cloud step on (it only ever gets the stripped question). */
  allowCloud: boolean;
  /** On-device model reported "available". */
  deviceReady: boolean;
}

/** Full flow for one partner question. */
export async function makeCard(input: string, env: PipelineEnv): Promise<Card> {
  const trace: StepTrace[] = [];
  const card = noEscapeOnly(await makeCardInner(input, env, trace));
  // §2.13: a blocked card is never shown to the person, so it carries no choices (not even an escape)
  const out: Card = { ...(card.blocked ? { ...card, choices: [] } : card), trace: finishTrace(trace, card) };
  const coach = coachFor(out);
  return coach ? { ...out, coach } : out;
}

/**
 * The coaching line: only where a rule detected something about the question itself. Two questions in one (rule 1),
 * a memory test (rule 9), or options the screen cannot know ("which jumper": hold two up).
 */
function coachFor(card: Card): string | undefined {
  if (card.kind === 'no-quiz') return COPY.coach.test;
  if (card.pending) return COPY.coach.twoQuestions;
  if (card.notes.includes(N.holdUpTwo)) return COPY.coach.holdUp;
  return undefined;
}

/** A choice card left with fewer than two answers is not shown (an escape alone can't be answered): just ask normally. */
function noEscapeOnly(card: Card): Card {
  if (card.kind !== 'choice' || card.blocked || card.choices.filter((c) => c.role === 'answer').length >= 2) return card;
  const why = card.why ? { ...card.why, decided: W.decidedBy.blocked } : undefined;
  return { ...card, choices: [], say: N.justAsk(card.asked), blocked: N.noChoicesBlocked, why };
}

/**
 * The trace in a fixed order (private, stripped, code), with "used" set from the card's final source. Steps the
 * pipeline never reached are recorded as skipped with the reason, so a judge sees every step on every card.
 */
function finishTrace(trace: StepTrace[], card: Card): StepTrace[] {
  const byStep = new Map(trace.map((t) => [t.step, t]));
  const priv = byStep.get('private') ?? { step: 'private' as const, ran: 'skipped' as const, why: T.notNeeded, used: false };
  const strip = byStep.get('stripped') ?? { step: 'stripped' as const, ran: 'skipped' as const, why: T.cloudNotNeeded, used: false };
  const code: StepTrace = { step: 'code', ran: 'on-device', why: T.codeRan, used: true };
  // the step whose answer the person sees: the stripped leg when the cloud (or its offline fall-back) answered,
  // the private leg when the device card was kept, neither when code decided alone or the card is blocked
  const stripUsed = !card.blocked && (card.source === 'in-cloud' || !!card.ranOffline);
  const privUsed = !card.blocked && card.source === 'on-device' && !card.ranOffline && priv.ran === 'on-device';
  return [{ ...priv, used: privUsed }, { ...strip, used: stripUsed }, code];
}

async function makeCardInner(input: string, env: PipelineEnv, trace: StepTrace[]): Promise<Card> {
  const [asked, pending] = splitQuestion(input);
  const { profile, support, engine } = env;
  const fixed = codeDetermined(asked, profile);

  let o: ModelOutput | null = null;
  let source: Source = 'code';
  let ms = 0;
  const notes: string[] = [];
  if (pending) notes.push(N.twoQuestions);

  if (isQuiz(asked)) return { ...assemble(asked, pending, null, profile, support, 'code'), notes };
  if (!isPainLevel(asked) && !isBodyWhere(asked)) {
    if (env.deviceReady) {
      try {
        const r = await engine.runDevice(devicePrompt(asked, profile));
        o = parseModelOutput(r.text);
        source = r.source;
        ms = r.ms;
        // the engine throws unless the SDK reported on-device, so this is a report, not an assumption
        trace.push({ step: 'private', ran: r.source, why: T.deviceGot, ms: r.ms, used: false });
      } catch (e) {
        notes.push(N.deviceFailed((e as Error).message));
        trace.push({ step: 'private', ran: 'failed', why: (e as Error).message, used: false });
      }
    } else {
      trace.push({ step: 'private', ran: 'skipped', why: T.deviceNotReady, used: false });
    }
  }
  // Either-or: two independent candidates, the model's copied options and the code parser's pair. The first one that
  // passes the label check wins (model first). A valid code pair is never thrown away because a model ran
  // (REBUILD_SPEC §1.4 step 3: the "coffee or tea" bug). Only when neither passes does the card go to the cloud.
  let devicePair: [string, string] | null = null;
  let pairFrom: 'model' | 'code' = 'code';
  let useRules = !o;
  if (o && offersOptions(asked)) {
    devicePair = validateOptions(o.options ?? [], asked, profile);
    if (devicePair) {
      pairFrom = 'model';
      notes.push(N.optionsCopied);
    } else {
      // the same pair the no-model path uses, so the card is identical in every engine state
      devicePair = codePair(asked, profile);
      if (devicePair) {
        source = 'code'; // nothing of the model's answer is on this card
        notes.push(N.optionsCodePair);
      } else {
        notes.push(orPair(asked) ? N.optionsNeither : N.optionsFailed);
      }
    }
  } else if (o) {
    useRules = true;
  }

  const stripped = stripQuestion(asked, profile);
  const preview = JSON.stringify(engine.cloudRequest(stripped.text), null, 2);
  const cloudSwaps = swaps(stripped.map);
  const cloudSkipped = () => trace.push({ step: 'stripped', ran: 'skipped', why: env.allowCloud ? T.cloudUnconfigured : T.cloudOff, used: false });

  if (!o && !fixed) {
    // Nothing on device and code can't fix the choices: never fall back silently. Use the cloud only if allowed.
    if (env.allowCloud && engine.cloudConfigured) {
      return cloudCard(asked, pending, stripped, preview, env, ['on-device model not available'], notes, trace);
    }
    cloudSkipped();
    const card = assemble(asked, pending, null, profile, support, 'code');
    return {
      ...card, notes, unsentPayload: preview, cloudSwaps,
      blocked: engine.cloudConfigured ? N.notReadyCloudPossible : N.notReadyNoCloud,
    };
  }

  const card = assemble(asked, pending, o, profile, support, source, ms, devicePair, useRules, { step: 'private', pairFrom });
  card.notes.push(...notes);
  if (card.route.to === 'cloud') {
    if (env.allowCloud && engine.cloudConfigured) {
      return cloudCard(asked, pending, stripped, preview, env, card.route.reasons, card.notes, trace, card);
    }
    cloudSkipped();
    card.unsentPayload = preview;
    card.cloudSwaps = cloudSwaps;
    card.notes.push(engine.cloudConfigured ? N.cloudWouldCheckOff : N.cloudWouldCheckUnconfigured);
  }
  return card;
}

async function cloudCard(
  asked: string, pending: string | null, stripped: ReturnType<typeof stripQuestion>, preview: string,
  env: PipelineEnv, reasons: string[], notes: string[], trace: StepTrace[], fallback?: Card,
): Promise<Card> {
  // Last gate before anything leaves the device: no About-me term may be in the text (P0 privacy).
  const leaks = findLeaks(stripped.text, env.profile);
  if (leaks.length) {
    trace.push({ step: 'stripped', ran: 'skipped', why: T.cloudLeak, used: false });
    const base = fallback ?? assemble(asked, pending, null, env.profile, env.support, 'code');
    return { ...base, cloudPayload: null, unsentPayload: preview, notes: [...notes, N.leak] };
  }
  try {
    const r = await env.engine.runCloud(stripped.text);
    // the badge and the trace come from inferenceSource: PREFER_IN_CLOUD runs on the device when offline
    trace.push({ step: 'stripped', ran: r.source, why: r.source === 'in-cloud' ? T.cloudGot : T.cloudOffline, ms: r.ms, used: false });
    const o = parseModelOutput(r.text);
    if (!o) throw new Error('cloud answer was not valid JSON');
    o.topic = restoreNames(o.topic, stripped.map).replace(/\b(?:Person|Food|Place|Show|Music|Thing|Name) [A-Z]\b/g, '').trim();
    o.choices = o.choices.map((c) => restoreNames(c, stripped.map));
    o.options = (o.options ?? []).map((c) => restoreNames(c, stripped.map));
    // either-or: the cloud's copied options pass the same check as the device's; the rules parser is not used here
    const cloudPair = offersOptions(asked) ? validateOptions(o.options, asked, env.profile) : null;
    let card = assemble(asked, pending, o, env.profile, env.support, r.source, r.ms, cloudPair, false, { step: 'stripped', pairFrom: 'model' });
    const cloudNotes: string[] = [];
    if (card.kind === 'choice' && card.choices.filter((c) => c.role === 'answer').length < 2) {
      // the cloud's options didn't hold up either (made up, or not fitting the question)
      const devAnswers = fallback ? fallback.choices.filter((c) => c.role === 'answer').length : 0;
      if (fallback && devAnswers >= 2) {
        const cloudTried = card.why;
        card = { ...fallback, source: fallback.source };
        // the why stays the device card's; the cloud's rejected choices are appended with their rules
        if (cloudTried && card.why) card.why = { ...card.why, dropped: [...card.why.dropped, ...cloudTried.dropped.map((d) => ({ label: d.label, rule: `${W.rules.cloudUnfit}: ${d.rule}` }))] };
        cloudNotes.push(N.cloudOptionsUnfit);
      } else if (/^\s*(which|what)\s+[a-z]+/i.test(asked)) {
        card = finish({ ...card, kind: 'choice' }, ['this one', 'that one'], ['something else'], env.profile, env.support);
        if (card.why) card.why = { ...card.why, kept: [], added: [{ label: 'this one', from: N.holdUpTwo }, { label: 'that one', from: N.holdUpTwo }] };
        cloudNotes.push(N.holdUpTwo);
      }
    }
    // keep the routing reasons; the cloud's own answer is not re-routed
    // "Sent" only when inferenceSource says the cloud answered. PREFER_IN_CLOUD runs on the device when offline:
    // then nothing left this computer and the card says so (REBUILD_SPEC §1.3 item 3).
    const sent = r.source === 'in-cloud';
    if (!sent) cloudNotes.push(N.ranOffline);
    return {
      ...card, route: { to: 'cloud', reasons }, cloudPayload: sent ? preview : null, unsentPayload: sent ? null : preview,
      ranOffline: !sent, cloudSwaps: swaps(stripped.map), notes: [...notes, ...card.notes, ...cloudNotes],
    };
  } catch (e) {
    if (!trace.some((t) => t.step === 'stripped')) trace.push({ step: 'stripped', ran: 'failed', why: (e as Error).message, used: false });
    else trace[trace.findIndex((t) => t.step === 'stripped')] = { step: 'stripped', ran: 'failed', why: (e as Error).message, used: false };
    const base = fallback ?? assemble(asked, pending, null, env.profile, env.support, 'code');
    // no answer came back, so nothing is claimed as sent; the payload is shown as what cloud help would get
    return { ...base, cloudPayload: null, unsentPayload: preview, cloudSwaps: swaps(stripped.map), notes: [...notes, N.cloudFailed((e as Error).message)] };
  }
}

/** "Place A ← Whitby" lines for the partner's own screen (the real words never leave the device). */
function swaps(map: Record<string, string>): string[] {
  return Object.entries(map).map(([label, real]) => `${label} ← ${real}`);
}

// re-export for the UI
export { cloudPrompt };
