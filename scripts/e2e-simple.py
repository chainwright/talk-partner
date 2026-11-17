#!/usr/bin/env python3
"""Browser test of the simple view ("/"), driven as a carer would on a phone, then on a desktop and a tablet.

What is checked: the first screen is the simple one; a ready question makes a card and the screen shows the numbered
steps, "We're stuck" and where the card was made; the person's card, the tick and the answered screen; the consent
sheet comes up only for a question that needs online help, with the exact line that would go, and nothing is asked of
any other host before a yes; quick needs; About them; "See how it works inside" opens the full view, the choice is
remembered across a reload, and /#/demo is the full view whatever was chosen; the device word (phone, tablet,
computer); every control at least 24 px, every button at least 44 px, the main button at least 60 px; no page error
and no sideways overflow on any screen.

Every request that is not to the page's own host is refused (and counted), so no model answers and nothing reaches
Firebase: after the "yes" on the sheet the cloud step fails, and the screen must then say that the question may have
left. With --live (a hosted copy) the "yes" is not pressed at all, so the test sends nothing.

Usage: npm run dev (in another shell), then
  python3 scripts/e2e-simple.py [--url http://localhost:5179/] [--live]
Exit code 0 when every check passes, 1 otherwise.
"""
import argparse
import sys
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright

PHONE_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36'
TABLET_UA = 'Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36'
OPEN_Q = 'What do you want to do this weekend?'

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


