// What the second run of set E still showed (17 Nov 2026, RESULTS_SIM_E2 §6), one group of tests per class. Every
// question here is a NEW phrasing written for this file, and the family is the test fixture (Alan; Maria asking), not
// the sample family the run used. The sentences of set E were not read while these fixes and tests were written.
import { describe, expect, it } from 'vitest';
import { COPY } from '../../core/copy';
import type { DeviceStatus, Engine, ModelResult } from '../../core/engine';
import { makeCard, needsNoModel } from '../../core/pipeline';
import { badgeKind, modelAsked } from '../../core/receipt';
import { cloudTextRequest } from '../../core/requests';
import { codePair, wholePair } from '../../core/rules';
import type { Card, ModelOutput, Profile, SupportLevel } from '../../core/types';
import { PROFILE } from './fixtures';

/** A scripted engine: null = that step is not there. Every call is recorded. */
class Scripted implements Engine {
  label = 'scripted';
  modes = { device: 'ONLY_ON_DEVICE', cloud: 'PREFER_IN_CLOUD' };
  calls: string[] = [];
  sent: string[] = [];
  cloudConfigured: boolean;
  constructor(public dev: ModelOutput | null, private cloud: ModelOutput | null = null) { this.cloudConfigured = !!cloud; }
  async deviceStatus(): Promise<DeviceStatus> { return this.dev ? 'available' : 'unavailable'; }
  async prepareDevice() {}
  async runDevice(): Promise<ModelResult> { this.calls.push('device'); return { text: JSON.stringify(this.dev), source: 'on-device', ms: 3 }; }
  cloudRequest(q: string) { return cloudTextRequest(q); }
  async runCloud(q: string): Promise<ModelResult> { this.calls.push('cloud'); this.sent.push(q); return { text: JSON.stringify(this.cloud), source: 'in-cloud', ms: 4 }; }
}
/** What a model returns when it has not understood: loose words, and "options" that are not the question's. */
const JUNK: ModelOutput = { topic: 'thing', kind: 'choice', choices: ['one thing', 'another thing', 'a third thing'], options: ['thing now', 'other'] };
const ask = (q: string, e: Scripted, support: SupportLevel = 'more', profile: Profile = PROFILE) =>
  makeCard(q, { profile, support, engine: e, allowCloud: e.cloudConfigured, deviceReady: e.dev !== null });
const answers = (c: Card) => c.choices.filter((x) => x.role === 'answer').map((x) => x.label);
const everyPage = (c: Card) => { const out: string[] = []; for (let p: Card | null | undefined = c; p; p = p.nextPage) out.push(...answers(p)); return out; };

