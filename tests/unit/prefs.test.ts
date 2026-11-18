// What the app learns about the person (core/prefs.ts): counted by rules on this device from the confirmed answers and
// the needs board. Pinned here: nothing before three answers, no line on a tie or without a clear lead, the parts of
// the day, "usually says no", the needs board, remove / keep / forget everything; the usual choice goes first and no
// choice is ever dropped or added; the short question of a tree; and the privacy boundary: this file imports nothing,
// no file that builds a prompt or a request imports it, and the cloud text of the narrowing step never holds it.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { DeviceStatus, Engine, ModelResult } from '../../core/engine';
import { narrowAsk, narrowCard, narrowDeviceAsk, type NarrowInput } from '../../core/narrow';
import { LEAD_SHARE, MIN_ANSWERS, NOTHING_FORGOTTEN, checkedSummary, dayPart, forgetAll, forgetOne, hints, keepOne, learned, learnedPrompt, shortcut, usual, usualFirst, usualHint, type Need, type Seen } from '../../core/prefs';
import { cloudTextRequest } from '../../core/requests';
import { SAMPLE_PROFILE } from '../../core/sample';
import { COPY } from '../../core/copy';
import { cardScreen, answeredScreen, learnedBlock, aboutSimple } from '../../web/src/simple';

const ROOT = join(__dirname, '..', '..');
const TEA = 'Would you like tea or coffee?';
/** A time on a given day at a given hour, by this machine's clock (as the app reads it). */
const at = (day: number, hour: number) => new Date(2026, 10, day, hour, 15).getTime();
const seen = (q: string, labels: string[], hour = 9): Seen[] => labels.map((label, i) => ({ q, label, at: at(1 + i, hour) }));

describe('the usual choice: counted, and only with a clear lead', () => {
  it(`nothing before ${MIN_ANSWERS} confirmed answers to the same question`, () => {
    expect(usual(seen(TEA, ['tea', 'tea']), TEA)).toBeNull();
    expect(usual(seen(TEA, ['tea', 'tea', 'tea']), TEA)).toEqual({ label: 'tea', n: 3, of: 3 });
    expect(learned(seen(TEA, ['tea', 'tea']), [])).toEqual([]);
  });
  it('the same question whatever its capitals and punctuation; another question does not count', () => {
    const h = [...seen('would you like tea or coffee', ['tea', 'tea']), ...seen(TEA, ['Tea']), ...seen('Would you like water, juice or milk?', ['water', 'water', 'water'])];
    expect(usual(h, TEA)).toEqual({ label: 'tea', n: 3, of: 3 });
  });
  it('a tie is no usual choice, and neither is a lead under 60 %', () => {
    expect(LEAD_SHARE).toBe(0.6);
    expect(usual(seen(TEA, ['tea', 'coffee', 'tea', 'coffee']), TEA)).toBeNull();
    expect(usual(seen(TEA, ['tea', 'tea', 'coffee', 'coffee', 'tea', 'coffee', 'tea']), TEA)).toBeNull(); // 4 of 7 = 57 %
    expect(usual(seen(TEA, ['tea', 'tea', 'coffee', 'tea', 'tea', 'coffee', 'tea']), TEA)).toEqual({ label: 'tea', n: 5, of: 7 });
  });
  it('the hint for the carer: "Usually: tea (5 of 7)"', () => {
    expect(usualHint({ label: 'tea', n: 5, of: 7 })).toBe('Usually: tea (5 of 7)');
  });
});

describe('the usual choice goes first, and no choice is ever dropped, added or selected', () => {
  const choices = [{ label: 'tea' }, { label: 'coffee' }, { label: 'cocoa' }];
  it('first among the choices, the rest in their order', () => {
    expect(usualFirst(choices, 'cocoa').map((c) => c.label)).toEqual(['cocoa', 'tea', 'coffee']);
    expect(usualFirst(choices, 'Coffee').map((c) => c.label)).toEqual(['coffee', 'tea', 'cocoa']);
    expect(usualFirst(choices, 'tea')).toBe(choices);
  });
  it('every choice that came in goes out, once, whatever the label (also one that is not among them)', () => {
    for (const label of ['tea', 'coffee', 'cocoa', 'water', '', null, undefined]) {
      const out = usualFirst(choices, label);
      expect(out).toHaveLength(choices.length);
      expect([...out].map((c) => c.label).sort()).toEqual(['cocoa', 'coffee', 'tea']);
      // the objects themselves: nothing is marked as chosen
      for (const c of out) expect(Object.keys(c)).toEqual(['label']);
    }
  });
});

