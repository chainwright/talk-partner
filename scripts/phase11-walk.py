#!/usr/bin/env python3
"""Phase 11 (20 Nov 2026): the pictures made with Gemini on the person's screens, walked as a carer would.

At 360 x 740 and 390 x 844, in the light and the dark theme, against a production build (npm run build && npx vite
preview, port 5179): the topic tiles (six pictures and the body drawing on their white plate), tea or coffee (the two
pictures loaded, 104 to 128 px, the way out smaller), the check, the finish, Back one step at a time to the first
screen, the quick-needs board with pain and with toilet, and a person (company or time alone). Every picture must be
a loaded 256 px WebP, nothing may scroll sideways, no page error, and nothing is asked of another host.

Usage: python3 scripts/phase11-walk.py [OUT_DIR]   (default devlog/evidence_phase11/walk)
Exit code 0 when every check passes, 1 otherwise.
"""
import json, os, sys
from playwright.sync_api import sync_playwright
URL = 'http://localhost:5179/'
OUT = sys.argv[1] if len(sys.argv) > 1 else 'devlog/evidence_phase11/walk'
os.makedirs(OUT, exist_ok=True)
res = []
def check(name, ok, detail=''):
    res.append(ok); print(('PASS  ' if ok else 'FAIL  ') + name + ('' if ok else f'  ({detail})'))
PICS = """[...document.querySelectorAll('main.pv .pt, main.pv .p-pick, main.pv .answered')].map((t) => { const i = t.querySelector('img.pic, svg'); if (!i) return null; const r = i.getBoundingClientRect(); return { k: i.tagName.toLowerCase(), id: i.dataset?.id || i.getAttribute('aria-label') || '', w: Math.round(r.width), h: Math.round(r.height), ok: i.tagName !== 'IMG' || (i.complete && i.naturalWidth === 256), bg: getComputedStyle(t).backgroundColor }; }).filter(Boolean)"""
def noscroll(page):
    return page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
