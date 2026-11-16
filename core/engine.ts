// The one seam between the shared core and a platform client. Every implementation runs ALL model calls
// through Firebase AI Logic (web: firebase/ai; Android: firebase-ai + firebase-ai-ondevice; iOS: FirebaseAILogic).
// There is no direct model engine: tests/unit/no-direct-model-calls.test.ts fails the build if one appears.

import { cloudTextRequest, pictureRequestBody } from './requests';

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
  readonly modes: { device: string; cloud: string; pictures: string };
  deviceStatus(): Promise<DeviceStatus>;
  /** Must be called from a user gesture if a download is needed. */
  prepareDevice(onProgress?: (p: number) => void): Promise<void>;
  /** Optional: load the on-device model into memory before the first question. On this computer only; no profile data. */
  warmDevice?(): Promise<void>;
  /** Private step: the profile is in this prompt, so it runs ONLY on device and throws rather than fall back. */
  runDevice(prompt: string): Promise<ModelResult>;
  /** The exact request body the cloud step would send for this stripped question. */
  cloudRequest(strippedQuestion: string): unknown;
  /** Cloud step: receives only the stripped question. Throws if the cloud is not configured. */
  runCloud(strippedQuestion: string): Promise<ModelResult>;
  /** The exact request body for one picture word. */
  pictureRequest(word: string): unknown;
  /** Generates a picture for a generic word (cloud only; images cannot be made on device). Data URL or null. */
  picture(word: string): Promise<string | null>;
}

/**
 * The engine of a copy with no project settings (a bare clone, no `.env.local`): no model can run here, on the device
 * or in the cloud, and every model call says so. Cards that code decides alone (yes / no, either-or, pain, body map,
 * feelings, memory questions, the repair card) never call the engine, so they work on such a copy unchanged.
 */
export class NullEngine implements Engine {
  readonly label = 'no project settings: rules only';
  readonly cloudConfigured = false;
  readonly modes = { device: 'ONLY_ON_DEVICE', cloud: 'PREFER_IN_CLOUD', pictures: 'ONLY_IN_CLOUD' };
  async deviceStatus(): Promise<DeviceStatus> { return 'unavailable'; }
  async prepareDevice(): Promise<void> { throw new Error(NullEngine.WHY); }
  async runDevice(): Promise<ModelResult> { throw new Error(NullEngine.WHY); }
  /** What cloud help would get, for the "what would be sent" panel; nothing is ever sent from this engine. */
  cloudRequest(strippedQuestion: string): unknown { return cloudTextRequest(strippedQuestion); }
  async runCloud(): Promise<ModelResult> { throw new Error(NullEngine.WHY); }
  pictureRequest(word: string): unknown { return pictureRequestBody(word); }
  async picture(): Promise<string | null> { return null; }
  static readonly WHY = 'this copy has no project settings';
}
