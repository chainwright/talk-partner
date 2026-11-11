// Which picture a choice gets. Built-in pictographs for fixed words, the person's own photo or initial for names,
// and a cloud-generated picture only for a generic word (never a name or an About-me item: see strip.ts pictureWord).

import { BODY_DETAIL, BODY_REGIONS, findPerson, isPartnerName } from './rules';
import { pictureWord } from './strip';
import type { PictureRef, Profile } from './types';

const BUILTIN = new Set([
  'yes', 'no', 'not sure', 'something else', 'someone else', 'somewhere else',
  'good', 'okay', 'bad', 'tasty', 'plain', 'too salty', 'good idea', 'leave it', 'like them', 'unhappy',
  'a little', 'some', 'a lot', 'this one', 'that one',
]);

export function pictureFor(label: string, profile: Profile): PictureRef {
  const l = label.toLowerCase().trim();
  if (BUILTIN.has(l)) return { type: 'builtin', id: l };
  if ((BODY_REGIONS as string[]).includes(l) || Object.values(BODY_DETAIL).some((d) => d.includes(l))) return { type: 'builtin', id: `body:${l}` };
  if (l === 'you' || isPartnerName(label, profile)) return { type: 'person', personId: null, initial: (profile.partnerName || 'Y').charAt(0).toUpperCase() };
  const p = findPerson(label, profile);
  if (p) return { type: 'person', personId: p.id, initial: p.name.charAt(0).toUpperCase() };
  // A picture request carries one generic word. An About-me item goes as its category ("food", "a place");
  // anything else that can't be made generic gets no cloud picture at all (the word still shows).
  const w = pictureWord(l, profile);
  return w ? { type: 'cloud', word: w } : { type: 'builtin', id: 'something else' };
}
