# Day 5: Wed 11 Nov 2026, late (CST; 12 Nov UTC)

> **Correction, 16 Nov 2026.** This page says the on-device step could not run on the development machine for lack of disk. On 11 Nov that was our reading of the disk; on 16 Nov the machine had 36 GiB free and the Gemini Nano files from the 9–10 Nov prototype were still on it, and the step ran that day (`DAY7.md`, `ondevice_proof_1/RUN_LOG.md`). Read every "(disk)" below as "not run yet". Line numbers quoted for `web/src/main.ts` and other files are those of that day.

Scope: the §5 items of our 12 Nov review of the field (internal notes, not in this repo) that need no billing, no deploy and no native build, and that do not
depend on the owner's design choice: ★2 (the partner correction made visible, logic and UI, not the video), 7 ("Why this
card"), 8 (the "we're stuck" repair card), 6 (look-alikes named), ★1(c) (one documented cut) and 11 (tagline and
Built-with). Every new piece of UI uses the existing tokens and classes only, so it renders in the default look and in
the three `?theme=` previews; the default look itself is unchanged. `web/src/ai/firebaseEngine.ts` is untouched. No
on-device run happened (this Mac still cannot run Gemini Nano: disk); nothing claims one.

## Done (each checked by a test or a screenshot, not assumed)

### ★2 The app corrects the partner, quietly (`Card.coach`)
- The pipeline sets `coach` only where a rule already detected something about the question itself: two questions in
  one (`splitQuestion`, rule 1) → "One thing at a time: showing the first."; a memory test (`isQuiz`, rule 9) → "You
  know this one: tell, don't test."; options the screen cannot know (the cloud's "hold up two" path for "which
  jumper") → "The real options are not on the screen: hold two up and point to each as you ask." Nothing else sets it;
  an ordinary either-or, yes/no, body or open card carries no line (`tests/unit/day5.test.ts`).
- On the partner screen it is one quiet sentence under the badge (`.coach`: accent bar on the panel colour), never a
  warning colour, never about the person. The memory card now reads coach line → "This one asks them to remember. Try
  saying it instead:" → the line to say.
- Judge mode: the chip "How was therapy today?" became **"How was therapy today, and did you eat?"**: the card shows the
  coaching line, the first half as the feeling scale, and "Next: second question" gives "Did you eat?" as yes / no. The
  test question ("What year did we get married?") was already a chip.
