# On-device proof run

- date: 2026-11-17T00:22:40.210Z
- commit: `67fb3e2c2ab2819ba3ff1e52862be75c60a582ed` (ondevice-proof-1-24-g67fb3e2); working tree clean
- browser: Chrome/157.0.8103.52, headless, attached on port 9335
- app: http://localhost:5179/ (the dev server of this commit), judge mode, the made-up sample family (Frank; Carol asking; Jenny "Jen", Tyler; the lake, church, hardware store; pot roast, chili)
- SDK: firebase 13.3.0, @firebase/ai 3.1.0

## 1. Page load
- status line right after load: "Getting the private helper ready on this computer. The first time after the browser starts this took 15 to 20 seconds on our computer."
- status line became "Ready on this computer." after 21.7 s (the model is loaded into memory by one fixed warm-up sentence, no About me in it)
- PASS  the private helper is ready in this browser  (Ready on this computer.)
- SDK report for the warm-up: `[ai-logic] leg=private mode=ONLY_ON_DEVICE inferenceSource=on_device ms=22064`
- this was a cold start (the browser had just been started): the warm-up took 22.1 s
- PASS  loading the app and warming the model contacted no host but the app itself  (34 requests, all to localhost:5179)
- PASS  cloud help is off  (Cloud help: off)

## 2. Cloud help OFF: the private step, with About me, on this computer

**Asked:** "Who should we call tonight?"  (3573 ms from submit to card)
- badge line: On this computer · nothing left this computer · Jenny, Tyler from About me
- tiles on the person's card: Jenny / Tyler / someone else
- why: The private step proposed: call · choice · Jenny, Tyler, doctor · Kept: Jenny, Tyler · Dropped: doctor (on the next page: this card shows two at a time) · From About me (never sent): Jenny, Tyler · Decided by: the model proposed; code checked every choice · Headline: the model's topic
- trace: Private step (on this computer): ran on this computer (3552 ms) · used for this card — got the question and the About me lists
- trace: Cloud step (question only): did not run — not needed: the card made on this computer was good enough
- trace: Rules in code: ran on this computer · used for this card — applied the card rules
- notes: More on the next page: doctor. "someone else" on the card, or "Next: more choices", shows the next page.
- what was sent: Nothing sent for this card.
- SDK report (console): `[ai-logic] leg=private mode=ONLY_ON_DEVICE inferenceSource=on_device ms=3552`
- requests to hosts other than localhost:5179: none
- PASS  "Who should we call tonight?": badge "On this computer"  (On this computer)
- PASS  "Who should we call tonight?": the SDK reported inferenceSource=on_device for the private step  ([ai-logic] leg=private mode=ONLY_ON_DEVICE inferenceSource=on_device ms=3552)
- PASS  "Who should we call tonight?": the card offers the family's own people from About me  (Jenny, Tyler)
- PASS  "Who should we call tonight?": nothing was sent and no other host was contacted  (0 outside requests)
  screenshot: `devlog/eval_runs/final/ondevice/01-on-device-who-to-call.png`
  screenshot: `devlog/eval_runs/final/ondevice/01-on-device-who-to-call-full.png`

**Asked:** "What do you want to do this weekend?"  (3346 ms from submit to card)
- badge line: On this computer · nothing left this computer · lake, church from About me
- tiles on the person's card: lake / church / something else
- why: The private step proposed: weekend · choice · lake, church, home · Kept: lake, church · Dropped: home (on the next page: this card shows two at a time) · From About me (never sent): lake, church · Decided by: the model proposed; code checked every choice · Headline: the model's topic
- trace: Private step (on this computer): ran on this computer (3332 ms) · used for this card — got the question and the About me lists
- trace: Cloud step (question only): did not run — not needed: the card made on this computer was good enough
- trace: Rules in code: ran on this computer · used for this card — applied the card rules
- notes: More on the next page: home. "something else" on the card, or "Next: more choices", shows the next page.
- what was sent: Nothing sent for this card.
- SDK report (console): `[ai-logic] leg=private mode=ONLY_ON_DEVICE inferenceSource=on_device ms=3332`
- requests to hosts other than localhost:5179: none
- PASS  "What do you want to do this weekend?": badge "On this computer"  (On this computer)
- PASS  "What do you want to do this weekend?": the SDK reported inferenceSource=on_device for the private step  ([ai-logic] leg=private mode=ONLY_ON_DEVICE inferenceSource=on_device ms=3332)
- PASS  "What do you want to do this weekend?": the card offers the family's own places from About me  (lake, church)
- PASS  "What do you want to do this weekend?": nothing was sent and no other host was contacted  (0 outside requests)
  screenshot: `devlog/eval_runs/final/ondevice/02-on-device-weekend.png`

