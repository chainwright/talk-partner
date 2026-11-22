// Which picture a choice gets. Built-in pictographs for fixed words, the person's own photo or initial for names,
// and for a generic word a marker that it has no bundled picture (the tile then shows the word alone). No picture is
// generated anywhere: the picture-generation step this marker was written for was removed on 17 Nov 2026.

import { BODY_DETAIL, BODY_REGIONS, findPerson, isPartnerName } from './rules';
import { pictureWord } from './strip';
import type { PictureRef, Profile } from './types';
import { crisisAnswer } from './redflag';

/** Ids of the bundled pictures (our SVG drawings and, since 20 Nov 2026, pictures made with Gemini; source, date and licence or terms of each in PICTOGRAMS.md). */
export const BUILTIN = new Set([
  'yes', 'no', 'not sure', 'something else', 'someone else', 'somewhere else',
  'good', 'okay', 'bad', 'tasty', 'plain', 'too salty', 'good idea', 'leave it', 'like them', 'unhappy',
  'a little', 'some', 'a lot', 'this one', 'that one',
  // phase 12, 22 Nov 2026: the pain scale's faces, and the person's "I need something" and "I feel…"
  'pain mild', 'pain medium', 'pain strong', 'needs', 'feelings',
  // added 11 Nov 2026
  'listen', 'tea', 'coffee',
  // batch 1, 11 Nov 2026: fixed / meta, feelings, people roles (build spec §3.1)
  'change', 'wait', 'stop', 'write it', 'more',
  'tired', 'worried', 'pain', "something's wrong", 'fall', 'tablets',
  // day 5, 11 Nov 2026: the "we're stuck" repair card ('write it' and 'change' are above)
  'show me', 'draw', 'later', 'change topic',
  // the quick-needs board, 17 Nov 2026
  'toilet', 'drink', 'food', 'too hot', 'too cold', 'call someone',
  // batch 2, 18 Nov 2026 (colour): what the topic questions and their trees offer
  'water', 'juice', 'milk', 'hot drink', 'cold drink', 'snack', 'meal', 'something sweet', 'something savoury', 'hot meal', 'cold meal',
  'bed', 'chair', 'tv', 'music', 'news', 'film', 'radio', 'paper', 'photos', 'now', 'morning', 'afternoon', 'stay in', 'go out',
  'open', 'closed', 'glasses', 'hearing aid', 'company', 'time alone', 'walk', 'garden', 'drive', 'wash', 'exercises', 'quiet', 'just right', 'plans',
  'spouse', 'child', 'sibling', 'grandchild', 'friend', 'neighbour', 'carer', 'nurse', 'doctor', 'speech therapist', 'physio', 'priest', 'family', 'visitor',
  // phase 12, 22 Nov 2026 (judge round 9: "open / closed" showed doors for the curtains, and church a garden door)
  'curtains open', 'curtains closed', 'church',
]);

