#!/usr/bin/env python3
"""Screenshots of the simple view ("/"), every screen, at 390 x 844 (a phone) and 1440 x 900 (a desktop).

The phone context reports a phone (so the copy says "this phone"), the desktop one a computer. Light is the default
look; the first screen and the card-ready screen are also saved with the system set to dark. Makes code cards only:
every request that is not to the page's own host is refused, so nothing reaches Firebase and no model answers.

Usage: npm run dev (in another shell), then
  python3 scripts/shell-shots.py [--url http://localhost:5179/] [--out devlog/evidence_shell]
"""
import argparse
import pathlib
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright

PHONE_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36'
OPEN_Q = 'What do you want to do this weekend?'


def run(browser, url, out, tag, width, height, scheme, phone, only=None):
    host = urlparse(url).hostname
    ctx = browser.new_context(viewport={'width': width, 'height': height}, device_scale_factor=2, is_mobile=phone, has_touch=phone,
                              color_scheme=scheme, **({'user_agent': PHONE_UA} if phone else {}))
    ctx.route('**/*', lambda r: r.continue_() if urlparse(r.request.url).hostname in (host, None) or r.request.url.startswith(('data:', 'blob:')) else r.abort())
    page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    n = [0]

    def shot(name, full=False):
        n[0] += 1
        if only and name not in only:
            return
        page.evaluate('document.fonts.ready')
        page.wait_for_timeout(1300)  # a new card rises tile by tile: wait for the last one
        suffix = '' if scheme == 'light' else '_dark'
        page.screenshot(path=str(out / f"{tag}{suffix}_{n[0]:02d}-{name}.png"), full_page=full)

    page.goto(url)
    page.wait_for_selector('main.simple.home')
    page.wait_for_timeout(7000)  # the device check is asked again after 2 s and 6 s; the lines that depend on it stand after that
    shot('first-screen', full=True)
    page.locator('.try .ready', has_text='coffee or tea').click()
    page.wait_for_selector('main.simple.card #made-where')
    shot('card-ready', full=True)
    if not only or len(only) > 2:
        page.locator('[data-act=show]').click()
        page.wait_for_selector('main.person.full .tile')
        shot('person-card')
        page.locator('#person .tile', has_text='tea').click()
        page.wait_for_selector('[data-confirm=yes]')
        shot('person-check')
        page.locator('[data-confirm=yes]').click()
        page.wait_for_selector('.answered')
        page.locator('#exit').dispatch_event('pointerdown')
        page.wait_for_selector('main.simple.s-answered', timeout=4000)
        shot('answered', full=True)
        page.locator('[data-act=new]').click()
        page.wait_for_selector('main.simple.home')
        page.locator('.try .ready', has_text='this weekend').click()
        page.wait_for_selector('#sheet')
        shot('online-help-sheet')
        page.locator('[data-act=sheet-no]').click()
        page.wait_for_selector('main.simple.nocard')
        shot('no-card', full=True)
        page.locator('[data-act=new]').click()
        page.locator('[data-act=needs]').click()
        page.wait_for_selector('main.person.full .tiles.needs')
        shot('quick-needs')
        page.locator('#exit').dispatch_event('pointerdown')
        page.wait_for_selector('main.simple.card')
        shot('quick-needs-back', full=True)
        page.locator('[data-act=new]').click()
        page.locator('a.offer').click()
        page.wait_for_selector('main.about-simple')
        page.locator('.rowhead[data-row=names]').click()
        page.fill('input[data-field=personName]', 'Frank')
        page.fill('input[data-field=partnerName]', 'Carol')
        page.locator('.rowhead[data-row=people]').click()
        shot('about-them', full=True)
        page.locator('a.backrow').click()
        page.wait_for_selector('main.simple.home')
        page.locator('[data-act=inside]').click()
        page.wait_for_selector('.top nav .pill')
        shot('inside-full-view', full=True)
        page.locator('.top nav .pill').click()
        page.wait_for_selector('main.simple.home')
    ctx.close()
    return errors


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--url', default='http://localhost:5179/')
    ap.add_argument('--out', default='devlog/evidence_shell')
    a = ap.parse_args()
    out = pathlib.Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    errors = []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        errors += run(browser, a.url, out, 'phone_390', 390, 844, 'light', True)
        errors += run(browser, a.url, out, 'desktop_1440', 1440, 900, 'light', False)
        errors += run(browser, a.url, out, 'phone_390', 390, 844, 'dark', True, only=('first-screen', 'card-ready'))
        errors += run(browser, a.url, out, 'desktop_1440', 1440, 900, 'dark', False, only=('first-screen', 'card-ready'))
        browser.close()
    print(f"{len(list(out.glob('*.png')))} images in {out}; page errors: {len(errors)}")
    for e in errors:
        print('  ', e)
    raise SystemExit(1 if errors else 0)


if __name__ == '__main__':
    main()
