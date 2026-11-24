# Phase 16, "Ask in your own words": on this computer, Gemini Nano ONLY_ON_DEVICE (online help off)

- date: 2026-11-24T08:39:22.280Z
- commit: `1972661245d5c586af7213e5cd826bdcda185f27` (uncommitted changes in 158 file(s) when the run started)
- set: `eval/heldout_r2.json` (open questions only), 18 questions, sha256 `8d260a80d6d612e3dec9a4f9137d3c28d60a74934134056f8a02812fde92c83d`
- command: `node scripts/eval-heldout.mjs --own --open --port 9335`
- browser: Chrome/157.0.8103.52; the line under the form: "Chrome's own AI on this computer makes the choices. Nothing is sent."; consent sheets: 0
- app: http://localhost:5179/#/sample (the simple view with the sample family, 390 x 844)

**What this is.** The phase 16 path, "Ask in your own words", leg: **on this computer, Gemini Nano ONLY_ON_DEVICE (online help off)**. The labels are the authors' own; not a user trial. A card the rules made after a refusal answers the nearest ready question, so it is never counted as a match.

| On the 18 questions | on this computer, Gemini Nano ONLY_ON_DEVICE (online help off) |
|---|---|
| a card (never a blank "No card") | 18/18 |
| the card matched our label | **15/18** |
| made by an AI (the SDK's report) | 18/18 |
| made by the rules from the words | 0/18 |
| kept from every model by the guard (care, warning sign, crisis) | 0/18 |
| the rules' best card after a refusal ("Made by the app's rules (no AI)") | 0/18 |
| time from submit to card, median (range), sheet taps included | 3723 ms (3503–34303) |
| hosts other than the app's own | none |

## Every question

| # | Question | Made by | Card | SDK | Matched |
|---|---|---|---|---|---|
| 43 | Who do you want to ring this afternoon? | device | choice: Jenny / Tyler / [someone else] | private: on_device | yes |
| 44 | Who should we invite for Sunday dinner? | device | choice: Jenny / Tyler / [someone else] | private: on_device | yes |
| 45 | Who would you like to visit this week? | device | choice: Jenny / Tyler / [someone else] | private: on_device | yes |
| 46 | Who shall I text about the appointment? | device | choice: Jenny / Tyler / [someone else] | private: on_device | yes |
| 47 | Who do you want to sit with at the wedding? | device | choice: Jenny / Tyler / [someone else] | private: on_device | yes |
| 48 | Who should drive us on Friday? | device | choice: you / Jenny / [someone else] | private: on_device | yes |
| 49 | Where do you want to go this afternoon? | device | choice: the lake / church / hardware store / [somewhere else] | private: on_device | yes |
| 50 | Where shall we go on Saturday? | device | choice: the lake / church / hardware store / [somewhere else] | private: on_device | yes |
| 51 | Where would you like to sit? | device | choice: chair / sofa / [somewhere else] | private: on_device | yes |
| 52 | Where do you want to eat your dinner? | device | choice: lake / church / [somewhere else] | private: on_device | no: an answer that should not be offered: lake, church |
| 53 | Where should we go for a walk? | device | choice: lake / hardware store / church / [somewhere else] | private: on_device | no: an answer that should not be offered: hardware store |
| 54 | Where would you like to go for your birthday? | device | choice: lake / church / hardware store / [somewhere else] | private: on_device | yes |
| 55 | What would you like for supper? | device | choice: pot roast / chili / ginger biscuits / [something else] | private: on_device | yes |
| 56 | What do you want to watch tonight? | device | choice: Wheel of Fortune / Packers / [something else] | private: on_device | no: 1 of the expected About-me answers (need 2): Wheel of Fortune / Packers |
| 57 | What music shall I put on? | device | choice: Johnny Cash / radio / [something else] | private: on_device | yes |
| 58 | What do you want to do tomorrow morning? | device | choice: lake / church / hardware store / [something else] | private: on_device | yes |
| 59 | What should we get Tyler for his birthday? | device | choice: book / game / [something else] | private: on_device | yes |
| 60 | What do you fancy for breakfast? | device | choice: cereal / toast / [something else] | private: on_device | yes |

## Limits

- One run per leg; the model's answers vary between runs.
- The labels are ours; the everyday set was written by the authors, not by carers.
- "Matched" means the card matches the label, not that a person with aphasia could answer with it.
