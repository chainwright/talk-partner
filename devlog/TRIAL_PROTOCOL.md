# Timed trial: pad and marker vs Talk Partner card

Written 12 Nov 2026, before any session. This is the plan we commit to before running it. If we deviate, the deviation goes into the results file with the reason.

## 1. What it is, and what it is not

A small, timed comparison of two ways of asking the same questions: the partner writing choices on a pad with a marker (the supported-conversation "written choice" technique done by hand), and the partner using Talk Partner. Two or three partner/person pairs, ten questions per set, two sealed sets.

It is a **demonstration trial**: it shows how the two methods behave on real people in real time, and it gives one honest number for the write-up. It is **not evidence of clinical benefit**. With n = 2–3 pairs nothing here generalises, and we will say so wherever the number appears.

The pairs are volunteers. Unless a family living with aphasia joins (with their own consent, §7), the "person" role is played by a volunteer who answers only by pointing and nodding, never by speaking. That is a simulation of the interaction, not of aphasia, and the results file says which it was for every pair.

## 2. Conditions

| Condition | What the partner does | What the person does |
|---|---|---|
| **Pad** | Reads the question aloud, writes 2–3 choices on a paper pad with a black marker (large, one per line), underlines the key word, points to each as they read it, waits. | Points to a choice (or shakes head / points away for "none of these"). |
| **Card** | Types the question into Talk Partner, reads the "Say this" line aloud pointing to each tile on the person's screen, waits. The person's screen is the laptop turned round, or a second device in the same browser session. | Points to a tile, then to ✓ or ✗ on the "So: …?" check. |

Both conditions use the same questions, the same partner, the same person, the same room and the same timer.

In both conditions the partner may **not** suggest an answer the person did not point to. If they do, the question is logged as *guessed* (§5).

## 3. Question sets A and B, sealed

- Two sets of 10 questions, written by someone who is **not** one of the partners, in the register of a normal day at home (meals, people, feelings, body, plans, TV), one memory question per set so that both conditions meet the "tell, don't test" case.
- Each set is written to a file, and **the SHA-256 of each file is committed to this repository before the first session**. The files themselves are committed after the last session. Anyone can check that the questions were not changed between sealing and running.
- Nobody taking part sees a set before their session with it. Each pair sees each set once.
- Sets are not reused between pairs in the same condition order (§4), so a question is never "known" from an earlier run.

Sealing record (filled in before session 1):

| Set | File | SHA-256 | Sealed on (commit) |
|---|---|---|---|
| A | `devlog/trial/set_A.txt` | *(to fill)* | *(to fill)* |
| B | `devlog/trial/set_B.txt` | *(to fill)* | *(to fill)* |

## 4. Order (counterbalanced)

Two conditions × two sets. Each pair runs both conditions, each with a different set, and the order alternates so that practice and fatigue do not all fall on one condition:

| Pair | First block | Second block |
|---|---|---|
| 1 | Pad, set A | Card, set B |
| 2 | Card, set A | Pad, set B |
| 3 | Pad, set B | Card, set A |

Ten minutes' break between blocks. Before the Card block, the partner gets five minutes with Talk Partner on three practice questions that are in neither set, so the first timed question is not the first time they have used it. Before the Pad block, the same five minutes with the pad on the same three practice questions.

## 5. What is timed and what is logged

The operator (not the partner) runs the stopwatch in the app's hidden `#/trial` screen on a separate device. Nothing on the partner's screen is touched.

