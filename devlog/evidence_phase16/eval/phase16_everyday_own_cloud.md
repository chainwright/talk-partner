# Phase 16, "Ask in your own words": online, PREFER_IN_CLOUD after "Just this once"

- date: 2026-11-24T08:48:15.539Z
- commit: `1972661245d5c586af7213e5cd826bdcda185f27` (uncommitted changes in 191 file(s) when the run started)
- set: `eval/phase16_everyday.json`, 10 questions, sha256 `6b409eb22367b18b5bbea095891f15dd9b12b0c25ebc81275b81c308467ecd0d`
- command: `node scripts/eval-heldout.mjs --own --set eval/phase16_everyday.json --cloud`
- browser: Chrome/158.0.8127.38; the line under the form: "Google's AI makes the choices, online, after your yes. Names you listed are swapped out."; consent sheets: 8
- app: http://localhost:5180/#/sample (the simple view with the sample family, 390 x 844)

**What this is.** The phase 16 path, "Ask in your own words", leg: **online, PREFER_IN_CLOUD after "Just this once"**. The labels are the authors' own; not a user trial. A card the rules made after a refusal answers the nearest ready question, so it is never counted as a match.

| On the 10 questions | online, PREFER_IN_CLOUD after "Just this once" |
|---|---|
| a card (never a blank "No card") | 10/10 |
| the card matched our label | **10/10** |
| made by an AI (the SDK's report) | 8/10 |
| made by the rules from the words | 1/10 |
| kept from every model by the guard (care, warning sign, crisis) | 1/10 |
| the rules' best card after a refusal ("Made by the app's rules (no AI)") | 0/10 |
| time from submit to card, median (range), sheet taps included | 1327 ms (259–1955) |
| hosts other than the app's own | www.google.com, content-firebaseappcheck.googleapis.com, www.gstatic.com, firebasevertexai.googleapis.com |

## Every question

| # | Question | Made by | Card | SDK | Matched |
|---|---|---|---|---|---|
| 101 | What do you fancy for lunch today? | cloud | choice: sandwich / soup / [something else] | stripped: in_cloud | yes |
| 102 | Do you want to go out later or stay in? | code | choice: go out later / stay in / [something else] | no model | yes |
| 103 | Shall we do something this afternoon, or would you rather have a quiet one? | cloud | choice: do something / have a quiet one / [something else] | stripped: in_cloud | yes |
| 104 | Who do you want to see this weekend? | cloud | choice: Jenny / Tyler / [someone else] | stripped: in_cloud | yes |
| 105 | Where shall we go for a drive tomorrow? | cloud | choice: lake / church / hardware store / [somewhere else] | stripped: in_cloud | yes |
| 106 | What shall I pick up for you from the shop? | cloud | choice: fruit / bread / [something else] | stripped: in_cloud | yes |
| 107 | What do you want to do after your nap? | cloud | choice: rest / read / [something else] | stripped: in_cloud | yes |
| 108 | Which game do you want to watch on Saturday? | cloud | choice: match on TV / live game / [something else] | stripped: in_cloud | yes |
| 109 | What should we cook when Beth comes over? | cloud | choice: pot roast / pasta / [something else] | stripped: in_cloud | yes |
| 110 | Is your back still sore today, love? | guard | yesno: yes / no / [not sure] | no model | yes |

## Limits

- One run per leg; the model's answers vary between runs.
- The labels are ours; the everyday set was written by the authors, not by carers.
- "Matched" means the card matches the label, not that a person with aphasia could answer with it.
