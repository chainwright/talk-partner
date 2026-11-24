// The first-letter helper (core/letter.ts). Pinned: the brief's case ("B" with Beth, Bo and biscuits in About them
// gives those three, by rules, with no model call); About them before everyday words; nothing refused comes back; a
// model is asked only when the rules find fewer than two words; the cloud text holds the question and the letter and
// nothing of About them, whatever the family typed; without the carer's yes nothing is sent and the card holds the
// exact text for the sheet; and what a model may not put on a card (worst cases).
import { describe, expect, it } from 'vitest';
import { P4 } from '../../core/copy4';
import type { DeviceStatus, Engine, ModelResult } from '../../core/engine';
import { LETTER_AGE } from '../../core/prompt';
import { EVERYDAY, LETTERS, LETTER_CLOUD_TASK, LETTER_COLUMNS, letterCard, letterEnd, letterLabel, letterChoices, letterCloudText, letterDeviceAsk, letterWords, ownWords, startsWith } from '../../core/letter';
import { cloudTextRequest } from '../../core/requests';
import { BUILTIN } from '../../core/pictures';
import { SAMPLE_PROFILE } from '../../core/sample';
import { letterGrid, letterSheet } from '../../web/src/phase4';
import { EMPTY_PROFILE, type Profile } from '../../core/types';

const MILLER: Profile = {
  personName: 'Frank', partnerName: 'Carol',
  people: [{ id: 'p1', name: 'Carol', relation: 'wife', household: true }, { id: 'p2', name: 'Beth', relation: 'daughter', household: false }, { id: 'p3', name: 'Tom', relation: 'brother', household: false }],
  foods: ['biscuits', 'porridge'], places: ['the lake', 'church'], tv: ['football'], music: [], other: ['Bo (dog)'],
};

class Fake implements Engine {
  readonly label = 'fake';
  readonly modes = { device: 'ONLY_ON_DEVICE', cloud: 'PREFER_IN_CLOUD' };
  device: string[] = [];
  cloud: string[] = [];
  constructor(public cloudConfigured: boolean, private answers: { device?: string[] | Error; cloud?: string[] | Error } = {}) {}
  async deviceStatus(): Promise<DeviceStatus> { return 'available'; }
  async prepareDevice(): Promise<void> { /* nothing to prepare */ }
  private out(xs: string[] | Error | undefined, source: ModelResult['source']): ModelResult { if (!xs || xs instanceof Error) throw xs ?? new Error('no answer'); return { text: JSON.stringify({ topic: '', kind: 'choice', choices: xs }), source, ms: 4 }; }
  async runDevice(prompt: string): Promise<ModelResult> { this.device.push(prompt); return this.out(this.answers.device, 'on-device'); }
  cloudRequest(q: string): unknown { return cloudTextRequest(q); }
  async runCloud(q: string): Promise<ModelResult> { this.cloud.push(q); return this.out(this.answers.cloud, 'in-cloud'); }
}
const env = (engine: Engine, profile: Profile, o: { allowCloud?: boolean; deviceReady?: boolean } = {}) => ({ profile, support: 'more' as const, engine, allowCloud: !!o.allowCloud, deviceReady: !!o.deviceReady });
const labels = (c: { choices: { label: string; role: string }[] }) => c.choices.filter((x) => x.role === 'answer').map((x) => x.label);

