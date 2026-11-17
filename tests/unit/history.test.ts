// The list of confirmed answers ("last time they chose…"): kept on this computer, shown to the partner only, and
// never part of anything a model sees.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { COPY } from '../../core/copy';
import { addAnswer, answerCounts, lastAnswer, questionKey, topQuestions, whenText, type Answered } from '../../core/history';

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

describe('the questions asked most often, for the one-tap chips above the question field', () => {
  it('most often first, in the wording last used; the more recent first when level; three at most', () => {
    expect(topQuestions(h)).toEqual([
      { q: 'Where do you want to go this afternoon?', times: 3, last: NOW - 3600000 },
      { q: 'What would you like for dinner?', times: 1, last: NOW - 2 * DAY },
    ]);
    const more = [...h, { q: 'Tea?', topic: 'tea', label: 'yes', at: NOW }, { q: 'Shall we ring Jen?', topic: 'call', label: 'yes', at: NOW - 60000 }];
    expect(topQuestions(more).map((t) => t.q)).toEqual(['Where do you want to go this afternoon?', 'Tea?', 'Shall we ring Jen?']);
    expect(topQuestions(more, 1)).toHaveLength(1);
    expect(topQuestions([])).toEqual([]);
  });
  it('the chips carry the question only: no answer, no count of answers per choice', () => {
    expect(Object.keys(topQuestions(h)[0]).sort()).toEqual(['last', 'q', 'times']);
    expect(COPY.ask.againTitle(2)).toBe('Answered 2 times on this computer. Tap to ask it again.');
    expect(COPY.ask.againTitle(1)).toBe('Answered 1 time on this computer. Tap to ask it again.');
  });
  it('the web client shows them outside judge mode only, and a tap goes through the same pipeline as a typed question', () => {
    const main = readFileSync(join(ROOT, 'web/src/main.ts'), 'utf8');
    // (17 Nov 2026: in judge mode the sample line also holds the link to the recording of the on-device step)
    expect(main).toContain("${state.demo ? `<p class=\"sample\">${C.app.sample}<span id=\"rec-link\">${recordedLink()}</span></p>` : againChips()}");
    const chips = main.slice(main.indexOf('function againChips()'), main.indexOf('function partnerScreen()'));
    expect(chips).toContain('topQuestions(state.history, 3)');
    expect(chips).not.toMatch(/label|lastAnswer|answerCounts/); // the chip never carries what was answered
    expect(main).toContain("if (t.dataset.q) { state.lastQuestion = t.dataset.q; void make(t.dataset.q); return; }");
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
    // every call of the pipeline in the client (a typed question, and the card judge mode opens with): from the call to its closing "});"
    const calls = [...main.matchAll(/await makeCard\([\s\S]*?\}\);/g)].map((m) => m[0]);
    expect(calls).toHaveLength(2);
    expect(calls[0]).toContain('profile: SAMPLE_PROFILE');
    expect(calls[1]).toContain('profile: state.profile');
    for (const call of calls) expect(call).not.toMatch(/history/);
  });
});
