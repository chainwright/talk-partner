// Day 3 (11 Nov 2026, late session): the step trace for judge mode, nicknames in the privacy swap, the §2.10 override
// card, "your left arm" on the person's card, role pictograms, and the pictogram provenance register.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { COPY } from '../../core/copy';
import type { DeviceStatus, Engine, ModelResult } from '../../core/engine';
import { BUILTIN, pictureFor } from '../../core/pictures';
import { bodyDetailCard, makeCard, quizOverrideCard } from '../../core/pipeline';
import { aboutBlock } from '../../core/prompt';
import { cloudTextRequest } from '../../core/requests';
import { findPerson, inventedNameFilter, recognitionPool } from '../../core/rules';
import { SAMPLE_PROFILE } from '../../core/sample';
import { findLeaks, stripQuestion } from '../../core/strip';
import type { Card, ModelOutput, Profile } from '../../core/types';
import { IMAGE_IDS, PICTO_IDS, builtinPicto, monogram, svgPicto } from '../../web/src/pictos';
import { PROFILE } from './fixtures';

type ModelState = 'ready' | 'throws' | 'absent';
type CloudState = 'off' | 'unconfigured' | 'throws' | 'offline' | 'ok';

class E implements Engine {
  label = 'trace';
  modes = { device: 'ONLY_ON_DEVICE', cloud: 'PREFER_IN_CLOUD' };
  deviceCalls = 0;
  cloudCalls = 0;
  readonly cloudConfigured: boolean;
  constructor(private m: ModelState, private c: CloudState, private dev: ModelOutput) { this.cloudConfigured = c !== 'unconfigured'; }
  async deviceStatus(): Promise<DeviceStatus> { return this.m === 'absent' ? 'unavailable' : 'available'; }
  async prepareDevice() {}
  async runDevice(): Promise<ModelResult> { this.deviceCalls++; if (this.m === 'throws') throw new Error('device failed'); return { text: JSON.stringify(this.dev), source: 'on-device', ms: 7 }; }
  cloudRequest(q: string) { return cloudTextRequest(q); }
  async runCloud(): Promise<ModelResult> {
    this.cloudCalls++;
    if (this.c === 'throws' || this.c === 'unconfigured') throw new Error('cloud failed');
    return { text: '{"topic":"weekend","kind":"choice","choices":["the lake","church"]}', source: this.c === 'offline' ? 'on-device' : 'in-cloud', ms: 9 };
  }
}
const env = (e: E, m: ModelState, c: CloudState, profile: Profile = SAMPLE_PROFILE) => ({ profile, support: 'more' as const, engine: e, allowCloud: c !== 'off', deviceReady: m !== 'absent' });
const step = (card: Card, s: 'private' | 'stripped' | 'code') => card.trace!.find((t) => t.step === s)!;

