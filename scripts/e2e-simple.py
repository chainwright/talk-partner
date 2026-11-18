#!/usr/bin/env python3
"""Browser test of the simple view ("/"), driven as a carer and the person would on a phone, then on a desktop and a tablet.

What is checked (design/USER_FIRST.md, design/topics_2026-11-17):
  - the first visit: the hope line with no default "him", "Needs it now?" at the top, "How it works: 4 steps" open
    with the visible "wait" line, seven topics, "Or ask your own question" second, one plain AI line, one small
    privacy line; no video slot, no walkthrough, no About-them form;
  - a topic opens its questions without moving a tile; a question leads to the carer's screen before handing over
    ("Say it out loud", "Turn the phone to them", "Wait. Count to ten. Don't answer for them.", what they will see);
  - the person's screens: "Point to your answer" and the question, no category word, one column of full-width
    choices; "So: tea. Right?" with "Yes" / "No, something else"; "Thank you. Tea." and "Give the phone back"; a tap
    on the carer's control does nothing, a press and hold (or Enter) goes back;
  - after an answer: "Ask another question" is the main button, About them is offered below it, "Today in short";
    the how-to block is folded to one line from then on, and that is remembered across a reload;
  - the "something else" path: what to do now, the next question of the topic, and the AI narrowing step, which
    with online help off brings the consent sheet with the exact line (nothing is asked of any other host);
  - no dead end after a "yes": pain -> where -> how bad; "is something bothering you" -> what it is about;
  - the consent sheet for an open question, quick needs, About them (the family's own questions are added, the
    generic ones stay), "How it works inside" and back, /#/demo, the device word (phone, tablet, computer);
  - what the app learns on this device by counting: nothing before three answers, then "Usually: coffee (3 of 3)" for
    the carer and the usual choice first (none removed, nothing chosen for the person); the list in About them with
    "Keep as a fact", "Remove" and "Forget everything learned"; the short question in a tree;
  - the family's own photos: chosen in About them, framed by hand (zoom, drag, arrow keys), given one word, kept in
    IndexedDB, shown on the card and on the person's screens before the drawing wherever a choice is that word;
    "Delete", "Delete all photos", "Delete everything on this phone"; nothing asked of another host, nothing posted;
  - Back and Home on every carer screen, and the browser's own back button (one step back inside the app);
  - with a production build or the hosted copy (a service worker is there): the same flow with the connection off;
  - every control at least 24 px, every button at least 44 px, the main button at least 60 px, the person's choices
    at least 80 px; no page error and no sideways overflow on any screen.

Every request that is not to the page's own host is refused (and counted), so no model answers and nothing reaches
Firebase: after the "yes" on the sheet the cloud step fails, and the screen must then say that the question may have
left. With --live (a hosted copy) the "yes" is not pressed at all, so the test sends nothing.

Usage: npm run build && npx vite preview (in another shell; or npm run dev with --dev: no service worker there), then
  python3 scripts/e2e-simple.py [--url http://localhost:5179/] [--live] [--dev]
Exit code 0 when every check passes, 1 otherwise.
"""
import argparse
import os
import sys
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright

PHONE_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36'
TABLET_UA = 'Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36'
OPEN_Q = 'What do you want to do this weekend?'
FIXTURE_PHOTO = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'tests', 'fixtures', 'photo-mug.jpg')

results = []


def check(name, ok, detail=''):
    results.append(bool(ok))
    print(f"{'PASS' if ok else 'FAIL'}  {name}{f'  ({detail})' if detail and not ok else ''}")


TARGETS = """() => {
  const out = { small: [], shortButtons: [], primary: [] };
  const seen = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && !el.closest('[inert]') && !el.disabled; };
  const name = (el) => `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).join('.') : ''} "${(el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 30)}"`;
  for (const el of document.querySelectorAll('#app button, #app a[href], #app input, #app textarea, #app select')) {
    if (!seen(el)) continue;
    const r = el.getBoundingClientRect();
    if (el.type === 'checkbox') { const l = el.closest('label'); const lr = l ? l.getBoundingClientRect() : r; if (lr.height < 24 || lr.width < 24) out.small.push(name(el)); continue; }
    if (r.width < 24 || r.height < 24) out.small.push(`${name(el)} ${Math.round(r.width)}x${Math.round(r.height)}`);
    if ((el.tagName === 'BUTTON' || el.classList.contains('btn') || el.classList.contains('tlink') || el.classList.contains('backrow') || el.classList.contains('offer')) && r.height < 44) out.shortButtons.push(`${name(el)} ${Math.round(r.height)}`);
    if (el.classList.contains('primary')) out.primary.push(Math.round(r.height));
  }
  return out;
}"""
OVERFLOW = """() => { const de = document.documentElement; const vw = de.clientWidth; let n = 0;
  for (const el of document.querySelectorAll('#app *')) { const r = el.getBoundingClientRect(); if (r.width && r.height && r.right > vw + 1) n++; }
  return { vw, sw: de.scrollWidth, n }; }"""


def screen_checks(page, label, primary=True):
    page.wait_for_timeout(250)
    t = page.evaluate(TARGETS)
    check(f'{label}: every control is at least 24 x 24 px', not t['small'], '; '.join(t['small']))
    check(f'{label}: every button and stand-alone link is at least 44 px tall', not t['shortButtons'], '; '.join(t['shortButtons']))
    if primary:
        check(f'{label}: the main button is at least 60 px tall', t['primary'] and min(t['primary']) >= 60, str(t['primary']))
    o = page.evaluate(OVERFLOW)
    check(f'{label}: nothing runs off the side of the screen', o['sw'] <= o['vw'] and o['n'] == 0, str(o))


def text(page, sel='#app'):
    return ' '.join(page.locator(sel).inner_text().split())


def hold_exit(page):
    page.locator('#exit').dispatch_event('pointerdown')


def ys(page, sel):
    return page.evaluate("(s) => [...document.querySelectorAll(s)].map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; })", sel)


def ask_topic(page, topic, question):
    """From the first screen: open the topic if it is not open, tap the question, wait for the carer's screen."""
    if not page.locator(f'.tq', has_text=question).count():
        page.locator(f'.topic[data-topic={topic}]').click()
    page.locator('.tq', has_text=question).click()
    page.wait_for_selector('main.simple.card #made-where, #sheet, main.simple.nocard')


def new_q(page):
    """A new question: "Ask another question" / "Ask something else" after an answer, "Home" on any other carer screen."""
    if page.locator('#another').count():
        page.locator('#another').click()
    else:
        page.locator('[data-act=home]').click()
    page.wait_for_selector('main.simple.home')


def nexts(page):
    """The next questions the tree offers after this answer: the main button first."""
    return page.evaluate("[...document.querySelectorAll('main.s-answered [data-next]')].map((e) => e.dataset.q)")


def more(page):
    """Opens "More" on the answered screen (the other buttons, today, "Today in short", how it was made)."""
    if page.locator('#more[aria-expanded=false]').count():
        page.locator('#more').click()
        page.wait_for_selector('#more-body')


def answer(page, label):
    """The carer shows the choices; the person points, says Yes, and gives the phone back."""
    page.locator('[data-act=show]').click()
    page.wait_for_selector('main.pv .pt')
    page.locator('main.pv .pt', has_text=label).first.click()
    page.wait_for_selector('[data-confirm=yes]')
    page.locator('[data-confirm=yes]').click()
    page.wait_for_selector('.p-give')
    page.locator('.p-give').click()
    page.wait_for_selector('main.simple.s-answered')


