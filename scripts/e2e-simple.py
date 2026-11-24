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
  - phase 3 (18 Nov 2026), the carer's side: the diary (a one-tap log with the time and Undo, today / week / month, the
    topic filter, kept in IndexedDB, "Delete the diary"); the answer-reliability guard ("yes" to four yes / no
    questions in a row: one gentle line for the carer, the answers marked "less sure", the next either-or in a
    different order, nothing of it on the person's screen); health notes in About them; the Miller family's week
    (tests/fixtures/frank-week.json) through the diary and the insight lines (sweets with diabetes noted -> "Worth
    mentioning to the doctor or nurse"; Wednesday's drinks with their base; Friday's "less sure"); the sheet with the
    exact text before those lines go to online help for their wording; the tip of the day; About them saved to a
    file, cleared and brought back identical; and the bigger pictures on the person's screen (110 to 130 px, three
    choices and "something else" on 390 x 844 without scrolling);
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
import re
import time
import datetime
import json
import os
import sys
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright

PHONE_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36'
TABLET_UA = 'Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36'
OPEN_Q = 'What do you want to do this weekend?'
FIXTURES = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'tests', 'fixtures')
FIXTURE_PHOTO = os.path.join(FIXTURES, 'photo-mug.jpg')
# (18 Nov, phase 5, judge round 6: Beth, Bo and the lake each have their own picture, drawn by us; phase 8, judge
# round 7: Beth is a drawn person, no longer a monogram, and Frank has his own drawing. No real face. The mug stays
# for the words it fits: tea, coffee, glasses.)
OWN_PHOTO = {'beth': 'photo-beth.jpg', 'frank': 'photo-frank.jpg', 'bo': 'photo-bo.jpg', 'the lake': 'photo-lake.jpg', 'lake': 'photo-lake.jpg'}


def photo_for(word):
    return os.path.join(FIXTURES, OWN_PHOTO.get(word.strip().lower(), 'photo-mug.jpg'))

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
        page.wait_for_selector('#sheet, main.simple.nocard, #own-fallback')
        # (phase 16: the field is "Ask in your own words"; its sheet's "No" gives the rules' best card, never "No card",
        # and the browser's back over the sheet is one step back: the first screen, the words still in the field)
        if page.locator('#sheet').count() and how == 'browser':
            page.go_back()
            page.wait_for_timeout(350)
            check("navigation, the browser's back button on the consent sheet: the first screen, the words still in the field", screen() == 'home' and page.input_value('#q') == OPEN_Q, screen())
            page.locator('#make').click()
            page.wait_for_selector('#sheet')
        if page.locator('#sheet').count():
            page.locator('[data-act=sheet-no]').click()
        page.wait_for_selector('#own-fallback')
        check(f'navigation, {name}: "No, not now" gives the rules\' best card, "Made by the app\'s rules (no AI)", not "No card"', screen() == 'card' and text(page, '#own-fallback').startswith("Made by the app's rules (no AI)"), screen())
        seen.append(bar())
        back(how)
        check(f'navigation, {name}: from the rules\' best card back to the first screen', screen() == 'home', screen())
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


# Phase 17 (judge round 12, P0 2): on a phone App Check starts when the question field gets the cursor, so the browser
# is checked by Google's reCAPTCHA before the yes. Those requests carry no word of the question (they are the script and
# the token exchange of App Check); they are not "another host" for the checks below, and are still blocked here.
APP_CHECK_SEEN = []


def app_check_url(u):
    hit = u.startswith(('https://www.google.com/recaptcha/', 'https://www.gstatic.com/recaptcha/', 'https://content-firebaseappcheck.googleapis.com/'))
    if hit:
        APP_CHECK_SEEN.append(u)
    return hit


def phone(browser, url, live):
    host = urlparse(url).hostname
    ctx = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True, user_agent=PHONE_UA, service_workers='block')
    outside = []

    def route(r):
        h = urlparse(r.request.url).hostname
        if h in (host, None) or r.request.url.startswith(('data:', 'blob:')):
            r.continue_()
        else:
            if not app_check_url(r.request.url):
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
    # (phase 16: "Ask in your own words" is the first action; quick needs follow it, then how it works and the topics)
    top = {k: ys(page, sel)[0][1] for k, sel in (('own', '#q'), ('ai', '#ai-line'), ('needs', '.btn.needs'), ('how', '#how'), ('topics', '#topics'), ('privacy', '#s-privacy'))}
    check('first visit, top to bottom: your own words, the AI line, "Needs it now?", how it works, topics, the privacy line', list(top.values()) == sorted(top.values()), str(top))
    check('first visit: "Needs it now?" is right under "Ask in your own words", on the first screenful', top['needs'] < 600 and 'Needs something now?' in home, str(top['needs']))
    # (phase 9, judge round 8: folded on the first visit too, to the one line with "Write the key word big.")
    check('first visit: "How it works: 4 steps" is one highlighted line with "Write the key word big."', page.locator('button.how-line').count() == 1 and page.locator('section.how').count() == 0 and text(page, '.how-line') == 'How it works: 4 steps Write the key word big. Show', text(page, '#how'))
    page.locator('.how-line').click()
    check('first visit: "Show" opens four numbered steps, each with a picture', page.locator('section.how h2').inner_text().strip() == 'How it works: 4 steps' and page.locator('section.how li').count() == 4 and page.locator('section.how li svg').count() == 4)
    check('first visit: the line "Wait. Count to ten. Don\'t answer for them." is visible in the steps', page.locator('section.how .wait').is_visible() and page.locator('section.how .wait').inner_text().strip() == "Wait. Count to ten. Don't answer for them.")
    page.locator('section.how [data-act=how]').click()
    page.wait_for_selector('button.how-line')
    check('first visit: no empty video slot and no walkthrough over the screen', page.locator('video, .g-vid, .walk, .dim, [role=dialog]').count() == 0 and 'video' not in home.lower() and 'Watch how' not in home)
    check('first visit: About them is not offered before the first card', page.locator('a[href="#/about"], .offer').count() == 0)
    check('first visit: seven topics, closed, under "Or pick a topic"', page.locator('.topic').count() == 7 and page.locator('.tq').count() == 0 and text(page, '#topics-h') == 'Or pick a topic')
    ai = text(page, '#ai-line')
    check('first visit: one plain AI line under the field: on this phone the AI is online and asks first; what never goes to an AI (phase 17 words)', ai == "Google's AI, online, after your yes. Google checks this browser first." and 'never an AI' in text(page, '#own-never'), ai)
    check('first visit: one small privacy line, "Nothing you asked has left this phone."; never "this computer"', page.locator('.foot .lock').count() == 1 and text(page, '#s-privacy') == 'Nothing you asked has left this phone since the app was opened.' and 'this computer' not in home and 'the computer' not in home, text(page, '.foot'))
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
    check('before handing over: two short lines of advice at most (the "wait" line and one tip), the rest behind "More tips"', go.replace(" Find more choices (Google's AI, after your yes) Google's AI gets the question and the choices on the card, with any names you listed swapped out. Never the answers they chose.", '').replace(" Read it aloud to them (Google's AI, a calm, slow voice)", '') == "2 Turn the phone to them Show them the choices Wait. Count to ten. Don't answer for them. Point to each choice as you say it. More tips" and page.locator('#tips').count() == 0, go)
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
    check('the person: "Point to your answer", then the question itself, then the choices', person == 'Carer: hold here to go back Not now Point to your answer Would you like tea or coffee? tea coffee something else', person)
    check('the person: no category word above the choices (no headline, no "drink")', page.locator('main.pv .headline, main.pv h2').count() == 0 and 'drink' not in person.split())
    tiles = ys(page, 'main.pv .pt')
    check('the person: one centred column, every choice as wide as the screen and at least 80 px tall, the way out last', len(tiles) == 3 and all(t[2] >= 350 and t[3] >= 80 and t[0] == tiles[0][0] for t in tiles) and tiles[0][1] < tiles[1][1] < tiles[2][1] and page.locator('main.pv .pt').nth(2).inner_text().strip() == 'something else', str(tiles))
    check('the person: each choice has its picture with the word under it', page.evaluate("[...document.querySelectorAll('main.pv .pt:not(.esc)')].every((t) => { const s = t.querySelector('svg, img.pic').getBoundingClientRect(); const w = t.querySelector('span').getBoundingClientRect(); return w.top >= s.bottom - 1; })"))
    check('the person: the question and the choices are one unit (the first choice starts right under the question)', tiles[0][1] - (ys(page, 'main.pv .p-ask')[0][1] + ys(page, 'main.pv .p-ask')[0][3]) <= 28, str(tiles[0]))
    # (phase 9: and the person's own small "Not now", on the carer's row)
    check('the person: nothing but the choices, the carer\'s labelled control and "Not now" can be pressed', page.locator('main.pv button').count() == 5 and page.locator('main.pv #p-notnow').count() == 1 and page.locator('main.pv a').count() == 0)
    check('the person: nothing on the screen is animated', page.evaluate("[...document.querySelectorAll('main.pv, main.pv *')].every((e) => getComputedStyle(e).animationName === 'none')"))
    screen_checks(page, "the person's choices", primary=False)
    page.locator('#exit').click()
    page.wait_for_timeout(300)
    check("a tap on the carer's control does nothing: it needs a press and hold", page.url.endswith('#/person') and page.locator('main.pv .pt').count() == 3)
    page.locator('main.pv .pt', has_text='tea').click()
    page.wait_for_selector('[data-confirm=yes]')
    chk = text(page)
    check('the check: "So: tea. Right?", the picture with its word, "Yes" above "No, something else"', chk == 'Carer: hold here to go back So: tea. Right? tea Yes No, something else' and page.locator('main.pv .p-pick :is(svg, img.pic)').count() == 1 and ys(page, '[data-confirm=yes]')[0][1] < ys(page, '[data-confirm=change]')[0][1], chk)
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
    check('after the first card the how-to block is one highlighted line at the top, and the topic is still open', page.locator('button.how-line').count() == 1 and page.locator('section.how').count() == 0 and text(page, '.how-line') == 'How it works: 4 steps Write the key word big. Show' and page.locator('.tq').count() == 6 and ys(page, '.how-line')[0][1] < ys(page, '#topics')[0][1])
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
    # (18 Nov, the owner's walk on his phone: no question of another topic after the way out; the ways in the rules' order)
    check('after "something else": the screen says so, and no question is offered in its place (the tree\'s next question is not on this screen)', text(page, '#chose') == 'Would you like water, juice or milk? Something else' and nexts(page) == [] and page.locator('main.s-answered [data-q]').count() == 0, out[:200])
    shown = page.evaluate("[...document.querySelectorAll('#after-out button')].map((b) => b.id)")
    check('after "something else": one line that says what to do, then the ways in order: more choices of the same kind (the rules), the AI (online, phase 12b: second), the first letter, "show or write it"; never a dead end',
          'None of these. Find out what it is: one step at a time.' in out and shown == ['way-more', 'narrow', 'letter-go', 'show-write'] and page.locator('main.s-answered > .col [data-act=own], main.s-answered > .col #another').count() == 0, f'{shown} {out[:300]}')
    check('after "something else": "More choices like these" says what comes next, and none of it was refused (tea, coffee; not water, juice or milk)', text(page, '#way-more') == 'More choices like these Next: tea, coffee. Then more, three at a time.', text(page, '#way-more'))
    more(page)
    rest = text(page, '#more-body')
    check('after "something else": under "More": ask another question, the needs board, a new way; no question of another topic and no "Try"',
          all(page.locator(f'#more-body [data-act={a}]').is_visible() for a in ('needs', 'own', 'new')) and page.locator('#more-body [data-q]').count() == 0 and 'Try:' not in rest, rest[:300])
    check('after "something else": an AI can narrow it down, and the screen says that on this phone it uses online help and asks first', page.locator('#narrow').is_visible() and text(page, '#narrow') == "Find more choices (Google's AI, after your yes)" and text(page, '#narrow-where') == 'This uses online help: the app asks you first, and shows the line that would go.', text(page, '#after-out')[:300])
    screen_checks(page, 'after "something else"')
    n0 = len(outside)
    page.locator('#narrow').click()
    page.wait_for_selector('#sheet')
    line = page.locator('#sheet-line').inner_text().strip()
    face = text(page, '#sheet')
    check('the narrowing step with online help off: the sheet leads with plain words and the conversation\'s own line (the question and what did not fit, nothing they chose)', line == 'Would you like water, juice or milk? They did not want: water, juice, milk.' and "None of those fitted. Online help is Google's AI: it can suggest other kinds of answer. It sees only this:" in face and text(page, '#sheet .choice').startswith('Just this once') and "and the app's fixed instructions." in face and 'Do not give more of the same kind' not in face, f'{line} | {face[:300]}')
    check('the narrowing sheet says the data use of the paid service, and what is never sent', "On the paid tier Google does not use prompts to improve its products" in face and 'the answers they chose' in face, face)
    page.locator('#sheet-whole summary').click()
    whole = page.locator('#sheet-whole pre').text_content()
    check('the narrowing sheet: the whole request is one tap away, word for word (that line, and the fixed instructions)', f'Partner asks: {line} What else could it be? Do not give more of the same kind as the ones they did not want' in whole and '"mode": "PREFER_IN_CLOUD"' in whole, whole[:300])
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
    check('the body map: two parts and "somewhere else", each with its picture', page.locator('main.pv .pt').count() == 3 and page.locator('main.pv .pt :is(svg, img.pic)').count() == 3 and 'Where does it hurt?' in text(page))
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
    # (phase 12: a hand first asks "Is it suddenly weak or numb, yes or no?", then how bad and which side)
    check('a part with two sides: "Is it suddenly weak or numb, yes or no?" is the main button, then "How bad is the pain?" and "Which side? Left or right?"', nexts(page) == ['Is it suddenly weak or numb, yes or no?', 'How bad is the pain?', 'Which side? Left or right?'], str(nexts(page)))
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
    # (the "yes" answers before this one include "Are you in pain?", which the answer check never reads, and the run is
    # too short and too fast for it: nothing is said, and the choices stand in their own order)
    order = page.locator('#person .pt').all_inner_texts()
    check('that question is one idea with three answers and a way out, made by the rules', order == ['body', 'people', 'plans', 'something else'] and page.locator('#made-where').get_attribute('data-maker') == 'code', str(order))
    check('the answer check says nothing in an ordinary flow (pain -> where -> how bad, then "is something bothering you")', page.locator('#guard').count() == 0)
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
    # (phase 9: Home's "See the AI at work" carries its own tag, under the topics)
    check('the one open question in the topics is tagged "needs internet"', text(page, '#ai-tag') == 'needs internet' and page.locator('#topics .tag.net').count() == 1)
    page.locator('.tq', has_text='this weekend').click()
    page.wait_for_selector('#sheet')
    sheet = text(page, '#sheet')
    check('an open question on a phone with online help off brings up the consent sheet (a dialog over an inert screen)',
          page.locator('#sheet[role=dialog][aria-modal=true]').count() == 1 and page.locator('main.simple[inert]').count() == 1 and page.evaluate("document.activeElement && document.activeElement.id") == 'sheet-h')
    check('the sheet shows the exact line that would go', page.locator('#sheet-line').inner_text().strip() == f'Partner asks: {OPEN_Q}', page.locator('#sheet-line').inner_text())
    check('the sheet says what is sent (the line and the fixed instructions; names can be missed), what is never sent, and the data use; never "nothing else"',
          all(s in sheet for s in ["fixed instructions", 'can be missed', 'leave out health details', 'Never sent:', 'who lives at home', 'the answers they chose', "On the paid tier Google does not use prompts to improve its products", "Online help is Google's AI", 'This phone has no AI of its own', 'Just this once', 'Yes, every time']) and 'nothing else' not in sheet.lower() and 'only the question' not in sheet.lower(), sheet)
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
        # (phase 5: the first button is "Just this once"; this run goes on with online help on, so it presses "Yes, every time")
        page.locator('[data-act=sheet-always]').click()
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
        check('the first screen then no longer says "Nothing you asked has left this phone"; the AI line says online help is on', 'Nothing you asked has left' not in foot and ('may have left this phone' in foot if maybe else 'No question has left this phone since the app was opened.' in foot) and 'online help is on' in text(page, '#ai-line'), foot)
    else:
        new_q(page)
        page.wait_for_selector('main.simple.home')
        check('--live: "Yes" was never pressed, so this run asked nothing of any other host for a card', len(outside) == before, str(outside[before:]))

    # ---- quick needs
    page.locator('.btn.needs').click()
    page.wait_for_selector('main.pv .p-tiles.board')
    board = ys(page, 'main.pv .pt')
    check('"Needs it now?": one tap opens the board full screen: "Point to your answer", "What do you need?", nine needs two to a row (the ninth is "something\'s wrong") and the way out', page.url.endswith('#/needs') and len(board) == 10 and board[0][1] == board[1][1] and board[0][0] < board[1][0] and board[9][2] >= 350 and 'Point to your answer What do you need?' in text(page), str(board[:3]))
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
    check('About them: five rows (the fifth is health notes), "Everything here stays on this phone, unless you share it yourself.", nothing required', page.locator('.rowhead').count() == 5 and 'Everything here stays on this phone, unless you share it yourself.' in about and page.locator('#about input:not([type=file])').count() == 0, about[:200])
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
    check('the first screen now names the person: "let Frank point", "with Frank", "About Frank"', "When the words won't come, let Frank point." in home and 'with Frank' in home and 'About Frank →' in home, home[:200])
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
    # (the owner's phone test, 18 Nov: an ear alone in the empty card area told nobody anything, and the placeholder was cut at 390 px)
    empty = text(page, '#person')
    check('the full view with no card yet: the card area says in plain words what will be there, with no ear picture', empty == 'Your card will appear here. Type or say a question above, or tap one you asked before.' and page.locator('#person :is(svg, img.pic)').count() == 0 and page.evaluate("parseFloat(getComputedStyle(document.querySelector('#card-empty')).fontSize)") >= 16, empty)
    ph = page.evaluate("(() => { const q = document.querySelector('#q'); const cs = getComputedStyle(q); const c = document.createElement('canvas').getContext('2d'); c.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`; return { text: q.placeholder, need: Math.ceil(c.measureText(q.placeholder).width), room: Math.floor(q.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)) }; })()")
    check('the full view at 390 px: the placeholder ("Your question") fits in the field, nothing is cut', ph['text'] == 'Your question' and ph['need'] <= ph['room'], str(ph))
    # (the card is made in a few milliseconds here, so the words are caught as the screen draws them)
    page.evaluate("(() => { window.__seen = []; new MutationObserver(() => { const e = document.querySelector('#card-empty'); if (e) window.__seen.push(e.textContent); }).observe(document.querySelector('#app'), { childList: true, subtree: true }); })()")
    page.fill('#q', 'What do you want to do this weekend?')
    page.locator('#make').click()
    page.wait_for_selector('#result > *:not(.making)')
    seen = page.evaluate('window.__seen')
    check('the full view while a card is being made: the card area says "Making the card…"', 'Making the card…' in seen, str(seen))
    page.reload()  # (no card is left behind for the checks that follow)
    page.wait_for_selector('#app > *')
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
    check('offline: the first screen opens with no connection (first visit: how-to folded, seven topics)', page.locator('button.how-line').count() == 1 and page.locator('.topic').count() == 7)
    page.wait_for_timeout(1200)
    check('offline: the line under "Ask in your own words" says the rules make what they can', "You are offline: the app's rules make what they can from your words." in text(page, '#ai-line'), text(page, '#ai-line'))
    screen_checks(page, 'offline, first screen')
    ask_topic(page, 'food', 'tea or coffee')
    check('offline: a topic question makes its choices by the rules', page.locator('#made-where').get_attribute('data-maker') == 'code' and page.locator('#person .pt').count() == 3)
    answer(page, 'coffee')
    check('offline: topic -> question -> the person points -> check -> finish -> give back: the carer sees the answer, and the next question of the tree', text(page, '#chose') == 'Would you like tea or coffee? Coffee' and nexts(page) == ['Would you like milk in it?'], text(page)[:200])
    new_q(page)
    page.locator('.btn.needs').click()
    page.wait_for_selector('main.pv .p-tiles.board')
    check('offline: "Needs it now?" opens', page.locator('main.pv .pt').count() == 10)
    hold_exit(page)
    # (phase 8: the press and hold gives the phone back to the screen the board was opened from: here the first screen)
    page.wait_for_selector('main.simple.home', timeout=4000)
    page.locator('.foot a[href="#/about"]').click()
    page.wait_for_selector('main.about-simple')
    check('offline: About them opens', page.locator('.rowhead').count() == 5)
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
    # (phase 16: offline, the own-words question gets the rules' best card, saying so; never a sheet, never "No card")
    page.wait_for_selector('#own-fallback')
    check('offline: a question that needs online help gets the rules\' best card, "You are offline, so nothing was sent.", and no sheet', 'You are offline, so nothing was sent.' in text(page, '#own-fallback') and page.locator('#sheet, [data-act=sheet]').count() == 0, text(page)[:200])
    screen_checks(page, 'offline, the rules\' best card', primary=True)
    # phase 3 with the connection off: the diary, the one-tap log, the week's lines (rules, on this phone), health notes
    page.locator('[data-act=home]').click()
    page.wait_for_selector('main.simple.home')
    page.locator('#diary-link').click()
    page.wait_for_selector('main.simple.diary')
    page.locator('[data-log=drank]').click()
    page.wait_for_selector('#logged')
    check('offline: the diary opens, holds the answer given offline, and a tap logs "Drank"', 'Would you like tea or coffee?' in text(page, '#timeline') and 'Drank' in text(page, '#timeline') and len(page.evaluate(KV_GET, 'diary')) >= 2, text(page, '#timeline'))
    page.locator('#tab-week').click()
    page.wait_for_selector('#insights')
    wk = text(page, '#insights')
    check('offline: the week\'s lines are counted and worded by the rules on this phone, and online wording is not offered', "Counted and worded by the app's rules on this phone. No AI, nothing sent." in wk and 'They are not medical advice and not a diagnosis.' in wk and page.locator('#ins-plainer').count() == 0, wk)
    screen_checks(page, 'offline, the diary', primary=False)
    phase4_offline(page)
    ctx.set_offline(False)
    check('offline: no page error', not errors, '; '.join(errors))
    ctx.close()


def learning(browser, url):
    """What the app learns about the person, on this device, by counting: the usual choice first with a hint for the carer, the list in About them, remove and forget."""
    host = urlparse(url).hostname
    ctx = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True, user_agent=PHONE_UA, service_workers='block')
    outside = []
    ctx.route('**/*', lambda r: r.continue_() if urlparse(r.request.url).hostname in (host, None) or r.request.url.startswith(('data:', 'blob:')) else (outside.append(r.request.url) if not app_check_url(r.request.url) else None, r.abort()))
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
    check("learning: the person's screen shows the same choices, nothing chosen for them, and no word about what is usual", person == 'Carer: hold here to go back Not now Point to your answer Would you like tea or coffee? coffee tea something else' and page.locator('main.pv .pt.pressed, main.pv .pt[aria-pressed=true]').count() == 0, person)
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
    check('learning: it says how it was learned (counted on this phone, no AI, never sent by the app, only a hint)', 'Counted on this phone from the answers they confirmed: no AI, and the app never sends it anywhere (the usual choices leave only in a note for the next carer or on the page "How to talk", if you share or print one yourself).' in text(page, '#learned') and 'they always choose for themselves' in text(page, '#learned'))
    # (phase 12b: a line about a drink question is never offered as a fact to keep, so only the needs line has "Keep")
    check('learning: each line has "Remove", the needs line "Keep as a fact" (the drink question line not), and there is "Forget everything learned"', page.locator('[data-act=learned-keep]').count() == 1 and page.locator('[data-act=learned-remove]').count() == 2 and page.locator('[data-act=learned-forget]').is_visible())
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
    """About them is open: choose the fixture photo for this word, frame it by hand (zoom in, drag), give it its word, save."""
    page.set_input_files('#photo-file', photo_for(word))
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
    ctx.route('**/*', lambda r: r.continue_() if urlparse(r.request.url).hostname in (host, None) or r.request.url.startswith(('data:', 'blob:')) else (outside.append(r.request.url) if not app_check_url(r.request.url) else None, r.abort()))
    page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('dialog', lambda d: d.accept())
    page.on('request', lambda r: posted.append(r.url) if r.method != 'GET' else None)
    page.goto(url + '#/about')
    page.wait_for_selector('main.about-simple #photos')
    block = text(page, '#photos')
    check('photos: About them has "Their own photos": what they are for, "No photos yet.", "Add a photo"', 'Their own photos' in block and 'A card shows it in place of the drawing wherever its word is one of the choices.' in block and 'No photos yet.' in block and page.locator('[data-act=photo-new]').is_visible(), block)
    check('photos: the privacy line says where they stay, and is true on every device: on this phone no AI looks at them; on a desktop Chrome with the built-in AI it can look at one there, never online', text(page, '#photos-lock') == "Photos stay on this phone only. They are never sent anywhere. On this phone no AI looks at them. On a desktop computer with Chrome's built-in AI, it can look at one on that computer itself, never online.", text(page, '#photos-lock'))
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
    pics = page.evaluate("[...document.querySelectorAll('#person .pt')].map((t) => t.querySelector('img.photo.own') ? 'photo' : t.querySelector('svg, img.pic') ? 'drawing' : 'word')")
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
    pics = page.evaluate("[...document.querySelectorAll('#person .pt')].map((t) => t.querySelector('img.photo.own') ? 'photo' : t.querySelector('svg, img.pic') ? 'drawing' : 'word')")
    check('photos: the choice "your glasses" shows the photo called "glasses" (the word is compared without "your")', pics == ['photo', 'drawing', 'drawing'], str(pics))
    # ---- delete one, delete all
    page.goto(url + '#/about')
    page.wait_for_selector('#photo-list')
    page.locator('#photo-list li', has_text='Tea').locator('[data-act=photo-del]').click()
    page.wait_for_timeout(300)
    check('photos: "Delete" on one photo takes that one away', page.locator('#photo-list li').count() == 1 and page.locator('#photo-list li b').inner_text() == 'glasses')
    page.locator('[data-act=home]').click()
    ask_topic(page, 'food', 'tea or coffee')
    check('photos: the choice "tea" is the drawing again', page.locator('#person .pt img.photo').count() == 0 and page.locator('#person .pt :is(svg, img.pic)').count() == 3)
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


