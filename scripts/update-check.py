#!/usr/bin/env python3
"""A new deploy reaches people: build A is opened, the files on the server are swapped for build B, and the app shows B.

Why: on 17 Nov 2026 a phone showed a build an hour after a newer one was deployed. With a service worker in place that
must not happen. This script serves a copy of dist/ on its own port with the same cache headers as firebase.json
(index.html and sw.js: no-cache; /assets: immutable), marks each "build" with a <meta name="tp-build"> and its own
service worker version (as a real build has), swaps the served folder the way a deploy does, and checks in Chromium:

  1. reopen: A was opened and closed, B deployed -> the next open shows B at once (the page is asked from the network
     first, never from the browser's own cache), and the new worker takes over;
  2. offline after that: the kept copy is B, not A;
  3. the app left open on the first screen (an installed app stays in memory): coming back to it asks for a newer
     worker, and the page loads the new build by itself;
  4. the app left open in the middle of a question: it is NOT reloaded under the carer's hands; a bar says "A newer
     version is ready. Tap to update.", and one tap loads it;
  5. the person's full-screen card never shows that bar.

Usage: npm run build, then python3 scripts/update-check.py   (needs dist/; serves on 127.0.0.1:5181)
Exit code 0 when every check passes, 1 otherwise.
"""
import http.server
import json
import os
import re
import shutil
import sys
import tempfile
import threading

from playwright.sync_api import sync_playwright

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
DIST = os.path.join(ROOT, 'dist')
PORT = 5181
URL = f'http://127.0.0.1:{PORT}/'
PHONE_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36'
served = {'dir': None}
results = []


def check(name, ok, detail=''):
    results.append(bool(ok))
    print(f"{'PASS' if ok else 'FAIL'}  {name}{f'  ({detail})' if detail and not ok else ''}")


def headers_for(path):
    """The cache headers of firebase.json, read from the file itself."""
    conf = json.load(open(os.path.join(ROOT, 'firebase.json')))['hosting']['headers']
    out = {}
    for rule in conf:
        src = rule['source']
        hit = path.startswith(src[:-2]) if src.endswith('**') else path == src
        if hit:
            for h in rule['headers']:
                out[h['key']] = h['value']
    return out


class Handler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        rel = path.split('?')[0].split('#')[0].lstrip('/') or 'index.html'
        return os.path.join(served['dir'], rel)

    def do_GET(self):
        # every answer is the file as it is now: the copies are written within one second of each other, and a
        # "not modified since" answer by the file's time would hide the swap (a real deploy changes the ETag)
        for h in ('If-Modified-Since', 'If-None-Match'):
            if h in self.headers:
                del self.headers[h]
        super().do_GET()

    def end_headers(self):
        for k, v in headers_for(self.path.split('?')[0]).items():
            self.send_header(k, v)
        super().end_headers()

    def log_message(self, *a):
        pass


def make_build(tmp, mark):
    """A copy of dist/ as build `mark`: the page carries the mark, and the worker has its own version, as a new build has."""
    d = os.path.join(tmp, mark)
    shutil.copytree(DIST, d)
    p = os.path.join(d, 'index.html')
    html = open(p).read().replace('<head>', f'<head><meta name="tp-build" content="{mark}">', 1)
    open(p, 'w').write(html)
    p = os.path.join(d, 'sw.js')
    sw = open(p).read()
    sw2 = re.sub(r"const VERSION = \"([0-9a-f]+)\"", lambda m: f'const VERSION = "{m.group(1)}-{mark}"', sw, count=1)
    assert sw2 != sw, 'dist/sw.js has no VERSION line: run npm run build first'
    open(p, 'w').write(sw2)
    return d


def mark(page):
    return page.evaluate("document.querySelector('meta[name=tp-build]')?.content ?? null")


def version(page):
    """The version of the worker that controls the page, read from the name of its cache."""
    return page.evaluate("caches.keys().then((k) => k.filter((x) => x.startsWith('talk-partner-')).map((x) => x.split('-').pop()).sort().join(','))")


def controlled(page):
    page.wait_for_function('navigator.serviceWorker && navigator.serviceWorker.controller !== null', timeout=15000)


def come_back(page):
    """What the browser does when an app comes back to the front: the page hears `visibilitychange`."""
    page.evaluate("document.dispatchEvent(new Event('visibilitychange'))")


