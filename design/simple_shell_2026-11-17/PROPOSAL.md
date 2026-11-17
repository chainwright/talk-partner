# A simple shell for ordinary people: two directions

17 Nov 2026, 15:50 CST. Stage 1 only: research, two directions, mockups, a recommendation. Nothing of the shell is
built. The one change to the app is the sideways-overflow fix (commit `d524f51`, section 2).

The owner's words after using the live copy on his Android phone: "For ordinary people this interface is too
complex. Make a shell for ordinary people, simple, clear and convenient, with a button to go inside and see how
everything works under the hood."

Who the shell is for: a family member or carer of an adult with aphasia, and a speech-language therapist trying it
out, usually on a phone. Judges keep today's full view one tap away, and `/#/demo` opens it directly as it does now.

## 1. What is wrong today (from his screenshots and the code)

| Seen on his phone | Cause in the code |
|---|---|
| Text and buttons cut off on the right ("Make ca…", the status box, the card) | His phone is 360 px wide. The one-column layout was `1fr`, and the question form's min-content width is 359 px, so the column was 15 px wider than the screen. Fixed (section 2). `scripts/shots.mjs` only measured 390 px, where it fits. |
| Chip rows run off the right edge | By design they scroll sideways on a phone (`styles.css`, `.chips` under 520 px). It reads as broken. The shell has no sideways-scrolling rows. |
| Judge mode with technical lines by default ("0 bytes left this computer", "Judge mode · 1 no AI…", "How this card was made: either-or…") | The first screen's second button, "Try the sample family", goes to `#/demo`, and `#/demo` is judge mode. There is no sample family outside judge mode. |
| "This computer" on a phone | Every string says "this computer" (`core/copy.ts`). |
| No hint of what to tap first | The first screen is three numbered status lines about the private helper and cloud help, then two buttons below the fold (`welcomeScreen`). |
| A phone cannot make a card for an open question until cloud help is on | Gemini Nano does not run on phones, and cloud help is off by default. So for a phone user the consent moment is the centre of the product. Today it is a separate page reached from a small link. |

## 2. Overflow fix (done, committed separately)

- Commit `d524f51`. One CSS line: `.layout { grid-template-columns: minmax(0, 1fr) }` in the one-column layout.
- Test: `python3 scripts/overflow-check.py` (Playwright, phone emulation, 19 screens and card states at 360, 390 and
  412 px; every request to another host is refused, so nothing reaches Firebase).
- Before, at `0e358dd`: 46 of 57, exit 1; all 11 failures at 360 px (`overflow/before_0e358dd.txt`). After: 57 of 57,
  exit 0 (`overflow/after_fix.txt`). `npm run check` exit 0, 1870 tests.
- Not fixed: at 320 px three screens are still too wide (the recording of the on-device step, the repair card, the
  table on "How this works"). 320 px was not asked for and is rare. They are 10 to 27 px over.
- Not tested: Android's system font size setting. If his phone has large text switched on, more may be cut off than
  this test sees.

## 3. Research: what simple apps do in the first 30 seconds

Pages opened on 17 Nov 2026 unless marked. Dates are the page's own where it shows one.

