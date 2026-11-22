// Share with the care circle (phase 6, 18 Nov 2026): the text the carer can send to the family, or to the next carer
// before a shift. No server and no account: the text is built here, on the device, by rules; the carer sees the exact
// text on a sheet first (web/src/phase6.ts); then it leaves through the app the carer picks (the phone's share sheet,
// or the clipboard). Talk Partner keeps no copy.
//
// Rules only: no model reads the diary to write this text, and no model is handed it. This file imports the diary,
// the insights and the copy; no file that builds a prompt or a request imports it (tests/unit/phase6-share.test.ts).
//
// What goes in, and what never does:
//   - the "What stands out" lines as the rules wrote them (never a model's rewording), each with its level, its
//     fixed "whom to tell" sentence, the call sentence where the line carries the call box, and what it was counted
//     from; then the entries by day;
//   - the health notes ONLY when the carer ticked "Include the health notes". With the box off this file is not
//     handed them at all (`health: null`): the lines are then counted as if none were noted, so no sentence can state
//     one;
//   - never a photo: a diary entry holds no picture, and nothing here reads the photos;
//   - never the entry ids ("See the entries" stays on the device: the shared text is kept short).
//
// Never medical advice: the text says what was entered, whom to tell and when to call, and ends by saying that it
// does not say what to give or to do.

import { COPY } from './copy';
import { P5 } from './copy5';
import { P6 } from './copy6';
import { dayText, diaryText, eventGroups, guessTopic, inSpan, spanRange, tags, timeText, type DiaryEntry, type LogKind, type Span, type Tag } from './diary';
import { HEALTH_TOGGLES, NO_HEALTH, hasHealth, insights, type HealthNotes, type Insight } from './insights';
import type { Learned } from './prefs';
import { DEFAULT_NUMBER } from './redflag';
import { careAnswer } from './reliability';

const K = P6.share;
const I = COPY.simple.insights;
const WORDS = () => ({ log: COPY.simple.diary.log as Record<LogKind, string>, lessSure: COPY.simple.guard.lessSure, need: COPY.simple.diary.need });

/** "Sun 22 Nov, 12:00", by this device's clock. */
export const stampWhen = (at: number) => `${dayText(at)}, ${timeText(at)}`;

/** The health notes as lines of the text: the ticked boxes by their names, then the carer's own words. Empty when nothing is noted. */
export function healthLines(h: HealthNotes): string[] {
  return [...HEALTH_TOGGLES.filter((k) => h[k]).map((k) => `- ${COPY.simple.health.toggles[k]}`), ...(h.text.trim() ? [`- ${h.text.trim()}`] : [])];
}

/** One line of "What stands out" as text: the level, the line, the fixed sentence, the call sentence, what it was counted from. */
function insightText(x: Insight, i: number, number: string): string {
  if (x.id === 'nothing') return `${x.text}\n   ${K.from} ${x.base}`;
  return [`${i + 1}. ${I.level[x.level]}: ${x.text}${x.noted ? ` ${x.noted}` : ''}`, ...(x.act ? [`   ${x.act}`] : []), ...(x.urgent ? [`   ${K.callLine(number)}`] : []), `   ${K.from} ${x.base}`].join('\n');
}

export interface FamilyShare {
  /** The diary's tab: today, the last 7 days, the last 30 days. */
  span: Span;
  diary: DiaryEntry[];
  /** The health notes, ONLY when the carer ticked the box; null otherwise (the text then states none, and no line rests on one). */
  health: HealthNotes | null;
  name: string;
  now: number;
  /** The emergency number of the call sentences (About them; 911 by default). Not a health note. */
  number?: string;
}

/**
 * "Share with family": the span, the "What stands out" lines with their base lines and call lines, then the entries by
 * day. Pure: the same diary, notes and moment give the same text. For "Today" the lines are those of the last 7 days
 * (the diary's Today tab shows none of its own), so a red flag of this week is never left out of a text about today.
 */
