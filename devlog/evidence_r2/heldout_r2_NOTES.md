# Held-out set: what it shows, and our reading of the cards (16 Nov 2026, rewritten the same evening)

`eval/heldout_r2.json` is 60 partner questions we wrote and labelled ourselves, committed before its first run. This
note was rewritten after an outside review of that first run. What changed, and why, is at the end.

**Added 17 Nov 2026: the set is no longer held out.** It was when the four runs below were made. Since the evening
of 16 Nov, fixes that followed the rehearsals changed rules this set covers, and one of them was made after reading
a miss listed here (question 42, "What did you have for breakfast?", is caught since `148a211`). The code-decided
score moved with them (36 to 38, then 39, then 40 of 42), so it is not a held-out number any more, and the
sentence "Not fixed: fixing rules against this set would turn it into a tuning set" further down was true on the
day it was written and is not true now. Reports made before 17 Nov carry the line "no rule was changed after that
run" from the set's own description; that was true of the first run only. `scripts/eval-heldout.mjs` now counts
the rule commits from git and writes "no longer held out" itself. The latest on-device numbers when this note was
last changed (commit `c346d3d`, before the rule changes of 17 Nov) are in `devlog/DAY12.md`; any later run is named
in `CLAIMS.md`, row 16.

## The number to quote: the 18 open questions
42 of the 60 questions carry their own answers ("coffee or tea?", "are you cold?") or have a fixed card (feeling,
pain, body map, memory). Code decides those and no model is needed. The other 18 are open (who, where, what): the
choices are not in the question. That is the only place a model is needed, and the family's own people, places and
foods are only in About me, which only the on-device step sees.

| On the 18 open questions | Rules alone | On-device model (Gemini Nano through Firebase AI Logic, `ONLY_ON_DEVICE`, cloud help off) |
|---|---|---|
| a card was made | 0 | 18 in every run |
| the card matched our label | 0 | **16, 16, 16, 15** |
| …and it offers the family's own entries from About me (a personal card) | 0 | **13, 13, 13, 12** |
| the card is wrong by our label | 0 | 2, 2, 2, 3 (questions 52 and 57 every time; 56 in the fourth run) |

Four runs of the real app on 16 Nov 2026, each on a clean working tree: three at commit `8ca45b5`
(`devlog/evidence_r3/heldout_at_8ca45b5/run_a`, `run_b`, `run_c`; rules alone: `heldout_r2_rules.md` next to them)
and one at `8251484` (`devlog/evidence_r3/heldout_at_8251484/`). Between the two commits no card rule changed. In
the fourth run question 56, "What do you want to watch tonight?", gave *Packers / Wheel of Fortune*: "Packers" alone
is not the About-me entry "Packers games", so it counts as a miss. That is the size of the run-to-run movement.
`inferenceSource=on_device` was reported for 27 of the 60 cards in each run; the other 33 ran no model. No request
left the app's host. Open cards took about 3.1–3.3 s at the median and 5.4 s at the slowest.

On the 42 questions the rules decide alone: 36 matched with rules alone; 37, 38, 37 and 38 in the four runs with the
model (it can copy the two options out of a long either-or that the parser cannot read; that copy varies).

## What we no longer say
The first report gave one total: "55 of 60 with the on-device model, 54 of 60 with rules alone". Both halves were
poor measures:
- The 54 counted the 18 open questions as correct for rules alone because no card was made. Not making a wrong card
  is right, but it is not a card. Rules alone gave the partner a card to show on 36 of 60 questions.
- The 55 was one run, made on a working tree with uncommitted changes (the run's own header says so), and it does not
  reproduce: an outside re-run at `510f84a` gave 54, and the difference was the scorer, which failed
  "Packers game" against the About-me entry "Packers games". The scorer now ignores articles and plural endings in
  list entries.

## The labels were too kind, and are now stricter
Reading every card after the first run, two that the scorer passed are wrong cards in our own judgement, and a
third appeared in the re-run. The labels only forbade what we had thought of in advance:
- 52. "Where do you want to eat your dinner?" gave *pot roast / chili / somewhere else*: foods on a "where" question.
  Every run since has given the same card.
- 57. "What music shall I put on?" gave *Johnny Cash / Wheel of Fortune* in the first run and *Johnny Cash / Packers*
  in every run since: a TV show, then a sports team, offered as music.

`eval/heldout_r2_amendments.json` now forbids those answers for the two questions. The sealed set is not edited (its
checksum is in every run log); the scorer applies the amendments on top and each report also gives the count with the
labels as first sealed (18, 18, 18 and 17 of 18 open cards in the four runs). Both cards come from the model reaching for
About-me entries of the wrong kind, and code lets them through. Not fixed: fixing rules against this set would turn
it into a tuning set.

## The other misses
- 8. "Shall we ring Tyler or Jenny first?" → *ring Tyler / Jenny first*: the parser kept the verb and the trailing word.
- 11. "Is it too hot or too cold in here?" → *hot / cold in here*: the trailing phrase stayed on the second option.
- 12. "Shall I make chili, or would you rather have pot roast?" → *make chili / pot roast* with rules alone and in two
  of four model runs; no card for question 10 with rules alone.
- 35. "How bad is your headache right now?" → a model card *a little / some*, not the fixed pain scale: the pain rule
  does not know "headache".
- 42. "What did you have for breakfast?" → a choice card (*cereal / toast*, *eggs / toast*): a memory question the
  quiz rule missed, so the app invented answers to something only the person knows. The most serious one.

## Earlier records, kept as they were
`heldout_r2_rules.md`, `heldout_r2_ondevice.md` and `.json` in this folder are the first run of the set, unedited,
with the first scorer. Their headers name commit `9ac4fd9`; the on-device one also says the working tree had
uncommitted changes. We did not record what they were (the rules report written a moment earlier was at least one of
them), so we do not call that run "at `9ac4fd9`" any more. Both are superseded by the runs above.

## What this does not show
The labels are ours and were written the same day as the last rule change; no second labeller. One made-up family,
two choices at a time, one answer per question. "Matched the label" is not "a person with aphasia could answer with
it". The timed trial (`devlog/TRIAL_PROTOCOL.md`) has not been run.
