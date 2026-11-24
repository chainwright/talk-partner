#!/usr/bin/env python3
"""Phase 17b (24 Nov 2026, the owner's rule: "this principle works for ANY topic"): no dead end, in every topic.

A hidden-target walk per topic, as a carer and the person would do it on a phone (390 x 844 and 360 x 740), against a
production build: a target that is NOT on the first card ("pancakes" after "a snack or a meal?", "Tyler" after
"company, or some time alone?", "piano" after "the news or a film?" ...), driven question -> "something else" -> the
first letter -> "Add the next letter" until the target is on the person's screen; it is picked and confirmed, and the
carer's screen says what to do with it. Every word on every letter card must belong to the topic. Then the typed path
("Ask in your own words": "Would you like something?" -> yes -> "Is it about food or drink, people, or plans?" -> each
topic) down to the end, where an answer that names a kind of thing shows "Which one? Find out together:" with more
choices, the first letter and show-or-write, each of those ways followed. Each walk is left with Back one step at a time
to the first screen. The family's About them is the sample family's (put on the device before the walk).

Phase 18 (judge round 13): six more hidden targets (pancit, church, a hot water bottle, stew, the garden centre,
snooker), walked letter by letter until the rules have no word, then the ways of a letter card with no word in their
order, the AI's sheet and its refusal, and "Write it down together" to the target (`target18`).

Usage: python3 scripts/phase17b-walk.py [--url URL] [OUT_DIR]   (default http://localhost:5179/, devlog/evidence_phase17b/walk)
Exit code 0 when every check passes, 1 otherwise. Prints one line per topic: reached or DEAD END.
"""
import importlib.util
import json
import os
import sys

from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('e2e', os.path.join(HERE, 'e2e-simple.py'))
e2e = importlib.util.module_from_spec(spec)
spec.loader.exec_module(e2e)

ARGS = sys.argv[1:]
URL = 'http://localhost:5179/'
if '--url' in ARGS:
    i = ARGS.index('--url'); URL = ARGS[i + 1]; del ARGS[i:i + 2]
URL = URL if URL.endswith('/') else URL + '/'
OUT = ARGS[0] if ARGS else 'devlog/evidence_phase17b/walk'
os.makedirs(OUT, exist_ok=True)
res = []
report = []

FAMILY = {'personName': 'Frank', 'partnerName': 'Carol',
          'people': [{'id': 's1', 'name': 'Carol', 'relation': 'wife', 'household': True}, {'id': 's2', 'name': 'Jenny', 'relation': 'daughter', 'household': False, 'nickname': 'Jen'}, {'id': 's3', 'name': 'Tyler', 'relation': 'grandson', 'household': False}, {'id': 's4', 'name': 'Beth', 'relation': 'sister', 'household': False}],
          'foods': ['pot roast', 'chili', 'ginger biscuits'], 'places': ['the lake', 'church', 'hardware store'], 'tv': ['Wheel of Fortune', 'Packers games'], 'music': ['Johnny Cash'], 'other': ['Bo (dog)']}

# what each topic may show on a letter card: its own words (core/letter.ts, TOPIC_WORDS) and the family's of that topic
# (phase 18b: read from the source, so the walk checks the lists the app ships, however long they are)
import re as _re
with open(os.path.join(HERE, '..', 'core', 'letter.ts'), encoding='utf8') as _f:
    _block = _f.read().split('export const TOPIC_WORDS')[1].split('};')[0]
TOPIC = {m.group(1): [a or b for a, b in _re.findall(r"'([^']*)'|\"([^\"]*)\"", m.group(2))] for m in _re.finditer(r'^\s+(\w+): \[(.*)\],$', _block, _re.M)}
FOOD = TOPIC['food'] + ['pot roast', 'chili', 'ginger biscuits']
DRINK = TOPIC['drink']
ALLOWED = {
    'food': FOOD + DRINK,
    'drink': FOOD + DRINK,
    'people': TOPIC['people'] + ['jen', 'jenny', 'tyler', 'beth', 'carol'],
    'plans': TOPIC['plans'] + ['lake', 'hardware store'],
    'fun': TOPIC['fun'] + ['wheel of fortune', 'packers games', 'johnny cash'],
    'rest': TOPIC['rest'],
    'body': TOPIC['body'],
    'feel': TOPIC['feel'],
}
ALLOWED = {k: [w.lower() for w in v] for k, v in ALLOWED.items()}


