// Phase 9 (18 Nov 2026), the fixes of judge round 8. Every new or changed line is walked on its worst case: could it
// make a tired carer dismiss pain or a need?
import { describe, expect, it } from 'vitest';
import { COPY } from '../../core/copy';
import { LATER_LABEL, answerEntry, diaryText, laterEntry, logEntry, needEntry, tags, type DiaryEntry } from '../../core/diary';
import { NO_HEALTH, cloudLines, insights } from '../../core/insights';
import { LATER_MS, addLater, cleanLater, doneLater, laterCare, laterPain, noLastTime, shownLater } from '../../core/later';
import { P8 } from '../../core/copy8';
import { after, treeEnds } from '../../core/tree';
import { EMPTY_PROFILE } from '../../core/types';
import { sinceLines } from '../../core/since';
import { laterBlock } from '../../web/src/simple';
import { NOW, when } from './week';

const H = 3_600_000;
/** The HTML with the apostrophe put back (esc writes &#39;). */
const un = (h: string) => h.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');

describe('1. P0 health: a care question left for later (pain, the body, the toilet, a drink, feelings)', () => {
  it('knows a care question by its topic or its words; "tea or coffee?" is not one', () => {
    for (const q of ['Are you in pain?', 'Does it hurt?', 'Do you need the toilet?', 'Would you like something to drink?', 'Are you thirsty?', 'How are you feeling?', 'Is something wrong?']) expect(laterCare(q), q).toBe(true);
    expect(laterCare('Shall we go out?', 'body')).toBe(true);
    for (const q of ['Would you like tea or coffee?', 'Shall we watch the football?', 'Do you want to call Beth?']) expect(laterCare(q), q).toBe(false);
    expect(laterPain('Are you in pain?')).toBe(true);
    expect(laterPain('Do you need the toilet?')).toBe(false);
  });
  it('worst case: pain left for later 30 hours ago is still on Home, pinned first, with the "don\'t wait" line', () => {
    let xs = addLater([], 'Are you in pain?', NOW - 30 * H);
    xs = addLater(xs, 'Would you like tea or coffee?', NOW - 60_000);
    xs = addLater(xs, 'Shall we go out?', NOW - 2 * 60_000);
    const shown = shownLater(xs, NOW);
    expect(shown.map((x) => x.q)).toEqual(['Are you in pain?', 'Would you like tea or coffee?', 'Shall we go out?']);
    expect(shown[0]).toMatchObject({ care: true, pain: true });
    const html = un(laterBlock(shown.map((x, i) => ({ q: x.q, time: '14:37', i, care: !!x.care, pain: !!x.pain }))));
    expect(html).toContain("If the pain is new or strong, don't wait: call the nurse or doctor.");
    expect((html.match(/later-pain/g) ?? []).length).toBe(1);
    expect(html).toContain(COPY.simple.later.careNote);
    // a week on, still there; an ordinary question of the same age is gone
    const week = addLater(addLater([], 'Do you need the toilet?', NOW - 7 * 24 * H), 'Shall we go out?', NOW - 7 * 24 * H);
    expect(shownLater(week, NOW).map((x) => x.q)).toEqual(['Do you need the toilet?']);
  });
  it('worst case: "Done" then "Not yet" keeps the pain question; only "Yes, I found out" takes it off', () => {
    const xs = addLater([], 'Are you in pain?', NOW - 30 * H);
    const pain = xs[0];
    expect(doneLater(xs, pain, false)).toEqual(xs);
    expect(shownLater(doneLater(xs, pain, false), NOW).map((x) => x.q)).toEqual(['Are you in pain?']);
    expect(doneLater(xs, pain, true)).toEqual([]);
    // "Done" asks first: the block shows "Did you find out?" with Yes and Not yet, and no second "Done"
    const asking = un(laterBlock([{ q: pain.q, time: '14:37', i: 0, care: true, pain: true, asking: true }]));
    expect(asking).toContain('Did you find out?');
    expect(asking).toContain('data-act="later-found"');
    expect(asking).toContain('data-act="later-notyet"');
    expect(asking).not.toContain('data-act="later-done"');
    expect(asking).toContain("don't wait");
  });
  it('other questions keep the phase 8 behaviour: the newest two of a day, "Done" at once', () => {
    let xs = addLater([], 'Would you like tea or coffee?', NOW - 3 * H);
    xs = addLater(xs, 'Shall we go out?', NOW - 2 * H);
    xs = addLater(xs, 'Shall we watch TV?', NOW - H);
    xs = addLater(xs, 'Old one?', NOW - LATER_MS - 1);
    expect(shownLater(xs, NOW).map((x) => x.q)).toEqual(['Shall we watch TV?', 'Shall we go out?']);
    expect(doneLater(xs, xs[xs.length - 1], false)).toHaveLength(xs.length - 1);
    const html = un(laterBlock([{ q: 'Shall we go out?', time: '14:37', i: 0 }]));
    expect(html).toContain(COPY.simple.later.note);
    expect(html).not.toContain("don't wait");
  });
  it('care questions are never pushed out by many ordinary ones, and survive a reload (by their words)', () => {
    let xs = addLater([], 'Are you in pain?', NOW - 50 * H);
    for (let i = 0; i < 20; i++) xs = addLater(xs, `Shall we do thing ${i}?`, NOW - (20 - i) * 60_000);
    expect(xs.some((x) => x.q === 'Are you in pain?')).toBe(true);
    const back = cleanLater(JSON.parse(JSON.stringify(xs)));
    expect(shownLater(back, NOW)[0]).toMatchObject({ q: 'Are you in pain?', care: true, pain: true });
    // a row stored by phase 8 (no flags) is known again as a care question
    expect(cleanLater([{ q: 'Do you need the toilet?', at: 1 }])).toEqual([{ q: 'Do you need the toilet?', at: 1, care: true }]);
  });
  it('is written to the diary as "left for later", counts as nothing, and the visit page names it', () => {
    const e = laterEntry('Are you in pain?', when(5, '14:37'), 'body');
    expect(e).toMatchObject({ kind: 'later', q: 'Are you in pain?', label: LATER_LABEL, topic: 'body' });
    expect(tags(e)).toEqual([]);
    expect(diaryText([e], { log: COPY.simple.diary.log, lessSure: 'less sure', need: 'Pointed to' })).toContain('14:37  Left for later: Are you in pain?');
    const diary: DiaryEntry[] = [logEntry('drank', when(4, '09:00')), e];
    const s = sinceLines(diary, when(0, '00:00'), NOW);
    const line = s.lines.find((l) => l.startsWith('Left for later'))!;
    expect(line).toBe('Left for later: "Are you in pain?" (Sat 21 Nov). Ask about it at the visit if it was not asked again.');
    expect(s.sources[s.lines.indexOf(line)].ids).toEqual([e.id]);
    // nothing left for later: no such line
    expect(sinceLines([logEntry('drank', when(4, '09:00')), answerEntry({ q: 'Tea?', label: 'tea', at: when(4, '10:00') })], when(0, '00:00'), NOW).lines.join(' ')).not.toContain('Left for later');
  });
});