def phone(browser, url, live):
    host = urlparse(url).hostname
    ctx = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True, user_agent=PHONE_UA)
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

    page.goto(url)
    page.wait_for_selector('#app > *')
    check('"/" on a first visit is the simple first screen, not the first-run page and not judge mode', page.locator('main.simple.home').count() == 1 and page.locator('main.welcome, .layout').count() == 0)
    check('the simple view carries its own look (data-view="simple")', page.evaluate('document.documentElement.dataset.view') == 'simple')
    page.wait_for_timeout(7000)  # the device check is asked again after 2 s and 6 s
    home = text(page)
    check('first screen: one sentence of purpose, the field, "Make a card", three ready questions, quick needs', all(s in home for s in ['Ask a question. Get a card they can point to.', 'Make a card', 'Do you want coffee or tea?', 'Are you in pain?', OPEN_Q, 'Quick needs']), home[:200])
    check('first screen, on a phone: says "this phone" and never "this computer"', 'Nothing you asked has left this phone.' in home and 'this computer' not in home, home[-400:])
    check('first screen: where the AI runs is said in one line (rules on this phone; open questions need online help, asked first)', 'Open questions need online help, and the app asks you first.' in home and "On a computer with Chrome's built-in AI" in home)
    check('first screen: the open ready question says it needs online help', 'Needs online help: the app asks you first' in text(page, '.try'))
    check('first screen: "See how it works inside" is on it', page.locator('[data-act=inside]').is_visible())
    check('first screen: nothing technical (no status box, badge, byte count or judge mode)', page.locator('#status, .badge, #bytes, .judge').count() == 0)
    screen_checks(page, 'first screen')

    # a ready question -> the card is ready
    page.locator('.try .ready', has_text='coffee or tea').click()
    page.wait_for_selector('main.simple.card #made-where')
    card = text(page)
    steps = [''.join(x.split()) for x in page.locator('.steplabel').all_inner_texts()]
    check('card ready: "1 Say this out loud" with the line, then "2 Show them the card" with the card and the main button',
          steps == ['1Saythisoutloud', '2Showthemthecard'] and 'Do you want coffee or tea? Coffee, tea, or something else?' in card
          and page.locator('#person .tile').count() == 3 and page.locator('.btn.primary[data-act=show]').inner_text().strip() == 'Show them the card', f'{steps} {card[:200]}')
    check("card ready: \"We're stuck\" is on this screen, before any answer", page.locator('button[data-act=stuck]').is_visible())
    made = page.locator('#made-where')
    check('card ready: the screen itself says where the card was made (rules on this phone, no AI, nothing sent)',
          made.get_attribute('data-maker') == 'code' and made.get_attribute('data-left') == 'nothing' and "Made by the app's rules on this phone. No AI used. Nothing was sent." in text(page, '#made-where'), text(page, '#made-where'))
    check('card ready: "How was this card made?" leads inside', page.locator('[data-act=inside-card]').is_visible())
    screen_checks(page, 'card ready')
    page.locator('button[data-act=stuck]').click()
    page.wait_for_selector('#person .tiles.repair')
    check("We're stuck, pressed before any answer: the repair card is up, with the way back to the choices", page.locator('button[data-act=unstuck]').is_visible() and 'another way' in text(page, '#person'))
    screen_checks(page, "the repair card")
    page.locator('button[data-act=unstuck]').click()
    page.wait_for_selector('#person .tile >> text=tea')

    # show the person, they choose and confirm
    page.locator('[data-act=show]').click()
    page.wait_for_selector('main.person.full .tile')
    check("the person's card takes the whole screen, white, with three tiles", page.url.endswith('#/person') and page.locator('main.person.full .tile').count() == 3 and page.evaluate('document.documentElement.dataset.view') == 'person')
    screen_checks(page, "the person's card", primary=False)
    page.locator('#person .tile', has_text='tea').click()
    page.wait_for_selector('[data-confirm=yes]')
    page.locator('[data-confirm=yes]').click()
    page.wait_for_selector('.answered')
    hold_exit(page)
    page.wait_for_selector('main.simple.s-answered', timeout=4000)
    done = text(page)
    check('answered: "They chose and said yes to tea", "Ask another question", and today\'s answers', 'They chose and said yes to tea' in done and 'Ask another question' in done and 'Today Do you want coffee or tea? tea' in done, done[:300])
    check('answered: says the answers are kept on this phone only, and where the card was made', 'Answers are kept on this phone only.' in done and page.locator('#made-where').count() == 1)
    screen_checks(page, 'answered')

    # an open question: the sheet, and nothing asked of any other host before a yes
    page.locator('[data-act=new]').click()
    page.wait_for_selector('main.simple.home')
    before = len(outside)
    page.locator('.try .ready', has_text='this weekend').click()
    page.wait_for_selector('#sheet')
    sheet = text(page, '#sheet')
    check('an open question on a phone with online help off brings up the consent sheet (a dialog over an inert screen)',
          page.locator('#sheet[role=dialog][aria-modal=true]').count() == 1 and page.locator('main.simple[inert]').count() == 1 and page.evaluate("document.activeElement && document.activeElement.id") == 'sheet-h')
    check('the sheet shows the exact line that would go', page.locator('#sheet-line').inner_text().strip() == f'Partner asks: {OPEN_Q}', page.locator('#sheet-line').inner_text())
    check('the sheet says what is sent (the line and the fixed instructions; names can be missed), what is never sent, and the data use; never "nothing else"',
          all(s in sheet for s in ["fixed instructions", 'can be missed', 'leave out health details', 'Never sent:', 'who lives at home', "Google's free tier: Google may use what is sent", "Google's Gemini, through Firebase AI Logic", 'This phone has no AI of its own']) and 'nothing else' not in sheet.lower() and 'only the question' not in sheet.lower(), sheet)
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
        page.locator('[data-act=new]').click()
        page.wait_for_selector('main.simple.home')
        foot = text(page, '.foot')
        check('the first screen then no longer says "Nothing you asked has left this phone"; online help shows as on', 'Nothing you asked has left' not in foot and ('may have left this phone' in foot if maybe else 'No question has left this phone.' in foot) and 'Uses online help' in text(page, '.try'), foot)

    # quick needs
    page.locator('[data-act=needs]').click()
    page.wait_for_selector('main.person.full .tiles.needs')
    check('quick needs: one tap opens the board full screen, nine tiles', page.url.endswith('#/needs') and page.locator('#person .tile').count() == 9)
    screen_checks(page, 'quick needs board', primary=False)
    hold_exit(page)
    page.wait_for_selector('main.simple.card')
    check('back from the board: the card screen, made by rules, nothing sent', page.locator('#made-where').get_attribute('data-maker') == 'code' and page.locator('#person .tiles.needs').count() == 1)
    screen_checks(page, 'quick needs, partner side')

    # About them
    page.locator('[data-act=new]').click()
    page.locator('a.offer').click()
    page.wait_for_selector('main.about-simple')
    about = text(page)
    check('About them: four rows, "Everything here stays on this phone.", nothing required', page.locator('.rowhead').count() == 4 and 'Everything here stays on this phone.' in about and page.locator('input').count() == 0, about[:200])
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
    check('About them: the rows show what was typed', 'Frank · Carol' in text(page) and 'Jenny (daughter)' in text(page), text(page)[:300])
    page.locator('a.btn.primary').click()
    page.wait_for_selector('main.simple.home')
    check('the first screen now names the person ("with Frank", "About Frank")', 'with Frank' in text(page) and 'About Frank' in text(page))
    page.locator('.try .ready', has_text='coffee or tea').click()
    page.wait_for_selector('main.simple.card #made-where')
    check('the card screen names the person: "Show Frank the card"', text(page).count('Show Frank the card') == 2)

    # inside, and back; remembered
    page.locator('[data-act=inside-card]').click()
    page.wait_for_selector('.layout #made')
    check('"How was this card made?" opens the full view on the same card, its fold open', page.evaluate("document.querySelector('#made').open") is True and page.locator('#result .badge').count() == 1 and page.evaluate('document.documentElement.dataset.view') == 'full')
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
    page.reload()
    page.wait_for_selector('#app > *')
    check('"Simple view" goes back, and that is remembered too; About them is kept', page.locator('main.simple.home').count() == 1 and 'with Frank' in text(page))

    # judge mode by its address
    page.goto(url + '#/demo')
    page.wait_for_selector('#result > .badge-line')
    check('/#/demo opens the full judge view directly, whatever view was chosen', page.locator('.layout').count() == 1 and page.locator('.chipgroups').count() == 1 and 'Leave judge mode' in text(page, '.top'))
    page.locator('.top nav .pill').click()
    page.wait_for_selector('main.simple.home')
    check('"Simple view" in judge mode leaves it: the simple first screen, with the family\'s own About them', 'with Frank' in text(page))
    page.goto(url + '#/welcome')
    page.wait_for_selector('main.welcome')
    check('the first-run page is still there by its address', True)

    check('phone: no page error in the whole run', not errors, '; '.join(errors))
    ctx.close()


