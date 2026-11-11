// The card pipeline. The model proposes topic + kind + <=3 choices; code decides everything else.
// Privacy boundary: devicePrompt() (with the profile) only goes to engine.runDevice (ONLY_ON_DEVICE).
// engine.runCloud only ever receives stripQuestion(...).text.

import type { Engine } from './engine';
import { pictureFor } from './pictures';
import { cloudPrompt, devicePrompt } from './prompt';
import {
  BODY_DETAIL, BODY_REGIONS, FEELING_SCALES, PAIN_LEVELS, choiceCap, codePair, dropBoth, dropGenericWhere, escapeFor, feelingSubtype, figures, fitFilter, hasNegative,
  heuristicTopic, householdFilter, isQuiz, offersOptions, orHeadline, questionType, quizRephrase, validateOptions, validTopic, inventedNameFilter, isAuxYesNo, isBodyWhere, isFeelingQuestion, isOrNot, isPainLevel, isPartnerName,
  madeUpVariants, orPair, overlapFilter, route, scaleLevel, snapToProfile, sourceFill, spokenLine, splitQuestion, stripVocative, timeScaleFilter,
} from './rules';
import { findLeaks, hasPlaceholder, restoreNames, stripQuestion } from './strip';
import type { BodyRegion, Card, Choice, ModelOutput, Profile, Source, SupportLevel } from './types';

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
    const card = finish({ ...base, notes: [...base.notes, ...(pages.length > 1 ? [`Page ${i + 1} of ${pages.length}: "${escape}" shows the next ones.`] : [])] }, pages[i], [escape], profile, support);
    card.nextPage = next;
    next = card;
  }
  return next!;
}

/** Model or cloud choices -> clean answer list, plus why any were rejected (rules 3, 4, 9, 10 and fit), plus the §2.6 fill. */
function cleanChoices(asked: string, topic: string, raw: string[], profile: Profile, support: SupportLevel): { answers: string[]; rejected: string[]; filled: string | null } {
  const seen = new Set<string>();
  const rejected: string[] = [];
  let answers = raw
    .map((c) => snapToProfile(c.replace(/[.!?]+$/, '').trim(), profile))
    .filter((c) => c && c.toLowerCase() !== topic.toLowerCase())
    .filter((c) => !seen.has(c.toLowerCase()) && !!seen.add(c.toLowerCase()));
  const negs = answers.filter(hasNegative);
  answers = answers.filter((c) => !hasNegative(c));
  const unrestored = answers.filter(hasPlaceholder);
  if (unrestored.length) rejected.push('made-up options');
  answers = answers.filter((c) => !hasPlaceholder(c));
  answers = dropBoth(answers, asked);
  answers = timeScaleFilter(answers);
  answers = householdFilter(answers, asked, profile);
  const named = inventedNameFilter(answers, asked, profile);
  if (named.length < answers.length) rejected.push('made-up options');
  answers = named;
  const fit = fitFilter(answers, asked, profile);
  if (fit.dropped.length) rejected.push("a choice didn't fit the question");
  answers = fit.kept;
  if (madeUpVariants(answers, asked, profile)) {
    // invented details of the person's own things: none of these can be offered
    rejected.push('made-up options');
    answers = [];
  }
  answers = overlapFilter(answers, profile).slice(0, 3);
  // §2.6: a generic "stay home / go out" is not a place when About me has places to offer instead
  const placed = dropGenericWhere(answers, asked, profile);
  const droppedGeneric = placed.length < answers.length;
  answers = placed;
  if (negs.length && answers.length < 2) rejected.push('negative wording');
  // §2.6: fewer than two answers -> fill from the About-me list of the same kind, or the fixed set for the question type
  let filled: string | null = null;
  if (answers.length < 2) {
    const f = sourceFill(answers, asked, profile, choiceCap(support));
    if (f) { answers = f.answers; filled = f.source; }
  } else if (droppedGeneric) {
    const f = sourceFill(answers, asked, profile, choiceCap(support));
    if (f) { answers = f.answers; filled = f.source; }
  }
  if (droppedGeneric && !filled) rejected.push("a choice didn't fit the question");
  return { answers, rejected: [...new Set(rejected)], filled };
}

/**
 * Pure assembly: from the question and (optionally) the model's output to a finished card.
 * Applies rules 2-5 and 7-11. Exported for unit tests.
 */
