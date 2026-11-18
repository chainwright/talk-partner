// Phase 7, part C (18 Nov 2026): the communication passport, "How to talk with Frank". One printable page built by
// rules from About them, from what was counted from the confirmed answers, and from fixed lines. Pinned here: the
// builder with an empty profile (no dangling "They likes"), the names, no habit about pain, the body, a feeling or a
// need, the emergency text of phase 5 word for word and never removable, every other line removable, how yes and no
// are shown as the carer typed it, the text for the share sheet (no photo), the two screens, and the boundary.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { P4 } from '../../core/copy4';
import { P5 } from '../../core/copy5';
import { P6 } from '../../core/copy6';
import { P8 } from '../../core/copy8';
import { LETTERS } from '../../core/letter';
import { LETTER_Q, NO_PASSPORT, OWN_LEN, OWN_MAX, YESNO_LEN, cleanPassport, letterAsk, letterWords, likes, passport, passportText, printed, toggleLine, type PassportInput, type PassportPrefs } from '../../core/passport';
import { learned } from '../../core/prefs';
import { EMPTY_PROFILE, type Profile } from '../../core/types';
import { passportLink, passportPage, passportScreen } from '../../web/src/care7';
import { shareSheet } from '../../web/src/phase6';
import { NOW, WEEK, when } from './week';

const ROOT = join(__dirname, '..', '..');
const read = (f: string) => readFileSync(join(ROOT, f), 'utf8');
const imports = (f: string) => [...read(f).matchAll(/^import [^;]*? from '([^']+)';$/gms)].map((m) => m[1]);
const unesc = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const K = P8.passport;
const FRANK: Profile = WEEK.profile;
const seen = (q: string, labels: string[], d = 0) => labels.map((label, i) => ({ q, label, at: when(d, '09:00') + i * 3600000 }));
/** Frank's answers: a usual drink, three habits that must never travel, the words found by a letter, and what was chosen about people and photos. */
const HISTORY = [
  ...seen('Would you like tea or coffee?', ['tea', 'tea', 'tea', 'coffee']),
  ...seen('Are you in pain?', ['no', 'no', 'no'], 1),
  ...seen('Would you like something to drink?', ['no', 'no', 'no'], 1),
  ...seen('How are you feeling today?', ['sad', 'sad', 'sad'], 2),
  ...seen(letterAsk('B'), ['Bo', 'Bo', 'biscuits', 'something else'], 2),
  ...seen(letterAsk('P'), ['pain'], 3),
  ...seen(letterAsk('T'), ['toilet'], 3),
  ...seen('Who is it about?', ['Tom', 'Tom'], 4),
  ...seen('Would you like to call Tom?', ['yes'], 4),
  ...seen('Shall we talk more about Bo?', ['yes', 'yes', 'no'], 4),
  ...seen('Would you like to see Beth?', ['no', 'no', 'no'], 5),
  ...seen('Are you angry with Beth?', ['yes', 'yes', 'yes'], 5),
];
const NEEDS = [1, 2, 3].map((i) => ({ label: 'toilet', at: when(2, '10:00') + i * 60000 }));
const LEARNED = learned(HISTORY, NEEDS);
const input = (o: Partial<PassportInput> = {}): PassportInput => ({ profile: FRANK, history: HISTORY, learned: LEARNED, photoWords: ['Bo', 'the lake', 'Beth'], prefs: NO_PASSPORT, now: NOW, device: 'phone', ...o });
const prefs = (o: Partial<PassportPrefs>): PassportPrefs => ({ ...NO_PASSPORT, ...o });
const sec = (m: PassportInput, id: string) => passport(m).sections.find((s) => s.id === id);
const texts = (m: PassportInput, id: string) => sec(m, id)?.lines.map((l) => l.text) ?? [];
const all = (m: PassportInput) => { const p = passport(m); return [p.title, ...p.sections.flatMap((s) => [s.heading, ...s.lines.map((l) => l.text), ...s.lines.map((l) => l.hint ?? ''), ...s.notes]), p.footer].filter(Boolean); };

