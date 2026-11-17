// The classes of mistake the last held-out run of the rehearsal found (set E, 90 questions, run through the app three
// ways on 16 Nov 2026, late), one group of tests per class. Every question here is a NEW phrasing written for this
// file: none is a sentence of set E, so that set is not the only check that the class is fixed. The family is the
// test fixture (Alan; Maria asking), not the sample family the run used.
import { describe, expect, it } from 'vitest';
import { COPY } from '../../core/copy';
import type { DeviceStatus, Engine, ModelResult } from '../../core/engine';
import { partnerActions } from '../../core/actions';
import { makeCard } from '../../core/pipeline';
import { badgeKind, modelAsked, sessionTally } from '../../core/receipt';
import { cloudTextRequest, pictureRequestBody } from '../../core/requests';
import { codeOptions, codePair, dropWhichOne, validateOptions, whenChoices, isUnguessable, listedAnswers, noticeLead, quizKind, quizRephrase, splitQuestion } from '../../core/rules';
import { findLeaks, restoreNames, stripQuestion } from '../../core/strip';
import type { Card, ModelOutput, Profile, SupportLevel } from '../../core/types';
import { PROFILE } from './fixtures';

/** A scripted engine: null = that step is not there. Every call is recorded. */
class Scripted implements Engine {
  label = 'scripted';
  modes = { device: 'ONLY_ON_DEVICE', cloud: 'PREFER_IN_CLOUD', pictures: 'ONLY_IN_CLOUD' };
  calls: string[] = [];
  sent: string[] = [];
  cloudConfigured: boolean;
  constructor(public dev: ModelOutput | null, private cloud: ModelOutput | null = null) { this.cloudConfigured = !!cloud; }
  async deviceStatus(): Promise<DeviceStatus> { return this.dev ? 'available' : 'unavailable'; }
  async prepareDevice() {}
  async runDevice(): Promise<ModelResult> { this.calls.push('device'); return { text: JSON.stringify(this.dev), source: 'on-device', ms: 3 }; }
  cloudRequest(q: string) { return cloudTextRequest(q); }
  async runCloud(q: string): Promise<ModelResult> { this.calls.push('cloud'); this.sent.push(q); return { text: JSON.stringify(this.cloud), source: 'in-cloud', ms: 4 }; }
  pictureRequest(w: string) { return pictureRequestBody(w); }
  async picture() { return null; }
}
/** What a model returns when it has not understood: loose words, and "options" that are not the question's. */
const JUNK: ModelOutput = { topic: 'thing', kind: 'choice', choices: ['one thing', 'another thing', 'a third thing'], options: ['thing now', 'other'] };
const ask = (q: string, e: Scripted, support: SupportLevel = 'more', profile: Profile = PROFILE) =>
  makeCard(q, { profile, support, engine: e, allowCloud: e.cloudConfigured, deviceReady: e.dev !== null });
const answers = (c: Card) => c.choices.filter((x) => x.role === 'answer').map((x) => x.label);
/** The three ways a card is made: no model at all, the on-device model, cloud help only. */
const STATES: [string, (dev?: ModelOutput, cloud?: ModelOutput) => Scripted][] = [
  ['rules alone', () => new Scripted(null)],
  ['on-device model', (dev = JUNK) => new Scripted(dev)],
  ['cloud help only', (_dev, cloud = JUNK) => new Scripted(null, cloud)],
];

describe('E-1. options named in the question always make a card, from the question\'s own words', () => {
  // set E: "… now or after you eat?" had no card without a model, and "No good choices came out" on some on-device runs
  const PAIRS: [string, string[]][] = [
    ['Do you want the eye drops now or when you go up to bed?', ['now', 'when you go up to bed']],
    ['Shall I run your bath before supper or once the news is over?', ['before supper', 'once the news is over']],
    ['Do you want your inhaler now or after your shower?', ['now', 'after your shower']],
    ['Should I carry the tray or do you want to manage it yourself?', ['carry the tray', 'manage it yourself']],
    ['Shall I post it for you or would you rather take it yourself?', ['post it for you', 'take it yourself']],
    ['Should I ring Grace about the scan this afternoon or hold off?', ['ring Grace', 'hold off']],
    ['Shall I book the taxi for Friday or hold off?', ['book the taxi', 'hold off']],
    ['Do you want me to read it out or can you see it?', ['read it out', 'see it']],
  ];
  for (const [state, engine] of STATES) {
    it.each(PAIRS)(`${state}: %s`, async (q, want) => {
      const e = engine();
      const card = await ask(q, e);
      expect(card.blocked ?? null).toBeNull();
      expect(card.kind).toBe('choice');
      expect(answers(card)).toEqual(want);
      expect(card.choices.filter((c) => c.role === 'escape')).toHaveLength(1);
      // the options are in the question: nothing is sent to be guessed at
      expect(e.calls).not.toContain('cloud');
      // every word on a tile is the partner's own
      for (const label of want) for (const w of label.toLowerCase().split(/\s+/)) expect(q.toLowerCase()).toContain(w);
    });
  }
  it('a model whose copied options fail the check gives the same card as no model', async () => {
    for (const [q] of PAIRS) {
      const none = await ask(q, new Scripted(null));
      for (const bad of [JUNK, { ...JUNK, options: [] }, { ...JUNK, options: ['yes', 'no'] }, { topic: '', kind: 'yesno' as const, choices: ['yes', 'no'] }]) {
        const withModel = await ask(q, new Scripted(bad));
        expect(answers(withModel)).toEqual(answers(none));
        expect(withModel.topic).toBe(none.topic);
      }
    }
  });
  it('the strict reading still wins where it holds, and "or not" is still one proposal', () => {
    expect(codePair('Shall we go now or later?', PROFILE)).toEqual(['now', 'later']);
    expect(codePair('Do you want the red one or the green one?', PROFILE)).toEqual(['red one', 'green one']);
    expect(codePair('Do you want a lift or not?', PROFILE)).toBeNull();
    expect(codePair('Do you want a rest, or is that a no?', PROFILE)).toBeNull();
    // a list in front is three options, not a pair read off its last two pieces
    expect(codePair('Do you want toast, an egg, or would you rather wait for lunch?', PROFILE)).toBeNull();
  });
});

