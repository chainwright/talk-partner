# Submission notes (Devpost page): tagline and Built-with

Written 11 Nov 2026 (day 5); on 17 Nov 2026 (day 13) the microphone row and its note were added; corrected 17 Nov 2026 after the fourth review (the Built-with table said "no deploy yet" and "enforcement comes with the first deploy" after the deploy; the platform and the pre-existing-work summary were missing) and on 16 Nov 2026 after the truth pass (the old tagline said "privately on this computer" before the on-device step had ever run, the second line said "nameless", the insight line said "every AI aphasia app", and two notes blamed disk space). The page itself is filled in at submission time from these lines; nothing here is pasted anywhere yet.

## Tagline (one clause, no tech, the sponsor can quote it)
> Talk Partner helps the partner of an adult with aphasia ask in choices, so the answer stays the person's own.

Second line (the hybrid in one sentence):
> Family details stay in this browser, where the on-device model reads them; with cloud help on, only the question goes to the cloud, with About-me names swapped for labels.

One-line insight for the top of the text:
> The AI aphasia tools we found mostly draft words for the person (Lingraphica Conversations, Broca AI Speech). Talk Partner works on the partner's side: it turns the partner's question into a choice card and never drafts the answer.

(Not every tool: Aphonos is conversation practice with a tip for the family, AphasiaGPT is therapy practice, Lingraphica Smart Folders is used by care partners to build cards. The line above claims only what we found.)

(The first line of the page text is reserved for the measured number from the timed trial, `devlog/TRIAL_PROTOCOL.md` §6.4, once it exists. Until then the honest line is the one in `#/how`: on the 18 open questions of our own labelled set, rules alone make no card; the on-device model made a card matching our label for 15, 16 and 15 in three runs at commit `7dd16a1` (17 Nov 2026, the last commit that changes code; `devlog/evidence_r11/heldout_at_7dd16a1/`; 16 each time in three runs an hour earlier), and 12 or 13 of those offered the family's own people, places or foods; no trial with people yet. Quote it as "15 to 16", never the 16 alone and never without "our labels" and without the commit, never call the set held-out (the rules were changed after it was written), and never quote one total for all 60: rules alone and the model are not doing the same job there.)

## Built-with tags (only what the build really uses today)
Devpost "Built with" is a tag list; these are the tags, in the order to enter them. Checked against the code and the
live site on 17 Nov 2026.

| Tag | Where it is used | Honest note |
|---|---|---|
| `firebase-ai-logic` | `web/src/ai/firebaseEngine.ts`: every model call, three `getGenerativeModel` modes (`ONLY_ON_DEVICE` for the step that reads About me, `PREFER_IN_CLOUD` for the stripped question, `ONLY_IN_CLOUD` for the partner's recorded question) | the only path to any model in the app, voice input included (17 Nov; the on-device model takes no sound, so that step is cloud only); a third mode for pictures was defined and never called, and was removed on 17 Nov |
| `gemini-nano` | the private step, `ONLY_ON_DEVICE`; the offline fall-back of the stripped step | recorded with the SDK's `inferenceSource=on_device` per call: `devlog/evidence_r10/ondevice_local_2026-11-17_30db57a/RUN_LOG.md` (the latest run, 43/43 at `30db57a` on localhost); first run on 16 Nov 2026: the run saved in `devlog/ondevice_proof_1/` (`RUN_LOG.md` there) |
| `gemini` | the stripped step in the cloud and voice input (`ONLY_IN_CLOUD`, one call per recording), `gemini-3.5-flash-lite` (`core/models.ts`; the name can be changed through Remote Config) | recorded on the live site: `devlog/evidence_live/` (`inferenceSource=in_cloud`) |
| `firebase-app-check` | `initializeAppCheck` in the engine: reCAPTCHA Enterprise on the hosted copy, a debug token on localhost; the cloud step uses the App Check session token (limited-use tokens per request were tried on 17 Nov and taken out the same day: when reCAPTCHA refused a browser, the SDK sent nothing) | **registered, not enforced yet.** The provider is registered and the hosted copy sends App Check tokens with its cloud requests (the live log shows `content-firebaseappcheck.googleapis.com`). Enforcement for the AI Logic API has not been switched on in the Firebase console: that is the owner's step, not done as of 17 Nov 2026, and there is no console screenshot. Do not write "enforced" on the page until it is |
| `firebase-hosting` | `firebase.json`; <https://talk-partner.web.app> | live since 16 Nov 2026; every deploy is followed by `node scripts/e2e-cloud.mjs --url https://talk-partner.web.app/`, logs in `devlog/evidence_live/` |
| `firebase-remote-config` | `web/src/ai/remoteConfig.ts`, `core/models.ts`, `remoteconfig.template.json`: the cloud model's name and two routing thresholds | in use, asked only when cloud help is on. The three published values equal the defaults in the code today, so it changes nothing yet: say so if it is mentioned |
| `typescript` | `core/`, `web/`, tests | |
| `vite` | the web client build | |
| `vitest` | unit, property and matrix tests (`npm run check` prints the count) | |
| `indexeddb` | `web/src/store.ts`: About me, settings, photos, the trial log; nothing synced | |
| `svg` | every pictogram, hand-drawn (`PICTOGRAMS.md`) | family places and foods have no pictogram yet: those tiles are words |
| `cloud-firestore` | `web/src/feedback.ts`, `core/feedback.ts`, `firestore.rules`: feedback notes only, create-only rules | rules tested on the emulator (37) and against the deployed rules (25 refusals), 17 Nov 2026; one test note from the live site |

**Not to add until it is real:** `firebase-auth` (a two-screen relay). It is imported nowhere. Firestore is used for feedback notes only, not for a relay.
Adding them early would be the "demo mode that simulates" trap our review of the field warns about.

**Platform to select on the form:** Web (Chrome). There is no Android or iOS client.

## Pre-existing work, three lines for the page text
The project is an **existing** one in the contest's sense (the form asks). From `DISCLOSURE.md`, which has the full list:

> A throwaway prototype of 9–10 Nov 2026, never published, is where this started. Its card rules, privacy swap, prompts, pictograms and unit tests were imported verbatim in this repository's first commit (tag `pre-contest`), and the Firebase engine file was written from the prototype's own, which had never run (about 100 lines).
> Built in the submission period, from 11 Nov: the Firebase project and every real model run through Firebase AI Logic (the cloud step on 11 Nov, the on-device step on 16 Nov), App Check, Remote Config, Hosting, the whole web client (partner and person screens, About me, the consent screen, judge mode with the privacy receipt and "why this card"), the coaching and repair cards, the rule fixes that followed three rehearsals, and the tests for all of it.
> The prototype called Chrome's model directly and its numbers are not results of this build; this build makes no direct inference call. `git diff pre-contest..HEAD` is the work of the period, less those roughly 100 lines.

## Judge path, in one line for the page
"Try it: `#/demo`, no account. Click the questions in order; the AI badges come from the SDK's `inferenceSource`; under each card, *Why this card* and *Where each step ran*; the privacy receipt counts the bytes handed to the cloud step."
