// Day 5 (11 Nov 2026, late): the coaching line (only where a rule detected it), "why this card" (written from the
// values the rules worked on, never inferred), and the fixed "we're stuck" repair card.
import { describe, expect, it } from 'vitest';
import { COPY } from '../../core/copy';
import type { DeviceStatus, Engine, ModelResult } from '../../core/engine';
import { makeCard, repairCard } from '../../core/pipeline';
import { cloudTextRequest, pictureRequestBody } from '../../core/requests';
import { SAMPLE_PROFILE, SAMPLE_QUESTIONS } from '../../core/sample';
import { splitQuestion } from '../../core/rules';
import type { Card, ModelOutput } from '../../core/types';
import { PICTO_IDS } from '../../web/src/pictos';
import { PROFILE } from './fixtures';

const W = COPY.how.why;

class Fake implements Engine {
  label = 'fake';
  modes = { device: 'ONLY_ON_DEVICE', cloud: 'PREFER_IN_CLOUD', pictures: 'ONLY_IN_CLOUD' };
  cloudConfigured = true;
  cloudCalls: string[] = [];
  constructor(private dev: ModelOutput | null, private cloud: ModelOutput | null = { topic: 'x', kind: 'choice', choices: ['one thing', 'another thing'] }, private cloudSource: 'in-cloud' | 'on-device' = 'in-cloud') {}
  async deviceStatus(): Promise<DeviceStatus> { return this.dev ? 'available' : 'unavailable'; }
  async prepareDevice() {}
  async runDevice(): Promise<ModelResult> { if (!this.dev) throw new Error('no model'); return { text: JSON.stringify(this.dev), source: 'on-device', ms: 3 }; }
  cloudRequest(q: string) { return cloudTextRequest(q); }
  async runCloud(q: string): Promise<ModelResult> { this.cloudCalls.push(q); if (!this.cloud) throw new Error('cloud failed'); return { text: JSON.stringify(this.cloud), source: this.cloudSource, ms: 3 }; }
  pictureRequest(w: string) { return pictureRequestBody(w); }
  async picture() { return null; }
}
const env = (e: Fake, extra: Record<string, unknown> = {}) => ({ profile: SAMPLE_PROFILE, support: 'more' as const, engine: e, allowCloud: true, deviceReady: true, ...extra });
const choice = (choices: string[], topic = 'x', options?: string[]): ModelOutput => ({ topic, kind: 'choice', choices, options });
const labels = (c: Card) => c.choices.map((x) => x.label);
const answers = (c: Card) => c.choices.filter((x) => x.role === 'answer').map((x) => x.label);

describe('the coaching line appears only where a rule detected it', () => {
  it('two questions in one: "one thing at a time"', async () => {
    const c = await makeCard('How was therapy today, and did you eat?', env(new Fake(choice(['good', 'hard'], 'therapy'))));
    expect(c.pending).toBe('Did you eat?');
    expect(c.coach).toBe(COPY.coach.twoQuestions);
    expect(c.kind).toBe('feeling');
  });
  it('a memory question: "tell, don\'t test"', async () => {
    const c = await makeCard('What year did we get married?', env(new Fake(null), { deviceReady: false }));
    expect(c.kind).toBe('no-quiz');
    expect(c.coach).toBe(COPY.coach.test);
  });
  it('options the screen cannot know: "hold two up"', async () => {
    const e = new Fake(choice(['blue', 'red', 'grey'], 'shirt'), choice(['blue', 'green'], 'shirt'));
    const c = await makeCard('Which shirt for the doctor?', env(e, { profile: PROFILE }));
    expect(labels(c)).toEqual(['this one', 'that one', 'something else']);
    expect(c.coach).toBe(COPY.coach.holdUp);
  });
  it('an ordinary either-or, yes/no, body or open card carries no coaching line', async () => {
    for (const q of ['Do you want coffee or tea?', 'Do you need the toilet?', 'Where does it hurt?', 'What shall we have for tea tonight?']) {
      const c = await makeCard(q, env(new Fake(choice(['pot roast', 'chili'], 'tea'))));
      expect(c.coach, q).toBeUndefined();
    }
  });
  it('the judge-mode chip for it exists and splits', () => {
    const chip = SAMPLE_QUESTIONS.find((s) => s.q === 'How was therapy today, and did you eat?');
    expect(chip).toBeTruthy();
    expect(splitQuestion(chip!.q)).toEqual(['How was therapy today?', 'Did you eat?']);
  });
});