def words(browser, url, ua, word, label, width, height):
    host = urlparse(url).hostname
    ctx = browser.new_context(viewport={'width': width, 'height': height}, **({'user_agent': ua} if ua else {}))
    ctx.route('**/*', lambda r: r.continue_() if urlparse(r.request.url).hostname in (host, None) or r.request.url.startswith(('data:', 'blob:')) else r.abort())
    page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(url)
    page.wait_for_selector('main.simple.home')
    page.wait_for_timeout(7000)
    home = text(page)
    others = [w for w in ('phone', 'tablet', 'computer') if w != word]
    check(f'{label}: the first screen says "this {word}"', f'Nothing you asked has left this {word}.' in home and not any(f'this {o}' in home for o in others), home[-300:])
    page.locator('.try .ready', has_text='coffee or tea').click()
    page.wait_for_selector('#made-where')
    check(f'{label}: the card says "Made by the app\'s rules on this {word}"', f"Made by the app's rules on this {word}." in text(page, '#made-where'))
    screen_checks(page, f'{label}, card ready')
    page.locator('[data-act=new]').click()
    page.locator('.try .ready', has_text='this weekend').click()
    page.wait_for_selector('#sheet, #made-where')
    if page.locator('#sheet').count():
        check(f'{label}: the sheet says "This {word} has no AI of its own"', f'This {word} has no AI of its own' in text(page, '#sheet'))
        b = page.locator('[data-act=sheet-no]').bounding_box()
        check(f'{label}: the sheet\'s two buttons are on the screen', b['y'] + b['height'] <= height, str(b))
        page.locator('[data-act=sheet-no]').click()
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
    a = ap.parse_args()
    url = a.url if a.url.endswith('/') else a.url + '/'
    print(f'url: {url}')
    with sync_playwright() as p:
        browser = p.chromium.launch()
        print(f'browser: Chromium {browser.version} (headless)')
        phone(browser, url, a.live)
        words(browser, url, None, 'computer', 'desktop, 1440 x 900', 1440, 900)
        words(browser, url, TABLET_UA, 'tablet', 'tablet, 800 x 1280', 800, 1280)
        browser.close()
    bad = results.count(False)
    print(f'\n{len(results) - bad} of {len(results)} checks passed')
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
