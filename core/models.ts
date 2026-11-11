// Shared model configuration, used by every client (web today; Android and iOS clients read the same values).
// Model names are data, not code: one place to change them.

/** Cloud text model for the stripped-question leg (the SDK's default hybrid cloud model on web). */
export const CLOUD_TEXT_MODEL = 'gemini-3.5-flash-lite';
/** Cloud image model. Not used by the bundled-pictures build (E-A); kept for the optional picture leg. */
export const CLOUD_IMAGE_MODEL = 'gemini-3.1-flash-lite-image';

/** The three AI legs and the Firebase AI Logic inference mode each one uses. */
export const LEGS = {
  private: { mode: 'ONLY_ON_DEVICE', gets: 'question + About me lists', why: 'holds family data; must never fall back to the cloud' },
  stripped: { mode: 'PREFER_IN_CLOUD', gets: 'question with every About-me word swapped for a label', why: 'holds no profile data, so an offline fall-back to the device is safe' },
  pictures: { mode: 'ONLY_IN_CLOUD', gets: 'one generic word', why: 'images cannot be generated on device' },
} as const;
