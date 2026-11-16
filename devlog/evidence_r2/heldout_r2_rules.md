# Held-out set, rules alone (no model, no network)

- date: 2026-11-16T22:56:14.620Z
- commit: `9ac4fd901134ff02ec1a41d0a52771159e733132` (clean working tree)
- set: `eval/heldout_r2.json`, 60 questions, sha256 `8d260a80d6d612e3dec9a4f9137d3c28d60a74934134056f8a02812fde92c83d`
- command: `node scripts/eval-heldout.mjs`

**What this is.** A labelled set of 60 partner questions with the card we expect for each. Written by the project authors on 16 Nov 2026, after the card rules were frozen at commit 64509da and before the first run of scripts/eval-heldout.mjs; no rule was changed after that run. The labels are ours. This is not a user trial and says nothing about people living with aphasia.

## Result

| Kind of question | Correct |
|---|---|
| either-or | 10/14 |
| yes-no | 10/10 |
| feeling | 8/8 |
| pain | 2/3 |
| body | 3/3 |
| memory | 3/4 |
| who (open: correct = no card, passed on to a model) | 6/6 |
| where (open: correct = no card, passed on to a model) | 6/6 |
| what (open: correct = no card, passed on to a model) | 6/6 |
| **questions the rules decide alone** (either-or, yes-no, feeling, pain, body, memory) | **36/42** |
| **open questions** (who, where, what): no card made, passed on | **18/18** |
| **all** | **54/60** |

## Misses

- 8. (either-or) "Shall we ring Tyler or Jenny first?": answers: ring Tyler / Jenny first
- 10. (either-or) "Do you want your tablets now or after lunch?": no card
- 11. (either-or) "Is it too hot or too cold in here?": answers: hot / cold in here
- 12. (either-or) "Shall I make chili, or would you rather have pot roast?": answers: make chili / pot roast
- 35. (pain) "How bad is your headache right now?": no card
- 42. (memory) "What did you have for breakfast?": expected no card (no-quiz), got choice

## Every question