def main():
    if not os.path.exists(os.path.join(DIST, 'sw.js')):
        print('no dist/sw.js: run npm run build first')
        sys.exit(1)
    tmp = tempfile.mkdtemp(prefix='tp-update-')
    builds = {m: make_build(tmp, m) for m in 'ABCD'}
    served['dir'] = builds['A']
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), Handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    hdr = headers_for('/index.html').get('Cache-Control'), headers_for('/sw.js').get('Cache-Control'), headers_for('/').get('Cache-Control')
    check('firebase.json: index.html, "/" and sw.js are served with Cache-Control: no-cache', hdr == ('no-cache', 'no-cache', 'no-cache'), str(hdr))
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            print(f'browser: Chromium {browser.version} (headless)')
            ctx = browser.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, user_agent=PHONE_UA, service_workers='allow')
            # other hosts are never asked in this run
            ctx.route('**/*', lambda r: r.continue_() if r.request.url.startswith((URL, 'data:', 'blob:')) else r.abort())
            page = ctx.new_page()
            errors = []
            page.on('pageerror', lambda e: errors.append(str(e)))

            # ---- 1. build A is opened, then closed; B is deployed; the app is opened again
            page.goto(URL)
            page.wait_for_selector('main.simple.home')
            controlled(page)
            page.wait_for_timeout(800)
            check('build A is open, kept by its service worker', mark(page) == 'A' and version(page).endswith('A'), f'{mark(page)} {version(page)}')
            page.close()
            served['dir'] = builds['B']  # the deploy
            page = ctx.new_page()
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.goto(URL)
            page.wait_for_selector('main.simple.home')
            check('reopened after the deploy: the page is build B at once (asked from the network, not from the kept copy)', mark(page) == 'B', str(mark(page)))
            for _ in range(40):
                page.wait_for_timeout(500)
                try:
                    if version(page) == 'B':
                        break
                except Exception:
                    pass  # the page is loading the new build
            page.wait_for_selector('main.simple.home')
            check("the new build's worker took over and the old build's copy is deleted", version(page).endswith('B') and mark(page) == 'B', version(page))

            # ---- 2. with the connection off, the kept copy is the new build
            ctx.set_offline(True)
            page.reload()
            page.wait_for_selector('main.simple.home', timeout=15000)
            check('offline after the deploy: the kept copy is build B, not A', mark(page) == 'B', str(mark(page)))
            ctx.set_offline(False)
            page.reload()
            page.wait_for_selector('main.simple.home')
            controlled(page)

            # ---- 3. the app stays open on the first screen across a deploy
            served['dir'] = builds['C']
            come_back(page)
            page.wait_for_function("document.querySelector('meta[name=tp-build]')?.content === 'C'", timeout=25000)
            page.wait_for_selector('main.simple.home')
            check('left open on the first screen across a deploy: coming back to it loads build C by itself', mark(page) == 'C' and page.locator('#update-bar').count() == 0, str(mark(page)))
            controlled(page)

            # ---- 4. the app stays open in the middle of a question across a deploy
            page.locator('.topic[data-topic=food]').click()
            page.locator('.tq', has_text='tea or coffee').click()
            page.wait_for_selector('main.simple.card #made-where')
            served['dir'] = builds['D']
            come_back(page)
            page.wait_for_selector('#update-bar', timeout=25000)
            check('left open on a question across a deploy: the page is NOT reloaded under the carer\'s hands (still build C, the question still there)', mark(page) == 'C' and page.locator('main.simple.card').count() == 1 and 'Would you like tea or coffee?' in page.locator('#app').inner_text())
            bar = page.locator('#update-bar')
            box = bar.bounding_box()
            check('a bar at the top says "A newer version is ready. Tap to update.", at least 44 px tall', bar.inner_text().strip() == 'A newer version is ready. Tap to update.' and box['height'] >= 44 and box['y'] < 10, f"{bar.inner_text()} {box}")
            # ---- 5. the person's screen never shows it
            page.locator('[data-act=show]').click()
            page.wait_for_selector('main.pv .pt')
            check("the person's full-screen card does not show the bar", page.locator('#update-bar').count() == 0)
            page.go_back()
            page.wait_for_selector('main.simple.card')
            page.wait_for_selector('#update-bar')
            page.locator('#update-bar').click()
            page.wait_for_function("document.querySelector('meta[name=tp-build]')?.content === 'D'", timeout=15000)
            page.wait_for_selector('main.simple.home')
            check('one tap on the bar loads build D', mark(page) == 'D' and page.locator('#update-bar').count() == 0, str(mark(page)))
            check('no page error in the whole run', not errors, '; '.join(errors))
            browser.close()
    finally:
        srv.shutdown()
        shutil.rmtree(tmp, ignore_errors=True)
    bad = results.count(False)
    print(f'\n{len(results) - bad} of {len(results)} checks passed')
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
