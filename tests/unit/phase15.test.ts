// Phase 15 (24 Nov 2026), the fixes of judge round 11. Each block is the worst case a seat found, written so that it
// failed on the build of round 11 (479ce07) and passes now.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { COPY } from '../../core/copy';
import { P4 } from '../../core/copy4';
import { P5 } from '../../core/copy5';
import { P9 } from '../../core/copy9';
import { answerEntry, logEntry, needEntry, urgentDay } from '../../core/diary';
import { NO_HEALTH, insights } from '../../core/insights';
import { addLater, cleanLater } from '../../core/later';
import { letterLabel, letterWords } from '../../core/letter';
import { redPlace } from '../../core/redflag';
import { SAMPLE_PROFILE } from '../../core/sample';
import { handoverText } from '../../core/share';
import { sinceLines } from '../../core/since';
import { after } from '../../core/tree';
import { visitText } from '../../core/visit';
import { findStoppedLine, findWaitLine, laterBlock } from '../../web/src/simple';

const main = readFileSync('web/src/main.ts', 'utf8');
const body = (name: string) => { const i = main.indexOf(`function ${name}(`); return main.slice(i, main.indexOf('\n}\n', i)); };
const NOW = new Date(2026, 10, 24, 12, 0).getTime();
const H = 3600000;

describe('A1. The sample family\'s diary fills as it is used (ADV-05-10), in its own store only', () => {
  it('a confirmed answer, a need and a stroke-sign "not sure" are written to the diary in the sample family too', () => {
    // the diary write no longer sits inside `if (learns())`; what is learned (the answer check, the needs count) still does
    expect(main).toContain('const r = learns() ? reliability(tapsFrom(state.history), at) : null;');
    expect(main).toContain("const entry = addEntry(state.diary, started ? startedEntry(");
    expect(main).toContain('if (learns()) { state.needsLog = [...state.needsLog, { label: state.picked.label, at }].slice(-300); void kvSet(\'needs\', state.needsLog); }\n        state.diary = addEntry(state.diary, needEntry(state.picked.label, at));');
    expect(main).not.toContain("role === 'escape' && learns() && !c.sample && signAnswer");
  });
  it('the diary still never reaches the device while the sample family is open (the 23 Nov separation)', () => {
    expect(main).toContain("const saveDiary = () => { if (!state.demo) void kvSet('diary', state.diary); };");
    expect(body('clearFamily')).toContain('state.diary = []');
  });
  it('the visit page and the therapist page read the same diary: "Since the last visit" and the urgent warning are not switched off for it', () => {
    expect(main).toContain('since: sinceLines(state.diary, r?.since ?? null');
    expect(main).toContain('warn: !p8.health && practiceUrgent(state.diary, p8.span, now)');
  });
  it('worst case: a pain need pointed to gives its own line in "What stands out", never "Nothing stands out"', () => {
    const xs = insights([needEntry('pain', NOW - H)], NO_HEALTH, 'week', NOW);
    expect(xs.map((x) => x.id)).toContain('pain-some');
  });
});

describe('A2. "Find more choices" keeps the card on screen while it waits (ADV-05-11)', () => {
  it('the line where the button was: "Asking Google\'s AI…" and "Stop waiting"', () => {
    const html = findWaitLine('cloud');
    expect(html).toContain("Asking Google&#39;s AI…");
    expect(html).toContain('data-act="stop-wait"');
    expect(html).toContain('class="making find-wait"');
    expect(findWaitLine('device')).toContain('on this computer');
    expect(findStoppedLine()).toContain('the card is still here');
  });
  it('runNarrow keeps the card it was asked from (also after the sheet\'s yes) and passes the cloud start on', () => {
    const run = body('runNarrow');
    expect(run).toContain('if (i.offered && state.card && !state.card.narrow) p15find.from = state.card;');
    expect(run).toContain('if (keep) { state.card = keep; p15find.card = keep; }');
    expect(run).toContain('onCloud: () => cloudStarted(seq)');
    expect(main).toContain('} else if (c && (!state.busy || findWaiting())) {');
  });
  it('"Stop waiting" over the card keeps it, with its line; any other tap or a step back calls the wait off first', () => {
    expect(main).toContain("case 'stop-wait': if (findWaiting()) {");
    expect(main).toContain("if (findWaiting() && (ev.target as HTMLElement).closest('a, button, [data-act]')");
    expect(main).toMatch(/if \(skipPop\) \{ skipPop = false; return; \}\n {2}cancelFindWait\(\);/);
  });
});

