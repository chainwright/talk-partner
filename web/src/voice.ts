// Voice input for the PARTNER's question, through Firebase AI Logic. A press on the microphone records one short
// clip (at most VOICE_MAX_SECONDS); a second press, or the limit, ends it. The clip is made into a 16 kHz mono WAV
// in the browser and handed to the engine once (web/src/ai/firebaseEngine.ts, `transcribe`: Gemini through
// `firebase/ai`, asked only for the words). The words fill the question field and nothing is submitted: the partner
// reads them, changes them if needed, and presses "Make card".
//
// The person's speech is never recorded or recognised, here or anywhere in the app: recognition of aphasic speech
// gives confident wrong text, and the app never answers for them.
//
// Where the sound goes: to Google's cloud, as part of that one request. The SDK's on-device step cannot take sound
// (core/models.ts, LEGS.voice), so the app says "cloud" before the first use (core/copy.ts, `voice`) and would say
// "on this computer" only if the SDK's `inferenceSource` reported it for that call. There is no other speech
// recognition in the app: the browser's Web Speech API, used for a few hours on 17 Nov 2026, was removed because it
// is AI inference outside Firebase AI Logic.
//
// One model call per recording, and none for a clip with no sound in it (the API has a limit per minute).
//
// This file has no DOM and no globals: the microphone, the recorder, the decoder and the engine call are handed in,
// so the state machine is tested with scripted ones (tests/unit/voice.test.ts). The browser's side is web/src/mic.ts.

export interface StreamLike { getTracks(): { stop(): void }[] }
/** The part of the browser's MediaRecorder this app uses. */
export interface RecorderLike {
  mimeType?: string;
  ondataavailable: ((ev: { data: Blob }) => void) | null;
  onstop: (() => void) | null;
  onerror: ((ev: unknown) => void) | null;
  start(): void;
  stop(): void;
}
export interface Clip { mimeType: string; base64: string }
export interface Heard { text: string; source: 'on-device' | 'in-cloud' }
/** What became of the one request made for a recording: where the SDK said it ran, or that it failed after being handed over. */
export type SentOutcome = 'in-cloud' | 'on-device' | 'failed' | 'not-sent';

export type VoiceError = 'blocked' | 'no-speech' | 'no-mic' | 'offline' | 'busy' | 'failed';
export type VoicePhase = 'idle' | 'asking' | 'recording' | 'working';

export interface VoiceView {
  /** False where the browser cannot record or this copy has no cloud step: the microphone button is not drawn at all. */
  supported: boolean;
  /** 'asking': waiting for the browser's microphone permission. 'working': the recording is being turned into text. */
  phase: VoicePhase;
  /** The words of the last recording, tidied; empty until the model has answered. */
  text: string;
  /** True once `text` is what was heard. */
  final: boolean;
  error: VoiceError | null;
  /** Where the SDK said the last answered recording was turned into text; null before any. */
  source: 'on-device' | 'in-cloud' | null;
}

export const SAMPLE_RATE = 16000;
/** A question is one sentence: anything longer than this from the model is cut (it is shown in a one-line field). */
export const MAX_TRANSCRIPT = 300;

/** What was heard, made into a question for the field: trimmed, a capital first, and a question mark if it ends bare. */
export function tidy(heard: string): string {
  const t = heard.replace(/\s+/g, ' ').trim();
  if (!t) return '';
  const s = t.charAt(0).toUpperCase() + t.slice(1);
  return /[.?!…]$/.test(s) ? s : `${s}?`;
}

/**
 * The model's answer -> the words. The answer must be JSON with a string `transcript` (the schema asks for exactly
 * that); anything else counts as nothing heard, never as text for the field.
 */
export function transcriptFrom(raw: string): string {
  try {
    const j: unknown = JSON.parse(raw);
    const t = (j as { transcript?: unknown } | null)?.transcript;
    return typeof t === 'string' ? t.replace(/\s+/g, ' ').trim().slice(0, MAX_TRANSCRIPT) : '';
  } catch { return ''; }
}

/** True when the clip has sound in it at all. A silent clip makes no request: nothing to hear, and the model may invent words. */
export function hasSound(samples: Float32Array, floor = 0.01): boolean {
  for (let i = 0; i < samples.length; i++) if (Math.abs(samples[i]) > floor) return true;
  return false;
}

