// Installable and usable offline: the manifest, the icons, the service worker's rules and where it is registered.
// (The same things are checked in a real browser, with the connection off, by scripts/pwa-check.py.)
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..', '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');
const manifest = JSON.parse(read('web/public/manifest.webmanifest')) as { name: string; short_name: string; display: string; start_url: string; scope: string; theme_color: string; background_color: string; icons: { src: string; sizes: string; type: string; purpose: string }[] };
const pngSize = (p: string) => { const b = readFileSync(join(ROOT, p)); return b.subarray(0, 8).toString('latin1') === '\x89PNG\r\n\x1a\n' ? `${b.readUInt32BE(16)}x${b.readUInt32BE(20)}` : null; };

describe('the web app manifest', () => {
  it('name, standalone display, start URL in scope, theme and background colours', () => {
    expect(manifest.name).toBe('Talk Partner');
    expect(manifest.short_name.length).toBeLessThanOrEqual(12);
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/');
    expect(manifest.scope).toBe('/');
    expect(manifest.theme_color).toBe('#0b6e4f');
    expect(manifest.background_color).toMatch(/^#[0-9a-f]{6}$/);
  });
  it('icons of 192 and 512 px and a maskable one, each a real PNG of the stated size', () => {
    expect(manifest.icons.map((i) => `${i.sizes} ${i.purpose}`).sort()).toEqual(['192x192 any', '512x512 any', '512x512 maskable']);
    for (const i of manifest.icons) {
      expect(i.type).toBe('image/png');
      expect(pngSize(`web/public${i.src}`), i.src).toBe(i.sizes);
    }
    expect(pngSize('web/public/icons/apple-touch-icon.png')).toBe('180x180');
  });
  it('the page links it, with the same theme colour, and an icon for the home screen', () => {
    const html = read('web/index.html');
    expect(html).toContain('<link rel="manifest" href="/manifest.webmanifest" />');
    expect(html).toContain(`<meta name="theme-color" content="${manifest.theme_color}" />`);
    expect(html).toContain('<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />');
  });
  it('the theme colour is the simple view\'s accent', () => {
    expect(read('web/src/simple.css')).toContain(`--accent: ${manifest.theme_color};`);
  });
});

describe('the service worker', () => {
  const sw = read('web/sw.template.js');
  it('keeps this build\'s files (the list and the version are written at build time), and deletes an older build\'s', () => {
    expect(sw).toContain("const VERSION = '__VERSION__';");
    expect(sw).toContain('const FILES = __FILES__;');
    expect(sw).toMatch(/caches\.open\(CACHE\)\.then\(\(c\) => c\.addAll\(FILES/);
    expect(sw).toMatch(/k\.startsWith\('talk-partner-'\) && k !== CACHE\)\.map\(\(k\) => caches\.delete\(k\)\)/);
    const cfg = read('vite.config.ts');
    expect(cfg).toContain("replace('__FILES__', JSON.stringify(urls))");
    expect(cfg).toContain('plugins: [appShell()]');
  });
  it('never handles a request to another host, or anything but a GET: online help goes straight to the network', () => {
    const fetchHandler = sw.slice(sw.indexOf("addEventListener('fetch'"));
    expect(fetchHandler).toMatch(/if \(req\.method !== 'GET'\) return;/);
    expect(fetchHandler).toMatch(/if \(url\.origin !== self\.location\.origin\) return;/);
    expect(fetchHandler.indexOf('url.origin !== self.location.origin')).toBeLessThan(fetchHandler.indexOf('respondWith'));
  });
  it('the page comes from the network first, so a new build is seen at once; the kept copy is for no connection', () => {
    expect(sw).toMatch(/if \(req\.mode === 'navigate'\) \{\s*ev\.respondWith\(fetch\(req\)/);
    expect(sw).toContain("caches.match('/', { cacheName: CACHE })");
  });
  it('holds nothing of the family: it never reads IndexedDB, storage or a message from the page', () => {
    expect(sw).not.toMatch(/indexedDB|localStorage|addEventListener\('message'|postMessage|importScripts/);
  });
  it('is registered by the page in a production build only, and a failure leaves the page as it was', () => {
    const main = read('web/src/main.ts');
    expect(main).toMatch(/if \(import\.meta\.env\.PROD && 'serviceWorker' in navigator\)[^\n]*navigator\.serviceWorker\.register\('\/sw\.js'\)\.catch\(/);
    expect(main.match(/serviceWorker\.register\(/g)).toHaveLength(1);
  });
  it('the hosting config never lets the worker or the manifest be served stale', () => {
    const fb = JSON.parse(read('firebase.json')) as { hosting: { headers: { source: string; headers: { key: string; value: string }[] }[] } };
    for (const src of ['/sw.js', '/manifest.webmanifest', '/index.html', '/']) expect(fb.hosting.headers.find((h) => h.source === src)?.headers.find((h) => h.key === 'Cache-Control')?.value, src).toBe('no-cache');
  });
  it('the files exist where the page and the manifest point', () => {
    for (const f of ['web/public/manifest.webmanifest', 'web/sw.template.js', 'web/public/icons/icon-192.png', 'web/public/icons/icon-512.png', 'web/public/icons/icon-maskable-512.png']) expect(existsSync(join(ROOT, f)), f).toBe(true);
  });
});
