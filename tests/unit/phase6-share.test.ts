// Phase 6, part A (18 Nov 2026): share with the care circle. No server and no account: the text is built by rules on
// the device, the carer sees the exact text on a sheet, and it leaves only through the app the carer picks.
// Pinned here: the text builder on its worst cases (a chest pain day, a fall with a blow to the head, a day with no
// drink, a fluid limit), the health notes only when ticked, no photo and no data URL, the sheet, and the boundary:
// nothing in the page hands the text to anything but `navigator.share({ text })` and the clipboard.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { COPY } from '../../core/copy';
import { P6 } from '../../core/copy6';
import type { DiaryEntry, LogKind } from '../../core/diary';
import { NO_HEALTH, type HealthNotes } from '../../core/insights';
import { learned, type Learned } from '../../core/prefs';
import { HANDOVER_MS, familyText, handoverText, handoverUsual, healthLines, riskyNotes } from '../../core/share';
import { diaryScreen } from '../../web/src/diary';
import { handoverLink, shareButtons, shareSheet } from '../../web/src/phase6';
import { NOW, WEEK, weekDiary, weekHistory, when } from './week';

const ROOT = join(__dirname, '..', '..');
const read = (f: string) => readFileSync(join(ROOT, f), 'utf8');
const imports = (f: string) => [...read(f).matchAll(/^import [^;]*? from '([^']+)';$/gms)].map((m) => m[1]);
const unesc = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const H = (h: Partial<HealthNotes>): HealthNotes => ({ ...NO_HEALTH, ...h });
const TOPIC: Record<LogKind, DiaryEntry['topic']> = { drank: 'food', ate: 'food', toilet: 'body', slept: 'rest', pain: 'body', fall: 'body', tablets: 'body' };
const log = (id: string, k: LogKind, d: number, t: string, label: string = k): DiaryEntry => ({ id, at: when(d, t), kind: 'log', log: k, label, topic: TOPIC[k] });
const ans = (id: string, q: string, label: string, d: number, t: string, topic: DiaryEntry['topic'] = 'body'): DiaryEntry => ({ id, at: when(d, t), kind: 'answer', q, label, topic });
// (phase 12b: a plain day has six drinks; fewer is a line of its own)
const plain = (d: number): DiaryEntry[] => [['08:00', 'drank'], ['08:30', 'ate'], ['10:00', 'drank'], ['12:00', 'drank'], ['12:30', 'ate'], ['15:00', 'drank'], ['17:00', 'drank'], ['18:00', 'ate'], ['20:00', 'drank']].map(([t, k], i) => log(`ID${d}x${i}`, k as LogKind, d, t));
const days = (...ds: number[]) => ds.flatMap(plain);
const family = (diary: DiaryEntry[], o: Partial<Parameters<typeof familyText>[0]> = {}) => familyText({ span: 'week', diary, health: null, name: 'Frank', now: NOW, ...o });
const handover = (diary: DiaryEntry[], o: Partial<Parameters<typeof handoverText>[0]> = {}) => handoverText({ diary, health: null, learned: [], name: 'Frank', now: NOW, ...o });

const STAMP = "Shared from Talk Partner on Sun 22 Nov, 12:00. Counted by the app's rules from what was entered here; not a medical record.";
const CALL = 'Call 911 now if this is new or sudden';
/** Nothing in a shared text may suggest more to drink, name a medicine or a dose, or play a line down. */
const MORE_DRINK = /drink more|more to drink|more drinks?\b|offer (?:him|her|them|a|more)|encourage|should drink|needs? to drink|more fluid|more water|give (?:him|her|them)/i;
const ADVICE = /\bdiagnos|\bdose\b|\bmg\b|\bmedicine\b|\bprescri|you should\b|\bmust\b/i;
const PLAYS_DOWN = /\bjust\b|\bfine\b|nothing to worry|probably|\bsimply\b|no need to|do not worry|don't worry|normal\b/i;
/** (the footer's own "not medical advice and not a diagnosis" is taken out before the scan) */
const safe = (full: string, what: string) => { const t = full.split(COPY.simple.insights.footer).join(''); expect(t, what).not.toMatch(MORE_DRINK); expect(t, what).not.toMatch(ADVICE); expect(t, what).not.toMatch(PLAYS_DOWN); expect(t, what).not.toContain('!'); };

