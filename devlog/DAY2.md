# Day 2: Wed 11 Nov 2026, evening session (work pulled forward from Fri 13 and Sat 14)

Scope: everything on the GATE plan for Fri 13 and Sat 14 that needs no deploy, no billing, no install and no account.
All AI calls still go through Firebase AI Logic exactly as on Day 1; `web/src/ai/firebaseEngine.ts` is untouched.
Nothing claims on-device inference: this Mac still cannot run Gemini Nano (disk), so no on-device run happened today.

## Done (checked by tests, not assumed)
**Fri 13 items**
- **Headline rule (§2.5, §2.16, §2.2).** An or-pair's headline is the shared topic, never an option: the question's
  own time or topic words once the two sides are removed ("this weekend", "lunch"), else a kind both sides belong to
  ("drink", "clothes", "when", or "food / who / where to / TV / music" from About me), else the model's topic when it
  names neither side, else the short pair itself, else "which one". "Do you want coffee or tea?" reads **drink** in all
  35 engine states (was "coffee tea"). A model topic that is one function word or adverb ("again"), a placeholder, or
  one of the model's own choices is not a headline. Address words ("Ma", "love") and the person's name never are.
  Code-determined cards (yes/no, feeling, pain, body, or-pair) take their headline from the question, so the card is
  identical whatever the model said (§2.18).
- **Either-or label check (§2.5 table).** One `checkPair()` now runs on both the model's copied options and the code
  parser's pair: whole noun phrase completed from the question ("fish chips" → "fish and chips"), snapped to an
  About-me item written in full ("Calendar" → "Country Calendar"), a time phrase shared by both sides dropped rather
  than glued to one, a dangling function word cut ("lamb roast for" → "lamb roast"), subject pronouns replaced by the
  names when they would flip ("you paid it / I paid it" → "Alan paid it / Maria paid it"); rejected when a side is a
  question or leftover, a bare pronoun, a negative, over five words, when the sides are the same or synonyms, or not on
  one axis ("the hospital / Thursday"). A rejected pair goes to the cloud (consent on) or is blocked, never shown as is.
- **Subject-less offers are yes/no (§2.4).** "Ma, you want coffee?", "Want kringle?", "Fancy a run?", "Up for bowls?",
  "You hungry?" → yes / no / not sure. A leading vocative ("Eileen, …") no longer hides the question's shape from any
  check. A model `kind: "yesno"` on a wh-question is ignored.
- **Engine-state matrix extended.** Seven model states (ready, garbage options, wrong kind, topic-is-option, empty,
  throws, absent) × five cloud states (off, unconfigured, throws, offline device fall-back, ok) × seven card shapes
  (coffee/tea, a clause or-pair, "Ma, you want coffee?", a feeling, the body map, the pain level, a memory question,
  an open question). Every cell checks: the private leg never gets a stripped prompt, the stripped leg never gets the
  profile, "sent" only when the source is in-cloud and the payload equals the request, blocked cards carry no choices,
  shown cards have ≥ 2 answers and exactly one escape, no placeholder on any label, the headline is never an option,
  the spoken line carries every choice in order; code-determined cards are byte-identical across all 35 states.

**Sat 14 items**
- **Open-question sources (§2.6).** When the model's proposal leaves fewer than two answers, the card is completed from
  the About-me list of the same kind (people for a contact "who", places for "where", foods for eat, TV for watch,
  music for listen) or the small fixed set for the question type (pain / family for "why upset"; toilet / pain for
  "what do you need"). A generic "stay home / go out" on a "where" question is replaced by places from About me.
  Bare colours for "which jumper" count as invented (→ "this one / that one", hold two up). A card completed this way
  stays on the device: the cloud has no About me and cannot do better.