def navigation(page, url):
    """Back and Home on every carer screen, and the phone's own back button: one step back inside the app, never out of it."""
    def back(how):
        if how == 'bar':
            page.locator('#s-top [data-act=back]').click()
        else:
            page.go_back()
        page.wait_for_timeout(350)

    def screen():
        if page.locator('#sheet').count():
            return 'sheet'
        m = page.locator('#app > main').first
        return m.get_attribute('data-screen') or ('person' if 'pv' in (m.get_attribute('class') or '') else '?')

    bar = lambda: page.locator('#s-top [data-act=back]').is_visible() and page.locator('#s-top [data-act=home]').is_visible() and text(page, '#s-top') == 'Back Talk Partner Home'
    new_q(page)
    check('navigation: the first screen has the app\'s name at the top and no "Back" (there is nowhere to go back to)', page.locator('#s-top [data-act=home]').is_visible() and page.locator('#s-top [data-act=back]').count() == 0)
    for how in ('bar', 'browser'):
        name = 'the "Back" button' if how == 'bar' else "the browser's back button"
        seen = []
        ask_topic(page, 'food', 'tea or coffee')
        seen.append(bar())
        back(how)
        check(f'navigation, {name}: from the hand-over screen back to the first screen, the topic still open', screen() == 'home' and page.locator('.tq').count() >= 6, screen())
        ask_topic(page, 'food', 'tea or coffee')
        page.locator('[data-act=show]').click()
        page.wait_for_selector('main.pv .pt')
        if how == 'browser':
            page.go_back()
            page.wait_for_timeout(350)
            check("navigation, the browser's back button on the person's choices: back to the carer's screen, the same question", screen() == 'card' and 'Would you like tea or coffee?' in text(page), screen())
            page.locator('[data-act=show]').click()
            page.wait_for_selector('main.pv .pt')
            page.locator('main.pv .pt', has_text='tea').click()
            page.wait_for_selector('[data-confirm=yes]')
            page.go_back()
            page.wait_for_timeout(350)
            check("navigation, the browser's back button on the check (\"So: tea. Right?\"): back to the choices", page.locator('main.pv .pt').count() == 3 and 'Point to your answer' in text(page))
        page.locator('main.pv .pt', has_text='tea').click()
        page.locator('[data-confirm=yes]').click()
        page.locator('.p-give').click()
        page.wait_for_selector('main.simple.s-answered')
        seen.append(bar())
        back(how)
        check(f'navigation, {name}: from the answer back to the same question, ready to show again', screen() == 'card' and 'Would you like tea or coffee?' in text(page) and page.locator('[data-act=show]').is_visible(), screen())
        back(how)
        check(f'navigation, {name}: and once more, to the first screen', screen() == 'home', screen())
        # About them, the consent sheet, no card
        page.locator('.foot a[href="#/about"]').click()
        page.wait_for_selector('main.about-simple')
        seen.append(bar())
        back(how)
        check(f'navigation, {name}: from About them back to the first screen', screen() == 'home' and not page.url.endswith('#/about'), f'{screen()} {page.url}')
        page.fill('#q', OPEN_Q)
        page.locator('#make').click()
        page.wait_for_selector('#sheet, main.simple.nocard')
        if page.locator('#sheet').count():
            if how == 'browser':
                page.go_back()
                page.wait_for_timeout(350)
                check("navigation, the browser's back button on the consent sheet: the sheet closes (it is its \"No\")", screen() == 'nocard', screen())
            else:
                page.locator('[data-act=sheet-no]').click()
        page.wait_for_selector('main.simple.nocard')
        seen.append(bar())
        back(how)
        check(f'navigation, {name}: from "No card for this one" back to the first screen', screen() == 'home', screen())
        check(f'navigation: "Back" and "Home" are at the top of every carer screen (hand-over, answer, About them, no card)', all(seen), str(seen))
    # the needs board (the person's screen): the browser's back goes to the first screen
    page.locator('.btn.needs').click()
    page.wait_for_selector('main.pv .p-tiles.board')
    page.go_back()
    page.wait_for_timeout(350)
    check("navigation, the browser's back button on the needs board: back to the first screen", screen() == 'home', screen())
    # Home from deep in the flow, then the browser's back does not bring an old screen
    ask_topic(page, 'food', 'tea or coffee')
    answer(page, 'tea')
    page.locator('#next-q').click()
    page.wait_for_selector('main.simple.card #made-where')
    page.locator('#s-top [data-act=home]').click()
    page.wait_for_selector('main.simple.home')
    check('navigation: "Home" from two questions deep goes to the first screen in one tap', screen() == 'home' and page.evaluate('scrollY') == 0)
    # from the first screen the browser's back leaves the app (nothing is trapped): one step, to the page before it
    page.goto('about:blank')
    page.goto(url)
    page.wait_for_selector('main.simple.home')
    ask_topic(page, 'food', 'tea or coffee')
    page.go_back()
    page.wait_for_timeout(350)
    inside = screen() == 'home' and page.url.startswith(url)
    page.go_back()
    page.wait_for_timeout(500)
    check("navigation: the browser's back stays inside the app while there is a step to take, and leaves it from the first screen", inside and page.url == 'about:blank', page.url)
    page.goto(url)
    page.wait_for_selector('main.simple.home')


