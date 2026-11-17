// The exact cloud request bodies, built in one place so the "what was sent" panel shows precisely what the
// engine passes to the SDK. Nothing here takes the profile as input: only the stripped question or one word.

import { CLOUD_IMAGE_MODEL, CLOUD_TEXT_MODEL } from './models';
import { CARD_SCHEMA, CLOUD_SYSTEM_PROMPT, cloudPrompt } from './prompt';

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

export const PICTURE_STYLE =
  'A single clear, simple pictograph of the object or idea named below, for an adult with aphasia. ' +
  'Flat colours, thick dark outline, plain white background, centred, no text, no letters, no faces of real people, not cartoonish or childish.';

export function pictureText(word: string): string {
  return `${PICTURE_STYLE}\nWord: ${word}`;
}

export function pictureRequestBody(word: string) {
  return {
    model: CLOUD_IMAGE_MODEL,
    mode: 'ONLY_IN_CLOUD',
    contents: [{ role: 'user', parts: [{ text: pictureText(word) }] }],
    generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
  };
}

export { CARD_SCHEMA, CLOUD_SYSTEM_PROMPT };
