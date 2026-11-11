// Fix round 4 after held-out run 4: options in the one on-device call, memory questions by structure, and the
// "today" line only for questions about now. All examples are new: none come from any held-out set.
import { describe, expect, it } from 'vitest';
import { CARD_SCHEMA, CLOUD_SYSTEM_PROMPT, SYSTEM_PROMPT } from '../../core/prompt';
import { isQuiz, quizKind, quizRephrase } from '../../core/rules';

const NOW = new Date(2026, 10, 12, 15, 40);
const TELL = /^If you know it, say it/;

describe('one on-device call: the card schema carries the optional options', () => {
  it('schema and prompts', () => {
    expect(Object.keys(CARD_SCHEMA.properties)).toContain('options');
    expect(CARD_SCHEMA.required).not.toContain('options');
    expect(SYSTEM_PROMPT).toMatch(/"options": ONLY when/);
    expect(CLOUD_SYSTEM_PROMPT).toMatch(/"options": ONLY when/);
  });
});

describe('past events are never told as "today"', () => {
  it.each([
    'What year did you and your brother emigrate?',
    'When did we buy the caravan?',
    'How long ago did we move to this street?',
    'How old were you when you learned to drive?',
    'What month was the christening?',
  ])('%s', (q) => {
    expect(isQuiz(q)).toBe(true);
    const say = quizRephrase(q, 'Ann', NOW);
    expect(say).not.toMatch(/today|\b2026\b|Thursday/);
    expect(say).toMatch(TELL);
  });

  it('questions about now get the answer for now', () => {
    expect(quizRephrase('What year is it?', 'Ann', NOW)).toBe("It's 2026.");
    expect(quizRephrase('What month is it, do you know?', 'Ann', NOW)).toBe("It's November.");
    expect(quizRephrase("What's the date?", 'Ann', NOW)).toBe("It's Thursday today, 12 November.");
    expect(quizRephrase('What time is it?', 'Ann', NOW)).toBe("It's 15:40 now.");
  });
});

describe('memory questions by structure', () => {
  it.each([
    ['Remember when we took the ferry to Arran?', 'remember', 'I was thinking about when we took the ferry to Arran.'],
    ['Do you remember the old caravan, love?', 'remember', 'I was thinking about the old caravan.'],
    ['Can you recall who sang at the wedding?', 'remember', null],
    ['How old were you when you learned to drive?', 'fact', null],
    ['How many cousins have we got in Cork?', 'fact', null],
    ['Who were those people at the door yesterday?', 'fact', null],
  ])('%s', (q, kind, line) => {
    expect(quizKind(q)).toBe(kind);
    const say = quizRephrase(q, 'Ann', NOW);
    if (line) expect(say).toBe(line);
    else expect(say).toMatch(TELL);
  });

  it.each([
    'What do you remember about the wedding?', 'Remember to take your stick?', 'How old do you feel today?', 'When do you want to eat?',
    'Who do you want to see at the weekend?', 'What would you like on the radio?', 'When was the last time you had a drink?',
  ])('not a quiz: %s', (q) => expect(isQuiz(q)).toBe(false));
});