/** Mono 16-bit PCM WAV of the samples, as base64: the one audio format this app sends. */
export function wavBase64(samples: Float32Array, rate = SAMPLE_RATE): string {
  const bytes = new Uint8Array(44 + samples.length * 2);
  const v = new DataView(bytes.buffer);
  const tag = (at: number, s: string) => { for (let i = 0; i < s.length; i++) bytes[at + i] = s.charCodeAt(i); };
  tag(0, 'RIFF'); v.setUint32(4, 36 + samples.length * 2, true); tag(8, 'WAVE');
  tag(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  tag(36, 'data'); v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const x = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(44 + i * 2, Math.round(x < 0 ? x * 0x8000 : x * 0x7fff), true);
  }
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

/** The browser's reason for giving no microphone -> ours. */
function micError(e: unknown): VoiceError {
  const name = (e as { name?: string } | null)?.name ?? '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'blocked';
  if (name === 'NotFoundError' || name === 'OverconstrainedError' || name === 'NotReadableError') return 'no-mic';
  return 'failed';
}
/** A refused request for being one too many (the API's limit per minute). */
const overQuota = (e: unknown) => /\b429\b|quota|resource[-_ ]exhausted|rate limit/i.test(String((e as { message?: string } | null)?.message ?? e));

export interface VoiceDeps {
  /** Asks the browser for the microphone; null where it has none to ask. */
  getStream: (() => Promise<StreamLike>) | null;
  makeRecorder: ((stream: StreamLike) => RecorderLike) | null;
  /** The recorded pieces -> mono samples at SAMPLE_RATE. */
  decode: ((chunks: Blob[], mimeType: string) => Promise<Float32Array>) | null;
  /** The one model call (the engine's `transcribe`, with the answer already read as words); null on a copy without a cloud step. */
  transcribe: ((clip: Clip) => Promise<Heard>) | null;
  /** False when the browser knows it has no connection: then nothing is recorded, because it could not be turned into text. */
  online?: () => boolean;
  /** Called exactly once for every request handed to `transcribe`, also when the go was cancelled meanwhile. */
  onSent?: (base64Bytes: number, outcome: SentOutcome) => void;
  maxSeconds: number;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (t: unknown) => void;
  onChange: (v: VoiceView) => void;
}

export interface Voice {
  view(): VoiceView;
  /** Starts one recording. Does nothing where unsupported or while a go is under way. */
  start(): void;
  /** Ends the recording and turns it into text. */
  stop(): void;
  /** Ends this go and drops it: nothing more is reported from it (a request already made is still counted by onSent). */
  cancel(): void;
}

export function createVoice(deps: VoiceDeps): Voice {
  const { getStream, makeRecorder, decode, transcribe, onChange } = deps;
  const setTimer = deps.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
  const clearTimer = deps.clearTimer ?? ((t) => clearTimeout(t as ReturnType<typeof setTimeout>));
  const online = deps.online ?? (() => true);
  const supported = !!(getStream && makeRecorder && decode && transcribe);
  const v: VoiceView = { supported, phase: 'idle', text: '', final: false, error: null, source: null };
  /** Every go has a number; anything that comes back for an older one is ignored. */
  let go = 0;
  let stream: StreamLike | null = null;
  let rec: RecorderLike | null = null;
  let chunks: Blob[] = [];
  let limit: unknown = null;
  const emit = () => onChange({ ...v });
  const release = () => {
    if (limit !== null) { clearTimer(limit); limit = null; }
    try { stream?.getTracks().forEach((t) => t.stop()); } catch { /* already stopped */ }
    stream = null; rec = null;
  };
  const end = (error: VoiceError | null) => { release(); v.phase = 'idle'; v.error = error; emit(); };

  async function finish(mine: number, mimeType: string) {
    const pieces = chunks; chunks = [];
    release(); // the microphone is let go before anything is sent
    if (mine !== go) return;
    let samples: Float32Array;
    try { samples = await decode!(pieces, mimeType); } catch { if (mine === go) end(pieces.length ? 'failed' : 'no-speech'); return; }
    if (mine !== go) return;
    samples = samples.subarray(0, deps.maxSeconds * SAMPLE_RATE);
    if (!samples.length || !hasSound(samples)) { end('no-speech'); return; }
    if (!online()) { end('offline'); return; }
    const clip: Clip = { mimeType: 'audio/wav', base64: wavBase64(samples) };
    let heard: Heard;
    try { heard = await transcribe!(clip); } catch (e) {
      const notSent = (e as { notSent?: boolean } | null)?.notSent === true;
      deps.onSent?.(clip.base64.length, notSent ? 'not-sent' : 'failed');
      if (mine === go) end(notSent || !online() ? 'offline' : overQuota(e) ? 'busy' : 'failed');
      return;
    }
    deps.onSent?.(clip.base64.length, heard.source);
    if (mine !== go) return;
    v.text = tidy(heard.text); v.final = !!v.text; v.source = heard.source;
    end(v.text ? null : 'no-speech');
  }

  function stop() {
    if (v.phase !== 'recording' || !rec) return;
    if (limit !== null) { clearTimer(limit); limit = null; }
    v.phase = 'working'; emit();
    try { rec.stop(); } catch { end('failed'); }
  }

  return {
    view: () => ({ ...v }),
    stop,
    start() {
      if (!supported || v.phase !== 'idle') return;
      v.text = ''; v.final = false; v.error = null;
      if (!online()) { v.error = 'offline'; emit(); return; }
      const mine = ++go;
      v.phase = 'asking'; emit();
      getStream!().then((s) => {
        if (mine !== go) { try { s.getTracks().forEach((t) => t.stop()); } catch { /* gone */ } return; }
        stream = s; chunks = [];
        const r = makeRecorder!(s);
        rec = r;
        r.ondataavailable = (ev) => { if (mine === go && ev.data && ev.data.size) chunks.push(ev.data); };
        r.onerror = () => { if (mine === go) end('failed'); };
        r.onstop = () => { void finish(mine, r.mimeType || 'audio/webm'); };
        r.start();
        v.phase = 'recording';
        limit = setTimer(() => { limit = null; if (mine === go) stop(); }, deps.maxSeconds * 1000);
        emit();
      }).catch((e) => { if (mine === go) end(v.phase === 'asking' ? micError(e) : 'failed'); });
    },
    cancel() {
      if (v.phase === 'idle') return;
      go++;
      const r = rec;
      release(); chunks = [];
      try { r?.stop(); } catch { /* already ended */ }
      v.phase = 'idle'; v.text = ''; v.final = false; v.error = null;
      emit();
    },
  };
}
