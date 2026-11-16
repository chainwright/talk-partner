# Held-out set, the real app with the on-device model (cloud help off)

- date: 2026-11-16T22:58:15.199Z
- commit: `9ac4fd901134ff02ec1a41d0a52771159e733132` (working tree has uncommitted changes)
- set: `eval/heldout_r2.json`, 60 questions, sha256 `8d260a80d6d612e3dec9a4f9137d3c28d60a74934134056f8a02812fde92c83d`
- command: `node scripts/eval-heldout.mjs --port 9335`
- browser: Chrome/157.0.8103.52, attached on port 9335; status line: "Ready on this computer."
- app: http://localhost:5179/ (the dev server of this commit), judge mode

**What this is.** A labelled set of 60 partner questions with the card we expect for each. Written by the project authors on 16 Nov 2026, after the card rules were frozen at commit 64509da and before the first run of scripts/eval-heldout.mjs; no rule was changed after that run. The labels are ours. This is not a user trial and says nothing about people living with aphasia.

## Result

| Kind of question | Correct |
|---|---|
| either-or | 12/14 |
| yes-no | 10/10 |
| feeling | 8/8 |
| pain | 2/3 |
| body | 3/3 |
| memory | 3/4 |
| who | 6/6 |
| where | 5/6 |
| what | 6/6 |
| **questions the rules decide alone** (either-or, yes-no, feeling, pain, body, memory) | **38/42** |
| **open questions** (who, where, what), answered by the on-device model | **17/18** |
| **all** | **55/60** |

Open questions that got any card with two or more answers: 18/18. Cards for which the SDK reported `inferenceSource=on_device`: 27/60 (the rest ran no model). Requests to hosts other than the app's own during the run: none. Time from submit to card on the open questions: median 3301 ms, range 3096–3515 ms.

## Misses

- 8. (either-or) "Shall we ring Tyler or Jenny first?": answers: ring Tyler / Jenny first
- 11. (either-or) "Is it too hot or too cold in here?": answers: hot / cold in here
- 35. (pain) "How bad is your headache right now?": expected pain, got choice
- 42. (memory) "What did you have for breakfast?": expected no card (no-quiz), got choice with a card
- 53. (where) "Where should we go for a walk?": an answer that should not be offered: hardware store

## Every question

