# Talk Partner

About 2 million people in the United States live with aphasia[^1], and the people who talk with them every day are
rarely taught how: when practising speech-language pathologists sent in samples of their therapy goals, fewer than 3%
involved any communication partner training, although 97% of those surveyed said they do some with families, mostly
without a written goal[^2].

After a stroke, many adults with aphasia understand what is said but can't find the words to answer.
Talk Partner helps **the partner** ask the way a speech therapist would: it turns the partner's own question into a
written-choice card (a keyword, two choices with pictures, an escape every time, a tick/cross check) and gives the
partner the exact line to say. It never guesses the person's answer.

Based on Supported Conversation for Adults with Aphasia (SCA) principles. Not a therapy, not a diagnosis.

Built for #BuildHybridAI 2026. Status: early. Six build sessions on 11 Nov 2026 (card rules, the five screens, consent flow, judge mode with a privacy receipt, "why this card", the coaching line, the repair card, the folded partner screen), a design commit on 16 Nov (direction C "Two Sides": a dark desk for the partner, a white card held up for the person, fonts self-hosted), and on 16 Nov the first real run of the on-device step, a truth pass over the lines our review marked false, and a first measurement on a labelled set of 60 partner questions that we wrote ourselves. **What it shows: on the 18 open questions (who, where, what), where the choices are not in the question, rules alone make no card at all (0 of 18); the on-device model, reading About me on this computer, made a card that matched our label for 16 of 18, and 13 of those offer the family's own people, places or foods.** Three runs on a clean tree gave the same counts (`devlog/evidence_r2/heldout_r2_NOTES.md`). The other 42 questions are decided by code with no model; 36 to 38 of those matched. Our labels, not a user trial; two labels were made stricter after the first run, and every miss is listed. No deploy yet, no video yet, no trial with people yet. Judges: `JUDGES.md` (60 seconds), `CLAIMS.md` (every claim with its status), `EVIDENCE.md` (claim → file, command, saved output). See `devlog/`.

It also corrects **the partner**, quietly, where a rule can tell: two questions in one become "One thing at a time: showing the first"; a memory question becomes "You know this one: tell, don't test." The person is never corrected.

## For judges: 60 seconds

```
npm install && npm run dev        # then open http://localhost:5179/#/demo
```
No account, no sign-in. What you get depends on what the copy has:

| This copy has | What works |
|---|---|
| nothing (a bare clone, no `.env.local`) | every card that code decides alone: coffee or tea, yes / no, the feeling scale, the body map, the memory coaching, "We're stuck". An open question gets an honest "No card". Nothing contacts any host but the app's own (`npm run e2e:noconfig`, 10 checks) |
| the Firebase web config in `.env.local` (see **Run**) | the above, plus cloud help for open questions once you turn it on |
| the config and desktop Chrome with Gemini Nano | the above, plus the private step on this computer: open questions answered with the family's own names and places, nothing sent |

There is no hosted URL yet.

`#/demo` loads a made-up family (Frank; Carol asking) and one-tap questions under the question box, in three groups (read in code / the app corrects the partner / a model proposes); each chip shows the short form, the hover text has the full question and what to look for. Under every card, in reading order: the badge with what left this computer, the coaching line if any, the line to say, the card on the right, then **Why this card**, **Where each step ran**, **What was sent**, the **privacy receipt** and the session line. Click these, in order:

| Click | What you see | Badge |
|---|---|---|
| **Do you want coffee or tea?** | the card is read from the question in code; the pane on the right is what the person sees ("Show to person" makes it full screen). Under it, **Why this card**: one line with what the model proposed (nothing here: no model needed), what code kept, added or dropped and by which rule, and who decided | No AI needed |
| **How was therapy today, and did you eat?** | the coaching line "One thing at a time: showing the first"; the first question is a feeling scale; **Next: second question** shows "Did you eat?" as yes / no | No AI needed |
| **We're stuck** (on any card) | the fixed repair card on the person's side: show me / write it / draw / later / change topic, and the partner line "Let's try another way"; a tap gives the partner the next move for that way; "Back to the choices" returns | No AI needed |
| **Where does it hurt?** | body map, two steps, never AI; "your left arm" is the person's own left | No AI needed |
| **What year did we get married?** | no card: a memory question is never a quiz; the coaching line "You know this one: tell, don't test" and the line to say instead | No card |
| **What do you want to do this weekend?** | open question. With Gemini Nano in this Chrome: the private step runs on this computer with the About-me lists and the card offers the family's own places ("lake / church" in the recorded run, `devlog/ondevice_proof_1/RUN_LOG.md`); the badge line names them: "lake, church from About me". Without Gemini Nano: no card, and an offer to use cloud help with the question only | On this computer, or No card |
| **Cloud help: off** (top bar) → read the consent screen, tick, **Turn on cloud help**, then the weekend question again | the stripped question goes to Gemini through Firebase AI Logic (`PREFER_IN_CLOUD`); "What was sent" shows the exact request; the **privacy receipt** below the judge box shows the bytes that left and the names withheld | Cloud help (question only) |
| **Should we ring Jen or Tyler?** | the either-or is read in code and nothing is sent; "Jen" is a nickname from About me, so the tile gets the person picture. (The swap of a name for `Person A` shows only when a question with a name goes to cloud help: type "What should we get Jenny for her birthday?" with cloud help on and no Gemini Nano; recorded in `devlog/ondevice_proof_1/RUN_LOG.md` §5) | No AI needed |

