// The default Firebase app, shared by the cloud legs of the engine (firebaseEngine.ts), by Remote Config
// (remoteConfig.ts) and by the feedback form (../feedback.ts): one app, started by whichever needs it first.
// Starting it contacts no host. App Check is started on that app once, by the first thing that sends something to
// Google (a cloud model call, or a feedback note); it loads a script from Google, so nothing starts it at page load.
import { getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';

export interface WebConfig {
  firebase: FirebaseOptions;
  /** Local development only (never in a production build): an App Check debug token registered in the console. */
  appCheckDebugToken?: string;
  /** Deployed site: the reCAPTCHA Enterprise site key registered as the App Check provider. */
  recaptchaEnterpriseSiteKey?: string;
}

export function defaultApp(options: FirebaseOptions): FirebaseApp {
  return getApps().find((a) => a.name === '[DEFAULT]') ?? initializeApp(options);
}

/** True when this copy can get an App Check token at all (a site key, or a debug token in development). */
export const appCheckConfigured = (cfg: WebConfig): boolean => !!(cfg.recaptchaEnterpriseSiteKey || cfg.appCheckDebugToken);

/**
 * The default app with App Check started on it. Firebase AI Logic requires App Check before the first cloud request.
 * Each caller (the engine, the feedback form) calls this once and keeps what it builds on it; a second start with the
 * same provider and options is answered by the SDK with the instance that is already there.
 */
export function appWithAppCheck(cfg: WebConfig): FirebaseApp {
  const app = defaultApp(cfg.firebase);
  if (cfg.appCheckDebugToken) (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = cfg.appCheckDebugToken;
  const siteKey = cfg.recaptchaEnterpriseSiteKey || (cfg.appCheckDebugToken ? 'debug-provider-in-use' : '');
  if (siteKey) initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(siteKey), isTokenAutoRefreshEnabled: true });
  return app;
}
