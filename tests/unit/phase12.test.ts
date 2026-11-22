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

describe('A3. A limb or the face hurts: first "Is it suddenly weak or numb?" (P0 6, the FAST arm sign)', () => {
  const chain = ['Are you in pain?', 'Where does it hurt?'];
  it.each(['your left arm', 'your right arm', 'hands', 'your left leg', 'your right leg', 'feet', 'face'])('after "%s" the first question offered is "Is it suddenly weak or numb?"', async (label) => {
    const { after, WEAK_NUMB } = await import('../../core/tree');
    const { EMPTY_PROFILE } = await import('../../core/types');
    const region = /arm|hand/.test(label) ? 'arms' : /leg|feet/.test(label) ? 'legs' : 'head';
    const s = after({ asked: `Where in the ${region}?`, kind: 'body', bodyStep: 2 }, label, EMPTY_PROFILE, chain);
    expect(WEAK_NUMB).toBe('Is it suddenly weak or numb, yes or no?');
    expect(s.next[0]).toBe(WEAK_NUMB);
    expect(s.next).toContain('How bad is the pain?');
  });
  it.each(['upper stomach', 'lower back', 'ears'])('"%s" is not asked about weakness', async (label) => {
    const { after, WEAK_NUMB } = await import('../../core/tree');
    const { EMPTY_PROFILE } = await import('../../core/types');
    expect(after({ asked: 'Where in the back?', kind: 'body', bodyStep: 2 }, label, EMPTY_PROFILE, chain).next).not.toContain(WEAK_NUMB);
  });
  it('yes (and not sure) raises the call box; no goes on to how bad, and "a little" still asks again in an hour', async () => {
    const { after, WEAK_NUMB } = await import('../../core/tree');
    const { urgentAnswer } = await import('../../core/redflag');
    const { EMPTY_PROFILE } = await import('../../core/types');
    const card = { asked: WEAK_NUMB, kind: 'yesno' as const };
    expect(urgentAnswer(WEAK_NUMB, 'yes')).toBe(true);
    expect(urgentAnswer(WEAK_NUMB, 'not sure')).toBe(true);
    expect(urgentAnswer(WEAK_NUMB, 'no')).toBe(false);
    const yes = after(card, 'yes', { ...EMPTY_PROFILE, personName: 'Frank' }, chain);
    expect(yes.next).toEqual([]);
    expect(yes.end).toMatch(/call the emergency number now/i);
    expect(yes.end).toMatch(/time it started/);
    const no = after(card, 'no', EMPTY_PROFILE, ['Where does it hurt?']);
    expect(no.next).toEqual(['How bad is the pain?']);
    const little = after({ asked: 'How bad is the pain?', kind: 'scale' as never }, 'a little', EMPTY_PROFILE, chain);
    expect(little.end).toMatch(/Ask again in an hour/);
    // worst case: the depth limit can cut the weakness question; the end line of "a little" still names the sign
    expect(little.end).toMatch(/Sudden weakness or numbness: call now/);
  });
});

