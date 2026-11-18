# Evidence map

For each row of `CLAIMS.md`: the file that does it, the command that checks it, and the saved output. Commands run
from the repository root after `npm install`.

**The saved outputs are in `devlog/evidence_r8/final/`.** Every one was made at commit `deebc94` (17 Nov). Much code
has changed since: the rows of phases 2 to 8 name their own runs and their own commits. Each log was written by
`scripts/save-log.mjs`, which records at the top the date, the commit and whether the working tree was clean when the
command started (it was, for every file there: the scripts wrote into a folder outside the repository, which the
logs name as `<scratch>` for their screenshots, and the files were copied here afterwards), and the exit code at the
end. Of the layout screenshots only the eight named below or in the devlog were copied; the script makes about fifty. Paths below are relative to that folder unless they start with `devlog/`.

**Since those runs (17 Nov, later): two features and what was run again.** The quick-needs board (`7080ebf`) and
voice input (`a1e1b2d`) were added, then one on-screen sentence was changed (`8810f8f`, the last commit that changes
code or text on screen), a script was added (`0eeca4e`) and one hosting header (`20d2b19`). Saved at those commits,
each on a clean tree, in `devlog/evidence_r9/final/`: `check.txt` (1770 tests), `build.txt`, `e2e-noconfig.txt`
(25/25), `shots.txt` (121/121), `fonts-check.txt` (6/6) and `eval-rules.txt` (40 of 42, 0 of 18: unchanged), all at
`8810f8f`; `e2e-needs.txt` (12/12), run from `20d2b19`; and the on-device run, `ondevice_at_a1e1b2d/` (43/43, at
`a1e1b2d`, one on-screen sentence of "How this works" before `8810f8f`; its log names ten screenshots, of which two
were copied). **Not run again:** the cloud script on localhost and the labelled set on the on-device model; for those
the runs at `deebc94` and `c346d3d` below stand, and nothing in the two features touches a rule, a prompt or a model
call (`git diff deebc94..8810f8f -- core/rules.ts core/pipeline.ts core/prompt.ts core/strip.ts web/src/ai` is
empty). Rows 40 and 41 below point into `evidence_r9`; the other rows still name the files of `evidence_r8`, where
the counts are the older ones (1714 tests, 16/16, 87/87).

**Commit hashes.** The hashes in these documents and in the saved logs are from our working history. The public history has the same commits, in the same order and with the same dates, re-made under new hashes; `devlog/PUBLIC_HASH_MAP.md` gives working hash → public hash for each. The name `ondevice-proof-1` in some log headers is a tag of the working history on commit `1092be7`; it is not in the public repository. The commits of 17 Nov after `335d604` (`7080ebf`, `a1e1b2d`, `8810f8f`, `0eeca4e`, `20d2b19` and the document commits after them) get their rows in that map when they are put into the public history.

