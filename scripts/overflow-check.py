#!/usr/bin/env python3
"""No sideways overflow on a phone: at 320, 360, 390 and 412 px, on every screen and the main card states.

Why: on 17 Nov 2026 the owner's Android phone (360 px wide) showed text and buttons running off the right edge
("Make ca…", the status box, the chip rows, the person's card). scripts/shots.mjs only measured 390 px.

What is checked, per width and per state:
  1. document.documentElement.scrollWidth <= clientWidth (the page is not wider than the screen);
  2. no visible element's right edge is past the screen, unless it sits inside a row that scrolls sideways on
     purpose (overflow-x: auto / scroll, the chip rows).
The second check is there because `body { overflow-x: hidden }` can hide an overflow from the first one.

The simple view ("/", every screen of it: the first visit and the returning visit, every topic open, the carer's
screen before handing over, the person's choices, check and finish, after an answer, after "something else", the
narrowing step's sheet, the body map, the pain scale, the consent sheet, no card, "needs the internet", the needs
board, About them, and the same with long names) is measured at every width, 320 px included. The full view (judge mode and the inner
pages) is measured from 360 px up: at 320 px three of its screens are known to be 10 to 27 px too wide (the recording
of the on-device step, the repair card, the table on "How this works"; design/simple_shell_2026-11-17/PROPOSAL.md §2).

Phase 3 (18 Nov 2026) is measured at every width as well, with the Miller family's week in the diary, a long name
and a long health note: the diary (today, week, month, after a tap on the log), what stands out, the sheet before
the lines go to online help, health notes, "Keep a copy" and its preview, the guard's line on the carer's screens,
and the person's screen with the bigger pictures (at 844 px tall: 110 to 130 px, nothing scrolls). In the full view
the empty card area is words, not an ear, and the placeholder fits in the field.

Makes code cards only. Every request that is not to the page's own host is refused, so nothing reaches Firebase.

Usage: npm run dev (in another shell), then
  python3 scripts/overflow-check.py [--url http://localhost:5179/] [--widths 320,360,390,412]
Exit code 0 when every check passes, 1 otherwise.
"""
import argparse
import datetime
import json
import os
import sys
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright

MEASURE = """() => {
  const de = document.documentElement;
  const vw = de.clientWidth;
  const scrolls = (el) => { for (let p = el.parentElement; p; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if ((o === 'auto' || o === 'scroll') && p !== document.body && p !== de) return true; } return false; };
  const off = [];
  for (const el of document.querySelectorAll('#app *')) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    if (r.right > vw + 1 && !scrolls(el)) off.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).join('.') : ''} right=${Math.round(r.right)}`);
  }
  return { vw, sw: de.scrollWidth, bw: document.body.scrollWidth, off: off.slice(0, 6), n: off.length };
}"""

results = []


def check(page, width, name):
    page.wait_for_timeout(350)
    m = page.evaluate(MEASURE)
    ok = m['sw'] <= m['vw'] and m['bw'] <= m['vw'] and m['n'] == 0
    results.append(ok)
    detail = '' if ok else f"  scrollWidth {m['sw']} / body {m['bw']} > {m['vw']}; {m['n']} element(s) past the edge: {'; '.join(m['off'])}"
    print(f"{'PASS' if ok else 'FAIL'}  {width}px  {name}{detail}")


def chip(page, text):
    page.locator('.chip', has_text=text).first.click()
    page.wait_for_selector('#result > .badge-line', timeout=8000)


PHONE_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36'
FIXTURE_PHOTO = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'tests', 'fixtures', 'photo-mug.jpg')
LONG_Q = 'Do you want to go to the supermarket with Christopher or stay at home and watch television?'


def context(url, width, browser):
    host = urlparse(url).hostname
    ctx = browser.new_context(viewport={'width': width, 'height': 800}, device_scale_factor=2, is_mobile=True, has_touch=True, user_agent=PHONE_UA)
    ctx.route('**/*', lambda r: r.continue_() if urlparse(r.request.url).hostname in (host, None) or r.request.url.startswith(('data:', 'blob:')) else r.abort())
    return ctx


