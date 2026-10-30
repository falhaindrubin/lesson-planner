// Offline support: serve from the cache at once, refresh the cache in the background.
// tools/release.js rewrites CACHE for each release so old caches are dropped.
const CACHE = 'lesson-planner-dev';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()),
));
// The page lists what it loaded before this worker took control; cache the same-origin ones
self.addEventListener('message', e => e.waitUntil(caches.open(CACHE).then(cache =>
  Promise.all(e.data.filter(u => new URL(u).origin === location.origin).map(u => cache.add(u).catch(() => {}))))));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async cache => {
    const hit = await cache.match(e.request);
    const fresh = fetch(e.request).then(r => { if (r.ok) cache.put(e.request, r.clone()); return r; }).catch(() => hit);
    return hit || fresh;
  }));
});
