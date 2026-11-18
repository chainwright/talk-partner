// The card defects of 17 Nov 2026 (design/topics_2026-11-17/SUMMARY.md §4, TOPICS.md §8) and the clinical fixes of the
// same round (§5): no generic title, a way out is never a real choice, one real option becomes a yes / no card, a
// neutral middle for hot / cold, a three-step pain scale. All examples written for this file.
import { describe, expect, it } from 'vitest';
import type { DeviceStatus, Engine, ModelResult } from '../../core/engine';
import { NullEngine } from '../../core/engine';
import { makeCard, noEscapeOnly } from '../../core/pipeline';
import { cloudTextRequest } from '../../core/requests';
import { codeOptions, frameTopic, heuristicTopic, isEscapeLabel, listedAnswers, orHeadline, route, validTopic, withSame } from '../../core/rules';
import { SAMPLE_PROFILE } from '../../core/sample';
import { EMPTY_PROFILE, type Card, type ModelOutput, type Profile } from '../../core/types';
import { PROFILE } from './fixtures';

/** No on-device model; the cloud answers with `cloud` (or refuses when null). Calls are counted. */
class Cloud implements Engine {
  label = 'cloud-only';
  modes = { device: 'ONLY_ON_DEVICE', cloud: 'PREFER_IN_CLOUD' };
  cloudConfigured = true;
  calls: string[] = [];
  constructor(private cloud: ModelOutput | null) {}
  async deviceStatus(): Promise<DeviceStatus> { return 'unavailable'; }
  async prepareDevice() {}
  async runDevice(): Promise<ModelResult> { this.calls.push('device'); throw new Error('no model'); }
  cloudRequest(q: string) { return cloudTextRequest(q); }
  async runCloud(): Promise<ModelResult> { this.calls.push('cloud'); if (!this.cloud) throw new Error('refused'); return { text: JSON.stringify(this.cloud), source: 'in-cloud', ms: 2 }; }
}
const rules = (q: string, profile: Profile = PROFILE) => makeCard(q, { profile, support: 'more', engine: Object.assign(new NullEngine(), { cloudConfigured: true }), allowCloud: false, deviceReady: false });
const cloud = (q: string, out: ModelOutput, profile: Profile = PROFILE) => makeCard(q, { profile, support: 'more', engine: new Cloud(out), allowCloud: true, deviceReady: false });
const labels = (c: Card) => c.choices.map((x) => x.label);
const GENERIC = /^(?:question|questions|which one|choices|choice|options?)$/i;
const noTwins = (c: Card) => { for (let p: Card | null | undefined = c; p; p = p.nextPage) expect(new Set(labels(p).map((l) => l.toLowerCase())).size).toBe(p.choices.length); };

describe('defect 1: never a generic title', () => {
  const ALL_STOP = ['What would you like to do?', 'What do you want?', 'What do you need?', 'What now?', 'What is it?', 'Which do you want?'];
  it('the fallback title of a question of function words is taken from its verb, or is empty', () => {
    expect(heuristicTopic('What would you like to do?')).toBe('what to do');
    expect(heuristicTopic('What do you want?')).toBe('what you want');
    expect(heuristicTopic('What do you need?')).toBe('what you need');
    expect(heuristicTopic('What now?')).toBe('');
    expect(frameTopic('Where shall we go?')).toBe('where to');
    for (const q of ALL_STOP) expect(heuristicTopic(q)).not.toMatch(GENERIC);
  });
  it('a question with content words keeps them as before', () => {
    expect(heuristicTopic('Did the physio go well this morning?', PROFILE)).toBe('physio well morning');
  });
  it.each(ALL_STOP)('rules path, no model: %s has no generic title', async (q) => {
    const c = await rules(q);
    expect(c.topic).not.toMatch(GENERIC);
  });
  it.each(['', 'want', 'question', 'Question', 'which one', 'choices', 'the question'])('a cloud answer with the topic "%s" does not become the title "question"', async (topic) => {
    for (const q of ['What would you like to do?', 'What do you want?', 'What do you need?']) {
      const c = await cloud(q, { topic, kind: 'choice', choices: ['sit outside', 'read the paper'] });
      expect(c.blocked).toBeFalsy();
      expect(c.source).toBe('in-cloud');
      expect(c.topic).not.toMatch(GENERIC);
      expect(c.topic).toBe(frameTopic(q));
    }
  });
  it('a model topic that only says "this is a question" is no headline; a real one still is', () => {
    for (const t of ['question', 'Questions', 'choice', 'options', 'which one', 'topic']) expect(validTopic(t)).toBe('');
    expect(validTopic('weekend plans')).toBe('weekend plans');
  });
  it('an either-or whose sides share nothing gets no headline instead of "which one"', () => {
    expect(orHeadline('Would you like your glasses or your hearing aid?', ['your glasses', 'your hearing aid'], PROFILE)).not.toMatch(GENERIC);
    expect(orHeadline('The big tartan blanket or the little quilted throw?', ['big tartan blanket', 'little quilted throw'], PROFILE)).toBe('');
  });
  it('a title that would repeat one of the answers is dropped, not replaced by "choices"', async () => {
    const c = await cloud('What do you want?', { topic: 'tea', kind: 'choice', choices: ['tea', 'toast'] });
    expect(c.topic).not.toMatch(GENERIC);
    expect(labels(c).map((l) => l.toLowerCase())).not.toContain(c.topic.toLowerCase());
  });
});

