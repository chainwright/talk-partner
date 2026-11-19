#!/usr/bin/env python3
"""Phase 10 (19 Nov 2026): the new screens at 360 x 740 and 390 x 844, with checks, as Carol and Frank on a phone.
"His turn" (the person starts: the Home button and the home-screen shortcut's address #/turn, "I want to talk
about…" with the Miller family's people and places, the carer's line and three questions, a need through it, About
them empty, the diary's "Frank started: Beth") and About them in a file ("Keep a copy", the preview with Replace, Add
and Cancel). Rules only, against a production build (--url): every request to another host is refused and counted,
and there must be none. The web fonts are refused (`**/*.woff2`), as on a slow first load: every screen must hold
with any font. On every screen: no sideways scroll, and the top row on the screen.

  python3 scripts/phase10-shots.py --url http://localhost:5610/ --out devlog/evidence_phase10

Each new screen is left with Back, one step at a time, and every way out is followed to an action.
"""
import argparse
import datetime
import importlib.util
import json
import os
import sys
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('e2e', os.path.join(HERE, 'e2e-simple.py'))
e2e = importlib.util.module_from_spec(spec)
spec.loader.exec_module(e2e)
results = []
OUT = '.'
SIZES = ((360, 740), (390, 844))
SETTINGS = {'cloudHelp': False, 'support': 'more', 'welcomed': False, 'firstCard': True, 'howFolded': True}


def check(name, ok, detail=''):
    results.append(bool(ok))
    print(f"{'PASS' if ok else 'FAIL'}  {name}{f'  ({detail})' if detail and not ok else ''}")


def shot(page, name, full=False):
    page.wait_for_timeout(250)
    page.screenshot(path=os.path.join(OUT, f'{name}.png'), full_page=full)


GEOM = """(() => { const de = document.documentElement; const top = document.querySelector('main.pv .p-top, #app main .s-top');
  const r = top ? top.getBoundingClientRect() : null;
  return { sw: de.scrollWidth, cw: de.clientWidth, sh: de.scrollHeight, ch: de.clientHeight, top: r ? [Math.round(r.top), Math.round(r.bottom), Math.round(r.height)] : null }; })()"""


def screen(page, label, w, h, person=False, top=True):
    """Every screen: no sideways scroll, the top row on the screen (one row); a person's screen also needs no scrolling."""
    page.wait_for_timeout(300)
    g = page.evaluate(GEOM)
    check(f'{w} x {h}, {label}: no sideways scroll', g['sw'] <= g['cw'], str(g))
    if top:
        check(f'{w} x {h}, {label}: the top row is on the screen, one row high', g['top'] is not None and g['top'][0] >= 0 and g['top'][1] <= h and g['top'][2] <= 80, str(g['top']))
    if person:
        low = page.evaluate("Math.round(Math.max(0, ...[...document.querySelectorAll('#person button, #person img, #person p')].map((e) => e.getBoundingClientRect().bottom)))")
        check(f'{w} x {h}, {label}: the person\'s screen needs no scrolling ({low} px of {h})', g['sh'] <= g['ch'] and low <= h, f'{g} {low}')


def phone(browser, url, outside, w, h):
    host = urlparse(url).hostname
    ctx = browser.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2, is_mobile=True, has_touch=True, user_agent=e2e.PHONE_UA, service_workers='block')
    ctx.route('**/*', lambda r: r.continue_() if urlparse(r.request.url).hostname in (host, None) or r.request.url.startswith(('data:', 'blob:')) else (outside.append(r.request.url), r.abort()))
    # any font: the web fonts never arrive
    ctx.route('**/*.woff2', lambda r: r.abort())
    return ctx


def tiles(page):
    return [x.strip().split('\n')[-1] for x in page.locator('main.pv .pt').all_inner_texts()]


def sig(page):
    page.wait_for_timeout(250)
    return page.evaluate(e2e.SIG)


