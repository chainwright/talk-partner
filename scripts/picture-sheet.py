#!/usr/bin/env python3
"""A sheet of every bundled picture, as the person's card shows it: on white, the word under the picture, 390 px wide.

The pictures are read from web/src/pictos.ts itself (Node runs the file; it has no imports), laid out three to a row
on the white card, and photographed by Chromium at a phone's width. Since 20 Nov 2026 (phase 11) the set is mixed:
a picture made with Gemini is an <img> of a WebP file in web/public/pictures/ (put into the sheet as a data URL), the
rest are our SVG drawings; under each word a small line says which ("Gemini" or "our SVG"). Also written: the same
sheet at twice the tile size for a closer look, and a before/after sheet (our SVG drawing and the Gemini picture of
the same word, side by side). Output: devlog/evidence_pictures/pictures_390.png, pictures_390_large.png and
pictures_390_before_after.png.

Usage: python3 scripts/picture-sheet.py
"""
import base64
import json
import os
import re
import subprocess
import sys

from playwright.sync_api import sync_playwright

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'devlog', 'evidence_pictures')
NODE = "import('./web/src/pictos.ts').then((m) => console.log(JSON.stringify(m.PICTO_IDS.filter((i) => i !== 'monogram').map((id) => [id, m.builtinPicto(id), m.svgPicto(id)]).concat([['monogram', m.monogram('J'), m.monogram('J')]]))))"


def inline(html):
    """The picture files as data URLs, so the sheet needs no server."""
    def data(m):
        with open(os.path.join(ROOT, 'web', 'public', m.group(1)), 'rb') as f:
            return 'src="data:image/webp;base64,' + base64.b64encode(f.read()).decode() + '"'
    return re.sub(r'src="/(pictures/[a-z_]+\.webp)"', data, html)


def source(html):
    return 'Gemini' if html.startswith('<img') else 'our SVG'


def page_html(pics, cols, size):
    tiles = ''.join(f'<div class="t">{inline(pic)}<span>{name.replace("body:", "")}</span><small>{source(pic)}</small></div>' for name, pic in pics)
    return f'''<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>body {{ margin: 0; padding: 10px; background: #fff; font-family: Verdana, sans-serif; color: #0f141a; }}
.g {{ display: grid; grid-template-columns: repeat({cols}, minmax(0, 1fr)); gap: 8px; }}
.t {{ border: 2px solid #0f141a; border-radius: 14px; padding: 8px 4px; display: grid; justify-items: center; gap: 4px; font-size: {13 if cols == 3 else 18}px; font-weight: 700; text-align: center; overflow-wrap: anywhere; }}
.t svg, .t img {{ width: {size}px; height: {size}px; object-fit: contain; }} .t small {{ font-weight: 400; font-size: 11px; color: #4a5563; }}</style><div class="g">{tiles}</div>'''


def shrink(path):
    """The photographic pictures make big PNGs: keep 256 colours (for the eye the same; about a third of the size)."""
    try:
        from PIL import Image
    except ImportError:
        return
    Image.open(path).convert('RGB').quantize(256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).save(path, optimize=True)


def main():
    r = subprocess.run(['node', '--input-type=module', '-e', NODE], cwd=ROOT, capture_output=True, text=True)
    if r.returncode:
        print(r.stderr)
        sys.exit(1)
    rows = json.loads(r.stdout)
    pics = [(name, shown) for name, shown, _ in rows]
    # before / after: our drawing, then the picture made with Gemini, for every word that has one
    pairs = [x for name, shown, drawn in rows if shown.startswith('<img') for x in ((f'{name} (before)', drawn), (name, shown))]
    os.makedirs(OUT, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for name, cols, size, items in (('pictures_390.png', 3, 72, pics), ('pictures_390_large.png', 2, 128, pics), ('pictures_390_before_after.png', 2, 112, pairs)):
            page = browser.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=2)
            page.set_content(page_html(items, cols, size))
            page.wait_for_function('[...document.images].every((i) => i.complete && i.naturalWidth > 0)')
            page.screenshot(path=os.path.join(OUT, name), full_page=True)
            page.close()
            shrink(os.path.join(OUT, name))
        browser.close()
    made = sum(1 for _, p in pics if p.startswith('<img'))
    print(f'{len(pics)} pictures ({made} made with Gemini, {len(pics) - made} our SVG) -> devlog/evidence_pictures/pictures_390.png, pictures_390_large.png; {len(pairs) // 2} before/after pairs -> pictures_390_before_after.png')


if __name__ == '__main__':
    main()
