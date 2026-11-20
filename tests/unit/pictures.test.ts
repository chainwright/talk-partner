// The colour pictures (web/src/pictos.ts; design/IMAGES_RESEARCH_2026-11-17.md). Since 20 Nov 2026 the set is mixed:
// 85 pictures made with Gemini (WebP files in web/public/pictures/, listed in IMAGE_IDS and in
// devlog/quota_probe_2026-11-20/ASSET_MANIFEST.json) and our own SVG drawings (redrawn in colour on 18 Nov 2026).
// Our SVGs: one style, real colours written into the drawing, visible on the card in the light and in the dark theme;
// the drawing of an id that now has a picture is kept as its fallback and follows the same rules. The picture files:
// WebP, 256 x 256, at most 20 KB each, the same ids as the manifest. The ids the cards ask for did not change; the
// words of the topic cards and their trees have a picture.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { NullEngine } from '../../core/engine';
import { BUILTIN, SYNONYM, pictureFor } from '../../core/pictures';
import { makeCard } from '../../core/pipeline';
import { TOPIC_BASE } from '../../core/topics';
import { EMPTY_PROFILE } from '../../core/types';
import { IMAGE_IDS, OUTLINE, PICTO_IDS, builtinPicto, decoPicto, imageFile, monogram, pictoFallback, svgPicto } from '../../web/src/pictos';
import { topicGrid } from '../../web/src/simple';
import { topics } from '../../core/topics';

const ROOT = join(__dirname, '..', '..');
const lum = (hex: string) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
/** Every id with an SVG drawing of ours: the ones shown as SVG, and the fallbacks of the pictures made with Gemini. */
const drawn = PICTO_IDS.filter((id) => id !== 'monogram');
/** The ids the card shows as our SVG (not in the manifest). */
const svgShown = drawn.filter((id) => !IMAGE_IDS.includes(id));
/** The ids the set had as line drawings (17 Nov 2026): none may be gone. */
const BEFORE = ['yes', 'no', 'not sure', 'something else', 'someone else', 'somewhere else', 'good', 'okay', 'bad', 'tasty', 'plain', 'too salty', 'good idea', 'leave it', 'like them', 'unhappy', 'this one', 'that one', 'listen', 'tea', 'coffee', 'a little', 'some', 'a lot', 'change', 'wait', 'stop', 'write it', 'more', 'show me', 'draw', 'later', 'change topic', 'tired', 'worried', 'pain', 'spouse', 'child', 'sibling', 'grandchild', 'friend', 'neighbour', 'carer', 'nurse', 'doctor', 'speech therapist', 'physio', 'priest', 'family', 'visitor', 'toilet', 'drink', 'food', 'too hot', 'too cold', 'call someone'];

