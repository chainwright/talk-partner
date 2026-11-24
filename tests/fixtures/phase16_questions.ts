// Phase 16: the questions of the own-words measurement, as one labelled fixture for the unit tests and the run
// (scripts/eval-heldout.mjs --own). OPEN_18: the 18 open questions of the labelled set (eval/heldout_r2.json, who /
// where / what). EVERYDAY_10: ten everyday questions written the way a carer says them (eval/phase16_everyday.json).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (f: string) => JSON.parse(readFileSync(join(__dirname, '..', '..', 'eval', f), 'utf8')) as { questions: { id: number; type: string; q: string }[] };
const CODE = ['either-or', 'yes-no', 'feeling', 'pain', 'body', 'memory'];
export const OPEN_18: string[] = read('heldout_r2.json').questions.filter((x) => !CODE.includes(x.type)).map((x) => x.q);
export const EVERYDAY_10: { id: number; type: string; q: string }[] = read('phase16_everyday.json').questions;