describe('the brief\'s case: "B" with Beth, Bo and biscuits in About them', () => {
  // (phase 17, the owner's phone test: the first letter stays inside the topic. After "tea or coffee?" B gives the
  // family's biscuits first, then food and drink words; Beth and Bo come for a question about people, or with no topic.)
  it('gives those three, in that order, by rules alone: no model is called, on any device', async () => {
    for (const o of [{}, { deviceReady: true }, { allowCloud: true }, { deviceReady: true, allowCloud: true }]) {
      const e = new Fake(true, { device: ['banana', 'bread'], cloud: ['banana', 'bread'] });
      const card = await letterCard({ asked: '', letter: 'B', rejected: [] }, env(e, MILLER, o));
      expect(labels(card)).toEqual(['Beth', 'Bo', 'biscuits']);
      expect(card.choices.at(-1)).toMatchObject({ label: 'something else', role: 'escape' });
      expect(e.device).toEqual([]);
      expect(e.cloud).toEqual([]);
      expect(card.source).toBe('code');
      expect(card.cloudPayload).toBeNull();
      expect(card.letter).toMatchObject({ letter: 'B', by: 'rules' });
      expect(card.why?.personal).toEqual(['Beth', 'Bo', 'biscuits']);
    }
  });
  it('the Miller family of the week fixture ("Bo is his dog", "ginger biscuits"): Beth, Bo, then ginger biscuits by its last word', () => {
    const week: Profile = { ...MILLER, foods: ['ginger biscuits', 'porridge'], other: ['Bo is his dog'] };
    expect(letterWords({ asked: '', letter: 'B', rejected: [] }, week).slice(0, 3)).toEqual(['Beth', 'Bo', 'ginger biscuits']);
  });
  it('every tile starts with the letter: a word matched by a later word shows that word first ("biscuits (ginger)"); the carer still says the family\'s own word', async () => {
    expect(letterLabel('ginger biscuits', 'B')).toBe('biscuits (ginger)');
    expect(letterLabel('strong tea with milk', 'T')).toBe('tea with milk (strong)');
    expect(letterLabel('strong tea with milk', 'M')).toBe('milk (strong tea with)');
    expect(letterLabel('the lake', 'L')).toBe('the lake');
    expect(letterLabel('Beth', 'B')).toBe('Beth');
    // the role-play's About them (18 Nov): foods "strong tea with milk, porridge, ginger biscuits", no dog
    const carol: Profile = { ...MILLER, foods: ['strong tea with milk', 'porridge', 'ginger biscuits'], other: [] };
    const card = await letterCard({ asked: 'Would you like tea or coffee?', letter: 'B', rejected: ['tea', 'coffee'] }, env(new Fake(false), carol));
    expect(labels(card)).toEqual(['biscuits (ginger)', 'bread', 'banana']);
    for (const l of labels(card)) expect(l.toLowerCase().startsWith('b'), l).toBe(true);
    expect(card.choices[0].spoken).toBe('ginger biscuits');
    expect(card.say).toBe('It starts with B. Is it ginger biscuits, bread, banana, or something else?');
    expect(card.why?.personal).toEqual(['ginger biscuits']);
    expect(letterEnd(card.choices[0].spoken).end).toBe('The word is: ginger biscuits. Ask a yes or no question about it next.');
  });
  it('the kind of the conversation first, then people, then the rest: after "tea or coffee?" a drink stands before a person', () => {
    const p: Profile = { ...MILLER, people: [...MILLER.people, { id: 'p4', name: 'Mary', relation: 'sister', household: false }], foods: ['strong tea with milk', 'marmalade', 'porridge'] };
    // drinks with M: the everyday "milk" and the family's "strong tea with milk"; then Mary; then the rest
    // (phase 17: inside the topic: the drink first, then the foods; Mary only after the topic's words)
    // (phase 17b: a drink question keeps its letters to drinks first: the everyday "milkshake" now stands before the family's marmalade)
    // (phase 18b: the longer drink list has "mocha" too, also before the family's marmalade, which still comes before Mary)
    const m = letterWords({ asked: 'Would you like tea or coffee?', letter: 'M', rejected: ['tea', 'coffee'] }, p);
    expect(m.slice(0, 3)).toEqual(['strong tea with milk', 'milkshake', 'mocha']);
    expect(m.indexOf('marmalade')).toBeGreaterThan(0);
    expect(m.indexOf('Mary') < 0 || m.indexOf('marmalade') < m.indexOf('Mary')).toBe(true);
    expect(letterWords({ asked: 'Would you like tea or coffee?', letter: 'M', rejected: ['tea', 'coffee'] }, p).slice(0, 5)).not.toContain('Mary');
    // with no kind known: people first, then the rest in About-them order
    expect(letterWords({ asked: '', letter: 'M', rejected: [] }, p).slice(0, 3)).toEqual(['Mary', 'marmalade', 'strong tea with milk']);
    // a question about food ranks the family's foods before a person
    expect(letterWords({ asked: 'Would you like a snack or a meal?', letter: 'M', rejected: ['snack', 'meal'] }, p)[0]).not.toBe('Mary');
    // a question about people keeps people first
    expect(letterWords({ asked: 'Do you want to call someone?', letter: 'M', rejected: [] }, p)[0]).toBe('Mary');
  });
  it('a refused word does not come back under its new label', () => {
    const carol: Profile = { ...MILLER, foods: ['ginger biscuits'], other: [] };
    expect(letterWords({ asked: '', letter: 'B', rejected: ['ginger biscuits'] }, carol)).not.toContain('ginger biscuits');
  });
  it('the sample family of judge mode: "B" gives Beth, Bo, biscuits, as the docs and the video say (phase 15)', () => {
    expect(SAMPLE_PROFILE.other).toContain('Bo (dog)');
    expect(letterWords({ asked: '', letter: 'B', rejected: [] }, SAMPLE_PROFILE).slice(0, 3)).toEqual(['Beth', 'Bo', 'ginger biscuits']);
    expect(letterWords({ asked: '', letter: 'B', rejected: [] }, SAMPLE_PROFILE).slice(0, 3).map((w) => letterLabel(w, 'B'))).toEqual(['Beth', 'Bo', 'biscuits (ginger)']);
  });
  it('the line the carer says, and the question on the card', async () => {
    const card = await letterCard({ asked: '', letter: 'b', rejected: [] }, env(new Fake(false), MILLER));
    expect(card.asked).toBe('It starts with B. Is it one of these?');
    expect(card.say).toBe('It starts with B. Is it Beth, Bo, biscuits, or something else?');
  });
});

