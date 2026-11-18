# Day 19 (18 Nov 2026): phase 8, the fixes of judge round 7

The brief was `design/PHASE8_BRIEF.md`, from the round-7 summary (`../judge_app_r7_2026-11-18/SUMMARY.md`) and five of
its reports (nurse, SLP, carer, person proxy, hound). Work began from `45e8095` (the live build), 18 Nov, 18:17 UTC.
Every item was committed on its own, each only after `npm run check` exited 0. Nothing was pushed and nothing was
deployed: the deploy is a later step, and the README's "Live:" line holds the placeholder `LIVE_BUILD` for it.

## The items, in the brief's order
1. **Safety: the visit page** (`2786a56`). "Since the last visit" now counts the person's own answers on the page: a
   "low" mood, a yes to pain, a bad night. The line says so ("counting Frank's own answer above"). In the diary
   every question about how the person feels counts, and "low" counts. Worst case walked: an empty diary with a "low"
   and a yes to pain gives the two lines, not "The diary holds nothing for this time".
2. **Back everywhere** (`1642088`). The stack is kept in every view, and the person's screens are steps, with two
   folds (the check and "Thank you" fold into their choices; a card handed over folds into the carer's question). The
   press and hold gives the phone back to the last carer's screen. `e2e-simple.py --only back` walks every way back
   to the first screen (144 checks on the first run of the new part), the full view and the sample family included.
3. **Passport and therapist page** (`9b10fb8`). The two fact lines are off until ticked; the fixed tired-yes line;
   "not filled in, ask the family" with no number; "Ask the family what is all right" on the food line with diabetes,
   swallowing or a fluid limit noted; the "less sure" count; the contentless pain line with the box off; "less sure"
   answers out of every usual count; no usual "yes" to an offer on a page for others. The sample family now uses
   911 everywhere (the week fixture holds it; the phase 5 run tests the field with 999 and then sets 911).
4. **Docs truth** (`659501c`). "Live: the build of `LIVE_BUILD`" in README and JUDGES, and `docs-truth.test.ts`. The
   phone string under "Answers so far" no longer says an AI reads anything on the phone. The privacy lines, Alela,
   the data-use line, CLAIMS row 37.
5. **Home and the person's screen** (`db4c0d1`). "Needs something now?", the red card's sub-line, the key word in
   the 4 steps and on their folded line, "No sound" on the person's screen with the carer's line, "Left for later".
6. **Hybrid visible** (`159bce4`). The routing chip, and Read aloud for the person.
7. **The nurse's and the SLP's sets** (`058198f`).
8. **Pictures** (`c070bc4`). Beth and Frank drawn; the letter step's kind and age band; the AI run again.
9. **Cloud evidence at this code** (`e3cc1b9`). Five fresh profiles against the preview: 19/27 each, App Check
   refused ("ReCAPTCHA error"). Five against the dev server with the debug token: 28/28 each.

## Decisions that differ from the brief, or fill a gap in it
- **Back: the person's screens are steps.** The brief lists the screens; making every one exact meant putting the
  person's screens on the stack. So Back from the carer's screen after the person's own start lands on "Who is it
  about?" (a person's screen), and there the phone's back is the way on: a person's screen has no Back button, by
  design. The press and hold was kept as "give the phone back", not "one step back".
- **A step back to a doctor-visit question takes that answer off**, so the question is asked again.
- **The data-use line says "per Google's terms", not "per Firebase's terms"**: the linked terms are Google's Gemini
  API terms, and the copy rule of the simple view bans product names on its screens (a test failed on "Firebase").
- **The red card's sub-line ends "call."** with no number, as the brief has it. The call buttons still use 911 when no
  number is set: there is no locale default (asked for by one seat, not in the brief).
- **The helpline is a new field in About them** ("Helpline for low mood"), kept only when set; "the number field from
  About them" was read as that. With none set, the line names the doctor or nurse and "a mental health helpline",
  and no number.
- **The drink and food words went into a list of the answer check's own** (`guardExempt`), not into `careAnswer`, so
  the notes for other people still keep a usual drink (`ed0395d`). Because of it the Frank week fixture's Friday
  "Are you hungry? yes" is now "Would you like the radio on? yes" (the run of "yes" stays five), and the e2e guard
  run asks a sixth question.
- **"Who is it about?"**: "me", then two names at most, then "someone else" (it was three names).
- **The insight level of a line with the call box** reads "Call now if it is new or sudden, and tell the doctor or
  nurse" (no full stop inside: the shared text puts a colon after the level).
- **The cloud runs**: the brief asked for the preview "with the App Check debug token from the env". A production
  build never carries the token (`check-dist.mjs` refuses one), so the preview runs are without it, and five more
  runs went against the dev server, which reads it from `.env.local`. Both are recorded.
- **Beyond the brief, small**: CLAIMS row 37 no longer says App Check is not enforced; the passport's first screen
  shows the tired-yes line under the two fields; `e2e-phase4-ai.py --out`.

## Worst cases walked (can a line help a carer dismiss pain, a need or distress?)
- Visit page: "low" or pain in the own answers can no longer sit under "none entered" (unit tests both ways).
- "A tired yes may not mean yes" on the passport could be read as "doubt a yes to pain". The same line says to ask
  about pain, drinks and the toilet every time, and the answer check never marks a pain, body, feeling, drink or food
  answer. The residual risk is named in CLAIMS row 116.
- The guard leaving drinks and food alone makes it mark fewer answers: a yes to "something to drink?" is taken as
  said, which is the safer side.
- "No pain, Frank says. Watch the face, ask again later." replaces "No pain. Good."
- A dry day under a fluid limit is never excused; the call-box line is never labelled softer than mild pain.
- "Left for later" keeps a pain question too ("Left for later: Are you in pain?"), so a deferred pain talk is not lost.
- The helpline line invents no number; it is on the carer's side only.

## Runs
At `feb272d`: 2798 unit tests (`npm run check`, the type check and the build included); `e2e-simple.py` 1001/1001; `pwa-check.py` 30/30; `e2e-needs.mjs` 12/12; `overflow-check.py` 534/534; `contrast-check.mjs` 144 of 144 pairs; `phase8-shots.py` 21/21. The outputs are in `devlog/evidence_phase8/local/`. The first full run of the same scripts (at `e3cc1b9`) failed 13 of 1001 in `e2e-simple.py` and stopped `pwa-check.py`, `e2e-needs.mjs` (11/12) and `overflow-check.py`: most were the scripts expecting the wording before phase 8, and two were real faults, fixed in `feb272d`: "Home" from two questions deep left the first screen 490 px down (the browser restored an older entry's scroll), and the press and hold after a need was ticked went to the screen before the board, hiding the need.

## Open risks
- Back from a carer's answer can land on a person's screen (the person's own start, the alphabet's words, the body
  card's second step). A carer may not expect it; nobody has tried it.
- The cloud step from a headless browser on the preview was refused by App Check every time; whether a judge's
  browser or a phone passes on the hosted copy is still unknown. That is for the runs after the deploy.
- Asked for a drink with K, the cloud model gave no word that passed the checks; one run only.
- `e2e-phase4-ai.py` fails its "X" check: the check still expects online help to stay on after the sheet, which
  "Just this once" (phase 5) ended. A script issue, not a product one; left as it is, and recorded.
- `phase8-shots.py` timed out once on the therapist page while `dist/` was being rebuilt under the running preview;
  the next run passed 21/21.
- `LIVE_BUILD` must be replaced at deploy in README "Deploy" and in JUDGES.
- No clinician, carer or person with aphasia has read any new line.

# Phase 9 (18 Nov 2026): the fixes of judge round 8

The brief was `design/PHASE9_BRIEF.md`, from the round-8 summary (`../judge_app_r8_2026-11-18/SUMMARY.md`). Work began
from `3bc6998` (code of the live `32dd0dd` plus documents), 18 Nov; the first commit is of 22:06 UTC. Every item was committed on its
own, each only after `npm run check` exited 0. Nothing was pushed or deployed; the "Live:" lines still name `32dd0dd`.

## The items, in the brief's order
1. **A care question left for later** (`a33ac41`). Pinned first on Home, never expires, "Did you find out? Yes / Not
   yet", into the diary as "Left for later", onto "Since the last visit"; under pain: "If the pain is new or strong,
   don't wait: call the nurse or doctor." Choice: "tea or coffee?" is not a care question; a drink as a need is.
2. **"Nothing stands out" under pain** (`92f86b4`). Pain on one or two days is its own line; the fixed "ask again,
   tell" sentence is the line's `act`, so no model rewords it. One low day and "something's wrong" are lines too.
   Frank's week now opens with Tuesday's pain.
3. **Wording** (`0658200`): "A little pain. Ask again in an hour…"; no "Last time" or "So far" before a care question
   (the `careAnswer` guard of `usualFor`, plus a drink as a need); the passport's tired-yes line ends "…is always a
   yes: act on it."
4. **The emergency number by locale** (`b6c8b5d`), with "Is this your emergency number? Change it" by every call box.
5. **Handover and visit** (`810f1f5`): swallowing and fluid limit always on the handover note; Toilet, Tablets, two
   family questions and "chest, middle" on the visit page.
6. **The cloud wait** (`db00cef`): 3 s to "Stop waiting", 20 s to the plain line (12 s at first; raised after live runs), the latency in the trace.
7. **The hybrid moment** (`3447b47`): "See the AI at work" on Home, made with an empty profile, kept nowhere.
8. **The cloud letter step** (`7910b80`): its own schema and a ninth model instance. Unit runs only.
9. **The person's "Not now"** (`e3e3db3`; moved to the top row in `f188eab` after the first full run showed it
   pushed three choices and the way out to 883 px on 390 x 844).
10. **The first visit** (`6b10a4d`): the steps folded to one line from the first visit.
11. **Documents** (`850d2e4`): "Google's paid service" out, JUDGES' count, README, CLAIMS rows 40 and 50, "18 Nov".
12. **The reload race** (`74a5e94`): the script waits; the app also keeps the screen. Repro on the dev server
    (port 5493): `goto('#/diary')` then `reload()` at once, 20 tries: 6 landed on Home, every one with the address
    `/` and no history state. The guard rewrites the entry under it to `/` and then pushes the inner address; a reload
    taken between the two loads `/`. After the fix (the drawn screen noted for the tab, restored on a reload within
    3 s that lost it): 0 of 30.

## Runs
At `f188eab` (the code; the scripts' expectations were updated after it, no app change): 2849 unit tests (`npm run check`); `e2e-simple.py` 1002/1002; `pwa-check.py` 30/30; `e2e-needs.mjs` 12/12; `overflow-check.py` 534/534; `contrast-check.mjs` 144 of 144 pairs; `phase8-shots.py` 21/21; `phase9-shots.py` 37/37. The outputs are in `devlog/evidence_phase9/local/`, the screens in `devlog/evidence_phase9/shots_390/`. The first full run (at `74a5e94`) failed 8 of `e2e-simple.py`'s checks and stopped: the scripts expecting the wording before phase 9, and one real fault, fixed in `f188eab`: the person's "Not now" at the foot of the screen pushed three choices and the way out past 844 px.

## Open risks
- The cloud legs of phase 9 (the card after "See the AI at work", the letter step's new schema, the wait limit against
  the real first-call latency) are not run against the real model: for the live runs.
- The person's "Not now" is a word, no picture, on the top row; nobody with aphasia has tried it.
- The locale number is a guess from a language setting; the box asks, and About them wins.
- The first-visit fold takes the open steps off the first screen, which the SLP seat valued.
- No clinician, carer or person with aphasia has read any new line.
