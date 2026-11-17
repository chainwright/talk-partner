// Voice input for the partner's question (web/src/voice.ts), since the afternoon of 17 Nov 2026: one short
// recording, one model call through Firebase AI Logic, the words into the question field. These tests run the state
// machine against a scripted microphone, recorder, decoder and engine call (no sound, no browser, no model), and read
// the copy and the client's wiring for what the app says about where the recording goes.
// What they do not show: that a real recording is understood. One real call against the hosted copy is in
// devlog/evidence_live/ (see EVIDENCE.md, row 41).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { COPY } from '../../core/copy';
import { LEGS, VOICE_MAX_SECONDS } from '../../core/models';
import { TRANSCRIBE_SCHEMA, TRANSCRIBE_SYSTEM_PROMPT } from '../../core/prompt';
import { voiceRequest } from '../../core/requests';
import { NullEngine } from '../../core/engine';
import {
  MAX_TRANSCRIPT, SAMPLE_RATE, createVoice, hasSound, tidy, transcriptFrom, wavBase64,
  type Clip, type Heard, type RecorderLike, type SentOutcome, type StreamLike, type VoiceDeps, type VoiceView,
} from '../../web/src/voice';

const read = (p: string) => readFileSync(join(__dirname, '..', '..', p), 'utf8');
const tick = () => new Promise((r) => setTimeout(r, 0));
const settle = async () => { for (let i = 0; i < 6; i++) await tick(); };
const tone = (n = 8000, level = 0.3) => Float32Array.from({ length: n }, (_, i) => level * Math.sin(i / 5));

/** A scripted microphone, recorder, decoder and engine call, and a record of everything that was asked of them. */
function rig(over: Partial<VoiceDeps> & { samples?: Float32Array; answer?: Heard | Error; mic?: Error } = {}) {
  const log = { streams: 0, tracksStopped: 0, recorders: [] as (RecorderLike & { calls: string[] })[], decoded: 0, clips: [] as Clip[], sent: [] as [number, SentOutcome][], views: [] as VoiceView[], timers: [] as { fn: () => void; ms: number; cleared: boolean }[] };
  let release: ((h: Heard) => void) | null = null;
  const deps: VoiceDeps = {
    getStream: async () => {
      if (over.mic) throw over.mic;
      log.streams++;
      return { getTracks: () => [{ stop: () => { log.tracksStopped++; } }] } satisfies StreamLike;
    },
    makeRecorder: () => {
      const r: RecorderLike & { calls: string[] } = {
        mimeType: 'audio/webm;codecs=opus', calls: [], ondataavailable: null, onstop: null, onerror: null,
        start() { this.calls.push('start'); },
        stop() { this.calls.push('stop'); this.ondataavailable?.({ data: new Blob(['sound']) }); this.onstop?.(); },
      };
      log.recorders.push(r);
      return r;
    },
    decode: async () => { log.decoded++; return over.samples ?? tone(); },
    transcribe: async (clip) => {
      log.clips.push(clip);
      if (over.answer instanceof Error) throw over.answer;
      if (over.answer) return over.answer;
      return new Promise<Heard>((res) => { release = res; });
    },
    onSent: (bytes, outcome) => { log.sent.push([bytes, outcome]); },
    maxSeconds: VOICE_MAX_SECONDS,
    setTimer: (fn, ms) => { const t = { fn, ms, cleared: false }; log.timers.push(t); return t; },
    clearTimer: (t) => { (t as { cleared: boolean }).cleared = true; },
    onChange: (v) => { log.views.push(v); },
    ...over,
  };
  const voice = createVoice(deps);
  return { voice, log, answer: (h: Heard) => release?.(h) };
}
const CLOUD: Heard = { text: 'do you want coffee or tea', source: 'in-cloud' };

