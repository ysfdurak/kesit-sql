# SQLPatika içerik görevi: ortak kurallar

Uygulama: /home/claude/sqlpatika (Türkçe SQL öğrenme uygulaması, tek sayfa). Dersler `window.SQLP_LESSONS` dizisinde; her ders `{id, lv, mod, title, sum, body (HTML), ex: [...]}`. Alıştırma bankası `window.SQLP_PRACTICE`.
İçerik parçaları c1.js … c29.js sırayla yüklenir; senin dosyan bunlardan SONRA yüklenir ve mevcut dersleri yerinde değiştirir. Örnek kalıp için /home/claude/sqlpatika/c26.js ve c29.js dosyalarının başına bak.

## Dosya iskeleti (senin dosyan zaten boş olarak var; tamamen sen yaz)
```js
/* SQLPatika içerik NN: ... */
(function () {
const L = window.SQLP_LESSONS; const LM = id => L.find(l => l.id === id);
const sq = (q, sol, o) => Object.assign({ t: 'sql', q: '<p>' + q + '</p>', sol }, o || {});
const mc = (q, o, a, why) => ({ t: 'mc', q, o, a, why });
const X = (id, list) => { const l = LM(id); if (l) l.ex = (l.ex || []).concat(list); };
const more = (id, html) => { const l = LM(id); if (l) l.body += html; };
const C = (src) => '<pre class="code">' + src.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre>';
const D = (title, html) => `<h2>Derinleş: ${title}</h2>${html}`;
const O = { ord: true };
// more('ders-id', D('başlık', `<p>…</p>${C("SELECT …;")}<p>…</p>`));
// X('ders-id', [ sq('Görev metni: <code>kolon</code>.', 'SELECT …;'), … ]);
})();
```
- Mevcut alıştırmaları SİLME, sırasını DEĞİŞTİRME (ilerleme anahtarı dizine bağlı). Yalnızca sona ekle (`X`) ve gövdeye ekle (`more`).
- Mevcut gövdeyi değiştirme; yalnızca sonuna “Derinleş” bölümü ekle.

## Yazım ve öğretim kalitesi
- Türkçe, sade, öğretici; gerçek bir uzmanın anlatımı. Somut örnek, “neden”, sık yapılan hata, bir mini kontrol listesi ya da karşılaştırma tablosu (`<table><tr><th>…`).
- Kutu: `<div class="tip"><b>Başlık</b>metin</div>` ya da `<div class="note"><b>Başlık</b>metin</div>`.
- Her “Derinleş” bölümü yaklaşık 1.500–3.000 karakter düz metin olsun ve en az bir çalıştırılabilir kod kutusu (`C(...)`) içersin. Kod kutuları uygulamada seçili programa (SQL Server, PostgreSQL, MySQL, Oracle, BigQuery, SQLite) otomatik çevrilip çalıştırılır.
- Çalıştırılamayan (yalnızca gösterim) kod için: `'<pre class="code" data-norun>' + ... + '</pre>'`. Yalnızca bazı programlarda çalışan kutu için `data-na="tsql pg"` gibi (çalışmayan programlar).
- Görev metinlerinde istenen sütun adlarını `<code>` ile ver; sıralı sonuç gerekiyorsa `{ ord: true }` (= O) ve çözümde ORDER BY olsun, eşitlik bozucu ekle.

## Veri setleri (hepsi aynı veritabanında)
- Anadolu Market: customers, orders, order_items, products, employees, departments, web_events, ab_test …
- Anadolu Bank: bank_branches, bank_customers, bank_accounts, bank_txns (~42k), fx_rates
- Kanat Havayolları: hv_airports, hv_aircraft, hv_routes, hv_flights, hv_delays, hv_passengers, hv_bookings
- Lezzet Kurye: lk_restaurants, lk_menu_items, lk_customers, lk_couriers, lk_orders, lk_order_lines, lk_ratings
- Pusula İK: ik_departments, ik_positions, ik_employees, ik_job_history, ik_salaries, ik_reviews, ik_leaves, ik_requisitions, ik_candidates, ik_survey, ik_training
- Pedal İzmir: bk_stations, bk_bikes, bk_users, bk_weather, bk_trips (~116.500 satır; sorguları hızlı tut: <2 sn), bk_maintenance
Şemaya bakmak ve sorgu denemek için:
`cd /tmp/claude-0/-home-claude/84c5c883-3350-5f38-96e6-96fee4d5264d/scratchpad/aud && node q.js "SELECT sql FROM sqlite_master WHERE name='orders'" "SELECT ..."` (her argüman bir sorgu; ilk 25 satırı basar). Süre ölçmek için `node tm.js "..."`.

