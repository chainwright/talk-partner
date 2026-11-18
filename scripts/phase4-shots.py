#!/usr/bin/env python3
"""Screens of phase 4 (18 Nov 2026), as a phone at 390 x 844: the first-letter helper (the alphabet on the person's
screen, the card of words, what the carer reads), "[Name] wants to say something" (the starters, the topics as a
picture menu, the line the carer reads), "Before a doctor visit" (a question, the page of answers) and "Talk about a
photo" (the questions, the photo over the question on the person's screen).
Output: devlog/evidence_phase4/NN_*.png. Nothing is asked of any other host (every such request is refused).

Usage: npm run build && npx vite preview --port 4173 (in another shell), then python3 scripts/phase4-shots.py [--url http://localhost:4173/]
"""
import argparse
import base64
import importlib.util
import os
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'devlog', 'evidence_phase4')
spec = importlib.util.spec_from_file_location('e2e', os.path.join(HERE, 'e2e-simple.py'))
e2e = importlib.util.module_from_spec(spec)
spec.loader.exec_module(e2e)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--url', default='http://localhost:4173/')
    ap.add_argument('--out', default=None, help='another folder for the pictures (phase 5 shot the screens again, with the family\'s three pictures told apart: devlog/evidence_phase5/reshoot_phase4)')
    args = ap.parse_args()
    url = args.url
    global OUT
    if args.out:
        OUT = args.out
    host = urlparse(url).hostname
    os.makedirs(OUT, exist_ok=True)
    with sync_playwright() as p:
        b = p.chromium.launch()
        c = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True, user_agent=e2e.PHONE_UA, service_workers='block', reduced_motion='reduce')
        c.route('**/*', lambda r: r.continue_() if urlparse(r.request.url).hostname in (host, None) or r.request.url.startswith(('data:', 'blob:')) else r.abort())
        pg = c.new_page()
        pg.on('dialog', lambda d: d.accept())
        made = []

        def shot(name, full=False):
            pg.wait_for_timeout(350)
            path = os.path.join(OUT, f'{name}.png')
            pg.screenshot(path=path, full_page=full)
            made.append(path)

        profile, photos = e2e.miller_p4()
        pg.goto(url)
        pg.wait_for_selector('main.simple.home')
        pg.evaluate(e2e.KV_PUT, {'profile': profile, 'photos': photos, 'settings': {'cloudHelp': False, 'support': 'more', 'welcomed': False, 'firstCard': True, 'howFolded': True}})
        pg.reload()
        pg.wait_for_selector('main.simple.home')
        shot('01_home_frank_wants_to_say_something', full=True)

        # 1. the first letter: tea or coffee -> something else -> the alphabet -> B -> Beth, Bo, ginger biscuits
        e2e.ask_topic(pg, 'food', 'Would you like tea or coffee?')
        e2e.answer(pg, 'something else')
        shot('02_after_something_else_try_the_first_letter', full=True)
        pg.locator('#letter-go').click()
        pg.wait_for_selector('main.pv.letters #abc')
        shot('03_person_alphabet_390x844')
        pg.locator('[data-letter=B]').click()
        pg.wait_for_selector('main.pv .pt')
        shot('04_person_words_with_B_beth_bo_biscuits')
        pg.locator('main.pv .pt', has_text='Bo').first.click()
        pg.wait_for_selector('[data-confirm=yes]')
        pg.locator('[data-confirm=yes]').click()
        pg.locator('.p-give').click()
        pg.wait_for_selector('main.simple.s-answered')
        shot('05_carer_the_word_is_bo', full=True)
        # a letter with no word in About them and no model on a phone: the sheet with the exact text
        pg.locator('[data-act=home]').click()
        e2e.ask_topic(pg, 'food', 'Would you like tea or coffee?')
        e2e.answer(pg, 'something else')
        pg.locator('#letter-go').click()
        pg.wait_for_selector('#abc')
        pg.locator('[data-letter=X]').click()
        pg.wait_for_selector('main.simple.nocard')
        if pg.locator('#sheet').count():
            shot('06_letter_X_sheet_before_online_help', full=True)
            pg.locator('[data-act=sheet-no]').click()
        shot('07_letter_X_no_word_carer_screen', full=True)

        # 2. his turn
        pg.locator('[data-act=home]').click()
        pg.wait_for_selector('main.simple.home')
        pg.locator('#turn-go').click()
        pg.wait_for_selector('main.pv .pt')
        shot('08_person_starts_three_starters')
        pg.locator('main.pv .pt', has_text='tell you something').click()
        pg.locator('[data-confirm=yes]').click()
        pg.wait_for_selector('main.pv .pt >> text=People')
        shot('09_person_topics_picture_menu')
        pg.locator('main.pv .pt', has_text='People').click()
        pg.locator('[data-confirm=yes]').click()
        pg.wait_for_selector('main.pv .pt >> text=Beth')
        shot('09b_person_who_is_it_about')
        pg.locator('main.pv .pt', has_text='Beth').click()
        pg.locator('[data-confirm=yes]').click()
        pg.locator('.p-give').click()
        pg.wait_for_selector('main.simple.s-answered #turn-lead')
        shot('10_carer_frank_started_this', full=True)

        # 3. before a doctor visit
        pg.locator('[data-act=home]').click()
        pg.locator('#visit-link').click()
        pg.wait_for_selector('main.visit #visit-start')
        shot('11_visit_intro', full=True)
        pg.locator('#visit-start').click()
        pg.wait_for_selector('main.pv .pt')
        shot('12_visit_person_are_you_in_pain')
        for i, label in enumerate(['yes', None, None, 'quite bad', 'badly', 'so-so', 'low', 'talking', 'my speech']):
            pg.wait_for_selector('main.pv .pt')
            if label is None:
                pg.locator('main.pv .pt:not(.esc)').first.click()
            else:
                pg.locator('main.pv .pt', has_text=label).first.click()
            if i == 1:
                continue  # the body map's first step leads to its second by itself
            pg.wait_for_selector('[data-confirm=yes]')
            pg.locator('[data-confirm=yes]').click()
            pg.wait_for_timeout(250)
            if i == 6:
                pg.wait_for_selector('main.pv .pt')
                shot('13_visit_person_what_worries_you_most')
        pg.wait_for_selector('.p-give')
        pg.locator('.p-give').click()
        pg.wait_for_selector('main.visit #visit-page')
        shot('14_visit_page_franks_own_answers', full=True)

        # 4. talk about a photo
        pg.locator('[data-act=home]').click()
        pg.locator('#phototalk-link').click()
        pg.wait_for_selector('#pt-grid')
        shot('15_phototalk_pick_a_photo', full=True)
        pg.locator('.pt-photo', has_text='Bo').click()
        pg.wait_for_selector('#pt-questions')
        shot('16_phototalk_questions_rules_on_a_phone', full=True)
        pg.locator('[data-act=pt-ask]').nth(2).click()
        pg.wait_for_selector('main.simple.card')
        pg.locator('[data-act=show]').click()
        pg.wait_for_selector('main.pv.with-photo .pt')
        shot('17_person_photo_over_the_question')
        b.close()
    for m in made:
        print(os.path.relpath(m, os.path.join(HERE, '..')))


if __name__ == '__main__':
    main()
