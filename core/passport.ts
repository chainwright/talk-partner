// The communication passport (phase 7, 18 Nov 2026): "How to talk with Frank", one printable page that travels with
// the person, for a new paid carer, a hospital nurse, a grandchild. The classic AAC artefact, built from what the
// family already put into the app.
//
// Rules only: the page is built here, on the device, from About them (names, people, foods, places), from what was
// counted from the confirmed answers (core/prefs.ts, and the words found by their first letter), and from fixed
// lines: the partner rules this app is built on, and the emergency text of phase 5 word for word. No model reads any
// of it or writes a line, and no file that builds a prompt or a request imports this one
// (tests/unit/phase7-passport.test.ts).
//
// What the carer controls: every line. Each fixed "how to talk" line and each learned line can be taken off the page;
// how yes and no are shown is typed by the carer (the app never infers it); up to three lines of the carer's own can
// be added. The one part that cannot be taken off is "If something is wrong": the emergency number and when to call.
//
// What never goes on it: a habit about pain, the body, a feeling or a need, and a usual "no" (the rule of the note
// for the next carer, core/share.ts: a page that says "usually says no to a drink" could stop a nurse from offering
// one); the needs board; the health notes; the diary. A photo is on the printed page only, never in the shared text.
// The app does not know anyone's pronouns: every line uses the name, or "they".

import { P4 } from './copy4';
import { P5 } from './copy5';
import { P6 } from './copy6';
import { P8 } from './copy8';
import { dayText, guessTopic, timeText } from './diary';
import type { Learned } from './prefs';
import { DEFAULT_NUMBER } from './redflag';
import { careAnswer } from './reliability';
import { usualForOthers } from './share';
import type { Profile } from './types';

export const OWN_MAX = 3;
export const OWN_LEN = 120;
export const YESNO_LEN = 80;
/** A thing is named under "likes to talk about" from this many answers on. */
export const LIKE_MIN = 2;
export const LIKES_MAX = 6;
export const WORDS_MAX = 8;

/** What the carer set for the page (IndexedDB key 'passport'): on this device only. */
export interface PassportPrefs {
  /** How yes and how no are shown, in the carer's words. */
  yes: string;
  no: string;
  /** The lines taken off the page, by their keys. */
  off: string[];
  /** Phase 8: the lines that are off until ticked (OFF_UNTIL_TICKED), ticked by the carer. */
  on: string[];
  /** The carer's own lines. */
  own: string[];
  /** The photos and initials are on the printed page. */
  photos: boolean;
}
export const NO_PASSPORT: PassportPrefs = { yes: '', no: '', off: [], on: [], own: [], photos: true };
/**
 * Phase 8 (judge round 7, the nurse's, the SLP's and the person's seats): "knows what to say" and "understands most
 * of what you say" state a fact about the person that the family did not enter (false in some kinds of aphasia, and a
 * nurse may over-read comprehension, for consent). They are off until the carer ticks them, labelled "Tick if true".
 */
export const OFF_UNTIL_TICKED = ['sca:knows', 'sca:understands'];
const tidy = (s: unknown, max: number) => (typeof s === 'string' ? s.replace(/[<>{}[\]\\]/g, '').replace(/\s+/g, ' ').slice(0, max) : '');
/** Whatever was stored, as the carer's settings of the page: unknown fields are dropped, text is cut to its length. */
export function cleanPassport(raw: unknown): PassportPrefs {
  const x = (raw ?? {}) as Partial<PassportPrefs>;
  return {
    yes: tidy(x.yes, YESNO_LEN), no: tidy(x.no, YESNO_LEN),
    off: Array.isArray(x.off) ? x.off.filter((k): k is string => typeof k === 'string').slice(0, 200) : [],
    on: Array.isArray(x.on) ? x.on.filter((k): k is string => typeof k === 'string' && OFF_UNTIL_TICKED.includes(k)) : [],
    own: Array.from({ length: OWN_MAX }, (_, i) => tidy(Array.isArray(x.own) ? x.own[i] : '', OWN_LEN)),
    photos: x.photos !== false,
  };
}
/** A line taken off the page, or put back. */
export function toggleLine(p: PassportPrefs, key: string): PassportPrefs {
  if (OFF_UNTIL_TICKED.includes(key)) { const on = p.on ?? []; return { ...p, on: on.includes(key) ? on.filter((k) => k !== key) : [...on, key] }; }
  return { ...p, off: p.off.includes(key) ? p.off.filter((k) => k !== key) : [...p.off, key] };
}

export interface PassLine {
  /** Stable for the same line: "sca:check", "about:people", "word:bo", "like:tom", a learned line's own key. */
  key: string;
  text: string;
  /** The carer can take it off the page. */
  removable: boolean;
  /** It is on the page. */
  on: boolean;
  /** For the carer only, beside the line while the page is being set up. */
  hint?: string;
}
export type PassSectionId = 'how' | 'yesno' | 'about' | 'words' | 'likes' | 'own' | 'wrong';
export interface PassSection { id: PassSectionId; heading: string; lines: PassLine[]; /** Printed under the lines of the section. */ notes: string[] }
export interface Passport { title: string; sections: PassSection[]; footer: string }

