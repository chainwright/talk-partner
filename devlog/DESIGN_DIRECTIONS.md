# Design directions: three options to pick from

Date: 11 Nov 2026. Judge round 1 is on 15 Nov.

**Status:** C "Two Sides" was chosen on 16 Nov 2026 and is now the default look (`web/src/styles.css`), with no `?theme=` needed. The Signal and Marker previews, the `?theme=` switch (`theme.ts`, `themes.css`) and their font files were removed; Two Sides' fonts are self-hosted (`web/src/fonts.css`). Screens: `devlog/shots_twosides_default/`. The sections below are the record of the choice as it was made on 11 Nov; the "How to look at them" steps no longer apply.

**How to look at them:**
- Run `npm run dev`, then open `http://localhost:5179/?theme=signal`, `?theme=marker` or `?theme=twosides`. Add `#/demo` for judge mode or `#/welcome` for the first screen.
- Leave out `?theme=` and you get the default look. In that case no font request leaves the page.

**What changed in code:**
- `web/src/themes.css`: one block of styles per direction, plus a motion section.
- `web/src/theme.ts`: reads `?theme=` and loads that direction's Google Fonts. This runs only for previews.
- `main.ts`: the trace `<li>` gets a `used` class and a `data-step` attribute. This is markup only, so behaviour, copy and layout order are the same.
- `scripts/shots.mjs`: gained `--only`. It now waits for fonts and freezes animations before each still.
- `scripts/motion.mjs`: new. It records the motion as mp4.

**Screens per direction** are in `devlog/design_dirs/<direction>/`, each at phone (390 × 844) and desktop (1280 × 900):
- `*_01-welcome`: the first screen
- `*_03-judge-mode`
- `*_04-partner-card-coffee-tea`: the partner screen with the card and the "where each step ran" trace
- `*_05-person-choices`: the person's full-screen card
- `motion_desktop.mp4` and `motion_phone.mp4`: about 8 s each. They show the first screen, then judge mode, then a sample question becoming a card and the trace appearing, then the full-screen card.

All 9 layout checks pass on each direction. That means no horizontal scroll, and "Show to person" sits above the fold on the phone, at 629, 658 and 635 px. `npm run check` exits 0 (16 files, 763 tests).

---

## 1. Research (what the choice is based on)

### Aphasia-friendly communication
- **Supported Conversation (SCA) "written choice".** The partner writes key words for the choices, paired with pictures, and the person points. This is the exact interaction our card digitises. SCA also trains the *partner*, not the person, so a partner-first screen is right. Sources: https://aphasia.ca/?p=47615, https://praacticalaac.org/strategy/aphasia-supported-communication-written-choice-strategy-variations/, https://www.aphasia.com/aphasia-library/aphasia-treatments/supported-conversation-for-adults-with-aphasia-sca/
- **Rose et al. (n=40).** Most readers preferred Verdana at 14pt and 1.5 line spacing, and 95% found graphics helpful. Our current Verdana default has evidence behind it, so whichever direction wins must not get *less* legible. Source: https://pubmed.ncbi.nlm.nih.gov/21682542/
- **Wilson & Read.** Sans-serif and lower case were understood better than serif and UPPER CASE. That is why tile labels stay lower-case and no direction uses all caps. Source: https://e-space.mmu.ac.uk/606883
- **Dahl & Bailey 2025.** Readers preferred larger type, 1.5 spacing and illustrated text, with realistic pictures over stylised ones. Source: https://pubs.asha.org/doi/10.1044/2025_AJSLP-24-00428
- **Stroke Association.** A wiki copy of its aphasia-friendly guidance says no boxes around text and bold only for key words. I could not open the official PDF, so this is unverified. That is why the person's card highlights one keyword and puts frames only on things you press. Source: https://strokedigital.atlassian.net/wiki/x/DAAoCw

### AAC apps today
- **Proloquo** picks symbols for contrast and for being easy to tell apart. https://assistiveware.com/blog/proloquo-4-grows-with-users
- **Lingraphica** always pairs an icon with text, and its users often choose photos. https://lingraphica.com/resources/using-aac-photos-and-drawings-to-communicate-successfully/
- **Fitzgerald-key colour coding** gives each part of speech a colour. Across a whole grid it reads as dated and childlike for adults, and it adds nothing with 2–3 choices. That is why no direction colour-codes the tiles. https://praacticalaac.org/strategy/communication-boards-colorful-considerations/
- **Fonts:**
  - Atkinson Hyperlegible Next (Braille Institute, 2025, OFL, on Google Fonts) is designed to keep letters distinct. https://fonts.adobe.com/fonts/atkinson-hyperlegible-next
  - Lexend aims at reading fluency, but most of its evidence comes from its own creators. https://lexend.com/
