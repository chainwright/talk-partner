# Disclosure: pre-existing work

The #BuildHybridAI 2026 rules allow an existing project if it is significantly updated during the submission period,
with any pre-existing code or work disclosed. This file lists exactly what existed before the period
(11 Nov 2026, 13:30 PT) and what was built in it.

## What existed before 11 Nov 2026
On 9–10 Nov 2026 we built a throwaway prototype of Talk Partner in a separate local repository (never published).
It called Chrome's built-in model directly, had no Firebase project, and its cloud step never ran. It also held an unrun Firebase engine file (see the last row of the table and the note under it).
We took these files from it **verbatim**, in this repository's first commit (`6518315`, tagged **`pre-contest`**), so the
history shows exactly what was carried over: `git diff pre-contest..HEAD` is the work of the submission period.

| File | What it is |
|---|---|
| `core/rules.ts` | The supported-conversation card rules (split questions, yes/no, either-or, body map, feelings, escapes, household, time scale, quiz detection, router) |
| `core/strip.ts` | The privacy swap: About-me words become "Person A", "Place A"…, the leak check, the restore |
| `core/prompt.ts` | The model prompts and the JSON schema |
| `core/pipeline.ts` | Card assembly from the question and the model's proposal |
| `core/pictures.ts`, `core/types.ts`, `core/engine.ts`, `core/requests.ts` | Picture choice, shared types, the engine interface, the cloud request bodies |
| `web/src/pictos.ts` | Hand-drawn line pictograms (SVG), our own work. (In the submission period, on 18 Nov 2026, every one was redrawn as a colour picture and 39 were added; on 20 Nov 2026, 84 of them were replaced on the cards by pictures made with Gemini; none of the pre-period line drawings is in the app now: `PICTOGRAMS.md`) |
| `tests/unit/*.test.ts` (rules, pipeline, fixround 1–4, strip property test), `tests/unit/fixtures.ts` | Unit tests for the above |
| **Not in the `pre-contest` commit, but pre-existing:** the design of `web/src/ai/firebaseEngine.ts` | The prototype had `src/ai/firebaseEngine.ts` (108 lines, last changed 10 Nov 2026) and model names in `src/config.ts`: a `FirebaseEngine` class with the same three `getGenerativeModel` calls (`ONLY_ON_DEVICE` with the About-me prompt, `PREFER_IN_CLOUD` with the stripped question, `ONLY_IN_CLOUD` for pictures), the `initializeAppCheck` hook, and the `inferenceSource` check on the private step. It was never executed: the prototype's Firebase config was a `null` placeholder and no project existed, so the app always took the direct Chrome engine |

**Correction, 16 Nov 2026.** Until today this file listed `web/src/ai/firebaseEngine.ts` only under "built during the
submission period" and did not mention the prototype's file. That was a gap. The Day 1 engine was written from the
prototype's file: the constructor's three model definitions and the two run methods are close to it line for line. So
`git diff pre-contest..HEAD` overstates the period's work by roughly those 100 lines. What the period added to that file:
the config from environment variables instead of a placeholder, the lazy start, the first real runs against a Firebase
project (cloud step 11 Nov, on-device step 16 Nov), the private step's own Firebase app without App Check, the
warm-up, the per-call report of `inferenceSource`, and its tests.

Research that informed the rules (aphasia knowledge base, five blind held-out question sets) also predates the period.
Its numbers came from the prototype's direct Chrome path, not from this build, and we do not claim them as results of this submission.

## What was NOT carried over
- The prototype's direct Chrome engine (`ChromeDirectEngine`). This build makes no direct inference call: the only
  direct touch of Chrome's model API is one availability query (`LanguageModel.availability`, no inference). Every
  model call goes through Firebase AI Logic, and `tests/unit/no-direct-model-calls.test.ts` fails the build otherwise.
  (Since 17 Nov the partner's optional microphone sends one recording of the partner's question to Gemini through
  Firebase AI Logic, `ONLY_IN_CLOUD`: `transcribe()` in `web/src/ai/firebaseEngine.ts`, `CLAIMS.md` row 41. For a
  few hours that day, from commit `a1e1b2d` until `27abd80`, it used the browser's own speech recognition, which is
  not Firebase AI Logic; that code is gone and `tests/unit/no-direct-model-calls.test.ts` fails if it comes back.)
- The prototype's UI, storage and end-to-end tests.

## Built during the submission period (from 11 Nov 2026)
See `git log` for dates. Day by day: `devlog/`.
- Firebase project `talk-partner`: web app, Firebase AI Logic (Gemini Developer API), App Check.
- `web/src/ai/firebaseEngine.ts`: rewritten from the prototype's unrun engine file (see the table and the correction above)
  and run for the first time: config from the environment, lazy start so the app contacts no Google host until an AI call
  is needed, App Check with a debug token.
- `core/pipeline.ts` changes: the coffee/tea fix (a valid either-or pair read from the question is never dropped because a model
  ran) and honest "sent" reporting (a request is shown as sent only when the cloud actually answered; an offline fall-back to
  the device says so).
