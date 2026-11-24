// The words of phase 12 (22 Nov 2026, after judge round 9): the person's crisis choice, "I can't go on", and what the
// carer reads after it. Same rules as core/copy.ts: plain, adult, no praise, no exclamation marks, never "him" or
// "her" (the name, or "they"). Nothing here is a diagnosis.
//
// The health worst case, line by line: no sentence here may let a carer put it off, play it down, or leave the person
// alone. So: take it seriously every time; stay; the emergency number first if there is danger now; otherwise the
// crisis line or the doctor now, not later; a "no" to the question does not end it; tell the doctor or nurse today
// even if things seem calmer. Written from public suicide-prevention advice (stay with the person, ask directly,
// asking does not put the idea in their head, remove the means, get help now). No clinician has checked it, and the
// screen says so.

const them = (name: string) => name || 'them';
const They = (name: string) => name || 'They';
const their = (name: string) => (name ? `${name}'s` : 'their');

export const P12 = {
  crisis: {
    /** The choice on the person's feelings card (the third page). A word tile, no cartoon. */
    label: "I can't go on",
    /** The boxed line over the carer's answer screen, with the call buttons. */
    box: (name: string) => `${They(name)} chose "I can't go on". Take it seriously. Stay with ${them(name)} now.`,
    open: 'What to do now',
    /** On the person's screen after the check: the person is thanked for saying it. */
    thanks: 'Thank you for telling me.',
    /** The end line of the conversation tree (core/tree.ts). */
    end: 'Take it seriously. Stay with {them} now, and follow the red box.',
    heading: (name: string) => `Stay with ${them(name)}. Get help now.`,
    lead: (name: string) => `${They(name)} chose "I can't go on". Take it seriously, every time, even if you are not sure what it means. Do not wait to see if it passes.`,
    stay: (name: string) => `Stay with ${them(name)}. Do not leave ${them(name)} alone now.`,
    danger: (name: string, number: string) => `If ${name ? `${name} has` : 'they have'} harmed themselves, or may do it now: call ${number} now.`,
    line: (name: string, line: string) => `Otherwise call ${line} now, a crisis line, with ${them(name)} beside you.`,
    noLine: (name: string) => `Otherwise call ${their(name)} doctor or nurse now, or your local crisis line. You can put its number in About them, Health notes.`,
    ask: (name: string) => `Ask simple yes or no questions, slowly, and wait: "Are you thinking of hurting yourself?" Asking does not put the idea in ${their(name)} head.`,
    no: 'A "no" does not end it: stay near, and still make the call.',
    means: 'If you can do it safely, put tablets, knives and cords out of reach.',
    tell: (name: string) => `Tell ${their(name)} doctor or nurse today, even if ${name ? `${name} seems` : 'they seem'} calmer.`,
    lineGuess: 'Is this the crisis line where you live?',
    callLine: (line: string) => `Call ${line} (crisis line)`,
    source: 'A fixed list, written from public suicide-prevention advice. No AI wrote it, and nothing is sent. The app cannot tell what is wrong. No doctor or nurse has checked this wording.',
    /** The week's line (core/insights.ts) and the handover note. */
    insight: (d: string) => `"I can't go on" was chosen on ${d}.`,
    insightBase: 'Every time it was chosen on the feelings card.',
    insightAct: (number: string, line: string) => `Talk to the doctor or nurse today. If life may be at risk, call ${number} now${line ? `, or ${line} (a crisis line)` : ''}.`,
    /** Phase 13 (judge round 10, the nurse's seat): its own first line on the visit page, never only "Mood: low". */
    since: (times: string) => `Said "I can't go on": ${times} (the safety screen was shown). Tell the doctor.`,
    handover: (times: string, number: string) => `"I can't go on" was chosen (${times}). Stay near, and ask how they are. If life may be at risk, call ${number} now. Tell the doctor or nurse today.`,
  },
};
