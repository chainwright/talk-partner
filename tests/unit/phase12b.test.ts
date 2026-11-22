// Phase 12b (22 Nov 2026), the fixes of judge round 9b. Every new or changed line is walked on its worst case: can it
// help a carer dismiss pain, a need or distress? Each health item has a test that failed before its fix.
import { describe, expect, it } from 'vitest';
import { after } from '../../core/tree';
import { EMPTY_PROFILE } from '../../core/types';

const card = (asked: string) => ({ asked, kind: 'choice' as const });
const end = (asked: string, label: string, name = '') => after(card(asked), label, { ...EMPTY_PROFILE, personName: name }, []).end;

describe('1. The pain scale: pictures of pain, not anger; "quite bad" calls now', () => {
  it('the three faces are pictures made with Gemini (the Faces Pain Scale style), the words stay under them', async () => {
    const { builtinPicto, IMAGE_IDS, svgPicto } = await import('../../web/src/pictos');
    for (const [id, file] of [['pain mild', 'pain_mild'], ['pain medium', 'pain_medium'], ['pain strong', 'pain_strong']]) {
      expect(IMAGE_IDS, id).toContain(id);
      expect(builtinPicto(id), id).toContain(`src="/pictures/${file}.webp"`);
      // the drawing (the fallback) has no teeth and no grin: no white mouth on the strong face
      expect(svgPicto(id), id).not.toContain('fill="#ffffff"');
    }
  });
  it('the fallback drawings: brows raised at the inner ends (never the angry V)', async () => {
    const { svgPicto } = await import('../../web/src/pictos');
    for (const id of ['pain mild', 'pain medium']) {
      const m = svgPicto(id).match(/M(\d+) (\d+)l(\d+)(-?\d+)M(\d+) (\d+)l(-\d+)(-?\d+)/);
      expect(m, id).not.toBeNull();
      // the left brow goes up towards the middle, the right brow too
      expect(Number(m![4]), id).toBeLessThan(0);
      expect(Number(m![8]), id).toBeLessThan(0);
    }
  });
  it('"quite bad" takes the same route as "very bad": call the nurse or doctor now, never only the care plan', () => {
    for (const label of ['quite bad', 'very bad']) {
      const e = end('How bad is the pain?', label, 'Frank');
      expect(e, label).toMatch(/Call Frank's nurse or doctor now\b/);
      expect(e, label).toMatch(/call the emergency number/);
    }
    expect(end('How bad is the pain?', 'quite bad')).not.toMatch(/^Quite bad\. Follow/);
  });
});
