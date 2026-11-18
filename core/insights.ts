// Insights for a week or a month: what stands out in the diary, for the carer to read and, where it fits, to mention to
// the doctor or nurse.
//
// What is rules and what is AI:
//   - COUNTING, THRESHOLDS AND RED FLAGS ARE RULES, on this device, always (they work offline on a phone). No model
//     decides what stands out, how serious a line is, or what its numbers are.
//   - WORDING ONLY may be a model's (core/reword.ts): the rules write every line themselves; where the browser has
//     Gemini Nano the lines are put into plainer words on the device (ONLY_ON_DEVICE); on a phone, online help may do
//     that, only after the carer said yes on a sheet that shows the exact text. Code checks what comes back and keeps
//     the rules' own words otherwise. The level ("Worth mentioning to the doctor or nurse"), the base of each line
//     and the footer are fixed text that no model touches.
//
// Never medical advice: no diagnosis, no medicine, no dose, no diet plan. A line says what was counted and from what
// ("only what was entered here"), and at most that it is worth mentioning to the doctor or nurse.
//
// Health notes change the thresholds (`thresholds`): with diabetes noted, fewer sweet choices are enough to mention;
// with reminders noted, a day with few drinks is worth mentioning sooner; with swallowing difficulty noted, a day with
// no food in it is mentioned; with a fluid limit from the doctor, the app never suggests more to drink in any words
// (tests/unit/insights.test.ts), and a day with many drinks is mentioned instead.
//
// Privacy: the health notes and the diary stay on this device. `insightCloudText` builds the only text of this file
// that may go to online help: the rules' own lines and their bases, with the sentences that state a health note
// taken out, and no name (the lines never hold one). The carer's free text is in the on-device prompt only.

import { COPY } from './copy';
import { P5 } from './copy5';
import { DEFAULT_NUMBER } from './redflag';
import { P6 } from './copy6';
import { byDay, dayStart, dayText, eventGroups, events, inSpan, tags, SPAN_DAYS, type DiaryEntry, type Tag } from './diary';

export interface HealthNotes {
  /** The carer's own words. On this device only; in the on-device prompt, never in a cloud request. */
  text: string;
  diabetes: boolean;
  swallowing: boolean;
  /** The doctor set a fluid limit: the app never suggests more to drink. */
  fluidLimit: boolean;
  /** Needs reminders to drink and eat. */
  reminders: boolean;
  /** The emergency number the call buttons use, as the carer typed it ('' = 911). Not a health note: it is in no prompt and no request. */
  emergency: string;
}
export const NO_HEALTH: HealthNotes = { text: '', diabetes: false, swallowing: false, fluidLimit: false, reminders: false, emergency: '' };
export const HEALTH_TEXT_MAX = 600;
export const HEALTH_TOGGLES = ['diabetes', 'swallowing', 'fluidLimit', 'reminders'] as const;

/** Whatever was stored, as health notes: unknown fields are dropped, a missing one is off. */
export function cleanHealth(h: unknown): HealthNotes {
  const x = (h ?? {}) as Partial<HealthNotes>;
  return { text: typeof x.text === 'string' ? x.text.slice(0, HEALTH_TEXT_MAX) : '', diabetes: x.diabetes === true, swallowing: x.swallowing === true, fluidLimit: x.fluidLimit === true, reminders: x.reminders === true, emergency: typeof x.emergency === 'string' ? x.emergency.replace(/[^\d+ ]/g, '').slice(0, 16) : '' };
}
export const hasHealth = (h: HealthNotes) => !!h.text.trim() || h.diabetes || h.swallowing || h.fluidLimit || h.reminders;

/**
 * Where a line came from (phase 6): the diary entries the rule counted, so the carer can look at them. Ids only: the
 * screen looks the entries up and draws them. Never part of a prompt or a request (no model is handed a diary entry).
 */
export interface Source {
  /** The entries behind the line, oldest first. */
  ids: string[];
  /** Among them: entries that were merged into another one and counted once with it (a card and a tap within 20 minutes; the answers of one conversation). Only on a line that states a count of events. */
  once: string[];
  /** For a line about something that is absent ("no drink"): the entries are that day's, and this says what is not among them. */
  note: string;
}

