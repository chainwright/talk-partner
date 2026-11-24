#!/usr/bin/env python3
"""Read aloud against the REAL model, through Firebase AI Logic (no stand-in): phase 5, 18 Nov 2026.

A Chromium with no on-device model, as a phone (390 x 844, Android user agent), on the dev server (npm run dev: the
App Check debug token works there only). The carer asks a topic question that the rules make a card for (no AI in the
card), turns Read aloud on by the sheet's "Yes", and shows the card: the engine's `speak` (ONLY_IN_CLOUD, a Gemini
text-to-speech model) is asked for the words of that card. What is recorded: the SDK's own report (the console line
`[ai-logic] leg=speak …`), the sound that came back (type, bytes, seconds), every host contacted, that "Hear it
again" asks nothing a second time, and that a doctor-visit card is never read aloud.

  python3 scripts/e2e-speak.py [--url http://localhost:5180/] [--out devlog/evidence_phase5]

The made-up family (the Millers) is used; the words sent are the words of the cards named in the log.
"""
import argparse
import datetime
import importlib.util
import os
import subprocess
import sys
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('e2e', os.path.join(HERE, 'e2e-simple.py'))
e2e = importlib.util.module_from_spec(spec)
spec.loader.exec_module(e2e)
lines, results = [], []


def log(s=''):
    lines.append(s)
    print(s)


def check(name, ok, detail=''):
    results.append(bool(ok))
    log(f"- {'PASS' if ok else 'FAIL'}: {name}{f' ({detail})' if detail and not ok else ''}")


