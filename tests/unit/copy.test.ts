// build spec §4 and §5.1 "copy truth": every string a person reads comes from core/copy.ts; the main screens carry
// nothing technical; adult tone (no exclamation marks); and every "never sent" claim is literally true of every payload
// the core can build from a rich fixture. Written 11 Nov 2026.
import { describe, expect, it } from 'vitest';
import { COPY } from '../../core/copy';
import type { DeviceStatus, Engine, ModelResult } from '../../core/engine';
import { makeCard } from '../../core/pipeline';
import { aboutBlock } from '../../core/prompt';
import { cloudTextRequest, pictureRequestBody } from '../../core/requests';
import { pictureWord, stripQuestion } from '../../core/strip';
import type { ModelOutput, Profile } from '../../core/types';

/** Every string in a copy group, functions called with sample arguments. */
function strings(v: unknown, out: string[] = []): string[] {
  if (typeof v === 'string') out.push(v);
  else if (typeof v === 'function') out.push(String((v as (...a: unknown[]) => unknown)('x', 'y', 'z')));
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out));
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => strings(x, out));
  return out;
}

const MAIN_GROUPS = Object.keys(COPY).filter((k) => !['consent', 'how', 'judge'].includes(k)) as (keyof typeof COPY)[];
const TECHNICAL = /ONLY_ON_DEVICE|PREFER_IN_CLOUD|ONLY_IN_CLOUD|PREFER_ON_DEVICE|Firebase|Gemini|placeholder|routed:|inferenceSource|KB\s*§|§|\brule\s*\d/i;

describe('§4: nothing technical on the main screens, adult tone everywhere', () => {
  for (const g of MAIN_GROUPS) {
    it(`group "${g}" has no mode names, product names, placeholders or rule numbers`, () => {
      const bad = strings(COPY[g]).filter((s) => TECHNICAL.test(s));
      expect(bad).toEqual([]);
    });
  }
  it('no exclamation marks and no praise, in any group', () => {
    const all = strings(COPY);
    expect(all.filter((s) => s.includes('!'))).toEqual([]);
    expect(all.filter((s) => /\b(?:great|well done|awesome|amazing)\b/i.test(s))).toEqual([]);
  });
  it('the three "never sent" items are the ones the tests below check', () => {
    expect([...COPY.privacy.neverSentItems]).toEqual(['About me lists', 'photos', 'who lives at home']);
    for (const item of COPY.privacy.neverSentItems) expect(COPY.privacy.neverSent).toContain(item);
  });
  it('the cloud-off line does not claim that nothing leaves the device (loading the app does)', () => {
    expect(COPY.privacy.cloudOff).not.toMatch(/nothing leaves/i);
  });
});

// A household with photos, nicknames, a household flag and multi-word entries: everything the privacy lines promise about.
const PHOTO = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/';
const RICH: Profile = {
  personName: 'Dilys',
  partnerName: 'Gareth',
  people: [
    { id: 'a', name: 'Gareth', relation: 'husband', household: true, photo: PHOTO },
    { id: 'b', name: 'Bethan', relation: 'daughter', household: false, nickname: 'Beth', photo: PHOTO },
    { id: 'c', name: 'Rhodri', relation: 'grandson', household: true },
    { id: 'd', name: 'Mrs Pugh', relation: 'neighbour', household: false },
  ],
  foods: ['cawl', 'bara brith', 'Welsh rarebit'],
  places: ['Aberystwyth prom', 'the chapel', 'the allotment on Mill Lane'],
  tv: ['Pobol y Cwm', 'the rugby'],
  music: ['Tom Jones', 'male voice choirs'],
  other: ['a spaniel called Taffy', 'Swansea City'],
};
const QUESTIONS = [
  'What do you fancy for tea, cawl or Welsh rarebit?', 'Shall we ring Beth tonight?', 'Who should come to the chapel with us?',
  'What shall we do at the allotment on Mill Lane?', 'Is the rugby on, or Pobol y Cwm?', 'What would Rhodri like for his birthday?',
  'Shall I ask Mrs Pugh round?', 'What shall we do with Taffy while we are out?', 'Did you enjoy Tom Jones on the radio?',
  'What should I tell your daughter when she rings?', 'Where would you like to walk, the prom or the allotment?', 'Who lives with us now?',
  'Do you want bara brith with your tea?', 'What was the Swansea City score?', 'What do you need, Dilys?', 'Which jumper for the chapel?',
  'Why are you upset with Gareth?', 'What shall we watch tonight?', 'Where shall we go on Saturday with your grandson?', 'Would you like the choirs on?',
];
const HOUSEHOLD_WORDS = ['household', 'lives here', 'lives with', 'live with', 'lives at home', 'live at home', 'lives in the same'];
const containsWord = (hay: string, needle: string) => new RegExp(`(^|[^A-Za-z'])${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^A-Za-z]|$)`, 'i').test(hay);

