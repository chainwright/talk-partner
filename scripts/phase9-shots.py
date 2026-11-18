#!/usr/bin/env python3
"""Phase 9 (18 Nov 2026, the fixes of judge round 8): the changed screens at 390 x 844, as Carol on a phone, with
checks. Rules only, against a production build (--url): every request to another host is refused and counted, so
nothing is sent; for the slow cloud wait, the requests to Google are held (never answered, never let through).

  python3 scripts/phase9-shots.py --url http://localhost:5495/ --out devlog/evidence_phase9

Each new screen is left with Back, one step at a time, and every way out is followed to an action.
"""
import argparse
import datetime
import importlib.util
import json
import os
import sys
import time
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


def phone(browser, url, outside, w=390, h=844, locale='en-US', hold=False):
    host = urlparse(url).hostname
    ctx = browser.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2, is_mobile=True, has_touch=True, user_agent=e2e.PHONE_UA, service_workers='block', locale=locale)
    held = []

    def route(r):
        u = r.request.url
        if urlparse(u).hostname in (host, None) or u.startswith(('data:', 'blob:')):
            r.continue_()
        elif hold:
            # held: never answered and never let through, as a network that hangs (the request is counted, nothing leaves)
            held.append(u)
        else:
            outside.append(u)
            r.abort()
    ctx.route('**/*', route)
    return ctx, held


def back(page):
    page.locator('[data-act=back]').first.click()
    page.wait_for_timeout(300)


def fold(browser, url):
    """Item 10: the first visit, cold: the 4 steps folded, and the first row of topics above the fold."""
    for w, h in ((360, 740), (390, 844)):
        outside = []
        ctx, _ = phone(browser, url, outside, w, h)
        page = ctx.new_page()
        page.goto(url)
        page.wait_for_selector('main.simple.home')
        page.wait_for_timeout(1500)
        how = page.locator('button.how-line').count() == 1 and page.locator('section.how').count() == 0
        check(f'{w} x {h}, first visit: the 4 steps are one line, with "Write the key word big."', how and 'Write the key word big.' in e2e.text(page, '#how'), e2e.text(page, '#how'))
        row = page.evaluate("(() => { const t = [...document.querySelectorAll('.topic')].slice(0, 2).map((e) => e.getBoundingClientRect()); return t.length ? Math.round(Math.max(...t.map((r) => r.bottom))) : 9999; })()")
        check(f'{w} x {h}, first visit: the first row of topics ends above the fold ({row} px of {h})', row <= h, str(row))
        shot(page, f'01_first_visit_{w}x{h}', full=False)
        check(f'{w} x {h}: nothing asked of another host', not outside, str(outside))
        ctx.close()


