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
| 120 | `5e63be4` | `a41e8b2` | 2026-11-17 14:28 | Cloud step: the App Check session token again, not a limited-use token per request; an A… |
| 121 | `93a6965` | `43fe710` | 2026-11-17 14:29 | Documents: voice input is Gemini through Firebase AI Logic (ONLY_IN_CLOUD) wherever a li… |
| 122 | `2aeb1d0` | `f1ffed7` | 2026-11-17 14:31 | Judge mode: under the first card too, why / where each step ran / what was sent are one … |
| 123 | `749d122` | `99adab1` | 2026-11-17 14:40 | The labelled set on the on-device model, run three times at 2aeb1d0, after the rule chan… |
| 124 | `bbcb075` | `30ee2fd` | 2026-11-17 14:40 | Judge path and claims after the fifth review: "who to call tonight?" off the 60-second p… |
| 125 | `7dd16a1` | `8290109` | 2026-11-17 14:49 | A cloud call that fails while App Check has no token for this browser is named as that: … |
| 126 | `2c5673e` | `aa94410` | 2026-11-17 14:55 | The labelled set at 7dd16a1, the last commit that changes code: 15, 16, 15 of 18 and 12,… |
| 127 | `0e358dd` | `c878249` | 2026-11-17 15:20 | The hosted copy is the build of 2c5673e (17 Nov, 20:55 UTC): needs 12/12, two browsers w… |
| 128 | `d524f51` | `659a814` | 2026-11-17 15:41 | A 360 px phone no longer cuts the partner screen off on the right: the one-column layout… |
| 129 | `cab8c04` | `0b18629` | 2026-11-17 16:56 | The simple-shell proposal and its two mockups are kept as reference: direction A 'One sc… |
| 130 | `107dcc1` | `5add5c6` | 2026-11-17 16:56 | Words and decisions of the simple view, in the core: 'this phone / this tablet / this co… |
| 131 | `e30b49e` | `eed31f9` | 2026-11-17 16:56 | The simple view is what '/' opens (direction A, 'One screen'): first screen, the card is… |
| 132 | `4a78059` | `51462ea` | 2026-11-17 16:56 | Checks for the simple view: scripts/e2e-simple.py drives it in a browser as a phone, a d… |
| 133 | `85b421b` | `2689fbc` | 2026-11-17 17:01 | Evidence for the simple view at localhost: the screens at 390 and 1440 px, light and dar… |
| 134 | `aaddcfc` | `54b61c3` | 2026-11-17 17:01 | The documents follow the simple view: README (Screens, the three new scripts), JUDGES ('… |
| 135 | `188f03b` | `0d90ec7` | 2026-11-17 17:04 | The first frame has the look of the view it opens (the bare address light, any other dar… |
| 136 | `cdbfff6` | `2cd3365` | 2026-11-17 17:14 | The hosted copy is the build of 188f03b (17 Nov, 23:04 UTC), the simple view at the bare… |
| 137 | `6af528c` | `8e98652` | 2026-11-17 18:06 | Card rules: never a generic title ('question', 'which one', 'choices': the title comes f… |
| 138 | `8cf67bf` | `41fc538` | 2026-11-17 18:06 | Topics for the first screen, in the core (core/topics.ts): seven topics, 41 generic ques… |
| 139 | `a4700db` | `180d988` | 2026-11-17 18:22 | The simple view, made right (design/USER_FIRST.md, design/topics_2026-11-17): first scre… |
| 140 | `bc038e4` | `8dec38f` | 2026-11-17 18:25 | Installable, and usable with no connection: a web app manifest (Talk Partner, standalone… |
| 141 | `bf808f1` | `e37edd5` | 2026-11-17 18:36 | The cloud step is waited for 25 s at most (a blocked script or a hanging connection no l… |
| 142 | `14a953d` | `dd4c8e1` | 2026-11-17 18:36 | Checks for the new simple view: scripts/e2e-simple.py drives the first visit, the folded… |
| 143 | `200f6cf` | `85e6540` | 2026-11-17 18:40 | The documents follow the rebuilt simple view: README ('Where the AI runs' has the narrow… |
| 144 | `fb1b3ba` | `6402c7e` | 2026-11-17 18:47 | A narrowing card says what went for it (the question and the choices that did not fit, n… |
| 145 | `e8ee3c2` | `54a7ea6` | 2026-11-17 18:53 | The hosted copy is the build of fb1b3ba (18 Nov, 00:48 UTC), the rebuilt simple view at … |
| 146 | `fe96c60` | `9dce666` | 2026-11-17 19:03 | After 'something else' the next card is broader and different, never more of the kind al… |
| 147 | `84f6435` | `a5fdd6c` | 2026-11-17 19:41 | Conversation trees (core/tree.ts), rules only: after every answer to every topic questio… |
| 148 | `f569e3b` | `e5af0b6` | 2026-11-17 19:41 | The simple view leads and can be left: the answered screen shows the question with its a… |
| 149 | `0e8dc6f` | `1c561ca` | 2026-11-17 19:49 | The app learns the person on this device, by counting (core/prefs.ts, rules, no model): … |
| 150 | `f452ff7` | `471022d` | 2026-11-17 20:20 | Colour pictures and the family's own photos. Every picture is redrawn as a simple, reali… |
| 151 | `b9c7602` | `dfc4178` | 2026-11-17 20:20 | The documents follow 18 Nov: README has 'Added on 18 Nov' (conversation trees, what the … |
| 152 | `c20306f` | `640c721` | 2026-11-17 20:23 | The hosted copy is the build of b9c7602 (18 Nov, about 02:20 UTC): 20 of 20 served files… |
| 153 | `02a08e8` | `c29f435` | 2026-11-17 21:19 | Phase 3, the carer's side: an answer check, a diary, health notes, what stands out, a ti… |
| 154 | `80a4c30` | `d195636` | 2026-11-17 21:27 | The full view's empty card area says in words what will be there, and its placeholder fi… |
| 155 | `9117fdd` | `daabc2c` | 2026-11-17 21:43 | Five findings of a role-play on the hosted copy (Carol and Frank, 390 px). The data-use … |
| 156 | `d04e530` | `ce4bc4e` | 2026-11-17 21:51 | Evidence for phase 3 and the role-play fixes at 9117fdd, production build on localhost (… |
| 157 | `a99cbf3` | `c97de09` | 2026-11-17 21:54 | The hosted copy is the build of d04e530 (18 Nov, 03:52 UTC): 20 of 20 served files have … |
| 158 | `3a9cf34` | `884702b` | 2026-11-17 22:12 | The answer check never discounts pain, and drinks are counted as the timeline shows them… |
| 159 | `95eb1bd` | `f41931a` | 2026-11-17 22:15 | The hosted copy is the build of 3a9cf34 (18 Nov, 04:13 UTC): 20 of 20 served files have … |
| 160 | `2396775` | `b92212d` | 2026-11-17 22:46 | Phase 4: the first-letter helper, "[Name] wants to say something", "Before a doctor visi… |
| 161 | `9ff3e9d` | `1d002d3` | 2026-11-17 22:58 | The documents follow phase 4, and three things found while writing them. README has 'Add… |
| 162 | `43e9293` | `1cf8842` | 2026-11-17 23:01 | Evidence for phase 4 at 9ff3e9d (devlog/evidence_phase4). 17 screens at 390 x 844 (scrip… |
| 163 | `6ee90fc` | `080d620` | 2026-11-17 23:05 | The hosted copy is the build of 43e9293 (18 Nov, 05:02 UTC), phase 4: 20 of 20 served fi… |
| 164 | `421dae0` | `d0745d6` | 2026-11-17 23:14 | Three findings of a third role-play on the hosted copy (Carol and Frank, 390 px, build 4… |
| 165 | `985a529` | `0509b78` | 2026-11-17 23:17 | The hosted copy is the build of 421dae0 (18 Nov, 05:14 UTC), the three fixes of the thir… |
| 166 | `17571ae` | `7fe4323` | 2026-11-18 00:32 | Phase 5, the fixes of judge round 6 (code). The first screen: "Hand over the phone: they… |
| 167 | `d198eb0` | `135e65a` | 2026-11-18 00:50 | Phase 5 in a browser: three things the browser run found, the family's three pictures, a… |
| 168 | `de631b1` | `27f8196` | 2026-11-18 01:01 | Phase 5: the needs board with nine tiles fits in the full view too, and the last scripts… |
| 169 | `9d141b0` | `15657be` | 2026-11-18 01:04 | The documents follow phase 5, and the evidence (devlog/evidence_phase5). README: the fir… |
| 170 | `08f3e6f` | `99279d1` | 2026-11-18 01:11 | The hosted copy is the build of 9d141b0 (18 Nov, 07:05 UTC), phase 5: 20 of 20 served fi… |
| 171 | `2a83e97` | `cb47a59` | 2026-11-18 01:17 | No usual-answer hint and no shortcut on a care question |
| 172 | `32a2f18` | `eb2ad9b` | 2026-11-18 01:55 | A blow to the head can be added to a fall later; the fall and needs lines without a stra… |
| 173 | `1de40ca` | `b5fe233` | 2026-11-18 05:19 | Phase 6, part D: every line of "What stands out" and of "Since the last visit" can show … |
| 174 | `1319e88` | `5838270` | 2026-11-18 05:35 | Phase 6, part A: share with the care circle (no server, no account, no AI), and the docu… |
| 175 | `0924ae6` | `42de932` | 2026-11-18 05:48 | Back goes exactly one step, never to the first screen (found by the owner on his phone, … |
| 176 | `e4b67eb` | `8e8ed92` | 2026-11-18 06:04 | After "something else" the carer always has a next step made by the rules; "show me" goe… |
| 177 | `3e09079` | `60a3e79` | 2026-11-18 06:10 | The evidence of phase 6 and of the two fixes after the owner's walk, and the day's log |
| 178 | `c47805b` | `e84ba08` | 2026-11-18 06:12 | The deploy of phase 6 was refused: the Firebase login has expired (18 Nov, 12:11 UTC) |
| 179 | `7d86f5b` | `f174b76` | 2026-11-18 06:18 | A choice from "More choices like these" ends with what to do |
| 180 | `206af23` | `f960c1d` | 2026-11-18 06:46 | Phase 7: "For the speech therapist" (how the conversations went, as counts, never a grad… |
| 181 | `5f05b8d` | `31cc14c` | 2026-11-18 07:11 | Phase 7 after the first read and the browser run: the passport fits one A4 sheet, its li… |
| 182 | `11fefec` | `7fb38e9` | 2026-11-18 07:34 | Phase 7: README, JUDGES, CLAIMS rows 108 to 113, EVIDENCE, the day's log and the evidenc… |
| 183 | `ed0395d` | `d82037d` | 2026-11-18 07:41 | The note under the usual choices no longer says needs are left out: a usual yes to a dri… |
| 184 | `2786a56` | `449551e` | 2026-11-18 12:22 | Phase 8, item 1 (safety, judge round 7 P0 6): on the visit page "Since the last visit" c… |
| 185 | `1642088` | `bb02b95` | 2026-11-18 12:37 | Phase 8, item 2 (judge round 7 P1 11): Back goes exactly one step in every view, the ful… |
| 186 | `9b10fb8` | `dfb15e0` | 2026-11-18 12:38 | Phase 8, item 3 (judge round 7 P1 7, 8, 9, 10): the passport's "knows what to say" and "… |
| 187 | `659501c` | `2469c42` | 2026-11-18 12:43 | Phase 8, item 4 (judge round 7 P0 1, P1 13, 16, 17): the documents no longer say phases … |
| 188 | `db4c0d1` | `8969ad3` | 2026-11-18 12:47 | Phase 8, item 5 (judge round 7 P1 12, 14, 15): "Needs something now?"; the red card says… |
| 189 | `159bce4` | `2752dab` | 2026-11-18 12:49 | Phase 8, item 6 (judge round 7 P0 4, IMPROVE C): every card an AI made carries a small r… |
| 190 | `058198f` | `0e8e785` | 2026-11-18 12:56 | Phase 8, item 7 (judge round 7 P1 19, 20, the nurse's and the SLP's sets): a line with t… |
| 191 | `c070bc4` | `2815b07` | 2026-11-18 12:59 | Phase 8, item 8 (judge round 7 P0 5): Beth is a drawn person in the test fixtures (no re… |
| 192 | `6785c0b` | `f8a374c` | 2026-11-18 13:02 | e2e-phase4-ai.py: the H screenshot line names the folder it was written to |
| 193 | `e3cc1b9` | `52f284b` | 2026-11-18 13:07 | Phase 8: the passport's first screen shows the fixed line on a tired yes under the two f… |
| 194 | `feb272d` | `a035b96` | 2026-11-18 13:18 | Phase 8, found by the full runs: "Home" from deep put the first screen back 490 px down … |
| 195 | `1a5e79f` | `4739b26` | 2026-11-18 13:32 | Phase 8, documents: README "Added on 18 to 19 Nov, phase 8", JUDGES, CLAIMS rows 114 to … |
| 196 | `3a9c0ce` | `b47c4de` | 2026-11-18 13:52 | Deploy of 1a5e79f (phase 8): README Deploy and JUDGES name the live build; hosted copy =… |
| 197 | `32dd0dd` | `3becc3e` | 2026-11-18 14:20 | Judge mode, an open question that got no card (no model ready, cloud help off): the card… |
| 198 | `fd0cc37` | `003a7db` | 2026-11-18 14:27 | Deploy of 32dd0dd: README Deploy and JUDGES name it; live e2e-simple 991/991, pwa 30/30,… |
| 199 | `a33ac41` | `f9b32f6` | 2026-11-18 16:06 | Phase 9 item 1 (P0 health, judge round 8 §2.1): a question about pain, the body, the toil… |
| 200 | `92f86b4` | `1749054` | 2026-11-18 16:10 | Phase 9 item 2 (P0 health, judge round 8 §2.2): "What stands out" never says "Nothing sta… |
| 201 | `0658200` | `14b3ecf` | 2026-11-18 16:11 | Phase 9 item 3 (P1 health wording, judge round 8 §2.7-9): "A little pain" says "Ask again… |
| 202 | `b6c8b5d` | `9121ea2` | 2026-11-18 16:13 | Phase 9 item 4 (P1, judge round 8 §2.10): the emergency number follows the browser's lang… |
| 203 | `810f1f5` | `d1bd83f` | 2026-11-18 16:22 | Phase 9 item 5 (P1, judge round 8 §2.12-13): the handover note always prints the swallowi… |
| 204 | `db00cef` | `fcd7a38` | 2026-11-18 16:30 | Phase 9 item 6 (P0, judge round 8 §2.5, ADV-01-5): the cloud wait is cut from 25 s to 12 … |
| 205 | `3447b47` | `fc72edd` | 2026-11-18 16:38 | Phase 9 item 7 (P0, judge round 8 §2.6, IMPROVE F): the hybrid moment in one tap on Home:… |
| 206 | `7910b80` | `fa45041` | 2026-11-18 16:42 | Phase 9 item 8 (P1, judge round 8 §2.17): the cloud first-letter step gets its own fixed … |
| 207 | `e3e3db3` | `3aabba2` | 2026-11-18 16:43 | Phase 9 item 9 (P1, judge round 8 §2.18, ADV-02b-1): the person's own "Not now", a small … |
| 208 | `6b10a4d` | `21f3eac` | 2026-11-18 16:45 | Phase 9 item 10 (P2, judge round 8 §2.19): "How it works: 4 steps" is folded on the first… |
| 209 | `850d2e4` | `856919c` | 2026-11-18 16:47 | Phase 9 item 11 (docs truth, judge round 8 §2.14-15, §7.4): "Google's paid service" is go… |
| 210 | `74a5e94` | `b65d5aa` | 2026-11-18 16:50 | Phase 9 item 12 (judge round 8 §7.5): e2e-simple's "no Web Share" part waits for the diar… |
| 211 | `f188eab` | `66303fa` | 2026-11-18 16:55 | Phase 9, from the first full run on the production build: the person's "Not now" moves to… |
| 212 | `e23b493` | `6a8b406` † | 2026-11-18 17:08 | Phase 9, documents and runs: README "Added on 18 Nov, phase 9", CLAIMS rows 125 to 136, E… |
| 213 | `ffb2521` | `25a8d00` † | 2026-11-18 17:38 | Person's screen stands without scrolling in any font: caught on live e23b493 |
| 214 | `8a8eaf7` | `6d70e24` † | 2026-11-18 17:53 | Cloud wait limit 20 s, not 12 s: 12 s turned working live answers into "No card" |
| 215 | `da48b81` | `06e8b72` † | 2026-11-18 18:06 | Docs: live is 8a8eaf7 (README Deploy, JUDGES); live runs of 8a8eaf7 saved (e2e-simple --l… |
| 216 | `f6f6bbe` | `c3fc251` | 2026-11-18 18:07 | devlog: saved logs and DAY19 without local folder paths or an internal name (the Python t… |
| 217 | `cc53493` | `86c33bf` | 2026-11-18 18:12 | devlog/PUBLIC_HASH_MAP: rows 199 to 216 |
| 218 | `b3c16b9` | `4353314` | 2026-11-18 18:15 | scripts/e2e-speak.py: HEADED=1 runs it in a normal window |
| 219 | `55aeafb` | `8e254a2` | 2026-11-18 18:16 | Read aloud on the hosted copy 8a8eaf7: run 1 10/10, runs 2 and 3 refused by App Check |
| 220 | `7070a09` | `d30bbbb` | 2026-11-18 22:59 | Evidence: live cloud step 3/3 on a steady connection (3.0 s), README Deploy |
| 221 | `17968b3` | `4b397ab` | 2026-11-18 23:01 | Comments: an internal name out of two code comments (no change to the built app) |

Rows 100–106, 107–111, 112, 113–119, 120–127, 128–136, 137–145, 146–152, 153–159, 160–165, 166–171, 172, 173–183, 184–196, 197–198 and 199–216 were added on 17–18 Nov, when those commits reached the public history (the public-only commits 6fa68a2 and e18f518 are not working commits, so they have no row; rows 118 and 119: the working file firebase-debug.log, a local CLI log, was left out of the public copy).

Rows 212–215 (†): three saved logs under `devlog/evidence_live/` and two under `devlog/evidence_phase9/local/` carried a
local folder path (a Python traceback and the test runner's first line), and `devlog/DAY19.md` an internal name; the
public copy reads `<python site-packages>`, `<repo>` and "the live runs". Working commit `f6f6bbe` (row 216) made the
same change in the working history, so from there the two are identical again.

Rows 217–221, a note on names: three earlier public commit messages (the commit behind row of `3becc3e` and two
phase-walk commits) and two code comments carried an internal first name ("…'s walk of …"). The comments are fixed
from working commit `17968b3` (row 221). The three public commit messages were left as they are: changing them would
rewrite published history. From row 221 on, the replay also rewrites that name in commit messages.