describe('E-2. a test asked politely ("Can you tell me who …?") is still a test: no card, tell-don\'t-test', () => {
  // set E: "Can you tell me who the president is?" became yes / no, and "no" read as "I don't know"
  const TESTS: [string, string][] = [
    ['Could you tell me who the prime minister is?', 'place'],
    ['Can you tell me what year it is?', 'now'],
    ['Tell me what day it is today?', 'now'],
    ['Do you know who the mayor is?', 'place'],
    ['Can you tell me where we are?', 'place'],
    ['Could you tell me what my name is?', 'identity'],
    ['Can you remind me when Leo\'s birthday is?', 'fact'],
    ['Any idea how old Grace is?', 'fact'],
    ['Can you tell me what you had for lunch?', 'recall'],
    ['Would you tell me what town this is?', 'place'],
  ];
  for (const [state, engine] of STATES) {
    it.each(TESTS)(`${state}: %s`, async (q, kind) => {
      const e = engine();
      const card = await ask(q, e);
      expect(quizKind(q, PROFILE)).toBe(kind);
      expect(card.kind).toBe('no-quiz');
      expect(card.choices).toEqual([]);
      expect(card.coach).toMatch(/tell, don't test/i);
      expect(card.say.startsWith(COPY.notes.tellPrefix)).toBe(true);
      // no model is asked to make tiles for it
      expect(e.calls).toEqual([]);
    });
  }
  it('the line to say is the one for the plain question', () => {
    expect(quizRephrase("Can you remind me when Leo's birthday is?", 'Maria', new Date(), PROFILE)).toContain("It's on");
    expect(quizRephrase('Could you tell me what my name is?', 'Maria', new Date(), PROFILE)).toBe("It's me, Maria.");
    expect(quizRephrase('Can you tell me what year it is?', 'Maria', new Date(2026, 10, 17), PROFILE)).toBe("It's 2026.");
  });
  it('the same opening before a real question is not a test', async () => {
    for (const q of ['Can you tell me what you want for supper?', 'Do you know where your glasses are?', 'Can you tell me which one you like?', 'Could you show me where it hurts?', 'Can you tell me how you feel?']) {
      expect(quizKind(q, PROFILE)).toBeNull();
      expect((await ask(q, new Scripted(null))).kind).not.toBe('no-quiz');
    }
  });
});

describe('E-3. "Who was that on the phone?": the partner does not know, so it is not a test; the card is the people About me names', () => {
  // set E: refused with "You know this one: tell, don't test", no card
  const QUESTIONS = [
    'Who was that at the door just now?',
    'Who were you talking to on the phone?',
    'Who was it that rang this morning?',
    'Who came by while I was at the shops?',
    'Who was that calling earlier?',
    "Who's that on the phone, Alan?",
  ];
  for (const [state, engine] of STATES) {
    it.each(QUESTIONS)(`${state}: %s`, async (q) => {
      const e = engine();
      const card = await ask(q, e);
      expect(quizKind(q, PROFILE)).toBeNull();
      expect(card.blocked ?? null).toBeNull();
      expect(card.kind).toBe('choice');
      // Grace, Leo and Peter do not live there; Maria is asking, Sam lives there, Alan is the person
      expect(answers(card)).toEqual(['Grace', 'Leo']);
      expect(card.choices.find((c) => c.role === 'escape')?.label).toBe('someone else');
      expect(answers(card.nextPage!)).toEqual(['Peter']);
      expect(card.coach ?? null).toBeNull();
      expect(card.source).toBe('code');
      // nothing is asked of a model, so nothing can be made up and nothing is sent
      expect(e.calls).toEqual([]);
      expect(card.cloudPayload).toBeNull();
    });
  }
  it('at three a card all three stand on one page', async () => {
    expect(answers(await ask('Who was that at the door just now?', new Scripted(null), 'mild'))).toEqual(['Grace', 'Leo', 'Peter']);
  });
  it('with fewer than two such people in About me the question goes the usual way (no card made of one name)', async () => {
    const few: Profile = { ...PROFILE, people: PROFILE.people.slice(0, 3) };
    const card = await ask('Who was that at the door just now?', new Scripted(null), 'more', few);
    expect(card.blocked).toBeTruthy();
    expect(card.kind).not.toBe('no-quiz');
  });
  it('a face in a photo or on the telly, and a fact, are still tests; a wish is still an open question', async () => {
    for (const q of ['Who was that man in the photo?', 'Who was the first man on the moon?', 'Who was that on the telly last night?']) expect(quizKind(q, PROFILE)).not.toBeNull();
    const wish = await ask('Who shall we ring tonight?', new Scripted({ topic: 'call', kind: 'choice', choices: ['Grace', 'Leo'] }));
    expect(wish.source).toBe('on-device');
  });
});

describe('E-4. only a real two-question turn is split', () => {
  describe('a first question that only points at something is not a question to answer', () => {
    // set E: "Is that the phone? Do you want to answer it?" was split, and "no" on the first card read as "not the phone"
    const TURNS: [string, string][] = [
      ['Was that the doorbell? Shall I get it?', 'Shall I get it?'],
      ['Is that the kettle? Do you want a cup of tea?', 'Do you want a cup of tea?'],
      ['Is that Grace at the door? Do you want to see her?', 'Do you want to see her?'],
      ['Did you hear that? Shall I go and look?', 'Shall I go and look?'],
      ['Is this your blue cardigan? Do you want it on?', 'Do you want it on?'],
    ];
    for (const [state, engine] of STATES) {
      it.each(TURNS)(`${state}: %s`, async (q, second) => {
        const e = engine();
        const card = await ask(q, e);
        expect(card.asked).toBe(second);
        expect(card.pending).toBeNull();
        expect(card.kind).toBe('yesno');
        expect(card.coach ?? null).toBeNull();
        // the partner still says both sentences
        expect(card.say.startsWith(q)).toBe(true);
        expect(e.calls).toEqual([]);
      });
    }
    it('two real questions are still two', async () => {
      for (const q of ['Are you warm enough? Do you want the window shut?', 'Is that better? Do you want another pillow?', 'Is that too tight? Shall I loosen it?', 'Did you sleep? Are you hungry?']) {
        expect(noticeLead(q)).toBeNull();
        const card = await ask(q, new Scripted(null));
        expect(card.pending).not.toBeNull();
        expect(card.coach).toBe(COPY.coach.twoQuestions);
      }
    });
  });

  describe('answers offered after an open question are its options: one card, exactly those', () => {
    // set E: "Where does it hurt? Head, back, stomach?" showed "chest", which nobody named, and lost "stomach"
    const TURNS: [string, string[], string][] = [
      ['Where is it sore? Your knee, your hip, your ankle?', ['knee', 'hip', 'ankle'], 'somewhere else'],
      ['Where does it hurt? Your shoulder or your neck?', ['shoulder', 'neck'], 'somewhere else'],
      ['What shall I put on? The radio, a record, or nothing?', ['radio', 'record', 'nothing'], 'something else'],
      ['Which drawer is it in? Top, middle, bottom?', ['top', 'middle', 'bottom'], 'something else'],
      ['Who was that at the door? Grace or Leo?', ['Grace', 'Leo'], 'someone else'],
      ['What do you fancy? Toast, porridge?', ['toast', 'porridge'], 'something else'],
    ];
    for (const [state, engine] of STATES) {
      it.each(TURNS)(`${state}: %s`, async (q, want, escape) => {
        const e = engine();
        const card = await ask(q, e);
        expect(card.blocked ?? null).toBeNull();
        expect(card.kind).toBe('choice');
        expect(card.pending).toBeNull();
        expect(answers(card)).toEqual(want);
        expect(card.nextPage ?? null).toBeNull();
        expect(card.choices.find((c) => c.role === 'escape')?.label).toBe(escape);
        expect(card.asked).toBe(q.slice(0, q.indexOf('?') + 1));
        expect(e.calls).toEqual([]);
      });
    }
    it('a question of its own after the first is still a second question; a test stays a test', async () => {
      expect(listedAnswers('Where does it hurt? Is it your head?', PROFILE)).toBeNull();
      expect(listedAnswers('Did you eat? Toast or cereal?', PROFILE)).toBeNull();
      const quiz = await ask('What month is it? October or November?', new Scripted(null));
      expect(quiz.kind).toBe('no-quiz');
      expect(quiz.pending).toBeNull();
      // the body map is still the card when no parts are named
      expect((await ask('Where does it hurt?', new Scripted(null))).kind).toBe('body');
    });
  });

  describe('"…, and if so where?" is two questions, and the second is asked in full', () => {
    // set E: "Do you want to go out today, and if so where?" was one yes / no card; "where" was never asked
    it.each([
      ['Do you want to go for a drive this afternoon, and if so where?', 'Do you want to go for a drive this afternoon?', 'Where do you want to go for a drive this afternoon?'],
      ['Do you want Grace to visit, and if so when?', 'Do you want Grace to visit?', 'When do you want Grace to visit?'],
      ['Shall we eat out tonight and if so, where?', 'Shall we eat out tonight?', 'Where shall we eat out tonight?'],
      ['Do you fancy a trip at the weekend, and if you do, where to?', 'Do you fancy a trip at the weekend?', 'Where do you fancy a trip at the weekend?'],
    ])('%s', async (q, first, second) => {
      expect(splitQuestion(q)).toEqual([first, second]);
      const card = await ask(q, new Scripted(null));
      expect(card.kind).toBe('yesno');
      expect(card.pending).toBe(second);
      expect(card.coach).toBe(COPY.coach.twoQuestions);
    });
    it('on this computer the second half is a where-card with the family\'s places', async () => {
      const second = await ask('Where do you want to go for a drive this afternoon?', new Scripted({ topic: 'drive', kind: 'choice', choices: ['allotment', 'library'] }));
      expect(answers(second)).toEqual(['allotment', 'library']);
      expect(second.choices.find((c) => c.role === 'escape')?.label).toBe('somewhere else');
    });
  });
});

describe('E-5. three options, a "nothing" at the end, words before and after the list', () => {
  const everyPage = (c: Card) => { const out: string[] = []; for (let p: Card | null | undefined = c; p; p = p.nextPage) out.push(...answers(p)); return out; };
  // set E: tiles "so we could go" / "rest Which one"; a tile "for lunch"; "nothing" on the next page; "not at all" lost
  const LISTS: [string, string[]][] = [
    ['We could play cards, or have a nap, or sit outside. What do you fancy?', ['play cards', 'have a nap', 'sit outside']],
    ['So you can ring Grace, or write to her, or wait. Which one?', ['ring Grace', 'write to her', 'wait']],
    ['For supper, an omelette, soup, or beans on toast?', ['omelette', 'soup', 'beans on toast']],
    ['Tonight, cricket, a western, or the news?', ['cricket', 'western', 'news']],
    ['Juice, milk, or squash, or nothing?', ['juice', 'milk', 'squash', 'nothing']],
    ['Do you want to see Leo on Saturday or Sunday, or not this week?', ['Saturday', 'Sunday', 'not this week']],
    ['Shall I ring the surgery this morning or after lunch, or not at all?', ['this morning', 'after lunch', 'not at all']],
    ['Is your knee better or worse than last week?', ['better', 'worse', 'the same']],
    ['Is the cough any easier or harder today?', ['easier', 'harder', 'the same']],
  ];
  for (const [state, engine] of STATES) {
    it.each(LISTS)(`${state}: %s`, async (q, want) => {
      const e = engine();
      const card = await ask(q, e);
      expect(card.blocked ?? null).toBeNull();
      expect(card.kind).toBe('choice');
      // every option on the first page, at "2 at a time" too; nothing waits behind the way out
      expect(answers(card)).toEqual(want);
      expect(card.nextPage ?? null).toBeNull();
      expect(card.choices.filter((c) => c.role === 'escape')).toHaveLength(1);
      expect(e.calls).not.toContain('cloud');
    });
  }
  it('no tile holds the words before the list or the "which one" after it', async () => {
    for (const [q] of LISTS) {
      const card = await ask(q, new Scripted(null));
      for (const a of answers(card)) expect(a).not.toMatch(/^(?:so|we|you|for|tonight)\b|which|what|fancy/i);
      expect(card.say).not.toMatch(/Which one\?|What do you fancy\?/);
    }
  });
  it('the closing question goes, the options stay', () => {
    expect(dropWhichOne('Porridge or toast? Which would you like?')).toBe('Porridge or toast?');
    expect(dropWhichOne('Shall we sit in the garden, or the front room. Which one?')).toBe('Shall we sit in the garden, or the front room?');
    // a second question that is not about choosing stays where it is
    expect(dropWhichOne('Porridge or toast? And are you warm enough?')).toBe('Porridge or toast? And are you warm enough?');
    expect(dropWhichOne('Which one do you want?')).toBe('Which one do you want?');
  });
  it('"nothing" is on the first page at every level; a fourth thing is what waits', async () => {
    for (const support of ['mild', 'more', 'most'] as const) {
      const card = await ask('Juice, milk, or squash, or nothing?', new Scripted(null), support);
      expect(answers(card)).toContain('nothing');
      expect(everyPage(card).sort()).toEqual(['juice', 'milk', 'nothing', 'squash']);
    }
  });
  it('"the same" joins only a pair of opposite comparatives; "or not today" after one thing is still yes / no', async () => {
    expect(codeOptions('Do you want the big one or the small one?', PROFILE)).toEqual(['big one', 'small one']);
    expect(codeOptions('Is it better or just different?', PROFILE)).toEqual(['better', 'different']);
    expect((await ask('Do you want a blanket, or not today?', new Scripted(null))).kind).toBe('yesno');
    // a model that copies the two ends gets the middle too
    const viaModel = await ask('Is your knee better or worse than last week?', new Scripted({ topic: 'knee', kind: 'choice', choices: ['better', 'worse'], options: ['better', 'worse'] }));
    expect(answers(viaModel)).toEqual(['better', 'worse', 'the same']);
  });
});

describe('E-6. the partner\'s name in the question means someone else is asking: it stays a name, never "you" / "me"', () => {
  // set E: a carer asked "… Honey to sit with you tonight, or Carol?" and the tile read "you", the line "…, me, or something else?"
  const QUESTIONS: [string, string[]][] = [
    ['Do you want Maria or Grace?', ['Maria', 'Grace']],
    ['Should I ask Maria or Leo?', ['Maria', 'Leo']],
    ['Shall I fetch Maria or Sam?', ['Maria', 'Sam']],
  ];
  for (const [state, engine] of STATES) {
    it.each(QUESTIONS)(`${state}: %s`, async (q, want) => {
      const card = await ask(q, engine());
      expect(answers(card)).toEqual(want);
      const maria = card.choices.find((c) => c.label === 'Maria')!;
      expect(maria.spoken).toBe('Maria');
      expect(maria.picture).toMatchObject({ type: 'person' });
      expect(card.say).toContain('Maria');
      expect(card.say).not.toMatch(/\b(?:me|Me)\b(?=,| or)/);
      for (const c of card.choices) expect(c.label).not.toMatch(/^you\b/i);
    });
  }
  it('a model that copies the options keeps her name too, with its possessive', async () => {
    const card = await ask("Do you want the cricket on, or shall we leave Maria's programme on?", new Scripted({ topic: 'telly', kind: 'choice', choices: [], options: ['cricket', "Maria's programme"] }));
    expect(answers(card)).toEqual(['cricket', "Maria's programme"]);
    expect(card.say).toContain("Maria's programme");
  });
  it('when the question does not name her, she is asking: "you" on the card, "me" in the line, "your" / "my" for what is hers', async () => {
    const who = await ask('Who do you want to sit with this evening?', new Scripted({ topic: 'evening', kind: 'choice', choices: ['Maria', 'Grace'] }));
    expect(who.choices[0]).toMatchObject({ label: 'you', spoken: 'me' });
    const what = await ask('What shall we watch this evening?', new Scripted({ topic: 'telly', kind: 'choice', choices: ["Maria's programme", 'cricket'] }));
    expect(what.choices.map((c) => c.label)).toContain('your programme');
    expect(what.choices.find((c) => c.label === 'your programme')!.spoken).toBe('my programme');
    for (const c of what.choices) expect(c.label).not.toMatch(/you's/);
  });
});

describe('E-7. a feeling scale has a middle at every support level', () => {
  // set E: "How are you feeling?" gave good / bad; "so-so" and "a bit sad" could only go through the way out
  const QUESTIONS = ['How are you doing this morning?', 'How was the physio session?', "How's the new chair?", 'How did the hearing test go?', 'How was your night?'];
  for (const [state, engine] of STATES) {
    it.each(QUESTIONS)(`${state}: %s`, async (q) => {
      for (const support of ['mild', 'more', 'most'] as const) {
        const e = engine();
        const card = await ask(q, e, support);
        expect(card.kind).toBe('feeling');
        expect(answers(card)).toEqual(['good', 'so-so', 'bad']);
        expect(card.nextPage ?? null).toBeNull();
        expect(card.choices.filter((c) => c.role === 'escape')).toHaveLength(1);
        expect(card.say).toContain('so-so');
        expect(e.calls).toEqual([]);
      }
    });
  }
  it('the middle step has a picture, and the scale about a person has its middle too', async () => {
    const card = await ask('How are you doing this morning?', new Scripted(null));
    expect(card.choices[1].picture).toEqual({ type: 'builtin', id: 'okay' });
    expect(answers(await ask('What do you think of the new carer?', new Scripted(null)))).toEqual(['like them', 'okay', 'unhappy']);
  });
});

describe('E-8. a question nobody can guess the answer to gets no guesses: the card is ways to get it across', () => {
  // set E: "What was that you were trying to tell me earlier?" -> problem / joke / news (on-device), family / pain / home (cloud)
  const QUESTIONS = [
    'What were you going to say just then?',
    'What did you want to tell me this morning?',
    'What do you mean, love?',
    'What are you trying to show me?',
    'Sorry, what did you say?',
    'What were you asking me before the phone went?',
  ];
  const TILES = ['show me', 'write it', 'draw', 'later', 'change topic'];
  for (const [state, engine] of STATES) {
    it.each(QUESTIONS)(`${state}: %s`, async (q) => {
      const e = engine({ topic: 'news', kind: 'choice', choices: ['problem', 'joke', 'news'] }, { topic: 'topic', kind: 'choice', choices: ['family', 'pain', 'home'] });
      const card = await ask(q, e);
      expect(isUnguessable(q)).toBe(true);
      expect(card.blocked ?? null).toBeNull();
      expect(card.kind).toBe('repair');
      expect(card.choices.map((c) => c.label)).toEqual(TILES);
      // none of them is an answer, so a tap never enters the recap, and none is a topic somebody made up
      expect(card.choices.every((c) => c.role === 'repair')).toBe(true);
      expect(card.say.startsWith(q)).toBe(true);
      expect(card.coach).toBe(COPY.coach.unguessable);
      expect(card.source).toBe('code');
      expect(e.calls).toEqual([]);
      // it is the card for the question, not a detour: no "Back to the choices"
      expect(partnerActions(card, { less: false, hasAnswers: false }).map((a) => a.act)).toEqual(['show']);
    });
  }
  it('options the partner offers herself are the card; a question about what somebody else said is still a recall question', async () => {
    const offered = await ask('What do you want to say to Grace, thank you or sorry?', new Scripted(null));
    expect(answers(offered)).toEqual(['thank you', 'sorry']);
    expect(isUnguessable('What did the doctor say?')).toBe(false);
    expect((await ask('What did the doctor say?', new Scripted(null))).kind).toBe('no-quiz');
    expect(isUnguessable('What do you want to do today?')).toBe(false);
  });
  it('two in one: the second question is still reachable', async () => {
    const card = await ask('What were you going to say just then, and do you want your tea?', new Scripted(null));
    expect(card.kind).toBe('repair');
    expect(card.pending).toBe('Do you want your tea?');
    expect(partnerActions(card, { less: false, hasAnswers: false }).map((a) => a.act)).toEqual(['show', 'next']);
  });
});

describe('E-9. who to call: every person About me names is on the card, with a next page, whichever step answered', () => {
  const everyPage = (c: Card) => { const out: string[] = []; for (let p: Card | null | undefined = c; p; p = p.nextPage) out.push(...answers(p)); return out; };
  // set E: with cloud help only "Who should I call for you?" read doctor / Jenny; Tyler was gone and there was no next page
  const QUESTIONS = ['Who shall I ring for you?', 'Who would you like to invite on Sunday?', 'Who do you want me to phone?', 'Who should we visit this week?'];
  const CLOUD: ModelOutput[] = [
    { topic: 'call', kind: 'choice', choices: ['doctor', 'family', 'a friend'] },
    { topic: 'call', kind: 'choice', choices: ['family', 'friend', 'doctor'] },
    { topic: 'call', kind: 'choice', choices: ['doctor', 'nurse'] },
  ];
  it.each(QUESTIONS)('cloud help only: %s', async (q) => {
    for (const out of CLOUD) {
      const e = new Scripted(null, out);
      const card = await ask(q, e);
      expect(answers(card)).toEqual(['Grace', 'Leo']);
      // Peter is not lost, and the cloud's role word comes after the family
      expect(everyPage(card).slice(0, 4)).toEqual(['Grace', 'Leo', 'Peter', 'doctor']);
      expect(card.nextPage).toBeTruthy();
      for (const label of everyPage(card)) expect(['Maria', 'Sam', 'Alan']).not.toContain(label);
      // the cloud got the question alone: no name, no label, no count of people
      expect(e.sent).toEqual([q]);
    }
  });
  it.each(QUESTIONS)('on this computer the card is the same: %s', async (q) => {
    const viaCloud = await ask(q, new Scripted(null, CLOUD[0]));
    for (const dev of [{ topic: 'call', kind: 'choice' as const, choices: ['Grace', 'doctor'] }, { topic: 'call', kind: 'choice' as const, choices: ['Leo', 'Grace', 'doctor'] }, { topic: 'call', kind: 'choice' as const, choices: ['doctor', 'Maria', 'Peter'] }]) {
      const card = await ask(q, new Scripted(dev));
      expect(everyPage(card)).toEqual(everyPage(viaCloud));
      expect(card.source).toBe('on-device');
    }
  });
  it('more people than two pages hold are all reachable; a question that names its own two is left alone', async () => {
    const big: Profile = { ...PROFILE, people: [...PROFILE.people, { id: 'p6', name: 'Nora', relation: 'niece', household: false }, { id: 'p7', name: 'Hal', relation: 'friend', household: false }] };
    const card = await ask('Who shall I ring for you?', new Scripted(null, CLOUD[0]), 'more', big);
    expect(everyPage(card)).toEqual(['Grace', 'Leo', 'Peter', 'Nora', 'Hal', 'doctor']);
    expect(answers(await ask('Shall I ring Grace or Leo?', new Scripted(null)))).toEqual(['Grace', 'Leo']);
  });
});

describe('E-10. "No AI needed" only when no model was called; when one was asked and code made the card, the badge says so', () => {
  // set D and set E: "No AI needed" on cards that had waited about 3 s for the on-device model
  // (a comma or a long question keeps these from being "plain" either-ors, so the on-device model is asked)
  const QUESTIONS = [
    'When shall I run your bath, before the news or after it?',
    'Do you want the big blue blanket from the cupboard or the tartan one?',
    'Shall we sit out in the garden for a while, or would you rather stay in?',
  ];
  it.each(QUESTIONS)('a model was asked, its options failed, code made the card: %s', async (q) => {
    const e = new Scripted(JUNK);
    const card = await ask(q, e);
    expect(e.calls).toEqual(['device']);
    expect(card.source).toBe('code');
    expect(modelAsked(card)).toBe(true);
    expect(badgeKind(card)).toBe('codeAsked');
    // and the same question with no model at all is the same card under "No AI needed"
    const none = await ask(q, new Scripted(null));
    expect(answers(none)).toEqual(answers(card));
    expect(modelAsked(none)).toBe(false);
    expect(badgeKind(none)).toBe('code');
  });
  it('the other badges are as before', async () => {
    // no model is called for a plain either-or, a yes / no, a feeling scale: "No AI needed" is literal
    for (const q of ['Do you want jam or honey?', 'Are you warm enough?', 'How was the walk?']) {
      const e = new Scripted(JUNK);
      const card = await ask(q, e);
      expect(e.calls).toEqual([]);
      expect(badgeKind(card)).toBe('code');
    }
    const copied = await ask('Shall we walk down to the library, or would you rather we went to the market?', new Scripted({ topic: 'outing', kind: 'choice', choices: [], options: ['the library', 'the market'] }));
    expect(badgeKind(copied)).toBe('device');
    const open = await ask('What shall we have for tea tonight?', new Scripted({ topic: 'tea', kind: 'choice', choices: ['lamb', 'rice'] }));
    expect(badgeKind(open)).toBe('device');
    const cloud = await ask('What shall we have for tea tonight?', new Scripted(null, { topic: 'tea', kind: 'choice', choices: ['fish', 'eggs'] }));
    expect(badgeKind(cloud)).toBe('cloud');
    const blocked = await ask('What shall we have for tea tonight?', new Scripted(null));
    expect(badgeKind(blocked)).toBe('none');
  });
  it('the session line counts such a card apart from "no AI"', async () => {
    const cards = [await ask(QUESTIONS[0], new Scripted(JUNK)), await ask('Do you want jam or honey?', new Scripted(JUNK))];
    expect(sessionTally(cards)).toMatchObject({ code: 1, asked: 1, device: 0, cloud: 0, none: 0 });
    expect(COPY.how.tallyShort(sessionTally(cards))).toContain('1 no AI · 1 in code, AI not used');
    expect(COPY.badge.codeAsked).not.toBe(COPY.badge.code);
  });
});

describe('E-11. an open "when" question gets the same line of times in every engine state', () => {
  // set E: "When do you want to go to bed tonight?" -> 8 pm / 9 pm / 10 pm on two on-device runs, "early / late / now"
  // on the third, "soon / later / now" from the cloud
  const TIMES: [string, string[]][] = [
    ['When would you like to turn in this evening?', ['8 pm', '9 pm', '10 pm']],
    ['What time do you want your supper?', ['5 pm', '6 pm', '7 pm']],
    ['When shall we have lunch?', ['12 noon', '1 pm', '2 pm']],
    ['What time shall I wake you tomorrow morning?', ['7 am', '8 am', '9 am']],
    ['When do you want your nap?', ['1 pm', '2 pm', '3 pm']],
    ['When shall I do your hair today?', ['this morning', 'this afternoon', 'this evening']],
    ['When would you like Grace to visit?', ['today', 'tomorrow', 'at the weekend']],
    ['When did your shoulder start hurting?', ['today', 'yesterday', 'before that']],
    ['When do you want your shower?', ['now', 'in a while', 'later today']],
  ];
  const VARIED: ModelOutput[] = [
    { topic: 'time', kind: 'choice', choices: ['early', 'late', 'now'] },
    { topic: 'time', kind: 'choice', choices: ['soon', 'later', 'now'] },
    { topic: 'time', kind: 'choice', choices: ['8 pm', '9 pm', '10 pm'] },
  ];
  it.each(TIMES)('%s', async (q, want) => {
    expect(whenChoices(q, PROFILE)).toEqual(want);
    const cards: Card[] = [await ask(q, new Scripted(null))];
    for (const out of VARIED) {
      const dev = new Scripted(out); const cloud = new Scripted(null, out);
      cards.push(await ask(q, dev), await ask(q, cloud));
      // no model is asked, so nothing can vary and nothing is sent
      expect(dev.calls).toEqual([]);
      expect(cloud.calls).toEqual([]);
    }
    for (const card of cards) {
      expect(card.blocked ?? null).toBeNull();
      expect(answers(card)).toEqual(want);
      expect(card.nextPage ?? null).toBeNull();
      expect(card.choices.filter((c) => c.role === 'escape')).toHaveLength(1);
      expect(badgeKind(card)).toBe('code');
      expect(card.say).toBe(cards[0].say);
    }
  });
  it('all three stand on one card at every support level', async () => {
    for (const support of ['mild', 'more', 'most'] as const) expect(answers(await ask('When shall we have lunch?', new Scripted(null), support))).toHaveLength(3);
  });
  it('a time the partner knows is still a test, and times she names herself are still the card', async () => {
    expect(whenChoices('When is the chiropodist coming?', PROFILE)).toBeNull();
    expect((await ask('When is the chiropodist coming?', new Scripted(null))).kind).toBe('no-quiz');
    expect(whenChoices('When shall we go, at 2 or at 4?', PROFILE)).toBeNull();
    expect(answers(await ask('When shall we go, at 2 or at 4?', new Scripted(null)))).toEqual(['at 2', 'at 4']);
    expect(whenChoices('Where shall we go this evening?', PROFILE)).toBeNull();
  });
});

describe('E-12. no cut or glued labels, and no headline that is a leftover or the person\'s own name', () => {
  // set E tiles: "your right", "turn the TV", "after eat", "Honey to sit", "one at Mercy Hospital", "text jen", "try"
  // each row: the question, the tiles, and a copy of the kind the on-device model made (a piece cut out of an option)
  const ROWS: [string, string[], string[]][] = [
    ['Is it your right knee or your left that aches?', ['your right knee', 'your left knee'], ['right knee', 'your left']],
    ['Shall I switch the fan on or just leave the window open?', ['switch the fan on', 'leave the window open'], ['switch the fan', 'window open']],
    ['Do you want your eye drops before breakfast or after you wash?', ['before breakfast', 'after you wash'], ['before breakfast', 'after wash']],
    ['Would you rather ring Grace or just write to her?', ['ring Grace', 'write to her'], ['ring grace', 'write grace']],
    ['Should I do it for you or do you want to have a go yourself?', ['do it for you', 'have a go yourself'], ['do it', 'have']],
    ['Do you want Peter to drive you on Friday, or Grace?', ['Peter', 'Grace'], ['Peter to drive', 'Grace']],
    ['Do you want the chemist on Mill Lane or the one in the precinct?', ['chemist on Mill Lane', 'chemist in the precinct'], ['chemist on Mill Lane', 'one in the precinct']],
    ['Do you want the striped shirt or the plain one?', ['striped shirt', 'plain shirt'], ['striped', 'plain one']],
    ['Should Grace or Leo come with you to the dentist?', ['Grace', 'Leo'], ['Grace', 'come with you']],
  ];
  it.each(ROWS)('rules alone: %s', async (q, want) => {
    expect(answers(await ask(q, new Scripted(null)))).toEqual(want);
  });
  it.each(ROWS)('a model that copies a piece of an option does not get it onto a tile: %s', async (q, want, cut) => {
    const card = await ask(q, new Scripted({ topic: 'x', kind: 'choice', choices: cut, options: cut }));
    expect(answers(card)).toEqual(want);
  });
  it('a copied option is refused when it is a piece of a longer phrase, and accepted when it is the whole of one', () => {
    expect(validateOptions(['switch the fan', 'window'], 'Shall I switch the fan on or just leave the window open?', PROFILE)).toBeNull();
    expect(validateOptions(['before breakfast', 'after wash'], 'Do you want your eye drops before breakfast or after you wash?', PROFILE)).toBeNull();
    expect(validateOptions(['have', 'do it'], 'Should I do it for you or do you want to have a go yourself?', PROFILE)).toBeNull();
    expect(validateOptions(['cricket', 'a record'], 'Do you want the cricket on, or shall I put a record on?', PROFILE)).toEqual(['cricket', 'record']);
    expect(validateOptions(['the library', 'the market'], 'Shall we walk down to the library, or would you rather we went to the market?', PROFILE)).toEqual(['library', 'market']);
  });
  it('a thing with its verb against something to do: both sides are read as clauses', async () => {
    // (found while re-running set E: "take the dog out or stay home" gave "dog out")
    expect(answers(await ask('Do you want to put the bins out or leave them till morning?', new Scripted(null)))).toEqual(['put the bins out', 'leave them']);
    expect(answers(await ask('Shall we go to the library or stay in?', new Scripted(null)))).toEqual(['go to the library', 'stay in']);
    expect(answers(await ask('Do you want to have your shower or wait a bit?', new Scripted(null)))).toEqual(['have your shower', 'wait a bit']);
  });
  it('a name About me knows is written as About me writes it', async () => {
    expect(answers(await ask('shall we ring grace or leo?', new Scripted(null)))).toEqual(['Grace', 'Leo']);
  });
  it('headlines: no leftover words, never the person\'s own name', async () => {
    const tingle = await ask('Is it your right knee or your left that aches?', new Scripted(null));
    expect(tingle.topic).toBe('aches');
    expect((await ask('Do you wanna eat in the kitchen or the front room?', new Scripted(null))).topic).not.toMatch(/wanna/);
    expect((await ask('Do you want the chemist on Mill Lane or the one in the precinct?', new Scripted(null))).topic).toBe('chemist');
    // the cloud's topic for "… Person A?" comes back as the person's name: it is not a headline
    for (const topic of ['Alan', "Alan's mind", 'Person A']) {
      const card = await ask("What's on your mind, Alan?", new Scripted(null, { topic, kind: 'choice', choices: ['the news', 'the garden'] }));
      expect(card.blocked ?? null).toBeNull();
      expect(card.topic).not.toMatch(/Alan|Person A/);
      expect(card.topic.length).toBeGreaterThan(0);
    }
  });
});

describe('E-13. no filler tile on the next page', () => {
  const everyPage = (c: Card) => { const out: string[] = []; for (let p: Card | null | undefined = c; p; p = p.nextPage) out.push(...answers(p)); return out; };
  // set E: the next page of a dinner card held "cheese", "house", "other"; a card about telling someone held "talk about"
  it.each([
    ['What shall we cook tonight?', ['lamb', 'rice', 'other'], ['lamb', 'rice']],
    ['What would you like for tea?', ['lamb', 'salad', 'house'], ['lamb', 'salad']],
    ['What shall we have for dinner?', ['omelette', 'rice', 'cheese'], ['omelette', 'rice']],
    ['What do you fancy watching?', ['cricket', 'westerns', 'something'], ['cricket', 'westerns']],
    ['What shall I put on to listen to?', ['Elvis', 'opera', 'stuff'], ['Elvis', 'opera']],
    ['Where shall we go on Saturday?', ['allotment', 'library', 'somewhere nice'], ['allotment', 'library']],
  ])('%s: a guess after two of the family\'s own is not kept', async (q, proposed, want) => {
    for (const engine of [new Scripted({ topic: 'x', kind: 'choice', choices: proposed }), new Scripted({ topic: 'x', kind: 'choice', choices: [...proposed].reverse() })]) {
      const card = await ask(q, engine);
      expect(everyPage(card).sort()).toEqual([...want].sort());
      expect(card.why?.dropped.map((d) => d.label)).toContain(proposed[2]);
    }
  });
  it.each([
    ['What shall we do about the leak?', ['ring the plumber', 'wait', 'other'], ['ring the plumber', 'wait']],
    ['What should I say to the neighbour?', ['thank you', 'talk about', 'sorry'], ['thank you', 'sorry']],
    ['What do you want from the shop?', ['bread', 'things', 'milk'], ['bread', 'milk']],
  ])('%s: a filler word or a phrase that breaks off is never a tile', async (q, proposed, want) => {
    const card = await ask(q, new Scripted({ topic: 'x', kind: 'choice', choices: proposed }));
    expect(everyPage(card)).toEqual(want);
  });
  it('a real third choice still waits on the next page, and a third entry of the family\'s own too', async () => {
    const general = await ask('What shall we do about the leak?', new Scripted({ topic: 'leak', kind: 'choice', choices: ['ring the plumber', 'wait', 'mop it up'] }));
    expect(everyPage(general)).toEqual(['ring the plumber', 'wait', 'mop it up']);
    const own = await ask('What shall we cook tonight?', new Scripted({ topic: 'tea', kind: 'choice', choices: ['lamb', 'rice', 'salad'] }));
    expect(everyPage(own)).toEqual(['lamb', 'rice', 'salad']);
    // on a "who to call" card a role after the family is a real choice (E-9)
    const who = await ask('Who shall I ring for you?', new Scripted({ topic: 'call', kind: 'choice', choices: ['Grace', 'doctor'] }));
    expect(everyPage(who)).toContain('doctor');
  });
});

describe('E-14. a name About me does not list never goes to the cloud as typed: lowercase names, and names that are also words', () => {
  // set E (checked with the swap alone, off the network): "did you want me to call mike back" and "Did May call today?" kept the name
  const has = (text: string, name: string) => new RegExp(`(?<![\\p{L}])${name}(?![\\p{L}])`, 'i').test(text);
  const UNLISTED = ['brenda', 'okafor', 'stan', 'nguyen', 'hank', 'delgado', 'wendy', 'kowalczyk', 'priya', 'mike'];
  const LOWER: ((n: string) => string)[] = [
    (n) => `can you ring ${n} about friday`,
    (n) => `did ${n} say when the scan is`,
    (n) => `what should we send ${n} for the wedding`,
    (n) => `is ${n} coming for lunch`,
    (n) => `do you want ${n} to drive you to the clinic`,
    (n) => `${n} wants to pop in later is that ok`,
    (n) => `shall i tell ${n}'s mum you said hello`,
    (n) => `what did the nurse say to ${n}`,
  ];
  it('a lowercase name that is not an English word is swapped wherever it stands, and comes back on this computer', () => {
    for (const n of UNLISTED) for (const t of LOWER) {
      const q = t(n);
      const out = stripQuestion(q, PROFILE);
      expect(has(out.text, n), `${q} -> ${out.text}`).toBe(false);
      expect(out.text).toContain('Name A');
      expect(restoreNames(out.text, out.map)).toBe(q);
      expect(findLeaks(out.text, PROFILE)).toEqual([]);
    }
  });
  // first names that are also words; none is in the fixture's About me
  const WORDS = ['may', 'june', 'april', 'bill', 'rose', 'mark', 'pat', 'dawn', 'frank', 'penny', 'holly', 'will', 'joy', 'hope'];
  const FRAMES: ((n: string) => string)[] = [
    (n) => `did ${n} ring this morning`,
    (n) => `can you call ${n} back`,
    (n) => `what shall we get ${n} for christmas`,
    (n) => `is ${n} coming on sunday`,
    (n) => `ask ${n} about the keys`,
    (n) => `shall I text ${n} that we are late`,
    (n) => `${n} called, do you want to ring back?`,
    (n) => `Did ${n.charAt(0).toUpperCase()}${n.slice(1)} say when she is coming?`,
    (n) => `${n.charAt(0).toUpperCase()}${n.slice(1)} called, do you want to ring back?`,
    (n) => `Shall we ask ${n.charAt(0).toUpperCase()}${n.slice(1)} to stay for tea?`,
  ];
  it('a word that is also a first name is swapped where it stands like a name, in lower case and with a capital', () => {
    for (const n of WORDS) for (const t of FRAMES) {
      const q = t(n);
      const out = stripQuestion(q, PROFILE);
      expect(has(out.text, n), `${q} -> ${out.text}`).toBe(false);
      expect(restoreNames(out.text, out.map)).toBe(q);
    }
  });
  it('the same words used as words go as typed', () => {
    for (const q of ['did you pay the gas bill', 'shall we go in may', 'you may sit down now', 'will you have a rose in the vase', 'I hope it stops raining', 'Is your birthday in June?', 'May I take your plate?', 'Will you eat a bit more?', 'what a joy to see you eat', 'do you want honey on your toast', 'is it on the 3rd of April']) {
      expect(stripQuestion(q, PROFILE).text).toBe(q);
    }
  });
  it('on a question that goes to cloud help, the request, the "Sent" line and the tiles agree', async () => {
    const e = new Scripted(null, { topic: 'present', kind: 'choice', choices: ['a book for Name A', 'flowers'] });
    const card = await ask('what should we get june for her birthday', e);
    expect(e.sent).toEqual(['What should we get Name A for her birthday?']);
    expect(card.cloudPayload).toContain('What should we get Name A for her birthday?');
    expect(card.cloudPayload).not.toMatch(/june/i);
    expect(answers(card)).toEqual(['a book for june', 'flowers']);
    const e2 = new Scripted(null, { topic: 'message', kind: 'choice', choices: ['thank you', 'see you soon'] });
    await ask('what should we cook when mike from the club comes over', e2);
    expect(e2.sent[0]).not.toMatch(/mike/i);
  });
  it('the limits, pinned: what is still sent as typed, and what is swapped although it is a word', () => {
    // a word-name after "with" / "for" that is more often a word than a name stays (the safe side stops here)
    expect(stripQuestion('did you sit with joy at the club', PROFILE).text).toBe('did you sit with joy at the club');
    expect(stripQuestion('is that cake for hope', PROFILE).text).toBe('is that cake for hope');
    // an English word the list does not have is swapped: a label too many, never a name too many
    expect(stripQuestion('did you try the zumba class', PROFILE).text).toBe('did you try the Name A class');
    // "it was dawn when you woke" is read as a person: over-replacement, accepted
    expect(stripQuestion('was dawn here when you woke', PROFILE).text).toBe('was Name A here when you woke');
  });
});

describe('E-15. a filler is not a name, and the kind of place stays when its name is swapped', () => {
  // set E: "Um" went as "Name A"; "Willow Street" and "Mercy Hospital" went as "Name A Name B"
  it.each(['Um', 'Uh', 'Er', 'Erm', 'Hmm', 'Oh', 'Well', 'Right', 'Okay so', 'Hey', 'Now then', 'Ah', 'Look'])('"%s, …" at the start goes as typed', (filler) => {
    const q = `${filler}, do you want the radio on?`;
    expect(stripQuestion(q, PROFILE).text).toBe(q);
  });
  const PLACES: [string, string][] = [['Hawthorn', 'Street'], ['Calder', 'Road'], ['Whitmore', 'Hospital'], ['Bexley', 'Bakery'], ['Ravens', 'Lodge'], ['Park', 'Avenue'], ['Church', 'Lane'], ['Elm', 'Court'], ['Abbey', 'Surgery'], ['Station', 'Road']];
  it.each(PLACES)('%s %s: the name is swapped, the kind of place is kept', (name, type) => {
    for (const q of [`Shall we go to the one on ${name} ${type} tonight?`, `Do you want the clinic at ${name} ${type}?`, `Is it the ${name} ${type} one you mean?`]) {
      const out = stripQuestion(q, PROFILE);
      expect(out.text, q).toContain(`Name A ${type}`);
      expect(out.text).not.toContain(`${name} ${type}`);
      expect(restoreNames(out.text, out.map)).toBe(q);
    }
  });
  it('a place with two names keeps its two kinds; a possessive stays outside the label', () => {
    expect(stripQuestion('Should we try the Stag Inn on Varley Road tonight?', PROFILE).text).toBe('Should we try the Name A Inn on Name B Road tonight?');
    expect(stripQuestion("Do you want to go to Brannigan's Bakery?", PROFILE).text).toBe("Do you want to go to Name A's Bakery?");
    expect(stripQuestion('is it the shop on varley road', PROFILE).text).toBe('is it the shop on Name A road');
  });
  it('the cloud gets the kind of place, and the tile gets the name back', async () => {
    const e = new Scripted(null, { topic: 'shop', kind: 'choice', choices: ['bread', 'milk'] });
    const card = await ask('What do you need from the shop on Calder Road?', e);
    expect(e.sent).toEqual(['What do you need from the shop on Name A Road?']);
    expect(card.cloudSwaps).toContain('Name A ← Calder');
  });
});
