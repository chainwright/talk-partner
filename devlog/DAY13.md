# Day 13 (17 Nov 2026, morning): a quick-needs board and a microphone for the partner's question

Two things were added that are not the hybrid inference and need no AI of ours. Neither has been used by a carer
or by a person with aphasia; what follows is what was built, what was run, and what was not.

## Quick needs
One button in the top bar (and the address `#/needs`) puts a fixed board on the person's screen: toilet, drink,
food, pain, tired, too hot, too cold, call someone, something else. It is a card like the others, so it gets what
every card gets: a picture and its word on every tile, the tick / cross check after a tap ("So: toilet. Right?"), and
the partner's side with the badge "No AI needed". After the tick the person's screen shows the need and nothing
else; the partner's side has one short line for it, and after "pain" one tap asks "Where does it hurt?".
"Something else" is checked the same way and hands back to the question box and "We're stuck".

Decisions, and why:
- **A board of nine, against our own design rule of two to four choices** (a rule that is itself marked in our
  notes as our choice, not evidence). These are the needs that cannot wait for a question to be typed. Nobody has
  checked that nine can be scanned; `CLAIMS.md` row 40 says so.
- **"Too hot" and "too cold" are two tiles**, the same thermometer with a sun or a snowflake. One tile "hot / cold"
  would have needed a second step.
- **No yes / no strip on the board.** It would be a tenth and eleventh target with no question to answer.
- **The partner's line is on the partner's side only** (rule 22). On one device that means the partner reads it
  after the press-and-hold exit. We did not put it under the person's card.
- **A confirmed need is not kept** in "Answers so far" or "Asked before": it is of the moment, and "last time they
  chose toilet" is no use to anyone. It is in the session recap.
- **The module imports the copy and the types and nothing else** (`core/needs.ts`), so it cannot reach an engine.
  It works with no connection once the page is open. There is no service worker: a first visit or a reload with no
  network does not open, and we say so.
- Six pictograms were drawn for it, in the set's own line style (`PICTOGRAMS.md`). A choice with one of those words
  on any other card gets the picture too.
- On a phone the words on the board are 24 px: at 26 px "call someone" touched the edge of its tile.

## Voice input, for the partner's question only
**Correction, 17 Nov 2026 (later the same day).** This section describes voice input as it was for a few hours, from
commit `a1e1b2d` to `27abd80`: the browser's own speech recognition (the Web Speech API). That was AI inference
outside Firebase AI Logic, which the contest rules do not allow, and it was removed in `27abd80`. Since then the
microphone records one clip of at most 15 s and sends it once to Gemini through Firebase AI Logic (`ONLY_IN_CLOUD`,
`transcribe()` in `web/src/ai/firebaseEngine.ts`); the notice says "Google's cloud", the session figure counts the
sound, and a test fails the build if `SpeechRecognition` comes back. Nothing below about `SpeechRecognition`,
`processLocally`, interim words or "your browser's speech recognition" is true of the current build; `CLAIMS.md`
row 41 and the README have what is. The text is kept as it was written.

A microphone button between the question field and "Make card", where the browser has speech recognition (the Web
Speech API); no button where it has none. Interim words show in the field, the final words fill it, and nothing is
submitted: the partner reads, changes and presses. The person's speech is never recognised.

What we checked about where the sound goes, and what we say:
- In the Chrome we use (157) `SpeechRecognition` exists, with `processLocally` and `SpeechRecognition.available`.
  Asked for US English on the device, it answers **"downloadable"**, not "available", in both of our Chromes. So on
  our machine a real use would go through Chrome's default speech service, which may send the sound to Google.
- The app therefore says exactly that before the first use, and listens only after a yes. It asks the browser
  whether on-device recognition is available and sets `processLocally` only then; it never installs a language
  pack and never falls back from on-device to the default service by itself. That branch has run against a scripted
  recognition object only. We did not install the language pack to try it: it would have changed the profile that
  holds Gemini Nano.
- A question spoken through the default service is outside everything the app promises about the cloud step: the
  name swap does not apply and the receipt cannot count it. So the lines change: the card says "nothing sent by
  this app · the question was spoken: your browser's speech recognition may have sent the sound", the session figure
  says "0 bytes handed to cloud help by this app" and names the sound as not counted, and the line under the
  settings adds a sentence. A question tapped or typed afterwards is not marked.
- "All AI inference goes through Firebase AI Logic" was no longer true as written: speech recognition is a model
  and is not Firebase. It now reads "every model call that makes a card", on screen, in the README, `CLAIMS.md` row
  4, `DISCLOSURE.md` and the package description.