export type InsightSpan = 'week' | 'month';
export type Level = 'tell' | 'mention' | 'note';
export interface Insight {
  id: 'pain' | 'pain-day' | 'no-drink' | 'few-drinks' | 'many-drinks' | 'sweets' | 'no-food' | 'sleep' | 'mood' | 'fall' | 'less-sure' | 'nothing';
  /** 'tell': a red flag. 'mention': worth mentioning to the doctor or nurse. 'note': for the carer to keep in mind. */
  level: Level;
  /** What was counted, in plain words. The only part a model may put into plainer words. */
  text: string;
  /** A sentence that states a health note ("Diabetes is noted here."): shown after the text, fixed, never sent to online help. */
  noted: string;
  /** What it was counted from. Fixed text. */
  base: string;
  /** The text itself states a health note (a fluid limit, swallowing difficulty): the line is never sent to online help. */
  local?: boolean;
  /**
   * A fixed sentence after the line: whom to tell, and when to call. Rules' words only: a line that has one is never
   * handed to a model for rewording, on the device or online (phase 5).
   */
  act?: string;
  /** The boxed "Call [number] now if this is new or sudden", with the call button, stands under the line. */
  urgent?: boolean;
  /** In the 30-day view: a line of the last 7 days, kept so that the longer view does not hide what is recent. */
  recent?: boolean;
  /** The entries the line was counted from ("See the entries"). Empty for "nothing stands out". */
  source: Source;
}

export const MAX_INSIGHTS = 6;

export interface Thresholds {
  /** Pain on this many days of the span is a red flag. */
  painDays: number;
  /** A day with at least one and fewer than this many drinks entered is "few". */
  fewDrinks: number;
  /** "Few drinks" is worth mentioning (reminders are noted), not only a note. */
  fewDrinksMention: boolean;
  /** With a fluid limit: a day with this many drinks or more is mentioned. 0 = not looked at. */
  manyDrinks: number;
  /** Sweet choices in the span from which the line appears, and whether it is worth mentioning. */
  sweets: number;
  sweetsMention: boolean;
  /** A day with entries and no food is mentioned (swallowing difficulty is noted). */
  noFoodDay: boolean;
  badSleepDays: number;
  lessSure: number;
  /** "Sad" or "bad" on this many days of the span is worth mentioning. */
  lowMoodDays: number;
}

/** The thresholds for a span, as the health notes set them. Rules; the numbers are ours, not a clinical standard. */
export function thresholds(h: HealthNotes, span: InsightSpan): Thresholds {
  const weeks = span === 'week' ? 1 : 4;
  return {
    painDays: 3,
    fewDrinks: h.reminders ? 4 : 3,
    fewDrinksMention: h.reminders,
    manyDrinks: h.fluidLimit ? 8 : 0,
    sweets: (h.diabetes ? 3 : 6) * weeks,
    sweetsMention: h.diabetes,
    noFoodDay: h.swallowing,
    badSleepDays: 3,
    lessSure: 3,
    lowMoodDays: 3,
  };
}

const I = COPY.simple.insights;
const I5 = P5.insights;
const ORDER: Record<Level, number> = { tell: 0, mention: 1, note: 2 };
const daysOf = (ts: number[]) => [...new Set(ts.map(dayStart))].sort((a, b) => a - b);
const listed = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const names = (days: number[], max = 3) => listed(days.slice(-max).map(dayText));
const byTime = (es: DiaryEntry[]) => [...es].sort((a, b) => a.at - b.at).map((e) => e.id);
/** Every entry given, as the source of a line that counts days. */
const src = (es: DiaryEntry[], note = ''): Source => ({ ids: byTime(es), once: [], note });
/** The source of a line that counts events: every entry behind an event, with those merged into another marked. */
function counted(es: DiaryEntry[], tag: Tag): Source {
  const groups = eventGroups(es, tag);
  const once = new Set(groups.flatMap((g) => g.ids.slice(1)));
  const ids = byTime(es.filter((e) => groups.some((g) => g.ids.includes(e.id))));
  return { ids, once: ids.filter((id) => once.has(id)), note: '' };
}
const tagged = (es: DiaryEntry[], t: Tag) => es.filter((e) => tags(e).includes(t));
const merged = (xs: Source[]): Source => ({ ids: xs.flatMap((x) => x.ids), once: xs.flatMap((x) => x.once), note: '' });
export const NO_SOURCE: Source = { ids: [], once: [], note: '' };