def simple(url, width, browser):
    """The simple view, every screen (the carer's and the person's), as a fresh visitor on a phone sees it."""
    ctx = context(url, width, browser)
    page = ctx.new_page()

    def topic(t, q):
        if not page.locator('.tq', has_text=q).count():
            page.locator(f'.topic[data-topic={t}]').click()
        page.locator('.tq', has_text=q).click()
        page.wait_for_selector('main.simple.card #made-where, #sheet, main.simple.nocard')

    def show():
        page.locator('[data-act=show]').click()
        page.wait_for_selector('main.pv .pt')

    def finish(label):
        page.locator('main.pv .pt', has_text=label).first.click()
        page.wait_for_selector('[data-confirm=yes]')
        page.locator('[data-confirm=yes]').click()
        page.wait_for_selector('.p-give')

    page.goto(url)
    page.wait_for_selector('main.simple.home')
    page.wait_for_timeout(7000)  # the lines that follow the device check stand after it was asked again (2 s, 6 s)
    check(page, width, 'simple: first visit (how it works open)')
    page.locator('#mic').click() if page.locator('#mic').count() else None
    check(page, width, 'simple: first visit, the microphone notice open')
    for t in ('food', 'body', 'rest', 'people', 'feel', 'plans', 'fun'):
        page.locator(f'.topic[data-topic={t}]').click()
        check(page, width, f'simple: first visit, topic "{t}" open')
    topic('food', 'tea or coffee')
    check(page, width, 'simple: before handing over')
    page.locator('#more-tips').click()
    check(page, width, 'simple: before handing over, "More tips" open')
    page.locator('#more-tips').click()
    page.locator('button[data-act=less]').click()
    check(page, width, 'simple: before handing over, choices hidden')
    page.locator('button[data-act=less]').click()
    page.locator('button[data-act=stuck]').click()
    page.wait_for_selector('#person .p-tiles.ways')
    check(page, width, "simple: We're stuck (the other ways, carer's side)")
    show()
    check(page, width, "simple: the person's screen, the other ways")
    page.locator('#exit').dispatch_event('pointerdown')
    page.wait_for_selector('main.simple.card', timeout=4000)
    page.locator('button[data-act=unstuck]').click()
    show()
    check(page, width, "simple: the person's choices (two and the way out)")
    page.locator('main.pv .pt', has_text='tea').click()
    page.wait_for_selector('[data-confirm=yes]')
    check(page, width, "simple: the person's check (So: tea. Right?)")
    page.locator('[data-confirm=yes]').click()
    page.wait_for_selector('.p-give')
    check(page, width, "simple: the person's finish (Thank you. Tea. Give the phone back)")
    page.locator('.p-give').click()
    page.wait_for_selector('main.simple.s-answered', timeout=4000)
    check(page, width, 'simple: after an answer (the next question leads, About them offered), "More" closed')
    page.locator('#more').click()
    check(page, width, 'simple: after an answer, "More" open (today, Today in short, how it was made)')
    page.locator('[data-act=recap]').click()
    check(page, width, 'simple: going over the answers, Today in short')
    show()
    check(page, width, "simple: the person's screen, going over the answers")
    page.locator('#exit').dispatch_event('pointerdown')
    page.wait_for_selector('main.simple.card', timeout=4000)
    page.locator('[data-act=home]').click()
    page.wait_for_selector('main.simple.home')
    check(page, width, 'simple: returning visit (how it works folded, a topic open)')
    topic('food', 'water, juice or milk')
    show()
    check(page, width, "simple: the person's choices (three and the way out)")
    finish('something else')
    check(page, width, "simple: the person's finish after the way out")
    page.locator('.p-give').click()
    page.wait_for_selector('#after-out')
    check(page, width, 'simple: after "something else" (what now, the narrowing step)')
    page.locator('#narrow').click()
    page.wait_for_selector('#sheet, main.simple.nocard')
    if page.locator('#sheet').count():
        check(page, width, 'simple: the consent sheet for a narrowing step')
        page.locator('[data-act=sheet-no]').click()
    check(page, width, 'simple: no narrowing card')
    page.locator('[data-act=home]').click()
    topic('body', 'Are you in pain?')
    check(page, width, 'simple: before handing over, a yes / no question')
    show()
    check(page, width, "simple: the person's choices (yes / no / not sure)")
    finish('yes')
    page.locator('.p-give').click()
    page.wait_for_selector('#next-q')
    check(page, width, 'simple: after a yes, the next question offered')
    page.locator('#next-q').click()
    page.wait_for_selector('main.simple.card #made-where')
    check(page, width, 'simple: before handing over, the body map')
    show()
    check(page, width, "simple: the person's screen, the body map")
    page.locator('main.pv .pt', has_text='chest').click()
    page.wait_for_selector('main.pv .pt >> text=your left side')
    check(page, width, "simple: the person's screen, the body map, second step (left and right)")
    page.locator('#exit').dispatch_event('pointerdown')
    page.wait_for_selector('main.simple.card', timeout=4000)
    page.locator('[data-act=home]').click()
    page.fill('#q', 'How bad is the pain?')
    page.locator('#make').click()
    page.wait_for_selector('main.simple.card #made-where')
    show()
    check(page, width, "simple: the person's screen, the pain scale (three steps and not sure)")
    page.locator('#exit').dispatch_event('pointerdown')
    page.wait_for_selector('main.simple.card', timeout=4000)
    page.locator('[data-act=home]').click()
    page.fill('#q', 'How bad is the pain, from 0 to 10?')
    page.locator('#make').click()
    page.wait_for_selector('main.simple.card #made-where')
    check(page, width, 'simple: before handing over, a number scale')
    show()
    check(page, width, "simple: the person's screen, a number scale")
    page.locator('#exit').dispatch_event('pointerdown')
    page.wait_for_selector('main.simple.card', timeout=4000)
    page.locator('[data-act=home]').click()
    topic('people', 'call someone')
    show()
    finish('yes')
    page.locator('.p-give').click()
    page.wait_for_selector('#who')
    check(page, width, 'simple: after "call someone", a field for one name')
    page.locator('[data-act=home]').click()
    page.fill('#q', LONG_Q)
    page.locator('#make').click()
    page.wait_for_selector('main.simple.card #made-where')
    check(page, width, 'simple: before handing over, a long either-or question')
    show()
    check(page, width, "simple: the person's choices, a long either-or question")
    page.locator('main.pv .pt').first.click()
    page.wait_for_selector('[data-confirm=yes]')
    check(page, width, "simple: the person's check, a long answer")
    page.locator('[data-confirm=yes]').click()
    page.wait_for_selector('.p-give')
    check(page, width, "simple: the person's finish, a long answer")
    page.locator('.p-give').click()
    page.wait_for_selector('main.simple.s-answered')
    check(page, width, 'simple: after an answer, a long answer')
    page.locator('[data-act=home]').click()
    page.fill('#q', 'Would you like something sweet or something savoury?')
    page.locator('#make').click()
    page.wait_for_selector('main.simple.card #made-where')
    show()
    finish('something sweet')
    page.locator('.p-give').click()
    page.wait_for_selector('#do-now')
    check(page, width, 'simple: the end of a path (the line that says what to do now)')
    page.locator('[data-act=home]').click()
    page.fill('#q', 'What year did we get married?')
    page.locator('#make').click()
    page.wait_for_selector('main.simple.nocard')
    check(page, width, 'simple: a memory question (a line to say, no card)')
    page.locator('[data-act=home]').click()
    topic('plans', 'this weekend')
    if page.locator('#sheet').count():
        check(page, width, 'simple: the consent sheet')
        page.locator('[data-act=sheet-no]').click()
    check(page, width, 'simple: no card for an open question')
    ctx.set_offline(True)
    page.wait_for_selector('#offline', timeout=5000)
    check(page, width, 'simple: no card, "needs the internet" (connection off)')
    page.locator('[data-act=home]').click()
    page.wait_for_timeout(300)
    check(page, width, 'simple: first screen with the connection off (the AI line says so)')
    ctx.set_offline(False)
    page.locator('.btn.needs').click()
    page.wait_for_selector('main.pv .p-tiles.board')
    check(page, width, 'simple: the needs board, full screen')
    finish('call someone')
    check(page, width, "simple: the person's finish after a need")
    page.locator('.p-give').click()
    page.wait_for_selector('main.simple.s-answered')
    check(page, width, 'simple: after a need')
    page.locator('[data-act=home]').click()
    page.locator('.foot a[href="#/about"]').click()
    page.wait_for_selector('main.about-simple')
    check(page, width, 'simple: About them, rows closed')
    page.locator('.rowhead[data-row=names]').click()
    page.fill('input[data-field=personName]', 'Christopher-Alexander')
    page.fill('input[data-field=partnerName]', 'Wilhelmina')
    page.locator('.rowhead[data-row=people]').click()
    page.locator('[data-act=person-add]').click()
    page.fill('input[data-person="0"][data-field=name]', 'Bartholomew')
    page.fill('input[data-person="0"][data-field=relation]', 'son-in-law')
    check(page, width, 'simple: About them, a person being added')
    page.locator('.rowhead[data-row=foods]').click()
    page.fill('textarea[data-list=foods]', 'slow-cooked beef stew with dumplings\nmacaroni cheese')
    page.locator('.rowhead[data-row=places]').click()
    page.fill('textarea[data-list=places]', 'the allotment by the railway bridge\nSt Bartholomew church hall')
    check(page, width, 'simple: About them, places open, long names in the rows')
    page.wait_for_timeout(500)
    page.locator('a.btn.primary').click()
    page.wait_for_selector('main.simple.home')
    check(page, width, 'simple: first screen with a long name')
    page.locator('.how-line').click()
    check(page, width, 'simple: how it works open, with a long name')
    for t in ('food', 'people', 'plans'):
        page.locator(f'.topic[data-topic={t}]').click() if not page.locator(f'.topic.open[data-topic={t}]').count() else None
        check(page, width, f'simple: topic "{t}" open with the family\'s own long questions')
    topic('people', 'call Bartholomew')
    check(page, width, 'simple: before handing over with a long name')
    show()
    finish('yes')
    check(page, width, "simple: the person's finish (a yes)")
    page.locator('.p-give').click()
    page.wait_for_selector('main.simple.s-answered')
    check(page, width, 'simple: after an answer with a long name')
    # the family's own photos, and what was learned (18 Nov)
    page.locator('[data-act=home]').click()
    page.locator('.foot a[href="#/about"]').click()
    page.wait_for_selector('main.about-simple #photos')
    page.set_input_files('#photo-file', FIXTURE_PHOTO)
    page.wait_for_selector('#photo-sheet #crop-img')
    check(page, width, 'simple: adding a photo, "Frame the picture"')
    page.locator('[data-act=photo-use]').click()
    page.wait_for_selector('#photo-word')
    check(page, width, 'simple: adding a photo, "One word for it"')
    page.fill('#photo-word', 'chrysanthemums vase')
    page.locator('#photo-form button[type=submit]').click()
    page.wait_for_selector('#photo-sheet', state='detached')
    page.set_input_files('#photo-file', FIXTURE_PHOTO)
    page.wait_for_selector('#photo-sheet #crop-img')
    page.locator('[data-act=photo-use]').click()
    page.wait_for_selector('#photo-word')
    page.fill('#photo-word', 'tea')
    page.locator('#photo-form button[type=submit]').click()
    page.wait_for_selector('#photo-sheet', state='detached')
    check(page, width, 'simple: About them with two photos (a long word) and "What we have learned"')
    page.locator('[data-act=home]').click()
    for _ in range(3):
        topic('food', 'tea or coffee')
        show()
        finish('coffee')
        page.locator('.p-give').click()
        page.wait_for_selector('main.simple.s-answered')
        page.locator('[data-act=home]').click()
    topic('food', 'tea or coffee')
    page.wait_for_selector('#usual')
    check(page, width, 'simple: before handing over, with "Usually: ..." and a family photo on a choice')
    show()
    check(page, width, "simple: the person's choices, one of them a family photo")
    page.locator('#exit').dispatch_event('pointerdown')
    page.wait_for_selector('main.simple.card', timeout=4000)
    page.locator('[data-act=home]').click()
    page.locator('.foot a[href="#/about"]').click()
    page.wait_for_selector('#learned-list')
    check(page, width, 'simple: About them, a learned line with "Keep as a fact" and "Remove"')
    ctx.close()


