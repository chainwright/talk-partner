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

// Phase 9 (judge round 8, §2 items 14 and 15, the hound's F4 to F8): each number or line the documents were corrected
// on has a check here, so it cannot go stale again without the build going red.
import { needsCard } from '../../core/needs';

describe('docs truth (phase 9): the lines judge round 8 found stale', () => {
  const strings: string[] = [];
  const walk = (v: unknown) => { if (typeof v === 'string') strings.push(v); else if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') Object.values(v).forEach(walk); else if (typeof v === 'function') { try { walk((v as (...a: unknown[]) => unknown)('Frank', 'Frank', 'Frank')); } catch { /* needs other arguments */ } } };
  walk(COPY);
  it('no string of the app says "Google\'s paid service": no dated billing record is in the repository', () => {
    expect(strings.filter((s) => /paid service/i.test(s))).toEqual([]);
    expect(strings.filter((s) => s.includes('On the paid tier Google does not use prompts to improve its products')).length).toBeGreaterThanOrEqual(4);
  });
  it('JUDGES names the unit-test count that README\'s newest "Counts" line names, and not an old one', () => {
    const judges = /`npm run check` \(lint, types, (\d+) unit tests\)/.exec(read('JUDGES.md'))?.[1];
    expect(judges).toBeTruthy();
    expect(['2762', '2798']).not.toContain(judges);
    const readme = read('README.md');
    // (phase 11, 20 Nov 2026: the newest "Counts" line is the phase 11 section's; it was phase 10's, 2902)
    const newest = readme.slice(readme.indexOf('## Added on 20 Nov, phase 11'));
    const counted = /(\d{4}) unit tests/.exec(newest)?.[1];
    expect(counted, 'README "Added on 20 Nov, phase 11" names a unit-test count').toBeTruthy();
    expect(judges).toBe(counted);
    expect(['2849', '2902']).not.toContain(judges);
  });
  it('README no longer says the deploy of phase 8 is a later step', () => {
    expect(read('README.md')).not.toMatch(/the deploy is a later step/);
  });
  it('CLAIMS: no "no offline install" (pwa-check passes), and the needs board is nine needs and the way out', () => {
    const claims = read('CLAIMS.md');
    expect(claims).not.toMatch(/there is no offline install/);
    expect(claims).not.toMatch(/\beight (?:needs|tiles)\b/);
    const board = needsCard().choices;
    expect(board.filter((c) => c.role !== 'escape')).toHaveLength(9);
    expect(board).toHaveLength(10);
  });
  it('phase 8 was 18 Nov, not "18 to 19 Nov"', () => {
    for (const f of [...DOCS, 'devlog/DAY19.md']) expect(read(f), f).not.toContain('18 to 19 Nov');
  });
});

// Phase 10 (19 Nov 2026): the numbers the README's phase 10 section gives are the code's.
import { BACKUP_MAX_BYTES } from '../../core/backup';
import { TALK_PEOPLE, TALK_PLACES } from '../../core/turn';
import { P10 } from '../../core/copy10';

describe('docs truth (phase 10): the person starts, About them in a file', () => {
  const flat = (t: string) => t.replace(/\s+/g, ' ');
  const readme = read('README.md');
  const at = readme.indexOf('## Added on 19 Nov, phase 10');
  const sec = flat(readme.slice(at, readme.indexOf('\n## ', at + 5)));
  it('the section exists, and holds no "Live:" line', () => {
    expect(at).toBeGreaterThan(0);
    expect(sec.length).toBeGreaterThan(500);
    expect(sec).not.toMatch(/\*\*Live:/);
  });
  it(`the size limit (${BACKUP_MAX_BYTES / 1024 / 1024} MB), the people (${TALK_PEOPLE}) and the places (${TALK_PLACES}) are the code's`, () => {
    const mb = `${BACKUP_MAX_BYTES / 1024 / 1024} MB`;
    expect(sec).toContain(`over ${mb}`);
    expect(sec).toContain(`up to ${TALK_PEOPLE} people`);
    expect(sec).toContain(`up to ${TALK_PLACES} places`);
    expect(flat(read('CLAIMS.md'))).toContain(`over ${mb}`);
    expect(flat(read('devlog/DAY20.md'))).toContain(`The size limit is ${mb}`);
  });
  it('the shortcut, the button and the use line are the manifest\'s and the app\'s words', () => {
    const m = JSON.parse(read('web/public/manifest.webmanifest')) as { shortcuts: { name: string; url: string }[] };
    expect(sec).toContain(`\`${m.shortcuts[0].url}\``);
    expect(sec).toContain(`"${P10.turn.button('Frank')}"`);
    expect(sec).toContain(`"${P10.turn.button('')}"`);
    expect(sec).toContain(P10.backup.use.replace(/'/g, "'"));
  });
});

// Phase 12 (judge round 9, P1): the lines round 9 found stale, each with a check, so they cannot go stale again.
describe('docs truth (phase 12): the lines judge round 9 found stale', () => {
  it('no document says a phase that is live was "not deployed" or "nothing … was deployed"', () => {
    for (const f of DOCS) {
      const t = read(f).replace(/\s+/g, ' ');
      expect(t, f).not.toMatch(/Nothing of phase \d+ (?:is|was) deployed|Nothing was deployed or pushed; the "Live:" lines still name/);
    }
  });
  it('JUDGES: no old App Check refusal as the state of the hosted copy, and no "three places" for the AI', () => {
    const j = read('JUDGES.md').replace(/\s+/g, ' ');
    expect(j).not.toMatch(/on the evening of 17 Nov it refused ours/);
    expect(j).not.toMatch(/AI is used in three places/);
    expect(j).toMatch(/AI is used in these places/);
    for (const step of ['Read aloud', 'Narrow it down', 'Today in short', 'spoken question']) expect(j).toContain(step);
  });
  it('JUDGES: a 12-line phone path comes first, before the "Live:" line, and names what the app shows', async () => {
    const j = read('JUDGES.md');
    const top = j.slice(0, j.indexOf('**Live: the build of'));
    expect(top).toContain('**On a phone first, in 12 steps**');
    const steps = top.split('\n').filter((l) => /^\d+\. /.test(l));
    expect(steps.map((l) => Number(l.split('.')[0]))).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    const { COPY } = await import('../../core/copy');
    const { WEAK_NUMB } = await import('../../core/topics');
    for (const s of [...COPY.simple.tryAi.strip, COPY.simple.tryAi.label, COPY.simple.sample, WEAK_NUMB, "I can't go on"]) expect(top, s).toContain(s);
  });
});
