// 16 Nov 2026 (judge round 2, engineering seat): the one file that touches the SDK had no behaviour test, so two
// mutants lived: swapping the private leg onto the cloud model, and inverting the inferenceSource mapping. This test
// runs the real engine file against a recording stand-in for the three SDK packages and checks the wiring itself:
// which model each leg calls, with which mode, on which Firebase app, and what it does with the reported source.
// The real SDK and the real model are exercised in scripts/e2e-cloud.mjs and scripts/e2e-ondevice.mjs.
import { beforeEach, describe, expect, it, vi } from 'vitest';

interface Rec { apps: string[]; appChecks: string[]; ais: { app: string; options: any }[]; models: { app: string; mode: string; params: any }[]; calls: { mode: string; prompt: any }[]; inits: string[] }
const rec: Rec = { apps: [], appChecks: [], ais: [], models: [], calls: [], inits: [] };
const answers: Record<string, { text: string; source: string } | Error> = {};

vi.mock('firebase/app', () => ({
  initializeApp: (_o: unknown, name = '[DEFAULT]') => { rec.apps.push(name); return { name }; },
  // the default app is shared with Remote Config (web/src/ai/app.ts): started once, found again afterwards
  getApps: () => rec.apps.map((name) => ({ name })),
}));
// App Check's public getToken: rejects with App Check's own error when it has no valid token (`tokenError`), else resolves
let tokenError: Error | null = null;
let tokenAsked = 0;
vi.mock('firebase/app-check', () => ({
  initializeAppCheck: (app: { name: string }) => { rec.appChecks.push(app.name); return { app: app.name }; },
  getToken: async () => { tokenAsked++; if (tokenError) throw tokenError; return { token: 't' }; },
  ReCaptchaEnterpriseProvider: class { constructor(public key: string) {} },
}));
vi.mock('firebase/ai', () => ({
  InferenceMode: { ONLY_ON_DEVICE: 'only_on_device', PREFER_IN_CLOUD: 'prefer_in_cloud', ONLY_IN_CLOUD: 'only_in_cloud', PREFER_ON_DEVICE: 'prefer_on_device' },
  InferenceSource: { ON_DEVICE: 'on_device', IN_CLOUD: 'in_cloud' },
  ResponseModality: { TEXT: 'TEXT', IMAGE: 'IMAGE' },
  GoogleAIBackend: class {},
  getAI: (app: { name: string }, options?: unknown) => { rec.ais.push({ app: app.name, options }); return { app: app.name }; },
  getGenerativeModel: (ai: { app: string }, params: any) => {
    rec.models.push({ app: ai.app, mode: params.mode, params });
    return {
      initializeDeviceModel: async () => { rec.inits.push(params.mode); },
      generateContent: async (prompt: any) => {
        rec.calls.push({ mode: params.mode, prompt });
        const a = answers[params.mode];
        if (a instanceof Error) throw a;
        return { response: { inferenceSource: a.source, text: () => a.text, inlineDataParts: () => [] } };
      },
    };
  },
}));

const { FirebaseEngine, LazyFirebaseEngine } = await import('../../web/src/ai/firebaseEngine');
const { SYSTEM_PROMPT, CLOUD_SYSTEM_PROMPT, CARD_SCHEMA, TRANSCRIBE_PROMPT, TRANSCRIBE_SCHEMA, TRANSCRIBE_SYSTEM_PROMPT } = await import('../../core/prompt');
const CFG = { firebase: { apiKey: 'k', appId: 'a', projectId: 'p' }, appCheckDebugToken: 'debug' };

beforeEach(() => {
  rec.apps = []; rec.appChecks = []; rec.ais = []; rec.models = []; rec.calls = []; rec.inits = [];
  answers.only_on_device = { text: '{"topic":"t"}', source: 'on_device' };
  answers.prefer_in_cloud = { text: '{"topic":"c"}', source: 'in_cloud' };
  answers.only_in_cloud = { text: '{"transcript":"do you want tea"}', source: 'in_cloud' };
  (globalThis as any).self = globalThis;
  tokenError = null; tokenAsked = 0;
});