describe('voice input: one recording, one model call, the words into the field', () => {
  it('a press asks for the microphone, then records; a second press ends it and makes exactly one call with a WAV clip', async () => {
    const { voice, log, answer } = rig();
    expect(voice.view()).toMatchObject({ supported: true, phase: 'idle', text: '', final: false, error: null, source: null });
    voice.start();
    expect(voice.view().phase).toBe('asking');
    await settle();
    expect(voice.view().phase).toBe('recording');
    expect(log.recorders[0].calls).toEqual(['start']);
    expect(log.clips).toHaveLength(0); // nothing is sent while recording
    voice.stop();
    await settle();
    expect(voice.view().phase).toBe('working');
    expect(log.tracksStopped).toBe(1); // the microphone is let go before the request is made
    expect(log.clips).toHaveLength(1);
    expect(log.clips[0].mimeType).toBe('audio/wav');
    expect(atob(log.clips[0].base64).slice(0, 4)).toBe('RIFF');
    answer(CLOUD);
    await settle();
    expect(voice.view()).toMatchObject({ phase: 'idle', text: 'Do you want coffee or tea?', final: true, error: null, source: 'in-cloud' });
    expect(log.clips).toHaveLength(1);
    expect(log.sent).toEqual([[log.clips[0].base64.length, 'in-cloud']]);
  });
  it('the recording ends by itself at the limit, and the limit is the one the notice names', async () => {
    const { voice, log } = rig({ answer: CLOUD });
    voice.start(); await settle();
    expect(log.timers).toHaveLength(1);
    expect(log.timers[0].ms).toBe(VOICE_MAX_SECONDS * 1000);
    expect(VOICE_MAX_SECONDS).toBe(15);
    log.timers[0].fn();
    await settle();
    expect(log.recorders[0].calls).toEqual(['start', 'stop']);
    expect(voice.view()).toMatchObject({ phase: 'idle', final: true });
    expect(log.clips).toHaveLength(1);
  });
  it('a clip longer than the limit is cut to it before it is sent', async () => {
    const { voice, log } = rig({ answer: CLOUD, samples: tone(SAMPLE_RATE * 20) });
    voice.start(); await settle(); voice.stop(); await settle();
    const wavBytes = atob(log.clips[0].base64).length;
    expect(wavBytes).toBe(44 + VOICE_MAX_SECONDS * SAMPLE_RATE * 2);
  });
  it('a second press while one go is under way starts nothing new', async () => {
    const { voice, log } = rig();
    voice.start(); voice.start(); await settle(); voice.start();
    expect(log.streams).toBe(1);
    expect(log.recorders).toHaveLength(1);
    voice.stop(); await settle(); voice.start(); voice.stop();
    expect(log.streams).toBe(1);
    expect(log.clips).toHaveLength(1);
  });
  it('a silent clip makes no request at all', async () => {
    const { voice, log } = rig({ samples: new Float32Array(8000) });
    voice.start(); await settle(); voice.stop(); await settle();
    expect(log.clips).toHaveLength(0);
    expect(log.sent).toEqual([]);
    expect(voice.view()).toMatchObject({ phase: 'idle', error: 'no-speech', final: false, text: '' });
  });
  it('an empty transcript is "nothing was heard", and the request is still counted', async () => {
    const { voice, log } = rig({ answer: { text: '', source: 'in-cloud' } });
    voice.start(); await settle(); voice.stop(); await settle();
    expect(voice.view()).toMatchObject({ error: 'no-speech', final: false, text: '' });
    expect(log.sent).toHaveLength(1);
    expect(log.sent[0][1]).toBe('in-cloud');
  });
});

