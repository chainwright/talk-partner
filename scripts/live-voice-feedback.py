#!/usr/bin/env python3
"""Voice input and the feedback form, in two real browsers against one copy of the app (the hosted site by default).

  python3 scripts/live-voice-feedback.py [--url https://talk-partner.web.app/] [--wav question.wav] [--out DIR]
                                         [--no-send]

Needs Python Playwright with its bundled Chromium, and Google Chrome installed (it is not a dependency of the app;
`pip install playwright && playwright install chromium`). Both browsers run headless with Chrome's fake microphone,
which plays the WAV file given (a spoken question; on a Mac: say -o question.wav --data-format=LEI16@48000 "Do you
want coffee or tea?").

In BOTH browsers: the page loads without crashing (the 'crash' event is listened for), the microphone button is
there, its first press shows the notice and records nothing, a yes starts a recording, and the feedback form opens
and refuses an empty note. In the FIRST browser the recording is then dropped, so nothing is sent.

In the LAST browser only, and only without --no-send: ONE recording is sent (one model call through Firebase AI
Logic; the SDK's own report of where it ran is read from the app's console line), and ONE feedback note is written
to Cloud Firestore, marked as a test. So a full run makes exactly one cloud model call and one database write.

Exit code 0 only if every check passes.
"""
import argparse, json, os, re, subprocess, sys, time
from datetime import datetime, timezone
from playwright.sync_api import sync_playwright

ap = argparse.ArgumentParser()
ap.add_argument('--url', default='https://talk-partner.web.app/')
ap.add_argument('--wav', default='')
ap.add_argument('--out', default='')
ap.add_argument('--no-send', action='store_true')
args = ap.parse_args()
URL = args.url.rstrip('/') + '/'
results = []


def check(name, ok, detail=''):
    results.append(bool(ok))
    print(f"{'PASS' if ok else 'FAIL'}  {name}" + (f"  ({detail})" if detail else ''), flush=True)


try:
    commit = subprocess.check_output(['git', 'rev-parse', 'HEAD']).decode().strip()
except Exception:
    commit = 'unknown'
print(f"voice input and feedback against {URL}; script at commit {commit}; {datetime.now(timezone.utc).isoformat(timespec='seconds')}")

FLAGS = ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream']
if args.wav:
    FLAGS.append(f"--use-file-for-fake-audio-capture={os.path.abspath(args.wav)}%noloop")
BROWSERS = [('Playwright\'s bundled Chromium', {}), ('Google Chrome (channel "chrome")', {'channel': 'chrome'})]
TEST_NOTE = f"TEST 17 Nov 2026: automated check of the feedback form (scripts/live-voice-feedback.py, {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M')} UTC). Not a real note."

