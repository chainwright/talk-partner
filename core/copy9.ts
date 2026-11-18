// The words of phase 9 of the build (18 Nov 2026, the fixes of judge round 8). Same rules as core/copy.ts: plain,
// adult, no praise, no exclamation marks, never "him" or "her" (the name, or "they"). Nothing here is medical advice.
// The lines that name the device ("this computer") stay in core/copy.ts, where the device word is put in.

const days = (n: number) => `${n} day${n === 1 ? '' : 's'}`;

export const P9 = {
  insights: {
    /** Phase 9 (judge round 8, a health P0): pain on fewer than three days is a line of its own, never "Nothing stands out". */
    painSome: (n: number, span: string) => `Pain was chosen or logged on ${days(n)} in the last ${span}.`,
    /** Fixed, under that line: never a model's words, never sent. */
    painSomeAct: 'Ask again today, and tell the doctor or nurse if it is new or still there.',
    wrong: (n: number, d: string) => `"Something's wrong" was pointed to on ${days(n)}: ${d}. Ask what it was.`,
    wrongBase: 'Every "something\'s wrong", on the needs board or on a card, counts.',
  },
  later: {
    /** In the diary's timeline: a care question was left for later (core/later.ts). */
    diary: 'Left for later:',
    /** On the carer's screen after the person tapped "Not now". */
    notNow: (name: string, kept: boolean) => `${name || 'They'} chose "Not now". ${kept ? 'The question is kept on Home, under "Left for later". ' : ''}Come back to it later, and say when.`,
  },
  /** Phase 9: beside a call box while the number is the locale's guess (About them holds none). */
  number: {
    guess: 'Is this your emergency number?',
    change: 'Change it',
  },
  /** Phase 9 (judge round 8, ADV-01-5): the cloud step is slow. */
  wait: {
    slow: (s: number) => `Online help is still working (${s} s). It stops by itself at 20 s.`,
    stop: 'Stop waiting',
    stopped: 'You stopped waiting, so there is no card. The question may already have gone to online help: the privacy count shows it when the answer comes. Ask it as a choice, "This, or that?", or pick a question from a topic.',
  },
  since: {
    toilet: (n: number, d: string) => (n ? `Toilet: ${n} entered (${d}).` : 'Toilet: none entered. That can be a gap: ask the family.'),
    tablets: (n: number, d: string) => (n ? `Tablets taken: logged ${n} time${n === 1 ? '' : 's'} (${d}). The app does not know which tablets or how many.` : 'Tablets taken: none logged. That can mean nobody tapped it.'),
    /** On the visit page, "Since the last visit": the care questions left for later in this time. */
    later: (xs: { q: string; day: string }[]) => `Left for later: ${xs.slice(-5).map((x) => `"${x.q.replace(/"/g, "'")}" (${x.day})`).join(', ')}${xs.length > 5 ? `, and ${xs.length - 5} more` : ''}. Ask about it at the visit if it was not asked again.`,
  },
};
