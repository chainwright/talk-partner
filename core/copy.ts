// Every string a person reads, in one place (build spec §4). Plain words, adult tone, short.
// Rules checked by tests/unit/copy.test.ts: nothing technical on the main screens (no mode names, no "Firebase",
// no "placeholder", no rule numbers), no exclamation marks anywhere, and every "never sent" claim is literally true
// of the payloads the core builds. The technical words live only in `consent`, `how` and `judge`.
//
// Shared by every client (web today; Android and iOS read the same strings), so this file has no DOM.

const COPY = {
  app: {
    name: 'Talk Partner',
    // The opening line. First half: the coaching lines below (`coach`), shown where a rule can tell (two questions in
    // one, a memory test, options that are not on the screen). Second half: no code picks or confirms a choice; only a
    // tap on the card does (tests/unit/truth.test.ts pins both). The line under it says what the app does every time.
    tagline: 'It corrects how you ask. It never answers for them.',
    taglineSub: 'Turn your question into big written choices they can point to.',
    sample: 'Sample family: made up (Frank, and Carol asking).',
    nav: { about: (name: string) => (name ? `About ${name}` : 'About me'), cloud: 'Cloud help', how: 'How this works', judge: 'Judge mode', home: 'Back' },
  },

  status: {
    ready: 'Ready on this computer.',
    notDownloaded: 'One-time setup: download the private helper (several GB, once).',
    download: 'Download',
    downloading: (pct: string) => `Downloading the private helper${pct}. Simple questions work meanwhile.`,
    warming: 'Getting the private helper ready on this computer. The first time after the browser starts this can take up to half a minute.',
    checking: 'Checking whether this computer can run the private helper…',
    unavailable: "This computer can't run the private helper. Yes/no, either-or, feeling, pain and body cards still work.",
    unavailableCloudOff: 'Open questions need cloud help.',
    unavailableCloudOn: 'Open questions use cloud help.',
    noConfig: 'This copy has no project settings, so no AI runs here. Yes/no, either-or, feeling, pain and body questions still make cards.',
    deviceReason: 'The private helper runs on desktop Chrome and needs free disk space and memory. Phones, tablets and other browsers use cloud help instead.',
  },

  ask: {
    placeholder: 'Your question',
    make: 'Make card',
    making: 'Making…',
    /** Shown in place of the card while it is being made (a model answer takes a few seconds). */
    makingCard: 'Making the card…',
    makingHint: 'A few seconds. Nothing is on their screen yet.',
    label: 'Your question',
    /** One-tap chips above the field: the questions answered most often, from the list kept on this computer. */
    again: 'Asked before:',
    againTitle: (times: number) => `Answered ${times} time${times === 1 ? '' : 's'} on this computer. Tap to ask it again.`,
  },

  /** The support setting, named by what the person sees (it read backwards as "Support: more (2 choices)"). */
  support: {
    label: 'Choices on a card',
    options: { mild: '3 at a time', more: '2 at a time', most: '2 at a time, larger tiles' },
  },

  card: {
    /** The empty card area of the full view's partner screen: plain words, no picture to puzzle over. */
    emptyPane: 'Your card will appear here. Type or say a question above, or tap one you asked before.',
    emptyBusy: 'Making the card…',
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
    retry: 'Try again',
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
    recall: "Tell, don't test: say it if you know it. If you don't know either, ask yes / no about one real thing at a time.",
    holdUp: 'The real options are not on the screen: hold two up and point to each as you ask.',
    negative: 'Asked the plain way: to a "not" question, a yes can mean either thing.',
    unguessable: 'No list can hold this answer, so the card does not guess: it gives them ways to get it across.',
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
    /** The same five tiles as the card for a question nobody can guess the answer to. */
    ownHeadline: 'your way',
    ownNote: 'Only they know what they meant, so there are no guesses on this card: three ways to get it across, and two ways to leave it for now.',
    tip: 'Read the five aloud, pointing to each. Then wait.',
    lines: {
      'show me': 'Say: "Show me." Let them point, gesture, or take you to it.',
      'write it': 'Give them the pad: "Write it, any letters you can."',
      draw: 'Give them the pad: "Draw it."',
      later: 'Say: "Later, then. We will come back to it." And come back.',
      'change topic': 'Say: "Let\'s leave it." Start a new topic, one idea at a time.',
    } as Record<string, string>,
  },

  // The quick-needs board: one tap from the partner screen, a fixed board of everyday needs for the person to point
  // to. No model, no request: it is built in code (core/needs.ts) and works with no connection once the page is open.
  // The tile words are the picture ids (web/src/pictos.ts). The lines are for the partner, after the tick: what to do
  // next, short, never about the person and never on their screen.
  needs: {
    open: 'Quick needs',
    openTitle: 'A board of everyday needs they can point to. No AI, nothing sent; it works with no connection.',
    ask: 'What do you need?',
    headline: 'I need',
    tiles: ['toilet', 'drink', 'food', 'pain', 'tired', 'too hot', 'too cold', 'call someone'] as const,
    escape: 'something else',
    say: 'What do you need? Show me.',
    tip: 'Hold the screen where they can reach it. Name a tile as you point, if it helps. Then wait.',
    note: 'A fixed board of everyday needs: made in code, no AI, nothing sent. It works with no connection once this page is open.',
    lines: {
      toilet: 'Go now. The rest can wait.',
      drink: 'Hold up two real drinks and let them point.',
      food: 'Hold up two real things to eat and let them point.',
      pain: 'Ask where it hurts. The body card needs no AI:',
      tired: 'Offer a rest. Say when you will come back to the conversation, and come back.',
      'too hot': 'Change one thing: a layer off, a window, a fan. Then ask "Better?" and wait for a yes or a no.',
      'too cold': 'Change one thing: a blanket, a layer, the heating. Then ask "Better?" and wait for a yes or a no.',
      'call someone': 'Say one name at a time, or show photos, and wait for a yes. Then make the call together.',
      'something else': 'Ask in the question box, one thing at a time. Or press "We\'re stuck" for other ways to get it across.',
    } as Record<string, string>,
    /** After "pain" is confirmed: one tap asks the body-map question (made in code, like the board). */
    painQuestion: 'Where does it hurt?',
  },

  // Voice input for the partner's own question (web/src/voice.ts): a short recording, started by a press on the
  // microphone and never by itself, turned into text by Gemini through Firebase AI Logic. The person's speech is never
  // recorded. The recording goes to Google's cloud (the SDK cannot run sound on the device), so the notice says that
  // before the first use, and every line that says "nothing left this computer" gives way to one of these once a
  // recording was handed over. `MAX` is core/models.ts VOICE_MAX_SECONDS, passed in by the caller.
  voice: {
    button: 'Speak your question',
    stop: 'Stop recording',
    /** Before the first use, and the button's hover text. */
    notice: (maxSeconds: number) =>
      `Voice input records your question (up to ${maxSeconds} seconds) and sends the recording to Google's cloud, where an AI model turns it into text. It is your voice as it is, with any names you say: the name swap cannot be applied to sound. It needs a connection. For your question only: their speech is never recorded.`,
    ok: 'Use the microphone',
    cancel: 'Not now',
    asking: 'Waiting for the microphone. Your browser may ask you to allow it.',
    recording: (maxSeconds: number) => `Recording. Say your question, then press the microphone again. It stops by itself after ${maxSeconds} seconds.`,
    working: 'Turning your recording into text in Google\'s cloud…',
    heard: 'Check the words and change them if needed. Then make the card.',
    /** If the SDK ever reports that a recording was turned into text on this computer (it cannot today). */
    heardHere: 'Turned into text on this computer. Check the words and change them if needed. Then make the card.',
    errors: {
      blocked: 'The microphone is blocked for this page. Type the question, or allow the microphone in the browser.',
      'no-speech': 'Nothing was heard. Press the microphone and try again, or type the question.',
      'no-mic': 'No microphone was found. Type the question.',
      offline: 'Voice input needs a connection: the recording is turned into text in Google\'s cloud. Type the question.',
      busy: 'Voice input is busy just now (this free project may make 15 requests a minute, for everyone). Type the question, or try again in a minute.',
      failed: 'Voice input did not work this time. Type the question.',
    },
    /** In place of "nothing left this computer" on a card whose question was spoken. */
    tailKept: 'the question was spoken: its recording went to Google\'s cloud to be turned into text · nothing else left this computer',
    /** After the tail of a card whose spoken question also went to cloud help. */
    tailAlso: 'the question was spoken: its recording went to Google\'s cloud too',
    /** Under "What was sent" on such a card. */
    sentNote: 'The question was spoken: before this card was made, its recording went to Google\'s cloud to be turned into text, as you said it, names included. That request is counted in the session\'s figure, not in this card\'s.',
    /** In "How this is counted", once a recording was handed over. */
    counted: 'Recordings of spoken questions are counted at the size this app handed to the SDK (a 16 kHz WAV file as base64 text), whether the cloud answered or the request failed after being handed over.',
    /** After the line "Your questions … stay on this computer", once a recording was handed over. */
    privacy: 'Except what you spoke into the microphone: those recordings went to Google\'s cloud to be turned into text.',
  },

  // "Send feedback" (core/feedback.ts): a short note to the people who make the app, reachable on the partner's side and
  // on the "How this works" page. It is the one thing the app stores away from this computer, so the screen says where it
  // goes and what goes with it, and asks for no patient details. Sent only on a press of "Send".
  feedback: {
    link: 'Send feedback',
    heading: 'Send feedback',
    intro: 'What worked, what did not, what is missing? A few words help. Your note goes to the people who make Talk Partner.',
    textLabel: 'Your note',
    left: (n: number) => `${n} character${n === 1 ? '' : 's'} left`,
    noPatients: 'Please don\'t include patient details: no names, no dates of birth, nothing that could identify a person you care for or treat.',
    roleLabel: 'You are (optional)',
    roles: { '': 'I\'d rather not say', slt: 'a speech-language therapist', carer: 'a carer or family member', person: 'a person with aphasia', other: 'someone else' } as Record<string, string>,
    emailLabel: 'Email (optional)',
    emailHint: 'Only if you want an answer. Leave it empty and the note is sent without one.',
    where: 'Where it goes: the note, your role and the email address if you gave one are stored in our database in Google\'s cloud, with the time and the version of this app. Nothing else is sent with it: none of your questions, no cards, nothing from About me. You cannot read or change it afterwards from here.',
    send: 'Send',
    sending: 'Sending…',
    sent: 'Thank you. Your note was sent.',
    another: 'Write another',
    offline: 'Feedback needs a connection, and this computer has none just now. Your note is kept here on the screen until you send it.',
    noConfig: 'This copy of the app has no project settings, so it has nowhere to send a note.',
    errors: {
      empty: 'Write a few words first.',
      long: 'The note is too long. Please keep it under 1,000 characters.',
      email: 'That email address does not look complete. Correct it, or leave the field empty.',
      failed: 'The note could not be sent. Check the connection and try again; your words are still here.',
    },
  },

  // The two ends of the number line on a pain card (under the numbers on the person's card).
  scale: { low: 'no pain', lowFromOne: 'hardly any', high: 'the worst' },

  badge: {
    device: 'On this computer',
    cloud: 'Cloud help (question only)',
    offline: 'Ran on this computer (offline)',
    code: 'No AI needed',
    /** A model was asked for this card and code made it all the same: nothing of the model's answer is on it. */
    codeAsked: 'Made in code (AI answer not used)',
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
    historyNote: 'Each answer confirmed with the tick is kept here, on this computer only, so you can see what they chose last time. It is never sent anywhere. On a computer with Chrome\'s built-in AI, that AI reads today\'s answers on this computer, to write "Today in short" and to narrow down after "something else"; online help never gets them.',
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
    /** After the one line that changes per card: the size of the whole request, and what the rest of it is. */
    size: (bytes: number) => `${bytes.toLocaleString('en-US')} bytes with the fixed instructions and the answer format, which are the same for every question`,
    exact: 'Show the exact request',
  },

  // The simple view (direction A, "One screen", 17 Nov 2026): what a carer on a phone sees at "/". It draws less than
  // the full view and computes nothing: the same pipeline makes every card. Plain words only (the copy test holds this
  // group to the main-screen rule: no product or mode names). Every privacy line here says what is sent, never
  // "nothing else" or "only": the request also holds the app's fixed instructions (tests/unit/simple.test.ts).
  // `about` is the About-me heading ("About Frank" / "About me"); `name` is the person's name, or ''.
  simple: {
    /** The header of the first screen: the hope, not the mechanism. The person's name when About them has it, else "them". */
    hope: (name: string) => `When the words won't come, let ${name || 'them'} point.`,
    with: (name: string) => `with ${name}`,
    /** The board for needs that cannot wait: at the top of the first screen, above everything else. */
    needs: 'Needs it now?',
    needsSub: 'Toilet, drink, pain, too hot: one tap, then they point.',
    needsShort: 'Quick needs',
    /** The highlighted block at the top: open on the first visit, one line after the first card (remembered). */
    how: {
      title: 'How it works: 4 steps',
      hide: 'Hide',
      show: 'Show',
      steps: (name: string) => [
        'Ask a simple question, or pick one below',
        `Turn the computer to ${name || 'them'} and say it out loud`,
        `${name ? `${name} points` : 'They point'} at the answer. No words needed`,
        `Check: "So: tea. Right?" ${name ? `${name} taps` : 'They tap'} Yes or No`,
      ],
    },
    /** The one skill that makes a choice card work (SCA: give time). Visible on the steps and on the hand-over screen. */
    wait: (name: string) => `Wait. Count to ten. Don't answer for ${name || 'them'}.`,
    topicsHeading: 'What do you want to ask?',
    topicLead: (name: string) => `Tap one. Then say it out loud as you turn the computer to ${name || 'them'}.`,
    ownTag: (name: string) => (name ? `${name}'s own` : 'their own'),
    /** The tag on the one open question in the topics: where its choices would come from here. */
    aiTag: { device: 'AI on this computer', net: 'needs internet', offline: 'needs internet: you are offline', none: 'needs AI: none set up here', checking: 'needs AI' },
    ownHeading: 'Or ask your own question',
    field: 'Type it here',
    make: (name: string) => `Show ${name || 'them'} the choices`,
    making: 'Finding the choices…',
    /** What the AI is for, in one plain line, then where it runs on this device (core/simple.ts, aiLines). */
    ai: {
      line: 'For a question you type, AI suggests the answers they can point to. The topic questions above do not need it.',
      device: 'On this computer that AI is built into Chrome: nothing is sent.',
      ask: "On this computer that AI is online (Google's): the app asks you first, and shows the line that would go.",
      cloudOn: "On this computer that AI is online (Google's), and online help is on.",
      none: 'This copy has no AI set up: a question you type works when it is yes / no or either-or.',
      offline: 'You are offline, and that AI needs the internet. The topic questions and "Needs it now?" work without it.',
    },
    aboutLink: (name: string) => (name ? `About ${name}` : 'About them'),
    inside: 'How it works inside',
    madeLink: 'How was this made?',
    back: 'New question',
    /** The carer's screen before handing over. */
    step1: 'Say it out loud',
    step2: (name: string) => `Turn the computer to ${name || 'them'}`,
    preview: (name: string) => `What ${name || 'they'} will see:`,
    tip: 'Point to each choice as you say it.',
    tipWeak: 'If their hand is weak, they can point and you tap.',
    tipsMore: 'More tips',
    tipsLess: 'Fewer tips',
    /** The bar at the top of every carer screen. */
    nav: { back: 'Back', home: 'Home', homeLabel: 'Talk Partner: Home, the first screen' },
    /** About them: the family's own photos (core/photos.ts). Framed by hand, labelled with one word, kept on this device. */
    photos: {
      heading: (name: string) => `${name ? `${name}'s` : 'Their'} own photos`,
      why: 'A photo of a person, a food or drink, or a place they know. A card shows it in place of the drawing wherever its word is one of the choices.',
      lock: 'Photos stay on this computer only. They are never sent anywhere, and no AI looks at them.',
      add: 'Add a photo',
      full: 'That is the most photos the app keeps (60). Delete one to add another.',
      del: 'Delete',
      delAll: 'Delete all photos',
      delAllConfirm: 'Delete all the photos from this computer?',
      none: 'No photos yet.',
      badFile: 'This file could not be opened as a picture. Try another photo.',
      frame: { heading: 'Frame the picture', how: 'Move the picture and zoom, so the one thing fills the square.', zoomOut: 'Zoom out', zoomIn: 'Zoom in', zoom: 'Zoom', use: 'Use this', cancel: 'Cancel', view: 'The picture: drag to move it' },
      label: { heading: 'One word for it', how: 'The word as it stands on the cards: tea, Jen, garden. The card shows this photo when a choice is this word.', field: 'The word', save: 'Save photo', back: 'Frame it again', empty: 'Type the word first.' },
      everything: 'Delete everything on this computer',
    },
    /** About them: what the app counted from the answers on this device (core/prefs.ts). */
    learned: {
      heading: (name: string) => `What we've learned about ${name || 'them'}`,
      how: 'Counted on this computer from the answers they confirmed: no AI, and it is never sent anywhere. A line appears after three answers to the same question. It is only ever a hint for you: they always choose for themselves.',
      none: 'Nothing yet. After three answers to the same question, their usual choice shows here.',
      keep: 'Keep as a fact',
      remove: 'Remove',
      kept: 'Facts you kept:',
      forget: 'Forget everything learned',
      forgetConfirm: 'Forget everything the app has learned from their answers on this computer? The lists you typed stay.',
      shortBy: '(In short, by the AI built into Chrome on this computer. Nothing was sent.)',
    },
    more: 'More',
    less: 'Less',
    /** A newer build is in this browser (web/src/main.ts): one tap loads it. Never shown on the person's screen. */
    update: 'A newer version is ready. Tap to update.',
    /** The quick-needs board has no question: the old line stands over the need they pointed to. */
    choseNeed: (name: string) => `${name || 'They'} pointed to:`,
    tipExit: (name: string) => `After the answer, ${name ? `${name}'s` : 'their'} screen says "Give the computer back". To come back sooner, press and hold "Carer: hold here to go back" at its top.`,
    lessHint: (name: string) => `"Hide the choices" lets ${name || 'them'} try to say it first.`,
    /** The person's own screens: adult words, one thing to do. `label` is the choice they pointed to. */
    person: {
      point: 'Point to your answer',
      hold: 'Carer: hold here to go back',
      holdTitle: 'Back to the carer screen (press and hold; with a keyboard, press Enter)',
      so: (label: string) => `So: ${label}. Right?`,
      yes: 'Yes',
      no: 'No, something else',
      thanks: 'Thank you.',
      done: (label: string) => `${label.charAt(0).toUpperCase()}${label.slice(1)}.`,
      give: 'Give the computer back',
      recap: 'So far:',
      recapNo: 'No',
    },
    chose: (name: string) => `${name || 'They'} chose, and said yes to:`,
    choseOut: (name: string) => `${name || 'They'} chose:`,
    another: 'Ask another question',
    /** After an answer the tree leads on (core/tree.ts): the next question is the main button, this one stands under it. */
    anotherElse: 'Ask something else',
    nextLabel: 'Next:',
    doNow: 'Now:',
    nextHeading: 'Or ask next:',
    /** The carer's screen after the person chose the way out: what to do now, never a dead end. */
    out: {
      heading: 'None of those fitted. What now:',
      show: 'Ask them to show you, or to write or draw it. Then ask it as a new question.',
      notSure: 'Not sure is an answer too. Ask it another way, or come back to it later.',
      tryNext: (q: string) => `Try: ${q}`,
      needs: 'Open "Needs it now?"',
      own: 'Ask it a new way',
      stuck: "We're stuck: other ways to get it across",
    },
    /** After the way out: an AI suggests the next, broader choices (core/narrow.ts). Two levels at most. */
    narrow: {
      go: 'Narrow it down: AI suggests the next choices',
      device: 'The AI built into Chrome does this on this computer. Nothing is sent.',
      cloudOn: "Google's online AI does this. It gets the question and the choices that did not fit, with any names you listed swapped out, and the app's fixed instructions. Never the answers they chose.",
      ask: 'This uses online help: the app asks you first, and shows the line that would go.',
      offline: 'You are offline: narrowing needs the internet on this computer.',
      busy: 'Finding the next choices…',
      label: (level: number, max: number, where: 'device' | 'cloud') => `AI suggested these next choices${where === 'device' ? ' on this computer' : ' with online help'}, because none of the first ones fitted (step ${level} of ${max}).`,
      labelRules: (level: number, max: number) => `The app's rules made these broader choices, because none of the first ones fitted and the AI only offered more of the same (step ${level} of ${max}).`,
      last: 'That was the last narrowing step.',
    },
    /** "Today in short": two to four plain sentences for the family or the therapist (core/summary.ts). */
    short: {
      heading: 'Today in short',
      copy: 'Copy',
      copied: 'Copied',
      device: 'Written by the AI built into Chrome on this computer, from the answers kept here. Nothing was sent.',
      rules: "Written by the app's rules on this computer, no AI. The answers are personal, so they are never sent to online help.",
      busy: 'The AI on this computer is writing it…',
    },
    /** "Do you want to call someone?" answered yes, and About them names nobody: one name, typed by the carer. */
    who: { label: 'Who? Type one name', go: 'Ask' },
    /** About them, offered after the first card and never before. */
    invite: {
      title: (name: string) => `Want ${name ? `${name}'s` : 'their'} family's names on the questions?`,
      body: 'Add family and friends, favourite food, places and shows. Then "Would you like to call Jen?" is one tap. About two minutes. It stays on this computer. Fill it in together if you can.',
      add: 'Add people and favourites',
      later: 'Not now',
    },
    recap: 'Go over the answers',
    today: 'Today',
    noCard: 'No card for this one',
    askChoice: 'Or ask it as a choice, with both options in the question: "This, or that?"',
    useOnline: 'Use online help for this question',
    /** A question that needs online help, asked with no connection: said plainly, and what still works. */
    offline: 'This question needs the internet, and you are offline. The topic questions and "Needs it now?" work without it.',
    /** Where this card was made: one sentence for who made it, one for what left. Read from the card, never assumed. */
    made: {
      code: "Made by the app's rules on this computer. No AI used.",
      codeAsked: "Made by the app's rules on this computer. An AI was asked first, and its answer was not used.",
      device: 'Made by the AI built into Chrome on this computer.',
      devicePersonal: (about: string) => `Made by the AI built into Chrome on this computer, from ${about}.`,
      offline: 'Made by the AI built into Chrome on this computer: the connection was down.',
      cloud: "Made with online help: Google's AI suggested the choices.",
      none: 'No card was made.',
    },
    left: {
      nothing: 'Nothing was sent.',
      sent: (about: string) => `Sent to Google: your question, with any names you listed swapped out, and the app's fixed instructions. Nothing from ${about}.`,
      /** A narrowing step (core/narrow.ts): what went is the question and the choices that did not fit. */
      sentNarrow: (about: string) => `Sent to Google: the question and the choices that did not fit, with any names you listed swapped out, and the app's fixed instructions. Nothing from ${about}, and never the answers they chose.`,
      maybe: 'Online help was asked and did not answer: your question may have left this computer.',
      voice: 'You spoke this question: its recording went to Google to be typed out.',
    },
    /** The line at the foot of the first screen and the answered screen: by what has happened this session. */
    privacy: {
      none: 'Nothing you asked has left this computer.',
      cloudOn: 'No question has left this computer.',
      settings: 'Online help is on, so the app asked for its settings online (no question in that).',
      sent: (n: number) => `${n} question${n === 1 ? '' : 's'} went to Google's online AI this session, with any names you listed swapped out.`,
      maybe: (n: number) => `${n} more may have left this computer: online help was asked and did not answer.`,
      voice: (n: number) => `${n} spoken question${n === 1 ? '' : 's'} went to Google as a recording, to be typed out.`,
      answers: 'Answers are kept on this computer only.',
    },
    about: {
      sub: (name: string) => `${name ? `${name}'s` : 'Their'} people and places go onto the cards. On a computer with Chrome's built-in AI, their foods and favourites shape the choices too.`,
      lock: 'Everything here stays on this computer.',
      rows: { names: 'Their name, and yours', people: 'Family and friends', foods: 'Food and drink they like', places: 'Places, TV and music' },
      none: 'Nothing added yet',
      change: 'Change',
      add: 'Add',
      more: 'Nicknames, the answers so far and more are inside:',
      moreLink: 'Open the full page',
    },
    /** The way back from the full view, on every screen of it. */
    backSimple: 'Simple view',
    // ------------------------------------------------------------ phase 3 (18 Nov 2026): the guard, the diary, health notes, insights, the tip, the copy to a file
    /**
     * The answer-reliability guard (core/reliability.ts): for the carer only, never on the person's screen. Gentle, and
     * about the moment, not about the person's ability.
     */
    guard: {
      line: (name: string) => `${name || 'They'} may be tired. Try again later, or check with a different question.`,
      yes: 'The last few yes / no answers were nearly all "yes".',
      place: 'The last four answers were all in the same place on the screen.',
      marked: 'These answers are marked "less sure" in the diary. The next either-or shows its choices in a different order.',
      lessSure: 'less sure',
    },
    /** The diary (core/diary.ts): the carer's side only. */
    diary: {
      open: 'Diary',
      openSub: 'Log a drink, a meal, the toilet. See the day and the week.',
      heading: (name: string) => (name ? `${name}'s diary` : 'Diary'),
      lock: 'The diary is kept on this computer only. It is never sent anywhere, and it is never shown on their screen.',
      logHeading: 'Log it now, one tap:',
      log: { drank: 'Drank', ate: 'Ate', toilet: 'Toilet', slept: 'Slept', pain: 'Pain' } as Record<string, string>,
      logged: (what: string, time: string) => `Logged: ${what}, ${time}.`,
      undo: 'Undo',
      tabs: { today: 'Today', week: 'Week', month: 'Month' } as Record<string, string>,
      tabsLabel: 'How far back',
      topic: 'Topic',
      topicAll: 'All topics',
      topicOther: 'Other',
      need: 'Pointed to:',
      empty: { today: 'Nothing entered today yet.', week: 'Nothing entered in the last 7 days.', month: 'Nothing entered in the last 30 days.' } as Record<string, string>,
      emptyTopic: 'Nothing on this topic here.',
      base: 'The diary holds only what was entered in this app: answers they confirmed, needs they pointed to, and what you logged.',
      copy: 'Copy as text, for a visit',
      copied: 'Copied',
      del: 'Delete the diary',
      delConfirm: 'Delete the whole diary from this computer? This cannot be undone.',
      delDone: 'The diary was deleted.',
    },
    /** Health notes, in About them (core/insights.ts reads them; they change the thresholds of the insights). */
    health: {
      row: 'Health notes',
      none: 'Nothing noted',
      lead: 'Only what helps to read the diary. This is not a medical record.',
      lock: 'Health notes stay on this computer. They are never sent to online help.',
      toggles: { diabetes: 'Diabetes', swallowing: 'Swallowing difficulty', fluidLimit: 'A fluid limit from the doctor', reminders: 'Needs reminders to drink and eat' } as Record<string, string>,
      text: 'Anything else to keep in mind',
      textHint: '(in your own words)',
    },
    /**
     * Insights for a week or a month (core/insights.ts). Counted by rules on this device. Never medical advice: no
     * diagnosis, no medicine, no dose, no diet plan. Every line shows what it was counted from.
     */
    insights: {
      heading: { week: 'What stands out: the last 7 days', month: 'What stands out: the last 30 days' } as Record<string, string>,
      level: { tell: 'Tell the doctor or nurse', mention: 'Worth mentioning to the doctor or nurse', note: 'To keep in mind' } as Record<string, string>,
      footer: 'These lines are counts of what was entered in this app, made by fixed rules. They are not medical advice and not a diagnosis. If something worries you, ask the doctor or nurse.',
      only: 'Only what was entered here.',
      span: { week: '7 days', month: '30 days' } as Record<string, string>,
      pain: (n: number, span: string) => `Pain was chosen or logged on ${n} days in the last ${span}.`,
      painBase: (days: string) => `Days with pain: ${days}.`,
      noDrink: (days: string) => `No drink was chosen or logged on ${days}. That can simply mean nobody entered one.`,
      noDrinkFluid: (days: string) => `No drink was chosen or logged on ${days}. A fluid limit from the doctor is noted here: go by the doctor's plan.`,
      noDrinkBase: (n: number) => `Other things were entered on ${n === 1 ? 'that day' : 'those days'}, and no drink.`,
      fewDrinks: (day: string, n: number) => `Few drinks were entered on ${day}: ${n}.`,
      fewDrinksBase: (n: number) => `Chosen or logged ${n} time${n === 1 ? '' : 's'} that day.`,
      fewDrinksReminders: 'Reminders to drink are noted here.',
      manyDrinks: (day: string, n: number) => `${n} drinks were entered on ${day}. A fluid limit from the doctor is noted here: check the day against the doctor's plan.`,
      manyDrinksBase: (n: number) => `Chosen or logged ${n} times that day.`,
      sweets: (n: number, span: string) => `Something sweet was chosen ${n} times in the last ${span}.`,
      sweetsDiabetes: 'Diabetes is noted here.',
      sweetsBase: (n: number, span: string) => `Chosen ${n} times in ${span}.`,
      noFood: (days: string) => `No food was chosen or logged on ${days}. Swallowing difficulty is noted here.`,
      noFoodBase: (n: number) => `Other things were entered on ${n === 1 ? 'that day' : 'those days'}, and no food.`,
      sleep: (n: number, span: string) => `"Bad" was the answer to "How did you sleep?" on ${n} days in the last ${span}.`,
      sleepBase: (days: string) => `Days: ${days}.`,
      lessSure: (n: number, days: string, several: boolean) => `${n} answers on ${days} are marked "less sure": yes to nearly everything, or the same place on the screen each time. Read ${several === true ? 'those days' : 'that day'} with care.`,
      lessSureBase: (n: number, all: number, span: string) => `${n} of ${all} answers in ${span}.`,
      nothing: (span: string) => `Nothing stands out in what was entered in the last ${span}.`,
      nothingBase: (n: number, days: number) => `${n} entr${n === 1 ? 'y' : 'ies'} on ${days} day${days === 1 ? '' : 's'}.`,
      empty: 'Nothing was entered in this time, so there is nothing to count.',
      by: {
        rules: "Counted and worded by the app's rules on this computer. No AI, nothing sent.",
        device: 'Counted by the app\'s rules. Put into plainer words by the AI built into Chrome on this computer. Nothing was sent.',
        cloud: "Counted by the app's rules. Put into plainer words by Google's online AI, from the lines you saw on the sheet.",
        busy: 'The AI on this computer is putting the lines into plainer words…',
        failed: "Online help did not answer, so the app's own wording stands. The lines you saw on the sheet may have left this computer.",
        notSent: "Online help could not be reached, so the app's own wording stands. Nothing was sent.",
        refused: "The online wording did not pass the app's check, so the app's own wording stands.",
      },
      sentLine: (n: number) => `Lines from the diary's "What stands out" were handed to Google's online AI ${n === 1 ? 'once' : `${n} times`} this session, for their wording, after your yes: no name, no health note, nothing of the diary itself.`,
      plainer: 'Put these lines in plainer words (online help)',
      plainerOffline: 'Plainer words need the internet on this computer. You are offline.',
      sheet: {
        heading: 'Use online help for the wording?',
        body: "The counting is done. Google's online AI can put these lines into plainer words. This is the exact text that would go:",
        sentLabel: 'Sent to Google:',
        sent: "the lines above, as you see them, and the app's fixed instructions.",
        neverLabel: 'Never sent:',
        never: 'names, photos, the diary itself, the health notes, the answers they chose.',
        dataLabel: 'Data use:',
        data: "Google's free tier: Google may use what is sent to improve its products.",
        yes: 'Yes, send these lines once',
        no: 'No, keep the app\'s own words',
        once: 'This is for these lines, this once. It does not turn online help on for anything else.',
        whole: 'The whole request',
      },
    },
    /** One tip a day for the carer, about the carer's own questions (core/tip.ts). Never about the person. */
    dayTip: {
      heading: 'A tip for you',
      hide: 'Hide tips',
      show: 'Show the tip of the day',
      base: (n: number) => `From your ${n} question${n === 1 ? '' : 's'} today. About the questions, never about them.`,
      two: (n: number) => `${n === 1 ? 'One of today\'s questions' : `${n} of today's questions`} asked two things at once. One thing at a time is easier to answer by pointing.`,
      quiz: (n: number) => `${n === 1 ? 'One of today\'s questions' : `${n} of today's questions`} asked them to remember something. Telling works better than testing: say what you know, then ask what they want.`,
      again: (n: number) => `${n === 1 ? 'Once' : `${n} times`} today the choices did not fit and more were shown. Next time, try a different kind of question, or ask them to show you.`,
      open: (n: number) => `${n} of today's questions were open ones. A question with the choices in it ("tea or coffee?") is easier to answer by pointing.`,
      good: (n: number) => `Each of today's ${n} questions asked one clear thing. That is what makes pointing work.`,
      device: 'Worded by the AI built into Chrome on this computer. Nothing was sent.',
      rules: "Worded by the app's rules. No AI, nothing sent.",
    },
    /** A copy of About them in a file (core/backup.ts): so a new phone, or a cleared browser, does not lose it. */
    backup: {
      heading: 'Keep a copy',
      why: 'About them lives in this browser only. A file keeps it safe if the browser is cleared, and moves it to another phone or computer.',
      lock: 'The file is made on this computer and saved where you choose. The app sends it nowhere. It holds names, photos and health notes: keep it somewhere private.',
      save: 'Save About them to a file',
      load: 'Bring About them back from a file',
      fileName: 'talk-partner-about-them.json',
      preview: 'This file holds:',
      replaces: 'Bringing it back replaces About them, the photos and the health notes on this computer. The diary and the answers stay as they are.',
      yes: 'Replace with this file',
      no: 'Cancel',
      done: 'About them was brought back from the file.',
      bad: {
        json: 'This file could not be read. Choose a file saved by "Save About them to a file".',
        kind: 'This is not an About them file from Talk Partner.',
        version: 'This file is from a newer version of the app. Update the app, then try again.',
        shape: 'This file is damaged: something in it is not as the app saved it.',
        big: 'This file is too big to be an About them file.',
      } as Record<string, string>,
      has: {
        name: (n: string) => `The name: ${n}`,
        noName: 'No name',
        people: (n: number) => `${n} ${n === 1 ? 'person' : 'people'}`,
        lists: (n: number) => `${n} food${n === 1 ? '' : 's'}, place${n === 1 ? '' : 's'}, show${n === 1 ? '' : 's'} and music`,
        photos: (n: number) => `${n} photo${n === 1 ? '' : 's'}`,
        facts: (n: number) => `${n} fact${n === 1 ? '' : 's'} you kept`,
        health: (list: string) => (list ? `Health notes: ${list}` : 'No health notes'),
        saved: (when: string) => `Saved on ${when}`,
      },
    },
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
    what: "When the private helper can't make a good card, cloud help sends the question you typed to Google's Gemini (through Firebase). Before it's sent, names, places, foods and other words from About me are swapped for labels like \"Person A\". A word that looks like a name you have not listed (a word with a capital, or one that is not an everyday English word) is swapped for \"Name A\" too; that is a guess by the shape of the word, and it can miss a name. Anything else you type is sent as written, so leave out health details or names you don't want sent.",
    exampleHeading: 'Your last question would be sent like this:',
    exampleNone: 'Type a question first and this shows exactly what would be sent.',
    whoHeading: 'Who receives it',
    who: "Google's Gemini API, through Firebase AI Logic, on the free tier.",
    /** Remote Config is asked when cloud help is turned on (web/src/ai/remoteConfig.ts): said here, before the tick. */
    settings: 'When cloud help is on, the app also asks Firebase Remote Config once for its current settings (which cloud model to use). That request holds no question and nothing from About me.',
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
    /**
     * The same decision, asked in the simple view at the moment a question needs it (a sheet over the screen). One
     * button turns cloud help on; the page above keeps its tick box. Everything that decides it is on the sheet, above
     * the buttons: the line that would go, what else is in the request, what can be missed, who receives it, the data
     * use. It never says "nothing else" or "only the question" (the request also holds the fixed instructions).
     */
    sheet: {
      heading: 'This question needs online help',
      bodyNoDevice: (about: string) => `This computer has no AI of its own for open questions. Google's Gemini, through Firebase AI Logic, can suggest general choices. It never sees ${about}.`,
      bodyDevice: (about: string) => `The AI on this computer made no card for this one. Google's Gemini, through Firebase AI Logic, can suggest general choices. It never sees ${about}.`,
      goes: 'This is the line that would go:',
      sentLabel: 'Sent to Google:',
      sent: 'that line, and the app\'s fixed instructions. Names you listed are swapped first ("Person A"). Other names are guessed and can be missed; the rest goes as you typed it, so leave out health details.',
      neverLabel: 'Never sent:',
      never: (about: string) => `your ${about} lists, photos, who lives at home, the answers they chose.`,
      dataLabel: 'Data use:',
      data: "Google's free tier: Google may use what is sent to improve its products.",
      yes: 'Yes, send open questions to Google',
      no: 'No, not for this question',
      after: 'It stays on until you turn it off (inside, under Cloud help). With it on, the app also asks Firebase once for its settings: no question is in that.',
      exact: 'See the exact request',
      terms: "Google's data terms",
    },
    pictures: 'Pictures from the cloud are not part of this version: every picture is built in.',
    scope: 'This choice is kept only on this computer. "Delete everything on this computer" also resets it.',
  },

  // Technical words are allowed here: this panel is collapsed on the partner screen and open in judge mode.
  how: {
    heading: 'How this works',
    /** The routing in one line, first on the screen: which data goes to which Firebase AI Logic mode, and what the badges are read from. */
    routing: 'Where the AI runs: family data → ONLY_ON_DEVICE (Gemini Nano on this computer reads About me; it never falls back to the cloud). The stripped question → PREFER_IN_CLOUD, which falls back to Gemini Nano when offline. The SDK\'s inferenceSource for each call drives every AI badge.',
    intro: 'The model only proposes; code decides. All AI inference in this app goes through Firebase AI Logic: the two steps that make cards, and the microphone, which sends a recording of your question to Gemini in Google\'s cloud to be turned into text and only types it into the field. The two AI badges ("On this computer", "Cloud help") come from what the SDK reports for that call; "No AI needed", "Made in code (AI answer not used)" and "No card" come from the card rules.',
    legs: 'The two steps',
    columns: { step: 'step', mode: 'mode', gets: 'gets', why: 'why' },
    legNames: { private: 'private card', stripped: 'stripped card', voice: 'voice input (your question as text)' },
    // The settings Firebase Remote Config may change (core/models.ts), with where each value in use came from.
    settings: {
      heading: 'Settings from Firebase Remote Config',
      columns: { setting: 'setting', value: 'in use', from: 'from' },
      names: {
        cloudTextModel: 'Cloud model of the question-only step',
        routeMoodWords: 'A card made on this computer goes for a cloud second opinion when this many of its choices are mood words',
        routeMinChoices: '… or when it has fewer usable choices than this',
      },
      from: {
        remote: 'Remote Config',
        default: 'default in the code',
        refused: (raw: string) => `default in the code (Remote Config sent "${raw}", which did not pass the check)`,
      },
      none: 'This copy has no project settings, so Remote Config is not asked. The values below are the defaults in the code.',
      off: 'Not asked: cloud help is off. These settings concern the cloud step only, and a page with cloud help off contacts no host but its own (until you use the microphone or send feedback, each after its own notice), so Remote Config is asked only once cloud help is on. The values below are the defaults in the code.',
      asking: 'Asking Remote Config now. The defaults in the code run meanwhile: no card waits for the answer.',
      fetched: (time: string) => `Remote Config answered at ${time}. Each row says whether its value came from there.`,
      failed: (why: string) => `Remote Config did not answer (${why}). The defaults in the code are in use, and no card waited for it.`,
      note: 'What Remote Config cannot change: which step may see About me. That is fixed in the code.',
    },
    scoresHeading: 'Measured results',
    scoresNone: 'One measurement so far, and it is ours: 60 questions we wrote and labelled ourselves (16 Nov 2026). 18 of them are open (who, where, what): the choices are not in the question. Rules alone make no card for any of the 18. In three runs on 17 Nov 2026 (commit c346d3d) the helper on this computer made a card matching our label for 16 of them each time, and 13 of those offered the family\'s own people, places or foods. The other 42 are decided by code: 40 matched with the rules alone, 39 to 41 in those runs. The card rules have been changed since the questions were written, some after reading the misses, so this is not a test on unseen questions. It says how often the card is the one we meant, not whether it helps anyone. The timed pad-versus-card trial with people (two sealed sets of 10 questions, two or three pairs) has not been run.',
    traceHeading: 'Where each step ran for this card',
    tallyHeading: 'This session',
    tally: (n: { device: number; cloud: number; code: number; asked?: number; none: number; failed: number }) =>
      `${n.code} with no AI, ${n.asked ? `${n.asked} made in code after a model was asked, ` : ''}${n.device} on this computer, ${n.cloud} with cloud help, ${n.none} with no card; ${n.failed} step failure${n.failed === 1 ? '' : 's'}.`,
    /** The same tally in one line, for the judge-mode strip. */
    tallyShort: (n: { device: number; cloud: number; code: number; asked?: number; none: number; failed: number }) =>
      `${n.code} no AI · ${n.asked ? `${n.asked} in code, AI not used · ` : ''}${n.device} on this computer · ${n.cloud} cloud help · ${n.none} no card · ${n.failed} failed`,
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
        blockedCloud: 'no card: cloud help was asked and failed, and nothing made on this computer could stand in for it',
        blocked: 'no card: fewer than two choices survived',
        oneOption: 'one real option was left, so it is asked as a yes / no question',
        narrow: 'the person chose the way out: a model suggested broader choices, and the same rules checked them',
        narrowBlocked: 'no narrowing card: fewer than two real choices came back',
        narrowRules: "the model's choices were more of the same kind, or too few: the rules made the broader choices",
        repair: 'a fixed card for a stuck moment, never a model',
        needs: 'a fixed board of everyday needs, never a model',
        recognition: 'a recognition card from About me only, nothing made up',
        unguessable: 'a question only they can answer, in their own way: the fixed ways to get a message across, never a guess',
        when: 'an open "when" question: a fixed line of three times, chosen in code by what the question is about',
        listed: 'the answers the partner named after the question, read in code',
        people: 'a question about who it was, which only they know: the people About me names, nothing made up',
      },
      /** Where a family entry that replaced a model's general word came from. */
      ownKind: (general: string) => `About me: the family's own, in place of "${general}"`,
      headlineFrom: {
        model: "the model's topic",
        pair: 'the shared topic of the two options',
        question: "the question's own words",
        fixed: 'fixed for this kind of card',
      },
      rules: {
        sameAsTopic: 'the same as the headline',
        repeat: 'repeated',
        sameKind: 'more of the kind that did not fit: a narrowing card must be broader',
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
        self: 'the person the card is for',
        wrongList: 'an About me entry of another kind than the question asks for',
        fixed: 'a fixed card: the model\'s choices are not used',
        orOnly: 'either-or: only the two options the question names',
        optionsFailed: 'failed the label check',
        filler: 'not a choice: a filler word, or a phrase that breaks off',
        besideOwn: "a model's guess is not put beside the family's own entries",
        ownSpecific: "a general word: About me has the family's own kind of it",
        cloudUnfit: "the cloud's choices did not hold up; the card made on this computer is kept",
        escapeWord: 'a way out, not a choice: every card has its own',
      },
    },
    lookalikesHeading: 'Look-alikes, named',
    lookalikesIntro: 'What is closest to Talk Partner, checked on the primary pages on 11 Nov 2026 (Livox on 17 Nov 2026), and where it differs. Two of them also start from the question the partner asks, so that step alone is not new.',
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
        name: 'Livox, a student project at Worcester Polytechnic Institute (2020)', url: 'https://sites.google.com/view/livox-mqp/home',
        does: 'Livox is "a pictogram-based alternative communication application"; the project "incorporated a ML and NLP-based classifier to detect specific questions and present the most relevant pictograms to users".',
        ours: 'The same starting point, a question someone asks. Talk Partner is for adults with aphasia and works on the partner\'s side: written choices with a way out on every card, the line to say, coaching when the question itself is the problem, and the family\'s own entries read on this computer.',
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
    /**
     * Judge mode, every card after the one it opens with: the panels (why this card, where each step ran, what was
     * sent) and the receipt are folded, and this one line stands for them. A click opens all three panels.
     */
    madeLine: (decided: string, kept: number, added: number, dropped: number) =>
      `How this card was made: ${decided} · ${kept} kept, ${added} added, ${dropped} dropped by a rule. Open for why, where each step ran, what was sent.`,
    madeLineNoWhy: 'How this card was made. Open for where each step ran and what was sent.',
    /**
     * Judge mode's first step, in the status line. The instant first card is made in code; as soon as the on-device
     * model is ready the app itself asks one open question, and the card that follows carries the badge the SDK's
     * report gives it. Where there is no on-device model, the line says so plainly and nothing else changes.
     */
    step: {
      waiting: (q: string) => `When it is ready, the first step runs by itself: Gemini Nano on this computer makes the card for "${q}" from About me. Nothing is sent.`,
      running: (q: string) => `First step, running by itself: Gemini Nano on this computer is making the card for "${q}" from About me. A few seconds; nothing is sent.`,
      done: 'The card shown was made by Gemini Nano on this computer, from About me: its badge comes from what the SDK reported.',
      failed: 'The step on this computer did not give a card this time, so the card made in code stays. The first chip asks it again.',
      none: "No Gemini Nano in this browser, so the on-device step can't run here. The card shown is made in code.",
      notDownloaded: "Gemini Nano is not downloaded in this browser, so the on-device step can't run yet. The card shown is made in code.",
      downloadSize: '(several GB, once)',
    },
    /**
     * Judge mode in a browser that cannot run the on-device step: one link shows a recording of what that step made on
     * our machine (core/recorded.ts). It is labelled as a recording everywhere it stands; nothing runs and nothing is
     * sent for it. The cloud step can then be run here for real, through the consent screen as always.
     */
    recorded: {
      link: 'See what the on-device step makes →',
      tag: 'Recording',
      label: (date: string, commit: string, browser: string) => `Recorded on our machine on ${date}, at commit ${commit}, in ${browser} with Gemini Nano. Not made in this browser: nothing ran here for it and nothing was sent.`,
      sdk: (source: string) => `What the SDK reported for that call (inferenceSource=${source}):`,
      compare: (tiles: string) => `In the same run the cloud step, which never sees About me, answered the same question with "${tiles}".`,
      cloudOff: 'The cloud step can run here, now, and it is not a recording: read what is sent, tick the box, turn on cloud help, then ask the same question.',
      cloudLink: 'Cloud help: read and turn on →',
      cloudOn: 'Cloud help is on. Ask the same question here, now, and compare:',
      askNow: 'this weekend? (cloud step, live)',
      noCloud: 'This copy has no project settings, so the cloud step cannot run here either.',
      source: (log: string) => `The whole run, with screenshots: ${log}.`,
      hide: 'Hide the recording',
    },
    /** The one-tap questions, grouped by what the judge sees happen (core/sample.ts gives each question its group). */
    groups: { model: 'Open question: a model proposes', coach: 'The app corrects the partner', code: 'Read in code, no AI' },
    receipt: {
      heading: 'Privacy receipt',
      summary: (n: { cards: number; cardsLeft: number; bodyBytes: number; questionBytes: number; namesWithheld: number; otherWithheld: number; leaksFound: number; photosFound: number; offlineRuns: number; attempts: number; attemptBytes: number }) =>
        `${n.cards} card${n.cards === 1 ? '' : 's'} this session. Handed to the cloud step: ${n.bodyBytes} bytes in ${n.cardsLeft} request${n.cardsLeft === 1 ? '' : 's'} (${n.questionBytes} bytes of question text). ` +
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
      /**
       * The one number of the receipt, at display size, with the words that make it literally true. "0 bytes left this
       * computer" is said only when no cloud request was handed to the SDK this session (none answered, none failed).
       * Once the cloud has answered, the number is what the app handed over, and it is called that: the app does not
       * see what the SDK adds on the wire. A request that failed is never counted as kept.
       */
      number: (n: { cards: number; cardsLeft: number; bodyBytes: number; namesWithheld: number; otherWithheld: number; attempts: number; attemptBytes: number }, settingsAsked = false, voice: { clips: number; bytes: number } | null = null) => {
        // `voice`: recordings of a spoken question that this app handed to the SDK for the cloud this session (those
        // the cloud answered and those that failed after being handed over), and their size as sent (base64 of the
        // WAV file). Once there is one, the line never says "0 bytes" or "left this computer" without them: the
        // figure is everything the app handed over, sound included.
        const bytes = (b: number) => `${b.toLocaleString('en-US')} byte${b === 1 ? '' : 's'}`;
        const cards = `${n.cards} card${n.cards === 1 ? '' : 's'}`;
        const maybe = n.attempts ? `${n.attempts} cloud request${n.attempts === 1 ? '' : 's'} failed after being handed over` : '';
        const notCounted = `What the SDK adds on the wire is not counted${settingsAsked ? ', nor is the settings request (no question in it)' : ''}.`;
        const maybeNote = maybe ? ` Not in the number: ${maybe} and may have left (up to ${bytes(n.attemptBytes)}).` : '';
        if (voice?.clips) {
          const sound = `${voice.clips} recording${voice.clips === 1 ? '' : 's'} of a spoken question (${bytes(voice.bytes)} of sound, as you said it, no name swap)`;
          const text = n.cardsLeft ? ` and ${n.cardsLeft} card request${n.cardsLeft === 1 ? '' : 's'}, the question only (${bytes(n.bodyBytes)})` : '';
          return {
            state: 'sent' as const, figure: bytes(voice.bytes + n.bodyBytes), label: 'handed to Google\'s cloud by this app',
            scope: `${sound}${text}; ${cards} this session. ${notCounted}${maybeNote}`,
          };
        }
        if (n.cardsLeft) {
          return {
            state: 'sent' as const, figure: bytes(n.bodyBytes), label: 'handed to cloud help',
            scope: `in ${n.cardsLeft} request${n.cardsLeft === 1 ? '' : 's'}, the question only (${n.namesWithheld + n.otherWithheld} About me word${n.namesWithheld + n.otherWithheld === 1 ? '' : 's'} swapped out first); ${cards} this session. ${notCounted}${maybeNote}`,
          };
        }
        if (n.attempts) return { state: 'maybe' as const, figure: `up to ${bytes(n.attemptBytes)}`, label: 'may have left this computer', scope: `${maybe}; ${cards} this session.${settingsAsked ? ' The settings request (no question in it) is not counted.' : ''}` };
        // with cloud help on, the app has asked Remote Config for its settings: a request, though none for a card
        return { state: 'none' as const, figure: bytes(0), label: settingsAsked ? 'of any question left this computer' : 'left this computer', scope: `${cards} this session · page load ${settingsAsked ? 'and the settings request (no question in it) ' : ''}not counted` };
      },
      howHeading: 'How this is counted',
      how: 'The bytes are the UTF-8 length of the request this app handed to the SDK for the cloud step (the model name and mode, the fixed instructions, the schema and the swapped question), kept when the SDK reported that the cloud answered; a card where nothing left counts 0. A request that was handed to the SDK and failed is listed apart as "maybe", with its size: the app cannot tell whether it reached the cloud. The body is in the export, so the count can be checked by hand. Not counted: what the SDK makes of it on the wire (its own format, headers, the App Check token), which this app does not see and which carries no family data. "Withheld" counts the About me words swapped for labels such as "Person A". "Checked after" searches the sent text for About me words and photo bytes once more, after the fact.',
      settingsNote: 'Also not counted: the one request to Firebase Remote Config made when cloud help is on (the app id and an installation id; no question, nothing from About me).',
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
    narrow: (level: number, max: number) => `A narrowing card (${level} of ${max}): they chose the way out, so an AI suggested broader choices from the question and what did not fit. The same rules checked them.`,
    narrowRules: "The AI's choices were more of the same kind, or too few, so the app's rules made these broader ones.",
    narrowNone: 'No good next choices came out, so there is no narrowing card. Ask them to show you, or to write or draw it.',
    narrowNeedsAi: 'Narrowing needs an AI: the one built into Chrome on a computer, or online help.',
    narrowFailed: 'Online help did not answer, so there is no narrowing card. Try again, or ask them to show you.',
    narrowSay: 'Something else, then:',
    cloudOptionsUnfit: "The cloud's options didn't fit; the card made on this computer is kept.",
    holdUpTwo: 'The real options are not known: hold up two and point to each as you ask.',
    ranOffline: 'Ran on this computer (offline). Nothing was sent.',
    personalKept: 'Every choice on this card is from About me, so cloud help is not asked: it never sees About me.',
    /**
     * One plain sentence for the partner. The service's or the SDK's own message is not in it (17 Nov: a card on the
     * hosted copy read "Cloud step failed (AppCheck: Requests throttled…"); the step trace keeps that message whole.
     */
    cloudFailed: (reason: 'busy' | 'check' | 'down', kept: boolean) =>
      `${{ busy: 'Cloud help was busy (too many requests this minute)', check: 'Cloud help could not confirm this browser (App Check)', down: 'Cloud help did not answer' }[reason]}${kept ? ', so the card made on this computer is kept' : ''}; the service's own words are under "Where each step ran".`,
    cloudRetried: 'Cloud help did not answer the first time and was asked once more. The first request may have left this computer too; the receipt counts it under "may have left".',
    cloudBusyBlocked: 'Cloud help is busy right now (too many requests this minute), so there is no card. Try again in a moment, or just ask normally and give time.',
    cloudDownBlocked: 'Cloud help did not answer, so there is no card. Try again, or just ask normally and give time.',
    cloudCheckBlocked: 'Cloud help could not confirm this browser, so there is no card. Load the page again and try once more, or just ask normally and give time.',
    moreOnNext: (labels: string, escape: string) => `More on the next page: ${labels}. "${escape}" on the card, or "Next: more choices", shows the next page.`,
    lastPage: 'The rest of the choices for this question.',
    feelingMore: (labels: string, escape: string) => `If none of the three fits: "${escape}" on the card, or "Next: more choices", shows ${labels}.`,
    negativeAsked: 'Your question had a "not" in it. The card asks it the plain way, so yes means yes.',
    optOutAsked: 'Asked as one yes / no question: the "or …?" at the end is the "no" on the card.',
    listedAll: 'You named three, so all three are on the card.',
    ownAll: 'All three are the family\'s own, from About me, so they share one card.',
    leadIn: 'The first part tells them something; the card asks the question that follows it.',
    noticeLead: 'The first part points at something; the card asks the question that follows it.',
    listedByYou: 'You named the answers after the question, so exactly those are on the card.',
    timeLine: 'A "when" question gets a fixed line of three times, the same every time you ask. If none fits, the way out is there: then offer two times of your own.',
    painLine: 'The scale you named is on the card as a line of numbers. Run your finger along it as you ask, then wait.',
    painLineSay: (lo: number, hi: number) => `Point to a number: ${lo} is ${lo === 0 ? 'no pain' : 'hardly any'}, ${hi} is the worst.`,
    hiddenSubject: (word: string) => `Not sent: this question turns on "${word}" from About me, and cloud help never sees About me, so it could only guess.`,
    hiddenBlocked: (word: string) => `This question turns on "${word}" from About me. Cloud help never sees About me, so it was not asked and there is no card. Just ask normally and give time.`,
    page: (i: number, n: number, escape: string) => `Page ${i} of ${n}: "${escape}" shows the next ones.`,
    tellPrefix: "Tell, don't test: ",
    memoryBlocked: 'This one asks them to remember, so there is no card. Try saying it instead.',
    noChoicesBlocked: 'No good choices came out for this one, so there is no card. Just ask normally and give time.',
    notReadyCloudPossible: "The private helper isn't ready on this computer, so there are no choices for this one.",
    notReadyNoCloud: "The private helper isn't ready on this computer and cloud help is not configured on this copy. Just ask normally.",
    justAsk: (q: string) => `Just ask normally: ${q}`,
    oneOption: (label: string) => `Only one real option was there ("${label}"), so it is asked as a yes / no question. A way out such as "something else" is not counted as a choice.`,
    recognition: 'Only things from About me are on this card; nothing is made up.',
    unseenWho: 'You were not there, so only they know who it was. The card offers the people About me names, a few at a time; nothing is made up.',
    // step trace, plain words
    trace: {
      notNeeded: 'not needed: this card is made by rules alone',
      deviceNotReady: 'the private helper is not ready on this computer',
      deviceGot: 'got the question and the About me lists',
      cloudOff: 'cloud help is off',
      cloudUnconfigured: 'cloud help is not configured on this copy',
      cloudNotNeeded: 'not needed: the card made on this computer was good enough',
      cloudLeak: 'not sent: the question still held an About me word',
      cloudHidden: 'not sent: the question turns on an About me word the cloud never sees',
      cloudGot: 'got the question only, About me words swapped out',
      cloudOffline: 'the cloud was unreachable, so the stripped question ran on this computer',
      codeRan: 'applied the card rules',
      narrowDevice: 'got the question, what did not fit, the answers so far and the About me lists',
      narrowCloud: 'got the question and what did not fit, About me words swapped out; never the answers so far',
    },
  },
} as const;