describe('what is learned, in plain words', () => {
  it('a usual choice, a usual yes and a usual no, each with its counts', () => {
    const h = [...seen(TEA, ['tea', 'tea', 'coffee', 'tea']), ...seen('Would you like a wash now or later?', ['later', 'later', 'later']), ...seen('Would you like to go for a walk?', ['no', 'no', 'yes', 'no']), ...seen('Would you like some music on?', ['yes', 'yes', 'yes'])];
    expect(learned(h, []).map((l) => l.text)).toEqual([
      '"Would you like tea or coffee": usually tea (3 of 4).',
      '"Would you like a wash now or later": usually later (3 of 3).',
      'Usually says no to "Would you like to go for a walk" (3 of 4).',
      'Usually says yes to "Would you like some music on" (3 of 3).',
    ]);
    expect(learned(h, []).map((l) => l.kind)).toEqual(['usual', 'usual', 'no', 'usual']);
  });
  it('the parts of the day: morning 5 to 12, afternoon 12 to 17, evening after that', () => {
    expect([5, 11].map((h) => dayPart(at(3, h)))).toEqual(['morning', 'morning']);
    expect([12, 16].map((h) => dayPart(at(3, h)))).toEqual(['afternoon', 'afternoon']);
    expect([17, 23, 2].map((h) => dayPart(at(3, h)))).toEqual(['evening', 'evening', 'evening']);
  });
  it('a pattern by time of day needs three answers in each part and a different lead: "tea in the morning, water in the evening"', () => {
    const Q = 'Would you like something hot or something cold?';
    const h = [...seen(Q, ['something hot', 'something hot', 'something hot'], 8), ...seen(Q, ['something cold', 'something cold', 'something cold'], 19)];
    expect(learned(h, []).map((l) => l.text)).toEqual(['"Would you like something hot or something cold": something hot in the morning (3 of 3), something cold in the evening (3 of 3).']);
    // two answers in the evening are not enough for a pattern: with 3 of 5 the morning's choice is the usual one overall
    const few = [...seen(Q, ['something hot', 'something hot', 'something hot'], 8), ...seen(Q, ['something cold', 'something cold'], 19)];
    expect(learned(few, []).map((l) => l.text)).toEqual(['"Would you like something hot or something cold": usually something hot (3 of 5).']);
    // the same lead in both parts is not a pattern by time
    const same = [...seen(Q, ['something hot', 'something hot', 'something hot'], 8), ...seen(Q, ['something hot', 'something hot', 'something hot'], 19)];
    expect(learned(same, []).map((l) => l.kind)).toEqual(['usual']);
  });
  it('the needs board: what, how often, and when (a part of the day only when it leads)', () => {
    const needs: Need[] = [8, 9, 10, 20].map((h, i) => ({ label: 'toilet', at: at(1 + i, h) }));
    expect(learned([], needs).map((l) => l.text)).toEqual(['Asked for "toilet" on the needs board 4 times, mostly in the morning (3 of 4).']);
    expect(learned([], needs.slice(0, 2))).toEqual([]);
    const spread: Need[] = [8, 13, 20].map((h, i) => ({ label: 'drink', at: at(1 + i, h) }));
    expect(learned([], spread).map((l) => l.text)).toEqual(['Asked for "drink" on the needs board 3 times.']);
  });
});

