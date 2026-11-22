#!/usr/bin/env python3
"""Installable and usable offline: the web app manifest, the service worker, and the app with no connection.

What is checked, in Chromium, against a production build (npm run build && npx vite preview) or the hosted copy:
  1. the manifest, as Chrome parses it (DevTools protocol, Page.getAppManifest): no errors; name "Talk Partner",
     display standalone, a theme colour, a start URL in scope, and icons of 192 and 512 px (one maskable) that load
     as PNG files of the stated size; (phase 10) the shortcut "I want to say something" to /#/turn, and that address
     opens the person's own start;
  2. Chrome's own installability check (Page.getInstallabilityErrors) reports nothing;
  3. the service worker is registered, active and controls the page, and its cache holds the page and every script,
     style, font and icon the page loaded, and (phase 11) every picture file in /pictures/ (90 since phase 12b);
  4. with the connection off: the page loads again; a topic question makes its choices by the rules; the person's
     screens work to the finish and back, the card's pictures (tea, coffee) load from the kept copy; quick needs opens; About them opens and keeps what is typed; a question that
     needs online help gets a clear "needs the internet" state and no consent sheet; the AI line and the tag say so;
  5. with the connection back, the same question brings the consent sheet again.
Nothing is sent to any other host: "Yes" on the sheet is never pressed.

Usage: python3 scripts/pwa-check.py [--url http://localhost:5179/]
Exit code 0 when every check passes, 1 otherwise.
"""
import argparse
import json
import os
import struct
import sys
import tempfile
from urllib.parse import urljoin, urlparse

from playwright.sync_api import sync_playwright

PHONE_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36'
OPEN_Q = 'What do you want to do this weekend?'
results = []


def check(name, ok, detail=''):
    results.append(bool(ok))
    print(f"{'PASS' if ok else 'FAIL'}  {name}{f'  ({detail})' if detail and not ok else ''}")


def text(page, sel='#app'):
    return ' '.join(page.locator(sel).inner_text().split())


