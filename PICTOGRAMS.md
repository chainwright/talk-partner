# Pictures: provenance and licence

Every picture in the app is our own SVG drawing in `web/src/pictos.ts`: simple, realistic colour pictures on a 96 × 96
grid, in one style (a dark outline of 3, flat real-object colours, one lighter or darker patch for shading, one object
per picture, a plain background, no scene). None comes from a third-party set: no ARASAAC, no Mulberry, no
ParticiPics, no icon font, no clip art, and **no AI-generated image**. All are licensed under the repository licence,
**Apache-2.0** (see `LICENSE`), by the Talk Partner team.

**Redrawn in colour on 18 Nov 2026.** Until then the set was black line drawings, chosen for licence and one style,
not from evidence. `design/IMAGES_RESEARCH_2026-11-17.md` holds what the research on pictures for adults with aphasia
says (small studies): colour, texture and shading bring drawings close to photographs for naming; SLPs use coloured
pictures more than black-and-white line drawings; the word belongs under the picture; no 3D, no animation on choices.
The ids did not change, so every card keeps its picture; 39 pictures were added the same day for the words the topic
questions and their trees offer (drinks, food, rest, TV and music, going out, time of day). The line drawings of
9–10 Nov 2026 (the pre-period prototype, `DISCLOSURE.md`) are no longer in the app; their rows below say when each
picture was first drawn.

What is checked: `tests/unit/day3.test.ts` checks that this table lists exactly the ids the code bundles, that each row
carries a date and the licence, and that only the way out uses a dashed stroke; `tests/unit/pictures.test.ts` checks
the style (the same outline on every picture, real colours written into the drawing, no outside image, no text) and
the contrast of the outline on the white card (12.6:1; the person's card is white in the light and in the dark
theme, and the topic tiles show their picture on a white plate). A sheet of all of them as the card shows them, at
390 px: `devlog/evidence_pictures/pictures_390.png` (`python3 scripts/picture-sheet.py`).

Not checked: colour-vision changes after a stroke, and the cultural fit of the food pictures (tea, a sandwich, a
roast). The figures use one neutral head colour and differ by one attribute each (a role is never a stereotype).