describe('2. P0 health: "Nothing stands out" never stands over a pain, a fall, a low day, "something\'s wrong" or a day with no drink', () => {
  const day = (d: number) => [logEntry('drank', when(d, '08:00')), logEntry('ate', when(d, '08:30')), logEntry('drank', when(d, '12:00')), logEntry('drank', when(d, '16:00'))];
  const calm = [...day(0), ...day(1), ...day(2), ...day(3), ...day(4), ...day(5)];
  const ids = (xs: { id: string }[]) => xs.map((x) => x.id);
  it('a calm week: "Nothing stands out", and only then', () => {
    expect(ids(insights(calm, NO_HEALTH, 'week', NOW))).toEqual(['nothing']);
  });
  it('worst case of the round: a yes to pain on 2 days gives its own line, with the fixed "ask again, tell" sentence', () => {
    const pain = (d: number) => answerEntry({ q: 'Are you in pain?', label: 'yes', at: when(d, '09:00') }, 'body');
    const xs = insights([...calm, pain(1), pain(3)], NO_HEALTH, 'week', NOW);
    expect(ids(xs)).toEqual(['pain-some']);
    expect(xs[0]).toMatchObject({ level: 'mention', text: 'Pain was chosen or logged on 2 days in the last 7 days.', act: 'Ask again today, and tell the doctor or nurse if it is new or still there.' });
    expect(`${xs[0].text} ${xs[0].act}`).toBe('Pain was chosen or logged on 2 days in the last 7 days. Ask again today, and tell the doctor or nurse if it is new or still there.');
    // a line with a fixed sentence is never handed to a model to reword
    expect(cloudLines(xs)).toEqual([]);
  });
  it('one pain of each kind: a logged "Pain", "pain" on the needs board, a place on the body card, "a little" pain', () => {
    for (const e of [logEntry('pain', when(2, '10:00')), needEntry('pain', when(2, '10:00')), answerEntry({ q: 'Where does it hurt?', label: 'right shoulder', at: when(2, '10:00') }, 'body'), answerEntry({ q: 'How bad is the pain?', label: 'a little', at: when(2, '10:00') }, 'body')]) {
      const xs = insights([...calm, e], NO_HEALTH, 'week', NOW);
      expect(ids(xs), e.label).toEqual(['pain-some']);
      expect(xs[0].text).toBe('Pain was chosen or logged on 1 day in the last 7 days.');
    }
    // over 30 days too
    expect(ids(insights([...calm, logEntry('pain', when(2, '10:00'))], NO_HEALTH, 'month', NOW))).toContain('pain-some');
  });
  it('a fall', () => {
    expect(ids(insights([...calm, logEntry('fall', when(2, '10:00'))], NO_HEALTH, 'week', NOW))).toEqual(['fall']);
  });
  it('one low day', () => {
    const xs = insights([...calm, answerEntry({ q: 'How are you feeling?', label: 'low', at: when(2, '10:00') }, 'feel')], NO_HEALTH, 'week', NOW);
    expect(ids(xs)).toEqual(['mood']);
    expect(xs[0].text).toBe('"Sad", "bad" or "low" was the answer to a question about how they feel on 1 day in the last 7 days.');
  });
  it('"something\'s wrong", on the needs board or on a card: a line with whom to tell and the call box', () => {
    for (const e of [needEntry("something's wrong", when(2, '10:00')), answerEntry({ q: 'What is it?', label: "something's wrong", at: when(2, '10:00') }, 'body')]) {
      const xs = insights([...calm, e], NO_HEALTH, 'week', NOW, '999');
      expect(ids(xs), e.kind).toEqual(['wrong']);
      expect(xs[0]).toMatchObject({ level: 'call', urgent: true, text: '"Something\'s wrong" was pointed to on 1 day: Wed 18 Nov. Ask what it was.', act: 'Tell the doctor or nurse. If it is new or sudden, call 999 now.' });
    }
  });
  it('a day with entries and no drink', () => {
    const dry = [...day(0), ...day(1), logEntry('ate', when(2, '09:00')), ...day(3), ...day(4), ...day(5)];
    expect(ids(insights(dry, NO_HEALTH, 'week', NOW))).toEqual(['no-drink']);
  });
  it('never "Nothing stands out" beside any of them, in a week or a month', () => {
    const one = [logEntry('pain', when(2, '10:00')), logEntry('fall', when(2, '10:00')), answerEntry({ q: 'How are you feeling?', label: 'sad', at: when(2, '10:00') }, 'feel'), needEntry("something's wrong", when(2, '10:00'))];
    for (const e of one) for (const span of ['week', 'month'] as const) expect(ids(insights([...calm, e], NO_HEALTH, span, NOW)), `${e.label} ${span}`).not.toContain('nothing');
  });
});

