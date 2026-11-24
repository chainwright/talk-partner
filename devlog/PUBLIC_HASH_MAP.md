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
| 222 | `299652c` | `3b3cdf0` | 2026-11-18 23:01 | Devlog/PUBLIC_HASH_MAP: rows 217 to 221 and a note on an internal name in three earlier p… |
| 223 | `01bc49e` | `310a66d` | 2026-11-18 23:10 | Evidence: console screenshots, Gemini API Tier 1 and App Check for AI Logic in monitoring… |
| 224 | `47e786e` | `f8117a8` | 2026-11-18 23:40 | His turn: "I want to talk about…" with the family's people and places, a home-screen shor… |
| 225 | `864315e` | `bbc99a3` | 2026-11-18 23:48 | About them in a file: health notes only when ticked, Replace / Add / Cancel, an 8 MB limit |
| 226 | `9200649` | `de22c65` † | 2026-11-19 00:16 | Phase 10 docs and checks: README, CLAIMS rows 137 to 141, EVIDENCE, DAY20, phase10-shots … |
| 227 | `ce47da2` | `edcc806` † | 2026-11-19 00:16 | Phase 10 counts: README and DAY20 name the nine runs, JUDGES names 2902 unit tests |
| 228 | `e56fbce` | `935664f` † | 2026-11-19 00:25 | Live: ce47da2 (phase 10). Hosted runs: e2e-simple --live 1022/1022, pwa-check 32/32, e2e-… |
| 229 | `94ed945` | `4888a40` | 2026-11-19 00:26 | Devlog: saved logs of phase 10 without local folder paths (the Python traceback and the t… |
| 230 | `de5267a` | `85a8e85` | 2026-11-19 00:44 | "Not now" on the person's own start keeps a question the carer can ask: "Do you want to t… |
| 231 | `603f8a5` | `8262310` | 2026-11-20 15:01 | Phase 11, item 1: the cards show the 85 colour pictures made with Gemini, our SVG for the… |
| 232 | `12e6f27` | `d280798` | 2026-11-20 15:02 | Phase 11, item 2: the picture files work offline, and pwa-check proves it |
| 233 | `5abf1f6` | `8bca526` | 2026-11-20 15:04 | Phase 11, item 3: honest provenance for a mixed picture set |
| 234 | `e85d22e` | `a19337b` | 2026-11-20 15:23 | Phase 11, item 4: evidence for the pictures made with Gemini |
| 235 | `88c0747` | `e5d7370` | 2026-11-20 15:25 | Phase 11: chair, listen and go out without the faint frame around the object |
| 236 | `cb15e70` | `888fea9` | 2026-11-20 15:43 | Phase 11 follow-up: "something else" is our dashed drawing again on every card (84 pictur… |
| 237 | `7ea99ff` | `3332766` | 2026-11-20 16:14 | Live: the build of cb15e70 (phase 11 pictures); e2e-needs checks no broken picture instea… |
| 238 | `3adf877` | `1e77313` | 2026-11-22 08:11 | Phase 12, item 1: worried, scared, lonely and "something is bothering me" count as a low-… |
| 239 | `d5baac8` | `35cac67` | 2026-11-22 08:12 | Phase 12, item 2: About them never shows "Usually says no to 'Are you in pain?'" or offer… |
| 240 | `8aceee7` | `ef6683b` | 2026-11-22 08:15 | Phase 12, item 3: pain in an arm, a hand, a leg, the feet or the face first asks "Is it s… |
| 241 | `bbb393b` | `55fd866` | 2026-11-22 08:17 | Phase 12, item 4: pain on the needs board gets the call box with the number, and "Where d… |
| 242 | `3dea697` | `95dd4ac` | 2026-11-22 08:18 | Phase 12, item 5: a pain question left for later shows the signs that do not wait, a call… |
| 243 | `9fa1bb4` | `a26ae1d` | 2026-11-22 08:20 | Phase 12, item 6: the emergency number map covers the common regions; an unknown region g… |
| 244 | `824f247` | `a800562` | 2026-11-22 08:24 | Phase 12, item 7: eight pictures made again after judge round 9, and the curtains and the… |
| 245 | `642f521` | `4080290` | 2026-11-22 08:27 | Phase 12, item 8: the pain scale is three faces, "I need something" the four squares, "I … |
| 246 | `65364a6` | `3945754` | 2026-11-22 08:30 | Phase 12, item 9: the first screen asks for its six topic pictures before the script, wit… |
| 247 | `8ad5711` | `aa0ff0d` | 2026-11-22 08:34 | Phase 12, item 10: "See the AI at work" above the fold at 390 x 844, with a two-line stri… |
| 248 | `1f2ad00` | `47ae0d0` | 2026-11-22 08:36 | Phase 12, item 11: the handover note has a "STILL OPEN" block for the care questions not … |
| 249 | `19d34d0` | `c95f4f3` | 2026-11-22 08:36 | Phase 12, item 12: the visit page's "Pain: none entered." adds "That does not mean there … |
| 250 | `ff410f4` | `399128d` | 2026-11-22 08:38 | Phase 12, item 13: after "Stop waiting" the footer says the question may have left, as th… |
| 251 | `0140b69` | `6194125` | 2026-11-22 08:42 | Phase 12, item 14: a crisis choice for the person, "I can't go on", and a calm safety scr… |
| 252 | `cb7ea5d` | `ea336b2` | 2026-11-22 08:42 | Phase 12, item 16: "Try it with the Millers, a sample family" on the first screen |
| 253 | `426abce` | `0c0784f` | 2026-11-22 08:44 | Phase 12, item 15: the stale doc lines of round 9 fixed, a 12-line phone path first in JU… |
| 254 | `46f0b76` | `00be36c` | 2026-11-22 08:54 | Phase 12, item 10 follow-up: put back the stylesheet rules that item 10's edit dropped |
| 255 | `a66310b` | `83199c2` | 2026-11-22 08:54 | Back from the carer's answer passes over every person's screen, not only the one handed o… |
| 256 | `945dd37` | `fc81fbc` | 2026-11-22 09:02 | Revert the Back change of a66310b: a person's screen is a step on the way back, by design |
| 257 | `c901148` | `630f68f` | 2026-11-22 09:11 | Phase 12 walk: the crisis screen keeps the carer's answer under it; the walk script |
| 258 | `9dc8060` | `7f5ad24` | 2026-11-22 09:32 | Phase 12, item 10: at 360 px the AI strip folds, so the first row of topics stays above t… |
| 259 | `bfaf253` | `ef957eb` | 2026-11-22 09:54 | Phase 12: evidence, CLAIMS rows 145 to 156, README section and devlog/DAY22.md |
| 260 | `e26b899` | `c22e29e` | 2026-11-22 10:12 | Live: the build of 9dc8060 (phase 12); phase12-walk waits for the curtain pictures; Read … |
| 261 | `4360c94` | `7f33ff2` | 2026-11-22 10:55 | Read aloud on the hosted copy: 3 of 3 (normal window, no token); the earlier dev-server r… |
| 262 | `6c20aa9` | `ed40301` | 2026-11-22 11:02 | Phase 12b, item 1: the pain scale shows pictures of pain in the Faces Pain Scale style, n… |
| 263 | `08aaa3b` | `81a3e3e` | 2026-11-22 11:03 | Phase 12b, item 2: after one "no" to the weakness question the carer checks the arms and … |
| 264 | `122566e` | `09144a6` | 2026-11-22 11:04 | Phase 12b, item 3: About them never shows a usual "no" to a drink or food question, and n… |
| 265 | `96808ec` | `76c41c6` | 2026-11-22 11:06 | Phase 12b, item 4: a past day with fewer than 6 drinks entered is a line, with "tell the … |
| 266 | `8b3363b` | `60483ed` | 2026-11-22 11:08 | Phase 12b, item 5: after "something else", where the AI step goes online, "Find more choi… |
| 267 | `a3bccd4` | `bc46bcc` | 2026-11-22 11:10 | Phase 12b, item 6: pain as a whole-body grimace, wait as an hourglass, show me as an angl… |
| 268 | `89e82ed` | `61be127` | 2026-11-22 11:12 | Phase 12b, item 7: a confirmed yes to sudden weakness or numbness gets "Call [number] now… |
| 269 | `1833ad3` | `c656645` | 2026-11-22 11:14 | Phase 12b, item 8: a calm "stop for now" beside "I can't go on" on the feelings card, whi… |
| 270 | `03d7a00` | `de2f293` | 2026-11-22 11:16 | Phase 12b, item 9: on a phone "Try it with the Millers" opens the simple view with the sa… |
| 271 | `619adf4` | `68c479e` | 2026-11-22 11:18 | Phase 12b, item 10: the first screen's red box names the emergency number, with "Change i… |
| 272 | `6b340ba` | `7591eae` | 2026-11-22 11:18 | Phase 12b, item 11: a pain question left for later stands directly under "Needs something… |
| 273 | `51470a8` | `0ea9498` | 2026-11-22 11:43 | Phase 12b: the walk covers the changed screens (pictures loaded first); e2e-simple follow… |
| 274 | `b8f5655` | `070bd61` | 2026-11-22 12:15 | Live: the build of 51470a8 (phase 12b); Read aloud on it refused by App Check after a day… |
| 275 | `a8ee978` | `3407d2a` | 2026-11-23 14:02 | Read aloud on the hosted 51470a8: 1 refused by App Check, 2 of 2 after it passed |
| 276 | `40d43ec` | `d171f51` | 2026-11-23 14:32 | The sample family never reads or writes the family's own data, on a phone or a desktop |
| 277 | `629dcba` | `5599d6f` | 2026-11-23 14:33 | Pain as the whole upper body in pain, not a stomach ache (picture made with Gemini on 23 Nov) |
| 278 | `1f6ee8c` | `a927805` | 2026-11-23 14:50 | Pain picture prompts: exact words of the two rejected options |
| 279 | `39e8f33` | `008f884` | 2026-11-23 15:29 | Pain picture: arms down, fists clenched, not crossed arms that look like 'too cold' |
| 280 | `60fc893` | `36ff036` | 2026-11-23 15:45 | Docs: live is 39e8f33 (pain picture, sample family kept apart); hosted checks and logs |
| 281 | `5b18050` | `968496a` | 2026-11-23 19:01 | Weakness check: after 'no' or 'not sure' the arms-and-smile line is a red box above 'Next', with the call but… |
| 282 | `cfc1d89` | `c6778f9` | 2026-11-23 19:04 | Chest or head pain, or a breathing / weak / numb yes: every 'how bad' end says call now, whatever the amount;… |
| 283 | `20a8424` | `457f927` | 2026-11-23 19:05 | Doctor visit: an answer that can be urgent stops the questions; the carer sees the call box with 'Go on with … |
| 284 | `8139f5f` | `66a60e2` | 2026-11-23 19:06 | Mood: a confirmed 'worry' (and worried, scared, anxious, lonely, a yes to 'something bothering you') counts o… |
| 285 | `48e3f13` | `beb51c9` | 2026-11-23 19:08 | Left for later: kept through 'Ask it again' and 'change topic' over pain; only 'Did you find out? Yes' or a c… |
| 286 | `de8a3c2` | `bb1d782` | 2026-11-23 19:09 | Pain picture: leaning forward, open hands on the knees, no teeth, no fists (the one with fists read as angry … |
| 287 | `dc7aa31` | `e94942f` | 2026-11-23 19:11 | Crisis line: About them first, else by the emergency number (999 Samaritans, 000 Lifeline, 911 988, 111 1737)… |
| 288 | `570ea8d` | `b8705b5` | 2026-11-23 19:13 | Stroke sign and 'something's wrong' in the next-carer note, 'What stands out' (id sign) and the visit page; '… |
| 289 | `db7c9d5` | `4b9661d` | 2026-11-23 19:15 | Answer check leaves rest and sleep answers alone; one intended-purpose line on Home, the sudden page and the … |
| 290 | `40f0592` | `c42a0af` | 2026-11-23 19:19 | Cloud failure path: App Check first within the same 20 s; a refusal says at once what to do and offers the ru… |
| 291 | `adc5f60` | `40d8593` | 2026-11-23 19:20 | No claim to the Faces Pain Scale: three faces from calm to crying, drawn for this app; prompt records kept as… |
| 292 | `24c3613` | `7e32371` | 2026-11-23 19:23 | Docs: judge round 10 FALSE/OVERSTATED lines fixed (refusal line, back button, test count, chest pain); README… |
| 293 | `ca04bc9` | `f5a9b5e` | 2026-11-23 20:30 | Walks for phase 13: weakness no / not sure, chest pain, the visit stop, the crisis line by number, later kept… |
| 294 | `c7b1d9b` | `543b0c2` | 2026-11-23 20:45 | Docs: live is ca04bc9 (phase 13); hosted checks and logs |
| 295 | `7e2a404` | `1e06aa6` | 2026-11-23 20:46 | Docs: phase 13 live walk count 335/335 |
| 296 | `91609c5` | `6dfc5f0` | 2026-11-23 21:02 | Find more choices (Google's AI, after your yes): the second button of a topic card |
| 297 | `fb9a725` | `514a401` | 2026-11-23 21:04 | Read aloud offered before handing over: one button under the main one while it is off |
| 298 | `175e5d2` | `8de3fdc` | 2026-11-23 21:06 | eval-heldout: a cloud leg (--cloud) and the time to decide on the rules leg |
| 299 | `1d86854` | `1a8828e` | 2026-11-23 21:12 | Back from a card made after the consent sheet's yes lands on the card it was asked from |
| 300 | `5381661` | `5ba8a47` | 2026-11-23 21:14 | Narrowing on a browser App Check refuses: says so, and the consent sheet does not come back by itself |
| 301 | `4b38b80` | `4382174` | 2026-11-23 21:28 | A tapped question opens its card at the top |
| 302 | `da0f6a5` | `e6288a5` | 2026-11-23 21:49 | Docs and walks for phase 14: the three legs measured, the AI step at taps 3 and 4 on a phone |
| 303 | `479ce07` | `dab35e7` | 2026-11-23 22:14 | e2e-simple: the handover worst cases sit 23 h ago, not at fixed clock times, so the check holds after 21:00 |
| 304 | `e9e898a` | `f7e9a27` | 2026-11-23 22:29 | Docs: live is 479ce07 (phase 14); hosted checks and logs |
| 305 | `7bc3a05` | `c6c15bf` | 2026-11-24 00:07 | Sample family: Beth (sister) and ginger biscuits, so "B" gives Beth, Bo, biscuits as the docs and the video s… |
| 306 | `70f83c3` | `330c55a` | 2026-11-24 00:46 | Phase 15: the fixes of judge round 11 (sample family, the Find-more wait, health lines for others) |
| 307 | `cf4aa33` | `5c1d49c` | 2026-11-24 00:46 | Docs for phase 15: judge round 11's FALSE / OVERSTATED lines fixed; CLAIMS rows 157 to 180 |
| 308 | `20d2b71` | `f3d4ccb` | 2026-11-24 01:03 | Docs: live is cf4aa33 (phase 15); hosted checks and logs |
Public-only commit after row 295: `9f2d60a` (DISCLOSURE: no claim to a published pain scale, as in phase 13; the public DISCLOSURE is its own file).

Rows 100–106, 107–111, 112, 113–119, 120–127, 128–136, 137–145, 146–152, 153–159, 160–165, 166–171, 172, 173–183, 184–196, 197–198 and 199–216 were added on 17–18 Nov, when those commits reached the public history (the public-only commits 6fa68a2 and e18f518 are not working commits, so they have no row; rows 118 and 119: the working file firebase-debug.log, a local CLI log, was left out of the public copy).

Rows 212–215 (†): three saved logs under `devlog/evidence_live/` and two under `devlog/evidence_phase9/local/` carried a
local folder path (a Python traceback and the test runner's first line), and `devlog/DAY19.md` an internal name; the
public copy reads `<python site-packages>`, `<repo>` and "the live runs". Working commit `f6f6bbe` (row 216) made the
same change in the working history, so from there the two are identical again.

Rows 217–221, a note on names: three earlier public commit messages (the commit behind row of `3becc3e` and two
phase-walk commits) and two code comments carried an internal first name ("…'s walk of …"). The comments are fixed
from working commit `17968b3` (row 221). The three public commit messages were left as they are: changing them would
rewrite published history. From row 221 on, the replay also rewrites that name in commit messages.

Rows 222–229, added on 19 Nov: rows 222 and 223 reached the public history on 18 Nov without a row. Row 226: at that
commit `npm run check` fails one docs test (the README's phase 10 counts were still a placeholder); row 227 fills
them in and is green. Rows 226–228 (†): saved logs of phase 10 carried a local folder path; the public copy reads
`<python site-packages>` and `<repo>` from the start, and working commit `94ed945` (row 229) made the same change,
so from there the two are identical again.