export function assemble(
  asked: string, pending: string | null, o: ModelOutput | null, profile: Profile, support: SupportLevel,
  source: Source, ms = 0, pairIn: [string, string] | null = null, useRules = true,
): Card {
  // §2.16: the model's topic is a headline only when it names an idea (not one function word, not a placeholder,
  // not one of its own choices: then the topic is wrong, not the choice)
  let topic = validTopic(o?.topic);
  if (topic && (o?.choices ?? []).some((c) => c.toLowerCase() === topic.toLowerCase())) topic = '';
  topic ||= heuristicTopic(asked, profile);
  const base = { asked, pending, topic, source, ms, cloudPayload: null, notes: [] as string[], route: { to: 'device' as const, reasons: [] as string[] } };

  if (isQuiz(asked)) {
    // KB §7 rule 9: never a quiz. No card; the partner gets a statement to say instead. No rule number on screen (§2.10).
    return {
      ...base, source: 'code', kind: 'no-quiz', choices: [],
      say: `Tell, don't test: ${quizRephrase(asked, profile.partnerName, new Date(), profile)}`,
      blocked: 'This one asks them to remember, so there is no card. Try saying it instead.',
    };
  }
  if (isPainLevel(asked)) {
    return finish({ ...base, topic: validTopic(o?.topic) || 'pain', kind: 'pain' }, [...PAIN_LEVELS[scaleLevel(support)]], [escapeFor(asked)], profile, support);
  }
  if (isBodyWhere(asked)) {
    return paged({ ...base, topic: 'where it hurts', kind: 'body', bodyStep: 1 }, [...BODY_REGIONS], 'somewhere else', profile, support);
  }

  // either-or options: from the on-device model when it passed validation, else the code parser (same label check)
  const pair: [string, string] | null = pairIn ?? (useRules ? codePair(asked, profile) : null);
  let kind: Card['kind'] = o?.kind ?? 'choice';
  if (isAuxYesNo(asked) || isOrNot(asked)) kind = 'yesno';
  // a question that offers options ("..., or would you rather ...?") is never a plain yes / no card
  if (kind === 'yesno' && offersOptions(asked) && !isOrNot(asked)) kind = 'choice';
  // §2.4: yes / no is for a single proposal only; a wh-question is never yes / no whatever the model says
  if (kind === 'yesno' && WH_START.test(stripVocative(asked))) kind = 'choice';
  if (isFeelingQuestion(asked)) kind = 'feeling';
  else if (kind === 'feeling') kind = 'choice';
  if (pair) kind = 'choice';

  // §2.18: a code-determined card is identical in every engine state, so its headline comes from the question, not the model
  if (kind === 'yesno') return finish({ ...base, topic: heuristicTopic(asked, profile), kind }, ['yes', 'no'], ['not sure'], profile, support);
  if (kind === 'feeling') {
    const subtype = feelingSubtype(asked, profile);
    return finish({ ...base, topic: heuristicTopic(asked, profile), kind, subtype }, [...FEELING_SCALES[subtype][scaleLevel(support)]], ['something else'], profile, support);
  }

  let answers: string[];
  let rejected: string[] = [];
  let filled: string | null = null;
  let headline = topic;
  if (pair) {
    answers = [...pair]; // rule 3: exactly the two options the partner offered
    headline = orHeadline(asked, pair, profile, o?.topic); // §2.5: the shared topic, never one of the options
  } else {
    ({ answers, rejected, filled } = cleanChoices(asked, topic, o?.choices ?? [], profile, support));
    // §2.16: the headline is never one of the options (a filled answer may coincide with the model's topic)
    if (answers.some((a) => a.toLowerCase() === headline.toLowerCase())) {
      headline = heuristicTopic(asked, profile);
      if (answers.some((a) => a.toLowerCase() === headline.toLowerCase())) headline = 'choices';
    }
  }
  const r = route('choice', asked, answers, !!pair);
  if (!pair && offersOptions(asked)) rejected.push('either-or options not found');
  if (!pair) for (const why of rejected) if (!r.reasons.includes(why)) r.reasons.push(why);
  if (r.reasons.length) r.to = 'cloud';
  const notes = [...base.notes];
  if (filled && answers.length >= 2) {
    // §2.6: the card was completed from About me or the fixed set; the cloud (which has neither) can't do better
    notes.push(`Choices completed from ${filled}.`);
    r.to = 'device';
    r.reasons = [];
  }
  return finish({ ...base, notes, topic: headline, kind: 'choice', route: r }, answers, [escapeFor(asked, answers, profile)], profile, support);
}

