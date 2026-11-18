# Day 16 (18 Nov 2026, UTC): phase 5, the fixes of judge round 6

Brief: `design/PHASE5_BRIEF.md`; read first: the round's `SUMMARY.md` and the reports of the nurse's seat (13b), the
hound (05), the official-rubric seat (01 fwd) and discovery (17). What was built, in the brief's order.

| # | Item | Done | Where |
|---|---|---|---|
| 1 | "them can start" → "they can start" / "[Name] can start", and a test over every copy string with an empty name | yes | `core/copy4.ts`, `tests/unit/phase5-grammar.test.ts` |
| 2a | "Something new or sudden?": FAST, a call button (`tel:`), the number in About them (911; 999 and 112 named), a "something's wrong" tile | yes | `core/redflag.ts`, `core/copy5.ts`, `web/src/phase5.ts` |
| 2b | The boxed "Call [number] now if this is new or sudden" on the answered screen and the visit page; the pain flow under it | yes | `core/redflag.ts` (`urgentAnswer`), `web/src/main.ts` |
| 2c | The guard exempts every Body & care and Feelings answer; eight words added | yes | `core/reliability.ts` |
| 2d | Insights: one day of severe / head / chest pain; no excuse on "no drink"; few drinks under a fluid limit; 2 drinks = mention; low mood on 3 days; Month keeps recent lines | yes, with one wording kept (below) | `core/insights.ts` |
| 2e | The reword check: numbers, call / doctor / nurse, minimisers; a test | yes | `core/reword.ts` |
| 2f | Logs "Fall" and "Tablets taken"; a fall is a line, with the box when a blow to the head is noted | yes | `core/diary.ts`, `web/src/phase5.ts` |
| 3 | Read aloud with Gemini TTS through Firebase AI Logic | yes; run against the real model on localhost only | `core/speak.ts`, `web/src/ai/firebaseEngine.ts` (`speak`) |
| 4 | Stale builds and counts, the "last code commit" line, the labelled set three times again, the photo line, the paid-tier line | yes; the billing screenshot is the owner's to add | README, JUDGES, CLAIMS, EVIDENCE |
| 5 | Distinct pictures for Beth, Bo and the lake; screens shot again | yes | `tests/fixtures/photo-*.jpg`, `devlog/evidence_phase5/reshoot_phase4/` |
| 6 | "Next:" contrast; the sheets' one name and "Just this once"; four look-alikes; the README's first lines | yes; three of the four look-alike pages were not opened by us, and their rows say so | `web/src/simple.css`, `core/copy.ts`, README |
| 7 | "Since the last visit" and up to three questions for the doctor | yes | `core/since.ts` |

**The SDK check for item 3.** firebase 13.3.0 / `@firebase/ai` 3.1.0 has `GenerationConfig.speechConfig`,
`ResponseModality.AUDIO`, `TextPart.speechMetadata` and `inlineDataParts()`; `gemini-3.8-flash-tts` answered through
`getGenerativeModel(ai, { mode: ONLY_IN_CLOUD, inCloudParams: { model, generationConfig } })` with 24 kHz 16-bit PCM
(`audio/L16`), which the app wraps in a WAV header. `devlog/evidence_phase5/AI_RUN_LOG.md`.

**Decisions that differ from the brief, and why.**
- 2d, "fewer drinks than usual": the app does not know what is usual for the person, so the line under a fluid limit
  keeps the count it has ("Few drinks were entered on …: 2. A fluid limit from the doctor is noted here: check the day
  against the doctor's plan."). Never "more".
- 2d, the single pain day is "Worth mentioning" as the brief says (the nurse's report asked for "Tell"); it carries
  the fixed sentence "Tell the doctor or nurse. If it is new or sudden, call 911 now." and the call box.
- 2b, "a sudden new weakness, trouble breathing": no topic question asks about them, so the box follows a yes to a
  question the carer typed that holds one of a short list of words, and the board's "something's wrong". The list is
  short; README and CLAIMS row 88 say so.
- 2c: the exemption is by the conversation's topic and by words. A line with a fixed "whom to tell" sentence
  (the pain day, a fall, low mood, "less sure") is not handed to any model, which goes further than 2e asked.
- 3: the sound is kept for the session in memory, not in IndexedDB: a stored recording of a card with a name on it
  would be one more copy of family data to delete. A doctor-visit card is never read aloud, because that page says
  nothing of it is sent.
- 6: "Just this once" is the first button on all four sheets; only the sheet for a typed open question also has
  "Yes, every time".

**What the browser found** (`scripts/e2e-simple.py`, the phase 5 run): the call box stayed over the next topic
question; the board with nine tiles was taller than a 390 x 844 screen, in both views; the link to the emergency
number did nothing. All three fixed (`d198eb0`, `de631b1`). The week fixture's run failed after midnight because one
answer of "today" was still in the future; the script counts up to now.

**Not built, not run.** No carer, person with aphasia or clinician has used or read any of it. The `tel:` link was
pressed on no real phone. Read aloud was not run on the hosted copy by us before this was written (README "Deploy"
has what was run there). The wording steps have still not run against a real model. Sharing with a second carer, a
report for the therapist, tappable insight lines and "words that worked" (round 6, IMPROVE & ADD) are not built.

**The hosted copy (07:05 UTC, build `9d141b0`).** 20 of 20 served files equal the local build. `e2e-simple.py --live`
611/611, `pwa-check.py` 30/30, `e2e-needs.mjs` 12/12. The cloud step five times from new profiles: 28/28 once, 19/27
four times (App Check: reCAPTCHA Enterprise 403, then throttled for a day). Read aloud once: refused the same way,
no sound. README "Deploy" has it in full; `devlog/evidence_live/` has every log.
