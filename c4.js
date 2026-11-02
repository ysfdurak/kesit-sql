/* Kesit SQL içerik 4: Veri Analisti, Veri Bilimi, Veri Mühendisliği modülleri + patikalar, seviye testi, sözlük */
const REV = 'oi.quantity * oi.unit_price * (1 - oi.discount)';
(window.SQLP_LESSONS = window.SQLP_LESSONS || []).push(

/* ======================= VERİ ANALİSTİ ======================= */
{
  id: 'an-kpi', lv: 'B1', mod: 'Veri Analisti', min: 15, extra: true,
  title: 'İş metrikleri: ciro, sipariş, ortalama sepet',
  sum: 'KPI tanımlamak ve tek sorguda KPI tablosu üretmek.',
  body: `
<h2>Metrik tanımı her şeydir</h2>
<p>“Ciro ne kadar?” sorusunun cevabı tanıma göre değişir: İptaller dahil mi? İndirim düşülmüş mü? İadeler? Bir analistin ilk işi metriği <b>yazılı ve tek</b> bir tanıma bağlamaktır. Bu kursta:</p>
<ul>
<li><b>Brüt ciro</b>: <code>quantity * unit_price</code></li>
<li><b>Net ciro</b>: <code>quantity * unit_price * (1 - discount)</code>, sadece <code>status = 'delivered'</code></li>
<li><b>Sipariş sayısı</b>: <code>COUNT(DISTINCT order_id)</code></li>
<li><b>Ortalama sepet (AOV)</b>: net ciro / sipariş sayısı</li>
<li><b>Aktif müşteri</b>: dönem içinde en az bir teslim edilmiş siparişi olan müşteri</li>
<li><b>Brüt kâr</b>: net ciro − <code>quantity * cost</code></li>
</ul>
<h2>Aylık KPI tablosu</h2>
<pre class="code">SELECT strftime('%Y-%m', o.order_date) AS ay,
       COUNT(DISTINCT o.order_id) AS siparis,
       COUNT(DISTINCT o.customer_id) AS aktif_musteri,
       ROUND(SUM(${REV}), 0) AS net_ciro,
       ROUND(SUM(${REV}) / COUNT(DISTINCT o.order_id), 1) AS aov
FROM orders o
JOIN order_items oi ON oi.order_id = o.order_id
WHERE o.status = 'delivered' AND o.order_date >= '2024-01-01'
GROUP BY ay
ORDER BY ay;</pre>
<div class="tip"><b>Kontrol toplamı</b>Her KPI sorgusunu bilinen bir rakamla (finans raporu, önceki dashboard) karşılaştır. Farklıysa önce tanımı, sonra JOIN tanecik düzeyini kontrol et.</div>
`,
  ex: [
    { t: 'sql', q: '<p>2024 yılında teslim edilmiş siparişlerin <b>ortalama sepet tutarını</b> (AOV) hesapla, 2 basamağa yuvarla. Tek değer.</p>', sol: `SELECT ROUND(SUM(${REV}) / COUNT(DISTINCT o.order_id), 2) FROM orders o JOIN order_items oi ON oi.order_id = o.order_id WHERE o.status = 'delivered' AND o.order_date >= '2024-01-01' AND o.order_date < '2025-01-01';` },
    { t: 'sql', q: '<p>Her kategori için teslim edilmiş siparişlerden <b>net ciro</b>, <b>brüt kâr</b> (net ciro − adet × <code>products.cost</code>) ve <b>kâr marjı yüzdesi</b>ni getir. Hepsini 1 basamağa yuvarla, marja göre azalan sırala. Sütunlar: <code>category</code>, <code>ciro</code>, <code>kar</code>, <code>marj</code>.</p>', sol: `SELECT p.category, ROUND(SUM(${REV}), 1) AS ciro, ROUND(SUM(${REV} - oi.quantity * p.cost), 1) AS kar, ROUND(100.0 * SUM(${REV} - oi.quantity * p.cost) / SUM(${REV}), 1) AS marj FROM orders o JOIN order_items oi ON oi.order_id = o.order_id JOIN products p ON p.product_id = oi.product_id WHERE o.status = 'delivered' GROUP BY p.category ORDER BY marj DESC;`, ord: true },
    { t: 'sql', q: '<p>2024 için her <b>kanalın</b> iptal oranını (iptal edilen sipariş / toplam sipariş, yüzde, 1 basamak) getir: <code>channel</code>, <code>iptal_orani</code>.</p>', sol: "SELECT channel, ROUND(100.0 * SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) / COUNT(*), 1) AS iptal_orani FROM orders WHERE order_date LIKE '2024%' GROUP BY channel;" }
  ]
},
{
  id: 'an-temizlik', lv: 'B1', mod: 'Veri Analisti', min: 15, extra: true,
  title: 'Veri temizleme',
  sum: 'Boşluk, büyük/küçük harf, tutarsız şehir adları, tarih biçimi ve tekrarlar.',
  body: `
<h2>Gerçek veri kirlidir</h2>
<p><code>raw_signups</code> tablosu bir formdan gelen ham kayıtları içerir. Bak:</p>
<pre class="code">SELECT * FROM raw_signups LIMIT 12;</pre>
<p>Sorunlar: adlarda baş/son boşluk ve karışık harf, e-postalarda büyük harf, şehirlerde <code>'istanbul'</code>/<code>'ISTANBUL'</code>/<code>' Ankara'</code>, boş metin ve NULL, iki farklı tarih biçimi, tekrar eden satırlar.</p>
<h2>Adım adım temizlik</h2>
<pre class="code" data-diff="oracle">SELECT id,
       TRIM(full_name) AS ad,
       LOWER(TRIM(email)) AS email,
       CASE
         WHEN LOWER(TRIM(city)) IN ('istanbul', 'İstanbul') OR UPPER(TRIM(city)) = 'ISTANBUL' THEN 'İstanbul'
         WHEN LOWER(TRIM(city)) = 'ankara' THEN 'Ankara'
         WHEN LOWER(TRIM(city)) IN ('izmir', 'İzmir') THEN 'İzmir'
         ELSE NULLIF(TRIM(city), '')
       END AS sehir,
       CASE
         WHEN signup_date LIKE '__.__.____'
           THEN substr(signup_date, 7, 4) || '-' || substr(signup_date, 4, 2) || '-' || substr(signup_date, 1, 2)
         ELSE signup_date
       END AS kayit_tarihi
FROM raw_signups;</pre>
<div class="note"><b>Türkçe İ/ı sorunu</b>SQLite'ın LOWER fonksiyonu <code>'İ'</code> harfini dönüştürmez. Bu yüzden eşleme tablosuna her iki yazımı da koyduk. Gerçek projelerde bir <b>eşleme (mapping) tablosu</b> tutmak en sağlam yoldur.</div>
<h2>Tekrarları atmak</h2>
<pre class="code">SELECT COUNT(*) AS satir,
       COUNT(DISTINCT id) AS farkli_id,
       COUNT(DISTINCT LOWER(TRIM(email))) AS farkli_email
FROM raw_signups;</pre>
`,
  ex: [
    { t: 'sql', q: '<p><code>raw_signups</code> tablosunda e-postaları <code>LOWER(TRIM(email))</code> ile normalleştirdiğinde kaç <b>farklı</b> e-posta var? Tek değer.</p>', sol: 'SELECT COUNT(DISTINCT LOWER(TRIM(email))) FROM raw_signups;' },
    { t: 'sql', q: '<p><code>signup_date</code> değerlerini <code>YYYY-AA-GG</code> biçimine çevir: <code>GG.AA.YYYY</code> biçimindekileri dönüştür, diğerlerini olduğu gibi bırak. Sütunlar: <code>id</code>, <code>tarih</code>. Tekrarlı satırlar olduğu gibi kalsın.</p>', sol: "SELECT id, CASE WHEN signup_date LIKE '__.__.____' THEN substr(signup_date, 7, 4) || '-' || substr(signup_date, 4, 2) || '-' || substr(signup_date, 1, 2) ELSE signup_date END AS tarih FROM raw_signups;", hint: "<code>LIKE '__.__.____'</code> ile biçimi yakala, <code>substr</code> ile parçaları yeniden diz." },
    { t: 'sql', q: '<p>Şehir değeri <b>boş metin veya NULL</b> olan kaç satır var? <code>NULLIF(TRIM(city), \'\')</code> kullan. Tek değer.</p>', sol: "SELECT COUNT(*) FROM raw_signups WHERE NULLIF(TRIM(city), '') IS NULL;", diff: ['oracle'] }
  ]
},
{
  id: 'an-dashboard', lv: 'B1', mod: 'Veri Analisti', min: 12, extra: true,
  title: 'Dashboard için sorgu tasarımı',
  sum: 'Tarih iskeleti, sıfır doldurma ve BI aracına hazır tablolar.',
  body: `
<h2>Grafikte boşluk olmasın</h2>
<p>Bir günde hiç sipariş yoksa GROUP BY o günü hiç döndürmez ve çizgi grafik yanlış görünür. Çözüm: <b>tarih iskeleti</b> (date spine) üret, LEFT JOIN yap, NULL'ları 0 yap.</p>
<pre class="code">WITH RECURSIVE gun(d) AS (
  SELECT '2024-12-01' UNION ALL SELECT date(d, '+1 day') FROM gun WHERE d < '2024-12-31'
),
satis AS (
  SELECT order_date, COUNT(*) AS siparis FROM orders GROUP BY order_date
)
SELECT g.d AS tarih, COALESCE(s.siparis, 0) AS siparis
FROM gun g LEFT JOIN satis s ON s.order_date = g.d
ORDER BY g.d;</pre>
<h2>BI aracına hazır tablo ilkeleri</h2>
<ul>
<li><b>Uzun format</b>: <code>(tarih, boyut, metrik_değeri)</code> şeklinde tablolar Tableau, Power BI, Looker gibi araçlarda en esnek kullanımı sağlar.</li>
<li><b>Hesaplamayı veritabanında yap</b>, aracın içinde değil; tanım tek yerde kalır.</li>
<li><b>Tanecik düzeyini adlandır</b>: <code>agg_daily_channel</code> gibi.</li>
<li><b>Oranları ayrı sütunlarda payda ve pay olarak da ver</b>; böylece araç farklı düzeylerde doğru toplayabilir (oranların ortalaması alınmaz!).</li>
</ul>
<div class="warn"><b>Oranların ortalaması tuzağı</b>Günlük dönüşüm oranlarının ortalaması, dönemin dönüşüm oranı değildir. Doğrusu: <code>SUM(donusen) / SUM(ziyaret)</code>.</div>
`,
  ex: [
    { t: 'sql', q: '<p>2024 <b>Şubat</b> ayının her günü için sipariş sayısını getir; sipariş olmayan günler 0 görünsün. Sütunlar: <code>tarih</code>, <code>siparis</code>, tarihe göre sıralı. (2024 artık yıl, 29 gün!)</p>', sol: "WITH RECURSIVE g(d) AS (SELECT '2024-02-01' UNION ALL SELECT date(d, '+1 day') FROM g WHERE d < '2024-02-29') SELECT g.d AS tarih, COUNT(o.order_id) AS siparis FROM g LEFT JOIN orders o ON o.order_date = g.d GROUP BY g.d ORDER BY g.d;", ord: true },
    { t: 'mc', q: '<p>Pazartesi 100 ziyaret/10 dönüşüm, Salı 900 ziyaret/18 dönüşüm. İki günün dönüşüm oranı nedir?</p>', o: ['%6 (oranların ortalaması)', '%2.8 (toplam dönüşüm / toplam ziyaret)', '%10', '%2'], a: 1, why: '28 / 1000 = %2.8. Oranların ortalaması (%10 ve %2 → %6) yanıltıcıdır.' }
  ]
},
{
  id: 'an-buyume', lv: 'B2', mod: 'Veri Analisti', min: 14, extra: true,
  title: 'Büyüme analizi: MoM ve YoY',
  sum: 'Aydan aya ve yıldan yıla büyüme oranları.',
  body: `
<h2>Büyüme oranı</h2>
<p><code>büyüme = (bu dönem − önceki dönem) / önceki dönem</code></p>
<ul><li><b>MoM</b> (month over month): Bir önceki ayla karşılaştırma. Mevsimsellikten etkilenir.</li>
<li><b>YoY</b> (year over year): Geçen yılın aynı ayıyla karşılaştırma. Mevsimselliği nötrler.</li></ul>
<pre class="code">WITH aylik AS (
  SELECT strftime('%Y-%m', o.order_date) AS ay,
         SUM(${REV}) AS ciro
  FROM orders o JOIN order_items oi ON oi.order_id = o.order_id
  WHERE o.status = 'delivered'
  GROUP BY ay
)
SELECT ay, ROUND(ciro) AS ciro,
       ROUND(100.0 * (ciro / LAG(ciro, 1) OVER (ORDER BY ay) - 1), 1) AS mom_yuzde,
       ROUND(100.0 * (ciro / LAG(ciro, 12) OVER (ORDER BY ay) - 1), 1) AS yoy_yuzde
FROM aylik
ORDER BY ay;</pre>
<div class="warn"><b>LAG(x, 12) ancak her ay varsa doğrudur</b>Eksik ay varsa 12 satır geri gitmek 12 ay geri gitmek demek değildir. Güvenli yol: önce ay iskeleti üret veya geçen yılın ayıyla self join yap.</div>
<pre class="code">WITH aylik AS (
  SELECT strftime('%Y', order_date) AS yil, strftime('%m', order_date) AS ay, COUNT(*) AS siparis
  FROM orders GROUP BY yil, ay
)
SELECT b.ay, a.siparis AS s2023, b.siparis AS s2024,
       ROUND(100.0 * (b.siparis - a.siparis) / a.siparis, 1) AS yoy
FROM aylik b JOIN aylik a ON a.ay = b.ay AND a.yil = '2023'
WHERE b.yil = '2024'
ORDER BY b.ay;</pre>
`,
  ex: [
    { t: 'sql', q: '<p>Yıllık sipariş sayılarını ve bir önceki yıla göre <b>büyüme yüzdesini</b> (1 basamak) getir: <code>yil</code>, <code>siparis</code>, <code>buyume</code>. İlk yılın büyümesi NULL olacak.</p>', sol: "WITH y AS (SELECT strftime('%Y', order_date) AS yil, COUNT(*) AS siparis FROM orders GROUP BY yil) SELECT yil, siparis, ROUND(100.0 * (siparis - LAG(siparis) OVER (ORDER BY yil)) / LAG(siparis) OVER (ORDER BY yil), 1) AS buyume FROM y ORDER BY yil;", ord: true },
    { t: 'sql', q: '<p>Her ay numarası (<code>01</code>–<code>12</code>) için 2023 ve 2024 <b>teslim edilmiş</b> sipariş sayılarını ve YoY yüzdesini (1 basamak) self join ile getir: <code>ay</code>, <code>s2023</code>, <code>s2024</code>, <code>yoy</code>. Aya göre sırala.</p>', sol: "WITH m AS (SELECT strftime('%Y', order_date) AS yil, strftime('%m', order_date) AS ay, COUNT(*) AS n FROM orders WHERE status = 'delivered' GROUP BY yil, ay) SELECT b.ay, a.n AS s2023, b.n AS s2024, ROUND(100.0 * (b.n - a.n) / a.n, 1) AS yoy FROM m b JOIN m a ON a.ay = b.ay AND a.yil = '2023' WHERE b.yil = '2024' ORDER BY b.ay;", ord: true }
  ]
},
{
  id: 'an-pareto', lv: 'B2', mod: 'Veri Analisti', min: 12, extra: true,
  title: 'Pareto ve ABC analizi',
  sum: 'Cironun %80\'ini hangi ürünler getiriyor?',
  body: `
<h2>80/20 kuralı</h2>
<p>Pareto ilkesi: Sonuçların büyük kısmı az sayıda nedenden gelir. Ürünleri ciroya göre sıralayıp <b>kümülatif payı</b> hesaplarsan:</p>
<ul><li><b>A sınıfı</b>: Kümülatif payın ilk %80'i (çok değerli, az ürün)</li><li><b>B sınıfı</b>: %80–95</li><li><b>C sınıfı</b>: Kalan %5 (uzun kuyruk)</li></ul>
<pre class="code">WITH urun AS (
  SELECT p.name, SUM(${REV}) AS ciro
  FROM order_items oi
  JOIN orders o ON o.order_id = oi.order_id
  JOIN products p ON p.product_id = oi.product_id
  WHERE o.status = 'delivered'
  GROUP BY p.product_id
),
k AS (
  SELECT name, ciro,
         SUM(ciro) OVER (ORDER BY ciro DESC ROWS UNBOUNDED PRECEDING) / SUM(ciro) OVER () AS kum_pay
  FROM urun
)
SELECT name, ROUND(ciro) AS ciro, ROUND(100 * kum_pay, 1) AS kum_yuzde,
       CASE WHEN kum_pay <= 0.80 THEN 'A' WHEN kum_pay <= 0.95 THEN 'B' ELSE 'C' END AS sinif
FROM k
ORDER BY ciro DESC;</pre>
`,
  ex: [
    { t: 'sql', q: '<p>Yukarıdaki ABC analizini kullanarak her sınıfta <b>kaç ürün</b> olduğunu getir: <code>sinif</code>, <code>urun_sayisi</code>, sınıfa göre sıralı.</p>', sol: `WITH urun AS (SELECT p.product_id, SUM(${REV}) AS ciro FROM order_items oi JOIN orders o ON o.order_id = oi.order_id JOIN products p ON p.product_id = oi.product_id WHERE o.status = 'delivered' GROUP BY p.product_id), k AS (SELECT ciro, SUM(ciro) OVER (ORDER BY ciro DESC ROWS UNBOUNDED PRECEDING) / SUM(ciro) OVER () AS kum_pay FROM urun) SELECT CASE WHEN kum_pay <= 0.80 THEN 'A' WHEN kum_pay <= 0.95 THEN 'B' ELSE 'C' END AS sinif, COUNT(*) AS urun_sayisi FROM k GROUP BY sinif ORDER BY sinif;`, ord: true },
    { t: 'sql', q: '<p>Teslim edilmiş siparişlerde <b>en çok ciro getiren %20 müşterinin</b> (NTILE(5) ile en üst dilim) toplam cirodaki payını yüzde olarak (1 basamak) hesapla. Tek değer.</p>', sol: `WITH m AS (SELECT o.customer_id, SUM(${REV}) AS ciro FROM orders o JOIN order_items oi ON oi.order_id = o.order_id WHERE o.status = 'delivered' GROUP BY o.customer_id), d AS (SELECT ciro, NTILE(5) OVER (ORDER BY ciro DESC) AS dilim FROM m) SELECT ROUND(100.0 * SUM(CASE WHEN dilim = 1 THEN ciro ELSE 0 END) / SUM(ciro), 1) FROM d;`, hint: 'Müşteri cirosunu hesapla, NTILE(5) OVER (ORDER BY ciro DESC) ile dilimle, 1. dilimin toplamını genel toplama böl.' }
  ]
},
{
  id: 'an-kohort', lv: 'B2', mod: 'Veri Analisti', min: 20, extra: true,
  title: 'Kohort ve elde tutma (retention) analizi',
  sum: 'Müşteriler ilk alışverişlerinden sonra geri geliyor mu?',
  body: `
<h2>Kohort nedir?</h2>
<p>Kohort, aynı dönemde başlayan kullanıcı grubudur. En yaygını: <b>ilk sipariş ayına göre kohort</b>. Sonra her kohortun sonraki aylarda yüzde kaçının tekrar sipariş verdiği izlenir.</p>
<h2>Üç adım</h2>
<ol><li>Her müşterinin kohort ayını bul (ilk sipariş ayı).</li><li>Her siparişin kohort ayından kaç ay sonra olduğunu hesapla (ay_farki).</li><li>Kohort × ay_farki için aktif müşteri sayısını say, kohort büyüklüğüne böl.</li></ol>
<pre class="code">WITH ilk AS (
  SELECT customer_id, MIN(order_date) AS ilk_tarih
  FROM orders GROUP BY customer_id
),
akt AS (
  SELECT o.customer_id,
         strftime('%Y-%m', i.ilk_tarih) AS kohort,
         (CAST(strftime('%Y', o.order_date) AS INTEGER) - CAST(strftime('%Y', i.ilk_tarih) AS INTEGER)) * 12
         + CAST(strftime('%m', o.order_date) AS INTEGER) - CAST(strftime('%m', i.ilk_tarih) AS INTEGER) AS ay_farki
  FROM orders o JOIN ilk i ON i.customer_id = o.customer_id
),
tablo AS (
  SELECT kohort, ay_farki, COUNT(DISTINCT customer_id) AS musteri
  FROM akt GROUP BY kohort, ay_farki
)
SELECT t.kohort,
       MAX(CASE WHEN ay_farki = 0 THEN musteri END) AS boyut,
       ROUND(100.0 * MAX(CASE WHEN ay_farki = 1 THEN musteri END) / MAX(CASE WHEN ay_farki = 0 THEN musteri END), 1) AS ay1,
       ROUND(100.0 * MAX(CASE WHEN ay_farki = 3 THEN musteri END) / MAX(CASE WHEN ay_farki = 0 THEN musteri END), 1) AS ay3,
       ROUND(100.0 * MAX(CASE WHEN ay_farki = 6 THEN musteri END) / MAX(CASE WHEN ay_farki = 0 THEN musteri END), 1) AS ay6
FROM tablo t
WHERE kohort >= '2023-01'
GROUP BY t.kohort
ORDER BY t.kohort;</pre>
<div class="tip"><b>Okuma ipucu</b>Kohort tablosunda satırlar başlangıç dönemini, sütunlar yaşı gösterir. Bir sütunu yukarıdan aşağı okumak, ürün değişikliklerinin elde tutmayı iyileştirip iyileştirmediğini gösterir.</div>
`,
  ex: [
    { t: 'sql', q: '<p>Her <b>kohort ayının</b> (ilk sipariş ayı) <b>büyüklüğünü</b> getir: <code>kohort</code>, <code>musteri</code>. Kohorta göre sırala.</p>', sol: "WITH ilk AS (SELECT customer_id, MIN(order_date) AS d FROM orders GROUP BY customer_id) SELECT strftime('%Y-%m', d) AS kohort, COUNT(*) AS musteri FROM ilk GROUP BY kohort ORDER BY kohort;", ord: true },
    { t: 'sql', q: '<p>Tüm müşteriler için <b>ilk siparişten sonraki 90 gün içinde</b> ikinci bir sipariş vermiş müşterilerin oranını (yüzde, 1 basamak) hesapla. Payda: en az bir siparişi olan tüm müşteriler.</p>', sol: "WITH s AS (SELECT customer_id, order_date, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date, order_id) AS rn FROM orders), p AS (SELECT a.customer_id, CASE WHEN b.order_date IS NOT NULL AND julianday(b.order_date) - julianday(a.order_date) <= 90 THEN 1 ELSE 0 END AS geri FROM s a LEFT JOIN s b ON b.customer_id = a.customer_id AND b.rn = 2 WHERE a.rn = 1) SELECT ROUND(100.0 * SUM(geri) / COUNT(*), 1) FROM p;", hint: 'ROW_NUMBER ile her müşterinin 1. ve 2. siparişini bul, self join ile gün farkını hesapla.' }
  ]
},
{
  id: 'an-funnel', lv: 'B2', mod: 'Veri Analisti', min: 15, extra: true,
  title: 'Dönüşüm hunisi (funnel) analizi',
  sum: 'Ziyaretten satın almaya her adımda kaç kullanıcı kaybediliyor?',
  body: `
<h2>Huni adımları</h2>
<p><code>web_events</code>: <code>visit → product_view → add_to_cart → checkout → purchase</code>. Her adıma ulaşan <b>farklı kullanıcı</b> sayısını say:</p>
<pre class="code">SELECT
  COUNT(DISTINCT CASE WHEN event_type = 'visit' THEN user_id END) AS ziyaret,
  COUNT(DISTINCT CASE WHEN event_type = 'product_view' THEN user_id END) AS urun_gor,
  COUNT(DISTINCT CASE WHEN event_type = 'add_to_cart' THEN user_id END) AS sepet,
  COUNT(DISTINCT CASE WHEN event_type = 'checkout' THEN user_id END) AS odeme,
  COUNT(DISTINCT CASE WHEN event_type = 'purchase' THEN user_id END) AS satin_alma
FROM web_events;</pre>
<h2>Adım dönüşüm oranları (uzun format)</h2>
<pre class="code">WITH adim AS (
  SELECT event_type,
         CASE event_type WHEN 'visit' THEN 1 WHEN 'product_view' THEN 2 WHEN 'add_to_cart' THEN 3
                         WHEN 'checkout' THEN 4 WHEN 'purchase' THEN 5 END AS sira,
         COUNT(DISTINCT user_id) AS kullanici
  FROM web_events GROUP BY event_type
)
SELECT sira, event_type, kullanici,
       ROUND(100.0 * kullanici / LAG(kullanici) OVER (ORDER BY sira), 1) AS onceki_adima_gore,
       ROUND(100.0 * kullanici / FIRST_VALUE(kullanici) OVER (ORDER BY sira), 1) AS basa_gore
FROM adim ORDER BY sira;</pre>
<div class="note"><b>Sıralı huni</b>Gerçek analizde kullanıcının adımları <b>doğru sırada</b> yapması da kontrol edilir (ör. checkout zamanı add_to_cart'tan sonra olmalı). Bunun için her adımın ilk zamanını MIN ile alıp karşılaştırırsın.</div>
`,
  ex: [
    { t: 'sql', q: '<p>Cihaz (<code>device</code>) bazında, ziyaret eden kullanıcıların yüzde kaçının <b>satın aldığını</b> hesapla (1 basamak): <code>device</code>, <code>ziyaret</code>, <code>satin_alma</code>, <code>donusum</code>.</p>', sol: "SELECT device, COUNT(DISTINCT CASE WHEN event_type = 'visit' THEN user_id END) AS ziyaret, COUNT(DISTINCT CASE WHEN event_type = 'purchase' THEN user_id END) AS satin_alma, ROUND(100.0 * COUNT(DISTINCT CASE WHEN event_type = 'purchase' THEN user_id END) / COUNT(DISTINCT CASE WHEN event_type = 'visit' THEN user_id END), 1) AS donusum FROM web_events GROUP BY device;" },
    { t: 'sql', q: '<p>Sepete ekleyip (<code>add_to_cart</code>) <b>satın almayan</b> kullanıcı sayısını bul. Tek değer.</p>', sol: "SELECT COUNT(DISTINCT user_id) FROM web_events w WHERE event_type = 'add_to_cart' AND NOT EXISTS (SELECT 1 FROM web_events p WHERE p.user_id = w.user_id AND p.event_type = 'purchase');" }
  ]
},
{
  id: 'an-rfm', lv: 'C1', mod: 'Veri Analisti', min: 18, extra: true,
  title: 'RFM müşteri segmentasyonu',
  sum: 'Recency, Frequency, Monetary skorlarıyla müşteri segmentleri.',
  body: `
<h2>Üç soru</h2>
<ul><li><b>R</b>ecency: En son ne zaman aldı? (yakın = iyi)</li><li><b>F</b>requency: Kaç kez aldı?</li><li><b>M</b>onetary: Ne kadar harcadı?</li></ul>
<p>Her boyut NTILE ile 1–5 arası skora çevrilir, sonra skor kombinasyonlarından segment üretilir.</p>
<pre class="code">WITH m AS (
  SELECT o.customer_id,
         julianday('2025-01-01') - julianday(MAX(o.order_date)) AS recency_gun,
         COUNT(DISTINCT o.order_id) AS frequency,
         SUM(${REV}) AS monetary
  FROM orders o JOIN order_items oi ON oi.order_id = o.order_id
  WHERE o.status = 'delivered'
  GROUP BY o.customer_id
),
s AS (
  SELECT customer_id, recency_gun, frequency, ROUND(monetary) AS monetary,
         NTILE(5) OVER (ORDER BY recency_gun DESC) AS r,
         NTILE(5) OVER (ORDER BY frequency) AS f,
         NTILE(5) OVER (ORDER BY monetary) AS m
  FROM m
)
SELECT *,
       CASE WHEN r >= 4 AND f >= 4 THEN 'Şampiyon'
            WHEN r >= 3 AND f >= 3 THEN 'Sadık'
            WHEN r >= 4 AND f <= 2 THEN 'Yeni / Umut vadeden'
            WHEN r <= 2 AND f >= 3 THEN 'Risk altında'
            ELSE 'Uykuda' END AS segment
FROM s
ORDER BY r DESC, f DESC
LIMIT 15;</pre>
<p>Recency'de sıralama <b>DESC</b>: en uzun süredir gelmeyen 1, en yakın zamanda gelen 5 alır.</p>
`,
  ex: [
    { t: 'sql', q: '<p>Yukarıdaki RFM mantığıyla (aynı segment kuralları, referans tarihi <code>2025-01-01</code>, sadece teslim edilmiş siparişler) her <b>segmentteki müşteri sayısını</b> getir: <code>segment</code>, <code>musteri</code>. NTILE eşitliklerini sabitlemek için her sıralamaya ikinci anahtar olarak <code>customer_id</code> ekle.</p>', sol: `WITH m AS (SELECT o.customer_id, julianday('2025-01-01') - julianday(MAX(o.order_date)) AS rec, COUNT(DISTINCT o.order_id) AS fr, SUM(${REV}) AS mo FROM orders o JOIN order_items oi ON oi.order_id = o.order_id WHERE o.status = 'delivered' GROUP BY o.customer_id), s AS (SELECT customer_id, NTILE(5) OVER (ORDER BY rec DESC, customer_id) AS r, NTILE(5) OVER (ORDER BY fr, customer_id) AS f FROM m) SELECT CASE WHEN r >= 4 AND f >= 4 THEN 'Şampiyon' WHEN r >= 3 AND f >= 3 THEN 'Sadık' WHEN r >= 4 AND f <= 2 THEN 'Yeni / Umut vadeden' WHEN r <= 2 AND f >= 3 THEN 'Risk altında' ELSE 'Uykuda' END AS segment, COUNT(*) AS musteri FROM s GROUP BY segment;`, hint: "<code>NTILE(5) OVER (ORDER BY rec DESC, customer_id)</code> ve <code>NTILE(5) OVER (ORDER BY fr, customer_id)</code>. Segment için M skoru gerekmiyor." }
  ]
},

/* ======================= VERİ BİLİMİ ======================= */
{
  id: 'ds-tanimsal', lv: 'B1', mod: 'Veri Bilimi', min: 14, extra: true,
  title: 'SQL ile tanımlayıcı istatistik',
  sum: 'Ortalama, medyan, standart sapma, varyans, mod.',
  body: `
<h2>Veriyi tanımak</h2>
<p>Modelden önce dağılımı anlamak gerekir. Bu uygulamada standart SQLite'a ek olarak <code>MEDIAN</code>, <code>STDDEV</code> (<code>STDDEV_SAMP</code>), <code>STDDEV_POP</code>, <code>VARIANCE</code>, <code>VAR_POP</code> fonksiyonları tanımlıdır. Bunlar PostgreSQL, Snowflake ve BigQuery'deki karşılıklarıyla aynı mantıkta çalışır.</p>
<pre class="code">WITH sepet AS (
  SELECT o.order_id, SUM(${REV}) AS tutar
  FROM orders o JOIN order_items oi ON oi.order_id = o.order_id
  WHERE o.status = 'delivered'
  GROUP BY o.order_id
)
SELECT COUNT(*) AS n,
       ROUND(AVG(tutar), 1) AS ortalama,
       ROUND(MEDIAN(tutar), 1) AS medyan,
       ROUND(STDDEV(tutar), 1) AS std,
       ROUND(MIN(tutar), 1) AS min, ROUND(MAX(tutar), 1) AS max
FROM sepet;</pre>
<p>Ortalama medyandan çok büyükse dağılım <b>sağa çarpık</b>tır (birkaç büyük sepet ortalamayı yukarı çeker). E-ticarette çok yaygındır; bu yüzden medyan raporlamak çoğu zaman daha dürüsttür.</p>
<h2>Standart SQL'de medyan</h2>
<p>PostgreSQL/Oracle/SQL Server'da: <code>PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY tutar)</code>. BigQuery'de <code>APPROX_QUANTILES(tutar, 2)[OFFSET(1)]</code>.</p>
<h2>Mod (en sık değer)</h2>
<pre class="code">SELECT quantity, COUNT(*) AS frekans
FROM order_items
GROUP BY quantity
ORDER BY frekans DESC
LIMIT 1;</pre>
<h2>Varyansı elle hesaplamak</h2>
<p>Formül: <code>Var = (Σx² − (Σx)²/n) / (n − 1)</code>. Fonksiyon olmayan ortamlarda işe yarar:</p>
<pre class="code">SELECT (SUM(price * price) - SUM(price) * SUM(price) / COUNT(*)) / (COUNT(*) - 1) AS varyans_elle,
       VARIANCE(price) AS varyans_fonk
FROM products;</pre>
`,
  ex: [
    { t: 'sql', q: '<p>Çalışan maaşlarının <b>ortalama, medyan ve standart sapmasını</b> (örneklem) getir, hepsini tam sayıya yuvarla.</p>', sol: 'SELECT ROUND(AVG(salary)), ROUND(MEDIAN(salary)), ROUND(STDDEV(salary)) FROM employees;' },
    { t: 'sql', q: '<p>Her kategori için ürün fiyatlarının <b>ortalama ve medyanını</b> getir (1 basamak) ve ortalama/medyan oranına göre en çarpık kategori en üstte olacak şekilde sırala: <code>category</code>, <code>ort</code>, <code>med</code>.</p>', sol: 'SELECT category, ROUND(AVG(price), 1) AS ort, ROUND(MEDIAN(price), 1) AS med FROM products GROUP BY category ORDER BY AVG(price) / MEDIAN(price) DESC;', ord: true }
  ]
},
{
  id: 'ds-dagilim', lv: 'B2', mod: 'Veri Bilimi', min: 14, extra: true,
  title: 'Dağılımlar ve histogram (binning)',
  sum: 'Sabit genişlikli kutular, logaritmik kutular ve yüzdelikler.',
  body: `
<h2>Sabit genişlikli histogram</h2>
<p>Değeri kutu genişliğine bölüp aşağı yuvarlarsın:</p>
<pre class="code">WITH sepet AS (
  SELECT o.order_id, SUM(${REV}) AS tutar
  FROM orders o JOIN order_items oi ON oi.order_id = o.order_id
  GROUP BY o.order_id
)
SELECT FLOOR(tutar / 500) * 500 AS kutu_alt,
       COUNT(*) AS siparis
FROM sepet
GROUP BY kutu_alt
ORDER BY kutu_alt;</pre>
<h2>Çarpık dağılımlar için log ölçek</h2>
<pre class="code">SELECT FLOOR(log10(price)) AS basamak, COUNT(*) AS urun,
       MIN(price) AS min, MAX(price) AS max
FROM products
GROUP BY basamak ORDER BY basamak;</pre>
<h2>Yüzdelikler (quantile)</h2>
<p>NTILE(100) ile yüzdelik dilimler çıkarılabilir; ya da sıralayıp belirli sıradaki değeri seçersin:</p>
<pre class="code">WITH s AS (
  SELECT salary, ROW_NUMBER() OVER (ORDER BY salary) AS rn, COUNT(*) OVER () AS n
  FROM employees
)
SELECT MAX(CASE WHEN rn = FLOOR(0.25 * n) + 1 THEN salary END) AS q1_yaklasik,
       MAX(CASE WHEN rn = FLOOR(0.75 * n) + 1 THEN salary END) AS q3_yaklasik
FROM s;</pre>
`,
  ex: [
    { t: 'sql', q: '<p>Müşterilerin doğum yılını <b>10 yıllık kutulara</b> ayır (1960, 1970, …) ve her kutudaki müşteri sayısını getir: <code>onyil</code>, <code>musteri</code>. Sırala.</p>', sol: 'SELECT FLOOR(birth_year / 10) * 10 AS onyil, COUNT(*) AS musteri FROM customers GROUP BY onyil ORDER BY onyil;', ord: true },
    { t: 'sql', q: '<p>Müşteri başına sipariş sayısının dağılımını <b>2\'şerli kutularla</b> göster (0–1, 2–3, 4–5, …): <code>kutu</code> (alt sınır), <code>musteri</code>. Sadece siparişi olan müşteriler. Sırala.</p>', sol: 'WITH c AS (SELECT customer_id, COUNT(*) AS n FROM orders GROUP BY customer_id) SELECT FLOOR(n / 2) * 2 AS kutu, COUNT(*) AS musteri FROM c GROUP BY kutu ORDER BY kutu;', ord: true }
  ]
},
{
  id: 'ds-outlier', lv: 'B2', mod: 'Veri Bilimi', min: 15, extra: true,
  title: 'Aykırı değer tespiti: z-skoru ve IQR',
  sum: 'İstatistiksel olarak sıra dışı kayıtları SQL ile işaretlemek.',
  body: `
<h2>Z-skoru</h2>
<p><code>z = (x − ortalama) / standart sapma</code>. |z| &gt; 3 genelde aykırı kabul edilir (daha küçük örneklerde 2–2.5).</p>
<pre class="code">WITH sepet AS (
  SELECT o.order_id, SUM(${REV}) AS tutar
  FROM orders o JOIN order_items oi ON oi.order_id = o.order_id
  GROUP BY o.order_id
),
istat AS (
  SELECT AVG(tutar) AS ort, STDDEV(tutar) AS sd FROM sepet
)
SELECT s.order_id, ROUND(s.tutar) AS tutar, ROUND((s.tutar - i.ort) / i.sd, 2) AS z
FROM sepet s CROSS JOIN istat i
WHERE ABS((s.tutar - i.ort) / i.sd) > 3
ORDER BY z DESC;</pre>
<p>İstatistikleri tek satırlık bir CTE'de hesaplayıp CROSS JOIN ile her satıra taşımak taşınabilir bir kalıptır. PostgreSQL ve BigQuery'de <code>STDDEV(tutar) OVER ()</code> yazarak pencere fonksiyonu olarak da kullanabilirsin (bu uygulamadaki ek fonksiyonlar pencere olarak çalışmaz).</p>
<h2>IQR yöntemi</h2>
<p>Z-skoru normal dağılım varsayar; çarpık verilerde IQR daha sağlamdır: <code>IQR = Q3 − Q1</code>, aykırı sınırları <code>Q1 − 1.5·IQR</code> ve <code>Q3 + 1.5·IQR</code>.</p>
<pre class="code">WITH s AS (
  SELECT price, NTILE(4) OVER (ORDER BY price) AS q FROM products
),
sinir AS (
  SELECT MAX(CASE WHEN q = 1 THEN price END) AS q1,
         MAX(CASE WHEN q = 3 THEN price END) AS q3
  FROM s
)
SELECT p.name, p.price
FROM products p, sinir
WHERE p.price > q3 + 1.5 * (q3 - q1) OR p.price < q1 - 1.5 * (q3 - q1);</pre>
`,
  ex: [
    { t: 'sql', q: '<p>Ürün fiyatlarının <b>z-skorunu</b> hesapla ve |z| &gt; 2 olan ürünleri getir: <code>name</code>, <code>price</code>, <code>z</code> (2 basamak). z\'ye göre azalan sırala.</p>', sol: 'WITH i AS (SELECT AVG(price) AS ort, STDDEV(price) AS sd FROM products), z AS (SELECT name, price, (price - i.ort) / i.sd AS z FROM products CROSS JOIN i) SELECT name, price, ROUND(z, 2) AS z FROM z WHERE ABS(z) > 2 ORDER BY z DESC;', ord: true, hint: 'Önce ortalama ve standart sapmayı tek satırlık bir CTE\'de hesapla, sonra CROSS JOIN ile ürünlere bağla.' },
    { t: 'mc', q: '<p>Gelir verisi gibi sağa çok çarpık bir dağılımda aykırı değer tespiti için hangisi daha uygundur?</p>', o: ['Z-skoru, çünkü her zaman çalışır', 'IQR (çeyrekler arası açıklık), çünkü ortalama ve sapmaya duyarlı değildir', 'Ortalamadan büyük her değer', 'MAX değeri'], a: 1 }
  ]
},
{
  id: 'ds-korelasyon', lv: 'C1', mod: 'Veri Bilimi', min: 14, extra: true,
  title: 'Korelasyon ve basit doğrusal regresyon',
  sum: 'Pearson korelasyonu ve en küçük kareler eğimini SQL ile hesaplamak.',
  body: `
<h2>Pearson korelasyonu</h2>
<p><code>r = (nΣxy − ΣxΣy) / √[(nΣx² − (Σx)²)(nΣy² − (Σy)²)]</code></p>
<p>PostgreSQL, Snowflake, BigQuery'de <code>CORR(x, y)</code> hazır gelir. Formülle hesaplamak, mantığını anlamak için iyidir. Soru: Ürün fiyatı ile satılan adet arasında ilişki var mı?</p>
<pre class="code">WITH d AS (
  SELECT p.price AS x, COALESCE(SUM(oi.quantity), 0) AS y
  FROM products p LEFT JOIN order_items oi ON oi.product_id = p.product_id
  GROUP BY p.product_id
)
SELECT ROUND(
  (COUNT(*) * SUM(x * y) - SUM(x) * SUM(y)) /
  (SQRT(COUNT(*) * SUM(x * x) - SUM(x) * SUM(x)) * SQRT(COUNT(*) * SUM(y * y) - SUM(y) * SUM(y)))
, 3) AS pearson_r
FROM d;</pre>
<h2>Doğrusal regresyon (y = a + bx)</h2>
<p>Eğim <code>b = (nΣxy − ΣxΣy) / (nΣx² − (Σx)²)</code>, kesişim <code>a = ȳ − b·x̄</code>. PostgreSQL'de <code>REGR_SLOPE</code>, <code>REGR_INTERCEPT</code>, <code>REGR_R2</code>.</p>
<div class="warn"><b>Korelasyon nedensellik değildir</b>Ucuz ürünlerin çok satması, ucuzluğun satışa neden olduğunu kanıtlamaz; ürün türü (kitap vs. monitör) ortak bir etken olabilir.</div>
`,
  ex: [
    { t: 'sql', q: '<p>Fiyatı (<code>x</code>) ile log ölçekte satılan adet arasındaki ilişkiye bakmak yerine basit tut: Ürün <b>fiyatı</b> (x) ile <b>maliyeti</b> (y) arasındaki Pearson korelasyonunu hesapla (3 basamak). Tek değer.</p>', sol: 'SELECT ROUND((COUNT(*) * SUM(price * cost) - SUM(price) * SUM(cost)) / (SQRT(COUNT(*) * SUM(price * price) - SUM(price) * SUM(price)) * SQRT(COUNT(*) * SUM(cost * cost) - SUM(cost) * SUM(cost))), 3) FROM products;' },
    { t: 'sql', q: '<p>Maliyeti fiyattan tahmin eden doğrusal regresyonun <b>eğimini</b> (b) hesapla, 4 basamağa yuvarla: <code>b = (nΣxy − ΣxΣy) / (nΣx² − (Σx)²)</code>, x = price, y = cost.</p>', sol: 'SELECT ROUND((COUNT(*) * SUM(price * cost) - SUM(price) * SUM(cost)) / (COUNT(*) * SUM(price * price) - SUM(price) * SUM(price)), 4) FROM products;' }
  ]
},
{
  id: 'ds-ab', lv: 'C1', mod: 'Veri Bilimi', min: 18, extra: true,
  title: 'A/B testi analizi',
  sum: 'Dönüşüm oranı, lift ve iki oran z-testi.',
  body: `
<h2>Deney sonuçları</h2>
<p><code>ab_test</code> tablosunda her kullanıcı A (kontrol) veya B (yeni tasarım) grubunda. Önce temel tablo:</p>
<pre class="code">SELECT variant,
       COUNT(*) AS kullanici,
       SUM(converted) AS donusen,
       ROUND(AVG(converted) * 100, 2) AS donusum_yuzde,
       ROUND(SUM(revenue) / COUNT(*), 2) AS kullanici_basi_gelir
FROM ab_test
GROUP BY variant;</pre>
<h2>İki oran z-testi</h2>
<p>B'nin oranı A'dan anlamlı derecede yüksek mi?</p>
<p><code>p = (x₁ + x₂)/(n₁ + n₂)</code>, <code>SE = √(p(1−p)(1/n₁ + 1/n₂))</code>, <code>z = (p₂ − p₁)/SE</code>. |z| &gt; 1.96 ise %95 güvenle fark anlamlıdır.</p>
<pre class="code">WITH g AS (
  SELECT variant, COUNT(*) AS n, SUM(converted) AS x, AVG(converted) AS p
  FROM ab_test GROUP BY variant
),
a AS (SELECT * FROM g WHERE variant = 'A'),
b AS (SELECT * FROM g WHERE variant = 'B')
SELECT ROUND(a.p * 100, 2) AS p_a, ROUND(b.p * 100, 2) AS p_b,
       ROUND(100 * (b.p / a.p - 1), 1) AS lift_yuzde,
       ROUND((b.p - a.p) / SQRT(((a.x + b.x) * 1.0 / (a.n + b.n)) * (1 - (a.x + b.x) * 1.0 / (a.n + b.n)) * (1.0 / a.n + 1.0 / b.n)), 2) AS z
FROM a, b;</pre>
<div class="note"><b>İyi uygulamalar</b>Örneklem büyüklüğünü test öncesi belirle, sonuçlara test bitmeden bakıp durdurma (peeking), grupların dengeli dağıldığını (SRM kontrolü) doğrula, birden çok metriğe bakıyorsan çoklu test düzeltmesini düşün.</div>
`,
  ex: [
    { t: 'sql', q: '<p>Her varyant için kullanıcı sayısı, dönüşüm oranı (yüzde, 2 basamak) ve <b>dönüşen kullanıcı başına ortalama gelir</b>i (2 basamak) getir: <code>variant</code>, <code>n</code>, <code>oran</code>, <code>arpu_donusen</code>.</p>', sol: 'SELECT variant, COUNT(*) AS n, ROUND(100.0 * AVG(converted), 2) AS oran, ROUND(SUM(revenue) / SUM(converted), 2) AS arpu_donusen FROM ab_test GROUP BY variant;' },
    { t: 'sql', q: '<p>Ders anlatımındaki formülle iki oran <b>z istatistiğini</b> hesapla (2 basamak). Tek değer.</p>', sol: "WITH g AS (SELECT variant, COUNT(*) AS n, SUM(converted) AS x, AVG(converted) AS p FROM ab_test GROUP BY variant), a AS (SELECT * FROM g WHERE variant = 'A'), b AS (SELECT * FROM g WHERE variant = 'B') SELECT ROUND((b.p - a.p) / SQRT(((a.x + b.x) * 1.0 / (a.n + b.n)) * (1 - (a.x + b.x) * 1.0 / (a.n + b.n)) * (1.0 / a.n + 1.0 / b.n)), 2) FROM a, b;" },
    { t: 'mc', q: '<p>Hesapladığın z yaklaşık 2.5 çıktı. Yorum nedir?</p>', o: ['Fark anlamsızdır', '%95 güven düzeyinde B\'nin dönüşüm oranı A\'dan anlamlı derecede farklıdır', 'B kesinlikle %25 daha iyidir', 'Test geçersizdir'], a: 1, why: '|z| > 1.96, iki yönlü testte %5 anlamlılık düzeyini aşar.' }
  ]
},
{
  id: 'ds-ornekleme', lv: 'B2', mod: 'Veri Bilimi', min: 10, extra: true,
  title: 'Örnekleme ve eğitim/test ayrımı',
  sum: 'Rastgele örnek, tekrarlanabilir hash tabanlı bölme.',
  body: `
<h2>Rastgele örnek</h2>
<pre class="code" data-diff="tsql pg mysql oracle">SELECT * FROM customers ORDER BY RANDOM() LIMIT 5;</pre>
<p>Her çalıştırmada farklı sonuç verir. Büyük tablolarda tüm tabloyu sıraladığı için pahalıdır; ambarlarda <code>TABLESAMPLE SYSTEM (10 PERCENT)</code> gibi yöntemler kullanılır.</p>
<h2>Tekrarlanabilir bölme</h2>
<p>Model eğitiminde aynı müşterinin her seferinde aynı kümeye düşmesi gerekir. Anahtarın hash'ine (veya burada basitçe ID'ye) göre mod almak bunu sağlar:</p>
<pre class="code">SELECT CASE WHEN customer_id % 10 < 8 THEN 'train' ELSE 'test' END AS kume,
       COUNT(*) AS n
FROM customers
GROUP BY kume;</pre>
<p>BigQuery'de <code>MOD(ABS(FARM_FINGERPRINT(CAST(id AS STRING))), 10)</code>, PostgreSQL'de <code>hashtext(id::text)</code> benzeri fonksiyonlar kullanılır.</p>
<h2>Tabakalı örnekleme</h2>
<p>Her segmentten eşit oranda örnek almak için ROW_NUMBER ile segment içinde sıra ver ve oranla filtrele.</p>
<pre class="code">WITH s AS (
  SELECT customer_id, segment,
         ROW_NUMBER() OVER (PARTITION BY segment ORDER BY customer_id) AS rn,
         COUNT(*) OVER (PARTITION BY segment) AS n
  FROM customers
)
SELECT segment, COUNT(*) AS ornek
FROM s WHERE rn <= n * 0.2
GROUP BY segment;</pre>
`,
  ex: [
    { t: 'sql', q: '<p><code>ab_test</code> kullanıcılarını <code>user_id % 10</code> değerine göre böl: <b>0–6 train, 7–8 validation, 9 test</b>. Her kümedeki kullanıcı sayısı ve dönüşüm oranını (yüzde, 2 basamak) getir: <code>kume</code>, <code>n</code>, <code>oran</code>.</p>', sol: "SELECT CASE WHEN user_id % 10 <= 6 THEN 'train' WHEN user_id % 10 <= 8 THEN 'validation' ELSE 'test' END AS kume, COUNT(*) AS n, ROUND(100.0 * AVG(converted), 2) AS oran FROM ab_test GROUP BY kume;" }
  ]
},
{
  id: 'ds-feature', lv: 'C1', mod: 'Veri Bilimi', min: 20, extra: true,
  title: 'Özellik mühendisliği (feature engineering)',
  sum: 'Müşteri düzeyinde model girdisi tablosu ve churn etiketi.',
  body: `
<h2>Bir satır = bir örnek</h2>
<p>Makine öğrenmesi modelleri genellikle <b>varlık başına bir satır</b> ister: her müşteri için özellikler (features) ve bir hedef (label). Bu tabloyu SQL ile üretmek, veri bilimcinin en sık yaptığı işlerden biridir.</p>
<h2>Zaman sızıntısına dikkat</h2>
<p>Özellikler <b>kesim tarihinden önceki</b> veriden, etiket <b>sonraki</b> veriden hesaplanmalı. Aksi halde model geleceği görür (data leakage).</p>
<pre class="code">WITH params AS (SELECT '2024-07-01' AS kesim),
gecmis AS (
  SELECT o.* FROM orders o, params WHERE o.order_date < params.kesim AND o.status = 'delivered'
),
ozellik AS (
  SELECT g.customer_id,
         COUNT(DISTINCT g.order_id) AS siparis_sayisi,
         ROUND(SUM(${REV}), 2) AS toplam_harcama,
         ROUND(SUM(${REV}) / COUNT(DISTINCT g.order_id), 2) AS ort_sepet,
         CAST(julianday((SELECT kesim FROM params)) - julianday(MAX(g.order_date)) AS INTEGER) AS son_siparisten_gun,
         COUNT(DISTINCT p.category) AS kategori_cesidi,
         ROUND(AVG(oi.discount > 0), 2) AS indirimli_oran
  FROM gecmis g
  JOIN order_items oi ON oi.order_id = g.order_id
  JOIN products p ON p.product_id = oi.product_id
  GROUP BY g.customer_id
),
etiket AS (
  SELECT f.customer_id,
         CASE WHEN EXISTS (SELECT 1 FROM orders o, params
                           WHERE o.customer_id = f.customer_id AND o.order_date >= params.kesim
                             AND o.order_date < date(params.kesim, '+6 months')) THEN 0 ELSE 1 END AS churn
  FROM ozellik f
)
SELECT f.*, c.segment, 2024 - c.birth_year AS yas, e.churn
FROM ozellik f
JOIN customers c ON c.customer_id = f.customer_id
JOIN etiket e ON e.customer_id = f.customer_id
LIMIT 15;</pre>
<div class="tip"><b>Kategorik değişkenler</b>One-hot encoding için CASE kullan: <code>CASE WHEN segment = 'Premium' THEN 1 ELSE 0 END AS seg_premium</code>.</div>
`,
  ex: [
    { t: 'sql', q: '<p>Her müşteri için (siparişi olanlar) şu özellikleri üret: <code>customer_id</code>, <code>siparis</code> (toplam sipariş sayısı), <code>mobil_oran</code> (mobile kanal siparişlerinin oranı, 2 basamak), <code>seg_premium</code> (segment Premium ise 1, değilse 0).</p>', sol: "SELECT o.customer_id, COUNT(*) AS siparis, ROUND(AVG(CASE WHEN o.channel = 'mobile' THEN 1.0 ELSE 0 END), 2) AS mobil_oran, MAX(CASE WHEN c.segment = 'Premium' THEN 1 ELSE 0 END) AS seg_premium FROM orders o JOIN customers c ON c.customer_id = o.customer_id GROUP BY o.customer_id;" },
    { t: 'mc', q: '<p>Churn modeli için “son 6 ayda sipariş verdi mi” etiketini hesaplarken, “toplam sipariş sayısı” özelliğini <b>tüm zamanlar</b> üzerinden hesaplamak neden hatalıdır?</p>', o: ['Hesaplama yavaşlar', 'Etiket dönemindeki siparişler özelliğe sızar (data leakage)', 'NULL değer oluşur', 'Hatalı değildir'], a: 1 }
  ]
},
{
  id: 'ds-zaman', lv: 'C1', mod: 'Veri Bilimi', min: 15, extra: true,
  title: 'Zaman serisi özellikleri',
  sum: 'Gecikmeli değerler, hareketli ortalamalar, mevsimsel özellikler.',
  body: `
<h2>Tahmin modelleri için tablo</h2>
<p>Günlük sipariş tahmini yapan bir model; dünün, geçen haftanın aynı gününün değerine ve hareketli ortalamalara ihtiyaç duyar.</p>
<pre class="code">WITH RECURSIVE gun(d) AS (
  SELECT '2024-10-01' UNION ALL SELECT date(d, '+1 day') FROM gun WHERE d < '2024-12-31'
),
g AS (
  SELECT gun.d, COUNT(o.order_id) AS y
  FROM gun LEFT JOIN orders o ON o.order_date = gun.d
  GROUP BY gun.d
)
SELECT d, y,
       LAG(y, 1) OVER w AS lag_1,
       LAG(y, 7) OVER w AS lag_7,
       ROUND(AVG(y) OVER (ORDER BY d ROWS BETWEEN 7 PRECEDING AND 1 PRECEDING), 2) AS ort_7_onceki,
       CAST(strftime('%w', d) AS INTEGER) AS hafta_gunu,
       CASE WHEN CAST(strftime('%w', d) AS INTEGER) IN (0, 6) THEN 1 ELSE 0 END AS hafta_sonu
FROM g
WINDOW w AS (ORDER BY d)
ORDER BY d;</pre>
<p>Dikkat: Hareketli ortalama <code>1 PRECEDING</code>'de bitiyor. Bugünün değerini içeren bir özellik, bugünü tahmin ederken sızıntı olur.</p>
`,
  ex: [
    { t: 'sql', q: '<p>2024 için aylık sipariş sayısı (<code>y</code>), bir önceki ayın değeri (<code>lag_1</code>) ve <b>önceki 3 ayın ortalaması</b> (<code>ort_3</code>, bu ay hariç, 2 basamak) sütunlarını üret: <code>ay</code>, <code>y</code>, <code>lag_1</code>, <code>ort_3</code>.</p>', sol: "WITH m AS (SELECT strftime('%Y-%m', order_date) AS ay, COUNT(*) AS y FROM orders WHERE order_date LIKE '2024%' GROUP BY ay) SELECT ay, y, LAG(y) OVER (ORDER BY ay) AS lag_1, ROUND(AVG(y) OVER (ORDER BY ay ROWS BETWEEN 3 PRECEDING AND 1 PRECEDING), 2) AS ort_3 FROM m ORDER BY ay;", ord: true }
  ]
},

/* ======================= VERİ MÜHENDİSLİĞİ ======================= */
{
  id: 'de-etl', lv: 'B2', mod: 'Veri Mühendisliği', min: 12, extra: true,
  title: 'ETL, ELT ve veri katmanları',
  sum: 'Ham veriden analiz tablosuna: staging, intermediate, mart.',
  body: `
<h2>ETL ve ELT</h2>
<ul><li><b>ETL</b> (Extract, Transform, Load): Veri kaynakta çekilir, ayrı bir sunucuda dönüştürülür, sonra ambara yüklenir. Klasik yaklaşım (Informatica, SSIS).</li>
<li><b>ELT</b>: Ham veri önce ambara yüklenir, dönüşüm ambarın içinde <b>SQL ile</b> yapılır. Bulut ambarlarının ucuz depolama ve güçlü hesaplama gücüyle standart hale geldi (Fivetran/Airbyte + dbt).</li></ul>
<h2>Katmanlı mimari</h2>
<table><tr><th>Katman</th><th>İçerik</th><th>Örnek</th></tr>
<tr><td>Raw / bronze</td><td>Kaynaktan olduğu gibi, değiştirilmeden</td><td><code>raw_signups</code></td></tr>
<tr><td>Staging / silver</td><td>Temizlenmiş, tipleri düzeltilmiş, tekilleştirilmiş, adlar standart</td><td><code>stg_signups</code></td></tr>
<tr><td>Mart / gold</td><td>İş mantığı uygulanmış, analize hazır fact/dimension</td><td><code>fct_sales</code>, <code>dim_customer</code></td></tr>
</table>
<h2>İyi bir pipeline'ın özellikleri</h2>
<ul>
<li><b>Idempotent</b>: Aynı adımı iki kez çalıştırmak aynı sonucu verir (çift kayıt üretmez). <code>DELETE + INSERT</code> veya <code>MERGE</code> kalıpları.</li>
<li><b>Artımlı</b>: Her seferinde tüm tabloyu değil, sadece yeni/değişen veriyi işler.</li>
<li><b>Test edilmiş</b>: Benzersizlik, NULL olmama, referans bütünlüğü kontrolleri.</li>
<li><b>Orkestre edilmiş</b>: Airflow, Dagster, Prefect gibi araçlarla bağımlılık sırasına göre çalışır.</li>
</ul>
`,
  ex: [
    { t: 'mc', q: '<p>ELT\'de dönüşüm adımı nerede yapılır?</p>', o: ['Kaynak sistemde', 'Ayrı bir ETL sunucusunda', 'Hedef veri ambarının içinde, genelde SQL ile', 'BI aracında'], a: 2 },
    { t: 'mc', q: '<p>Bir yükleme işinin <b>idempotent</b> olması ne demektir?</p>', o: ['Çok hızlı çalışması', 'Tekrar çalıştırıldığında aynı sonucu üretmesi, çift kayıt oluşturmaması', 'Sadece bir kez çalışabilmesi', 'Hata vermemesi'], a: 1 },
    { t: 'sql', q: '<p><code>raw_signups</code>\'tan bir staging tablosu <code>stg_signups</code> oluştur: <code>id</code>, <code>email</code> (küçük harf, boşluksuz), <code>full_name</code> (TRIM). Tekrar eden satırları at (<code>SELECT DISTINCT</code>).</p>', sol: 'CREATE TABLE stg_signups AS SELECT DISTINCT id, LOWER(TRIM(email)) AS email, TRIM(full_name) AS full_name FROM raw_signups;', check: 'SELECT id, email, full_name FROM stg_signups' }
  ]
},
{
  id: 'de-kalite', lv: 'B2', mod: 'Veri Mühendisliği', min: 14, extra: true,
  title: 'Veri kalitesi testleri',
  sum: 'Benzersizlik, NULL, referans bütünlüğü ve aralık kontrolleri.',
  body: `
<h2>Testler “sıfır satır” döndürmeli</h2>
<p>dbt ve benzeri araçlardaki yaygın yaklaşım: Her test, <b>sorunlu satırları</b> döndüren bir sorgudur. Sonuç boşsa test geçer.</p>
<pre class="code">-- 1) Benzersizlik: order_id tekrar ediyor mu?
SELECT order_id, COUNT(*) FROM orders GROUP BY order_id HAVING COUNT(*) > 1;</pre>
<pre class="code">-- 2) Referans bütünlüğü: var olmayan ürüne ait sipariş satırı var mı?
SELECT oi.* FROM order_items oi
LEFT JOIN products p ON p.product_id = oi.product_id
WHERE p.product_id IS NULL;</pre>
<pre class="code">-- 3) Kabul edilen değerler
SELECT DISTINCT status FROM orders
WHERE status NOT IN ('delivered', 'shipped', 'cancelled', 'returned');</pre>
<pre class="code">-- 4) Aralık / mantık kontrolleri
SELECT * FROM order_items WHERE quantity <= 0 OR discount < 0 OR discount >= 1;
SELECT * FROM products WHERE cost > price;</pre>
<h2>Tek sorguda kalite özeti</h2>
<pre class="code">SELECT 'customers.email NULL' AS test, COUNT(*) AS hatali FROM customers WHERE email IS NULL
UNION ALL SELECT 'customers.city NULL', COUNT(*) FROM customers WHERE city IS NULL
UNION ALL SELECT 'orders sipariş tarihi < kayıt tarihi', COUNT(*)
  FROM orders o JOIN customers c ON c.customer_id = o.customer_id WHERE o.order_date < c.signup_date;</pre>
`,
  ex: [
    { t: 'sql', q: '<p><code>raw_signups</code> tablosunda <code>id</code> değerine göre <b>tekrar eden</b> kayıtları bul: <code>id</code>, <code>adet</code>. Sadece birden fazla geçenler.</p>', sol: 'SELECT id, COUNT(*) AS adet FROM raw_signups GROUP BY id HAVING COUNT(*) > 1;' },
    { t: 'sql', q: '<p>Bir kalite raporu üret, iki satır olsun: <code>(\'siparissiz_musteri\', sayı)</code> ve <code>(\'satilmamis_urun\', sayı)</code>. Sütunlar: <code>test</code>, <code>adet</code>.</p>', sol: "SELECT 'siparissiz_musteri' AS test, COUNT(*) AS adet FROM customers c WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id) UNION ALL SELECT 'satilmamis_urun', COUNT(*) FROM products p WHERE NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.product_id = p.product_id);" }
  ]
},
{
  id: 'de-dedup', lv: 'B2', mod: 'Veri Mühendisliği', min: 12, extra: true,
  title: 'Tekilleştirme (deduplication)',
  sum: 'Tam ve mantıksal tekrarları ROW_NUMBER ile temizlemek.',
  body: `
<h2>İki tür tekrar</h2>
<ul><li><b>Tam tekrar</b>: Tüm sütunlar aynı. <code>SELECT DISTINCT</code> yeterli.</li>
<li><b>Mantıksal tekrar</b>: Aynı varlık, farklı yazımlar veya sürümler (ör. aynı e-posta, biri büyük harfli). Bir anahtar tanımlayıp her anahtar için <b>bir</b> satır seçmek gerekir.</li></ul>
<pre class="code">WITH s AS (
  SELECT *,
         LOWER(TRIM(email)) AS email_norm,
         ROW_NUMBER() OVER (PARTITION BY LOWER(TRIM(email)) ORDER BY id) AS rn
  FROM raw_signups
)
SELECT id, email_norm, TRIM(full_name) AS ad, signup_date
FROM s WHERE rn = 1;</pre>
<p>“Hangi kayıt kalsın?” sorusu iş kuralıdır: en yeni, en eksiksiz, ilk gelen… ORDER BY ifadesi bu kuralı kodlar.</p>
<h2>Tablodan silerek tekilleştirme</h2>
<pre class="code">DELETE FROM raw_signups
WHERE rowid NOT IN (
  SELECT MIN(rowid) FROM raw_signups GROUP BY id, full_name, email, city, signup_date
);
SELECT COUNT(*) FROM raw_signups;</pre>
<p>PostgreSQL'de <code>ctid</code>, diğerlerinde CTE + ROW_NUMBER ile benzer yapılır.</p>
`,
  ex: [
    { t: 'sql', q: '<p><code>raw_signups</code> için normalize edilmiş e-posta (<code>LOWER(TRIM(email))</code>) başına <b>tek satır</b> bırak; en küçük <code>id</code>\'yi seç (eşitlikte <code>rowid</code> küçük olan). Sütunlar: <code>id</code>, <code>email</code> (normalize).</p>', sol: 'WITH s AS (SELECT id, LOWER(TRIM(email)) AS email, ROW_NUMBER() OVER (PARTITION BY LOWER(TRIM(email)) ORDER BY id, rowid) AS rn FROM raw_signups) SELECT id, email FROM s WHERE rn = 1;' },
    { t: 'sql', q: '<p><code>raw_signups</code> tablosundaki <b>tam tekrar</b> satırları (tüm sütunları aynı) <code>DELETE</code> ile sil; her gruptan bir satır kalsın.</p>', sol: 'DELETE FROM raw_signups WHERE rowid NOT IN (SELECT MIN(rowid) FROM raw_signups GROUP BY id, full_name, email, city, signup_date);', check: 'SELECT id, full_name, email, city, signup_date FROM raw_signups' }
  ]
},
{
  id: 'de-incremental', lv: 'C1', mod: 'Veri Mühendisliği', min: 14, extra: true,
  title: 'Artımlı yükleme (incremental load)',
  sum: 'Watermark ile sadece yeni kayıtları işlemek.',
  body: `
<h2>Her gece tüm tabloyu yüklemek ölçeklenmez</h2>
<p>Milyarlarca satırlık bir olay tablosunu her gün baştan yüklemek pahalıdır. Artımlı yükleme, hedefte en son yüklenen zamanı (<b>watermark</b>) bulur ve sadece ondan yeni kayıtları ekler.</p>
<pre class="code">-- Hedef tablo: daha önce 15 Kasım'a kadar yüklenmiş
CREATE TABLE price_hist AS
SELECT * FROM price_updates WHERE updated_at < '2024-11-15';

-- Artımlı adım
INSERT INTO price_hist
SELECT * FROM price_updates
WHERE updated_at > (SELECT COALESCE(MAX(updated_at), '1900-01-01') FROM price_hist);

SELECT COUNT(*), MAX(updated_at) FROM price_hist;</pre>
<h2>Geç gelen veri</h2>
<p>Bazı kayıtlar kaynağa gecikmeli düşer. Yaygın çözüm, watermark'tan biraz geriye giden bir pencereyi (ör. son 3 gün) her seferinde <b>silip yeniden yüklemek</b>tir. Bu hem geç gelenleri yakalar hem de idempotenttir:</p>
<pre class="code" data-norun>DELETE FROM fct_events WHERE event_date >= :baslangic;
INSERT INTO fct_events SELECT ... FROM raw_events WHERE event_date >= :baslangic;</pre>
<div class="note"><b>dbt'de</b><code>materialized='incremental'</code> ve <code>{% if is_incremental() %} WHERE updated_at &gt; (SELECT MAX(updated_at) FROM {{ this }}) {% endif %}</code> kalıbı aynı mantığı uygular.</div>
`,
  ex: [
    { t: 'sql', q: '<p>Başlangıç kodu hedef tabloyu <b>1 Kasım 2024 öncesi</b> kayıtlarla oluşturuyor. Altına, watermark\'tan <b>sonraki</b> kayıtları ekleyen artımlı <code>INSERT</code> ifadesini yaz.</p>', start: "CREATE TABLE price_hist AS\nSELECT * FROM price_updates WHERE updated_at < '2024-11-01';\n\n-- Artımlı yükleme:\n", sol: "CREATE TABLE price_hist AS SELECT * FROM price_updates WHERE updated_at < '2024-11-01'; INSERT INTO price_hist SELECT * FROM price_updates WHERE updated_at > (SELECT MAX(updated_at) FROM price_hist);", check: 'SELECT product_id, new_price, updated_at FROM price_hist' }
  ]
},
{
  id: 'de-scd', lv: 'C1', mod: 'Veri Mühendisliği', min: 16, extra: true,
  title: 'Yavaş değişen boyutlar (SCD Tip 1 ve 2)',
  sum: 'Değişen nitelikleri ezmek mi, tarihçesini tutmak mı?',
  body: `
<h2>Sorun</h2>
<p>Bir ürünün fiyatı veya bir müşterinin şehri değişir. Geçmiş raporlar eski değeri mi, yeni değeri mi göstermeli?</p>
<table><tr><th>Tip</th><th>Davranış</th><th>Kullanım</th></tr>
<tr><td><b>SCD 1</b></td><td>Eski değerin üzerine yazılır, tarihçe yok.</td><td>Yazım hatası düzeltme, önemsiz nitelikler</td></tr>
<tr><td><b>SCD 2</b></td><td>Her değişiklik yeni satır; <code>valid_from</code>, <code>valid_to</code>, <code>is_current</code>.</td><td>Fiyat, adres, segment gibi analizde önemli nitelikler</td></tr>
<tr><td>SCD 3</td><td>Önceki değer ayrı sütunda (<code>previous_city</code>).</td><td>Sadece bir önceki değer yeterliyse</td></tr>
</table>
<h2>SCD 2'yi LEAD ile kurmak</h2>
<pre class="code">WITH surumler AS (
  SELECT product_id, price AS fiyat, '2000-01-01 00:00:00' AS gecerlilik FROM products
  UNION ALL
  SELECT product_id, new_price, updated_at FROM price_updates
)
SELECT product_id, fiyat,
       gecerlilik AS valid_from,
       COALESCE(LEAD(gecerlilik) OVER (PARTITION BY product_id ORDER BY gecerlilik), '9999-12-31') AS valid_to,
       CASE WHEN LEAD(gecerlilik) OVER (PARTITION BY product_id ORDER BY gecerlilik) IS NULL THEN 1 ELSE 0 END AS is_current
FROM surumler
WHERE product_id IN (SELECT product_id FROM price_updates)
ORDER BY product_id, valid_from;</pre>
<p>Belirli bir tarihteki fiyatı bulmak: <code>WHERE :tarih &gt;= valid_from AND :tarih &lt; valid_to</code>.</p>
`,
  ex: [
    { t: 'sql', q: '<p>Yukarıdaki SCD 2 mantığıyla <code>dim_product_price</code> tablosunu oluştur (<code>CREATE TABLE ... AS</code>): <code>product_id</code>, <code>fiyat</code>, <code>valid_from</code>, <code>valid_to</code>, <code>is_current</code>. <b>Tüm ürünler</b> dahil olsun (filtre yok).</p>', sol: "CREATE TABLE dim_product_price AS WITH s AS (SELECT product_id, price AS fiyat, '2000-01-01 00:00:00' AS g FROM products UNION ALL SELECT product_id, new_price, updated_at FROM price_updates) SELECT product_id, fiyat, g AS valid_from, COALESCE(LEAD(g) OVER (PARTITION BY product_id ORDER BY g), '9999-12-31') AS valid_to, CASE WHEN LEAD(g) OVER (PARTITION BY product_id ORDER BY g) IS NULL THEN 1 ELSE 0 END AS is_current FROM s;", check: 'SELECT product_id, fiyat, valid_from, valid_to, is_current FROM dim_product_price' },
    { t: 'mc', q: '<p>Müşterinin şehri değiştiğinde, geçmiş siparişlerin <b>sipariş anındaki</b> şehirle raporlanması gerekiyor. Hangi SCD tipi?</p>', o: ['Tip 1', 'Tip 2', 'Tip 0', 'Fark etmez'], a: 1 }
  ]
},
{
  id: 'de-partition', lv: 'C1', mod: 'Veri Mühendisliği', min: 12, extra: true,
  title: 'Büyük veri: partition, clustering, dosya formatları',
  sum: 'Petabayt ölçeğinde SQL\'in hızlı ve ucuz çalışması.',
  body: `
<h2>Partitioning (bölümleme)</h2>
<p>Tablo, bir sütuna (çoğunlukla tarih) göre fiziksel parçalara ayrılır. <code>WHERE event_date = '2024-12-01'</code> yazdığında motor sadece o günün bölümünü okur (<b>partition pruning</b>).</p>
<pre class="code" data-norun>-- BigQuery
CREATE TABLE analytics.events
PARTITION BY DATE(event_time)
CLUSTER BY user_id, event_type AS
SELECT * FROM raw.events;</pre>
<h2>Clustering / sıralama anahtarı</h2>
<p>Bölüm içindeki veriyi belirli sütunlara göre sıralı tutar; filtrelenen bloklar atlanır (Snowflake micro-partition, Redshift sort key, Delta Z-order).</p>
<h2>Dosya formatları</h2>
<table><tr><th>Format</th><th>Yapı</th><th>Not</th></tr>
<tr><td>CSV / JSON</td><td>Satır, metin</td><td>İnsan okur, büyük ve yavaş</td></tr>
<tr><td>Parquet / ORC</td><td>Sütun tabanlı, sıkıştırılmış, şemalı</td><td>Analitik için standart</td></tr>
<tr><td>Avro</td><td>Satır tabanlı, şemalı</td><td>Akış ve şema evrimi</td></tr>
</table>
<h2>Maliyet bilinci</h2>
<ul><li>Sütun tabanlı ambarlarda <b>SELECT *</b> taranan veri miktarını (ve faturayı) katlar.</li><li>Partition filtresi olmayan sorguları engelleyen ayarlar (require partition filter) kullan.</li><li>Sık kullanılan ağır sorguları materialized view veya özet tabloya çevir.</li></ul>
`,
  ex: [
    { t: 'mc', q: '<p>Tarihe göre bölümlenmiş bir tabloda hangi sorgu partition pruning\'den <b>yararlanamaz</b>?</p>', o: ["<code>WHERE event_date = '2024-12-01'</code>", "<code>WHERE event_date BETWEEN '2024-12-01' AND '2024-12-07'</code>", "<code>WHERE user_id = 42</code>", "<code>WHERE event_date >= '2024-12-01'</code>"], a: 2 },
    { t: 'mc', q: '<p>Analitik sorgular için en uygun dosya formatı hangisidir?</p>', o: ['CSV', 'JSON', 'Parquet', 'XML'], a: 2 }
  ]
}
);