/**
 * What stands out in the diary over the last 7 or 30 days, as at most five lines, the most serious first. Pure: the
 * same diary, notes and moment give the same lines. Today is counted for what happened (pain, sweets), and left out
 * of "nothing was entered that day" (the day is not over).
 */
function spanInsights(diary: DiaryEntry[], health: HealthNotes, span: InsightSpan, now: number, number: string): Insight[] {
  const entries = inSpan(diary, span, now);
  if (!entries.length) return [];
  const T = thresholds(health, span);
  const S = I.span[span];
  const out: Insight[] = [];
  const days = byDay(entries);
  const past = days.filter((d) => d.day !== dayStart(now)).sort((a, b) => a.day - b.day);

  // pain on three days or more: a red flag
  const painDays = daysOf(events(entries, 'pain'));
  if (painDays.length >= T.painDays) out.push({ id: 'pain', level: 'tell', text: I.pain(painDays.length, S), noted: '', base: `${I.painBase(names(painDays, 7))} ${I.only}`, source: src(tagged(entries, 'pain')) });

  // one day is enough for a strong pain ("quite bad", "very bad") or a pain in the head or the chest: the latest such
  // day is a line of its own, with whom to tell and when to call (judge round 6: a single day never showed)
  const hard = entries.filter((e) => tags(e).some((t) => t === 'strong-pain' || t === 'place-pain'));
  if (hard.length) {
    const hardDays = daysOf(hard.map((e) => e.at));
    const last = hardDays[hardDays.length - 1];
    const that = hard.filter((e) => dayStart(e.at) === last);
    const strong = [...new Set(that.filter((e) => tags(e).includes('strong-pain')).map((e) => e.label.toLowerCase()))];
    const places = [...new Set(that.filter((e) => tags(e).includes('place-pain')).map((e) => { const m = (e.q ?? '').match(/^Where in the (\w+)/i); const l = e.label.replace(/^your\s+/i, ''); return m ? `${m[1].toLowerCase()} (${l})` : l; }))];
    const text = [strong.length ? I5.strongPain(listed(strong), dayText(last)) : '', places.length ? I5.placePain(listed(places), dayText(last)) : ''].filter(Boolean).join(' ');
    const others = hardDays.slice(0, -1);
    out.push({ id: 'pain-day', level: 'mention', text, noted: '', base: `${[strong.length ? I5.strongPainBase : '', places.length ? I5.placePainBase : ''].filter(Boolean).join(' ')}${others.length ? ` Also on: ${names(others, 5)}.` : ''} ${I.only}`, act: I5.painAct(number), urgent: true, source: src(hard) });
  }

  // a whole day with entries and no drink among them: a red flag (18 Nov: said without the sentence that excused it)
  const dry = past.filter((d) => events(d.entries, 'drink').length === 0).map((d) => d.day);
  if (dry.length) out.push({ id: 'no-drink', level: 'tell', text: health.fluidLimit ? I.noDrinkFluid(names(dry)) : I5.noDrink(names(dry)), noted: '', base: `${I.noDrinkBase(Math.min(dry.length, 3))} ${I.only}`, ...(health.fluidLimit ? { local: true } : {}), source: src(past.filter((d) => dry.slice(-3).includes(d.day)).flatMap((d) => d.entries), P6.source.noDrink) });

  // something sweet, chosen often: worth mentioning when diabetes is noted, a note otherwise
  const sweets = events(entries, 'sweet').length;
  if (sweets >= T.sweets) out.push({ id: 'sweets', level: T.sweetsMention ? 'mention' : 'note', text: I.sweets(sweets, S), noted: T.sweetsMention ? I.sweetsDiabetes : '', base: `${I.sweetsBase(sweets, S)} ${I.only}`, source: counted(entries, 'sweet') });

  // a day with few drinks entered (the day with the fewest): worth mentioning (two drinks in a day is low for anyone).
  // With a fluid limit the line still shows, and says to check the day against the doctor's plan: never "more".
  {
    const low = past.map((d) => ({ day: d.day, n: events(d.entries, 'drink').length })).filter((x) => x.n > 0 && x.n < T.fewDrinks);
    const least = Math.min(...low.map((x) => x.n));
    // every day that has the fewest is named (two days with one drink each are both worth a look), the last three at most
    const few = low.filter((x) => x.n === least).map((x) => x.day).sort((a, b) => a - b).slice(-3);
    if (few.length) out.push({ id: 'few-drinks', level: 'mention', text: health.fluidLimit ? I5.fewDrinksFluid(names(few), least, few.length > 1) : I.fewDrinks(names(few), least, few.length > 1), noted: T.fewDrinksMention ? I.fewDrinksReminders : '', base: `${I.fewDrinksBase(least, few.length > 1)} ${I.only}`, ...(health.fluidLimit ? { local: true } : {}), source: merged(past.filter((d) => few.includes(d.day)).map((d) => counted(d.entries, 'drink'))) });
  }
  if (T.manyDrinks) {
    const many = days.map((d) => ({ day: d.day, n: events(d.entries, 'drink').length })).filter((x) => x.n >= T.manyDrinks).sort((a, b) => b.n - a.n)[0];
    if (many) out.push({ id: 'many-drinks', level: 'mention', text: I.manyDrinks(dayText(many.day), many.n), noted: '', base: `${I.manyDrinksBase(many.n)} ${I.only}`, local: true, source: counted(days.find((d) => d.day === many.day)!.entries, 'drink') });
  }

  // a fall: every one is worth mentioning; with a blow to the head noted, the line names it and the call box stands under it
  const falls = entries.filter((e) => tags(e).includes('fall'));
  if (falls.length) {
    const head = falls.filter((e) => tags(e).includes('fall-head'));
    out.push({ id: 'fall', level: 'mention', text: `${I5.fall(falls.length, names(daysOf(falls.map((e) => e.at)), 7))}${head.length ? ` ${I5.fallHead(names(daysOf(head.map((e) => e.at))))}` : ''}`, noted: '', base: `${I5.fallBase} ${I.only}`, act: head.length ? `${I5.fallAct} ${I5.fallHeadAct(number)}` : I5.fallAct, ...(head.length ? { urgent: true } : {}), source: src(falls) });
  }

  // "sad" or "bad" on three days or more: worth mentioning, with whom to talk to
  const lowDays = daysOf(entries.filter((e) => tags(e).includes('low-mood')).map((e) => e.at));
  if (lowDays.length >= T.lowMoodDays) out.push({ id: 'mood', level: 'mention', text: I5.mood(lowDays.length, S), noted: '', base: `${I5.moodBase(names(lowDays, 7))} ${I.only}`, act: I5.moodAct(number), source: src(tagged(entries, 'low-mood')) });

  // with swallowing difficulty noted: a day with entries and no food among them
  if (T.noFoodDay) {
    const unfed = past.filter((d) => events(d.entries, 'food').length === 0).map((d) => d.day);
    if (unfed.length) out.push({ id: 'no-food', level: 'mention', text: I.noFood(names(unfed)), noted: '', base: `${I.noFoodBase(Math.min(unfed.length, 3))} ${I.only}`, local: true, source: src(past.filter((d) => unfed.slice(-3).includes(d.day)).flatMap((d) => d.entries), P6.source.noFood) });
  }

  // "bad" nights
  const badNights = daysOf(events(entries, 'bad-sleep'));
  if (badNights.length >= T.badSleepDays) out.push({ id: 'sleep', level: 'mention', text: I.sleep(badNights.length, S), noted: '', base: `${I.sleepBase(names(badNights, 7))} ${I.only}`, source: src(tagged(entries, 'bad-sleep')) });

  // many answers the guard marked: the lines above are to be read with care
  const answers = entries.filter((e) => e.kind === 'answer');
  const unsure = answers.filter((e) => e.lessSure);
  if (unsure.length >= T.lessSure) out.push({ id: 'less-sure', level: 'note', text: I.lessSure(unsure.length, names(daysOf(unsure.map((e) => e.at))), daysOf(unsure.map((e) => e.at)).length > 1), noted: '', base: I.lessSureBase(unsure.length, answers.length, S), act: I5.lessSureNever, source: src(unsure) });

  if (!out.length) return [{ id: 'nothing', level: 'note', text: I.nothing(S), noted: '', base: `${I.nothingBase(entries.length, days.length)} ${I.only}`, source: NO_SOURCE }];
  return out;
}


