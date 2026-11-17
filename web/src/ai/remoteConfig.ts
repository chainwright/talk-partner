// Firebase Remote Config: the cloud model's name and the two routing thresholds can be changed in the Firebase console
// without a new build (parameters in remoteconfig.template.json; names, defaults and checks in core/models.ts).
//
// Three rules this file keeps:
//  1. It is asked only when cloud help is on. The settings concern the cloud step only, and a page with cloud help off
//     must contact no host but its own (scripts/e2e-cloud.mjs measures that), so nothing is fetched before consent.
//  2. A card never waits for it. The fetch runs beside the app; until it answers, and whenever it fails or times out
//     (offline, a blocked request, a browser without IndexedDB), the in-code defaults run.
//  3. A fetched value is used only if it passes `checkSetting`; a refused value is shown as refused, never used.
//
// The request carries the Firebase installation id and the app id, as every Remote Config fetch does. It carries no
// question and nothing from About me: this file imports nothing that holds either.

import type { FirebaseOptions } from 'firebase/app';
import { fetchAndActivate, getRemoteConfig, getValue, isSupported } from 'firebase/remote-config';
import { DEFAULT_SETTINGS, REMOTE_KEYS, defaultReport, settingsFrom, type RuntimeSettings, type SettingsReport } from '../../../core/models';
import { defaultApp } from './app';

const FETCH_TIMEOUT_MS = 5000;
/** Remote Config's own cache: a second fetch inside this time is answered from the browser, with no request. */
const MIN_FETCH_INTERVAL_MS = 10 * 60 * 1000;

/**
 * Fetches the settings once. Never throws: the report says 'fetched' with each value's source, or 'failed' with the
 * reason and the defaults.
 */
export async function fetchSettings(options: FirebaseOptions): Promise<SettingsReport> {
  try {
    if (!(await isSupported())) return { ...defaultReport('failed'), error: 'this browser cannot keep Remote Config values' };
    const rc = getRemoteConfig(defaultApp(options));
    rc.settings.fetchTimeoutMillis = FETCH_TIMEOUT_MS;
    rc.settings.minimumFetchIntervalMillis = MIN_FETCH_INTERVAL_MS;
    // the SDK's own defaults are the in-code ones, so a parameter the template lacks reads as the default
    rc.defaultConfig = Object.fromEntries((Object.keys(DEFAULT_SETTINGS) as (keyof RuntimeSettings)[]).map((k) => [REMOTE_KEYS[k], String(DEFAULT_SETTINGS[k])]));
    // belt and braces: the SDK has its own timeout, this one also covers a hang before the request is made
    await Promise.race([
      fetchAndActivate(rc),
      new Promise((_, reject) => setTimeout(() => reject(new Error(`no answer in ${FETCH_TIMEOUT_MS / 1000} s`)), FETCH_TIMEOUT_MS + 1500)),
    ]);
    const raw: Partial<Record<keyof RuntimeSettings, string | undefined>> = {};
    for (const k of Object.keys(DEFAULT_SETTINGS) as (keyof RuntimeSettings)[]) {
      const v = getValue(rc, REMOTE_KEYS[k]);
      // only a value that came from the Remote Config service counts as "from Remote Config"
      raw[k] = v.getSource() === 'remote' ? v.asString() : undefined;
    }
    return settingsFrom(raw);
  } catch (e) {
    return { ...defaultReport('failed'), error: (e as Error).message?.slice(0, 160) || 'the settings request failed' };
  }
}
