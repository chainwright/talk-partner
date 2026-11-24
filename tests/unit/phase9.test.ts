// Phase 9 (18 Nov 2026), the fixes of judge round 8. Every new or changed line is walked on its worst case: could it
// make a tired carer dismiss pain or a need?
import { describe, expect, it } from 'vitest';
import { COPY } from '../../core/copy';
import { LATER_LABEL, answerEntry, diaryText, laterEntry, logEntry, needEntry, tags, type DiaryEntry } from '../../core/diary';
import { NO_HEALTH, cloudLines, insights } from '../../core/insights';
import { LATER_MS, addLater, cleanLater, doneLater, laterCare, laterPain, noLastTime, shownLater } from '../../core/later';
import { P8 } from '../../core/copy8';
import { after, treeEnds } from '../../core/tree';
import { EMPTY_PROFILE } from '../../core/types';
import { sinceLines } from '../../core/since';
import { laterBlock } from '../../web/src/simple';
import { NOW, when } from './week';

const H = 3_600_000;
/** The HTML with the apostrophe put back (esc writes &#39;). */
const un = (h: string) => h.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');

describe('1. P0 health: a care question left for later (pain, the body, the toilet, a drink, feelings)', () => {
  it('knows a care question by its topic or its words; "tea or coffee?" is not one', () => {
    for (const q of ['Are you in pain?', 'Does it hurt?', 'Do you need the toilet?', 'Would you like something to drink?', 'Are you thirsty?', 'How are you feeling?', 'Is something wrong?']) expect(laterCare(q), q).toBe(true);
    expect(laterCare('Shall we go out?', 'body')).toBe(true);
    for (const q of ['Would you like tea or coffee?', 'Shall we watch the football?', 'Do you want to call Beth?']) expect(laterCare(q), q).toBe(false);
    expect(laterPain('Are you in pain?')).toBe(true);
    expect(laterPain('Do you need the toilet?')).toBe(false);
  });
  it('worst case: pain left for later 30 hours ago is still on Home, pinned first, with the "don\'t wait" line', () => {
    let xs = addLater([], 'Are you in pain?', NOW - 30 * H);
    xs = addLater(xs, 'Would you like tea or coffee?', NOW - 60_000);
    xs = addLater(xs, 'Shall we go out?', NOW - 2 * 60_000);
    const shown = shownLater(xs, NOW);
    expect(shown.map((x) => x.q)).toEqual(['Are you in pain?', 'Would you like tea or coffee?', 'Shall we go out?']);
    expect(shown[0]).toMatchObject({ care: true, pain: true });
    const html = un(laterBlock(shown.map((x, i) => ({ q: x.q, time: '14:37', i, care: !!x.care, pain: !!x.pain }))));
    expect(html).toContain('If the pain is in the chest or the head, or new or strong, do not wait: call 911 now. Otherwise tell the nurse or doctor today.');
    expect((html.match(/later-pain/g) ?? []).length).toBe(1);
    expect(html).toContain(COPY.simple.later.careNote);
    // a week on, still there; an ordinary question of the same age is gone
    const week = addLater(addLater([], 'Do you need the toilet?', NOW - 7 * 24 * H), 'Shall we go out?', NOW - 7 * 24 * H);
    expect(shownLater(week, NOW).map((x) => x.q)).toEqual(['Do you need the toilet?']);
  });
  it('worst case: "Done" then "Not yet" keeps the pain question; only "Yes, I found out" takes it off', () => {
    const xs = addLater([], 'Are you in pain?', NOW - 30 * H);
    const pain = xs[0];
    expect(doneLater(xs, pain, false)).toEqual(xs);
    expect(shownLater(doneLater(xs, pain, false), NOW).map((x) => x.q)).toEqual(['Are you in pain?']);
    expect(doneLater(xs, pain, true)).toEqual([]);
    // "Done" asks first: the block shows "Did you find out?" with Yes and Not yet, and no second "Done"
    const asking = un(laterBlock([{ q: pain.q, time: '14:37', i: 0, care: true, pain: true, asking: true }]));
    expect(asking).toContain('Did you find out?');
    expect(asking).toContain('data-act="later-found"');
    expect(asking).toContain('data-act="later-notyet"');
    expect(asking).not.toContain('data-act="later-done"');
    expect(asking).toContain('do not wait');
  });
  it('other questions keep the phase 8 behaviour: the newest two of a day, "Done" at once', () => {
    let xs = addLater([], 'Would you like tea or coffee?', NOW - 3 * H);
    xs = addLater(xs, 'Shall we go out?', NOW - 2 * H);
    xs = addLater(xs, 'Shall we watch TV?', NOW - H);
    xs = addLater(xs, 'Old one?', NOW - LATER_MS - 1);
    expect(shownLater(xs, NOW).map((x) => x.q)).toEqual(['Shall we watch TV?', 'Shall we go out?']);
    expect(doneLater(xs, xs[xs.length - 1], false)).toHaveLength(xs.length - 1);
    const html = un(laterBlock([{ q: 'Shall we go out?', time: '14:37', i: 0 }]));
    expect(html).toContain(COPY.simple.later.note);
    expect(html).not.toContain('do not wait');
  });
  it('care questions are never pushed out by many ordinary ones, and survive a reload (by their words)', () => {
    let xs = addLater([], 'Are you in pain?', NOW - 50 * H);
    for (let i = 0; i < 20; i++) xs = addLater(xs, `Shall we do thing ${i}?`, NOW - (20 - i) * 60_000);
    expect(xs.some((x) => x.q === 'Are you in pain?')).toBe(true);
    const back = cleanLater(JSON.parse(JSON.stringify(xs)));
    expect(shownLater(back, NOW)[0]).toMatchObject({ q: 'Are you in pain?', care: true, pain: true });
    // a row stored by phase 8 (no flags) is known again as a care question
    expect(cleanLater([{ q: 'Do you need the toilet?', at: 1 }])).toEqual([{ q: 'Do you need the toilet?', at: 1, care: true }]);
  });
  it('is written to the diary as "left for later", counts as nothing, and the visit page names it', () => {
    const e = laterEntry('Are you in pain?', when(5, '14:37'), 'body');
    expect(e).toMatchObject({ kind: 'later', q: 'Are you in pain?', label: LATER_LABEL, topic: 'body' });
    expect(tags(e)).toEqual([]);
    expect(diaryText([e], { log: COPY.simple.diary.log, lessSure: 'less sure', need: 'Pointed to' })).toContain('14:37  Left for later: Are you in pain?');
    const diary: DiaryEntry[] = [logEntry('drank', when(4, '09:00')), e];
    const s = sinceLines(diary, when(0, '00:00'), NOW);
    const line = s.lines.find((l) => l.startsWith('Left for later'))!;
    expect(line).toBe('Left for later: "Are you in pain?" (Sat 21 Nov). Ask about it at the visit if it was not asked again.');
    expect(s.sources[s.lines.indexOf(line)].ids).toEqual([e.id]);
    // nothing left for later: no such line
    expect(sinceLines([logEntry('drank', when(4, '09:00')), answerEntry({ q: 'Tea?', label: 'tea', at: when(4, '10:00') })], when(0, '00:00'), NOW).lines.join(' ')).not.toContain('Left for later');
  });
});

