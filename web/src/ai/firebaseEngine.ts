// Web client engine: every model call goes through Firebase AI Logic (firebase/ai) hybrid inference.
// This is the ONLY file in the repo that imports firebase/ai (tests/unit/no-direct-model-calls.test.ts enforces it).
//
//   leg        mode              gets                                         why
//   private    ONLY_ON_DEVICE    question + About me lists                    family data must never fall back to the cloud.
//                                                                             PREFER_ON_DEVICE would silently send this prompt
//                                                                             to the cloud while Gemini Nano is missing or still
//                                                                             downloading; ONLY_ON_DEVICE throws when the model
//                                                                             is unavailable and waits while it downloads.
//   stripped   PREFER_IN_CLOUD   question with About-me words swapped out     no profile data, so falling back to the device
//                                                                             when offline is safe.
//
// Two steps, two models. There is no third: pictures are bundled, and the picture-generation model this file once
// defined and never called was removed on 17 Nov 2026.
//
// inferenceSource is read on every response. The private leg treats anything but on-device as an error.
//
// Two Firebase app instances, on purpose. The private leg runs on its own app with NO App Check: App Check loads a
// script from Google the moment it starts, and a card made on this computer must not contact any host at all
// (measured in devlog/ondevice_proof_1/). The cloud leg runs on the default app, with App Check, started on the first
// cloud call only.

import { initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import {
  getAI, getGenerativeModel, GoogleAIBackend, InferenceMode, InferenceSource, type GenerativeModel,
} from 'firebase/ai';
import type { DeviceStatus, Engine, ModelResult } from '../../../core/engine';
import { CLOUD_TEXT_MODEL } from '../../../core/models';
import { CARD_SCHEMA, CLOUD_SYSTEM_PROMPT, SYSTEM_PROMPT, cloudPrompt } from '../../../core/prompt';
import { cloudTextRequest } from '../../../core/requests';
import { defaultApp } from './app';

const IO = {
  expectedInputs: [{ type: 'text' as const, languages: ['en'] }],
  expectedOutputs: [{ type: 'text' as const, languages: ['en'] }],
};
// On device the SDK passes instructions as the session's initial prompt.
const sys = (text: string) => [{ role: 'system' as const, content: [{ type: 'text' as const, value: text }] }];

/**
 * One console line per answered model call: which leg, its mode, and the SDK's own `inferenceSource` value as it came
 * back. No prompt and no answer text is logged. The run logs in devlog/ quote these lines.
 */
function report(leg: 'private' | 'stripped', mode: string, inferenceSource: unknown, ms: number) {
  console.info(`[ai-logic] leg=${leg} mode=${mode} inferenceSource=${String(inferenceSource)} ms=${ms}`);
}

export interface WebConfig {
  firebase: FirebaseOptions;
  /** Local development only (never in a production build): an App Check debug token registered in the console. */
  appCheckDebugToken?: string;
  /** Deployed site: the reCAPTCHA Enterprise site key registered as the App Check provider. */
  recaptchaEnterpriseSiteKey?: string;
}

export class FirebaseEngine implements Engine {
  readonly label = 'Firebase AI Logic hybrid inference';
  readonly cloudConfigured: boolean;
  readonly modes = { device: 'ONLY_ON_DEVICE', cloud: 'PREFER_IN_CLOUD' };
  private privateModel: GenerativeModel | null = null;
  private cloudModel: GenerativeModel | null = null;
  /** The cloud text model in use: the in-code default until Remote Config gives a checked name (core/models.ts). */
  private textModel = CLOUD_TEXT_MODEL;
  private cloudAi: ReturnType<typeof getAI> | null = null;

  constructor(private cfg: WebConfig) {
    this.cloudConfigured = !!(cfg.recaptchaEnterpriseSiteKey || cfg.appCheckDebugToken);
  }

  /** The private leg: its own Firebase app, no App Check, so starting it and running it contact no host. */
  private get device(): GenerativeModel {
    if (this.privateModel) return this.privateModel;
    const local = getAI(initializeApp(this.cfg.firebase, 'private-on-device'), { backend: new GoogleAIBackend() });
    return (this.privateModel = getGenerativeModel(local, {
      mode: InferenceMode.ONLY_ON_DEVICE,
      onDeviceParams: { createOptions: { ...IO, initialPrompts: sys(SYSTEM_PROMPT) }, promptOptions: { responseConstraint: CARD_SCHEMA } },
    }));
  }

  /** The cloud leg: the default Firebase app with App Check (Firebase AI Logic requires it before the first cloud request). */
  private get cloud(): GenerativeModel {
    if (this.cloudModel) return this.cloudModel;
    const cfg = this.cfg;
    // the app, App Check and the AI Logic instance are started once; only the model is built again when Remote
    // Config names another cloud model (setCloudModel)
    if (!this.cloudAi) {
      const app: FirebaseApp = defaultApp(cfg.firebase);
      if (cfg.appCheckDebugToken) (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = cfg.appCheckDebugToken;
      const siteKey = cfg.recaptchaEnterpriseSiteKey || (cfg.appCheckDebugToken ? 'debug-provider-in-use' : '');
      if (siteKey) initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(siteKey), isTokenAutoRefreshEnabled: true });
      // limited-use App Check tokens for the cloud step: the SDK asks App Check for a fresh short-lived token per
      // request instead of reusing the session token (it is what replay protection consumes, once that is switched on
      // for the project). The private leg has no App Check at all, so this does not touch it.
      this.cloudAi = getAI(app, { backend: new GoogleAIBackend(), useLimitedUseAppCheckTokens: true });
    }
    const ai = this.cloudAi;
    return (this.cloudModel = getGenerativeModel(ai, {
      mode: InferenceMode.PREFER_IN_CLOUD,
      inCloudParams: {
        model: this.textModel,
        systemInstruction: CLOUD_SYSTEM_PROMPT,
        // one schema object for both legs: responseJsonSchema in the cloud, responseConstraint on device
        generationConfig: { responseMimeType: 'application/json', responseJsonSchema: CARD_SCHEMA as any },
      },
      onDeviceParams: { createOptions: { ...IO, initialPrompts: sys(CLOUD_SYSTEM_PROMPT) }, promptOptions: { responseConstraint: CARD_SCHEMA } },
    }));
  }

  /**
   * Whether this browser can run the on-device model. This is a capability query only (no inference):
   * Firebase AI Logic has no public availability call on web, so we read Chrome's flag for the same model.
   */
  async deviceStatus(): Promise<DeviceStatus> {
    const lm = (globalThis as any).LanguageModel;
    if (!lm || typeof lm.availability !== 'function') return 'unavailable';
    try {
      return (await lm.availability(IO)) as DeviceStatus;
    } catch {
      return 'unavailable';
    }
  }

  /** Must run from a user gesture: it may start the model download. Goes through the SDK. */
  async prepareDevice(onProgress?: (p: number) => void): Promise<void> {
    await this.device.initializeDeviceModel(onProgress);
  }

  /**
   * Loads the model into memory ahead of the first question (after a browser start this warm-up took 16 to 22 s on
   * the development machine; answers after it about 3 s). One fixed sentence through the private leg, no About me
   * in it; the answer is thrown away. Runs on this computer only, like every call on this leg.
   */
  async warmDevice(): Promise<void> {
    await this.runDevice('Partner asks: Do you want tea?');
  }

  async runDevice(prompt: string): Promise<ModelResult> {
    const t0 = performance.now();
    const r = await this.device.generateContent(prompt);
    if (r.response.inferenceSource !== InferenceSource.ON_DEVICE) {
      // Defence in depth: the private leg must never report a cloud source.
      throw new Error("the private step didn't run on this computer");
    }
    const ms = Math.round(performance.now() - t0);
    report('private', 'ONLY_ON_DEVICE', r.response.inferenceSource, ms);
    return { text: r.response.text(), source: 'on-device', ms };
  }

  /** A model name from Remote Config: the cloud text model is rebuilt with it on the next cloud call. */
  setCloudModel(model: string) {
    if (model === this.textModel) return;
    this.textModel = model;
    this.cloudModel = null;
  }

  cloudRequest(strippedQuestion: string) {
    return cloudTextRequest(strippedQuestion, this.textModel);
  }

  async runCloud(strippedQuestion: string): Promise<ModelResult> {
    if (!this.cloudConfigured) throw Object.assign(new Error('cloud help is not set up (App Check)'), { notSent: true });
    const t0 = performance.now();
    const r = await this.cloud.generateContent(cloudPrompt(strippedQuestion)).catch((e: Error) => {
      // the browser knew it was offline: the request certainly did not leave. Anything else: it may have.
      throw Object.assign(e, { notSent: typeof navigator !== 'undefined' && navigator.onLine === false });
    });
    // the badge comes from inferenceSource, never assumed: PREFER_IN_CLOUD runs on device when offline
    const source = r.response.inferenceSource === InferenceSource.ON_DEVICE ? 'on-device' : 'in-cloud';
    const ms = Math.round(performance.now() - t0);
    report('stripped', 'PREFER_IN_CLOUD', r.response.inferenceSource, ms);
    return { text: r.response.text(), source, ms };
  }

}

