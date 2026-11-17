// The classes of mistake a rehearsal on 16 Nov 2026 found (two sets of partner questions written for it, run through the app
// three ways), one group of tests per class. Every question here is a NEW phrasing written for this file: none is a
// sentence of the simulation sets, so those sets are not the only check that the class is fixed. The family is the
// test fixture (Alan; Maria asking), not the sample family the simulation used.
import { describe, expect, it } from 'vitest';
import { partnerActions } from '../../core/actions';
import { COPY } from '../../core/copy';
import type { DeviceStatus, Engine, ModelResult } from '../../core/engine';
import { makeCard, needsNoModel } from '../../core/pipeline';
import { cloudTextRequest, pictureRequestBody } from '../../core/requests';
import { isContactQ, isPainLevel, isQuiz, optOutTrim, orList, orPair, positiveForm, splitQuestion, yesNoTopic } from '../../core/rules';
import type { Card, ModelOutput, Profile, SupportLevel } from '../../core/types';
import { PROFILE } from './fixtures';

/** A scripted engine: null = that step is not there. Every call is recorded. */
class Scripted implements Engine {
  label = 'scripted';
  modes = { device: 'ONLY_ON_DEVICE', cloud: 'PREFER_IN_CLOUD', pictures: 'ONLY_IN_CLOUD' };
  calls: string[] = [];
  sent: string[] = [];
  cloudConfigured: boolean;
  constructor(private dev: ModelOutput | null, private cloud: ModelOutput | null = null) { this.cloudConfigured = !!cloud; }
  async deviceStatus(): Promise<DeviceStatus> { return this.dev ? 'available' : 'unavailable'; }
  async prepareDevice() {}
  async runDevice(): Promise<ModelResult> { this.calls.push('device'); return { text: JSON.stringify(this.dev), source: 'on-device', ms: 3 }; }
  cloudRequest(q: string) { return cloudTextRequest(q); }
  async runCloud(q: string): Promise<ModelResult> { this.calls.push('cloud'); this.sent.push(q); return { text: JSON.stringify(this.cloud), source: 'in-cloud', ms: 4 }; }
  pictureRequest(w: string) { return pictureRequestBody(w); }
  async picture() { return null; }
}
const ANY: ModelOutput = { topic: 'thing', kind: 'choice', choices: ['one thing', 'another thing', 'a third thing'] };
const ask = (q: string, e: Scripted, support: SupportLevel = 'more', profile: Profile = PROFILE) =>
  makeCard(q, { profile, support, engine: e, allowCloud: e.cloudConfigured, deviceReady: e['dev' as keyof Scripted] !== null });
const answers = (c: Card) => c.choices.filter((x) => x.role === 'answer').map((x) => x.label);
/** Every answer label on the card and on every later page of it. */
const everyPage = (c: Card) => { const out: string[] = []; for (let p: Card | null | undefined = c; p; p = p.nextPage) out.push(...answers(p)); return out; };
/** The three engine states a card can be made in: rules alone, the on-device model, cloud help only. */
const STATES: [string, () => Scripted][] = [['rules alone', () => new Scripted(null)], ['on-device model', () => new Scripted(ANY)], ['cloud help only', () => new Scripted(null, ANY)]];

describe('1. a question that tests a name never becomes a card of names', () => {
  const NAME_TESTS = [
    "What's your little grandson's name?", 'What is the name of your brother?', "Can you tell me your daughter's name?",
    "Do you know the cat's name?", "What's that neighbour of ours called?", 'What did we name the cat?', 'Who is Grace?', "Who's our grandson?",
  ];
  for (const q of NAME_TESTS) for (const [state, make] of STATES) {
    it(`${q} (${state}): no card, no model asked, the coaching line`, async () => {
      expect(isQuiz(q, PROFILE)).toBe(true);
      const e = make();
      const c = await ask(q, e);
      expect(e.calls).toEqual([]);
      expect(c.kind).toBe('no-quiz');
      expect(c.choices).toEqual([]);
      expect(c.coach).toBe(COPY.coach.test);
      expect(c.cloudPayload ?? null).toBeNull();
    });
  }
  it('"Who is Grace?" gives the partner the sentence to say, from About me', async () => {
    expect((await ask('Who is Grace?', new Scripted(null))).say).toBe("Tell, don't test: Grace is your daughter.");
  });
  it('a question about a name that the memory rule does not catch still never shows a name that is not in About me, nor the person themself, on any page', async () => {
    const e = new Scripted({ topic: 'boys', kind: 'choice', choices: ['Leo', 'Oscar', 'Alan'] });
    for (const q of ['Which of the boys is called after your father?', 'Which grandchild has the same name as your dad?']) {
      const c = await ask(q, e, 'more');
      expect(everyPage(c)).not.toContain('Oscar');
      expect(everyPage(c)).not.toContain('Alan');
    }
  });
  it('a name the partner typed is not "made up": it may stand on a who-card', async () => {
    const e = new Scripted({ topic: 'lift', kind: 'choice', choices: ['Grace', 'Winnie', 'Peter'] });
    const c = await ask('Who should give Winnie a lift, do you think?', e, 'mild');
    expect(everyPage(c)).toContain('Winnie');
  });
  it('not a test: questions that ask for a wish or an opinion', () => {
    for (const q of ['What shall we call the new kitten?', 'Who do you want to sit next to?', 'What name do you like best for the boat?']) {
      expect(isQuiz(q, PROFILE), q).toBe(false);
    }
  });
});