describe('the rules\' words', () => {
  it('About them comes before everyday words, and the question\'s own topic before the other topics', () => {
    expect(letterWords({ asked: '', letter: 'T', rejected: [] }, MILLER)[0]).toBe('Tom');
    expect(letterWords({ asked: '', letter: 'T', rejected: [], topic: 'fun' }, EMPTY_PROFILE)[0]).toBe('tv');
    expect(letterWords({ asked: '', letter: 'T', rejected: [], topic: 'food' }, EMPTY_PROFILE)[0]).toBe('tea');
  });
  it('never the person\'s own name or the carer\'s; an article does not count ("the lake" is under L)', () => {
    expect(ownWords(MILLER)).not.toContain('Frank');
    expect(ownWords(MILLER)).not.toContain('Carol');
    expect(letterWords({ asked: '', letter: 'L', rejected: [] }, MILLER)[0]).toBe('the lake');
    expect(startsWith('the lake', 'T')).toBe(false);
  });
  it('nothing that was refused comes back, and no word twice', () => {
    const w = letterWords({ asked: '', letter: 'B', rejected: ['Beth', 'bed'] }, MILLER);
    expect(w).not.toContain('Beth');
    expect(w).not.toContain('bed');
    expect(new Set(w.map((x) => x.toLowerCase())).size).toBe(w.length);
  });
  it('a learned usual answer is a word; "yes" and the ways out are not', () => {
    expect(ownWords(EMPTY_PROFILE, ['marmalade', 'yes', 'something else'])).toEqual(['marmalade']);
  });
  it('a kept sentence in About them is not a word', () => {
    expect(ownWords({ ...EMPTY_PROFILE, other: ['"Would you like tea or coffee": usually tea (3 of 3).', 'Bo is his dog', 'crosswords'] })).toEqual(['Bo', 'crosswords']);
  });
  it('every everyday word has a drawing', () => {
    for (const w of Object.values(EVERYDAY).flat()) expect(BUILTIN.has(w), w).toBe(true);
  });
  it('the alphabet: 26 letters, six to a row, five rows with the way out', () => {
    expect(LETTERS).toHaveLength(26);
    expect(Math.ceil((LETTERS.length + 4) / LETTER_COLUMNS)).toBe(5);
  });
});

