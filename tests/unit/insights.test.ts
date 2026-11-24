// Insights for a week or a month (core/insights.ts): counts, thresholds and red flags are rules. Pinned here: each
// line and its base; how the health notes change the thresholds; with a fluid limit the app never suggests more to
// drink in any words; nothing is medical advice; and what a model may be handed (wording only).
import { describe, expect, it } from 'vitest';
import { COPY } from '../../core/copy';
import { addEntry, answerEntry, logEntry, type DiaryEntry } from '../../core/diary';
import { HEALTH_TEXT_MAX, MAX_INSIGHTS, NO_HEALTH, cleanHealth, cloudLines, hasHealth, insightCloudText, insightDevicePrompt, insights, spanCounts, thresholds, type HealthNotes, type Insight } from '../../core/insights';
import { NOW, WEEK, weekDiary, when } from './week';

const I = COPY.simple.insights;
const H = (o: Partial<HealthNotes>): HealthNotes => ({ ...NO_HEALTH, ...o });
const ids = (xs: Insight[]) => xs.map((x) => x.id);
/** A line without its entry ids ("See the entries": tests/unit/phase6-source.test.ts). */
const bare = (x: Insight) => Object.fromEntries(Object.entries(x).filter(([k]) => k !== 'source'));
const all = (xs: Insight[]) => xs.map((x) => `${x.text} ${x.noted} ${x.base}`).join(' ');
/** A plain day: six drinks and three meals logged (phase 12b: fewer than six drinks in a day is a line). */
const plain = (d: number): DiaryEntry[] => [['08:00', 'drank'], ['08:10', 'ate'], ['10:00', 'drank'], ['12:00', 'drank'], ['12:30', 'ate'], ['15:00', 'drank'], ['17:00', 'drank'], ['18:00', 'ate'], ['20:00', 'drank']].map(([t, k]) => logEntry(k as 'drank', when(d, t)));
const ACT = 'If that is right, and not a gap in the diary, tell the doctor or nurse today.';
const days = (...ds: number[]) => ds.flatMap(plain);
const MORE_DRINK = /drink more|more to drink|more drinks?\b(?! were)|offer (?:him|her|them|a|more)|encourage|should drink|needs? to drink|more fluid|more water/i;