def check(name, ok, detail=''):
    res.append(bool(ok)); print(('PASS  ' if ok else 'FAIL  ') + name + ('' if ok else f'  ({detail})'))


def noscroll(page):
    return page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')


def shot(page, tag, name):
    page.wait_for_timeout(400)
    page.screenshot(path=os.path.join(OUT, f'{tag}_{name}.png'))


def bare(w):
    w = w.strip().lower()
    for a in ('the ', 'a ', 'an ', 'my ', 'your '):
        if w.startswith(a):
            return w[len(a):]
    return w


def home(page):
    page.goto(URL); page.wait_for_selector('main.simple.home'); page.wait_for_timeout(500)


def tiles(page):
    """The words on the person's screen, the way out left out (a person with no photo has a monogram letter above the name)."""
    return [x.strip().split('\n')[-1].strip() for x in page.locator('main.pv .pt:not(.esc)').all_inner_texts()]


def person_pick(page, label):
    page.locator('main.pv .pt', has_text=label).first.click()
    page.wait_for_selector('[data-confirm=yes]')
    page.locator('[data-confirm=yes]').click()
    page.wait_for_selector('.p-give')


def give(page):
    page.locator('.p-give').click(); page.wait_for_timeout(450)


def show(page):
    page.locator('[data-act=show]').click(); page.wait_for_selector('main.pv .pt')


def answer(page, label):
    show(page); person_pick(page, label); give(page); page.wait_for_selector('main.simple.s-answered')


def leave(page, tag, what, most=16):
    seen = []
    steps = 0
    while page.locator('main.simple.home').count() == 0 and steps < most:
        if page.locator('main.pv').count():
            page.go_back()
        else:
            b = page.locator('#s-top [data-act=back]')
            if not b.count():
                break
            b.first.click()
        page.wait_for_timeout(350); steps += 1
        seen.append(page.evaluate("document.querySelector('main')?.dataset.screen || ''"))
    check(f'{tag}: {what}: Back one step at a time to the first screen ({steps} steps: {" > ".join(seen)})', page.locator('main.simple.home').count() == 1 and 'nocard' not in seen and noscroll(page), ' > '.join(seen))


def letters_to(page, tag, topic, target):
    """On the carer's screen after "something else" (or under "Which one?"): the first letter, then the next, until the target shows."""
    page.locator('#letter-go').first.click(); page.wait_for_selector('main.pv.letters #abc')
    word = target[4:] if target.lower().startswith('the ') else target
    cards = []
    for n in range(1, 7):
        page.locator(f'[data-letter={word[n - 1].upper()}]').click(); page.wait_for_selector('main.pv .pt')
        ws = tiles(page)
        cards.append(ws)
        off = [w for w in ws if bare(w.split(' (')[0]) not in ALLOWED[topic] and bare(w) not in ALLOWED[topic]]
        check(f'{tag}: {topic}, {word[:n].upper()}: every word is of the topic ({", ".join(ws)})', not off, str(off))
        if any(bare(w) == bare(target) for w in ws):
            person_pick(page, word if not target.lower().startswith('the ') else target); give(page); page.wait_for_selector('main.simple.s-answered')
            return word[:n].upper(), cards
        person_pick(page, 'something else'); give(page); page.wait_for_selector('#letter-add')
        page.locator('#letter-add').click(); page.wait_for_selector('main.pv.letters #abc')
    return '', cards


