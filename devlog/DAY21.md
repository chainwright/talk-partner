# Day 21 (20 Nov 2026): phase 11, colour pictures made with Gemini

The brief was `design/PHASE11_BRIEF.md`. The family had approved a new picture set: 85 pictures generated with
Gemini 3.1 Flash Image (`gemini-3.1-flash-image`) during the submission period, reviewed by a person against our
drawings, and already normalised to 256 x 256 WebP files in `web/public/pictures/` with their prompts in
`devlog/quota_probe_2026-11-20/ASSET_MANIFEST.json`. No picture was made again in this phase and no model was called.
Work began from `de5267a`. Each item was committed on its own, each only after `npm run check` exited 0. Nothing was
pushed or deployed; the "Live:" lines still name `ce47da2`.

## The items, in the brief's order
1. **Use the image where it exists** (`603f8a5`). `builtinPicto(id)` in `web/src/pictos.ts` returns
   `<img class="pic" src="/pictures/<id>.webp" alt="<word>" data-id="<id>" width="96" height="96" decoding="async">`
   for the ids of the manifest (`IMAGE_IDS`; 85 then, 84 after the follow-up below), our SVG otherwise, and our dashed "something else" for an unknown
   id. The topic tiles and the diary's log buttons use `decoPicto` (the same picture, `alt=""` and hidden, since the
   word is next to it). The family's own photo is still chosen first, in `main.ts`. Every CSS rule that sized a
   picture's `svg` now sizes `img.pic` the same (52 selectors in `styles.css` and `simple.css`, added by a script;
   a unit test checks that none is missing), so the person's card shows them at 112 to 128 px as before. The browser
   runs looked for `svg` inside a tile; they now look for `svg` or `img.pic`.
2. **Offline** (`12e6f27`). Nothing had to change in the worker: it already keeps every file of the build, and the
   pictures are part of it. `pwa-check.py` now proves it: all of them are in the cache (84 after the follow-up), and with the connection off the
   tea or coffee card shows the tea and coffee pictures loaded from the kept copy. `check-dist.mjs` and
   `check-deploy.mjs` pass; there is no size budget in the build, so none was raised.
3. **Honest provenance** (`5abf1f6`). `PICTOGRAMS.md` has a new header (the set is mixed: 84 made with Gemini, 40
   drawn by us, after the follow-up) and the columns `source | date | licence/terms`. The Gemini rows say "Generated with Gemini 3.1 Flash
   Image, reviewed by a person", "20 Nov 2026", and "output used under the Gemini API terms; no copyright claimed by
   us beyond what applies". Google does not claim ownership of Gemini API output; the rules ask for original work,
   for pre-existing work to be disclosed and for no third-party logos: these pictures were made in the period with
   the sponsor's own model, they are named as such, and none carries a logo. `DISCLOSURE.md`, the README, JUDGES and
   CLAIMS row 59 ("no AI-generated image", now marked no longer true) were changed; the "How this works" screen has
   "Pictures: drawn by us and made with Gemini." `day3.test.ts` checks the new columns and that the Gemini rows are
   the manifest's ids; `pictures.test.ts` checks each file (WebP, 256 x 256, at most 20 KB), that code, manifest and
   folder hold the same ids, and our drawings' style as before. No test was deleted.
4. **Evidence** (this commit). `scripts/picture-sheet.py` shows the images (as data URLs) with "Gemini" or "our SVG"
   under each word, and writes a before/after sheet; the sheets are saved with 256 colours to keep them small.
   `devlog/evidence_phase11/phase9/` and `phase10/` hold those screens at 360 x 740 and 390 x 844 (both scripts
   already shoot both sizes, with any font). `scripts/phase11-walk.py` walks tea or coffee, the check and the finish,
   Back one step at a time, the needs board with pain and with toilet, and a person (company or time alone), at both
   sizes in the light and the dark theme: 40/40. CLAIMS rows 142 to 144, EVIDENCE "Phase 11", README "Added on
   20 Nov, phase 11".

## Decisions that differ from the brief, or fill a gap in it
- Our SVG drawing of each word that now has a picture stays in `pictos.ts`. It is the fallback when a picture file
  cannot be loaded (`pictoFallback`, from an `error` listener in `main.ts`), so a tile never shows a broken image;
  its style checks still run on it.
- "The About screen" is the "How this works" screen: the app has no other screen about itself.
- `e2e-needs.mjs` failed 11/12 on its first run: with the service worker bypassed and the network off, opening the
  board asked for the ten picture files. Those requests go to the app's own host and nothing leaves the device, but
  they fail there; the check now counts them apart and a new check asserts every tile then shows our drawing (13/13).
- Only `ASSET_MANIFEST.json` of `devlog/quota_probe_2026-11-20/` is committed: the rest of that folder (raw outputs,
  comparison sheets, a review note with internal details) stays out of the repository.

## Seen in the pictures, not changed
- Words: the film clapperboard has printed SCENE, TAKE, ROLL, DATE, DIRECTOR; the radio has tiny OFF / ON marks.
  No brand and no logo anywhere (the TV, the newspaper, the milk carton, the pill bottle and the phone are blank).
- "something else" had become a question mark in a blue circle, close to what "not sure" used to be, and the dashed
  frame that marked the way out was gone from the cards. Fixed in the follow-up below.
- `chair`, `listen` and `go out` had a faint frame or wall around the object rather than pure white. Fixed by hand
  in the follow-up below.
- On the needs board (52 to 56 px) the detailed pictures read small; the board's tile size was not changed.

## Runs (the production build of `5abf1f6`, port 5179)
`npm run check` 2913 tests, exit 0; `e2e-simple.py` 1032/1032; `pwa-check.py` 34/34; `e2e-needs.mjs` 13/13 (first
run 11/12, see above); `overflow-check.py` 548/548; `contrast-check.mjs` 144/144 pairs; `phase8-shots.py` 21/21;
`phase9-shots.py` 39/39; `phase10-shots.py` 132/132; `phase11-walk.py` 40/40. Outputs: `devlog/evidence_phase11/local/`.

## Follow-up, the same day
- `chair.webp`, `listen.webp` and `go_out.webp` were edited by hand to a plain white background (not regenerated)
  and committed as they are (`88c0747`).
- "something else" is our dashed drawing again, on every card: the way out must look unlike any choice, and the
  Gemini question mark was too close to "not sure". It left `IMAGE_IDS` and the manifest, its file was deleted (a
  copy kept outside the repository), and its `PICTOGRAMS.md` row is our SVG again. The set is now 84 made with Gemini
  and 40 drawn by us. The dashed checks in `day3.test.ts` and `pictures.test.ts` now look at what the card shows
  (`builtinPicto`), not only at our drawings; `pwa-check.py` and `phase11-walk.py` check the dashed way out on the
  card, the board and the person card.

Follow-up the same day (`88c0747` and the next commit): chair, listen and go out lost their faint frame (edited by
hand, not regenerated), and "something else" is our dashed drawing again on every card (84 made with Gemini, 40
drawn by us). On the production build of that state: `npm run check` 2913 unit tests; `e2e-simple.py` 1032/1032;
`pwa-check.py` 34/34; `e2e-needs.mjs` 13/13; `overflow-check.py` 548/548; `phase11-walk.py` 48/48 (the first run
47/48: the walk read the check screen's coffee picture before it had loaded; it now waits, as on the other screens);
`picture-sheet.py` done. Outputs: `devlog/evidence_phase11/local_followup/`.
