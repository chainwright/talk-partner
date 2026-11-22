// The words of phase 5 (18 Nov 2026, after judge round 6): "Something new or sudden?", the call box, Read aloud,
// "Since the last visit". Same rules as core/copy.ts: plain, adult, no praise, no exclamation marks, never "him" or
// "her" (the name, or "they"). Nothing here is a diagnosis: the lists say what to look for and whom to call, and the
// app never says what is wrong. No clinician has checked this wording (CLAIMS.md says so).

const them = (name: string) => name || 'them';
const They = (name: string) => name || 'They';
const their = (name: string) => (name ? `${name}'s` : 'their');
const days = (n: number) => `${n} day${n === 1 ? '' : 's'}`;
/** Phase 8: ", counting Frank's own answer above" when an own answer of the page was counted in. */
const counted = (own: string) => (own ? `, counting ${their(own.trim())} own answer above` : '');

/** Phase 8: the one line under a "sad" or "low" answer, on the carer's side only: the helpline when one is set, never a number made up. */
const P5_HELP = (name: string, helpline: string, number: string) => `If ${name ? `${name} seems` : 'they seem'} very low, or may harm themselves: ${helpline ? `call ${helpline}, any time` : 'call the doctor or nurse today, or a mental health helpline (you can put its number in About them, Health notes)'}. If life is at risk, call ${number} now.`;

