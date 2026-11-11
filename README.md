# Talk Partner

After a stroke, many adults with aphasia understand what is said but can't find the words to answer.
Talk Partner helps **the partner** ask the way a speech therapist would: it turns the partner's own question into a
written-choice card (a keyword, two choices with pictures, an escape every time, a tick/cross check) and gives the
partner the exact line to say. It never guesses the person's answer.

Based on Supported Conversation for Adults with Aphasia (SCA) principles. Not a therapy, not a diagnosis.

Built for #BuildHybridAI 2026. Status: early (day 2: the card rules and their tests; no deploy yet). See `devlog/`.

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

## Layout
- `core/`: the shared card logic (rules, privacy swap, prompts, schema, sample family). Pure TypeScript, no DOM,
  no Firebase, so every client reuses it unchanged.
- `web/`: the web client (one screen). `web/src/ai/` is the only place that imports `firebase/ai`.
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
```
On-device inference needs desktop Chrome with Gemini Nano (Chrome's hardware and disk requirements apply).
Without it, yes/no, either-or and pain cards still work, and open questions use cloud help only if the partner turns it on.

## Licence
Apache-2.0. Pre-existing work is listed in `DISCLOSURE.md`.
