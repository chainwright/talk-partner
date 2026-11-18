# Day 18 (still 18 Nov 2026 by UTC, 12:30 to 13:35): phase 7, a page for the speech therapist and a communication passport

Brief: `design/PHASE7_BRIEF.md` (items D and F of judge round 6). The file is "day 18" because it follows
`DAY17.md`; by the clock it is the same day. **No AI was added**: both pages are rules and fixed text on the device.
No carer, no person with aphasia, no speech therapist and no nurse has used or read either of them. **Nothing was
deployed** (see the end).

| # | Item | Done | Where |
|---|---|---|---|
| B1 | "For the speech therapist", from the diary screen, the last 7 or 30 days, counts only | yes | `core/practice.ts`, `web/src/care7.ts` (`practiceScreen`) |
| B2 | No score, no "good / bad", no advice; each line says what it counts; three fixed questions picked by the carer | yes | `core/copy8.ts`, `tests/unit/phase7-practice.test.ts` |
| B3 | The person's own data out by default; the tick "Include the needs and pain answers" is off | yes | `practiceInput` in `web/src/main.ts` (`diary: null` unless ticked) |
| B4 | Print, and share through the sheet of phase 6 | yes | `web/src/main.ts` (`page-print`, `share-page`), `web/src/phase6.ts` (`page`) |
| B5 | Unit tests for every count, no days, one question, the 20-minute merge, the grade words | yes | `tests/unit/phase7-practice.test.ts` (36) |
| C1 | "How to talk with Frank" from About them, the learned habits and fixed lines; name or "they" | yes | `core/passport.ts` |
| C2 | Yes and no (the carer fills it in), "Words that worked", "Things he likes to talk about", "If something is wrong" | yes | `core/passport.ts`, `core/copy8.ts` |
| C3 | The carer approves every line; every learned line can be removed; print or share through the sheet | yes | `web/src/care7.ts` (`passportScreen`: the lines, then the page) |
| C4 | Tests: an empty profile, the names, no care-question habit, the FAST line, the browser at 390 px with the print view | yes | `tests/unit/phase7-passport.test.ts` (26), `scripts/e2e-simple.py` (`phase7`) |
| Then | README, JUDGES, CLAIMS rows 108 to 113, this file | yes | |
| Then | Deploy, "live = dist", the live runs | **no** | the Firebase login expired; signing in is the owner's step |

**Where the counts come from.** Nothing the app kept before today could answer the brief's questions: the tip of
the day keeps four marks per question and no topic, and nothing recorded "something else", a start by the person,
"We're stuck" or the check. So there is a new log (IndexedDB key `practice`): one row for a question that became a
card, for a "Yes" and a "No, something else" on the check, for a start by the person, for "We're stuck", for the
needs board opened from the first screen. A row holds a time, a kind, one of the seven topics and yes / no marks,
and no word of a question or an answer; a test reads the type, and the browser run searches the stored log for the
words that were asked. The price: **the counts begin with this build**. The page names the day it began while that
day is inside the span.

**Decisions that differ from the brief, and why.**

*B, the page for the speech therapist.*
- "What helped after 'something else': first letter, narrowing, nothing". Since the fix of the morning there are
  seven ways, not two. The page names each that led to a confirmed answer (more choices of the same kind, the first
  letter, a word the carer typed after showing or writing, choices suggested by AI, the needs board, the body card,
  another question) and "none". It counts both how often "something else" was confirmed and in how many
  conversations, so that the ways and "none" add up to the conversations (tested on 400 made-up logs).
- "Flagged … and reworded". What is counted is what the app did with a flagged question: two things in one were
  asked one at a time (and how often the second was then asked); a memory question got no card and a line to say
  instead (and how often "make a card" was pressed after it). Whether the carer then asked it another way in her own
  words is not counted: the log keeps no words to compare.
- A third source beside "made by the app" and "typed": spoken. And a topic "Other" for a typed question that fits
  none of the seven.
- "Read aloud on or off" is the setting on the day the page is made. There is no history of it.
- The tick stands on the page, not on the share sheet: the page is what is printed, so what is in it has to be
  decided there. The sheet then has no box and says whether the answers are in the text.
- With the tick off and a strong pain, a pain in the head or the chest, or "something's wrong" in the diary of the
  span, the carer's screen says so, with "Tell the doctor or nurse. If it is new or sudden, call 911 now." Not in the
  brief. Worst case it answers: a calm page of counts about a week in which there was a chest pain. The page itself
  stays without it, as the brief asks.
- With the tick on, the same entries put "Call 911 now if this is new or sudden" at the top of the page and whom to
  tell under the answers, as in the texts of phase 6.
- "The needs and pain answers" are just that: the needs pointed to, and pain. No drink, no fall, no tablets. The
  20-minute merge is relevant here only (a pain answered on a card and a "Pain" tap within 20 minutes are one).
- Ten fixed questions for the therapist, up to three picked. They are worded as questions without "should" or
  "must", because the test of grade words reads them too.
