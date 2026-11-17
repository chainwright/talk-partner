# Claims

Every claim we make about Talk Partner in the README, on screen or in the submission notes, with its status on
16 Nov 2026 at commit `43c5265` (the last commit that changes code or on-screen text; `EVIDENCE.md` says where the
runs made at it are saved). **True** = you can reproduce it from a clone. **True, recorded** = it needs our project
settings or the on-device model, so we give the saved run instead. **Partial** = true with a limit, stated. **Not
claimed** = things we are sometimes assumed to claim and do not. Proof for each row is in `EVIDENCE.md` under the same
number.

| # | Claim | Status | The limit, if any |
|---|---|---|---|
| 1 | The partner's own question becomes a written-choice card: a headline, two or three choices, exactly one way out, a tick / cross check, and the line to say | True | |
| 2 | Yes / no, plain either-or, feeling, pain, body-map and memory questions are decided by code; no model runs | True | A longer either-or asks the on-device model to copy the two options; if its copy fails the check, the pair read in code is used |
| 3 | A bare clone with no settings makes all of those cards and contacts no host but its own | True | Open questions get "No card" there |
| 4 | All AI inference goes through Firebase AI Logic; there is no direct model call | True | One availability probe of Chrome's model (no inference) is direct; the SDK has no public call for it |
| 5 | The on-device step (`ONLY_ON_DEVICE`, Gemini Nano) answers open questions with the family's own names and places, and nothing is sent | True, recorded | One machine, one made-up family. The model's choices vary between runs |
| 6 | The cloud step (`PREFER_IN_CLOUD`) gets the question only, with About-me words swapped for labels ("Person A") | True, recorded | The swap covers About-me entries, relation words and capitalised unknown names in mid-sentence. A lowercase name, a name that starts a sentence, a health detail or an address goes as typed; the consent screen says so |
| 7 | With the network off, the cloud step falls back to the device and nothing leaves | True, recorded | Needs Gemini Nano in that Chrome; without it there is no card |
| 8 | The AI badges come from the SDK's `inferenceSource`, not from what we expected to happen | True | |
| 9 | "What was sent" and the privacy receipt show the request this app handed to the SDK for the cloud step, and count its bytes. By default "What was sent" is one line (the question after the swap) and the size; the exact request is one click further | True | It is the app's own record of the request (question after the swap, fixed instructions, schema, model name and mode), not a capture of the wire. The SDK's format and transport (headers, App Check token) are not counted |
| 10 | The model only proposes; code decides, and "Why this card" shows what was kept, added and dropped, with the rule | True | |
| 11 | The app corrects the partner, never the person: two questions in one, a memory test. On screen this is the opening line: "It corrects how you ask. It never answers for them." | Partial | It corrects only where a rule can tell (two questions in one, a memory test, options that are not on the screen); most questions need no correction and get none. On our labelled set the memory rule missed 1 of 4 ("What did you have for breakfast?" got a choice card). "Never answers": no code picks or confirms a choice, only a tap on the card does; the choices themselves are proposed by a model or read from the question |
| 12 | A memory question never becomes a quiz | Partial | Same miss as row 11. The rule matches by structure and does not catch every recall question |
| 13 | With cloud help only, a "who to call" card offers the people About me names; the cloud gets no name, no label and no count of people | Partial | The names are put in by code on this computer after the cloud answers. When the cloud offers a specific role ("doctor"), it keeps a place and one About-me person may be left off (seen in the run of 16 Nov) |
| 14 | A third good choice is not dropped at two a card: it waits on a next page | True | Applies to open cards; an either-or card always shows exactly the two options asked |
| 15 | On a phone the person's card comes right after the buttons and starts in the first screen | Partial | In judge mode at 390 × 844, once a card is made, the card and its headline start above the fold, also on the tallest partner side (a two-question card with its coaching line; `scripts/shots.mjs` checks it). The tiles are in the second screen. "Show to person" (full screen) is the intended way to show it |
| 16 | On the 18 open questions of our labelled set, rules alone make no card (0 of 18); the on-device model made a card matching our label for 15 or 16 of 18, 12 or 13 of them with the family's own About-me entries | True, recorded | Our own questions and labels, written the day of the last rule change; one made-up family; four runs on 16 Nov (16, 16, 16, 15), and the model's answers vary. Two labels were made stricter after the first run (questions 52 and 57, both now misses). On the other 42 questions code decides and 36 to 38 matched. It measures "the card we meant", not benefit to anyone |
| 17 | Confirmed answers are kept on this computer and never reach a model | True | Checked by import and call-site tests, not by a network capture of every path |
| 18 | The look-alikes named in the README do something different | Partial | Read on their public pages on 11 Nov 2026. It is what we found, not proof that nothing else exists |
| 19 | About 2 million people in the United States live with aphasia; fewer than 3% of sampled therapy goals involved partner training | True | Both read at the source on 16 Nov 2026. The second is a survey of clinicians' goals, not a count of families |
| 20 | Based on Supported Conversation for Adults with Aphasia (SCA) principles | Partial | Our reading of published SCA materials. We have no review or endorsement to cite, from the Aphasia Institute or from a speech-language pathologist |
| 21 | Judge mode opens with one card already on screen ("Do you want coffee or tea?"), made in code: no model runs and nothing is sent, on any copy | True | It is a code-decided card, shown first so the screen is not empty. It does not show the on-device or the cloud step; the first two chips do |
| 22 | The figure under the chips reads "0 bytes left this computer" until a cloud request is handed to the SDK | True | It is this session's count for the cards made, from the same record as the receipt (row 9). Loading the page is not counted: on localhost nothing leaves at all; a hosted copy would fetch its own files. After a cloud answer it shows the bytes the app handed over, not the wire size; a failed request shows as "may have left" |
| 23 | Outside judge mode the partner screen offers the questions answered most often as one-tap chips above the question field | True | Up to three, from the confirmed answers kept on this computer; none before the first confirmed answer. A chip carries the question, never an answer; a tap asks it again through the same pipeline as a typed question. Not shown in judge mode |

## Not claimed
- That Talk Partner helps people with aphasia or their partners. No one living with aphasia has used it. The timed
  trial in `devlog/TRIAL_PROTOCOL.md` has not been run.
- That it is a therapy, a diagnosis or a medical device.
- That the on-device cards are good. The recorded runs show the path works and what it returned; the misses on our own set, two
  wrong open cards among them, are listed in `devlog/evidence_r2/heldout_r2_NOTES.md`.
- That a judge can try the AI steps today without setup: there is no hosted URL, and App Check uses a debug token on
  localhost only.
- Any number from the 9–10 Nov prototype (16 of 50, 39 of 50) as a result of this build. They are in the README as the
  reason for one design cut and are marked as pre-period.
- Image generation, text-to-speech, sync between two devices, Android or iOS. The pictures step is defined and unused.