describe('2. P0 health: "Nothing stands out" never stands over a pain, a fall, a low day, "something\'s wrong" or a day with no drink', () => {
  // (phase 12b: a calm day has six drinks; fewer is a line of its own)
  const day = (d: number) => [logEntry('drank', when(d, '08:00')), logEntry('ate', when(d, '08:30')), logEntry('drank', when(d, '10:00')), logEntry('drank', when(d, '12:00')), logEntry('drank', when(d, '14:00')), logEntry('drank', when(d, '17:00')), logEntry('drank', when(d, '20:00'))];
  const calm = [...day(0), ...day(1), ...day(2), ...day(3), ...day(4), ...day(5)];
  const ids = (xs: { id: string }[]) => xs.map((x) => x.id);
  it('a calm week: "Nothing stands out", and only then', () => {
    expect(ids(insights(calm, NO_HEALTH, 'week', NOW))).toEqual(['nothing']);
  });
  it('worst case of the round: a yes to pain on 2 days gives its own line, with the fixed "ask again, tell" sentence', () => {
    const pain = (d: number) => answerEntry({ q: 'Are you in pain?', label: 'yes', at: when(d, '09:00') }, 'body');
    const xs = insights([...calm, pain(1), pain(3)], NO_HEALTH, 'week', NOW);
    expect(ids(xs)).toEqual(['pain-some']);
    expect(xs[0]).toMatchObject({ level: 'mention', text: 'Pain was chosen or logged on 2 days in the last 7 days.', act: 'If the pain is new or sudden, or in the chest or the head: call 911 now. Otherwise ask again today, and tell the doctor or nurse if it is still there.' });
    expect(`${xs[0].text} ${xs[0].act}`).toBe('Pain was chosen or logged on 2 days in the last 7 days. If the pain is new or sudden, or in the chest or the head: call 911 now. Otherwise ask again today, and tell the doctor or nurse if it is still there.');
    // a line with a fixed sentence is never handed to a model to reword
    expect(cloudLines(xs)).toEqual([]);
  });
  it('one pain of each kind: a logged "Pain", "pain" on the needs board, a place on the body card, "a little" pain', () => {
    for (const e of [logEntry('pain', when(2, '10:00')), needEntry('pain', when(2, '10:00')), answerEntry({ q: 'Where does it hurt?', label: 'right shoulder', at: when(2, '10:00') }, 'body'), answerEntry({ q: 'How bad is the pain?', label: 'a little', at: when(2, '10:00') }, 'body')]) {
      const xs = insights([...calm, e], NO_HEALTH, 'week', NOW);
      expect(ids(xs), e.label).toEqual(['pain-some']);
      expect(xs[0].text).toBe('Pain was chosen or logged on 1 day in the last 7 days.');
    }
    // over 30 days too
    expect(ids(insights([...calm, logEntry('pain', when(2, '10:00'))], NO_HEALTH, 'month', NOW))).toContain('pain-some');
  });
  it('a fall', () => {
    expect(ids(insights([...calm, logEntry('fall', when(2, '10:00'))], NO_HEALTH, 'week', NOW))).toEqual(['fall']);
  });
  it('one low day', () => {
    const xs = insights([...calm, answerEntry({ q: 'How are you feeling?', label: 'low', at: when(2, '10:00') }, 'feel')], NO_HEALTH, 'week', NOW);
    expect(ids(xs)).toEqual(['mood']);
    expect(xs[0].text).toBe('A low or worried mood was chosen on 1 day in the last 7 days: "sad", "low", "worried", "scared", "lonely", or something bothering them.');
  });
  it('"something\'s wrong", on the needs board or on a card: a line with whom to tell and the call box', () => {
    for (const e of [needEntry("something's wrong", when(2, '10:00')), answerEntry({ q: 'What is it?', label: "something's wrong", at: when(2, '10:00') }, 'body')]) {
      const xs = insights([...calm, e], NO_HEALTH, 'week', NOW, '999');
      expect(ids(xs), e.kind).toEqual(['wrong']);
      expect(xs[0]).toMatchObject({ level: 'call', urgent: true, text: '"Something\'s wrong" was pointed to on 1 day: Wed 18 Nov. Ask what it was.', act: 'Tell the doctor or nurse. If it is new or sudden, call 999 now.' });
    }
  });
  it('a day with entries and no drink', () => {
    const dry = [...day(0), ...day(1), logEntry('ate', when(2, '09:00')), ...day(3), ...day(4), ...day(5)];
    expect(ids(insights(dry, NO_HEALTH, 'week', NOW))).toEqual(['no-drink']);
  });
  it('never "Nothing stands out" beside any of them, in a week or a month', () => {
    const one = [logEntry('pain', when(2, '10:00')), logEntry('fall', when(2, '10:00')), answerEntry({ q: 'How are you feeling?', label: 'sad', at: when(2, '10:00') }, 'feel'), needEntry("something's wrong", when(2, '10:00'))];
    for (const e of one) for (const span of ['week', 'month'] as const) expect(ids(insights([...calm, e], NO_HEALTH, span, NOW)), `${e.label} ${span}`).not.toContain('nothing');
  });
});

