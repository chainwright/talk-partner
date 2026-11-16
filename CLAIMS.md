# Claims

Every claim we make about Talk Partner in the README, on screen or in the submission notes, with its status on
16 Nov 2026 at commit `161c491`. **True** = you can reproduce it from a clone. **True, recorded** = it needs our project
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
| 9 | "What was sent" and the privacy receipt show the exact request and count its bytes | True | The count is of the request body the app built. The SDK's transport around it (headers, App Check token) is not counted |
| 10 | The model only proposes; code decides, and "Why this card" shows what was kept, added and dropped, with the rule | True | |
| 11 | The app corrects the partner, never the person: two questions in one, a memory test | Partial | On our labelled set the memory rule missed 1 of 4 ("What did you have for breakfast?" got a choice card) |
| 12 | A memory question never becomes a quiz | Partial | Same miss as row 11. The rule matches by structure and does not catch every recall question |
| 13 | With cloud help only, a "who to call" card offers the people About me names; the cloud gets no name, no label and no count of people | Partial | The names are put in by code on this computer after the cloud answers. When the cloud offers a specific role ("doctor"), it keeps a place and one About-me person may be left off (seen in the run of 16 Nov) |
| 14 | A third good choice is not dropped at two a card: it waits on a next page | True | Applies to open cards; an either-or card always shows exactly the two options asked |
| 15 | On a phone the person's card comes right after the buttons | Partial | In judge mode at 390 × 844 the card starts at 806 px and ends at 1176 px: its top edge is in the first screen, the tiles in the second. It was at 3714 px. "Show to person" (full screen) is the intended way to show it |
| 16 | 55 of 60 cards matched the label with the on-device model; 54 of 60 with rules alone | Partial | Our own questions and labels, written the day of the last rule change; one run; one family. Reading the cards, we would overturn two of the 55 (53 of 60). It measures "the card we meant", not benefit to anyone |
| 17 | Confirmed answers are kept on this computer and never reach a model | True | Checked by import and call-site tests, not by a network capture of every path |
| 18 | The look-alikes named in the README do something different | Partial | Read on their public pages on 11 Nov 2026. It is what we found, not proof that nothing else exists |
| 19 | About 2 million people in the United States live with aphasia; fewer than 3% of sampled therapy goals involved partner training | True | Both read at the source on 16 Nov 2026. The second is a survey of clinicians' goals, not a count of families |
| 20 | Based on Supported Conversation for Adults with Aphasia (SCA) principles | Partial | Our reading of published SCA materials. We have no review or endorsement to cite, from the Aphasia Institute or from a speech-language pathologist |

## Not claimed
- That Talk Partner helps people with aphasia or their partners. No one living with aphasia has used it. The timed
  trial in `devlog/TRIAL_PROTOCOL.md` has not been run.
- That it is a therapy, a diagnosis or a medical device.
- That the on-device cards are good. The recorded runs show the path works and what it returned; five misses and two
  doubtful cards on our own set are listed in `devlog/evidence_r2/heldout_r2_NOTES.md`.
- That a judge can try the AI steps today without setup: there is no hosted URL, and App Check uses a debug token on
  localhost only.
- Any number from the 9–10 Nov prototype (16 of 50, 39 of 50) as a result of this build. They are in the README as the
  reason for one design cut and are marked as pre-period.
- Image generation, text-to-speech, sync between two devices, Android or iOS. The pictures step is defined and unused.