describe('a model adds words only when the rules find fewer than two', () => {
  // (phase 18b: a question of no known topic; inside the drink question "xylophone" is now dropped, the test after these)
  const Q = { asked: 'What is it?', letter: 'X', rejected: [] as string[] };
  it('phase 18b: inside the drink question ("tea or coffee?"), the model\'s "xylophone" is not of the topic: dropped', async () => {
    const e = new Fake(true, { device: ['xylophone', 'x-ray picture', 'tea'] });
    const card = await letterCard({ asked: 'Would you like tea or coffee?', letter: 'X', rejected: ['tea', 'coffee'] }, env(e, MILLER, { deviceReady: true }));
    expect(labels(card)).toEqual([]);
    expect(e.device).toHaveLength(1);
  });
  it('on this device, where the browser has the model: its prompt holds About them, and nothing is sent', async () => {
    const e = new Fake(true, { device: ['xylophone', 'x-ray picture', 'tea'] });
    const card = await letterCard(Q, env(e, MILLER, { deviceReady: true, allowCloud: true }));
    expect(labels(card)).toEqual(['xylophone', 'x-ray picture']);
    expect(e.device).toHaveLength(1);
    expect(e.device[0]).toContain('Beth');
    expect(e.cloud).toEqual([]);
    expect(card.letter?.by).toBe('device');
    expect(card.cloudPayload).toBeNull();
  });
  it('no model on the device, online help off: nothing is sent, no card, and the card holds the exact text for the sheet', async () => {
    const e = new Fake(true, { cloud: ['xylophone', 'x-ray'] });
    const card = await letterCard(Q, env(e, MILLER));
    expect(e.cloud).toEqual([]);
    expect(card.choices).toEqual([]);
    expect(card.blocked).toBe(P4.letter.none('Frank', 'X'));
    expect(card.cloudPayload).toBeNull();
    expect(JSON.parse(card.unsentPayload!)).toEqual(cloudTextRequest(letterCloudText(Q.asked, 'X', MILLER).text));
  });
  it('after the yes: online help gets the question and the letter, and the card says what left', async () => {
    const e = new Fake(true, { cloud: ['xylophone', 'x-ray'] });
    const card = await letterCard(Q, env(e, MILLER, { allowCloud: true }));
    // (phase 8: the kind of the conversation and an age band, fixed words: no name, nothing from About them)
    // (phase 9: the cloud is asked for exactly 4 words; code keeps those that start with the letter)
    expect(e.cloud).toEqual([`What is it? They cannot say the word. It starts with the letter "X". ${LETTER_AGE} ${LETTER_CLOUD_TASK}`]);
    expect(labels(card)).toEqual(['xylophone', 'x-ray']);
    expect(card.letter?.by).toBe('cloud');
    expect(card.source).toBe('in-cloud');
    expect(card.cloudPayload).toContain('It starts with the letter');
  });
  it('one word in About them and no way to ask a model: the card is that word and the way out', async () => {
    const card = await letterCard({ asked: '', letter: 'P', rejected: [] }, env(new Fake(false), { ...MILLER, foods: ['porridge'] }));
    expect(labels(card)).toEqual(['porridge', 'pain', 'priest']);
    const one = await letterCard({ asked: '', letter: 'L', rejected: [] }, env(new Fake(false), MILLER));
    expect(labels(one)).toEqual(['the lake']);
    expect(one.choices).toHaveLength(2);
  });
  it('a copy with no project settings and no word: no card, a plain line, nothing to send', async () => {
    const card = await letterCard({ asked: '', letter: 'X', rejected: [] }, env(new Fake(false), EMPTY_PROFILE));
    expect(card.blocked).toContain('No word that starts with X');
    expect(card.unsentPayload ?? null).toBeNull();
  });
  it('online help fails: the card never says nothing left, and never throws', async () => {
    const card = await letterCard(Q, env(new Fake(true, { cloud: new Error('503') }), MILLER, { allowCloud: true }));
    // (phase 18: the line names the letters and what happened, never "Nothing else was tried")
    expect(card.blocked).toBe(P4.letter.failed(card.letter!.letter));
    expect(card.blocked).not.toMatch(/Nothing else was tried/);
    expect(card.cloudAttempted).toBeTruthy();
  });
});

describe('the cloud text: the letter and the question only, never About them', () => {
  const nasty: Profile = { ...MILLER, foods: ['Aunt Zelda\'s fudge cake', 'biscuits'], other: ['Bo (dog)', 'takes metformin'] };
  it('holds no name, food, place or learned word, whatever the question named', () => {
    const { text } = letterCloudText('Would you like to call Beth or Tom, or go to the lake with Bo?', 'Z', nasty);
    for (const w of ['Beth', 'Tom', 'lake', 'Bo', 'Frank', 'Carol', 'Zelda', 'fudge', 'metformin', 'biscuits']) expect(text, `${w} in: ${text}`).not.toMatch(new RegExp(`\\b${w}\\b`));
    expect(text).toContain('It starts with the letter "Z"');
  });
  it('what was refused and what was learned are in the on-device text only', async () => {
    const i = { asked: 'Would you like tea or coffee?', letter: 'X', rejected: ['tea', 'coffee', 'Beth'], learned: ['marmalade'] };
    expect(letterDeviceAsk(i)).toContain('They did not want: tea, coffee, Beth.');
    expect(letterDeviceAsk(i)).toContain('marmalade');
    const e = new Fake(true, { cloud: ['xylophone', 'x-ray'] });
    await letterCard(i, env(e, nasty, { allowCloud: true }));
    for (const w of ['tea,', 'Beth', 'marmalade', 'did not want']) expect(e.cloud[0]).not.toContain(w);
  });
  it('the sheet shows that line above the two buttons, what is never sent, and the whole request', () => {
    const { text } = letterCloudText('Would you like tea or coffee?', 'X', MILLER);
    const request = JSON.stringify(cloudTextRequest(text), null, 2);
    const html = letterSheet({ line: text.split(' Give two or three')[0], request });
    expect(html).toContain('Would you like tea or coffee? They cannot say the word. It starts with the letter &quot;X&quot;.');
    expect(html.indexOf('id="sheet-line"')).toBeLessThan(html.indexOf('data-act="sheet-yes"'));
    expect(html).toContain(P4.letter.sheet.never);
    expect(html).toContain('PREFER_IN_CLOUD');
    expect(html.indexOf(P4.letter.sheet.body)).toBeLessThan(html.indexOf('PREFER_IN_CLOUD'));
  });
});