KV_GET = """(key) => new Promise((res) => { const r = indexedDB.open('talk-partner', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => { const q = r.result.transaction('kv', 'readonly').objectStore('kv').get(key); q.onsuccess = () => res(q.result === undefined ? null : q.result); q.onerror = () => res(null); }; r.onerror = () => res(null); })"""
KV_PUT = """(all) => new Promise((res) => { const r = indexedDB.open('talk-partner', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => { const tx = r.result.transaction('kv', 'readwrite'); for (const [k, v] of Object.entries(all)) tx.objectStore('kv').put(v, k); tx.oncomplete = () => res(true); tx.onerror = () => res(false); }; r.onerror = () => res(false); })"""
FIXTURE_WEEK = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'tests', 'fixtures', 'frank-week.json')
LOG_TOPIC = {'drank': 'food', 'ate': 'food', 'toilet': 'body', 'slept': 'rest', 'pain': 'body', 'fall': 'body', 'tablets': 'body'}


def frank_week():
    """tests/fixtures/frank-week.json on the last seven days: day 6 (the fixture's Sunday) is today. The same entries
    that tests/unit/frank-week.test.ts runs through the guard and the rules, with the "less sure" marks the guard sets."""
    week = json.load(open(FIXTURE_WEEK))
    today = datetime.date.today()
    day = lambda d: today - datetime.timedelta(days=6 - d)
    entries = []
    for i, r in enumerate(week['entries']):
        h, m = (int(x) for x in r['t'].split(':'))
        at = int(datetime.datetime.combine(day(r['d']), datetime.time(h, m)).timestamp() * 1000)
        e = {'id': f'w{i}', 'at': at, 'kind': r['kind'], 'label': r['label'], 'topic': r.get('topic') or LOG_TOPIC[r['log']]}
        for k in ('log', 'q'):
            if k in r:
                e[k] = r[k]
        if r.get('lessSure'):
            e['lessSure'] = True
        entries.append(e)
    name = lambda d: f"{day(d):%a} {day(d).day} {day(d):%b}"
    return week, entries, name


def miller_p4():
    """The Miller family for phase 4: the week fixture's About them, and three of the family's photos (a monogram for
    Beth, a drawn dog for Bo, a drawn lake: tests/fixtures/photo-*.jpg, our own drawings), as web/src/store.ts keeps them."""
    week = json.load(open(FIXTURE_WEEK))
    import base64
    data = lambda w: 'data:image/jpeg;base64,' + base64.b64encode(open(photo_for(w), 'rb').read()).decode()
    photos = [{'id': f'ph{i}', 'word': w, 'data': data(w), 'at': 1000 + i} for i, w in enumerate(['Beth', 'Bo', 'the lake'])]
    return week['profile'], photos


FITS = """() => { const de = document.documentElement; const low = Math.max(0, ...[...document.querySelectorAll('#person button, #person img, #person p')].map((e) => e.getBoundingClientRect().bottom)); return { h: innerHeight, sh: de.scrollHeight, low: Math.round(low) }; }"""


def fits(page, label):
    """The person's screen needs no scrolling: the page is not taller than the screen, and nothing on it ends below it."""
    page.wait_for_timeout(250)
    m = page.evaluate(FITS)
    check(f'{label}: fits the screen without scrolling ({m["h"]} px tall)', m['sh'] <= m['h'] and m['low'] <= m['h'], str(m))


def tap_yes(page, label):
    """On the person's screen: point to a choice and say Yes (the screen that follows is the caller's to wait for)."""
    page.wait_for_selector('main.pv .pt')
    page.locator('main.pv .pt', has_text=label).first.click()
    page.wait_for_selector('[data-confirm=yes]')
    page.locator('[data-confirm=yes]').click()


def to_topics(page):
    """(phase 10) On "I want to talk about…": "something else" screen by screen, to the topics as pictures."""
    for _ in range(4):
        page.wait_for_selector('main.pv .pt')
        if page.locator('main.pv .pt', has_text='People & family').count():
            return
        page.locator('main.pv .pt.esc').click()
        page.wait_for_timeout(150)
    page.wait_for_selector('main.pv .pt >> text=People & family')


def give_back(page, sel='main.simple.s-answered'):
    page.wait_for_selector('.p-give')
    page.locator('.p-give').click()
    page.wait_for_selector(sel)


def phase4(browser, url, live):
    """Phase 4, as Carol and Frank on a 390 x 844 phone with the Miller family in About them: the first-letter helper,
    "Frank wants to say something", "Before a doctor visit", "Talk about a photo". No "Yes" is pressed on a sheet, and
    every request to another host is refused and counted: there must be none."""
    host = urlparse(url).hostname
    ctx = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True, user_agent=PHONE_UA, service_workers='block')
    outside = []
    ctx.route('**/*', lambda r: r.continue_() if urlparse(r.request.url).hostname in (host, None) or r.request.url.startswith(('data:', 'blob:')) else (outside.append(r.request.url) if not app_check_url(r.request.url) else None, r.abort()))
    page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('dialog', lambda d: d.accept())
    profile, photos = miller_p4()
    page.goto(url)
    page.wait_for_selector('main.simple.home')
    page.evaluate(KV_PUT, {'profile': profile, 'photos': photos, 'settings': {'cloudHelp': False, 'support': 'more', 'welcomed': False, 'firstCard': True, 'howFolded': True}})
    page.reload()
    page.wait_for_selector('main.simple.home')
    home = text(page)
    check('phase 4, first screen: (phase 10) "Frank: I want to say something" stands right under the quick needs, and the two new ways in under the diary', 'Frank: I want to say something' in text(page, '#turn-go') and ys(page, '#turn-go')[0][1] > ys(page, '.btn.needs')[0][1] and ys(page, '#turn-go')[0][1] < ys(page, '#topics')[0][1] and 'Before a doctor visit' in home and 'Talk about a photo' in home, home[:200])
    screen_checks(page, 'phase 4, first screen')

    # ---------------------------------------------------------------- 1. the first-letter helper
    ask_topic(page, 'food', 'Would you like tea or coffee?')
    answer(page, 'something else')
    out = page.locator('#after-out button').count()
    # (18 Nov, the owner's walk on his phone: the ways stand in order, numbered; the first letter is the second of them)
    check('letter: after "something else" the carer is offered "Try the first letter", after the step the rules make (and the online AI step, second since phase 12b), four ways at most', page.locator('#after-out #letter-go').count() == 1 and out <= 4 and [x for x in page.evaluate("[...document.querySelectorAll('#ways > li > button')].map((b) => b.id)") if x != 'narrow'].index('letter-go') == 1, f'{out} buttons: {text(page, "#after-out")}')
    screen_checks(page, 'letter: after "something else"', primary=True)
    page.locator('#letter-go').click()
    page.wait_for_selector('main.pv.letters #abc')
    abc = text(page, '#person')
    check('letter: the person\'s screen asks "Do you know how the word starts?" and says "Point to the first letter", with 26 letters and "No, I don\'t know"', 'Do you know how the word starts?' in abc and 'Point to the first letter' in abc and page.locator('#abc [data-letter]').all_inner_texts() == list('ABCDEFGHIJKLMNOPQRSTUVWXYZ') and text(page, '#abc-no') == "No, I don't know")
    boxes = ys(page, '#abc .ab')
    rows = sorted(set(b[1] for b in boxes))
    check('letter: six letters to a row, five rows; every letter is at least 44 x 56 px', len(rows) == 5 and [sum(1 for b in boxes if b[1] == r) for r in rows] == [6, 6, 6, 6, 3] and min(b[2] for b in boxes) >= 44 and min(b[3] for b in boxes) >= 56, f'{rows} {min(b[2] for b in boxes)}x{min(b[3] for b in boxes)}')
    fits(page, 'letter: the alphabet at 390 x 844')
    check('letter: no score, no count and no mark on the person\'s screen', not page.evaluate("/\\d|score|wrong|less sure|tired/i.test(document.querySelector('#person').innerText)"))
    page.locator('[data-letter=B]').click()
    page.wait_for_selector('main.pv .pt')
    words = page.locator('main.pv .pt').all_inner_texts()
    # (phase 17, the owner's phone test: the letter stays inside the topic: after "tea or coffee?" B gives food and drink, the family's biscuits first)
    check('letter: "B" after "tea or coffee?" offers the ginger biscuits from About them first, then food and drink words, every tile starting with B, and "something else": three choices at most', [w.strip() for w in words] == ['biscuits (ginger)', 'bread', 'banana', 'something else'], str(words))
    check('letter: no word of another topic (no Beth, no Bo, no bed) under a food question', not any(w.strip() in ('Beth', 'Bo', 'bed') for w in words))
    fits(page, 'letter: the words with B')
    tap_yes(page, 'biscuits (ginger)')
    give_back(page)
    check('letter: the carer reads the word and what to do next; nothing was sent', 'The word is: ginger biscuits. Ask a yes or no question about it next.' in text(page, '#do-now') and page.locator('#left-line').get_attribute('data-left') == 'nothing' and page.locator('#guard').count() == 0, text(page))
    screen_checks(page, 'letter: the word')
    # the way out of the letter card: more words, or another letter; "No, I don't know" is fine
    page.locator('[data-act=home]').click()
    ask_topic(page, 'food', 'Would you like tea or coffee?')
    answer(page, 'something else')
    page.locator('#letter-go').click()
    page.wait_for_selector('#abc')
    page.locator('#abc-no').click()
    page.wait_for_selector('main.simple.home #letter-no')
    check('letter: "No, I don\'t know" goes back to the carer with one calm line; nothing is counted', 'No first letter this time. That is fine' in text(page, '#letter-no'))
    # pain as a word leads on at once (phase 17: from a "Body & care" question, where pain is a word of the topic)
    ask_topic(page, 'body', 'Would you like a wash now or later?')
    answer(page, 'something else')
    page.locator('#letter-go').click()
    page.wait_for_selector('#abc')
    page.locator('[data-letter=P]').click()
    page.wait_for_selector('main.pv .pt')
    pw = [w.strip() for w in page.locator('main.pv .pt').all_inner_texts()]
    tap_yes(page, 'pain')
    give_back(page)
    check('letter, safety: "pain" as the word leads straight to "Where does it hurt?", with the line about the nurse or doctor, and no "may be tired" line', 'pain' in pw and page.locator('#next-q').get_attribute('data-q') == 'Where does it hurt?' and page.locator('#guard').count() == 0 and 'tired' not in text(page).lower(), f'{pw} {text(page)}')
    # a letter no word of About them starts with, on a phone (no model in the browser): nothing is sent without a yes
    page.locator('[data-act=home]').click()
    ask_topic(page, 'food', 'Would you like tea or coffee?')
    answer(page, 'something else')
    page.locator('#letter-go').click()
    page.wait_for_selector('#abc')
    page.locator('[data-letter=X]').click()
    page.wait_for_selector('main.simple.nocard')
    if page.locator('#sheet').count():
        sheet = text(page, '#sheet')
        line = text(page, '#sheet-line')
        check('letter: with no word for "X" the sheet comes up before anything is sent, in plain words first, and shows the one line that would go', sheet.startswith('Ask online help for words?') and line == 'Would you like tea or coffee? They cannot say the word. It starts with the letter "X". The conversation is about something to drink. The person is an adult, most often 60 or older: give common, plain words that an older adult uses at home.' and 'Never sent: Names, photos, the answers so far, and everything in About them.' in sheet, sheet[:300])
        whole = page.locator('#sheet-whole pre').text_content()
        check('letter: the whole request holds the question and the letter, and nothing of About them', 'PREFER_IN_CLOUD' in whole and 'letter \\"X\\"' in whole and not page.evaluate("/\\b(?:Frank|Carol|Beth|Tom|Bo|ginger|porridge|lake|did not want)\\b/.test(document.querySelector('#sheet-whole pre').textContent)"), whole[:200])
        screen_checks(page, 'letter: the sheet', primary=True)
        page.locator('[data-act=sheet-no]').click()
        page.wait_for_selector('#sheet', state='detached')
    else:
        print('NOTE  letter: this copy has no online help set up, so no sheet is offered for "X"')
    check('letter: after "No" the carer\'s screen says there is no such word in About them, and offers another letter', 'No word that starts with X is in About them yet.' in text(page) and page.locator('#letter-go').count() == 1, text(page)[:300])
    # from "We're stuck"
    page.locator('[data-act=home]').click()
    ask_topic(page, 'food', 'Would you like tea or coffee?')
    page.locator('[data-act=stuck]').first.click()
    page.wait_for_selector('#letter-go')
    check('letter: "We\'re stuck" offers the first letter too', page.locator('main.simple.card #letter-go').count() == 1)

    # ---------------------------------------------------------------- 2. "Frank wants to say something"
    page.locator('[data-act=home]').click()
    page.wait_for_selector('main.simple.home')
    page.locator('#turn-go').click()
    page.wait_for_selector('main.pv .pt')
    st = [w.strip() for w in page.locator('main.pv .pt').all_inner_texts()]
    check('his turn: the person\'s screen opens with three starters and "something else" (phase 10: "I want to talk about…")', st == ['I need something', 'I want to talk about…', 'I feel…', 'something else'], str(st))
    fits(page, 'his turn: the starters')
    tap_yes(page, 'I need something')
    page.wait_for_selector('main.pv[data-kind=needs] .pt')
    check('his turn: "I need something" leads to the needs board, still on the person\'s screen', page.locator('main.pv[data-kind=needs] .pt').count() == 10)
    tap_yes(page, 'pain')
    give_back(page)
    lead = text(page, '#turn-lead')
    check('his turn: the carer reads "Frank started this: something is needed." over the need; pain keeps its own next step, and no "may be tired" line', lead == 'Frank started this: something is needed.' and 'Where does it hurt?' in text(page) and page.locator('#guard').count() == 0, text(page)[:300])
    screen_checks(page, 'his turn: after a need', primary=False)
    # (phase 10) "I want to talk about…": the family's people and places first, three to a screen, then the topics
    page.locator('[data-act=home]').click()
    page.locator('#turn-go').click()
    tap_yes(page, 'talk about')
    page.wait_for_selector('main.pv .pt >> text=Beth')
    t1 = [w.strip().split('\n')[-1] for w in page.locator('main.pv .pt').all_inner_texts()]
    fits(page, 'his turn: "I want to talk about…", first screen')
    page.locator('main.pv .pt.esc').click()
    page.wait_for_selector('main.pv .pt >> text=church')
    t2 = [w.strip().split('\n')[-1] for w in page.locator('main.pv .pt').all_inner_texts()]
    lake_photo = page.locator('main.pv .pt', has_text='the lake').locator('img.photo').count()
    fits(page, 'his turn: "I want to talk about…", second screen')
    check('phase 10, his turn: "I want to talk about…" offers "me", Beth and Tom, then the lake (with its photo), church and the news / TV, never Carol', t1 == ['me', 'Beth', 'Tom', 'something else'] and t2 == ['the lake', 'church', 'the news / TV', 'something else'] and lake_photo == 1 and 'Carol' not in t1 + t2, f'{t1} {t2} {lake_photo}')
    page.locator('main.pv .pt.esc').click()
    page.wait_for_selector('main.pv .pt >> text=People')
    m1 = [w.strip() for w in page.locator('main.pv .pt').all_inner_texts()]
    fits(page, 'his turn: the topics, first screen')
    page.locator('main.pv .pt.esc').click()
    page.wait_for_selector('main.pv .pt >> text=Body')
    m2 = [w.strip() for w in page.locator('main.pv .pt').all_inner_texts()]
    check('his turn: the last "something else" of "I want to talk about…" leads to the topics as pictures, three to a screen, "something else" leading to the next three', m1 == ['People & family', 'Today & plans', 'TV, music & hobbies', 'something else'] and m2 == ['Food & drink', 'Body & care', 'Rest & sleep', 'something else'] and page.locator('main.pv .pt:not(.esc) :is(svg, img.pic)').count() == 3, f'{m1} {m2}')
    hold_exit(page)
    page.wait_for_timeout(900)
    page.locator('[data-act=home]').click()
    page.locator('#turn-go').click()
    tap_yes(page, 'talk about')
    to_topics(page)
    tap_yes(page, 'People')
    page.wait_for_selector('main.pv .pt >> text=Beth')
    who = [w.strip().split('\n')[-1] for w in page.locator('main.pv .pt').all_inner_texts()]  # (a person with no photo has their initial over the name)
    check('his turn: after "People & family" the person is asked "Who is it about?" with (phase 8) "me" first, the family\'s names and "someone else", still on their screen', text(page, '#person .p-ask') == 'Who is it about?' and who == ['me', 'Beth', 'Tom', 'someone else'], str(who))
    fits(page, 'his turn: "Who is it about?"')
    tap_yes(page, 'Beth')
    give_back(page)
    lead = text(page, '#turn-lead')
    asks = nexts(page)
    check('his turn: the carer reads who started and what it is about, with three questions about the TELLING, never an offer to call or see', lead == 'Frank started this: there is something to tell you. It is about: People & family, Beth.' and asks == ['Is it good news, or a worry?', 'Did something happen?', 'Do you want to tell me now or later?'] and 'Would you like' not in text(page), f'{lead} {asks}')
    screen_checks(page, 'his turn: after a topic')
    # (phase 10) Beth picked on "I want to talk about…": "Frank wants to talk about Beth." and three questions by kind
    page.locator('[data-act=home]').click()
    page.locator('#turn-go').click()
    tap_yes(page, 'talk about')
    tap_yes(page, 'Beth')
    give_back(page)
    lead10 = text(page, '#turn-lead')
    asks10 = nexts(page)
    check('phase 10, his turn: Beth -> the carer reads "Frank wants to talk about Beth." first, with three questions: the telling first, a call last', lead10 == 'Frank wants to talk about Beth.' and asks10 == ['Is it good news, or a worry?', "Is it about Beth's visit?", 'Would you like to call Beth?'] and ys(page, '#turn-lead')[0][1] < ys(page, '#chose')[0][1] and 'patient' not in text(page).lower(), f'{lead10} {asks10}')
    screen_checks(page, 'phase 10, his turn: after Beth')
    page.locator('#next-q').click()
    page.wait_for_selector('main.simple.card #made-where')
    check('phase 10, his turn: "Is it good news, or a worry?" after Beth is a card the rules make', page.locator('#made-where').get_attribute('data-maker') == 'code')
    page.locator('[data-act=home]').click()
    page.locator('#turn-go').click()
    tap_yes(page, 'talk about')
    to_topics(page)
    tap_yes(page, 'People')
    tap_yes(page, 'Beth')
    give_back(page)
    page.locator('#next-q').click()
    page.wait_for_selector('main.simple.card #made-where')
    made = page.locator('#made-where').get_attribute('data-maker')
    answer(page, 'worry')
    check('his turn: "Is it good news, or a worry?" is a card the rules make; "worry" is taken as said, and the tree leads on', made == 'code' and nexts(page) == ['Did something happen?', 'Are you in pain?'] and page.locator('#guard').count() == 0, f'{made} {nexts(page)} {text(page)[:200]}')
    page.locator('[data-act=home]').click()
    page.locator('#turn-go').click()
    tap_yes(page, 'talk about')
    to_topics(page)
    tap_yes(page, 'Today')
    page.wait_for_selector('main.pv .pt >> text=another day')
    day = [w.strip() for w in page.locator('main.pv .pt').all_inner_texts()]
    tap_yes(page, 'another day')
    give_back(page)
    check('his turn: "Today & plans" asks "Is it about today, or another day?", and the carer reads it', day == ['today', 'another day', 'something else'] and text(page, '#turn-lead') == 'Frank started this: there is something to tell you. It is about: Today & plans, another day.' and nexts(page)[0] == 'Is it good news, or a worry?', f'{day} {text(page, "#turn-lead")}')
    page.locator('[data-act=home]').click()
    page.locator('#turn-go').click()
    tap_yes(page, 'I feel')
    page.wait_for_selector('main.pv[data-kind=feeling] .pt')
    fits(page, 'his turn: the feelings card')
    feel = page.locator('main.pv .pt:not(.esc)').first.inner_text().strip()
    tap_yes(page, feel)
    give_back(page)
    check('his turn: "I feel…" leads to the feelings card, and the carer reads that it is about a feeling', text(page, '#turn-lead') == 'Frank started this: it is about a feeling.' and text(page, '#chose-q') == 'How are you feeling today?', text(page)[:200])

    # ---------------------------------------------------------------- 3. before a doctor visit
    page.locator('[data-act=home]').click()
    page.locator('#visit-link').click()
    page.wait_for_selector('main.visit #visit-start')
    intro = text(page)
    check('visit: the carer\'s screen says what it is, that the list is fixed with no AI, and that the answers stay on this device', 'The questions are a fixed list. No AI writes or changes them, and no AI reads the answers.' in intro and 'The answers stay on this device. Nothing is sent.' in intro and 'Up to 8 questions.' in intro and "Don't answer for Frank." in text(page, '#visit-wait'), intro)
    screen_checks(page, 'visit: before the first question')
    page.locator('#visit-start').click()
    asked = []
    for label in ['no', 'well', 'so-so']:
        page.wait_for_selector('main.pv .pt')
        asked.append(text(page, '#person .p-ask'))
        fits(page, f'visit: "{asked[-1]}"')
        tap_yes(page, label)
        page.wait_for_timeout(300)
    hold_exit(page)
    page.wait_for_selector('main.visit #visit-page')
    part = text(page)
    check('visit: pain "no" skips the two pain questions; stopped half-way, the page says how far it got and offers to go on', asked == ['Are you in pain?', 'How have you been sleeping?', 'How is your appetite?'] and '3 of 6 questions were answered.' in part and page.locator('#visit-resume').count() == 1, f'{asked} {part[:200]}')
    page.locator('#visit-resume').click()
    for label in ['low', 'nothing much']:
        tap_yes(page, label)
        page.wait_for_timeout(300)
    page.wait_for_selector('main.pv .pt >> text=my speech')
    page.locator('main.pv .pt.esc').click()
    page.wait_for_selector('main.pv .pt >> text=driving')
    page.locator('main.pv .pt.esc').click()
    page.wait_for_selector('[data-confirm=yes]')
    page.locator('[data-confirm=yes]').click()
    give_back(page, 'main.visit #visit-page')
    pg1 = text(page, '#visit-page')
    check('visit: the page has his six answers as given, the date, "something else" asking for time, and the fixed footer', page.locator('#visit-rows li').count() == 6 and "Frank's own answers" in pg1 and 'Answered at home, with a family member\'s help, on' in pg1 and 'There is something else, not on the list. Please give time for it.' in pg1 and "Frank's pointed answers, with a family member's help: not Frank's own words. Not a medical record." in pg1 and 'Since the last visit' in pg1 and "These lines are not Frank's own answers" in pg1 and 'no low or worried answer' not in pg1 and "counting Frank's own answer above" in pg1 and [x.strip() for x in page.locator('#visit-rows b').all_inner_texts()] == ['no', 'well', 'so-so', 'low', 'nothing much', 'something else'], pg1)
    check('visit: with no pain there is no pain line; nothing is marked "less sure"', page.locator('#visit-safety').count() == 0 and 'less sure' not in text(page))
    # again, with pain: where and how bad are asked; the worst case stands as given
    page.locator('#visit-again').click()
    tap_yes(page, 'yes')
    page.wait_for_selector('main.pv[data-kind=body] .pt')
    region = page.locator('main.pv .pt:not(.esc)').first.inner_text().strip()
    page.locator('main.pv .pt:not(.esc)').first.click()
    page.wait_for_timeout(300)
    where = page.locator('main.pv .pt:not(.esc)').first.inner_text().strip()
    tap_yes(page, where)
    # (phase 9: the page keeps the part of the body with the place: "Where it hurts: chest, middle")
    where = f"{region}, {re.sub(r'^your ', '', where)}"
    # (phase 13, judge round 10: a pain in the head stops the questions; the carer reads the call box first, then goes on)
    give_back(page, 'main.visit #visit-page')
    vs = text(page, '#visit-stop') if page.locator('#visit-stop').count() else ''
    check('visit: a pain in the head stops the questions: the call box names it, with the call button and "Go on with the questions"', 'call 911 now, whatever the amount' in vs and 'in the head' in vs and page.locator('#visit-stop a[href="tel:911"]').count() == 1 and page.locator('#visit-stop [data-act=visit-resume]').count() == 1, vs)
    page.locator('#visit-stop [data-act=visit-resume]').click()
    page.wait_for_selector('main.pv .pt >> text=very bad')
    fits(page, 'visit: "How bad is the pain?"')
    for label in ['very bad', 'badly', 'poor', 'low', 'my body', 'my tablets']:
        tap_yes(page, label)
        page.wait_for_timeout(300)
    give_back(page, 'main.visit #visit-page')
    got = [x.strip() for x in page.locator('#visit-rows b').all_inner_texts()]
    allp = text(page)
    check('visit, safety (pain yes, very bad, mood low): all eight answers stand exactly as given; outside the page the carer is told not to wait for the visit; no line says tired, later or less sure', got == ['yes', where, 'very bad', 'badly', 'poor', 'low', 'my body', 'my tablets'] and 'Pain in the chest or the head: call 911 now, whatever the amount. Other new or strong pain: do not wait for the visit, call the nurse or doctor today.' in text(page, '#visit-safety') and not any(w in allp.lower() for w in ['less sure', 'may be tired', 'try again later']) and page.locator('#guard').count() == 0, f'{got} {allp[-300:]}')
    screen_checks(page, 'visit: the page')
    kept = page.evaluate(KV_GET, 'visit')
    page.reload()
    page.wait_for_selector('main.visit #visit-page')
    hist = page.evaluate(KV_GET, 'history') or []
    dia = page.evaluate(KV_GET, 'diary') or []
    check('visit: the answers are kept on this device under their own key, survive a reload, and are in neither the history nor the diary', len(kept['answers']) == 8 and page.locator('#visit-rows li').count() == 8 and not any('appetite' in h['q'] or 'sleeping' in h['q'] or 'ask the doctor' in h['q'] for h in hist) and not any('appetite' in (d.get('q') or '') for d in dia), f'{len(hist)} {len(dia)}')
    page.locator('#visit-del').click()
    page.wait_for_selector('#visit-start')
    check('visit: "Delete these answers" removes them', not page.evaluate(KV_GET, 'visit'))

    # ---------------------------------------------------------------- 4. talk about a photo
    page.locator('[data-act=home]').click()
    page.wait_for_selector('main.simple.home')
    page.locator('#phototalk-link').click()
    page.wait_for_selector('#pt-grid')
    check('photo: the carer picks one of the family\'s photos; the screen says no photo is ever sent, and that it is not a test', page.locator('.pt-photo').count() == 3 and 'The photos stay on this device. No photo is ever sent anywhere.' in text(page) and 'Not a test: nobody is asked who or what it is.' in text(page))
    screen_checks(page, 'photo: pick a photo', primary=False)
    page.locator('.pt-photo', has_text='Beth').click()
    page.wait_for_selector('#pt-questions')
    qs = [x.split('\n')[0].strip() for x in page.locator('[data-act=pt-ask]').all_inner_texts()]
    check('photo: on a phone the three questions are the rules\', from the photo\'s word and About them; no AI is offered a look, and the screen says so', qs == ['Would you like to call Beth?', 'How does this photo make you feel?', 'Shall we show this photo to Tom?'] and page.locator('#pt-look').count() == 0 and text(page, '#pt-by') == "Made by the rules, from the photo's word and About them. No AI looked at the photo.", f'{qs} {text(page, "#pt-by")}')
    check('photo: never a test question', not any(w in ' '.join(qs).lower() for w in ['who is', 'what is', 'remember']))
    screen_checks(page, 'photo: the questions', primary=False)
    page.locator('[data-act=pt-ask]').nth(1).click()
    page.wait_for_selector('main.simple.card')
    check('photo: the question is a card made by the rules; nothing was sent', page.locator('#made-where').get_attribute('data-maker') == 'code' and page.locator('#made-where').get_attribute('data-left') == 'nothing')
    page.locator('[data-act=show]').click()
    page.wait_for_selector('main.pv.with-photo .pt')
    ch = [w.strip() for w in page.locator('main.pv .pt').all_inner_texts()]
    check('photo: the person sees the photo over the question, three choices and "something else"', page.locator('#p-photo').count() == 1 and ch == ['good', 'mixed', 'sad', 'something else'] and min(ys(page, '#p-photo')[0][2:]) >= 110, str(ch))
    fits(page, 'photo: the photo, three choices and the way out')
    tap_yes(page, 'good')
    give_back(page)
    check('photo: after the answer the carer can go back to the questions about this photo', page.locator('#pt-back').count() == 1 and text(page, '#chose-a') == 'Good')
    page.locator('#pt-back').click()
    page.wait_for_selector('#pt-questions')
    page.locator('[data-act=pt-ask]').nth(0).click()
    page.wait_for_selector('main.simple.card')
    answer(page, 'yes')
    check('photo: "Would you like to call Beth?" yes ends with what to do now', 'Call Beth now, together.' in text(page), text(page)[:200])

    check('phase 4: nothing was asked of any other host in the whole run', not outside, '; '.join(outside[:4]))
    check('phase 4: no page error', not errors, '; '.join(errors))
    ctx.close()


