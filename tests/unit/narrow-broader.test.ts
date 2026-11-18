// After "something else" the next card is BROADER and DIFFERENT, never more of the kind already refused
// (core/kinds.ts, core/narrow.ts). The fixtures are twelve questions over drinks, food, places, people, activities,
// feelings and comfort, each with what a model answered: the two drink rows are the recorded answers of the real cloud
// model (devlog/evidence_topics/narrow_cloud-card_localhost.txt: water / juice / milk, then hot chocolate / malt
// drink / herbal tea); the others are written in the same manner (one more single thing of the same subject).
// Pinned for every row: none of the refused subject's single things is on the card; the card has two or three real
// choices and one way out; nothing that was offered comes back; a card the rules made says so.
import { describe, expect, it } from 'vitest';
import type { DeviceStatus, Engine, ModelResult } from '../../core/engine';
import { broader, placeOf, sameKind, subjectOf } from '../../core/kinds';
import { NARROW_TASK, narrowAsk, narrowCard, narrowChoices, narrowInput, type NarrowInput } from '../../core/narrow';
import { cloudTextRequest } from '../../core/requests';
import { madeWhere } from '../../core/simple';
import { EMPTY_PROFILE, type Card } from '../../core/types';

export interface NarrowFixture { domain: string; asked: string; rejected: string[]; model: string[]; expect: string[]; by: 'rules' | 'ai' }

/** `model` is what the model answered; `expect` is what the card must show; `by` is who made the card that stands. */
export const FIXTURES: NarrowFixture[] = [
  // the recorded run, step 1 and step 2
  { domain: 'drinks', asked: 'Would you like tea or coffee?', rejected: ['tea', 'coffee'], model: ['water', 'juice', 'milk'], expect: ['something cold', 'something sweet'], by: 'rules' },
  { domain: 'drinks', asked: 'Would you like tea or coffee?', rejected: ['tea', 'coffee', 'something cold', 'something sweet'], model: ['hot chocolate', 'malt drink', 'herbal tea'], expect: ['something to eat', 'a rest', 'help with something'], by: 'rules' },
  { domain: 'drinks', asked: 'Would you like water, juice or milk?', rejected: ['water', 'juice', 'milk'], model: ['squash', 'lemonade', 'a hot drink'], expect: ['something hot', 'something sweet'], by: 'rules' },
  { domain: 'food', asked: 'Would you like soup or a sandwich?', rejected: ['soup', 'sandwich'], model: ['toast', 'pasta', 'eggs'], expect: ['something sweet', 'something to drink', 'a rest'], by: 'rules' },
  { domain: 'food', asked: 'Are you hungry?', rejected: ['yes', 'no'], model: ['soup', 'toast', 'fruit'], expect: ['something to drink', 'a rest', 'help with something'], by: 'rules' },
  { domain: 'places', asked: 'Would you like to sit in the garden or go to the park?', rejected: ['garden', 'park'], model: ['the lake', 'the beach', 'the woods'], expect: ['somewhere indoors', 'stay at home'], by: 'rules' },
  { domain: 'places', asked: 'Where would you like to go? The shops or the cafe?', rejected: ['shops', 'cafe'], model: ['library', 'church', 'somewhere outside'], expect: ['somewhere outside', 'stay at home'], by: 'rules' },
  { domain: 'people', asked: 'Would you like to call your son or your daughter?', rejected: ['son', 'daughter'], model: ['sister', 'brother', 'grandson'], expect: ['a friend', 'someone who helps'], by: 'rules' },
  { domain: 'people', asked: 'Do you want to see the nurse or the doctor?', rejected: ['nurse', 'doctor'], model: ['the physio', 'the carer'], expect: ['family', 'a friend'], by: 'rules' },
  { domain: 'activities', asked: 'Would you like TV or music?', rejected: ['TV', 'music'], model: ['radio', 'a film', 'the news'], expect: ['something with the hands', 'go out', 'see someone'], by: 'rules' },
  { domain: 'feelings', asked: 'How are you feeling today?', rejected: ['good', 'okay', 'bad', 'sad', 'in pain', 'tired', 'worried'], model: ['bored', 'lonely', 'scared'], expect: ['something about people', 'some company', 'some quiet'], by: 'rules' },
  { domain: 'comfort', asked: 'Would you like to rest in the bed or the chair?', rejected: ['bed', 'chair'], model: ['the sofa', 'a pillow'], expect: ['warmer or cooler', 'quiet or dark'], by: 'rules' },
  // a model that does keep to "broader": its choices stand, and the card is the AI's
  { domain: 'drinks', asked: 'Would you like tea or coffee?', rejected: ['tea', 'coffee'], model: ['a cold drink', 'something to eat', 'a rest'], expect: ['a cold drink', 'something to eat', 'a rest'], by: 'ai' },
  { domain: 'places', asked: 'Would you like to sit in the garden or go to the park?', rejected: ['garden', 'park'], model: ['stay at home', 'see someone'], expect: ['stay at home', 'see someone'], by: 'ai' },
  // one usable choice and two of the same kind: one choice is no card, so the rules make it
  { domain: 'food', asked: 'Would you like cake or fruit?', rejected: ['cake', 'fruit'], model: ['biscuits', 'ice cream', 'a drink'], expect: ['something savoury', 'a hot meal'], by: 'rules' },
];