export function familyText(m: FamilyShare): string {
  const number = m.number || DEFAULT_NUMBER;
  const health = m.health ?? NO_HEALTH;
  const span = m.span === 'month' ? 'month' : 'week';
  const lines = insights(m.diary, health, span, m.now, number);
  const entries = inSpan(m.diary, m.span, m.now);
  const { from } = spanRange(m.span, m.now);
  const title = m.span === 'today' ? K.title.today(m.name, dayText(m.now)) : K.title[m.span](m.name, dayText(from), dayText(m.now));
  const urgent = lines.some((l) => l.urgent);
  const noted = m.health && hasHealth(m.health) ? healthLines(m.health) : [];
  return [
    K.stamp(stampWhen(m.now)),
    ...(urgent ? [K.call(number, K.whereFamily)] : []),
    '',
    title,
    '',
    K.stands[span],
    ...(lines.length ? lines.map((l, i) => insightText(l, i, number)) : [K.standsNone]),
    I.footer,
    ...(noted.length ? ['', K.health, ...noted] : []),
    '',
    K.entries,
    entries.length ? diaryText(entries, WORDS()) : K.entriesNone[m.span],
    '',
    K.gap,
    K.noAdvice,
  ].join('\n');
}

export const HANDOVER_MS = 24 * 60 * 60 * 1000;

/**
 * The learned lines that may go into a handover note: a usual choice or a pattern by time of day, and never one about
 * pain, the body, a feeling or a need, never the needs board, and never a usual "no" (a note that says "usually says
 * no to a drink" could stop the next carer from offering one).
 */
export function handoverUsual(learned: Learned[]): string[] {
  return learned.filter(usualForOthers).map((l) => `- ${l.text}`);
}
/** One learned line may be read by someone outside the family (the next carer, a nurse): the rule of `handoverUsual`, also used by the communication passport (core/passport.ts). */
export function usualForOthers(l: Learned): boolean {
  // (phase 8, judge round 7: and never a usual "yes" to an offer: for a person whose tired yes may mean no, a printed
  // "usually says yes" is the line a new carer would lean on)
  return (l.kind === 'usual' || l.kind === 'time') && !!l.q && !careAnswer(l.q, '', guessTopic(l.q)) && !/\busually says (?:no|yes)\b|(?:: |, )(?:no|yes) in the /i.test(l.text);
}

/**
 * Phase 12 (judge round 9, a health P0): what About them shows of the learned lines, and what any other screen or
 * on-device step may read. A line about a care question (pain, the body, a feeling, the toilet, help: `careAnswer`,
 * as the handover note and the passport already filter) is left out: after three "no" to "Are you in pain?" the page
 * would otherwise say `Usually says no to "Are you in pain?"` and offer "Keep as a fact", which teaches a carer to stop
 * asking. A need of the board about pain, the toilet or "something's wrong" is still shown as counted, but marked
 * `care`, so it is never offered as a fact to keep. The counting in core/prefs.ts is unchanged.
 */
export function aboutLearned(lines: Learned[]): Learned[] {
  return lines.filter((l) => !(l.q && careAnswer(l.q, '', guessTopic(l.q)))).map((l) => (l.kind === 'need' && careAnswer('', l.key.replace(/^n:/, '')) ? { ...l, care: true } : l));
}

export interface HandoverShare {
  diary: DiaryEntry[];
  /** As in `FamilyShare`: only when the box is ticked. */
  health: HealthNotes | null;
  /** What was learned (core/prefs.ts), as About them shows it; filtered here by `handoverUsual`. */
  learned: Learned[];
  name: string;
  now: number;
  number?: string;
  /**
   * Phase 9 (judge round 8, the nurse's seat): the two notes that change what is safe to give, printed on every
   * handover note whether the health box is ticked or not (a next carer who does not know of a swallowing
   * difficulty or a fluid limit can do harm with a cup of tea). Only these two: the others stay behind the box.
   */
  safety?: { swallowing: boolean; fluidLimit: boolean };
}

/** The notes `handoverText` prints whatever the box says (`HandoverShare.safety`), by name, for the sheet's lines. */
export const ALWAYS_NOTES = ['swallowing', 'fluidLimit'] as const;

/** "Sat 17:00" for a moment of the last 24 hours (two calendar days can be in it). */
const shortWhen = (at: number) => `${dayText(at).split(' ')[0]} ${timeText(at)}`;
const listed = (xs: string[]) => xs.join(', ');

/**
 * "For the next carer": the last 24 hours (drinks, food, toilet, pain, falls, tablets taken), then the usual choices.
 * Pure. Each line says what was entered and never what it means; "none entered" is said as a gap that may be one; a
 * strong pain, a pain in the head or the chest and every fall carry whom to tell and when to call.
 */
