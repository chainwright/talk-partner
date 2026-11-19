Repository: <https://github.com/chainwright/talk-partner> (public, Apache-2.0)

# For judges: the 60-second path

**Live: the build of `8a8eaf7`** (README "Deploy" says what was run against it).

Nothing here needs an account. Hosted copy: <https://talk-partner.web.app/#/demo> (our project settings are in it, so
cloud help can be turned on there; the on-device step needs Gemini Nano in your own Chrome). **Cloud help there may
give no card:** it needs App Check to accept your browser, and on the evening of 17 Nov it refused ours (the card
then reads "Cloud help could not confirm this browser"; `README.md`, "Where the AI runs, in detail"). Everything
else on this page works without it. Or from a clone:

**Two views of one app (since 17 Nov).** `/#/demo`, the address above, opens the full view in judge mode, and this
page is about it. The bare address `/` opens the **simple view**, made for a carer on a phone. Its first screen: the
hope line, "Needs it now?" (the quick-needs board), "How it works: 4 steps", seven topics with one-tap questions,
then "Or ask your own question". A question leads to "1 Say it out loud", "2 Turn the phone to them" and the line
"Wait. Count to ten. Don't answer for them."; the person then sees "Point to your answer", the question and the
choices, "So: tea. Right?" with "Yes" / "No, something else", and "Thank you. Tea." with "Give the phone back". It
draws less and computes nothing about a card: the same pipeline makes every card. On the carer's screens it says in
plain words where the choices were made ("Made by the app's rules on this phone. No AI used. Nothing was sent." /
"Made by the AI built into Chrome on this computer…" / "Made with online help… Sent to Google: your question, with
any names you listed swapped out, and the app's fixed instructions"), read from the same `inferenceSource` report as
the badges here. **How it works inside →** at the foot of the simple screens opens the full view (kept for that
browser), and **Simple view**, first among the links at the top, goes back. In the simple view an open question
that needs cloud help brings up a sheet with the exact line that would go; **Yes, send open questions to Google** on
it is the same switch as the tick box below.

**Where the AI is in the simple view, and where it is not.** The 40 topic questions the rules can make, quick needs
and the person's screens use no AI. AI is used in three places, all through Firebase AI Logic
(`web/src/ai/firebaseEngine.ts`): a question the carer types that the rules cannot turn into choices; **Narrow it
down** after the person points to "something else" (`core/narrow.ts`: on the device first, else online help when it
is on; two levels at most; the screen says an AI made the follow-up); and **Today in short** on the answers screen
(`core/summary.ts`: `ONLY_ON_DEVICE`, and written by the app's rules where the browser has no model, because the
answers are never sent). **Gemini Nano is in desktop Chrome only**: on a phone the first two use online help, with
consent, and the third is written by the rules.

```
npm install && npm run dev        # then open http://localhost:5179/#/demo
```

`#/demo` loads a made-up family (Frank; his wife Carol is asking) and opens with one card already made: "Do you want
coffee or tea?", read in code, with no model and nothing sent. It is there so the first frame shows what the person
sees; it is not the AI part.

**Added on 18 Nov, all in the simple view, all made by the rules on the device** (`CLAIMS.md` rows 55 to 62).
*Conversation trees:* supported conversation asks one idea at a time and narrows down, so after every answer to every
topic question the next question is the main button ("Are you hungry?" → yes → "Next: Would you like a snack or a
meal?" → snack → "something sweet or something savoury?"), and a path ends on one line that says what to do ("Bring
them a sweet snack."); `core/tree.ts`, walked answer by answer in `tests/unit/tree.test.ts`. *What it learns:* after
three confirmed answers to the same question the carer sees "Usually: coffee (3 of 3)" and that choice first; it is
counting, not AI, the app never sends it anywhere, and About them lists every learned line with "Remove" (`core/prefs.ts`).
*Pictures:* our own colour drawings, and the family's own photos first wherever a choice is the photo's word; no AI
looks at a photo to put it on a card (the one place a model may be shown a photo is phase 4's "Talk about a photo",
on the device only, after the carer's tap), and no background is removed (a segmentation model would be AI inference outside Firebase AI
Logic, so it was not built). *Back and Home* stand at the top of every carer screen. None of this adds a model call:
the AI is where it was, in a typed open question, the narrowing step (which now refuses "more of the same kind") and
"Today in short".

**Added on 18 Nov, phase 3, the carer's side only** (`CLAIMS.md` rows 63 to 72; README "Added on 18 Nov, phase 3").
A *diary* (one tap logs a drink, a meal, the toilet, sleep or pain; the answers and the needs go in by themselves;
today, week, month, by topic; kept on the device only) and, for a week or a month, *what stands out*: at most six lines,
each with what it was counted from ("Chosen or logged 2 times that day. Only what was entered here."), red flags
marked "Tell the doctor or nurse", never medical advice. **Counting, thresholds and red flags are rules; the AI only
rewords.** In desktop Chrome with Gemini Nano the lines are put into plainer words on the device (`ONLY_ON_DEVICE`); on
a phone the same wording is offered through the cloud (`PREFER_IN_CLOUD`), only after a yes on a sheet that shows the
exact text, each time, and that text holds no name, no health note and no diary entry (only the rules' counted lines, with their dates and counts). Code checks the words
that come back and keeps its own otherwise. Neither wording step has run against a real model yet. An *answer check*
(rules) notices "yes" to nearly every yes / no question or the same place on the screen every time, tells the carer
gently, marks those answers "less sure" and changes the order of the next either-or; the person's screen never shows
any of it. *Health notes* change the thresholds (with a fluid limit noted the app never suggests more to drink).
Also: a tip of the day about the carer's own questions, About them saved to a file and brought back, bigger
pictures on the person's screen. To see it in a minute: open the hosted copy, tap "Diary" under the questions, log
something, then Week.

**Added on 18 Nov, phase 4** (`CLAIMS.md` rows 77 to 85; README "Added on 18 Nov, phase 4"; `devlog/DAY15.md`).
*The first letter:* after "something else" the person points to the letter their word starts with on a big alphabet,
and a card offers up to three words that start with it, the family's own first (Beth, Bo, ginger biscuits for "B":
rules, no model). A model adds words only when the rules find fewer than two: Gemini Nano on the device, or the cloud
after a yes on a sheet, and that request holds the question and the letter only. *The person starts:* "Frank wants to
say something" opens his screen with three starters; the carer then reads "Frank started this: …". *Before a doctor
visit:* eight questions at most from a fixed list, no model anywhere in it, and one page of his own answers, as
given, "Not a medical record". *Talk about a photo:* three rule-made questions about a family photo, never "Who is
this?". **The new hybrid step:** in desktop Chrome with Gemini Nano the carer can ask the model on the device to look
at the photo (`ONLY_ON_DEVICE`, the picture as inline JPEG; the engine has no cloud form of this call), and code makes
one more question from the things it names. The spike that decided it and the SDK's own
`inferenceSource=on_device` lines are in `devlog/evidence_phase4/AI_RUN_LOG.md`. On a phone the questions are the
rules' and the screen says so.

**Changed on 18 Nov after the owner's walk on his phone** (`CLAIMS.md` rows 104 to 107; README "Changed on 18 Nov
after the owner's walk"). *Back* goes exactly one step: ask a topic question, answer it, press "Next", then Back:
the answer before is there, not the first screen. *After "something else"* the carer's screen says "None of these.
Find out what it is: one step at a time." and its first step is made by the rules, with no AI: "More choices like
these" (water, juice, milk, then tea, coffee and the family's own), or "What is it about?" where no kind is known,
or, for the body and feelings, "Show me where" and the needs board. The AI's narrowing step is the last on the list.
"Show me" goes on to "Did you understand?": the carer types the word and the person confirms it.

**Added on 18 Nov, phase 8: the fixes of judge round 7** (`CLAIMS.md` rows 114 to 124; README "Added on 18
to 19 Nov, phase 8"; `devlog/evidence_phase8/`). The visit page counts the person's own "low" and yes to pain, so no
line says "none entered" under them. Back is one step in every view, the sample family's included, and through the
person's own screens. The passport's two lines about understanding are off until ticked, it says a tired yes may not
mean yes, and with no number set it names none. Every card an AI made carries a chip from where the SDK ran it:
"Made on this computer" or "Made online, after your yes", with why. To see the chip on a phone: type "What do you want
to do this weekend?" under "Or ask your own question" and press "Just this once" on the sheet.

**Added on 18 Nov, phase 7: for the speech therapist, and "How to talk with Frank"** (`CLAIMS.md` rows 108 to 113;
README "Added on 18 Nov, phase 7"; `devlog/evidence_phase7/`). **No AI is in this phase**: rules and fixed text on the
device. On the hosted copy since the build of `45e8095` (18 Nov, about 16:52 UTC; README "Deploy"). Open the diary: **"For the speech therapist"** is one page of counts for the last 7 or 30 days (questions
asked and by topic, picked from the app's lists or typed, what the app flagged, "something else" and what led to an
answer after it, who started, the check, Read aloud). No line grades anyone. The counts come from a log that holds
no word of a question or an answer and starts with this build. The needs and pain answers are on the page only when
the carer ticks the box (off every time). From the first screen: **"How to talk with Frank"**, a communication
passport. First every line with its box (five fixed "how to talk" lines, how yes and no are shown as the carer
types it, About them, the words found by their first letter and the usual choices, what was chosen to talk about),
then the page as it prints; "If something is wrong" (the emergency number, FAST) is always on it. Both pages print
with the browser's own print and share through the sheet of phase 6 (the exact text first). Nobody they are for has
seen either; no sheet of paper was printed.

**Added on 18 Nov, phase 6: share with the care circle, and where a line came from** (`CLAIMS.md` rows 98 to 103;
README "Added on 18 Nov, phase 6"; `devlog/evidence_phase6/`). **No AI is in this phase**: rules and fixed text on the
device. Open the diary, tab Week: under every line of "What stands out" is **"See the entries (N)"**, which shows in
place the diary entries the rule counted (the rules return the ids with the line; the count is read from the same
list). Then **"Share with family"**: a sheet shows the exact text (the span, the lines with how each was counted,
the entries by day), says "This text leaves the phone through the app you pick (message, email). Talk Partner keeps
no copy and has no server.", and has Share (`navigator.share({ text })`), Copy and Cancel. The health notes go in
only when the box on the sheet is ticked (off every time); photos never. **"For the next carer"** is a note of the
last 24 hours with the usual choices. A line that carries the call box puts "Call 911 now if this is new or sudden"
at the top of the text. The diary's privacy line was changed to stay true: the app never sends the diary; it leaves
only when the carer shares it, as a text seen first. Nobody it is for has used it; Share was pressed against a stub
in a test browser, on no real phone.

**Added on 18 Nov, phase 5, after judge round 6** (`CLAIMS.md` rows 86 to 97; README "Added on 18 Nov, phase 5").
On the bare address, as a phone: the first screen has **"Something new or sudden?"** (FAST, four more reasons to
call, a call button that is a `tel:` link; the number is set in About them, 911 by default). Ask "Are you in pain?"
from "Body & care", answer yes, then head, top of head: the carer's screen opens with the boxed line **"Call 911 now
if this is new or sudden."** and keeps it for that conversation. All of that is rules and fixed text; no clinician has
read it. **Where the sponsor runs on a phone:** on the screen before handing over, turn on **Read aloud** (a sheet
first: "The words on this card, including names on it, go to Google to be spoken. Nothing else."), then show the card:
a Gemini text-to-speech model, through Firebase AI Logic (`ONLY_IN_CLOUD`), reads the question and the choices, on
every card, the topic questions included. It is the one AI step in the phone's everyday loop; the others on a phone
are the typed open question, "Narrow it down", first-letter words and plainer wording, each a cloud call behind a
sheet whose first yes is "Just this once". On a phone there is no on-device step (README, "Where the sponsor runs on
a phone"). Our run of Read aloud against the real model: `devlog/evidence_phase5/AI_RUN_LOG.md` (localhost, with sound).
**On the hosted copy every one of these cloud steps is behind App Check, and it refused our headless test browsers in
four of five runs of the cloud step and in the one run of Read aloud at build `9d141b0`** (README "Deploy"); the
screen then says "Cloud help could not confirm this browser" or "The voice did not come. Say it out loud yourself.",
and everything made by rules goes on working.

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
- **The microphone** next to the question field: the first press tells you the recording goes to Google's cloud
  (through Firebase AI Logic, Gemini, `ONLY_IN_CLOUD`; the on-device model cannot take sound). After a yes, say your
  question, press again, and the words appear in the field and wait there for "Make card". It is for the partner's
  question only; the person's speech is never recorded. The session figure counts the sound sent.
- **Send feedback** (partner side and "How this works"): a short note to Cloud Firestore. The rules allow adding a
  note only; nobody can read notes back from the app.

**What your copy can do.** Be sure which one you have before you judge the AI part:

| Your copy | "this weekend?" and "for dinner?" show |
|---|---|
| a bare clone, no `.env.local` | "No card", with the reason. Rows 3 to 5 of the table above work. This is expected, not a fault |
| `.env.local` with a Firebase web config, a browser without Gemini Nano | "No card" and an offer of cloud help. Turn it on (top bar → read, tick, **Turn on cloud help**), ask again: the cloud gets the bare question and has never seen About me, so the choices are general (*stay home / go out*, *meat / fish* in our recorded runs; the words vary). Badge **Cloud help (question only)**; **What was sent** shows the question as it went and the size of the request; "Show the exact request" opens the request the app handed to the SDK |
| the same, in desktop Chrome with Gemini Nano downloaded | the private step runs on this computer with the About-me lists: *lake / church*, *pot roast / chili*. Nothing is sent |

The second and third rows are the same question answered by the two steps: general choices from the cloud, the
family's own from this computer. On our labelled set of 60 questions, 18 are open like these: rules alone make no card
for any of them, and the on-device step made a matching card for 15, 16 and 16 of them in three runs at commit `d198eb0`
(18 Nov, the code of phase 5; 15, 16 and 15 at `7dd16a1` on 17 Nov, before the topic, tree and phase 3 to 5 commits), 12, 13 and 13 of them with
the family's own entries (`devlog/evidence_phase5/heldout_at_d198eb0/`; our labels, not a trial with people, and the rules have been changed
since the questions were written, so it is not a held-out set).

We cannot give you the third row without the model on your machine, and the second needs our project settings, which
are not in the repository. What we recorded on ours, with the SDK's own report per call and screenshots:
`devlog/evidence_r8/final/ondevice/RUN_LOG.md` (43 checks; section 1b is the first step running by itself, section 5
has the same two questions answered by the cloud alone); the same run against the hosted copy,
`devlog/evidence_live/ondevice_live_2026-11-17_deebc94/RUN_LOG.md` (43 checks); and, earlier,
`devlog/ondevice_proof_1/RUN_LOG.md`.

**If you have five minutes more**
- `npm run check` (lint, types, 2902 unit tests) and `npm run e2e:noconfig` (a real browser on a copy with no settings; 25 checks, the quick-needs board with the network switched off among them).
- `npm run eval`: the labelled set of 60 questions against the rules alone (it writes its report to a new folder under
  `devlog/eval_runs/`): 40 of 42 code-decided questions, 0 of 18 open. What the on-device model adds on the 18 open
  questions: `devlog/evidence_phase5/heldout_at_d198eb0/` (three runs at `d198eb0`); our reading of the cards of the first runs:
  `devlog/evidence_r2/heldout_r2_NOTES.md`.
- `CLAIMS.md`: every claim we make, with its status. `EVIDENCE.md`: where each one is proved.
- `DISCLOSURE.md`: what existed before the contest period.

**What is not here yet:** a video, and any trial with people.
