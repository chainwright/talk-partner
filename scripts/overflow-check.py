#!/usr/bin/env python3
"""No sideways overflow on a phone: at 360, 390 and 412 px, on every screen and the main card states.

Why: on 17 Nov 2026 the owner's Android phone (360 px wide) showed text and buttons running off the right edge
("Make ca…", the status box, the chip rows, the person's card). scripts/shots.mjs only measured 390 px.

What is checked, per width and per state:
  1. document.documentElement.scrollWidth <= clientWidth (the page is not wider than the screen);
  2. no visible element's right edge is past the screen, unless it sits inside a row that scrolls sideways on
     purpose (overflow-x: auto / scroll, the chip rows).
The second check is there because `body { overflow-x: hidden }` can hide an overflow from the first one.

Makes code cards only. Every request that is not to the page's own host is refused, so nothing reaches Firebase.

Usage: npm run dev (in another shell), then
  python3 scripts/overflow-check.py [--url http://localhost:5179/] [--widths 360,390,412]
Exit code 0 when every check passes, 1 otherwise.
"""
import argparse
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


def run(url, width, browser):
    host = urlparse(url).hostname
    ctx = browser.new_context(viewport={'width': width, 'height': 800}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ctx.route('**/*', lambda r: r.continue_() if urlparse(r.request.url).hostname in (host, None) or r.request.url.startswith(('data:', 'blob:')) else r.abort())
    page = ctx.new_page()

    def go(hash_):
        page.goto(url + hash_)
        page.wait_for_selector('#app > *')

    go('')
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
    page.evaluate("location.hash = '#/'")
    page.reload()
    page.wait_for_selector('#app > *')
    page.locator('button[data-act=welcome-setup]').click()
    page.wait_for_selector('#about')
    check(page, width, 'About me, empty')
    go('#/')
    page.wait_for_selector('#ask')
    check(page, width, 'partner screen, no card yet')
    page.fill('#q', 'Do you want to go to the supermarket with Christopher or stay at home and watch television?')
    page.locator('#make').click()
    page.wait_for_selector('#result > .badge-line', timeout=8000)
    check(page, width, 'partner screen, a long either-or question')
    page.evaluate("document.querySelectorAll('details').forEach((d) => { d.open = true; })")
    check(page, width, 'partner screen, every fold open')
    ctx.close()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--url', default='http://localhost:5179/')
    ap.add_argument('--widths', default='360,390,412')
    a = ap.parse_args()
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for w in (int(x) for x in a.widths.split(',')):
            run(a.url, w, browser)
        browser.close()
    bad = results.count(False)
    print(f"\n{len(results) - bad} of {len(results)} checks passed")
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
