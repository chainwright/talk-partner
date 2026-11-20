# Pictures: provenance and licence

The set is mixed since 20 Nov 2026: **84 pictures made with Google's Gemini** and **40 SVG drawings of our own**. The
table below gives the source, the date and the licence or terms of every picture the app bundles.

**Made with Gemini (84).** Generated on 20 Nov 2026, inside the hackathon's submission period, with Google's Gemini
3.1 Flash Image (`gemini-3.1-flash-image`, in Google AI Studio), the sponsor's own model, from short text prompts
(each one is in `devlog/quota_probe_2026-11-20/ASSET_MANIFEST.json`). A person reviewed every picture next to our
drawing of the same word and chose which to use; some were made again with a better prompt. Then each was put on a
pure white background, trimmed and saved as a 256 x 256 WebP (`web/public/pictures/`, about 6 KB each). We did not
draw these. Google does not claim ownership of what the Gemini API generates; we use the pictures under the Gemini
API terms and claim no copyright in them beyond what applies. They are not covered by the repository's Apache-2.0
licence. We looked at each file for brands, logos and words: none shows a brand or a logo; the only readable words
are the printed SCENE, TAKE, ROLL, DATE, DIRECTOR on the film clapperboard and tiny OFF / ON marks on the radio.

**Drawn by us (40).** Our own SVG drawings in `web/src/pictos.ts`, on a 96 x 96 grid in one style (a dark outline of 3,
flat real-object colours, one lighter or darker patch for shading, one object per picture, a plain background, no
scene), licensed under the repository licence, **Apache-2.0** (see `LICENSE`), by the Talk Partner team. Kept as
drawings because the drawing is clearer (an abstract idea, a scale, a pointer) or a hand sign could offend: yes, no, someone else, okay, this one, that one, a little, some, a lot, show me, change topic, morning, just right, and the way out, something else (its dashed frame keeps it apart from every choice on the card; the Gemini question mark was too close to "not sure", so it is not used); the 25 parts of the body map; the monogram. Our drawing of every word
that now has a picture is still in `web/src/pictos.ts`: it shows if the picture file cannot be loaded, so a tile is
never an empty frame. No ARASAAC, no Mulberry, no ParticiPics, no icon font, no clip art.

**History.** The first pictures were black line drawings (9–10 Nov 2026, the pre-period prototype, `DISCLOSURE.md`),
chosen for licence and one style, not from evidence; on 18 Nov 2026 they were redrawn in colour and 39 were added.
`design/IMAGES_RESEARCH_2026-11-17.md` holds what the research on pictures for adults with aphasia says (small
studies): colour, texture and shading bring drawings close to photographs for naming; SLPs use coloured pictures
more than black-and-white line drawings; the word belongs under the picture; no 3D, no animation on choices. The
pictures made with Gemini go one step further in that direction (texture and shading). The ids did not change, so
every card keeps its picture.

What is checked: `tests/unit/day3.test.ts` checks that this table lists exactly the ids the code bundles, that each row
carries a 2026 date and its source, Apache-2.0 for our drawings and the Gemini terms for the rest, and that the rows
marked as made with Gemini are exactly the manifest's ids; `tests/unit/pictures.test.ts` checks our drawings' style
(the same outline on every drawing, real colours written into the drawing, no outside image, no text, only the way out
dashed, in our drawings and on the card), the contrast of the outline on the white card (12.6:1; the person's card is white in the light and in the
dark theme, and the topic tiles show their picture on a white plate), and every picture file (WebP, 256 x 256, at
most 20 KB, the same ids in the code, in the manifest and in the folder). Sheets of all of them as the card shows
them, at 390 px: `devlog/evidence_pictures/` (`python3 scripts/picture-sheet.py`).

Not checked: colour-vision changes after a stroke, the cultural fit of the food pictures (tea, a sandwich, a roast),
and how people with aphasia read the new pictures (no real user has seen them yet). Our drawn figures use one neutral
head colour and differ by one attribute each; the figures made with Gemini show different ages, hair and skin tones.

