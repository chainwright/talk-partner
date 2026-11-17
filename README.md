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
ways out. The family's own places and foods ("lake", "pot roast") are words for now (`PICTOGRAMS.md`).

Based on Supported Conversation for Adults with Aphasia (SCA) principles. Not a therapy, not a diagnosis.

## Where the AI runs (Firebase AI Logic hybrid inference)
**Family data → `ONLY_ON_DEVICE`; the stripped question → `PREFER_IN_CLOUD`, which falls back to Gemini Nano when
offline; `inferenceSource` drives every badge.** All AI inference goes through Firebase AI Logic. The code is in
**`web/src/ai/firebaseEngine.ts`**.

| Step | Gets | Mode | Why |
|---|---|---|---|
| Private card | question + the family's About-me lists | `ONLY_ON_DEVICE` | Family data must never fall back to the cloud. `PREFER_ON_DEVICE` would send this prompt to the cloud while Gemini Nano is missing or downloading. |
| Stripped card | the question with every About-me word swapped for "Person A", "Place A"… and a word that looks like a name the family didn't list (a capitalised word, the word after a title such as "Dr.", a lowercase word that is not an everyday English word) swapped for "Name A" | `PREFER_IN_CLOUD` | Holds no profile data, so an offline fall-back to the device is safe. |