def phone(browser, url, live):
    host = urlparse(url).hostname
    ctx = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True, user_agent=PHONE_UA, service_workers='block')
    outside = []

    def route(r):
        h = urlparse(r.request.url).hostname
        if h in (host, None) or r.request.url.startswith(('data:', 'blob:')):
            r.continue_()
        else:
            outside.append(h)
            r.abort()
    ctx.route('**/*', route)
    page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))

    # ---- the first visit
    page.goto(url)
    page.wait_for_selector('#app > *')
    check('"/" on a first visit is the simple first screen, not the first-run page and not judge mode', page.locator('main.simple.home').count() == 1 and page.locator('main.welcome, .layout').count() == 0)
    check('the simple view carries its own look (data-view="simple")', page.evaluate('document.documentElement.dataset.view') == 'simple')
    page.wait_for_timeout(7000)  # the device check is asked again after 2 s and 6 s
    home = text(page)
    check('first visit: the header is the hope line, with "them" and no default "him"', page.locator('h1#hope').inner_text().strip() == "When the words won't come, let them point." and not any(w in home.split() for w in ('him', 'his', 'He', 'he', 'her', 'she')), page.locator('h1#hope').inner_text())
    top = {k: ys(page, sel)[0][1] for k, sel in (('needs', '.btn.needs'), ('how', '#how'), ('topics', '#topics'), ('own', '#q'), ('ai', '#ai-line'), ('privacy', '#s-privacy'))}
    check('first visit, top to bottom: "Needs it now?", how it works, topics, your own question, the AI line, the privacy line', list(top.values()) == sorted(top.values()), str(top))
    check('first visit: "Needs it now?" is at the top, on the first screenful', top['needs'] < 300 and 'Needs it now?' in home, str(top['needs']))
    check('first visit: "How it works: 4 steps" is open: four numbered steps, each with a picture', page.locator('section.how h2').inner_text().strip() == 'How it works: 4 steps' and page.locator('section.how li').count() == 4 and page.locator('section.how li svg').count() == 4)
    check('first visit: the line "Wait. Count to ten. Don\'t answer for them." is visible in the steps', page.locator('section.how .wait').is_visible() and page.locator('section.how .wait').inner_text().strip() == "Wait. Count to ten. Don't answer for them.")
    check('first visit: no empty video slot and no walkthrough over the screen', page.locator('video, .g-vid, .walk, .dim, [role=dialog]').count() == 0 and 'video' not in home.lower() and 'Watch how' not in home)
    check('first visit: About them is not offered before the first card', page.locator('a[href="#/about"], .offer').count() == 0)
    check('first visit: seven topics, closed; "Or ask your own question" comes after them', page.locator('.topic').count() == 7 and page.locator('.tq').count() == 0 and 'Or ask your own question' in home)
    ai = text(page, '#ai-line')
    check('first visit: one plain AI line: what the AI is for, and that on this phone it is online and the app asks first', ai == "For a question you type, AI suggests the answers they can point to. The topic questions above do not need it. On this phone that AI is online (Google's): the app asks you first, and shows the line that would go.", ai)
    check('first visit: one small privacy line, "Nothing you asked has left this phone."; never "this computer"', page.locator('.foot .lock').count() == 1 and text(page, '#s-privacy') == 'Nothing you asked has left this phone.' and 'this computer' not in home and 'the computer' not in home, text(page, '.foot'))
    check('first visit: "How it works inside" is on it', page.locator('[data-act=inside]').is_visible())
    check('first visit: nothing technical (no status box, badge, byte count or judge mode), and the word "card" is not used', page.locator('#status, .badge, #bytes, .judge').count() == 0 and ' card' not in home.lower())
    screen_checks(page, 'first visit')

    # ---- a topic, a question
    before = ys(page, '.topic')
    page.locator('.topic[data-topic=food]').click()
    after = ys(page, '.topic')
    check('a topic opens its questions in place: six one-tap rows under a lead line', page.locator('.tq').count() == 6 and 'Tap one. Then say it out loud as you turn the phone to them.' in text(page, '.tqs'))
    check('no tile moves sideways or changes row partner when a topic opens (the panel goes under the row)', [b[0] for b in before] == [x[0] for x in after] and after[0][1] == after[1][1] and after[2][1] == after[3][1] and after[2][1] > after[0][1] + 300, f'{before} {after}')
    check('every question row is at least 54 px tall', min(r[3] for r in ys(page, '.tq')) >= 54, str(ys(page, '.tq')))
    screen_checks(page, 'first visit, a topic open')
    page.locator('.tq', has_text='tea or coffee').click()
    page.wait_for_selector('main.simple.card #made-where')

    # ---- the carer's screen before handing over
    card = text(page)
    steps = [''.join(x.split()) for x in page.locator('.steplabel .num').locator('xpath=..').all_inner_texts()]
    check('before handing over: "1 Say it out loud" with the line, "2 Turn the phone to them" with the main button',
          steps == ['1Sayitoutloud', '2Turnthephonetothem'] and 'Would you like tea or coffee? Tea, coffee, or something else?' in card
          and page.locator('.btn.primary[data-act=show]').inner_text().strip() == 'Show them the choices', f'{steps} {card[:200]}')
    check('before handing over: "Wait. Count to ten. Don\'t answer for them." is on the screen, in normal size, under the main button',
          page.locator('#wait-line').is_visible() and text(page, '#wait-line') == "Wait. Count to ten. Don't answer for them." and float(page.evaluate("getComputedStyle(document.querySelector('#wait-line')).fontSize").replace('px', '')) >= 18
          and ys(page, '#wait-line')[0][1] > ys(page, '[data-act=show]')[0][1])
    check('before handing over: the carer sees what they will see (the question and three choices), and how to come back', 'What they will see:' in card and page.locator('#person.mini .pt').count() == 3)
    go = text(page, '.c-go')
    check('before handing over: two short lines of advice at most (the "wait" line and one tip), the rest behind "More tips"', go == "2 Turn the phone to them Show them the choices Wait. Count to ten. Don't answer for them. Point to each choice as you say it. More tips" and page.locator('#tips').count() == 0, go)
    page.locator('#more-tips').click()
    tips = text(page, '#tips')
    check('"More tips": how to come back, the weak hand, "Hide the choices"; and it folds again', '"Give the phone back"' in tips and '"Carer: hold here to go back"' in tips and 'If their hand is weak' in tips and 'Hide the choices' in tips and page.locator('#more-tips').inner_text().strip() == 'Fewer tips', tips)
    screen_checks(page, 'before handing over, more tips open')
    page.locator('#more-tips').click()
    check('the top bar: "Back" and "Talk Partner / Home"', text(page, '#s-top') == 'Back Talk Partner Home' and page.locator('#s-top [data-act=back]').is_visible() and page.locator('#s-top [data-act=home]').is_visible(), text(page, '#s-top'))
    check("before handing over: \"We're stuck\" and \"Hide the choices\" are on this screen", page.locator('button[data-act=stuck]').is_visible() and page.locator('button[data-act=less]').is_visible())
    made = page.locator('#made-where')
    check('before handing over: the screen itself says where the choices were made (rules on this phone, no AI, nothing sent)',
          made.get_attribute('data-maker') == 'code' and made.get_attribute('data-left') == 'nothing' and "Made by the app's rules on this phone. No AI used. Nothing was sent." in text(page, '#made-where'), text(page, '#made-where'))
    check('before handing over: "How was this made?" leads inside', page.locator('[data-act=inside-card]').is_visible())
    screen_checks(page, 'before handing over')
    page.locator('button[data-act=stuck]').click()
    page.wait_for_selector('#person .p-tiles.ways')
    check("We're stuck, pressed before any answer: five other ways, with the way back to the choices", page.locator('button[data-act=unstuck]').is_visible() and page.locator('#person .pt').count() == 5)
    screen_checks(page, "the other ways, carer's side")
    page.locator('button[data-act=unstuck]').click()
    page.wait_for_selector('#person .pt >> text=tea')

    # ---- the person's screens
    page.locator('[data-act=show]').click()
    page.wait_for_selector('main.pv .pt')
    person = text(page)
    check("the person's screen takes the whole screen, white", page.url.endswith('#/person') and page.evaluate('document.documentElement.dataset.view') == 'person' and page.evaluate("getComputedStyle(document.querySelector('main.pv')).backgroundColor") == 'rgb(255, 255, 255)')
    check('the person: "Point to your answer", then the question itself, then the choices', person == 'Carer: hold here to go back Point to your answer Would you like tea or coffee? tea coffee something else', person)
    check('the person: no category word above the choices (no headline, no "drink")', page.locator('main.pv .headline, main.pv h2').count() == 0 and 'drink' not in person.split())
    tiles = ys(page, 'main.pv .pt')
    check('the person: one centred column, every choice as wide as the screen and at least 80 px tall, the way out last', len(tiles) == 3 and all(t[2] >= 350 and t[3] >= 80 and t[0] == tiles[0][0] for t in tiles) and tiles[0][1] < tiles[1][1] < tiles[2][1] and page.locator('main.pv .pt').nth(2).inner_text().strip() == 'something else', str(tiles))
    check('the person: each choice has its picture with the word under it', page.evaluate("[...document.querySelectorAll('main.pv .pt:not(.esc)')].every((t) => { const s = t.querySelector('svg').getBoundingClientRect(); const w = t.querySelector('span').getBoundingClientRect(); return w.top >= s.bottom - 1; })"))
    check('the person: the question and the choices are one unit (the first choice starts right under the question)', tiles[0][1] - (ys(page, 'main.pv .p-ask')[0][1] + ys(page, 'main.pv .p-ask')[0][3]) <= 28, str(tiles[0]))
    check('the person: nothing but the choices and the carer\'s labelled control can be pressed', page.locator('main.pv button').count() == 4 and page.locator('main.pv a').count() == 0)
    check('the person: nothing on the screen is animated', page.evaluate("[...document.querySelectorAll('main.pv, main.pv *')].every((e) => getComputedStyle(e).animationName === 'none')"))
    screen_checks(page, "the person's choices", primary=False)
    page.locator('#exit').click()
    page.wait_for_timeout(300)
    check("a tap on the carer's control does nothing: it needs a press and hold", page.url.endswith('#/person') and page.locator('main.pv .pt').count() == 3)
    page.locator('main.pv .pt', has_text='tea').click()
    page.wait_for_selector('[data-confirm=yes]')
    chk = text(page)
    check('the check: "So: tea. Right?", the picture with its word, "Yes" above "No, something else"', chk == 'Carer: hold here to go back So: tea. Right? tea Yes No, something else' and page.locator('main.pv .p-pick svg').count() == 1 and ys(page, '[data-confirm=yes]')[0][1] < ys(page, '[data-confirm=change]')[0][1], chk)
    screen_checks(page, "the person's check", primary=False)
    page.locator('[data-confirm=change]').click()
    page.wait_for_selector('main.pv .pt.esc')
    check('"No, something else" brings the choices back, with the way out among them', page.locator('main.pv .pt').count() == 3 and 'Point to your answer' in text(page))
    page.locator('main.pv .pt', has_text='tea').click()
    page.locator('[data-confirm=yes]').click()
    page.wait_for_selector('.p-give')
    fin = text(page)
    give = ys(page, '.p-give')[0]
    check('the finish: "Thank you. Tea." and one big button, "Give the phone back"; no press-and-hold needed', fin == 'Thank you. Tea. Give the phone back' and page.locator('main.pv button').count() == 1 and page.locator('#exit').count() == 0 and give[3] >= 60 and give[2] >= 350, f'{fin} {give}')
    screen_checks(page, "the person's finish", primary=False)
    page.locator('.p-give').click()
    page.wait_for_selector('main.simple.s-answered', timeout=4000)

    # ---- after an answer
    done = text(page)
    btns = page.locator('main.s-answered .col button, main.s-answered .col a.btn')
    check('after an answer: the question with its answer under it ("Would you like tea or coffee?" then "Tea"), never "said yes to"',
          text(page, '#chose') == 'Would you like tea or coffee? Tea' and 'said yes to' not in done, text(page, '#chose'))
    check('after an answer the tree leads: "Next: Would you like milk in it?" is the main button, the first one under the answer, and "Ask something else" stands under it',
          ' '.join(btns.first.inner_text().split()) == 'Next: Would you like milk in it?' and 'primary' in btns.first.get_attribute('class') and page.locator('main.s-answered .btn.primary').count() == 1 and page.locator('#another').inner_text().strip() == 'Ask something else' and nexts(page) == ['Would you like milk in it?'], done[:200])
    check('after an answer: little on the screen: one line on what left ("Nothing was sent."), the rest behind "More"', text(page, '#left-line') == 'Nothing was sent.' and page.locator('#made-where, #today-short, #s-privacy').count() == 0 and page.locator('#more').inner_text().strip() == 'More', done)
    check('the top bar is on this screen too', text(page, '#s-top') == 'Back Talk Partner Home')
    screen_checks(page, 'after an answer, "More" closed')
    more(page)
    done = text(page)
    check('after the first card: About them is offered, below the main button, never as the main button', page.locator('#invite').is_visible() and "Want their family's names on the questions?" in done and ys(page, '#invite')[0][1] > ys(page, 'main.s-answered .btn.primary')[0][1] and page.locator('#invite .primary').count() == 0)
    check("after an answer: today's answers, and \"Today in short\" written by the app's rules with a Copy button", 'Today Would you like tea or coffee? tea' in done and page.locator('#today-short[data-source=rules]').count() == 1 and 'They answered 1 question today by pointing, and confirmed each answer.' in text(page, '#today-short') and 'never sent to online help' in text(page, '#today-short') and page.locator('[data-act=copy-short]').is_visible(), text(page, '#today-short') if page.locator('#today-short').count() else done[-300:])
    check('after an answer: says the answers are kept on this phone only, and where the choices were made', 'Answers are kept on this phone only.' in done and page.locator('#made-where').count() == 1)
    screen_checks(page, 'after an answer')
    page.locator('[data-act=invite-later]').click()
    check('"Not now": the offer goes, and nothing else changes', page.locator('#invite').count() == 0 and text(page, '#chose') == 'Would you like tea or coffee? Tea')
    # ---- the tree: tea -> milk in it? -> yes -> the end of the path, with what to do
    page.locator('#next-q').click()
    page.wait_for_selector('main.simple.card #made-where')
    check('the next question is made by the rules: "Would you like milk in it?" yes / no / not sure', page.locator('#person .pt').all_inner_texts() == ['yes', 'no', 'not sure'] and page.locator('#made-where').get_attribute('data-maker') == 'code')
    answer(page, 'yes')
    check('the end of a path: "Now: Make it with milk.", and "Ask another question" is the main button again', text(page, '#do-now') == 'Now: Make it with milk.' and text(page, '#chose') == 'Would you like milk in it? Yes' and page.locator('#next-q').count() == 0 and page.locator('main.s-answered .btn.primary').inner_text().strip() == 'Ask another question', text(page)[:200])
    screen_checks(page, 'the end of a path')
    new_q(page)
    check('after the first card the how-to block is one highlighted line at the top, and the topic is still open', page.locator('button.how-line').count() == 1 and page.locator('section.how').count() == 0 and text(page, '.how-line') == 'How it works: 4 steps Show' and page.locator('.tq').count() == 6 and ys(page, '.how-line')[0][1] < ys(page, '#topics')[0][1])
    check('the field does not take the cursor (no keyboard over the topics on a phone)', page.evaluate("document.activeElement && document.activeElement.id") != 'q')
    check('About them is now one small link at the foot', page.locator('.foot a[href="#/about"]').inner_text().strip() == 'About them →')
    screen_checks(page, 'returning visit, how-to folded')
    page.reload()
    page.wait_for_selector('main.simple.home')
    check('the fold is remembered across a reload', page.locator('button.how-line').count() == 1 and page.locator('section.how').count() == 0)
    page.locator('.how-line').click()
    check('"Show" opens the four steps again, and "Hide" folds them', page.locator('section.how li').count() == 4)
    page.locator('section.how [data-act=how]').click()
    check('folded again', page.locator('button.how-line').count() == 1)

    # ---- "something else"
    ask_topic(page, 'food', 'water, juice or milk')
    page.locator('[data-act=show]').click()
    page.wait_for_selector('main.pv .pt')
    four = ys(page, 'main.pv .pt')
    check('three choices and the way out: still one column, all on a phone screen without scrolling', len(four) == 4 and all(t[0] == four[0][0] for t in four) and four[3][1] + four[3][3] <= 844, str(four))
    screen_checks(page, "the person's choices, three and the way out", primary=False)
    page.locator('main.pv .pt.esc').click()
    page.wait_for_selector('[data-confirm=yes]')
    check('the way out is checked like any answer: "So: something else. Right?"', 'So: something else. Right?' in text(page))
    page.locator('[data-confirm=yes]').click()
    page.wait_for_selector('.p-give')
    page.locator('.p-give').click()
    page.wait_for_selector('main.simple.s-answered #after-out')
    out = text(page)
    check('after "something else": the screen says so, and the tree leads on with a broader question ("a hot drink or a cold drink?")', text(page, '#chose') == 'Would you like water, juice or milk? Something else' and nexts(page) == ['Would you like a hot drink or a cold drink?'], out[:200])
    check('after "something else": what to do now, never a dead end (show or write it; the next question of the topic; the needs board; a new way; other ways)',
          'None of those fitted. What now:' in out and 'Ask them to show you, or to write or draw it.' in out and page.locator('#after-out [data-q]').inner_text().strip() == 'Try: Would you like some more?'
          and all(page.locator(f'#after-out [data-act={a}]').is_visible() for a in ('needs', 'own', 'stuck')), out[:400])
    check('after "something else": an AI can narrow it down, and the screen says that on this phone it uses online help and asks first', page.locator('#narrow').is_visible() and text(page, '#narrow') == 'Narrow it down: AI suggests the next choices' and text(page, '#narrow-where') == 'This uses online help: the app asks you first, and shows the line that would go.', text(page, '#after-out')[:300])
    screen_checks(page, 'after "something else"')
    n0 = len(outside)
    page.locator('#narrow').click()
    page.wait_for_selector('#sheet')
    line = page.locator('#sheet-line').inner_text().strip()
    check('the narrowing step with online help off: the consent sheet, with the exact line (the question and what did not fit, nothing they chose)', line == 'Partner asks: Would you like water, juice or milk? They did not want: water, juice, milk. What else could it be? Do not give more of the same kind as the ones they did not want, and none of those again. Give two or three broader, different kinds of answer: a kind such as "something cold" or "something to eat", not one more single thing.', line)
    check('asking for it sent nothing to any other host', len(outside) == n0, str(outside[n0:]))
    screen_checks(page, 'the consent sheet for a narrowing step')
    page.locator('[data-act=sheet-no]').click()
    page.wait_for_selector('#sheet', state='detached')
    check('"No": no narrowing card, nothing sent, and the screen says what to do', page.locator('main.simple.nocard').count() == 1 and 'Nothing was sent.' in text(page) and len(outside) == n0)
    new_q(page)

    # ---- no dead end after a "yes"
    ask_topic(page, 'body', 'Are you in pain?')
    answer(page, 'yes')
    check('"Are you in pain?" yes: the next question is the main button ("Next: Where does it hurt?")', nexts(page) == ['Where does it hurt?'] and page.locator('#next-q').is_visible())
    screen_checks(page, 'after a yes, with the next question')
    page.locator('[data-next]').first.click()
    page.wait_for_selector('main.simple.card #made-where')
    page.locator('[data-act=show]').click()
    page.wait_for_selector('main.pv .pt')
    check('the body map: two parts and "somewhere else", each with its picture', page.locator('main.pv .pt').count() == 3 and page.locator('main.pv .pt svg').count() == 3 and 'Where does it hurt?' in text(page))
    page.locator('main.pv .pt', has_text='somewhere else').click()
    page.locator('main.pv .pt', has_text='somewhere else').click()
    page.wait_for_selector('main.pv .pt >> text=arms')
    page.locator('main.pv .pt', has_text='arms').click()
    page.wait_for_selector('main.pv .pt >> text=your left arm')
    check('the body map names left and right: "your left arm", "your right arm"', page.locator('main.pv .pt').all_inner_texts()[:2] == ['your left arm', 'your right arm'])
    page.locator('main.pv .pt', has_text='somewhere else').click()
    page.wait_for_selector('main.pv .pt >> text=hands')
    page.locator('main.pv .pt', has_text='hands').click()
    page.locator('[data-confirm=yes]').click()
    page.locator('.p-give').click()
    page.wait_for_selector('main.simple.s-answered')
    check('a part with two sides: "How bad is the pain?" is the main button, "Which side? Left or right?" is offered under it', nexts(page) == ['How bad is the pain?', 'Which side? Left or right?'], str(nexts(page)))
    page.locator('[data-next]', has_text='How bad').click()
    page.wait_for_selector('main.simple.card #made-where')
    check('the pain scale: three steps and "not sure", made by the rules', page.locator('#person .pt').all_inner_texts() == ['a little', 'quite bad', 'very bad', 'not sure'] and page.locator('#made-where').get_attribute('data-maker') == 'code', str(page.locator('#person .pt').all_inner_texts()))
    screen_checks(page, 'the pain scale, before handing over')
    answer(page, 'very bad')
    check('the third question of a conversation ends it with what to do: "Very bad. Call their nurse or doctor now. …"', 'Call their nurse or doctor now.' in text(page, '#do-now') and nexts(page) == [], text(page)[:300])
    new_q(page)
    ask_topic(page, 'body', 'too hot or too cold')
    check('hot or cold has a neutral answer: hot, cold, just right', page.locator('#person .pt').all_inner_texts() == ['hot', 'cold', 'just right', 'something else'], str(page.locator('#person .pt').all_inner_texts()))
    new_q(page)
    ask_topic(page, 'feel', 'Is something bothering you?')
    answer(page, 'yes')
    check('Feelings, after "yes": no dead end ("What is bothering you? Your body, people, or plans?")', nexts(page) == ['What is bothering you? Your body, people, or plans?'])
    page.locator('#another').scroll_into_view_if_needed()
    page.locator('[data-next]').first.click()
    page.wait_for_selector('main.simple.card #made-where')
    check('that question is one idea with three answers and a way out, made by the rules', page.locator('#person .pt').all_inner_texts() == ['body', 'people', 'plans', 'something else'] and page.locator('#made-where').get_attribute('data-maker') == 'code')
    page.locator('[data-act=show]').click()
    page.wait_for_selector('main.pv .pt')
    hold_exit(page)
    page.wait_for_selector('main.simple.card', timeout=4000)
    check("a press and hold on the carer's control goes back before any answer", page.locator('main.simple.card').count() == 1)
    page.locator('[data-act=show]').click()
    page.wait_for_selector('main.pv #exit')
    page.locator('#exit').focus()
    page.keyboard.press('Enter')
    page.wait_for_selector('main.simple.card', timeout=4000)
    check('with a keyboard, Enter on it goes back too', page.locator('main.simple.card').count() == 1)
    new_q(page)
    ask_topic(page, 'people', 'call someone')
    answer(page, 'yes')
    check('"Do you want to call someone?" yes, nobody in About them: a field for one name', page.locator('#who #who-name').is_visible())
    page.fill('#who-name', 'Tyler')
    page.locator('#who button').click()
    page.wait_for_selector('main.simple.card #made-where')
    check('the name becomes one yes / no question, made by the rules', 'Would you like to call Tyler? Yes, no, or not sure?' in text(page) and page.locator('#made-where').get_attribute('data-maker') == 'code')
    new_q(page)
    page.wait_for_selector('main.simple.home')

    # ---- an open question: the sheet, and nothing asked of any other host before a yes
    before = len(outside)
    page.locator('.topic[data-topic=plans]').click()
    check('the one open question in the topics is tagged "needs internet"', text(page, '#ai-tag') == 'needs internet' and page.locator('.tag.net').count() == 1)
    page.locator('.tq', has_text='this weekend').click()
    page.wait_for_selector('#sheet')
    sheet = text(page, '#sheet')
    check('an open question on a phone with online help off brings up the consent sheet (a dialog over an inert screen)',
          page.locator('#sheet[role=dialog][aria-modal=true]').count() == 1 and page.locator('main.simple[inert]').count() == 1 and page.evaluate("document.activeElement && document.activeElement.id") == 'sheet-h')
    check('the sheet shows the exact line that would go', page.locator('#sheet-line').inner_text().strip() == f'Partner asks: {OPEN_Q}', page.locator('#sheet-line').inner_text())
    check('the sheet says what is sent (the line and the fixed instructions; names can be missed), what is never sent, and the data use; never "nothing else"',
          all(s in sheet for s in ["fixed instructions", 'can be missed', 'leave out health details', 'Never sent:', 'who lives at home', 'the answers they chose', "Google's free tier: Google may use what is sent", "Google's Gemini, through Firebase AI Logic", 'This phone has no AI of its own']) and 'nothing else' not in sheet.lower() and 'only the question' not in sheet.lower(), sheet)
    yes = page.locator('[data-act=sheet-yes]').bounding_box()
    no = page.locator('[data-act=sheet-no]').bounding_box()
    check('the sheet: "Yes" and "No" are the same size, at least 60 px tall, and both are on the screen without scrolling', abs(yes['height'] - no['height']) < 1 and yes['height'] >= 60 and abs(yes['width'] - no['width']) < 1 and no['y'] + no['height'] <= 844, f"{yes} {no}")
    check('showing the sheet asked nothing of any other host', len(outside) == before, str(outside[before:]))
    screen_checks(page, 'the consent sheet')
    page.keyboard.press('Escape')
    page.wait_for_selector('#sheet', state='detached')
    nocard = text(page)
    check('Escape is "No": the sheet closes, there is no card, and the screen says so and what to do', page.locator('main.simple.nocard').count() == 1 and 'No card for this one' in nocard and 'Just ask it normally and give time.' in nocard and 'No card was made. Nothing was sent.' in nocard, nocard[:300])
    check('still nothing asked of any other host', len(outside) == before, str(outside[before:]))
    screen_checks(page, 'no card', primary=False)
    page.locator('[data-act=sheet]').click()
    page.wait_for_selector('#sheet')
    page.locator('[data-act=sheet-no]').click()
    page.wait_for_selector('#sheet', state='detached')
    check('"Use online help for this question" brings the sheet back; "No, not for this question" closes it again', page.locator('main.simple.nocard').count() == 1 and len(outside) == before)
    if not live:
        page.locator('[data-act=sheet]').click()
        page.wait_for_selector('#sheet')
        page.locator('[data-act=sheet-yes]').click()
        page.wait_for_selector('#sheet', state='detached')
        page.wait_for_selector('#made-where', timeout=90000)
        w = page.locator('#made-where')
        line = text(page, '#made-where')
        check('"Yes" asks the question again at once, through cloud help (other hosts are asked only now)', len(outside) > before, f'{len(outside) - before} request(s)')
        check('with every other host refused, cloud help fails: no card, and the line does not say "nothing was sent"',
              w.get_attribute('data-maker') == 'none' and ((w.get_attribute('data-left') == 'maybe' and 'may have left this phone' in line and 'Nothing was sent' not in line) or (w.get_attribute('data-left') == 'nothing')), line)
        maybe = w.get_attribute('data-left') == 'maybe'
        new_q(page)
        page.wait_for_selector('main.simple.home')
        foot = text(page, '.foot')
        check('the first screen then no longer says "Nothing you asked has left this phone"; the AI line says online help is on', 'Nothing you asked has left' not in foot and ('may have left this phone' in foot if maybe else 'No question has left this phone.' in foot) and 'online help is on' in text(page, '#ai-line'), foot)
    else:
        new_q(page)
        page.wait_for_selector('main.simple.home')
        check('--live: "Yes" was never pressed, so this run asked nothing of any other host for a card', len(outside) == before, str(outside[before:]))

    # ---- quick needs
    page.locator('.btn.needs').click()
    page.wait_for_selector('main.pv .p-tiles.board')
    board = ys(page, 'main.pv .pt')
    check('"Needs it now?": one tap opens the board full screen: "Point to your answer", "What do you need?", eight needs two to a row and the way out', page.url.endswith('#/needs') and len(board) == 9 and board[0][1] == board[1][1] and board[0][0] < board[1][0] and board[8][2] >= 350 and 'Point to your answer What do you need?' in text(page), str(board[:3]))
    screen_checks(page, 'the needs board', primary=False)
    page.locator('main.pv .pt', has_text='toilet').click()
    page.locator('[data-confirm=yes]').click()
    page.wait_for_selector('.p-give')
    check('a need is checked and finished like any answer: "Thank you. Toilet."', text(page) == 'Thank you. Toilet. Give the phone back', text(page))
    page.locator('.p-give').click()
    page.wait_for_selector('main.simple.s-answered')
    check('back from the board: the carer sees the need and what to do ("Go now. The rest can wait.")', 'They pointed to: Toilet' in text(page) and 'Go now. The rest can wait.' in text(page) and text(page, '#left-line') == 'Nothing was sent.', text(page)[:200])
    screen_checks(page, 'after a need')

    # ---- About them
    new_q(page)
    page.locator('.foot a[href="#/about"]').click()
    page.wait_for_selector('main.about-simple')
    check('About them has the top bar: "Back" and "Talk Partner / Home"', text(page, '#s-top') == 'Back Talk Partner Home')
    page.wait_for_selector('main.about-simple')
    about = text(page)
    check('About them: four rows, "Everything here stays on this phone.", nothing required', page.locator('.rowhead').count() == 4 and 'Everything here stays on this phone.' in about and page.locator('input:not([type=file])').count() == 0, about[:200])
    page.locator('.rowhead[data-row=names]').click()
    page.fill('input[data-field=personName]', 'Frank')
    page.fill('input[data-field=partnerName]', 'Carol')
    page.locator('.rowhead[data-row=people]').click()
    page.locator('[data-act=person-add]').click()
    page.fill('input[data-person="0"][data-field=name]', 'Jenny')
    page.fill('input[data-person="0"][data-field=relation]', 'daughter')
    page.wait_for_timeout(500)
    screen_checks(page, 'About them, a row open')
    page.locator('.rowhead[data-row=foods]').click()
    page.fill('textarea[data-list=foods]', 'pot roast\nchili')
    check('About them: the rows show what was typed', 'Frank · Carol' in text(page) and 'Jenny (daughter)' in text(page), text(page)[:300])
    page.wait_for_timeout(500)
    page.locator('a.btn.primary').click()
    page.wait_for_selector('main.simple.home')
    home = text(page)
    check('the first screen now names the person: "let Frank point", "with Frank", "Show Frank the choices", "About Frank"', "When the words won't come, let Frank point." in home and 'with Frank' in home and 'Show Frank the choices' in home and 'About Frank →' in home, home[:200])
    if not page.locator('.tq', has_text='tea or coffee').count():
        page.locator('.topic[data-topic=food]').click()
    food = page.locator('.tq > span:first-child').all_inner_texts()
    check("the family's own question is added under the generic one, never in its place: tea or coffee, then pot roast or chili (tagged \"Frank's own\")", 'Would you like tea or coffee?' in food and food.index('Would you like pot roast or chili?') == food.index('Would you like tea or coffee?') + 1 and len(food) == 7 and text(page, '.tq .tag') == "Frank's own", str(food))
    page.locator('.topic[data-topic=people]').click()
    people = page.locator('.tq > span:first-child').all_inner_texts()
    check('People: one yes / no "call Jenny?" row under "Do you want to call someone?", which stays', people[people.index('Do you want to call someone?') + 1] == 'Would you like to call Jenny?' and 'Would you like a visitor today?' in people and 'Would you like to see Jenny?' in people, str(people))
    screen_checks(page, 'first screen with a name, People open')
    page.locator('.tq', has_text='call Jenny').click()
    page.wait_for_selector('main.simple.card #made-where')
    card = text(page)
    check('the carer\'s screen names the person: "Turn the phone to Frank", "Show Frank the choices", "Don\'t answer for Frank."', 'Turn the phone to Frank' in card and page.locator('[data-act=show]').inner_text().strip() == 'Show Frank the choices' and "Wait. Count to ten. Don't answer for Frank." in card and 'What Frank will see:' in card, card[:300])
    check('the call question is a yes / no about that one person', page.locator('#person .pt').all_inner_texts() == ['yes', 'no', 'not sure'] and 'Would you like to call Jenny?' in text(page, '#person'))
    navigation(page, url)
    ask_topic(page, 'people', 'call Jenny')

    # ---- inside, and back; remembered
    page.locator('[data-act=inside-card]').click()
    page.wait_for_selector('.layout #made')
    check('"How was this made?" opens the full view on the same card, its fold open', page.evaluate("document.querySelector('#made').open") is True and page.locator('#result .badge').count() == 1 and page.evaluate('document.documentElement.dataset.view') == 'full')
    check('the full view has the way back on it ("Simple view")', page.locator('.top nav .pill').is_visible() and 'Simple view' in text(page, '.top'))
    page.reload()
    page.wait_for_selector('#app > *')
    check('the full view is remembered across a reload', page.locator('.layout').count() == 1 and page.locator('main.simple').count() == 0)
    for h in ('cloud', 'how', 'feedback', 'about'):
        page.goto(url + '#/' + h)
        page.wait_for_selector('.top nav .pill')
    check('every inner page of the full view has the way back', True)
    page.locator('.top nav .pill').click()
    page.wait_for_selector('main.simple.home')
    page.wait_for_timeout(400)  # the choice of view is written to IndexedDB; the screen is drawn before that write ends
    page.reload()
    page.wait_for_selector('#app > *')
    check('"Simple view" goes back, and that is remembered too; About them is kept', page.locator('main.simple.home').count() == 1 and 'with Frank' in text(page), f'{page.url} {text(page)[:160]}')

    # judge mode by its address: the full view, with the person's card as it was
    page.goto(url + '#/demo')
    page.wait_for_selector('#result > .badge-line')
    check('/#/demo opens the full judge view directly, whatever view was chosen', page.locator('.layout').count() == 1 and page.locator('.chipgroups').count() == 1 and 'Leave judge mode' in text(page, '.top'))
    page.locator('[data-act=show]').click()
    page.wait_for_selector('main.person.full .tile')
    check("judge mode keeps the full view's own card for the person (its headline, its tiles)", page.locator('main.person.full.pv').count() == 0 and page.locator('main.person.full .headline').count() == 1)
    hold_exit(page)
    page.wait_for_selector('.layout', timeout=4000)
    page.locator('.top nav .pill').click()
    page.wait_for_selector('main.simple.home')
    check('"Simple view" in judge mode leaves it: the simple first screen, with the family\'s own About them', 'with Frank' in text(page))
    page.goto(url + '#/welcome')
    page.wait_for_selector('main.welcome')
    check('the first-run page is still there by its address', True)

    check('phone: no page error in the whole run', not errors, '; '.join(errors))
    ctx.close()