export interface PassportInput {
  profile: Profile;
  /** The confirmed answers on this device (core/history.ts), from after "Forget everything learned". */
  history: { q: string; label: string; at: number; lessSure?: boolean }[];
  /** What was learned, as About them shows it (core/prefs.ts). */
  learned: Learned[];
  /** The words of the family's own photos (the pictures themselves are not handed in). */
  photoWords: string[];
  prefs: PassportPrefs;
  now: number;
  device: string;
  /** The number the call buttons use. */
  number?: string;
  /** Phase 8: the number as About them holds it ('' when not filled in: the page then names none). Absent: `number` stands. */
  numberSet?: string;
  /** Phase 8: About them notes diabetes, swallowing difficulty or a fluid limit (the food line then says to ask the family). Never which. */
  foodCare?: boolean;
}

const lc = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
const clean = (xs: string[] | undefined) => (xs ?? []).map((x) => x.replace(/\s+/g, ' ').trim()).filter(Boolean);
const escRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** A first-letter card's question, as the app asks it (core/copy4.ts, cardAsk). */
export const LETTER_Q = /^It starts with [A-Z]\. Is it one of these\?$/;
/** The same question, and the one a typed word stands under, as what was learned keeps them (without the question mark). */
const HELPER_Q = /^(?:It starts with [A-Z]\. Is it one of these|Is this it|What is it about|What would you like to do)\??$/;
const NOT_A_WORD = /^(?:yes|no|not sure|something else|someone else|somewhere else)$/i;
/** An offer: "Would you like to call Tom?", "Shall we talk more about Bo?". A yes to it counts for the thing it names. */
const OFFER = /^(?:would you like|do you want|shall we)\b/i;
/** A line about pain, the body, a feeling or a need, or a usual "no": never on the page. */
const careLine = (text: string) => careAnswer(text, '', guessTopic(text)) || /\busually says no\b|(?:: |, )no in the /i.test(text);

/** The words the person found by their first letter, with how often, most often first. Never a care word. */
export function letterWords(history: PassportInput['history']): { word: string; n: number }[] {
  const m = new Map<string, { word: string; n: number }>();
  for (const h of history) {
    if (h.lessSure) continue; // (phase 8: an answer the answer check marked is not counted)
    if (!LETTER_Q.test(h.q) || NOT_A_WORD.test(h.label.trim()) || !h.label.trim() || careAnswer(h.label, h.label)) continue;
    const k = lc(h.label);
    const e = m.get(k);
    if (e) e.n++; else m.set(k, { word: h.label.trim(), n: 1 });
  }
  return [...m.values()].sort((a, b) => b.n - a.n).slice(0, WORDS_MAX);
}

/**
 * What the person chose to talk about: the people of About them and the words of the family's photos, each with how
 * often it was the confirmed answer, or the answer was yes to an offer that names it. Twice at least. A count of
 * choices, never a reading of feelings: the line says so.
 */
export function likes(history: PassportInput['history'], profile: Profile, photoWords: string[]): { word: string; n: number }[] {
  const terms = new Map<string, string>();
  for (const p of profile.people) for (const n of [p.nickname ?? '', p.name]) if (n.trim() && !terms.has(lc(n))) terms.set(lc(n), n.trim());
  for (const w of photoWords) if (w.trim() && !terms.has(lc(w))) terms.set(lc(w), w.trim());
  const out: { word: string; n: number }[] = [];
  for (const [k, word] of terms) {
    if (careAnswer(word, word)) continue;
    const named = new RegExp(`(?:^|[^\\p{L}\\p{N}])${escRe(k)}(?:$|[^\\p{L}\\p{N}])`, 'iu');
    const n = history.filter((h) => !h.lessSure).filter((h) => lc(h.label) === k || (lc(h.label) === 'yes' && OFFER.test(h.q.trim()) && named.test(h.q) && !careAnswer(h.q))).length;
    if (n >= LIKE_MIN) out.push({ word, n });
  }
  return out.sort((a, b) => b.n - a.n).slice(0, LIKES_MAX);
}