describe('voice input: no microphone, no permission, no connection, a refused request: one plain state each, never an exception', () => {
  it.each([
    ['NotAllowedError', 'blocked'], ['SecurityError', 'blocked'], ['NotFoundError', 'no-mic'], ['NotReadableError', 'no-mic'], ['AbortError', 'failed'],
  ])('the browser answers %s -> %s, and nothing is recorded or sent', async (name, error) => {
    const { voice, log } = rig({ mic: Object.assign(new Error('no'), { name }) });
    voice.start(); await settle();
    expect(voice.view()).toMatchObject({ phase: 'idle', error });
    expect(log.recorders).toHaveLength(0);
    expect(log.clips).toHaveLength(0);
  });
  it('offline: nothing is recorded, because it could not be turned into text', async () => {
    const { voice, log } = rig({ online: () => false });
    voice.start(); await settle();
    expect(voice.view()).toMatchObject({ phase: 'idle', error: 'offline' });
    expect(log.streams).toBe(0);
  });
  it('the connection goes while recording: the clip is not handed over', async () => {
    let on = true;
    const { voice, log } = rig({ online: () => on, answer: CLOUD });
    voice.start(); await settle(); on = false; voice.stop(); await settle();
    expect(voice.view().error).toBe('offline');
    expect(log.clips).toHaveLength(0);
    expect(log.sent).toEqual([]);
  });
  it('a request the engine marks as certainly not sent is not counted as handed over', async () => {
    const { voice, log } = rig({ answer: Object.assign(new Error('offline'), { notSent: true }) });
    voice.start(); await settle(); voice.stop(); await settle();
    expect(voice.view().error).toBe('offline');
    expect(log.sent.map((s) => s[1])).toEqual(['not-sent']);
  });
  it('a request refused for the quota says "busy"; any other failure says "did not work"; both are counted as handed over', async () => {
    const a = rig({ answer: new Error('[429 ] Resource has been exhausted (e.g. check quota).') });
    a.voice.start(); await settle(); a.voice.stop(); await settle();
    expect(a.voice.view()).toMatchObject({ phase: 'idle', error: 'busy', final: false });
    expect(a.log.sent.map((s) => s[1])).toEqual(['failed']);
    const b = rig({ answer: new Error('500') });
    b.voice.start(); await settle(); b.voice.stop(); await settle();
    expect(b.voice.view().error).toBe('failed');
    expect(b.log.sent.map((s) => s[1])).toEqual(['failed']);
  });
  it('unsupported (no recorder, or a copy with no cloud step): start does nothing', async () => {
    for (const over of [{ getStream: null }, { makeRecorder: null }, { decode: null }, { transcribe: null }] as Partial<VoiceDeps>[]) {
      const { voice, log } = rig(over);
      expect(voice.view().supported).toBe(false);
      voice.start(); await settle();
      expect(voice.view().phase).toBe('idle');
      expect(log.views).toHaveLength(0);
    }
  });
  it('a copy with no project settings has no voice step, so no microphone button', () => {
    expect((new NullEngine() as { transcribe?: unknown }).transcribe).toBeUndefined();
    expect(read('web/src/main.ts')).toContain('transcribe: state.engine.cloudConfigured && state.engine.transcribe');
  });
});

describe('voice input: cancel', () => {
  it('while recording: the microphone is let go, nothing is decoded or sent, and nothing is reported later', async () => {
    const { voice, log } = rig({ answer: CLOUD });
    voice.start(); await settle();
    voice.cancel(); await settle();
    expect(voice.view()).toMatchObject({ phase: 'idle', text: '', final: false, error: null });
    expect(log.tracksStopped).toBe(1);
    expect(log.decoded).toBe(0);
    expect(log.clips).toHaveLength(0);
  });
  it('while the request is out: the words are dropped, but the request is still counted as handed over', async () => {
    const { voice, log, answer } = rig();
    voice.start(); await settle(); voice.stop(); await settle();
    voice.cancel();
    answer(CLOUD); await settle();
    expect(voice.view()).toMatchObject({ phase: 'idle', text: '', final: false });
    expect(log.sent).toHaveLength(1);
    expect(log.sent[0][1]).toBe('in-cloud');
  });
  it('while waiting for permission: a microphone given afterwards is let go at once', async () => {
    const { voice, log } = rig();
    voice.start(); voice.cancel(); await settle();
    expect(log.streams).toBe(1);
    expect(log.tracksStopped).toBe(1);
    expect(log.recorders).toHaveLength(0);
    expect(voice.view().phase).toBe('idle');
  });
});

