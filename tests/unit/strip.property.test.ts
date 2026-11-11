// Property test for the cloud swap: random About-me profiles and random partner sentences (seeded, repeatable).
// For every sentence: nothing from About me is left in what would be sent, the swap never cuts inside a word or a
// contraction, every non-profile word survives unchanged, and the words come back exactly as typed on the card.
import { describe, expect, it } from 'vitest';
import { findLeaks, restoreNames, stripQuestion } from '../../core/strip';
import type { Profile } from '../../core/types';

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}

const NAMES = ['Darcy', 'Huw', 'Siobhan', 'Ines', 'Kwame', 'Ruthie', 'Bartek', 'Noor', "D'Arcy", 'Mary-Jo', 'Tomás', 'Pat'];
const FOODS = ['cheese on toast', 'shepherd’s pie', 'Welsh cakes', 'jollof rice', 'pierogi with onions', 'mac and cheese', 'bara brith', 'fish finger sandwich'];
const PLACES = ['the cottage up at the lake', 'St. Brigid’s church', "O'Neill's pub", 'the allotment by the railway', 'Penarth pier', 'the garden centre on Mill Road', 'Aunt Edie’s farm'];
const TV = ['The Price Is Right', "Gardeners' World", 'Who Wants to Be a Millionaire', 'Bargain Hunt', 'the snooker', 'Coronation Street'];
const MUSIC = ['Tom Jones', 'the Andrews Sisters', 'Fela Kuti', 'brass bands', 'Shirley Bassey', "rock 'n' roll"];
const OTHER = ['a terrier called Mabel', 'Cardiff City', 'crosswords in the paper', 'the Co-op on Station Street'];
// filler: contractions and ordinary words that share nothing with the pools above
const FILLER = [
  "isn't it", "you'll", "won't you", "it's", "we'd", "shouldn't we", "o'clock", "y'know", 'love', 'later', 'maybe',
  'tomorrow', 'after lunch', 'with me', 'again', 'quickly', 'honestly', 'do you fancy', 'shall I ring', 'what about',
];

const pick = <T,>(r: () => number, xs: T[]) => xs[Math.floor(r() * xs.length)];
const sample = <T,>(r: () => number, xs: T[], n: number) => [...xs].sort(() => r() - 0.5).slice(0, n);

function randomProfile(r: () => number): Profile {
  const names = sample(r, NAMES, 4);
  return {
    personName: names[0], partnerName: names[1],
    people: names.slice(1).map((n, i) => ({ id: `x${i}`, name: n, relation: ['spouse', 'nephew', 'aide'][i] ?? 'friend', household: i === 0 })),
    foods: sample(r, FOODS, 3), places: sample(r, PLACES, 3), tv: sample(r, TV, 3), music: sample(r, MUSIC, 2), other: sample(r, OTHER, 2),
  };
}

/** A mention of an About-me item: the whole thing, without "the", or one of its distinctive words. */
function mention(r: () => number, item: string): string {
  const x = r();
  if (x < 0.5) return item;
  if (x < 0.7) return item.replace(/^the\s+/i, '');
  const ws = item.split(/\s+/).filter((w) => w.length > 3 && !/^(the|with|called|by|on|at|in|up|is|to|be|who|wants)$/i.test(w));
  return ws.length ? pick(r, ws) : item;
}

const PLACEHOLDER_GLUED = /[\p{L}\p{N}'’](?:Person|Food|Place|Show|Music|Thing) [A-Z]|(?:Person|Food|Place|Show|Music|Thing) [A-Z][\p{L}\p{N}]/u;

describe('property: the cloud swap over random profiles and sentences', () => {
  it('500 sentences: no leak, no cut inside a word, filler intact, exact round trip', () => {
    const r = rng(20261110);
    for (let n = 0; n < 500; n++) {
      const p = randomProfile(r);
      const items = [p.personName, ...p.people.map((x) => x.name), ...p.foods, ...p.places, ...p.tv, ...p.music, ...p.other];
      const parts: string[] = [];
      const fillers: string[] = [];
      const len = 3 + Math.floor(r() * 4);
      for (let k = 0; k < len; k++) {
        if (r() < 0.5) parts.push(mention(r, pick(r, items)));
        else { const f = pick(r, FILLER); fillers.push(f); parts.push(f); }
      }
      const q = `${parts.join(r() < 0.5 ? ' ' : ', ')}?`;
      const s = stripQuestion(q, p);
      const ctx = `#${n}: ${q}\n  -> ${s.text}`;
      expect(findLeaks(s.text, p), ctx).toEqual([]);
      expect(PLACEHOLDER_GLUED.test(s.text), ctx).toBe(false);
      for (const f of fillers) expect(s.text, ctx).toContain(f);
      expect(restoreNames(s.text, s.map), ctx).toBe(q);
    }
  });

  it('the two garbles seen on held-out 5 cannot happen: whole words, contractions kept', () => {
    const p: Profile = { personName: 'Ines', partnerName: 'Huw', people: [], foods: [], places: ['the cottage up at the lake'], tv: ['The Price Is Right'], music: [], other: [] };
    const a = stripQuestion('Should we keep the cottage up there, or sell it?', p);
    expect(a.text).toBe('Should we keep the Place A up there, or sell it?');
    expect(a.map).toEqual({ 'Place A': 'cottage' });
    const b = stripQuestion("It's bugging you, isn't it? Is it the Price Is Right or the news?", p);
    expect(b.text).toBe("It's bugging you, isn't it? Is it the Show A or the news?");
    expect(restoreNames(b.text, b.map)).toBe("It's bugging you, isn't it? Is it the Price Is Right or the news?");
  });
});