describe('the rules', () => {
  it('an empty diary gives no lines; a plain week gives one line that says nothing stands out, with its base', () => {
    expect(insights([], NO_HEALTH, 'week', NOW)).toEqual([]);
    const xs = insights(days(0, 1, 2, 3, 4, 5), NO_HEALTH, 'week', NOW);
    expect(ids(xs)).toEqual(['nothing']);
    expect(xs[0].text).toBe('Nothing stands out in what was entered in the last 7 days.');
    expect(xs[0].base).toBe('54 entries on 6 days. Only what was entered here.');
  });
  it('red flag: pain on 3 days or more; on 2 days a line of its own (phase 9: never "Nothing stands out")', () => {
    const pain = (d: number) => answerEntry({ q: 'Are you in pain?', label: 'yes', at: when(d, '09:00') }, 'body');
    const two = insights([...days(0, 1, 2), pain(0), pain(1)], NO_HEALTH, 'week', NOW);
    expect(ids(two)).toEqual(['pain-some']);
    expect(two[0]).toMatchObject({ level: 'mention', text: 'Pain was chosen or logged on 2 days in the last 7 days.', act: 'If the pain is new or sudden, or in the chest or the head: call 911 now. Otherwise ask again today, and tell the doctor or nurse if it is still there.' });
    const xs = insights([...days(0, 1, 2), pain(0), pain(1), logEntry('pain', when(2, '10:00'))], NO_HEALTH, 'week', NOW);
    expect(xs[0]).toMatchObject({ id: 'pain', level: 'tell', text: 'Pain was chosen or logged on 3 days in the last 7 days.' });
    expect(xs[0].base).toBe('Days with pain: Mon 16 Nov, Tue 17 Nov and Wed 18 Nov. Only what was entered here.');
    expect(I.level.tell).toBe('Tell the doctor or nurse');
  });
  it('red flag: a whole day with entries and no drink, said with its doubt; a day with no entries at all is not one, and today is not over', () => {
    const noDrink = [logEntry('ate', when(2, '08:00')), logEntry('ate', when(2, '18:00'))];
    const xs = insights([...days(0, 1, 4), ...noDrink, logEntry('ate', when(6, '08:00'))], NO_HEALTH, 'week', NOW);
    expect(xs[0]).toMatchObject({ id: 'no-drink', level: 'tell' });
    // (18 Nov, phase 5: the sentence that excused the line is gone)
    expect(xs[0].text).toBe('No drink was chosen or logged on Wed 18 Nov. If that is right, and not a gap in the diary, tell the doctor or nurse today.');
    expect(xs[0].text).not.toMatch(/simply|nobody entered/);
    expect(xs[0].base).toBe('Other things were entered on that day, and no drink. Only what was entered here.');
    expect(all(xs)).not.toContain('Thu 19 Nov');
    expect(all(xs)).not.toContain('Sun 22 Nov');
  });
  it('a day with few drinks entered: the count, the day, and "only what was entered here"', () => {
    const wed = [logEntry('drank', when(2, '08:00')), logEntry('ate', when(2, '12:00')), logEntry('drank', when(2, '15:00'))];
    const xs = insights([...days(0, 1), ...wed], NO_HEALTH, 'week', NOW);
    // (18 Nov, phase 5: two drinks in a day is worth mentioning, with or without reminders noted)
    expect(xs.map(bare)).toEqual([{ id: 'few-drinks', level: 'mention', text: 'Few drinks were entered on Wed 18 Nov: 2.', act: ACT, noted: '', base: 'Counted that day: 2. Every "Drank" tap counts, and every drink chosen on a card (tea, coffee, water, juice, milk, or yes to "something to drink"); a card and a tap within 20 minutes count once. Only what was entered here.' }]);
    // (18 Nov, the second role-play) two days with the fewest are both named, and three taps in one minute are three drinks
    const fri = [logEntry('drank', when(4, '08:00')), logEntry('ate', when(4, '12:00'))];
    const mon = [logEntry('ate', when(0, '09:00')), logEntry('drank', when(0, '10:00'))];
    const tie = insights([...days(1), ...fri, ...mon], NO_HEALTH, 'week', NOW);
    expect(tie[0]).toMatchObject({ text: 'Few drinks were entered on Mon 16 Nov and Fri 20 Nov: 1 each.', act: ACT });
    expect(tie[0].base.startsWith('Counted on each of those days: 1. Every "Drank" tap counts')).toBe(true);
    const batch = [logEntry('ate', when(2, '08:00')), ...Array.from({ length: 6 }, () => logEntry('drank', when(2, '08:10')))];
    expect(ids(insights([...days(0, 1), ...batch], NO_HEALTH, 'week', NOW))).toEqual(['nothing']);
    expect(insights([...days(0, 1), ...batch.slice(0, 3)], NO_HEALTH, 'week', NOW)[0].text).toBe('Few drinks were entered on Wed 18 Nov: 2.');
    // (phase 12b, judge round 9b: five drinks in a day is few; six is not)
    expect(insights([...days(0, 1), ...batch.slice(0, 6)], NO_HEALTH, 'week', NOW)[0]).toMatchObject({ text: 'Few drinks were entered on Wed 18 Nov: 5.', act: ACT });
  });
  it('something sweet, chosen often: 6 times in a week without a note, a note only', () => {
    const sweet = (d: number, t: string) => answerEntry({ q: 'Would you like something sweet or something savoury?', label: 'something sweet', at: when(d, t) }, 'food');
    const five = [...days(0, 1, 2), sweet(0, '10:00'), sweet(0, '15:00'), sweet(1, '10:00'), sweet(1, '15:00'), sweet(2, '10:00')];
    expect(ids(insights(five, NO_HEALTH, 'week', NOW))).toEqual(['nothing']);
    const xs = insights([...five, sweet(2, '15:00')], NO_HEALTH, 'week', NOW);
    expect(xs.map(bare)).toEqual([{ id: 'sweets', level: 'note', text: 'Something sweet was chosen 6 times in the last 7 days.', noted: '', base: 'Chosen 6 times in 7 days. Only what was entered here.' }]);
  });
  it('many answers marked "less sure": said, with how many of how many', () => {
    const unsure = [0, 1, 2].map((n) => answerEntry({ q: `Question ${n}?`, label: 'yes', at: when(4, `19:0${n}`), lessSure: true }, 'other'));
    const xs = insights([...days(0, 4), ...unsure, answerEntry({ q: 'Are you tired?', label: 'no', at: when(0, '14:00') }, 'rest')], NO_HEALTH, 'week', NOW);
    expect(xs[0]).toMatchObject({ id: 'less-sure', level: 'note', base: '3 of 4 answers in 7 days.' });
    expect(xs[0].text).toBe('3 answers on Fri 20 Nov are marked "less sure": yes to nearly everything, or the same place on the screen each time. Read that day with care.');
  });
  it('bad nights on 3 days', () => {
    const night = (d: number) => answerEntry({ q: 'How did you sleep?', label: 'bad', at: when(d, '08:30') }, 'rest');
    expect(ids(insights([...days(0, 1, 2), night(0), night(1), night(2)], NO_HEALTH, 'week', NOW))).toEqual(['sleep']);
  });
  it(`at most ${MAX_INSIGHTS} lines, the most serious first`, () => {
    const d = weekDiary();
    const more = [...d, logEntry('pain', when(0, '09:00')), logEntry('pain', when(2, '09:00')), logEntry('ate', when(-1, '09:00'))];
    const xs = insights(more, H({ diabetes: true, swallowing: true, reminders: true }), 'month', NOW);
    expect(xs.length).toBeLessThanOrEqual(MAX_INSIGHTS);
    const order = xs.map((x) => ['tell', 'mention', 'note'].indexOf(x.level));
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(xs[0].level).toBe('tell');
  });
  it('the month counts 30 days, and its thresholds are a month\'s', () => {
    expect(thresholds(NO_HEALTH, 'week').sweets).toBe(6);
    expect(thresholds(NO_HEALTH, 'month').sweets).toBe(24);
    const old = logEntry('pain', when(-10, '09:00'));
    const xs = insights([...days(0, 1), old, logEntry('pain', when(0, '09:00')), logEntry('pain', when(1, '09:00'))], NO_HEALTH, 'month', NOW);
    expect(xs.find((x) => x.id === 'pain')?.text).toBe('Pain was chosen or logged on 3 days in the last 30 days.');
    expect(insights([...days(0, 1), old, logEntry('pain', when(0, '09:00')), logEntry('pain', when(1, '09:00'))], NO_HEALTH, 'week', NOW).some((x) => x.id === 'pain')).toBe(false);
  });
});