| # | Kind | Question | Card | Correct |
|---|---|---|---|---|
| 1 | either-or | Would you like toast or cereal? | choice: toast / cereal / [something else] | yes |
| 2 | either-or | Shall I open the window or the door? | choice: window / door / [something else] | yes |
| 3 | either-or | Do you want to sit inside or outside? | choice: inside / outside / [something else] | yes |
| 4 | either-or | Should we go today or tomorrow? | choice: today / tomorrow / [something else] | yes |
| 5 | either-or | Red jumper or the green one? | choice: Red jumper / green one / [something else] | yes |
| 6 | either-or | Frank, do you want the big spoon or the small spoon? | choice: big spoon / small spoon / [something else] | yes |
| 7 | either-or | Do you want to watch Wheel of Fortune or the Packers game? | choice: Wheel of Fortune / Packers game / [something else] | yes |
| 8 | either-or | Shall we ring Tyler or Jenny first? | choice: ring Tyler / Jenny first / [someone else] | no |
| 9 | either-or | Would you rather have a bath or a shower tonight? | choice: bath / shower / [something else] | yes |
| 10 | either-or | Do you want your tablets now or after lunch? | no card (choice) | no |
| 11 | either-or | Is it too hot or too cold in here? | choice: hot / cold in here / [something else] | no |
| 12 | either-or | Shall I make chili, or would you rather have pot roast? | choice: make chili / pot roast / [something else] | no |
| 13 | either-or | Do you want me to drive, or shall we take the bus? | choice: drive / take the bus / [something else] | yes |
| 14 | either-or | Soup or a sandwich for lunch? | choice: Soup / sandwich / [something else] | yes |
| 15 | yes-no | Are you cold? | yesno: yes / no / [not sure] | yes |
| 16 | yes-no | Do you want the light off? | yesno: yes / no / [not sure] | yes |
| 17 | yes-no | Is the telly too loud? | yesno: yes / no / [not sure] | yes |
| 18 | yes-no | Did you sleep well? | yesno: yes / no / [not sure] | yes |
| 19 | yes-no | Shall we go out or not? | yesno: yes / no / [not sure] | yes |
| 20 | yes-no | Have you taken your tablets? | yesno: yes / no / [not sure] | yes |
| 21 | yes-no | Can I get you a drink? | yesno: yes / no / [not sure] | yes |
| 22 | yes-no | Would you like a blanket? | yesno: yes / no / [not sure] | yes |
| 23 | yes-no | Are you tired, love? | yesno: yes / no / [not sure] | yes |
| 24 | yes-no | Do you want Jenny to come on Sunday? | yesno: yes / no / [not sure] | yes |
| 25 | feeling | How are you feeling this morning? | feeling: good / bad / [something else] | yes |
| 26 | feeling | How was the physio? | feeling: good / bad / [something else] | yes |
| 27 | feeling | How did you sleep? | feeling: good / bad / [something else] | yes |
| 28 | feeling | How was your lunch? | feeling: tasty / plain / [something else] | yes |
| 29 | feeling | How do you feel about moving the bed downstairs? | feeling: good / bad / [something else] | yes |
| 30 | feeling | How was the visit with Tyler? | feeling: good / bad / [something else] | yes |
| 31 | feeling | How's the new chair? | feeling: good / bad / [something else] | yes |
| 32 | feeling | How was church today? | feeling: good / bad / [something else] | yes |
| 33 | pain | How bad is the pain? | pain: a little / a lot / [something else] | yes |
| 34 | pain | How much does it hurt? | pain: a little / a lot / [something else] | yes |
| 35 | pain | How bad is your headache right now? | no card (choice) | no |
| 36 | body | Where is the pain? | body: head / chest / [somewhere else] | yes |
| 37 | body | Where does it hurt today? | body: head / chest / [somewhere else] | yes |
| 38 | body | Where is it sore? | body: head / chest / [somewhere else] | yes |
| 39 | memory | What day is it today? | no card (no-quiz) | yes |
| 40 | memory | Do you remember when Tyler was born? | no card (no-quiz) | yes |
| 41 | memory | What's my name? | no card (no-quiz) | yes |
| 42 | memory | What did you have for breakfast? | no card (choice) | no |
| 43 | who | Who do you want to ring this afternoon? | no card (choice) | yes |
| 44 | who | Who should we invite for Sunday dinner? | no card (choice) | yes |
| 45 | who | Who would you like to visit this week? | no card (choice) | yes |
| 46 | who | Who shall I text about the appointment? | no card (choice) | yes |
| 47 | who | Who do you want to sit with at the wedding? | no card (choice) | yes |
| 48 | who | Who should drive us on Friday? | no card (choice) | yes |
| 49 | where | Where do you want to go this afternoon? | no card (choice) | yes |
| 50 | where | Where shall we go on Saturday? | no card (choice) | yes |
| 51 | where | Where would you like to sit? | no card (choice) | yes |
| 52 | where | Where do you want to eat your dinner? | no card (choice) | yes |
| 53 | where | Where should we go for a walk? | no card (choice) | yes |
| 54 | where | Where would you like to go for your birthday? | no card (choice) | yes |
| 55 | what | What would you like for supper? | no card (choice) | yes |
| 56 | what | What do you want to watch tonight? | no card (choice) | yes |
| 57 | what | What music shall I put on? | no card (choice) | yes |
| 58 | what | What do you want to do tomorrow morning? | no card (choice) | yes |
| 59 | what | What should we get Tyler for his birthday? | no card (choice) | yes |
| 60 | what | What do you fancy for breakfast? | no card (choice) | yes |

## Limits

- The labels are the authors' own, written the same day as the last rule change; a second labeller has not checked them.
- One made-up family, two choices at a time, one answer per question; the model's answers vary between runs.
- "Correct" means the card matches the label, not that a person with aphasia could answer with it. The timed trial in `devlog/TRIAL_PROTOCOL.md` has not been run.
