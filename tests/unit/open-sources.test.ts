// build spec §2.6 (where open-question choices may come from), §2.7 (people), §2.9 (figures), §2.10 (the line per
// memory-question type), §2.11 (medicine is not a body map), §2.13 (a blocked card carries no choices).
// Written 11 Nov 2026; all examples new.
import { describe, expect, it } from 'vitest';
import type { DeviceStatus, Engine, ModelResult } from '../../core/engine';
import { makeCard } from '../../core/pipeline';
import { cloudTextRequest, pictureRequestBody } from '../../core/requests';
import { dropGenericWhere, figures, householdFilter, madeUpVariants, quizRephrase, sourceFill } from '../../core/rules';
import { SAMPLE_PROFILE } from '../../core/sample';
import type { ModelOutput, Profile } from '../../core/types';
import { PROFILE } from './fixtures';

class Fake implements Engine {
  label = 'fake';
  modes = { device: 'ONLY_ON_DEVICE', cloud: 'PREFER_IN_CLOUD', pictures: 'ONLY_IN_CLOUD' };
  cloudConfigured = true;
  deviceCalls: string[] = [];
  cloudCalls: string[] = [];
  constructor(private dev: ModelOutput | null, private cloud: ModelOutput = { topic: 'x', kind: 'choice', choices: ['one thing', 'another thing'] }) {}
  async deviceStatus(): Promise<DeviceStatus> { return 'available'; }
  async prepareDevice() {}
  async runDevice(p: string): Promise<ModelResult> { this.deviceCalls.push(p); if (!this.dev) throw new Error('no model'); return { text: JSON.stringify(this.dev), source: 'on-device', ms: 3 }; }
  cloudRequest(q: string) { return cloudTextRequest(q); }
  async runCloud(q: string): Promise<ModelResult> { this.cloudCalls.push(q); return { text: JSON.stringify(this.cloud), source: 'in-cloud', ms: 3 }; }
  pictureRequest(w: string) { return pictureRequestBody(w); }
  async picture() { return null; }
}
const env = (engine: Engine, profile: Profile = SAMPLE_PROFILE, extra: Record<string, unknown> = {}) => ({ profile, support: 'more' as const, engine, allowCloud: true, deviceReady: true, ...extra });
const labels = (c: { choices: { label: string }[] }) => c.choices.map((x) => x.label);
const choice = (choices: string[], topic = 'x'): ModelOutput => ({ topic, kind: 'choice', choices });

