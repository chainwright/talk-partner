// The words of phase 19 (24 Nov 2026, after judge round 14). Same rules as core/copy.ts: plain, adult, no praise, no
// exclamation marks, never "him" or "her" (the name, or "they"). Nothing here is a diagnosis, and no clinician has
// checked this wording.

const They = (name: string) => name || 'They';

export const P19 = {
  /**
   * "Not now" on the person's screen inside a conversation with a red flag (a chest or heart-place pain, a head pain, a
   * yes to weakness or trouble breathing): the carer's line is a red box with the call button, never the calm "Come
   * back to it later, and say when" (judge round 14, the nurse's seat, ADV-13b-3).
   */
  notNowRed: (red: 'chest' | 'head' | 'heart' | 'sign', name: string, number: string) => `${They(name)} chose "Not now". ${red === 'chest' ? 'Chest pain was pointed to' : red === 'head' ? 'Head pain was pointed to' : red === 'heart' ? 'A pain in the upper stomach, the upper back, the jaw or a shoulder was pointed to' : 'There was a yes to weakness, numbness or trouble breathing'}: call ${number} now, whatever the amount. Do not leave it for later.`,
  /**
   * Google's AI answered after the 20 s wait, while the rules' card for the same question was still on the screen: its
   * card takes the place of the stand-in, and the chip says so (judge round 14, seats 02n and 01).
   */
  late: "Google's AI answered after the wait, so its card took the place of the app's rules' card. Made online, after your yes.",
  /** The doctor-visit page (core/visit.ts): under a pointed "yes" to pain, and under a "no" (judge round 14, the SLP's seat, ADV-13-3). */
  visitYes: 'Pointed answer: a yes to pain is taken as a yes. Ask them to show where, and how bad.',
  visitNo: 'Pointed answer: a no to pain can be wrong after a stroke. Watch their face and how they move, and ask again.',
  /** After a word was found by its letters (core/letter.ts, letterEnd): always a next step (judge round 14, seats 05, 13b, 01). */
  letter: {
    thing: (w: string) => `The word is: ${w}. Bring it, or show it, and check with them: "Is this it?"`,
    place: (w: string) => `The word is: ${w}. Ask if they want to go there.`,
    person: (w: string) => `The word is: ${w}. Ask if they want to call or see ${w}.`,
    other: (w: string) => `The word is: ${w}. Ask one more question about it.`,
  },
};
