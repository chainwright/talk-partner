// The exact cloud request bodies, built in one place so the "what was sent" panel shows precisely what the
// engine passes to the SDK. Nothing here takes the profile as input: only the stripped question.

import { CLOUD_TEXT_MODEL } from './models';
import { CARD_SCHEMA, CLOUD_SYSTEM_PROMPT, LETTER_SCHEMA, LETTER_SYSTEM_PROMPT, TRANSCRIBE_PROMPT, TRANSCRIBE_SCHEMA, TRANSCRIBE_SYSTEM_PROMPT, cloudPrompt } from './prompt';

/** `model` is the cloud text model in use: the in-code default, or the name Remote Config gave (core/models.ts). */
export function cloudTextRequest(strippedQuestion: string, model: string = CLOUD_TEXT_MODEL) {
  return {
    model,
    mode: 'PREFER_IN_CLOUD',
    contents: [{ role: 'user', parts: [{ text: cloudPrompt(strippedQuestion) }] }],
    // fixed app text, identical for every user; no personal data
    systemInstruction: CLOUD_SYSTEM_PROMPT,
    generationConfig: { responseMimeType: 'application/json', responseJsonSchema: CARD_SCHEMA },
  };
}

/**
 * Phase 9: the cloud letter step's request (core/letter.ts): its own fixed instructions and schema (the kind as an
 * enum, exactly 4 words). The text is the stripped question, the letter and fixed words (letterCloudText): no name.
 */
export function letterRequest(text: string, model: string = CLOUD_TEXT_MODEL) {
  return {
    model,
    mode: 'PREFER_IN_CLOUD',
    contents: [{ role: 'user', parts: [{ text }] }],
    systemInstruction: LETTER_SYSTEM_PROMPT,
    generationConfig: { responseMimeType: 'application/json', responseJsonSchema: LETTER_SCHEMA },
  };
}

/**
 * The request the voice step hands to the SDK for one recording of the partner's spoken question: everything but the
 * sound itself, which goes in as `inlineData` (base64 WAV, 16 kHz, one channel). Nothing from About me is in it.
 */
export function voiceRequest(clip: { mimeType: string; base64: string }, model: string = CLOUD_TEXT_MODEL) {
  return {
    model,
    mode: 'ONLY_IN_CLOUD',
    contents: [{ role: 'user', parts: [{ inlineData: { mimeType: clip.mimeType, data: clip.base64 } }, { text: TRANSCRIBE_PROMPT }] }],
    systemInstruction: TRANSCRIBE_SYSTEM_PROMPT,
    generationConfig: { responseMimeType: 'application/json', responseJsonSchema: TRANSCRIBE_SCHEMA },
  };
}

export { CARD_SCHEMA, CLOUD_SYSTEM_PROMPT };
