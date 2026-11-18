// The words of the fix of 18 Nov 2026 after the owner's walk on his phone: after "something else" the carer did not
// know how to find out WHAT else. The screen now leads one step at a time, by rules, with no AI in the first steps.
// Same rules as core/copy.ts: plain, adult, no praise, no exclamation marks, never "him" or "her".

export const P7 = {
  out: {
    /** The one line at the top of the screen after "something else" (the owner's wording). */
    heading: 'None of these. Find out what it is: one step at a time.',
    more: 'More choices like these',
    /** Under it: what the next card will offer first ("water, juice, milk"). */
    moreSub: (first: string[]) => `Next: ${first.join(', ')}. Then more, three at a time.`,
    about: 'What is it about?',
    aboutSub: 'A drink, food, a person, a place, the body, a feeling.',
    where: 'Show me where',
    whereSub: 'The body card: they point to the place.',
    needs: 'Open the needs board',
    needsSub: 'Toilet, pain, too hot, too cold, tired, call someone.',
    /** Under the list, when the last way is the AI's. */
    narrowLast: 'The last way, when the others did not find it:',
    /** After a card of more choices was used up. */
    used: 'That was every choice of this kind the app has.',
  },
  more: {
    ask: { drink: 'Which drink?', food: 'What to eat?', people: 'Who?', place: 'Where?', activity: 'What to do?' } as Record<string, string>,
    note: 'More choices of the same kind: a fixed list, then the words from About them. Made by the rules: no AI, nothing sent.',
    why: 'the rules: more choices of the kind that was asked about',
    next: (q: string) => `Next: ${q}`,
  },
  about: {
    ask: 'What is it about?',
    items: ['a drink', 'food', 'a person', 'a place', 'my body', 'a feeling'],
    note: 'A fixed card: what it is about. Made by the rules: no AI, nothing sent.',
    why: 'the rules: a fixed card for when the kind is not known',
  },
  understood: {
    ask: 'Did you understand?',
    yes: 'Yes: type it',
    hint: 'One or two words. They will see it, point to it and say yes or no.',
    go: (name: string) => `Check it with ${name || 'them'}`,
    no: 'Not yet: try another way',
    /** The question a typed word stands under, on the card and in the diary, when no question was open. */
    q: 'Is this it?',
    note: 'You typed this word after they showed, wrote or drew it. Made by the rules: no AI, nothing sent.',
    why: 'the rules: the word the carer typed, for the person to confirm',
  },
} as const;
