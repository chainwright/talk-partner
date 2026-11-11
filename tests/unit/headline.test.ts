// REBUILD_SPEC §2.5 (headline for an or-pair = the shared topic, never one of the options), §2.16 (headline rules)
// and §2.2 (address words and the person's name are not part of a headline). Written 11 Nov 2026; all examples new.
import { describe, expect, it } from 'vitest';
import type { DeviceStatus, Engine, ModelResult } from '../../core/engine';
import { makeCard } from '../../core/pipeline';
import { cloudTextRequest, pictureRequestBody } from '../../core/requests';
import { heuristicTopic, orHeadline, validTopic } from '../../core/rules';
import { SAMPLE_PROFILE } from '../../core/sample';
import type { ModelOutput, Profile } from '../../core/types';
import { PROFILE } from './fixtures';

class Fake implements Engine {
  label = 'fake';
  modes = { device: 'ONLY_ON_DEVICE', cloud: 'PREFER_IN_CLOUD', pictures: 'ONLY_IN_CLOUD' };
  cloudConfigured = true;
  cloudCalls: string[] = [];
  constructor(private dev: ModelOutput | null) {}
  async deviceStatus(): Promise<DeviceStatus> { return 'available'; }
  async prepareDevice() {}
  async runDevice(): Promise<ModelResult> {
    if (!this.dev) throw new Error('no model');
    return { text: JSON.stringify(this.dev), source: 'on-device', ms: 3 };
  }
  cloudRequest(q: string) { return cloudTextRequest(q); }
  async runCloud(q: string): Promise<ModelResult> { this.cloudCalls.push(q); return { text: '{"topic":"x","kind":"choice","choices":["a","b"]}', source: 'in-cloud', ms: 3 }; }
  pictureRequest(w: string) { return pictureRequestBody(w); }
  async picture() { return null; }
}
const env = (engine: Engine, profile: Profile = PROFILE, deviceReady = true) => ({ profile, support: 'more' as const, engine, allowCloud: true, deviceReady });

describe('§2.5: the headline for an or-pair is the shared topic', () => {
  it.each([
    ['Raglan beach or the garden centre this weekend?', ['Raglan beach', 'garden centre'], 'this weekend'],
    ['Mince on toast or cheese scones for lunch?', ['Mince on toast', 'cheese scones'], 'lunch'],
    ['Porridge or cheese on toast this morning?', ['Porridge', 'cheese on toast'], 'this morning'],
    ['Shall we walk to the shop, or would you rather stay home this afternoon?', ['walk to the shop', 'stay home'], 'this afternoon'],
    ['Do you want coffee or tea?', ['coffee', 'tea'], 'drink'],
    ['Would you like cocoa or hot milk?', ['cocoa', 'hot milk'], 'drink'],
    ['Now or later?', ['now', 'later'], 'when'],
    ['Do you want the blue jumper or the grey cardigan?', ['blue jumper', 'grey cardigan'], 'clothes'],
  ])('%s -> %s', (q, pair, want) => {
    expect(orHeadline(q, pair as [string, string])).toBe(want);
  });

  it('a pair of About-me items gets the kind of thing', () => {
    expect(orHeadline('Pot roast or chili?', ['pot roast', 'chili'], SAMPLE_PROFILE)).toBe('food');
    expect(orHeadline('Jenny or Tyler?', ['Jenny', 'Tyler'], SAMPLE_PROFILE)).toBe('who');
    expect(orHeadline('Should we ring Jenny or Tyler?', ['Jenny', 'Tyler'], SAMPLE_PROFILE)).toBe('ring'); // the shared topic wins over the kind
    expect(orHeadline('The lake or church?', ['lake', 'church'], SAMPLE_PROFILE)).toBe('where to');
  });

  it('never one of the options, whatever the model proposed', () => {
    const pair: [string, string] = ['lie down', 'sit out on the deck'];
    const q = 'Do you want to lie down for a bit, or sit out on the deck?';
    const h = orHeadline(q, pair, PROFILE, 'lie down');
    expect(pair.map((p) => p.toLowerCase())).not.toContain(h.toLowerCase());
    expect(h).toBe('which one'); // no shared topic, no category, the model's topic names a side, the pair is too long
    expect(orHeadline(q, pair, PROFILE, 'rest')).toBe('rest'); // a model topic that names neither side is fine
    expect(orHeadline('Do you want coffee or tea?', ['coffee', 'tea'], PROFILE, 'coffee')).toBe('drink');
  });

  it('a short pair with no topic reads as the pair', () => {
    expect(orHeadline('Pie or soup?', ['pie', 'soup'])).toBe('pie or soup');
  });

  it("the person's name and address words are not the topic", () => {
    expect(orHeadline('Graham, coffee or tea?', ['coffee', 'tea'], { ...PROFILE, personName: 'Graham' })).toBe('drink');
    expect(orHeadline('Ma, you want the lamp on or off?', ['on', 'off'])).toBe('lamp');
  });
});

