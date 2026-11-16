# For judges: the 60-second path

Nothing here needs an account. There is no hosted URL yet, so this path starts from a clone.

```
npm install && npm run dev        # then open http://localhost:5179/#/demo
```

`#/demo` loads a made-up family (Frank; his wife Carol is asking). Under the question box are one-tap questions.

| Second | Do | You should see |
|---|---|---|
| 0–10 | click **coffee or tea?** | the card on the right (on a phone: right under the buttons): *drink*, coffee, tea, something else. Badge **No AI needed · nothing left this computer**. The line to say is above it |
| 10–20 | click **therapy today, and did you eat?** | the app corrects the partner, not the person: "One thing at a time: showing the first." A feeling scale; **Next: second question** gives yes / no |
| 20–30 | click **what year did we marry?** | no card. "You know this one: tell, don't test", and a sentence to say instead |
| 30–45 | click **who to call tonight?** | depends on the copy, see below. With Gemini Nano: *Jenny / Tyler / someone else*, badge **On this computer**, "nothing left this computer · Jenny, Tyler from About me". Carol lives there, so she is not offered |
| 45–60 | open **Why this card** and **Where each step ran** under the card | one line: what the model proposed, what code kept, added and dropped and by which rule; and which step ran where, from the SDK's `inferenceSource` |

**What your copy can do.** Be sure which one you have before you judge the AI part:

| Your copy | "who to call tonight?" shows |
|---|---|
| a bare clone, no `.env.local` | "No card", with the reason. Every other row of the table above works. This is expected, not a fault |
| `.env.local` with a Firebase web config, any browser | "No card" and an offer of cloud help. Turn it on (top bar → read, tick, **Turn on cloud help**), ask again: the cloud gets the bare question, and code on this computer puts in the people About me names (for example *Jenny / Tyler*; the cloud's own answer varies, see `devlog/evidence_r2/at_head_2/e2e-cloud.txt`). **What was sent** shows the exact request |
| the same, in desktop Chrome with Gemini Nano downloaded | the private step runs on this computer with the About-me lists. Nothing is sent |

We cannot give you the third row without the model on your machine, and the second needs our project settings, which
are not in the repository. What we recorded on ours, with the SDK's own report per call and screenshots:
`devlog/evidence_r2/at_head_2/ondevice/RUN_LOG.md` (33 checks) and `devlog/ondevice_proof_1/RUN_LOG.md`.

**If you have five minutes more**
- `npm run check` (lint, types, 922 unit tests) and `npm run e2e:noconfig` (a real browser on a copy with no settings).
- `npm run eval`: the labelled set of 60 questions against the rules alone. Result and our reading of it:
  `devlog/evidence_r2/heldout_r2_NOTES.md`.
- `CLAIMS.md`: every claim we make, with its status. `EVIDENCE.md`: where each one is proved.
- `DISCLOSURE.md`: what existed before the contest period.

**What is not here yet:** a hosted URL, a production App Check provider, a video, and any trial with people.
