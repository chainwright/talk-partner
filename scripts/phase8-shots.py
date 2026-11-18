#!/usr/bin/env python3
"""Phase 8 (18-19 Nov 2026, the fixes of judge round 7): the changed screens at 390 x 844, as Carol on a phone, with
checks. Rules only, against a production build (--url): every request to another host is refused and counted.

  python3 scripts/phase8-shots.py --url http://localhost:5241/ --out devlog/evidence_phase8
  add --cloud-url http://localhost:5243/ (the dev server, which has the App Check debug token) for the one screen made
  by online help: the routing chip "Made online, after your yes". That run sends the typed question to Google.
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


def check(name, ok, detail=''):
    results.append(bool(ok))
    print(f"{'PASS' if ok else 'FAIL'}  {name}{f'  ({detail})' if detail and not ok else ''}")


def shot(page, name, full=True):
    page.wait_for_timeout(250)
    page.screenshot(path=os.path.join(OUT, f'{name}.png'), full_page=full)


def phone(browser, url, outside):
    host = urlparse(url).hostname
    ctx = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True, user_agent=e2e.PHONE_UA, service_workers='block')
    ctx.route('**/*', lambda r: r.continue_() if urlparse(r.request.url).hostname in (host, None) or r.request.url.startswith(('data:', 'blob:')) else (outside.append(r.request.url), r.abort()))
    return ctx


def rules(browser, url):
    outside = []
    ctx = phone(browser, url, outside)
    page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('dialog', lambda d: d.accept())
    page.goto(url)
    page.wait_for_selector('main.simple.home')
    week = json.load(open(e2e.FIXTURE_WEEK))
    profile, photos = e2e.miller_p4()
    health = dict(week['health'])
    health['emergency'] = ''  # the passport with no number set; the call buttons then use 911
    page.evaluate(e2e.KV_PUT, {'profile': profile, 'photos': photos, 'health': health, 'settings': {'cloudHelp': False, 'support': 'more', 'welcomed': False, 'firstCard': True, 'howFolded': True}})
    page.reload()
    page.wait_for_selector('main.simple.home')
    home = e2e.text(page)
    check('Home: "Needs something now?"; the red card: "Signs of a new stroke, chest pain, a fall: call."', 'Needs something now?' in home and 'Signs of a new stroke, chest pain, a fall: call.' in home, home[:300])
    check('Home after the first card: the 4 steps are one line, with "Write the key word big."', page.locator('button.how-line').count() == 1 and 'Write the key word big.' in e2e.text(page, '#how'))
    for w, h in ((360, 740), (390, 844)):
        page.set_viewport_size({'width': w, 'height': h})
        page.wait_for_timeout(200)
        bottom = page.evaluate("Math.round([...document.querySelectorAll('.topic')][1].getBoundingClientRect().bottom)")
        check(f'Home at {w} x {h}: the first row of topics stands above the fold', bottom <= h, str(bottom))
    page.set_viewport_size({'width': 390, 'height': 844})
    shot(page, '01_home_needs_something_now_the_red_card_and_the_folded_steps', full=False)
    # "later": the tile of "We're stuck" keeps the question for Home
    e2e.ask_topic(page, 'food', 'Would you like tea or coffee?')
    page.locator('button[data-act=stuck]').click()
    page.wait_for_selector('#person .p-tiles.ways')
    page.locator('[data-act=show]').click()
    page.wait_for_selector('main.pv .pt:has-text("later")')
    e2e.tap_yes(page, 'later')
    e2e.give_back(page)
    check('"later": the carer reads the line to say', 'Later, then. We will come back to it.' in e2e.text(page))
    page.locator('[data-act=home]').first.click()
    page.wait_for_selector('main.simple.home #later')
    lat = e2e.text(page, '#later')
    check('Home: "Left for later: Would you like tea or coffee?, [time]" with "Ask it again" and "Done"', lat.startswith('Left for later: Would you like tea or coffee?,') and 'Ask it again' in lat and 'Done' in lat, lat)
    shot(page, '02_home_left_for_later', full=False)
    page.locator('[data-act=later-ask]').click()
    page.wait_for_selector('main.simple.card #made-where')
    check('"Ask it again" asks it again, and it is off Home', 'Would you like tea or coffee?' in e2e.text(page) and not page.evaluate(e2e.KV_GET, 'later'), str(page.evaluate(e2e.KV_GET, 'later')))
    page.locator('[data-act=home]').first.click()
    page.wait_for_selector('main.simple.home')
    # the visit page: Frank says "low" and yes to pain; the diary holds neither
    page.locator('a[href="#/visit"]').first.click()
    page.wait_for_selector('#visit-start')
    page.locator('#visit-start').click()
    # (the body card asks where, then where in it: the chest, then the middle; "a little" for how bad)
    for label in ['yes', 'chest', 'middle', 'a little', 'so-so', 'so-so', 'low', 'my body', 'my tablets']:
        page.wait_for_function("(l) => !document.querySelector('[data-confirm]') && [...document.querySelectorAll('main.pv .pt')].some((e) => e.innerText.trim().toLowerCase() === l)", arg=label, timeout=8000)
        page.locator('main.pv .pt').filter(has_text=label).first.click()
        if label != 'chest':
            page.wait_for_selector('[data-confirm=yes]')
            page.locator('[data-confirm=yes]').click()
    e2e.give_back(page, 'main.visit #visit-page')
    vp = e2e.text(page, '#app')
    check('visit page: with "low" and a yes to pain in Frank\'s own answers, no line says "none entered" or "no low day"', 'Pain: none entered' not in vp and 'no "sad", "bad" or "low" day' not in vp and "counting Frank's own answer above" in vp, vp[:900])
    check('visit page: under the "low" answer, the helpline line (none set: no number invented) and the emergency number', 'If Frank seems very low, or may harm themselves: call the doctor or nurse today, or a mental health helpline' in vp and 'If life is at risk, call 911 now.' in vp)
    shot(page, '03_visit_page_low_and_pain_counted_with_the_helpline_line')
    # the passport: the two fact lines off until ticked, the tired-yes line, no number set, the food line with diabetes noted
    page.locator('[data-act=home]').first.click()
    page.wait_for_selector('main.simple.home')
    page.locator('#passport-link').click()
    page.wait_for_selector('#pass-look')
    lead = e2e.text(page)
    knows = page.locator('[data-pass-line="sca:knows"]').is_checked() or page.locator('[data-pass-line="sca:understands"]').is_checked()
    check('passport: "knows what to say" and "understands most" are off, "Tick if true for Frank"', not knows and lead.count('Tick if true for Frank') == 2, lead[:600])
    check('passport: "A tired yes may not mean yes. Check it the other way. Ask about pain, drinks and the toilet every time."', 'A tired yes may not mean yes. Check it the other way. Ask about pain, drinks and the toilet every time.' in lead)
    check('passport: no number in About them: "Emergency number: not filled in, ask the family."', 'Emergency number: not filled in, ask the family.' in lead and 'Emergency number: 911' not in lead)
    check('passport: the food line with diabetes noted: "Ask the family what is all right."', 'Ask the family what is all right.' in lead)
    shot(page, '04_passport_ticks_off_tired_yes_no_number_food_line')
    page.locator('#pass-look').click()
    page.wait_for_selector('#pass-page')
    shot(page, '05_passport_as_it_prints')
    # the therapist page, box off, with a pain answer in the diary
    page.locator('[data-act=home]').first.click()
    page.wait_for_selector('main.simple.home')
    now = int(datetime.datetime.now().timestamp() * 1000)
    page.evaluate(e2e.KV_PUT, {'diary': [{'id': 'p1', 'at': now - 3600_000, 'kind': 'answer', 'q': 'Are you in pain?', 'label': 'yes', 'topic': 'body'}]})
    page.goto(url + '#/practice')
    page.reload()
    page.wait_for_selector('main.simple.practice #practice-page')
    pg = e2e.text(page, '#practice-page')
    check('therapist page, box off: "The diary of this time holds a pain answer or "something\'s wrong": ask the family." and nothing of the answer', 'The diary of this time holds a pain answer or "something\'s wrong": ask the family.' in pg and 'Are you in pain' not in pg, pg[-600:])
    check('therapist page: the "less sure" count stands beside the check', 'Answers marked "less sure" by the answer check in this time' in pg)
    shot(page, '06_for_the_speech_therapist_box_off_the_contentless_line')
    # the red card: BE-FAST
    page.goto(url + '#/sudden')
    page.wait_for_selector('main.simple.sudden')
    check('"Something new or sudden?": balance and sight (BE-FAST)', 'Sudden loss of balance, or sudden loss of sight in one or both eyes.' in e2e.text(page))
    shot(page, '07_something_new_or_sudden_be_fast')
    # "Who is it about?": "me" first
    page.goto(url)
    page.wait_for_selector('main.simple.home')
    page.locator('#turn-go').click()
    e2e.tap_yes(page, 'tell you')
    e2e.tap_yes(page, 'People')
    page.wait_for_selector('main.pv .p-ask:has-text("Who is it about?")')
    who = [t.strip().split('\n')[-1] for t in page.locator('main.pv .pt').all_inner_texts()]
    check('"Who is it about?": "me" first, then the names, and "someone else"', who[0] == 'me' and who[-1] == 'someone else' and len(who) <= 4, str(who))
    shot(page, '08_person_who_is_it_about_me_first', full=False)
    e2e.tap_yes(page, 'me')
    e2e.give_back(page, 'main.simple')
    check('the carer reads "Frank\'s own news"', "It is about: People & family, Frank's own news." in e2e.text(page), e2e.text(page)[:300])
    check('rules run: nothing was asked of any other host', not outside, str(outside[:3]))
    check('rules run: no page error', not errors, '; '.join(errors[:3]))
    ctx.close()


def cloud(browser, url):
    """The dev server (App Check debug token): a typed open question, "Just this once", and the card's routing chip."""
    ctx = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True, user_agent=e2e.PHONE_UA, service_workers='block')
    page = ctx.new_page()
    page.goto(url)
    page.wait_for_selector('main.simple.home')
    page.evaluate(e2e.KV_PUT, {'settings': {'cloudHelp': False, 'support': 'more', 'welcomed': False, 'firstCard': True, 'howFolded': True}})
    page.reload()
    page.wait_for_selector('main.simple.home')
    page.fill('#q', e2e.OPEN_Q)
    page.locator('#ask button[type=submit], #ask [data-act=make]').first.click()
    page.wait_for_selector('#sheet')
    page.locator('[data-act=sheet-yes]').click()
    page.wait_for_selector('main.simple.card #route-chip, main.simple.nocard', timeout=60000)
    chip = e2e.text(page, '#route-chip') if page.locator('#route-chip').count() else ''
    check('online help (dev server, debug token): the card carries the chip "Made online, after your yes" and why, in one line', chip.startswith('Made online, after your yes') and 'Why online: this phone has no AI of its own' in chip, chip or e2e.text(page)[:300])
    shot(page, '09_routing_chip_made_online_after_your_yes', full=False)
    ctx.close()


def main():
    global OUT
    ap = argparse.ArgumentParser()
    ap.add_argument('--url', default='http://localhost:5241/')
    ap.add_argument('--cloud-url', default=None)
    ap.add_argument('--out', default='devlog/evidence_phase8')
    a = ap.parse_args()
    OUT = a.out
    os.makedirs(OUT, exist_ok=True)
    with sync_playwright() as p:
        b = p.chromium.launch()
        print(f'browser: Chromium {b.version} (headless); {datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds")}')
        rules(b, a.url if a.url.endswith('/') else a.url + '/')
        if a.cloud_url:
            cloud(b, a.cloud_url if a.cloud_url.endswith('/') else a.cloud_url + '/')
        b.close()
    bad = results.count(False)
    print(f'\n{len(results) - bad} of {len(results)} checks passed')
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