class Cloud implements Engine {
  label = 'fixture';
  modes = { device: 'ONLY_ON_DEVICE', cloud: 'PREFER_IN_CLOUD' };
  cloudConfigured = true;
  sent: string[] = [];
  constructor(private choices: string[]) {}
  async deviceStatus(): Promise<DeviceStatus> { return 'unavailable'; }
  async prepareDevice() {}
  async runDevice(): Promise<ModelResult> { throw new Error('no model'); }
  cloudRequest(q: string) { return cloudTextRequest(q); }
  async runCloud(q: string): Promise<ModelResult> { this.sent.push(q); return { text: JSON.stringify({ topic: 'something else', kind: 'choice', choices: this.choices }), source: 'in-cloud', ms: 3 }; }
}
const env = (engine: Engine) => ({ profile: EMPTY_PROFILE, support: 'more' as const, engine, allowCloud: true, deviceReady: false });
const answers = (c: Card) => c.choices.filter((x) => x.role === 'answer').map((x) => x.label);
const input = (f: NarrowFixture): NarrowInput => ({ asked: f.asked, rejected: f.rejected, level: f.rejected.some((r) => /^some|^a /.test(r)) ? 2 : 1, sofar: [] });

describe('the narrowing fixtures: broader and different, never more of the same', () => {
  it('there are at least ten questions, over drinks, food, places, people, activities and feelings', () => {
    expect(new Set(FIXTURES.map((f) => f.asked)).size).toBeGreaterThanOrEqual(10);
    for (const d of ['drinks', 'food', 'places', 'people', 'activities', 'feelings']) expect(FIXTURES.some((f) => f.domain === d), d).toBe(true);
  });
  for (const f of FIXTURES) {
    it(`${f.domain}: "${f.asked}" minus ${f.rejected.join(' / ')}; model said ${f.model.join(' / ')} -> ${f.expect.join(' / ')} (${f.by})`, async () => {
      const e = new Cloud(f.model);
      const c = await narrowCard(input(f), env(e));
      expect(c.blocked).toBeFalsy();
      expect(answers(c)).toEqual(f.expect);
      expect(c.choices.filter((x) => x.role === 'escape').map((x) => x.label)).toEqual(['something else']);
      // nothing on the card is one more single thing of the refused subject, or the name of a refused kind
      const subject = subjectOf(f.asked, f.rejected);
      for (const a of answers(c)) {
        expect(sameKind(a, subject, f.rejected), a).toBe(false);
        expect(f.rejected.map((r) => r.toLowerCase())).not.toContain(a.toLowerCase());
        expect(a.split(/\s+/).length).toBeLessThanOrEqual(4);
      }
      // who made it is said truthfully: the rules (an AI was asked first), or the AI
      expect(c.narrow?.by ?? 'ai').toBe(f.by);
      expect(c.source).toBe(f.by === 'rules' ? 'code' : 'in-cloud');
      const made = madeWhere(c, { about: 'About them' });
      expect(made.maker).toBe(f.by === 'rules' ? 'codeAsked' : 'cloud');
      expect(made.left).toBe('sent');
      if (f.by === 'rules') {
        expect(c.notes.join(' ')).toContain("the app's rules made these broader ones");
        expect(c.why?.dropped.length).toBeGreaterThan(0);
        expect(c.why?.added.map((a) => a.label)).toEqual(f.expect);
      }
      // the request said in words that more of the same is not wanted
      expect(e.sent[0]).toContain('Do not give more of the same kind');
    });
  }
  it('the next step after a rules-made card goes further out, and never back', async () => {
    const one = await narrowCard(input(FIXTURES[0]), env(new Cloud(FIXTURES[0].model)));
    const two = narrowInput(one, []);
    expect(two.rejected).toEqual(['tea', 'coffee', 'something cold', 'something sweet']);
    const c2 = await narrowCard(two, env(new Cloud(['hot chocolate', 'malt drink', 'herbal tea'])));
    expect(answers(c2)).toEqual(['something to eat', 'a rest', 'help with something']);
    expect(c2.narrow).toMatchObject({ level: 2, by: 'rules' });
  });
});