def walk_back(page, seen, label, w, h):
    """Back one step at a time (the phone's back on a person's screen, which has no Back button by design)."""
    want = list(reversed(seen[:-1]))
    got = []
    for _ in want:
        if page.locator('main.pv').count():
            page.go_back()
        else:
            page.locator('main [data-act=back]').first.click()
        got.append(sig(page))
    check(f'{w} x {h}, back, {label}: {len(want)} steps, each exactly one screen back, ending on Home', got == want and got[-1].startswith('home'), f'wanted {want} / got {got}')


def his_turn(browser, url, w, h):
    outside = []
    ctx = phone(browser, url, outside, w, h)
    page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    profile, photos = e2e.miller_p4()
    page.goto(url)
    page.wait_for_selector('main.simple.home')
    page.evaluate(e2e.KV_PUT, {'profile': profile, 'photos': photos, 'settings': SETTINGS})
    page.reload()
    page.wait_for_selector('main.simple.home #turn-go')
    tag = f'{w}x{h}'

    # Home: the button, the person's own words first
    check(f'{w} x {h}, Home: the big button reads "Frank: I want to say something"', 'Frank: I want to say something' in e2e.text(page, '#turn-go'), e2e.text(page, '#turn-go'))
    btn = page.evaluate("(() => { const r = document.querySelector('#turn-go').getBoundingClientRect(); return [Math.round(r.top), Math.round(r.height)]; })()")
    check(f'{w} x {h}, Home: the button is big (at least 60 px tall)', btn[1] >= 60, str(btn))
    screen(page, 'Home', w, h)
    page.locator('#turn-go').scroll_into_view_if_needed()
    shot(page, f'01_home_turn_button_{tag}')

    # the Back walk: Home -> the starters -> "I want to talk about…" (two screens are one step) -> Beth -> the carer
    page.evaluate('window.scrollTo(0, 0)')
    seen = [sig(page)]
    page.locator('#turn-go').click()
    page.wait_for_selector('main.pv .pt')
    check(f'{w} x {h}, the starters: "I need something", "I want to talk about…", "I feel…" and "something else"', tiles(page) == ['I need something', 'I want to talk about…', 'I feel…', 'something else'], str(tiles(page)))
    screen(page, 'the starters', w, h, person=True)
    check(f'{w} x {h}, the starters: the fixed "Not now" tile is on the screen', page.locator('main.pv #p-notnow').count() == 1)
    shot(page, f'02_person_starters_{tag}')
    seen.append(sig(page))
    e2e.tap_yes(page, 'talk about')
    page.wait_for_selector('main.pv .pt >> text=Beth')
    t1 = tiles(page)
    check(f'{w} x {h}, "I want to talk about…": "me", Beth (her photo) and Tom, and "something else"', t1 == ['me', 'Beth', 'Tom', 'something else'] and page.locator('main.pv .pt', has_text='Beth').locator('img.photo').count() == 1, str(t1))
    screen(page, '"I want to talk about…", first screen', w, h, person=True)
    shot(page, f'03_person_talk_about_people_{tag}')
    seen.append(sig(page))
    page.locator('main.pv .pt.esc').click()
    page.wait_for_selector('main.pv .pt >> text=church')
    t2 = tiles(page)
    check(f'{w} x {h}, "I want to talk about…", next screen: the lake (its photo), church, the news / TV, "something else"', t2 == ['the lake', 'church', 'the news / TV', 'something else'] and page.locator('main.pv .pt', has_text='the lake').locator('img.photo').count() == 1, str(t2))
    screen(page, '"I want to talk about…", second screen', w, h, person=True)
    shot(page, f'04_person_talk_about_places_{tag}')
    # its way out: the topics (phase 4), then the real way out
    page.locator('main.pv .pt.esc').click()
    page.wait_for_selector('main.pv .pt >> text=People & family')
    screen(page, 'the topics after "something else"', w, h, person=True)
    shot(page, f'05_person_topics_after_something_else_{tag}')
    # back to the first talk screen is the same step: a page turn is not a step of the carer's (phase 8)
    page.go_back()
    page.wait_for_selector('main.pv .pt')
    check(f'{w} x {h}, back from the topics: one step, to the starters (the talk screens and the topics are one card)', tiles(page)[:2] == ['I need something', 'I want to talk about…'], str(tiles(page)))
    e2e.tap_yes(page, 'talk about')
    page.wait_for_selector('main.pv .pt >> text=Beth')
    page.locator('main.pv .pt', has_text='Beth').first.click()
    page.wait_for_selector('[data-confirm=yes]')
    # (the check has no top row of its own: "Yes" and "No, something else" are all there is to press)
    screen(page, 'the check "So: Beth. Right?"', w, h, person=True, top=False)
    shot(page, f'06_person_check_beth_{tag}')
    page.locator('[data-confirm=yes]').click()
    e2e.give_back(page)
    lead = e2e.text(page, '#turn-lead')
    asks = e2e.nexts(page)
    check(f'{w} x {h}, the carer reads "Frank wants to talk about Beth." first, over the answer', lead == 'Frank wants to talk about Beth.' and e2e.ys(page, '#turn-lead')[0][1] < e2e.ys(page, '#chose')[0][1], lead)
    check(f'{w} x {h}, three easy questions to ask next: the telling first, a call last', asks == ['Is it good news, or a worry?', "Is it about Beth's visit?", 'Would you like to call Beth?'], str(asks))
    check(f'{w} x {h}, the carer\'s screen never says "patient"', 'patient' not in e2e.text(page).lower())
    check(f'{w} x {h}, nothing was sent ("Nothing was sent." stays on the screen)', page.locator('#left-line').get_attribute('data-left') == 'nothing')
    screen(page, 'the carer after Beth', w, h)
    shot(page, f'07_carer_frank_wants_to_talk_about_beth_{tag}', full=True)
    seen.append(sig(page))
    walk_back(page, seen, '"I want to talk about…" Beth', w, h)

    # every way on is followed to an action: the call
    page.locator('#turn-go').click()
    e2e.tap_yes(page, 'talk about')
    e2e.tap_yes(page, 'Beth')
    e2e.give_back(page)
    page.locator('main.s-answered [data-next][data-q="Would you like to call Beth?"]').click()
    page.wait_for_selector('main.simple.card #made-where')
    check(f'{w} x {h}, "Would you like to call Beth?" is a card the rules make', page.locator('#made-where').get_attribute('data-maker') == 'code')
    page.locator('[data-act=show]').click()
    e2e.tap_yes(page, 'yes')
    e2e.give_back(page)
    check(f'{w} x {h}, ... "yes" ends on an action: "Call Beth now, together."', 'Call Beth now, together.' in e2e.text(page, '#do-now'), e2e.text(page)[:300])
    shot(page, f'08_carer_call_beth_now_{tag}')
    # and the visit question: yes leads on to "Did something happen?"
    page.locator('[data-act=home]').click()
    page.locator('#turn-go').click()
    e2e.tap_yes(page, 'talk about')
    e2e.tap_yes(page, 'Beth')
    e2e.give_back(page)
    page.locator('main.s-answered [data-next][data-q="Is it about Beth\'s visit?"]').click()
    page.wait_for_selector('main.simple.card #made-where')
    page.locator('[data-act=show]').click()
    e2e.tap_yes(page, 'yes')
    e2e.give_back(page)
    check(f'{w} x {h}, "Is it about Beth\'s visit?" -> yes -> next: "Did something happen?"', e2e.nexts(page)[:1] == ['Did something happen?'], str(e2e.nexts(page)))

    # the lake and the news: the line and the questions; the news followed to an action
    for pick, line, first in (('the lake', 'Frank wants to talk about the lake.', 'Did something happen at the lake?'), ('the news / TV', 'Frank wants to talk about the news, or something on TV.', 'Is it the news, or something on TV?')):
        page.locator('[data-act=home]').click()
        page.locator('#turn-go').click()
        e2e.tap_yes(page, 'talk about')
        page.wait_for_selector('main.pv .pt >> text=Beth')
        page.locator('main.pv .pt.esc').click()
        page.wait_for_selector('main.pv .pt >> text=church')
        e2e.tap_yes(page, pick)
        e2e.give_back(page)
        check(f'{w} x {h}, {pick}: "{line}", first question "{first}"', e2e.text(page, '#turn-lead') == line and e2e.nexts(page)[:1] == [first], f'{e2e.text(page, "#turn-lead")} {e2e.nexts(page)}')
    shot(page, f'09_carer_news_tv_{tag}')
    page.locator('#next-q').click()
    page.wait_for_selector('main.simple.card #made-where')
    page.locator('[data-act=show]').click()
    e2e.tap_yes(page, 'news')
    e2e.give_back(page)
    check(f'{w} x {h}, "Is it the news, or something on TV?" -> news ends on an action: "The news. Put it on, or find the story …"', 'The news. Put it on, or find the story' in e2e.text(page, '#do-now') or e2e.nexts(page)[:1] == ['Is it good news, or a worry?'], f'{e2e.nexts(page)} {e2e.text(page)[:300]}')

    # worst case: a need through "His turn" is never weaker than through the needs board
    def carer_after_pain(via_turn):
        page.locator('[data-act=home]').click()
        page.wait_for_selector('main.simple.home')
        if via_turn:
            page.locator('#turn-go').click()
            e2e.tap_yes(page, 'I need something')
        else:
            page.locator('[data-act=needs]').first.click()
        page.wait_for_selector('main.pv[data-kind=needs] .pt')
        e2e.tap_yes(page, 'pain')
        e2e.give_back(page)
        return page.evaluate("(() => { const m = document.querySelector('#app main').cloneNode(true); m.querySelector('#turn-lead')?.remove(); return m.innerText.replace(/\\s+/g, ' ').trim(); })()")
    board = carer_after_pain(False)
    turn = carer_after_pain(True)
    check(f'{w} x {h}, worst case: pain through "I need something" gives the carer the same screen as pain on the needs board (and the line who started)', board == turn and 'Where does it hurt?' in turn and e2e.text(page, '#turn-lead') == 'Frank started this: something is needed.', f'{board[:200]} /// {turn[:200]}')
    screen(page, 'the carer after a need through "His turn"', w, h)
    shot(page, f'10_carer_pain_through_his_turn_{tag}')

    # the diary: "Frank started: Beth"
    page.goto(url + '#/diary')
    page.wait_for_selector('main.diary')
    page.wait_for_timeout(300)
    started = page.evaluate("[...document.querySelectorAll('li.de.started')].map((e) => e.innerText.replace(/\\s+/g, ' ').trim())")
    check(f'{w} x {h}, the diary: "Frank started: Beth", "Frank started: the lake", "Frank started: the news / TV"', any(s.endswith('Frank started: Beth') for s in started) and any(s.endswith('Frank started: the lake') for s in started) and any(s.endswith('Frank started: the news / TV') for s in started) and not any('less sure' in s for s in started), str(started))
    needs = page.locator('li.de.need', has_text='pain').count()
    check(f'{w} x {h}, the diary: both pains are there as needs, each its own entry', needs == 2, str(needs))
    screen(page, 'the diary', w, h)
    page.locator('li.de.started').first.scroll_into_view_if_needed()
    shot(page, f'11_diary_frank_started_{tag}')

    # the home-screen shortcut's address: the person's own start, by itself
    page.goto(url + '#/turn')
    page.wait_for_selector('main.pv .pt')
    check(f'{w} x {h}, the shortcut\'s address #/turn opens the starters, and the address becomes the person\'s screen', tiles(page)[:3] == ['I need something', 'I want to talk about…', 'I feel…'] and page.evaluate('location.hash') == '#/person', page.evaluate('location.hash'))
    shot(page, f'12_shortcut_turn_address_{tag}')
    page.go_back()
    page.wait_for_selector('main.simple')
    check(f'{w} x {h}, Back from the shortcut\'s screen leaves it (to the carer\'s side)', page.locator('main.pv').count() == 0)
    check(f'{w} x {h}, his turn: nothing asked of another host', not outside, str(outside))
    check(f'{w} x {h}, his turn: no page error', not errors, '; '.join(errors))
    ctx.close()