- **Start:** the moment the partner finishes asking the question aloud the first time (the operator presses *Asked*). In the Card condition this is after the card is on the person's screen and the "Say this" line has been read, so **the app's own time to make the card is included** in the Card time. We do not hide it.
- **Stop:** the moment the person's answer is confirmed. Pad: the partner says the choice back and the person nods. Card: the person presses ✓ on "So: …?" (or the partner confirms the same way if the person does not use the ✓).
- **Outcome**, one of: *confirmed* (an answer the person chose); *via way out* (the person chose "something else / someone else / not sure" and that was confirmed); *guessed* (the partner proposed or settled an answer the person did not point to, in either condition); *gave up* (no confirmed answer after 90 s, or the pair stopped).
- A memory question ("tell, don't test") is logged in both conditions: in Card the app refuses and the partner reads the statement instead; in Pad the partner does whatever they would normally do. Its time is logged but **excluded from the time medians** (§6), because no choice is being made; it is reported separately as a count of how often the partner quizzed.
- A short note per question is allowed (e.g. "repair ×2", "pad: wrote 4 choices").
- Nothing else is recorded. No audio, no video, no names. The log is the CSV from `#/trial` (`pair, condition, set, q, startedAt, seconds, outcome, note`), committed as `devlog/trial/results_raw.csv`.

The stopwatch resolution is 0.1 s; operator reaction time is in both conditions equally. We do not correct for it.

## 6. How results are reported (decided now)

In `devlog/trial/RESULTS.md`, after the last session, with the commit hash of the build used:

1. **The raw table**, every question of every pair, unedited. If an entry is excluded, the raw row stays and the exclusion is stated.
2. **Per pair, per condition:** median seconds to a confirmed answer (over *confirmed* and *via way out* outcomes); the number of *guessed* and *gave up* outcomes out of 10; the number of memory questions where the partner quizzed.
3. **Across pairs:** the median of the pair medians, and the range (min–max). No means, no standard deviations, no p-values, no confidence intervals: with 2–3 pairs they would be decoration.
4. **The one line for the write-up** is of this form, filled from the table and nothing else:
   > "In a 3-pair timed trial (volunteers, disclosed in `devlog/TRIAL_PROTOCOL.md`), the median time to a confirmed answer was X s with the pad and Y s with the card (pair medians X1–X3 and Y1–Y3); Z of 30 pad answers and W of 30 card answers were guessed by the partner."
   If the card is slower, that line says so unchanged.
5. **Caveats that always travel with the number:** n; whether the person was a volunteer or someone living with aphasia; that the partner's typing speed is inside the Card time; that the operator and the authors are the same people; that the pairs knew which condition they were in (there is no way to blind it).
6. **Exclusions decided in advance:** a question is excluded from the time medians only if (a) it is the memory question, (b) the app failed to produce any card and the partner could not continue (logged as *gave up* and counted as such), or (c) the session was interrupted from outside (phone call, someone entering), in which case that question is re-run at the end of the block and the note says so. Nothing else is excluded.

## 7. Consent (read aloud and given on paper; the person keeps a copy)

> We are trying out two ways of asking everyday questions: writing choices on a pad, and an app called Talk Partner that shows choices on a screen. We would like you to take part for about 40 minutes.
>
> We will time how long each question takes and write down which choice was pointed to. That is all we record: no recording of sound or video, no names. In the results you are "Pair 1", "Pair 2" or "Pair 3".
>
> This is not therapy and not a test of you. It is a trial of the two methods, for a software competition entry, and the results will be published in the project's public repository with the raw times.
>
> You can stop at any time, for any reason, without saying why, and you can ask for your times to be left out afterwards. If anything is uncomfortable we stop.
>
> If you live with aphasia: we will use the app's own sample family unless you want your own names and favourites in it; if you do, they stay on this computer and are deleted after the session, and you can watch us delete them.
>
> Do you agree to take part?  ☐ Yes    Name (kept off the results): __________   Date: ______

Both people in a pair consent separately. For a person with aphasia, consent is taken with the same written-choice technique (yes / no / not sure, pointed to), with a family member present, and only proceeds on a clear yes.

## 8. Stop rules

Stop the block, no questions asked, if: the person shows distress or tiredness; the partner asks to stop; the app fails twice in a row; or the session passes 60 minutes. Log what was completed; nothing is dropped from the raw table.

## 9. Materials checklist

Pad (A4, plain), black marker, the printed sets (one copy each, sealed in envelopes until the block starts), the printed consent forms, a laptop with the build at a tagged commit, a second device opened at `#/trial`, a quiet table, water. The build's `npm run check` must be green at that commit and the commit hash written at the top of the results file.