- `core/models.ts`, `core/sample.ts`: shared model config and the made-up judge-mode family, for all clients.
- The one-screen web client (`web/src/main.ts`, `styles.css`), three new pictograms (listen, tea, coffee).
- Tests: the guard against direct model calls, the coffee/tea engine-state matrix, the end-to-end check of the cloud step against
  Firebase (`scripts/e2e-cloud.mjs`), and the production-bundle check (`scripts/check-dist.mjs`).
- Day 2 (11 Nov), in `core/rules.ts`, `core/pipeline.ts`, `core/strip.ts`, `core/pictures.ts`: the or-pair headline
  (the shared topic, never an option), the either-or label check applied to both the model's options and the code
  parser, subject-less offers as yes/no, completing an open card from the About-me list of the same kind or a small
  fixed set, numbers as figures, a line per kind of memory question, plural forms and unknown capitalised words
  ("Name A") in the privacy swap, the picture gate, blocked cards without choices. Tests: `headline`, `label-check`,
  `open-sources`, `strip-gate`, `card.property`, and the engine-state matrix extended to seven card shapes.
  Three pre-period tests were updated to the new behaviour, each with a dated comment saying why.

- Day 3 (11 Nov, late): `core/copy.ts` (every user-facing string, with the copy-truth tests in `tests/unit/copy.test.ts`),
  the step trace (`Card.trace`, from the engine's reports only), the §2.10 override card, "your left arm" labels,
  nicknames in the privacy swap, role pictograms and the fixed / feeling batch in `web/src/pictos.ts` (register:
  `PICTOGRAMS.md`), and the web screens: partner, person, About me (IndexedDB, photos), cloud help consent, first run,
  judge mode and "How this works" (`web/src/main.ts`, `store.ts`, `styles.css`). One pre-period test changed with a
  dated comment (body step-2 labels). Screenshots: `devlog/shots_day3/`.

- Day 4 (11 Nov, evening CST; 12 Nov UTC): `core/receipt.ts` (the privacy receipt, counted on recorded payloads), the receipt panel in judge mode and
  `#/how`, the hidden trial timer `#/trial` (`web/src/trial.ts`, protocol in `devlog/TRIAL_PROTOCOL.md`), self-hosted fonts for the
  design previews (`web/public/fonts/`, OFL licences alongside; `scripts/fonts-check.mjs`), once-per-event entrance animations,
  the route-class fix, the "For judges" section of the README with the call table (`tests/unit/judge-path.test.ts`).

- Day 5 (11 Nov, late CST): `Card.why` ("why this card", written in `core/pipeline.ts` while the rules run) and `Card.coach` (the
  coaching line for the partner), the fixed repair card `repairCard()` with four new pictograms (show me, draw, later, change topic),
  the double-question chip in judge mode, the "why" panel, "We're stuck" and the look-alikes list on `#/how` (`web/src/main.ts`,
  `styles.css`), `tests/unit/day5.test.ts`, the README sections "One documented cut" and "Look-alikes, named", `devlog/SUBMISSION_NOTES.md`.

- 16 Nov 2026: design direction C "Two Sides" made the default look (`web/src/styles.css`); the `?theme=` previews, `theme.ts`,
  `themes.css` and the unused font files removed; `scripts/fonts-check.mjs` and `scripts/shots.mjs` updated
  (the scroll check now compares with the emulated width). Screenshots: `devlog/shots_twosides_default/`.

- 16 Nov 2026, after our second internal review: rules-only cards on a copy with no settings (`core/engine.ts` `NullEngine`,
  `web/src/ai/pick.ts`); the first real on-device run and what it needed (the private step on its own Firebase app with no App
  Check, About-me cards kept on this computer, no model call for cards code decides alone, warm-up; `scripts/e2e-ondevice.mjs`,
  `devlog/ondevice_proof_1/`); the truth pass over the screen lines and these documents
  (`tests/unit/truth.test.ts`); `devlog/DAY7.md`.

- 17 Nov 2026, after our fourth internal review: a recording of the on-device step for judges whose browser cannot run it
  (`core/recorded.ts`), limited-use App Check tokens for the cloud step (taken out again the same evening), and the picture-generation step removed: it had
  been carried over from the prototype's engine file (`ONLY_IN_CLOUD`, see the table above), was never called in this
  build, and every picture is bundled. `devlog/DAY12.md`.

- 20 Nov 2026 (phase 11): 84 of the pictures on the cards were generated with Google's Gemini (Gemini 3.1 Flash
  Image, `gemini-3.1-flash-image`, in Google AI Studio), during the submission period, from short text prompts
  (`devlog/quota_probe_2026-11-20/ASSET_MANIFEST.json`), reviewed by a person, and bundled as WebP files in
  `web/public/pictures/`. We did not draw them; Google does not claim ownership of Gemini API output, and we use them
  under the Gemini API terms. The other pictures are our own SVG drawings. The source of every picture: `PICTOGRAMS.md`.
  The app asks no model for a picture at run time.

Fonts in `web/public/fonts/` are third-party, each under the SIL Open Font License 1.1 (licence text in each folder): Instrument
Sans, IBM Plex Mono, Atkinson Hyperlegible Next (fontsource 5.3.0 packages, latin subset). Overpass, Lexend and Public Sans were
bundled for the design previews from Day 4 until 16 Nov 2026 and are no longer shipped.

Tools: AI coding assistants were used during development, as the rules allow.