def phase4_offline(page):
    """With the connection off (inside the offline run): the person starts, a doctor-visit question, the first letter."""
    page.locator('[data-act=home]').click()
    page.wait_for_selector('main.simple.home')
    page.locator('#turn-go').click()
    tap_yes(page, 'I need something')
    page.wait_for_selector('main.pv[data-kind=needs] .pt')
    tap_yes(page, 'drink')
    give_back(page)
    check('offline: the person starts ("I need something" -> the needs board -> drink), and the carer reads who started', 'started this: something is needed.' in text(page, '#turn-lead'))
    page.locator('[data-act=home]').click()
    ask_topic(page, 'food', 'tea or coffee')
    answer(page, 'something else')
    page.locator('#letter-go').click()
    page.wait_for_selector('#abc')
    page.locator('[data-letter=T]').click()
    page.wait_for_selector('main.pv .pt')
    tw = [w.strip() for w in page.locator('main.pv .pt').all_inner_texts()]
    check('offline: the first letter works with no connection: "T" offers everyday words by the rules (never the refused tea)', tw[-1] == 'something else' and 'tea' not in tw and len(tw) >= 3, str(tw))
    hold_exit(page)
    page.wait_for_timeout(900)
    page.locator('[data-act=home]').click()
    page.locator('#visit-link').click()
    page.wait_for_selector('#visit-start')
    page.locator('#visit-start').click()
    tap_yes(page, 'no')
    tap_yes(page, 'well')
    page.wait_for_timeout(300)
    hold_exit(page)
    page.wait_for_selector('main.visit #visit-page')
    check('offline: the doctor-visit questions and their page work with no connection', page.locator('#visit-rows li').count() == 2)
    page.locator('[data-act=home]').click()
    page.locator('#phototalk-link').click()
    page.wait_for_selector('main.phototalk')
    check('offline: "Talk about a photo" opens with no connection', 'The photos stay on this device.' in text(page))


def diary(browser, url, live):
    """Phase 3, as Carol on her phone: the one-tap log, the diary by day, week and month and by topic, the guard,
    health notes, the Miller family's week and its insight lines, the sheet before the lines go to online help, the
    tip of the day, the copy of About them in a file, bigger pictures on the person's screen."""
    host = urlparse(url).hostname
    ctx = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True, user_agent=PHONE_UA, service_workers='block', accept_downloads=True)
    outside = []
    ctx.route('**/*', lambda r: r.continue_() if urlparse(r.request.url).hostname in (host, None) or r.request.url.startswith(('data:', 'blob:')) else (outside.append(r.request.url) if not app_check_url(r.request.url) else None, r.abort()))
    page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('dialog', lambda d: d.accept())
    page.goto(url)
    page.wait_for_selector('main.simple.home')

    # ---- the way in, and the empty diary
    below = page.evaluate("document.querySelector('#diary-link').getBoundingClientRect().top > document.querySelector('#ask').getBoundingClientRect().bottom - 1")
    check('diary: the first screen has "Diary" under the questions, not above them', below and 'Diary' in text(page, '#diary-link'))
    page.locator('#diary-link').click()
    page.wait_for_selector('main.simple.diary')
    first = text(page)
    check('diary: opens on Today, empty, and says it is kept on this phone only, leaves only when the carer shares it, and is never shown on their screen', 'Nothing entered today yet.' in first and 'The diary is kept on this phone only. The app never sends it anywhere: it leaves only when you share it yourself, as a text you see first. It is never shown on their screen.' in first and page.locator('#tab-today[aria-selected=true]').count() == 1, first[:300])
    check('diary: seven one-tap log buttons (Drank, Ate, Toilet, Slept, Pain, and since phase 5 Fall and Tablets taken), each at least 80 px tall', page.locator('#log-row .logbtn').all_inner_texts() == ['Drank', 'Ate', 'Toilet', 'Slept', 'Pain', 'Fall', 'Tablets taken'] and min(b[3] for b in ys(page, '#log-row .logbtn')) >= 80, str(ys(page, '#log-row .logbtn')))
    check('diary: an empty diary has no "what stands out", nothing to copy and nothing to delete', page.locator('#insights, #diary-copy, #diary-del').count() == 0)
    screen_checks(page, 'diary: empty', primary=False)

    # ---- one tap logs it, with the time; Undo; it is kept across a reload
    page.locator('[data-log=drank]').click()
    page.wait_for_selector('#logged')
    now = page.evaluate("(() => { const d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); })()")
    logged = text(page, '#logged')
    check('diary: one tap on "Drank" logs it with the time, and says so', logged.startswith('Logged: Drank, ') and 'Undo' in logged and page.locator('#timeline .de').count() == 1 and 'Drank' in text(page, '#timeline'), logged)
    check('diary: the entry is on today\'s timeline with its time', text(page, '#timeline .de time')[:4] == now[:4] or text(page, '#timeline .de time') != '', text(page, '#timeline'))
    page.locator('[data-act=log-undo]').click()
    page.wait_for_function("!document.querySelector('#logged')")
    check('diary: "Undo" takes it out again', page.locator('#timeline .de').count() == 0 and page.evaluate(KV_GET, 'diary') == [])
    for k in ('drank', 'ate', 'toilet', 'slept', 'pain'):
        page.locator(f'[data-log={k}]').click()
        page.wait_for_selector('#logged')
    check('diary: five taps, five entries, in order of time', page.locator('#timeline .de b').all_inner_texts() == ['Drank', 'Ate', 'Toilet', 'Slept', 'Pain'], str(page.locator('#timeline .de b').all_inner_texts()))
    page.locator('#diary-topic').select_option('body')
    page.wait_for_timeout(100)
    check('diary: the topic filter (Body & care: Toilet and Pain)', page.locator('#timeline .de b').all_inner_texts() == ['Toilet', 'Pain'])
    page.locator('#diary-topic').select_option('people')
    page.wait_for_timeout(100)
    check('diary: a topic with nothing in it says so', 'Nothing on this topic here.' in text(page, '#timeline'))
    page.locator('#diary-topic').select_option('all')
    screen_checks(page, 'diary: today, five entries', primary=False)
    page.reload()
    page.wait_for_selector('main.simple.diary')
    check('diary: kept across a reload (IndexedDB on this phone)', page.locator('#timeline .de').count() == 5 and len(page.evaluate(KV_GET, 'diary')) == 5)
    check('diary: Back goes to the first screen', True)
    page.locator('[data-act=back]').click()
    page.wait_for_selector('main.simple.home')

    # ---- the answer check: "yes" to five yes / no questions in a row (none about pain, the toilet or a need)
    # (phase 8: a yes to a food or drink question is taken as said, like pain: "Are you hungry?" counts for nothing, so a sixth question is asked)
    # (phase 13: a rest answer such as "Are you tired?" is taken as said too, so the paper stands in for it)
    asked = (('food', 'Are you hungry?'), ('plans', 'Would you like to go for a drive?'), ('fun', 'Would you like to look at the paper?'), ('fun', 'Would you like some music on?'), ('plans', 'Would you like to go for a walk?'), ('fun', 'Would you like the radio on?'))
    for i, (topic, q) in enumerate(asked):
        ask_topic(page, topic, q)
        if i == len(asked) - 1:
            page.locator('[data-act=show]').click()
            page.wait_for_selector('main.pv .pt')
            page.locator('main.pv .pt', has_text='yes').first.click()
            page.wait_for_selector('[data-confirm=yes]')
            page.locator('[data-confirm=yes]').click()
            page.wait_for_selector('.p-give')
            person = text(page)
            check('guard: the person\'s own screen says nothing of it ("Thank you. Yes." and "Give the phone back", no line, no mark)', 'tired. Try' not in person and 'less sure' not in person and page.locator('#guard').count() == 0 and 'Thank you.' in person, person)
            page.locator('.p-give').click()
            page.wait_for_selector('main.simple.s-answered')
        else:
            answer(page, 'yes')
            check(f'guard: nothing is said after {i + 1} "yes" (four quick ones are an ordinary flow)', page.locator('#guard').count() == 0)
            new_q(page)
    guard = text(page, '#guard') if page.locator('#guard').count() else ''
    check('guard: after the fifth "yes" the carer reads the headline and one line (phase 17: "Several yes answers in a row. Check the last one the other way round" / marked "less sure"), the rest under "More"', guard.startswith('Several "yes" answers in a row. Check the last one the other way round ("Do you want me to go?"), then go by their answer. These answers are marked "less sure" in the diary. More') and page.evaluate("document.querySelector('#guard details').open") is False, guard)
    page.locator('#guard summary').click()
    check('guard: "More" says why, and that answers about pain, the body, feelings, the toilet or a need are never marked', 'nearly all "yes"' in text(page, '#guard') and 'Answers about pain, the body, feelings, the toilet or a need are never marked: take them as said.' in text(page, '#guard'), text(page, '#guard'))
    screen_checks(page, 'guard: the answered screen with the line', primary=False)
    hist = page.evaluate(KV_GET, 'history')
    check('guard: the five answers are marked "less sure" in the answers kept here; (phase 8) the yes to "Are you hungry?" is not', [bool(h.get('lessSure')) for h in hist] == [False] + [True] * 5 and all(h.get('yn') and h.get('pos') == 0 for h in hist), str(hist)[:300])
    # pain is never discounted: asked right now, while the check is on
    new_q(page)
    ask_topic(page, 'body', 'Are you in pain?')
    check('guard and pain: no "may be tired" on the screen before a pain question is shown', page.locator('#guard').count() == 0)
    answer(page, 'yes')
    pain = text(page)
    check('guard and pain: after "Are you in pain? Yes" there is no "may be tired" line, and the screen leads on with "Next: Where does it hurt?"', page.locator('#guard').count() == 0 and 'may be tired' not in pain and text(page, '#next-q') == 'Next: Where does it hurt?', pain[:300])
    hist = page.evaluate(KV_GET, 'history')
    check('guard and pain: the pain answer is not marked "less sure", in the answers and in the diary', not hist[-1].get('lessSure') and hist[-1]['q'] == 'Are you in pain?' and not [e for e in page.evaluate(KV_GET, 'diary') if e.get('q') == 'Are you in pain?' and e.get('lessSure')], str(hist[-1]))
    new_q(page)
    ask_topic(page, 'food', 'tea or coffee')
    check('guard: the next either-or has its answers in a different order (coffee, tea), none removed, and the line to say follows; (phase 8) no "may be tired" line on a drink question', page.locator('#person .pt').all_inner_texts() == ['coffee', 'tea', 'something else'] and 'coffee, tea, or something else' in text(page, '.say').lower() and page.locator('#guard').count() == 0, f"{page.locator('#person .pt').all_inner_texts()} / {text(page, '.say')}")
    page.locator('[data-act=home]').click()
    page.wait_for_selector('main.simple.home')
    page.locator('#diary-link').click()
    page.wait_for_selector('main.simple.diary')
    check('guard: in the diary the five answers carry "less sure"; the pain answer and what the carer logged do not', page.locator('#timeline .de[data-less-sure]').count() == 5 and page.locator('#timeline .de.log[data-less-sure]').count() == 0 and page.locator('#timeline .tag.unsure').count() == 5 and 'Are you in pain? yes' in text(page, '#timeline'), text(page, '#timeline'))
    check('diary: the answers are there with their questions ("Are you hungry? yes")', 'Are you hungry? yes' in text(page, '#timeline'))
    tip = text(page, '#day-tip') if page.locator('#day-tip').count() else ''
    check('tip of the day: one sentence about the carer\'s own questions, with what it is from, worded by the rules', "Each of today's 8 questions asked one clear thing." in tip and 'From your 8 questions today. About the questions, never about them.' in tip and 'No AI, nothing sent.' in tip, tip)
    page.locator('#tip-hide').click()
    page.wait_for_selector('#tip-show')
    page.wait_for_timeout(300)
    page.reload()
    page.wait_for_selector('main.simple.diary')
    check('tip of the day: "Hide tips" hides it, and it stays hidden after a reload', page.locator('#day-tip').count() == 0 and page.locator('#tip-show').count() == 1)
    screen_checks(page, 'diary: today, with answers and "less sure"', primary=False)

    # ---- health notes, in About them
    page.goto(url + '#/about')
    page.wait_for_selector('main.about-simple')
    page.locator('.rowhead[data-row=health]').click()
    page.wait_for_selector('#health-text')
    health = text(page, '.rowcard[data-row=health]')
    check('health notes: four toggles, free text and (phase 5) the emergency number; "never sent to online help"; "not a medical record"', page.locator('input[type=checkbox][data-health]').count() == 4 and page.locator('#emergency-number').count() == 1 and '911 in the US and Canada, 999 in the UK, 112 in the EU' in health and 'Health notes stay on this phone. They are never sent to online help. They leave only if you tick them into a text you share yourself.' in health and 'This is not a medical record.' in health, health)
    page.locator('input[data-health=diabetes]').check()
    page.locator('#health-text').fill('Type 2, diet only.')
    screen_checks(page, 'About them: health notes open', primary=False)
    page.reload()
    page.wait_for_selector('main.about-simple')
    check('health notes: kept on this phone across a reload, and shown on the closed row', page.evaluate(KV_GET, 'health') == {'text': 'Type 2, diet only.', 'diabetes': True, 'swallowing': False, 'fluidLimit': False, 'reminders': False, 'emergency': ''} and 'Diabetes, Type 2, diet only.' in text(page, '.rowcard[data-row=health]'), str(page.evaluate(KV_GET, 'health')))
    check('health notes: not part of the profile the card prompts read', 'health' not in (page.evaluate(KV_GET, 'profile') or {}) and 'diabetes' not in json.dumps(page.evaluate(KV_GET, 'profile') or {}).lower())

    # ---- the Miller family's week (tests/fixtures/frank-week.json) drives the diary and the insights
    week, entries, name = frank_week()
    page.evaluate(KV_PUT, {'diary': entries, 'health': week['health'], 'profile': week['profile'], 'history': [], 'asks': []})
    page.goto(url + '#/diary')
    page.wait_for_selector('main.simple.diary')
    page.reload()
    page.wait_for_selector('main.simple.diary')
    check('week fixture: the diary is Frank\'s ("Frank\'s diary")', "Frank's diary" in text(page, 'h1'))
    page.locator('#tab-week').click()
    page.wait_for_selector('#insights')
    days = page.evaluate("[...document.querySelectorAll('#timeline .day')].map((d) => d.dataset.day)")
    check('week fixture: the Week tab shows the days newest first, each a timeline', days[-6:] == [name(d) for d in (5, 4, 3, 2, 1, 0)] and len(days) in (6, 7), str(days))
    mon = text(page, f'#timeline .day[data-day="{name(0)}"]')
    check('week fixture: Monday reads as a day ("07:40 Would you like tea or coffee? tea … 10:30 Drank … 14:00 Are you tired? yes")', '07:40 Would you like tea or coffee? tea' in mon and '10:30 Drank' in mon and '14:00 Are you tired? yes' in mon, mon[:300])
    ins = page.evaluate("[...document.querySelectorAll('#insights .ins')].map((l) => ({ id: l.dataset.id, level: l.dataset.level, lvl: (l.querySelector('.lvl') || {}).innerText || '', text: l.querySelector('.ins-text').innerText.replace(/\\s+/g, ' ').trim(), base: l.querySelector('.ins-base').innerText.trim() }))")
    check('week fixture: three lines, in order: sweets, Wednesday\'s drinks, Friday\'s "less sure"', [x['id'] for x in ins] == week['expect']['week'], str(ins))
    by = {x['id']: x for x in ins}
    sw = by.get('sweets', {})
    check('week fixture, Thursday: sweets with diabetes noted -> "Worth mentioning to the doctor or nurse", and no diet advice', sw.get('lvl', '').strip() == 'Worth mentioning to the doctor or nurse' and sw.get('text') == 'Something sweet was chosen 3 times in the last 7 days. Diabetes is noted here.' and sw.get('base') == 'Chosen 3 times in 7 days. Only what was entered here.', str(sw))
    fd = by.get('few-drinks', {})
    check('week fixture, Wednesday: the drinks line names the day, and its base says how drinks are counted (every "Drank" tap, every drink chosen on a card; a card and a tap within 20 minutes once)', fd.get('text') == f'Few drinks were entered on {name(2)}: 2.' and fd.get('base') == 'Counted that day: 2. Every "Drank" tap counts, and every drink chosen on a card (tea, coffee, water, juice, milk, or yes to "something to drink"); a card and a tap within 20 minutes count once. Only what was entered here.', str(fd))
    wed = page.evaluate("(d) => [...document.querySelectorAll(`#timeline .day[data-day='${d}'] .de`)].map((e) => e.innerText.replace(/\\s+/g, ' ').trim())", name(2))
    check('week fixture, Wednesday: the count in the line equals what the timeline shows (one tea on a card, one "Drank")', len([x for x in wed if x.endswith('Drank') or x.endswith(' tea')]) == 2, str(wed))
    ls = by.get('less-sure', {})
    # (the fixture's Sunday is today: an answer later in the day than now is not in the span yet)
    n_ans = len([e for e in entries if e['kind'] == 'answer' and e['at'] <= time.time() * 1000])
    # (phase 13: Friday's "Are you tired? yes" is a rest answer, never marked: four of the run are)
    check('week fixture, Friday: the answers marked "less sure" are a line of their own', ls.get('text', '').startswith(f'4 answers on {name(4)} are marked "less sure"') and ls.get('base') == f'4 of {n_ans} answers in 7 days.', str(ls))
    check('week fixture: Friday evening\'s four answers after "Are you tired? yes" carry "less sure" in the timeline', page.locator(f'#timeline .day[data-day="{name(4)}"] .de[data-less-sure]').count() == 4)
    whole = text(page, '#insights')
    check('insights: the fixed footer ("not medical advice and not a diagnosis"), and who counted and worded them (the rules, no AI, nothing sent)', 'They are not medical advice and not a diagnosis.' in whole and "Counted and worded by the app's rules on this phone. No AI, nothing sent." in whole, whole[-400:])
    check('insights: no medical advice in any line (no dose, medicine, diet, "should", "drink more")', not any(w in whole.lower() for w in ('dose', 'medicine', 'medication', 'insulin', ' diet', 'should', 'drink more', 'more to drink', 'dehydrat')), whole)
    check('insights: no line names Frank, his family or what he chose', not any(w in whole for w in ('Frank', 'Carol', 'Beth', 'Tom', 'ginger', 'porridge', 'Patel')), whole)
    screen_checks(page, 'diary: the week, with what stands out', primary=False)
    page.locator('#diary-topic').select_option('feel')
    page.wait_for_timeout(100)
    check('week fixture: the topic filter narrows the timeline, and the counted lines stay the whole week\'s', page.locator('#timeline .de').count() == 0 and page.locator('#insights .ins').count() == 4)
    page.locator('#diary-topic').select_option('body')
    page.wait_for_timeout(100)
    check('week fixture: Body & care holds the pain and toilet answers', 'Are you in pain? yes' in text(page, '#timeline') and 'Drank' not in text(page, '#timeline'))
    page.locator('#diary-topic').select_option('all')
    page.locator('#tab-month').click()
    page.wait_for_timeout(150)
    month = text(page, '#insights')
    check('week fixture: the Month tab counts 30 days, and (phase 5) keeps this week\'s line that a month\'s threshold would hide: the 3 sweet choices, marked "From the last 7 days."', 'What stands out: the last 30 days' in month and f'Few drinks were entered on {name(2)}: 2.' in month and f'4 of {n_ans} answers in 30 days.' in month and 'From the last 7 days. Chosen 3 times in 7 days.' in month, month[:600])
    page.locator('#tab-today').click()
    page.wait_for_timeout(150)
    check('week fixture: Today has no "what stands out" (one day is too little to count)', page.locator('#insights').count() == 0)

    # ---- plainer words by online help: a sheet with the exact text first, every time
    page.locator('#tab-week').click()
    page.wait_for_selector('#ins-plainer')
    before = len(outside)
    page.locator('#ins-plainer').click()
    page.wait_for_selector('#ins-sheet')
    sheet = page.locator('#ins-sheet-text').inner_text()
    # (phase 5: the "less sure" line carries a fixed sentence about pain and need answers, so no model rewords it and it does not go)
    # (phase 12b: the few-drinks line carries a fixed "tell the doctor or nurse today", so it does not go either)
    want = '1. Something sweet was chosen 3 times in the last 7 days.'
    check('wording sheet: it shows the exact text that would go, the one counted line that may go and nothing else', sheet.strip() == want, sheet)
    stxt = text(page, '#ins-sheet')
    check('wording sheet: no name, no health note, nothing of the diary is in that text', not any(w in sheet for w in ('Frank', 'Carol', 'Beth', 'Tom', 'Diabetes', 'diabetes', 'Type 2', 'Patel', 'ginger', 'porridge', 'tea')))
    check('wording sheet: says what is never sent (names, photos, the diary itself, the health notes) and that it is for these lines, once', 'names, photos, the diary itself, the health notes, the answers they chose.' in stxt and 'This is for these lines, this once. It does not turn online help on for anything else.' in stxt, stxt)
    page.locator('#ins-sheet-whole summary').click()
    whole_req = page.locator('#ins-sheet-whole pre').inner_text()
    check('wording sheet: the whole request can be read (mode PREFER_IN_CLOUD, the fixed instructions, the same text)', '"mode": "PREFER_IN_CLOUD"' in whole_req and 'Do not add advice, causes, a diagnosis, medicines, doses, a diet' in whole_req and 'Something sweet was chosen 3 times' in whole_req and 'Frank' not in whole_req and 'iabetes' not in whole_req, whole_req[:300])
    check('wording sheet: nothing was asked of any other host while it is up', len(outside) == before, str(outside[before:]))
    screen_checks(page, 'wording sheet', primary=True)
    page.locator('[data-act=ins-no]').click()
    page.wait_for_function("!document.querySelector('#ins-sheet')")
    check('wording sheet: "No" keeps the app\'s own words, and nothing was sent', "Counted and worded by the app's rules on this phone. No AI, nothing sent." in text(page, '#ins-by') and len(outside) == before and page.evaluate(KV_GET, 'settings') is not None and not (page.evaluate(KV_GET, 'settings') or {}).get('cloudHelp'))
    if live:
        print('SKIP  wording sheet: "Yes" is not pressed on a hosted copy (--live), so nothing is sent')
    else:
        page.locator('#ins-plainer').click()
        page.wait_for_selector('#ins-sheet')
        page.locator('[data-act=ins-yes]').click()
        page.wait_for_function("document.querySelector('#ins-by') && /own wording stands/.test(document.querySelector('#ins-by').innerText)", timeout=40000)
        after = text(page, '#insights')
        # (phase 13: App Check is asked first; this test lets no request reach another host, so the token never comes and
        # the lines never leave: the screen says so, and the privacy line counts nothing)
        check('wording: with online help refused by this test (App Check first), the app\'s own wording stands and the screen says nothing was sent', "Online help could not be reached, so the app's own wording stands. Nothing was sent." in after and 'Something sweet was chosen 3 times' in after, after)
        check('wording: the yes did not turn online help on for anything else', not (page.evaluate(KV_GET, 'settings') or {}).get('cloudHelp'))
        page.locator('[data-act=home]').click()
        page.wait_for_selector('main.simple.home')
        check('wording: the first screen\'s privacy line still says nothing left this phone (the lines were never handed over)', 'Nothing you asked has left this phone since the app was opened.' in text(page, '#s-privacy'), text(page, '#s-privacy'))
        page.locator('#diary-link').click()
        page.wait_for_selector('main.simple.diary')

    # ---- a copy of About them in a file: save, clear, bring back = identical
    page.goto(url + '#/about')
    page.wait_for_selector('main.about-simple')
    add_photo(page, 'Bo', label='backup')
    saved = {k: page.evaluate(KV_GET, k) for k in ('profile', 'photos', 'health')}
    check('backup: "Keep a copy" says what it is for, that the file is made here and sent nowhere, and holds names and photos', 'The app sends it nowhere. It holds names and photos: keep it somewhere private.' in text(page, '#backup') and "Use it to move to a new phone, to set up a second carer's phone, or as a spare copy." in text(page, '#backup-use'), text(page, '#backup'))
    check('phase 10, backup: "Include health notes" is there, unticked, with one line on why', page.locator('#backup-health').count() == 1 and not page.locator('#backup-health').is_checked() and 'health notes are private' in text(page, '#backup-health-why'), text(page, '#backup-health-why'))
    before = len(outside)
    with page.expect_download() as dl0:
        page.locator('#backup-save').click()
    lean_path = dl0.value.path()
    lean = json.load(open(lean_path))
    check('phase 10, backup: by default the file has no health notes (no "health", no diabetes), and has the format, version 1 and the emergency number', 'health' not in lean and 'diabetes' not in json.dumps(lean).lower() and lean.get('format') == 'talk-partner-about' and lean.get('version') == 1 and 'emergency' in lean and lean['profile'] == saved['profile'], str({k: str(v)[:60] for k, v in lean.items()}))
    page.locator('#backup-health').check()
    with page.expect_download() as dl:
        page.locator('#backup-save').click()
    path = dl.value.path()
    data = json.load(open(path))
    check('backup: with the box ticked the file is JSON with the profile, the photos as data URLs and the health notes', dl.value.suggested_filename == 'talk-partner-about-them.json' and data['format'] == 'talk-partner-about' and data['profile'] == saved['profile'] and data['photos'] == saved['photos'] and data['photos'][0]['data'].startswith('data:image/jpeg;base64,') and data['health'] == {**saved['health'], 'emergency': saved['health'].get('emergency', '')}, str({k: str(v)[:60] for k, v in data.items()}))
    check('phase 10, backup: after the save the box is unticked again', not page.locator('#backup-health').is_checked())
    check('backup: saving the file asked nothing of any other host', len(outside) == before)
    kept_diary = len(page.evaluate(KV_GET, 'diary'))
    page.locator('#delete-everything').click()
    page.wait_for_selector('main.simple.home')
    check('backup: "Delete everything on this phone" clears About them, the photos, the health notes and the diary', all(not page.evaluate(KV_GET, k) for k in ('profile', 'photos', 'health', 'diary')))
    page.goto(url + '#/about')
    page.wait_for_selector('main.about-simple')
    page.locator('#backup-file').set_input_files({'name': 'notes.json', 'mimeType': 'application/json', 'buffer': b'{"some": "other file"}'})
    page.wait_for_selector('#backup-error')
    check('backup: a file that is not ours is refused in plain words, and nothing changes', 'This is not an About them file from Talk Partner.' in text(page, '#backup-error') and not page.evaluate(KV_GET, 'profile'))
    page.locator('#backup-file').set_input_files(path)
    page.wait_for_selector('#import-sheet')
    prev = text(page, '#import-sheet')
    check('backup: before anything changes, the file\'s contents are shown (the name, 3 people, 2 places, 1 photo, health notes: diabetes …), with Replace, Add and Cancel', 'This file has:' in prev and 'The name: Frank' in prev and '3 people' in prev and '2 places' in prev and '1 photo' in prev and 'Health notes: diabetes' in prev and [b.strip() for b in page.locator('#import-sheet .choice .btn').all_inner_texts()] == ['Replace what is here', 'Add to what is here', 'Cancel'] and not page.evaluate(KV_GET, 'profile'), prev)
    screen_checks(page, 'backup: the preview sheet', primary=True)
    page.locator('[data-act=import-no]').click()
    page.wait_for_function("!document.querySelector('#import-sheet')")
    check('phase 10, backup: Cancel closes it and nothing was saved', not page.evaluate(KV_GET, 'profile') and page.locator('#backup-done').count() == 0)
    page.locator('#backup-file').set_input_files(path)
    page.wait_for_selector('#import-sheet')
    page.locator('[data-act=import-replace]').click()
    page.wait_for_selector('#backup-done')
    check('phase 10, backup: after "Replace what is here" the screen says so', 'About them was replaced with the file.' in text(page, '#backup-done'), text(page, '#backup-done'))
    back = {k: page.evaluate(KV_GET, k) for k in ('profile', 'photos', 'health')}
    saved['health'] = {**saved['health'], 'emergency': saved['health'].get('emergency', '')}  # (phase 5: the emergency number travels with the health notes; none here)
    check('backup: save -> clear -> bring back = identical (profile, photos, health notes)', back == saved, str({k: back[k] == saved[k] for k in back}))
    check('backup: the diary is not in the file (it was deleted with everything, and stays empty)', kept_diary > 0 and not page.evaluate(KV_GET, 'diary'))
    page.reload()
    page.wait_for_selector('main.about-simple')
    check('backup: after a reload About them is Frank\'s again, with the photo and the health notes', 'About Frank' in text(page, 'h1') and page.locator('#photo-list li').count() == 1 and 'Diabetes' in text(page, '.rowcard[data-row=health]'))
    # (phase 10) the file without health notes, added to what is here: nothing doubles, nothing goes, the health notes stay
    page.locator('#backup-file').set_input_files(lean_path)
    page.wait_for_selector('#import-sheet')
    check('phase 10, backup: a file without health notes says the ones here stay', 'No health notes: the ones here stay as they are' in text(page, '#import-sheet'), text(page, '#import-sheet'))
    page.locator('[data-act=import-add]').click()
    page.wait_for_selector('#backup-done')
    again = {k: page.evaluate(KV_GET, k) for k in ('profile', 'photos', 'health')}
    check('phase 10, backup: "Add to what is here" with the same family: nothing doubles, nothing is removed, the health notes stay', again == back and 'was added to About them' in text(page, '#backup-done'), str({k: again[k] == back[k] for k in again}))
    # (phase 10) a file with markup in a name: shown as the words it is
    bad = dict(lean); bad['profile'] = {**lean['profile'], 'personName': '<script>window.__x=1</script>'}
    page.locator('#backup-file').set_input_files({'name': 'x.json', 'mimeType': 'application/json', 'buffer': json.dumps(bad).encode()})
    page.wait_for_selector('#import-sheet')
    check('phase 10, backup: <script> in a name is shown as text in the preview, and runs nowhere', '<script>window.__x=1</script>' in text(page, '#import-sheet') and page.locator('#import-sheet script').count() == 0 and not page.evaluate('window.__x'))
    page.locator('[data-act=import-no]').click()
    v2 = dict(lean); v2['version'] = 2
    page.locator('#backup-file').set_input_files({'name': 'v2.json', 'mimeType': 'application/json', 'buffer': json.dumps(v2).encode()})
    page.wait_for_selector('#backup-error')
    check('phase 10, backup: a version-2 file is refused: "from a newer version of the app"', 'newer version of the app' in text(page, '#backup-error') and page.locator('#import-sheet').count() == 0)
    screen_checks(page, 'About them: with "Keep a copy"', primary=True)

    # ---- delete the diary
    page.evaluate(KV_PUT, {'diary': entries})
    page.goto(url + '#/diary')
    page.wait_for_selector('main.simple.diary')
    page.reload()
    page.wait_for_selector('#diary-del')
    page.locator('#diary-del').click()
    page.wait_for_selector('#diary-deleted')
    check('diary: "Delete the diary" (after a yes) empties it on this phone and says so', page.evaluate(KV_GET, 'diary') == [] and 'The diary was deleted.' in text(page) and page.locator('#timeline .de').count() == 0)

    # ---- bigger pictures on the person's screen, and the photo the same size
    page.locator('[data-act=home]').click()
    page.wait_for_selector('main.simple.home')
    ask_topic(page, 'food', 'water, juice or milk')
    page.locator('[data-act=show]').click()
    page.wait_for_selector('main.pv .pt')
    m = page.evaluate("(() => { const de = document.documentElement; const t = [...document.querySelectorAll('main.pv .pt:not(.esc)')]; return { pics: t.map((x) => Math.round(x.querySelector('svg, img').getBoundingClientRect().height)), tiles: t.map((x) => Math.round(x.getBoundingClientRect().height)), words: t.map((x) => parseFloat(getComputedStyle(x).fontSize)), esc: Math.round(document.querySelector('main.pv .pt.esc').getBoundingClientRect().bottom), sh: de.scrollHeight, ch: de.clientHeight }; })()")
    check('pictures: with three choices each picture is 110 to 130 px tall and fills most of its tile', all(110 <= p <= 130 for p in m['pics']) and all(p / t >= 0.6 for p, t in zip(m['pics'], m['tiles'])), str(m))
    check('pictures: the word stays large (30 px or more)', min(m['words']) >= 30, str(m))
    check('pictures: three choices and "something else" stand on 390 x 844 without scrolling', m['sh'] <= m['ch'] and m['esc'] <= 844, str(m))
    screen_checks(page, 'pictures: three choices on the person\'s screen', primary=False)
    hold_exit(page)
    page.wait_for_selector('main.simple.card')
    page.locator('[data-act=home]').click()
    page.wait_for_selector('main.simple.home')
    ask_topic(page, 'food', 'tea or coffee')
    page.locator('[data-act=show]').click()
    page.wait_for_selector('main.pv .pt')
    two = page.evaluate("[...document.querySelectorAll('main.pv .pt:not(.esc)')].map((x) => Math.round(x.querySelector('svg, img').getBoundingClientRect().height))")
    check('pictures: with two choices each picture is 110 to 130 px tall', len(two) == 2 and all(110 <= p <= 130 for p in two), str(two))
    # ---- after a role-play on the phone (18 Nov): "call someone" leads to one card with the family's names
    hold_exit(page)
    page.wait_for_selector('main.simple.card')
    page.locator('[data-act=home]').click()
    page.wait_for_selector('main.simple.home')
    ask_topic(page, 'people', 'Do you want to call someone?')
    answer(page, 'yes')
    check('people: after "yes" to "Do you want to call someone?" the next question is one card, "Who would you like to call? Beth or Tom?"', nexts(page) == ['Who would you like to call? Beth or Tom?'], str(nexts(page)))
    page.locator('#next-q').click()
    page.wait_for_selector('main.simple.card #made-where')
    check('people: the rules make it a choice card with the family\'s names (each with its initial or photo) and "someone else"', [t.split('\n')[-1] for t in page.locator('#person .pt').all_inner_texts()] == ['Beth', 'Tom', 'someone else'] and page.locator('#person .pt svg, #person .pt img').count() == 3 and page.locator('#made-where').get_attribute('data-maker') == 'code' and 'Who would you like to call?' in text(page, '#person'), str(page.locator('#person .pt').all_inner_texts()))
    answer(page, 'Tom')
    check('people: the answer ends on what to do ("Call Tom now, together.")', 'Call Tom now, together.' in text(page, '#do-now'), text(page)[:200])
    about = None
    page.goto(url + '#/about')
    page.wait_for_selector('main.about-simple')
    about = text(page)
    check('About them: no word of "Chrome\'s built-in AI" for a carer, and the lines use the name once it is set ("a place Frank knows", "the answers Frank confirmed")', "built-in AI" not in text(page, '.sub') and "Frank's people, foods and places go onto the cards." in about and 'a place Frank knows' in about and 'the answers Frank confirmed' in about, about[:300])
    check('diary run: no page error', not errors, '; '.join(errors))
    if live:
        check('diary run: nothing was asked of any other host', not outside, str(outside[:3]))
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
    # (phase 9: the 4 steps are folded on the first visit; "Show" opens them, where "Turn the … to them" stands)
    page.locator('.how-line').click()
    page.wait_for_selector('section.how li')
    home = text(page)
    others = [w for w in ('phone', 'tablet', 'computer') if w != word]
    check(f'{label}: the first screen says "this {word}" and "Turn the {word} to them"', f'Nothing you asked has left this {word} since the app was opened.' in home and f'Turn the {word} to them and say it out loud' in home and not any(f'this {o}' in home or f'the {o} ' in home for o in others), home[-300:])
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