describe('voice input: the pure parts', () => {
  it('tidy makes a question for the field', () => {
    expect(tidy('  do you   want tea ')).toBe('Do you want tea?');
    expect(tidy('Is it cold in here?')).toBe('Is it cold in here?');
    expect(tidy('')).toBe('');
  });
  it('the words are read only from JSON with a string transcript; anything else is nothing heard', () => {
    expect(transcriptFrom('{"transcript":" do you want  tea "}')).toBe('do you want tea');
    expect(transcriptFrom('{"transcript":""}')).toBe('');
    expect(transcriptFrom('{"transcript":42}')).toBe('');
    expect(transcriptFrom('Do you want tea?')).toBe('');
    expect(transcriptFrom('null')).toBe('');
    expect(transcriptFrom(JSON.stringify({ transcript: 'a'.repeat(900) }))).toHaveLength(MAX_TRANSCRIPT);
  });
  it('hasSound: silence and a faint hiss are not sound; a voice-level signal is', () => {
    expect(hasSound(new Float32Array(1000))).toBe(false);
    expect(hasSound(tone(1000, 0.004))).toBe(false);
    expect(hasSound(tone(1000, 0.2))).toBe(true);
  });
  it('wavBase64 writes a mono 16-bit 16 kHz WAV of the right length and values', () => {
    const bin = atob(wavBase64(Float32Array.from([0, 1, -1, 0.5, 2])));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const v = new DataView(bytes.buffer);
    expect(bin.slice(0, 4) + bin.slice(8, 16) + bin.slice(36, 40)).toBe('RIFFWAVEfmt data');
    expect(bytes.length).toBe(44 + 5 * 2);
    expect(v.getUint32(4, true)).toBe(36 + 10);
    expect([v.getUint16(20, true), v.getUint16(22, true), v.getUint32(24, true), v.getUint32(28, true), v.getUint16(32, true), v.getUint16(34, true)]).toEqual([1, 1, 16000, 32000, 2, 16]);
    expect(v.getUint32(40, true)).toBe(10);
    expect([0, 1, 2, 3, 4].map((i) => v.getInt16(44 + i * 2, true))).toEqual([0, 32767, -32768, 16384, 32767]);
  });
  it('a long clip does not overflow the call stack when it is made into base64', () => {
    expect(wavBase64(tone(SAMPLE_RATE * VOICE_MAX_SECONDS)).length).toBe(Math.ceil((44 + SAMPLE_RATE * VOICE_MAX_SECONDS * 2) / 3) * 4);
  });
});