with sync_playwright() as p:
    b = p.chromium.launch()
    for w, h in ((360, 740), (390, 844)):
        for scheme in ('light', 'dark'):
            tag = f'{w}_{scheme}'
            ctx = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2, is_mobile=True, has_touch=True, color_scheme=scheme, service_workers='block')
            outside = []
            ctx.route('**/*', lambda r: (outside.append(r.request.url), r.abort()) if not r.request.url.startswith(URL) else r.continue_())
            page = ctx.new_page(); errs = []
            page.on('pageerror', lambda e: errs.append(str(e)))
            page.goto(URL); page.wait_for_selector('main.simple.home')
            page.wait_for_function("[...document.querySelectorAll('.topic img.pic')].every((i) => i.complete && i.naturalWidth > 0)")
            check(f'{tag}: topic tiles show 6 pictures and the body drawing on their white plate', page.locator('.topic img.pic.tp').count() == 6 and page.locator('.topic svg.tp').count() == 1)
            page.wait_for_timeout(1200); page.screenshot(path=f'{OUT}/{tag}_01_home.png')
            # tea or coffee
            page.locator('.topic[data-topic=food]').click(); page.locator('.tq', has_text='tea or coffee').click()
            page.wait_for_selector('main.simple.card #made-where')
            page.locator('[data-act=show]').click(); page.wait_for_selector('main.pv .pt')
            page.wait_for_function("[...document.querySelectorAll('main.pv img.pic')].every((i) => i.complete)")
            pics = page.evaluate(PICS)
            check(f'{tag}: the way out is our dashed drawing on every card, never a picture file', page.locator('main.pv .pt.esc svg [stroke-dasharray]').count() == 1 and page.locator('main.pv .pt.esc img').count() == 0)
            check(f'{tag}: tea/coffee: tea and coffee as loaded pictures, 104-128 px, the way out smaller; no sideways scroll', [x['id'] for x in pics][:2] == ['tea', 'coffee'] and all(x['ok'] for x in pics) and all(104 <= x['w'] <= 128 and x['w'] == x['h'] for x in pics[:2]) and noscroll(page), json.dumps(pics))
            page.wait_for_timeout(1200); page.screenshot(path=f'{OUT}/{tag}_02_tea_coffee.png')
            page.locator('main.pv .pt', has_text='coffee').click()
            page.wait_for_selector('[data-confirm=yes]')
            # (the check screen draws a new <img>: wait for it to load before reading it, as for the other screens)
            page.wait_for_function("[...document.querySelectorAll('main.pv img.pic')].every((i) => i.complete && i.naturalWidth > 0)")
            pk = page.evaluate(PICS)
            check(f'{tag}: the check "So: coffee. Right?" shows the coffee picture', any(x['id'] == 'coffee' and x['ok'] for x in pk), json.dumps(pk))
            page.wait_for_timeout(1200); page.screenshot(path=f'{OUT}/{tag}_03_check.png')
            page.locator('[data-confirm=yes]').click(); page.wait_for_selector('.p-give')
            page.wait_for_timeout(1200); page.screenshot(path=f'{OUT}/{tag}_04_done.png')
            page.locator('.p-give').click(); page.wait_for_selector('main.simple.s-answered')
            # Back one step at a time to the first screen
            steps = 0
            while page.locator('#s-top [data-act=back]').count() and steps < 6:
                page.locator('#s-top [data-act=back]').click(); page.wait_for_timeout(300); steps += 1
            check(f'{tag}: Back one step at a time reaches the first screen ({steps} steps)', page.locator('main.simple.home').count() == 1, str(steps))
            # needs board: pain, then toilet
            for need in ('pain', 'toilet'):
                page.locator('.btn[data-act=needs]').first.click(); page.wait_for_selector('main.pv .p-tiles.board')
                page.wait_for_function("[...document.querySelectorAll('main.pv img.pic')].every((i) => i.complete)")
                bd = page.evaluate(PICS)
                check(f'{tag}: needs board ({need}): ten tiles, nine Gemini pictures loaded and the way out our dashed drawing, no sideways scroll', len(bd) == 10 and sum(1 for x in bd if x['k'] == 'img' and x['ok']) == 9 and page.locator('main.pv .pt.esc svg [stroke-dasharray]').count() == 1 and noscroll(page), json.dumps(bd))
                if need == 'pain': page.wait_for_timeout(1200); page.screenshot(path=f'{OUT}/{tag}_05_needs.png')
                page.locator('main.pv .pt', has_text=need).first.click()
                page.wait_for_timeout(400)
                page.wait_for_timeout(1200); page.screenshot(path=f'{OUT}/{tag}_06_{need}.png')
                pk = page.evaluate(PICS)
                check(f'{tag}: {need}: the next screen shows a picture or the body map, nothing broken', all(x['ok'] for x in pk) and noscroll(page), json.dumps(pk))
                page.goto(URL); page.wait_for_selector('main.simple.home')
            # a person: company or time alone
            page.locator('.topic[data-topic=people]').click(); page.locator('.tq', has_text='company').click()
            page.wait_for_selector('main.simple.card #made-where')
            page.locator('[data-act=show]').click(); page.wait_for_selector('main.pv .pt')
            page.wait_for_function("[...document.querySelectorAll('main.pv img.pic')].every((i) => i.complete)")
            pp = page.evaluate(PICS)
            check(f'{tag}: a person: the way out is our dashed drawing', page.locator('main.pv .pt.esc svg [stroke-dasharray]').count() == 1)
            check(f'{tag}: a person: company / time alone as loaded pictures, no sideways scroll', [x['id'] for x in pp][:2] == ['company', 'time alone'] and all(x['ok'] for x in pp) and noscroll(page), json.dumps(pp))
            page.wait_for_timeout(1200); page.screenshot(path=f'{OUT}/{tag}_07_person.png')
            check(f'{tag}: no page error, nothing asked of another host', not errs and not outside, str(errs + outside))
            ctx.close()
    b.close()
print(f'{sum(res)} of {len(res)} checks passed'); sys.exit(0 if all(res) else 1)
