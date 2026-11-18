#!/usr/bin/env python3
"""Phase 4 against REAL models, through Firebase AI Logic (no stand-in). Two parts, each optional:

  --port 9335   a desktop Chrome that has Gemini Nano, on that remote debugging port (as scripts/e2e-ondevice.mjs):
                1. the image spike as the app runs it: "Talk about a photo" -> pick a photo -> "Ask the AI on this
                   device to look at it" -> the engine's `lookDevice` (ONLY_ON_DEVICE, the photo as inline JPEG);
                   the SDK's own `inferenceSource`, the words code kept, and every host contacted meanwhile;
                2. the first-letter helper with a letter no word of About them starts with: the on-device step adds words.
  --cloud       a Chromium with no model, online help turned on by the sheet's "Yes": the first-letter step through
                the cloud model, with the request as the sheet showed it. The family here is made up (the Millers).

It needs the dev server (npm run dev, port 5179: the App Check debug token works there only). The log goes to
devlog/evidence_phase4/AI_RUN_LOG.md, screenshots next to it. What the browser kept for this address before the run
(About them, photos, settings) is put back afterwards.
"""
import argparse
import datetime
import importlib.util
import os
import re
import subprocess
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'devlog', 'evidence_phase4')
spec = importlib.util.spec_from_file_location('e2e', os.path.join(HERE, 'e2e-simple.py'))
e2e = importlib.util.module_from_spec(spec)
spec.loader.exec_module(e2e)
lines = []
results = []


def log(s=''):
    lines.append(s)
    print(s)


def check(name, ok, detail=''):
    results.append(bool(ok))
    log(f"- {'PASS' if ok else '**FAIL**'}  {name}{f'  ({detail})' if detail else ''}")


def redact(s):
    return re.sub(r'AIza[\w-]{30,}', '[key]', re.sub(r'[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}', '[token]', s, flags=re.I))


def watch(page, host):
    seen = {'console': [], 'hosts': []}
    page.on('console', lambda m: seen['console'].append(m.text) if '[ai-logic]' in m.text else None)
    page.on('request', lambda r: seen['hosts'].append(urlparse(r.url).hostname) if urlparse(r.url).hostname not in (host, None) and not r.url.startswith(('data:', 'blob:')) else None)
    return seen


def seed(page, url, cloud=False):
    profile, photos = e2e.miller_p4()
    page.goto(url)
    page.wait_for_selector('main.simple.home, #app > *')
    before = {k: page.evaluate(e2e.KV_GET, k) for k in ('profile', 'photos', 'settings', 'visit')}
    page.evaluate(e2e.KV_PUT, {'profile': profile, 'photos': photos, 'settings': {'cloudHelp': False, 'support': 'more', 'welcomed': False, 'firstCard': True, 'howFolded': True, 'view': 'simple'}})
    page.reload()
    page.wait_for_selector('main.simple.home')
    return before


def restore(page, before):
    page.evaluate(e2e.KV_PUT, {k: v for k, v in before.items()})


def shot(page, name):
    page.wait_for_timeout(300)
    page.screenshot(path=os.path.join(OUT, f'{name}.png'), full_page=True)
    log(f'- screenshot: `devlog/evidence_phase4/{name}.png`')