**What each badge means.** The two AI badges ("On this computer", "Cloud help") and the offline one come from the SDK's `inferenceSource` for that call; "No AI needed" and "No card" come from the card rules:
- **On this computer**: the private step (`ONLY_ON_DEVICE`) answered and the SDK reported `ON_DEVICE`.
- **Cloud help (question only)**: the stripped step (`PREFER_IN_CLOUD`) answered and the SDK reported `IN_CLOUD`. Only then does "What was sent" say *sent*.
- **Ran on this computer (offline)**: the stripped step fell back to the device (SDK reported `ON_DEVICE`); nothing left.
- **No AI needed**: code decided the card (yes / no, either-or, feeling, pain, body map, memory). For a plain question of these kinds no model runs at all. For a longer either-or the on-device model is asked to copy the two options out of the question; if its copy fails the check, the pair read in code is used and the badge is still "No AI needed", because nothing of the model's answer is on the card.
- **No card**: blocked; the partner is told to ask normally.

After the badge, one line that is always on screen says what left this computer for this card ("nothing left this computer", or "the question left this computer, 1 name and 0 other About me words swapped out", or, when a cloud request was made and failed, "cloud help was asked and failed: the question may have left this computer"); it is read from the same recorded request body the receipt counts. On a card made on this computer it also names the choices that came from About me.

Under every card, **"Where each step ran"** lists the private step, the cloud step and the rules, each as *ran on this computer / ran in the cloud / did not run (why) / failed (why)*. A step that did not run says so. In judge mode it stands open under the card; on the partner screen it sits, with "Why this card", "What was sent" and the receipt, inside one closed fold, **"How this card was made"**, so the partner sees only the question, the line to say, the card and the actions. Nothing is removed, only folded.

**Privacy receipt** (judge mode and `#/how`): per session, the bytes that left this computer and the names withheld, counted on the recorded request bodies (`core/receipt.ts`), never estimated; the counted text is in the export so you can check it by hand. "Checked after" searches the sent text once more for About-me words and photo bytes.

**Why this card** (every card; one line, open in judge mode and on `#/how`, inside "How this card was made" on the partner screen): the model's parsed proposal (topic, kind, choices, copied options) and which step made it, the labels code kept, the labels code added and where from ("people from About me"), every proposed choice that is not on the card with the rule that removed it ("negative wording", "lives here: never offered for a call or a visit", "over the limit at this support level"), who decided, and where the headline came from. `Card.why` is written in `core/pipeline.ts` at the moment each rule runs, on the values it ran on; `tests/unit/day5.test.ts` checks that every kept or added label is on the card and every dropped one is not.

**States you can force:** cloud leg = turn on cloud help (`#/cloud`); no-model state = any browser without Gemini Nano shows the private step as "did not run" on every open card; offline fall-back (needs Gemini Nano in this Chrome) = with cloud help on, switch the network off and ask "Which shirt for the doctor?": the badge reads "Ran on this computer (offline)". Without Gemini Nano there is nothing to fall back to: the cloud step shows as failed and there is no card.

**Honesty notes.** The on-device step was first run on 16 Nov 2026 (Gemini Nano in desktop Chrome 157, through Firebase AI Logic `ONLY_ON_DEVICE`); the recorded run, with the SDK's `inferenceSource` per call, the hosts contacted and screenshots, is in `devlog/ondevice_proof_1/RUN_LOG.md`, made at the git tag **`ondevice-proof-1`** by `scripts/e2e-ondevice.mjs`. It is one machine and one made-up family, not a measurement of card quality. The sample family is made up. The pre-period prototype is listed in `DISCLOSURE.md`; the git tag **`pre-contest`** marks the import commit that holds exactly the carried-over files.

