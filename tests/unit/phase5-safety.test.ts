// Phase 5 (18 Nov 2026), the fixes of judge round 6. Health safety first: every new hint is walked on its worst case,
// so that nothing here helps a carer dismiss pain, a need or distress. Then Read aloud (what leaves, and when), the
// "Just this once" sheets, and "Since the last visit".
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { COPY } from '../../core/copy';
import { P4 } from '../../core/copy4';
import { P5 } from '../../core/copy5';
import { answerEntry, logEntry, needEntry, FALL_HEAD, type DiaryEntry } from '../../core/diary';
import { NO_HEALTH, cloudLines, insights, type HealthNotes } from '../../core/insights';
import { needsCard } from '../../core/needs';
import { bodyDetailCard } from '../../core/pipeline';
import { DEFAULT_NUMBER, WRONG_TILE, emergencyNumber, telHref, urgentAnswer, urgentAny } from '../../core/redflag';
import { careAnswer, reliability, tapsFrom } from '../../core/reliability';
import { checkReworded, REWORD_SYSTEM_PROMPT } from '../../core/reword';
import { BODY_REGIONS } from '../../core/rules';
import { SINCE_QUESTIONS, pickedQuestions, sinceLines, sinceText, toggleQuestion } from '../../core/since';
import { SpeakCache, TTS_MODEL, pcmRate, pcmToWav, speakRequest, speakText, speakable } from '../../core/speak';
import { TOPIC_BASE } from '../../core/topics';
import { TREE_QUESTIONS } from '../../core/tree';
import { EMPTY_PROFILE, type Card } from '../../core/types';
import { visitCard, VISIT } from '../../core/visit';
import { insightsBlock, diaryScreen, insightSheet } from '../../web/src/diary';
import { letterSheet, visitScreen } from '../../web/src/phase4';
import { fallBlock, hearButton, sinceBlock, sinceControls, speakSheet, speakSwitch, suddenScreen, urgentBox } from '../../web/src/phase5';
import { consentSheet } from '../../web/src/simple';
import { NOW, when } from './week';

const ROOT = join(__dirname, '..', '..');
const read = (f: string) => readFileSync(join(ROOT, f), 'utf8');
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
const ans = (q: string, label: string, d: number, t = '10:00', topic: DiaryEntry['topic'] = 'body') => answerEntry({ q, label, at: when(d, t) }, topic);
// (phase 12b: a calm day has six drinks; fewer is a line of its own)
const day = (d: number) => [logEntry('drank', when(d, '08:00')), logEntry('ate', when(d, '08:30')), logEntry('drank', when(d, '10:00')), logEntry('drank', when(d, '12:00')), logEntry('drank', when(d, '14:00')), logEntry('drank', when(d, '17:00')), logEntry('drank', when(d, '20:00'))];
const H = (h: Partial<HealthNotes>): HealthNotes => ({ ...NO_HEALTH, ...h });
const ids = (xs: { id: string }[]) => xs.map((x) => x.id);