def hidden(page, tag, topic, tq, qtext, target, way_out='something else', pre=()):
    home(page)
    page.locator(f'.topic[data-topic={tq}]').click()
    page.locator('.tq', has_text=qtext).first.click(); page.wait_for_selector('main.simple.card')
    # (yes first, then the tree's next question: "Are you hungry?" yes, "Next: Would you like a snack or a meal?")
    for label in pre:
        answer(page, label)
        page.locator('#next-q').click(); page.wait_for_selector('main.simple.card')
    show(page)
    first = tiles(page)
    check(f'{tag}: {topic}: the target "{target}" is not on the first card ({", ".join(first)})', bare(target) not in [bare(w) for w in first], str(first))
    person_pick(page, way_out); give(page); page.wait_for_selector('#letter-go')
    got, cards = letters_to(page, tag, topic, target)
    t = e2e.text(page)
    ok = bool(got) and target.lower() in t.lower() and (page.locator('#do-now').count() + page.locator('#next-q').count()) >= 1
    check(f'{tag}: {topic}: "{target}" reached with {got or "no letters"}, and the carer\'s screen says what to do with it', ok, t[:240])
    report.append(f'{tag} {topic:7s} target {target!r:20s} ' + (f'reached with {got}: ' + ' | '.join(', '.join(c) for c in cards) if ok else 'DEAD END: ' + json.dumps(cards)))
    shot(page, tag, f'{topic}_{bare(target).replace(" ", "_")}')
    leave(page, tag, f'{topic}, {target}')


def wait_any(page, sels, ms=30000):
    """The first of these selectors that shows (the person's card, the carer's ways, the sheet)."""
    page.wait_for_selector(', '.join(sels), timeout=ms); page.wait_for_timeout(250)
    for sel in sels:
        if page.locator(sel).count():
            return sel
    return ''


def ways_ids(page):
    return page.evaluate("[...document.querySelectorAll('#letter-ways .ways > li > .btn')].map((b) => b.id)")


def leave_any(page, tag, what, most=24):
    """Back one step at a time to the first screen; the screen of a letter with no word is a step of its own here."""
    seen = []
    steps = 0
    while page.locator('main.simple.home').count() == 0 and steps < most:
        if page.locator('main.pv').count():
            page.go_back()
        else:
            b = page.locator('#s-top [data-act=back]')
            if not b.count():
                break
            b.first.click()
        page.wait_for_timeout(350); steps += 1
        seen.append(page.evaluate("document.querySelector('main')?.dataset.screen || ''"))
    check(f'{tag}: {what}: Back one step at a time to the first screen ({steps} steps: {" > ".join(seen)})', page.locator('main.simple.home').count() == 1 and noscroll(page), ' > '.join(seen))