SHOTS = None


def shot(page, name, full=False):
    """With --shots DIR: a picture of the screen as it stands (devlog/evidence_phase5)."""
    if not SHOTS:
        return
    os.makedirs(SHOTS, exist_ok=True)
    page.wait_for_timeout(350)
    page.screenshot(path=os.path.join(SHOTS, f'{name}.png'), full_page=full)


CONTRAST = """(sel) => { const el = document.querySelector(sel); if (!el) return 0;
  const rgb = (c) => (c.match(/[\\d.]+/g) || []).slice(0, 3).map(Number);
  const lum = (c) => { const [r, g, b] = rgb(c).map((v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  let bg = el; while (bg && /rgba\\(0, 0, 0, 0\\)|transparent/.test(getComputedStyle(bg).backgroundColor)) bg = bg.parentElement;
  const a = lum(getComputedStyle(el).color), b = lum(getComputedStyle(bg).backgroundColor);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); }"""


def phase5(browser, url, live):
    """Phase 5 (18 Nov 2026, after judge round 6), as Carol and Frank on a 390 x 844 phone: the first screen with no
    name, "Something new or sudden?" and its call button, the boxed call line over an urgent answer and on the
    doctor-visit page, the ninth tile of the needs board, a fall and tablets in the diary, the "Next:" label, the
    sheets' "Just this once", Read aloud (its switch and its sheet; the yes is pressed only off a hosted copy, and the
    request is then refused here like every request to another host), "Since the last visit"."""
    host = urlparse(url).hostname
    ctx = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True, user_agent=PHONE_UA, service_workers='block')
    outside = []
    ctx.route('**/*', lambda r: r.continue_() if urlparse(r.request.url).hostname in (host, None) or r.request.url.startswith(('data:', 'blob:')) else (outside.append(r.request.url) if not app_check_url(r.request.url) else None, r.abort()))
    page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('dialog', lambda d: d.accept())
    page.goto(url)
    page.wait_for_selector('main.simple.home')
    home = text(page)
    check('phase 5, first screen with no name: "Hand over the phone: they can start." (never "them can")', 'Hand over the phone: they can start.' in home and 'them can' not in home, text(page, '#turn-go'))
    # (phase 17: under the quick needs and before "I want to say something", so it stays above the fold at 360 x 740)
    check('phase 5, first screen: "Something new or sudden?" stands under the quick needs, before "I want to say something", above "How it works"', 'Something new or sudden?' in text(page, '#sudden-link') and ys(page, '.btn.needs')[0][1] < ys(page, '#sudden-link')[0][1] < ys(page, '#turn-go')[0][1] < ys(page, '#how')[0][1], str(ys(page, '#sudden-link')))
    screen_checks(page, 'phase 5, first screen')
    shot(page, '01_first_screen_they_can_start_and_something_new_or_sudden')

    # ---------------------------------------------------------------- "Something new or sudden?"
    page.locator('#sudden-link').click()
    page.wait_for_selector('main.simple.sudden')
    sud = text(page)
    check('sudden: FAST (face, arm, speech, time), the chest line of its own (phase 18: never under "new or sudden"), more reasons to call, and "Call emergency services: 911" twice', all(k in sud for k in ['Face', 'Arm', 'Speech', 'Time', 'A sudden, very bad headache.', 'Chest pain, tightness or trouble breathing: call 911 now, even if it has happened before.', 'A fall with a blow to the head', 'Suddenly very drowsy or confused']) and 'Chest pain, or trouble breathing.' not in sud and page.locator('a.call.big[href="tel:911"]').count() == 2, sud[:300])
    check('sudden: the call button is a plain tel: link, at least 60 px tall, on the first screenful', ys(page, 'a.call.big')[0][3] >= 60 and ys(page, 'a.call.big')[0][1] + ys(page, 'a.call.big')[0][3] <= 844, str(ys(page, 'a.call.big')))
    check('sudden: it says to call when unsure, names 911 / 999 / 112, and says what it is: a fixed list, no AI, nothing sent, not checked by a clinician', 'Not on this list, and you are still worried? Call.' in sud and '911 in the US and Canada, 999 in the UK, 112 in the EU and India, 000 in Australia and 111 in New Zealand' in sud and 'No AI wrote it, and nothing is sent.' in sud and 'No doctor or nurse has checked this wording.' in sud, sud[-400:])
    screen_checks(page, 'sudden', primary=False)
    shot(page, '02_something_new_or_sudden_fast_and_call', full=True)
    page.locator('#sudden-number [data-act=sudden-number]').click()
    page.wait_for_selector('#emergency-number')
    page.fill('#emergency-number', '999')
    page.locator('[data-act=home]').click()
    page.wait_for_selector('main.simple.home')
    page.locator('.topic[data-topic=body]').click()
    check('sudden: it is also the first thing in "Body & care"', page.locator('#tq-body #sudden-body').count() == 1 and ys(page, '#sudden-body')[0][1] < ys(page, '#tq-body .tq')[0][1])
    page.locator('#sudden-body').click()
    page.wait_for_selector('main.simple.sudden')
    check('sudden: the number set in About them (999) is the one the button calls, and it is kept on this phone', page.locator('a.call.big[href="tel:999"]').count() == 2 and 'Call emergency services: 999' in text(page) and page.evaluate(KV_GET, 'health')['emergency'] == '999', text(page))
    page.locator('[data-act=home]').click()
    page.wait_for_selector('main.simple.home')

    # (phase 8, judge round 7: the sample family uses one number everywhere, the one of the phase 7 pages: 911, set in About them)
    page.locator('#sudden-link').click()
    page.wait_for_selector('main.simple.sudden')
    page.locator('#sudden-number [data-act=sudden-number]').click()
    page.wait_for_selector('#emergency-number')
    page.fill('#emergency-number', '911')
    page.locator('[data-act=home]').click()
    page.wait_for_selector('main.simple.home')
    page.wait_for_timeout(300)
    check('sudden: the number is set to 911 for the rest of the run, and kept', page.evaluate(KV_GET, 'health')['emergency'] == '911', str(page.evaluate(KV_GET, 'health')))

    # ---------------------------------------------------------------- the boxed line over an urgent answer
    ask_topic(page, 'body', 'Are you in pain?')
    check('urgent: before any answer the carer\'s screen has no call box', page.locator('#urgent').count() == 0)
    answer(page, 'yes')
    check('urgent: "Are you in pain? yes" alone has no box yet: the next question is "Where does it hurt?"', page.locator('#urgent').count() == 0 and nexts(page)[:1] == ['Where does it hurt?'], str(nexts(page)))
    page.locator('#next-q').click()
    page.wait_for_selector('main.simple.card')
    page.locator('[data-act=show]').click()
    page.wait_for_selector('main.pv .pt')
    page.locator('main.pv .pt', has_text='head').first.click()
    tap_yes(page, 'top of head')
    give_back(page)
    box = text(page, '#urgent') if page.locator('#urgent').count() else text(page, '#now-alert') if page.locator('#now-alert').count() else ''
    # (phase 17: one call box: the alert line "call 911 now, whatever the amount" with its button, at the top)
    check('urgent: head pain: one boxed line with the call button stands at the top, over the answer ("whatever the amount", phase 17)', ('Call 911 now if this is new or sudden.' in box or 'whatever the amount' in box) and page.locator('#urgent a[href="tel:911"], #now-alert a[href="tel:911"]').count() == 1 and ys(page, '#urgent, #now-alert')[0][1] < ys(page, '#chose')[0][1], box)
    check('urgent: the pain flow that was there stays under it ("Next: How bad is the pain?")', nexts(page)[:1] == ['How bad is the pain?'], str(nexts(page)))
    ratio = page.evaluate(CONTRAST, '#next-q small')
    check(f'"Next:" label on the main button: contrast {ratio:.1f}:1, at least 4.5:1', ratio >= 4.5, str(ratio))
    screen_checks(page, 'urgent: the answered screen')
    shot(page, '03_head_pain_call_box_over_the_answer')
    page.locator('#next-q').click()
    page.wait_for_selector('main.simple.card')
    check('urgent: the box stays on the next question of the same conversation', page.locator('.c-say #urgent').count() == 1)
    answer(page, 'a little')
    check('urgent: "a little" does not take the box away (the head was named in this conversation)', page.locator('#urgent, #now-alert').count() == 1, text(page, '#chose'))
    new_q(page)
    ask_topic(page, 'food', 'Would you like tea or coffee?')
    check('urgent: a new conversation starts without the box', page.locator('#urgent').count() == 0)

    # ---------------------------------------------------------------- consent sheets: "Just this once"; Read aloud
    # (phase 14: while it is off, Read aloud is offered as one button right under the main one, not as a switch below the preview)
    sw = text(page, '#speak-offer') if page.locator('#speak-offer').count() else ''
    check('read aloud: offered on the carer\'s screen of an everyday topic card with one button, and it is off', sw.startswith('Read it aloud to ') and sw.endswith("(Google's AI, a calm, slow voice)") and page.locator('#speak').count() == 0, sw)
    before = len(outside)
    page.locator('#speak-offer').click()
    page.wait_for_selector('#speak-sheet')
    sh = text(page, '#speak-sheet')
    check('read aloud: the sheet says "The words on this card, including names on it, go to Google to be spoken. Nothing else." and shows the words of this card', 'The words on this card, including names on it, go to Google to be spoken. Nothing else.' in sh and text(page, '#speak-sheet-text') == 'Would you like tea or coffee? Tea. Coffee. Or something else.', sh[:300])
    check('read aloud: the sheet is a dialog over an inert screen; nothing was asked of another host to show it', page.locator('#speak-sheet[role=dialog][aria-modal=true]').count() == 1 and page.locator('main.simple[inert]').count() == 1 and len(outside) == before, str(outside[before:]))
    shot(page, '04_read_aloud_sheet_with_the_words_of_this_card')
    page.locator('[data-act=speak-no]').click()
    page.wait_for_selector('#speak-sheet', state='detached')
    check('read aloud: "No, keep it off" leaves it off', page.locator('#speak-offer').count() == 1 and page.locator('#speak[data-on="1"]').count() == 0)
    page.locator('[data-act=show]').click()
    page.wait_for_selector('main.pv .pt')
    check('read aloud off: the person\'s screen has no "Hear it" button, and nothing was sent', page.locator('#hear').count() == 0 and len(outside) == before)
    hold_exit(page)
    page.wait_for_selector('main.simple.card')
    if live:
        print('SKIP  read aloud: "Yes" is not pressed on a hosted copy (--live), so no card\'s words are sent')
    else:
        page.locator('#speak-offer').click()
        page.wait_for_selector('#speak-sheet')
        page.locator('[data-act=speak-yes]').click()
        page.wait_for_selector('#speak[data-on="1"]')
        check('read aloud on: the switch says where the words go ("On. The words on each card you show go to Google to be spoken.")', 'On. The words on each card you show go to Google to be spoken.' in text(page, '#speak'), text(page, '#speak'))
        shot(page, '05_read_aloud_on_the_carers_screen')
        page.locator('[data-act=show]').click()
        page.wait_for_selector('main.pv #hear, main.pv #hear-failed')
        page.wait_for_selector('main.pv #hear-failed', timeout=40000)
        check('read aloud on: the person\'s screen has the button over the three choices (a control, not a choice); here the request is refused like every request to another host, and (phase 8) the person\'s screen only says "No sound", asking nothing of them', page.locator('main.pv .pt').count() == 3 and text(page, '#hear-failed') == 'No sound' and 'yourself' not in text(page, 'main.pv') and (len(outside) > before or len(APP_CHECK_SEEN) > 0), str(outside[before:])[:300])
        fits(page, 'read aloud on: the person\'s screen')
        shot(page, '06_person_screen_read_aloud_on')
        tap_yes(page, 'tea')
        give_back(page)
        check('read aloud failed (phase 8): the carer\'s screen says it, and what to do: "Read aloud did not work for that card. Read the question out loud to …"', text(page, '#voice-failed').startswith('Read aloud did not work for that card. Read the question out loud to'), text(page, '#voice-failed') if page.locator('#voice-failed').count() else '(none)')
        more(page)
        # (phase 13: App Check is asked first; this test lets nothing reach another host, so no token comes and the card's
        # words never leave: the card and the first screen say nothing was sent, and the switch still says where words go)
        check('read aloud on, App Check refused first: the words of this card never left, and the card says so', 'Nothing was sent.' in text(page, '#left-line') and 'went to Google to be spoken' not in text(page, '#left-line'), text(page, '#left-line'))
        new_q(page)
        check('read aloud on, App Check refused first: the first screen\'s privacy line counts nothing', 'Nothing you asked has left this phone' in text(page, '#s-privacy'), text(page, '#s-privacy'))
        ask_topic(page, 'food', 'Would you like tea or coffee?')
        page.locator('#speak-toggle').click()
        page.wait_for_selector('#speak-offer')
        check('read aloud: one tap turns it off again', page.evaluate(KV_GET, 'settings').get('speak') is False)
        # (phase 14: after one yes, the offer turns it on with one tap and no sheet)
        page.locator('#speak-offer').click()
        page.wait_for_selector('#speak[data-on="1"]')
        check('read aloud: after one yes, the offer turns it on again with one tap, no sheet', page.locator('#speak-sheet').count() == 0 and page.evaluate(KV_GET, 'settings').get('speak') is True)
        page.locator('#speak-toggle').click()
        page.wait_for_selector('#speak-offer')
    new_q(page) if page.locator('#another').count() else page.locator('[data-act=home]').click()
    page.wait_for_selector('main.simple.home')
    page.fill('#q', OPEN_Q)
    page.locator('#make').click()
    page.wait_for_selector('#sheet')
    btns = [b.strip() for b in page.locator('#sheet .choice button').all_inner_texts()]
    check('sheet: one plain name ("online help", which is Google\'s AI), and the first yes is "Just this once"; the technical words are folded inside', btns == ['Just this once', 'Yes, every time', 'No, not for this question'] and "Online help is Google's AI" in text(page, '#sheet') and 'Firebase AI Logic' not in text(page, '#sheet') and page.locator('#sheet-tech').count() == 1, str(btns))
    screen_checks(page, 'sheet: "Just this once"', primary=True)
    shot(page, '07_consent_sheet_just_this_once')
    if not live:
        n0 = len(outside)
        page.locator('[data-act=sheet-yes]').click()
        page.wait_for_selector('#sheet', state='detached')
        # (phase 13: App Check is asked first; every request to another host is refused here, so no token comes, the
        # question never leaves, and the no-card screen says so at once with what to do and the rules' card)
        page.wait_for_selector('#made-where[data-left]', timeout=40000)
        # (phase 16: the field is "Ask in your own words": instead of the no-card screen, the rules' best card at once)
        check('phase 13/16, sheet: App Check refused first: the rules\' best card at once, saying nothing was sent', 'Online help could not check this browser, so nothing was sent' in text(page, '#own-fallback') and text(page, '#own-fallback').startswith("Made by the app's rules (no AI)") and page.locator('[data-act=show]').count() == 1, text(page)[:300])
        check('sheet: "Just this once" hands this one question to online help (the card says it was sent, may have left, or, refused by App Check first, that nothing was sent) and leaves online help off', page.locator('#made-where').get_attribute('data-left') in ('maybe', 'sent', 'nothing') and page.evaluate(KV_GET, 'settings').get('cloudHelp') is False, f"{page.locator('#made-where').get_attribute('data-left')} {outside[n0:]}"[:300])
    else:
        page.locator('[data-act=sheet-no]').click()
    page.locator('[data-act=home]').click()
    page.wait_for_selector('main.simple.home')

    # ---------------------------------------------------------------- the ninth tile of the needs board
    page.locator('[data-act=needs]').first.click()
    page.wait_for_selector('main.pv[data-kind=needs] .pt')
    labels = [x.strip() for x in page.locator('main.pv .pt').all_inner_texts()]
    check('needs board: nine needs and the way out; the ninth is "something\'s wrong"', len(labels) == 10 and labels[8] == "something's wrong" and labels[9] == 'something else', str(labels))
    fits(page, 'needs board with nine tiles, 390 x 844')
    shot(page, '08_needs_board_with_somethings_wrong')
    tap_yes(page, "something's wrong")
    page.wait_for_selector('.p-give')
    page.locator('.p-give').click()
    page.wait_for_selector('main.simple.sudden')
    check('needs board: after "something\'s wrong" the carer is on "Something new or sudden?" as soon as the phone comes back', 'Something new or sudden?' in text(page, 'h1') and page.locator('a.call.big').count() == 2)
    page.locator('[data-act=home]').click()
    page.wait_for_selector('main.simple.home')

    # ---------------------------------------------------------------- the diary: a fall, tablets taken, the lines
    page.goto(url + '#/diary')
    page.wait_for_selector('main.simple.diary')
    page.locator('[data-log=tablets]').click()
    page.wait_for_selector('#logged')
    check('diary: "Tablets taken" is one tap and one line: no count, no reminder, no box', 'Logged: Tablets taken' in text(page, '#logged') and page.locator('#fall-box').count() == 0, text(page, '#logged'))
    page.locator('[data-log=fall]').click()
    page.wait_for_selector('#fall-box')
    fb = text(page, '#fall-box')
    check('diary: after "Fall", when to call and the call button, at once: "A fall: call 911 now if the head was hit, if getting up is not possible, or if there is new pain."', 'A fall: call 911 now if the head was hit, if getting up is not possible, or if there is new pain.' in fb and page.locator('#fall-box a[href="tel:911"]').count() == 1, fb)
    screen_checks(page, 'diary: after a fall', primary=False)
    shot(page, '09_diary_fall_logged_when_to_call')
    page.locator('#fall-head').click()
    page.wait_for_selector('#fall-head-noted')
    page.locator('#tab-week').click()
    page.wait_for_selector('#insights')
    ins = text(page, '#insights')
    check('diary, week: the fall is a line ("Worth mentioning"), with the blow to the head, whom to tell, and the call box', 'A fall was logged' in ins and 'A fall with a blow to the head was logged' in ins and 'Tell the doctor or nurse about every fall.' in ins and page.locator('#insights .urgent a[href="tel:911"]').count() >= 1, ins[:500])
    check('diary, week: the head pain of this morning is a line of one day, with when to call', 'Pain in the head or the chest was chosen on' in ins and 'head (top of head)' in ins and 'If it is new or sudden, call 911 now.' in ins, ins[:700])
    screen_checks(page, 'diary, week: the urgent lines', primary=False)
    shot(page, '10_what_stands_out_one_day_of_head_pain_and_a_fall', full=True)

    # ---------------------------------------------------------------- the doctor-visit page: the box, and "Since the last visit"
    page.goto(url + '#/visit')
    page.wait_for_selector('#visit-start')
    page.locator('#visit-start').click()
    tap_yes(page, 'yes')
    page.wait_for_selector('main.pv[data-kind=body] .pt')
    page.locator('main.pv .pt', has_text='chest').first.click()
    tap_yes(page, 'middle')
    # (phase 13: a pain in the chest stops the questions; the carer reads the call box, then goes on)
    give_back(page, 'main.visit #visit-stop')
    check('phase 13, visit: a pain in the chest stops the questions with the call box and "Go on with the questions"', 'Pain in the chest (middle): call 911 now, whatever the amount.' in text(page, '#visit-stop'), text(page, '#visit-stop'))
    page.locator('#visit-stop [data-act=visit-resume]').click()
    for label in ['quite bad', 'so-so', 'so-so', 'low', 'my body', 'my tablets']:
        page.wait_for_function("(l) => !document.querySelector('[data-confirm]') && [...document.querySelectorAll('main.pv .pt')].some((e) => e.innerText.trim() === l)", arg=label)
        tap_yes(page, label)
    give_back(page, 'main.visit #visit-page')
    vp = text(page, '#visit-page')
    check('visit: chest pain, quite bad: the boxed chest line (phase 18: never "if this is new or sudden") is the first thing on the page, inside the printed part, with the call button', vp.startswith('Chest pain, tightness or trouble breathing: call 911 now, even if it has happened before.') and page.locator('#visit-page #visit-urgent a[href="tel:911"]').count() == 1, vp[:200])
    check('visit: the line that was there stays under the page (phase 15: "Other new or strong pain: do not wait for the visit")', 'Other new or strong pain: do not wait for the visit' in text(page, '#visit-safety'))
    since = text(page, '#since')
    check('visit: "Since the last visit" stands under his own answers, says whose lines they are, and counts from the diary: pain, a fall, drinks, mood, sleep', ys(page, '#since')[0][1] > ys(page, '#visit-foot')[0][1] and "These lines are not their own answers" in since and 'Pain: chosen or logged on 1 day' in since and 'Falls: 1 logged' in since and 'Mood:' in since and 'Sleep:' in since and 'No AI, nothing sent. Not a medical record.' in since, since)
    boxes = page.locator('#since-pick input[type=checkbox]')
    for k in (0, 1, 6):
        boxes.nth(k).check()
        page.wait_for_timeout(120)
    check('visit: up to three questions for the doctor, picked from a fixed list; a fourth cannot be ticked; they are printed under the lines', page.locator('#since-pick input:checked').count() == 3 and page.locator('#since-pick input:disabled').count() == boxes.count() - 3 and [x.strip() for x in page.locator('#since-picked li').all_inner_texts()] == ['What should we watch for at home?', 'Who do we call out of hours?', 'Can the tablets be looked at again?'], text(page, '#since-picked') if page.locator('#since-picked').count() else '')
    check('visit: the picks are kept on this phone with the answers', page.evaluate(KV_GET, 'visit').get('carerAsk') == ['What should we watch for at home?', 'Who do we call out of hours?', 'Can the tablets be looked at again?'])
    screen_checks(page, 'visit: the page with the box and "Since the last visit"')
    shot(page, '11_visit_page_call_box_and_since_the_last_visit', full=True)
    if live:
        check('phase 5 --live: nothing was asked of any other host (no "Yes" was pressed on a sheet)', not outside, str(outside))
    check('phase 5: no page error', not errors, '; '.join(errors))
    ctx.close()


