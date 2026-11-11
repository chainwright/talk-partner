import type { Profile } from '../../src/pipeline/types';

// A different household from the validation fixture, so the tests don't echo the tuning set.
export const PROFILE: Profile = {
  personName: 'Alan',
  partnerName: 'Maria',
  people: [
    { id: 'p1', name: 'Maria', relation: 'wife', household: true },
    { id: 'p2', name: 'Sam', relation: 'son', household: true },
    { id: 'p3', name: 'Grace', relation: 'daughter', household: false },
    { id: 'p4', name: 'Leo', relation: 'grandson', household: false },
    { id: 'p5', name: 'Peter', relation: 'brother', household: false },
  ],
  foods: ['lamb', 'rice', 'salad', 'omelette'],
  places: ['allotment', 'library', 'pub', 'market'],
  tv: ['cricket', 'cooking shows', 'westerns'],
  music: ['Elvis', 'folk', 'opera'],
  other: ['cat called Biscuit', 'Leeds United'],
};
