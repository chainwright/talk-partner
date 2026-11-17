# Held-out set, the real app with the on-device model (cloud help off)

- date: 2026-11-17T00:00:27.251Z
- commit: `8ca45b5cdc7a8df0fa560a64e66a294e2cd3d408` (clean working tree when the run started)
- set: `eval/heldout_r2.json`, 60 questions, sha256 `8d260a80d6d612e3dec9a4f9137d3c28d60a74934134056f8a02812fde92c83d`
- label amendments (stricter, written after the first runs): `eval/heldout_r2_amendments.json`, questions 52, 57, sha256 `532d73ebcaf5ab75212889987dbb77e072281b0d59543a2c7caf005bea9be27d`
- command: `node scripts/eval-heldout.mjs --port 9335`
- browser: Chrome/157.0.8103.52, attached on port 9335; status line: "Ready on this computer."
- app: http://localhost:5179/ (the dev server of this commit), judge mode

**What this is.** A labelled set of 60 partner questions with the card we expect for each. Written by the project authors on 16 Nov 2026, after the card rules were frozen at commit 64509da and before the first run of scripts/eval-heldout.mjs; no rule was changed after that run. The labels are ours. This is not a user trial and says nothing about people living with aphasia.

## Result

### Open questions (who, where, what): 18 of the 60

These are the questions the rules cannot answer: the choices are not in the question. A model is needed, and the family's own names, places and foods are only in About me, which only the on-device step sees.

| On the 18 open questions | On-device model (this run) |
|---|---|
| a card with two or more answers was made | 18/18 |
| the card matched our label | **16/18** |
| the card matched our label and offers the family's own entries from About me (a personal card) | **13/18** |
| of the 8 questions whose label asks for About-me answers: the card gave them | 7/8 |
| a card was made and it is wrong by our label | 2/18 |
| no card: the partner is told to ask normally | 0/18 |

With the labels as first sealed (before the amendments to questions 52 and 57), 18/18 open cards would have matched.

### Questions the rules decide alone (either-or, yes-no, feeling, pain, body, memory): 42 of the 60

| Kind of question | Matched our label |
|---|---|
| either-or | 11/14 |
| yes-no | 10/10 |
| feeling | 8/8 |
| pain | 2/3 |
| body | 3/3 |
| memory | 3/4 |
| **all 42** | **37/42** |

### By kind, open questions

| Kind of question | Card matched our label |
|---|---|
| who | 6/6 |
| where | 5/6 |
| what | 5/6 |

**Cards (or, for a memory question, the "tell, don't test" line) matching our label, all 60 questions: 53/60** (37/42 where the rules decide, 16/18 open).

Cards for which the SDK reported `inferenceSource=on_device`: 27/60 (the rest ran no model). Requests to hosts other than the app's own during the run: none. Time from submit to card on the open questions: median 3296 ms, range 3091–3502 ms.

## Misses

- 8. (either-or) "Shall we ring Tyler or Jenny first?": answers: ring Tyler / Jenny first
- 11. (either-or) "Is it too hot or too cold in here?": answers: hot / cold in here
- 12. (either-or) "Shall I make chili, or would you rather have pot roast?": answers: make chili / pot roast
- 35. (pain) "How bad is your headache right now?": expected pain, got choice
- 42. (memory) "What did you have for breakfast?": expected no card (no-quiz), got choice with a card
- 52. (where) "Where do you want to eat your dinner?": an answer that should not be offered: pot roast, chili
- 57. (what) "What music shall I put on?": an answer that should not be offered: Packers

## Every question

| # | Kind | Question | Card | Ran | Matched |
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
| 12 | either-or | Shall I make chili, or would you rather have pot roast? | choice: make chili / pot roast / [something else] | private: on_device | no |
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
| 47 | who | Who do you want to sit with at the wedding? | choice: Jenny / Tyler / [someone else] | private: on_device | yes |
| 48 | who | Who should drive us on Friday? | choice: you / Jenny / [someone else] | private: on_device | yes |
| 49 | where | Where do you want to go this afternoon? | choice: lake / church / [somewhere else] | private: on_device | yes |
| 50 | where | Where shall we go on Saturday? | choice: the lake / church / [somewhere else] | private: on_device | yes |
| 51 | where | Where would you like to sit? | choice: chair / couch / [somewhere else] | private: on_device | yes |
| 52 | where | Where do you want to eat your dinner? | choice: pot roast / chili / [somewhere else] | private: on_device | no |
| 53 | where | Where should we go for a walk? | choice: the lake / church / [somewhere else] | private: on_device | yes |
| 54 | where | Where would you like to go for your birthday? | choice: lake / church / [somewhere else] | private: on_device | yes |
| 55 | what | What would you like for supper? | choice: pot roast / chili / [something else] | private: on_device | yes |
| 56 | what | What do you want to watch tonight? | choice: Wheel of Fortune / Packers games / [something else] | private: on_device | yes |
| 57 | what | What music shall I put on? | choice: Johnny Cash / Packers / [something else] | private: on_device | no |
| 58 | what | What do you want to do tomorrow morning? | choice: lake / church / [something else] | private: on_device | yes |
| 59 | what | What should we get Tyler for his birthday? | choice: book / game / [something else] | private: on_device | yes |
| 60 | what | What do you fancy for breakfast? | choice: cereal / eggs / [something else] | private: on_device | yes |

## Limits

- The labels are the authors' own, written the same day as the last rule change; a second labeller has not checked them. Two were made stricter after reading the first runs.
- One made-up family, two choices at a time, one answer per question; the model's answers vary between runs, so the open-question counts move by one or two from run to run.
- "Matched" means the card matches the label, not that a person with aphasia could answer with it. The timed trial in `devlog/TRIAL_PROTOCOL.md` has not been run.
