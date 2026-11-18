// The words of phase 9 of the build (18 Nov 2026, the fixes of judge round 8). Same rules as core/copy.ts: plain,
// adult, no praise, no exclamation marks, never "him" or "her" (the name, or "they"). Nothing here is medical advice.
// The lines that name the device ("this computer") stay in core/copy.ts, where the device word is put in.

export const P9 = {
  later: {
    /** In the diary's timeline: a care question was left for later (core/later.ts). */
    diary: 'Left for later:',
  },
  since: {
    /** On the visit page, "Since the last visit": the care questions left for later in this time. */
    later: (xs: { q: string; day: string }[]) => `Left for later: ${xs.slice(-5).map((x) => `"${x.q.replace(/"/g, "'")}" (${x.day})`).join(', ')}${xs.length > 5 ? `, and ${xs.length - 5} more` : ''}. Ask about it at the visit if it was not asked again.`,
  },
};