def later_and_notnow(browser, url):
    """Items 1 and 9: a pain question left for later 30 h ago, pinned; Done asks first; the person's own "Not now"."""
    outside = []
    ctx, _ = phone(browser, url, outside)
    page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(url)
    page.wait_for_selector('main.simple.home')
    now = int(time.time() * 1000)
    page.evaluate(e2e.KV_PUT, {'later': [{'q': 'Are you in pain?', 'at': now - 30 * 3600 * 1000}, {'q': 'Shall we go out?', 'at': now - 30 * 3600 * 1000}], 'settings': {'cloudHelp': False, 'support': 'more', 'welcomed': False, 'firstCard': True, 'howFolded': True}})
    page.reload()
    page.wait_for_selector('main.simple.home #later')
    items = page.evaluate("[...document.querySelectorAll('#later .later-item')].map((e) => e.innerText.replace(/\\s+/g, ' ').trim())")
    check('Home: the pain question left 30 h ago is still there, pinned; the ordinary one of the same age is gone', len(items) == 1 and items[0].startswith('Left for later: Are you in pain?'), str(items))
    check('Home: under it, "If the pain is new or strong, don\'t wait: call the nurse or doctor."', "If the pain is new or strong, don't wait: call the nurse or doctor." in e2e.text(page, '#later'))
    shot(page, '02_home_pain_left_for_later')
    page.locator('#later [data-act=later-done]').click()
    page.wait_for_selector('#later [data-act=later-notyet]')
    check('"Done" asks "Did you find out?" with Yes and Not yet', 'Did you find out?' in e2e.text(page, '#later'))
    shot(page, '03_home_did_you_find_out')
    page.locator('#later [data-act=later-notyet]').click()
    page.wait_for_timeout(300)
    check('"Not yet" keeps it, with "Ask it again" and "Done"', page.locator('#later [data-act=later-ask]').count() == 1 and 'Are you in pain?' in e2e.text(page, '#later'))
    page.reload()
    page.wait_for_selector('main.simple.home #later')
    check('and after a reload it is still there', 'Are you in pain?' in e2e.text(page, '#later'))
    page.locator('#later [data-act=later-ask]').click()
    page.wait_for_selector('main.simple.card')
    check('"Ask it again" opens the question for the carer', 'Are you in pain?' in e2e.text(page), e2e.text(page)[:200])
    # the person's own "Not now" on that question
    page.locator('[data-act=show]').click()
    page.wait_for_selector('main.pv .pt')
    check('the person\'s screen has the small "Not now" at its foot', page.locator('main.pv #p-notnow').count() == 1 and page.locator('main.pv #p-notnow').inner_text().strip() == 'Not now')
    e2e.fits(page, 'the person\'s screen with "Not now"')
    shot(page, '04_person_not_now', full=False)
    page.locator('main.pv #p-notnow').click()
    page.wait_for_selector('main.simple.home')
    check('"Not now" ends the card: the carer is on Home and reads that it is kept', 'chose "Not now". The question is kept on Home, under "Left for later".' in e2e.text(page, '#not-now'), e2e.text(page)[:300])
    check('the pain question is pinned again, with the "don\'t wait" line', 'Are you in pain?' in e2e.text(page, '#later') and "don't wait" in e2e.text(page, '#later'))
    shot(page, '05_home_after_not_now')
    # the diary holds it as "left for later"
    page.goto(url + '#/diary')
    page.wait_for_selector('main.simple.diary')
    check('the diary\'s timeline holds "Left for later: Are you in pain?"', 'Left for later: Are you in pain?' in e2e.text(page, '#timeline'), e2e.text(page, '#timeline')[:300])
    shot(page, '06_diary_left_for_later')
    back(page)
    check('Back from the diary: one step, to Home', page.locator('main.simple.home').count() == 1)
    # Done -> Yes takes it off
    page.locator('#later [data-act=later-done]').click()
    page.wait_for_selector('#later [data-act=later-found]')
    page.locator('#later [data-act=later-found]').click()
    page.wait_for_timeout(300)
    check('"Done" then "Yes" takes it off Home', page.locator('#later').count() == 0)
    check('items 1 and 9: nothing asked of another host', not outside, str(outside))
    check('items 1 and 9: no page error', not errors, '; '.join(errors))
    ctx.close()


