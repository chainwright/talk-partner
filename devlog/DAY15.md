# Day 15 (18 Nov 2026, UTC): phase 4, the first letter, the person starts, before a doctor visit, talk about a photo

Brief: `design/PHASE4_BRIEF.md` (rules and reporting as `design/PHASE3_BRIEF.md`). What was built, in the brief's
order, and what each part is made by.

| # | Part | Made by | Files |
|---|---|---|---|
| 1 | The first-letter helper: an alphabet on the person's screen (26 letters, six to a row, "No, I don't know"), then a card of up to three words that start with the letter, and "something else" | rules first: About them, then the everyday words the app has a drawing for. A model only when the rules find fewer than two words: Gemini Nano `ONLY_ON_DEVICE`; on a phone the cloud model, `PREFER_IN_CLOUD`, after a yes on a sheet with the text | `core/letter.ts`, `web/src/phase4.ts`, `web/src/main.ts` (`runLetter`) |
| 2 | "[Name] wants to say something": three starters and the way out on the person's screen, each leading on there (the needs board, the topics as a picture menu, the feelings card); the carer reads "Frank started this: …" and up to three questions | rules | `core/turn.ts` |
| 3 | Before a doctor visit: up to eight questions from a fixed list, one page of the person's own answers with the date, to show, print or copy | a fixed list in the source; no model at all | `core/visit.ts` |
| 4 | Talk about a photo: the carer picks a family photo; three choice questions about it; the photo over the question on the person's screen | rules, from the photo's word and About them. Where the browser's Gemini Nano takes a picture: one more question from the things the model names, `ONLY_ON_DEVICE`, after the carer's tap | `core/phototalk.ts`, `web/src/ai/firebaseEngine.ts` (`lookDevice`) |
| 5 | Fixtures, the browser run, offline, overflow, contrast | — | `scripts/e2e-simple.py` (`phase4`, `phase4_offline`, `miller_p4`), `scripts/overflow-check.py` (`phase4`), `scripts/contrast-check.mjs`, `scripts/phase4-shots.py` |

## The image spike (step 4 of the brief): it passes

Question: does Firebase AI Logic hybrid on-device accept an image in this Chrome?

**Yes.** Chrome 157.0.8103.52 on this Mac (the profile that has Gemini Nano, remote debugging port 9335), firebase
13.3.0 / @firebase/ai 3.1.0.

1. The browser: `LanguageModel.availability({ expectedInputs: [{ type: 'text', languages: ['en'] }, { type: 'image' }], … })`
   answers `available` (text alone: `available`).
2. The SDK: its on-device adapter takes `inlineData` of `image/jpeg` and `image/png`
   (`node_modules/@firebase/ai/dist/esm/index.esm.js`, `ChromeAdapterImpl.SUPPORTED_MIME_TYPES`), turns it into an
   `ImageBitmap` and hands it to the browser's model.
3. The call, through the engine's new `lookDevice` (`getGenerativeModel(…, { mode: InferenceMode.ONLY_ON_DEVICE, onDeviceParams: { createOptions: { expectedInputs: [text, image], … }, promptOptions: { responseConstraint } } })`,
   then `generateContent([{ inlineData }, prompt])`), first tried from the page's console on the dev server:

   | Picture | Bytes | SDK report | Answer |
   |---|---|---|---|
   | `tests/fixtures/photo-mug.jpg` (a red mug on a table) | 17 028 | `[ai-logic] leg=look mode=ONLY_ON_DEVICE inferenceSource=on_device ms=22033` (the first call loads the model) | `{"things": ["mug", "table"]}` |
   | a drawn scene on a canvas, PNG (a house, a tree, the sun, grass) | 6 675 | `[ai-logic] leg=look mode=ONLY_ON_DEVICE inferenceSource=on_device ms=2413` | `{"things": ["house", "tree", "sun", "grass"]}` |

   No host was contacted during the two calls (a `PerformanceObserver` on the page saw no request).
4. The same through the app's own screens (`python3 scripts/e2e-phase4-ai.py --port 9335 --cloud`, saved as
   `devlog/evidence_phase4/AI_RUN_LOG.md`): "Talk about a photo" → the photo → "Ask the AI on this device to look at
   it" → `inferenceSource=on_device` → the question "What in this photo shall we talk about? mug · table" → the
   person's card. No host but the app's own was contacted.

So the version with images was built, on the device only. **Limits of this evidence:** two pictures in the console and
one through the app, all simple, none a real family photo with people in it; how well the model names things in a
crowded photo is not measured. That is why the model's words are only ever choices of one extra question, every word
about a person is dropped by code, and the three rule-made questions never depend on it.

## Decisions that differ from the brief, and why
- **Never "Who is this?".** The brief's example for the photo step is "Who is this? Beth / Tom / someone else".
  `design/DISCOVERY_2026-11-17.md` (feature 6) says never, because it is a memory test, and the rules of this app
  refuse such questions everywhere else. The questions built are social ones: a call or a visit for a person's photo,
  going there again for a place, "How does this photo make you feel?", "Who shall we show this photo to?", and from
  the model "What in this photo shall we talk about?".
- **The model is asked for things, not for questions.** The brief has the AI propose three questions. Here the
  on-device model names up to four things it sees, and code builds one question with fixed wording from them. A
  misread picture then costs one wrong word among the choices, never a wrong or hurtful question; the model is told
  to say nothing about people, and code drops every word about a person's looks, age, health or mood anyway.