/* ======================= PATİKALAR ======================= */
window.SQLP_PATHS = [
  { id: 'temel', name: 'SQL Temelleri', short: 'SQL', color: 'var(--l3)',
    desc: 'Hiç bilmeyenden ileri seviyeye: tarih, sorgular, JOIN, alt sorgu, CTE ve pencere fonksiyonları.',
    long: 'SQL\'i hiç bilmiyorsan buradan başla. Veritabanı kavramından pencere fonksiyonlarına kadar her rolün ortak dilini öğrenirsin. Diğer patikaların büyük kısmı bu derslerle ortaktır.',
    skills: ['SELECT', 'Filtreleme', 'Gruplama', 'JOIN', 'Alt sorgu', 'CTE', 'Pencere fonksiyonları'],
    lessons: ['tarih','veritabani','select','alias-distinct','where','mantik','in-between-like','null','order-limit','aggregate','group-by','having','metin','sayi-tip','tarih-fn','case','coalesce','sorgu-sirasi','iliskiler','inner-join','left-join','right-full-join','self-cross-join','coklu-join','set-ops','subquery','correlated','cte','recursive-cte','window-intro','ranking','lag-lead','frames','ntile-dist','pivot'] },
  { id: 'analist', name: 'Veri Analisti', short: 'VA', color: 'var(--l2)',
    desc: 'İş sorularını SQL ile cevapla: KPI, büyüme, kohort, funnel, RFM, dashboard sorguları.',
    long: 'Şirketin “ne oldu, neden oldu?” sorularını cevaplayan rol. Temel SQL\'in üzerine metrik tanımlama, veri temizleme, büyüme ve kohort analizi, dönüşüm hunisi, müşteri segmentasyonu ve BI araçlarına hazır sorgu yazmayı öğrenirsin.',
    skills: ['KPI tanımlama', 'Veri temizleme', 'MoM / YoY', 'Kohort', 'Funnel', 'RFM', 'Pareto', 'Dashboard SQL'],
    lessons: ['veritabani','select','alias-distinct','where','mantik','in-between-like','null','order-limit','aggregate','group-by','having','metin','sayi-tip','tarih-fn','case','coalesce','sorgu-sirasi','an-kpi','an-temizlik','iliskiler','inner-join','left-join','self-cross-join','coklu-join','set-ops','subquery','correlated','an-dashboard','cte','recursive-cte','window-intro','ranking','lag-lead','frames','ntile-dist','pivot','an-buyume','an-pareto','an-kohort','an-funnel','an-rfm','view','performans','lehceler'] },
  { id: 'bilimci', name: 'Veri Bilimci', short: 'VB', color: 'var(--l4)',
    desc: 'İstatistik, dağılımlar, aykırı değerler, A/B testleri ve model için özellik tabloları.',
    long: 'Modelleme ve deneylere veri hazırlayan rol. SQL ile tanımlayıcı istatistik, dağılım ve aykırı değer analizi, korelasyon ve regresyon, A/B testi değerlendirmesi, örnekleme ve sızıntısız özellik mühendisliği yaparsın.',
    skills: ['Tanımlayıcı istatistik', 'Histogram', 'Z-skoru / IQR', 'Korelasyon', 'A/B testi', 'Örnekleme', 'Feature engineering', 'Zaman serisi'],
    lessons: ['veritabani','select','alias-distinct','where','mantik','in-between-like','null','order-limit','aggregate','group-by','having','sayi-tip','tarih-fn','case','coalesce','sorgu-sirasi','ds-tanimsal','inner-join','left-join','coklu-join','subquery','correlated','cte','recursive-cte','window-intro','ranking','lag-lead','frames','ntile-dist','pivot','ds-dagilim','ds-outlier','ds-ornekleme','ds-korelasyon','ds-ab','ds-feature','ds-zaman','json'] },
  { id: 'muhendis', name: 'Veri Mühendisi', short: 'VM', color: 'var(--l5)',
    desc: 'Tablo tasarımı, DML, transaction, indeks, ETL/ELT, artımlı yükleme, SCD ve veri kalitesi.',
    long: 'Verinin güvenilir şekilde akmasını sağlayan rol. Şema tasarımı ve normalizasyon, DDL/DML, transaction ve izolasyon, indeksler, veri ambarı modelleme, artımlı ve idempotent yükleme, SCD, tekilleştirme ve veri kalite testlerini öğrenirsin.',
    skills: ['DDL / DML', 'Transaction', 'Normalizasyon', 'İndeks', 'Yıldız şema', 'ETL / ELT', 'Artımlı yükleme', 'SCD', 'Veri kalitesi'],
    lessons: ['veritabani','select','where','mantik','null','order-limit','aggregate','group-by','having','case','coalesce','iliskiler','inner-join','left-join','coklu-join','set-ops','subquery','correlated','cte','window-intro','ranking','lag-lead','ddl-create','dml','upsert','alter-drop','transaction','normalizasyon','index','view','trigger','performans','de-etl','de-kalite','de-dedup','de-incremental','de-scd','acid','dwh','json','de-partition','lehceler','guvenlik','modern-ekosistem'] },
  { id: 'uzman', name: 'İleri SQL ve Veritabanı Uzmanlığı', short: 'C2', color: 'var(--l6)',
    desc: 'İleri seviye konular: tasarım, performans, ACID, JSON, lehçeler, güvenlik ve ileri desenler.',
    long: 'Temelleri sağlam olanlar için derinleşme patikası. Mülakatlarda ve kıdemli rollerde beklenen konuları kapsar.',
    skills: ['Normalizasyon', 'İndeks ve plan', 'ACID / MVCC', 'JSON', 'Lehçeler', 'Güvenlik', 'Gaps & islands'],
    lessons: ['ddl-create','dml','upsert','alter-drop','transaction','normalizasyon','index','view','trigger','performans','acid','json','dwh','lehceler','guvenlik','ileri-desenler','modern-ekosistem'] }
];