/**
 * The lines of the span, the most serious first, six at most. The 30-day view keeps the lines of the last 7 days that
 * it would not show by itself (its own thresholds are four times higher), marked as recent: a month must not hide
 * this week (judge round 6). `number` is the emergency number the fixed sentences name (About them; 911 by default).
 */
export function insights(diary: DiaryEntry[], health: HealthNotes, span: InsightSpan, now: number, number: string = DEFAULT_NUMBER): Insight[] {
  let out = spanInsights(diary, health, span, now, number);
  if (span === 'month') {
    const have = new Set(out.map((x) => x.id));
    const week = spanInsights(diary, health, 'week', now, number).filter((x) => x.id !== 'nothing' && !have.has(x.id)).map((x) => ({ ...x, recent: true, base: `${I5.recent} ${x.base}` }));
    if (week.length) out = [...out.filter((x) => x.id !== 'nothing'), ...week];
  }
  const rank = (x: Insight) => ORDER[x.level] * 2 - (x.urgent ? 1 : 0);
  return out.map((x, i) => ({ x, i })).sort((a, b) => rank(a.x) - rank(b.x) || a.i - b.i).map((p) => p.x).slice(0, MAX_INSIGHTS);
}

/** How many entries of each kind the span holds: for the on-device prompt, and for nothing else. */
export function spanCounts(diary: DiaryEntry[], span: InsightSpan, now: number): Record<string, number> {
  const entries = inSpan(diary, span, now);
  const n = (t: Parameters<typeof events>[1]) => events(entries, t).length;
  return { days: SPAN_DAYS[span], daysWithEntries: byDay(entries).length, drinks: n('drink'), food: n('food'), sweet: n('sweet'), toilet: n('toilet'), pain: n('pain'), tired: n('tired'), lessSure: entries.filter((e) => e.lessSure).length, answers: entries.filter((e) => e.kind === 'answer').length, tagged: entries.filter((e) => tags(e).length > 0).length };
}

