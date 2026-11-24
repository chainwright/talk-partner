// Phase 13 (23 Nov 2026), the fixes of judge round 10. Every new or changed line is walked on its worst case: can it
// help a carer wait, play down pain, a stroke sign or distress, or lose a question that is not found out yet? Each item
// has a test that failed before its fix.
import { describe, expect, it } from 'vitest';
import { after, WEAK_NUMB } from '../../core/tree';
import { EMPTY_PROFILE } from '../../core/types';
import { answeredScreen, type AnsweredModel } from '../../web/src/simple';

const card = (asked: string) => ({ asked, kind: 'choice' as const });
const made = { maker: 'code' as const, left: 'nothing' as const, spoken: false, lines: ["Made by the app's rules.", 'Nothing was sent.'] };
const answered = (m: Partial<AnsweredModel>) => answeredScreen({ name: '', label: 'no', question: WEAK_NUMB, more: false, out: false, afterHtml: '', next: null, follow: [], end: '', tryNext: null, narrow: null, narrowLast: false, short: null, who: false, invite: false, hasAnswers: false, today: [], made, privacy: [], ...m } as AnsweredModel);

describe('A1. After a "no" or "not sure" to the weakness question, the check line is a red box ABOVE "Next"', () => {
  for (const label of ['no', 'not sure']) {
    it(`"${label}": the tree marks the end line as an alert, with the arms-and-smile check and the number`, () => {
      const s = after(card(WEAK_NUMB), label, { ...EMPTY_PROFILE, personName: 'Frank' }, [WEAK_NUMB], '999');
      expect(s.alert, label).toBe(true);
      expect(s.end, label).toMatch(/lift both arms and smile/);
      expect(s.end, label).toMatch(/call 999 now/);
      expect(s.end, label).not.toMatch(/the emergency number/);
      // the pain questions still follow
      expect(s.next, label).toEqual(['How bad is the pain?']);
    });
    it(`"${label}": at the depth limit (no next question) it is still an alert`, () => {
      const s = after(card(WEAK_NUMB), label, EMPTY_PROFILE, ['Are you in pain?', 'Where in the arms?', WEAK_NUMB], '911');
      expect(s.next).toEqual([]);
      expect(s.alert).toBe(true);
    });
  }
  it('a "yes" is not this alert (its own call box says call now)', () => {
    expect(after(card(WEAK_NUMB), 'yes', EMPTY_PROFILE, [WEAK_NUMB], '911').alert).toBeFalsy();
  });
  it('an ordinary answer is never an alert', () => {
    expect(after(card('Would you like tea or coffee?'), 'tea', EMPTY_PROFILE, []).alert).toBeFalsy();
  });
  it('the answered screen draws the alert before "Next", and no green tick over it', () => {
    const s = after(card(WEAK_NUMB), 'no', EMPTY_PROFILE, [WEAK_NUMB], '911');
    const html = answered({ follow: s.next, end: s.end, alertHtml: `<div class="urgent now-alert" id="now-alert">${s.end}</div>` });
    const a = html.indexOf('id="now-alert"');
    const n = html.indexOf('id="next-q"');
    expect(a).toBeGreaterThan(-1);
    expect(n).toBeGreaterThan(-1);
    expect(a).toBeLessThan(n);
    expect(html).toContain('lift both arms and smile');
    // the "chose" block is an alert, not a tick
    expect(html).toMatch(/class="chose alert"/);
    // the line is not drawn a second time as the green "Now:" line
    expect(html).not.toContain('id="do-now"');
  });
  it('with no alert, a led screen still hides the end line (unchanged)', () => {
    const html = answered({ label: 'tea', question: 'Would you like tea or coffee?', follow: ['Would you like milk in it?'], end: 'Make the tea the way they like it.' });
    expect(html).not.toContain('id="do-now"');
    expect(html).not.toContain('now-alert');
  });
});

