# On-device proof run

- date: 2026-11-16T22:22:25.213Z
- commit: `1092be70fa5c8e13875b662573a6b524ac2ad052` (ondevice-proof-1); working tree clean
- browser: Chrome/157.0.8103.52, headless, attached on port 9335
- app: http://localhost:5179/ (the dev server of this commit), judge mode, the made-up sample family (Frank; Carol asking; Jenny "Jen", Tyler; the lake, church, hardware store; pot roast, chili)
- SDK: firebase 13.3.0, @firebase/ai 3.1.0

## 1. Page load
- status line right after load: "Getting the private helper ready on this computer. The first time after the browser starts can take about half a minute."
- status line became "Ready on this computer." after 15.8 s (the model is loaded into memory by one fixed warm-up sentence, no About me in it)
- PASS  the private helper is ready in this browser  (Ready on this computer.)
- SDK report for the warm-up: `[ai-logic] leg=private mode=ONLY_ON_DEVICE inferenceSource=on_device ms=16105`
- PASS  loading the app and warming the model contacted no host but the app itself  (33 requests, all to localhost:5179)
- PASS  cloud help is off  (Cloud help: off)

## 2. Cloud help OFF: the private step, with About me, on this computer

**Asked:** "Who should we call tonight?"  (3563 ms from submit to card)
- badge line: On this computer · nothing left this computer · Jenny, Tyler from About me
- tiles on the person's card: Jenny / Tyler / someone else
- why: The private step proposed: call · choice · Jenny, Tyler, doctor · either-or options: Jenny / Tyler / doctor · Kept: Jenny, Tyler · Dropped: doctor (over the limit at this support level) · From About me (never sent): Jenny, Tyler · Decided by: the model proposed; code checked every choice · Headline: the model's topic
- trace: Private step (on this computer): ran on this computer (3516 ms) · used for this card — got the question and the About me lists
- trace: Cloud step (question only): did not run — not needed: the card made on this computer was good enough
- trace: Rules in code: ran on this computer · used for this card — applied the card rules
- what was sent: Nothing sent for this card.
- SDK report (console): `[ai-logic] leg=private mode=ONLY_ON_DEVICE inferenceSource=on_device ms=3516`
- requests to hosts other than localhost:5179: none
- PASS  "Who should we call tonight?": badge "On this computer"  (On this computer)
- PASS  "Who should we call tonight?": the SDK reported inferenceSource=on_device for the private step  ([ai-logic] leg=private mode=ONLY_ON_DEVICE inferenceSource=on_device ms=3516)
- PASS  "Who should we call tonight?": the card offers the family's own people from About me  (Jenny, Tyler)
- PASS  "Who should we call tonight?": nothing was sent and no other host was contacted  (0 outside requests)
  screenshot: `devlog/ondevice_proof_1/01-on-device-who-to-call.png`
  screenshot: `devlog/ondevice_proof_1/01-on-device-who-to-call-full.png`

**Asked:** "What do you want to do this weekend?"  (3551 ms from submit to card)
- badge line: On this computer · nothing left this computer · lake, church from About me
- tiles on the person's card: lake / church / something else
- why: The private step proposed: weekend · choice · lake, church, home · Kept: lake, church · Dropped: home (over the limit at this support level) · From About me (never sent): lake, church · Decided by: the model proposed; code checked every choice · Headline: the model's topic
- trace: Private step (on this computer): ran on this computer (3352 ms) · used for this card — got the question and the About me lists
- trace: Cloud step (question only): did not run — not needed: the card made on this computer was good enough
- trace: Rules in code: ran on this computer · used for this card — applied the card rules
- what was sent: Nothing sent for this card.
- SDK report (console): `[ai-logic] leg=private mode=ONLY_ON_DEVICE inferenceSource=on_device ms=3352`
- requests to hosts other than localhost:5179: none
- PASS  "What do you want to do this weekend?": badge "On this computer"  (On this computer)
- PASS  "What do you want to do this weekend?": the SDK reported inferenceSource=on_device for the private step  ([ai-logic] leg=private mode=ONLY_ON_DEVICE inferenceSource=on_device ms=3352)
- PASS  "What do you want to do this weekend?": the card offers the family's own places from About me  (lake, church)
- PASS  "What do you want to do this weekend?": nothing was sent and no other host was contacted  (0 outside requests)
  screenshot: `devlog/ondevice_proof_1/02-on-device-weekend.png`

