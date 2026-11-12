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

/** One-tap questions, one of each card kind. */
export const SAMPLE_QUESTIONS: { q: string; shows: string }[] = [
  { q: 'Do you want coffee or tea?', shows: 'either-or, read in code' },
  { q: 'Do you need the toilet?', shows: 'yes / no, no AI needed' },
  { q: 'How was therapy today?', shows: 'feeling scale' },
  { q: 'Where does it hurt?', shows: 'body map, never AI' },
  { q: 'What year did we get married?', shows: "tell, don't test" },
  { q: 'What do you want to do this weekend?', shows: 'open question: the model proposes' },
  { q: 'Who should we call tonight?', shows: 'household left out' },
  { q: 'Should we ring Jen or Tyler?', shows: 'nickname swapped like a name' },
  { q: 'Which shirt for the doctor?', shows: 'weak card: cloud help, or hold two up' },
];
