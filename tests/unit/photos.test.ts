// Personal photos (core/photos.ts, web/src/store.ts, web/src/simple.ts): a card uses the family's own photo wherever
// a choice's label IS the photo's word (rules; no model looks at a photo), the photos live in IndexedDB on the device
// and nowhere else, each can be deleted and all can be deleted, and the square is framed by hand.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { COPY } from '../../core/copy';
import { PHOTO_CAP, START_FRAME, ZOOM_MAX, addPhoto, clampFrame, cleanWord, cropRect, photoFor, photoKey, removePhoto, type Photo } from '../../core/photos';
import { SAMPLE_PROFILE } from '../../core/sample';
import { aboutSimple, frameStyle, photoSheet, photosBlock } from '../../web/src/simple';

const ROOT = join(__dirname, '..', '..');
const DATA = 'data:image/jpeg;base64,/9j/AAAA';
const photo = (word: string, at = 1, id = `p${at}`): Photo => ({ id, word, data: DATA, at });

describe('label matching: the photo is used when a choice IS its word', () => {
  const photos = [photo('tea', 1), photo('Jen', 2), photo('garden', 3), photo('pot roast', 4), photo('biscuits', 5)];
  it.each([['tea', 'tea'], ['Tea', 'tea'], ['the garden', 'garden'], ['your garden', 'garden'], ['a garden', 'garden'], ['Jen', 'Jen'], ['jen', 'Jen'], ['pot roast', 'pot roast'], ['biscuit', 'biscuits'], ['some biscuits', 'biscuits'], ['Garden.', 'garden']])('the choice "%s" shows the photo "%s"', (label, word) => {
    expect(photoFor(label, photos)?.word).toBe(word);
  });
  it.each(['coffee', 'herbal tea', 'tea room', 'Jenny', 'roast', 'something else', '', 'gardening'])('the choice "%s" has no photo (never a near match)', (label) => {
    expect(photoFor(label, photos)).toBeNull();
  });
  it('two photos with the same word: the newest one', () => {
    expect(photoFor('tea', [photo('tea', 1, 'old'), photo('Tea', 9, 'new'), photo('tea', 5, 'mid')])?.id).toBe('new');
  });
  it('the key ignores capitals, an article, "your" and the plural; "glass" keeps its s', () => {
    expect(photoKey('The  Biscuits!')).toBe('biscuit');
    expect(photoKey('your glasses')).toBe('glasse');
    expect(photoKey('glass')).toBe('glass');
    expect(photoKey('bus')).toBe('bus');
  });
});

describe('the list of photos', () => {
  it('the word is tidied: three words and 24 letters at most, no end punctuation; an empty word adds nothing', () => {
    expect(cleanWord('  hot   chocolate. ')).toBe('hot chocolate');
    expect(cleanWord('one two three four')).toBe('one two three');
    expect(cleanWord('a'.repeat(40))).toHaveLength(24);
    expect(addPhoto([], photo('   '))).toBeNull();
    expect(addPhoto([], photo(' Tea '))!.map((p) => p.word)).toEqual(['Tea']);
  });
  it('only a picture is kept, and at most 60', () => {
    expect(addPhoto([], { ...photo('tea'), data: 'https://example.com/x.jpg' })).toBeNull();
    expect(addPhoto([], { ...photo('tea'), data: 'data:text/html,<p>' })).toBeNull();
    const full = Array.from({ length: PHOTO_CAP }, (_, i) => photo('x', i, `p${i}`));
    expect(PHOTO_CAP).toBe(60);
    expect(addPhoto(full, photo('tea', 99))).toBeNull();
  });
  it('one photo is deleted by its id; the others stay', () => {
    const list = [photo('tea', 1), photo('Jen', 2), photo('garden', 3)];
    expect(removePhoto(list, 'p2').map((p) => p.word)).toEqual(['tea', 'garden']);
    expect(removePhoto(list, 'nope')).toHaveLength(3);
  });
});

describe('framing by hand: the square never leaves the picture', () => {
  it('the start frame shows the whole shorter side, in the middle', () => {
    expect(cropRect(START_FRAME, 800, 600)).toEqual({ x: 100, y: 0, side: 600 });
    expect(cropRect(START_FRAME, 600, 800)).toEqual({ x: 0, y: 100, side: 600 });
  });
  it('zoom is kept within 1 and 4, and a move is kept inside the edges', () => {
    expect(clampFrame({ zoom: 9, dx: 0, dy: 0 }, 800, 600).zoom).toBe(ZOOM_MAX);
    expect(clampFrame({ zoom: 0.2, dx: 0, dy: 0 }, 800, 600).zoom).toBe(1);
    for (const f of [{ zoom: 1, dx: 5, dy: 5 }, { zoom: 2, dx: -5, dy: 5 }, { zoom: 4, dx: 0.3, dy: -0.4 }, { zoom: 1.7, dx: -0.2, dy: 0.1 }]) {
      const r = cropRect(f, 800, 600);
      expect(r.x).toBeGreaterThanOrEqual(-1e-9);
      expect(r.y).toBeGreaterThanOrEqual(-1e-9);
      expect(r.x + r.side).toBeLessThanOrEqual(800 + 1e-9);
      expect(r.y + r.side).toBeLessThanOrEqual(600 + 1e-9);
    }
    // moved right as far as it goes: the square ends at the right edge
    const right = cropRect({ zoom: 1, dx: 5, dy: 0 }, 800, 600);
    expect(right.x + right.side).toBeCloseTo(800);
  });
  it('what the carer sees in the square is what is cut out (the same arithmetic gives the CSS)', () => {
    // 800 x 600 at zoom 2, in the middle: the square is 300 px of the picture, starting at (250, 150)
    expect(cropRect({ zoom: 2, dx: 0, dy: 0 }, 800, 600)).toEqual({ x: 250, y: 150, side: 300 });
    expect(frameStyle({ zoom: 2, dx: 0, dy: 0 }, 800, 600)).toBe('width:266.667%;height:200.000%;left:-83.333%;top:-50.000%');
  });
});