describe('"why this card" is written from the values the rules worked on', () => {
  /** Every card: kept + added labels are on the card; dropped labels are not; the proposal is the model output as parsed. */
  function consistent(c: Card, dev: ModelOutput | null) {
    const w = c.why!;
    const on = answers(c).map((x) => x.toLowerCase());
    for (const k of w.kept) expect(on, `kept "${k}" is on the card`).toContain(k.toLowerCase());
    for (const a of w.added) { expect(on, `added "${a.label}" is on the card`).toContain(a.label.toLowerCase()); expect(a.from.length).toBeGreaterThan(0); }
    for (const d of w.dropped) { expect(on, `dropped "${d.label}" is not on the card`).not.toContain(d.label.toLowerCase()); expect(d.rule.length).toBeGreaterThan(0); }
    if (w.proposed && dev && w.proposed.step === 'private') expect(w.proposed.choices).toEqual(dev.choices);
    expect(w.decided.length).toBeGreaterThan(0);
    expect(w.headline.length).toBeGreaterThan(0);
    for (const s of [w.decided, w.headline, ...w.dropped.map((d) => d.rule), ...w.added.map((a) => a.from)]) expect(s).not.toMatch(/ONLY_|PREFER_|Firebase|inferenceSource/);
  }

  it('an open card at "more": two kept, the third dropped over the limit', async () => {
    const dev = choice(['pot roast', 'chili', 'soup'], 'tea tonight');
    const c = await makeCard('What shall we have for tea tonight?', env(new Fake(dev)));
    consistent(c, dev);
    expect(c.why!.proposed).toEqual({ step: 'private', topic: 'tea tonight', kind: 'choice', choices: ['pot roast', 'chili', 'soup'], options: [] });
    expect(c.why!.kept).toEqual(['pot roast', 'chili']);
    expect(c.why!.dropped).toEqual([{ label: 'soup', rule: W.rules.overCap }]);
    expect(c.why!.decided).toBe(W.decidedBy.open);
    expect(c.why!.headline).toBe(W.headlineFrom.model);
  });
  it('a negative choice, a household member and a filled choice each carry their rule or source', async () => {
    const dev = choice(['Carol', "don't know", 'Jenny'], 'call');
    const c = await makeCard('Who should we call tonight?', env(new Fake(dev)));
    consistent(c, dev);
    expect(answers(c)).toEqual(['Jenny', 'Tyler']);
    expect(c.why!.dropped).toEqual(expect.arrayContaining([{ label: "don't know", rule: W.rules.negative }, { label: 'Carol', rule: W.rules.household }]));
    expect(c.why!.added).toEqual([{ label: 'Tyler', from: 'people from About me' }]);
    expect(c.why!.kept).toEqual(['Jenny']);
  });
  it('a generic place is dropped by name and the About-me places are added', async () => {
    const dev = choice(['stay home', 'go out'], 'Saturday');
    const c = await makeCard('Where would you like to go on Saturday?', env(new Fake(dev)));
    consistent(c, dev);
    expect(c.why!.dropped).toEqual([{ label: 'stay home', rule: W.rules.genericWhere }, { label: 'go out', rule: W.rules.genericWhere }]);
    expect(c.why!.added.map((a) => a.label)).toEqual(['lake', 'church']);
    expect(c.why!.kept).toEqual([]);
  });
  it('either-or: the model\'s copied options are kept and its loose choices dropped', async () => {
    const dev = choice(['tea', 'water'], 'drink', ['coffee', 'tea']);
    const c = await makeCard('Do you want coffee or tea?', env(new Fake(dev)));
    consistent(c, dev);
    expect(c.why!.decided).toBe(W.decidedBy.pairModel);
    expect(c.why!.kept).toEqual(['coffee', 'tea']);
    expect(c.why!.dropped).toEqual([{ label: 'water', rule: W.rules.orOnly }]);
    expect(c.why!.headline).toBe(W.headlineFrom.pair);
  });
  it('either-or: failed model options are listed, and the pair is read from the question in code', async () => {
    const dev = choice(['coffee', 'tea'], 'coffee', ['want coffee', 'or']);
    const c = await makeCard('Do you want coffee or tea?', env(new Fake(dev)));
    consistent(c, dev);
    expect(c.why!.decided).toBe(W.decidedBy.pairCode);
    expect(c.why!.dropped).toEqual([{ label: 'want coffee', rule: W.rules.optionsFailed }, { label: 'or', rule: W.rules.optionsFailed }]);
    expect(c.why!.kept).toEqual(['coffee', 'tea']);
  });
  it('no model: no proposal, the pair read in code', async () => {
    const c = await makeCard('Do you want coffee or tea?', env(new Fake(null), { deviceReady: false }));
    consistent(c, null);
    expect(c.why!.proposed).toBeNull();
    expect(c.why!.kept).toEqual([]);
    expect(c.why!.decided).toBe(W.decidedBy.pairCode);
  });
  it('a fixed card drops every model choice with the fixed rule and says who decided', async () => {
    const cases: [string, string][] = [['Do you need the toilet?', W.decidedBy.yesno], ['How was the walk?', W.decidedBy.feeling], ['How bad is the pain?', W.decidedBy.pain], ['What year did we get married?', W.decidedBy.quiz]];
    for (const [q, decided] of cases) {
      const dev = choice(['now', 'later'], 'x');
      const c = await makeCard(q, env(new Fake(dev)));
      consistent(c, dev);
      expect(c.why!.decided, q).toBe(decided);
      if (c.why!.proposed) expect(c.why!.dropped, q).toEqual([{ label: 'now', rule: W.rules.fixed }, { label: 'later', rule: W.rules.fixed }]);
    }
    const body = await makeCard('Where does it hurt?', env(new Fake(choice(['knee', 'hip'], 'pain'))));
    expect(body.why!.decided).toBe(W.decidedBy.body);
    expect(body.why!.proposed).toBeNull(); // never a model
    expect(body.nextPage!.why!.decided).toBe(W.decidedBy.body);
  });
  it('a cloud card names the cloud step as the proposer; an offline fall-back still does', async () => {
    const cloud = choice(['soup', 'a sandwich'], 'tea');
    const online = await makeCard('What shall we have for tea tonight?', env(new Fake(null, cloud), { deviceReady: false }));
    expect(online.source).toBe('in-cloud');
    expect(online.why!.proposed!.step).toBe('stripped');
    expect(online.why!.kept).toEqual(['soup', 'a sandwich']);
    const offline = await makeCard('What shall we have for tea tonight?', env(new Fake(null, cloud, 'on-device'), { deviceReady: false }));
    expect(offline.ranOffline).toBe(true);
    expect(offline.why!.proposed!.step).toBe('stripped');
  });
  it('a blocked card says so in "decided"', async () => {
    const e = new Fake(choice(['happy'], 'bus'));
    const c = await makeCard('What should we do about the bus pass?', env(e, { allowCloud: false }));
    expect(c.blocked).toBeTruthy();
    expect(c.why!.decided).toBe(W.decidedBy.blocked);
  });
});