def target18(page, tag, topic, tq, qtext, target, pre=(), ai=True):
    """Phase 18 (judge round 13: six hidden targets ended on a letter card with no word). Letter by letter until the
    rules have no word; then the ways, in their order (the AI for the topic, write it, show me, another letter); the
    AI's sheet, "Just this once" (App Check is refused here: every other host is cut off), the refusal line with "Try
    Google's AI again" first; then "Write it down together", the word typed, the person checks it, the carer's screen
    says what to do with it. Back one step at a time to the first screen."""
    home(page)
    page.locator(f'.topic[data-topic={tq}]').click()
    page.locator('.tq', has_text=qtext).first.click(); page.wait_for_selector('main.simple.card')
    for label in pre:
        answer(page, label)
        page.locator('#next-q').click(); page.wait_for_selector('main.simple.card')
    show(page)
    person_pick(page, 'something else'); give(page); page.wait_for_selector('#letter-go')
    page.locator('#letter-go').first.click(); page.wait_for_selector('main.pv.letters #abc')
    word = target.replace(' ', '')
    reached = ''
    nocard = False
    for n in range(1, 6):
        page.locator(f'[data-letter={word[n - 1].upper()}]').click()
        got = wait_any(page, ['main.pv .pt', '#sheet', '#letter-ways'])
        if got == 'main.pv .pt':
            ws = tiles(page)
            if any(bare(w) == bare(target) for w in ws):
                person_pick(page, target); give(page); page.wait_for_selector('main.simple.s-answered'); reached = word[:n].upper()
                break
            person_pick(page, 'something else'); give(page); page.wait_for_selector('#letter-add')
            page.locator('#letter-add').click(); page.wait_for_selector('main.pv.letters #abc')
            continue
        nocard = True
        letters = word[:n].upper()
        break
    if reached:
        check(f'{tag}: phase 18, {topic}: "{target}" reached by the rules\' letters ({reached})', target.lower() in e2e.text(page).lower(), e2e.text(page)[:200])
        report.append(f'{tag} p18 {topic:7s} target {target!r:20s} reached with {reached} (rules)')
        shot(page, tag, f'p18_{bare(target).replace(" ", "_")}')
        leave_any(page, tag, f'phase 18, {target}')
        return
    check(f'{tag}: phase 18, {topic}: the letters {letters} have no word in the rules: the carer\'s screen, never the person\'s', nocard, e2e.text(page)[:200])
    if page.locator('#sheet').count():
        check(f'{tag}: phase 18, {letters}: the sheet asks first, with the exact text', 'Just this once' in e2e.text(page, '#sheet'), e2e.text(page, '#sheet')[:200])
        page.locator('#sheet [data-act=sheet-no]').click(); page.wait_for_selector('#letter-ways')
    t = e2e.text(page)
    ids = ways_ids(page)
    want = (['letter-ai'] if ai else []) + ['letter-write', 'letter-show', 'letter-go']
    check(f'{tag}: phase 18, {letters}: never "Nothing else was tried"; the line says what happened; the ways in order ({ids})', 'Nothing else was tried' not in t and ids == want and ('You kept it on this phone.' in t or not ai), t[:300])
    shot(page, tag, f'p18_{bare(target).replace(" ", "_")}_ways')
    if ai:
        page.locator('#letter-ai').click(); page.wait_for_selector('#sheet')
        page.locator('#sheet [data-act=sheet-yes]').click()
        page.wait_for_selector('#letter-ways', timeout=40000); page.wait_for_timeout(500)
        t = e2e.text(page)
        ids = ways_ids(page)
        check(f'{tag}: phase 18, {letters}: after "Just this once" with App Check refused, no sheet by itself, the refusal line and "Try Google\'s AI again" first ({ids})', page.locator('#sheet').count() == 0 and 'Google could not check this browser, so nothing was sent.' in t and ids[:2] == ['letter-again', 'letter-write'], t[:300])
        shot(page, tag, f'p18_{bare(target).replace(" ", "_")}_refused')
    # "Write it down together": the word they wrote goes to the person's screen, to be checked
    page.locator('#letter-write').click(); page.wait_for_selector('#understood-word')
    page.fill('#understood-word', target); page.locator('#understood-go').click()
    page.wait_for_selector('main.pv .pt')
    ws = tiles(page)
    check(f'{tag}: phase 18, "{target}": written down, it is on the person\'s screen to check ({", ".join(ws)})', any(bare(w) == bare(target) for w in ws), str(ws))
    person_pick(page, target); give(page); page.wait_for_selector('main.simple.s-answered')
    t = e2e.text(page)
    ok = target.lower() in t.lower() and (page.locator('#do-now').count() + page.locator('#next-q').count() + page.locator('#another').count()) >= 1
    check(f'{tag}: phase 18, {topic}: "{target}" reached by "Write it down together" after {letters}, and the carer\'s screen says what to do with it', ok, t[:240])
    report.append(f'{tag} p18 {topic:7s} target {target!r:20s} ' + (f'reached: no word at {letters}, ways shown, then written down' if ok else 'DEAD END'))
    shot(page, tag, f'p18_{bare(target).replace(" ", "_")}')
    leave_any(page, tag, f'phase 18, {target}')


def own_yes(page):
    home(page)
    page.fill('#q', 'Would you like something?'); page.locator('#make').click()
    page.wait_for_selector('main.simple.card'); page.wait_for_timeout(300)
    answer(page, 'yes')
    check('typed "Would you like something?" yes: "Next: Is it about food or drink, people, or plans?"', e2e.text(page, '#next-q') == 'Next: Is it about food or drink, people, or plans?', e2e.text(page)[:200])
    page.locator('#next-q').click(); page.wait_for_selector('main.simple.card')