describe('A3. Read aloud in the sample family too, with its own yes (ADV-05-1, ADV-05-4)', () => {
  it('canSpeak no longer leaves out the sample family', () => {
    expect(main).toContain('const canSpeak = () => !!state.engine.speak && state.engine.cloudConfigured;');
  });
  it('its yes and its switch stay in memory and never turn Read aloud on for the family\'s own cards', () => {
    expect(main).toContain('const speakOn = () => canSpeak() && (state.demo ? p15speak.on : !!state.settings.speak);');
    expect(main).toContain("case 'speak-yes': p5.speakSheet = false; if (state.demo) { p15speak.on = true; p15speak.ok = true; } else {");
    expect(body('enterDemo')).toContain('p15speak.on = false; p15speak.ok = false;');
    expect(body('leaveDemo')).toContain('p15speak.on = false; p15speak.ok = false;');
  });
});

describe('A4. The sample family: "B" gives Beth, Bo, biscuits (ADV-05-3)', () => {
  it('Beth is a person, ginger biscuits a food; the three come first under B, by rules', () => {
    expect(SAMPLE_PROFILE.people.map((p) => p.name)).toContain('Beth');
    expect(SAMPLE_PROFILE.foods).toContain('ginger biscuits');
    const words = letterWords({ asked: '', letter: 'B', rejected: [] }, SAMPLE_PROFILE).slice(0, 3);
    expect(words.map((w) => letterLabel(w, 'B'))).toEqual(['Beth', 'Bo', 'biscuits (ginger)']);
  });
});

describe('P0 health: texts for others after a chest or head pain say call now, like the screen (seats 01, 13b)', () => {
  const chest = [
    { ...answerEntry({ q: 'Are you in pain?', label: 'yes', at: NOW - 3 * H }, 'body'), id: 'a' },
    { ...answerEntry({ q: 'Where in the chest?', label: 'the middle', at: NOW - 3 * H + 60000 }, 'body'), id: 'b' },
    { ...answerEntry({ q: 'How bad is the pain?', label: 'a little', at: NOW - 3 * H + 120000 }, 'body'), id: 'c' },
  ];
  it('the next carer\'s note: chest pain "a little" reads "call now, whatever the amount", not "tell the doctor"', () => {
    const t = handoverText({ diary: chest as never, now: NOW, name: 'Frank', number: '999', learned: [] } as never);
    expect(t).toContain(P5.insights.placeAct('999'));
    expect(t).not.toMatch(/a little[^\n]*Tell the doctor or nurse\. If it is new or sudden/);
  });
  it('"What stands out": the chest line carries the same call, and no softer "if new or sudden" under it', () => {
    const x = insights(chest as never, NO_HEALTH, 'week', NOW, '999').find((l) => l.id === 'pain-day');
    expect(x?.act).toBe('Pain in the head or the chest: call 999 now, whatever the amount. Do not wait to see if it passes.');
  });
  it('a logged pain with no place says call now first if it is new, sudden, chest or head (core/copy9.ts painSomeAct)', () => {
    expect(P9.insights.painSomeAct('112')).toMatch(/^If the pain is new or sudden, or in the chest or the head: call 112 now\./);
    const xs = insights([logEntry('pain', NOW - H)], NO_HEALTH, 'week', NOW, '112');
    expect(xs.find((l) => l.id === 'pain-some')?.act).toBe(P9.insights.painSomeAct('112'));
  });
});

describe('P0 health: the visit page under a stroke sign or "I can\'t go on" is never only "Tell the doctor" (seat 13b)', () => {
  it('both lines say not to wait for the visit, with the number (and the crisis line where known)', () => {
    const d = [
      { ...answerEntry({ q: 'Is it suddenly weak or numb, yes or no?', label: 'yes', at: NOW - H }), id: 's' },
      { ...answerEntry({ q: 'How are you feeling today?', label: "I can't go on", at: NOW - 2 * H }), id: 'c' },
    ];
    const s = sinceLines(d as never, null, NOW, [], 'Frank', '999', '116 123');
    for (const l of s.lines.slice(0, 2)) { expect(l).not.toMatch(/Tell the doctor\.$/); expect(l).toMatch(/call 999 now/); }
    expect(s.lines.join(' ')).toMatch(/not at the visit/);
  });
});

