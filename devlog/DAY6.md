# Day 6: Wed 11 Nov 2026, night (CST; 12 Nov UTC)

> **Correction, 16 Nov 2026.** This page says the on-device step could not run on the development machine for lack of disk. On 11 Nov that was our reading of the disk; on 16 Nov the machine had 36 GiB free and the Gemini Nano files from the 9–10 Nov prototype were still on it, and the step ran that day (`DAY7.md`, `ondevice_proof_1/RUN_LOG.md`). Read every "(disk)" below as "not run yet". Line numbers quoted for `web/src/main.ts` and other files are those of that day.

Scope: the partner screen had become a wall of panels (`devlog/shots_day5/desktop_18-double-question-coach.png`: badge,
coach line, say, actions, "Why this card", "What was sent", "Where each step ran", nine chips, the judge box, the
receipt with seven rows and the counting note, all in one column). Tonight is progressive disclosure, theme-neutral:
the same markup renders in the default look and in the three `?theme=` previews with no theme CSS written, and the
default look itself is unchanged as a look (tokens and classes only). `web/src/ai/firebaseEngine.ts` and
`core/pipeline.ts` are untouched; no on-device run (disk), nothing claims one.

## Done (each checked by a layout check in `scripts/shots.mjs` or a screenshot, not assumed)

### The partner screen (not judge mode): one fold
- Above the fold now: the question box, the badge line, the coaching line (when a rule set one), "Say this", the line,
  the tip, the actions (Show to person, Less support, Next, Recap, We're stuck). Then one closed disclosure,
  **"How this card was made"** (`<details id="made">`, `C.card.made`), which holds, open and in reading order, **Why this
  card**, **Where each step ran for this card** and **What was sent**, and the **privacy receipt** after them (its own
  fold, closed: seven rows and the counting note are long). One click shows the three; nothing was removed, only folded.
- The blocked card's "Show what would be sent" opens the outer fold as well as the panel inside it (`act('show-sent')`
  sets `#made.open` first); checked by a test in the shots script at both widths.
- **The badge line** (`badgeLine()`): the badge, then what left this computer for this card, always on screen and true by
  construction. "Left" is the receipt's own definition (`Card.cloudPayload` is recorded only when the SDK reported that the
  cloud answered); the tail is `C.badge.tail.kept` ("nothing left this computer") or `C.badge.tail.sent(names, other)`
  ("the question left this computer, 2 names and 0 other About me words swapped out"), the counts from `countSwaps()`,
  the same numbers the receipt shows. The badge function itself is unchanged (`web/src/main.ts:177`, still in the README
  table and still checked by `judge-path.test.ts`).
- Measured (default look, `desktop_24-partner-frame.png` at 1280 × 800 and `phone_24-partner-frame.png` at 390 × 844):
  question box bottom 221 / 308 px, badge line 257 / 344, coaching line 297 / 384, "Say this" 390 / 477, Show to person
  489 / 576, Next 489 / 628, We're stuck 541 / 680; on the desktop the person's card (headline 135, lowest tile 470) sits
  in the same frame. Why / trace / sent / receipt are all inside the closed fold (`checkVisibility()` false for each).

### Judge mode (`#/demo`): ordered for a 60-second read
- The one-tap questions moved under the question box, in three groups by what the judge sees happen (`C.judge.groups`:
  **Read in code** · **The app corrects the partner** · **A model proposes**), with short labels (`SAMPLE_QUESTIONS[].short`:
  "coffee or tea?", "therapy today, and did you eat?", "this weekend?"); the full question stays in `data-q` (what is
  asked) and in the hover text with `shows`. Desktop: a 12 px caption over each row, three rows; phone: the caption
  starts a horizontal scroll row (`.gc { display: contents }`), three rows, 4 px apart.
