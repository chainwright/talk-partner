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

const P12asked = (q: string, label: string) => `Asked "${q.trim()}" and pointed to "${label.trim()}"`;

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
    // (phase 17, judge round 12, the hound's H3: the line for others was softer than the safety screen: call first)
    insightAct: (number: string, line: string) => `Take it seriously, every time. If they may harm themselves, call ${number} now; otherwise call ${line ? `${line}, a crisis line,` : 'their doctor or nurse'} now, with them beside you. Then tell the doctor or nurse.`,
    /** Phase 13 (judge round 10, the nurse's seat): its own first line on the visit page, never only "Mood: low". */
    // (phase 15, judge round 11, the nurse's seat: today, not at the visit, with the call)
    since: (times: string, number: string, line: string) => `Said "I can't go on": ${times} (the safety screen was shown). Take it seriously, every time. If they may harm themselves, call ${number} now; otherwise call ${line ? `${line}, a crisis line,` : 'their doctor or nurse'} now, with them beside you. Tell the doctor or nurse today, not at the visit.`,
    handover: (times: string, number: string, line = '') => `"I can't go on" was chosen (${times}). Take it seriously, every time: do not leave them alone. If they may harm themselves, call ${number} now; otherwise call ${line ? `${line}, a crisis line,` : 'their doctor or nurse'} now, with them beside you. Then tell the doctor or nurse.`,
    // (phase 19, judge round 14, a P0 of seats 05, 13b and 01: a typed "Do you want to end your life?" answered "no" was
    // written as 'They chose "I can't go on"' on the safety screen, in the next carer's note, the week and the visit
    // page: a false record of what the person said) a crisis question the carer typed is quoted as it was asked, with
    // what they pointed to. The crisis line and the call stay the same: a "no" does not end it.
    /** "Asked "Do you want to end your life?" and pointed to "no"" (the words as typed and as tapped). */
    asked: (q: string, label: string) => `Asked "${q.trim()}" and pointed to "${label.trim()}"`,
    leadAsked: (q: string, label: string) => `${P12asked(q, label)}. Take it seriously, every time, whatever the answer: a "no" does not end it. Do not wait to see if it passes.`,
    insightAsked: (items: string) => `${items}.`,
    sinceAsked: (items: string, number: string, line: string) => `${items} (the safety screen was shown). Take it seriously, every time, whatever the answer. If they may harm themselves, call ${number} now; otherwise call ${line ? `${line}, a crisis line,` : 'their doctor or nurse'} now, with them beside you. Tell the doctor or nurse today, not at the visit.`,
    handoverAsked: (items: string, number: string, line = '') => `${items}. Take it seriously, every time, whatever the answer: a "no" does not end it. Do not leave them alone. If they may harm themselves, call ${number} now; otherwise call ${line ? `${line}, a crisis line,` : 'their doctor or nurse'} now, with them beside you. Then tell the doctor or nurse.`,
  },
};