describe('what a model may not put on a card (worst cases)', () => {
  const keep = (raw: string[], letter = 'B', rejected: string[] = []) => letterChoices(raw, { letter, rejected }, MILLER).kept;
  it('a word that does not start with the letter, a refused word, a way out, a repeat', () => {
    expect(keep(['apple', 'banana', 'Banana', 'bread', 'something else'], 'B', ['bread'])).toEqual(['banana']);
  });
  it('alcohol, tobacco and medicines are never brought in by a model', () => {
    expect(keep(['beer', 'bourbon', 'brandy', 'bread'])).toEqual(['bread']);
    expect(keep(['pills', 'painkillers', 'pie', 'paracetamol'], 'P')).toEqual(['pie']);
    expect(keep(['cigarettes', 'cider', 'cake'], 'C')).toEqual(['cake']);
  });
  it('a name the family did not give, negative wording, a long phrase', () => {
    expect(keep(['Barbara', 'Bob', 'bath'])).toEqual(['bath']);
    expect(keep(['bath but not now', 'no bath', 'blanket'])).toEqual(['blanket']);
  });
  it('the family\'s own word stays whatever it is: the rules offer it', () => {
    expect(letterWords({ asked: '', letter: 'B', rejected: [] }, { ...EMPTY_PROFILE, foods: ['beer'] })[0]).toBe('beer');
  });
});

describe('health safety: a word about pain, the toilet or the doctor is never left as "a word"', () => {
  it('"pain" leads on to where it hurts, with the line about the nurse or doctor', () => {
    expect(letterEnd('pain')).toEqual({ follow: ['Where does it hurt?'], end: P4.letter.care.pain });
    expect(letterEnd('pain').end).toMatch(/call the nurse or doctor/);
  });
  it('"toilet" says go now; "doctor" and "nurse" ask about pain first', () => {
    expect(letterEnd('toilet').end).toMatch(/Go now/);
    expect(letterEnd('doctor').follow).toEqual(['Are you in pain?']);
    expect(letterEnd('nurse').follow).toEqual(['Are you in pain?']);
  });
  it('no line of the helper says to wait, to try later, or that the person may be tired', () => {
    for (const w of ['pain', 'toilet', 'doctor', 'nurse', 'Bo', 'tea']) expect(letterEnd(w).end).not.toMatch(/later|tired|wait and see|less sure/i);
    expect(JSON.stringify(P4.letter)).not.toMatch(/may be tired|less sure|try again later/i);
  });
  it('any other word: the word, and a yes or no question next', () => {
    expect(letterEnd('Bo')).toEqual({ follow: [], end: 'The word is: Bo. Ask a yes or no question about it next.' });
  });
});

describe('the person\'s screen: the alphabet', () => {
  const html = letterGrid({ holdHtml: '' });
  it('26 letters and one way out, the question and the instruction above them', () => {
    expect([...html.matchAll(/data-letter="([A-Z])"/g)].map((m) => m[1]).join('')).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
    expect(html).toContain('Do you know how the word starts?');
    expect(html).toContain('Point to the first letter');
    expect(html).toContain("No, I don't know");
    expect(html.indexOf('Point to the first letter')).toBeLessThan(html.indexOf('data-letter="A"'));
  });
  it('no score, no count, no praise, nothing about a miss', () => {
    expect(html).not.toMatch(/\d+ of \d+|score|wrong|correct|well done|try again|!/i);
    expect(P4.letter.noLetter('Frank')).toMatch(/That is fine/);
  });
});