- **NHS design system:** body text 19 px on desktop and contrast ≥ 4.5:1. https://service-manual.nhs.uk/design-system/styles/typography

### What Google judges rewarded

From `memory/knowledge/judge_corpus/devpost_chrome-builtin-ai-2024.md`, `-2025.md` and `PATTERNS.md`:
- **"Most Helpful" went to accessibility two years running.** Mochi in 2024; Nutshell and **AAC Board AI** in 2025. https://developer.chrome.com/blog/ai-challenge-winners-2025
- **AAC Board AI is a pictogram board.** We must not look like a second one. Our difference is that this is a *two-person* conversation tool, and the design has to show that at a glance.
- **Hybrid winners were rewarded for a clear reason to combine device and cloud.** The 2024 Hybrid wording was "combine the strengths of both for a smooth user experience". So the trace showing where each step ran is a judging surface, not a debug panel.
- **The judges are Chrome DevRel and PMs.** They try the demo, so judge mode gets designed attention.

### Looks to avoid
- **The usual AI tells:** purple/indigo gradients, glassmorphism, Inter everywhere, rows of three icon cards, gradient text. https://superdesign.dev/blog/why-ai-design-looks-generic and https://adriankrebs.ch/blog/design-slop/
- **The 2026 "tasteful default":** cream, serif and sage (named in several 2026 write-ups on generic generated interfaces; no link kept here).
- **Our own ban list adds** beige editorial and dark + gold.

**How each direction avoids these:**
- No direction uses a gradient as decoration. The only gradients are the highlighter and route shapes, which carry meaning.
- None uses purple, a serif or cream.
- The one dark direction (C) uses matte slate with mint, not gold, and has no glow.

---

## 2. The three directions

Contrast ratios were computed with the WCAG 2.x formula (script in the session scratchpad).
- Every person-facing pair is AAA (≥ 7:1).
- Every other text pair is at least AA.
- The person's card keeps the same structure in all three: keyword on top, 2–3 tiles at 120–200 px, a dashed "way out" tile, and the long-press exit.

### A. Signal (wayfinding)

**Idea.** Railway and hospital wayfinding is the most-tested legibility system in public life. It is built for stressed people reading at a distance. Talk Partner borrows that calm authority:
- a navy-and-signal-yellow top band
- the person's card treated as a sign: thick ink frame and a hard 4 px "plate" shadow
- the hybrid trace drawn as a route line, with one stop per step

It says "public infrastructure you can trust", not "app".

**Palette**

| Role | Hex | Pair | Ratio |
|---|---|---|---|
| ink (card text) | `#0B1B33` | on `#FFFFFF` | 17.2:1 AAA |
| muted | `#46546A` | on white / on panel `#EEF2F7` | 7.7:1 AAA / 6.8:1 AA |
| accent / on-device | `#0A3D91` | white on it | 10.1:1 AAA |
| signal yellow (CTA, pressed, used) | `#FFC72C` | ink on it | 11.0:1 AAA |
| cloud | `#C2410C` | on white | 5.2:1 AA (partner side only) |

**Type.**
- Overpass 600/800, a free relative of the US highway sign face, for headings, brand and the keyword.
- Atkinson Hyperlegible Next 400/700 for body text and tile labels.

**Shape and spacing.** Radius 6–10 px, 3 px ink borders, a 4 px hard bottom shadow on choice tiles (a "pressable plate"), 20–24 px gutters, and a 12 px yellow top band on the full-screen card.

**Judge trace.** A vertical route line:
- A filled navy stop means it ran on this device.
- A filled orange stop means it ran in the cloud.
- A hollow grey stop on a dashed track means it did not run.
- The used step gets a yellow ring and a yellow label plate.

You read where the card came from without reading any words.

