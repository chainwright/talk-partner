# On-device proof run

- date: 2026-11-17T04:22:49.922Z
- commit: `0afbf77ac0fb98316c44e6aae7e442e4b2a95841` (ondevice-proof-1-50-g0afbf77); working tree clean
- browser: Chrome/157.0.8103.52, headless, attached on port 9335
- app: http://localhost:5179/ (the dev server of this commit), judge mode, the made-up sample family (Frank; Carol asking; Jenny "Jen", Tyler; the lake, church, hardware store; pot roast, chili)
- SDK: firebase 13.3.0, @firebase/ai 3.1.0

## 1. Page load
- status line right after load: "Getting the private helper ready on this computer. The first time after the browser starts this can take up to half a minute. When it is ready, the first step runs by itself: Gemini Nano on this computer makes the card for "What do you want to do this weekend?" from About me. Nothing is sent."
- status line became "Ready on this computer." after 3 s (the model is loaded into memory by one fixed warm-up sentence, no About me in it)
- PASS  the private helper is ready in this browser  (Ready on this computer. First step, running by itself: Gemini Nano on this computer is making the card for "What do you want to do this weekend?" from About me. A few seconds; nothing is sent.)
- SDK report for the warm-up: `[ai-logic] leg=private mode=ONLY_ON_DEVICE inferenceSource=on_device ms=3257`
- the model was already in this browser's memory (warm-up 3.3 s); a cold start, right after the browser starts, takes much longer (README, "Limits, stated")
- PASS  loading the app and warming the model contacted no host but the app itself  (40 requests, all to localhost:5179)
- PASS  cloud help is off  (Cloud help: off)

## 1b. Judge mode's first step, with no click
The first frame is a card made in code (coffee or tea). When the model is ready the app itself asks "What do you want to do this weekend?"; nothing below was clicked or typed.
- the card appeared 3.6 s after "Ready"
- status line: "Ready on this computer. The card shown was made by Gemini Nano on this computer, from About me: its badge comes from what the SDK reported."
- badge line: On this computer · nothing left this computer · lake, church from About me
- tiles on the person's card: lake / church / something else; chip lit: "What do you want to do this weekend?"
- trace: Private step (on this computer): ran on this computer (2959 ms) · used for this card — got the question and the About me lists
- trace: Cloud step (question only): did not run — not needed: the card made on this computer was good enough
- trace: Rules in code: ran on this computer · used for this card — applied the card rules
- what was sent: Nothing sent for this card.; under the chips: 0 bytes left this computer 2 cards this session · page load not counted
- SDK report (console), warm-up and this card: `[ai-logic] leg=private mode=ONLY_ON_DEVICE inferenceSource=on_device ms=3257`, `[ai-logic] leg=private mode=ONLY_ON_DEVICE inferenceSource=on_device ms=2959`
- requests to hosts other than localhost:5179 since page load: none
- PASS  the first step ran by itself: a card for the weekend question, badge "On this computer", its chip lit  (On this computer; lit: What do you want to do this weekend?)
- PASS  the SDK reported inferenceSource=on_device for it (the second on-device call of the page, after the warm-up)  ([ai-logic] leg=private mode=ONLY_ON_DEVICE inferenceSource=on_device ms=3257 | [ai-logic] leg=private mode=ONLY_ON_DEVICE inferenceSource=on_device ms=2959)
- PASS  its choices are the family's own, from About me, and the card says so  (lake / church / something else · nothing left this computer · lake, church from About me)
- PASS  nothing was sent for it and no other host was contacted  (0 outside requests; 0 bytes left this computer 2 cards this session · page load )
  screenshot: `<scratch>/ondevice/00-first-step-on-device.png`

## 2. Cloud help OFF: the private step, with About me, on this computer