| id | shows | drawn | licence |
|---|---|---|---|
| yes | white tick on a green disc | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| no | white cross on a red disc | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| not sure | question mark on an amber disc | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| something else | dashed pale frame with three grey dots (the only dashed shape) | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| someone else | grey figure with a question mark on an amber disc | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| somewhere else | red map pin with a question mark | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| good | green face, smile | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| okay | yellow face, flat mouth | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| bad | red-pink face, frown | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| tasty | blue bowl of orange soup with steam | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| plain | empty white plate | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| too salty | glass salt shaker with a steel top | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| good idea | yellow light bulb | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| leave it | open hand, palm out | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| like them | figure in blue with a red heart beside | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| unhappy | figure in grey with a small sad face beside | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| this one | green card on the left, an arrow to it | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| that one | green card on the right, an arrow to it | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| a little | one blue bar of four | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| some | two blue bars of four | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| a lot | four blue bars of four | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| listen | ear with blue sound arcs | 18 Nov 2026 (colour; first drawn 11 Nov 2026 as a line drawing) | Apache-2.0 |
| tea | white cup of tea on a saucer, tea-bag tag | 18 Nov 2026 (colour; first drawn 11 Nov 2026 as a line drawing) | Apache-2.0 |
| coffee | red mug of coffee with steam | 18 Nov 2026 (colour; first drawn 11 Nov 2026 as a line drawing) | Apache-2.0 |
| change | two arrows in a loop, blue and green | 18 Nov 2026 (colour; first drawn 11 Nov 2026 as a line drawing) | Apache-2.0 |
| wait | clock with a navy rim | 18 Nov 2026 (colour; first drawn 11 Nov 2026 as a line drawing) | Apache-2.0 |
| stop | red octagon with a white bar | 18 Nov 2026 (colour; first drawn 11 Nov 2026 as a line drawing) | Apache-2.0 |
| write it | yellow pencil over a blue line | 18 Nov 2026 (colour; first drawn 11 Nov 2026 as a line drawing) | Apache-2.0 |
| more | white plus on a green disc | 18 Nov 2026 (colour; first drawn 11 Nov 2026 as a line drawing) | Apache-2.0 |
| show me | a hand pointing at a small blue object | 18 Nov 2026 (colour; first drawn 11 Nov 2026 as a line drawing) | Apache-2.0 |
| draw | yellow pencil leaving a violet wavy line | 18 Nov 2026 (colour; first drawn 11 Nov 2026 as a line drawing) | Apache-2.0 |
| later | clock with an orange arrow coming back round | 18 Nov 2026 (colour; first drawn 11 Nov 2026 as a line drawing) | Apache-2.0 |
| change topic | two speech bubbles, grey then blue | 18 Nov 2026 (colour; first drawn 11 Nov 2026 as a line drawing) | Apache-2.0 |
| tired | pale blue face, closed eyes, small Zs | 18 Nov 2026 (colour; first drawn 11 Nov 2026 as a line drawing) | Apache-2.0 |
| worried | pale orange face, raised brows, wavy mouth | 18 Nov 2026 (colour; first drawn 11 Nov 2026 as a line drawing) | Apache-2.0 |
| pain | red lightning bolt | 18 Nov 2026 (colour; first drawn 11 Nov 2026 as a line drawing) | Apache-2.0 |
| spouse | two figures and a gold ring (wife, husband, partner) | 18 Nov 2026 (colour; first drawn 11 Nov 2026 as a line drawing) | Apache-2.0 |
| child | adult and a shorter adult (son, daughter) | 18 Nov 2026 (colour; first drawn 11 Nov 2026 as a line drawing) | Apache-2.0 |
| sibling | two figures side by side (sister, brother) | 18 Nov 2026 (colour; first drawn 11 Nov 2026 as a line drawing) | Apache-2.0 |
| grandchild | adult and a small child | 18 Nov 2026 (colour; first drawn 11 Nov 2026 as a line drawing) | Apache-2.0 |
| friend | two figures, one waving | 18 Nov 2026 (colour; first drawn 11 Nov 2026 as a line drawing) | Apache-2.0 |
| neighbour | figure beside a house | 18 Nov 2026 (colour; first drawn 11 Nov 2026 as a line drawing) | Apache-2.0 |
| carer | figure in green with a white heart on the chest | 18 Nov 2026 (colour; first drawn 11 Nov 2026 as a line drawing) | Apache-2.0 |
| nurse | figure in light blue with a red cross on the chest | 18 Nov 2026 (colour; first drawn 11 Nov 2026 as a line drawing) | Apache-2.0 |
| doctor | figure in a white coat with a stethoscope | 18 Nov 2026 (colour; first drawn 11 Nov 2026 as a line drawing) | Apache-2.0 |
| speech therapist | figure with a speech bubble | 18 Nov 2026 (colour; first drawn 11 Nov 2026 as a line drawing) | Apache-2.0 |
| physio | figure with a raised arm and a dumbbell | 18 Nov 2026 (colour; first drawn 11 Nov 2026 as a line drawing) | Apache-2.0 |
| priest | figure in black with a white collar (priest, minister, vicar) | 18 Nov 2026 (colour; first drawn 11 Nov 2026 as a line drawing) | Apache-2.0 |
| family | three figures | 18 Nov 2026 (colour; first drawn 11 Nov 2026 as a line drawing) | Apache-2.0 |
| visitor | figure in a door frame | 18 Nov 2026 (colour; first drawn 11 Nov 2026 as a line drawing) | Apache-2.0 |
| toilet | white toilet from the side: cistern, bowl, foot | 18 Nov 2026 (colour; first drawn 17 Nov 2026 as a line drawing) | Apache-2.0 |
| drink | glass of water with a red straw | 18 Nov 2026 (colour; first drawn 17 Nov 2026 as a line drawing) | Apache-2.0 |
| food | plate of food between a fork and a knife | 18 Nov 2026 (colour; first drawn 17 Nov 2026 as a line drawing) | Apache-2.0 |
| too hot | thermometer, full and red, with a sun | 18 Nov 2026 (colour; first drawn 17 Nov 2026 as a line drawing) | Apache-2.0 |
| too cold | thermometer, low and blue, with a snowflake | 18 Nov 2026 (colour; first drawn 17 Nov 2026 as a line drawing) | Apache-2.0 |
| call someone | green telephone handset with two blue sound arcs | 18 Nov 2026 (colour; first drawn 17 Nov 2026 as a line drawing) | Apache-2.0 |
| body:head | body figure (light blue top, navy legs), head in red | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| body:face | body figure (light blue top, navy legs), face in red | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| body:eyes | body figure (light blue top, navy legs), eyes in red | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| body:mouth | body figure (light blue top, navy legs), mouth in red | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| body:top of head | body figure (light blue top, navy legs), top of head in red | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| body:ears | body figure (light blue top, navy legs), ears in red | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| body:neck | body figure (light blue top, navy legs), neck in red | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| body:left side | body figure (light blue top, navy legs), the person's left side of the chest in red | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| body:right side | body figure (light blue top, navy legs), the person's right side of the chest in red | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| body:middle | body figure (light blue top, navy legs), middle of the chest in red | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| body:upper stomach | body figure (light blue top, navy legs), upper stomach in red | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| body:lower stomach | body figure (light blue top, navy legs), lower stomach in red | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| body:chest | body figure (light blue top, navy legs), chest in red | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| body:stomach | body figure (light blue top, navy legs), stomach in red | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| body:back | body figure (light blue top, navy legs), back (shown through) in red | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| body:upper back | body figure (light blue top, navy legs), upper back in red | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| body:lower back | body figure (light blue top, navy legs), lower back in red | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| body:arms | body figure (light blue top, navy legs), both arms in red | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| body:legs | body figure (light blue top, navy legs), both legs in red | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| body:hands | body figure (light blue top, navy legs), hands in red | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| body:feet | body figure (light blue top, navy legs), feet in red | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| body:left arm | body figure (light blue top, navy legs), the person's left arm (viewer's right) in red | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| body:right arm | body figure (light blue top, navy legs), the person's right arm (viewer's left) in red | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| body:left leg | body figure (light blue top, navy legs), the person's left leg (viewer's right) in red | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| body:right leg | body figure (light blue top, navy legs), the person's right leg (viewer's left) in red | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |
| water | glass of water | 18 Nov 2026 | Apache-2.0 |
| juice | glass of orange juice with an orange slice | 18 Nov 2026 | Apache-2.0 |
| milk | bottle of milk with a blue cap | 18 Nov 2026 | Apache-2.0 |
| hot drink | orange mug with steam | 18 Nov 2026 | Apache-2.0 |
| cold drink | glass with ice cubes and a blue straw | 18 Nov 2026 | Apache-2.0 |
| snack | two biscuits in a blue bowl | 18 Nov 2026 | Apache-2.0 |
| meal | plate with meat and vegetables, steam | 18 Nov 2026 | Apache-2.0 |
| something sweet | slice of cake with pink icing and a cherry | 18 Nov 2026 | Apache-2.0 |
| something savoury | sandwich cut in a triangle | 18 Nov 2026 | Apache-2.0 |
| hot meal | white bowl of stew with steam | 18 Nov 2026 | Apache-2.0 |
| cold meal | plate with a sandwich | 18 Nov 2026 | Apache-2.0 |
| bed | bed with a blue cover and a white pillow | 18 Nov 2026 | Apache-2.0 |
| chair | green armchair | 18 Nov 2026 | Apache-2.0 |
| tv | television showing a landscape | 18 Nov 2026 | Apache-2.0 |
| music | two notes, violet and blue | 18 Nov 2026 | Apache-2.0 |
| news | newspaper front page | 18 Nov 2026 | Apache-2.0 |
| film | clapperboard with a play sign | 18 Nov 2026 | Apache-2.0 |
| radio | wooden radio with an aerial | 18 Nov 2026 | Apache-2.0 |
| paper | open newspaper | 18 Nov 2026 | Apache-2.0 |
| photos | two photo prints of a landscape | 18 Nov 2026 | Apache-2.0 |
| now | clock with a green tick | 18 Nov 2026 | Apache-2.0 |
| morning | sun rising over a line, an arrow up | 18 Nov 2026 | Apache-2.0 |
| afternoon | sun high over a line | 18 Nov 2026 | Apache-2.0 |
| stay in | house with two windows | 18 Nov 2026 | Apache-2.0 |
| go out | open door with a green arrow out | 18 Nov 2026 | Apache-2.0 |
| open | window with red curtains drawn back | 18 Nov 2026 | Apache-2.0 |
| closed | red curtains closed | 18 Nov 2026 | Apache-2.0 |
| glasses | pair of glasses | 18 Nov 2026 | Apache-2.0 |
| hearing aid | ear with a hearing aid behind it | 18 Nov 2026 | Apache-2.0 |
| company | two figures with a small heart | 18 Nov 2026 | Apache-2.0 |
| time alone | one figure in a violet armchair | 18 Nov 2026 | Apache-2.0 |
| walk | figure walking on grass | 18 Nov 2026 | Apache-2.0 |
| garden | red flower with green leaves | 18 Nov 2026 | Apache-2.0 |
| drive | blue car | 18 Nov 2026 | Apache-2.0 |
| wash | basin of water with bubbles and a tap | 18 Nov 2026 | Apache-2.0 |
| exercises | dumbbell | 18 Nov 2026 | Apache-2.0 |
| quiet | loudspeaker with a red cross | 18 Nov 2026 | Apache-2.0 |
| just right | thermometer, green, with a green tick | 18 Nov 2026 | Apache-2.0 |
| plans | calendar page with one day marked | 18 Nov 2026 | Apache-2.0 |
| monogram | a named person's initial in a soft circle (letters allowed only here) | 18 Nov 2026 (colour; first drawn 9–10 Nov 2026 as a line drawing) | Apache-2.0 |

Also in `web/src/pictos.ts`, and not choice pictures: `MIC` and `MIC_STOP` (the microphone on the partner's "speak your
question" button, drawn 17 Nov 2026) and `TICK` / `CROSS` (the check of the full view), line signs in the theme's own
colour, Apache-2.0. They are controls on the partner's side and are never on a card. The small line signs of the simple
view's controls (`SIGN` in `web/src/simple.ts`: back, home, lock, cloud, the four steps) are ours too, same licence.

Personal photos are not part of this table: a family's own photos are added in About them, stay on that device, and
are never bundled (README, "Personal photos").

Still word-only (no picture drawn): places and shops, particular dishes, the family's own entries without a photo.
Those labels show as word-only tiles, never an empty frame.