describe('2a. "Something new or sudden?": a fixed card with a call button', () => {
  it('FAST, four more reasons to call, the big button twice, and what the list is and is not', () => {
    const html = suddenScreen({ number: '911' });
    const t = text(html);
    for (const k of ['Face', 'Arm', 'Speech', 'Time']) expect(t).toContain(k);
    expect(P5.sudden.fast).toHaveLength(4);
    expect(P5.sudden.also).toHaveLength(5);
    // (phase 8: BE-FAST's balance and sight)
    expect(t).toContain('Sudden loss of balance, or sudden loss of sight in one or both eyes.');
    expect(t).toContain('Chest pain, or trouble breathing.');
    expect(html.match(/href="tel:911"/g)).toHaveLength(2);
    expect(t).toContain('Call emergency services: 911');
    expect(t).toContain('911 in the US and Canada, 999 in the UK, 112 in the EU and India, 000 in Australia and 111 in New Zealand');
    // worst case: the carer sees none of the listed signs and waits. The card says to call anyway.
    expect(t).toContain('Not on this list, and you are still worried? Call.');
    // honest about itself: no AI, nothing sent, cannot tell what is wrong, not checked by a clinician
    expect(t).toMatch(/No AI wrote it, and nothing is sent\. The app cannot tell what is wrong\. No doctor or nurse has checked this wording\./);
    expect(t).not.toMatch(/\b(?:probably|unlikely|low risk|high risk|you have|they have a|diagnos)/i);
  });
  it('the number: what About them holds when it is a number, else 911; the button is a plain tel: link', () => {
    expect(DEFAULT_NUMBER).toBe('911');
    for (const bad of ['', '  ', 'abc', '1', 'call me', undefined, null, '12345678901234567890']) expect(emergencyNumber(bad)).toBe('911');
    expect(emergencyNumber('999')).toBe('999');
    expect(emergencyNumber(' 1 1 2 ')).toBe('112');
    expect(telHref('999')).toBe('tel:999');
    expect(telHref('javascript:alert(1)')).toBe('tel:911');
    expect(suddenScreen({ number: '999' })).toContain('href="tel:999"');
    expect(text(urgentBox('999'))).toContain('Call 999 now if this is new or sudden.');
  });
  it('the needs board has a ninth tile, "something\'s wrong", with a picture and a line for the carer', () => {
    const c = needsCard();
    expect(c.choices.map((x) => x.label)).toContain(WRONG_TILE);
    expect(c.choices.filter((x) => x.role === 'escape')).toHaveLength(1);
    expect(COPY.needs.lines[WRONG_TILE]).toMatch(/If you are not sure, call\./);
    expect(urgentAnswer(c.asked, WRONG_TILE)).toBe(true);
    expect(needEntry(WRONG_TILE, 1).topic).toBe('body');
    // the carer is led to the card when the phone comes back
    expect(read('web/src/main.ts')).toContain("state.picked?.label === WRONG_TILE) go('sudden')");
  });
  it('it is reachable from the first screen and from "Body & care", and no model or request is in it', () => {
    const main = read('web/src/main.ts');
    expect(main).toContain("bodyHtml: suddenLink('sudden-body'),");
    // (phase 12b: on the first screen with the number in it, and "Change it")
    expect(main).toContain('turnHtml: `${turnButton(name)}${suddenFirst(callNumber(), numberGuess())}');
    for (const f of ['core/redflag.ts', 'web/src/phase5.ts']) expect(read(f)).not.toMatch(/from '.*(?:engine|pipeline|prompt|requests|firebase)/);
    expect(read('core/redflag.ts')).not.toMatch(/^import /m);
  });
});

describe('2b. the boxed line: head, chest, breathing, a sudden weakness, pain rated quite or very bad', () => {
  it('every place of the head and of the chest on the body card', () => {
    for (const region of ['head', 'chest'] as const) {
      const c = bodyDetailCard(region, EMPTY_PROFILE);
      for (let p: Card | null | undefined = c; p; p = p.nextPage) for (const ch of p.choices.filter((x) => x.role === 'answer')) expect(urgentAnswer(p.asked, ch.label), `${p.asked} ${ch.label}`).toBe(true);
    }
    for (const region of BODY_REGIONS.filter((r) => r !== 'head' && r !== 'chest')) {
      const c = bodyDetailCard(region, EMPTY_PROFILE);
      for (const ch of c.choices.filter((x) => x.role === 'answer')) expect(urgentAnswer(c.asked, ch.label), `${c.asked} ${ch.label}`).toBe(false);
    }
  });
  it('"quite bad" and "very bad", wherever the pain is; "a little" and "not sure" keep the flow that was there', () => {
    expect(urgentAnswer('How bad is the pain?', 'quite bad')).toBe(true);
    expect(urgentAnswer('How bad is the pain?', 'very bad')).toBe(true);
    expect(urgentAnswer('How bad is the pain?', 'a little')).toBe(false);
    expect(urgentAnswer('How bad is the pain?', 'not sure')).toBe(false);
  });
  it('a yes to a typed question about breathing, weakness, numbness, the chest or a fall; the sign as the answer itself', () => {
    for (const q of ['Is it hard to breathe?', 'Is your arm weak?', 'Does your chest hurt?', 'Is your face numb?', 'Did you fall?', 'Do you feel dizzy?', 'Do you have a headache?']) {
      expect(urgentAnswer(q, 'yes'), q).toBe(true);
      expect(urgentAnswer(q, 'no'), q).toBe(false);
    }
    expect(urgentAnswer('Where does it hurt?', 'chest')).toBe(true);
    expect(urgentAnswer('Is it your head or your stomach?', 'head')).toBe(false); // no pain word in the question: the body card is the way
    expect(urgentAnswer('Is the pain in your head or your stomach?', 'head')).toBe(true);
  });
  it('worst case the other way: no everyday answer puts the box up, so it is not learned to be ignored', () => {
    const everyday = TOPIC_BASE.filter((t) => !['body', 'feel'].includes(t.id)).flatMap((t) => t.questions);
    for (const q of everyday) for (const l of ['yes', 'no', 'not sure', 'something else', 'tea', 'TV']) expect(urgentAnswer(q, l), `${q} ${l}`).toBe(false);
    // (phase 12: the one tree question that asks about a sign, "Is it suddenly weak or numb, yes or no?", is urgent on a yes by design)
    for (const q of TREE_QUESTIONS.filter((x) => x !== 'is it suddenly weak or numb yes or no')) expect(urgentAnswer(q, 'yes'), q).toBe(false);
  });
  it('one urgent answer keeps the box for the conversation and for the visit page; the existing pain flow stays under it', () => {
    expect(urgentAny([{ q: 'Are you in pain?', label: 'yes' }, { q: 'Where in the head?', label: 'top of head' }, { q: 'How bad is the pain?', label: 'a little' }])).toBe(true);
    expect(urgentAny([{ q: 'Are you in pain?', label: 'yes' }, { q: 'Where in the legs?', label: 'your left knee' }, { q: 'How bad is the pain?', label: 'a little' }])).toBe(false);
    const main = read('web/src/main.ts');
    expect(main).toContain('if (state.picked && urgentAnswer(c.asked, state.picked.label)) p5.urgent = true;');
    expect(main).toContain("leadHtml: `${p5.urgent || urgentAnswer(c.asked, p.label) ? urgentBox(callNumber(), 'urgent', numberGuess(), p5.signNow || signNow(c.asked, p.label)) : ''}${voiceFailedHtml()}${chipBlock(routeChip(c, aboutName()))}${lowMoodAnswer(c.asked, p.label) && !crisisAnswer(p.label) ? lowHelpLine(state.profile.personName.trim(), state.health.helpline ?? '', callNumber()) : ''}${turnHtml()}`,");
    expect(main).toContain("topHtml: `${p5.urgent && !c.blocked ? urgentBox(callNumber(), 'urgent', numberGuess(), p5.signNow) : ''}${voiceFailedHtml()}${chipBlock(routeChip(c, aboutName()))}`,");
    // the visit page of the nurse's walk: head, quite bad, at night
    const record = { startedAt: NOW, done: true, answers: [{ id: 'pain' as const, q: 'Are you in pain?', label: 'yes', at: NOW }, { id: 'where' as const, q: 'Where in the head?', label: 'top of head', at: NOW }, { id: 'bad' as const, q: 'How bad is the pain?', label: 'quite bad', at: NOW }] };
    const page = visitScreen({ name: 'Frank', record, copied: false, urgentHtml: urgentAny(record.answers) ? urgentBox('911', 'visit-urgent') : '' });
    expect(page.indexOf('id="visit-urgent"')).toBeGreaterThan(-1);
    expect(page.indexOf('id="visit-urgent"')).toBeLessThan(page.indexOf('id="visit-rows"'));
    expect(page.indexOf('id="visit-urgent"')).toBeGreaterThan(page.indexOf('id="visit-page"')); // inside the part that is printed
    expect(text(page)).toContain(P4.visit.safety);
  });
});

describe('2c. the answer check exempts every Body & care and Feelings answer', () => {
  it('by its words alone: every question of the two topics', () => {
    for (const t of TOPIC_BASE.filter((x) => ['body', 'feel'].includes(x.id))) for (const q of t.questions) expect(careAnswer(q), q).toBe(true);
  });
  it('the new words: headache, chest, breath, fall, dizzy, sick, numb, swallow', () => {
    for (const q of ['Do you have a headache?', 'Does your chest feel tight?', 'Are you short of breath?', 'Did you fall?', 'Are you dizzy?', 'Do you feel sick?', 'Is your hand numb?', 'Is it hard to swallow?']) expect(careAnswer(q), q).toBe(true);
    expect(careAnswer('Would you like tea or coffee?', 'tea')).toBe(false);
  });
  it('by its topic, whatever the words: and five yeses about the body in four minutes raise no flag', () => {
    expect(careAnswer('Is it this one?', 'yes', 'body')).toBe(true);
    expect(careAnswer('Is it this one?', 'yes', 'feel')).toBe(true);
    expect(careAnswer('Is it this one?', 'yes', 'food')).toBe(false);
    const run = (care: boolean) => Array.from({ length: 5 }, (_, i) => ({ q: 'Is it this one?', label: 'yes', at: NOW - (5 - i) * 50_000, pos: 0, of: 2, yn: true, ...(care ? { care: true } : {}) }));
    expect(reliability(tapsFrom(run(false)), NOW).flags).toContain('yes-run');
    expect(reliability(tapsFrom(run(true)), NOW).flags).toEqual([]);
    const pain = Array.from({ length: 5 }, (_, i) => ({ q: ['Are you in pain?', 'Does your chest hurt?', 'Are you dizzy?', 'Do you feel sick?', 'Is it hard to swallow?'][i], label: 'yes', at: NOW - (5 - i) * 50_000, pos: 0, of: 2, yn: true }));
    expect(reliability(tapsFrom(pain), NOW).flags).toEqual([]);
  });
});

describe('2d. what stands out', () => {
  it('one day with strong pain, or pain in the head or the chest, is a line: whom to tell, when to call, the call box', () => {
    const d = [...day(0), ...day(1), ans('How bad is the pain?', 'very bad', 1), ...day(2)];
    const xs = insights(d, NO_HEALTH, 'week', NOW);
    expect(ids(xs)).toEqual(['pain-day']);
    expect(xs[0]).toMatchObject({ level: 'call', urgent: true, text: 'Strong pain was chosen on Tue 17 Nov: very bad.', act: 'Tell the doctor or nurse. If it is new or sudden, call 911 now.' });
    const chest = insights([...day(0), ans('Where in the chest?', 'middle', 0)], NO_HEALTH, 'week', NOW, '999');
    expect(chest[0].text).toBe('Pain in the head or the chest was chosen on Mon 16 Nov: chest (middle).');
    expect(chest[0].act).toContain('call 999 now');
    // the screen: the fixed sentence and the box with the call button
    const html = insightsBlock({ span: 'week', lines: chest, words: null, source: 'rules', busy: false, note: '', cloud: null, number: '999' });
    expect(html).toContain('href="tel:999"');
    expect(text(html)).toContain('Call 999 now if this is new or sudden.');
    // worst case: "Nothing stands out" after such a day
    expect(ids(insights([...day(0), ans('How bad is the pain?', 'quite bad', 0)], NO_HEALTH, 'month', NOW))).not.toContain('nothing');
    // (phase 9: "a little" pain is a pain day, so it is a line of its own and "Nothing stands out" is not said)
    expect(ids(insights([...day(0), ans('How bad is the pain?', 'a little', 0)], NO_HEALTH, 'week', NOW))).toEqual(['pain-some']);
  });
  it('"no drink all day" no longer excuses itself; under a fluid limit low intake still shows, and never "more"', () => {
    const dry = [...day(0), logEntry('ate', when(1, '09:00')), ...day(2)];
    const t = insights(dry, NO_HEALTH, 'week', NOW)[0];
    expect(t).toMatchObject({ id: 'no-drink', level: 'tell' });
    expect(t.text).not.toMatch(/simply|nobody entered|may just|probably/i);
    const two = [...day(0), logEntry('drank', when(1, '09:00')), logEntry('drank', when(1, '13:00')), logEntry('ate', when(1, '13:30')), ...day(2)];
    expect(insights(two, NO_HEALTH, 'week', NOW)[0]).toMatchObject({ id: 'few-drinks', level: 'mention' });
    const lim = insights(two, H({ fluidLimit: true }), 'week', NOW)[0];
    expect(lim).toMatchObject({ id: 'few-drinks', level: 'mention', local: true });
    expect(lim.text).toMatch(/check the day against the doctor's plan/);
    expect(lim.text).not.toMatch(/more|offer|encourage/i);
  });
  it('low mood on three days is worth mentioning, with whom to talk to and when to call; fewer days are not counted away as "fine"', () => {
    const sad = (d: number) => ans('How are you feeling today?', d % 2 ? 'sad' : 'bad', d, '11:00', 'feel');
    const xs = insights([...day(0), sad(0), ...day(1), sad(1), ...day(3), sad(3)], NO_HEALTH, 'week', NOW);
    expect(ids(xs)).toEqual(['mood']);
    expect(xs[0]).toMatchObject({ level: 'mention', act: 'Talk to the GP or nurse about it. If they seem very low, or may harm themselves: call the doctor or nurse today, or a mental health helpline (you can put its number in About them, Health notes). If life is at risk, call 911 now.' });
    expect(xs[0].text).toBe('A low or worried mood was chosen on 3 days in the last 7 days: "sad", "low", "worried", "scared", "lonely", or something bothering them.');
    expect(JSON.stringify(xs)).not.toMatch(/depress|diagnos|screen/i);
  });
  it('a fall is a line; with a blow to the head noted, the call box stands under it', () => {
    const fall = logEntry('fall', when(1, '02:40'));
    const xs = insights([...day(0), ...day(1), fall], NO_HEALTH, 'week', NOW);
    expect(xs[0]).toMatchObject({ id: 'fall', level: 'mention', act: 'Tell the doctor or nurse about every fall.' });
    expect(xs[0].urgent).toBeUndefined();
    const head = insights([...day(0), ...day(1), { ...fall, label: FALL_HEAD }], NO_HEALTH, 'week', NOW);
    expect(head[0]).toMatchObject({ id: 'fall', urgent: true });
    expect(head[0].text).toContain('A fall with a blow to the head was logged on Tue 17 Nov.');
    // right after the tap: when to call, whatever was noted (the worst case is a fall nobody asked about)
    const box = fallBlock({ number: '911', id: fall.id, head: false });
    expect(text(box)).toContain('A fall: call 911 now if the head was hit, if getting up is not possible, or if there is new pain.');
    expect(box).toContain('href="tel:911"');
    expect(box).toContain('data-act="fall-head"');
    // "tablets taken" is a log line and nothing more
    expect(ids(insights([...day(0), logEntry('tablets', when(0, '08:05')), ...day(1)], NO_HEALTH, 'week', NOW))).toEqual(['nothing']);
    const screen = diaryScreen({ name: 'Frank', tab: 'today', topic: 'all', now: NOW, entries: [], any: false, logged: null, insights: null, tip: { tip: null, words: null, off: false }, copied: false, deleted: false });
    expect(screen).toContain('data-log="fall"');
    expect(text(screen)).toContain('Tablets taken');
  });
  it('the 30-day view keeps the lines of the last 7 days', () => {
    const sweet = (d: number, t: string) => answerEntry({ q: 'Would you like something sweet or something savoury?', label: 'something sweet', at: when(d, t) }, 'food');
    const d = [...day(0), sweet(0, '10:00'), ...day(1), sweet(1, '10:00'), ...day(2), sweet(2, '10:00')];
    expect(ids(insights(d, H({ diabetes: true }), 'week', NOW))).toEqual(['sweets']);
    const month = insights(d, H({ diabetes: true }), 'month', NOW);
    expect(ids(month)).toEqual(['sweets']);
    expect(month[0]).toMatchObject({ recent: true });
    expect(month[0].base.startsWith('From the last 7 days.')).toBe(true);
  });
  it('a line with a fixed "whom to tell" sentence is never handed to a model, online or on the device', () => {
    const d = [...day(0), ans('How bad is the pain?', 'very bad', 0), logEntry('fall', when(0, '03:00'))];
    const xs = insights(d, NO_HEALTH, 'week', NOW);
    expect(xs.every((x) => !!x.act)).toBe(true);
    expect(cloudLines(xs)).toEqual([]);
    expect(read('web/src/main.ts')).toContain('r.lines.map((w, i) => (lines[i].act ? null : w))');
  });
});

describe('2e. a reworded line is refused when it changes a number, whom to call, or how serious it sounds', () => {
  const SRC = ['No drink was chosen or logged on Wed 18 Nov. If that is right, and not a gap in the diary, tell the doctor or nurse today.', 'Few drinks were entered on Fri 20 Nov: 2.'];
  const json = (lines: string[]) => JSON.stringify({ lines });
  it('the same statement in plainer words passes', () => {
    expect(checkReworded(json(['On Wed 18 Nov no drink was written down. If that is true and not a gap, tell the doctor or nurse today.', 'On Fri 20 Nov, 2 drinks were written down.']), SRC)).not.toBeNull();
  });
  it.each([
    ['"doctor or nurse" left out', ['On Wed 18 Nov no drink was written down.', 'On Fri 20 Nov, 2 drinks were written down.']],
    ['"nurse" left out', ['On Wed 18 Nov no drink was written down. If that is true, tell the doctor today.', 'On Fri 20 Nov, 2 drinks.']],
    ['"call" brought in', ['On Wed 18 Nov no drink was written down. Tell the doctor or nurse today.', 'On Fri 20 Nov, 2 drinks. Call the doctor.']],
    ['an emergency brought in', ['On Wed 18 Nov no drink was written down. Tell the doctor or nurse today, or go to hospital.', 'On Fri 20 Nov, 2 drinks.']],
    ['"just"', ['On Wed 18 Nov no drink was written down. Tell the doctor or nurse today.', 'On Fri 20 Nov, just 2 drinks.']],
    ['"only"', ['On Wed 18 Nov no drink was written down. Tell the doctor or nurse today.', 'On Fri 20 Nov only 2 drinks.']],
    ['"fine"', ['On Wed 18 Nov no drink was written down. Tell the doctor or nurse today.', 'On Fri 20 Nov, 2 drinks, which is fine.']],
    ['"nothing to worry"', ['On Wed 18 Nov no drink was written down, nothing to worry about. Tell the doctor or nurse today.', 'On Fri 20 Nov, 2 drinks.']],
    ['"probably"', ['On Wed 18 Nov no drink was written down, probably a gap. Tell the doctor or nurse today.', 'On Fri 20 Nov, 2 drinks.']],
    ['a number added', ['On Wed 18 Nov no drink was written down in 24 hours. Tell the doctor or nurse today.', 'On Fri 20 Nov, 2 drinks.']],
    ['a number removed', ['On Wed 18 Nov no drink was written down. Tell the doctor or nurse today.', 'On Fri 20 Nov, few drinks.']],
  ])('refused, so the rules\' text stands: %s', (_n, lines) => {
    expect(checkReworded(json(lines), SRC)).toBeNull();
  });
  it('a word of the source is not held against the model; and the model is told not to change how serious a line sounds', () => {
    expect(checkReworded(json(['Call the nurse: it is only one day.']), ['Only one day so far. Call the nurse.'])).toEqual(['Call the nurse: it is only one day.']);
    expect(REWORD_SYSTEM_PROMPT).toContain('Do not make anything sound less serious or more serious than it is written.');
    expect(REWORD_SYSTEM_PROMPT).not.toMatch(/warmer/);
  });
});

describe('3. Read aloud: Gemini text-to-speech through Firebase AI Logic, after a sheet, off by default', () => {
  const card = needsCard();
  it('what is spoken is the question and the choices of the card, and the request holds that, the voice and the style', () => {
    const t = speakText({ ...card, asked: 'Would you like tea or coffee?', choices: [{ label: 'tea', spoken: 'tea', role: 'answer', picture: null }, { label: 'coffee', spoken: 'coffee', role: 'answer', picture: null }, { label: 'something else', spoken: 'something else', role: 'escape', picture: null }] } as unknown as Card);
    expect(t).toBe('Would you like tea or coffee? Tea. Coffee. Or something else.');
    const r = speakRequest(t);
    expect(r).toEqual({ model: TTS_MODEL, mode: 'ONLY_IN_CLOUD', contents: [{ role: 'user', parts: [{ text: t, speechMetadata: { style: 'calm, slow and clear' } }] }], generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } } } });
    expect(JSON.stringify(r)).not.toMatch(/systemInstruction|About|profile/);
    expect(TTS_MODEL).toBe('gemini-3.8-flash-tts');
  });
  it('the sheet says the brief\'s sentence, shows the words of this card and the whole request, and the yes comes after them', () => {
    const html = speakSheet({ text: 'Would you like to call Beth? Yes. No. Or not sure.', request: '{"model":"gemini-3.8-flash-tts"}' });
    expect(text(html)).toContain('The words on this card, including names on it, go to Google to be spoken. Nothing else.');
    expect(html).toContain('Would you like to call Beth? Yes. No. Or not sure.');
    expect(html.indexOf('id="speak-sheet-text"')).toBeLessThan(html.indexOf('data-act="speak-yes"'));
    expect(text(html)).toContain(COPY.consent.sheet.data);
    expect(html).toContain('gemini-3.8-flash-tts');
  });
  it('off by default; the switch says where the words go when it is on; offline it is not offered', () => {
    const off = speakSwitch({ name: 'Frank', on: false, online: true, can: true });
    expect(off).toContain('data-act="speak-ask"');
    expect(text(off)).toContain("Off. Turn it on, and the question and the choices are read out on Frank's screen.");
    const on = speakSwitch({ name: 'Frank', on: true, online: true, can: true });
    expect(text(on)).toContain('On. The words on each card you show go to Google to be spoken.');
    expect(on).toContain('data-act="speak-off"');
    expect(speakSwitch({ name: '', on: false, online: false, can: true })).toBe('');
    const main = read('web/src/main.ts');
    expect(main).toContain("settings: { cloudHelp: false, support: 'more', welcomed: false }");
    expect(main).toContain("case 'speak-yes': p5.speakSheet = false; state.settings.speak = true; state.settings.speakOk = true;");
    expect(main).toContain("case 'speak-ask': if (state.settings.speakOk) { state.settings.speak = true; saveSettings(); } else p5.speakSheet = true;");
    // the one place a card's words are handed to the speech step, behind the switch and the "never a visit card" rule
    expect(main.match(/engine\.speak\(/g)).toHaveLength(1);
    expect(main).toContain('if (!speakOn() || !speakable(c) || !state.engine.speak) return;');
    expect(main).toContain("const speakOn = () => canSpeak() && !!state.settings.speak;");
  });
  it('never a doctor-visit card (that page says nothing of it is sent), never a card with no choices', async () => {
    for (const v of VISIT.filter((x) => x.pages)) expect(speakable(await visitCard(v, EMPTY_PROFILE, 'more'))).toBe(false);
    expect(speakable(card)).toBe(true);
    expect(speakable(null)).toBe(false);
    expect(speakable({ ...card, blocked: 'no card' } as Card)).toBe(false);
  });
  it('a card whose words were sent never says "Nothing was sent", and the session line counts it', () => {
    const main = read('web/src/main.ts');
    expect(main).toContain("return w.left === 'nothing' ? { ...w, left: 'sent' as const, lines: [w.lines[0], P5.speak.made, ...w.lines.slice(2)] }");
    expect(main).toContain('.concat(p5.speakSent ? [P5.speak.sent(p5.speakSent)] : [])');
    expect(P5.speak.made).toBe('Read aloud is on: the words on this card went to Google to be spoken.');
    expect(P5.speak.sent(2)).toBe('The words of 2 cards went to Google to be spoken (Read aloud).');
  });
  it('the engine: ONLY_IN_CLOUD on the app with App Check, the SDK\'s own speech config, the source from the SDK\'s report', () => {
    const src = read('web/src/ai/firebaseEngine.ts');
    const fn = src.slice(src.indexOf('async speak(text: string)'), src.indexOf('/**\n * Lazy wrapper'));
    expect(fn).toContain('getGenerativeModel(this.ai, {');
    expect(fn).toContain('mode: InferenceMode.ONLY_IN_CLOUD,');
    expect(fn).toContain('responseModalities: [ResponseModality.AUDIO]');
    expect(fn).toContain("r.response.inferenceSource === InferenceSource.ON_DEVICE ? 'on-device' : 'in-cloud'");
    expect(fn).not.toMatch(/this\.local|systemInstruction|fetch\(|speechSynthesis/);
    expect(read('web/src/main.ts')).not.toMatch(/speechSynthesis|SpeechSynthesisUtterance|webkitSpeechRecognition/);
  });
  it('the sound: a WAV header in front of the model\'s PCM, the rate read from its type; a kept sound is not asked for twice', () => {
    expect(pcmRate('audio/L16;codec=pcm;rate=24000')).toBe(24000);
    expect(pcmRate('audio/L16')).toBe(24000);
    const wav = pcmToWav(new Uint8Array([1, 2, 3, 4]), 24000);
    expect(wav).toHaveLength(48);
    expect(String.fromCharCode(...wav.slice(0, 4))).toBe('RIFF');
    expect(new DataView(wav.buffer).getUint32(24, true)).toBe(24000);
    const cache = new SpeakCache<string>(2);
    cache.set('a', '1'); cache.set('b', '2'); cache.set('c', '3');
    expect([cache.has('a'), cache.get('b'), cache.get('c'), cache.size]).toEqual([false, '2', '3', 2]);
  });
  it('the button on the person\'s screen is a control, not a fourth choice', () => {
    expect(hearButton('ready')).toContain('data-hear="1"');
    expect(hearButton('ready')).not.toContain('class="pt');
    // (phase 8, judge round 7: nothing on the person's screen asks them to speak; the carer's screen says what to do)
    expect(text(hearButton('failed'))).toBe('No sound');
    expect(hearButton('failed')).toContain('disabled');
    expect(hearButton('failed')).not.toMatch(/say it|yourself|out loud/i);
    expect(P5.speak.failed('Frank')).toBe('Read aloud did not work for that card. Read the question out loud to Frank.');
    expect(P5.speak.failed('')).toBe('Read aloud did not work for that card. Read the question out loud to them.');
  });
});

describe('6. consent sheets: one plain name, and the first yes is "Just this once"', () => {
  it('on every sheet that leads to online help', () => {
    const sheets = [
      consentSheet({ about: 'About Frank', line: 'Partner asks: What shall we do?', deviceThere: false }),
      consentSheet({ about: 'About Frank', line: 'x', deviceThere: false, narrow: { request: '{}' } }),
      letterSheet({ line: 'x', request: '{}' }),
      insightSheet({ text: '1. x', request: '{}' }),
    ];
    for (const html of sheets) {
      const first = html.slice(html.indexOf('<div class="choice">'));
      expect(text(first).startsWith('Just this once')).toBe(true);
      expect(text(html)).toMatch(/[Oo]nline help/);
      expect(text(html.split('<details')[0])).not.toMatch(/Firebase AI Logic|Gemini|PREFER_IN_CLOUD/);
    }
    expect(sheets[0]).toContain('data-act="sheet-always"');
    expect(text(sheets[0])).toContain("Google's Gemini API, through Firebase AI Logic. On the paid tier Google does not use prompts to improve its products (Google's terms).");
  });
});

describe('7. "Since the last visit": the diary\'s counts and up to three fixed questions, apart from the person\'s own answers', () => {
  const diary = [...day(0), ans('Are you in pain?', 'yes', 0), ...day(1), logEntry('fall', when(1, '02:40')), logEntry('ate', when(2, '09:00')), ans('How are you feeling today?', 'sad', 2, '11:00', 'feel'), ans('How did you sleep?', 'bad', 3, '08:00', 'rest'), ...day(3)];
  it('pain days, falls, days with no drink entered, low days, bad nights: each with its days, nothing interpreted', () => {
    const s = sinceLines(diary, when(0, '00:00'), NOW);
    expect(s.lines).toEqual([
      'Pain: chosen or logged on 1 day (Mon 16 Nov).',
      'Falls: 1 logged (Tue 17 Nov).',
      'Drinks: on 1 of 4 days with entries, no drink was entered.',
      // (phase 9: the toilet and the tablets, as entered)
      'Toilet: none entered. That can be a gap: ask the family.',
      'Tablets taken: none logged. That can mean nobody tapped it.',
      'Mood: low or worried on 1 day (Wed 18 Nov).',
      'Sleep: a bad night on 1 day (Thu 19 Nov).',
    ]);
    expect(s.urgent).toBe(false);
    expect(sinceLines([...diary, ans('How bad is the pain?', 'very bad', 3)], when(0, '00:00'), NOW)).toMatchObject({ urgent: true });
    expect(sinceLines([], null, NOW)).toMatchObject({ any: false, lines: ['The diary holds nothing for this time.'] });
    expect(s.lines.join(' ')).not.toMatch(/should|must|dehydrat|depress|risk|normal|fine/i);
  });
  it('three questions at most, only from the fixed list', () => {
    const Q = P5.since.questions;
    expect(SINCE_QUESTIONS).toBe(3);
    let p: string[] = [];
    for (const q of [Q[4], Q[0], Q[2], Q[7]]) p = toggleQuestion(p, q);
    expect(p).toEqual([Q[0], Q[2], Q[4]]);
    expect(toggleQuestion(p, Q[2])).toEqual([Q[0], Q[4]]);
    expect(pickedQuestions(['Is it cancer?', Q[1], 5, null])).toEqual([Q[1]]);
    expect(Q.join(' ')).not.toMatch(/\b(?:mg|dose|diagnos|stroke|dement)/i);
  });
  it('on the page it stands under the person\'s answers, says whose lines these are, and is in the copied text', () => {
    const s = sinceLines(diary, when(0, '00:00'), NOW);
    const m = { name: 'Frank', since: s, picked: [P5.since.questions[0]], number: '911' };
    const record = { startedAt: NOW, done: true, answers: [{ id: 'pain' as const, q: 'Are you in pain?', label: 'no', at: NOW }] };
    const page = visitScreen({ name: 'Frank', record, copied: false, sinceHtml: sinceBlock(m), controlsHtml: sinceControls(m) });
    expect(page.indexOf('id="visit-foot"')).toBeLessThan(page.indexOf('id="since"'));
    expect(page.indexOf('id="since"')).toBeLessThan(page.indexOf('class="no-print stack"'));
    expect(page.indexOf('id="since-controls"')).toBeGreaterThan(page.indexOf('class="no-print stack"'));
    expect(text(page)).toContain("What the family entered in the diary. These lines are not Frank's own answers, except where a line says it counts one.");
    expect(text(page)).toContain('Counted by fixed rules on this device, from the diary. No AI, nothing sent. Not a medical record.');
    expect(page.match(/data-since-q=/g)).toHaveLength(P5.since.questions.length);
    expect(sinceText(s, m.picked, 'Frank')).toContain('The family wants to ask:\n- What should we watch for at home?');
    // no file that builds a prompt or a request imports the module, and it imports no engine
    expect(read('core/since.ts')).not.toMatch(/from '.\/(?:engine|pipeline|prompt|requests|reword)'/);
    for (const f of ['core/pipeline.ts', 'core/prompt.ts', 'core/requests.ts', 'core/reword.ts', 'core/narrow.ts', 'core/letter.ts', 'web/src/ai/firebaseEngine.ts']) expect(read(f)).not.toMatch(/from '[^']*(?:since|redflag)'/);
  });
});
