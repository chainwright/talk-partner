// "Show to person" lifts the card (a view transition on the card itself). Pinned here: it is short, it is skipped
// under prefers-reduced-motion both in the script and in the stylesheet, and a browser without view transitions just
// changes the screen. The behaviour in a real browser is checked by scripts/shots.mjs. Written 16 Nov 2026.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..', '..');
const css = readFileSync(join(ROOT, 'web/src/styles.css'), 'utf8');
const main = readFileSync(join(ROOT, 'web/src/main.ts'), 'utf8');

describe('lift the card', () => {
  it('lasts 250 ms at most', () => {
    const durations = [...css.matchAll(/::view-transition-[a-z-]+\([^)]*\)[^{]*\{[^}]*animation-duration:\s*([\d.]+)s/g)].map((m) => Number(m[1]));
    expect(durations.length).toBeGreaterThanOrEqual(3);
    for (const d of durations) expect(d).toBeLessThanOrEqual(0.25);
  });
  it('the card is named for the transition only while one runs', () => {
    expect(css).toMatch(/:root\[data-lift\] #person \{ view-transition-name: tp-card; \}/);
    expect(css.match(/view-transition-name:/g)).toHaveLength(1);
  });
  it('prefers-reduced-motion: the script starts no transition, and the stylesheet switches its animations off as well', () => {
    const draw = main.slice(main.indexOf('function draw()'), main.indexOf('// ---', main.indexOf('function draw()')));
    expect(draw).toContain("matchMedia('(prefers-reduced-motion: reduce)').matches");
    expect(draw).toContain("'startViewTransition' in document");
    expect(draw).toMatch(/if \(!lifting\) \{ render\(\); return; \}/);
    const reduced = css.slice(css.lastIndexOf('@media (prefers-reduced-motion: reduce)', css.indexOf('::view-transition-group(*)')));
    expect(reduced).toMatch(/::view-transition-group\(\*\), ::view-transition-old\(\*\), ::view-transition-new\(\*\) \{ animation: none !important; \}/);
  });
  it('only "Show to person" and the way back start it', () => {
    expect(main.match(/lift = true;/g)).toHaveLength(2);
    expect(main).toContain("case 'show': lift = true; go('person'); break;");
  });
});