def offline(browser, url):
    """With the service worker of a production build: the same flow with the connection off."""
    ctx = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True, user_agent=PHONE_UA, service_workers='allow')
    page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(url)
    page.wait_for_selector('main.simple.home')
    try:
        page.wait_for_function('navigator.serviceWorker && navigator.serviceWorker.controller !== null', timeout=15000)
        sw = True
    except Exception:
        sw = False
    check('offline: this copy has a service worker that controls the page (a production build)', sw)
    if not sw:
        ctx.close()
        return
    page.wait_for_timeout(1500)
    ctx.set_offline(True)
    page.reload()
    page.wait_for_selector('main.simple.home', timeout=15000)
    check('offline: the first screen opens with no connection (first visit: how-to open, seven topics)', page.locator('section.how li').count() == 4 and page.locator('.topic').count() == 7)
    page.wait_for_timeout(1200)
    check('offline: the AI line says that AI needs the internet', 'You are offline, and that AI needs the internet.' in text(page, '#ai-line'), text(page, '#ai-line'))
    screen_checks(page, 'offline, first screen')
    ask_topic(page, 'food', 'tea or coffee')
    check('offline: a topic question makes its choices by the rules', page.locator('#made-where').get_attribute('data-maker') == 'code' and page.locator('#person .pt').count() == 3)
    answer(page, 'coffee')
    check('offline: topic -> question -> the person points -> check -> finish -> give back: the carer sees the answer, and the next question of the tree', text(page, '#chose') == 'Would you like tea or coffee? Coffee' and nexts(page) == ['Would you like milk in it?'], text(page)[:200])
    new_q(page)
    page.locator('.btn.needs').click()
    page.wait_for_selector('main.pv .p-tiles.board')
    check('offline: "Needs it now?" opens', page.locator('main.pv .pt').count() == 9)
    hold_exit(page)
    page.wait_for_selector('main.simple.card', timeout=4000)
    new_q(page)
    page.locator('.foot a[href="#/about"]').click()
    page.wait_for_selector('main.about-simple')
    check('offline: About them opens', page.locator('.rowhead').count() == 4)
    add_photo(page, 'tea')
    check('offline: a photo can be added with no connection (it never needed one)', page.locator('#photo-list li').count() == 1)
    page.locator('[data-act=home]').click()
    ask_topic(page, 'food', 'tea or coffee')
    check('offline: the card shows the family\'s photo for "tea"', page.locator('#person .pt img.photo.own').count() == 1)
    page.locator('[data-act=home]').click()
    page.locator('.foot a[href="#/about"]').click()
    page.wait_for_selector('main.about-simple')
    page.locator('a.btn.primary').click()
    page.wait_for_selector('main.simple.home')
    page.fill('#q', OPEN_Q)
    page.locator('#make').click()
    page.wait_for_selector('main.simple.nocard')
    check('offline: a question that needs online help gets a clear "needs the internet" state, and no sheet', page.locator('#offline').is_visible() and 'This question needs the internet, and you are offline.' in text(page) and page.locator('#sheet, [data-act=sheet]').count() == 0, text(page)[:200])
    screen_checks(page, 'offline, needs the internet', primary=False)
    ctx.set_offline(False)
    check('offline: no page error', not errors, '; '.join(errors))
    ctx.close()