**Asked:** "What would you like for dinner?"  (3752 ms from submit to card)
- badge line: On this computer · nothing left this computer · pot roast, chili from About me
- tiles on the person's card: pot roast / chili / something else
- why: The private step proposed: dinner · choice · pot roast, chili, another thing · Kept: pot roast, chili · Dropped: another thing (on the next page: this card shows two at a time) · From About me (never sent): pot roast, chili · Decided by: the model proposed; code checked every choice · Headline: the model's topic
- trace: Private step (on this computer): ran on this computer (3688 ms) · used for this card — got the question and the About me lists
- trace: Cloud step (question only): did not run — not needed: the card made on this computer was good enough
- trace: Rules in code: ran on this computer · used for this card — applied the card rules
- notes: More on the next page: another thing. "something else" on the card, or "Next: more choices", shows the next page.
- what was sent: Nothing sent for this card.
- SDK report (console): `[ai-logic] leg=private mode=ONLY_ON_DEVICE inferenceSource=on_device ms=3688`
- requests to hosts other than localhost:5179: none
- PASS  "What would you like for dinner?": badge "On this computer"  (On this computer)
- PASS  "What would you like for dinner?": the SDK reported inferenceSource=on_device for the private step  ([ai-logic] leg=private mode=ONLY_ON_DEVICE inferenceSource=on_device ms=3688)
- PASS  "What would you like for dinner?": the card offers the family's own foods from About me  (pot roast, chili)
- PASS  "What would you like for dinner?": nothing was sent and no other host was contacted  (0 outside requests)

**Asked:** "Where shall we go on Sunday?"  (3957 ms from submit to card)
- badge line: On this computer · nothing left this computer · the lake, church from About me
- tiles on the person's card: the lake / church / somewhere else
- why: The private step proposed: Sunday · choice · the lake, church, hardware store · Kept: the lake, church · Dropped: hardware store (on the next page: this card shows two at a time) · From About me (never sent): the lake, church · Decided by: the model proposed; code checked every choice · Headline: the model's topic
- trace: Private step (on this computer): ran on this computer (3808 ms) · used for this card — got the question and the About me lists
- trace: Cloud step (question only): did not run — not needed: the card made on this computer was good enough
- trace: Rules in code: ran on this computer · used for this card — applied the card rules
- notes: More on the next page: hardware store. "somewhere else" on the card, or "Next: more choices", shows the next page.
- what was sent: Nothing sent for this card.
- SDK report (console): `[ai-logic] leg=private mode=ONLY_ON_DEVICE inferenceSource=on_device ms=3808`
- requests to hosts other than localhost:5179: none
- PASS  "Where shall we go on Sunday?": badge "On this computer"  (On this computer)
- PASS  "Where shall we go on Sunday?": the SDK reported inferenceSource=on_device for the private step  ([ai-logic] leg=private mode=ONLY_ON_DEVICE inferenceSource=on_device ms=3808)
- PASS  "Where shall we go on Sunday?": the card offers the family's own places from About me  (the lake, church)
- PASS  "Where shall we go on Sunday?": nothing was sent and no other host was contacted  (0 outside requests)

A card that code decides alone runs no model, even here:

**Asked:** "Do you want coffee or tea?"  (305 ms from submit to card)
- badge line: No AI needed · nothing left this computer
- tiles on the person's card: coffee / tea / something else
- why: No model answer reached the rules · Decided by: either-or: the two options read from the question in code · Headline: the shared topic of the two options
- trace: Private step (on this computer): did not run — not needed: this card is made by rules alone
- trace: Cloud step (question only): did not run — not needed: this card is made by rules alone
- trace: Rules in code: ran on this computer · used for this card — applied the card rules
- what was sent: Nothing sent for this card.
- SDK report (console): (no model call)
- requests to hosts other than localhost:5179: none
- PASS  "Do you want coffee or tea?": "No AI needed", no model call, instant  (No AI needed, 0 model calls)

## 3. Cloud help ON: the two steps side by side
- PASS  cloud help was turned on through the consent screen  (Cloud help: on)

**Asked:** "Who should we call tonight?"  (4157 ms from submit to card)
- badge line: On this computer · nothing left this computer · Jenny, Tyler from About me
- tiles on the person's card: Jenny / Tyler / someone else
- why: The private step proposed: call · choice · Jenny, Tyler, doctor · either-or options: Jenny / Tyler / doctor · Kept: Jenny, Tyler · Dropped: doctor (on the next page: this card shows two at a time) · From About me (never sent): Jenny, Tyler · Decided by: the model proposed; code checked every choice · Headline: the model's topic
- trace: Private step (on this computer): ran on this computer (3987 ms) · used for this card — got the question and the About me lists
- trace: Cloud step (question only): did not run — not needed: the card made on this computer was good enough
- trace: Rules in code: ran on this computer · used for this card — applied the card rules
- notes: More on the next page: doctor. "someone else" on the card, or "Next: more choices", shows the next page.
- what was sent: Nothing sent for this card.
- SDK report (console): `[ai-logic] leg=private mode=ONLY_ON_DEVICE inferenceSource=on_device ms=3987`
- requests to hosts other than localhost:5179: none
- PASS  an all-About-me card stays on this computer with cloud help on: the cloud is not asked  (On this computer; 0 outside requests)
  screenshot: `devlog/eval_runs/final/ondevice/03-cloud-on-card-stays-here.png`

**Asked:** "Which shirt for the doctor?"  (14686 ms from submit to card)
- badge line: Cloud help (question only) · the question left this computer, no About me words in it
- tiles on the person's card: this one / that one / something else
- why: The cloud step proposed: shirt for doctor · choice · blue shirt, white shirt · Added by code: this one (The real options are not known: hold up two and point to each as you ask.), that one (The real options are not known: hold up two and point to each as you ask.) · Dropped: blue shirt (an invented detail of their own things), white shirt (an invented detail of their own things) · Decided by: the model proposed; code checked every choice · Headline: the model's topic
- trace: Private step (on this computer): ran on this computer (3414 ms) — got the question and the About me lists
- trace: Cloud step (question only): ran in the cloud (11094 ms) · used for this card — got the question only, About me words swapped out
- trace: Rules in code: ran on this computer · used for this card — applied the card rules
- notes: The real options are not known: hold up two and point to each as you ask.
- what was sent: Sent for this card: `Partner asks: Which shirt for the doctor?`
- SDK report (console): `[ai-logic] leg=private mode=ONLY_ON_DEVICE inferenceSource=on_device ms=3414`, `[ai-logic] leg=stripped mode=PREFER_IN_CLOUD inferenceSource=in_cloud ms=11094`
- requests to hosts other than localhost:5179: GET https://www.google.com/recaptcha/enterprise.js [from the browser cache, no network]; GET https://www.gstatic.com/recaptcha/releases/4i3aN5wAweL7i3ADI7BSX4B-/recaptcha__en.js [from the browser cache, no network]; GET https://www.google.com/recaptcha/enterprise/anchor; POST https://content-firebaseappcheck.googleapis.com/v1/projects/talk-partner/apps/[app-id]:exchangeDebugToken; OPTIONS https://content-firebaseappcheck.googleapis.com/v1/projects/talk-partner/apps/[app-id]:exchangeDebugToken; OPTIONS https://firebasevertexai.googleapis.com/v1beta/projects/talk-partner/models/gemini-3.5-flash-lite:generateContent; POST https://firebasevertexai.googleapis.com/v1beta/projects/talk-partner/models/gemini-3.5-flash-lite:generateContent
- PASS  a card the device could not make well goes to the cloud step (inferenceSource=in_cloud)  (Cloud help (question only); [ai-logic] leg=private mode=ONLY_ON_DEVICE inferenceSource=on_device ms=3414 [ai-logic] leg=stripped mode=PREFER_IN_CLOUD inferenceSource=in_cloud ms=11094)
- PASS  the request went through Firebase AI Logic  (www.google.com, www.gstatic.com, content-firebaseappcheck.googleapis.com, firebasevertexai.googleapis.com)
- PASS  what was sent is the question only  (Partner asks: Which shirt for the doctor?)
- PASS  both steps ran for this card: the private step on this computer, then the question-only step in the cloud  ([ai-logic] leg=private mode=ONLY_ON_DEVICE inferenceSource=on_device ms=3414 [ai-logic] leg=stripped mode=PREFER_IN_CLOUD inferenceSource=in_cloud ms=11094)
  screenshot: `devlog/eval_runs/final/ondevice/04-hybrid-device-then-cloud.png`

