#!/usr/bin/env python3
"""A sheet of every bundled picture, as the person's card shows it: on white, the word under the picture, 390 px wide.

The pictures are read from web/src/pictos.ts itself (Node runs the file; it has no imports), laid out three to a row
on the white card, and photographed by Chromium at a phone's width. Also written: the same sheet at twice the tile
size for a closer look. Output: devlog/evidence_pictures/pictures_390.png and pictures_390_large.png.

Usage: python3 scripts/picture-sheet.py
"""
import json
import os
import subprocess
import sys

from playwright.sync_api import sync_playwright

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'devlog', 'evidence_pictures')
NODE = "import('./web/src/pictos.ts').then((m) => console.log(JSON.stringify(m.PICTO_IDS.filter((i) => i !== 'monogram').map((id) => [id, m.builtinPicto(id)]).concat([['monogram', m.monogram('J')]]))))"


def page_html(pics, cols, size):
    tiles = ''.join(f'<div class="t">{svg}<span>{name.replace("body:", "")}</span></div>' for name, svg in pics)
    return f'''<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>body {{ margin: 0; padding: 10px; background: #fff; font-family: Verdana, sans-serif; color: #0f141a; }}
.g {{ display: grid; grid-template-columns: repeat({cols}, minmax(0, 1fr)); gap: 8px; }}
.t {{ border: 2px solid #0f141a; border-radius: 14px; padding: 8px 4px; display: grid; justify-items: center; gap: 4px; font-size: {13 if cols == 3 else 18}px; font-weight: 700; text-align: center; overflow-wrap: anywhere; }}
.t svg {{ width: {size}px; height: {size}px; }}</style><div class="g">{tiles}</div>'''


def main():
    r = subprocess.run(['node', '--input-type=module', '-e', NODE], cwd=ROOT, capture_output=True, text=True)
    if r.returncode:
        print(r.stderr)
        sys.exit(1)
    pics = json.loads(r.stdout)
    os.makedirs(OUT, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for name, cols, size in (('pictures_390.png', 3, 72), ('pictures_390_large.png', 2, 128)):
            page = browser.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=2)
            page.set_content(page_html(pics, cols, size))
            page.screenshot(path=os.path.join(OUT, name), full_page=True)
            page.close()
        browser.close()
    print(f'{len(pics)} pictures -> devlog/evidence_pictures/pictures_390.png, pictures_390_large.png')


if __name__ == '__main__':
    main()
