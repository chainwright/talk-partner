# Disclosure: pre-existing work

The #BuildHybridAI 2026 rules allow an existing project if it is significantly updated during the submission period,
with any pre-existing code or work disclosed. This file lists exactly what existed before the period
(11 Nov 2026, 13:30 PT) and what was built in it.

## What existed before 11 Nov 2026
On 9–10 Nov 2026 we built a throwaway prototype of Talk Partner in a separate local repository (never published).
It called Chrome's built-in model directly, had no Firebase project, and its cloud step never ran.
We took these files from it **verbatim**, in this repository's first commit (`949e8ec`), so the history shows exactly what was carried over:

| File | What it is |
|---|---|
| `core/rules.ts` | The supported-conversation card rules (split questions, yes/no, either-or, body map, feelings, escapes, household, time scale, quiz detection, router) |
| `core/strip.ts` | The privacy swap: About-me words become "Person A", "Place A"…, the leak check, the restore |
| `core/prompt.ts` | The model prompts and the JSON schema |
| `core/pipeline.ts` | Card assembly from the question and the model's proposal |
| `core/pictures.ts`, `core/types.ts`, `core/engine.ts`, `core/requests.ts` | Picture choice, shared types, the engine interface, the cloud request bodies |
| `web/src/pictos.ts` | Hand-drawn line pictograms (SVG), our own work |
| `tests/unit/*.test.ts` (rules, pipeline, fixround 1–4, strip property test), `tests/unit/fixtures.ts` | Unit tests for the above |

Research that informed the rules (aphasia knowledge base, five blind held-out question sets) also predates the period.
Its numbers came from the prototype's direct Chrome path, not from this build, and we do not claim them as results of this submission.

## What was NOT carried over
- The prototype's direct Chrome engine (`ChromeDirectEngine`). This build has no direct model call anywhere:
  every model call goes through Firebase AI Logic, and `tests/unit/no-direct-model-calls.test.ts` fails the build otherwise.
- The prototype's UI, storage and end-to-end tests.

## Built during the submission period (from 11 Nov 2026)
See `git log` for dates. Day by day: `devlog/`.
- Firebase project `talk-partner`: web app, Firebase AI Logic (Gemini Developer API), App Check.
- `web/src/ai/firebaseEngine.ts`: all three AI legs on `firebase/ai` hybrid inference (`ONLY_ON_DEVICE`, `PREFER_IN_CLOUD`,
  `ONLY_IN_CLOUD`), `inferenceSource` checked on every response, App Check, lazy start so the app contacts no Google host
  until an AI call is needed.
- `core/pipeline.ts` changes: the coffee/tea fix (a valid either-or pair read from the question is never dropped because a model
  ran) and honest "sent" reporting (a request is shown as sent only when the cloud actually answered; an offline fall-back to
  the device says so).
- `core/models.ts`, `core/sample.ts`: shared model config and the made-up judge-mode family, for all clients.
- The one-screen web client (`web/src/main.ts`, `styles.css`), three new pictograms (listen, tea, coffee).
- Tests: the guard against direct model calls, the coffee/tea engine-state matrix, the real end-to-end check against
  Firebase (`scripts/e2e-cloud.mjs`), and the production-bundle check (`scripts/check-dist.mjs`).
- Day 2 (11 Nov), in `core/rules.ts`, `core/pipeline.ts`, `core/strip.ts`, `core/pictures.ts`: the or-pair headline
  (the shared topic, never an option), the either-or label check applied to both the model's options and the code
  parser, subject-less offers as yes/no, completing an open card from the About-me list of the same kind or a small
  fixed set, numbers as figures, a line per kind of memory question, plural forms and unknown capitalised words
  ("Name A") in the privacy swap, the picture gate, blocked cards without choices. Tests: `headline`, `label-check`,
  `open-sources`, `strip-gate`, `card.property`, and the engine-state matrix extended to seven card shapes.
  Three pre-period tests were updated to the new behaviour, each with a dated comment saying why.

Tools: AI coding assistants were used during development, as the rules allow.