def on_device(p, port, url):
    host = urlparse(url).hostname
    b = p.chromium.connect_over_cdp(f'http://127.0.0.1:{port}')
    ctx = b.contexts[0]
    page = ctx.new_page()
    page.set_viewport_size({'width': 390, 'height': 844})
    seen = watch(page, host)
    log(f'\n## 1. On this device: Chrome {b.version}, Gemini Nano, attached on port {port}\n')
    before = seed(page, url)
    try:
        ua = page.evaluate('navigator.userAgent')
        avail = page.evaluate("(async () => { const lm = globalThis.LanguageModel; if (!lm) return 'no LanguageModel'; return { text: await lm.availability({ expectedInputs: [{ type: 'text', languages: ['en'] }], expectedOutputs: [{ type: 'text', languages: ['en'] }] }), image: await lm.availability({ expectedInputs: [{ type: 'text', languages: ['en'] }, { type: 'image' }], expectedOutputs: [{ type: 'text', languages: ['en'] }] }) }; })()")
        log(f'- user agent: `{ua}`')
        log(f'- `LanguageModel.availability` with text only, and with text and an image: `{avail}`')
        check('the browser\'s model reports that it takes an image', isinstance(avail, dict) and avail.get('image') == 'available', str(avail))

        log('\n### 1a. Talk about a photo: the on-device model looks at the photo\n')
        page.locator('#phototalk-link').click()
        page.wait_for_selector('#pt-grid')
        page.locator('.pt-photo', has_text='Bo').click()
        page.wait_for_selector('#pt-questions')
        try:
            page.wait_for_selector('#pt-look', timeout=60000)
        except Exception:
            page.reload()
            page.wait_for_selector('#pt-look', timeout=60000)
        check('where the browser has the model, the carer is offered "Ask the AI on this device to look at it"', page.locator('#pt-look').count() == 1, e2e.text(page, '#pt-look-why'))
        seen['hosts'].clear()
        n0 = len(seen['console'])
        page.locator('#pt-look').click()
        page.wait_for_selector('#pt-by[data-by=device], #pt-look-none', timeout=180000)
        look = [c for c in seen['console'][n0:] if 'leg=look' in c]
        log(f'- the photo: `tests/fixtures/photo-bo.jpg` (our drawing of a dog; until phase 5 this run used the red mug of photo-mug.jpg), under the word "Bo", as About them keeps it')
        log(f'- SDK report (console): `{look[0] if look else "none"}`')
        check('the SDK reported inferenceSource=on_device for the photo step (leg=look, ONLY_ON_DEVICE)', bool(look) and 'inferenceSource=on_device' in look[0] and 'mode=ONLY_ON_DEVICE' in look[0])
        ai = page.locator('[data-act=pt-ask][data-ai]')
        got = e2e.text(page, '[data-act=pt-ask][data-ai]') if ai.count() else e2e.text(page, '#pt-look-none')
        log(f'- the question code made from what the model named: "{got}"')
        check('code kept at least two of the model\'s words and made one more question from them', ai.count() == 1 and 'What in this photo shall we talk about?' in got, got)
        check('the screen says the AI on this device looked, and that the photo did not leave it', 'The photo did not leave this device.' in e2e.text(page, '#pt-by'), e2e.text(page, '#pt-by'))
        check('no host but the app\'s own was contacted while the model looked at the photo', not seen['hosts'], ', '.join(sorted(set(seen['hosts']))))
        shot(page, 'ai_01_on_device_model_looked_at_the_photo')
        if ai.count():
            ai.click()
            page.wait_for_selector('main.simple.card')
            page.locator('[data-act=show]').click()
            page.wait_for_selector('main.pv.with-photo .pt')
            tiles = [t.strip() for t in page.locator('main.pv .pt').all_inner_texts()]
            log(f'- on the person\'s screen: the photo, "{e2e.text(page, "#person .p-ask")}", and {tiles}')
            check('the person\'s card has at most three of those words and "something else"', 2 <= len(tiles) - 1 <= 3 and tiles[-1] == 'something else', str(tiles))
            shot(page, 'ai_02_person_what_in_this_photo')
            e2e.hold_exit(page)
            page.wait_for_timeout(900)

        log('\n### 1b. The first letter, a letter no word of About them starts with: the on-device step adds words\n')
        page.locator('[data-act=home]').click()
        page.wait_for_selector('main.simple.home')
        e2e.ask_topic(page, 'food', 'Would you like tea or coffee?')
        e2e.answer(page, 'something else')
        page.locator('#letter-go').click()
        page.wait_for_selector('#abc')
        seen['hosts'].clear()
        n0 = len(seen['console'])
        page.locator('[data-letter=S]').click()
        page.wait_for_selector('main.pv .pt, main.simple.nocard', timeout=120000)
        rules_s = [t.strip() for t in page.locator('main.pv .pt').all_inner_texts()]
        s_rep = [c for c in seen['console'][n0:] if 'leg=private' in c]
        log(f'- "S" (About them has no word with S; the everyday words have one, "snack"): on the card {rules_s}')
        log(f'- SDK report (console): `{s_rep[0] if s_rep else "none"}`')
        e2e.hold_exit(page)
        page.wait_for_timeout(900)
        page.locator('[data-act=home]').click()
        e2e.ask_topic(page, 'food', 'Would you like tea or coffee?')
        e2e.answer(page, 'something else')
        page.locator('#letter-go').click()
        page.wait_for_selector('#abc')
        n0 = len(seen['console'])
        seen['hosts'].clear()
        page.locator('[data-letter=H]').click()
        page.wait_for_selector('main.pv .pt, main.simple.nocard', timeout=120000)
        priv = [c for c in seen['console'][n0:] if 'leg=private' in c]
        words = [t.strip() for t in page.locator('main.pv .pt').all_inner_texts()]
        log(f'- "H" (About them has no word with H; the everyday words have one, "hearing aid"): on the card {words}')
        log(f'- SDK report (console): `{priv[0] if priv else "none"}`')
        check('the on-device step ran for the letter (leg=private, ONLY_ON_DEVICE, inferenceSource=on_device)', bool(priv) and 'inferenceSource=on_device' in priv[0])
        check('every word on the card starts with H, and the way out is there', len(words) >= 2 and words[-1] == 'something else' and all(re.sub(r'^(the|a|an|my|your) ', '', w.lower()).startswith('h') for w in words[:-1]), str(words))
        check('no host but the app\'s own was contacted for the letter step', not seen['hosts'], ', '.join(sorted(set(seen['hosts']))))
        page.screenshot(path=os.path.join(OUT, 'ai_03_letter_H_words_on_device.png'))
        log('- screenshot: `devlog/evidence_phase4/ai_03_letter_H_words_on_device.png`')
    finally:
        restore(page, before)
        page.close()


