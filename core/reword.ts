// "Put it in plainer words": the one job a model has in the insights and the tip of the day. The rules write every
// line; a model may say each line again more plainly, and code decides whether its words may stand.
//
// Both ways go through Firebase AI Logic (web/src/ai/firebaseEngine.ts): `rewordDevice` is ONLY_ON_DEVICE (Gemini
// Nano, desktop Chrome); `rewordCloud` is PREFER_IN_CLOUD and is called only after a yes on a sheet that shows the
// exact text (web/src/main.ts). The request body is built here, in one place, so the sheet shows precisely what the
// engine hands to the SDK. This file takes lines of text and nothing else: no profile, no diary, no health notes.

import { CLOUD_TEXT_MODEL } from './models';
import type { Engine } from './engine';

export const REWORD_SYSTEM_PROMPT = `You get a short numbered list of plain statements written by an app for a family carer.
Say each statement again in plainer, warmer words: one or two short sentences per statement, same order, the same number of statements.
Use only what is in the statement. Keep every number and every day exactly as given.
Do not add advice, causes, a diagnosis, medicines, doses, a diet, names, or anything that is not in the statement. Adult, calm tone. No exclamation marks.
Reply as JSON: {"lines": ["...", "..."]}.`;
export const REWORD_SCHEMA = {
  type: 'object',
  properties: { lines: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 6 } },
  required: ['lines'],
} as const;

/** The exact request body of the cloud wording step, for the sheet and for the engine. */
export function rewordRequest(text: string, model: string = CLOUD_TEXT_MODEL) {
  return {
    model,
    mode: 'PREFER_IN_CLOUD',
    contents: [{ role: 'user', parts: [{ text }] }],
    // fixed app text, identical for every user; no personal data
    systemInstruction: REWORD_SYSTEM_PROMPT,
    generationConfig: { responseMimeType: 'application/json', responseJsonSchema: REWORD_SCHEMA },
  };
}

/** Words a reworded line may not bring in: the app gives no medical advice, whoever wrote the sentence. */
const MEDICAL = /\b(?:diagnos\w*|dose|doses|dosage|mg|ml|medicine|medicines|medication|medications|tablet|tablets|pill|pills|insulin|prescri\w*|treat|treatment|cure|diet|dehydrat\w*|infection|disease|symptom\w*|should|must|need to|needs to|have to|has to|ought)\b/i;
const MORE_DRINK = /\b(?:drink|drinks|fluid|fluids|water)\b[^.]{0,40}\bmore\b|\bmore\b[^.]{0,40}\b(?:drink|drinks|fluid|fluids|water|to drink)\b|\b(?:offer|give|encourage|push)\b[^.]{0,40}\b(?:drink|drinks|fluid|fluids|water)\b/i;
export const REWORD_MAX = 260;

/**
 * A model's lines, checked against the rules' own: null when they cannot be used. As many lines as went in; each
 * short; no number, no capitalised word and no medical or advising word that its own source line does not hold; never
 * "more to drink" in any words.
 */
export function checkReworded(raw: string, sources: string[]): string[] | null {
  let parsed: unknown;
  try { parsed = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)); } catch { return null; }
  const lines = (parsed as { lines?: unknown })?.lines;
  if (!Array.isArray(lines) || lines.length !== sources.length || !sources.length) return null;
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (typeof lines[i] !== 'string') return null;
    const x = (lines[i] as string).replace(/\s+/g, ' ').replace(/^\d+[.)]\s*/, '').trim();
    const src = sources[i];
    const low = src.toLowerCase();
    if (!x || x.length > REWORD_MAX || /[!]/.test(x)) return null;
    const srcNums: string[] = src.match(/\d+/g) ?? [];
    const outNums: string[] = x.match(/\d+/g) ?? [];
    if (outNums.some((n) => !srcNums.includes(n))) return null;
    // every number of the source stays: a count that went missing is a changed statement
    if (srcNums.some((n) => !outNums.includes(n))) return null;
    for (const m of x.matchAll(/(?<=[a-z,;:"]\s)[A-Z][\p{L}'-]+/gu)) if (!low.includes(m[0].toLowerCase()) && m[0] !== 'I') return null;
    const med: string[] = x.match(new RegExp(MEDICAL.source, 'gi')) ?? [];
    if (med.some((w) => !low.includes(w.toLowerCase()))) return null;
    if (MORE_DRINK.test(x) && !MORE_DRINK.test(src)) return null;
    out.push(x);
  }
  return out;
}

export type RewordSource = 'rules' | 'on-device' | 'in-cloud';

/** On the device where the browser has the model; the rules' own words otherwise and whenever the check fails. Never a cloud step. */
export async function rewordOnDevice(sources: string[], prompt: string, engine: Pick<Engine, 'rewordDevice'>, deviceReady: boolean): Promise<{ lines: string[]; source: RewordSource }> {
  const rules = { lines: sources, source: 'rules' as const };
  if (!deviceReady || !engine.rewordDevice || !sources.length) return rules;
  try {
    const r = await engine.rewordDevice(prompt);
    if (r.source !== 'on-device') return rules; // defence in depth: an answer that did not come from this device is not used
    const lines = checkReworded(r.text, sources);
    return lines ? { lines, source: 'on-device' } : rules;
  } catch {
    return rules;
  }
}