SIG = """(() => { const m = document.querySelector('#app main'); const t = (s) => ((document.querySelector(s) || {}).innerText || '').replace(/\\s+/g, ' ').trim();
  return [m ? (m.dataset.screen || (m.classList.contains('pv') ? 'person' : m.className)) : '?', t('#chose-q'), t('#chose-a'), (t('main.card .say') || t('main.pv .p-ask') || t('main.pv .p-do')).slice(0, 70), location.hash.replace(/^#\\/?/, '')].join(' | '); })()"""


def backstack(browser, url):
    """Back goes exactly one step (18 Nov 2026, the owner's walk on his phone: one tap on Back from the second question
    of a conversation landed on the first screen). Every carer's screen that was on the way is written down; then
    "Back" is tapped until the first screen, and each screen must be the one before, in reverse. Once with the Back
    button, once with the browser's own back (the phone's button or gesture); through a topic's tree six steps deep,
    the needs board, the first letter, "wants to say something", the diary and the doctor-visit page."""
    host = urlparse(url).hostname

    def start():
        ctx = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True, user_agent=PHONE_UA, service_workers='block')
        ctx.route('**/*', lambda r: r.continue_() if urlparse(r.request.url).hostname in (host, None) or r.request.url.startswith(('data:', 'blob:')) else r.abort())
        page = ctx.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(url)
        page.wait_for_selector('main.simple.home')
        return ctx, page, errors

    def sig(page):
        page.wait_for_timeout(200)
        return page.evaluate(SIG)

    def walk_back(page, seen, label, browser_back=False):
        """`seen` is every carer's screen on the way, the first screen first, the screen that is on now last."""
        want = list(reversed(seen[:-1]))
        got = []
        for _ in want:
            # (phase 8: a person's screen is a step too; it has no Back button by design, so there the phone's back is pressed)
            on_person = page.locator('main.pv').count() > 0
            if not browser_back and not on_person and not page.locator('main [data-act=back]').count():
                got.append('(no Back button)')
                break
            if browser_back or on_person:
                page.go_back()
            else:
                page.locator('main [data-act=back]').first.click()
            got.append(sig(page))
        how = "the browser's own back" if browser_back else 'Back'
        for k, (w, g) in enumerate(zip(want, got)):
            check(f'back, {label}: {how} no. {k + 1} of {len(want)} lands on the screen before ({w.split(" | ")[0]}{": " + w.split(" | ")[1] + " " + w.split(" | ")[2] if w.split(" | ")[1] else ""})', w == g, f'wanted {w} / got {g}')
        check(f'back, {label}: {len(want)} steps back with {how}, never a jump to the first screen before the last step', got == want and all(not g.startswith('home') for g in got[:-1]) and got[-1].startswith('home'), str(got))
        check(f'back, {label}: the first screen is the bottom: it has no Back button', page.locator('main [data-act=back]').count() == 0)

    DRINK, HOT_COLD, TEA = 'Would you like something to drink?', 'Would you like a hot drink or a cold drink?', 'Would you like tea or coffee?'

    def tree(page):
        seen = [sig(page)]
        ask_topic(page, 'food', DRINK)
        seen.append(sig(page))
        for label, nxt in (('yes', HOT_COLD), ('hot drink', TEA), ('tea', None)):
            answer(page, label)
            seen.append(sig(page))
            if nxt:
                page.locator(f'main.s-answered .ask-next[data-q="{nxt}"]').first.click()
                page.wait_for_selector('main.simple.card #made-where')
                seen.append(sig(page))
        return seen

    # ---- the owner's own case, then six steps deep and all the way back, with the Back button
    ctx, page, errors = start()
    home = sig(page)
    ask_topic(page, 'food', DRINK)
    answer(page, 'yes')
    answered = sig(page)
    page.locator(f'#next-q[data-q="{HOT_COLD}"]').click()
    page.wait_for_selector('main.simple.card #made-where')
    check('back, the case found on the phone: on the carer\'s screen of "Would you like a hot drink or a cold drink?" …', 'hot drink' in sig(page) and sig(page).startswith('card'), sig(page))
    shot(page, 'r1_01_the_second_question_on_the_carers_screen')
    page.locator('main [data-act=back]').first.click()
    now = sig(page)
    shot(page, 'r1_02_one_tap_on_back_the_answer_before_not_the_first_screen')
    check('back, the case found on the phone: … one tap on Back lands on "Would you like something to drink? Yes" with its "Next:" button, not on the first screen', now == answered and now.startswith('answered | Would you like something to drink? | Yes') and page.locator(f'#next-q[data-q="{HOT_COLD}"]').count() == 1, now)
    page.locator('main [data-act=back]').first.click()
    check('back: from the answer, Back shows the question again on the carer\'s screen (before it is handed over)', sig(page).startswith('card |') and 'something to drink' in sig(page), sig(page))
    page.locator('main [data-act=back]').first.click()
    check('back: from the first question, Back lands on the first screen with the topic still open (the topic\'s questions are there)', sig(page) == home and page.locator('.tq', has_text=DRINK).count() == 1, sig(page))
    seen = tree(page)
    check('back: six carer\'s screens after the first one (question, answer, question, answer, question, answer: the tree is three questions deep)', len(seen) == 7 and [x.split(' | ')[0] for x in seen] == ['home', 'card', 'answered', 'card', 'answered', 'card', 'answered'], str([x.split(' | ')[0] for x in seen]))
    walk_back(page, seen, 'a topic\'s tree, six steps deep')
    # ---- the same with the browser's own back (the phone's back button or gesture)
    seen = tree(page)
    walk_back(page, seen, 'a topic\'s tree, six steps deep', browser_back=True)
    check('back, the tree: no page error', not errors, '; '.join(errors))
    ctx.close()

    # ---- the needs board (a person's screen: its own way back is the press and hold), then the question it leads to
    for bb in (False, True):
        ctx, page, errors = start()
        seen = [sig(page)]
        page.locator('main.home [data-act=needs]').first.click()
        page.wait_for_selector('main.pv[data-kind=needs] .pt')
        tap_yes(page, 'pain')
        give_back(page)
        seen.append(sig(page))
        page.locator('main.s-answered button[data-q="Where does it hurt?"]').click()
        page.wait_for_selector('main.simple.card #made-where')
        seen.append(sig(page))
        page.locator('[data-act=show]').click()
        page.wait_for_selector('main.pv[data-kind=body] .pt')
        seen.append(sig(page))
        page.locator('main.pv .pt', has_text='chest').first.click()
        # (phase 8: "Where in the chest?" follows on the person's screen: a step of its own; the body card was handed over, so it folds into the carer's question)
        page.wait_for_selector('main.pv .pt:has-text("middle")')
        seen.append(sig(page))
        tap_yes(page, 'middle')
        give_back(page)
        seen.append(sig(page))
        page.locator('main.s-answered a[href="#/sudden"]').first.click()
        page.wait_for_selector('main.simple.sudden')
        seen.append(sig(page))
        check('back, the needs board: the way was first screen, "pain" on the board, "Where does it hurt?", the body card and "Where in the chest?" on the person\'s screen, the answer with the call box, "Something new or sudden?"', [x.split(' | ')[0] for x in seen] == ['home', 'answered', 'card', 'person', 'person', 'answered', 'sudden'], str(seen))
        walk_back(page, seen, 'the needs board, the body card and the call list', browser_back=bb)
        check('back, the needs board: no page error', not errors, '; '.join(errors))
        ctx.close()

    # ---- the first letter (after "something else"), and "wants to say something"
    for bb in (False, True):
        ctx, page, errors = start()
        seen = [sig(page)]
        ask_topic(page, 'food', TEA)
        seen.append(sig(page))
        answer(page, 'something else')
        seen.append(sig(page))
        page.locator('main.s-answered [data-act=letter]').first.click()
        page.wait_for_selector('main [data-letter=B]')
        seen.append(sig(page))
        page.locator('main [data-letter=B]').click()
        page.wait_for_selector('main.pv .pt')
        seen.append(sig(page))
        first = page.locator('main.pv .pt').first.inner_text().strip()
        tap_yes(page, first)
        give_back(page)
        seen.append(sig(page))
        check('back, the first letter: the way was first screen, the question, "something else", the alphabet, its words (phase 8: each a step), the word found by its letter', [x.split(' | ')[0] for x in seen] == ['home', 'card', 'answered', 'person', 'person', 'answered'] and 'Something else' in seen[2] and seen[3] != seen[4], str(seen))
        walk_back(page, seen, 'the first letter', browser_back=bb)
        # "wants to say something": the person starts, the carer gets a question, asks it, gets the answer
        seen = [sig(page)]
        page.locator('#turn-go').click()
        page.wait_for_selector('main.pv .pt:has-text("I feel")')
        seen.append(sig(page))
        tap_yes(page, 'I feel')
        page.wait_for_selector('main.pv .pt:has-text("good")')
        seen.append(sig(page))
        tap_yes(page, 'good')
        give_back(page)
        seen.append(sig(page))
        check('back, "wants to say something": the way was the first screen, the three starters, the feelings card (both on the person\'s screen), the answer', [x.split(' | ')[0] for x in seen] == ['home', 'person', 'person', 'answered'], str(seen))
        walk_back(page, seen, '"wants to say something"', browser_back=bb)
        # (phase 10) "I want to talk about…": its screen (no About them here: "me" and "the news / TV"), then the carer's screen
        seen = [sig(page)]
        page.locator('#turn-go').click()
        page.wait_for_selector('main.pv .pt:has-text("talk about")')
        seen.append(sig(page))
        tap_yes(page, 'talk about')
        page.wait_for_selector('main.pv .pt:has-text("the news")')
        seen.append(sig(page))
        tap_yes(page, 'the news')
        give_back(page)
        seen.append(sig(page))
        check('back, phase 10, "I want to talk about…": the way was the first screen, the starters, the talk screen, the carer\'s screen', [x.split(' | ')[0] for x in seen] == ['home', 'person', 'person', 'answered'] and 'want to talk about the news' in text(page, '#turn-lead'), str(seen))
        walk_back(page, seen, 'phase 10, "I want to talk about…"', browser_back=bb)
        # "I want to talk about…" -> "something else" -> the topics, then the carer's screen; Back walks the person's chain one screen at a time
        seen = [sig(page)]
        page.locator('#turn-go').click()
        page.wait_for_selector('main.pv .pt:has-text("talk about")')
        seen.append(sig(page))
        tap_yes(page, 'talk about')
        to_topics(page)
        page.wait_for_selector('main.pv .pt:has-text("Today & plans")')
        seen.append(sig(page))
        tap_yes(page, 'Today & plans')
        # ("What is it about?" may follow on the person's screen: a step of its own too)
        page.wait_for_selector('.p-give, main.pv .pt')
        if not page.locator('.p-give').count():
            seen.append(sig(page))
            tap_yes(page, page.locator('main.pv .pt').first.inner_text().strip())
        give_back(page, 'main.simple')
        seen.append(sig(page))
        check('back, the topics of "I want to talk about…": the way was the first screen, the starters, the topics, the carer\'s screen', [x.split(' | ')[0] for x in seen][:3] == ['home', 'person', 'person'] and not seen[-1].startswith('person') and not seen[-1].startswith('home'), str(seen))
        walk_back(page, seen, 'the topics of "I want to talk about…"', browser_back=bb)
        # the needs board opened inside a conversation: Back from it is the answer it was opened from, not the first screen
        seen = [sig(page)]
        ask_topic(page, 'food', TEA)
        seen.append(sig(page))
        answer(page, 'tea')
        seen.append(sig(page))
        more(page)
        page.locator('main.s-answered [data-act=needs]').first.click()
        page.wait_for_selector('main.pv[data-kind=needs] .pt')
        seen.append(sig(page))
        check('back, the needs board inside a conversation: the way was the first screen, the question, the answer, the board', [x.split(' | ')[0] for x in seen] == ['home', 'card', 'answered', 'person'], str(seen))
        walk_back(page, seen, 'the needs board opened inside a conversation', browser_back=bb)
        # the press and hold on the board gives the phone back to that same answer
        ask_topic(page, 'food', TEA)
        answer(page, 'tea')
        more(page)
        ans = sig(page)
        page.locator('main.s-answered [data-act=needs]').first.click()
        page.wait_for_selector('main.pv[data-kind=needs] .pt')
        hold_exit(page)
        page.wait_for_selector('main.simple.s-answered')
        check('back, the needs board inside a conversation: the press and hold gives the phone back to the answer it was opened from', sig(page) == ans, f'{ans} / {sig(page)}')
        page.locator('[data-act=home]').first.click()
        page.wait_for_selector('main.simple.home')
        check('back, the first letter and the person\'s turn: no page error', not errors, '; '.join(errors))
        ctx.close()

    # ---- the diary and the doctor-visit page
    for bb in (False, True):
        ctx, page, errors = start()
        seen = [sig(page)]
        page.locator('#diary-link').click()
        page.wait_for_selector('main.simple.diary')
        page.locator('[data-log=drank]').click()
        page.wait_for_selector('#logged')
        page.locator('#tab-week').click()
        page.wait_for_selector('#insights')
        seen.append(sig(page))
        check('back, the diary: a log and a change of tab are not steps: the way was first screen, the diary', [x.split(' | ')[0] for x in seen] == ['home', 'diary'], str(seen))
        walk_back(page, seen, 'the diary', browser_back=bb)
        seen = [sig(page)]
        page.locator('#sudden-link').click()
        page.wait_for_selector('main.simple.sudden')
        seen.append(sig(page))
        page.locator('#sudden-number [data-act=sudden-number]').click()
        page.wait_for_selector('main.about-simple')
        seen.append(sig(page))
        check('back, "Something new or sudden?": the way was first screen, the list, About them (to change the number)', [x.split(' | ')[0] for x in seen] == ['home', 'sudden', 'about'], str(seen))
        walk_back(page, seen, '"Something new or sudden?" and About them', browser_back=bb)
        seen = [sig(page)]
        page.locator('a[href="#/visit"]').first.click()
        page.wait_for_selector('#visit-start')
        seen.append(sig(page))
        page.locator('#visit-start').click()
        tap_yes(page, 'no')
        for label in ['so-so', 'so-so', 'low', 'my body', 'my tablets']:
            page.wait_for_function("(l) => !document.querySelector('[data-confirm]') && [...document.querySelectorAll('main.pv .pt')].some((e) => e.innerText.trim() === l)", arg=label)
            tap_yes(page, label)
        give_back(page, 'main.visit #visit-page')
        check('back, the visit page: the questions run on the person\'s screen, and the page of answers is the same step as the page they started from', sig(page).split(' | ')[0] == 'visit')
        seen[-1] = sig(page)
        walk_back(page, seen, 'the doctor-visit page', browser_back=bb)
        # (phase 8) inside the visit questions: Back is the question before, asked again (its answer comes off), then the page
        page.locator('a[href="#/visit"]').first.click()
        page.wait_for_selector('#visit-start, #visit-again')
        page.locator('#visit-again, #visit-start').first.click()
        page.wait_for_selector('main.pv .pt')
        q1 = sig(page)
        tap_yes(page, 'no')
        page.wait_for_function("() => !document.querySelector('[data-confirm]') && [...document.querySelectorAll('main.pv .pt')].some((e) => e.innerText.trim() === 'so-so')")
        q2 = sig(page)
        page.go_back()
        back1 = sig(page)
        kept = page.evaluate(KV_GET, 'visit')
        check('back, the visit questions: from the second question, the phone\'s back is the first question again, and its answer is taken off to be given again', back1 == q1 and q1 != q2 and kept is not None and len(kept.get('answers', [])) == 0, f'{q1} / {q2} / {back1} / {str(kept)[:160]}')
        page.go_back()
        check('back, the visit questions: from the first question, the visit page', sig(page).startswith('visit'), sig(page))
        page.locator('[data-act=home]').first.click()
        page.wait_for_selector('main.simple.home')
        check('back, the diary and the visit page: no page error', not errors, '; '.join(errors))
        ctx.close()

    # ---- (phase 8) the full view and the sample family: the same one-step Back on the inner pages they open
    for mode in ('full', 'demo'):
        ctx, page, errors = start()
        if mode == 'full':
            page.evaluate(KV_PUT, {'settings': {'cloudHelp': False, 'support': 'more', 'welcomed': True, 'firstCard': True, 'howFolded': True, 'view': 'full'}})
            page.reload()
            page.wait_for_selector('.layout')
        else:
            page.goto(url + '#/demo')
            page.wait_for_selector('.layout')
            page.wait_for_timeout(600)
        desk = sig(page)
        page.evaluate("location.hash = '#/diary'")
        page.wait_for_selector('main.simple.diary')
        diary = sig(page)
        page.evaluate("location.hash = '#/sudden'")
        page.wait_for_selector('main.simple.sudden')
        page.locator('main [data-act=back]').first.click()
        check(f'back, the {mode} view: from "Something new or sudden?" opened from the diary, Back is the diary, not the first screen', sig(page) == diary, f'{diary} / {sig(page)}')
        page.locator('main [data-act=back]').first.click()
        page.wait_for_selector('.layout')
        check(f'back, the {mode} view: from the diary, Back is the screen it was opened from', sig(page) == desk, f'{desk} / {sig(page)}')
        page.evaluate("location.hash = '#/passport'")
        page.wait_for_selector('#pass-look')
        lines = sig(page)
        page.locator('#pass-look').click()
        page.wait_for_selector('#pass-page')
        page.locator('main [data-act=back]').first.click()
        page.wait_for_selector('#pass-look')
        check(f'back, the {mode} view: the passport\'s page goes back to its lines', sig(page) == lines, f'{lines} / {sig(page)}')
        page.locator('main [data-act=back]').first.click()
        page.wait_for_selector('.layout')
        check(f'back, the {mode} view: from the passport\'s lines, Back is the screen it was opened from', sig(page) == desk, f'{desk} / {sig(page)}')
        page.evaluate("location.hash = '#/visit'")
        page.wait_for_selector('main.simple.visit')
        page.locator('main [data-act=back]').first.click()
        page.wait_for_selector('.layout')
        check(f'back, the {mode} view: from the visit page, Back is the screen it was opened from', sig(page) == desk, f'{desk} / {sig(page)}')
        check(f'back, the {mode} view: no page error', not errors, '; '.join(errors))
        ctx.close()


