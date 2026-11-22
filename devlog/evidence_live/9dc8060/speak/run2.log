# Read aloud against the real model (Firebase AI Logic)

- when: 22 Nov 2026, 16:11 UTC; commit `bfaf253` with uncommitted changes; `http://localhost:5180/` (the dev server, App Check debug token)
- browser: Chromium 148.0.7778.96 (headless), 390 x 844, Android user agent: no on-device model
- PASS: before anything is asked, no other host was contacted

## 1. A topic card (made by the rules), read aloud
- PASS: the card is made by the rules and nothing was sent for it
- the sheet: "The words on this card, including names on it, go to Google to be spoken. Nothing else."; the words it shows: "Would you like tea or coffee? Tea. Coffee. Or something else."
- PASS: the sheet shows the words before the yes, and still no other host was contacted
- PASS: turning it on sends nothing by itself
- SDK report (console): `[ai-logic] leg=speak mode=ONLY_IN_CLOUD inferenceSource=in_cloud ms=7089`
- the sound that came back: [{'type': 'audio/wav', 'bytes': 416668}]; play() calls: 1
- PASS: the SDK reported inferenceSource=in_cloud for the speech step (leg=speak, ONLY_IN_CLOUD)
- PASS: sound came back as a WAV the browser can play, and it was played once
- length: about 8.7 s of 24 kHz 16-bit mono
- hosts contacted: content-firebaseappcheck.googleapis.com, firebasevertexai.googleapis.com, fonts.gstatic.com, www.google.com, www.gstatic.com
- PASS: the person's screen: the three choices and one button to hear it again
- PASS: "Hear it again" plays the kept sound: no new request, no new sound
- PASS: the card says its words went to Google to be spoken, and never "Nothing was sent"

## 2. A doctor-visit question is never read aloud
- PASS: with Read aloud on, the visit question has no "Hear it" button and nothing was asked of another host

10 of 10 checks passed