describe('3. P1 health wording', () => {
  it('"A little pain" no longer says "keep an eye on it": ask again in an hour, and tell if new or still there', () => {
    expect(after({ asked: 'How bad is the pain?', kind: 'choice' }, 'a little', EMPTY_PROFILE).end).toBe('A little pain. Ask again in an hour. If it is new, or still there later, tell the nurse or doctor.');
    expect(treeEnds('Frank').join(' ')).not.toMatch(/keep an eye on it/i);
  });
  it('no "Last time" and no "So far" before a question about pain, the toilet, a drink or feelings; still before tea or coffee', () => {
    for (const q of ['Are you in pain?', 'Do you need the toilet?', 'Would you like something to drink?', 'How are you feeling?', 'Is something wrong?']) expect(noLastTime({ kind: 'yesno', asked: q }), q).toBe(true);
    expect(noLastTime({ kind: 'choice', asked: 'Shall we go out?' }, 'body')).toBe(true);
    for (const kind of ['body', 'pain', 'feeling']) expect(noLastTime({ kind, asked: 'Which one?' }), kind).toBe(true);
    expect(noLastTime({ kind: 'choice', asked: 'Would you like tea or coffee?' })).toBe(false);
    expect(noLastTime({ kind: 'choice', asked: 'Shall we watch the football?' })).toBe(false);
  });
  it('worst case: the passport\'s "tired yes" line can never be read as doubting a yes to pain', () => {
    expect(P8.passport.tiredYes).toMatch(/But a yes to pain, the toilet or 'something's wrong' is always a yes: act on it\.$/);
  });
});

// ---------------------------------------------------------------- item 4
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { emergencyNumber, localeNumber, numberSet, telHref } from '../../core/redflag';
import { fallBlock, suddenScreen, urgentBox } from '../../web/src/phase5';

describe('4. P1 the emergency number follows the locale, and asks', () => {
  it('en-GB 999, a European Union locale 112, anything else 911', () => {
    for (const l of ['en-GB', 'en_GB', 'cy-GB', 'gd-GB', 'en-UK']) expect(localeNumber(l), l).toBe('999');
    for (const l of ['de-DE', 'fr-FR', 'en-IE', 'pl', 'de', 'it-IT', 'es-ES', 'nl-BE', 'sv-SE', 'pt-PT']) expect(localeNumber(l), l).toBe('112');
    for (const l of ['en-US', 'en-CA', 'fr-CA', 'es-MX', 'pt-BR', 'en', 'ja-JP', '', undefined, 'xx']) expect(localeNumber(l), String(l)).toBe('911');
  });
  it('About them\'s own number always wins; with none, the locale\'s', () => {
    expect(emergencyNumber('000', localeNumber('en-GB'))).toBe('000');
    expect(emergencyNumber('', localeNumber('en-GB'))).toBe('999');
    expect(emergencyNumber('', localeNumber('de-DE'))).toBe('112');
    expect(emergencyNumber('')).toBe('911');
    expect(numberSet('')).toBe(false);
    expect(numberSet('999')).toBe(true);
    expect(telHref('999')).toBe('tel:999');
  });
  it('while it is a guess, every call box says "Is this your emergency number? Change it", which opens About them', () => {
    for (const html of [urgentBox('999', 'urgent', true), fallBlock({ number: '999', id: 'x', head: false, guess: true }), suddenScreen({ number: '999', guess: true })]) {
      expect(html).toContain('Is this your emergency number? <button type="button" class="tlink" data-act="sudden-number">Change it →</button>');
      expect(html).toContain('href="tel:999"');
    }
    // the number in About them: no question
    expect(urgentBox('999', 'urgent', false)).not.toContain('Is this your emergency number?');
  });
  it('the web client: the locale when About them has none, and 911 with no question for the American sample family', () => {
    const main = readFileSync(join(__dirname, '..', '..', 'web', 'src', 'main.ts'), 'utf8');
    expect(main).toContain('const callNumber = () => emergencyNumber(state.health.emergency, state.demo ? DEFAULT_NUMBER : localeNumber(navigator.language));');
    expect(main).toContain('const numberGuess = () => !state.demo && !numberSet(state.health.emergency);');
    expect((main.match(/urgentBox\(callNumber\(\), 'urgent', numberGuess\(\)\)/g) ?? []).length).toBe(2);
  });
});

// ---------------------------------------------------------------- item 5
import { handoverText } from '../../core/share';
import { P5 } from '../../core/copy5';
import { visitLabel } from '../../core/visit';

describe('5. P1 the handover note and the visit page', () => {
  const diary = [logEntry('drank', NOW - 2 * H), logEntry('toilet', NOW - 3 * H), logEntry('tablets', NOW - 4 * H)];
  const base = { diary, learned: [], name: 'Frank', now: NOW };
  it('worst case: the box is off, and the next carer still reads the swallowing difficulty and the fluid limit', () => {
    const t = handoverText({ ...base, health: null, safety: { swallowing: true, fluidLimit: true } });
    expect(t).toContain('ALWAYS ON THIS NOTE (it changes what is safe to give)\n- Swallowing difficulty is noted: go by the plan from the speech therapist or nurse before giving food or drink.\n- A fluid limit from the doctor is noted: go by the doctor\'s plan for drinks.');
    // the drinks line knows the fluid limit too
    expect(t).toContain("A fluid limit from the doctor is noted: go by the doctor's plan.");
    // with none noted, no such block
    expect(handoverText({ ...base, health: null, safety: { swallowing: false, fluidLimit: false } })).not.toContain('ALWAYS ON THIS NOTE');
  });
  it('box ticked: the two are said once, under ALWAYS, and the other notes under the health notes', () => {
    const health = { ...NO_HEALTH, swallowing: true, diabetes: true };
    const t = handoverText({ ...base, health, safety: { swallowing: true, fluidLimit: false } });
    expect((t.match(/Swallowing difficulty/g) ?? []).length).toBe(1);
    expect(t).toContain('- Diabetes');
  });
  it('the visit page: Toilet and Tablets lines, the two family questions, and where it hurts with the part of the body', () => {
    const s = sinceLines(diary, when(0, '00:00'), NOW);
    expect(s.lines).toContain('Toilet: 1 entered (Sun 22 Nov).');
    expect(s.lines).toContain('Tablets taken: logged 1 time (Sun 22 Nov). The app does not know which tablets or how many.');
    expect(P5.since.questions).toContain('Have the tablets changed, and what should we watch for?');
    expect(P5.since.questions).toContain('Is anything new to look at: weakness, swallowing, bowels or bladder?');
    expect(visitLabel({ visit: 'where', bodyStep: 2, region: 'chest' }, 'middle')).toBe('chest, middle');
    expect(visitLabel({ visit: 'where', bodyStep: 2, region: 'arms' }, 'your left arm')).toBe('arms, left arm');
    expect(visitLabel({ visit: 'where', bodyStep: 1 }, 'chest')).toBe('chest');
    expect(visitLabel({ visit: 'sleep' }, 'badly')).toBe('badly');
    // "chest, middle" on the page still raises the box, and counts as a pain in the chest
    const own = sinceLines([], when(0, '00:00'), NOW, [{ id: 'pain', q: 'Are you in pain?', label: 'yes', at: NOW - 60_000 }, { id: 'where', q: 'Where in the chest?', label: 'chest, middle', at: NOW - 30_000 }], 'Frank');
    expect(own.urgent).toBe(true);
  });
});
