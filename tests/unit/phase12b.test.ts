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
  it('show me is a picture made with Gemini now; wait is made again on 22 Nov; the files are the ones in r9b_regen', async () => {
    const { readFileSync } = await import('node:fs');
    const { builtinPicto } = await import('../../web/src/pictos');
    const root = new URL('../../', import.meta.url);
    const manifest = JSON.parse(readFileSync(new URL('devlog/quota_probe_2026-11-20/ASSET_MANIFEST.json', root), 'utf8')) as Record<string, { file: string; prompt: string; date: string }>;
    expect(builtinPicto('show me')).toContain('src="/pictures/show_me.webp"');
    for (const [id, file, word] of [['wait', 'wait', /hourglass/], ['show me', 'show_me', /thumb clearly visible/]] as const) {
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

describe('8. Beside "I can\'t go on": a calm "Stop for now" that simply ends the card', () => {
  const env = async () => { const { NullEngine } = await import('../../core/engine'); return { profile: EMPTY_PROFILE, support: 'more' as const, engine: new NullEngine(), allowCloud: false, deviceReady: false }; };
  it('the third page of the feelings card: worried, lonely, "I can\'t go on", "stop for now" (words, no stop sign)', async () => {
    const { makeCard } = await import('../../core/pipeline');
    const p3 = (await makeCard('How are you feeling today?', await env())).nextPage?.nextPage;
    expect(p3?.choices.map((x) => x.label)).toEqual(['worried', 'lonely', "I can't go on", 'stop for now', 'something else']);
    expect(p3?.choices.find((x) => x.label === 'stop for now')?.picture).toEqual({ type: 'word' });
  });
  it('it ends the card calmly, no next question, and the carer still asks again; it is not the crisis route', async () => {
    const { crisisAnswer, urgentAnswer } = await import('../../core/redflag');
    const step = after(card('How are you feeling today?'), 'stop for now', { ...EMPTY_PROFILE, personName: 'Frank' }, []);
    expect(step).toEqual({ next: [], end: 'Frank wants to stop for now. Stay near, and ask again later today, one small question at a time.' });
    expect(crisisAnswer('stop for now')).toBe(false);
    expect(urgentAnswer('How are you feeling today?', 'stop for now')).toBe(false);
    expect(end('How are you feeling today?', 'stop for now')).not.toMatch(/\b(?:fine|nothing|just)\b/i);
  });
});

describe('9. "Try it with the Millers" on a phone: the simple view with the sample family, never the on-device download', () => {
  const base = { name: '', aboutLink: false, busy: false, error: null, question: '', howOpen: false, topics: [], topicOpen: null, aiTag: '', ai: [], privacy: [], micHtml: '', voiceHtml: '' };
  it('the link goes where the main screen says: #/sample on a phone, #/demo on a computer; while it is open, the way out', async () => {
    const { homeScreen } = await import('../../web/src/simple');
    const { COPY } = await import('../../core/copy');
    const h = (m: object) => homeScreen({ ...base, ...m } as unknown as Parameters<typeof homeScreen>[0]);
    expect(h({ sampleHref: '#/sample' })).toContain('<a class="tlink" id="try-sample" href="#/sample">');
    expect(h({})).toContain('id="try-sample" href="#/demo"');
    const on = h({ sampleHref: '#/sample', sampleOn: true });
    expect(on).toContain(COPY.simple.sampleOn);
    expect(on).toContain('data-act="leave-demo"');
    expect(on).not.toContain('id="try-sample"');
  });
  it('main.ts: #/sample keeps the simple view, opens on its first screen, and a phone or tablet is never offered the download', async () => {
    const { readFileSync } = await import('node:fs');
    const main = readFileSync(new URL('../../web/src/main.ts', import.meta.url), 'utf8');
    expect(main).toContain("const simpleView = () => (!state.demo || sampleSimple) && state.settings.view !== 'full';");
    expect(main).toContain("if (h === 'sample') { if (!state.demo) { sampleSimple = true; void enterDemo().then(() => render()); } return 'partner'; }");
    expect(main).toContain("sampleHref: handheld() ? '#/sample' : '#/demo'");
    expect(main).toMatch(/case 'downloadable': if \(handheld\(\)\) return `<span class="dot off">/);
    expect(main).toContain('state.demo = false; sampleSimple = false;');
  });
});

describe('10. The first screen\'s red box names the number, with "Change it"', () => {
  it('the number in the box, and under it "Not your number? Change it" while it is a guess, "Change it" after', async () => {
    const { suddenFirst } = await import('../../web/src/phase5');
    const g = suddenFirst('112', true);
    expect(g).toContain('<small>Signs of a new stroke, chest pain, a fall: call 112.</small>');
    expect(g).toContain('href="#/sudden"');
    expect(g).toContain('Not your number? <button type="button" class="tlink" data-act="sudden-number">Change it →</button>');
    const set = suddenFirst('999', false);
    expect(set).toContain('call 999.');
    expect(set).not.toContain('Not your number?');
    expect(set).toContain('data-act="sudden-number">Change it →</button>');
    // the button is outside the link (no button inside an <a>)
    expect(g.indexOf('</a>')).toBeLessThan(g.indexOf('<button'));
  });
});

describe('11. A pain question left for later stands directly under "Needs something now?"', () => {
  const base = { name: '', aboutLink: false, busy: false, error: null, question: '', howOpen: false, topics: [], topicOpen: null, aiTag: '', ai: [], privacy: [], micHtml: '', voiceHtml: '', turnHtml: '<a id="turn"></a>', tryHtml: '<div id="try-ai"></div>' };
  it('pain: right after the needs button, above "I want to say something" and the AI box; anything else: lower down', async () => {
    const { homeScreen, laterBlock } = await import('../../web/src/simple');
    const pain = laterBlock([{ q: 'Are you in pain?', time: '14:00', ago: 'Left 3 hours ago.', i: 0, care: true, pain: true }], '<div class="later-signs"></div>');
    const h = homeScreen({ ...base, laterHtml: pain } as unknown as Parameters<typeof homeScreen>[0]);
    const needs = h.indexOf('data-act="needs"');
    expect(needs).toBeGreaterThan(0);
    expect(h.indexOf('id="later"')).toBeGreaterThan(needs);
    expect(h.indexOf('id="later"')).toBeLessThan(h.indexOf('id="turn"'));
    expect(h.indexOf('id="later"')).toBeLessThan(h.indexOf('id="try-ai"'));
    const tv = laterBlock([{ q: 'Would you like the TV on?', time: '14:00', i: 0 }]);
    const h2 = homeScreen({ ...base, laterHtml: tv } as unknown as Parameters<typeof homeScreen>[0]);
    expect(h2.indexOf('id="later"')).toBeGreaterThan(h2.indexOf('id="try-ai"'));
  });
});

describe('6b. Pain made once more (23 Nov 2026): the one of 22 Nov held its stomach; pain_d (fists, teeth) read as angry in judge round 10', () => {
  it('the file is pain_h of devlog/quota_probe_2026-11-23/pain_general/r3: leaning forward, open hands on the knees, no teeth, no fists; the ones before are kept outside the app', async () => {
    const { readFileSync } = await import('node:fs');
    const root = new URL('../../', import.meta.url);
    const read = (f: string) => readFileSync(new URL(f, root));
    const manifest = JSON.parse(read('devlog/quota_probe_2026-11-20/ASSET_MANIFEST.json').toString('utf8')) as Record<string, { file: string; prompt: string; model: string; date: string; tool: string }>;
    expect(manifest.pain).toMatchObject({ file: 'pictures/pain.webp', model: 'gemini-3.1-flash-image', date: '2026-11-23', tool: 'Google AI Studio, generated offline, bundled; no model call at run time' });
    expect(manifest.pain.prompt).toMatch(/no teeth, NOT angry, NO fists, both open hands resting loosely on his knees/);
    expect(read('web/public/pictures/pain.webp').equals(read('devlog/quota_probe_2026-11-23/pain_general/r3/pain_h.webp'))).toBe(true);
    expect(read('devlog/quota_probe_2026-11-23/pain_general/replaced/pain_d_was_live.webp').equals(read('devlog/quota_probe_2026-11-23/pain_general/pain_d.webp'))).toBe(true);
    expect(read('devlog/quota_probe_2026-11-23/pain_general/replaced/pain_old.webp').equals(read('devlog/quota_probe_2026-11-20/r9b_regen/pain.webp'))).toBe(true);
    const prompts = JSON.parse(read('devlog/quota_probe_2026-11-23/pain_general/prompts.json').toString('utf8')) as Record<string, { prompt: string; used: boolean; why: string }>;
    expect(Object.keys(prompts)).toEqual(['pain_a', 'pain_b', 'pain_c', 'pain_d', 'pain_e', 'pain_f', 'pain_g', 'pain_h', 'pain_i']);
    expect(prompts.pain_h).toMatchObject({ prompt: manifest.pain.prompt, used: true });
    expect(prompts.pain_d).toMatchObject({ used: false, why: 'read as angry at card size: 4 of 5 seats in round r10' });
    for (const k of ['pain_g', 'pain_i']) expect(prompts[k], k).toMatchObject({ used: false, why: 'points at one body part' });
    expect(Object.entries(prompts).filter(([, v]) => v.used).map(([k]) => k)).toEqual(['pain_h']);
    const md = read('PICTOGRAMS.md').toString('utf8');
    expect(md).toMatch(/^\| pain \| an older man from the front, upper body, leaning forward.*open hands.*\| 23 Nov 2026 /m);
  });
});