- **People (§2.7)**, **figures (§2.9)**, **memory lines (§2.10)**, **blocked cards (§2.13)**: the partner is excluded
  from contact questions even when not marked as living here (mutant M2, now a test); "half past ten" → "10:30",
  "three pm" → "3 pm", "eightieth" → "80th", bare number words on a "when" card → digits; the memory line depends on
  the kind of question ("It was …" / "It's on …" / "She's …" / "Brianna is …" / "It's …, if you don't: I can't think
  of it either" / "We've got …"), with the relation from About me deciding he/she; the partner screen wording has no
  rule number; a blocked card carries no choices at all (not even an escape).
- **Privacy swap (§2.19).** Plural and singular forms of an About-me word are swapped and caught by the leak gate
  ("scones" ← "scone", "dart" ← "darts"). An unknown capitalised word that is not sentence-initial and not ordinary
  English becomes **"Name A"** (a trip to Whitby with Pauline → Name A with Name B), restored on the device; the cloud
  prompt names the new label. Mutants M3 (the leak gate blocks a send the stripper missed) and M4 (two people with the
  same relation → "someone") are tests now.
- **Picture gate (§2.20).** A cloud picture request carries a lower-case generic word with no digits; an About-me item
  asks for its kind; anything else is a word-only tile (`{ type: 'word' }`), never the escape icon or an empty frame.
- **Property tests (§5.2).** `card.property.test.ts`: 400 seeded random cards (random question shapes with prefixes
  and address words × random model output including junk, negatives, "both", placeholders, invented names × random
  engine states × random support) hold every invariant above, plus: any parseable "X or Y?" yields that card in every
  state with nothing sent; 300 random capitalised or digit words never yield a cloud picture request.
  The property test found two real bugs while being written: a model `yesno` on a wh-question, and "Carer - toast"
  leaving a dash in a label. Both are fixed and covered.

## Test counts
`npm run check` (ESLint 0, `tsc` 0, Vitest): **682 / 682 in 14 files** (Day 1: 305 in 9). Per file: engine-matrix 315,
rules 58, fixround 49, fixround3 45, open-sources 40, fixround2 36, headline 27, pipeline 26, label-check 23,
fixround4 20, no-direct-model-calls 19, strip-gate 19, card.property 3 (400 + 300 + 4 cards inside), strip.property 2 (500 sentences inside).
Mutation check (hand list, files restored afterwards): removing the one-axis and shared-tail checks → 6 red; letting
blocked cards keep their choices → 8 red; removing the "Name A" step → 6 red.
Three pre-period tests changed, each with a dated comment: Pip's tile is a word-only tile (was the escape icon); the
memory wording has no rule number; "What shall we cook tonight?" is completed from the About-me foods instead of going
to the cloud.

## Sources for §2.6–2.13 (details and URLs in `devlog/DAY2_sources.md`)
Read in full: the Aphasia Institute SCA™ tip sheet (key words in large print, one thing at a time, "multiple choice
formats are better than yes/no questions", "OTHER" as the escape, give time, verify with "So let me make sure I
understand…"). Verified at abstract level through Europe PMC: Kagan et al. 2001 (the SCA controlled trial) and
Simmons-Mackie, Raymer & Cherney 2016 (partner training review); de Vries et al. 2024 (pain in aphasia: self-report is
hard, no settled instrument). Only snippets, not read: Lasker et al. 1997 (Written Choice), Rose et al. 2011
(aphasia-friendly design). **Not found anywhere:** a "don't test" rule for aphasia; §2.10 is our own reading of the
competence principle and the write-up must say so. The pain card is a conversation aid, not a scale.

## Decisions taken where the spec was silent or clashed with itself
1. "You need something?" is a subject-less offer → yes/no (§2.4), not the §2.6 generic set; the set applies to the open
   form "What do you need?".
2. An or-pair whose headline cannot be found reads "which one" (a short pair reads as itself). The project owner may prefer another
   fallback; one line to change in `orHeadline()`.
3. "…, do you know?" is treated as a tag, not as a memory marker (§2.3 hints otherwise); "…, do you remember?" is a
   memory question. Open for the SLP review.
4. A card completed from About me is not re-routed to the cloud even if the model's other options were rejected.
5. Over-stripping is accepted as the safe direction: "Name A" also hides brands and places the cloud could have used
   ("Netflix" is on the common-word list, "Wimbledon" is not); plural keys mean "game" is hidden when "Packers games" is in About me.

## What's left (unchanged plan)
- Thu 12: build session 12:00 CST; Firebase CLI + first deploy (needs disk), reCAPTCHA Enterprise key, App Check enforcement. Owner items from Day 1 still open: Blaze, disk ≥ 25 GB, devices.
- Sun 15: partner/person/About screens, consent flow, copy module (§4) with the copy-truth tests (§5.1), pictograms
  batch 1, judge mode v0, deploy → judge round 1. The "I really don't know the answer: make a card" override (§2.10),
  "your left arm" labels on the person's card (§2.11), the nickname field and the cloud-picture lexicon are not done.
- No on-device run yet (disk). The web client's `main.ts` needed no change today beyond the existing word-only tile path.

Next step: Thu 12 build session, then the CLI/deploy once disk is freed; the Day 2 rules need no further code before Sun 15's screens.