describe('2. two questions in one are split, and the second is always reachable', () => {
  const TWO: [string, string, string][] = [
    ['Do you want a biscuit and should I put the radio on?', 'Do you want a biscuit?', 'Should I put the radio on?'],
    ['How was your walk and is your knee still stiff?', 'How was your walk?', 'Is your knee still stiff?'],
    ['Are you comfortable and can Leo come in now?', 'Are you comfortable?', 'Can Leo come in now?'],
    ['Did you sleep and will the nurse come today?', 'Did you sleep?', 'Will the nurse come today?'],
    ["Is the tea too hot and what's on the telly tonight?", 'Is the tea too hot?', "What's on the telly tonight?"],
    ['Have you eaten, and then shall we ring Grace?', 'Have you eaten?', 'Shall we ring Grace?'],
  ];
  for (const [q, first, second] of TWO) {
    it(q, async () => {
      expect(splitQuestion(q)).toEqual([first, second]);
      const c = await ask(q, new Scripted(null));
      expect(c.asked).toBe(first);
      expect(c.pending).toBe(second);
      expect(c.coach).toContain(COPY.coach.twoQuestions);
      expect(partnerActions(c, { less: false, hasAnswers: false }).map((a) => a.act)).toContain('next');
    });
  }
  it('one question with "and" in it stays one', () => {
    for (const q of ['Do you want salt and vinegar on them?', 'Shall we go and do the shopping?', 'Would you like to come and have a look?', 'Do you want bread and butter?']) {
      expect(splitQuestion(q)[1], q).toBeNull();
    }
  });
  it('the second question has its button whatever became of the first: no card, a memory question, choices hidden', async () => {
    // first part is an open question and no model is there: no card
    const open = await ask('What shall we have for tea? Shall I lay the table?', new Scripted(null));
    expect(open.blocked).toBeTruthy();
    expect(open.pending).toBe('Shall I lay the table?');
    // first part is a memory question: no card, a line to say
    const quiz = await ask('What time does the chiropodist come? Do you want me to wait in?', new Scripted(null));
    expect(quiz.kind).toBe('no-quiz');
    expect(quiz.pending).toBe('Do you want me to wait in?');
    // first part made a card
    const plain = await ask('Are you thirsty, and do you want the window shut?', new Scripted(null));
    for (const c of [open, quiz, plain]) for (const less of [false, true]) {
      const acts = partnerActions(c, { less, hasAnswers: false });
      expect(acts.filter((a) => a.act === 'next').map((a) => a.label), `${c.asked} less=${less}`).toEqual([COPY.card.nextSecond]);
    }
  });
  it('a card with nothing pending has no such button; a card with a next page has "more choices"', async () => {
    const c = await ask('Are you thirsty?', new Scripted(null));
    expect(partnerActions(c, { less: false, hasAnswers: false }).map((a) => a.act)).toEqual(['show', 'less', 'stuck']);
    const paged = await ask('Where is it sore?', new Scripted(null));
    expect(partnerActions(paged, { less: false, hasAnswers: true }).map((a) => a.label)).toEqual([COPY.card.show, COPY.card.less, COPY.card.nextWhere, COPY.card.recap, COPY.card.stuck]);
  });
});

