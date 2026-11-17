# Evidence map

For each row of `CLAIMS.md`: the file that does it, the command that checks it, and the saved output. Commands run
from the repository root after `npm install`.

**The saved outputs are in `devlog/evidence_r4/final/`.** Every one was made at commit `5cb9c5e`. The last commit that
changes code or the text on screen is `7db4f91`; `5cb9c5e` adds one README paragraph, and the commits after it add only
these logs and documents. Each log was written by `scripts/save-log.mjs`, which records at the top the date, the commit
and whether the working tree was clean when the command started (it was, for every file there: the scripts wrote into
the ignored folder `devlog/eval_runs/r4/`, which is the path the logs name for their screenshots, and the files were
copied here afterwards), and the exit code at the end. Of the layout screenshots only the eight named below or in the
devlog were copied; the script makes about a hundred. Paths below are relative to that folder unless they start with
`devlog/`.

| # | Where it is done | Command | Saved output |
|---|---|---|---|
| 1 | `core/pipeline.ts` (`assemble`, `finish`), `core/rules.ts` | `npm run check` | `check.txt`: 957 tests, exit 0. Card shape under random input: `tests/unit/card.property.test.ts` |
| 2 | `core/pipeline.ts` (`needsNoModel`) | `npm run eval` | `heldout/heldout_r2_rules.md`: 36 of 42 code-decided questions matched the label; the six misses are listed |
| 3 | `core/engine.ts` (`NullEngine`), `web/src/ai/pick.ts` | `npm run e2e:noconfig` | `e2e-noconfig.txt`: 12/12, only the app's host contacted |
| 4 | `web/src/ai/firebaseEngine.ts` (the only import of `firebase/ai`) | `npx vitest run tests/unit/no-direct-model-calls.test.ts tests/unit/judge-path.test.ts` | in `check.txt`. The README table lists every call by file and line and is tested against the source |
| 5 | `firebaseEngine.ts` (`runDevice`), `core/prompt.ts` (`devicePrompt`) | `node scripts/e2e-ondevice.mjs --port 9335` (needs Gemini Nano) | `ondevice/RUN_LOG.md` §2: four questions, each `inferenceSource=on_device`, About-me choices, 0 outside requests; screenshots 01, 02. §5: the same weekend and dinner questions from the cloud alone give general choices (screenshot 08). Also 27 on-device cards in `heldout/heldout_r2_ondevice.md` |
| 6 | `core/strip.ts` (`stripQuestion`, `findLeaks`), `core/pipeline.ts` (`cloudCard`) | `node scripts/e2e-cloud.mjs` (needs our `.env.local`) | `e2e-cloud.txt`: 18/18, "Partner asks: What do you want to do this weekend with Person A?"; `cloud_shots/02-cloud-card.png`. Unit: `tests/unit/strip-gate.test.ts`, `strip.property.test.ts` |
| 7 | `firebaseEngine.ts` (`runCloud`, `PREFER_IN_CLOUD`) | `node scripts/e2e-ondevice.mjs --port 9335` | `ondevice/RUN_LOG.md` §4; `ondevice/05-offline-fallback.png` |
| 8 | `core/pipeline.ts` (`ran: r.source`), `web/src/main.ts` (`badge`) | `npx vitest run tests/unit/firebase-engine.test.ts tests/unit/engine-matrix.test.ts` | in `check.txt`; the `[ai-logic] … inferenceSource=…` console lines are quoted per card in both run logs |
| 9 | `core/receipt.ts`, `core/requests.ts` | `npx vitest run tests/unit/receipt.test.ts` | in `check.txt`; `e2e-cloud.txt`: "What was sent" shows one line and the size by default, the exact request is folded and one click opens it; on screen in judge mode and `#/how`, exportable as JSON; the session's receipt line is quoted at the end of `ondevice/RUN_LOG.md` §4 |
| 10 | `core/pipeline.ts` (`Card.why`, `cleanChoices`) | `npx vitest run tests/unit/day5.test.ts` | in `check.txt`; live examples in `e2e-cloud.txt` ("why:" line) and `heldout/heldout_r2_ondevice.json` (`why` per card) |
| 11, 12 | `core/rules.ts` (`isQuiz`, `splitQuestion`), `core/pipeline.ts` (`coachFor`); the opening line: `core/copy.ts` (`app.tagline`) | `npm run eval`; `npx vitest run tests/unit/truth.test.ts` (section 6) | `heldout/heldout_r2_rules.md`: memory 3 of 4; the miss is question 42. In `check.txt`: the two coaching lines, no coaching line on a question with nothing to correct, and no code path in the client that picks or confirms a choice outside a tap on the card |
| 13 | `core/rules.ts` (`dropGenericWho`, `sourceFill`) | `npx vitest run tests/unit/who-and-more.test.ts`; live: `node scripts/e2e-cloud.mjs` | `e2e-cloud.txt`: the "who to call" line with its tiles and the request "Partner asks: Who should we call tonight?"; `cloud_shots/03-cloud-who-to-call.png`. The cloud's own answer varies: see the same question in `ondevice/RUN_LOG.md` §5 |
| 14 | `core/pipeline.ts` (`nextPage` in `assemble`) | same test file; live: `node scripts/e2e-cloud.mjs` | `e2e-cloud.txt`: "a third choice from the model is on the next page" |
| 15 | `web/src/styles.css` (one-column order) | `node scripts/shots.mjs` (dev server running) | `shots.txt`: 83/83, with the measured positions (the two "phone judge mode, two questions in one" lines); pictures `shots/phone_04-…png`, `shots/phone_18-…png` |
| 16 | `eval/heldout_r2.json`, `eval/heldout_r2_amendments.json`, `scripts/eval-heldout.mjs` | `npm run eval`; `node scripts/eval-heldout.mjs --port 9335` (a run with no `--out` goes to a new folder under `devlog/eval_runs/`) | The four runs the claim quotes: `devlog/evidence_r3/heldout_at_8ca45b5/run_a`, `run_b`, `run_c` and `devlog/evidence_r3/heldout_at_8251484/`. Two more, not quoted in the claim: at `43c5265` (`devlog/evidence_r3/final/heldout/`) and at `5cb9c5e`, after the changes of day 9 (`heldout/heldout_r2_ondevice.md` and `.json`, `heldout/heldout_r2_rules.md`): 16 of 18 matched and 13 personal in both; 38 and 36 of the 42 code-decided. Our reading: `devlog/evidence_r2/heldout_r2_NOTES.md`. The set was committed before it was first run (`git show 9ac4fd9 --stat`); the first run's files are kept in `devlog/evidence_r2/` and were made on a tree with uncommitted changes |
| 17 | `core/history.ts`, `web/src/main.ts` | `npx vitest run tests/unit/history.test.ts` | in `check.txt` |
| 18 | README "Look-alikes, named" | open the links | none saved; the quotes were read on 11 Nov 2026 |
| 19 | README, first lines and footnotes | open the two links | none saved; read on 16 Nov 2026 (the journal page refused an automated fetch, so the abstract was read in its PubMed record) |
| 20 | `core/copy.ts`, `core/rules.ts` comments | — | none: no outside review exists |
| 21 | `web/src/main.ts` (`firstCard`), `core/sample.ts` (`SAMPLE_FIRST`) | `npx vitest run tests/unit/first-card.test.ts`; `npm run e2e:noconfig`; `node scripts/shots.mjs` | the unit test asks the question under every setting with an engine that fails on any call; `e2e-noconfig.txt`: "judge mode opens with a card already made, before any click"; `shots.txt`: the two "first frame" lines per width |
| 22 | `core/copy.ts` (`judge.receipt.number`), `web/src/main.ts` (`bytesLine`) | `npx vitest run tests/unit/truth.test.ts` (section 5); `npm run e2e:noconfig`; `node scripts/e2e-cloud.mjs`; `node scripts/e2e-ondevice.mjs --port 9335` | `e2e-noconfig.txt`: "0 bytes left this computer" after every card, and no host contacted but the app itself; `e2e-cloud.txt`: 0 before the cloud request, then the size of that request, counted by hand in the page; `ondevice/RUN_LOG.md`: 0 outside requests for every on-device card |
| 23 | `core/history.ts` (`topQuestions`), `web/src/main.ts` (`againChips`) | `npx vitest run tests/unit/history.test.ts`; `node scripts/shots.mjs` | in `check.txt`; `shots.txt`: the two "partner screen" lines on the chips (none before any answer; after three confirmed answers, two chips above the field; a tap asks again and the card is fresh); picture `shots/desktop_26-asked-before.png` |
| 24 | `core/rules.ts` (`positiveForm`, `plainQuestion`), `core/pipeline.ts` (`makeCardInner`) | `npx vitest run tests/unit/sim-classes.test.ts` (group 3); `npm run e2e:noconfig` | in `check.txt`; `e2e-noconfig.txt`: "a negative question is asked the plain way" |
| 25 | `core/rules.ts` (`FACT_TARGET`, `quizKind`, `inventedNameFilter`, `selfFilter`) | the same file, groups 1 and 11 | in `check.txt`; `e2e-noconfig.txt`: "two questions, the first with no card" (its first half is a time question) |
| 26 | `core/pipeline.ts` (`hiddenSubject`, in `cloudCard`) | the same file, group 8 | in `check.txt` |
| 27 | `core/rules.ts` (`isPainLevel`, `numberScale`, `painBands`) | the same file, group 9 | in `check.txt` |
| 28 | `web/src/ai/remoteConfig.ts` (`fetchSettings`), `core/models.ts` (`checkSetting`, `settingsFrom`), `web/src/main.ts` (`askSettings`, `settingsPanel`), `remoteconfig.template.json` | `npx vitest run tests/unit/remote-config.test.ts`; live: `node scripts/e2e-cloud.mjs`; the published template: `npx firebase-tools remoteconfig:get` | in `check.txt`; `e2e-cloud.txt`: the three "Remote Config" lines (not asked with cloud help off; unreachable: a card at once, defaults; reachable: three values "from Remote Config") and "the cloud request names the model Remote Config gave"; `remoteconfig-get.txt` |

