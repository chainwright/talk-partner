// The words of phase 16 (the sponsor's AI as the first action on the first screen): "Ask in your own words". Same
// rules as core/copy.ts: plain, adult, no exclamation marks, never "him" or "her" (the name, or "them"), no product
// names on the carer's screens ("Google's AI" is the cloud model, "Chrome's own AI" the on-device one). Nothing here
// is a diagnosis.


export type OwnGuardKind = 'care' | 'red' | 'crisis';
export type OwnFallbackWhy = 'no' | 'offline' | 'check' | 'failed' | 'none';

export const P16 = {
  own: {
    // (phase 17, judge round 12, the cold 10-second test 3/5: "Make the choices: who chooses?")
    heading: 'Type your question. We make picture answers.',
    /** The field's example: an open question, the kind the rules cannot turn into choices and the AI can. */
    field: 'What would you like for lunch?',
    label: 'Your question, as you would say it',
    /** One line at 360 px (the name would wrap it): the card screen's button says whom they are for. */
    make: 'Make picture answers',
    /** One line under the button: what happens to the words, by where the AI runs here (core/simple.ts, aiPlace). */
    where: {
      device: "Chrome's own AI on this computer makes them. Nothing is sent.",
      // (phase 17: App Check starts when the field gets the cursor, so the line says so; no word of the question goes)
      ask: "Google's AI makes them, online, after your yes. Google checks this browser first; your words wait for the yes.",
      cloudOn: "Google's AI makes them, online (online help is on). Google checks this browser first.",
      offline: "You are offline: the app's rules make what they can from your words.",
      none: "This copy has no AI set up: the app's rules make what they can from your words.",
      checking: 'The app is checking where its AI can run here.',
    } as Record<string, string>,
    /** Under the "where" line, always: what never goes to an AI. */
    never: "Pain, the body, warning signs: the app's fixed rules answer, never an AI.",
    topicsHeading: 'Or pick a topic',
  },
  /** The line over a card the rules made because the words were about care, a warning sign or a crisis. */
  guard: {
    care: "This is about the body, a need or feelings, so the app's rules made this card. Your words did not go to any AI.",
    red: "This may be a warning sign, so the app's rules made this card. Your words did not go to any AI.",
    crisis: "This may be a crisis, so the app's rules answer it. Your words did not go to any AI.",
  } as Record<OwnGuardKind, string>,
  /** Over the rules' card for crisis words: the call buttons and "What to do now" stand under it (web/src/phase5.ts, ownCrisisBox). */
  crisisBox: 'If they may harm themselves, or have: stay with them and call now. Take it seriously, every time.',
  /** The label of the rules' best card when the AI could not help. Kept word for word (the brief, tests/unit/phase16.test.ts). */
  rulesLabel: "Made by the app's rules (no AI)",
  fallback: {
    why: {
      no: 'You said no to online help, so nothing was sent.',
      offline: 'You are offline, so nothing was sent.',
      check: 'Online help could not check this browser, so nothing was sent.',
      failed: 'Online help gave no card this time.',
      none: 'There is no AI set up on this copy, so nothing was sent.',
    } as Record<OwnFallbackWhy, string>,
    /** The original question may have left: never "nothing was sent" then. */
    maybe: 'Your question may have reached Google, and no card came back.',
    sent: 'Your question went to Google, and its answer could not be used.',
    lead: (asked: string) => `For "${asked}" the app's rules picked the nearest ready question instead.`,
    same: (asked: string) => `For "${asked}" the app's rules made this card.`,
  },
};
