// Voice input for the PARTNER's question: the browser's own speech recognition (Web Speech API), started by a press
// on the microphone and never by itself. Interim words show in the question field as they come, the final words fill
// it, and nothing is submitted: the partner reads the words, changes them if needed, and presses "Make card".
//
// The person's speech is never recognised, here or anywhere in the app: recognition of aphasic speech gives confident
// wrong text, and the app never answers for them.
//
// Where the sound goes is the browser's business, not this app's, and the app says so (core/copy.ts, `voice`). With
// the browser's default service the sound may leave the computer (in Chrome: to Google). Where the browser reports
// that it can recognise the language on the device (`SpeechRecognition.available({ processLocally: true })`; the
// Chrome 157 we checked has it) the app sets `processLocally`, which asks the browser to keep the sound on the device and to fail
// rather than send it; `local` in the view says which of the two was asked for. The app never installs a language
// pack and never falls back from on-device to the default service by itself.
//
// This file has no DOM and no globals: the recognition constructor is handed in, so the state machine is tested with
// a scripted one (tests/unit/voice.test.ts).

export interface RecognitionResultLike { isFinal: boolean; 0: { transcript: string } }
export interface RecognitionEventLike { results: ArrayLike<RecognitionResultLike> }
export interface RecognitionErrorLike { error: string }
/** The part of the browser's SpeechRecognition object this app uses. */
export interface RecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  processLocally?: boolean;
  onresult: ((ev: RecognitionEventLike) => void) | null;
  onerror: ((ev: RecognitionErrorLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
export type RecognitionCtor = (new () => RecognitionLike) & {
  available?: (options: { langs: string[]; processLocally: boolean }) => Promise<string>;
};

export type VoiceError = 'blocked' | 'no-speech' | 'no-mic' | 'network' | 'language' | 'failed';

export interface VoiceView {
  /** False where the browser has no speech recognition: the microphone button is not drawn at all. */
  supported: boolean;
  listening: boolean;
  /** What has been heard in this go: interim words while listening, the tidied final words after. */
  text: string;
  /** True once listening has ended and `text` is what was heard. */
  final: boolean;
  error: VoiceError | null;
  /** On-device recognition was reported by the browser and is asked for on every start. */
  local: boolean;
}

export const VOICE_LANG = 'en-US';

/** The browser's recognition constructor, standard name first; null where there is none. */
export function recognitionCtor(w: unknown): RecognitionCtor | null {
  const g = w as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown } | null | undefined;
  const c = g?.SpeechRecognition ?? g?.webkitSpeechRecognition;
  return typeof c === 'function' ? (c as RecognitionCtor) : null;
}

/**
 * True only when the browser says on-device recognition of this language is there now ("available"). "downloadable"
 * and "downloading" are a no: the app does not install language packs. A capability query: no sound, no recognition.
 */
export async function localAvailable(ctor: RecognitionCtor | null, lang = VOICE_LANG): Promise<boolean> {
  if (!ctor || typeof ctor.available !== 'function' || !('processLocally' in ctor.prototype)) return false;
  try { return (await ctor.available({ langs: [lang], processLocally: true })) === 'available'; } catch { return false; }
}

/** What was heard, made into a question for the field: trimmed, a capital first, and a question mark if it ends bare. */
export function tidy(heard: string): string {
  const t = heard.replace(/\s+/g, ' ').trim();
  if (!t) return '';
  const s = t.charAt(0).toUpperCase() + t.slice(1);
  return /[.?!…]$/.test(s) ? s : `${s}?`;
}

const ERRORS: Record<string, VoiceError | null> = {
  'not-allowed': 'blocked', 'service-not-allowed': 'blocked', 'no-speech': 'no-speech', 'audio-capture': 'no-mic',
  network: 'network', 'language-not-supported': 'language', aborted: null,
};

export interface Voice {
  view(): VoiceView;
  /** Records what `localAvailable` answered; used from the next start on. */
  setLocal(local: boolean): void;
  /** Starts listening for one question. Does nothing where unsupported or while already listening. */
  start(): void;
  /** Ends listening and keeps what was heard (the browser gives its final words). */
  stop(): void;
  /** Ends listening and drops this go: nothing more is reported from it. */
  cancel(): void;
}

export function createVoice(opts: { ctor: RecognitionCtor | null; lang?: string; onChange: (v: VoiceView) => void }): Voice {
  const { ctor, onChange } = opts;
  const v: VoiceView = { supported: !!ctor, listening: false, text: '', final: false, error: null, local: false };
  let rec: RecognitionLike | null = null;
  const emit = () => onChange({ ...v });
  const end = () => { rec = null; v.listening = false; };

  return {
    view: () => ({ ...v }),
    setLocal(local) { if (ctor) v.local = local; },
    start() {
      if (!ctor || v.listening) return;
      const r = new ctor();
      rec = r;
      r.lang = opts.lang ?? VOICE_LANG;
      r.continuous = false; // one question, then it ends by itself
      r.interimResults = true;
      r.maxAlternatives = 1;
      if (v.local) r.processLocally = true;
      // events of an earlier go (a stale object) are ignored: only the current one may change the view
      r.onresult = (ev) => {
        if (rec !== r) return;
        let heard = '';
        for (let i = 0; i < ev.results.length; i++) heard += `${ev.results[i][0].transcript} `;
        v.text = heard.replace(/\s+/g, ' ').trim();
        emit();
      };
      r.onerror = (ev) => {
        if (rec !== r) return;
        const e = ev.error in ERRORS ? ERRORS[ev.error] : 'failed';
        if (e) v.error = e; // "aborted" is the partner's own stop, not an error
      };
      r.onend = () => {
        if (rec !== r) return;
        end();
        v.text = tidy(v.text);
        v.final = !!v.text;
        if (!v.text && !v.error) v.error = 'no-speech';
        emit();
      };
      v.listening = true; v.text = ''; v.final = false; v.error = null;
      try { r.start(); } catch { end(); v.error = 'failed'; }
      emit();
    },
    stop() { if (rec && v.listening) rec.stop(); },
    cancel() {
      if (!rec) return;
      const r = rec;
      end(); v.text = ''; v.final = false; v.error = null;
      try { r.abort(); } catch { /* already ended */ }
      emit();
    },
  };
}
