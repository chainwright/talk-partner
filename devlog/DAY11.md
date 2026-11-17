# Day 11 (16 Nov 2026, late night): the last sealed set finds fifteen kinds of mistake; seventeen commits

The rehearsal of the trial (`devlog/DAY10.md`) had one more set of partner questions, set E: 90 of them, written
before the nine commits that followed set D and kept sealed until those were committed and deployed, so that it
could show whether the fixes held on sentences nobody had tuned to. It was run the same three ways (rules alone, the
on-device model, cloud help only), with the same scripted stand-in choosing from each card. The same warning
applies as on day 10: it is not a trial, nothing was measured on anyone, and no figure from it is quoted in the
README, on screen or anywhere else. It is good for finding mistakes. Most of the classes fixed after set D held; it
found fifteen kinds that had not been seen, or not in this form.

Seventeen commits, each made only after `npm run check` and `npm run build` had ended with exit code 0 on that
tree. Each fixes a kind of question, not the sentence that showed it; the tests are in
`tests/unit/sim-e-classes.test.ts`, one group per kind, written from phrasings made for the test file (none is a
sentence of the set).

| Commit | What set E showed | What happens now |
|---|---|---|
| `d076187` | "… now or after you eat?", "… help you or do you want to try it yourself?": no card without a model, and on the on-device model a card on one run and "No good choices came out" on the next | The code reads a pair several ways (a time against a time clause, short sides, clauses, the same without the one-axis demand); the first that passes the label check is the card, whatever a model returned |
| `8fb01c6` | "Can you tell me who the president is?" became yes / no; "no" read as "I don't know" | A test asked politely is unwrapped and checked like a question asked straight: no card, "tell, don't test" |
| `b9c441a` | "Who was that on the phone with you?" was refused: "You know this one" | The partner does not know. The card is the people About me names who do not live there, made in code |
| `d4d50ce` | "Is that the phone? Do you want to answer it?" was split; "Where does it hurt? Head, back, stomach?" showed "chest" and lost "stomach"; "…, and if so where?" was not split | A first question that only points at something stays in the line to say; answers listed after a question are its options, exactly those; "and if so where / when" is a second question, asked in full |
| `e2d27cd` | Tiles "so we could go", "rest Which one", "for lunch"; "nothing" on the next page; "not at all" lost; "better or worse" with no middle | Words before a list and a closing "Which one?" are not tiles; the tile to decline is on the first page at every level; opposite comparatives get "the same" |
| `f51f861`, `8ace9f0` | A carer asked "… Honey to sit with you tonight, or Carol?": the tile read "you", the line "Honey, me, or something else?" | When the question holds the partner's name, someone else is asking: the name stays a name; the way out is "someone else" |
| `2e0e3fd` | "How are you feeling?": good / bad, nothing for "so-so" | good / so-so / bad at every support level |
| `a1f59da` | "What were you trying to tell me?": problem / joke / news, made up | No guesses: the fixed ways to get a message across (show me / write it / draw / later / change topic) |
| `3d57fe1` | With cloud help only, "Who should I call for you?" read doctor / Jenny; Tyler gone, no next page | Every person About me names is on the card, with next pages; a role from a model comes after them |
| `a4d91ee` | "No AI needed" on cards that had waited 3 s for the on-device model | "No AI needed" only when no model was called; otherwise "Made in code (AI answer not used)" |
| `c34a158` | "When do you want to go to bed?": hours on two runs, "early / late / now" on the third, "soon / later / now" from the cloud | One fixed line of three times, chosen in code by what the question is about, the same in every engine state |
| `2cdfa39`, `89c1bde` | Tiles "your right", "turn the TV", "after eat", "Honey to sit", "one at Mercy Hospital", "text jen", "try"; headlines "wanna", "that's tingling", the person's own name | A copied option must be a whole phrase of the question; an unsaid word comes back from the other side; two names are two tiles; leftover words and the person's name are no headline |
| `071f38f` | The next page of a dinner card held "cheese", "house", "other" | A filler word is never a tile; a model's guess is not put after two of the family's own entries |
| `07eaa54` | Privacy, checked with the swap alone: "call mike back" and "Did May call today?" would have gone to the cloud as typed | A lowercase word that is not an everyday English word is swapped; a word that is also a first name is swapped where it stands like a name |
| `8b77975` | Privacy, the other way: "Um" went as "Name A"; "Willow Street", "Mercy Hospital" went as "Name A Name B" | A filler is not a name; the kind of place stays: "Name A Street", "Name B Hospital" |

## The privacy swap, exactly
`CLAIMS.md` row 6 has the full lists. In short: the swap of names About me does not list is a guess by the shape
of a word, now checked against a list of about 3,400 everyday English words (`core/words.ts`, written by us for the
talk of a home with someone in care). It prefers the safe side: a word it cannot place is swapped and put back on
this computer. What it still misses is a name that is also a word, in a place our rules do not look ("a cake for
hope", "sit with joy"). What it swaps without need is an English word the list lacks ("zumba"). A health detail, a
short number and anything that is not a name go as typed, as before; the consent screen says so, and now also says
that an unlisted name can be missed.

## Runs at `8ace9f0`, clean tree (`devlog/evidence_r7/final/`)

| Run | Result |
|---|---|
| `npm run check` | 1703 tests, exit 0 (was 1417) |
| `npm run build` | exit 0, no debug token in `dist` |
| `node scripts/e2e-noconfig.mjs` | 15/15, exit 0 |
| `node scripts/e2e-cloud.mjs` | 25/25, exit 0 |
| `node scripts/e2e-ondevice.mjs --port 9335` | 41/41, exit 0 |
| `node scripts/shots.mjs` | 85/85, exit 0 |
| `node scripts/fonts-check.mjs` | 6/6, exit 0 |
| `node scripts/eval-heldout.mjs` | rules alone: 40/42 where code decides (was 38), 0/18 open cards |
| `npm run build:hosting`, `npx firebase-tools deploy --only hosting --project talk-partner --non-interactive` | exit 0; <https://talk-partner.web.app> serves this commit |
| `node scripts/e2e-cloud.mjs --url https://talk-partner.web.app/` | 25/25, exit 0 (`devlog/evidence_live/e2e-cloud_live_2026-11-16_8ace9f0.txt`) |

## Not done, or true only with a limit
- The labelled set was not run on the on-device model again (as after set D). Rules alone it now matches
  40 of the 42 questions code decides; that number moved because rules changed, not because the set is a
  fair test of them.
- A twisted either-or that only code reads can still be clumsy: "Shall we walk down to the library, or would you
  rather we went to the market?" gives "walk down" / "we went" when no model copy passes the check.
- A list followed by a clause ("soup, a sandwich, or would you rather wait for tea?") is still not read in code.
- The times on a "when" card are fixed guesses (8 pm / 9 pm / 10 pm for bed), not the family's own.
- "Floor" under "Where do you want to sit?": an unlikely third word on a card with no About-me entries still gets
  its next page.
- The partner's name is taken for a third person only when it stands in the question. A carer who asks "Who do
  you want to sit with?" still gets "you" for the partner.
- "Who was that on the phone?" gets the people About me names only when there are two or more who do not live
  there.
- The words that own a place's kind are a fixed list (Street, Hospital, Market …); "the Dog and Duck" goes as "the
  Name A and Name B".
- The on-screen line on "How this works" about the two rule badges does not name the new badge.
- Still not here: a public repository, a video, a trial with people.
