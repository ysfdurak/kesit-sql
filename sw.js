/* Kesit SQL service worker: önce ağ, ağ yoksa son kaydedilen kopya.
   Güncellemeler hemen görünür. Kurulumda çekirdek dosyalar (sayfa, betikler, yazı tipleri, veritabanı) önbelleğe alınır;
   böylece site bir kez açıldıktan sonra internet yokken de çalışır.
   Sürüm değişince eski önbellek silinir. Kardeş uygulamalar aynı adreste olduğu için yalnız kesit-sql-* adlı önbelleklere dokunulur. */
const CACHE = 'kesit-sql-v5';
const BASE = 'base-a787b9ae-6z9dr.b64.txt'; /* make_base.js günceller; denetim (run.js) dosyanın varlığını sınar */
/* Liste elle tutulmaz: betikler index.html'den, yazı tipleri fonts.css'ten okunur. Tek dosyanın alınamaması kurulumu bozmaz; o dosya ilk kullanımda önbelleğe girer. */
async function precache() {
  const res = await fetch('index.html'); if (!res.ok) return;
  const html = await res.clone().text();
  const urls = new Set(['./', 'manifest.webmanifest', 'favicon.svg', 'icon-192.png', BASE]);
  for (const m of html.matchAll(/<(?:script|link)\b[^>]*?(?:src|href)="([^":?#]+\.(?:js|css))"/g)) urls.add(m[1]);
  const fr = await fetch('vendor/fonts.css');
  if (fr.ok) for (const m of (await fr.text()).matchAll(/url\(["']?([^"')]+\.woff2)/g)) urls.add('vendor/' + m[1].replace(/^\.\//, ''));
  const c = await caches.open(CACHE); await c.put('index.html', res);
  await Promise.allSettled([...urls].map(async u => { const r = await fetch(u); if (r.ok) await store(new Request(u), r); }));
}
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(precache().catch(() => {})); });
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
