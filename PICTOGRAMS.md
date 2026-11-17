# Pictograms: provenance and licence

Every picture in the app is a hand-authored SVG line drawing in `web/src/pictos.ts` (96 × 96 grid, stroke 5, round caps,
`currentColor` plus one accent). None comes from a third-party set: no ParticiPics, no icon font, no clip art, no AI-generated
images. All are licensed under the repository licence, **Apache-2.0** (see `LICENSE`), by the Talk Partner team.

`tests/unit/day3.test.ts` checks that this table lists exactly the ids the code bundles, that each row carries a date and the
licence, and that only the escape icon uses a dashed stroke (build spec §3.2 rule 4).

Dates: rows marked 9–10 Nov 2026 were drawn for the pre-period prototype and are disclosed in `DISCLOSURE.md`; everything
else was drawn in the submission period.

| id | shows | drawn | licence |
|---|---|---|---|
| yes | tick | 9–10 Nov 2026 | Apache-2.0 |
| no | cross | 9–10 Nov 2026 | Apache-2.0 |
| not sure | question mark | 9–10 Nov 2026 | Apache-2.0 |
| something else | dashed frame with three dots (the only dashed shape) | 9–10 Nov 2026 | Apache-2.0 |
| someone else | figure with a question mark | 9–10 Nov 2026 | Apache-2.0 |
| somewhere else | map pin with a question mark | 9–10 Nov 2026 | Apache-2.0 |
| good | line face, smile | 9–10 Nov 2026 | Apache-2.0 |
| okay | line face, flat mouth | 9–10 Nov 2026 | Apache-2.0 |
| bad | line face, frown | 9–10 Nov 2026 | Apache-2.0 |
| tasty | bowl with steam | 9–10 Nov 2026 | Apache-2.0 |
| plain | empty plate | 9–10 Nov 2026 | Apache-2.0 |
| too salty | salt shaker | 9–10 Nov 2026 | Apache-2.0 |
| good idea | light bulb | 9–10 Nov 2026 | Apache-2.0 |
| leave it | open hand | 9–10 Nov 2026 | Apache-2.0 |
| like them | figure with a heart beside | 9–10 Nov 2026 | Apache-2.0 |
| unhappy | figure with a frown beside | 9–10 Nov 2026 | Apache-2.0 |
| this one | arrow to the left card | 9–10 Nov 2026 | Apache-2.0 |
| that one | arrow to the right card | 9–10 Nov 2026 | Apache-2.0 |
| a little | one bar of four | 9–10 Nov 2026 | Apache-2.0 |
| some | two bars of four | 9–10 Nov 2026 | Apache-2.0 |
| a lot | four bars of four | 9–10 Nov 2026 | Apache-2.0 |
| listen | ear | 11 Nov 2026 | Apache-2.0 |
| tea | cup with a tea bag | 11 Nov 2026 | Apache-2.0 |
| coffee | mug with steam | 11 Nov 2026 | Apache-2.0 |
| change | two arrows in a loop | 11 Nov 2026 | Apache-2.0 |
| wait | clock | 11 Nov 2026 | Apache-2.0 |
| stop | octagon with a bar | 11 Nov 2026 | Apache-2.0 |
| write it | pencil over a line | 11 Nov 2026 | Apache-2.0 |
| more | plus in a circle | 11 Nov 2026 | Apache-2.0 |
| show me | a hand pointing at a small object | 11 Nov 2026 | Apache-2.0 |
| draw | pencil leaving a wavy line | 11 Nov 2026 | Apache-2.0 |
| later | clock with an arrow coming back round | 11 Nov 2026 | Apache-2.0 |
| change topic | two speech bubbles, the second taking over | 11 Nov 2026 | Apache-2.0 |
| tired | line face, closed eyes | 11 Nov 2026 | Apache-2.0 |
| worried | line face, raised brows, wavy mouth | 11 Nov 2026 | Apache-2.0 |
| pain | lightning bolt | 11 Nov 2026 | Apache-2.0 |
| spouse | two figures and a ring (wife, husband, partner) | 11 Nov 2026 | Apache-2.0 |
| child | adult and a shorter adult (son, daughter) | 11 Nov 2026 | Apache-2.0 |
| sibling | two figures side by side (sister, brother) | 11 Nov 2026 | Apache-2.0 |
| grandchild | adult and a small child | 11 Nov 2026 | Apache-2.0 |
| friend | two figures, one waving | 11 Nov 2026 | Apache-2.0 |
| neighbour | figure beside a house | 11 Nov 2026 | Apache-2.0 |
| carer | figure with a heart on the chest | 11 Nov 2026 | Apache-2.0 |
| nurse | figure with a cross on the chest | 11 Nov 2026 | Apache-2.0 |
| doctor | figure with a stethoscope | 11 Nov 2026 | Apache-2.0 |
| speech therapist | figure with a speech bubble | 11 Nov 2026 | Apache-2.0 |
| physio | figure with a raised arm and a bar | 11 Nov 2026 | Apache-2.0 |
| priest | figure with a collar (priest, minister, vicar) | 11 Nov 2026 | Apache-2.0 |
| family | three figures | 11 Nov 2026 | Apache-2.0 |
| visitor | figure in a door frame | 11 Nov 2026 | Apache-2.0 |
| toilet | toilet seen from the side: cistern, bowl, foot | 17 Nov 2026 | Apache-2.0 |
| drink | glass of water with a straw | 17 Nov 2026 | Apache-2.0 |
| food | plate between a fork and a knife | 17 Nov 2026 | Apache-2.0 |
| too hot | thermometer, full, with a sun | 17 Nov 2026 | Apache-2.0 |
| too cold | thermometer, low, with a snowflake | 17 Nov 2026 | Apache-2.0 |
| call someone | telephone handset with two sound arcs | 17 Nov 2026 | Apache-2.0 |
| body:head | body figure, head highlighted | 9–10 Nov 2026 | Apache-2.0 |
| body:face | body figure, face highlighted | 9–10 Nov 2026 | Apache-2.0 |
| body:eyes | body figure, eyes highlighted | 9–10 Nov 2026 | Apache-2.0 |
| body:mouth | body figure, mouth highlighted | 9–10 Nov 2026 | Apache-2.0 |
| body:top of head | body figure, top of head highlighted | 9–10 Nov 2026 | Apache-2.0 |
| body:ears | body figure, ears highlighted | 9–10 Nov 2026 | Apache-2.0 |
| body:neck | body figure, neck highlighted | 9–10 Nov 2026 | Apache-2.0 |
| body:left side | body figure, the person's left side of the chest highlighted | 9–10 Nov 2026 | Apache-2.0 |
| body:right side | body figure, the person's right side of the chest highlighted | 9–10 Nov 2026 | Apache-2.0 |
| body:middle | body figure, middle of the chest highlighted | 9–10 Nov 2026 | Apache-2.0 |
| body:upper stomach | body figure, upper stomach highlighted | 9–10 Nov 2026 | Apache-2.0 |
| body:lower stomach | body figure, lower stomach highlighted | 9–10 Nov 2026 | Apache-2.0 |
| body:chest | body figure, chest highlighted | 9–10 Nov 2026 | Apache-2.0 |
| body:stomach | body figure, stomach highlighted | 9–10 Nov 2026 | Apache-2.0 |
| body:back | body figure, back (shown through) highlighted | 9–10 Nov 2026 | Apache-2.0 |
| body:upper back | body figure, upper back highlighted | 9–10 Nov 2026 | Apache-2.0 |
| body:lower back | body figure, lower back highlighted | 9–10 Nov 2026 | Apache-2.0 |
| body:arms | body figure, both arms highlighted | 9–10 Nov 2026 | Apache-2.0 |
| body:legs | body figure, both legs highlighted | 9–10 Nov 2026 | Apache-2.0 |
| body:hands | body figure, hands highlighted | 9–10 Nov 2026 | Apache-2.0 |
| body:feet | body figure, feet highlighted | 9–10 Nov 2026 | Apache-2.0 |
| body:left arm | body figure, the person's left arm (viewer's right) highlighted | 9–10 Nov 2026 | Apache-2.0 |
| body:right arm | body figure, the person's right arm (viewer's left) highlighted | 9–10 Nov 2026 | Apache-2.0 |
| body:left leg | body figure, the person's left leg (viewer's right) highlighted | 9–10 Nov 2026 | Apache-2.0 |
| body:right leg | body figure, the person's right leg (viewer's left) highlighted | 9–10 Nov 2026 | Apache-2.0 |
| monogram | a named person's initial in a soft circle (letters allowed only here) | 9–10 Nov 2026 | Apache-2.0 |

Not yet drawn (batch 2, planned): particular foods and drinks (beyond coffee, tea and the general "food" and "drink"
of the quick-needs board), places, activities, things, time words (§3.1). Until then those labels show as word-only
tiles, never an empty frame.
