// Phase 10 (19 Nov 2026, design/PHASE10_BRIEF.md). 1: "His turn", the person starts: "I want to talk about…" with
// the family's people and places, the carer's line and three questions, the diary's "Frank started: Beth", and the
// worst cases (a need through it is never weaker than through the needs board; About them empty; nothing sent).
// 2: About them saved to a file and loaded from one: health notes off by default, Replace / Add / Cancel, and a file
// is never taken on trust (malformed, huge, <script> in a name, version 2).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BACKUP_MAX_BYTES, PEOPLE_CAP, addTo, backupText, makeBackup, previewOf, readBackup, replaceWith } from '../../core/backup';
import { P10 } from '../../core/copy10';
import { addEntry, answerEntry, diaryText, markDiary, needEntry, startedEntry, startedText, tags } from '../../core/diary';
import type { DeviceStatus, Engine, ModelResult } from '../../core/engine';
import { NO_HEALTH } from '../../core/insights';
import { needsCard } from '../../core/needs';
import { PHOTO_CAP, type Photo } from '../../core/photos';
import { BUILTIN } from '../../core/pictures';
import { makeCard } from '../../core/pipeline';
import { urgentAnswer } from '../../core/redflag';
import { after } from '../../core/tree';
import { STARTERS, TALK_PEOPLE, TALK_PLACES, laterQuestion, pages, starterOf, talkItems, talkLead, talkMenu, talkPick, topicMenu, turnCard, type TalkPick } from '../../core/turn';
import { EMPTY_PROFILE, type Card, type Profile } from '../../core/types';
import { backupBlock, importSheet } from '../../web/src/diary';
import { startedHtml } from '../../web/src/phase6';
import { turnButton } from '../../web/src/phase4';
import { WEEK } from './week';

const ROOT = join(__dirname, '..', '..');
const read = (f: string) => readFileSync(join(ROOT, f), 'utf8');
const MILLER: Profile = WEEK.profile;
const pagesOf = (c: Card | null | undefined): Card[] => { const out: Card[] = []; for (let p = c; p && p.turn === 'talk'; p = p.nextPage) out.push(p); return out; };
const answers = (c: Card) => c.choices.filter((x) => x.role === 'answer').map((x) => x.label);

/** An engine that fails the test if any model, on the device or in the cloud, is asked anything. */
const refuse = (): Engine => {
  const no = async (): Promise<ModelResult> => { throw new Error('no model may be asked in "His turn"'); };
  return {
    label: 'refuse', modes: { device: 'ONLY_ON_DEVICE', cloud: 'PREFER_IN_CLOUD' }, cloudConfigured: true,
    deviceStatus: async (): Promise<DeviceStatus> => 'available', prepareDevice: async () => {}, runDevice: no, runCloud: no,
    cloudRequest: (q: string) => ({ q }),
  } as unknown as Engine;
};

describe('1. the way in: the Home button and the home-screen shortcut', () => {
  it('the button has the person\'s own words first, with the name when About them has one', () => {
    expect(P10.turn.button('Frank')).toBe('Frank: I want to say something');
    expect(P10.turn.button('')).toBe('I want to say something');
    expect(turnButton('Frank')).toContain('data-act="turn"');
  });
  it('the manifest has a shortcut to the same screen (#/turn), with the same words, and the app opens it by that address', () => {
    const m = JSON.parse(read('web/public/manifest.webmanifest')) as { shortcuts: { name: string; url: string; icons: { src: string }[] }[] };
    expect(m.shortcuts).toHaveLength(1);
    expect(m.shortcuts[0]).toMatchObject({ name: P10.turn.shortcut, url: '/#/turn' });
    for (const i of m.shortcuts[0].icons) expect(read('web/public/manifest.webmanifest')).toContain(i.src);
    const main = read('web/src/main.ts');
    expect(main).toContain("if (h === 'turn') { openTurn(); history.replaceState(history.state, '', '#/person'); return 'person'; }");
    expect(main).toContain("case 'turn': openTurn(); lift = true; go('person'); break;");
  });
});

