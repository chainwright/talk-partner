# Phase 16, "Ask in your own words": online, PREFER_IN_CLOUD after "Just this once"

- date: 2026-11-24T08:47:48.112Z
- commit: `1972661245d5c586af7213e5cd826bdcda185f27` (uncommitted changes in 191 file(s) when the run started)
- set: `eval/heldout_r2.json` (open questions only), 18 questions, sha256 `8d260a80d6d612e3dec9a4f9137d3c28d60a74934134056f8a02812fde92c83d`
- command: `node scripts/eval-heldout.mjs --own --open --cloud`
- browser: Chrome/158.0.8127.38; the line under the form: "Google's AI makes the choices, online, after your yes. Names you listed are swapped out."; consent sheets: 18
- app: http://localhost:5180/#/sample (the simple view with the sample family, 390 x 844)

**What this is.** The phase 16 path, "Ask in your own words", leg: **online, PREFER_IN_CLOUD after "Just this once"**. The labels are the authors' own; not a user trial. A card the rules made after a refusal answers the nearest ready question, so it is never counted as a match.

| On the 18 questions | online, PREFER_IN_CLOUD after "Just this once" |
|---|---|
| a card (never a blank "No card") | 18/18 |
| the card matched our label | **13/18** |
| made by an AI (the SDK's report) | 17/18 |
| made by the rules from the words | 0/18 |
| kept from every model by the guard (care, warning sign, crisis) | 0/18 |
| the rules' best card after a refusal ("Made by the app's rules (no AI)") | 1/18 |
| time from submit to card, median (range), sheet taps included | 1332 ms (1132–2158) |
| hosts other than the app's own | www.google.com, content-firebaseappcheck.googleapis.com, www.gstatic.com, firebasevertexai.googleapis.com |

## Every question

| # | Question | Made by | Card | SDK | Matched |
|---|---|---|---|---|---|
| 43 | Who do you want to ring this afternoon? | cloud | choice: Jenny / Tyler / [someone else] | stripped: in_cloud | yes |
| 44 | Who should we invite for Sunday dinner? | cloud | choice: Jenny / Tyler / [someone else] | stripped: in_cloud | yes |
| 45 | Who would you like to visit this week? | cloud | choice: Jenny / Tyler / [someone else] | stripped: in_cloud | yes |
| 46 | Who shall I text about the appointment? | cloud | choice: Jenny / Tyler / [someone else] | stripped: in_cloud | yes |
| 47 | Who do you want to sit with at the wedding? | fallback | choice: about food or drink / people / plans / [something else] (for "Is it about food or drink, people, or plans?") | stripped: in_cloud | no: the rules' best card instead: "Is it about food or drink, people, or plans?" |
| 48 | Who should drive us on Friday? | cloud | choice: family / friend / [someone else] | stripped: in_cloud | yes |
| 49 | Where do you want to go this afternoon? | cloud | choice: lake / church / hardware store / [somewhere else] | stripped: in_cloud | yes |
| 50 | Where shall we go on Saturday? | cloud | choice: lake / church / hardware store / [somewhere else] | stripped: in_cloud | yes |
| 51 | Where would you like to sit? | cloud | choice: chair / sofa / [somewhere else] | stripped: in_cloud | yes |
| 52 | Where do you want to eat your dinner? | cloud | choice: at the table / in the living room / [somewhere else] | stripped: in_cloud | yes |
| 53 | Where should we go for a walk? | cloud | choice: lake / church / hardware store / [somewhere else] | stripped: in_cloud | no: an answer that should not be offered: hardware store |
| 54 | Where would you like to go for your birthday? | cloud | choice: lake / church / hardware store / [somewhere else] | stripped: in_cloud | yes |
| 55 | What would you like for supper? | cloud | choice: hot food / cold food / [something else] | stripped: in_cloud | no: 0 of the expected About-me answers (need 2): hot food / cold food |
| 56 | What do you want to watch tonight? | cloud | choice: film / sport / [something else] | stripped: in_cloud | no: 0 of the expected About-me answers (need 2): film / sport |
| 57 | What music shall I put on? | cloud | choice: classical / jazz / [something else] | stripped: in_cloud | no: 0 of the expected About-me answers (need 1): classical / jazz |
| 58 | What do you want to do tomorrow morning? | cloud | choice: stay home / go out / [something else] | stripped: in_cloud | yes |
| 59 | What should we get Tyler for his birthday? | cloud | choice: book / clothes / [something else] | stripped: in_cloud | yes |
| 60 | What do you fancy for breakfast? | cloud | choice: toast / cereal / [something else] | stripped: in_cloud | yes |

## Limits

- One run per leg; the model's answers vary between runs.
- The labels are ours; the everyday set was written by the authors, not by carers.
- "Matched" means the card matches the label, not that a person with aphasia could answer with it.
