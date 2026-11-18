import { describe, expect, it } from 'vitest';
import { P7 } from '../../core/copy7';

// Role-play after the "something else" fix (18 Nov): a choice from "More choices like these" ended with nothing to do.
describe('a confirmed choice from a card of more choices ends with what to do', () => {
  it('names the person when a name is set, and "them" otherwise', () => {
    expect(P7.more.end('drink', 'juice', 'Frank')).toBe('Bring Frank juice.');
    expect(P7.more.end('drink', 'juice', '')).toBe('Bring them juice.');
  });
  it('every kind has a line, and none is empty or says him or her', () => {
    for (const k of ['drink', 'food', 'people', 'place', 'activity']) {
      const line = P7.more.end(k, 'x', '');
      expect(line.length).toBeGreaterThan(5);
      expect(line).not.toMatch(/\b(him|her|he|she)\b/i);
    }
  });
});