Also in that folder: `build.txt` (production build, the check that no debug token is bundled, exit 0), `audit.txt`
(`npm audit --omit=dev`: 4 high advisories, all in the gRPC package under `@firebase/firestore`, which the app does not
import; exit 1 is the audit's own), `fonts-check.txt` (no request leaves the app's host; fonts are self-hosted).

**What reproduces where.** Rows 1–4, 8–12, 14 (unit part), 16 (rules pass) and 17 run on any machine from a clone.
Rows 6, 13 and 14 (live part) need a Firebase project's web config in `.env.local`. Rows 5, 7 and the on-device pass
of 16 need desktop Chrome with Gemini Nano. For those we can only show our saved runs.

**Earlier records, kept as they were:** `devlog/evidence_r3/final/` (every log at `43c5265`, before the changes of day 9), `devlog/ondevice_proof_1/` (the first on-device run, tag `ondevice-proof-1`),
`devlog/evidence_r2/` (runs at `83a7da5` and, under `at_head_2/`, at `161c491`; the on-device log there and the first
held-out run record uncommitted changes in the tree, so we do not call them clean),
`devlog/evidence_r3/cold_start_at_67fb3e2/RUN_LOG.md` (an on-device run right after a browser start: 21.7 s to
"Ready"; the log only, its screenshots were not kept), `devlog/DAY1.md`–`DAY9.md`.