**Asked:** "What would you like for dinner?"  (3158 ms from submit to card)
- badge line: On this computer · nothing left this computer · pot roast, chili from About me
- tiles on the person's card: pot roast / chili / something else
- why: The private step proposed: dinner · choice · pot roast, chili, nothing · Kept: pot roast, chili · Dropped: nothing (negative wording) · From About me (never sent): pot roast, chili · Decided by: the model proposed; code checked every choice · Headline: the model's topic
- trace: Private step (on this computer): ran on this computer (3150 ms) · used for this card — got the question and the About me lists
- trace: Cloud step (question only): did not run — not needed: the card made on this computer was good enough
- trace: Rules in code: ran on this computer · used for this card — applied the card rules
- what was sent: Nothing sent for this card.
- SDK report (console): `[ai-logic] leg=private mode=ONLY_ON_DEVICE inferenceSource=on_device ms=3150`
- requests to hosts other than localhost:5179: none
- PASS  "What would you like for dinner?": badge "On this computer"  (On this computer)
- PASS  "What would you like for dinner?": the SDK reported inferenceSource=on_device for the private step  ([ai-logic] leg=private mode=ONLY_ON_DEVICE inferenceSource=on_device ms=3150)
- PASS  "What would you like for dinner?": the card offers the family's own foods from About me  (pot roast, chili)
- PASS  "What would you like for dinner?": nothing was sent and no other host was contacted  (0 outside requests)

**Asked:** "Where shall we go on Sunday?"  (3351 ms from submit to card)
- badge line: On this computer · nothing left this computer · the lake, church from About me
- tiles on the person's card: the lake / church / somewhere else
- why: The private step proposed: Sunday · choice · the lake, church, hardware store · Kept: the lake, church · Dropped: hardware store (over the limit at this support level) · From About me (never sent): the lake, church · Decided by: the model proposed; code checked every choice · Headline: the model's topic
- trace: Private step (on this computer): ran on this computer (3173 ms) · used for this card — got the question and the About me lists
- trace: Cloud step (question only): did not run — not needed: the card made on this computer was good enough
- trace: Rules in code: ran on this computer · used for this card — applied the card rules
- what was sent: Nothing sent for this card.
- SDK report (console): `[ai-logic] leg=private mode=ONLY_ON_DEVICE inferenceSource=on_device ms=3173`
- requests to hosts other than localhost:5179: none
- PASS  "Where shall we go on Sunday?": badge "On this computer"  (On this computer)
- PASS  "Where shall we go on Sunday?": the SDK reported inferenceSource=on_device for the private step  ([ai-logic] leg=private mode=ONLY_ON_DEVICE inferenceSource=on_device ms=3173)
- PASS  "Where shall we go on Sunday?": the card offers the family's own places from About me  (the lake, church)
- PASS  "Where shall we go on Sunday?": nothing was sent and no other host was contacted  (0 outside requests)

A card that code decides alone runs no model, even here:

**Asked:** "Do you want coffee or tea?"  (316 ms from submit to card)
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

**Asked:** "Who should we call tonight?"  (3349 ms from submit to card)
- badge line: On this computer · nothing left this computer · Jenny, Tyler from About me
- tiles on the person's card: Jenny / Tyler / someone else
- why: The private step proposed: call · choice · Jenny, Tyler, church · Kept: Jenny, Tyler · Dropped: church (does not answer this kind of question) · From About me (never sent): Jenny, Tyler · Decided by: the model proposed; code checked every choice · Headline: the model's topic
- trace: Private step (on this computer): ran on this computer (3187 ms) · used for this card — got the question and the About me lists
- trace: Cloud step (question only): did not run — not needed: the card made on this computer was good enough
- trace: Rules in code: ran on this computer · used for this card — applied the card rules
- notes: Every choice on this card is from About me, so cloud help is not asked: it never sees About me.
- what was sent: Nothing sent for this card.
- SDK report (console): `[ai-logic] leg=private mode=ONLY_ON_DEVICE inferenceSource=on_device ms=3187`
- requests to hosts other than localhost:5179: none
- PASS  an all-About-me card stays on this computer with cloud help on: the cloud is not asked  (On this computer; 0 outside requests)
  screenshot: `devlog/ondevice_proof_1/03-cloud-on-card-stays-here.png`

