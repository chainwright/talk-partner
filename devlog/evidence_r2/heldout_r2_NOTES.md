# Held-out set: our reading of the first run (16 Nov 2026)

The two result files next to this one (`heldout_r2_rules.md`, `heldout_r2_ondevice.md`) are the first and only run of
`eval/heldout_r2.json`, made at commit `9ac4fd9`, the commit that added the set. They are unedited. No rule, prompt or
label was changed after the run; the misses below are open.

## The numbers
- **Real app, on-device model, cloud help off: 55 of 60 cards matched the label.** 38 of 42 where the rules decide
  alone; 17 of 18 open questions (who, where, what), each answered by Gemini Nano through Firebase AI Logic
  (`inferenceSource=on_device` on 27 of the 60 cards; the other 33 ran no model). No request left the app's host.
- **Rules alone, no model: 54 of 60.** 36 of 42 where the rules decide alone; all 18 open questions correctly got no
  card instead of a wrong one.

## The labels were too kind twice
Reading every card after the run, two that the scorer passed are wrong cards in our own judgement. The labels only
forbade what we had thought of in advance:
- 52. "Where do you want to eat your dinner?" gave *pot roast / chili / somewhere else*: foods on a "where" question.
- 57. "What music shall I put on?" gave *Johnny Cash / Wheel of Fortune*: a TV show offered as music.

Counting those as misses, the on-device figure is **53 of 60**. We quote 55 of 60 only together with this note.

## The misses (on-device run)
- 8. "Shall we ring Tyler or Jenny first?" → *ring Tyler / Jenny first*: the parser kept the verb and the trailing word.
- 11. "Is it too hot or too cold in here?" → *hot / cold in here*: the trailing phrase stayed on the second option.
- 35. "How bad is your headache right now?" → a model card *a little / some*, not the fixed pain scale: the pain rule
  does not know "headache".
- 42. "What did you have for breakfast?" → a choice card *cereal / toast*: a memory question the quiz rule missed, so
  the app invented answers to something only the person knows. The most serious of the five.
- 53. "Where should we go for a walk?" → *the lake / hardware store*.

Rules alone, also: 10 and 12 (either-or questions the parser cannot read without the model's copy of the options: no
card, and *make chili / pot roast*).

## What this does not show
The labels are ours and were written the same day as the last rule change. One made-up family, two choices at a time,
one answer per question; the model's answers vary between runs. "Matched the label" is not "a person with aphasia could
answer with it". The timed trial (`devlog/TRIAL_PROTOCOL.md`) has not been run.
