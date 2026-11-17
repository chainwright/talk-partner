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
