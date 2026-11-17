# Evidence map

For each row of `CLAIMS.md`: the file that does it, the command that checks it, and the saved output. Commands run
from the repository root after `npm install`.

**The saved outputs are in `devlog/evidence_r8/final/`.** Every one was made at commit `deebc94`, the last commit that
changes code or the text on screen; the commits after it change one label in two scripts, add these logs and change
documents. Each log was written by
`scripts/save-log.mjs`, which records at the top the date, the commit and whether the working tree was clean when the
command started (it was, for every file there: the scripts wrote into a folder outside the repository, which the
logs name as `<scratch>` for their screenshots, and the files were copied here afterwards), and the exit code at the
end. Of the layout screenshots only the eight named below or in the devlog were copied; the script makes about fifty. Paths below are relative to that folder unless they start with `devlog/`.

**One set of runs is at an earlier commit:** the labelled set on the on-device model (row 16) was run three times on
17 Nov at `c346d3d`, on a clean tree: `devlog/evidence_r8/heldout_at_c346d3d/` (three on-device runs and the
rules-alone pass). Between `c346d3d` and `deebc94` the code differs in one on-screen string (the paragraph that quotes
those runs) and one comment (`git diff c346d3d..deebc94 -- core web`); the rules-alone pass was made again at
`deebc94` and is in `heldout/` here. The one earlier run rows 5 and 10 also point at is in
`devlog/evidence_r5/final/heldout/`, made at `24793c1`.

