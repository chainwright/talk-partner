# Day 8 (16 Nov 2026, evening): the third review's list

A third outside review read the build at `510f84a` and re-ran every script. Its verdict: still not submittable
(no public repository, no video, no hosted URL), and the entry's own headline number said the model adds nothing.
This page is what was done about it the same evening, one commit per item, each made only with `npm run check` and
`npm run build` at exit 0. Times in the log headers are UTC, so they read 17 Nov.

## 1. The main number, restated (`8ca45b5`, `e178c54`, `43c5265`)
The README said "55 of 60 with the on-device model, 54 of 60 with rules alone". The review re-ran it and got 54 and
54. Both halves were poor measures:
- The 54 for rules alone counted 18 open questions as correct because no card was made. Rules alone gave the partner
  a card to show on 36 of 60.
- The 55 was one run on a tree with uncommitted changes, and the scorer compared whole strings: "Packers game" failed
  against the About-me entry "Packers games".

What we say now, everywhere (README first section, the How screen, `CLAIMS.md` row 16, the held-out notes, the
submission notes): **on the 18 open questions, rules alone make no card (0 of 18); the on-device model made a card
matching our label for 15 or 16, and 12 or 13 of those offer the family's own people, places or foods.** Five runs of
the real app on a clean tree this evening: 16, 16, 16 (at `8ca45b5`), 15 (at `8251484`) and 16 (at `43c5265`). The
README and the screen quote the first four; the fifth was made after their text was final and is in `EVIDENCE.md`.

Changes behind it:
- The scorer matches list entries without article and plural endings. It reports the open questions first, with the
  same table for rules alone and for the model, and no longer gives one total in which "no card" counts as correct.
- Two labels were too kind (foods offered for "where do you want to eat", a TV show or a team offered as music). The
  sealed set is untouched; `eval/heldout_r2_amendments.json` forbids those answers and the report gives the count with
  and without the amendments. Both questions are now misses in every run.
- A run with no `--out` goes to a new ignored folder, so a saved run cannot be overwritten again.

Not done on purpose: no card rule was changed to make these two cards right. That would turn the set into a tuning set.

## 2. The judge path opens on the model, not on a rule (`a65260c`)
"Who should we call tonight?" reads *Jenny / Tyler* with or without the on-device model, because with cloud help only
code puts the names in. As the first click it showed a rule. The chips, `JUDGES.md` and the README table now start
with "this weekend?" and "for dinner?": *lake / church* and *pot roast / chili* on this computer, *stay home / go out*
and *meat / fish* from the cloud alone. `scripts/e2e-ondevice.mjs` asks both questions both ways and checks that the
cards differ (36 checks, was 33). The "which shirt?" chip is gone: its card ("this one / that one") showed nothing a
judge could read. The question is still used, typed, for the offline fall-back.

## 3. Evidence, run again on a clean tree (`devlog/evidence_r3/final/`)
`EVIDENCE.md` said the earlier runs were made "on a clean tree"; two of their own headers said otherwise. Every saved
log was made again at `43c5265`, the last commit that changes code or on-screen text. The scripts wrote into an
ignored folder so the tree stayed clean during the runs, and each log's header records the tree state when its
command started.

| Run | Result at `43c5265` |
|---|---|
| `npm run check` | 923 tests, exit 0 |
| `npm run build` | exit 0, no debug token in `dist` |
| `npm run e2e:noconfig` | 10/10 |
| `node scripts/e2e-cloud.mjs` | 15/15 |
| `node scripts/e2e-ondevice.mjs --port 9335` | 36/36 |
| `node scripts/shots.mjs` | 67/67 |
| `node scripts/fonts-check.mjs` | 6/6 |
| `node scripts/eval-heldout.mjs` | rules alone: 36/42 where code decides, 0/18 open cards |
| `node scripts/eval-heldout.mjs --port 9335` | 38/42 where code decides; open: 16/18 matched, 13/18 personal |
| `npm audit --omit=dev` | 4 high, all gRPC under `@firebase/firestore` (not imported); exit 1 |

New: `scripts/save-log.mjs` runs a command and saves its output with the date, commit, tree state and exit code, and
replaces the checkout path and the home folder. The one log that carried a local folder path
(`devlog/evidence_r2/at_head_2/check.txt`) was made again with it, not edited.

## 4. Smaller items
- **Phone** (`02923c1`). The two-question card started at 851 to 893 px of an 844 px screen, depending on the status
  line. Once a card is on screen the opening line and the sample-family note move below it, the status line is set
  smaller and the top bar is tighter. Measured by `shots.mjs` on that card with five actions: card at 769 px, headline
  at 795 px; under the longest status line the app can show, 804 and 830 px.
- **Status line** (`0e939a7`). It started as "This computer can't run the private helper" and stayed so until the
  browser answered. It now says "Checking…" first, asks again twice when the answer is "unavailable" (a browser that
  has just started can say so for a moment), and a question asked before the first answer waits for it.
- **Cold start** (`91c4b47`, `67fb3e2`, `8251484`). Three places gave three figures (15.8 s, "about 25 s", "about half
  a minute"). We timed it again and wrote "15 to 17 s"; the next start took 18.2 s, and the one after 21.7 s. So it
  took three commits to learn what should have been plain: the figure moves by several seconds from start to start.
  The README now gives the measured range (16 to 22 s in four starts) and the status line gives a bound ("up to half
  a minute"). Of the four, 15.8 s (`devlog/ondevice_proof_1/`) and 21.7 s
  (`devlog/evidence_r3/cold_start_at_67fb3e2/`) are in saved logs; 17.0 s and 18.2 s were read off runs whose logs
  were not kept.
- **Privacy receipt** (`e7d2789`). "The bytes that left this computer, never estimated" claimed more than the code
  does: it counts the request the app hands to the SDK, not the wire. The README, `CLAIMS.md` row 9 and the receipt
  itself say that now.
- **Input borders** (`5464e22`). The question field's edge was 1.4:1 on its panel; it is 4.4:1, pinned by a test.
- **Hosting** (`8bd1907`). `firebase.json`, `.firebaserc` and `npm run build:hosting`, which refuses to build without
  the reCAPTCHA Enterprise site key. Nothing was deployed.
- **Scrub** (`8293a6b`). The link in `DESIGN_DIRECTIONS.md` whose address named a coding tool is removed.

## Still not true or not done
- No hosted URL, no production App Check provider, no public repository, no video. The first two wait on two console
  steps by the project owner; the repository is ready for the deploy.
- The git history is not ready to be public: author lines and commit trailers need a fresh history. Nothing was
  rewritten; the list and a proposed approach are in a note for the owner that is not part of the repository.
- No trial with people. The only number is the one above, on our own labels.
- The download of the on-device model from a fresh browser profile ("One-time setup: download…") has still never been
  run from zero by us.
- Open from the labelled set, left open so it stays a test: "What did you have for breakfast?" gets a choice card;
  "ring Tyler / Jenny first" and "hot / cold in here" keep stray words; "How bad is your headache" misses the pain
  scale; foods for "where do you want to eat" and a TV show or a team for music.
- With cloud help only, a role from the cloud ("doctor") can still take the place of the second About-me person on a
  who-card (seen again tonight in the run at `8251484`: *doctor / Jenny*; not in the final one).
- The pictures step is still defined and never called. The sample family still names real TV shows, a team and a
  singer. The look-alikes are still named on the How screen. A card that asks the cloud took 2 to 11 s tonight.
- On a phone the card's tiles are still in the second screen in judge mode; only its top and headline are in the first.