describe('§2.6: allowed sources for an open question', () => {
  it('where: a generic "stay home / go out" is replaced by places from About me', async () => {
    expect(dropGenericWhere(['stay home', 'go out'], 'Where would you like to go on Saturday?', SAMPLE_PROFILE)).toEqual([]);
    expect(dropGenericWhere(['stay home', 'go out'], 'Where would you like to go on Saturday?', { ...SAMPLE_PROFILE, places: [] })).toEqual(['stay home', 'go out']);
    const e = new Fake(choice(['stay home', 'go out'], 'Saturday'));
    const c = await makeCard('Where would you like to go on Saturday?', env(e));
    expect(labels(c)).toEqual(['lake', 'church', 'somewhere else']);
    expect(c.route.to).toBe('device');
    expect(e.cloudCalls).toHaveLength(0);
    expect(c.notes.join(' ')).toMatch(/completed from places from About me/);
  });

  it('who (contact): the household is left out and the list is completed from the people who do not live here', async () => {
    const c = await makeCard('Who do you want me to phone tonight?', env(new Fake(choice(['Carol', 'someone'], 'phone'))));
    expect(labels(c)).toEqual(['Jenny', 'Tyler', 'someone else']);
    expect(sourceFill([], 'Who shall we invite on Sunday?', SAMPLE_PROFILE, 3)).toEqual({ answers: ['Jenny', 'Tyler'], source: 'people from About me' });
  });

  it('who (not a contact question) is not filled with the family', async () => {
    expect(sourceFill([], 'Who do you fancy to win the darts?', SAMPLE_PROFILE, 2)).toBeNull();
    expect(sourceFill([], 'Who was your best mate on the buses?', SAMPLE_PROFILE, 2)).toBeNull();
    const c = await makeCard('Who was your best mate on the buses?', env(new Fake(choice(['Jenny', 'Tyler'], 'buses')), SAMPLE_PROFILE, { allowCloud: false }));
    expect(c.blocked).toBeTruthy();
    expect(c.choices).toEqual([]);
    expect(c.say).toBe('Just ask normally: Who was your best mate on the buses?');
  });

  it('watch, listen, eat: the list of the same kind', () => {
    expect(sourceFill(['the news'], 'What do you want to watch tonight?', SAMPLE_PROFILE, 2)).toEqual({ answers: ['the news', 'Wheel of Fortune'], source: 'TV from About me' });
    // one entry used to be no card; since the simulation of 16.11 the radio stands next to it, and no second artist is made up
    expect(sourceFill([], 'What shall I put on to listen to?', SAMPLE_PROFILE, 2)).toEqual({ answers: ['Johnny Cash', 'radio'], source: 'music from About me and the radio' });
    expect(sourceFill([], 'What shall I put on to listen to?', { ...SAMPLE_PROFILE, music: [] }, 2)).toBeNull(); // no music in About me: no card from code
    expect(sourceFill([], 'What shall I put on to listen to?', { ...SAMPLE_PROFILE, music: ['Johnny Cash', 'the radio'] }, 2)).toEqual({ answers: ['Johnny Cash', 'radio'], source: 'music from About me' });
    expect(sourceFill(['soup'], 'What do you fancy to eat?', SAMPLE_PROFILE, 3)).toEqual({ answers: ['soup', 'pot roast', 'chili'], source: 'foods from About me' });
  });

  it('a small fixed set for "why upset" and "need something"', async () => {
    const upset = await makeCard('Why are you upset?', env(new Fake(choice([], 'upset'))));
    expect(labels(upset)).toEqual(['pain', 'family', 'something else']);
    const need = await makeCard('What do you need, love?', env(new Fake(choice(['tablets'], 'need'))));
    expect(labels(need)).toEqual(['tablets', 'toilet', 'something else']);
    // "You need something?" is a subject-less offer: §2.4 (yes / no, then confirm) wins over the §2.6 generic set
    const offer = await makeCard('You need something, love?', env(new Fake(choice(['tablets'], 'need'))));
    expect(labels(offer)).toEqual(['yes', 'no', 'not sure']);
  });

  it('never invented specifics: bare colours for "which jumper" are rejected; the partner holds two up', async () => {
    expect(madeUpVariants(['blue', 'red', 'grey'], 'Which jumper do you want to wear today?', PROFILE)).toBe(true);
    expect(madeUpVariants(['blue', 'warm'], 'Which jumper, the blue or the warm one?', PROFILE)).toBe(false);
    const e = new Fake(choice(['blue', 'red', 'grey'], 'jumper'), choice(['blue', 'green'], 'jumper'));
    const c = await makeCard('Which jumper do you want to wear today?', env(e, PROFILE));
    expect(labels(c)).toEqual(['this one', 'that one', 'something else']);
  });

  it('no list of the right kind: nothing is filled, the card goes to the cloud or is blocked', async () => {
    const e = new Fake(choice(['happy'], 'bus'));
    const c = await makeCard('What should we do about the bus pass?', env(e, SAMPLE_PROFILE, { allowCloud: false }));
    expect(c.blocked).toBeTruthy();
    expect(c.choices).toEqual([]);
  });
});

describe('§2.7: the partner is excluded from contact questions even when not marked as living here (mutant M2)', () => {
  const p: Profile = { ...SAMPLE_PROFILE, people: SAMPLE_PROFILE.people.map((x) => ({ ...x, household: false })) };
  it('householdFilter', () => {
    expect(householdFilter(['Carol', 'Jenny'], 'Who should we call tonight?', p)).toEqual(['Jenny']);
  });
  it('on a card', async () => {
    const c = await makeCard('Who should we call tonight?', env(new Fake(choice(['Carol', 'Jenny', 'Tyler'], 'call')), p));
    expect(labels(c)).toEqual(['Jenny', 'Tyler', 'someone else']);
  });
});

