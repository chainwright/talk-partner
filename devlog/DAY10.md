# Day 10 (16 Nov 2026, night): a rehearsal finds thirteen kinds of mistake; Remote Config; the first step runs by itself

Three commits of code, each made only after `npm run check` and `npm run build` had ended with exit code 0 on that
tree, then every run again on a clean tree at the last of them (`24793c1`), a deploy, and the cloud run against the
live site.

## Where the mistakes came from
Before the timed trial with people (`devlog/TRIAL_PROTOCOL.md`) we rehearsed it without people: two sets of partner
questions written for the rehearsal by two authors who did not see each other's set, run through the app three ways
(rules alone, the on-device model, cloud help only), with a scripted stand-in choosing from each card what it had
been told the person wanted. That is not a trial and nothing was measured on anyone; no figure from it is quoted in
the README, on screen or anywhere else. What it is good for is finding mistakes, and it found these.

## What changed in the rules (`a4667b6`)
Each was fixed as a kind of question, not as the one sentence that showed it, and each has a group of tests in
`tests/unit/sim-classes.test.ts` written from new phrasings, so the rehearsal's own sentences are not the only check.

| What went wrong | What happens now |
|---|---|
| "What's our grandson's name?" became a card of names; a made-up name and the person's own name stood on its next page | A question that asks for a name is a memory question: no card, "tell, don't test". A name question the rule misses still cannot show a name that is not in About me, nor the person's own |
| "Do you want tea and should I turn the TV off?" stayed one question | Split, like "…, and do you …?" |
| When the first of two questions had no card, there was no button for the second | "Next: second question" is under the first half whatever became of it |
| "You don't want to go out tonight, do you?" became yes / no, and yes could mean either | Asked the plain way ("Do you want to go out tonight?"), with one coaching line for the partner; read in code, so no model and nothing sent |
| "No AI needed" on a card whose headline had come from the model | An either-or read in code takes nothing from a model's answer, headline included |
| "Soup, a sandwich, or leftovers?" lost the soup: "Soup," was read as a name being spoken to | A list of three is read in code and shown as three tiles |
| "Do you want to rest, or is that a no?" got no card | One yes / no question about the proposal |
| A TV show and a team were offered as music | An About-me entry of another kind is dropped; one artist gets the radio beside it, and no second artist is made up |
| "Who do you want to see this week?": no card with cloud help only, and "you" (who lives here) on this computer | see / meet / have over count like call / visit / invite |
| "What do you need from the hardware store?" went to the cloud as "from the Place A" and came back as food / drink / medicine | Not sent to be guessed at; a card made on this computer is kept, otherwise no card and the reason on screen |
| "from 0 to 10" became "a little / a lot"; "How's the pain in your arm?" got good / bad | The pain card, with the scale on it as ranges |
| Tiles and headlines cut short: "lie", "till calls", "take pills morning", "okay tyler comes" | "lie down"; a yes / no headline is a phrase of the question in its own order, names in capitals |
| With cloud help only, "What time is the doctor tomorrow?" became morning / afternoon | A memory question in every engine state |

## Firebase Remote Config (`c73ec86`)
The cloud model's name and the two thresholds of the routing rule now come from Remote Config, with the defaults in
the code. Three parameters, published from `remoteconfig.template.json`; their values equal the defaults, so nothing
changes yet. It is asked only when cloud help is on, no card waits for it, a value the app cannot run on is refused,
and "How this works" shows which values came from it. A test caught App Check being started twice when the model name
changes; fixed before the commit.

## The first step of judge mode runs by itself (`24793c1`)
Day 9 put a finished card on the first frame, made in code, and noted that it shows no model. Now the on-device model
follows it with no click: when it has loaded, the app asks "What do you want to do this weekend?" and the card comes
from About me, on this computer, with the badge the SDK's report gives it. The step is made with cloud help left out.
In a browser with no on-device model nothing runs by itself and the status line says so.

## Runs at `24793c1`, clean tree (`devlog/evidence_r5/final/`)

| Run | Result |
|---|---|
| `npm run check` | 1150 tests, exit 0 (was 960) |
| `npm run build` | exit 0, no debug token in `dist` |
| `npm run e2e:noconfig` | 15/15 (was 12) |
| `node scripts/e2e-cloud.mjs` | 25/25 (was 18) |
| `node scripts/e2e-ondevice.mjs --port 9335` | 41/41 (was 36) |
| `node scripts/shots.mjs` | 85/85 (was 83) |
| `node scripts/fonts-check.mjs` | 6/6 |
| `node scripts/eval-heldout.mjs` | rules alone: 37/42 where code decides (was 36), 0/18 open cards |
| `node scripts/eval-heldout.mjs --port 9335` | 39/42 where code decides; open: 17/18 matched, 14/18 personal (one run) |
| `npm audit --omit=dev` | 4 high, all gRPC under `@firebase/firestore` (not imported); exit 1 |
| `npm run build:hosting`, `npx firebase-tools deploy --only hosting` | exit 0; <https://talk-partner.web.app> serves this commit |
| `node scripts/e2e-cloud.mjs --url https://talk-partner.web.app/` | 25/25 (`devlog/evidence_live/`) |

## Not done, or true only with a limit
- Three options are three tiles also at "2 at a time": the setting's name is not kept for a question that names
  three. At the largest tiles two are shown and the third is on the next page.
- "Graham, coffee or tea?" opens like "Soup, a sandwich or leftovers?". The first word is taken as a name only if
  About me knows it, if it is an address word, or if a question follows it; a name About me does not know becomes a
  tile. With no name in About me at all, the old reading stays.