| # | Where it is done | Command | Saved output |
|---|---|---|---|
| 1 | `core/pipeline.ts` (`assemble`, `finish`), `core/rules.ts` | `npm run check` | `check.txt`: 1714 tests, exit 0. Card shape under random input: `tests/unit/card.property.test.ts` |
| 2 | `core/pipeline.ts` (`needsNoModel`) | `npm run eval` | `heldout/heldout_r2_rules.md`: 40 of 42 code-decided questions matched the label; the misses are listed |
| 3 | `core/engine.ts` (`NullEngine`), `web/src/ai/pick.ts` | `npm run e2e:noconfig` | `e2e-noconfig.txt`: 16/16, only the app's host contacted |
| 4 | `web/src/ai/firebaseEngine.ts` (the only import of `firebase/ai`) | `npx vitest run tests/unit/no-direct-model-calls.test.ts tests/unit/judge-path.test.ts` | in `check.txt`. The README table lists every call by file and line and is tested against the source |
| 5 | `firebaseEngine.ts` (`runDevice`), `core/prompt.ts` (`devicePrompt`) | `node scripts/e2e-ondevice.mjs --port 9335` (needs Gemini Nano) | `ondevice/RUN_LOG.md` §2: four questions, each `inferenceSource=on_device`, About-me choices, 0 outside requests; screenshots 01, 02. §5: the same weekend and dinner questions from the cloud alone give general choices (screenshot 08). Also 26 on-device cards in `devlog/evidence_r5/final/heldout/heldout_r2_ondevice.md` (at `24793c1`) |
| 6 | `core/strip.ts` (`stripQuestion`, `findLeaks`), `core/pipeline.ts` (`cloudCard`) | `node scripts/e2e-cloud.mjs` (needs our `.env.local`) | `e2e-cloud.txt`: 28/28, "Partner asks: What do you want to do this weekend with Person A?"; `cloud_shots/02-cloud-card.png`. Unit: `tests/unit/strip-gate.test.ts`, `strip.property.test.ts`; names About me does not list, with the request, the "Sent" line and the receipt compared: after a title, opening a sentence (`tests/unit/sim-d-classes.test.ts`, group D-a); in lower case, a name that is also a word, a filler, the kind of place kept (`tests/unit/sim-e-classes.test.ts`, groups E-14 and E-15) |
| 7 | `firebaseEngine.ts` (`runCloud`, `PREFER_IN_CLOUD`) | `node scripts/e2e-ondevice.mjs --port 9335` | `ondevice/RUN_LOG.md` §4; `ondevice/05-offline-fallback.png` |
| 8 | `core/pipeline.ts` (`ran: r.source`), `web/src/main.ts` (`badge`) | `npx vitest run tests/unit/firebase-engine.test.ts tests/unit/engine-matrix.test.ts` | in `check.txt`; the `[ai-logic] … inferenceSource=…` console lines are quoted per card in both run logs |
| 9 | `core/receipt.ts`, `core/requests.ts` | `npx vitest run tests/unit/receipt.test.ts` | in `check.txt`; `e2e-cloud.txt`: "What was sent" shows one line and the size by default, the exact request is folded and one click opens it; on screen in judge mode and `#/how`, exportable as JSON; the session's receipt line is quoted at the end of `ondevice/RUN_LOG.md` §4 |
| 10 | `core/pipeline.ts` (`Card.why`, `cleanChoices`) | `npx vitest run tests/unit/day5.test.ts` | in `check.txt`; live examples in `e2e-cloud.txt` ("why:" line) and `devlog/evidence_r5/final/heldout/heldout_r2_ondevice.json` (`why` per card, at `24793c1`) |
| 11, 12 | `core/rules.ts` (`isQuiz`, `splitQuestion`), `core/pipeline.ts` (`coachFor`); the opening line: `core/copy.ts` (`app.tagline`) | `npm run eval`; `npx vitest run tests/unit/truth.test.ts` (section 6) | `heldout/heldout_r2_rules.md`: memory 4 of 4 (question 42, the miss until `148a211`, is caught as a recall question). Orientation and recall questions, new phrasings: `tests/unit/sim-d-classes.test.ts`, group D-1; a test asked politely, "who was that on the phone", the split of two questions: `tests/unit/sim-e-classes.test.ts`, groups E-2, E-3, E-4. In `check.txt`: the two coaching lines, no coaching line on a question with nothing to correct, and no code path in the client that picks or confirms a choice outside a tap on the card |
| 13 | `core/rules.ts` (`dropGenericWho`, `sourceFill`) | `npx vitest run tests/unit/who-and-more.test.ts`; live: `node scripts/e2e-cloud.mjs` | `e2e-cloud.txt`: the "who to call" line with its tiles and the request "Partner asks: Who should we call tonight?"; `cloud_shots/03-cloud-who-to-call.png`. The cloud's own answer varies: see the same question in `ondevice/RUN_LOG.md` §5. Every person on the card with next pages, the role after them: `tests/unit/sim-e-classes.test.ts`, group E-9 |
| 14 | `core/pipeline.ts` (`nextPage` in `assemble`), `core/rules.ts` (`fillerFilter`, `besideOwnFilter`, `isNoneOption`) | same test file; `tests/unit/sim-e-classes.test.ts`, groups E-5 and E-13; live: `node scripts/e2e-cloud.mjs` | `e2e-cloud.txt`: "a third choice from the model is on the next page" |
| 15 | `web/src/styles.css` (one-column order) | `node scripts/shots.mjs` (dev server running) | `shots.txt`: 87/87, with the measured positions (the two "phone judge mode, two questions in one" lines); pictures `shots/phone_04-…png`, `shots/phone_18-…png` |
| 16 | `eval/heldout_r2.json`, `eval/heldout_r2_amendments.json`, `scripts/eval-heldout.mjs` | `npm run eval`; `node scripts/eval-heldout.mjs --port 9335` (a run with no `--out` goes to a new folder under `devlog/eval_runs/`) | The three runs the claim quotes, at `c346d3d` on a clean tree: `devlog/evidence_r8/heldout_at_c346d3d/run_a`, `run_b`, `run_c` (16 of 18 matched and 13 personal in each; 39, 41, 41 of the 42 code-decided) and, rules alone, `devlog/evidence_r8/heldout_at_c346d3d/rules/` (40 of 42, 0 of 18). Earlier runs, kept: the four first ones, `devlog/evidence_r3/heldout_at_8ca45b5/run_a`, `run_b`, `run_c` and `devlog/evidence_r3/heldout_at_8251484/`; two more at `43c5265` (`devlog/evidence_r3/final/heldout/`) and at `5cb9c5e`, after the changes of day 9 (`devlog/evidence_r4/final/heldout/`): 16 of 18 matched and 13 personal in both; 38 and 36 of the 42 code-decided. The one run after the rule changes of day 10, at `24793c1` (`devlog/evidence_r5/final/heldout/`: `heldout_r2_ondevice.md` and `.json`, `heldout_r2_rules.md`): 17 of 18 matched, 14 personal; 39 of the 42 code-decided on this computer, 37 with the rules alone. Our reading: `devlog/evidence_r2/heldout_r2_NOTES.md`. The set was committed before it was first run (`git show 9ac4fd9 --stat`); the first run's files are kept in `devlog/evidence_r2/` and were made on a tree with uncommitted changes. It is no longer a held-out set: rules it covers were changed afterwards (the note at the top of `heldout_r2_NOTES.md`), and reports saved before 17 Nov still carry the set's own sentence "no rule was changed after that run", which was true of the first run only |
| 17 | `core/history.ts`, `web/src/main.ts` | `npx vitest run tests/unit/history.test.ts` | in `check.txt` |
| 18 | README "Look-alikes, named" | open the links | none saved; the quotes were read on 11 Nov 2026, the Livox page on 17 Nov 2026 |
| 19 | README, first lines and footnotes | open the three links | none saved; read on 16 Nov 2026 (the journal page refused an automated fetch, so the abstract was read in its PubMed record); the Aphasia Institute page on 17 Nov 2026 |
| 20 | `core/copy.ts`, `core/rules.ts` comments | — | none: no outside review exists |
| 21 | `web/src/main.ts` (`firstCard`), `core/sample.ts` (`SAMPLE_FIRST`) | `npx vitest run tests/unit/first-card.test.ts`; `npm run e2e:noconfig`; `node scripts/shots.mjs` | the unit test asks the question under every setting with an engine that fails on any call; `e2e-noconfig.txt`: "judge mode opens with a card already made, before any click"; `shots.txt`: the two "first frame" lines per width |
| 22 | `core/copy.ts` (`judge.receipt.number`), `web/src/main.ts` (`bytesLine`) | `npx vitest run tests/unit/truth.test.ts` (section 5); `npm run e2e:noconfig`; `node scripts/e2e-cloud.mjs`; `node scripts/e2e-ondevice.mjs --port 9335` | `e2e-noconfig.txt`: "0 bytes left this computer" after every card, and no host contacted but the app itself; `e2e-cloud.txt`: 0 before the cloud request, then the size of that request, counted by hand in the page; `ondevice/RUN_LOG.md`: 0 outside requests for every on-device card |
| 23 | `core/history.ts` (`topQuestions`), `web/src/main.ts` (`againChips`) | `npx vitest run tests/unit/history.test.ts`; `node scripts/shots.mjs` | in `check.txt`; `shots.txt`: the two "partner screen" lines on the chips (none before any answer; after three confirmed answers, two chips above the field; a tap asks again and the card is fresh); picture `shots/desktop_26-asked-before.png` |
| 24 | `core/rules.ts` (`positiveForm`, `plainQuestion`), `core/pipeline.ts` (`makeCardInner`) | `npx vitest run tests/unit/sim-classes.test.ts` (group 3); `npm run e2e:noconfig` | in `check.txt`; `e2e-noconfig.txt`: "a negative question is asked the plain way" |
| 25 | `core/rules.ts` (`FACT_TARGET`, `quizKind`, `inventedNameFilter`, `selfFilter`) | the same file, groups 1 and 11 | in `check.txt`; `e2e-noconfig.txt`: "two questions, the first with no card" (its first half is a time question) |
| 26 | `core/pipeline.ts` (`hiddenSubject`, in `cloudCard`) | the same file, group 8 | in `check.txt` |
| 27 | `core/rules.ts` (`isPainLevel`, `numberScale`, `painNumbers`) | the same file, group 9; `tests/unit/sim-d-classes.test.ts`, group D-4 | in `check.txt`; pictures `devlog/evidence_r6/final/shots/extra_desktop_pain-number-line.png`, `extra_phone_pain-number-line-person.png` (made at `0afbf77`; that card has not changed) |
| 28 | `web/src/ai/remoteConfig.ts` (`fetchSettings`), `core/models.ts` (`checkSetting`, `settingsFrom`), `web/src/main.ts` (`askSettings`, `settingsPanel`), `remoteconfig.template.json` | `npx vitest run tests/unit/remote-config.test.ts`; live: `node scripts/e2e-cloud.mjs`; the published template: `npx firebase-tools remoteconfig:get` | in `check.txt`; `e2e-cloud.txt`: the three "Remote Config" lines (not asked with cloud help off; unreachable: a card at once, defaults; reachable: three values "from Remote Config") and "the cloud request names the model Remote Config gave"; `devlog/evidence_r5/final/remoteconfig-get.txt` (read at `24793c1`; the template has not changed since) |
| 29 | `web/src/main.ts` (`judgeStep`, `statusLine`), `core/sample.ts` (`SAMPLE_STEP`), `core/copy.ts` (`judge.step`) | `npx vitest run tests/unit/first-card.test.ts`; `node scripts/e2e-ondevice.mjs --port 9335` (needs Gemini Nano); without the model: `node scripts/e2e-cloud.mjs`, `node scripts/shots.mjs` | `ondevice/RUN_LOG.md` §1b: the card appeared by itself, badge "On this computer", `inferenceSource=on_device`, lake / church from About me, 0 outside requests; picture `ondevice/00-first-step-on-device.png`. `e2e-cloud.txt`: "no on-device model in this browser: the status line says so plainly, and the first card (made in code) stays"; `shots.txt`: the two "first frame once the status line says there is no on-device model to show" lines |
| 30 | `core/pipeline.ts` (`cloudCard`, `cloudRetryWait`), `core/actions.ts` (`retry`) | `npx vitest run tests/unit/sim-d-classes.test.ts` (group D-b); `tests/unit/truth.test.ts` (sections 1, 3, 4) | in `check.txt`. A scripted engine throws the 429 the service gave on 16 Nov; not run against the live service |
| 31 | `core/rules.ts` (`codePair`, `timePair`, `namePair`, `clausePair`, `validateOptions`, `clipped`) | `npx vitest run tests/unit/sim-e-classes.test.ts` (groups E-1, E-12) | in `check.txt` |
| 32 | `core/rules.ts` (`whenChoices`), `core/pipeline.ts` (`assemble`) | the same file, group E-11 | in `check.txt` |
| 33 | `core/rules.ts` (`isUnguessable`), `core/pipeline.ts` (`assemble`), `core/actions.ts` | the same file, group E-8 | in `check.txt` |
| 34 | `core/rules.ts` (`FEELING_SCALES`) | the same file, group E-7 | in `check.txt` |
| 35 | `core/pipeline.ts` (`toChoices`) | the same file, group E-6 | in `check.txt` |
| 36 | `core/pictures.ts` (`BUILTIN`, `pictureFor`), `web/src/pictos.ts`, `PICTOGRAMS.md` | `npx vitest run tests/unit/day3.test.ts tests/unit/pipeline.test.ts` | in `check.txt`; word-only tiles on an on-device card: `ondevice/00-first-step-on-device.png` |
| 37 | `web/src/ai/firebaseEngine.ts`, `web/src/ai/remoteConfig.ts`, `firebase.json`; `devlog/SUBMISSION_NOTES.md` | `node scripts/e2e-cloud.mjs --url https://talk-partner.web.app/` | `devlog/evidence_live/`: the App Check and Remote Config hosts in the live log. Enforcement: nothing saved, because it is not switched on |
| 38 | `core/copy.ts` (`judge.step.none`, `judge.step.notDownloaded`), `web/src/main.ts` (`statusLine`) | `npx vitest run tests/unit/first-card.test.ts`; `node scripts/e2e-cloud.mjs` | in `check.txt`; `e2e-cloud.txt`: "no on-device model in this browser: the status line says so plainly" |
| 39 | `core/recorded.ts`, `web/src/main.ts` (`recordedBlock`) | `npx vitest run tests/unit/recorded.test.ts`; `node scripts/e2e-cloud.mjs`; `npm run e2e:noconfig`; `node scripts/e2e-ondevice.mjs --port 9335` | in `check.txt` (every value of the recording is in `devlog/evidence_r7/final/ondevice/RUN_LOG.md`); `e2e-cloud.txt`: the two "recording" lines; `cloud_shots/00-recording-of-the-on-device-step.png`; `ondevice/RUN_LOG.md`: no recording is offered where the model is |

