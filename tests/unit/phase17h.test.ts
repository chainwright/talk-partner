// Phase 17 H (a live walk on 9f2a3d7, 24 Nov 2026): after a typed "want something?" → yes, the next card "Is it about
// food or drink, people, or plans?" ended on "About food or drink" and "Ask another question". Each topic must go on.
import { describe, expect, it } from 'vitest';
import { after, WHAT_TOPIC } from '../../core/tree';
import { EMPTY_PROFILE } from '../../core/types';

describe('H. the topic card after a typed "want something?" never ends on a topic', () => {
  const card = { asked: WHAT_TOPIC, kind: 'choice' as const };
  const P = { ...EMPTY_PROFILE, personName: 'Frank' };
  it('food or drink goes on to hungry / a drink', () => {
    expect(after(card, 'about food or drink', P).next).toEqual(['Are you hungry?', 'Would you like something to drink?']);
  });
  it('people and plans go on, and something else offers a way to show it', () => {
    expect(after(card, 'people', P).next?.length).toBeGreaterThan(0);
    expect(after(card, 'plans', P).next).toEqual(['Would you like to stay in or go out?']);
    expect(after(card, 'something else', P).end).toMatch(/show|write|point/i);
  });
});
