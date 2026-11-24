# Phase 16, "Ask in your own words": on this computer, Gemini Nano ONLY_ON_DEVICE (online help off)

- date: 2026-11-24T08:40:09.557Z
- commit: `1972661245d5c586af7213e5cd826bdcda185f27` (uncommitted changes in 158 file(s) when the run started)
- set: `eval/phase16_everyday.json`, 10 questions, sha256 `6b409eb22367b18b5bbea095891f15dd9b12b0c25ebc81275b81c308467ecd0d`
- command: `node scripts/eval-heldout.mjs --own --set eval/phase16_everyday.json --port 9335`
- browser: Chrome/157.0.8103.52; the line under the form: "Chrome's own AI on this computer makes the choices. Nothing is sent."; consent sheets: 2
- app: http://localhost:5179/#/sample (the simple view with the sample family, 390 x 844)

**What this is.** The phase 16 path, "Ask in your own words", leg: **on this computer, Gemini Nano ONLY_ON_DEVICE (online help off)**. The labels are the authors' own; not a user trial. A card the rules made after a refusal answers the nearest ready question, so it is never counted as a match.

| On the 10 questions | on this computer, Gemini Nano ONLY_ON_DEVICE (online help off) |
|---|---|
| a card (never a blank "No card") | 10/10 |
| the card matched our label | **8/10** |
| made by an AI (the SDK's report) | 6/10 |
| made by the rules from the words | 1/10 |
| kept from every model by the guard (care, warning sign, crisis) | 1/10 |
| the rules' best card after a refusal ("Made by the app's rules (no AI)") | 2/10 |
| time from submit to card, median (range), sheet taps included | 3958 ms (263–5941) |
| hosts other than the app's own | none |

## Every question

| # | Question | Made by | Card | SDK | Matched |
|---|---|---|---|---|---|
| 101 | What do you fancy for lunch today? | device | choice: pot roast / chili / ginger biscuits / [something else] | private: on_device | yes |
| 102 | Do you want to go out later or stay in? | code | choice: go out later / stay in / [something else] | no model | yes |
| 103 | Shall we do something this afternoon, or would you rather have a quiet one? | device | choice: do something / quiet one / [something else] | private: on_device | yes |
| 104 | Who do you want to see this weekend? | device | choice: Jenny / Tyler / [someone else] | private: on_device | yes |
| 105 | Where shall we go for a drive tomorrow? | device | choice: lake / hardware store / church / [somewhere else] | private: on_device | yes |
| 106 | What shall I pick up for you from the shop? | fallback | choice: about food or drink / people / plans / [something else] (for "Is it about food or drink, people, or plans?") | private: on_device | no: the rules' best card instead: "Is it about food or drink, people, or plans?" |
| 107 | What do you want to do after your nap? | fallback | choice: bed / chair / [something else] (for "Would you like to rest in the bed or the chair?") | private: on_device | no: the rules' best card instead: "Would you like to rest in the bed or the chair?" |
| 108 | Which game do you want to watch on Saturday? | device | choice: Wheel of Fortune / Packers / [something else] | private: on_device | yes |
| 109 | What should we cook when Beth comes over? | device | choice: pot roast / chili / ginger biscuits / [something else] | private: on_device | yes |
| 110 | Is your back still sore today, love? | guard | yesno: yes / no / [not sure] | no model | yes |

## Limits

- One run per leg; the model's answers vary between runs.
- The labels are ours; the everyday set was written by the authors, not by carers.
- "Matched" means the card matches the label, not that a person with aphasia could answer with it.