describe('the carer decides: remove a line, keep it as a fact, forget everything learned', () => {
  const h = seen(TEA, ['tea', 'tea', 'tea']);
  const key = learned(h, [])[0].key;
  it('remove: the answers so far no longer count for that line, and the hint on the card is gone', () => {
    const f = forgetOne(NOTHING_FORGOTTEN, key, at(20, 9));
    expect(learned(h, [], f)).toEqual([]);
    expect(usual(h, TEA, f)).toBeNull();
    // it is learned again only from new answers: three more
    const later = [...h, ...['coffee', 'coffee', 'coffee'].map((label, i) => ({ q: TEA, label, at: at(21 + i, 9) }))];
    expect(usual(later, TEA, f)).toEqual({ label: 'coffee', n: 3, of: 3 });
    expect(usual(later.slice(0, 5), TEA, f)).toBeNull();
  });
  it('keep as a fact: the line is not offered again, and the hint on the card stays', () => {
    const f = keepOne(NOTHING_FORGOTTEN, key);
    expect(learned(h, [], f)).toEqual([]);
    expect(usual(h, TEA, f)).toEqual({ label: 'tea', n: 3, of: 3 });
    expect(keepOne(f, key)).toBe(f);
  });
  it('forget everything learned: nothing before that moment counts, for any question or need', () => {
    const f = forgetAll(at(25, 12));
    const needs: Need[] = [1, 2, 3].map((d) => ({ label: 'toilet', at: at(d, 9) }));
    expect(learned([...h, ...seen('Would you like some more?', ['no', 'no', 'no'])], needs, f)).toEqual([]);
    expect(usual(h, TEA, f)).toBeNull();
    expect(f).toEqual({ all: at(25, 12), one: {}, kept: [] });
  });
});

describe('a shorter way through a tree: a suggestion, in the question\'s own words', () => {
  const Q = 'Would you like something sweet or something savoury?';
  it('the usual side of the next either-or can be asked first; the full question stays', () => {
    const s = shortcut(seen(Q, ['something sweet', 'something sweet', 'something savoury', 'something sweet']), Q);
    expect(s).toEqual({ q: 'Would you like something sweet?', usual: { label: 'something sweet', n: 3, of: 4 }, line: 'Usually picks something sweet here (3 of 4). You can ask that first:' });
    expect(shortcut(seen('Would you like a hot drink or a cold drink?', ['hot drink', 'hot drink', 'hot drink']), 'Would you like a hot drink or a cold drink?')?.q).toBe('Would you like a hot drink?');
    expect(shortcut(seen('Would you like to rest in the bed or the chair?', ['chair', 'chair', 'chair']), 'Would you like to rest in the bed or the chair?')?.q).toBe('Would you like the chair?');
  });
  it('none before three answers, none for a yes / no question, none when the question does not name the choice', () => {
    expect(shortcut(seen(Q, ['something sweet', 'something sweet']), Q)).toBeNull();
    expect(shortcut(seen('Are you hungry?', ['yes', 'yes', 'yes']), 'Are you hungry?')).toBeNull();
    expect(shortcut(seen('How did you sleep?', ['good', 'good', 'good']), 'How did you sleep?')).toBeNull();
  });
  it('on the screen: the hint on the card, and the short question under the main "Next" button, which stays', () => {
    const made = { maker: 'code' as const, left: 'nothing' as const, spoken: false, lines: ['a', 'b'] };
    const h = answeredScreen({ name: '', label: 'snack', question: 'Would you like a snack or a meal?', more: false, end: '', out: false, afterHtml: '', next: null, follow: [Q], tryNext: null, who: false, invite: false, narrow: null, narrowLast: false, short: null, hasAnswers: true, today: [], made, privacy: [],
      shortcut: { q: 'Would you like something sweet?', line: 'Usually picks something sweet here (3 of 4). You can ask that first:', of: Q, label: 'something sweet' } });
    expect(h).toContain(`id="next-q" data-q="${Q}" data-next="1"`);
    expect(h).toContain('data-short="1"');
    expect(h).toContain('data-q="Would you like something sweet?">Would you like something sweet?</button>');
    expect(h.indexOf('id="next-q"')).toBeLessThan(h.indexOf('id="shortcut"'));
    expect(h).toContain('Usually picks something sweet here (3 of 4).');
  });
});

