# Day 17 (18 Nov 2026, UTC): phase 6, and two faults the owner found on his phone

Brief: `design/PHASE6_BRIEF.md` (items C and G of judge round 6: share with the care circle; insight lines that open
their entries). Half way through, the owner walked the hosted copy on his own phone (11:20 to 11:32 UTC) and found two
faults; they were fixed before the rest went on. **No AI was added today**: everything below is rules and fixed text
on the device. No carer, no person with aphasia and no clinician has used or read any of it.

| # | Item | Done | Where |
|---|---|---|---|
| D | Every line of "What stands out" and of "Since the last visit" shows the entries it was counted from, in place, with "Hide"; not printed | yes | `core/insights.ts` (`Insight.source`), `core/diary.ts` (`eventGroups`), `core/since.ts`, `web/src/phase6.ts` |
| A1 | "Share with family" on the diary, for the open tab | yes | `core/share.ts` (`familyText`) |
| A2 | A sheet with the exact text, the brief's sentence, Share / Copy / Cancel; only Copy without Web Share | yes | `web/src/phase6.ts` (`shareSheet`), `web/src/main.ts` |
| A3 | The first sentence of the text; the call sentence at the top when a line carries the call box | yes | `core/share.ts`, `core/copy6.ts` |
| A4 | "For the next carer": the last 24 hours and the usual choices | yes; "Words that work" is not built, so it is not in the note | `core/share.ts` (`handoverText`) |
| A5 | Unit tests on the worst cases; the health notes only when ticked; no photo, no data URL; the browser run through the sheet | yes | `tests/unit/phase6-share.test.ts`, `scripts/e2e-simple.py` (`phase6`) |
| A6 | The diary's privacy line, and every claim that the diary never leaves | yes | `core/copy.ts`, README, JUDGES, CLAIMS |
| R1 | Back goes exactly one step, never to the first screen | yes | `web/src/main.ts` (`trackScreen`, `backStep`) |
| R2 | After "something else" a clear next step made by the rules; "show me" goes on | yes | `core/more.ts`, `web/src/phase7.ts` |

**How D is kept true.** The count and the entries behind it are one list: `eventGroups` returns each counted event
with its entries (the entry that is counted first, the ones merged into it after), and `events` is that list's
moments. A line cannot count one thing and show another. The test keeps the count as it was written before today,
word for word, and compares the two on the week fixture and on 300 made-up days.

**Decisions that differ from the brief, and why.**
- A1, the Today tab: the text carries the "What stands out" lines of the last 7 days. The Today tab shows no lines
  of its own, and a text about today that leaves out yesterday's chest pain would help someone dismiss it.
- A3: the first line has the time as well as the date ("on Wed 18 Nov, 05:28"). A shared text is read later; the
  reader should see when it was made.
- A1: the topic filter of the diary does not narrow the shared text. A filter must not be able to hide a pain entry
  from the family.
- A1, health notes off: the builder is not handed the notes at all, so the lines are counted as if none were
  noted. A line that exists only because of a note (many drinks under a fluid limit, no food with swallowing
  difficulty, sweets at the lower count with diabetes) is then not in the text. Because that can hide what the reader
  needs, the sheet names the note to the carer while the box is off. The red flags (no drink, strong pain, a fall)
  do not depend on a note and are always in.
- A4, the usual choices: besides the care questions the brief names, the note leaves out the needs board and every
  usual "no". "Usually says no to a drink" in a handover could stop the next carer from offering one.
- A4, falls: every fall in the note carries "If there is new pain, drowsiness or confusion since, call … now", a blow
  to the head noted or not, and the call sentence at the top. In the app's own lines only a noted blow has the box;
  a note for the hours after a fall is the place to say it every time.
- A4, tablets: the line says "check before giving any" whether a tap was logged or not. The app knows a tap, not a
  medicine.
- A4, where it stands: on the diary and, once the diary holds anything, under "Diary" on the first screen.
- A2: the three buttons stand in one row, so the sheet fits a 390 x 844 screen with the text scrolling in its own
  box.
- Every shared text ends with "This text does not say what to give or what to do. Before changing food, drink or
  tablets, go by the doctor's plan." It is not in the brief; it is there for the reader who was not told of a fluid
  limit.
- D, "See the entries (N)": N is the number of entries shown. For a line that counts events (few drinks: 2) a card
  and a tap within 20 minutes are both shown and one is marked "counted once", so N can be larger than the count in
  the line.
- D on the visit page: under every line that counted something; none where the count is nought.
- Also changed, not asked: `About me`'s "It is never sent anywhere" reads "The app never sends it anywhere"; "five
  lines at most" in three documents was six in the code since phase 5.

**R1, Back.** The owner's case: Food → "Would you like something to drink?" → yes → Next → "a hot drink or a cold
drink?" → Back landed on the first screen. Back was decided from the state of the one card on the screen. It is a
stack now: every carer's screen that is drawn is a step; Back and the phone's own back pop one; "Home" empties it.
The person's screens are not steps (the press and hold goes back there). Decisions: the first screen with a topic
open is the same step as the first screen (Back from the first question shows it with the topic still open); a log
or a change of tab in the diary is not a step; the call box of a conversation is not taken back with a step.

**R2, after "something else".** The owner: he did not understand how to find out WHAT else; "Next: Are you hungry?"
jumped to another topic; "show me" ended on "Ask another question". What was built is in README "Changed on 18 Nov
after the owner's walk". Decisions that differ from what was asked, and why:
- "Yes: type it" does not open the check ("So: juice. Right?") by itself. The typed word goes onto the person's
  screen as a choice under the question that was open; the person points to it, and the check follows. The app's
  rule, pinned by `tests/unit/truth.test.ts`, is that only the person's tap picks a choice. It is one tap more.
- All the ways stand on the screen, numbered, four or five of them. The role-play of the morning had cut the screen
  to three things; the owner's order (rules first, the AI last) needs them all in sight.
- The tree's own "something else → Are you hungry?" entries are still in `core/tree.ts`, and are no longer shown
  after the way out. A card the person started ("Who is it about?" → "someone else") keeps the next question of the
  same conversation as its first step: that is not a topic jump.
- For people, places and things to do the family's own words come before the fixed list (the owner's order was
  given for drinks: fixed, then the family's).
- A question that holds care words and is about a kind the rules have a list of ("a hot drink or a cold drink?"
  holds "hot" and "cold") gets the list, not the body card. A question of "Body & care" or "Feelings" always gets
  "Show me where" and the needs board.
- After a list of more choices is used up, the same list and "What is it about?" are not offered again: the first
  letter is next.

**Counts** (the code of `e4b67eb`, the production build on localhost). 2698 unit tests. `e2e-simple.py` 811/811
(phase 6: 61; Back: 86; "something else": 44), `pwa-check.py` 30/30, `e2e-needs.mjs` 12/12, `overflow-check.py`
510/510, `contrast-check.mjs` 144 pairs. The outputs and 25 screens at 390 x 844 are in `devlog/evidence_phase6/`.

**Not built, not run.** "Words that work" (round 6, F) and the practice report (D of round 6). Share on a real
phone: the phone's own share sheet was never opened by us; the test replaces `navigator.share` with a stub. The
print on paper. The two fixes on the owner's phone after the deploy (his walk found them; ours is a headless
Chromium as a phone). Any of it with a carer, a paid carer, a family member or a clinician.
