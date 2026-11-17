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
//   voice      ONLY_IN_CLOUD     a recording of the partner's spoken          makes no card: it types the question into the
//                                question (WAV, at most 15 s), after a yes     field. The SDK's on-device step (firebase 13.3.0)
//                                to a notice; nothing from About me            takes text and JPEG / PNG only, so a request with
//                                                                             sound never runs on the device in any mode; the
//                                                                             mode says what happens, and the app says it first.
//
// Two steps make cards, and a third turns a spoken question into text. Pictures are bundled: the picture-generation
// model this file once defined and never called was removed on 17 Nov 2026. The browser's own speech recognition
// (Web Speech API), used for a few hours on 17 Nov, is gone: it was AI inference outside Firebase AI Logic.
//
// inferenceSource is read on every response. The private leg treats anything but on-device as an error.
//
// Two Firebase app instances, on purpose. The private leg runs on its own app with NO App Check: App Check loads a
// script from Google the moment it starts, and a card made on this computer must not contact any host at all
// (measured in devlog/ondevice_proof_1/). The cloud leg runs on the default app, with App Check, started on the first
// cloud call only.

import { initializeApp } from 'firebase/app';
import {
  getAI, getGenerativeModel, GoogleAIBackend, InferenceMode, InferenceSource, type GenerativeModel,
} from 'firebase/ai';
import type { AudioClip, DeviceStatus, Engine, ModelResult } from '../../../core/engine';
import { CLOUD_TEXT_MODEL } from '../../../core/models';
import { CARD_SCHEMA, CLOUD_SYSTEM_PROMPT, SYSTEM_PROMPT, TRANSCRIBE_PROMPT, TRANSCRIBE_SCHEMA, TRANSCRIBE_SYSTEM_PROMPT, cloudPrompt } from '../../../core/prompt';
import { cloudTextRequest } from '../../../core/requests';
import { appCheckConfigured, appWithAppCheck, type WebConfig } from './app';

export type { WebConfig };

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
function report(leg: 'private' | 'stripped' | 'voice', mode: string, inferenceSource: unknown, ms: number) {
  console.info(`[ai-logic] leg=${leg} mode=${mode} inferenceSource=${String(inferenceSource)} ms=${ms}`);
}

export class FirebaseEngine implements Engine {
  readonly label = 'Firebase AI Logic hybrid inference';
  readonly cloudConfigured: boolean;
  readonly modes = { device: 'ONLY_ON_DEVICE', cloud: 'PREFER_IN_CLOUD' };
  private privateModel: GenerativeModel | null = null;
  private cloudModel: GenerativeModel | null = null;
  private voiceModel: GenerativeModel | null = null;
  /** The cloud text model in use: the in-code default until Remote Config gives a checked name (core/models.ts). */
  private textModel = CLOUD_TEXT_MODEL;
  private cloudAi: ReturnType<typeof getAI> | null = null;

  constructor(private cfg: WebConfig) {
    this.cloudConfigured = appCheckConfigured(cfg);
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
  private get ai(): ReturnType<typeof getAI> {
    // the app, App Check (ai/app.ts) and the AI Logic instance are started once; only the models are built again
    // when Remote Config names another cloud model (setCloudModel).
    // Limited-use App Check tokens for the cloud steps: the SDK asks App Check for a fresh short-lived token per
    // request instead of reusing the session token (it is what replay protection consumes, once that is switched on
    // for the project). The private leg has no App Check at all, so this does not touch it.
    return (this.cloudAi ??= getAI(appWithAppCheck(this.cfg), { backend: new GoogleAIBackend(), useLimitedUseAppCheckTokens: true }));
  }

  private get cloud(): GenerativeModel {
    if (this.cloudModel) return this.cloudModel;
    const ai = this.ai;
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
   * the SDK's own availability method is marked "should not be called directly", so we read Chrome's flag, as Firebase's web guide does.
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
    this.voiceModel = null;
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

  /**
   * The voice step: the same cloud model as the stripped step, on the same app (App Check), in ONLY_IN_CLOUD. The
   * SDK's on-device adapter refuses any inline data that is not JPEG or PNG, so sound cannot run on this computer
   * through Firebase AI Logic today; a hybrid mode here would only hide that.
   */
  private get voice(): GenerativeModel {
    return (this.voiceModel ??= getGenerativeModel(this.ai, {
      mode: InferenceMode.ONLY_IN_CLOUD,
      inCloudParams: {
        model: this.textModel,
        systemInstruction: TRANSCRIBE_SYSTEM_PROMPT,
        generationConfig: { responseMimeType: 'application/json', responseJsonSchema: TRANSCRIBE_SCHEMA as any, temperature: 0 },
      },
    }));
  }

  /**
   * One recording of the partner's spoken question -> one model call -> `{"transcript": "…"}` as text. Called only
   * after the partner said yes to the notice (web/src/main.ts). The source is what the SDK reports, never assumed.
   */
  async transcribe(clip: AudioClip): Promise<ModelResult> {
    if (!this.cloudConfigured) throw Object.assign(new Error('voice input is not set up (App Check)'), { notSent: true });
    const t0 = performance.now();
    const r = await this.voice.generateContent([{ type: 'inlineData', inlineData: { mimeType: clip.mimeType, data: clip.base64 } }, TRANSCRIBE_PROMPT]).catch((e: Error) => {
      throw Object.assign(e, { notSent: typeof navigator !== 'undefined' && navigator.onLine === false });
    });
    const source = r.response.inferenceSource === InferenceSource.ON_DEVICE ? 'on-device' : 'in-cloud';
    const ms = Math.round(performance.now() - t0);
    report('voice', 'ONLY_IN_CLOUD', r.response.inferenceSource, ms);
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
    this.cloudConfigured = appCheckConfigured(cfg);
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
  transcribe(clip: AudioClip) { return this.e.transcribe(clip); }
}
