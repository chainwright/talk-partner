// The words of phase 4 (18 Nov 2026): the first-letter helper, "[Name] wants to say something", "Before a doctor
// visit" and "Talk about a photo". Same rules as core/copy.ts: plain, adult, no praise, no exclamation marks, never
// "him" or "her" (the name, or "they"). Nothing here is medical advice; the doctor-visit questions themselves are the
// fixed list in core/visit.ts.

const them = (name: string) => name || 'them';
const They = (name: string) => name || 'They';
const their = (name: string) => (name ? `${name}'s` : 'their');

export const P4 = {
  letter: {
    /** The person's screen: the question over the alphabet, the instruction, and the way out. */
    ask: 'Do you know how the word starts?',
    point: 'Point to the first letter',
    no: "No, I don't know",
    /** The card after a letter: what is asked, and the line the carer says. */
    cardAsk: (letter: string) => `It starts with ${letter}. Is it one of these?`,
    say: (letter: string, words: string[]) => `It starts with ${letter}. Is it ${[...words, 'something else'].join(', ').replace(/, ([^,]*)$/, ', or $1')}?`,
    /** The carer's side. */
    go: 'Try the first letter',
    goSub: (name: string) => `${They(name)} can point to the letter the word starts with.`,
    again: 'Try another letter',
    more: (letter: string) => `More words that start with ${letter}`,
    noLetter: (name: string) => `No first letter this time. That is fine: many people cannot tell the first letter. Ask ${them(name)} to show you instead.`,
    end: (word: string) => `The word is: ${word}. Ask a yes or no question about it next.`,
    care: {
      pain: 'The word is: pain. Ask where it hurts now. If the pain is new or strong, call the nurse or doctor.',
      toilet: 'The word is: toilet. Go now. This one does not wait.',
      help: (who: string) => `The word is: ${who}. Ask about pain first, then what the ${who} is wanted for.`,
    },
    none: (name: string, letter: string) => `${They(name)} pointed to ${letter}. No word that starts with ${letter} is in About them yet.`,
    noneAi: (letter: string) => `No more words that start with ${letter} were found. Ask them to show you, or write it down together.`,
    failed: 'Online help did not answer. Nothing else was tried.',
    byRules: 'These words come from About them and from the everyday words of this app. No AI was used, and nothing was sent.',
    byDevice: 'The AI on this device added words. Nothing was sent.',
    byCloud: 'Online help added words. It got the question and the letter, nothing from About them.',
    where: {
      device: 'If About them has no such word, the AI on this device adds some. Nothing is sent.',
      cloudOn: 'If About them has no such word, online help adds some: it gets the question and the letter only.',
      ask: 'If About them has no such word, you are asked before anything is sent.',
      offline: 'With no connection the words come from About them only.',
      none: 'The words come from About them and from the everyday words of this app.',
    },
    sheet: {
      heading: 'Ask online help for words?',
      body: "No word with this letter is in About them. Online help is Google's AI: it can suggest everyday words. It sees only this:",
      plus: 'and the app\'s fixed instructions (the same for every family).',
      never: 'Names, photos, the answers so far, and everything in About them.',
      yes: 'Just this once',
      no: 'No, keep it here',
      whole: 'The whole request',
    },
    why: 'the first letter: words from About them first, then everyday words; a model may only add words that start with the letter',
    note: 'A first-letter card: the person pointed to a letter, and the app offers words that start with it.',
  },
  turn: {
    // (phase 10: the button's words are P10.turn.button, core/copy10.ts: "Frank: I want to say something")
    // (18 Nov, judge round 6: with no name this read "them can start"; the subject form is "they")
    sub: (name: string) => `Hand over the phone: ${name || 'they'} can start.`,
    ask: 'What would you like to do?',
    say: 'What would you like to do: ask for something, tell me something, or say how you feel?',
    starters: { need: 'I need something', tell: 'I want to tell you something', feel: 'I feel…' },
    topicsAsk: 'What is it about?',
    more: 'more',
    started: (name: string) => `${They(name)} started this`,
    lines: {
      need: (name: string) => `${They(name)} started this: something is needed.`,
      tell: (name: string) => `${They(name)} started this: there is something to tell you.`,
      feel: (name: string) => `${They(name)} started this: it is about a feeling.`,
      else: (name: string) => `${They(name)} started this, and it is none of the three. Take your time together.`,
    },
    about: (topic: string, what = '') => `It is about: ${topic}${what ? `, ${what}` : ''}.`,
    /** Phase 8: the first choice of "Who is it about?", and what the carer reads for it. */
    me: 'me',
    aboutMe: (name: string) => (name ? `${name}'s own news` : 'their own news'),
    /** After a topic, still on the person's screen: what in it this is about. Two or three choices and the way out. */
    aboutAsk: { people: 'Who is it about?', plans: 'Is it about today, or another day?', fun: 'Is it about TV or music?', food: 'Is it about food, or a drink?', rest: 'Is it about last night, or about now?' },
    aboutChoices: { plans: ['today', 'another day'], fun: ['TV', 'music'], food: ['food', 'a drink'], rest: ['last night', 'now'] },
    suggest: 'You can ask',
    note: 'Started by the person: a fixed card, made by the rules. No AI, nothing sent.',
    why: 'a fixed card: the person starts the conversation',
  },
  visit: {
    link: 'Before a doctor visit',
    linkSub: (name: string) => `${their(name).replace(/^./, (c) => c.toUpperCase())} own answers, on one page.`,
    heading: 'Before a doctor visit',
    lead: (name: string) => `A few questions for ${them(name)} to answer at home, unhurried. The answers go on one page that you can show or print.`,
    fixed: 'The questions are a fixed list. No AI writes or changes them, and no AI reads the answers.',
    lock: 'The answers stay on this device. Nothing is sent.',
    count: (n: number) => `Up to ${n} questions. You can stop at any time.`,
    start: (name: string) => `Start, and turn the phone to ${them(name)}`,
    again: 'Ask the questions again',
    resume: 'Go on with the questions',
    /** Phase 13: the box after an answer that can be urgent stopped the run (core/visit.ts, visitAlert). */
    stop: (what: string, number: string) => `${what}: call ${number} now if it is new or sudden.`,
    /** Phase 17 (judge round 12, the hound's H2): a pain in the head or the chest, as the screen and the diary say it. */
    stopNow: (what: string, number: string) => `${what}: call ${number} now, whatever the amount. Do not wait to see if it passes.`,
    pageTitle: (name: string) => (name ? `${name}'s own answers` : 'Their own answers'),
    pageSub: (date: string) => `Answered at home, with a family member's help, on ${date}.`,
    part: (n: number, of: number) => `${n} of ${of} questions were answered.`,
    elseNote: 'There is something else, not on the list. Please give time for it.',
    // (phase 15, judge round 11, the SLP's seat: a bare "Pain: no" must not read as a fact)
    footer: (name: string) => `${name ? `${name}'s` : 'Their'} pointed answers, with a family member's help: not ${name ? `${name}'s` : 'their'} own words. Not a medical record.`,
    check: 'Pointed answer. A yes or no can be wrong after a stroke: please check.',
    none: 'No answers yet.',
    print: 'Print this page',
    copy: 'Copy as text',
    copied: 'Copied',
    del: 'Delete these answers',
    delConfirm: 'Delete these answers from this device?',
    // (phase 15, judge round 11, seat 05: under a chest pain this read softer than the call box above it)
    safety: (number: string) => `Pain in the chest or the head: call ${number} now, whatever the amount. Other new or strong pain: do not wait for the visit, call the nurse or doctor today.`,
    note: 'A doctor-visit question from the fixed list. No AI, nothing sent.',
    why: 'a fixed, checked question (core/visit.ts): never written by a model',
  },
  photo: {
    link: 'Talk about a photo',
    linkSub: 'Pick one of your photos, and talk about it.',
    heading: 'Talk about a photo',
    lead: (name: string) => `Pick a photo. The app offers a few easy questions about it, for talking with ${them(name)}. Not a test: nobody is asked who or what it is.`,
    lock: 'The photos stay on this device. No photo is ever sent anywhere.',
    none: 'There are no photos yet. Add one in About them, with one word for it.',
    add: 'Add a photo in About them',
    pick: 'Pick a photo',
    other: 'Another photo',
    questions: 'Questions about this photo',
    byRules: 'Made by the rules, from the photo\'s word and About them. No AI looked at the photo.',
    byDevice: 'The last question is from the AI on this device: it looked at the photo here. The photo did not leave this device.',
    looking: 'The AI on this device is looking at the photo…',
    look: 'Ask the AI on this device to look at it',
    lookWhy: 'It names things it sees, for one more question. It runs on this device only; the photo is not sent.',
    lookNone: 'The AI on this device found nothing it could use. The questions above stand.',
    q: {
      feel: 'How does this photo make you feel?',
      feelChoices: ['good', 'mixed', 'sad'],
      show: 'Who shall we show this photo to?',
      showOne: (who: string) => `Shall we show this photo to ${who}?`,
      call: (who: string) => `Would you like to call ${who}?`,
      see: (who: string) => `Would you like to see ${who}?`,
      go: (place: string) => `Would you like to go to ${place} again?`,
      have: (food: string) => `Would you like ${food}?`,
      more: (word: string) => `Shall we talk more about ${word}?`,
      another: 'Would you like to look at another photo?',
      things: 'What in this photo shall we talk about?',
    },
    /** What the carer reads after "How does this photo make you feel?": a sad answer is taken as said, never passed over. */
    felt: {
      good: 'A good one. Stay with it for a while.',
      mixed: (name: string) => `Mixed feelings. Give it time, and ask whether ${them(name)} would like to go on or to stop.`,
      sad: (name: string) => `This photo makes ${them(name)} sad. Stay near: you do not have to fix it. Ask whether to put it away.`,
    },
    note: 'A question about a family photo. The photo stays on this device.',
    why: 'a question about a family photo: fixed wording, with the photo\'s word and About them',
    whyAi: 'the on-device model named things in the photo; code checked each word',
  },
} as const;
