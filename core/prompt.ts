// Prompts and the JSON schema. Rule 6: the model's job is small (topic + kind + <=3 choices); code does the rest.
// The device prompt is the validated v7 prompt (validation/run_nano_v7.py) plus the run 8-10 wording on axis/overlap.

import type { Profile } from './types';

export const SYSTEM_PROMPT = `You help a family member talk with an adult who has aphasia after a stroke. Intelligence is intact; words are hard.
Give the KEY IDEA and up to 3 short answer options the person can point at. Return JSON:
- "topic": 1-3 plain words naming what is asked (e.g. "dinner", "therapy today", "call"). No punctuation.
- "kind": "feeling" if the question asks how something felt, was or is going (opinion/mood/experience); "yesno" if it can only be answered yes or no; otherwise "choice".
- "choices": up to 3 options, 1-3 words each, that DIRECTLY answer the question, as words the person would point at.
  Use the ABOUT lists when they fit; never invent names. For "feeling" use evaluative words (good, hard, okay...). For "yesno" use ["yes","no"].
  Each option must be a possible answer to exactly this question (a holiday question gets holiday places, not local errands).
  All options sit on one axis and do not overlap. Never use a mood word as an option for a what/which question.
- "options": ONLY when the question asks them to choose between things it names ("X or Y?"): copy those options out of
  the question, exact short phrases in the question's own words, 1-4 words each, full names kept ("Country Life", not
  "Life"), without question words ("do you want", "would you rather", "will I") and without time words that apply to
  both. Otherwise [].
Never answer for the person, never quiz, never praise.

Examples:
Partner asks: What do you want for dinner?
{"topic":"dinner","kind":"choice","choices":["chicken","fish","soup"]}
Partner asks: How was therapy today?
{"topic":"therapy today","kind":"feeling","choices":["good","hard","okay"]}
Partner asks: Do you need the toilet?
{"topic":"toilet","kind":"yesno","choices":["yes","no"],"options":[]}
Partner asks: Shall we walk to the shop, or would you rather stay home this afternoon?
{"topic":"this afternoon","kind":"choice","choices":["walk to the shop","stay home"],"options":["walk to the shop","stay home"]}
Partner asks: Do you want the red mug or the big blue cup?
{"topic":"mug","kind":"choice","choices":["red mug","big blue cup"],"options":["red mug","big blue cup"]}
Partner asks: Why are you upset?
{"topic":"upset","kind":"choice","choices":["pain","family","speech"]}
Partner asks: How much pain do you have right now?
{"topic":"pain now","kind":"choice","choices":["a little","some","a lot"]}
Partner asks: Which newspaper do you want?
{"topic":"newspaper","kind":"choice","choices":["local paper","national paper"]}
(Bad: ["news","quiz shows","films"] — those are TV, not newspapers. Use an ABOUT list only when it is the same kind of thing as the question asks for. Two good options are better than three loose ones.)
Partner asks: What should we do about the dog's walk?
{"topic":"dog walk","kind":"choice","choices":["walk now","walk later","someone else walks"]}
Partner asks: What should we buy for Emma's birthday?
{"topic":"Emma's birthday","kind":"choice","choices":["book","game","clothes"]}
(Options must be different things at the same level: not "doll" next to "toys", not "friends" next to "people".)
Partner asks: Where would you like to go on holiday next year?
{"topic":"holiday","kind":"choice","choices":["seaside","mountains","a city"]}`;

/** The cloud gets no ABOUT block at all, so its instructions do not mention one. */
// (The fixed example name "Emma" is swapped for "Person A" so no real-looking name appears in a cloud request.)
export const CLOUD_SYSTEM_PROMPT = SYSTEM_PROMPT.replace('  Use the ABOUT lists when they fit; never invent names.', '  Never invent names or details. "Person A", "Place A", "Food A", "Show A", "Music A", "Thing A", "Name A" stand for real people and things; keep those labels exactly, and never make up new ones.')
  .replace('Use an ABOUT list only when it is the same kind of thing as the question asks for.', 'Offer only the same kind of thing as the question asks for.')
  .replace(/Emma's birthday/g, "Person A's birthday")
  +`\nOptions must not overlap in meaning, and each must be something a person could point at.`
  +`\nNo negative words in options ("not", "don't"). If the real options can't be known from the question (which of their own clothes, which photo), return fewer options rather than inventing details like colours.`;

export const CARD_SCHEMA = {
  type: 'object',
  properties: {
    topic: { type: 'string' },
    kind: { type: 'string', enum: ['feeling', 'yesno', 'choice'] },
    choices: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 3 },
    options: { type: 'array', items: { type: 'string' }, maxItems: 4 },
  },
  required: ['topic', 'kind', 'choices'],
} as const;

/** The on-device ABOUT block. Built from the IndexedDB profile; only ever passed to the on-device model. */
export function aboutBlock(p: Profile): string {
  const me = p.personName ? ` The person is ${p.personName}.` : '';
  const home = p.people.filter((x) => x.household).map((x) => x.name);
  if (p.partnerName && !home.includes(p.partnerName)) home.unshift(p.partnerName);
  const people = p.people.map((x) => {
    const detail = [x.relation, x.nickname ? `also called ${x.nickname}` : ''].filter(Boolean).join(', ');
    return detail ? `${x.name} (${detail})` : x.name;
  });
  const parts: string[] = [];
  if (people.length) parts.push(`PEOPLE: ${people.join(', ')}.`);
  if (p.foods.length) parts.push(`FOODS: ${p.foods.join(', ')}.`);
  if (p.places.length) parts.push(`PLACES: ${p.places.join(', ')}.`);
  if (p.tv.length) parts.push(`TV: ${p.tv.join(', ')}.`);
  if (p.music.length) parts.push(`MUSIC: ${p.music.join(', ')}.`);
  if (p.other?.length) parts.push(`OTHER: ${p.other.join(', ')}.`);
  if (!parts.length && !p.personName) return '';
  const lives = home.length ? `; ${home.join(' and ')} ${home.length > 1 ? 'live' : 'lives'} with them` : '';
  const asker = p.partnerName ? ` The partner asking is ${p.partnerName}.` : '';
  return `ABOUT (kept on this device${lives}):${me}${asker} ${parts.join(' ')}\n`;
}

export function devicePrompt(question: string, p: Profile): string {
  return `${aboutBlock(p)}Partner asks: ${question}`;
}

export function cloudPrompt(strippedQuestion: string): string {
  return `Partner asks: ${strippedQuestion}`;
}