| # | Kind | Question | Card | Ran | Correct |
|---|---|---|---|---|---|
| 1 | either-or | Would you like toast or cereal? | choice: toast / cereal / [something else] | no model | yes |
| 2 | either-or | Shall I open the window or the door? | choice: window / door / [something else] | no model | yes |
| 3 | either-or | Do you want to sit inside or outside? | choice: inside / outside / [something else] | no model | yes |
| 4 | either-or | Should we go today or tomorrow? | choice: today / tomorrow / [something else] | no model | yes |
| 5 | either-or | Red jumper or the green one? | choice: Red jumper / green one / [something else] | no model | yes |
| 6 | either-or | Frank, do you want the big spoon or the small spoon? | choice: big spoon / small spoon / [something else] | private: on_device | yes |
| 7 | either-or | Do you want to watch Wheel of Fortune or the Packers game? | choice: Wheel of Fortune / Packers game / [something else] | private: on_device | yes |
| 8 | either-or | Shall we ring Tyler or Jenny first? | choice: ring Tyler / Jenny first / [someone else] | no model | no |
| 9 | either-or | Would you rather have a bath or a shower tonight? | choice: bath / shower / [something else] | private: on_device | yes |
| 10 | either-or | Do you want your tablets now or after lunch? | choice: now / after lunch / [something else] | private: on_device | yes |
| 11 | either-or | Is it too hot or too cold in here? | choice: hot / cold in here / [something else] | private: on_device | no |
| 12 | either-or | Shall I make chili, or would you rather have pot roast? | choice: chili / pot roast / [something else] | private: on_device | yes |
| 13 | either-or | Do you want me to drive, or shall we take the bus? | choice: drive / take the bus / [something else] | private: on_device | yes |
| 14 | either-or | Soup or a sandwich for lunch? | choice: Soup / sandwich / [something else] | no model | yes |
| 15 | yes-no | Are you cold? | yesno: yes / no / [not sure] | no model | yes |
| 16 | yes-no | Do you want the light off? | yesno: yes / no / [not sure] | no model | yes |
| 17 | yes-no | Is the telly too loud? | yesno: yes / no / [not sure] | no model | yes |
| 18 | yes-no | Did you sleep well? | yesno: yes / no / [not sure] | no model | yes |
| 19 | yes-no | Shall we go out or not? | yesno: yes / no / [not sure] | no model | yes |
| 20 | yes-no | Have you taken your tablets? | yesno: yes / no / [not sure] | no model | yes |
| 21 | yes-no | Can I get you a drink? | yesno: yes / no / [not sure] | no model | yes |
| 22 | yes-no | Would you like a blanket? | yesno: yes / no / [not sure] | no model | yes |
| 23 | yes-no | Are you tired, love? | yesno: yes / no / [not sure] | no model | yes |
| 24 | yes-no | Do you want Jenny to come on Sunday? | yesno: yes / no / [not sure] | no model | yes |
| 25 | feeling | How are you feeling this morning? | feeling: good / bad / [something else] | no model | yes |
| 26 | feeling | How was the physio? | feeling: good / bad / [something else] | no model | yes |
| 27 | feeling | How did you sleep? | feeling: good / bad / [something else] | no model | yes |
| 28 | feeling | How was your lunch? | feeling: tasty / plain / [something else] | no model | yes |
| 29 | feeling | How do you feel about moving the bed downstairs? | feeling: good / bad / [something else] | no model | yes |
| 30 | feeling | How was the visit with Tyler? | feeling: good / bad / [something else] | no model | yes |
| 31 | feeling | How's the new chair? | feeling: good / bad / [something else] | no model | yes |
| 32 | feeling | How was church today? | feeling: good / bad / [something else] | no model | yes |
| 33 | pain | How bad is the pain? | pain: a little / a lot / [something else] | no model | yes |
| 34 | pain | How much does it hurt? | pain: a little / a lot / [something else] | no model | yes |
| 35 | pain | How bad is your headache right now? | choice: a little / some / [something else] | private: on_device | no |
| 36 | body | Where is the pain? | body: head / chest / [somewhere else] | no model | yes |
| 37 | body | Where does it hurt today? | body: head / chest / [somewhere else] | no model | yes |
| 38 | body | Where is it sore? | body: head / chest / [somewhere else] | no model | yes |
| 39 | memory | What day is it today? | no card (no-quiz) | no model | yes |
| 40 | memory | Do you remember when Tyler was born? | no card (no-quiz) | no model | yes |
| 41 | memory | What's my name? | no card (no-quiz) | no model | yes |
| 42 | memory | What did you have for breakfast? | choice: cereal / toast / [something else] | private: on_device | no |
| 43 | who | Who do you want to ring this afternoon? | choice: Jenny / Tyler / [someone else] | private: on_device | yes |
| 44 | who | Who should we invite for Sunday dinner? | choice: Jenny / Tyler / [someone else] | private: on_device | yes |
| 45 | who | Who would you like to visit this week? | choice: Jenny / Tyler / [someone else] | private: on_device | yes |
| 46 | who | Who shall I text about the appointment? | choice: Jenny / Tyler / [someone else] | private: on_device | yes |
| 47 | who | Who do you want to sit with at the wedding? | choice: Tyler / Jenny / [someone else] | private: on_device | yes |
| 48 | who | Who should drive us on Friday? | choice: you / Jenny / [someone else] | private: on_device | yes |
| 49 | where | Where do you want to go this afternoon? | choice: the lake / church / [somewhere else] | private: on_device | yes |
| 50 | where | Where shall we go on Saturday? | choice: lake / church / [somewhere else] | private: on_device | yes |
| 51 | where | Where would you like to sit? | choice: couch / chair / [somewhere else] | private: on_device | yes |
| 52 | where | Where do you want to eat your dinner? | choice: pot roast / chili / [somewhere else] | private: on_device | yes |
| 53 | where | Where should we go for a walk? | choice: the lake / hardware store / [somewhere else] | private: on_device | no |
| 54 | where | Where would you like to go for your birthday? | choice: lake / church / [somewhere else] | private: on_device | yes |
| 55 | what | What would you like for supper? | choice: pot roast / chili / [something else] | private: on_device | yes |
| 56 | what | What do you want to watch tonight? | choice: Wheel of Fortune / Packers games / [something else] | private: on_device | yes |
| 57 | what | What music shall I put on? | choice: Johnny Cash / Wheel of Fortune / [something else] | private: on_device | yes |
| 58 | what | What do you want to do tomorrow morning? | choice: lake / church / [something else] | private: on_device | yes |
| 59 | what | What should we get Tyler for his birthday? | choice: book / games / [something else] | private: on_device | yes |
| 60 | what | What do you fancy for breakfast? | choice: cereal / toast / [something else] | private: on_device | yes |

## Limits

- The labels are the authors' own, written the same day as the last rule change; a second labeller has not checked them.
- One made-up family, two choices at a time, one answer per question; the model's answers vary between runs.
- "Correct" means the card matches the label, not that a person with aphasia could answer with it. The timed trial in `devlog/TRIAL_PROTOCOL.md` has not been run.
