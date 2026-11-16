# Talk Partner

After a stroke, many adults with aphasia understand what is said but can't find the words to answer.
Talk Partner helps **the partner** ask the way a speech therapist would: it turns the partner's own question into a
written-choice card (a keyword, two choices with pictures, an escape every time, a tick/cross check) and gives the
partner the exact line to say. It never guesses the person's answer.

Based on Supported Conversation for Adults with Aphasia (SCA) principles. Not a therapy, not a diagnosis.

Built for #BuildHybridAI 2026. Status: early (day 6: card rules, the five screens, consent flow, judge mode with a privacy receipt, "why this card", the coaching line, the repair card, and a partner screen that folds the technical panels away; on 16 Nov 2026 design direction C "Two Sides" was chosen and is now the default look: a dark desk for the partner, a white card held up for the person, fonts self-hosted; no deploy yet). See `devlog/`.

It also corrects **the partner**, quietly, where a rule can tell: two questions in one become "One thing at a time: showing the first"; a memory question becomes "You know this one: tell, don't test." The person is never corrected.

## For judges: 60 seconds

```
npm install && npm run dev        # then open http://localhost:5179/#/demo
```
No account, no sign-in. `#/demo` loads a made-up family (Frank; Carol asking) and one-tap questions under the question box, in three groups (read in code / the app corrects the partner / a model proposes); each chip shows the short form, the hover text has the full question and what to look for. Under every card, in reading order: the badge with what left this computer, the coaching line if any, the line to say, the card on the right, then **Why this card**, **Where each step ran**, **What was sent**, the **privacy receipt** and the session line. Click these, in order:

| Click | What you see | Badge |
|---|---|---|
| **Do you want coffee or tea?** | the card is read from the question in code; the pane on the right is what the person sees ("Show to person" makes it full screen). Under it, **Why this card**: one line with what the model proposed (nothing here: no model needed), what code kept, added or dropped and by which rule, and who decided | No AI needed |
| **How was therapy today, and did you eat?** | the coaching line "One thing at a time: showing the first"; the first question is a feeling scale; **Next: second question** shows "Did you eat?" as yes / no | No AI needed |
| **We're stuck** (on any card) | the fixed repair card on the person's side: show me / write it / draw / later / change topic, and the partner line "Let's try another way"; a tap gives the partner the next move for that way; "Back to the choices" returns | No AI needed |
| **Where does it hurt?** | body map, two steps, never AI; "your left arm" is the person's own left | No AI needed |
| **What year did we get married?** | no card: a memory question is never a quiz; the coaching line "You know this one: tell, don't test" and the line to say instead | No card |
| **What do you want to do this weekend?** | open question. With Gemini Nano in this Chrome: the private step runs on this computer with the About-me lists. Without it: no card and an offer to use cloud help with the question only | On this computer, or No card |
| **Cloud help: off** (top bar) → read the consent screen, tick, **Turn on cloud help**, then the weekend question again | the stripped question goes to Gemini through Firebase AI Logic (`PREFER_IN_CLOUD`); "What was sent" shows the exact request; the **privacy receipt** below the judge box shows the bytes that left and the names withheld | Cloud help (question only) |
| **Should we ring Jen or Tyler?** | "What was sent" shows `Person A` / `Person B`; the nickname is swapped like a name | No AI needed |

