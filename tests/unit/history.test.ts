// The list of confirmed answers ("last time they chose…"): kept on this computer, shown to the partner only, and
// never part of anything a model sees.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { COPY } from '../../core/copy';
import { addAnswer, answerCounts, lastAnswer, questionKey, whenText, type Answered } from '../../core/history';

const ROOT = join(__dirname, '..', '..');
const DAY = 86400000;
const NOW = new Date(2026, 10, 16, 15, 0).getTime();
const h: Answered[] = [
  { q: 'Where do you want to go this afternoon?', topic: 'this afternoon', label: 'lake', at: NOW - 9 * DAY },
  { q: 'What would you like for dinner?', topic: 'dinner', label: 'chili', at: NOW - 2 * DAY },
  { q: 'where do you want to go this afternoon', topic: 'this afternoon', label: 'church', at: NOW - DAY },
  { q: 'Where do you want to go this afternoon?', topic: 'this afternoon', label: 'lake', at: NOW - 3600000 },
];

describe('confirmed answers, kept on this computer', () => {
  it('the same question matches whatever the capitals and punctuation', () => {
    expect(questionKey('  Where do you want to go, this afternoon?? ')).toBe(questionKey('where do you want to go this afternoon'));
  });
  it('last time: the most recent answer to this question from before this card was made', () => {
    expect(lastAnswer(h, 'Where do you want to go this afternoon?')?.label).toBe('lake');
    expect(lastAnswer(h, 'Where do you want to go this afternoon?', NOW - 3600000)?.label).toBe('church');
    expect(lastAnswer(h, 'What would you like for dinner?')?.label).toBe('chili');
    expect(lastAnswer(h, 'Do you want coffee or tea?')).toBeNull();
    expect(lastAnswer(h, 'What would you like for dinner?', NOW - 5 * DAY)).toBeNull();
  });
  it('counts per answer, most often first', () => {
    expect(answerCounts(h, 'Where do you want to go this afternoon?')).toEqual([{ label: 'lake', n: 2 }, { label: 'church', n: 1 }]);
  });
  it('adds at the end, drops the oldest past the cap, ignores an empty answer', () => {
    const a = { q: 'Tea?', topic: 'tea', label: 'yes', at: NOW };
    expect(addAnswer(h, a)).toHaveLength(5);
    expect(addAnswer(h, a, 3).map((x) => x.label)).toEqual(['church', 'lake', 'yes']);
    expect(addAnswer(h, { ...a, label: ' ' })).toBe(h);
    expect(h).toHaveLength(4); // the list passed in is never changed
  });
  it('when, in calendar days of this computer', () => {
    expect(whenText(NOW - 3600000, NOW)).toBe('earlier today');
    expect(whenText(NOW - DAY, NOW)).toBe('yesterday');
    expect(whenText(NOW - 3 * DAY, NOW)).toBe('3 days ago');
    expect(whenText(NOW - 9 * DAY, NOW)).toBe('7 Nov');
  });
  it('the partner line never presents last time as the answer', () => {
    expect(COPY.card.lastTime('yesterday', 'lake')).toBe('Last time (yesterday) they chose "lake". Ask again all the same: today\'s answer is theirs.');
  });
});

describe('an answer never reaches a model', () => {
  // the files that build what a model sees (on this computer or in the cloud) and the engine that sends it
  it.each(['core/prompt.ts', 'core/requests.ts', 'core/strip.ts', 'core/pipeline.ts', 'core/rules.ts', 'core/engine.ts', 'core/receipt.ts', 'web/src/ai/firebaseEngine.ts', 'web/src/ai/pick.ts'])('%s does not import the history', (f) => {
    expect(readFileSync(join(ROOT, f), 'utf8')).not.toMatch(/history/i);
  });
  it('the history module imports nothing', () => {
    expect(readFileSync(join(ROOT, 'core/history.ts'), 'utf8')).not.toMatch(/^import /m);
  });
  it('the web client hands the pipeline the profile and settings only', () => {
    const main = readFileSync(join(ROOT, 'web/src/main.ts'), 'utf8');
    const call = main.slice(main.indexOf('await makeCard(q, {'), main.indexOf('setCard(card);'));
    expect(call).toContain('profile: state.profile');
    expect(call).not.toMatch(/history/);
  });
});