describe('health notes change the thresholds', () => {
  const sweet = (d: number, t: string) => answerEntry({ q: 'Would you like ginger biscuits or porridge?', label: 'ginger biscuits', at: when(d, t) }, 'food');
  it('diabetes: 3 sweet choices in a week are worth mentioning to the doctor or nurse; without the note they are not a line', () => {
    const d = [...days(0, 1, 2), sweet(0, '10:00'), sweet(1, '10:00'), sweet(2, '10:00')];
    expect(ids(insights(d, NO_HEALTH, 'week', NOW))).toEqual(['nothing']);
    const xs = insights(d, H({ diabetes: true }), 'week', NOW);
    expect(xs.map(bare)).toEqual([{ id: 'sweets', level: 'mention', text: 'Something sweet was chosen 3 times in the last 7 days.', noted: 'Diabetes is noted here.', base: 'Chosen 3 times in 7 days. Only what was entered here.' }]);
    expect(I.level.mention).toBe('Worth mentioning to the doctor or nurse');
  });
  it('reminders: a day with 6 drinks is already few, and worth mentioning', () => {
    expect(ids(insights(days(0, 1), NO_HEALTH, 'week', NOW))).toEqual(['nothing']);
    const xs = insights(days(0, 1), H({ reminders: true }), 'week', NOW);
    expect(xs[0]).toMatchObject({ id: 'few-drinks', level: 'mention', noted: 'Reminders to drink are noted here.' });
  });
  it('swallowing difficulty: a day with entries and no food is mentioned', () => {
    const d = [...days(0, 1), ...['08:00', '10:00', '12:00', '14:00', '17:00', '20:00'].map((t) => logEntry('drank', when(2, t)))];
    expect(ids(insights(d, NO_HEALTH, 'week', NOW))).toEqual(['nothing']);
    expect(insights(d, H({ swallowing: true }), 'week', NOW)[0]).toMatchObject({ id: 'no-food', level: 'mention', text: 'No food was chosen or logged on Wed 18 Nov. Swallowing difficulty is noted here.' });
  });
  it('a fluid limit from the doctor: no "few drinks" line, a day with many drinks is mentioned, and the no-drink line points to the doctor\'s plan', () => {
    const wed = [logEntry('drank', when(2, '08:00')), logEntry('ate', when(2, '12:00'))];
    // (18 Nov, phase 5: the line is no longer hidden under a fluid limit; it points to the doctor's plan and never says "more")
    const low = insights([...days(0, 1), ...wed], H({ fluidLimit: true }), 'week', NOW);
    expect(ids(low)).toEqual(['few-drinks']);
    expect(low[0]).toMatchObject({ level: 'mention', local: true, text: "Few drinks were entered on Wed 18 Nov: 1. A fluid limit from the doctor is noted here: check the day against the doctor's plan." });
    const many = Array.from({ length: 8 }, (_, i) => logEntry('drank', when(1, `${String(8 + i).padStart(2, '0')}:00`)));
    const xs = insights([...days(0), ...many, logEntry('ate', when(2, '12:00'))], H({ fluidLimit: true }), 'week', NOW);
    expect(ids(xs)).toEqual(['no-drink', 'many-drinks']);
    // (phase 8, judge round 7: a fluid limit never reads as the reason for a dry day)
    expect(xs[0].text).toBe('No drink was chosen or logged on Wed 18 Nov. A fluid limit is not "no drinks": if that is right, and not a gap in the diary, tell the doctor or nurse today.');
    expect(xs[1].text).toBe("8 drinks were entered on Tue 17 Nov. A fluid limit from the doctor is noted here: check the day against the doctor's plan.");
    expect(ids(insights([...days(0), ...many], NO_HEALTH, 'week', NOW))).toEqual(['nothing']);
  });
  it('whatever was stored comes back as health notes: unknown fields gone, a long text cut', () => {
    expect(cleanHealth(null)).toEqual(NO_HEALTH);
    expect(cleanHealth({ diabetes: true, fluidLimit: 'yes', text: 'x'.repeat(2000), extra: 1 })).toEqual({ ...NO_HEALTH, diabetes: true, text: 'x'.repeat(HEALTH_TEXT_MAX) });
    expect(hasHealth(NO_HEALTH)).toBe(false);
    expect(hasHealth(H({ text: ' a ' }))).toBe(true);
  });
});