**Wow**
- *First screen:* the yellow band draws across under the navy bar. The three welcome points light up as stops on a route. The drawn card on the right flips down like a departure-board panel.
- *Card moment:* the keyword appears, then the tiles flip down one after another, split-flap style, 100 ms apart. Then the route line draws stop by stop, and the used stop pulses once with a yellow ring.
- *Person's full screen:* a 280 ms fade only.

**Risk.** It can read as institutional or "government form". Yellow CTAs on both "Make card" and "Show to person" compete. If chosen, make only "Show to person" yellow.

### B. Marker & Pad (the written-choice technique itself)

**Idea.** In real SCA the partner writes the choices with a black marker on a pad and underlines the key word. This direction makes that literal:
- dotted-paper background on the partner side
- slightly irregular "hand-drawn" frames
- a highlighter swipe under the keyword on the person's card
- the trace as the partner's tick list in the margin

It is the warmest and most human of the three, and it tells the SCA story without a word of explanation.

**Palette**

| Role | Hex | Pair | Ratio |
|---|---|---|---|
| ink | `#141414` | on white card / paper `#FAFAF7` | 18.4:1 / 17.6:1 AAA |
| muted | `#555550` | on paper | 7.2:1 AAA |
| marker blue (CTA, on-device) | `#1D3BC9` | white on it / it on paper | 8.3:1 / 8.0:1 AAA |
| highlighter lime | `#D9F45C` | ink on it | 15.0:1 AAA |
| cloud highlighter (apricot) | `#FFD08A` | ink on it | 12.8:1 AAA |
| cloud text | `#9A3B00` | on paper | 6.7:1 AA |

**Type.**
- Lexend 500/700 for headings, keyword and tiles: rounded, wide and calm.
- Public Sans 400/600 for UI body text.

**Shape and spacing.** Asymmetric radii (`16px 11px 18px 10px / 11px 17px 10px 16px`) for the hand-drawn feel, 2.5–3 px ink strokes, a 6 px offset paper shadow on the card pane, and 22 px dot grid.

**Judge trace.** A tick list:
- A ticked box filled with highlighter means the step was used.
- An empty dashed box means it did not run.
- A red cross means it failed.
- Step names are blue for on-device and apricot-highlighted for cloud.

**Wow**
- *First screen:* the highlighter swipes under "Talk Partner". The drawn card on the right is revealed left to right, like a marker stroke.
- *Card moment:* the highlighter swipes under the keyword ("drink"). Each tile is then drawn left to right, as if written with a marker. In the trace, the tick is written into the box of the step that was used, and its name gets highlighted.
- *Person's full screen:* one highlighter swipe under the keyword, then tiles fade in.

**Risk.**
- The hand-drawn frames can read as playful, the AAC "childish" trap, if pushed further.
- Lexend is less proven than Atkinson for low vision.
- Lime is a 2025–26 trend colour, so it may date.

### C. Two Sides (the partner's desk and the card held up)

**Idea.** The product has two audiences on one screen, and the default look hides that. Here the partner side is a calm dark "desk" (matte slate, monospace for anything technical). The person's card is always a bright white sheet that looks *held up*: floating, with a deep shadow, turning toward the viewer.

In a 3-minute video a judge sees in two seconds which half is for whom. That is our reframe: not a board for one user like AAC Board AI, but a conversation between two people. Technical words (badge, status, trace headings) are in IBM Plex Mono, so "this is the engine" is visually separate from "this is the conversation".

**Palette**

| Role | Hex | Pair | Ratio |
|---|---|---|---|
| desk ink | `#E8EEF5` | on slate `#111823` / panel `#1A2431` | 15.3:1 / 13.4:1 AAA |
| desk muted | `#A9B6C6` | on slate / panel | 8.7:1 / 7.6:1 AAA |
| on-device mint (CTA) | `#5FE0B5` | on slate / `#06231A` on mint | 10.9:1 / 10.2:1 AAA |
| cloud sky | `#8CC8FF` | on slate | 10.0:1 AAA |
| card ink | `#0F141A` | on white | 18.5:1 AAA |
| card muted (way-out tile) | `#4A5361` | on white | 7.8:1 AAA |

**Type.**
- Instrument Sans 400/600/700 for the desk UI.
- IBM Plex Mono 400/600 for technical labels.
- Atkinson Hyperlegible Next 400/700 for everything on the person's card.

**Shape and spacing.** 14–18 px radii on the desk, 26 px on the card, 1 px hairlines on the desk against 3 px ink frames on the card, 32 px gutter between the two sides, and a deep 40/80 px card shadow.

