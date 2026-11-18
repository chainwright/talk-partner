// Phase 8 (18-19 Nov 2026), the fixes of judge round 7. Every new or changed line is walked on its worst case: can
// it help a carer dismiss pain, a need or distress?
import { describe, expect, it } from 'vitest';
import { answerEntry, logEntry, tags, type DiaryEntry } from '../../core/diary';
import { insights, NO_HEALTH } from '../../core/insights';
import { sinceLines } from '../../core/since';
import { NOW, when } from './week';

const ans = (q: string, label: string, d: number, t = '10:00', topic: DiaryEntry['topic'] = 'feel') => answerEntry({ q, label, at: when(d, t) }, topic);
const day = (d: number) => [logEntry('drank', when(d, '08:00')), logEntry('ate', when(d, '08:30')), logEntry('drank', when(d, '12:00'))];
const own = (id: string, q: string, label: string) => ({ id, q, label, at: NOW - 60_000 });

describe('1. Safety (P0 6): the visit page never says "none entered" under an own answer that says otherwise', () => {
  const calm = [...day(0), ...day(1), ...day(2)];
  it('a "low" own answer to the mood question counts as a low day, and the line says so', () => {
    const s = sinceLines(calm, when(0, '00:00'), NOW, [own('mood', 'How have you been feeling in yourself?', 'low')], 'Frank');
    const mood = s.lines.find((l) => l.startsWith('Mood'))!;
    expect(mood).toBe('Mood: "sad", "bad" or "low" on 1 day (Sun 22 Nov), counting Frank\'s own answer above.');
    expect(s.lines.join(' ')).not.toMatch(/no "sad"/);
    // no name: "their", never a guessed he or she
    expect(sinceLines(calm, when(0, '00:00'), NOW, [own('mood', 'How have you been feeling in yourself?', 'low')]).lines.join(' ')).toContain('counting their own answer above');
  });
  it('a yes to pain counts as a pain day; "quite bad" or the head or chest raises the box', () => {
    const s = sinceLines(calm, when(0, '00:00'), NOW, [own('pain', 'Are you in pain?', 'yes')], 'Frank');
    expect(s.lines[0]).toBe("Pain: chosen or logged on 1 day (Sun 22 Nov), counting Frank's own answer above.");
    expect(s.lines.join(' ')).not.toContain('Pain: none entered');
    expect(s.urgent).toBe(false);
    const hard = sinceLines(calm, when(0, '00:00'), NOW, [own('pain', 'Are you in pain?', 'yes'), own('where', 'Where does it hurt?', 'chest'), own('bad', 'How bad is the pain?', 'quite bad')], 'Frank');
    expect(hard.urgent).toBe(true);
    expect(hard.lines[1]).toMatch(/^Strong pain, or pain in the head or the chest: Sun 22 Nov\.$/);
  });
  it('a bad night own answer counts as a bad night', () => {
    const s = sinceLines(calm, when(0, '00:00'), NOW, [own('sleep', 'How have you been sleeping?', 'badly')], 'Frank');
    expect(s.lines.find((l) => l.startsWith('Sleep'))).toMatch(/^Sleep: a bad night on 1 day .*counting Frank's own answer above\.$/);
  });
  it('even with an empty diary, an own answer of pain or low mood gives the lines, not "the diary holds nothing"', () => {
    const s = sinceLines([], null, NOW, [own('pain', 'Are you in pain?', 'yes'), own('mood', 'How have you been feeling in yourself?', 'low')], 'Frank');
    expect(s.any).toBe(true);
    expect(s.lines.join(' ')).toContain('Pain: chosen or logged on 1 day');
    expect(s.lines.join(' ')).toContain('Mood: "sad", "bad" or "low" on 1 day');
  });
  it('the same day in the diary and in the own answers counts once', () => {
    const s = sinceLines([...calm, ans('How are you feeling today?', 'sad', 6, '09:00')], when(0, '00:00'), NOW, [own('mood', 'How have you been feeling in yourself?', 'low')], 'Frank');
    expect(s.lines.find((l) => l.startsWith('Mood'))).toMatch(/on 1 day \(Sun 22 Nov\)/);
  });
  it('good answers count nothing, and "no" to pain is not a pain day', () => {
    const s = sinceLines(calm, when(0, '00:00'), NOW, [own('pain', 'Are you in pain?', 'no'), own('mood', 'How have you been feeling in yourself?', 'good'), own('sleep', 'How have you been sleeping?', 'well')], 'Frank');
    expect(s.lines.join(' ')).toContain('Pain: none entered.');
    expect(s.lines.join(' ')).toContain('Mood: no "sad", "bad" or "low" day entered.');
    expect(s.lines.join(' ')).not.toContain('counting');
  });
  it('in the diary, "low" and every feelings question count as a low day; a photo that makes them sad does not count as mood', () => {
    expect(tags(ans('How have you been feeling in yourself?', 'low', 1))).toContain('low-mood');
    expect(tags(ans('How are you feeling today?', 'low', 1))).toContain('low-mood');
    expect(tags(ans('How are you feeling today?', 'sad', 1))).toContain('low-mood');
    expect(tags(ans('How does this photo make you feel?', 'sad', 1))).not.toContain('low-mood');
    expect(tags(ans('How are you feeling today?', 'good', 1))).not.toContain('low-mood');
    // the week's insight counts them too: three low days give the mood line
    const d = [...calm, ans('How are you feeling today?', 'low', 0), ans('How have you been feeling in yourself?', 'low', 1), ans('How are you feeling today?', 'sad', 2)];
    expect(insights(d, NO_HEALTH, 'week', NOW, '911').map((l) => l.id)).toContain('mood');
  });
});