**The labelled set on the on-device model (row 16)** was run three times again on 18 Nov at `d198eb0` (the code of phase 5): 15, 16 and 16 of 18, `devlog/evidence_phase5/heldout_at_d198eb0/`. Before that it was run three times on 17 Nov at `7dd16a1` (the last code commit of that day; the topic, tree, card-rule and phase 3 to 5 commits came after it), on a clean tree:
`devlog/evidence_r11/heldout_at_7dd16a1/` (`run_a`, `run_b`, `run_c`), and three times an hour earlier at `2aeb1d0`:
`devlog/evidence_r11/heldout_at_2aeb1d0/` (`run_a`, `run_b`, `run_c` and the rules-alone pass in `rules/`). **An earlier set of three** was run on
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
| 16 | `eval/heldout_r2.json`, `eval/heldout_r2_amendments.json`, `scripts/eval-heldout.mjs` | `npm run eval`; `node scripts/eval-heldout.mjs --port 9335` (a run with no `--out` goes to a new folder under `devlog/eval_runs/`) | The three runs the claim quotes, at `7dd16a1` on a clean tree: `devlog/evidence_r11/heldout_at_7dd16a1/run_a`, `run_b`, `run_c` (15, 16, 15 of 18 matched; 12, 13, 12 personal; 40 of the 42 code-decided in each). Three more at `2aeb1d0`: `devlog/evidence_r11/heldout_at_2aeb1d0/run_a`, `run_b`, `run_c` (16 of 18 matched and 13 personal in each; 40 of 42 in each) and, rules alone, `devlog/evidence_r11/heldout_at_2aeb1d0/rules/` (40 of 42, 0 of 18). The three before the rule changes of 17 Nov, at `c346d3d`: `devlog/evidence_r8/heldout_at_c346d3d/run_a`, `run_b`, `run_c` (16 of 18 and 13 personal in each; 39, 41, 41 of the 42) and `rules/` there. Earlier runs, kept: the four first ones, `devlog/evidence_r3/heldout_at_8ca45b5/run_a`, `run_b`, `run_c` and `devlog/evidence_r3/heldout_at_8251484/`; two more at `43c5265` (`devlog/evidence_r3/final/heldout/`) and at `5cb9c5e`, after the changes of day 9 (`devlog/evidence_r4/final/heldout/`): 16 of 18 matched and 13 personal in both; 38 and 36 of the 42 code-decided. The one run after the rule changes of day 10, at `24793c1` (`devlog/evidence_r5/final/heldout/`: `heldout_r2_ondevice.md` and `.json`, `heldout_r2_rules.md`): 17 of 18 matched, 14 personal; 39 of the 42 code-decided on this computer, 37 with the rules alone. Our reading: `devlog/evidence_r2/heldout_r2_NOTES.md`. The set was committed before it was first run (`git show 9ac4fd9 --stat`); the first run's files are kept in `devlog/evidence_r2/` and were made on a tree with uncommitted changes. It is no longer a held-out set: rules it covers were changed afterwards (the note at the top of `heldout_r2_NOTES.md`), and reports saved before 17 Nov still carry the set's own sentence "no rule was changed after that run", which was true of the first run only |
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
| 30 | `core/pipeline.ts` (`cloudCard`, `cloudRetryWait`), `core/actions.ts` (`retry`) | `npx vitest run tests/unit/sim-d-classes.test.ts` (group D-b); `tests/unit/truth.test.ts` (sections 1, 3, 4) | in `check.txt`. A scripted engine throws the 429 the service gave on 16 Nov and the App Check errors of 17 Nov; not run against the live service |
| 31 | `core/rules.ts` (`codePair`, `timePair`, `namePair`, `clausePair`, `validateOptions`, `clipped`) | `npx vitest run tests/unit/sim-e-classes.test.ts` (groups E-1, E-12) | in `check.txt` |
| 32 | `core/rules.ts` (`whenChoices`), `core/pipeline.ts` (`assemble`) | the same file, group E-11 | in `check.txt` |
| 33 | `core/rules.ts` (`isUnguessable`), `core/pipeline.ts` (`assemble`), `core/actions.ts` | the same file, group E-8 | in `check.txt` |
| 34 | `core/rules.ts` (`FEELING_SCALES`) | the same file, group E-7 | in `check.txt` |
| 35 | `core/pipeline.ts` (`toChoices`) | the same file, group E-6 | in `check.txt` |
| 36 | `core/pictures.ts` (`BUILTIN`, `pictureFor`), `web/src/pictos.ts`, `PICTOGRAMS.md` | `npx vitest run tests/unit/day3.test.ts tests/unit/pipeline.test.ts` | in `check.txt`; word-only tiles on an on-device card: `ondevice/00-first-step-on-device.png` |
| 37 | `web/src/ai/firebaseEngine.ts`, `web/src/ai/remoteConfig.ts`, `firebase.json`; `devlog/SUBMISSION_NOTES.md` | `node scripts/e2e-cloud.mjs --url https://talk-partner.web.app/` | `devlog/evidence_live/`: the App Check and Remote Config hosts in the live log. Enforcement: nothing saved, because it is not switched on |
| 38 | `core/copy.ts` (`judge.step.none`, `judge.step.notDownloaded`), `web/src/main.ts` (`statusLine`) | `npx vitest run tests/unit/first-card.test.ts`; `node scripts/e2e-cloud.mjs` | in `check.txt`; `e2e-cloud.txt`: "no on-device model in this browser: the status line says so plainly" |
| 39 | `core/recorded.ts`, `web/src/main.ts` (`recordedBlock`) | `npx vitest run tests/unit/recorded.test.ts`; `node scripts/e2e-cloud.mjs`; `npm run e2e:noconfig`; `node scripts/e2e-ondevice.mjs --port 9335` | in `check.txt` (every value of the recording is in `devlog/evidence_r7/final/ondevice/RUN_LOG.md`); `e2e-cloud.txt`: the two "recording" lines; `cloud_shots/00-recording-of-the-on-device-step.png`; `ondevice/RUN_LOG.md`: no recording is offered where the model is |
| 40 | `core/needs.ts` (`needsCard`, `needLine`), `core/copy.ts` (`needs`), `web/src/main.ts` (`openNeeds`, the `needs` branches of `personView` and `afterAnswer`), `web/src/pictos.ts`, `web/src/styles.css` (`.tiles.needs`) | `npx vitest run tests/unit/needs.test.ts`; `npm run e2e:noconfig`; `node scripts/e2e-needs.mjs` (dev server running), and with `--url https://talk-partner.web.app/`; `node scripts/shots.mjs` | `devlog/evidence_r9/final/check.txt`; `e2e-noconfig.txt` there: "the network is off for the rest of this run" and the seven "offline:" lines after it (the network is switched off in the browser, a request to the app's own host fails, then the board, the check, the partner's line, "pain" to the body card, the way out; 17 cards and "0 bytes left this computer") and "no host contacted but the app itself"; `e2e-needs.txt`: the same on the dev server with "the page started no request for any of it"; on the hosted copy: `devlog/evidence_live/e2e-needs_live_2026-11-17_8810f8f.txt` (12/12); sizes at 390 and 1280 px: `shots.txt`, the "quick-needs board" lines (smallest target 84 px on the phone, 130 px on the desktop; one screen, no scrolling); pictures `shots/phone_27-needs-board.png`, `phone_28-needs-check.png`, `desktop_29-needs-partner-side.png`. Nothing saved shows a person using it: nobody has |
| 41 | `web/src/ai/firebaseEngine.ts` (`transcribe`, the `voice` model: `ONLY_IN_CLOUD`), `web/src/voice.ts` (`createVoice`, `wavBase64`, `hasSound`, `transcriptFrom`, `tidy`), `web/src/mic.ts` (`micDeps`), `core/copy.ts` (`voice`; `judge.receipt.number`), `web/src/main.ts` (`voiceButton`, `voiceNote`, `startVoice`, `onVoice`) | `npx vitest run tests/unit/voice.test.ts tests/unit/firebase-engine.test.ts tests/unit/no-direct-model-calls.test.ts`; `node scripts/shots.mjs`; `node scripts/e2e-needs.mjs`; against a deployed copy, one real model call: `python3 scripts/live-voice-feedback.py` | Live, with the real model: `devlog/evidence_live/voice-feedback_live_2026-11-17_40fedec/RESULT.md` (17/17; Chrome 157 with a fake microphone playing a recorded question: the field received "Do you want coffee or tea?", the app's console line `[ai-logic] leg=voice mode=ONLY_IN_CLOUD inferenceSource=in_cloud`, 171,580 bytes counted; pictures next to it). In a real page with Chrome's fake microphone and the request to Firebase AI Logic answered by the script: `devlog/evidence_r10/shots_2026-11-17_30db57a.txt`, the "voice input" lines (the notice before anything records; recording and stop; one request with a 16 kHz WAV as inline data, the transcribe instruction and the transcript schema; the words in the field and nothing submitted; the card's line says the recording went to Google's cloud; no connection; a blocked microphone; no button where the browser cannot record). The button and its notice on the hosted copy: `devlog/evidence_live/e2e-needs_live_2026-11-17_4d7edee.txt`. The engine's wiring (one call, `ONLY_IN_CLOUD`, default app, App Check): `tests/unit/firebase-engine.test.ts`; no Web Speech API anywhere in the client: `tests/unit/no-direct-model-calls.test.ts`, `tests/unit/voice.test.ts`. **Not in any run:** a human voice through a real microphone; the fake microphone plays a file |
| 43 | `core/rules.ts` (`placesFirst`, `isOutingWhere`), `core/pipeline.ts` (`cleanChoices`) | `npx vitest run tests/unit/sim-e2-classes.test.ts` (group E2-5) | not saved as a log; run the command |
| 44 | `core/rules.ts` (`ownSpecific`, `ownFirst`), `core/pipeline.ts` (`cleanChoices`; `ownAll` in `assemble`, for row 14) | the same file, groups E2-2 and E2-3 | not saved as a log; run the command |
| 45 | `web/src/simple.ts`, `web/src/simple.css`, `web/src/main.ts` (`simpleScreen`, `simpleView`, the `how` / `topic` / `inside` / `simple` actions), `core/copy.ts` (`simple`) | `npx vitest run tests/unit/simple-view.test.ts tests/unit/simple.test.ts`; `python3 scripts/e2e-simple.py`; `python3 scripts/shell-shots.py --out devlog/evidence_topics` | `devlog/evidence_topics/e2e-simple_localhost.txt` (227/227), the screens at 390 and 1440 px in `devlog/evidence_topics/`; the hosted copy: `devlog/evidence_live/` (the files with the deploy's commit in the name). The first version of this view (three ready questions) is in `devlog/evidence_shell/` |
| 46 | `core/simple.ts` (`madeWhere`, `privacyLines`, `aiLines`), `core/receipt.ts` (`badgeKind`) | `npx vitest run tests/unit/simple.test.ts` | not saved as a log; run the command. In a browser: `devlog/evidence_topics/e2e-simple_localhost.txt`, the lines "before handing over: the screen itself says where the choices were made" and "with every other host refused, cloud help fails" |
| 47 | `core/simple.ts` (`sheetWanted`), `web/src/simple.ts` (`consentSheet`), `core/copy.ts` (`consent.sheet`), `web/src/main.ts` (`sheet-yes`) | `npx vitest run tests/unit/simple.test.ts tests/unit/simple-view.test.ts tests/unit/recorded.test.ts`; `python3 scripts/e2e-simple.py` | `devlog/evidence_topics/e2e-simple_localhost.txt`, the lines from "an open question on a phone" to "Yes asks the question again"; a real cloud card after the yes, localhost: `devlog/evidence_shell/sheet-yes_cloud-card_localhost.txt` and the screenshot next to it |
| 48 | `core/copy.ts` (`deviceKindFrom`, `deviceWords`, `setCopyDevice`), `web/src/simple.css` | `npx vitest run tests/unit/simple.test.ts`; `node scripts/contrast-check.mjs`; `python3 scripts/overflow-check.py`; `python3 scripts/e2e-simple.py` | `devlog/evidence_topics/contrast.md` (78/78), `overflow_localhost.txt` (293/293), `e2e-simple_localhost.txt` |
| 49 | `core/topics.ts` (`TOPIC_BASE`, `topics`, `ownQuestions`, `awayNames`), `web/src/simple.ts` (`topicGrid`) | `npx vitest run tests/unit/topics.test.ts` | not saved as a log; run the command (41 questions × 3 families through the pipeline, an engine that refuses every call). In a browser: `devlog/evidence_topics/e2e-simple_localhost.txt`, the lines "a topic opens its questions in place" and "the family's own question is added under the generic one" |
| 50 | `web/src/simple.ts` (`personSimple`, `cardScreen`, `answeredScreen`), `core/topics.ts` (`followUps`, `nextInTopic`, `asksWho`), `web/src/main.ts` (`personScreen`, `give-back`, the hold and Enter on `#exit`) | `npx vitest run tests/unit/simple-view.test.ts tests/unit/topics.test.ts`; `python3 scripts/e2e-simple.py` | `devlog/evidence_topics/e2e-simple_localhost.txt`, the lines from "the person's screen takes the whole screen" to "after \"something else\": what to do now", and "Are you in pain? yes" to "with a keyboard, Enter on it goes back too"; the screens `phone_390_*person*.png` |
| 51 | `core/rules.ts` (`isEscapeLabel`, `heuristicTopic`, `frameTopic`, `validTopic`, `orHeadline`, `withSame`, `PAIN_LEVELS`), `core/pipeline.ts` (`noEscapeOnly`, `finish`, `cleanChoices`) | `npx vitest run tests/unit/card-defects.test.ts` | not saved as a log; run the command. The defects as found: `design/topics_2026-11-17/TOPICS.md` §8 |
| 52 | `web/public/manifest.webmanifest`, `web/public/icons/`, `web/sw.template.js`, `vite.config.ts` (`appShell`), `web/src/main.ts` (the registration), `core/simple.ts` (`needsInternet`, `aiPlace`) | `npx vitest run tests/unit/pwa.test.ts`; `npm run build && npx vite preview`, then `python3 scripts/pwa-check.py` | `devlog/evidence_topics/pwa-check_localhost.txt` (30/30); the hosted copy: `devlog/evidence_live/` (the file with the deploy's commit in the name) |
| 53 | `core/narrow.ts` (`narrowCard`, `narrowChoices`, `narrowAsk`, `NARROW_LEVELS`), `web/src/main.ts` (`runNarrow`, `narrowPlace`), `web/src/simple.ts` (the `narrow` button, the `ai-made` line) | `npx vitest run tests/unit/narrow.test.ts` | not saved as a log; run the command. In a browser, with online help off: `devlog/evidence_topics/e2e-simple_localhost.txt`, the lines "an AI can narrow it down" to "\"No\": no narrowing card". One run against the real cloud model, two levels, localhost: `devlog/evidence_topics/narrow_cloud-card_localhost.txt`. **No run on the device (Gemini Nano) was made** |
| 54 | `core/summary.ts` (`daySummary`, `rulesSummary`, `checkSummary`), `web/src/ai/firebaseEngine.ts` (`summarizeDevice`), `web/src/main.ts` (`refreshShort`), `web/src/simple.ts` (`shortBlock`) | `npx vitest run tests/unit/summary.test.ts` | not saved as a log; run the command. In a browser (the rules' summary): `devlog/evidence_topics/e2e-simple_localhost.txt`, the line "Today in short". **No run of the on-device step against Gemini Nano is saved: none was made** |
| 55 | `core/tree.ts` (`after`, `TREE`), `web/src/main.ts` (`treeStep`, `state.chain`), `web/src/simple.ts` (`#next-q`, `#do-now`) | `npx vitest run tests/unit/tree.test.ts` (prints the size of the walk); `python3 scripts/e2e-simple.py` | the walk is not saved as a log; run the command |
| 56 | `core/prefs.ts`, `web/src/main.ts` (`usualFor`, `usualOrder`), `web/src/simple.ts` (`#usual`, `learnedBlock`, `#shortcut`) | `npx vitest run tests/unit/prefs.test.ts`; `python3 scripts/e2e-simple.py` (the "learning" run) | not saved as a log; run the command |
| 57 | `tests/unit/prefs.test.ts` ("the privacy boundary") | `npx vitest run tests/unit/prefs.test.ts` | not saved as a log |
| 58 | `core/kinds.ts`, `core/narrow.ts` | `npx vitest run tests/unit/narrow-broader.test.ts tests/unit/narrow.test.ts` | `devlog/evidence_phase2/narrow_before_after.txt` (fixtures, before and after), `narrow_cloud_real_localhost.txt` (one run through the real cloud model) |
| 59 | `web/src/pictos.ts`, `PICTOGRAMS.md` | `npx vitest run tests/unit/pictures.test.ts tests/unit/day3.test.ts`; `python3 scripts/picture-sheet.py` | `devlog/evidence_pictures/pictures_390.png`, `pictures_390_large.png` |
| 60 | `core/photos.ts`, `web/src/photo.ts`, `web/src/store.ts`, `web/src/simple.ts` (`photosBlock`, `photoSheet`) | `npx vitest run tests/unit/photos.test.ts`; `python3 scripts/e2e-simple.py` (the "photos" run, and the offline run) | `devlog/evidence_phase2/` (the screens with a photo) |
| 61 | `web/src/main.ts` (`backStep`, `keepGuard`, `pushGuard`), `web/src/simple.ts` (`navBar`) | `python3 scripts/e2e-simple.py` (the "navigation" checks) | not saved as a log |
| 62 | `web/sw.template.js`, `web/src/main.ts` (the service worker block), `firebase.json` | `npm run build && python3 scripts/update-check.py` | `devlog/evidence_phase2/update-check.txt` |
| 63 | `core/reliability.ts`, `web/src/main.ts` (`guardNow`, `guardOrder`, the confirmed-answer branch of `onPersonTap`), `web/src/diary.ts` (`guardBlock`) | `npx vitest run tests/unit/reliability.test.ts tests/unit/frank-week.test.ts`; `python3 scripts/e2e-simple.py` (the diary run) | `devlog/evidence_phase3/04_guard_after_the_fifth_yes.png`, `05_…`, `06_…`, `25_pain_yes_while_the_check_is_on_no_guard_line.png`, `e2e-simple_localhost.txt` |
| 64 | `core/diary.ts`, `web/src/diary.ts` (`diaryScreen`), `web/src/store.ts` | `npx vitest run tests/unit/diary.test.ts tests/unit/diary-view.test.ts`; `python3 scripts/e2e-simple.py` | `devlog/evidence_phase3/02_…`, `03_…`, `07_…`, `09_diary_week.png`, `11_…` |
| 65 | `core/insights.ts` (`HealthNotes`, `cleanHealth`), `web/src/simple.ts` (the health row of `aboutSimple`) | `npx vitest run tests/unit/privacy-phase3.test.ts tests/unit/diary-view.test.ts` | `devlog/evidence_phase3/08_health_notes.png` |
| 66 | `core/insights.ts` (`insights`, `thresholds`), `tests/fixtures/frank-week.json` | `npx vitest run tests/unit/insights.test.ts tests/unit/frank-week.test.ts`; `python3 scripts/e2e-simple.py` | `devlog/evidence_phase3/10_week_what_stands_out.png`, `12_…`, `14_week_with_a_fluid_limit_noted.png` |
| 67 | `core/copy.ts` (`simple.insights`), `core/reword.ts` (`checkReworded`) | `npx vitest run tests/unit/insights.test.ts tests/unit/reword.test.ts tests/unit/diary-view.test.ts` | the same screens |
| 68 | `core/reword.ts`, `core/insights.ts` (`insightCloudText`, `cloudLines`, `insightDevicePrompt`), `web/src/ai/firebaseEngine.ts` (`rewordDevice`, `rewordCloud`), `web/src/main.ts` (`insightsModel`, `sendInsights`), `web/src/diary.ts` (`insightSheet`) | `npx vitest run tests/unit/privacy-phase3.test.ts tests/unit/reword.test.ts`; `python3 scripts/e2e-simple.py` | `devlog/evidence_phase3/13_sheet_exact_text_before_online_help.png`; no run against a real model |
| 69 | `core/tip.ts`, `web/src/diary.ts` (`tipBlock`) | `npx vitest run tests/unit/tip.test.ts`; `python3 scripts/e2e-simple.py` | `devlog/evidence_phase3/07_diary_today_less_sure_and_tip.png` |
| 70 | `core/backup.ts`, `web/src/diary.ts` (`backupBlock`, `importSheet`) | `npx vitest run tests/unit/backup.test.ts`; `python3 scripts/e2e-simple.py` | `devlog/evidence_phase3/15_keep_a_copy.png`, `16_file_preview_before_it_replaces.png` |
| 71 | `web/src/simple.css` (the last block) | `python3 scripts/e2e-simple.py`; `python3 scripts/overflow-check.py` | `devlog/evidence_phase3/17_person_three_choices_no_scrolling.png`, `18_…`, `19_…`, `overflow_localhost.txt` |
| 72 | `package.json`, `web/src/ai/firebaseEngine.ts` | `npx vitest run tests/unit/privacy-phase3.test.ts tests/unit/no-direct-model-calls.test.ts tests/unit/judge-path.test.ts` | not saved as a log |
| 73 | `core/copy.ts` | `npx vitest run tests/unit/simple.test.ts`; `python3 scripts/e2e-simple.py` | <https://aistudio.google.com/docs/terms> (read 18 Nov 2026); the tier itself: the owner's statement, no log |
| 74 | `web/src/simple.ts` (`consentSheet`), `web/src/main.ts` | `npx vitest run tests/unit/simple-view.test.ts`; `python3 scripts/e2e-simple.py` | `devlog/evidence_phase3/22_narrowing_sheet_plain_words.png` |
| 75 | `web/src/simple.ts` (`answeredScreen`), `core/topics.ts` | `npx vitest run tests/unit/simple-view.test.ts tests/unit/topics.test.ts`; `python3 scripts/e2e-simple.py` | `devlog/evidence_phase3/23_after_something_else_three_actions.png` |
| 76 | `core/tree.ts` (`who`, `shaped`) | `npx vitest run tests/unit/tree.test.ts`; `python3 scripts/e2e-simple.py` | `devlog/evidence_phase3/24_who_would_you_like_to_call.png` |
| 77 | `core/letter.ts`, `web/src/phase4.ts` (`letterGrid`), `web/src/main.ts` (`runLetter`) | `npx vitest run tests/unit/letter.test.ts`; `python3 scripts/e2e-simple.py` | `devlog/evidence_phase4/03_person_alphabet_390x844.png`, `04_person_words_with_B_beth_bo_biscuits.png`, `05_carer_the_word_is_bo.png` |
| 78 | `web/src/simple.css` (`.abc`) | `python3 scripts/e2e-simple.py`; `python3 scripts/overflow-check.py` | `devlog/evidence_phase4/03_person_alphabet_390x844.png` |
| 79 | `core/letter.ts` (`letterCloudText`, `letterCard`), `web/src/phase4.ts` (`letterSheet`) | `npx vitest run tests/unit/letter.test.ts tests/unit/privacy-phase4.test.ts`; `python3 scripts/e2e-phase4-ai.py --port 9335 --cloud` | `devlog/evidence_phase4/06_letter_X_sheet_before_online_help.png`, `AI_RUN_LOG.md`, `ai_03_letter_H_words_on_device.png`, `ai_04_letter_K_sheet.png`, `ai_05_letter_K_words_from_online_help.png` |
| 80 | `core/letter.ts` (`letterChoices`, `letterEnd`) | `npx vitest run tests/unit/letter.test.ts` | `devlog/evidence_phase4/AI_RUN_LOG.md` (the "X" line) |
| 81 | `core/turn.ts`, `web/src/main.ts` (`p4Confirm`, `turnHtml`) | `npx vitest run tests/unit/turn.test.ts`; `python3 scripts/e2e-simple.py` | `devlog/evidence_phase4/01_home_frank_wants_to_say_something.png`, `08_person_starts_three_starters.png`, `09_person_topics_picture_menu.png`, `10_carer_frank_started_this.png` |
| 82 | `core/visit.ts` | `npx vitest run tests/unit/visit.test.ts` | `devlog/evidence_phase4/11_visit_intro.png`, `12_visit_person_are_you_in_pain.png`, `13_visit_person_what_worries_you_most.png` |
| 83 | `web/src/phase4.ts` (`visitScreen`), `web/src/main.ts` (`p4Confirm`, `visitNext`) | `npx vitest run tests/unit/visit.test.ts`; `python3 scripts/e2e-simple.py` | `devlog/evidence_phase4/14_visit_page_franks_own_answers.png` |
| 84 | `core/phototalk.ts`, `web/src/phase4.ts` (`photoTalkScreen`) | `npx vitest run tests/unit/phototalk.test.ts`; `python3 scripts/e2e-simple.py` | `devlog/evidence_phase4/15_phototalk_pick_a_photo.png`, `16_phototalk_questions_rules_on_a_phone.png`, `17_person_photo_over_the_question.png` |
| 85 | `web/src/ai/firebaseEngine.ts` (`lookDevice`), `core/phototalk.ts` (`checkedThings`, `thingsQuestion`) | `npx vitest run tests/unit/phototalk.test.ts`; `python3 scripts/e2e-phase4-ai.py --port 9335` | `devlog/DAY15.md` (the spike), `devlog/evidence_phase4/AI_RUN_LOG.md`, `ai_01_on_device_model_looked_at_the_photo.png`, `ai_02_person_what_in_this_photo.png` |

The badge "Made in code (AI answer not used)" (row 2): `core/receipt.ts` (`badgeKind`, `modelAsked`), `tests/unit/sim-e-classes.test.ts`, group E-10.

Also in that folder: `build.txt` (production build, the check that no debug token is bundled, exit 0), `audit.txt`
(`npm audit --omit=dev`: 4 high advisories, all in the gRPC package under `@firebase/firestore`, which the app does not
import; exit 1 is the audit's own), `fonts-check.txt` (no request leaves the app's host; fonts are self-hosted).

**What reproduces where.** Rows 1–4, 8–12, 14 (unit part), 16 (rules pass) and 17 run on any machine from a clone.
Rows 6, 13 and 14 (live part) need a Firebase project's web config in `.env.local`. Rows 5, 7 and the on-device pass
of 16 need desktop Chrome with Gemini Nano. For those we can only show our saved runs.

**The hosted copy**: which build it serves now, and the runs against it, are in README "Deploy" and `devlog/evidence_live/` (kept current). What follows is the record of 17 Nov: it served the build of `2c5673e` from 17 Nov 2026, 20:55 UTC (every served file has the SHA-256 of
the local build; deploy log `devlog/evidence_live/deploy_2026-11-17_2c5673e.txt`; `check` and `build` at that commit:
`devlog/evidence_r11/`). Runs against it, in `devlog/evidence_live/`: `e2e-needs_live_2026-11-17_2c5673e.txt` (12/12);
`live_browsers_2026-11-17_2c5673e.txt` (Chromium 148 and Chrome 157: judge mode, three code-decided cards, the
quick-needs board, no page error); `e2e-cloud_live_2026-11-17_2c5673e_run1.txt` (18/27) and `_run2.txt` (14/27, 20
minutes later): **the cloud step made no card**, because reCAPTCHA Enterprise refused the App Check attestation from
our machine; `appcheck_probe_2026-11-17_2c5673e.md` has what was measured. Between 20:41 and 20:55 UTC it served the
build of `bbcb075` (`e2e-cloud_live_2026-11-17_bbcb075.txt`, 19/27, the same refusal).

**Before that, the build of `4d7edee`**, from 17 Nov 2026, 19:05 UTC (the served bundle is the one a local
build of `4d7edee` gives; the app code is that of `30db57a`). Runs against it, in `devlog/evidence_live/`:
`e2e-cloud_live_2026-11-17_4d7edee.txt` (28/28) and `e2e-needs_live_2026-11-17_4d7edee.txt` (12/12), both right
after the deploy. Between 13:53 and 19:05 UTC it served first the build of `8810f8f`, then, by 16:49 UTC,
that of `40fedec` (voice input through Firebase AI Logic and the feedback form:
`voice-feedback_live_2026-11-17_40fedec/RESULT.md`).

**Before that, the build of `8810f8f`**, from 17 Nov 2026, about 13:53 UTC (every served file was compared
with the local build by its SHA-256; deploy log `devlog/evidence_live/deploy_2026-11-17_8810f8f.txt`, which is of the
second deploy, at `20d2b19`: the same files and the `no-cache` header for `/`). Runs against that build, in
`devlog/evidence_live/`:
- `e2e-needs_live_2026-11-17_8810f8f.txt`: `node scripts/e2e-needs.mjs --url https://talk-partner.web.app/`, 12/12:
  the microphone button and its notice; then, with the network switched off in the browser, the quick-needs board
  from the first tap to the partner's line, with no request started by the page (pictures in
  `needs_live_2026-11-17_8810f8f/`).
- `e2e-cloud_live_2026-11-17_8810f8f.txt`: `node scripts/e2e-cloud.mjs --url https://talk-partner.web.app/`, 28/28.
- By hand, not by a kept script, in the Chrome that has Gemini Nano (157, headless, port 9335): the page loaded the
  new bundle, the microphone button and "Quick needs" were there, the first step ran by itself (`[ai-logic]
  leg=private mode=ONLY_ON_DEVICE inferenceSource=on_device`, lake / church, "nothing left this computer"), the board
  opened and checked a tap with the network off, and the only host contacted was the site's own. The full on-device
  script was not run against the hosted copy at this build.

Before that it served the build of `deebc94` (the served bundle was compared byte for byte with
the local build). Two runs against that build, both in `devlog/evidence_live/`:
- `e2e-cloud_live_2026-11-17_deebc94.txt`: `node scripts/e2e-cloud.mjs --url https://talk-partner.web.app/`, 28/28: the
  cloud step through App Check (reCAPTCHA Enterprise), Remote Config, and the recording of the on-device step in a
  browser without the model.
- `e2e-ondevice_live_2026-11-17_deebc94.txt` and `ondevice_live_2026-11-17_deebc94/RUN_LOG.md` (with three of its
  screenshots): `node scripts/e2e-ondevice.mjs --port 9335 --url https://talk-partner.web.app/`, 43/43, in the Chrome
  that has Gemini Nano. It is the first run of the on-device step on the hosted copy: the first step by itself,
  `inferenceSource=on_device`, lake / church from About me, no host contacted but the site's own for any on-device
  card. Its log names the commit of the checkout it was run from (`89fb06a`, one script label after `deebc94`).

The logs of the earlier deploys, at `8ace9f0`, `0afbf77`, `24793c1` and `c37e4c4`, are next to them.

**Earlier records, kept as they were:** `devlog/evidence_r7/final/` (every log at `8ace9f0`, before the changes that followed the fourth review; the recording shown in judge mode is copied from its on-device log), `devlog/evidence_r6/final/` (every log at `0afbf77`, before the changes that followed set E), `devlog/evidence_r5/final/` (every log at `24793c1`, before the changes that followed set D), `devlog/evidence_r4/final/` (every log at `5cb9c5e`, before the changes of day 10), `devlog/evidence_r3/final/` (every log at `43c5265`, before the changes of day 9), `devlog/ondevice_proof_1/` (the first on-device run),
`devlog/evidence_r2/` (runs at `83a7da5` and, under `at_head_2/`, at `161c491`; the on-device log there and the first
held-out run record uncommitted changes in the tree, so we do not call them clean),
`devlog/evidence_r3/cold_start_at_67fb3e2/RUN_LOG.md` (an on-device run right after a browser start: 21.7 s to
"Ready"; the log only, its screenshots were not kept), `devlog/DAY1.md`–`DAY12.md`.

## Phase 5 (18 Nov 2026, after judge round 6): rows 86 to 97
| Row | File | Command | Saved output |
|---|---|---|---|
| 86 | `core/copy4.ts`, `tests/unit/phase5-grammar.test.ts` | `npx vitest run tests/unit/phase5-grammar.test.ts` | `devlog/evidence_phase5/01_first_screen_they_can_start_and_something_new_or_sudden.png` |
| 87, 88 | `core/redflag.ts`, `web/src/phase5.ts`, `tests/unit/phase5-safety.test.ts` | `python3 scripts/e2e-simple.py --only phase5 --shots devlog/evidence_phase5` (a production build on localhost) | `02_something_new_or_sudden_fast_and_call.png`, `03_head_pain_call_box_over_the_answer.png`, `08_needs_board_with_somethings_wrong.png`, `11_visit_page_call_box_and_since_the_last_visit.png`; `e2e-simple_localhost_d198eb0.txt`, `e2e-simple_phase5_localhost_de631b1.txt` |
| 89 to 92 | `core/reliability.ts`, `core/insights.ts`, `core/reword.ts`, `core/diary.ts` | `npm run check` (2609 tests) | `09_diary_fall_logged_when_to_call.png`, `10_what_stands_out_one_day_of_head_pain_and_a_fall.png` |
| 93 | `core/speak.ts`, `web/src/ai/firebaseEngine.ts` (`speak`) | `python3 scripts/e2e-speak.py` (the dev server; the real model) | `AI_RUN_LOG.md`, `ai_01_read_aloud_sheet.png`, `ai_02_person_screen_hear_it_again.png`; `04_…`, `05_…`, `06_…` (the switch, the sheet, the person's screen in the run where every other host is refused) |
| 94, 95 | `core/copy.ts`, `web/src/simple.ts` | the phase 5 browser run | `07_consent_sheet_just_this_once.png` |
| 96 | `core/since.ts` | the phase 5 browser run | `11_visit_page_call_box_and_since_the_last_visit.png` |
| 97 | `tests/fixtures/photo-beth.jpg`, `photo-bo.jpg`, `photo-lake.jpg` | `python3 scripts/phase4-shots.py --out devlog/evidence_phase5/reshoot_phase4` | `reshoot_phase4/04_person_words_with_B_beth_bo_biscuits.png`, `15_phototalk_pick_a_photo.png`, `16_…`, `17_person_photo_over_the_question.png` |

Not run for phase 5: any of it with a carer, a person with aphasia or a clinician; the `tel:` link on a real phone; the wording steps against a real model.

## Phase 6 (18 Nov 2026): rows 98 to 103
No model is part of phase 6, so there is no AI run to save: the proof is the unit tests and one browser run in which
every request to another host is refused and counted (none was made).

| Row | File | Command | Saved output |
|---|---|---|---|
| 98, 99 | `core/insights.ts` (`Insight.source`), `core/diary.ts` (`eventGroups`), `core/since.ts`, `web/src/phase6.ts` (`sourceBlock`), `tests/unit/phase6-source.test.ts` | `npx vitest run tests/unit/phase6-source.test.ts`; `python3 scripts/e2e-simple.py --only phase6 --shots devlog/evidence_phase6` (a production build on localhost) | `devlog/evidence_phase6/01_what_stands_out_a_line_opened_to_its_entries.png`, `01b_what_stands_out_three_lines_opened_full_page.png`, `07_visit_page_since_the_last_visit_a_line_opened.png`, `07b_visit_page_full.png`, `08_visit_page_print_preview.png` (the page under print media) |
| 100, 101 | `core/share.ts` (`familyText`, `handoverText`, `handoverUsual`), `tests/unit/phase6-share.test.ts` | `npx vitest run tests/unit/phase6-share.test.ts`; the phase 6 browser run | `02_share_sheet_health_notes_off.png`, `06_handover_note_for_the_next_carer.png`, `06b_handover_note_usual_choices.png` |
| 102 | `web/src/phase6.ts` (`shareSheet`), `web/src/main.ts` (`share-open`, `share-go`, `share-copy`) | the phase 6 browser run (`navigator.share` replaced by a stub that records what it is handed; the clipboard read back) | `03_share_sheet_health_notes_on.png`, `04_share_sheet_copied.png`, `05_share_sheet_after_share.png`, `09_no_web_share_only_copy.png`; `e2e-phase6_local.txt` |
| 103 | `core/copy.ts`, `core/copy6.ts` | `npx vitest run tests/unit/phase6-share.test.ts tests/unit/diary-view.test.ts`; `scripts/e2e-simple.py` (the diary run reads the line on the screen) | `e2e-simple_local.txt` |

| 104 | `web/src/main.ts` (`trackScreen`, `backStep`) | `python3 scripts/e2e-simple.py --only back --shots devlog/evidence_phase6` | `r1_01_the_second_question_on_the_carers_screen.png`, `r1_02_one_tap_on_back_the_answer_before_not_the_first_screen.png`; `e2e-back_local.txt` |
| 105 to 107 | `core/more.ts`, `web/src/phase7.ts`, `tests/unit/out-ways.test.ts` | `npx vitest run tests/unit/out-ways.test.ts`; `python3 scripts/e2e-simple.py --only ways --shots devlog/evidence_phase6` | `r2_01_after_something_else_one_step_at_a_time.png` to `r2_08_body_show_me_where_and_the_needs_board.png`; `e2e-ways_local.txt` |

Not run for phase 6: any of it with a carer, a family member, a paid carer or a clinician; Share on a real phone (the
phone's own share sheet was never opened by us); the print on paper.

## Phase 7 (18 Nov 2026): rows 108 to 113
No model is part of phase 7, so there is no AI run to save: the proof is the unit tests and one browser run in which
every request to another host is refused and counted (none was made). All of it on a production build on localhost
(`npx vite preview`, port 5197). The phase went out with the build of `45e8095` (18 Nov, about 16:52 UTC); no run of
ours was made against the hosted copy (README "Deploy").

| Row | File | Command | Saved output |
|---|---|---|---|
| 108 to 110 | `core/practice.ts`, `core/copy8.ts`, `web/src/care7.ts` (`practiceScreen`), `web/src/main.ts` (`notePractice`, `practiceInput`), `tests/unit/phase7-practice.test.ts` | `npx vitest run tests/unit/phase7-practice.test.ts`; `python3 scripts/e2e-simple.py --url http://localhost:5197/ --only phase7 --shots devlog/evidence_phase7` | `01_for_the_speech_therapist_counts_of_real_conversations.png` to `06_for_the_speech_therapist_nothing_counted.png`; `e2e-phase7_local.txt` |
| 111, 112 | `core/passport.ts`, `core/copy8.ts`, `web/src/care7.ts` (`passportScreen`), `tests/unit/phase7-passport.test.ts` | `npx vitest run tests/unit/phase7-passport.test.ts`; the phase 7 browser run | `07_passport_every_line_with_its_box.png` to `10_passport_as_it_prints.png`, `10b_passport_as_it_prints.pdf` (A4, 12 mm margins, one sheet), `12_passport_with_nothing_in_about_them.png` |
| 113 | `web/src/main.ts` (`share-page`, `page-print`, `screenKey`), `web/src/phase6.ts` (`shareSheet`, `page`) | the phase 7 browser run (`navigator.share` replaced by a stub that records what it is handed; the clipboard read back; `window.print` counted; Back by the button and by the browser's back) | `04_for_the_speech_therapist_sheet_with_the_exact_text.png`, `05_for_the_speech_therapist_as_it_prints.png`, `11_passport_sheet_with_the_exact_text.png`; `overflow-check_local.txt` (the two pages and their sheet at 320, 360, 390 and 412 px) |

Not run for phase 7: any of it with a carer, a speech therapist, a nurse or a paid carer; Share on a real phone; a
print on paper; any run of ours against the hosted copy.

## Phase 8 (18 Nov 2026): rows 114 to 124
The fixes of judge round 7. All of it on a production build on localhost (`npx vite preview`, port 5241), except the
two runs with a real model, which name their server. Nothing of phase 8 was deployed by us. Saved outputs are in
`devlog/evidence_phase8/` (`local/` for the full runs, `cloud/` for the cloud step, `ai_phase4/` for the on-device
photo and letter run).

| Row | File | Command | Saved output |
|---|---|---|---|
| 114 | `core/since.ts`, `core/diary.ts`, `tests/unit/phase8.test.ts` | `npx vitest run tests/unit/phase8.test.ts`; `python3 scripts/phase8-shots.py --url http://localhost:5241/` | `03_visit_page_low_and_pain_counted_with_the_helpline_line.png` |
| 115 | `web/src/main.ts` (`screenKey`, `trackScreen`, `backStep`, `backToCarer`) | `python3 scripts/e2e-simple.py --url http://localhost:5241/ --only back` (also part of the full run) | `local/e2e-simple_local.txt` (the "back," lines) |
| 116 to 118 | `core/passport.ts`, `core/practice.ts`, `core/prefs.ts`, `core/share.ts`, `core/copy8.ts`, `web/src/care7.ts` | `npx vitest run tests/unit/phase7-passport.test.ts tests/unit/phase8.test.ts`; `scripts/phase8-shots.py`; the phase 7 part of `e2e-simple.py` | `04_*`, `05_*`, `06_*`; `local/e2e-simple_local.txt` |
| 119, 120 | `tests/unit/docs-truth.test.ts`, `core/copy.ts`, `web/src/main.ts` | `npx vitest run tests/unit/docs-truth.test.ts` | `local/check_local.txt` |
| 121 | `core/copy.ts`, `core/copy5.ts`, `core/later.ts`, `web/src/simple.ts` | `scripts/phase8-shots.py` (the fold measured at 360 x 740 and 390 x 844) | `01_*`, `02_*` |
| 122 | `core/simple.ts` (`routeChip`), `web/src/simple.ts` (`chipBlock`), `web/src/phase5.ts` | `python3 scripts/phase8-shots.py --url http://localhost:5241/ --cloud-url http://localhost:5243/` (the dev server with the App Check debug token: the typed question goes to Google) | `09_routing_chip_made_online_after_your_yes.png` |
| 123 | `core/insights.ts`, `core/copy5.ts`, `core/since.ts`, `core/tree.ts`, `core/reliability.ts`, `core/turn.ts` | `npx vitest run tests/unit/phase8.test.ts`; `scripts/phase8-shots.py` | `07_*`, `08_*` |
| 124 | `tests/fixtures/photo-beth.jpg`, `photo-frank.jpg`, `core/prompt.ts`, `core/letter.ts` | `python3 scripts/e2e-phase4-ai.py --url http://localhost:5243/ --port 9335 --cloud --out devlog/evidence_phase8/ai_phase4` (Chrome 157 with Gemini Nano on port 9335; the dev server) | `ai_phase4/AI_RUN_LOG.md` (13 of 15: the two FAILs are the K card with no word kept, and the "X" check, which still expects online help to stay on after "Just this once"), `ai_phase4/ai_01_*` to `ai_05_*` |

The cloud step at this code, `node scripts/e2e-cloud.mjs`, five fresh profiles each: against the preview
(`cloud/e2e-cloud_preview_run1.txt` to `run5.txt`), 19 of 27 in each (App Check: "ReCAPTCHA error", no token, no
card); against the dev server with the debug token (`cloud/e2e-cloud_devserver_debugtoken_run1.txt` to `run5.txt`),
28 of 28 in each. No log holds the token or the API key (checked with `grep -F` against `.env.local`).

Not run for phase 8: any of it with a carer, a speech therapist, a nurse or a person with aphasia; a real phone; the
hosted copy; `e2e-speak.py` (Read aloud against the real model); `update-check.py`; `e2e-noconfig.mjs`.
