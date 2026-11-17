// Voice input for the partner's question (web/src/voice.ts), written 17 Nov 2026. The state machine is run against
// a scripted recognition object: start, interim words, final words, each error, a browser with no speech
// recognition, and the on-device option. These tests cannot show how well a real browser recognises speech, nor
// where a real browser sends the sound; what the app says about that is pinned in the last group.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { COPY } from '../../core/copy';
import { chromeMajor, createVoice, localAvailable, recognitionCtor, tidy, type RecognitionCtor, type RecognitionLike, type VoiceView } from '../../web/src/voice';

const ROOT = join(__dirname, '..', '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

/** A scripted stand-in for the browser's SpeechRecognition: records what it was told, fires what the test says. */
class FakeRec implements RecognitionLike {
  static made: FakeRec[] = [];
  static throwOnStart = false;
  lang = ''; continuous = true; interimResults = false; maxAlternatives = 5;
  processLocally?: boolean;
  onresult: RecognitionLike['onresult'] = null;
  onerror: RecognitionLike['onerror'] = null;
  onend: RecognitionLike['onend'] = null;
  calls: string[] = [];
  constructor() { FakeRec.made.push(this); }
  start() { this.calls.push('start'); if (FakeRec.throwOnStart) throw new Error('InvalidStateError'); }
  stop() { this.calls.push('stop'); }
  abort() { this.calls.push('abort'); }
  /** Fires a result event: each part is [words, isFinal]. */
  say(...parts: [string, boolean][]) { this.onresult?.({ results: parts.map(([transcript, isFinal]) => ({ isFinal, 0: { transcript } })) }); }
  fail(error: string) { this.onerror?.({ error }); }
  end() { this.onend?.(); }
}
const Ctor = FakeRec as unknown as RecognitionCtor;

let seen: VoiceView[] = [];
const last = () => seen[seen.length - 1];
const rec = () => FakeRec.made[FakeRec.made.length - 1];
const make = (ctor: RecognitionCtor | null = Ctor) => createVoice({ ctor, onChange: (v) => seen.push(v) });
beforeEach(() => { seen = []; FakeRec.made = []; FakeRec.throwOnStart = false; });

describe('voice input: a browser without speech recognition', () => {
  it('no constructor is found, the view says unsupported, and start does nothing and throws nothing', () => {
    expect(recognitionCtor({})).toBeNull();
    expect(recognitionCtor(null)).toBeNull();
    expect(recognitionCtor({ SpeechRecognition: 'not a function' })).toBeNull();
    const v = make(null);
    expect(v.view().supported).toBe(false);
    expect(() => { v.start(); v.stop(); v.cancel(); v.setLocal(true); }).not.toThrow();
    expect(v.view()).toEqual({ supported: false, listening: false, text: '', final: false, error: null, local: false });
    expect(seen).toEqual([]);
  });
  it('the standard name is preferred, the prefixed one is used where it is all there is', () => {
    const A = function A() { /* stand-in */ }; const B = function B() { /* stand-in */ };
    expect(recognitionCtor({ SpeechRecognition: A, webkitSpeechRecognition: B })).toBe(A);
    expect(recognitionCtor({ webkitSpeechRecognition: B })).toBe(B);
  });
  it('the web client draws no microphone button there', () => {
    const main = read('web/src/main.ts');
    const button = main.slice(main.indexOf('function voiceButton()'), main.indexOf('function voiceNote()'));
    expect(button).toContain("if (!v.supported) return '';");
  });
});

describe('voice input: start, interim words, final words', () => {
  it('start asks for US English, one question, interim results, and listens', () => {
    const v = make();
    v.start();
    expect(rec().calls).toEqual(['start']);
    expect(rec().lang).toBe('en-US');
    expect(rec().continuous).toBe(false);
    expect(rec().interimResults).toBe(true);
    expect(rec().maxAlternatives).toBe(1);
    expect(rec().processLocally).toBeUndefined(); // not asked for unless the browser reported it (below)
    expect(last()).toEqual({ supported: true, listening: true, text: '', final: false, error: null, local: false });
  });
  it('interim words are shown as they come, and replaced as the browser revises them', () => {
    const v = make();
    v.start();
    rec().say(['do you', false]);
    expect(last().text).toBe('do you');
    expect(last().listening).toBe(true);
    expect(last().final).toBe(false);
    rec().say(['do you want copy', false]);
    expect(last().text).toBe('do you want copy');
    rec().say(['do you want coffee or tea', true]);
    expect(last().text).toBe('do you want coffee or tea');
    expect(last().final).toBe(false); // still listening until the browser ends it
  });
  it('the end fills in the final words as a question: a capital, a question mark, and nothing is submitted', () => {
    const v = make();
    v.start();
    rec().say(['do you want coffee or tea', true]);
    rec().end();
    expect(last()).toEqual({ supported: true, listening: false, text: 'Do you want coffee or tea?', final: true, error: null, local: false });
    // the machine has no way to submit: it only reports a view
    expect(Object.keys(v).sort()).toEqual(['cancel', 'setLocal', 'start', 'stop', 'view']);
  });
  it('several parts of one go are joined in order', () => {
    const v = make();
    v.start();
    rec().say(['how was therapy today', true], [' and did you eat', false]);
    expect(last().text).toBe('how was therapy today and did you eat');
    rec().end();
    expect(last().text).toBe('How was therapy today and did you eat?');
  });
  it('tidy: trims, keeps punctuation the browser gave, leaves the words alone', () => {
    expect(tidy('  where does it   hurt ')).toBe('Where does it hurt?');
    expect(tidy('Do you want tea?')).toBe('Do you want tea?');
    expect(tidy('tell me.')).toBe('Tell me.');
    expect(tidy('   ')).toBe('');
  });
  it('stop asks the browser to finish and keeps what was heard; a second start while listening does nothing', () => {
    const v = make();
    v.start(); v.start();
    expect(FakeRec.made).toHaveLength(1);
    rec().say(['shall we call jenny', false]);
    v.stop();
    expect(rec().calls).toEqual(['start', 'stop']);
    expect(last().listening).toBe(true); // until the browser says it has ended
    rec().say(['shall we call Jenny', true]);
    rec().end();
    expect(last().text).toBe('Shall we call Jenny?');
    expect(last().listening).toBe(false);
  });
  it('cancel drops this go, and nothing that object fires afterwards changes the view', () => {
    const v = make();
    v.start();
    const first = rec();
    first.say(['do you', false]);
    v.cancel();
    expect(first.calls).toEqual(['start', 'abort']);
    expect(last()).toEqual({ supported: true, listening: false, text: '', final: false, error: null, local: false });
    const n = seen.length;
    first.say(['do you want', true]); first.fail('aborted'); first.end();
    expect(seen).toHaveLength(n);
    // and a new go starts clean
    v.start();
    expect(rec()).not.toBe(first);
    expect(last().listening).toBe(true);
    expect(last().text).toBe('');
  });
  it('a new go replaces the words of the one before', () => {
    const v = make();
    v.start(); rec().say(['coffee or tea', true]); rec().end();
    v.start();
    expect(last().text).toBe('');
    expect(last().final).toBe(false);
    rec().say(['are you cold', true]); rec().end();
    expect(last().text).toBe('Are you cold?');
  });
});

describe('voice input: errors', () => {
  it.each([
    ['not-allowed', 'blocked'], ['service-not-allowed', 'blocked'], ['no-speech', 'no-speech'], ['audio-capture', 'no-mic'],
    ['network', 'network'], ['language-not-supported', 'language'], ['bad-grammar', 'failed'], ['something-new', 'failed'],
  ])('%s is reported as "%s", listening ends, and there is a sentence for it', (code, kind) => {
    const v = make();
    v.start();
    rec().fail(code); rec().end();
    expect(last().listening).toBe(false);
    expect(last().error).toBe(kind);
    expect(last().final).toBe(false);
    expect(last().text).toBe('');
    expect(COPY.voice.errors[kind as keyof typeof COPY.voice.errors]).toMatch(/\.$/);
  });
  it('an end with nothing heard and no error from the browser reads as "nothing was heard"', () => {
    const v = make();
    v.start(); rec().end();
    expect(last().error).toBe('no-speech');
  });
  it('"aborted" is not an error by itself', () => {
    const v = make();
    v.start(); rec().say(['do you want tea', true]); rec().fail('aborted'); rec().end();
    expect(last().error).toBeNull();
    expect(last().text).toBe('Do you want tea?');
  });
  it('an error after some words keeps the words and names the error', () => {
    const v = make();
    v.start(); rec().say(['where does it', false]); rec().fail('network'); rec().end();
    expect(last().text).toBe('Where does it?');
    expect(last().error).toBe('network');
  });
  it('a start the browser refuses is an error, not an exception, and the next press can try again', () => {
    FakeRec.throwOnStart = true;
    const v = make();
    expect(() => v.start()).not.toThrow();
    expect(last()).toEqual({ supported: true, listening: false, text: '', final: false, error: 'failed', local: false });
    FakeRec.throwOnStart = false;
    v.start();
    expect(last().listening).toBe(true);
    expect(last().error).toBeNull();
  });
  it('every error the machine can report has a sentence, and no sentence is spare', () => {
    expect(Object.keys(COPY.voice.errors).sort()).toEqual(['blocked', 'failed', 'language', 'network', 'no-mic', 'no-speech']);
  });
});

describe('voice input: on-device recognition is used only where the browser reports it', () => {
  const withAvailable = (answer: string | Error, hasFlag = true) => {
    const asked: unknown[] = [];
    class R extends FakeRec {
      static available(o: unknown) { asked.push(o); return answer instanceof Error ? Promise.reject(answer) : Promise.resolve(answer); }
    }
    if (hasFlag) Object.defineProperty(R.prototype, 'processLocally', { value: false, writable: true, configurable: true });
    return { R: R as unknown as RecognitionCtor, asked };
  };
  it('"available" for en-US with processLocally is a yes, and the query is a capability query only', async () => {
    const { R, asked } = withAvailable('available');
    expect(await localAvailable(R, 'en-US', CHROME157)).toBe(true);
    expect(asked).toEqual([{ langs: ['en-US'], processLocally: true }]);
    expect(FakeRec.made).toHaveLength(0); // no recognition object was made for the question
  });
  it.each(['downloadable', 'downloading', 'unavailable', 'anything else'])('"%s" is a no: the app installs nothing', async (answer) => {
    expect(await localAvailable(withAvailable(answer).R, 'en-US', CHROME157)).toBe(false);
  });
  it('a browser without the query, without the flag, or whose query fails is a no', async () => {
    expect(await localAvailable(null)).toBe(false);
    expect(await localAvailable(Ctor)).toBe(false);
    expect(await localAvailable(withAvailable('available', false).R, 'en-US', CHROME157)).toBe(false);
    expect(await localAvailable(withAvailable(new Error('nope')).R, 'en-US', CHROME157)).toBe(false);
  });
  it('the source never installs a language pack', () => {
    expect(read('web/src/voice.ts')).not.toMatch(/\.install\(/);
    expect(read('web/src/main.ts')).not.toMatch(/\.install\(/);
  });
  it('once reported, every start asks the browser to keep the sound on the device, and the view says local', () => {
    const v = make();
    v.setLocal(true);
    v.start();
    expect(rec().processLocally).toBe(true);
    expect(last().local).toBe(true);
    v.cancel(); v.setLocal(false); v.start();
    expect(rec().processLocally).toBeUndefined();
    expect(last().local).toBe(false);
  });
  it('an on-device start that fails is an error: the machine never starts the default service in its place', () => {
    const v = make();
    v.setLocal(true);
    v.start();
    rec().fail('language-not-supported'); rec().end();
    expect(last().error).toBe('language');
    expect(FakeRec.made).toHaveLength(1);
  });
});

describe('voice input: what the app says about where spoken words go, and how the client is wired', () => {
  const V = COPY.voice;
  const main = read('web/src/main.ts');
  it('the default notice names the browser, Chrome and Google, and does not say "on this computer"', () => {
    const n = V.notice(false);
    expect(n).toMatch(/your browser's speech recognition/);
    expect(n).toMatch(/In Chrome, your speech may be sent to Google/);
    expect(n).not.toMatch(/on this computer|on-device|private|stays/i);
    expect(V.listening(false)).toMatch(/may send the sound/);
    expect(V.listening(false)).not.toMatch(/on this computer/);
  });
  it('the on-device notice is worded as what the browser reports and what the app asks, not as a promise of ours', () => {
    expect(V.notice(true)).toMatch(/This browser reports/);
    expect(V.notice(true)).toMatch(/the app asks it/);
    expect(V.notice(true)).not.toMatch(/never leaves|guarantee|nothing is sent/i);
  });
  it('both notices say whose speech it is for', () => {
    for (const local of [true, false]) expect(V.notice(local)).toMatch(/For your question only: their speech is never recognised\./);
  });
  it('the first press shows the notice; listening starts only after a yes, and a yes to on-device does not cover the default service', () => {
    expect(main).toContain("if (!voiceAgreed()) { voiceAsk = !voiceAsk; patchVoice(); break; }");
    expect(main).toContain("const voiceAgreed = () => state.settings.voiceOk === 'remote' || (state.settings.voiceOk === 'local' && voice.view().local);");
    expect(main).toContain("case 'voice-ok': state.settings.voiceOk = voice.view().local ? 'local' : 'remote'; saveSettings(); voiceAsk = false; startVoice(); break;");
    // voice.start() is called from startVoice only
    expect(main.match(/voice\.start\(\)/g)).toHaveLength(1);
  });
  it('heard words go into the question field and no further: the voice code never makes a card', () => {
    const block = main.slice(main.indexOf('// ---------------------------------------------------------------- voice input'), main.indexOf('// ---------------------------------------------------------------- partner screen'));
    expect(block).toContain('if (q) q.value = v.text;');
    expect(block).not.toMatch(/\bmake\(|makeCard|requestSubmit|\.submit\(/);
  });
  it('once a question was spoken through the default service, no line on screen says "nothing left this computer" for it', () => {
    expect(V.tailKept).not.toContain(COPY.badge.tail.kept);
    expect(V.tailKept).toMatch(/nothing sent by this app/);
    expect(main).toContain('if (voiceCards.has(c)) tail = tail.startsWith(T.kept) ? tail.replace(T.kept, C.voice.tailKept) : `${tail} · ${C.voice.tailAlso}`;');
    const none = { cards: 2, cardsLeft: 0, bodyBytes: 0, namesWithheld: 0, otherWithheld: 0, attempts: 0, attemptBytes: 0 };
    const N = COPY.judge.receipt.number;
    expect(N(none).label).toBe('left this computer');
    expect(N(none, false, true).label).toBe('handed to cloud help by this app');
    expect(N(none, false, true).scope).toMatch(/Not counted: questions spoken into the microphone/);
    expect(N(none, true, true).label).not.toMatch(/left this computer/);
    expect(N({ ...none, cardsLeft: 1, bodyBytes: 900 }, false, true).scope).toMatch(/Not counted: questions spoken into the microphone/);
    expect(N({ ...none, attempts: 1, attemptBytes: 900 }, false, true).scope).toMatch(/Not counted: questions spoken into the microphone/);
    // and without voice the lines are what they were
    expect(N(none, false, false)).toEqual(N(none));
  });
  it('the person\'s speech is never recognised: the microphone is on the partner\'s question form and nowhere on their screen', () => {
    const view = main.slice(main.indexOf('function personView('), main.indexOf('// ---------------------------------------------------------------- About me'));
    expect(view).not.toMatch(/voice|mic\b|MIC|Recognition/);
    expect(main).toContain("if (r !== 'partner') voice.cancel();"); // and it stops listening when the partner screen is left
    expect(main.match(/\$\{voiceButton\(\)\}/g)).toHaveLength(1);
    expect(main).toContain('${voiceButton()}<button id="make"');
  });
});

const CHROME157 = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.8103.79 Safari/537.36';
describe('older Chromium: available() is never called (Chromium 148 crashed the tab on it, 17 Nov)', () => {
  it('reads the Chrome major version', () => {
    expect(chromeMajor(CHROME157)).toBe(157);
    expect(chromeMajor('Mozilla/5.0 Firefox/140.0')).toBe(0);
  });
  it('does not call available() below Chrome 157 and answers no', async () => {
    let called = 0;
    class R { static available() { called++; return Promise.resolve('available'); } }
    (R.prototype as unknown as { processLocally: boolean }).processLocally = false;
    expect(await localAvailable(R as unknown as RecognitionCtor, 'en-US', CHROME157.replace('157.0', '148.0'))).toBe(false);
    expect(called).toBe(0);
    expect(await localAvailable(R as unknown as RecognitionCtor, 'en-US', CHROME157)).toBe(true);
    expect(called).toBe(1);
  });
});