def typed(page, tag):
    # ---- food: yes -> about food or drink -> Are you hungry? -> yes: the depth is reached, the ways to find which one
    own_yes(page)
    answer(page, 'about food or drink')
    check(f'{tag}: typed, "about food or drink": "Next: Are you hungry?"', e2e.text(page, '#next-q') == 'Next: Are you hungry?', e2e.text(page)[:200])
    page.locator('#next-q').click(); page.wait_for_selector('main.simple.card')
    answer(page, 'yes')
    t = e2e.text(page)
    ways = page.evaluate("[...document.querySelectorAll('#open-ways .ways > li > .btn')].map((b) => b.id)")
    check(f'{tag}: typed > food > hungry > yes: "Bring Frank something to eat." and "Which one? Find out together:" with more choices, the first letter, show or write ({ways})', 'Bring Frank something to eat.' in t and 'Which one? Find out together:' in t and ways == ['way-more', 'letter-go', 'show-write'] and 'primary' not in (page.locator('#another').get_attribute('class') or ''), t[:300])
    shot(page, tag, 'typed_food_ways')
    # the way "More choices like these": food, never "yes" or "no" as a choice
    page.locator('#way-more').click(); page.wait_for_selector('main.simple.card'); show(page)
    mw = tiles(page)
    check(f'{tag}: typed > food: "More choices like these" gives food ({", ".join(mw)})', mw and all(w.lower() not in ('yes', 'no') for w in mw) and any(w in ('something sweet', 'something savoury', 'a hot meal') for w in mw), str(mw))
    page.go_back(); page.wait_for_timeout(350)
    page.locator('#s-top [data-act=back]').first.click(); page.wait_for_timeout(400)
    check(f'{tag}: Back from more choices: the screen with the ways again', page.locator('#open-ways').count() == 1, e2e.text(page)[:200])
    # the way "show or write it": the repair card
    page.locator('#show-write').click(); page.wait_for_timeout(500)
    check(f'{tag}: typed > food: "show or write it" opens the person\'s show-me card', page.locator('main.simple.card, main.pv').count() >= 1 and page.locator('#open-ways').count() == 0, e2e.text(page)[:200])
    page.locator('#s-top [data-act=back]').first.click() if page.locator('#s-top [data-act=back]').count() else page.go_back()
    page.wait_for_timeout(400)
    if page.locator('#open-ways').count() == 0 and page.locator('[data-act=unstuck]').count():
        page.locator('[data-act=unstuck]').first.click(); page.wait_for_timeout(300)
    # the way "the first letter": inside food, to a hidden target
    if page.locator('#open-ways').count() == 0:
        page.locator('#s-top [data-act=back]').first.click(); page.wait_for_timeout(400)
    check(f'{tag}: back on the ways after "show or write it"', page.locator('#open-ways').count() == 1, e2e.text(page)[:200])
    got, cards = letters_to(page, tag, 'food', 'pancakes')
    ok = bool(got) and 'pancakes' in e2e.text(page).lower()
    check(f'{tag}: typed > food > hungry > yes > the first letter: "pancakes" reached with {got}', ok, json.dumps(cards))
    report.append(f'{tag} typed>food target \'pancakes\' ' + (f'reached with {got}' if ok else 'DEAD END'))
    leave(page, tag, 'typed, food, pancakes')
    # ---- plans: yes -> plans -> stay in or go out? -> go out: the ways; the first letter inside places
    own_yes(page)
    answer(page, 'plans')
    page.locator('#next-q').click(); page.wait_for_selector('main.simple.card')
    answer(page, 'go out')
    t = e2e.text(page)
    check(f'{tag}: typed > plans > go out: an action line and the ways to find where', 'Which one? Find out together:' in t and page.locator('#open-ways #letter-go').count() == 1, t[:300])
    shot(page, tag, 'typed_plans_ways')
    got, cards = letters_to(page, tag, 'plans', 'hardware store')
    ok = bool(got) and 'hardware store' in e2e.text(page).lower()
    check(f'{tag}: typed > plans > go out > the first letter: "hardware store" reached with {got}, and "Next: Would you like to go to hardware store?"', ok and 'go to hardware store' in e2e.text(page), e2e.text(page)[:240])
    report.append(f'{tag} typed>plans target \'hardware store\' ' + (f'reached with {got}' if ok else 'DEAD END'))
    leave(page, tag, 'typed, plans')
    # ---- people: yes -> people -> company, or some time alone? -> company: an action line
    own_yes(page)
    answer(page, 'people')
    page.locator('#next-q').click(); page.wait_for_selector('main.simple.card')
    answer(page, 'company')
    t = e2e.text(page)
    check(f'{tag}: typed > people > company: an action line ("Stay with Frank, or ask someone to come.")', 'Stay with Frank, or ask someone to come.' in t, t[:240])
    report.append(f'{tag} typed>people company: ' + ('action line' if 'Stay with Frank' in t else 'DEAD END'))
    leave(page, tag, 'typed, people')