**Asked:** "Which shirt for the doctor?"  (5175 ms from submit to card)
- badge line: Cloud help (question only) · the question left this computer, no About me words in it
- tiles on the person's card: this one / that one / something else
- why: The cloud step proposed: doctor shirt · choice · blue shirt, white shirt · Added by code: this one (The real options are not known: hold up two and point to each as you ask.), that one (The real options are not known: hold up two and point to each as you ask.) · Dropped: blue shirt (an invented detail of their own things), white shirt (an invented detail of their own things) · Decided by: the model proposed; code checked every choice · Headline: the model's topic
- trace: Private step (on this computer): ran on this computer (3300 ms) — got the question and the About me lists
- trace: Cloud step (question only): ran in the cloud (1703 ms) · used for this card — got the question only, About me words swapped out
- trace: Rules in code: ran on this computer · used for this card — applied the card rules
- notes: The real options are not known: hold up two and point to each as you ask.
- what was sent: Sent for this card: `Partner asks: Which shirt for the doctor?`
- SDK report (console): `[ai-logic] leg=private mode=ONLY_ON_DEVICE inferenceSource=on_device ms=3300`, `[ai-logic] leg=stripped mode=PREFER_IN_CLOUD inferenceSource=in_cloud ms=1703`
- requests to hosts other than localhost:5179: GET https://www.google.com/recaptcha/enterprise.js; OPTIONS https://content-firebaseappcheck.googleapis.com/v1/projects/talk-partner/apps/[app-id]:exchangeDebugToken; POST https://content-firebaseappcheck.googleapis.com/v1/projects/talk-partner/apps/[app-id]:exchangeDebugToken; GET https://www.gstatic.com/recaptcha/releases/4i3aN5wAweL7i3ADI7BSX4B-/recaptcha__en.js [from the browser cache, no network]; GET https://www.google.com/recaptcha/enterprise/anchor; OPTIONS https://firebasevertexai.googleapis.com/v1beta/projects/talk-partner/models/gemini-3.5-flash-lite:generateContent; POST https://firebasevertexai.googleapis.com/v1beta/projects/talk-partner/models/gemini-3.5-flash-lite:generateContent
- PASS  a card the device could not make well goes to the cloud step (inferenceSource=in_cloud)  (Cloud help (question only); [ai-logic] leg=private mode=ONLY_ON_DEVICE inferenceSource=on_device ms=3300 [ai-logic] leg=stripped mode=PREFER_IN_CLOUD inferenceSource=in_cloud ms=1703)
- PASS  the request went through Firebase AI Logic  (www.google.com, content-firebaseappcheck.googleapis.com, www.gstatic.com, firebasevertexai.googleapis.com)
- PASS  what was sent is the question only  (Partner asks: Which shirt for the doctor?)
- PASS  both steps ran for this card: the private step on this computer, then the question-only step in the cloud  ([ai-logic] leg=private mode=ONLY_ON_DEVICE inferenceSource=on_device ms=3300 [ai-logic] leg=stripped mode=PREFER_IN_CLOUD inferenceSource=in_cloud ms=1703)
  screenshot: `devlog/ondevice_proof_1/04-hybrid-device-then-cloud.png`

## 4. Network OFF: the question-only step falls back to this computer