def learning(browser, url):
    """What the app learns about the person, on this device, by counting: the usual choice first with a hint for the carer, the list in About them, remove and forget."""
    host = urlparse(url).hostname
    ctx = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True, user_agent=PHONE_UA, service_workers='block')
    outside = []
    ctx.route('**/*', lambda r: r.continue_() if urlparse(r.request.url).hostname in (host, None) or r.request.url.startswith(('data:', 'blob:')) else (outside.append(r.request.url), r.abort()))
    page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(url)
    page.wait_for_selector('main.simple.home')
    for n in (1, 2):
        ask_topic(page, 'food', 'tea or coffee')
        if n == 1:
            check('learning: nothing is said before three answers (no "Usually" on the first asking; tea stands first, as asked)', page.locator('#usual').count() == 0 and page.locator('#person .pt').all_inner_texts() == ['tea', 'coffee', 'something else'])
        answer(page, 'coffee')
        new_q(page)
    ask_topic(page, 'food', 'tea or coffee')
    check('learning: after two answers still nothing', page.locator('#usual').count() == 0 and page.locator('#person .pt').all_inner_texts()[0] == 'tea')
    answer(page, 'coffee')
    new_q(page)
    ask_topic(page, 'food', 'tea or coffee')
    card = text(page)
    check('learning: after coffee three times, the carer\'s screen says "Usually: coffee (3 of 3)"', text(page, '#usual') == 'Usually: coffee (3 of 3)', card[:200])
    check('learning: the usual choice is first among the choices, none is removed, and the line to say follows the same order', page.locator('#person .pt').all_inner_texts() == ['coffee', 'tea', 'something else'] and 'Would you like tea or coffee? Coffee, tea, or something else?' in card, str(page.locator('#person .pt').all_inner_texts()))
    screen_checks(page, 'learning: before handing over, with the usual choice')
    page.locator('[data-act=show]').click()
    page.wait_for_selector('main.pv .pt')
    person = text(page)
    check("learning: the person's screen shows the same choices, nothing chosen for them, and no word about what is usual", person == 'Carer: hold here to go back Point to your answer Would you like tea or coffee? coffee tea something else' and page.locator('main.pv .pt.pressed, main.pv .pt[aria-pressed=true]').count() == 0, person)
    hold_exit(page)
    page.wait_for_selector('main.simple.card')
    # the needs board, three times: what, how often, when
    new_q(page)
    for _ in range(3):
        page.locator('.btn.needs').click()
        page.wait_for_selector('main.pv .p-tiles.board')
        page.locator('main.pv .pt', has_text='drink').click()
        page.locator('[data-confirm=yes]').click()
        page.locator('.p-give').click()
        page.wait_for_selector('main.simple.s-answered')
        new_q(page)
    # ---- About them: what was learned
    page.locator('.foot a[href="#/about"]').click()
    page.wait_for_selector('main.about-simple #learned')
    lines = page.locator('#learned-list li > span:first-child').all_inner_texts()
    check('learning: About them lists what was learned, in plain words with the counts (the usual choice, and the need asked for three times)',
          len(lines) == 2 and lines[0] == '"Would you like tea or coffee": usually coffee (3 of 3).' and lines[1].startswith('Asked for "drink" on the needs board 3 times'), str(lines))
    check('learning: it says how it was learned (counted on this phone, no AI, never sent, only a hint)', 'Counted on this phone from the answers they confirmed: no AI, and it is never sent anywhere.' in text(page, '#learned') and 'they always choose for themselves' in text(page, '#learned'))
    check('learning: each line has "Keep as a fact" and "Remove", and there is "Forget everything learned"', page.locator('[data-act=learned-keep]').count() == 2 and page.locator('[data-act=learned-remove]').count() == 2 and page.locator('[data-act=learned-forget]').is_visible())
    screen_checks(page, 'learning: About them, what was learned', primary=False)
    page.locator('#learned-list li', has_text='drink').locator('[data-act=learned-keep]').click()
    page.wait_for_selector('#learned-kept')
    check('learning: "Keep as a fact" moves the line to the facts the carer kept', page.locator('#learned-list li').count() == 1 and 'Asked for "drink"' in text(page, '#learned-kept'))
    page.locator('#learned-list [data-act=learned-remove]').click()
    page.wait_for_timeout(300)
    check('learning: "Remove" takes the line away', page.locator('#learned-list').count() == 0 and 'Nothing yet.' in text(page, '#learned'))
    page.locator('[data-act=home]').click()
    ask_topic(page, 'food', 'tea or coffee')
    check('learning: after "Remove" the hint is gone and the choices are in the question\'s own order again', page.locator('#usual').count() == 0 and page.locator('#person .pt').all_inner_texts() == ['tea', 'coffee', 'something else'], str(page.locator('#person .pt').all_inner_texts()))
    page.wait_for_timeout(400)
    page.reload()
    page.wait_for_selector('main.simple.home')
    ask_topic(page, 'food', 'tea or coffee')
    check('learning: the removal is remembered across a reload', page.locator('#usual').count() == 0)
    # a shorter way through the tree
    new_q(page)
    for _ in range(3):
        page.fill('#q', 'Would you like something sweet or something savoury?')
        page.locator('#make').click()
        page.wait_for_selector('main.simple.card #made-where')
        answer(page, 'something sweet')
        new_q(page)
    page.fill('#q', 'Would you like a snack or a meal?')
    page.locator('#make').click()
    page.wait_for_selector('main.simple.card #made-where')
    answer(page, 'snack')
    sc = text(page, '#shortcut')
    check('learning: in a tree, the usual side of the next question is offered as a short question, under the main "Next" button, which stays',
          sc == 'Usually picks something sweet here (3 of 3). You can ask that first: Would you like something sweet?' and nexts(page) == ['Would you like something sweet or something savoury?'] and ys(page, '#shortcut')[0][1] > ys(page, '#next-q')[0][1], sc)
    screen_checks(page, 'learning: after an answer, with the short question')
    page.locator('#shortcut [data-short]').click()
    page.wait_for_selector('main.simple.card #made-where')
    check('learning: the short question is a yes / no, made by the rules; nothing is answered for them', page.locator('#person .pt').all_inner_texts() == ['yes', 'no', 'not sure'] and page.locator('#made-where').get_attribute('data-maker') == 'code')
    answer(page, 'yes')
    check('learning: a yes to it ends the path as that choice would ("Bring them a sweet snack. …")', text(page, '#do-now').startswith('Now: Bring them a sweet snack.'), text(page)[:200])
    check('learning: nothing was asked of any other host in the whole run', not outside, str(outside[:3]))
    check('learning: no page error', not errors, '; '.join(errors))
    ctx.close()