/* ======================= SEVİYE TESTİ ======================= */
window.SQLP_PLACEMENT = [
  { lv: 'A1', q: '<p>Bir tablodaki tüm sütunları getirmek için SELECT\'ten sonra ne yazılır?</p>', o: ['<code>ALL</code>', '<code>*</code>', '<code>%</code>', '<code>EVERY</code>'], a: 1 },
  { lv: 'A1', q: '<p>E-postası boş olan müşterileri doğru bulan koşul hangisidir?</p>', o: ['<code>email = NULL</code>', "<code>email = ''</code>", '<code>email IS NULL</code>', '<code>email == NULL</code>'], a: 2 },
  { lv: 'A2', q: '<p>Ortalaması 1000\'den büyük kategorileri süzmek için hangisi kullanılır?</p>', o: ['<code>WHERE AVG(price) > 1000</code>', '<code>HAVING AVG(price) > 1000</code>', '<code>ORDER BY AVG(price) > 1000</code>', '<code>GROUP BY AVG(price) > 1000</code>'], a: 1 },
  { lv: 'A2', q: '<p><code>COUNT(email)</code> ile <code>COUNT(*)</code> arasındaki fark nedir?</p>', o: ['Fark yoktur', 'COUNT(email) NULL olmayan e-postaları sayar', 'COUNT(*) sadece benzersiz satırları sayar', 'COUNT(email) daha hızlıdır'], a: 1 },
  { lv: 'B1', q: '<p>Hiç siparişi olmayan müşterileri bulmak için en uygun kalıp hangisidir?</p>', o: ['INNER JOIN + WHERE o.order_id IS NULL', 'LEFT JOIN + WHERE o.order_id IS NULL', 'CROSS JOIN', 'UNION ALL'], a: 1 },
  { lv: 'B1', q: '<p>Alt sorgu NULL içeriyorsa <code>WHERE x NOT IN (alt_sorgu)</code> ne döndürür?</p>', o: ['Beklenen satırları', 'Hiç satır döndürmez', 'Hata verir', 'Tüm satırları'], a: 1 },
  { lv: 'B2', q: '<p>Her kategorinin en pahalı ürününü bulmak için hangisi en uygundur?</p>', o: ['<code>GROUP BY category</code> ve <code>MAX(name)</code>', '<code>ROW_NUMBER() OVER (PARTITION BY category ORDER BY price DESC)</code> = 1', '<code>DISTINCT category</code>', '<code>LIMIT 1</code>'], a: 1 },
  { lv: 'B2', q: '<p><code>SUM(x) OVER (ORDER BY tarih)</code> ne hesaplar?</p>', o: ['Toplam değeri her satıra yazar', 'Kümülatif (yürüyen) toplam', 'Bir önceki satırın değeri', 'Grup sayısı'], a: 1 },
  { lv: 'C1', q: '<p><code>orders(order_id, customer_id, customer_city)</code> tasarımı hangi normal formu ihlal eder?</p>', o: ['1NF', '2NF', '3NF', 'Hiçbirini'], a: 2 },
  { lv: 'C1', q: '<p><code>(a, b)</code> bileşik indeksi hangi koşulda en az işe yarar?</p>', o: ['<code>WHERE a = 1</code>', '<code>WHERE a = 1 AND b = 2</code>', '<code>WHERE b = 2</code>', '<code>ORDER BY a, b</code>'], a: 2 },
  { lv: 'C2', q: '<p>MVCC kullanan bir veritabanında okuyucular ve yazarlar için hangisi doğrudur?</p>', o: ['Okuyucular her zaman yazarları bekler', 'Okuyucular yazarları engellemez', 'Aynı anda sadece bir işlem çalışır', 'Transaction kullanılamaz'], a: 1 },
  { lv: 'C2', q: '<p>Ardışık tarih serilerini (adaları) bulmanın klasik yöntemi nedir?</p>', o: ['Değerden ROW_NUMBER çıkarıp farka göre gruplamak', 'CROSS JOIN', 'DISTINCT', 'Tüm tarihleri UNION ile birleştirmek'], a: 0 }
];