**Asked:** "Who should we call tonight?"  (3145 ms from submit to card)
- badge line: On this computer · nothing left this computer · Jenny, Tyler from About me
- tiles on the person's card: Jenny / Tyler / someone else
- why: The private step proposed: call · choice · Jenny, Tyler, doctor · Kept: Jenny, Tyler · Dropped: doctor (on the next page: this card shows two at a time) · From About me (never sent): Jenny, Tyler · Decided by: the model proposed; code checked every choice · Headline: the model's topic
- trace: Private step (on this computer): ran on this computer (3070 ms) · used for this card — got the question and the About me lists
- trace: Cloud step (question only): did not run — not needed: the card made on this computer was good enough
- trace: Rules in code: ran on this computer · used for this card — applied the card rules
- notes: More on the next page: doctor. "someone else" on the card, or "Next: more choices", shows the next page.
- what was sent: Nothing sent for this card.
- SDK report (console): `[ai-logic] leg=private mode=ONLY_ON_DEVICE inferenceSource=on_device ms=3070`
- requests to hosts other than localhost:5179: none
- PASS  "Who should we call tonight?": badge "On this computer"  (On this computer)
- PASS  "Who should we call tonight?": the SDK reported inferenceSource=on_device for the private step  ([ai-logic] leg=private mode=ONLY_ON_DEVICE inferenceSource=on_device ms=3070)
- PASS  "Who should we call tonight?": the card offers the family's own people from About me  (Jenny, Tyler)
- PASS  "Who should we call tonight?": nothing was sent and no other host was contacted  (0 outside requests)
  screenshot: `<scratch>/ondevice/01-on-device-who-to-call.png`
  screenshot: `<scratch>/ondevice/01-on-device-who-to-call-full.png`

**Asked:** "What do you want to do this weekend?"  (3141 ms from submit to card)
- badge line: On this computer · nothing left this computer · lake, church from About me
- tiles on the person's card: lake / church / something else
- why: The private step proposed: weekend · choice · lake, church, Packers · Kept: lake, church · Dropped: Packers (on the next page: this card shows two at a time) · From About me (never sent): lake, church · Decided by: the model proposed; code checked every choice · Headline: the model's topic
- trace: Private step (on this computer): ran on this computer (3036 ms) · used for this card — got the question and the About me lists
- trace: Cloud step (question only): did not run — not needed: the card made on this computer was good enough
- trace: Rules in code: ran on this computer · used for this card — applied the card rules
- notes: More on the next page: Packers. "something else" on the card, or "Next: more choices", shows the next page.
- what was sent: Nothing sent for this card.
- SDK report (console): `[ai-logic] leg=private mode=ONLY_ON_DEVICE inferenceSource=on_device ms=3036`
- requests to hosts other than localhost:5179: none
- PASS  "What do you want to do this weekend?": badge "On this computer"  (On this computer)
- PASS  "What do you want to do this weekend?": the SDK reported inferenceSource=on_device for the private step  ([ai-logic] leg=private mode=ONLY_ON_DEVICE inferenceSource=on_device ms=3036)
- PASS  "What do you want to do this weekend?": the card offers the family's own places from About me  (lake, church)
- PASS  "What do you want to do this weekend?": nothing was sent and no other host was contacted  (0 outside requests)
  screenshot: `<scratch>/ondevice/02-on-device-weekend.png`

**Asked:** "What would you like for dinner?"  (3137 ms from submit to card)
- badge line: On this computer · nothing left this computer · pot roast, chili from About me
- tiles on the person's card: pot roast / chili / something else
- why: The private step proposed: dinner · choice · pot roast, chili, soup · Kept: pot roast, chili · Dropped: soup (on the next page: this card shows two at a time) · From About me (never sent): pot roast, chili · Decided by: the model proposed; code checked every choice · Headline: the model's topic
- trace: Private step (on this computer): ran on this computer (3067 ms) · used for this card — got the question and the About me lists
- trace: Cloud step (question only): did not run — not needed: the card made on this computer was good enough
- trace: Rules in code: ran on this computer · used for this card — applied the card rules
- notes: More on the next page: soup. "something else" on the card, or "Next: more choices", shows the next page.
- what was sent: Nothing sent for this card.
- SDK report (console): `[ai-logic] leg=private mode=ONLY_ON_DEVICE inferenceSource=on_device ms=3067`
- requests to hosts other than localhost:5179: none
- PASS  "What would you like for dinner?": badge "On this computer"  (On this computer)
- PASS  "What would you like for dinner?": the SDK reported inferenceSource=on_device for the private step  ([ai-logic] leg=private mode=ONLY_ON_DEVICE inferenceSource=on_device ms=3067)
- PASS  "What would you like for dinner?": the card offers the family's own foods from About me  (pot roast, chili)
- PASS  "What would you like for dinner?": nothing was sent and no other host was contacted  (0 outside requests)