// ---------------------------------------------------------------- this phone / this tablet / this computer
// The strings above say "this computer". On a phone or a tablet that is the wrong word, so the client names its
// device once (`setCopyDevice`) and every string, and every string a copy function returns, follows. The default is
// 'computer': the text above, unchanged (Node, the tests, a desktop browser).

export type DeviceKind = 'computer' | 'phone' | 'tablet';

/**
 * Which word fits the device, from what the browser reports. Tablets first: an iPad's user agent also says "Mobile",
 * an Android tablet's says "Android" without "Mobile", and iPadOS can pose as a Mac (then it has a touch screen).
 */
export function deviceKindFrom(n: { userAgent?: string; mobile?: boolean; platform?: string; maxTouchPoints?: number }): DeviceKind {
  const ua = n.userAgent ?? '';
  if (/iPad|Tablet|PlayBook|Silk|Kindle/i.test(ua)) return 'tablet';
  if (/Android/i.test(ua) && !/Mobile/i.test(ua)) return 'tablet';
  if (n.platform === 'MacIntel' && (n.maxTouchPoints ?? 0) > 1) return 'tablet';
  if (/Mobi|iPhone|iPod|Android/i.test(ua) || n.mobile === true) return 'phone';
  return 'computer';
}

/**
 * One sentence that is about where Gemini Nano can run, not about the device in hand: on a phone it must not read as
 * "Gemini Nano on this phone".
 */