- "Delete these counts" was added (the log is new personal data on the device; "Delete everything" removes it too).
- Not counted: the questions of "Before a doctor visit" (nothing reads those answers), and the feelings card the
  person reaches by their own start (it is counted as a start).
- One more line under the title: "These are counts to talk over. They are not a score of the family or of Frank."

*C, the passport.*
- **Two of the brief's lines read differently, by the coordinator's instruction after reading the first commit.**
  "Don't answer for him, and don't test him" is "Don't answer for Frank, and don't quiz: no testing questions."; and
  the line that says who started on the therapist's page no longer repeats the name.
- A fifth fixed line, first on the page: "Frank knows what to say. The words are hard to find." It is the
  acknowledge-competence half of SCA that the speech-therapy seat of round 6 found missing.
- "The carer edits … every line" is: take any line off and put it back, type how yes and no are shown, add up to
  three lines of her own. The wording of the app's own lines cannot be retyped.
- "If something is wrong" cannot be taken off. A page for a nurse must not be able to lose the emergency number.
  Beside the number and FAST it holds the rest of phase 5's fixed text (the four more reasons to call, "call the
  doctor or nurse today") and one new line: "This page is about talking. It holds no health notes: ask the family,
  and go by the doctor's plan."
- The health notes are not on the passport at all (the brief does not list them). The risk is named in CLAIMS row 112.
- "Things he likes to talk about: People & family and photo-talk topics, with counts". The history does not mark a
  photo-talk answer or a topic, so the count is by thing: a person of About them or a photo's word, each time it was
  the confirmed answer or the answer was yes to an offer that names it ("Would you like to call Tom?"), twice at
  least. A yes to a question that is not an offer ("Are you angry with Beth?") does not count, nor does a "no". The
  section says "It says what was chosen, not what is felt."
- The usual choices pass the rule of the note for the next carer: none about pain, the body, a feeling or a need,
  and no usual "no". The same word list keeps care words out of the first-letter words; it also drops "hot
  chocolate" ("hot" is a care word). Left so: the list errs on the side of leaving out.
- Approval is a step: the lines first, then the page; Print and Share exist on the page only.
- Photos and initials are on the printed page (a box turns them off) and never in the shared text.
- With no name the title is "How to talk with this person"; the way in reads "How to talk together".
- The ways in: the first screen (under "Talk about a photo") and About them.

*Also changed, not asked.* The sentence under "What we've learned" said the usual choices "leave only in a note for
the next carer"; it now adds "or on the page 'How to talk'". `core/share.ts` gives its rule a name
(`usualForOthers`) so the passport uses the same one. File names: `core/copy8.ts` and `web/src/care7.ts`, because
`copy7.ts` and `phase7.ts` were taken by the fix of the morning.

**Back, and no dead end (PERSONA item 12).** Both routes are steps of the Back stack. The passport is two steps:
its page goes back to its lines as the carer left them, the lines to the screen they were opened from (the first
screen, or About them). "For the speech therapist" goes back to the diary. With the sheet up, Back closes the sheet
and nothing more. Each was walked by the button and by the phone's back button in the browser run. A page opened by
its own address or after a reload has no step under it; Back is then the first screen, as on every other screen.

**Counts** (the code of `5f05b8d`, the production build on `npx vite preview`, port 5197). 2762 unit tests.
`e2e-simple.py` 935/935 (phase 7: 125), `pwa-check.py` 30/30, `e2e-needs.mjs` 12/12, `overflow-check.py`
534/534, `contrast-check.mjs` 144 pairs. The outputs, 12 screens at 390 x 844 and the passport as a PDF are in
`devlog/evidence_phase7/`.

**Two runs that did not pass the first time.** The first full `e2e-simple.py` on the final build stopped with a
30-second timeout in the part of phase 6 (a fresh browser context, an address change to `#/diary` followed at once by
a reload; 613 checks had passed, none had failed); run again alone it passed 935/935, and that output is the one
saved. `overflow-check.py` stopped the same way on the same pattern in its new phase 7 part; the script now reaches
the two pages by their links, and passed 534/534. Both were test scripts racing the Back guard, with other browser
runs going on beside them; whether a person can hit that race (an address typed and the page reloaded within the same
instant) was not looked into further. `contrast-check.mjs` has no pair of its own for the new pages: they use the
colours that are already in its table.

**Not built, not run.** Any of it with a carer, a speech therapist, a nurse or a paid carer. A sheet of paper: the
print was looked at in the browser's print rendering and as an A4 PDF (one sheet for the Miller family of the
tests). Share on a real phone: `navigator.share` is a stub in the test. The pages on the owner's phone.
`update-check.py`, `e2e-noconfig.mjs`, and every script that needs a real model (this phase calls none).

**The deploy did not happen.** The Firebase login expired at 12:11 UTC (`DAY17.md`); signing in is the owner's
step, and nothing was tried around it. The hosted copy still serves the build before phase 6. Not run for that
reason: "live = dist", `e2e-simple.py --live`, `pwa-check.py` and `e2e-needs.mjs` against the hosted copy.