describe('the "we\'re stuck" repair card', () => {
  const c = repairCard(SAMPLE_PROFILE);
  it('five fixed tiles, all with the repair role and a drawn pictogram; no escape, no answer', () => {
    expect(c.kind).toBe('repair');
    expect(labels(c)).toEqual(['show me', 'write it', 'draw', 'later', 'change topic']);
    expect(c.choices.every((x) => x.role === 'repair')).toBe(true);
    for (const x of c.choices) {
      expect(x.picture.type).toBe('builtin');
      expect(PICTO_IDS).toContain((x.picture as { id: string }).id);
    }
  });
  it('the partner line is built in code and every tile has a next move for the partner', () => {
    expect(c.say).toBe("Let's try another way. Show me, write it, draw, later, or change topic?");
    expect(c.topic).toBe(COPY.repair.headline);
    for (const x of c.choices) expect(COPY.repair.lines[x.label], x.label).toBeTruthy();
  });
  it('never a model: code-only trace, nothing sent, the why says so', () => {
    expect(c.source).toBe('code');
    expect(c.cloudPayload).toBeNull();
    expect(c.trace!.map((t) => t.ran)).toEqual(['skipped', 'skipped', 'on-device']);
    expect(c.why!.decided).toBe(W.decidedBy.repair);
    expect(c.why!.proposed).toBeNull();
  });
  it('the wording of the five ways and the partner lines stays plain', () => {
    const all = [c.say, ...Object.values(COPY.repair.lines), COPY.repair.note, COPY.repair.tip];
    for (const s of all) expect(s).not.toMatch(/!|Firebase|model|rule/i);
  });
});
