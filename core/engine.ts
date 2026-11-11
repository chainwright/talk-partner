// One interface for both model back ends:
//  - FirebaseEngine: Firebase AI Logic hybrid inference (firebase/ai). Used when a real web config is present.
//  - ChromeDirectEngine: Chrome's built-in LanguageModel (Gemini Nano) called directly. Used while the
//    Firebase config is still the placeholder; it is the same on-device engine Firebase uses on desktop Chrome.

export type DeviceStatus = 'available' | 'downloadable' | 'downloading' | 'unavailable';

export interface ModelResult {
  text: string;
  /** Where inference actually ran, from Firebase's `inferenceSource` (or fixed for the direct engine). */
  source: 'on-device' | 'in-cloud';
  ms: number;
}

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
