# Evidence map

For each row of `CLAIMS.md`: the file that does it, the command that checks it, and the saved output. Commands run
from the repository root after `npm install`. Saved outputs under `devlog/evidence_r2/at_head_2/` were made at commit
`161c491`; each file ends with its exit code or its commit line. `check.txt` there was made again at `510f84a`
(its header says so) with `scripts/save-log.mjs`, which keeps a machine's folder names out of a saved log.

| # | Where it is done | Command | Saved output |
|---|---|---|---|
| 1 | `core/pipeline.ts` (`assemble`, `finish`), `core/rules.ts` | `npm run check` | `at_head_2/check.txt`: 922 tests, exit 0. Card shape under random input: `tests/unit/card.property.test.ts` |
| 2 | `core/pipeline.ts` (`needsNoModel`) | `npm run eval` | `devlog/evidence_r2/heldout_r2_rules.md`: 36 of 42 code-decided questions matched the label; the six misses are listed |
| 3 | `core/engine.ts` (`NullEngine`), `web/src/ai/pick.ts` | `npm run e2e:noconfig` | `at_head_2/e2e-noconfig.txt`: 10/10, only the app's host contacted |
| 4 | `web/src/ai/firebaseEngine.ts` (the only import of `firebase/ai`) | `npx vitest run tests/unit/no-direct-model-calls.test.ts tests/unit/judge-path.test.ts` | in `check.txt`. The README table lists every call by file and line and is tested against the source |
| 5 | `firebaseEngine.ts` (`runDevice`), `core/prompt.ts` (`devicePrompt`) | `node scripts/e2e-ondevice.mjs --port 9335` (needs Gemini Nano) | `at_head_2/ondevice/RUN_LOG.md` §2: four questions, each `inferenceSource=on_device`, About-me choices, 0 outside requests; screenshots 01, 02. Also 27 on-device cards in `heldout_r2_ondevice.md` |
| 6 | `core/strip.ts` (`stripQuestion`, `findLeaks`), `core/pipeline.ts` (`cloudCard`) | `node scripts/e2e-cloud.mjs` (needs our `.env.local`) | `at_head_2/e2e-cloud.txt`: 15/15, "Partner asks: What do you want to do this weekend with Person A?"; `02-cloud-card.png`. Unit: `tests/unit/strip-gate.test.ts`, `strip.property.test.ts` |
| 7 | `firebaseEngine.ts` (`runCloud`, `PREFER_IN_CLOUD`) | `node scripts/e2e-ondevice.mjs --port 9335` | `at_head_2/ondevice/RUN_LOG.md` §4; `05-offline-fallback.png` |
| 8 | `core/pipeline.ts` (`ran: r.source`), `web/src/main.ts` (`badge`) | `npx vitest run tests/unit/firebase-engine.test.ts tests/unit/engine-matrix.test.ts` | in `check.txt`; the `[ai-logic] … inferenceSource=…` console lines are quoted per card in both run logs |
| 9 | `core/receipt.ts` | `npx vitest run tests/unit/receipt.test.ts` | in `check.txt`; on screen in judge mode and `#/how`, exportable as JSON |
| 10 | `core/pipeline.ts` (`Card.why`, `cleanChoices`) | `npx vitest run tests/unit/day5.test.ts` | in `check.txt`; live examples in `e2e-cloud.txt` ("why:" line) and `heldout_r2_ondevice.json` (`why` per card) |
| 11, 12 | `core/rules.ts` (`isQuiz`, `splitQuestion`), `core/pipeline.ts` (`coachFor`) | `npm run eval` | `heldout_r2_rules.md`: memory 3 of 4; the miss is question 42 |
| 13 | `core/rules.ts` (`dropGenericWho`, `sourceFill`) | `npx vitest run tests/unit/who-and-more.test.ts`; live: `node scripts/e2e-cloud.mjs` | `at_head_2/e2e-cloud.txt`: "who to call -> doctor / Jenny / someone else", request "Partner asks: Who should we call tonight?"; `03-cloud-who-to-call.png` |
| 14 | `core/pipeline.ts` (`nextPage` in `assemble`) | same test file; live: `node scripts/e2e-cloud.mjs` | `e2e-cloud.txt`: "a third choice from the model is on the next page … visit family" |
| 15 | `web/src/styles.css` (one-column order) | `node scripts/shots.mjs` (dev server running) | `at_head_2/shots.txt`: 65/65, with the measured positions; pictures in `devlog/shots_r2phone/` |
| 16 | `eval/heldout_r2.json`, `scripts/eval-heldout.mjs` | `npm run eval`; `node scripts/eval-heldout.mjs --port 9335` | `devlog/evidence_r2/heldout_r2_rules.md`, `heldout_r2_ondevice.md` and `.json` (first run, unedited, at `9ac4fd9`), and our reading in `heldout_r2_NOTES.md`. The set was committed before it was run: `git show 9ac4fd9 --stat` |
| 17 | `core/history.ts`, `web/src/main.ts` | `npx vitest run tests/unit/history.test.ts` | in `check.txt` |
| 18 | README "Look-alikes, named" | open the links | none saved; the quotes were read on 11 Nov 2026 |
| 19 | README, first lines and footnotes | open the two links | none saved; read on 16 Nov 2026 (the journal page refused an automated fetch, so the abstract was read in its PubMed record) |
| 20 | `core/copy.ts`, `core/rules.ts` comments | — | none: no outside review exists |

**What reproduces where.** Rows 1–4, 8–12, 14 (unit part), 16 (rules pass) and 17 run on any machine from a clone.
Rows 6, 13 and 14 (live part) need a Firebase project's web config in `.env.local`. Rows 5, 7 and the on-device pass
of 16 need desktop Chrome with Gemini Nano. For those we can only show our saved runs.

**Earlier records, kept:** `devlog/ondevice_proof_1/` (the first on-device run, tag `ondevice-proof-1`),
`devlog/evidence_r2/ondevice_at_head/` and `e2e-*.txt` (runs at `83a7da5`), `devlog/DAY1.md`–`DAY7.md`.