**Asked:** "Where shall we go on Sunday?"  (3144 ms from submit to card)
- badge line: On this computer · nothing left this computer · the lake, church from About me
- tiles on the person's card: the lake / church / somewhere else
- why: The private step proposed: Sunday · choice · the lake, church, hardware store · Kept: the lake, church · Dropped: hardware store (on the next page: this card shows two at a time) · From About me (never sent): the lake, church · Decided by: the model proposed; code checked every choice · Headline: the model's topic
- trace: Private step (on this computer): ran on this computer (3070 ms) · used for this card — got the question and the About me lists
- trace: Cloud step (question only): did not run — not needed: the card made on this computer was good enough
- trace: Rules in code: ran on this computer · used for this card — applied the card rules
- notes: More on the next page: hardware store. "somewhere else" on the card, or "Next: more choices", shows the next page.
- what was sent: Nothing sent for this card.
- SDK report (console): `[ai-logic] leg=private mode=ONLY_ON_DEVICE inferenceSource=on_device ms=3070`
- requests to hosts other than localhost:5179: none
- PASS  "Where shall we go on Sunday?": badge "On this computer"  (On this computer)
- PASS  "Where shall we go on Sunday?": the SDK reported inferenceSource=on_device for the private step  ([ai-logic] leg=private mode=ONLY_ON_DEVICE inferenceSource=on_device ms=3070)
- PASS  "Where shall we go on Sunday?": the card offers the family's own places from About me  (the lake, church)
- PASS  "Where shall we go on Sunday?": nothing was sent and no other host was contacted  (0 outside requests)

A card that code decides alone runs no model, even here:

**Asked:** "Do you want coffee or tea?"  (311 ms from submit to card)
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

**Remote Config** (asked when cloud help was turned on): Remote Config answered at 22:23. Each row says whether its value came from there. cloud_text_model = gemini-3.5-flash-lite (remote); route_mood_words = 2 (remote); route_min_choices = 2 (remote)
- its requests: firebaseinstallations.googleapis.com, firebaseremoteconfig.googleapis.com
- PASS  cloud help was turned on through the consent screen  (Cloud help: on)
- PASS  turning cloud help on asked Firebase Remote Config, and the three settings in use came from it  (cloud_text_model = gemini-3.5-flash-lite (remote); route_mood_words = 2 (remote); route_min_choices = 2 (remote))

**Asked:** "Who should we call tonight?"  (3145 ms from submit to card)
- badge line: On this computer · nothing left this computer · Jen, Tyler from About me
- tiles on the person's card: Jen / Tyler / someone else
- why: The private step proposed: call · choice · Jen, Tyler, doctor · Kept: Jen, Tyler · Dropped: doctor (on the next page: this card shows two at a time) · From About me (never sent): Jen, Tyler · Decided by: the model proposed; code checked every choice · Headline: the model's topic
- trace: Private step (on this computer): ran on this computer (3113 ms) · used for this card — got the question and the About me lists
- trace: Cloud step (question only): did not run — not needed: the card made on this computer was good enough
- trace: Rules in code: ran on this computer · used for this card — applied the card rules
- notes: More on the next page: doctor. "someone else" on the card, or "Next: more choices", shows the next page.
- what was sent: Nothing sent for this card.
- SDK report (console): `[ai-logic] leg=private mode=ONLY_ON_DEVICE inferenceSource=on_device ms=3113`
- requests to hosts other than localhost:5179: none
- PASS  an all-About-me card stays on this computer with cloud help on: the cloud is not asked  (On this computer; 0 outside requests)
  screenshot: `<scratch>/ondevice/03-cloud-on-card-stays-here.png`

