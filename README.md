# Talk Partner

After a stroke, many adults with aphasia understand what is said but can't find the words to answer.
Talk Partner helps **the partner** ask the way a speech therapist would: it turns the partner's own question into a
written-choice card (a keyword, two choices with pictures, an escape every time, a tick/cross check) and gives the
partner the exact line to say. It never guesses the person's answer.

Based on Supported Conversation for Adults with Aphasia (SCA) principles. Not a therapy, not a diagnosis.

Built for #BuildHybridAI 2026. Status: early (day 4: card rules, the five screens, consent flow, judge mode with a privacy receipt; no deploy yet). See `devlog/`.

## For judges: 60 seconds

```
npm install && npm run dev        # then open http://localhost:5179/#/demo
```
No account, no sign-in. `#/demo` loads a made-up family (Frank; Carol asking) and one-tap questions. Click these, in order:

| Click | What you see | Badge |
|---|---|---|
| **Do you want coffee or tea?** | the card is read from the question in code; the pane on the right is what the person sees ("Show to person" makes it full screen) | No AI needed |
| **Where does it hurt?** | body map, two steps, never AI; "your left arm" is the person's own left | No AI needed |
| **What year did we get married?** | no card: a memory question is never a quiz; the partner gets the line to say instead | No card |
| **What do you want to do this weekend?** | open question. With Gemini Nano in this Chrome: the private step runs on this computer with the About-me lists. Without it: no card and an offer to use cloud help with the question only | On this computer, or No card |
| **Cloud help: off** (top bar) → read the consent screen, tick, **Turn on cloud help**, then the weekend question again | the stripped question goes to Gemini through Firebase AI Logic (`PREFER_IN_CLOUD`); "What was sent" shows the exact request; the **privacy receipt** below the judge box shows the bytes that left and the names withheld | Cloud help (question only) |
| **Should we ring Jen or Tyler?** | "What was sent" shows `Person A` / `Person B`; the nickname is swapped like a name | No AI needed |

**What each badge means** (every badge comes from the SDK's `inferenceSource`, never from an assumption):
- **On this computer**: the private step (`ONLY_ON_DEVICE`) answered and the SDK reported `ON_DEVICE`.
- **Cloud help (question only)**: the stripped step (`PREFER_IN_CLOUD`) answered and the SDK reported `IN_CLOUD`. Only then does "What was sent" say *sent*.
- **Ran on this computer (offline)**: the stripped step fell back to the device (SDK reported `ON_DEVICE`); nothing left.
- **No AI needed**: code decided the card (yes/no, either-or, pain, body map, memory); a model may have run, but nothing of its answer is on the card.
- **No card**: blocked; the partner is told to ask normally.

Under every card, **"Where each step ran"** lists the private step, the cloud step and the rules, each as *ran on this computer / ran in the cloud / did not run (why) / failed (why)*. A step that did not run says so.

**Privacy receipt** (judge mode and `#/how`): per session, the bytes that left this computer and the names withheld, counted on the recorded request bodies (`core/receipt.ts`), never estimated; the counted text is in the export so you can check it by hand. "Checked after" searches the sent text once more for About-me words and photo bytes.

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
| `core/pipeline.ts:303` | `ran: r.source` | the private step's trace line is the engine's report |
| `core/pipeline.ts:381` | `ran: r.source` | the stripped step's trace line is the engine's report |
| `core/pipeline.ts:405` | `const sent = r.source === 'in-cloud'` | "sent" is claimed only when the SDK said the cloud answered |
| `web/src/main.ts:174` | `function badge(` | the badge is drawn from `card.source` only |

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
- **Partner screen** (`#/`): the question, the line to say, "Show to person", "Less support", "Next", "Recap", the badge,
  "What was sent" (the exact request, or what would have been sent) and "Where each step ran".
- **Person screen** (`#/person`): only the keyword, two or three big tiles with pictures, one way out, then "So: lake. Right?"
  with yes / change. The exit is top-right and needs a press-and-hold.
- **About me** (`#/about`): names, people (name, relation, lives here, photo, nickname), foods, places, TV, music, other.
  Saved only in this browser (IndexedDB). "Delete everything on this computer" also resets cloud help consent.
- **Cloud help** (`#/cloud`): off by default. The consent screen shows what is sent (the last question in the exact
  payload form), who receives it, what is never sent, and the data-use terms; one checkbox turns it on, one tap turns it off.
- **Judge mode** (`#/demo`): a made-up family, one-tap questions of each kind, and per card a "where each step ran" line
  built only from what the SDK reported (`inferenceSource`). A step that did not run says so and why. Nothing claims
  on-device unless the device answered. **How this works** (`#/how`): the three steps, a diagram, the session tally.

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
node scripts/fonts-check.mjs # with the dev server running: no request leaves the app host; the default look loads no webfont
```
Hidden route for the timed trial in `devlog/TRIAL_PROTOCOL.md`: `#/trial` (a stopwatch and log, kept in this browser, exported as CSV).
On-device inference needs desktop Chrome with Gemini Nano (Chrome's hardware and disk requirements apply).
Without it, yes/no, either-or and pain cards still work, and open questions use cloud help only if the partner turns it on.

## Licence
Apache-2.0. Pre-existing work is listed in `DISCLOSURE.md`.
