/* Kesit SQL service worker: önce ağ, ağ yoksa son kaydedilen kopya.
   Güncellemeler hemen görünür; internet yokken de son açılan içerikle çalışır. */
const CACHE = 'kesit-sql-v1';
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(fetch(req).then(res => {
    if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {}); }
    return res;
  }).catch(() => caches.match(req).then(r => r || caches.match('./index.html'))));
});
