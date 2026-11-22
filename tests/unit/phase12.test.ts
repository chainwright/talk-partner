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
