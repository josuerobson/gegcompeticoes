// Minimal service worker: exists mainly to satisfy browser PWA-installability
// criteria (manifest + SW with a fetch handler). Does not touch navigation
// requests at all — those always go straight to the network like a normal
// page load — and only soft-caches static same-origin GET assets, with a
// fallback that can never resolve to `undefined` (an earlier version did,
// which made respondWith() throw "Failed to convert value to 'Response'"
// and broke page loads when a network fetch failed with nothing cached yet).
const CACHE_NAME = 'gg-competicoes-v2';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (event.request.mode === 'navigate') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(async () => (await caches.match(event.request)) || Response.error())
  );
});