## 4. Network OFF: the question-only step falls back to this computer

**Asked:** "Which shirt for the doctor?"  (7197 ms from submit to card)
- badge line: Ran on this computer (offline) · nothing left this computer
- tiles on the person's card: this one / that one / something else
- why: The question-only step (run on this computer, offline) proposed: shirt · choice · blue shirt, green shirt · Added by code: this one (The real options are not known: hold up two and point to each as you ask.), that one (The real options are not known: hold up two and point to each as you ask.) · Dropped: blue shirt (an invented detail of their own things), green shirt (an invented detail of their own things) · Decided by: the model proposed; code checked every choice · Headline: the model's topic
- trace: Private step (on this computer): ran on this computer (3842 ms) — got the question and the About me lists
- trace: Cloud step (question only): ran on this computer (3190 ms) · used for this card — the cloud was unreachable, so the stripped question ran on this computer
- trace: Rules in code: ran on this computer · used for this card — applied the card rules
- notes: The real options are not known: hold up two and point to each as you ask. | Ran on this computer (offline). Nothing was sent.
- what was sent: Not sent for this card. Cloud help would have got only this: `Partner asks: Which shirt for the doctor?`
- SDK report (console): `[ai-logic] leg=private mode=ONLY_ON_DEVICE inferenceSource=on_device ms=3842`, `[ai-logic] leg=stripped mode=PREFER_IN_CLOUD inferenceSource=on_device ms=3190`
- requests to hosts other than localhost:5179: POST https://firebasevertexai.googleapis.com/v1beta/projects/talk-partner/models/gemini-3.5-flash-lite:generateContent [failed: net::ERR_INTERNET_DISCONNECTED]
- PASS  PREFER_IN_CLOUD fell back to the device: the SDK reported inferenceSource=on_device for the question-only step  ([ai-logic] leg=private mode=ONLY_ON_DEVICE inferenceSource=on_device ms=3842 [ai-logic] leg=stripped mode=PREFER_IN_CLOUD inferenceSource=on_device ms=3190)
- PASS  badge "Ran on this computer (offline)", and the card says nothing was sent  (Ran on this computer (offline) · nothing left this computer)
- PASS  every request to another host failed or was read from the browser cache (the network was off)  (firebasevertexai.googleapis.com: net::ERR_INTERNET_DISCONNECTED)
  screenshot: `devlog/eval_runs/final/ondevice/05-offline-fallback.png`

**Asked:** "Who should we call tonight?"  (3546 ms from submit to card)
- badge line: On this computer · nothing left this computer · Jenny, Tyler from About me
- tiles on the person's card: Jenny / Tyler / someone else
- why: The private step proposed: call tonight · choice · Jenny, Tyler, doctor · Kept: Jenny, Tyler · Dropped: doctor (on the next page: this card shows two at a time) · From About me (never sent): Jenny, Tyler · Decided by: the model proposed; code checked every choice · Headline: the model's topic
- trace: Private step (on this computer): ran on this computer (3440 ms) · used for this card — got the question and the About me lists
- trace: Cloud step (question only): did not run — not needed: the card made on this computer was good enough
- trace: Rules in code: ran on this computer · used for this card — applied the card rules
- notes: More on the next page: doctor. "someone else" on the card, or "Next: more choices", shows the next page.
- what was sent: Nothing sent for this card.
- SDK report (console): `[ai-logic] leg=private mode=ONLY_ON_DEVICE inferenceSource=on_device ms=3440`
- requests to hosts other than localhost:5179: none
- PASS  offline, the private step works as before  (Jenny / Tyler / someone else)