- **Not tested: recognition.** No run has a microphone or a voice in it. The state machine is tested with a scripted
  object (start, interim, final, each error, no API, on-device), and the same scripted object is put into a real
  page by `scripts/shots.mjs`.

## Commits, each after `npm run check` and `npm run build` had ended with exit code 0 on that tree

| Commit | What |
|---|---|
| `7080ebf` | The quick-needs board: `core/needs.ts`, six pictograms, the board on the person's screen, the partner's lines; `tests/unit/needs.test.ts`; the board run with the network off by `e2e-noconfig.mjs`, and measured by `shots.mjs` |
| `a1e1b2d` | Voice input: `web/src/voice.ts`, the button, the notice, the lines that change after a spoken question; `tests/unit/voice.test.ts`; the wiring run in a real page by `shots.mjs` |
| `8810f8f` | "Every model call that makes a card goes through Firebase AI Logic" on "How this works" and in the package description |
| `0eeca4e` | `scripts/e2e-needs.mjs`: the board offline and the microphone's notice against any copy, the hosted one included |
| `20d2b19` | Hosting: `/` is sent with `Cache-Control: no-cache` (below) |

## Runs (`devlog/evidence_r9/final/`, clean tree)

| Run | At | Result |
|---|---|---|
| `npm run check` | `8810f8f` | 1770 tests, exit 0 (was 1714) |
| `npm run build` | `8810f8f` | exit 0, no debug token in `dist` |
| `node scripts/e2e-noconfig.mjs` | `8810f8f` | 25/25, exit 0 (was 16): the microphone's notice, then the board with the network off |
| `node scripts/shots.mjs` | `8810f8f` | 121/121, exit 0 (was 87): the earlier 87, the board at 390 and 1280 px, voice input with a scripted recognition object |
| `node scripts/fonts-check.mjs` | `8810f8f` | 6/6, exit 0 |
| `node scripts/eval-heldout.mjs` | `8810f8f` | rules alone: 40/42 where code decides, 0/18 open cards, exit 0 (unchanged) |
| `node scripts/e2e-needs.mjs` | `20d2b19` | 12/12, exit 0 |
| `node scripts/e2e-ondevice.mjs --port 9335` | `a1e1b2d` | 43/43, exit 0 (localhost; one on-screen sentence before `8810f8f`) |
| `npx firebase-tools deploy --only hosting --project talk-partner --non-interactive` | `8810f8f`, then `20d2b19` | exit 0 twice; every served file has the SHA-256 of the local build |
| `node scripts/e2e-needs.mjs --url https://talk-partner.web.app/` | the hosted copy | 12/12, exit 0 (`devlog/evidence_live/e2e-needs_live_2026-11-17_8810f8f.txt`) |
| `node scripts/e2e-cloud.mjs --url https://talk-partner.web.app/` | the hosted copy | 28/28, exit 0, one run (`devlog/evidence_live/e2e-cloud_live_2026-11-17_8810f8f.txt`) |

## What the deploy showed: the page at "/" was cached for an hour
After the first deploy the Chrome that has Gemini Nano still got the old page: it had opened the site about half
an hour earlier (our own look at its speech API), and `/` was served with `max-age=3600` (the `no-cache` rule in `firebase.json` named `/index.html`
only). A judge who had the site open before a deploy would have kept the old build for up to an hour, and its
script file is gone from the server by then. `/` now has `no-cache` too (`20d2b19`, deployed). In that Chrome,
with the page fetched again: the new bundle, the microphone button, "Quick needs", the first step by itself
(`inferenceSource=on_device`, lake / church), the board with the network off, and no host contacted but the site's
own. That was done by hand with a short script that is not kept in the repository.

## Not done, or true only with a limit
- Nobody the two features are for has tried them. No clinician has read the partner's lines.
- Speech recognition was never run with a voice; on-device recognition was never seen running.
- The full on-device script was not run against the hosted copy at this build (it also makes cloud requests, and
  the free tier is 15 a minute for everyone). It passed on localhost at `a1e1b2d`; on the hosted copy the last full
  run is at `deebc94`.
- The cloud script was not run on localhost at these commits, nor the labelled set on the on-device model; nothing
  in the two features touches a rule, a prompt or a model call.
- No offline install. The board needs the page to have loaded once in that tab.
- The eight needs are a fixed list; a family cannot change it.
- The recording in judge mode is still the one of `8ace9f0`.
- Still open, as before: a video, a trial with people, App Check enforcement.
