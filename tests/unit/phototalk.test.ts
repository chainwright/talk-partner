// "Talk about a photo" (core/phototalk.ts). Pinned: never a test question; the rules' three questions come from the
// photo's word and About them; what the on-device model names is checked word by word (worst cases: words about a
// person's looks, age, health or mood never reach a card); and the boundary: a photo has no cloud path at all.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { P4 } from '../../core/copy4';
import { NullEngine } from '../../core/engine';
import { makeCard } from '../../core/pipeline';
import { LOOK_PROMPT, LOOK_SCHEMA, LOOK_SYSTEM_PROMPT, checkedThings, photoCard, photoEnd, photoKind, photoQuestions, photoTalkCard, thingsQuestion } from '../../core/phototalk';
import { EMPTY_PROFILE, type Profile } from '../../core/types';
import { photoTalkScreen } from '../../web/src/phase4';

const ROOT = join(__dirname, '..', '..');
const read = (f: string) => readFileSync(join(ROOT, f), 'utf8');
const MILLER: Profile = {
  personName: 'Frank', partnerName: 'Carol',
  people: [{ id: 'p1', name: 'Carol', relation: 'wife', household: true }, { id: 'p2', name: 'Beth', relation: 'daughter', household: false }, { id: 'p3', name: 'Tom', relation: 'brother', household: false }],
  foods: ['ginger biscuits'], places: ['the lake'], tv: [], music: [], other: ['Bo (dog)'],
};
const photo = (word: string, id = word) => ({ id, word, data: 'data:image/jpeg;base64,AAAA', at: 1 });

describe('the rules\' questions: from the photo\'s word and About them', () => {
  it('what the word is, by About them only (never a guess from the picture)', () => {
    expect([photoKind('Beth', MILLER), photoKind('the lake', MILLER), photoKind('Lake', MILLER), photoKind('ginger biscuits', MILLER), photoKind('Bo', MILLER)]).toEqual(['person', 'place', 'place', 'food', 'other']);
  });
  it('a person who lives elsewhere: a call, how the photo feels, and who to show it to (not that person)', () => {
    expect(photoQuestions('Beth', MILLER)).toEqual([{ q: 'Would you like to call Beth?' }, { q: 'How does this photo make you feel?', choices: ['good', 'mixed', 'sad'] }, { q: 'Shall we show this photo to Tom?' }]);
  });
  it('a place, a food, anything else', () => {
    expect(photoQuestions('the lake', MILLER)[0].q).toBe('Would you like to go to the lake again?');
    expect(photoQuestions('ginger biscuits', MILLER)[0].q).toBe('Would you like ginger biscuits?');
    expect(photoQuestions('Bo', MILLER)[0].q).toBe('Shall we talk more about Bo?');
    expect(photoQuestions('Bo', MILLER)[2]).toEqual({ q: 'Who shall we show this photo to?', choices: ['Beth', 'Tom'], out: 'someone else' });
    expect(photoQuestions('mug', EMPTY_PROFILE)[2].q).toBe('Would you like to look at another photo?');
  });
  it('never a test: no "Who is this?", "What is this?", "Do you remember" in any question for any word', () => {
    for (const w of ['Beth', 'Carol', 'the lake', 'ginger biscuits', 'Bo', 'mug']) for (const q of [...photoQuestions(w, MILLER), ...photoQuestions(w, EMPTY_PROFILE)]) expect(q.q).not.toMatch(/who is|what is|where is this|where was|remember|do you know|name\b/i);
    expect(JSON.stringify(P4.photo.q)).not.toMatch(/who is|what is this|remember/i);
  });
  it('every question becomes a card with no model: fixed choices, or the app\'s rules (three choices at most, one way out)', async () => {
    for (const w of ['Beth', 'the lake', 'ginger biscuits', 'Bo']) for (const q of photoQuestions(w, MILLER)) {
      const card = await photoTalkCard(q, MILLER, 'more');
      expect(card.blocked ?? null, q.q).toBeNull();
      expect(card.source).toBe('code');
      expect(card.cloudPayload).toBeNull();
      expect(card.unsentPayload ?? null).toBeNull();
      expect(card.photoTalk).toBe('rules');
      expect(card.choices.filter((x) => x.role === 'answer').length).toBeLessThanOrEqual(3);
      expect(card.choices.filter((x) => x.role === 'escape')).toHaveLength(1);
    }
  });
  it('the rules themselves refuse the test question this feature never asks', async () => {
    const card = await makeCard('Who is this?', { profile: MILLER, support: 'more', engine: new NullEngine(), allowCloud: false, deviceReady: false });
    expect(card.choices.filter((x) => x.role === 'answer' && /Beth|Tom/.test(x.label))).toEqual([]);
  });
});