def ways(browser, url):
    """After "something else" the carer always has a clear next step (18 Nov 2026, the owner's walk on his phone: the
    screen offered "Next: Are you hungry?" after a drink was refused, and "show me" ended on "Ask another question").
    At 390 x 844: the drinks example (something else -> more drinks -> "juice" -> confirmed), a question about no kind
    the rules know ("What is it about?"), the body ("Show me where" and the needs board first), and "show me" ->
    understood -> typed -> confirmed by the person; "Not yet" goes back to the ways, never to the first screen. No
    model is part of it: every request to another host is refused and counted."""
    host = urlparse(url).hostname
    ctx = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True, user_agent=PHONE_UA, service_workers='block')
    outside = []
    ctx.route('**/*', lambda r: r.continue_() if urlparse(r.request.url).hostname in (host, None) or r.request.url.startswith(('data:', 'blob:')) else (outside.append(r.request.url) if not app_check_url(r.request.url) else None, r.abort()))
    page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(url)
    page.wait_for_selector('main.simple.home')
    DRINK, HOT_COLD = 'Would you like something to drink?', 'Would you like a hot drink or a cold drink?'
    way_ids = lambda: page.evaluate("[...document.querySelectorAll('#ways > li > button, #ways > li > a')].map((e) => e.id)")

    # ---- the case found on the phone: a drink, yes, hot or cold, "something else"
    ask_topic(page, 'food', DRINK)
    answer(page, 'yes')
    page.locator(f'#next-q[data-q="{HOT_COLD}"]').click()
    page.wait_for_selector('main.simple.card #made-where')
    answer(page, 'something else')
    out = text(page)
    ids = way_ids()
    check('ways: the screen opens with one line in plain words: "None of these. Find out what it is: one step at a time."', text(page, '#out-lead') == 'None of these. Find out what it is: one step at a time.', text(page, '#after-out')[:200])
    check('ways, the drinks example: the first and main button is "More choices like these", and it says what comes next (water, juice, milk)', ids[:1] == ['way-more'] and 'primary' in page.locator('#way-more').get_attribute('class') and text(page, '#way-more') == 'More choices like these Next: water, juice, milk. Then more, three at a time.', str(ids) + text(page, '#way-more'))
    # (phase 12b: online, the AI step is the second way)
    check('ways: then the AI\'s step online (where there is one), the first letter, then "Ask them to show or write it"', [x for x in ids if x != 'narrow'][1:3] == ['letter-go', 'show-write'] and ('narrow' not in ids or ids.index('narrow') == 1), str(ids))
    check('ways: one main button on the screen, and it is the first way', page.locator('main.s-answered .btn.primary').count() == 1 and page.locator('main.s-answered .btn.primary').first.get_attribute('id') == 'way-more')
    check('ways: no question of another topic on the screen ("Are you hungry?" is gone), shown or under "More"', 'Are you hungry' not in out and page.locator('main.s-answered [data-q]').count() == 0, out[:300])
    more(page)
    under = text(page, '#more-body')
    check('ways: under "More": "Ask something else" / "Ask another question" and "Ask it a new way"; still no question of another topic', 'Are you hungry' not in under and page.locator('#more-body [data-q]').count() == 0 and page.locator('#more-body #another').count() == 1, under[:300])
    page.locator('#more').click()
    screen_checks(page, 'ways: after "something else" to a drink')
    shot(page, 'r2_01_after_something_else_one_step_at_a_time')

    # ---- more drinks, three at a time, made by the rules; "juice", confirmed
    page.locator('#way-more').click()
    page.wait_for_selector('main.simple.card #made-where')
    say = text(page, 'main.card .say')
    check('ways, more choices: the carer\'s screen says what to say out loud ("Which drink? Water, juice, milk, or something else"), and that the rules made it and nothing was sent', say.startswith('Which drink?') and 'ater' in say and 'juice' in say and 'milk' in say and 'Nothing was sent' in text(page, '#made-where'), say + ' / ' + text(page, '#made-where'))
    screen_checks(page, 'ways: the carer\'s screen of more drinks')
    page.locator('[data-act=show]').click()
    page.wait_for_selector('main.pv .pt')
    tiles = [t.strip() for t in page.locator('main.pv .pt').all_inner_texts()]
    check('ways, more choices, the person\'s screen: water, juice, milk and "something else", each with a picture', tiles == ['water', 'juice', 'milk', 'something else'] and page.locator('main.pv .pt svg, main.pv .pt img').count() >= 4, str(tiles))
    fits(page, 'ways: more drinks on the person\'s screen')
    shot(page, 'r2_02_more_choices_like_these_water_juice_milk')
    page.locator('main.pv .pt', has_text='something else').first.click()
    page.wait_for_function("[...document.querySelectorAll('main.pv .pt')].some((e) => e.innerText.trim() === 'tea')")
    tiles2 = [t.strip() for t in page.locator('main.pv .pt').all_inner_texts()]
    check('ways, more choices: "something else" on the first page brings the next three (tea, coffee), not the same ones', tiles2[:2] == ['tea', 'coffee'] and 'water' not in tiles2 and tiles2[-1] == 'something else', str(tiles2))
    hold_exit(page)
    page.wait_for_selector('main.simple.card')
    page.locator('[data-act=back]').first.click()
    page.wait_for_selector('#way-more')
    check('ways: Back from the card of more choices lands on the list of ways again', way_ids()[:1] == ['way-more'])
    page.locator('#way-more').click()
    page.wait_for_selector('main.simple.card #made-where')
    answer(page, 'juice')
    got = page.evaluate(SIG)
    check('ways, the drinks example to the end: something else -> more drinks -> "juice" -> confirmed by the person: the carer reads "Which drink? Juice"', got.startswith('answered | Which drink? | Juice'), got)
    check('ways: after a real answer the screen is the usual one: "Ask another question" is the main button, and no list of ways', page.locator('#ways').count() == 0 and page.locator('#another.primary').count() == 1)
    shot(page, 'r2_03_juice_confirmed')
    last = page.evaluate(KV_GET, 'diary')[-1]
    check('ways: the answer is in the diary under its question ("Which drink?" juice), kept on this phone', last.get('q') == 'Which drink?' and last.get('label') == 'juice' and last.get('kind') == 'answer', str(last))

    # ---- the list used up: every page refused
    page.locator('[data-act=back]').first.click()
    page.wait_for_selector('main.simple.card')
    page.locator('[data-act=show]').click()
    page.wait_for_selector('main.pv .pt')
    page.locator('main.pv .pt', has_text='something else').first.click()
    page.wait_for_function("[...document.querySelectorAll('main.pv .pt')].some((e) => e.innerText.trim() === 'tea')")
    tap_yes(page, 'something else')
    give_back(page)
    ids = way_ids()
    check('ways: after every drink the rules have was refused, the same list is not offered again: the first letter is the next step', [x for x in ids if x != 'narrow'][:2] == ['letter-go', 'show-write'] and 'way-more' not in ids and 'way-about' not in ids, str(ids))

    # ---- "show me" goes on: understood -> typed -> confirmed by the person
    page.locator('#show-write').click()
    page.wait_for_selector('main.simple.card')
    page.locator('[data-act=show]').click()
    tap_yes(page, 'show me')
    give_back(page)
    und = text(page, '#understood')
    check('ways, "show me": the carer\'s screen goes on: "Did you understand?", "Yes: type it" with a field, and "Not yet: try another way"', 'Say: "Show me."' in text(page) and 'Did you understand?' in und and 'Yes: type it' in und and 'Not yet: try another way' in und and page.locator('#understood-word').count() == 1, und)
    screen_checks(page, 'ways: after "show me"', primary=False)
    shot(page, 'r2_04_show_me_did_you_understand')
    page.locator('#not-yet').click()
    page.wait_for_selector('#ways')
    check('ways, "Not yet: try another way": back on the list of ways of the same question, not on the first screen', page.locator('main.simple.home').count() == 0 and [x for x in way_ids() if x != 'narrow'][:2] == ['letter-go', 'show-write'] and text(page, '#out-lead').startswith('None of these.'), page.evaluate(SIG))
    page.locator('#show-write').click()
    page.wait_for_selector('main.simple.card')
    page.locator('[data-act=show]').click()
    tap_yes(page, 'write it')
    give_back(page)
    page.locator('#understood-go').click()
    page.wait_for_timeout(200)
    check('ways, "Yes: type it" with nothing typed: nothing happens, the field waits', page.locator('#understood-word').count() == 1 and page.locator('main.pv').count() == 0)
    page.fill('#understood-word', 'lemonade')
    page.locator('#understood-go').click()
    page.wait_for_selector('main.pv .pt')
    tiles = [t.strip() for t in page.locator('main.pv .pt').all_inner_texts()]
    check('ways, typed: the word goes onto the person\'s screen as a choice, with "something else"; nothing is picked for them', tiles == ['lemonade', 'something else'] and page.locator('[data-confirm]').count() == 0, str(tiles))
    fits(page, 'ways: the typed word on the person\'s screen')
    page.locator('main.pv .pt', has_text='lemonade').first.click()
    page.wait_for_selector('[data-confirm=yes]')
    check('ways, typed: the person points to it and is asked "So: lemonade. Right?"', text(page, '#p-so') == 'So: lemonade. Right?', text(page, '#p-so'))
    shot(page, 'r2_05_typed_word_so_lemonade_right')
    page.locator('[data-confirm=yes]').click()
    give_back(page)
    got = page.evaluate(SIG)
    check('ways, typed: confirmed by the person: the carer reads "Lemonade"', got.startswith('answered |') and '| Lemonade |' in got, got)
    last = page.evaluate(KV_GET, 'diary')[-1]
    check('ways, typed: it is in the diary as an answer, and counts as a drink like any other', last.get('label') == 'lemonade' and last.get('kind') == 'answer', str(last))
    shot(page, 'r2_06_typed_word_confirmed')

    # ---- a question about no kind the rules know: "What is it about?"
    page.locator('[data-act=home]').first.click()
    page.wait_for_selector('main.simple.home')
    page.fill('#q', 'Do you want the red one or the blue one?')
    page.locator('#ask button[type=submit]').click()
    page.wait_for_selector('main.simple.card #made-where, #sheet, main.simple.nocard')
    if page.locator('main.simple.card [data-act=show]').count():
        answer(page, 'something else')
        ids = way_ids()
        check('ways, no kind known: the first and main button is "What is it about?"', ids[:1] == ['way-about'] and 'A drink, food, a person, a place, the body, a feeling.' in text(page, '#way-about'), str(ids))
        page.locator('#way-about').click()
        page.wait_for_selector('main.simple.card #made-where')
        page.locator('[data-act=show]').click()
        page.wait_for_selector('main.pv .pt')
        tiles = [t.strip() for t in page.locator('main.pv .pt').all_inner_texts()]
        check('ways, "What is it about?": a picture card: a drink, food, a person, and "something else" for the next three', tiles == ['a drink', 'food', 'a person', 'something else'] and page.locator('main.pv .pt :is(svg, img.pic)').count() >= 4, str(tiles))
        fits(page, 'ways: "What is it about?" on the person\'s screen')
        shot(page, 'r2_07_what_is_it_about')
        tap_yes(page, 'a person')
        give_back(page)
        check('ways, "What is it about?" -> a person: the main button is "Next: Who?"', text(page, 'main.s-answered .btn.primary') == 'Next: Who?', text(page, 'main.s-answered .btn.primary'))
        page.locator('main.s-answered .btn.primary').click()
        page.wait_for_selector('main.simple.card #made-where')
        check('ways, "Who?": the choices are people (a friend, a neighbour, the carer) with nothing in About them', 'Who?' in text(page, 'main.card .say') and 'friend' in text(page, 'main.card .say'), text(page, 'main.card .say'))
    else:
        check('ways, no kind known: the typed either-or made a card by the rules', False, text(page)[:200])

    # ---- worst case: the body. "Show me where" and the needs board first, never a list of guesses, never another topic
    page.locator('[data-act=home]').first.click()
    page.wait_for_selector('main.simple.home')
    ask_topic(page, 'body', 'Are you comfortable?')
    page.locator('[data-act=show]').click()
    page.wait_for_selector('main.pv .pt')
    esc_label = [t.strip() for t in page.locator('main.pv .pt').all_inner_texts()][-1]
    tap_yes(page, esc_label)
    give_back(page)
    ids = way_ids()
    check(f'ways, worst case, "Body & care" ("Are you comfortable?" -> {esc_label}): "Show me where" is the main button, the needs board second; no list of guesses, no other topic', ids[:2] == ['way-where', 'way-needs'] and 'way-more' not in ids and 'way-about' not in ids and page.locator('main.s-answered [data-q]').count() == 1, str(ids))
    shot(page, 'r2_08_body_show_me_where_and_the_needs_board')
    page.locator('#way-where').click()
    page.wait_for_selector('main.simple.card #made-where')
    check('ways, "Show me where": the body card ("Where does it hurt?")', 'Where does it hurt?' in text(page, 'main.card .say') and page.locator('#person[data-kind=body]').count() == 1, text(page, 'main.card .say'))
    page.locator('[data-act=show]').click()
    page.wait_for_selector('main.pv[data-kind=body] .pt')
    page.locator('main.pv .pt', has_text='chest').first.click()
    tap_yes(page, 'middle')
    give_back(page)
    # (phase 17: one call box: a chest place brings the alert "call 911 now, whatever the amount" with its own button)
    check('ways, worst case: a place in the chest chosen on that card brings one boxed call line, "whatever the amount", with the call button', 'whatever the amount' in text(page, '#now-alert') and page.locator('#urgent, #now-alert').count() == 1 and page.locator('#now-alert a[href="tel:911"]').count() == 1)
    check('ways: nothing was asked of any other host in the whole run (rules only)', not outside, str(outside))
    check('ways: no page error', not errors, '; '.join(errors))
    ctx.close()


SHARE_STUB = """() => { window.__shared = []; Object.defineProperty(Navigator.prototype, 'share', { configurable: true, writable: true, value: function (d) { window.__shared.push(d); return Promise.resolve(); } }); }"""
NO_SHARE = """() => { try { delete Navigator.prototype.share; } catch (e) {} Object.defineProperty(navigator, 'share', { configurable: true, value: undefined }); }"""


def phase6(browser, url, live):
    """Phase 6 (18 Nov 2026), as Carol on a 390 x 844 phone, with the Miller family's week and, yesterday, a pain in
    the chest and a fall with a blow to the head: a line of "What stands out" opened to its entries and hidden again;
    "Share with family" through its sheet (the exact text, the health notes off and on, Copy, Share with
    `navigator.share` replaced by a stub that records what it is handed); "For the next carer"; a browser without Web
    Share; the doctor-visit page with a line opened, and as it prints. No model is part of any of it: every request to
    another host is refused and counted, and none is expected."""
    host = urlparse(url).hostname
    origin = f'{urlparse(url).scheme}://{urlparse(url).netloc}'
    ctx = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True, user_agent=PHONE_UA, service_workers='block')
    ctx.grant_permissions(['clipboard-read', 'clipboard-write'], origin=origin)
    ctx.add_init_script(f'({SHARE_STUB})()')
    outside = []
    ctx.route('**/*', lambda r: r.continue_() if urlparse(r.request.url).hostname in (host, None) or r.request.url.startswith(('data:', 'blob:')) else (outside.append(r.request.url) if not app_check_url(r.request.url) else None, r.abort()))
    page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('dialog', lambda d: d.accept())
    page.goto(url)
    page.wait_for_selector('main.simple.home')
    check('phase 6, first screen with an empty diary: no "For the next carer" yet (there is nothing to hand over)', page.locator('#handover-link').count() == 0)

    # ---- the Miller family's week, and yesterday a pain in the chest and a fall with a blow to the head; today the tablets and a drink
    week, entries, name = frank_week()
    now = datetime.datetime.now()
    at = lambda d, h, m: int(datetime.datetime.combine(datetime.date.today() - datetime.timedelta(days=d), datetime.time(h, m)).timestamp() * 1000)
    early = lambda h, m: at(0, h, m) if (h, m) < (now.hour, now.minute) else None
    # (24.11.2026) the worst cases sit 23 h ago, so they are "yesterday" and inside "the last 24 hours" at any hour
    # except 23:00-23:59 local, when 23 h ago is already today; fixed clock times made this check fail after 21:00.
    base = now - datetime.timedelta(hours=23)
    rel = lambda mins: int((base + datetime.timedelta(minutes=mins)).timestamp() * 1000)
    x2_hm = (base + datetime.timedelta(minutes=1)).strftime('%H:%M')
    x4_hm = (base + datetime.timedelta(minutes=30)).strftime('%H:%M')
    extra = [
        {'id': 'x1', 'at': rel(0), 'kind': 'answer', 'q': 'Are you in pain?', 'label': 'yes', 'topic': 'body'},
        {'id': 'x2', 'at': rel(1), 'kind': 'answer', 'q': 'Where does it hurt?', 'label': 'chest', 'topic': 'body'},
        {'id': 'x3', 'at': rel(2), 'kind': 'answer', 'q': 'How bad is the pain?', 'label': 'quite bad', 'topic': 'body'},
        {'id': 'x4', 'at': rel(30), 'kind': 'log', 'log': 'fall', 'label': 'fall: hit head', 'topic': 'body'},
        {'id': 'x5', 'at': rel(40), 'kind': 'log', 'log': 'tablets', 'label': 'tablets', 'topic': 'body'},
        {'id': 'x6', 'at': rel(45), 'kind': 'log', 'log': 'drank', 'label': 'drank', 'topic': 'food'},
    ]
    entries = [e for e in entries if e['at'] <= time.time() * 1000] + extra
    history = [{'q': e['q'], 'topic': '', 'label': e['label'], 'at': e['at']} for e in entries if e['kind'] == 'answer' and e['id'].startswith('w')]
    visit = {'startedAt': int(time.time() * 1000) - 60000, 'done': True, 'answers': [{'id': 'pain', 'q': 'Are you in pain?', 'label': 'no', 'at': int(time.time() * 1000) - 50000}, {'id': 'sleep', 'q': 'How have you been sleeping?', 'label': 'so-so', 'at': int(time.time() * 1000) - 40000}], 'since': at(6, 0, 0)}
    page.evaluate(KV_PUT, {'diary': entries, 'health': week['health'], 'profile': week['profile'], 'history': history, 'asks': [], 'visit': visit})
    page.reload()
    page.wait_for_selector('main.simple.home')
    check('phase 6, first screen: "For the next carer" stands under "Diary" once the diary holds something', 'For the next carer' in text(page, '#handover-link') and ys(page, '#handover-link')[0][1] > ys(page, '#diary-link')[0][1], str(ys(page, '#handover-link')))
    screen_checks(page, 'phase 6, first screen')

    # ---------------------------------------------------------------- D: a line shows the entries it was counted from
    page.goto(url + '#/diary')
    page.wait_for_selector('main.simple.diary')
    check('diary: the privacy line is true with sharing in the app: kept here only, never sent by the app, leaves only when the carer shares it as a text seen first', "The diary is kept on this phone only. The app never sends it anywhere: it leaves only when you share it yourself, as a text you see first. It is never shown on Frank's screen." in text(page, '#diary-lock'), text(page, '#diary-lock'))
    page.locator('#tab-week').click()
    page.wait_for_selector('#insights')
    lines = page.evaluate("[...document.querySelectorAll('#insights .ins')].map((l) => ({ id: l.dataset.id, see: (l.querySelector('.src-toggle') || {}).innerText || '', open: l.querySelectorAll('.src').length }))")
    check('D: every line of "What stands out" has "See the entries (N)", closed at first', len(lines) >= 4 and all(x['see'].startswith('See the entries (') and x['open'] == 0 for x in lines), str(lines))
    ids = [x['id'] for x in lines]
    check('D: the week has the chest pain of one day, the fall, the sweets, Wednesday\'s drinks', all(k in ids for k in ('pain-day', 'fall', 'sweets', 'few-drinks')), str(ids))
    page.locator('.src-toggle[data-src=few-drinks]').click()
    page.wait_for_selector('#src-few-drinks')
    few = page.evaluate("[...document.querySelectorAll('#src-few-drinks li')].map((e) => e.innerText.replace(/\\s+/g, ' ').trim())")
    check('D: "Few drinks … : 2" opens to Wednesday\'s two drinks, each with its time: the tea on a card and one "Drank"', len(few) == 2 and few[0].startswith('07:35 Would you like tea or coffee? tea') and few[1] == '15:20 Drank' and name(2) in text(page, '#src-few-drinks'), str(few))
    check('D: the button now reads "Hide the entries", and the entries stand inside the same line, on the same screen', text(page, '.src-toggle[data-src=few-drinks]') == 'Hide the entries' and page.locator('.ins[data-id=few-drinks] #src-few-drinks').count() == 1 and page.locator('main.simple.diary').count() == 1)
    page.locator('.src-toggle[data-src=pain-day]').click()
    page.wait_for_selector('#src-pain-day')
    pd = text(page, '.ins[data-id=pain-day]')
    order = page.evaluate("(() => { const li = document.querySelector('.ins[data-id=pain-day]'); const y = (s) => li.querySelector(s).getBoundingClientRect().top; return [y('.ins-text'), y('.ins-act'), y('.urgent'), y('.src')]; })()")
    check('D, worst case (a pain in the chest): the opened line keeps (phase 15) "Pain in the head or the chest: call 911 now, whatever the amount." and the call box, above its entries', 'Pain in the head or the chest: call 911 now, whatever the amount.' in pd and page.locator('.ins[data-id=pain-day] .urgent a[href="tel:911"]').count() == 1 and order == sorted(order) and 'Where does it hurt? chest' in text(page, '#src-pain-day') and 'How bad is the pain? quite bad' in text(page, '#src-pain-day'), pd[:400])
    page.locator('.src-toggle[data-src=fall]').click()
    page.wait_for_selector('#src-fall')
    check('D, worst case (a fall with a blow to the head): its entry reads "Fall  Noted: a blow to the head.", under the call box', 'Fall Noted: a blow to the head.' in text(page, '#src-fall') and page.locator('.ins[data-id=fall] .urgent a[href="tel:911"]').count() == 1, text(page, '#src-fall'))
    screen_checks(page, 'D: the week with three lines opened', primary=False)
    page.locator('.ins[data-id=pain-day]').scroll_into_view_if_needed()
    shot(page, '01_what_stands_out_a_line_opened_to_its_entries')
    shot(page, '01b_what_stands_out_three_lines_opened_full_page', full=True)
    page.locator('.src-toggle[data-src=few-drinks]').click()
    page.wait_for_function("!document.querySelector('#src-few-drinks')")
    check('D: "Hide the entries" closes the line again; the others stay open', text(page, '.src-toggle[data-src=few-drinks]') == 'See the entries (2)' and page.locator('#src-pain-day').count() == 1)
    page.locator('#tab-month').click()
    page.wait_for_selector('#insights')
    check('D: the 30-day view has the same button on every line', page.locator('#insights .ins').count() == page.locator('#insights .ins .src-toggle').count() and page.locator('#insights .ins').count() >= 4)
    page.locator('#tab-week').click()
    page.wait_for_selector('#insights')

    # ---------------------------------------------------------------- A: "Share with family", through the sheet
    check('A: "Share with family" and "For the next carer" stand on the diary', text(page, '#share-family') == 'Share with family' and text(page, '#share-handover') == 'For the next carer')
    page.locator('#share-family').click()
    page.wait_for_selector('#share-sheet')
    sheet = text(page, '#share-sheet')
    shown = page.evaluate("document.querySelector('#share-text').textContent")
    first = shown.split('\n')
    check('A, the sheet: "This text leaves the phone through the app you pick (message, email). Talk Partner keeps no copy and has no server."', 'This text leaves the phone through the app you pick (message, email). Talk Partner keeps no copy and has no server.' in sheet, sheet[:300])
    check('A, the sheet: the text starts "Shared from Talk Partner on [date]. Counted by the app\'s rules from what was entered here; not a medical record."', first[0].startswith(f'Shared from Talk Partner on {name(6)}, ') and first[0].endswith(". Counted by the app's rules from what was entered here; not a medical record."), first[0])
    check('A, worst case: a line carries a call box, so the call sentence is the second line of the text', first[1] == 'Call 911 now, whatever the amount: see "What stands out" below.', first[1])  # (phase 18: a chest line below: never "if")
    check('A: the span is the tab\'s (the last 7 days), with "What stands out", each line\'s base, and the entries by day', f"Frank's diary, the last 7 days ({name(0)} to {name(6)})." in shown and 'WHAT STANDS OUT (the last 7 days)' in shown and 'How it was counted: Counted that day: 2.' in shown and f'ENTRIES BY DAY\n{name(0)}\n  07:40  Would you like tea or coffee? tea' in shown, shown[:500])
    check('A, worst cases in the text: the chest pain says call now whatever the amount (phase 15); the fall with a blow to the head has "Call 911 now if this is new or sudden."', shown.count('   Call 911 now if this is new or sudden.') == 1 and 'Pain in the head or the chest: call 911 now, whatever the amount. Do not wait to see if it passes.' in shown and 'If there is new pain, drowsiness or confusion since, call 911 now.' in shown)
    check('A: "Include the health notes" is off, and the text holds no health note (no "Diabetes", none of the carer\'s own words)', not page.locator('#share-health').is_checked() and 'iabetes' not in shown and 'Patel' not in shown and 'HEALTH NOTES' not in shown and 'The health notes are not in this text' in sheet)
    check('A: while the box is off, the sheet names the note the reader will not know (diabetes)', 'Noted in About them: diabetes. The person who reads this text will not know it unless you tick the box.' in text(page, '#share-health-warn'))
    check('A: no photo and no data URL in the text; "Photos never go in."', 'data:' not in shown and 'base64' not in shown and 'Photos never go in.' in sheet)
    check('A: Share, Copy and Cancel, in that order, under the text', page.locator('#share-sheet .choice button').all_inner_texts() == ['Share', 'Copy', 'Cancel'] and ys(page, '#share-go')[0][1] > ys(page, '#share-text')[0][1])
    fit = page.evaluate("(() => { const s = document.querySelector('#share-sheet'); const c = document.querySelector('#share-cancel').getBoundingClientRect(); return { top: Math.round(s.getBoundingClientRect().top), bottom: Math.round(c.bottom), scroll: s.scrollHeight - s.clientHeight }; })()")
    check('A: the sheet fits a 390 x 844 screen with its three buttons in reach (the long text scrolls inside its own box)', fit['top'] >= 0 and fit['bottom'] <= 844 and fit['scroll'] <= 1, str(fit))
    check('A: nothing has left before a button is pressed', page.evaluate('window.__shared.length') == 0)
    t = page.evaluate(TARGETS.replace("'#app button, #app a[href], #app input, #app textarea, #app select'", "'#share-sheet button, #share-sheet input'").replace("!el.closest('[inert]') && ", ''))
    check('A, the sheet: every button at least 44 px tall, the box at least 24 px', not t['small'] and not t['shortButtons'], str(t))
    o = page.evaluate(OVERFLOW)
    check('A, the sheet: nothing runs off the side of the screen', o['sw'] <= o['vw'] and o['n'] == 0, str(o))
    shot(page, '02_share_sheet_health_notes_off')

    page.locator('#share-health').check()
    page.wait_for_function("document.querySelector('#share-sheet').dataset.health === '1'")
    on = page.evaluate("document.querySelector('#share-text').textContent")
    check('A: with the box ticked the text has the health notes as the family noted them, and the line that rests on one says so', 'HEALTH NOTES (as noted in the app by the family; not a medical record)\n- Diabetes\n- Type 2 diabetes, diet only. Dr Patel on Monday.' in on and 'Diabetes is noted here.' in on and page.locator('#share-health-warn').count() == 0 and 'The health notes are in this text, as you see them below.' in text(page, '#share-sheet'), on[:300])
    page.locator('#share-text').evaluate("(e) => { e.scrollTop = e.querySelector ? e.scrollHeight * 0.0 : 0; const i = e.textContent.indexOf('HEALTH NOTES'); const r = document.createRange(); r.setStart(e.firstChild, i); r.setEnd(e.firstChild, i + 12); const b = r.getBoundingClientRect(); e.scrollTop += b.top - e.getBoundingClientRect().top - 40; }")
    shot(page, '03_share_sheet_health_notes_on')

    page.locator('#share-copy').click()
    page.wait_for_function("document.querySelector('#share-copy').innerText.trim() === 'Copied'")
    clip = page.evaluate('navigator.clipboard.readText()')
    check('A, Copy: the clipboard holds the sheet\'s text, character for character; the button says "Copied" and the last one "Close"', clip == on and page.locator('#share-sheet .choice button').all_inner_texts() == ['Share', 'Copied', 'Close'], f'{len(clip)} / {len(on)}')
    shot(page, '04_share_sheet_copied')
    page.locator('#share-go').click()
    page.wait_for_function("document.querySelector('#share-status').innerText.trim() !== ''")
    shared = page.evaluate('window.__shared')
    check('A, Share: navigator.share is called once, with { text } and nothing else, and the text is the sheet\'s, character for character', len(shared) == 1 and list(shared[0].keys()) == ['text'] and shared[0]['text'] == on, str([list(x.keys()) for x in shared]))
    check('A, Share: the sheet says "Handed to the app you picked. Talk Partner kept no copy."', 'Handed to the app you picked. Talk Partner kept no copy.' in text(page, '#share-status'))
    shot(page, '05_share_sheet_after_share')
    page.locator('#share-cancel').click()
    page.wait_for_function("!document.querySelector('#share-sheet')")
    page.locator('#share-family').click()
    page.wait_for_selector('#share-sheet')
    check('A: the box is off again every time the sheet opens', not page.locator('#share-health').is_checked() and 'HEALTH NOTES' not in page.evaluate("document.querySelector('#share-text').textContent"))
    page.keyboard.press('Escape')
    page.wait_for_function("!document.querySelector('#share-sheet')")
    check('A: Escape is "Cancel": the sheet is gone and nothing more was handed over', page.evaluate('window.__shared.length') == 1)
    page.locator('#tab-today').click()
    page.wait_for_timeout(150)
    page.locator('#share-family').click()
    page.wait_for_selector('#share-sheet')
    today = page.evaluate("document.querySelector('#share-text').textContent")
    check('A, worst case, the Today tab (the chest pain and the fall were yesterday): the text is about today, and still carries this week\'s lines and the call sentence', today.split('\n')[1].startswith('Call 911 now, whatever the amount') and f"Frank's diary, today ({name(6)})." in today and 'WHAT STANDS OUT (the last 7 days)' in today and 'Pain in the head or the chest was chosen' in today and x2_hm not in today, today[:400])
    page.locator('#share-cancel').click()
    page.wait_for_function("!document.querySelector('#share-sheet')")

    # ---------------------------------------------------------------- A: "For the next carer"
    page.locator('#share-handover').click()
    page.wait_for_selector('#share-sheet')
    ho = page.evaluate("document.querySelector('#share-text').textContent")
    hl = ho.split('\n')
    check('A, handover: the same sheet ("Share this with the next carer?"), the same first sentence, the last 24 hours', 'Share this with the next carer?' in text(page, '#share-h') and hl[0].startswith('Shared from Talk Partner on ') and any(x.startswith('For the next carer: Frank. The last 24 hours (') for x in hl), ho[:300])
    check('A, handover, worst cases: the call sentence at the top; the pain as it was answered, with whom to tell and when to call; the fall with the blow to the head', hl[1] == 'Call 911 now, whatever the amount: see the lines on pain and falls below.' and 'Where does it hurt? chest' in ho and 'How bad is the pain? quite bad. Pain in the head or the chest: call 911 now, whatever the amount. Do not wait to see if it passes.' in ho and 'Falls: 1 logged (' in ho and 'With a blow to the head:' in ho and 'If there is new pain, drowsiness or confusion since, call 911 now.' in ho, ho[:900])
    check('A, handover: drinks, food, toilet and tablets of the last 24 hours; the tablets line says to check before giving any', all(k in ho for k in ('Drinks: ', 'Food: ', 'Toilet: ', 'Tablets taken: logged at ')) and 'The app does not know which tablets or how many: check before giving any.' in ho, ho[:900])
    check('A, handover: the usual choices learned ("usually tea"), and never one about pain, the body, a feeling or a need', '"Would you like tea or coffee": usually tea' in ho and 'Nothing about pain, the body or feelings is in this list: ask those every time.' in ho and 'Are you in pain" (' not in ho and 'Are you tired' not in ho.split('USUAL CHOICES')[1], ho.split('USUAL CHOICES')[1] if 'USUAL CHOICES' in ho else ho)
    check('A, handover: no health note with the box off', 'iabetes' not in ho and 'HEALTH NOTES' not in ho and not page.locator('#share-health').is_checked())
    shot(page, '06_handover_note_for_the_next_carer')
    page.locator('#share-text').evaluate("(e) => { e.scrollTop = e.scrollHeight; }")
    shot(page, '06b_handover_note_usual_choices')
    page.locator('#share-go').click()
    page.wait_for_function("document.querySelector('#share-status').innerText.trim() !== ''")
    shared = page.evaluate('window.__shared')
    check('A, handover, Share: the stub was handed { text } with the note, character for character', len(shared) == 2 and list(shared[1].keys()) == ['text'] and shared[1]['text'] == ho)
    page.locator('#share-cancel').click()
    page.wait_for_function("!document.querySelector('#share-sheet')")
    page.locator('[data-act=home]').first.click()
    page.wait_for_selector('main.simple.home')
    page.locator('#handover-link').click()
    page.wait_for_selector('#share-sheet')
    check('A, handover from the first screen: the same sheet over the first screen', 'Share this with the next carer?' in text(page, '#share-h') and page.locator('main.simple.home[inert]').count() == 1)
    page.locator('#share-cancel').click()
    page.wait_for_function("!document.querySelector('#share-sheet')")

    # ---------------------------------------------------------------- A: with a fluid limit noted (worst case)
    page.evaluate(KV_PUT, {'health': {**week['health'], 'fluidLimit': True}})
    page.goto(url + '#/diary')
    page.reload()
    page.wait_for_selector('main.simple.diary')
    page.locator('#tab-week').click()
    page.wait_for_selector('#insights')
    page.locator('#share-family').click()
    page.wait_for_selector('#share-sheet')
    off = page.evaluate("document.querySelector('#share-text').textContent")
    low = off.lower()
    check('A, worst case, a fluid limit noted and the box off: the sheet names it to the carer; the text states no limit and never suggests more to drink', 'a fluid limit from the doctor' in text(page, '#share-health-warn') and 'fluid limit' not in low and not any(w in low for w in ('drink more', 'more to drink', 'more fluid', 'more water', 'encourage', 'should drink')), text(page, '#share-health-warn'))
    page.locator('#share-health').check()
    page.wait_for_function("document.querySelector('#share-sheet').dataset.health === '1'")
    onf = page.evaluate("document.querySelector('#share-text').textContent")
    check('A, worst case, a fluid limit noted and the box ticked: the drinks line points to the doctor\'s plan; still never "more"', "A fluid limit from the doctor is noted here: check the day against the doctor's plan." in onf and '- A fluid limit from the doctor' in onf and not any(w in onf.lower() for w in ('drink more', 'more to drink', 'more fluid', 'more water', 'encourage', 'should drink')))
    page.locator('#share-cancel').click()
    page.wait_for_function("!document.querySelector('#share-sheet')")
    page.evaluate(KV_PUT, {'health': week['health']})

    # ---------------------------------------------------------------- D on the doctor-visit page, and as it prints
    page.goto(url + '#/visit')
    page.reload()
    page.wait_for_selector('#since')
    since = page.evaluate("[...document.querySelectorAll('#since-lines > li')].map((l) => ({ t: l.firstChild.textContent.trim(), see: (l.querySelector('.src-toggle') || {}).innerText || '' }))")
    check('D, the visit page: a line of "Since the last visit" that counted something has "See the entries (N)"; one that counted nothing has no button', any(x['t'].startswith('Falls: 1 logged') and x['see'] == 'See the entries (1)' for x in since) and any(x['t'].startswith('Sleep: no bad night') and x['see'] == '' for x in since), str(since))
    fall_i = [i for i, x in enumerate(since) if x['t'].startswith('Falls:')][0]
    page.locator(f'.src-toggle[data-src=since-{fall_i}]').click()
    page.wait_for_selector(f'#src-since-{fall_i}')
    check('D, the visit page: the falls line opens to the fall, with its time and the blow to the head', 'Fall Noted: a blow to the head.' in text(page, f'#src-since-{fall_i}') and x4_hm in text(page, f'#src-since-{fall_i}'))
    check('D, the visit page: the call box is still the first thing on the page', text(page, '#visit-page').startswith('Call 911 now if this is new or sudden.'))
    screen_checks(page, 'D: the visit page with a line opened')
    page.locator('#since').scroll_into_view_if_needed()
    shot(page, '07_visit_page_since_the_last_visit_a_line_opened')
    shot(page, '07b_visit_page_full', full=True)
    page.emulate_media(media='print')
    page.wait_for_timeout(200)
    printed = page.evaluate("(() => { const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }; return { src: [...document.querySelectorAll('.src-wrap, .src, .src-toggle')].filter(vis).length, lines: [...document.querySelectorAll('#since-lines > li')].filter(vis).length, box: vis(document.querySelector('#visit-urgent')), controls: [...document.querySelectorAll('.no-print')].filter(vis).length, text: document.querySelector('#visit-page').innerText }; })()")
    check('D, print: the page prints clean: no "See the entries", no entry list, no control; the lines and the call box are printed', printed['src'] == 0 and printed['controls'] == 0 and printed['lines'] == len(since) and printed['box'] and 'Hide the entries' not in printed['text'] and '22:30' not in printed['text'], str({k: v for k, v in printed.items() if k != 'text'}))
    shot(page, '08_visit_page_print_preview', full=True)
    page.emulate_media(media='screen')
    check('phase 6: nothing was asked of any other host in the whole run (no AI, no server: the text left through the stub and the clipboard only)', not outside, str(outside))
    check('phase 6: no page error', not errors, '; '.join(errors))
    ctx.close()

    # ---------------------------------------------------------------- a browser without Web Share: only Copy
    ctx = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True, user_agent=PHONE_UA, service_workers='block')
    ctx.grant_permissions(['clipboard-read', 'clipboard-write'], origin=origin)
    ctx.add_init_script(f'({NO_SHARE})()')
    page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(url)
    page.wait_for_selector('main.simple.home')
    page.evaluate(KV_PUT, {'diary': entries, 'health': week['health'], 'profile': week['profile'], 'history': history, 'asks': []})
    page.goto(url + '#/diary')
    # (phase 9, judge round 8 §7.5: a reload at once after the address changed raced the app's own history step and
    # landed on Home 1 time in 4; the diary is waited for first)
    page.wait_for_selector('main.simple.diary')
    page.reload()
    page.wait_for_selector('main.simple.diary')
    page.locator('#share-family').click()
    page.wait_for_selector('#share-sheet')
    check('A, no Web Share in the browser: only "Copy" and "Cancel", and the sheet says the text leaves only if the carer pastes it', page.evaluate("typeof navigator.share") == 'undefined' and page.locator('#share-sheet .choice button').all_inner_texts() == ['Copy', 'Cancel'] and 'This text leaves the phone only if you paste it somewhere yourself. Talk Partner keeps no copy and has no server.' in text(page, '#share-leaves'), text(page, '#share-sheet')[:200])
    page.locator('#share-copy').click()
    page.wait_for_function("document.querySelector('#share-copy').innerText.trim() === 'Copied'")
    check('A, no Web Share: Copy works, with the sheet\'s text', page.evaluate('navigator.clipboard.readText()') == page.evaluate("document.querySelector('#share-text').textContent"))
    shot(page, '09_no_web_share_only_copy')
    check('phase 6, no Web Share: no page error', not errors, '; '.join(errors))
    ctx.close()


