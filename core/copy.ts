// Every string a person reads, in one place (REBUILD_SPEC §4). Plain words, adult tone, short.
// Rules checked by tests/unit/copy.test.ts: nothing technical on the main screens (no mode names, no "Firebase",
// no "placeholder", no rule numbers), no exclamation marks anywhere, and every "never sent" claim is literally true
// of the payloads the core builds. The technical words live only in `consent`, `how` and `judge`.
//
// Shared by every client (web today; Android and iOS read the same strings), so this file has no DOM.

const COPY = {
  app: {
    name: 'Talk Partner',
    tagline: 'Turn your question into big written choices they can point to.',
    sample: 'Sample family: made up (Frank, and Carol asking).',
    nav: { about: (name: string) => (name ? `About ${name}` : 'About me'), cloud: 'Cloud help', how: 'How this works', judge: 'Judge mode', home: 'Back' },
  },

  status: {
    ready: 'Ready on this computer.',
    notDownloaded: 'One-time setup: download the private helper (several GB, once).',
    download: 'Download',
    downloading: (pct: string) => `Downloading the private helper${pct}. Simple questions work meanwhile.`,
    warming: 'Getting ready. About 20 seconds the first time.',
    unavailable: "This computer can't run the private helper. Yes/no, either-or and pain questions still work.",
    unavailableCloudOff: 'Open questions need cloud help.',
    unavailableCloudOn: 'Open questions use cloud help.',
    noConfig: 'This copy of the app is not set up yet (no project settings).',
    deviceReason: 'The private helper runs on desktop Chrome and needs free disk space and memory. Phones, tablets and other browsers use cloud help instead.',
  },

  ask: {
    placeholder: "Ask what you'd normally ask…",
    make: 'Make card',
    making: 'Making…',
    label: 'Your question',
  },

  card: {
    sayThis: 'Say this:',
    tip: 'Point to each choice as you read it. Then wait.',
    waiting: (clock: string) => `Waiting ${clock}. Give time; there's no rush.`,
    show: 'Show to person',
    less: 'Less support',
    lessOn: 'Just ask normally:',
    lessOff: 'Show choices again',
    next: 'Next',
    nextSecond: 'Next: second question',
    nextWhere: 'Next: where exactly',
    nextMore: 'Next: more choices',
    recap: 'Recap',
    chose: (label: string) => `Chose "${label}" and confirmed it.`,
    choseEscape: (label: string) => `They chose "${label}". Ask them to show you, or write it down together.`,
    changed: 'They want to change. The choices are back.',
    justAsk: 'Just ask it normally and give time.',
  },

  badge: {
    device: 'On this computer',
    cloud: 'Cloud help (question only)',
    offline: 'Ran on this computer (offline)',
    code: 'No AI needed',
    none: 'No card',
  },

  blocked: {
    cloudCouldTry: 'Cloud help could try, using the question only.',
    showWouldSend: 'Show what would be sent',
    turnOn: 'Turn on cloud help',
  },

  memory: {
    line: 'This one asks them to remember. Try saying it instead:',
    override: "I really don't know the answer: make a card",
    overrideNote: 'Only things from About me are on this card; nothing is made up.',
    overrideNone: 'Nothing in About me fits this one, so there is no card. Just ask it normally and give time.',
  },

  safety: 'Not for emergencies. For sudden or severe pain, call your emergency number.',
  footer: 'Based on Supported Conversation for Adults with Aphasia (SCA) principles. Not a therapy, not a diagnosis.',

  person: {
    so: (label: string) => `So: ${label}. Right?`,
    yes: 'yes',
    change: 'change',
    recapHeading: 'So',
    recapLine: 'So let me make sure I understand:',
    recapEmpty: 'Nothing answered yet.',
    exit: 'Back to the partner screen (press and hold)',
  },

  about: {
    heading: (name: string) => (name ? `About ${name}` : 'About me'),
    theirName: 'Their name',
    yourName: "Your name (shows as 'you' on cards)",
    people: 'People',
    person: 'Person',
    name: 'Name',
    relation: 'Relation',
    livesHere: 'Lives here',
    photo: 'Photo',
    addPhoto: 'Add photo',
    removePhoto: 'Remove photo',
    nickname: 'Nickname (optional)',
    addPerson: 'Add a person',
    remove: 'Remove',
    foods: 'Foods',
    places: 'Places',
    tv: 'TV',
    music: 'Music',
    other: 'Other',
    onePerLine: 'One per line',
    note: 'Saved only in this browser on this computer. Only the private helper on this computer reads it. It is never sent anywhere.',
    nudge: (name: string) => `Fill this in together with ${name || 'them'} if you can.`,
    saved: 'Saved on this computer.',
    deleteAll: 'Delete everything on this computer',
    deleteConfirm: 'Delete the About me lists, photos, settings and cloud help consent from this computer?',
    done: 'Done',
  },

  privacy: {
    cloudOff: 'Your questions and About me lists stay on this computer.',
    neverSent: 'Never sent: your About me lists, photos and who lives at home.',
    /** Each item here is checked by a test against every payload the core can build. */
    neverSentItems: ['About me lists', 'photos', 'who lives at home'] as const,
  },

  sent: {
    heading: 'What was sent',
    sentFor: 'Sent for this card:',
    notUsed: "Sent for this card (the cloud's answer wasn't used):",
    nothing: 'Nothing sent for this card.',
    notSent: 'Not sent. If cloud help were on, it would get only this:',
    swaps: 'Swapped before sending (only you see this):',
  },

  welcome: {
    heading: 'Talk Partner',
    what: 'You ask what you would normally ask. The app turns it into a card with a keyword and two big choices the person can point to, with a way out every time, and gives you the line to say.',
    local: 'Everything runs on this computer.',
    cloudOff: 'Cloud help is off. You can turn it on later.',
    setup: 'Set up About me',
    sample: 'Try it with a sample family',
    cantRun: "This computer can't run the private helper.",
  },

  // The consent screen may name the services, because the partner is deciding whether to use them.
  consent: {
    heading: 'Cloud help',
    intro: 'Cloud help is for open questions when the private helper on this computer is missing, or when its card is weak.',
    whatHeading: 'What is sent',
    what: "When the private helper can't make a good card, cloud help sends the question you typed to Google's Gemini (through Firebase). Before it's sent, names, places, foods and other words from About me are swapped for labels like \"Person A\". Anything else you type is sent as written, so leave out health details or names you don't want sent.",
    exampleHeading: 'Your last question would be sent like this:',
    exampleNone: 'Type a question first and this shows exactly what would be sent.',
    whoHeading: 'Who receives it',
    who: "Google's Gemini API, through Firebase AI Logic, on the free tier.",
    neverHeading: 'Never sent',
    termsHeading: 'Data use',
    terms: 'On the free tier, Google may use what is sent to improve its products (Gemini API Additional Terms, in force since 23 March 2026). The paid tier does not.',
    termsLink: 'https://ai.google.dev/gemini-api/terms',
    termsLinkText: 'Read the terms',
    checkbox: 'I understand. Turn on cloud help.',
    turnOn: 'Turn on cloud help',
    turnOff: 'Turn off cloud help',
    isOn: 'Cloud help is on. One tap turns it off.',
    isOff: 'Cloud help is off.',
    pictures: 'Pictures from the cloud are not part of this version: every picture is built in.',
    scope: 'This choice is kept only on this computer. "Delete everything on this computer" also resets it.',
  },

  // Technical words are allowed here: this panel is collapsed on the partner screen and open in judge mode.
  how: {
    heading: 'How this works',
    intro: 'The model only proposes; code decides. Every AI call goes through Firebase AI Logic, and the badge on each card comes from what the SDK reports, never from an assumption.',
    legs: 'The three steps',
    columns: { step: 'step', mode: 'mode', gets: 'gets', why: 'why' },
    legNames: { private: 'private card', stripped: 'stripped card', pictures: 'pictures' },
    scoresHeading: 'Measured results',
    scoresNone: 'No measured scores yet. Two sealed sets of 50 questions run on the real build from 18 November; the numbers go here with the date and commit.',
    traceHeading: 'Where each step ran for this card',
    tallyHeading: 'This session',
    tally: (n: { device: number; cloud: number; code: number; failed: number }) =>
      `${n.code} with no AI, ${n.device} on this computer, ${n.cloud} with cloud help, ${n.failed} step failures.`,
    steps: { private: 'Private step (on this computer)', stripped: 'Cloud step (question only)', code: 'Rules in code' },
    ran: { 'on-device': 'ran on this computer', 'in-cloud': 'ran in the cloud', skipped: 'did not run', failed: 'failed' },
    used: 'used for this card',
  },

  judge: {
    label: 'Judge mode',
    intro: 'A made-up family, one-tap questions of each kind, and a line per card saying where each step ran.',
    noDevice: "This browser has no private helper, so the private step shows as \"did not run\" on every card. Cloud help can make the open cards: it gets the question only, and the sample family is made up.",
    exit: 'Leave judge mode',
    receipt: {
      heading: 'Privacy receipt',
      summary: (n: { cards: number; cardsLeft: number; bodyBytes: number; questionBytes: number; namesWithheld: number; otherWithheld: number; leaksFound: number; photosFound: number; offlineRuns: number }) =>
        `${n.cards} card${n.cards === 1 ? '' : 's'} this session. Left this computer: ${n.bodyBytes} bytes in ${n.cardsLeft} request${n.cardsLeft === 1 ? '' : 's'} (${n.questionBytes} bytes of question text). ` +
        `Withheld before sending: ${n.namesWithheld} name${n.namesWithheld === 1 ? '' : 's'}, ${n.otherWithheld} other About me word${n.otherWithheld === 1 ? '' : 's'}. ` +
        `Checked after sending: ${n.leaksFound} About me word${n.leaksFound === 1 ? '' : 's'} and ${n.photosFound} photo${n.photosFound === 1 ? '' : 's'} in the sent text.` +
        (n.offlineRuns ? ` ${n.offlineRuns} cloud step${n.offlineRuns === 1 ? '' : 's'} ran on this computer instead (cloud unreachable): nothing left.` : ''),
      columns: { card: 'card', left: 'left this computer', bytes: 'bytes (question)', withheld: 'withheld', check: 'checked after' },
      leftYes: 'yes, cloud answered',
      leftNo: 'nothing',
      leftOffline: 'nothing (ran here, offline)',
      withheld: (names: number, other: number) => `${names} name${names === 1 ? '' : 's'}, ${other} other`,
      kept: 'whole question kept here',
      checkOk: '0 About me words, no photo',
      checkBad: (leaks: number, photo: boolean) => `${leaks} About me word${leaks === 1 ? '' : 's'}${photo ? ', photo bytes' : ''}`,
      how: 'How this is counted: the bytes are the UTF-8 length of the request body this app built for the cloud step (fixed instructions, the schema and the swapped question), kept only when the SDK reported that the cloud answered; a card where nothing left counts 0. The body is in the export, so the count can be checked by hand. Not counted: the SDK\'s transport around it (headers, the App Check token), which carries no family data. "Withheld" counts the About me words swapped for labels such as "Person A". "Checked after" searches the sent text for About me words and photo bytes once more, after the fact.',
      exportButton: 'Export receipt',
      exportName: 'talk-partner-privacy-receipt.json',
    },
  },

  // Hidden trial timer (#/trial) for the pad-vs-card trial in devlog/TRIAL_PROTOCOL.md. Plain words, nothing sent.
  trial: {
    heading: 'Trial timer',
    intro: 'For the timed pad-versus-card trial. Times are kept only in this browser and exported as a file by hand; nothing is sent anywhere. Run it on a second device so the partner screen is not touched.',
    pair: 'Pair',
    condition: 'Condition',
    pad: 'pad and marker',
    card: 'Talk Partner card',
    set: 'Question set',
    question: 'Question number',
    note: 'Note for the next entry (optional)',
    asked: 'Asked (start)',
    confirmed: 'Confirmed (stop)',
    viaEscape: 'Confirmed via the way out (stop)',
    guessed: 'Partner guessed (stop)',
    gaveUp: 'Gave up (stop)',
    running: (clock: string) => `Running ${clock}`,
    idle: 'Not running. Press Asked the moment the question has been asked.',
    undo: 'Remove last entry',
    exportCsv: 'Export CSV',
    clear: 'Clear all entries',
    clearConfirm: 'Delete every trial entry from this browser?',
    logHeading: 'Entries',
    columns: { pair: 'pair', condition: 'condition', set: 'set', q: 'q', seconds: 'seconds', outcome: 'outcome', note: 'note' },
    outcomes: { confirmed: 'confirmed', escape: 'via way out', guess: 'guessed', abandoned: 'gave up' },
    empty: 'No entries yet.',
    exportName: 'talk-partner-trial.csv',
  },

  // Partner-screen notes and blocked lines written by the card pipeline.
  notes: {
    twoQuestions: 'Two questions: showing the first. "Next" shows the second.',
    deviceFailed: (msg: string) => `The private helper failed on this one: ${msg}`,
    optionsCopied: 'Options copied from the question by the on-device model.',
    optionsCodePair: 'The on-device options did not pass the check; the options were read from the question in code.',
    optionsNeither: 'The on-device options did not pass the check, and the pair read from the question did not either.',
    optionsFailed: 'The on-device options did not pass the check.',
    completedFrom: (source: string) => `Choices completed from ${source}.`,
    cloudWouldCheckOff: 'The cloud would check this card, but cloud help is off. Device card kept.',
    cloudWouldCheckUnconfigured: 'The cloud would check this card, but cloud help is not configured on this copy. Device card kept.',
    leak: 'Not sent: the question still held an About me word after stripping. Device card kept.',
    cloudOptionsUnfit: "The cloud's options didn't fit; device card kept.",
    holdUpTwo: 'The real options are not known: hold up two and point to each as you ask.',
    ranOffline: 'Ran on this computer (offline). Nothing was sent.',
    cloudFailed: (msg: string) => `Cloud step failed (${msg}); device card kept.`,
    page: (i: number, n: number, escape: string) => `Page ${i} of ${n}: "${escape}" shows the next ones.`,
    tellPrefix: "Tell, don't test: ",
    memoryBlocked: 'This one asks them to remember, so there is no card. Try saying it instead.',
    noChoicesBlocked: 'No good choices came out for this one, so there is no card. Just ask normally and give time.',
    notReadyCloudPossible: "The private helper isn't ready on this computer, so there are no choices for this one.",
    notReadyNoCloud: "The private helper isn't ready on this computer and cloud help is not configured on this copy. Just ask normally.",
    justAsk: (q: string) => `Just ask normally: ${q}`,
    recognition: 'Only things from About me are on this card; nothing is made up.',
    // step trace, plain words
    trace: {
      notNeeded: 'not needed: this card is made by rules alone',
      deviceNotReady: 'the private helper is not ready on this computer',
      deviceGot: 'got the question and the About me lists',
      cloudOff: 'cloud help is off',
      cloudUnconfigured: 'cloud help is not configured on this copy',
      cloudNotNeeded: 'not needed: the card from this computer was good enough',
      cloudLeak: 'not sent: the question still held an About me word',
      cloudGot: 'got the question only, About me words swapped out',
      cloudOffline: 'the cloud was unreachable, so the stripped question ran on this computer',
      codeRan: 'applied the card rules',
    },
  },
} as const;

export { COPY };
export type Copy = typeof COPY;