### Every Firebase AI Logic call, by file and line
Checked by `tests/unit/judge-path.test.ts` (each line must still contain the snippet), so this table cannot go stale silently.

| Where | Line holds | What it is |
|---|---|---|
| `web/src/ai/firebaseEngine.ts:26` | `from 'firebase/ai'` | the only import of the SDK in the repo (guarded by `tests/unit/no-direct-model-calls.test.ts`) |
| `web/src/ai/firebaseEngine.ts:69` | `getAI(` | the AI Logic instance of the private step: its own Firebase app with no App Check, so a card made on this computer contacts no host |
| `web/src/ai/firebaseEngine.ts:70` | `getGenerativeModel(` | private step model |
| `web/src/ai/firebaseEngine.ts:71` | `InferenceMode.ONLY_ON_DEVICE` | its mode: family data must never fall back to the cloud |
| `web/src/ai/firebaseEngine.ts:83` | `initializeAppCheck(` | App Check, required by AI Logic for cloud requests; started on the first cloud call only |
| `web/src/ai/firebaseEngine.ts:84` | `getAI(` | the AI Logic instance of the cloud steps (Gemini Developer API backend) |
| `web/src/ai/firebaseEngine.ts:85` | `getGenerativeModel(` | stripped step model |
| `web/src/ai/firebaseEngine.ts:86` | `InferenceMode.PREFER_IN_CLOUD` | its mode: no profile data, so an offline fall-back to the device is safe |
| `web/src/ai/firebaseEngine.ts:95` | `getGenerativeModel(` | pictures model (not used in this bundled-pictures build) |
| `web/src/ai/firebaseEngine.ts:96` | `InferenceMode.ONLY_IN_CLOUD` | its mode |
| `web/src/ai/firebaseEngine.ts:118` | `initializeDeviceModel(` | the one-time download of the private helper, from a user gesture |
| `web/src/ai/firebaseEngine.ts:132` | `generateContent(` | private step call (also the warm-up: one fixed sentence, no About me) |
| `web/src/ai/firebaseEngine.ts:133` | `inferenceSource !== InferenceSource.ON_DEVICE` | the private step rejects any answer not from the device |
| `web/src/ai/firebaseEngine.ts:149` | `generateContent(` | stripped step call |
| `web/src/ai/firebaseEngine.ts:154` | `inferenceSource === InferenceSource.ON_DEVICE` | the badge source for the stripped step |
| `web/src/ai/firebaseEngine.ts:165` | `generateContent(` | pictures call (unused in this build) |
| `web/src/ai/firebaseEngine.ts:185` | `new FirebaseEngine(` | lazy start: Firebase is initialised on the first AI call, so loading the app contacts no Google host |
| `core/pipeline.ts:466` | `ran: r.source` | the private step's trace line is the engine's report |
| `core/pipeline.ts:553` | `ran: r.source` | the stripped step's trace line is the engine's report |
| `core/pipeline.ts:581` | `const sent = r.source === 'in-cloud'` | "sent" is claimed only when the SDK said the cloud answered |
| `web/src/main.ts:187` | `function badge(` | the badge is drawn from `card.source` only |

## One documented cut
The model used to write more of the card than it does now, and we took that away on evidence, not taste. In the 9–10 Nov prototype (pre-period, disclosed in `DISCLOSURE.md`; its numbers are not results of this build) the on-device model wrote the spoken line and the choices. A blind rater applying four strict checks to 50 questions passed **16 of 50** cards: in 19 the spoken line was choppy or still named a choice code had removed, and 12 four-choice cards had no way out (run 3 of our pre-period validation notes, which are not in this repository). So the model lost the spoken line, the escape and the right to decide the card: code builds the line from the final choices, adds exactly one way out, and keeps the model to a topic, a kind and at most three candidate words. The same rater passed 39 of 50 three runs later, with the same model. The cut carried into this build and grew: on the first real end-to-end run against Firebase AI Logic (day 1), the cloud's answer to a weekend question was "stay home / go out", a pair that answers nothing, so on a *where* question with places in About me a generic pair is now dropped and the card is completed from About me (`dropGenericWhere`, `sourceFill`; `tests/unit/open-sources.test.ts`); on a "what do you want to do" question that pair can still appear, and the way-out tile covers it. And an either-or card never trusts the model's copied options alone: in the 35 injected engine states of `tests/unit/engine-matrix.test.ts` (7 scripted model behaviours × 5 cloud states; these are stand-ins, not observed model output) "Do you want coffee or tea?" reads coffee / tea / something else under the headline "drink" in all 35. Since 16 Nov a plain either-or like that one runs no model at all. Every cut is visible per card in "Why this card".