- privacy receipt for this session: 9 cards this session. Handed to the cloud step: 4505 bytes in 1 request (27 bytes of question text). Withheld before sending: 0 names, 0 other About me words. Checked after sending: 0 About me words and 0 photos in the sent text. 1 cloud step ran on this computer instead (cloud unreachable): nothing left.
- session line: Judge mode · This session: 1 no AI · 7 on this computer · 1 cloud help · 0 no card · 0 failed

## 5. The same questions in a Chrome without the model (throwaway profile), cloud help on
- status line: "Checking whether this computer can run the private helper…"

**Asked:** "What do you want to do this weekend?"  (4170 ms from submit to card)
- badge line: Cloud help (question only) · the question left this computer, no About me words in it
- tiles on the person's card: stay home / go out / something else
- why: The cloud step proposed: weekend · choice · stay home, go out, visit family · Kept: stay home, go out · Dropped: visit family (on the next page: this card shows two at a time) · Decided by: the model proposed; code checked every choice · Headline: the model's topic
- trace: Private step (on this computer): did not run — the private helper is not ready on this computer
- trace: Cloud step (question only): ran in the cloud (4083 ms) · used for this card — got the question only, About me words swapped out
- trace: Rules in code: ran on this computer · used for this card — applied the card rules
- notes: More on the next page: visit family. "something else" on the card, or "Next: more choices", shows the next page.
- what was sent: Sent for this card: `Partner asks: What do you want to do this weekend?`
- SDK report (console): `[ai-logic] leg=stripped mode=PREFER_IN_CLOUD inferenceSource=in_cloud ms=4083`
- requests to hosts other than localhost:5179: GET https://www.google.com/recaptcha/enterprise.js; POST https://content-firebaseappcheck.googleapis.com/v1/projects/talk-partner/apps/[app-id]:exchangeDebugToken; OPTIONS https://content-firebaseappcheck.googleapis.com/v1/projects/talk-partner/apps/[app-id]:exchangeDebugToken; GET https://www.gstatic.com/recaptcha/releases/4i3aN5wAweL7i3ADI7BSX4B-/recaptcha__en.js; GET https://www.google.com/recaptcha/enterprise/anchor; POST https://firebasevertexai.googleapis.com/v1beta/projects/talk-partner/models/gemini-3.5-flash-lite:generateContent; OPTIONS https://firebasevertexai.googleapis.com/v1beta/projects/talk-partner/models/gemini-3.5-flash-lite:generateContent
- PASS  without the model, "What do you want to do this weekend?" is answered by the cloud step, which has no About me  (Cloud help (question only); sent: Partner asks: What do you want to do this weekend?)
- same question, the two steps: on this computer lake / church; from the cloud stay home / go out
- PASS  "What do you want to do this weekend?": the two steps give different cards (About-me entries on this computer, none from the cloud)  (on this computer: lake / church; cloud: stay home / go out)
  screenshot: `devlog/eval_runs/final/ondevice/08-no-model-cloud-weekend.png`

