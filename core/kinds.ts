// Kinds of answer, for the narrowing card (core/narrow.ts). After "something else" the next card must be BROADER and
// DIFFERENT: tea / coffee -> something else -> "something cold / something sweet", never water / juice / milk and
// then hot chocolate / herbal tea (one recorded run of the cloud model did exactly that, 18 Nov 2026:
// devlog/evidence_topics/narrow_cloud-card_localhost.txt). A model cannot be trusted to keep to that, so this file
// holds what the rules need to check it and to stand in for it:
//   - a small word list: single things (tea, soup, the park, a nurse) with the subject they belong to and their kind;
//   - `sameKind`: is a proposed choice one more single thing of the subject that was already refused, or the name of
//     a kind that was refused;
//   - `broader`: the rules' own next choices for a subject, kinds first, then other subjects, minus all that was
//     refused.
// Pure word lists and string checks: no model, nothing personal, the same on every device.

export type Subject = 'drink' | 'food' | 'place' | 'people' | 'activity' | 'feeling' | 'comfort';

interface KindDef {
  /** The choice the person would see for this kind. */
  label: string;
  /** Other wordings of the same kind (a model's "a cold drink", "cold drinks"). */
  also: string[];
  /** Single things of this kind. */
  items: string[];
}

/** Every subject: its kinds in the order the rules offer them, and where to go when the whole subject is refused. */
const SUBJECTS: Record<Subject, { ask: RegExp; kinds: KindDef[]; beyond: string[] }> = {
  drink: {
    ask: /\b(?:drinks?|thirsty|tea|coffee|water|juice|milk|squash|cuppa|brew)\b/i,
    kinds: [
      { label: 'something hot', also: ['hot drink', 'warm drink', 'something warm'], items: ['tea', 'coffee', 'hot chocolate', 'cocoa', 'herbal tea', 'green tea', 'malt drink', 'malted drink', 'hot milk', 'warm milk', 'latte', 'cappuccino', 'decaf'] },
      { label: 'something cold', also: ['cold drink', 'cool drink', 'something cool'], items: ['water', 'juice', 'milk', 'squash', 'orange juice', 'apple juice', 'iced tea', 'iced water', 'cordial', 'milkshake', 'smoothie'] },
      { label: 'something sweet', also: ['sweet drink', 'fizzy drink', 'something fizzy', 'soft drink'], items: ['lemonade', 'cola', 'soda', 'pop', 'fizzy drink', 'ginger ale', 'tonic'] },
    ],
    beyond: ['something to eat', 'a rest', 'help with something'],
  },
  food: {
    ask: /\b(?:hungry|eat|food|breakfast|lunch|dinner|supper|tea time|snack|meal|pudding|dessert)\b/i,
    kinds: [
      { label: 'something sweet', also: ['sweet food', 'a sweet', 'dessert', 'pudding', 'something sugary'], items: ['cake', 'biscuit', 'biscuits', 'chocolate', 'ice cream', 'yoghurt', 'yogurt', 'fruit', 'banana', 'apple', 'custard', 'jelly', 'pie', 'jam'] },
      { label: 'something savoury', also: ['savoury food', 'something salty', 'a savoury snack'], items: ['sandwich', 'toast', 'cheese', 'crisps', 'crackers', 'egg', 'eggs', 'chips', 'sausage', 'bacon'] },
      { label: 'a hot meal', also: ['hot food', 'something hot', 'a meal', 'cooked food', 'a cooked meal'], items: ['soup', 'chicken', 'fish', 'pasta', 'rice', 'potatoes', 'stew', 'pot roast', 'chili', 'curry', 'meat', 'vegetables', 'porridge', 'beans'] },
    ],
    beyond: ['something to drink', 'a rest', 'help with something'],
  },
  place: {
    ask: /\b(?:where|go out|going out|go to|go for|drive|garden|walk|park|shops?|church|outing|trip|visit a)\b/i,
    kinds: [
      { label: 'somewhere outside', also: ['outdoors', 'outside', 'somewhere outdoors', 'fresh air'], items: ['garden', 'park', 'lake', 'beach', 'seaside', 'woods', 'river', 'walk', 'a walk', 'countryside'] },
      { label: 'somewhere indoors', also: ['indoors', 'inside', 'somewhere inside'], items: ['shop', 'shops', 'cafe', 'café', 'church', 'library', 'cinema', 'pub', 'restaurant', 'market', 'club'] },
      { label: 'stay at home', also: ['home', 'at home', 'stay in', 'stay home'], items: ['living room', 'bedroom', 'kitchen', 'the chair', 'the sofa'] },
    ],
    beyond: ['see someone', 'something to do', 'a rest'],
  },
  people: {
    ask: /\b(?:who|whom|call|phone|ring|visitor|visitors|company|someone|somebody)\b/i,
    kinds: [
      { label: 'family', also: ['a family member', 'someone in the family', 'relatives', 'a relative'], items: ['wife', 'husband', 'partner', 'son', 'daughter', 'sister', 'brother', 'grandson', 'granddaughter', 'grandchild', 'grandchildren', 'mother', 'father', 'cousin', 'niece', 'nephew'] },
      { label: 'a friend', also: ['friends', 'a neighbour', 'someone from outside'], items: ['friend', 'neighbour', 'neighbor', 'mate', 'colleague', 'priest', 'minister', 'vicar'] },
      { label: 'someone who helps', also: ['a helper', 'care staff', 'a professional', 'medical staff'], items: ['carer', 'caregiver', 'nurse', 'doctor', 'gp', 'therapist', 'speech therapist', 'physio', 'physiotherapist'] },
    ],
    beyond: ['time alone', 'a phone call', 'a rest'],
  },
  activity: {
    ask: /\b(?:what (?:do|would|shall|should) (?:you|we) (?:want|like)? ?(?:to )?do|watch|tv|telly|television|music|radio|film|news|paper|hobby|hobbies|play|read|game|puzzle|weekend|today)\b/i,
    kinds: [
      { label: 'something to watch', also: ['watch something', 'a screen', 'something on screen'], items: ['tv', 'television', 'telly', 'film', 'the news', 'news', 'a programme', 'sport', 'quiz show', 'a series'] },
      { label: 'something to listen to', also: ['listen to something', 'some sound'], items: ['music', 'radio', 'a song', 'songs', 'an audiobook', 'a podcast', 'the choir'] },
      { label: 'something with the hands', also: ['something to make', 'a quiet activity', 'something quiet'], items: ['the paper', 'newspaper', 'a book', 'puzzle', 'cards', 'a game', 'knitting', 'drawing', 'gardening', 'photos', 'cooking'] },
    ],
    beyond: ['go out', 'see someone', 'a rest'],
  },
  feeling: {
    ask: /\b(?:feel|feeling|feelings|mood|bothering|upset|worried|the matter|on your mind|how are you)\b/i,
    kinds: [
      { label: 'something in my body', also: ['physical', 'how my body feels'], items: ['in pain', 'pain', 'tired', 'sick', 'unwell', 'dizzy', 'hot', 'cold', 'hungry', 'thirsty', 'sore'] },
      { label: 'something about people', also: ['people', 'family', 'someone'], items: ['lonely', 'missing someone', 'angry', 'cross', 'annoyed', 'left out'] },
      { label: 'something about today', also: ['plans', 'today', 'what is happening', 'the day'], items: ['worried', 'bored', 'fed up', 'frustrated', 'sad', 'scared', 'confused'] },
    ],
    beyond: ['some company', 'some quiet', 'help with something'],
  },
  comfort: {
    ask: /\b(?:comfortable|lie down|rest|bed|chair|sleep|nap|too hot|too cold|wash|shower|bath|noisy|curtains|glasses|hearing aid)\b/i,
    kinds: [
      { label: 'warmer or cooler', also: ['the temperature', 'temperature'], items: ['too hot', 'too cold', 'a blanket', 'blanket', 'the window', 'the heating', 'a jumper', 'a fan'] },
      { label: 'a different position', also: ['move me', 'another position', 'sit differently'], items: ['bed', 'the bed', 'chair', 'the chair', 'sofa', 'lie down', 'sit up', 'a pillow', 'pillow', 'a cushion'] },
      { label: 'quiet or dark', also: ['less noise', 'less light', 'peace and quiet'], items: ['curtains', 'the light', 'the tv off', 'quiet', 'a nap', 'sleep'] },
    ],
    beyond: ['food or drink', 'the toilet', 'help with something'],
  },
};