describe('P0 health: a weakness "no" or "not sure", then "a little" pain, never ends on "Ask again in an hour" (seat 02n)', () => {
  it('the conversation keeps it as a check, and "a little" / "not sure" end on the arms-and-smile check with the number', () => {
    expect(redPlace('Is it suddenly weak or numb, yes or no?', 'not sure')).toBe('sign-check');
    for (const label of ['a little', 'not sure']) {
      const s = after({ asked: 'How bad is the pain?', kind: 'scale' } as never, label, SAMPLE_PROFILE, ['Where in the arms?'], '999', 'sign-check');
      expect(s.end, label).not.toMatch(/in an hour/);
      expect(s.end, label).toMatch(/lift both arms and smile.*call 999 now/);
      expect(s.alert, label).toBe(true);
    }
    // "quite bad" and "very bad" keep their own call lines
    expect(after({ asked: 'How bad is the pain?', kind: 'scale' } as never, 'very bad', SAMPLE_PROFILE, [], '999', 'sign-check').end).toMatch(/^Very bad\./);
  });
  it('a later chest pain in the same conversation still takes over from the check (web/src/main.ts)', () => {
    expect(main).toContain("if (r && redRank(r) > redRank(p5.red)) p5.red = r;");
  });
  it('past the depth limit, a safety check still asks "How bad is the pain?" (ADV-05-17)', () => {
    const s = after({ asked: 'Is it suddenly weak or numb, yes or no?', kind: 'yesno' } as never, 'no', SAMPLE_PROFILE, ['Are you in pain?', 'Where does it hurt?', 'Where in the arms?'], '911');
    expect(s.next).toEqual(['How bad is the pain?']);
  });
});

describe('P0 health: "Left for later" keeps the chest or head urgency (seat 13, ADV-13-3)', () => {
  it('the item keeps the red flag, also after a reload of the list', () => {
    const xs = addLater([], 'Are you in pain?', NOW, 'body', 'chest');
    expect(xs[0]).toMatchObject({ red: 'chest', care: true });
    expect(cleanLater(JSON.parse(JSON.stringify(xs)))[0].red).toBe('chest');
  });
  it('Home shows the call line first, never "call the nurse or doctor" alone', () => {
    const html = laterBlock([{ q: 'Are you in pain?', time: '23:20', i: 0, care: true, pain: true, red: 'chest' }], '', '911');
    expect(html).toContain('Chest pain was pointed to (23:20): call 911 now, whatever the amount.');
    expect(html).not.toContain('call the nurse or doctor');
    expect(COPY.simple.later.painLine('911')).toMatch(/^If the pain is in the chest or the head, or new or strong, do not wait: call 911 now\./);
  });
  it('"Ask it again" puts the call box back over the card (web/src/main.ts)', () => {
    expect(main).toContain("if (red) { p5.urgent = true; p5.red = red; if (red === 'sign') p5.signNow = true; render(); }");
    expect(main).toContain("addLater(p8later.list, q, at, topic, p5.red && p5.red !== 'sign-check' && p5.red !== 'limb' ? p5.red : null)");
  });
});

describe('P0 health: no praise and no "nothing to change" over an urgent day or a tired yes (seats 13b, 13)', () => {
  it('a day with an urgent entry gets no tip of the day', () => {
    expect(urgentDay([answerEntry({ q: 'Where in the chest?', label: 'the middle', at: NOW - H })], NOW)).toBe(true);
    expect(urgentDay([answerEntry({ q: 'Would you like tea or coffee?', label: 'tea', at: NOW - H })], NOW)).toBe(false);
    expect(main).toContain('const tip = state.demo || urgentDay(state.diary, Date.now()) ? null : tipOfDay(state.asks, Date.now());');
  });
  it('"Are you comfortable?" yes: a check the other way and "Are you in pain?" next, never "Nothing to change"', () => {
    const s = after({ asked: 'Are you comfortable?', kind: 'yesno' } as never, 'yes', SAMPLE_PROFILE, ['Are you comfortable?'], '911');
    expect(s.end).not.toMatch(/Nothing to change/);
    expect(s.end).toMatch(/A yes can be wrong after a stroke/);
    expect(s.next).toEqual(['Are you in pain?']);
  });
  it('the doctor page: every yes or no answer says "please check"; the footer says pointed answers', () => {
    const r = { startedAt: NOW, done: true, answers: [{ id: 'pain' as const, q: 'Are you in pain?', label: 'no', at: NOW }] };
    expect(visitText(r, 'Frank')).toContain(`Are you in pain? no (12:00) ${P4.visit.check}`);
    expect(P4.visit.footer('Frank')).toMatch(/^Frank's pointed answers/);
  });
});

describe('P1: honest phone wording and the number on "Body & care" (seats 01, 05)', () => {
  it('a phone never reads "The private helper isn\'t ready on this phone"', async () => {
    const { deviceWords } = await import('../../core/copy');
    const t = deviceWords(COPY.notes.notReadyCloudPossible, 'phone');
    expect(t).not.toMatch(/isn't ready/);
    expect(t).toBe('This phone has no AI of its own for this one, so there are no choices from it. Online help can try, after your yes.');
  });
  it('the Body & care card names the number', () => {
    expect(main).toContain("bodyHtml: suddenLink('sudden-body', callNumber()),");
  });
});
