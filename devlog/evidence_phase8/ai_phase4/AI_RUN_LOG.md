# Phase 4 against real models (Firebase AI Logic)

- date: 2026-11-18T18:59:31+00:00
- commit: `c070bc482343c483406b238731ee5f730310aa8c`; working tree clean
- app: http://localhost:5243/ (the dev server), the simple view, the made-up Miller family (Frank; Carol asking; Beth, Tom; ginger biscuits, porridge; the lake, church; Bo the dog)
- SDK: firebase 13.3.0, @firebase/ai 3.1.0

## 1. On this device: Chrome 157.0.8103.52, Gemini Nano, attached on port 9335

- user agent: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/157.0.0.0 Safari/537.36`
- `LanguageModel.availability` with text only, and with text and an image: `{'text': 'available', 'image': 'available'}`
- PASS  the browser's model reports that it takes an image  ({'text': 'available', 'image': 'available'})

### 1a. Talk about a photo: the on-device model looks at the photo

- PASS  where the browser has the model, the carer is offered "Ask the AI on this device to look at it"  (It names things it sees, for one more question. It runs on this device only; the photo is not sent.)
- the photo: `tests/fixtures/photo-bo.jpg` (our drawing of a dog; until phase 5 this run used the red mug of photo-mug.jpg), under the word "Bo", as About them keeps it
- SDK report (console): `[ai-logic] leg=look mode=ONLY_ON_DEVICE inferenceSource=on_device ms=23090`
- PASS  the SDK reported inferenceSource=on_device for the photo step (leg=look, ONLY_ON_DEVICE)
- the question code made from what the model named: "What in this photo shall we talk about? dog · collar · button"
- PASS  code kept at least two of the model's words and made one more question from them  (What in this photo shall we talk about? dog · collar · button)
- PASS  the screen says the AI on this device looked, and that the photo did not leave it  (The last question is from the AI on this device: it looked at the photo here. The photo did not leave this device.)
- PASS  no host but the app's own was contacted while the model looked at the photo
- screenshot: `devlog/evidence_phase8/ai_phase4/ai_01_on_device_model_looked_at_the_photo.png`
- on the person's screen: the photo, "What in this photo shall we talk about?", and ['dog', 'collar', 'button', 'something else']
- PASS  the person's card has at most three of those words and "something else"  (['dog', 'collar', 'button', 'something else'])
- screenshot: `devlog/evidence_phase8/ai_phase4/ai_02_person_what_in_this_photo.png`

### 1b. The first letter, a letter no word of About them starts with: the on-device step adds words

- "S" (About them has no word with S; the everyday words have one, "snack"): on the card ['snack', 'soda', 'something else']
- SDK report (console): `[ai-logic] leg=private mode=ONLY_ON_DEVICE inferenceSource=on_device ms=4442`
- "H" (About them has no word with H; the everyday words have one, "hearing aid"): on the card ['hearing aid', 'hot chocolate', 'something else']
- SDK report (console): `[ai-logic] leg=private mode=ONLY_ON_DEVICE inferenceSource=on_device ms=4219`
- PASS  the on-device step ran for the letter (leg=private, ONLY_ON_DEVICE, inferenceSource=on_device)
- PASS  every word on the card starts with H, and the way out is there  (['hearing aid', 'hot chocolate', 'something else'])
- PASS  no host but the app's own was contacted for the letter step
- screenshot: `devlog/evidence_phase8/ai_phase4/ai_03_letter_H_words_on_device.png`

## 2. Online help: Chromium 148.0.7778.96 (headless, no model in the browser), as a phone

- the sheet's line: "Would you like tea or coffee? They cannot say the word. It starts with the letter "K". The conversation is about something to drink. The person is an adult, most often 60 or older: give common, plain words that an older adult uses at home."
- PASS  before the yes nothing was asked of any other host
- PASS  the request the sheet shows holds no word of About them
- SDK report (console): `[ai-logic] leg=stripped mode=PREFER_IN_CLOUD inferenceSource=in_cloud ms=2738`
- on the card: No more words that start with K were found. Ask them to show you, or write it down together.
- PASS  the cloud step ran through Firebase AI Logic (leg=stripped, PREFER_IN_CLOUD, inferenceSource=in_cloud)
- **FAIL**  every word on the card starts with K, and the way out is there  ([])
- hosts contacted after the yes: content-firebaseappcheck.googleapis.com, firebasevertexai.googleapis.com, fonts.gstatic.com, www.google.com, www.gstatic.com
- screenshot: `devlog/evidence_phase8/ai_phase4/ai_05_letter_K_words_from_online_help.png`
- "X" with online help on (SDK: `none`): Frank pointed to X. No word that starts with X is in About them yet.
- **FAIL**  a hard letter ("X"): either every word starts with X, or the carer is told plainly that none was found; a word that does not start with the letter never stands  ([] Frank pointed to X. No word that starts with X is in About them yet.)

13 of 15 checks passed
