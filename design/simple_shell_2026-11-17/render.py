#!/usr/bin/env python3
"""Renders the two mockups to PNG: every screen at 390 x 844 (phone) and 1440 x 900 (desktop).
Direction A is dark only (the app's desk is dark by design); direction B is rendered light and dark.
Also checks that no screen is wider than the phone (360, 390, 412 px).
Usage: python3 design/simple_shell_2026-11-17/render.py   (static files, no server, no network)"""
import pathlib, sys
from playwright.sync_api import sync_playwright

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE / 'shots'
OUT.mkdir(exist_ok=True)
SCREENS = {
    'a': {1: 'first-screen', 2: 'card-ready', 3: 'person-card', 4: 'answered', 5: 'online-help-consent', 6: 'about-them', 7: 'inside'},
    'b': {1: 'home', 2: 'step1-ask', 3: 'step2-show', 4: 'step3-answer', 5: 'firstrun-online-help', 6: 'more-inside', 7: 'person-card'},
}
THEMES = {'a': ['dark'], 'b': ['light', 'dark']}
SIZES = {'390': (390, 844), '1440': (1440, 900)}
bad = 0
with sync_playwright() as p:
    br = p.chromium.launch()
    for d, screens in SCREENS.items():
        for theme in THEMES[d]:
            for tag, (w, h) in SIZES.items():
                ctx = br.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2, is_mobile=(w < 500), has_touch=(w < 500), color_scheme=theme)
                pg = ctx.new_page()
                for n, name in screens.items():
                    pg.goto(f"{(HERE / (d + '.html')).as_uri()}?theme={theme}#{n}")
                    pg.evaluate('document.fonts.ready')
                    pg.wait_for_timeout(250)
                    f = OUT / f"{d.upper()}_{tag}_{theme}_{n}-{name}.png"
                    pg.screenshot(path=str(f))
                    if n in (1, 2, 6) and tag == '390':  # the long screens: the whole page as well
                        pg.screenshot(path=str(OUT / f"{d.upper()}_{tag}_{theme}_{n}-{name}_full.png"), full_page=True)
                ctx.close()
        for w in (360, 390, 412):
            ctx = br.new_context(viewport={'width': w, 'height': 800}, device_scale_factor=1, is_mobile=True, has_touch=True)
            pg = ctx.new_page()
            for n, name in screens.items():
                pg.goto(f"{(HERE / (d + '.html')).as_uri()}#{n}")
                pg.wait_for_timeout(120)
                m = pg.evaluate("""() => { const vw = document.documentElement.clientWidth; const off = [...document.querySelectorAll('section.on *, .tabs *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width && r.right > vw + 1; }).length; return { vw, sw: document.documentElement.scrollWidth, off }; }""")
                ok = m['sw'] <= m['vw'] and m['off'] == 0
                bad += 0 if ok else 1
                print(f"{'PASS' if ok else 'FAIL'}  {d.upper()} screen {n} ({name}) at {w}px  scrollWidth {m['sw']}, {m['off']} past the edge")
            ctx.close()
    br.close()
print(f"\n{len(list(OUT.glob('*.png')))} images in {OUT}; {bad} overflow failure(s)")
sys.exit(1 if bad else 0)
