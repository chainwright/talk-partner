// 16 Nov 2026 (judge round 2, engineering seat): the one file that touches the SDK had no behaviour test, so two
// mutants lived: swapping the private leg onto the cloud model, and inverting the inferenceSource mapping. This test
// runs the real engine file against a recording stand-in for the three SDK packages and checks the wiring itself:
// which model each leg calls, with which mode, on which Firebase app, and what it does with the reported source.
// The real SDK and the real model are exercised in scripts/e2e-cloud.mjs and scripts/e2e-ondevice.mjs.
import { beforeEach, describe, expect, it, vi } from 'vitest';

interface Rec { apps: string[]; appChecks: string[]; ais: { app: string; options: any }[]; models: { app: string; mode: string; params: any }[]; calls: { mode: string; prompt: string }[]; inits: string[] }
const rec: Rec = { apps: [], appChecks: [], ais: [], models: [], calls: [], inits: [] };
const answers: Record<string, { text: string; source: string } | Error> = {};

vi.mock('firebase/app', () => ({
  initializeApp: (_o: unknown, name = '[DEFAULT]') => { rec.apps.push(name); return { name }; },
  // the default app is shared with Remote Config (web/src/ai/app.ts): started once, found again afterwards
  getApps: () => rec.apps.map((name) => ({ name })),
}));
vi.mock('firebase/app-check', () => ({
  initializeAppCheck: (app: { name: string }) => { rec.appChecks.push(app.name); },
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
      generateContent: async (prompt: string) => {
        rec.calls.push({ mode: params.mode, prompt });
        const a = answers[params.mode];
        if (a instanceof Error) throw a;
        return { response: { inferenceSource: a.source, text: () => a.text, inlineDataParts: () => [] } };
      },
    };
  },
}));

const { FirebaseEngine, LazyFirebaseEngine } = await import('../../web/src/ai/firebaseEngine');
const { SYSTEM_PROMPT, CLOUD_SYSTEM_PROMPT, CARD_SCHEMA } = await import('../../core/prompt');
const CFG = { firebase: { apiKey: 'k', appId: 'a', projectId: 'p' }, appCheckDebugToken: 'debug' };

beforeEach(() => {
  rec.apps = []; rec.appChecks = []; rec.ais = []; rec.models = []; rec.calls = []; rec.inits = [];
  answers.only_on_device = { text: '{"topic":"t"}', source: 'on_device' };
  answers.prefer_in_cloud = { text: '{"topic":"c"}', source: 'in_cloud' };
  (globalThis as any).self = globalThis;
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
  // 17 Nov 2026: the cloud step asks for limited-use App Check tokens; the private leg has no App Check and no such option
  it('the AI Logic instance of the cloud step uses limited-use App Check tokens; the private one does not', async () => {
    const e = new LazyFirebaseEngine(CFG);
    await e.runCloud('x');
    await e.runDevice('y');
    expect(rec.ais.find((a) => a.app === '[DEFAULT]')?.options.useLimitedUseAppCheckTokens).toBe(true);
    expect(rec.ais.find((a) => a.app === 'private-on-device')?.options.useLimitedUseAppCheckTokens).toBeUndefined();
    expect(rec.ais).toHaveLength(2);
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