describe('About them: "What we\'ve learned"', () => {
  const lines = learned(seen(TEA, ['tea', 'tea', 'tea']), []);
  it('every line with "Keep as a fact" and "Remove", how it was learned, and "Forget everything learned"', () => {
    const html = learnedBlock({ name: 'Frank', lines, facts: [], short: null });
    expect(html).toContain("What we&#39;ve learned about Frank");
    expect(html).toContain('usually tea (3 of 3).');
    expect(html).toContain(`data-act="learned-keep" data-key="${lines[0].key}"`);
    expect(html).toContain(`data-act="learned-remove" data-key="${lines[0].key}"`);
    expect(html).toContain('data-act="learned-forget"');
    expect(html).toContain('no AI, and the app never sends it anywhere (the usual choices leave only in a note for the next carer, if you share one yourself)');
    expect(html).toContain('Frank always chooses, not the app');
    expect(learnedBlock({ name: '', lines, facts: [], short: null })).toContain('they always choose for themselves');
  });
  it('nothing learned yet: said plainly, and no "forget" button', () => {
    const html = learnedBlock({ name: '', lines: [], facts: [], short: null });
    expect(html).toContain(COPY.simple.learned.none(''));
    // once the name is set the lines use it, not "they"
    const named = learnedBlock({ name: 'Frank', lines: [], facts: [], short: null });
    expect(named).toContain('Frank&#39;s usual choice shows here.');
    expect(named).toContain('from the answers Frank confirmed');
    expect(named.slice(named.indexOf('class="lock"'))).not.toMatch(/\bthey\b|\btheir\b/);
    expect(html).not.toContain('learned-forget');
    expect(aboutSimple({ profile: SAMPLE_PROFILE, open: null, saved: false })).toContain('id="learned"');
  });
  it('a kept fact stands under "Facts you kept", with its own "Remove"; the on-device summary is labelled as such', () => {
    const html = learnedBlock({ name: '', lines: [], facts: ['"Would you like tea or coffee": usually tea (3 of 3).'], short: ['Mornings: tea.'] });
    expect(html).toContain('id="learned-kept"');
    expect(html).toContain('data-act="fact-remove" data-fact="0"');
    expect(html).toContain('id="learned-short"');
    expect(html).toContain('by the AI built into Chrome on this computer. Nothing was sent.');
  });
});

describe('the optional summary by the on-device model: only what the lines hold', () => {
  const lines = learned([...seen(TEA, ['tea', 'tea', 'tea']), ...seen('Are you tired?', ['yes', 'yes', 'yes'], 14)], []);
  it('the prompt holds the learned lines and nothing else', () => {
    expect(learnedPrompt(lines)).toContain('- "Would you like tea or coffee": usually tea (3 of 3).');
    expect(learnedPrompt(lines).split('\n')).toHaveLength(1 + lines.length);
  });
  it('one to four short sentences pass; a number the lines do not hold, a long text or no list does not', () => {
    expect(checkedSummary(['Usually tea.', 'Often tired.'], lines)).toEqual(['Usually tea.', 'Often tired.']);
    expect(checkedSummary(['Tea 3 of 3 times.'], lines)).toEqual(['Tea 3 of 3 times.']);
    expect(checkedSummary(['Tea 9 times out of 10.'], lines)).toBeNull();
    expect(checkedSummary(['x'.repeat(201)], lines)).toBeNull();
    expect(checkedSummary('Usually tea.', lines)).toBeNull();
    expect(checkedSummary([], lines)).toBeNull();
  });
});