describe('FirebaseEngine: the private leg', () => {
  it('constructing the engine starts nothing', () => {
    new FirebaseEngine(CFG);
    expect(rec.apps).toEqual([]);
    expect(rec.appChecks).toEqual([]);
  });
  it('runs on the ONLY_ON_DEVICE model, on its own app, without App Check and without the cloud app', async () => {
    const e = new FirebaseEngine(CFG);
    const r = await e.runDevice('ABOUT … Partner asks: x');
    expect(r).toMatchObject({ text: '{"topic":"t"}', source: 'on-device' });
    expect(rec.calls).toEqual([{ mode: 'only_on_device', prompt: 'ABOUT … Partner asks: x' }]);
    expect(rec.apps).toEqual(['private-on-device']);
    expect(rec.appChecks).toEqual([]);
    expect(rec.models).toHaveLength(1);
    expect(rec.models[0].params.inCloudParams).toBeUndefined();
    expect(rec.models[0].params.onDeviceParams.createOptions.initialPrompts[0].content[0].value).toBe(SYSTEM_PROMPT);
    expect(rec.models[0].params.onDeviceParams.promptOptions.responseConstraint).toBe(CARD_SCHEMA);
  });
  it('rejects an answer the SDK did not report as on-device', async () => {
    answers.only_on_device = { text: '{}', source: 'in_cloud' };
    await expect(new FirebaseEngine(CFG).runDevice('x')).rejects.toThrow(/didn't run on this computer/);
  });
  it('the warm-up and the download go through the same private model and carry no About me', async () => {
    const e = new FirebaseEngine(CFG);
    await e.warmDevice();
    await e.prepareDevice();
    expect(rec.calls).toHaveLength(1);
    expect(rec.calls[0].mode).toBe('only_on_device');
    expect(rec.calls[0].prompt).not.toContain('ABOUT');
    expect(rec.inits).toEqual(['only_on_device']);
    expect(rec.appChecks).toEqual([]);
  });
});

describe('FirebaseEngine: the stripped leg', () => {
  it('runs on the PREFER_IN_CLOUD model on the default app, after App Check, with the cloud instructions and the one schema', async () => {
    const e = new FirebaseEngine(CFG);
    const r = await e.runCloud('What should I tell Person A?');
    expect(r).toMatchObject({ text: '{"topic":"c"}', source: 'in-cloud' });
    expect(rec.calls).toEqual([{ mode: 'prefer_in_cloud', prompt: 'Partner asks: What should I tell Person A?' }]);
    expect(rec.apps).toEqual(['[DEFAULT]']);
    expect(rec.appChecks).toEqual(['[DEFAULT]']);
    const m = rec.models.find((x) => x.mode === 'prefer_in_cloud')!;
    expect(m.params.inCloudParams.systemInstruction).toBe(CLOUD_SYSTEM_PROMPT);
    expect(m.params.inCloudParams.generationConfig.responseJsonSchema).toBe(CARD_SCHEMA);
    expect(m.params.onDeviceParams.createOptions.initialPrompts[0].content[0].value).toBe(CLOUD_SYSTEM_PROMPT);
    expect(m.params.onDeviceParams.createOptions.initialPrompts[0].content[0].value).not.toContain('ABOUT lists');
  });
  // 17 Nov 2026, evening: limited-use tokens are gone again. With them the SDK makes a new reCAPTCHA attestation for
  // every cloud request and throws before sending when one fails (live: 403 "App attestation failed", then no card).
  // With the session token a failed attestation still sends the request, and one attestation serves the session.
  // 24 Nov 2026, phase 17 (judge round 12, P0 2): limited-use tokens were tried, with App Check started early on the
  // question field (web/src/main.ts, warmCloud), so a refused browser is known before the yes. The risk named on
  // 17 Nov stands: a failed attestation per request means no card; LIMITED_USE_TOKENS turns it off in one line.
  // and turned off again before deploy: the session token served a real phone's cloud card on 21bb1e0.
  it('the AI Logic instance of the cloud step uses the session App Check token (limited-use off); the private step has no App Check', async () => {
    const e = new LazyFirebaseEngine(CFG);
    await e.runCloud('x');
    await e.runDevice('y');
    expect(rec.ais.find((a) => a.app === '[DEFAULT]')?.options.useLimitedUseAppCheckTokens).toBe(false);
    expect(rec.ais.find((a) => a.app === 'private-on-device')?.options.useLimitedUseAppCheckTokens).toBeUndefined();
    expect(rec.ais).toHaveLength(2);
  });
  // 17 Nov 2026, the hosted copy with the session token: reCAPTCHA refused the browser (403), the SDK sent the request
  // all the same with a placeholder token, and the service answered 400 "Firebase AI Logic genai config not found",
  // which names nothing the partner or a judge can act on. (Measured the same evening: the same request with a valid
  // App Check token got 200, with none or the placeholder 400.) The engine asks App Check why, and says so first.
  const GENAI = 'AI: Error fetching from https://example.invalid/v1beta/projects/p/models/m:generateContent: [400 ] Firebase AI Logic genai config not found. (AI/fetch-error)';
  const REFUSED = 'AppCheck: Requests throttled due to previous 403 error. Attempts allowed again after 23h:59m:58s (appCheck/throttled).';
  it.each(['runCloud', 'transcribe'] as const)('%s: a cloud call that fails while App Check has no token for this browser is named as an App Check failure, with both messages kept', async (call) => {
    answers.prefer_in_cloud = new Error(GENAI); answers.only_in_cloud = new Error(GENAI);
    tokenError = new Error(REFUSED);
    const e = new FirebaseEngine(CFG);
    const err = await (call === 'runCloud' ? e.runCloud('x') : e.transcribe({ mimeType: 'audio/wav', base64: 'UklGRg==' })).then(() => null, (x: Error) => x);
    expect(err).toBeInstanceOf(Error);
    expect(err!.message.startsWith('App Check gave no token for this browser')).toBe(true);
    expect(err!.message).toContain(REFUSED);
    expect(err!.message).toContain(GENAI);
    expect((err as any).notSent).toBe(false);
    expect(tokenAsked).toBe(1);
  });
  it('a cloud call that fails while App Check has a token keeps the service\'s message as it is', async () => {
    answers.prefer_in_cloud = new Error('AI: Error fetching: [429 ] Resource has been exhausted');
    const err = await new FirebaseEngine(CFG).runCloud('x').then(() => null, (x: Error) => x);
    expect(err!.message).toBe('AI: Error fetching: [429 ] Resource has been exhausted');
    expect(tokenAsked).toBe(1);
  });
  it('offline: App Check is not asked (it could only fail too), and the request is marked as not sent', async () => {
    answers.prefer_in_cloud = new TypeError('Failed to fetch');
    tokenError = new Error(REFUSED);
    const nav = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    Object.defineProperty(globalThis, 'navigator', { value: { onLine: false }, configurable: true });
    try {
      const err = await new FirebaseEngine(CFG).runCloud('x').then(() => null, (x: Error) => x);
      expect(err!.message).toBe('Failed to fetch');
      expect((err as any).notSent).toBe(true);
      expect(tokenAsked).toBe(0);
    } finally { if (nav) Object.defineProperty(globalThis, 'navigator', nav); else delete (globalThis as any).navigator; }
  });
  it('a cloud call that succeeds never asks App Check for anything extra', async () => {
    await new FirebaseEngine(CFG).runCloud('x');
    expect(tokenAsked).toBe(0);
  });
  it('reports an offline fall-back as on-device, from inferenceSource', async () => {
    answers.prefer_in_cloud = { text: '{}', source: 'on_device' };
    expect((await new FirebaseEngine(CFG).runCloud('x')).source).toBe('on-device');
  });
  it('throws without an App Check provider, before any SDK call', async () => {
    const e = new FirebaseEngine({ firebase: CFG.firebase });
    expect(e.cloudConfigured).toBe(false);
    await expect(e.runCloud('x')).rejects.toThrow(/not set up/);
    expect(rec.apps).toEqual([]);
  });
  it('a private card after a cloud card still uses the private app and model', async () => {
    const e = new LazyFirebaseEngine(CFG);
    await e.runCloud('x');
    await e.runDevice('y');
    expect(rec.calls.map((c) => c.mode)).toEqual(['prefer_in_cloud', 'only_on_device']);
    expect(rec.apps).toEqual(['[DEFAULT]', 'private-on-device']);
    expect(rec.appChecks).toEqual(['[DEFAULT]']);
  });
});

describe('the cloud model name is a setting (Firebase Remote Config, core/models.ts)', () => {
  it('until a name is given, the cloud step and the request shown under a card use the default in the code', async () => {
    const { CLOUD_TEXT_MODEL } = await import('../../core/models');
    const e = new LazyFirebaseEngine(CFG);
    expect((e.cloudRequest('q') as { model: string }).model).toBe(CLOUD_TEXT_MODEL);
    await e.runCloud('q');
    expect(rec.models.find((m) => m.mode === 'prefer_in_cloud')?.params.inCloudParams.model).toBe(CLOUD_TEXT_MODEL);
  });
  it('a name given before or after the first cloud call is the model of the next call, and of the request shown; the private step is untouched', async () => {
    const e = new LazyFirebaseEngine(CFG);
    e.setCloudModel('gemini-9.9-flash-lite');
    expect((e.cloudRequest('q') as { model: string }).model).toBe('gemini-9.9-flash-lite');
    expect(rec.apps).toEqual([]); // naming the model starts nothing
    await e.runCloud('q');
    expect(rec.models.filter((m) => m.mode === 'prefer_in_cloud').at(-1)?.params.inCloudParams.model).toBe('gemini-9.9-flash-lite');
    e.setCloudModel('gemini-9.8-flash-lite');
    await e.runCloud('q');
    expect(rec.models.filter((m) => m.mode === 'prefer_in_cloud').at(-1)?.params.inCloudParams.model).toBe('gemini-9.8-flash-lite');
    expect(rec.apps.filter((a) => a === '[DEFAULT]')).toHaveLength(1); // the default app is started once
    expect(rec.appChecks).toHaveLength(1); // and App Check once
    await e.runDevice('x');
    expect(rec.models.find((m) => m.mode === 'only_on_device')?.params.inCloudParams).toBeUndefined();
  });
});

// 17 Nov 2026: voice input goes through the engine, so through Firebase AI Logic (it was the browser's speech
// recognition for a few hours). One recording, one call, on the cloud app with App Check, asked for the words only.
describe('FirebaseEngine: the voice step', () => {
  const CLIP = { mimeType: 'audio/wav', base64: 'UklGRg==' };
  it('one call on an ONLY_IN_CLOUD model on the default app, after App Check, with the sound as inline data and the transcript schema', async () => {
    const e = new FirebaseEngine(CFG);
    const r = await e.transcribe(CLIP);
    expect(r).toMatchObject({ text: '{"transcript":"do you want tea"}', source: 'in-cloud' });
    expect(rec.calls).toEqual([{ mode: 'only_in_cloud', prompt: [{ type: 'inlineData', inlineData: { mimeType: 'audio/wav', data: 'UklGRg==' } }, TRANSCRIBE_PROMPT] }]);
    expect(rec.apps).toEqual(['[DEFAULT]']);
    expect(rec.appChecks).toEqual(['[DEFAULT]']);
    expect(rec.ais).toHaveLength(1);
    expect(rec.ais[0].options.useLimitedUseAppCheckTokens).toBe(false); // (phase 17: limited-use off, as the stripped step)
    const m = rec.models[0];
    expect(m.mode).toBe('only_in_cloud');
    expect(m.params.inCloudParams.systemInstruction).toBe(TRANSCRIBE_SYSTEM_PROMPT);
    expect(m.params.inCloudParams.generationConfig.responseJsonSchema).toBe(TRANSCRIBE_SCHEMA);
    expect(m.params.inCloudParams.generationConfig.responseMimeType).toBe('application/json');
    // no on-device parameters: the SDK cannot run sound on the device, and the mode says so
    expect(m.params.onDeviceParams).toBeUndefined();
  });
  it('the source is the SDK\'s report, not an assumption', async () => {
    answers.only_in_cloud = { text: '{"transcript":"x"}', source: 'on_device' };
    expect((await new FirebaseEngine(CFG).transcribe(CLIP)).source).toBe('on-device');
  });
  it('the request carries the fixed instructions and the sound, and nothing the private step knows', async () => {
    const e = new LazyFirebaseEngine(CFG);
    await e.transcribe(CLIP);
    const sent = JSON.stringify([rec.calls[0].prompt, rec.models[0].params]);
    expect(sent).not.toContain('ABOUT');
    expect(sent).not.toContain(SYSTEM_PROMPT.slice(0, 40));
    expect(rec.apps).toEqual(['[DEFAULT]']); // the private app is not started for it
  });
  it('throws without an App Check provider, before any SDK call, and marks the error as not sent', async () => {
    const e = new FirebaseEngine({ firebase: CFG.firebase });
    await expect(e.transcribe(CLIP)).rejects.toMatchObject({ notSent: true });
    expect(rec.apps).toEqual([]);
  });
  it('shares the app, App Check and the AI Logic instance with the stripped step, and uses the cloud model in use', async () => {
    const e = new LazyFirebaseEngine(CFG);
    e.setCloudModel('gemini-9.9-flash-lite');
    await e.runCloud('q');
    await e.transcribe(CLIP);
    await e.transcribe(CLIP);
    expect(rec.apps).toEqual(['[DEFAULT]']);
    expect(rec.appChecks).toHaveLength(1);
    expect(rec.ais).toHaveLength(1);
    expect(rec.models.filter((m) => m.mode === 'only_in_cloud')).toHaveLength(1); // built once, used twice
    expect(rec.models.find((m) => m.mode === 'only_in_cloud')?.params.inCloudParams.model).toBe('gemini-9.9-flash-lite');
    expect(rec.calls.map((c) => c.mode)).toEqual(['prefer_in_cloud', 'only_in_cloud', 'only_in_cloud']);
  });
});

describe('FirebaseEngine: the letter step on this device (phase 18b)', () => {
  it('runs ONLY_ON_DEVICE on the private app, without App Check, with the letter step\'s instructions and schema (each word with its kind)', async () => {
    const { LETTER_SYSTEM_PROMPT, LETTER_SCHEMA } = await import('../../core/prompt');
    answers.only_on_device = { text: '{"kind":"food","words":["stew","steak","steamed pudding","stir fry"],"kinds":["food","food","food","food"]}', source: 'on_device' };
    const e = new FirebaseEngine(CFG);
    const r = await e.letterDevice('ABOUT … Partner asks: x');
    expect(r).toMatchObject({ source: 'on-device' });
    expect(rec.calls).toEqual([{ mode: 'only_on_device', prompt: 'ABOUT … Partner asks: x' }]);
    expect(rec.apps).toEqual(['private-on-device']);
    expect(rec.appChecks).toEqual([]);
    expect(rec.models[0].params.inCloudParams).toBeUndefined();
    expect(rec.models[0].params.onDeviceParams.createOptions.initialPrompts[0].content[0].value).toBe(LETTER_SYSTEM_PROMPT);
    expect(rec.models[0].params.onDeviceParams.promptOptions.responseConstraint).toBe(LETTER_SCHEMA);
    answers.only_on_device = { text: '{}', source: 'in_cloud' };
    await expect(new FirebaseEngine(CFG).letterDevice('x')).rejects.toThrow(/didn't run on this computer/);
  });
});