/** When nothing says what the question is about: three wide subjects, then three more. */
const ANY: string[] = ['food or drink', 'my body', 'something to do', 'a person', 'a place', 'a feeling'];

const bare = (s: string) => s.toLowerCase().replace(/[.!?]+$/, '').replace(/^(?:the|a|an|some|my|your|more)\s+/, '').replace(/\s+/g, ' ').trim();
const sing = (s: string) => (s.length > 3 && s.endsWith('s') && !s.endsWith('ss') ? s.slice(0, -1) : s);
const same = (a: string, b: string) => bare(a) === bare(b) || sing(bare(a)) === sing(bare(b));

/** Where a word sits: the kind it names, or the kind it is one thing of. Null for a word the list does not know. */
export function placeOf(word: string, within?: Subject): { subject: Subject; kind: string; as: 'kind' | 'item' } | null {
  const order = within ? [within, ...(Object.keys(SUBJECTS) as Subject[]).filter((s) => s !== within)] : (Object.keys(SUBJECTS) as Subject[]);
  for (const subject of order) {
    for (const k of SUBJECTS[subject].kinds) {
      if (same(word, k.label) || k.also.some((a) => same(word, a))) return { subject, kind: k.label, as: 'kind' };
    }
  }
  for (const subject of order) {
    for (const k of SUBJECTS[subject].kinds) {
      if (k.items.some((i) => same(word, i))) return { subject, kind: k.label, as: 'item' };
    }
  }
  return null;
}

