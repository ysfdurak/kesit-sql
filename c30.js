/* Kesit SQL içerik 30: Veri Analisti, İK Analitiği, Büyük Veri ve Kanat Havayolları derslerine
   “Derinleş” bölümleri ve ek (daha gerçekçi) SQL alıştırmaları */
(function () {
const L = window.SQLP_LESSONS; const LM = id => L.find(l => l.id === id);
const sq = (q, sol, o) => Object.assign({ t: 'sql', q: '<p>' + q + '</p>', sol }, o || {});
const X = (id, list) => { const l = LM(id); if (l) l.ex = (l.ex || []).concat(list); };
const more = (id, html) => { const l = LM(id); if (l) l.body += html; };
const C = (src) => '<pre class="code">' + src.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre>';
const D = (title, html) => `<h2>Derinleş: ${title}</h2>${html}`;
const O = { ord: true };
const NET = 'oi.quantity * oi.unit_price * (1 - oi.discount)';
const DEPT = 'JOIN ik_positions p ON p.position_id = e.position_id JOIN ik_departments d ON d.dept_id = p.dept_id';
const DK = '(julianday(f.actual_dep) - julianday(f.sched_dep)) * 1440';

/* =====================================================================
   VERİ ANALİSTİ
   ===================================================================== */

more('an-kpi', D('KPI ağacı ve tanecik hataları', `
<p>Tek bir ciro rakamı “ne oldu?” sorusunu cevaplar, “neden?” sorusunu cevaplamaz. Bu yüzden analistler ciroyu çarpanlarına ayırır:</p>
<p><b>Net ciro = aktif müşteri × müşteri başına sipariş (frekans) × ortalama sepet (AOV)</b></p>
<p>Üç çarpandan hangisinin değiştiğini görmek aksiyonu belirler. Müşteri sayısı düştüyse sorun edinmededir, frekans düştüyse elde tutmada, AOV düştüyse fiyat ya da sepet büyüklüğündedir. Anadolu Market'te teslim edilmiş siparişlerde 2023'ten 2024'e ciro 335.573 TL'den 636.316 TL'ye çıktı. Aktif müşteri 74'ten 120'ye (%62), frekans 3,23'ten 3,51'e, AOV 1.404'ten 1.511 TL'ye yükseldi. Yani büyümenin büyük kısmı <b>yeni müşteriden</b> geliyor. Bu cümleyi tek bir ciro sayısından kuramazdın.</p>
<h3>En sık hata: JOIN sonrası tanecik</h3>
<p><code>orders</code> tablosunu <code>order_items</code> ile birleştirdiğinde her satır artık bir <b>sipariş kalemi</b> olur. Bu satırlarda <code>COUNT(*)</code> sipariş sayısını değil kalem sayısını verir. <code>AVG(tutar)</code> da sepet ortalamasını değil kalem ortalamasını verir:</p>
${C(`SELECT COUNT(*) AS satir,
       COUNT(DISTINCT o.order_id) AS siparis,
       ROUND(AVG(${NET}), 1) AS kalem_ort,
       ROUND(SUM(${NET}) / COUNT(DISTINCT o.order_id), 1) AS aov
FROM orders o
JOIN order_items oi ON oi.order_id = o.order_id
WHERE o.status = 'delivered'
  AND o.order_date >= '2024-01-01' AND o.order_date < '2025-01-01';`)}
<p>2024'te 421 sipariş 759 kaleme yayılıyor. “Ortalama sepet” diye 838 TL raporlamak, gerçek AOV'yi (1.511 TL) neredeyse yarıya indirir.</p>
<table>
<tr><th>Hata</th><th>Belirti</th><th>Doğrusu</th></tr>
<tr><td>JOIN sonrası <code>COUNT(*)</code></td><td>Sipariş sayısı şişer</td><td><code>COUNT(DISTINCT order_id)</code></td></tr>
<tr><td>Kalem ortalaması</td><td>AOV düşük çıkar</td><td>Toplam ciro ÷ tekil sipariş</td></tr>
<tr><td>Payda kayması</td><td>İptal oranı %8,2 mi, %10,5 mi?</td><td>Payda tüm siparişler; teslim edilenler değil</td></tr>
<tr><td>Oranların ortalaması</td><td>Küçük gruplar fazla ağırlık alır</td><td>Önce pay ve paydayı topla, sonra böl</td></tr>
</table>
<div class="tip"><b>Mini kontrol listesi</b>1) Metriğin tanımı yazılı mı? 2) Sorgunun her satırı neyi temsil ediyor (sipariş mi, kalem mi)? 3) Payda “bu olayı yaşayabilecek herkes” mi? 4) Sonucu bilinen bir toplamla karşılaştırdın mı?</div>
`));
X('an-kpi', [
  sq('KPI ağacı: teslim edilmiş siparişlerde her yıl için aktif müşteri, sipariş, frekans (sipariş ÷ müşteri, 2 basamak), AOV (1 basamak) ve net ciro (tam sayı): <code>yil</code>, <code>aktif_musteri</code>, <code>siparis</code>, <code>frekans</code>, <code>aov</code>, <code>ciro</code>. Yıla göre sırala.',
    `SELECT strftime('%Y', o.order_date) AS yil, COUNT(DISTINCT o.customer_id) AS aktif_musteri, COUNT(DISTINCT o.order_id) AS siparis, ROUND(1.0 * COUNT(DISTINCT o.order_id) / COUNT(DISTINCT o.customer_id), 2) AS frekans, ROUND(SUM(${NET}) / COUNT(DISTINCT o.order_id), 1) AS aov, ROUND(SUM(${NET})) AS ciro FROM orders o JOIN order_items oi ON oi.order_id = o.order_id WHERE o.status = 'delivered' GROUP BY strftime('%Y', o.order_date) ORDER BY yil;`,
    { ord: true, hint: 'Frekansta tam sayı bölmesine dikkat: payı 1.0 ile çarp.' }),
  sq('İndirimin maliyeti: 2024\'te teslim edilmiş siparişlerde brüt ciro (tam sayı), verilen toplam indirim tutarı (tam sayı) ve indirimin brüt ciroya oranı (yüzde, 2 basamak): <code>brut</code>, <code>indirim</code>, <code>oran</code>. Oranı indirim yüzdelerinin ortalamasıyla değil, tutarların oranıyla hesapla.',
    "SELECT ROUND(SUM(oi.quantity * oi.unit_price)) AS brut, ROUND(SUM(oi.quantity * oi.unit_price * oi.discount)) AS indirim, ROUND(100.0 * SUM(oi.quantity * oi.unit_price * oi.discount) / SUM(oi.quantity * oi.unit_price), 2) AS oran FROM orders o JOIN order_items oi ON oi.order_id = o.order_id WHERE o.status = 'delivered' AND o.order_date >= '2024-01-01' AND o.order_date < '2025-01-01';",
    { hint: 'AVG(discount) her kalemi eşit ağırlıklandırır; tutar ağırlıklı oran için SUM(indirim tutarı) / SUM(brüt tutar).' })
]);

more('an-dashboard', D('Dönem karşılaştırması, kümülatif ve hareketli ortalama', `
<p>Yönetici bir dashboard'a baktığında hep aynı üç soruyu sorar: “Geçen yıla göre nasılız?”, “Yıl başından beri neredeyiz?”, “Gidişat ne yönde?”. Bunların SQL karşılıkları sırasıyla <b>yıllık karşılaştırma</b> (YoY), <b>kümülatif toplam</b> (YTD) ve <b>hareketli ortalama</b>dır.</p>
<h3>Yıl içi kümülatif</h3>
${C(`WITH a AS (
  SELECT strftime('%Y-%m', o.order_date) AS ay,
         SUM(${NET}) AS ciro
  FROM orders o JOIN order_items oi ON oi.order_id = o.order_id
  WHERE o.status = 'delivered'
    AND o.order_date >= '2024-01-01' AND o.order_date < '2025-01-01'
  GROUP BY strftime('%Y-%m', o.order_date)
)
SELECT ay, ROUND(ciro) AS ciro,
       ROUND(SUM(ciro) OVER (ORDER BY ay ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)) AS ytd
FROM a
ORDER BY ay;`)}
<h3>Yıllık karşılaştırmada üç tuzak</h3>
<ul>
<li><b>Eksik ay:</b> <code>LAG(ciro, 12)</code> ancak her ay satırı varsa “12 ay önce”dir. Bir ay eksikse 12 satır geri gitmek başka bir aya düşer. Güvenli yol, tabloyu kendisiyle <code>yıl − 1</code> ve aynı ay üzerinden birleştirmek ya da önce tarih iskeleti kurmaktır.</li>
<li><b>Küçük taban:</b> Ocak 2024 cirosu, Ocak 2023'e göre %227 artmış görünüyor. Çünkü Ocak 2023'te yalnızca 13 bin TL'lik satış vardı. Yüzdenin yanına her zaman mutlak değeri de koy.</li>
<li><b>Yarım dönem:</b> Ayın 15'inde bakılan “bu ay”, geçen yılın tam ayıyla karşılaştırılmaz. Ya aynı gün sayısını (ay başından bugüne) karşılaştır ya da tamamlanmamış dönemi grafikte ayrı işaretle.</li>
</ul>
<h3>Hareketli ortalama</h3>
<p>Günlük sipariş sayısı gürültülüdür; 7 günlük hareketli ortalama haftanın günü etkisini düzler. <code>ROWS BETWEEN 6 PRECEDING AND CURRENT ROW</code> “son 7 <b>satır</b>” demektir, “son 7 gün” değil. Sipariş olmayan günler tabloda yoksa pencere 7 günden daha geriye uzanır. Bu yüzden hareketli ortalamayı her zaman tarih iskeletinin üzerinde hesapla. Pencerenin ilk 6 gününde de 7'den az değer vardır. Raporda bu “ısınma” dönemini ya göstermez ya da önceki ayın verisini pencereye katarsın.</p>
<table>
<tr><th>Soru</th><th>Kalıp</th><th>Dikkat</th></tr>
<tr><td>Geçen yıla göre?</td><td>Kendine JOIN (yıl − 1, aynı ay)</td><td>Küçük taban, yarım dönem</td></tr>
<tr><td>Yıl başından beri?</td><td><code>SUM() OVER (ORDER BY ay)</code></td><td>Yıl değişince <code>PARTITION BY yil</code></td></tr>
<tr><td>Gidişat?</td><td><code>AVG() OVER (ROWS 6 PRECEDING)</code></td><td>Önce tarih iskeleti</td></tr>
</table>
`));
X('an-dashboard', [
  sq('Aralık 2024\'ün her günü için sipariş sayısı (tüm durumlar) ve 7 günlük hareketli ortalaması (2 basamak); sipariş olmayan günler 0 sayılsın ve ortalamaya girsin: <code>tarih</code>, <code>siparis</code>, <code>ort7</code>. Tarihe göre sırala.',
    "WITH RECURSIVE g(d) AS (SELECT '2024-12-01' UNION ALL SELECT date(d, '+1 day') FROM g WHERE d < '2024-12-31'), s AS (SELECT g.d, COUNT(o.order_id) AS n FROM g LEFT JOIN orders o ON o.order_date = g.d GROUP BY g.d) SELECT d AS tarih, n AS siparis, ROUND(AVG(n * 1.0) OVER (ORDER BY d ROWS BETWEEN 6 PRECEDING AND CURRENT ROW), 2) AS ort7 FROM s ORDER BY d;",
    { ord: true, hint: 'Önce tarih iskeleti + LEFT JOIN ile günlük sayılar, sonra AVG(...) OVER (ORDER BY d ROWS BETWEEN 6 PRECEDING AND CURRENT ROW).' }),
  sq('Yıllık karşılaştırma: 2024\'ün her ayı için teslim edilmiş siparişlerin net cirosu, 2023\'ün aynı ayındaki ciro ve değişim yüzdesi (ciro tam sayı, değişim 1 basamak): <code>ay</code> (1–12, sayı), <code>ciro</code>, <code>gecen_yil</code>, <code>degisim</code>. Aya göre sırala.',
    `WITH a AS (SELECT CAST(strftime('%Y', o.order_date) AS INTEGER) AS yil, CAST(strftime('%m', o.order_date) AS INTEGER) AS ay, SUM(${NET}) AS ciro FROM orders o JOIN order_items oi ON oi.order_id = o.order_id WHERE o.status = 'delivered' GROUP BY CAST(strftime('%Y', o.order_date) AS INTEGER), CAST(strftime('%m', o.order_date) AS INTEGER)) SELECT b.ay, ROUND(b.ciro) AS ciro, ROUND(g.ciro) AS gecen_yil, ROUND(100.0 * (b.ciro - g.ciro) / g.ciro, 1) AS degisim FROM a b LEFT JOIN a g ON g.yil = b.yil - 1 AND g.ay = b.ay WHERE b.yil = 2024 ORDER BY b.ay;`,
    { ord: true, hint: 'Aylık ciroyu (yıl, ay) düzeyinde bir CTE\'de hesapla; CTE\'yi kendisiyle g.yil = b.yil - 1 AND g.ay = b.ay koşuluyla birleştir.' })
]);

more('an-pareto', D('Kümülatif payın doğru tanımı', `
<p>Pareto analizinin özü <b>kümülatif pay</b>dır: ürünleri ciroya göre büyükten küçüğe sırala, her satırda “buraya kadarki toplam ÷ genel toplam” değerini hesapla. Bu basit tanımın içinde üç karar gizlidir.</p>
<h3>1. Sınırı geçen ürün hangi sınıfta?</h3>
<p><code>kum_pay &lt;= 0.80</code> kuralı, %80 çizgisini <b>geçiren</b> ürünü B sınıfına atar. Oysa o ürün olmadan %80'e ulaşılamaz. Daha savunulabilir tanım, ürünün <b>kendisinden önceki</b> kümülatif paya bakmaktır: önceki pay %80'in altındaysa ürün A'dır.</p>
${C(`WITH u AS (
  SELECT p.product_id, p.name, SUM(${NET}) AS ciro
  FROM order_items oi
  JOIN orders o ON o.order_id = oi.order_id
  JOIN products p ON p.product_id = oi.product_id
  WHERE o.status = 'delivered'
  GROUP BY p.product_id, p.name
),
k AS (
  SELECT product_id, name, ciro,
         SUM(ciro) OVER (ORDER BY ciro DESC, product_id
                         ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) / SUM(ciro) OVER () AS kum
  FROM u
)
SELECT name, ROUND(ciro) AS ciro,
       ROUND(100 * (kum - ciro / (SELECT SUM(ciro) FROM u)), 1) AS onceki_yuzde,
       ROUND(100 * kum, 1) AS kum_yuzde
FROM k
WHERE kum BETWEEN 0.74 AND 0.86
ORDER BY ciro DESC, product_id;`)}
<p>Bu sorguda <b>Powerbank 20000mAh</b> satırına bak: öncesi %78,8, kendisiyle %81,1. Çizgiyi geçiren ürün odur. Eski kurala göre B'dir, “önceki pay” kuralına göre A'dır.</p>
<h3>2. Eşitlik ve pencere çerçevesi</h3>
<p><code>ORDER BY ciro DESC</code> yazıp çerçeveyi belirtmezsen varsayılan <code>RANGE</code> çerçevesi devreye girer. Aynı ciroya sahip iki ürün aynı kümülatif değeri alır. Sıralamaya ikinci anahtar (<code>product_id</code>) ekleyip <code>ROWS</code> kullanmak sonucu belirli kılar.</p>
<h3>3. Hiç satmayan ürünler</h3>
<p>INNER JOIN, hiç satılmamış ürünleri listeden sessizce düşürür. Anadolu Market'in 40 ürününden 2'si (Koşu Bandı ve Gurme Lokum Kutusu) hiç teslim edilmemiş. “Ürünlerin yüzde kaçı cironun %80'ini yapıyor?” sorusunda payda 38 değil 40 olmalıdır. Bu ürünler C sınıfının en dibine LEFT JOIN ile eklenir.</p>
<div class="note"><b>80/20 bir yasa değil</b>Bu veride cironun %80'ine ulaşmak için ürünlerin üçte ikisi gerekiyor. Yani portföy yoğunlaşmış değil, dengeli. Pareto analizinin değeri, oranın 80/20 çıkması değil, yoğunlaşmanın ne kadar olduğunu ölçmesidir.</div>
`));
X('an-pareto', [
  sq('Cironun %80\'ine ulaşmak için kaç ürün gerekiyor? Teslim edilmiş siparişlerde ürünleri ciroya göre sırala (eşitlikte <code>product_id</code>); kendisinden <b>önceki</b> kümülatif payı %80\'in altında olan ürünleri say. Satılan ürün sayısını ve bu ürünlerin satılan ürünler içindeki yüzdesini (1 basamak) de getir: <code>a_urun</code>, <code>toplam</code>, <code>yuzde</code>.',
    `WITH u AS (SELECT oi.product_id, SUM(${NET}) AS ciro FROM order_items oi JOIN orders o ON o.order_id = oi.order_id WHERE o.status = 'delivered' GROUP BY oi.product_id), k AS (SELECT ciro, (SUM(ciro) OVER (ORDER BY ciro DESC, product_id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) - ciro) / SUM(ciro) OVER () AS onceki FROM u) SELECT SUM(CASE WHEN onceki < 0.8 THEN 1 ELSE 0 END) AS a_urun, COUNT(*) AS toplam, ROUND(100.0 * SUM(CASE WHEN onceki < 0.8 THEN 1 ELSE 0 END) / COUNT(*), 1) AS yuzde FROM k;`,
    { hint: 'Önceki kümülatif = (kümülatif toplam − kendi ciron) ÷ genel toplam.' }),
  sq('Kategori içi Pareto: her kategoride ürünleri kendi kategorisinin cirosuna göre sırala (eşitlikte <code>product_id</code>) ve kendisinden önceki kategori içi kümülatif payı %80\'in altında olan ürünleri A say. Teslim edilmiş siparişler: <code>category</code>, <code>urun</code> (satılan ürün sayısı), <code>a_urun</code>. Kategoriye göre sırala.',
    `WITH u AS (SELECT p.category, oi.product_id, SUM(${NET}) AS ciro FROM order_items oi JOIN orders o ON o.order_id = oi.order_id JOIN products p ON p.product_id = oi.product_id WHERE o.status = 'delivered' GROUP BY p.category, oi.product_id), k AS (SELECT category, (SUM(ciro) OVER (PARTITION BY category ORDER BY ciro DESC, product_id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) - ciro) / SUM(ciro) OVER (PARTITION BY category) AS onceki FROM u) SELECT category, COUNT(*) AS urun, SUM(CASE WHEN onceki < 0.8 THEN 1 ELSE 0 END) AS a_urun FROM k GROUP BY category ORDER BY category;`,
    { ord: true, hint: 'Her iki pencere fonksiyonuna da PARTITION BY category ekle.' })
]);

more('an-aktif', D('Aktifliği tanımlamak ve yapışkanlığı doğru bölmek', `
<p>DAU, WAU ve MAU'nun hepsi tek bir kelimeye dayanır: <b>aktif</b>. Uygulamayı açmak mı aktiflik, bir ürüne bakmak mı, satın almak mı? Bir haber sitesi için “sayfa açtı” yeterli olabilir. Bir e-ticaret şirketi ise genellikle “anlamlı olay” (ürün görüntüleme, sepete ekleme) ister. Tanımı genişletmek sayıları şişirir ama kararları iyileştirmez. Tanımı yaz ve her raporda aynı tanımı kullan.</p>
<h3>Yapışkanlıkta payda</h3>
<p>Yapışkanlık = ortalama DAU ÷ MAU. Ortalama DAU'yu hesaplarken iki hata yapılır:</p>
<ul>
<li><b>Olaysız günleri atlamak:</b> GROUP BY yalnızca olay olan günleri döndürür. Ortalama DAU'nun paydası ayın <b>takvim günü</b> olmalıdır, olaylı gün değil. Aksi halde sessiz günler ortalamayı yükseltir.</li>
<li><b>Eksik ay:</b> <code>web_events</code> verisi 29 Kasım'da bitiyor. Kasım'ın MAU'su 30 günlük değil 29 günlük bir pencereden geliyor. Ekim'le kıyaslarken bunu not et ya da aynı gün sayısını karşılaştır.</li>
</ul>
${C(`WITH g AS (
  SELECT strftime('%Y-%m', event_time) AS ay, DATE(event_time) AS gun,
         COUNT(DISTINCT user_id) AS dau
  FROM web_events
  GROUP BY strftime('%Y-%m', event_time), DATE(event_time)
),
m AS (
  SELECT strftime('%Y-%m', event_time) AS ay, COUNT(DISTINCT user_id) AS mau
  FROM web_events
  GROUP BY strftime('%Y-%m', event_time)
)
SELECT m.ay, m.mau, COUNT(*) AS olayli_gun,
       ROUND(1.0 * SUM(g.dau) / COUNT(*), 1) AS ort_dau,
       ROUND(100.0 * SUM(g.dau) / COUNT(*) / m.mau, 1) AS yapiskanlik
FROM m JOIN g ON g.ay = m.ay
GROUP BY m.ay, m.mau
ORDER BY m.ay;`)}
<p>Ekim'de 296 kişi aktif, ortalama DAU 9,6, yapışkanlık %3,2. Bu düşük bir değerdir. Sebebini aktif gün dağılımı gösterir: 600 kullanıcının 595'i yalnızca <b>bir gün</b> görünmüş. Veri, kampanyayla gelen ve bir kez dönen ziyaretçilerin hunisine benziyor. Burada yapışkanlıktan çok edinme ve dönüşüm metriklerine bakmak gerekir.</p>
${C(`WITH k AS (
  SELECT user_id, COUNT(DISTINCT DATE(event_time)) AS aktif_gun
  FROM web_events
  GROUP BY user_id
)
SELECT aktif_gun, COUNT(*) AS kullanici
FROM k
GROUP BY aktif_gun
ORDER BY aktif_gun;`)}
<table>
<tr><th>Yapışkanlık</th><th>Yorum</th></tr>
<tr><td>%5'in altı</td><td>Tek seferlik kullanım; ürün alışkanlık yaratmıyor</td></tr>
<tr><td>%10–20</td><td>Haftada bir–iki gün dönen kullanıcılar</td></tr>
<tr><td>%50 üzeri</td><td>Günlük alışkanlık (mesajlaşma, sosyal medya)</td></tr>
</table>
<div class="tip"><b>Takvim ayı mı, kayan 28 gün mü?</b>Takvim ayı MAU'su 28 ile 31 gün arasında değişen pencerelerden gelir. Ürün ekipleri bu yüzden çoğu zaman “son 28 gün” (4 tam hafta) kullanır. Hangisini seçtiysen grafiğin başlığına yaz.</div>
`));
X('an-aktif', [
  sq('Haftalık aktif kullanıcı (WAU): haftaları 30 Eylül 2024 Pazartesi\'den başlayarak numaralandır (hafta = gün farkı ÷ 7, aşağı yuvarla). Her hafta için haftanın veri olan ilk günü ve tekil kullanıcı sayısı: <code>hafta</code>, <code>ilk_gun</code>, <code>wau</code>. Haftaya göre sırala.',
    "SELECT FLOOR((julianday(DATE(event_time)) - julianday('2024-09-30')) / 7) AS hafta, MIN(DATE(event_time)) AS ilk_gun, COUNT(DISTINCT user_id) AS wau FROM web_events GROUP BY FLOOR((julianday(DATE(event_time)) - julianday('2024-09-30')) / 7) ORDER BY hafta;",
    { ord: true, hint: 'FLOOR((julianday(DATE(event_time)) - julianday(\'2024-09-30\')) / 7) her güne bir hafta numarası verir. Son hafta yarımdır; grafikte bunu işaretle.' }),
  sq('“Anlamlı” aktiflik: her ay için MAU, o ay en az bir <b>purchase</b> olayı olan tekil kullanıcı sayısı ve bunun MAU\'ya oranı (yüzde, 1 basamak): <code>ay</code> (YYYY-AA), <code>mau</code>, <code>alici</code>, <code>oran</code>.',
    "SELECT strftime('%Y-%m', event_time) AS ay, COUNT(DISTINCT user_id) AS mau, COUNT(DISTINCT CASE WHEN event_type = 'purchase' THEN user_id END) AS alici, ROUND(100.0 * COUNT(DISTINCT CASE WHEN event_type = 'purchase' THEN user_id END) / COUNT(DISTINCT user_id), 1) AS oran FROM web_events GROUP BY strftime('%Y-%m', event_time) ORDER BY ay;",
    { ord: true, hint: 'COUNT(DISTINCT CASE WHEN ... THEN user_id END): koşulu sağlamayan satırlar NULL olur ve sayılmaz.' })
]);

more('an-sepet', D('Destek, güven ve kaldıraç: hesap ve yorum', `
<p>“Birlikte” sayısı tek başına yanıltıcıdır, çünkü çok satan iki ürün tesadüfen de sık sık aynı sepete düşer. Asıl soru şudur: <b>A'yı alanlar B'yi, herkesin aldığından daha sık mı alıyor?</b> Bunu kaldıraç (lift) ölçer.</p>
<p><b>lift(A, B) = destek(A ve B) ÷ (destek(A) × destek(B)) = ortak × N ÷ (adet<sub>A</sub> × adet<sub>B</sub>)</b>. Lift = 1 bağımsızlık, 1'den büyük çekim, 1'den küçük itme demektir. Lift simetriktir, güven ise yönlüdür: A→B ile B→A farklıdır.</p>
<h3>Üç ölçüyü tek sorguda hesaplamak</h3>
<p>Önce sepeti <b>tekilleştir</b>: aynı siparişte aynı kategoriden üç ürün varsa kategori bir kez sayılmalı. Sonra her öğenin kaç siparişte geçtiğini, çiftlerin ortak sayısını ve toplam sipariş sayısını ayrı CTE'lerde hazırla. Her CTE'nin taneciği ayrı olsun ki JOIN satırları çoğaltmasın.</p>
${C(`WITH s AS (
  SELECT DISTINCT oi.order_id, p.category
  FROM order_items oi
  JOIN orders o ON o.order_id = oi.order_id
  JOIN products p ON p.product_id = oi.product_id
  WHERE o.status = 'delivered'
),
n AS (SELECT COUNT(DISTINCT order_id) AS toplam FROM s),
u AS (SELECT category, COUNT(*) AS adet FROM s GROUP BY category),
c AS (
  SELECT a.category AS k1, b.category AS k2, COUNT(*) AS ortak
  FROM s a JOIN s b ON b.order_id = a.order_id AND a.category < b.category
  GROUP BY a.category, b.category
)
SELECT c.k1, c.k2, c.ortak,
       ROUND(100.0 * c.ortak / n.toplam, 1) AS destek,
       ROUND(100.0 * c.ortak / u1.adet, 1) AS guven_1_2,
       ROUND(1.0 * c.ortak * n.toplam / (u1.adet * u2.adet), 2) AS lift
FROM c
JOIN u u1 ON u1.category = c.k1
JOIN u u2 ON u2.category = c.k2
CROSS JOIN n
ORDER BY lift DESC, c.k1, c.k2;`)}
<p>Sonuç şaşırtıcı: tüm kategori çiftlerinde lift 1'in altında. En yüksek değer Ev &amp; Yaşam–Kitap çiftinde (0,89). Bunun sebebi sepetlerin küçük olmasıdır: siparişlerin büyük kısmı bir ya da iki kalemden oluşur. Bir kategoriyi seçen sepette başka bir kategoriye az yer kalır. Bu veride kategori düzeyinde “çapraz satış fırsatı” yoktur. Ürün düzeyinde ise bazı çiftler öne çıkar.</p>
<h3>Küçük sayı tuzağı</h3>
<p>Ürün düzeyinde lift'i en yüksek çift <b>Suç ve Ceza + Bisiklet Kaskı</b> (lift ≈ 3), ama yalnızca 5 ortak siparişe dayanıyor. Az görülen ürünlerde birkaç tesadüfi sepet lift'i uçurur. Bu yüzden her zaman bir <b>en az destek</b> eşiği uygula (ör. en az 5–10 ortak sipariş) ve lift'i ortak sayısıyla birlikte raporla.</p>
<table>
<tr><th>Hata</th><th>Sonuç</th><th>Çözüm</th></tr>
<tr><td>Sepet tekilleştirilmemiş</td><td>Aynı sipariş birden çok sayılır</td><td><code>SELECT DISTINCT order_id, öğe</code></td></tr>
<tr><td>Payda: yalnızca çok kalemli siparişler</td><td>Destek şişer, lift değişir</td><td>N = tüm (teslim edilmiş) siparişler</td></tr>
<tr><td>Eşik yok</td><td>Tesadüfi çiftler zirvede</td><td><code>WHERE ortak &gt;= 5</code></td></tr>
<tr><td>Güveni simetrik sanmak</td><td>A→B ile B→A karışır</td><td>Yönü sütun adına yaz</td></tr>
</table>
`));
X('an-sepet', [
  sq('Ürün düzeyinde kaldıraç: teslim edilmiş siparişlerde (sepeti sipariş–ürün olarak tekilleştir) en az 5 ortak siparişi olan ürün çiftlerinden lift\'i en yüksek 3 çift. Çiftte küçük <code>product_id</code> önce; lift = ortak × toplam sipariş ÷ (adet1 × adet2), 2 basamak: <code>urun1</code>, <code>urun2</code>, <code>ortak</code>, <code>lift</code>. Lift\'e göre azalan, eşitlikte <code>urun1</code>, <code>urun2</code>.',
    "WITH s AS (SELECT DISTINCT oi.order_id, oi.product_id FROM order_items oi JOIN orders o ON o.order_id = oi.order_id WHERE o.status = 'delivered'), n AS (SELECT COUNT(DISTINCT order_id) AS toplam FROM s), u AS (SELECT product_id, COUNT(*) AS adet FROM s GROUP BY product_id), c AS (SELECT a.product_id AS p1, b.product_id AS p2, COUNT(*) AS ortak FROM s a JOIN s b ON b.order_id = a.order_id AND a.product_id < b.product_id GROUP BY a.product_id, b.product_id) SELECT x1.name AS urun1, x2.name AS urun2, c.ortak, ROUND(1.0 * c.ortak * n.toplam / (u1.adet * u2.adet), 2) AS lift FROM c JOIN u u1 ON u1.product_id = c.p1 JOIN u u2 ON u2.product_id = c.p2 JOIN products x1 ON x1.product_id = c.p1 JOIN products x2 ON x2.product_id = c.p2 CROSS JOIN n WHERE c.ortak >= 5 ORDER BY lift DESC, urun1, urun2 LIMIT 3;",
    { ord: true, hint: 'Dört CTE: tekil sepet, toplam sipariş, ürün başına sipariş, çift başına ortak sipariş. Sonra birleştir ve ortak >= 5 filtresini uygula.' }),
  sq('Sepet büyüklüğü: teslim edilmiş siparişleri içerdikleri farklı ürün sayısına göre grupla; her grubun sipariş sayısı ve tüm teslim edilmiş siparişler içindeki payı (yüzde, 1 basamak): <code>urun_sayisi</code>, <code>siparis</code>, <code>pay</code>. Ürün sayısına göre sırala.',
    "WITH s AS (SELECT oi.order_id, COUNT(DISTINCT oi.product_id) AS urun_sayisi FROM order_items oi JOIN orders o ON o.order_id = oi.order_id WHERE o.status = 'delivered' GROUP BY oi.order_id) SELECT urun_sayisi, COUNT(*) AS siparis, ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pay FROM s GROUP BY urun_sayisi ORDER BY urun_sayisi;",
    { ord: true, hint: 'Tek ürünlü siparişler hiçbir çifte katkı vermez ama destek paydasında yer alır.' })
]);

more('an-rfm', D('Puanlama eşikleri: NTILE mi, iş kuralı mı?', `
<p>RFM'de her boyutu 1–5 puana çevirmenin iki yolu vardır. Seçim, segmentlerin ne kadar <b>kararlı</b> ve <b>anlaşılır</b> olacağını belirler.</p>
<table>
<tr><th></th><th>Göreli (NTILE)</th><th>Mutlak (sabit eşik)</th></tr>
<tr><td>Örnek</td><td>En yeni %20 → R = 5</td><td>Son 30 gün → R = 5, 31–90 → 4 …</td></tr>
<tr><td>Artısı</td><td>Her puanda eşit müşteri; dağılımdan bağımsız</td><td>Puanın iş anlamı var; aylar arasında karşılaştırılabilir</td></tr>
<tr><td>Eksisi</td><td>Eşitlikleri keyfî böler; müşteri hiçbir şey yapmadan puan değiştirebilir</td><td>Puanlar dengesiz dağılabilir; eşikleri iş birimiyle konuşmak gerekir</td></tr>
</table>
<h3>NTILE'ın eşitlik sorunu</h3>
<p>Frequency küçük tam sayılardan oluşur. Anadolu Market'te 27 müşterinin tam 2 teslim edilmiş siparişi var. <code>NTILE(5) OVER (ORDER BY frequency, customer_id)</code> bu 27 kişinin bir kısmına F = 1, bir kısmına F = 2 verir. Aynı davranışa farklı puan verilir ve aradaki tek fark müşteri numarasıdır. Frequency için çoğu zaman sabit eşik (1, 2–3, 4–5, 6–9, 10+) daha dürüsttür.</p>
<h3>Diğer kararlar</h3>
<ul>
<li><b>Referans tarihi:</b> Recency “bugüne göre” değil, analiz tarihine göre sabitlenir (burada 2025-01-01). Aksi halde sorgu her gün başka sonuç verir.</li>
<li><b>Monetary'de iadeler:</b> Yalnızca teslim edilenleri saymak iadeleri dışarıda bırakır. İadeli siparişi saymak ise harcamayı şişirir. Tanımı yaz.</li>
<li><b>JOIN çoğalması:</b> Frequency'yi <code>order_items</code> JOIN'inden sonra <code>COUNT(*)</code> ile alırsan kalem sayarsın. <code>COUNT(DISTINCT order_id)</code> kullan.</li>
</ul>
<p>Segmentin değerini görmenin en iyi yolu, müşteri sayısını ve <b>ciro payını</b> yan yana koymaktır. Aşağıda R için 90 gün, F için 5 sipariş eşiğiyle kurulmuş basit bir kural tabanlı segmentasyon var:</p>
${C(`WITH m AS (
  SELECT o.customer_id,
         julianday('2025-01-01') - julianday(MAX(o.order_date)) AS gun,
         COUNT(DISTINCT o.order_id) AS n,
         SUM(${NET}) AS para
  FROM orders o JOIN order_items oi ON oi.order_id = o.order_id
  WHERE o.status = 'delivered'
  GROUP BY o.customer_id
),
s AS (
  SELECT CASE WHEN gun <= 90 AND n >= 5 THEN 'Şampiyon'
              WHEN gun <= 90 THEN 'Aktif'
              WHEN n >= 5 THEN 'Risk altında'
              ELSE 'Uykuda' END AS segment, para
  FROM m
)
SELECT segment, COUNT(*) AS musteri, ROUND(SUM(para)) AS ciro,
       ROUND(100.0 * SUM(para) / (SELECT SUM(para) FROM s), 1) AS ciro_payi
FROM s
GROUP BY segment
ORDER BY ciro DESC;`)}
<p>135 müşterinin 41'i “Şampiyon” ve cironun %57,3'ünü getiriyor. 14 “Risk altında” müşteri ise az sayıda olmasına rağmen cironun yaklaşık %15'ini taşıyor. Geri kazanma kampanyasının ilk hedefi onlardır.</p>
<div class="tip"><b>Kontrol listesi</b>Referans tarihi sabit mi? Frequency tekil sipariş mi? Eşikler yazılı mı? Her segmentin müşteri sayısı ve ciro payı birlikte raporlanıyor mu?</div>
`));
X('an-rfm', [
  sq('Sabit eşikli R puanı: teslim edilmiş siparişi olan her müşterinin 2025-01-01\'e göre son siparişinden bu yana geçen gün sayısını hesapla ve puanla: 30 gün ve altı 5, 31–90 → 4, 91–180 → 3, 181–365 → 2, daha eski 1. Her puandaki müşteri sayısı: <code>r_puan</code>, <code>musteri</code>. Puana göre azalan sırala.',
    "WITH m AS (SELECT customer_id, julianday('2025-01-01') - julianday(MAX(order_date)) AS gun FROM orders WHERE status = 'delivered' GROUP BY customer_id) SELECT CASE WHEN gun <= 30 THEN 5 WHEN gun <= 90 THEN 4 WHEN gun <= 180 THEN 3 WHEN gun <= 365 THEN 2 ELSE 1 END AS r_puan, COUNT(*) AS musteri FROM m GROUP BY CASE WHEN gun <= 30 THEN 5 WHEN gun <= 90 THEN 4 WHEN gun <= 180 THEN 3 WHEN gun <= 365 THEN 2 ELSE 1 END ORDER BY r_puan DESC;",
    { ord: true }),
  sq('Geri kazanma listesi: en az 4 teslim edilmiş siparişi olan ama son teslim edilmiş siparişi 2024-07-01\'den önce kalan müşterilerden harcaması en yüksek 5\'i: <code>customer_id</code>, <code>siparis</code>, <code>son_siparis</code>, <code>harcama</code> (net, tam sayı). Harcamaya göre azalan, eşitlikte müşteri numarası.',
    `SELECT o.customer_id, COUNT(DISTINCT o.order_id) AS siparis, MAX(o.order_date) AS son_siparis, ROUND(SUM(${NET})) AS harcama FROM orders o JOIN order_items oi ON oi.order_id = o.order_id WHERE o.status = 'delivered' GROUP BY o.customer_id HAVING COUNT(DISTINCT o.order_id) >= 4 AND MAX(o.order_date) < '2024-07-01' ORDER BY harcama DESC, o.customer_id LIMIT 5;`,
    { ord: true, hint: 'Sipariş sayısı JOIN sonrası COUNT(DISTINCT o.order_id) olmalı; iki koşul da HAVING\'e yazılır.' })
]);

/* =====================================================================
   İK ANALİTİĞİ (Pusula İK)
   ===================================================================== */

more('ik-performans', D('9-kutu, kalibrasyon ve cömert değerlendirici etkisi', `
<p>9-kutu (nine-box), performansı (bu yıl ne yaptı?) ve potansiyeli (bir üst rolde ne yapabilir?) 3 × 3'lük bir ızgarada birleştirir. Kutuların adları şirketten şirkete değişir ama mantık aynıdır:</p>
<table>
<tr><th>Potansiyel ↓ / Performans →</th><th>Düşük (1–2)</th><th>Orta (3)</th><th>Yüksek (4–5)</th></tr>
<tr><td><b>Yüksek</b></td><td>Bilmece: yanlış rolde olabilir</td><td>Gelişen yetenek</td><td>Yıldız: yedekleme ve terfi adayı</td></tr>
<tr><td><b>Orta</b></td><td>Gelişim planı</td><td>Çekirdek çalışan</td><td>Güçlü katkı</td></tr>
<tr><td><b>Düşük</b></td><td>Risk: performans planı</td><td>İstikrarlı</td><td>Uzman: derinleşmeli</td></tr>
</table>
<h3>Puanı kim verdi?</h3>
<p>9-kutunun güvenilirliği, puanların farklı yöneticiler arasında <b>karşılaştırılabilir</b> olmasına bağlıdır. Bazı değerlendiriciler herkese 4–5 verir (cömertlik / leniency), bazıları 3'ün üstüne çıkmaz (sertlik). Bu durumda bir çalışanın kutusunu onun performansı değil, <b>yöneticisinin alışkanlığı</b> belirler. Kalibrasyon toplantısının amacı bu sapmayı düzeltmektir. Analistin işi de toplantıdan önce sapmayı görünür kılmaktır:</p>
${C(`SELECT m.full_name, COUNT(*) AS kisi,
       SUM(CASE WHEN r.rating <= 2 THEN 1 ELSE 0 END) AS p1_2,
       SUM(CASE WHEN r.rating = 3 THEN 1 ELSE 0 END) AS p3,
       SUM(CASE WHEN r.rating = 4 THEN 1 ELSE 0 END) AS p4,
       SUM(CASE WHEN r.rating = 5 THEN 1 ELSE 0 END) AS p5
FROM ik_reviews r
JOIN ik_employees m ON m.emp_id = r.reviewer_id
WHERE r.review_year = 2024
GROUP BY r.reviewer_id, m.full_name
HAVING COUNT(*) >= 35
ORDER BY AVG(r.rating) DESC, m.full_name
LIMIT 5;`)}
<p>İrem Acar'ın değerlendirdiği 38 kişinin hiçbiri 3 ve altı almamış; 28'i 5, 10'u 4 almış. Şirket genelinde 4–5 alanların payı ise %36,5. Bu ekip gerçekten olağanüstü olabilir. Ama aynı tablo her yıl tekrarlanıyorsa (2019'dan beri ortalaması 4,7'nin üstünde) bu bir puanlama alışkanlığıdır. O ekipten gelen “yıldızlar” kalibrasyonda ayrıca konuşulmalıdır.</p>
<h3>Sık yapılan hatalar</h3>
<ul>
<li><b>Küçük ekipte sapma:</b> 4 kişilik bir ekibin ortalaması rastlantıyla kolayca 4'e çıkar. Sapma analizine en az 10 kişi gibi bir eşik koy.</li>
<li><b>Potansiyeli boş olanlar:</b> 2024'te 142 değerlendirmede potansiyel alanı NULL. 9-kutu yüzdesinin paydasına bunları katmak kutuları küçültür. Ya hariç tut ya da “belirsiz” diye ayrı bir satır göster.</li>
<li><b>Ortalamaya dönüş:</b> 2023'te 5 alanların 2024 ortalaması 4,38; 1 alanlarınki 1,94. Uç puanlar ertesi yıl ortaya kayar. “Geçen yıl 5 alan düştü, demek ki motivasyonu bozuldu” yorumu çoğu zaman yalnızca istatistiktir.</li>
</ul>
`));
X('ik-performans', [
  sq('Cömertlik taraması: 2024\'te en az 10 kişiyi değerlendirenlerden, verdiği puanlarda 4–5 payı (yüzde, 1 basamak) en yüksek 3 değerlendirici: <code>full_name</code>, <code>kisi</code>, <code>yuksek_pay</code>. Paya göre azalan, eşitlikte ad.',
    "SELECT m.full_name, COUNT(*) AS kisi, ROUND(100.0 * SUM(CASE WHEN r.rating >= 4 THEN 1 ELSE 0 END) / COUNT(*), 1) AS yuksek_pay FROM ik_reviews r JOIN ik_employees m ON m.emp_id = r.reviewer_id WHERE r.review_year = 2024 GROUP BY r.reviewer_id, m.full_name HAVING COUNT(*) >= 10 ORDER BY yuksek_pay DESC, m.full_name LIMIT 3;",
    O),
  sq('Ortalamaya dönüş: hem 2023\'te hem 2024\'te değerlendirilen kişileri 2023 puanına göre grupla; her grubun kişi sayısı ve 2024 ortalama puanı (2 basamak): <code>puan_2023</code>, <code>kisi</code>, <code>ort_2024</code>. Puana göre sırala.',
    'SELECT a.rating AS puan_2023, COUNT(*) AS kisi, ROUND(AVG(b.rating * 1.0), 2) AS ort_2024 FROM ik_reviews a JOIN ik_reviews b ON b.emp_id = a.emp_id AND b.review_year = 2024 WHERE a.review_year = 2023 GROUP BY a.rating ORDER BY puan_2023;',
    { ord: true, hint: 'ik_reviews tablosunu kendisiyle aynı emp_id üzerinden birleştir; bir taraf 2023, diğeri 2024.' })
]);

more('ik-alim', D('Time-to-fill, kabul oranı ve paydanın seçimi', `
<p>İşe alım metriklerinin neredeyse hepsi bir orandır ve hepsinde asıl soru <b>paydanın kim olduğudur</b>. Sık kullanılan tanımlar:</p>
<table>
<tr><th>Metrik</th><th>Başlangıç → bitiş</th><th>Kimi ölçer?</th></tr>
<tr><td>Time to fill</td><td>Talebin açılışı → kapanışı</td><td>Süreç (onaylar, ilan, mülakat takvimi)</td></tr>
<tr><td>Time to hire</td><td>Adayın başvurusu → işe alınması</td><td>Adayın deneyimi; iyi adaylar uzun süreçte kaybolur</td></tr>
<tr><td>Teklif kabul oranı</td><td>Kabul ÷ teklif</td><td>Ücret rekabetçiliği, işveren markası</td></tr>
<tr><td>Kaynak verimi</td><td>İşe alınan ÷ başvuran (kaynağa göre)</td><td>Kaynağın aday kalitesi</td></tr>
</table>
<h3>Kabul oranında iki payda</h3>
<p><code>stage</code> sütunu adayın <b>son</b> aşamasını tutar. “teklif” aşamasında kalmış 1.907 aday var: teklif almış ama ne kabul ne ret kaydı var (yanıt bekleyen, süresi dolan ya da talebi iptal edilen teklifler). Bunları paydaya katmak oranı yarıdan fazla düşürür:</p>
${C(`SELECT
  SUM(CASE WHEN stage IN ('teklif', 'teklif reddedildi', 'işe alındı') THEN 1 ELSE 0 END) AS teklif_alan,
  SUM(CASE WHEN stage IN ('teklif reddedildi', 'işe alındı') THEN 1 ELSE 0 END) AS sonuclanan,
  ROUND(100.0 * SUM(CASE WHEN stage = 'işe alındı' THEN 1 ELSE 0 END)
        / SUM(CASE WHEN stage IN ('teklif', 'teklif reddedildi', 'işe alındı') THEN 1 ELSE 0 END), 1) AS tum_teklif_kabul,
  ROUND(100.0 * SUM(CASE WHEN stage = 'işe alındı' THEN 1 ELSE 0 END)
        / SUM(CASE WHEN stage IN ('teklif reddedildi', 'işe alındı') THEN 1 ELSE 0 END), 1) AS sonuclanan_kabul
FROM ik_candidates;`)}
<p>Tüm tekliflere göre kabul %22,8, yalnızca sonuçlanan tekliflere göre %54,8. İkisi de “doğru” olabilir ama farklı sorulara cevap verir. Sonuçlanan teklif oranı “teklif verdiğimizde aday ne der?” sorusunu cevaplar. Tüm teklif oranı ise süreçteki kaybı da içerir. Raporda hangisini kullandığını yaz.</p>
<h3>Time to fill'de üç hata</h3>
<ul>
<li><b>Açık talepleri unutmak:</b> Yalnızca kapanmış talepleri ölçersen en uzun bekleyenler hesaba girmez ve süre olduğundan kısa görünür. Açık taleplerin yaşını ayrıca raporla.</li>
<li><b>İptalleri karıştırmak:</b> İptal edilen bir talebin “kapanış” tarihi doldurma süresi değildir. <code>status = 'dolduruldu'</code> filtresi şarttır.</li>
<li><b>Ortalama yerine medyan:</b> Birkaç zor pozisyon ortalamayı yukarı çeker. Bölüm karşılaştırmasında ortalama kullanıyorsan medyanı da göster.</li>
</ul>
<p>Bölüm farkları çoğu zaman beklenen yerde çıkar. Doldurulan taleplerde ortalama süre Veri ve Analitik'te yaklaşık 52 gün, Kurumsal Satış'ta 34 gün. Teknik roller için daha erken ilan açmak, bu tür bir bulgudan çıkan somut aksiyondur.</p>
`));
X('ik-alim', [
  sq('Bölüme göre doldurma süresi: doldurulan taleplerin sayısı ve ortalama doldurma süresi (gün, 1 basamak): <code>name</code>, <code>talep</code>, <code>ort_gun</code>. Süreye göre azalan, eşitlikte ad.',
    "SELECT d.name, COUNT(*) AS talep, ROUND(AVG(julianday(r.closed_date) - julianday(r.opened_date)), 1) AS ort_gun FROM ik_requisitions r JOIN ik_positions p ON p.position_id = r.position_id JOIN ik_departments d ON d.dept_id = p.dept_id WHERE r.status = 'dolduruldu' GROUP BY d.dept_id, d.name ORDER BY ort_gun DESC, d.name;",
    O),
  sq('Kaynak karnesi: her aday kaynağı için işe alınan sayısı, işe alınanlarda başvurudan işe alıma geçen ortalama gün (<code>applied_date</code> → <code>stage_date</code>, 1 basamak) ve <b>sonuçlanan</b> tekliflerde kabul oranı (işe alındı ÷ (işe alındı + teklif reddedildi), yüzde, 1 basamak): <code>source</code>, <code>ise_alim</code>, <code>ort_gun</code>, <code>kabul</code>. Kabule göre azalan, eşitlikte kaynak.',
    "SELECT source, SUM(CASE WHEN stage = 'işe alındı' THEN 1 ELSE 0 END) AS ise_alim, ROUND(AVG(CASE WHEN stage = 'işe alındı' THEN julianday(stage_date) - julianday(applied_date) END), 1) AS ort_gun, ROUND(100.0 * SUM(CASE WHEN stage = 'işe alındı' THEN 1 ELSE 0 END) / SUM(CASE WHEN stage IN ('işe alındı', 'teklif reddedildi') THEN 1 ELSE 0 END), 1) AS kabul FROM ik_candidates GROUP BY source ORDER BY kabul DESC, source;",
    { ord: true, hint: 'AVG(CASE WHEN ... THEN gün END): koşulu sağlamayan satırlar NULL olur ve ortalamaya girmez.' })
]);

more('ik-devamsizlik', D('Bradford faktörünü yorumlamak ve kayıp zaman oranı', `
<p>Bradford faktörü <b>B = S² × D</b> formülüyle sıklığı (S) kareleyerek cezalandırır. Toplam gün sayısı aynı olan iki çalışan, izinlerini kaç parçada kullandıklarına göre çok farklı puan alır. 2024'te toplam 8 gün hastalık izni kullanan çalışanlara bakalım:</p>
${C(`WITH h AS (
  SELECT emp_id, COUNT(*) AS s, SUM(days) AS d
  FROM ik_leaves
  WHERE leave_type = 'hastalık'
    AND start_date >= '2024-01-01' AND start_date < '2025-01-01'
  GROUP BY emp_id
)
SELECT s AS izin_sayisi, COUNT(*) AS kisi, MIN(s * s * d) AS bradford
FROM h
WHERE d = 8
GROUP BY s
ORDER BY s;`)}
<p>Aynı 8 gün, 2 parçada kullanıldığında B = 32, 6 parçada kullanıldığında B = 288 olur. İşin akışı açısından mantıklıdır: habersiz tek günlük yokluklar planlamayı uzun bir rapordan çok daha fazla bozar.</p>
<h3>Eşikler bir politika kararıdır</h3>
<p>Şirketler genellikle bantlar tanımlar (ör. 0–49 izleme yok, 50–199 sözlü görüşme, 200–499 yazılı görüşme, 500+ İK ile görüşme). Bu sayılar evrensel değildir. Analistin görevi her bantta kaç kişinin olduğunu göstermektir; eşiği yönetim belirler. Pusula İK'da 2024'te hastalık izni olan 1.234 çalışanın 11'i 500'ün üzerindedir.</p>
<h3>Kayıp zaman oranı</h3>
<p>Bölümleri karşılaştırmak için kişi sayısından bağımsız bir oran gerekir: <b>kayıp zaman oranı = devamsızlık günü ÷ (çalışan × planlanan iş günü)</b>. Yıllık yaklaşık 250 iş günü varsayımıyla Çağrı Merkezi'nde bu oran %1,8'dir, Finans'ta %0,6. Fark tek başına bir yargı değildir: vardiyalı ve müşteriyle yüz yüze işlerde hastalık izni tüm sektörlerde daha yüksektir.</p>
<table>
<tr><th>Hata</th><th>Sonuç</th><th>Doğrusu</th></tr>
<tr><td>Paydada yalnızca izin kullananlar</td><td>Ortalama şişer</td><td>LEFT JOIN, izinsiz çalışan 0 sayılır</td></tr>
<tr><td>Yıl içinde gelen ve ayrılanlar tam yıl sayılır</td><td>Oran düşük çıkar</td><td>Yıl boyunca çalışanları al ya da çalışılan günle ağırlıklandır</td></tr>
<tr><td>Takvim günü ile iş günü karışır</td><td>Hafta sonuna denk gelen izinler sorun olur</td><td>Tanımı yaz (bu veride <code>days</code> iş günüdür)</td></tr>
<tr><td>Bradford'u otomatik yaptırım için kullanmak</td><td>Kronik hastalık ve engellilik durumlarında haksızlık</td><td>Konuşma başlatmak için kullan</td></tr>
</table>
<div class="note"><b>Haftanın günü</b>SQLite'ta <code>strftime('%w', start_date)</code> haftanın gününü verir (1 = Pazartesi). Bu veride hastalık izinlerinin yaklaşık 2.200'ü Pazartesi başlıyor; diğer günlerin her biri 1.130–1.210 arasında. Diğer programlarda bu hesap farklı fonksiyonlarla yapılır (SQL Server <code>DATEPART(weekday, …)</code>, PostgreSQL <code>EXTRACT(DOW FROM …)</code>).</div>
`));
X('ik-devamsizlik', [
  sq('Bradford bantları: 2024\'te hastalık izni olan çalışanları Bradford puanına göre bantlara ayır: <b>1: 0-49</b>, <b>2: 50-199</b>, <b>3: 200-499</b>, <b>4: 500+</b>. Her bantta kaç kişi var: <code>bant</code>, <code>kisi</code>. Banda göre sırala.',
    "WITH b AS (SELECT emp_id, COUNT(*) * COUNT(*) * SUM(days) AS bf FROM ik_leaves WHERE leave_type = 'hastalık' AND start_date >= '2024-01-01' AND start_date < '2025-01-01' GROUP BY emp_id) SELECT CASE WHEN bf < 50 THEN '1: 0-49' WHEN bf < 200 THEN '2: 50-199' WHEN bf < 500 THEN '3: 200-499' ELSE '4: 500+' END AS bant, COUNT(*) AS kisi FROM b GROUP BY CASE WHEN bf < 50 THEN '1: 0-49' WHEN bf < 200 THEN '2: 50-199' WHEN bf < 500 THEN '3: 200-499' ELSE '4: 500+' END ORDER BY bant;",
    O),
  sq('Kayıp zaman oranı: 2024 boyunca çalışmış kişiler (2024 öncesi giren, hâlâ aktif) için bölüme göre kişi sayısı, 2024 hastalık günü toplamı (izni olmayan 0) ve kayıp zaman oranı = gün ÷ (kişi × 250) × 100 (2 basamak); en az 10 kişilik bölümler: <code>name</code>, <code>kisi</code>, <code>gun</code>, <code>kayip_oran</code>. Orana göre azalan, eşitlikte ad.',
    `SELECT d.name, COUNT(*) AS kisi, COALESCE(SUM(h.g), 0) AS gun, ROUND(100.0 * COALESCE(SUM(h.g), 0) / (COUNT(*) * 250), 2) AS kayip_oran FROM ik_employees e ${DEPT} LEFT JOIN (SELECT emp_id, SUM(days) AS g FROM ik_leaves WHERE leave_type = 'hastalık' AND start_date >= '2024-01-01' AND start_date < '2025-01-01' GROUP BY emp_id) h ON h.emp_id = e.emp_id WHERE e.hire_date < '2024-01-01' AND e.term_date IS NULL GROUP BY d.dept_id, d.name HAVING COUNT(*) >= 10 ORDER BY kayip_oran DESC, d.name;`,
    { ord: true, hint: 'İzinleri önce çalışan başına özetle, sonra çalışanlara LEFT JOIN yap; aksi halde izin satırları çalışanları çoğaltır.' })
]);

more('ik-baglilik', D('eNPS hesabının ince noktaları ve yanıt oranı', `
<p>eNPS basit görünür ama iki küçük karar sonucu tamamen değiştirebilir: <b>eşikler</b> ve <b>payda</b>.</p>
<ul>
<li><b>Eşik:</b> Eleştirmen 0–6'dır, yani <code>enps &lt;= 6</code>. Yanlışlıkla <code>&lt; 6</code> yazarsan 6 verenler pasif sayılır. 6, 7 ve 8'den sonra en sık verilen puan olduğu için eNPS yapay olarak yükselir.</li>
<li><b>Payda:</b> Yalnızca bu soruyu yanıtlayanlar, yani <code>COUNT(enps)</code>. <code>COUNT(*)</code> soruyu boş bırakanları da paydaya katar ve eNPS'i sıfıra doğru çeker.</li>
</ul>
${C(`SELECT wave,
       COUNT(*) AS anket_satiri,
       COUNT(enps) AS yanit,
       ROUND(100.0 * (SUM(CASE WHEN enps >= 9 THEN 1 ELSE 0 END)
                    - SUM(CASE WHEN enps <= 6 THEN 1 ELSE 0 END)) / COUNT(enps), 1) AS dogru,
       ROUND(100.0 * (SUM(CASE WHEN enps >= 9 THEN 1 ELSE 0 END)
                    - SUM(CASE WHEN enps < 6 THEN 1 ELSE 0 END)) / COUNT(enps), 1) AS esik_hatasi,
       ROUND(100.0 * (SUM(CASE WHEN enps >= 9 THEN 1 ELSE 0 END)
                    - SUM(CASE WHEN enps <= 6 THEN 1 ELSE 0 END)) / COUNT(*), 1) AS payda_hatasi
FROM ik_survey
GROUP BY wave
ORDER BY wave;`)}
<p>2024-Q4'te doğru eNPS −2,8'dir. Eşik hatası aynı veriden +13,5 üretir: “negatiften iyi bir skora” geçmiş gibi görünür. Payda hatası burada küçük kalıyor (−2,7), çünkü boş bırakılan cevap az. Boş cevap oranı yükseldikçe fark büyür.</p>
<h3>Yanıt oranı neden önemli?</h3>
<p>2024-Q4'te anket tarihinde aktif olanların %79,4'ü katılmış. Bu iyi bir orandır, ama ortalama bölüm farklarını gizler. Katılmayanlar rastgele değildir: memnuniyetsiz ya da ayrılmayı düşünen çalışanlar ankete daha az katılma eğilimindedir. Bu yüzden düşük katılımlı bir ekibin skoru genellikle <b>olduğundan iyi</b> görünür.</p>
<table>
<tr><th>Kural</th><th>Neden</th></tr>
<tr><td>En az 10 yanıtı olmayan grup raporlanmaz</td><td>Anonimlik; küçük grupta kişiler tanınır</td></tr>
<tr><td>Katılım oranını skorla birlikte göster</td><td>%40 katılımla gelen +20, %90 katılımla gelen +5'ten daha az güvenilirdir</td></tr>
<tr><td>Payda: anket tarihinde aktif olanlar</td><td>Bugün aktif olanları saymak, sonradan gelenleri ve ayrılanları karıştırır</td></tr>
<tr><td>Dalgaları aynı kişilerle de karşılaştır</td><td>Değişim, kompozisyon değişiminden mi yoksa gerçek değişimden mi geliyor?</td></tr>
</table>
<p>Bölüm düzeyinde bakınca 2024-Q4'te Veri ve Analitik'in eNPS'i −46,2. Diğer bölümler −8 ile +7 arasında. Bu ekibin katılım oranı da en yüksek olanlardandır (%84,8). Yani kötü skor düşük katılımdan kaynaklanmıyor; sorun gerçek.</p>
`));
X('ik-baglilik', [
  sq('Bölüme göre 2024-Q4 katılım oranı: anket tarihinde (15.11.2024) aktif olanlar (işe giriş ≤ 15.11.2024 ve ayrılmamış ya da daha sonra ayrılmış) ve bunlardan bu dalgada anket satırı olanlar; en az 10 aktif kişisi olan bölümler: <code>name</code>, <code>aktif</code>, <code>yanit</code>, <code>katilim</code> (yüzde, 1 basamak). Katılıma göre artan, eşitlikte ad.',
    `SELECT d.name, COUNT(*) AS aktif, COUNT(s.emp_id) AS yanit, ROUND(100.0 * COUNT(s.emp_id) / COUNT(*), 1) AS katilim FROM ik_employees e ${DEPT} LEFT JOIN ik_survey s ON s.emp_id = e.emp_id AND s.wave = '2024-Q4' WHERE e.hire_date <= '2024-11-15' AND (e.term_date IS NULL OR e.term_date > '2024-11-15') GROUP BY d.dept_id, d.name HAVING COUNT(*) >= 10 ORDER BY katilim, d.name;`,
    { ord: true, hint: 'Dalga koşulunu LEFT JOIN\'in ON kısmına yaz; WHERE\'e yazarsan katılmayanlar kaybolur.' }),
  sq('Bölüme göre 2024-Q4 eNPS (payda: soruyu yanıtlayanlar; 1 basamak); anonimlik için en az 10 yanıtı olan bölümler: <code>name</code>, <code>yanit</code>, <code>enps</code>. eNPS\'e göre artan, eşitlikte ad.',
    `SELECT d.name, COUNT(s.enps) AS yanit, ROUND(100.0 * (SUM(CASE WHEN s.enps >= 9 THEN 1 ELSE 0 END) - SUM(CASE WHEN s.enps <= 6 THEN 1 ELSE 0 END)) / COUNT(s.enps), 1) AS enps FROM ik_survey s JOIN ik_employees e ON e.emp_id = s.emp_id ${DEPT} WHERE s.wave = '2024-Q4' GROUP BY d.dept_id, d.name HAVING COUNT(s.enps) >= 10 ORDER BY enps, d.name;`,
    { ord: true, hint: 'Eleştirmen 0–6 (<= 6), destekçi 9–10. HAVING COUNT(s.enps) >= 10.' })
]);

more('ik-proje', D('Bulguyu sınamak: önce–sonra, karşılaştırma grubu ve alternatif açıklamalar', `
<p>Bir vakada en tehlikeli an, ilk güçlü işareti bulduğun andır. “Yeni müdür geldi, ayrılmalar arttı” cümlesi doğru olabilir, ama bunu sınamak için üç soruya cevap gerekir.</p>
<h3>1. Olay öncesi ve sonrası, aynı uzunlukta pencerelerle</h3>
<p>Veri ve Analitik'in yeni müdürü Rıza Karabulut 3 Temmuz 2023'te işe başladı. Bu tarihten önceki ve sonraki 12 ayda ayrılan sayısını, aynı dönemdeki diğer teknoloji bölümleriyle yan yana koyalım:</p>
${C(`SELECT d.name,
       SUM(CASE WHEN e.term_date >= '2022-07-03' AND e.term_date < '2023-07-03' THEN 1 ELSE 0 END) AS onceki_12_ay,
       SUM(CASE WHEN e.term_date >= '2023-07-03' AND e.term_date < '2024-07-03' THEN 1 ELSE 0 END) AS sonraki_12_ay
FROM ik_employees e
JOIN ik_positions p ON p.position_id = e.position_id
JOIN ik_departments d ON d.dept_id = p.dept_id
WHERE d.function_area = 'Teknoloji'
GROUP BY d.dept_id, d.name
ORDER BY d.name;`)}
<p>Veri ve Analitik'te 5'ten 19'a çıkış var. Aynı piyasada çalışan Yazılım Geliştirme 15'ten 18'e, BT Altyapı 6'dan 4'e gitmiş. “Piyasa hareketli” açıklaması doğru olsaydı karşılaştırma gruplarında da benzer bir sıçrama görürdük. Bu mantık, nedensellik analizindeki <b>fark-içinde-fark</b> yaklaşımının sezgisel halidir.</p>
<h3>2. Alternatif açıklamaları ele</h3>
<table>
<tr><th>Alternatif açıklama</th><th>Hangi sorgu sınar?</th></tr>
<tr><td>Piyasa / rakip teklifleri</td><td>Karşılaştırma bölümlerinde devir ve “rakip firma” nedeni</td></tr>
<tr><td>Ücret</td><td>Ayrılanların bant içindeki konumu (compa-ratio = maaş ÷ bant ortası)</td></tr>
<tr><td>Büyüme kaynaklı devir</td><td>Ayrılanların kıdemi: yeni işe alınanlar mı gidiyor?</td></tr>
<tr><td>Yönetici</td><td>Anketteki yönetici puanı, “yönetici” ayrılma nedeni</td></tr>
</table>
<p>Ücret açıklaması ilginç bir sonuç verir. Üç teknoloji bölümünde de ayrılanların compa-ratio'su kalanlardan düşüktür. Yani düşük ücret <b>genel</b> bir risk faktörüdür, ama Veri ekibine özgü sıçramayı tek başına açıklamaz. İyi bir analiz, bulguyu destekleyen kanıtla birlikte desteklemeyen kanıtı da gösterir.</p>
<h3>3. Küçük sayılar</h3>
<p>19 kişi büyük bir rakam gibi görünür, ama 100 kişilik bir ekipte tek tek ayrılmalar yüzdeleri hızla oynatır. Çeyreklik yüzdeler yerine sayıları göster. Yüzde verirken paydayı da yaz (“114 kişiden 19'u”).</p>
<div class="tip"><b>Bir sayfalık rapor iskeleti</b>Bulgu (tek cümle, sayıyla) → kanıt (2–3 tablo, karşılaştırma grubuyla) → elenen alternatifler → belirsizlik (küçük sayı, eksik veri) → öneri (somut, sahibi belli).</div>
`));
X('ik-proje', [
  sq('Adım 6: ücret konumu. Teknoloji bölümlerinde aktif çalışanlar (“kalan”) ile 2024\'te gönüllü ayrılanların (“ayrılan”) güncel maaşının bant ortasına oranı (compa-ratio = maaş ÷ ((band_min + band_max) / 2), ortalama, 2 basamak). Güncel maaş = en son <code>effective_date</code>: <code>name</code>, <code>durum</code>, <code>kisi</code>, <code>compa</code>. Bölüm adına, sonra duruma göre sırala.',
    `WITH c AS (SELECT s.emp_id, s.monthly_gross FROM ik_salaries s WHERE s.effective_date = (SELECT MAX(x.effective_date) FROM ik_salaries x WHERE x.emp_id = s.emp_id)) SELECT d.name, CASE WHEN e.term_date IS NULL THEN 'kalan' ELSE 'ayrılan' END AS durum, COUNT(*) AS kisi, ROUND(AVG(c.monthly_gross / ((p.band_min + p.band_max) / 2)), 2) AS compa FROM ik_employees e JOIN c ON c.emp_id = e.emp_id ${DEPT} WHERE d.function_area = 'Teknoloji' AND (e.term_date IS NULL OR (e.term_type = 'gönüllü' AND e.term_date >= '2024-01-01')) GROUP BY d.dept_id, d.name, CASE WHEN e.term_date IS NULL THEN 'kalan' ELSE 'ayrılan' END ORDER BY d.name, durum;`,
    { ord: true, hint: 'Güncel maaşı ilişkili alt sorgulu bir CTE ile bul; durum sütununu CASE ile üret ve GROUP BY\'a da yaz.' }),
  sq('Adım 7: kimi kaybettik? Teknoloji bölümlerinde 2024\'te gönüllü ayrılanların sayısı, bunlardan ayrılmadan önceki son değerlendirmesinde 4–5 almış olanlar ve oranı (yüzde, 1 basamak): <code>name</code>, <code>gonullu</code>, <code>istenmeyen</code>, <code>oran</code>. Bölüm adına göre sırala.',
    `WITH a AS (SELECT e.emp_id, p.dept_id, (SELECT r.rating FROM ik_reviews r WHERE r.emp_id = e.emp_id ORDER BY r.review_year DESC LIMIT 1) AS son FROM ik_employees e JOIN ik_positions p ON p.position_id = e.position_id WHERE e.term_type = 'gönüllü' AND e.term_date >= '2024-01-01') SELECT d.name, COUNT(*) AS gonullu, SUM(CASE WHEN a.son >= 4 THEN 1 ELSE 0 END) AS istenmeyen, ROUND(100.0 * SUM(CASE WHEN a.son >= 4 THEN 1 ELSE 0 END) / COUNT(*), 1) AS oran FROM a JOIN ik_departments d ON d.dept_id = a.dept_id WHERE d.function_area = 'Teknoloji' GROUP BY d.dept_id, d.name ORDER BY d.name;`,
    { ord: true, hint: 'Son puan için ilişkili alt sorgu: ORDER BY review_year DESC LIMIT 1.' })
]);

/* =====================================================================
   BÜYÜK VERİYLE ÇALIŞMAK (Pedal İzmir)
   ===================================================================== */

more('bv-istasyon', D('Yeniden dağıtım ve istasyon doluluk baskısı', `
<p>Paylaşımlı bisiklet sistemlerinin en pahalı operasyonel kalemi <b>yeniden dağıtım</b>dır (rebalancing). Kamyonetler dolu istasyonlardan bisiklet alıp boş istasyonlara taşır. Kullanıcı için iki kötü an vardır: istasyonda bisiklet bulamamak ve bisikleti bırakacak yer bulamamak. İkisi de gelir kaybı ve şikâyet demektir.</p>
<h3>Ham net akış yetmez: kapasiteye böl</h3>
<p>Üç ayda −700 net akış, 30 yuvalı bir istasyon için yönetilebilir olabilir, 15 yuvalı bir istasyon için ise her gün boşalmak demektir. Karşılaştırılabilir ölçü <b>doluluk baskısı</b>dır: <b>günlük ortalama net akış ÷ kapasite</b>. Alsancak Çarşı (15 yuva) günde ortalama 7,7 bisiklet kaybediyor; baskısı −0,51. Yani her gün kapasitesinin yarısı kadar bisiklet getirilmesi gerekiyor.</p>
<h3>Günün saatine göre akış</h3>
<p>Toplam net akış, gün içindeki dalgalanmayı gizler. Konut bölgesindeki bir istasyon sabah boşalır, akşam dolar. Merkezdeki bir istasyonda tersi olur. Aşağıdaki sorgu iki istasyonun çıkış ve girişlerini <code>UNION ALL</code> ile tek bir akış listesine çevirir. Bu yöntem 116.500 satırlık tabloyu yalnızca iki kez tarar ve <code>OR</code> içeren birleştirmelerden çok daha hızlıdır:</p>
${C(`WITH akis AS (
  SELECT start_station AS st, CAST(strftime('%H', started_at) AS INTEGER) AS saat, -1 AS d
  FROM bk_trips WHERE start_station IN (12, 51)
  UNION ALL
  SELECT end_station, CAST(strftime('%H', started_at) AS INTEGER), 1
  FROM bk_trips WHERE end_station IN (12, 51)
),
h AS (
  SELECT st,
         CASE WHEN saat BETWEEN 7 AND 9 THEN '1 sabah 07-10'
              WHEN saat BETWEEN 16 AND 19 THEN '3 akşam 16-20'
              ELSE '2 diğer' END AS dilim,
         SUM(d) AS net
  FROM akis
  GROUP BY st, CASE WHEN saat BETWEEN 7 AND 9 THEN '1 sabah 07-10'
                    WHEN saat BETWEEN 16 AND 19 THEN '3 akşam 16-20'
                    ELSE '2 diğer' END
)
SELECT s.name, h.dilim, h.net, ROUND(h.net / 92.0, 1) AS gunluk
FROM h JOIN bk_stations s ON s.station_id = h.st
ORDER BY s.name, h.dilim;`)}
<p>Göztepe Park sabah 07–10 arasında üç ayda 237 bisiklet kaybediyor (günde ~2,6), akşam ise az da olsa kazanıyor. Konut bölgesinden işe gidiş örüntüsü budur. Alsancak Çarşı'nın en büyük kaybı ise akşam 16–20 arasında (−342). Kamyonetin <b>ne zaman</b> nereye gideceğini bu tablo belirler: Göztepe'ye sabahtan önce, Alsancak'a öğleden sonra.</p>
<table>
<tr><th>Ölçü</th><th>Soru</th><th>Dikkat</th></tr>
<tr><td>Net akış</td><td>İstasyon boşalıyor mu?</td><td>Kapanmamış yolculukların bitişi yok (<code>end_station IS NULL</code>)</td></tr>
<tr><td>Doluluk baskısı</td><td>Ne kadar acil?</td><td>Payda: kapasite × gün sayısı (92)</td></tr>
<tr><td>Saatlik akış</td><td>Ne zaman müdahale?</td><td>Yolculuğun başlangıç saati, varış saatinden farklı olabilir</td></tr>
</table>
<div class="note"><b>Basitleştirme</b>Buradaki akış hesabı başlangıçta istasyonda kaç bisiklet olduğunu ve gece yapılan taşımaları bilmez; yalnızca kullanıcı hareketini ölçer. Gerçek sistemlerde istasyonların dakikalık doluluk kayıtları (dock status) ayrıca tutulur.</div>
`));
X('bv-istasyon', [
  sq('Doluluk baskısı: her istasyon için üç aylık (92 gün) net akışın günlük ortalaması (1 basamak) ve bunun kapasiteye oranı (2 basamak); en negatif 5 istasyon: <code>name</code>, <code>capacity</code>, <code>gunluk_net</code>, <code>baski</code>. Baskıya göre artan, eşitlikte ad. (Sorguyu <2 sn\'de tut: çıkış ve girişleri ayrı CTE\'lerde say.)',
    'WITH c AS (SELECT start_station AS st, COUNT(*) AS n FROM bk_trips GROUP BY start_station), g AS (SELECT end_station AS st, COUNT(*) AS n FROM bk_trips WHERE end_station IS NOT NULL GROUP BY end_station) SELECT s.name, s.capacity, ROUND((COALESCE(g.n, 0) - COALESCE(c.n, 0)) / 92.0, 1) AS gunluk_net, ROUND((COALESCE(g.n, 0) - COALESCE(c.n, 0)) / 92.0 / s.capacity, 2) AS baski FROM bk_stations s LEFT JOIN c ON c.st = s.station_id LEFT JOIN g ON g.st = s.station_id ORDER BY baski, s.name LIMIT 5;',
    { ord: true, hint: 'Net akışı derste olduğu gibi iki CTE ile hesapla; sonra 92\'ye ve kapasiteye böl.' }),
  sq('Sabah zirvesi: 07:00–09:59 arasında başlayan yolculuklarda net akışı (gelen − giden) en negatif 5 istasyon: <code>name</code>, <code>net</code>. Net akışa göre artan, eşitlikte ad.',
    "WITH c AS (SELECT start_station AS st, COUNT(*) AS n FROM bk_trips WHERE CAST(strftime('%H', started_at) AS INTEGER) BETWEEN 7 AND 9 GROUP BY start_station), g AS (SELECT end_station AS st, COUNT(*) AS n FROM bk_trips WHERE end_station IS NOT NULL AND CAST(strftime('%H', started_at) AS INTEGER) BETWEEN 7 AND 9 GROUP BY end_station) SELECT s.name, COALESCE(g.n, 0) - COALESCE(c.n, 0) AS net FROM bk_stations s LEFT JOIN c ON c.st = s.station_id LEFT JOIN g ON g.st = s.station_id ORDER BY net, s.name LIMIT 5;",
    { ord: true, hint: 'Her iki CTE\'ye de aynı saat filtresini ekle: CAST(strftime(\'%H\', started_at) AS INTEGER) BETWEEN 7 AND 9.' })
]);

more('bv-gelir', D('Ücret modeli davranışı değiştiriyor mu?', `
<p>Fiyatlandırma yalnızca geliri değil davranışı da şekillendirmek için tasarlanır. Pedal İzmir'in modelinde iki teşvik var:</p>
<ul>
<li><b>Abonelik</b> ilk 30 dakikayı ücretsiz yapar. Amaç kısa, sık ve düzenli kullanımı (işe gidiş, son kilometre) teşvik etmektir.</li>
<li><b>Tek seferlik</b> kullanımda açılış ücreti (10 TL) kısa yolculuğu görece pahalı kılar ve kullanıcıyı aboneliğe yönlendirir.</li>
</ul>
<p>Bu tasarımın iki öngörüsü veriyle sınanabilir: (1) aboneler 30. dakikanın hemen altında yığılmalı, (2) abonelerin yolculukları tek seferliklerden kısa olmalı.</p>
${C(`WITH t AS (
  SELECT user_id, ROUND((julianday(ended_at) - julianday(started_at)) * 1440) AS dk
  FROM bk_trips
  WHERE ended_at IS NOT NULL
    AND ROUND((julianday(ended_at) - julianday(started_at)) * 1440) BETWEEN 20 AND 40
)
SELECT CASE WHEN t.dk < 25 THEN '20-24' WHEN t.dk < 30 THEN '25-29'
            WHEN t.dk < 35 THEN '30-34' ELSE '35-40' END AS dakika,
       SUM(CASE WHEN u.user_type = 'abone' THEN 1 ELSE 0 END) AS abone,
       SUM(CASE WHEN u.user_type = 'tek seferlik' THEN 1 ELSE 0 END) AS tek_seferlik
FROM t JOIN bk_users u ON u.user_id = t.user_id
GROUP BY CASE WHEN t.dk < 25 THEN '20-24' WHEN t.dk < 30 THEN '25-29'
              WHEN t.dk < 35 THEN '30-34' ELSE '35-40' END
ORDER BY dakika;`)}
<p>Sonuç beklentiyi doğrulamıyor. Abonelerde 25–29 dakika aralığında 3.412, 30–34 aralığında 3.483 yolculuk var: sınırın altında yığılma yok. Ortalama süre de iki grupta neredeyse aynı (abone 29,2, tek seferlik 29,4 dakika). Bu veride ücret modeli süre davranışını değiştirmiyor. Bu da bir bulgudur: ya kullanıcılar ücret kuralını bilmiyor ya da 30 dakikayı aşan ücret onları caydıracak kadar yüksek değil. Uygulamada kalan süreyi gösteren bir sayaç, fiyat değişikliğinden önce denenebilecek ucuz bir müdahaledir.</p>
<h3>“Ya şöyle olsaydı?” analizi</h3>
<p>Fiyat kararlarında en sık istenen sorgu senaryo hesabıdır: mevcut yolculukları <b>başka bir tarifeyle</b> yeniden fiyatlamak. Örneğin bütün tek seferlik kullanıcılar abone olsaydı, onların yolculuklarından gelen gelir ne kadar düşerdi? Bu hesabı yaparken davranışın değişmeyeceğini varsaydığını unutma. Abone olan kullanıcı daha sık bisiklete biner.</p>
<table>
<tr><th>Hata</th><th>Sonuç</th><th>Doğrusu</th></tr>
<tr><td>Kapanmamış yolculukları ücretsiz saymak</td><td>Ücretsiz oranı şişer</td><td><code>fare</code> NULL'dır; <code>COUNT(fare)</code> paydası</td></tr>
<tr><td>116 bin satırı önce birleştirip sonra özetlemek</td><td>Yavaş sorgu</td><td>Önce kullanıcı başına özetle, sonra 6 bin kullanıcıyla birleştir</td></tr>
<tr><td>Gelir payını yolculuk payıyla karıştırmak</td><td>“Aboneler kârsız” yanılgısı</td><td>İkisini yan yana göster; abonelik ücreti bu tabloda yok</td></tr>
</table>
`));
X('bv-gelir', [
  sq('Yolculuk payı ve gelir payı: kullanıcı türüne göre yolculukların ve yolculuk gelirinin toplam içindeki payı (yüzde, 1 basamak): <code>user_type</code>, <code>yolculuk_pay</code>, <code>gelir_pay</code>. Hız için önce yolculukları kullanıcı başına özetle, sonra kullanıcılarla birleştir.',
    'WITH k AS (SELECT user_id, COUNT(*) AS n, SUM(fare) AS gelir FROM bk_trips GROUP BY user_id), g AS (SELECT u.user_type, SUM(k.n) AS n, SUM(k.gelir) AS gelir FROM k JOIN bk_users u ON u.user_id = k.user_id GROUP BY u.user_type) SELECT user_type, ROUND(100.0 * n / SUM(n) OVER (), 1) AS yolculuk_pay, ROUND(100.0 * gelir / SUM(gelir) OVER (), 1) AS gelir_pay FROM g;',
    { hint: 'Üç adım: kullanıcı başına (n, gelir) → türe göre toplam → SUM(...) OVER () ile pay.' }),
  sq('Senaryo: tek seferlik kullanıcıların kapanmış yolculukları abone tarifesiyle (ilk 30 dakika = 1800 sn ücretsiz, sonrası dakikası 2 TL; süre saniye cinsinden yuvarlanmış) fiyatlansaydı gelir ne olurdu? Yolculuk sayısı, gerçek gelir ve senaryo geliri (tam sayı): <code>yolculuk</code>, <code>gercek</code>, <code>abone_tarifesi</code>.',
    "WITH s AS (SELECT t.fare, ROUND((julianday(t.ended_at) - julianday(t.started_at)) * 86400) AS sn FROM bk_trips t JOIN bk_users u ON u.user_id = t.user_id WHERE u.user_type = 'tek seferlik' AND t.ended_at IS NOT NULL) SELECT COUNT(*) AS yolculuk, ROUND(SUM(fare)) AS gercek, ROUND(SUM(CASE WHEN sn > 1800 THEN (sn - 1800) / 60.0 * 2 ELSE 0 END)) AS abone_tarifesi FROM s;",
    { hint: 'Saniye: ROUND((julianday(ended_at) - julianday(started_at)) * 86400). Senaryo ücreti: CASE WHEN sn > 1800 THEN (sn - 1800) / 60.0 * 2 ELSE 0 END.' })
]);

/* =====================================================================
   KANAT HAVAYOLLARI
   ===================================================================== */

more('hv-ozet', D('Operasyon karnesi: iptal oranı ve zamanında kalkış', `
<p>Bir havayolunun günlük operasyon raporunda iki oran mutlaka bulunur: <b>iptal oranı</b> (iptal ÷ planlanan uçuş) ve <b>zamanında kalkış oranı</b> (OTP, on-time performance). Sektörde yaygın tanım, planlanandan en fazla <b>15 dakika</b> geç kalkan uçuşu zamanında saymaktır. Varış için de aynı eşik kullanılır.</p>
<h3>Payda kimdir?</h3>
<p>İptal edilen uçuş hiç kalkmadığı için “zamanında mı?” sorusu ona sorulamaz. OTP'nin paydası <b>kalkan uçuşlardır</b>, yani <code>COUNT(actual_dep)</code>. <code>COUNT(*)</code> kullanırsan iptaller “geç kalkmış” gibi sayılır ve oran düşer:</p>
${C(`SELECT COUNT(*) AS planlanan,
       COUNT(actual_dep) AS kalkan,
       SUM(CASE WHEN ROUND((julianday(actual_dep) - julianday(sched_dep)) * 1440) <= 15 THEN 1 ELSE 0 END) AS zamaninda,
       ROUND(100.0 * SUM(CASE WHEN ROUND((julianday(actual_dep) - julianday(sched_dep)) * 1440) <= 15 THEN 1 ELSE 0 END)
             / COUNT(actual_dep), 1) AS otp,
       ROUND(100.0 * SUM(CASE WHEN ROUND((julianday(actual_dep) - julianday(sched_dep)) * 1440) <= 15 THEN 1 ELSE 0 END)
             / COUNT(*), 1) AS yanlis_payda
FROM hv_flights;`)}
<p>Doğru OTP %62,1, yanlış paydayla %60,9. Fark küçük görünür ama iptal oranının yükseldiği bir ayda büyür. Daha önemlisi, iptal ve gecikme iki ayrı sorundur ve ayrı raporlanmalıdır. NULL bir <code>actual_dep</code> karşılaştırmada ne doğru ne yanlış (UNKNOWN) sonuç verir; <code>CASE</code> bu yüzden onu 0 sayar ve pay doğru kalır.</p>
<h3>Ortalama gecikme yanıltır</h3>
<p>Gecikme dağılımı çok çarpıktır: uçuşların çoğu zamanında, birkaçı saatlerce geç kalkar. “Ortalama gecikme 25 dakika” cümlesi, yolcuların çoğunun 25 dakika beklediği izlenimini verir; oysa böyle değildir. Yönetim raporunda <b>oran</b> (OTP), <b>uzun gecikme sayısı</b> (ör. 60+ dk) ve gerekirse medyan birlikte verilir.</p>
<table>
<tr><th>Metrik</th><th>Pay</th><th>Payda</th></tr>
<tr><td>İptal oranı</td><td><code>status = 'cancelled'</code></td><td>Tüm planlanan uçuşlar</td></tr>
<tr><td>Zamanında kalkış</td><td>Kalkış gecikmesi ≤ 15 dk</td><td>Kalkan uçuşlar (<code>actual_dep</code> dolu)</td></tr>
<tr><td>Zamanında varış</td><td>Varış gecikmesi ≤ 15 dk</td><td>İnen uçuşlar (<code>actual_arr</code> dolu; diverted hariç)</td></tr>
<tr><td>Uçuş başına yolcu</td><td><code>SUM(pax)</code></td><td>İptal edilmeyen uçuşlar</td></tr>
</table>
<p>Aylık kırılım, tek sayının gizlediği trendi ortaya çıkarır. Kanat'ta OTP Eylül'de %70 civarındayken Aralık'ta %49'a düşüyor. Kış havası, yoğun bayram ve yılbaşı trafiği akla gelen ilk açıklamalardır. Bunu rötar nedenleri tablosuyla doğrulamak bir sonraki adımdır.</p>
`));
X('hv-ozet', [
  sq('Aylık operasyon karnesi: her ay için planlanan uçuş, iptal oranı (yüzde, 1 basamak) ve zamanında kalkış oranı (≤ 15 dk; payda kalkan uçuşlar; yüzde, 1 basamak): <code>ay</code> (YYYY-AA), <code>ucus</code>, <code>iptal_orani</code>, <code>otp</code>. Aya göre sırala.',
    `SELECT strftime('%Y-%m', f.sched_dep) AS ay, COUNT(*) AS ucus, ROUND(100.0 * SUM(CASE WHEN f.status = 'cancelled' THEN 1 ELSE 0 END) / COUNT(*), 1) AS iptal_orani, ROUND(100.0 * SUM(CASE WHEN ROUND(${DK}) <= 15 THEN 1 ELSE 0 END) / COUNT(f.actual_dep), 1) AS otp FROM hv_flights f GROUP BY strftime('%Y-%m', f.sched_dep) ORDER BY ay;`,
    { ord: true, hint: 'İki oranın paydası farklı: iptalde COUNT(*), OTP\'de COUNT(actual_dep).' }),
  sq('Kötü günler: en az 3 uçuşun iptal edildiği günleri getir: <code>gun</code>, <code>iptal</code>. İptal sayısına göre azalan, eşitlikte güne göre.',
    "SELECT date(sched_dep) AS gun, COUNT(*) AS iptal FROM hv_flights WHERE status = 'cancelled' GROUP BY date(sched_dep) HAVING COUNT(*) >= 3 ORDER BY iptal DESC, gun;",
    { ord: true, hint: 'WHERE satırları (iptaller), HAVING grupları (günleri) süzer.' })
]);

more('hv-join', D('JOIN sonrası çoğalma: rötar tablosu örneği', `
<p>JOIN'de en sinsi hata, sorgunun hata vermeden <b>yanlış sayı</b> üretmesidir. Bunun en yaygın sebebi, birleştirilen tablolardan birinin bir satıra birden çok eşleşme getirmesidir. Kanat'ta <code>hv_delays</code> tablosu buna iyi bir örnek: bir uçuşun birden çok rötar nedeni olabilir (ör. hava + geç gelen uçak). 1.228 rötarlı uçuşun 122'sinde iki neden kayıtlı.</p>
${C(`SELECT 'JOIN sonrası' AS yontem, COUNT(*) AS satir, SUM(f.pax) AS yolcu
FROM hv_flights f
JOIN hv_delays d ON d.flight_id = f.flight_id
UNION ALL
SELECT 'önce tekilleştir', COUNT(*), SUM(f.pax)
FROM hv_flights f
JOIN (SELECT DISTINCT flight_id FROM hv_delays) d ON d.flight_id = f.flight_id;`)}
<p>İlk satırda 1.350 “uçuş” ve 215.146 yolcu var. İki nedenli her uçuş iki kez sayılmış. Doğru cevap 1.228 uçuş ve 195.874 yolcudur. “Rötardan etkilenen yolcu” sayısı yaklaşık 20 bin fazla raporlanırdı.</p>
<h3>Çoğalmayı önlemenin üç yolu</h3>
<table>
<tr><th>Yöntem</th><th>Ne zaman?</th></tr>
<tr><td><b>Önce özetle, sonra birleştir:</b> <code>JOIN (SELECT flight_id, SUM(minutes) ... GROUP BY flight_id)</code></td><td>Çok taraftan bir sayı (toplam dakika) gerekiyorsa</td></tr>
<tr><td><b>EXISTS / IN:</b> <code>WHERE EXISTS (SELECT 1 FROM hv_delays ...)</code></td><td>Yalnızca “rötarı var mı?” sorusu soruluyorsa</td></tr>
<tr><td><b>COUNT(DISTINCT ...)</b></td><td>Sayım için işe yarar ama <code>SUM(pax)</code>'ı düzeltmez</td></tr>
</table>
<h3>Taneciği önceden bil</h3>
<p>Her JOIN'den önce kendine şunu sor: “Sol tablodaki bir satır, sağ tabloda kaç satırla eşleşebilir?” <code>hv_flights → hv_routes</code> ve <code>hv_flights → hv_aircraft</code> çoka-bir ilişkilerdir; satır sayısı değişmez. <code>hv_flights → hv_bookings</code> ve <code>hv_flights → hv_delays</code> ise bire-çok ilişkilerdir; satır çoğalır. Bir sorguda iki ayrı bire-çok tabloyu aynı anda birleştirirsen (rezervasyonlar <b>ve</b> rötarlar) çoğalma çarpılarak büyür. Bu durumda her birini ayrı bir alt sorguda özetlemek gerekir.</p>
<div class="tip"><b>Hızlı kontrol</b>JOIN'den sonra <code>COUNT(*)</code> ile <code>COUNT(DISTINCT f.flight_id)</code>'yi karşılaştır. Eşit değillerse taneciğin değişti ve toplamların şişmiş olabilir.</div>
`));
X('hv-join', [
  sq('Rötardan etkilenen uçuş ve yolcu sayısı: en az bir rötar kaydı olan uçuşların sayısı ve bu uçuşlardaki toplam yolcu. Bir uçuşun birden çok rötar nedeni olabilir; uçuşları çoğaltmadan hesapla: <code>ucus</code>, <code>yolcu</code>.',
    'SELECT COUNT(*) AS ucus, SUM(f.pax) AS yolcu FROM hv_flights f JOIN (SELECT DISTINCT flight_id FROM hv_delays) d ON d.flight_id = f.flight_id;',
    { hint: 'hv_delays\'i önce flight_id düzeyinde tekilleştir (SELECT DISTINCT flight_id ...), sonra birleştir.' }),
  sq('Kalkış havalimanı şehrine göre zamanında kalkış oranı (≤ 15 dk; kalkan uçuşlar; yüzde, 1 basamak); en az 50 kalkışı olan şehirlerden en düşük 5\'i: <code>city</code>, <code>ucus</code>, <code>otp</code>. OTP\'ye göre artan, eşitlikte şehir.',
    `SELECT a.city, COUNT(*) AS ucus, ROUND(100.0 * SUM(CASE WHEN ROUND(${DK}) <= 15 THEN 1 ELSE 0 END) / COUNT(*), 1) AS otp FROM hv_flights f JOIN hv_routes r ON r.route_id = f.route_id JOIN hv_airports a ON a.airport_code = r.origin WHERE f.actual_dep IS NOT NULL GROUP BY a.city HAVING COUNT(*) >= 50 ORDER BY otp, a.city LIMIT 5;`,
    { ord: true, hint: 'Kalkış şehri için hv_airports\'u r.origin üzerinden bağla.' })
]);

more('hv-alt', D('NOT IN ve NULL tuzağı, skaler alt sorgunun yeri', `
<p><code>NOT IN</code> ile <code>NOT EXISTS</code> çoğu zaman aynı sonucu verir. Arada tek ama tehlikeli bir fark vardır: <b>alt sorgu bir NULL döndürürse <code>NOT IN</code> hiçbir satır döndürmez.</b></p>
<p>Sebep üç değerli mantıktır. <code>x NOT IN (a, b, NULL)</code> ifadesi <code>x &lt;&gt; a AND x &lt;&gt; b AND x &lt;&gt; NULL</code> demektir. <code>x &lt;&gt; NULL</code> her zaman UNKNOWN olduğu için bütün ifade hiçbir zaman TRUE olamaz. Aşağıda 26 Aralık 2024'te hiç inişi olmayan uçakları iki yoldan arıyoruz. Alt sorgudaki <code>CASE</code>, inmemiş (iptal) uçuşlar için NULL üretir, tıpkı boş bir sütun gibi:</p>
${C(`SELECT 'NOT EXISTS' AS yontem, COUNT(*) AS ucak
FROM hv_aircraft a
WHERE NOT EXISTS (SELECT 1 FROM hv_flights f
                  WHERE f.tail_no = a.tail_no AND f.status = 'landed'
                    AND f.sched_dep >= '2024-12-26' AND f.sched_dep < '2024-12-27')
UNION ALL
SELECT 'NOT IN', COUNT(*)
FROM hv_aircraft a
WHERE a.tail_no NOT IN (SELECT CASE WHEN f.status = 'landed' THEN f.tail_no END
                        FROM hv_flights f
                        WHERE f.sched_dep >= '2024-12-26' AND f.sched_dep < '2024-12-27');`)}
<p><code>NOT EXISTS</code> 5 uçak bulur. <code>NOT IN</code> ise 0 döndürür, çünkü o gün 3 iptal var ve alt sorgu üç NULL üretir. Sorgu hata vermez, yalnızca sessizce yanlış sonuç verir. Gerçek tablolarda boş bırakılabilen her sütun (<code>email</code>, <code>seat</code>, <code>manager_id</code> …) bu riski taşır.</p>
<table>
<tr><th>Durum</th><th>Tercih</th></tr>
<tr><td>“Karşılığı olmayanlar”</td><td><code>NOT EXISTS</code> (NULL'a dayanıklı)</td></tr>
<tr><td>NOT IN kullanmak zorundaysan</td><td>Alt sorguya <code>WHERE sütun IS NOT NULL</code> ekle</td></tr>
<tr><td>“Karşılığı olanlar”</td><td><code>IN</code> ya da <code>EXISTS</code>; NULL burada sorun çıkarmaz</td></tr>
<tr><td>Satır başına genel bir değerle kıyas</td><td>Skaler alt sorgu (<code>SELECT AVG(...)</code>) ya da CTE</td></tr>
</table>
<h3>Skaler alt sorgu nereye yazılır?</h3>
<p>Tek değer döndüren bir alt sorgu SELECT, WHERE ve HAVING içinde kullanılabilir. “Rotanın ortalama ücreti, genel ortalamanın kaç katı?” sorusunda alt sorgu hem SELECT'te (oran) hem HAVING'de (filtre) görünür. Okunabilirlik ya da performans sorun olursa genel ortalamayı bir CTE'de bir kez hesaplayıp <code>CROSS JOIN</code> ile bağlamak aynı işi yapar. Çoğu veritabanı ilişkisiz skaler alt sorguyu zaten bir kez hesaplar.</p>
<div class="note"><b>İlişkili mi, ilişkisiz mi?</b>Alt sorgu dış sorgunun bir sütununa başvuruyorsa (<code>b2.passenger_id = b.passenger_id</code>) ilişkilidir ve kavramsal olarak her dış satır için yeniden çalışır. Büyük tablolarda bunu bir JOIN ya da pencere fonksiyonuyla yeniden yazmak çoğu zaman daha hızlıdır.</div>
`));
X('hv-alt', [
  sq('Pahalı rotalar: rezervasyonlarının ortalama ücreti, tüm rezervasyonların ortalama ücretinin <b>iki katından</b> fazla olan rotalar; ortalama ücret (tam sayı) ve genel ortalamaya oranı (2 basamak): <code>origin</code>, <code>dest</code>, <code>ort</code>, <code>oran</code>. Orana göre azalan, eşitlikte origin ve dest.',
    'SELECT r.origin, r.dest, ROUND(AVG(b.price)) AS ort, ROUND(AVG(b.price) / (SELECT AVG(price) FROM hv_bookings), 2) AS oran FROM hv_bookings b JOIN hv_flights f ON f.flight_id = b.flight_id JOIN hv_routes r ON r.route_id = f.route_id GROUP BY r.origin, r.dest HAVING AVG(b.price) > 2 * (SELECT AVG(price) FROM hv_bookings) ORDER BY oran DESC, r.origin, r.dest;',
    { ord: true, hint: 'Aynı skaler alt sorgu hem SELECT\'te (oran) hem HAVING\'de (filtre) kullanılır.' }),
  sq('Sessizleşen değerli üyeler: Gold ve Elite üyelerden Aralık 2024\'te (sched_dep ≥ 2024-12-01) hiç gerçekleşen (flown) uçuşu olmayanların seviyeye göre sayısı (NOT EXISTS ile): <code>tier</code>, <code>uye</code>.',
    "SELECT p.tier, COUNT(*) AS uye FROM hv_passengers p WHERE p.tier IN ('Gold', 'Elite') AND NOT EXISTS (SELECT 1 FROM hv_bookings b JOIN hv_flights f ON f.flight_id = b.flight_id WHERE b.passenger_id = p.passenger_id AND b.status = 'flown' AND f.sched_dep >= '2024-12-01') GROUP BY p.tier;",
    { hint: 'Alt sorgu rezervasyonu uçuşla birleştirir; dış sorgunun passenger_id\'sine bağlanır.' })
]);

more('hv-analitik', D('Rötar nedenleri: kim kontrol ediyor, nasıl yayılıyor?', `
<p>Rötar dakikalarını nedenlere göre toplamak ilk adımdır. Yönetim için asıl soru ise <b>hangi dakikaların bizim kontrolümüzde olduğudur</b>. Sektörde nedenler kabaca üç gruba ayrılır:</p>
<table>
<tr><th>Grup</th><th>Kanat kodları</th><th>Sahibi</th></tr>
<tr><td><b>İç (kontrol edilebilir)</b></td><td><code>teknik</code>, <code>yer_hizmetleri</code></td><td>Bakım, yer operasyonu</td></tr>
<tr><td><b>Dış</b></td><td><code>hava</code>, <code>hava_trafik</code></td><td>Meteoroloji, hava trafik kontrolü</td></tr>
<tr><td><b>Zincir (reactionary)</b></td><td><code>gec_gelen_ucak</code></td><td>Önceki uçuşun gecikmesi; planlama ve dönüş süresi</td></tr>
</table>
<p>Zincir gecikmesi kendi başına bir neden değildir, önceki uçuşun gecikmesinin <b>yayılmasıdır</b>. Kanat'ta toplam rötar dakikasının %36,6'sı bu gruptan geliyor. Bu yüzden günün ilk uçuşlarını korumak (sabah ilk dalganın zamanında çıkması) ve uçuşlar arasına yeterli dönüş süresi (turnaround) koymak, en etkili iyileştirme alanlarıdır.</p>
<h3>Yayılımı veride görmek</h3>
<p>Her uçağın günü sabah zamanında başlar, gecikmeler gün içinde birikir. Bunu görmek için uçuşları uçak ve gün içinde sıralayıp <b>günün ilk uçuşunu</b> ayırmak yeterli. Kalkış ve varış OTP'sini aylık olarak yan yana koymak da faydalıdır:</p>
${C(`SELECT strftime('%Y-%m', sched_dep) AS ay,
       ROUND(100.0 * SUM(CASE WHEN ROUND((julianday(actual_dep) - julianday(sched_dep)) * 1440) <= 15 THEN 1 ELSE 0 END)
             / COUNT(actual_dep), 1) AS kalkis_otp,
       ROUND(100.0 * SUM(CASE WHEN ROUND((julianday(actual_arr) - julianday(sched_arr)) * 1440) <= 15 THEN 1 ELSE 0 END)
             / COUNT(actual_arr), 1) AS varis_otp
FROM hv_flights
GROUP BY strftime('%Y-%m', sched_dep)
ORDER BY ay;`)}
<p>Varış OTP'si (tüm dönem %57,3) kalkış OTP'sinden (%62,1) düşüktür, çünkü havada ve inişte de gecikme eklenir. Yolcunun yaşadığı ve bağlantı uçuşlarını etkileyen asıl ölçü varıştır. Kalkış ise operasyon ekibinin doğrudan kontrol ettiği ölçüdür. İkisi birlikte raporlanır.</p>
<h3>Sık hatalar</h3>
<ul>
<li><b>Doluluk paydası:</b> İptal edilen uçuşların koltukları paydaya girmez. Doluluk “uçulan” koltuklar üzerinden hesaplanır.</li>
<li><b>Nedenleri uçuş sayısıyla toplamak:</b> İki nedenli uçuşlar iki kez sayılır. Neden payını <b>dakika</b> üzerinden ver, uçuş sayısını <code>COUNT(DISTINCT flight_id)</code> ile al.</li>
<li><b>Zaman dilimi:</b> Varış havalimanı farklı bir saat dilimindeyse yerel saatleri doğrudan çıkarmak yanlış süre verir. Bu veride zamanlar tek bir saat dilimindedir; gerçek sistemlerde UTC saklanır.</li>
</ul>
`));
X('hv-analitik', [
  sq('Rötar dakikalarını sorumluluk grubuna ayır: <code>teknik</code> ve <code>yer_hizmetleri</code> → <b>iç</b>, <code>hava</code> ve <code>hava_trafik</code> → <b>dış</b>, <code>gec_gelen_ucak</code> → <b>zincir</b>. Her grubun toplam dakikası ve payı (yüzde, 1 basamak): <code>grup</code>, <code>dakika</code>, <code>pay</code>. Dakikaya göre azalan.',
    "SELECT CASE WHEN reason IN ('teknik', 'yer_hizmetleri') THEN 'iç' WHEN reason IN ('hava', 'hava_trafik') THEN 'dış' ELSE 'zincir' END AS grup, SUM(minutes) AS dakika, ROUND(100.0 * SUM(minutes) / (SELECT SUM(minutes) FROM hv_delays), 1) AS pay FROM hv_delays GROUP BY CASE WHEN reason IN ('teknik', 'yer_hizmetleri') THEN 'iç' WHEN reason IN ('hava', 'hava_trafik') THEN 'dış' ELSE 'zincir' END ORDER BY dakika DESC;",
    O),
  sq('Gecikmenin gün içinde birikmesi: kalkan uçuşları uçak ve takvim günü içinde planlanan kalkışa göre sırala (eşitlikte flight_id); günün ilk uçuşları ile sonraki uçuşların sayısı ve zamanında kalkış oranı (≤ 15 dk; yüzde, 1 basamak): <code>grup</code> (<b>günün ilk uçuşu</b> / <b>sonraki uçuşlar</b>), <code>ucus</code>, <code>otp</code>.',
    `WITH f AS (SELECT ROUND(${DK}) AS rotar, ROW_NUMBER() OVER (PARTITION BY f.tail_no, date(f.sched_dep) ORDER BY f.sched_dep, f.flight_id) AS sira FROM hv_flights f WHERE f.actual_dep IS NOT NULL) SELECT CASE WHEN sira = 1 THEN 'günün ilk uçuşu' ELSE 'sonraki uçuşlar' END AS grup, COUNT(*) AS ucus, ROUND(100.0 * SUM(CASE WHEN rotar <= 15 THEN 1 ELSE 0 END) / COUNT(*), 1) AS otp FROM f GROUP BY CASE WHEN sira = 1 THEN 'günün ilk uçuşu' ELSE 'sonraki uçuşlar' END;`,
    { hint: 'ROW_NUMBER() OVER (PARTITION BY tail_no, date(sched_dep) ORDER BY sched_dep, flight_id) = 1 günün ilk uçuşudur.' })
]);

more('hv-veri', D('Bütünlük denetimi: kısıtların yakalayamadıkları', `
<p>Kısıtlar (PRIMARY KEY, FOREIGN KEY, CHECK, UNIQUE) hatalı verinin <b>girişini</b> engeller. Ama her iş kuralı bir kısıtla ifade edilemez, eski veriler kısıtlar eklenmeden önce girilmiş olabilir ve toplu yüklemeler bazen kısıtları geçici olarak kapatır. Bu yüzden veri ekipleri düzenli bir <b>bütünlük karnesi</b> çalıştırır. Her satır bir kuralı test eder ve 0 dışındaki her sayı bir alarmdır:</p>
${C(`SELECT
  (SELECT COUNT(*) FROM hv_flights f JOIN hv_aircraft a ON a.tail_no = f.tail_no
    WHERE f.pax > a.seats) AS kapasite_asimi,
  (SELECT COUNT(*) FROM hv_bookings b JOIN hv_flights f ON f.flight_id = b.flight_id
    WHERE f.status = 'cancelled' AND b.status <> 'cancelled') AS iptal_tutarsiz,
  (SELECT COUNT(*) FROM hv_bookings b
    WHERE NOT EXISTS (SELECT 1 FROM hv_flights f WHERE f.flight_id = b.flight_id)) AS yetim_rezervasyon,
  (SELECT COUNT(*) FROM hv_flights WHERE actual_arr < actual_dep) AS ters_zaman,
  (SELECT COUNT(*) FROM (SELECT flight_id, seat FROM hv_bookings
                         WHERE seat IS NOT NULL
                         GROUP BY flight_id, seat HAVING COUNT(*) > 1) t) AS cift_koltuk;`)}
<p>Kanat'ın verisi dört kontrolden temiz geçiyor ama beşincide 20 uçuş–koltuk çifti çıkıyor. Örneğin 219 numaralı uçuşta 27B koltuğu iki ayrı yolcuya atanmış ve ikisi de “flown” görünüyor. <code>UNIQUE (flight_id, seat)</code> kısıtı olsaydı ikinci kayıt hiç girilemezdi.</p>
<h3>UNIQUE ve NULL: programlar ayrışır</h3>
<p>İptal edilen rezervasyonların koltuğu NULL'dır. Standart SQL'de ve PostgreSQL, MySQL, Oracle, SQLite'ta birden çok NULL bir UNIQUE kısıtını ihlal etmez. <b>SQL Server ise UNIQUE sütunda yalnızca bir NULL'a izin verir.</b> Orada çözüm filtreli bir indekstir: <code>CREATE UNIQUE INDEX ... WHERE seat IS NOT NULL</code>.</p>
<h3>Güvenli değişiklik akışı</h3>
<ol>
<li><b>Say:</b> Aynı WHERE koşuluyla <code>SELECT COUNT(*)</code> çalıştır, beklenen sayıyı yaz.</li>
<li><b>Değiştir:</b> İşlem (transaction) içinde UPDATE / DELETE çalıştır; etkilenen satır sayısı beklenenle aynı mı?</li>
<li><b>Doğrula:</b> Bütünlük karnesini yeniden çalıştır; sonra COMMIT, sorun varsa ROLLBACK.</li>
<li><b>Tekrarlanabilirlik:</b> Değişikliği ikinci kez çalıştırmak zarar vermemeli (idempotent). <code>WHERE status &lt;&gt; 'cancelled'</code> gibi bir koşul bunu sağlar.</li>
</ol>
<div class="warn"><b>Uçak değişimi gibi toplu güncellemeler</b>Bir uçağı bakıma alıp uçuşlarını başka bir uçağa aktarırken WHERE koşulunu hem uçağa hem tarih aralığına bağla. Yalnızca <code>WHERE tail_no = ...</code> yazmak, uçağın geçmişteki bütün uçuşlarını da değiştirir ve geçmiş raporlar bozulur.</div>
`));
X('hv-veri', [
  sq('Bütünlük kontrolü: aynı uçuşta aynı koltuğun birden fazla rezervasyona atandığı (koltuğu boş olmayan) uçuş–koltuk çiftlerinin sayısı: <code>cift</code>.',
    'SELECT COUNT(*) AS cift FROM (SELECT flight_id, seat FROM hv_bookings WHERE seat IS NOT NULL GROUP BY flight_id, seat HAVING COUNT(*) > 1) t;',
    { hint: 'Önce (flight_id, seat) düzeyinde grupla ve HAVING COUNT(*) > 1 ile tekrar edenleri bul, sonra dışarıda say.' }),
  sq('Uçak değişimi: TC-KBB bakıma alındı. Bu uçağın <b>31 Aralık 2024</b> tarihli (sched_dep ≥ 2024-12-31) uçuşlarını aynı tipteki TC-KBC uçağına aktar. Daha önceki uçuşlar değişmemeli.',
    "UPDATE hv_flights SET tail_no = 'TC-KBC' WHERE tail_no = 'TC-KBB' AND sched_dep >= '2024-12-31';",
    { check: "SELECT tail_no, COUNT(*) AS ucus, MIN(sched_dep) AS ilk, MAX(sched_dep) AS son FROM hv_flights WHERE tail_no IN ('TC-KBB', 'TC-KBC') AND sched_dep >= '2024-12-30' GROUP BY tail_no ORDER BY tail_no", hint: 'WHERE koşulunu hem uçağa hem tarihe bağla; önce aynı koşulla SELECT COUNT(*) çalıştır.' })
]);

})();
