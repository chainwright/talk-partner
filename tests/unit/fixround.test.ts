// Fix round after held-out run 1: privacy (every About-me term stripped), choice count by support level,
// "X, or Y?" pairs and label cutting, fit / made-up / negative choices. All examples are new: none come from
// the tuning set or either held-out set.
import { describe, expect, it } from 'vitest';
import type { DeviceStatus, Engine, ModelResult } from '../../core/engine';
import { cloudTextRequest, pictureRequestBody } from '../../core/requests';
import { makeCard } from '../../core/pipeline';
import { pictureFor } from '../../core/pictures';
import { commaOrPair, fitFilter, hasNegative, isOrNot, madeUpVariants, orPair, snapToProfile } from '../../core/rules';
import { findLeaks, stripQuestion } from '../../core/strip';
import type { ModelOutput, Profile, SupportLevel } from '../../core/types';
import { PROFILE } from './fixtures';

// A second household with multi-word entries, possessives and proper nouns.
const RICH: Profile = {
  personName: 'Dennis',
  partnerName: 'Joan',
  people: [
    { id: 'r1', name: 'Joan', relation: 'wife', household: true },
    { id: 'r2', name: 'Martin', relation: 'son', household: false },
    { id: 'r3', name: 'Aisha', relation: 'daughter-in-law', household: false },
    { id: 'r4', name: 'Ruby', relation: 'granddaughter', household: false },
    { id: 'r5', name: 'Bev', relation: 'carer', household: false },
    { id: 'r6', name: 'Tomasz', relation: 'physio', household: false },
  ],
  foods: ["shepherd's pie", 'kippers on toast', 'Eccles cakes', 'tea with lemon'],
  places: ['the beach at Scarborough', 'the allotment on Fern Road', 'the Royal Oak'],
  tv: ['Coronation Street', 'the darts', 'Antiques Roadshow'],
  music: ['Elgar', 'Northern soul'],
  other: ['a whippet called Pip', 'Hull City'],
};

class Fake implements Engine {
  label = 'fake';
  modes = { device: 'ONLY_ON_DEVICE', cloud: 'PREFER_IN_CLOUD', pictures: 'ONLY_IN_CLOUD' };
  cloudCalls: string[] = [];
  cloudConfigured = true;
  constructor(private dev: ModelOutput | null, private cloud: ModelOutput = { topic: 'x', kind: 'choice', choices: ['one thing', 'another thing'] }) {}
  async deviceStatus(): Promise<DeviceStatus> { return 'available'; }
  async prepareDevice() {}
  async runDevice(): Promise<ModelResult> { return { text: JSON.stringify(this.dev), source: 'on-device', ms: 5 }; }
  cloudRequest(q: string) { return cloudTextRequest(q); }
  async runCloud(q: string): Promise<ModelResult> { this.cloudCalls.push(q); return { text: JSON.stringify(this.cloud), source: 'in-cloud', ms: 7 }; }
  pictureRequest(w: string) { return pictureRequestBody(w); }
  async picture() { return null; }
}
const env = (engine: Engine, profile: Profile, extra: Record<string, unknown> = {}) => ({
  profile, support: 'more' as SupportLevel, engine, allowCloud: true, deviceReady: true, ...extra,
});
const labels = (c: { choices: { label: string }[] }) => c.choices.map((x) => x.label);
const answers = (c: { choices: { label: string; role: string }[] }) => c.choices.filter((x) => x.role === 'answer').map((x) => x.label);