// ---------------------------------------------------------------- the store: IndexedDB on this device
/** A small stand-in for IndexedDB: one database, one object store, get / put / clear, with the same callbacks. */
function fakeIndexedDB() {
  const data = new Map<string, unknown>();
  const calls: string[] = [];
  const later = (fn: () => void) => { queueMicrotask(fn); };
  const store = {
    get(key: string) { calls.push(`get ${key}`); const rq: { result?: unknown; onsuccess?: () => void; onerror?: () => void } = {}; later(() => { rq.result = data.has(key) ? structuredClone(data.get(key)) : undefined; rq.onsuccess?.(); }); return rq; },
    put(value: unknown, key: string) { calls.push(`put ${key}`); data.set(key, structuredClone(value)); },
    clear() { calls.push('clear'); data.clear(); },
  };
  const db = {
    createObjectStore: (name: string) => { calls.push(`create ${name}`); return store; },
    transaction: (_: string, mode: string) => { const tx: { objectStore: () => typeof store; oncomplete?: () => void; onerror?: () => void } = { objectStore: () => store }; if (mode === 'readwrite') later(() => later(() => tx.oncomplete?.())); return tx; },
  };
  const api = {
    open(name: string, version: number) { calls.push(`open ${name} ${version}`); const rq: { result?: typeof db; onupgradeneeded?: () => void; onsuccess?: () => void; onerror?: () => void; onblocked?: () => void } = { result: db }; later(() => { rq.onupgradeneeded?.(); rq.onsuccess?.(); }); return rq; },
  };
  return { api, data, calls };
}

describe('the photo store: IndexedDB on this device, and nowhere else', () => {
  let idb: ReturnType<typeof fakeIndexedDB>;
  let store: typeof import('../../web/src/store');
  beforeEach(async () => {
    idb = fakeIndexedDB();
    (globalThis as { indexedDB?: unknown }).indexedDB = idb.api;
    const { vi } = await import('vitest');
    vi.resetModules();
    store = await import('../../web/src/store');
  });
  it('photos are written under the key "photos" of the app\'s own database and read back as they were', async () => {
    const list = addPhoto(addPhoto([], photo('tea', 1))!, photo('Jen', 2))!;
    await store.kvSet('photos', list);
    expect(idb.calls).toContain('open talk-partner 1');
    expect(idb.calls).toContain('put photos');
    expect(idb.data.get('photos')).toEqual(list);
    expect(await store.kvGet<Photo[]>('photos')).toEqual(list);
  });
  it('deleting one photo writes the shorter list; "Delete everything" clears the whole store, the photos with it', async () => {
    const list = [photo('tea', 1), photo('Jen', 2)];
    await store.kvSet('photos', list);
    await store.kvSet('profile', { personName: 'Frank' });
    await store.kvSet('photos', removePhoto(list, 'p1'));
    expect((idb.data.get('photos') as Photo[]).map((p) => p.word)).toEqual(['Jen']);
    await store.kvClear();
    expect(idb.calls).toContain('clear');
    expect(idb.data.size).toBe(0);
    expect(await store.kvGet('photos')).toBeUndefined();
    expect(await store.kvGet('profile')).toBeUndefined();
  });
  it('with no IndexedDB (a private window) the photos last for the visit, in memory', async () => {
    (globalThis as { indexedDB?: unknown }).indexedDB = undefined;
    const { vi } = await import('vitest');
    vi.resetModules();
    const mem = await import('../../web/src/store');
    await mem.kvSet('photos', [photo('tea')]);
    expect(await mem.kvGet<Photo[]>('photos')).toHaveLength(1);
    await mem.kvClear();
    expect(await mem.kvGet('photos')).toBeUndefined();
  });
});

