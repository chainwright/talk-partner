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
//   summary    ONLY_ON_DEVICE    today's confirmed answers (core/summary.ts)   "Today in short". The answers are personal, so
//                                                                             there is no cloud fall-back: where the browser
//                                                                             has no model, the app's rules write it instead.
//
//   reword     ONLY_ON_DEVICE    a few lines the rules wrote (the week's        the insights and the tip of the day in plainer
//   (device)                     insights, the tip), and the carer's health    words (core/reword.ts). Personal context, so no
//                                notes as context                              cloud fall-back: without a model the rules' own
//                                                                             words stand.
//   reword     PREFER_IN_CLOUD   the insight lines the rules wrote, as shown   the same wording step on a device with no model
//   (cloud)                      on a sheet first; no name, no health note,    of its own. Called only after a yes on that sheet
//                                nothing of the diary                          (web/src/main.ts); the app's check decides
//                                                                             whether the words may stand.
//
// A narrowing card after "something else" (core/narrow.ts) uses the private and the stripped step, as an open question does.
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
import { SUMMARY_SCHEMA, SUMMARY_SYSTEM_PROMPT } from '../../../core/summary';
import { CARD_SCHEMA, CLOUD_SYSTEM_PROMPT, SYSTEM_PROMPT, TRANSCRIBE_PROMPT, TRANSCRIBE_SCHEMA, TRANSCRIBE_SYSTEM_PROMPT, cloudPrompt } from '../../../core/prompt';
import { cloudTextRequest } from '../../../core/requests';
import { REWORD_SCHEMA, REWORD_SYSTEM_PROMPT, rewordRequest } from '../../../core/reword';
import { appCheckConfigured, appWithAppCheck, namedAppCheckFailure, type WebConfig } from './app';

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
function report(leg: 'private' | 'stripped' | 'voice' | 'summary' | 'reword', mode: string, inferenceSource: unknown, ms: number) {
  console.info(`[ai-logic] leg=${leg} mode=${mode} inferenceSource=${String(inferenceSource)} ms=${ms}`);
}

export class FirebaseEngine implements Engine {
  readonly label = 'Firebase AI Logic hybrid inference';
  readonly cloudConfigured: boolean;
  readonly modes = { device: 'ONLY_ON_DEVICE', cloud: 'PREFER_IN_CLOUD' };
  private privateModel: GenerativeModel | null = null;
  private cloudModel: GenerativeModel | null = null;
  private voiceModel: GenerativeModel | null = null;
  private summaryModel: GenerativeModel | null = null;
  private rewordLocal: GenerativeModel | null = null;
  private rewordOnline: GenerativeModel | null = null;
  private localAi: ReturnType<typeof getAI> | null = null;
  /** The cloud text model in use: the in-code default until Remote Config gives a checked name (core/models.ts). */
  private textModel = CLOUD_TEXT_MODEL;
  private cloudAi: ReturnType<typeof getAI> | null = null;

  constructor(private cfg: WebConfig) {
    this.cloudConfigured = appCheckConfigured(cfg);
  }

  /** The Firebase app of the on-device steps: no App Check, so starting it and running on it contact no host. */
  private get local(): ReturnType<typeof getAI> {
    return (this.localAi ??= getAI(initializeApp(this.cfg.firebase, 'private-on-device'), { backend: new GoogleAIBackend() }));
  }

  /** The private leg: its own Firebase app, no App Check, so starting it and running it contact no host. */
  private get device(): GenerativeModel {
    if (this.privateModel) return this.privateModel;
    return (this.privateModel = getGenerativeModel(this.local, {
      mode: InferenceMode.ONLY_ON_DEVICE,
      onDeviceParams: { createOptions: { ...IO, initialPrompts: sys(SYSTEM_PROMPT) }, promptOptions: { responseConstraint: CARD_SCHEMA } },
    }));
  }