def png_size(body):
    return struct.unpack('>II', body[16:24]) if body[:8] == b'\x89PNG\r\n\x1a\n' else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--url', default='http://localhost:5179/')
    a = ap.parse_args()
    url = a.url if a.url.endswith('/') else a.url + '/'
    host = urlparse(url).hostname
    print(f'url: {url}')
    with sync_playwright() as p, tempfile.TemporaryDirectory() as profile:
        # a profile on disk, not an incognito window: Chrome refuses to call a page installable in incognito
        ctx = p.chromium.launch_persistent_context(profile, headless=True, viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True, user_agent=PHONE_UA, service_workers='allow')
        print(f'browser: Chromium {ctx.browser.version if ctx.browser else ""} (headless, persistent profile)')
        outside = []
        ctx.on('request', lambda r: outside.append(urlparse(r.url).hostname) if urlparse(r.url).hostname not in (host, None) and not r.url.startswith(('data:', 'blob:', 'chrome')) else None)
        page = ctx.pages[0] if ctx.pages else ctx.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(url)
        page.wait_for_selector('main.simple.home')

        # 1. the manifest as Chrome reads it
        cdp = ctx.new_cdp_session(page)
        m = cdp.send('Page.getAppManifest')
        check('the page links a web app manifest, and Chrome parses it with no error', bool(m.get('url')) and not m.get('errors'), str(m.get('errors')))
        import json
        man = json.loads(m.get('data') or '{}')
        check('manifest: name "Talk Partner", display standalone, a theme colour, a background colour', man.get('name') == 'Talk Partner' and man.get('display') == 'standalone' and str(man.get('theme_color', '')).startswith('#') and str(man.get('background_color', '')).startswith('#'), str({k: man.get(k) for k in ('name', 'display', 'theme_color', 'background_color')}))
        check('manifest: the start URL is the simple view, inside the scope', man.get('start_url') == '/' and man.get('scope') == '/', f"{man.get('start_url')} {man.get('scope')}")
        # (phase 10) the home-screen shortcut "I want to say something": the person's own start, by its own address
        sc = man.get('shortcuts') or []
        check('manifest (phase 10): one shortcut, "I want to say something", to /#/turn inside the scope', len(sc) == 1 and sc[0].get('name') == 'I want to say something' and sc[0].get('url') == '/#/turn', str(sc))
        check('the page names the same theme colour for the browser bar', page.locator('meta[name=theme-color]').get_attribute('content') == man.get('theme_color'))
        sizes = {}
        for ic in man.get('icons', []):
            r = ctx.request.get(urljoin(m['url'], ic['src']))
            got = png_size(r.body()) if r.ok else None
            sizes[(ic['sizes'], ic.get('purpose', 'any'))] = got
            check(f"icon {ic['src']} ({ic['sizes']}, {ic.get('purpose', 'any')}) loads as a PNG of that size", r.ok and got is not None and f'{got[0]}x{got[1]}' == ic['sizes'], f'{r.status} {got}')
        check('icons: 192 px and 512 px for any purpose, and a maskable 512 px', ('192x192', 'any') in sizes and ('512x512', 'any') in sizes and ('512x512', 'maskable') in sizes, str(list(sizes)))

        # 3. the service worker (before the installability check: Chrome asks for one that controls the page)
        ready = page.evaluate("""async () => { const r = await Promise.race([navigator.serviceWorker.ready, new Promise((res) => setTimeout(() => res(null), 15000))]); return r ? { scope: r.scope, state: r.active && r.active.state, script: r.active && r.active.scriptURL } : null; }""")
        check('a service worker is registered for the whole site and active', bool(ready) and ready['scope'] == url and ready['script'] == url + 'sw.js', str(ready))
        page.wait_for_function('navigator.serviceWorker.controller !== null', timeout=15000)
        check('it controls the page on the first visit (no reload needed before going offline)', page.evaluate('!!navigator.serviceWorker.controller'))
        kept = page.evaluate("""async () => { const keys = (await caches.keys()).filter((k) => k.startsWith('talk-partner-')); const c = await caches.open(keys[0]); return { caches: keys.length, urls: (await c.keys()).map((r) => new URL(r.url).pathname) }; }""")
        loaded = page.evaluate("""() => [...new Set(performance.getEntriesByType('resource').map((e) => new URL(e.name)).filter((u) => u.origin === location.origin).map((u) => u.pathname))].filter((p) => p !== '/sw.js')""")
        missing = [u for u in loaded if u not in kept['urls']]
        check('one cache for this build, holding the page and every file the page loaded (script, style, fonts, icons, manifest)', kept['caches'] == 1 and '/' in kept['urls'] and not missing and any(u.endswith('.js') for u in kept['urls']) and any(u.endswith('.css') for u in kept['urls']) and any('/fonts/' in u for u in kept['urls']), f"missing {missing}; kept {len(kept['urls'])}")

        # (phase 11) the pictures made with Gemini are kept too, though the first screen loads only a few of them (90 since phase 12b: the manifest's count)
        pics = [u for u in kept['urls'] if u.startswith('/pictures/') and u.endswith('.webp')]
        want = len(json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'devlog', 'quota_probe_2026-11-20', 'ASSET_MANIFEST.json'))))
        check(f'phase 11: the cache holds every picture file ({want} WebP in /pictures/), not only the ones the page has shown', len(pics) == want, str(len(pics)))

        # 2. Chrome's installability check
        inst = cdp.send('Page.getInstallabilityErrors')
        errs = [e.get('errorId') for e in inst.get('installabilityErrors', [])]
        check("Chrome's installability check reports no error", not errs, str(errs))

        # 4. no connection
        before = len(outside)
        ctx.set_offline(True)
        gone = page.evaluate("fetch('/not-kept-' + Date.now()).then(() => 'reached', () => 'failed')")
        check('the connection is really off: a request for a file that is not kept fails', gone == 'failed', gone)
        page.reload()
        page.wait_for_selector('main.simple.home', timeout=15000)
        home = text(page)
        check('offline: the page loads again from the kept copy, with the first screen whole', "When the words won't come, let them point." in home and 'How it works: 4 steps' in home and page.locator('.topic').count() == 7, home[:160])
        check('offline: the fonts are the app\'s own, loaded from the kept copy', page.evaluate("document.fonts.check('700 20px \"Instrument Sans\"')"))
        page.wait_for_timeout(1500)
        check('offline: the AI line says the AI needs the internet, and what works without it', 'You are offline, and that AI needs the internet. The topic questions and "Needs something now?" work without it.' in text(page, '#ai-line'), text(page, '#ai-line'))
        page.locator('.topic[data-topic=food]').click()
        page.locator('.tq', has_text='tea or coffee').click()
        page.wait_for_selector('main.simple.card #made-where')
        check('offline: a topic question makes its choices by the rules', page.locator('#made-where').get_attribute('data-maker') == 'code' and page.locator('#person .pt').count() == 3)
        page.locator('[data-act=show]').click()
        page.wait_for_selector('main.pv .pt')
        # (phase 11) the pictures of the card are the Gemini files, drawn from the kept copy: loaded, not broken, not swapped
        page.wait_for_function("[...document.querySelectorAll('main.pv .pt img.pic')].every((i) => i.complete)", timeout=5000)
        shown = page.evaluate("[...document.querySelectorAll('main.pv .pt')].map((t) => { const i = t.querySelector('img.pic'); return i ? [i.alt, i.naturalWidth, Math.round(i.getBoundingClientRect().width)] : null; })")
        check('offline (phase 11): the card shows its pictures from the kept copy: tea and coffee, each a loaded 256 px WebP of 128 px, and the way out our dashed drawing', [x[0] for x in shown if x] == ['tea', 'coffee'] and page.locator('main.pv .pt.esc svg [stroke-dasharray]').count() == 1 and page.locator('main.pv .pt.esc img').count() == 0 and all(x[1] == 256 for x in shown if x) and all(x[2] >= 100 for x in shown[:2] if x), str(shown))
        page.locator('main.pv .pt', has_text='tea').click()
        page.locator('[data-confirm=yes]').click()
        page.wait_for_selector('.p-give')
        page.locator('.p-give').click()
        page.wait_for_selector('main.simple.s-answered')
        check('offline: the person\'s screens work to "Give the phone back", and the carer sees the answer', text(page, '#chose') == 'Would you like tea or coffee? Tea', text(page)[:200])
        page.locator('#more').click()
        check('offline: "Today in short" is written (by the rules, on this phone)', page.locator('#today-short[data-source=rules]').count() == 1)
        page.locator('.btn[data-act=needs]').first.click()
        page.wait_for_selector('main.pv .p-tiles.board')
        check('offline: quick needs opens, ten tiles with their pictures (nine needs since phase 5, and the way out)', page.locator('main.pv .pt').count() == 10 and page.locator('main.pv .pt :is(svg, img.pic)').count() == 10)
        page.locator('#exit').dispatch_event('pointerdown')
        # (phase 8: the press and hold gives the phone back to the carer's screen the board was opened from: the answer)
        page.wait_for_selector('main.simple.s-answered, main.simple.card', timeout=4000)
        page.locator('[data-act=home]').click()
        page.goto(url + '#/about')
        page.wait_for_selector('main.about-simple')
        page.locator('.rowhead[data-row=names]').click()
        page.fill('input[data-field=personName]', 'Rosa')
        page.wait_for_timeout(600)
        page.reload()
        page.wait_for_selector('main.about-simple')
        check('offline: About them opens, and what is typed is kept on this phone across a reload', 'Rosa' in text(page))
        page.goto(url)
        page.wait_for_selector('main.simple.home')
        check('offline: the first screen names the person from About them', "let Rosa point." in text(page))
        # (phase 10) the home-screen shortcut's address, with no connection: the person's own start, three starters and the way out
        page.goto(url + '#/turn')
        page.wait_for_selector('main.pv .pt')
        st = [w.strip() for w in page.locator('main.pv .pt').all_inner_texts()]
        check('offline (phase 10): the shortcut\'s address /#/turn opens the person\'s own start', st == ['I need something', 'I want to talk about…', 'I feel…', 'something else'] and page.evaluate('location.hash') == '#/person', str(st))
        page.locator('#exit').dispatch_event('pointerdown')
        page.wait_for_selector('main.simple', timeout=4000)
        page.goto(url)
        page.wait_for_selector('main.simple.home')
        page.locator('.topic[data-topic=plans]').click()
        check('offline: the one open topic question is tagged "needs internet: you are offline"', text(page, '#ai-tag') == 'needs internet: you are offline', text(page, '#ai-tag'))
        page.locator('.tq', has_text='this weekend').click()
        page.wait_for_selector('main.simple.nocard')
        nocard = text(page)
        check('offline: a question that needs online help gets a clear "needs the internet" state', page.locator('#offline').count() == 1 and 'This question needs the internet, and you are offline.' in nocard, nocard[:240])
        check('offline: no consent sheet and no "Use online help" button that could not work', page.locator('#sheet').count() == 0 and page.locator('[data-act=sheet]').count() == 0)
        check('offline: the app asked nothing of any other host', len(outside) == before, str(outside[before:]))

        # 5. the connection is back
        ctx.set_offline(False)
        page.wait_for_selector('[data-act=sheet]', timeout=5000)
        check('online again: the same screen offers online help again, without a reload', page.locator('#offline').count() == 0)
        page.locator('[data-act=sheet]').click()
        page.wait_for_selector('#sheet')
        check('online again: the consent sheet comes up with the line that would go', page.locator('#sheet-line').inner_text().strip() == f'Partner asks: {OPEN_Q}')
        page.locator('[data-act=sheet-no]').click()
        check('no page error in the whole run', not errors, '; '.join(errors))
        check('the run asked nothing of any other host ("Yes" was never pressed)', len(outside) == before, str(outside[before:]))
        ctx.close()
    bad = results.count(False)
    print(f'\n{len(results) - bad} of {len(results)} checks passed')
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
