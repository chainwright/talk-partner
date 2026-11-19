// The words of phase 10 of the build (19 Nov 2026): "His turn", where the person starts the conversation, and About
// them saved to a file and loaded from one. Same rules as core/copy.ts: plain, adult, no praise, no exclamation marks,
// never "him" or "her" (the name, or "they"), never "patient". Nothing here is medical advice.

const They = (name: string) => name || 'They';
const their = (name: string) => (name ? `${name}'s` : 'their');
const wants = (name: string) => (name ? `${name} wants` : 'They want');
const n = (k: number, one: string, many = `${one}s`) => `${k} ${k === 1 ? one : many}`;

export const P10 = {
  turn: {
    /** The big button on Home: the person's own words first, with their name when About them has one. */
    button: (name: string) => (name ? `${name}: I want to say something` : 'I want to say something'),
    /** The manifest's shortcut (web/public/manifest.webmanifest) opens the same screen: tests/unit/phase10.test.ts keeps them equal. */
    shortcut: 'I want to say something',
    /** The second starter on the person's screen (it was "I want to tell you something"). */
    talk: 'I want to talk about…',
    /** The person's screen after it: the family's people and places from About them, the news / TV, and the way out. */
    talkAsk: 'I want to talk about…',
    talkSay: (xs: string[]) => `What do you want to talk about: ${[...xs, 'something else'].join(', ').replace(/, ([^,]*)$/, ', or $1')}?`,
    news: 'the news / TV',
    /** (19 Nov, role-play round 5) kept for later after the person's own "Not now" on the starters or on "I want to talk about…": a question the carer can ask, not the person's words. */
    laterAsk: 'Do you want to tell me something now?',
    /** What the carer reads first, over the answer: the person's words, then the questions. */
    line: {
      me: (name: string) => `${wants(name)} to talk about ${their(name)} own news.`,
      person: (name: string, who: string) => `${wants(name)} to talk about ${who}.`,
      place: (name: string, where: string) => `${wants(name)} to talk about ${where}.`,
      news: (name: string) => `${wants(name)} to talk about the news, or something on TV.`,
    },
    /** In the diary: "Frank started: Beth". */
    diary: (name: string) => `${They(name)} started:`,
    /** What the diary says for "me": "Frank started: own news". */
    diaryMe: 'own news',
    /** The questions the rules offer per kind of thing picked (core/turn.ts, talkAsk). Each is a card the rules make. */
    ask: {
      visit: (who: string) => `Is it about ${who}'s visit?`,
      call: (who: string) => `Would you like to call ${who}?`,
      happenedWith: (who: string) => `Did something happen with ${who}?`,
      happenedAt: (where: string) => `Did something happen at ${where}?`,
      go: (where: string) => `Would you like to go to ${where}?`,
      news: 'Is it the news, or something on TV?',
      tvOn: 'Shall we put the TV on?',
    },
  },
  backup: {
    heading: 'Keep a copy',
    /** The one plain line on what the file is for. */
    use: 'Use it to move to a new phone, to set up a second carer\'s phone, or as a spare copy.',
    lock: 'The file is made here and saved where you choose. The app sends it nowhere. It holds names and photos: keep it somewhere private.',
    save: 'Save About them to a file',
    load: 'Load About them from a file',
    health: 'Include health notes',
    /** Why the box is off every time. */
    healthWhy: 'Off unless you tick it: a file can be sent on or left on a shared computer, and health notes are private. The emergency number is always in the file.',
    fileName: 'talk-partner-about-them.json',
    preview: 'This file has:',
    has: {
      name: (x: string) => `The name: ${x}`,
      noName: 'No name',
      people: (k: number) => n(k, 'person', 'people'),
      places: (k: number) => n(k, 'place'),
      foods: (k: number) => n(k, 'food'),
      shows: (k: number) => `${n(k, 'show')} and music`,
      photos: (k: number) => n(k, 'photo'),
      facts: (k: number) => `${n(k, 'fact')} you kept`,
      health: (list: string) => (list ? `Health notes: ${list}` : 'Health notes: none ticked or written'),
      noHealth: 'No health notes: the ones here stay as they are',
      saved: (when: string) => `Saved on ${when}`,
    },
    replaceWhat: 'Replace: About them and the photos here become the file\'s.',
    addWhat: 'Add: what is in the file is added to what is here. Nothing here is removed.',
    stays: 'The diary and what the app learned stay as they are. Nothing changes until you pick.',
    replace: 'Replace what is here',
    add: 'Add to what is here',
    cancel: 'Cancel',
    replaced: 'About them was replaced with the file.',
    added: 'What was in the file was added to About them.',
    full: (k: number) => ` ${n(k, 'photo')} did not fit: the app keeps 60.`,
    bad: {
      json: 'This file could not be read. Choose a file saved by "Save About them to a file".',
      kind: 'This is not an About them file from Talk Partner.',
      version: 'This file is from a newer version of the app. Update the app, then try again.',
      shape: 'This file is damaged: something in it is not as the app saved it.',
      big: 'This file is too big to be an About them file.',
    } as Record<string, string>,
  },
} as const;