  /** The cloud leg: the default Firebase app with App Check (Firebase AI Logic requires it before the first cloud request). */
  private get ai(): ReturnType<typeof getAI> {
    // the app, App Check (ai/app.ts) and the AI Logic instance are started once; only the models are built again
    // when Remote Config names another cloud model (setCloudModel).
    // The App Check session token, not a limited-use token per request (tried 17 Nov, taken out the same day): with
    // limited-use tokens every cloud request needs a new reCAPTCHA attestation; a session token is fetched once and
    // serves about an hour of requests. Either way a browser the attestation refuses gets no cloud card (ai/app.ts).
    return (this.cloudAi ??= getAI(appWithAppCheck(this.cfg), { backend: new GoogleAIBackend() }));
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

  /**
   * "Today in short" (core/summary.ts): the day's answers, ONLY_ON_DEVICE on the same no-App-Check app as the private
   * leg, with its own instructions and answer format (a model instance holds one of each). Anything but an on-device
   * answer is an error: there is no cloud fall-back for the person's answers.
   */
  async summarizeDevice(prompt: string): Promise<ModelResult> {
    this.summaryModel ??= getGenerativeModel(this.local, {
      mode: InferenceMode.ONLY_ON_DEVICE,
      onDeviceParams: { createOptions: { ...IO, initialPrompts: sys(SUMMARY_SYSTEM_PROMPT) }, promptOptions: { responseConstraint: SUMMARY_SCHEMA } },
    });
    const t0 = performance.now();
    const r = await this.summaryModel.generateContent(prompt);
    if (r.response.inferenceSource !== InferenceSource.ON_DEVICE) throw new Error("the summary step didn't run on this computer");
    const ms = Math.round(performance.now() - t0);
    report('summary', 'ONLY_ON_DEVICE', r.response.inferenceSource, ms);
    return { text: r.response.text(), source: 'on-device', ms };
  }

  /** A model name from Remote Config: the cloud text model is rebuilt with it on the next cloud call. */
  setCloudModel(model: string) {
    if (model === this.textModel) return;
    this.textModel = model;
    this.cloudModel = null;
    this.voiceModel = null;
    this.rewordOnline = null;
  }

  cloudRequest(strippedQuestion: string) {
    return cloudTextRequest(strippedQuestion, this.textModel);
  }

  async runCloud(strippedQuestion: string): Promise<ModelResult> {
    if (!this.cloudConfigured) throw Object.assign(new Error('cloud help is not set up (App Check)'), { notSent: true });
    const t0 = performance.now();
    const r = await this.cloud.generateContent(cloudPrompt(strippedQuestion)).catch(async (e: Error) => {
      // the browser knew it was offline: the request certainly did not leave. Anything else: it may have.
      throw Object.assign(await namedAppCheckFailure(e), { notSent: typeof navigator !== 'undefined' && navigator.onLine === false });
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
    const r = await this.voice.generateContent([{ type: 'inlineData', inlineData: { mimeType: clip.mimeType, data: clip.base64 } }, TRANSCRIBE_PROMPT]).catch(async (e: Error) => {
      throw Object.assign(await namedAppCheckFailure(e), { notSent: typeof navigator !== 'undefined' && navigator.onLine === false });
    });
    const source = r.response.inferenceSource === InferenceSource.ON_DEVICE ? 'on-device' : 'in-cloud';
    const ms = Math.round(performance.now() - t0);
    report('voice', 'ONLY_IN_CLOUD', r.response.inferenceSource, ms);
    return { text: r.response.text(), source, ms };
  }

  /**
   * Plainer words for a few lines the rules wrote (core/reword.ts), ONLY_ON_DEVICE on the no-App-Check app: the prompt
   * may hold the carer's health notes, so anything but an on-device answer is an error.
   */
  async rewordDevice(prompt: string): Promise<ModelResult> {
    this.rewordLocal ??= getGenerativeModel(this.local, {
      mode: InferenceMode.ONLY_ON_DEVICE,
      onDeviceParams: { createOptions: { ...IO, initialPrompts: sys(REWORD_SYSTEM_PROMPT) }, promptOptions: { responseConstraint: REWORD_SCHEMA } },
    });
    const t0 = performance.now();
    const r = await this.rewordLocal.generateContent(prompt);
    if (r.response.inferenceSource !== InferenceSource.ON_DEVICE) throw new Error("the wording step didn't run on this computer");
    const ms = Math.round(performance.now() - t0);
    report('reword', 'ONLY_ON_DEVICE', r.response.inferenceSource, ms);
    return { text: r.response.text(), source: 'on-device', ms };
  }

  rewordRequest(text: string) {
    return rewordRequest(text, this.textModel);
  }

  /**
   * The same wording step by the cloud model (PREFER_IN_CLOUD, the default app with App Check). The caller has shown
   * this exact text on a sheet and got a yes (web/src/main.ts). The source is what the SDK reports, never assumed.
   */
  async rewordCloud(text: string): Promise<ModelResult> {
    if (!this.cloudConfigured) throw Object.assign(new Error('online help is not set up (App Check)'), { notSent: true });
    this.rewordOnline ??= getGenerativeModel(this.ai, {
      mode: InferenceMode.PREFER_IN_CLOUD,
      inCloudParams: { model: this.textModel, systemInstruction: REWORD_SYSTEM_PROMPT, generationConfig: { responseMimeType: 'application/json', responseJsonSchema: REWORD_SCHEMA as any } },
      onDeviceParams: { createOptions: { ...IO, initialPrompts: sys(REWORD_SYSTEM_PROMPT) }, promptOptions: { responseConstraint: REWORD_SCHEMA } },
    });
    const t0 = performance.now();
    const r = await this.rewordOnline.generateContent(text).catch(async (e: Error) => {
      throw Object.assign(await namedAppCheckFailure(e), { notSent: typeof navigator !== 'undefined' && navigator.onLine === false });
    });
    const source = r.response.inferenceSource === InferenceSource.ON_DEVICE ? 'on-device' : 'in-cloud';
    const ms = Math.round(performance.now() - t0);
    report('reword', 'PREFER_IN_CLOUD', r.response.inferenceSource, ms);
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
  summarizeDevice(prompt: string) { return this.e.summarizeDevice(prompt); }
  rewordDevice(prompt: string) { return this.e.rewordDevice(prompt); }
  rewordRequest(text: string) { return rewordRequest(text, this.textModel); }
  rewordCloud(text: string) { return this.e.rewordCloud(text); }
  cloudRequest(strippedQuestion: string) { return cloudTextRequest(strippedQuestion, this.textModel); }
  runCloud(strippedQuestion: string) { return this.e.runCloud(strippedQuestion); }
  transcribe(clip: AudioClip) { return this.e.transcribe(clip); }
}