describe('defect 2: a way out is never counted as a real choice', () => {
  it('one shared check knows the ways out, and nothing else', () => {
    for (const l of ['something else', 'Something else?', 'someone else', 'somewhere else', 'not sure', 'anything else', 'something different', 'other', 'another one', 'or something else']) expect(isEscapeLabel(l)).toBe(true);
    for (const l of ['rest', 'the other one', 'something to eat', 'nothing', 'neither', 'else', 'another cup', 'not today']) expect(isEscapeLabel(l)).toBe(false);
  });
  it('the readers of the partner\'s own options leave the way out out', () => {
    expect(listedAnswers('What do you want? Rest or something else?', PROFILE)).toEqual({ q: 'What do you want?', options: ['rest'] });
    expect(listedAnswers('What do you want? Tea, toast or something else?', PROFILE)?.options).toEqual(['tea', 'toast']);
    expect(codeOptions('Do you want a rest or something else?', PROFILE)).toEqual(['rest']);
    expect(codeOptions('Do you want coffee or tea?', PROFILE)).toEqual(['coffee', 'tea']);
    expect(codeOptions('Something else or anything else?', PROFILE)).toBeNull();
  });
  it('routing does not count a way out as a usable choice', () => {
    expect(route('choice', 'What do you want?', ['rest', 'anything else'], false).reasons).toContain('fewer than two usable choices');
  });
  it.each(['What do you want? Rest or something else?', 'Do you want a rest or something else?', 'Would you like a rest, or anything else?'])('one real option -> a yes / no card on it, by the rules: %s', async (q) => {
    const c = await rules(q);
    expect(c.blocked).toBeFalsy();
    expect(c.kind).toBe('yesno');
    expect(labels(c)).toEqual(['yes', 'no', 'not sure']);
    expect(c.choices.map((x) => x.role)).toEqual(['answer', 'answer', 'escape']);
    expect(c.topic).toBe('rest');
    expect(c.asked).toBe('Rest?');
    expect(c.say).toMatch(/Rest\? Yes, no, or not sure\?$/);
    expect(c.source).toBe('code');
    expect(c.cloudPayload).toBeNull();
    expect(c.notes.join(' ')).toContain('asked as a yes / no question');
    expect(c.why?.decided).toContain('yes / no');
  });
  it('the line to say keeps the partner\'s own words in front', async () => {
    expect((await rules('What do you want? Rest or something else?')).say).toBe('What do you want? Rest? Yes, no, or not sure?');
  });
  it('a cloud answer ["rest", "something else"] gives the same yes / no card, and says it came from online help', async () => {
    const c = await cloud('What do you want?', { topic: 'want', kind: 'choice', choices: ['rest', 'something else'] });
    expect(c.kind).toBe('yesno');
    expect(labels(c)).toEqual(['yes', 'no', 'not sure']);
    expect(c.topic).toBe('rest');
    expect(c.source).toBe('in-cloud');
    expect(c.cloudPayload).toBeTruthy();
    expect(c.why?.dropped.map((d) => d.label)).toContain('something else');
  });
  it('a cloud answer of nothing but ways out gives no card: the existing "No card for this one" path', async () => {
    for (const choices of [['something else'], ['something else', 'anything else'], ['other', 'not sure']]) {
      const c = await cloud('What do you want?', { topic: 'want', kind: 'choice', choices });
      expect(c.blocked).toBeTruthy();
      expect(c.choices).toEqual([]);
    }
  });
  it('a lone model choice with no way out beside it is not turned into a yes / no card', async () => {
    const c = await cloud('What should we do about the bus pass?', { topic: 'bus', kind: 'choice', choices: ['happy'] });
    expect(c.blocked).toBeTruthy();
    expect(c.kind).not.toBe('yesno');
  });
  it('two real options and a way out named by the partner: the two, and the card\'s own way out once', async () => {
    const c = await rules('What do you want? Tea, toast or something else?');
    expect(labels(c)).toEqual(['tea', 'toast', 'something else']);
    expect(c.choices.filter((x) => x.role === 'escape')).toHaveLength(1);
  });
  it('no card shows two tiles with the same label, on any page', async () => {
    const qs = ['What do you want? Rest or something else?', 'Is it your body, people, plans, or something else?', 'What do you want? Tea, toast or something else?', 'Do you want tea, coffee, something else or anything else?', 'Would you like water, juice or milk?'];
    for (const q of qs) noTwins(await rules(q));
    noTwins(await cloud('What do you want?', { topic: 'x', kind: 'choice', choices: ['a rest', 'a rest', 'something else', 'toast', 'Something else'] }));
  });
  it('the rule itself: two real answers pass untouched; one needs the way-out mark; none is no card', () => {
    const ch = (label: string, role: 'answer' | 'escape') => ({ label, spoken: label, role, picture: { type: 'word' as const } });
    const base: Card = { asked: 'What do you want?', pending: null, topic: '', kind: 'choice', choices: [], say: '', source: 'code', route: { to: 'device', reasons: [] }, cloudPayload: null, notes: [], ms: 0 };
    const two = { ...base, choices: [ch('tea', 'answer'), ch('toast', 'answer'), ch('something else', 'escape')] };
    expect(noEscapeOnly(two)).toBe(two);
    const fake = { ...base, choices: [ch('rest', 'answer'), ch('something else', 'answer'), ch('something else', 'escape')] };
    expect(noEscapeOnly(fake).blocked).toBeTruthy();
    expect(noEscapeOnly({ ...fake, oneOption: true }).kind).toBe('yesno');
    expect(noEscapeOnly({ ...base, choices: [ch('something else', 'escape')] }).blocked).toBeTruthy();
  });
});

