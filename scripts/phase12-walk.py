#!/usr/bin/env python3
"""Phase 12 (22 Nov 2026, the fixes of judge round 9): every changed screen, walked as a carer would.

At 360 x 740 and 390 x 844, in the light and the dark theme, against a production build (npm run build && npx vite
preview): the first screen ("See the AI at work" above the fold with its two lines, the first row of topics above the
fold, "Try it with the Millers"); pain on the needs board ("Where does it hurt?" first, the call box with a number);
pain in an arm ("Is it suddenly weak or numb, yes or no?" next, a yes raises the call box); the pain scale as three
faces; the person's starters (the four squares, three faces); the feelings card's third page and "I can't go on" to
the safety screen; a pain question left for later (the signs, a call button, how long ago); the curtains and the
church; About them after three "no" to pain. Each is left with Back one step at a time to the first screen, and each
way out is followed to an action. Nothing may scroll sideways, no page error, nothing is asked of another host.

Phase 12b (judge round 9b) adds: the pain scale's three pictures (each loaded before it is checked) and "quite bad"
calling now; one "no" to the weakness question (check the arms and the smile); a confirmed yes ("Call 911 now. Note
the time it started."); "stop for now" beside "I can't go on"; "Try it with the Millers" on a phone (the simple view,
no download); the number in the first screen's red box with "Change it"; a pain question left for later right under
"Needs something now?" and on screen at 360 px; "Find more choices (online, after your yes)" as the second way after
"something else"; the new pictures for pain, wait and show me loaded; About them after three "no" to a drink.

Usage: python3 scripts/phase12-walk.py [--url URL] [OUT_DIR]   (default http://localhost:5179/, devlog/evidence_phase12/walk)
Exit code 0 when every check passes, 1 otherwise.
"""
import importlib.util
import json
import os
import sys
import time

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
OUT = ARGS[0] if ARGS else 'devlog/evidence_phase12/walk'
os.makedirs(OUT, exist_ok=True)
res = []


def check(name, ok, detail=''):
    res.append(bool(ok)); print(('PASS  ' if ok else 'FAIL  ') + name + ('' if ok else f'  ({detail})'))


def noscroll(page):
    return page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')


def shot(page, tag, name):
    page.wait_for_timeout(500)
    page.screenshot(path=os.path.join(OUT, f'{tag}_{name}.png'))


def home(page):
    page.goto(URL); page.wait_for_selector('main.simple.home'); page.wait_for_timeout(600)


def back_home(page, tag, what, most=9):
    steps = 0
    seen = []
    while page.locator('main.simple.home').count() == 0 and steps < most:
        # (a person's screen is a step too and has no Back button by design: there the phone's back is pressed, as e2e-simple.py does)
        if page.locator('main.pv').count():
            page.go_back()
        else:
            b = page.locator('#s-top [data-act=back]')
            if not b.count():
                break
            b.first.click()
        page.wait_for_timeout(350); steps += 1
        seen.append(page.evaluate("document.querySelector('main')?.dataset.screen || document.querySelector('main')?.className || ''"))
    check(f'{tag}: {what}: Back one step at a time reaches the first screen ({steps} steps: {" > ".join(seen)})', page.locator('main.simple.home').count() == 1 and noscroll(page), ' > '.join(seen))


def person_pick(page, label):
    page.locator('main.pv .pt', has_text=label).first.click()
    page.wait_for_selector('[data-confirm=yes]')
    page.locator('[data-confirm=yes]').click()
    page.wait_for_selector('.p-give')


def give(page):
    page.locator('.p-give').click(); page.wait_for_timeout(500)


def topic_q(page, topic, text):
    page.locator(f'.topic[data-topic={topic}]').click()
    page.locator('.tq', has_text=text).first.click()
    page.wait_for_selector('main.simple.card')
    page.locator('[data-act=show]').click(); page.wait_for_selector('main.pv .pt')