- The rule for a hidden About-me word is narrow: a what-question with "from <place, food, show or thing>". "What shall
  we do at the lake?" still goes to the cloud as "at the Place A".
- A partner who really does not know when the appointment is also gets "tell, don't test", and "make a card anyway"
  has no card for a time. For a name it still makes a recognition card from About-me names.
- The pain ranges are ranges; the exact number needs a second question from the partner.
- A negative question is turned round only where it has a plain auxiliary; "You never liked fish, did you?" is not.
- The labelled set was run once after these changes (17 of 18, 14 personal, 39 of 42). It is better than the four
  runs we quote, and we keep quoting those: the rules were changed after the set had been run, and it is one run.
- Remote Config changes nothing today (its values are the defaults), and a change in the console reaches a browser
  after the SDK's ten-minute cache and a reload.
- The first step needs Gemini Nano in the judge's own Chrome. On the hosted copy, in a fresh profile on our machine,
  the line read "Gemini Nano is not downloaded in this browser…": that is the case most judges will see.
- The line on "How this works" about the labelled set still quotes the four earlier runs; it was not changed.
- Still not here: a public repository, a video, a trial with people.

## Later the same night: a third set, kept sealed until the rules above were in (`4fad530` … `0afbf77`)
The rehearsal had a third set of partner questions (set D, 90 of them), written before the changes above and not
opened until they were committed, so that it could show whether the fixes held on sentences nobody had tuned to. It
was run the same three ways, with the same scripted stand-in. The same warning applies: nothing was measured on
anyone and no figure from it is quoted anywhere. Most of the earlier classes held; it found new ones. Nine commits,
each after `npm run check` and `npm run build` had ended with exit code 0 on that tree. The tests for them
(`tests/unit/sim-d-classes.test.ts`) use phrasings written for the test file, none from the set.

| Commit | What it fixes |
|---|---|
| `4fad530` | A name About me does not list went to the cloud as typed after a title ("Dr. …") or at the start of a sentence. Both are swapped for "Name A" now, also "aunt linda" in lower case. `CLAIMS.md` row 6 lists what is still sent as typed |
| `9648cc0` | After a failed cloud call (the free tier's limit of requests a minute, HTTP 429) a card was put together from About me by code, under "No AI needed". Now: the on-device card if there is one, else no card, the reason, and "Try again". One retry when the service allows it within 3 s |
| `148a211` | "Where are we right now?" and "What did you have for breakfast?" became cards with made-up tiles. Both kinds are caught as tests. A card that is not shown no longer has a line to say with options in it |
| `d0e1054` | "When did the pain start, this morning or last night?" was refused as a memory test. It is a two-option card |
| `9ef8b87` | "…, or nothing?" / "…, or neither?" / "…, or just quiet?" after two things lost a tile or became yes / no. All three are tiles |
| `345029f` | A pain scale named in the question was two ranges, and "How's your back today, zero to ten?" got good / bad. The card is a line of every number; "How's your hip?" gets the pain card |
| `0837e5d` | About-me words where they do not fit (the family's dinners as dessert, a TV show under a yes / no question, the partner as the caller). They stay only where the question asks for their kind; a statement followed by a question code can decide is read as that question |
| `4b4eb29` | Cut labels ("cream", "card for the barber"), leftover headlines ("more"), and a statement with a tag ("…, haven't you?") that had no card without a model |
| `0afbf77` | The coaching line of a recall question keeps the words "tell, don't test" |

### Runs at `0afbf77`, clean tree (`devlog/evidence_r6/final/`)

| Run | Result |
|---|---|
| `npm run check` | 1417 tests, exit 0 (was 1150) |
| `npm run build` | exit 0, no debug token in `dist` |
| `node scripts/e2e-noconfig.mjs` | 15/15, exit 0 |
| `node scripts/e2e-cloud.mjs` | 25/25, exit 0 |
| `node scripts/e2e-ondevice.mjs --port 9335` | 41/41, exit 0 |
| `node scripts/shots.mjs` | 85/85, exit 0 |
| `node scripts/fonts-check.mjs` | 6/6, exit 0 |
| `node scripts/eval-heldout.mjs` | rules alone: 38/42 where code decides (was 37: the breakfast question), 0/18 open cards |
| `npm audit --omit=dev` | 4 high, all gRPC under `@firebase/firestore` (not imported); exit 1 |
| `npm run build:hosting`, `npx firebase-tools deploy --only hosting --project talk-partner` | exit 0; <https://talk-partner.web.app> serves this commit (the same bundle name as the local build) |
| `node scripts/e2e-cloud.mjs --url https://talk-partner.web.app/` | 25/25, exit 0 (`devlog/evidence_live/e2e-cloud_live_2026-11-16_0afbf77.txt`) |

The cloud runs were spaced a minute apart, to stay inside the free tier's limit of requests a minute.

### Not done, or true only with a limit
- The labelled set was not run on the on-device model again. The check of About-me words is stricter now, so its
  "personal" count may be lower than in the runs we quote; `CLAIMS.md` row 16 says so.
- The swap of unlisted names is a check of word shape. "ask linda" (lower case, no title) still goes as typed, and an
  ordinary word the lists do not know is swapped when it opens a sentence.
- The 429 path was tested with a scripted engine, not against the live service.
- The pain number line is one card with up to eleven tiles: an exception to "two or three choices", stated in row 27.
- "Where did you leave your glasses?" and other "who / where" questions about the past still get a card.
- Not fixed from set D: the badge "No AI needed" on a card where the on-device model was asked and code used its own
  pair; the second half of a two-in-one question that no tile can answer ("…, and what should we tell her?") when it
  is not a recall question; time questions that get "now / later" where hours were wanted; "Is Jen's birthday this
  month?" as yes / no.
