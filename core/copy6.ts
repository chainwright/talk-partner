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
  /**
   * The text the carer can share (core/share.ts) and the sheet that shows it first (web/src/phase6.ts). The text is
   * built by rules on the device; it leaves only through the app the carer picks, after the sheet. `device` is
   * "phone", "tablet" or "computer".
   */
  share: {
    family: 'Share with family',
    handover: 'For the next carer',
    handoverSub: 'The last 24 hours as a note you can send.',
    /** The first line of every shared text (the brief's sentence, with the time added). */
    stamp: (when: string) => `Shared from Talk Partner on ${when}. Counted by the app's rules from what was entered here; not a medical record.`,
    /** At the top when a line below carries the call box. */
    call: (number: string, where: string) => `Call ${number} now if this is new or sudden: see ${where} below.`,
    callLine: (number: string) => `Call ${number} now if this is new or sudden.`,
    whereFamily: '"What stands out"',
    whereHandover: 'the lines on pain and falls',
    title: { today: (name: string, day: string) => `${name ? `${name}'s diary` : 'The diary'}, today (${day}).`, week: (name: string, from: string, to: string) => `${name ? `${name}'s diary` : 'The diary'}, the last 7 days (${from} to ${to}).`, month: (name: string, from: string, to: string) => `${name ? `${name}'s diary` : 'The diary'}, the last 30 days (${from} to ${to}).` },
    stands: { week: 'WHAT STANDS OUT (the last 7 days)', month: 'WHAT STANDS OUT (the last 30 days)' } as Record<string, string>,
    standsNone: 'Nothing was entered in this time, so there is nothing to count.',
    from: 'How it was counted:',
    health: 'HEALTH NOTES (as noted in the app by the family; not a medical record)',
    entries: 'ENTRIES BY DAY',
    entriesNone: { today: 'Nothing entered today yet.', week: 'Nothing entered in the last 7 days.', month: 'Nothing entered in the last 30 days.' } as Record<string, string>,
    /** The last lines of every shared text. */
    gap: 'Only what was entered in the app is here. A gap can mean nobody entered it.',
    noAdvice: "This text does not say what to give or what to do. Before changing food, drink or tablets, go by the doctor's plan.",
    // ---- the handover note
    hTitle: (name: string, from: string, to: string) => `For the next carer${name ? `: ${name}` : ''}. The last 24 hours (${from} to ${to}).`,
    hCount: (what: string, n: number, times: string) => `${what}: ${n} entered (${times}).`,
    hDrinks: 'Drinks',
    hFood: 'Food',
    hToilet: 'Toilet',
    hNoDrink: 'Drinks: none entered. If that is right, and not a gap in the diary, tell the doctor or nurse today.',
    hFewDrinks: 'That is few for a day: worth mentioning to the doctor or nurse.',
    hFluid: "A fluid limit from the doctor is noted: go by the doctor's plan.",
    hNoFood: 'Food: none entered. If that is right, and not a gap in the diary, mention it to the doctor or nurse.',
    hNoToilet: 'Toilet: none entered.',
    hPain: (items: string) => `Pain: ${items}.`,
    hPainAsk: 'Ask again on your shift, and take the answer as said.',
    /** Phase 13 (judge round 10, the nurse's and the carer's seats): at the top of the note, above the counts. */
    hSign: (items: string, number: string, unsure: boolean) => `Sudden weakness or numbness: ${items}. If ${number} was not called, call now. Tell the doctor today.${unsure ? ` After a "not sure": check both arms and the smile now; call ${number} if one side drops.` : ''}`,
    /** Phase 17 (judge round 12, health P0 3): a health question typed in "Ask in your own words", answered: at the top, first. */
    hWarn: (items: string, number: string, chest: boolean) => `Warning signs asked about: ${items}. ${chest ? `Chest pain or tightness, or trouble breathing: if ${number} was not called, call now, whatever the amount, even if it has happened before.` : `If it is new or sudden and ${number} was not called, call now.`} Tell the doctor or nurse today.`,
    hWrong: (times: string, number: string) => `Something's wrong: they pointed to "something's wrong" (${times}). Find out what, and if it is new or sudden call ${number} now.`,
    hNoPain: 'Pain: none entered. That does not show there was none: ask, and take the answer as said.',
    hFalls: (n: number, times: string) => `Falls: ${n} logged (${times}).`,
    hFallHead: (times: string) => `With a blow to the head: ${times}.`,
    hNoFalls: 'Falls: none logged.',
    hTablets: (times: string) => `Tablets taken: logged at ${times}. The app does not know which tablets or how many: check before giving any.`,
    /** Phase 9: on every handover note, box ticked or not, when About them notes it. */
    hAlways: 'ALWAYS ON THIS NOTE (it changes what is safe to give)',
    hSwallow: 'Swallowing difficulty is noted: go by the plan from the speech therapist or nurse before giving food or drink.',
    hFluidAlways: "A fluid limit from the doctor is noted: go by the doctor's plan for drinks.",
    hNoTablets: 'Tablets taken: none logged. That can mean nobody tapped it: check before giving any.',
    /** Phase 12 (judge round 9): the care questions left for later and not yet found out, at the top of the note. */
    hOpen: 'STILL OPEN (care questions left for later, not yet found out)',
    hOpenItem: (q: string, when: string, ago: string, pain: boolean, number: string) => `- ${q} (left at ${when}, ${ago}). Ask it again first.${pain ? ` If the pain is new or strong, call the nurse or doctor; if it is sudden or severe, call ${number} now.` : ''}`,
    hNothing: 'Nothing was entered in the last 24 hours. That is a gap in the diary, not a report: ask the family how the day went.',
    usual: (name: string) => `USUAL CHOICES (counted from the answers ${name || 'they'} confirmed; a hint for you, and ${name || 'they'} still choose${name ? 's' : ''} every time)`,
    usualNone: 'Nothing learned yet.',
    usualNever: 'Nothing about pain, the body or feelings is in this list: ask those every time.',
    /** In the privacy line of the session, once a text was handed over or copied. */
    sessionLine: (n: number) => `A text from the diary was handed to an app you picked, or copied, ${n === 1 ? 'once' : `${n} times`} this session, after you saw it. Talk Partner itself sent nothing and kept no copy.`,
    // ---- the sheet
    sheet: {
      heading: { family: 'Share this with family?', handover: 'Share this with the next carer?' } as Record<string, string>,
      /** The brief's sentence; "the phone" follows the device. */
      leaves: (device: string) => `This text leaves the ${device} through the app you pick (message, email). Talk Partner keeps no copy and has no server.`,
      leavesCopy: (device: string) => `This text leaves the ${device} only if you paste it somewhere yourself. Talk Partner keeps no copy and has no server.`,
      exact: 'This is the exact text. Nothing else goes with it.',
      healthBox: 'Include the health notes',
      healthNone: 'No health notes are noted in About them.',
      healthOff: 'The health notes are not in this text, and the lines are counted as if none were noted.',
      healthOn: 'The health notes are in this text, as you see them below.',
      /** Under the box, while it is off and a note that changes what is safe is noted. */
      /** Phase 9: on the handover's sheet, when a swallowing difficulty or a fluid limit is noted. */
      alwaysIn: (what: string) => `Always in this note, box or not: ${what}.`,
      healthWarn: (what: string) => `Noted in About them: ${what}. The person who reads this text will not know it unless you tick the box.`,
      photos: 'Photos never go in.',
      share: 'Share',
      copy: 'Copy',
      copied: 'Copied',
      cancel: 'Cancel',
      close: 'Close',
      /** After Share or Copy. */
      shared: 'Handed to the app you picked. Talk Partner kept no copy.',
      shareFailed: 'Sharing did not start here. Use Copy, then paste the text where you want it.',
      copyFailed: 'Copying is not possible here. Select the text above and copy it yourself.',
      names: 'The text holds what was entered: a name in a question stays as it was asked.',

    },
  },
} as const;