def loaded(page, sel='main.pv img.pic', n=None):
    """Waits until the pictures under `sel` have loaded (at most 8 s); True when all of them are 256 px wide."""
    js = f"[...document.querySelectorAll('{sel}')]" + (f'.slice(0, {n})' if n else '')
    try:
        page.wait_for_function(js + '.every((i) => i.complete && i.naturalWidth > 0)', timeout=8000)
    except Exception:
        pass
    return page.evaluate(js + '.length > 0 && ' + js + '.every((i) => i.complete && i.naturalWidth === 256)')


def to_weak(page):
    """Body & care, "Are you in pain?", yes, the arms, the left arm: the carer's screen with the weakness question next."""
    topic_q(page, 'body', 'in pain')
    person_pick(page, 'yes'); give(page); page.wait_for_selector('main.simple.s-answered')
    page.locator('#next-q').first.click(); page.wait_for_selector('main.simple.card')
    page.locator('[data-act=show]').click(); page.wait_for_selector('main.pv .pt')
    for _ in range(2):
        page.locator('main.pv .pt', has_text='somewhere else').click(); page.wait_for_timeout(250)
    page.wait_for_selector('main.pv .pt >> text=arms')
    page.locator('main.pv .pt', has_text='arms').first.click(); page.wait_for_selector('main.pv .pt >> text=your left arm')
    person_pick(page, 'your left arm'); give(page); page.wait_for_selector('main.simple.s-answered')


def ids(page):
    return page.evaluate("[...document.querySelectorAll('main.pv .pt')].map((t) => { const i = t.querySelector('img.pic, svg'); return i ? (i.dataset.id || i.getAttribute('aria-label') || '') : ''; })")