describe('the privacy boundary: what was learned never reaches a cloud request', () => {
  it('core/prefs.ts imports nothing', () => {
    expect(readFileSync(join(ROOT, 'core/prefs.ts'), 'utf8')).not.toMatch(/^import /m);
  });
  it.each(['core/prompt.ts', 'core/requests.ts', 'core/strip.ts', 'core/pipeline.ts', 'core/rules.ts', 'core/engine.ts', 'core/receipt.ts', 'core/narrow.ts', 'core/kinds.ts', 'core/tree.ts', 'core/topics.ts', 'core/summary.ts', 'web/src/ai/firebaseEngine.ts', 'web/src/ai/pick.ts', 'web/src/ai/app.ts', 'web/src/ai/remoteConfig.ts'])('%s imports neither the learned preferences nor the history', (f) => {
    const src = readFileSync(join(ROOT, f), 'utf8');
    expect(src).not.toMatch(/from\s+['"][^'"]*\/(?:prefs|history)['"]/);
  });
  it('the narrowing step: the learned hints are in the ON-DEVICE text only; the cloud text and its request never hold them', async () => {
    const h = seen(TEA, ['tea', 'tea', 'tea']);
    const learnedLines = hints(h, []);
    expect(learnedLines).toEqual(['"Would you like tea or coffee": usually tea (3 of 3).']);
    const i: NarrowInput = { asked: 'Would you like water, juice or milk?', rejected: ['water', 'juice', 'milk'], level: 1, sofar: [], learned: learnedLines };
    expect(narrowDeviceAsk(i)).toContain('Learned on this device over time (hints only): "Would you like tea or coffee": usually tea (3 of 3).');
    expect(narrowAsk(i)).not.toMatch(/usually|Learned|3 of 3/);
    const sent: string[] = [];
    const engine: Engine = {
      label: 'x', modes: { device: 'ONLY_ON_DEVICE', cloud: 'PREFER_IN_CLOUD' }, cloudConfigured: true,
      async deviceStatus(): Promise<DeviceStatus> { return 'unavailable'; }, async prepareDevice() {}, async runDevice(): Promise<ModelResult> { throw new Error('no model'); },
      cloudRequest: (q: string) => cloudTextRequest(q),
      async runCloud(q: string): Promise<ModelResult> { sent.push(q); return { text: JSON.stringify({ topic: 'x', kind: 'choice', choices: ['something to eat', 'a rest'] }), source: 'in-cloud', ms: 1 }; },
    };
    const card = await narrowCard(i, { profile: SAMPLE_PROFILE, support: 'more', engine, allowCloud: true, deviceReady: false });
    expect(sent).toHaveLength(1);
    expect(sent[0]).not.toMatch(/usually|Learned|3 of 3/);
    expect(card.cloudPayload ?? '').not.toMatch(/usually|Learned on this device|3 of 3/);
  });
  it('the web client: the pipeline gets the profile and settings only; the on-device summary of the learned lines has no cloud step', () => {
    const main = readFileSync(join(ROOT, 'web/src/main.ts'), 'utf8');
    for (const call of [...main.matchAll(/await makeCard\([\s\S]*?\}\);/g)].map((m) => m[0])) expect(call).not.toMatch(/learned|needsLog|forgotten|usual/);
    const fn = main.slice(main.indexOf('function refreshLearnedShort()'), main.indexOf('// ---------------------------------------------------------------- pieces'));
    expect(fn).toContain('state.engine.summarizeDevice(learnedPrompt(lines))');
    expect(fn).toContain("r.source !== 'on-device'");
    expect(fn).not.toMatch(/runCloud|transcribe/);
    // nothing is learned from, or shown for, the sample family of judge mode
    expect(main).toContain('const learns = () => !state.demo;');
  });
  it('the hint on the carer\'s screen is for the carer: it is outside the person\'s card', async () => {
    const { makeCard } = await import('../../core/pipeline');
    const { NullEngine } = await import('../../core/engine');
    const { partnerActions } = await import('../../core/actions');
    const { madeWhere } = await import('../../core/simple');
    const c = await makeCard(TEA, { profile: SAMPLE_PROFILE, support: 'more', engine: new NullEngine(), allowCloud: false, deviceReady: false });
    const html = cardScreen({ name: '', card: c, less: false, recap: false, recapText: '', recapDone: false, actions: partnerActions(c, { less: false, hasAnswers: false }), made: madeWhere(c, { about: 'About them' }), personHtml: '<p>PERSON</p>', canAskOnline: false, offline: false, lastTime: '', usual: 'Usually: tea (5 of 7)' });
    expect(html).toContain('<p class="usual" id="usual">');
    expect(html.indexOf('id="usual"')).toBeLessThan(html.indexOf('id="person"'));
    expect(html.slice(html.indexOf('id="person"'), html.indexOf('</section>', html.indexOf('id="person"')))).not.toContain('Usually');
  });
});
