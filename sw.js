/* Kesit SQL service worker: önce ağ, ağ yoksa son kaydedilen kopya.
   Güncellemeler hemen görünür; site bir kez açıldıktan sonra açılan içerik internet yokken de çalışır.
   Sürüm değişince eski önbellek silinir. Kardeş uygulamalar aynı adreste olduğu için yalnız kesit-sql-* adlı önbelleklere dokunulur. */
const CACHE = 'kesit-sql-v2';
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('kesit-sql-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
));
/* Yeni veritabanı dosyası gelince eskisini önbellekten çıkar (9 MB'lık dosya birikmesin) */
async function store(req, res) {
  const c = await caches.open(CACHE);
  await c.put(req, res);
  const m = new URL(req.url).pathname.match(/\/base-[^/]+\.b64\.txt$/);
  if (m) { for (const k of await c.keys()) { const p = new URL(k.url).pathname; if (p !== new URL(req.url).pathname && /\/base-[^/]+\.b64\.txt$/.test(p)) await c.delete(k); } }
}
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(fetch(req).then(res => {
    if (res && res.ok) { const copy = res.clone(); e.waitUntil(store(req, copy).catch(() => {})); }
    return res;
  }).catch(() => caches.match(req).then(r => r || caches.match('./index.html'))));
});
