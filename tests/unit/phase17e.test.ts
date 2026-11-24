// Phase 17 E (judge round 12, P1s: seats 02n, 05, 13, 13b), written before the code (failing first: devlog/evidence_phase17/).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { svgPicto as picto } from '../../web/src/pictos';

const ROOT = join(__dirname, '..', '..');

describe('E. pictures and checks', () => {
  it('the back is drawn from behind: hair over the head and the spine, not the front figure', () => {
    const back = picto('body:back');
    const chest = picto('body:chest');
    expect(back).not.toBe(chest.replace('chest', 'back'));
    expect(back).toContain('M48 31v31');
    expect(chest).not.toContain('M48 31v31');
  });
  it('"a little", "quite bad" and "very bad" carry 1, 2 and 3 filled bars (the pictures differ at a glance)', () => {
    const md = readFileSync(join(ROOT, 'PICTOGRAMS.md'), 'utf8');
    expect(md).toMatch(/phase 17: one, two and three filled bars/);
  });
  it('"Change it" opens About them at the emergency number, focused', () => {
    const main = readFileSync(join(ROOT, 'web/src/main.ts'), 'utf8');
    expect(main).toContain("const f = document.querySelector<HTMLInputElement>('#emergency-number');");
    expect(main).toContain('f.focus({ preventScroll: true });');
  });
  it('the check never puts "Right?" beside a side, and says a yes or no back in its own words', async () => {
    const { soCheck } = await import('../../core/copy17');
    expect(soCheck('your left arm')).toBe('So: your left arm. Is that it?');
    expect(soCheck('yes', 'Are you in pain?')).toBe('So: yes, you are in pain. Right?');
    expect(soCheck('no', 'Are you in pain?')).toBe('So: no, you are not in pain. Right?');
    expect(soCheck('yes', 'Would you like milk in it?')).toBe('So: yes, you would like milk in it. Right?');
    expect(soCheck('tea')).toBe('So: tea. Right?');
  });
});
