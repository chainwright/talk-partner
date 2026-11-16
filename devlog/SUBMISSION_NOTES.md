# Submission notes (Devpost page): tagline and Built-with

Written 11 Nov 2026 (day 5); corrected 16 Nov 2026 after the truth pass (the old tagline said "privately on this computer" before the on-device step had ever run, the second line said "nameless", the insight line said "every AI aphasia app", and two notes blamed disk space). The page itself is filled in at submission time from these lines; nothing here is pasted anywhere yet.

## Tagline (one clause, no tech, the sponsor can quote it)
> Talk Partner helps the partner of an adult with aphasia ask in choices, so the answer stays the person's own.

Second line (the hybrid in one sentence):
> Family details stay in this browser, where the on-device model reads them; with cloud help on, only the question goes to the cloud, with About-me names swapped for labels.

One-line insight for the top of the text:
> The AI aphasia tools we found mostly draft words for the person (Lingraphica Conversations, Broca AI Speech). Talk Partner works on the partner's side: it turns the partner's question into a choice card and never drafts the answer.

(Not every tool: Aphonos is conversation practice with a tip for the family, AphasiaGPT is therapy practice, Lingraphica Smart Folders is used by care partners to build cards. The line above claims only what we found.)

(The first line of the page text is reserved for the measured number from the timed trial, `devlog/TRIAL_PROTOCOL.md` §6.4, once it exists. Until then the honest line is the one in `#/how`: no measured scores yet.)

## Built-with tags (only what the build really uses today)
Devpost "Built with" is a tag list; these are the tags, in the order to enter them:

| Tag | Where it is used | Honest note |
|---|---|---|
| `firebase-ai-logic` | `web/src/ai/firebaseEngine.ts`: every model call, three `getGenerativeModel` modes | the only path to any model |
| `gemini-nano` | the private step, `ONLY_ON_DEVICE`; the offline fall-back of the stripped step | run for real on 16 Nov 2026: `devlog/ondevice_proof_1/RUN_LOG.md` (private step and offline fall-back, `inferenceSource=on_device`), at the tag `ondevice-proof-1` |
| `gemini` | the stripped step in the cloud, `gemini-3.5-flash-lite` (`core/models.ts`) | real cloud runs recorded on 16 Nov 2026: `devlog/ondevice_proof_1/RUN_LOG.md` §3 and §5, and `devlog/evidence_r2/e2e-cloud.txt` |
| `firebase-app-check` | `initializeAppCheck` in the engine; debug token locally, reCAPTCHA Enterprise on deploy | enforcement comes with the first deploy |
| `typescript` | `core/`, `web/`, tests | |
| `vite` | the web client build | |
| `vitest` | unit, property and matrix tests (`npm run check` prints the count) | |
| `indexeddb` | `web/src/store.ts`: About me, settings, photos, the trial log; nothing synced | |
| `svg` | every pictogram, hand-drawn (`PICTOGRAMS.md`) | |

**Not to add until they are real:** `firebase-hosting` (no deploy yet), `firestore` / `firebase-auth` (the two-screen relay, E-B), `remote-config` (the therapist defaults, E-B). Adding them early would be the "demo mode that simulates" trap our review of the field warns about.

## Judge path, in one line for the page
"Try it: `#/demo`, no account. Click the questions in order; the AI badges come from the SDK's `inferenceSource`; under each card, *Why this card* and *Where each step ran*; the privacy receipt counts the bytes that left."
