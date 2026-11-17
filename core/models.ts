// Shared model configuration (the web client; written so other clients could reuse it, and none exists).
// Model names are data, not code: one place to change them.

/** Cloud text model for the stripped-question leg (the SDK's default hybrid cloud model on web). */
export const CLOUD_TEXT_MODEL = 'gemini-3.5-flash-lite';

/**
 * The settings Firebase Remote Config may change without a new build: the cloud model's name and the two thresholds
 * of the routing rule (core/rules.ts, `route`). The values here are the in-code defaults: they are what runs until a
 * fetched value arrives, when the fetch fails, when cloud help is off (Remote Config is not asked then), and whenever
 * a fetched value does not pass `checkSetting`. Nothing about the privacy boundary is a setting: which step may see
 * About me is fixed in code.
 */
export interface RuntimeSettings {
  /** Cloud text model of the stripped step. */
  cloudTextModel: string;
  /** Send a card made on this computer for a cloud second opinion when this many of its answers are mood words. */
  routeMoodWords: number;
  /** … or when it has fewer usable answers than this. */
  routeMinChoices: number;
}
export const DEFAULT_SETTINGS: RuntimeSettings = { cloudTextModel: CLOUD_TEXT_MODEL, routeMoodWords: 2, routeMinChoices: 2 };

/** Remote Config parameter name for each setting (the template is in remoteconfig.template.json). */
export const REMOTE_KEYS: Record<keyof RuntimeSettings, string> = {
  cloudTextModel: 'cloud_text_model',
  routeMoodWords: 'route_mood_words',
  routeMinChoices: 'route_min_choices',
};

/**
 * A fetched value is used only when it is one this app can run on: a Gemini model name, or a whole number inside the
 * range the routing rule was written for. Anything else (empty, a typo, a number that would switch the rule off or
 * route every card) is refused and the in-code default stays. Returns the value to use, or null.
 */
export function checkSetting<K extends keyof RuntimeSettings>(key: K, raw: string): RuntimeSettings[K] | null {
  const s = String(raw ?? '').trim();
  if (key === 'cloudTextModel') return (/^gemini-[a-z0-9][a-z0-9.-]{2,60}$/.test(s) && !/image|tts|embedding|live/.test(s) ? s : null) as RuntimeSettings[K] | null;
  if (!/^\d{1,2}$/.test(s)) return null;
  const n = Number(s);
  const [lo, hi] = key === 'routeMoodWords' ? [1, 3] : [2, 3];
  return (n >= lo && n <= hi ? n : null) as RuntimeSettings[K] | null;
}

/** Where the value in use came from, per setting: shown on "How this works". */
export type SettingSource = 'remote' | 'default' | 'refused';
export interface SettingsReport {
  /** 'off' = not asked (cloud help is off, or the copy has no project settings); 'failed' = asked, no answer. */
  status: 'off' | 'none' | 'asking' | 'fetched' | 'failed';
  /** Why the fetch failed, in the SDK's words. */
  error?: string;
  /** When the answer came (ms since epoch). */
  at?: number;
  values: RuntimeSettings;
  sources: Record<keyof RuntimeSettings, SettingSource>;
  /** A fetched value that was refused, as it came. */
  refused: Partial<Record<keyof RuntimeSettings, string>>;
}
export const defaultReport = (status: SettingsReport['status'] = 'off'): SettingsReport => ({
  status, values: { ...DEFAULT_SETTINGS }, sources: { cloudTextModel: 'default', routeMoodWords: 'default', routeMinChoices: 'default' }, refused: {},
});

/**
 * Fetched raw values -> the settings in use and where each came from. `raw[key]` is undefined when Remote Config has
 * no value for that parameter (then the default stays and is reported as the default).
 */
export function settingsFrom(raw: Partial<Record<keyof RuntimeSettings, string | undefined>>, at = Date.now()): SettingsReport {
  const r = defaultReport('fetched');
  r.at = at;
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof RuntimeSettings)[]) {
    const v = raw[key];
    if (v === undefined || v === '') continue;
    const ok = checkSetting(key, v);
    if (ok === null) { r.sources[key] = 'refused'; r.refused[key] = String(v).slice(0, 80); continue; }
    (r.values as unknown as Record<string, string | number>)[key] = ok;
    r.sources[key] = 'remote';
  }
  return r;
}

/** The two AI legs and the Firebase AI Logic inference mode each one uses. */
export const LEGS = {
  private: { mode: 'ONLY_ON_DEVICE', gets: 'question + About me lists', why: 'holds family data; must never fall back to the cloud' },
  stripped: { mode: 'PREFER_IN_CLOUD', gets: 'question with every About-me word swapped for a label', why: 'holds no profile data, so an offline fall-back to the device is safe' },
} as const;