def empty_about(browser, url, w, h):
    """About them empty: no people or places row; the screen still works with two real choices."""
    outside = []
    ctx = phone(browser, url, outside, w, h)
    page = ctx.new_page()
    page.goto(url)
    page.wait_for_selector('main.simple.home')
    page.evaluate(e2e.KV_PUT, {'settings': SETTINGS})
    page.reload()
    page.wait_for_selector('main.simple.home #turn-go')
    check(f'{w} x {h}, no name: the button reads "I want to say something"', e2e.text(page, '#turn-go').startswith('I want to say something'), e2e.text(page, '#turn-go'))
    page.locator('#turn-go').click()
    e2e.tap_yes(page, 'talk about')
    page.wait_for_selector('main.pv .pt >> text=the news')
    t = tiles(page)
    check(f'{w} x {h}, About them empty: "me" and "the news / TV" and "something else", no people or places', t == ['me', 'the news / TV', 'something else'], str(t))
    screen(page, '"I want to talk about…" with About them empty', w, h, person=True)
    shot(page, f'13_person_talk_about_empty_{tag(w, h)}')
    e2e.tap_yes(page, 'me')
    e2e.give_back(page)
    check(f'{w} x {h}, "me": "They want to talk about their own news." with the telling questions', e2e.text(page, '#turn-lead') == 'They want to talk about their own news.' and e2e.nexts(page) == ['Is it good news, or a worry?', 'Did something happen?', 'Do you want to tell me now or later?'], f'{e2e.text(page, "#turn-lead")} {e2e.nexts(page)}')
    check(f'{w} x {h}, About them empty: nothing asked of another host', not outside, str(outside))
    ctx.close()


