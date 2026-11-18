// The privacy boundary and the screen rules of phase 4, pinned from the source and by running it:
//   - the first-letter module, the one new step that can reach online help, does not know the learned preferences,
//     the photos, the journal, the health notes or the visit answers; the web client hands its cloud step nothing but
//     the question and the letter;
//   - "the person starts", "before a doctor visit" and the rules of "talk about a photo" have no cloud step at all;
//   - the consent sheet is the only way the letter step reaches online help when it is off;
//   - on the person's screens: three choices and a way out at most (the alphabet is the one exception), no score;
//   - every word of phase 4 is plain and adult: no exclamation mark, no praise, no "him" or "her".
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { COPY } from '../../core/copy';
import { P4 } from '../../core/copy4';
import { MENU, aboutCard, topicMenu, turnCard } from '../../core/turn';
import type { Card, Choice } from '../../core/types';
import { answeredScreen, cardScreen, homeScreen, type AnsweredModel } from '../../web/src/simple';
import { letterButton, letterBy, p4Links, turnButton } from '../../web/src/phase4';

const ROOT = join(__dirname, '..', '..');
const read = (f: string) => readFileSync(join(ROOT, f), 'utf8');
const imports = (f: string) => [...read(f).matchAll(/^import [^;]*? from '([^']+)';$/gms)].map((m) => m[1]);
const flat = (o: unknown): string[] => (typeof o === 'string' ? [o] : typeof o === 'function' ? [String((o as (...a: string[]) => unknown)('Frank', 'B', 'x'))] : Array.isArray(o) ? o.flatMap(flat) : o && typeof o === 'object' ? Object.values(o).flatMap(flat) : []);