def walk(b, w, h, scheme):
    tag = f'{w}_{scheme}'
    ctx = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2, is_mobile=True, has_touch=True, user_agent=e2e.PHONE_UA, color_scheme=scheme, service_workers='block', locale='en-US')
    outside = []
    ctx.route('**/*', lambda r: (outside.append(r.request.url), r.abort()) if not r.request.url.startswith(URL) else r.continue_())
    page = ctx.new_page(); errs = []
    page.on('pageerror', lambda e: errs.append(str(e)))
    # (fold the 4 steps as after the first card, so every walk starts from the same first screen)
    page.goto(URL); page.wait_for_selector('main.simple.home')
    page.evaluate(e2e.KV_PUT, {'settings': {'cloudHelp': False, 'support': 'more', 'welcomed': True, 'firstCard': True, 'howFolded': True}})
    home(page)

    # ---- 1. the first screen (item 10, item 16)
    r = page.evaluate("(() => { const b = (s) => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().bottom) : 9999; }; return { ai: b('#try-ai [data-act=try-ai]'), strip: b('#ai-strip'), row: Math.max(...[...document.querySelectorAll('.topic')].slice(0, 2).map((e) => Math.round(e.getBoundingClientRect().bottom))) }; })()")
    strip = page.locator('#ai-strip').inner_text().strip()
    if w == 390:
        check(f'{tag}: "See the AI at work" and its two lines end above the fold ({r["strip"]} px of {h})', r['strip'] <= h, json.dumps(r))
    check(f'{tag}: the first row of topics ends above the fold ({r["row"]} px of {h})', r['row'] <= h, json.dumps(r))
    if w == 390:
        check(f'{tag}: the strip says where the AI runs on a phone and on a laptop', "Phone: Google's AI, online, after your yes" in strip and "Laptop with Chrome's own AI: nothing is sent" in strip, strip)
    else:
        # (at 360 px the strip folds, so the first row of topics stays above the fold; the button's tag says where its AI runs)
        check(f'{tag}: at 360 px the strip folds; the button\'s tag says where its AI runs, and the lines stay its description', page.evaluate("getComputedStyle(document.querySelector('#ai-strip')).display") == 'none' and "uses Google's AI, after your yes" in e2e.text(page, '#try-ai-tag') and page.locator('#try-ai [aria-describedby=ai-strip]').count() == 1, strip)
    check(f'{tag}: "See the AI at work" comes before "How it works" and the topics', page.evaluate("(() => { const a = document.querySelector('#try-ai'), h = document.querySelector('#how'), t = document.querySelector('#topics'); return !!a && !!(a.compareDocumentPosition(h) & 4) && !!(a.compareDocumentPosition(t) & 4); })()"))
    # (phase 12b: on a phone the sample family opens in this simple view, not in judge mode)
    check(f'{tag}: "Try it with the Millers, a sample family" at the foot of Home, to the simple view on a phone', page.locator('#try-sample[href="#/sample"]').count() == 1 and 'Try it with the Millers, a sample family' in e2e.text(page, '#try-sample'))
    # (phase 12b: the red box names the number, and "Change it" is under it)
    fn = e2e.text(page, '#first-number') if page.locator('#first-number').count() else ''
    check(f'{tag}: the red box on the first screen names the number, with "Not your number? Change it" under it', 'Signs of a new stroke, chest pain, a fall: call 911.' in e2e.text(page, '#sudden-link') and 'Not your number? Change it' in fn, e2e.text(page, '#sudden-link') + ' / ' + fn)
    check(f'{tag}: first screen: no sideways scroll', noscroll(page))
    shot(page, tag, '01_home')
    page.screenshot(path=os.path.join(OUT, f'{tag}_01_home_full.png'), full_page=True)
    page.locator('#first-number [data-act=sudden-number]').click(); page.wait_for_timeout(500)
    check(f'{tag}: "Change it" opens About them at the emergency number', page.locator('[data-health=emergency]').count() == 1, e2e.text(page)[:200])
    back_home(page, tag, '"Change it" under the red box')
    page.locator('#try-sample').click(); page.wait_for_timeout(1200)
    mt = e2e.text(page)
    check(f'{tag}: the Millers on a phone: the simple view\'s first screen with the sample family (Frank), saying so, with a way out', page.locator('main.simple.home').count() == 1 and 'Frank' in mt and 'You are trying it with the Millers, a sample family.' in mt and page.locator('#sample-on [data-act=leave-demo]').count() == 1, mt[:300])
    check(f'{tag}: the Millers on a phone: no on-device download offered, no judge mode', page.locator('[data-act=download]').count() == 0 and 'Judge mode' not in mt and 'Gemini Nano' not in mt, mt[:300])
    shot(page, tag, '02_millers')
    page.locator('#sample-on [data-act=leave-demo]').click(); page.wait_for_timeout(800)
    check(f'{tag}: "Leave the sample family" goes back to the family\'s own first screen', page.locator('main.simple.home').count() == 1 and page.locator('#try-sample').count() == 1 and 'Frank' not in e2e.text(page, '#hope'), e2e.text(page)[:200])
    home(page)

    # ---- 2. pain on the needs board (item 4)
    page.locator('.btn[data-act=needs]').first.click(); page.wait_for_selector('main.pv .p-tiles.board')
    check(f'{tag}: needs board: the pictures loaded, "pain" among them (the whole-body picture)', loaded(page) and page.evaluate("(() => { const i = document.querySelector('main.pv img.pic[data-id=pain]'); return !!i && i.complete && i.naturalWidth === 256; })()"))
    shot(page, tag, '03a_needs_board')
    person_pick(page, 'pain'); give(page)
    page.wait_for_selector('main.simple.s-answered')
    where = page.locator('#need-where')
    box = page.locator('#need-urgent')
    check(f'{tag}: needs board, pain: "Where does it hurt?" is the main button, first', where.count() == 1 and 'primary' in (where.get_attribute('class') or '') and page.evaluate("(() => { const a = document.querySelector('#need-where'), b = document.querySelector('#need-urgent'); return !!(a.compareDocumentPosition(b) & 4); })()"))
    check(f'{tag}: needs board, pain: the call box has the number and a real call button, and asks if it is your number', box.count() == 1 and page.locator('#need-urgent a[href="tel:911"]').count() == 1 and 'Call 911 now if this is new or sudden.' in e2e.text(page, '#need-urgent') and 'Is this your emergency number?' in e2e.text(page, '#need-urgent'), e2e.text(page, '#need-urgent') if box.count() else 'no box')
    check(f'{tag}: needs board, pain: no sideways scroll', noscroll(page))
    shot(page, tag, '03_needs_pain')
    where.click(); page.wait_for_selector('main.simple.card'); page.wait_for_timeout(400)
    check(f'{tag}: needs board, pain: "Where does it hurt?" opens the body card (the way on ends on an action)', 'Where does it hurt?' in e2e.text(page), e2e.text(page)[:200])
    back_home(page, tag, 'needs board, pain')

    # ---- 3. pain in an arm (item 3) and the pain scale (item 8)
    topic_q(page, 'body', 'in pain')
    person_pick(page, 'yes'); give(page); page.wait_for_selector('main.simple.s-answered')
    page.locator('#next-q').first.click(); page.wait_for_selector('main.simple.card')
    page.locator('[data-act=show]').click(); page.wait_for_selector('main.pv .pt')
    for _ in range(2):
        page.locator('main.pv .pt', has_text='somewhere else').click(); page.wait_for_timeout(250)
    page.wait_for_selector('main.pv .pt >> text=arms')
    page.locator('main.pv .pt', has_text='arms').first.click(); page.wait_for_selector('main.pv .pt >> text=your left arm')
    person_pick(page, 'your left arm'); give(page); page.wait_for_selector('main.simple.s-answered')
    nq = page.locator('#next-q').first.get_attribute('data-q') if page.locator('#next-q').count() else ''
    check(f'{tag}: "your left arm": the next question is "Is it suddenly weak or numb, yes or no?"', nq == 'Is it suddenly weak or numb, yes or no?', nq)
    shot(page, tag, '04_arm_next')
    page.locator('#next-q').first.click(); page.wait_for_selector('main.simple.card')
    page.locator('[data-act=show]').click(); page.wait_for_selector('main.pv .pt')
    check(f'{tag}: the weakness question is a yes / no card', [x.strip() for x in page.locator('main.pv .pt').all_inner_texts()] == ['yes', 'no', 'not sure'], str(page.locator('main.pv .pt').all_inner_texts()))
    person_pick(page, 'yes'); give(page); page.wait_for_selector('main.simple.s-answered')
    t = e2e.text(page)
    check(f'{tag}: a yes raises the call box, and the end line says call now and note the time', page.locator('#urgent a[href="tel:911"]').count() >= 1 and 'this can be a stroke' in t and 'note the time it started' in t, t[:300])
    # (phase 12b: a confirmed yes: no "if this is new or sudden")
    ub = e2e.text(page, '#urgent')
    check(f'{tag}: the box over a confirmed yes: "Call 911 now. Note the time it started.", no "if"', 'Call 911 now. Note the time it started.' in ub and 'if this is new or sudden' not in ub, ub)
    shot(page, tag, '05_weak_yes')
    back_home(page, tag, 'pain in an arm')
    # (phase 12b: one "no" does not end the stroke check; a fresh first screen, so the topic opens)
    home(page)
    to_weak(page)
    page.locator('#next-q').first.click(); page.wait_for_selector('main.simple.card')
    page.locator('[data-act=show]').click(); page.wait_for_selector('main.pv .pt')
    person_pick(page, 'no'); give(page); page.wait_for_selector('main.simple.s-answered')
    tn = e2e.text(page)
    check(f'{tag}: one "no" to the weakness question: check it yourself now, the arms and the smile, call 911 if one side drops', 'They pointed to no. A yes or no can be wrong after a stroke: check it yourself now. Ask them to lift both arms and smile. If one side drops or the face droops, call 911 now.' in tn and 'Not weak or numb' not in tn, tn[:400])
    check(f'{tag}: after that "no": no sideways scroll', noscroll(page))
    shot(page, tag, '05b_weak_no')
    back_home(page, tag, 'one "no" to the weakness question')
    # (not a topic question: typed, as a carer would; the rules make the scale)
    page.locator('#q').fill('How bad is the pain?'); page.locator('#make').click(); page.wait_for_selector('main.simple.card')
    page.locator('[data-act=show]').click(); page.wait_for_selector('main.pv .pt')
    sc = ids(page)
    check(f'{tag}: "How bad is the pain?": three faces, mild / medium / strong, the word under each', sc[:3] == ['pain mild', 'pain medium', 'pain strong'] and [x.strip() for x in page.locator('main.pv .pt').all_inner_texts()][:3] == ['a little', 'quite bad', 'very bad'], str(sc))
    # (phase 12b: the faces are pictures made with Gemini now; each is loaded before it is checked)
    check(f'{tag}: the pain scale: the three pictures loaded (256 px), from /pictures/', loaded(page, 'main.pv img.pic', 3) and page.evaluate("[...document.querySelectorAll('main.pv img.pic')].slice(0, 3).map((i) => new URL(i.src).pathname).join(' ')") == '/pictures/pain_mild.webp /pictures/pain_medium.webp /pictures/pain_strong.webp')
    check(f'{tag}: the pain scale: no sideways scroll', noscroll(page))
    shot(page, tag, '06_pain_scale')
    person_pick(page, 'quite bad'); give(page); page.wait_for_selector('main.simple.s-answered')
    tq = e2e.text(page)
    check(f'{tag}: "quite bad": call the nurse or doctor now, and the call box', 'Quite bad. Call their nurse or doctor now.' in tq and 'care plan' not in tq and page.locator('#urgent a[href="tel:911"]').count() >= 1, tq[:300])
    shot(page, tag, '06b_quite_bad')
    back_home(page, tag, '"quite bad"')

    # ---- 4. the person starts (item 8) and the crisis choice (item 14)
    page.locator('#turn-go').click(); page.wait_for_selector('main.pv .pt')
    st = ids(page)
    check(f'{tag}: the person\'s starters: "I need something" the four squares, "I feel…" three faces, no raised finger, no thumbs', st[0] == 'needs' and st[2] == 'feelings' and 'show me' not in st and 'good' not in st, str(st))
    shot(page, tag, '07_starters')
    page.locator('main.pv .pt').nth(2).click(); page.wait_for_selector('[data-confirm=yes]')
    if page.locator('[data-confirm=yes]').count():
        page.locator('[data-confirm=yes]').click()
    page.wait_for_selector('main.pv .pt >> text=so-so')
    for _ in range(2):
        page.locator('main.pv .pt.esc').first.click(); page.wait_for_timeout(400)
    labels = [x.strip() for x in page.locator('main.pv .pt').all_inner_texts()]
    # (phase 12b: "stop for now", a calm way to end the card, beside "I can't go on")
    check(f'{tag}: the feelings card, its third page: worried / lonely / I can\'t go on / stop for now, and the way out', labels == ['worried', 'lonely', "I can't go on", 'stop for now', 'something else'], str(labels))
    check(f'{tag}: "I can\'t go on" is a word tile, no picture', page.evaluate("(() => { const t = [...document.querySelectorAll('main.pv .pt')].find((x) => x.innerText.trim() === \"I can't go on\"); return !!t && !t.querySelector('img, svg'); })()"))
    shot(page, tag, '08_feelings_p3')
    person_pick(page, "I can't go on")
    check(f'{tag}: the person reads "Thank you for telling me."', 'Thank you for telling me.' in e2e.text(page), e2e.text(page)[:200])
    shot(page, tag, '09_crisis_thanks')
    give(page); page.wait_for_selector('main[data-screen=crisis]')
    cs = e2e.text(page)
    check(f'{tag}: giving the phone back opens the safety screen: stay, the emergency number, the crisis line, the steps', 'Stay with them. Get help now.' in cs and page.locator('main[data-screen=crisis] a[href="tel:911"]').count() >= 1 and page.locator('main[data-screen=crisis] a[href="tel:988"]').count() == 1 and 'Do not leave them alone now.' in cs and 'A "no" does not end it' in cs, cs[:400])
    check(f'{tag}: the safety screen: no "later", no "try again"; no sideways scroll', not any(x in cs.lower() for x in ('later', 'try again', 'not now')) and noscroll(page), cs)
    shot(page, tag, '10_crisis_screen')
    page.screenshot(path=os.path.join(OUT, f'{tag}_10_crisis_screen_full.png'), full_page=True)
    page.locator('#s-top [data-act=back]').first.click(); page.wait_for_timeout(400)
    check(f'{tag}: Back from the safety screen: the carer\'s answer with the red box and its call buttons', page.locator('#crisis-box').count() == 1 and page.locator('#crisis-box a[href="tel:988"]').count() == 1, e2e.text(page)[:300])
    shot(page, tag, '11_crisis_box')
    page.locator('#crisis-box a[href="#/crisis"]').click(); page.wait_for_selector('main[data-screen=crisis]')
    check(f'{tag}: "What to do now" in the box opens the safety screen again', True)
    back_home(page, tag, 'the crisis choice')
    # (phase 12b: "stop for now" ends the card calmly, with no crisis box)
    page.locator('#turn-go').click(); page.wait_for_selector('main.pv .pt')
    page.locator('main.pv .pt').nth(2).click(); page.wait_for_selector('[data-confirm=yes]')
    if page.locator('[data-confirm=yes]').count():
        page.locator('[data-confirm=yes]').click()
    page.wait_for_selector('main.pv .pt >> text=so-so')
    for _ in range(2):
        page.locator('main.pv .pt.esc').first.click(); page.wait_for_timeout(400)
    check(f'{tag}: "stop for now" is a word tile, no picture', page.evaluate("(() => { const t = [...document.querySelectorAll('main.pv .pt')].find((x) => x.innerText.trim() === 'stop for now'); return !!t && !t.querySelector('img, svg'); })()"))
    person_pick(page, 'stop for now'); give(page); page.wait_for_selector('main.simple.s-answered')
    ts = e2e.text(page)
    check(f'{tag}: "stop for now": the card ends calmly, the carer stays near and asks again; no crisis box', 'They want to stop for now. Stay near, and ask again later today, one small question at a time.' in ts and page.locator('#crisis-box').count() == 0 and noscroll(page), ts[:300])
    shot(page, tag, '11b_stop_for_now')
    back_home(page, tag, '"stop for now"')

    # ---- 5. a pain question left for later (item 5)
    now = int(time.time() * 1000)
    page.evaluate(e2e.KV_PUT, {'later': [{'q': 'Are you in pain?', 'at': now - 3 * 3600 * 1000}]})
    home(page)
    lt = e2e.text(page, '#later')
    check(f'{tag}: Home, pain left for later: how long ago, the signs that do not wait, a call button, the list', 'Left 3 hours ago.' in lt and 'Call 911 now if there is sudden weakness or numbness' in lt and page.locator('#later a[href="tel:911"]').count() == 1 and page.locator('#later a[href="#/sudden"]').count() == 1, lt)
    check(f'{tag}: pain left for later: no sideways scroll', noscroll(page))
    # (phase 12b: directly under "Needs something now?", its call button on the screen)
    pos = page.evaluate("""(() => { const n = document.querySelector('.btn[data-act=needs]'), l = document.querySelector('#later'), t = document.querySelector('#turn-go'), a = document.querySelector('#try-ai'), c = document.querySelector('#later a[href^="tel:"]'); return { next: n.nextElementSibling === l, beforeTurn: !!(l.compareDocumentPosition(t) & 4), beforeAi: !a || !!(l.compareDocumentPosition(a) & 4), call: Math.round(c.getBoundingClientRect().bottom) }; })()""")
    check(f'{tag}: pain left for later stands directly under "Needs something now?", above "I want to say something" and the AI box, its call button on screen ({pos["call"]} px of {h})', pos['next'] and pos['beforeTurn'] and pos['beforeAi'] and pos['call'] <= h, json.dumps(pos))
    shot(page, tag, '12_later_pain')
    page.locator('#later a[href="#/sudden"]').click(); page.wait_for_selector('main.sudden')
    check(f'{tag}: "What to look for" opens "Something new or sudden?" (FAST)', 'FAST' in e2e.text(page))
    back_home(page, tag, 'pain left for later')
    page.evaluate(e2e.KV_PUT, {'later': []})

    # ---- 5b. (phase 12b) after "something else": "Find more choices (online, after your yes)" is the second way
    home(page)
    topic_q(page, 'food', 'tea or coffee')
    person_pick(page, 'something else'); give(page); page.wait_for_selector('#after-out')
    order = page.evaluate("[...document.querySelectorAll('#ways > li')].map((li) => (li.querySelector('button') || {}).id || '')")
    check(f'{tag}: after "something else": the AI step is the second way, "Find more choices (online, after your yes)"', len(order) >= 3 and order[1] == 'narrow' and e2e.text(page, '#narrow') == 'Find more choices (online, after your yes)', str(order))
    shot(page, tag, '12b_ways')
    back_home(page, tag, 'after "something else"')

    # ---- 6. the curtains and the church (item 7)
    home(page)
    topic_q(page, 'rest', 'curtains')
    cu = ids(page)
    try:
        page.wait_for_function("[...document.querySelectorAll('main.pv img.pic')].slice(0, 2).every((i) => i.complete && i.naturalWidth > 0)", timeout=8000)
    except Exception:
        pass
    check(f'{tag}: the curtain question shows the curtains open and closed (pictures loaded), not doors', cu[:2] == ['curtains open', 'curtains closed'] and page.evaluate("[...document.querySelectorAll('main.pv img.pic')].slice(0, 2).every((i) => i.complete && i.naturalWidth === 256)"), str(cu))
    shot(page, tag, '13_curtains')
    page.goto(URL); page.wait_for_selector('main.simple.home')
    page.evaluate(e2e.KV_PUT, {'profile': {'personName': '', 'partnerName': '', 'people': [], 'foods': [], 'places': ['church', 'the lake'], 'tv': [], 'music': [], 'other': []}})
    home(page)
    page.locator('#turn-go').click(); page.wait_for_selector('main.pv .pt')
    page.locator('main.pv .pt').nth(1).click(); page.wait_for_selector('[data-confirm=yes]')
    if page.locator('[data-confirm=yes]').count():
        page.locator('[data-confirm=yes]').click()
    page.wait_for_timeout(500)
    tm = dict(zip([x.strip() for x in page.locator('main.pv .pt').all_inner_texts()], ids(page)))
    shot(page, tag, '14_church')
    page.locator('main.pv .pt.esc').first.click(); page.wait_for_timeout(400)
    tm.update(dict(zip([x.strip() for x in page.locator('main.pv .pt').all_inner_texts()], ids(page))))
    check(f'{tag}: "I want to talk about…": the church is the church picture, the lake (next screen) still "go out"', tm.get('church') == 'church' and tm.get('the lake') == 'go out', json.dumps(tm))

    # ---- 7. About them after three "no" to "Are you in pain?" (item 2)
    page.goto(URL); page.wait_for_selector('main.simple.home')
    page.evaluate(e2e.KV_PUT, {'history': [{'q': 'Are you in pain?', 'topic': '', 'label': 'no', 'at': now - d * 86400000} for d in (1, 2, 3)] + [{'q': 'Would you like tea or coffee?', 'topic': '', 'label': 'tea', 'at': now - d * 86400000} for d in (1, 2, 3)] + [{'q': 'Would you like something to drink?', 'topic': '', 'label': 'no', 'at': now - d * 86400000 - 3600000} for d in (1, 2, 3)]})
    page.goto(URL + '#/about'); page.reload(); page.wait_for_selector('#learned'); page.wait_for_timeout(500)
    ln = e2e.text(page, '#learned')
    check(f'{tag}: About them: no "Usually says no to \'Are you in pain?\'", no "Keep as a fact" for it; the tea line is there', 'pain' not in ln.lower() and 'usually tea (3 of 3)' in ln, ln)
    # (phase 12b: no usual "no" to a drink, and no "Keep as a fact" on a drink line)
    check(f'{tag}: About them: no "Usually says no" to a drink, and no "Keep as a fact" on the tea line', 'usually says no' not in ln.lower() and page.locator('#learned [data-act=learned-keep]').count() == 0, ln)
    shot(page, tag, '15_about_learned')
    back_home(page, tag, 'About them')

    check(f'{tag}: no page error, nothing asked of another host', not errs and not outside, str(errs + outside))
    ctx.close()


with sync_playwright() as p:
    b = p.chromium.launch()
    for w, h in ((360, 740), (390, 844)):
        for scheme in ('light', 'dark'):
            walk(b, w, h, scheme)
    b.close()
print(f'{sum(res)} of {len(res)} checks passed'); sys.exit(0 if all(res) else 1)
