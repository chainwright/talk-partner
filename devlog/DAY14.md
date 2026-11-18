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

## After a role-play on the hosted copy (Carol and Frank, 390 px)
| # | Finding | Done |
|---|---|---|
| 1 | The sheets said the free tier's data use; the project is on the paid tier since 17 Nov (the owner's statement) | Done: every place says the paid terms' use, with the terms' URL in `CLAIMS.md` row 73. Not checked by us: the billing account itself |
| 2 | The narrowing sheet led with the raw instructions | Done: plain words and the conversation's own line; the whole request behind a fold |
| 3 | Six things to press after "something else"; "Try: strong tea with milk or porridge" after tea was refused | Done: three stay; a refused choice is never offered again and the kind is kept (a test over every topic question) |
| 4 | "Call someone" asked one name at a time | Done: "Who would you like to call?" with up to three names and "someone else"; the same for a visitor |
| 5 | "Chrome's built-in AI" in About them; "they" after the name was set | Done: the sentence is in the inside view only; the learned, photos and diary lines use the name |

## After a second role-play, on the hosted copy of d04e530
| # | Finding | Done |
|---|---|---|
| 1 | SAFETY: under "Are you in pain? Yes" the answer check said "may be tired"; a carer could dismiss real pain | Done: an answer about pain, the toilet, help or a need does not count toward a run, is never marked "less sure", and no line stands on its screen; "Next: Where does it hurt?" stays. The check speaks only after a run of 2 minutes or more, or with 5 answers or more in the 10 minutes. Its text is a headline and one line; the rest under "More" |
| 2 | Three "Drank" taps at 08:10 counted as one drink | Done: every tap counts; only a card and one tap of the same thing within 20 minutes are one (and the answers of one conversation). A test: 3 taps in the same minute are 3 |
| 3 | Two days tied on the fewest drinks, one was named | Done: all the days with the fewest are named (the last three at most), "1 each" |
| 4 | Drink answers from cards | Done: tea, coffee, water, juice, milk and yes to "something to drink" count, merged with a tap as in 2, and the base line says how drinks are counted |

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
