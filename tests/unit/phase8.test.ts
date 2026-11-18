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

// ---------------------------------------------------------------- item 3: the passport and the therapist page
import { NO_PASSPORT, passport, passportText, type PassportInput } from '../../core/passport';
import { GRADE_WORDS, lessSureCount, newLog, practiceFlag, practiceReport, practiceText, type PracticeInput } from '../../core/practice';
import { learned, usual } from '../../core/prefs';
import { usualForOthers } from '../../core/share';
import { WEEK } from './week';

const pass = (o: Partial<PassportInput> = {}): PassportInput => ({ profile: WEEK.profile, history: [], learned: [], photoWords: [], prefs: NO_PASSPORT, now: NOW, device: 'phone', ...o });
const sect = (m: PassportInput, id: string) => passport(m).sections.find((s) => s.id === id)?.lines.map((l) => l.text) ?? [];
const prac = (o: Partial<PracticeInput> = {}): PracticeInput => ({ log: newLog(when(0, '00:00')), span: 'week', now: NOW, name: 'Frank', device: 'phone', speak: false, questions: [], diary: null, ...o });

describe('3. The passport (P1 7, 8, 10) and the therapist page (P1 8, 9)', () => {
  it('"A tired yes may not mean yes" is always under how yes and no are shown, and cannot be taken off', () => {
    const p = passport(pass());
    const l = p.sections.find((s) => s.id === 'yesno')!.lines.find((x) => x.key === 'yesno:tired')!;
    expect(l.text).toBe('A tired yes may not mean yes. Check it the other way. Ask about pain, drinks and the toilet every time.');
    expect(l.removable).toBe(false);
    expect(passportText(pass({ prefs: { ...NO_PASSPORT, off: ['yesno:tired'] } }))).toContain(l.text);
  });
  it('no number in About them: the page names none and says to ask the family; a number set is printed', () => {
    const unset = sect(pass({ number: '911', numberSet: '' }), 'wrong');
    expect(unset[0]).toBe('Emergency number: not filled in, ask the family.');
    expect(unset.join(' ')).not.toMatch(/\b911\b|\b999\b|\b112\b/);
    expect(unset[1]).toContain('call the emergency number now');
    expect(sect(pass({ number: '999', numberSet: '999' }), 'wrong')[0]).toBe('Emergency number: 999.');
  });
  it('a food line with diabetes (or swallowing, or a fluid limit) noted says to ask the family, and names no condition', () => {
    const f = sect(pass({ foodCare: true }), 'about').find((x) => x.startsWith('Food and drink'))!;
    expect(f).toMatch(/^Food and drink: .+\. Ask the family what is all right\.$/);
    expect(f).not.toMatch(/diabet|swallow|fluid|sugar/i);
    expect(sect(pass(), 'about').find((x) => x.startsWith('Food and drink'))).not.toContain('Ask the family');
  });
  it('"less sure" answers count for no usual line, at home or on the passport, and a usual yes to an offer never travels', () => {
    const at = (i: number) => when(0, '09:00') + i * 3600_000;
    const tired = [0, 1, 2].map((i) => ({ q: 'Would you like tea or coffee?', label: 'tea', at: at(i), lessSure: true }));
    expect(usual(tired, 'Would you like tea or coffee?')).toBeNull();
    expect(learned(tired, [])).toEqual([]);
    const sure = tired.map((h) => ({ ...h, lessSure: false }));
    expect(usual(sure, 'Would you like tea or coffee?')).toMatchObject({ label: 'tea', n: 3 });
    const yes = learned([0, 1, 2].map((i) => ({ q: 'Would you like the radio on?', label: 'yes', at: at(i) })), []);
    expect(yes[0].text).toMatch(/^Usually says yes to/);
    expect(yes.filter(usualForOthers)).toEqual([]);
    // the letter words and the likes of the passport leave them out too
    const letter = [0, 1].map((i) => ({ q: 'It starts with B. Is it one of these?', label: 'Bo', at: at(i), lessSure: true }));
    expect(sect(pass({ history: letter }), 'words')).toEqual([]);
  });
  it('the therapist page: the "less sure" count stands beside the yes count, with why a yes is not proof', () => {
    const r = practiceReport(prac({ lessSure: 5 }));
    const turn = r.sections.find((s) => s.id === 'turn')!.lines;
    const i = turn.findIndex((l) => l.startsWith('The check'));
    expect(turn[i + 1]).toBe('Answers marked "less sure" by the answer check in this time (a run of yes, or the same place on the screen): 5. A yes on the check is not proof: when tired, a yes can mean no.');
    expect(turn[i + 1].replace(/"[^"]*"/g, '')).not.toMatch(GRADE_WORDS);
    expect(lessSureCount([{ at: NOW - 1000, lessSure: true }, { at: NOW - 2000 }, { at: when(-20, '10:00'), lessSure: true }], 'week', NOW)).toBe(1);
  });
  it('box off: the printed page says, without any detail, that the diary holds a pain answer or "something\'s wrong", only when true', () => {
    const flagged = practiceText(prac({ flag: true }));
    expect(flagged).toContain('Nothing about needs, pain or health is on this page. Those are in the diary.');
    expect(flagged).toContain('The diary of this time holds a pain answer or "something\'s wrong": ask the family.');
    expect(practiceText(prac({ flag: false }))).not.toContain('holds a pain answer');
    const diary = [ans('Are you in pain?', 'yes', 5, '10:00', 'body')];
    expect(practiceFlag(diary, 'week', NOW)).toBe(true);
    expect(practiceFlag([ans('Are you in pain?', 'no', 5, '10:00', 'body')], 'week', NOW)).toBe(false);
    expect(practiceFlag([{ id: 'n', at: when(5, '10:00'), kind: 'need', label: "something's wrong", topic: 'body' }], 'week', NOW)).toBe(true);
    // with the box ticked the page holds the answers themselves, and no second line
    expect(practiceText(prac({ diary, flag: false }))).not.toContain('holds a pain answer');
  });
});

// ---------------------------------------------------------------- item 5: Home and the person's screen
import { COPY } from '../../core/copy';
import { P5 } from '../../core/copy5';
import { LATER_MS, addLater, cleanLater, laterOf, shownLater } from '../../core/later';
import { hearButton } from '../../web/src/phase5';
import { homeScreen, howBlock, laterBlock } from '../../web/src/simple';

describe('5. Home and the person\'s screen (P1 12, 14, 15)', () => {
  it('"Needs something now?", and the red card says what it is for', () => {
    expect(COPY.simple.needs).toBe('Needs something now?');
    expect(P5.sudden.linkSub).toBe('Signs of a new stroke, chest pain, a fall: call.');
    expect(JSON.stringify(COPY)).not.toContain('Needs it now');
  });
  it('the 4 steps hold "Write the key word big", open and folded to one line', () => {
    expect(howBlock('', true)).toContain('Write the key word big as you say it: TEA?');
    const folded = howBlock('', false);
    expect(folded).toContain('Write the key word big.');
    expect(folded).not.toContain('<li>');
  });
  it('Read aloud failed: the person\'s screen asks nothing of them; the line is for the carer', () => {
    const p = hearButton('failed');
    expect(p.replace(/<[^>]+>/g, ' ').trim()).toBe('No sound');
    expect(p).not.toMatch(/yourself|say it/i);
    expect(P5.speak.failed('')).toMatch(/Read the question out loud to them\.$/);
  });
  it('"later": the tile of "We\'re stuck" and "later" to talking now or later keep the question; "a wash later" is an answer, kept nowhere', () => {
    expect(laterOf({ asked: "Let's try another way.", label: 'later', repair: true, before: 'Would you like tea or coffee?' })).toBe('Would you like tea or coffee?');
    expect(laterOf({ asked: 'Do you want to tell me now or later?', label: 'later', repair: false, before: null })).toBe('Do you want to tell me now or later?');
    expect(laterOf({ asked: 'Would you like to talk about how you feel now, or later?', label: 'later', repair: false, before: null })).toBe('Would you like to talk about how you feel now, or later?');
    expect(laterOf({ asked: 'Would you like a wash now or later?', label: 'later', repair: false, before: null })).toBeNull();
    expect(laterOf({ asked: "Let's try another way.", label: 'show me', repair: true, before: 'Are you in pain?' })).toBeNull();
  });
  it('Home shows the newest two of the last day, each with "Ask it again" and "Done"; the same question once', () => {
    let xs = addLater([], 'Are you in pain?', NOW - 3_600_000);
    xs = addLater(xs, 'Would you like tea or coffee?', NOW - 60_000);
    xs = addLater(xs, 'Are you in pain?', NOW - 30_000);
    xs = addLater(xs, 'Old one?', NOW - LATER_MS - 1);
    const shown = shownLater(xs, NOW);
    expect(shown.map((x) => x.q)).toEqual(['Are you in pain?', 'Would you like tea or coffee?']);
    const html = laterBlock(shown.map((x, i) => ({ q: x.q, time: '15:30', i })));
    expect(html).toContain('Left for later: Are you in pain?, 15:30');
    expect((html.match(/data-act="later-ask"/g) ?? []).length).toBe(2);
    expect((html.match(/data-act="later-done"/g) ?? []).length).toBe(2);
    expect(laterBlock([])).toBe('');
    expect(cleanLater([{ q: 'x?', at: 1 }, { q: '', at: 2 }, { at: 3 }, null, 'y'])).toEqual([{ q: 'x?', at: 1 }]);
  });
  it('on Home it stands under how it works and above the topics', () => {
    const base = { name: '', aboutLink: false, busy: false, error: null, question: '', howOpen: false, topics: [], topicOpen: null, aiTag: '', ai: [], privacy: [], micHtml: '', voiceHtml: '', diaryHtml: '' } as unknown as Parameters<typeof homeScreen>[0];
    const html = homeScreen({ ...base, laterHtml: laterBlock([{ q: 'Are you in pain?', time: '15:30', i: 0 }]) });
    expect(html.indexOf('id="how"')).toBeLessThan(html.indexOf('id="later"'));
    expect(html.indexOf('id="later"')).toBeLessThan(html.indexOf('id="topics"'));
  });
});

// ---------------------------------------------------------------- item 6: hybrid visible
import { deviceWords } from '../../core/copy';
import { routeChip } from '../../core/simple';
import type { Card } from '../../core/types';
import { speakSheet, speakSwitch } from '../../web/src/phase5';
import { chipBlock } from '../../web/src/simple';

const card = (o: Partial<Card>) => ({ blocked: null, source: 'code', trace: [], ...o }) as unknown as Card;
describe('6. Hybrid visible (P0 4): the routing chip, and Read aloud says who it is for', () => {
  it('a card of the AI on this computer: "Made on this computer", with why (About them read here, or the connection down)', () => {
    expect(routeChip(card({ source: 'on-device', why: { personal: ['lake'] } as Card['why'] }), 'About Frank')).toEqual({ where: 'device', text: 'Made on this computer', why: 'Why here: it read About Frank, and that never leaves this computer.' });
    expect(routeChip(card({ source: 'on-device', ranOffline: true }), 'About Frank')?.why).toBe('Why here: the connection was down, so the same request ran on the AI of this computer.');
  });
  it('a card of online help: "Made online, after your yes", with why (no AI here, or the AI here made no card)', () => {
    expect(routeChip(card({ source: 'in-cloud', trace: [{ step: 'private', ran: 'skipped', why: 'no model', used: false }] }), 'About Frank')).toEqual({ where: 'cloud', text: 'Made online, after your yes', why: 'Why online: this computer has no AI of its own for a question like this.' });
    expect(routeChip(card({ source: 'in-cloud', trace: [{ step: 'private', ran: 'on-device', why: 'no card', used: false }] }), 'About Frank')?.why).toBe('Why online: the AI on this computer made no card for it.');
    // on a phone the words follow the device
    expect(deviceWords('Why online: this computer has no AI of its own for a question like this.', 'phone')).toBe('Why online: this phone has no AI of its own for a question like this.');
  });
  it('a card of the rules, or none: no chip', () => {
    expect(routeChip(card({ source: 'code' }), 'About Frank')).toBeNull();
    expect(routeChip(card({ source: 'in-cloud', blocked: 'no card' }), 'About Frank')).toBeNull();
    expect(routeChip(null, 'x')).toBeNull();
    expect(chipBlock(null)).toBe('');
    expect(chipBlock({ where: 'cloud', text: 'Made online, after your yes', why: 'Why online: x.' })).toContain('data-where="cloud"');
  });
  it('Read aloud: the button and the sheet say it is for the person, and that the carer does not have to read it out', () => {
    const sw = speakSwitch({ name: 'Frank', on: false, online: true, can: true });
    expect(sw).toContain('Read the cards aloud to Frank');
    const sh = speakSheet({ text: 'Would you like tea or coffee?', request: '{}', name: 'Frank' });
    expect(sh).toContain('For Frank: Frank hears the question and the choices in a calm, slow voice, so you do not have to read them out.');
    expect(speakSheet({ text: 'x', request: '{}' })).toContain('For the person: they hear the question');
    expect(sh.indexOf('id="speak-sheet-for"')).toBeLessThan(sh.indexOf('data-act="speak-yes"'));
  });
});
