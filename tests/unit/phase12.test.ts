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
