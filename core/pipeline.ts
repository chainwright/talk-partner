// The card pipeline. The model proposes topic + kind + <=3 choices; code decides everything else.
// Privacy boundary: devicePrompt() (with the profile) only goes to engine.runDevice (ONLY_ON_DEVICE).
// engine.runCloud only ever receives stripQuestion(...).text.
// "Why this card" (Card.why) is written here, on the values the rules worked on, as they are worked on.

import { COPY } from './copy';
import type { CloudError, Engine } from './engine';
import { pictureFor } from './pictures';
import { cloudPrompt, devicePrompt } from './prompt';
import {
  BODY_DETAIL, BODY_REGIONS, FEELING_MORE, FEELING_SCALES, isSelfFeeling, PAIN_LEVELS, choiceCap, dropBoth, dropGenericWhere, escapeFor, feelingSubtype, figures, fitFilter, hasNegative,
  heuristicTopic, householdFilter, isEscapeLabel, PAIN_ESCAPE, isQuiz, quizKind, offersOptions, wholePair, codePairRead, orHeadline, questionType, quizRephrase, validateOptions, validTopic, inventedNameFilter, isAuxYesNo, isBodyWhere, isFeelingQuestion, isOrNot, isPainLevel, isPartnerName,
  contactPool, dropGenericWho, fromAboutMe, ownFirst, ownSpecific, placesFirst, isUnguessable, isUnseenContact, madeUpVariants, orPair, plainPair, overlapFilter, recognitionPool, route, scaleLevel, snapToProfile, sourceFill, spokenLine, splitQuestion, stripVocative, timeScaleFilter,
  besideOwnFilter, codeOptions, contactFirst, dropWhichOne, fillerFilter, whenChoices, isNoneOption, leadIn, listedAnswers, withSame, noticeLead, numberScale, orList, painNumbers, plainQuestion, selfFilter, wrongListFilter, yesNoTopic,
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

/**
 * Questions that never run a model: the card is fixed by code and identical in every engine state, so a model call
 * would only add a wait (about 3 s on device). That includes every either-or whose two options the code reads whole
 * (rules.ts, wholePair): set E, second run, 17 Nov: 12 such cards waited for the on-device model and then showed the
 * pair read in code. Only an either-or whose reading breaks off, or options the code cannot find, still go to the
 * model, which copies the options out of the question for the label check.
 */
export function needsNoModel(q: string, profile?: Profile): boolean {
  if (isUnguessable(q) || isQuiz(q, profile) || isPainLevel(q) || isBodyWhere(q) || unseenPeople(q, profile) || whenChoices(q, profile)) return true;
  // three or more options named in the question: all of them are read in code, so no model is asked to copy them
  if (orList(q, profile)) return true;
  const read = codePairRead(q, profile);
  if (read) return read.how === 'sure' || plainPair(q, read.pair) || wholePair(read.pair, q);
  if (offersOptions(q)) return false;
  return isAuxYesNo(q) || isOrNot(q) || isFeelingQuestion(q);
}

/** Questions where code alone fixes the choices (the model only adds a topic). */
export function codeDetermined(q: string, profile?: Profile): boolean {
  return isUnguessable(q) || isQuiz(q, profile) || isPainLevel(q) || isBodyWhere(q) || !!unseenPeople(q, profile) || !!whenChoices(q, profile) || !!codeOptions(q, profile) || isAuxYesNo(q) || isOrNot(q) || isFeelingQuestion(q);
}

/**
 * The people a "who was that on the phone?" card offers: those About me names who do not live here, when there are
 * at least two (one name and a way out is no choice). Null for any other question.
 */
function unseenPeople(q: string, profile?: Profile): string[] | null {
  if (!profile || !isUnseenContact(q)) return null;
  const pool = contactPool(profile);
  return pool.length >= 2 ? pool : null;
}

function toChoices(answers: string[], escapes: string[], profile: Profile, asked = ''): Choice[] {
  // A partner does not call herself by name: when the question itself says "Carol" ("… or is Carol watching her
  // show?", "… Honey to sit with you, or Carol?"), someone else is asking, and Carol is a third person on the card
  // and in the line to say (set E, 16 Nov: the tile read "you", the line "Honey, me, or something else?").
  const named = !!profile.partnerName && new RegExp(`(?<![\\p{L}\\p{N}])${profile.partnerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'iu').test(asked);
  const mk = (label: string, role: Choice['role']): Choice => {
    const isMe = role === 'answer' && !named && isPartnerName(label, profile);
    // Rule 7: never the partner's own name on the card. The person points at "you"; the partner reads "me".
    // ("Carol's show" is "your show" / "my show", not "you's show")
    const swap = (you: string, your: string) => label.replace(new RegExp(`\\b${profile.partnerName}['’]s(?![\\p{L}])`, 'i'), your).replace(new RegExp(`\\b${profile.partnerName}\\b`, 'i'), you);
    const shown = isMe ? swap('you', 'your') : label;
    const spoken = isMe ? swap('me', 'my') : label;
    // "a lot (6 to 10)" keeps the picture of "a lot"
    return { label: shown, spoken, role, picture: pictureFor(isMe ? 'you' : label.replace(/\s*\(\d[^)]*\)$/, ''), profile) };
  };
  return [...answers.map((a) => mk(a, 'answer')), ...escapes.map((e) => mk(e, 'escape'))];
}

/** KB §7 rule 5: up to 3 choices at "mild", 2 at "more" and "most"; always exactly one escape. Numbers as figures (§2.9). */
function finish(base: Omit<Card, 'choices' | 'say'>, answers: string[], escapes: string[], profile: Profile, support: SupportLevel, cap = choiceCap(support)): Card {
  const when = questionType(base.asked) === 'when';
  // never two tiles with the same label, and never the way out among the answers (rules.ts, isEscapeLabel)
  const real = answers.filter((a, i) => !isEscapeLabel(a) && answers.findIndex((b) => lc(b) === lc(a)) === i);
  const choices = toChoices(real.slice(0, cap).map((a) => figures(a, when)), escapes.slice(0, 1), profile, base.asked);
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
function cleanChoices(asked: string, topic: string, raw: string[], profile: Profile, support: SupportLevel, why: WhyTrack): { answers: string[]; rejected: string[]; filled: string | null; wayOut: boolean } {
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
  // a way out a model offered as a choice ("something else", "other") is not one: the card has its own
  const noEscapes = answers.filter((c) => !isEscapeLabel(c));
  const wayOut = noEscapes.length < answers.length;
  diff(answers, noEscapes, R.escapeWord); answers = noEscapes;
  // a general word gives way to the family's own kind of it, when About me has exactly one ("chair" -> "recliner")
  const own = ownSpecific(answers, asked, profile);
  for (const sw of own.swapped) { drop(sw.from, R.ownSpecific); why.added.push({ label: sw.to, from: W.ownKind(sw.from) }); }
  answers = own.answers;
  const ownKept = new Set(own.swapped.map((sw) => lc(sw.to)));
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
  next = selfFilter(answers, asked, profile); diff(answers, next, R.self); answers = next;
  const fill = fillerFilter(answers, asked);
  for (const d of fill.dropped) drop(d, R.filler);
  answers = fill.kept;
  const kind = wrongListFilter(answers, asked, profile, ownKept);
  if (kind.dropped.length) rejected.push("a choice didn't fit the question");
  for (const d of kind.dropped) drop(d, R.wrongList);
  answers = kind.kept;
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
  const beside = besideOwnFilter(answers, asked, profile);
  for (const d of beside.dropped) drop(d, R.besideOwn);
  answers = beside.kept;
  // the family's own entries first: a model's general word never pushes one of them to the next page
  answers = ownFirst(answers, profile);
  next = answers.slice(0, 3); diff(answers, next, R.overThree); answers = next;
  // §2.6: a generic "stay home / go out" is not a place when About me has places to offer instead
  const placed = dropGenericWhere(answers, asked, profile);
  let droppedGeneric = placed.length < answers.length;
  diff(answers, placed, R.genericWhere);
  answers = placed;
  // the same for people: "family / friend" on a call or visit question when About me names who could be called
  const named2 = dropGenericWho(answers, asked, profile);
  if (named2.length < answers.length) droppedGeneric = true;
  diff(answers, named2, R.genericWho);
  answers = named2;
  // who to call / visit / invite: every person About me names for it is on the card, before any role word a model
  // offered; the ones the level has no room for wait on the next pages
  const people = contactFirst(answers, asked, profile);
  let peopleAdded = false;
  for (const a of people) if (!answers.some((b) => lc(b) === lc(a))) { why.added.push({ label: a, from: 'people from About me' }); peopleAdded = true; }
  answers = people;
  // where to go: the places About me names stand first, a model's general places after them
  const places = placesFirst(answers, asked, profile);
  let placesAdded = false;
  for (const a of places) if (!answers.some((b) => lc(b.replace(/^the\s+/i, '')) === lc(a))) { why.added.push({ label: a, from: 'places from About me' }); placesAdded = true; }
  answers = places;
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
  if (peopleAdded && !filled) filled = 'people from About me';
  if (placesAdded && !filled) filled = 'places from About me';
  if (droppedGeneric && !filled) rejected.push("a choice didn't fit the question");
  return { answers, rejected: [...new Set(rejected)], filled, wayOut };
}

/** The proposal as the rules saw it, for the "why" record. */
function proposal(o: ModelOutput | null, step: 'private' | 'stripped'): CardWhy['proposed'] {
  return o ? { step, topic: o.topic, kind: o.kind, choices: [...o.choices], options: [...(o.options ?? [])] } : null;
}

/** The finished "why": kept = the card's answers that code did not add. */
function whyFor(card: Card, proposed: CardWhy['proposed'], decided: string, headline: string, track: WhyTrack, profile: Profile): CardWhy {
  const addedLabels = new Set(track.added.map((a) => lc(a.label)));
  const kept = proposed ? card.choices.filter((c) => c.role === 'answer' && !addedLabels.has(lc(c.label)) && !addedLabels.has(lc(c.spoken))).map((c) => c.label) : [];
  return { proposed, decided, kept, added: track.added, dropped: track.dropped, headline, personal: card.choices.filter((c) => c.role === 'answer' && !!fromAboutMe(c.label, profile)).map((c) => c.label) };
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
  source: Source, ms = 0, pairIn: string[] | null = null, useRules = true,
  meta: { step?: 'private' | 'stripped'; pairFrom?: 'model' | 'code'; routing?: { moodWords: number; minChoices: number }; listed?: boolean } = {},
): Card {
  const step = meta.step ?? 'private';
  // §2.16: the model's topic is a headline only when it names an idea (not one function word, not a placeholder,
  // not one of its own choices: then the topic is wrong, not the choice)
  let topic = validTopic(o?.topic);
  if (topic && (o?.choices ?? []).some((c) => lc(c) === lc(topic))) topic = '';
  // the person's own name is never the headline of their card (set E, 16 Nov: the cloud's topic for "What's
  // bothering you, Person A?" came back as "Frank")
  if (topic && profile.personName) topic = validTopic(topic.split(/\s+/).filter((w) => lc(w).replace(/['’]s$/, '') !== lc(profile.personName)).join(' '));
  let headlineFrom: string = topic ? W.headlineFrom.model : W.headlineFrom.question;
  topic ||= heuristicTopic(asked, profile);
  const base = { asked, pending, topic, source, ms, cloudPayload: null, notes: [] as string[], route: { to: 'device' as const, reasons: [] as string[] } };

  if (!meta.listed && isUnguessable(asked)) {
    // "What were you trying to tell me?": no tile could be anything but a guess. The card is the fixed ways to get a
    // message across (the "we're stuck" tiles), asked with the partner's own question; never a model, nothing sent.
    const R = COPY.repair;
    const tiles = [R.tiles.showMe, R.tiles.writeIt, R.tiles.draw, R.tiles.later, R.tiles.changeTopic];
    const choices: Choice[] = tiles.map((label) => ({ label, spoken: label, role: 'repair', picture: pictureFor(label, profile) }));
    const card: Card = { ...base, source: 'code', topic: R.ownHeadline, kind: 'repair', unguessable: true, choices, say: spokenLine(asked, tiles), notes: [R.ownNote] };
    card.why = fixedWhy(o, step, W.decidedBy.unguessable, W.headlineFrom.fixed);
    return card;
  }
  if (isQuiz(asked, profile)) {
    // KB §7 rule 9: never a quiz. No card; the partner gets a statement to say instead. No rule number on screen (§2.10).
    const card: Card = {
      ...base, source: 'code', kind: 'no-quiz', choices: [],
      say: `${N.tellPrefix}${quizRephrase(asked, profile.partnerName, new Date(), profile)}`,
      blocked: N.memoryBlocked, quiz: quizKind(asked, profile) ?? undefined,
    };
    card.why = fixedWhy(o, step, W.decidedBy.quiz, W.headlineFrom.question);
    return card;
  }
  // `meta.listed`: the partner named the answers after the question ("Where does it hurt? Head, back, stomach?"), so
  // the card is exactly those (pairIn), not a fixed scale, the body map or a list of people
  if (!meta.listed && isPainLevel(asked)) {
    // the headline of a fixed card is fixed too: nothing of a model's answer is on it
    const scale = numberScale(asked);
    const line = scale ? painNumbers(scale) : null;
    if (scale && line) {
      // A number scale named in the question is the card: one line of numbers the person points along, at every
      // support level (it is one idea on one axis, not eleven separate choices). The partner says what the ends mean.
      const card = finish({ ...base, source: 'code', topic: 'pain', kind: 'pain', scale, notes: [N.painLine] }, line, [escapeFor(asked)], profile, support, line.length);
      card.say = `${asked} ${N.painLineSay(scale.lo, scale.hi)}`;
      card.why = fixedWhy(o, step, W.decidedBy.pain, W.headlineFrom.fixed);
      return card;
    }
    const steps = [...PAIN_LEVELS[scaleLevel(support)]];
    const card = finish({ ...base, source: 'code', topic: 'pain', kind: 'pain' }, steps, [PAIN_ESCAPE], profile, support, steps.length);
    card.why = fixedWhy(o, step, W.decidedBy.pain, W.headlineFrom.fixed);
    return card;
  }
  if (!meta.listed && isBodyWhere(asked)) {
    const card = paged({ ...base, source: 'code', topic: 'where it hurts', kind: 'body', bodyStep: 1 }, [...BODY_REGIONS], 'somewhere else', profile, support);
    for (let c: Card | null | undefined = card; c; c = c.nextPage) c.why = fixedWhy(o, step, W.decidedBy.body, W.headlineFrom.fixed);
    return card;
  }

  const people = meta.listed ? null : unseenPeople(asked, profile);
  if (people) {
    // "Who was that on the phone with you?": only the person knows, and the app cannot guess. The card is the people
    // About me names (never whoever lives here, never the person), paged; no model is asked, so it is the same card
    // in every engine state and nothing is sent.
    const card = paged({ ...base, source: 'code', topic: 'who', kind: 'choice', notes: [N.unseenWho] }, people, 'someone else', profile, support);
    const why: CardWhy = {
      proposed: proposal(o, step), decided: W.decidedBy.people, kept: [], added: people.map((label) => ({ label, from: 'people from About me' })),
      dropped: (o?.choices ?? []).map((label) => ({ label, rule: W.rules.fixed })), headline: W.headlineFrom.fixed, personal: people,
    };
    for (let c: Card | null | undefined = card; c; c = c.nextPage) c.why = why;
    return card;
  }

  const times = meta.listed ? null : whenChoices(asked, profile);
  if (times) {
    // An open "when": one line of three times, fixed in code, all three on the card at every support level (one
    // idea on one axis, like a feeling scale). No model, so the card does not change from run to run or from step to step.
    const card = finish({ ...base, source: 'code', topic: heuristicTopic(asked, profile), kind: 'choice', notes: [N.timeLine] }, times, [escapeFor(asked)], profile, support, times.length);
    card.why = { ...fixedWhy(o, step, W.decidedBy.when, W.headlineFrom.question), added: times.map((label) => ({ label, from: 'a fixed set for this kind of question' })) };
    return card;
  }

  // either-or options: from the on-device model when it passed validation, else the code parser (same label check)
  const pair: string[] | null = pairIn ?? (useRules ? codeOptions(asked, profile) : null);
  const pairFrom = meta.pairFrom ?? (pairIn && o ? 'model' : 'code');
  let kind: Card['kind'] = o?.kind ?? 'choice';
  const codeYesNo = isAuxYesNo(asked) || isOrNot(asked);
  if (codeYesNo) kind = 'yesno';
  // a question that offers options ("..., or would you rather ...?") is never a plain yes / no card
  if (kind === 'yesno' && offersOptions(asked) && !isOrNot(asked)) kind = 'choice';
  // §2.4: yes / no is for a single proposal only; a wh-question is never yes / no whatever the model says
  if (kind === 'yesno' && WH_START.test(stripVocative(asked))) kind = 'choice';
  if (isFeelingQuestion(asked)) kind = 'feeling';
  else if (kind === 'feeling') kind = 'choice';
  if (pair) kind = 'choice';
  if (meta.listed && pair) kind = 'choice';

  // §2.18: a code-determined card is identical in every engine state, so its headline comes from the question, not the
  // model, and its badge says "No AI needed" even when a model ran: nothing of the model's answer is on the card
  if (kind === 'yesno') {
    // simulation 16.11 (H09, C09): when only the model saw a yes / no ("You don't want…, do you?"), the model decided the
    // card, so the badge names the engine that ran, never "No AI needed"
    const card = finish({ ...base, source: codeYesNo ? 'code' : source, topic: yesNoTopic(asked, profile), kind }, ['yes', 'no'], ['not sure'], profile, support);
    card.why = fixedWhy(o, step, W.decidedBy.yesno, W.headlineFrom.question);
    return card;
  }
  if (kind === 'feeling') {
    const subtype = feelingSubtype(asked, profile);
    const steps = [...FEELING_SCALES[subtype][scaleLevel(support)]];
    // the whole scale on one card, its middle included, at every support level
    // "How are you?", "How are you feeling in yourself today?": the content words left of such a question make no
    // headline ("question", "feeling yourself today"), so it gets a fixed one, with the time the question names
    const self = subtype === 'general' && isSelfFeeling(asked);
    const when = /\b(today|tonight|now|this\s+(?:morning|afternoon|evening|week))\b/i.exec(asked)?.[1].toLowerCase().replace(/\s+/g, ' ');
    const card = finish({ ...base, source: 'code', topic: self ? (when ? `feeling ${when}` : 'feeling') : heuristicTopic(asked, profile), kind, subtype }, steps, ['something else'], profile, support, steps.length);
    card.why = fixedWhy(o, step, W.decidedBy.feeling, self ? W.headlineFrom.fixed : W.headlineFrom.question);
    if (self) {
      // "How are you feeling?": good / so-so / bad holds no "a bit sad" (set E, second run, 17 Nov: all three passes
      // left through the way out). The way out of the scale leads to a second page of feelings it does not hold, fixed
      // in code like the scale itself; its own way out is the real one.
      const page = finish({ ...base, source: 'code', topic: card.topic, kind, subtype, notes: [N.lastPage] }, [...FEELING_MORE], ['something else'], profile, support, FEELING_MORE.length);
      page.why = card.why;
      card.nextPage = page;
      card.notes.push(N.feelingMore(FEELING_MORE.join(', '), 'something else'));
    }
    return card;
  }

  const track: WhyTrack = { dropped: [], added: [] };
  let answers: string[];
  let rejected: string[] = [];
  let filled: string | null = null;
  let headline = topic;
  let decided: string;
  let ownAll = false;
  // one real option and a way out, said by the partner or by a model: asked as a yes / no question (noEscapeOnly)
  let wayOut = !!pair;
  if (pair) {
    answers = [...pair]; // rule 3: exactly the options the partner offered
    // §2.5: the shared topic, never one of the options. The model's topic may be the headline only when the options
    // are the model's too: a card read in code says "No AI needed", so nothing of a model's answer may be on it
    headline = orHeadline(asked, pair, profile, pairFrom === 'model' ? o?.topic : '');
    headlineFrom = W.headlineFrom.pair;
    decided = meta.listed ? W.decidedBy.listed : pairFrom === 'model' ? W.decidedBy.pairModel : W.decidedBy.pairCode;
    if (o) {
      // the model's own options that failed the check, and its loose choices: neither is on an either-or card
      if (pairFrom === 'code') for (const x of o.options ?? []) track.dropped.push({ label: x, rule: W.rules.optionsFailed });
      for (const c of o.choices) if (!pair.some((p) => lc(p) === lc(c))) track.dropped.push({ label: c, rule: W.rules.orOnly });
    }
  } else {
    decided = o ? W.decidedBy.open : W.decidedBy.openCode;
    ({ answers, rejected, filled, wayOut } = cleanChoices(asked, topic, o?.choices ?? [], profile, support, track));
    // §2.16: the headline is never one of the options (a filled answer may coincide with the model's topic)
    if (answers.some((a) => lc(a) === lc(headline))) {
      headline = heuristicTopic(asked, profile);
      headlineFrom = W.headlineFrom.question;
      if (answers.some((a) => lc(a) === lc(headline))) headline = '';
    }
    // Exactly three of the family's own entries share one card, also at "2 at a time" (not at the largest tiles, and
    // not people, who are paged two at a time): set E, second run, 17 Nov, an About-me place stood on the next page
    // of a card that showed two of the three. Four or more are paged as before.
    ownAll = support !== 'most' && questionType(asked) !== 'who' && answers.length >= 3 && answers.slice(0, 3).every((a) => !!fromAboutMe(a, profile)) && !fromAboutMe(answers[3] ?? '', profile);
    // the support level's limit (the same cut finish() makes), recorded here so the why says which choice it moved:
    // a choice over the limit is not thrown away, it goes to the next page (below)
    for (const a of answers.slice(ownAll ? 3 : choiceCap(support))) track.dropped.push({ label: a, rule: W.rules.overCap });
  }
  const r = route('choice', asked, answers, !!pair, meta.routing);
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
  // A card from the private step whose every answer is an About-me entry stays on this computer: the cloud step never
  // sees About me, so its card could only be a generic one. What the rules dropped on the way is still in the "why".
  const shown = answers.slice(0, ownAll ? 3 : choiceCap(support));
  if (!pair && o && step === 'private' && r.to === 'cloud' && shown.length >= 2 && shown.every((a) => !!fromAboutMe(a, profile))) {
    notes.push(N.personalKept);
    r.to = 'device';
    r.reasons = [];
  }
  const escape = escapeFor(asked, answers, profile);
  // Three options the partner named stand on one card, also at "2 at a time": the spoken line names all three, and a
  // tile that is missing reads as "not offered" (simulation 16.11). At the largest tiles two are shown and the third
  // waits on the next page; a fourth always does.
  // "nothing" / "not at all" / "the same" the partner named is never moved off the first page: it is the person's
  // way to decline, and on a next page it reads as not offered (set E, 16 Nov: "Tea, coffee, or water, or nothing?")
  const capReal = (pair && pair.length >= 3 && support !== 'most') || ownAll ? 3 : choiceCap(support);
  const noneAt = pair ? answers.findIndex(isNoneOption) : -1;
  const real = noneAt >= 0 ? answers.filter((_, i) => i !== noneAt) : answers;
  const rest = real.slice(capReal);
  answers = noneAt >= 0 ? [...real.slice(0, capReal), answers[noneAt]] : answers;
  const cap = noneAt >= 0 ? Math.min(real.length, capReal) + 1 : capReal;
  if (pair) for (const a of rest) track.dropped.push({ label: a, rule: W.rules.overCap });
  if (pair && pair.length >= 3 && cap > choiceCap(support)) notes.push(N.listedAll);
  if (ownAll && cap > choiceCap(support)) notes.push(N.ownAll);
  if (rest.length) notes.push(N.moreOnNext(rest.join(', '), escape));
  const card = finish({ ...base, notes, topic: headline, kind: 'choice', route: r }, answers, [escape], profile, support, cap);
  card.why = whyFor(card, proposal(o, step), decided, headlineFrom, track, profile);
  if (wayOut && answers.length === 1) card.oneOption = true;
  if (rest.length) {
    // A good choice the support level has no room for is kept for a next page, reached by the way-out tile or the
    // partner's "Next: more choices" (the body map pages the same way). Before, it was dropped without a word. As
    // many pages as it takes: nothing that passed the rules is lost behind the last one.
    const per = choiceCap(support);
    let next: Card | null = null;
    for (let i = Math.floor((rest.length - 1) / per) * per; i >= 0; i -= per) {
      const page: Card = { ...finish({ ...base, notes: [N.lastPage], topic: headline, kind: 'choice', route: r }, rest.slice(i, i + per), [escape], profile, support), why: card.why };
      page.nextPage = next;
      next = page;
    }
    card.nextPage = next;
  }
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
  /**
   * The routing thresholds in use (core/models.ts): the in-code defaults unless Firebase Remote Config gave others.
   * Optional: without it the defaults apply, so a card never waits for, or depends on, a settings request.
   */
  routing?: { moodWords: number; minChoices: number };
  /** The wait before the one retry of a failed cloud call. Only tests pass it (so they need not wait); the app uses a timer. */
  sleep?: (ms: number) => Promise<void>;
}

/**
 * How long to wait before asking the cloud once more, or null when a second try is pointless or would take too long.
 * Retried: "too many requests" (HTTP 429: the free tier allows 15 requests a minute), a busy or unavailable service
 * (500 / 502 / 503 / 504) and a network error. When the service names its own wait ("retry in 37s") and it is over
 * 3 s, there is no second try: the partner is told now, not after a long silence. Also retried, once: a passing App
 * Check fault (the token exchange was unavailable, the service did not take the token). Not retried: App Check
 * refused this browser (403); it then refuses every try for a day, until the page is loaded again (the hosted copy,
 * 17 Nov). Never retried: a request that certainly did not leave (offline, cloud help not set up) or refused otherwise.
 */
export function cloudRetryWait(e: unknown): number | null {
  if ((e as CloudError)?.notSent) return null;
  const msg = String((e as Error)?.message ?? e);
  if (CLOUD_APPCHECK.test(msg)) return /\b403\b/.test(msg) ? null : 1200;
  if (!CLOUD_BUSY.test(msg) && !CLOUD_NETWORK.test(msg)) return null;
  const named = /retry\s*(?:in|after|delay)["':\s]*([\d.]+)\s*(ms|s)?/i.exec(msg);
  if (named) {
    const ms = Math.ceil(Number(named[1]) * (named[2]?.toLowerCase() === 'ms' ? 1 : 1000));
    return Number.isFinite(ms) && ms <= 3000 ? ms + 100 : null;
  }
  return 1200;
}
const CLOUD_BUSY = /\b429\b|quota|resource[_ -]?exhausted|rate[ -]?limit|too many requests|\b50[0234]\b|unavailable|overloaded|try again later/i;
const CLOUD_NETWORK = /failed to fetch|fetch failed|error fetching|network|timed? ?out|econn|socket|load failed/i;
const CLOUD_APPCHECK = /app[ -]?check/i;
/** True when App Check stood in the way: its own error, or the service refusing the token. */
export function cloudWasAppCheck(e: unknown): boolean {
  return CLOUD_APPCHECK.test(String((e as Error)?.message ?? e));
}
/** True when the cloud refused for load, not for the question: the partner is told "busy", and that a retry may work. */
export function cloudWasBusy(e: unknown): boolean {
  return /\b429\b|quota|resource[_ -]?exhausted|rate[ -]?limit|too many requests/i.test(String((e as Error)?.message ?? e));
}

/** Full flow for one partner question. */
export async function makeCard(input: string, env: PipelineEnv): Promise<Card> {
  const trace: StepTrace[] = [];
  const card = noEscapeOnly(await makeCardInner(input, env, trace));
  // §2.13: a blocked card is never shown to the person, so it carries no choices (not even an escape)
  // …and the line to say never reads options that are not on the screen (set D, 16 Nov: with no model, a blocked
  // "Where are we right now?" still read "Lake, church, or somewhere else?")
  const out: Card = { ...(card.blocked ? { ...card, choices: [], nextPage: null, say: card.kind === 'no-quiz' ? card.say : N.justAsk(card.asked) } : card), trace: finishTrace(trace, card) };
  // later pages of the same card (more choices, the body map) carry the same record of where it was made and what left
  for (let p = out.nextPage; p; p = p.nextPage) {
    Object.assign(p, { trace: out.trace, source: out.source, route: out.route, cloudPayload: out.cloudPayload, cloudSwaps: out.cloudSwaps, cloudAttempted: out.cloudAttempted, cloudAttempts: out.cloudAttempts, unsentPayload: out.unsentPayload, ranOffline: out.ranOffline });
  }
  const coach = coachFor(out);
  return coach ? { ...out, coach } : out;
}

/**
 * The coaching line: only where a rule detected something about the question itself. Two questions in one (rule 1),
 * a memory test (rule 9), or options the screen cannot know ("which jumper": hold two up).
 */
function coachFor(card: Card): string | undefined {
  // a recall question may be one the partner cannot answer either: then "you know this one" would be wrong
  if (card.kind === 'no-quiz') return card.quiz === 'recall' ? COPY.coach.recall : COPY.coach.test;
  const negative = card.notes.includes(N.negativeAsked);
  if (card.unguessable) return card.pending ? `${COPY.coach.twoQuestions} ${COPY.coach.unguessable}` : COPY.coach.unguessable;
  if (card.pending) return negative ? `${COPY.coach.twoQuestions} ${COPY.coach.negative}` : COPY.coach.twoQuestions;
  if (negative) return COPY.coach.negative;
  if (card.notes.includes(N.holdUpTwo)) return COPY.coach.holdUp;
  return undefined;
}

/**
 * A choice card needs at least two real choices: a way out ("something else") is never counted as one, whatever its
 * role on the card (rules.ts, isEscapeLabel). With exactly one real option left beside a way out ("Rest or something
 * else?", a cloud answer of one word and "something else": `oneOption`) the card becomes a yes / no card on that option, which is what a therapist does
 * with one candidate. With none there is no card (an escape alone can't be answered): just ask normally.
 */
export function noEscapeOnly(card: Card): Card {
  if (card.kind !== 'choice' || card.blocked) return card;
  const real = card.choices.filter((c) => c.role === 'answer' && !isEscapeLabel(c.label));
  if (real.length >= 2) return card;
  if (real.length === 1 && card.oneOption) return oneOptionCard(card, real[0]);
  const why = card.why ? { ...card.why, decided: card.why.proposed ? W.decidedBy.blocked : W.decidedBy.blockedNoModel } : undefined;
  return { ...card, choices: [], nextPage: null, say: N.justAsk(card.asked), blocked: N.noChoicesBlocked, why };
}

/** One real option: asked as a yes / no question on it. The line to say keeps the partner's own words first. */
function oneOptionCard(card: Card, only: Choice): Card {
  const label = only.label;
  const asked = `${label.charAt(0).toUpperCase()}${label.slice(1)}?`;
  const mk = (l: string, role: Choice['role']): Choice => ({ label: l, spoken: l, role, picture: { type: 'builtin', id: l } });
  const choices = [mk('yes', 'answer'), mk('no', 'answer'), mk('not sure', 'escape')];
  const said = `${asked} Yes, no, or not sure?`;
  const why = card.why ? { ...card.why, decided: W.decidedBy.oneOption, kept: [label] } : undefined;
  return {
    ...card, kind: 'yesno', topic: label, asked, choices, nextPage: null,
    say: card.asked.toLowerCase().replace(/[?.!\s]+$/, '') === label.toLowerCase() ? said : `${card.asked} ${said}`,
    notes: [...card.notes, N.oneOption(label)], why,
  };
}

/**
 * The trace in a fixed order (private, stripped, code), with "used" set from the card's final source. Steps the
 * pipeline never reached are recorded as skipped with the reason, so a judge sees every step on every card.
 */
function finishTrace(trace: StepTrace[], card: Card): StepTrace[] {
  const byStep = new Map(trace.map((t) => [t.step, t]));
  const priv = byStep.get('private') ?? { step: 'private' as const, ran: 'skipped' as const, why: T.notNeeded, used: false };
  // not needed because the rules made the card alone, or because the card made on this computer was good enough: say which
  const strip = byStep.get('stripped') ?? { step: 'stripped' as const, ran: 'skipped' as const, why: card.source === 'on-device' ? T.cloudNotNeeded : T.notNeeded, used: false };
  const code: StepTrace = { step: 'code', ran: 'on-device', why: T.codeRan, used: true };
  // the step whose answer the person sees: the stripped leg when the cloud (or its offline fall-back) answered,
  // the private leg when the device card was kept, neither when code decided alone or the card is blocked
  const stripUsed = !card.blocked && (card.source === 'in-cloud' || !!card.ranOffline);
  const privUsed = !card.blocked && card.source === 'on-device' && !card.ranOffline && priv.ran === 'on-device';
  return [{ ...priv, used: privUsed }, { ...strip, used: stripUsed }, code];
}

async function makeCardInner(input0: string, env: PipelineEnv, trace: StepTrace[]): Promise<Card> {
  const { profile, support, engine } = env;
  // "…, or rest. Which one?": the closing "which one?" is not part of the last option
  const input = dropWhichOne(input0);
  // "Is that the phone? Do you want to answer it?": the first part points at something, the second is the question.
  // One card, when code can decide it; the line to say keeps both sentences.
  const notice = noticeLead(input);
  if (notice && codeDetermined(plainQuestion(notice.q)?.q ?? notice.q, profile)) {
    const card = await makeCardInner(notice.q, env, trace);
    const say = card.kind === 'no-quiz' || card.blocked || !card.say.startsWith(card.asked) ? card.say : `${notice.context} ${card.say}`;
    return { ...card, say, notes: [...card.notes, N.noticeLead] };
  }
  // "Where does it hurt? Head, back, stomach?": a question, then the answers the partner offers. One card with
  // exactly those; no model, nothing sent. A memory question stays one whatever follows it.
  const listed = listedAnswers(input, profile);
  // (a test with answers offered after it, "What day is it? Monday or Tuesday?", is still a test: no second card)
  if (listed && isQuiz(listed.q, profile)) return makeCardInner(listed.q, env, trace);
  if (listed) {
    const card = assemble(listed.q, null, null, profile, support, 'code', 0, listed.options, true, { pairFrom: 'code', listed: true });
    return { ...card, notes: [...card.notes, N.listedByYou] };
  }
  const [typed0, pending] = splitQuestion(input);
  // "Tyler's got a game Saturday, do you want to go watch?": a statement, then a question code can decide (yes / no,
  // either-or, feeling, pain…). The card asks the question; the statement stays in the line to say. Only then: an
  // open question keeps its lead-in, because a model may need it to offer anything sensible.
  const lead = leadIn(typed0);
  const useLead = !!lead && codeDetermined(plainQuestion(lead.q)?.q ?? lead.q, profile) && !isQuiz(typed0, profile);
  const typed = useLead ? lead!.q : typed0;
  if (useLead) {
    const card = await makeCardInner(pending ? `${typed} ${pending}` : typed, env, trace);
    // the line to say is the partner's own sentence, then the options; a "tell, don't test" line stays as it is
    // (after a comma the question goes on in lower case, as typed; after a full stop it keeps its capital)
    const rest = /[.]$/.test(lead!.context) ? card.say : `${card.say.charAt(0).toLowerCase()}${card.say.slice(1)}`;
    const say = card.kind === 'no-quiz' || card.blocked || !card.say.startsWith(card.asked) ? card.say : `${lead!.context} ${rest}`;
    return { ...card, say, notes: [...card.notes, N.leadIn] };
  }
  // a negative question is asked the plain way, a proposal without its "or is that a no?" (rules.ts, plainQuestion)
  const plain = plainQuestion(typed);
  const asked = plain?.q ?? typed;
  const fixed = codeDetermined(asked, profile);

  let o: ModelOutput | null = null;
  let source: Source = 'code';
  let ms = 0;
  const notes: string[] = [];
  if (pending) notes.push(N.twoQuestions);
  if (plain) notes.push(plain.why === 'negative' ? N.negativeAsked : N.optOutAsked);

  if (isQuiz(asked, profile)) return { ...assemble(asked, pending, null, profile, support, 'code'), notes };
  // A question code decides alone (yes / no, a plain either-or, feeling, pain, body) never runs a model.
  if (!needsNoModel(asked, profile)) {
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
  // (build spec §1.4 step 3: the "coffee or tea" bug). Only when neither passes does the card go to the cloud.
  let devicePair: string[] | null = null;
  let pairFrom: 'model' | 'code' = 'code';
  let useRules = !o;
  if (o && offersOptions(asked)) {
    devicePair = withSame(validateOptions(o.options ?? [], asked, profile));
    if (devicePair) {
      pairFrom = 'model';
      notes.push(N.optionsCopied);
    } else {
      // the same pair the no-model path uses, so the card is identical in every engine state
      devicePair = codeOptions(asked, profile);
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
      why: card.why ? { ...card.why, decided: W.decidedBy.blockedNoModel } : undefined,
    };
  }

  const card = assemble(asked, pending, o, profile, support, source, ms, devicePair, useRules, { step: 'private', pairFrom, routing: env.routing });
  card.notes.push(...notes);
  if (card.route.to === 'cloud') {
    if (env.allowCloud && engine.cloudConfigured) {
      return cloudCard(asked, pending, stripped, preview, env, card.route.reasons, card.notes, trace, card);
    }
    cloudSkipped();
    card.unsentPayload = preview;
    card.cloudSwaps = cloudSwaps;
    const kept = card.choices.filter((c) => c.role === 'answer').length >= 2;
    card.notes.push(engine.cloudConfigured ? N.cloudWouldCheckOff(kept) : N.cloudWouldCheckUnconfigured(kept));
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
  // A question that turns on an About-me thing ("What do you need from the hardware store?" goes as "from the Place
  // A") cannot be answered by a step that never sees About me: its choices would be a guess (simulation 16.11: food /
  // drink / medicine). It is not sent; a card made on this computer is kept, else there is no card and the reason is said.
  const hidden = hiddenSubject(asked, stripped);
  if (hidden) {
    trace.push({ step: 'stripped', ran: 'skipped', why: T.cloudHidden, used: false });
    const base = fallback ?? assemble(asked, pending, null, env.profile, env.support, 'code');
    // only a card the on-device step made is kept; with no model answer at all there is no card (as on any open
    // question no model answered), never one filled from a fixed set that does not know the question either
    const usable = !!fallback && base.choices.filter((c) => c.role === 'answer').length >= 2;
    return {
      ...base, cloudPayload: null, unsentPayload: preview, cloudSwaps: swaps(stripped.map), notes: [...notes, ...(fallback ? [] : base.notes), N.hiddenSubject(hidden)],
      ...(usable ? {} : { blocked: N.hiddenBlocked(hidden), say: N.justAsk(asked), why: base.why ? { ...base.why, decided: W.decidedBy.blockedNoModel } : undefined }),
    };
  }
  // Did the question leave this computer? 'maybe' from the moment the request is handed to the SDK until the SDK
  // reports where the answer came from; an error in between leaves it at 'maybe', and the card says so.
  let left: 'no' | 'maybe' | 'yes' = 'no';
  // one failed try that was followed by a second: its request may have left too, so the receipt counts it
  let firstTryFailed = false;
  try {
    left = 'maybe';
    let r: Awaited<ReturnType<Engine['runCloud']>>;
    try {
      r = await env.engine.runCloud(stripped.text);
    } catch (e) {
      // Busy (429 on the free tier's 15 requests a minute) or a network error: one more try after a short wait, when
      // the service allows it within about 3 s. Otherwise the error stands and the partner is told at once.
      const wait = cloudRetryWait(e);
      if (wait === null) throw e;
      firstTryFailed = true;
      await (env.sleep ?? ((ms: number) => new Promise<void>((res) => setTimeout(res, ms))))(wait);
      r = await env.engine.runCloud(stripped.text);
    }
    left = r.source === 'in-cloud' ? 'yes' : 'no';
    // the badge and the trace come from inferenceSource: PREFER_IN_CLOUD runs on the device when offline
    trace.push({ step: 'stripped', ran: r.source, why: r.source === 'in-cloud' ? T.cloudGot : T.cloudOffline, ms: r.ms, used: false });
    const o = parseModelOutput(r.text);
    if (!o) throw new Error('cloud answer was not valid JSON');
    o.topic = restoreNames(o.topic, stripped.map).replace(/\b(?:Person|Food|Place|Show|Music|Thing|Name) [A-Z]\b/g, '').trim();
    o.choices = o.choices.map((c) => restoreNames(c, stripped.map));
    o.options = (o.options ?? []).map((c) => restoreNames(c, stripped.map));
    // either-or: the cloud's copied options pass the same check as the device's; the rules parser is not used here
    const cloudPair = offersOptions(asked) ? withSame(validateOptions(o.options, asked, env.profile)) : null;
    let card = assemble(asked, pending, o, env.profile, env.support, r.source, r.ms, cloudPair, false, { step: 'stripped', pairFrom: 'model' });
    const cloudNotes: string[] = [];
    if (card.kind === 'choice' && !card.oneOption && card.choices.filter((c) => c.role === 'answer').length < 2) {
      // the cloud's options didn't hold up either (made up, or not fitting the question)
      const devAnswers = fallback ? fallback.choices.filter((c) => c.role === 'answer').length : 0;
      if (fallback && devAnswers >= 2) {
        const cloudTried = card.why;
        card = { ...fallback, source: fallback.source };
        // the why stays the device card's; the cloud's rejected choices are appended with their rules
        if (cloudTried && card.why) card.why = { ...card.why, dropped: [...card.why.dropped, ...cloudTried.dropped.map((d) => ({ label: d.label, rule: `${W.rules.cloudUnfit}: ${d.rule}` }))] };
        cloudNotes.push(N.cloudOptionsUnfit);
      } else if (/^\s*(which|what)\s+(?!(?:do|does|did|would|will|shall|should|can|could|is|are|was|were|have|has|had|about|now|if|else|next)\b)[a-z]+/i.test(asked)) {
        // "Which jumper?", "What colour?": the real options are things in the room. Not for "What do you want?": two
        // tiles "this one / that one" answer nothing there (17 Nov 2026), so that question gets no card.
        card = finish({ ...card, kind: 'choice' }, ['this one', 'that one'], ['something else'], env.profile, env.support);
        if (card.why) card.why = { ...card.why, kept: [], added: [{ label: 'this one', from: N.holdUpTwo }, { label: 'that one', from: N.holdUpTwo }] };
        cloudNotes.push(N.holdUpTwo);
      }
    }
    // keep the routing reasons; the cloud's own answer is not re-routed
    // "Sent" only when inferenceSource says the cloud answered. PREFER_IN_CLOUD runs on the device when offline:
    // then nothing left this computer and the card says so (build spec §1.3 item 3).
    const sent = r.source === 'in-cloud';
    if (!sent) cloudNotes.push(N.ranOffline);
    if (firstTryFailed) cloudNotes.push(N.cloudRetried);
    return {
      ...card, route: { to: 'cloud', reasons }, cloudPayload: sent ? preview : null, unsentPayload: sent ? null : preview,
      ...(firstTryFailed ? { cloudAttempted: preview, cloudAttempts: 1 } : {}),
      ranOffline: !sent, cloudSwaps: swaps(stripped.map), notes: [...notes, ...card.notes, ...cloudNotes],
    };
  } catch (e) {
    if (!trace.some((t) => t.step === 'stripped')) trace.push({ step: 'stripped', ran: 'failed', why: (e as Error).message, used: false });
    else trace[trace.findIndex((t) => t.step === 'stripped')] = { step: 'stripped', ran: 'failed', why: (e as Error).message, used: false };
    if ((e as CloudError).notSent) left = 'no';
    // Only a card the step on this computer made is kept. With none, there is no card: a card put together from About
    // me by code alone does not know the question (set D, 16 Nov: after a 429, "Where do you want to sit?" offered the
    // lake and church under the badge "No AI needed"). The partner is told that cloud help failed, and can try again.
    const kept = !!fallback && !fallback.blocked && fallback.choices.filter((c) => c.role === 'answer').length >= 2;
    // the note is one plain sentence; the step trace ("where each step ran") keeps the service's full message
    const reason = cloudWasAppCheck(e) ? 'check' : cloudWasBusy(e) ? 'busy' : 'down';
    const note = N.cloudFailed(reason, kept);
    const base: Card = kept ? fallback! : {
      ...(fallback ?? assemble(asked, pending, null, env.profile, env.support, 'code')),
      source: 'code', kind: 'choice', choices: [], nextPage: null, say: N.justAsk(asked),
      blocked: reason === 'check' ? N.cloudCheckBlocked : reason === 'busy' ? N.cloudBusyBlocked : N.cloudDownBlocked,
      // the question to ask again, both halves when it was two in one
      retry: pending ? `${asked} ${pending}` : asked,
      why: { proposed: null, decided: W.decidedBy.blockedCloud, kept: [], added: [], dropped: [], headline: W.headlineFrom.question },
    };
    const out = { ...base, cloudSwaps: swaps(stripped.map), notes: [...notes, note] };
    // the cloud answered and the answer was unusable: the question did leave, and the receipt counts it
    if (left === 'yes') return { ...out, cloudPayload: preview, unsentPayload: null, ...(firstTryFailed ? { cloudAttempted: preview, cloudAttempts: 1 } : {}) };
    // handed to the SDK, then an error: it may have left; never shown as "nothing left this computer"
    if (left === 'maybe') return { ...out, cloudPayload: null, cloudAttempted: preview, cloudAttempts: firstTryFailed ? 2 : 1, unsentPayload: null };
    return { ...out, cloudPayload: null, unsentPayload: preview };
  }
}

/**
 * The About-me words an open question turns on, when they were swapped out: a place, food, show, music or other entry
 * right after "from" ("What do you need from the hardware store?") in a what-question with no options in it: there
 * the hidden word is the source of every possible answer. Kept this narrow on purpose: "What shall we plant at the
 * Place A?" still goes, because a general answer can fit. A person's label is not counted (the cloud needs no name
 * to answer "what shall we get Person A?"), nor is a who / where / when question (filled or checked in code).
 */
function hiddenSubject(asked: string, stripped: ReturnType<typeof stripQuestion>): string | null {
  const t = questionType(asked);
  if ((t !== 'what' && t !== 'say') || offersOptions(asked)) return null;
  const m = /\b(?:from|out\s+of)\s+(?:the\s+|a\s+|an\s+|some\s+|your\s+|my\s+|our\s+)?((?:Place|Food|Show|Music|Thing) [A-Z])\b/.exec(stripped.text);
  return m ? stripped.map[m[1]] ?? null : null;
}

/** "Place A ← Whitby" lines for the partner's own screen (the real words never leave the device). */
function swaps(map: Record<string, string>): string[] {
  return Object.entries(map).map(([label, real]) => `${label} ← ${real}`);
}

// re-export for the UI
export { cloudPrompt };
