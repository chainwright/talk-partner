// Refuses a hosting build that would have no cloud step. A production build drops the App Check debug token (it must
// never ship), so on a deployed site the cloud step works only with a reCAPTCHA Enterprise site key registered as the
// web app's App Check provider. Without it the site would still make code-decided and on-device cards, and every
// cloud request would be refused: better to stop here than to deploy that by accident.
// Reads names only; prints no value.
import { existsSync, readFileSync } from 'node:fs';

const NEED = ['VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_APP_ID', 'VITE_FIREBASE_PROJECT_ID', 'VITE_RECAPTCHA_ENTERPRISE_SITE_KEY'];
const env = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
const has = (k) => new RegExp(`^${k}=\\S+`, 'm').test(env) || !!process.env[k];
const missing = NEED.filter((k) => !has(k));
if (missing.length) {
  console.error(`not ready to deploy: ${missing.join(', ')} ${missing.length === 1 ? 'is' : 'are'} not set in .env.local.`);
  if (missing.includes('VITE_RECAPTCHA_ENTERPRISE_SITE_KEY')) console.error('Register a reCAPTCHA Enterprise key for the site\'s domains, set it as the App Check provider of the web app, and put its id in .env.local (README, "Deploy").');
  process.exit(1);
}
console.log('deploy settings present: Firebase web config and the reCAPTCHA Enterprise site key');