**Asked:** "Which shirt for the doctor?"  (6588 ms from submit to card)
- badge line: Ran on this computer (offline) · nothing left this computer
- tiles on the person's card: this one / that one / something else
- why: The question-only step (run on this computer, offline) proposed: shirt · choice · blue shirt, green shirt · either-or options: blue shirt / green shirt · Added by code: this one (The real options are not known: hold up two and point to each as you ask.), that one (The real options are not known: hold up two and point to each as you ask.) · Dropped: blue shirt (an invented detail of their own things), green shirt (an invented detail of their own things) · Decided by: the model proposed; code checked every choice · Headline: the model's topic
- trace: Private step (on this computer): ran on this computer (3181 ms) — got the question and the About me lists
- trace: Cloud step (question only): ran on this computer (3215 ms) · used for this card — the cloud was unreachable, so the stripped question ran on this computer
- trace: Rules in code: ran on this computer · used for this card — applied the card rules
- notes: The real options are not known: hold up two and point to each as you ask. | Ran on this computer (offline). Nothing was sent.
- what was sent: Not sent. If cloud help were on, it would get only this: `Partner asks: Which shirt for the doctor?`
- SDK report (console): `[ai-logic] leg=private mode=ONLY_ON_DEVICE inferenceSource=on_device ms=3181`, `[ai-logic] leg=stripped mode=PREFER_IN_CLOUD inferenceSource=on_device ms=3215`
- requests to hosts other than localhost:5179: POST https://firebasevertexai.googleapis.com/v1beta/projects/talk-partner/models/gemini-3.5-flash-lite:generateContent [failed: net::ERR_INTERNET_DISCONNECTED]
- PASS  PREFER_IN_CLOUD fell back to the device: the SDK reported inferenceSource=on_device for the question-only step  ([ai-logic] leg=private mode=ONLY_ON_DEVICE inferenceSource=on_device ms=3181 [ai-logic] leg=stripped mode=PREFER_IN_CLOUD inferenceSource=on_device ms=3215)
- PASS  badge "Ran on this computer (offline)", and the card says nothing was sent  (Ran on this computer (offline) · nothing left this computer)
- PASS  every request to another host failed or was read from the browser cache (the network was off)  (firebasevertexai.googleapis.com: net::ERR_INTERNET_DISCONNECTED)
  screenshot: `devlog/ondevice_proof_1/05-offline-fallback.png`

**Asked:** "Who should we call tonight?"  (2939 ms from submit to card)
- badge line: On this computer · nothing left this computer · Jenny, Tyler from About me
- tiles on the person's card: Jenny / Tyler / someone else
- why: The private step proposed: call · choice · Jenny, Tyler, church · Kept: Jenny, Tyler · Dropped: church (does not answer this kind of question) · From About me (never sent): Jenny, Tyler · Decided by: the model proposed; code checked every choice · Headline: the model's topic
- trace: Private step (on this computer): ran on this computer (2902 ms) · used for this card — got the question and the About me lists
- trace: Cloud step (question only): did not run — not needed: the card made on this computer was good enough
- trace: Rules in code: ran on this computer · used for this card — applied the card rules
- notes: Every choice on this card is from About me, so cloud help is not asked: it never sees About me.
- what was sent: Nothing sent for this card.
- SDK report (console): `[ai-logic] leg=private mode=ONLY_ON_DEVICE inferenceSource=on_device ms=2902`
- requests to hosts other than localhost:5179: none
- PASS  offline, the private step works as before  (Jenny / Tyler / someone else)

- privacy receipt for this session: 9 cards this session. Left this computer: 4505 bytes in 1 request (27 bytes of question text). Withheld before sending: 0 names, 0 other About me words. Checked after sending: 0 About me words and 0 photos in the sent text. 1 cloud step ran on this computer instead (cloud unreachable): nothing left.
- session line: Judge mode · This session: 1 no AI · 7 on this computer · 1 cloud help · 0 failed

## 5. The same questions in a Chrome without the model (throwaway profile), cloud help on
- status line: "This computer can't run the private helper. Yes/no, either-or and pain questions still work. Open questions need cloud help. Turn on cloud help"