describe('E2-1. a pair the code reads whole is the card at once: the on-device model is not asked, so nobody waits for it', () => {
  // set E, second run: 12 cards on this computer waited about 3 s for the model and then showed the pair read in code
  const WHOLE: [string, string[]][] = [
    ['Um, would you like the window open or shut for the night?', ['open', 'shut']],
    ['Would you like your bath this morning, or once you have had lunch?', ['this morning', 'once you have had lunch']],
    ['Shall I tell Grace about it now, or wait?', ['tell Grace about it', 'wait']],
    ['Do you want Biscuit on your lap this evening, or Maria?', ['Biscuit', 'Maria']],
    ['Is the knee any better or worse than it was last night?', ['better', 'worse', 'the same']],
    ['Would you like to go to the pub or the library this afternoon, love?', ['pub', 'library']],
    ['Shall I switch the lamp on or leave it dark?', ['switch the lamp on', 'leave it dark']],
    ['Shall I ring the surgery today or leave it till Monday?', ['ring the surgery', 'leave it']],
  ];
  it.each(WHOLE)('no model call, badge "No AI needed": %s', async (q, want) => {
    expect(needsNoModel(q, PROFILE)).toBe(true);
    const e = new Scripted(JUNK);
    const card = await ask(q, e);
    expect(e.calls).toEqual([]);
    expect(answers(card)).toEqual(want);
    expect(modelAsked(card)).toBe(false);
    expect(badgeKind(card)).toBe('code');
    // the same card with no model in the browser at all
    expect(answers(await ask(q, new Scripted(null)))).toEqual(want);
  });
  // a side that breaks off, or the tail of a name: the code does not stand by such a reading, so the model is still
  // asked for its copy, and the badge says so when the copy is not used
  const BROKEN = [
    'Well, shall I put the radio on for you or keep it peaceful?',
    'Shall we walk down to the library, or would you rather we went to the market?',
    'Nina Simone, or would you rather have the Antiques Roadshow on?',
    'Shall I do the buttons for you, or do you want to have a go yourself?',
  ];
  it.each(BROKEN)('the model is still asked: %s', async (q) => {
    expect(wholePair(codePair(q, PROFILE)!, q)).toBe(false);
    expect(needsNoModel(q, PROFILE)).toBe(false);
    const e = new Scripted(JUNK);
    const card = await ask(q, e);
    expect(e.calls).toEqual(['device']);
    expect(badgeKind(card)).toBe('codeAsked');
  });
  it('a copy the model made of such a question is still used when it passes the check', async () => {
    const card = await ask(BROKEN[1], new Scripted({ topic: 'outing', kind: 'choice', choices: [], options: ['the library', 'the market'] }));
    expect(answers(card)).toEqual(['library', 'market']);
    expect(badgeKind(card)).toBe('device');
  });
});