- **The carer starts the look.** On a desktop with Nano the model does not look at every photo by itself: one button,
  "Ask the AI on this device to look at it", with the line that the photo is not sent.
- **The first-letter helper asks a model only when the rules find fewer than two words.** With Beth, Bo and biscuits
  in About them there is nothing for a model to add, so none is called, on any device (the brief's test).
- **The cloud text of the letter step leaves out what was refused.** The brief says the letter and the question only;
  the choices that did not fit could be About-them words, so they stay in the on-device prompt.
- **With online help already on, the letter step does not bring the sheet up again.** As for an open question and the
  narrowing step: the sheet is for turning online help on; the carer's screen says before the tap that the question
  and the letter go to it. With online help off nothing is sent without a yes on the sheet.
- **What a model may not put on a letter card:** alcohol, tobacco, a medicine. The family can add any word of their
  own in About them; a model does not bring those in.
- **A word about pain, the toilet, the doctor or the nurse is never left as "a word".** "pain" leads straight to
  "Where does it hurt?" with the line about the nurse or doctor; "toilet" says go now.
- **After "something else" three things still stand on the carer's screen**, now the next question, "Narrow it
  down" and "Try the first letter"; "Ask them to show or write it" is the first thing under "More" (and the stuck
  card offers the first letter too).
- **The doctor-visit answers are kept apart** from the history and the diary (their own key), so the answer check
  never counts or marks them and no step that builds a request can read them. The page shows each answer exactly as
  given; the one line outside the printed page is "If the pain is new or strong, do not wait for the visit: call the
  nurse or doctor."
- **The footer has no "his".** The brief's footer is "His answers, in his words where possible. Not a medical
  record." The app has no field for he or she and never says either, so the footer is "Frank's answers, in Frank's
  own words where possible. Not a medical record." (without a name: "Their answers, in their own words …").
- **"What worries you most?" has "nothing much" on its first screen**, so the question does not presume a worry.
- **The topics menu has six topics, three to a screen.** Feelings have their own starter, and no screen of the person
  shows more than three choices and a way out (the alphabet is the one exception, as the brief says).
- **What the person started is never counted by the answer check**, and its line ("may be tired") never stands on a
  screen that follows from it.

## Not built
- **Carol's own notes on the doctor-visit page** (labelled as hers, apart from his answers; discovery, feature 4) and
  sets by kind of visit (GP, neurology, speech therapy). One fixed list of eight was built.
- **A manifest shortcut or lock-screen entry for "wants to say something"**: it is a button on the first screen. The
  person can use it only when the phone is within reach.
- **Photos from the phone's album in "Talk about a photo"**: it uses the photos already added in About them (each
  has its word, which the rules need).
- **The first letter with the eight most likely letters first, or a keyboard for a second letter.** One letter, the
  whole alphabet.
- **An "another letter" count or any record of misses**: on purpose.

## Not run, and what that leaves open
- **Nobody the app is for has tried any of this.** No person with aphasia has pointed to a letter here; some cannot
  tell the first letter of a word at all, which is why the screen has "No, I don't know" and counts nothing.
- **No clinician has read the doctor-visit list.** It is general on purpose, but "vetted" here means written and
  checked by us against the rule "no illness, no medicine, no advice", not by a doctor, nurse or therapist.
- **The on-device steps ran in one Chrome on one Mac**, a few times each (the log above). No measurement of how often
  the model's words are useful.
- **The cloud letter step ran against the real model for two letters** (in the saved run "K": kombucha, kefir; "X":
  nothing usable, and the screen said so). On the device the model added "soup, spice" for "S" and "honey, herb" for
  "H" after "tea or coffee?": words that start with the letter, not all of them likely answers. The words are the
  model's; the app only checks them, and nobody has measured how often they help.
- **The printed page** was not printed on paper (the print rules hide the buttons; a screenshot of the page stands in).

## After the third role-play on the hosted copy (Carol and Frank, 390 px, build `43e9293`)
Three findings, all fixed the same day:
1. **"ginger biscuits" under "It starts with B".** A word matched by a later word now shows that word first on the
   tile, "biscuits (ginger)"; the carer's line, the photo and what counts as refused still go by the family's own
   word. And the order follows the conversation: words of its kind first when that is known (after "tea or coffee?"
   drinks, by `core/kinds.ts` and the About-them list the word stands in), then people, then the rest. With the
   role-play's About them, "B" gives Beth, biscuits (ginger), bed.
2. **Frank wanted to tell something about Beth and Carol got "Would you like to see Beth?".** After a topic the
   person now gets one more card on their own screen ("Who is it about?" with up to three names and "someone else";
   "Is it about today, or another day?"; TV or music; food or a drink; last night or now), and the carer gets
   questions about the telling: "Is it good news, or a worry?", "Did something happen?", "Do you want to tell me now
   or later?". They are in the trees (`core/tree.ts`), and `tests/unit/turn.test.ts` walks every answer of every one
   of them: that walk caught two wordings the rules read wrongly ("good news or a worry" gave "news / worry"; "about
   today or another day" gave "about / another day"), which is why the first has a comma and the second no "about".
   "Body & care" has no such card: the carer's first question there is "Are you in pain?".
3. **"Do not answer for them."** on the doctor-visit screen now names the person, with the same line as everywhere
   else ("Wait. Count to ten. Don't answer for Frank.").
