#!/usr/bin/env python3
"""Screens added on 18 Nov 2026, as a phone at 390 px: the family's photos (add, frame by hand, one word, on the card),
the usual choice, the tree's next question and the end of a path, "More", what was learned, the needs board in colour,
and the first screen and the hand-over screen in the dark theme. Output: devlog/evidence_phase2/NN_*.png.

Usage: npm run build && npx vite preview (in another shell), then python3 scripts/phase2-shots.py [--url http://localhost:5179/]
"""
import argparse
import os

from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'devlog', 'evidence_phase2')
PHOTO = os.path.join(HERE, '..', 'tests', 'fixtures', 'photo-mug.jpg')
UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--url', default='http://localhost:5179/')
    url = ap.parse_args().url
    os.makedirs(OUT, exist_ok=True)
    with sync_playwright() as p:
        b = p.chromium.launch()
        opts = dict(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True, user_agent=UA, service_workers='block', reduced_motion='reduce')
        c = b.new_context(**opts)
        pg = c.new_page()

        def shot(name):
            pg.wait_for_timeout(350)
            pg.screenshot(path=os.path.join(OUT, f'{name}.png'), full_page=True)

        def ask(q):
            if not pg.locator('.tq', has_text=q).count():
                pg.locator('.topic[data-topic=food]').click()
            pg.locator('.tq', has_text=q).click()
            pg.wait_for_selector('main.simple.card')

        def answer(label):
            pg.locator('[data-act=show]').click()
            pg.locator('main.pv .pt', has_text=label).first.click()
            pg.locator('[data-confirm=yes]').click()
            pg.locator('.p-give').click()
            pg.wait_for_selector('main.s-answered')

        pg.goto(url)
        pg.wait_for_selector('main.simple.home')
        pg.wait_for_timeout(7000)
        shot('01_first_screen_390')
        pg.goto(url + '#/about')
        pg.wait_for_selector('#photos')
        shot('02_about_them_photos_empty_390')
        pg.set_input_files('#photo-file', PHOTO)
        pg.wait_for_selector('#crop-img')
        pg.locator('[data-act=photo-zoom][data-by="0.25"]').click()
        pg.locator('[data-act=photo-zoom][data-by="0.25"]').click()
        box = pg.locator('#crop').bounding_box()
        pg.mouse.move(box['x'] + 150, box['y'] + 150)
        pg.mouse.down()
        pg.mouse.move(box['x'] + 60, box['y'] + 130, steps=5)
        pg.mouse.up()
        shot('03_photo_frame_by_hand_390')
        pg.locator('[data-act=photo-use]').click()
        pg.wait_for_selector('#photo-word')
        pg.fill('#photo-word', 'coffee')
        shot('04_photo_one_word_390')
        pg.locator('#photo-form button[type=submit]').click()
        pg.wait_for_selector('#photo-sheet', state='detached')
        shot('05_about_them_one_photo_390')
        pg.locator('[data-act=home]').click()
        for i in range(3):
            ask('tea or coffee')
            answer('coffee')
            if i == 0:
                shot('06_answer_with_next_question_390')
            pg.locator('[data-act=home]').click()
        ask('tea or coffee')
        pg.wait_for_selector('#usual')
        shot('07_hand_over_usual_choice_and_photo_390')
        pg.locator('[data-act=show]').click()
        pg.wait_for_selector('main.pv .pt')
        shot('08_person_choices_with_photo_390')
        pg.locator('main.pv .pt', has_text='coffee').click()
        pg.wait_for_selector('[data-confirm=yes]')
        shot('09_person_check_with_photo_390')
        pg.locator('[data-confirm=yes]').click()
        pg.wait_for_selector('.p-give')
        shot('10_person_finish_with_photo_390')
        pg.locator('.p-give').click()
        pg.wait_for_selector('main.s-answered')
        pg.locator('#next-q').click()
        pg.wait_for_selector('main.simple.card')
        answer('yes')
        pg.wait_for_selector('#do-now')
        shot('11_end_of_path_what_to_do_now_390')
        pg.locator('#more').click()
        shot('12_answer_more_open_390')
        pg.locator('[data-act=home]').click()
        pg.locator('.foot a[href="#/about"]').click()
        pg.wait_for_selector('#learned-list')
        shot('13_about_them_what_was_learned_390')
        pg.goto(url + '#/needs')
        pg.wait_for_selector('main.pv .p-tiles.board')
        shot('14_needs_board_colour_390')
        c.close()
        c = b.new_context(color_scheme='dark', **opts)
        pg = c.new_page()
        pg.goto(url)
        pg.wait_for_selector('main.simple.home')
        pg.wait_for_timeout(7000)
        shot('15_first_screen_dark_390')
        pg.locator('.topic[data-topic=food]').click()
        pg.locator('.tq', has_text='water, juice').click()
        pg.wait_for_selector('main.simple.card')
        shot('16_hand_over_dark_390')
        b.close()
    print(f'{len([f for f in os.listdir(OUT) if f.endswith(".png")])} screens in devlog/evidence_phase2/')


if __name__ == '__main__':
    main()
