# Day 4: Wed 11 Nov 2026, evening (CST; the file comments dated 12 Nov use UTC)

Scope: the work that does not depend on the design-direction choice (the project owner is picking between A/B/C in
`DESIGN_DIRECTIONS.md`; the default theme is untouched as a look). Three threads: the "must fix" list from the design
pass, FIELD_BEAT must-do #3 (the 60-second judge path), and the preparation for must-do #1 (the timed trial, no people
involved yet). No deploy, no install beyond font files, no billing, no on-device run (this Mac still cannot run Gemini
Nano: disk). `web/src/ai/firebaseEngine.ts` is untouched.

## Done (each checked by a test or a headless run, not assumed)

### 1. Design-pass "must fix"
- **Animations play once per real event.** `main.ts` keys the entrance animation on `route|cardSeq` (`setCard()` bumps the
  counter for every new card the person is shown: made, override, body step, next page). The first draw after a change
  puts `enter` on `#app`; every other redraw does not, and `themes.css` zeroes animation duration and delay under
  `#app:not(.enter)`. The device check and download ticks no longer redraw the screen at all: `patchDevice()` updates
  `#status`, the welcome `#device` line and the judge `#nodevice` note in place (a redraw within the first second cut the
  welcome animation short, which is the replay the design note described). `go()` draws directly when the hash is already
  there, so "delete everything" no longer draws twice. Verified by computed styles in a scratchpad CDP run (twosides):
  welcome h1 keeps its 0.5 s animation after the device check; a new card gives the pane 0.8 s; "Less support", a tile tap
  and the confirm step give 0 s; the next card 0.8 s again; the full-screen card 0.28 s.
- **Fonts self-hosted.** `web/public/fonts/<family>/`: 14 woff2 files (latin subset, 288 KB in all) from the fontsource
  5.3.0 packages, each folder with its OFL-1.1 `LICENSE.txt`: Overpass 600/800, Atkinson Hyperlegible Next 400/700, Lexend
  400/500/700, Public Sans 400/600, Instrument Sans 400/600/700, IBM Plex Mono 400/600. `web/src/fonts.css` declares them
  with `unicode-range`; `theme.ts` no longer builds a Google Fonts link. **`scripts/fonts-check.mjs`** (new, headless
  Chrome, cache off) walks welcome → judge mode → a card → the full-screen card in the default look and in each preview,
  logging every request: **20/20**: every request goes to `localhost:5179`; nothing to googleapis/gstatic; the default
  look requests **no font file at all** and `document.fonts` has no loaded webfont; each preview loads only its own
  families from `/fonts/` with 200.
- **Thin frame around the full-screen card (default theme).** Root cause: `#app` carried the route name as its class, so
  `#app.person` picked up the pane's `.person` border and `#app.welcome` the 40 px `.welcome` padding (doubled). Now
  `#app` gets `route-<name>`; the themes' reset rule for `#app.person` is gone and the twosides white background rule
  targets `#app.route-person`. Checked: `#app` border 0 / padding 0 on the full-screen card; welcome padding 40 px once.
  Side effect in the default look: the welcome screen sits 40 px higher than in the Day 3 shots. Everything else
  unchanged (35/35 layout checks, `devlog/shots_day4/`).

### 2. 60-second judge path (FIELD_BEAT #3)
- **README "For judges"** at the top: the command, the six clicks in `#/demo` in order with what appears and which badge,
  what each of the five badges means (all from `inferenceSource`), the three states a judge can force (cloud leg,
  no-model, offline fall-back), honesty notes (no on-device run yet; sample family made up; `pre-contest` tag).
- **Call table**: 20 rows of `file:line` → the snippet on that line → what it is: every `getAI`, `initializeAppCheck`,
  `getGenerativeModel` and mode, `initializeDeviceModel`, each `generateContent`, both `inferenceSource` reads, the lazy
  start, the three pipeline lines where the engine's report becomes the trace and the "sent" claim, and the badge
  function. **`tests/unit/judge-path.test.ts`** (24 tests) reads the table back and fails if any line no longer holds its
  snippet or if an engine call site is missing from the table, so the table cannot rot silently.