describe('health safety: a sad answer about a photo is taken as said', () => {
  it('"sad" tells the carer to stay near and offers to put the photo away; nothing says later, tired or less sure', () => {
    const sad = photoEnd('How does this photo make you feel?', 'sad', 'Frank');
    expect(sad).toBe('This photo makes Frank sad. Stay near: you do not have to fix it. Ask whether to put it away.');
    for (const l of ['good', 'mixed', 'sad']) expect(photoEnd('How does this photo make you feel?', l, '')).not.toMatch(/later|tired|less sure|cheer|never mind|only a photo/i);
    expect(photoEnd('How does this photo make you feel?', 'something else', 'Frank')).toBe('');
    expect(photoEnd('Would you like to call Beth?', 'yes', 'Frank')).toBe('');
  });
});

describe('what the on-device model names: checked word by word', () => {
  const j = (things: unknown) => JSON.stringify({ things });
  it('plain things stand: lower case, no article, none twice, four at most, not the photo\'s own word', () => {
    expect(checkedThings(j(['Dog', 'a garden', 'dog', 'cake', 'boat', 'tree']), '')).toEqual(['dog', 'garden', 'cake', 'boat']);
    expect(checkedThings(j(['mug', 'table']), 'mug')).toEqual(['table']);
  });
  it('worst case: anything about a person, their looks, age, health or mood is dropped, whatever the model said', () => {
    expect(checkedThings(j(['old man', 'wheelchair', 'sad woman', 'hospital bed', 'dog']))).toEqual(['dog']);
    expect(checkedThings(j(['grey hair', 'crying child', 'walker', 'bandage', 'grave', 'cake']))).toEqual(['cake']);
    expect(checkedThings(j(['fat', 'drunk', 'people', 'baby']))).toEqual([]);
  });
  it('an answer that is not the asked JSON, a long phrase, a non-word: nothing', () => {
    expect(checkedThings('The photo shows a dog.')).toEqual([]);
    expect(checkedThings(j('dog'))).toEqual([]);
    expect(checkedThings(j(['a very large brown dog', 42, '', '12345']))).toEqual([]);
  });
  it('fewer than two words give no question; with two or three it is a choice card marked as the on-device model\'s', () => {
    expect(thingsQuestion(['dog'])).toBeNull();
    const q = thingsQuestion(['dog', 'garden', 'cake', 'boat'])!;
    expect(q).toEqual({ q: 'What in this photo shall we talk about?', choices: ['dog', 'garden', 'cake'], ai: true });
    const card = photoCard(q, MILLER, 'more');
    expect(card.photoTalk).toBe('device');
    expect(card.source).toBe('on-device');
    expect(card.cloudPayload).toBeNull();
    expect(card.choices.at(-1)).toMatchObject({ label: 'something else', role: 'escape' });
  });
  it('the fixed instruction tells the model to say nothing about people, and holds nothing of About them', () => {
    expect(LOOK_SYSTEM_PROMPT).toMatch(/Do not name, describe or guess anything about people/);
    expect(`${LOOK_SYSTEM_PROMPT}${LOOK_PROMPT}`).not.toMatch(/Frank|Carol|Beth|\$\{/);
    expect(LOOK_SCHEMA.properties.things.maxItems).toBe(4);
  });
});

describe('the boundary: a family photo has no cloud path', () => {
  it('core/phototalk.ts builds no request and calls no engine; its one engine cannot run a model', () => {
    const src = read('core/phototalk.ts');
    expect(src).not.toMatch(/runCloud|cloudRequest|rewordCloud|fetch\(|firebase|stripQuestion/);
    expect(src).toContain('const NO_MODEL = new NullEngine();');
  });
  it('the engine\'s photo step is ONLY_ON_DEVICE on the no-App-Check app, names no cloud model, and throws on any other source', () => {
    const src = read('web/src/ai/firebaseEngine.ts');
    const look = src.slice(src.indexOf('async lookDevice('), src.indexOf('   * The same wording step by the cloud model'));
    expect(look).toContain('getGenerativeModel(this.local, {');
    expect(look).toContain('mode: InferenceMode.ONLY_ON_DEVICE');
    expect(look).not.toMatch(/inCloudParams|PREFER_|ONLY_IN_CLOUD|this\.ai\b|textModel/);
    expect(look).toContain("if (r.response.inferenceSource !== InferenceSource.ON_DEVICE) throw new Error(\"the photo step didn't run on this computer\");");
  });
  it('the web client: a photo\'s data goes to the screen and to that one on-device call, after the carer\'s tap; never to a card call or a cloud call', () => {
    const main = read('web/src/main.ts');
    expect(main.match(/lookDevice\(/g)).toHaveLength(1);
    expect(main).toContain("case 'pt-look': void lookAtPhoto(); break;");
    const fn = main.slice(main.indexOf('async function lookAtPhoto('), main.indexOf('async function askAboutPhoto('));
    expect(fn).toContain("if (!t || !photo || !state.engine.lookDevice || state.device !== 'available') return;");
    expect(fn).toContain("if (r.source === 'on-device') things = checkedThings(r.text, photo.word);");
    expect(fn).not.toMatch(/runCloud|rewordCloud|cloudHelp/);
    for (const m of main.matchAll(/(?:runCloud|rewordCloud|transcribe)\(([^)]*)\)/g)) expect(m[1]).not.toMatch(/photo|data/i);
  });
  it('no vision library came in: firebase is still the only dependency', () => {
    expect(Object.keys((JSON.parse(read('package.json')) as { dependencies: Record<string, string> }).dependencies)).toEqual(['firebase']);
  });
});

describe('the carer\'s screen', () => {
  it('no photos: says so and leads to About them; the lock line is always there', () => {
    const h = photoTalkScreen({ name: 'Frank', photos: [], picked: null, questions: [], look: null });
    expect(h).toContain(P4.photo.none);
    expect(h).toContain(P4.photo.lock);
  });
  it('a picked photo: its questions as buttons; where there is no model on the device, no button offers one and the line says rules', () => {
    const p = photo('Beth');
    const h = photoTalkScreen({ name: 'Frank', photos: [p, photo('Bo')], picked: p, questions: photoQuestions('Beth', MILLER), look: null });
    expect([...h.matchAll(/data-act="pt-ask"/g)]).toHaveLength(3);
    expect(h).not.toContain('pt-look');
    expect(h).toContain(P4.photo.byRules);
  });
  it('where the on-device model can look: one button, and the line that the photo is not sent; after it looked, the line says so', () => {
    const p = photo('Bo');
    expect(photoTalkScreen({ name: '', photos: [p], picked: p, questions: photoQuestions('Bo', MILLER), look: 'ask' })).toContain(P4.photo.lookWhy);
    const done = photoTalkScreen({ name: '', photos: [p], picked: p, questions: [...photoQuestions('Bo', MILLER), thingsQuestion(['dog', 'garden'])!], look: 'done' });
    expect(done).toContain(P4.photo.byDevice);
    expect(done).toContain('data-ai="1"');
  });
});