describe('what the new modules can reach', () => {
  const PERSONAL = ['prefs', 'photos', 'diary', 'insights', 'reliability', 'tip', 'backup', 'history', 'visit', 'summary'];
  it('core/letter.ts builds a cloud text: it imports none of the personal stores (learned words come in as plain words, for the device only)', () => {
    for (const i of imports('core/letter.ts')) expect(PERSONAL.some((m) => i.endsWith(`/${m}`)), i).toBe(false);
    expect(imports('core/letter.ts').sort()).toEqual(['./copy4', './engine', './kinds', './pipeline', './prompt', './rules', './strip', './types']);
  });
  it('the cloud text of the letter step is made from the question and the letter alone: its function takes nothing else', () => {
    const src = read('core/letter.ts');
    expect(src).toContain('export function letterCloudText(asked: string, letter: string, profile: Profile)');
    const fn = src.slice(src.indexOf('export function letterCloudText('), src.indexOf('/** The text the on-device step gets.'));
    expect(fn).not.toMatch(/rejected|learned|ownWords|EVERYDAY/);
    expect(fn).toContain('stripQuestion(asked, profile)');
    // and the leak gate stands before the call
    expect(src.indexOf('findLeaks(stripped.text, profile)')).toBeLessThan(src.indexOf('engine.runCloud(stripped.text)'));
    expect(src.indexOf('if (!env.allowCloud)')).toBeLessThan(src.indexOf('engine.runCloud(stripped.text)'));
  });
  it.each(['core/turn.ts', 'core/visit.ts', 'core/copy4.ts', 'web/src/phase4.ts'])('%s has no cloud call, no request and no network', (f) => {
    expect(read(f)).not.toMatch(/runCloud|rewordCloud|cloudRequest\(|transcribe\(|fetch\(|XMLHttpRequest|sendBeacon|WebSocket/);
  });
  it('core/phototalk.ts and core/visit.ts make their rule cards with an engine that cannot run a model', () => {
    for (const f of ['core/phototalk.ts', 'core/visit.ts']) expect(read(f)).toMatch(/makeCard\([^)]*\{ profile, support, engine: NO_MODEL, allowCloud: false, deviceReady: false \}\)/);
  });
  it('the engine: the one new call is the on-device photo step; no new cloud model, mode or library', () => {
    const src = read('web/src/ai/firebaseEngine.ts');
    // (18 Nov, phase 5: Read aloud is the eighth model and the fourth cloud mode line: a text-to-speech model, ONLY_IN_CLOUD)
    expect(src.match(/getGenerativeModel\(/g)).toHaveLength(8);
    expect(src.match(/InferenceMode\.(?:PREFER_IN_CLOUD|ONLY_IN_CLOUD)/g)).toHaveLength(4);
    expect(src).not.toMatch(/InferenceMode\.PREFER_ON_DEVICE/);
  });
});

describe('the web client', () => {
  const main = read('web/src/main.ts');
  it('the letter step gets the profile, the settings and the letter input; the learned words go in as words', () => {
    const call = main.match(/await letterCard\([\s\S]*?\}\);/)![0];
    expect(call).toContain('allowCloud: state.settings.cloudHelp');
    expect(call).not.toMatch(/history|diary|health|photos|visit/);
  });
  it('with online help off, the letter step reaches it only through the sheet: the yes on it asks the step again', () => {
    expect(main).toContain("if (c.letter) return `${screen.replace('<main class=\"simple', '<main inert aria-hidden=\"true\" class=\"simple')}${letterSheet({");
    expect(main).toContain('if (state.card?.letter && state.p4.letterPending) void runLetter(state.p4.letterPending);');
    expect(main.match(/runLetter\(/g)!.length).toBe(4); // its definition, the tap on a letter, "more words", the yes on the sheet
  });
  it('the doctor-visit questions and the person\'s start call no engine', () => {
    const p4 = main.slice(main.indexOf('// ---------------------------------------------------------------- phase 4:'), main.indexOf('// ---------------------------------------------------------------- render'));
    const visit = p4.slice(p4.indexOf('async function visitNext('), p4.indexOf('function talkQuestions('));
    expect(visit).not.toMatch(/state\.engine|makeCard|narrowCard|letterCard/);
    expect(p4.slice(p4.indexOf('function p4Confirm('), p4.indexOf('function turnHtml('))).not.toMatch(/state\.engine|narrowCard|letterCard/);
  });
  it('"Delete everything on this phone" removes the visit answers too', () => {
    expect(main.split("case 'delete-all':")[1].split('break;')[0]).toContain('state.p4.visit = null;');
  });
});

describe('the person\'s screens: three choices and a way out at most; no score', () => {
  const pages = (c: Card): Card[] => { const out: Card[] = []; for (let p: Card | null | undefined = c; p; p = p.nextPage) out.push(p); return out; };
  it('the starters, both screens of the topic menu, and every "what is it about" card', () => {
    for (const c of [turnCard(), ...pages(topicMenu())]) {
      expect(c.choices.filter((x) => x.role === 'answer')).toHaveLength(3);
      expect(c.choices.filter((x) => x.role === 'escape')).toHaveLength(1);
      expect(c.choices).toHaveLength(4);
    }
    const five = { personName: 'Frank', partnerName: 'Carol', people: ['Ann', 'Beth', 'Cy', 'Di', 'Ed'].map((n, i) => ({ id: `p${i}`, name: n, relation: '', household: false })), foods: [], places: [], tv: [], music: [], other: [] };
    for (const t of MENU) {
      const c = aboutCard(t, five);
      if (!c) continue;
      expect(c.choices.filter((x) => x.role === 'answer').length, t).toBeLessThanOrEqual(3);
      expect(c.choices.filter((x) => x.role === 'escape'), t).toHaveLength(1);
    }
  });
  it('no word of phase 4 that the person sees holds a number, a score or a mark', () => {
    for (const s of [P4.letter.ask, P4.letter.point, P4.letter.no, P4.turn.ask, P4.turn.topicsAsk, ...Object.values(P4.turn.aboutAsk), ...Object.values(P4.turn.aboutChoices).flat(), ...Object.values(P4.turn.starters), P4.photo.q.feel, P4.photo.q.show, P4.photo.q.things]) expect(s).not.toMatch(/\d|score|point[s]? for|wrong|correct|less sure/i);
  });
});

describe('the carer\'s screens', () => {
  const made = { maker: 'code' as const, left: 'nothing' as const, spoken: false, lines: ['Made by the app\'s rules.', 'Nothing was sent.'] };
  const base: AnsweredModel = { name: 'Frank', label: 'something else', question: 'Would you like tea or coffee?', more: false, out: true, afterHtml: '', next: null, follow: [], end: '', tryNext: 'Would you like a hot drink or a cold drink?', narrow: 'ask', narrowLast: false, short: null, who: false, invite: false, hasAnswers: false, today: [], made, privacy: ['x'] };
  const outButtons = (html: string) => [...html.slice(html.indexOf('id="after-out"'), html.indexOf('id="left-line"')).matchAll(/<button/g)].length;
  it('after "something else" the first letter is offered, and still three things at most stand on the screen; the rest is the first thing under "More"', () => {
    const html = answeredScreen({ ...base, outExtra: letterButton('Frank') });
    expect(outButtons(html)).toBe(3);
    expect(html.slice(html.indexOf('id="after-out"'), html.indexOf('id="left-line"'))).toContain('id="letter-go"');
    expect(html).not.toContain('id="show-write"');
    const open = answeredScreen({ ...base, more: true, outExtra: letterButton('Frank') });
    expect(open.slice(open.indexOf('id="out-more"'))).toContain('id="show-write"');
  });
  it('with nothing else to offer, the first letter and "Ask them to show or write it" both stand', () => {
    const html = answeredScreen({ ...base, tryNext: null, narrow: null, outExtra: letterButton('Frank') });
    expect(outButtons(html)).toBe(2);
    expect(html).toContain('id="show-write"');
  });
  it('the first screen: the person\'s button stands between the quick needs and "How it works", the two ways in under the diary', () => {
    const html = homeScreen({ name: 'Frank', aboutLink: true, busy: false, error: null, question: '', howOpen: false, topics: [], topicOpen: null, aiTag: '', ai: [''], privacy: [''], micHtml: '', voiceHtml: '', diaryHtml: p4Links('Frank'), turnHtml: turnButton('Frank') });
    expect(html.indexOf('data-act="needs"')).toBeLessThan(html.indexOf('id="turn-go"'));
    expect(html.indexOf('id="turn-go"')).toBeLessThan(html.indexOf('id="how"'));
    expect(html.indexOf('id="visit-link"')).toBeGreaterThan(html.indexOf('id="ask"'));
    expect(html).toContain('href="#/phototalk"');
  });
  it('a first-letter card says on the carer\'s screen who found its words', () => {
    expect(letterBy('rules')).toContain(P4.letter.byRules);
    expect(letterBy('cloud')).toContain('It got the question and the letter, nothing from About them.');
    const ch = (label: string, role: Choice['role']): Choice => ({ label, spoken: label, role, picture: { type: 'word' } });
    const card: Card = { asked: 'It starts with B. Is it one of these?', pending: null, topic: '', kind: 'choice', choices: [ch('Bo', 'answer'), ch('something else', 'escape')], say: 'x', source: 'code', route: { to: 'device', reasons: [] }, cloudPayload: null, notes: [], ms: 0, letter: { letter: 'B', rejected: [], by: 'rules' } };
    const html = cardScreen({ name: 'Frank', card, less: false, recap: false, recapText: '', recapDone: false, actions: [], made, personHtml: '', canAskOnline: false, offline: false, lastTime: '', extraHtml: letterBy('rules') });
    expect(html).toContain('id="letter-by"');
  });
});

describe('every word of phase 4 is plain and adult', () => {
  const words = flat(P4);
  it('no exclamation mark, no praise, no childish word', () => {
    expect(words.length).toBeGreaterThan(90);
    for (const w of words) expect(w, w).not.toMatch(/!|well done|good job|great|awesome|clever|brave|sweetie|dear\b|good boy|good girl|let's play|fun!/i);
  });
  it('never "he", "she", "him", "her" or "his": the name, or "they"', () => {
    for (const w of words) expect(w, w).not.toMatch(/\b(?:he|she|him|her|his|hers)\b/i);
  });
  it('nothing medical is advised: no dose, medicine by name, diagnosis or "should"', () => {
    for (const w of words) expect(w, w).not.toMatch(/\b(?:mg|dose|diagnos\w*|insulin|aspirin|should|must)\b/i);
  });
  it('the sheet of the letter step uses the data-use line of every other sheet', () => {
    expect(COPY.consent.sheet.data).toMatch(/Google/);
  });
});