describe('the step trace reports only what the engine reported (never claims on-device when it did not run)', () => {
  const weak: ModelOutput = { topic: 'weekend', kind: 'choice', choices: ['good', 'bad'] }; // two mood words: routes to the cloud
  for (const m of ['ready', 'throws', 'absent'] as ModelState[]) for (const c of ['off', 'unconfigured', 'throws', 'offline', 'ok'] as CloudState[]) {
    it(`open question, model ${m} × cloud ${c}`, async () => {
      const e = new E(m, c, weak);
      const card = await makeCard('What do you want to do this weekend?', env(e, m, c));
      expect(card.trace!.map((t) => t.step)).toEqual(['private', 'stripped', 'code']);
      const priv = step(card, 'private');
      const strip = step(card, 'stripped');
      // the private step says "ran on this computer" only when the device was really called and answered
      expect(priv.ran === 'on-device').toBe(m === 'ready' && e.deviceCalls === 1);
      if (m === 'absent') { expect(priv.ran).toBe('skipped'); expect(e.deviceCalls).toBe(0); }
      if (m === 'throws') expect(priv.ran).toBe('failed');
      // the cloud step says "ran in the cloud" only when the cloud answered; offline fall-back is "ran on this computer"
      expect(strip.ran === 'in-cloud').toBe(c === 'ok' && e.cloudCalls === 1);
      expect(strip.ran === 'on-device').toBe(c === 'offline' && e.cloudCalls === 1);
      if (c === 'off' || c === 'unconfigured') { expect(strip.ran).toBe('skipped'); expect(e.cloudCalls).toBe(0); }
      // "used" follows the card's own source
      if (!card.blocked) {
        expect(strip.used).toBe(card.source === 'in-cloud' || !!card.ranOffline);
        expect(priv.used).toBe(card.source === 'on-device' && !card.ranOffline);
      } else {
        expect(priv.used).toBe(false);
        expect(strip.used).toBe(false);
      }
      for (const t of card.trace!) { expect(t.why.length).toBeGreaterThan(0); expect(t.why).not.toMatch(/ONLY_|PREFER_|Firebase/); }
    });
  }

  it('a code-only card (either-or, yes/no, pain, body, memory) shows both model steps as not needed', async () => {
    for (const q of ['Do you want coffee or tea?', 'Do you need the toilet?', 'How bad is the pain?', 'Where does it hurt?', 'What year did we get married?']) {
      const e = new E('ready', 'ok', { topic: 'x', kind: 'yesno', choices: ['yes', 'no'] });
      const card = await makeCard(q, env(e, 'ready', 'ok'));
      expect(step(card, 'stripped').ran).toBe('skipped');
      expect(step(card, 'code').used).toBe(true);
      expect(e.cloudCalls).toBe(0);
      if (q !== 'Do you want coffee or tea?' && q !== 'Do you need the toilet?') expect(step(card, 'private').ran).toBe('skipped');
    }
  });

  // Changed 16 Nov 2026: a card code decides alone no longer runs the model at all (it used to run it and throw the
  // answer away, a 3 s wait on a real device), so "No AI needed" is literally true and the trace says "did not run".
  it('a code-determined card runs no model, even when one is ready: "No AI needed" is literal', async () => {
    for (const q of ['Do you need the toilet?', 'Do you want coffee or tea?', 'How was the walk?', 'Should we ring Jen or Tyler?']) {
      const e = new E('ready', 'ok', { topic: 'toilet', kind: 'choice', choices: ['now', 'later'] });
      const card = await makeCard(q, env(e, 'ready', 'ok'));
      expect(e.deviceCalls, q).toBe(0);
      expect(card.source, q).toBe('code');
      expect(step(card, 'private').ran, q).toBe('skipped');
      expect(step(card, 'private').why, q).toBe(COPY.notes.trace.notNeeded);
      expect(step(card, 'stripped').why, q).toBe(COPY.notes.trace.notNeeded);
    }
  });
  it('a longer either-or still asks the model to copy the options, and says so when the code pair is used instead', async () => {
    const e = new E('ready', 'ok', { topic: 'out', kind: 'choice', choices: ['now', 'later'], options: ['want to walk', 'or'] });
    // (since 17 Nov a pair the code reads whole runs no model; here the first side breaks off before "for a while")
    const card = await makeCard('Shall we sit out in the garden for a while, or would you rather stay in?', env(e, 'ready', 'ok'));
    expect(e.deviceCalls).toBe(1);
    expect(card.source).toBe('code');
    expect(step(card, 'private').ran).toBe('on-device');
    expect(step(card, 'private').used).toBe(false);
    // the cloud step was not needed because the rules made the card, not because a device card was good enough
    expect(step(card, 'stripped').why).toBe(COPY.notes.trace.notNeeded);
  });
});

describe('nickname (§2.19): swapped like a name, caught by the leak gate, known to the rules', () => {
  it('stripQuestion and findLeaks', () => {
    const s = stripQuestion('Should we ring Jen or Tyler?', SAMPLE_PROFILE);
    expect(s.text).toMatch(/^Should we ring Person [AB] or Person [AB]\?$/);
    expect(Object.values(s.map).sort()).toEqual(['Jen', 'Tyler']);
    expect(findLeaks(s.text, SAMPLE_PROFILE)).toEqual([]);
    expect(findLeaks('ring Jen tonight', SAMPLE_PROFILE)).toContain('jen');
    expect(findLeaks("Jen's car", SAMPLE_PROFILE)).toContain('jen');
  });
  it('the card: the nickname is a person, so it gets the person picture and the people escape', async () => {
    const e = new E('absent', 'off', { topic: 'x', kind: 'yesno', choices: ['yes', 'no'] });
    const card = await makeCard('Should we ring Jen or Tyler?', env(e, 'absent', 'off'));
    expect(card.choices.map((c) => c.label)).toEqual(['Jen', 'Tyler', 'someone else']);
    expect(card.choices[0].picture).toEqual({ type: 'person', personId: 's2', initial: 'J' });
    expect(findPerson('Jen', SAMPLE_PROFILE)?.name).toBe('Jenny');
    expect(inventedNameFilter(['Jen', 'Luke'], 'Who should we ring?', SAMPLE_PROFILE)).toEqual(['Jen']);
    expect(aboutBlock(SAMPLE_PROFILE)).toContain('Jenny (daughter, also called Jen)');
  });
});