**Asked:** "What would you like for dinner?"  (1321 ms from submit to card)
- badge line: Cloud help (question only) · the question left this computer, no About me words in it
- tiles on the person's card: meat / fish / something else
- why: The cloud step proposed: dinner · choice · meat, fish, vegetables · Kept: meat, fish · Dropped: vegetables (on the next page: this card shows two at a time) · Decided by: the model proposed; code checked every choice · Headline: the model's topic
- trace: Private step (on this computer): did not run — the private helper is not ready on this computer
- trace: Cloud step (question only): ran in the cloud (1239 ms) · used for this card — got the question only, About me words swapped out
- trace: Rules in code: ran on this computer · used for this card — applied the card rules
- notes: More on the next page: vegetables. "something else" on the card, or "Next: more choices", shows the next page.
- what was sent: Sent for this card: `Partner asks: What would you like for dinner?`
- SDK report (console): `[ai-logic] leg=stripped mode=PREFER_IN_CLOUD inferenceSource=in_cloud ms=1239`
- requests to hosts other than localhost:5179: POST https://firebasevertexai.googleapis.com/v1beta/projects/talk-partner/models/gemini-3.5-flash-lite:generateContent
- PASS  without the model, "What would you like for dinner?" is answered by the cloud step, which has no About me  (Cloud help (question only); sent: Partner asks: What would you like for dinner?)
- same question, the two steps: on this computer pot roast / chili; from the cloud meat / fish
- PASS  "What would you like for dinner?": the two steps give different cards (About-me entries on this computer, none from the cloud)  (on this computer: pot roast / chili; cloud: meat / fish)

**Asked:** "Who should we call tonight?"  (1517 ms from submit to card)
- badge line: Cloud help (question only) · the question left this computer, no About me words in it
- tiles on the person's card: doctor / Jenny / someone else
- why: The cloud step proposed: call tonight · choice · family, doctor, friend · Kept: doctor · Added by code: Jenny (people from About me) · Dropped: family (a general word when About me has the people themselves), friend (a general word when About me has the people themselves) · From About me (never sent): Jenny · Decided by: the model proposed; code checked every choice · Headline: the model's topic
- trace: Private step (on this computer): did not run — the private helper is not ready on this computer
- trace: Cloud step (question only): ran in the cloud (1318 ms) · used for this card — got the question only, About me words swapped out
- trace: Rules in code: ran on this computer · used for this card — applied the card rules
- notes: Choices completed from people from About me.
- what was sent: Sent for this card: `Partner asks: Who should we call tonight?`
- SDK report (console): `[ai-logic] leg=stripped mode=PREFER_IN_CLOUD inferenceSource=in_cloud ms=1318`
- requests to hosts other than localhost:5179: POST https://firebasevertexai.googleapis.com/v1beta/projects/talk-partner/models/gemini-3.5-flash-lite:generateContent
- PASS  without the model, "Who should we call tonight?" is answered by the cloud step, which has no About me  (Cloud help (question only); sent: Partner asks: Who should we call tonight?)
  screenshot: `devlog/eval_runs/final/ondevice/06-no-model-cloud-who-to-call.png`

**Asked:** "What should we get Jenny for her birthday?"  (1120 ms from submit to card)
- badge line: Cloud help (question only) · the question left this computer, 1 name and 0 other About me words swapped out
- tiles on the person's card: book / game / something else
- why: The cloud step proposed: Jenny's birthday · choice · book, game, clothes · Kept: book, game · Dropped: clothes (on the next page: this card shows two at a time) · Decided by: the model proposed; code checked every choice · Headline: the model's topic
- trace: Private step (on this computer): did not run — the private helper is not ready on this computer
- trace: Cloud step (question only): ran in the cloud (1027 ms) · used for this card — got the question only, About me words swapped out
- trace: Rules in code: ran on this computer · used for this card — applied the card rules
- notes: More on the next page: clothes. "something else" on the card, or "Next: more choices", shows the next page.
- what was sent: Sent for this card: `Partner asks: What should we get Person A for her birthday?`
- SDK report (console): `[ai-logic] leg=stripped mode=PREFER_IN_CLOUD inferenceSource=in_cloud ms=1027`
- requests to hosts other than localhost:5179: POST https://firebasevertexai.googleapis.com/v1beta/projects/talk-partner/models/gemini-3.5-flash-lite:generateContent
- PASS  a name in the question is swapped before it is sent: "Person A", not "Jenny"  (Partner asks: What should we get Person A for her birthday?; · the question left this computer, 1 name and 0 other About me words swapped out)
  screenshot: `devlog/eval_runs/final/ondevice/07-no-model-cloud-person-a.png`

## Result
36/36 checks passed at commit `67fb3e2c2ab2819ba3ff1e52862be75c60a582ed`.
