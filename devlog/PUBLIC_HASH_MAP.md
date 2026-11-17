# Working hash → public hash

The commit hashes quoted in `README.md`, `CLAIMS.md`, `EVIDENCE.md`, `DISCLOSURE.md`, the devlog and the headers of the
saved logs are from our working history. The public repository holds the same commits, one for one, in the same order
and with the same author and commit dates; each was made again for publication, so each has a new hash. This table
gives both. Oldest first.

What differs from the working history:

- Author and committer are the entrant's public identity on every commit.
- Commit messages are the same, except that trailer lines were dropped and one phrase that named a person was made neutral.
- In 22 early commits, marked † below, a few lines of text under `devlog/` differ: a local folder path in one saved log
  (`devlog/evidence_r2/at_head_2/check.txt`), one link in `devlog/DESIGN_DIRECTIONS.md`, and a first name in the day
  notes were replaced. Later commits had already taken all three out of the current files. No source file, test,
  script or measured number differs in any commit.
- The tag `pre-contest` is on the same first commit, with its original date. The tag `ondevice-proof-1` named in some log
  headers is on working commit `1092be7` and is not published.

This file was written after the table's last row was made, so the commit that adds it, and any later one, is not in
the table.

| # | Working | Public | Date (commit) | Subject |
|---|---|---|---|---|
| 1 | `949e8ec` | `6518315` | 2026-11-11 16:35 | Import pre-existing modules from the 9-10 Nov 2026 prototype (disclosed) |
| 2 | `148fc92` | `f4e9b11` | 2026-11-11 16:46 | Day 1: all AI through Firebase AI Logic, shared core, one-screen web client |
| 3 | `1fec719` | `967e6cb` † | 2026-11-11 17:57 | Day 2: card rules pulled forward (headline, label check, open-question sources, Name A),… |
| 4 | `90cab11` | `d2f9077` † | 2026-11-11 18:31 | Day 3: screens, consent flow, copy module, judge mode v0, pictograms batch 1, Day 2 lefto… |
| 5 | `e7b8499` | `6267c7e` † | 2026-11-11 19:11 | Design pass: three preview directions (Signal, Marker & Pad, Two Sides) behind ?theme= |
| 6 | `8f19968` | `121d389` † | 2026-11-11 19:35 | Day 4: once-per-event animations, self-hosted fonts, route-class fix, 60-second judge pat… |
| 7 | `992beb0` | `20412c8` † | 2026-11-11 22:31 | Day 5: the app corrects the partner (coach line + judge chip), "Why this card" from real… |
| 8 | `d2cf818` | `f5e9d44` † | 2026-11-11 23:19 | Day 6: progressive disclosure on the partner screen (one "How this card was made" fold, b… |
| 9 | `bc19ebb` | `35f0886` † | 2026-11-16 15:10 | Two Sides is the default look: dark desk for the partner, white card held up for the pers… |
| 10 | `d06a0ca` | `d7e104c` † | 2026-11-16 16:05 | Rules-only cards work with no Firebase config (bare clone) |
| 11 | `1092be7` | `f042acb` † | 2026-11-16 16:22 | The on-device leg runs: private cards from About me, on this computer only |
| 12 | `dd3e3ae` | `cb94963` † | 2026-11-16 16:24 | Proof run of the on-device leg at tag ondevice-proof-1 (33/33) |
| 13 | `bc7ca69` | `02e3fbf` † | 2026-11-16 16:30 | Truth pass: every false line from the review corrected, on screen and in the docs |
| 14 | `83a7da5` | `2ce0af0` † | 2026-11-16 16:33 | Should-fix: readable cross, a "making the card" state, who-and-why line, cloud e2e green |
| 15 | `5c069e5` | `f9de58f` † | 2026-11-16 16:35 | Evidence at 83a7da5: cloud 12/12, no-config 10/10, on-device 33/33 |
| 16 | `46fda05` | `d40e37f` † | 2026-11-16 16:45 | README opens with the stakes, sourced: how many live with aphasia, how rarely the partner… |
| 17 | `51678cb` | `963ba7f` † | 2026-11-16 16:49 | Phone: the person's card follows the actions (starts at 806 px in judge mode at 390x844,… |
| 18 | `64509da` | `9dcfecf` † | 2026-11-16 16:53 | Who-cards with cloud help offer the people About me names; a third choice waits on a next… |
| 19 | `9ac4fd9` | `018ef6c` † | 2026-11-16 16:56 | A labelled held-out set of 60 partner questions and the script that scores the cards agai… |
| 20 | `2cc3c30` | `9f23eb7` † | 2026-11-16 16:58 | First run of the held-out set, unedited: 55/60 with the on-device model, 54/60 rules alone |
| 21 | `cb921d9` | `90b4d49` † | 2026-11-16 17:00 | Answers so far: confirmed answers kept on this computer; the partner sees what they chose… |
| 22 | `161c491` | `9aeaeb1` † | 2026-11-16 17:02 | Cloud e2e: the who-card check allows for the model's varying answer (a role such as 'doct… |
| 23 | `f94b399` | `1153b5d` † | 2026-11-16 17:07 | Judge files: JUDGES.md (60-second path), CLAIMS.md (every claim with status and limit), E… |
| 24 | `510f84a` | `672b87a` † | 2026-11-16 17:07 | Devlog: the second half of 16 Nov and what is still not true |
| 25 | `8293a6b` | `7a0e9d1` | 2026-11-16 17:55 | Scrub for a public repository: the saved check log no longer carries a local folder path,… |
| 26 | `8ca45b5` | `bf77786` | 2026-11-16 17:57 | Held-out scorer: the report is about the open questions; plural match fixed; two labels m… |
| 27 | `e178c54` | `a654879` | 2026-11-16 18:06 | The main number is the open questions: rules alone 0 of 18 cards, on-device model 16 of 1… |
| 28 | `a65260c` | `e593d9b` | 2026-11-16 18:09 | Judge path opens on the open questions, where the step on this computer and the cloud ste… |
| 29 | `02923c1` | `7c9331e` | 2026-11-16 18:14 | Phone: a two-question card and its headline start above the 844 px fold at 390 x 844 |
| 30 | `0e939a7` | `7bf8fae` | 2026-11-16 18:17 | Status line: 'checking' until the browser has answered; 'can't run the private helper' on… |
| 31 | `91c4b47` | `b18abdb` | 2026-11-16 18:18 | Cold start: one figure everywhere, from two timed browser starts (15.8 s and 17.0 s) |
| 32 | `e7d2789` | `82b8868` | 2026-11-16 18:19 | Privacy receipt: it counts the request the app handed to the SDK, and says so |
| 33 | `5464e22` | `5cb15ee` | 2026-11-16 18:19 | The question field and the choices selector have a visible edge: 4.4:1 on the panel (was… |
| 34 | `8bd1907` | `8a36994` | 2026-11-16 18:20 | Ready for Firebase Hosting: only the reCAPTCHA Enterprise key and the deploy itself remain |
| 35 | `67fb3e2` | `0fb4626` | 2026-11-16 18:22 | Cold start: 15 to 20 s, after a third timed start came in at 18.2 s |
| 36 | `8251484` | `6d8c86d` | 2026-11-16 18:26 | Cold start, stated as what it is: 16 to 22 s in four timed starts; the status line gives… |
| 37 | `43c5265` | `0c174fd` | 2026-11-16 18:32 | The main number as a range over four clean-tree runs: 15 or 16 of 18 open cards matched,… |
| 38 | `dbc5238` | `cc845a7` | 2026-11-16 18:38 | Evidence at 43c5265, every log made again on a clean tree; EVIDENCE, CLAIMS and JUDGES po… |
| 39 | `a0931c6` | `1642d29` | 2026-11-16 18:55 | Judge mode opens with a finished card on the first frame: coffee or tea, read in code, no… |
| 40 | `12d9327` | `e8b038f` | 2026-11-16 19:04 | One number instead of a paragraph: "0 bytes left this computer", under the chips, from th… |
| 41 | `b177f50` | `c9caf9d` | 2026-11-16 19:09 | "Show to person" lifts the card: the white pane grows to the whole screen in 250 ms; no m… |
| 42 | `aa373bb` | `8b30225` | 2026-11-16 19:13 | The opening line says the insight: "It corrects how you ask. It never answers for them.";… |
| 43 | `78aaf74` | `79344d9` | 2026-11-16 19:17 | "What was sent" is one line and a size by default; the exact request is one click further |
| 44 | `ee5529a` | `6a52fc2` | 2026-11-16 19:22 | The partner's own usual questions as one-tap chips above the question field, from "Answer… |
| 45 | `7db4f91` | `6436caf` | 2026-11-16 19:25 | The number under the chips takes the badge colours: mint while nothing was handed over, s… |
| 46 | `5cb9c5e` | `b0a066d` | 2026-11-16 19:26 | README: why gemini-3.5-flash-lite for the cloud step, checked against the Firebase releas… |
| 47 | `ccfa01e` | `9091a73` | 2026-11-16 19:33 | Evidence at 5cb9c5e, every log made again on a clean tree after the first-screen changes;… |
| 48 | `c37e4c4` | `37fb551` | 2026-11-16 19:43 | The badge names the engine when only the model saw a yes / no: "You don't want…, do you?"… |
| 49 | `a4667b6` | `4514847` | 2026-11-16 20:53 | Thirteen classes of mistake from the rehearsal of 16 Nov, fixed in the rules: names and f… |
| 50 | `c73ec86` | `251f8c2` | 2026-11-16 21:03 | Firebase Remote Config: the cloud model's name and the two routing thresholds come from i… |
| 51 | `24793c1` | `5c8d307` | 2026-11-16 21:14 | Judge mode: after the instant card, the first step runs by itself on the on-device model;… |
| 52 | `31844ad` | `22944f4` | 2026-11-16 21:22 | Evidence at 24793c1, every log made again on a clean tree; the deploy and the cloud run a… |
| 53 | `4fad530` | `bce7714` | 2026-11-16 21:52 | Privacy: a name that is not in About me no longer goes to the cloud as typed when it foll… |
| 54 | `9648cc0` | `748f289` | 2026-11-16 21:56 | A failed cloud call never becomes a card made of About me: no card, the reason, "Try agai… |
| 55 | `148a211` | `2cd525d` | 2026-11-16 21:59 | Orientation and recall questions are caught as tests: no card, no invented tiles; a card… |
| 56 | `d0e1054` | `e692389` | 2026-11-16 22:00 | "When did the pain start, this morning or last night?" is a two-option card, not a memory… |
| 57 | `9ef8b87` | `7fc1f6f` | 2026-11-16 22:02 | Three options where the last is "nothing / neither / just quiet" keep all three tiles; ne… |
| 58 | `345029f` | `ce8e46f` | 2026-11-16 22:05 | Pain asked as a number gets a line of every number; asking after a part of the body gets… |
| 59 | `0837e5d` | `f5f98f1` | 2026-11-16 22:09 | About-me words stay on a card only where the question asks for their kind; a statement fo… |
| 60 | `4b4eb29` | `2bdfce8` | 2026-11-16 22:13 | A tile holds the whole option and nothing but the option; a statement with a tag is a yes… |
| 61 | `0afbf77` | `2158e6a` | 2026-11-16 22:19 | The coaching line for a recall question keeps the words "tell, don't test" |
| 62 | `258c31c` | `2ad62fa` | 2026-11-16 22:27 | Evidence at 0afbf77, every log made again on a clean tree after the nine commits that fol… |
| 63 | `d076187` | `72fe7cf` | 2026-11-16 23:06 | Options named in the question always make a card: the code reads the pair several ways, a… |
| 64 | `8fb01c6` | `7e29b8f` | 2026-11-16 23:07 | A test asked politely ("Can you tell me who …?", "Do you know what …?") is still a test:… |
| 65 | `b9c441a` | `f4f123d` | 2026-11-16 23:08 | "Who was that on the phone with you?" is not a test: the partner does not know. The card… |
| 66 | `d4d50ce` | `070058c` | 2026-11-16 23:11 | Only a real two-question turn is split: a first question that points at something, and an… |
| 67 | `e2d27cd` | `c35ea30` | 2026-11-16 23:14 | Three options and a "nothing" at the end are all on the card; words before the list and a… |
| 68 | `f51f861` | `77df8ad` | 2026-11-16 23:15 | The partner's name in the question means someone else is asking: it stays a name on the c… |
| 69 | `2e0e3fd` | `4a7718f` | 2026-11-16 23:17 | A feeling scale has its middle at every support level: good / so-so / bad |
| 70 | `a1f59da` | `d910c97` | 2026-11-16 23:19 | A question nobody can guess the answer to gets no made-up topics: the card is the fixed w… |
| 71 | `3d57fe1` | `9bfa8b7` | 2026-11-16 23:20 | Who to call: every person About me names is on the card, with next pages, whichever step… |
| 72 | `a4d91ee` | `80f7061` | 2026-11-16 23:21 | "No AI needed" only when no model was called; when a model was asked and code made the ca… |
| 73 | `c34a158` | `54183ad` | 2026-11-16 23:23 | An open "when" question gets one fixed line of three times, made in code: the same card o… |
| 74 | `2cdfa39` | `899ba6b` | 2026-11-16 23:28 | No cut or glued labels: a copied option must be a whole phrase of the question, an unsaid… |
| 75 | `071f38f` | `f0d7e4d` | 2026-11-16 23:29 | No filler tile on the next page: a filler word or a phrase that breaks off is never a cho… |
| 76 | `07eaa54` | `f1b3aa3` | 2026-11-16 23:39 | Privacy: a lowercase name, and a name that is also a word ("May", "bill", "rose"), no lon… |
| 77 | `8b77975` | `feb59f5` | 2026-11-16 23:39 | Privacy: a filler ("Um") is not a name, and the kind of place stays when its name is swap… |
| 78 | `89c1bde` | `332af1a` | 2026-11-16 23:46 | Labels, one more shape: a thing with its verb against something to do is read as two clau… |
| 79 | `8ace9f0` | `89b920e` | 2026-11-16 23:46 | A choice between a person About me knows and one it does not has "someone else" as its wa… |
| 80 | `58afcd9` | `ac96fab` | 2026-11-16 23:54 | Evidence at 8ace9f0, every log made again on a clean tree after the seventeen commits tha… |
| 81 | `0bd0a76` | `8895cea` | 2026-11-17 00:27 | Judge mode without Gemini Nano: a link "See what the on-device step makes" opens a record… |
| 82 | `dc3a6ac` | `ca2ebe0` | 2026-11-17 00:28 | The routing on the first screen of the README and of "How this works": family data to ONL… |
| 83 | `f4538fe` | `1eacdd3` | 2026-11-17 00:29 | "How this works" names all three badges that come from the card rules |
| 84 | `379f61d` | `035366a` | 2026-11-17 00:30 | The cloud step asks App Check for a limited-use token per request (useLimitedUseAppCheckT… |
| 85 | `1fb846e` | `3cf7032` | 2026-11-17 00:30 | Look-alikes: Livox added, read on its own page; the line "none of them rewrites the partn… |
| 86 | `8bca99c` | `64bfb51` | 2026-11-17 00:32 | The picture-generation step is removed: it was defined, configured and never called |
| 87 | `de862eb` | `51e765e` | 2026-11-17 00:42 | Judge mode: one summary line under every card after the first, instead of four open panels |
| 88 | `c346d3d` | `e714e73` | 2026-11-17 00:43 | The labelled-set report no longer says "no rule was changed after that run"; it counts th… |
| 89 | `9bbff40` | `c404b04` | 2026-11-17 00:51 | The main number, measured again at the current code: 16 of 18 open questions in each of t… |
| 90 | `2901acc` | `8e96328` | 2026-11-17 00:51 | JUDGES.md: both status lines a browser without the model can show, and the recording behi… |
| 91 | `631b004` | `f3908fa` | 2026-11-17 00:51 | JUDGES.md: the model takes 16 to 22 s to load right after a browser start, not "up to abo… |
| 92 | `c0004d8` | `f27602b` | 2026-11-17 00:52 | Submission notes: Hosting and Remote Config are in the Built-with table, App Check is "re… |
| 93 | `891a95e` | `79e4ee3` | 2026-11-17 00:52 | README: the 500-word status paragraph is three lines; the paragraph is kept in devlog/DAY… |
| 94 | `fee2df4` | `c88d15d` | 2026-11-17 00:53 | README: "two choices with pictures" is true only where a picture is drawn; the family's p… |
| 95 | `3cde1e8` | `212cd74` | 2026-11-17 00:53 | README, first lines: what is at stake, in the Aphasia Institute's own words, with the pag… |
| 96 | `deebc94` | `8641f08` | 2026-11-17 00:54 | Wording: "no direct inference call; one availability query", the source for it, "a small… |
| 97 | `89fb06a` | `1848d76` | 2026-11-17 01:02 | The on-device run log no longer calls a hosted copy "the dev server of this commit" |
| 98 | `6796d7a` | `d300b84` | 2026-11-17 01:06 | Evidence at deebc94, every log made again on a clean tree; the deploy, and the cloud and… |
| 99 | `7c0bccf` | `7bdb3cd` | 2026-11-17 05:18 | For the public repository: its address on the first line of JUDGES.md; the first on-devic… |
| 100 | `7080ebf` | `50c48dd` | 2026-11-17 07:43 | Quick needs: a fixed board of everyday needs, one tap from the partner screen (toilet, d… |
| 101 | `a1e1b2d` | `7343160` | 2026-11-17 07:45 | Voice input for the partner's question: a microphone button next to the field (the brows… |
| 102 | `8810f8f` | `e9ed8a7` | 2026-11-17 07:50 | Wording: "Every model call that makes a card goes through Firebase AI Logic" on "How thi… |
| 103 | `0eeca4e` | `402ec3c` | 2026-11-17 07:54 | scripts/e2e-needs.mjs: the quick-needs board with the network switched off after the pag… |
| 104 | `20d2b19` | `bcabbeb` | 2026-11-17 07:55 | Hosting: the page at "/" is sent with Cache-Control no-cache, like /index.html; it had m… |
| 105 | `faebade` | `965d8b3` | 2026-11-17 08:00 | README, CLAIMS (rows 40 and 41, and what they change for rows 3, 4, 22 and 36), JUDGES, … |
| 106 | `c4d08e0` | `8b58934` | 2026-11-17 08:04 | Voice: SpeechRecognition.available() is asked only from Chrome 157 on; Chromium 148 cras… |
| 107 | `27abd80` | `a02b2c0` | 2026-11-17 08:53 | Voice input goes through Firebase AI Logic: the microphone records one short clip of the… |
| 108 | `98e78da` | `acd826b` | 2026-11-17 09:15 | Send feedback, kept in Cloud Firestore: a small form on the partner's side and on "How t… |
| 109 | `3018251` | `21198db` | 2026-11-17 09:15 | scripts/live-voice-feedback.py: voice input and the feedback form in two real browsers (… |
| 110 | `209aee5` | `2d1120d` | 2026-11-17 09:23 | Feedback: the form's own message for a broken email address (the browser's built-in chec… |
| 111 | `40fedec` | `8e9c1b8` | 2026-11-17 09:23 | Wording on "How this works": with cloud help off the page contacts no host but its own u… |
| 112 | `77011fe` | `c51bb14` | 2026-11-17 11:06 | Docs after voice moved to Firebase AI Logic and feedback to Firestore: README, CLAIMS rows… |
| 113 | `4e27d1e` | `d5897c7` | 2026-11-17 12:19 | An either-or whose two options the code reads whole is the card at once: the on-device m… |
| 114 | `ec9ff59` | `9a3f3a6` | 2026-11-17 12:21 | Headline "what to do" where the options share no word; "…, or is Carol watching her show… |
| 115 | `abb2494` | `cd2f619` | 2026-11-17 12:27 | The family's own entries first, three of them on one card; places first on "where shall … |
| 116 | `66c4574` | `8531905` | 2026-11-17 12:28 | "How are you feeling?": the way out of good / so-so / bad leads to a second page, sad / … |
| 117 | `30db57a` | `b7dfe32` | 2026-11-17 12:36 | "How are you?" card: a fixed headline ("feeling", "feeling today"); README section on wh… |
| 118 | `4d7edee` | `2378ef4` | 2026-11-17 12:43 | Runs at 30db57a saved; README and CLAIMS say the hosted copy does not have the 17 Nov fi… |
| 119 | `03a43fe` | `1aa258e` | 2026-11-17 13:07 | The hosted copy has the second-rehearsal fixes: deploy of 17 Nov 19:05 UTC, live cloud 2… |

Rows 100–106, 107–111, 112 and 113–119 were added on 17 Nov, when those commits reached the public history (the public-only commits 6fa68a2 and e18f518 are not working commits, so they have no row; rows 118 and 119: the working file firebase-debug.log, a local CLI log, was left out of the public copy).
