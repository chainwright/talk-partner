# Phase 4 against real models (Firebase AI Logic)

- date: 2026-11-18T04:58:29+00:00
- commit: `9ff3e9dae0e2f6b8688dfa01aa2ec83bb899a378`; working tree clean
- app: http://localhost:5179/ (the dev server), the simple view, the made-up Miller family (Frank; Carol asking; Beth, Tom; ginger biscuits, porridge; the lake, church; Bo the dog)
- SDK: firebase 13.3.0, @firebase/ai 3.1.0

## 1. On this device: Chrome 157.0.8103.52, Gemini Nano, attached on port 9335

- user agent: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/157.0.0.0 Safari/537.36`
- `LanguageModel.availability` with text only, and with text and an image: `{'text': 'available', 'image': 'available'}`
- PASS  the browser's model reports that it takes an image  ({'text': 'available', 'image': 'available'})

### 1a. Talk about a photo: the on-device model looks at the photo

- PASS  where the browser has the model, the carer is offered "Ask the AI on this device to look at it"  (It names things it sees, for one more question. It runs on this device only; the photo is not sent.)
- the photo: `tests/fixtures/photo-mug.jpg` (a red mug on a table), under the word "Bo", 320 px JPEG as About them keeps it
- SDK report (console): `[ai-logic] leg=look mode=ONLY_ON_DEVICE inferenceSource=on_device ms=23523`
- PASS  the SDK reported inferenceSource=on_device for the photo step (leg=look, ONLY_ON_DEVICE)
- the question code made from what the model named: "What in this photo shall we talk about? mug · table"
- PASS  code kept at least two of the model's words and made one more question from them  (What in this photo shall we talk about? mug · table)
- PASS  the screen says the AI on this device looked, and that the photo did not leave it  (The last question is from the AI on this device: it looked at the photo here. The photo did not leave this device.)
- PASS  no host but the app's own was contacted while the model looked at the photo
- screenshot: `devlog/evidence_phase4/ai_01_on_device_model_looked_at_the_photo.png`
- on the person's screen: the photo, "What in this photo shall we talk about?", and ['mug', 'table', 'something else']
- PASS  the person's card has at most three of those words and "something else"  (['mug', 'table', 'something else'])
- screenshot: `devlog/evidence_phase4/ai_02_person_what_in_this_photo.png`

### 1b. The first letter, a letter no word of About them starts with: the on-device step adds words

- "S" (About them has no word with S; the everyday words have one, "snack"): on the card ['snack', 'soup', 'spice', 'something else']
- SDK report (console): `[ai-logic] leg=private mode=ONLY_ON_DEVICE inferenceSource=on_device ms=4198`
- "H" (About them has no word with H; the everyday words have one, "hearing aid"): on the card ['hearing aid', 'honey', 'herb', 'something else']
- SDK report (console): `[ai-logic] leg=private mode=ONLY_ON_DEVICE inferenceSource=on_device ms=3902`
- PASS  the on-device step ran for the letter (leg=private, ONLY_ON_DEVICE, inferenceSource=on_device)
- PASS  every word on the card starts with H, and the way out is there  (['hearing aid', 'honey', 'herb', 'something else'])
- PASS  no host but the app's own was contacted for the letter step
- screenshot: `devlog/evidence_phase4/ai_03_letter_H_words_on_device.png`

## 2. Online help: Chromium 148.0.7778.96 (headless, no model in the browser), as a phone

- the sheet's line: "Would you like tea or coffee? They cannot say the word. It starts with the letter "K"."
- PASS  before the yes nothing was asked of any other host
- PASS  the request the sheet shows holds no word of About them
- SDK report (console): `[ai-logic] leg=stripped mode=PREFER_IN_CLOUD inferenceSource=in_cloud ms=1955`
- on the card: ['kombucha', 'kefir', 'something else']
- PASS  the cloud step ran through Firebase AI Logic (leg=stripped, PREFER_IN_CLOUD, inferenceSource=in_cloud)
- PASS  every word on the card starts with K, and the way out is there  (['kombucha', 'kefir', 'something else'])
- PASS  the card says that online help added words, and what it got  (Online help added words. It got the question and the letter, nothing from About them.)
- hosts contacted after the yes: content-firebaseappcheck.googleapis.com, firebaseinstallations.googleapis.com, firebaseremoteconfig.googleapis.com, firebasevertexai.googleapis.com, fonts.gstatic.com, www.google.com, www.gstatic.com
- screenshot: `devlog/evidence_phase4/ai_05_letter_K_words_from_online_help.png`
- "X" with online help on (SDK: `[ai-logic] leg=stripped mode=PREFER_IN_CLOUD inferenceSource=in_cloud ms=1476`): No more words that start with X were found. Ask them to show you, or write it down together.
- PASS  a hard letter ("X"): either every word starts with X, or the carer is told plainly that none was found; a word that does not start with the letter never stands  ([] No more words that start with X were found. Ask them to show you, or write it down together.)

16 of 16 checks passed