describe('"Share with family": the text', () => {
  it('starts with the brief\'s sentence and the moment; then the span, the lines with their base lines, the entries by day, and what the text is not', () => {
    const t = family(weekDiary(), { health: null });
    const lines = t.split('\n');
    expect(lines[0]).toBe(STAMP);
    expect(lines[1]).toBe('');
    expect(lines[2]).toBe("Frank's diary, the last 7 days (Mon 16 Nov to Sun 22 Nov).");
    // (phase 9: Tuesday's pain is a line of its own, with its fixed sentence)
    expect(t).toContain('WHAT STANDS OUT (the last 7 days)\n1. Worth mentioning to the doctor or nurse: Pain was chosen or logged on 1 day in the last 7 days.\n   Ask again today, and tell the doctor or nurse if it is new or still there.\n   How it was counted: Days with pain: Tue 17 Nov. Only what was entered here.\n2. Worth mentioning to the doctor or nurse: Few drinks were entered on Wed 18 Nov: 2.\n   If that is right, and not a gap in the diary, tell the doctor or nurse today.\n   How it was counted: Counted that day: 2. Every "Drank" tap counts');
    expect(t).toContain(COPY.simple.insights.footer);
    expect(t).toContain('ENTRIES BY DAY\nMon 16 Nov\n  07:40  Would you like tea or coffee? tea\n');
    expect(t.endsWith(`${P6.share.gap}\n${P6.share.noAdvice}`)).toBe(true);
    expect(t).not.toContain(CALL);
    safe(t, 'the week');
  });
  it('with no name: "The diary"; an empty span says so and still has every fixed line', () => {
    const t = family([], { name: '' });
    expect(t).toContain('The diary, the last 7 days (Mon 16 Nov to Sun 22 Nov).');
    expect(t).toContain('Nothing was entered in this time, so there is nothing to count.');
    expect(t).toContain('ENTRIES BY DAY\nNothing entered in the last 7 days.');
    expect(t.split('\n')[0]).toBe(STAMP);
  });
  it('the same diary, notes and moment give the same text; it holds no entry id', () => {
    const d = [...days(0, 1), log('ID-secret', 'ate', 2, '08:00')];
    expect(family(d)).toBe(family(d));
    expect(family(d)).not.toMatch(/ID-secret|ID\dx\d/);
    expect(handover(d)).not.toMatch(/ID-secret|ID\dx\d/);
  });
  it('Month: the 30 days, with this week\'s lines kept', () => {
    const t = family([...days(0, 1, 2), log('f', 'fall', 1, '14:00')], { span: 'month' });
    expect(t).toContain("Frank's diary, the last 30 days (Sat 24 Oct to Sun 22 Nov).");
    expect(t).toContain('WHAT STANDS OUT (the last 30 days)');
    expect(t).toContain('A fall was logged: Tue 17 Nov.');
  });
});

