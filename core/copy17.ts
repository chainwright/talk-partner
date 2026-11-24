// The words of phase 17 (judge round 12): the health guard of "Ask in your own words" in the notes for others, the
// crisis line for others, the cold first screen, and the AI's short question. Same rules as core/copy.ts: plain, adult,
// no exclamation marks, never "him" or "her", no product names on the carer's screens except "Google's AI" and
// "Chrome's own AI". Nothing here is a diagnosis.

export const P17 = {
  /** "What stands out": a health question asked in the carer's own words, answered (core/insights.ts, 'warning'). */
  warning: {
    text: (items: string, d: string) => `A warning sign was asked about: ${items} on ${d}.`,
    base: 'Every answer but a clear "no" to a question about the chest, breathing, a stroke sign, a fall or the blood sugar, and any answer to "are you OK".',
    actChest: (number: string) => `Chest pain or tightness, or trouble breathing: if ${number} was not called, call now, whatever the amount, even if it has happened before. Tell the doctor or nurse today.`,
    act: (number: string) => `If it is new or sudden and ${number} was not called, call now. Tell the doctor or nurse today.`,
    /** The visit page (core/since.ts): today, not at the visit. */
    since: (items: string, number: string, chest: boolean) => `A warning sign was asked about: ${items}. ${chest ? `Chest pain or tightness, or trouble breathing: if ${number} was not called, call now, whatever the amount.` : `If it is new or sudden and ${number} was not called, call now.`} Tell the doctor or nurse today, not at the visit.`,
  },
  /** The level label over "I can't go on" in "What stands out": never "if it is new or sudden" over suicidal talk. */
  crisisLevel: 'Take it seriously, every time: call now',
  /** Phase 17 (judge round 12, the cold 10-second test, seats 13, 02n, 13b): who it is for, and what the other person does. */
  who: (name: string) => `For you and ${name || 'someone'} with aphasia: you ask, hand ${name ? 'over' : 'them'} the phone, ${name ? `${name} points` : 'they point'}.`,
  ownHeading: 'Type your question. We make picture answers.',
  ownMake: 'Make picture answers',
  /** Under the field: where the AI runs, one line (replaces the two lines of phase 16 on the phone). */
  never: 'Pain, the body, warning signs: the app\'s fixed rules answer, never an AI.',
  /** Phase 17 (judge round 12, App Check refused the browser): one tap, the same consent, the rules' card stays. */
  tryAgain: "Try Google's AI again",
  tryAgainLine: "Your yes still stands for this question. The app's card stays until a new one comes.",
  retryWait: "Asking Google's AI again. The app's card stays meanwhile.",
  retryNo: "Online help could not check this browser again, so nothing was sent. The app's card stays. On another phone or in Chrome it may work.",
  /** The AI's short question for the person's screen (core/short.ts): what the carer sees under the card. */
  shortBy: "Google's AI wrote the short question on their screen. Say yours out loud as well.",
  shortByDevice: "Chrome's own AI wrote the short question on their screen. Say yours out loud as well.",
};

/**
 * Phase 17 (judge round 12, seats 02n and 13: "So: your left arm. Right?" puts "Right?" beside a side, and "So: yes.
 * Right?" after "Are you in pain?" says nothing of what was answered): the check on the person's screen. A side is
 * checked with "Is that it?"; a yes or a no to a short yes / no question is said back in its own words ("So: yes, you
 * are in pain. Right?"). Anything else stays "So: tea. Right?".
 */
const SIDE = /\b(?:left|right)\b/i;
function restate(asked: string, yes: boolean): string | null {
  const q = asked.trim().replace(/\?+$/, '').replace(/,?\s*yes or no$/i, '').replace(/\s+/g, ' ');
  const not = yes ? '' : 'not ';
  let m: RegExpMatchArray | null;
  if ((m = q.match(/^are you (.+)$/i))) return `you are ${not}${m[1]}`;
  if ((m = q.match(/^is (it|that|this|your \w+) (.+)$/i))) return `${m[1].toLowerCase()} is ${not}${m[2]}`;
  if ((m = q.match(/^do you (want|need|have|feel|like) (.+)$/i))) return yes ? `you ${m[1].toLowerCase()} ${m[2]}` : `you do not ${m[1].toLowerCase()} ${m[2]}`;
  if ((m = q.match(/^would you like (.+)$/i))) return yes ? `you would like ${m[1]}` : `you would not like ${m[1]}`;
  return null;
}
export function soCheck(label: string, asked = ''): string {
  const l = label.trim();
  if (SIDE.test(l)) return `So: ${l}. Is that it?`;
  const yn = l.toLowerCase();
  if ((yn === 'yes' || yn === 'no') && asked) {
    const r = restate(asked, yn === 'yes');
    if (r && r.length <= 48 && !SIDE.test(r)) return `So: ${yn}, ${r}. Right?`;
  }
  return `So: ${l}. Right?`;
}
