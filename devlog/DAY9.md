# Day 9 (16 Nov 2026, late evening): the first screen, after a design review

A design review of the build at `510f84a` proposed eight small changes to what a judge sees first. One was already
done on day 8 (the card above the fold on a phone). The other seven are below, one commit each (the number got a
second, small one). Every commit was made only after `npm run check`, `npm run build`, the three end-to-end scripts,
the layout script and the fonts check had each ended with exit code 0 on that tree. No card rule, prompt or model
setting was changed, so the measured number of day 8 is untouched; the labelled set was run once more at the end.

## What changed
1. **A finished card on the first frame of judge mode** (`a0931c6`). `#/demo` opened on an empty pane with an ear.
   It now makes one card before the first draw and shows it without an entrance: "Do you want coffee or tea?", a
   question code decides alone, so it is there on a bare clone too and sends nothing. Its chip is lit. It is a real
   card and is counted in the session line and the receipt. On a phone the card's top is at 781 px of 844 on that
   first frame; the tiles are below the fold.
2. **One number instead of a paragraph** (`12d9327`, colours in `7db4f91`). Under the chips: "0 bytes left this
   computer", at display size, from the same count as the receipt. We checked what would make that sentence false
   before writing it. It is said only while no cloud request has been handed to the SDK. After a cloud answer the
   figure is the size of what the app handed over and is called "handed to cloud help", because the app does not see
   the wire. A request that failed after hand-over reads "may have left". Loading the page is named as not counted:
   on localhost nothing leaves at all, a hosted copy would fetch its own files. The nine-line "How this is counted"
   is behind one link in the receipt.
3. **"Show to person" lifts the card** (`b177f50`). A view transition on the card itself: the white pane grows into
   the whole screen in 250 ms, and comes back down on the way out. None under prefers-reduced-motion and none in a
   browser without view transitions; the screen then simply changes.
4. **The opening line** (`aa373bb`): "It corrects how you ask. It never answers for them." The old line ("Turn your
   question into big written choices they can point to.") sits under it. Before it went on screen both halves were
   checked against the code. The first is true where a rule can tell (two questions in one, a memory test, options
   that are not on the screen) and nowhere else; `CLAIMS.md` row 11 stays "Partial" and says so. The second is pinned
   by a test that reads the client: outside a tap on the card, nothing picks or confirms a choice.
5. **"What was sent" in one line** (`78aaf74`). The panel printed the whole request under every card, several hundred
   words of fixed instructions. It now shows the part that changes ("Partner asks: …", after the swap) and the size;
   "Show the exact request" opens the request as before.
6. **The partner's usual questions as chips** (`ee5529a`). Outside judge mode, up to three questions answered most
   often stand above the question field, from "Answers so far" on this computer. A chip carries the question only; a
   tap asks it again on a fresh card.
7. **Why this cloud model** (`5cb9c5e`). One README paragraph: `gemini-3.5-flash-lite` is not on the Firebase AI
   Logic "no longer recommended" list of 5 Oct 2026, and from 1 Dec 2026 `gemini-2.5-flash` is routed to it. Read in
   the release notes on 16 Nov 2026.

## Runs at `5cb9c5e`, clean tree (`devlog/evidence_r4/final/`)

| Run | Result |
|---|---|
| `npm run check` | 957 tests, exit 0 (was 923) |
| `npm run build` | exit 0, no debug token in `dist` |
| `npm run e2e:noconfig` | 12/12 (was 10) |
| `node scripts/e2e-cloud.mjs` | 18/18 (was 15) |
| `node scripts/e2e-ondevice.mjs --port 9335` | 36/36 |
| `node scripts/shots.mjs` | 83/83 (was 67) |
| `node scripts/fonts-check.mjs` | 6/6 |
| `node scripts/eval-heldout.mjs` | rules alone: 36/42 where code decides, 0/18 open cards |
| `node scripts/eval-heldout.mjs --port 9335` | 36/42 where code decides; open: 16/18 matched, 13/18 personal |
| `npm audit --omit=dev` | 4 high, all gRPC under `@firebase/firestore` (not imported); exit 1 |

One run that did not pass, kept here because it happened: during the checks for the first change the on-device
script ended 31/36. The model returned "An unknown error occurred: kErrorUnknown" for "What do you want to do this
weekend?", the card was an honest "No card", and five checks that expect a card failed. The same tree passed 36/36
on the next run and the script has passed on every tree since (nine runs). We do not know the cause; it is the
browser's model, not a rule. If it shows in front of a judge, the card says what failed and the trace shows it.

## Not done, or true only with a limit
- The first card of judge mode is a card with no AI. It shows what the person sees, not the hybrid; the path in
  `JUDGES.md` still starts on "this weekend?" and "for dinner?", which need the model. An on-device card cannot be on
  the first frame: it takes about 3 s and a model the judge may not have.
- The first card has no entrance and the opening line stays above it on a phone, so on a phone only the card's top
  and headline are in the first screen.
- The chips of usual questions are not in judge mode (the sample family's answers are not kept, and its own chips
  stand there). A judge sees them only on the partner screen after confirming an answer.
- "It corrects how you ask" is a habit of the app, not a promise for every question: most questions get no coaching
  line because there is nothing to correct, and the memory rule still misses "What did you have for breakfast?".
- The lift was checked in desktop Chrome only (headless, both widths). Safari and Firefox were not opened.
- Everything on the "still not true" list of day 8 stands: no hosted URL, no production App Check provider, no public
  repository, no video, no trial with people.