describe('voice input: the request, and what the app says about where the recording goes', () => {
  const V = COPY.voice;
  const main = read('web/src/main.ts');
  const voiceSrc = read('web/src/voice.ts');
  const micSrc = read('web/src/mic.ts');
  it('the request asks for the words only, as JSON, in the cloud, and carries nothing but the fixed text and the sound', () => {
    const r = voiceRequest({ mimeType: 'audio/wav', base64: 'AAAA' });
    expect(r.mode).toBe('ONLY_IN_CLOUD');
    expect(r.contents[0].parts[0]).toEqual({ inlineData: { mimeType: 'audio/wav', data: 'AAAA' } });
    expect(r.generationConfig.responseJsonSchema).toBe(TRANSCRIBE_SCHEMA);
    expect(TRANSCRIBE_SCHEMA.required).toEqual(['transcript']);
    expect(TRANSCRIBE_SYSTEM_PROMPT).toMatch(/Do not answer the question/);
    expect(LEGS.voice.mode).toBe('ONLY_IN_CLOUD');
  });
  it('the notice says the recording goes to Google\'s cloud, with names, and never says it stays on this computer', () => {
    const n = V.notice(VOICE_MAX_SECONDS);
    expect(n).toMatch(/sends the recording to Google's cloud/);
    expect(n).toMatch(/an AI model turns it into text/);
    expect(COPY.how.intro).toMatch(/All AI inference in this app goes through Firebase AI Logic.*the microphone, which sends a recording of your question to Gemini in Google's cloud/);
    expect(n).toMatch(/up to 15 seconds/);
    expect(n).toMatch(/with any names you say: the name swap cannot be applied to sound/);
    expect(n).toMatch(/For your question only: their speech is never recorded\./);
    for (const t of [n, V.recording(VOICE_MAX_SECONDS), V.working, V.asking, V.heard, V.tailKept, V.tailAlso, V.sentNote, V.privacy]) expect(t).not.toMatch(/on this computer|on-device|private|your browser's speech recognition/i);
    expect(V.working).toMatch(/Google's cloud/);
  });
  it('"on this computer" is said for a recording only on the SDK\'s report for that call', () => {
    expect(V.heardHere).toMatch(/on this computer/);
    expect(main).toContain("voiceHeard ? esc(v.source === 'on-device' ? V.heardHere : V.heard) : ''");
    expect(main.match(/heardHere/g)).toHaveLength(1);
    expect(main).toContain("dictated = v.source !== 'on-device';");
  });
  it('the first press shows the notice; recording starts only after a yes, and a yes to the earlier notice (the browser\'s speech recognition) does not count', () => {
    expect(main).toContain("if (!voiceAgreed()) { voiceAsk = !voiceAsk; patchVoice(); break; }");
    expect(main).toContain("const voiceAgreed = () => state.settings.voiceOk === 'cloud';");
    expect(main).toContain("case 'voice-ok': state.settings.voiceOk = 'cloud'; saveSettings(); voiceAsk = false; startVoice(); break;");
    expect(main.match(/voice\.start\(\)/g)).toHaveLength(1); // from startVoice only
  });
  it('the words go into the question field and no further: the voice code never makes a card', () => {
    const block = main.slice(main.indexOf('// ---------------------------------------------------------------- voice input'), main.indexOf('// ---------------------------------------------------------------- partner screen'));
    expect(block).toContain('if (q) q.value = v.text;');
    expect(block).not.toMatch(/\bmake\(|makeCard|requestSubmit|\.submit\(/);
  });
  it('once a recording was handed over, no line says "nothing left this computer" or "0 bytes" without it', () => {
    expect(V.tailKept).not.toContain(COPY.badge.tail.kept);
    expect(V.tailKept).toMatch(/its recording went to Google's cloud/);
    expect(main).toContain('if (voiceCards.has(c)) tail = tail.startsWith(T.kept) ? tail.replace(T.kept, C.voice.tailKept) : `${tail} · ${C.voice.tailAlso}`;');
    const none = { cards: 2, cardsLeft: 0, bodyBytes: 0, namesWithheld: 0, otherWithheld: 0, attempts: 0, attemptBytes: 0 };
    const N = COPY.judge.receipt.number;
    const clip = { clips: 1, bytes: 120000 };
    expect(N(none).label).toBe('left this computer');
    expect(N(none).figure).toBe('0 bytes');
    expect(N(none, false, clip)).toMatchObject({ state: 'sent', figure: '120,000 bytes', label: 'handed to Google\'s cloud by this app' });
    expect(N(none, false, clip).scope).toMatch(/1 recording of a spoken question \(120,000 bytes of sound, as you said it, no name swap\)/);
    // with a card request too, the figure is the sum and both are named
    const both = N({ ...none, cardsLeft: 1, bodyBytes: 900 }, true, { clips: 2, bytes: 200000 });
    expect(both.figure).toBe('200,900 bytes');
    expect(both.scope).toMatch(/2 recordings of a spoken question .* and 1 card request, the question only \(900 bytes\)/);
    // a failed card request is still listed apart
    expect(N({ ...none, attempts: 1, attemptBytes: 900 }, false, clip).scope).toMatch(/may have left \(up to 900 bytes\)/);
    for (const r of [N(none, false, clip), N(none, true, clip), both]) expect(`${r.figure} ${r.label}`).not.toMatch(/^0 bytes|left this computer/);
    // and without a recording the lines are what they were
    expect(N(none, false, null)).toEqual(N(none));
    expect(N(none, false, { clips: 0, bytes: 0 })).toEqual(N(none));
  });
  it('the session figure counts every recording handed to the SDK: answered in the cloud, or failed after being handed over', () => {
    expect(main).toContain("if (outcome !== 'in-cloud' && outcome !== 'failed') return;");
    expect(main).toContain('voiceSent.clips++; voiceSent.bytes += bytes;');
    expect(main).toContain('C.judge.receipt.number(sessionReceipt(state.made, state.profile), settingsAsked, voiceSent)');
  });
  it('the person\'s speech is never recorded: the microphone is on the partner\'s question form and nowhere on their screen', () => {
    const view = main.slice(main.indexOf('function personView('), main.indexOf('// ---------------------------------------------------------------- About me'));
    expect(view).not.toMatch(/voice|mic\b|MIC|Recorder/);
    expect(main).toContain("if (r !== 'partner') voice.cancel();"); // and it stops recording when the partner screen is left
    expect(main.match(/\$\{voiceButton\(\)\}/g)).toHaveLength(1);
    expect(main).toContain('${voiceButton()}<button id="make"');
  });
  it('the browser\'s own speech recognition is gone from the client: no AI call outside Firebase AI Logic', () => {
    for (const src of [main, voiceSrc.replace(/^\s*\/\/.*$/gm, ''), micSrc]) {
      expect(src).not.toMatch(/SpeechRecognition|webkitSpeech|processLocally|recognitionCtor|localAvailable/);
    }
    // the recording modules call no model and no network themselves: the one request is the engine's
    for (const src of [voiceSrc, micSrc]) expect(src.replace(/^\s*\/\/.*$/gm, '')).not.toMatch(/\bfetch\(|XMLHttpRequest|firebase\//);
    expect(main).toContain('await state.engine.transcribe!(clip)');
  });
});