describe('a neutral middle for hot / cold', () => {
  it('a pair of the two ends gets "just right"; other pairs are untouched', () => {
    expect(withSame(['hot', 'cold'])).toEqual(['hot', 'cold', 'just right']);
    expect(withSame(['too cold', 'too hot'])).toEqual(['too cold', 'too hot', 'just right']);
    expect(withSame(['warm', 'cool'])).toEqual(['warm', 'cool', 'just right']);
    expect(withSame(['hot drink', 'cold drink'])).toEqual(['hot drink', 'cold drink']);
    expect(withSame(['hot', 'warm'])).toEqual(['hot', 'warm']);
    expect(withSame(['better', 'worse'])).toEqual(['better', 'worse', 'the same']);
  });
  it.each(['Are you too hot or too cold?', 'Are you hot or cold?', 'Are you too warm or too cold?'])('%s: all three on one card at "2 at a time", by the rules', async (q) => {
    const c = await rules(q, EMPTY_PROFILE);
    expect(labels(c).slice(-2)).toEqual(['just right', 'something else']);
    expect(c.choices.filter((x) => x.role === 'answer')).toHaveLength(3);
    expect(c.nextPage).toBeFalsy();
    expect(c.source).toBe('code');
    expect(c.topic).not.toMatch(GENERIC);
    expect(c.say).toContain('just right');
  });
  it('a hot or a cold drink is still a plain either-or', async () => {
    expect(labels(await rules('Would you like a hot drink or a cold drink?'))).toEqual(['hot drink', 'cold drink', 'something else']);
  });
});

describe('the pain scale has three steps and "not sure"', () => {
  it.each(['mild', 'more', 'most'] as const)('at support "%s"', async (support) => {
    const c = await makeCard('How bad is the pain?', { profile: SAMPLE_PROFILE, support, engine: new NullEngine(), allowCloud: false, deviceReady: false });
    expect(c.kind).toBe('pain');
    expect(labels(c)).toEqual(['a little', 'quite bad', 'very bad', 'not sure']);
    expect(c.choices[3].role).toBe('escape');
    expect(c.nextPage).toBeFalsy();
    expect(c.say).toBe('How bad is the pain? A little, quite bad, very bad, or not sure?');
    // every step has a picture (the bars), and the word under it
    for (const ch of c.choices.slice(0, 3)) expect(ch.picture.type).toBe('builtin');
  });
  it('a number scale named in the question is still the number line', async () => {
    const c = await rules('How bad is the pain, from 0 to 10?');
    expect(c.scale).toEqual({ lo: 0, hi: 10 });
  });
});