- **Wow it gives (real):** the one frame our field review asks for exists in the product, not only in a video plan: left,
  the partner's question with the correction; right, the person's card. [Corrected 16 Nov: this line read "Nobody in the field corrects the partner", which is false: AACessTalk gives real-time guides to the parent, and our README names it as the source of the idea. What we did not find is a tool that corrects the partner's own question while turning it into a card.]

### 7 "Why this card" (`Card.why`, `core/pipeline.ts`)
- Written while the rules run, on the values they run on: `cleanChoices()` records every choice that leaves the list
  at the moment it leaves, with the rule that removed it (same as the headline, repeated, negative wording, a label the
  cloud made up, "both", a time on another scale, lives here, a name not in About me, does not answer this kind of
  question, an invented detail of their own things, overlaps another choice, more than three, a generic place when
  About me has real ones) and every choice code adds with its source (people / places / foods / TV / music from About
  me, the fixed set, "hold up two"). `assemble()` adds the support-level cut ("over the limit at this support level"),
  the either-or outcomes (the model's copied options kept, or its failed options listed and the pair read in code), the
  fixed-card outcome (every model choice dropped with "a fixed card"), who decided and where the headline came from.
  `proposed` is the parsed model output with the step that made it (private or stripped; the offline fall-back still
  says stripped). When the cloud's choices did not hold up and the device card was kept, the cloud's drops are
  appended, each prefixed "the cloud's choices did not hold up".
- UI: `whyLine()` renders it as one line with bold labels; `<details class="why">` is open in judge mode and on
  `#/how` (last card), collapsed on the partner screen. Nothing is invented in the renderer: it only reads `Card.why`.
- Tests: kept and added labels are on the card and dropped ones are not, across open, household, generic-place,
  either-or (model pair / code pair / no model), fixed, cloud, offline and blocked cards; the recorded proposal equals
  the model output as parsed.
- Honest limit: without Gemini Nano on this machine the screenshots show "No model answer reached the rules" on every
  card. The rich lines (proposed / kept / dropped) are exercised by the tests with fake engines, not yet seen live.
- **Wow it gives (real):** "model proposes, code decides" stops being a sentence in the README and becomes a line a judge
  reads under every card, with the dropped choice and the rule by name. That is the Tech story the field's best
  (Raaz's "facts live in code", Nightride's "picks a card") only state.

### 8 "We're stuck" → the repair card (`repairCard()`)
- A button on every card the person can see (not on a blocked card). It swaps the person's screen for a fixed card:
  headline "another way"; three ways to get the message out in one row (**show me**, **write it**, **draw**) and two
  quieter ways to leave it for now (**later**, **change topic**); the partner line "Let's try another way. Show me,
  write it, draw, later, or change topic?" built by `spokenLine()`. The tiles have the role `repair`: a tap goes through
  the usual "So: write it. Right?" tick, and the partner then gets the next move for that way ("Give them the pad:
  Write it, any letters you can." / "Say: Later, then. We will come back to it. And come back."); a repair tile never
  enters the recap. "Back to the choices" restores the question card. Never a model: code-only trace, nothing sent,
  "No AI needed".
- Wording grounded in the Aphasia Institute SCA tip sheet, re-read in full tonight (text extracted from the PDF; the new
  quotes are appended to `devlog/DAY2_sources.md`): "give clues by gesturing, or pointing to objects, pictures and
  written key words" (show me); "Encourage the person with aphasia to write down a word or draw if they can" (write it,
  draw); "give a time when you will return to finish your conversation. Make sure you do return" (later, and the
  partner's "And come back"). "Change topic" is ours (the sheet: "Establish a clear general topic first"; PrAACtical
  AAC's standing "offer some others"); "Let's try another way" is ours (the sheet says "use a hierarchy of techniques").
- Four new pictograms (`web/src/pictos.ts`, register rows in `PICTOGRAMS.md`): show me (a hand pointing at a small
  object), draw (pencil leaving a wavy line), later (clock with an arrow coming back round), change topic (two speech
  bubbles, the second taking over). "write it" and "change" already existed. The provenance test still holds.
- Design decision, stated: five tiles on one card breaks the 2–3 rule for answer cards. This is a strategy page, not an
  answer card (Aphasia Duo's "Chat Help" pages do the same); the two outs are drawn quieter (`.tile.out`) so the eye
  lands on the three ways first. To revisit with an SLP.
- **Wow it gives (real):** no competitor has a repair path inside a generated card; here it is one tap from every card,
  and it is the SCA sheet's own list, not ours.

### 6 Look-alikes, named (README + `#/how`)
Four entries, each re-checked on its primary page tonight (not taken from the field beat on trust): Lingraphica
Conversations (24 Jun 2026: transcribes the partner's speech, suggests keywords and replies to the device user; Hub
devices, 18+, English, internet), Lingraphica Smart Folders (10 Nov 2026: title + description → dozens of pictured cards
in the Talk tool; "10, 15 minutes … a minute and a half"), AACessTalk (CHI 2025: "real-time guides to the parent", "contextual
vocabulary cards to the child", 11 pairs, two weeks), Tobii Dynavox TD Snap Aphasia (Whiteboard "a shared space for people
with aphasia and their communication partners", a "Communication Breakdown Repair" activity, no AI on the page) plus
Tobii's RESNA session of 22 Sep 2026 ("clearly defined, user-centered use cases"). **Not quoted:** the field beat's
14 Oct 2026 Tobii interview line ("we haven't put a lot of generative AI into our language systems"); a search tonight did
not find the page, so the README says it is reported and unverified rather than quoting it.
**Wow it gives (real):** the Idea criterion asks for understanding of the problem space; naming the newest big-vendor move
(Smart Folders, two days old) and saying exactly where it stops is what the Chrome 2025 winners did.

### ★1(c) One documented cut (README)
From real data only: the pre-period blind rating (run 3, 16/50, 19 choppy spoken lines, 12 cards without a way out →
code builds the line and the escape; 39/50 three runs later, same model; labelled pre-period, not a result of this build),
the day-1 real cloud answer "stay home / go out" (→ `dropGenericWhere` on *where* questions, with the honest note that on a
"what do you want to do" question the pair can still appear), and the 35-state matrix for either-or (garbage options in
5 cells, topic-is-option in 5, coffee / tea / something else under "drink" in all 35). Every cut is now visible per card
in "Why this card", which closes the loop between 7 and ★1(c).
**Wow it gives (real):** AAC Board AI won Most Helpful with a cut stated out loud ("80 % … too high"); ours has numbers,
file names and a test for each.

### 11 Tagline + Built-with (`devlog/SUBMISSION_NOTES.md`)
The one-clause tagline from the field beat, the second line, the insight line, and a Built-with table with only the tags
the build really uses today (firebase-ai-logic, gemini-nano, gemini, firebase-app-check, typescript, vite, vitest,
indexeddb, svg) and the three **not** to add until they are real (hosting, firestore / auth, remote-config). The field
beat's list included firestore, remote-config and hosting; none is in the code yet, so they are not claimed.

## Tests and gates
`npm run check` exit 0: ESLint 0, `tsc` 0, Vitest **814 / 814 in 19 files** (Day 4: 794 in 18). New: `day5.test.ts` 20.
The README call table moved to the new lines (`core/pipeline.ts:425/505/533`, `web/src/main.ts:177`); `judge-path.test.ts`
caught the stale numbers first, as designed. `scripts/shots.mjs` gained shots 18–21 (double-question coach, why this
card, stuck partner, repair person) in the normal flow.

## Screenshots (`devlog/shots_day5/`, phone 390 × 844 and desktop 1280 × 900, default look; looked at, not only taken)
- `18-double-question-coach`: the coaching line sits between the badge and "Say this"; the right pane shows the first
  half as a feeling card; "Next: second question" is in the actions. Phone: all above the first scroll.
- `19-why-this-card`: "Should we ring Jen or Tyler?" with the open why line: no model answer · decided by either-or read
  from the question in code · headline the shared topic of the two options.
- `20-stuck-partner` / `21-repair-person`: the five tiles; on the phone's full screen the three-across row makes "show
  me" and "write it" wrap to two lines at 28 px, still legible, the outs below are visibly quieter.
- `10-memory`: coach line "You know this one: tell, don't test." above the explanation and the line to say.
- `17-how-this-works`: the look-alikes list at the bottom and the last card's why.
- `preview_twosides/` and `preview_signal/`: the same screens in two of the previews; the coach bar takes the mint /
  navy accent, the repair outs the preview's muted colour, the three-across row holds. No preview CSS was written.
- 13/13 layout checks (no horizontal scroll at either width; "Show to person" above the fold on the phone at 636 px).
  Note: the Day 4 log said 588 px for the same check; I re-ran the Day 4 code tonight with today's changes stashed and
  it also reads 636 px on this run, so the difference is the run environment, not today's work.

## Wow per stage, honest
| Stage | What today adds | Real? |
|---|---|---|
| Idea | "the app corrects the partner, never the person" is now on screen, not in prose | yes, in the build |
| First screen | unchanged (design choice pending) | — |
| Live demo | judge path: double question → coach line → Next; We're stuck → repair card; why line under every card | yes, in `#/demo` |
| Video | the 0:20 frame and the 1:30 "test question" beat exist as product screens to film | not filmed |
| README / page | the documented cut with numbers; the look-alikes with dates; a pasteable tagline | yes |

## Not done, by design
- No video, no billing, no deploy, no native, no on-device run (disk).
- The why line's rich form (proposed / kept / dropped) is covered by tests, not yet seen with a live model.
- "Change topic" and the five-tile repair card are design decisions to check with an SLP; stated above and in the sources note.
- The default look is unchanged; the new pieces will take whichever direction is picked without further CSS.

Next step: judge round 1 on this build (`#/demo`, official fwd/rev + engineering seats), then fixes; apply the owner's design
choice; deploy when the disk is freed.