/**
 * Lazy wrapper: Firebase (App Check, AI Logic) is initialised only on the first real AI call. Loading the app and
 * making code-only cards (yes/no, either-or, pain, body map, memory) contact no Google host at all
 * (measured by scripts/e2e-cloud.mjs, "hosts contacted on page load").
 */
export class LazyFirebaseEngine implements Engine {
  readonly label = 'Firebase AI Logic hybrid inference';
  readonly modes = { device: 'ONLY_ON_DEVICE', cloud: 'PREFER_IN_CLOUD' };
  readonly cloudConfigured: boolean;
  private inner: FirebaseEngine | null = null;
  private textModel = CLOUD_TEXT_MODEL;
  constructor(private cfg: WebConfig) {
    this.cloudConfigured = !!(cfg.recaptchaEnterpriseSiteKey || cfg.appCheckDebugToken);
  }
  private get e(): FirebaseEngine {
    if (!this.inner) { this.inner = new FirebaseEngine(this.cfg); this.inner.setCloudModel(this.textModel); }
    return this.inner;
  }
  /** Kept here too, so the request shown under a card names the model in use before Firebase has been started. */
  setCloudModel(model: string) { this.textModel = model; this.inner?.setCloudModel(model); }
  /** Capability query only; does not start Firebase. */
  async deviceStatus(): Promise<DeviceStatus> {
    const lm = (globalThis as any).LanguageModel;
    if (!lm || typeof lm.availability !== 'function') return 'unavailable';
    try { return (await lm.availability(IO)) as DeviceStatus; } catch { return 'unavailable'; }
  }
  prepareDevice(onProgress?: (p: number) => void) { return this.e.prepareDevice(onProgress); }
  warmDevice() { return this.e.warmDevice(); }
  runDevice(prompt: string) { return this.e.runDevice(prompt); }
  cloudRequest(strippedQuestion: string) { return cloudTextRequest(strippedQuestion, this.textModel); }
  runCloud(strippedQuestion: string) { return this.e.runCloud(strippedQuestion); }
}