/** Step 2 of the body map: narrow the region the person pointed at. */
export function bodyDetailCard(region: BodyRegion, profile: Profile, support: SupportLevel = 'more'): Card {
  const asked = `Where in the ${region}?`;
  const base = { asked, pending: null, topic: region, kind: 'body' as const, bodyStep: 2 as const, region, source: 'code' as const, ms: 0, cloudPayload: null, notes: [], route: { to: 'device' as const, reasons: [] } };
  return paged(base, [...BODY_DETAIL[region]], 'somewhere else', profile, support);
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
  const card = noEscapeOnly(await makeCardInner(input, env));
  // §2.13: a blocked card is never shown to the person, so it carries no choices (not even an escape)
  return card.blocked ? { ...card, choices: [] } : card;
}

/** A choice card left with fewer than two answers is not shown (an escape alone can't be answered): just ask normally. */
function noEscapeOnly(card: Card): Card {
  if (card.kind !== 'choice' || card.blocked || card.choices.filter((c) => c.role === 'answer').length >= 2) return card;
  return {
    ...card, choices: [], say: `Just ask normally: ${card.asked}`,
    blocked: 'No good choices came out for this one, so there is no card. Just ask normally and give time.',
  };
}

async function makeCardInner(input: string, env: PipelineEnv): Promise<Card> {
  const [asked, pending] = splitQuestion(input);
  const { profile, support, engine } = env;
  const fixed = codeDetermined(asked, profile);

  let o: ModelOutput | null = null;
  let source: Source = 'code';
  let ms = 0;
  const notes: string[] = [];
  if (pending) notes.push('Two questions: showing the first. "Next" shows the second.');

  if (isQuiz(asked)) return { ...assemble(asked, pending, null, profile, support, 'code'), notes };
  if (!isPainLevel(asked) && !isBodyWhere(asked) && env.deviceReady) {
    try {
      const r = await engine.runDevice(devicePrompt(asked, profile));
      o = parseModelOutput(r.text);
      source = r.source;
      ms = r.ms;
    } catch (e) {
      notes.push(`On-device model failed: ${(e as Error).message}`);
    }
  }
  // Either-or: two independent candidates, the model's copied options and the code parser's pair. The first one that
  // passes the label check wins (model first). A valid code pair is never thrown away because a model ran
  // (REBUILD_SPEC §1.4 step 3: the "coffee or tea" bug). Only when neither passes does the card go to the cloud.
  let devicePair: [string, string] | null = null;
  let useRules = !o;
  if (o && offersOptions(asked)) {
    devicePair = validateOptions(o.options ?? [], asked, profile);
    if (devicePair) {
      notes.push('Options copied from the question by the on-device model.');
    } else {
      // the same pair the no-model path uses, so the card is identical in every engine state
      devicePair = codePair(asked, profile);
      if (devicePair) {
        notes.push("The on-device options did not pass the check; the options were read from the question in code.");
      } else {
        notes.push(orPair(asked) ? 'The on-device options did not pass the check, and the pair read from the question did not either.' : 'The on-device options did not pass the check.');
      }
    }
  } else if (o) {
    useRules = true;
  }

  const stripped = stripQuestion(asked, profile);
  const preview = JSON.stringify(engine.cloudRequest(stripped.text), null, 2);
  const cloudSwaps = swaps(stripped.map);

  if (!o && !fixed) {
    // Nothing on device and code can't fix the choices: never fall back silently. Use the cloud only if allowed.
    if (env.allowCloud && engine.cloudConfigured) {
      return cloudCard(asked, pending, stripped, preview, env, ['on-device model not available'], notes);
    }
    const card = assemble(asked, pending, null, profile, support, 'code');
    return {
      ...card, notes, unsentPayload: preview, cloudSwaps,
      blocked: engine.cloudConfigured
        ? 'The on-device model is not ready. Allow the cloud step (it gets only the question shown below), or prepare the on-device model.'
        : 'The on-device model is not ready and the cloud is not configured. Prepare the on-device model, or ask normally.',
    };
  }

  const card = assemble(asked, pending, o, profile, support, source, ms, devicePair, useRules);
  card.notes.push(...notes);
  if (card.route.to === 'cloud') {
    if (env.allowCloud && engine.cloudConfigured) {
      return cloudCard(asked, pending, stripped, preview, env, card.route.reasons, card.notes, card);
    }
    card.unsentPayload = preview;
    card.cloudSwaps = cloudSwaps;
    card.notes.push(engine.cloudConfigured
      ? 'The cloud would check this card, but the cloud step is off. Device card kept.'
      : 'The cloud would check this card, but the cloud is not configured yet. Device card kept.');
  }
  return card;
}