def tag(w, h):
    return f'{w}x{h}'


def keep_a_copy(browser, url, w, h):
    """About them in a file: the block with "Include health notes" off, the preview with Replace, Add and Cancel."""
    outside = []
    ctx = phone(browser, url, outside, w, h)
    page = ctx.new_page()
    profile, photos = e2e.miller_p4()
    page.goto(url)
    page.wait_for_selector('main.simple.home')
    page.evaluate(e2e.KV_PUT, {'profile': profile, 'photos': photos, 'settings': SETTINGS, 'health': {'text': 'Type 2 diabetes, diet only.', 'diabetes': True, 'swallowing': False, 'fluidLimit': False, 'reminders': False, 'emergency': ''}})
    page.reload()
    page.wait_for_selector('main.simple.home')
    # (the carer's way in: the link on Home)
    page.locator('a.tlink[href="#/about"]').click()
    page.wait_for_selector('main.about-simple #backup')
    check(f'{w} x {h}, About them is the Miller family\'s (the seed is read)', 'About Frank' in e2e.text(page, 'h1'), e2e.text(page, 'h1'))
    screen(page, 'About them, at the top', w, h)
    page.locator('#backup').scroll_into_view_if_needed()
    check(f'{w} x {h}, "Keep a copy": the use line, "Include health notes" unticked, Save and Load', "second carer's phone" in e2e.text(page, '#backup-use') and not page.locator('#backup-health').is_checked() and page.locator('#backup-save').count() == 1 and page.locator('#backup-load').count() == 1)
    screen(page, '"Keep a copy"', w, h, top=False)
    shot(page, f'14_keep_a_copy_{tag(w, h)}')
    with page.expect_download() as dl:
        page.locator('#backup-save').click()
    data = json.load(open(dl.value.path()))
    check(f'{w} x {h}, the file by default: the family, and no health notes', data['profile'] == profile and len(data['photos']) == len(photos) and 'health' not in data and 'diabetes' not in json.dumps(data).lower())
    page.locator('#backup-file').set_input_files(dl.value.path())
    page.wait_for_selector('#import-sheet')
    check(f'{w} x {h}, the preview: "This file has:" and Replace, Add, Cancel', 'This file has:' in e2e.text(page, '#import-sheet') and [b.strip() for b in page.locator('#import-sheet .choice .btn').all_inner_texts()] == ['Replace what is here', 'Add to what is here', 'Cancel'])
    g = page.evaluate(GEOM)
    btns = page.evaluate("[...document.querySelectorAll('#import-sheet .choice .btn')].map((e) => Math.round(e.getBoundingClientRect().bottom))")
    check(f'{w} x {h}, the preview: no sideways scroll, and its three buttons on the screen', g['sw'] <= g['cw'] and max(btns) <= h, f'{g} {btns}')
    shot(page, f'15_load_preview_replace_add_cancel_{tag(w, h)}')
    page.go_back()
    page.wait_for_timeout(300)
    check(f'{w} x {h}, the phone\'s Back closes the preview, one step, still on About them, and nothing changed', page.locator('#import-sheet').count() == 0 and page.locator('main.about-simple').count() == 1 and page.evaluate(e2e.KV_GET, 'profile') == profile and page.locator('#backup-done').count() == 0)
    page.locator('#backup-file').set_input_files(dl.value.path())
    page.wait_for_selector('#import-sheet')
    page.keyboard.press('Escape')
    page.wait_for_timeout(200)
    check(f'{w} x {h}, Escape closes it too, and nothing changed', page.locator('#import-sheet').count() == 0 and page.evaluate(e2e.KV_GET, 'profile') == profile)
    page.locator('#backup-file').set_input_files(dl.value.path())
    page.wait_for_selector('#import-sheet')
    page.locator('[data-act=import-add]').click()
    page.wait_for_selector('#backup-done')
    page.wait_for_timeout(300)
    got = page.evaluate(e2e.KV_GET, 'profile')
    check(f'{w} x {h}, "Add to what is here" with the same file: the screen says so, and nothing doubles', 'was added to About them' in e2e.text(page, '#backup-done') and got == profile and len(page.evaluate(e2e.KV_GET, 'photos')) == len(photos), f'{e2e.text(page, "#backup-done")} {json.dumps(got)[:300]} /// {json.dumps(profile)[:300]}')
    check(f'{w} x {h}, "Keep a copy": nothing asked of another host', not outside, str(outside))
    ctx.close()


def main():
    global OUT
    ap = argparse.ArgumentParser()
    ap.add_argument('--url', default='http://localhost:5610/')
    ap.add_argument('--out', default='devlog/evidence_phase10')
    a = ap.parse_args()
    url = a.url.rstrip('/') + '/'
    OUT = os.path.join(a.out, 'shots')
    os.makedirs(OUT, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for w, h in SIZES:
            his_turn(browser, url, w, h)
            empty_about(browser, url, w, h)
            keep_a_copy(browser, url, w, h)
        browser.close()
    n = len(results)
    ok = sum(results)
    print(f'\n{ok} of {n} checks passed  ({datetime.datetime.now(datetime.timezone.utc):%Y-%m-%dT%H:%M:%SZ}, {url})')
    sys.exit(0 if ok == n else 1)


if __name__ == '__main__':
    main()
