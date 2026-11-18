// Judge round 6 (18 Nov 2026), P0: the first screen said "Hand over the phone: them can start." when About them had
// no name. Every string a person can read is scanned here with an empty name: the object form "them" must never
// stand where a subject belongs.
import { describe, expect, it } from 'vitest';
import { COPY } from '../../core/copy';
import { P4 } from '../../core/copy4';
import { P5 } from '../../core/copy5';
import { P6 } from '../../core/copy6';
import { treeEnds } from '../../core/tree';

/** Every string of a copy group; every function is called with empty strings (and again with zeros) for its arguments. */
function strings(v: unknown, out: string[] = []): string[] {
  if (typeof v === 'string') out.push(v);
  else if (typeof v === 'function') {
    for (const args of [['', '', '', ''], [0, 0, 0, 0], ['', [], '', '']]) {
      try { strings((v as (...a: unknown[]) => unknown)(...args), out); } catch { /* this argument shape does not fit the function */ }
    }
  } else if (Array.isArray(v)) v.forEach((x) => strings(x, out));
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => strings(x, out));
  return out;
}
// ("About them" is the name of a page: "About them has no such word" is right)
// (and "18 of them are open", "nothing of them is sent" are right as well)
const BAD = /(?<!About |\bof )\bthem (?:can|is|has|are|have|was|will)\b/i;

describe('with no name set, no string says "them can / them is / them has"', () => {
  it('the first screen: "they can start"', () => {
    expect(P4.turn.sub('')).toBe('Hand over the phone: they can start.');
    expect(P4.turn.sub('Frank')).toBe('Hand over the phone: Frank can start.');
  });
  it('every copy string (core/copy.ts, copy4.ts, copy5.ts, copy6.ts)', () => {
    const all = [...strings(COPY), ...strings(P4), ...strings(P5), ...strings(P6)];
    expect(all.length).toBeGreaterThan(900);
    expect(all.filter((s) => BAD.test(s))).toEqual([]);
    // the test can fail: the sentence judge round 6 found is caught
    expect(BAD.test('Hand over the phone: them can start.')).toBe(true);
  });
  it('every end line of the conversation trees', () => {
    const ends = treeEnds('');
    expect(ends.length).toBeGreaterThan(150);
    expect(ends.filter((s) => BAD.test(s))).toEqual([]);
    expect(ends.filter((s) => /\{/.test(s))).toEqual([]);
  });
});
