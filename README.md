# Talk Partner

About 2 million people in the United States live with aphasia[^1], and the people who talk with them every day are
rarely taught how: when practising speech-language pathologists sent in samples of their therapy goals, fewer than 3%
involved any communication partner training, although 97% of those surveyed said they do some with families, mostly
without a written goal[^2]. What that leaves at stake, in the words of the Aphasia Institute's page on Supported
Conversation: aphasia "masks a person's inherent competence", and people with aphasia "need others to believe they
are competent and have more understanding and social skills than may be apparent"[^3]. A partner who answers for
the person, or tests them, is the everyday way that competence stays hidden (the last sentence is our reading, not
the Institute's words).

**For judges: criterion → section → proof**

| Criterion | Section | Proof |
|---|---|---|
| Technological implementation | [Where the AI runs](#where-the-ai-runs-firebase-ai-logic-hybrid-inference), [How we built it](#how-we-built-it-one-ai-logic-call-three-legs-measured) | the data classes routed in code (`web/src/ai/firebaseEngine.ts`); the phase-16 table (the typed field, then named "Ask in your own words": rules 0/18, Gemini Nano 15/18, online 13/18; our labels, dev server); the AI step at taps 2 and 3 on a phone; the phase-17 letter-by-letter table (10 cases) |
| Design | [For judges: 60 seconds](#for-judges-60-seconds), [Screens](#screens) | the person's screen (big pictures, "So: tea. Right?"); Back one step at a time on the paths `scripts/phase12-walk.py` and `phase17b-walk.py` walk (judge round 13 found the phone's Back skipping a step on letter screens; the phone's Back does nothing in the full view) |
| Potential impact | the first lines, [Sources](#sources-for-the-first-lines) | NIDCD, Haley and Hardy 2025, the Aphasia Institute; every safety line rules-made; the health lines judge rounds found have a test on their worst case (`tests/unit/phase13.test.ts`, `phase15.test.ts`, `phase17.test.ts`); no clinician has read them; no trial with people yet |
| Quality of the idea | the paragraph below, [Look-alikes, named](#look-alikes-named) | it coaches the partner, not the person; the AI is split by data class, not by device |

After a stroke, many adults with aphasia understand what is said but can't find the words to answer.
**Talk Partner coaches the partner, not the person.** It helps the partner ask in the way Supported Conversation
materials describe (our reading; no speech therapist has reviewed it): it says when the question itself is the
problem (two things in one, a memory test), and it turns the partner's own question into a
written-choice card (a keyword, two choices, pictured where we have drawn a picture, an escape every time, a
tick/cross check) and gives the partner the exact line to say. It never picks the answer; a tap on the card confirms it, and the app asks the carer to hand the phone over for that
tap. Pictures (131 and the monogram since 22 Nov: 91 colour pictures made with Gemini and our own colour drawings for the rest; the source of each in `PICTOGRAMS.md`): yes / no, feelings, the body
map, people, drinks and food, rest, TV and music, going out, the ways out, the needs of the quick-needs board. The
family's own places and foods ("lake", "pot roast") show the family's own photo where one was added, and the word
alone otherwise.

**Three kinds of data, three places they may go** (the hybrid split, fixed in code, not a setting): what the family
wrote about the person (names, lists, photos, health notes, the diary, the answers) is read by a model only on the
device (`ONLY_ON_DEVICE`, Gemini Nano in desktop Chrome), or by no model; the partner's question with every
About-them word swapped out may go to the cloud (`PREFER_IN_CLOUD`) after a yes on a sheet that shows the exact
line; the words on one card may go to the cloud to be spoken (Read aloud, `ONLY_IN_CLOUD`) after a yes on a sheet
that says so. What the app says about health (what stands out, when to call) is rules and fixed text, never a model.
The app itself sends the diary, the health notes and the answers nowhere, and there is no server of ours to send
them to. Since phase 6 the carer can share a text of the diary with the family or the next carer: the text is built
by rules on the device, shown in full on a sheet first, and leaves only through the app the carer picks (the phone's
share sheet, or the clipboard). No model reads it or is handed it.

Based on Supported Conversation for Adults with Aphasia (SCA) principles. Not a therapy, not a diagnosis.

## Where the AI runs (Firebase AI Logic hybrid inference)
**Family data → `ONLY_ON_DEVICE`; the stripped question → `PREFER_IN_CLOUD`, which falls back to Gemini Nano when
offline on a desktop Chrome that has it (on a phone, offline or refused, "Type your question. We make picture answers." shows the rules' nearest card, labelled "Made by the app's rules (no AI)"); `inferenceSource` drives every badge.** Every model call goes through Firebase AI Logic, the
optional microphone included (it sends the partner's recorded question to Gemini, `ONLY_IN_CLOUD`, for its words). The
code is in **`web/src/ai/firebaseEngine.ts`**. See [Added on 17 Nov](#added-on-17-nov-quick-needs-voice-input-feedback).

| Step | Gets | Mode | Why |
|---|---|---|---|
| Private card | question + the family's About-me lists | `ONLY_ON_DEVICE` | Family data must never fall back to the cloud. `PREFER_ON_DEVICE` would send this prompt to the cloud while Gemini Nano is missing or downloading. |
| Narrowing card, after "something else" (`core/narrow.ts`) | on the device: the question, the choices that did not fit, today's answers so far, About me. In the cloud: the question and the choices that did not fit, About-me words swapped out; never the answers | the same two steps: `ONLY_ON_DEVICE` first, else `PREFER_IN_CLOUD` when the carer has turned online help on | The person chose the way out, so an AI suggests the next, broader choices (two levels at most). The same card rules check them, and the screen says an AI made this follow-up. Since 18 Nov a proposed choice that is more of the kind already refused is dropped, and when fewer than two are left the rules make the broader choices and the card says so (`core/kinds.ts`). On the device the prompt may also hold what was learned by counting (`core/prefs.ts`); the cloud text never does. |
| "Today in short" (`core/summary.ts`) | today's confirmed answers | `ONLY_ON_DEVICE` (`summarizeDevice`), no cloud step | Two to four sentences for the family or the therapist. The answers are personal: where the browser has no Gemini Nano, the app's rules write the summary and no model gets them. |
| Plainer words for the week's and the month's lines and for the tip of the day (`core/reword.ts`; [phase 3](#added-on-18-nov-phase-3-the-diary-health-notes-what-stands-out-the-answer-check-a-tip-a-copy-in-a-file)) | on the device: the lines the app's rules wrote, and the carer's health notes as context. In the cloud: the insight lines only, as shown on a sheet first; no name, no health note and no diary entry (the lines carry dates and counts taken from the diary), and since phase 5 no line that says whom to tell or when to call | `ONLY_ON_DEVICE` (`rewordDevice`); on a device with no model, `PREFER_IN_CLOUD` (`rewordCloud`) after a yes on that sheet, each time | What is counted, the thresholds and the red flags are rules. A model only rewords, and code checks its words (no new or dropped number, no name, no medical or advising word, never "more to drink", and since phase 5 the same call / doctor / nurse words and no word that plays the line down); otherwise the rules' words stay. Neither step has run against a real model yet. |
| First-letter words, only when the rules find fewer than two (`core/letter.ts`; [phase 4](#added-on-18-nov-phase-4-the-first-letter-the-person-starts-before-a-doctor-visit-talk-about-a-photo)) | on the device: the question, the letter, what did not fit, About me, the usual answers. In the cloud: the question with About-me words swapped out, and the letter; never what was refused or learned | `ONLY_ON_DEVICE` where the browser has Gemini Nano; else `PREFER_IN_CLOUD`, only after a yes on a sheet that shows the text | The person points to a letter; a model may add everyday words that start with it. Code keeps a word only if it starts with the letter, is no invented name, and is not alcohol, tobacco or a medicine. |
| "Talk about a photo": what is in the picture (`core/phototalk.ts`) | one of the family's own photos (a 320 px JPEG) and a fixed instruction | `ONLY_ON_DEVICE` (`lookDevice`), no cloud step, after the carer's tap | A family photo has no cloud path. The model names things; code drops every word about a person and makes one choice question. On a phone the rules write the questions from the photo's word. |
| Read aloud (`core/speak.ts`; [phase 5](#added-on-18-nov-phase-5-after-judge-round-6)) | the words on one card: its question and its choices, names on it included; the voice and the style | `ONLY_IN_CLOUD` (`speak`), a Gemini text-to-speech model; only after the carer turned it on on a sheet that says what goes | The one AI step a phone can use on every card. The SDK has no on-device speech, so the mode says what happens. Off by default; never a doctor-visit card; a card that was read aloud says so. |
| Stripped card | the question with every About-me word swapped for "Person A", "Place A"… and a word that looks like a name the family didn't list (a capitalised word, the word after a title such as "Dr.", a lowercase word that is not an everyday English word) swapped for "Name A" | `PREFER_IN_CLOUD` | Holds no profile data, so an offline fall-back to the device is safe. |

**On a phone there is no on-device step today.** Chrome's built-in Gemini Nano exists in desktop Chrome only, not on
Android or iOS, and a carer mostly holds a phone. So on a phone the topic questions, quick needs, the person's screens,
About them and "Today in short" are made by the app's rules with no AI, and a question the carer types that the rules
cannot turn into choices (an open question) uses online help, asked for at that moment on a sheet that shows the exact
line that would go. Home says this in one line under "See the AI at work" ("Phone: Google's AI, online, after your yes"), and the line
under the question box says it again ("Google's AI, online, after your yes. Google checks this browser first."). Neither the narrowing step nor "Today in short" has been run against the real Gemini Nano yet: on the device both
are tested with scripted engines only. The narrowing step has two recorded runs through the real cloud model on
localhost and none on the hosted copy (`CLAIMS.md`, rows 53 and 54).

### Where the sponsor runs on a phone
A carer mostly holds a phone, and Chrome's Gemini Nano is not on phones. So on a phone every AI step is a cloud call
through Firebase AI Logic, each behind a sheet that shows what goes, and the card rules do the rest:

| On a phone | Firebase AI Logic call | When | Run against the real model |
|---|---|---|---|
| **Read aloud**: the question and the choices of the card, spoken on the person's screen (`core/speak.ts`) | Gemini text-to-speech (`gemini-3.8-flash-tts`), `ONLY_IN_CLOUD`, the words of that one card, the voice and the style | every card the carer shows, the 40 topic questions and the needs board included, once the carer turned it on on a sheet ("The words on this card, including names on it, go to Google to be spoken. Nothing else."); off by default; never a doctor-visit card | yes, on localhost: `leg=speak mode=ONLY_IN_CLOUD inferenceSource=in_cloud`, 4.4 s for about 8 s of sound ("Would you like tea or coffee? Tea. Coffee. Or something else."), "Hear it again" asked nothing, 10 of 10 checks at `de631b1` on the dev server with the App Check debug token (`devlog/evidence_phase5/AI_RUN_LOG.md`); on the hosted copy our headless test browser was refused by App Check (no sound; see Deploy) |
| A question the carer types that the rules cannot turn into choices | `PREFER_IN_CLOUD`, the question with About-them words swapped out | after "Just this once" or "Yes, every time" on the sheet | yes (`devlog/evidence_live/`, on the hosted copy at `4d7edee`; on `479ce07` a judge's headless phone browser got it once, judge round 11, seat 05) |
| **Find more choices** (phase 14): the second button under "Show them the choices" on a topic card, and the second way after "something else" (`core/findmore.ts`, `core/narrow.ts`) | the same step: `PREFER_IN_CLOUD` with `onDeviceParams`, the question and the choices on the card, About-them words swapped out; on a laptop with Gemini Nano the `ONLY_ON_DEVICE` step instead, About me in it, nothing sent | after "Just this once" on its sheet; never on pain, the body, feelings, a red flag or the crisis line | the narrowing request: yes, on localhost (`CLAIMS.md` rows 53, 79); the new wording ("On the card already"): the cloud half ran on the hosted copy at `479ce07` in a judge's run (judge round 11, seat 05: a card "something cold / something to eat"); the on-device half not yet against the real Nano |
| Words for a first letter the rules have fewer than two for | the same step | after "Just this once" on its sheet | yes, on localhost (`CLAIMS.md` row 79) |
| "What stands out" in plainer words | `PREFER_IN_CLOUD`, the counted lines only | after "Just this once", each time; never a line that says whom to tell or when to call | no |
| The carer's spoken question as text | `ONLY_IN_CLOUD`, one recording | after a yes to its notice | yes, on the hosted copy at `40fedec` |

What a phone never gets: the on-device step (the family's own names and places in an open question's choices), and
"Talk about a photo" by a model. What needs no AI on a phone, by design: the topic questions and their trees, quick
needs, "Something new or sudden?" and every line about health, the diary, the doctor-visit page. With Firebase AI
Logic taken out, those still work; what goes is every voice, every open question and every plainer wording.


### How we built it: one AI Logic call, three legs, measured
**The same button: on a laptop, Gemini Nano reads your family's names on the device; on a phone, the cloud gets the question with the names you listed swapped out (other names are guessed).** The
open-question step is built once in `web/src/ai/firebaseEngine.ts` (`PREFER_IN_CLOUD`, with `onDeviceParams` for the
same schema), next to the private `ONLY_ON_DEVICE` step that alone gets About me. We ran the 18 open questions of our
labelled set (`eval/heldout_r2.json`; who, where, what: the questions rules cannot answer) through each leg on 23 Nov
2026 (24 Nov, 03:06 to 03:12 UTC), on a working copy of `175e5d2` with 132 uncommitted files (the reports say so), the dev server, the sample family as it was then (before Beth joined it in phase 15):

| On the 18 open questions | Rules alone (no model) | On this computer: Gemini Nano, `ONLY_ON_DEVICE`, online help off | Online: `PREFER_IN_CLOUD`, fresh profile, no Nano |
|---|---|---|---|
| a card with two or more answers | 0/18 | 18/18 | 16/18 |
| the card matched our label | 0/18 (no card is the right answer without a model) | **16/18** | **12/18** |
| matched, with the family's own entries | 0/18 | 13/18 (read by the model from About me) | 7/18 (put back by code on the device after the answer: the request held "Person A", never a name) |
| a card that is wrong by our label | 0/18 | 2/18 | 4/18 |
| no card (the carer is told to ask it as a choice) | 18/18 | 0/18 | 2/18 |
| SDK report | none | `inferenceSource=on_device` | `inferenceSource=in_cloud` |
| time from submit to card, median (range) | 0.3 ms (0.1–2), Node, no browser | 3703 ms (3497–4315) | 1072 ms (869–2484) |
| hosts other than the app's own | none | none | the AI Logic host, App Check, reCAPTCHA |
| the 42 questions the rules decide | 40/42 | 40/42 | 40/42 |

Commands: `node scripts/eval-heldout.mjs`, `--port 9335` (Chrome 157 on this Mac, the profile that has Gemini Nano),
`--cloud` (Chrome 158, a throwaway profile the script starts, headless). Reports: `devlog/evidence_phase14/eval/`.
**Limits.** One run per leg; the model's answers vary by one or two between runs (the on-device leg gave 15 to 16 in
earlier runs). The labels are ours and the rules have been changed around this set since it was written, so it is a
regression set, not a held-out test, and not a trial with people. The cloud leg ran on the dev server, which uses the
App Check debug provider registered for development; on the hosted copy App Check needs reCAPTCHA in a normal Chrome.
The "Find more choices" request was not part of this run (it is the narrowing request; see the table above).

### Phase 16 (live on 24 Nov as `21bb1e0`, now inside `0852ce8`): "Ask in your own words", measured
**The first action on the first screen is now a field: the carer types the question as they would say it.** The
words go through the same step as every typed question (`core/pipeline.ts`): Gemini Nano on a laptop that has it
(`ONLY_ON_DEVICE`, About them in the prompt, nothing sent), else the cloud (`PREFER_IN_CLOUD` with `onDeviceParams`)
after the consent sheet's yes, with the names you listed swapped out. Two rules stand around it (`core/ownwords.ts`):
words the guard's list recognises about pain, the body, a need, feelings, a warning sign or a crisis never reach a model (a word list: it can miss a wording; phase 17 widened it) (the rules make the card,
with one line saying why and the call box; no "Find more", no Read aloud), and when the AI cannot help (the carer's
"No, not for this question", offline, App Check refusing the browser, a failed call, no AI on the copy) the rules' best card for the
words stands in place of "No card", labelled "Made by the app's rules (no AI)". The field is typed only: the app's
microphone sends a recording to a model before any rule could read it, so it is not on this form. The topics follow
as "Or pick a topic".

Measured on 24 Nov 2026 with `node scripts/eval-heldout.mjs --own` (reports in `devlog/evidence_phase16/eval/`): the
18 open questions of `eval/heldout_r2.json` (`--open`) and 10 everyday questions written the way a carer says them
(`eval/phase16_everyday.json`, labelled before the first run; one is about back pain on purpose). The sample family,
the simple view at 390 x 844, cloud help off, so every cloud card went through the sheet's "Just this once"; on the
device leg the sheet's "No, not for this question" was pressed when it came up.

| "Ask in your own words" | Rules alone (no model) | On this computer: Gemini Nano, `ONLY_ON_DEVICE` | Online: `PREFER_IN_CLOUD`, no Nano |
|---|---|---|---|
| 18 open questions: a card, never a blank "No card" | 18/18 | 18/18 | 18/18 |
| 18 open questions: the card matched our label | 0/18 (18 rules' best cards, which answer a nearer question) | **15/18** | **13/18** |
| 18 open questions: made by an AI (the SDK's `inferenceSource`) | 0/18 | 18/18 | 17/18 (1 rules' best card) |
| 10 everyday questions: the card matched our label | 2/10 | **8/10** | **10/10** |
| 10 everyday questions: made by an AI | 0/10 | 6/10 (2 rules' best cards after "No, not for this question") | 8/10 |
| kept from every model by the guard (the back pain) | 1/10 | 1/10 | 1/10 |
| made by the rules from the words (the either-or) | 1/10 | 1/10 | 1/10 |
| median time from submit to card (18 / 10) | 1.3 ms / 3 ms, Node | 3.7 s / 4.0 s | 1.3 s / 1.3 s, sheet tap included |
| hosts other than the app's own | none | none | the AI Logic host, App Check, reCAPTCHA |

**Limits.** One run per leg; the labels are ours (the everyday set was written by us, not by carers); not a trial
with people. The device leg ran on the production build, the cloud leg on the dev server with the App Check debug
provider, both at `1972661` with later uncommitted changes in the working copy (the reports say so); on the hosted copy
App Check needs reCAPTCHA in a normal Chrome. "Matched" scores a rules' best card as a miss, because it answers the
nearest ready question, not the one typed.

The same question through the two steps, in our recorded run: "What do you want to do this weekend?" gives
*lake / church* on this computer (the family's own places, read from About me by Gemini Nano; nothing sent) and
*stay home / go out* from the cloud, which gets the question only. The details are under
[Where the AI runs, in detail](#where-the-ai-runs-in-detail).

### Phase 17 (live since 24 Nov 2026 about 16:01 UTC as `0852ce8`): the fixes of judge round 12
Judge round 12 (nine seats) found typed health questions that ended on a green tick, App Check's cold start eating the
20 s wait on phones, a first screen that did not say who it is for, and stale lines in these texts. The owner's own
test on his phone added three: a yes to "I would like to something?" ended there, the first letter left the topic
(food, P: pain, priest, photos), and there was no second letter. Every change has a test that failed first at `main`
(`tests/unit/phase17*.test.ts`, logs in `devlog/evidence_phase17/`).
- **Typed health questions** (`core/redflag.ts` `healthOf`, `core/ownwords.ts` `ownAfter`). The guard's word lists now
  take the chest, tightness and pressure, breathing, the face and the smile, an arm, a leg or a hand that feels wrong,
  speech, sight, new confusion, "are you OK", "you look grey", pale, sick, dizzy, a fall, the blood sugar and a limb
  pain: none of them reaches a model or the Read-aloud offer. A word list can still miss a wording. After an answer
  the carer reads one red box with what to do, never a green tick: the chest on any answer but "no" says "call
  [number] now, whatever the amount, even if it has happened before", then "How bad is the pain?"; a stroke sign
  "yes" says call now; "no" or "not sure" is checked by the carer (smile, both arms); a limb pain asks "Is it
  suddenly weak or numb?" first. Such an answer is tagged a warning: "For the next carer" leads with it, "Today in
  short" files it under "Health" (and is written by the rules that day), "What stands out" and the visit page name it,
  and the day gets no tip. The visit page says "call now, whatever the amount" for the head or the chest, and the
  lines for others after "I can't go on" say "Take it seriously, every time", call first. A limb pain whose weakness
  question was skipped still ends on the stroke check. The answer check never marks a request for company, a call or
  a health answer, and never says "may be tired, try again later".
- **App Check** (`web/src/main.ts` `warmCloud`, `web/src/ai/app.ts`). On a phone App Check starts when the question
  field gets the cursor (reCAPTCHA checks the browser; no word of the question goes), never with Chrome's own AI and
  never offline. Cloud requests keep the App Check session token: limited-use tokens (`LIMITED_USE_TOKENS` in
  `web/src/ai/firebaseEngine.ts`) were tried in phase 17 and left off before deploy, because on 17 Nov they meant a
  new attestation per request and a 403 with no card, while the session token is what gave the owner's Android phone a cloud card
  on 21bb1e0 (by hand, no saved log). After a refusal the rules' card stays and **Try Google's AI again** asks once more, with the same yes.
- **The first screen**: "For you and someone with aphasia: you ask, hand them the phone, they point.", the block
  "Type your question. We make picture answers." and the button "Make picture answers".
- **Pictures and checks**: the back drawn from behind; one, two and three filled bars under the pain faces; "Change
  it" opens the emergency number, focused; one call box when an alert carries its own; "So: your left arm. Is that
  it?" beside a side, and "So: yes, you are in pain. Right?" for a yes or a no.
- **The owner's phone test**: a yes or "not sure" to a typed "want / need / like something?" goes on to "Is it about
  food or drink, people, or plans?"; the first letter stays inside the topic (`core/letter.ts` `TOPIC_WORDS`): after
  "tea or coffee?" B gives the family's ginger biscuits, bread and banana (no longer Beth and Bo, who come for a
  question about people or with no topic); **Add the next letter (P…)** narrows letter by letter, and for two
  letters or more the AI is asked with the topic and the letters (on a laptop with Gemini Nano `ONLY_ON_DEVICE`; on a
  phone online after the yes, names swapped, when the rules have no word), its words and the rules' in turn on the card. Never on the body,
  feelings or a health question.

Measured on 24 Nov 2026 (`devlog/evidence_phase17/eval/letters_run3.md`, commit `febbc8a`): ten letter cases in food,
drink, places and people, labelled before the first run; the app's own `letterCard` and `FirebaseEngine` in a
headless Chrome 157 with Gemini Nano, from the Vite dev server (the online leg with the App Check debug provider).

| On the 10 cases | Rules alone | Gemini Nano, `ONLY_ON_DEVICE` | Online, `PREFER_IN_CLOUD` |
|---|---|---|---|
| the meant word on the card | 5/10 | 4/10 | 5/10 |
| the same, other spelling counted | 5/10 | 4/10 | 6/10 |
| a card with at least one word | 7/10 | 8/10 | 10/10 |
| words added by an AI (`by` device / cloud) | 0/10 | 5/10 | 10/10 |
| median time | 0 ms | 3781 ms | 1236 ms |

**Counts** (the production build of phase 17 on `npx vite preview`, port 5179): `npm run check` 3237 unit tests; `e2e-simple.py` 1039/1039; `pwa-check.py` 34/34; `e2e-needs.mjs` 13/13; `overflow-check.py` 552/552; `contrast-check.mjs` 144 of 144 pairs; `phase11-walk.py` 48/48; `phase12-walk.py` 631/631 (with the phase 17 screens at 360 and 390 px, light and dark: Back one step at a time, every way out followed; logs and the phase 17 shots in `devlog/evidence_phase17/`). Not run: `e2e:noconfig`, `update-check.py`, any hosted or headed run.

**What this says.** On these ten cases the AI does not find the meant word more often than the rules: it adds words
the topic list does not hold (it always gave a card online, 10/10 against 7/10), and its words can push the rules'
right word off a three-word card (case 10). It is not yet the part a phone cannot do without. **Not done in this
phase:** the AI's short question for the person's screen (item C of the round's plan: not built); a run of the cloud
leg on the hosted copy; a headed live log at `21bb1e0` or later; the phone's Back in the full view; generic TV and
music in the sample family; any trial with people or a clinician's read-through.

### Phase 17b (live in `0852ce8`): no dead end, in any topic
The owner's rule after his phone test (24 Nov): "this principle works for ANY topic". So the class was fixed, not the
food case. `tests/unit/phase17-deadends.test.ts` walks what the carer's screen does after a confirmed answer
(`core/endstep.ts` `answerStep`, the function the screen now calls): every question of the seven topics on the first
screen, every answer, down every path; the questions of the trees no topic reaches first; a typed "want something?";
the rules' card for typed words the AI could not help with; the cards of more choices; every way out. Each end is a
thing to do (a), a deliberate stop (b), health with a red box or a call line (c), the way out with its ways (w), or a
dead end (d): an answer that names a kind of thing, a yes to wanting one, or a line that asks a question that is no
button, with no next question and no way to find which. Written first, it found 106 dead ends with nothing in About
them and 98 with the sample family (`devlog/evidence_phase17b/deadend_audit_before.md`); after the fixes, 0 and 0
(`deadend_audit.md`).
- **Which one? Find out together:** under the line of an answer that names a kind of thing ("a snack", "hot drink",
  "TV", "go out", "people", a yes to "Are you hungry?") when no question is left (the depth limit of three questions,
  or the question was asked): **More choices like these** of that kind, **Try the first letter** inside that topic,
  and **Ask them to show or write it**. For the body: "Show me where" and the needs board first. "Ask another
  question" is then no longer the main button.
- Lines that asked a question that was no button now lead on: "Did something happen?" no goes to "Is it about food or
  drink, people, or plans?"; a found name leads to "Would you like to call Tyler?" and "Would you like to see
  Tyler?", a found place to "Would you like to go to hardware store?". The rules' card for typed food words ("Would
  you like something to eat or something to drink?") now goes on to "a snack or a meal" or "a hot drink or a cold
  drink". "something sweet" or "a friend" on a card of more choices keeps the ways.
- **The first letter for every topic** (`core/letter.ts`): people get the family's names and family words only (B:
  Beth, brother; never Bo the dog, a food or a place); places the family's places and place words ("the lake" once);
  TV, music and hobbies the family's shows and hobbies; a drink question the drinks first, then the foods of "Food &
  drink"; rest, the body and feelings their own short lists only, and the body and feelings never through a model.
  The letters follow the latest question of the conversation that has a topic, also after a typed question.

Walked at 390 and 360 px on a production build (`scripts/phase17b-walk.py`, `devlog/evidence_phase17b/walk/`), a
target that is not on the first card, driven question, "something else", letters until it shows: food "pancakes"
(P, then PA), drink "lemonade" (L), people "Tyler" (T), places "library" (L), TV "piano" (P, then PI), rest "sofa"
(S), feelings "scared" (S, after "not sure"), body "shower" (S): every one reached, every word on every letter card of
its topic, Back one step at a time to the first screen. The typed path "Would you like something?", yes, "about food
or drink", "Are you hungry?", yes ends on "Bring Frank something to eat." with the three ways, each followed; then
"pancakes" by PA. **Limits:** the classes are our own reading of each line; a model's letter words are checked for
the letter, not for the topic; not tried on a real phone or with carers.

### Phase 18 (the branch `phase18-r13`, waiting for the deploy; the live build is `0852ce8`): the fixes of judge round 13
Judge round 13 (nine seats on the live build `0852ce8`) found a typed crisis question that lost its crisis box on a
"no" or a "good", chest pain that "somewhere else" or "if it is new or sudden" could talk down, "Are your words
worse?" ending on a green tick, "Ask it again" that sent a body card's question to the consent sheet, six hidden
targets ending on a letter card with no word, arm pictures with the person's left on the viewer's right, "Find more"
returning its own prompt's examples, and Read aloud offered on pain cards. Every change has a test that failed first
(`tests/unit/phase18.test.ts`, 68 tests: 58 failed at the start, `devlog/evidence_phase18/failing_first.txt`; and
section 18 of `tests/unit/phase17-deadends.test.ts`). The worst case of every line is a call that was not needed.
- **A crisis** (`core/redflag.ts` `crisisWords`, `core/ownwords.ts` `ownCrisisAfter`, `core/endstep.ts`). Any answer on
  any page of a card made from crisis words ("Do you want to die?", "I can't go on" typed: 17 wordings), "no", "good",
  "not sure" and the way out included, keeps the crisis box with both call buttons and one red line that does not end
  it ("A \"no\" does not end it: stay near, and still make the call."); giving the phone back, or the person's "Not
  now", opens the safety screen; the diary keeps the answer under the carer's words, tagged a crisis. Never "A good
  day. Nothing to fix."
- **The chest and the trunk** (`core/redflag.ts` `redPlace`, `core/tree.ts`, `core/copy5.ts`). "Where in the chest?"
  keeps the call line on every answer, "somewhere else" included. A pain in the upper stomach, the upper back, the jaw
  or a shoulder says "call [number] now, whatever the amount" on every amount, typed or on the body card, never "Ask
  again in an hour". Chest pain left the "new or sudden" list of the red page and the passport for its own line,
  "Chest pain, tightness or trouble breathing: call [number] now, even if it has happened before."; the box over a
  chest question says the same; the diary heads such a line "Call now, whatever the amount, and tell the doctor or
  nurse", and the shared texts open with "Call [number] now, whatever the amount".
- **Speech, face and arm**: 23 wordings ("Are your words worse?", "Is your mouth crooked?", "Do you feel woozy?") are
  guarded and end on the stroke check.
- **"Ask it again"** (`core/later.ts` `laterNode`, `core/laterask.ts`). The card a question was left on comes back:
  the body card with its region, or the guard's card from the carer's words; never a typed question at the consent
  sheet.
- **A letter with no word** (`core/letterways.ts`, `web/src/phase4.ts` `letterWaysBlock`). In this order: the AI for
  the topic and the letters (Chrome's own AI on a laptop, Google's AI online after the same yes; never for the body,
  feelings or a health question), **Write it down together**, **Ask them to show you**, another letter. The lines say
  what happened ("You kept it on this phone.", "Google could not check this browser, so nothing was sent.", with
  **Try Google's AI again** first); "Online help did not answer. Nothing else was tried." is gone, and after "Just
  this once" the sheet no longer comes back by itself. The letters of the person's own start follow its topic (C is
  church in "Today & plans"). After a kind of thing on a card of the AI ("meat"), **Which meat would you like?** comes
  first, asked as the carer's own question would be, then more choices, the letter, show or write.
- **App Check and the wait**: on a phone App Check starts when the app opens, by `warmCloud`'s rules. A retry after a
  failed first try gets what is left of the 20 s (`core/pipeline.ts`), so "It stops by itself at 20 s" holds from the
  moment that line starts (judge round 13 saw a first card at about 26 s).
- **Pictures**: the arm, hand, leg and foot cards are drawn from behind, so "your left arm" is on the viewer's left;
  the three pain faces stay three pictures.
- **"Find more" and Read aloud**: a proposal equal to an example of the request ("something cold", "something to
  eat") is dropped; Read aloud is never offered on the body card, the pain scale, the needs board, a health question
  or a card with a health or crisis choice, so "Pain and warning signs: fixed rules, never an AI." holds on screen.

**Counts** (the production build of phase 18 on `npx vite preview`, port 5179): `npm run check` 3336 unit tests; `e2e-simple.py` 1039/1039; `pwa-check.py` 34/34; `e2e-needs.mjs` 13/13; `overflow-check.py` 552/552; `contrast-check.mjs` 144 of 144 pairs; `phase11-walk.py` 48/48; `phase12-walk.py` 695/695 (631 before) (with the phase 18 screens at 360 and 390 px, light and dark: a typed crisis answered "no" and "good", the chest box, chest then "somewhere else", the red page, the arm card from behind, "Ask it again"; Back one step at a time); `phase17b-walk.py` 178/178 (108 before, with the six targets below at 390 and 360 px). Logs in `devlog/evidence_phase18/`. Not run: `e2e:noconfig`, `update-check.py`, any hosted or headed run.

**Hidden targets of round 13, walked on the rules alone** (`scripts/phase17b-walk.py`, `target18`, App Check cut
off as on the judges' phones): at 390 and 360 px, church by C (the rules); pancit (no word at PAN), a hot water bottle (HO), stew (STE), the garden centre (GA) and snooker (S) by the ways: the AI's sheet first (for a hot water bottle, a Body & care word, no AI), "No, keep it here" ("You kept it on this phone."), the AI again and "Just this once" ("Google could not check this browser, so nothing was sent.", "Try Google's AI again" first, no sheet by itself), then "Write it down together", the word typed, the person's yes, and what to do with it; Back one step at a time to the first screen. **Limits:** the AI leg of the letters was refused in the walk, so what
Google's AI or Gemini Nano would offer for those letters is not measured; no clinician has read the new lines; nothing
was run on the hosted copy or a real phone. **Not done in this phase:** limited-use App Check tokens; pictures on
cloud cards; the phone's Back on letter screens (it can skip a step); generic sample-family TV and music; a video; any
trial with people.

Status on 24 Nov 2026: live `0852ce8` (phases 17 and 17b); phase 18 on the branch `phase18-r13`, waiting for the deploy. The
three lines below were written on 18 Nov and are kept as they were.

Built for #BuildHybridAI 2026. Status on 18 Nov 2026, in three lines:
- **What runs:** the hosted copy is at <https://talk-partner.web.app/#/demo> (the full view, in judge mode; the bare address opens the simple view for families, added 17 Nov and rebuilt the same evening around topics, the person's own screens and a how-to block: [Screens](#screens)). It can be installed to the home screen and opens with no connection. It turns the partner's question into a choice card, corrects the partner where a rule can tell, and never picks the answer; open questions are answered on this computer by Gemini Nano from About me, or by the cloud from the question alone. Since 17 Nov also a quick-needs board (no AI), a microphone for the partner's question (through Firebase AI Logic, in the cloud) and a feedback form (Cloud Firestore), all untried by anyone they are for.
- **The three legs, measured on 23 Nov (phase 14):** rules 0/18, Gemini Nano on this computer 16/18, online 12/18 on the 18 open questions ([the table](#how-we-built-it-one-ai-logic-call-three-legs-measured)). Before that:
- **One number, at commit `d198eb0`:** on the 18 open questions of our own labelled set, rules alone make no card (0 of 18); the on-device model made a card matching our label for 15, 16 and 16 of 18 in three runs at commit `d198eb0` (18 Nov, the code of phase 5), 12, 13 and 13 of them with the family's own people, places or foods (`devlog/evidence_phase5/heldout_at_d198eb0/`). Earlier runs, at `7dd16a1` on 17 Nov, before the topic, tree, card-rule and phase 3 to 5 commits: 15, 16 and 15 of 18. Three runs an hour earlier, at `2aeb1d0`, gave 16 each time, and so did the three before that day's rule changes, at `c346d3d`: the model's answers vary, so the number is 15 to 16. Our labels and a set the rules have since been changed around: not a held-out test, not a trial with people.
- **Every claim with its status:** `CLAIMS.md` (and `JUDGES.md` for the 60-second path, `EVIDENCE.md` for claim → file, command, saved output). No video yet, no trial with people yet. How it got here, day by day: `devlog/` (the long form of this paragraph is kept in `devlog/DAY12.md`).

## Added on 17 Nov: quick needs, voice input, feedback
All three were added on 17 Nov 2026. **No carer and no person with aphasia has used any of them**; what is tested is
the code and the live site (`CLAIMS.md` rows 40, 41 and 42).

**Quick needs.** One button in the top bar of every partner screen (or the address `#/needs`) puts a fixed board on
the person's screen: *toilet, drink, food, pain, tired, too hot, too cold, call someone*, and *something else*. Each
tile is one of the bundled colour pictures (made with Gemini since 20 Nov, `PICTOGRAMS.md`) with its word. A tap is checked like every choice ("So: toilet. Right?" with a
tick and a cross); after the tick the person's screen shows the need and nothing else, and the partner's side gets one
short line for it ("Go now. The rest can wait."; after *pain*, one tap asks "Where does it hurt?", the body card).
*Something else* is checked the same way and hands back to the question box and "We're stuck". The board is made in
code (`core/needs.ts`, which imports the copy and the types and nothing else): no model, no About me, no request, so
it works with no connection **once the page is open**. (Written on 17 Nov: "there is no offline install". Since the
service worker of 18 Nov the app opens with no connection after one visit; a first visit with no connection does not
open.) Ten tiles since phase 5 (nine needs and the way out) is more than the two or three of a card; that is our choice
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
question × answer pairs with nothing in About them, 58 and 199 with the sample family; `tests/unit/tree.test.ts` walks every topic question and every answer down every path (596
paths, 679 with the sample family) and fails on a silent end, on a next question the rules cannot make a card for, and
on a fourth question. The lines are ours: plain household actions, and for pain "tell the nurse or doctor"; no
clinician has read them yet.

**What it learns about the person (`core/prefs.ts`).** By counting, on this device, from the answers the person
confirmed and the needs they pointed to: no model reads them. After three confirmed answers to the same question
with a clear lead (60 % and no tie) the carer's screen says "Usually: coffee (3 of 3)" and that choice stands first;
no choice is removed and nothing is chosen for the person, whose screen says nothing about what is usual. Also
counted: a pattern by time of day (three answers in each part of the day), a usual yes or no, and what was asked for
on the needs board, how often and when. In a tree, the usual side of the next either-or is offered as a short
question under the main button ("Would you like something sweet?"). About them lists every learned line in plain
words with its counts, each with "Keep as a fact" and "Remove", and "Forget everything learned". The app never sends
it anywhere (since phase 6 the usual choices are in the note "For the next carer", which leaves only when the carer
shares it): `prefs.ts` imports nothing and no file that builds a prompt or a request imports it
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
realistic colour drawings, all our own at the time (no third-party set; since 20 Nov, phase 11, 84 of them are pictures made with Gemini, see below and `PICTOGRAMS.md`): real-object colours, one object,
a plain background, light shading, the word under each. 123 pictures and the monogram (three were added in phase 5); 39 of them are new, for the
words the topic questions and their trees offer (all 128 choices of the 40 rule-made topic questions now have a
picture; a word with none still shows alone). Why colour: `design/IMAGES_RESEARCH_2026-11-17.md`. The sheet at
390 px: `devlog/evidence_pictures/pictures_390.png`.
Since 20 Nov (phase 11), 84 of these are colour pictures generated with Gemini (Gemini 3.1 Flash Image), and since 22 Nov (phases 12 and 12b) 91: eight made again after judge round 9 (pain, good, bad, more, spouse, child, sibling, friend), three added (the curtains open and closed, the church), and after judge round 9b the pain scale's three faces (three faces from calm to crying, drawn for this app, in place of our drawings, which read as angry and laughing), show me (an angled finger, in place of our upright one), pain made again (the whole body) and wait made again (an hourglass, not a raised hand); all reviewed by a person, generated offline once and bundled as WebP files that work offline; the rest stay our own SVG drawings, and the app's "How this works" screen says "Pictures: drawn by us and made with Gemini." (`PICTOGRAMS.md`, `DISCLOSURE.md`). On 23 Nov pain was made once more: the one of 22 Nov held its stomach and read as a stomach ache, so the picture now shows the whole upper body in pain, at no one body part (`devlog/quota_probe_2026-11-23/pain_general/`).

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
Partner · Home" at the top; the phone's own back button or gesture does what "Back" does and leaves the app from
the first screen, and (judge round 10 found it, still open) from the full view that "How was this made?" opens, where
the app's own "Simple view" button goes back; the person's full-screen card keeps the carer's press-and-hold. A new deploy reaches an
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
| The same wording on a phone | Google's cloud model, `PREFER_IN_CLOUD`, only after a yes on a sheet that shows the exact text, each time | Google | the lines the rules wrote: no name, no photo, no health note and no diary entry, only the rules' counted lines, which carry dates and counts taken from the diary. A line whose own words state a health note is not sent |
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
diary". It is kept in IndexedDB on the device and nowhere else; it leaves only when the carer shares it as a text
(phase 6, below). **A diary is not a record of what happened**: it
holds only what was entered in the app, and every count says so.

**Health notes** (About them): free text, and four toggles (diabetes, swallowing difficulty, a fluid limit from the
doctor, needs reminders to drink and eat). They are kept apart from the profile the card prompts read, stay on the
device, and are never in a cloud request. (Since phase 6 they go into a text the carer shares only when the carer
ticks "Include the health notes" on the sheet; the box is off every time.)

**What stands out (`core/insights.ts`)**, for the last 7 or 30 days, six lines at most. Red flags ("Tell the doctor
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

## Added on 18 Nov, phase 5: after judge round 6
What thirteen judge seats found on the hosted copy of `421dae0`, and what was changed (`CLAIMS.md` rows 86 to 97;
`devlog/evidence_phase5/`). **No carer, no person with aphasia and no clinician has used or read any of it.**

**What is rules and what is AI.** Everything about health and safety here is rules and fixed text, on the device:
no model writes, picks or rewords a line that says what to look for, whom to tell or when to call. The one new AI
step is Read aloud.

- **"Hand over the phone: they can start."** With no name set the first screen said "them can start".
  `tests/unit/phase5-grammar.test.ts` scans every string of `core/copy.ts`, `copy4.ts`, `copy5.ts` and every end line
  of the trees with an empty name.
- **"Something new or sudden?"** (`core/redflag.ts`, `web/src/phase5.ts`): one fixed card, reached from the first
  screen and from the top of "Body & care". It holds FAST (face, arm, speech, time), four more reasons to call (a
  sudden very bad headache; chest pain or trouble breathing; a fall with a blow to the head or a fall and cannot get
  up; suddenly very drowsy or confused), "Not on this list, and you are still worried? Call.", and a button
  **Call emergency services** that is a plain `tel:` link (the phone's own dialler opens; the app dials nothing). The
  number is set in About them under the health notes; it is 911 when nothing is set, and the card names 999 (UK) and
  112 (EU). The needs board has a ninth tile, "something's wrong": when the person confirms it and the phone comes
  back, the carer is on that card. The card says what it is: a fixed list, no AI, nothing sent, the app cannot tell
  what is wrong, and no doctor or nurse has checked the wording.
- **The boxed line "Call [number] now if this is new or sudden."**, with the call button, stands at the top of the
  carer's screen after an answer about the head or the chest (any place of them on the body card), a pain rated
  "quite bad" or "very bad", a yes to a question about breathing, weakness, numbness, the chest, dizziness or a
  fall, and "something's wrong"; it stays for the rest of that conversation, and it is the first thing on the
  doctor-visit page, inside the part that is printed, when an answer there or a diary entry since the last visit is
  one of these. The pain flow that was there (where, which side, how bad, "tell the nurse or doctor") stays under
  it. The rules are written so that the usual mistake is a box that was not needed
  (`tests/unit/phase5-safety.test.ts` walks every place of the head and chest, and checks that no everyday question
  puts the box up).
- **The answer check exempts every "Body & care" and "Feelings" answer**, by the topic of the conversation and by
  the words of the question (headache, chest, breath, fall, dizzy, sick, numb, swallow were added): such an answer
  is never counted toward "yes to everything", never marked "less sure", and "may be tired" never stands on its screen.
- **What stands out** (`core/insights.ts`): one day with "quite bad" or "very bad" pain, or pain in the head or
  chest, is a line ("Worth mentioning") with "Tell the doctor or nurse. If it is new or sudden, call 911 now." and
  the call box; before, only pain on three days showed. "No drink was chosen or logged on …" lost the sentence
  that excused it and says "If that is right, and not a gap in the diary, tell the doctor or nurse today." A day
  with few drinks is "Worth mentioning" (it was "To keep in mind"), and under a fluid limit it still shows, with
  "check the day against the doctor's plan" and never "more" (the brief asked for the words "fewer drinks than
  usual"; the app does not know what is usual, so the line keeps "Few drinks were entered on …: 2"). "Sad" or "bad"
  on three days is a line with "Talk to the GP or nurse about it. If you are worried about safety, call 911." A
  fall is a line, with the call box when a blow to the head was noted. The 30-day view keeps the lines of the last
  7 days, marked "From the last 7 days.". A line with such a fixed sentence is never handed to a model, on the
  device or online.
- **A reworded line is refused** (`core/reword.ts`) when it adds or drops a number, adds or drops a
  call / doctor / nurse / emergency word, or brings in a word that plays the line down (just, only, fine, probably,
  nothing to worry and their kin) that its source does not hold; the rules' words then stand. The model is no longer
  asked for "warmer" words, and is told not to make a line sound less or more serious.
- **The diary's one-tap log** has "Fall" (when to call and the call button at once, and one tap to note a blow to
  the head) and "Tablets taken" (a log line: no dose, no count, no reminder, no line drawn from it).
- **Read aloud** (`core/speak.ts`; engine `speak`): a Gemini text-to-speech model through Firebase AI Logic reads
  the question and the choices on the person's screen, and a button there repeats it. Off by default. The carer
  turns it on on the screen before handing over; the first time, a sheet says "The words on this card, including
  names on it, go to Google to be spoken. Nothing else." and shows those words and the whole request (the text, the
  voice, "calm, slow and clear"). The sound is kept per card text for the session, so "Hear it again" sends
  nothing; with no connection the switch is not offered; a doctor-visit card is never read aloud (that page says
  nothing of it is sent). A card whose words went says so under it and never says "Nothing was sent", and the
  session's privacy line counts it. Run against the real model on localhost: `leg=speak mode=ONLY_IN_CLOUD inferenceSource=in_cloud`, 4.4 s for about 8 s of sound ("Would you like tea or coffee? Tea. Coffee. Or something else."), "Hear it again" asked nothing, 10 of 10 checks at `de631b1` on the dev server with the App Check debug token.
  **Limits: one voice, English; on the hosted copy our headless test browser got no App Check token and so no voice
  (see Deploy); not run on a real phone by us; whether hearing the card helps the person is untested.**
- **Consent sheets**: one plain name ("online help", which is Google's AI; the technical words are one tap inside),
  and the first yes is **"Just this once"**: that one request may use online help and the switch stays off. "Yes,
  every time" is the second button of the sheet for an open question.
- **The photo line is true on every device.** It said "no AI looks at them", which was false on a desktop Chrome
  with Gemini Nano since phase 4. On a phone it now reads "On this phone no AI looks at them. On a desktop computer
  with Chrome's built-in AI, it can look at one on that computer itself, never online."; where the browser has the
  model it names the one exception ("Talk about a photo", after the carer's tap).
- **"Since the last visit"** (`core/since.ts`) on the doctor-visit page, under the person's own answers and marked
  as not theirs: pain days, falls, days with no drink entered, low days and bad nights from the diary since a day the
  carer names (30 days back when none is named), each with its days; and up to three questions for the doctor that
  the carer picks from a fixed list of ten. Rules only; in "Copy as text" too.
- **Smaller things**: the "Next:" label on the main button takes the button's own text colour (it stood at about
  1.2:1; `scripts/contrast-check.mjs` checks the rule and 144 pairs); Beth, Bo and the lake have their own pictures
  in every script and screenshot (a monogram, a drawn dog, a drawn lake: `tests/fixtures/photo-*.jpg`, our own
  drawings, no real face); the needs board's tiles are 100 px tall so that nine and the way out fit 390 x 844.

Not built from round 6 in phase 5: sharing with a second carer and insight lines that open their entries (both
built in phase 6, below), a practice report for the therapist, a "words that worked" list (not built). Not done by us: a nurse's or therapist's read of any wording here.

2609 unit tests (50 new: `phase5-grammar`, `phase5-safety`). On the production build on localhost: `e2e-simple.py` 620/620 at `d198eb0` (its phase 5 run, 66 checks, again at `de631b1` after the board's height changed in the full view); `pwa-check.py` 30/30, `e2e-needs.mjs` 12/12 and `e2e-noconfig.mjs` 25/25 at `de631b1`; `overflow-check.py` 510/510 at `d198eb0` (it has no phase 5 screens of its own; the phase 5 run checks its screens at 390 px only).

## Added on 18 Nov, phase 6: share with the care circle, and where a line came from
Two things the judges of round 6 asked for (their items C and G; `CLAIMS.md` rows 98 to 103;
`devlog/evidence_phase6/`; `devlog/DAY17.md`). **This phase has no AI in it at all**: everything here is rules and
fixed text on the device, and no model reads, writes or is handed any of it. **No carer, no person with aphasia and
no clinician has used or read any of it.**

**Every line of "What stands out" can show where it came from (`core/insights.ts`, `web/src/phase6.ts`).** Under each
line: "See the entries (N)". A tap shows, in place, the diary entries the rule counted: by day, the time, the
question and the answer, or the log; "Hide the entries" closes it. It holds for every line the rules can write
(pain on three days, one day of strong or head or chest pain, no drink, few drinks, many drinks under a fluid limit,
sweets, no food, sleep, mood, a fall, "less sure"). For "no drink on Wed" the entries are that day's, under "No drink
among these." A card and a tap within 20 minutes count once, and both are shown, one of them marked "counted once
with the entry beside it". The entries stand under the line's "whom to tell" sentence and its call box, never in
their place. The same on the doctor-visit page under each line of "Since the last visit"; none of it is printed.
How it is kept true: the rules return the entry ids with each line (`Insight.source`), and the count itself is now
read from the same list (`eventGroups` in `core/diary.ts`), so a line cannot count one thing and show another.
`tests/unit/phase6-source.test.ts` checks every line's ids against the entries its rule counted, and the new count
against the old one, kept word for word in the test, on 300 made-up days.

**Share with the care circle (`core/share.ts`, `web/src/phase6.ts`).** No server and no account.
- **"Share with family"**, on the diary, for the tab that is open (Today, Week, Month). The text starts "Shared from
  Talk Partner on [date and time]. Counted by the app's rules from what was entered here; not a medical record.",
  then the span, the "What stands out" lines as the rules wrote them (the level, the line, its "whom to tell"
  sentence, how it was counted), then the entries by day, and it ends "This text does not say what to give or what
  to do. Before changing food, drink or tablets, go by the doctor's plan." When a line carries the call box, the
  text has "Call [number] now if this is new or sudden" as its second line and again on that line.
- **"For the next carer"**, on the diary and on the first screen: the last 24 hours (drinks, food, the toilet, pain
  as it was answered, falls, tablets taken) and the usual choices the app has counted. "None entered" is said as a
  gap that may be one ("If that is right, and not a gap in the diary, tell the doctor or nurse today"); every fall
  carries when to call; the tablets line says "check before giving any" whether a tap was logged or not.
- **The sheet first.** Nothing leaves before a sheet has shown the exact text, with "This text leaves the phone
  through the app you pick (message, email). Talk Partner keeps no copy and has no server." Then **Share** (the Web
  Share API, `navigator.share({ text })`: the phone's own share sheet), **Copy**, **Cancel**. In a browser without
  Web Share there is only Copy.
- **Health notes only when ticked.** "Include the health notes" is off every time the sheet opens. With it off the
  builder is not handed the notes at all, so the lines are counted as if none were noted and no sentence can state
  one. Because that can hide something the reader needs (a fluid limit, swallowing difficulty, diabetes), the sheet
  then says so to the carer: "Noted in About them: a fluid limit from the doctor. The person who reads this text
  will not know it unless you tick the box."
- **Never in the text:** a photo (a diary entry holds none, and the builder reads none), an entry id, a model's
  rewording of a line.

Where this differs from what we were asked to build, and why (`devlog/DAY17.md` has each): the Today tab's text
carries the lines of the last 7 days (the Today tab shows none of its own, and a chest pain of yesterday must not be
missing from a text about today); the first line has the time as well as the date; the usual choices in the handover
note leave out every usual "no" and the needs board as well as the care questions (a note that says "usually says no
to a drink" could stop the next carer from offering one); in the handover note every fall carries the call sentence,
a blow to the head noted or not.

**Limits.** What the receiving app does with the text is outside the app: a message can be stored, forwarded or
read by its service. The text holds what was entered, so a name typed into a question is in it, and the sheet says
so. A shared text is a copy of one moment: it does not update, and it says when it was made. The diary's privacy
line now reads "The app never sends it anywhere: it leaves only when you share it yourself, as a text you see
first." The Share button was pressed in a test browser against a stub of `navigator.share`; it was pressed on no
real phone by us.

## Added on 18 Nov, phase 7: for the speech therapist, and "How to talk with Frank"
Two more things the judges of round 6 asked for (their items D and F; `CLAIMS.md` rows 108 to 113;
`devlog/evidence_phase7/`; `devlog/DAY18.md`). **This phase has no AI in it at all**: both pages are built by rules
and fixed text on the device, and no model reads, writes or is handed any of it. **No carer, no person with aphasia,
no speech therapist and no nurse has used or read either page.**

**"For the speech therapist": how the conversations at home went (`core/practice.ts`, `web/src/care7.ts`).** A speech
therapist coaches the partner; this page shows what happened between sessions. It is on the diary screen, for the
last 7 or 30 days, and it is counts only:
- questions asked, and by topic; how many were picked from the app's own one-thought questions, typed, or spoken;
- how often the app flagged a question (two things in one, a memory question) and what it did with it;
- how often "something else" was confirmed, in how many conversations, and what led to a confirmed answer after it
  (more choices of the same kind, the first letter, a word the carer typed after showing or writing, choices suggested
  by AI, the needs board, the body card, another question) or that none was;
- how often "We're stuck" was opened, how often the person started, "Yes" and "No, something else" on the check, and
  whether Read aloud is on.

Every line says what it counts, under "Counted by the app from this phone. Only what was entered here." **No line
grades the carer or the person, and none says what to do**: a test reads every line of the page on its fixtures for
good, bad, well done, poor, should, must and failed. The carer picks up to three of ten fixed questions for the
therapist; they close the page.

*Where the counts come from.* A small log on the device (IndexedDB key `practice`): one row for a question, for a
"Yes" or a "No, something else" on the check, for a start by the person, for "We're stuck". **A row holds no word of
a question or an answer**: a time, a kind, one of the app's seven topics, and yes / no marks. The log starts the
first time this build runs on the device, so nothing from before is in it, and the page names that day while it
falls inside the span. "Delete these counts" empties it; the diary stays.

*The person's own data stays out by default.* The page holds nothing of the diary unless the carer ticks "Include
the needs and pain answers" (off every time the page is opened). Ticked, it lists the needs pointed to with their
counts, and the pain entered (a card answer and a tap within 20 minutes count once) with the answers as given;
where a pain was strong, or in the head or the chest, or "something's wrong" was pointed to, "Call 911 now if this
is new or sudden" stands at the top of the page and "Tell the doctor or nurse…" under the answers. With the box off
and such an entry in the diary of the span, the screen (not the page) tells the carer so, with the same sentence.

**The communication passport: "How to talk with Frank" (`core/passport.ts`).** One printable page that travels with
the person, for a new paid carer, a hospital nurse, a grandchild. It is reached from the first screen and from About
them, and it is two screens: first every line the page could hold, each with its box; then the page as it prints.
- *How to talk*: five fixed lines with the person's name. "Frank knows what to say. The words are hard to find.";
  "Frank understands most of what you say. Speak in short sentences, one thing at a time."; "Write two or three
  choices, or point to pictures. Wait: count to ten."; `Check: "So: tea. Right?"`; "Don't answer for Frank, and don't
  quiz: no testing questions." With no name the lines say "they" in the right form; no line guesses "he" or "she".
- *How Frank says yes and no*: typed by the carer. The app never infers it.
- *About Frank*: the people, food and drink, places, TV and music of About them, and the facts the family kept.
- *Words that worked*: the words found by their first letter with how often, and the usual choices with their
  counts.
- *Things Frank likes to talk about*: a person of About them or the word of a family photo, with how often it was
  the confirmed answer or the answer was yes to an offer that names it; twice at least. It says what was chosen, not
  what is felt, and the page says so.
- *Also*: up to three lines of the carer's own.
- *If something is wrong*: the emergency number and the fixed text of phase 5 word for word (FAST, four more reasons
  to call, "call the doctor or nurse today").

**The carer decides every line**: each "how to talk" line, each line of About them and each counted line can be
taken off, and the line "understands most of what you say" says beside its box "Take this line off if it is not
true for Frank." The one part that cannot be taken off is "If something is wrong". **What never goes on it**: a
habit about pain, the body, a feeling or a need, a usual "no" (the rule of the note for the next carer), the needs
board, the health notes, the diary. The family's own photos, or an initial, stand on the printed page; a photo is
never in the shared text. Print and Share are on the second screen only, after the page has been seen.

**Printing and sharing.** Print is the browser's own print of the page that is on the screen (the controls are not
printed). Share goes through the sheet of phase 6: the exact text first, "This text leaves the phone through the app
you pick (message, email). Talk Partner keeps no copy and has no server.", then Share (`navigator.share({ text })`),
Copy, Cancel. Back from each page goes exactly one step: the passport's page to its lines, the lines to where they
were opened from; "For the speech therapist" to the diary.

**Limits.** The counts begin with this build, so a first report covers little. Where a tapped question came from is
known ("the app's own"); a question tapped again from "asked before" in the full view counts as the app's own even
if it was typed the first time. A "something else" is closed as "no answer confirmed" after 30 minutes or when a new
conversation starts: the number is ours. The numbers say how often, never how well: whether a page of counts helps a
speech therapist coach a partner is not known, and none has seen it. "Understands most of what you say" is true for
many people with aphasia and false for some; the app cannot tell, which is why the carer must leave it on or take it
off. "Likes to talk about" is counted from choices, and a choice is not a liking. The passport fits one A4 sheet for
the Miller family of the tests; a family with long lists gets a second sheet. No sheet of paper was printed: the
print was looked at as the browser renders it for print, and as a PDF.

**Counts for phase 7** (the code of `5f05b8d`; `devlog/evidence_phase7/`). 2762 unit tests (62 new:
`phase7-practice` 36, `phase7-passport` 26). On the production build on localhost (`npx vite preview`, port 5197):
`e2e-simple.py` 935/935 (its phase 7 run is 125 of them); `pwa-check.py` 30/30; `e2e-needs.mjs` 12/12;
`overflow-check.py` 534/534 (24 of them are the two new pages and their sheet at 320, 360, 390 and 412 px);
`contrast-check.mjs` 144 pairs. The build of `45e8095` (phases 6 and 7) went out to the hosted copy on 18 Nov at
about 16:52 UTC; the organiser of judge round 7 ran against it (README "Deploy"). No `--live` script of ours was run
against that build.

## Added on 18 Nov, phase 8: the fixes of judge round 7
What the thirteen seats of judge round 7 found at the build of `45e8095`, in the order of their summary's priorities
(`CLAIMS.md` rows 114 to 124; `devlog/evidence_phase8/`; `devlog/DAY19.md`). Everything here is rules and fixed text
on the device, except the routing chip, which shows where Firebase AI Logic ran a card that an AI made. **No carer,
no person with aphasia, no speech therapist and no nurse has seen any of it.**

- **The visit page no longer contradicts the person (a safety P0).** "Since the last visit" counted only the diary,
  so under Frank's own answer "low" it said "Mood: no 'sad' or 'bad' day entered", and "Pain: none entered" could
  stand under a yes to pain. Now the person's own answers on the page count too: a "low" mood, a yes to pain, a bad
  night are days of that kind, and the line says "counting Frank's own answer above". In the diary every question
  about how the person feels counts, and "low" counts (a photo that makes them sad does not count as mood).
- **Back goes exactly one step everywhere** (`web/src/main.ts`, `trackScreen` and `backStep`): in the full view and
  with the sample family too, and the person's screens are steps. "Something new or sudden?" goes back to the screen
  it was opened from; the needs board opened inside a conversation goes back to that answer; a doctor-visit question
  goes back to the one before (whose answer comes off, to be given again); the person's own start, its topics and
  "Who is it about?", the alphabet and its words go back one screen at a time. Two folds keep it a step a person
  would call a step: the check and "Thank you" fold into the choices they confirm, and a card handed over folds into
  the carer's question. The press and hold on the person's screen gives the phone back to the last carer's screen.
  `scripts/e2e-simple.py --only back` walks every way back to the first screen, by the Back button and by the
  phone's back (on a person's screen, which has no Back button by design, the phone's back).
- **The passport says only what the family said.** "Frank knows what to say" and "Frank understands most of what you
  say" are off until the carer ticks them ("Tick if true for Frank"). A fixed line under yes and no: "A tired yes may
  not mean yes. Check it the other way. Ask about pain, drinks and the toilet every time." With no emergency number
  in About them the page says "Emergency number: not filled in, ask the family" (it printed 911 before). With
  diabetes, swallowing difficulty or a fluid limit noted, the food line ends "Ask the family what is all right" (the
  condition is not named: the page holds no health notes). Answers the answer check marked "less sure" count for no
  usual line anywhere, and a usual yes to an offer never goes on a page for someone else.
- **The page for the speech therapist** shows the "less sure" count beside the yes count, with "A yes on the check
  is not proof: when tired, a yes can mean no." With the box for the needs and pain answers off, the printed page now
  says, only when true and with no detail, "The diary of this time holds a pain answer or 'something's wrong': ask
  the family."
- **The documents say what is live.** README "Deploy" and JUDGES carry "Live: the build of `LIVE_BUILD`", a
  placeholder written at deploy; `tests/unit/docs-truth.test.ts` fails while an older build stands there, or while a
  document says a live phase never went out. The same test walks every string of the app as a phone would show it:
  none may say an AI reads anything on that phone (one did, under "Answers so far"). The full view's privacy line
  names Read aloud; "Nothing you asked has left this phone" now says "since the app was opened". Alela is named
  among the look-alikes (not opened by us). The data-use line said "Google's paid service, per Google's terms" with
  the link: no dated record of the billing account is in this repository. (Phase 9 changed it to what the terms
  back: "Google's Gemini API through Firebase AI Logic. On the paid tier Google does not use prompts to improve its
  products", with the link.)
- **Home.** "Needs something now?"; the red card says what it is for: "Signs of a new stroke, chest pain, a fall:
  call." The 4 steps hold "Write the key word big as you say it: TEA?" and fold to one line after the first card, with
  "Write the key word big." on it; the first row of topics then stands above the fold at 360 x 740 and 390 x 844.
  "later" (the tile of "We're stuck", or "later" to "Do you want to tell me now or later?") keeps the question: Home
  shows "Left for later: [question], [time]" with "Ask it again" and "Done", for a day (`core/later.ts`).
- **Hybrid visible.** Every card an AI made carries a small chip from where the SDK ran it ("Made on this computer" /
  "Made online, after your yes", `core/simple.ts`, `routeChip`) and why, in one line: it read About them here; the
  connection was down; this phone has no AI of its own for such a question; the AI here made no card. Read aloud's
  button and sheet say who it is for ("Read the cards aloud to Frank"; "Frank hears the question and the choices in a
  calm, slow voice, so you do not have to read them out"). When Read aloud fails, the person's screen only says "No
  sound"; the carer's screen says "Read aloud did not work for that card. Read the question out loud to Frank."
- **The nurse's and the speech therapist's sets.** A line with the call box has its own label, "Call now if it is
  new or sudden, and tell the doctor or nurse", and comes first. Balance and sight (BE-FAST) are on the FAST card and
  the passport. Under a "sad" or "low" answer, and on the visit page under "low", one line on the carer's side: the
  helpline the family put in About them (a new field; the app has no number of its own), or "the doctor or nurse
  today, or a mental health helpline", and the emergency number if life is at risk. The visit page names the fewest
  drinks in one day. A day with no drink under a fluid limit is no longer excused ("A fluid limit is not 'no
  drinks'"). "No pain. Good." is now "No pain, Frank says. Watch the face, ask again later." The answer check leaves
  drink and food questions alone too (the notes for other people still keep a usual drink, as since `ed0395d`).
  "Who is it about?" offers "me" first.
- **Pictures.** Beth is a drawn person in the test fixtures (no real face, no monogram), and Frank has his own
  drawing. The on-device photo step was run again with the drawn dog for Bo (`devlog/evidence_phase8/ai_phase4/`).
  The first-letter step now tells the model the kind of the conversation and an age band (fixed words: "The person
  is an adult, most often 60 or older"); asked for a drink with K, the cloud model this time gave no word that passed
  the checks, and the card said so.

**Counts** (the production build on `npx vite preview`, port 5241). At `feb272d`: 2798 unit tests (`npm run check`, the type check and the build included); `e2e-simple.py` 1001/1001; `pwa-check.py` 30/30; `e2e-needs.mjs` 12/12; `overflow-check.py` 534/534; `contrast-check.mjs` 144 of 144 pairs; `phase8-shots.py` 21/21. The outputs are in `devlog/evidence_phase8/local/`. The first full run of the same scripts (at `e3cc1b9`) failed 13 of 1001 in `e2e-simple.py` and stopped `pwa-check.py`, `e2e-needs.mjs` (11/12) and `overflow-check.py`: most were the scripts expecting the wording before phase 8, and two were real faults, fixed in `feb272d`: "Home" from two questions deep left the first screen 490 px down (the browser restored an older entry's scroll), and the press and hold after a need was ticked went to the screen before the board, hiding the need.

**The cloud step at this code, five fresh profiles each** (`devlog/evidence_phase8/cloud/`). Against the preview
(production build, no debug token in it): 19 of 27 checks in each of the five runs; App Check got no token
("ReCAPTCHA error", headless Chromium on localhost), the card said "Cloud help could not confirm this browser", and
everything made by rules went on. Against the dev server on port 5243, with the App Check debug token from
`.env.local` (never committed): 28 of 28 in each of the five. Neither is the hosted copy: the live runs are for after
the deploy.

**Not built, not run.** Any of it with a carer, a speech therapist, a nurse or a person with aphasia; a real phone;
the hosted copy at the time of these counts (phase 8 was deployed afterwards: README "Deploy"); Read aloud against the
real model (`e2e-speak.py`); the blood-thinner fall line and the "check it another way" button of the answer check
(asked for by single seats, outside this brief). The person-owned "Not now" exit and a locale default for the
emergency number came in phase 9.

## Added on 18 Nov, phase 9: the fixes of judge round 8
The fixes of judge round 8 (`../judge_app_r8_2026-11-18/SUMMARY.md` §2), one commit each, from `3bc6998`
(`CLAIMS.md` rows 125 to 136; `EVIDENCE.md` "Phase 9"; `devlog/DAY19.md`). All of it is rules except item 8, which
gives the cloud letter step its own schema. Phase 9 went live with `8a8eaf7` (README "Deploy"); the live build is now `cb15e70`.

- **A care question left for later stays** (`a33ac41`, health P0). A question about pain, the body, the toilet, a drink
  or feelings that is left for later is pinned first on Home and never expires; "Done" asks "Did you find out? Yes /
  Not yet", and "Not yet" keeps it. It goes into the diary as "Left for later" and onto the visit page's "Since the
  last visit". Under a pain question: "If the pain is new or strong, don't wait: call the nurse or doctor." Any other
  question keeps the phase 8 rule (the newest two of a day). "Tea or coffee?" is not a care question; "Would you like
  something to drink?" is.
- **"Nothing stands out" never stands over a pain** (`92f86b4`, health P0). Pain on one or two days is its own line,
  "Pain was chosen or logged on 2 days in the last 7 days.", with the fixed "Ask again today, and tell the doctor or
  nurse if it is new or still there." (never handed to a model). One low day is a line; "something's wrong" is a line
  with the call box. The unit test that asserted "Nothing stands out" for two pain days is turned round.
- **Wording** (`0658200`). "A little pain. Ask again in an hour. If it is new, or still there later, tell the nurse or
  doctor."; no "Last time they chose…" or "So far: no ×5" before a pain, toilet, drink or feelings question; the
  passport adds "But a yes to pain, the toilet or 'something's wrong' is always a yes: act on it."
- **The emergency number follows the locale** (`b6c8b5d`; more regions in phase 12). With none in About them: en-GB 999,
  a European Union locale 112, and since phase 12 also Australia 000, New Zealand 111, India 112, Japan and Korea 119,
  the US, Canada and Mexico 911 and a few more (`core/redflag.ts`); a region the app does not know gets 112, never a
  silent 911. Every call box asks "Is this your emergency number? Change it" (to About them). The sample family stays on 911.
- **Handover and visit** (`810f1f5`). The handover note always prints the swallowing difficulty and the fluid limit
  ("ALWAYS ON THIS NOTE"), box ticked or not. The visit page gains Toilet and Tablets lines, two family questions, and
  "Where it hurts: chest, middle".
- **The cloud wait** (`db00cef`, P0). From 3 s: "Online help is still working (N s)" with "Stop waiting"; at 20 s (was
  25 s; 12 s was tried first, see below) the plain line "Cloud help took longer than 20 seconds, so there is no card. Ask it as a choice…". Each cloud
  step's latency is in the trace, answered or failed. Remote Config is never waited for (a source test holds it). 12 s
  was the first limit; against live `ffb2521` from a phone hotspot the first real cloud card took over 12 s in 3 of 5
  fresh headed runs (5.5 s and 9.8 s in the others), so the limit is 20 s: the carer can still stop at any moment.
- **The hybrid moment in one tap** (`3447b47`, P0). "See the AI at work" on Home: the sample open question "What do you
  want to do this weekend?", tagged "uses Google's AI, after your yes" on a phone and "AI on this computer: nothing is
  sent" with Chrome's own model, to the card and its routing chip. It is made with an empty profile, so the question is
  all any step gets, and its answers are kept nowhere.
- **The cloud letter step** (`7910b80`). Its own fixed instructions and schema (`core/prompt.ts`, `LETTER_SCHEMA`: the
  kind as an enum, exactly 4 words), a ninth model instance (`web/src/ai/firebaseEngine.ts`, `runLetter`); code keeps
  the words that start with the letter. Unit-tested here; not run against the real model.
- **The person's own "Not now"** (`e3e3db3`, `f188eab`). A small tile on the top row of every question screen,
  opposite the carer's press and hold: it ends the card and files the question as left for later (a pain question
  pinned). On a doctor-visit question it stops the run.
- **The first visit** (`6b10a4d`). "How it works" is folded on the first visit too, to its one line with "Write the key
  word big."; the first row of topics ends at 615 px at 360 x 740 and at 390 x 844.
- **Documents** (`850d2e4`). "Google's paid service" is gone (no dated billing record is in the repository): the sheets
  say "Google's AI. On the paid tier Google does not use prompts to improve its products" with the link; JUDGES names
  the current unit-test count; the stale lines the hound found are fixed; `tests/unit/docs-truth.test.ts` holds each.
- **The reload race** (`74a5e94`). `e2e-simple.py` waits for the diary before it reloads; and the app keeps an inner
  screen on a reload taken at once after the address changed (6 of 20 landed on Home on the dev server before, 0 of
  30 after).

**Counts** (the production build of HEAD on `npx vite preview`, port 5495, from a separate worktree so that `dist/`
and the previews on 5301 and 5181 were not touched): At `f188eab` (the code; the scripts' expectations were updated after it, no app change): 2849 unit tests (`npm run check`); `e2e-simple.py` 1002/1002; `pwa-check.py` 30/30; `e2e-needs.mjs` 12/12; `overflow-check.py` 534/534; `contrast-check.mjs` 144 of 144 pairs; `phase8-shots.py` 21/21; `phase9-shots.py` 37/37. The outputs are in `devlog/evidence_phase9/local/`, the screens in `devlog/evidence_phase9/shots_390/`. The first full run (at `74a5e94`) failed 8 of `e2e-simple.py`'s checks and stopped: the scripts expecting the wording before phase 9, and one real fault, fixed in `f188eab`: the person's "Not now" at the foot of the screen pushed three choices and the way out past 844 px.

## Added on 19 Nov, phase 10: the person starts, and About them in a file
The two features of the family's list that were still missing (`design/PLAN_TO_IDEAL_2026-11-17.md`), one commit
each (`CLAIMS.md` rows 137 to 141; `EVIDENCE.md` "Phase 10"; `devlog/DAY20.md`). Both are rules on the device: no
model and no request. Went live with `ce47da2`; the live build is now `cb15e70` (README "Deploy" says what was run against it).

- **"His turn": the person starts** (`47e786e`). Home's big button reads the person's own words first, "Frank: I want
  to say something" ("I want to say something" with no name), and the installed app has a home-screen shortcut with
  the same words (the manifest's `shortcuts`, to `/#/turn`). The person's screen keeps its three starters and the way
  out; the second is now "I want to talk about…". It offers what About them holds, pictured, three to a screen: "me"
  (their own news), up to 3 people (those who do not live there first, never the carer holding the phone), up to 2
  places, and "the news / TV"; the last screen's "something else" leads to the topics of phase 4, so nothing of it is
  lost, and no screen is left with one real choice. With About them empty there are no people or places: "me" and
  "the news / TV" stay, and the screen works. After the person picks Beth and confirms, the carer reads first
  "Frank wants to talk about Beth." and three easy questions, each a card the rules make: for a person "Is it good
  news, or a worry?", "Is it about Beth's visit?", "Would you like to call Beth?" (someone who lives there: the
  telling only); for a place "Did something happen at the lake?", "Is it good news, or a worry?", "Would you like to
  go to the lake?"; for the news "Is it the news, or something on TV?", "Is it good news, or a worry?", "Shall we put
  the TV on?"; for "me" the three questions about the telling of phase 4. The telling comes first and an offer last
  (the role-play of 18 Nov). Every answer of every one has its step in `core/tree.ts`. The diary gets "Frank started:
  Beth", which counts as nothing and is never "less sure". "I need something" leads to the very same needs board, and
  its answer goes the board's way (the diary, the call box, the pinned care question of phase 9). Back from every new
  screen is one screen back (`e2e-simple.py --only back`, `phase10-shots.py`).
- **About them in a file** (`864315e`). "Save About them to a file" writes versioned JSON (`format:
  "talk-partner-about"`, `version: 1`, the date, About them and its photos, the emergency number). The health notes
  go in only when the carer ticks "Include health notes", which is off every time, with one line on why; the diary
  and what the app learned are never in the file. "Load About them from a file" refuses a file over 8 MB by its size
  before reading it (the biggest About them the app keeps, 60 photos and 60 people with a photo, is about 5.5 MB),
  checks every field, drops what the app does not keep, and keeps every word as text: a name with `<script>` in it is
  shown as those letters. Then "This file has: 3 people, 2 places, …" with "Replace what is here", "Add to what is
  here" and "Cancel"; nothing changes before a pick. Add removes and changes nothing here: it adds the people, words
  and photos that are not here yet, and a health toggle that is on in either stays on. A file from a newer version is
  refused in plain words; a file of phases 3 to 9 still loads. One line says what it is for: "Use it to move to a new
  phone, to set up a second carer's phone, or as a spare copy."

What differs from the brief: no Gemini Nano suggestion for the three questions (the brief allowed one on a device
that has it; the rules' three are what every phone gets, and a model step would be a fourth thing to check, with no
run against a real model in this phase); the size limit is 8 MB, not 5 MB, so that a full family's own file loads
back. `devlog/DAY20.md` has the reasons.

**Counts** (the production build of `864315e` on `npx vite preview`, port 5610, from a separate worktree so that
`dist/` was not touched): 2902 unit tests (`npm run check`); `e2e-simple.py` 1032/1032; `pwa-check.py` 32/32; `e2e-needs.mjs` 12/12; `overflow-check.py` 548/548; `contrast-check.mjs` 144 of 144 pairs; `phase8-shots.py` 21/21 (the first run failed on its own old step, "tell you" then "People", which phase 10 replaced with "I want to talk about…"; the script now follows the new path, no app change); `phase9-shots.py` 39/39; `phase10-shots.py` 132/132. The outputs are in `devlog/evidence_phase10/local/`.

## Added on 20 Nov, phase 11: colour pictures made with Gemini
The family chose a new picture set (`design/PHASE11_BRIEF.md`; `CLAIMS.md` rows 142 to 144, and row 59 now says it
is no longer true; `EVIDENCE.md` "Phase 11"; `devlog/DAY21.md`). Phase 11 went live as `cb15e70`, the build the "Live:" lines
name (README "Deploy").

- **The pictures** (`603f8a5`). 84 of the card pictures are now colour pictures generated with Gemini 3.1 Flash
  Image on 20 Nov, inside the submission period, from short text prompts, reviewed by a person against our drawing of
  the same word: drinks and food, people, rest, TV and music, going out, feelings, the needs board (85 were made; "something else" went back to our dashed drawing the same day, so the way out stays apart from every choice). They are 256 x 256
  WebP files in `web/public/pictures/` (about 6 KB each, about 0.5 MB in all). The rest stay our SVG drawings: yes,
  no, the amount scale, this one / that one, show me, change topic, okay, someone else, morning, just right, the way
  out "something else" (dashed, on every card), the body map and the monogram. A picture is an `<img>` with the word as its text and the same box as the drawing (112 to 128
  px on the person's card); a family's own photo still comes first; if a file cannot be loaded, our drawing of the
  same word takes its place, so a tile is never broken.
- **Offline** (`12e6f27`). The service worker keeps every file of the build, the 84 pictures with them, at install;
  `pwa-check.py` checks the cache holds all 84 and that the tea or coffee card shows its pictures with the
  connection off.
- **Where they come from** (`5abf1f6`). `PICTOGRAMS.md` gives every picture's source, date and licence or terms: the
  Gemini ones under the Gemini API terms (we did not draw them and claim no copyright beyond what applies), ours
  under Apache-2.0. `DISCLOSURE.md` names them, and "How this works" says "Pictures: drawn by us and made with Gemini."
- **Evidence** (this commit): `devlog/evidence_pictures/` (the sheets, now with a "Gemini" or "our SVG" line under
  each word, and a before/after sheet), `devlog/evidence_phase11/` (phase 9 and 10 screens at 360 x 740 and 390 x
  844, and `scripts/phase11-walk.py`: tea or coffee, pain, toilet, a person and Back, light and dark).

What differs from the brief: our drawing of each word that now has a picture is kept in the code as the fallback
for a file that fails to load (the brief did not ask for it; it matters where no service worker is there yet, as in
`e2e-needs.mjs`, which bypasses the worker and turns the network off); "the About screen" is the "How this
works" screen (the app has no other screen about itself); `e2e-needs.mjs` now allows the picture files on the app's
own host while offline and checks that every tile then shows our drawing. Words in the pictures: none shows a brand
or a logo; the film clapperboard has printed words (SCENE, TAKE, ROLL, DATE, DIRECTOR) and the radio tiny OFF / ON
marks.

**Counts** (the production build of `5abf1f6` on `npx vite preview`, port 5179): 2913 unit tests (`npm run check`);
`e2e-simple.py` 1032/1032; `pwa-check.py` 34/34; `e2e-needs.mjs` 13/13 (the first run failed 11/12 on the offline
request check, see above); `overflow-check.py` 548/548; `contrast-check.mjs` 144 of 144 pairs; `phase8-shots.py`
21/21; `phase9-shots.py` 39/39; `phase10-shots.py` 132/132; `phase11-walk.py` 40/40. The outputs are in
`devlog/evidence_phase11/local/`.

Follow-up the same day (`88c0747` and the next commit): chair, listen and go out lost their faint frame (edited by
hand, not regenerated), and "something else" is our dashed drawing again on every card (84 made with Gemini, 40
drawn by us). On the production build of that state: `npm run check` 2913 unit tests; `e2e-simple.py` 1032/1032;
`pwa-check.py` 34/34; `e2e-needs.mjs` 13/13; `overflow-check.py` 548/548; `phase11-walk.py` 48/48 (the first run
47/48: the walk read the check screen's coffee picture before it had loaded; it now waits, as on the other screens);
`picture-sheet.py` done. Outputs: `devlog/evidence_phase11/local_followup/`.

## Added on 22 Nov, phase 12: the fixes of judge round 9

The fixes of judge round 9 (`design/PHASE12_BRIEF.md`), one commit each (`CLAIMS.md` rows 145 to 156; `EVIDENCE.md`
"Phase 12"; `devlog/DAY22.md`). All of it is rules on the device; no model was called (the 11 pictures were made
before this phase). The "Live:" lines still name `cb15e70`: phase 12 waits for its deploy.

- **Health.** Worried, scared, lonely and a yes to "Is something bothering you?" count as a low day (`core/diary.ts`
  `lowMood`). About them never shows a learned line about pain or another care question, nor "Keep as a fact" for
  one (`core/share.ts` `aboutLearned`). Pain in an arm, a hand, a leg, the feet or the face first asks "Is it suddenly
  weak or numb, yes or no?" (a yes raises the call box). Pain on the needs board: "Where does it hurt?" first, and
  the call box with the number. A pain question left for later shows the signs that do not wait, a call button and
  how long ago. The emergency number covers the common regions, and an unknown region gets 112, not 911.
- **Pictures.** Eight made again (pain from the front, good and bad as faces, a second helping, four distinct pairs
  of people) and three added (the curtains open and closed, the church); the pain scale is three faces, "I need
  something" the four squares of the needs button, "I feel…" three faces. The six topic pictures are preloaded.
- **See the AI at work** is under "Something new or sudden?", above the fold at 390 x 844, with "Phone: Google's AI,
  online, after your yes" and "Laptop with Chrome's own AI: nothing is sent" under it (at 360 px the two lines fold).
- **The rest.** A "STILL OPEN" block in the handover note; "Pain: none entered. That does not mean there was none:
  ask."; the footer after "Stop waiting" says the question may have left; "I can't go on" on the third page of the
  feelings card, which opens a safety screen for the carer (stay, the emergency number, the crisis line where we know
  one, never "later"; no clinician has checked it); "Try it with the Millers" at the foot of Home; JUDGES opens with a
  12-step phone path.

**Counts** (the production build of `9dc8060` on `npx vite preview`, port 5612): `npm run check` 3001 unit tests; `e2e-simple.py` 1032/1032; `pwa-check.py` 34/34; `e2e-needs.mjs` 13/13; `overflow-check.py` 548/548; `contrast-check.mjs` 144 of 144 pairs; `phase8-shots.py` 21/21; `phase9-shots.py` 52/52 (the new cold check included); `phase10-shots.py` 132/132; `phase11-walk.py` 48/48; `phase12-walk.py` 142/142. Outputs:
`devlog/evidence_phase12/`.

## Added on 23 Nov, phase 13: the fixes of judge round 10

The fixes of judge round 10, one commit each, every new health line tested on its worst case
(`tests/unit/phase13.test.ts`). All of it is rules and fixed text on the device; no model was called.

- **The stroke check.** After a "no" or "not sure" to "Is it suddenly weak or numb?", the line "A yes or no can be
  wrong after a stroke: check it yourself now… lift both arms and smile" is a red box with the call button ABOVE
  "Next: How bad is the pain?" (it was hidden behind it; since phase 15 also past the depth limit). A yes or "not sure" goes into the diary, the next-carer note,
  "What stands out" and the visit page.
- **Chest or head pain.** With a chest or head pain, or a breathing / weak / numb yes, in the conversation, every
  "How bad is the pain?" answer says "call [number] now, whatever the amount. Do not wait to see if it passes. Note the
  time it started." (never "Ask again in an hour"), with the call button as the main action.
- **Before a doctor visit.** An answer that can be urgent stops the questions: "Thank you. Give the phone back", then
  the call box with "Go on with the questions".
- **Mood, later, the crisis line.** A confirmed "worry" counts as a low or worried mood. "Left for later" stays through
  "Ask it again" and "change topic"; only "Did you find out? Yes" or a confirmed answer takes it off. The crisis line
  is About them's, else the one of the emergency number the family set (999: Samaritans 116 123; 000: Lifeline
  13 11 14; 911: 988; 111: 1737; any other: the emergency number itself), and "may harm themselves" always means stay
  and call now. "Something's wrong" is in the next-carer note. Rest and sleep answers are never marked "less sure". One
  intended-purpose line: not a medical device.
- **The pain picture** is an older man leaning forward, open hands on his knees, no teeth and no fists. **No claim to
  a published pain scale**: the three faces are drawn for this app. **Online help** asks App Check first, inside the same
  20 s; a refused browser is told so within that wait, and Back returns to the app's own card.

**Counts** (the production build of phase 13 on `npx vite preview`, port 5179): `npm run check` 3086 unit tests; `e2e-simple.py` 1035/1035; `pwa-check.py` 34/34; `e2e-needs.mjs` 13/13; `overflow-check.py` (360 and 390 px) 290/290; `contrast-check.mjs` 144 of 144 pairs; `phase11-walk.py` 48/48; `phase12-walk.py` 335/335 (with the phase 13 screens, Back one step at a time, every way out followed; shots in `devlog/evidence_phase13/`).

## Added on 23 Nov, phase 14: the sponsor's AI in the phone's everyday loop

Judge round 10's four official seats named one P0: on a phone the first cards are made by rules, so Firebase AI Logic
did not carry weight in a judge's first minute. Each logic change has a test that failed first
(`tests/unit/find-more.test.ts`, `tests/unit/speak-offer.test.ts`).

- **Find more choices (Google's AI, after your yes).** The second button under "Show them the choices" on a topic
  card (`core/findmore.ts`). It is the narrowing step of `core/narrow.ts`, given the choices on the card ("On the card
  already: tea, coffee."): `PREFER_IN_CLOUD` with `onDeviceParams` after the consent sheet's yes, or, on a laptop with
  Gemini Nano, the `ONLY_ON_DEVICE` step with About me, "Find more choices (Chrome's AI, on this computer)", nothing
  sent. The card says "AI suggested these other choices with online help, after your yes"; its chip "Made online,
  after your yes · on a laptop with Chrome's AI this runs on that computer". The same label is the second way after
  "something else". **Never offered** on a "Body & care" or "Feelings" question, a question or choice with a word about
  pain, the body, a feeling, the toilet, help or a need, a red-flag answer, the crisis line, or while the call box is
  up; nor on a yes / no card, the needs board, or a card the AI made (the worst case of the gate: fewer offers; a
  test walks every topic and tree question). In a judge's path on a phone it is tap 3, and "Just this once" tap 4.
- **Read aloud offered before handing over.** "Read it aloud to [name] (Google's AI, a calm, slow voice)" (not in the sample family until phase 15), one button
  under the main one while Read aloud is off: the first tap opens the same sheet as before; after one yes the tap
  turns it on with no sheet. Off by default.
- **Back and refusals.** A card waiting for the sheet's yes is no step of its own: Back from the "Find more choices" card made after the
  yes lands on the card it was asked from (phone Back on the "See the AI at work" sheet still lands on "No card for this one": judge rounds 11 and 12; not fixed), and "No, not now" goes there too. Where App Check refuses the browser, the
  screen says "Online help could not check this browser, so nothing was sent" and what to do; the sheet no longer comes
  back by itself (it did, after "something else", before; on the letter step it still did until phase 18). A tapped question now opens its card at the top (it kept
  the first screen's scroll: 580 px down at 360 px).
- **The measured table** of the three legs is in [How we built it](#how-we-built-it-one-ai-logic-call-three-legs-measured)
  (`node scripts/eval-heldout.mjs --cloud` is new).

**Not done in this phase:** the "Find more choices" wording against the real model (scripted engines and the phone
walk with App Check refusing only); a hosted run of the cloud leg; any trial with people.

**Counts** (the production build of phase 14 at `4b38b80` on `npx vite preview`, port 5179): `npm run check` 3106 unit tests; `e2e-simple.py` 1035/1036 (the one miss, "A, handover, worst cases", depends on the time of day: its fixture's pain entry is at 09:10 yesterday and falls out of the last 24 hours when the run is after 09:10; it is not touched by this phase); `pwa-check.py` 34/34; `e2e-needs.mjs` 13/13; `overflow-check.py` (360 and 390 px) 290/290; `contrast-check.mjs` 144 of 144 pairs; `phase11-walk.py` 48/48; `phase12-walk.py` 431/431 (with the phase 14 screens at 360 and 390 px, light and dark: Back and the phone's back one step at a time, every way out followed; shots in `devlog/evidence_phase14/walk/`).

## Added on 24 Nov, phase 15: the fixes of judge round 11

Judge round 11 (seven seats, one of them the honesty hound) found the sample family short of what the texts and the
planned video show, and health lines in the notes for others softer than the screen. Each change has a test that
failed on the round's build (`tests/unit/phase15.test.ts`, 25 tests). All of it is rules, fixed text and the screen;
no model was called. Phase 15 is live (first as `cf4aa33`, now inside `0852ce8`).

- **The sample family as the texts say.** Its diary fills from confirmed answers, needs and a stroke-sign "not sure",
  in its own store in memory (nothing reaches the device, the 23 Nov separation holds): "What stands out", the visit
  page and the therapist page read it. Read aloud is offered there too, with its own yes kept in memory. "B" gave
  Beth, Bo and biscuits in phase 15 (Beth, his sister, and ginger biscuits joined `core/sample.ts`); since phase 17 the
  letter stays in the topic (README phase 17).
- **The wait for "Find more choices".** After "Just this once" the card stays on screen with "Asking Google's AI…
  Stop waiting" where the button was (the first screen showed for up to 20 s before). "Stop waiting" keeps the card,
  with a line; any other tap or a step back calls the wait off first. The refusal screen and Back to the card are as
  in phase 14.
- **Health lines for others.** For a chest or head pain the next-carer note, the family text, the therapist warning
  and "What stands out" say "call [number] now, whatever the amount. Do not wait to see if it passes.", like the
  screen. A logged pain with no place says call now first if it is new, sudden, chest or head. The visit page under a
  stroke sign or "I can't go on" says call now, not at the visit. A weakness "no" or "not sure" then "a little" pain
  ends on the arms-and-smile check, never "Ask again in an hour", and "How bad is the pain?" follows that check also
  past the depth limit. "Left for later" keeps the chest, head or stroke flag: Home shows the call line, "Ask it
  again" puts the call box back. No tip of the day over a day with an urgent entry. "Are you comfortable? yes" asks
  to check it the other way; the doctor page marks each yes or no "please check".
- **Words.** On a phone, "This phone has no AI of its own for this one" replaces "The private helper isn't ready on
  this phone"; the Body & care card names the number.

**Not done in this phase:** limited-use App Check tokens (tried on 17 Nov and taken out: every cloud request then
needs a new reCAPTCHA attestation, which would make refusals of judges' browsers more likely); the TTS model under
Remote Config (Remote Config is fetched only after "Yes, every time", so Read aloud would still start on the
in-code name); generic TV and music for the sample family (the labelled set's expected cards name them; it needs a new
eval run); new pain and arm pictures; the AI as the phone's main mechanic; the Today view's own red boxes; any trial
with people.

**Counts** (the production build of phase 15 on `npx vite preview`, port 5179): `npm run check` 3131 unit tests; `e2e-simple.py` 1036/1036; `pwa-check.py` 34/34; `e2e-needs.mjs` 13/13; `overflow-check.py` (320 to 412 px) 552/552; `contrast-check.mjs` 144 of 144 pairs; `phase11-walk.py` 48/48; `phase12-walk.py` 457/457 (with the phase 15 screens in the sample family at 360 and 390 px, App Check held open to see the wait: Back one step at a time, every way out followed; shots and the log in `devlog/evidence_phase15/`).

## Changed on 18 Nov after the owner's walk on his phone: Back, and "something else"
Two things the owner found with the phone in his hand, 11:20 to 11:32 UTC, on the hosted copy (`CLAIMS.md` rows 104
to 107; `devlog/evidence_phase6/r1_*.png`, `r2_*.png`; `devlog/DAY17.md`). Both fixes are rules: no AI was added.

**Back goes exactly one step.** From the carer's screen of the second question of a conversation, one tap on Back
landed on the first screen. Back used to be decided from the one card on the screen, so everything before it was
lost. Now every carer's screen that is drawn is a step on a stack (`web/src/main.ts`, `trackScreen`): the first
screen, a question before it is handed over, the answer, the next question, the diary, the visit page, "Something
new or sudden?", About them. "Back" and the phone's own back button or gesture pop exactly one step and show that
screen as it was (the topic still open on the first screen); "Home" empties the stack. The person's screens are not
steps: there the press and hold goes back, as before. `scripts/e2e-simple.py --only back` walks a topic's tree six
screens deep and back, asserting each screen in reverse, with the Back button and again with the browser's own back,
and the same through the needs board, the first letter, "wants to say something", the diary and the visit page.

**After "something else" the carer always has a next step, made by the rules (`core/more.ts`,
`web/src/phase7.ts`).** After "a hot drink or a cold drink?" → "something else" the screen offered "Next: Are you
hungry?", a jump to another topic, and the owner did not know how to find out WHAT else. The screen now opens with
one line, "None of these. Find out what it is: one step at a time.", and a numbered list:
1. **"More choices like these"**: the next choices of the same kind, three at a time, from a fixed list and then
   About them (drinks: water, juice, milk, tea, coffee, then the family's own; food: the kinds, then the family's
   foods; people: the family, then a friend, a neighbour, the carer, the nurse, the doctor; places and things to do:
   the family's own first). Nothing that was already shown is offered again. Where the rules know no kind for the
   question, the first step is **"What is it about?"**, a picture card (a drink, food, a person, a place, my body, a
   feeling), and each answer leads to its list or its card.
2. the first letter; 3. "Ask them to show or write it"; 4. the AI's narrowing step, last, where there is one.

No question of another topic is on that screen any more, shown or under "More". **In "Body & care" and "Feelings"
the first two steps are "Show me where" (the body card) and the needs board**, never a list of guesses; the call box
rules of phase 5 are unchanged. **"Show me", "write it" and "draw" go on** instead of ending on "Ask another
question": "Did you understand?" → "Yes: type it" puts the carer's word on the person's screen as a choice under the
question that was open; the person points to it, is asked "So: [word]. Right?", and only their yes puts it in the
diary. "Not yet: try another way" goes back to the list of ways, not to the first screen. The app still picks and
confirms nothing for the person (`tests/unit/truth.test.ts`). `tests/unit/out-ways.test.ts` walks every either-or of
every topic and every tree to its way out and checks that the first step is one the rules make and never a topic
jump.

**Limits.** The lists are short and ours; a drink that is in neither the fixed list nor About them is found only by
the first letter or by showing it. What a question is about is read from its words by a small word list
(`core/kinds.ts`): a typed question it does not know gets "What is it about?". The typed word is the carer's; the
person's yes is to that word. Nobody the app is for has tried the new screen; the owner's own walk is what found
the two faults.

**Counts for phase 6 and the two fixes** (the code of `e4b67eb`; `devlog/evidence_phase6/`). 2698 unit tests (89 new:
`phase6-source` 30, `phase6-share` 39, `out-ways` 20). On the production build on localhost: `e2e-simple.py` 811/811
(its phase 6 run is 61 of them, the Back run 86, the "something else" run 44; `e2e-simple_local.txt`); `pwa-check.py`
30/30; `e2e-needs.mjs` 12/12; `overflow-check.py` 510/510 (it has no screens of phase 6 or of the two fixes of its
own: those are checked at 390 px only, in their own runs); `contrast-check.mjs` 144 pairs. Not run: `update-check.py`,
`e2e-noconfig.mjs`, and every script that needs a real model (none of this phase calls one).

## Changed on 18 Nov after a role-play on the phone
One of us played Carol and Frank (`design/PERSONA_SCENARIO.md`, fictional) on the hosted copy at 390 px. What it
found, and what changed (`CLAIMS.md` rows 73 to 76):

- **The data-use line was out of date.** The sheets said "Google's free tier: Google may use what is sent to improve
  its products". The project's Gemini API has been on the paid tier since 17 Nov (the owner's statement; we did not
  read the billing account, and no dated screenshot of it is in the repository yet). They now say what the paid terms say: Google does not use what is sent to improve its
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

Hosted copy: <https://talk-partner.web.app/#/demo>. Which build it serves, and what was run against it, is under [Deploy](#deploy-firebase-hosting), which is kept current; this paragraph was written on 17 Nov about the build of `188f03b`. It has our project settings, so it is the second or the third row of this table, depending on your browser. **Cloud help on the hosted copy is not reliable as of 17 Nov, 23:11 UTC:** from our machine reCAPTCHA Enterprise refuses the App Check attestation (HTTP 403 at 21:20 UTC; "ReCAPTCHA error" in the console at 23:11), and without a valid App Check token the service gives no answer, so `e2e-cloud.mjs --url` got 18/27 and 14/27 at the build of `2c5673e` and 15/27 at this one (the same script on localhost, with the debug token, 28/28 at this commit); the card says "Cloud help could not confirm this browser". We do not know yet whether a browser on another network passes (`devlog/evidence_live/appcheck_probe_2026-11-17_2c5673e.md`). Both rows were recorded on the hosted copy at earlier builds (`devlog/evidence_live/`): the cloud step in a browser without the model, last at the build of `4d7edee` (28/28 at 19:06 UTC), and the on-device step in a Chrome that has Gemini Nano at `deebc94` (at `30db57a` the on-device script was run on localhost, `devlog/evidence_r10/`; the labelled set at `7dd16a1`, on localhost; on the hosted copy the first step was last watched by hand at the build of `8810f8f`: `devlog/DAY13.md`). In a browser without Gemini Nano the "Sample family" line ends with **See what the on-device step makes →**: a recording of that step from our machine, labelled as a recording.

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
| `web/src/ai/firebaseEngine.ts:107` | `getAI(` | the AI Logic instance of the private step: its own Firebase app with no App Check, so a card made on this computer contacts no host |
| `web/src/ai/firebaseEngine.ts:113` | `getGenerativeModel(` | private step model |
| `web/src/ai/firebaseEngine.ts:114` | `InferenceMode.ONLY_ON_DEVICE` | its mode: family data must never fall back to the cloud |
| `web/src/ai/firebaseEngine.ts:128` | `getAI(` | the AI Logic instance of the cloud step (Gemini Developer API backend), on the app that has App Check; it uses the App Check session token (limited-use tokens per request were tried on 17 Nov and taken out the same day, see "Where the AI runs, in detail") |
| `web/src/ai/firebaseEngine.ts:134` | `getGenerativeModel(` | stripped step model |
| `web/src/ai/firebaseEngine.ts:135` | `InferenceMode.PREFER_IN_CLOUD` | its mode: no profile data, so an offline fall-back to the device is safe |
| `web/src/ai/firebaseEngine.ts:162` | `initializeDeviceModel(` | the one-time download of the private helper, from a user gesture |
| `web/src/ai/firebaseEngine.ts:176` | `generateContent(` | private step call (also the warm-up: one fixed sentence, no About me) |
| `web/src/ai/firebaseEngine.ts:177` | `inferenceSource !== InferenceSource.ON_DEVICE` | the private step rejects any answer not from the device |
| `web/src/ai/firebaseEngine.ts:192` | `getGenerativeModel(` | summary step model ("Today in short", `core/summary.ts`): the day's answers, on the same no-App-Check app as the private step |
| `web/src/ai/firebaseEngine.ts:193` | `InferenceMode.ONLY_ON_DEVICE` | its mode: the person's answers never fall back to the cloud; where the browser has no model the app's rules write the summary |
| `web/src/ai/firebaseEngine.ts:197` | `generateContent(` | summary step call |
| `web/src/ai/firebaseEngine.ts:198` | `inferenceSource !== InferenceSource.ON_DEVICE` | the summary step rejects any answer not from the device |
| `web/src/ai/firebaseEngine.ts:221` | `generateContent(` | stripped step call |
| `web/src/ai/firebaseEngine.ts:226` | `inferenceSource === InferenceSource.ON_DEVICE` | the badge source for the stripped step |
| `web/src/ai/firebaseEngine.ts:243` | `getGenerativeModel(` | letter step model for online help (phase 9): the first-letter helper's own fixed instructions and schema (`core/prompt.ts`, `LETTER_SCHEMA`: the kind as an enum, exactly 4 words), called only after the carer's yes |
| `web/src/ai/firebaseEngine.ts:244` | `InferenceMode.PREFER_IN_CLOUD` | its mode: the text holds the stripped question and the letter only (`core/letter.ts`, `letterCloudText`), so an offline fall-back to the device is safe |
| `web/src/ai/firebaseEngine.ts:249` | `generateContent(` | letter step call; code keeps only the words that start with the letter (`core/letter.ts`, `letterChoices`) |
| `web/src/ai/firebaseEngine.ts:252` | `inferenceSource === InferenceSource.ON_DEVICE` | where the letter's words were made, from the SDK's report |
| `web/src/ai/firebaseEngine.ts:264` | `getGenerativeModel(` | voice step model: the same cloud model, asked only for the words of a recording (`{"transcript": string}`) |
| `web/src/ai/firebaseEngine.ts:265` | `InferenceMode.ONLY_IN_CLOUD` | its mode: the SDK's on-device step takes text and JPEG / PNG only, so sound cannot run on the device; the app says "cloud" before the first use |
| `web/src/ai/firebaseEngine.ts:281` | `generateContent(` | voice step call: one per recording, the sound as `inlineData` (WAV), after a yes to the notice |
| `web/src/ai/firebaseEngine.ts:284` | `inferenceSource === InferenceSource.ON_DEVICE` | where the recording was turned into text, from the SDK's report |
| `web/src/ai/firebaseEngine.ts:295` | `getGenerativeModel(` | wording step model on the device ("plainer words" for the insight lines and the tip of the day, `core/reword.ts`), on the same no-App-Check app as the private step |
| `web/src/ai/firebaseEngine.ts:296` | `InferenceMode.ONLY_ON_DEVICE` | its mode: the prompt may hold the carer's health notes, so there is no cloud fall-back; without a model the rules' own words stand |
| `web/src/ai/firebaseEngine.ts:300` | `generateContent(` | wording step call on the device |
| `web/src/ai/firebaseEngine.ts:301` | `inferenceSource !== InferenceSource.ON_DEVICE` | the on-device wording step rejects any answer not from the device |
| `web/src/ai/firebaseEngine.ts:318` | `getGenerativeModel(` | photo step model ("Talk about a photo", `core/phototalk.ts`): one of the family's own photos and a fixed instruction, on the same no-App-Check app as the private step; the carer starts it with one button |
| `web/src/ai/firebaseEngine.ts:319` | `InferenceMode.ONLY_ON_DEVICE` | its mode: a family photo has no cloud path, in any mode; on a phone and wherever the browser has no model, the rules write the questions from the photo's word |
| `web/src/ai/firebaseEngine.ts:326` | `generateContent(` | photo step call: the picture as `inlineData` (JPEG), which the SDK's on-device step hands to Gemini Nano as an image |
| `web/src/ai/firebaseEngine.ts:327` | `inferenceSource !== InferenceSource.ON_DEVICE` | the photo step rejects any answer not from the device |
| `web/src/ai/firebaseEngine.ts:339` | `getGenerativeModel(` | wording step model for online help: the insight lines the rules wrote, called only after a yes on the sheet that shows the exact text (`web/src/main.ts`, `sendInsights`) |
| `web/src/ai/firebaseEngine.ts:340` | `InferenceMode.PREFER_IN_CLOUD` | its mode: the text holds no name, no health note and no diary entry, only the rules' counted lines (`core/insights.ts`, `insightCloudText`) |
| `web/src/ai/firebaseEngine.ts:345` | `generateContent(` | wording step call through online help |
| `web/src/ai/firebaseEngine.ts:348` | `inferenceSource === InferenceSource.ON_DEVICE` | where the lines were worded, from the SDK's report |
| `web/src/ai/firebaseEngine.ts:365` | `getGenerativeModel(` | Read aloud model (`core/speak.ts`, added 18 Nov, phase 5): a Gemini text-to-speech model, asked for the words on one card as sound; called only after the carer turned Read aloud on, on a sheet that says what goes |
| `web/src/ai/firebaseEngine.ts:366` | `InferenceMode.ONLY_IN_CLOUD` | its mode: the SDK has no on-device speech, so the mode says what happens, and the sheet says it first |
| `web/src/ai/firebaseEngine.ts:370` | `generateContent(` | Read aloud call: one per card text (the sound is kept, so "Hear it again" sends nothing); never a doctor-visit card |
| `web/src/ai/firebaseEngine.ts:375` | `inferenceSource === InferenceSource.ON_DEVICE` | where the words were spoken, from the SDK's report |
| `web/src/ai/firebaseEngine.ts:397` | `new FirebaseEngine(` | lazy start: Firebase is initialised on the first AI call, so loading the app with cloud help off contacts no Google host (with cloud help on, Remote Config is asked at load: see "Firebase Remote Config" below) |
| `web/src/ai/app.ts:36` | `initializeAppCheck(` | App Check, required by AI Logic for cloud requests; started by the first cloud call (a card, a recording) or the first feedback note, never at page load |
| `core/pipeline.ts:744` | `ran: r.source` | the private step's trace line is the engine's report |
| `core/pipeline.ts:869` | `ran: r.source` | the stripped step's trace line is the engine's report |
| `core/pipeline.ts:899` | `const sent = r.source === 'in-cloud'` | "sent" is claimed only when the SDK said the cloud answered |
| `web/src/main.ts:1179` | `function badge(` | the badge is drawn from `card.source` and the card's step trace only (`badgeKind` in `core/receipt.ts`) |

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

| [Broca AI Speech](https://aphasia.org/resource/broca-ai-speech/) (a listing of the National Aphasia Association; date not confirmed) | As the listing is summarised in judge round 6: it listens to a conversation and suggests reply cards that are spoken aloud, for people who cannot speak, write or type. **We did not open the page ourselves** | It drafts the person's replies. Talk Partner never drafts or speaks a reply for the person: the partner's question becomes a card, and Read aloud speaks the question and the choices, not an answer |
| [RealTalk Aid](https://www.producthunt.com/products/realtalk-aid) (Product Hunt, 1 Oct 2025) | As summarised in judge round 6 from a search result: real-time transcription and suggested responses for stroke survivors. **We did not open the page ourselves** | The same difference: suggested responses for the person, from a live transcript in the cloud. Here nothing listens to the person, and the choices come from the partner's own question |
| [Nemo Speak AAC](https://ai.google.dev/competition/projects/nemo-speak-aac) (an entry on a Google AI competition page) | As a search snippet in judge round 6 has it: an AAC app built on Gemini in the cloud. **We did not open the page ourselves** | An AAC board for the person. Talk Partner is the partner's tool, rules first, with the family's own data read only on the device |
| [Alela](https://apps.apple.com/ca/app/alela/id1560339762) (iOS App Store; date not confirmed) | As search snippets in judge round 7 have it: the partner's spoken question is turned into pictures, and a yes-no or either-or question is recognised and answers are suggested, for people who cannot speak. **Not opened by us** (the store page answered the judge's fetch with 429 and 404) | The closest in function that we know of. Talk Partner adds a way out on every card, the check ("So: tea. Right?"), coaching when the question itself does not fit (two in one, a memory question), the family's own entries and the diary; it is a web page, not an iOS app |

The last four rows were added on 18 Nov from the searches of judge rounds 6 and 7; unlike the rows above them, their pages were not read by us, and each row says so.

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
browser there is no cloud card. The card said "Cloud help could not confirm this browser, so there is no card. Load
the page again and try once more, …"; since phase 13 (judge round 10) App Check is asked first, inside the same 20 s,
and the card says "Online help could not check this browser, so nothing was sent and there is no card. Ask it as a
choice…", with the app's own card one tap away; App Check's message and the service's stand under "Where each step ran"; and
no second request is made, because after a 403 App Check refuses every try for a day, until the page is loaded again
(`namedAppCheckFailure` in `web/src/ai/app.ts`, `cloudRetryWait` in `core/pipeline.ts`). What was measured, step by step:
`devlog/evidence_live/appcheck_probe_2026-11-17_2c5673e.md`. Why reCAPTCHA began to refuse our machine that evening
we do not know (many automated runs from one address is a guess), nor whether a judge's browser passes. One availability probe (`LanguageModel.availability`, a capability query, no inference) is
the only direct touch of Chrome's API. Firebase's own guide to hybrid inference on the web runs the same query by hand
in the DevTools console; we run it in code as a capability probe, with no inference
(`await LanguageModel.availability();` in the guide's setup steps, <https://firebase.google.com/docs/ai-logic/hybrid/web/get-started>,
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
- **Quick needs** (`#/needs`): the person's screen with one fixed board, nine needs (eight, and since phase 5 "something's wrong") and the way out, each a
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
  pictures: 91 made with Gemini (WebP files in `web/public/pictures/`) and our own SVG drawings (source, date and licence or terms per picture in `PICTOGRAMS.md`); `store.ts` is the IndexedDB wrapper;
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
**Live: the build of `0852ce8`** (phases 17 and 17b: the health guard for typed questions, App Check started on the field, letters inside every topic, no dead end in the audit; its app code is the same as `c749bb0`, a later change was reverted), deployed 24 Nov 2026. The hosted script is the same file as our `dist/`. Run against the hosted copy: `e2e-simple.py --live` 1027/1027 and `phase12-walk.py --url` 631/631 on `0852ce8`; `pwa-check.py` 34/34, `e2e-needs.mjs` 13/13 and `phase17b-walk.py --url` 108/108 on `c749bb0` (same app code). Logs: `devlog/evidence_live/0852ce8/`.

Before it: **the build of `21bb1e0`** (phase 16: "Ask in your own words" first on the first screen, the sponsor's AI makes the card), deployed
24 Nov 2026 about 10:30 UTC. The hosted script (`index-DSComVT-.js`) is the same file as our `dist/`. Run against the hosted copy:
`e2e-simple.py --live` 1027/1027, `pwa-check.py` 34/34, `e2e-needs.mjs` 13/13, `phase12-walk.py --url` 559/559. Logs: `devlog/evidence_live/21bb1e0/`.

Before it: **the build of `cf4aa33`** (phase 15: the fixes of judge round 11: the sample family's diary, Read aloud and Beth / Bo / biscuits; the card stays
with "Asking Google's AI… Stop waiting"; call-now wording in the shared texts), deployed 24 Nov 2026 about 06:45 UTC. The hosted script
(`index-CHpgjZ-M.js`) is the same file as our `dist/`. Run against the hosted copy: `e2e-simple.py --live` 1024/1024, `pwa-check.py` 34/34,
`e2e-needs.mjs` 13/13, `phase12-walk.py --url` 457/457. Logs: `devlog/evidence_live/cf4aa33/`.

Before it: **the build of `479ce07`** (phase 14: "Find more choices (Google's AI, after your yes)" as the second button of a topic card,
Read aloud offered before handing over, the measured three-leg table), deployed 24 Nov 2026 about 04:15 UTC. The hosted script
(`index-B9UtTn6B.js`) is the same file as our `dist/`. Run against the hosted copy: `e2e-simple.py --live` 1024/1024, `pwa-check.py`
34/34, `e2e-needs.mjs` 13/13, `phase12-walk.py --url` 431/431. Logs: `devlog/evidence_live/479ce07/`.

Before it: **the build of `ca04bc9`** (phase 13: the safety fixes of judge round 10 and the pain picture leaning forward), deployed
24 Nov 2026 about 02:30 UTC. The hosted script (`index-Byg3lp_t.js`) is the same file as our `dist/`. Run against the hosted copy:
`e2e-simple.py --live` 1024/1024, `pwa-check.py` 34/34, `e2e-needs.mjs` 13/13, `phase12-walk.py --url` 335/335. Logs: `devlog/evidence_live/ca04bc9/`.

Before it: **the build of `39e8f33`** (after phase 12b: the general pain picture made again on 23 Nov 2026 with the arms
down, so it reads as pain all over and not as a stomach ache or as "too cold"; the sample family kept apart from the
family's own data on a phone and a desktop), deployed 23 Nov 2026 about 21:40 UTC. The hosted script
(`index-zcpxbGxV.js`) has the same SHA-256 as our `dist/`, and so does `pictures/pain.webp`. Run against the hosted
copy: `e2e-simple.py --live` 1022/1022, `pwa-check.py` 34/34, `e2e-needs.mjs` 13/13, `phase11-walk.py --url` 48/48,
`phase12-walk.py --url` 255/255. The speech code did not change since `51470a8` (below). Logs: `devlog/evidence_live/39e8f33/`.

Before it: **the build of `51470a8`** (phase 12b, the fixes of judge round 9b: pain-scale faces, the stroke check after one
"no", drinks never learned as a habit, few-drinks under 6, "Find more choices" second, the crisis page's "Stop for now",
the sample family on a phone, the emergency number on the first screen), deployed 22 Nov 2026 about 18:05 UTC. The
hosted script (`index-5-VejOQ5.js`) has the same SHA-256 as our `dist/`. Run against the hosted copy: `e2e-simple.py
--live` 1022/1022, `pwa-check.py` 34/34, `e2e-needs.mjs` 13/13, `phase12-walk.py --url` 222/222. Read aloud on this
build: three runs were refused by App Check (403, "initial-throttle" for a day) after a long day of automated runs from
one machine, so no sound came back; the speech code did not change in phase 12b, and on `9dc8060` the hosted copy
passed 3 of 3 (below). On 23 Nov 2026 about 20:00 UTC, in a normal (headed) browser window with no debug token, we
ran it three more times on this build: the first run was still refused by App Check (the same throttle, no sound,
6 of 10 checks), the next two passed 10 of 10 (`inferenceSource=in_cloud`, about 8.9 s of sound, "Hear it again"
asked nothing). Logs: `devlog/evidence_live/51470a8/` and `devlog/evidence_live/51470a8/speak_2026-11-23/`.

Before it: **the build of `9dc8060`** (phase 12: the fixes of judge round 9: low mood, pain and the weak-or-numb question,
the needs-board call box, the crisis choice, eight pictures made again and three added, the first screen's pictures
preloaded, "See the AI at work" above the fold), deployed 22 Nov 2026 about 16:00 UTC. The hosted script
(`index-BYKP941p.js`) has the same SHA-256 as our `dist/`. Run against the hosted copy: `e2e-simple.py --live`
1022/1022, `pwa-check.py` 34/34, `e2e-needs.mjs` 13/13, `phase11-walk.py --url` 48/48, `phase12-walk.py --url` 142/142
(after a wait for picture loading was added to its curtain check). Read aloud against the real model on the hosted copy
(`HEADED=1 e2e-speak.py --url https://talk-partner.web.app/`, a normal Chromium window at 390 px, no token): 10/10 three
times out of three, `inferenceSource=in_cloud`, sound back in 7.5–9.0 s (`devlog/evidence_live/9dc8060/speak_hosted/`).
Not run on a real Android phone. (Three earlier runs that afternoon were on our dev server with the debug token, not on
the hosted copy: `devlog/evidence_local_devserver_9dc8060_speak/`.) Logs: `devlog/evidence_live/9dc8060/`.

Before it: **the build of `cb15e70`** (phase 11: colour pictures made with Gemini on the cards, our drawings for the rest;
also "Not now" on the person's own start), deployed 20 Nov 2026 about 22:05 UTC. The hosted script (`index-DlgnWDMw.js`)
has the same SHA-256 as our `dist/`; `/pictures/tea.webp` is served as `image/webp`. Run against the hosted copy:
`e2e-simple.py --live` 1022/1022, `pwa-check.py` 34/34, `e2e-needs.mjs` 13/13, `phase11-walk.py --url` 48/48; by hand: after
the first load the worker holds all 84 picture files, and offline the needs board shows all nine pictures, none broken.
Not run on this build: `e2e-cloud.mjs` (the cloud path did not change in phase 11). Logs: `devlog/evidence_live/cb15e70/`.

Before it: **the build of `ce47da2`** (phase 10: "His turn", the person starts, and About them in a file), deployed 19 Nov
2026 about 06:15 UTC. The hosted script (`index-CkiUcXgi.js`) has the same SHA-256 as our `dist/`, and the hosted
manifest has the `#/turn` shortcut. Run against the hosted copy: `e2e-simple.py --live` 1022/1022, `pwa-check.py`
32/32, `e2e-needs.mjs` 12/12, `phase8-shots.py` 21/21, `phase9-shots.py` 39/39, `phase10-shots.py` 132/132;
`HEADED=1 e2e-cloud.mjs` on a steady connection, one fresh profile: 28/28, first cloud card in 3.09 s
(`inferenceSource=in_cloud`). Logs: `devlog/evidence_live/*ce47da2*`.

Before it: **the build of `8a8eaf7`** (phase 9, the person's screen in any font, the cloud wait at 20 s), deployed 19 Nov
2026 about 00:00 UTC. The hosted script (`index-Cb1gCXUU.js`) has the same SHA-256 as our `dist/`. Run against the
hosted copy: `e2e-simple.py --live` 992/992, `pwa-check.py` 30/30, `e2e-needs.mjs` 12/12, `phase8-shots.py` 21/21,
`phase9-shots.py` 39/39. `HEADED=1 e2e-cloud.mjs`, five fresh profiles over a slow phone hotspot (about 300 KB/s at
the time): 28/28 twice (first cloud card in 14.9 s and 9.7 s, `inferenceSource=in_cloud`), and three times the
first cloud card did not come within 20 s, so the card said "Cloud help took longer than 20 seconds" (16, 19 and 18
of 27). Logs: `devlog/evidence_live/*8a8eaf7*`. The same check again that evening on a steady connection (ping
about 14–22 ms, no loss), one fresh profile at a time with 15 minutes between runs: 28/28 three times out of three,
first cloud card in 3.05 s, 3.05 s and 3.04 s (`*_headed_run6_steady.txt` to `run8`; the `commit` line in these logs
is the local checkout, which differs from `8a8eaf7` only in docs and scripts). So the three slow runs above were the
connection, not the cloud step.

Two deploys earlier the same evening: `e23b493` (phase 9 as built) failed one check live, the person's three
pictures on 390 x 844 before the web font arrived (991/992), fixed in `ffb2521`; `ffb2521` ran 992/992, 30/30, 12/12,
21/21, 39/39, and its cloud runs (headed) cut the first card at 12 s in 3 of 5, so the limit went to 20 s.
Logs: `devlog/evidence_live/*e23b493*`, `*ffb2521*`.

The build before them, `32dd0dd` (phase 8 and the "No card for this question" line), deployed 18 Nov 2026 about
20:19 UTC. The hosted script (`index-aXtqJJit.js`) has the same SHA-256 as our `dist/`. Run against the hosted copy:
`e2e-simple.py --live` 991/991, `pwa-check.py` 30/30, `e2e-needs.mjs` 12/12, `phase8-shots.py` 21/21, and
`HEADED=1 e2e-cloud.mjs` (a normal Chrome window, fresh profile) 28/28. Logs: `devlog/evidence_live/*32dd0dd*`.

The deploy before it, `1a5e79f` (about 19:42 UTC): `e2e-simple.py --live` 991/991, `pwa-check.py` 30/30,
`e2e-needs.mjs` 12/12, `phase8-shots.py` 20/20. `e2e-cloud.mjs` from fresh headless profiles: 28/28 once, 19/27 four
times; in those four App Check refused the headless browser (a 403, then "Requests throttled"), so no cloud card was
made and the card said so. The same check in a normal Chrome window (`HEADED=1`), five times: 28/28 each,
`inferenceSource=in_cloud`. Logs: `devlog/evidence_live/*1a5e79f*`. Whoever deploys next writes the new commit above;
`tests/unit/docs-truth.test.ts` fails while an older build is named as the live one.

The deploy before it, 18 Nov 2026, about 16:52 UTC: <https://talk-partner.web.app> served the build of commit
`45e8095` (phases 6 and 7). The organiser of judge round 7 found its `index.html`, script and stylesheet SHA-256
identical to our `dist/` of `45e8095` and ran against it: `overflow-check.py` 534/534, `e2e-needs.mjs` 12/12,
`pwa-check.py` 30/30, `e2e-simple.py --live` 926/926 on a second run (a first run, beside other scripts, stopped on a
timeout after 604 checks, none failed). Those are the organiser's notes of the round, not files in this repository. No
`--live` script of ours and no run of the cloud step or of Read aloud was made against that build. (Earlier the same
day, 12:11 UTC, a deploy of `3e09079` had been refused before anything was uploaded: "Your credentials are no longer
valid", `devlog/evidence_live/deploy_2026-11-18_3e09079.txt`; the owner signed in again.)

The deploy before that, 18 Nov 2026, 07:05 UTC: <https://talk-partner.web.app> served the build of commit `9d141b0` (phase 5, the
fixes of judge round 6: "they can start", "Something new or sudden?" and the call box, the answer check's exemptions,
the new lines of "what stands out", a fall and tablets in the diary, Read aloud, "Just this once", the photo line,
"Since the last visit"). Each of the 20 served files has the SHA-256 of the local build, and `/` equals
`dist/index.html` (`devlog/evidence_live/served-files_live_2026-11-18_9d141b0.txt`; the deploy log is next to it).
Against it, all in `devlog/evidence_live/` with `9d141b0` in the name:
- `e2e-simple.py --live` 611/611 (a phone at 390 px with the navigation, learning, photo, phase 3, phase 4 and phase 5
  runs, a desktop, a tablet, and the phone with the connection off; no "Yes" is pressed on a sheet, so Read aloud was
  not turned on and no question was sent in this run);
- `pwa-check.py` 30/30; `e2e-needs.mjs` 12/12;
- **the cloud step, five runs of `e2e-cloud.mjs --url`, each from a new browser profile, 07:05 to 07:07 UTC: 28/28
  once, 19/27 four times.** In the four, App Check gave the browser no token (reCAPTCHA Enterprise answered 403, and
  App Check then holds further attempts back for a day: "Requests throttled due to previous 403 error"), the service
  gave no card, and the screen said "Cloud help could not confirm this browser". The runs come from one Mac, one
  network and a headless Chrome; whether a judge's browser or a real phone passes we still do not know. This is the
  open risk of the hosted copy: every AI step on a phone is behind that check;
- **Read aloud on the hosted copy, one run of `e2e-speak.py --url` (headless Chromium as a phone): refused the same
  way.** The sheet, the switch and the card worked; the speech request got no App Check token, no sound came, and the
  person's screen said "The voice did not come. Say it out loud yourself." (`speak_live_2026-11-18_9d141b0/AI_RUN_LOG.md`,
  6 of 10 checks). The same script on the dev server, with the debug token, 10/10 with sound
  (`devlog/evidence_phase5/AI_RUN_LOG.md`).
Not run against this build: `overflow-check.py` (510/510 on localhost at `d198eb0`), `update-check.py`,
`e2e-noconfig.mjs` (25/25 on localhost at `de631b1`), `e2e-ondevice.mjs`, `e2e-phase4-ai.py`; nothing on a real phone;
the App Check enforcement state and the billing tier in the console were not read by us at the time. We read them on
19 Nov 2026, 05:09–05:10 UTC (screenshots with the time on them, account name hidden:
`devlog/evidence_live/gemini_rate_limit_tier1_2026-11-19.png`, `devlog/evidence_live/appcheck_console_2026-11-19.png`):
the Gemini API project "Talk Partner" is on **Tier 1** (paid; Gemini 3.5 Flash Lite 4K requests a minute, peak use 20 in
28 days), on a Blaze billing plan; App Check for Firebase AI Logic is **not enforced**: "Basic - Monitoring", 88% of
requests verified and 12% unverified, replay protection off, and the console says it will enforce AI Logic requests from
21 Jan 2027. That matches what the probe above measured: the service answers only a request that carries a valid App
Check token, whatever the console's enforcement setting.

The deploy before it, 18 Nov 2026, 05:14 UTC: <https://talk-partner.web.app> serves the build of commit `421dae0` (the three
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
