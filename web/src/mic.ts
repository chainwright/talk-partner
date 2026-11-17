// The browser's side of voice input (web/src/voice.ts): the microphone, the recorder, and the recording made into
// plain samples. No model is called here and nothing is sent: the one request is the engine's `transcribe`
// (web/src/ai/firebaseEngine.ts). Where the browser lacks any of the three, `micDeps` returns nulls and the
// microphone button is not drawn.
import { SAMPLE_RATE, type RecorderLike, type StreamLike } from './voice';

type Ctx = typeof AudioContext;
const audioContext = (): Ctx | null => (globalThis as { AudioContext?: Ctx; webkitAudioContext?: Ctx }).AudioContext ?? (globalThis as { webkitAudioContext?: Ctx }).webkitAudioContext ?? null;

/** The recording (whatever container the browser's recorder wrote) -> one channel at SAMPLE_RATE. */
async function decode(chunks: Blob[], mimeType: string): Promise<Float32Array> {
  const data = await new Blob(chunks, { type: mimeType }).arrayBuffer();
  if (!data.byteLength) return new Float32Array(0);
  const ctx = new (audioContext()!)();
  try {
    const audio = await ctx.decodeAudioData(data);
    const frames = Math.max(1, Math.ceil(audio.duration * SAMPLE_RATE));
    const off = new OfflineAudioContext(1, frames, SAMPLE_RATE);
    const src = off.createBufferSource();
    src.buffer = audio; src.connect(off.destination); src.start();
    return (await off.startRendering()).getChannelData(0);
  } finally { void ctx.close().catch(() => undefined); }
}

export function micDeps(): {
  getStream: (() => Promise<StreamLike>) | null;
  makeRecorder: ((s: StreamLike) => RecorderLike) | null;
  decode: ((chunks: Blob[], mimeType: string) => Promise<Float32Array>) | null;
} {
  const media = typeof navigator === 'undefined' ? undefined : navigator.mediaDevices;
  const can = !!media && typeof media.getUserMedia === 'function' && typeof MediaRecorder === 'function' && !!audioContext() && typeof OfflineAudioContext === 'function';
  if (!can) return { getStream: null, makeRecorder: null, decode: null };
  return {
    // sound only, one microphone; the browser asks the partner for permission here
    getStream: () => media.getUserMedia({ audio: true }),
    makeRecorder: (s) => new MediaRecorder(s as MediaStream) as unknown as RecorderLike,
    decode,
  };
}