The same question through the two steps, in our recorded run: "What do you want to do this weekend?" gives
*lake / church* on this computer (the family's own places, read from About me by Gemini Nano; nothing sent) and
*stay home / go out* from the cloud, which gets the question only. The details are under
[Where the AI runs, in detail](#where-the-ai-runs-in-detail).

Built for #BuildHybridAI 2026. Status on 17 Nov 2026, in three lines:
- **What runs:** the hosted copy is at <https://talk-partner.web.app/#/demo>. It turns the partner's question into a choice card, corrects the partner where a rule can tell, and never picks the answer; open questions are answered on this computer by Gemini Nano from About me, or by the cloud from the question alone.
- **One number, at commit `c346d3d`:** on the 18 open questions of our own labelled set, rules alone make no card (0 of 18); the on-device model made a card matching our label for 16 of 18 in each of three runs, 13 of them with the family's own people, places or foods. Our labels and a set the rules have since been changed around: not a held-out test, not a trial with people.
- **Every claim with its status:** `CLAIMS.md` (and `JUDGES.md` for the 60-second path, `EVIDENCE.md` for claim → file, command, saved output). No video yet, no trial with people yet. How it got here, day by day: `devlog/` (the long form of this paragraph is kept in `devlog/DAY12.md`).

It also corrects **the partner**, quietly, where a rule can tell: two questions in one become "One thing at a time: showing the first"; a memory question becomes "You know this one: tell, don't test."; a "you don't want …, do you?" question is asked the plain way ("Do you want …?"), so that a yes on the card means yes. The person is never corrected. The partner screen opens on that: "It corrects how you ask. It never answers for them." (the limits of both halves are in `CLAIMS.md`, row 11).

## For judges: 60 seconds

```
npm install && npm run dev        # then open http://localhost:5179/#/demo
```
No account, no sign-in. What you get depends on what the copy has:

| This copy has | What works |
|---|---|
| nothing (a bare clone, no `.env.local`) | every card that code decides alone: coffee or tea, yes / no, the feeling scale, the body map, the memory coaching, "We're stuck". An open question gets an honest "No card". Nothing contacts any host but the app's own (`npm run e2e:noconfig`, 16 checks) |
| the Firebase web config in `.env.local` (see **Run**) | the above, plus cloud help for open questions once you turn it on |
| the config and desktop Chrome with Gemini Nano | the above, plus the private step on this computer: open questions answered with the family's own names and places, nothing sent |

Hosted copy: <https://talk-partner.web.app/#/demo>. It is the build of commit `deebc94` with our project settings, so it is the second or the third row of this table, depending on your browser. Both rows are recorded on the hosted copy itself (`devlog/evidence_live/`: the cloud step in a browser without the model, and the on-device step in a Chrome that has Gemini Nano). In a browser without Gemini Nano the "Sample family" line ends with **See what the on-device step makes →**: a recording of that step from our machine, labelled as a recording.

`#/demo` loads a made-up family (Frank; Carol asking) and opens with one card already made, so the first thing on screen is a card and not an empty pane: "Do you want coffee or tea?", read in code, no model, nothing sent (its chip is lit). **Then the first step runs by itself, with no click:** as soon as the on-device model has loaded (about 3 s when it is already in the browser's memory, 16 to 22 s right after a browser start; the card takes about 3 s more, and the status line says where it stands), the app asks "What do you want to do this weekend?" and Gemini Nano makes the card on this computer from About me ("lake / church" in the recorded run), with the badge "On this computer" from the SDK's `inferenceSource`. That step is made with cloud help left out, whatever the setting, so nothing can be sent by a step you did not click; it stands down if you ask or type anything first; and if the model gives no card, the first card stays and the status line says so. **In a browser with no Gemini Nano nothing runs by itself:** the status line says "No Gemini Nano in this browser, so the on-device step can't run here. The card shown is made in code." (or "… is not downloaded …", with the download link), and everything else is as before. Under the question box are one-tap questions, in three groups (open question: a model proposes / the app corrects the partner / read in code, no AI); each chip shows the short form, the hover text has the full question and what to look for. Under every card, in reading order: the badge with what left this computer, the coaching line if any, the line to say, the card on the right, then **Why this card**, **Where each step ran**, **What was sent**, the **privacy receipt** and the session line. Under the card judge mode opens with, those panels stand open; under every card after it they are one line, **"How this card was made: …"** (who decided; how many choices code kept, added and dropped), and one click opens all three, with the receipt closed below it. Click these, in order:

| Click | What you see | Badge |
|---|---|---|
| **What do you want to do this weekend?** (the first chip; with Gemini Nano this card has already appeared by itself) | an open question: the choices are not in the question, so a model has to propose them. **With Gemini Nano in this Chrome:** the private step runs on this computer with the About-me lists and the card offers the family's own places ("lake / church" in the recorded runs); the badge line names them: "nothing left this computer · lake, church from About me". **Without Gemini Nano:** no card, and an offer to use cloud help with the question only | On this computer, or No card |
| **What would you like for dinner?** | the same on this computer: the family's own foods, "pot roast / chili" | On this computer, or No card |
| **Cloud help: off** (top bar) → read the consent screen, tick, **Turn on cloud help**, then the weekend and dinner questions again (in a browser without Gemini Nano, or the card stays on this computer) | the stripped question goes to Gemini through Firebase AI Logic (`PREFER_IN_CLOUD`), which has never seen About me: the choices are general ("stay home / go out", "meat / fish" in the recorded runs; the words vary). This is the difference between the two steps, on one question; "What was sent" shows the question as it went ("Partner asks: …", after the swap) and the size of the request, and "Show the exact request" opens the request this app handed to the SDK; the **privacy receipt** below the judge box shows its size and the names withheld | Cloud help (question only) |
| **Who should we call tonight?** | *Jenny / Tyler / someone else*; Carol lives there, so she is not offered. This card looks the same with either step: on this computer the model reads the names in About me; with cloud help only, the cloud answers "family / a friend" and code on this computer puts the names in. It shows the rule, not the model | On this computer, or Cloud help (question only) |
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
- **No AI needed**: code decided the card and no model was called for it (yes / no, a plain either-or, three options named in the question, feeling, pain, body map, memory, an open "when" question).
- **Made in code (AI answer not used)**: a model was asked and the card is code's all the same. For a longer either-or the on-device model is asked to copy the two options out of the question; if its copy fails the check, the pair read in code is used, and nothing of the model's answer is on the card: not the choices and not the headline (`tests/unit/sim-classes.test.ts`, group 12). Until 16 Nov such a card read "No AI needed" although it had waited about 3 s for the model (`core/receipt.ts`, `badgeKind`; `tests/unit/sim-e-classes.test.ts`, group E-10). When the model's copy is what the card shows, or only a model read the question as yes / no, the badge names the step that ran.
- **No card**: blocked; the partner is told to ask normally.

After the badge, one line that is always on screen says what left this computer for this card ("nothing left this computer", or "the question left this computer, 1 name and 0 other About me words swapped out", or, when a cloud request was made and failed, "cloud help was asked and failed: the question may have left this computer"); it is read from the same recorded request body the receipt counts. On a card made on this computer it also names the choices that came from About me.

Under every card, **"Where each step ran"** lists the private step, the cloud step and the rules, each as *ran on this computer / ran in the cloud / did not run (why) / failed (why)*. A step that did not run says so. In judge mode it stands open under the first card and behind the one summary line under every later card; on the partner screen it sits, with "Why this card", "What was sent" and the receipt, inside one closed fold, **"How this card was made"**, so the partner sees only the question, the line to say, the card and the actions. Nothing is removed, only folded.

**One number.** In judge mode, under the chips, one figure at display size says what left this computer this session. It reads "0 bytes left this computer" for as long as no cloud request has been handed to the SDK: that is the case on a bare clone, with cloud help off, and for every card made on this computer; once cloud help is on, the app has asked Firebase Remote Config for its settings, so the line then reads "0 bytes of any question left this computer" and names that request as not counted (in our recorded runs no host but the app's own was contacted for any of them; loading the page itself is not counted, and the line says so). Once the cloud has answered, the figure is the size of the requests the app handed over and it is called "handed to cloud help"; a request that failed after it was handed over is shown as "may have left", never as 0. The paragraph "How this is counted" is folded behind one link in the receipt.

**Privacy receipt** (judge mode and `#/how`): per session, the size of the requests this app handed to the SDK for the cloud step (the question after the swap, the fixed instructions, the schema, the model name and mode) and the names withheld. It is counted on the recorded request (`core/receipt.ts`), not estimated from the question, and the counted text is in the export so you can check it by hand. It is not a capture of the wire: the SDK's own format, the headers and the App Check token are not counted. "Checked after" searches the sent text once more for About-me words and photo bytes.

**Why this card** (every card; one line, open under judge mode's first card and on `#/how`, behind the summary line under later cards, inside "How this card was made" on the partner screen): the model's parsed proposal (topic, kind, choices, copied options) and which step made it, the labels code kept, the labels code added and where from ("people from About me"), every proposed choice that is not on the card with the rule that removed it ("negative wording", "lives here: never offered for a call or a visit", "over the limit at this support level"), who decided, and where the headline came from. `Card.why` is written in `core/pipeline.ts` at the moment each rule runs, on the values it ran on; `tests/unit/day5.test.ts` checks that every kept or added label is on the card and every dropped one is not.

**States you can force:** cloud leg = turn on cloud help (`#/cloud`); no-model state = any browser without Gemini Nano shows the private step as "did not run" on every open card; offline fall-back (needs Gemini Nano in this Chrome) = with cloud help on, switch the network off and type "Which shirt for the doctor?": the badge reads "Ran on this computer (offline)". Without Gemini Nano there is nothing to fall back to: the cloud step shows as failed and there is no card.

**Honesty notes.** The on-device step was first run on 16 Nov 2026 (Gemini Nano in desktop Chrome 157, through Firebase AI Logic `ONLY_ON_DEVICE`); the recorded run, with the SDK's `inferenceSource` per call, the hosts contacted and screenshots, is in `devlog/ondevice_proof_1/RUN_LOG.md`, made at the git tag **`ondevice-proof-1`** by `scripts/e2e-ondevice.mjs`. It is one machine and one made-up family, not a measurement of card quality. The sample family is made up. The pre-period prototype is listed in `DISCLOSURE.md`; the git tag **`pre-contest`** marks the import commit that holds exactly the carried-over files.

### Every Firebase AI Logic call, by file and line
Checked by `tests/unit/judge-path.test.ts` (each line must still contain the snippet), so this table cannot go stale silently.

| Where | Line holds | What it is |
|---|---|---|
| `web/src/ai/firebaseEngine.ts:27` | `from 'firebase/ai'` | the only import of the SDK in the repo (guarded by `tests/unit/no-direct-model-calls.test.ts`) |
| `web/src/ai/firebaseEngine.ts:74` | `getAI(` | the AI Logic instance of the private step: its own Firebase app with no App Check, so a card made on this computer contacts no host |
| `web/src/ai/firebaseEngine.ts:75` | `getGenerativeModel(` | private step model |
| `web/src/ai/firebaseEngine.ts:76` | `InferenceMode.ONLY_ON_DEVICE` | its mode: family data must never fall back to the cloud |
| `web/src/ai/firebaseEngine.ts:91` | `initializeAppCheck(` | App Check, required by AI Logic for cloud requests; started on the first cloud call only |
| `web/src/ai/firebaseEngine.ts:95` | `getAI(` | the AI Logic instance of the cloud step (Gemini Developer API backend), with `useLimitedUseAppCheckTokens: true`: a fresh short-lived App Check token per cloud request |
| `web/src/ai/firebaseEngine.ts:98` | `getGenerativeModel(` | stripped step model |
| `web/src/ai/firebaseEngine.ts:99` | `InferenceMode.PREFER_IN_CLOUD` | its mode: no profile data, so an offline fall-back to the device is safe |
| `web/src/ai/firebaseEngine.ts:126` | `initializeDeviceModel(` | the one-time download of the private helper, from a user gesture |
| `web/src/ai/firebaseEngine.ts:140` | `generateContent(` | private step call (also the warm-up: one fixed sentence, no About me) |
| `web/src/ai/firebaseEngine.ts:141` | `inferenceSource !== InferenceSource.ON_DEVICE` | the private step rejects any answer not from the device |
| `web/src/ai/firebaseEngine.ts:164` | `generateContent(` | stripped step call |
| `web/src/ai/firebaseEngine.ts:169` | `inferenceSource === InferenceSource.ON_DEVICE` | the badge source for the stripped step |
| `web/src/ai/firebaseEngine.ts:192` | `new FirebaseEngine(` | lazy start: Firebase is initialised on the first AI call, so loading the app with cloud help off contacts no Google host (with cloud help on, Remote Config is asked at load: see "Firebase Remote Config" below) |
| `core/pipeline.ts:656` | `ran: r.source` | the private step's trace line is the engine's report |
| `core/pipeline.ts:771` | `ran: r.source` | the stripped step's trace line is the engine's report |
| `core/pipeline.ts:799` | `const sent = r.source === 'in-cloud'` | "sent" is claimed only when the SDK said the cloud answered |
| `web/src/main.ts:266` | `function badge(` | the badge is drawn from `card.source` and the card's step trace only (`badgeKind` in `core/receipt.ts`) |

## One documented cut
The model used to write more of the card than it does now, and we took that away on evidence, not taste. In the 9–10 Nov prototype (pre-period, disclosed in `DISCLOSURE.md`; its numbers are not results of this build) the on-device model wrote the spoken line and the choices. A blind rater applying four strict checks to 50 questions passed **16 of 50** cards: in 19 the spoken line was choppy or still named a choice code had removed, and 12 four-choice cards had no way out (run 3 of our pre-period validation notes, which are not in this repository). So the model lost the spoken line, the escape and the right to decide the card: code builds the line from the final choices, adds exactly one way out, and keeps the model to a topic, a kind and at most three candidate words. The same rater passed 39 of 50 three runs later, with the same model. The cut carried into this build and grew: on the first real end-to-end run against Firebase AI Logic (day 1), the cloud's answer to a weekend question was "stay home / go out", a pair that answers nothing, so on a *where* question with places in About me a generic pair is now dropped and the card is completed from About me (`dropGenericWhere`, `sourceFill`; `tests/unit/open-sources.test.ts`); on a "what do you want to do" question that pair can still appear, and the way-out tile covers it. And an either-or card never trusts the model's copied options alone: in the 35 injected engine states of `tests/unit/engine-matrix.test.ts` (7 scripted model behaviours × 5 cloud states; these are stand-ins, not observed model output) "Do you want coffee or tea?" reads coffee / tea / something else under the headline "drink" in all 35. Since 16 Nov a plain either-or like that one runs no model at all. Every cut is visible per card in "Why this card".

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
answer that didn't run on the device. Questions that code can answer alone (yes / no, a plain either-or, feeling, pain,
body map, memory questions) run no model. The model only proposes; code decides.

The private step runs on its own Firebase app instance with no App Check, so a card made on this computer contacts no
host at all (in the recorded runs, on localhost and on the hosted copy: 0 requests outside the app's own host for
every on-device card). App Check starts
with the first cloud call, and the cloud step asks it for a limited-use token per request (`useLimitedUseAppCheckTokens`;
replay protection for the project is a console setting we have not switched on). One availability probe (`LanguageModel.availability`, a capability query, no inference) is
the only direct touch of Chrome's API. Firebase's own guide to hybrid inference on the web checks the same flag
(`await LanguageModel.availability();` in its setup steps, <https://firebase.google.com/docs/ai-logic/hybrid/web/get-started>,
read 17 Nov 2026), and the one availability method in the SDK we have installed (`ChromeAdapter.isAvailable`,
`@firebase/ai` 3.1.0) is documented with "These methods should not be called directly by the user".

**What the on-device step does that the cloud step cannot.** It is the only step that sees About me. In the recorded
runs "What would you like for dinner?" gives *pot roast / chili* on this computer and general foods from the cloud
(*meat / fish*, *chicken / fish*; the cloud's words vary), and "What do you want to do this weekend?" gives
*lake / church* on this computer and *stay home / go out* from the cloud. A card whose every answer is an About-me
entry stays on this computer even when cloud help is on. On our labelled set this is the whole difference: 13 of
18 open questions got a matching card with the family's own entries on this computer in each of three runs at commit
`c346d3d` (16 of 18 matched in all), and rules alone made none (`devlog/evidence_r8/heldout_at_c346d3d/`; our own
labels, and a set the rules have since been changed around).

One kind of cloud card is completed on this computer: on a call / visit / invite question (and "who do you want to
see / meet / have over") the cloud's
general words ("family", "a friend") are replaced in code by the people About me names, minus whoever lives here, so
with cloud help only "Who should we call tonight?" reads *Jenny / Tyler* too. That is why the judge path does not
open on that question: it shows a rule, not the model. The cloud still gets the question alone: no name,
no label, no count of people (`dropGenericWho` in `core/rules.ts`, `tests/unit/who-and-more.test.ts`). And when a
card shows two choices at a time, a third good one is no longer dropped: it waits on a next page, reached by the
way-out tile or "Next: more choices" (a filler word, or a model's guess after two of the family's own entries, is
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
set, 5.4 s at the slowest), and a card that also asks the cloud 6 to 13 s. The privacy swap covers About-me entries, relation words and, for
names About me does not list, a guess by the shape of the word: a capitalised word, the word after a title ("Dr.
Patel", "aunt linda"), a lowercase word that is not in our list of everyday English words ("call mike back"), and a
word that is also a first name where it stands like one ("did may call?"). The kind of place stays ("Name A
Street", "Name B Hospital"). A word-name where our rules do not look ("a cake for hope"), a health detail and
anything that is not a name are sent as typed when cloud help is on, and an English word the list lacks is swapped
although it is no name (`CLAIMS.md` row 6 has both lists); the consent screen says that the swap of unlisted names
can miss one and that anything else typed is sent as written. `npm audit` reports 4 high advisories, all in the gRPC package
under `@firebase/firestore`, which this app does not import.

## Screens
- **Partner screen** (`#/`): above the question field, up to three one-tap chips with the questions answered most
  often ("Asked before:", read from "Answers so far" on this computer; none until an answer has been confirmed, and
  not in judge mode, where the sample chips stand and answers are not kept); then the question, the coaching line when a rule found one, the line to say, "Show to person",
  "Hide the choices", "Next", "Recap", "We're stuck", the badge, "Why this card", "What was sent" (one line: the question after the swap, and
  the size of the request; the exact request handed to the SDK, or what would have been sent, is one click further) and "Where each step ran".
  "Show to person" lifts the card: the white pane grows into the whole screen in a quarter of a second (a view
  transition on the card itself; none under reduced-motion settings or where the browser has no view transitions).
- **Person screen** (`#/person`): only the keyword, two or three big tiles (with a picture where one is drawn, the word alone otherwise), one way out, then "So: lake. Right?"
  with yes / change. The exit is top-right and needs a press-and-hold. "We're stuck" replaces the card with the fixed
  repair card (show me / write it / draw / later / change topic); a tap gives the partner the next move for that way.
- **About me** (`#/about`): names, people (name, relation, lives here, photo, nickname), foods, places, TV, music, other.
  Saved only in this browser (IndexedDB). "Delete everything on this computer" also resets cloud help consent.
  **Answers so far**: each answer the person confirms with the tick is kept here, on this computer only. When the
  same question is asked again the partner sees one quiet line ("Last time (yesterday) they chose "lake". Ask again
  all the same: today's answer is theirs."); the person's card never shows it and no model ever gets it
  (`core/history.ts`, `tests/unit/history.test.ts`). With the sample family it lasts until judge mode is left.
  The same list feeds the "Asked before" chips on the partner screen: a chip holds the question only, and a tap asks
  it again like a typed question (so with cloud help on, an open question goes the usual way; the earlier answers do not).
- **Cloud help** (`#/cloud`): off by default. The consent screen shows what is sent (the last question in the exact
  payload form), who receives it, what is never sent, and the data-use terms; one checkbox turns it on, one tap turns it off.
- **Judge mode** (`#/demo`): a made-up family, a first card already on screen (coffee or tea, read in code), then, where the browser has Gemini Nano, the first open question asked by the app itself and answered on this computer, one-tap questions of each kind, and per card a "where each step ran" line
  built only from what the SDK reported (`inferenceSource`), open under the first card and one click away under the others. A step that did not run says so and why. Nothing claims
  on-device unless the device answered. **How this works** (`#/how`): the two steps, a diagram, the session tally,
  the last card's trace and "why", and the look-alikes named above.

## Layout
- `core/`: the shared card logic (rules, privacy swap, prompts, schema, sample family, **`copy.ts`: every string a
  person reads**). Pure TypeScript, no DOM, no Firebase, so every client reuses it unchanged.
- `web/`: the web client. `web/src/ai/` is the only place that imports `firebase/ai` (`firebaseEngine.ts`) and
  `firebase/remote-config` (`remoteConfig.ts`). `pictos.ts` holds the hand-drawn
  pictograms (provenance and licence per picture in `PICTOGRAMS.md`); `store.ts` is the IndexedDB wrapper.
- `tests/unit/`: unit, property and matrix tests, plus a guard that fails on any direct model API call.
  `engine-matrix.test.ts` runs seven card shapes through every combination of on-device model state and cloud
  state; `card.property.test.ts` and `strip.property.test.ts` are seeded property tests over random questions,
  model output and About-me profiles.
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
node scripts/e2e-noconfig.mjs # starts its own server with no settings: rules-only cards from a bare clone
node scripts/e2e-ondevice.mjs --port 9335   # with the dev server and a Chrome that has Gemini Nano on that debugging port
node scripts/eval-heldout.mjs             # the labelled set in eval/, rules alone; add --port 9335 for the real app with the on-device model; the report goes to devlog/eval_runs/
node scripts/shots.mjs       # with the dev server running: screenshots of every screen at 390 and 1280 px + layout checks
node scripts/fonts-check.mjs # with the dev server running: no request leaves the app host; the three self-hosted families load from /fonts/
```
### Deploy (Firebase Hosting)
Last done on 17 Nov 2026: <https://talk-partner.web.app> serves the build of commit `deebc94`, and the last two commands
below passed against it (`devlog/evidence_live/`). The steps, for another project:
```
# 1. console: create a reCAPTCHA Enterprise key (website; domains talk-partner.web.app, talk-partner.firebaseapp.com)
#    and set it as the App Check provider of the web app; turn on Hosting
# 2. .env.local: VITE_RECAPTCHA_ENTERPRISE_SITE_KEY=<the key id>
npx firebase-tools deploy --only hosting      # runs npm run build:hosting first; it refuses to build without the key
node scripts/e2e-cloud.mjs --url https://talk-partner.web.app/      # the cloud step, end to end, on the live site
node scripts/e2e-ondevice.mjs --port 9335 --url https://talk-partner.web.app/   # the on-device step on the live site, in a Chrome with Gemini Nano
```
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