describe('our SVG drawings: one style, our own work', () => {
  it('every id of the line-drawing set is still there (cards keep working), and the body map keeps its 25 parts', () => {
    for (const id of BEFORE) expect(PICTO_IDS, id).toContain(id);
    expect(PICTO_IDS.filter((id) => id.startsWith('body:'))).toHaveLength(25);
    expect(drawn.length).toBeGreaterThanOrEqual(119);
  });
  it('an id with no picture file is shown as our drawing, and every drawing (shown or fallback) has the same dark outline of 3 on a 96 x 96 grid, round joins, and the colours written into the drawing', () => {
    for (const id of svgShown) expect(builtinPicto(id), id).toBe(svgPicto(id));
    for (const id of drawn) {
      const s = svgPicto(id);
      expect(s, id).toMatch(new RegExp(`^<svg viewBox="0 0 96 96" role="img" aria-label="[^"]+" fill="none" stroke="${OUTLINE}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">`));
      // real-object colours, not the theme's: no currentColor, no CSS variable
      expect(s, id).not.toMatch(/currentColor|var\(--/);
      // colour: at least one filled shape in a colour that is not the outline and not white
      const colours = [...s.matchAll(/(?:fill|stroke)="(#[0-9a-f]{6})"/g)].map((m) => m[1]);
      expect(colours.filter((f) => f !== OUTLINE && f !== '#ffffff').length, id).toBeGreaterThan(0);
    }
  });
  it('nothing from outside and nothing but shapes: no image, no link, no text, no script, no gradient or filter (flat colours), no animation', () => {
    for (const id of drawn) expect(svgPicto(id), id).not.toMatch(/<image|href=|<text|<script|<foreignObject|url\(|<filter|Gradient|<animate|<set /);
  });
  it('the dashed frame of "something else" is the only dashed shape in the set', () => {
    expect(drawn.filter((id) => svgPicto(id).includes('stroke-dasharray'))).toEqual(['something else']);
  });
  it('no two pictures share a drawing, and an unknown id falls back to the way out (never an empty frame)', () => {
    const bodies = drawn.map((id) => svgPicto(id).replace(/aria-label="[^"]+"/, ''));
    expect(new Set(bodies).size).toBe(bodies.length);
    // the fallback of an unknown id is our dashed drawing, not the picture file of "something else"
    expect(builtinPicto('no such id')).toMatch(/^<svg /);
    expect(builtinPicto('no such id')).toContain('stroke-dasharray');
  });
  it('the outline stands out on the white card: at least 3:1 (it is 12.6:1), and every picture carries it', () => {
    expect(contrast(OUTLINE, '#ffffff')).toBeGreaterThanOrEqual(3);
    expect(Math.round(contrast(OUTLINE, '#ffffff') * 10) / 10).toBe(12.6);
    // a shape either takes the outline or is drawn in its own colour: in every picture at least one edge is 3:1 on white
    for (const id of drawn) {
      const shapes = [...svgPicto(id).matchAll(/<(?:path|circle|rect|ellipse)\b[^>]*>/g)].map((m) => m[0]);
      const edges = shapes.map((t) => (/stroke="none"/.test(t) ? null : t.match(/stroke="(#[0-9a-f]{6})"/)?.[1] ?? OUTLINE)).filter((c): c is string => !!c);
      expect(Math.max(...edges.map((c) => contrast(c, '#ffffff'))), id).toBeGreaterThanOrEqual(3);
    }
  });
  it('light and dark: the person\'s card is a white sheet in both themes, its tiles are white, and a topic tile shows its picture on a white plate', () => {
    const base = readFileSync(join(ROOT, 'web/src/styles.css'), 'utf8');
    const simple = readFileSync(join(ROOT, 'web/src/simple.css'), 'utf8');
    expect(base).toMatch(/\.person \{[^}]*color-scheme: light; background: #fff;/);
    expect(simple).toMatch(/\.pv \.pt \{[^}]*background: #fff;/);
    expect(simple).toMatch(/\.simple \.topic \.tp \{[^}]*background: #fff;/);
    // and no rule recolours a picture for the dark theme
    expect(simple).not.toMatch(/prefers-color-scheme: dark[^}]*\{[^}]*\.pt svg/);
  });
  it('the monogram is the one place with a letter, on the same outline', () => {
    expect(monogram('J')).toContain('<text');
    expect(monogram('J')).toContain(`stroke="${OUTLINE}"`);
  });
});

describe('the words the cards use have a picture', () => {
  it('every picture id the core may ask for is drawn, and every synonym points at one', () => {
    for (const id of BUILTIN) expect(PICTO_IDS, id).toContain(id);
    for (const [word, id] of Object.entries(SYNONYM)) expect(BUILTIN.has(id), `${word} -> ${id}`).toBe(true);
  });
  it('the topic questions: at least 9 in 10 of the choices the rules offer come with a picture (the rest show the word alone)', async () => {
    let all = 0;
    const none: string[] = [];
    for (const q of TOPIC_BASE.flatMap((t) => t.questions)) {
      const c = await makeCard(q, { profile: EMPTY_PROFILE, support: 'more', engine: new NullEngine(), allowCloud: false, deviceReady: false });
      for (let p: typeof c | null | undefined = c; p; p = p.nextPage) for (const ch of p.choices) { all++; if (ch.picture.type !== 'builtin') none.push(`${q} [${ch.label}]`); }
    }
    expect(all).toBeGreaterThan(120);
    expect(none.length / all, none.join('; ')).toBeLessThanOrEqual(0.1);
  });
  it.each([['water', 'water'], ['juice', 'juice'], ['milk', 'milk'], ['hot drink', 'hot drink'], ['cold drink', 'cold drink'], ['your glasses', 'glasses'], ['your hearing aid', 'hearing aid'], ['bed', 'bed'], ['chair', 'chair'],
    ['TV', 'tv'], ['music', 'music'], ['news', 'news'], ['film', 'film'], ['this morning', 'morning'], ['this afternoon', 'afternoon'], ['stay in', 'stay in'], ['go out', 'go out'], ['open', 'open'], ['closed', 'closed'],
    ['company', 'company'], ['some time alone', 'time alone'], ['snack', 'snack'], ['meal', 'meal'], ['something sweet', 'something sweet'], ['something savoury', 'something savoury'], ['hot', 'too hot'], ['cold', 'too cold'], ['just right', 'just right'], ['now', 'now'], ['later', 'later'],
    ['something cold', 'cold drink'], ['something to eat', 'food']])('"%s" -> the picture "%s"', (label, id) => {
    expect(pictureFor(label, EMPTY_PROFILE)).toEqual({ type: 'builtin', id });
  });
  it('a word with no picture still shows as the word alone, and a name the family did not list gets none', () => {
    expect(pictureFor('umbrella', EMPTY_PROFILE).type).toBe('cloud');
    expect(pictureFor('Marguerite', EMPTY_PROFILE).type).toBe('word');
  });
  it('the topic tiles of the first screen carry a colour picture from the same set, hidden from a screen reader (the word is next to it)', () => {
    const html = topicGrid({ name: '', topics: topics(EMPTY_PROFILE), topicOpen: null, aiTag: '' });
    // six of the seven are pictures made with Gemini (alt="" and hidden), the body map is our drawing
    const imgs = html.match(/<img class="pic tp" src="\/pictures\/[a-z_]+\.webp" alt="" aria-hidden="true" data-id="[^"]+" width="96" height="96" decoding="async" draggable="false">/g) ?? [];
    const svgs = html.match(/<svg viewBox="0 0 96 96" class="tp" aria-hidden="true"/g) ?? [];
    expect(imgs).toHaveLength(6);
    expect(svgs).toHaveLength(1);
    expect(html).not.toContain('role="img"');
  });
});

/** The size of a WebP file from its header (lossy VP8, lossless VP8L or extended VP8X), or null if it is not one. */
function webpSize(b: Buffer): { w: number; h: number } | null {
  if (b.subarray(0, 4).toString('latin1') !== 'RIFF' || b.subarray(8, 12).toString('latin1') !== 'WEBP') return null;
  const kind = b.subarray(12, 16).toString('latin1');
  if (kind === 'VP8 ') return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
  if (kind === 'VP8L') { const v = b.readUInt32LE(21); return { w: (v & 0x3fff) + 1, h: ((v >> 14) & 0x3fff) + 1 }; }
  if (kind === 'VP8X') return { w: b.readUIntLE(24, 3) + 1, h: b.readUIntLE(27, 3) + 1 };
  return null;
}

describe('the pictures made with Gemini (20 Nov 2026)', () => {
  const manifest = JSON.parse(readFileSync(join(ROOT, 'devlog/quota_probe_2026-11-20/ASSET_MANIFEST.json'), 'utf8')) as Record<string, { file: string; prompt: string }>;
  const dir = join(ROOT, 'web/public/pictures');
  it('the code shows exactly the ids of the manifest, each from the file the manifest names, and every id is one the cards know', () => {
    expect([...IMAGE_IDS].sort()).toEqual(Object.keys(manifest).sort());
    expect(new Set(IMAGE_IDS).size).toBe(IMAGE_IDS.length);
    for (const id of IMAGE_IDS) {
      expect(manifest[id].file, id).toBe(imageFile(id));
      expect(manifest[id].prompt.length, id).toBeGreaterThan(5);
      expect(PICTO_IDS, id).toContain(id);
    }
  });
  it('each file: WebP, 256 x 256, at most 20 KB; and the folder holds nothing else', () => {
    for (const id of IMAGE_IDS) {
      const f = join(ROOT, 'web/public', imageFile(id));
      expect(existsSync(f), f).toBe(true);
      expect(statSync(f).size, id).toBeLessThanOrEqual(20 * 1024);
      expect(webpSize(readFileSync(f)), id).toEqual({ w: 256, h: 256 });
    }
    expect(readdirSync(dir).sort()).toEqual(IMAGE_IDS.map((id) => imageFile(id).slice('pictures/'.length)).sort());
  });
  it('kept as our SVG: the abstract ones, the scale, the hand sign that could offend, the body map, the monogram', () => {
    expect(svgShown.filter((id) => !id.startsWith('body:')).sort()).toEqual(['a little', 'a lot', 'change topic', 'just right', 'morning', 'no', 'okay', 'show me', 'some', 'someone else', 'that one', 'this one', 'yes']);
  });
  it('the markup: an <img> from this site with the word as its text, its size written in, decoded off the main thread', () => {
    expect(builtinPicto('tea')).toBe('<img class="pic" src="/pictures/tea.webp" alt="tea" data-id="tea" width="96" height="96" decoding="async" draggable="false">');
    expect(builtinPicto("something's wrong")).toContain('src="/pictures/something_s_wrong.webp" alt="something\'s wrong"');
    for (const id of IMAGE_IDS) expect(builtinPicto(id), id).toMatch(/^<img class="pic" src="\/pictures\/[a-z_]+\.webp" alt="[^"]+" data-id="[^"]+" width="96" height="96" decoding="async" draggable="false">$/);
    // as decoration (next to its word): no text for a screen reader
    expect(decoPicto('bed')).toBe('<img class="pic tp" src="/pictures/bed.webp" alt="" aria-hidden="true" data-id="bed" width="96" height="96" decoding="async" draggable="false">');
    expect(decoPicto('body:whole')).toMatch(/^<svg viewBox="0 0 96 96" class="tp" aria-hidden="true" focusable="false"/);
  });
  it('a file that cannot be loaded gives way to our drawing of the same id (main.ts listens for the error)', () => {
    expect(pictoFallback('tea', false)).toBe(svgPicto('tea'));
    expect(pictoFallback('tea', true)).toMatch(/^<svg viewBox="0 0 96 96" class="tp" aria-hidden="true" focusable="false"/);
    const main = readFileSync(join(ROOT, 'web/src/main.ts'), 'utf8');
    expect(main).toMatch(/app\.addEventListener\('error', \(ev\) => \{[^}]*classList\.contains\('pic'\)[\s\S]{0,200}pictoFallback\(t\.dataset\.id, t\.classList\.contains\('tp'\)\)/);
  });
  it('every CSS rule that sizes a picture as SVG sizes the picture file the same', () => {
    for (const f of ['web/src/styles.css', 'web/src/simple.css']) {
      const css = readFileSync(join(ROOT, f), 'utf8');
      for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        const sels = m[1].trim().split(',').map((x) => x.trim());
        if (sels[0].startsWith('@') || !/\b(width|height)\s*:/.test(m[2])) continue;
        for (const sel of sels.filter((x) => /(^|\s)svg$/.test(x))) expect(sels, `${f}: ${sel}`).toContain(sel.replace(/svg$/, 'img.pic'));
      }
    }
  });
});

describe('the pictures\' source, said plainly (phase 11)', () => {
  it('"How this works" carries one short line, and the docs name Gemini without saying we drew those pictures', async () => {
    const { COPY } = await import('../../core/copy');
    expect(COPY.how.pictures).toBe('Pictures: drawn by us and made with Gemini.');
    expect(readFileSync(join(ROOT, 'web/src/main.ts'), 'utf8')).toContain('<p class="muted" id="pictures-line">${H.pictures}</p>');
    for (const f of ['PICTOGRAMS.md', 'DISCLOSURE.md', 'README.md']) expect(readFileSync(join(ROOT, f), 'utf8'), f).toMatch(/Gemini 3\.1 Flash\s+Image/);
    const pictos = readFileSync(join(ROOT, 'web/src/pictos.ts'), 'utf8');
    expect(pictos).not.toMatch(/no\s+(?:\/\/\s*)?AI-generated image/);
    expect(readFileSync(join(ROOT, 'PICTOGRAMS.md'), 'utf8')).toContain('We did not\ndraw these.');
  });
});
