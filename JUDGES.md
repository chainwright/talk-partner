Repository: <https://github.com/chainwright/talk-partner> (public, Apache-2.0)

# For judges: the 60-second path

Nothing here needs an account. Hosted copy: <https://talk-partner.web.app/#/demo> (our project settings are in it, so
cloud help works there once you turn it on; the on-device step needs Gemini Nano in your own Chrome). Or from a clone:

```
npm install && npm run dev        # then open http://localhost:5179/#/demo
```

`#/demo` loads a made-up family (Frank; his wife Carol is asking) and opens with one card already made: "Do you want
coffee or tea?", read in code, with no model and nothing sent. It is there so the first frame shows what the person
sees; it is not the AI part.

**What happens next depends on your browser, and the status line at the top says which.** In desktop Chrome with
Gemini Nano the first step runs by itself, with no click: when the model has loaded (a few seconds; 16 to 22 s
right after the browser starts, in the four starts we timed) the app asks "What do you want to do this weekend?" and the model on this computer
makes the card from the family's About me: *lake / church / something else*, badge **On this computer**, taken from
the SDK's `inferenceSource`. Nothing is sent, and this step is made with cloud help left out whatever the setting.

**Without the model nothing runs by itself, and the status line says which of two cases you are in:**

| Your browser | The status line reads |
|---|---|
| desktop Chrome that could run Gemini Nano but has not downloaded it (the usual case) | "Gemini Nano is not downloaded in this browser, so the on-device step can't run yet. The card shown is made in code. Download (several GB, once)" |
| any other browser, or a computer that cannot run the model | "No Gemini Nano in this browser, so the on-device step can't run here. The card shown is made in code." |

In both cases the line under it ("Sample family: …") ends with **See what the on-device step makes →**. It opens a
recording of that step from our machine, in a dashed frame tagged "Recording": the weekend question answered
*lake / church* on 17 Nov 2026, with the SDK's console line (`inferenceSource=on_device`). It is a recording, not a
card made in your browser: nothing runs for it and nothing is sent. The cloud step you can run yourself, right there:
turn on cloud help (you read what is sent and tick a box first) and ask the same question.

Under the question box are one-tap questions. The first two are open questions: the choices are not in the question,
so a model has to propose them. They are where the two steps of the hybrid give different cards.

| Second | Do | You should see |
|---|---|---|
| 0–15 | with Gemini Nano: watch the first step run by itself; without it: click **See what the on-device step makes →** (a recording), then **this weekend?** | depends on your copy, see the table below. With Gemini Nano: *lake / church / something else*, badge **On this computer**, "nothing left this computer · lake, church from About me". The places are the family's own, read on this computer |
| 15–25 | click **for dinner?** | with Gemini Nano: *pot roast / chili / something else*, the family's own foods, nothing sent |
| any time | look at the figure under the chips | "0 bytes left this computer" until a cloud request is made; after one, the size of what the app handed to cloud help. The same count as the privacy receipt below the card |
| 25–35 | click the line **How this card was made: …** under the card (it opens **Why this card**, **Where each step ran** and **What was sent**) | the line itself says who decided and how many choices code kept, added and dropped; opened, one line: what the model proposed, what code kept, added and dropped and by which rule; and which step ran where, from the SDK's `inferenceSource` |
| 35–45 | click **therapy today, and did you eat?** | the app corrects the partner, not the person: "One thing at a time: showing the first." A feeling scale; **Next: second question** gives yes / no. No AI |
| 45–60 | click **what year did we marry?**, then **coffee or tea?** | no card for the first: "You know this one: tell, don't test", and a sentence to say instead. The second is read in code: *drink*, coffee, tea, something else, badge **No AI needed · nothing left this computer** |

**Two things outside the AI part, both added on 17 Nov** (`CLAIMS.md` rows 40 and 41; nobody they are for has tried
them yet):
- **Quick needs** (top bar): one tap puts a fixed board on the person's screen: toilet, drink, food, pain, tired,
  too hot, too cold, call someone, something else, each a picture and its word. Tap one: "So: toilet. Right?" with a
  tick and a cross. Press and hold the cross (top right) to come back: the partner's side has one short line for that need. No model,
  nothing sent; switch your network off after the page has loaded and it still works.
- **The microphone** next to the question field (browsers with speech recognition only): the first press tells you
  where the sound goes, and it is not "on this computer": it is your browser's speech recognition, which in Chrome
  may be Google's. After a yes, your question is typed into the field as you speak and waits there for "Make card".
  It is for the partner's question only; the person's speech is never recognised. It is not part of the hybrid
  inference and makes no card.

**What your copy can do.** Be sure which one you have before you judge the AI part:

| Your copy | "this weekend?" and "for dinner?" show |
|---|---|
| a bare clone, no `.env.local` | "No card", with the reason. Rows 3 to 5 of the table above work. This is expected, not a fault |
| `.env.local` with a Firebase web config, a browser without Gemini Nano | "No card" and an offer of cloud help. Turn it on (top bar → read, tick, **Turn on cloud help**), ask again: the cloud gets the bare question and has never seen About me, so the choices are general (*stay home / go out*, *meat / fish* in our recorded runs; the words vary). Badge **Cloud help (question only)**; **What was sent** shows the question as it went and the size of the request; "Show the exact request" opens the request the app handed to the SDK |
| the same, in desktop Chrome with Gemini Nano downloaded | the private step runs on this computer with the About-me lists: *lake / church*, *pot roast / chili*. Nothing is sent |

The second and third rows are the same question answered by the two steps: general choices from the cloud, the
family's own from this computer. On our labelled set of 60 questions, 18 are open like these: rules alone make no card
for any of them, and the on-device step made a matching card for 16 of them in each of three runs at commit `c346d3d`
(17 Nov), 13 of them with the family's own entries (`devlog/evidence_r8/heldout_at_c346d3d/`; our labels, not a trial
with people, and the rules have been changed since the questions were written, so it is not a held-out set).

**who to call tonight?** (the third chip) reads *Jenny / Tyler* with either step: with cloud help only, the cloud says
"family / a friend" and code on this computer puts in the people About me names. It is a rule doing the work there,
so we do not open the path on it.

We cannot give you the third row without the model on your machine, and the second needs our project settings, which
are not in the repository. What we recorded on ours, with the SDK's own report per call and screenshots:
`devlog/evidence_r8/final/ondevice/RUN_LOG.md` (43 checks; section 1b is the first step running by itself, section 5
has the same two questions answered by the cloud alone); the same run against the hosted copy,
`devlog/evidence_live/ondevice_live_2026-11-17_deebc94/RUN_LOG.md` (43 checks); and, earlier,
`devlog/ondevice_proof_1/RUN_LOG.md`.

**If you have five minutes more**
- `npm run check` (lint, types, 1770 unit tests) and `npm run e2e:noconfig` (a real browser on a copy with no settings; 25 checks, the quick-needs board with the network switched off among them).
- `npm run eval`: the labelled set of 60 questions against the rules alone (it writes its report to a new folder under
  `devlog/eval_runs/`): 40 of 42 code-decided questions, 0 of 18 open. What the on-device model adds on the 18 open
  questions: `devlog/evidence_r8/heldout_at_c346d3d/` (three runs); our reading of the cards of the first runs:
  `devlog/evidence_r2/heldout_r2_NOTES.md`.
- `CLAIMS.md`: every claim we make, with its status. `EVIDENCE.md`: where each one is proved.
- `DISCLOSURE.md`: what existed before the contest period.

**What is not here yet:** a video, and any trial with people.
