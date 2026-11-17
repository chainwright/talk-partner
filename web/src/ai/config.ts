// Firebase web config from Vite env (.env.local, gitignored). Nothing secret is committed to the repo.
// Every value is read as a direct `import.meta.env.X` so Vite replaces it statically. Do NOT alias import.meta.env
// to a variable: Vite then inlines the whole env object, and the debug token would ship in production
// (caught on 11 Nov 2026; scripts/check-dist.mjs guards it).
import type { WebConfig } from './app';

export function webConfig(): WebConfig | null {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const appId = import.meta.env.VITE_FIREBASE_APP_ID;
  if (!apiKey || !appId) return null;
  return {
    firebase: {
      apiKey,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      appId,
    },
    // Dev builds only: in a production build this whole branch is removed, token included.
    appCheckDebugToken: import.meta.env.DEV ? import.meta.env.VITE_APPCHECK_DEBUG_TOKEN || undefined : undefined,
    recaptchaEnterpriseSiteKey: import.meta.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY || undefined,
  };
}