**Judge trace.** Three step cards side by side, stacked on the phone:
- Each card has a coloured top edge: mint for on-device, sky for cloud, dashed grey for did not run, red for failed.
- The used step is lit, with a mint border and a tinted fill.

It reads like a small architecture diagram of *this* card, which is what a Chrome DevRel judge wants to see for "hybrid".

**Wow**
- *First screen:* the brand glyph (two stacked cards) flips in. The white card on the right turns toward you, a 3D rotate from 24° to 0.
- *Card moment:* on every new card the white pane turns toward the person and the tiles rise in order. The three trace steps light up left to right, and a soft mint sweep passes over the step that was used.
- *Person's full screen:* a 280 ms fade on white (it never flashes dark).

**Risk.**
- A dark UI in a bright kitchen. Every text pair is AAA, but some older carers prefer light screens.
- The person's card has to stay light even if the OS is in dark mode. It does here, by design.

### Rules all three motions follow (honesty and calm)
- Motion only shows things that really happen, in the order they happen:
  - The trace animates private → cloud → code. That matches `LEGS` and the step order in the pipeline.
  - The "used" mark lands on the step the pipeline marks `used` (where each step ran comes from the SDK's reported source).
  - Nothing animates a claim (no fake "AI thinking" spinner, no fake progress).
- The person's full-screen card gets only a ≤ 300 ms fade. Flips, draws and turns happen on the partner screen's preview pane, never while the person is reading.
- `prefers-reduced-motion: reduce` switches every animation off.
- **Known gap for the build:**
  - The app re-renders the whole screen on each state change, so entrance animations replay when the device check finishes (visible in the welcome part of the videos) and during a model download.
  - The chosen direction must run the entrance animation once per new card or route, keyed on the card. That is a small render change, so it is not done in this preview pass.

---

## 3. Recommendation: C, Two Sides, with Signal's route-line trace as the fallback trace

**Why C:**
1. **It is the only direction that puts our reframe on screen.**
   - The judges already paid for a pictogram board (AAC Board AI, Most Helpful 2025).
   - The non-obvious part of Talk Partner is that SCA is a partner technique, a two-person act. Two Sides shows the two people before anyone reads a word, which is the "one-sentence insight" check in our judge corpus (PATTERNS A2).
2. **It makes the hybrid story legible as architecture.**
   - The mono technical layer and the three-step strip are exactly what "Best Hybrid" judges look for (PATTERNS C: on-device value, a visible reason for cloud).
   - The person's card never shows any of it, which is correct for the person.
3. **The person's card is the most neutral of the three.** It uses Atkinson on plain white, with no highlighter and no hand-drawn frame. That keeps the evidence-based legibility (sans, lower case, AAA, one keyword) while the desk carries the identity.
4. **Its wow, the card turning toward the person, is a real event in the product.** "Show to person" is the moment the phone is turned around. That makes it a natural first beat for the demo video.

**What I would borrow:**
- From A, the route-line trace as an alternative to the three cards. It reads faster in a still screenshot, and the stills show it is the clearest trace of the three.
- From B, the single highlighter under the keyword, as an optional touch on the person's card. SCA partners do underline the keyword.

**Before it ships (if the project owner picks C):**
- Self-host the fonts (woff2 in `web/public/`). The app promises "Everything runs on this computer", and it should not call Google Fonts at runtime or need the network offline.
- Run the entrance animation once per card, not on every render.
- Add a light variant of the desk for daylight, which keeps the same white card.
- Re-run the full `scripts/shots.mjs` set (17 screens) on the chosen theme.
- The default theme has a thin frame around the full-screen card, because `#app` gets the route name `person` as its class. The themes reset it. The default theme was left as is, per "don't change the default".

**Not done here, by design:**
- No high-fidelity renders (Higgsfield or Nano Banana).
- No pick in code.

The screenshots and mp4s are the real, working prototype at three looks. The project owner picks the direction, and only then does the default change.

**Best desktop partner screens, one per direction:**
- `devlog/design_dirs/signal/desktop_04-partner-card-coffee-tea.png`
- `devlog/design_dirs/marker/desktop_04-partner-card-coffee-tea.png`
- `devlog/design_dirs/twosides/desktop_04-partner-card-coffee-tea.png`