**Asked:** "Which shirt for the doctor?"  (4968 ms from submit to card)
- badge line: Cloud help (question only) · the question left this computer, no About me words in it
- tiles on the person's card: one shirt / another shirt / something else
- why: The cloud step proposed: shirt · choice · one shirt, another shirt · Kept: one shirt, another shirt · Decided by: the model proposed; code checked every choice · Headline: the model's topic
- trace: Private step (on this computer): ran on this computer (3243 ms) — got the question and the About me lists
- trace: Cloud step (question only): ran in the cloud (1636 ms) · used for this card — got the question only, About me words swapped out
- trace: Rules in code: ran on this computer · used for this card — applied the card rules
- what was sent: Sent for this card: `Partner asks: Which shirt for the doctor?`
- SDK report (console): `[ai-logic] leg=private mode=ONLY_ON_DEVICE inferenceSource=on_device ms=3243`, `[ai-logic] leg=stripped mode=PREFER_IN_CLOUD inferenceSource=in_cloud ms=1636`
- requests to hosts other than localhost:5179: GET https://www.google.com/recaptcha/enterprise.js; POST https://content-firebaseappcheck.googleapis.com/v1/projects/talk-partner/apps/[app-id]:exchangeDebugToken; GET https://www.gstatic.com/recaptcha/releases/4i3aN5wAweL7i3ADI7BSX4B-/recaptcha__en.js [from the browser cache, no network]; GET https://www.google.com/recaptcha/enterprise/anchor; POST https://firebasevertexai.googleapis.com/v1beta/projects/talk-partner/models/gemini-3.5-flash-lite:generateContent
- PASS  a card the device could not make well goes to the cloud step (inferenceSource=in_cloud)  (Cloud help (question only); [ai-logic] leg=private mode=ONLY_ON_DEVICE inferenceSource=on_device ms=3243 [ai-logic] leg=stripped mode=PREFER_IN_CLOUD inferenceSource=in_cloud ms=1636)
- PASS  the request went through Firebase AI Logic  (www.google.com, content-firebaseappcheck.googleapis.com, www.gstatic.com, firebasevertexai.googleapis.com)
- PASS  what was sent is the question only  (Partner asks: Which shirt for the doctor?)
- PASS  both steps ran for this card: the private step on this computer, then the question-only step in the cloud  ([ai-logic] leg=private mode=ONLY_ON_DEVICE inferenceSource=on_device ms=3243 [ai-logic] leg=stripped mode=PREFER_IN_CLOUD inferenceSource=in_cloud ms=1636)
  screenshot: `<scratch>/ondevice/04-hybrid-device-then-cloud.png`

## 4. Network OFF: the question-only step falls back to this computer

**Asked:** "Which shirt for the doctor?"  (6380 ms from submit to card)
- badge line: Ran on this computer (offline) · nothing left this computer
- tiles on the person's card: this one / that one / something else
- why: The question-only step (run on this computer, offline) proposed: shirt · choice · blue shirt, green shirt · Added by code: this one (The real options are not known: hold up two and point to each as you ask.), that one (The real options are not known: hold up two and point to each as you ask.) · Dropped: blue shirt (an invented detail of their own things), green shirt (an invented detail of their own things) · Decided by: the model proposed; code checked every choice · Headline: the model's topic
- trace: Private step (on this computer): ran on this computer (2984 ms) — got the question and the About me lists
- trace: Cloud step (question only): ran on this computer (3256 ms) · used for this card — the cloud was unreachable, so the stripped question ran on this computer
- trace: Rules in code: ran on this computer · used for this card — applied the card rules
- notes: The real options are not known: hold up two and point to each as you ask. | Ran on this computer (offline). Nothing was sent.
- what was sent: Not sent for this card. Cloud help would have got only this: `Partner asks: Which shirt for the doctor?`
- SDK report (console): `[ai-logic] leg=private mode=ONLY_ON_DEVICE inferenceSource=on_device ms=2984`, `[ai-logic] leg=stripped mode=PREFER_IN_CLOUD inferenceSource=on_device ms=3256`
- requests to hosts other than localhost:5179: POST https://firebasevertexai.googleapis.com/v1beta/projects/talk-partner/models/gemini-3.5-flash-lite:generateContent [failed: net::ERR_INTERNET_DISCONNECTED]
- PASS  PREFER_IN_CLOUD fell back to the device: the SDK reported inferenceSource=on_device for the question-only step  ([ai-logic] leg=private mode=ONLY_ON_DEVICE inferenceSource=on_device ms=2984 [ai-logic] leg=stripped mode=PREFER_IN_CLOUD inferenceSource=on_device ms=3256)
- PASS  badge "Ran on this computer (offline)", and the card says nothing was sent  (Ran on this computer (offline) · nothing left this computer)
- PASS  every request to another host failed or was read from the browser cache (the network was off)  (firebasevertexai.googleapis.com: net::ERR_INTERNET_DISCONNECTED)
  screenshot: `<scratch>/ondevice/05-offline-fallback.png`

**Asked:** "Who should we call tonight?"  (3141 ms from submit to card)
- badge line: On this computer · nothing left this computer · Jenny, Tyler from About me
- tiles on the person's card: Jenny / Tyler / someone else
- why: The private step proposed: call · choice · Jenny, Tyler, church · Kept: Jenny, Tyler · Dropped: church (does not answer this kind of question) · From About me (never sent): Jenny, Tyler · Decided by: the model proposed; code checked every choice · Headline: the model's topic
- trace: Private step (on this computer): ran on this computer (2965 ms) · used for this card — got the question and the About me lists
- trace: Cloud step (question only): did not run — not needed: the card made on this computer was good enough
- trace: Rules in code: ran on this computer · used for this card — applied the card rules
- notes: Every choice on this card is from About me, so cloud help is not asked: it never sees About me.
- what was sent: Nothing sent for this card.
- SDK report (console): `[ai-logic] leg=private mode=ONLY_ON_DEVICE inferenceSource=on_device ms=2965`
- requests to hosts other than localhost:5179: none
- PASS  offline, the private step works as before  (Jenny / Tyler / someone else)

