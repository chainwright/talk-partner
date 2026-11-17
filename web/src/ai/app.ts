// The default Firebase app, shared by the cloud legs of the engine (firebaseEngine.ts) and by Remote Config
// (remoteConfig.ts): one app, started by whichever needs it first. Starting it contacts no host.
import { getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';

export function defaultApp(options: FirebaseOptions): FirebaseApp {
  return getApps().find((a) => a.name === '[DEFAULT]') ?? initializeApp(options);
}
