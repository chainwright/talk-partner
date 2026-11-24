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
  it('only "Show to person", the quick-needs board and the way back start it', () => {
    // (five since 17 Nov: the way back is also the finish screen's "Give the phone back" and Enter on the carer's control)
    // (nine since 18 Nov, phase 4: the alphabet goes to the person and comes back, "[Name] wants to say something" opens on the person's screen, the visit questions do, and the carer's way back is one function, leavePerson)
    // (ten since 18 Nov: a word the carer typed after "show me" goes to the person's screen to be pointed to and confirmed)
    // (twelve since 18 Nov, phase 9: the person's own "Not now" goes back to the carer, or to the visit page)
    // (thirteen since 24 Nov, phase 17: "Add the next letter" puts the alphabet back on the person's screen)
    expect(main.match(/lift = true;/g)).toHaveLength(13);
    expect(main).toContain("case 'give-back': lift = true; if (state.p4.visitEnd) {");
    expect(main).toContain("case 'show': lift = true; go('person'); break;");
    // (since 17 Nov: "Quick needs" puts its board on the person's screen in the same gesture)
    expect(main).toContain("case 'needs': openNeeds(); lift = true; go('needs'); break;");
  });
});