**What each badge means** (every badge comes from the SDK's `inferenceSource`, never from an assumption):
- **On this computer**: the private step (`ONLY_ON_DEVICE`) answered and the SDK reported `ON_DEVICE`.
- **Cloud help (question only)**: the stripped step (`PREFER_IN_CLOUD`) answered and the SDK reported `IN_CLOUD`. Only then does "What was sent" say *sent*.
- **Ran on this computer (offline)**: the stripped step fell back to the device (SDK reported `ON_DEVICE`); nothing left.
- **No AI needed**: code decided the card (yes/no, either-or, pain, body map, memory); a model may have run, but nothing of its answer is on the card.
- **No card**: blocked; the partner is told to ask normally.

After the badge, one line that is always on screen says what left this computer for this card ("nothing left this computer", or "the question left this computer, 2 names and 0 other About me words swapped out"); it is read from the same recorded request body the receipt counts, never assumed.

Under every card, **"Where each step ran"** lists the private step, the cloud step and the rules, each as *ran on this computer / ran in the cloud / did not run (why) / failed (why)*. A step that did not run says so. In judge mode it stands open under the card; on the partner screen it sits, with "Why this card", "What was sent" and the receipt, inside one closed fold, **"How this card was made"**, so the partner sees only the question, the line to say, the card and the actions. Nothing is removed, only folded.

**Privacy receipt** (judge mode and `#/how`): per session, the bytes that left this computer and the names withheld, counted on the recorded request bodies (`core/receipt.ts`), never estimated; the counted text is in the export so you can check it by hand. "Checked after" searches the sent text once more for About-me words and photo bytes.

**Why this card** (every card; one line, open in judge mode and on `#/how`, inside "How this card was made" on the partner screen): the model's parsed proposal (topic, kind, choices, copied options) and which step made it, the labels code kept, the labels code added and where from ("people from About me"), every proposed choice that is not on the card with the rule that removed it ("negative wording", "lives here: never offered for a call or a visit", "over the limit at this support level"), who decided, and where the headline came from. `Card.why` is written in `core/pipeline.ts` at the moment each rule runs, on the values it ran on; `tests/unit/day5.test.ts` checks that every kept or added label is on the card and every dropped one is not.

**States you can force:** cloud leg = turn on cloud help (`#/cloud`); no-model state = any browser without Gemini Nano shows the private step as "did not run" on every card; offline fall-back = switch the network off after a cloud card and ask again.

**Honesty notes.** No on-device run has happened on the development machine yet (it lacks the disk for Gemini Nano), so every "on-device" claim here is what the code enforces and the tests check, not something we have watched run. The sample family is made up. The pre-period prototype is listed in `DISCLOSURE.md`; the git tag **`pre-contest`** marks the import commit that holds exactly the carried-over files.

### Every Firebase AI Logic call, by file and line
Checked by `tests/unit/judge-path.test.ts` (each line must still contain the snippet), so this table cannot go stale silently.

| Where | Line holds | What it is |
|---|---|---|
| `web/src/ai/firebaseEngine.ts:20` | `from 'firebase/ai'` | the only import of the SDK in the repo (guarded by `tests/unit/no-direct-model-calls.test.ts:60`) |
| `web/src/ai/firebaseEngine.ts:55` | `initializeAppCheck(` | App Check, required by AI Logic |
| `web/src/ai/firebaseEngine.ts:57` | `getAI(` | the AI Logic instance (Gemini Developer API backend) |
| `web/src/ai/firebaseEngine.ts:58` | `getGenerativeModel(` | private step model |
| `web/src/ai/firebaseEngine.ts:59` | `InferenceMode.ONLY_ON_DEVICE` | its mode: family data must never fall back to the cloud |
| `web/src/ai/firebaseEngine.ts:62` | `getGenerativeModel(` | stripped step model |
| `web/src/ai/firebaseEngine.ts:63` | `InferenceMode.PREFER_IN_CLOUD` | its mode: no profile data, so an offline fall-back is safe |
| `web/src/ai/firebaseEngine.ts:72` | `getGenerativeModel(` | pictures model (not used in this bundled-pictures build) |
| `web/src/ai/firebaseEngine.ts:73` | `InferenceMode.ONLY_IN_CLOUD` | its mode |
| `web/src/ai/firebaseEngine.ts:94` | `initializeDeviceModel(` | the one-time download of the private helper, from a user gesture |
| `web/src/ai/firebaseEngine.ts:99` | `generateContent(` | private step call |
| `web/src/ai/firebaseEngine.ts:100` | `inferenceSource !== InferenceSource.ON_DEVICE` | the private step rejects any answer not from the device |
| `web/src/ai/firebaseEngine.ts:114` | `generateContent(` | stripped step call |
| `web/src/ai/firebaseEngine.ts:116` | `inferenceSource === InferenceSource.ON_DEVICE` | the badge source for the stripped step |
| `web/src/ai/firebaseEngine.ts:125` | `generateContent(` | pictures call (unused in this build) |
| `web/src/ai/firebaseEngine.ts:145` | `new FirebaseEngine(` | lazy start: Firebase is initialised on the first AI call, so loading the app contacts no Google host |
| `core/pipeline.ts:425` | `ran: r.source` | the private step's trace line is the engine's report |
| `core/pipeline.ts:505` | `ran: r.source` | the stripped step's trace line is the engine's report |
| `core/pipeline.ts:533` | `const sent = r.source === 'in-cloud'` | "sent" is claimed only when the SDK said the cloud answered |
| `web/src/main.ts:176` | `function badge(` | the badge is drawn from `card.source` only |

## One documented cut
The model used to write more of the card than it does now, and we took that away on evidence, not taste. In the 9–10 Nov prototype (pre-period, disclosed in `DISCLOSURE.md`; its numbers are not results of this build) the on-device model wrote the spoken line and the choices. A blind rater applying four strict checks to 50 questions passed **16 of 50** cards: in 19 the spoken line was choppy or still named a choice code had removed, and 12 four-choice cards had no way out (`validation/VALIDATION_2026-11-09.md`, run 3). So the model lost the spoken line, the escape and the right to decide the card: code builds the line from the final choices, adds exactly one way out, and keeps the model to a topic, a kind and at most three candidate words. The same rater passed 39 of 50 three runs later, with the same model. The cut carried into this build and grew: on the first real end-to-end run against Firebase AI Logic (day 1), the cloud's answer to a weekend question was "stay home / go out", a pair that answers nothing, so on a *where* question with places in About me a generic pair is now dropped and the card is completed from About me (`dropGenericWhere`, `sourceFill`; `tests/unit/open-sources.test.ts`); on a "what do you want to do" question that pair can still appear, and the way-out tile covers it. And an either-or card never trusts the model's copied options alone: in the 35-state matrix (`tests/unit/engine-matrix.test.ts`) the options are garbage in 5 cells and the topic is one of them in 5 more, and "Do you want coffee or tea?" reads coffee / tea / something else under the headline "drink" in all 35. Every cut is visible per card in "Why this card".

## Look-alikes, named
Checked on the primary pages on 11 Nov 2026 (the same list is on `#/how`). None of them takes the partner's own question and turns it into choices in the moment; each is good at something we borrow from or answer.

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

`inferenceSource` is read on every response: the badge on each card comes from it, and the private step rejects any
answer that didn't run on the device. Questions that code can answer alone (yes/no, either-or, pain, body map,
memory questions) use no AI at all. The model only proposes; code decides.

