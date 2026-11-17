// The exact cloud request bodies, built in one place so the "what was sent" panel shows precisely what the
// engine passes to the SDK. Nothing here takes the profile as input: only the stripped question.

import { CLOUD_TEXT_MODEL } from './models';
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

export { CARD_SCHEMA, CLOUD_SYSTEM_PROMPT };
