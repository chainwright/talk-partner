/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  readonly VITE_APPCHECK_DEBUG_TOKEN?: string;
  readonly VITE_RECAPTCHA_ENTERPRISE_SITE_KEY?: string;
}
/** Set at build time (vite.config.ts): the package version and the short commit hash, or 'unknown' outside a git checkout. */
declare const __APP_VERSION__: string;
declare const __APP_COMMIT__: string;