describe('the kinds the rules know (core/kinds.ts)', () => {
  it('a single thing sits under its kind, a kind under its subject, and an unknown word nowhere', () => {
    expect(placeOf('Tea')).toEqual({ subject: 'drink', kind: 'something hot', as: 'item' });
    expect(placeOf('a cold drink')).toEqual({ subject: 'drink', kind: 'something cold', as: 'kind' });
    expect(placeOf('biscuits')).toMatchObject({ subject: 'food', as: 'item' });
    expect(placeOf('Marguerite')).toBeNull();
  });
  it('the subject comes from what was refused, and from the question when the refused words say nothing', () => {
    expect(subjectOf('Would you like tea or coffee?', ['tea', 'coffee'])).toBe('drink');
    expect(subjectOf('Are you hungry?', ['yes', 'no'])).toBe('food');
    expect(subjectOf('Would you like soup or a sandwich?', ['soup', 'sandwich'])).toBe('food');
    expect(subjectOf('Blue or green?', ['blue', 'green'])).toBeNull();
  });
  it('same kind: one more thing of the subject, or the name of a refused kind; an unknown word is never called that', () => {
    const r = ['tea', 'coffee'];
    for (const w of ['water', 'juice', 'milk', 'hot chocolate', 'herbal tea', 'a hot drink', 'something warm']) expect(sameKind(w, 'drink', r), w).toBe(true);
    for (const w of ['a cold drink', 'something sweet', 'something to eat', 'a rest', 'Marguerite', 'the garden']) expect(sameKind(w, 'drink', r), w).toBe(false);
    expect(sameKind('water', null, r)).toBe(false);
  });
  it('the guard drops same-kind choices with their rule', () => {
    const r = narrowChoices(['water', 'juice', 'something to eat', 'a rest'], { asked: 'Would you like tea or coffee?', rejected: ['tea', 'coffee'] }, { profile: EMPTY_PROFILE });
    expect(r.kept).toEqual(['something to eat', 'a rest']);
    expect(r.dropped).toEqual([{ label: 'water', rule: 'more of the kind that did not fit: a narrowing card must be broader' }, { label: 'juice', rule: 'more of the kind that did not fit: a narrowing card must be broader' }]);
  });
  it('a question the rules know nothing about still gets wide subjects, and an unknown model answer stands', async () => {
    expect(broader('Blue or green?', ['blue', 'green'])).toEqual(['food or drink', 'my body', 'something to do']);
    const c = await narrowCard({ asked: 'Blue or green?', rejected: ['blue', 'green'], level: 1, sofar: [] }, env(new Cloud(['red', 'yellow'])));
    expect(answers(c)).toEqual(['red', 'yellow']);
  });
  it('every label the rules can offer is short, positive, and never the way out', () => {
    const seen = new Set<string>();
    for (const f of FIXTURES) for (const b of broader(f.asked, f.rejected)) seen.add(b);
    for (const b of seen) {
      expect(b.split(/\s+/).length, b).toBeLessThanOrEqual(4);
      expect(b).not.toMatch(/\bnot\b|n't|something else|other/i);
    }
  });
  it('the fixed wording asks for kinds, not single things, and holds nothing from the conversation', () => {
    expect(NARROW_TASK).toContain('broader, different kinds');
    expect(narrowAsk({ asked: 'Q?', rejected: ['a'] })).toBe(`Q? They did not want: a. ${NARROW_TASK}`);
  });
});