/* ======================= SÖZLÜK ======================= */
window.SQLP_GLOSSARY = [
  ['ACID', 'Atomicity, Consistency, Isolation, Durability: güvenilir transaction\'ların dört özelliği.'],
  ['Aggregate (toplama fonksiyonu)', 'Çok satırdan tek değer üreten fonksiyon: COUNT, SUM, AVG, MIN, MAX.'],
  ['Alias (takma ad)', 'Sütun veya tabloya AS ile verilen geçici ad.'],
  ['Anti-join', 'Bir tabloda olup diğerinde eşi olmayan satırları bulmak: LEFT JOIN … IS NULL veya NOT EXISTS.'],
  ['AOV', 'Average Order Value, ortalama sepet tutarı: ciro / sipariş sayısı.'],
  ['B-tree', 'Çoğu veritabanında indekslerin kullandığı dengeli ağaç yapısı.'],
  ['BCNF', 'Boyce-Codd Normal Formu: her belirleyicinin aday anahtar olduğu, 3NF\'nin sıkı hali.'],
  ['Birincil anahtar (PK)', 'Her satırı benzersiz tanımlayan, NULL olamayan sütun(lar).'],
  ['CASE', 'SQL\'in koşullu ifadesi: CASE WHEN … THEN … ELSE … END.'],
  ['CTE', 'Common Table Expression: WITH ile tanımlanan isimli geçici sonuç kümesi.'],
  ['Churn', 'Müşteri kaybı: belirli bir sürede geri gelmeyen müşteri.'],
  ['Clustering', 'Tablo bloklarını belirli sütunlara göre sıralı tutarak taramayı azaltma tekniği.'],
  ['COALESCE', 'NULL olmayan ilk argümanı döndüren standart fonksiyon.'],
  ['Collation', 'Metinlerin sıralanma ve karşılaştırılma kuralları (büyük/küçük harf, dil).'],
  ['Columnar (sütun tabanlı)', 'Veriyi sütun sütun saklayan depolama; analitik sorgular için verimli.'],
  ['DDL', 'Data Definition Language: CREATE, ALTER, DROP.'],
  ['DML', 'Data Manipulation Language: INSERT, UPDATE, DELETE (bazen SELECT dahil).'],
  ['DCL', 'Data Control Language: GRANT, REVOKE.'],
  ['dbt', 'SQL dönüşüm modellerini sürümleyen, test eden ve çalıştıran açık kaynak araç.'],
  ['Deadlock', 'İki işlemin birbirinin kilidini beklemesiyle oluşan kilitlenme.'],
  ['Denormalizasyon', 'Okuma performansı için bilinçli olarak tekrarlı veri saklamak.'],
  ['Dimension (boyut)', 'Yıldız şemada olayların bağlamını veren tablo: tarih, ürün, müşteri.'],
  ['DISTINCT', 'Sonuçtaki tekrar eden satırları atar.'],
  ['ELT / ETL', 'Veriyi çekip yükleyip dönüştürme (ELT) veya çekip dönüştürüp yükleme (ETL) süreçleri.'],
  ['EXPLAIN', 'Sorgu planını gösteren komut; performans analizinin ilk adımı.'],
  ['Fact (olgu)', 'Yıldız şemada ölçülebilir olayları ve metrikleri tutan tablo.'],
  ['Fan-out', 'Bire-çok JOIN sonrası satırların çoğalması; yanlış toplamların klasik nedeni.'],
  ['Funnel (huni)', 'Kullanıcıların ardışık adımlardaki dönüşümünü ölçen analiz.'],
  ['Grain (tanecik)', 'Bir tablodaki tek satırın tam olarak neyi temsil ettiği.'],
  ['GROUP BY', 'Satırları aynı değerlere göre gruplayarak toplama yapmayı sağlar.'],
  ['HAVING', 'Gruplamadan sonra grupları filtreler.'],
  ['Idempotent', 'Tekrar çalıştırıldığında aynı sonucu üreten işlem.'],
  ['İndeks', 'Aramayı hızlandıran, sütun değerlerini sıralı tutan yardımcı yapı.'],
  ['İzolasyon seviyesi', 'Eşzamanlı işlemlerin birbirini ne ölçüde göreceğini belirleyen ayar.'],
  ['JOIN', 'İki tablonun satırlarını bir koşula göre birleştirme işlemi.'],
  ['Kohort', 'Aynı dönemde başlayan kullanıcı grubu; elde tutma analizinde kullanılır.'],
  ['Lakehouse', 'Veri gölü dosyaları üzerinde ACID ve SQL sunan mimari (Delta, Iceberg).'],
  ['LAG / LEAD', 'Pencerede önceki / sonraki satırın değerini getiren fonksiyonlar.'],
  ['Materialized view', 'Sonucu fiziksel olarak saklanan, yenilenmesi gereken view.'],
  ['MVCC', 'Multi-Version Concurrency Control: okuyucuların yazarları engellemediği eşzamanlılık modeli.'],
  ['Normalizasyon', 'Tekrarı ve anomalileri azaltmak için tabloları ayrıştırma süreci (1NF, 2NF, 3NF…).'],
  ['NULL', 'Bilinmeyen veya olmayan değer; karşılaştırmalarda BİLİNMEYEN sonuç üretir.'],
  ['OLAP / OLTP', 'Analitik işlem / çevrim içi işlem sistemleri.'],
  ['Partition', 'Tablonun bir sütuna göre fiziksel parçalara ayrılması.'],
  ['PARTITION BY', 'Pencere fonksiyonunda pencereyi gruplara ayıran ifade.'],
  ['Pencere fonksiyonu', 'Satırları ezmeden bir “pencere” üzerinde hesap yapan fonksiyon: OVER (…).'],
  ['Pivot', 'Satır değerlerini sütunlara çevirme.'],
  ['RDBMS', 'İlişkisel veritabanı yönetim sistemi.'],
  ['Retention', 'Elde tutma: kullanıcıların zaman içinde geri gelme oranı.'],
  ['RFM', 'Recency, Frequency, Monetary: müşteri değer segmentasyonu.'],
  ['SCD', 'Slowly Changing Dimension: zamanla değişen boyut niteliklerinin yönetimi.'],
  ['Schema (şema)', 'Tabloların, sütunların, ilişkilerin ve kısıtların bütünü.'],
  ['Self join', 'Bir tabloyu kendisiyle birleştirme.'],
  ['SQL injection', 'Kullanıcı girdisinin SQL kodu olarak çalıştırılmasıyla oluşan güvenlik açığı.'],
  ['Star schema (yıldız şema)', 'Ortada fact, etrafında dimension tablolarından oluşan analitik model.'],
  ['Subquery (alt sorgu)', 'Başka bir sorgunun içindeki SELECT.'],
  ['Transaction', 'Ya hep ya hiç prensibiyle çalışan iş birimi: BEGIN … COMMIT/ROLLBACK.'],
  ['Trigger', 'Bir tabloda olay olduğunda otomatik çalışan SQL bloğu.'],
  ['UNION', 'İki sorgunun sonucunu alt alta birleştirir; UNION ALL tekrarları korur.'],
  ['UPSERT', 'Kayıt varsa güncelle, yoksa ekle işlemi (ON CONFLICT, MERGE).'],
  ['View', 'Kaydedilmiş sorgu; tablo gibi sorgulanır, veri saklamaz.'],
  ['Watermark', 'Artımlı yüklemede en son işlenen zaman/anahtar değeri.'],
  ['Yabancı anahtar (FK)', 'Başka bir tablonun birincil anahtarına referans veren sütun.']
];