describe('the builder with nothing in About them', () => {
  const m = input({ profile: { ...EMPTY_PROFILE }, history: [], learned: [], photoWords: [] });
  it('holds the fixed lines, how yes and no are shown (not filled in), and "If something is wrong"; no section stands empty', () => {
    expect(passport(m).title).toBe('How to talk with this person');
    expect(passport(m).sections.map((s) => s.id)).toEqual(['how', 'yesno', 'wrong']);
    expect(texts(m, 'yesno')).toEqual(['Not filled in yet: ask the family how yes and no are shown.']);
    for (const s of passport(m).sections) expect(s.lines.length, s.id).toBeGreaterThan(0);
  });
  it('with no name the lines say "they", in the right form: no "They likes", no "They understands", no "them can"', () => {
    expect(texts(m, 'how')).toEqual([
      'They know what to say. The words are hard to find.',
      'They understand most of what you say. Speak in short sentences, one thing at a time.',
      'Write two or three choices, or point to pictures. Wait: count to ten.',
      'Check: "So: tea. Right?"',
      "Don't answer for them, and don't quiz: no testing questions.",
    ]);
    expect(sec(m, 'yesno')!.heading).toBe('How they say yes and no');
    for (const l of [...all(m), ...passportText(m).split('\n')]) {
      expect(l, l).not.toMatch(/\bThey (?:likes|understands|knows|says|wants|chooses|is|has)\b|\bthey (?:likes|understands|knows|says|wants|chooses|is|has)\b/);
      expect(l, l).not.toMatch(/(?<!About |\bof )\bthem (?:can|is|has|are|have|was|will|like|likes|say|says)\b/i);
      expect(l, l).not.toMatch(/undefined|NaN|\[object|: \.|\(\)|, \./);
    }
    // the headings that carry the verb, with and without a name
    expect(K.sec.likes('')).toBe('Things they like to talk about');
    expect(K.sec.likes('Frank')).toBe('Things Frank likes to talk about');
    expect(K.wordsNote('')).toBe('Counted from the answers they confirmed. A hint for you: they still choose every time.');
    expect(K.wordsNote('Frank')).toBe('Counted from the answers Frank confirmed. A hint for you: Frank still chooses every time.');
  });
  it('a name alone is enough for the page to speak of the person by name', () => {
    const n = input({ profile: { ...EMPTY_PROFILE, personName: ' Frank ' }, history: [], learned: [], photoWords: [] });
    expect(passport(n).title).toBe('How to talk with Frank');
    expect(passport(n).sections.map((s) => s.id)).toEqual(['how', 'yesno', 'wrong']);
  });
});

describe('the names, and what About them holds', () => {
  it('the brief\'s four lines carry the name, and one more says the person is competent', () => {
    expect(texts(input(), 'how')).toEqual([
      'Frank knows what to say. The words are hard to find.',
      'Frank understands most of what you say. Speak in short sentences, one thing at a time.',
      'Write two or three choices, or point to pictures. Wait: count to ten.',
      'Check: "So: tea. Right?"',
      "Don't answer for Frank, and don't quiz: no testing questions.",
    ]);
    expect(sec(input(), 'yesno')!.heading).toBe('How Frank says yes and no');
    expect(sec(input(), 'about')!.heading).toBe('About Frank');
  });
  it('the people with who they are, then the foods, the places, TV and music, each on a line of its own; an empty list has no line', () => {
    const a = texts(input(), 'about');
    expect(a[0]).toMatch(/^People: /);
    for (const p of FRANK.people.filter((x) => x.name.trim())) expect(a[0], p.name).toContain(p.relation ? `${p.name} (${p.relation}` : p.name);
    expect(a[0]).toContain('lives here');
    if (FRANK.foods.length) expect(a).toContain(`Food and drink: ${FRANK.foods.join(', ')}.`);
    const bare = texts(input({ profile: { ...EMPTY_PROFILE, personName: 'Frank', people: [{ id: 'a', name: 'Tom', relation: '', household: false }, { id: 'b', name: '  ', relation: 'x', household: false }], tv: ['football'] } }), 'about');
    expect(bare).toEqual(['People: Tom.', 'TV: football.']);
  });
  it('a fact the family kept is on the page, unless it is about pain, the body, a feeling or a need, or a usual "no"', () => {
    const other = ['dog called Bo', 'Usually says no to "Are you in pain" (3 of 3).', 'Usually says no to "Would you like some more" (4 of 5).', 'Asked for "toilet" on the needs board 5 times.', '"How are you feeling today": usually sad (3 of 4).', 'Leeds United'];
    expect(texts(input({ profile: { ...EMPTY_PROFILE, personName: 'Frank', other } }), 'about')).toEqual(['dog called Bo', 'Leeds United']);
  });
  it('no line guesses a pronoun, whatever the name', () => {
    for (const name of ['Frank', 'Maria', '', 'Sam', 'Her Majesty']) {
      const m = input({ profile: { ...FRANK, personName: name } });
      // (a fact in the family's own words is theirs: "Bo is his dog" stays as they wrote it)
      for (const l of all(m).filter((x) => !x.includes('Her Majesty') && !FRANK.other.includes(x))) expect(l, l).not.toMatch(/\b(?:he|she|him|her|his|hers|himself|herself)\b/i);
    }
  });
});

describe('no habit about pain, the body, a feeling or a need; no usual "no"', () => {
  it('what was learned holds such lines (the test is not empty), and none of them is on the page', () => {
    const kinds = LEARNED.map((l) => `${l.kind}:${l.q}`);
    expect(kinds).toEqual(expect.arrayContaining(['no:Are you in pain', 'no:Would you like something to drink', 'usual:How are you feeling today', 'need:']));
    const w = texts(input(), 'words');
    expect(w).toContain('"Would you like tea or coffee": usually tea (3 of 4).');
    for (const l of [...all(input()), ...passportText(input()).split('\n')]) expect(l, l).not.toMatch(/in pain|feeling today|usually sad|Usually says no|says no to|needs board|toilet/i);
    expect(sec(input(), 'words')!.notes).toEqual(['Counted from the answers Frank confirmed. A hint for you: Frank still chooses every time.', 'Nothing about pain, the body or feelings is in this list: ask those every time.']);
  });
  it('"Words that worked": the words found by their first letter, with how often; never the way out, never a care word', () => {
    expect(letterWords(HISTORY)).toEqual([{ word: 'Bo', n: 2 }, { word: 'biscuits', n: 1 }]);
    expect(texts(input(), 'words').slice(0, 2)).toEqual(['Bo: found by its first letter, 2 times.', 'biscuits: found by its first letter, 1 time.']);
    // (the first-letter card's own question is no habit: "usually Bo (3 of 4)" to "It starts with B" is not a line)
    const lettered = learned(seen(letterAsk('B'), ['Bo', 'Bo', 'Bo', 'biscuits']), []);
    expect(lettered.length).toBe(1);
    expect(texts(input({ history: [], learned: lettered }), 'words')).toEqual([]);
    expect(texts(input({ history: [], learned: learned(seen('Is this it?', ['juice', 'juice', 'juice']), []) }), 'words')).toEqual([]);
    // the question this file looks for in the answers is the one the first-letter card asks, for every letter
    for (const x of LETTERS) expect(LETTER_Q.test(P4.letter.cardAsk(x)), x).toBe(true);
    expect(LETTER_Q.test('Would you like tea or coffee?')).toBe(false);
  });
  it('"Things Frank likes to talk about": chosen, or yes to an offer about it, twice at least; a "no" does not count, and a yes to a question that is not an offer does not', () => {
    // (Bo: twice the word found by its letter, twice "yes" to talking more about Bo, and one "no" that is not counted; Tom: chosen twice, and one "yes" to calling Tom)
    expect(likes(HISTORY, FRANK, ['Bo', 'the lake', 'Beth'])).toEqual([{ word: 'Bo', n: 4 }, { word: 'Tom', n: 3 }]);
    expect(texts(input(), 'likes')).toEqual(['Bo: chosen, or yes to an offer about it, 4 times.', 'Tom: chosen, or yes to an offer about it, 3 times.']);
    // (worst case: three times "yes" to "Are you angry with Beth?" and three times "no" to seeing Beth must never read as "likes to talk about Beth")
    expect(texts(input(), 'likes').join(' ')).not.toContain('Beth');
    expect(sec(input(), 'likes')!.notes).toEqual(['Counted from the answers. It says what was chosen, not what is felt.']);
    // once is not enough
    expect(likes(seen('Who is it about?', ['Tom']), FRANK, [])).toEqual([]);
    // a name inside another word is not that name
    expect(likes(seen('Would you like to see the Bolton game?', ['yes', 'yes', 'yes']), FRANK, ['Bo'])).toEqual([]);
  });
});

describe('"If something is wrong": the emergency number and the fixed text of phase 5, always on the page', () => {
  it('the number, the lead sentence, FAST line for line, the four more reasons, and "call the doctor or nurse today"', () => {
    const w = texts(input(), 'wrong');
    expect(w[0]).toBe('Emergency number: 911.');
    expect(w[1]).toBe(P5.sudden.lead('911'));
    expect(w.slice(2, 6)).toEqual(P5.sudden.fast.map(([k, v]) => `${k}: ${v}`));
    expect(w[2]).toBe('Face: One side of the face has dropped, or the smile is uneven.');
    expect(w[6]).toBe(`Call for these as well: ${P5.sudden.also.join(' ')}`);
    expect(w[7]).toBe(P5.sudden.notSudden);
    expect(w[8]).toBe("This page is about talking. It holds no health notes: ask the family, and go by the doctor's plan.");
  });
  it('the family\'s own number is the one on the page', () => {
    const w = texts(input({ number: '999' }), 'wrong');
    expect(w[0]).toBe('Emergency number: 999.');
    expect(w[1]).toContain('call 999 now');
    expect(passportText(input({ number: '999' }))).toContain('- Emergency number: 999.');
  });
  it('none of its lines can be taken off, whatever the stored settings say', () => {
    const keys = sec(input(), 'wrong')!.lines.map((l) => l.key);
    const m = input({ prefs: prefs({ off: [...keys, 'yesno:empty', 'yesno:yes'] }) });
    expect(sec(m, 'wrong')!.lines.every((l) => l.on && !l.removable)).toBe(true);
    expect(texts(m, 'wrong')).toEqual(texts(input(), 'wrong'));
    expect(sec(m, 'yesno')!.lines.every((l) => l.on)).toBe(true);
    for (const l of P5.sudden.fast) expect(passportText(m)).toContain(`- ${l[0]}: ${l[1]}`);
  });
});

describe('the carer decides every other line', () => {
  it('every fixed "how to talk" line, every line of About them and every learned line can be taken off, and put back', () => {
    const p = passport(input());
    const removable = p.sections.filter((s) => !['yesno', 'wrong', 'own'].includes(s.id)).flatMap((s) => s.lines);
    expect(removable.length).toBeGreaterThanOrEqual(10);
    expect(removable.every((l) => l.removable && l.on)).toBe(true);
    expect(new Set(p.sections.flatMap((s) => s.lines.map((l) => l.key))).size).toBe(p.sections.flatMap((s) => s.lines).length);
    let pr = NO_PASSPORT;
    for (const l of removable) pr = toggleLine(pr, l.key);
    const off = input({ prefs: pr });
    expect(printed(passport(off)).map((s) => s.id)).toEqual(['yesno', 'wrong']);
    const t = passportText(off);
    for (const l of removable) expect(t, l.text).not.toContain(l.text);
    // (a section with no line left has no heading and no note in the text)
    expect(t).not.toContain('WORDS THAT WORKED');
    expect(t).not.toContain(K.wordsNever);
    expect(toggleLine(toggleLine(NO_PASSPORT, 'sca:check'), 'sca:check').off).toEqual([]);
  });
  it('the line that says how much is understood can be wrong for a person: it carries that note for the carer, and it goes when unticked', () => {
    const l = sec(input(), 'how')!.lines.find((x) => x.key === 'sca:understands')!;
    expect(l.hint).toBe('Take this line off if it is not true for Frank.');
    expect(passportText(input({ prefs: prefs({ off: ['sca:understands'] }) }))).not.toContain('understands most');
    // the note is for the carer's screen: it is never in the text
    expect(passportText(input())).not.toContain('Take this line off');
  });
  it('how yes and no are shown is what the carer typed, and nothing the app worked out', () => {
    expect(texts(input({ prefs: prefs({ yes: 'nods, or thumb up', no: 'pushes the hand away' }) }), 'yesno')).toEqual(['Yes: nods, or thumb up', 'No: pushes the hand away']);
    expect(texts(input({ prefs: prefs({ yes: 'nods' }) }), 'yesno')).toEqual(['Yes: nods', 'No: (not filled in: ask the family)']);
    const src = read('core/passport.ts');
    expect(src).not.toMatch(/lessSure|\byn\b|reliability\(|tapsFrom/);
    expect(src).toContain("const yes = m.prefs.yes.trim();");
  });
  it('up to three lines of the carer\'s own, cut to their length, with no markup', () => {
    const p = cleanPassport({ yes: 'x'.repeat(200), no: 5, off: ['a', 7, 'b'], own: ['points with the left hand', '<b>tires</b> after lunch', '', 'a fourth'], photos: false, extra: 1 });
    expect(p.yes.length).toBe(YESNO_LEN);
    expect(p.no).toBe('');
    expect(p.off).toEqual(['a', 'b']);
    expect(p.own).toEqual(['points with the left hand', 'btires/b after lunch', '']);
    expect(p.own.length).toBe(OWN_MAX);
    expect(p.photos).toBe(false);
    expect(cleanPassport(undefined)).toEqual({ ...NO_PASSPORT, own: ['', '', ''] });
    expect(cleanPassport({ own: ['y'.repeat(300)] }).own[0].length).toBe(OWN_LEN);
    expect(texts(input({ prefs: p }), 'own')).toEqual(['points with the left hand', 'btires/b after lunch']);
    expect(sec(input(), 'own')).toBeUndefined();
  });
});

describe('the text for the share sheet, and the two screens', () => {
  it('the text: the first line of every shared text, the title, the sections with their lines, the footer; no photo and no data URL', () => {
    const t = passportText(input({ prefs: prefs({ yes: 'nods' }) })).split('\n');
    expect(t[0]).toBe(P6.share.stamp('Sun 22 Nov, 12:00'));
    expect(t[2]).toBe('HOW TO TALK WITH FRANK');
    expect(t).toContain('HOW FRANK SAYS YES AND NO');
    expect(t).toContain('- Yes: nods');
    expect(t).toContain('IF SOMETHING IS WRONG');
    expect(t.at(-1)).toBe('Written by the family with the app Talk Partner on Sun 22 Nov. The counted lines come from answers entered on one phone. Not a medical record. No doctor, nurse or speech therapist wrote or checked it.');
    expect(t.join('\n')).not.toMatch(/data:|<img|base64|undefined/);
  });
  const model = (page: boolean, o: Partial<PassportInput> = {}, photos = true) => { const m = input(o); return { name: m.profile.personName.trim(), device: 'phone', passport: passport(m), prefs: { ...m.prefs, photos }, page, pictures: [{ word: 'Beth', data: 'data:image/jpeg;base64,AAAA' }, { word: 'Tom', data: '' }] }; };
  it('first screen: every removable line has its box, the emergency part has none, and nothing can be printed or shared from here', () => {
    const html = passportScreen(model(false));
    const p = passport(input());
    for (const l of p.sections.flatMap((s) => s.lines).filter((l) => l.removable)) expect(html, l.key).toContain(`data-pass-line="${l.key.replace(/"/g, '&quot;')}" checked`);
    for (const l of sec(input(), 'wrong')!.lines) expect(html, l.key).not.toContain(`data-pass-line="${l.key}"`);
    expect(html).toContain('Always on the page');
    expect(html).toContain('id="pass-yes"');
    expect(html).toContain('id="pass-no"');
    expect(html.match(/data-pass-own="\d"/g)!.length).toBe(OWN_MAX);
    expect(html).toContain('id="pass-look"');
    expect(html).not.toMatch(/page-print|share-page/);
    expect(html).toContain('data-act="back"');
    expect(html).toContain('data-act="home"');
    // a line that was taken off stands there unticked, so it can be put back
    expect(passportScreen(model(false, { prefs: prefs({ off: ['sca:check'] }) }))).toMatch(/data-pass-line="sca:check"\s+aria-label/);
    // with no name: the way to About them
    expect(passportScreen(model(false, { profile: { ...EMPTY_PROFILE } }))).toContain('href="#/about"');
  });
  it('second screen: the page as it prints, then Print, Share and the way back to the lines; the lines taken off are not on it', () => {
    const html = unesc(passportScreen(model(true, { prefs: prefs({ off: ['sca:knows'], yes: 'nods' }) })));
    expect(html).toContain('data-step="page"');
    expect(html).not.toContain('Frank knows what to say');
    expect(html).toContain('Frank understands most of what you say.');
    expect(html).toContain('Yes: nods');
    expect(html).not.toContain('Take this line off');
    expect(html).not.toContain('data-pass-line');
    expect(html.indexOf('id="pass-page"')).toBeLessThan(html.indexOf('id="pass-print"'));
    expect(html).toContain('data-act="share-page" data-kind="passport"');
    expect(html).toMatch(/id="pass-change" data-act="back"/);
    for (const l of printed(passport(input({ prefs: prefs({ off: ['sca:knows'], yes: 'nods' }) }))).flatMap((s) => s.lines)) expect(html, l.text).toContain(l.text);
  });
  it('the pictures are on the printed page only: the family\'s own photo, or an initial; none when the box is off', () => {
    const on = passportPage(model(true));
    expect(on).toContain('<img class="photo own" src="data:image/jpeg;base64,AAAA" alt=""><b>Beth</b>');
    expect(on).toContain('<span class="mono" aria-hidden="true">T</span><b>Tom</b>');
    expect(passportPage(model(true, {}, false))).not.toContain('pass-pics');
    expect(passportText(input())).not.toContain('AAAA');
  });
  it('the sheet of phase 6 shows the text with the passport\'s heading and no box', () => {
    const text = passportText(input());
    const html = shareSheet({ kind: 'passport', text, health: false, hasHealth: false, risky: [], canShare: false, device: 'phone', status: '', page: { heading: K.sheetHeading, note: K.sheetNote } });
    expect(html).toContain('Share this page as text?');
    expect(html).not.toContain('id="share-health"');
    expect(html).toContain('Every line in this text is one you left on the page. No health notes and no photos are in it. Photos never go in.');
    expect(html).not.toContain('id="share-go"');
    expect(unesc(html.split('<pre class="q" id="share-text" tabindex="0">')[1].split('</pre>')[0])).toBe(text);
  });
  it('the way in names the person, or nobody', () => {
    expect(passportLink('Frank')).toContain('How to talk with Frank');
    expect(passportLink('')).toContain('How to talk together');
    expect(passportLink('Frank', 'passport-about')).toContain('id="passport-about"');
  });
});

describe('the boundary', () => {
  const main = read('web/src/main.ts');
  it('the page is built from About them, the answers that still count after "Forget everything learned", what was learned, and the photos\' words: never a picture, the diary or the health notes', () => {
    expect(main).toContain("history: learns() ? state.history.filter((h) => h.at > state.forgotten.all) : []");
    expect(main).toContain('photoWords: state.photos.map((x) => x.word)');
    const built = main.slice(main.indexOf('const passportInput ='), main.indexOf('const savePassport'));
    expect(built).not.toMatch(/state\.diary|state\.health\b(?!\.emergency)|\.data\b/);
    expect(imports('core/passport.ts').sort()).toEqual(['./copy4', './copy5', './copy6', './copy8', './diary', './prefs', './redflag', './reliability', './share', './types']);
    expect(read('core/passport.ts')).not.toMatch(/insights|HealthNotes|photos'/);
  });
  it('Share is offered on the second screen only, and goes through the sheet of phase 6; the two steps are two steps of Back', () => {
    expect(main).toContain("if (kind === 'passport' && !p8.page) break;");
    expect(main.match(/passportText\(/g)!.length).toBe(1);
    expect(main).toContain("if (r === 'passport') return p8.page ? 'passport:page' : 'passport';");
    expect(main).toContain("if (r !== 'passport') p8.page = false;");
  });
  it('no engine, prompt or request file knows the passport', () => {
    const builders = ['core/prompt.ts', 'core/requests.ts', 'core/strip.ts', 'core/pipeline.ts', 'core/narrow.ts', 'core/summary.ts', 'core/reword.ts', 'core/engine.ts', 'core/rules.ts', 'core/speak.ts', 'core/letter.ts', 'core/phototalk.ts', ...readdirSync(join(ROOT, 'web/src/ai')).filter((f) => f.endsWith('.ts')).map((f) => `web/src/ai/${f}`)];
    for (const f of builders) for (const i of imports(f)) expect(/\/(?:passport|copy8|care7)$/.test(i), `${f} imports ${i}`).toBe(false);
  });
});