/** The page: every line it could hold, each marked on or off as the carer left it. Pure. A section with no line is not there. */
export function passport(m: PassportInput): Passport {
  const K = P8.passport;
  const name = m.profile.personName.trim();
  const number = m.number || DEFAULT_NUMBER;
  const off = new Set(m.prefs.off);
  const ticked = new Set(m.prefs.on ?? []);
  const line = (key: string, text: string, hint?: string): PassLine => ({ key, text, removable: true, on: OFF_UNTIL_TICKED.includes(key) ? ticked.has(key) : !off.has(key), ...(hint ? { hint } : {}) });
  const fixed = (key: string, text: string): PassLine => ({ key, text, removable: false, on: true });

  const how: PassLine[] = [
    line('sca:knows', K.knows(name), K.tickIfTrue(name)),
    line('sca:understands', K.understands(name), K.tickIfTrue(name)),
    line('sca:choices', K.choices),
    line('sca:check', K.check),
    line('sca:answer', K.answer(name)),
  ];
  const yes = m.prefs.yes.trim();
  const no = m.prefs.no.trim();
  const yesno: PassLine[] = [...(!yes && !no ? [fixed('yesno:empty', K.yesNoEmpty)] : [fixed('yesno:yes', K.yes(yes || K.oneEmpty)), fixed('yesno:no', K.no(no || K.oneEmpty))]), fixed('yesno:tired', K.tiredYes)];

  const people = m.profile.people.filter((p) => p.name.trim()).map((p) => { const tags = [p.relation.trim(), p.household ? K.livesHere : ''].filter(Boolean); return `${p.name.trim()}${tags.length ? ` (${tags.join(', ')})` : ''}`; });
  const lists: [string, string[], (l: string) => string][] = [['about:foods', clean(m.profile.foods), (l) => K.foods(l, m.foodCare ? K.foodAsk : '')], ['about:places', clean(m.profile.places), K.places], ['about:tv', clean(m.profile.tv), K.tv], ['about:music', clean(m.profile.music), K.music]];
  const about: PassLine[] = [
    ...(people.length ? [line('about:people', K.people(people.join(', ')))] : []),
    ...lists.filter(([, xs]) => xs.length).map(([key, xs, text]) => line(key, text(xs.join(', ')))),
    ...clean(m.profile.other).filter((f) => !careLine(f)).map((f) => line(`fact:${lc(f)}`, K.fact(f))),
  ];

  const words: PassLine[] = [
    ...letterWords(m.history).map((w) => line(`word:${lc(w.word)}`, K.letterWord(w.word, w.n))),
    // (a usual answer to the first-letter card or to a typed word is not a habit: the words themselves stand above)
    ...m.learned.filter(usualForOthers).filter((l) => !HELPER_Q.test(l.q.trim())).map((l) => line(l.key, l.text)),
  ];
  const liked: PassLine[] = likes(m.history, m.profile, m.photoWords).map((x) => line(`like:${lc(x.word)}`, K.like(x.word, x.n)));
  const own: PassLine[] = m.prefs.own.map((t, i) => ({ t: t.trim(), i })).filter((x) => x.t).map((x) => fixed(`own:${x.i}`, x.t));
  const S = P5.sudden;
  // (phase 8: no number in About them, no number on the page: a printed 911 in a home in Leeds would be wrong)
  const unset = m.numberSet !== undefined && !m.numberSet.trim();
  const wrong: PassLine[] = [
    fixed('wrong:number', unset ? K.noNumber : K.emergency(number)),
    // (phase 18, judge round 13, the hound's H1: chest pain left the "new or sudden" list for its own line, first)
    fixed('wrong:chest', S.chest(unset ? 'the emergency number' : number)),
    fixed('wrong:lead', S.lead(unset ? 'the emergency number' : number)),
    ...S.fast.map(([k, v], i) => fixed(`wrong:fast${i}`, `${k}: ${v}`)),
    fixed('wrong:also', `${S.alsoHeading}: ${S.also.join(' ')}`),
    fixed('wrong:not', S.notSudden),
    fixed('wrong:health', K.noHealth),
  ];
  const sections: PassSection[] = [
    { id: 'how', heading: K.sec.how, lines: how, notes: [] },
    { id: 'yesno', heading: K.sec.yesno(name), lines: yesno, notes: [] },
    { id: 'about', heading: K.sec.about(name), lines: about, notes: [] },
    { id: 'words', heading: K.sec.words, lines: words, notes: [K.wordsNote(name), K.wordsNever] },
    { id: 'likes', heading: K.sec.likes(name), lines: liked, notes: [K.likesNote] },
    { id: 'own', heading: K.sec.own, lines: own, notes: [] },
    { id: 'wrong', heading: K.sec.wrong, lines: wrong, notes: [] },
  ];
  return { title: K.title(name), sections: sections.filter((s) => s.lines.length > 0), footer: K.footer(dayText(m.now), m.device) };
}

/** The sections as they are printed: only the lines left on, and no section that has none. */
export function printed(p: Passport): PassSection[] {
  return p.sections.map((s) => ({ ...s, lines: s.lines.filter((l) => l.on) })).filter((s) => s.lines.length > 0);
}

/** The page as plain text, for the share sheet: the lines the carer left on, under the first line every shared text has. No photo. */
export function passportText(m: PassportInput): string {
  const p = passport(m);
  return [
    P6.share.stamp(`${dayText(m.now)}, ${timeText(m.now)}`),
    '',
    p.title.toUpperCase(),
    ...printed(p).flatMap((s) => ['', s.heading.toUpperCase(), ...s.lines.map((l) => `- ${l.text}`), ...s.notes]),
    '',
    p.footer,
  ].join('\n');
}

/** The first-letter card's question is the one this file looks for in the history (a test holds the two together). */
export const letterAsk = (letter: string) => P4.letter.cardAsk(letter);