describe('1. the person\'s screen: "I want to talk about…"', () => {
  it('the second starter is "I want to talk about…"; the three starters stay three, with the way out', () => {
    expect(answers(turnCard())).toEqual(['I need something', 'I want to talk about…', 'I feel…']);
    expect(STARTERS.map((k) => starterOf(turnCard().choices[STARTERS.indexOf(k)].label))).toEqual(STARTERS);
  });
  it('the Miller family: "me", Beth and Tom, then the lake, church and the news / TV; never Carol, who holds the phone', () => {
    const ps = pagesOf(talkMenu(MILLER));
    expect(ps.map(answers)).toEqual([['me', 'Beth', 'Tom'], ['the lake', 'church', 'the news / TV']]);
    expect(ps.flatMap(answers)).not.toContain('Carol');
    for (const p of ps) {
      expect(p.asked).toBe('I want to talk about…');
      expect(p.choices.at(-1)).toMatchObject({ label: 'something else', role: 'escape' });
      expect(answers(p).length).toBeLessThanOrEqual(3);
      expect(p.source).toBe('code');
      expect(p.cloudPayload).toBeNull();
    }
    // people get their own photo or initial; places and the news a drawing of this app (a family photo of the place wins on screen)
    expect(ps[0].choices[1].picture).toEqual({ type: 'person', personId: 'p2', initial: 'B' });
    for (const x of ps[1].choices) if (x.picture.type === 'builtin') expect(BUILTIN.has(x.picture.id), x.label).toBe(true);
  });
  it('the last screen\'s "something else" leads to the topics as pictures (phase 4), so nothing is lost', () => {
    const ps = pagesOf(talkMenu(MILLER));
    expect(ps.at(-1)!.nextPage).toEqual(topicMenu());
  });
  it(`at most ${TALK_PEOPLE} people and ${TALK_PLACES} places, those who do not live there first, no name twice`, () => {
    const many: Profile = { ...MILLER, people: [{ id: 'a', name: 'Anna', relation: 'carer', household: true }, ...['Beth', 'Tom', 'Sue', 'Ray'].map((n, i) => ({ id: `x${i}`, name: n, relation: 'friend', household: false })), { id: 'z', name: 'beth', relation: 'niece', household: false }], places: ['the lake', 'church', 'the pub', ' '] };
    const xs = talkItems(many);
    expect(xs.filter((x) => x.kind === 'person').map((x) => x.word)).toEqual(['Beth', 'Tom', 'Sue']);
    expect(xs.filter((x) => x.kind === 'place').map((x) => x.word)).toEqual(['the lake', 'church']);
    expect(pagesOf(talkMenu(many)).length).toBeLessThanOrEqual(3);
  });
  it('a nickname is the word on the tile, as on every card', () => {
    const nick: Profile = { ...MILLER, people: [{ id: 'p9', name: 'Elizabeth', nickname: 'Beth', relation: 'daughter', household: false }] };
    expect(talkItems(nick).map((x) => x.word)).toContain('Beth');
    expect(talkPick('Beth', nick)).toMatchObject({ kind: 'person', word: 'Beth' });
  });
  it('worst case: About them empty: no people or places row, and the screen still works with two real choices', () => {
    const ps = pagesOf(talkMenu(EMPTY_PROFILE));
    expect(ps.map(answers)).toEqual([['me', 'the news / TV']]);
    expect(ps[0].choices.every((x) => x.picture.type !== 'person' || x.label === 'me')).toBe(true);
    expect(ps[0].nextPage).toEqual(topicMenu());
  });
  it('a screen never has one real choice: the last screen takes one from the screen before', () => {
    expect(pages([1, 2, 3, 4])).toEqual([[1, 2], [3, 4]]);
    expect(pages([1, 2, 3, 4, 5, 6, 7])).toEqual([[1, 2, 3], [4, 5], [6, 7]]);
    expect(pages([1, 2])).toEqual([[1, 2]]);
    for (let k = 0; k <= TALK_PEOPLE; k++) for (let j = 0; j <= TALK_PLACES; j++) {
      const p: Profile = { ...EMPTY_PROFILE, people: Array.from({ length: k }, (_, i) => ({ id: `q${i}`, name: `N${i}`, relation: 'friend', household: false })), places: Array.from({ length: j }, (_, i) => `place ${i}`) };
      for (const page of pagesOf(talkMenu(p))) expect(answers(page).length, `${k} people, ${j} places`).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('1. what the carer reads, and the three questions', () => {
  const pick = (label: string) => talkPick(label, MILLER)!;
  it('"Frank wants to talk about Beth.": the person\'s words first, never "patient", never "he" or "she"', () => {
    expect(talkLead(pick('Beth'), 'Frank').line).toBe('Frank wants to talk about Beth.');
    expect(talkLead(pick('the lake'), 'Frank').line).toBe('Frank wants to talk about the lake.');
    expect(talkLead(pick('the news / TV'), 'Frank').line).toBe('Frank wants to talk about the news, or something on TV.');
    expect(talkLead(pick('me'), 'Frank').line).toBe("Frank wants to talk about Frank's own news.");
    expect(talkLead(pick('me'), '').line).toBe('They want to talk about their own news.');
    for (const x of talkItems(MILLER)) for (const s of [talkLead(x, 'Frank').line, ...talkLead(x, 'Frank').ask]) expect(s).not.toMatch(/\b(?:patient|he|she|him|her|his|hers)\b/i);
  });
  it('three questions by the kind of thing picked: the telling first, an offer last', () => {
    expect(talkLead(pick('Beth'), 'Frank').ask).toEqual(['Is it good news, or a worry?', "Is it about Beth's visit?", 'Would you like to call Beth?']);
    expect(talkLead(pick('the lake'), 'Frank').ask).toEqual(['Did something happen at the lake?', 'Is it good news, or a worry?', 'Would you like to go to the lake?']);
    expect(talkLead(pick('the news / TV'), 'Frank').ask).toEqual(['Is it the news, or something on TV?', 'Is it good news, or a worry?', 'Shall we put the TV on?']);
    expect(talkLead(pick('me'), 'Frank').ask).toEqual(['Is it good news, or a worry?', 'Did something happen?', 'Do you want to tell me now or later?']);
    // someone who lives there is not visited or called: the telling only
    expect(talkLead({ kind: 'person', word: 'Anna', household: true }, 'Frank').ask).toEqual(['Is it good news, or a worry?', 'Did something happen with Anna?', 'Do you want to tell me now or later?']);
  });
  const all: TalkPick[] = [...talkItems(MILLER), { kind: 'person', word: 'Anna', household: true }];
  const qs = [...new Set(all.flatMap((x) => talkLead(x, 'Frank').ask))];
  it.each(qs)('"%s" is a card the rules make (no model on any device, nothing sent), and every answer leads on', async (q) => {
    for (const deviceReady of [false, true]) {
      const card = await makeCard(q, { profile: MILLER, support: 'more', engine: refuse(), allowCloud: true, deviceReady });
      expect(card.source, q).toBe('code');
      expect(card.cloudPayload, q).toBeNull();
      expect(card.blocked ?? null, q).toBeNull();
      expect(answers(card).length).toBeGreaterThanOrEqual(2);
      for (const ch of card.choices) {
        const step = after(card, ch.label, MILLER, [q]);
        expect(step.next.length > 0 || step.end !== '', `"${q}" -> ${ch.label}: a silent end`).toBe(true);
        expect(step.end).not.toMatch(/\{them\}|\{their\}|\{they\}/);
        for (const nq of step.next) expect((await makeCard(nq, { profile: MILLER, support: 'more', engine: refuse(), allowCloud: true, deviceReady })).source, nq).toBe('code');
      }
    }
  });
  it('the carer\'s screen gets them through the tree step, and the line through the start (web/src/main.ts)', () => {
    const main = read('web/src/main.ts');
    expect(main).toContain("if (c.turn === 'talk') return { follow: !out && state.p4.turn?.talk ? talkLead(state.p4.turn.talk, '').ask : [], end: '' };");
    expect(main).toContain("if (t.talk) return turnLine({ line: talkLead(t.talk, state.profile.personName.trim()).line, about: '' });");
    expect(main).toContain("const card = s === 'need' ? needsCard() : talkMenu(state.profile);");
  });
});

describe('1. the diary: "Frank started: Beth"', () => {
  const at = new Date(2026, 10, 22, 9, 0).getTime();
  it('the words on the screen and in the text are the same', () => {
    const e = startedEntry('Frank', 'Beth', at, 'people');
    expect(startedText(e)).toBe('Frank started: Beth');
    expect(startedText(startedEntry('', 'the lake', at, 'plans'))).toBe('They started: the lake');
    expect(startedHtml(e)).toBe('<span class="q">Frank started:</span> <b>Beth</b>');
    expect(diaryText([e], { log: {} as never, lessSure: 'less sure', need: 'Needed:' })).toContain('09:00  Frank started: Beth');
  });
  it('it counts as nothing, and the answer check never marks it "less sure": what the person chose to say is taken as said', () => {
    const e = startedEntry('Frank', 'Beth', at, 'people');
    expect(tags(e)).toEqual([]);
    expect(markDiary([e], at - 60_000, at + 60_000)[0].lessSure).toBeUndefined();
    // markup in a name stays text
    expect(startedHtml(startedEntry('<b>x</b>', '<img src=x>', at, 'people'))).not.toMatch(/<img|<b>x/);
  });
  it('web/src/main.ts writes it for a pick on the talk screen, the topics or "Who is it about?", and an answer otherwise', () => {
    const main = read('web/src/main.ts');
    expect(main).toContain("const started = c.turn === 'talk' || c.turn === 'topics' || c.turn === 'about' ? startedLabel(c, state.picked.label) : null;");
  });
});

describe('1. worst case: a need through "His turn" is never weaker than through the needs board', () => {
  it('"I need something" leads to the very same board: the same tiles, the same way out, made the same way', () => {
    expect(read('web/src/main.ts')).toContain("const card = s === 'need' ? needsCard() : talkMenu(state.profile);");
    const a = needsCard(); const b = needsCard();
    expect(b).toEqual(a);
    expect(a.kind).toBe('needs');
    expect(answers(a)).toEqual(expect.arrayContaining(['toilet', 'pain', "something's wrong"]));
  });
  it('the board\'s answer goes the board\'s way in web/src/main.ts: by the card\'s kind, never by who started it', () => {
    const main = read('web/src/main.ts');
    // the diary and the learned needs: the branch is `c.kind !== 'needs'` / else, with no `turn` in it
    const branch = main.slice(main.indexOf("} else if (c.kind !== 'needs') {"), main.indexOf('state.diary = addEntry(state.diary, needEntry(state.picked.label, at));'));
    expect(branch.length).toBeGreaterThan(0);
    expect(main).toContain('state.diary = addEntry(state.diary, needEntry(state.picked.label, at));');
    // the call box: by the question and the answer alone
    expect(main).toContain("if (state.picked && urgentAnswer(c.asked, state.picked.label)) p5.urgent = true;");
    expect(urgentAnswer(needsCard().asked, "something's wrong")).toBe(true);
    // the needs card is never a "turn" card, so nothing that skips turn cards (the answer check) can skip a need
    expect(needsCard().turn).toBeUndefined();
    expect(needEntry('pain', 1).kind).toBe('need');
    expect(tags(needEntry('pain', 1))).toEqual(['pain']);
    expect(tags(answerEntry({ q: 'x', label: 'y', at: 1 }))).toEqual([]);
  });
  it('a start written to the diary never takes the place of a need: they are separate entries', () => {
    const d = addEntry(addEntry([], needEntry('pain', 2)), startedEntry('Frank', 'Beth', 1, 'people'));
    expect(d.map((e) => e.kind)).toEqual(['started', 'need']);
    expect(d.flatMap(tags)).toEqual(['pain']);
  });
});

describe('1. nothing leaves the device: no request in "His turn"', () => {
  it('core/turn.ts and core/copy10.ts reach no engine and no network', () => {
    const turn = read('core/turn.ts');
    expect([...turn.matchAll(/^import .* from '([^']+)';$/gm)].map((x) => x[1]).sort()).toEqual(['./copy10', './copy4', './topics', './tree', './types']);
    expect(turn).not.toMatch(/fetch\(|engine\.|Engine|firebase|XMLHttpRequest|sendBeacon/);
    expect(read('core/copy10.ts')).not.toMatch(/^import /m);
  });
  it('no file that builds a prompt or a request imports the turn module', () => {
    for (const f of ['core/prompt.ts', 'core/requests.ts', 'core/strip.ts', 'core/pipeline.ts', 'core/engine.ts', 'core/narrow.ts', 'core/letter.ts', 'core/reword.ts', 'core/speak.ts', 'web/src/ai/firebaseEngine.ts', 'web/src/ai/pick.ts', 'web/src/ai/app.ts', 'web/src/ai/remoteConfig.ts']) expect(read(f), f).not.toMatch(/from '\.\/turn'|core\/turn'/);
  });
  it('the web client\'s "His turn" functions call no engine: openTurn, p4Confirm\'s start, turnHtml, startedLabel', () => {
    const main = read('web/src/main.ts');
    const fn = (name: string) => { const i = main.indexOf(`function ${name}(`); expect(i, name).toBeGreaterThan(0); return main.slice(i, main.indexOf('\n}\n', i)); };
    for (const name of ['openTurn', 'turnHtml', 'startedLabel']) expect(fn(name), name).not.toMatch(/engine|fetch\(|runCloud|runDevice|transcribe|speak\(/);
    const confirm = fn('p4Confirm');
    const turnPart = confirm.slice(confirm.indexOf("if (c.turn === 'start')"));
    expect(turnPart).not.toMatch(/engine|fetch\(|runCloud|runDevice/);
    // "I feel…" asks the rules' own question through make(): a question the rules make a card for, never a model
    expect(turnPart).toContain('void make(FEEL_QUESTION)');
  });
});

// ---------------------------------------------------------------- 2. About them: save to a file and load from a file
describe('2. About them in a file: health notes off by default, a round trip, never taken on trust', () => {
  const JPEG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAoHBwgHBgoICAgLCgoLDhgQDg0NDh0VFhEYIx8lJCIfIiEmKzcvJik0KSEiMEExNDk7Pj4+JS5ESUM8SDc9Pjv/';
  const NOW = new Date(2026, 10, 19, 10, 0).getTime();
  const photos: Photo[] = [{ id: 'ph1', word: 'Bo', data: JPEG, at: 1 }, { id: 'ph2', word: 'the lake', data: `${JPEG}A`, at: 2 }];
  const health = { ...WEEK.health, emergency: '999', swallowing: true };
  const ok = (text: string) => { const r = readBackup(text); if (!r.ok) throw new Error(r.error); return r; };
  const err = (o: unknown) => { const r = readBackup(typeof o === 'string' ? o : JSON.stringify(o)); return r.ok ? 'ok' : r.error; };

  it('the file names itself "talk-partner-about", version 1, with the date; never the diary or what was learned', () => {
    const j = JSON.parse(backupText(makeBackup(MILLER, photos, health, NOW))) as Record<string, unknown>;
    expect(j).toMatchObject({ format: 'talk-partner-about', version: 1, savedAt: new Date(NOW).toISOString() });
    expect(Object.keys(j).sort()).toEqual(['app', 'emergency', 'format', 'kind', 'photos', 'profile', 'savedAt', 'version']);
    expect(JSON.stringify(j)).not.toMatch(/diary|history|needsLog|learned|forgotten|lessSure/);
  });
  it('health notes are off by default: not in the file, and the emergency number is', () => {
    const text = backupText(makeBackup(MILLER, photos, health, NOW));
    expect(text).not.toMatch(/diabetes|swallowing|"health"|Dr Patel/i);
    expect(ok(text).backup).toMatchObject({ health: null, emergency: '999' });
    expect(ok(text).preview.health).toBeNull();
    // ticked: in the file, and back exactly
    expect(ok(backupText(makeBackup(MILLER, photos, health, NOW, true))).backup.health).toEqual(health);
    // the screen: the box starts unticked, and the save reads it, then unticks it
    const main = read('web/src/main.ts');
    expect(main).toContain('backupHealth: false,');
    expect(main).toContain("makeBackup(state.profile, state.photos, state.health, Date.now(), state.backupHealth)), 'application/json'); state.backupHealth = false;");
  });
  it('round trip: save -> load -> Replace = the same About them, photos and (ticked) health notes', () => {
    const b = ok(backupText(makeBackup(MILLER, photos, health, NOW, true))).backup;
    const back = replaceWith({ profile: EMPTY_PROFILE, photos: [], health: NO_HEALTH }, b);
    expect(back).toEqual({ profile: MILLER, photos, health });
    expect(backupText(makeBackup(back.profile, back.photos, back.health, NOW, true))).toBe(backupText(makeBackup(MILLER, photos, health, NOW, true)));
    // without health notes in the file, Replace keeps the health notes here
    const lean = ok(backupText(makeBackup(MILLER, photos, health, NOW))).backup;
    const here = { profile: EMPTY_PROFILE, photos: [], health: { ...NO_HEALTH, diabetes: true, emergency: '112' } };
    expect(replaceWith(here, lean).health).toEqual({ ...NO_HEALTH, diabetes: true, emergency: '999' });
  });
  it('a malformed file: refused in plain words, nothing changes', () => {
    expect(err('{"format": "talk-partner-about", "version": 1, ')).toBe('json');
    expect(err('')).toBe('json');
    expect(err(null)).toBe('kind');
    expect(err([])).toBe('kind');
    expect(err({ format: 'something-else', version: 1 })).toBe('kind');
    expect(err({ format: 'talk-partner-about', kind: 'diary', version: 1 })).toBe('kind');
    const g = JSON.parse(backupText(makeBackup(MILLER, photos, health, NOW, true))) as Record<string, any>;
    expect(err({ ...g, version: '1' })).toBe('shape');
    expect(err({ ...g, version: 1.5 })).toBe('shape');
    expect(err({ ...g, profile: { ...g.profile, people: 'Beth' } })).toBe('shape');
    expect(err({ ...g, health: 'diabetes' })).toBe('shape');
    expect(err({ ...g, photos: [{ ...g.photos[0], data: 'javascript:alert(1)' }] })).toBe('shape');
  });
  it('a version-2 file: "from a newer version of the app", not read', () => {
    const g = JSON.parse(backupText(makeBackup(MILLER, photos, health, NOW))) as Record<string, unknown>;
    expect(err({ ...g, version: 2 })).toBe('version');
    expect(P10.backup.bad.version).toBe('This file is from a newer version of the app. Update the app, then try again.');
  });
  it(`a huge file: over ${BACKUP_MAX_BYTES / 1024 / 1024} MB it is refused by its size, before it is read; a full family fits under it`, () => {
    expect(BACKUP_MAX_BYTES).toBe(8 * 1024 * 1024);
    expect(err('x'.repeat(BACKUP_MAX_BYTES + 1))).toBe('big');
    expect(readBackup('{}', BACKUP_MAX_BYTES + 1)).toEqual({ ok: false, error: 'big' });
    const main = read('web/src/main.ts');
    expect(main).toContain("if (file.size > BACKUP_MAX_BYTES) { shown({ ok: false, error: 'big' }); return; }");
    // the biggest About them the app keeps: 60 photos and 60 people with a photo, each a 320 px JPEG of 45 kB as a data URL
    const pic = `data:image/jpeg;base64,${'A'.repeat(45 * 1024)}`;
    const full: Profile = { ...MILLER, people: Array.from({ length: PEOPLE_CAP }, (_, i) => ({ id: `p${i}`, name: `Person ${i}`, relation: 'friend', household: false, photo: pic })) };
    const text = backupText(makeBackup(full, Array.from({ length: PHOTO_CAP }, (_, i) => ({ id: `f${i}`, word: `photo ${i}`, data: pic, at: i })), health, NOW, true));
    expect(text.length).toBeLessThan(BACKUP_MAX_BYTES);
    expect(ok(text).preview).toMatchObject({ people: PEOPLE_CAP, photos: PHOTO_CAP + PEOPLE_CAP });
  });
  it('a file with <script> in a name: kept as the words it is, and never drawn as HTML', () => {
    const g = JSON.parse(backupText(makeBackup(MILLER, photos, health, NOW))) as Record<string, any>;
    g.profile.personName = '<script>alert(1)</script>';
    g.profile.people[1].name = '<img src=x onerror=alert(2)>';
    g.profile.places = ['<b>lake</b>'];
    const r = ok(JSON.stringify(g));
    expect(r.backup.profile.personName).toBe('<script>alert(1)</script>');
    const sheet = importSheet(r.preview);
    expect(sheet).not.toMatch(/<script|<img|<b>lake/);
    expect(sheet).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    // and the talk screen, the carer's line and the diary line of "His turn" are text too
    const talk = pagesOf(talkMenu(r.backup.profile)).flatMap(answers);
    expect(talk).toContain('<img src=x onerror=alert(2)>');
    expect(startedHtml(startedEntry(r.backup.profile.personName, '<img src=x onerror=alert(2)>', 1, 'people'))).not.toMatch(/<script|<img/);
    expect(read('web/src/phase4.ts')).toContain('esc(m.line)');
  });
  it('unknown fields are dropped, field by field', () => {
    const g = JSON.parse(backupText(makeBackup(MILLER, photos, health, NOW, true))) as Record<string, any>;
    g.diary = [{ label: 'pain' }]; g.profile.admin = true; g.profile.people[0].token = 'x'; g.photos[0].src = 'https://example.com'; g.health.extra = 1;
    const b = ok(JSON.stringify(g)).backup;
    expect('diary' in b).toBe(false);
    expect(Object.keys(b.profile).sort()).toEqual(Object.keys(EMPTY_PROFILE).sort());
    expect('token' in b.profile.people[0]).toBe(false);
    expect(Object.keys(b.photos[0]).sort()).toEqual(['at', 'data', 'id', 'word']);
    expect('extra' in b.health!).toBe(false);
  });
  it('a file of phases 3 to 9 (app + kind, health notes always in it) still loads', () => {
    const old = { app: 'talk-partner', kind: 'about-them', version: 1, savedAt: new Date(NOW).toISOString(), profile: MILLER, photos, health };
    expect(ok(JSON.stringify(old)).backup).toMatchObject({ profile: MILLER, photos, health, emergency: '999' });
  });
});

describe('2. Replace, Add or Cancel: nothing changes until the carer picks', () => {
  const JPEG = 'data:image/jpeg;base64,/9j/4AAQ';
  const here = { profile: { ...EMPTY_PROFILE, personName: 'Frank', people: [{ id: 'p2', name: 'Beth', relation: 'daughter', household: false }], foods: ['tea'], places: ['the lake'] }, photos: [{ id: 'ph1', word: 'Bo', data: JPEG, at: 1 }], health: { ...NO_HEALTH, swallowing: true, text: 'Soft food.', emergency: '112' } };
  const file = makeBackup({ ...EMPTY_PROFILE, personName: 'Francis', partnerName: 'Carol', people: [{ id: 'p2', name: 'beth', relation: 'daughter', household: false }, { id: 'p2b', name: 'Tom', relation: 'brother', household: false }], foods: ['Tea', 'ginger biscuits'], places: ['church'] }, [{ id: 'ph1', word: 'lake', data: `${JPEG}B`, at: 2 }, { id: 'ph9', word: 'Bo', data: JPEG, at: 3 }], { ...NO_HEALTH, diabetes: true, text: 'Type 2.', emergency: '999' }, 5, true);
  it('Add: nothing here is removed or changed; new people, words and photos are added, the same ones once', () => {
    const r = addTo(here, file);
    expect(r.profile.personName).toBe('Frank');
    expect(r.profile.partnerName).toBe('Carol');
    expect(r.profile.people.map((x) => x.name)).toEqual(['Beth', 'Tom']);
    expect(r.profile.foods).toEqual(['tea', 'ginger biscuits']);
    expect(r.profile.places).toEqual(['the lake', 'church']);
    // the same picture once; a photo id that is taken here gets a new one
    expect(r.photos.map((x) => [x.id, x.word])).toEqual([['ph1', 'Bo'], ['ph1-2', 'lake']]);
    expect(new Set(r.photos.map((x) => x.id)).size).toBe(r.photos.length);
    expect(r.skipped).toBe(0);
  });
  it('Add: a health toggle on in either stays on (a swallowing difficulty is never lost); the file\'s words go under the words here', () => {
    const h = addTo(here, file).health;
    expect(h).toMatchObject({ swallowing: true, diabetes: true, text: 'Soft food.\nType 2.', emergency: '112' });
    // a file without health notes changes none
    expect(addTo(here, { ...file, health: null }).health).toEqual(here.health);
  });
  it('Add: past the cap of 60 photos, what does not fit is left out and counted', () => {
    const many = { ...here, photos: Array.from({ length: PHOTO_CAP - 1 }, (_, i) => ({ id: `h${i}`, word: `w${i}`, data: `${JPEG}${i}`, at: i })) };
    const r = addTo(many, { ...file, photos: [0, 1, 2].map((i) => ({ id: `n${i}`, word: `n${i}`, data: `${JPEG}n${i}`, at: i })) });
    expect(r.photos).toHaveLength(PHOTO_CAP);
    expect(r.skipped).toBe(2);
    expect(`${P10.backup.added}${P10.backup.full(2)}`).toBe('What was in the file was added to About them. 2 photos did not fit: the app keeps 60.');
  });
  it('Replace: About them and the photos become the file\'s', () => {
    const r = replaceWith(here, file);
    expect(r.profile).toEqual(file.profile);
    expect(r.photos).toEqual(file.photos);
    expect(r.health).toEqual(file.health);
  });
  it('the screen: Replace, Add and Cancel; the file is only read into a draft; Back and Escape close it with nothing changed', () => {
    const main = read('web/src/main.ts');
    expect(main).toContain("case 'import-replace':");
    expect(main).toContain("case 'import-add':");
    expect(main).toContain("case 'import-no': state.importDraft = null; render(); break;");
    expect(main).toContain('if (state.importDraft) { state.importDraft = null; return from; }');
    // reading a file sets the draft and nothing else: the profile, the photos and the health notes are written only under the two buttons
    const load = main.slice(main.indexOf("t.id === 'backup-file'"), main.indexOf('return;\n  }', main.indexOf("t.id === 'backup-file'")));
    expect(load).not.toMatch(/state\.profile =|state\.photos =|state\.health =|kvSet/);
    const sheet = importSheet(previewOf(file));
    for (const t of [P10.backup.replace, P10.backup.add, P10.backup.cancel]) expect(sheet).toContain(t);
  });
  it('the one plain line on what it is for is on the screen', () => {
    expect(P10.backup.use).toBe("Use it to move to a new phone, to set up a second carer's phone, or as a spare copy.");
    expect(backupBlock({ error: '', done: '', health: false })).toContain(P10.backup.use);
  });
});

describe('phase 10, role-play round 5: "Not now" on the person\'s own start', () => {
  it('on the starters and on "I want to talk about…" the carer keeps a question they can ask, not the helper line or the person\'s words', () => {
    expect(laterQuestion(turnCard().asked)).toBe(P10.turn.laterAsk);
    expect(laterQuestion(P10.turn.talkAsk)).toBe(P10.turn.laterAsk);
    expect(P10.turn.laterAsk.endsWith('?')).toBe(true);
  });
  it('a need, a feeling and pain are kept as they were asked (they stay pinned as care questions)', () => {
    for (const q of ['What do you need?', 'How are you feeling today?', 'Are you in pain?', 'Where does it hurt?']) expect(laterQuestion(q)).toBe(q);
  });
  it('the person\'s "Not now" goes through laterQuestion before it is kept', () => {
    const main = readFileSync(join(__dirname, '../../web/src/main.ts'), 'utf8');
    expect(main).toContain("const q = laterQuestion(c.kind === 'repair'");
  });
});
