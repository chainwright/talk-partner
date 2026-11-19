# Read aloud on the hosted copy (8a8eaf7), 19 Nov 2026 about 00:14-00:16 UTC

`HEADED=1 python3 scripts/e2e-speak.py --url https://talk-partner.web.app/` (Chromium 148 in a normal window, 390 x 844,
Android user agent, a fresh profile each run).

- **Run 1 (00:14 UTC): 10 of 10.** The SDK reported `[ai-logic] leg=speak mode=ONLY_IN_CLOUD inferenceSource=in_cloud
  ms=7853`; an `audio/wav` of 370,588 bytes (about 7.7 s, 24 kHz 16-bit mono) came back and was played once; "Hear it
  again" asked nothing new; the doctor-visit question had no "Hear it" button. Hosts contacted:
  content-firebaseappcheck.googleapis.com, firebasevertexai.googleapis.com, www.google.com, www.gstatic.com.
  Its log file was overwritten by run 2 (same folder); the lines above are copied from that run's terminal output,
  and the two screenshots in this folder are from run 2.
- **Run 2 (00:15 UTC) and run 3 (00:16 UTC, `../8a8eaf7_speak_run3/`): 6 of 10.** App Check answered 403
  ("appCheck/initial-throttle"): reCAPTCHA Enterprise refused the automated browser after the first run, so no sound
  was asked for and the card said "No sound". The rules card and the person's screen were unaffected.
  Log: `AI_RUN_LOG_run2_appcheck_403.md`.