- **Git tag `pre-contest`** (annotated) on `949e8ec`, the import commit: it holds exactly the pre-period files listed in
  `DISCLOSURE.md` and nothing else; `git diff pre-contest..HEAD` is the submission-period work (121 files before this
  commit). DISCLOSURE and README point at it.
- **Privacy receipt** (`core/receipt.ts`, pure; panel in judge mode under the judge box and on `#/how`; "Export receipt"
  downloads JSON with the counted text). Per card: whether anything left (only when the SDK reported the cloud answered),
  **UTF-8 bytes of the request body the app built** (compact form of `Card.cloudPayload`) and of the stripped question
  inside it, names withheld (`Person`/`Name` labels) and other About-me words withheld, and an after-the-fact check that
  runs `findLeaks` and a photo-bytes search on the sent text. Per session: the sums, requests, offline runs. The panel
  says what is not counted (the SDK's transport: headers, App Check token) and that the body is in the export so the
  number can be checked by hand. `tests/unit/receipt.test.ts` (7 tests): bytes equal the encoder length of the recorded
  body and the question inside it is byte-for-byte what the engine was given; 0 for cloud off / cloud failed / offline
  fall-back / code card / blocked card / device card kept; sums; a planted name and photo are found by the check. On a
  phone the receipt rows stack with labels (the five-column table squeezed the question to one word per line at 390 px).

### 3. Trial preparation (FIELD_BEAT #1, no people yet)
- **`devlog/TRIAL_PROTOCOL.md`**: pad-and-marker vs card; 2–3 volunteer pairs (the person role is a simulation unless a
  family living with aphasia joins, stated per pair); two sealed 10-question sets written by a non-partner, SHA-256
  committed before session 1, files after the last session; counterbalanced order (Pad-A/Card-B, Card-A/Pad-B,
  Pad-B/Card-A), practice questions before each block; what is timed (from the end of asking to a confirmed answer, the
  app's card-making time included, operator on a separate device), outcomes (confirmed / via way out / guessed / gave up),
  the memory question logged but excluded from time medians; reporting decided in advance (raw table always, pair
  medians and range only, no p-values, the one write-up line in a fixed form that stays unchanged if the card is slower,
  caveats that travel with the number, exclusions fixed now); consent text in plain words; stop rules; materials.
- **Hidden `#/trial`** (`web/src/trial.ts`, not linked anywhere): pair / condition / set / question number / note,
  "Asked" starts the clock (0.1 s), four stop buttons log the outcome, the log table, undo, clear, **Export CSV** (RFC 4180
  quoting). Entries live in IndexedDB on the device and leave it only as the CSV. Checked in the CDP run: the clock runs,
  a row is logged with the right columns, no link to it in the nav.

## Test counts and gates
`npm run check` exit 0: ESLint 0, `tsc` 0, Vitest **794 / 794 in 18 files** (Day 3: 763 in 16). New: `receipt.test.ts` 7,
`judge-path.test.ts` 24, plus the copy-group test for the new `trial` strings. `scripts/shots.mjs` 35/35 (phone "Show to
person" bottom at 588 px); `scripts/fonts-check.mjs` 20/20.

## Not done, by design
- No pick of a direction in code; the default look is the same (minus the frame and the doubled welcome padding).
- The receipt counts the body the app builds, not the SDK's wire bytes: it says so on screen. A wire-level count would
  mean wrapping `fetch`, and it would then include App Check traffic, which carries no family data.
- Sets A and B are not written (they must be sealed by a non-partner). The stopwatch is ready for them.
- Still open from Day 1–3: deploy (disk + browser login), the real on-device run, pictograms batch 2, the two-screen relay.

Next step: the judge round 1 on this build (`#/demo`, official fwd/rev + engineering seats), then fixes; apply the owner's
design choice (move that direction's block into the default, re-run shots and fonts-check on it); deploy when the disk is
freed.