describe('§2.10 override: a recognition card from About me only, or just ask normally', () => {
  it('a name question gets the people, paged at "more"', () => {
    const c = quizOverrideCard('Who came to the wedding, do you remember?', SAMPLE_PROFILE, 'more');
    expect(c.blocked ?? null).toBeNull();
    expect(c.choices.map((x) => x.label)).toEqual(['you', 'Jenny', 'someone else']); // the partner shows as "you"
    expect(c.nextPage!.choices.map((x) => x.label)).toEqual(['Tyler', 'Beth', 'someone else']); // (phase 15: Beth joined the sample family)
    expect(c.notes).toContain('Only things from About me are on this card; nothing is made up.');
    expect(c.source).toBe('code');
    expect(c.trace!.every((t) => t.step === 'code' ? t.used : t.ran === 'skipped')).toBe(true);
  });
  it('a place question gets the places; a pet question the "other" entries', () => {
    expect(quizOverrideCard('What was the name of the hotel in Whitby?', SAMPLE_PROFILE, 'mild').choices.map((x) => x.label)).toEqual(['lake', 'church', 'hardware store', 'somewhere else']);
    const pets: Profile = { ...PROFILE, other: ['cat called Biscuit', 'Leeds United', 'the old dog Rex'] };
    expect(recognitionPool('What was the dog called?', pets)?.source).toBe('other things from About me');
    expect(quizOverrideCard('What was the dog called?', pets, 'mild').choices.map((x) => x.label)).toEqual(['cat called Biscuit', 'Leeds United', 'old dog Rex', 'something else']);
  });
  it('a year, a date or an age has no safe pool: no card, no invented distractors', () => {
    for (const q of ['What year did we get married?', 'How old is Jenny now?', "When's Tyler's birthday?", 'What day is it?']) {
      const c = quizOverrideCard(q, SAMPLE_PROFILE, 'more');
      expect(c.blocked).toBeTruthy();
      expect(c.choices).toEqual([]);
      expect(c.say).toBe(`Just ask normally: ${q}`);
    }
  });
  it('fewer than two items of the right kind: no card', () => {
    const one: Profile = { ...SAMPLE_PROFILE, places: ['the lake'] };
    expect(quizOverrideCard('What was the name of the hotel?', one, 'more').blocked).toBeTruthy();
  });
});

