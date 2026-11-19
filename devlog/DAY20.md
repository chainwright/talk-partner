# Day 20 (19 Nov 2026 by UTC): phase 10, the person starts, and About them in a file

The brief was `design/PHASE10_BRIEF.md`: the two features of the family's list that were still missing
(`design/PLAN_TO_IDEAL_2026-11-17.md`; `design/DISCOVERY_2026-11-17.md` §3; `design/PERSONA_SCENARIO.md` step 5). Work
began from `01bc49e`, late on 18 Nov by the local clock. Each item was committed on its own, each only after
`npm run check` exited 0. Nothing was pushed or deployed; the "Live:" lines still name the build they name.

## What was there before
Both features had a first form already: "[Name] wants to say something" (phase 4: three starters, the topics as a
picture menu, "Who is it about?") and "A copy of About them in a file" (phase 3: save, and "Bring back" that
replaced everything, health notes always in the file). Phase 10 builds on them rather than beside them.

## The items, in the brief's order
1. **"His turn"** (`47e786e`). Home's button: "Frank: I want to say something". A manifest shortcut to `/#/turn`
   opens the same screen; the address becomes `#/person` at once, so a later draw does not start it again. The
   second starter is "I want to talk about…": "me", up to 3 people (away first; never the carer), up to 2 places,
   "the news / TV", three to a screen, then the phase 4 topics. The carer reads "Frank wants to talk about Beth." and
   three questions by kind, each a card the rules make, each answer with a tree step (new: the visit, "Did something
   happen at / with …", "Would you like to go to …", the news / TV and "Shall we put the TV on?"). The diary has a
   new kind of entry, "started" ("Frank started: Beth"): it counts as nothing and the answer check never marks it.
2. **About them in a file** (`864315e`). The file names itself `talk-partner-about`, version 1, and keeps the older
   `app` / `kind` fields so an older copy of the app still reads it. Health notes only when ticked (off every time,
   and off again after each save); the emergency number always. Load: refused over 8 MB by the file's size before it
   is read; every field checked; unknown fields dropped; words kept as text; the preview "This file has: …" with
   Replace / Add / Cancel. Add never removes or changes what is here; a health toggle on in either stays on; past 60
   photos the rest is left out and the line says how many.
3. **Documents and checks** (this commit): README "Added on 19 Nov, phase 10", CLAIMS rows 137 to 141 (and rows 70
   and 81 say what changed for them), EVIDENCE "Phase 10", `scripts/phase10-shots.py`, a docs-truth block.

## Decisions that differ from the brief, or fill a gap in it
- **No Gemini Nano step for the three questions.** The brief allowed one ("may") where the device has the model,
  checked by the card rules. Not built: every phone gets the rules' three anyway, the rules' questions already have a
  tree step for every answer (a model's would not), and nothing in this phase could be run against the real model.
  The feature stays without any model call, which also keeps "no request leaves the device" true by construction:
  `core/turn.ts` imports no engine, and a test reads the web client's "His turn" functions for any engine call.
- **The size limit is 8 MB, not 5 MB.** The brief said "say 5 MB". The biggest About them the app keeps (60 family
  photos and 60 people with a photo, each a 320 px JPEG of up to about 45 kB as a data URL) is about 5.5 MB, so 5 MB
  could refuse a full family's own file. A unit test builds that file and checks it loads.
- **The emergency number is always in the file**, outside the health notes: it is what a second carer needs most, and
  it is not a health note (it is in no prompt and no request).
- **"me" stays first on "I want to talk about…"** (phase 8: the person's own news is the commonest subject), and
  someone who lives there gets the telling questions only, not "Is it about their visit?" or "Would you like to call".
- **An offer is now the third question for a person or a place** ("Would you like to call Beth?"). The role-play of
  18 Nov found offers where the telling was meant; the telling still comes first, and the brief names the call.
- **Replace keeps the health notes here when the file has none**, and says so on the preview ("No health notes: the
  ones here stay as they are"), so a file saved without the box never wipes a swallowing difficulty.

## Worst cases walked (could it make a tired carer dismiss pain or a need?)
- Pain through "I need something": the carer's screen is the same as pain on the needs board, word for word, apart
  from the line "Frank started this: something is needed." (`phase10-shots.py`); the diary holds both as needs.
- About them empty: the talk screen has "me" and "the news / TV"; every combination of 0 to 3 people and 0 to 2
  places leaves two real choices or more on every screen (unit test).
- A file without health notes, replaced or added: the health notes here stay.
- A name with `<script>` in it: shown as text on the preview, on the talk screen and in the diary; nothing runs.

## Runs
COUNTS_LINE

## Found, not fixed (before phase 10 too)
- After a reload on an inner screen (`#/about`), the phone's back with the import sheet open sometimes goes to Home
  instead of closing the sheet (1 of 4 tries at `01bc49e`, 2 of 3 at `864315e`; nothing changes either way, the
  draft is dropped). Through the app's own links it closes the sheet every time. Left for a later fix.
- e2e-simple's two handover checks of phase 6 fail when the run is made late in the evening: the fixture's pain and
  fall of "yesterday" fall out of the last 24 hours. A script's clock, not the app.

## Open risks
- Nobody it is for has tried "His turn" or the file; no clinician read the new lines.
- On a carer's phone "His turn" works only when the phone is within the person's reach; a spare phone or tablet by
  the chair is the honest setup.
- The file is not encrypted; the screen says to keep it somewhere private.