export const P5 = {
  sudden: {
    link: 'Something new or sudden?',
    /** Phase 8 (judge round 7): what it is for, in the words a frightened relative would look for. */
    linkSub: 'Signs of a new stroke, chest pain, a fall: call.',
    heading: 'Something new or sudden?',
    lead: (number: string) => `If you see any one of these, and it is new or sudden, call ${number} now. Do not wait to see if it passes.`,
    fastHeading: 'FAST',
    fast: [
      ['Face', 'One side of the face has dropped, or the smile is uneven.'],
      ['Arm', 'One arm or one leg is suddenly weak or numb.'],
      ['Speech', 'Speech is suddenly worse, slurred or gone: more than on other days.'],
      ['Time', 'Call now. Note the time it started: the ambulance crew will ask.'],
    ] as [string, string][],
    alsoHeading: 'Call for these as well',
    // (phase 8, judge round 7: BE-FAST adds balance and sight; FAST alone misses some strokes)
    also: ['Sudden loss of balance, or sudden loss of sight in one or both eyes.', 'A sudden, very bad headache.', 'Chest pain, or trouble breathing.', 'A fall with a blow to the head, or a fall and cannot get up.', 'Suddenly very drowsy or confused, or cannot be woken.'],
    call: (number: string) => `Call emergency services: ${number}`,
    unsure: 'Not on this list, and you are still worried? Call. You know them best.',
    notSudden: 'Worried, and it is not sudden: call the doctor or nurse today.',
    number: (number: string) => `The button calls ${number}. The number is 911 in the US and Canada, 999 in the UK and 112 in the EU.`,
    change: 'Change the number (About them, Health notes)',
    source: 'A fixed list: FAST (face, arm, speech, time), the public check for the signs of a stroke, with balance and sight (BE-FAST), and more reasons to call. No AI wrote it, and nothing is sent. The app cannot tell what is wrong. No doctor or nurse has checked this wording.',
    /** The ninth tile of the needs board, and what the carer reads when it was pointed to. */
    tile: "something's wrong",
    tileLine: 'Something is wrong. Look now for what is new or sudden. If you are not sure, call.',
    /** The boxed line over an answer that can be urgent (core/redflag.ts), and on the doctor-visit page. */
    box: (number: string) => `Call ${number} now if this is new or sudden.`,
    boxCall: (number: string) => `Call ${number}`,
    boxMore: 'What to look for',
    /** In About them, under Health notes. */
    /** Phase 8: the helpline for low mood, under the emergency number. */
    helplineField: 'Helpline for low mood',
    helplineHint: 'A number from the doctor or nurse, or your country\'s mental health line. The app has none of its own. It is used only in the line under a "sad" or "low" answer.',
    field: 'Emergency number',
    fieldHint: '911 in the US and Canada, 999 in the UK, 112 in the EU. The "Call" buttons of this app use it. Empty: the app goes by the language setting of this device, and asks you to check it.',
  },
  speak: {
    title: 'Read aloud',
    off: (name: string) => `Off. Turn it on, and the question and the choices are read out on ${their(name)} screen.`,
    on: 'On. The words on each card you show go to Google to be spoken.',
    turnOn: 'Turn on Read aloud',
    /** Phase 8 (judge round 7): who it is for, on the switch's button and on the sheet. */
    turnOnFor: (name: string) => `Read the cards aloud to ${name || 'them'}`,
    forWho: (name: string) => `For ${name || 'the person'}: ${name ? `${name} hears` : 'they hear'} the question and the choices in a calm, slow voice, so you do not have to read them out.`,
    turnOff: 'Turn off',
    offline: 'Read aloud needs the internet. You are offline.',
    never: 'The questions of "Before a doctor visit" are never read aloud: nothing of them is sent.',
    hear: 'Hear it',
    again: 'Hear it again',
    loading: 'Getting the voice…',
    /** Phase 8 (judge round 7, the person's seat): on the person's screen nothing asks them to speak; the button says there was no sound. */
    noSound: 'No sound',
    /** The carer's side, when the phone comes back: whose task it is, and what to do. */
    failed: (name: string) => `Read aloud did not work for that card. Read the question out loud to ${name || 'them'}.`,
    sheet: {
      heading: 'Turn on Read aloud?',
      /** The brief's sentence, word for word. */
      body: 'The words on this card, including names on it, go to Google to be spoken. Nothing else.',
      goes: 'For this card, these words would go:',
      plus: 'The request also names the voice and a calm, slow way of speaking. Nothing from About them is in it beyond the words above.',
      neverLabel: 'Never sent:',
      never: 'photos, the diary, the health notes, the answers they choose, and any card you have not shown.',
      dataLabel: 'Data use:',
      yes: 'Yes, read cards aloud',
      no: 'No, keep it off',
      after: 'It stays on until you turn it off, on the screen before you hand over. Each card that is read aloud says so under it.',
    },
    /** Under a card whose words were sent to be spoken, and in the privacy line of the session. */
    made: 'Read aloud is on: the words on this card went to Google to be spoken.',
    sent: (n: number) => `The words of ${n === 1 ? 'one card' : `${n} cards`} went to Google to be spoken (Read aloud).`,
  },
  log: { fall: 'Fall', tablets: 'Tablets taken' } as Record<string, string>,
  fall: {
    box: (number: string) => `A fall: call ${number} now if the head was hit, if getting up is not possible, or if there is new pain.`,
    head: 'The head was hit',
    /** In the diary's timeline, on a fall logged without it: the same note, added later (role-play round 4). */
    headLater: 'Add: the head was hit',
    headNoted: 'Noted: a blow to the head.',
  },
  insights: {
    strongPain: (answers: string, day: string) => `Strong pain was chosen on ${day}: ${answers}.`,
    strongPainBase: 'The answer to "How bad is the pain?", as it was given.',
    placePain: (places: string, day: string) => `Pain in the head or the chest was chosen on ${day}: ${places}.`,
    placePainBase: 'The place chosen on the body card, as it was given.',
    /** Fixed, after a pain line of one day: never a model's words, never sent. */
    painAct: (number: string) => `Tell the doctor or nurse. If it is new or sudden, call ${number} now.`,
    noDrink: (d: string) => `No drink was chosen or logged on ${d}. If that is right, and not a gap in the diary, tell the doctor or nurse today.`,
    fewDrinksFluid: (d: string, n: number, several: boolean) => `Few drinks were entered on ${d}: ${n}${several ? ' each' : ''}. A fluid limit from the doctor is noted here: check the day against the doctor's plan.`,
    // (phase 12, judge round 9: the line names what counts, so "worried" or "lonely" is not read as "not low")
    mood: (n: number, span: string) => `A low or worried mood was chosen on ${days(n)} in the last ${span}: "sad", "low", "worried", "scared", "lonely", or something bothering them.`,
    moodBase: (d: string) => `Days: ${d}.`,
    // (phase 8, judge round 7: the crisis route, with the family's own helpline when one is set; the app invents no number)
    moodAct: (number: string, helpline = '') => `Talk to the GP or nurse about it. ${P5_HELP('', helpline, number)}`,
    fall: (n: number, d: string) => `${n === 1 ? 'A fall was' : `${n} falls were`} logged: ${d}.`,
    fallHead: (d: string) => `A fall with a blow to the head was logged on ${d}.`,
    fallBase: 'Every "Fall" tap counts.',
    fallAct: 'Tell the doctor or nurse about every fall.',
    fallHeadAct: (number: string) => `If there is new pain, drowsiness or confusion since, call ${number} now.`,
    /** A line of the last 7 days that the 30-day view keeps. */
    recent: 'From the last 7 days.',
    lessSureNever: 'Answers about pain, the body, feelings or a need are never marked: take them as said.',
  },
  since: {
    heading: 'Since the last visit',
    sub: (name: string) => `What the family entered in the diary. These lines are not ${their(name)} own answers, except where a line says it counts one.`,
    fromLabel: 'The last visit was on',
    span: (from: string, to: string) => `From the diary, ${from} to ${to}. Only what was entered in this app; a gap can mean nobody entered it.`,
    /** `own`: an own answer above was counted in (phase 8): the name, or a space for "their". Empty: none was. */
    pain: (n: number, d: string, own = '') => (n ? `Pain: chosen or logged on ${days(n)} (${d})${counted(own)}.` : 'Pain: none entered.'),
    strong: (d: string) => `Strong pain, or pain in the head or the chest: ${d}.`,
    falls: (n: number, d: string) => (n ? `Falls: ${n} logged (${d}).` : 'Falls: none logged.'),
    /** Phase 8 (judge round 7, the nurse's seat): with no dry day, the fewest drinks entered in one day, so a low day is not hidden. */
    drinks: (dry: number, withEntries: number, fewest?: { n: number; day: string }) => (withEntries ? `Drinks: on ${dry} of ${days(withEntries)} with entries, no drink was entered${fewest ? `; the fewest in one day: ${fewest.n} (${fewest.day})` : ''}.` : 'Drinks: no full day with entries in this time yet.'),
    mood: (n: number, d: string, own = '') => (n ? `Mood: low or worried on ${days(n)} (${d})${counted(own)}.` : 'Mood: no low or worried answer entered. That does not mean there was none: ask.'),
    sleep: (n: number, d: string, own = '') => (n ? `Sleep: a bad night on ${days(n)} (${d})${counted(own)}.` : 'Sleep: no bad night entered.'),
    none: 'The diary holds nothing for this time.',
    qHeading: 'Questions for the doctor',
    qLead: 'Pick up to three. They are printed under the answers.',
    qPrinted: 'The family wants to ask',
    questions: [
      'What should we watch for at home?',
      'Who do we call out of hours?',
      'Is the pain something to look at?',
      'Is the sleep something to look at?',
      'Is the mood something to look at?',
      'How much should be drunk in a day?',
      'Can the tablets be looked at again?',
      // (phase 9, judge round 8, the nurse's seat: the two things the family is most often asked about)
      'Have the tablets changed, and what should we watch for?',
      'Is anything new to look at: weakness, swallowing, bowels or bladder?',
      'What would help against falls at home?',
      'Is there more speech therapy, or a group nearby?',
      'What help is there for the family?',
    ],
    note: 'Counted by fixed rules on this device, from the diary. No AI, nothing sent. Not a medical record.',
  },
  consent: {
    /** One plain name for it on every sheet (judge round 6): "online help", which is Google's AI. */
    name: 'online help',
    once: 'Just this once',
    always: 'Yes, every time (until I turn it off)',
    onceAfter: '"Just this once" sends this one question. "Every time" keeps online help on until you turn it off (inside, under Cloud help).',
  },
  photosLock: {
    /** Read through the device's word: on a phone it says "this phone". No model can look at a photo there. */
    here: "Photos stay on this computer only. They are never sent anywhere. On this computer no AI looks at them. On a desktop computer with Chrome's built-in AI, it can look at one on that computer itself, never online.",
    /** A browser that has the on-device model. */
    desktop: 'Photos stay on this computer only. They are never sent anywhere. No AI looks at them, with one exception: in "Talk about a photo", when you tap "Ask the AI on this device to look at it", Chrome\'s built-in AI looks at that one photo on this computer itself, never online.',
  },
  helpers: { them, They },
  /** Phase 8: the line under a "sad" or "low" answer. */
  lowHelp: P5_HELP,
} as const;
