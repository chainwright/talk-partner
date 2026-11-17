// Judge mode: a made-up family, shared by every client. Synthetic data only (no real person).
import type { Profile } from './types';

export const SAMPLE_PROFILE: Profile = {
  personName: 'Frank',
  partnerName: 'Carol',
  people: [
    { id: 's1', name: 'Carol', relation: 'wife', household: true },
    { id: 's2', name: 'Jenny', relation: 'daughter', household: false, nickname: 'Jen' },
    { id: 's3', name: 'Tyler', relation: 'grandson', household: false },
  ],
  foods: ['pot roast', 'chili'],
  places: ['the lake', 'church', 'hardware store'],
  tv: ['Wheel of Fortune', 'Packers games'],
  music: ['Johnny Cash'],
  other: [],
};

/** Which of the judge-mode chip groups a question sits in (labels in core/copy.ts, `judge.groups`). */
export type SampleGroup = 'code' | 'coach' | 'model';

/**
 * One-tap questions, in the order a judge should click them: the open questions first (the on-device step and the
 * cloud step give different cards there), then the coaching, then the cards code decides alone. `q` is what gets asked (the chip's data and hover text); `short` is the
 * chip's label, so a group fits on one or two lines; `shows` is what the judge should see happen.
 */
export const SAMPLE_QUESTIONS: { q: string; short: string; group: SampleGroup; shows: string }[] = [
  // first: the open questions, where the step on this computer and the cloud step give different cards
  { q: 'What do you want to do this weekend?', short: 'this weekend?', group: 'model', shows: 'open question: on this computer the choices come from About me (the lake, church); with cloud help only, they are general' },
  { q: 'What would you like for dinner?', short: 'for dinner?', group: 'model', shows: 'open question: on this computer the family\'s own foods from About me (pot roast, chili); with cloud help only, general foods' },
  { q: 'Who should we call tonight?', short: 'who to call tonight?', group: 'model', shows: 'real names from About me, the person who lives here left out. On this computer nothing is sent; with cloud help only, the cloud gets the bare question and code puts the names in, so this card looks the same either way' },
  { q: 'How was therapy today, and did you eat?', short: 'therapy today, and did you eat?', group: 'coach', shows: 'two questions: one thing at a time, then Next; the first is a feeling scale' },
  { q: 'What year did we get married?', short: 'what year did we marry?', group: 'coach', shows: "tell, don't test" },
  { q: 'Do you want coffee or tea?', short: 'coffee or tea?', group: 'code', shows: 'either-or, read in code' },
  { q: 'Do you need the toilet?', short: 'the toilet?', group: 'code', shows: 'yes / no, no AI needed' },
  { q: 'Should we ring Jen or Tyler?', short: 'ring Jen or Tyler?', group: 'code', shows: 'nickname swapped like a name' },
  { q: 'Where does it hurt?', short: 'where does it hurt?', group: 'code', shows: 'body map, never AI' },
];
