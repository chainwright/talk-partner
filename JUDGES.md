Repository: <https://github.com/chainwright/talk-partner> (public, Apache-2.0)

# For judges: the 60-second path

**On a phone first, in 12 steps** (Chrome on Android; the bare address opens the simple view, made for a carer). These
are the screens of the live build `0852ce8` (phases 17 and 17b; the "Live:" line below names the build the hosted copy
runs), with what phase 18 (the branch `phase18-r13`, waiting for the deploy) changes on them marked "Phase 18:". The
sponsor's AI is at taps 2 and 3:
1. Open <https://talk-partner.web.app/>. Under the hope line ("When the words won't come, let them point.") one line says who it is for: "For you and someone with aphasia: you ask, hand them the phone, they point." The first block is **Type your question. We make picture answers.**: a field with "What would you like for lunch?" in grey, the button **Make picture answers**, and two lines: "Google's AI, online, after your yes. Google checks this browser first." / "Pain and warning signs: fixed rules, never an AI." When the field gets the cursor on a phone, App Check (reCAPTCHA) checks the browser; no word of the question goes with it. Phase 18: on a phone App Check starts when the app opens, by the same rules (never with Chrome's own AI, never offline). Under it: "Needs something now?", the red "Something new or sudden?", "I want to say something", then **See the AI at work** with its two lines, "Phone: Google's AI, online, after your yes" / "Laptop with Chrome's own AI: nothing is sent".
2. Tap the field (tap 1) and type the question as you would say it: "What do you fancy for lunch today?". There is no microphone on this form: a recording reaches a model before any rule could read it. **Make picture answers** (tap 2): a sheet, "This question needs online help", "This is the line that would go:" and "Partner asks: What do you fancy for lunch today?", then "Sent to Google:", "Never sent:" and three buttons: **Just this once**, **Yes, every time**, **No, not for this question**.
3. **Just this once** (tap 3) asks Firebase AI Logic (`PREFER_IN_CLOUD` with `onDeviceParams`) for one card; it carries the chip "Made online, after your yes". In our recorded run (dev server, `devlog/evidence_phase16/eval/phase16_everyday_own_cloud.md`) the card was *sandwich / soup / something else*; the words vary. If App Check refuses your browser, the card reads "Made by the app's rules (no AI)" and "Online help could not check this browser, so nothing was sent.", with the rules' nearest ready question, and the button **Try Google's AI again** (one tap, the same yes; the rules' card stays until a card of the AI's replaces it).
4. **Show them the choices**: the person's screen, "Point to your answer"; a tap gives "So: … Right?" with **Yes**, then **Give the phone back**.
5. Home, type the same question, **Make picture answers**, then **No, not for this question**: "Made by the app's rules (no AI) You said no to online help, so nothing was sent. For "What do you fancy for lunch today?" the app's rules picked the nearest ready question instead." The card under it: "Would you like something to eat or something to drink?". In this form, never a blank "No card".
6. Home, type "Is your chest tight again?", **Make picture answers**: no sheet. The red box "Call 911 now if this is new or sudden." (phase 18: "Chest pain, tightness or trouble breathing: call 911 now, even if it has happened before.") with **Call 911** (the number is guessed from the phone's language), the line "This may be a warning sign, so the app's rules made this card. Your words did not go to any AI." and the card "Is your chest tight again? Yes, no, or not sure?". After **yes** (or anything but "no") the carer's screen has one red box: "Chest pain or tightness, or trouble breathing: call 911 now, whatever the amount, even if it has happened before. Do not wait to see if it passes. Note the time it started.", the answer in a neutral box (no green tick), and "Next: How bad is the pain?". The same guard takes "Is your smile lopsided?", "Are you OK, you look grey", "Shall we check your sugar before tea?" and "Does your arm hurt?" (then "Is it suddenly weak or numb?"). Phase 18: also "Are your words worse?" and other speech, face and arm wordings (the stroke check), "Does your jaw hurt?" and pain in the upper stomach, the upper back or a shoulder (call now, whatever the amount), and a typed crisis ("Do you want to die?", "I can't go on"): every answer, "no" and "good" included, keeps the crisis box with both call buttons, and giving the phone back opens the safety screen.
7. On a laptop with Chrome's Gemini Nano the line under the field reads "Chrome's own AI on this computer makes them. Nothing is sent." and the card is made on that computer (`ONLY_ON_DEVICE`, About them in the prompt). We measured this leg on our Mac (README, phase 16).
8. **Or pick a topic** is the second path: **Food & drink → "Would you like tea or coffee?"**: "1 Say it out loud", "2 Turn the phone to them", **Show them the choices**, and under it **Find more choices (Google's AI, after your yes)**, then **Read it aloud to them (Google's AI, a calm, slow voice)** (in the sample family: "to Frank"). **Find more choices** opens a sheet with the exact line ("Would you like tea or coffee? On the card already: tea, coffee."); after **Just this once** the card stays on screen with "Asking Google's AI… Stop waiting", and the card it makes says "AI suggested these other choices with online help, after your yes". If App Check refuses your browser, the screen says "No card for this one" and Back returns to the card. On a laptop with Gemini Nano this button is built to run on that computer and send nothing (not yet run against the real Nano). **Back** returns to tea or coffee.
9. Tap **tea** on the person's screen → "So: tea. Right?" → **Yes** → "Thank you. Tea." → **Give the phone back**. The carer's screen: "Next: Would you like milk in it?" and "Nothing was sent."
10. "Find more choices" is never offered on pain, the body, feelings, a red flag or the crisis line: **Body & care → "Are you in pain?"** has no such button. **Needs something now? → pain → Yes**: the carer gets "Where does it hurt?" first and the call box with your region's number. Phase 18: Read aloud is not offered on the body card, the pain scale or a health question; chest, then "somewhere else", keeps the call line; the arm and leg cards are drawn from behind, so "your left arm" is on the viewer's left. **Body & care → "Are you in pain?" → yes → somewhere else → somewhere else → arms → your left arm**: the next question is "Is it suddenly weak or numb, yes or no?".
11. **I want to say something → I feel…**, the way out twice: "worried / lonely / I can't go on"; the last opens the carer's safety screen.
12. At the foot of Home: **Try it with the Millers, a sample family** (judge mode below), and **How it works inside →**. The measured tables (phase 14: rules 0/18, Gemini Nano 16/18, online 12/18 on the 18 open questions; phase 16, "Ask in your own words": rules 0/18, Gemini Nano 15/18, online 13/18, and on 10 everyday questions 2/10, 8/10, 10/10) are in README.

**Live: the build of `0852ce8`** (phases 17 and 17b, deployed 24 Nov 2026 about 16:01 UTC; README "Deploy" says what was run against it). Phase 18 is on the branch `phase18-r13`, waiting for the deploy.

Nothing here needs an account. Hosted copy: <https://talk-partner.web.app/#/demo> (our project settings are in it, so
cloud help can be turned on there; the on-device step needs Gemini Nano in your own Chrome). **Cloud help there needs
App Check to accept your browser** (reCAPTCHA). A browser App Check refuses gets no cloud card; headless test browsers were refused in
some of our runs and accepted in others. Since phase 13 the app asks App Check first, inside the same 20 s wait (phase 18: a retry after a failed first try
gets what is left of the 20 s, never a fresh wait); a refused browser is told so within that wait (the letter step
since phase 18; on `0852ce8` its sheet stays open): the screen reads "Online help could not check this browser", says what to do instead (a choice question, a topic
question), and Back returns to the app's own card, made with no AI (`README.md`, "Where the AI runs,
in detail"). Everything else on this page works without it. Or from a clone:

**Two views of one app (since 17 Nov).** `/#/demo`, the address above, opens the full view in judge mode, and this
page is about it. The bare address `/` opens the **simple view**, made for a carer on a phone. Its first screen (phase 17): the
hope line, who it is for, "Type your question. We make picture answers." (the field, "Make picture answers" and two lines), "Needs something now?", "Something new or sudden?", "I want to say something",
"See the AI at work", "How it works: 4 steps", then "Or pick a topic" with seven topics and their one-tap questions. A question leads to "1 Say it out loud", "2 Turn the phone to them" and the line
"Wait. Count to ten. Don't answer for them."; the person then sees "Point to your answer", the question and the
choices, "So: tea. Right?" with "Yes" / "No, something else", and "Thank you. Tea." with "Give the phone back". It
draws less and computes nothing about a card: the same pipeline makes every card. On the carer's screens it says in
plain words where the choices were made: "Made by the app's rules (no AI)" on a rules card that stands in, "Made
online, after your yes" on a cloud card, and "Nothing was sent." after a rules card, read from the same
`inferenceSource` report as the badges here. **How it works inside →** at the foot of the simple screens opens the full view (kept for that
browser), and **Simple view**, among the links at the top, goes back (the phone's Back does not). In the simple view an open question
that needs cloud help brings up a sheet with the exact line that would go; **Yes, every time** on
it is the same switch as the tick box below.

**Where the AI is in the simple view, and where it is not.** The 40 topic questions the rules can make, quick needs,
the person's screens and every line about health use no AI. AI is used in these places, all through Firebase AI
Logic (`web/src/ai/firebaseEngine.ts`; README, "Where the sponsor runs on a phone"): **Type your question. We make picture answers.**, for a question the
rules cannot turn into choices and that has no word about pain, the body, a need, feelings, a warning sign or a crisis (`core/ownwords.ts`; those get the rules' card), and **See the AI at work**, its sample; **Find more choices** on a topic card; **Narrow it down** after the person points
to "something else" (`core/narrow.ts`: on the device first, else online help when it is on; two levels at most; the
screen says an AI made the follow-up), and words for a first letter; **Today in short** on the answers screen
(`core/summary.ts`: `ONLY_ON_DEVICE`, and written by the app's rules where the browser has no model, because the
answers are never sent); plainer words for the week's lines; and **Read aloud**. (Since phase 16 the microphone, the carer's spoken question as text, is in the full view only.)
**Gemini Nano is in desktop Chrome only**: on a phone each of these is a cloud call behind a sheet or a notice that
shows what goes, and "Today in short" is written by the rules.

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
*Pictures:* 91 colour pictures made with Gemini (20 Nov, 16 of them made again or added on 22 Nov, pain once more on 23 Nov; reviewed by a person, generated offline and bundled, no model call at run time) and our own colour drawings for the rest (`PICTOGRAMS.md` names the source of each), and the family's own photos first wherever a choice is the photo's word; no AI
looks at a photo to put it on a card (the one place a model may be shown a photo is phase 4's "Talk about a photo",
on the device only, after the carer's tap), and no background is removed (a segmentation model would be AI inference outside Firebase AI
Logic, so it was not built). *Back and Home* stand at the top of every carer screen. None of this adds a model call:
the AI is where it was, in a typed open question, the narrowing step (which now refuses "more of the same kind") and
"Today in short".

**Added on 18 Nov, phase 3, the carer's side only** (`CLAIMS.md` rows 63 to 72; README "Added on 18 Nov, phase 3").
A *diary* (one tap logs a drink, a meal, the toilet, sleep or pain; the answers and the needs go in by themselves, in the sample family too since phase 15, in memory only;
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
and a card offers up to three words that start with it, the family's own first (in the sample family, after "tea or
coffee?", "B" gives ginger biscuits, bread and banana; after a question about people, Beth and brother: rules, no
model). For one letter a model adds words only when the rules find fewer than two; for two letters or more Gemini Nano
is asked on a laptop, and on a phone the sheet comes up when the rules have no word; the cloud request holds the question
and the letters only. Phase 18: a letter with no word never ends there: the screen offers the AI for the topic and the
letters (Chrome's own AI on a laptop, Google's AI online after the same yes; never for the body, feelings or a health
question), then **Write it down together**, **Ask them to show you** and another letter. *The person starts:* "Frank: I want to
say something" opens his screen with three starters; the carer then reads "Frank wants to talk about …". *Before a doctor
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
line says "none entered" under them. Back is one step in every view we walked, the sample family's included, and through the
person's own screens. The passport's two lines about understanding are off until ticked, it says a tired yes may not
mean yes, and with no number set it names none. Every card an AI made says where the SDK ran it:
"Made on this computer", "Made online, after your yes" or "Made with online help…", with why. To see the chip on a phone: type "What do you want
to do this weekend?" under "Type your question. We make picture answers.", press "Make picture answers", then "Just this once" on the sheet.

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
no copy and has no server." (No server of ours holds the family's data; feedback notes, if sent, are kept in our Firebase project.), and has Share (`navigator.share({ text })`), Copy and Cancel. The health notes go in
only when the box on the sheet is ticked (off every time); photos never. **"For the next carer"** is a note of the
last 24 hours with the usual choices. A line that carries the call box puts "Call 911 now if this is new or sudden"
at the top of the text (phase 18: for a pain in the head or the chest, "Call 911 now, whatever the amount"). The diary's privacy line was changed to stay true: the app never sends the diary; it leaves
only when the carer shares it, as a text seen first. Nobody it is for has used it; Share was pressed against a stub
in a test browser, on no real phone.

**Added on 18 Nov, phase 5, after judge round 6** (`CLAIMS.md` rows 86 to 97; README "Added on 18 Nov, phase 5").
On the bare address, as a phone: the first screen has **"Something new or sudden?"** (a red card that opens FAST, four more reasons to
call and a call button that is a `tel:` link; the number is guessed from the phone's language and set in About them). Ask "Are you in pain?"
from "Body & care", answer yes, then head, top of head: the carer's screen opens with the boxed line **"Call 911 now
if this is new or sudden."** and keeps it for that conversation. All of that is rules and fixed text; no clinician has
read it. **Where the sponsor runs on a phone:** on the screen before handing over, turn on **Read aloud** (a sheet
first: "The words on this card, including names on it, go to Google to be spoken. Nothing else."), then show the card:
a Gemini text-to-speech model, through Firebase AI Logic (`ONLY_IN_CLOUD`), reads the question and the choices, on
the topic questions, until it is turned off (phase 18: never on the body card, the pain scale, the needs board, a
health question or a card with a health or crisis choice; on `0852ce8` it was offered on pain cards). With "Find more choices" (phase 14) it is one of two AI steps in the phone's everyday loop, in the sample family too since phase 15; the others on a phone
are the typed open question, "Narrow it down", first-letter words and plainer wording, each a cloud call behind a
sheet whose first yes is "Just this once". On a phone there is no on-device step (README, "Where the sponsor runs on
a phone"). Our run of Read aloud against the real model: `devlog/evidence_phase5/AI_RUN_LOG.md` (localhost, with sound).
**On the hosted copy every one of these cloud steps is behind App Check, and it refused our headless test browsers in
four of five runs of the cloud step and in the one run of Read aloud at build `9d141b0`** (README "Deploy"); the
screen then says "Online help could not check this browser" (since phase 13; before it, "Cloud help could not confirm this browser") or "The voice did not come. Say it out loud yourself.",
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
| a phone | "Open questions need cloud help." |

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
- `npm run check` (lint, types, 3336 unit tests) on the branch `phase18-r13` (3261 at the live build `0852ce8`, the organiser's run of 24 Nov). `npm run e2e:noconfig` (a real browser on a copy with no settings, the quick-needs board with the network switched off among them) was last run at phase 8.
- `npm run eval`: the labelled set of 60 questions against the rules alone (it writes its report to a new folder under
  `devlog/eval_runs/`): 40 of 42 code-decided questions, 0 of 18 open. What the on-device model adds on the 18 open
  questions: `devlog/evidence_phase5/heldout_at_d198eb0/` (three runs at `d198eb0`); our reading of the cards of the first runs:
  `devlog/evidence_r2/heldout_r2_NOTES.md`.
- `CLAIMS.md`: every claim we make, with its status (rows 157 to 180: phases 13 to 15; rows 181 to 188: phase 16; rows 189 to 199: phases 17 and 17b, the live build `0852ce8`; rows 200 to 208: phase 18, on the branch `phase18-r13`). `EVIDENCE.md`: where each one is proved.
- `DISCLOSURE.md`: what existed before the contest period.

**What is not here yet:** a video, and any trial with people.