with sync_playwright() as p:
    for i, (label, opts) in enumerate(BROWSERS):
        send = (i == len(BROWSERS) - 1) and not args.no_send
        browser = p.chromium.launch(headless=True, args=FLAGS, **opts)
        version = browser.version
        tag = f"[{version.split('.')[0]}]"
        print(f"\n== {label}: {version} ({'one recording and one feedback note are sent' if send else 'nothing is sent'})")
        ctx = browser.new_context(viewport={'width': 1280, 'height': 900})
        page = ctx.new_page()
        crashed, errors, console, commits = [], [], [], []
        page.on('crash', lambda _p: crashed.append(1))
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('console', lambda m: console.append(m.text))

        def on_response(r):
            if 'firestore.googleapis.com' in r.url and r.request.method == 'POST':
                commits.append(r.status)
        page.on('response', on_response)

        page.goto(URL + '#/demo', wait_until='load')
        page.wait_for_selector('.chip', timeout=20000)
        page.wait_for_timeout(2500)  # the old build crashed the tab right after load: give it the time to
        bundle = page.evaluate("[...document.scripts].map((s) => s.src).filter(Boolean).map((s) => s.split('/').pop()).join(',')")
        print(f"   bundle: {bundle}")
        tiles = page.evaluate("[...document.querySelectorAll('#person .tile span')].map((e) => e.innerText)")
        check(f"{tag} the page loads and stays up: no crash, no page error, the first card is on screen", not crashed and not errors and tiles == ['coffee', 'tea', 'something else'], json.dumps({'crashed': len(crashed), 'errors': errors[:3], 'tiles': tiles}))
        gone = page.evaluate("({ sr: document.documentElement.innerHTML.includes('SpeechRecognition'), mic: !!document.querySelector('#mic'), label: document.querySelector('#mic')?.getAttribute('aria-label') })")
        check(f"{tag} the microphone button is there", gone['mic'] and gone['label'] == 'Speak your question', json.dumps(gone))

        page.click('#mic')
        notice = page.inner_text('#voice')
        check(f"{tag} its first press shows the notice (the recording goes to Google's cloud) and records nothing", 'sends the recording to Google\'s cloud' in notice and page.get_attribute('#mic', 'data-phase') == 'idle', notice[:120])
        page.click('[data-act="voice-ok"]')
        page.wait_for_function("document.querySelector('#mic')?.dataset.phase === 'recording'", timeout=10000)
        rec = page.evaluate("({ pressed: document.querySelector('#mic').getAttribute('aria-pressed'), label: document.querySelector('#mic').getAttribute('aria-label'), line: document.querySelector('#voice').innerText })")
        check(f"{tag} after the yes it records: the button is lit and reads \"Stop recording\"", rec['pressed'] == 'true' and rec['label'] == 'Stop recording' and rec['line'].startswith('Recording.'), json.dumps(rec))
        if args.out:
            os.makedirs(args.out, exist_ok=True)
            page.screenshot(path=os.path.join(args.out, f"live-{version.split('.')[0]}-recording.png"))

        if not send:
            # typing takes over from the microphone: the recording is dropped and nothing is sent
            page.wait_for_timeout(1200)
            page.fill('#q', 'Do you need the toilet?')
            page.wait_for_timeout(1500)
            st = page.evaluate("({ phase: document.querySelector('#mic').dataset.phase, bytes: document.querySelector('#bytes').innerText.replace(/\\s+/g, ' ') })")
            voice_lines = [c for c in console if 'leg=voice' in c]
            check(f"{tag} the recording is dropped when the partner types instead: nothing sent, the figure still reads 0 bytes", st['phase'] == 'idle' and st['bytes'].startswith('0 bytes left this computer') and not voice_lines, json.dumps(st))
        else:
            page.wait_for_timeout(4000)  # the spoken question is about two seconds long
            page.click('#mic')
            try:
                page.wait_for_function("document.querySelector('#mic')?.dataset.phase === 'idle'", timeout=45000)
            except Exception:
                pass
            page.wait_for_timeout(500)
            st = page.evaluate("({ q: document.querySelector('#q').value, line: document.querySelector('#voice').innerText, bytes: document.querySelector('#bytes').innerText.replace(/\\s+/g, ' '), busy: document.querySelector('#make').disabled, cards: document.querySelectorAll('#result .badge').length })")
            voice_lines = [c for c in console if 'leg=voice' in c]
            print(f"   the field now holds: {st['q']!r}")
            print(f"   the app's console line for the call: {voice_lines}")
            print(f"   the session figure: {st['bytes']}")
            words = re.sub(r'[^a-z ]', '', st['q'].lower())
            check(f"{tag} ONE real model call through Firebase AI Logic turned the recording into the question's words, in the field, not submitted", len(voice_lines) == 1 and ('coffee' in words and 'tea' in words if args.wav else True) and 'Check the words' in st['line'], json.dumps({'q': st['q'], 'line': st['line']}))
            check(f"{tag} where it ran is the SDK's report for that call: inferenceSource=in_cloud, mode ONLY_IN_CLOUD", len(voice_lines) == 1 and 'mode=ONLY_IN_CLOUD' in voice_lines[0] and 'inferenceSource=in_cloud' in voice_lines[0], voice_lines[0] if voice_lines else 'no line')
            check(f"{tag} the session figure counts the recording and no longer says \"0 bytes left this computer\"", re.match(r"^[\d,]+ bytes handed to Google's cloud by this app 1 recording of a spoken question", st['bytes']) is not None, st['bytes'][:140])
            if args.out:
                page.screenshot(path=os.path.join(args.out, f"live-{version.split('.')[0]}-transcribed.png"))

        # the feedback form
        page.goto(URL + '#/feedback')
        page.wait_for_selector('#fb-text', timeout=10000)
        form = page.evaluate("({ warn: document.querySelector('.fb-warn').innerText, send: document.querySelector('#fb-send').disabled, roles: [...document.querySelectorAll('#fb-role option')].map((o) => o.value), max: document.querySelector('#fb-text').maxLength })")
        page.click('#fb-send')
        page.wait_for_timeout(400)
        empty = page.inner_text('#fb-status')
        check(f"{tag} the feedback form opens (the line about patient details, the optional role and email) and refuses an empty note without sending", form['warn'].startswith("Please don't include patient details") and form['roles'] == ['', 'slt', 'carer', 'person', 'other'] and form['max'] == 1000 and not form['send'] and 'Write a few words first' in empty and not commits, json.dumps({'empty': empty, 'requests': commits}))
        if send:
            page.fill('#fb-text', TEST_NOTE)
            page.select_option('#fb-role', 'other')
            page.click('#fb-send')
            try:
                page.wait_for_selector('.fb-sent', timeout=45000)
            except Exception:
                pass
            status = page.inner_text('#fb-status')
            ids = [c.split(': ')[1] for c in console if c.startswith('[feedback] written: ')]
            print(f"   feedback note: {TEST_NOTE!r}, role 'other', no email")
            print(f"   the server's answers to the write: {commits}; document id: {ids}")
            check(f"{tag} ONE feedback note, marked as a test, was written to Cloud Firestore: the server answered 200 and the app has the new document's id", 'Thank you' in status and commits == [200] and len(ids) == 1, json.dumps({'status': status, 'http': commits, 'id': ids}))
            if args.out:
                page.screenshot(path=os.path.join(args.out, f"live-{version.split('.')[0]}-feedback-sent.png"))
        check(f"{tag} to the end of the run: no crash and no page error", not crashed and not errors, json.dumps({'crashed': len(crashed), 'errors': errors[:3]}))
        browser.close()

print(f"\n{sum(results)}/{len(results)} passed")
sys.exit(0 if all(results) else 1)