- Under the card, open, top to bottom: badge line → why this card → where each step ran → what was sent → the privacy
  receipt (open) → one compact session line (`<details class="judge">`, closed: summary "Judge mode · This session:
  4 no AI · 0 on this computer · 0 cloud help · 0 failed" via the new `C.how.tallyShort`; the intro and the no-helper
  note fold under it, still patched in place by `patchDevice()`). Checked: the four tops are in that order at both
  widths (desktop 440 < 786 < 926 < 1171; phone 520 < 937 < 1097 < 1420) and each is open; the groups sit above the card
  and the session line below the receipt.
- **The one-frame wow (field review, item ★2)**, `desktop_23-wow-frame.png`, captured at exactly 1280 × 800 (viewport only):
  the partner's question in the box, the correction "One thing at a time: showing the first." under the badge line
  "No AI needed · nothing left this computer", the line to say, all five actions (We're stuck at 750 px), and on the
  right "therapy today" with good / bad / something else (lowest tile 470 px). The same frame holds in the three
  previews (`preview_*/desktop_23-wow-frame.png`): twosides, signal, marker.

### Layout checks added (`scripts/shots.mjs`, now 63 checks on the default look)
- `withFold()`: the desktop checks run at 1280 × **800** (the shots stay 900 tall so the file holds the whole page);
  `frame()` saves the viewport as a judge sees it (shots 23 and 24).
- `aboveFold()`: question box, badge line, coaching line, "Say this" and the actions under the fold line; on the desktop
  also the person's headline and every tile. The partner screen must fit all four actions; judge mode the main pair
  (Show to person, Less support) plus the wow elements, because its status line is two to four lines depending on what
  the SDK reports for the helper in headless Chrome (it alternated between "download the private helper" and "can't run
  the private helper" across tonight's runs), which moves the third action row between 750 and 813 px on the desktop and
  754 and 882 px on the phone. The default look fit all five at 750 px on the desktop in every run.
- The fold check (why / trace / sent / receipt inside the closed `#made`, none visible), the badge-line check (visible,
  says what left), the judge read-order check, the chip-group check, and the "Show what would be sent" check.
- The old phone check ("Show to person" above the fold after coffee / tea in judge mode) now reads 738–786 px (Day 5:
  636 px before the chips moved above the card; the chip rows cost about 120 px there).

## Previews, looked at (`devlog/shots_day6/preview_{twosides,signal,marker}/`, shots 18, 22–25)
- Two Sides: the badge line in mono, the fold a slate panel, the three groups' captions in the desk's muted colour; the
  card frame holds. Signal: the fold takes the 2 px ink border; captions in navy-grey. Marker: the chips keep the
  hand-drawn radius; the fold is a white pad panel. No preview CSS was touched, and nothing in the previews broke.
- Marker's phone judge-mode row read 866 px in one run (four-line status) and 815 px in the next (two-line status): the
  status variance above, not a layout change between the runs.

## Honesty, unchanged
Every statement is still reachable: the why line, the trace with "did not run (why)", the exact sent body, the swaps,
the receipt and its counting note, the judge intro and the no-helper note. The badge line adds a claim, and it is read
from the recorded payload the receipt counts, never from the badge or an assumption. No on-device run happened tonight.

## Tests and gates
`npm run check` exit 0: ESLint 0, `tsc` 0, Vitest **814 / 814 in 19 files** (unchanged: tonight is UI, copy and the
shots script; the copy-truth test covers the new `card.made`, `badge.tail`, `judge.groups` and `how.tallyShort` strings
through the existing group rules). `scripts/shots.mjs` 63 / 63 on the default look; 23 / 23 on each preview with
`--only 18,22,23,24,25`.

## Not done, by design
- No video, no billing, no deploy, no native, no on-device run (disk).
- The default look's spacing is as it was; the chosen direction's phone spacing (status line, chip rows) is tuned when
  the direction is picked, per DESIGN_DIRECTIONS "before it ships".
- The judge-mode phone frame keeps the third action row under the fold when the status runs to four lines; the pair
  and the wow elements fit.

Next step: judge round 1 on this build (`#/demo`, official fwd/rev + engineering seats), then fixes; apply the owner's design
choice; deploy when the disk is freed.
