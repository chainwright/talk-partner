// The service worker of Talk Partner: it keeps the app shell (the page, its script and style, the fonts, the icons)
// in the browser, so the app opens with no connection and everything the rules make still works there: the topic
// questions, quick needs, the person's screens, About them. It holds no question, no answer and nothing from About
// them (those live in the page and in IndexedDB), and it never touches a request to another host: online help and the
// app's settings go straight to the network, or fail when there is none, and the page then says "needs the internet".
//
// The two lines below are written at build time (vite.config.ts, `appShell`): the files of this build and a version
// made from their names and sizes. A new build is a new cache; the old one is deleted when this worker takes over.
const VERSION = '__VERSION__';
const FILES = __FILES__;
const CACHE = `talk-partner-${VERSION}`;

self.addEventListener('install', (ev) => {
  ev.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('talk-partner-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (ev) => {
  const req = ev.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // another host: never handled here
  // the page itself: the network first (so a new build is seen at once), the kept copy when there is no connection
  if (req.mode === 'navigate') {
    ev.respondWith(fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); void caches.open(CACHE).then((c) => c.put('/', copy)); }
      return res;
    }).catch(() => caches.match('/', { cacheName: CACHE }).then((hit) => hit ?? Response.error())));
    return;
  }
  // the build's own files (their names carry a hash of their content): the kept copy first
  ev.respondWith(caches.match(req, { cacheName: CACHE, ignoreSearch: true }).then((hit) => hit ?? fetch(req)));
});