export function handoverText(m: HandoverShare): string {
  const number = m.number || DEFAULT_NUMBER;
  const from = m.now - HANDOVER_MS;
  const entries = m.diary.filter((e) => e.at > from && e.at <= m.now).sort((a, b) => a.at - b.at);
  const has = (e: DiaryEntry, t: Tag) => tags(e).includes(t);
  const count = (t: Tag) => eventGroups(entries, t);
  const drinks = count('drink');
  const food = count('food');
  const toilet = count('toilet');
  const pain = entries.filter((e) => has(e, 'pain'));
  const hard = entries.filter((e) => has(e, 'strong-pain') || has(e, 'place-pain'));
  const falls = entries.filter((e) => has(e, 'fall'));
  const heads = falls.filter((e) => has(e, 'fall-head'));
  const tablets = entries.filter((e) => has(e, 'tablets'));
  // (in a note for the hours after it, every fall carries the call sentence, a blow to the head noted or not)
  const urgent = hard.length > 0 || falls.length > 0;
  const fluid = !!m.health?.fluidLimit || !!m.safety?.fluidLimit;
  const always = [...(m.safety?.swallowing || m.health?.swallowing ? [`- ${K.hSwallow}`] : []), ...(fluid ? [`- ${K.hFluidAlways}`] : [])];
  // (the two notes printed under ALWAYS are not printed a second time among the ticked ones)
  const noted = m.health && hasHealth(m.health) ? healthLines({ ...m.health, swallowing: false, fluidLimit: false }) : [];
  const painItem = (e: DiaryEntry) => `${shortWhen(e.at)} ${e.kind === 'log' ? COPY.simple.diary.log.pain : e.kind === 'need' ? `${COPY.simple.diary.need} ${e.label}` : `${e.q} ${e.label}`}`;
  const body = !entries.length ? [K.hNothing] : [
    drinks.length ? `${K.hCount(K.hDrinks, drinks.length, listed(drinks.map((g) => shortWhen(g.at))))}${fluid ? ` ${K.hFluid}` : drinks.length < 3 ? ` ${K.hFewDrinks}` : ''}` : `${K.hNoDrink}${fluid ? ` ${K.hFluid}` : ''}`,
    food.length ? K.hCount(K.hFood, food.length, listed(food.map((g) => shortWhen(g.at)))) : K.hNoFood,
    toilet.length ? K.hCount(K.hToilet, toilet.length, listed(toilet.map((g) => shortWhen(g.at)))) : K.hNoToilet,
    pain.length ? `${K.hPain(pain.map(painItem).join('; '))} ${hard.length ? P5.insights.painAct(number) : K.hPainAsk}` : K.hNoPain,
    falls.length ? `${K.hFalls(falls.length, listed(falls.map((e) => shortWhen(e.at))))}${heads.length ? ` ${K.hFallHead(listed(heads.map((e) => shortWhen(e.at))))}` : ''} ${P5.insights.fallAct} ${P5.insights.fallHeadAct(number)}` : K.hNoFalls,
    tablets.length ? K.hTablets(listed(tablets.map((e) => shortWhen(e.at)))) : K.hNoTablets,
  ];
  const usual = handoverUsual(m.learned);
  return [
    K.stamp(stampWhen(m.now)),
    ...(urgent ? [K.call(number, K.whereHandover)] : []),
    '',
    K.hTitle(m.name, shortWhen(from), shortWhen(m.now)),
    '',
    ...body,
    ...(always.length ? ['', K.hAlways, ...always] : []),
    ...(noted.length ? ['', K.health, ...noted] : []),
    '',
    K.usual(m.name),
    ...(usual.length ? usual : [K.usualNone]),
    K.usualNever,
    '',
    K.gap,
    K.noAdvice,
  ].join('\n');
}

/** The health notes that change what is safe to give, by name, for the sheet's warning while the box is off. */
export function riskyNotes(h: HealthNotes): string[] {
  return (['fluidLimit', 'swallowing', 'diabetes'] as const).filter((k) => h[k]).map((k) => COPY.simple.health.toggles[k].toLowerCase());
}

/** Whether the text carries the call sentence (for the sheet's markup; the text itself is what is shared). */
export const hasCall = (text: string, number: string = DEFAULT_NUMBER) => text.includes(`Call ${number || DEFAULT_NUMBER} now`);