describe('3. a negative question gets a card on which yes means yes', () => {
  const NEGATIVE: [string, string][] = [
    ["You don't want the fire on, do you?", 'Do you want the fire on?'],
    ["Aren't you tired?", 'Are you tired?'],
    ["You're not hungry yet, are you?", 'Are you hungry yet?'],
    ['Do you not like the soup?', 'Do you like the soup?'],
    ["Wouldn't you like a rest?", 'Would you like a rest?'],
    ["You haven't had your tablets, have you?", 'Have you had your tablets?'],
    ["Isn't the room too warm?", 'Is the room too warm?'],
    ["Love, you won't need your coat, will you?", 'Love, will you need your coat?'],
    ["It isn't too loud?", 'Is it too loud?'],
  ];
  for (const [q, plain] of NEGATIVE) for (const [state, make] of STATES) {
    it(`${q} (${state}) is asked as "${plain}"`, async () => {
      expect(positiveForm(q)).toBe(plain);
      const e = make();
      const c = await ask(q, e);
      expect(e.calls).toEqual([]); // the same card in every engine state: code reads it
      expect(c.asked).toBe(plain);
      expect(c.kind).toBe('yesno');
      expect(c.source).toBe('code');
      expect(answers(c)).toEqual(['yes', 'no']);
      expect(c.say.startsWith(plain)).toBe(true);
      expect(c.say).not.toMatch(/n't|\bnot\b(?! sure)/);
      expect(c.topic).not.toMatch(/n't|\bnot\b/);
      expect(c.coach).toBe(COPY.coach.negative);
      expect(c.blocked).toBeFalsy();
    });
  }
  it('a suggestion, a plain question and a statement are left as typed', () => {
    for (const q of ["Why don't we ring Peter?", 'Do you want the fire on?', "Don't worry about the dishes?", 'What do you not like about it?']) expect(positiveForm(q), q).toBeNull();
  });
  it('a negative either-or keeps its two options', async () => {
    const c = await ask("Wouldn't you rather have rice or salad?", new Scripted(null));
    expect(c.asked).toBe('Would you rather have rice or salad?');
    expect(answers(c)).toEqual(['rice', 'salad']);
  });
});

describe('4. three options named in the question are three tiles', () => {
  const LISTS: [string, string[]][] = [
    ['Porridge, toast, or a boiled egg this morning?', ['porridge', 'toast', 'boiled egg']],
    ['Do you want the cardigan, the fleece, or the raincoat?', ['cardigan', 'fleece', 'raincoat']],
    ['Biscuits, crisps or fruit?', ['biscuits', 'crisps', 'fruit']],
    ['Shall I put on cricket, westerns, or the news?', ['cricket', 'westerns', 'news']],
    ['Alan, the allotment, the library, or the market today?', ['allotment', 'library', 'market']],
  ];
  for (const [q, want] of LISTS) {
    it(`${q}: all three, in order, at "3 at a time" and at "2 at a time"`, async () => {
      expect(orList(q, PROFILE)).toEqual(want);
      expect(needsNoModel(q, PROFILE)).toBe(true);
      for (const support of ['mild', 'more'] as const) for (const [, make] of STATES) {
        const e = make();
        const c = await ask(q, e, support);
        expect(e.calls).toEqual([]);
        expect(answers(c)).toEqual(want);
        expect(c.choices.filter((x) => x.role === 'escape')).toHaveLength(1);
        for (const w of want) expect(c.say.toLowerCase()).toContain(w.toLowerCase());
        expect(c.source).toBe('code');
      }
    });
    it(`${q}: at the largest tiles, two on the card and the third on the next page`, async () => {
      const c = await ask(q, new Scripted(null), 'most');
      expect(answers(c)).toEqual(want.slice(0, 2));
      expect(everyPage(c)).toEqual(want);
    });
  }
  it('a fourth option waits on the next page; none is lost', async () => {
    const c = await ask('Lamb, rice, salad or an omelette tonight?', new Scripted(null));
    expect(answers(c)).toHaveLength(3);
    expect(everyPage(c)).toEqual(['lamb', 'rice', 'salad', 'omelette']);
  });
  it('a first word that only looks like a name is an option; a name About me knows is the person spoken to', () => {
    expect(orList('Custard, cream, or ice cream with it?', PROFILE)).toEqual(['custard', 'cream', 'ice cream']);
    expect(orList('Alan, custard or cream?', PROFILE)).toBeNull(); // two options: the either-or parser's job
    expect(orPair('Alan, custard or cream?')).toEqual(['custard', 'cream']);
  });
  it('a list of clauses, a yes / no and "or not" are not lists', () => {
    for (const q of ['Do you want lamb, rice, or would you rather wait for Grace?', 'Are you cold?', 'Do you want lamb, rice, or not?']) expect(orList(q, PROFILE), q).toBeNull();
  });
});

describe('5. "see", "meet", "have over" on a who-question count like call / visit / invite', () => {
  const SEE = ['Who would you like to see at the weekend?', 'Who shall we have over for your birthday?', 'Who do you fancy meeting up with?', 'Who should come round on Sunday?'];
  for (const q of SEE) {
    it(`${q}: with cloud help only, the people About me names; the cloud gets no name`, async () => {
      expect(isContactQ(q)).toBe(true);
      const e = new Scripted(null, { topic: 'visit', kind: 'choice', choices: ['family', 'a friend'] });
      const c = await ask(q, e, 'mild');
      expect(c.blocked).toBeFalsy();
      expect(answers(c)).toEqual(['Grace', 'Leo', 'Peter']);
      expect(e.sent[0]).toBe(q);
    });
    it(`${q}: on this computer, whoever lives here is never offered, on any page`, async () => {
      const e = new Scripted({ topic: 'see', kind: 'choice', choices: ['Grace', 'Maria', 'Sam'] });
      const c = await ask(q, e, 'more');
      const all = [...everyPage(c)];
      expect(all).toContain('Grace');
      for (const home of ['Maria', 'Sam', 'you']) expect(all).not.toContain(home);
    });
  }
  it('"see" about the telly or a match is not contact', () => {
    for (const q of ['Who do you want to see win the cricket?', 'Who did you see on the telly?', 'What do you want to see?']) expect(isContactQ(q), q).toBe(false);
  });
});

describe('6. a proposal with a way to decline is one yes / no question', () => {
  const OPT: [string, string][] = [
    ['Do you want a lie-down, or is that a no?', 'Do you want a lie-down?'],
    ['Would you like some soup, or are you alright for now?', 'Would you like some soup?'],
    ['Shall I fetch your glasses, or are you fine?', 'Shall I fetch your glasses?'],
    ['Do you need the commode, or would you rather not?', 'Do you need the commode?'],
  ];
  for (const [q, proposal] of OPT) for (const [state, make] of STATES) {
    it(`${q} (${state})`, async () => {
      expect(optOutTrim(q)).toBe(proposal);
      const e = make();
      const c = await ask(q, e);
      expect(e.calls).toEqual([]);
      expect(c.kind).toBe('yesno');
      expect(c.asked).toBe(proposal);
      expect(answers(c)).toEqual(['yes', 'no']);
      expect(c.source).toBe('code');
    });
  }
  it('two real options are still two options', async () => {
    expect(optOutTrim('Do you want soup, or are you having toast?')).toBeNull();
    expect(optOutTrim('Do you want the fire on or the heater?')).toBeNull();
    expect(answers(await ask('Do you want the fire on or the heater?', new Scripted(null)))).toEqual(['fire', 'heater']);
  });
});

describe('7. an About-me entry of another kind is not an answer; nothing is made up to fill the card', () => {
  const ONE: Profile = { ...PROFILE, music: ['Elvis'], tv: ['Match of the Day', 'cricket'] };
  for (const q of ['What would you like to listen to?', 'What music shall I find for you?', 'Which songs do you want on?']) {
    it(`${q}: a TV entry and a team are not music; the one artist and the radio stand`, async () => {
      const e = new Scripted({ topic: 'music', kind: 'choice', choices: ['Elvis', 'Match of the Day', 'Leeds United', 'cricket'] });
      const c = await ask(q, e, 'mild', ONE);
      const all = everyPage(c);
      expect(all).toContain('Elvis');
      for (const tv of ['Match of the Day', 'cricket']) expect(all).not.toContain(tv);
      expect(all).toContain('radio');
      expect(c.why?.dropped.map((d) => d.rule)).toContain(COPY.how.why.rules.wrongList);
      // the About-me artist and the radio, nothing else: no second artist appears from nowhere, and the team is not music
      expect(all).toEqual(['Elvis', 'radio']);
    });
  }
  it('a food question drops a place, a watching question drops a food', async () => {
    const food = await ask('What do you fancy to eat later?', new Scripted({ topic: 'food', kind: 'choice', choices: ['lamb', 'pub', 'rice'] }), 'mild');
    expect(everyPage(food)).toEqual(['lamb', 'rice']);
    const tv = await ask('What shall we watch after tea?', new Scripted({ topic: 'tv', kind: 'choice', choices: ['westerns', 'omelette', 'cricket'] }), 'mild');
    expect(everyPage(tv)).toEqual(['westerns', 'cricket']);
  });
  it('a question whose kind is not certain is left alone', async () => {
    const c = await ask('What shall I put on?', new Scripted({ topic: 'put on', kind: 'choice', choices: ['cricket', 'Elvis'] }), 'mild');
    expect(everyPage(c)).toEqual(['cricket', 'Elvis']);
  });
});

describe('8. a question that turns on a hidden About-me word is not sent to guess at', () => {
  for (const q of ['What shall I bring you from the allotment?', 'What do you want from the market this week?', 'What should Grace pick up from the library?']) {
    it(`${q}: cloud help is not asked, there is no card, and the reason is said`, async () => {
      const e = new Scripted(null, { topic: 'things', kind: 'choice', choices: ['food', 'drink', 'medicine'] });
      const c = await ask(q, e);
      expect(e.calls).toEqual([]);
      expect(c.blocked).toMatch(/turns on "(?:the )?(?:allotment|market|library)" from About me/);
      expect(c.choices).toEqual([]);
      expect(c.cloudPayload ?? null).toBeNull();
      expect(c.cloudAttempted ?? null).toBeNull();
      expect(c.unsentPayload).toContain('Place A');
      expect(c.trace?.find((t) => t.step === 'stripped')?.why).toBe(COPY.notes.trace.cloudHidden);
    });
  }
  it('a card made on this computer for such a question is kept, and still nothing is sent', async () => {
    // two mood words send a device card to the cloud for a second opinion: here it must stay
    const e = new Scripted({ topic: 'allotment', kind: 'choice', choices: ['good beans', 'nice carrots'] }, ANY);
    const c = await ask('What shall I bring you from the allotment?', e);
    expect(e.calls).toEqual(['device']);
    expect(answers(c)).toEqual(['good beans', 'nice carrots']);
    expect(c.cloudPayload ?? null).toBeNull();
  });
  it('a question where a general answer can fit still goes, with the word swapped out', async () => {
    const e = new Scripted(null, { topic: 'plant', kind: 'choice', choices: ['beans', 'peas'] });
    const c = await ask('What should we plant at the allotment this spring?', e);
    expect(e.sent).toEqual(['What should we plant at the Place A this spring?']);
    expect(answers(c)).toEqual(['beans', 'peas']);
  });
});

describe('9. a pain question gets the pain card, and a number scale stays on it', () => {
  it.each(["How's the ache in your shoulder today?", 'How is your backache this morning?', 'How are the pains in your legs?', 'How much does your hip hurt?'])('%s: the pain levels, not good / bad', async (q) => {
    expect(isPainLevel(q)).toBe(true);
    const c = await ask(q, new Scripted(ANY, ANY));
    expect(c.kind).toBe('pain');
    expect(answers(c)).toEqual(['a little', 'a lot']);
    expect(c.topic).toBe('pain');
  });
  it.each([
    ['How bad is the ache, on a scale of 1 to 10?', 'more', ['a little (1 to 5)', 'a lot (6 to 10)']],
    ['Where is the pain today, 0 to 10?', 'more', null],
    ['What is your pain out of ten?', 'mild', ['a little (0 to 3)', 'some (4 to 6)', 'a lot (7 to 10)']],
    ['How much does it hurt, from one to five?', 'mild', ['a little (1 to 2)', 'some (3)', 'a lot (4 to 5)']],
  ] as [string, SupportLevel, string[] | null][])('%s', async (q, support, want) => {
    const e = new Scripted(ANY, ANY);
    const c = await ask(q, e, support);
    expect(e.calls).toEqual([]);
    if (!want) { expect(c.kind).toBe('body'); return; } // "where" stays the body map
    expect(c.kind).toBe('pain');
    expect(answers(c)).toEqual(want);
    // the picture of the level is kept, and every number of the scale is on exactly one tile
    expect(c.choices[0].picture).toEqual({ type: 'builtin', id: 'a little' });
    expect(c.notes).toContain(COPY.notes.painNumbers);
  });
  it('not the pain itself: the pain clinic, the painkillers, a feeling', () => {
    for (const q of ['How was the pain clinic?', 'How are the pain tablets working?', 'How was your day?']) expect(isPainLevel(q), q).toBe(false);
  });
});

describe('10. labels and headlines are whole phrases in the question\'s own order', () => {
  it('a verb keeps its particle', async () => {
    expect(orPair('Do you want to sit up or lie down?')).toEqual(['sit up', 'lie down']);
    expect(orPair('Shall we go out or stay in?')).toEqual(['go out', 'stay in']);
    expect(answers(await ask('Would you rather lie down or sit by the window?', new Scripted(null)))).toEqual(['lie down', 'sit by the window']);
    expect(orPair('The cricket on or westerns?')).toEqual(['cricket', 'westerns']); // "on" after a thing still goes
  });
  it.each([
    ['Did you take your eye drops this morning?', 'take your eye drops'],
    ['Is it alright if Leo stays the night?', 'Leo stays the night'],
    ['Should we ask Peter round for lunch?', 'ask Peter round'],
    ['Shall I draw the curtains a bit?', 'draw the curtains'],
    ['Do you need your stick?', 'stick'],
    ['Are you warm enough, love?', 'warm enough'],
    ['Ma, you want coffee?', 'coffee'],
    ['Can Grace borrow the car on Friday?', 'Grace borrow the car'],
    ['Shall I switch the lamp on?', 'switch the lamp on'],
  ])('%s -> "%s"', (q, want) => {
    expect(yesNoTopic(q, PROFILE)).toBe(want);
  });
  it('the headline of a yes / no card is words of the question, in order, at most four', async () => {
    for (const q of ['Did you manage to finish your breakfast this morning?', 'Would you like me to phone the surgery for you?', 'Is it okay if Peter and Grace both come on Sunday?']) {
      const c = await ask(q, new Scripted(null));
      const ws = c.topic.split(' ');
      expect(ws.length, q).toBeLessThanOrEqual(4);
      let at = -1;
      const qw = q.replace(/[?,]/g, '').split(' ');
      for (const w of ws) { const i = qw.findIndex((x, k) => k > at && x.toLowerCase() === w.toLowerCase()); expect(i, `${q}: "${w}" of "${c.topic}"`).toBeGreaterThan(at); at = i; }
    }
  });
  it('what is left of a clause is no headline for an either-or', async () => {
    const c = await ask('Shall I phone Grace or wait until she phones us?', new Scripted(null));
    expect(answers(c)).toEqual(['phone Grace', 'wait']);
    expect(c.topic).not.toMatch(/until|phones/);
  });
});

describe('11. the time of something already fixed is a memory question in every engine state', () => {
  for (const q of ['What time is the chiropodist on Tuesday?', 'When is the hospital appointment?', 'What day does the cleaner come?', "When's Leo's school play?"]) for (const [state, make] of STATES) {
    it(`${q} (${state}): no card, nothing asked of a model, nothing sent`, async () => {
      const e = make();
      const c = await ask(q, e);
      expect(e.calls).toEqual([]);
      expect(c.kind).toBe('no-quiz');
      expect(c.say).toMatch(/It's (?:at|on) …/);
      expect(c.cloudPayload ?? null).toBeNull();
    });
  }
  it('a wish about a time is not a test', () => {
    for (const q of ['What time should Grace come round?', 'When do you want your bath?', 'When is a good time to ring Peter?', 'When are you going to have your nap?', 'What day would suit you for the barber?']) expect(isQuiz(q, PROFILE), q).toBe(false);
  });
});

describe('12. "No AI needed" means nothing of a model\'s answer is on the card', () => {
  it('an either-or read in code is the same card whether or not a model ran, headline included', async () => {
    // a comma keeps this from being a "plain" either-or, so the on-device model is asked; its options fail the check
    const q = 'When shall we go to the library, this morning or after lunch?';
    const none = await ask(q, new Scripted(null));
    const e = new Scripted({ topic: 'books', kind: 'choice', choices: ['books'], options: ['shall we go', 'lunch'] });
    const withModel = await ask(q, e);
    expect(e.calls).toEqual(['device']);
    expect(withModel.source).toBe('code');
    expect(withModel.topic).toBe(none.topic);
    expect(withModel.topic).not.toBe('books');
    expect(answers(withModel)).toEqual(answers(none));
    expect(withModel.say).toBe(none.say);
  });
  it('when the model\'s options are the card, the badge names the step that ran', async () => {
    const e = new Scripted({ topic: 'outing', kind: 'choice', choices: [], options: ['the library', 'the market'] });
    const c = await ask('Shall we walk down to the library, or would you rather we went to the market?', e);
    expect(c.source).toBe('on-device');
  });
});
