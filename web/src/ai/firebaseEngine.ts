// Web client engine: every model call goes through Firebase AI Logic (firebase/ai) hybrid inference.
// This is the ONLY file in the repo that imports firebase/ai (tests/unit/no-direct-model-calls.test.ts enforces it).
//
//   leg        mode              gets                                         why
//   private    ONLY_ON_DEVICE    question + About me lists                    family data must never fall back to the cloud.
//                                                                             PREFER_ON_DEVICE would silently send this prompt
//                                                                             to the cloud while Gemini Nano is missing or still
//                                                                             downloading; ONLY_ON_DEVICE throws instead.
//   stripped   PREFER_IN_CLOUD   question with About-me words swapped out     no profile data, so falling back to the device
//                                                                             when offline is safe.
//   pictures   ONLY_IN_CLOUD     one generic word                             images can't be made on device (not used in
//                                                                             the bundled-pictures build).
//
// inferenceSource is read on every response. The private leg treats anything but on-device as an error.

import { initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import {
  getAI, getGenerativeModel, GoogleAIBackend, InferenceMode, InferenceSource, ResponseModality, type GenerativeModel,
} from 'firebase/ai';
import type { DeviceStatus, Engine, ModelResult } from '../../../core/engine';
import { CLOUD_IMAGE_MODEL, CLOUD_TEXT_MODEL } from '../../../core/models';
import { CARD_SCHEMA, CLOUD_SYSTEM_PROMPT, SYSTEM_PROMPT, cloudPrompt } from '../../../core/prompt';
import { cloudTextRequest, pictureRequestBody, pictureText } from '../../../core/requests';

const IO = {
  expectedInputs: [{ type: 'text' as const, languages: ['en'] }],
  expectedOutputs: [{ type: 'text' as const, languages: ['en'] }],
};
// On device the SDK passes instructions as the session's initial prompt.
const sys = (text: string) => [{ role: 'system' as const, content: [{ type: 'text' as const, value: text }] }];

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
  readonly modes = { device: 'ONLY_ON_DEVICE', cloud: 'PREFER_IN_CLOUD', pictures: 'ONLY_IN_CLOUD' };
  private device: GenerativeModel;
  private cloud: GenerativeModel;
  private images: GenerativeModel;

  constructor(cfg: WebConfig) {
    const app: FirebaseApp = initializeApp(cfg.firebase);
    // Firebase AI Logic requires App Check. It must be initialised before the first AI request.
    if (cfg.appCheckDebugToken) (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = cfg.appCheckDebugToken;
    const siteKey = cfg.recaptchaEnterpriseSiteKey || (cfg.appCheckDebugToken ? 'debug-provider-in-use' : '');
    this.cloudConfigured = !!siteKey;
    if (siteKey) initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(siteKey), isTokenAutoRefreshEnabled: true });

    const ai = getAI(app, { backend: new GoogleAIBackend() });
    this.device = getGenerativeModel(ai, {
      mode: InferenceMode.ONLY_ON_DEVICE,
      onDeviceParams: { createOptions: { ...IO, initialPrompts: sys(SYSTEM_PROMPT) }, promptOptions: { responseConstraint: CARD_SCHEMA } },
    });
    this.cloud = getGenerativeModel(ai, {
      mode: InferenceMode.PREFER_IN_CLOUD,
      inCloudParams: {
        model: CLOUD_TEXT_MODEL,
        systemInstruction: CLOUD_SYSTEM_PROMPT,
        // one schema object for both legs: responseJsonSchema in the cloud, responseConstraint on device
        generationConfig: { responseMimeType: 'application/json', responseJsonSchema: CARD_SCHEMA as any },
      },
      onDeviceParams: { createOptions: { ...IO, initialPrompts: sys(CLOUD_SYSTEM_PROMPT) }, promptOptions: { responseConstraint: CARD_SCHEMA } },
    });
    this.images = getGenerativeModel(ai, {
      mode: InferenceMode.ONLY_IN_CLOUD,
      inCloudParams: { model: CLOUD_IMAGE_MODEL, generationConfig: { responseModalities: [ResponseModality.TEXT, ResponseModality.IMAGE] } },
    });
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

  async runDevice(prompt: string): Promise<ModelResult> {
    const t0 = performance.now();
    const r = await this.device.generateContent(prompt);
    if (r.response.inferenceSource !== InferenceSource.ON_DEVICE) {
      // Defence in depth: the private leg must never report a cloud source.
      throw new Error("the private step didn't run on this computer");
    }
    return { text: r.response.text(), source: 'on-device', ms: Math.round(performance.now() - t0) };
  }

  cloudRequest(strippedQuestion: string) {
    return cloudTextRequest(strippedQuestion);
  }

  async runCloud(strippedQuestion: string): Promise<ModelResult> {
    if (!this.cloudConfigured) throw new Error('cloud help is not set up (App Check)');
    const t0 = performance.now();
    const r = await this.cloud.generateContent(cloudPrompt(strippedQuestion));
    // the badge comes from inferenceSource, never assumed: PREFER_IN_CLOUD runs on device when offline
    const source = r.response.inferenceSource === InferenceSource.ON_DEVICE ? 'on-device' : 'in-cloud';
    return { text: r.response.text(), source, ms: Math.round(performance.now() - t0) };
  }

  pictureRequest(word: string) {
    return pictureRequestBody(word);
  }

  async picture(word: string): Promise<string | null> {
    const r = await this.images.generateContent(pictureText(word));
    const part = r.response.inlineDataParts()?.[0];
    return part ? `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` : null;
  }
}

/**
 * Lazy wrapper: Firebase (App Check, AI Logic) is initialised only on the first real AI call. Loading the app and
 * making code-only cards (yes/no, either-or, pain, body map, memory) contact no Google host at all
 * (REBUILD_SPEC §1.5; measured by scripts/e2e-cloud.mjs, "hosts contacted on page load").
 */
export class LazyFirebaseEngine implements Engine {
  readonly label = 'Firebase AI Logic hybrid inference';
  readonly modes = { device: 'ONLY_ON_DEVICE', cloud: 'PREFER_IN_CLOUD', pictures: 'ONLY_IN_CLOUD' };
  readonly cloudConfigured: boolean;
  private inner: FirebaseEngine | null = null;
  constructor(private cfg: WebConfig) {
    this.cloudConfigured = !!(cfg.recaptchaEnterpriseSiteKey || cfg.appCheckDebugToken);
  }
  private get e(): FirebaseEngine {
    return (this.inner ??= new FirebaseEngine(this.cfg));
  }
  /** Capability query only; does not start Firebase. */
  async deviceStatus(): Promise<DeviceStatus> {
    const lm = (globalThis as any).LanguageModel;
    if (!lm || typeof lm.availability !== 'function') return 'unavailable';
    try { return (await lm.availability(IO)) as DeviceStatus; } catch { return 'unavailable'; }
  }
  prepareDevice(onProgress?: (p: number) => void) { return this.e.prepareDevice(onProgress); }
  runDevice(prompt: string) { return this.e.runDevice(prompt); }
  cloudRequest(strippedQuestion: string) { return cloudTextRequest(strippedQuestion); }
  runCloud(strippedQuestion: string) { return this.e.runCloud(strippedQuestion); }
  pictureRequest(word: string) { return pictureRequestBody(word); }
  picture(word: string) { return this.e.picture(word); }
}
