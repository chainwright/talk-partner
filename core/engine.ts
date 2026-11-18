// The one seam between the shared core and a platform client. Every implementation runs ALL model calls
// through Firebase AI Logic. There is one implementation, the web client (firebase/ai); the seam is written so that
// another client could be added, and none exists.
// There is no direct model engine: tests/unit/no-direct-model-calls.test.ts fails the build if one appears.

import { cloudTextRequest } from './requests';

export type DeviceStatus = 'available' | 'downloadable' | 'downloading' | 'unavailable';

export interface ModelResult {
  text: string;
  /** Where inference actually ran, from Firebase's `inferenceSource` (or fixed for the direct engine). */
  source: 'on-device' | 'in-cloud';
  ms: number;
}

/**
 * An engine may mark a cloud error as "certainly not sent" (the browser was offline, or cloud help is not set up), by
 * setting `notSent` on the error it throws. Any other cloud failure is treated as "may have left".
 */
export interface CloudError extends Error { notSent?: boolean }

export interface Engine {
  /** Shown in the mode bar. */
  readonly label: string;
  /** True only when a real Firebase config is present. */
  readonly cloudConfigured: boolean;
  /** Mode names used for each step, shown in the UI so the boundary is visible. */
  readonly modes: { device: string; cloud: string };
  deviceStatus(): Promise<DeviceStatus>;
  /** Must be called from a user gesture if a download is needed. */
  prepareDevice(onProgress?: (p: number) => void): Promise<void>;
  /** Optional: load the on-device model into memory before the first question. On this computer only; no profile data. */
  warmDevice?(): Promise<void>;
  /** Private step: the profile is in this prompt, so it runs ONLY on device and throws rather than fall back. */
  runDevice(prompt: string): Promise<ModelResult>;
  /**
   * Optional: "Today in short" (core/summary.ts). The day's answers are personal, so this step runs ONLY on device,
   * like the private step, with its own instructions and answer format, and throws rather than fall back. An engine
   * without it (no project settings, or a browser with no on-device model) gets the rules' own summary.
   */
  summarizeDevice?(prompt: string): Promise<ModelResult>;
  /**
   * Optional: put a few rule-made lines into plainer words (core/reword.ts: the insights, the tip of the day). ONLY on
   * device, like the summary step; throws rather than fall back. The prompt may hold the carer's health notes.
   */
  rewordDevice?(prompt: string): Promise<ModelResult>;
  /**
   * Optional: the same wording step by online help (PREFER_IN_CLOUD), for the insight lines on a device with no model
   * of its own. Called only after a yes on the sheet that shows this exact text. The text is the rules' own lines:
   * no name, no health note, nothing of the diary (core/insights.ts, insightCloudText).
   */
  rewordCloud?(text: string): Promise<ModelResult>;
  /** The exact request body `rewordCloud` would send for this text. */
  rewordRequest?(text: string): unknown;
  /**
   * Optional: "Talk about a photo" (core/phototalk.ts). One of the family's own photos and a fixed instruction, ONLY
   * on device: the model names things it sees. There is no cloud form of this call, in any mode; it throws rather than
   * fall back, and an engine without it (a phone, a copy with no project settings) gets the rules' questions alone.
   */
  lookDevice?(image: ImageClip): Promise<ModelResult>;
  /** Optional: use this cloud text model from the next cloud call on (a name Remote Config gave, already checked). */
  setCloudModel?(model: string): void;
  /** The exact request body the cloud step would send for this stripped question. */
  cloudRequest(strippedQuestion: string): unknown;
  /** Cloud step: receives only the stripped question. Throws if the cloud is not configured. */
  runCloud(strippedQuestion: string): Promise<ModelResult>;
  /**
   * Optional: voice input. One recording of the PARTNER's spoken question (never the person's) goes to the model
   * through Firebase AI Logic and comes back as JSON `{"transcript": string}`. `source` is the SDK's report of where
   * it ran. An engine without it (a copy with no project settings) has no microphone button.
   */
  transcribe?(clip: AudioClip): Promise<ModelResult>;
}

/** How long the cloud step is waited for before the card says that online help did not answer. */
export const CLOUD_WAIT_MS = 25000;
/**
 * A cloud call that neither answers nor fails (a blocked script, a connection that hangs) must not leave the carer
 * in front of "Finding the choices…" for ever: after `ms` it counts as a failed call that may have left the device.
 */
export function within<T>(call: Promise<T>, ms: number = CLOUD_WAIT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`online help gave no answer within ${Math.round(ms / 1000)} seconds`)), ms);
    call.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e as Error); });
  });
}

/** A picture as it is handed to the SDK's on-device step: base64 of a JPEG or PNG. */
export interface ImageClip { mimeType: 'image/jpeg' | 'image/png'; base64: string }

/** A short recording as it is handed to the SDK: base64 of a WAV file. */
export interface AudioClip { mimeType: string; base64: string }

/**
 * The engine of a copy with no project settings (a bare clone, no `.env.local`): no model can run here, on the device
 * or in the cloud, and every model call says so. Cards that code decides alone (yes / no, either-or, pain, body map,
 * feelings, memory questions, the repair card) never call the engine, so they work on such a copy unchanged.
 */
export class NullEngine implements Engine {
  readonly label = 'no project settings: rules only';
  readonly cloudConfigured = false;
  readonly modes = { device: 'ONLY_ON_DEVICE', cloud: 'PREFER_IN_CLOUD' };
  async deviceStatus(): Promise<DeviceStatus> { return 'unavailable'; }
  async prepareDevice(): Promise<void> { throw new Error(NullEngine.WHY); }
  async runDevice(): Promise<ModelResult> { throw new Error(NullEngine.WHY); }
  /** What cloud help would get, for the "what would be sent" panel; nothing is ever sent from this engine. */
  cloudRequest(strippedQuestion: string): unknown { return cloudTextRequest(strippedQuestion); }
  async runCloud(): Promise<ModelResult> { throw new Error(NullEngine.WHY); }
  static readonly WHY = 'this copy has no project settings';
}