describe('E2-6. the headline says something: "what to do" for things to do, and no "that\'s" left in a yes / no headline', () => {
  // set E, second run: "which one" over eight cards whose options share no word; "that's one you liked" over a yes / no
  const TO_DO: [string, string[]][] = [
    ['Shall I switch the lamp on or leave it dark?', ['switch the lamp on', 'leave it dark']],
    ['Do you want to have a lie down, do your stretches, or sit in the sun?', ['have a lie down', 'do your stretches', 'sit in the sun']],
    ['Do you want me to cut it up for you, or manage it yourself?', ['cut it up', 'manage it yourself']],
    ['Would you rather ring Grace back yourself or let me handle it?', ['ring Grace back yourself', 'let me handle it']],
  ];
  it.each(TO_DO)('things to do get "what to do", in every engine state: %s', async (q, want) => {
    for (const e of [new Scripted(null), new Scripted(JUNK), new Scripted(null, JUNK)]) {
      const card = await ask(q, e);
      expect(answers(card)).toEqual(want);
      expect(card.topic).toBe('what to do');
    }
  });
  it('a headline the question gives is kept; two short things with no shared word are still named', async () => {
    expect((await ask('Soup or a sandwich for lunch?', new Scripted(null))).topic).toBe('lunch');
    expect((await ask('Do you want jam or honey?', new Scripted(null))).topic).toBe('jam or honey');
    expect((await ask('Shall we go to the pub or the library?', new Scripted(null))).topic).toBe('where to');
  });
  const YES_NO: [string, string][] = [
    ["That's the jumper you wanted, isn't it?", 'jumper you wanted'],
    ["That's the one you picked, isn't it?", 'the one you picked'],
    ['This is the one you asked for, right?', 'the one you asked'],
    ["There's enough milk, isn't there?", 'enough milk'],
    ["That isn't the one you ordered, is it?", 'the one you ordered'],
  ];
  it.each(YES_NO)('%s -> "%s"', async (q, want) => {
    const card = await ask(q, new Scripted(null));
    expect(card.kind).toBe('yesno');
    expect(card.topic).toBe(want);
    expect(card.topic).not.toMatch(/\b(?:that|this|there)(?:'s)?\b/);
  });
});

describe('E2-7. "…, or is Maria watching her programme?": the option is "Maria\'s programme", not a piece of the clause', () => {
  // set E, second run: the tile read "watching her show"
  const CASES: [string, string[]][] = [
    ['Do you want the cricket on, or is Maria listening to her programme?', ['cricket', "Maria's programme"]],
    ['Do you want the westerns on, or is Sam playing his game?', ['westerns', "Sam's game"]],
    ['Do you want the radio on, or is Winnie having her nap?', ['radio', "Winnie's nap"]],
    ['Do you want the big chair, or is your sister using her cushion?', ['big chair', "your sister's cushion"]],
  ];
  it.each(CASES)('%s', async (q, want) => {
    for (const e of [new Scripted(null), new Scripted(JUNK), new Scripted(null, JUNK)]) {
      const card = await ask(q, e);
      expect(answers(card)).toEqual(want);
      expect(card.say).toContain(want[1]);
      for (const a of answers(card)) expect(a).not.toMatch(/\b(?:her|his|their)\b/);
    }
  });
  it('her own name stays a name when someone else asks, and no model is needed for it', async () => {
    const e = new Scripted(JUNK);
    const card = await ask(CASES[0][0], e);
    expect(e.calls).toEqual([]);
    expect(card.choices[1]).toMatchObject({ label: "Maria's programme", spoken: "Maria's programme" });
  });
  it('a side with no person in it is read as before', async () => {
    expect(answers(await ask('Do you want the cricket on, or shall I leave it off?', new Scripted(null)))).toEqual(['cricket', 'leave it off']);
  });
});

const choice = (choices: string[], topic = 'x'): ModelOutput => ({ topic, kind: 'choice', choices });
/** The fixture family with three places (the sample family of the run has three too). */
const THREE: Profile = { ...PROFILE, places: ['allotment', 'library', 'pub'] };

describe('E2-2. the family\'s own entries stand first: a general word never pushes one of them to the next page', () => {
  // set E, second run: on this computer an About-me place stood on the second page behind the model's general words
  it('an About-me entry the model put last is first on the card', async () => {
    const card = await ask('What shall we do after lunch?', new Scripted(choice(['park', 'cafe', 'allotment'])));
    expect(answers(card)).toEqual(['allotment', 'park']);
    expect(everyPage(card)).toEqual(['allotment', 'park', 'cafe']);
    const food = await ask('What do you fancy for supper?', new Scripted(choice(['toast', 'soup', 'omelette'])));
    expect(answers(food)[0]).toBe('omelette');
  });
  it('three of the family\'s own share one card at "2 at a time", and the partner is told why', async () => {
    for (const q of ['Where shall we go this afternoon?', 'What shall we do on Saturday?']) {
      const card = await ask(q, new Scripted(choice(['allotment', 'library', 'pub'])), 'more', THREE);
      expect(answers(card)).toEqual(['allotment', 'library', 'pub']);
      expect(card.nextPage ?? null).toBeNull();
      expect(card.notes).toContain(COPY.notes.ownAll);
      expect(card.say).toContain('Allotment, library, pub, or some');
      expect(card.why!.dropped).toEqual([]);
    }
  });
  it('a general word after the three goes to the next page; at the largest tiles it is two at a time as before', async () => {
    const mixed = await ask('What shall we do on Saturday?', new Scripted(choice(['allotment', 'library', 'swimming'])), 'more', THREE);
    expect(answers(mixed)).toEqual(['allotment', 'library']);
    const most = await ask('Where shall we go this afternoon?', new Scripted(choice(['allotment', 'library', 'pub'])), 'most', THREE);
    expect(answers(most)).toEqual(['allotment', 'library']);
    expect(answers(most.nextPage!)).toEqual(['pub']);
  });
  it('people are paged two at a time as before', async () => {
    const who = await ask('Who shall I ring for you?', new Scripted(choice(['Grace', 'Leo', 'Peter'])));
    expect(answers(who)).toEqual(['Grace', 'Leo']);
    expect(who.notes).not.toContain(COPY.notes.ownAll);
  });
});

describe('E2-3. a general word gives way to the family\'s own kind of it, when About me has one', () => {
  // set E, second run: "chair" for the recliner, "shirt" for the flannel shirt, "read book" for the newspaper,
  // "pain / tired" for the shoulder. (The sample family of that run has none of these in About me: there the card
  // cannot know. These tests use a family that has them.)
  const HOME: Profile = { ...PROFILE, other: [...PROFILE.other, 'rocking chair', 'tweed jacket', 'the Yorkshire Post', 'dodgy right knee'] };
  const CASES: [string, string[], string, string][] = [
    ['Where do you want to sit for a bit?', ['chair', 'sofa'], 'chair', 'rocking chair'],
    ['What do you want to wear today?', ['jumper', 'jacket'], 'jacket', 'tweed jacket'],
    ['What would you like to do after breakfast?', ['read book', 'have a rest'], 'read book', 'Yorkshire Post'],
    ["What's the matter this morning?", ['tired', 'pain'], 'pain', 'dodgy right knee'],
  ];
  it.each(CASES)('%s %j: "%s" becomes "%s", first on the card', async (q, proposed, general, own) => {
    for (const e of [new Scripted(choice(proposed)), new Scripted(null, choice(proposed))]) {
      const card = await ask(q, e, 'more', HOME);
      expect(answers(card)[0]).toBe(own);
      expect(everyPage(card)).not.toContain(general);
      expect(card.why!.added).toContainEqual({ label: own, from: COPY.how.why.ownKind(general) });
      expect(card.why!.dropped).toContainEqual({ label: general, rule: COPY.how.why.rules.ownSpecific });
      // the cloud never got the family's word: it is put in on this computer
      for (const sent of e.sent) expect(sent.toLowerCase()).not.toContain(own.toLowerCase());
    }
  });
  it('with no such entry in About me the model\'s word stays; with two that fit, the code does not pick', async () => {
    expect(answers(await ask(CASES[0][0], new Scripted(choice(['chair', 'sofa']))))).toEqual(['chair', 'sofa']);
    const two: Profile = { ...PROFILE, other: ['tweed jacket', 'waxed jacket'] };
    expect(answers(await ask(CASES[1][0], new Scripted(choice(['jumper', 'jacket'])), 'more', two))).toEqual(['jumper', 'jacket']);
  });
  it('an entry of another kind than the question asks for is not put in by its last word', async () => {
    const eggs: Profile = { ...PROFILE, foods: [...PROFILE.foods, 'scrambled eggs'] };
    // a meal question: the family's own
    expect(answers(await ask('What do you fancy for supper?', new Scripted(choice(['eggs', 'soup'])), 'more', eggs))).toEqual(['scrambled eggs', 'soup']);
    // breakfast: About-me foods are the family's dinners (set D), so the model's word stays as it is
    expect(answers(await ask('What do you want for breakfast?', new Scripted(choice(['eggs', 'cereal'])), 'more', eggs))).toEqual(['eggs', 'cereal']);
  });
  it('the specific entry next to its general word: the general word goes, not the entry', async () => {
    const card = await ask(CASES[1][0], new Scripted(choice(['tweed jacket', 'jacket', 'jumper'])), 'more', HOME);
    expect(everyPage(card)).toEqual(['tweed jacket', 'jumper']);
  });
});

describe('E2-5. "Where do you want to go?" with cloud help only: the family\'s places first, the cloud\'s general ones after', () => {
  // set E, second run: the second half of "…, and if so where?" read park / cafe from the cloud, no family place
  const OUT = ['Where would you like to go this afternoon?', 'Where shall we head off to today?', 'Where do you want to go for a drive on Sunday?'];
  it.each(OUT)('cloud help only: %s', async (q) => {
    const e = new Scripted(null, choice(['park', 'cafe']));
    const card = await ask(q, e, 'more', THREE);
    expect(answers(card)).toEqual(['allotment', 'library', 'pub']);
    expect(everyPage(card)).toEqual(['allotment', 'library', 'pub', 'park', 'cafe']);
    expect(badgeKind(card)).toBe('cloud');
    expect(e.sent).toHaveLength(1);
    expect(e.sent[0]).not.toMatch(/allotment|library|pub/i);
    expect(card.why!.added.map((a) => a.label)).toEqual(['allotment', 'library', 'pub']);
    expect(card.notes).toContain(COPY.notes.completedFrom('places from About me'));
  });
  it('the second half of "…, and if so where?" gets them too', async () => {
    const e = new Scripted(null, choice(['park', 'cafe']));
    const first = await ask('Do you want to go for a drive today, and if so where?', e, 'more', THREE);
    expect(first.kind).toBe('yesno');
    const second = await ask(first.pending!, e, 'more', THREE);
    expect(answers(second)).toEqual(['allotment', 'library', 'pub']);
  });
  it('the same card when the on-device model offers only general places; a model that chose among the family\'s places keeps its choice', async () => {
    expect(answers(await ask(OUT[0], new Scripted(choice(['park', 'cafe'])), 'more', THREE))).toEqual(['allotment', 'library', 'pub']);
    expect(everyPage(await ask(OUT[0], new Scripted(choice(['the library', 'pub', 'park'])), 'more', THREE))).toEqual(['the library', 'pub']);
    // four places: two at a time, in About-me order
    expect(answers(await ask(OUT[0], new Scripted(null, choice(['park', 'cafe']))))).toEqual(['allotment', 'library']);
  });
  const NOT_OUT: [string, string[]][] = [
    ['Where would you like to go on holiday next year?', ['seaside', 'mountains']],
    ['Where shall we go for lunch on Sunday?', ['cafe', 'restaurant']],
    ['Where do you want to sit?', ['sofa', 'armchair']],
    ['Where shall we go to buy your shoes?', ['town', 'retail park']],
  ];
  it.each(NOT_OUT)('not an outing, so the cloud\'s card stands: %s', async (q, cloud) => {
    const card = await ask(q, new Scripted(null, choice(cloud)), 'more', THREE);
    expect(answers(card)).toEqual(cloud);
  });
});

describe('E2-4. "How are you feeling?": the way out of good / so-so / bad leads to feelings the scale does not hold', () => {
  // set E, second run: a man who was "a bit sad" found no tile for it in good / so-so / bad, in all three passes
  const SELF = ['How are you feeling in yourself today?', 'How do you feel this evening?', "How's your mood today, love?", 'How are you, Alan?', 'How are things with you this week?'];
  it.each(SELF)('%s: a second page with sad / tired / in pain, made in code', async (q) => {
    for (const e of [new Scripted(null), new Scripted(JUNK), new Scripted(null, JUNK)]) {
      for (const support of ['mild', 'more', 'most'] as const) {
        const card = await ask(q, e, support);
        expect(card.kind).toBe('feeling');
        expect(answers(card)).toEqual(['good', 'so-so', 'bad']);
        const page = card.nextPage!;
        expect(answers(page)).toEqual(['sad', 'tired', 'in pain']);
        expect(page.choices.filter((c) => c.role === 'escape').map((c) => c.label)).toEqual(['something else']);
        expect(page.nextPage ?? null).toBeNull();
        expect(page.say).toContain('Sad, tired, in pain, or something else?');
        expect(card.notes).toContain(COPY.notes.feelingMore('sad, tired, in pain', 'something else'));
        expect(badgeKind(card)).toBe('code');
        expect(badgeKind(page)).toBe('code');
      }
      expect(e.calls).toEqual([]);
    }
  });
  it('each of the three has a picture', async () => {
    const page = (await ask(SELF[0], new Scripted(null))).nextPage!;
    expect(page.choices.slice(0, 3).map((c) => c.picture)).toEqual([{ type: 'builtin', id: 'bad' }, { type: 'builtin', id: 'tired' }, { type: 'builtin', id: 'pain' }]);
  });
  it.each(['How was the physio session?', "How's the new chair?", 'How did the hearing test go?', 'How was your night?', 'How are you finding the new tablets?', 'What do you think of the new carer?', 'How do you feel about moving the bed downstairs?'])('a question about a thing or an event keeps its one card: %s', async (q) => {
    const card = await ask(q, new Scripted(null));
    expect(card.kind).toBe('feeling');
    expect(card.nextPage ?? null).toBeNull();
  });
});