describe('§2.11: "left" is the person\'s own left, so the card says "your left arm"', () => {
  it('labels, spoken line and the body picture', () => {
    const c = bodyDetailCard('arms', SAMPLE_PROFILE, 'mild');
    expect(c.choices.map((x) => x.label)).toEqual(['your left arm', 'your right arm', 'hands', 'somewhere else']);
    expect(c.say).toBe('Where in the arms? Your left arm, your right arm, hands, or somewhere else?');
    expect(c.choices[0].picture).toEqual({ type: 'builtin', id: 'body:left arm' });
    expect(c.choices[2].picture).toEqual({ type: 'builtin', id: 'body:hands' });
    expect(bodyDetailCard('chest', SAMPLE_PROFILE, 'mild').choices.map((x) => x.label)).toEqual(['your left side', 'middle', 'your right side', 'somewhere else']);
    // (phase 18, judge round 13: the arms are drawn from behind) the highlight for the person's left arm sits on the
    // viewer's left of the figure (x < 48), as on the person's own body
    expect(builtinPicto('body:left arm')).toMatch(/M34 30l-12 28" stroke="#d9453c"/);
    expect(builtinPicto('body:right arm')).toMatch(/M62 30l12 28" stroke="#d9453c"/);
  });
});

describe('role pictograms (batch 1): a role word shares its picture with its synonyms', () => {
  it.each([
    ['the carer', 'carer'], ['a neighbour', 'neighbour'], ['your daughter', 'child'], ['GP', 'doctor'], ['the physio', 'physio'],
    ['the vicar', 'priest'], ['family', 'family'], ['my sister', 'sibling'], ['your wife', 'spouse'], ['grandchildren', 'grandchild'], ['tired', 'tired'],
  ])('%s -> %s', (label, id) => {
    expect(pictureFor(label, PROFILE)).toEqual({ type: 'builtin', id });
  });
  it('a named person still gets their own picture, and a generic noun is not a role', () => {
    expect(pictureFor('Grace', PROFILE).type).toBe('person');
    expect(pictureFor('umbrella', PROFILE).type).toBe('cloud');
  });
});

describe('pictogram provenance: PICTOGRAMS.md lists exactly what the code bundles', () => {
  const md = readFileSync(join(__dirname, '..', '..', 'PICTOGRAMS.md'), 'utf8');
  const rows = md.split('\n').filter((l) => /^\|\s*(?:[a-z]|body:)/.test(l)).map((l) => l.split('|').map((x) => x.trim())).filter((r) => r[1] !== 'id');
  const ids = rows.map((r) => r[1]);
  const MANIFEST = JSON.parse(readFileSync(join(__dirname, '..', '..', 'devlog/quota_probe_2026-11-20/ASSET_MANIFEST.json'), 'utf8')) as Record<string, { date: string; model: string; tool: string }>;
  // (20 Nov 2026, phase 11) the columns are id | shows | source | date | licence/terms: the set is mixed, our SVG
  // drawings (Apache-2.0) and the pictures made with Gemini (the Gemini API terms); it was id | shows | drawn | licence
  it('the same ids, each with its source, a 2026 date and its licence or terms', () => {
    expect(md).toContain('| id | shows | source | date | licence/terms |');
    expect([...ids].sort()).toEqual([...PICTO_IDS].sort());
    for (const r of rows) {
      expect(r[4], r[1]).toMatch(/2026/);
      if (IMAGE_IDS.includes(r[1])) {
        // (phase 12: the tool and "no model call at run time" are said on every row, and the date is the manifest's)
        expect(r[3], r[1]).toBe('Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`) in Google AI Studio, generated offline, bundled; no model call at run time; reviewed by a person');
        expect(r[4], r[1]).toMatch({ '2026-11-23': /^23 Nov 2026/, '2026-11-22': /^22 Nov 2026/ }[MANIFEST[r[1]].date] ?? /^20 Nov 2026$/);
        expect(r[5], r[1]).toBe('output used under the Gemini API terms; no copyright claimed by us beyond what applies');
      } else {
        expect(r[3], r[1]).toBe('drawn by us (SVG)');
        expect(r[5], r[1]).toBe('Apache-2.0');
      }
    }
  });
  it('the rows made with Gemini are exactly the ids of the manifest, and the header says the set is mixed', () => {
    const manifest = JSON.parse(readFileSync(join(__dirname, '..', '..', 'devlog/quota_probe_2026-11-20/ASSET_MANIFEST.json'), 'utf8')) as Record<string, unknown>;
    expect(rows.filter((r) => r[3].startsWith('Generated with Gemini')).map((r) => r[1]).sort()).toEqual(Object.keys(manifest).sort());
    expect(md).toContain(`**${IMAGE_IDS.length} pictures made with Google's Gemini**`);
    expect(md).toContain(`**${PICTO_IDS.length - IMAGE_IDS.length} SVG drawings of our own**`);
    expect(md).not.toContain('no AI-generated image');
  });
  it('every built-in id the core may ask for is drawn', () => {
    for (const id of BUILTIN) expect(PICTO_IDS, id).toContain(id);
  });
  it('style rules: role="img" with a name, no text inside (except the monogram), dashes only on the escape', () => {
    for (const id of PICTO_IDS) {
      if (id === 'monogram') continue;
      // our SVG drawing (shown, or the fallback of a picture made with Gemini, 20 Nov 2026)
      const s = svgPicto(id);
      expect(s).toMatch(/role="img" aria-label="[^"]+"/);
      expect(s).not.toContain('<text');
      expect(s.includes('stroke-dasharray'), id).toBe(id === 'something else');
      // what the card shows has a name for a screen reader either way: the word as the picture's text, or the label
      expect(builtinPicto(id)).toMatch(IMAGE_IDS.includes(id) ? /^<img [^>]*alt="[^"]+"/ : /role="img" aria-label="[^"]+"/);
      // and on the card itself the way out is the only dashed picture (20 Nov 2026: it is our drawing again)
      expect(builtinPicto(id).includes('stroke-dasharray'), `${id} on the card`).toBe(id === 'something else');
    }
    expect(monogram('J')).toContain('<text');
  });
  it('no two pictograms share a drawing', () => {
    const bodies = PICTO_IDS.filter((id) => id !== 'monogram').map((id) => builtinPicto(id));
    const drawings = PICTO_IDS.filter((id) => id !== 'monogram').map((id) => svgPicto(id).replace(/aria-label="[^"]+"/, ''));
    expect(new Set(drawings).size).toBe(drawings.length);
    expect(new Set(bodies).size).toBe(bodies.length);
  });
});
