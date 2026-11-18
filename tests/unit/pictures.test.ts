// The colour pictures (web/src/pictos.ts, redrawn 18 Nov 2026; design/IMAGES_RESEARCH_2026-11-17.md): one style, real
// colours written into the drawing, our own work only, visible on the card in the light and in the dark theme; the
// ids the cards ask for did not change; the words of the topic cards and their trees have a picture.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { NullEngine } from '../../core/engine';
import { BUILTIN, SYNONYM, pictureFor } from '../../core/pictures';
import { makeCard } from '../../core/pipeline';
import { TOPIC_BASE } from '../../core/topics';
import { EMPTY_PROFILE } from '../../core/types';
import { OUTLINE, PICTO_IDS, builtinPicto, monogram } from '../../web/src/pictos';
import { topicGrid } from '../../web/src/simple';
import { topics } from '../../core/topics';

const ROOT = join(__dirname, '..', '..');
const lum = (hex: string) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const drawn = PICTO_IDS.filter((id) => id !== 'monogram');
/** The ids the set had as line drawings (17 Nov 2026): none may be gone. */
const BEFORE = ['yes', 'no', 'not sure', 'something else', 'someone else', 'somewhere else', 'good', 'okay', 'bad', 'tasty', 'plain', 'too salty', 'good idea', 'leave it', 'like them', 'unhappy', 'this one', 'that one', 'listen', 'tea', 'coffee', 'a little', 'some', 'a lot', 'change', 'wait', 'stop', 'write it', 'more', 'show me', 'draw', 'later', 'change topic', 'tired', 'worried', 'pain', 'spouse', 'child', 'sibling', 'grandchild', 'friend', 'neighbour', 'carer', 'nurse', 'doctor', 'speech therapist', 'physio', 'priest', 'family', 'visitor', 'toilet', 'drink', 'food', 'too hot', 'too cold', 'call someone'];

describe('colour pictures: one style, our own work', () => {
  it('every id of the line-drawing set is still there (cards keep working), and the body map keeps its 25 parts', () => {
    for (const id of BEFORE) expect(PICTO_IDS, id).toContain(id);
    expect(PICTO_IDS.filter((id) => id.startsWith('body:'))).toHaveLength(25);
    expect(drawn.length).toBeGreaterThanOrEqual(119);
  });
  it('every picture: the same dark outline of 3 on a 96 x 96 grid, round joins, and the colours written into the drawing', () => {
    for (const id of drawn) {
      const s = builtinPicto(id);
      expect(s, id).toMatch(new RegExp(`^<svg viewBox="0 0 96 96" role="img" aria-label="[^"]+" fill="none" stroke="${OUTLINE}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">`));
      // real-object colours, not the theme's: no currentColor, no CSS variable
      expect(s, id).not.toMatch(/currentColor|var\(--/);
      // colour: at least one filled shape in a colour that is not the outline and not white
      const colours = [...s.matchAll(/(?:fill|stroke)="(#[0-9a-f]{6})"/g)].map((m) => m[1]);
      expect(colours.filter((f) => f !== OUTLINE && f !== '#ffffff').length, id).toBeGreaterThan(0);
    }
  });
  it('nothing from outside and nothing but shapes: no image, no link, no text, no script, no gradient or filter (flat colours), no animation', () => {
    for (const id of drawn) expect(builtinPicto(id), id).not.toMatch(/<image|href=|<text|<script|<foreignObject|url\(|<filter|Gradient|<animate|<set /);
  });
  it('the dashed frame of "something else" is the only dashed shape in the set', () => {
    expect(drawn.filter((id) => builtinPicto(id).includes('stroke-dasharray'))).toEqual(['something else']);
  });
  it('no two pictures share a drawing, and an unknown id falls back to the way out (never an empty frame)', () => {
    const bodies = drawn.map((id) => builtinPicto(id).replace(/aria-label="[^"]+"/, ''));
    expect(new Set(bodies).size).toBe(bodies.length);
    expect(builtinPicto('no such id')).toContain('stroke-dasharray');
  });
  it('the outline stands out on the white card: at least 3:1 (it is 12.6:1), and every picture carries it', () => {
    expect(contrast(OUTLINE, '#ffffff')).toBeGreaterThanOrEqual(3);
    expect(Math.round(contrast(OUTLINE, '#ffffff') * 10) / 10).toBe(12.6);
    // a shape either takes the outline or is drawn in its own colour: in every picture at least one edge is 3:1 on white
    for (const id of drawn) {
      const shapes = [...builtinPicto(id).matchAll(/<(?:path|circle|rect|ellipse)\b[^>]*>/g)].map((m) => m[0]);
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
    expect(html.match(/<svg viewBox="0 0 96 96" class="tp" aria-hidden="true"/g)).toHaveLength(7);
    expect(html).not.toContain('role="img"');
  });
});
