// Phase 12 (22 Nov 2026), the fixes of judge round 9. Every new or changed line is walked on its worst case: can it
// help a carer dismiss pain, a need or distress? Each health item has a test that failed before its fix.
import { describe, expect, it } from 'vitest';
import { answerEntry, logEntry, lowMood, tags, type DiaryEntry } from '../../core/diary';
import { insights, NO_HEALTH } from '../../core/insights';
import { sinceLines } from '../../core/since';
import { NOW, when } from './week';

const ans = (q: string, label: string, d: number, t = '10:00', topic: DiaryEntry['topic'] = 'feel') => answerEntry({ q, label, at: when(d, t) }, topic);
const day = (d: number) => [logEntry('drank', when(d, '08:00')), logEntry('ate', when(d, '08:30')), logEntry('drank', when(d, '12:00'))];
const calm = [...day(0), ...day(1), ...day(2)];

describe('A1. Low mood (P0 4): worried, scared, lonely, anxious and "something is bothering me" count', () => {
  it.each([
    ['How are you feeling today?', 'worried'],
    ['How are you feeling today?', 'scared'],
    ['How are you feeling today?', 'lonely'],
    ['How are you feeling today?', 'anxious'],
    ['How have you been feeling in yourself?', 'low'],
    ['Is something bothering you?', 'yes'],
    ['What worries you most?', 'my family'],
    ['What worries you most?', 'what happens next'],
    ['What is bothering you? Your body, people, or plans?', 'lonely'],
  ])('"%s" → "%s" is a low-mood answer', (q, label) => {
    expect(lowMood(q, label)).toBe(true);
    expect(tags(ans(q, label, 1))).toContain('low-mood');
  });
  it.each([
    ['How are you feeling today?', 'good'],
    ['Is something bothering you?', 'no'],
    ['Is something bothering you?', 'not sure'],
    ['What worries you most?', 'nothing much'],
    ['What worries you most?', 'something else'],
    ['How does this photo make you feel?', 'sad'],
    ['How did you sleep?', 'bad'],
  ])('"%s" → "%s" is not', (q, label) => {
    expect(lowMood(q, label)).toBe(false);
    expect(tags(ans(q, label, 1))).not.toContain('low-mood');
  });
  it('the week line and the visit page count a "worried" day and a "yes" to "Is something bothering you?"', () => {
    const d = [...calm, ans('How are you feeling today?', 'worried', 0), ans('Is something bothering you?', 'yes', 1)];
    const line = insights(d, NO_HEALTH, 'week', NOW, '911').find((l) => l.id === 'mood');
    expect(line?.text).toMatch(/on 2 days/);
    // the line names the words that count, so a carer does not read it as "sad only"
    expect(line?.text).toMatch(/worried/);
    expect(line?.act).toMatch(/call 911 now/);
    const s = sinceLines(calm, when(0, '00:00'), NOW, [{ id: 'worry', q: 'What worries you most?', label: 'my body', at: NOW - 60_000 }], 'Frank');
    expect(s.lines.find((l) => l.startsWith('Mood'))).toMatch(/on 1 day .*counting Frank's own answer above/);
  });
});

describe('A2. About them never teaches the carer to ignore pain (P0 5)', () => {
  const at = (d: number) => when(d, '10:00');
  const noPain = [0, 1, 2].map((d) => ({ q: 'Are you in pain?', label: 'no', at: at(d) }));
  const teas = [0, 1, 2].map((d) => ({ q: 'Would you like tea or coffee?', label: 'tea', at: at(d) }));
  it('three "no" to "Are you in pain?": About them shows no line about it, and so offers no "Keep as a fact"', async () => {
    const { learned } = await import('../../core/prefs');
    const { aboutLearned } = await import('../../core/share');
    const { learnedBlock } = await import('../../web/src/simple');
    // the counting itself still sees it (it is what the guard and the card hint are kept from)
    expect(learned(noPain, []).map((l) => l.text).join(' ')).toMatch(/Are you in pain/);
    const lines = aboutLearned(learned([...noPain, ...teas], []));
    expect(lines.map((l) => l.text).join(' ')).not.toMatch(/pain/i);
    expect(lines.map((l) => l.text)).toEqual(['"Would you like tea or coffee": usually tea (3 of 3).']);
    const html = learnedBlock({ name: 'Frank', lines: aboutLearned(learned(noPain, [])), facts: [], short: null });
    expect(html).not.toMatch(/pain/i);
    expect(html).not.toContain('learned-keep');
  });
  it.each(['Are you in pain?', 'Do you need the toilet?', 'Is something bothering you?', 'Are you comfortable?', 'How are you feeling today?'])('no learned line for the care question "%s"', async (q) => {
    const { learned } = await import('../../core/prefs');
    const { aboutLearned } = await import('../../core/share');
    const xs = [0, 1, 2].map((d) => ({ q, label: 'no', at: at(d) }));
    expect(aboutLearned(learned(xs, []))).toEqual([]);
  });
  it('a need about pain on the board is shown as counted, but never offered as a fact to keep', async () => {
    const { learned } = await import('../../core/prefs');
    const { aboutLearned } = await import('../../core/share');
    const { learnedBlock } = await import('../../web/src/simple');
    const needs = [0, 1, 2].map((d) => ({ label: 'pain', at: at(d) }));
    const lines = aboutLearned(learned([], needs));
    expect(lines).toHaveLength(1);
    expect(lines[0].care).toBe(true);
    const html = learnedBlock({ name: 'Frank', lines, facts: [], short: null });
    expect(html).not.toContain('learned-keep');
    expect(html).toContain('learned-remove');
  });
  it('every place in the web client that reads what was learned goes through aboutLearned', async () => {
    const { readFileSync } = await import('node:fs');
    const main = readFileSync(new URL('../../web/src/main.ts', import.meta.url), 'utf8');
    const calls = main.match(/[\w.]*\(?learned\(state\.history, state\.needsLog, state\.forgotten\)/g) ?? [];
    expect(calls.length).toBeGreaterThan(0);
    for (const c of calls) expect(c).toMatch(/^aboutLearned\(learned/);
    expect(main).not.toMatch(/\bhints\(state\.history/);
  });
});

describe('A3. A limb or the face hurts: first "Is it suddenly weak or numb?" (P0 6, the FAST arm sign)', () => {
  const chain = ['Are you in pain?', 'Where does it hurt?'];
  it.each(['your left arm', 'your right arm', 'hands', 'your left leg', 'your right leg', 'feet', 'face'])('after "%s" the first question offered is "Is it suddenly weak or numb?"', async (label) => {
    const { after, WEAK_NUMB } = await import('../../core/tree');
    const { EMPTY_PROFILE } = await import('../../core/types');
    const region = /arm|hand/.test(label) ? 'arms' : /leg|feet/.test(label) ? 'legs' : 'head';
    const s = after({ asked: `Where in the ${region}?`, kind: 'body', bodyStep: 2 }, label, EMPTY_PROFILE, chain);
    expect(WEAK_NUMB).toBe('Is it suddenly weak or numb, yes or no?');
    expect(s.next[0]).toBe(WEAK_NUMB);
    expect(s.next).toContain('How bad is the pain?');
  });
  it.each(['upper stomach', 'lower back', 'ears'])('"%s" is not asked about weakness', async (label) => {
    const { after, WEAK_NUMB } = await import('../../core/tree');
    const { EMPTY_PROFILE } = await import('../../core/types');
    expect(after({ asked: 'Where in the back?', kind: 'body', bodyStep: 2 }, label, EMPTY_PROFILE, chain).next).not.toContain(WEAK_NUMB);
  });
  it('yes (and not sure) raises the call box; no goes on to how bad, and "a little" still asks again in an hour', async () => {
    const { after, WEAK_NUMB } = await import('../../core/tree');
    const { urgentAnswer } = await import('../../core/redflag');
    const { EMPTY_PROFILE } = await import('../../core/types');
    const card = { asked: WEAK_NUMB, kind: 'yesno' as const };
    expect(urgentAnswer(WEAK_NUMB, 'yes')).toBe(true);
    expect(urgentAnswer(WEAK_NUMB, 'not sure')).toBe(true);
    expect(urgentAnswer(WEAK_NUMB, 'no')).toBe(false);
    const yes = after(card, 'yes', { ...EMPTY_PROFILE, personName: 'Frank' }, chain);
    expect(yes.next).toEqual([]);
    expect(yes.end).toMatch(/call the emergency number now/i);
    expect(yes.end).toMatch(/time it started/);
    const no = after(card, 'no', EMPTY_PROFILE, ['Where does it hurt?']);
    expect(no.next).toEqual(['How bad is the pain?']);
    const little = after({ asked: 'How bad is the pain?', kind: 'scale' as never }, 'a little', EMPTY_PROFILE, chain);
    expect(little.end).toMatch(/Ask again in an hour/);
    // worst case: the depth limit can cut the weakness question; the end line of "a little" still names the sign
    expect(little.end).toMatch(/Sudden weakness or numbness: call now/);
  });
});

describe('A4. Pain on the needs board: "Where does it hurt?" is the main button, and the call box has the number', () => {
  it('after "pain" on the board: the main button asks where, and the urgent box with the region\'s number stands under it', async () => {
    const { readFileSync } = await import('node:fs');
    const main = readFileSync(new URL('../../web/src/main.ts', import.meta.url), 'utf8');
    const fn = main.slice(main.indexOf('function afterAnswer('), main.indexOf('const recapText'));
    expect(fn).toContain('C.needs.painQuestion');
    expect(fn).toMatch(/class="\$\{button\} primary"[^`]*data-q="\$\{esc\(C\.needs\.painQuestion\)\}"/);
    expect(fn).toContain("urgentBox(callNumber(), 'need-urgent', numberGuess())");
    // the old line had no number and no button
    expect(fn).not.toContain('C.safety');
    const { COPY } = await import('../../core/copy');
    expect(COPY.needs.lines.pain).not.toMatch(/AI/);
  });
});

describe('A5. Pain left for later: the signs to watch for, the emergency route, and how long ago', () => {
  it('"how long ago" in plain words', async () => {
    const { agoText } = await import('../../core/later');
    const now = when(6, '12:00');
    expect(agoText(now - 5 * 60_000, now)).toBe('Left 5 minutes ago.');
    expect(agoText(now - 60 * 60_000, now)).toBe('Left 1 hour ago.');
    expect(agoText(now - 150 * 60_000, now)).toBe('Left 2 hours ago.');
    expect(agoText(now - 30 * 3600_000, now)).toBe('Left 1 day ago.');
    expect(agoText(now - 20_000, now)).toBe('Left just now.');
  });
  it('a pain question on Home: the line, the signs that do not wait, a call button with the number, the list, and the time', async () => {
    const { laterBlock } = await import('../../web/src/simple');
    const { laterPainHtml } = await import('../../web/src/phase5');
    const html = laterBlock([{ q: 'Are you in pain?', time: '09:10', ago: 'Left 3 hours ago.', i: 0, care: true, pain: true }], laterPainHtml('999'));
    expect(html).toContain('If the pain is new or strong, don&#39;t wait: call the nurse or doctor.');
    expect(html).toMatch(/Call 999 now if/);
    expect(html).toMatch(/weakness or numbness/);
    expect(html).toMatch(/chest pain/);
    expect(html).toContain('href="tel:999"');
    expect(html).toContain('href="#/sudden"');
    expect(html).toContain('Left 3 hours ago.');
    // an everyday question left for later carries none of it
    const plain = laterBlock([{ q: 'Shall we go out?', time: '09:10', ago: 'Left 3 hours ago.', i: 0 }], laterPainHtml('999'));
    expect(plain).not.toContain('tel:');
    expect(plain).toContain('Left 3 hours ago.');
  });
});

describe('A6. The emergency number follows the region; an unknown region gets 112 and the "change" line, never a silent 911', () => {
  it.each([
    ['en-AU', '000'], ['en-NZ', '111'], ['en-IN', '112'], ['hi-IN', '112'], ['ja-JP', '119'], ['ja', '119'], ['ko-KR', '119'],
    ['en-US', '911'], ['en-CA', '911'], ['fr-CA', '911'], ['es-MX', '911'], ['en-GB', '999'], ['de-DE', '112'], ['en-SG', '995'], ['en-HK', '999'],
    ['pt-BR', '192'], ['de-CH', '144'], ['nb-NO', '113'], ['zh-CN', '120'],
  ])('%s → %s', async (locale, number) => {
    const { localeNumber } = await import('../../core/redflag');
    expect(localeNumber(locale)).toBe(number);
  });
  it.each(['en', 'xx', '', 'sw-KE', 'ar-EG'])('unknown "%s" → 112, and the call boxes ask "Is this your emergency number?"', async (locale) => {
    const { localeNumber } = await import('../../core/redflag');
    const { urgentBox } = await import('../../web/src/phase5');
    expect(localeNumber(locale)).toBe('112');
    expect(urgentBox(localeNumber(locale), 'urgent', true)).toMatch(/number-guess/);
  });
  it('the number the family types still wins, and the sample family stays on 911', async () => {
    const { emergencyNumber, localeNumber, DEFAULT_NUMBER } = await import('../../core/redflag');
    expect(emergencyNumber('000', localeNumber('xx'))).toBe('000');
    expect(DEFAULT_NUMBER).toBe('911');
  });
});
