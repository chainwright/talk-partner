// Which picture a choice gets. Built-in pictographs for fixed words, the person's own photo or initial for names,
// and a cloud-generated picture only for a generic word (never a name or an About-me item: see strip.ts pictureWord).

import { BODY_DETAIL, BODY_REGIONS, findPerson, isPartnerName } from './rules';
import { pictureWord } from './strip';
import type { PictureRef, Profile } from './types';

const BUILTIN = new Set([
  'yes', 'no', 'not sure', 'something else', 'someone else', 'somewhere else',
  'good', 'okay', 'bad', 'tasty', 'plain', 'too salty', 'good idea', 'leave it', 'like them', 'unhappy',
  'a little', 'some', 'a lot', 'this one', 'that one',
  // added 11 Nov 2026
  'listen', 'tea', 'coffee',
]);

export function pictureFor(label: string, profile: Profile): PictureRef {
  const l = label.toLowerCase().trim();
  if (BUILTIN.has(l)) return { type: 'builtin', id: l };
  if ((BODY_REGIONS as string[]).includes(l) || Object.values(BODY_DETAIL).some((d) => d.includes(l))) return { type: 'builtin', id: `body:${l}` };
  if (l === 'you' || isPartnerName(label, profile)) return { type: 'person', personId: null, initial: (profile.partnerName || 'Y').charAt(0).toUpperCase() };
  const p = findPerson(label, profile);
  if (p) return { type: 'person', personId: p.id, initial: p.name.charAt(0).toUpperCase() };
  // A picture request carries one generic word (§2.20 gate): the label is lower-case as typed, has no digits and
  // holds no About-me term. An About-me item goes as its category ("food", "a place"); a capitalised word (a name
  // the profile doesn't know, a brand, a place) and anything else gets no cloud picture at all: the word alone shows.
  const w = pictureWord(l, profile);
  if (!w) return { type: 'word' };
  if (w === l && (/\p{Lu}/u.test(label) || /\d/.test(label))) return { type: 'word' };
  return { type: 'cloud', word: w };
}