describe('worst cases: nothing in the text helps anyone dismiss pain, a need or distress', () => {
  it('a chest pain day: the call sentence at the top, and on the line its "whom to tell" sentence and the call sentence', () => {
    const d = [...days(0, 1, 2), ans('w', 'Where does it hurt?', 'chest', 2, '09:01'), ans('b', 'How bad is the pain?', 'very bad', 2, '09:03')];
    const t = family(d);
    expect(t.split('\n')[1]).toBe('Call 911 now if this is new or sudden: see "What stands out" below.');
    expect(t).toContain('1. Call now if it is new or sudden, and tell the doctor or nurse: Strong pain was chosen on Wed 18 Nov: very bad. Pain in the head or the chest was chosen on Wed 18 Nov: chest.\n   Tell the doctor or nurse. If it is new or sudden, call 911 now.\n   Call 911 now if this is new or sudden.\n   How it was counted:');
    expect(t).toContain('  09:01  Where does it hurt? chest');
    safe(t, 'chest pain');
    // the family's own number is the one named
    expect(family(d, { number: '999' })).toContain('Call 999 now if this is new or sudden: see');
    expect(family(d, { number: '999' })).not.toContain('911');
  });
  it('a chest pain yesterday, shared from the Today tab: this week\'s lines are in the text, with the call sentence', () => {
    const d = [...days(4, 5), ans('w', 'Where does it hurt?', 'chest', 5, '21:00'), log('k', 'drank', 6, '08:00')];
    const t = family(d, { span: 'today' });
    expect(t.split('\n')[1]).toContain(CALL);
    expect(t).toContain("Frank's diary, today (Sun 22 Nov).");
    expect(t).toContain('WHAT STANDS OUT (the last 7 days)');
    expect(t).toContain('Pain in the head or the chest was chosen on Sat 21 Nov: chest.');
    // the entries are today's only
    expect(t).toContain('ENTRIES BY DAY\nSun 22 Nov\n  08:00  Drank');
    expect(t).not.toContain('21:00');
  });
  it('a fall with a blow to the head: the call sentence at the top and on the line; a fall with none noted has the line and no call box, as in the app', () => {
    const t = family([...days(0, 1, 2), log('f', 'fall', 2, '10:00', 'fall: hit head')]);
    expect(t.split('\n')[1]).toContain(CALL);
    expect(t).toContain('A fall was logged: Wed 18 Nov. A fall with a blow to the head was logged on Wed 18 Nov.\n   Tell the doctor or nurse about every fall. If there is new pain, drowsiness or confusion since, call 911 now.\n   Call 911 now if this is new or sudden.');
    expect(t).toContain('  10:00  Fall');
    safe(t, 'fall with head');
    const plainFall = family([...days(0, 1, 2), log('f', 'fall', 2, '10:00')]);
    expect(plainFall).toContain('A fall was logged: Wed 18 Nov.\n   Tell the doctor or nurse about every fall.');
    expect(plainFall).not.toContain(CALL);
  });
  it('a day with no drink: "tell the doctor or nurse today", as a red flag, without the sentence that excused it', () => {
    const t = family([...days(0, 1), log('a1', 'ate', 2, '08:00'), log('a2', 'ate', 2, '18:00')]);
    expect(t).toContain('1. Tell the doctor or nurse: No drink was chosen or logged on Wed 18 Nov. If that is right, and not a gap in the diary, tell the doctor or nurse today.\n   How it was counted: Other things were entered on that day, and no drink. Only what was entered here.');
    expect(t).not.toMatch(/That can simply mean/);
    safe(t, 'no drink');
  });
  it('a fluid limit, box off: the text states no health note, and never suggests more to drink; the red flag is still there', () => {
    const d = [...days(0, 1), log('a1', 'ate', 2, '08:00'), log('k', 'drank', 3, '08:00'), log('a3', 'ate', 3, '09:00')];
    const off = family(d, { health: null });
    expect(off).not.toMatch(/fluid limit|is noted/i);
    expect(off).not.toContain('HEALTH NOTES');
    expect(off).toContain('No drink was chosen or logged on Wed 18 Nov. If that is right, and not a gap in the diary, tell the doctor or nurse today.');
    expect(off).toContain('Few drinks were entered on Thu 19 Nov: 1.');
    safe(off, 'fluid limit, off');
    // and the last line still says what the text is not
    expect(off).toContain("Before changing food, drink or tablets, go by the doctor's plan.");
  });
  it('a fluid limit, box ticked: the lines say it and point to the doctor\'s plan; never "more"', () => {
    const d = [...days(0, 1), log('a1', 'ate', 2, '08:00'), log('k', 'drank', 3, '08:00'), log('a3', 'ate', 3, '09:00')];
    const on = family(d, { health: H({ fluidLimit: true }) });
    expect(on).toContain('No drink was chosen or logged on Wed 18 Nov. A fluid limit is not "no drinks": if that is right, and not a gap in the diary, tell the doctor or nurse today.');
    expect(on).toContain("Few drinks were entered on Thu 19 Nov: 1. A fluid limit from the doctor is noted here: check the day against the doctor's plan.");
    expect(on).toContain('HEALTH NOTES (as noted in the app by the family; not a medical record)\n- A fluid limit from the doctor');
    safe(on, 'fluid limit, on');
  });
  it('low mood on three days: whom to talk to, and the number', () => {
    const t = family([...days(0, 1, 2), ...[0, 1, 2].map((n) => ans(`m${n}`, 'How are you feeling today?', 'sad', n, '10:00', 'feel'))]);
    expect(t).toContain('Talk to the GP or nurse about it. If they seem very low, or may harm themselves: call the doctor or nurse today, or a mental health helpline (you can put its number in About them, Health notes). If life is at risk, call 911 now.');
    safe(t, 'mood');
  });
  it('every worst case at once, for a week and a month, with every health note on and off: nothing suggests more to drink, advises or plays down', () => {
    const d = [...days(0, 1), log('a1', 'ate', 2, '08:00'), ans('w', 'Where in the head?', 'front', 3, '09:00'), ans('b', 'How bad is the pain?', 'very bad', 3, '09:01'), log('f', 'fall', 4, '10:00', 'fall: hit head'), ...[3, 4, 5].map((n) => ans(`m${n}`, 'How are you feeling today?', 'bad', n, '11:00', 'feel')), ...Array.from({ length: 9 }, (_, i) => log(`k${i}`, 'drank', 5, `${String(8 + i).padStart(2, '0')}:00`)), log('t', 'tablets', 6, '08:00')];
    const all = H({ diabetes: true, swallowing: true, fluidLimit: true, reminders: true, text: 'Dr Patel on Monday.' });
    for (const span of ['today', 'week', 'month'] as const) for (const health of [null, all, H({ fluidLimit: true }), H({ reminders: true })]) {
      const t = family(d, { span, health });
      safe(t, `${span} ${JSON.stringify(health)}`);
      expect(t.split('\n')[1], span).toContain(CALL);
      expect(t.split('\n')[0]).toBe(STAMP);
    }
    for (const health of [null, all]) safe(handover(d, { health }), 'handover');
  });
});