def add_photo(page, word, label='photos'):
    """About them is open: choose the fixture photo, frame it by hand (zoom in, drag), give it its word, save."""
    page.set_input_files('#photo-file', FIXTURE_PHOTO)
    page.wait_for_selector('#photo-sheet #crop-img')
    before = page.locator('#crop-img').get_attribute('style')
    page.locator('[data-act=photo-zoom][data-by="0.25"]').click()
    page.locator('[data-act=photo-zoom][data-by="0.25"]').click()
    box = page.locator('#crop').bounding_box()
    page.mouse.move(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)
    page.mouse.down()
    page.mouse.move(box['x'] + box['width'] / 2 - 90, box['y'] + box['height'] / 2 - 20, steps=6)
    page.mouse.up()
    after = page.locator('#crop-img').get_attribute('style')
    page.locator('[data-act=photo-use]').click()
    page.wait_for_selector('#photo-word')
    page.fill('#photo-word', word)
    page.locator('#photo-form button[type=submit]').click()
    page.wait_for_selector('#photo-sheet', state='detached')
    return before, after


def photos(browser, url):
    """The family's own photos: added in About them, framed by hand, labelled with one word, shown on the card before the drawing; kept on this device; deleted one by one and all at once."""
    host = urlparse(url).hostname
    ctx = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True, user_agent=PHONE_UA, service_workers='block')
    outside = []
    posted = []
    ctx.route('**/*', lambda r: r.continue_() if urlparse(r.request.url).hostname in (host, None) or r.request.url.startswith(('data:', 'blob:')) else (outside.append(r.request.url), r.abort()))
    page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('dialog', lambda d: d.accept())
    page.on('request', lambda r: posted.append(r.url) if r.method != 'GET' else None)
    page.goto(url + '#/about')
    page.wait_for_selector('main.about-simple #photos')
    block = text(page, '#photos')
    check('photos: About them has "Their own photos": what they are for, "No photos yet.", "Add a photo"', 'Their own photos' in block and 'A card shows it in place of the drawing wherever its word is one of the choices.' in block and 'No photos yet.' in block and page.locator('[data-act=photo-new]').is_visible(), block)
    check('photos: the privacy line says exactly where they stay: "Photos stay on this phone only. They are never sent anywhere, and no AI looks at them."', text(page, '#photos-lock') == 'Photos stay on this phone only. They are never sent anywhere, and no AI looks at them.', text(page, '#photos-lock'))
    screen_checks(page, 'photos: About them, no photos yet', primary=False)
    # ---- choose a photo, frame it by hand
    page.set_input_files('#photo-file', FIXTURE_PHOTO)
    page.wait_for_selector('#photo-sheet #crop-img')
    check('photos: a chosen photo opens "Frame the picture": a dialog over an inert screen, the picture in a square', page.locator('#photo-sheet[role=dialog][aria-modal=true]').count() == 1 and page.locator('main.about-simple[inert]').count() == 1 and abs(page.locator('#crop').bounding_box()['width'] - page.locator('#crop').bounding_box()['height']) < 1 and 'Move the picture and zoom, so the one thing fills the square.' in text(page, '#photo-sheet'))
    screen_checks(page, 'photos: frame the picture')
    style0 = page.locator('#crop-img').get_attribute('style')
    page.locator('[data-act=photo-zoom][data-by="0.25"]').click()
    page.locator('[data-act=photo-zoom][data-by="0.25"]').click()
    style1 = page.locator('#crop-img').get_attribute('style')
    box = page.locator('#crop').bounding_box()
    page.mouse.move(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)
    page.mouse.down()
    page.mouse.move(box['x'] + box['width'] / 2 - 90, box['y'] + box['height'] / 2 - 20, steps=6)
    page.mouse.up()
    style2 = page.locator('#crop-img').get_attribute('style')
    check('photos: "+" zooms in (the slider follows), and a drag moves the picture inside its square', style0 != style1 and style1 != style2 and page.locator('#crop-zoom').input_value() == '1.5', f'{style0} | {style1} | {style2}')
    page.locator('#crop').focus()
    page.keyboard.press('ArrowLeft')
    check('photos: with a keyboard the arrow keys move it', page.locator('#crop-img').get_attribute('style') != style2)
    inside = page.evaluate("(() => { const c = document.querySelector('#crop').getBoundingClientRect(); const i = document.querySelector('#crop-img').getBoundingClientRect(); return i.left <= c.left + 3 && i.top <= c.top + 3 && i.right >= c.right - 3 && i.bottom >= c.bottom - 3; })()")
    check('photos: the square is always filled by the picture (it cannot be dragged past an edge)', inside)
    page.locator('[data-act=photo-use]').click()
    page.wait_for_selector('#photo-word')
    check('photos: then "One word for it": the framed square, a field for the word, "Save photo"', 'One word for it' in text(page, '#photo-sheet') and page.evaluate("document.querySelector('#photo-framed').naturalWidth") == 320 and page.evaluate("document.querySelector('#photo-framed').naturalHeight") == 320 and page.evaluate("document.activeElement.id") == 'photo-word')
    screen_checks(page, 'photos: one word for it')
    page.locator('#photo-form button[type=submit]').click()
    check('photos: no word, no photo: "Type the word first."', text(page, '#photo-error') == 'Type the word first.' and page.locator('#photo-sheet').count() == 1)
    page.fill('#photo-word', 'Tea')
    page.locator('#photo-form button[type=submit]').click()
    page.wait_for_selector('#photo-sheet', state='detached')
    check('photos: saved: the photo stands in the list with its word and its own "Delete"', page.locator('#photo-list li').count() == 1 and page.locator('#photo-list li b').inner_text() == 'Tea' and page.locator('#photo-list [data-act=photo-del]').is_visible() and page.locator('[data-act=photo-del-all]').is_visible())
    screen_checks(page, 'photos: About them, one photo', primary=False)
    stored = page.evaluate("""() => new Promise((res) => { const r = indexedDB.open('talk-partner'); r.onsuccess = () => { const q = r.result.transaction('kv').objectStore('kv').get('photos'); q.onsuccess = () => res((q.result || []).map((p) => [p.word, p.data.slice(0, 23), p.data.length])); }; })""")
    check('photos: it is kept in IndexedDB on this device (key "photos"): one small JPEG with its word', len(stored) == 1 and stored[0][0] == 'Tea' and stored[0][1] == 'data:image/jpeg;base64,' and 2000 < stored[0][2] < 120000, str(stored))
    # ---- the card uses it
    page.locator('[data-act=home]').click()
    ask_topic(page, 'food', 'tea or coffee')
    pics = page.evaluate("[...document.querySelectorAll('#person .pt')].map((t) => t.querySelector('img.photo.own') ? 'photo' : t.querySelector('svg') ? 'drawing' : 'word')")
    check('photos: on the card the choice "tea" shows the family\'s photo, "coffee" and the way out keep their drawings', pics == ['photo', 'drawing', 'drawing'], str(pics))
    screen_checks(page, 'photos: before handing over, with a photo')
    page.locator('[data-act=show]').click()
    page.wait_for_selector('main.pv .pt')
    tile = page.evaluate("(() => { const t = document.querySelector('main.pv .pt'); const i = t.querySelector('img.photo.own').getBoundingClientRect(); const w = t.querySelector('span').getBoundingClientRect(); return { w: Math.round(i.width), h: Math.round(i.height), under: w.top >= i.bottom - 1, word: t.querySelector('span').innerText, loaded: t.querySelector('img').naturalWidth }; })()")
    check("photos: the person's screen shows the photo, at least 60 px, with the word under it", tile['w'] >= 60 and tile['h'] >= 60 and tile['under'] and tile['word'] == 'tea' and tile['loaded'] == 320, str(tile))
    screen_checks(page, "photos: the person's choices, with a photo", primary=False)
    page.locator('main.pv .pt', has_text='tea').click()
    page.wait_for_selector('[data-confirm=yes]')
    check('photos: the check ("So: tea. Right?") and the finish show the same photo', page.locator('main.pv .p-pick img.photo.own').count() == 1)
    page.locator('[data-confirm=yes]').click()
    page.wait_for_selector('.p-give')
    fin = page.locator('main.pv .p-pick img.photo.own').count() == 1
    page.locator('.p-give').click()
    page.wait_for_selector('main.simple.s-answered')
    check('photos: and so does "Thank you. Tea."', fin)
    page.wait_for_timeout(400)
    page.reload()
    page.wait_for_selector('main.simple.home')
    ask_topic(page, 'food', 'tea or coffee')
    check('photos: the photo is still there after a reload', page.locator('#person .pt img.photo.own').count() == 1)
    # ---- another word: "your glasses" matches a photo called "glasses"
    page.goto(url + '#/about')
    page.wait_for_selector('#photos')
    add_photo(page, 'glasses')
    check('photos: a second photo, "glasses"', page.locator('#photo-list li').count() == 2)
    page.locator('[data-act=home]').click()
    ask_topic(page, 'body', 'glasses or your hearing aid')
    pics = page.evaluate("[...document.querySelectorAll('#person .pt')].map((t) => t.querySelector('img.photo.own') ? 'photo' : t.querySelector('svg') ? 'drawing' : 'word')")
    check('photos: the choice "your glasses" shows the photo called "glasses" (the word is compared without "your")', pics == ['photo', 'drawing', 'drawing'], str(pics))
    # ---- delete one, delete all
    page.goto(url + '#/about')
    page.wait_for_selector('#photo-list')
    page.locator('#photo-list li', has_text='Tea').locator('[data-act=photo-del]').click()
    page.wait_for_timeout(300)
    check('photos: "Delete" on one photo takes that one away', page.locator('#photo-list li').count() == 1 and page.locator('#photo-list li b').inner_text() == 'glasses')
    page.locator('[data-act=home]').click()
    ask_topic(page, 'food', 'tea or coffee')
    check('photos: the choice "tea" is the drawing again', page.locator('#person .pt img').count() == 0 and page.locator('#person .pt svg').count() == 3)
    page.goto(url + '#/about')
    page.wait_for_selector('#photo-list')
    add_photo(page, 'coffee')
    page.locator('[data-act=photo-del-all]').click()
    page.wait_for_selector('#photos-none')
    left = page.evaluate("""() => new Promise((res) => { const r = indexedDB.open('talk-partner'); r.onsuccess = () => { const q = r.result.transaction('kv').objectStore('kv').get('photos'); q.onsuccess = () => res((q.result || []).length); }; })""")
    check('photos: "Delete all photos" (after a yes) leaves none, on the screen and in IndexedDB', page.locator('#photo-list').count() == 0 and left == 0, str(left))
    # ---- "Delete everything on this phone"
    page.locator('.rowhead[data-row=names]').click()
    page.fill('input[data-field=personName]', 'Frank')
    add_photo(page, 'Frank')
    page.wait_for_timeout(500)
    check('photos: "Delete everything on this phone" is on About them', page.locator('#delete-everything').inner_text().strip() == 'Delete everything on this phone')
    page.locator('#delete-everything').click()
    page.wait_for_selector('main.simple.home')
    keys = page.evaluate("""() => new Promise((res) => { const r = indexedDB.open('talk-partner'); r.onsuccess = () => { const q = r.result.transaction('kv').objectStore('kv').getAllKeys(); q.onsuccess = () => res(q.result); }; })""")
    check('photos: "Delete everything" (after a yes) empties the app\'s storage: the name, the photos and the rest are gone', 'photos' not in keys and 'profile' not in keys and 'with Frank' not in text(page), str(keys))
    check('photos: in the whole run nothing was asked of any other host, and nothing was posted anywhere (a photo never left the page)', not outside and not posted, f'{outside[:2]} {posted[:2]}')
    check('photos: no page error', not errors, '; '.join(errors))
    ctx.close()