describe('A4. Pain on the needs board: "Where does it hurt?" is the main button, and the call box has the number', () => {
  it('after "pain" on the board: the main button asks where, and the urgent box with the region\'s number stands under it', async () => {
    const { readFileSync } = await import('node:fs');
    const main = readFileSync(new URL('../../web/src/main.ts', import.meta.url), 'utf8');
    const fn = main.slice(main.indexOf('function afterAnswer('), main.indexOf('const recapText'));
    expect(fn).toContain('C.needs.painQuestion');
    expect(fn).toMatch(/class="\$\{button\} primary"[^`]*data-q="\$\{esc\(C\.needs\.painQuestion\)\}"/);
    expect(fn).toContain("urgentBox(callNumber(), 'need-urgent', numberGuess())");
    // the old line had no number and no button
    expect(fn).not.toContain('C.safety');
    const { COPY } = await import('../../core/copy');
    expect(COPY.needs.lines.pain).not.toMatch(/AI/);
  });
});

describe('A5. Pain left for later: the signs to watch for, the emergency route, and how long ago', () => {
  it('"how long ago" in plain words', async () => {
    const { agoText } = await import('../../core/later');
    const now = when(6, '12:00');
    expect(agoText(now - 5 * 60_000, now)).toBe('Left 5 minutes ago.');
    expect(agoText(now - 60 * 60_000, now)).toBe('Left 1 hour ago.');
    expect(agoText(now - 150 * 60_000, now)).toBe('Left 2 hours ago.');
    expect(agoText(now - 30 * 3600_000, now)).toBe('Left 1 day ago.');
    expect(agoText(now - 20_000, now)).toBe('Left just now.');
  });
  it('a pain question on Home: the line, the signs that do not wait, a call button with the number, the list, and the time', async () => {
    const { laterBlock } = await import('../../web/src/simple');
    const { laterPainHtml } = await import('../../web/src/phase5');
    const html = laterBlock([{ q: 'Are you in pain?', time: '09:10', ago: 'Left 3 hours ago.', i: 0, care: true, pain: true }], laterPainHtml('999'));
    expect(html).toContain('If the pain is new or strong, don&#39;t wait: call the nurse or doctor.');
    expect(html).toMatch(/Call 999 now if/);
    expect(html).toMatch(/weakness or numbness/);
    expect(html).toMatch(/chest pain/);
    expect(html).toContain('href="tel:999"');
    expect(html).toContain('href="#/sudden"');
    expect(html).toContain('Left 3 hours ago.');
    // an everyday question left for later carries none of it
    const plain = laterBlock([{ q: 'Shall we go out?', time: '09:10', ago: 'Left 3 hours ago.', i: 0 }], laterPainHtml('999'));
    expect(plain).not.toContain('tel:');
    expect(plain).toContain('Left 3 hours ago.');
  });
});

describe('A6. The emergency number follows the region; an unknown region gets 112 and the "change" line, never a silent 911', () => {
  it.each([
    ['en-AU', '000'], ['en-NZ', '111'], ['en-IN', '112'], ['hi-IN', '112'], ['ja-JP', '119'], ['ja', '119'], ['ko-KR', '119'],
    ['en-US', '911'], ['en-CA', '911'], ['fr-CA', '911'], ['es-MX', '911'], ['en-GB', '999'], ['de-DE', '112'], ['en-SG', '995'], ['en-HK', '999'],
    ['pt-BR', '192'], ['de-CH', '144'], ['nb-NO', '113'], ['zh-CN', '120'],
  ])('%s → %s', async (locale, number) => {
    const { localeNumber } = await import('../../core/redflag');
    expect(localeNumber(locale)).toBe(number);
  });
  it.each(['en', 'xx', '', 'sw-KE', 'ar-EG'])('unknown "%s" → 112, and the call boxes ask "Is this your emergency number?"', async (locale) => {
    const { localeNumber } = await import('../../core/redflag');
    const { urgentBox } = await import('../../web/src/phase5');
    expect(localeNumber(locale)).toBe('112');
    expect(urgentBox(localeNumber(locale), 'urgent', true)).toMatch(/number-guess/);
  });
  it('the number the family types still wins, and the sample family stays on 911', async () => {
    const { emergencyNumber, localeNumber, DEFAULT_NUMBER } = await import('../../core/redflag');
    expect(emergencyNumber('000', localeNumber('xx'))).toBe('000');
    expect(DEFAULT_NUMBER).toBe('911');
  });
});

describe('B7. The pictures made again after round 9, and the three new ones', () => {
  it('the curtain question shows curtains, not doors; a church is a church, not a garden door', async () => {
    const { makeCard } = await import('../../core/pipeline');
    const { NullEngine } = await import('../../core/engine');
    const { EMPTY_PROFILE } = await import('../../core/types');
    const { SAMPLE_PROFILE } = await import('../../core/sample');
    const { talkMenu } = await import('../../core/turn');
    const { pictureFor } = await import('../../core/pictures');
    const c = await makeCard('Would you like the curtains open or closed?', { profile: EMPTY_PROFILE, support: 'more', engine: new NullEngine(), allowCloud: false, deviceReady: false });
    expect(c.choices.filter((x) => x.role === 'answer').map((x) => x.picture)).toEqual([{ type: 'builtin', id: 'curtains open' }, { type: 'builtin', id: 'curtains closed' }]);
    // a door left open is still the door
    expect(pictureFor('open', EMPTY_PROFILE, 'Shall I leave the door open or closed?')).toEqual({ type: 'builtin', id: 'open' });
    expect(pictureFor('church', EMPTY_PROFILE)).toEqual({ type: 'builtin', id: 'church' });
    const pics: string[] = [];
    for (let p: typeof c | null | undefined = talkMenu(SAMPLE_PROFILE); p; p = p.nextPage) for (const ch of p.choices) if (ch.label === 'church') pics.push((ch.picture as { id: string }).id);
    expect(pics).toEqual(['church']);
  });
  it('each new file is the one made on 22 Nov (same bytes as devlog/quota_probe_2026-11-20/r9_regen), with its model, date and tool in the manifest', async () => {
    const { readFileSync } = await import('node:fs');
    const root = new URL('../../', import.meta.url);
    const manifest = JSON.parse(readFileSync(new URL('devlog/quota_probe_2026-11-20/ASSET_MANIFEST.json', root), 'utf8')) as Record<string, { file: string; model: string; date: string; tool: string }>;
    for (const f of ['pain', 'good', 'bad', 'more', 'spouse', 'child', 'sibling', 'friend', 'curtains_open', 'curtains_closed', 'church']) {
      expect(readFileSync(new URL(`web/public/pictures/${f}.webp`, root)).equals(readFileSync(new URL(`devlog/quota_probe_2026-11-20/r9_regen/${f}.webp`, root))), f).toBe(true);
      const m = manifest[f.replace(/_/g, ' ')];
      expect(m, f).toMatchObject({ model: 'gemini-3.1-flash-image', date: '2026-11-22', tool: 'Google AI Studio, generated offline, bundled; no model call at run time' });
    }
    expect(Object.values(manifest).every((m) => m.model && m.date && m.tool)).toBe(true);
  });
});

describe('B8. Our drawings: the pain scale as three faces, "I need something" as the four squares, "I feel…" not on a thumbs-up', () => {
  const env = async () => { const { NullEngine } = await import('../../core/engine'); const { EMPTY_PROFILE } = await import('../../core/types'); return { profile: EMPTY_PROFILE, support: 'more' as const, engine: new NullEngine(), allowCloud: false, deviceReady: false }; };
  it('"How bad is the pain?": mild, medium and strong faces (not the bars that read as phone signal), the word under each', async () => {
    const { makeCard } = await import('../../core/pipeline');
    const { svgPicto } = await import('../../web/src/pictos');
    const c = await makeCard('How bad is the pain?', await env());
    expect(c.choices.filter((x) => x.role === 'answer').map((x) => [x.label, (x.picture as { id: string }).id])).toEqual([['a little', 'pain mild'], ['quite bad', 'pain medium'], ['very bad', 'pain strong']]);
    for (const id of ['pain mild', 'pain medium', 'pain strong']) {
      const s = svgPicto(id);
      expect(s, id).toContain('<circle cx="48" cy="48" r="36"');
      expect(s, id).not.toContain('<rect');
    }
    // the amounts ("a little", "some", "a lot" food or drink) keep their own scale
    const { pictureFor } = await import('../../core/pictures');
    const { EMPTY_PROFILE } = await import('../../core/types');
    expect(pictureFor('a little', EMPTY_PROFILE, 'How much would you like?')).toEqual({ type: 'builtin', id: 'a little' });
  });
  it('the person\'s starters: "I need something" is the four squares of Home\'s needs button, "I feel…" three faces', async () => {
    const { turnCard } = await import('../../core/turn');
    const { svgPicto, builtinPicto } = await import('../../web/src/pictos');
    const ids = turnCard().choices.map((x) => (x.picture as { id: string }).id);
    expect(ids[0]).toBe('needs');
    expect(ids[2]).toBe('feelings');
    expect(ids).not.toContain('show me');
    expect(ids).not.toContain('good');
    expect((svgPicto('needs').match(/<rect /g) ?? []).length).toBe(4);
    expect((svgPicto('feelings').match(/<circle cx="\d+" cy="48" r="1[0-9]"/g) ?? []).length).toBe(3);
    expect(builtinPicto('needs')).toMatch(/^<svg/);
  });
});

describe('B7/B8. The counts the docs give are the counts of the code', () => {
  it('README: the number of pictures and the monogram; PICTOGRAMS: made with Gemini and drawn by us', async () => {
    const { readFileSync } = await import('node:fs');
    const { PICTO_IDS, IMAGE_IDS } = await import('../../web/src/pictos');
    const readme = readFileSync(new URL('../../README.md', import.meta.url), 'utf8');
    expect(readme).toContain(`Pictures (${PICTO_IDS.length - 1} and the monogram since 22 Nov: ${IMAGE_IDS.length} colour pictures made with Gemini`);
    const md = readFileSync(new URL('../../PICTOGRAMS.md', import.meta.url), 'utf8');
    expect(md).toContain(`**Made with Gemini (${IMAGE_IDS.length}).**`);
    expect(md).toContain(`**Drawn by us (${PICTO_IDS.length - IMAGE_IDS.length}).**`);
  });
});

describe('B9. The first screen: the six topic pictures are asked for before the script runs, and a tile is never blank', () => {
  it('index.html preloads exactly the picture files of the topic tiles, at high priority', async () => {
    const { readFileSync } = await import('node:fs');
    const { TOPIC_PICTURES } = await import('../../web/src/simple');
    const { IMAGE_IDS, imageFile } = await import('../../web/src/pictos');
    const html = readFileSync(new URL('../../web/index.html', import.meta.url), 'utf8');
    const files = Object.values(TOPIC_PICTURES).filter((id) => IMAGE_IDS.includes(id)).map((id) => `/${imageFile(id)}`);
    expect(files).toHaveLength(6);
    const pre = [...html.matchAll(/<link rel="preload" as="image" href="([^"]+)" fetchpriority="high" \/>/g)].map((m) => m[1]);
    expect(pre.sort()).toEqual([...files].sort());
    // before the module script, so the browser asks for them while the script loads
    expect(html.indexOf('rel="preload"')).toBeLessThan(html.indexOf('<script type="module"'));
  });
  it('a topic tile\'s picture has a neutral placeholder on its plate until the file is there', async () => {
    const { readFileSync } = await import('node:fs');
    const css = readFileSync(new URL('../../web/src/simple.css', import.meta.url), 'utf8');
    expect(css).toMatch(/\.simple \.topic img\.tp \{[^}]*background:[^}]*#e6eaf0/);
  });
});

describe('C10. "See the AI at work" above the fold, with where its AI runs on a phone and on a laptop', () => {
  it('Home: the block stands before "How it works" and the topics, with its two lines', async () => {
    const { homeScreen, tryAiBlock } = await import('../../web/src/simple');
    const { COPY } = await import('../../core/copy');
    const tryHtml = tryAiBlock({ q: 'What do you want to do this weekend?', tag: "uses Google's AI, after your yes", busy: false });
    expect(tryHtml).toContain('id="ai-strip"');
    expect(COPY.simple.tryAi.strip).toEqual(["Phone: Google's AI, online, after your yes", "Laptop with Chrome's own AI: nothing is sent"]);
    const home = homeScreen({ name: 'Frank', topics: [], topicOpen: null, aiTag: '', question: '', busy: false, error: null, micHtml: '', voiceHtml: '', ai: [], privacy: [], aboutLink: false, howOpen: false, tryHtml } as never);
    expect(home.indexOf('id="try-ai"')).toBeGreaterThan(0);
    expect(home.indexOf('id="try-ai"')).toBeLessThan(home.indexOf('id="how"'));
    expect(home.indexOf('id="try-ai"')).toBeLessThan(home.indexOf('id="topics"'));
  });
  it('each line is what the code does: the cloud leg only after a yes, Gemini Nano on a laptop only with Chrome\'s built-in AI', async () => {
    const { tryAiTag } = await import('../../core/simple');
    const base = { configured: true, device: 'unavailable' as const, cloudOn: false, online: true };
    expect(tryAiTag(base)).toBe("uses Google's AI, after your yes");
    expect(tryAiTag({ ...base, device: 'available' as never })).toBe('AI on this computer: nothing is sent');
    const { readFileSync } = await import('node:fs');
    const eng = readFileSync(new URL('../../web/src/ai/firebaseEngine.ts', import.meta.url), 'utf8');
    expect(eng).toContain('mode: InferenceMode.PREFER_IN_CLOUD');
    expect(eng).toContain('mode: InferenceMode.ONLY_ON_DEVICE');
  });
});