def insights_visit_number(browser, url):
    """Items 2, 4, 5: pain on 2 days in "What stands out", the visit page's new lines, the handover note, 999 for en-GB."""
    outside = []
    ctx, _ = phone(browser, url, outside, locale='en-GB')
    page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(url)
    page.wait_for_selector('main.simple.home')
    today = datetime.date.today()
    at = lambda d, h: int(datetime.datetime.combine(today - datetime.timedelta(days=d), datetime.time(h, 0)).timestamp() * 1000)
    diary = []
    for d in range(0, 5):
        for k, h in (('drank', 8), ('drank', 12), ('drank', 16), ('ate', 9)):
            diary.append({'id': f'x{d}{h}{k}', 'at': at(d, h), 'kind': 'log', 'log': k, 'label': k, 'topic': 'food'})
    diary.append({'id': 'p1', 'at': at(1, 10), 'kind': 'answer', 'q': 'Are you in pain?', 'label': 'yes', 'topic': 'body'})
    diary.append({'id': 'p3', 'at': at(3, 10), 'kind': 'answer', 'q': 'Are you in pain?', 'label': 'yes', 'topic': 'body'})
    diary.append({'id': 't1', 'at': at(1, 11), 'kind': 'log', 'log': 'toilet', 'label': 'toilet', 'topic': 'body'})
    diary.append({'id': 'm1', 'at': at(1, 7), 'kind': 'log', 'log': 'tablets', 'label': 'tablets', 'topic': 'body'})
    health = {'text': '', 'diabetes': False, 'swallowing': True, 'fluidLimit': True, 'reminders': False, 'emergency': ''}
    page.evaluate(e2e.KV_PUT, {'diary': diary, 'health': health, 'profile': {'personName': 'Frank', 'partnerName': 'Carol', 'people': [], 'foods': [], 'places': [], 'tv': [], 'music': [], 'other': []}, 'settings': {'cloudHelp': False, 'support': 'more', 'welcomed': False, 'firstCard': True, 'howFolded': True}})
    page.goto(url + '#/diary')
    page.wait_for_selector('main.simple.diary')
    page.reload()
    page.wait_for_selector('main.simple.diary')
    page.locator('#tab-week').click()
    page.wait_for_timeout(400)
    ins = e2e.text(page, '#insights')
    check('item 2: "What stands out" with a yes to pain on 2 days: its own line, never "Nothing stands out"', 'Pain was chosen or logged on 2 days in the last 7 days.' in ins and 'Ask again today, and tell the doctor or nurse if it is new or still there.' in ins and 'Nothing stands out' not in ins, ins[:400])
    shot(page, '07_diary_week_pain_two_days')
    # the handover note with the box off: the swallowing and the fluid limit are on it
    page.locator('#share-handover').click()
    page.wait_for_selector('#share-sheet')
    note = page.evaluate("document.querySelector('#share-text').textContent")
    check('item 5: the handover note, box off: "ALWAYS ON THIS NOTE" with the swallowing difficulty and the fluid limit', page.locator('#share-health:checked').count() == 0 and 'ALWAYS ON THIS NOTE' in note and 'Swallowing difficulty is noted' in note and 'A fluid limit from the doctor is noted' in note, note[:500])
    check('item 5: the sheet says those two are always in it', 'Always in this note, box or not:' in e2e.text(page, '#share-sheet'))
    shot(page, '08_handover_sheet_always')
    page.locator('#share-cancel').click()
    page.wait_for_timeout(300)
    # the Sudden screen: 999 for en-GB, and the question
    page.goto(url + '#/sudden')
    page.wait_for_selector('main.sudden')
    page.reload()
    page.wait_for_selector('main.sudden')
    sud = e2e.text(page)
    check('item 4: en-GB with no number in About them: the call button is 999, and it asks "Is this your emergency number?"', page.locator('a[href="tel:999"]').count() >= 1 and 'Is this your emergency number? Change it' in sud, sud[:300])
    shot(page, '09_sudden_999_guess', full=False)
    page.locator('#sudden-guess [data-act=sudden-number]').click()
    page.wait_for_selector('#emergency-number')
    check('"Change it" opens About them at the number', page.locator('#emergency-number').count() == 1)
    page.fill('#emergency-number', '112')
    page.wait_for_timeout(300)
    back(page)
    page.goto(url + '#/sudden')
    page.wait_for_selector('main.sudden')
    check('with a number set, no question, and the button calls it', page.locator('a[href="tel:112"]').count() >= 1 and 'Is this your emergency number?' not in e2e.text(page))
    check('items 2, 4, 5: nothing asked of another host', not outside, str(outside))
    check('items 2, 4, 5: no page error', not errors, '; '.join(errors))
    ctx.close()


