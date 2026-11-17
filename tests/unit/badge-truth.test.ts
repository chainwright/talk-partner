import { describe, expect, it } from 'vitest';
import { assemble } from '../../core/pipeline';
import type { ModelOutput } from '../../core/types';
import { PROFILE } from './fixtures';

// Simulation 16.11 (H09, C09): a negative tag question only the model reads as yes / no.
// The card is yes / no either way, but the badge must name the engine that decided it.
describe('badge truth: "No AI needed" only when code decided the card', () => {
  const o: ModelOutput = { topic: 'going out', kind: 'yesno', choices: [] };
  const neg = "You don't want to go out tonight, do you?";

  it('a yes / no seen only by the on-device model is badged on-device, not code', () => {
    const c = assemble(neg, null, o, PROFILE, 'mild', 'on-device');
    expect(c.kind).toBe('yesno');
    expect(c.source).toBe('on-device');
  });

  it('the same seen only by the cloud model is badged cloud', () => {
    const c = assemble(neg, null, o, PROFILE, 'mild', 'in-cloud');
    expect(c.kind).toBe('yesno');
    expect(c.source).toBe('in-cloud');
  });

  it('a plain yes / no the code reads stays "No AI needed" even when a model ran', () => {
    const c = assemble('Do you want some tea?', null, o, PROFILE, 'mild', 'on-device');
    expect(c.kind).toBe('yesno');
    expect(c.source).toBe('code');
  });
});
