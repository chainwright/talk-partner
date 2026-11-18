# Talk Partner

About 2 million people in the United States live with aphasia[^1], and the people who talk with them every day are
rarely taught how: when practising speech-language pathologists sent in samples of their therapy goals, fewer than 3%
involved any communication partner training, although 97% of those surveyed said they do some with families, mostly
without a written goal[^2]. What that leaves at stake, in the words of the Aphasia Institute's page on Supported
Conversation: aphasia "masks a person's inherent competence", and people with aphasia "need others to believe they
are competent and have more understanding and social skills than may be apparent"[^3]. A partner who answers for
the person, or tests them, is the everyday way that competence stays hidden (the last sentence is our reading, not
the Institute's words).

After a stroke, many adults with aphasia understand what is said but can't find the words to answer.
Talk Partner helps **the partner** ask the way a speech therapist would: it turns the partner's own question into a
written-choice card (a keyword, two choices, pictured where we have drawn a picture, an escape every time, a
tick/cross check) and gives the partner the exact line to say. It never picks or confirms the person's answer: only
their tap does. Pictures today: yes / no, feelings, the body map, people (a photo or an initial), coffee and tea, the
ways out, and the eight needs of the quick-needs board. The family's own places and foods ("lake", "pot roast") are
words for now (`PICTOGRAMS.md`).

Based on Supported Conversation for Adults with Aphasia (SCA) principles. Not a therapy, not a diagnosis.

## Where the AI runs (Firebase AI Logic hybrid inference)
**Family data → `ONLY_ON_DEVICE`; the stripped question → `PREFER_IN_CLOUD`, which falls back to Gemini Nano when
offline; `inferenceSource` drives every badge.** Every model call goes through Firebase AI Logic, the
optional microphone included (it sends the partner's recorded question to Gemini, `ONLY_IN_CLOUD`, for its words). The
code is in **`web/src/ai/firebaseEngine.ts`**. See [Added on 17 Nov](#added-on-17-nov-quick-needs-voice-input-feedback).

| Step | Gets | Mode | Why |
|---|---|---|---|
| Private card | question + the family's About-me lists | `ONLY_ON_DEVICE` | Family data must never fall back to the cloud. `PREFER_ON_DEVICE` would send this prompt to the cloud while Gemini Nano is missing or downloading. |
| Stripped card | the question with every About-me word swapped for "Person A", "Place A"… and a word that looks like a name the family didn't list (a capitalised word, the word after a title such as "Dr.", a lowercase word that is not an everyday English word) swapped for "Name A" | `PREFER_IN_CLOUD` | Holds no profile data, so an offline fall-back to the device is safe. |

The same question through the two steps, in our recorded run: "What do you want to do this weekend?" gives
*lake / church* on this computer (the family's own places, read from About me by Gemini Nano; nothing sent) and
*stay home / go out* from the cloud, which gets the question only. The details are under
[Where the AI runs, in detail](#where-the-ai-runs-in-detail).

Built for #BuildHybridAI 2026. Status on 17 Nov 2026, in three lines:
- **What runs:** the hosted copy is at <https://talk-partner.web.app/#/demo> (the full view, in judge mode; the bare address opens the simple view for families, added 17 Nov). It turns the partner's question into a choice card, corrects the partner where a rule can tell, and never picks the answer; open questions are answered on this computer by Gemini Nano from About me, or by the cloud from the question alone. Since 17 Nov also a quick-needs board (no AI), a microphone for the partner's question (through Firebase AI Logic, in the cloud) and a feedback form (Cloud Firestore), all untried by anyone they are for.
- **One number, at commit `7dd16a1`:** on the 18 open questions of our own labelled set, rules alone make no card (0 of 18); the on-device model made a card matching our label for 15, 16 and 15 of 18 in three runs (17 Nov, the last commit that changes code), 12, 13 and 12 of them with the family's own people, places or foods. Three runs an hour earlier, at `2aeb1d0`, gave 16 each time, and so did the three before that day's rule changes, at `c346d3d`: the model's answers vary, so the number is 15 to 16. Our labels and a set the rules have since been changed around: not a held-out test, not a trial with people.
- **Every claim with its status:** `CLAIMS.md` (and `JUDGES.md` for the 60-second path, `EVIDENCE.md` for claim → file, command, saved output). No video yet, no trial with people yet. How it got here, day by day: `devlog/` (the long form of this paragraph is kept in `devlog/DAY12.md`).

## Added on 17 Nov: quick needs, voice input, feedback
All three were added on 17 Nov 2026. **No carer and no person with aphasia has used any of them**; what is tested is
the code and the live site (`CLAIMS.md` rows 40, 41 and 42).

**Quick needs.** One button in the top bar of every partner screen (or the address `#/needs`) puts a fixed board on
the person's screen: *toilet, drink, food, pain, tired, too hot, too cold, call someone*, and *something else*. Each
tile is one of our own line pictograms with its word. A tap is checked like every choice ("So: toilet. Right?" with a
tick and a cross); after the tick the person's screen shows the need and nothing else, and the partner's side gets one
short line for it ("Go now. The rest can wait."; after *pain*, one tap asks "Where does it hurt?", the body card).
*Something else* is checked the same way and hands back to the question box and "We're stuck". The board is made in
code (`core/needs.ts`, which imports the copy and the types and nothing else): no model, no About me, no request, so
it works with no connection **once the page is open**. There is no offline install: a page that has never loaded, or
is reloaded with no network, does not open. Nine tiles is more than the two or three of a card; that is our choice
for needs that cannot wait for a question to be typed, not something the sources measured.

**Voice input, for the partner's question only, through Firebase AI Logic.** A microphone button sits between the
question field and "Make card". A press records one short clip (15 seconds at most; a second press stops it). The
clip is made into a 16 kHz WAV in the browser and sent once to Gemini through `firebase/ai` (`ONLY_IN_CLOUD`, asked
only for the words). The words fill the field and stay there: nothing is submitted until the partner has read them
and pressed "Make card". The app never records or recognises the person's speech. **The sound goes to Google's
cloud, names included:** the on-device model cannot take sound, so the notice on the first press says "cloud" and
the app records only after a yes. The session figure counts every byte of sound handed over, and a card made from a
spoken question says so. There is no other speech recognition in the app (the browser's Web Speech API, tried for a
few hours on 17 Nov 2026, was removed because it is AI outside Firebase AI Logic; a test fails the build if it comes
back). Checked on the live site with a recorded question in Chrome 157 and Chromium 148:
`devlog/evidence_live/voice-feedback_live_2026-11-17_40fedec/`. No partner or carer has used it yet.

**Feedback, kept in Cloud Firestore.** A small "Send feedback" form on the partner's side and on "How this works":
a note of up to 1000 characters, an optional role and email, and the line "Please don't include patient details".
One document per note, with the server's time, the app version and the commit. `firestore.rules` allow create only,
with every field checked again on the server; nobody can read, change or delete notes from a client (the owners read
them in the Firebase console). Rules tested on the emulator (`npm run test:rules`, 37 cases) and against the deployed
rules (`node scripts/rules-check.mjs --live`, 25 refusals).

## Changed on 17 Nov after the second rehearsal run
A second run of our rehearsal set E (simulated partners and answers, not people; its numbers are not quoted anywhere)
left seven things. Each was fixed as a class and tested on new phrasings (`tests/unit/sim-e2-classes.test.ts`, 63
tests; none of them is a sentence of that set). What changed, with the limit of each:

- **No wait for a card the code already has.** An either-or whose two options the code reads whole is made at once,
  with no model call ("No AI needed"). Before, 12 such cards waited about 3 s for the on-device model and then
  showed the pair read in code. The model is still asked when the reading breaks off, and "whole" is a check of where
  a side ends, not of its sense (`CLAIMS.md` row 2).
- **The family's own entries first.** They stand before a model's general words, and exactly three of them share one
  card at "2 at a time" (in today's on-device run "Where shall we go on Sunday?" read *lake / church / hardware
  store*). Four or more are paged as before; nobody has checked three tiles at that level with a person with aphasia
  (row 14).
- **A general word gives way to the family's own kind of it**: "jacket" to "tweed jacket", "chair" to the one
  rocking chair in About me. Only when About me holds exactly one such entry, by its last word or a short table. The
  sample family has none, so its cards are unchanged (row 44).
- **"How are you feeling?"** keeps good / so-so / bad, and its way out now leads to *sad / tired / in pain*. "Sad" is
  on the second page, not the first (row 34).
- **"Where do you want to go?" with cloud help only** offers the family's places first, the cloud's general ones
  after; the cloud still gets the question alone. Only for a plain question about going out (row 43).
- **Headlines.** Options that share no word and are each something to do get "what to do" where the card said "which
  one"; a yes / no headline no longer reads "that's one you liked". "Which one" remains for two long things with
  nothing in common (row 1).
- **"…, or is Carol watching her show?"** offers "Carol's show", not "watching her show" (row 31).

Checked at commit `30db57a` on localhost: unit tests (1858), `e2e:noconfig` 25/25, `e2e-cloud.mjs` 28/28,
`e2e-ondevice.mjs` 43/43 in a Chrome with Gemini Nano, `shots.mjs` 139/139 (`devlog/evidence_r10/`); five of the new cards were also
asked by a script in Chromium 148 and Chrome 157 at `66c4574`, with no page error (not saved as a log). **The hosted copy has them since 17 Nov, 19:05 UTC** (the first attempt at 18:42 UTC stopped at the Firebase sign-in, `deploy_attempt_2026-11-17_30db57a.txt`): <https://talk-partner.web.app> serves the same bundle as a local build of `4d7edee`, `e2e-cloud.mjs --url` 28/28 and `e2e-needs.mjs --url` 12/12 there at 19:06 UTC (`devlog/evidence_live/`), and the page loads in Chromium 148 and Chrome 157 with no crash and no page error. **The cloud step did not hold that evening:** the organiser of our fifth review ran the same script against the hosted copy at 19:53 and 19:54 UTC and got 17/27 and 26/28 (one cloud card of four; the weekend card took 28.2 s, "who to call" made no card, Remote Config timed out once), and three runs of ours at about 20:20 UTC got 16 or 17 of 27. The cause and the change are under [Where the AI runs, in detail](#where-the-ai-runs-in-detail). After the change (build of `2c5673e`, 20:55 UTC) the cloud step still made no card from our machine: 18/27 at 20:56 and 14/27 at 21:17 UTC, the attestation refused both times. The classes were found by a simulation and
fixed by the people who read its results; a new sealed set would be the real test.

It also corrects **the partner**, quietly, where a rule can tell: two questions in one become "One thing at a time: showing the first"; a memory question becomes "You know this one: tell, don't test."; a "you don't want …, do you?" question is asked the plain way ("Do you want …?"), so that a yes on the card means yes. The person is never corrected. The partner screen opens on that: "It corrects how you ask. It never answers for them." (the limits of both halves are in `CLAIMS.md`, row 11).

## For judges: 60 seconds

```
npm install && npm run dev        # then open http://localhost:5179/#/demo
```
No account, no sign-in. What you get depends on what the copy has:

| This copy has | What works |
|---|---|
| nothing (a bare clone, no `.env.local`) | every card that code decides alone: coffee or tea, yes / no, the feeling scale, the body map, the memory coaching, "We're stuck". An open question gets an honest "No card". Also the quick-needs board (the microphone and the feedback form need project settings and are not there). The page contacts no host but the app's own (`npm run e2e:noconfig`, 25 checks, the board with the network switched off) |
| the Firebase web config in `.env.local` (see **Run**) | the above, plus cloud help for open questions once you turn it on |
| the config and desktop Chrome with Gemini Nano | the above, plus the private step on this computer: open questions answered with the family's own names and places, nothing sent |

Hosted copy: <https://talk-partner.web.app/#/demo>. It is the build of commit `188f03b`, deployed 17 Nov 2026, 23:04 UTC (the simple view at the bare address is in it), with our project settings, so it is the second or the third row of this table, depending on your browser. **Cloud help on the hosted copy is not reliable as of 17 Nov, 23:11 UTC:** from our machine reCAPTCHA Enterprise refuses the App Check attestation (HTTP 403 at 21:20 UTC; "ReCAPTCHA error" in the console at 23:11), and without a valid App Check token the service gives no answer, so `e2e-cloud.mjs --url` got 18/27 and 14/27 at the build of `2c5673e` and 15/27 at this one (the same script on localhost, with the debug token, 28/28 at this commit); the card says "Cloud help could not confirm this browser". We do not know yet whether a browser on another network passes (`devlog/evidence_live/appcheck_probe_2026-11-17_2c5673e.md`). Both rows were recorded on the hosted copy at earlier builds (`devlog/evidence_live/`): the cloud step in a browser without the model, last at the build of `4d7edee` (28/28 at 19:06 UTC), and the on-device step in a Chrome that has Gemini Nano at `deebc94` (at `30db57a` the on-device script was run on localhost, `devlog/evidence_r10/`; the labelled set at `7dd16a1`, on localhost; on the hosted copy the first step was last watched by hand at the build of `8810f8f`: `devlog/DAY13.md`). In a browser without Gemini Nano the "Sample family" line ends with **See what the on-device step makes →**: a recording of that step from our machine, labelled as a recording.

`#/demo` loads a made-up family (Frank; Carol asking) and opens with one card already made, so the first thing on screen is a card and not an empty pane: "Do you want coffee or tea?", read in code, no model, nothing sent (its chip is lit). **Then the first step runs by itself, with no click:** as soon as the on-device model has loaded (about 3 s when it is already in the browser's memory, 16 to 22 s right after a browser start; the card takes about 3 s more, and the status line says where it stands), the app asks "What do you want to do this weekend?" and Gemini Nano makes the card on this computer from About me ("lake / church" in the recorded run), with the badge "On this computer" from the SDK's `inferenceSource`. That step is made with cloud help left out, whatever the setting, so nothing can be sent by a step you did not click; it stands down if you ask or type anything first; and if the model gives no card, the first card stays and the status line says so. **In a browser with no Gemini Nano nothing runs by itself:** the status line says "No Gemini Nano in this browser, so the on-device step can't run here. The card shown is made in code." (or "… is not downloaded …", with the download link), and everything else is as before. Under the question box are one-tap questions, in three groups (open question: a model proposes / the app corrects the partner / read in code, no AI); each chip shows the short form, the hover text has the full question and what to look for. Under every card, in reading order: the badge with what left this computer, the coaching line if any, the line to say, the card on the right, then **Why this card**, **Where each step ran**, **What was sent**, the **privacy receipt** and the session line. In judge mode those panels are one closed line under every card, the first included, **"How this card was made: …"** (who decided; how many choices code kept, added and dropped); one click opens all three, and the receipt is closed below it (until 17 Nov, evening, they stood open under the first card). Click these, in order:

| Click | What you see | Badge |
|---|---|---|
| **What do you want to do this weekend?** (the first chip; with Gemini Nano this card has already appeared by itself) | an open question: the choices are not in the question, so a model has to propose them. **With Gemini Nano in this Chrome:** the private step runs on this computer with the About-me lists and the card offers the family's own places ("lake / church" in the recorded runs); the badge line names them: "nothing left this computer · lake, church from About me". **Without Gemini Nano:** no card, and an offer to use cloud help with the question only | On this computer, or No card |
| **What would you like for dinner?** | the same on this computer: the family's own foods, "pot roast / chili" | On this computer, or No card |
| **Cloud help: off** (top bar) → read the consent screen, tick, **Turn on cloud help**, then the weekend and dinner questions again (in a browser without Gemini Nano, or the card stays on this computer) | the stripped question goes to Gemini through Firebase AI Logic (`PREFER_IN_CLOUD`), which has never seen About me: the choices are general ("stay home / go out", "meat / fish" in the recorded runs; the words vary). This is the difference between the two steps, on one question; "What was sent" shows the question as it went ("Partner asks: …", after the swap) and the size of the request, and "Show the exact request" opens the request this app handed to the SDK; the **privacy receipt** below the judge box shows its size and the names withheld | Cloud help (question only) |
| **Who should we call tonight?** (with cloud help only: when the cloud answers; in the organiser's two runs of 17 Nov it made no card) | *Jenny / Tyler / someone else*; Carol lives there, so she is not offered. This card looks the same with either step: on this computer the model reads the names in About me; with cloud help only, the cloud answers "family / a friend" and code on this computer puts the names in. It shows the rule, not the model | On this computer, or Cloud help (question only) |
| **Do you want coffee or tea?** | the card is read from the question in code; the pane on the right is what the person sees ("Show to person" makes it full screen). Under it, behind "How this card was made", **Why this card**: one line with what the model proposed (nothing here: no model needed), what code kept, added or dropped and by which rule, and who decided | No AI needed |
| **How was therapy today, and did you eat?** | the coaching line "One thing at a time: showing the first"; the first question is a feeling scale; **Next: second question** shows "Did you eat?" as yes / no | No AI needed |
| **We're stuck** (on any card) | the fixed repair card on the person's side: show me / write it / draw / later / change topic, and the partner line "Let's try another way"; a tap gives the partner the next move for that way; "Back to the choices" returns | No AI needed |
| **Where does it hurt?** | body map, two steps, never AI; "your left arm" is the person's own left | No AI needed |
| **What year did we get married?** | no card: a memory question is never a quiz; the coaching line "You know this one: tell, don't test" and the line to say instead | No card |
| **Should we ring Jen or Tyler?** | the either-or is read in code and nothing is sent; "Jen" is a nickname from About me, so the tile gets the person picture. (The swap of a name for `Person A` shows only when a question with a name goes to cloud help: type "What should we get Jenny for her birthday?" with cloud help on and no Gemini Nano; recorded in `devlog/ondevice_proof_1/RUN_LOG.md` §5) | No AI needed |

**What each badge means.** The two AI badges ("On this computer", "Cloud help") and the offline one come from the SDK's `inferenceSource` for that call; "No AI needed", "Made in code (AI answer not used)" and "No card" come from the card rules:
- **On this computer**: the private step (`ONLY_ON_DEVICE`) answered and the SDK reported `ON_DEVICE`.
- **Cloud help (question only)**: the stripped step (`PREFER_IN_CLOUD`) answered and the SDK reported `IN_CLOUD`. Only then does "What was sent" say *sent*.
- **Ran on this computer (offline)**: the stripped step fell back to the device (SDK reported `ON_DEVICE`); nothing left.
- **No AI needed**: code decided the card and no model was called for it (yes / no, an either-or whose two options the code reads whole, three options named in the question, feeling, pain, body map, memory, an open "when" question).
- **Made in code (AI answer not used)**: a model was asked and the card is code's all the same. Since 17 Nov this is rare: only an either-or whose reading in code breaks off ("put the radio" + "on for you", "walk down" + "to the library", the tail of a name) still asks the on-device model to copy the two options out of the question; if its copy fails the check, the pair read in code is used, and nothing of the model's answer is on the card: not the choices and not the headline (`tests/unit/sim-classes.test.ts`, group 12). Until 16 Nov such a card read "No AI needed" although it had waited about 3 s for the model (`core/receipt.ts`, `badgeKind`; `tests/unit/sim-e-classes.test.ts`, group E-10). When the model's copy is what the card shows, or only a model read the question as yes / no, the badge names the step that ran. Before 17 Nov every either-or longer than nine words or with a comma asked the model: in our second rehearsal run of set E, 12 cards on this computer waited about 3 s and then showed the pair read in code. Now a pair whose sides stand whole in the question is the card at once (`wholePair` in `core/rules.ts`; `tests/unit/sim-e2-classes.test.ts`, group E2-1). The limit: "whole" is a check of where each side ends, not of sense, so a clumsy reading that ends cleanly ("cupboard / tartan one" for "the big blue blanket from the cupboard or the tartan one") is shown at once too, with no model's copy to replace it.
- **No card**: blocked; the partner is told to ask normally.

After the badge, one line that is always on screen says what left this computer for this card ("nothing left this computer", or "the question left this computer, 1 name and 0 other About me words swapped out", or, when a cloud request was made and failed, "cloud help was asked and failed: the question may have left this computer"); it is read from the same recorded request body the receipt counts. On a card made on this computer it also names the choices that came from About me.

Under every card, **"Where each step ran"** lists the private step, the cloud step and the rules, each as *ran on this computer / ran in the cloud / did not run (why) / failed (why)*. A step that did not run says so. In judge mode it is behind the one summary line under every card; on the partner screen it sits, with "Why this card", "What was sent" and the receipt, inside one closed fold, **"How this card was made"**, so the partner sees only the question, the line to say, the card and the actions. Nothing is removed, only folded.

**One number.** In judge mode, under the chips, one figure at display size says what left this computer this session. It reads "0 bytes left this computer" for as long as no cloud request has been handed to the SDK: that is the case on a bare clone, with cloud help off, and for every card made on this computer; once cloud help is on, the app has asked Firebase Remote Config for its settings, so the line then reads "0 bytes of any question left this computer" and names that request as not counted (in our recorded runs no host but the app's own was contacted for any of them; loading the page itself is not counted, and the line says so). Once the cloud has answered, the figure is the size of the requests the app handed over and it is called "handed to cloud help"; a request that failed after it was handed over is shown as "may have left", never as 0. The paragraph "How this is counted" is folded behind one link in the receipt.

**Privacy receipt** (judge mode and `#/how`): per session, the size of the requests this app handed to the SDK for the cloud step (the question after the swap, the fixed instructions, the schema, the model name and mode) and the names withheld. It is counted on the recorded request (`core/receipt.ts`), not estimated from the question, and the counted text is in the export so you can check it by hand. It is not a capture of the wire: the SDK's own format, the headers and the App Check token are not counted. "Checked after" searches the sent text once more for About-me words and photo bytes.

**Why this card** (every card; one line, open on `#/how`, behind the summary line under every card in judge mode, inside "How this card was made" on the partner screen): the model's parsed proposal (topic, kind, choices, copied options) and which step made it, the labels code kept, the labels code added and where from ("people from About me"), every proposed choice that is not on the card with the rule that removed it ("negative wording", "lives here: never offered for a call or a visit", "over the limit at this support level"), who decided, and where the headline came from. `Card.why` is written in `core/pipeline.ts` at the moment each rule runs, on the values it ran on; `tests/unit/day5.test.ts` checks that every kept or added label is on the card and every dropped one is not.

**States you can force:** cloud leg = turn on cloud help (`#/cloud`); no-model state = any browser without Gemini Nano shows the private step as "did not run" on every open card; offline fall-back (needs Gemini Nano in this Chrome) = with cloud help on, switch the network off and type "Which shirt for the doctor?": the badge reads "Ran on this computer (offline)". Without Gemini Nano there is nothing to fall back to: the cloud step shows as failed and there is no card.

**Honesty notes.** The on-device step was first run on 16 Nov 2026 (Gemini Nano in desktop Chrome 157, through Firebase AI Logic `ONLY_ON_DEVICE`); the recorded run, with the SDK's `inferenceSource` per call, the hosts contacted and screenshots, is the run saved in `devlog/ondevice_proof_1/` (`RUN_LOG.md` there), made by `scripts/e2e-ondevice.mjs`. It is one machine and one made-up family, not a measurement of card quality. The sample family is made up. The pre-period prototype is listed in `DISCLOSURE.md`; the git tag **`pre-contest`** marks the import commit that holds exactly the carried-over files.

### Every Firebase AI Logic call, by file and line
Checked by `tests/unit/judge-path.test.ts` (each line must still contain the snippet), so this table cannot go stale silently.

| Where | Line holds | What it is |
|---|---|---|
| `web/src/ai/firebaseEngine.ts:38` | `from 'firebase/ai'` | the only import of the SDK in the repo (guarded by `tests/unit/no-direct-model-calls.test.ts`) |
| `web/src/ai/firebaseEngine.ts:82` | `getAI(` | the AI Logic instance of the private step: its own Firebase app with no App Check, so a card made on this computer contacts no host |
| `web/src/ai/firebaseEngine.ts:88` | `getGenerativeModel(` | private step model |
| `web/src/ai/firebaseEngine.ts:89` | `InferenceMode.ONLY_ON_DEVICE` | its mode: family data must never fall back to the cloud |
| `web/src/ai/firebaseEngine.ts:101` | `getAI(` | the AI Logic instance of the cloud step (Gemini Developer API backend), on the app that has App Check; it uses the App Check session token (limited-use tokens per request were tried on 17 Nov and taken out the same day, see "Where the AI runs, in detail") |
| `web/src/ai/firebaseEngine.ts:107` | `getGenerativeModel(` | stripped step model |
| `web/src/ai/firebaseEngine.ts:108` | `InferenceMode.PREFER_IN_CLOUD` | its mode: no profile data, so an offline fall-back to the device is safe |
| `web/src/ai/firebaseEngine.ts:135` | `initializeDeviceModel(` | the one-time download of the private helper, from a user gesture |
| `web/src/ai/firebaseEngine.ts:149` | `generateContent(` | private step call (also the warm-up: one fixed sentence, no About me) |
| `web/src/ai/firebaseEngine.ts:150` | `inferenceSource !== InferenceSource.ON_DEVICE` | the private step rejects any answer not from the device |
| `web/src/ai/firebaseEngine.ts:165` | `getGenerativeModel(` | summary step model ("Today in short", `core/summary.ts`): the day's answers, on the same no-App-Check app as the private step |
| `web/src/ai/firebaseEngine.ts:166` | `InferenceMode.ONLY_ON_DEVICE` | its mode: the person's answers never fall back to the cloud; where the browser has no model the app's rules write the summary |
| `web/src/ai/firebaseEngine.ts:170` | `generateContent(` | summary step call |
| `web/src/ai/firebaseEngine.ts:171` | `inferenceSource !== InferenceSource.ON_DEVICE` | the summary step rejects any answer not from the device |
| `web/src/ai/firebaseEngine.ts:192` | `generateContent(` | stripped step call |
| `web/src/ai/firebaseEngine.ts:197` | `inferenceSource === InferenceSource.ON_DEVICE` | the badge source for the stripped step |
| `web/src/ai/firebaseEngine.ts:209` | `getGenerativeModel(` | voice step model: the same cloud model, asked only for the words of a recording (`{"transcript": string}`) |
| `web/src/ai/firebaseEngine.ts:210` | `InferenceMode.ONLY_IN_CLOUD` | its mode: the SDK's on-device step takes text and JPEG / PNG only, so sound cannot run on the device; the app says "cloud" before the first use |
| `web/src/ai/firebaseEngine.ts:226` | `generateContent(` | voice step call: one per recording, the sound as `inlineData` (WAV), after a yes to the notice |
| `web/src/ai/firebaseEngine.ts:229` | `inferenceSource === InferenceSource.ON_DEVICE` | where the recording was turned into text, from the SDK's report |
| `web/src/ai/firebaseEngine.ts:251` | `new FirebaseEngine(` | lazy start: Firebase is initialised on the first AI call, so loading the app with cloud help off contacts no Google host (with cloud help on, Remote Config is asked at load: see "Firebase Remote Config" below) |
| `web/src/ai/app.ts:32` | `initializeAppCheck(` | App Check, required by AI Logic for cloud requests; started by the first cloud call (a card, a recording) or the first feedback note, never at page load |
| `core/pipeline.ts:731` | `ran: r.source` | the private step's trace line is the engine's report |
| `core/pipeline.ts:846` | `ran: r.source` | the stripped step's trace line is the engine's report |
| `core/pipeline.ts:876` | `const sent = r.source === 'in-cloud'` | "sent" is claimed only when the SDK said the cloud answered |
| `web/src/main.ts:336` | `function badge(` | the badge is drawn from `card.source` and the card's step trace only (`badgeKind` in `core/receipt.ts`) |

## One documented cut
The model used to write more of the card than it does now, and we took that away on evidence, not taste. In the 9–10 Nov prototype (pre-period, disclosed in `DISCLOSURE.md`; its numbers are not results of this build) the on-device model wrote the spoken line and the choices. A blind rater applying four strict checks to 50 questions passed **16 of 50** cards: in 19 the spoken line was choppy or still named a choice code had removed, and 12 four-choice cards had no way out (run 3 of our pre-period validation notes, which are not in this repository). So the model lost the spoken line, the escape and the right to decide the card: code builds the line from the final choices, adds exactly one way out, and keeps the model to a topic, a kind and at most three candidate words. The same rater passed 39 of 50 three runs later, with the same model. The cut carried into this build and grew: on the first real end-to-end run against Firebase AI Logic (day 1), the cloud's answer to a weekend question was "stay home / go out", a pair that answers nothing, so on a *where* question with places in About me a generic pair is now dropped and the card is completed from About me (`dropGenericWhere`, `sourceFill`; `tests/unit/open-sources.test.ts`); on a "what do you want to do" question that pair can still appear, and the way-out tile covers it. And an either-or card never trusts the model's copied options alone: in the 35 injected engine states of `tests/unit/engine-matrix.test.ts` (7 scripted model behaviours × 5 cloud states; these are stand-ins, not observed model output) "Do you want coffee or tea?" reads coffee / tea / something else under the headline "drink" in all 35. Since 16 Nov a plain either-or like that one runs no model at all, and since 17 Nov neither does any either-or whose two options the code reads whole. Every cut is visible per card in "Why this card".

## Look-alikes, named
Checked on the primary pages on 11 Nov 2026, Livox on 17 Nov (the same list is on `#/how`). Two of them start from the partner's question: the Livox project detects a question and shows pictograms to the person using Livox, and Lingraphica Conversations listens to the partner and suggests replies to the person. Turning a question into choices is therefore not new. What we did not find is that step for adults with aphasia as a supported-conversation card (written choices, a way out every time, a tick/cross check), together with coaching for the partner on the question itself and the family's own entries read on the computer. Each is good at something we borrow from or answer. This is what we found, not proof that nothing else exists.

| Product | What it does | Where Talk Partner differs |
|---|---|---|
| [Lingraphica Conversations](https://lingraphica.com/resources/introducing-conversations/) (24 Jun 2026) | Transcribes the conversation partner's speech and suggests keywords and replies to the device user; Lingraphica Hub devices, adults over 18, English, internet needed; "Conversations doesn't save your input after you close out of the tool" | The other side of the table: the partner's question becomes a choice card, and the person's reply is never drafted |
| [Lingraphica Smart Folders](https://lingraphica.com/resources/new-smart-folders-tool/) (10 Nov 2026) | A folder title and a description become dozens of suggested pictured cards in seconds, in the Talk tool, for building folders (a focus-group user: "10, 15 minutes to do it on our own, and that took a minute and a half") | One card per question, in the conversation, ending in a tick and a recap; any browser; the private step on this computer. Card generation is one feature away from a partner mode for them, which is why this is named here |
| [AACessTalk](https://arxiv.org/abs/2409.09641) (CHI 2025; [code](https://github.com/naver-ai/aacesstalk-monorepo)) | "Real-time guides to the parent to engage the child in conversation" and "contextual vocabulary cards to the child"; minimally verbal autistic children; 11 pairs over two weeks | Adults with aphasia; the partner's own question is rewritten (split, de-quizzed) and shown as choices; the answer is never written for the person. The closest ancestor, and the one we learned the partner-side coaching line from |
| [Livox, a student project at Worcester Polytechnic Institute](https://sites.google.com/view/livox-mqp/home) (© 2020) | "Livox is a pictogram-based alternative communication application"; the project "incorporated a ML and NLP-based classifier to detect specific questions and present the most relevant pictograms to users", for people with "a wide range of visual and motor impairments" | The same starting point, a question someone asks. Talk Partner is for adults with aphasia and works on the partner's side: written choices with a way out on every card, the line to say, coaching when the question itself is the problem (two in one, a memory test), and the family's own people and places read on the computer |
| [Tobii Dynavox TD Snap Aphasia](https://us.tobiidynavox.com/pages/td-snap-aphasia) | A Whiteboard, "a shared space for people with aphasia and their communication partners", rating scales, word lists, scripts, a "Communication Breakdown Repair" activity; no AI on that page. Tobii's [RESNA session on AI in AAC](https://www.resna.org/Events/Events-Calendar/tech-tuesday-with-tobii-dynavox-1) (22 Sep 2026) asks for "clearly defined, user-centered use cases" | The same shared screen, written for each question as it is asked; the model only ever touches the partner's question; a fixed repair card on every card. We agree with the caution: nothing generative reaches the person's side |

Not verified by us and therefore not quoted: a 14 Oct 2026 interview in which Tobii Dynavox is reported to say it keeps generative AI out of its language systems.

## Where the AI runs, in detail
The routing table is at the top of this file. The rest of what is true about the two steps:

**Why `gemini-3.5-flash-lite` for the cloud step** (`core/models.ts`): the stripped question needs a topic and two or three words back, so a small current stable model is enough. It is not on the Firebase AI Logic list of models "no longer recommended" (release note of 5 Oct 2026: `gemini-3.5-flash`, `3.6-flash` and `3.7-flash`, not the Lite model), and from 1 Dec 2026 Firebase routes `gemini-2.5-flash` requests to it (release note of 2 Nov 2026). Read at <https://firebase.google.com/support/releases> on 16 Nov 2026.

`inferenceSource` is read on every response: the AI badges come from it, and the private step rejects any
answer that didn't run on the device. Questions that code can answer alone (yes / no, an either-or read whole in code, feeling, pain,
body map, memory questions) run no model. The model only proposes; code decides.

The private step runs on its own Firebase app instance with no App Check, so a card made on this computer contacts no
host at all (in the recorded runs, on localhost and on the hosted copy: 0 requests outside the app's own host for
every on-device card). App Check starts
with the first cloud call and gives the cloud step its session token. For most of 17 Nov the cloud step asked for a
limited-use token per request instead (`useLimitedUseAppCheckTokens`). That evening reCAPTCHA Enterprise refused our
test browsers after many automated runs (HTTP 403, "App attestation failed") and, with limited-use tokens, the SDK
then throws before it sends anything: the hosted copy made no cloud card (`e2e-cloud.mjs --url` 16 or 17 of 27, three
runs; the organiser of our fifth review saw 17/27 and 26/28). With the session token one attestation serves
about an hour of requests in that browser, where limited-use tokens needed one per request; replay protection, the
only thing limited-use tokens add, is a console setting we have not switched on. **The session token does not rescue
a browser reCAPTCHA refuses.** When the attestation fails the SDK still sends the request, with a placeholder token
(`@firebase/app-check` 0.13.1, `getToken`: "always resolves"). We expected the service to take it while App Check is
not enforced in the console. Measured on 17 Nov, 20:45 UTC, it does not: the same request got 200 with a valid App
Check token, and 400 "Firebase AI Logic genai config not found" with no token or with the placeholder. So in such a
browser there is no cloud card. The card says "Cloud help could not confirm this browser, so there is no card. Load
the page again and try once more, …"; App Check's message and the service's stand under "Where each step ran"; and
no second request is made, because after a 403 App Check refuses every try for a day, until the page is loaded again
(`namedAppCheckFailure` in `web/src/ai/app.ts`, `cloudRetryWait` in `core/pipeline.ts`). What was measured, step by step:
`devlog/evidence_live/appcheck_probe_2026-11-17_2c5673e.md`. Why reCAPTCHA began to refuse our machine that evening
we do not know (many automated runs from one address is a guess), nor whether a judge's browser passes. One availability probe (`LanguageModel.availability`, a capability query, no inference) is
the only direct touch of Chrome's API. Firebase's own guide to hybrid inference on the web checks the same flag
(`await LanguageModel.availability();` in its setup steps, <https://firebase.google.com/docs/ai-logic/hybrid/web/get-started>,
read 17 Nov 2026), and the one availability method in the SDK we have installed (`ChromeAdapter.isAvailable`,
`@firebase/ai` 3.1.0) is documented with "These methods should not be called directly by the user".

**What the on-device step does that the cloud step cannot.** It is the only step that sees About me. In the recorded
runs "What would you like for dinner?" gives *pot roast / chili* on this computer and general foods from the cloud
(*meat / fish*, *chicken / fish*; the cloud's words vary), and "What do you want to do this weekend?" gives
*lake / church* on this computer and *stay home / go out* from the cloud. A card whose every answer is an About-me
entry stays on this computer even when cloud help is on. On our labelled set this is the whole difference: of the
18 open questions, a matching card with the family's own entries was made on this computer in 12, 13 and 12 cases in three runs at commit
`7dd16a1` (15, 16 and 15 of 18 matched in all; in three runs at `2aeb1d0` an hour earlier, 13 and 16 each time), and
rules alone made none (`devlog/evidence_r11/heldout_at_7dd16a1/`, `heldout_at_2aeb1d0/`; the runs before the rule changes of 17 Nov are in
`devlog/evidence_r8/heldout_at_c346d3d/`; our own labels, and a set the rules have since been changed around).

One kind of cloud card is completed on this computer: on a call / visit / invite question (and "who do you want to
see / meet / have over") the cloud's
general words ("family", "a friend") are replaced in code by the people About me names, minus whoever lives here, so
with cloud help only "Who should we call tonight?" reads *Jenny / Tyler* too. That is why the judge path does not
open on that question: it shows a rule, not the model. The cloud still gets the question alone: no name,
no label, no count of people (`dropGenericWho` in `core/rules.ts`, `tests/unit/who-and-more.test.ts`). The same is done for places on a plain "where shall we go" question (`placesFirst`; `CLAIMS.md` row 43). And when a
card shows two choices at a time, a third good one is no longer dropped: it waits on a next page, reached by the
way-out tile or "Next: more choices"; the family's own entries stand first, and exactly three of them share one card (a filler word, or a model's guess after two of the family's own entries, is
dropped: `CLAIMS.md` row 14).

One kind of question is not sent at all, although cloud help is on: an open question that turns on a swapped-out
About-me word ("What do you need from the hardware store?" would go as "from the Place A"). A step that never sees
About me could only guess there, so the question stays on this computer: a card the on-device step made is kept,
otherwise there is no card and the reason is on screen. The rule is narrow on purpose (a what-question with
"from <an About-me place, food, show or thing>"); "What should we plant at the allotment?" still goes, swapped.

**Firebase Remote Config** (`web/src/ai/remoteConfig.ts`, `core/models.ts`, `remoteconfig.template.json`). Three
values can be changed in the Firebase console without a new build: the cloud model's name (`cloud_text_model`) and
the two thresholds of the rule that sends a card made on this computer for a cloud second opinion
(`route_mood_words`, `route_min_choices`). The code holds a default for each (`gemini-3.5-flash-lite`, 2 and 2), and
those run whenever Remote Config is not asked, has not answered yet, fails, or sends a value the app cannot run on
(not a Gemini text model name, or a number outside 1 to 3 and 2 to 3): a refused value is shown as refused, never
used. No card waits for the answer. It is asked only when cloud help is on, once per page load, because the settings
concern the cloud step only and a page with cloud help off must contact no host but its own; the request holds the
app id and a Firebase installation id, no question and nothing from About me, and the consent screen says so.
**How this works** (`#/how`) shows the three values in use and, for each, whether it came from Remote Config or is
the default in the code. What Remote Config cannot change is the boundary: which step may see About me is fixed in
code. The template in the repository is the one published to our project (`npx firebase-tools deploy --only
remoteconfig`); today its three values equal the defaults, so it changes nothing yet. Checked by
`tests/unit/remote-config.test.ts` and, against the real service, by `scripts/e2e-cloud.mjs` (not asked with cloud
help off; with its hosts blocked a card is made at once on the defaults; reachable, the three values read "from
Remote Config" and the cloud request names that model).

**Limits, stated.** One development machine, one made-up family, one run per question: this shows the path works, not
how good the cards are. After a browser start the model has to load: the app warms it up at page load with one fixed
sentence, and that took 16 to 22 s in the four starts we timed (15.8, 17.0, 18.2 and 21.7 s from page load to
"Ready"; the status line says "getting ready… up to half a minute" meanwhile,
and code-decided cards work). After it a single on-device answer took about 3 s (median 3.1 to 3.3 s on the labelled
set, 5.4 s at the slowest), and a card that also asks the cloud 6 to 13 s in our own runs; in a run by the organiser of our fifth review on 17 Nov one cloud card took 28 s. The privacy swap covers About-me entries, relation words and, for
names About me does not list, a guess by the shape of the word: a capitalised word, the word after a title ("Dr.
Patel", "aunt linda"), a lowercase word that is not in our list of everyday English words ("call mike back"), and a
word that is also a first name where it stands like one ("did may call?"). The kind of place stays ("Name A
Street", "Name B Hospital"). A word-name where our rules do not look ("a cake for hope"), a health detail and
anything that is not a name are sent as typed when cloud help is on, and an English word the list lacks is swapped
although it is no name (`CLAIMS.md` row 6 has both lists); the consent screen says that the swap of unlisted names
can miss one and that anything else typed is sent as written. `npm audit` reports 4 high advisories, all in the gRPC package
under `@firebase/firestore`, which this app does not import.

## Screens
- **Simple view** (`/`, the default since 17 Nov; direction A of `design/simple_shell_2026-11-17/PROPOSAL.md`): what a
  carer on a phone gets. First screen: one sentence, the question field with the microphone, "Make a card", three
  ready questions (each with a small line saying how its card is made here), "Quick needs", About them, and at the
  foot what has left this session, where the AI runs, and **See how it works inside →**. A card: "1 Say this out
  loud", "2 Show <name> the card", the card, the main button, "Hide the choices" and "We're stuck", and under the card
  where it was made (by the app's rules, by the AI built into Chrome on this computer, or with online help, and what
  was sent). After the tick: what they chose, "Ask another question", today's answers. A question that needs cloud
  help while it is off brings up a sheet: the exact line that would go, what else is in the request, what can be
  missed, what is never sent, the data use, and two buttons of the same size ("Yes, send open questions to Google" /
  "No, not for this question"); nothing is asked of any other host before a yes. About them is four rows over the
  same fields. Light by default, dark when the system asks for it. The words say "this phone", "this tablet" or
  "this computer" by what the browser reports (`deviceKindFrom` in `core/copy.ts`). It draws less than the full view
  and computes nothing: the same `makeCard` makes every card (`web/src/simple.ts`, `core/simple.ts`). **Nobody it is
  for has tried it.** "See how it works inside" opens the full view below and the browser keeps that choice;
  "Simple view", first among its links, goes back.
- **Partner screen** (the full view; `/#/demo` opens it in judge mode whatever view was chosen): in the top bar, **Quick needs** (the board below, in one tap); next to the question
  field, where the browser can record, a microphone for the partner's own question (through Firebase AI Logic) (the words go into the
  field and wait there). Above the question field, up to three one-tap chips with the questions answered most
  often ("Asked before:", read from "Answers so far" on this computer; none until an answer has been confirmed, and
  not in judge mode, where the sample chips stand and answers are not kept); then the question, the coaching line when a rule found one, the line to say, "Show to person",
  "Hide the choices", "Next", "Recap", "We're stuck", the badge, "Why this card", "What was sent" (one line: the question after the swap, and
  the size of the request; the exact request handed to the SDK, or what would have been sent, is one click further) and "Where each step ran".
  "Show to person" lifts the card: the white pane grows into the whole screen in a quarter of a second (a view
  transition on the card itself; none under reduced-motion settings or where the browser has no view transitions).
- **Person screen** (`#/person`): only the keyword, two or three big tiles (with a picture where one is drawn, the word alone otherwise), one way out, then "So: lake. Right?"
  with yes / change. The exit is top-right and needs a press-and-hold. "We're stuck" replaces the card with the fixed
  repair card (show me / write it / draw / later / change topic); a tap gives the partner the next move for that way.
- **Quick needs** (`#/needs`): the person's screen with one fixed board, eight needs and the way out, each a
  picture and its word; a tap is checked with the tick and the cross like any choice. No AI, nothing sent. A confirmed
  need is in the session recap and is not kept in "Answers so far".
- **About me** (`#/about`): names, people (name, relation, lives here, photo, nickname), foods, places, TV, music, other.
  Saved only in this browser (IndexedDB). "Delete everything on this computer" also resets cloud help consent.
  **Answers so far**: each answer the person confirms with the tick is kept here, on this computer only. When the
  same question is asked again the partner sees one quiet line ("Last time (yesterday) they chose "lake". Ask again
  all the same: today's answer is theirs."); the person's card never shows it and no model ever gets it
  (`core/history.ts`, `tests/unit/history.test.ts`). With the sample family it lasts until judge mode is left.
  The same list feeds the "Asked before" chips on the partner screen: a chip holds the question only, and a tap asks
  it again like a typed question (so with cloud help on, an open question goes the usual way; the earlier answers do not).
- **Cloud help** (`#/cloud`): off by default. The consent screen shows what is sent (the last question in the exact
  payload form), who receives it, what is never sent, and the data-use terms; one checkbox turns it on, one tap turns it off. In the simple view the same switch is the "Yes" button of the sheet an open question brings up, which carries the same facts in fewer words.
- **Judge mode** (`#/demo`): a made-up family, a first card already on screen (coffee or tea, read in code), then, where the browser has Gemini Nano, the first open question asked by the app itself and answered on this computer, one-tap questions of each kind, and per card a "where each step ran" line
  built only from what the SDK reported (`inferenceSource`), one click away under every card. A step that did not run says so and why. Nothing claims
  on-device unless the device answered. **How this works** (`#/how`): the two steps, a diagram, the session tally,
  the last card's trace and "why", and the look-alikes named above.

## Layout
- `core/`: the shared card logic (rules, privacy swap, prompts, schema, sample family, **`copy.ts`: every string a
  person reads**). Pure TypeScript, no DOM, no Firebase, so every client reuses it unchanged.
- `web/`: the web client. `web/src/ai/` is the only place that imports `firebase/ai` (`firebaseEngine.ts`) and
  `firebase/remote-config` (`remoteConfig.ts`). `pictos.ts` holds the hand-drawn
  pictograms (provenance and licence per picture in `PICTOGRAMS.md`); `store.ts` is the IndexedDB wrapper;
  `voice.ts` is the microphone's state machine (record, stop, send the clip once through the engine; no DOM, so it
  is tested with a scripted microphone, recorder and engine); `mic.ts` is the browser's side; `feedback.ts` the form. `core/needs.ts` is the quick-needs board.
- `tests/unit/`: unit, property and matrix tests, plus a guard that fails on any direct model API call.
  `engine-matrix.test.ts` runs seven card shapes through every combination of on-device model state and cloud
  state; `card.property.test.ts` and `strip.property.test.ts` are seeded property tests over random questions,
  model output and About-me profiles.
- `tests/unit/needs.test.ts`, `tests/unit/voice.test.ts`: the board (tiles, pictures, no engine, whose side says
  what) and the microphone (notice, record, stop, the 15 s limit, an empty clip sends nothing, each error, what the app says
  about where the sound goes).
- `scripts/e2e-cloud.mjs`: an end-to-end check of the cloud step against the real Firebase project.
  `scripts/e2e-ondevice.mjs`: the same for the on-device step, in a Chrome that has Gemini Nano (it wrote
  `devlog/ondevice_proof_1/`). `scripts/e2e-noconfig.mjs`: a copy with no settings at all.
- Comments that cite "build spec §…" refer to our internal build specification, which is not part of this repository;
  every rule it names is implemented in `core/` and tested in `tests/unit/`.

## Run
```
npm install
cp .env.example .env.local   # fill in the Firebase web config; for localhost, an App Check debug token
npm run dev                  # http://localhost:5179
npm run check                # lint + typecheck + unit tests
npm run build                # production build + check that no debug token is bundled
node scripts/e2e-cloud.mjs   # with the dev server running: real Firebase AI Logic end-to-end (cloud step)
node scripts/e2e-noconfig.mjs # starts its own server with no settings: rules-only cards from a bare clone, and the quick-needs board with the network off
python3 scripts/e2e-simple.py     # with the dev server running: the simple view in a browser, as a phone, a desktop and a tablet (99 checks; --live for a hosted copy: it then never presses "Yes")
python3 scripts/overflow-check.py # with the dev server running: nothing runs off the side at 320, 360, 390 and 412 px (the simple view at all four, the full view from 360)
node scripts/contrast-check.mjs   # the simple view's colours, read from the stylesheet: text 4.5:1, controls 3:1, light and dark
node scripts/e2e-needs.mjs   # with the dev server running (or --url <a hosted copy>): the quick-needs board with the network off, the microphone's notice
node scripts/e2e-ondevice.mjs --port 9335   # with the dev server and a Chrome that has Gemini Nano on that debugging port
node scripts/eval-heldout.mjs             # the labelled set in eval/, rules alone; add --port 9335 for the real app with the on-device model; the report goes to devlog/eval_runs/
node scripts/shots.mjs       # with the dev server running: screenshots of every screen at 390 and 1280 px + layout checks; the quick-needs board; voice input against a scripted recognition object
node scripts/fonts-check.mjs # with the dev server running: no request leaves the app host; the three self-hosted families load from /fonts/
```
### Deploy (Firebase Hosting)
Last done on 17 Nov 2026, 23:04 UTC: <https://talk-partner.web.app> serves the build of commit `188f03b` (each of the
14 served files has the SHA-256 of the local build). Against it: `e2e-needs.mjs` 12/12; `e2e-simple.py --live` 97/97
(the simple view as a phone at 390 px, a desktop and a tablet, no page error, nothing off the side; it never presses
"Yes" there); `overflow-check.py` 145/145; `e2e-cloud.mjs` 15/27, because App Check refused our machine's browser
(`devlog/evidence_live/`, the files with `188f03b` in the name; at the build before, `2c5673e`, 18/27 and 14/27). The last full pass of the cloud script was at the
build of `4d7edee`, 19:06 UTC. The on-device
script was last run against the hosted copy at an earlier build, `deebc94`. The steps, for another project:
```
# 1. console: create a reCAPTCHA Enterprise key (website; domains talk-partner.web.app, talk-partner.firebaseapp.com)
#    and set it as the App Check provider of the web app; turn on Hosting
# 2. .env.local: VITE_RECAPTCHA_ENTERPRISE_SITE_KEY=<the key id>
npx firebase-tools deploy --only hosting      # runs npm run build:hosting first; it refuses to build without the key
node scripts/e2e-cloud.mjs --url https://talk-partner.web.app/      # the cloud step, end to end, on the live site
node scripts/e2e-needs.mjs --url https://talk-partner.web.app/      # the quick-needs board with the network off, and the microphone's notice
node scripts/e2e-ondevice.mjs --port 9335 --url https://talk-partner.web.app/   # the on-device step on the live site, in a Chrome with Gemini Nano
```
The page itself (`/` and `/index.html`) is sent with `Cache-Control: no-cache` (`firebase.json`), so a browser that had
the site open before a deploy gets the new build on its next visit; until 17 Nov `/` was cached for an hour.
A production build never contains the App Check debug token (`scripts/check-dist.mjs`), so without the site key a
deployed copy has no cloud step: code-decided cards and the on-device step still work there. `build:hosting` stops
before that can happen by accident.

Hidden route for the timed trial in `devlog/TRIAL_PROTOCOL.md`: `#/trial` (a stopwatch and log, kept in this browser, exported as CSV).
On-device inference needs desktop Chrome with Gemini Nano (Chrome's hardware and disk requirements apply).
Without it, yes / no, either-or, feeling and pain cards still work, and open questions use cloud help only if the partner turns it on.
Without `.env.local` the same cards work and open questions get no card.

## Sources for the first lines
[^1]: National Institute on Deafness and Other Communication Disorders, "Aphasia" (page last updated 16 Apr 2025): "About 2 million people in the United States are living with aphasia, according to the National Aphasia Association." <https://www.nidcd.nih.gov/health/aphasia>, read 16 Nov 2026.
[^2]: Haley KL, Hardy LE. "Is Communication Training for Significant Others a Reasonable Rehabilitation Goal in Aphasia Therapy?" *American Journal of Speech-Language Pathology* 2025;34(2):782-797. <https://doi.org/10.1044/2024_AJSLP-24-00472>. Abstract read in the PubMed record (PMID 39913273) on 16 Nov 2026: "less than 3% [of the goal samples] involved any form of communication partner training"; "Almost all SLPs (97%) reported engaging in CPT with family members ... most explained that CPT was typically handled without goal setting" (156 speech-language pathologists in the United States). A survey of clinicians, not a count of families.
[^3]: Aphasia Institute, "Communication Tools: Communicative Access & Supported Conversation for Adults With Aphasia (SCA™)", <https://www.aphasia.ca/communication-tools-communicative-access-sca/>, read 17 Nov 2026: "Aphasia is a language problem that masks a person's inherent competence, and most dramatically affects conversational interaction (talking and understanding), as well as the ability to read and write."; under "Acknowledge Competence": "People with aphasia need others to believe they are competent and have more understanding and social skills than may be apparent." This is the premise of the method, stated by its authors; it is not a measured harm, and we have found no figure for one that we could read at its source.

## Licence
Apache-2.0. Pre-existing work is listed in `DISCLOSURE.md`.
