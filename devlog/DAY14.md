# Day 14 (18 Nov 2026, UTC): phase 3, the carer's side

Brief: `design/PHASE3_BRIEF.md`. What was built, in the brief's order, and what each part is made by.

| # | Part | Made by | Files |
|---|---|---|---|
| 1 | The answer check: "yes" to 4 of the last 5 yes / no cards, or the same place on the screen 4 times in a row (each within 10 minutes) → one gentle line for the carer, the answers marked "less sure", the next either-or in a different order | rules | `core/reliability.ts` |
| 2 | The diary: a one-tap log (drank, ate, toilet, slept, pain) with the time and Undo; the confirmed answers and the needs; Today / Week / Month, a timeline by day, a topic filter, copy as text, "Delete the diary"; IndexedDB on the device | rules | `core/diary.ts`, `web/src/diary.ts` |
| 3 | Health notes in About them: free text and four toggles | rules | `core/insights.ts`, `web/src/simple.ts` |
| 4 | What stands out for 7 or 30 days: counts, thresholds, red flags, the base of each line, the footer | rules | `core/insights.ts` |
| 4 | The wording of those lines in plainer words | Gemini Nano `ONLY_ON_DEVICE`; on a phone the cloud model, `PREFER_IN_CLOUD`, after a yes on a sheet with the exact text | `core/reword.ts`, `web/src/ai/firebaseEngine.ts` |
| 5 | The tip of the day for the carer | rules; its sentence may be reworded by Gemini Nano `ONLY_ON_DEVICE` | `core/tip.ts` |
| 6 | About them to a file and back, with a preview | rules | `core/backup.ts` |
| 6a | Bigger pictures on the person's screen | CSS | `web/src/simple.css` |
| 6b | No model outside Firebase AI Logic | a test | `tests/unit/privacy-phase3.test.ts` |
| + | The owner's phone test: the empty card area of the full view says in words what will be there (it was an ear), and the placeholder is "Your question" | — | `web/src/main.ts`, `core/copy.ts` |

## Decisions that differ from the brief, and why
- **The cloud wording text holds no health note.** The brief's step 4 allows "aggregated counts and the notes as
  typed, no names" in the cloud text; its rules say health notes never go to the cloud. The stricter one was built:
  the cloud gets the rules' own lines, a line whose own words state a health note (a fluid limit, swallowing
  difficulty) is not sent at all, and "Diabetes is noted here." is a separate fixed sentence that stays on the device.
- **The sheet comes up every time**, for those lines, once. The yes does not turn online help on for anything else.
- **The second rule of the answer check has a 10-minute limit.** Without one, the same first choice every morning
  would be flagged, and that is a preference ("Usually: tea"), not an unreliable run.
- **A yes / no card keeps its order** while the check is on (yes first is a habit worth keeping); the line asks the
  carer to check with a different question. An either-or is turned by one place.
- **A day with no entries at all is not "no drink logged"**: the app was not used that day. The red flag needs a
  past day with other entries and no drink among them, and says "That can simply mean nobody entered one."
- **"tea" on a card and "Drank" tapped within 20 minutes are one drink**, so the same cup is not counted twice.

## Not done, or true only with a limit
- Neither wording step has run against a real model: no desktop Chrome with Gemini Nano was driven for it, and the
  browser test refuses the cloud request (the screen then says the lines may have left).
- No nurse, doctor or speech and language therapist has read the rules, the thresholds or the wording. The numbers
  are ours.
- Nobody the diary is for has used it. The week in the tests is the fictional Miller family
  (`design/PERSONA_SCENARIO.md`).
- The diary is not in the About them file, has no print or PDF, and lives in one browser.
- The picture sizes were measured in headless Chromium at 390 x 844, not on a phone with its address bar showing.
- Phase 4 of the plan (first letter, "His turn", doctor-visit cards, talk about a photo) is not started.