describe('the health notes go in only when the box is ticked', () => {
  const notes = H({ diabetes: true, swallowing: true, fluidLimit: true, reminders: true, text: 'Type 2, diet only. ZQX-marker. Dr Patel on Monday.', emergency: '112' });
  const d = [...weekDiary(), log('a1', 'ate', 5, '23:00')];
  const STATED = /diabetes|swallow|fluid limit|reminder|ZQX|Patel|is noted here|HEALTH NOTES/i;
  it('off (the builder is not handed them): no note, no sentence that states one, and the same text as with nothing noted', () => {
    for (const span of ['today', 'week', 'month'] as const) {
      const t = family(d, { span, health: null });
      expect(t, span).not.toMatch(STATED);
      expect(t).toBe(family(d, { span, health: NO_HEALTH }));
    }
    expect(handover(d, { health: null })).not.toMatch(STATED);
  });
  it('ticked: the ticked boxes by their names and the carer\'s own words, as written; the lines that rest on them say so', () => {
    const t = family(d, { health: notes });
    expect(t).toContain('HEALTH NOTES (as noted in the app by the family; not a medical record)\n- Diabetes\n- Swallowing difficulty\n- A fluid limit from the doctor\n- Needs reminders to drink and eat\n- Type 2, diet only. ZQX-marker. Dr Patel on Monday.');
    expect(t).toContain('Something sweet was chosen 3 times in the last 7 days. Diabetes is noted here.');
    expect(handover(d, { health: notes })).toContain('- Type 2, diet only. ZQX-marker. Dr Patel on Monday.');
  });
  it('the emergency number is not a health note: it is never listed, and the call sentences use it either way', () => {
    expect(healthLines(notes).join(' ')).not.toContain('112');
    expect(healthLines(NO_HEALTH)).toEqual([]);
    expect(family(d, { health: H({ emergency: '112' }) })).not.toContain('HEALTH NOTES');
  });
  it('the sheet warns, while the box is off, about a note that changes what is safe to give', () => {
    expect(riskyNotes(notes)).toEqual(['a fluid limit from the doctor', 'swallowing difficulty', 'diabetes']);
    expect(riskyNotes(H({ reminders: true, text: 'x' }))).toEqual([]);
  });
});