The badge "Made in code (AI answer not used)" (row 2): `core/receipt.ts` (`badgeKind`, `modelAsked`), `tests/unit/sim-e-classes.test.ts`, group E-10.

Also in that folder: `build.txt` (production build, the check that no debug token is bundled, exit 0), `audit.txt`
(`npm audit --omit=dev`: 4 high advisories, all in the gRPC package under `@firebase/firestore`, which the app does not
import; exit 1 is the audit's own), `fonts-check.txt` (no request leaves the app's host; fonts are self-hosted).

**What reproduces where.** Rows 1–4, 8–12, 14 (unit part), 16 (rules pass) and 17 run on any machine from a clone.
Rows 6, 13 and 14 (live part) need a Firebase project's web config in `.env.local`. Rows 5, 7 and the on-device pass
of 16 need desktop Chrome with Gemini Nano. For those we can only show our saved runs.

**The hosted copy** serves the build of `deebc94` since 17 Nov 2026 (the served bundle was compared byte for byte with
the local build). Two runs against it, both in `devlog/evidence_live/`:
- `e2e-cloud_live_2026-11-17_deebc94.txt`: `node scripts/e2e-cloud.mjs --url https://talk-partner.web.app/`, 28/28: the
  cloud step through App Check (reCAPTCHA Enterprise), Remote Config, and the recording of the on-device step in a
  browser without the model.
