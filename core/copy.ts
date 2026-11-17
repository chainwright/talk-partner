// Every string a person reads, in one place (build spec §4). Plain words, adult tone, short.
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
    warming: 'Getting the private helper ready on this computer. The first time after the browser starts can take about half a minute.',
    unavailable: "This computer can't run the private helper. Yes/no, either-or and pain questions still work.",
    unavailableCloudOff: 'Open questions need cloud help.',
    unavailableCloudOn: 'Open questions use cloud help.',
    noConfig: 'This copy has no project settings, so no AI runs here. Yes/no, either-or, feeling, pain and body questions still make cards.',
    deviceReason: 'The private helper runs on desktop Chrome and needs free disk space and memory. Phones, tablets and other browsers use cloud help instead.',
  },

  ask: {
    placeholder: "Ask what you'd normally ask…",
    make: 'Make card',
    making: 'Making…',
    /** Shown in place of the card while it is being made (a model answer takes a few seconds). */
    makingCard: 'Making the card…',
    makingHint: 'A few seconds. Nothing is on their screen yet.',
    label: 'Your question',
  },

  /** The support setting, named by what the person sees (it read backwards as "Support: more (2 choices)"). */
  support: {
    label: 'Choices on a card',
    options: { mild: '3 at a time', more: '2 at a time', most: '2 at a time, larger tiles' },
  },

  card: {
    sayThis: 'Say this:',
    tip: 'Point to each choice as you read it. Then wait.',
    waiting: (clock: string) => `Waiting ${clock}. Give time; there's no rush.`,
    show: 'Show to person',
    /** A quiet line for the partner when this question was answered before; never shown to the person, never a default. */
    lastTime: (when: string, label: string) => `Last time (${when}) they chose "${label}". Ask again all the same: today's answer is theirs.`,
    lastTimeCounts: (counts: string) => `So far: ${counts}.`,
    less: 'Hide the choices',
    lessOn: 'Just ask normally:',
    lessOff: 'Show choices again',
    next: 'Next',
    nextSecond: 'Next: second question',
    nextWhere: 'Next: where exactly',
    nextMore: 'Next: more choices',
    recap: 'Recap',
    chose: (label: string) => `Chose "${label}" and confirmed it.`,
    choseEscape: (label: string) => `They chose "${label}". Ask them to show you, or write it down together.`,
    choseRepair: (label: string) => `They chose "${label}".`,
    changed: 'They want to change. The choices are back.',
    justAsk: 'Just ask it normally and give time.',
    stuck: "We're stuck",
    unstuck: 'Back to the choices',
    /** The one fold on the partner screen: why this card, where each step ran, what was sent, the privacy receipt. */
    made: 'How this card was made',
  },

  // A quiet coaching line for the partner. Only where a rule detected it; never a judgement of the person.
  coach: {
    twoQuestions: 'One thing at a time: showing the first.',
    test: "You know this one: tell, don't test.",
    holdUp: 'The real options are not on the screen: hold two up and point to each as you ask.',
  },

  // The "we're stuck" card. Wording from the Aphasia Institute SCA tip sheet (devlog/DAY2_sources.md): "Ask the person
  // to give clues by gesturing, or pointing to objects, pictures and written key words"; "Encourage the person with
  // aphasia to write down a word or draw if they can"; "give a time when you will return to finish your conversation.
  // Make sure you do return." "Change topic" is ours (the sheet: "Establish a clear general topic first").
  repair: {
    ask: "Let's try another way.",
    headline: 'another way',
    tiles: { showMe: 'show me', writeIt: 'write it', draw: 'draw', later: 'later', changeTopic: 'change topic' },
    note: 'A fixed card for a stuck moment. Three ways to get the message out, and two ways to leave it for now.',
    tip: 'Read the five aloud, pointing to each. Then wait.',
    lines: {
      'show me': 'Say: "Show me." Let them point, gesture, or take you to it.',
      'write it': 'Give them the pad: "Write it, any letters you can."',
      draw: 'Give them the pad: "Draw it."',
      later: 'Say: "Later, then. We will come back to it." And come back.',
      'change topic': 'Say: "Let\'s leave it." Start a new topic, one idea at a time.',
    } as Record<string, string>,
  },

  badge: {
    device: 'On this computer',
    cloud: 'Cloud help (question only)',
    offline: 'Ran on this computer (offline)',
    code: 'No AI needed',
    none: 'No card',
    // The line after the badge, always visible. Read from the card's recorded payload (the receipt's own test), never assumed.
    tail: {
      kept: 'nothing left this computer',
      /** A cloud request that failed after it was handed to the SDK: never claimed as kept. */
      attempted: 'cloud help was asked and failed: the question may have left this computer',
      /** After `kept`, on a card made on this computer that offers About-me entries. */
      personal: (labels: string) => `${labels} from About me`,
      sent: (names: number, other: number) =>
        `the question left this computer, ${names + other ? `${names} name${names === 1 ? '' : 's'} and ${other} other About me word${other === 1 ? '' : 's'} swapped out` : 'no About me words in it'}`,
    },
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
    note: 'Saved only in this browser on this computer. It is never sent anywhere.',
    nudge: (name: string) => `Fill this in together with ${name || 'them'} if you can.`,
    saved: 'Saved on this computer.',
    historyHeading: 'Answers so far',
    historyNote: 'Each answer confirmed with the tick is kept here, on this computer only, so you can see what they chose last time. It is never sent anywhere and never given to a model.',
    historyNoteSample: 'With the sample family the answers are kept only until you leave judge mode.',
    historyEmpty: 'No confirmed answers yet.',
    historyForget: 'Forget these answers',
    historyForgetConfirm: 'Delete the list of confirmed answers from this computer?',
    deleteAll: 'Delete everything on this computer',
    deleteConfirm: 'Delete the About me lists, photos, confirmed answers, settings and cloud help consent from this computer?',
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
    /** Cloud help is on, yet nothing left for this card (the cloud was unreachable or not set up, or the card stayed here). */
    notSentOn: 'Not sent for this card. Cloud help would have got only this:',
    /** The request was handed to the SDK and failed: it may or may not have reached the cloud. */
    attempted: 'Cloud help was asked and no answer came back. If the request left this computer, it held only this:',
    swaps: 'Swapped before sending (only you see this):',
  },

  welcome: {
    heading: 'Talk Partner',
    /** Who this is for and why, in one line, before anything else. */
    who: 'For the family and carers of an adult with aphasia after a stroke: they understand you, but the words to answer will not come.',
    what: 'You ask what you would normally ask. The app turns it into a card with a keyword and two big choices the person can point to, with a way out every time, and gives you the line to say.',
    local: 'Your About me lists and photos stay on this computer.',
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
    termsLink: 'https://aistudio.google.com/docs/terms',
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
    intro: 'The model only proposes; code decides. Every AI call goes through Firebase AI Logic. The two AI badges ("On this computer", "Cloud help") come from what the SDK reports for that call; "No AI needed" and "No card" come from the card rules.',
    legs: 'The three steps',
    columns: { step: 'step', mode: 'mode', gets: 'gets', why: 'why' },
    legNames: { private: 'private card', stripped: 'stripped card', pictures: 'pictures' },
    scoresHeading: 'Measured results',
    scoresNone: 'One measurement so far, and it is ours: 60 questions we wrote and labelled ourselves (16 Nov 2026). 18 of them are open (who, where, what): the choices are not in the question. Rules alone make no card for any of the 18. The helper on this computer made a card matching our label for 16, and 13 of those offered the family\'s own people, places or foods (three runs, the same counts). The other 42 are decided by code with no model; 36 to 38 matched. That is how often the card is the one we meant, not whether it helps anyone. The timed pad-versus-card trial with people (two sealed sets of 10 questions, two or three pairs) has not been run.',
    traceHeading: 'Where each step ran for this card',
    tallyHeading: 'This session',
    tally: (n: { device: number; cloud: number; code: number; none: number; failed: number }) =>
      `${n.code} with no AI, ${n.device} on this computer, ${n.cloud} with cloud help, ${n.none} with no card; ${n.failed} step failure${n.failed === 1 ? '' : 's'}.`,
    /** The same tally in one line, for the judge-mode strip. */
    tallyShort: (n: { device: number; cloud: number; code: number; none: number; failed: number }) =>
      `${n.code} no AI · ${n.device} on this computer · ${n.cloud} cloud help · ${n.none} no card · ${n.failed} failed`,
    steps: { private: 'Private step (on this computer)', stripped: 'Cloud step (question only)', code: 'Rules in code' },
    ran: { 'on-device': 'ran on this computer', 'in-cloud': 'ran in the cloud', skipped: 'did not run', failed: 'failed' },
    used: 'used for this card',
    // "Why this card": built from the values the pipeline worked on, one line in judge mode, collapsed for the partner.
    why: {
      heading: 'Why this card',
      proposed: { private: 'The private step proposed', stripped: 'The cloud step proposed' },
      /** The question-only step when the cloud was unreachable and the SDK ran it on this computer instead. */
      proposedOffline: 'The question-only step (run on this computer, offline) proposed',
      noProposal: 'No model answer reached the rules',
      kept: 'Kept', added: 'Added by code', dropped: 'Dropped', decided: 'Decided by', headline: 'Headline',
      /** Answers that are About-me entries: only a step on this computer can offer them. */
      personal: 'From About me (never sent)',
      options: 'either-or options',
      decidedBy: {
        pairModel: 'either-or: the two options the model copied out of the question, passed the label check',
        pairCode: 'either-or: the two options read from the question in code',
        yesno: 'a yes / no question: a fixed card, whatever the model said',
        feeling: 'a feeling question: a fixed scale, whatever the model said',
        pain: 'a pain level: a fixed scale, never a model',
        body: 'a body question: the fixed body map, never a model',
        quiz: 'a memory question: no card, a line to say instead',
        open: 'the model proposed; code checked every choice',
        /** An open question no model answered: whatever is on the card, code put there. */
        openCode: 'no model answered; code completed the choices from About me or a fixed set',
        blockedNoModel: 'no card: no model answered this open question, and the rules alone cannot make its choices',
        blocked: 'no card: fewer than two choices survived',
        repair: 'a fixed card for a stuck moment, never a model',
        recognition: 'a recognition card from About me only, nothing made up',
      },
      headlineFrom: {
        model: "the model's topic",
        pair: 'the shared topic of the two options',
        question: "the question's own words",
        fixed: 'fixed for this kind of card',
      },
      rules: {
        sameAsTopic: 'the same as the headline',
        repeat: 'repeated',
        negative: 'negative wording',
        madeUpLabel: 'a label the cloud made up',
        both: '"both" is not a choice',
        timeScale: 'a time on another scale than the rest',
        household: 'lives here: never offered for a call or a visit',
        inventedName: 'a name that is not in About me',
        fit: 'does not answer this kind of question',
        madeUpVariant: 'an invented detail of their own things',
        overlap: 'overlaps another choice',
        overThree: 'more than three',
        genericWhere: 'a generic place when About me has real ones',
        genericWho: 'a general word when About me has the people themselves',
        overCap: 'on the next page: this card shows two at a time',
        fixed: 'a fixed card: the model\'s choices are not used',
        orOnly: 'either-or: only the two options the question names',
        optionsFailed: 'failed the label check',
        cloudUnfit: "the cloud's choices did not hold up; the card made on this computer is kept",
      },
    },
    lookalikesHeading: 'Look-alikes, named',
    lookalikesIntro: 'What is closest to Talk Partner, checked on the primary pages on 11 Nov 2026, and where it differs.',
    lookalikes: [
      {
        name: 'Lingraphica Conversations (24 Jun 2026)', url: 'https://lingraphica.com/resources/introducing-conversations/',
        does: "Transcribes the conversation partner's speech and suggests keywords and replies to the device user. Lingraphica Hub devices, adults over 18, English, internet needed.",
        ours: "The other side of the table: the partner's question becomes a choice card; the person's reply is never drafted.",
      },
      {
        name: 'Lingraphica Smart Folders (10 Nov 2026)', url: 'https://lingraphica.com/resources/new-smart-folders-tool/',
        does: 'A folder title and a description become dozens of suggested pictured cards in seconds, for building folders in the Talk tool.',
        ours: 'One card per question, in the conversation, ending in a tick and a recap; any browser; the private step on this computer.',
      },
      {
        name: 'AACessTalk (CHI 2025)', url: 'https://arxiv.org/abs/2409.09641',
        does: 'Real-time guides to the parent of a minimally verbal autistic child, and recommended vocabulary cards to the child; 11 pairs over two weeks.',
        ours: "Adults with aphasia; the partner's own question is rewritten (split, de-quizzed) and shown as choices; the answer is never written for the person.",
      },
      {
        name: 'Tobii Dynavox TD Snap Aphasia', url: 'https://us.tobiidynavox.com/pages/td-snap-aphasia',
        does: 'A Whiteboard, "a shared space for people with aphasia and their communication partners", rating scales, word lists, scripts and a "Communication Breakdown Repair" activity; no AI on that page. Its RESNA session on AI in AAC (22 Sep 2026) asks for "clearly defined, user-centered use cases".',
        ours: 'The same shared screen, written for each question as it is asked; the model only ever touches the partner\'s question, and a fixed repair card sits on every card.',
      },
    ] as readonly { name: string; url: string; does: string; ours: string }[],
  },

  judge: {
    label: 'Judge mode',
    intro: 'A made-up family, one-tap questions of each kind, and per card: where each step ran, and why this card.',
    noDevice: "This browser has no private helper, so the private step shows as \"did not run\" on every card. Cloud help can make the open cards: it gets the question only, and the sample family is made up.",
    exit: 'Leave judge mode',
    /** The one-tap questions, grouped by what the judge sees happen (core/sample.ts gives each question its group). */
    groups: { model: 'Open question: a model proposes', coach: 'The app corrects the partner', code: 'Read in code, no AI' },
    receipt: {
      heading: 'Privacy receipt',
      summary: (n: { cards: number; cardsLeft: number; bodyBytes: number; questionBytes: number; namesWithheld: number; otherWithheld: number; leaksFound: number; photosFound: number; offlineRuns: number; attempts: number; attemptBytes: number }) =>
        `${n.cards} card${n.cards === 1 ? '' : 's'} this session. Left this computer: ${n.bodyBytes} bytes in ${n.cardsLeft} request${n.cardsLeft === 1 ? '' : 's'} (${n.questionBytes} bytes of question text). ` +
        `Withheld before sending: ${n.namesWithheld} name${n.namesWithheld === 1 ? '' : 's'}, ${n.otherWithheld} other About me word${n.otherWithheld === 1 ? '' : 's'}. ` +
        `Checked after sending: ${n.leaksFound} About me word${n.leaksFound === 1 ? '' : 's'} and ${n.photosFound} photo${n.photosFound === 1 ? '' : 's'} in the sent text.` +
        (n.offlineRuns ? ` ${n.offlineRuns} cloud step${n.offlineRuns === 1 ? '' : 's'} ran on this computer instead (cloud unreachable): nothing left.` : '') +
        (n.attempts ? ` ${n.attempts} cloud request${n.attempts === 1 ? '' : 's'} failed after being handed to the SDK: the question may have left (${n.attemptBytes} bytes, not in the count above).` : ''),
      columns: { card: 'card', left: 'left this computer', bytes: 'bytes (question)', withheld: 'withheld', check: 'checked after' },
      leftYes: 'yes, cloud answered',
      leftNo: 'nothing',
      leftMaybe: 'maybe: asked, no answer',
      leftOffline: 'nothing (ran here, offline)',
      withheld: (names: number, other: number) => `${names} name${names === 1 ? '' : 's'}, ${other} other`,
      kept: 'whole question kept here',
      checkOk: '0 About me words, no photo',
      checkBad: (leaks: number, photo: boolean) => `${leaks} About me word${leaks === 1 ? '' : 's'}${photo ? ', photo bytes' : ''}`,
      how: 'How this is counted: the bytes are the UTF-8 length of the request body this app built for the cloud step (fixed instructions, the schema and the swapped question), kept when the SDK reported that the cloud answered; a card where nothing left counts 0. A request that was handed to the SDK and failed is listed apart as "maybe", with its size: the app cannot tell whether it reached the cloud. The body is in the export, so the count can be checked by hand. Not counted: the SDK\'s transport around it (headers, the App Check token), which carries no family data. "Withheld" counts the About me words swapped for labels such as "Person A". "Checked after" searches the sent text for About me words and photo bytes once more, after the fact.',
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
    cloudWouldCheckOff: (kept: boolean) => `Cloud help could try this one, but it is off.${kept ? ' The card made on this computer is kept.' : ''}`,
    cloudWouldCheckUnconfigured: (kept: boolean) => `Cloud help could try this one, but it is not configured on this copy.${kept ? ' The card made on this computer is kept.' : ''}`,
    leak: 'Not sent: the question still held an About me word after stripping.',
    cloudOptionsUnfit: "The cloud's options didn't fit; the card made on this computer is kept.",
    holdUpTwo: 'The real options are not known: hold up two and point to each as you ask.',
    ranOffline: 'Ran on this computer (offline). Nothing was sent.',
    personalKept: 'Every choice on this card is from About me, so cloud help is not asked: it never sees About me.',
    cloudFailed: (msg: string, kept: boolean) => `Cloud step failed (${msg})${kept ? '; the card made on this computer is kept' : ''}.`,
    moreOnNext: (labels: string, escape: string) => `More on the next page: ${labels}. "${escape}" on the card, or "Next: more choices", shows the next page.`,
    lastPage: 'The rest of the choices for this question.',
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
      cloudNotNeeded: 'not needed: the card made on this computer was good enough',
      cloudLeak: 'not sent: the question still held an About me word',
      cloudGot: 'got the question only, About me words swapped out',
      cloudOffline: 'the cloud was unreachable, so the stripped question ran on this computer',
      codeRan: 'applied the card rules',
    },
  },
} as const;

export { COPY };
export type Copy = typeof COPY;