**Asked:** "Who should we call tonight?"  (1958 ms from submit to card)
- badge line: Cloud help (question only) · the question left this computer, no About me words in it
- tiles on the person's card: family / friend / someone else
- why: The cloud step proposed: call tonight · choice · Person A, family, friend · Kept: family, friend · Dropped: Person A (a label the cloud made up) · Decided by: the model proposed; code checked every choice · Headline: the model's topic
- trace: Private step (on this computer): did not run — the private helper is not ready on this computer
- trace: Cloud step (question only): ran in the cloud (1855 ms) · used for this card — got the question only, About me words swapped out
- trace: Rules in code: ran on this computer · used for this card — applied the card rules
- what was sent: Sent for this card: `Partner asks: Who should we call tonight?`
- SDK report (console): `[ai-logic] leg=stripped mode=PREFER_IN_CLOUD inferenceSource=in_cloud ms=1855`
- requests to hosts other than localhost:5179: GET https://www.google.com/recaptcha/enterprise.js; POST https://content-firebaseappcheck.googleapis.com/v1/projects/talk-partner/apps/[app-id]:exchangeDebugToken; OPTIONS https://content-firebaseappcheck.googleapis.com/v1/projects/talk-partner/apps/[app-id]:exchangeDebugToken; GET https://www.gstatic.com/recaptcha/releases/4i3aN5wAweL7i3ADI7BSX4B-/recaptcha__en.js; OPTIONS https://firebasevertexai.googleapis.com/v1beta/projects/talk-partner/models/gemini-3.5-flash-lite:generateContent; POST https://firebasevertexai.googleapis.com/v1beta/projects/talk-partner/models/gemini-3.5-flash-lite:generateContent; GET https://www.google.com/recaptcha/enterprise/anchor
- PASS  without the model, "Who should we call tonight?" is answered by the cloud step, which has no About me  (Cloud help (question only); sent: Partner asks: Who should we call tonight?)
  screenshot: `devlog/ondevice_proof_1/06-no-model-cloud-who-to-call.png`

**Asked:** "What would you like for dinner?"  (2747 ms from submit to card)
- badge line: Cloud help (question only) · the question left this computer, no About me words in it
- tiles on the person's card: chicken / fish / something else
- why: The cloud step proposed: dinner · choice · chicken, fish, soup · Kept: chicken, fish · Dropped: soup (over the limit at this support level) · Decided by: the model proposed; code checked every choice · Headline: the model's topic
- trace: Private step (on this computer): did not run — the private helper is not ready on this computer
- trace: Cloud step (question only): ran in the cloud (2729 ms) · used for this card — got the question only, About me words swapped out
- trace: Rules in code: ran on this computer · used for this card — applied the card rules
- what was sent: Sent for this card: `Partner asks: What would you like for dinner?`
- SDK report (console): `[ai-logic] leg=stripped mode=PREFER_IN_CLOUD inferenceSource=in_cloud ms=2729`
- requests to hosts other than localhost:5179: POST https://firebasevertexai.googleapis.com/v1beta/projects/talk-partner/models/gemini-3.5-flash-lite:generateContent
- PASS  without the model, "What would you like for dinner?" is answered by the cloud step, which has no About me  (Cloud help (question only); sent: Partner asks: What would you like for dinner?)

**Asked:** "What should we get Jenny for her birthday?"  (3366 ms from submit to card)
- badge line: Cloud help (question only) · the question left this computer, 1 name and 0 other About me words swapped out
- tiles on the person's card: book / clothes / something else
- why: The cloud step proposed: Jenny's birthday · choice · book, clothes, gift card · Kept: book, clothes · Dropped: gift card (over the limit at this support level) · Decided by: the model proposed; code checked every choice · Headline: the model's topic
- trace: Private step (on this computer): did not run — the private helper is not ready on this computer
- trace: Cloud step (question only): ran in the cloud (3264 ms) · used for this card — got the question only, About me words swapped out
- trace: Rules in code: ran on this computer · used for this card — applied the card rules
- what was sent: Sent for this card: `Partner asks: What should we get Person A for her birthday?`
- SDK report (console): `[ai-logic] leg=stripped mode=PREFER_IN_CLOUD inferenceSource=in_cloud ms=3264`
- requests to hosts other than localhost:5179: POST https://firebasevertexai.googleapis.com/v1beta/projects/talk-partner/models/gemini-3.5-flash-lite:generateContent
- PASS  a name in the question is swapped before it is sent: "Person A", not "Jenny"  (Partner asks: What should we get Person A for her birthday?; · the question left this computer, 1 name and 0 other About me words swapped out)
  screenshot: `devlog/ondevice_proof_1/07-no-model-cloud-person-a.png`

## Result
33/33 checks passed at commit `1092be70fa5c8e13875b662573a6b524ac2ad052`.