describe('never medical advice', () => {
  const notes: HealthNotes[] = [NO_HEALTH, H({ diabetes: true }), H({ fluidLimit: true }), H({ swallowing: true, reminders: true }), H({ diabetes: true, swallowing: true, fluidLimit: true, reminders: true, text: 'thickened fluids' })];
  const diaries: DiaryEntry[][] = [weekDiary(), days(0, 1, 2), [logEntry('ate', when(1, '09:00')), logEntry('pain', when(1, '10:00')), logEntry('pain', when(2, '10:00')), logEntry('pain', when(3, '10:00'))], [...days(0), ...Array.from({ length: 9 }, (_, i) => logEntry('drank', when(1, `${String(8 + i).padStart(2, '0')}:30`)))]];
  it('with a fluid limit noted, no line in any diary suggests more to drink, in any words', () => {
    for (const d of diaries) for (const span of ['week', 'month'] as const) {
      const text = all(insights(d, H({ fluidLimit: true }), span, NOW));
      expect(text).not.toMatch(MORE_DRINK);
      expect(text).not.toMatch(/drink more|more to drink|more fluid|offer|encourage/i);
    }
  });
  it('no line of any diary under any notes names a diagnosis, a medicine, a dose or a diet, or tells the carer what they must do', () => {
    for (const d of diaries) for (const h of notes) for (const span of ['week', 'month'] as const) {
      const text = all(insights(d, h, span, NOW));
      expect(text).not.toMatch(/diagnos|dehydrat|infection|\bdose|\bmg\b|medicine|medication|insulin|tablet|\bdiet\b|calorie|you should|you must|you need to|has to|treat/i);
      expect(text).not.toMatch(MORE_DRINK);
    }
    expect(I.footer).toMatch(/not medical advice and not a diagnosis/);
  });
  it('every line has a base that says what it was counted from', () => {
    for (const d of diaries) for (const h of notes) for (const x of insights(d, h, 'week', NOW)) {
      expect(x.base.length).toBeGreaterThan(10);
      if (x.id !== 'less-sure') expect(x.base.endsWith(I.only)).toBe(true);
    }
  });
  it('the levels are fixed words, and (phase 8) the strongest is "call now if it is new or sudden": the app never says what the cause is', () => {
    expect(Object.keys(I.level)).toEqual(['crisis', 'call', 'tell', 'mention', 'note']);
    expect(Object.values(I.level).join(' ')).not.toMatch(/emergency|urgent|danger|risk/i);
  });
});