## Screens
- **Partner screen** (`#/`): the question, the coaching line when a rule found one, the line to say, "Show to person",
  "Less support", "Next", "Recap", "We're stuck", the badge, "Why this card", "What was sent" (the exact request, or what
  would have been sent) and "Where each step ran".
- **Person screen** (`#/person`): only the keyword, two or three big tiles with pictures, one way out, then "So: lake. Right?"
  with yes / change. The exit is top-right and needs a press-and-hold. "We're stuck" replaces the card with the fixed
  repair card (show me / write it / draw / later / change topic); a tap gives the partner the next move for that way.
- **About me** (`#/about`): names, people (name, relation, lives here, photo, nickname), foods, places, TV, music, other.
  Saved only in this browser (IndexedDB). "Delete everything on this computer" also resets cloud help consent.
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
- `scripts/e2e-cloud.mjs`: an end-to-end check against the real Firebase project.

## Run
```
npm install
cp .env.example .env.local   # fill in the Firebase web config; for localhost, an App Check debug token
npm run dev                  # http://localhost:5179
npm run check                # lint + typecheck + unit tests
npm run build                # production build + check that no debug token is bundled
node scripts/e2e-cloud.mjs   # with the dev server running: real Firebase AI Logic end-to-end
node scripts/shots.mjs       # with the dev server running: screenshots of every screen at 390 and 1280 px + layout checks
node scripts/fonts-check.mjs # with the dev server running: no request leaves the app host; the three self-hosted families load from /fonts/
```
Hidden route for the timed trial in `devlog/TRIAL_PROTOCOL.md`: `#/trial` (a stopwatch and log, kept in this browser, exported as CSV).
On-device inference needs desktop Chrome with Gemini Nano (Chrome's hardware and disk requirements apply).
Without it, yes/no, either-or and pain cards still work, and open questions use cloud help only if the partner turns it on.

## Licence
Apache-2.0. Pre-existing work is listed in `DISCLOSURE.md`.