/** Words that share a pictogram (§2.20: jumper -> sweater, telly -> TV; here the people roles and feelings). */
export const SYNONYM: Record<string, string> = {
  wife: 'spouse', husband: 'spouse', partner: 'spouse', spouse: 'spouse',
  son: 'child', daughter: 'child', child: 'child',
  sister: 'sibling', brother: 'sibling', sibling: 'sibling',
  grandson: 'grandchild', granddaughter: 'grandchild', grandchild: 'grandchild', grandchildren: 'grandchild', grandkids: 'grandchild',
  friend: 'friend', mate: 'friend', pal: 'friend', friends: 'friend',
  neighbour: 'neighbour', neighbor: 'neighbour', neighbours: 'neighbour', neighbors: 'neighbour',
  carer: 'carer', caregiver: 'carer', 'support worker': 'carer', 'home help': 'carer', aide: 'carer',
  nurse: 'nurse', doctor: 'doctor', gp: 'doctor',
  'speech therapist': 'speech therapist', therapist: 'speech therapist', slp: 'speech therapist',
  physio: 'physio', physiotherapist: 'physio',
  priest: 'priest', minister: 'priest', vicar: 'priest', reverend: 'priest', pastor: 'priest',
  family: 'family', visitor: 'visitor', visitors: 'visitor',
  sleepy: 'tired', exhausted: 'tired', 'worn out': 'tired', worried: 'worried', anxious: 'worried', hurts: 'pain', hurting: 'pain', sore: 'pain',
  // the second page of "How are you feeling?" (17 Nov 2026): the frowning face, and the pain picture
  sad: 'bad', 'in pain': 'pain',
  // the three steps of the pain scale (17 Nov 2026; phase 12: three faces, not the bars of an amount)
  'quite bad': 'pain medium', 'very bad': 'pain strong',
  // batch 2 (18 Nov 2026): the words the topic cards and their trees use for a picture that is already drawn
  'this morning': 'morning', 'this afternoon': 'afternoon', 'some time alone': 'time alone', hot: 'too hot', cold: 'too cold',
  television: 'tv', telly: 'tv', newspaper: 'paper', movie: 'film', 'something to eat': 'food', 'something to drink': 'drink',
  'something hot': 'hot drink', 'something cold': 'cold drink', people: 'family', 'a friend': 'friend', 'someone who helps': 'carer',
  'stay at home': 'stay in', 'quiet time': 'quiet', 'some quiet': 'quiet', 'some company': 'company', 'a phone call': 'call someone',
  fine: 'okay', ok: 'okay', alright: 'okay', 'all right': 'okay', 'so-so': 'okay',
  // phase 12: "the curtains" as a thing to change for less light; a chapel or a cathedral is the church picture
  curtains: 'curtains closed', chapel: 'church', cathedral: 'church', 'the church': 'church',
};

/**
 * The picture of a choice. `asked` is the question the card shows, for the one word whose picture depends on it:
 * "open" or "closed" to a question about the curtains is the curtains, not a door (phase 12, judge round 9).
 */
export function pictureFor(label: string, profile: Profile, asked = ''): PictureRef {
  const l = label.toLowerCase().trim();
  if (/^(?:open|closed)$/.test(l) && /\bcurtains?\b/i.test(asked)) return { type: 'builtin', id: `curtains ${l}` };
  // the crisis choice is the words alone, never a cartoon
  if (crisisAnswer(label)) return { type: 'word' };
  // and "a little" on the pain scale is the mild face, not the bar of an amount
  if (l === 'a little' && /\b(?:pain|hurt|hurts|sore)\b/i.test(asked)) return { type: 'builtin', id: 'pain mild' };
  if (BUILTIN.has(l)) return { type: 'builtin', id: l };
  // "your left arm" on the person's card (§2.11) is the "left arm" body picture
  const part = l.replace(/^your\s+/, '');
  if ((BODY_REGIONS as string[]).includes(part) || Object.values(BODY_DETAIL).some((d) => d.includes(part))) return { type: 'builtin', id: `body:${part}` };
  if (l === 'you' || isPartnerName(label, profile)) return { type: 'person', personId: null, initial: (profile.partnerName || 'Y').charAt(0).toUpperCase() };
  const p = findPerson(label, profile);
  if (p) return { type: 'person', personId: p.id, initial: p.name.charAt(0).toUpperCase() };
  // a role word ("the carer", "a neighbour", "your daughter") shares its pictogram with its synonyms
  const bare = l.replace(/^(?:the|a|an|my|your|our|his|her|their)\s+/, '');
  const syn = SYNONYM[l] ?? SYNONYM[bare];
  if (syn && BUILTIN.has(syn)) return { type: 'builtin', id: syn };
  // "your glasses", "the chair", "a hot meal": the picture of the thing itself
  if (BUILTIN.has(bare)) return { type: 'builtin', id: bare };
  // A picture request carries one generic word (§2.20 gate): the label is lower-case as typed, has no digits and
  // holds no About-me term. An About-me item goes as its category ("food", "a place"); a capitalised word (a name
  // the profile doesn't know, a brand, a place) and anything else gets no cloud picture at all: the word alone shows.
  const w = pictureWord(l, profile);
  if (!w) return { type: 'word' };
  if (w === l && (/\p{Lu}/u.test(label) || /\d/.test(label))) return { type: 'word' };
  return { type: 'cloud', word: w };
}
