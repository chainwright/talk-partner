# Day 7: Mon 16 Nov 2026 (CST)

Scope: the P0 list of our second internal review of the build (commit `bc19ebb`). The review's verdict was no-go: the
on-device half of a hybrid entry had never run, a bare clone made no card at all, and eleven lines in the repo and on
screen were false. Today: fix those, prove the on-device step with a recorded run, and correct every false line. No
video, no deploy, no console changes.

## 1. A bare clone makes cards (commit `d06a0ca`)
- **Was:** with no `.env.local` the partner screen's `make()` returned at once, so "Do you want coffee or tea?" made no
  card and the status read "not set up yet". The README said `npm install && npm run dev`, no account.
- **Now:** the app picks a rules-only engine when the settings are missing (`core/engine.ts` `NullEngine`,
  `web/src/ai/pick.ts`). Every card code decides alone works; an open question gets "No card" with the reason.
- **Checked:** `tests/unit/no-config.test.ts` (the app path with the settings forced empty, every judge chip);
  `npm run e2e:noconfig`: 10/10 in a real browser, and no host contacted but the app's own.

## 2. The on-device step, run for real (commits `1092be7`, tag `ondevice-proof-1`; `dd3e3ae`)
- **What we used:** a separate headless Chrome 157 with its own profile folder, started only for this, holding the
  Gemini Nano files (version folder `2025.8.8.1141`, 4.0 GB) left on this Mac by the 9–10 Nov prototype. The app's own
  "Download" button registered the model in about five seconds; nothing was downloaded again.
- **First run, before any change:** it worked at once through `ONLY_ON_DEVICE` (schema and system prompt accepted),
  "Who should we call tonight?" gave Jenny / Tyler. Three things were wrong, and each is fixed:
  1. The first on-device card made three requests to Google hosts: starting the engine started App Check, which loads
     reCAPTCHA. No family data in them, but "nothing left this computer" should mean no request at all. The private
     step now has its own Firebase app with no App Check. Measured after: 0 requests outside the app's host.
  2. "Coffee or tea" waited 3 s (25 s on the first question after a browser start) for a model whose answer was
     thrown away. Cards code decides alone now run no model. A longer either-or still asks the model to copy the
     options, because there it reads better than the parser ("Antiques Roadshow" against "roadshow on").
  3. With cloud help on, a good card of real names was sent on to the cloud "to check" whenever the rules had dropped
     one invented choice, and the cloud's general card replaced it. A card whose every answer is an About-me entry now
     stays here.
- **The recorded run** (`devlog/ondevice_proof_1/RUN_LOG.md`, 33/33 checks, clean tree at the tag): four open
  questions with cloud help off, each `inferenceSource=on_device`, each with About-me choices, each with 0 outside
  requests; cloud help on: the names card stays, "which shirt" runs both steps (`on_device`, then `in_cloud`); network
  off: `PREFER_IN_CLOUD` falls back, `inferenceSource=on_device`; and the same questions in a Chrome without the model:
  family / friend, meat / fish, and "Jenny" leaving as "Person A".
- **Times in that run:** 15.8 s from page load to "Ready" in a freshly started browser (the warm-up), then 2.9–3.5 s
  per on-device answer (10 answers); cloud answers 1.9–3.3 s (3 answers).
- **Honest limits:** one machine, one made-up family, one answer per question. The model's choices vary between runs
  (the third choice was "Dr Smith", "hospital" or "doctor" on three runs; code dropped it each time). This shows the
  path, not card quality. The timed trial is still not run.

## 3. Truth pass (this commit)
Every line our review marked false, and what it says now:

| Where | Was | Now |
|---|---|---|
| welcome screen | "Everything runs on this computer." | "Your About me lists and photos stay on this computer." |
| README judge table, Jen or Tyler | "What was sent shows Person A / Person B" | the either-or is read in code and nothing is sent; where the swap can be seen is named |
| README run line | `npm install && npm run dev`, no account (a clone made no cards) | true now, with a table of what each kind of copy can do |
| README, devlog DAY1–6, submission notes | no on-device run "for lack of disk" | run on 16 Nov; a dated correction heads each day page (the disk claim was not re-checked between 11 and 16 Nov) |
| submission notes | "Every AI aphasia app helps the person answer." | "The AI aphasia tools we found mostly draft words for the person…", with the counter-examples named |
| why line | "Decided by: the model proposed" on a card no model answered | "no card: no model answered this open question, and the rules alone cannot make its choices" |
| session line | "0 failed" next to a failed cloud step | failures count on every card; the line also counts "no card" |
| notes and trace | "device card kept" / "the card from this computer was good enough" with no device card | "kept" only when a card made on this computer is on screen; a rules card says "made by rules alone" |
| badge line | "nothing left this computer" after a request that was sent and failed | "cloud help was asked and failed: the question may have left this computer"; the receipt lists it apart, with its size |
| DAY5 | "Nobody in the field corrects the partner." | corrected in place: AACessTalk does, for parents |
| `firebaseEngine.ts` comment | `ONLY_ON_DEVICE` "throws" while the model downloads | throws when unavailable, waits while it downloads |

Also: the disclosure now names the prototype's unrun `firebaseEngine.ts` (`DISCLOSURE.md`, correction of 16 Nov);
the copy no longer promises "About 20 seconds" or a trial date; the "50 questions" on the How screen is 10, as the
protocol says; the terms link points at the page it redirected to; the project owner's name and the names of internal
documents are out of the repository (comments that cite "build spec §" refer to an internal specification).

Pinned by `tests/unit/truth.test.ts`, `tests/unit/day3.test.ts` and `tests/unit/personal-card.test.ts`.

## 4. Cheap should-fix items (commit after the truth pass)
- **The cross on the white card:** the card now has its own `--no` (#b3261e, 6.5:1 on white); it inherited the desk's
  #ff8a80, 2.3:1. Pinned by a contrast test computed from `styles.css`.
- **The wait:** while a card is being made the partner sees "Making the card… A few seconds. Nothing is on their
  screen yet." and the ear on the person's side breathes slowly (still under reduced motion). Checked in the live app
  during an on-device answer.
- **The first screen:** one line before anything else: who it is for and why.
- **`scripts/e2e-cloud.mjs`:** moved to the current screens (judge chips, the consent screen, the `#sent` panel) and
  now also checks the SDK's `inferenceSource=in_cloud` line and the "1 name swapped out" tail. 12/12; output in
  `devlog/evidence_r2/`. The "9/9 on day 1" in `DAY1.md` has no saved output; these files are the record now.
- `scripts/shots.mjs`: 63/63 layout checks on the changed screens; screenshots in `devlog/shots_r2fix/`.

## Still not true or not done
- No hosted URL, no production App Check provider, no public repository, no video.
- No measured result: the trial protocol has not been run.
- The stakes line at the top of the README has no source yet.
- Cloud cards for "who" questions are general (the cloud has no About me); with the device model they are personal.