def try_ai(browser, url):
    """Items 6 and 7: the one tap on Home to the hybrid moment; the consent sheet holds the sample question only. Then,
    with Google's hosts held (no answer), the slow wait: "Stop waiting" at 3 s."""
    outside = []
    ctx, _ = phone(browser, url, outside)
    page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(url)
    page.wait_for_selector('main.simple.home')
    page.evaluate(e2e.KV_PUT, {'profile': {'personName': 'Frank', 'partnerName': 'Carol', 'people': [{'name': 'Beth', 'relation': 'daughter', 'household': False}], 'foods': ['ginger biscuits'], 'places': ['the lake'], 'tv': [], 'music': [], 'other': []}, 'settings': {'cloudHelp': False, 'support': 'more', 'welcomed': False, 'firstCard': True, 'howFolded': True}})
    page.reload()
    page.wait_for_selector('main.simple.home #try-ai')
    page.wait_for_timeout(1500)
    check('item 7: Home has "See the AI at work" with the sample question, tagged "uses Google\'s AI, after your yes"', '"What do you want to do this weekend?"' in e2e.text(page, '#try-ai') and "uses Google's AI, after your yes" in e2e.text(page, '#try-ai-tag'), e2e.text(page, '#try-ai'))
    shot(page, '10_home_try_ai')
    page.locator('#try-ai [data-act=try-ai]').click()
    page.wait_for_selector('#sheet')
    line = e2e.text(page, '#sheet-line')
    whole = page.evaluate("[...document.querySelectorAll('#sheet pre, #sheet code')].map((e) => e.textContent).join(' ')")
    check('one tap: the consent sheet, with the sample question as the line that would go, and no family word in the line or the request', line == 'Partner asks: What do you want to do this weekend?' and not any(w in line + whole for w in ('Beth', 'Frank', 'Carol', 'ginger', 'lake')), f'{line} | {whole[:200]}')
    shot(page, '11_try_ai_sheet')
    page.keyboard.press('Escape')
    page.wait_for_timeout(300)
    if page.locator('#sheet').count():
        back(page)
    check('Back from the sheet: one step, nothing sent', page.locator('#sheet').count() == 0 and not outside, str(outside))
    check('item 7: nothing asked of another host', not outside, str(outside))
    ctx.close()
    # the slow wait: online help on, Google's hosts held
    ctx, held = phone(browser, url, outside, hold=True)
    page = ctx.new_page()
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(url)
    page.wait_for_selector('main.simple.home')
    page.evaluate(e2e.KV_PUT, {'settings': {'cloudHelp': True, 'support': 'more', 'welcomed': False, 'firstCard': True, 'howFolded': True}})
    page.reload()
    page.wait_for_selector('main.simple.home #try-ai')
    page.locator('#try-ai [data-act=try-ai]').click()
    t0 = time.time()
    page.wait_for_selector('#slow-wait', timeout=8000)
    seen = time.time() - t0
    check(f'item 6: with no answer, "Online help is still working" and "Stop waiting" appear at about 3 s ({seen:.1f} s)', 2.5 <= seen <= 6 and 'Stop waiting' in e2e.text(page, '#slow-wait'), f'{seen:.1f}')
    shot(page, '12_slow_wait_stop_waiting', full=False)
    page.locator('#slow-wait [data-act=stop-wait]').click()
    page.wait_for_timeout(300)
    home = e2e.text(page)
    check('"Stop waiting": the making stops, the carer reads what to do instead, and that the question may already have gone', 'You stopped waiting, so there is no card.' in home and 'may already have gone to online help' in home and page.locator('.making').count() == 0, home[:400])
    shot(page, '13_after_stop_waiting')
    # and without "Stop waiting": the plain line at 12 s
    page.locator('#try-ai [data-act=try-ai]').click()
    t0 = time.time()
    page.wait_for_selector('main.simple.nocard, main.simple.card', timeout=20000)
    took = time.time() - t0
    t = e2e.text(page)
    check(f'item 6: left alone, it stops by itself at about 12 s with the plain line ({took:.1f} s)', took <= 16 and ('took longer than 12 seconds' in t), t[:400])
    shot(page, '14_no_card_after_12_s')
    check('item 6: the requests to Google were held, never let through', len(held) > 0, str(len(held)))
    check('items 6 and 7: no page error', not errors, '; '.join(errors))
    ctx.close()


def main():
    global OUT
    ap = argparse.ArgumentParser()
    ap.add_argument('--url', default='http://localhost:5495/')
    ap.add_argument('--out', default='devlog/evidence_phase9')
    a = ap.parse_args()
    url = a.url.rstrip('/') + '/'
    OUT = os.path.join(a.out, 'shots_390')
    os.makedirs(OUT, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        fold(browser, url)
        later_and_notnow(browser, url)
        insights_visit_number(browser, url)
        try_ai(browser, url)
        browser.close()
    n = len(results)
    ok = sum(results)
    print(f'\n{ok} of {n} checks passed  ({datetime.datetime.now(datetime.timezone.utc):%Y-%m-%dT%H:%M:%SZ}, {url})')
    sys.exit(0 if ok == n else 1)


if __name__ == '__main__':
    main()