- privacy receipt for this session: 4,505 bytes handed to cloud help in 1 request, the question only (0 About me words swapped out first); 11 cards this session. What the SDK adds on the wire is not counted, nor is the settings request (no question in it). | 11 cards this session. Handed to the cloud step: 4505 bytes in 1 request (27 bytes of question text). Withheld before sending: 0 names, 0 other About me words. Checked after sending: 0 About me words and 0 photos in the sent text. 1 cloud step ran on this computer instead (cloud unreachable): nothing left.
- session line: Judge mode · This session: 2 no AI · 8 on this computer · 1 cloud help · 0 no card · 0 failed

## 5. The same questions in a Chrome without the model (throwaway profile), cloud help on
- status line: "Checking whether this computer can run the private helper…"

**Remote Config** (asked when cloud help was turned on): Remote Config answered at 22:23. Each row says whether its value came from there. cloud_text_model = gemini-3.5-flash-lite (remote); route_mood_words = 2 (remote); route_min_choices = 2 (remote)
- its requests: firebaseinstallations.googleapis.com, firebaseremoteconfig.googleapis.com

**Asked:** "What do you want to do this weekend?"  (2148 ms from submit to card)
- badge line: Cloud help (question only) · the question left this computer, no About me words in it
- tiles on the person's card: stay home / visit family / something else
- why: The cloud step proposed: weekend · choice · stay home, visit family, go out · Kept: stay home, visit family · Dropped: go out (on the next page: this card shows two at a time) · Decided by: the model proposed; code checked every choice · Headline: the model's topic
- trace: Private step (on this computer): did not run — the private helper is not ready on this computer
- trace: Cloud step (question only): ran in the cloud (1964 ms) · used for this card — got the question only, About me words swapped out
- trace: Rules in code: ran on this computer · used for this card — applied the card rules
- notes: More on the next page: go out. "something else" on the card, or "Next: more choices", shows the next page.
- what was sent: Sent for this card: `Partner asks: What do you want to do this weekend?`
- SDK report (console): `[ai-logic] leg=stripped mode=PREFER_IN_CLOUD inferenceSource=in_cloud ms=1964`
- requests to hosts other than localhost:5179: GET https://www.google.com/recaptcha/enterprise.js; POST https://content-firebaseappcheck.googleapis.com/v1/projects/talk-partner/apps/[app-id]:exchangeDebugToken; OPTIONS https://content-firebaseappcheck.googleapis.com/v1/projects/talk-partner/apps/[app-id]:exchangeDebugToken; GET https://www.gstatic.com/recaptcha/releases/4i3aN5wAweL7i3ADI7BSX4B-/recaptcha__en.js; OPTIONS https://firebasevertexai.googleapis.com/v1beta/projects/talk-partner/models/gemini-3.5-flash-lite:generateContent; POST https://firebasevertexai.googleapis.com/v1beta/projects/talk-partner/models/gemini-3.5-flash-lite:generateContent; GET https://www.google.com/recaptcha/enterprise/anchor
- PASS  without the model, "What do you want to do this weekend?" is answered by the cloud step, which has no About me  (Cloud help (question only); sent: Partner asks: What do you want to do this weekend?)
- same question, the two steps: on this computer lake / church; from the cloud stay home / visit family
- PASS  "What do you want to do this weekend?": the two steps give different cards (About-me entries on this computer, none from the cloud)  (on this computer: lake / church; cloud: stay home / visit family)
  screenshot: `<scratch>/ondevice/08-no-model-cloud-weekend.png`

