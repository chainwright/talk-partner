# Day 12 (17 Nov 2026, after midnight): the fourth review; what a judge without Gemini Nano sees, and the number at the current code

## The README's status paragraph, as it stood until today
The README opened with one paragraph of about 500 words that had grown with every day. The fourth review called it a
wall, rightly. The README now has three lines in its place (what runs, one number, where every claim is). The
paragraph is kept here as it stood, with the number as corrected earlier today, because it is the short history of
the build:

> Built for #BuildHybridAI 2026. Status: early. Six build sessions on 11 Nov 2026 (card rules, the five screens, consent flow, judge mode with a privacy receipt, "why this card", the coaching line, the repair card, the folded partner screen), a design commit on 16 Nov (direction C "Two Sides": a dark desk for the partner, a white card held up for the person, fonts self-hosted), and on 16 Nov the first real run of the on-device step, a truth pass over the lines our review marked false, and a first measurement on a labelled set of 60 partner questions that we wrote ourselves. **What it shows, measured at commit `c346d3d` on 17 Nov (three runs on a clean tree, `devlog/evidence_r8/heldout_at_c346d3d/`): on the 18 open questions (who, where, what), where the choices are not in the question, rules alone make no card at all (0 of 18); the on-device model, reading About me on this computer, made a card that matched our label for 16 of 18 in each of the three runs, and 13 of those offer the family's own people, places or foods.** The other 42 questions are decided by code: 40 of 42 matched with the rules alone, and 39, 41 and 41 in the three runs in the app, where a longer either-or asks the on-device model to copy the two options. The four first runs, on 16 Nov at `8ca45b5` and `8251484`, gave 16, 16, 16 and 15 of 18 (12 or 13 with the family's own entries) and 36 to 38 of 42 (`devlog/evidence_r2/heldout_r2_NOTES.md`); the rules have been changed since, some after reading this set's own misses, so it is no longer a held-out set. Later the same evening, seven changes to the first screen from a design review (`devlog/DAY9.md`): none of them touches a card rule or that number. Then, that night, a rehearsal of the trial with questions written for it showed thirteen kinds of mistake in the rules; they are fixed, Firebase Remote Config was added, and judge mode's first step now runs by itself on the on-device model (`devlog/DAY10.md`). One run of the labelled set after those changes (at `24793c1`) gave 17 of 18 open questions matched (14 with the family's own entries) and 39 of the 42 others. Two more sets of the rehearsal, kept sealed until the fixes before them were committed, found further kinds of mistake; what the last one found (fifteen kinds, two of them in the privacy swap) and what was done about each, with what is still open, is in `devlog/DAY11.md`. Our labels, not a user trial; two labels were made stricter after the first run, and every miss is listed. Deployed to Firebase Hosting on 16 Nov (<https://talk-partner.web.app>); no video yet, no trial with people yet. Judges: `JUDGES.md` (60 seconds), `CLAIMS.md` (every claim with its status), `EVIDENCE.md` (claim → file, command, saved output). See `devlog/`.

## What the fourth review said
Three seats read the build of `8ace9f0` and the live site (official rubric twice, and a web seat that checks every
sentence). Their common finding: a judge on an ordinary Chrome, with no Gemini Nano, sees a card made in code, "No
card" on the open questions and, after turning on cloud help, the cloud's general pair. The step this build is
about, the one that reads About me on the computer, was on nobody's screen but ours. The rest was a list of lines
that had gone stale or said more than we can show. Still open after today, and not ours to close in code: a public
repository, a video, a trial with people.

## Commits, each after `npm run check` and `npm run build` had ended with exit code 0 on that tree

