// build spec §2.19: plural forms, unknown capitalised words as "Name A", the leak gate as the last check before
// a send (mutant M3), two people with the same relation become "someone" (mutant M4). Written 11 Nov 2026.
import { describe, expect, it } from 'vitest';
import type { DeviceStatus, Engine, ModelResult } from '../../core/engine';
import { makeCard } from '../../core/pipeline';
import { cloudTextRequest } from '../../core/requests';
import { findLeaks, hasPlaceholder, restoreNames, stripQuestion } from '../../core/strip';
import type { ModelOutput, Profile } from '../../core/types';
import { PROFILE } from './fixtures';

const P: Profile = { ...PROFILE, foods: ['scone', 'Welsh cakes'], tv: ['the darts', 'Countryfile'], places: ['Whitby'] };

describe('plural and singular forms of an About-me word are swapped too', () => {
  it.each([
    ['Do you want scones with your tea?', 'Do you want Food A with your tea?', { 'Food A': 'scones' }],
    ['Fancy a Welsh cake?', 'Fancy a Food A?', { 'Food A': 'Welsh cake' }],
    ['Shall we watch a dart or two?', 'Shall we watch a Show A or two?', { 'Show A': 'dart' }],
  ])('%s', (q, text, map) => {
    const s = stripQuestion(q, P);
    expect(s.text).toBe(text);
    expect(s.map).toEqual(map);
    expect(restoreNames(s.text, s.map)).toBe(q);
  });
  it('the leak gate sees them', () => {
    expect(findLeaks('scones for tea', P)).toContain('scones');
    expect(findLeaks('one dart', P)).toContain('dart');
  });
});

describe('an unknown capitalised word becomes "Name A" and comes back on the device', () => {
  it.each([
    ['Fancy a trip to Scarborough with Pauline?', 'Fancy a trip to Name A with Name B?'],
    ["Shall I ring Pauline about Pauline's car?", "Shall I ring Name A about Name A's car?"],
    ['Is Scarborough nice in May?', 'Is Name A nice in May?'],
    ['Shall I ring Mum on Sunday, or Dad?', 'Shall I ring Mum on Sunday, or Dad?'],
    ['Is the TV on, or the BBC radio?', 'Is the TV on, or the BBC radio?'],
    ['Do you want the Christmas tree up before Easter?', 'Do you want the Christmas tree up before Easter?'],
    ['What time is Dr Patel coming?', 'What time is Dr Name A coming?'],
    ['Pauline rang. Shall we go to Whitby with Mary-Jo?', 'Name A rang. Shall we go to Place A with Name B-Name C?'],
  ])('%s', (q, want) => {
    const s = stripQuestion(q, P);
    expect(s.text).toBe(want);
    expect(restoreNames(s.text, s.map)).toBe(q);
    expect(findLeaks(s.text, P)).toEqual([]);
  });
  it('a capital that opens the sentence is swapped too, unless it is an ordinary opening word (set D, 16 Nov)', () => {
    expect(stripQuestion('Pauline, do you want tea?', P).text).toBe('Name A, do you want tea?');
    expect(stripQuestion('Toast or cereal?', P).text).toBe('Toast or cereal?');
  });
  it('"Name A" counts as a placeholder the cloud must not invent', () => {
    expect(hasPlaceholder('Name A')).toBe(true);
    expect(hasPlaceholder('a name')).toBe(false);
  });
});

class Fake implements Engine {
  label = 'fake';
  modes = { device: 'ONLY_ON_DEVICE', cloud: 'PREFER_IN_CLOUD' };
  cloudConfigured = true;
  cloudCalls: string[] = [];
  constructor(private dev: ModelOutput | null, private cloud: ModelOutput = { topic: 'x', kind: 'choice', choices: ['one thing', 'another thing'] }) {}
  async deviceStatus(): Promise<DeviceStatus> { return 'available'; }
  async prepareDevice() {}
  async runDevice(): Promise<ModelResult> { if (!this.dev) throw new Error('no model'); return { text: JSON.stringify(this.dev), source: 'on-device', ms: 3 }; }
  cloudRequest(q: string) { return cloudTextRequest(q); }
  async runCloud(q: string): Promise<ModelResult> { this.cloudCalls.push(q); return { text: JSON.stringify(this.cloud), source: 'in-cloud', ms: 3 }; }
}
const env = (engine: Engine, profile: Profile) => ({ profile, support: 'more' as const, engine, allowCloud: true, deviceReady: false });
const labels = (c: { choices: { label: string }[] }) => c.choices.map((x) => x.label);

describe('the round trip through the cloud', () => {
  it('a cloud answer with "Name A" is restored to the word the partner typed; an invented label is dropped', async () => {
    const e = new Fake(null, { topic: 'trip', kind: 'choice', choices: ['Name A', 'the beach', 'Name C'] });
    const c = await makeCard('What shall we do in Scarborough?', env(e, P));
    expect(e.cloudCalls).toEqual(['What shall we do in Name A?']);
    expect(labels(c)).toEqual(['Scarborough', 'the beach', 'something else']);
    expect(c.cloudSwaps).toEqual(['Name A ← Scarborough']);
  });
});

describe('mutant M3: the leak gate blocks a send even when the stripper missed a relation word', () => {
  // a person with a relation but no name: the stripper has nothing to swap "your granddaughter" for
  const NONAME: Profile = { ...PROFILE, people: [...PROFILE.people, { id: 'x', name: '', relation: 'granddaughter', household: false }] };
  it('findLeaks catches the relation word', () => {
    expect(findLeaks('What shall we get your granddaughter?', NONAME)).toContain('granddaughter');
  });
  it('nothing is sent', async () => {
    const e = new Fake(null);
    const c = await makeCard('What shall we get your granddaughter?', env(e, NONAME));
    expect(e.cloudCalls).toHaveLength(0);
    expect(c.cloudPayload).toBeNull();
    expect(c.notes.join(' ')).toMatch(/Not sent: the question still held an About me word/);
  });
});

describe('mutant M4: two people with the same relation become "someone"', () => {
  const TWO: Profile = { ...PROFILE, people: [...PROFILE.people, { id: 'p6', name: 'Ruth', relation: 'daughter', household: false }] };
  it('the relation word is never swapped to one of them', () => {
    const s = stripQuestion('What should I tell your daughter?', TWO);
    expect(s.text).toBe('What should I tell someone?');
    expect(Object.values(s.map)).not.toContain('Grace');
    expect(Object.values(s.map)).not.toContain('Ruth');
  });
  it('a relation that points at one person still becomes that person', () => {
    expect(stripQuestion('What should I tell your brother?', TWO).text).toBe('What should I tell Person A?');
  });
});
