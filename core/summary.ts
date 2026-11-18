// "Today in short": two to four plain sentences of what the person chose today and how they felt, for the family or
// the therapist to read or copy.
//
// Where it is written:
//   - on this device, by Gemini Nano through Firebase AI Logic (`engine.summarizeDevice`, ONLY_ON_DEVICE), where the
//     browser has it. The answers are personal, so this step has no cloud fall-back: an answer that did not come from
//     the device is refused.
//   - everywhere else (every phone today), by the rules below, with no AI. The answers are never sent to online help.
// The model only words it. Code checks what comes back (two to four sentences, short, nothing the answers do not
// hold: no name and no number that is not in them), and falls back to the rules' own sentences otherwise.

import type { Engine } from './engine';

export interface DayAnswer { q: string; label: string; at: number }
export interface DaySummary { sentences: string[]; source: 'on-device' | 'rules' }

export const SUMMARY_SYSTEM_PROMPT = `You write a short note for the family or the speech therapist of an adult with aphasia.
You get the questions the person was asked today and the answer they pointed to for each.
Write 2 to 4 short plain sentences: what they chose today and how they felt. Use only what is in the list.
Do not add advice, causes, praise, a diagnosis, names or numbers that are not in the list. Adult, neutral tone.
Reply as JSON: {"sentences": ["...", "..."]}.`;
export const SUMMARY_SCHEMA = {
  type: 'object',
  properties: { sentences: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 4 } },
  required: ['sentences'],
} as const;

/** The answers confirmed since local midnight, oldest first. */
export function todays<T extends { at: number }>(history: T[], now = Date.now()): T[] {
  const d = new Date(now);
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return history.filter((h) => h.at >= start && h.at <= now).sort((a, b) => a.at - b.at);
}

const FEEL_Q = /\b(?:feel|feeling|sleep|slept|tired|pain|hurt|hurts|bad is|bothering|worried|comfortable|hot|cold|hungry|noisy)\b/i;
const bare = (q: string) => q.replace(/[?.!]+$/, '').trim();
const who = (name: string) => name.trim() || 'They';
const list = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join('; ')}; and ${xs[xs.length - 1]}`);
/** One answer as a clause: "Are you hungry? yes", in the question's own words (nothing is reworded or guessed). */
const clause = (a: DayAnswer) => `"${bare(a.q)}": ${a.label}`;

/** The rules' own summary: no AI, nothing sent. Two to four sentences; one when there is nothing to tell yet. */
export function rulesSummary(answers: DayAnswer[], name = ''): string[] {
  if (!answers.length) return ['No answers have been confirmed today yet.'];
  // the last answer to a question is today's answer to it
  const last = new Map<string, DayAnswer>();
  for (const a of answers) last.set(bare(a.q).toLowerCase(), a);
  const all = [...last.values()];
  const feel = all.filter((a) => FEEL_Q.test(a.q));
  const rest = all.filter((a) => !FEEL_Q.test(a.q));
  const out = [`${who(name)} answered ${all.length} question${all.length === 1 ? '' : 's'} today by pointing, and confirmed each answer.`];
  if (feel.length) out.push(`How they felt: ${list(feel.slice(-5).map(clause))}.`);
  if (rest.length) out.push(`What they chose: ${list(rest.slice(-5).map(clause))}.`);
  const more = all.length - Math.min(5, feel.length) - Math.min(5, rest.length);
  if (more > 0) out.push(`${more} more answer${more === 1 ? ' is' : 's are'} in the list above.`);
  return out;
}

/** The text the on-device model gets. It is never handed to a cloud step. */
export function summaryPrompt(answers: DayAnswer[], name = ''): string {
  return `${name.trim() ? `The person is ${name.trim()}.\n` : ''}Today's answers, in order:\n${answers.slice(-20).map((a, i) => `${i + 1}. ${bare(a.q)}? -> ${a.label}`).join('\n')}`;
}

/** A model's sentences, checked against the answers: null when they cannot be used. */
export function checkSummary(text: string, answers: DayAnswer[], name = ''): string[] | null {
  let parsed: unknown;
  try { parsed = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)); } catch { return null; }
  const raw = (parsed as { sentences?: unknown })?.sentences;
  if (!Array.isArray(raw)) return null;
  const sentences = raw.filter((x): x is string => typeof x === 'string').map((x) => x.replace(/\s+/g, ' ').trim()).filter(Boolean);
  if (sentences.length < 2 || sentences.length > 4) return null;
  if (sentences.some((x) => x.length > 240 || /[!]/.test(x))) return null;
  // nothing the answers do not hold: every capitalised word inside a sentence and every number must be in them
  const source = `${name} ${answers.map((a) => `${a.q} ${a.label}`).join(' ')}`.toLowerCase();
  for (const x of sentences) {
    for (const m of x.matchAll(/(?<=[a-z,;:]\s)[A-Z][\p{L}'-]+/gu)) if (!source.includes(m[0].toLowerCase()) && m[0] !== 'I') return null;
    for (const m of x.matchAll(/\d+/g)) if (!source.includes(m[0])) return null;
  }
  return sentences;
}

/**
 * Today in short. On the device when the browser has the model and the engine has the on-device summary step; the
 * rules otherwise, and whenever the model's answer does not pass the check. No cloud step exists on this path.
 */
export async function daySummary(answers: DayAnswer[], name: string, engine: Pick<Engine, 'summarizeDevice'>, deviceReady: boolean): Promise<DaySummary> {
  const rules: DaySummary = { sentences: rulesSummary(answers, name), source: 'rules' };
  if (!deviceReady || !engine.summarizeDevice || answers.length < 2) return rules;
  try {
    const r = await engine.summarizeDevice(summaryPrompt(answers, name));
    // defence in depth: an answer that did not come from this device is not used
    if (r.source !== 'on-device') return rules;
    const sentences = checkSummary(r.text, answers, name);
    return sentences ? { sentences, source: 'on-device' } : rules;
  } catch {
    return rules;
  }
}