KV_PUT = """(all) => new Promise((res) => { const r = indexedDB.open('talk-partner', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => { const tx = r.result.transaction('kv', 'readwrite'); for (const [k, v] of Object.entries(all)) tx.objectStore('kv').put(v, k); tx.oncomplete = () => res(true); tx.onerror = () => res(false); }; r.onerror = () => res(false); })"""
FIXTURE_WEEK = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'tests', 'fixtures', 'frank-week.json')
PLACEHOLDER = """() => { const q = document.querySelector('#q'); const cs = getComputedStyle(q); const c = document.createElement('canvas').getContext('2d'); c.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`; return { text: q.placeholder, need: Math.ceil(c.measureText(q.placeholder).width), room: Math.floor(q.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)) }; }"""


def named(ok, width, name, detail=''):
    results.append(bool(ok))
    print(f"{'PASS' if ok else 'FAIL'}  {width}px  {name}{'' if ok else '  ' + detail}")


def phase3(url, width, browser):
    """The carer's screens of phase 3 with a full week in the diary, long names and a long health note; the person's
    screen with the bigger pictures; and the full view's empty card area in words with a placeholder that fits."""
    ctx = context(url, width, browser)
    page = ctx.new_page()
    page.on('dialog', lambda d: d.accept())
    week = json.load(open(FIXTURE_WEEK))
    today = datetime.date.today()
    now = int(datetime.datetime.now().timestamp() * 1000)
    entries = []
    for i, r in enumerate(week['entries']):
        h, m = (int(x) for x in r['t'].split(':'))
        at = int(datetime.datetime.combine(today - datetime.timedelta(days=6 - r['d']), datetime.time(h, m)).timestamp() * 1000)
        e = {'id': f'w{i}', 'at': at, 'kind': r['kind'], 'label': r['label'], 'topic': r.get('topic') or {'drank': 'food', 'ate': 'food', 'toilet': 'body', 'slept': 'rest', 'pain': 'body'}[r['log']]}
        e.update({k: r[k] for k in ('log', 'q') if k in r})
        if r.get('lessSure'):
            e['lessSure'] = True
        entries.append(e)
    entries.append({'id': 'long', 'at': now - 60000, 'kind': 'answer', 'q': LONG_Q, 'label': 'stay at home and watch television', 'topic': 'plans', 'lessSure': True})
    profile = dict(week['profile'], personName='Christopher-Alexander')
    health = {'text': 'Thickened fluids only, level 2, as the speech and language therapist wrote in the discharge letter; no straws. ' * 2, 'diabetes': True, 'swallowing': True, 'fluidLimit': True, 'reminders': True}
    # five "yes" in the last few minutes: the guard is on, so the carer's screens carry its line
    history = [{'q': f'Question {n}?', 'topic': '', 'label': 'yes', 'at': now - (5 - n) * 30000, 'pos': 0, 'of': 2, 'yn': True, 'lessSure': True} for n in range(5)]
    asks = [{'at': now - n * 60000, 'open': False, 'two': n == 1, 'quiz': False, 'again': False} for n in range(1, 5)]
    page.goto(url)
    page.wait_for_selector('main.simple.home')
    page.evaluate(KV_PUT, {'diary': entries, 'health': health, 'profile': profile, 'history': history, 'asks': asks, 'settings': {'cloudHelp': False, 'support': 'more', 'welcomed': True, 'firstCard': True, 'howFolded': True}})
    page.reload()
    page.wait_for_selector('main.simple.home')
    check(page, width, 'phase 3: the first screen with "Diary" under the questions')
    page.locator('#diary-link').click()
    page.wait_for_selector('main.simple.diary')
    check(page, width, 'phase 3: the diary, today (a long question, "less sure", the tip of the day)')
    page.locator('[data-log=toilet]').click()
    page.wait_for_selector('#logged')
    check(page, width, 'phase 3: the diary after a tap on the log ("Logged: Toilet, …" and Undo)')
    page.locator('#tab-week').click()
    page.wait_for_selector('#insights')
    check(page, width, 'phase 3: the diary, the week, with what stands out (every health note on)')
    page.locator('#tab-month').click()
    page.wait_for_timeout(150)
    check(page, width, 'phase 3: the diary, the month')
    if page.locator('#ins-plainer').count():
        page.locator('#ins-plainer').click()
        page.wait_for_selector('#ins-sheet')
        page.locator('#ins-sheet-whole summary').click()
        check(page, width, 'phase 3: the sheet before the lines go to online help, the whole request open')
        page.locator('[data-act=ins-no]').click()
    page.evaluate(KV_PUT, {'health': {'text': '', 'diabetes': True, 'swallowing': False, 'fluidLimit': False, 'reminders': False}})
    page.reload()
    page.wait_for_selector('main.simple.diary')
    page.locator('#tab-week').click()
    page.wait_for_selector('#ins-plainer')
    page.locator('#ins-plainer').click()
    page.wait_for_selector('#ins-sheet')
    check(page, width, 'phase 3: the sheet before the lines go to online help (three lines)')
    page.locator('[data-act=ins-no]').click()
    page.evaluate(KV_PUT, {'health': health})
    page.goto(url + '#/about')
    page.wait_for_selector('main.about-simple')
    page.reload()
    page.wait_for_selector('main.about-simple')
    check(page, width, 'phase 3: About them, the health row closed with a long note, and "Keep a copy"')
    page.locator('.rowhead[data-row=health]').click()
    page.wait_for_selector('#health-text')
    check(page, width, 'phase 3: About them, health notes open')
    with page.expect_download() as dl:
        page.locator('#backup-save').click()
    page.locator('#backup-file').set_input_files(dl.value.path())
    page.wait_for_selector('#import-sheet')
    check(page, width, 'phase 3: the preview of a file before it replaces About them')
    page.locator('[data-act=import-no]').click()
    page.locator('#backup-file').set_input_files({'name': 'x.json', 'mimeType': 'application/json', 'buffer': b'{}'})
    page.wait_for_selector('#backup-error')
    check(page, width, 'phase 3: "Keep a copy" with a file that is not ours')
    page.locator('[data-act=home]').click()
    page.wait_for_selector('main.simple.home')
    page.locator('.topic[data-topic=food]').click()
    page.locator('.tq', has_text='water, juice or milk').click()
    page.wait_for_selector('main.simple.card #guard')
    check(page, width, 'phase 3: before handing over, with the guard\'s line')
    page.locator('[data-act=show]').click()
    page.wait_for_selector('main.pv .pt')
    check(page, width, "phase 3: the person's choices, three bigger pictures and the way out")
    fits = page.evaluate("(() => { const de = document.documentElement; const p = [...document.querySelectorAll('main.pv .pt:not(.esc) svg')].map((x) => Math.round(x.getBoundingClientRect().height)); return { p, sh: de.scrollHeight, ch: de.clientHeight }; })()")
    if width >= 390:
        page.set_viewport_size({'width': width, 'height': 844})
        page.wait_for_timeout(150)
        fits = page.evaluate("(() => { const de = document.documentElement; const p = [...document.querySelectorAll('main.pv .pt:not(.esc) svg')].map((x) => Math.round(x.getBoundingClientRect().height)); return { p, sh: de.scrollHeight, ch: de.clientHeight }; })()")
        named(all(110 <= x <= 130 for x in fits['p']) and fits['sh'] <= fits['ch'], width, 'phase 3: at 844 px tall the three pictures are 110 to 130 px and nothing scrolls', str(fits))
        page.set_viewport_size({'width': width, 'height': 800})
    else:
        named(all(x >= 96 for x in fits['p']), width, 'phase 3: on a narrower phone the three pictures are 96 px or more', str(fits))
    page.locator('main.pv .pt', has_text='water').first.click()
    page.wait_for_selector('[data-confirm=yes]')
    check(page, width, "phase 3: the person's check, with the bigger picture")
    page.locator('[data-confirm=yes]').click()
    page.wait_for_selector('.p-give')
    page.locator('.p-give').click()
    page.wait_for_selector('main.simple.s-answered #guard')
    check(page, width, 'phase 3: after the answer, with the guard\'s line')
    if width >= 360:
        # the full view ("How it works inside"): the empty card area says in words what will be there, and the placeholder is not cut
        page.locator('[data-act=home]').click()
        page.wait_for_selector('main.simple.home')
        page.locator('[data-act=inside]').click()
        page.wait_for_selector('#card-empty')
        check(page, width, 'full view: the partner screen with no card yet')
        empty = ' '.join(page.locator('#person').inner_text().split())
        named(empty == 'Your card will appear here. Type or say a question above, or tap one you asked before.' and page.locator('#person svg').count() == 0, width, 'full view: the empty card area is plain words, with no ear', empty)
        ph = page.evaluate(PLACEHOLDER)
        named(ph['text'] == 'Your question' and ph['need'] <= ph['room'], width, 'full view: the placeholder "Your question" fits in the field', str(ph))
    ctx.close()


