# Phase 16, "Ask in your own words": rules alone (no model)

- date: 2026-11-24T08:37:19.971Z
- commit: `1972661245d5c586af7213e5cd826bdcda185f27` (uncommitted changes in 157 file(s) when the run started)
- set: `eval/heldout_r2.json` (open questions only), 18 questions, sha256 `8d260a80d6d612e3dec9a4f9137d3c28d60a74934134056f8a02812fde92c83d`
- command: `node scripts/eval-heldout.mjs --own --open`

**What this is.** The phase 16 path, "Ask in your own words", leg: **rules alone (no model)**. The labels are the authors' own; not a user trial. A card the rules made after a refusal answers the nearest ready question, so it is never counted as a match.

| On the 18 questions | rules alone (no model) |
|---|---|
| a card (never a blank "No card") | 18/18 |
| the card matched our label | **0/18** |
| made by an AI (the SDK's report) | 0/18 |
| made by the rules from the words | 0/18 |
| kept from every model by the guard (care, warning sign, crisis) | 0/18 |
| the rules' best card after a refusal ("Made by the app's rules (no AI)") | 18/18 |
| time from submit to card, median (range), sheet taps included | 1.3 ms (0.6–34.2) |
| hosts other than the app's own | none |

## Every question

| # | Question | Made by | Card | SDK | Matched |
|---|---|---|---|---|---|
| 43 | Who do you want to ring this afternoon? | fallback | choice: stay in / go out / [something else] (for "Would you like to stay in or go out?") | no model | no: the rules' best card instead: "Would you like to stay in or go out?" |
| 44 | Who should we invite for Sunday dinner? | fallback | choice: something to eat / something to drink / [something else] (for "Would you like something to eat or something to drink?") | no model | no: the rules' best card instead: "Would you like something to eat or something to drink?" |
| 45 | Who would you like to visit this week? | fallback | choice: company / some time alone / [something else] (for "Would you like company, or some time alone?") | no model | no: the rules' best card instead: "Would you like company, or some time alone?" |
| 46 | Who shall I text about the appointment? | fallback | choice: about food or drink / people / plans / [something else] (for "Is it about food or drink, people, or plans?") | no model | no: the rules' best card instead: "Is it about food or drink, people, or plans?" |
| 47 | Who do you want to sit with at the wedding? | fallback | choice: about food or drink / people / plans / [something else] (for "Is it about food or drink, people, or plans?") | no model | no: the rules' best card instead: "Is it about food or drink, people, or plans?" |
| 48 | Who should drive us on Friday? | fallback | choice: stay in / go out / [something else] (for "Would you like to stay in or go out?") | no model | no: the rules' best card instead: "Would you like to stay in or go out?" |
| 49 | Where do you want to go this afternoon? | fallback | choice: stay in / go out / [something else] (for "Would you like to stay in or go out?") | no model | no: the rules' best card instead: "Would you like to stay in or go out?" |
| 50 | Where shall we go on Saturday? | fallback | choice: stay in / go out / [something else] (for "Would you like to stay in or go out?") | no model | no: the rules' best card instead: "Would you like to stay in or go out?" |
| 51 | Where would you like to sit? | fallback | choice: about food or drink / people / plans / [something else] (for "Is it about food or drink, people, or plans?") | no model | no: the rules' best card instead: "Is it about food or drink, people, or plans?" |
| 52 | Where do you want to eat your dinner? | fallback | choice: something to eat / something to drink / [something else] (for "Would you like something to eat or something to drink?") | no model | no: the rules' best card instead: "Would you like something to eat or something to drink?" |
| 53 | Where should we go for a walk? | fallback | choice: stay in / go out / [something else] (for "Would you like to stay in or go out?") | no model | no: the rules' best card instead: "Would you like to stay in or go out?" |
| 54 | Where would you like to go for your birthday? | fallback | choice: stay in / go out / [something else] (for "Would you like to stay in or go out?") | no model | no: the rules' best card instead: "Would you like to stay in or go out?" |
| 55 | What would you like for supper? | fallback | choice: something to eat / something to drink / [something else] (for "Would you like something to eat or something to drink?") | no model | no: the rules' best card instead: "Would you like something to eat or something to drink?" |
| 56 | What do you want to watch tonight? | fallback | choice: TV / music / [something else] (for "Would you like TV or music?") | no model | no: the rules' best card instead: "Would you like TV or music?" |
| 57 | What music shall I put on? | fallback | choice: TV / music / [something else] (for "Would you like TV or music?") | no model | no: the rules' best card instead: "Would you like TV or music?" |
| 58 | What do you want to do tomorrow morning? | fallback | choice: stay in / go out / [something else] (for "Would you like to stay in or go out?") | no model | no: the rules' best card instead: "Would you like to stay in or go out?" |
| 59 | What should we get Tyler for his birthday? | fallback | choice: about food or drink / people / plans / [something else] (for "Is it about food or drink, people, or plans?") | no model | no: the rules' best card instead: "Is it about food or drink, people, or plans?" |
| 60 | What do you fancy for breakfast? | fallback | choice: something to eat / something to drink / [something else] (for "Would you like something to eat or something to drink?") | no model | no: the rules' best card instead: "Would you like something to eat or something to drink?" |

## Limits

- One run per leg; the model's answers vary between runs.
- The labels are ours; the everyday set was written by the authors, not by carers.
- "Matched" means the card matches the label, not that a person with aphasia could answer with it.