describe('§2.16: a model topic is a headline only when it names an idea', () => {
  it.each(['again', 'then', 'the', 'you', 'love', 'Person A', 'Name B', ''])('rejects %j', (t) => {
    expect(validTopic(t)).toBe('');
  });
  it('keeps a real topic, case as typed, at most four words', () => {
    expect(validTopic('therapy today')).toBe('therapy today');
    expect(validTopic('Therapy Today')).toBe('Therapy Today');
    expect(validTopic('happen again')).toBe('happen again');
    expect(validTopic('a very long topic of six words')).toBe('a very long topic');
  });
  it('rejects a topic that is one of the options or contains one', () => {
    expect(validTopic('coffee', ['coffee', 'tea'])).toBe('');
    expect(validTopic('hot coffee', ['coffee', 'tea'])).toBe('');
    expect(validTopic('drinks', ['coffee', 'tea'])).toBe('drinks');
  });
});

describe('§2.2: address words are removed from the headline', () => {
  it('heuristic topic skips "Ma", "love" and the person\'s name', () => {
    expect(heuristicTopic('Ma, you want coffee?')).toBe('coffee');
    expect(heuristicTopic('Are you warm enough, love?')).toBe('warm enough');
    expect(heuristicTopic('Graham, do you want the lamp on?', { ...PROFILE, personName: 'Graham' })).toBe('lamp');
  });

  it('"Ma, you want coffee?" is yes / no / not sure with the headline "coffee"', async () => {
    const c = await makeCard('Ma, you want coffee?', env(new Fake(null), PROFILE, false));
    expect(c.kind).toBe('yesno');
    expect(c.choices.map((x) => x.label)).toEqual(['yes', 'no', 'not sure']);
    expect(c.topic).toBe('coffee');
  });
});

describe('the headline on a made card', () => {
  it('coffee or tea: "drink", with or without a model, and a model topic naming a side is ignored', async () => {
    const withModel = await makeCard('Do you want coffee or tea?', env(new Fake({ topic: 'coffee', kind: 'choice', choices: ['coffee', 'tea'], options: ['coffee', 'tea'] })));
    const noModel = await makeCard('Do you want coffee or tea?', env(new Fake(null), PROFILE, false));
    expect(withModel.topic).toBe('drink');
    expect(noModel.topic).toBe('drink');
  });

  it('a model topic that is one adverb falls back to the question words', async () => {
    const c = await makeCard('What do you want to do again tomorrow?', env(new Fake({ topic: 'again', kind: 'choice', choices: ['the crossword', 'a walk'] })));
    expect(c.topic).not.toBe('again');
    expect(c.topic.split(' ').length).toBeLessThanOrEqual(3);
  });

  it('the headline is never one of the answers on an open card', async () => {
    const c = await makeCard('What shall we have for tea tonight?', env(new Fake({ topic: 'lamb', kind: 'choice', choices: ['lamb', 'rice'] })));
    const answers = c.choices.filter((x) => x.role === 'answer').map((x) => x.label.toLowerCase());
    expect(answers).not.toContain(c.topic.toLowerCase());
    expect(answers.length).toBeGreaterThanOrEqual(2);
  });
});