describe('§2.9: numbers as figures', () => {
  it.each([
    ['half past ten', '10:30'], ['quarter past 3', '3:15'], ['quarter to seven', '6:45'], ['ten o\'clock', '10:00'],
    ['three pm', '3 pm'], ['10 am', '10 am'], ['eightieth', '80th'], ['eighty-first', '81st'], ['twenty second', '22nd'], ['fiftieth birthday', '50th birthday'],
    ['after lunch', 'after lunch'], ['eleven', 'eleven'],
  ])('%s -> %s', (a, b) => expect(figures(a)).toBe(b));
  it('a bare number word on a "when" card', () => {
    expect(figures('eleven', true)).toBe('11');
    expect(figures('seven tonight', true)).toBe('7 tonight');
    expect(figures('eleven', false)).toBe('eleven');
  });
  it('on a card', async () => {
    // (since set E, 16 Nov, an open "when" is a fixed line made in code; times the partner names are still written as figures)
    const c = await makeCard('When do you want your bath, at half past ten or after lunch?', env(new Fake(choice(['half past ten', 'after lunch'], 'bath'))));
    expect(labels(c)).toEqual(['at 10:30', 'after lunch', 'something else']);
    expect(c.say).toBe('When do you want your bath, at half past ten or after lunch? At 10:30, after lunch, or something else?');
  });
});

describe('§2.10: the line depends on the kind of memory question', () => {
  const NOW = new Date(2026, 10, 12, 9, 5);
  it.each([
    ['What year did you and Dad get married?', /^If you know it, say it: "It was …"\./],
    ['When did we move to Oak Street?', /^If you know it, say it: "It was …"\./],
    ["When's your next appointment, do you remember?", /^If you know it, say it: "It's on …"\.$/],
    ['How old is Jenny now?', /^If you know it, say it: "She's …"\.$/],
    ['How old is Tyler?', /^If you know it, say it: "He's …"\.$/],
    ['How old is your grandson now?', /^If you know it, say it: "He's …"\.$/],
    ['How old is Brianna turning?', /^If you know it, say it: "Brianna is …"\.$/],
    ['How old are you now?', /^If you know it, say it: "You're …"\.$/],
    ['What was the name of the bloke who built the woodshed?', /^If you know it, say it: "It was …"\. If you don't: "I can't think of it either\."$/],
    ["What's her name, the new nurse?", /^If you know it, say it: "It's …"\. If you don't: "I can't think of it either\."$/],
    ['How many grandchildren have we got?', /^If you know it, say it: "We've got …"\.$/],
    ['Remember when Dad took us up to the cottage?', /^I was thinking about when Dad took us up to the cottage\.$/],
    ['What day is it?', /^It's Thursday today, 12 November\.$/],
    ["What's my name, love?", /^It's me, Carol\.$/],
  ])('%s', (q, want) => {
    expect(quizRephrase(q, 'Carol', NOW, SAMPLE_PROFILE)).toMatch(want);
  });

  it('on the card: no rule number, no choices, no model call', async () => {
    const e = new Fake(choice(['four', 'five'], 'age'));
    const c = await makeCard('How old is Jenny now?', env(e));
    expect(c.kind).toBe('no-quiz');
    expect(c.choices).toEqual([]);
    expect(c.blocked).toBe('This one asks them to remember, so there is no card. Try saying it instead.');
    expect(c.say).toBe("Tell, don't test: If you know it, say it: \"She's …\".");
    expect(e.deviceCalls).toHaveLength(0);
  });
});

describe('§2.11: medicine questions are not body maps; §2.13: blocked cards carry no choices', () => {
  it('"Do the tablets help with the pain?" is yes / no', async () => {
    const c = await makeCard('Do the tablets help with the pain?', env(new Fake(choice(['a lot', 'a bit'], 'tablets'))));
    expect(c.kind).toBe('yesno');
    expect(labels(c)).toEqual(['yes', 'no', 'not sure']);
  });
  it('a card blocked for a missing model has no choices, not even an escape', async () => {
    const e = new Fake(null);
    e.cloudConfigured = false;
    const c = await makeCard('What would you like to do this afternoon?', env(e, PROFILE, { deviceReady: false }));
    expect(c.blocked).toBeTruthy();
    expect(c.choices).toEqual([]);
  });
});
