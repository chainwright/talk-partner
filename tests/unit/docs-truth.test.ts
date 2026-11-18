// Phase 8 (judge round 7, P0 1 and P1 13): the documents must not name an older build as the live one, nor say a
// phase that is live is "not deployed"; and no string on a phone may say that an AI reads anything on that phone.
// `LIVE_BUILD` is the placeholder of the "Live:" lines: whoever deploys writes the commit there.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { COPY, deviceWords } from '../../core/copy';

const ROOT = join(__dirname, '..', '..');
const read = (f: string) => readFileSync(join(ROOT, f), 'utf8');
const DOCS = ['README.md', 'JUDGES.md', 'EVIDENCE.md', 'CLAIMS.md'];
/** Builds that were live once and are not now: none may stand on a "Live:" line. */
const STALE = ['9d141b0', '45e8095', 'deebc94', '421dae0', '43e9293', '3a9cf34', 'd04e530', 'b9c7602', '3e09079', '4d7edee'];

describe('docs truth: what is live', () => {
  it('README and JUDGES each have a "Live:" line, with the placeholder or a commit that is not an older build', () => {
    for (const f of ['README.md', 'JUDGES.md']) {
      const lines = read(f).split('\n').filter((l) => /\*\*Live: the build of /.test(l));
      expect(lines.length, f).toBeGreaterThan(0);
      for (const l of lines) {
        const id = /Live: the build of `([^`]+)`/.exec(l)?.[1] ?? '';
        expect(id === 'LIVE_BUILD' || /^[0-9a-f]{7,40}$/.test(id), `${f}: ${l}`).toBe(true);
        expect(STALE.some((s) => id.startsWith(s)), `${f}: ${id} is an older build`).toBe(false);
      }
    }
  });
  it('no document says a phase is not deployed, or that the hosted copy still serves an older build', () => {
    for (const f of DOCS) {
      const t = read(f);
      expect(t, f).not.toMatch(/\bnot deployed\b|Not on the hosted copy yet|hosted copy still serves|Last done on 18 Nov 2026, 07:05/i);
      expect(t, f).not.toMatch(/`deebc94`, the last commit that\s+changes code/);
      expect(t, f).not.toMatch(/\bserves the build of commit `9d141b0`/);
    }
  });
});

describe('docs truth: no string on a phone says an AI reads anything on that phone', () => {
  const strings: string[] = [];
  const walk = (v: unknown) => { if (typeof v === 'string') strings.push(v); else if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') Object.values(v).forEach(walk); else if (typeof v === 'function') { try { walk((v as (...a: unknown[]) => unknown)('Frank', 'Frank', 'Frank')); } catch { /* a function that needs other arguments */ } } };
  walk(COPY);
  it('the walk found the strings (the test is not empty)', () => expect(strings.length).toBeGreaterThan(300));
  for (const kind of ['phone', 'tablet'] as const) {
    it(`on a ${kind}: no "AI … reads / looks … this ${kind}", no "built-in AI … this ${kind}"`, () => {
      const bad = strings.map((s) => deviceWords(s, kind)).filter((s) => s.split(/(?<=[.;:])\s/).some((x) => new RegExp(`(?:\\bAI\\b|Gemini Nano)[^.;]*\\b(?:reads?|looks?|writes?)\\b[^.;]*\\bon this ${kind}\\b|built-in AI[^.;]*\\bthis ${kind}\\b`).test(x)));
      expect(bad).toEqual([]);
    });
  }
  it('the line under "Answers so far" says on a phone that no AI reads them there', () => {
    expect(deviceWords(COPY.about.historyNote, 'phone')).toContain("that AI reads today's answers on that computer itself (on a phone no AI reads them)");
  });
  it('"Nothing you asked has left this phone" says which time it counts: since the app was opened', () => {
    expect(deviceWords(COPY.simple.privacy.none, 'phone')).toBe('Nothing you asked has left this phone since the app was opened.');
  });
});
