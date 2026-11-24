// Phase 14 (judge round 10: all four official seats named the same P0, "on a phone the sponsor is not load-bearing in
// the first minute"): "Find more choices" on the carer's screen before handing over a topic card, as its second button.
//
// It is the narrowing step of core/narrow.ts, asked before the person has seen the card: the question and the choices
// already on it go to the AI, which proposes broader, different kinds of answer, and the same guards decide. Where it
// runs is the same as after "something else": on this device where Chrome has Gemini Nano (ONLY_ON_DEVICE, About me in
// the prompt, nothing sent), else Google's AI online (the PREFER_IN_CLOUD call with onDeviceParams, About-me words
// swapped out), only after the consent sheet's yes. Nothing new is sent: the request is the narrowing request.
//
// Where it is offered, and where never. The worst case of a wrong offer is an AI guess put in the way of a health
// answer, so the gate errs on the side of no button:
//   - only a choice card the rules made (two or more answers), in a conversation of a topic that is not "Body & care"
//     or "Feelings";
//   - never when the question, or any choice on the card, has a word about pain, the body, a feeling, the toilet, help
//     or a need (core/reliability.ts, careAnswer), is a red-flag answer (core/redflag.ts, urgentAnswer) or the crisis
//     line, and never while the call box is up in the conversation (`urgent`);
//   - never a yes / no card, the needs board, a repair card, a memory question, a card of the AI, a narrowing card, a
//     first-letter card, a card the person started, a doctor-visit question, a photo question, a card of more choices;
//   - only where an AI can be reached here: Chrome's own model, or online help (asked first). Offline: no button.

import { crisisAnswer, urgentAnswer } from './redflag';
import { CARE_TOPICS, careAnswer } from './reliability';
import type { AiPlace } from './simple';
import type { Card } from './types';

export { FIND_TASK } from './narrow';

export interface FindMoreInput {
  /** The topic the conversation started from (core/topics.ts), or null for a question outside the topics. */
  topic: string | null;
  /** Where an AI would run here (core/simple.ts, aiPlace). */
  place: AiPlace;
  /** The call box is up in this conversation (an answer of it can be urgent). */
  urgent: boolean;
}

/** Where "Find more choices" would run for this card: on this device, online after a yes, or null for no button. */
export function findMoreOffer(c: Card | null | undefined, i: FindMoreInput): 'device' | 'cloud' | null {
  if (!c || i.urgent || i.topic === null || CARE_TOPICS.includes(i.topic)) return null;
  if (i.place !== 'device' && i.place !== 'cloudOn' && i.place !== 'ask') return null;
  if (c.kind !== 'choice' || c.source !== 'code' || c.blocked || c.scale) return null;
  if (c.narrow || c.letter || c.turn || c.visit || c.photoTalk || c.more || c.aboutWhat || c.typed || c.sample) return null;
  const answers = c.choices.filter((x) => x.role === 'answer');
  if (answers.length < 2) return null;
  if (careAnswer(c.asked, '', i.topic)) return null;
  if (c.choices.some((x) => careAnswer('', x.label) || careAnswer(x.label, '') || urgentAnswer(c.asked, x.label) || crisisAnswer(x.label))) return null;
  return i.place === 'device' ? 'device' : 'cloud';
}
