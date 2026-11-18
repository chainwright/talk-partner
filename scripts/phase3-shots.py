#!/usr/bin/env python3
"""Screens of phase 3 (18 Nov 2026), as a phone at 390 x 844: the diary and its one-tap log, the answer-reliability
guard's line on the carer's screens, health notes, the Miller family's week (tests/fixtures/frank-week.json) with what
stands out, the sheet before the lines go to online help, the tip of the day, "Keep a copy" and its preview, the
bigger pictures on the person's screen, and the full view's empty card area in words.
Output: devlog/evidence_phase3/NN_*.png. Nothing is asked of any other host (every such request is refused).

Usage: npm run build && npx vite preview (in another shell), then python3 scripts/phase3-shots.py [--url http://localhost:5179/]
"""
import argparse
import importlib.util
import os
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'devlog', 'evidence_phase3')
spec = importlib.util.spec_from_file_location('e2e', os.path.join(HERE, 'e2e-simple.py'))
e2e = importlib.util.module_from_spec(spec)
spec.loader.exec_module(e2e)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--url', default='http://localhost:5179/')
    url = ap.parse_args().url
    host = urlparse(url).hostname
    os.makedirs(OUT, exist_ok=True)
    with sync_playwright() as p:
        b = p.chromium.launch()
        opts = dict(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True, user_agent=e2e.PHONE_UA, service_workers='block', reduced_motion='reduce', accept_downloads=True)

        def page_of(**more):
            c = b.new_context(**{**opts, **more})
            c.route('**/*', lambda r: r.continue_() if urlparse(r.request.url).hostname in (host, None) or r.request.url.startswith(('data:', 'blob:')) else r.abort())
            pg = c.new_page()
            pg.on('dialog', lambda d: d.accept())
            return c, pg

        c, pg = page_of()
        made = []

        def shot(name, full=True, sel=None):
            pg.wait_for_timeout(350)
            path = os.path.join(OUT, f'{name}.png')
            if sel:
                pg.locator(sel).scroll_into_view_if_needed()
                pg.locator(sel).screenshot(path=path)
            else:
                pg.screenshot(path=path, full_page=full)
            made.append(path)

        week, entries, name = e2e.frank_week()
        pg.goto(url)
        pg.wait_for_selector('main.simple.home')
        # Carol's phone, on a later visit: About them holds the Miller family, the how-to block is folded
        pg.evaluate(e2e.KV_PUT, {'profile': week['profile'], 'settings': {'cloudHelp': False, 'support': 'more', 'welcomed': False, 'firstCard': True, 'howFolded': True}})
        pg.reload()
        pg.wait_for_selector('main.simple.home')
        shot('01_first_screen_with_diary')
        pg.locator('#diary-link').click()
        pg.wait_for_selector('main.simple.diary')
        shot('02_diary_empty')
        for k in ('drank', 'ate', 'toilet'):
            pg.locator(f'[data-log={k}]').click()
            pg.wait_for_selector('#logged')
        shot('03_diary_one_tap_log')
        pg.locator('[data-act=back]').click()
        pg.wait_for_selector('main.simple.home')
        # Friday evening: "yes" to five yes / no questions in a row (none about pain, the toilet or a need)
        for i, (topic, q) in enumerate((('food', 'Are you hungry?'), ('rest', 'Are you tired?'), ('fun', 'Would you like some music on?'), ('plans', 'Would you like to go for a walk?'), ('fun', 'Would you like the radio on?'))):
            e2e.ask_topic(pg, topic, q)
            e2e.answer(pg, 'yes')
            if i < 4:
                e2e.new_q(pg)
        shot('04_guard_after_the_fifth_yes')
        # pain is never discounted: asked while the check is on, the screen leads on with "Where does it hurt?"
        e2e.new_q(pg)
        e2e.ask_topic(pg, 'body', 'Are you in pain?')
        e2e.answer(pg, 'yes')
        shot('25_pain_yes_while_the_check_is_on_no_guard_line')
        e2e.new_q(pg)
        e2e.ask_topic(pg, 'food', 'tea or coffee')
        shot('05_guard_next_either_or_in_a_different_order')
        pg.locator('[data-act=show]').click()
        pg.wait_for_selector('main.pv .pt')
        shot('06_person_screen_says_nothing_of_it', full=False)
        e2e.hold_exit(pg)
        pg.wait_for_selector('main.simple.card')
        pg.locator('[data-act=home]').click()
        pg.wait_for_selector('main.simple.home')
        pg.locator('#diary-link').click()
        pg.wait_for_selector('main.simple.diary')
        shot('07_diary_today_less_sure_and_tip')
        # health notes
        pg.goto(url + '#/about')
        pg.wait_for_selector('main.about-simple')
        pg.locator('.rowhead[data-row=health]').click()
        pg.wait_for_selector('#health-text')
        pg.locator('input[data-health=diabetes]').check()
        pg.locator('#health-text').fill('Type 2 diabetes, diet only.')
        shot('08_health_notes', sel='.rowcard[data-row=health]')
        # the week
        pg.evaluate(e2e.KV_PUT, {'diary': entries, 'health': week['health'], 'history': [], 'asks': []})
        pg.goto(url + '#/diary')
        pg.wait_for_selector('main.simple.diary')
        pg.reload()
        pg.wait_for_selector('main.simple.diary')
        pg.locator('#tab-week').click()
        pg.wait_for_selector('#insights')
        shot('09_diary_week')
        shot('10_week_what_stands_out', sel='#insights')
        pg.locator('#diary-topic').select_option('body')
        shot('11_diary_week_one_topic', full=False)
        pg.locator('#diary-topic').select_option('all')
        pg.locator('#tab-month').click()
        shot('12_month_what_stands_out', sel='#insights')
        pg.locator('#tab-week').click()
        pg.wait_for_selector('#ins-plainer')
        pg.locator('#ins-plainer').click()
        pg.wait_for_selector('#ins-sheet')
        shot('13_sheet_exact_text_before_online_help', full=False)
        pg.locator('[data-act=ins-no]').click()
        # with a fluid limit noted: never "drink more"
        pg.evaluate(e2e.KV_PUT, {'health': dict(week['health'], fluidLimit=True, text='Fluid limit from the doctor.'), 'diary': [e for e in entries if not (e.get('log') == 'drank' and e['id'] in ('w27',))]})
        pg.reload()
        pg.wait_for_selector('main.simple.diary')
        pg.locator('#tab-week').click()
        pg.wait_for_selector('#insights')
        shot('14_week_with_a_fluid_limit_noted', sel='#insights')
        pg.evaluate(e2e.KV_PUT, {'health': week['health'], 'diary': entries})
        # keep a copy
        pg.goto(url + '#/about')
        pg.wait_for_selector('main.about-simple')
        pg.reload()
        pg.wait_for_selector('main.about-simple')
        e2e.add_photo(pg, 'tea')
        shot('15_keep_a_copy', sel='#backup')
        with pg.expect_download() as dl:
            pg.locator('#backup-save').click()
        pg.locator('#backup-file').set_input_files(dl.value.path())
        pg.wait_for_selector('#import-sheet')
        shot('16_file_preview_before_it_replaces', full=False)
        pg.locator('[data-act=import-no]').click()
        # the person's screen: bigger pictures
        pg.locator('[data-act=home]').click()
        pg.wait_for_selector('main.simple.home')
        e2e.ask_topic(pg, 'food', 'water, juice or milk')
        pg.locator('[data-act=show]').click()
        pg.wait_for_selector('main.pv .pt')
        shot('17_person_three_choices_no_scrolling', full=False)
        pg.locator('main.pv .pt', has_text='water').first.click()
        pg.wait_for_selector('[data-confirm=yes]')
        shot('18_person_check', full=False)
        e2e.hold_exit(pg)
        pg.wait_for_selector('main.simple.card')
        pg.locator('[data-act=home]').click()
        pg.wait_for_selector('main.simple.home')
        e2e.ask_topic(pg, 'food', 'tea or coffee')
        pg.locator('[data-act=show]').click()
        pg.wait_for_selector('main.pv .pt')
        shot('19_person_two_choices_one_a_family_photo', full=False)
        e2e.hold_exit(pg)
        pg.wait_for_selector('main.simple.card')
        # after a role-play on the phone (18 Nov): three things after "something else", the narrowing sheet in plain
        # words, "Who would you like to call?"
        pg.locator('[data-act=home]').click()
        pg.wait_for_selector('main.simple.home')
        e2e.ask_topic(pg, 'food', 'tea or coffee')
        e2e.answer(pg, 'something else')
        shot('23_after_something_else_three_actions')
        if pg.locator('#narrow:not([disabled])').count():
            pg.locator('#narrow').click()
            pg.wait_for_selector('#sheet')
            shot('22_narrowing_sheet_plain_words', full=False)
            pg.locator('[data-act=sheet-no]').click()
        pg.locator('[data-act=home]').click()
        pg.wait_for_selector('main.simple.home')
        e2e.ask_topic(pg, 'people', 'Do you want to call someone?')
        e2e.answer(pg, 'yes')
        pg.locator('#next-q').click()
        pg.wait_for_selector('main.simple.card #made-where')
        pg.locator('[data-act=show]').click()
        pg.wait_for_selector('main.pv .pt')
        shot('24_who_would_you_like_to_call', full=False)
        e2e.hold_exit(pg)
        pg.wait_for_selector('main.simple.card')
        # the full view: the empty card area in words (the owner's phone test), the placeholder that fits
        pg.locator('[data-act=home]').click()
        pg.wait_for_selector('main.simple.home')
        pg.locator('[data-act=inside]').click()
        pg.wait_for_selector('#card-empty')
        shot('20_full_view_empty_card_area_in_words')
        c.close()
        # the dark theme
        c, pg = page_of(color_scheme='dark')
        pg.goto(url)
        pg.wait_for_selector('main.simple.home')
        pg.evaluate(e2e.KV_PUT, {'profile': week['profile'], 'diary': entries, 'health': week['health']})
        pg.goto(url + '#/diary')
        pg.wait_for_selector('main.simple.diary')
        pg.reload()
        pg.wait_for_selector('main.simple.diary')
        pg.locator('#tab-week').click()
        pg.wait_for_selector('#insights')
        shot('21_diary_week_dark')
        c.close()
        b.close()
    for m in made:
        print(os.path.relpath(m, os.path.join(HERE, '..')))
    print(f'{len(made)} screens')


if __name__ == '__main__':
    main()