| Source | What it does | What we take |
|---|---|---|
| [Apple Assistive Access](https://support.apple.com/guide/assistive-access-iphone/set-up-assistive-access-devcd5016d31/ios) (date not shown, © 2026) | A "trusted supporter" sets it up; the simple view shows only the chosen apps as large rows or a grid; leaving needs a triple-click and a passcode. | Two levels only. Setup belongs to the carer. The way out of the simple view is deliberate. |
| [Proloquo2Go: hide edit options](https://www.assistiveware.com/support/proloquo2go/protect-share/hide-show-edit-options) (page date 17 Nov 2026, may be generated) | Edit mode can be switched off and locked with a PIN. | The advanced layer is hidden, not removed. |
| [Tactus Conversation Therapy](https://tactustherapy.com/app/conversation/) (date not shown, © 2026) | A picture and one question button; bundled content; no account described. | One action on the first screen, with content already there. |
| [Cboard](https://praacticalaac.org/praactical/praactical-resources-free-web-based-aac-with-cboard/) (15 Feb 2021) | Opens on a ready board; a lock sign opens editing. | Sample content first, editing behind one sign. |
| [Google Look to Speak](https://blog.google/outreach-initiatives/accessibility/look-to-speak/) (8 Dec 2020) | One privacy sentence: "all of the data is private and never leaves the phone." | Privacy in one plain sentence, always in sight. |
| [Be My Eyes privacy policy](https://www.bemyeyes.com/privacy/) (effective 1 Sep 2026) | Says in plain words who processes an image and that it is not used for training. | Name the receiver (Google) and say what is sent, in one or two sentences. |
| [W3C COGA, Making Content Usable](https://www.w3.org/TR/coga-usable/) (29 Apr 2021) | "Make the purpose of your page clear", "Use clear words", "Avoid too much content". | One sentence of purpose, everyday verbs, short screens. |
| [NN/g, Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/) (3 Dec 2006) | Most people should finish without opening the second level; its button sits "in a clearly visible spot"; more than two levels tests badly. | One labelled link to the inside, on every screen. No third level. |

Not verified: the Stroke Association's accessible information guidelines (the PDF refused us), first-run screens of
Be My AI and Spoken, the 44 px target size (from memory of WCAG 2.2). Older sources (2006, 2020, 2021) are patterns
that have not changed; none of them is a 2026 trend claim.

Also read: `judge_app_r5_2026-11-17/SUMMARY.md` (P1: fold the panels under the first card; the judge path) and
`packet/EXPERTS.md` (Wroblewski: process shown as progress, then collapsed, "It was too much"; Saarinen:
"Transparency makes speed feel safe"). Both point the same way: the technical layer should be there and folded.

## 4. The two directions

Both keep the person's card exactly as it is. Both replace "this computer" with "this phone" (or tablet, or
computer). Both keep judge mode, the folds, the receipt and the full consent page; they move, they do not go.

### A. "One screen" (mockup `a.html`, dark, the app's own look)

- **First screen.** One sentence ("Ask a question. Get a card they can point to."), one field with the microphone,
  one button ("Make a card"). Under it three ready questions that make a card in one tap, then "Quick needs", then
  one line offering About me. At the bottom: "Nothing has left this phone." and **See how it works inside →**.
- **The three steps.** 1 "Say this out loud" (the line), 2 "Show Frank the card" (the card and one big button),
  then the person's screen, then "Frank chose and said yes to: tea" with "Ask another question".
- **Where the inside lives.** The same link at the foot of every simple screen. On a card it reads "How was this
  card made? →" and opens that card's folds. Inside is today's full view with a "‹ Simple view" pill that stays on
  screen.
- **Cloud consent.** Asked at the moment a question needs it, as a sheet over the screen: "This question needs
  online help", what is sent ("your question, and nothing else", names swapped), what is never sent, "Yes, use
  online help" / "No, keep it all on this phone", links to the exact request and Google's terms. After a yes the
  card is made straight away.
- **About me.** Offered, never required: one line on the first screen, and a screen of four plain rows ("His name,
  and yours", "Family and friends", "Food and drink he likes", "Places, TV and music") under one line,
  "Everything here stays on this phone."
- **Look.** Two Sides as it is (dark desk, mint, white card), minus the mono type and the status box. Dark only,
  because the app is dark only.

### B. "Three steps" (mockup `b.html`, light and dark)

- **First screen.** Two big doors: "Ask Frank a question" and "Quick needs". Under them "Asked before".
- **The three steps.** Each is its own screen with a stepper on top: 1 Ask, 2 Show, 3 Answer.
- **Where the inside lives.** A bottom bar with four places (Ask, Needs, About Frank, More). "See how it works
  inside" is the first row of More; a card's answer screen also has "How was this card made? →".
- **Cloud consent.** Asked up front, on the second of three first-run screens: "May Talk Partner use online help?"
  with two options, neither chosen for you.
- **About me.** Its own place in the bottom bar.
- **Look.** Light by default: the whole shell takes the person's card palette (white, deep green, near-black), and
  follows the system's dark setting with the desk colours.

## 5. Where everything the rules need stays reachable

| Needed | A | B |
|---|---|---|
| Firebase AI Logic hybrid: on-device and cloud steps, `inferenceSource` on every card | Unchanged pipeline. The plain line under each card ("Made on this phone. Nothing was sent." / "Made with online help. Only the question was sent.") is the same badge in everyday words. Technical badge, trace and request: one tap, "How was this card made? →" | Same line on the answer screen; the rest under More |
| Consent before anything is sent | The sheet, at the first question that needs it; the full page with the exact request is linked from it | First run screen 2; the full page under More |
| Cloud help off by default | Yes | Yes, and no option is pre-selected |
| Privacy line always in sight | Foot of every simple screen | Home and answer screens |
| Judge mode, receipt, "How this works", feedback | Inside, one tap from every screen; `/#/demo` opens it directly | Inside, two taps (More, then the row); `/#/demo` directly |
| Microphone notice (the recording goes to Google) | Unchanged: the first press shows it | Unchanged |

## 6. Risks

**A**
- The sheet replaces "tick a box" with a button. `JUDGES.md` and `CLAIMS.md` say the partner reads what is sent and
  ticks a box. Either the sheet keeps a tick, or those lines are changed to match. To decide before building.
- A judge who opens `/` instead of `/#/demo` sees the simple shell first. The hybrid part is then one tap away, not
  on screen. `JUDGES.md` already sends judges to `/#/demo`; the Devpost link must do the same.
- On a short phone (360 × 740 with the browser bars) the inside link on the first screen is just below the fold
  (864 px in the mockup). It fits at 390 × 844. A fixed footer would settle it.
- Two views of one app can drift apart. Guard: the simple view calls the same `make()` and reads the same `Card`;
  it draws less, it computes nothing.

**B**
- Consent is asked before the person has seen a single card. The apps in section 3 that we could open (Tactus and
  Cboard) start on ready content. A first-time user has no reason yet to say yes.
- Three first-run screens and a stepper put more between the carer and the first card, the opposite of what was
  asked for.
- The inside is two taps away and its label sits in a menu, which is weaker than "a button to go inside".
- A light theme means new colours for every existing screen and a new contrast pass. It is the larger change by far.
- A bottom bar on a web page fights the browser's own bottom bar on Android.

**Both**
- Nobody these screens are for has seen them. The mockups are our reading of one owner's reaction and published
  patterns, not a test with carers.
- "This phone can't think of the choices by itself" is true on phones. On a desktop Chrome with Gemini Nano the
  sheet must not appear; the copy has to follow the device check.

## 7. Effort to build (hours of work, tests and documents included)

| | A | B |
|---|---|---|
| View switch (simple by default, full for `/#/demo`, remembered), routes | 2 | 5 |
| Simple screens (first, card ready, answered) on the existing pipeline | 5 | 9 |
| Consent in plain words, retry after a yes | 3 | 4 |
| About me, simple rows over the existing form | 3 | 4 |
| "This phone / tablet / computer" through `core/copy.ts` and its tests | 3 | 3 |
| Styles, phone checks (overflow at 360 to 412, shots) | 3 | 9 (light theme, bottom bar, contrast table) |
| Unit and browser tests, README / JUDGES / CLAIMS | 4 | 6 |
| **Total** | **about 23 (20 to 26)** | **about 40 (36 to 46)** |

## 8. Recommendation

**Build A.** It is what was asked for: one screen, one button, the inside one tap away on every screen. It asks
for consent at the moment the carer can see why, it keeps the look the project already chose, and it costs about
half of B, which matters with the video and the live cloud step still open before 28 Nov.

Take one thing from B: the numbered steps. A's card-ready screen already carries "1 Say this out loud" and
"2 Show Frank the card". A light theme is a separate decision for after the contest.

What would change this recommendation: a carer or therapist who, shown A, cannot find how to start, or who says no
to the sheet because it comes as a surprise. Then B's up-front question is worth its cost.

## 9. Files

- Mockups: `a.html`, `b.html` (open in a browser; `#1` to `#7` choose the screen, `b.html?theme=dark` the dark
  look), `shell.css`, `mock.js`. Static pages; no app code runs in them.
- Screens: `shots/`, from `python3 design/simple_shell_2026-11-17/render.py` (53 images; every mockup screen also
  passes the no-overflow check at 360, 390 and 412 px). Named `<direction>_<width>_<theme>_<n>-<screen>.png`.
  Contact sheets: `shots/_sheet_A_390.png`, `shots/_sheet_B_390_light.png`, `shots/_sheet_B_390_dark.png`,
  `shots/_sheet_desktop.png`.
- Phone, 390 × 844: A `shots/A_390_dark_1-first-screen.png` to `A_390_dark_7-inside.png`; B
  `shots/B_390_light_1-home.png` to `B_390_light_7-person-card.png` (and `B_390_dark_*`).
- Desktop, 1440 × 900: `shots/A_1440_dark_*`, `shots/B_1440_light_*`, `shots/B_1440_dark_*`. The desktop layouts
  are a first pass (two columns, content at the top); the phone is where the design was worked out.

## 10. Not checked

- No carer, therapist or person with aphasia has seen either direction.
- Contrast of the new light palette in B was not measured; the pairs are the card's own, which the app holds at AAA.
- The mockups show one card (coffee or tea). Pain, body, repair, quick needs and the "no card" cases are not drawn.
- The inside screen in `a.html` is a sketch of today's full view, not a capture of it.
- The live site was not opened and nothing was deployed.
