# Day 3: Wed 11 Nov 2026, late session (the Sun 15 list pulled forward, minus the deploy)

> **Correction, 16 Nov 2026.** This page says the on-device step could not run on the development machine for lack of disk. On 11 Nov that was our reading of the disk; on 16 Nov the machine had 36 GiB free and the Gemini Nano files from the 9–10 Nov prototype were still on it, and the step ran that day (`DAY7.md`, `ondevice_proof_1/RUN_LOG.md`). Read every "(disk)" below as "not run yet". Line numbers quoted for `web/src/main.ts` and other files are those of that day.

Scope: everything on the GATE plan for Sun 15 that needs no deploy, no install, no billing and no account, plus the Day 2
leftovers. No Firebase deploy, no CLI, nothing bought. `web/src/ai/firebaseEngine.ts` is untouched; all AI still goes
through Firebase AI Logic. No on-device run happened (this Mac still can't run Gemini Nano: disk); nothing claims one.

## Done (checked by tests and screenshots, not assumed)
- **Copy module** `core/copy.ts`: every string a person reads, in one place, shared by every client. Plain English, short,
  adult tone. `tests/unit/copy.test.ts` enforces spec §4: no mode names, "Firebase", "placeholder", "§" or rule numbers on
  any main-screen group (they live only in `consent`, `how`, `judge`); no exclamation marks or praise anywhere; and the
  **copy-truth test** (§5.1): for 20 questions over a rich fixture (photos, nicknames, a household flag, multi-word
  entries) every payload the core can build (cloud text request, picture requests, the "sent" panel) holds no About-me
  entry, name, nickname or relation word, no photo bytes, no household words outside the partner's own typed text, and
  never the on-device ABOUT block. Found and fixed on the way: the cloud system prompt still said "Use an ABOUT list"
  (a leftover from the device prompt; no data, but confusing in a payload a judge reads). The pipeline's partner-screen
  notes and blocked lines now come from the module too; all 682 earlier tests still pass on the same wording.
- **Screens** (`web/src/main.ts`, hash routes, event delegation, IndexedDB in `store.ts`):
  - *First run* (`#/welcome`): what the app does, "everything runs on this computer", the private helper's state as the
    SDK reports it (ready / download / can't run, with the reason), "cloud help is off"; two buttons: set up About me,
    try the sample family.
  - *Partner* (`#/`): status strip, question, badge, "Say this", tip + waiting timer, **Show to person** (hidden on a
    blocked card, §2.13), **Less support** (person sees the headline only; partner reads "Just ask normally: …"),
    **Next** (second question, or the next body page), **Recap**, the answered line, safety line on body/pain, notes,
    "What was sent", "Where each step ran". A blocked card with cloud help off shows the inline offer: "Cloud help could
    try, using the question only" + "Show what would be sent" + "Turn on cloud help" (§4.1).
  - *Person* (`#/person`, full screen; the same view is the right-hand pane on desktop): headline, tiles (picture + word),
    pressed state, "So: coffee. Right?" with ✓ yes / ✗ change (a "no" / "not sure" sits in a neutral frame), answered,
    the recap "So" list, the listening ear when there is no card. Exit top-right, press-and-hold 600 ms (§4.2).
  - *About me* (`#/about`): "About Frank", their name, your name, people rows (Name · Relation · Lives here · Photo ·
    **Nickname**), foods / places / TV / music / other, the "saved only in this browser" note, the consent nudge,
    autosave, **Add photo** (resized to 160 px, stored as a data URL on the device only; shown on the person's tile
    instead of the initial), **Delete everything on this computer** (lists, photos, settings and cloud consent).
  - *Cloud help* (`#/cloud`, §1.5 consent flow): what is sent, with **the partner's last question in the exact payload
    form**; who receives it; never sent; the data-use sentence for the free tier with a link to the terms; one checkbox
    "I understand. Turn on cloud help."; when on, one tap turns it off. Stored per device; reset by delete-everything.
  - *How this works* (`#/how`): the three steps and modes, a diagram, the session tally, the last card's trace, and an
    honest "no measured scores yet" line.
- **Judge mode v0** (`#/demo`): the made-up family (labelled), nine one-tap questions (the six from §6.2 plus a nickname
  case, a feeling and a yes/no), and per card **"Where each step ran"**: `Card.trace` is built in `makeCard` from the
  engine's reports only. Private step = `on-device` only when the engine returned (it throws unless the SDK said
  ON_DEVICE), `failed` with the message, or `skipped` with why (not needed / helper not ready). Cloud step = `in-cloud`
  or `on-device` (offline fall-back) from `inferenceSource`, `failed`, or `skipped` (cloud help off / not configured /
  not needed / leak gate). `used` follows the card's final source. 15-cell test in `day3.test.ts`. Code-determined cards
  (yes/no, feeling, pain, body, or-pair from code) now carry **"No AI needed"** even when a model ran, since nothing of
  its answer is on the card (before, a yes/no card could read "On this computer").
- **Pictograms batch 1** (`web/src/pictos.ts`, 23 new): change, wait, stop, write it, more; tired, worried, pain; spouse,
  child, sibling, grandchild, friend, neighbour, carer, nurse, doctor, speech therapist, physio, priest, family, visitor.
  People are one neutral figure told apart by one attribute (ring, size, house, heart, cross, stethoscope, speech bubble,
  raised arm, collar, door frame): wife/husband share "spouse", son/daughter "child", sister/brother "sibling". Role
  words and their synonyms ("the carer", "your daughter", "GP", "vicar") map to them in `core/pictures.ts`.
  **`PICTOGRAMS.md`** lists every id with what it shows, the date drawn and the licence (all ours, Apache-2.0; the
  pre-period ones marked 9–10 Nov and disclosed). A test checks the register equals what the code bundles, every id the
  core may ask for is drawn, each SVG has `role="img"` + a name, no `<text>` except the monogram, dashes only on the
  escape icon, and no two drawings are identical. Not drawn yet: food, places, activities, things, time (batch 2).
- **Day 2 leftovers:** the **§2.10 override** button ("I really don't know the answer: make a card") makes a recognition
  card from About-me items of the right kind only (people for who/name questions, places for place questions, "other"
  for a pet or team), paged at "more"; a year, date, age or time question has no safe pool, so it stays "just ask
  normally". **"your left arm"** on the person's card (§2.11): step-2 labels, spoken line and picture lookup; the
  highlight for the person's left is on the viewer's right. **Nickname** (§2.19): swapped like a name, restored as typed,
  caught by the leak gate, known to `findPerson` and the invented-name filter, in the on-device ABOUT block
  ("Jenny (daughter, also called Jen)"); the sample family has Jen.

## Test counts
`npm run check` exit 0 (ESLint 0, `tsc` 0, Vitest): **763 / 763 in 16 files** (Day 2: 682 in 14). New: `copy.test.ts`
41, `day3.test.ts` 40. One pre-period test changed with a dated comment (body step-2 labels, `pipeline.test.ts`).

## Screenshots (`devlog/shots_day3/`, `scripts/shots.mjs`, headless Chrome, 17 screens × phone 390 × 844 and desktop 1280 × 900)
35/35 layout checks: no horizontal scroll on any screen at either width; **"Show to person" above the fold on the phone
(bottom at 598 px)**. Fixed from the first pass: the card sat 1341 px down on the phone behind the judge panel and nine
chips (the result now comes straight after the question; chips scroll sideways on a phone; the judge panel is a
collapsible block below); the "Lives here" checkbox stacked under its label; the blocked card said "cloud help could try"
twice; the override-blocked card carried the "only things from About me" note; "People 1" read oddly ("Person 1").
Status line on this Mac: Chrome reports the model as "downloadable" (the SDK's own availability answer), so the strip
offers the download; the judge panel says the private step "did not run" on every card. Nothing claims on-device.

## What's left
- Deploy (Firebase CLI needs disk + a browser login), reCAPTCHA Enterprise key, App Check enforcement: owner items from
  Day 1 still open (disk ≥ 25 GB, Blaze). Judge round 1 can run on `npm run dev` + `#/demo` meanwhile.
- Pictograms batch 2 + the lexicon and synonyms for food / places / activities / things / time (§3.1), coverage check.
- "Next: more choices" after "something else" (the model's spare choice) and the "Write it" pad (§2.15): the partner
  line today says "ask them to show you, or write it down together".
- The warming-up state is shown only during `initializeDeviceModel`; the SDK has no signal for the first session's
  warm-up after that, so "Ready" may still be followed by a slow first card (to measure once Nano runs anywhere).
- Playwright projects, axe scan, keyboard path (§5.3); today's shots script checks layout only.
- Mild-level therapy scale flag; SLP settings sync and the two-screen relay (E-B, Tue 17).

Next step: judge round 1 on the local build (official fwd/rev + engineering seats, `#/demo`), then fixes; deploy as soon
as the disk is freed.