**Asked:** "What would you like for dinner?"  (8858 ms from submit to card)
- badge line: Cloud help (question only) · the question left this computer, no About me words in it
- tiles on the person's card: meat / fish / something else
- why: The cloud step proposed: dinner · choice · meat, fish, vegetables · Kept: meat, fish · Dropped: vegetables (on the next page: this card shows two at a time) · Decided by: the model proposed; code checked every choice · Headline: the model's topic
- trace: Private step (on this computer): did not run — the private helper is not ready on this computer
- trace: Cloud step (question only): ran in the cloud (1839 ms) · used for this card — got the question only, About me words swapped out
- trace: Rules in code: ran on this computer · used for this card — applied the card rules
- notes: More on the next page: vegetables. "something else" on the card, or "Next: more choices", shows the next page. | Cloud help did not answer the first time and was asked once more. The first request may have left this computer too; the receipt counts it under "may have left".
- what was sent: Sent for this card: `Partner asks: What would you like for dinner?`
- SDK report (console): `[ai-logic] leg=stripped mode=PREFER_IN_CLOUD inferenceSource=in_cloud ms=1839`
- requests to hosts other than localhost:5179: POST https://firebasevertexai.googleapis.com/v1beta/projects/talk-partner/models/gemini-3.5-flash-lite:generateContent; POST https://firebasevertexai.googleapis.com/v1beta/projects/talk-partner/models/gemini-3.5-flash-lite:generateContent
- PASS  without the model, "What would you like for dinner?" is answered by the cloud step, which has no About me  (Cloud help (question only); sent: Partner asks: What would you like for dinner?)
- same question, the two steps: on this computer pot roast / chili; from the cloud meat / fish
- PASS  "What would you like for dinner?": the two steps give different cards (About-me entries on this computer, none from the cloud)  (on this computer: pot roast / chili; cloud: meat / fish)

**Asked:** "Who should we call tonight?"  (10272 ms from submit to card)
- badge line: Cloud help (question only) · the question left this computer, no About me words in it
- tiles on the person's card: Jenny / Tyler / someone else
- why: The cloud step proposed: call tonight · choice · Person A, family, friend · Added by code: Jenny (people from About me), Tyler (people from About me) · Dropped: Person A (a label the cloud made up), family (a general word when About me has the people themselves), friend (a general word when About me has the people themselves) · From About me (never sent): Jenny, Tyler · Decided by: the model proposed; code checked every choice · Headline: the model's topic
- trace: Private step (on this computer): did not run — the private helper is not ready on this computer
- trace: Cloud step (question only): ran in the cloud (10196 ms) · used for this card — got the question only, About me words swapped out
- trace: Rules in code: ran on this computer · used for this card — applied the card rules
- notes: Choices completed from people from About me.
- what was sent: Sent for this card: `Partner asks: Who should we call tonight?`
- SDK report (console): `[ai-logic] leg=stripped mode=PREFER_IN_CLOUD inferenceSource=in_cloud ms=10196`
- requests to hosts other than localhost:5179: POST https://firebasevertexai.googleapis.com/v1beta/projects/talk-partner/models/gemini-3.5-flash-lite:generateContent
- PASS  without the model, "Who should we call tonight?" is answered by the cloud step, which has no About me  (Cloud help (question only); sent: Partner asks: Who should we call tonight?)
  screenshot: `<scratch>/ondevice/06-no-model-cloud-who-to-call.png`

**Asked:** "What should we get Jenny for her birthday?"  (1330 ms from submit to card)
- badge line: Cloud help (question only) · the question left this computer, 1 name and 0 other About me words swapped out
- tiles on the person's card: book / clothes / something else
- why: The cloud step proposed: Jenny's birthday · choice · book, clothes, voucher · Kept: book, clothes · Dropped: voucher (on the next page: this card shows two at a time) · Decided by: the model proposed; code checked every choice · Headline: the model's topic
- trace: Private step (on this computer): did not run — the private helper is not ready on this computer
- trace: Cloud step (question only): ran in the cloud (1266 ms) · used for this card — got the question only, About me words swapped out
- trace: Rules in code: ran on this computer · used for this card — applied the card rules
- notes: More on the next page: voucher. "something else" on the card, or "Next: more choices", shows the next page.
- what was sent: Sent for this card: `Partner asks: What should we get Person A for her birthday?`
- SDK report (console): `[ai-logic] leg=stripped mode=PREFER_IN_CLOUD inferenceSource=in_cloud ms=1266`
- requests to hosts other than localhost:5179: POST https://firebasevertexai.googleapis.com/v1beta/projects/talk-partner/models/gemini-3.5-flash-lite:generateContent
- PASS  a name in the question is swapped before it is sent: "Person A", not "Jenny"  (Partner asks: What should we get Person A for her birthday?; · the question left this computer, 1 name and 0 other About me words swapped out)
  screenshot: `<scratch>/ondevice/07-no-model-cloud-person-a.png`

## Result
41/41 checks passed at commit `0afbf77ac0fb98316c44e6aae7e442e4b2a95841`.
