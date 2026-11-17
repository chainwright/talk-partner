# scripts/live-voice-feedback.py against https://talk-partner.web.app/ (17 Nov 2026, 16:49 UTC)

Deployed build: working commit 40fedec (public 8e9c1b8), bundle `index-D0VmohtN.js`.
Spoken question: a WAV made with macOS `say` ("Do you want coffee or tea?"), played by Chrome's fake microphone.
Result: **17/17 passed, exit 0.** The lines below are copied from the run's terminal output (the run was not re-done
for this file, because a full run makes one real model call and writes one note).

- Playwright's bundled Chromium 148.0.7778.96 (nothing sent): page loads with no crash or page error; microphone
  button present; the first press shows the notice and records nothing; after the yes it records; dropping the
  recording sends nothing ("0 bytes left this computer"); the feedback form refuses an empty note without a request.
- Google Chrome 157.0.8103.79 (one recording, one note sent): the field received "Do you want coffee or tea?";
  the app's console line `[ai-logic] leg=voice mode=ONLY_IN_CLOUD inferenceSource=in_cloud ms=25684`; the session
  figure counted 171,580 bytes of sound handed to Google's cloud; one feedback note marked TEST written to Cloud
  Firestore (server answer 200, document id `ZNmpvRRwW9xGR01gAmgT`); no crash or page error to the end.

Also on the deployed rules the same day: `node scripts/rules-check.mjs --live` 25/25 refusals (list, query, update,
delete and every malformed create refused).

Screenshots: `live-148-recording.png`, `live-157-recording.png`, `live-157-transcribed.png`, `live-157-feedback-sent.png`.