const NOT_THIS_DEVICE: [string, string][] = [
  ['Gemini Nano on this computer reads About me', 'Gemini Nano reads About me on the device itself, where the browser has it (desktop Chrome)'],
];

/** "this computer" → "this phone" / "this tablet" (and "the computer" → "the phone") in one string. */
export function deviceWords(text: string, kind: DeviceKind): string {
  if (kind === 'computer') return text;
  let out = text;
  for (const [from, to] of NOT_THIS_DEVICE) out = out.split(from).join(to);
  // ("the computer" is the device in hand as well: "Turn the computer to them", "Give the computer back")
  return out.replace(/\b([Tt])his computer\b/g, `$1his ${kind}`).replace(/\b([Tt])he computer\b/g, `$1he ${kind}`);
}

type Node = Record<string, unknown>;
const isObject = (v: unknown): v is Node => typeof v === 'object' && v !== null;
function snapshot(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(snapshot);
  if (isObject(v)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, snapshot(x)]));
  return v;
}
/** A value with the device's word in every string of it (a copy function may return a string or an object of them). */
function worded(v: unknown, kind: DeviceKind): unknown {
  if (typeof v === 'string') return deviceWords(v, kind);
  if (Array.isArray(v)) return v.map((x) => worded(x, kind));
  if (isObject(v)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, worded(x, kind)]));
  return v;
}
const ORIGINAL = snapshot(COPY) as Node;
let device: DeviceKind = 'computer';

function apply(target: Node | unknown[], source: Node | unknown[], kind: DeviceKind) {
  for (const [k, v] of Object.entries(source)) {
    const t = target as Node;
    if (typeof v === 'string') t[k] = deviceWords(v, kind);
    else if (typeof v === 'function') t[k] = kind === 'computer' ? v : (...a: unknown[]) => worded((v as (...x: unknown[]) => unknown)(...a), kind);
    else if (isObject(v) || Array.isArray(v)) apply(t[k] as Node, v as Node, kind);
  }
}

/** Names the device for every string in `COPY`, in place, so every module that imported it reads the same words. */
export function setCopyDevice(kind: DeviceKind): void {
  device = kind;
  apply(COPY as unknown as Node, ORIGINAL, kind);
}
export const copyDevice = (): DeviceKind => device;

export { COPY };
export type Copy = typeof COPY;