describe('what a model may be handed: the rules\' lines, for their wording only', () => {
  const health = WEEK.health;
  const lines = insights(weekDiary(), health, 'week', NOW);
  it('the cloud text is the numbered lines and nothing else: no name, no health note, no diary entry', () => {
    const text = insightCloudText(lines);
    // (18 Nov, phase 5: the "less sure" line carries a fixed sentence, so no model rewords it and it does not go)
    // (phase 12b: the few-drinks line carries a fixed "tell the doctor or nurse today", so it does not go either)
    expect(text).toBe('1. Something sweet was chosen 3 times in the last 7 days.');
    for (const word of ['Frank', 'Carol', 'Beth', 'Tom', 'Bo', 'Patel', 'diabetes', 'Diabetes', 'ginger', 'porridge', 'Type 2', 'tea']) expect(text).not.toContain(word);
  });
  it('a line whose own words state a health note never goes: the fluid limit, swallowing difficulty', () => {
    const many = Array.from({ length: 8 }, (_, i) => logEntry('drank', when(1, `${String(8 + i).padStart(2, '0')}:00`)));
    const xs = insights([...days(0), ...many, logEntry('ate', when(2, '12:00')), logEntry('drank', when(3, '09:00')), logEntry('pain', when(3, '10:00')), logEntry('pain', when(0, '10:00')), logEntry('pain', when(1, '10:00'))], H({ fluidLimit: true, swallowing: true, diabetes: true }), 'week', NOW);
    expect(ids(xs)).toEqual(['pain', 'no-drink', 'few-drinks', 'many-drinks', 'no-food']);
    expect(ids(cloudLines(xs))).toEqual(['pain']);
    expect(insightCloudText(xs)).not.toMatch(/fluid limit|swallowing|noted|diabetes/i);
    expect(cloudLines(insights(days(0, 1), NO_HEALTH, 'week', NOW))).toEqual([]);
  });
  it('the function takes the lines only: the notes, the diary and About them are not among its inputs', () => {
    expect(insightCloudText.length).toBe(1);
    expect(insightCloudText(lines)).not.toContain(health.text);
  });
  it('the on-device prompt adds what the carer noted, as context: it is for ONLY_ON_DEVICE', () => {
    const p = insightDevicePrompt(lines, health);
    expect(p).toContain('The carer noted: Diabetes; Type 2 diabetes, diet only. Dr Patel on Monday.');
    expect(insightDevicePrompt(lines.filter((l) => !l.act), NO_HEALTH)).toBe(insightCloudText(lines));
  });
  it('the counts of the span, for the base of a screen', () => {
    expect(spanCounts(weekDiary(), 'week', NOW)).toMatchObject({ days: 7, daysWithEntries: 7, sweet: 3, lessSure: 4 });
    expect(addEntry([], logEntry('ate', 1)).length).toBe(1);
  });
});