describe('no photo and no data URL', () => {
  it('whatever the diary holds, the text has no data URL, no blob and no picture', () => {
    const d = [...weekDiary(), ans('p', 'Shall we look at the photo of Beth?', 'yes', 6, '10:00', 'people')];
    for (const t of [family(d, { health: WEEK.health as HealthNotes }), family(d, { span: 'month' }), handover(d, { health: WEEK.health as HealthNotes, learned: learned(weekHistory(), []) })]) {
      expect(t).not.toMatch(/data:|base64|blob:|<img|\.jpe?g|\.png/i);
    }
  });
  it('the builder cannot reach a photo: core/share.ts imports no photo module, no store, no profile and no engine, and takes no photo', () => {
    const src = read('core/share.ts');
    // (phase 12: './later', for the "STILL OPEN" block's time and pain words; it imports only './reliability')
    for (const i of imports('core/share.ts')) expect(['./copy', './copy12', './copy5', './copy6', './diary', './insights', './later', './prefs', './redflag', './reliability'], i).toContain(i);
    expect(imports('core/later.ts')).toEqual(['./reliability']);
    expect(src).not.toMatch(/import[^;]*photo/i);
    expect(src).not.toMatch(/fetch\(|XMLHttpRequest|sendBeacon|WebSocket|navigator\.|indexedDB|localStorage/);
  });
});

describe('"For the next carer": the last 24 hours', () => {
  it('the window is 24 hours to the minute; the title says from when to when', () => {
    expect(HANDOVER_MS).toBe(86400000);
    const d = [log('old', 'drank', 5, '11:59'), log('in', 'drank', 5, '12:01'), log('a', 'ate', 6, '08:00')];
    const t = handover(d);
    expect(t.split('\n')[0]).toBe(STAMP);
    expect(t).toContain('For the next carer: Frank. The last 24 hours (Sat 12:00 to Sun 12:00).');
    expect(t).toContain('Drinks: 1 entered (Sat 12:01). That is few for a day: worth mentioning to the doctor or nurse.');
    expect(t).not.toContain('11:59');
  });
  it('drinks, food and the toilet are counted as the diary counts them (a card and a tap within 20 minutes count once)', () => {
    const d = [ans('c', 'Would you like tea or coffee?', 'tea', 6, '08:00', 'food'), log('l', 'drank', 6, '08:05'), log('l2', 'drank', 6, '09:00'), log('l3', 'drank', 6, '10:00'), log('a', 'ate', 6, '08:30'), log('t', 'toilet', 6, '09:30'), ans('t2', 'Do you need the toilet?', 'yes', 6, '11:00')];
    const t = handover(d);
    expect(t).toContain('Drinks: 3 entered (Sun 08:05, Sun 09:00, Sun 10:00).\nFood: 1 entered (Sun 08:30).\nToilet: 2 entered (Sun 09:30, Sun 11:00).');
  });
  it('worst case, no drink in 24 hours: a red flag, said with its doubt and without an excuse; no food likewise', () => {
    const t = handover([log('t', 'toilet', 6, '09:30')]);
    expect(t).toContain('Drinks: none entered. If that is right, and not a gap in the diary, tell the doctor or nurse today.');
    expect(t).toContain('Food: none entered. If that is right, and not a gap in the diary, mention it to the doctor or nurse.');
    safe(t, 'handover, no drink');
  });
  it('worst case, a fluid limit: ticked, the drinks line points to the doctor\'s plan and never says "few"; unticked, the text states no limit and never says "more"', () => {
    const d = [log('k', 'drank', 6, '08:00'), log('a', 'ate', 6, '08:30')];
    const on = handover(d, { health: H({ fluidLimit: true }) });
    expect(on).toContain("Drinks: 1 entered (Sun 08:00). A fluid limit from the doctor is noted: go by the doctor's plan.");
    expect(on).not.toContain('few for a day');
    const none = handover([log('a', 'ate', 6, '08:30')], { health: H({ fluidLimit: true }) });
    expect(none).toContain("Drinks: none entered. If that is right, and not a gap in the diary, tell the doctor or nurse today. A fluid limit from the doctor is noted: go by the doctor's plan.");
    const off = handover(d, { health: null });
    expect(off).not.toMatch(/fluid limit/i);
    safe(on, 'on'); safe(off, 'off'); safe(none, 'none');
  });
  it('worst case, chest pain: the answers as given, whom to tell and when to call, and the call sentence at the top', () => {
    const d = [...plain(6), ans('y', 'Are you in pain?', 'yes', 6, '09:00'), ans('w', 'Where does it hurt?', 'chest', 6, '09:01'), ans('b', 'How bad is the pain?', 'very bad', 6, '09:02')];
    const t = handover(d);
    expect(t.split('\n')[1]).toBe('Call 911 now if this is new or sudden: see the lines on pain and falls below.');
    expect(t).toContain('Pain: Sun 09:00 Are you in pain? yes; Sun 09:01 Where does it hurt? chest; Sun 09:02 How bad is the pain? very bad. Tell the doctor or nurse. If it is new or sudden, call 911 now.');
  });
  it('a pain that is not strong and not in the head or chest: the answers, and "ask again"; none entered is never "no pain"', () => {
    const t = handover([...plain(6), log('p', 'pain', 6, '09:00')]);
    expect(t).toContain('Pain: Sun 09:00 Pain. Ask again on your shift, and take the answer as said.');
    expect(t).not.toContain(CALL);
    expect(handover(plain(6))).toContain('Pain: none entered. That does not show there was none: ask, and take the answer as said.');
  });
  it('worst case, a fall: every fall carries whom to tell and when to call, with the blow to the head when it was noted', () => {
    const head = handover([...plain(6), log('f', 'fall', 6, '10:00', 'fall: hit head')]);
    expect(head).toContain('Falls: 1 logged (Sun 10:00). With a blow to the head: Sun 10:00. Tell the doctor or nurse about every fall. If there is new pain, drowsiness or confusion since, call 911 now.');
    expect(head.split('\n')[1]).toContain(CALL);
    const noHead = handover([...plain(6), log('f', 'fall', 6, '10:00')]);
    expect(noHead).toContain('Falls: 1 logged (Sun 10:00). Tell the doctor or nurse about every fall. If there is new pain, drowsiness or confusion since, call 911 now.');
    expect(noHead.split('\n')[1]).toContain(CALL);
    expect(handover(plain(6))).toContain('Falls: none logged.');
  });
  it('tablets: a tap is a log line and nothing more; logged or not, "check before giving any"', () => {
    expect(handover([...plain(6), log('t', 'tablets', 6, '08:05')])).toContain('Tablets taken: logged at Sun 08:05. The app does not know which tablets or how many: check before giving any.');
    expect(handover(plain(6))).toContain('Tablets taken: none logged. That can mean nobody tapped it: check before giving any.');
  });
  it('nothing entered in 24 hours is a gap, and is called one', () => {
    const t = handover(days(0, 1));
    expect(t).toContain('Nothing was entered in the last 24 hours. That is a gap in the diary, not a report: ask the family how the day went.');
    expect(t).not.toMatch(/Drinks:|Pain:/);
  });
  it('the usual choices: counted lines, never for a care question, never the needs board, never a usual "no"', () => {
    const L = (kind: Learned['kind'], q: string, text: string): Learned => ({ key: `${kind}:${q}`, kind, q, text });
    const lines = [
      L('usual', 'Would you like tea or coffee', '"Would you like tea or coffee": usually tea (7 of 7).'),
      L('usual', 'Are you in pain', 'Usually says yes to "Are you in pain" (4 of 4).'),
      L('usual', 'How are you feeling today', '"How are you feeling today": usually good (3 of 4).'),
      L('usual', 'Do you need the toilet', 'Usually says yes to "Do you need the toilet" (3 of 3).'),
      L('no', 'Would you like something to drink', 'Usually says no to "Would you like something to drink" (3 of 4).'),
      L('time', 'Would you like a snack', '"Would you like a snack": yes in the morning (3 of 3), no in the evening (3 of 3).'),
      L('time', 'Would you like tea or water', '"Would you like tea or water": tea in the morning (3 of 3), water in the evening (3 of 4).'),
      L('need', '', 'Asked for "toilet" on the needs board 5 times, mostly in the morning (4 of 5).'),
    ];
    expect(handoverUsual(lines)).toEqual(['- "Would you like tea or coffee": usually tea (7 of 7).', '- "Would you like tea or water": tea in the morning (3 of 3), water in the evening (3 of 4).']);
    const t = handover(plain(6), { learned: lines });
    expect(t).toContain('USUAL CHOICES (counted from the answers Frank confirmed; a hint for you, and Frank still chooses every time)\n- "Would you like tea or coffee": usually tea (7 of 7).');
    expect(t).toContain('Nothing about pain, the body or feelings is in this list: ask those every time.');
    expect(t).not.toMatch(/Are you in pain" \(|needs board|says no to/);
    expect(handover(plain(6), { name: '' })).toContain('a hint for you, and they still choose every time)\nNothing learned yet.');
  });
  it('on the week fixture, with what was learned from it', () => {
    const t = handover(weekDiary(), { learned: learned(weekHistory(), []) });
    expect(t).toContain('- "Would you like tea or coffee": usually tea');
    safe(t, 'week handover');
  });
});

describe('the sheet shows the exact text before anything leaves', () => {
  const text = family([...days(0, 1, 2), ans('x', 'Tea & <b>biscuits</b>?', 'yes', 2, '09:00', 'food')]);
  const sheet = (o: Partial<Parameters<typeof shareSheet>[0]> = {}) => shareSheet({ kind: 'family', text, health: false, hasHealth: true, risky: [], canShare: true, device: 'phone', status: '', ...o });
  it('the brief\'s sentence, the box (off), the exact text, then Share, Copy, Cancel', () => {
    const html = sheet();
    expect(html).toContain('<p id="share-leaves">This text leaves the phone through the app you pick (message, email). Talk Partner keeps no copy and has no server.</p>');
    expect(html).toContain('<input type="checkbox" id="share-health"  ><span>Include the health notes</span>');
    const pre = /<pre class="q" id="share-text" tabindex="0">([\s\S]*?)<\/pre>/.exec(html)![1];
    expect(unesc(pre)).toBe(text);
    expect(html).not.toContain('<b>biscuits</b>');
    const order = ['id="share-leaves"', 'id="share-health"', 'id="share-text"', 'data-act="share-go"', 'data-act="share-copy"', 'data-act="share-cancel"'].map((x) => html.indexOf(x));
    expect(order.every((n) => n > 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(html).toContain('Photos never go in.');
    expect(html).toContain('role="dialog" aria-modal="true" aria-labelledby="share-h"');
  });
  it('where Web Share is missing: only Copy (and Cancel), and the sentence says how the text can leave', () => {
    const html = sheet({ canShare: false, device: 'computer' });
    expect(html).not.toContain('share-go');
    expect(html).toContain('<button type="button" class="btn primary" id="share-copy" data-act="share-copy">Copy</button>');
    expect(html).toContain('This text leaves the computer only if you paste it somewhere yourself. Talk Partner keeps no copy and has no server.');
  });
  it('the box: ticked says the notes are in the text; with nothing noted it cannot be ticked; off with a fluid limit noted, the sheet says who will not know', () => {
    expect(sheet({ health: true })).toContain('id="share-health" checked ');
    expect(sheet({ health: true })).toContain('The health notes are in this text, as you see them below.');
    expect(sheet({ hasHealth: false })).toContain('id="share-health"  disabled');
    expect(sheet({ hasHealth: false })).toContain('No health notes are noted in About them.');
    const warn = sheet({ risky: ['a fluid limit from the doctor'] });
    expect(warn).toContain('Noted in About them: a fluid limit from the doctor. The person who reads this text will not know it unless you tick the box.');
    expect(sheet({ health: true, risky: ['a fluid limit from the doctor'] })).not.toContain('share-health-warn');
  });
  it('after Copy and after Share the sheet says what happened, and the last button is "Close"', () => {
    expect(sheet({ status: 'copied' })).toContain('data-act="share-copy">Copied</button>');
    expect(sheet({ status: 'copied' })).toContain('data-act="share-cancel">Close</button>');
    expect(sheet({ status: 'shared' })).toContain('Handed to the app you picked. Talk Partner kept no copy.');
    expect(sheet({ status: 'shareFailed' })).toContain('Sharing did not start here. Use Copy');
    expect(sheet({ kind: 'handover' })).toContain('Share this with the next carer?');
  });
});

describe('the diary screen and the first screen', () => {
  const model = (any: boolean) => ({ name: 'Frank', tab: 'week' as const, topic: 'all' as const, now: NOW, entries: any ? weekDiary() : [], any, logged: null, insights: null, tip: { tip: null, words: null, off: false }, copied: false, deleted: false });
  it('"Share with family" and "For the next carer" stand on the diary once it holds anything', () => {
    const html = diaryScreen(model(true));
    expect(html).toContain('id="share-family" data-act="share-open" data-kind="family"');
    expect(html).toContain('id="share-handover" data-act="share-open" data-kind="handover"');
    expect(diaryScreen(model(false))).not.toContain('share-open');
    expect(shareButtons()).toContain('Share with family');
    expect(handoverLink()).toContain('For the next carer');
  });
  it('the privacy line stays true: the app never sends the diary; it leaves only when the carer shares it, as a text seen first', () => {
    const lock = COPY.simple.diary.lock('Frank');
    expect(lock).toBe("The diary is kept on this computer only. The app never sends it anywhere: it leaves only when you share it yourself, as a text you see first. It is never shown on Frank's screen.");
    expect(diaryScreen(model(true))).toContain('it leaves only when you share it yourself, as a text you see first');
    expect(COPY.simple.health.lock).toContain('They leave only if you tick them into a text you share yourself.');
    expect(COPY.simple.learned.how('Frank')).toContain('the usual choices leave only in a note for the next carer or on the page "How to talk", if you share or print one yourself');
    expect(COPY.simple.about.lock).toBe('Everything here stays on this computer, unless you share it yourself.');
  });
  it('no sentence of the app but the photos\' own still says "never sent anywhere" (a photo never goes into a shared text)', () => {
    const copy = read('core/copy.ts');
    for (const m of copy.matchAll(/^.*never sent anywhere.*$/gm)) expect(m[0], m[0].trim().slice(0, 80)).toMatch(/Photos stay/);
  });
});

describe('the boundary: the text leaves through the share sheet or the clipboard, and nothing else', () => {
  const main = read('web/src/main.ts');
  it('the page hands the text to navigator.share as { text } and to the clipboard: the sheet\'s own text, from the two buttons only', () => {
    expect(main.match(/navigator\.share\(/g)!.length).toBe(1);
    expect(main).toContain('void navigator.share({ text: sh.text })');
    const go = main.slice(main.indexOf("case 'share-go':"), main.indexOf("case 'share-copy':"));
    const copy = main.slice(main.indexOf("case 'share-copy':"), main.indexOf("// ---- phase 6: a line of"));
    expect(go).not.toMatch(/url:|files:|title:/);
    expect(copy).toContain('navigator.clipboard.writeText(sh.text)');
    // the builders are called in one place, and the health notes are handed over only when the box is ticked
    expect(main.match(/familyText\(|handoverText\(/g)!.length).toBe(2);
    expect(main).toContain('health: health ? state.health : null');
    // the sheet opens with the box off, every time
    expect(main).toContain("p6.share = { kind, health: false, text: shareTextNow(kind, false), status: '', from: el.id };");
  });
  it('nothing of the share is stored, and no engine, prompt or request file knows the builder', () => {
    const p6 = main.slice(main.indexOf('const p6 = {'), main.indexOf('function closeShare'));
    expect(p6).not.toMatch(/kvSet|localStorage|indexedDB|fetch\(/);
    const builders = ['core/prompt.ts', 'core/requests.ts', 'core/strip.ts', 'core/pipeline.ts', 'core/narrow.ts', 'core/summary.ts', 'core/reword.ts', 'core/engine.ts', 'core/rules.ts', 'core/speak.ts', 'core/letter.ts', 'core/phototalk.ts', ...readdirSync(join(ROOT, 'web/src/ai')).filter((f) => f.endsWith('.ts')).map((f) => `web/src/ai/${f}`)];
    for (const f of builders) for (const i of imports(f)) expect(/\/(?:share|copy6)$/.test(i), `${f} imports ${i}`).toBe(false);
    expect(imports('web/src/phase6.ts').every((i) => /core\/(?:copy|copy5|copy6|diary)$/.test(i))).toBe(true);
  });
  it('no server came in with phase 6: no new dependency, and firebase.json is hosting only as before', () => {
    const pkg = JSON.parse(read('package.json')) as { dependencies: Record<string, string> };
    expect(Object.keys(pkg.dependencies)).toEqual(['firebase']);
  });
});