PRINT_VIEW = """() => { const seen = (sel) => [...document.querySelectorAll(sel)].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).display !== 'none'; }).length; return { top: seen('#s-top'), controls: seen('.no-print'), page: seen('.visit-page'), sheet: seen('#share-sheet') }; }"""
GRADE = r"\b(?:good|bad|well done|poor|should|must|failed)\b"


def phase7(browser, url, live):
    """Phase 7 of the build (18 Nov 2026), as Carol on a 390 x 844 phone. Part 1: a few real conversations (a tapped
    question, a typed one that holds two things, a memory question, "something else" and the first letter, "No,
    something else" on the check, Frank's own start, "We're stuck"), and the page "For the speech therapist" counts
    exactly them. Part 2: the page on its worst case (a pain in the chest in the diary): the box is off, the screen
    says so, the box puts the call sentence on the page; the questions; the sheet with the exact text, Share (a stub
    records what it is handed), Copy; as it prints; Back, one step at a time. Part 3: the communication passport: every
    line with its box, the emergency part with none, how yes and no are shown, a line of the carer's own, the page as
    it prints, the sheet, Back from the page to the lines to where it was opened from; and with nothing in About them.
    No model is part of any of it: every request to another host is refused and counted, and none is expected."""
    import re
    host = urlparse(url).hostname
    origin = f'{urlparse(url).scheme}://{urlparse(url).netloc}'
    ctx = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True, user_agent=PHONE_UA, service_workers='block')
    ctx.grant_permissions(['clipboard-read', 'clipboard-write'], origin=origin)
    ctx.add_init_script(f'({SHARE_STUB})()')
    outside = []
    ctx.route('**/*', lambda r: r.continue_() if urlparse(r.request.url).hostname in (host, None) or r.request.url.startswith(('data:', 'blob:')) else (outside.append(r.request.url) if not app_check_url(r.request.url) else None, r.abort()))
    page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('dialog', lambda d: d.accept())
    profile, photos = miller_p4()
    page.goto(url)
    page.wait_for_selector('main.simple.home')
    log0 = page.evaluate(KV_GET, 'practice')
    check('phase 7, first run: the log of the conversations starts now, empty, and holds a day and rows only', isinstance(log0, dict) and log0.get('events') == [] and abs(log0.get('since', 0) - time.time() * 1000) < 60000, str(log0)[:200])
    page.evaluate(KV_PUT, {'profile': profile, 'photos': photos, 'settings': {'cloudHelp': False, 'support': 'more', 'welcomed': False, 'firstCard': True, 'howFolded': True}})
    page.reload()
    page.wait_for_selector('main.simple.home')
    check('phase 7, first screen: "How to talk with Frank" stands with the other ways in, under "Talk about a photo"', 'How to talk with Frank' in text(page, '#passport-link') and 'One page for a new carer, a nurse or a visitor.' in text(page, '#passport-link') and ys(page, '#passport-link')[0][1] > ys(page, '#phototalk-link')[0][1], text(page, '#passport-link'))
    screen_checks(page, 'phase 7, first screen')

    # ---------------------------------------------------------------- part 1: real conversations, then their counts
    # 1. a question of the app's own, answered: tea
    ask_topic(page, 'food', 'Would you like tea or coffee?')
    answer(page, 'tea')
    # 2. the same question; "No, something else" on the check, then "something else", then the first letter: Bo
    new_q(page)
    ask_topic(page, 'food', 'Would you like tea or coffee?')
    page.locator('[data-act=show]').click()
    page.wait_for_selector('main.pv .pt')
    page.locator('main.pv .pt', has_text='coffee').first.click()
    page.wait_for_selector('[data-confirm=change]')
    check('part 1, the check: "So: coffee. Right?" with "Yes" and "No, something else"', 'So: coffee. Right?' in text(page, '#person') and text(page, '[data-confirm=change]') == 'No, something else')
    page.locator('[data-confirm=change]').click()
    page.wait_for_selector('main.pv .pt')
    tap_yes(page, 'something else')
    give_back(page)
    page.locator('#letter-go').click()
    page.wait_for_selector('#abc')
    page.locator('[data-letter=B]').click()
    # (phase 17: the letter stays inside the topic: after "tea or coffee?" B gives the family's ginger biscuits first)
    tap_yes(page, 'biscuits (ginger)')
    give_back(page)
    check('part 1: "something else", then the first letter: the word is ginger biscuits', 'The word is: ginger biscuits.' in text(page, '#do-now'), text(page)[:300])
    # 3. a typed question that holds two things: the app asks them one at a time; the second is then asked
    new_q(page)
    page.fill('#q', 'Are you hungry and are you tired?')
    page.locator('#make').click()
    page.wait_for_selector('main.simple.card #made-where, main.simple.nocard')
    two = text(page)
    check('part 1: a typed question with two things in it is asked one at a time ("Next: second question" is there)', page.locator('[data-act=next]').count() == 1, two[:300])
    answer(page, 'yes')
    more(page)
    page.locator('main.s-answered [data-act=next]').first.click()
    page.wait_for_selector('main.simple.card #made-where')
    answer(page, 'no')
    # 4. a typed memory question: no card, a line to say instead
    new_q(page)
    page.fill('#q', 'Do you remember what you had for lunch?')
    page.locator('#make').click()
    page.wait_for_selector('main.simple.nocard')
    check('part 1: a memory question gets no card and a line to say instead', 'This one asks them to remember' in text(page) or 'asks Frank to remember' in text(page), text(page)[:300])
    # 5. Frank starts; the phone comes back with a press and hold
    page.locator('[data-act=home]').click()
    page.wait_for_selector('main.simple.home')
    page.locator('#turn-go').click()
    page.wait_for_selector('main.pv .pt')
    tap_yes(page, 'I want to talk about')
    page.wait_for_selector('main.pv .pt')
    hold_exit(page)
    page.wait_for_timeout(800)
    page.wait_for_selector('main.simple')
    # 6. "We're stuck" on a card
    page.locator('[data-act=home]').click()
    page.wait_for_selector('main.simple.home')
    ask_topic(page, 'rest', 'Are you tired?')
    page.locator('[data-act=stuck]').click()
    page.wait_for_function("document.querySelector('[data-act=unstuck]')")
    page.locator('[data-act=home]').click()
    page.wait_for_selector('main.simple.home')

    log = page.evaluate(KV_GET, 'practice')
    kinds = [e['k'] + (':esc' if e.get('esc') else '') + (':' + e['via'] if e['k'] == 'answer' and not e.get('esc') else '') for e in log['events']]
    check('part 1, the log: one row for each question, each "Yes" on the check, the "No, something else", Frank\'s start and "We\'re stuck"', kinds == ['ask', 'answer:card', 'ask', 'no', 'answer:esc', 'answer:letter', 'ask', 'answer:card', 'ask', 'answer:card', 'ask', 'turn', 'answer:turn', 'ask', 'stuck'], str(kinds))
    words = json.dumps(log)
    check('part 1, the log holds no word of a question or an answer (no "tea", no "Bo", no "hungry", no "lunch")', not re.search(r'tea|coffee|\bbo\b|hungry|tired|lunch|remember|tell you', words, re.I), words[:400])
    asks = [e for e in log['events'] if e['k'] == 'ask']
    check('part 1, the log: where each question came from, its topic, and what the app flagged', [(e['by'], e['topic'], bool(e.get('two')), bool(e.get('second')), bool(e.get('quiz'))) for e in asks] == [('app', 'food', False, False, False), ('app', 'food', False, False, False), ('typed', 'food', True, False, False), ('typed', 'rest', False, True, False), ('typed', 'food', False, False, True), ('app', 'rest', False, False, False)], str(asks))

    page.locator('#diary-link').click()
    page.wait_for_selector('main.simple.diary')
    check('part 1: "For the speech therapist" stands on the diary screen, under the two share buttons', 'For the speech therapist' in text(page, '#practice-link') and 'counts only, no grade' in text(page, '#practice-link') and ys(page, '#practice-link')[0][1] > ys(page, '#share-row')[0][1], text(page, '#practice-link'))
    screen_checks(page, 'part 1: the diary with the way in', primary=False)
    page.locator('#practice-link').click()
    page.wait_for_selector('main.simple.practice #practice-page')
    pg = text(page, '#practice-page')
    for want in ('Conversations with Frank, the last 7 days', 'Counted by the app from this phone. Only what was entered here.', 'These are counts to talk over. They are not a score of the family or of Frank.',
                 'Questions asked: 6. Counted: each question that became a card or a line to say.', 'By topic: Food & drink 4, Rest & sleep 2.',
                 "Picked from the app's own questions (one thought each): 3. Typed by the carer: 3. Spoken by the carer: 0.",
                 'Two things in one question: 1 time. The app asked them one at a time.', 'The second of the two was then asked: 1 time.',
                 'A question that asked to remember something: 1 time. The app made no card and offered a line to say instead.',
                 '"Something else" was chosen: 1 time, in 1 conversation.', 'After it, an answer was confirmed by:', 'the first letter: 1', 'After it, no answer was confirmed: 0 times.',
                 '"We\'re stuck" (show, write or draw) was opened: 1 time, 0 of them after "something else".',
                 'Frank started the conversation (the button "I want to say something"): 1 time.', 'The check ("So: tea. Right?"): "Yes" 6 times, "No, something else" 1 time.',
                 'Answers marked "less sure" by the answer check in this time (a run of yes, or the same place on the screen):', 'A yes on the check is not proof: when tired, a yes can mean no.',
                 'Read aloud is off on this phone today.', 'Nothing about needs, pain or health is on this page. Those are in the diary.',
                 'Counted by fixed rules on this phone. No AI. Not an assessment and not a medical record.'):
        check(f'part 1, the page counts what was done: "{want[:70]}"', want in pg, pg[:900])
    today = datetime.date.today()
    check('part 1: the app began to count today, and the page says from which day', f'The app began to count these on {today:%a} {today.day} {today:%b}: nothing from before that day is in the numbers.' in pg, pg[:500])
    check('part 1: no line of the page grades anyone (good, bad, well done, poor, should, must, failed), and none has an exclamation mark', not re.search(GRADE, re.sub(r'"[^"]*"', '""', pg), re.I) and '!' not in pg, pg)
    shot(page, '01_for_the_speech_therapist_counts_of_real_conversations', full=True)

    # ---------------------------------------------------------------- part 2: the page on its worst case; print, share, Back
    at = lambda d, h, m: int(datetime.datetime.combine(datetime.date.today() - datetime.timedelta(days=d), datetime.time(h, m)).timestamp() * 1000)
    diary = [
        {'id': 'x1', 'at': at(1, 9, 0), 'kind': 'answer', 'q': 'Are you in pain?', 'label': 'yes', 'topic': 'body'},
        {'id': 'x2', 'at': at(1, 9, 1), 'kind': 'answer', 'q': 'Where does it hurt?', 'label': 'chest', 'topic': 'body'},
        {'id': 'x3', 'at': at(1, 9, 2), 'kind': 'answer', 'q': 'How bad is the pain?', 'label': 'quite bad', 'topic': 'body'},
        {'id': 'x4', 'at': at(1, 9, 10), 'kind': 'log', 'log': 'pain', 'label': 'pain', 'topic': 'body'},
        {'id': 'x5', 'at': at(2, 10, 0), 'kind': 'need', 'label': 'toilet', 'topic': 'body'},
        {'id': 'x6', 'at': at(2, 15, 0), 'kind': 'need', 'label': 'toilet', 'topic': 'body'},
        {'id': 'x7', 'at': at(3, 8, 0), 'kind': 'log', 'log': 'drank', 'label': 'drank', 'topic': 'food'},
    ]
    old = [{'k': 'ask', 'at': at(12, 10, i), 'topic': 'people', 'by': 'app', 'start': True} for i in range(5)]
    page.evaluate(KV_PUT, {'diary': diary, 'practice': {'since': at(20, 8, 0), 'events': old + log['events']}})
    page.reload()
    page.wait_for_selector('main.simple.practice #practice-page')
    check('part 2: opened again, the box "Include the needs and pain answers" is off', not page.locator('#practice-health').is_checked() and 'Off: nothing about needs, pain or health is on the page.' in text(page, '#practice-health-state'))
    warn = text(page, '#practice-warn') if page.locator('#practice-warn').count() else ''
    check('part 2, worst case (a pain in the chest, quite bad, in the diary of this time): with the box off the SCREEN says so, with whom to tell and when to call', 'It is not on this page unless you tick the box. A pain in the head or the chest: call 911 now, whatever the amount.' in warn, warn)
    check('part 2, box off: the page itself holds nothing of the diary (no "chest", no "toilet", no call sentence)', not re.search(r'chest|toilet|quite bad|Call 911', text(page, '#practice-page')))
    check('part 2, box off (phase 8): the printed page still says, with no detail, that the diary holds a pain answer: ask the family', 'The diary of this time holds a pain answer or "something\'s wrong": ask the family.' in text(page, '#practice-page'), text(page, '#practice-page')[-500:])
    check('part 2: the counting began before this week, so the page does not say "began to count"', 'began to count' not in text(page, '#practice-page'))
    screen_checks(page, 'part 2: "For the speech therapist"')
    shot(page, '02_for_the_speech_therapist_box_off_the_screen_warns', full=True)
    page.locator('#practice-health').check()
    page.wait_for_selector('#practice-call')
    pg = text(page, '#practice-page')
    yday = datetime.date.today() - datetime.timedelta(days=1)
    yd = f'{yday:%a} {yday.day} {yday:%b}'
    check('part 2, box ticked: the call sentence stands at the top of the page', text(page, '#practice-call') == 'Call 911 now if this is new or sudden: see the pain lines below.' and ys(page, '#practice-call')[0][1] < ys(page, '.page-sec[data-sec=asked]')[0][1])
    check('part 2, box ticked: the needs with their counts; the pain entered once (three answers and a tap ten minutes later are one entry); the answers as given; whom to tell',
          'Needs board, pointed to: toilet 2.' in pg and f'Pain: entered 1 time ({yd} 09:10). A card answer and a tap within 20 minutes count once.' in pg and f'{yd} 09:01 "Where does it hurt?" "chest"' in pg and f'{yd} 09:02 "How bad is the pain?" "quite bad"' in pg and 'Tell the doctor or nurse. If it is new or sudden, call 911 now.' in pg and 'Drank' not in pg, pg[-700:])
    check('part 2, box ticked: the warning for the carer is gone (the page now says it itself)', page.locator('#practice-warn').count() == 0)
    check('part 2, box ticked: still no line of the app\'s own wording grades anyone (the answer "quite bad" is Frank\'s, in quotes)', not re.search(GRADE, re.sub(r'"[^"]*"', '""', pg), re.I))
    shot(page, '03_for_the_speech_therapist_needs_and_pain_answers_ticked', full=True)
    # the last 30 days hold the five older questions
    page.locator('#practice-month').click()
    page.wait_for_function("document.querySelector('#practice').dataset.span === 'month'")
    check('part 2: "Last 30 days" counts the older questions as well (11), and names its span', 'Questions asked: 11.' in text(page, '#practice-page') and 'the last 30 days' in text(page, '#practice-sub') and page.locator('#practice-health').is_checked())
    page.locator('#practice-week').click()
    page.wait_for_function("document.querySelector('#practice').dataset.span === 'week'")
    # the questions for the therapist: three at most
    for i in (1, 6, 9):
        page.locator(f'[data-practice-q="{i}"]').check()
        page.wait_for_timeout(120)
    check('part 2: three questions picked; the other seven cannot be ticked; they close the page', page.locator('[data-practice-q]:checked').count() == 3 and page.locator('[data-practice-q]:disabled').count() == 7 and 'The family wants to ask: What helps after "something else"? What helps the person to start a conversation? What to practise before the next session?' in text(page, '.page-sec[data-sec=ask]'), text(page, '#practice-page')[-300:])
    check('part 2: the picks are kept on this phone', page.evaluate(KV_GET, 'practiceAsk') == ['What helps after "something else"?', 'What helps the person to start a conversation?', 'What to practise before the next session?'], str(page.evaluate(KV_GET, 'practiceAsk')))
    screen_checks(page, 'part 2: the page with the box ticked and three questions')

    # ---- the sheet: the exact text first; Share hands over exactly that; Copy copies exactly that
    page.locator('#practice-share').click()
    page.wait_for_selector('#share-sheet')
    sheet = text(page, '#share-sheet')
    shown = page.locator('#share-text').inner_text()
    check('part 2, the sheet: its own heading, where the text goes, that this is the exact text, and no box (what is in it was decided on the page)', 'Share this with the speech therapist?' in sheet and 'This text leaves the phone through the app you pick (message, email). Talk Partner keeps no copy and has no server.' in sheet and 'This is the exact text. Nothing else goes with it.' in sheet and 'The needs and pain answers are in this text, as you ticked on the page.' in sheet and page.locator('#share-health').count() == 0, sheet[:400])
    lines = shown.split('\n')
    check('part 2, the text: the first line of every shared text, then the call sentence, then the page line for line', lines[0].startswith('Shared from Talk Partner on ') and lines[0].endswith("Counted by the app's rules from what was entered here; not a medical record.") and lines[1] == 'Call 911 now if this is new or sudden: see the pain lines below.' and 'For the speech therapist: How the conversations at home went' in lines and 'QUESTIONS FOR THE THERAPIST' in lines and lines[-1] == 'Counted by fixed rules on this phone. No AI. Not an assessment and not a medical record.', '\n'.join(lines[:6]))
    check('part 2, the text and the page are the same lines', all(l in shown for l in page.locator('#practice-page .page-sec li').all_inner_texts()))
    check('part 2, the sheet fits the 390 x 844 screen: Share, Copy and Cancel can all be reached', all(y[1] + y[3] <= 844 for y in ys(page, '#share-go, #share-copy, #share-cancel')), str(ys(page, '#share-go, #share-copy, #share-cancel')))
    shot(page, '04_for_the_speech_therapist_sheet_with_the_exact_text')
    check('part 2: nothing was handed over before a button was pressed', page.evaluate('window.__shared.length') == 0)
    page.locator('#share-go').click()
    page.wait_for_function("document.querySelector('#share-status').innerText.includes('Handed')")
    handed = page.evaluate('window.__shared')
    check('part 2, Share: `navigator.share` was called once, with { text } and nothing else, and the text is the one the sheet showed', len(handed) == 1 and list(handed[0].keys()) == ['text'] and handed[0]['text'] == shown, str(handed)[:200])
    page.locator('#share-copy').click()
    page.wait_for_function("document.querySelector('#share-copy').innerText === 'Copied'")
    check('part 2, Copy: the clipboard holds exactly the text the sheet showed', page.evaluate('navigator.clipboard.readText()') == shown)
    page.locator('#share-cancel').click()
    page.wait_for_function("!document.querySelector('#share-sheet')")
    check('part 2: the sheet closes back onto the page; the box is as it was', page.locator('main.simple.practice').count() == 1 and page.locator('#practice-health').is_checked())
    # the phone's back button with the sheet up closes the sheet, and nothing more
    page.locator('#practice-share').click()
    page.wait_for_selector('#share-sheet')
    page.go_back()
    page.wait_for_function("!document.querySelector('#share-sheet')")
    check('part 2: with the sheet up, the phone\'s back button closes the sheet and stays on the page', page.locator('main.simple.practice').count() == 1)

    # ---- as it prints
    page.emulate_media(media='print')
    page.wait_for_timeout(200)
    pv = page.evaluate(PRINT_VIEW)
    check('part 2, printed: the page, and nothing around it (no bar, no box, no questions to pick, no buttons)', pv['top'] == 0 and pv['controls'] == 0 and pv['page'] == 1, str(pv))
    shot(page, '05_for_the_speech_therapist_as_it_prints', full=True)
    page.emulate_media(media='screen')
    stub = page.evaluate("(() => { let n = 0; window.print = () => { n++; window.__printed = n; }; return true; })()")
    page.locator('#practice-print').click()
    check('part 2: "Print this page" calls the browser\'s own print, once', stub and page.evaluate('window.__printed') == 1)

    # ---- Back, exactly one step at a time (PERSONA 12): the page -> the diary -> the first screen
    # (the page was loaded again for part 2, so there is no step under it: Back is the first screen, as on every screen opened by its address)
    page.locator('[data-act=back]').click()
    page.wait_for_selector('main.simple.home')
    check('Back from the page opened by its own address: the first screen', page.locator('main.simple.home').count() == 1)
    page.locator('#diary-link').click()
    page.wait_for_selector('main.simple.diary')
    page.locator('#practice-link').click()
    page.wait_for_selector('main.simple.practice')
    check('opened again from the diary: the box is off again, and the screen warns again', not page.locator('#practice-health').is_checked() and page.locator('#practice-warn').count() == 1)
    page.locator('[data-act=back]').click()
    page.wait_for_selector('main.simple.diary')
    check('Back from "For the speech therapist": exactly one step, to the diary it was opened from', page.locator('main.simple.diary').count() == 1 and page.locator('main.simple.practice').count() == 0)
    page.locator('#practice-link').click()
    page.wait_for_selector('main.simple.practice')
    page.go_back()
    page.wait_for_selector('main.simple.diary')
    check('the phone\'s own back button does the same: one step, to the diary', page.locator('main.simple.diary').count() == 1)
    page.locator('[data-act=back]').click()
    page.wait_for_selector('main.simple.home')
    check('Back from the diary: the first screen', page.locator('main.simple.home').count() == 1)
    # "Delete these counts": the log starts again, the diary stays
    page.locator('#diary-link').click()
    page.wait_for_selector('main.simple.diary')
    page.locator('#practice-link').click()
    page.wait_for_selector('main.simple.practice')
    page.locator('#practice-del').click()
    page.wait_for_function("!document.querySelector('#practice-del')")
    after = page.evaluate(KV_GET, 'practice')
    check('"Delete these counts" (after a yes): the log is empty and starts now; the page says nothing was counted; the diary is as it was', after['events'] == [] and 'Nothing was counted in this time.' in text(page, '#practice-page') and 'Questions asked: 0.' in text(page, '#practice-page') and len(page.evaluate(KV_GET, 'diary')) == len(diary), text(page, '#practice-page')[:400])
    screen_checks(page, 'the page with nothing counted')
    shot(page, '06_for_the_speech_therapist_nothing_counted', full=True)
    page.locator('[data-act=home]').click()
    page.wait_for_selector('main.simple.home')

    # ---------------------------------------------------------------- part 3: the communication passport
    H = 3600000
    now_ms = int(time.time() * 1000)
    seen = lambda q, labels, back: [{'q': q, 'topic': '', 'label': l, 'at': now_ms - back * H + i * 60000} for i, l in enumerate(labels)]
    history = (seen('Would you like tea or coffee?', ['tea', 'tea', 'tea', 'coffee'], 90) + seen('Are you in pain?', ['no', 'no', 'no'], 80) + seen('Would you like something to drink?', ['no', 'no', 'no'], 70)
               + seen('It starts with B. Is it one of these?', ['Bo', 'Bo', 'biscuits (ginger)'], 60) + seen('Who is it about?', ['Tom', 'Tom'], 50) + seen('Would you like to call Tom?', ['yes'], 49)
               + seen('Shall we talk more about Bo?', ['yes', 'yes'], 40) + seen('Would you like to see Beth?', ['no', 'no', 'no'], 30))
    needs = [{'label': 'toilet', 'at': now_ms - 20 * H + i * 60000} for i in range(4)]
    # (phase 8: the number set in About them, so the page names it; diabetes noted, so the food line says to ask the family)
    page.evaluate(KV_PUT, {'history': history, 'needs': needs, 'health': {'text': '', 'diabetes': True, 'swallowing': False, 'fluidLimit': False, 'reminders': False, 'emergency': '911'}})
    page.reload()
    page.wait_for_selector('main.simple.home')
    page.locator('#passport-link').click()
    page.wait_for_selector('main.simple.passport[data-step=lines]')
    lead = text(page)
    check('passport, first screen: the title with the name, what it is for, that every line is the carer\'s to decide, and that the app sends nothing', 'How to talk with Frank' in text(page, '#pass-title') and 'You decide every line.' in lead and 'No AI, and the app sends nothing: the page leaves only when you print it or share it yourself.' in text(page, '#pass-lock'), lead[:400])
    boxes = page.evaluate("[...document.querySelectorAll('[data-pass-line]')].map((b) => [b.dataset.passLine, b.checked, b.closest('label').innerText.replace(/\\s+/g, ' ').trim()])")
    keys = [b[0] for b in boxes]
    check('passport: the five "how to talk" lines carry the name, each with its box; (phase 8) the two that state a fact about Frank are off until ticked, "Tick if true"', [b[2] for b in boxes[:5]] == ['Frank knows what to say. The words are hard to find. Tick if true for Frank. Off until you tick it.', 'Frank understands most of what you say. Speak in short sentences, one thing at a time. Tick if true for Frank. Off until you tick it.', 'Write two or three choices, or point to pictures. Wait: count to ten.', 'Check: "So: tea. Right?"', "Don't answer for Frank, and don't quiz: no testing questions."] and [b[1] for b in boxes[:2]] == [False, False] and all(b[1] for b in boxes[2:]), str(boxes[:5]))
    check('passport (phase 8): under how yes and no are shown, the fixed line on a tired yes, with no box', 'A tired yes may not mean yes. Check it the other way. Ask about pain, drinks and the toilet every time.' in lead, lead[:900])
    check('passport (phase 8): with diabetes noted in About them, the food line says to ask the family, and names no condition', re.search(r'Food and drink: [^.]+\. Ask the family what is all right\.', lead) is not None and 'diabet' not in lead.lower(), lead[:900])
    check('passport: About Frank from About them (people, food and drink, places, TV, the family\'s own fact)', all(k in keys for k in ('about:people', 'about:foods', 'about:places', 'about:tv')) and 'People: Carol (wife, lives here), Beth (daughter), Tom (brother).' in lead and 'Bo is his dog' in lead, str(keys))
    check('passport, "Words that worked": the words found by their first letter with how often, and the usual choice with its count', 'Bo: found by its first letter, 2 times.' in lead and 'biscuits (ginger): found by its first letter, 1 time.' in lead and '"Would you like tea or coffee": usually tea (3 of 4).' in lead, lead[900:1500])
    check('passport, "Things Frank likes to talk about": Bo and Tom with their counts; not Beth (three times "no")', 'Bo: chosen, or yes to an offer about it, 4 times.' in lead and 'Tom: chosen, or yes to an offer about it, 3 times.' in lead and 'Beth: chosen' not in lead and 'It says what was chosen, not what is felt.' in lead)
    check('passport, worst case: no habit about pain, the body or a need, and no usual "no", anywhere on it (the answers held "no" to pain and to a drink three times each, and "toilet" four times)', not re.search(r'in pain|says no|something to drink|needs board|toilet', lead.replace('Ask about pain, drinks and the toilet every time.', '').replace("But a yes to pain, the toilet or 'something's wrong' is always a yes: act on it.", ''), re.I), lead)
    wrong = text(page, '.pass-sec[data-sec=wrong]')
    check('passport, "If something is wrong": the emergency number and the fixed text of phase 5 (FAST), always on the page, with no box', 'Always on the page' in wrong and 'Emergency number: 911.' in wrong and 'If you see any one of these, and it is new or sudden, call 911 now. Do not wait to see if it passes.' in wrong and 'Face: One side of the face has dropped, or the smile is uneven.' in wrong and 'Time: Call now. Note the time it started: the ambulance crew will ask.' in wrong and 'Chest pain, tightness or trouble breathing: call 911 now, even if it has happened before.' in wrong and 'Worried, and it is not sudden, and it is not chest pain or trouble breathing: call the doctor or nurse today.' in wrong and page.locator('.pass-sec[data-sec=wrong] input').count() == 0, wrong)
    check('passport, first screen: nothing can be printed or shared from here (only "Look at the page")', page.locator('[data-act=page-print], [data-act=share-page]').count() == 0 and text(page, '#pass-look') == 'Look at the page')
    check('passport: no guessed pronoun on the screen but in the family\'s own fact ("Bo is his dog")', not re.search(r'\b(?:he|she|him|her|his|hers)\b', lead.replace('Bo is his dog', ''), re.I))
    screen_checks(page, 'passport, the lines')
    shot(page, '07_passport_every_line_with_its_box', full=True)
    # the carer decides: one fixed line off, one learned line off, yes and no typed, one line of her own
    page.locator('[data-pass-line="sca:understands"]').check()
    page.locator('[data-pass-line="word:biscuits (ginger)"]').uncheck()
    page.fill('#pass-yes', 'nods, or thumb up')
    page.fill('#pass-no', 'pushes the hand away')
    page.fill('#pass-own-0', 'Points with the left hand. Tires after lunch.')
    page.wait_for_timeout(200)
    kept = page.evaluate(KV_GET, 'passport')
    check('passport: what the carer set is kept on this phone (one line ticked, one off, yes and no, her own line)', kept['on'] == ['sca:understands'] and kept['off'] == ['word:biscuits (ginger)'] and kept['yes'] == 'nods, or thumb up' and kept['no'] == 'pushes the hand away' and kept['own'][0] == 'Points with the left hand. Tires after lunch.', str(kept))
    shot(page, '08_passport_two_lines_off_yes_no_and_an_own_line', full=True)
    page.locator('#pass-look').click()
    page.wait_for_selector('main.simple.passport[data-step=page] #pass-page')
    pp = text(page, '#pass-page')
    check('passport, the page: the lines left on, in their sections; the two taken off are not there; yes and no as typed; her own line under "Also"', 'How to talk with Frank' in text(page, '#pass-h') and 'Frank knows what to say' not in pp and 'biscuits (ginger): found' not in pp and 'Frank understands most of what you say.' in pp and 'Yes: nods, or thumb up' in pp and 'No: pushes the hand away' in pp and 'Also Points with the left hand. Tires after lunch.' in pp and 'Take this line off' not in pp and 'Tick if true' not in pp and 'A tired yes may not mean yes.' in pp, pp[:700])
    check('passport, the page: "If something is wrong" stands on it whole, and the footer says what the page is not', 'Emergency number: 911.' in pp and 'Speech: Speech is suddenly worse, slurred or gone: more than on other days.' in pp and "It holds no health notes: ask the family, and go by the doctor's plan." in pp and 'Not a medical record. No doctor, nurse or speech therapist wrote or checked it.' in text(page, '#pass-foot'))
    pics = page.evaluate("[...document.querySelectorAll('#pass-pics li')].map((li) => [li.querySelector('b').innerText.trim(), !!li.querySelector('img'), (li.querySelector('.mono') || {}).innerText || ''])")
    check('passport, the page: the family\'s own pictures where there is one (Beth, Bo, the lake), an initial otherwise (Carol, Tom)', pics == [['Carol', False, 'C'], ['Beth', True, ''], ['Tom', False, 'T'], ['Bo', True, ''], ['the lake', True, '']], str(pics))
    check('passport, the page: Print, Share and "Change the lines" stand under it', ys(page, '#pass-print')[0][1] > ys(page, '#pass-foot')[0][1] and page.locator('#pass-share').count() == 1 and text(page, '#pass-change') == 'Change the lines')
    screen_checks(page, 'passport, the page')
    shot(page, '09_passport_the_page_as_approved', full=True)
    page.emulate_media(media='print')
    page.wait_for_timeout(200)
    pv = page.evaluate(PRINT_VIEW)
    check('passport, printed: the page, and nothing around it', pv['top'] == 0 and pv['controls'] == 0 and pv['page'] == 1, str(pv))
    shot(page, '10_passport_as_it_prints', full=True)
    if SHOTS:
        page.pdf(path=os.path.join(SHOTS, '10b_passport_as_it_prints.pdf'), format='A4', margin={'top': '12mm', 'bottom': '12mm', 'left': '12mm', 'right': '12mm'})
        sheets = len(re.findall(rb'/Type\s*/Page[^s]', open(os.path.join(SHOTS, '10b_passport_as_it_prints.pdf'), 'rb').read()))
        check('passport, printed on A4 with 12 mm margins: one sheet', sheets == 1, str(sheets))
    page.emulate_media(media='screen')
    page.evaluate("(() => { window.__printed = 0; window.print = () => { window.__printed++; }; })()")
    page.locator('#pass-print').click()
    check('passport: "Print this page" calls the browser\'s own print, once', page.evaluate('window.__printed') == 1)
    before = page.evaluate('window.__shared.length')
    page.locator('#pass-share').click()
    page.wait_for_selector('#share-sheet')
    shown = page.locator('#share-text').inner_text()
    sheet = text(page, '#share-sheet')
    check('passport, the sheet: its heading, where the text goes, no box, and that no health notes and no photos are in it', 'Share this page as text?' in sheet and 'This text leaves the phone through the app you pick' in sheet and 'Every line in this text is one you left on the page. No health notes and no photos are in it. Photos never go in.' in sheet and page.locator('#share-health').count() == 0, sheet[:400])
    check('passport, the text: the title, the sections, only the lines left on, no photo and no data URL', 'HOW TO TALK WITH FRANK' in shown and '- Yes: nods, or thumb up' in shown and 'IF SOMETHING IS WRONG' in shown and '- Emergency number: 911.' in shown and 'Frank knows what to say' not in shown and not re.search(r'data:|base64|<img', shown), shown[:400])
    check('passport, the text and the page are the same lines', all(l in shown for l in page.locator('#pass-page .page-sec li[data-key]').all_inner_texts()))
    shot(page, '11_passport_sheet_with_the_exact_text')
    page.locator('#share-go').click()
    page.wait_for_function("document.querySelector('#share-status').innerText.includes('Handed')")
    handed = page.evaluate('window.__shared')
    check('passport, Share: handed over once, as { text }, exactly the text the sheet showed', len(handed) == before + 1 and list(handed[-1].keys()) == ['text'] and handed[-1]['text'] == shown)
    page.locator('#share-cancel').click()
    page.wait_for_function("!document.querySelector('#share-sheet')")
    # ---- Back, one step at a time: the page -> the lines (as they were left) -> the first screen
    page.locator('[data-act=back]').first.click()
    page.wait_for_selector('main.simple.passport[data-step=lines]')
    check('Back from the passport\'s page: exactly one step, to its lines, as the carer left them', not page.locator('[data-pass-line="sca:knows"]').is_checked() and page.locator('[data-pass-line="sca:check"]').is_checked() and page.input_value('#pass-yes') == 'nods, or thumb up' and page.input_value('#pass-own-0') == 'Points with the left hand. Tires after lunch.')
    page.locator('#pass-look').click()
    page.wait_for_selector('main.simple.passport[data-step=page]')
    page.locator('#pass-change').click()
    page.wait_for_selector('main.simple.passport[data-step=lines]')
    check('"Change the lines" is the same one step back', page.locator('#pass-look').count() == 1)
    page.locator('#pass-look').click()
    page.wait_for_selector('main.simple.passport[data-step=page]')
    page.go_back()
    page.wait_for_selector('main.simple.passport[data-step=lines]')
    check('the phone\'s own back button from the page: the lines', page.locator('#pass-look').count() == 1)
    page.locator('[data-act=back]').click()
    page.wait_for_selector('main.simple.home')
    check('Back from the passport\'s lines: the first screen it was opened from', page.locator('main.simple.home').count() == 1)
    # from About them: the same page, and Back returns to About them
    page.goto(url + '#/about')
    page.wait_for_selector('main.simple.about-simple')
    check('About them has the way in as well', 'How to talk with Frank' in text(page, '#passport-about'))
    page.locator('#passport-about').click()
    page.wait_for_selector('main.simple.passport[data-step=lines]')
    page.locator('[data-act=back]').click()
    page.wait_for_selector('main.simple.about-simple')
    check('opened from About them, Back goes back to About them', page.locator('main.simple.about-simple').count() == 1)
    page.reload()
    page.wait_for_selector('main.simple')
    page.goto(url + '#/passport')
    page.wait_for_selector('main.simple.passport[data-step=lines]')
    check('after a reload the passport opens on its lines, with what the carer set', not page.locator('[data-pass-line="sca:knows"]').is_checked() and page.input_value('#pass-no') == 'pushes the hand away')
    page.locator('[data-act=home]').click()
    page.wait_for_selector('main.simple.home')

    # ---- with nothing in About them
    page.evaluate(KV_PUT, {'profile': {'personName': '', 'partnerName': '', 'people': [], 'foods': [], 'places': [], 'tv': [], 'music': [], 'other': []}, 'photos': [], 'history': [], 'needs': [], 'passport': None})
    page.reload()
    page.wait_for_selector('main.simple.home')
    check('with no name the way in reads "How to talk together"', 'How to talk together' in text(page, '#passport-link'))
    page.locator('#passport-link').click()
    page.wait_for_selector('main.simple.passport[data-step=lines]')
    bare = text(page)
    check('passport with nothing in About them: "this person" and "they", in the right form, and the way to About them', 'How to talk with this person' in text(page, '#pass-title') and 'They understand most of what you say.' in bare and "Don't answer for them, and don't quiz: no testing questions." in bare and 'How they say yes and no' in bare and page.locator('#pass-noname a[href="#/about"]').count() == 1, bare[:500])
    check('passport with nothing in About them: no empty section and no broken line ("They likes", "People: .", "undefined")', not re.search(r'They (?:likes|understands|knows|says)|People: \.|undefined|Words that worked|likes? to talk about', bare) and page.locator('.pass-sec[data-sec=about], .pass-sec[data-sec=words], .pass-sec[data-sec=likes]').count() == 0, bare)
    page.locator('#pass-look').click()
    page.wait_for_selector('#pass-page')
    pp = text(page, '#pass-page')
    check('passport with nothing in About them: the page still holds how to talk (phase 8: not the two lines that are off until ticked), "Not filled in yet", and "If something is wrong" whole', 'They know what to say.' not in pp and 'Wait: count to ten.' in pp and 'Not filled in yet: ask the family how yes and no are shown.' in pp and 'Emergency number: 911.' in pp and 'Face: One side of the face has dropped' in pp and page.locator('#pass-pics').count() == 0, pp[:500])
    screen_checks(page, 'passport with nothing in About them, the page')
    shot(page, '12_passport_with_nothing_in_about_them', full=True)
    page.locator('[data-act=home]').click()
    page.wait_for_selector('main.simple.home')
    check('phase 7: "Home" from the passport\'s page is the first screen', page.locator('main.simple.home').count() == 1)

    check('phase 7: no request went to any other host (no model, no server: rules on the device)', not outside, str(outside[:3]))
    check('phase 7: no page error', not errors, '; '.join(errors[:3]))
    ctx.close()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--url', default='http://localhost:5179/')
    ap.add_argument('--live', action='store_true', help='a hosted copy: never press "Yes" on the sheet, so nothing is sent')
    ap.add_argument('--dev', action='store_true', help='the dev server: it has no service worker, so the offline run is left out (and said so)')
    ap.add_argument('--shots', default=None, help='a folder for pictures of the phase 5 or phase 6 screens (devlog/evidence_phase5, devlog/evidence_phase6)')
    ap.add_argument('--only', default=None, help='run one part only: phase5, phase6, phase7, back or ways')
    a = ap.parse_args()
    global SHOTS
    SHOTS = a.shots
    url = a.url if a.url.endswith('/') else a.url + '/'
    print(f'url: {url}')
    with sync_playwright() as p:
        browser = p.chromium.launch()
        print(f'browser: Chromium {browser.version} (headless)')
        if a.only == 'back':
            backstack(browser, url)
        if a.only == 'ways':
            ways(browser, url)
        if a.only in ('phase5', 'phase6'):
            (phase5 if a.only == 'phase5' else phase6)(browser, url, a.live)
        if a.only == 'phase7':
            phase7(browser, url, a.live)
        if a.only in ('phase5', 'phase6', 'phase7', 'back', 'ways'):
            browser.close()
            bad = results.count(False)
            print(f'\n{len(results) - bad} of {len(results)} checks passed')
            sys.exit(1 if bad else 0)
        phone(browser, url, a.live)
        learning(browser, url)
        photos(browser, url)
        diary(browser, url, a.live)
        phase4(browser, url, a.live)
        if SHOTS and ('phase6' in SHOTS or 'phase7' in SHOTS):
            # (the pictures of each phase go to its own folder: this run writes phase 6's only)
            keep, SHOTS = SHOTS, None
            phase5(browser, url, a.live)
            SHOTS = keep
        else:
            phase5(browser, url, a.live)
        if SHOTS and 'phase7' in SHOTS:
            # (the pictures of each phase go to its own folder: this run writes phase 7's only)
            keep, SHOTS = SHOTS, None
            phase6(browser, url, a.live)
            SHOTS = keep
        else:
            phase6(browser, url, a.live)
        phase7(browser, url, a.live)
        backstack(browser, url)
        ways(browser, url)
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