describe('3. P1 health wording', () => {
  it('"A little pain" no longer says "keep an eye on it": ask again in an hour, and tell if new or still there', () => {
    expect(after({ asked: 'How bad is the pain?', kind: 'choice' }, 'a little', EMPTY_PROFILE).end).toBe('A little pain. Ask again in an hour; tell the nurse or doctor if it stays. Sudden weakness or numbness: call now.');
    expect(treeEnds('Frank').join(' ')).not.toMatch(/keep an eye on it/i);
  });
  it('no "Last time" and no "So far" before a question about pain, the toilet, a drink or feelings; still before tea or coffee', () => {
    for (const q of ['Are you in pain?', 'Do you need the toilet?', 'Would you like something to drink?', 'How are you feeling?', 'Is something wrong?']) expect(noLastTime({ kind: 'yesno', asked: q }), q).toBe(true);
    expect(noLastTime({ kind: 'choice', asked: 'Shall we go out?' }, 'body')).toBe(true);
    for (const kind of ['body', 'pain', 'feeling']) expect(noLastTime({ kind, asked: 'Which one?' }), kind).toBe(true);
    expect(noLastTime({ kind: 'choice', asked: 'Would you like tea or coffee?' })).toBe(false);
    expect(noLastTime({ kind: 'choice', asked: 'Shall we watch the football?' })).toBe(false);
  });
  it('worst case: the passport\'s "tired yes" line can never be read as doubting a yes to pain', () => {
    expect(P8.passport.tiredYes).toMatch(/But a yes to pain, the toilet or 'something's wrong' is always a yes: act on it\.$/);
  });
});

// ---------------------------------------------------------------- item 4
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { emergencyNumber, localeNumber, numberSet, telHref } from '../../core/redflag';
import { fallBlock, suddenScreen, urgentBox } from '../../web/src/phase5';

describe('4. P1 the emergency number follows the locale, and asks', () => {
  it('en-GB 999, a European Union locale 112, anything else 911', () => {
    for (const l of ['en-GB', 'en_GB', 'cy-GB', 'gd-GB', 'en-UK']) expect(localeNumber(l), l).toBe('999');
    for (const l of ['de-DE', 'fr-FR', 'en-IE', 'pl', 'de', 'it-IT', 'es-ES', 'nl-BE', 'sv-SE', 'pt-PT']) expect(localeNumber(l), l).toBe('112');
    for (const l of ['en-US', 'en-CA', 'fr-CA', 'es-MX']) expect(localeNumber(l), String(l)).toBe('911');
    // (phase 12, judge round 9: Brazil and Japan have their own numbers, and an unknown region gets 112, not a silent 911)
    for (const l of ['en', '', undefined, 'xx']) expect(localeNumber(l), String(l)).toBe('112');
  });
  it('About them\'s own number always wins; with none, the locale\'s', () => {
    expect(emergencyNumber('000', localeNumber('en-GB'))).toBe('000');
    expect(emergencyNumber('', localeNumber('en-GB'))).toBe('999');
    expect(emergencyNumber('', localeNumber('de-DE'))).toBe('112');
    expect(emergencyNumber('')).toBe('911');
    expect(numberSet('')).toBe(false);
    expect(numberSet('999')).toBe(true);
    expect(telHref('999')).toBe('tel:999');
  });
  it('while it is a guess, every call box says "Is this your emergency number? Change it", which opens About them', () => {
    for (const html of [urgentBox('999', 'urgent', true), fallBlock({ number: '999', id: 'x', head: false, guess: true }), suddenScreen({ number: '999', guess: true })]) {
      expect(html).toContain('Is this your emergency number? <button type="button" class="tlink" data-act="sudden-number">Change it →</button>');
      expect(html).toContain('href="tel:999"');
    }
    // the number in About them: no question
    expect(urgentBox('999', 'urgent', false)).not.toContain('Is this your emergency number?');
  });
  it('the web client: the locale when About them has none, and 911 with no question for the American sample family', () => {
    const main = readFileSync(join(__dirname, '..', '..', 'web', 'src', 'main.ts'), 'utf8');
    expect(main).toContain('const callNumber = () => emergencyNumber(state.health.emergency, state.demo ? DEFAULT_NUMBER : localeNumber(navigator.language));');
    expect(main).toContain('const numberGuess = () => !state.demo && !numberSet(state.health.emergency);');
    // (phase 12b: with a fourth argument, the "now" box over a confirmed yes to weakness or numbness)
    expect((main.match(/urgentBox\(callNumber\(\), 'urgent', numberGuess\(\), /g) ?? []).length).toBe(2);
  });
});

// ---------------------------------------------------------------- item 5
import { handoverText } from '../../core/share';
import { P5 } from '../../core/copy5';
import { visitLabel } from '../../core/visit';

describe('5. P1 the handover note and the visit page', () => {
  const diary = [logEntry('drank', NOW - 2 * H), logEntry('toilet', NOW - 3 * H), logEntry('tablets', NOW - 4 * H)];
  const base = { diary, learned: [], name: 'Frank', now: NOW };
  it('worst case: the box is off, and the next carer still reads the swallowing difficulty and the fluid limit', () => {
    const t = handoverText({ ...base, health: null, safety: { swallowing: true, fluidLimit: true } });
    expect(t).toContain('ALWAYS ON THIS NOTE (it changes what is safe to give)\n- Swallowing difficulty is noted: go by the plan from the speech therapist or nurse before giving food or drink.\n- A fluid limit from the doctor is noted: go by the doctor\'s plan for drinks.');
    // the drinks line knows the fluid limit too
    expect(t).toContain("A fluid limit from the doctor is noted: go by the doctor's plan.");
    // with none noted, no such block
    expect(handoverText({ ...base, health: null, safety: { swallowing: false, fluidLimit: false } })).not.toContain('ALWAYS ON THIS NOTE');
  });
  it('box ticked: the two are said once, under ALWAYS, and the other notes under the health notes', () => {
    const health = { ...NO_HEALTH, swallowing: true, diabetes: true };
    const t = handoverText({ ...base, health, safety: { swallowing: true, fluidLimit: false } });
    expect((t.match(/Swallowing difficulty/g) ?? []).length).toBe(1);
    expect(t).toContain('- Diabetes');
  });
  it('the visit page: Toilet and Tablets lines, the two family questions, and where it hurts with the part of the body', () => {
    const s = sinceLines(diary, when(0, '00:00'), NOW);
    expect(s.lines).toContain('Toilet: 1 entered (Sun 22 Nov).');
    expect(s.lines).toContain('Tablets taken: logged 1 time (Sun 22 Nov). The app does not know which tablets or how many.');
    expect(P5.since.questions).toContain('Have the tablets changed, and what should we watch for?');
    expect(P5.since.questions).toContain('Is anything new to look at: weakness, swallowing, bowels or bladder?');
    expect(visitLabel({ visit: 'where', bodyStep: 2, region: 'chest' }, 'middle')).toBe('chest, middle');
    expect(visitLabel({ visit: 'where', bodyStep: 2, region: 'arms' }, 'your left arm')).toBe('arms, left arm');
    expect(visitLabel({ visit: 'where', bodyStep: 1 }, 'chest')).toBe('chest');
    expect(visitLabel({ visit: 'sleep' }, 'badly')).toBe('badly');
    // "chest, middle" on the page still raises the box, and counts as a pain in the chest
    const own = sinceLines([], when(0, '00:00'), NOW, [{ id: 'pain', q: 'Are you in pain?', label: 'yes', at: NOW - 60_000 }, { id: 'where', q: 'Where in the chest?', label: 'chest, middle', at: NOW - 30_000 }], 'Frank');
    expect(own.urgent).toBe(true);
  });
});

// ---------------------------------------------------------------- item 6
import { CLOUD_SLOW_MS, CLOUD_WAIT_MS, within, type DeviceStatus, type Engine, type ModelResult } from '../../core/engine';
import { makeCard } from '../../core/pipeline';
import { cloudTextRequest } from '../../core/requests';
import { SAMPLE_PROFILE } from '../../core/sample';
import { P9 } from '../../core/copy9';

class Slow implements Engine {
  label = 'slow';
  modes = { device: 'ONLY_ON_DEVICE', cloud: 'PREFER_IN_CLOUD' };
  cloudConfigured = true;
  constructor(private o: { hang?: boolean; answer?: string } = {}) {}
  async deviceStatus(): Promise<DeviceStatus> { return 'unavailable'; }
  async prepareDevice() {}
  async runDevice(): Promise<ModelResult> { throw new Error('no model'); }
  cloudRequest(q: string) { return cloudTextRequest(q); }
  runCloud(): Promise<ModelResult> {
    if (this.o.hang) return new Promise<never>(() => { /* never settles */ });
    return new Promise((res) => setTimeout(() => res({ text: this.o.answer ?? '{"topic":"weekend","kind":"choice","choices":["the garden","a drive"]}', source: 'in-cloud', ms: 30 }), 30));
  }
}
const cloudEnv = (engine: Engine, extra = {}) => ({ profile: SAMPLE_PROFILE, support: 'more' as const, engine, allowCloud: true, deviceReady: false, ...extra });

describe('6. P0 the cloud wait: 3 s to "Stop waiting", 20 s to the plain line; settings never block; the latency in the trace', () => {
  it('the limits are 3 s and 20 s (not 25 s)', () => {
    expect(CLOUD_SLOW_MS).toBe(3000);
    expect(CLOUD_WAIT_MS).toBe(20000);
  });
  it('worst case: online help never answers: the card says "took longer than 20 seconds", what to do instead, may have left, and the wait in ms', async () => {
    let told = 0;
    const c = await makeCard('What do you want to do this weekend?', cloudEnv(new Slow({ hang: true }), { cloudWaitMs: 25, onCloud: () => { told++; } }));
    expect(told).toBe(1);
    expect(c.blocked).toBe(COPY.notes.cloudSlowBlocked);
    expect(c.blocked).toMatch(/Ask it as a choice/);
    expect(c.notes.join(' ')).toContain('Cloud help took longer than 20 seconds');
    expect(c.cloudAttempted).toBeTruthy();
    const t = c.trace!.find((x) => x.step === 'stripped')!;
    expect(t).toMatchObject({ ran: 'failed' });
    expect(t.ms).toBeGreaterThanOrEqual(20);
    // the trace holds a number and the service's message, never the question
    expect(JSON.stringify(c.trace)).not.toContain('weekend');
  });
  it('an answer in time: the card, with its latency in the trace', async () => {
    const c = await makeCard('What do you want to do this weekend?', cloudEnv(new Slow()));
    expect(c.blocked).toBeFalsy();
    expect(c.trace!.find((x) => x.step === 'stripped')).toMatchObject({ ran: 'in-cloud', ms: 30 });
  });
  it('the timeout error is known as a timeout, so no second try doubles the wait', async () => {
    await expect(within(new Promise(() => {}), 5)).rejects.toMatchObject({ timedOut: true });
  });
  it('the web client: "Stop waiting" after 3 s, the making called off, and the settings fetched beside the app, never awaited', () => {
    const main = readFileSync(join(__dirname, '..', '..', 'web', 'src', 'main.ts'), 'utf8');
    expect(main).toContain('onCloud: () => cloudStarted(seq),');
    // (phase 12: the stopped wait is counted first, for the footer)
    expect(main).toContain("else if (state.busy) { if (p9wait.at !== null) p9stopped++; makeSeq++; cloudDone(); state.busy = false; state.error = P9.wait.stopped;");
    expect(main).toContain('if (ms < CLOUD_SLOW_MS) return;');
    expect(main).toMatch(/void fetchSettings\(cfg\.firebase\)\.then/);
    expect(main).not.toMatch(/await fetchSettings|await askSettings/);
    expect(P9.wait.stopped).toMatch(/may already have gone to online help/);
  });
});

// ---------------------------------------------------------------- item 7
import { routeChip, tryAiTag } from '../../core/simple';
import { AI_QUESTION } from '../../core/topics';
import { tryAiBlock } from '../../web/src/simple';

class Device extends Slow {
  async deviceStatus(): Promise<DeviceStatus> { return 'available'; }
  async runDevice(): Promise<ModelResult> { return { text: '{"topic":"weekend","kind":"choice","choices":["the garden","a drive"]}', source: 'on-device', ms: 8 }; }
}

describe('7. P0 the hybrid moment in 10 s: one tap on Home, the sample open question, the card and its routing chip', () => {
  const where = (o: Partial<{ configured: boolean; device: DeviceStatus | 'checking'; cloudOn: boolean; online: boolean }>) => ({ configured: true, device: 'unavailable' as const, cloudOn: false, online: true, ...o });
  it('the tag says where its AI runs here: Google\'s after a yes (a phone), Chrome\'s own on a desktop with Nano; nothing on a copy with no AI', () => {
    expect(tryAiTag(where({}))).toBe("uses Google's AI, after your yes");
    expect(tryAiTag(where({ cloudOn: true }))).toBe("uses Google's AI (online help is on)");
    expect(tryAiTag(where({ device: 'available' }))).toBe('AI on this computer: nothing is sent');
    expect(tryAiTag(where({ online: false }))).toBe('needs internet: you are offline');
    expect(tryAiTag(where({ configured: false }))).toBeNull();
    expect(tryAiBlock({ q: AI_QUESTION, tag: null, busy: false })).toBe('');
    const html = un(tryAiBlock({ q: AI_QUESTION, tag: "uses Google's AI, after your yes", busy: false }));
    expect(html).toContain('data-act="try-ai"');
    expect(html).toContain('"What do you want to do this weekend?"');
    expect(html).toContain("uses Google's AI, after your yes");
    expect(html).toContain('nothing from About them');
  });
  it('worst case: with a real family in About them, the cloud request holds the sample question and nothing else', async () => {
    const asked: string[] = [];
    const engine: Engine = Object.assign(new Slow(), { runCloud: (q: string): Promise<ModelResult> => { asked.push(q); return Promise.resolve({ text: '{"topic":"weekend","kind":"choice","choices":["the garden","a drive"]}', source: 'in-cloud', ms: 9 }); } });
    // the client makes the sample with an empty profile (main.ts: `const profile = sample ? EMPTY_PROFILE : state.profile;`)
    const c = await makeCard(AI_QUESTION, { ...cloudEnv(engine), profile: EMPTY_PROFILE });
    expect(asked).toEqual([AI_QUESTION]);
    expect(c.cloudPayload).toBe(JSON.stringify(cloudTextRequest(AI_QUESTION), null, 2));
    expect(routeChip(c, 'About them')).toMatchObject({ where: 'cloud', text: 'Made online, after your yes' });
  });
  it('on a desktop with Chrome\'s own AI the same tap is made on this computer, and the chip says so', async () => {
    const c = await makeCard(AI_QUESTION, { ...cloudEnv(new Device()), profile: EMPTY_PROFILE, deviceReady: true, allowCloud: false });
    expect(c.source).toBe('on-device');
    expect(routeChip(c, 'About them')).toMatchObject({ where: 'device', text: 'Made on this computer' });
  });
  it('the web client: the tap, the empty profile, and no history, diary or count for the sample', () => {
    const main = readFileSync(join(__dirname, '..', '..', 'web', 'src', 'main.ts'), 'utf8');
    expect(main).toContain("case 'try-ai': if (!state.busy) { p9sample.q = AI_QUESTION; askBy = 'none'; void make(AI_QUESTION); } break;");
    expect(main).toContain('const profile = sample ? EMPTY_PROFILE : state.profile;');
    expect(main).toContain('if (c.sample) {');
    expect(main).toContain('if (!(card.blocked && card.unsentPayload) && !sample) {');
  });
});

// ---------------------------------------------------------------- item 8
import { LETTER_CLOUD_TASK, letterCard, letterCloudText, letterWordsOf } from '../../core/letter';
import { LETTER_KINDS, LETTER_SCHEMA, LETTER_SYSTEM_PROMPT } from '../../core/prompt';
import { letterRequest } from '../../core/requests';

class Letters extends Slow {
  sent: string[] = [];
  viaCard = 0;
  constructor(private words: string[]) { super(); }
  letterRequest(text: string) { return letterRequest(text); }
  runLetter(text: string): Promise<ModelResult> { this.sent.push(text); return Promise.resolve({ text: JSON.stringify({ kind: 'drink', words: this.words }), source: 'in-cloud', ms: 11 }); }
  runCloud(): Promise<ModelResult> { this.viaCard++; return Promise.reject(new Error('the card step must not be asked for a letter')); }
}

describe('8. P1 the cloud letter step: its own schema (the kind as an enum, exactly 4 words), filtered by the letter in code', () => {
  it('the schema: kind from a closed list, words exactly 4; fixed instructions with no name', () => {
    expect(LETTER_SCHEMA.properties.kind.enum).toEqual(LETTER_KINDS);
    expect(LETTER_KINDS).toEqual(expect.arrayContaining(['drink', 'food', 'place', 'people', 'activity', 'feeling', 'comfort', 'other']));
    expect(LETTER_SCHEMA.properties.words).toMatchObject({ minItems: 4, maxItems: 4 });
    expect(LETTER_SYSTEM_PROMPT).toContain('exactly 4');
    expect(LETTER_CLOUD_TASK).toContain('exactly 4');
    expect(letterRequest('x')).toMatchObject({ mode: 'PREFER_IN_CLOUD', systemInstruction: LETTER_SYSTEM_PROMPT, generationConfig: { responseJsonSchema: LETTER_SCHEMA } });
  });
  it('the answer is read from {"words"}, or from a card\'s {"choices"} for an engine without the letter step', () => {
    expect(letterWordsOf('{"kind":"drink","words":["kettle","kefir","ketchup","kiwi"]}')).toEqual(['kettle', 'kefir', 'ketchup', 'kiwi']);
    expect(letterWordsOf('{"topic":"x","kind":"choice","choices":["kettle","kiwi"]}')).toEqual(['kettle', 'kiwi']);
    expect(letterWordsOf('not json')).toEqual([]);
  });
  it('worst case of round 8 (K gave no word): 4 words, those that do not start with K are dropped by code, the rest make the card; the card step is not asked', async () => {
    const e = new Letters(['kettle', 'tea', 'kiwi juice', 'coffee']);
    const c = await letterCard({ asked: 'Would you like tea or coffee?', letter: 'K', rejected: ['tea', 'coffee'] }, { profile: EMPTY_PROFILE, support: 'more', engine: e, allowCloud: true, deviceReady: false });
    expect(e.viaCard).toBe(0);
    expect(e.sent).toEqual([letterCloudText('Would you like tea or coffee?', 'K', EMPTY_PROFILE).text]);
    expect(c.choices.filter((x) => x.role === 'answer').map((x) => x.label)).toEqual(['kettle', 'kiwi juice']);
    expect(c.why?.dropped.map((d) => d.label)).toEqual(expect.arrayContaining(['tea', 'coffee']));
    expect(c.cloudPayload).toBe(JSON.stringify(letterRequest(e.sent[0]), null, 2));
    expect(c.letter?.by).toBe('cloud');
  });
});

// ---------------------------------------------------------------- item 9
import { personSimple } from '../../web/src/simple';
import { repairCard } from '../../core/pipeline';

describe('9. P1 the person\'s own "Not now"', () => {
  const person = (card: Awaited<ReturnType<typeof makeCard>>, full = true) => personSimple({ card, busy: false, less: false, picked: null, confirmed: false, recap: false, answers: [], pic: () => '', waitPic: '', full });
  const rules = (q: string) => makeCard(q, { profile: EMPTY_PROFILE, support: 'more', engine: new Slow(), allowCloud: false, deviceReady: false });
  it('the same small tile on the top row of every question screen the person holds, opposite the carer\'s press and hold; never on the carer\'s preview', async () => {
    for (const q of ['Are you in pain?', 'Would you like tea or coffee?', 'How bad is the pain?', 'Where does it hurt?', 'How are you feeling today?']) {
      const html = person(await rules(q));
      expect((html.match(/data-not-now="1"/g) ?? []).length, q).toBe(1);
      expect(html, q).toMatch(/^<div class="p-top"><button type="button" id="exit" class="hold"[^]*?<button type="button" class="p-notnow"/);
    }
    expect(person(repairCard(EMPTY_PROFILE))).toContain('data-not-now="1"');
    expect(person(await rules('Would you like tea or coffee?'), false)).not.toContain('data-not-now');
  });
  it('worst case: "Not now" on "Are you in pain?" files it as a care question: pinned, never expiring, with the "don\'t wait" line', () => {
    const xs = addLater([], 'Are you in pain?', NOW - 40 * H, 'body');
    expect(shownLater(xs, NOW)[0]).toMatchObject({ q: 'Are you in pain?', care: true, pain: true });
    expect(P9.later.notNow('Frank', true)).toBe('Frank chose "Not now". The question is kept on Home, under "Left for later". Come back to it later, and say when.');
    expect(P9.later.notNow('', false)).toBe('They chose "Not now". Come back to it later, and say when.');
  });
  it('the web client: the tile ends the card, files the question (the question before "We\'re stuck" on that card), and never for the sample', () => {
    const main = readFileSync(join(__dirname, '..', '..', 'web', 'src', 'main.ts'), 'utf8');
    // (19 Nov, role-play round 5) the same question, through laterQuestion (core/turn.ts) for the person's own start
    expect(main).toContain("const q = laterQuestion(c.kind === 'repair' ? state.before?.asked ?? state.chain[0] ?? '' : c.asked);");
    // (phase 18: with the card it was left on, for "Ask it again")
    expect(main).toContain("if (q.trim() && !c.sample) leaveForLater(q, careTopic(c), laterNode(c.kind === 'repair' ? state.before : c));");
    expect(main).toContain("if (c.visit) { state.p4.visitRun = false; resetCard(); lift = true; go('visit'); return; }");
  });
});

// ---------------------------------------------------------------- item 10
import { howBlock } from '../../web/src/simple';

describe('10. P2 the first visit: the 4 steps folded to one line that keeps "Write the key word big."', () => {
  it('folded unless the carer opened it; the folded line keeps the key-word tip; the toggle opens it from the first visit', () => {
    const main = readFileSync(join(__dirname, '..', '..', 'web', 'src', 'main.ts'), 'utf8');
    expect(main).toContain('howOpen: state.settings.howFolded === false, topics:');
    expect(main).toContain("case 'how': state.settings.howFolded = !(state.settings.howFolded ?? true); saveSettings();");
    const folded = howBlock('', false);
    expect(folded).toContain('Write the key word big.');
    expect(folded).toContain('class="how-line"');
    expect(folded).not.toContain('<ol>');
  });
});

// ---------------------------------------------------------------- item 12
describe('12. the reload race: an immediate reload on an inner address keeps the screen', () => {
  it('the web client notes each drawn screen for this tab and, on a reload within 3 s that lost the address, opens it again', () => {
    const main = readFileSync(join(__dirname, '..', '..', 'web', 'src', 'main.ts'), 'utf8');
    expect(main).toContain("if (nav?.type !== 'reload' || hashNow() || onGuard()) return;");
    expect(main).toContain("d.h === 'demo' || typeof d.t !== 'number' || Date.now() - d.t > RACE_MS) return;");
    expect(main).toContain('function keepGuard() {\n  noteDrawn();');
    expect(main.indexOf('restoreRacedRoute();\nvoid Promise.all([load(), loadTrial()])')).toBeGreaterThan(0);
    // what is noted is the screen's name and the moment, nothing of the family
    expect(main).toContain("sessionStorage.setItem(DRAWN_KEY, JSON.stringify({ h: hashNow(), t: Date.now() }))");
  });
  it('e2e-simple waits for the diary before it reloads', () => {
    const e2e = readFileSync(join(__dirname, '..', '..', 'scripts', 'e2e-simple.py'), 'utf8');
    expect(e2e).toContain("page.goto(url + '#/diary')\n    # (phase 9, judge round 8 §7.5");
    expect(e2e).toContain("page.wait_for_selector('main.simple.diary')\n    page.reload()");
  });
});
