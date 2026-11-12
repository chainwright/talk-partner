# Submission notes (Devpost page): tagline and Built-with

Written 11 Nov 2026 (day 5). The page itself is filled in at submission time from these lines; nothing here is pasted anywhere yet.

## Tagline (one clause, no tech, the sponsor can quote it)
> Talk Partner helps the partner of an adult with aphasia ask in choices, privately on this computer, so the answer stays the person's own.

Second line (the hybrid in one sentence):
> The private part runs on this computer; only a nameless question ever goes to the cloud.

One-line insight for the top of the text:
> Every AI aphasia app helps the person answer. Talk Partner helps the partner ask, and never guesses the answer.

(The first line of the page text is reserved for the measured number from the timed trial, `devlog/TRIAL_PROTOCOL.md` §6.4, once it exists. Until then the honest line is the one in `#/how`: no measured scores yet.)

## Built-with tags (only what the build really uses today)
Devpost "Built with" is a tag list; these are the tags, in the order to enter them:

| Tag | Where it is used | Honest note |
|---|---|---|
| `firebase-ai-logic` | `web/src/ai/firebaseEngine.ts`: every model call, three `getGenerativeModel` modes | the only path to any model |
| `gemini-nano` | the private step, `ONLY_ON_DEVICE`; the offline fall-back of the stripped step | not yet run on the development machine (disk); the code enforces it and the tests check it |
| `gemini` | the stripped step in the cloud, `gemini-3.5-flash-lite` (`core/models.ts`) | real end-to-end run on day 1 (`scripts/e2e-cloud.mjs`) |
| `firebase-app-check` | `initializeAppCheck` in the engine; debug token locally, reCAPTCHA Enterprise on deploy | enforcement comes with the first deploy |
| `typescript` | `core/`, `web/`, tests | |
| `vite` | the web client build | |
| `vitest` | 814 tests in 19 files | |
| `indexeddb` | `web/src/store.ts`: About me, settings, photos, the trial log; nothing synced | |
| `svg` | every pictogram, hand-drawn (`PICTOGRAMS.md`) | |

**Not to add until they are real:** `firebase-hosting` (no deploy yet), `firestore` / `firebase-auth` (the two-screen relay, E-B), `remote-config` (the therapist defaults, E-B). Adding them early would be the "demo mode that simulates" trap the field beat warns about.

## Judge path, in one line for the page
"Try it: `#/demo`, no account. Click the questions in order; every badge comes from the SDK's `inferenceSource`; under each card, *Why this card* and *Where each step ran*; the privacy receipt counts the bytes that left."
