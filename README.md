# Talk Partner

About 2 million people in the United States live with aphasia[^1], and the people who talk with them every day are
rarely taught how: when practising speech-language pathologists sent in samples of their therapy goals, fewer than 3%
involved any communication partner training, although 97% of those surveyed said they do some with families, mostly
without a written goal[^2]. What that leaves at stake, in the words of the Aphasia Institute's page on Supported
Conversation: aphasia "masks a person's inherent competence", and people with aphasia "need others to believe they
are competent and have more understanding and social skills than may be apparent"[^3]. A partner who answers for
the person, or tests them, is the everyday way that competence stays hidden (the last sentence is our reading, not
the Institute's words).

After a stroke, many adults with aphasia understand what is said but can't find the words to answer.
Talk Partner helps **the partner** ask the way a speech therapist would: it turns the partner's own question into a
written-choice card (a keyword, two choices, pictured where we have drawn a picture, an escape every time, a
tick/cross check) and gives the partner the exact line to say. It never picks or confirms the person's answer: only
their tap does. Pictures (since 18 Nov our own colour drawings, 120 of them: `PICTOGRAMS.md`): yes / no, feelings, the body
map, people, drinks and food, rest, TV and music, going out, the ways out, the needs of the quick-needs board. The
family's own places and foods ("lake", "pot roast") show the family's own photo where one was added, and the word
alone otherwise.

Based on Supported Conversation for Adults with Aphasia (SCA) principles. Not a therapy, not a diagnosis.

## Where the AI runs (Firebase AI Logic hybrid inference)
**Family data → `ONLY_ON_DEVICE`; the stripped question → `PREFER_IN_CLOUD`, which falls back to Gemini Nano when
offline; `inferenceSource` drives every badge.** Every model call goes through Firebase AI Logic, the
optional microphone included (it sends the partner's recorded question to Gemini, `ONLY_IN_CLOUD`, for its words). The
code is in **`web/src/ai/firebaseEngine.ts`**. See [Added on 17 Nov](#added-on-17-nov-quick-needs-voice-input-feedback).

| Step | Gets | Mode | Why |
|---|---|---|---|
| Private card | question + the family's About-me lists | `ONLY_ON_DEVICE` | Family data must never fall back to the cloud. `PREFER_ON_DEVICE` would send this prompt to the cloud while Gemini Nano is missing or downloading. |
| Narrowing card, after "something else" (`core/narrow.ts`) | on the device: the question, the choices that did not fit, today's answers so far, About me. In the cloud: the question and the choices that did not fit, About-me words swapped out; never the answers | the same two steps: `ONLY_ON_DEVICE` first, else `PREFER_IN_CLOUD` when the carer has turned online help on | The person chose the way out, so an AI suggests the next, broader choices (two levels at most). The same card rules check them, and the screen says an AI made this follow-up. Since 18 Nov a proposed choice that is more of the kind already refused is dropped, and when fewer than two are left the rules make the broader choices and the card says so (`core/kinds.ts`). On the device the prompt may also hold what was learned by counting (`core/prefs.ts`); the cloud text never does. |
| "Today in short" (`core/summary.ts`) | today's confirmed answers | `ONLY_ON_DEVICE` (`summarizeDevice`), no cloud step | Two to four sentences for the family or the therapist. The answers are personal: where the browser has no Gemini Nano, the app's rules write the summary and no model gets them. |
| Plainer words for the week's and the month's lines and for the tip of the day (`core/reword.ts`; [phase 3](#added-on-18-nov-phase-3-the-diary-health-notes-what-stands-out-the-answer-check-a-tip-a-copy-in-a-file)) | on the device: the lines the app's rules wrote, and the carer's health notes as context. In the cloud: the insight lines only, as shown on a sheet first; no name, no health note, nothing of the diary | `ONLY_ON_DEVICE` (`rewordDevice`); on a device with no model, `PREFER_IN_CLOUD` (`rewordCloud`) after a yes on that sheet, each time | What is counted, the thresholds and the red flags are rules. A model only rewords, and code checks its words (no new number, no name, no medical or advising word, never "more to drink"); otherwise the rules' words stay. Neither step has run against a real model yet. |
| First-letter words, only when the rules find fewer than two (`core/letter.ts`; [phase 4](#added-on-18-nov-phase-4-the-first-letter-the-person-starts-before-a-doctor-visit-talk-about-a-photo)) | on the device: the question, the letter, what did not fit, About me, the usual answers. In the cloud: the question with About-me words swapped out, and the letter; never what was refused or learned | `ONLY_ON_DEVICE` where the browser has Gemini Nano; else `PREFER_IN_CLOUD`, only after a yes on a sheet that shows the text | The person points to a letter; a model may add everyday words that start with it. Code keeps a word only if it starts with the letter, is no invented name, and is not alcohol, tobacco or a medicine. |
| "Talk about a photo": what is in the picture (`core/phototalk.ts`) | one of the family's own photos (a 320 px JPEG) and a fixed instruction | `ONLY_ON_DEVICE` (`lookDevice`), no cloud step, after the carer's tap | A family photo has no cloud path. The model names things; code drops every word about a person and makes one choice question. On a phone the rules write the questions from the photo's word. |
| Stripped card | the question with every About-me word swapped for "Person A", "Place A"… and a word that looks like a name the family didn't list (a capitalised word, the word after a title such as "Dr.", a lowercase word that is not an everyday English word) swapped for "Name A" | `PREFER_IN_CLOUD` | Holds no profile data, so an offline fall-back to the device is safe. |

**On a phone there is no on-device step today.** Chrome's built-in Gemini Nano exists in desktop Chrome only, not on
Android or iOS, and a carer mostly holds a phone. So on a phone the topic questions, quick needs, the person's screens,
About them and "Today in short" are made by the app's rules with no AI, and a question the carer types that the rules
cannot turn into choices (an open question) uses online help, asked for at that moment on a sheet that shows the exact
line that would go. The first screen says this in one line ("On this phone that AI is online (Google's): the app asks
you first…"). Neither the narrowing step nor "Today in short" has been run against the real Gemini Nano yet: on the device both
are tested with scripted engines only. The narrowing step has one recorded run through the real cloud model
(`CLAIMS.md`, rows 53 and 54).

The same question through the two steps, in our recorded run: "What do you want to do this weekend?" gives
*lake / church* on this computer (the family's own places, read from About me by Gemini Nano; nothing sent) and
*stay home / go out* from the cloud, which gets the question only. The details are under
[Where the AI runs, in detail](#where-the-ai-runs-in-detail).

Built for #BuildHybridAI 2026. Status on 17 Nov 2026, in three lines:
- **What runs:** the hosted copy is at <https://talk-partner.web.app/#/demo> (the full view, in judge mode; the bare address opens the simple view for families, added 17 Nov and rebuilt the same evening around topics, the person's own screens and a how-to block: [Screens](#screens)). It can be installed to the home screen and opens with no connection. It turns the partner's question into a choice card, corrects the partner where a rule can tell, and never picks the answer; open questions are answered on this computer by Gemini Nano from About me, or by the cloud from the question alone. Since 17 Nov also a quick-needs board (no AI), a microphone for the partner's question (through Firebase AI Logic, in the cloud) and a feedback form (Cloud Firestore), all untried by anyone they are for.
- **One number, at commit `7dd16a1`:** on the 18 open questions of our own labelled set, rules alone make no card (0 of 18); the on-device model made a card matching our label for 15, 16 and 15 of 18 in three runs (17 Nov, the last commit that changes code), 12, 13 and 12 of them with the family's own people, places or foods. Three runs an hour earlier, at `2aeb1d0`, gave 16 each time, and so did the three before that day's rule changes, at `c346d3d`: the model's answers vary, so the number is 15 to 16. Our labels and a set the rules have since been changed around: not a held-out test, not a trial with people.
- **Every claim with its status:** `CLAIMS.md` (and `JUDGES.md` for the 60-second path, `EVIDENCE.md` for claim → file, command, saved output). No video yet, no trial with people yet. How it got here, day by day: `devlog/` (the long form of this paragraph is kept in `devlog/DAY12.md`).

## Added on 17 Nov: quick needs, voice input, feedback
All three were added on 17 Nov 2026. **No carer and no person with aphasia has used any of them**; what is tested is
the code and the live site (`CLAIMS.md` rows 40, 41 and 42).

**Quick needs.** One button in the top bar of every partner screen (or the address `#/needs`) puts a fixed board on
the person's screen: *toilet, drink, food, pain, tired, too hot, too cold, call someone*, and *something else*. Each
tile is one of our own pictures (colour drawings since 18 Nov) with its word. A tap is checked like every choice ("So: toilet. Right?" with a
tick and a cross); after the tick the person's screen shows the need and nothing else, and the partner's side gets one
short line for it ("Go now. The rest can wait."; after *pain*, one tap asks "Where does it hurt?", the body card).
*Something else* is checked the same way and hands back to the question box and "We're stuck". The board is made in
code (`core/needs.ts`, which imports the copy and the types and nothing else): no model, no About me, no request, so
it works with no connection **once the page is open**. There is no offline install: a page that has never loaded, or
is reloaded with no network, does not open. Nine tiles is more than the two or three of a card; that is our choice
for needs that cannot wait for a question to be typed, not something the sources measured.

**Voice input, for the partner's question only, through Firebase AI Logic.** A microphone button sits between the
question field and "Make card". A press records one short clip (15 seconds at most; a second press stops it). The
clip is made into a 16 kHz WAV in the browser and sent once to Gemini through `firebase/ai` (`ONLY_IN_CLOUD`, asked
only for the words). The words fill the field and stay there: nothing is submitted until the partner has read them
and pressed "Make card". The app never records or recognises the person's speech. **The sound goes to Google's
cloud, names included:** the on-device model cannot take sound, so the notice on the first press says "cloud" and
the app records only after a yes. The session figure counts every byte of sound handed over, and a card made from a
spoken question says so. There is no other speech recognition in the app (the browser's Web Speech API, tried for a
few hours on 17 Nov 2026, was removed because it is AI outside Firebase AI Logic; a test fails the build if it comes
back). Checked on the live site with a recorded question in Chrome 157 and Chromium 148:
`devlog/evidence_live/voice-feedback_live_2026-11-17_40fedec/`. No partner or carer has used it yet.

**Feedback, kept in Cloud Firestore.** A small "Send feedback" form on the partner's side and on "How this works":
a note of up to 1000 characters, an optional role and email, and the line "Please don't include patient details".
One document per note, with the server's time, the app version and the commit. `firestore.rules` allow create only,
with every field checked again on the server; nobody can read, change or delete notes from a client (the owners read
them in the Firebase console). Rules tested on the emulator (`npm run test:rules`, 37 cases) and against the deployed
rules (`node scripts/rules-check.mjs --live`, 25 refusals).

## Added on 18 Nov: conversation trees, what it learns, colour pictures, the family's photos
What changed after the owner tried the hosted copy on his phone (17 Nov, evening). Every part below is made by the
app's rules on the device, with no AI and nothing sent, unless it says otherwise. Status and limits: `CLAIMS.md`, rows
55 to 62. Nobody it is for has tried any of it yet.

**Conversation trees (`core/tree.ts`).** Supported conversation asks one idea at a time and narrows down. Until
18 Nov most topic questions ended on the first answer ("Are you hungry?" → yes, and then nothing). Now every answer
to every topic question (yes, no, not sure, each choice, the way out) has a next question that narrows it down,
or one short line that tells the carer what to do: "Are you hungry?" → yes → "Would you like a snack or a meal?" →
snack → "Would you like something sweet or something savoury?" → something sweet → *"Bring them a sweet snack. Show
two to pick from, if you can."* A "no" has its branch too ("Would you like something to drink?") or a natural end
("Not hungry now. Ask again in an hour."). On the screen the next question is the main button ("Next: …"), with "Ask
something else" under it; at the end of a path the line stands in its place ("Now: …"). A conversation is three
questions deep at most and never asks the same question twice. What About them names is slotted in: the family's
foods under "a meal", their people under a call and a visit, their places under going out. The table holds 48
questions with an entry for every answer of their card, and the body map has its own rule: 49 questions and 172
question × answer pairs with nothing in About them, 57 and 196 with the sample family; `tests/unit/tree.test.ts` walks every topic question and every answer down every path (596
paths, 685 with the sample family) and fails on a silent end, on a next question the rules cannot make a card for, and
on a fourth question. The lines are ours: plain household actions, and for pain "tell the nurse or doctor"; no
clinician has read them yet.

**What it learns about the person (`core/prefs.ts`).** By counting, on this device, from the answers the person
confirmed and the needs they pointed to: no model reads them. After three confirmed answers to the same question
with a clear lead (60 % and no tie) the carer's screen says "Usually: coffee (3 of 3)" and that choice stands first;
no choice is removed and nothing is chosen for the person, whose screen says nothing about what is usual. Also
counted: a pattern by time of day (three answers in each part of the day), a usual yes or no, and what was asked for
on the needs board, how often and when. In a tree, the usual side of the next either-or is offered as a short
question under the main button ("Would you like something sweet?"). About them lists every learned line in plain
words with its counts, each with "Keep as a fact" and "Remove", and "Forget everything learned". It never leaves the
device: `prefs.ts` imports nothing and no file that builds a prompt or a request imports it
(`tests/unit/prefs.test.ts`). Two AI uses exist in code, both `ONLY_ON_DEVICE` (desktop Chrome with Gemini Nano
only, so on no phone today): the learned lines as hints in the narrowing step's on-device prompt, and a two-sentence
summary of them in About them. **Neither has been run against a real Gemini Nano.**

**Narrowing that goes broader (`core/kinds.ts`, `core/narrow.ts`).** In the one recorded run of the narrowing step
the cloud model answered "tea or coffee → something else" with *water / juice / milk* and then *hot chocolate / malt
drink / herbal tea*: more drinks, twice. Now the request says in words that more of the same kind is not wanted; a
proposed choice that is one more single thing of the refused subject is dropped; and when fewer than two choices are
left the rules make the card themselves (*something cold / something sweet*, then *something to eat / a rest / help
with something*) and the card says the rules made it and that an AI was asked first. On 13 fixtures written in the
manner of that run (rows 1 and 2 are the recorded answers) the old code showed more of the same 13 of 13 times, the
new code 0 of 13 (`devlog/evidence_phase2/narrow_before_after.txt`). The word list behind it is small and ours; a
word it does not know is never called "the same kind". One run through the real cloud model with the new request (six
questions, two steps each, localhost, `devlog/evidence_phase2/narrow_cloud_real_localhost.txt`): none of the 12 cards
offered more of the refused kind; the model made 10 of them and repeated itself on 2, where the rules made the card.
It leans on the two examples in the request ("something cold", "something to eat"), which come back often at step 2.
One run; the model's answers vary.

**Colour pictures (`web/src/pictos.ts`, `PICTOGRAMS.md`).** The black line drawings were replaced by simple,
realistic colour drawings, all our own (no third-party set, no AI-generated image): real-object colours, one object,
a plain background, light shading, the word under each. 120 pictures and the monogram; 39 of them are new, for the
words the topic questions and their trees offer (all 128 choices of the 40 rule-made topic questions now have a
picture; a word with none still shows alone). Why colour: `design/IMAGES_RESEARCH_2026-11-17.md`. The sheet at
390 px: `devlog/evidence_pictures/pictures_390.png`.

**Personal photos (`core/photos.ts`, `web/src/photo.ts`).** In About them the carer adds a photo of a person, a food
or drink, or a place: take or choose it, frame it by hand (move and zoom a square), give it one word. A card shows it
in place of the drawing wherever a choice **is** that word (rules: compared without capitals, "the / your", and the
plural; never a near match). The photos are kept in IndexedDB on the device, 320 px JPEGs, 60 at most; each has
"Delete", and there are "Delete all photos" and "Delete everything on this phone". **No photo is ever sent, and no AI
looks at a photo to put it on a card:** the file is read in the page and drawn on a canvas; nothing recognises, labels
or cuts it out. (Since phase 4 there is one place where a model may be shown a photo: "Talk about a photo", on a
desktop Chrome with Gemini Nano, after the carer presses "Ask the AI on this device to look at it". That call is
`ONLY_ON_DEVICE` and has no cloud form; see [phase 4](#added-on-18-nov-phase-4-the-first-letter-the-person-starts-before-a-doctor-visit-talk-about-a-photo).)
**Not built, on purpose: background removal.** The plan was a cut-out by MediaPipe's Interactive Segmenter, on the
device. The contest's rule is "All of your app's AI inference must go through Firebase AI Logic, so don't call other
model APIs directly", and a segmentation model called through MediaPipe is AI inference outside Firebase AI Logic,
even though it is not generative and would send nothing (the same reading that made us remove the browser's speech
recognition on 17 Nov). So the photo keeps its own background, framed by hand; a test fails the build if a vision or
segmentation package appears (`tests/unit/photos.test.ts`).

**Back, Home, and a new version that arrives.** Every carer screen has "Back" (one step back in the flow) and "Talk
Partner · Home" at the top; the phone's own back button or gesture does what "Back" does and leaves the app only
from the first screen; the person's full-screen card keeps the carer's press-and-hold. A new deploy reaches an
installed copy: the service worker asks the network for the page with `no-store` and keeps only its own build, the
page asks for a newer worker every time it comes back to the front, loads it by itself on the first screen, and in the
middle of a question shows "A newer version is ready. Tap to update." instead (`scripts/update-check.py` swaps the
served build under an open browser: 11 checks). **Less to read:** the hand-over screen keeps two short lines ("Wait.
Count to ten. Don't answer for them." and "Point to each choice as you say it."), the rest is behind "More tips"; the
answer screen shows the question with its answer ("Are you tired?" — "Yes"), the next step, one line on what left, and
"More".

## Added on 18 Nov, phase 3: the diary, health notes, what stands out, the answer check, a tip, a copy in a file
For the carer's side only: nothing in this section is ever drawn on the person's screen, which shows no count, no
mark and no score. Status and limits: `CLAIMS.md`, rows 63 to 72. Nobody it is for has tried any of it yet, and no
nurse, doctor or speech and language therapist has read the wording.

**What is rules, what is AI, and where it runs.**

| Part | Made by | Where | What a model gets |
|---|---|---|---|
| The answer check (`core/reliability.ts`) | rules | the device | nothing: no model |
| The diary and its one-tap log (`core/diary.ts`) | rules | the device (IndexedDB) | nothing: no model |
| What stands out: what is counted, the thresholds, the red flags, how serious a line is, the base of each line, the footer (`core/insights.ts`) | rules | the device | nothing: no model |
| The wording of those lines, in plainer words (`core/reword.ts`) | Gemini Nano, `ONLY_ON_DEVICE`, where the browser has it (desktop Chrome) | the device | the lines the rules wrote, and the carer's health notes as context |
| The same wording on a phone | Google's cloud model, `PREFER_IN_CLOUD`, only after a yes on a sheet that shows the exact text, each time | Google | the lines the rules wrote: no name, no photo, no health note, nothing of the diary. A line whose own words state a health note is not sent |
| The tip of the day (`core/tip.ts`): which tip, and its sentence | rules | the device | nothing |
| The tip's sentence in plainer words | Gemini Nano, `ONLY_ON_DEVICE`, where the browser has it; no cloud step | the device | that one sentence |
| Health notes, the copy of About them in a file (`core/backup.ts`) | rules | the device | nothing: no model |

A model only ever rewords. Code checks what comes back (`checkReworded`): the same number of lines, every number
kept and none added, no name, no word of diagnosis, medicine, dose or diet that the rules' line does not hold, no
"should", never "more to drink" in any words. Otherwise the rules' own words stay. **Neither wording step has run
against a real model yet**: the on-device one needs desktop Chrome with Gemini Nano, the cloud one a browser that App
Check accepts; both are tested with a scripted engine, and the browser test refuses the cloud request and checks that
the screen then says the lines may have left.

**The answer check (`core/reliability.ts`).** Yes / no and pointing are not always reliable for a person with aphasia,
most of all when they are tired, and a diary that counts answers would turn an unreliable run into a "fact". So the
rules notice two things in the answers kept on the device: "yes" to at least 4 of the last 5 yes / no cards, and the
same place on the screen at least 4 times in a row, each within 10 minutes (the time limit on the second is ours:
without it, tea first on the card every morning would be flagged, and that is a preference). Then the carer reads one
line, on the carer's screens only: *"Frank may be tired. Try again later, or check with a different question."* The
answers of that run are marked "less sure" in the diary, and the next either-or shows its choices in a different
order (none removed; a yes / no card keeps its order). The thresholds are ours, not a clinical standard.
**It never discounts pain, the toilet, help or a need** (changed on 18 Nov after a second role-play, where the line
stood under "Are you in pain? Yes" and a carer could have dismissed real pain): such an answer does not count
toward a run, is never marked "less sure", and no line stands on its screen; after a pain "yes" the screen leads on
with "Next: Where does it hurt?" as before. And it stays quiet in an ordinary fast flow: it speaks only when the run
took 2 minutes or more, or 5 answers or more fall within the 10 minutes. The line is a headline and one sentence;
why, and the rest, are under "More".

**The diary (`core/diary.ts`, `web/src/diary.ts`).** One tap logs "Drank", "Ate", "Toilet", "Slept" or "Pain" with the
time, with "Undo". The diary also keeps every answer the person confirmed and every need they pointed to on the
board. Today / Week / Month, a timeline by day, a filter by topic, "Copy as text, for a visit", and "Delete the
diary". It is kept in IndexedDB on the device and nowhere else. **A diary is not a record of what happened**: it
holds only what was entered in the app, and every count says so.

**Health notes** (About them): free text, and four toggles (diabetes, swallowing difficulty, a fluid limit from the
doctor, needs reminders to drink and eat). They are kept apart from the profile the card prompts read, stay on the
device, and are never in a cloud request.

**What stands out (`core/insights.ts`)**, for the last 7 or 30 days, five lines at most. Red flags ("Tell the doctor
or nurse"): pain chosen or logged on 3 days or more; a whole past day with entries and no drink among them, said with
its doubt ("That can simply mean nobody entered one."). Worth mentioning or to keep in mind: a day with few drinks
entered, something sweet chosen often, bad nights on 3 days, many answers marked "less sure". Each line shows what it
was counted from (*"Counted that day: 2. Every "Drank" tap counts, and every drink chosen on a card (tea, coffee,
water, juice, milk, or yes to "something to drink"); a card and a tap within 20 minutes count once. Only what was
entered here."*). Every tap on the log counts by itself, so three "Drank" logged in one minute are three, as the
timeline shows them; when two days tie on the fewest drinks, both are named. The health notes change the
thresholds: with diabetes noted, 3 sweet choices in a week are "Worth mentioning to the doctor or nurse" (6 without
the note, and then only "To keep in mind"); with reminders noted, a day with 3 drinks is already few; with swallowing
difficulty noted, a day with no food entered is mentioned; **with a fluid limit noted the app never suggests more to
drink in any words** (a test scans every line of every fixture for it), drops the "few drinks" line, and mentions a
day with 8 drinks or more instead. Never medical advice: no diagnosis, no medicine, no dose, no diet plan, and a
fixed footer says so. The numbers are ours; no clinician has reviewed them.

**The tip of the day (`core/tip.ts`).** One sentence for the carer about the carer's own questions, never about the
person, from flags the rules already set on each card: two things in one question, a memory question, choices that
did not fit twice, mostly open questions; or what went well. Not before three questions that day. The app keeps four
yes / no marks and a time per question, never its words. It can be hidden, and stays hidden.

**A copy of About them in a file (`core/backup.ts`).** About them lives in one browser, so a cleared browser or a new
phone loses it. "Save About them to a file" writes a JSON file on the device (names, people and their photos, lists,
kept facts, the family's photos as data URLs, health notes); the app sends it nowhere. "Bring About them back from a
file" shows what the file holds before anything is replaced, checks every field, and refuses a file that is not ours.
The diary and the answers are not in the file.

**Bigger pictures on the person's screen.** A picture is now 112 px (three choices) or 128 px (one or two) on a
390 px phone, with the word under it at 30 px, and three choices and "something else" stand on 390 x 844 without
scrolling (measured by `scripts/e2e-simple.py` and `scripts/overflow-check.py`); the family's photos get the same size.

**Checked** after the second role-play's fixes (production build on localhost; logs in `devlog/evidence_phase3/`):
2416 unit tests; `e2e-simple.py` 462/462, of which the phase 3 run (108 checks) drives the diary, the answer check (five
"yes" in a row, then "Are you in pain?" while it is on: no line, no mark, "Next: Where does it hurt?"), health notes,
the Miller family's week (`tests/fixtures/frank-week.json`, fictional: `design/PERSONA_SCENARIO.md`) and its three
lines, the sheet, the tip, save / clear / bring back, and the picture sizes; `overflow-check.py` 402/402 at 320 to
412 px; `pwa-check.py` 30/30. At `9117fdd`, before those fixes: `contrast-check.mjs` 117 pairs, `update-check.py`
11/11, `e2e-needs.mjs` 12/12, `e2e-noconfig.mjs` 25/25. Screens at 390 px: `devlog/evidence_phase3/01_…` to `25_…`
(`scripts/phase3-shots.py`). Not run: `e2e-cloud.mjs` and `e2e-ondevice.mjs` (nothing in a card's rules, prompt or
model call changed; the two new wording steps have no run against a real model).

## Added on 18 Nov, phase 4: the first letter, the person starts, before a doctor visit, talk about a photo
Four things for the moments the earlier phases left open: the word that is on the tip of the tongue, a conversation
the person wants to start, the twelve minutes with a doctor, and talk for its own sake. Status and limits:
`CLAIMS.md`, rows 77 to 85. Nobody it is for has tried any of it yet, and no doctor, nurse or speech and language
therapist has read the doctor-visit list. The day's notes, the spike and what differs from the brief: `devlog/DAY15.md`.

**What is rules, what is AI, and where it runs.**

| Part | Made by | Where | What a model gets |
|---|---|---|---|
| The alphabet, and the words after a letter when About them or the app's everyday words hold two or more (`core/letter.ts`) | rules | the device | nothing: no model |
| More words for a letter, only when the rules find fewer than two | Gemini Nano, `ONLY_ON_DEVICE`, where the browser has it | the device | the question, the letter, what did not fit, About them, the usual answers learned here. Nothing leaves the device |
| The same on a phone | the cloud model, `PREFER_IN_CLOUD`, after a yes on a sheet that shows the text | Google's cloud | the question with About-them words swapped out, and the letter. Not what was refused, not a learned word, not a name |
| "[Name] wants to say something": the starters, the topics as pictures, the line and the questions for the carer (`core/turn.ts`) | rules | the device | nothing: no model |
| Before a doctor visit: the questions, the page (`core/visit.ts`) | a fixed list in the source | the device (IndexedDB, its own key) | nothing: no model, on any device |
| Talk about a photo: three questions from the photo's word and About them (`core/phototalk.ts`) | rules | the device | nothing: no model |
| One more question, "What in this photo shall we talk about?" | Gemini Nano, `ONLY_ON_DEVICE` (`lookDevice`), after the carer presses "Ask the AI on this device to look at it"; desktop Chrome only | the device | the photo (a 320 px JPEG) and a fixed instruction. There is no cloud form of this call |

**The first letter.** After a confirmed "something else" the carer's screen offers "Try the first letter" (it is also
on the "We're stuck" card). The person's screen then asks "Do you know how the word starts?" and "Point to the first
letter" over a big alphabet: 26 letters, six to a row, and "No, I don't know" as the wide button of the last row. It
is the one screen of the person's with more than three choices beside the needs board, and it fits a 390 x 844 phone
(and a 320 x 568 one) without scrolling. A letter leads to a card of up to three words that start with it, and
"something else". The words are the family's own first (the people, the pets and other things, the foods, the places,
TV, music, and the usual answers counted on this device), then the everyday words the app has a drawing for, the
question's own topic first. With Beth, Bo and ginger biscuits in About them, "B" offers exactly those three, by rules,
with the family's photos on them, and no model is asked on any device. Every tile starts with the letter: a word that
is matched by a later word shows that word first ("biscuits (ginger)"), and the carer still says "ginger biscuits".
When the kind of the conversation is known (after "tea or coffee?" it is drinks), words of that kind come first, then
people, then the rest. A model adds words only when the rules find
fewer than two; code keeps a word only if it starts with the letter, was not already refused, is no name the family
did not give, and is not alcohol, tobacco or a medicine. If the word is "pain", the carer's next step is "Where does
it hurt?" at once; "toilet" says go now. "No, I don't know" goes back to the carer with one calm line ("That is fine:
many people cannot tell the first letter"), and nothing is counted, on any screen.

**The person starts.** A button under the quick needs, "Frank wants to say something", opens the person's screen with
three starters and the way out: "I need something" (leads to the needs board), "I want to tell you something" (the
topics as a picture menu, three to a screen), "I feel…" (the feelings card). The phone goes back to the carer only at
the end. After a topic one more card asks what in it this is about ("Who is it about?" with up to three of the
family's names and "someone else"; "Is it about today, or another day?"), and the carer reads "Frank started this:
there is something to tell you. It is about: People & family, Beth." with three questions about the telling, not
offers: "Is it good news, or a worry?", "Did something happen?", "Do you want to tell me now or later?" (each a card
the rules make, each answer with its next step in `core/tree.ts`). For "Body & care" the first question is "Are you
in pain?". The answer check never counts what the person started,
and its line ("may be tired") never stands on a screen that follows from it. On a carer's phone this works only when
the phone is within the person's reach; a spare phone or tablet beside the chair is the honest setup.

**Before a doctor visit.** Up to eight cards from a fixed list in `core/visit.ts` (six when there is no pain): "Are
you in pain?", "Where does it hurt?" (the body map), "How bad is the pain?", "How have you been sleeping?", "How is
your appetite?", "How have you been feeling in yourself?", "What worries you most?" (with "nothing much" on its first
screen), "What do you want to ask the doctor?". No model writes, picks, orders or rewords a question, and none reads
an answer: every card is made with an engine that cannot run a model. The result is one page, "Frank's own answers",
with the date, each answer exactly as it was given with its question and time, a line that asks for time when the
answer to the last question was "something else", and the footer "Frank's answers, in Frank's own words where
possible. Not a medical record." It can be shown, printed or copied as text. The answers are kept on the device under
their own key, apart from the history and the diary, so the answer check never marks them and no step that builds a
request can read them. The app does not interpret anything on that page. Outside the printed part, after a yes to
pain, one line says: "If the pain is new or strong, do not wait for the visit: call the nurse or doctor."

**Talk about a photo.** The carer picks one of the photos added in About them and gets three questions made by rules
from the photo's word and About them: for a person's photo "Would you like to call Beth?", for a place "Would you
like to go to the lake again?", for a food "Would you like ginger biscuits?", and for every photo "How does this
photo make you feel? good / mixed / sad" and "Who shall we show this photo to?". Never "Who is this?" or "Do you
remember": those are tests, and the rules refuse them everywhere. The person sees the photo over the question, with
three choices at most and the way out. **With images, on the device only:** the half-day spike asked whether Firebase
AI Logic's on-device step takes a picture in this Chrome, and it does (Chrome 157 with Gemini Nano; the SDK's own
report was `inferenceSource=on_device`, and no host was contacted; `devlog/DAY15.md`,
`devlog/evidence_phase4/AI_RUN_LOG.md`). So on such a browser a button, "Ask the AI on this device to look at it",
shows the model the photo and a fixed instruction; it names up to four things it sees, and code makes one more
question from them ("What in this photo shall we talk about? mug / table"). The model is told to say nothing about
people, and code drops every word about a person's looks, age, health or mood whatever it said. The engine's call has
no cloud model and throws on any answer that did not come from the device. On a phone there is no such button: the
questions are the rules', and the screen says "No AI looked at the photo."

2559 unit tests (143 new: `letter`, `turn`, `visit`, `phototalk`, `privacy-phase4`); `e2e-simple.py` 550/550 before
the third role-play's fixes (with them the whole run was made against the hosted copy only, 551/551 there: see
Deploy; on localhost the phase 4 run and its overflow screens were run again), of
which the phase 4 run (83 checks then, 87 now, with the Miller family and three photos) walks all four as Carol and Frank at
390 x 844, asks nothing of any other host and presses no "Yes" on a sheet, and the offline run has four phase 4
steps; `overflow-check.py` 503/503 at 320 to 412 px (101 of them phase 4: every person's screen of it also "needs no
scrolling" at the phone's own height); `contrast-check.mjs` 127 pairs. Against real models
(`scripts/e2e-phase4-ai.py`, 16/16, `devlog/evidence_phase4/AI_RUN_LOG.md`): the photo step and the letter step on
the device (Gemini Nano), and the letter step through the cloud model after the sheet's yes. Screens at 390 px:
`devlog/evidence_phase4/01_…` to `17_…` (`scripts/phase4-shots.py`). The saved outputs of the two long runs are next
to them (`e2e-simple_localhost_…txt`, made one small commit before `9ff3e9d`, and `overflow-check_localhost_…txt`).
At `9ff3e9d`, on the production build on localhost: the phase 4 run again 83/83, its overflow screens 101/101,
`pwa-check.py` 30/30, `update-check.py` 11/11, `e2e-needs.mjs` 12/12, `e2e-noconfig.mjs` 25/25. Not run:
`e2e-cloud.mjs` and `e2e-ondevice.mjs` (nothing in the rules, the prompt or the model call of an ordinary card
changed), and the two wording steps of phase 3 still have no run against a real model.

## Changed on 18 Nov after a role-play on the phone
One of us played Carol and Frank (`design/PERSONA_SCENARIO.md`, fictional) on the hosted copy at 390 px. What it
found, and what changed (`CLAIMS.md` rows 73 to 76):

- **The data-use line was out of date.** The sheets said "Google's free tier: Google may use what is sent to improve
  its products". The project's Gemini API has been on the paid tier since 17 Nov (the owner's statement; we did not
  read the billing account). They now say what the paid terms say: Google does not use what is sent to improve its
  products, and keeps it for a limited time to check for misuse (Gemini API Additional Terms of Service,
  <https://aistudio.google.com/docs/terms>, effective 23 March 2026, read 18 Nov 2026). **If you build your own copy
  with an unpaid key, that sentence is wrong for it**: under the unpaid terms Google may use what is sent and people
  may read it. Change `consent.sheet.data`, `consent.terms` and `consent.who` in `core/copy.ts`.
- **The sheet before a narrowing step led with the raw instructions.** It now says "None of those fitted. Google's AI
  can suggest other kinds of answer. It sees only this:" and the conversation's own line; the fixed instructions are
  named in one line, and the whole request is behind "The whole request".
- **After "something else" there were about six things to press.** Three stay: the next question, "Narrow it down",
  and "Ask them to show or write it"; the rest is under "More". The question to try next no longer offers what was
  just refused ("tea or coffee" refused: it suggested "strong tea with milk or porridge"), and stays with drinks.
- **"Do you want to call someone?" → yes asked one name at a time.** The next question is now one card, "Who would
  you like to call?", with up to three of the family's names, each with the person's photo or initial, and "someone
  else". The same after "Would you like a visitor today?".
- **About them spoke of "Chrome's built-in AI"** to a carer; that sentence is now in the inside view only. Once the
  name is set, the lines about what was learned, the photos and the diary say "Frank", not "they".

## Changed on 17 Nov after the second rehearsal run
A second run of our rehearsal set E (simulated partners and answers, not people; its numbers are not quoted anywhere)
left seven things. Each was fixed as a class and tested on new phrasings (`tests/unit/sim-e2-classes.test.ts`, 63
tests; none of them is a sentence of that set). What changed, with the limit of each:

- **No wait for a card the code already has.** An either-or whose two options the code reads whole is made at once,
  with no model call ("No AI needed"). Before, 12 such cards waited about 3 s for the on-device model and then
  showed the pair read in code. The model is still asked when the reading breaks off, and "whole" is a check of where
  a side ends, not of its sense (`CLAIMS.md` row 2).
- **The family's own entries first.** They stand before a model's general words, and exactly three of them share one
  card at "2 at a time" (in today's on-device run "Where shall we go on Sunday?" read *lake / church / hardware
  store*). Four or more are paged as before; nobody has checked three tiles at that level with a person with aphasia
  (row 14).
- **A general word gives way to the family's own kind of it**: "jacket" to "tweed jacket", "chair" to the one
  rocking chair in About me. Only when About me holds exactly one such entry, by its last word or a short table. The
  sample family has none, so its cards are unchanged (row 44).
- **"How are you feeling?"** keeps good / so-so / bad, and its way out now leads to *sad / tired / in pain*. "Sad" is
  on the second page, not the first (row 34).
- **"Where do you want to go?" with cloud help only** offers the family's places first, the cloud's general ones
  after; the cloud still gets the question alone. Only for a plain question about going out (row 43).
- **Headlines.** Options that share no word and are each something to do get "what to do" where the card said "which
  one"; a yes / no headline no longer reads "that's one you liked". "Which one" remains for two long things with
  nothing in common (row 1).
- **"…, or is Carol watching her show?"** offers "Carol's show", not "watching her show" (row 31).

Checked at commit `30db57a` on localhost: unit tests (1858), `e2e:noconfig` 25/25, `e2e-cloud.mjs` 28/28,
`e2e-ondevice.mjs` 43/43 in a Chrome with Gemini Nano, `shots.mjs` 139/139 (`devlog/evidence_r10/`); five of the new cards were also
asked by a script in Chromium 148 and Chrome 157 at `66c4574`, with no page error (not saved as a log). **The hosted copy has them since 17 Nov, 19:05 UTC** (the first attempt at 18:42 UTC stopped at the Firebase sign-in, `deploy_attempt_2026-11-17_30db57a.txt`): <https://talk-partner.web.app> serves the same bundle as a local build of `4d7edee`, `e2e-cloud.mjs --url` 28/28 and `e2e-needs.mjs --url` 12/12 there at 19:06 UTC (`devlog/evidence_live/`), and the page loads in Chromium 148 and Chrome 157 with no crash and no page error. **The cloud step did not hold that evening:** the organiser of our fifth review ran the same script against the hosted copy at 19:53 and 19:54 UTC and got 17/27 and 26/28 (one cloud card of four; the weekend card took 28.2 s, "who to call" made no card, Remote Config timed out once), and three runs of ours at about 20:20 UTC got 16 or 17 of 27. The cause and the change are under [Where the AI runs, in detail](#where-the-ai-runs-in-detail). After the change (build of `2c5673e`, 20:55 UTC) the cloud step still made no card from our machine: 18/27 at 20:56 and 14/27 at 21:17 UTC, the attestation refused both times. The classes were found by a simulation and
fixed by the people who read its results; a new sealed set would be the real test.

It also corrects **the partner**, quietly, where a rule can tell: two questions in one become "One thing at a time: showing the first"; a memory question becomes "You know this one: tell, don't test."; a "you don't want …, do you?" question is asked the plain way ("Do you want …?"), so that a yes on the card means yes. The person is never corrected. The partner screen opens on that: "It corrects how you ask. It never answers for them." (the limits of both halves are in `CLAIMS.md`, row 11).

## For judges: 60 seconds

```
npm install && npm run dev        # then open http://localhost:5179/#/demo
```
No account, no sign-in. What you get depends on what the copy has:

| This copy has | What works |
|---|---|
| nothing (a bare clone, no `.env.local`) | every card that code decides alone: coffee or tea, yes / no, the feeling scale, the body map, the memory coaching, "We're stuck". An open question gets an honest "No card". Also the quick-needs board (the microphone and the feedback form need project settings and are not there). The page contacts no host but the app's own (`npm run e2e:noconfig`, 25 checks, the board with the network switched off) |
| the Firebase web config in `.env.local` (see **Run**) | the above, plus cloud help for open questions once you turn it on |
| the config and desktop Chrome with Gemini Nano | the above, plus the private step on this computer: open questions answered with the family's own names and places, nothing sent |

Hosted copy: <https://talk-partner.web.app/#/demo>. It is the build of commit `188f03b`, deployed 17 Nov 2026, 23:04 UTC (the simple view at the bare address is in it), with our project settings, so it is the second or the third row of this table, depending on your browser. **Cloud help on the hosted copy is not reliable as of 17 Nov, 23:11 UTC:** from our machine reCAPTCHA Enterprise refuses the App Check attestation (HTTP 403 at 21:20 UTC; "ReCAPTCHA error" in the console at 23:11), and without a valid App Check token the service gives no answer, so `e2e-cloud.mjs --url` got 18/27 and 14/27 at the build of `2c5673e` and 15/27 at this one (the same script on localhost, with the debug token, 28/28 at this commit); the card says "Cloud help could not confirm this browser". We do not know yet whether a browser on another network passes (`devlog/evidence_live/appcheck_probe_2026-11-17_2c5673e.md`). Both rows were recorded on the hosted copy at earlier builds (`devlog/evidence_live/`): the cloud step in a browser without the model, last at the build of `4d7edee` (28/28 at 19:06 UTC), and the on-device step in a Chrome that has Gemini Nano at `deebc94` (at `30db57a` the on-device script was run on localhost, `devlog/evidence_r10/`; the labelled set at `7dd16a1`, on localhost; on the hosted copy the first step was last watched by hand at the build of `8810f8f`: `devlog/DAY13.md`). In a browser without Gemini Nano the "Sample family" line ends with **See what the on-device step makes →**: a recording of that step from our machine, labelled as a recording.

`#/demo` loads a made-up family (Frank; Carol asking) and opens with one card already made, so the first thing on screen is a card and not an empty pane: "Do you want coffee or tea?", read in code, no model, nothing sent (its chip is lit). **Then the first step runs by itself, with no click:** as soon as the on-device model has loaded (about 3 s when it is already in the browser's memory, 16 to 22 s right after a browser start; the card takes about 3 s more, and the status line says where it stands), the app asks "What do you want to do this weekend?" and Gemini Nano makes the card on this computer from About me ("lake / church" in the recorded run), with the badge "On this computer" from the SDK's `inferenceSource`. That step is made with cloud help left out, whatever the setting, so nothing can be sent by a step you did not click; it stands down if you ask or type anything first; and if the model gives no card, the first card stays and the status line says so. **In a browser with no Gemini Nano nothing runs by itself:** the status line says "No Gemini Nano in this browser, so the on-device step can't run here. The card shown is made in code." (or "… is not downloaded …", with the download link), and everything else is as before. Under the question box are one-tap questions, in three groups (open question: a model proposes / the app corrects the partner / read in code, no AI); each chip shows the short form, the hover text has the full question and what to look for. Under every card, in reading order: the badge with what left this computer, the coaching line if any, the line to say, the card on the right, then **Why this card**, **Where each step ran**, **What was sent**, the **privacy receipt** and the session line. In judge mode those panels are one closed line under every card, the first included, **"How this card was made: …"** (who decided; how many choices code kept, added and dropped); one click opens all three, and the receipt is closed below it (until 17 Nov, evening, they stood open under the first card). Click these, in order:

| Click | What you see | Badge |
|---|---|---|
| **What do you want to do this weekend?** (the first chip; with Gemini Nano this card has already appeared by itself) | an open question: the choices are not in the question, so a model has to propose them. **With Gemini Nano in this Chrome:** the private step runs on this computer with the About-me lists and the card offers the family's own places ("lake / church" in the recorded runs); the badge line names them: "nothing left this computer · lake, church from About me". **Without Gemini Nano:** no card, and an offer to use cloud help with the question only | On this computer, or No card |
| **What would you like for dinner?** | the same on this computer: the family's own foods, "pot roast / chili" | On this computer, or No card |
| **Cloud help: off** (top bar) → read the consent screen, tick, **Turn on cloud help**, then the weekend and dinner questions again (in a browser without Gemini Nano, or the card stays on this computer) | the stripped question goes to Gemini through Firebase AI Logic (`PREFER_IN_CLOUD`), which has never seen About me: the choices are general ("stay home / go out", "meat / fish" in the recorded runs; the words vary). This is the difference between the two steps, on one question; "What was sent" shows the question as it went ("Partner asks: …", after the swap) and the size of the request, and "Show the exact request" opens the request this app handed to the SDK; the **privacy receipt** below the judge box shows its size and the names withheld | Cloud help (question only) |
| **Who should we call tonight?** (with cloud help only: when the cloud answers; in the organiser's two runs of 17 Nov it made no card) | *Jenny / Tyler / someone else*; Carol lives there, so she is not offered. This card looks the same with either step: on this computer the model reads the names in About me; with cloud help only, the cloud answers "family / a friend" and code on this computer puts the names in. It shows the rule, not the model | On this computer, or Cloud help (question only) |
| **Do you want coffee or tea?** | the card is read from the question in code; the pane on the right is what the person sees ("Show to person" makes it full screen). Under it, behind "How this card was made", **Why this card**: one line with what the model proposed (nothing here: no model needed), what code kept, added or dropped and by which rule, and who decided | No AI needed |
| **How was therapy today, and did you eat?** | the coaching line "One thing at a time: showing the first"; the first question is a feeling scale; **Next: second question** shows "Did you eat?" as yes / no | No AI needed |
| **We're stuck** (on any card) | the fixed repair card on the person's side: show me / write it / draw / later / change topic, and the partner line "Let's try another way"; a tap gives the partner the next move for that way; "Back to the choices" returns | No AI needed |
| **Where does it hurt?** | body map, two steps, never AI; "your left arm" is the person's own left | No AI needed |
| **What year did we get married?** | no card: a memory question is never a quiz; the coaching line "You know this one: tell, don't test" and the line to say instead | No card |
| **Should we ring Jen or Tyler?** | the either-or is read in code and nothing is sent; "Jen" is a nickname from About me, so the tile gets the person picture. (The swap of a name for `Person A` shows only when a question with a name goes to cloud help: type "What should we get Jenny for her birthday?" with cloud help on and no Gemini Nano; recorded in `devlog/ondevice_proof_1/RUN_LOG.md` §5) | No AI needed |

**What each badge means.** The two AI badges ("On this computer", "Cloud help") and the offline one come from the SDK's `inferenceSource` for that call; "No AI needed", "Made in code (AI answer not used)" and "No card" come from the card rules:
- **On this computer**: the private step (`ONLY_ON_DEVICE`) answered and the SDK reported `ON_DEVICE`.
- **Cloud help (question only)**: the stripped step (`PREFER_IN_CLOUD`) answered and the SDK reported `IN_CLOUD`. Only then does "What was sent" say *sent*.
- **Ran on this computer (offline)**: the stripped step fell back to the device (SDK reported `ON_DEVICE`); nothing left.
- **No AI needed**: code decided the card and no model was called for it (yes / no, an either-or whose two options the code reads whole, three options named in the question, feeling, pain, body map, memory, an open "when" question).
- **Made in code (AI answer not used)**: a model was asked and the card is code's all the same. Since 17 Nov this is rare: only an either-or whose reading in code breaks off ("put the radio" + "on for you", "walk down" + "to the library", the tail of a name) still asks the on-device model to copy the two options out of the question; if its copy fails the check, the pair read in code is used, and nothing of the model's answer is on the card: not the choices and not the headline (`tests/unit/sim-classes.test.ts`, group 12). Until 16 Nov such a card read "No AI needed" although it had waited about 3 s for the model (`core/receipt.ts`, `badgeKind`; `tests/unit/sim-e-classes.test.ts`, group E-10). When the model's copy is what the card shows, or only a model read the question as yes / no, the badge names the step that ran. Before 17 Nov every either-or longer than nine words or with a comma asked the model: in our second rehearsal run of set E, 12 cards on this computer waited about 3 s and then showed the pair read in code. Now a pair whose sides stand whole in the question is the card at once (`wholePair` in `core/rules.ts`; `tests/unit/sim-e2-classes.test.ts`, group E2-1). The limit: "whole" is a check of where each side ends, not of sense, so a clumsy reading that ends cleanly ("cupboard / tartan one" for "the big blue blanket from the cupboard or the tartan one") is shown at once too, with no model's copy to replace it.
- **No card**: blocked; the partner is told to ask normally.

After the badge, one line that is always on screen says what left this computer for this card ("nothing left this computer", or "the question left this computer, 1 name and 0 other About me words swapped out", or, when a cloud request was made and failed, "cloud help was asked and failed: the question may have left this computer"); it is read from the same recorded request body the receipt counts. On a card made on this computer it also names the choices that came from About me.

Under every card, **"Where each step ran"** lists the private step, the cloud step and the rules, each as *ran on this computer / ran in the cloud / did not run (why) / failed (why)*. A step that did not run says so. In judge mode it is behind the one summary line under every card; on the partner screen it sits, with "Why this card", "What was sent" and the receipt, inside one closed fold, **"How this card was made"**, so the partner sees only the question, the line to say, the card and the actions. Nothing is removed, only folded.

**One number.** In judge mode, under the chips, one figure at display size says what left this computer this session. It reads "0 bytes left this computer" for as long as no cloud request has been handed to the SDK: that is the case on a bare clone, with cloud help off, and for every card made on this computer; once cloud help is on, the app has asked Firebase Remote Config for its settings, so the line then reads "0 bytes of any question left this computer" and names that request as not counted (in our recorded runs no host but the app's own was contacted for any of them; loading the page itself is not counted, and the line says so). Once the cloud has answered, the figure is the size of the requests the app handed over and it is called "handed to cloud help"; a request that failed after it was handed over is shown as "may have left", never as 0. The paragraph "How this is counted" is folded behind one link in the receipt.

**Privacy receipt** (judge mode and `#/how`): per session, the size of the requests this app handed to the SDK for the cloud step (the question after the swap, the fixed instructions, the schema, the model name and mode) and the names withheld. It is counted on the recorded request (`core/receipt.ts`), not estimated from the question, and the counted text is in the export so you can check it by hand. It is not a capture of the wire: the SDK's own format, the headers and the App Check token are not counted. "Checked after" searches the sent text once more for About-me words and photo bytes.

**Why this card** (every card; one line, open on `#/how`, behind the summary line under every card in judge mode, inside "How this card was made" on the partner screen): the model's parsed proposal (topic, kind, choices, copied options) and which step made it, the labels code kept, the labels code added and where from ("people from About me"), every proposed choice that is not on the card with the rule that removed it ("negative wording", "lives here: never offered for a call or a visit", "over the limit at this support level"), who decided, and where the headline came from. `Card.why` is written in `core/pipeline.ts` at the moment each rule runs, on the values it ran on; `tests/unit/day5.test.ts` checks that every kept or added label is on the card and every dropped one is not.

**States you can force:** cloud leg = turn on cloud help (`#/cloud`); no-model state = any browser without Gemini Nano shows the private step as "did not run" on every open card; offline fall-back (needs Gemini Nano in this Chrome) = with cloud help on, switch the network off and type "Which shirt for the doctor?": the badge reads "Ran on this computer (offline)". Without Gemini Nano there is nothing to fall back to: the cloud step shows as failed and there is no card.

**Honesty notes.** The on-device step was first run on 16 Nov 2026 (Gemini Nano in desktop Chrome 157, through Firebase AI Logic `ONLY_ON_DEVICE`); the recorded run, with the SDK's `inferenceSource` per call, the hosts contacted and screenshots, is the run saved in `devlog/ondevice_proof_1/` (`RUN_LOG.md` there), made by `scripts/e2e-ondevice.mjs`. It is one machine and one made-up family, not a measurement of card quality. The sample family is made up. The pre-period prototype is listed in `DISCLOSURE.md`; the git tag **`pre-contest`** marks the import commit that holds exactly the carried-over files.

### Every Firebase AI Logic call, by file and line
Checked by `tests/unit/judge-path.test.ts` (each line must still contain the snippet), so this table cannot go stale silently.

| Where | Line holds | What it is |
|---|---|---|
| `web/src/ai/firebaseEngine.ts:52` | `from 'firebase/ai'` | the only import of the SDK in the repo (guarded by `tests/unit/no-direct-model-calls.test.ts`) |
| `web/src/ai/firebaseEngine.ts:103` | `getAI(` | the AI Logic instance of the private step: its own Firebase app with no App Check, so a card made on this computer contacts no host |
| `web/src/ai/firebaseEngine.ts:109` | `getGenerativeModel(` | private step model |
| `web/src/ai/firebaseEngine.ts:110` | `InferenceMode.ONLY_ON_DEVICE` | its mode: family data must never fall back to the cloud |
| `web/src/ai/firebaseEngine.ts:122` | `getAI(` | the AI Logic instance of the cloud step (Gemini Developer API backend), on the app that has App Check; it uses the App Check session token (limited-use tokens per request were tried on 17 Nov and taken out the same day, see "Where the AI runs, in detail") |
| `web/src/ai/firebaseEngine.ts:128` | `getGenerativeModel(` | stripped step model |
| `web/src/ai/firebaseEngine.ts:129` | `InferenceMode.PREFER_IN_CLOUD` | its mode: no profile data, so an offline fall-back to the device is safe |
| `web/src/ai/firebaseEngine.ts:156` | `initializeDeviceModel(` | the one-time download of the private helper, from a user gesture |
| `web/src/ai/firebaseEngine.ts:170` | `generateContent(` | private step call (also the warm-up: one fixed sentence, no About me) |
| `web/src/ai/firebaseEngine.ts:171` | `inferenceSource !== InferenceSource.ON_DEVICE` | the private step rejects any answer not from the device |
| `web/src/ai/firebaseEngine.ts:186` | `getGenerativeModel(` | summary step model ("Today in short", `core/summary.ts`): the day's answers, on the same no-App-Check app as the private step |
| `web/src/ai/firebaseEngine.ts:187` | `InferenceMode.ONLY_ON_DEVICE` | its mode: the person's answers never fall back to the cloud; where the browser has no model the app's rules write the summary |
| `web/src/ai/firebaseEngine.ts:191` | `generateContent(` | summary step call |
| `web/src/ai/firebaseEngine.ts:192` | `inferenceSource !== InferenceSource.ON_DEVICE` | the summary step rejects any answer not from the device |
| `web/src/ai/firebaseEngine.ts:214` | `generateContent(` | stripped step call |
| `web/src/ai/firebaseEngine.ts:219` | `inferenceSource === InferenceSource.ON_DEVICE` | the badge source for the stripped step |
| `web/src/ai/firebaseEngine.ts:231` | `getGenerativeModel(` | voice step model: the same cloud model, asked only for the words of a recording (`{"transcript": string}`) |
| `web/src/ai/firebaseEngine.ts:232` | `InferenceMode.ONLY_IN_CLOUD` | its mode: the SDK's on-device step takes text and JPEG / PNG only, so sound cannot run on the device; the app says "cloud" before the first use |
| `web/src/ai/firebaseEngine.ts:248` | `generateContent(` | voice step call: one per recording, the sound as `inlineData` (WAV), after a yes to the notice |
| `web/src/ai/firebaseEngine.ts:251` | `inferenceSource === InferenceSource.ON_DEVICE` | where the recording was turned into text, from the SDK's report |
| `web/src/ai/firebaseEngine.ts:262` | `getGenerativeModel(` | wording step model on the device ("plainer words" for the insight lines and the tip of the day, `core/reword.ts`), on the same no-App-Check app as the private step |
| `web/src/ai/firebaseEngine.ts:263` | `InferenceMode.ONLY_ON_DEVICE` | its mode: the prompt may hold the carer's health notes, so there is no cloud fall-back; without a model the rules' own words stand |
| `web/src/ai/firebaseEngine.ts:267` | `generateContent(` | wording step call on the device |
| `web/src/ai/firebaseEngine.ts:268` | `inferenceSource !== InferenceSource.ON_DEVICE` | the on-device wording step rejects any answer not from the device |
| `web/src/ai/firebaseEngine.ts:285` | `getGenerativeModel(` | photo step model ("Talk about a photo", `core/phototalk.ts`): one of the family's own photos and a fixed instruction, on the same no-App-Check app as the private step; the carer starts it with one button |
| `web/src/ai/firebaseEngine.ts:286` | `InferenceMode.ONLY_ON_DEVICE` | its mode: a family photo has no cloud path, in any mode; on a phone and wherever the browser has no model, the rules write the questions from the photo's word |
| `web/src/ai/firebaseEngine.ts:293` | `generateContent(` | photo step call: the picture as `inlineData` (JPEG), which the SDK's on-device step hands to Gemini Nano as an image |
| `web/src/ai/firebaseEngine.ts:294` | `inferenceSource !== InferenceSource.ON_DEVICE` | the photo step rejects any answer not from the device |
| `web/src/ai/firebaseEngine.ts:306` | `getGenerativeModel(` | wording step model for online help: the insight lines the rules wrote, called only after a yes on the sheet that shows the exact text (`web/src/main.ts`, `sendInsights`) |
| `web/src/ai/firebaseEngine.ts:307` | `InferenceMode.PREFER_IN_CLOUD` | its mode: the text holds no name, no health note and nothing of the diary (`core/insights.ts`, `insightCloudText`) |
| `web/src/ai/firebaseEngine.ts:312` | `generateContent(` | wording step call through online help |
| `web/src/ai/firebaseEngine.ts:315` | `inferenceSource === InferenceSource.ON_DEVICE` | where the lines were worded, from the SDK's report |
| `web/src/ai/firebaseEngine.ts:332` | `getGenerativeModel(` | Read aloud model (`core/speak.ts`, added 18 Nov, phase 5): a Gemini text-to-speech model, asked for the words on one card as sound; called only after the carer turned Read aloud on, on a sheet that says what goes |
| `web/src/ai/firebaseEngine.ts:333` | `InferenceMode.ONLY_IN_CLOUD` | its mode: the SDK has no on-device speech, so the mode says what happens, and the sheet says it first |
| `web/src/ai/firebaseEngine.ts:337` | `generateContent(` | Read aloud call: one per card text (the sound is kept, so "Hear it again" sends nothing); never a doctor-visit card |
| `web/src/ai/firebaseEngine.ts:342` | `inferenceSource === InferenceSource.ON_DEVICE` | where the words were spoken, from the SDK's report |
| `web/src/ai/firebaseEngine.ts:364` | `new FirebaseEngine(` | lazy start: Firebase is initialised on the first AI call, so loading the app with cloud help off contacts no Google host (with cloud help on, Remote Config is asked at load: see "Firebase Remote Config" below) |
| `web/src/ai/app.ts:32` | `initializeAppCheck(` | App Check, required by AI Logic for cloud requests; started by the first cloud call (a card, a recording) or the first feedback note, never at page load |
| `core/pipeline.ts:733` | `ran: r.source` | the private step's trace line is the engine's report |
| `core/pipeline.ts:848` | `ran: r.source` | the stripped step's trace line is the engine's report |
| `core/pipeline.ts:878` | `const sent = r.source === 'in-cloud'` | "sent" is claimed only when the SDK said the cloud answered |
| `web/src/main.ts:769` | `function badge(` | the badge is drawn from `card.source` and the card's step trace only (`badgeKind` in `core/receipt.ts`) |

## One documented cut
The model used to write more of the card than it does now, and we took that away on evidence, not taste. In the 9–10 Nov prototype (pre-period, disclosed in `DISCLOSURE.md`; its numbers are not results of this build) the on-device model wrote the spoken line and the choices. A blind rater applying four strict checks to 50 questions passed **16 of 50** cards: in 19 the spoken line was choppy or still named a choice code had removed, and 12 four-choice cards had no way out (run 3 of our pre-period validation notes, which are not in this repository). So the model lost the spoken line, the escape and the right to decide the card: code builds the line from the final choices, adds exactly one way out, and keeps the model to a topic, a kind and at most three candidate words. The same rater passed 39 of 50 three runs later, with the same model. The cut carried into this build and grew: on the first real end-to-end run against Firebase AI Logic (day 1), the cloud's answer to a weekend question was "stay home / go out", a pair that answers nothing, so on a *where* question with places in About me a generic pair is now dropped and the card is completed from About me (`dropGenericWhere`, `sourceFill`; `tests/unit/open-sources.test.ts`); on a "what do you want to do" question that pair can still appear, and the way-out tile covers it. And an either-or card never trusts the model's copied options alone: in the 35 injected engine states of `tests/unit/engine-matrix.test.ts` (7 scripted model behaviours × 5 cloud states; these are stand-ins, not observed model output) "Do you want coffee or tea?" reads coffee / tea / something else under the headline "drink" in all 35. Since 16 Nov a plain either-or like that one runs no model at all, and since 17 Nov neither does any either-or whose two options the code reads whole. Every cut is visible per card in "Why this card".

## Look-alikes, named
Checked on the primary pages on 11 Nov 2026, Livox on 17 Nov (the same list is on `#/how`). Two of them start from the partner's question: the Livox project detects a question and shows pictograms to the person using Livox, and Lingraphica Conversations listens to the partner and suggests replies to the person. Turning a question into choices is therefore not new. What we did not find is that step for adults with aphasia as a supported-conversation card (written choices, a way out every time, a tick/cross check), together with coaching for the partner on the question itself and the family's own entries read on the computer. Each is good at something we borrow from or answer. This is what we found, not proof that nothing else exists.

| Product | What it does | Where Talk Partner differs |
|---|---|---|
| [Lingraphica Conversations](https://lingraphica.com/resources/introducing-conversations/) (24 Jun 2026) | Transcribes the conversation partner's speech and suggests keywords and replies to the device user; Lingraphica Hub devices, adults over 18, English, internet needed; "Conversations doesn't save your input after you close out of the tool" | The other side of the table: the partner's question becomes a choice card, and the person's reply is never drafted |
| [Lingraphica Smart Folders](https://lingraphica.com/resources/new-smart-folders-tool/) (10 Nov 2026) | A folder title and a description become dozens of suggested pictured cards in seconds, in the Talk tool, for building folders (a focus-group user: "10, 15 minutes to do it on our own, and that took a minute and a half") | One card per question, in the conversation, ending in a tick and a recap; any browser; the private step on this computer. Card generation is one feature away from a partner mode for them, which is why this is named here |
| [AACessTalk](https://arxiv.org/abs/2409.09641) (CHI 2025; [code](https://github.com/naver-ai/aacesstalk-monorepo)) | "Real-time guides to the parent to engage the child in conversation" and "contextual vocabulary cards to the child"; minimally verbal autistic children; 11 pairs over two weeks | Adults with aphasia; the partner's own question is rewritten (split, de-quizzed) and shown as choices; the answer is never written for the person. The closest ancestor, and the one we learned the partner-side coaching line from |
| [Livox, a student project at Worcester Polytechnic Institute](https://sites.google.com/view/livox-mqp/home) (© 2020) | "Livox is a pictogram-based alternative communication application"; the project "incorporated a ML and NLP-based classifier to detect specific questions and present the most relevant pictograms to users", for people with "a wide range of visual and motor impairments" | The same starting point, a question someone asks. Talk Partner is for adults with aphasia and works on the partner's side: written choices with a way out on every card, the line to say, coaching when the question itself is the problem (two in one, a memory test), and the family's own people and places read on the computer |
| [Tobii Dynavox TD Snap Aphasia](https://us.tobiidynavox.com/pages/td-snap-aphasia) | A Whiteboard, "a shared space for people with aphasia and their communication partners", rating scales, word lists, scripts, a "Communication Breakdown Repair" activity; no AI on that page. Tobii's [RESNA session on AI in AAC](https://www.resna.org/Events/Events-Calendar/tech-tuesday-with-tobii-dynavox-1) (22 Sep 2026) asks for "clearly defined, user-centered use cases" | The same shared screen, written for each question as it is asked; the model only ever touches the partner's question; a fixed repair card on every card. We agree with the caution: nothing generative reaches the person's side |

Not verified by us and therefore not quoted: a 14 Oct 2026 interview in which Tobii Dynavox is reported to say it keeps generative AI out of its language systems.

## Where the AI runs, in detail
The routing table is at the top of this file. The rest of what is true about the two steps:

**Why `gemini-3.5-flash-lite` for the cloud step** (`core/models.ts`): the stripped question needs a topic and two or three words back, so a small current stable model is enough. It is not on the Firebase AI Logic list of models "no longer recommended" (release note of 5 Oct 2026: `gemini-3.5-flash`, `3.6-flash` and `3.7-flash`, not the Lite model), and from 1 Dec 2026 Firebase routes `gemini-2.5-flash` requests to it (release note of 2 Nov 2026). Read at <https://firebase.google.com/support/releases> on 16 Nov 2026.

`inferenceSource` is read on every response: the AI badges come from it, and the private step rejects any
answer that didn't run on the device. Questions that code can answer alone (yes / no, an either-or read whole in code, feeling, pain,
body map, memory questions) run no model. The model only proposes; code decides.

The private step runs on its own Firebase app instance with no App Check, so a card made on this computer contacts no
host at all (in the recorded runs, on localhost and on the hosted copy: 0 requests outside the app's own host for
every on-device card). App Check starts
with the first cloud call and gives the cloud step its session token. For most of 17 Nov the cloud step asked for a
limited-use token per request instead (`useLimitedUseAppCheckTokens`). That evening reCAPTCHA Enterprise refused our
test browsers after many automated runs (HTTP 403, "App attestation failed") and, with limited-use tokens, the SDK
then throws before it sends anything: the hosted copy made no cloud card (`e2e-cloud.mjs --url` 16 or 17 of 27, three
runs; the organiser of our fifth review saw 17/27 and 26/28). With the session token one attestation serves
about an hour of requests in that browser, where limited-use tokens needed one per request; replay protection, the
only thing limited-use tokens add, is a console setting we have not switched on. **The session token does not rescue
a browser reCAPTCHA refuses.** When the attestation fails the SDK still sends the request, with a placeholder token
(`@firebase/app-check` 0.13.1, `getToken`: "always resolves"). We expected the service to take it while App Check is
not enforced in the console. Measured on 17 Nov, 20:45 UTC, it does not: the same request got 200 with a valid App
Check token, and 400 "Firebase AI Logic genai config not found" with no token or with the placeholder. So in such a
browser there is no cloud card. The card says "Cloud help could not confirm this browser, so there is no card. Load
the page again and try once more, …"; App Check's message and the service's stand under "Where each step ran"; and
no second request is made, because after a 403 App Check refuses every try for a day, until the page is loaded again
(`namedAppCheckFailure` in `web/src/ai/app.ts`, `cloudRetryWait` in `core/pipeline.ts`). What was measured, step by step:
`devlog/evidence_live/appcheck_probe_2026-11-17_2c5673e.md`. Why reCAPTCHA began to refuse our machine that evening
we do not know (many automated runs from one address is a guess), nor whether a judge's browser passes. One availability probe (`LanguageModel.availability`, a capability query, no inference) is
the only direct touch of Chrome's API. Firebase's own guide to hybrid inference on the web checks the same flag
(`await LanguageModel.availability();` in its setup steps, <https://firebase.google.com/docs/ai-logic/hybrid/web/get-started>,
read 17 Nov 2026), and the one availability method in the SDK we have installed (`ChromeAdapter.isAvailable`,
`@firebase/ai` 3.1.0) is documented with "These methods should not be called directly by the user".

**What the on-device step does that the cloud step cannot.** It is the only step that sees About me. In the recorded
runs "What would you like for dinner?" gives *pot roast / chili* on this computer and general foods from the cloud
(*meat / fish*, *chicken / fish*; the cloud's words vary), and "What do you want to do this weekend?" gives
*lake / church* on this computer and *stay home / go out* from the cloud. A card whose every answer is an About-me
entry stays on this computer even when cloud help is on. On our labelled set this is the whole difference: of the
18 open questions, a matching card with the family's own entries was made on this computer in 12, 13 and 12 cases in three runs at commit
`7dd16a1` (15, 16 and 15 of 18 matched in all; in three runs at `2aeb1d0` an hour earlier, 13 and 16 each time), and
rules alone made none (`devlog/evidence_r11/heldout_at_7dd16a1/`, `heldout_at_2aeb1d0/`; the runs before the rule changes of 17 Nov are in
`devlog/evidence_r8/heldout_at_c346d3d/`; our own labels, and a set the rules have since been changed around).

One kind of cloud card is completed on this computer: on a call / visit / invite question (and "who do you want to
see / meet / have over") the cloud's
general words ("family", "a friend") are replaced in code by the people About me names, minus whoever lives here, so
with cloud help only "Who should we call tonight?" reads *Jenny / Tyler* too. That is why the judge path does not
open on that question: it shows a rule, not the model. The cloud still gets the question alone: no name,
no label, no count of people (`dropGenericWho` in `core/rules.ts`, `tests/unit/who-and-more.test.ts`). The same is done for places on a plain "where shall we go" question (`placesFirst`; `CLAIMS.md` row 43). And when a
card shows two choices at a time, a third good one is no longer dropped: it waits on a next page, reached by the
way-out tile or "Next: more choices"; the family's own entries stand first, and exactly three of them share one card (a filler word, or a model's guess after two of the family's own entries, is
dropped: `CLAIMS.md` row 14).

One kind of question is not sent at all, although cloud help is on: an open question that turns on a swapped-out
About-me word ("What do you need from the hardware store?" would go as "from the Place A"). A step that never sees
About me could only guess there, so the question stays on this computer: a card the on-device step made is kept,
otherwise there is no card and the reason is on screen. The rule is narrow on purpose (a what-question with
"from <an About-me place, food, show or thing>"); "What should we plant at the allotment?" still goes, swapped.

**Firebase Remote Config** (`web/src/ai/remoteConfig.ts`, `core/models.ts`, `remoteconfig.template.json`). Three
values can be changed in the Firebase console without a new build: the cloud model's name (`cloud_text_model`) and
the two thresholds of the rule that sends a card made on this computer for a cloud second opinion
(`route_mood_words`, `route_min_choices`). The code holds a default for each (`gemini-3.5-flash-lite`, 2 and 2), and
those run whenever Remote Config is not asked, has not answered yet, fails, or sends a value the app cannot run on
(not a Gemini text model name, or a number outside 1 to 3 and 2 to 3): a refused value is shown as refused, never
used. No card waits for the answer. It is asked only when cloud help is on, once per page load, because the settings
concern the cloud step only and a page with cloud help off must contact no host but its own; the request holds the
app id and a Firebase installation id, no question and nothing from About me, and the consent screen says so.
**How this works** (`#/how`) shows the three values in use and, for each, whether it came from Remote Config or is
the default in the code. What Remote Config cannot change is the boundary: which step may see About me is fixed in
code. The template in the repository is the one published to our project (`npx firebase-tools deploy --only
remoteconfig`); today its three values equal the defaults, so it changes nothing yet. Checked by
`tests/unit/remote-config.test.ts` and, against the real service, by `scripts/e2e-cloud.mjs` (not asked with cloud
help off; with its hosts blocked a card is made at once on the defaults; reachable, the three values read "from
Remote Config" and the cloud request names that model).

**Limits, stated.** One development machine, one made-up family, one run per question: this shows the path works, not
how good the cards are. After a browser start the model has to load: the app warms it up at page load with one fixed
sentence, and that took 16 to 22 s in the four starts we timed (15.8, 17.0, 18.2 and 21.7 s from page load to
"Ready"; the status line says "getting ready… up to half a minute" meanwhile,
and code-decided cards work). After it a single on-device answer took about 3 s (median 3.1 to 3.3 s on the labelled
set, 5.4 s at the slowest), and a card that also asks the cloud 6 to 13 s in our own runs; in a run by the organiser of our fifth review on 17 Nov one cloud card took 28 s. The privacy swap covers About-me entries, relation words and, for
names About me does not list, a guess by the shape of the word: a capitalised word, the word after a title ("Dr.
Patel", "aunt linda"), a lowercase word that is not in our list of everyday English words ("call mike back"), and a
word that is also a first name where it stands like one ("did may call?"). The kind of place stays ("Name A
Street", "Name B Hospital"). A word-name where our rules do not look ("a cake for hope"), a health detail and
anything that is not a name are sent as typed when cloud help is on, and an English word the list lacks is swapped
although it is no name (`CLAIMS.md` row 6 has both lists); the consent screen says that the swap of unlisted names
can miss one and that anything else typed is sent as written. `npm audit` reports 4 high advisories, all in the gRPC package
under `@firebase/firestore`, which this app does not import.

## Screens
- **Simple view** (`/`, the default since 17 Nov; rebuilt that evening after the owner could not tell on his phone
  who holds it and what the person does: `design/USER_FIRST.md`, `design/topics_2026-11-17/`). **The first screen**,
  top to bottom: the hope line ("When the words won't come, let Frank point.", with the name from About them, else
  "them"; never a default "him"); **Needs it now?** (the quick-needs board, one tap); **How it works: 4 steps**, a
  highlighted block with a picture per step and the line "Wait. Count to ten. Don't answer for them." (open on the
  first visit; one highlighted line after the first confirmed answer, remembered in this browser); **seven topics**
  (Food & drink, Body & care, Rest & sleep, People & family, Feelings, Today & plans, TV, music & hobbies), each
  opening 5 to 7 one-tap questions, 41 in all, 40 of them made by the rules (`core/topics.ts`); "Or ask your own
  question" with the field, the microphone and "Show them the choices"; one line on what the AI is for and where it
  runs on this device; one small privacy line. The family's own questions from About them are added under the generic
  one, never in its place ("tea or coffee" stays; "pot roast or chili" comes under it), and each person who does not
  live there gets one yes / no row ("Would you like to call Jen?"). **Before handing over:** "1 Say it out loud" with
  the line, "2 Turn the phone to them" with the main button, the "wait" line again, and what they will see.
  **The person's screens:** "Point to your answer" and the question itself, no category word, one column of
  full-width choices (at most three and the way out; the word under its picture), then "So: tea. Right?" with "Yes" /
  "No, something else", then "Thank you. Tea." and one button, "Give the phone back". The carer's way back before an
  answer is a labelled control that needs a press and hold (Enter with a keyboard). **After an answer:** what they
  chose, "Ask another question" as the main button, the next question where a "yes" would lead nowhere (pain → where →
  which side → how bad; "is something bothering you" → what it is about; "call someone" → one name), About them
  offered once (after the first card, never before), today's answers and **Today in short** with a Copy button.
  **After "something else":** what to do now (show or write it, the next question of the topic, the needs board, a
  new way, "We're stuck"), and **Narrow it down**, where an AI suggests the next choices (`core/narrow.ts`; on a
  phone that is online help, asked first). A question that needs online help while it is off brings up a sheet: the
  exact line that would go, what else is in the request, what can be missed, what is never sent, the data use, and
  two buttons of the same size; nothing is asked of any other host before a yes. With no connection the same
  question says "This question needs the internet, and you are offline", and everything the rules make still works.
  About them is four rows over the same fields. Light by default, dark when the system asks for it; the person's
  screens are always white. The words say "this phone", "this tablet" or "this computer" by what the browser reports.
  It draws less than the full view and computes nothing about a card: the same `makeCard` makes every card
  (`web/src/simple.ts`, `core/simple.ts`). **Nobody it is for has tried it**: one owner on his phone and three review
  seats on a mockup. "How it works inside" opens the full view below and the browser keeps that choice; "Simple
  view", first among its links, goes back. Judge mode and the full view keep their own person screen (below).
- **Installed, and offline** (since 17 Nov): a web app manifest (`web/public/manifest.webmanifest`: Talk Partner,
  standalone, icons) and a service worker (`web/sw.template.js`; the file list of the build is written into it by
  `vite.config.ts`) that keeps the app shell. After one visit the page, the topic questions, quick needs, the
  person's screens and About them open with no connection; the worker never handles a request to another host and
  holds nothing of the family. Checked in Chromium with the connection off (`scripts/pwa-check.py`); **not tried on
  a real phone's "Add to Home screen", and not on iOS**.
- **Partner screen** (the full view; `/#/demo` opens it in judge mode whatever view was chosen): in the top bar, **Quick needs** (the board below, in one tap); next to the question
  field, where the browser can record, a microphone for the partner's own question (through Firebase AI Logic) (the words go into the
  field and wait there). Above the question field, up to three one-tap chips with the questions answered most
  often ("Asked before:", read from "Answers so far" on this computer; none until an answer has been confirmed, and
  not in judge mode, where the sample chips stand and answers are not kept); then the question, the coaching line when a rule found one, the line to say, "Show to person",
  "Hide the choices", "Next", "Recap", "We're stuck", the badge, "Why this card", "What was sent" (one line: the question after the swap, and
  the size of the request; the exact request handed to the SDK, or what would have been sent, is one click further) and "Where each step ran".
  "Show to person" lifts the card: the white pane grows into the whole screen in a quarter of a second (a view
  transition on the card itself; none under reduced-motion settings or where the browser has no view transitions).
- **Person screen** (`#/person`, in the full view and judge mode; the simple view has its own, above): only the keyword, two or three big tiles (with a picture where one is drawn, the word alone otherwise), one way out, then "So: lake. Right?"
  with yes / change. The exit is top-right and needs a press-and-hold. "We're stuck" replaces the card with the fixed
  repair card (show me / write it / draw / later / change topic); a tap gives the partner the next move for that way.
- **Quick needs** (`#/needs`): the person's screen with one fixed board, eight needs and the way out, each a
  picture and its word; a tap is checked with the tick and the cross like any choice. No AI, nothing sent. A confirmed
  need is in the session recap and is not kept in "Answers so far".
- **About me** (`#/about`): names, people (name, relation, lives here, photo, nickname), foods, places, TV, music, other.
  Saved only in this browser (IndexedDB). "Delete everything on this computer" also resets cloud help consent.
  **Answers so far**: each answer the person confirms with the tick is kept here, on this computer only. When the
  same question is asked again the partner sees one quiet line ("Last time (yesterday) they chose "lake". Ask again
  all the same: today's answer is theirs."); the person's card never shows it, no card is made from it and no cloud step ever gets it (since 17 Nov today's answers are read on the device by the narrowing step and by "Today in short", where the browser has Gemini Nano)
  (`core/history.ts`, `tests/unit/history.test.ts`). With the sample family it lasts until judge mode is left.
  The same list feeds the "Asked before" chips on the partner screen: a chip holds the question only, and a tap asks
  it again like a typed question (so with cloud help on, an open question goes the usual way; the earlier answers do not).
- **Cloud help** (`#/cloud`): off by default. The consent screen shows what is sent (the last question in the exact
  payload form), who receives it, what is never sent, and the data-use terms; one checkbox turns it on, one tap turns it off. In the simple view the same switch is the "Yes" button of the sheet an open question brings up, which carries the same facts in fewer words.
- **Judge mode** (`#/demo`): a made-up family, a first card already on screen (coffee or tea, read in code), then, where the browser has Gemini Nano, the first open question asked by the app itself and answered on this computer, one-tap questions of each kind, and per card a "where each step ran" line
  built only from what the SDK reported (`inferenceSource`), one click away under every card. A step that did not run says so and why. Nothing claims
  on-device unless the device answered. **How this works** (`#/how`): the two steps, a diagram, the session tally,
  the last card's trace and "why", and the look-alikes named above.

## Layout
- `core/`: the shared card logic (rules, privacy swap, prompts, schema, sample family, **`copy.ts`: every string a
  person reads**). Pure TypeScript, no DOM, no Firebase, so every client reuses it unchanged.
- `web/`: the web client. `web/src/ai/` is the only place that imports `firebase/ai` (`firebaseEngine.ts`) and
  `firebase/remote-config` (`remoteConfig.ts`). `pictos.ts` holds the colour
  pictures, all drawn by us (provenance and licence per picture in `PICTOGRAMS.md`); `store.ts` is the IndexedDB wrapper;
  `voice.ts` is the microphone's state machine (record, stop, send the clip once through the engine; no DOM, so it
  is tested with a scripted microphone, recorder and engine); `mic.ts` is the browser's side; `feedback.ts` the form. `core/needs.ts` is the quick-needs board.
  `web/src/simple.ts` draws the simple view (the carer's screens and the person's); `web/sw.template.js` is the service worker, `web/public/manifest.webmanifest` the manifest.
- Phase 3: `core/reliability.ts` (the answer check), `core/diary.ts` (the diary), `core/insights.ts` (health notes, what
  stands out), `core/reword.ts` (plainer words: the one job a model has there), `core/tip.ts` (the tip of the day),
  `core/backup.ts` (About them in a file); `web/src/diary.ts` draws their screens.
- `core/tree.ts`: the conversation trees (what comes after every answer). `core/prefs.ts`: what is learned by
  counting. `core/photos.ts` and `web/src/photo.ts`: the family's own photos. `core/kinds.ts`: the kinds of answer the
  narrowing card may offer.
- `core/topics.ts`: the topics and their questions, the family's own questions, what to ask next after an answer.
  `core/narrow.ts`: the narrowing card after "something else" (AI, both steps). `core/summary.ts`: "Today in short"
  (on-device AI, or the rules).
- `tests/unit/`: unit, property and matrix tests, plus a guard that fails on any direct model API call.
  `engine-matrix.test.ts` runs seven card shapes through every combination of on-device model state and cloud
  state; `card.property.test.ts` and `strip.property.test.ts` are seeded property tests over random questions,
  model output and About-me profiles.
- `tests/unit/needs.test.ts`, `tests/unit/voice.test.ts`: the board (tiles, pictures, no engine, whose side says
  what) and the microphone (notice, record, stop, the 15 s limit, an empty clip sends nothing, each error, what the app says
  about where the sound goes).
- `scripts/e2e-cloud.mjs`: an end-to-end check of the cloud step against the real Firebase project.
  `scripts/e2e-ondevice.mjs`: the same for the on-device step, in a Chrome that has Gemini Nano (it wrote
  `devlog/ondevice_proof_1/`). `scripts/e2e-noconfig.mjs`: a copy with no settings at all.
- Comments that cite "build spec §…" refer to our internal build specification, which is not part of this repository;
  every rule it names is implemented in `core/` and tested in `tests/unit/`.

## Run
```
npm install
cp .env.example .env.local   # fill in the Firebase web config; for localhost, an App Check debug token
npm run dev                  # http://localhost:5179
npm run check                # lint + typecheck + unit tests
npm run build                # production build + check that no debug token is bundled
node scripts/e2e-cloud.mjs   # with the dev server running: real Firebase AI Logic end-to-end (cloud step)
node scripts/e2e-noconfig.mjs # starts its own server with no settings: rules-only cards from a bare clone, and the quick-needs board with the network off
python3 scripts/e2e-simple.py     # with `npm run build && npx vite preview` running: the simple view in a browser, as a phone, a desktop and a tablet, and with the connection off; since 18 Nov also Back / Home and the browser's back button, what the app learns, and the family's photos (342 checks; --live for a hosted copy: it then never presses "Yes"; --dev for the dev server, which has no service worker)
python3 scripts/pwa-check.py      # the same server: the manifest as Chrome parses it, Chrome's installability check, the service worker, the app with the connection off (30 checks)
python3 scripts/overflow-check.py # with either server running: nothing runs off the side at 320, 360, 390 and 412 px (the simple view at all four, the full view from 360; 329 checks)
python3 scripts/update-check.py   # after npm run build: serves copies of dist/ on its own port and swaps build A for B, C and D under an open browser: the new build arrives (11 checks)
python3 scripts/picture-sheet.py  # every bundled picture on a sheet at 390 px -> devlog/evidence_pictures/
python3 scripts/phase2-shots.py   # with the preview server running: the screens added on 18 Nov at 390 px -> devlog/evidence_phase2/
node scripts/contrast-check.mjs   # the simple view's colours, read from the stylesheet: text 4.5:1, controls 3:1, light and dark (97 pairs)
node scripts/e2e-needs.mjs   # with the dev server running (or --url <a hosted copy>): the quick-needs board with the network off, the microphone's notice
node scripts/e2e-ondevice.mjs --port 9335   # with the dev server and a Chrome that has Gemini Nano on that debugging port
node scripts/eval-heldout.mjs             # the labelled set in eval/, rules alone; add --port 9335 for the real app with the on-device model; the report goes to devlog/eval_runs/
node scripts/shots.mjs       # with the dev server running: screenshots of every screen at 390 and 1280 px + layout checks; the quick-needs board; voice input against a scripted recognition object
node scripts/fonts-check.mjs # with the dev server running: no request leaves the app host; the three self-hosted families load from /fonts/
```
### Deploy (Firebase Hosting)
Last done on 18 Nov 2026, 05:14 UTC: <https://talk-partner.web.app> serves the build of commit `421dae0` (the three
fixes of the third role-play: every first-letter tile starts with the letter and the conversation's kind comes
first; "Who is it about?" and the questions about the telling after "I want to tell you something"; the doctor-visit
screen names the person). Each of the 20 served files has the SHA-256 of the local build, and `/` equals
`dist/index.html`. Against it: `e2e-simple.py --live` 551/551 (the phase 4 run is 87 of them; no "Yes" is pressed on
a sheet, and that run asked nothing of any other host); `pwa-check.py` 30/30; `e2e-needs.mjs` 12/12
(`devlog/evidence_live/`, the files with `421dae0` in the name). Not run against this build: the full
`overflow-check.py` (its phase 4 screens 108/108 on localhost at the same code; the other 402 were last run at
`2396775`), `update-check.py`, `e2e-noconfig.mjs`, `e2e-cloud.mjs`, `e2e-ondevice.mjs`, and `e2e-phase4-ai.py`
(last at `9ff3e9d`; the letter step's request and the photo step did not change, the order and the labels of the
rules' words did).

The deploy before it, 18 Nov 2026, 05:02 UTC: <https://talk-partner.web.app> serves the build of commit `43e9293` (phase 4:
the first-letter helper, "[Name] wants to say something", "Before a doctor visit", "Talk about a photo"). Each of
the 20 served files has the SHA-256 of the local build, and `/` equals `dist/index.html`
(`devlog/evidence_live/served-files_live_2026-11-18_43e9293.txt`). Against it: `e2e-simple.py --live` 547/547 (as a
phone at 390 px with the navigation, learning, photo, phase 3 and phase 4 runs, a desktop and a tablet, and the phone
flow again with the connection off, the four phase 4 steps among them; no "Yes" is pressed on a sheet there, so
nothing was sent: for the letter "X" the sheet came up with its one line, the whole request held no word of About
them, and the phase 4 run asked nothing of any other host); `pwa-check.py` 30/30; `e2e-needs.mjs` 12/12
(`devlog/evidence_live/`, the files with `43e9293` in the name). Not run against this build: `overflow-check.py` on
the hosted copy (503/503 on localhost at the same code), `e2e-cloud.mjs` and `e2e-ondevice.mjs`, and the phase 4
steps against real models on the hosted copy (they ran on the dev server at `9ff3e9d`, where the App Check debug
token works: `devlog/evidence_phase4/AI_RUN_LOG.md`; on the hosted copy the on-device photo step and the cloud
letter step have not been pressed by anyone).

The deploy before it, 18 Nov 2026, 04:13 UTC: <https://talk-partner.web.app> serves the build of commit `3a9cf34` (the answer
check never discounts pain, the toilet or a need and is quiet in a fast flow; every "Drank" tap counts; tied days are
all named). Each of the 20 served files has the SHA-256 of the local build, and `/` equals `dist/index.html`. Against
it: `e2e-simple.py --live` 459/459 (the same runs as below; it asks "Are you in pain?" while the answer check is on
and finds no line and no mark; no "Yes" is pressed on a sheet); `pwa-check.py` 30/30; `e2e-needs.mjs` 12/12
(`devlog/evidence_live/`, the files with `3a9cf34` in the name). Not run against this build: `overflow-check.py` on
the hosted copy (402/402 on localhost at the same code), `e2e-cloud.mjs` and `e2e-ondevice.mjs`, and no wording step
against a real model.

The deploy before it, 18 Nov 2026, 03:52 UTC: <https://talk-partner.web.app> serves the build of commit `d04e530` (phase 3:
the diary, health notes, what stands out, the answer check, the tip, About them in a file, bigger pictures; the
full view's empty card area in words; the five role-play fixes, the paid tier's data-use line among them). Each of
the 20 served files has the SHA-256 of the local build, and `/` equals `dist/index.html`. Against it:
`e2e-simple.py --live` 454/454 (as a phone at 390 px with the navigation, learning, photo and phase 3 runs, a desktop
and a tablet, and the phone flow again with the connection off; it never presses "Yes" on a sheet there, so neither
an open question nor the insight lines were sent, and the phase 3 run asked nothing of any other host);
`pwa-check.py` 30/30; `e2e-needs.mjs` 12/12 (`devlog/evidence_live/`, the files with `d04e530` in the name). Not run
against this build: `overflow-check.py` on the hosted copy (402/402 on localhost at the same code), `e2e-cloud.mjs`
and `e2e-ondevice.mjs`, and no wording step against a real model.

The deploy before it, 18 Nov 2026, about 02:20 UTC: <https://talk-partner.web.app> serves the build of commit `b9c7602` (the
conversation trees, what the app learns, the colour pictures, the family's photos, Back and Home, and the update
path: "Added on 18 Nov"). Each of the 20 served files has the SHA-256 of the local build. Against it:
`e2e-simple.py --live` 341/341 (as a phone at 390 px, with the navigation, learning and photo runs, a desktop and a
tablet, and the phone flow again with the connection off; it never presses "Yes" on the sheet there, and the photo
run asks no other host and posts nothing); `pwa-check.py` 30/30; `e2e-needs.mjs` 12/12
(`devlog/evidence_live/`, the files with `b9c7602` in the name). Not run against this build: `overflow-check.py` on
the hosted copy (329/329 on localhost at the same commit), `e2e-cloud.mjs` (App Check has been refusing our machine's
browser on the hosted copy since 17 Nov; on localhost the narrowing step ran through the real cloud model,
`devlog/evidence_phase2/narrow_cloud_real_localhost.txt`) and `e2e-ondevice.mjs`. A phone that opened the site before
this build has no update code yet: it needs one reload; from this build on a new deploy arrives by itself
(`scripts/update-check.py`).

The deploy before it, 18 Nov 2026, 00:48 UTC, served the build of commit `fb1b3ba` (each of the
20 served files has the SHA-256 of the local build; the manifest, the icons and the service worker are among them).
Against it: `e2e-simple.py --live` 225/225 (the rebuilt simple view as a phone at 390 px, a desktop and a tablet, and
the phone flow again with the connection off; no page error, nothing off the side; it never presses "Yes" there);
`pwa-check.py` 30/30 (the manifest as Chrome parses it, Chrome's installability check, the service worker, the app
offline); `e2e-needs.mjs` 12/12; `overflow-check.py` 293/293 (320 to 412 px); `e2e-cloud.mjs` 19/27, because App Check refused
our machine's browser again ("Requests throttled due to previous 403 error"): the eight that fail are the ones that
need a cloud card from this machine (`devlog/evidence_live/`, the files with `fb1b3ba` in the name; at the build
before, `188f03b`, 15/27). On localhost at the same commit the cloud script passes 28/28, and a narrowing card was
made by the real cloud model (`devlog/evidence_topics/narrow_cloud-card_localhost.txt`). The last full pass of the
cloud script on the hosted copy was at the build of `4d7edee`, 17 Nov, 19:06 UTC. The on-device
script was last run against the hosted copy at an earlier build, `deebc94`. The steps, for another project:
```
# 1. console: create a reCAPTCHA Enterprise key (website; domains talk-partner.web.app, talk-partner.firebaseapp.com)
#    and set it as the App Check provider of the web app; turn on Hosting
# 2. .env.local: VITE_RECAPTCHA_ENTERPRISE_SITE_KEY=<the key id>
npx firebase-tools deploy --only hosting      # runs npm run build:hosting first; it refuses to build without the key
node scripts/e2e-cloud.mjs --url https://talk-partner.web.app/      # the cloud step, end to end, on the live site
node scripts/e2e-needs.mjs --url https://talk-partner.web.app/      # the quick-needs board with the network off, and the microphone's notice
node scripts/e2e-ondevice.mjs --port 9335 --url https://talk-partner.web.app/   # the on-device step on the live site, in a Chrome with Gemini Nano
```
The page itself (`/` and `/index.html`) is sent with `Cache-Control: no-cache` (`firebase.json`), so a browser that had
the site open before a deploy gets the new build on its next visit; until 17 Nov `/` was cached for an hour.
A production build never contains the App Check debug token (`scripts/check-dist.mjs`), so without the site key a
deployed copy has no cloud step: code-decided cards and the on-device step still work there. `build:hosting` stops
before that can happen by accident.

Hidden route for the timed trial in `devlog/TRIAL_PROTOCOL.md`: `#/trial` (a stopwatch and log, kept in this browser, exported as CSV).
On-device inference needs desktop Chrome with Gemini Nano (Chrome's hardware and disk requirements apply).
Without it, yes / no, either-or, feeling and pain cards still work, and open questions use cloud help only if the partner turns it on.
Without `.env.local` the same cards work and open questions get no card.

## Sources for the first lines
[^1]: National Institute on Deafness and Other Communication Disorders, "Aphasia" (page last updated 16 Apr 2025): "About 2 million people in the United States are living with aphasia, according to the National Aphasia Association." <https://www.nidcd.nih.gov/health/aphasia>, read 16 Nov 2026.
[^2]: Haley KL, Hardy LE. "Is Communication Training for Significant Others a Reasonable Rehabilitation Goal in Aphasia Therapy?" *American Journal of Speech-Language Pathology* 2025;34(2):782-797. <https://doi.org/10.1044/2024_AJSLP-24-00472>. Abstract read in the PubMed record (PMID 39913273) on 16 Nov 2026: "less than 3% [of the goal samples] involved any form of communication partner training"; "Almost all SLPs (97%) reported engaging in CPT with family members ... most explained that CPT was typically handled without goal setting" (156 speech-language pathologists in the United States). A survey of clinicians, not a count of families.
[^3]: Aphasia Institute, "Communication Tools: Communicative Access & Supported Conversation for Adults With Aphasia (SCA™)", <https://www.aphasia.ca/communication-tools-communicative-access-sca/>, read 17 Nov 2026: "Aphasia is a language problem that masks a person's inherent competence, and most dramatically affects conversational interaction (talking and understanding), as well as the ability to read and write."; under "Acknowledge Competence": "People with aphasia need others to believe they are competent and have more understanding and social skills than may be apparent." This is the premise of the method, stated by its authors; it is not a measured harm, and we have found no figure for one that we could read at its source.

## Licence
Apache-2.0. Pre-existing work is listed in `DISCLOSURE.md`.