// ---------------------------------------------------------------- the texts a model may be handed (wording only)
/** The lines as a numbered list: the part of each that may be put into plainer words. */
const numbered = (lines: Insight[]) => lines.map((l, i) => `${i + 1}. ${l.text}`).join('\n');

/**
 * The text for online help: the rules' own lines, and nothing else. No name is in a line; a sentence that states a
 * health note is not in `text` (it is `noted`); a line whose text itself states one (`local`) is left out of the
 * request as a whole (`cloudLines`). The diary, the health notes and About them are not inputs of this
 * function, so they cannot be in what it returns.
 */
export function insightCloudText(lines: Insight[]): string {
  return numbered(cloudLines(lines));
}
/** The lines that may go to online help: every line that does not itself state a health note, and none that carries a fixed "whom to tell" sentence. */
export function cloudLines(lines: Insight[]): Insight[] {
  return lines.filter((l) => l.id !== 'nothing' && !l.local && !l.act);
}

/**
 * The text for the on-device model (ONLY_ON_DEVICE): the same lines, and under them what the carer noted, so the
 * plainer words can fit the person. It is never handed to a cloud step.
 */
export function insightDevicePrompt(lines: Insight[], health: HealthNotes): string {
  const noted = [...HEALTH_TOGGLES.filter((k) => health[k]).map((k) => COPY.simple.health.toggles[k]), health.text.trim()].filter(Boolean);
  return `${numbered(lines)}${noted.length ? `\nFor context only, do not repeat it and do not advise on it. The carer noted: ${noted.join('; ')}.` : ''}`;
}
