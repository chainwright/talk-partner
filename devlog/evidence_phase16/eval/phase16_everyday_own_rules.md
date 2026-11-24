# Phase 16, "Ask in your own words": rules alone (no model)

- date: 2026-11-24T08:37:20.321Z
- commit: `1972661245d5c586af7213e5cd826bdcda185f27` (uncommitted changes in 158 file(s) when the run started)
- set: `eval/phase16_everyday.json`, 10 questions, sha256 `6b409eb22367b18b5bbea095891f15dd9b12b0c25ebc81275b81c308467ecd0d`
- command: `node scripts/eval-heldout.mjs --own --set eval/phase16_everyday.json`

**What this is.** The phase 16 path, "Ask in your own words", leg: **rules alone (no model)**. The labels are the authors' own; not a user trial. A card the rules made after a refusal answers the nearest ready question, so it is never counted as a match.

| On the 10 questions | rules alone (no model) |
|---|---|
| a card (never a blank "No card") | 10/10 |
| the card matched our label | **2/10** |
| made by an AI (the SDK's report) | 0/10 |
| made by the rules from the words | 1/10 |
| kept from every model by the guard (care, warning sign, crisis) | 1/10 |
| the rules' best card after a refusal ("Made by the app's rules (no AI)") | 8/10 |
| time from submit to card, median (range), sheet taps included | 3 ms (1.2–36.5) |
| hosts other than the app's own | none |

## Every question

| # | Question | Made by | Card | SDK | Matched |
|---|---|---|---|---|---|
| 101 | What do you fancy for lunch today? | fallback | choice: something to eat / something to drink / [something else] (for "Would you like something to eat or something to drink?") | no model | no: the rules' best card instead: "Would you like something to eat or something to drink?" |
| 102 | Do you want to go out later or stay in? | rules | choice: go out later / stay in / [something else] | no model | yes |
| 103 | Shall we do something this afternoon, or would you rather have a quiet one? | fallback | choice: stay in / go out / [something else] (for "Would you like to stay in or go out?") | no model | no: the rules' best card instead: "Would you like to stay in or go out?" |
| 104 | Who do you want to see this weekend? | fallback | choice: company / some time alone / [something else] (for "Would you like company, or some time alone?") | no model | no: the rules' best card instead: "Would you like company, or some time alone?" |
| 105 | Where shall we go for a drive tomorrow? | fallback | choice: stay in / go out / [something else] (for "Would you like to stay in or go out?") | no model | no: the rules' best card instead: "Would you like to stay in or go out?" |
| 106 | What shall I pick up for you from the shop? | fallback | choice: about food or drink / people / plans / [something else] (for "Is it about food or drink, people, or plans?") | no model | no: the rules' best card instead: "Is it about food or drink, people, or plans?" |
| 107 | What do you want to do after your nap? | fallback | choice: bed / chair / [something else] (for "Would you like to rest in the bed or the chair?") | no model | no: the rules' best card instead: "Would you like to rest in the bed or the chair?" |
| 108 | Which game do you want to watch on Saturday? | fallback | choice: TV / music / [something else] (for "Would you like TV or music?") | no model | no: the rules' best card instead: "Would you like TV or music?" |
| 109 | What should we cook when Beth comes over? | fallback | choice: about food or drink / people / plans / [something else] (for "Is it about food or drink, people, or plans?") | no model | no: the rules' best card instead: "Is it about food or drink, people, or plans?" |
| 110 | Is your back still sore today, love? | guard | yesno: yes / no / [not sure] | no model | yes |

## Limits

- One run per leg; the model's answers vary between runs.
- The labels are ours; the everyday set was written by the authors, not by carers.
- "Matched" means the card matches the label, not that a person with aphasia could answer with it.