describe('A2. Chest or head pain, or a breathing / weak / numb yes in the conversation: every "how bad" end calls now', () => {
  const HOW = 'How bad is the pain?';
  const LEVELS = ['a little', 'quite bad', 'very bad', 'not sure'];
  it('the conversation knows where the red flag is (core/redflag.ts, redPlace)', async () => {
    const { redPlace } = await import('../../core/redflag');
    expect(redPlace('Where in the chest?', 'middle')).toBe('chest');
    expect(redPlace('Where in the chest?', 'left side')).toBe('chest');
    expect(redPlace('Where in the head?', 'top of head')).toBe('head');
    expect(redPlace('Where in the head?', 'face')).toBe('head');
    expect(redPlace('Where does it hurt?', 'chest')).toBe('chest');
    expect(redPlace('Where does it hurt?', 'a headache')).toBe('head');
    expect(redPlace('Is it suddenly weak or numb, yes or no?', 'yes')).toBe('sign');
    expect(redPlace('Is it hard to breathe?', 'yes')).toBe('sign');
    // not a red flag
    expect(redPlace('Where in the chest?', 'somewhere else')).toBeNull();
    expect(redPlace('Where in the arms?', 'left arm')).toBeNull();
    expect(redPlace('Is it suddenly weak or numb, yes or no?', 'no')).toBeNull();
    expect(redPlace('Is it hard to breathe?', 'no')).toBeNull();
    expect(redPlace('Would you like tea or coffee?', 'tea')).toBeNull();
  });
  for (const red of ['chest', 'head', 'sign'] as const) {
    for (const label of LEVELS) {
      it(`${red}, "${label}": never "Ask again in an hour", never only the nurse or doctor: call now, an alert`, () => {
        const s = after(card(HOW), label, { ...EMPTY_PROFILE, personName: 'Frank' }, ['Are you in pain?', 'Where in the chest?', HOW], '999', red);
        expect(s.end, `${red} ${label}`).not.toMatch(/ask again in an hour/i);
        expect(s.end, `${red} ${label}`).not.toMatch(/^(?:A little|Quite bad|Very bad)\. Call Frank's nurse or doctor now/);
        expect(s.end, `${red} ${label}`).toMatch(/call 999 now/);
        expect(s.end, `${red} ${label}`).toMatch(/Do not wait to see if it passes/);
        expect(s.end, `${red} ${label}`).toMatch(/Note the time it started/);
        expect(s.alert, `${red} ${label}`).toBe(true);
      });
    }
  }
  it('the words of the chest line are the nurse seat\'s: "whatever the amount"', () => {
    expect(after(card(HOW), 'a little', EMPTY_PROFILE, [], '911', 'chest').end).toBe('Pain in the chest: call 911 now, whatever the amount. Do not wait to see if it passes. Note the time it started.');
    expect(after(card(HOW), 'a little', EMPTY_PROFILE, [], '911', 'head').end).toBe('Pain in the head: call 911 now, whatever the amount. Do not wait to see if it passes. Note the time it started.');
  });
  it('an arm or a leg (no red flag): the older lines stand, and they are not alerts', () => {
    const s = after(card(HOW), 'a little', EMPTY_PROFILE, [], '911', null);
    expect(s.end).toMatch(/^A little pain\. Ask again in an hour/);
    expect(s.alert).toBeFalsy();
  });
  it('the body card\'s second step for the chest or the head: the call line is an alert above "Next: How bad is the pain?"', () => {
    for (const [region, label] of [['chest', 'middle'], ['chest', 'left side'], ['head', 'top of head'], ['head', 'face'], ['head', 'neck']] as const) {
      const s = after({ asked: `Where in the ${region}?`, kind: 'body', bodyStep: 2 }, label, EMPTY_PROFILE, ['Are you in pain?'], '911');
      expect(s.end, `${region} ${label}`).toMatch(/call 911 now, whatever the amount/);
      expect(s.end, `${region} ${label}`).not.toMatch(/ask how bad it is\.$/);
      expect(s.alert, `${region} ${label}`).toBe(true);
    }
    // the stomach: unchanged, no alert
    const st = after({ asked: 'Where in the stomach?', kind: 'body', bodyStep: 2 }, 'upper stomach', EMPTY_PROFILE, ['Are you in pain?'], '911');
    expect(st.alert).toBeFalsy();
  });
  it('the person\'s screen: the red flag of the conversation is kept and reset with the call box (web/src/main.ts)', async () => {
    const { readFileSync } = await import('node:fs');
    const main = readFileSync('web/src/main.ts', 'utf8');
    expect(main).toContain('const r = redPlace(c.asked, state.picked.label); if (r && !p5.red) p5.red = r;');
    expect(main.match(/p5\.signNow = false;/g)?.length).toBe(main.match(/p5\.signNow = false; p5\.red = null;/g)?.length);
  });
});

describe('A2b. Under the chest line the call is the main button; "Ask another question" is below it, not primary', () => {
  it('the answered screen', () => {
    const s = after(card('How bad is the pain?'), 'a little', EMPTY_PROFILE, [], '911', 'chest');
    const html = answered({ label: 'a little', question: 'How bad is the pain?', follow: s.next, end: s.end, alertHtml: '<div class="urgent now-alert" id="now-alert"><a class="btn call" href="tel:911">Call 911</a></div>' });
    expect(html).toMatch(/<button type="button" class="btn" id="another"/);
    expect(html.indexOf('id="now-alert"')).toBeLessThan(html.indexOf('id="another"'));
  });
});

describe('A3. Before a doctor visit: an answer that can be urgent stops the run and shows the call box', () => {
  const at = Date.UTC(2026, 10, 23, 17, 0);
  const A = (id: string, q: string, label: string) => ({ id, q, label, at }) as never;
  it('core/visit.ts: which answer stops the run (the rules of core/redflag.ts, urgentAnswer), once per run', async () => {
    const { visitStops } = await import('../../core/visit');
    expect(visitStops({ startedAt: at, done: false, answers: [A('pain', 'Are you in pain?', 'yes'), A('where', 'Where in the head?', 'head, top of head')] })).toBe(true);
    expect(visitStops({ startedAt: at, done: false, answers: [A('pain', 'Are you in pain?', 'yes'), A('where', 'Where in the legs?', 'legs, left leg'), A('bad', 'How bad is the pain?', 'very bad')] })).toBe(true);
    expect(visitStops({ startedAt: at, done: false, answers: [A('pain', 'Are you in pain?', 'yes'), A('where', 'Where in the legs?', 'legs, left leg'), A('bad', 'How bad is the pain?', 'a little')] })).toBe(false);
    expect(visitStops({ startedAt: at, done: false, answers: [A('pain', 'Are you in pain?', 'no'), A('sleep', 'How have you been sleeping?', 'badly')] })).toBe(false);
    // after "Go on with the questions" the run is not stopped a second time
    expect(visitStops({ startedAt: at, done: false, wentOn: true, answers: [A('pain', 'Are you in pain?', 'yes'), A('where', 'Where in the head?', 'head, top of head'), A('bad', 'How bad is the pain?', 'very bad')] })).toBe(false);
  });
  it('the carer\'s box names what was answered, the number to call, and "Go on with the questions"', async () => {
    const { visitAlert } = await import('../../core/visit');
    expect(visitAlert([A('pain', 'Are you in pain?', 'yes'), A('where', 'Where in the head?', 'head, top of head'), A('bad', 'How bad is the pain?', 'very bad')], '999')).toBe('Very bad pain in the head (top of head): call 999 now if it is new or sudden.');
    expect(visitAlert([A('pain', 'Are you in pain?', 'yes'), A('where', 'Where in the chest?', 'chest, middle')], '911')).toBe('Pain in the chest (middle): call 911 now if it is new or sudden.');
    expect(visitAlert([A('pain', 'Are you in pain?', 'yes'), A('where', 'Where in the legs?', 'legs, left leg'), A('bad', 'How bad is the pain?', 'quite bad')], '911')).toBe('Quite bad pain (legs, left leg): call 911 now if it is new or sudden.');
    const { visitStopBox } = await import('../../web/src/phase4');
    const box = visitStopBox('Very bad pain in the head (top of head): call 999 now if it is new or sudden.', '999');
    expect(box).toContain('href="tel:999"');
    expect(box).toContain('data-act="visit-resume"');
    expect(box).toContain('Go on with the questions');
    expect(box).toContain('role="alert"');
  });
  it('web/src/main.ts: the confirmed answer that stops the run ends the person\'s questions with "Thank you. Give the phone back"', async () => {
    const { readFileSync } = await import('node:fs');
    const main = readFileSync('web/src/main.ts', 'utf8');
    expect(main).toContain('if (visitStops(state.p4.visit)) { state.p4.visit.stopped = true; void kvSet(\'visit\', state.p4.visit); state.picked = null; makeSeq++; resetCard(); state.p4.visitRun = false; state.p4.visitEnd = true; render(); return true; }');
  });
});

describe('A4. A confirmed worried / scared / anxious / lonely, a "worry", or a yes to "something bothering you" counts as a low or worried mood', () => {
  it('core/diary.ts, lowMood: every one of them, on the questions where they are given', async () => {
    const { lowMood } = await import('../../core/diary');
    for (const [q, l] of [
      ['Is it good news, or a worry?', 'worry'],
      ['Is it good news, or a worry?', 'a worry'],
      ['How are you feeling today?', 'worried'],
      ['How are you feeling today?', 'scared'],
      ['How are you feeling today?', 'anxious'],
      ['How are you feeling today?', 'lonely'],
      ['How do you feel?', 'worried'],
      ['Is something bothering you?', 'yes'],
      ['Is anything worrying you?', 'yes'],
      ['What worries you most?', 'my body'],
    ]) expect(lowMood(q, l), `${q} ${l}`).toBe(true);
    expect(lowMood('Is it good news, or a worry?', 'good news')).toBe(false);
    expect(lowMood('Is something bothering you?', 'no')).toBe(false);
  });
  it('the visit page: never "no low or worried answer entered" after a confirmed "worry"', async () => {
    const { sinceLines } = await import('../../core/since');
    const { answerEntry } = await import('../../core/diary');
    const now = new Date(2026, 10, 23, 18).getTime();
    const diary = [{ ...answerEntry({ q: 'Is it good news, or a worry?', label: 'worry', at: now - 3600000 }, 'other'), id: 'w1' }];
    const s = sinceLines(diary as never, null, now);
    const mood = s.lines.find((l) => l.startsWith('Mood:'))!;
    expect(mood).toMatch(/^Mood: low or worried on 1 day/);
    expect(s.lines.join(' ')).not.toContain('no low or worried answer entered');
  });
});

describe('A5. "Left for later" goes only with "Did you find out? Yes" or a confirmed answer to that question, never with "Ask it again"', () => {
  const at = new Date(2026, 10, 23, 17).getTime();
  it('core/later.ts: a confirmed answer to the question takes it off; a way out, another question, or "Ask it again" does not', async () => {
    const { addLater, answeredLater, askAgainLater } = await import('../../core/later');
    const xs = addLater(addLater([], 'Are you in pain?', at), 'Would you like tea or coffee?', at + 1);
    expect(askAgainLater(xs, xs[0])).toEqual(xs);
    expect(answeredLater(xs, 'Are you in pain?', 'answer').map((x) => x.q)).toEqual(['Would you like tea or coffee?']);
    expect(answeredLater(xs, 'are you in pain', 'answer').map((x) => x.q)).toEqual(['Would you like tea or coffee?']);
    expect(answeredLater(xs, 'Are you in pain?', 'escape')).toEqual(xs);
    expect(answeredLater(xs, 'Are you in pain?', 'repair')).toEqual(xs);
    expect(answeredLater(xs, 'Where does it hurt?', 'answer')).toEqual(xs);
  });
  it('"change topic" over a pain question keeps it for later, and the carer\'s line says so', async () => {
    const { laterOf, repairLine: line } = await import('../../core/later');
    const { COPY } = await import('../../core/copy');
    const repairLine = (l: string, b: string) => line(l, b, COPY.repair);
    expect(laterOf({ asked: "Let's try another way.", label: 'change topic', repair: true, before: 'Are you in pain?' })).toBe('Are you in pain?');
    expect(laterOf({ asked: "Let's try another way.", label: 'change topic', repair: true, before: 'Would you like tea or coffee?' })).toBeNull();
    expect(repairLine('change topic', 'Are you in pain?')).toBe('Say: "Let\'s leave it for now." The pain is not found out yet: it stays on Home under "Left for later".');
    expect(repairLine('change topic', 'Would you like tea or coffee?')).toBe('Say: "Let\'s leave it." Start a new topic, one idea at a time.');
    expect(repairLine('later', 'Are you in pain?')).toBe('Say: "Later, then. We will come back to it." And come back.');
  });
  it('web/src/main.ts: "Ask it again" no longer takes the question off Home; a confirmed answer does', async () => {
    const { readFileSync } = await import('node:fs');
    const main = readFileSync('web/src/main.ts', 'utf8');
    expect(main).not.toContain("p8later.list = a === 'later-ask' ? p8later.list.filter((y) => y !== x)");
    expect(main).toContain('p8later.list = answeredLater(p8later.list, c.asked, state.picked.role); saveLater();');
  });
});

describe('A6. The crisis line: the family\'s own first, else by the emergency number the family set; never "today" after "may harm themselves"', () => {
  it('core/redflag.ts, crisisLineFor', async () => {
    const { crisisLineFor } = await import('../../core/redflag');
    expect(crisisLineFor('0800 123 456', '999')).toBe('0800 123 456');
    expect(crisisLineFor('', '999')).toBe('116 123');
    expect(crisisLineFor('', '000')).toBe('13 11 14');
    expect(crisisLineFor('', '911')).toBe('988');
    expect(crisisLineFor('', '111')).toBe('1737');
    // 112 (the EU and others) and a number we do not know: the emergency number itself, no line made up
    expect(crisisLineFor('', '112')).toBe('112');
    expect(crisisLineFor('', '119')).toBe('119');
    expect(crisisLineFor('  ', '+44 7700 900000')).toBe('+44 7700 900000');
  });
  it('the line under a low answer: harm means stay and call the emergency number now; "today" is only for very low', async () => {
    const { P5 } = await import('../../core/copy5');
    const t = P5.lowHelp('Frank', '116 123', '999');
    expect(t).toBe('If Frank may harm themselves: stay with Frank and call 999 now. If Frank seems very low: call 116 123 (a crisis line) or the doctor or nurse today.');
    expect(t).not.toMatch(/harm themselves[^.]*today/);
    const none = P5.lowHelp('', '', '112');
    expect(none).toMatch(/^If they may harm themselves: stay with them and call 112 now\./);
    expect(none).not.toMatch(/harm themselves[^.]*today/);
    expect(P5.insights.moodAct('999', '116 123')).not.toMatch(/harm themselves[^.]*today/);
  });
  it('the line under a low answer carries the two call buttons (the crisis line only when it is not the emergency number)', async () => {
    const { lowHelpLine } = await import('../../web/src/phase5');
    expect(lowHelpLine('Frank', '116 123', '999')).toContain('href="tel:999"');
    expect(lowHelpLine('Frank', '116 123', '999')).toContain('href="tel:116123"');
    const one = lowHelpLine('', '112', '112');
    expect(one.match(/href="tel:/g)?.length).toBe(1);
  });
  it('web/src/main.ts: the crisis line comes from About them, else the emergency number, never from the browser\'s language', async () => {
    const { readFileSync } = await import('node:fs');
    const main = readFileSync('web/src/main.ts', 'utf8');
    expect(main).toContain("const crisisLineNow = () => crisisLineFor(state.health.helpline ?? '', callNumber());");
    expect(main).not.toContain('crisisLine(navigator.language)');
  });
});

describe('A7. "For the next carer", "What stands out" and the visit page carry every stroke sign and "something\'s wrong"', () => {
  const now = new Date(2026, 10, 23, 18, 0).getTime();
  const W = 'Is it suddenly weak or numb, yes or no?';
  it('core/diary.ts: a yes or "not sure" to the weakness question is a sign; the board\'s "something\'s wrong" is a "wrong"', async () => {
    const { tags, answerEntry, needEntry } = await import('../../core/diary');
    expect(tags(answerEntry({ q: W, label: 'yes', at: now }))).toContain('sign');
    expect(tags(answerEntry({ q: W, label: 'not sure', at: now }))).toContain('sign');
    expect(tags(answerEntry({ q: W, label: 'no', at: now }))).not.toContain('sign');
    expect(tags(needEntry("something's wrong", now))).toContain('wrong');
  });
  it('the handover note: both at the top, with when and what to do, and the call sentence', async () => {
    const { handoverText } = await import('../../core/share');
    const { answerEntry, needEntry } = await import('../../core/diary');
    const diary = [
      { ...answerEntry({ q: W, label: 'yes', at: now - 47 * 60000 }), id: 's1' },
      { ...answerEntry({ q: W, label: 'not sure', at: now - 40 * 60000 }), id: 's2' },
      { ...needEntry("something's wrong", now - 13 * 60000), id: 'w1' },
    ];
    const t = handoverText({ diary, health: null, learned: [], name: 'Rose', now, number: '999' });
    const lines = t.split('\n');
    expect(lines[1]).toMatch(/^Call 999 now if this is new or sudden/);
    const sign = lines.find((l) => l.startsWith('Sudden weakness or numbness:'))!;
    expect(sign).toContain('"yes" (Mon 17:13)');
    expect(sign).toContain('"not sure" (Mon 17:20)');
    expect(sign).toContain('If 999 was not called, call now. Tell the doctor today.');
    expect(sign).toContain('check both arms and the smile now');
    const wrong = lines.find((l) => l.startsWith("Something's wrong:"))!;
    expect(wrong).toBe('Something\'s wrong: they pointed to "something\'s wrong" (Mon 17:47). Find out what, and if it is new or sudden call 999 now.');
    // both stand above the 24 hours' counts
    expect(lines.indexOf(sign)).toBeLessThan(lines.findIndex((l) => l.startsWith('For the next carer')));
    expect(lines.indexOf(wrong)).toBeLessThan(lines.findIndex((l) => l.startsWith('For the next carer')));
  });
  it('"What stands out": a sign is its own line, first, with the call box', async () => {
    const { insights, NO_HEALTH } = await import('../../core/insights');
    const { answerEntry } = await import('../../core/diary');
    const xs = insights([{ ...answerEntry({ q: W, label: 'yes', at: now - 3600000 }), id: 's1' }], NO_HEALTH, 'week', now, '999');
    expect(xs[0]).toMatchObject({ id: 'sign', level: 'call', urgent: true });
    expect(xs[0].text).toBe('Sudden weakness or numbness: "yes" on Mon 23 Nov.');
    expect(xs[0].act).toBe('If 999 was not called, call now. Tell the doctor today.');
  });
  it('the visit page: "I can\'t go on" and a stroke sign each get their own first lines, not folded into "Mood"', async () => {
    const { sinceLines } = await import('../../core/since');
    const { answerEntry } = await import('../../core/diary');
    const diary = [
      { ...answerEntry({ q: 'How are you feeling today?', label: "I can't go on", at: now - 3600000 }), id: 'c1' },
      { ...answerEntry({ q: W, label: 'yes', at: now - 7200000 }), id: 's1' },
    ];
    const s = sinceLines(diary as never, null, now);
    expect(s.lines[0]).toBe('Said "I can\'t go on": Mon 23 Nov 17:00 (the safety screen was shown). Tell the doctor.');
    expect(s.lines[1]).toBe('Suddenly weak or numb: "yes" (Mon 23 Nov 16:00). Tell the doctor.');
    expect(s.urgent).toBe(true);
  });
  it('web/src/main.ts: a "not sure" to a stroke sign is written to the diary too', async () => {
    const { readFileSync } = await import('node:fs');
    const main = readFileSync('web/src/main.ts', 'utf8');
    expect(main).toContain("} else if (state.picked && state.picked.role === 'escape' && learns() && !c.sample && signAnswer(c.asked, state.picked.label)) {");
  });
});