def phase4(url, width, browser):
    """Phase 4 with a long name and long words in About them: the alphabet (all of it on the screen, at the phone's
    own height), the words after a letter, the person's starters and the topic menu, the doctor-visit questions and
    their page, "Talk about a photo" and the photo over a question. The person's screens must also need no scrolling."""
    import base64
    tall = {320: 568, 360: 740, 390: 844, 412: 915}.get(width, 844)
    host = urlparse(url).hostname
    ctx = browser.new_context(viewport={'width': width, 'height': tall}, device_scale_factor=2, is_mobile=True, has_touch=True, user_agent=PHONE_UA)
    ctx.route('**/*', lambda r: r.continue_() if urlparse(r.request.url).hostname in (host, None) or r.request.url.startswith(('data:', 'blob:')) else r.abort())
    page = ctx.new_page()
    page.on('dialog', lambda d: d.accept())
    data = 'data:image/jpeg;base64,' + base64.b64encode(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'tests', 'fixtures', 'photo-mug.jpg'), 'rb').read()).decode()
    profile = {'personName': 'Maximilian-Alexander', 'partnerName': 'Carol', 'people': [{'id': 'p2', 'name': 'Bartholomew-Christopher', 'relation': 'son', 'household': False}, {'id': 'p3', 'name': 'Beth', 'relation': 'daughter', 'household': False}], 'foods': ['blackcurrant and apple crumble', 'porridge'], 'places': ['the botanical gardens'], 'tv': [], 'music': [], 'other': ['Bo (dog)']}
    photos = [{'id': f'ph{i}', 'word': w, 'data': data, 'at': 1000 + i} for i, w in enumerate(['Bartholomew-Christopher', 'the botanical gardens', 'Bo'])]
    page.goto(url)
    page.wait_for_selector('main.simple.home')
    page.evaluate(KV_PUT, {'profile': profile, 'photos': photos, 'settings': {'cloudHelp': False, 'support': 'more', 'welcomed': False, 'firstCard': True, 'howFolded': True}})
    page.reload()
    page.wait_for_selector('main.simple.home')

    def fits(name):
        m = page.evaluate("() => ({ h: innerHeight, sh: document.documentElement.scrollHeight, low: Math.round(Math.max(0, ...[...document.querySelectorAll('#person button, #person img, #person p')].map((e) => e.getBoundingClientRect().bottom))) })")
        named(m['sh'] <= m['h'] and m['low'] <= m['h'], width, f'{name}: needs no scrolling at {width} x {tall}', str(m))

    def yes(label):
        page.wait_for_selector('main.pv .pt')
        page.locator('main.pv .pt', has_text=label).first.click()
        page.wait_for_selector('[data-confirm=yes]')
        page.locator('[data-confirm=yes]').click()

    check(page, width, 'phase 4: first screen, "[long name] wants to say something" and the two new ways in')
    # the first letter
    page.locator('.topic[data-topic=food]').click()
    page.locator('.tq', has_text='tea or coffee').click()
    page.wait_for_selector('main.simple.card')
    page.locator('[data-act=show]').click()
    yes('something else')
    page.locator('.p-give').click()
    page.wait_for_selector('#letter-go')
    check(page, width, 'phase 4: after "something else", with "Try the first letter"')
    page.locator('#letter-go').click()
    page.wait_for_selector('#abc')
    check(page, width, "phase 4: the person's alphabet")
    fits("phase 4: the person's alphabet (26 letters and the way out)")
    small = page.evaluate("[...document.querySelectorAll('#abc .ab')].filter((e) => { const r = e.getBoundingClientRect(); return r.width < 40 || r.height < 44; }).length")
    named(small == 0, width, 'phase 4: every letter is at least 40 x 44 px', str(small))
    page.locator('[data-letter=B]').click()
    page.wait_for_selector('main.pv .pt')
    check(page, width, "phase 4: the person's words after a letter (long words, photos)")
    if tall >= 844:
        fits("phase 4: the words after a letter")
    yes('Bo')
    page.locator('.p-give').click()
    page.wait_for_selector('main.simple.s-answered')
    check(page, width, 'phase 4: the carer reads the word')
    page.locator('[data-act=home]').click()
    page.locator('.topic[data-topic=food]').click() if not page.locator('.tq', has_text='tea or coffee').count() else None
    page.locator('.tq', has_text='tea or coffee').click()
    page.wait_for_selector('main.simple.card')
    page.locator('[data-act=show]').click()
    yes('something else')
    page.locator('.p-give').click()
    page.locator('#letter-go').click()
    page.wait_for_selector('#abc')
    page.locator('[data-letter=X]').click()
    page.wait_for_selector('main.simple.nocard')
    if page.locator('#sheet').count():
        check(page, width, 'phase 4: the sheet before the letter and the question go to online help')
        page.locator('#sheet-whole summary').click()
        check(page, width, 'phase 4: that sheet, the whole request open')
        page.locator('[data-act=sheet-no]').click()
    check(page, width, 'phase 4: no word for the letter')
    # the person starts
    page.locator('[data-act=home]').click()
    page.locator('#turn-go').click()
    page.wait_for_selector('main.pv .pt')
    check(page, width, "phase 4: the person's starters")
    if tall >= 740:
        fits("phase 4: the person's starters")
    yes('tell you something')
    page.wait_for_selector('main.pv .pt >> text=People')
    check(page, width, "phase 4: the topics as a picture menu")
    if tall >= 740:
        fits('phase 4: the topics as a picture menu')
    yes('People')
    page.wait_for_selector('main.pv .pt >> text=Beth')
    check(page, width, 'phase 4: "Who is it about?" (a long name)')
    if tall >= 740:
        fits('phase 4: "Who is it about?"')
    yes('Bartholomew')
    page.locator('.p-give').click()
    page.wait_for_selector('#turn-lead')
    check(page, width, 'phase 4: the carer reads who started (long name), with three questions')
    # before a doctor visit
    page.locator('[data-act=home]').click()
    page.locator('#visit-link').click()
    page.wait_for_selector('#visit-start')
    check(page, width, 'phase 4: before a doctor visit, the first screen')
    page.locator('#visit-start').click()
    yes('yes')
    page.wait_for_selector('main.pv[data-kind=body] .pt')
    page.locator('main.pv .pt:not(.esc)').first.click()
    page.wait_for_timeout(300)
    yes(page.locator('main.pv .pt:not(.esc)').first.inner_text().strip())
    page.wait_for_selector('main.pv .pt >> text=very bad')
    check(page, width, "phase 4: a doctor-visit question on the person's screen (three choices and not sure)")
    for label in ['very bad', 'badly', 'poor', 'low']:
        yes(label)
        page.wait_for_timeout(250)
    page.wait_for_selector('main.pv .pt >> text=nothing much')
    check(page, width, "phase 4: \"What worries you most?\"")
    if tall >= 740:
        fits('phase 4: "What worries you most?"')
    yes('nothing much')
    page.wait_for_selector('main.pv .pt >> text=getting stronger')
    check(page, width, "phase 4: \"What do you want to ask the doctor?\"")
    yes('getting stronger')
    page.wait_for_selector('.p-give')
    check(page, width, "phase 4: the end of the doctor-visit questions")
    page.locator('.p-give').click()
    page.wait_for_selector('#visit-page')
    check(page, width, 'phase 4: the page of answers (long name), with the pain line and the buttons')
    # talk about a photo
    page.locator('[data-act=home]').click()
    page.locator('#phototalk-link').click()
    page.wait_for_selector('#pt-grid')
    check(page, width, 'phase 4: talk about a photo, the photos (long words)')
    page.locator('.pt-photo', has_text='Bo').first.click()
    page.wait_for_selector('#pt-questions')
    check(page, width, 'phase 4: talk about a photo, the questions')
    page.locator('[data-act=pt-ask]').nth(1).click()
    page.wait_for_selector('main.simple.card')
    page.locator('[data-act=show]').click()
    page.wait_for_selector('main.pv.with-photo .pt')
    check(page, width, "phase 4: the photo over the question on the person's screen")
    if tall >= 844:
        fits('phase 4: the photo, three choices and the way out')
    ctx.close()


