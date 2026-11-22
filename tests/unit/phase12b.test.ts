// Phase 12b (22 Nov 2026), the fixes of judge round 9b. Every new or changed line is walked on its worst case: can it
// help a carer dismiss pain, a need or distress? Each health item has a test that failed before its fix.
import { describe, expect, it } from 'vitest';
import { after } from '../../core/tree';
import { EMPTY_PROFILE } from '../../core/types';

const card = (asked: string) => ({ asked, kind: 'choice' as const });
const end = (asked: string, label: string, name = '', number = '') => after(card(asked), label, { ...EMPTY_PROFILE, personName: name }, [], number).end;

describe('1. The pain scale: pictures of pain, not anger; "quite bad" calls now', () => {
  it('the three faces are pictures made with Gemini (the Faces Pain Scale style), the words stay under them', async () => {
    const { builtinPicto, IMAGE_IDS, svgPicto } = await import('../../web/src/pictos');
    for (const [id, file] of [['pain mild', 'pain_mild'], ['pain medium', 'pain_medium'], ['pain strong', 'pain_strong']]) {
      expect(IMAGE_IDS, id).toContain(id);
      expect(builtinPicto(id), id).toContain(`src="/pictures/${file}.webp"`);
      // the drawing (the fallback) has no teeth and no grin: no white mouth on the strong face
      expect(svgPicto(id), id).not.toContain('fill="#ffffff"');
    }
  });
  it('the fallback drawings: brows raised at the inner ends (never the angry V)', async () => {
    const { svgPicto } = await import('../../web/src/pictos');
    for (const id of ['pain mild', 'pain medium']) {
      const m = svgPicto(id).match(/M(\d+) (\d+)l(\d+)(-?\d+)M(\d+) (\d+)l(-\d+)(-?\d+)/);
      expect(m, id).not.toBeNull();
      // the left brow goes up towards the middle, the right brow too
      expect(Number(m![4]), id).toBeLessThan(0);
      expect(Number(m![8]), id).toBeLessThan(0);
    }
  });
  it('"quite bad" takes the same route as "very bad": call the nurse or doctor now, never only the care plan', () => {
    for (const label of ['quite bad', 'very bad']) {
      const e = end('How bad is the pain?', label, 'Frank');
      expect(e, label).toMatch(/Call Frank's nurse or doctor now\b/);
      expect(e, label).toMatch(/call the emergency number/);
    }
    expect(end('How bad is the pain?', 'quite bad')).not.toMatch(/^Quite bad\. Follow/);
  });
});

describe('2. One "no" to the weakness question does not end the stroke check', () => {
  const Q = 'Is it suddenly weak or numb, yes or no?';
  it('the carer is asked to check it now, with the arms and the smile, and the number to call', () => {
    expect(end(Q, 'no', 'Frank', '999')).toBe('Frank pointed to no. A yes or no can be wrong after a stroke: check it yourself now. Ask Frank to lift both arms and smile. If one side drops or the face droops, call 999 now.');
    expect(end(Q, 'no')).toBe('They pointed to no. A yes or no can be wrong after a stroke: check it yourself now. Ask them to lift both arms and smile. If one side drops or the face droops, call the emergency number now.');
    expect(end(Q, 'no')).not.toMatch(/^Not weak or numb/);
  });
  it('the pain questions still follow ("How bad is the pain?")', () => {
    expect(after(card(Q), 'no', EMPTY_PROFILE, []).next).toEqual(['How bad is the pain?']);
  });
});

describe('3. About them never teaches the family to stop offering a drink or food', () => {
  const at = (d: number) => new Date(2026, 10, 16 + d, 10).getTime();
  const three = (q: string, label: string) => [0, 1, 2].map((d) => ({ q, label, at: at(d) }));
  it.each(['Would you like something to drink?', 'Would you like a cup of tea?', 'Are you hungry?', 'Would you like a snack?'])('three "no" to "%s": no "Usually says no" line, no "Keep as a fact"', async (q) => {
    const { learned } = await import('../../core/prefs');
    const { aboutLearned } = await import('../../core/share');
    const { learnedBlock } = await import('../../web/src/simple');
    // the counting itself still sees it
    expect(learned(three(q, 'no'), []).map((l) => l.kind)).toContain('no');
    const lines = aboutLearned(learned(three(q, 'no'), []));
    expect(lines.map((l) => l.text).join(' ')).not.toMatch(/usually says no/i);
    expect(learnedBlock({ name: 'Frank', lines, facts: [], short: null })).not.toContain('learned-keep');
  });
  it('a usual drink choice is still shown, but never offered as a fact to keep; other questions keep the button', async () => {
    const { learned } = await import('../../core/prefs');
    const { aboutLearned } = await import('../../core/share');
    const { learnedBlock } = await import('../../web/src/simple');
    const tea = aboutLearned(learned(three('Would you like tea or coffee?', 'tea'), []));
    expect(tea.map((l) => l.text)).toEqual(['"Would you like tea or coffee": usually tea (3 of 3).']);
    expect(tea.every((l) => l.care)).toBe(true);
    expect(learnedBlock({ name: 'Frank', lines: tea, facts: [], short: null })).not.toContain('learned-keep');
    const tv = aboutLearned(learned(three('Would you like the TV or the radio?', 'the radio'), []));
    expect(tv.length).toBe(1);
    expect(learnedBlock({ name: 'Frank', lines: tv, facts: [], short: null })).toContain('learned-keep');
  });
});

describe('4. A day with fewer than six drinks entered is a line, with whom to tell; never a target', () => {
  const at = (d: number, h: number) => new Date(2026, 10, 16 + d, h).getTime();
  const drinks = (d: number, n: number) => Array.from({ length: n }, (_, i) => ({ id: `d${d}-${i}`, at: at(d, 7 + 2 * i), kind: 'log' as const, log: 'drank' as const, label: 'Drank', topic: 'food' as const }));
  const NOW = at(6, 12);
  it('five drinks on a past day: "Few drinks were entered on …: 5." and the fixed sentence; six: nothing stands out', async () => {
    const { insights, NO_HEALTH } = await import('../../core/insights');
    const five = insights([...drinks(0, 6), ...drinks(1, 5)], NO_HEALTH, 'week', NOW);
    expect(five.map((x) => x.id)).toEqual(['few-drinks']);
    expect(five[0].text).toMatch(/^Few drinks were entered on Tue 17 Nov: 5\.$/);
    expect(five[0].act).toBe('If that is right, and not a gap in the diary, tell the doctor or nurse today.');
    expect(insights([...drinks(0, 6), ...drinks(1, 6)], NO_HEALTH, 'week', NOW).map((x) => x.id)).toEqual(['nothing']);
  });
  it('with a fluid limit noted the line still shows and points to the doctor\'s plan: no amount, no "more", no target', async () => {
    const { insights, NO_HEALTH } = await import('../../core/insights');
    const xs = insights([...drinks(0, 6), ...drinks(1, 5)], { ...NO_HEALTH, fluidLimit: true }, 'week', NOW);
    const words = xs.map((x) => `${x.text} ${x.noted} ${x.act ?? ''}`).join(' ');
    expect(xs.map((x) => x.id)).toEqual(['few-drinks']);
    expect(words).toMatch(/check the day against the doctor's plan/);
    expect(words).not.toMatch(/\b(?:6|six|7|seven|8|eight) (?:cups|glasses|drinks a day)|target|aim for|at least|more to drink|drink more/i);
  });
});

describe('5. After "something else", where the AI step goes online (a phone), it is the second way', () => {
  const html = async (ways: import('../../core/more').Way[], narrowHtml = '<button id="narrow"></button>') => {
    const { waysBlock } = await import('../../web/src/phase7');
    const h = waysBlock({ ways, moreFirst: ['water'], letterHtml: '<button id="letter-go"></button>', narrowHtml, aiSecond: true });
    return [...h.matchAll(/<button[^>]*id="([^"]+)"/g)].map((m) => m[1]);
  };
  it('second, after the step the rules make, and before the first letter and "show or write it"', async () => {
    expect(await html(['more', 'letter', 'show', 'narrow'])).toEqual(['way-more', 'narrow', 'letter-go', 'show-write']);
    expect(await html(['about', 'letter', 'show', 'narrow'])).toEqual(['way-about', 'narrow', 'letter-go', 'show-write']);
  });
  it('never ahead of the body card or the needs board on a care card', async () => {
    expect(await html(['where', 'needs', 'letter', 'show', 'narrow'])).toEqual(['way-where', 'way-needs', 'letter-go', 'show-write', 'narrow']);
  });
});

describe('6. The pictures of round 9b: pain (the whole body), wait (an hourglass), show me (an angled finger)', () => {
  it('show me is a picture made with Gemini now; wait and pain are made again on 22 Nov; the files are the ones in r9b_regen', async () => {
    const { readFileSync } = await import('node:fs');
    const { builtinPicto } = await import('../../web/src/pictos');
    const root = new URL('../../', import.meta.url);
    const manifest = JSON.parse(readFileSync(new URL('devlog/quota_probe_2026-11-20/ASSET_MANIFEST.json', root), 'utf8')) as Record<string, { file: string; prompt: string; date: string }>;
    expect(builtinPicto('show me')).toContain('src="/pictures/show_me.webp"');
    for (const [id, file, word] of [['pain', 'pain', /whole adult figure/], ['wait', 'wait', /hourglass/], ['show me', 'show_me', /thumb clearly visible/]] as const) {
      expect(manifest[id].date, id).toBe('2026-11-22');
      expect(manifest[id].prompt, id).toMatch(word);
      expect(readFileSync(new URL(`web/public/pictures/${file}.webp`, root)).equals(readFileSync(new URL(`devlog/quota_probe_2026-11-20/r9b_regen/${file}.webp`, root))), id).toBe(true);
    }
  });
});

describe('7. A confirmed yes to sudden weakness or numbness: "Call … now. Note the time it started." (no "if")', () => {
  it('the box over that answer has no "if this is new or sudden"; other boxes keep it', async () => {
    const { signNow, urgentAnswer } = await import('../../core/redflag');
    const { urgentBox } = await import('../../web/src/phase5');
    const Q = 'Is it suddenly weak or numb, yes or no?';
    expect(urgentAnswer(Q, 'yes')).toBe(true);
    expect(signNow(Q, 'yes')).toBe(true);
    expect(signNow('Is one arm weak?', 'yes')).toBe(true);
    for (const [q, l] of [[Q, 'no'], [Q, 'not sure'], ['Is it hard to breathe?', 'yes'], ['How bad is the pain?', 'very bad']]) expect(signNow(q, l), `${q} ${l}`).toBe(false);
    const now = urgentBox('999', 'urgent', false, true);
    expect(now).toContain('Call 999 now. Note the time it started.');
    expect(now).not.toMatch(/if this is new or sudden/);
    expect(now).toContain('href="tel:999"');
    expect(urgentBox('999')).toContain('Call 999 now if this is new or sudden.');
  });
  it('the end line under it names the number too', () => {
    expect(end('Is it suddenly weak or numb, yes or no?', 'yes', '', '999')).toBe('Suddenly weak or numb: this can be a stroke. Call 999 now, and note the time it started.');
  });
  it('main.ts keeps the "now" box for the rest of the conversation, and on a step back', async () => {
    const { readFileSync } = await import('node:fs');
    const main = readFileSync(new URL('../../web/src/main.ts', import.meta.url), 'utf8');
    expect(main).toContain("if (state.picked && signNow(c.asked, state.picked.label)) p5.signNow = true;");
    expect(main).toContain("urgentBox(callNumber(), 'urgent', numberGuess(), p5.signNow || signNow(c.asked, p.label))");
    expect(main).toContain('p5.signNow = x.signNow;');
  });
});