def words(browser, url, ua, word, label, width, height):
    host = urlparse(url).hostname
    ctx = browser.new_context(viewport={'width': width, 'height': height}, service_workers='block', **({'user_agent': ua} if ua else {}))
    ctx.route('**/*', lambda r: r.continue_() if urlparse(r.request.url).hostname in (host, None) or r.request.url.startswith(('data:', 'blob:')) else r.abort())
    page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(url)
    page.wait_for_selector('main.simple.home')
    page.wait_for_timeout(7000)
    home = text(page)
    others = [w for w in ('phone', 'tablet', 'computer') if w != word]
    check(f'{label}: the first screen says "this {word}" and "Turn the {word} to them"', f'Nothing you asked has left this {word}.' in home and f'Turn the {word} to them and say it out loud' in home and not any(f'this {o}' in home or f'the {o} ' in home for o in others), home[-300:])
    screen_checks(page, f'{label}, first screen')
    ask_topic(page, 'food', 'tea or coffee')
    check(f'{label}: the carer\'s screen says "Made by the app\'s rules on this {word}" and "Turn the {word} to them"', f"Made by the app's rules on this {word}." in text(page, '#made-where') and f'Turn the {word} to them' in text(page))
    screen_checks(page, f'{label}, before handing over')
    answer(page, 'tea')
    more(page)
    check(f'{label}: the carer sees the answer, and "More" says the answers are kept on this {word} only', text(page, '#chose') == 'Would you like tea or coffee? Tea' and f'this {word} only' in text(page))
    screen_checks(page, f'{label}, after an answer')
    new_q(page)
    ask_topic(page, 'plans', 'this weekend')
    if page.locator('#sheet').count():
        check(f'{label}: the sheet says "This {word} has no AI of its own"', f'This {word} has no AI of its own' in text(page, '#sheet'))
        b = page.locator('[data-act=sheet-no]').bounding_box()
        check(f'{label}: the sheet\'s two buttons are on the screen', b['y'] + b['height'] <= height, str(b))
        page.locator('[data-act=sheet-no]').click()
    if not page.locator('[data-act=inside-card]').count():
        more(page)
    page.locator('[data-act=inside-card]').click()
    page.wait_for_selector('.layout')
    full = text(page)
    check(f'{label}: the full view uses the same word', f'this {word}' in full and not any(f'this {o}' in full for o in others), full[:300])
    check(f'{label}: no page error', not errors, '; '.join(errors))
    ctx.close()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--url', default='http://localhost:5179/')
    ap.add_argument('--live', action='store_true', help='a hosted copy: never press "Yes" on the sheet, so nothing is sent')
    ap.add_argument('--dev', action='store_true', help='the dev server: it has no service worker, so the offline run is left out (and said so)')
    a = ap.parse_args()
    url = a.url if a.url.endswith('/') else a.url + '/'
    print(f'url: {url}')
    with sync_playwright() as p:
        browser = p.chromium.launch()
        print(f'browser: Chromium {browser.version} (headless)')
        phone(browser, url, a.live)
        learning(browser, url)
        photos(browser, url)
        if a.dev:
            print('SKIP  offline: --dev (the dev server has no service worker; run against a production build)')
        else:
            offline(browser, url)
        words(browser, url, None, 'computer', 'desktop, 1440 x 900', 1440, 900)
        words(browser, url, TABLET_UA, 'tablet', 'tablet, 800 x 1280', 800, 1280)
        browser.close()
    bad = results.count(False)
    print(f'\n{len(results) - bad} of {len(results)} checks passed')
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
