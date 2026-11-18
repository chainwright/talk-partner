// The words of phase 6 (18 Nov 2026): "See the entries" under a line of "What stands out" and of "Since the last
// visit", and the text the carer can share with the family or the next carer. Same rules as core/copy.ts: plain,
// adult, no praise, no exclamation marks, never "him" or "her". Nothing here is advice: a line says what was entered
// and whom to tell. No clinician has checked this wording (CLAIMS.md says so).

export const P6 = {
  source: {
    see: (n: number) => `See the entries (${n})`,
    hide: 'Hide the entries',
    /** Over the entries of a line about something that is absent. */
    noDrink: 'No drink among these.',
    noFood: 'No food among these.',
    /** Beside an entry that was merged into another one. */
    once: 'counted once with the entry beside it (within 20 minutes)',
    /** An entry of the line that is no longer in the diary (it was undone since). */
    gone: 'An entry behind this line is no longer in the diary.',
  },
} as const;
