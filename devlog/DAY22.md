# Day 22 (22 Nov 2026): phase 12, the fixes of judge round 9

The brief was `design/PHASE12_BRIEF.md`, from `../judge_app_r9_2026-11-22/SUMMARY.md`. Work began from `38b89f3`
(live: `cb15e70`). Each item was committed on its own after `npm run check` exited 0; every health item has a unit
test in `tests/unit/phase12.test.ts` that failed before its fix. No model was called: the 11 pictures were made
before this phase (`devlog/quota_probe_2026-11-20/r9_regen/`). Nothing was pushed or deployed.

Items 1 to 6 (health): `3adf877`, `d5baac8`, `8aceee7`, `bbb393b`, `3dea697`, `9fa1bb4`. Items 7 to 9 (pictures,
preload): `824f247`, `642f521`, `65364a6`. Item 10 (the AI strip): `8ad5711`, `46f0b76`, `9dc8060`. Items 11 to 16:
`1f2ad00`, `19d34d0`, `ff410f4`, `0140b69`, `426abce`, `cb7ea5d`. The walk: `c901148`.

Choices that differ from the brief:
- The weakness question reads "Is it suddenly weak or numb, yes or no?": without the tail the rules make an
  either-or of "weak" and "numb". It is asked right after the limb or the face is chosen, before how bad; the
  "a little" end line names the sign too, for when the depth limit cuts the question.
- The AI strip names no product ("Google's AI", "Chrome's own AI"): the copy test keeps product names off the
  carer's screens. At 360 px the two lines fold, so the first row of topics stays above the fold.
- The crisis choice is on a third page of the feelings card (worried, lonely, "I can't go on"), not on the visit
  page; the crisis lines are given only where we are sure of them (US, CA, UK, IE, AU, NZ).
- "I feel…" got three faces of our own; the Feelings topic tile keeps the new smiling face.

Runs (production build of `9dc8060`): `npm run check` 3001; `e2e-simple.py` 1032/1032; `pwa-check.py` 34/34;
`e2e-needs.mjs` 13/13; `overflow-check.py` 548/548; `contrast-check.mjs` 144/144; `phase8-shots.py` 21/21;
`phase9-shots.py` 52/52; `phase10-shots.py` 132/132; `phase11-walk.py` 48/48; `phase12-walk.py` 142/142.