| id | shows | source | date | licence/terms |
|---|---|---|---|---|
| yes | white tick on a green disc | drawn by us (SVG) | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| no | white cross on a red disc | drawn by us (SVG) | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| not sure | an adult shrugging, palms up | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| something else | dashed pale frame with three grey dots (the only dashed shape, on every card) | drawn by us (SVG) | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| someone else | grey figure with a question mark on an amber disc | drawn by us (SVG) | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| somewhere else | a wooden signpost, arrows pointing different ways | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| good | a thumb up | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| okay | yellow face, flat mouth | drawn by us (SVG) | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| bad | a thumb down | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| tasty | a roast dinner on a plate, with steam | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| plain | a bowl of plain white rice | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| too salty | a salt shaker pouring a heap of salt on a plate | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| good idea | a yellow light bulb | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| leave it | a hand pushing a plate away | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| like them | a red heart | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| unhappy | an older adult's face, sad | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| this one | green card on the left, an arrow to it | drawn by us (SVG) | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| that one | green card on the right, an arrow to it | drawn by us (SVG) | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| a little | one blue bar of four | drawn by us (SVG) | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| some | two blue bars of four | drawn by us (SVG) | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| a lot | four blue bars of four | drawn by us (SVG) | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| listen | an ear with blue sound waves | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| tea | a white teacup on a saucer, a teabag tag over the rim | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| coffee | a blue mug of black coffee with steam | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| change | two curved arrows, blue and green, in a circle | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| wait | a raised open hand, palm forward | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| stop | a raised hand on a red disc | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| write it | a hand writing with a pen on lined paper | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| more | a plus sign on a white plate | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| show me | a hand pointing at a small blue object | drawn by us (SVG) | 18 Nov 2026 (colour; first drawn 11 Nov 2026 as a line drawing) | Apache-2.0 |
| draw | a hand with a pencil drawing a house | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| later | a clock with an orange arrow forward | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| change topic | two speech bubbles, grey then blue | drawn by us (SVG) | 18 Nov 2026 (colour; first drawn 11 Nov 2026 as a line drawing) | Apache-2.0 |
| tired | an adult yawning, heavy eyes | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| worried | an adult's face, a worried brow | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| pain | a grey figure holding the lower back, a red mark there | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| something's wrong | a yellow warning triangle with an exclamation mark | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| fall | an older adult on the floor by a fallen chair | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| tablets | two white tablets and an orange pill bottle (blank label) | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| spouse | an older couple, head and shoulders | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| child | a grown-up son and daughter | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| sibling | an adult brother and sister | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| grandchild | a young boy standing | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| friend | two adult friends side by side | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| neighbour | an adult waving over a garden fence | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| carer | a carer in a blue top | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| nurse | a nurse in a light blue uniform with a stethoscope | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| doctor | a doctor in a white coat with a stethoscope | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| speech therapist | a woman holding picture cards | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| physio | a physiotherapist helping a seated man stretch his arm | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| priest | a priest in black with a white collar | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| family | a family: four adults and a child | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| visitor | a visitor at an open door holding flowers | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| toilet | a white toilet seen from the front | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| drink | a glass of water with ice and a straw | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| food | a plate of chicken, mash and vegetables, a fork | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| too hot | a red thermometer with a sun | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| too cold | an adult in a hat and scarf, shivering, a snowflake | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| call someone | a mobile phone with a green call sign | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| body:head | body figure (light blue top, navy legs), head in red | drawn by us (SVG) | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| body:face | body figure (light blue top, navy legs), face in red | drawn by us (SVG) | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| body:eyes | body figure (light blue top, navy legs), eyes in red | drawn by us (SVG) | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| body:mouth | body figure (light blue top, navy legs), mouth in red | drawn by us (SVG) | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| body:top of head | body figure (light blue top, navy legs), top of head in red | drawn by us (SVG) | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| body:ears | body figure (light blue top, navy legs), ears in red | drawn by us (SVG) | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| body:neck | body figure (light blue top, navy legs), neck in red | drawn by us (SVG) | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| body:left side | body figure (light blue top, navy legs), the person's left side of the chest in red | drawn by us (SVG) | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| body:right side | body figure (light blue top, navy legs), the person's right side of the chest in red | drawn by us (SVG) | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| body:middle | body figure (light blue top, navy legs), middle of the chest in red | drawn by us (SVG) | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| body:upper stomach | body figure (light blue top, navy legs), upper stomach in red | drawn by us (SVG) | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| body:lower stomach | body figure (light blue top, navy legs), lower stomach in red | drawn by us (SVG) | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| body:chest | body figure (light blue top, navy legs), chest in red | drawn by us (SVG) | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| body:stomach | body figure (light blue top, navy legs), stomach in red | drawn by us (SVG) | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| body:back | body figure (light blue top, navy legs), back (shown through) in red | drawn by us (SVG) | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| body:upper back | body figure (light blue top, navy legs), upper back in red | drawn by us (SVG) | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| body:lower back | body figure (light blue top, navy legs), lower back in red | drawn by us (SVG) | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| body:arms | body figure (light blue top, navy legs), both arms in red | drawn by us (SVG) | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| body:legs | body figure (light blue top, navy legs), both legs in red | drawn by us (SVG) | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| body:hands | body figure (light blue top, navy legs), hands in red | drawn by us (SVG) | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| body:feet | body figure (light blue top, navy legs), feet in red | drawn by us (SVG) | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| body:left arm | body figure (light blue top, navy legs), the person's left arm (viewer's right) in red | drawn by us (SVG) | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| body:right arm | body figure (light blue top, navy legs), the person's right arm (viewer's left) in red | drawn by us (SVG) | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| body:left leg | body figure (light blue top, navy legs), the person's left leg (viewer's right) in red | drawn by us (SVG) | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| body:right leg | body figure (light blue top, navy legs), the person's right leg (viewer's left) in red | drawn by us (SVG) | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| water | a glass of water | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| juice | a glass of orange juice with a straw | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| milk | a glass of milk and a milk carton with a cow on it (no words) | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| hot drink | a green mug with steam | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| cold drink | a glass with ice cubes | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| snack | biscuits and an apple on a plate | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| meal | a dinner plate: meat, mash and vegetables | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| something sweet | a slice of chocolate cake | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| something savoury | a sandwich and crisps | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| hot meal | a bowl of soup with steam | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| cold meal | a bowl of salad | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| bed | a single bed with a blue blanket | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| chair | a green armchair | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| tv | a flat television, screen off (no logo) | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| music | headphones with music notes | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| news | a folded newspaper (lines, no readable words) | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| film | a film clapperboard and popcorn (the board has the printed words SCENE, TAKE, ROLL, DATE, DIRECTOR) | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| radio | an old wooden radio (tiny OFF / ON marks) | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| paper | an open book | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| photos | a stack of printed photos | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| now | a clock with a green dot | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| morning | sun rising over a line, an arrow up | drawn by us (SVG) | 18 Nov 2026 | Apache-2.0 |
| afternoon | a sun high in a blue sky | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| stay in | a brick house with warm windows | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| go out | an open front door, a path outside | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| open | an open blue door | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| closed | a closed blue door | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| glasses | a pair of reading glasses | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| hearing aid | a behind-the-ear hearing aid | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| company | two people talking | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| time alone | an older woman reading in an armchair | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| walk | a walking shoe and a walking stick | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| garden | a small garden with flowers and a fence | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| drive | a small blue car on a road | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| wash | a washbasin with a tap, soap and a towel | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| exercises | an adult doing an arm stretch | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| quiet | a finger over the lips | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| just right | thermometer, green, with a green tick | drawn by us (SVG) | 18 Nov 2026 | Apache-2.0 |
| plans | a calendar page | Generated with Gemini 3.1 Flash Image (`gemini-3.1-flash-image`), reviewed by a person | 20 Nov 2026 | output used under the Gemini API terms; no copyright claimed by us beyond what applies |
| monogram | a named person's initial in a soft circle (letters allowed only here) | drawn by us (SVG) | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |

Also in `web/src/pictos.ts`, and not choice pictures: `MIC` and `MIC_STOP` (the microphone on the partner's "speak your
question" button, drawn 17 Nov 2026) and `TICK` / `CROSS` (the check of the full view), line signs in the theme's own
colour, Apache-2.0. They are controls on the partner's side and are never on a card. The small line signs of the simple
view's controls (`SIGN` in `web/src/simple.ts`: back, home, lock, cloud, the four steps) are ours too, same licence.

Personal photos are not part of this table: a family's own photos are added in About them, stay on that device, and
are never bundled (README, "Personal photos").

Still word-only (no picture drawn): places and shops, particular dishes, the family's own entries without a photo.
Those labels show as word-only tiles, never an empty frame.