def cloud(p, url):
    host = urlparse(url).hostname
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True, user_agent=e2e.PHONE_UA, service_workers='block')
    page = ctx.new_page()
    seen = watch(page, host)
    log(f'\n## 2. Online help: Chromium {b.version} (headless, no model in the browser), as a phone\n')
    seed(page, url)
    e2e.ask_topic(page, 'food', 'Would you like tea or coffee?')
    e2e.answer(page, 'something else')
    page.locator('#letter-go').click()
    page.wait_for_selector('#abc')
    page.locator('[data-letter=K]').click()
    page.wait_for_selector('#sheet')
    line = e2e.text(page, '#sheet-line')
    whole = page.locator('#sheet-whole pre').text_content()
    log(f'- the sheet\'s line: "{line}"')
    check('before the yes nothing was asked of any other host', not seen['hosts'], ', '.join(sorted(set(seen['hosts']))))
    check('the request the sheet shows holds no word of About them', not re.search(r'\b(?:Frank|Carol|Beth|Tom|Bo|ginger|porridge|lake)\b', whole))
    page.screenshot(path=os.path.join(OUT, 'ai_04_letter_K_sheet.png'))
    page.locator('[data-act=sheet-yes]').click()
    page.wait_for_selector('main.simple.card #letter-by, main.simple.nocard .why-not', timeout=60000)
    page.wait_for_timeout(500)
    rep = [c for c in seen['console'] if 'leg=stripped' in c]
    log(f'- SDK report (console): `{rep[-1] if rep else "none"}`')
    made = page.locator('#letter-by').count() == 1
    words = [t.strip() for t in page.locator('#person .pt').all_inner_texts()] if made else []
    log(f'- on the card: {words if made else e2e.text(page, ".why-not")}')
    check('the cloud step ran through Firebase AI Logic (leg=stripped, PREFER_IN_CLOUD, inferenceSource=in_cloud)', bool(rep) and 'inferenceSource=in_cloud' in rep[-1])
    check('every word on the card starts with K, and the way out is there', made and words[-1] == 'something else' and all(w.lower().startswith('k') for w in words[:-1]), str(words))
    if made:
        check('the card says that online help added words, and what it got', page.locator('#letter-by').get_attribute('data-by') == 'cloud' and page.locator('#made-where').get_attribute('data-left') == 'sent', e2e.text(page, '#letter-by'))
    log(f'- hosts contacted after the yes: {", ".join(sorted(set(h for h in seen["hosts"] if h))) or "none"}')
    shot(page, 'ai_05_letter_K_words_from_online_help')
    # a hard letter, with online help now on: whatever the model answers, only words that start with the letter may stand
    page.locator('[data-act=home]').click()
    e2e.ask_topic(page, 'food', 'Would you like tea or coffee?')
    e2e.answer(page, 'something else')
    page.locator('#letter-go').click()
    page.wait_for_selector('#abc')
    n0 = len(seen['console'])
    page.locator('[data-letter=X]').click()
    page.wait_for_selector('main.pv .pt, main.simple.nocard .why-not', timeout=60000)
    page.wait_for_timeout(400)
    xs = [t.strip() for t in page.locator('main.pv .pt').all_inner_texts()]
    said = e2e.text(page, '.why-not') if page.locator('.why-not').count() else ''
    log(f'- "X" with online help on (SDK: `{([c for c in seen["console"][n0:] if "leg=stripped" in c] or ["none"])[-1]}`): {xs if xs else said}')
    check('a hard letter ("X"): either every word starts with X, or the carer is told plainly that none was found; a word that does not start with the letter never stands', (xs and all(w.lower().startswith('x') for w in xs[:-1])) or said == 'No more words that start with X were found. Ask them to show you, or write it down together.', f'{xs} {said}')
    b.close()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--url', default='http://localhost:5179/')
    ap.add_argument('--port', type=int, default=0)
    ap.add_argument('--cloud', action='store_true')
    a = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)
    git = lambda c: subprocess.run(['git'] + c.split(), capture_output=True, text=True, cwd=os.path.join(HERE, '..')).stdout.strip()
    log('# Phase 4 against real models (Firebase AI Logic)\n')
    log(f'- date: {datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds")}')
    log(f'- commit: `{git("rev-parse HEAD")}`; working tree {"clean" if not git("status --porcelain --untracked-files=no") else "with changes not yet committed"}')
    log(f'- app: {a.url} (the dev server), the simple view, the made-up Miller family (Frank; Carol asking; Beth, Tom; ginger biscuits, porridge; the lake, church; Bo the dog)')
    log('- SDK: firebase 13.3.0, @firebase/ai 3.1.0')
    with sync_playwright() as p:
        if a.port:
            on_device(p, a.port, a.url)
        if a.cloud:
            cloud(p, a.url)
    bad = results.count(False)
    log(f'\n{len(results) - bad} of {len(results)} checks passed')
    open(os.path.join(OUT, 'AI_RUN_LOG.md'), 'w').write(redact('\n'.join(lines)) + '\n')
    raise SystemExit(1 if bad else 0)


if __name__ == '__main__':
    main()
