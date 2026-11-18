// Read aloud (phase 5, 18 Nov 2026): the question and the choices of the card on the person's screen, spoken by a
// Gemini text-to-speech model through Firebase AI Logic (web/src/ai/firebaseEngine.ts, `speak`: ONLY_IN_CLOUD, the
// SDK has no on-device speech). Hearing and reading together is supported-conversation practice, and it is the one AI
// step of this app that a phone can use on every card, the topic questions included.
//
// What leaves the device, and when: the words on the card (the question and the labels of its choices), which can
// hold names from About them, and nothing else of the family's: no list, no photo, no answer, no diary. Only after
// the carer turned Read aloud on, on a sheet that says exactly that and shows the words of the card in front of
// them. It is off by default. The cards of "Before a doctor visit" are never read aloud: that page promises that
// nothing of it is sent. A card whose words were sent says so under it, and the session's privacy line counts it.
//
// This file is pure: the text, the request as the sheet shows it, the sound as a WAV file, and a small cache keyed by
// the text (the same card is not sent twice). It imports types only.

import type { Card } from './types';

/** The stable text-to-speech model (Firebase release notes, 11 Nov 2026). Data, not code: one place to change it. */
export const TTS_MODEL = 'gemini-3.8-flash-tts';
export const TTS_VOICE = 'Kore';
export const TTS_STYLE = 'calm, slow and clear';
export const SPEAK_MAX = 400;

/** A card that may be read aloud: one with choices on the person's screen, and never a doctor-visit question. */
export function speakable(c: Card | null | undefined): c is Card {
  return !!c && !c.blocked && c.kind !== 'no-quiz' && c.choices.length > 0 && !c.visit;
}

/** What is spoken: the question as the card shows it, then each choice as its own short sentence, the way out last. */
export function speakText(c: Card): string {
  const end = (s: string) => (/[.?]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`);
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const answers = c.choices.filter((x) => x.role !== 'escape').map((x) => cap(x.label));
  const out = c.choices.filter((x) => x.role === 'escape').map((x) => `Or ${x.label}`);
  return [end(c.asked), ...[...answers, ...out].map(end)].join(' ').slice(0, SPEAK_MAX);
}

/** The exact request of the speech step, for the sheet and for the engine: the words, the voice and the style. */
export function speakRequest(text: string, model: string = TTS_MODEL) {
  return {
    model,
    mode: 'ONLY_IN_CLOUD',
    contents: [{ role: 'user', parts: [{ text, speechMetadata: { style: TTS_STYLE } }] }],
    generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: TTS_VOICE } } } },
  };
}

/** The sample rate a "audio/L16;rate=24000" type names; 24000 when it names none. */
export function pcmRate(mimeType: string): number {
  const m = /rate=(\d+)/.exec(mimeType);
  return m ? Number(m[1]) : 24000;
}
/** True when the model's sound is raw 16-bit PCM, which a browser cannot play until it has a WAV header. */
export const isPcm = (mimeType: string) => /^audio\/(?:l16|pcm)/i.test(mimeType);

/** Raw 16-bit mono PCM with a 44-byte WAV header in front of it. */
export function pcmToWav(pcm: Uint8Array, rate: number): Uint8Array {
  const out = new Uint8Array(44 + pcm.length);
  const v = new DataView(out.buffer);
  const str = (at: number, s: string) => { for (let i = 0; i < s.length; i++) out[at + i] = s.charCodeAt(i); };
  str(0, 'RIFF'); v.setUint32(4, 36 + pcm.length, true); str(8, 'WAVE'); str(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, pcm.length, true);
  out.set(pcm, 44);
  return out;
}

/** The sound of the cards spoken so far, by their text: a card is sent once, and "Hear it again" sends nothing. */
export const SPEAK_CACHE = 24;
export class SpeakCache<T> {
  private m = new Map<string, T>();
  constructor(private cap = SPEAK_CACHE) {}
  get(text: string): T | undefined { return this.m.get(text); }
  has(text: string): boolean { return this.m.has(text); }
  set(text: string, v: T): void {
    this.m.delete(text); this.m.set(text, v);
    while (this.m.size > this.cap) this.m.delete(this.m.keys().next().value as string);
  }
  get size(): number { return this.m.size; }
}
