# Phase 17, letter by letter: rules / Gemini Nano on this computer / online (dev server, App Check debug provider)

- date: 2026-11-24; commit `febbc8a` (clean working copy for the app code); set `eval/phase17_letters.json` (10 cases, labelled before the first run)
- how: the app's own `letterCard` (core/letter.ts) and `FirebaseEngine` (web/src/ai/firebaseEngine.ts), loaded from the Vite dev server into a headless Chrome 157 that has Gemini Nano, the sample family's About them; legs: rules (no model), ONLY_ON_DEVICE (Nano, nothing sent), PREFER_IN_CLOUD after a yes (names swapped). Not a test with people; our labels; one run per leg.
- a hit: the meant word is one of the three words on the card ('also' = the other spelling, US or UK, added after run 1).

| On the 10 cases | Rules alone | Gemini Nano, `ONLY_ON_DEVICE` | Online, `PREFER_IN_CLOUD` |
|---|---|---|---|
| the meant word on the card | 5/10 | 4/10 | 5/10 |
| the same, other spelling counted | 5/10 | 4/10 | 6/10 |
| a card with at least one word | 7/10 | 8/10 | 10/10 |
| words added by an AI (`by` device / cloud) | 0/10 | 5/10 | 10/10 |
| median time | 0 ms | 3781 ms | 1236 ms |

## Every case

| # | letters | meant | rules | Nano | online |
|---|---|---|---|---|---|
| 1 | PI | pizza | pie, pizza **hit** | pie, pizza **hit** | pie, pita, pizza **hit** |
| 2 | LA | lasagne | lamb | lamb | lamb, lamb chop, lasagna hit (spelling) |
| 3 | SH | shepherd's pie | (none) | (none) | shellfish, shortbread, sherbet |
| 4 | TR | trifle | (none) | treat | tray bake, treat |
| 5 | LEM | lemonade | lemonade **hit** | lemonade, lemon tea **hit** | lemonade, lemon tea, lemon water **hit** |
| 6 | GI | ginger ale | ginger biscuits | ginger biscuits | ginger biscuits, ginger tea |
| 7 | LI | library | library **hit** | library **hit** | library, living room **hit** |
| 8 | SU | supermarket | (none) | (none) | supermarket, subway, suburb **hit** |
| 9 | NE | neighbour | neighbour **hit** | neighbour **hit** | neighbour, nephew, neighbor **hit** |
| 10 | GRA | granddaughter | grandchild, grandson, granddaughter **hit** | grandchild, grandma, grandson | grandchild, grandma, grandson |