- `e2e-ondevice_live_2026-11-17_deebc94.txt` and `ondevice_live_2026-11-17_deebc94/RUN_LOG.md` (with three of its
  screenshots): `node scripts/e2e-ondevice.mjs --port 9335 --url https://talk-partner.web.app/`, 43/43, in the Chrome
  that has Gemini Nano. It is the first run of the on-device step on the hosted copy: the first step by itself,
  `inferenceSource=on_device`, lake / church from About me, no host contacted but the site's own for any on-device
  card. Its log names the commit of the checkout it was run from (`89fb06a`, one script label after `deebc94`).

The logs of the earlier deploys, at `8ace9f0`, `0afbf77`, `24793c1` and `c37e4c4`, are next to them.

**Earlier records, kept as they were:** `devlog/evidence_r7/final/` (every log at `8ace9f0`, before the changes that followed the fourth review; the recording shown in judge mode is copied from its on-device log), `devlog/evidence_r6/final/` (every log at `0afbf77`, before the changes that followed set E), `devlog/evidence_r5/final/` (every log at `24793c1`, before the changes that followed set D), `devlog/evidence_r4/final/` (every log at `5cb9c5e`, before the changes of day 10), `devlog/evidence_r3/final/` (every log at `43c5265`, before the changes of day 9), `devlog/ondevice_proof_1/` (the first on-device run, tag `ondevice-proof-1`),
`devlog/evidence_r2/` (runs at `83a7da5` and, under `at_head_2/`, at `161c491`; the on-device log there and the first
held-out run record uncommitted changes in the tree, so we do not call them clean),
`devlog/evidence_r3/cold_start_at_67fb3e2/RUN_LOG.md` (an on-device run right after a browser start: 21.7 s to
"Ready"; the log only, its screenshots were not kept), `devlog/DAY1.md`–`DAY12.md`.
