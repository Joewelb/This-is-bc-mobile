/* This is BC: service worker. Keeps the app working without internet.
   Pages and icons from this site are answered from the saved copy straight away, then refreshed in the background,
   so changes you upload show up the next time the app is opened. Map links and Feedback sending are not touched. */
const VERSION = 'thisisbc-v1';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== VERSION).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cached = await caches.match(request, { ignoreSearch: true });
    // Ask the server whether the file changed (no-cache), even if the host says it may be reused for a few minutes.
    const refresh = fetch(request.url, { cache: 'no-cache' }).then(async response => {
      if (response.ok) { const cache = await caches.open(VERSION); await cache.put(request, response.clone()); }
      return response;
    }).catch(() => null);
    event.waitUntil(refresh);   // keep the worker alive until the saved copy is refreshed
    if (cached) return cached;
    const fresh = await refresh;
    return fresh || (request.mode === 'navigate' ? caches.match('index.html') : Response.error());
  })());
});