class Fake implements Engine {
  label = 'fake';
  modes = { device: 'ONLY_ON_DEVICE', cloud: 'PREFER_IN_CLOUD', pictures: 'ONLY_IN_CLOUD' };
  cloudConfigured = true;
  cloudCalls: string[] = [];
  constructor(private dev: ModelOutput | null) {}
  async deviceStatus(): Promise<DeviceStatus> { return 'available'; }
  async prepareDevice() {}
  async runDevice(): Promise<ModelResult> { if (!this.dev) throw new Error('no model'); return { text: JSON.stringify(this.dev), source: 'on-device', ms: 3 }; }
  cloudRequest(q: string) { return cloudTextRequest(q); }
  async runCloud(q: string): Promise<ModelResult> { this.cloudCalls.push(q); return { text: '{"topic":"x","kind":"choice","choices":["one thing","another thing"]}', source: 'in-cloud', ms: 3 }; }
  pictureRequest(w: string) { return pictureRequestBody(w); }
  async picture() { return null; }
}

/** Every payload the core can build for a question: the cloud text request and a picture request per choice word. */
async function payloads(q: string): Promise<string[]> {
  const out: string[] = [];
  const s = stripQuestion(q, RICH);
  out.push(JSON.stringify(cloudTextRequest(s.text)));
  // the partner's own words are sent as written (the consent line says so): the household check below skips them
  out.push(s.text);
  // weak model answers (two mood words) so the card is routed to the cloud, device missing so it goes straight there
  for (const dev of [null, { topic: 'x', kind: 'choice' as const, choices: ['happy', 'sad'] }]) {
    const e = new Fake(dev);
    const c = await makeCard(q, { profile: RICH, support: 'mild', engine: e, allowCloud: true, deviceReady: !!dev });
    for (const sent of e.cloudCalls) out.push(JSON.stringify(cloudTextRequest(sent)));
    if (c.cloudPayload) out.push(c.cloudPayload);
    for (const ch of c.choices) {
      const w = pictureWord(ch.label, RICH);
      if (w && ch.picture.type === 'cloud') out.push(JSON.stringify(pictureRequestBody(ch.picture.word)));
    }
  }
  return out;
}

describe('§4.4 "Never sent: your About me lists, photos and who lives at home" is true of every payload', () => {
  for (const q of QUESTIONS) {
    it(q, async () => {
      const all = await payloads(q);
      const typed = all[1]; // the stripped question, as the partner typed it minus About me words
      const ps = [all[0], ...all.slice(2)];
      expect(ps.length).toBeGreaterThan(0);
      for (const p of ps) {
        // About me lists: every entry, name, nickname and relation word
        for (const s of [...RICH.people.map((x) => x.name), ...RICH.people.map((x) => x.nickname ?? ''), ...RICH.people.map((x) => x.relation), RICH.personName, ...RICH.foods, ...RICH.places, ...RICH.tv, ...RICH.music, ...RICH.other].filter(Boolean)) {
          expect(containsWord(p, s), `"${s}" in ${p}`).toBe(false);
        }
        // photos: no data URL, no image bytes
        expect(p).not.toContain('data:image');
        expect(p).not.toContain(PHOTO.slice(30, 60));
        // who lives at home: no household words anywhere but in the partner's own typed words
        const rest = p.replace(typed, '').replace(JSON.stringify(typed).slice(1, -1), '');
        for (const w of HOUSEHOLD_WORDS) expect(rest.toLowerCase(), `"${w}" in ${p}`).not.toContain(w);
        // and never the on-device ABOUT block, nor any mention of one
        expect(p).not.toContain('ABOUT');
        expect(p).not.toContain('kept on this device');
      }
    });
  }
  it('the household and the photos live only in the on-device prompt', () => {
    const block = aboutBlock(RICH);
    expect(block).toContain('Gareth and Rhodri live with them');
    expect(block).toContain('also called Beth');
    expect(block).not.toContain('data:image'); // a photo is never a prompt either
  });
});

describe('the pipeline reads its partner-screen lines from the copy module', () => {
  it('memory question', async () => {
    const c = await makeCard('What year did we move to Mill Lane?', { profile: RICH, support: 'more', engine: new Fake(null), allowCloud: false, deviceReady: false });
    expect(c.blocked).toBe(COPY.notes.memoryBlocked);
    expect(c.say.startsWith(COPY.notes.tellPrefix)).toBe(true);
  });
  it('no model, cloud off: the blocked line offers cloud help in plain words', async () => {
    const c = await makeCard('What would cheer you up?', { profile: RICH, support: 'more', engine: new Fake(null), allowCloud: false, deviceReady: false });
    expect(c.blocked).toBe(COPY.notes.notReadyCloudPossible);
    expect(c.blocked).not.toMatch(TECHNICAL);
  });
});