/** Every string the About me page holds: names, relations, whole entries and each entry's distinctive words. */
function profileStrings(p: Profile): string[] {
  const entries = [...p.foods, ...p.places, ...p.tv, ...p.music, ...p.other];
  const distinctive = entries.flatMap((e) => e.match(/[A-Za-z']+/g) ?? [])
    .map((w) => w.replace(/'s$/, ''))
    .filter((w) => !/^(the|a|an|on|at|with|of|by|and|called|tea|old|new)$/i.test(w));
  return [p.partnerName, ...p.people.map((x) => x.name), ...p.people.map((x) => x.relation), ...entries, ...distinctive].filter(Boolean);
}
const containsWord = (hay: string, needle: string) => new RegExp(`(^|[^A-Za-z'])${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^A-Za-z]|$)`, 'i').test(hay);

describe('P0 privacy: no About-me term in any cloud payload', () => {
  // each question names one or more About-me items, in full or in part, the way a partner would type them
  const QUESTIONS = [
    'What do you remember about the beach at Scarborough?',
    'What did you like best at Scarborough when the kids were small?',
    'What shall we take to the allotment on Fern Road?',
    'What should we plant at the allotment this year?',
    "What would you like with your shepherd's pie?",
    'What goes best with kippers on toast?',
    'What should we tell Bev about the Eccles cakes?', // (was "What did Bev say…": a recall question since 16 Nov, never sent)
    'What should I tell Martin and Aisha about Sunday?',
    'What present would Ruby like from us?',
    'What should I ask your granddaughter to bring?',
    'What will the physio show you today?', // (was "What did the physio show…": a recall question since 16 Nov)
    'What happened on Coronation Street last night?',
    'What did you think of the darts final?',
    'What was on Antiques Roadshow?',
    'What Elgar piece shall I find for you?',
    'What do you miss about Northern soul nights?',
    'What shall we do with Pip while we are out?',
    'What was the Hull City score?',
    // (two questions of this list changed on 16 Nov 2026, with the rules that came out of the simulation: "What time
    // is Tomasz coming …?" is now a memory question and "… bring back from the Royal Oak?" turns on a hidden About-me
    // word; neither is sent at all, see the test after this loop. These two take their place.)
    'What time should Tomasz come, on 07700 900456?',
    'What should Joan bring back for the Royal Oak quiz night?',
  ];

  it('a question that is not sent leaks nothing: the time of a fixed visit, and a question that turns on a hidden About-me word', async () => {
    for (const q of ['What time is Tomasz coming on 07700 900456?', 'What should Joan bring back from the Royal Oak?']) {
      const e = new Fake(null);
      const c = await makeCard(q, env(e, RICH, { deviceReady: false }));
      expect(e.cloudCalls, q).toHaveLength(0);
      expect(c.cloudPayload ?? null, q).toBeNull();
      expect(c.cloudAttempted ?? null, q).toBeNull();
      expect(c.blocked, q).toBeTruthy();
    }
  });

  for (const q of QUESTIONS) {
    it(q, async () => {
      // device not ready + cloud allowed: the open question goes straight to the cloud
      const e = new Fake(null);
      const c = await makeCard(q, env(e, RICH, { deviceReady: false }));
      expect(e.cloudCalls).toHaveLength(1);
      const sent = e.cloudCalls[0];
      const payload = c.cloudPayload!;
      expect(payload).toBeTruthy();
      // the panel shows exactly the request built from the stripped text
      expect(payload).toBe(JSON.stringify(cloudTextRequest(sent), null, 2));
      expect(findLeaks(sent, RICH)).toEqual([]);
      const userText = JSON.parse(payload).contents[0].parts[0].text as string;
      for (const s of profileStrings(RICH)) {
        expect(containsWord(sent, s), `"${s}" in the sent text: ${sent}`).toBe(false);
        expect(containsWord(userText, s), `"${s}" in the payload: ${userText}`).toBe(false);
      }
      // whole entries and names never appear anywhere in the request, system prompt included
      for (const s of [...RICH.people.map((x) => x.name), ...RICH.foods, ...RICH.places, ...RICH.tv, ...RICH.music, ...RICH.other]) {
        expect(payload.toLowerCase()).not.toContain(s.toLowerCase());
      }
    });
  }

  it('places, foods, shows, music and other items get their own neutral placeholders, restored on the device', () => {
    const s = stripQuestion('Kippers on toast before the darts, then the beach at Scarborough with Pip?', RICH);
    expect(s.text).toBe('Food A before the Show A, then the Place A with Thing A?');
    expect(s.map).toEqual({ 'Food A': 'Kippers on toast', 'Show A': 'darts', 'Place A': 'beach at Scarborough', 'Thing A': 'Pip' });
  });

  it('a relation word that points at one person becomes that person', () => {
    const s = stripQuestion('Shall we ask your granddaughter and the carer?', RICH);
    expect(s.text).toBe('Shall we ask Person A and Person B?');
    expect(s.map).toEqual({ 'Person A': 'Ruby', 'Person B': 'Bev' });
  });

  it('the panel lists the swaps, which only the partner sees', async () => {
    const e = new Fake({ topic: 'x', kind: 'choice', choices: ['happy', 'fine', 'sad'] }, { topic: 'memories', kind: 'choice', choices: ['the sea', 'Place A'] });
    const c = await makeCard('What do you remember about Scarborough?', env(e, RICH));
    expect(c.cloudSwaps).toEqual(['Place A ← Scarborough']);
    expect(labels(c)).toEqual(['the sea', 'Scarborough', 'something else']); // restored on the device
  });

  it('pictures: an About-me item asks only for its category; a name asks for nothing', () => {
    expect(pictureFor("shepherd's pie", RICH)).toEqual({ type: 'cloud', word: 'food' });
    expect(pictureFor('Royal Oak', RICH)).toEqual({ type: 'cloud', word: 'a place' });
    expect(pictureFor('Coronation Street', RICH)).toEqual({ type: 'cloud', word: 'a TV show' });
    // Changed 11 Nov 2026 (build spec §2.20): a word with no picture is a word-only tile, never the escape icon or an empty frame.
    expect(pictureFor('Pip', RICH)).toEqual({ type: 'word' });
    expect(pictureFor('umbrella', RICH)).toEqual({ type: 'cloud', word: 'umbrella' });
  });

  it('findLeaks catches a raw question (the last gate before sending)', () => {
    const hits = findLeaks('Fancy the Royal Oak with Martin?', RICH);
    expect(hits).toEqual(expect.arrayContaining(['Martin', 'the Royal Oak', 'oak']));
    expect(findLeaks('Fancy the Place A with Person A?', RICH)).toEqual([]);
  });
});

describe('KB §7 rule 5: choice count by support level', () => {
  const three: ModelOutput = { topic: 'outing', kind: 'choice', choices: ['swimming', 'bowling', 'cinema'] };
  const q = 'What shall we do on Saturday?';
  it.each([
    ['mild', ['swimming', 'bowling', 'cinema', 'something else']],
    ['more', ['swimming', 'bowling', 'something else']],
    ['most', ['swimming', 'bowling', 'something else']],
  ] as const)('%s', async (support, want) => {
    const c = await makeCard(q, env(new Fake(three), PROFILE, { support }));
    expect(labels(c)).toEqual(want);
  });

  it('never more than one escape, and never more answers than the level allows, for every card kind', async () => {
    const qs = ['Are you comfy?', 'How was the concert?', 'How much does your hip hurt?', 'Where is the pain?', 'Rice or pasta?', q];
    for (const support of ['mild', 'more', 'most'] as const) {
      for (const x of qs) {
        const c = await makeCard(x, env(new Fake(three), PROFILE, { support }));
        expect(c.choices.filter((ch) => ch.role === 'escape')).toHaveLength(1);
        expect(answers(c).length).toBeLessThanOrEqual(support === 'mild' ? 3 : 2);
      }
    }
  });
});

describe('rule 3: "X, or Y?" is an either-or question', () => {
  it.each([
    ['Fancy the quiz on Friday, or is it too much?', ['the quiz', 'too much']],
    ['Shall we keep the old radio, or would you rather give it away?', ['keep the old radio', 'give it away']],
    ['Is the bath alright, or is it too hot?', ['alright', 'too hot']],
    ['Watch the film now, or after your nap?', ['watch the film', 'after your nap']],
    ['A bit chilly, or just tired?', ['chilly', 'tired']],
  ])('%s', (q, pair) => {
    expect(orPair(q)).toEqual(pair);
  });

  it('the card offers the two options, not yes/no, whatever the model says', async () => {
    const c = await makeCard('Do you want to ring the bank, or leave it till Monday?', env(new Fake({ topic: 'bank', kind: 'yesno', choices: ['yes', 'no'], options: ['ring the bank', 'leave it'] }), PROFILE));
    expect(c.kind).toBe('choice');
    expect(labels(c)).toEqual(['ring the bank', 'leave it', 'something else']);
  });

  it('"..., or not (yet)?" stays yes/no; a comma list is left to the model', async () => {
    expect(isOrNot('Finished with the paper, or not yet?')).toBe(true);
    const c = await makeCard('Finished with the paper, or not yet?', env(new Fake({ topic: 'paper', kind: 'choice', choices: ['done', 'reading'] }), PROFILE));
    expect(labels(c)).toEqual(['yes', 'no', 'not sure']);
    expect(commaOrPair('Do you want tea, coffee, or juice?')).toBeNull();
  });
});

describe('rule 3: an or-pair label keeps the noun phrase', () => {
  it.each([
    ['Swim at the pool by the station or the gym?', ['pool by the station', 'gym']],
    ['The cricket on or the radio?', ['cricket', 'radio']],
    ['The news on or Countdown?', ['news', 'Countdown']],
    ['Bench by the pond or the café?', ['Bench by the pond', 'café']],
    ['Shall we sit on the bench or the wall?', ['bench', 'wall']],
    ['Is the heating on or off?', ['on', 'off']],
  ])('%s', (q, pair) => {
    expect(orPair(q)).toEqual(pair);
  });
});

describe('fit, made-up options and negatives', () => {
  it('negative wording never reaches a choice', async () => {
    expect(hasNegative("don't mind")).toBe(true);
    expect(hasNegative('nothing')).toBe(true);
    expect(hasNegative('pasta')).toBe(false);
    const e = new Fake({ topic: 'cook', kind: 'choice', choices: ["don't mind", 'pasta', 'not hungry'] }, { topic: 'cook', kind: 'choice', choices: ['pasta', 'stew'] });
    const c = await makeCard('What shall we cook tonight?', env(e, PROFILE));
    expect(labels(c).some(hasNegative)).toBe(false);
    // Changed 11 Nov 2026 (build spec §2.6 source b): one good answer is completed from the About-me foods on the
    // device, so nothing goes to the cloud. Before, the card was routed to the cloud for the missing answer.
    expect(labels(c)).toEqual(['pasta', 'lamb', 'something else']);
    expect(c.route.to).toBe('device');
    expect(e.cloudCalls).toHaveLength(0);
    expect(c.notes.join(' ')).toMatch(/completed from foods from About me/);
  });

  it('a "who" question about the past does not offer family or carer', () => {
    expect(fitFilter(['Grace', 'Leo', 'a neighbour'], 'Who was your best friend at school?', PROFILE)).toEqual({ kept: ['a neighbour'], dropped: ['Grace', 'Leo'] });
  });

  it('a who question gets people, where gets places, when gets times, "what to say" gets things to say', () => {
    expect(fitFilter(['Grace', 'cricket', 'happy'], 'Who should come for tea?', PROFILE).kept).toEqual(['Grace']);
    expect(fitFilter(['park', 'Grace', 'happy'], 'Where shall we go for a walk?', PROFILE).kept).toEqual(['park']);
    expect(fitFilter(['bath', 'morning', 'after lunch'], 'When do you want your bath?', PROFILE).kept).toEqual(['morning', 'after lunch']);
    expect(fitFilter(['happy', 'well done', 'see you soon'], 'What should I say to Peter at the party?', PROFILE).kept).toEqual(['well done', 'see you soon']);
  });

  it('a device card with an unfit choice goes to the cloud', async () => {
    const e = new Fake({ topic: 'party', kind: 'choice', choices: ['happy', 'well done', 'see you soon'] }, { topic: 'message', kind: 'choice', choices: ['well done', 'see you soon'] });
    const c = await makeCard('What should I say to Peter at the party?', env(e, PROFILE));
    expect(e.cloudCalls).toEqual(['What should I say to Person A at the party?']);
    expect(c.route.reasons).toContain("a choice didn't fit the question");
    expect(labels(c)).toEqual(['well done', 'see you soon', 'something else']);
  });

  it('made-up details (colours of their own coats) are rejected; the card asks the partner to hold two up', async () => {
    const made: ModelOutput = { topic: 'coat', kind: 'choice', choices: ['brown coat', 'green coat', 'black coat'] };
    expect(madeUpVariants(made.choices, 'Which coat are you wearing out?', PROFILE)).toBe(true);
    expect(madeUpVariants(['brown coat', 'green coat'], 'Which coat, the brown or the green?', PROFILE)).toBe(false);
    const c = await makeCard('Which coat are you wearing out?', env(new Fake(made, made), PROFILE));
    expect(labels(c)).toEqual(['this one', 'that one', 'something else']);
    expect(c.notes.join(' ')).toMatch(/hold up two/);
  });

  it('a placeholder the cloud made up is dropped', async () => {
    const e = new Fake({ topic: 'x', kind: 'choice', choices: ['happy', 'fine', 'sad'] }, { topic: 'x', kind: 'choice', choices: ['Place A', 'Place C', 'the shops'] });
    const c = await makeCard('What shall we do after the Royal Oak?', env(e, RICH));
    expect(labels(c)).toEqual(['Royal Oak', 'the shops', 'something else']);
  });

  it('a choice made of an About-me item\'s words takes that item\'s wording', () => {
    expect(snapToProfile('kippers toast', RICH)).toBe('kippers on toast');
    expect(snapToProfile('beach Scarborough', RICH)).toBe('beach at Scarborough');
    expect(snapToProfile('kippers', RICH)).toBe('kippers');
  });
});