window.SQLP_CHEATS = [
  { h: 'Sorgunun iskeleti', code: "SELECT sutun, COUNT(*) AS adet\nFROM tablo\nWHERE kosul\nGROUP BY sutun\nHAVING COUNT(*) > 1\nORDER BY adet DESC\nLIMIT 10;" },
  { h: 'JOIN türleri', code: "SELECT ...\nFROM a\n[INNER | LEFT | RIGHT | FULL] JOIN b\n  ON a.id = b.a_id;\n\n-- eşi olmayanlar\nLEFT JOIN b ON ... WHERE b.id IS NULL" },
  { h: 'Filtre operatörleri', code: "= <> > < >= <=\nIN ('a', 'b')\nBETWEEN 10 AND 20\nLIKE 'abc%'  -- % çok, _ tek karakter\nIS NULL / IS NOT NULL\nAND  OR  NOT" },
  { h: 'CTE ve alt sorgu', code: "WITH t AS (\n  SELECT ... FROM ...\n)\nSELECT * FROM t\nWHERE x > (SELECT AVG(x) FROM t);" },
  { h: 'Pencere fonksiyonları', code: "ROW_NUMBER() OVER (PARTITION BY g ORDER BY x DESC)\nRANK() / DENSE_RANK() OVER (...)\nLAG(x, 1) OVER (ORDER BY t)\nSUM(x) OVER (ORDER BY t ROWS UNBOUNDED PRECEDING)\nAVG(x) OVER (ORDER BY t ROWS 6 PRECEDING)" },
  { h: 'Koşullu ifadeler', code: "CASE WHEN x < 0 THEN 'negatif'\n     WHEN x = 0 THEN 'sıfır'\n     ELSE 'pozitif' END\n\nCOALESCE(x, 0)\nNULLIF(payda, 0)\nSUM(CASE WHEN durum = 'ok' THEN 1 ELSE 0 END)" },
  { h: 'Veri değiştirme', code: "INSERT INTO t (a, b) VALUES (1, 'x');\nUPDATE t SET b = 'y' WHERE a = 1;\nDELETE FROM t WHERE a = 1;\n\nBEGIN; ... COMMIT;  -- veya ROLLBACK;" },
  { h: 'Tablo tanımlama', code: "CREATE TABLE t (\n  id INTEGER PRIMARY KEY,\n  ad TEXT NOT NULL,\n  puan INTEGER CHECK (puan BETWEEN 1 AND 5),\n  ref_id INTEGER REFERENCES diger(id)\n);\nCREATE INDEX idx_t_ad ON t(ad);" },
  { h: 'Tarih (SQLite)', code: "strftime('%Y-%m', d)      -- ay\ndate(d, '+7 days')\ndate(d, 'start of month')\njulianday(d2) - julianday(d1)  -- gün farkı" }
];