describe('the privacy boundary: a photo cannot be in a request, and no model looks at it', () => {
  it('core/photos.ts imports nothing, and has no DOM, storage or network in it', () => {
    const src = readFileSync(join(ROOT, 'core/photos.ts'), 'utf8');
    expect(src).not.toMatch(/^import /m);
    expect(src).not.toMatch(/\b(?:document|window|indexedDB|localStorage|fetch|XMLHttpRequest|navigator)\s*[.(]/);
  });
  it.each(['core/prompt.ts', 'core/requests.ts', 'core/strip.ts', 'core/pipeline.ts', 'core/rules.ts', 'core/engine.ts', 'core/narrow.ts', 'core/summary.ts', 'core/prefs.ts', 'web/src/ai/firebaseEngine.ts', 'web/src/ai/pick.ts', 'web/src/ai/app.ts', 'web/src/ai/remoteConfig.ts', 'web/src/feedback.ts', 'web/src/voice.ts'])('%s does not import the photos', (f) => {
    expect(readFileSync(join(ROOT, f), 'utf8')).not.toMatch(/from\s+['"][^'"]*\/photos?['"]/);
  });
  it('web/src/photo.ts reads the file in the page and draws it on a canvas: no request, no worker, no model', () => {
    const src = readFileSync(join(ROOT, 'web/src/photo.ts'), 'utf8');
    expect(src).toContain('new FileReader()');
    expect(src).toContain("toDataURL('image/jpeg'");
    expect(src).not.toMatch(/fetch\(|XMLHttpRequest|sendBeacon|WebSocket|new Worker|importScripts|firebase|mediapipe|tflite|wasm/i);
  });
  it('no segmentation or other vision model is in the app: no such package, no model file', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as { dependencies: Record<string, string>; devDependencies: Record<string, string> };
    expect(Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).filter((d) => /mediapipe|tensorflow|tfjs|onnx|opencv|transformers/i.test(d))).toEqual([]);
  });
  it('the web client: the photos go to the picture of a choice and to About them, never to the pipeline or a model step', () => {
    const main = readFileSync(join(ROOT, 'web/src/main.ts'), 'utf8');
    for (const call of [...main.matchAll(/await (?:makeCard|narrowCard)\([\s\S]*?\}\);/g)].map((m) => m[0])) expect(call).not.toMatch(/photo/i);
    expect(main).toContain("const own = state.demo || ch.role !== 'answer' ? null : photoFor(ch.label, state.photos);");
    expect(main).toContain("void kvSet('photos', state.photos);");
  });
});

describe('About them: the family\'s own photos', () => {
  it('says what they are for and that they stay here; each photo has its word and "Delete"; "Add a photo" and "Delete all photos"', () => {
    const html = photosBlock({ name: 'Frank', photos: [photo('tea', 1), photo('Jen', 2)] });
    expect(html).toContain("Frank&#39;s own photos");
    expect(html).toContain(COPY.simple.photos.lock);
    expect(COPY.simple.photos.lock).toBe('Photos stay on this computer only. They are never sent anywhere, and no AI looks at them.');
    expect(html.match(/data-act="photo-del" data-id="p\d"/g)).toHaveLength(2);
    expect(html).toContain('<b>tea</b>');
    expect(html).toContain('data-act="photo-new"');
    expect(html).toContain('<input type="file" id="photo-file" accept="image/*" hidden>');
    expect(html).toContain('data-act="photo-del-all"');
  });
  it('no photos yet: said plainly, no "Delete all"; at 60 photos "Add a photo" gives way to a line that says why', () => {
    const none = photosBlock({ name: '', photos: [] });
    expect(none).toContain(COPY.simple.photos.none);
    expect(none).not.toContain('photo-del-all');
    const full = photosBlock({ name: '', photos: Array.from({ length: PHOTO_CAP }, (_, i) => photo('x', i, `p${i}`)) });
    expect(full).not.toContain('data-act="photo-new"');
    expect(full).toContain(COPY.simple.photos.full);
  });
  it('adding one: frame it by hand (the picture in a square, zoom by a slider and two buttons), then one word; both steps can be left', () => {
    const base = { src: DATA, w: 800, h: 600, frame: START_FRAME, framed: DATA, word: '', error: '' };
    const frame = photoSheet({ ...base, step: 'frame' });
    expect(frame).toContain('role="dialog" aria-modal="true"');
    expect(frame).toContain('id="crop" tabindex="0"');
    expect(frame).toContain('<input type="range" id="crop-zoom" min="1" max="4"');
    expect(frame.match(/data-act="photo-zoom"/g)).toHaveLength(2);
    expect(frame).toContain('data-act="photo-use"');
    expect(frame).toContain('data-act="photo-cancel"');
    const label = photoSheet({ ...base, step: 'label', error: COPY.simple.photos.label.empty });
    expect(label).toContain('<form id="photo-form"');
    expect(label).toContain('id="photo-word"');
    expect(label).toContain('maxlength="24"');
    expect(label).toContain(COPY.simple.photos.label.empty);
    expect(label).toContain('data-act="photo-reframe"');
  });
  it('About them carries the photos, what was learned, and "Delete everything on this computer"', () => {
    const html = aboutSimple({ profile: SAMPLE_PROFILE, open: null, saved: false, photos: [photo('tea')] });
    expect(html.indexOf('id="photos"')).toBeLessThan(html.indexOf('id="learned"'));
    expect(html).toContain('id="delete-everything" data-act="delete-all"');
  });
});