HOOK = """() => { window.__sounds = []; window.__plays = 0;
  const make = URL.createObjectURL.bind(URL);
  URL.createObjectURL = (b) => { const u = make(b); window.__sounds.push({ type: b.type, bytes: b.size }); return u; };
  const play = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () { window.__plays++; return play.call(this).catch(() => {}); }; }"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--url', default='http://localhost:5180/')
    ap.add_argument('--out', default=os.path.join(HERE, '..', 'devlog', 'evidence_phase5'))
    a = ap.parse_args()
    url = a.url if a.url.endswith('/') else a.url + '/'
    host = urlparse(url).hostname
    os.makedirs(a.out, exist_ok=True)
    head = subprocess.run(['git', 'rev-parse', '--short', 'HEAD'], capture_output=True, text=True, cwd=HERE).stdout.strip()
    dirty = bool(subprocess.run(['git', 'status', '--porcelain', '--untracked-files=no'], capture_output=True, text=True, cwd=HERE).stdout.strip())
    log('# Read aloud against the real model (Firebase AI Logic)')
    log()
    log(f'- when: {datetime.datetime.utcnow().strftime("%d %b %Y, %H:%M UTC")}; commit `{head}`{" with uncommitted changes" if dirty else ", working tree clean"}; `{url}` ({"the dev server, App Check debug token" if urlparse(url).hostname in ("localhost", "127.0.0.1") else "the hosted copy, App Check with reCAPTCHA Enterprise"})')
    with sync_playwright() as p:
        headed = os.environ.get('HEADED') == '1'  # a hosted copy: App Check (reCAPTCHA Enterprise) refuses a headless browser
        b = p.chromium.launch(headless=not headed)
        log(f'- browser: Chromium {b.version} ({"a normal window" if headed else "headless"}), 390 x 844, Android user agent: no on-device model')
        ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True, user_agent=e2e.PHONE_UA)
        hosts, console = [], []
        ctx.on('request', lambda r: hosts.append(urlparse(r.url).hostname) if urlparse(r.url).hostname not in (host, None) else None)
        page = ctx.new_page()
        page.add_init_script(f'({HOOK})()')
        page.on('console', lambda m: console.append(m.text))
        page.on('dialog', lambda d: d.accept())
        week, _photos = e2e.miller_p4()
        page.goto(url)
        page.wait_for_selector('main.simple.home')
        page.evaluate(e2e.KV_PUT, {'profile': week, 'settings': {'cloudHelp': False, 'support': 'more', 'welcomed': False, 'firstCard': True, 'howFolded': True}})
        page.reload()
        page.wait_for_selector('main.simple.home')
        check('before anything is asked, no other host was contacted', not hosts, str(sorted(set(hosts))))
        log()
        log('## 1. A topic card (made by the rules), read aloud')
        e2e.ask_topic(page, 'food', 'Would you like tea or coffee?')
        check('the card is made by the rules and nothing was sent for it', page.locator('#made-where').get_attribute('data-left') == 'nothing' and not hosts, e2e.text(page, '#made-where'))
        page.locator('#speak-offer').click()
        page.wait_for_selector('#speak-sheet')
        words = e2e.text(page, '#speak-sheet-text')
        log(f'- the sheet: "{e2e.text(page, "#speak-sheet-body")}"; the words it shows: "{words}"')
        check('the sheet shows the words before the yes, and still no other host was contacted', words == 'Would you like tea or coffee? Tea. Coffee. Or something else.' and not hosts)
        page.screenshot(path=os.path.join(a.out, 'ai_01_read_aloud_sheet.png'))
        page.locator('[data-act=speak-yes]').click()
        page.wait_for_selector('#speak[data-on="1"]')
        check('turning it on sends nothing by itself', not hosts, str(sorted(set(hosts))))
        page.locator('[data-act=show]').click()
        page.wait_for_selector('main.pv #hear, main.pv #hear-failed')
        try:
            page.wait_for_function("() => document.querySelector('#hear-failed') || (document.querySelector('#hear') && !document.querySelector('#hear').disabled)", timeout=60000)
        except Exception:
            pass
        said = [c for c in console if 'leg=speak' in c]
        sounds = page.evaluate('window.__sounds')
        failed = page.locator('#hear-failed').count() == 1
        log(f'- SDK report (console): `{said[0] if said else "none"}`')
        log(f'- the sound that came back: {sounds if sounds else "none"}; play() calls: {page.evaluate("window.__plays")}')
        if failed:
            errs = [c for c in console if 'App Check' in c or 'error' in c.lower()][:3]
            log(f'- the screen says: "{e2e.text(page, "#hear-failed")}"; console: {errs}')
        check('the SDK reported inferenceSource=in_cloud for the speech step (leg=speak, ONLY_IN_CLOUD)', bool(said) and 'mode=ONLY_IN_CLOUD' in said[0] and 'inferenceSource=in_cloud' in said[0], str(said[:1]))
        check('sound came back as a WAV the browser can play, and it was played once', bool(sounds) and sounds[0]['type'] == 'audio/wav' and sounds[0]['bytes'] > 20000 and page.evaluate('window.__plays') >= 1, str(sounds))
        if sounds:
            log(f'- length: about {(sounds[0]["bytes"] - 44) / 48000:.1f} s of 24 kHz 16-bit mono')
        log(f'- hosts contacted: {", ".join(sorted(set(hosts))) or "none"}')
        page.screenshot(path=os.path.join(a.out, 'ai_02_person_screen_hear_it_again.png'))
        check('the person\'s screen: the three choices and one button to hear it again', page.locator('main.pv .pt').count() == 3 and page.locator('#hear').count() == 1, e2e.text(page, 'main.pv')[:120])
        n_req, n_snd = len(hosts), len(sounds or [])
        if page.locator('#hear').count():
            page.locator('#hear').click()
            page.wait_for_timeout(1500)
        check('"Hear it again" plays the kept sound: no new request, no new sound', len(hosts) == n_req and len(page.evaluate('window.__sounds')) == n_snd and page.evaluate('window.__plays') >= 2, f'{len(hosts) - n_req} new requests')
        e2e.tap_yes(page, 'tea')
        e2e.give_back(page)
        e2e.more(page)
        check('the card says its words went to Google to be spoken, and never "Nothing was sent"', 'Read aloud is on: the words on this card went to Google to be spoken.' in e2e.text(page) and 'Nothing was sent.' not in e2e.text(page, '#left-line'), e2e.text(page, '#left-line'))
        log()
        log('## 2. A doctor-visit question is never read aloud')
        n_req = len(hosts)
        page.goto(url + '#/visit')
        page.wait_for_selector('#visit-start')
        page.locator('#visit-start').click()
        page.wait_for_selector('main.pv .pt')
        page.wait_for_timeout(2500)
        check('with Read aloud on, the visit question has no "Hear it" button and nothing was asked of another host', page.locator('#hear').count() == 0 and len(hosts) == n_req, f'{len(hosts) - n_req} new requests')
        b.close()
    bad = results.count(False)
    log()
    log(f'{len(results) - bad} of {len(results)} checks passed')
    open(os.path.join(a.out, 'AI_RUN_LOG.md'), 'w').write('\n'.join(lines) + '\n')
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