def run(url, width, browser):
    ctx = context(url, width, browser)
    page = ctx.new_page()

    def go(hash_):
        page.goto(url + hash_)
        page.wait_for_selector('#app > *')

    go('#/welcome')
    check(page, width, 'first run (welcome)')

    go('#/demo')
    page.wait_for_selector('#result > .badge-line')
    page.wait_for_timeout(7000)  # the device check is asked again after 2 s and 6 s: the longest status line stands after that
    check(page, width, 'judge mode, the card it opens with')
    link = page.locator('#rec-link button')
    if link.count():
        link.click()
        check(page, width, 'judge mode, the recording of the on-device step open')
        page.locator('.recorded button[data-act=recorded]').click()
    chip(page, 'the toilet?')
    check(page, width, 'judge mode, a yes / no card')
    page.evaluate("document.querySelectorAll('details').forEach((d) => { d.open = true; })")
    check(page, width, 'judge mode, every fold under the card open')
    chip(page, 'therapy today')
    check(page, width, 'judge mode, two questions in one (coaching line, Next)')
    chip(page, 'what year')
    check(page, width, 'judge mode, a memory test (no card)')
    chip(page, 'this weekend?')
    check(page, width, 'judge mode, an open question with no model here')
    chip(page, 'coffee or tea?')
    page.locator('button[data-act=stuck]').click()
    check(page, width, "judge mode, We're stuck")
    go('#/person')
    check(page, width, "the person's screen, the repair card")
    go('#/needs')
    check(page, width, "the person's screen, quick needs")
    for h in ('about', 'cloud', 'how', 'feedback'):
        go('#/' + h)
        check(page, width, f'#/{h} (sample family)')

    # the partner screen outside judge mode, with a long typed question
    page.evaluate("location.hash = '#/welcome'")
    page.reload()
    page.wait_for_selector('main.welcome')
    page.locator('button[data-act=welcome-setup]').click()
    page.wait_for_selector('#about')
    check(page, width, 'About me, empty')
    go('#/')
    page.wait_for_selector('#ask')
    check(page, width, 'partner screen, no card yet')
    page.fill('#q', LONG_Q)
    page.locator('#make').click()
    page.wait_for_selector('#result > .badge-line', timeout=8000)
    check(page, width, 'partner screen, a long either-or question')
    page.evaluate("document.querySelectorAll('details').forEach((d) => { d.open = true; })")
    check(page, width, 'partner screen, every fold open')
    ctx.close()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--url', default='http://localhost:5179/')
    ap.add_argument('--widths', default='320,360,390,412')
    ap.add_argument('--only', default='', help="'phase4': only the phase 4 screens")
    a = ap.parse_args()
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for w in (int(x) for x in a.widths.split(',')):
            if a.only in ('', 'phase4'):
                phase4(a.url, w, browser)
            if a.only:
                continue
            simple(a.url, w, browser)
            phase3(a.url, w, browser)
            if w >= 360:
                run(a.url, w, browser)
        browser.close()
    bad = results.count(False)
    print(f"\n{len(results) - bad} of {len(results)} checks passed")
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