## Taşınabilirlik kuralları (çözümler SQLite sözdiziminde yazılır, motor diğer 5 programa çevirir)
- Tarih: `strftime('%Y-%m', x)`, `date(x)`, `julianday`. Dakika farkı `ROUND((julianday(a)-julianday(b))*1440)`, saniye `*86400`; gün farkı `julianday(date(a)) - julianday(date(b))`.
- Medyan için FLOOR kullan. `<> ''` kullanma (Oracle boş metni NULL sayar). Mantıksal ifadeyi toplama: `SUM(CASE WHEN … THEN 1 ELSE 0 END)`.
- FULL OUTER JOIN MySQL'de yok: alıştırmada `dl: ['sqlite','tsql','pg','oracle','bq']` ile MySQL'i dışla.
- ROLLUP: `base: 'tsql'` + `solv: {pg:…, oracle:…, mysql:'… WITH ROLLUP'}` kalıbı (c24.js'te örnek var).
- GROUP_CONCAT ORDER BY gerekiyorsa `solv: { mysql:…, oracle:… }`.
- `date(x,'+1 day','+1 month','-1 day')` gibi çok değiştiricili ifadeler tsql/pg'de çalışmaz → `dl: ['sqlite']` ya da kutuda `data-na="tsql pg"`.
- `%w` (haftanın günü) gibi SQLite'a özgü biçimler → `dl: ['sqlite']`.
- Belirli bir programa özgü alıştırma: `{ base: 'tsql', dl: ['tsql'] }` (çözüm o programın sözdiziminde). DDL/DML alıştırmalarında sonucu denetlemek için `check: 'SELECT … ORDER BY …'` (kullanıcının kodundan sonra çalışır).
- SQLite sınırı: ilişkili skaler alt sorgunun ORDER BY'ında dış sütuna başvurulamaz.
- Boş sonuç üreten alıştırma yazma.

## Denetim (bitirmeden önce ZORUNLU)
Denetim klasörü: /tmp/claude-0/-home-claude/84c5c883-3350-5f38-96e6-96fee4d5264d/scratchpad/aud
1. Sözdizimi: `node -e "global.window={SQLP_LESSONS:[],SQLP_PATHS:[],SQLP_PRACTICE:[]};require('/home/claude/sqlpatika/SENIN_DOSYAN.js')"`
2. Alıştırmalar (6 programda): `FILTER='^(ders-id-1|ders-id-2)$' node run.js` → çıktıda `calistirilan N oge M {}` olmalı; sorun varsa `sql_audit.json` dosyasına bak. (Alıştırma bankası öğeleri için FILTER onların id'sine uyar.) Uzun sürebilir; `timeout 1500` ile çalıştır.
3. Kod kutuları: `FILTER='^(ders-id-1|ders-id-2)$' node boxes.js` → `hata 0` olmalı.
 Not: Aynı anda başka ajanlar da denetim çalıştırıyor; `sql_audit.json` dosyası çakışabilir. Kendi denetimini `cp run.js run_SENINADIN.js` ile kopyalayıp kopyanın içindeki `'sql_audit.json'` adını değiştirerek çalıştır. boxes.js için de aynısı (`boxes.json`).
- ASLA `pkill -f` kullanma (kendi kabuğunu öldürür).
- Başka dosyaları DEĞİŞTİRME (index.html, c1…c29, diğer ajanların dosyaları). Yalnızca kendi dosyan ve denetim kopyaların.

## Bitirince
Kısa rapor: hangi derslere ne eklendi (ders başına 1 satır), kaç alıştırma, denetim sonuçları (çalıştırma sayısı / hata), çözemediğin bir şey varsa.
