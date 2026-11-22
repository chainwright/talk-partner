# Read aloud against the real model (Firebase AI Logic)

- when: 22 Nov 2026, 18:14 UTC; commit `51470a8`, working tree clean; `https://talk-partner.web.app/` (the hosted copy, App Check with reCAPTCHA Enterprise)
- browser: Chromium 148.0.7778.96 (a normal window), 390 x 844, Android user agent: no on-device model
- PASS: before anything is asked, no other host was contacted

## 1. A topic card (made by the rules), read aloud
- PASS: the card is made by the rules and nothing was sent for it
- the sheet: "The words on this card, including names on it, go to Google to be spoken. Nothing else."; the words it shows: "Would you like tea or coffee? Tea. Coffee. Or something else."
- PASS: the sheet shows the words before the yes, and still no other host was contacted
- PASS: turning it on sends nothing by itself
- SDK report (console): `none`
- the sound that came back: none; play() calls: 0
- the screen says: "No sound"; console: ['[2026-11-22T18:14:33.690Z]  @firebase/app-check: AppCheck: 403 error. Attempts allowed again after 01d:00m:00s (appCheck/initial-throttle).', '[2026-11-22T18:14:33.690Z]  @firebase/app-check: AppCheck: 403 error. Attempts allowed again after 01d:00m:00s (appCheck/initial-throttle).', '[2026-11-22T18:14:33.690Z]  @firebase/ai: Unable to obtain a valid App Check token: AppCheck: 403 error. Attempts allowed again after 01d:00m:00s (appCheck/initial-throttle).']
- FAIL: the SDK reported inferenceSource=in_cloud for the speech step (leg=speak, ONLY_IN_CLOUD) ([])
- FAIL: sound came back as a WAV the browser can play, and it was played once ([])
- hosts contacted: content-firebaseappcheck.googleapis.com, firebasevertexai.googleapis.com, www.google.com, www.gstatic.com
- FAIL: the person's screen: the three choices and one button to hear it again (Carer: hold here to go back Not now No sound Point to your answer Would you like tea or coffee? tea coffee something els)
- FAIL: "Hear it again" plays the kept sound: no new request, no new sound (0 new requests)
- PASS: the card says its words went to Google to be spoken, and never "Nothing was sent"

## 2. A doctor-visit question is never read aloud
- PASS: with Read aloud on, the visit question has no "Hear it" button and nothing was asked of another host

6 of 10 checks passed