def walk(b, w, h):
    tag = f'{w}'
    ctx = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2, is_mobile=True, has_touch=True, user_agent=e2e.PHONE_UA, service_workers='block', locale='en-US')
    outside = []
    ctx.route('**/*', lambda r: (outside.append(r.request.url), r.abort()) if not r.request.url.startswith(URL) else r.continue_())
    page = ctx.new_page(); errs = []
    page.on('pageerror', lambda e: errs.append(str(e)))
    page.goto(URL); page.wait_for_selector('main.simple.home')
    page.evaluate(e2e.KV_PUT, {'settings': {'cloudHelp': False, 'support': 'more', 'welcomed': True, 'firstCard': True, 'howFolded': True}, 'profile': FAMILY})
    hidden(page, tag, 'food', 'food', 'Are you hungry', 'pancakes', pre=('yes',))
    hidden(page, tag, 'drink', 'food', 'water, juice or milk', 'lemonade')
    hidden(page, tag, 'people', 'people', 'company, or some time alone', 'Tyler')
    hidden(page, tag, 'plans', 'plans', 'stay in or go out', 'library')
    hidden(page, tag, 'fun', 'fun', 'the news or a film', 'piano')
    hidden(page, tag, 'rest', 'rest', 'the bed or the chair', 'sofa')
    hidden(page, tag, 'feel', 'feel', 'Is something bothering you', 'scared', way_out='not sure')
    hidden(page, tag, 'body', 'body', 'glasses or your hearing aid', 'shower')
    typed(page, tag)
    # (phase 18, judge round 13: the six hidden targets that ended on a letter card with no word)
    target18(page, tag, 'food', 'food', 'Are you hungry', 'pancit', pre=('yes',))
    target18(page, tag, 'plans', 'plans', 'stay in or go out', 'church')
    target18(page, tag, 'body', 'body', 'glasses or your hearing aid', 'hot water bottle', ai=False)
    target18(page, tag, 'food', 'food', 'Are you hungry', 'stew', pre=('yes',))
    target18(page, tag, 'plans', 'plans', 'stay in or go out', 'garden centre')
    target18(page, tag, 'fun', 'fun', 'the news or a film', 'snooker')
    # (the own-words field starts App Check when it gets the cursor, phase 17 B: only its reCAPTCHA is asked, and refused here)
    check(f'{tag}: no page error; only App Check\'s reCAPTCHA was asked of another host (and refused)', not errs and all('recaptcha' in u for u in outside), str(errs + outside[:4]))
    ctx.close()


with sync_playwright() as p:
    b = p.chromium.launch()
    for w, h in ((390, 844), (360, 740)):
        walk(b, w, h)
    b.close()
print('\n'.join(report))
print(f'{sum(res)} of {len(res)} checks passed'); sys.exit(0 if all(res) else 1)