async function cloudCard(
  asked: string, pending: string | null, stripped: ReturnType<typeof stripQuestion>, preview: string,
  env: PipelineEnv, reasons: string[], notes: string[], fallback?: Card,
): Promise<Card> {
  // Last gate before anything leaves the device: no About-me term may be in the text (P0 privacy).
  const leaks = findLeaks(stripped.text, env.profile);
  if (leaks.length) {
    const base = fallback ?? assemble(asked, pending, null, env.profile, env.support, 'code');
    return { ...base, cloudPayload: null, unsentPayload: preview, notes: [...notes, 'Not sent: the question still held an About me word after stripping. Device card kept.'] };
  }
  try {
    const r = await env.engine.runCloud(stripped.text);
    const o = parseModelOutput(r.text);
    if (!o) throw new Error('cloud answer was not valid JSON');
    o.topic = restoreNames(o.topic, stripped.map).replace(/\b(?:Person|Food|Place|Show|Music|Thing|Name) [A-Z]\b/g, '').trim();
    o.choices = o.choices.map((c) => restoreNames(c, stripped.map));
    o.options = (o.options ?? []).map((c) => restoreNames(c, stripped.map));
    // either-or: the cloud's copied options pass the same check as the device's; the rules parser is not used here
    const cloudPair = offersOptions(asked) ? validateOptions(o.options, asked, env.profile) : null;
    let card = assemble(asked, pending, o, env.profile, env.support, r.source, r.ms, cloudPair, false);
    const cloudNotes: string[] = [];
    if (card.kind === 'choice' && card.choices.filter((c) => c.role === 'answer').length < 2) {
      // the cloud's options didn't hold up either (made up, or not fitting the question)
      const devAnswers = fallback ? fallback.choices.filter((c) => c.role === 'answer').length : 0;
      if (fallback && devAnswers >= 2) {
        card = { ...fallback, source: fallback.source };
        cloudNotes.push("The cloud's options didn't fit; device card kept.");
      } else if (/^\s*(which|what)\s+[a-z]+/i.test(asked)) {
        card = finish({ ...card, kind: 'choice' }, ['this one', 'that one'], ['something else'], env.profile, env.support);
        cloudNotes.push('The real options are not known: hold up two and point to each as you ask.');
      }
    }
    // keep the routing reasons; the cloud's own answer is not re-routed
    // "Sent" only when inferenceSource says the cloud answered. PREFER_IN_CLOUD runs on the device when offline:
    // then nothing left this computer and the card says so (REBUILD_SPEC §1.3 item 3).
    const sent = r.source === 'in-cloud';
    if (!sent) cloudNotes.push('Ran on this computer (offline). Nothing was sent.');
    return {
      ...card, route: { to: 'cloud', reasons }, cloudPayload: sent ? preview : null, unsentPayload: sent ? null : preview,
      ranOffline: !sent, cloudSwaps: swaps(stripped.map), notes: [...notes, ...card.notes, ...cloudNotes],
    };
  } catch (e) {
    const base = fallback ?? assemble(asked, pending, null, env.profile, env.support, 'code');
    // no answer came back, so nothing is claimed as sent; the payload is shown as what cloud help would get
    return { ...base, cloudPayload: null, unsentPayload: preview, cloudSwaps: swaps(stripped.map), notes: [...notes, `Cloud step failed (${(e as Error).message}); device card kept.`] };
  }
}

/** "Place A ← Whitby" lines for the partner's own screen (the real words never leave the device). */
function swaps(map: Record<string, string>): string[] {
  return Object.entries(map).map(([label, real]) => `${label} ← ${real}`);
}

// re-export for the UI
export { cloudPrompt };