## Look-alikes, named
Checked on the primary pages on 11 Nov 2026 (the same list is on `#/how`). None of them rewrites the partner's own question into a written-choice card for the partner to show; Lingraphica Conversations comes closest, from the person's side (it listens to the partner and suggests replies to the person). Each is good at something we borrow from or answer. This is what we found, not proof that nothing else exists.

| Product | What it does | Where Talk Partner differs |
|---|---|---|
| [Lingraphica Conversations](https://lingraphica.com/resources/introducing-conversations/) (24 Jun 2026) | Transcribes the conversation partner's speech and suggests keywords and replies to the device user; Lingraphica Hub devices, adults over 18, English, internet needed; "Conversations doesn't save your input after you close out of the tool" | The other side of the table: the partner's question becomes a choice card, and the person's reply is never drafted |
| [Lingraphica Smart Folders](https://lingraphica.com/resources/new-smart-folders-tool/) (10 Nov 2026) | A folder title and a description become dozens of suggested pictured cards in seconds, in the Talk tool, for building folders (a focus-group user: "10, 15 minutes to do it on our own, and that took a minute and a half") | One card per question, in the conversation, ending in a tick and a recap; any browser; the private step on this computer. Card generation is one feature away from a partner mode for them, which is why this is named here |
| [AACessTalk](https://arxiv.org/abs/2409.09641) (CHI 2025; [code](https://github.com/naver-ai/aacesstalk-monorepo)) | "Real-time guides to the parent to engage the child in conversation" and "contextual vocabulary cards to the child"; minimally verbal autistic children; 11 pairs over two weeks | Adults with aphasia; the partner's own question is rewritten (split, de-quizzed) and shown as choices; the answer is never written for the person. The closest ancestor, and the one we learned the partner-side coaching line from |
| [Tobii Dynavox TD Snap Aphasia](https://us.tobiidynavox.com/pages/td-snap-aphasia) | A Whiteboard, "a shared space for people with aphasia and their communication partners", rating scales, word lists, scripts, a "Communication Breakdown Repair" activity; no AI on that page. Tobii's [RESNA session on AI in AAC](https://www.resna.org/Events/Events-Calendar/tech-tuesday-with-tobii-dynavox-1) (22 Sep 2026) asks for "clearly defined, user-centered use cases" | The same shared screen, written for each question as it is asked; the model only ever touches the partner's question; a fixed repair card on every card. We agree with the caution: nothing generative reaches the person's side |

Not verified by us and therefore not quoted: a 14 Oct 2026 interview in which Tobii Dynavox is reported to say it keeps generative AI out of its language systems.

## Where the AI runs (Firebase AI Logic hybrid inference)
All AI inference goes through Firebase AI Logic. The code is in **`web/src/ai/firebaseEngine.ts`**.

| Step | Gets | Mode | Why |
|---|---|---|---|
| Private card | question + the family's About-me lists | `ONLY_ON_DEVICE` | Family data must never fall back to the cloud. `PREFER_ON_DEVICE` would send this prompt to the cloud while Gemini Nano is missing or downloading. |
| Stripped card | the question with every About-me word swapped for "Person A", "Place A"… and any other capitalised word (a name the family didn't list) swapped for "Name A" | `PREFER_IN_CLOUD` | Holds no profile data, so an offline fall-back to the device is safe. |
| Pictures | one generic word | `ONLY_IN_CLOUD` | Not used in this build: pictures are bundled. |

`inferenceSource` is read on every response: the AI badges come from it, and the private step rejects any
answer that didn't run on the device. Questions that code can answer alone (yes / no, a plain either-or, feeling, pain,
body map, memory questions) run no model. The model only proposes; code decides.

The private step runs on its own Firebase app instance with no App Check, so a card made on this computer contacts no
host at all (in the recorded run: 0 requests outside the app's own host for every on-device card). App Check starts
with the first cloud call. One availability probe (`LanguageModel.availability`, a capability query, no inference) is
the only direct touch of Chrome's API; the SDK has no public call for it on the web.

**What the on-device step does that the cloud step cannot.** It is the only step that sees About me. In the recorded
run "What would you like for dinner?" gives *pot roast / chili* on this computer and *meat / fish* from the cloud, and
"Who should we call tonight?" gave *Jenny / Tyler* against *family / friend*. A card whose every answer is an About-me
entry stays on this computer even when cloud help is on.

Since that run, one kind of cloud card is completed on this computer: on a call / visit / invite question the cloud's
general words ("family", "a friend") are replaced in code by the people About me names, minus whoever lives here, so
with cloud help only the same question now reads *Jenny / Tyler* too. The cloud still gets the question alone: no name,
no label, no count of people (`dropGenericWho` in `core/rules.ts`, `tests/unit/who-and-more.test.ts`). And when a
card shows two choices at a time, a third good one is no longer dropped: it waits on a next page, reached by the
way-out tile or "Next: more choices".

**Limits, stated.** One development machine, one made-up family, one run per question: this shows the path works, not
how good the cards are. The first answer after the browser starts took 15.8 s (the model loads; the app warms it up at
page load), later ones about 3 s. The privacy swap covers About-me entries, relation words and capitalised unknown
names in mid-sentence; a lowercase name, a name that starts a sentence, a health detail or an address is sent as typed
when cloud help is on, and the consent screen says so. `npm audit` reports 4 high advisories, all in the gRPC package
under `@firebase/firestore`, which this app does not import.

## Screens
- **Partner screen** (`#/`): the question, the coaching line when a rule found one, the line to say, "Show to person",
  "Hide the choices", "Next", "Recap", "We're stuck", the badge, "Why this card", "What was sent" (the exact request, or what
  would have been sent) and "Where each step ran".
- **Person screen** (`#/person`): only the keyword, two or three big tiles with pictures, one way out, then "So: lake. Right?"
  with yes / change. The exit is top-right and needs a press-and-hold. "We're stuck" replaces the card with the fixed
  repair card (show me / write it / draw / later / change topic); a tap gives the partner the next move for that way.
- **About me** (`#/about`): names, people (name, relation, lives here, photo, nickname), foods, places, TV, music, other.
  Saved only in this browser (IndexedDB). "Delete everything on this computer" also resets cloud help consent.
  **Answers so far**: each answer the person confirms with the tick is kept here, on this computer only. When the
  same question is asked again the partner sees one quiet line ("Last time (yesterday) they chose "lake". Ask again
  all the same: today's answer is theirs."); the person's card never shows it and no model ever gets it
  (`core/history.ts`, `tests/unit/history.test.ts`). With the sample family it lasts until judge mode is left.
- **Cloud help** (`#/cloud`): off by default. The consent screen shows what is sent (the last question in the exact
  payload form), who receives it, what is never sent, and the data-use terms; one checkbox turns it on, one tap turns it off.
- **Judge mode** (`#/demo`): a made-up family, one-tap questions of each kind, and per card a "where each step ran" line
  built only from what the SDK reported (`inferenceSource`). A step that did not run says so and why. Nothing claims
  on-device unless the device answered. **How this works** (`#/how`): the three steps, a diagram, the session tally,
  the last card's trace and "why", and the look-alikes named above.

## Layout
- `core/`: the shared card logic (rules, privacy swap, prompts, schema, sample family, **`copy.ts`: every string a
  person reads**). Pure TypeScript, no DOM, no Firebase, so every client reuses it unchanged.
- `web/`: the web client. `web/src/ai/` is the only place that imports `firebase/ai`. `pictos.ts` holds the hand-drawn
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
Hidden route for the timed trial in `devlog/TRIAL_PROTOCOL.md`: `#/trial` (a stopwatch and log, kept in this browser, exported as CSV).
On-device inference needs desktop Chrome with Gemini Nano (Chrome's hardware and disk requirements apply).
Without it, yes / no, either-or, feeling and pain cards still work, and open questions use cloud help only if the partner turns it on.
Without `.env.local` the same cards work and open questions get no card.

## Sources for the first lines
[^1]: National Institute on Deafness and Other Communication Disorders, "Aphasia" (page last updated 16 Apr 2025): "About 2 million people in the United States are living with aphasia, according to the National Aphasia Association." <https://www.nidcd.nih.gov/health/aphasia>, read 16 Nov 2026.
[^2]: Haley KL, Hardy LE. "Is Communication Training for Significant Others a Reasonable Rehabilitation Goal in Aphasia Therapy?" *American Journal of Speech-Language Pathology* 2025;34(2):782-797. <https://doi.org/10.1044/2024_AJSLP-24-00472>. Abstract read in the PubMed record (PMID 39913273) on 16 Nov 2026: "less than 3% [of the goal samples] involved any form of communication partner training"; "Almost all SLPs (97%) reported engaging in CPT with family members ... most explained that CPT was typically handled without goal setting" (156 speech-language pathologists in the United States). A survey of clinicians, not a count of families.

## Licence
Apache-2.0. Pre-existing work is listed in `DISCLOSURE.md`.