| Commit | What the review found | What happens now |
|---|---|---|
| `0bd0a76` | Without Gemini Nano the on-device step is never seen | Judge mode has a link, "See what the on-device step makes →". It opens a recording of that step from our machine (17 Nov UTC, `8ace9f0`, the SDK's console line with `inferenceSource=on_device`), in a dashed frame tagged "Recording". No card, no model call, no request, no setting change; cloud help stays behind the consent screen. `core/recorded.ts`, `tests/unit/recorded.test.ts` (every value is checked against the saved run log) |
| `dc3a6ac` | The routing was two thirds down the README | The routing table is the first section of the README and the first line of "How this works": family data to `ONLY_ON_DEVICE`, the stripped question to `PREFER_IN_CLOUD`, badges from `inferenceSource` |
| `f4538fe` | "How this works" named two of the three rule badges | It names "Made in code (AI answer not used)" too |
| `379f61d` | No limited-use App Check tokens | `getAI(app, { backend, useLimitedUseAppCheckTokens: true })` for the cloud step (the option is in `@firebase/ai` 3.1.0). Replay protection is a console setting and is not switched on |
| `1fb846e` | Livox turns a partner's question into a choice screen and was not named | A row for the Livox project (Worcester Polytechnic Institute, 2020), quoted from its own page; the sentence above the table no longer says that none of the named tools starts from the partner's question |
| `8bca99c` | A picture-generation model was configured and never called | Removed from the engine, the engine interface, the model names and the request bodies. Two steps, two models |
| `de862eb` | Judge mode stacked four open panels under every card | Open under the first card; under every later card one line, "How this card was made: … · N kept, N added, N dropped by a rule", and one click opens all three. The link to the recording moved into the "Sample family" line: as a row of its own it pushed the actions under the fold (`scripts/shots.mjs` found it) |
| `c346d3d` | The labelled-set report said "no rule was changed after that run", which was false | The script counts the rule commits since the set was committed and writes "no longer held out" |
| `9bbff40` | The main number was 26 rule commits older than the build | Measured again at `c346d3d`, three runs (below); every quote carries the commit |
| `2901acc`, `631b004` | JUDGES.md named one of the two status sentences, the less likely one; "about 20 s" | Both sentences, in a table; "16 to 22 s" |
| `c0004d8` | The submission notes said "no deploy yet" and "enforcement comes with the first deploy" | Hosting and Remote Config are Built-with rows; App Check is "registered, not enforced yet"; the platform; three lines on pre-existing work |
| `891a95e` | The README's 500-word status paragraph | Three lines; the paragraph is at the top of this file |
| `fee2df4` | "two choices with pictures" | "pictured where we have drawn a picture"; the family's places and foods are words. "Never guesses the answer" became "never picks or confirms the answer" |
| `3cde1e8` | The first lines had scale and gap, no stake | One sentence quoted from the Aphasia Institute's page on Supported Conversation, with the page and the date; marked as the method's premise, not a measured harm |
| `deebc94` | "No direct model call anywhere"; "the SDK has no public call"; "the smallest current stable model"; "Every claim we make" | "No direct inference call; one availability query", with Firebase's web guide as the source; "a small current stable model"; CLAIMS rows 36 to 39 |
| `89fb06a` | (ours) the on-device log called the hosted copy "the dev server of this commit" | The log says "a hosted copy" for any url that is not localhost |

## The labelled set at `c346d3d`, clean tree (`devlog/evidence_r8/heldout_at_c346d3d/`)

| Run | Open questions matched (of 18) | With the family's own entries | Code-decided matched (of 42) |
|---|---|---|---|
| on-device, run a | 16 | 13 | 39 |
| on-device, run b | 16 | 13 | 41 |
| on-device, run c | 16 | 13 | 41 |
| rules alone | 0 (no card, as it should be) | 0 | 40 |

The two open misses are not the same in every run: "Where do you want to eat your dinner?" in all three (*lake /
church*, then *restaurant / lake*: places, where the label wants rooms), then "What do you want to watch tonight?"
twice (*Packers* where About me says "Packers games") and "Where should we go for a walk?" once (*hardware store*).
The code-decided count moves between 39 and 41 because a longer either-or asks the on-device model to copy the two
options, and its copy is sometimes the better one ("Shall I make chili, or would you rather have pot roast?" is
*make chili / have pot roast* with the rules alone, a miss, and matched the label in runs b and c) and sometimes not
(in run a that card missed too, and "Wheel of Fortune or the Packers game" came back in the other order). "Is it too hot or too cold in here?" (*hot / cold in here*) missed in every
run. The four first runs gave 16, 16, 16, 15 and 12 or 13 personal; the open-question result has not moved, the
personal count is at the top of its old range, and the fear written into CLAIMS row 16 ("may be lower now") did not
come true. It is still our labels on our questions, and no longer a held-out set.

Time from asking to the card on the open questions: median 3.3 s in each run, 3.1 to 3.7 s.

## Runs at `deebc94`, clean tree (`devlog/evidence_r8/final/`)

| Run | Result |
|---|---|
| `npm run check` | 1714 tests, exit 0 (was 1703) |
| `npm run build` | exit 0, no debug token in `dist` |
| `node scripts/e2e-noconfig.mjs` | 16/16, exit 0 |
| `node scripts/e2e-cloud.mjs` | 28/28, exit 0 |
| `node scripts/e2e-ondevice.mjs --port 9335` | 43/43, exit 0 |
| `node scripts/shots.mjs` | 87/87, exit 0 |
| `node scripts/fonts-check.mjs` | 6/6, exit 0 |
| `node scripts/eval-heldout.mjs` | rules alone: 40/42 where code decides, 0/18 open cards, exit 0 |
| `npm run build:hosting`, `npx firebase-tools deploy --only hosting --project talk-partner --non-interactive` | exit 0; <https://talk-partner.web.app> serves this commit (the served bundle is byte for byte the local build) |
| `node scripts/e2e-cloud.mjs --url https://talk-partner.web.app/` | 28/28, exit 0 (`devlog/evidence_live/e2e-cloud_live_2026-11-17_deebc94.txt`) |
| `node scripts/e2e-ondevice.mjs --port 9335 --url https://talk-partner.web.app/` | 43/43, exit 0: the on-device step on the hosted copy, for the first time (`devlog/evidence_live/ondevice_live_2026-11-17_deebc94/`; run from `89fb06a`) |

## Not done, or true only with a limit
- No public repository, no video, no trial with people.
- App Check is registered and its tokens are sent; enforcement is not switched on in the console, and replay
  protection is not either. Both are the owner's steps.
- The cloud step runs on the free tier (15 requests a minute, shared by everyone who tries the hosted copy).
- The recording in judge mode is of the build of `8ace9f0`, not of the current one. The same question gave the same
  tiles at the current build, on localhost and on the hosted copy, but the recording itself was not made again.
- The download of Gemini Nano from a fresh profile (`initializeDeviceModel`) has still never been recorded.
- A second look-alike the review named (a Devpost entry) is not in the README: its page refused our fetch, and we
  quote only what we have read at the source.
- The stake in the first lines is the premise of the SCA method in its authors' words. We have no figure for harm
  that we could read at its source.
- The family's places and foods still have no pictograms.
- No text-to-speech.