/** What the question is about: the subject most of the refused choices belong to, else the question's own words. */
export function subjectOf(asked: string, rejected: string[]): Subject | null {
  const votes = new Map<Subject, number>();
  for (const r of rejected) {
    const p = placeOf(r);
    if (p) votes.set(p.subject, (votes.get(p.subject) ?? 0) + 1);
  }
  const byAsk = (Object.keys(SUBJECTS) as Subject[]).filter((s) => SUBJECTS[s].ask.test(asked));
  // the question's own words decide between subjects that share a word ("soup" is a drink and a meal)
  const best = [...votes.entries()].sort((a, b) => b[1] - a[1] || Number(byAsk.includes(b[0])) - Number(byAsk.includes(a[0])))[0];
  if (best && (byAsk.length === 0 || byAsk.includes(best[0]) || best[1] >= 2)) return best[0];
  return byAsk[0] ?? null;
}

/** The kinds of `subject` that were refused: named outright, or through one of their things. */
export function refusedKinds(subject: Subject, rejected: string[]): Set<string> {
  const out = new Set<string>();
  for (const r of rejected) {
    const p = placeOf(r, subject);
    if (p && p.subject === subject) out.add(p.kind);
  }
  return out;
}

/**
 * True when `choice` is more of what was already refused: one more single thing of the subject (tea and coffee did
 * not fit, so water, juice and hot chocolate are not broader), or the name of a kind that was refused ("a hot drink"
 * after tea and coffee). A word the list does not know is never called the same kind: the rules judge what they know.
 */
export function sameKind(choice: string, subject: Subject | null, rejected: string[]): boolean {
  if (!subject) return false;
  const p = placeOf(choice, subject);
  if (!p || p.subject !== subject) return false;
  if (p.as === 'item') return true;
  return refusedKinds(subject, rejected).has(p.kind);
}

/**
 * The rules' own next choices: the kinds of the subject that were not refused, then other subjects altogether, minus
 * every label that was already offered. Two or three, or none when the list is used up.
 */
export function broader(asked: string, rejected: string[]): string[] {
  const subject = subjectOf(asked, rejected);
  const gone = rejected.map(bare);
  const free = (label: string) => !gone.includes(bare(label));
  if (!subject) return ANY.filter(free).slice(0, 3);
  const refused = refusedKinds(subject, rejected);
  const S = SUBJECTS[subject];
  // a yes / no question about the subject itself ("Are you hungry?") and neither fitted: it is not this subject
  const whole = rejected.length > 0 && rejected.every((r) => /^(?:yes|no|not sure)$/i.test(r.trim()));
  const kinds = whole ? [] : S.kinds.filter((k) => !refused.has(k.label) && free(k.label) && !k.also.some((a) => !free(a))).map((k) => k.label);
  // kinds of the same subject while two are left; with one left it leads, and the other subjects follow
  const list = kinds.length >= 2 ? kinds : [...kinds, ...S.beyond.filter(free)];
  const out = list.length >= 2 ? list : [...list, ...ANY.filter((a) => free(a) && !list.includes(a))];
  return out.slice(0, 3);
}
