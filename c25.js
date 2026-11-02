/* Kesit SQL içerik 25: Eksik konular ve Lezzet Kurye alıştırma bankası
   Yeni dersler: sorgu hata ayıklama, son bilinen değerle doldurma, zaman aralıkları (çakışma ve eşzamanlılık),
   geniş ↔ uzun dönüşüm (unpivot). Alıştırma bankasına “Lezzet Kurye” konusu. */
(function () {
const L = window.SQLP_LESSONS;
const sq = (q, sol, o) => Object.assign({ t: 'sql', q: '<p>' + q + '</p>', sol }, o || {});
const mc = (q, o, a, why) => ({ t: 'mc', q, o, a, why });
const O = { ord: true };
const after = (anchor, lesson) => { const i = L.findIndex(l => l.id === anchor); L.splice(i < 0 ? L.length : i + 1, 0, lesson); };
const SEC = "ROUND((julianday(o.delivered_at) - julianday(o.placed_at)) * 86400)";

after('sik-hatalar', {
  id: 'hata-ayiklama', lv: 'B1', mod: 'Küme ve Alt Sorgular', min: 18,
  title: 'Sorgu hata ayıklama: yanlış sonucu adım adım bulmak',
  sum: 'Hata vermeyen ama yanlış sonuç döndüren sorguları bulmak için kontrol sorguları: satır sayısı, anahtar benzersizliği, toplam uzlaştırma ve ara adımları görmek.',
  body: `
<h2>Sessiz hatayı yakalamanın yolu: kontrol sorguları</h2>
<p>Bir sorgu hata vermiyorsa doğru olduğu anlamına gelmez. Deneyimli analistler sonucu raporlamadan önce birkaç küçük <b>kontrol sorgusu</b> çalıştırır. Bu ders, Lezzet Kurye verisi üzerinde bu alışkanlığı kazandırır.</p>
<h2>1. Anahtar gerçekten benzersiz mi?</h2>
<p>Bir tabloyu “bir” taraf sanarak birleştirmeden önce anahtarın tekrar etmediğini doğrula:</p>
<pre class="code">SELECT order_id, COUNT(*) AS adet
FROM lk_ratings
GROUP BY order_id
HAVING COUNT(*) > 1;</pre>
<p>Hiç satır dönmüyorsa her siparişin en fazla bir değerlendirmesi var; siparişlerle güvenle birleştirebilirsin.</p>
<h2>2. Her JOIN'den sonra satır sayısı</h2>
<pre class="code">SELECT
  (SELECT COUNT(*) FROM lk_orders) AS siparis,
  (SELECT COUNT(*) FROM lk_orders o JOIN lk_order_lines ol ON ol.order_id = o.order_id) AS siparis_x_satir,
  (SELECT COUNT(*) FROM lk_orders o LEFT JOIN lk_ratings r ON r.order_id = o.order_id) AS siparis_x_puan;</pre>
<p>Siparişleri satırlarla birleştirince sayı artar (fan-out); değerlendirmelerle LEFT JOIN ise sayıyı değiştirmez. Beklediğinden farklı bir sayı, yanlış bir varsayımın işaretidir.</p>
<h2>3. Toplamları uzlaştır</h2>
<p>Bir kırılımın parçalarının toplamı, kırılımsız toplama eşit olmalıdır. Şehir bazında sipariş sayılarının toplamı tüm sipariş sayısını vermiyorsa, bazı satırlar JOIN'de düşmüş ya da iki kez sayılmıştır:</p>
<pre class="code">SELECT SUM(siparis) AS kirilim_toplami, (SELECT COUNT(*) FROM lk_orders) AS genel
FROM (SELECT r.city, COUNT(*) AS siparis
      FROM lk_orders o JOIN lk_restaurants r ON r.restaurant_id = o.restaurant_id
      GROUP BY r.city) t;</pre>
<h2>4. Ara adımı gör</h2>
<p>Uzun bir CTE zincirinde son SELECT'i geçici olarak bir ara adıma çevir: <code>SELECT * FROM adim2 LIMIT 20</code>. Ara sonucun grain düzeyi (bir satır neyi temsil ediyor?) beklediğin gibi mi?</p>
<h2>5. Uç değerlere bak</h2>
<p>MIN, MAX ve NULL sayısı çoğu veri sorununu hemen gösterir: negatif tutar, gelecekte bir tarih, beklenmedik boşluk.</p>
<pre class="code">SELECT MIN(placed_at), MAX(placed_at),
       SUM(CASE WHEN delivered_at < placed_at THEN 1 ELSE 0 END) AS ters_zaman,
       COUNT(*) - COUNT(courier_id) AS kuryesiz
FROM lk_orders;</pre>
<div class="tip"><b>Alışkanlık</b>Raporladığın her sayının yanında, onu doğrulayan bir kontrol sorgusu olsun. Mülakatlarda da görüşmeciler bunu ayrıca puanlar.</div>
`,
  ex: [
    sq('Kontrol 1: <code>lk_order_lines</code> tablosunda aynı (sipariş, ürün) çiftinin tekrar edip etmediğini kontrol et; tekrar eden çift sayısını getir: <code>tekrar</code>.', 'SELECT COUNT(*) AS tekrar FROM (SELECT order_id, item_id FROM lk_order_lines GROUP BY order_id, item_id HAVING COUNT(*) > 1) t;'),
    sq('Kontrol 2: siparişleri satırlarla birleştirmenin satır sayısını kaç kat artırdığını hesapla (2 basamak): <code>kat</code>.', 'SELECT ROUND(1.0 * (SELECT COUNT(*) FROM lk_orders o JOIN lk_order_lines ol ON ol.order_id = o.order_id) / (SELECT COUNT(*) FROM lk_orders), 2) AS kat;'),
    sq('Kontrol 3: satırı olmayan sipariş var mı? Hiç satırı olmayan sipariş sayısı: <code>satirsiz</code>.', 'SELECT COUNT(*) AS satirsiz FROM lk_orders o WHERE NOT EXISTS (SELECT 1 FROM lk_order_lines ol WHERE ol.order_id = o.order_id);'),
    sq('Kontrol 4: uzlaştırma. Mutfak türüne göre sipariş sayılarının toplamı ile tüm sipariş sayısını yan yana getir: <code>kirilim</code>, <code>genel</code>.', 'SELECT SUM(n) AS kirilim, (SELECT COUNT(*) FROM lk_orders) AS genel FROM (SELECT r.cuisine, COUNT(*) AS n FROM lk_orders o JOIN lk_restaurants r ON r.restaurant_id = o.restaurant_id GROUP BY r.cuisine) t;'),
    sq('Kontrol 5: zaman tutarlılığı. Teslim siparişlerde <code>picked_at</code> &lt; <code>placed_at</code> ya da <code>delivered_at</code> &lt; <code>picked_at</code> olan (sıra dışı) kayıt sayısı: <code>tutarsiz</code>.', "SELECT COUNT(*) AS tutarsiz FROM lk_orders WHERE status = 'teslim' AND (picked_at < placed_at OR delivered_at < picked_at);"),
    sq('Bu sorgu restoran başına ortalama sepet tutarını hesaplıyor ama bahşişleri satır sayısı kadar sayıyor: ortalama bahşişi restoran başına <b>sipariş düzeyinde</b> doğru hesapla (2 basamak); 1–5 numaralı restoranlar: <code>restaurant_id</code>, <code>ort_bahsis</code>.', "SELECT restaurant_id, ROUND(AVG(tip), 2) AS ort_bahsis FROM lk_orders WHERE restaurant_id <= 5 AND status = 'teslim' GROUP BY restaurant_id ORDER BY restaurant_id;", { ord: true, start: "SELECT o.restaurant_id, ROUND(AVG(o.tip), 2) AS ort_bahsis FROM lk_orders o JOIN lk_order_lines ol ON ol.order_id = o.order_id WHERE o.restaurant_id <= 5 AND o.status = 'teslim' GROUP BY o.restaurant_id ORDER BY o.restaurant_id;" }),
    mc('<p>Şehir kırılımındaki sipariş sayılarının toplamı, toplam sipariş sayısından <b>az</b> çıktı. En olası neden?</p>', ['JOIN satırları çoğalttı', 'INNER JOIN, eşi olmayan (ör. restoranı silinmiş) siparişleri düşürdü ya da gruplama sütunu NULL olanlar ayrı kaldı', 'Tam sayı bölmesi yapıldı', 'ORDER BY eksik'], 1, 'Toplamın eksik çıkması satır kaybına işaret eder: INNER JOIN eşleşmeyenleri atar. Fazla çıkması ise çoğalmaya (fan-out) işaret eder.')
  ]
});

after('takvim', {
  id: 'son-deger', lv: 'B2', mod: 'İleri Sorgu Yapıları', min: 18,
  title: 'Boşluk doldurma: son bilinen değerle ilerlemek',
  sum: 'Eksik günleri takvimle tamamlamak ve boş kalan değeri bir önceki bilinen değerle doldurmak (forward fill): ilişkili alt sorgu, pencere ile grup numarası ve IGNORE NULLS.',
  body: `
<h2>Sorun</h2>
<p>Ilgaz Bank'ın döviz kuru tablosu (<code>bank_fx</code>) yalnızca iş günlerini içerir. Hafta sonu yapılan bir döviz işleminin TL karşılığını hesaplamak için o günün kuru gerekir; finans ekiplerinin kuralı: <b>hafta sonu ve tatilde son bilinen kur geçerlidir</b>. Buna “son bilinen değerle doldurma” (forward fill, LOCF) denir.</p>
<h2>Adım 1: takvimi tamamla</h2>
<pre class="code">WITH RECURSIVE t(gun) AS (
  SELECT '2024-03-01' UNION ALL SELECT date(gun, '+1 day') FROM t WHERE gun < '2024-03-14'
)
SELECT t.gun, f.try_rate
FROM t LEFT JOIN bank_fx f ON f.rate_date = t.gun AND f.currency = 'USD'
ORDER BY t.gun;</pre>
<p>Hafta sonları <code>try_rate</code> boş gelir.</p>
<h2>Yol 1: ilişkili alt sorgu</h2>
<p>Her gün için o güne kadarki en son kur tarihini bul, sonra o tarihin kurunu al. Her SQL türünde çalışır, anlaşılması kolaydır; büyük tablolarda yavaş olabilir.</p>
<pre class="code">WITH RECURSIVE t(gun) AS (
  SELECT '2024-03-01' UNION ALL SELECT date(gun, '+1 day') FROM t WHERE gun < '2024-03-14'
)
SELECT t.gun,
       (SELECT f.try_rate FROM bank_fx f
        WHERE f.currency = 'USD' AND f.rate_date <= t.gun
        ORDER BY f.rate_date DESC LIMIT 1) AS kur
FROM t
ORDER BY t.gun;</pre>
<h2>Yol 2: pencere ile grup numarası</h2>
<p>Dolu değerleri kümülatif say: her dolu değer yeni bir grup başlatır, ardından gelen boş satırlar aynı grupta kalır. Sonra grup içindeki tek dolu değeri al.</p>
<pre class="code">WITH RECURSIVE t(gun) AS (
  SELECT '2024-03-01' UNION ALL SELECT date(gun, '+1 day') FROM t WHERE gun < '2024-03-14'
),
k AS (
  SELECT t.gun, f.try_rate,
         COUNT(f.try_rate) OVER (ORDER BY t.gun ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS grp
  FROM t LEFT JOIN bank_fx f ON f.rate_date = t.gun AND f.currency = 'USD'
)
SELECT gun, MAX(try_rate) OVER (PARTITION BY grp) AS kur
FROM k
ORDER BY gun;</pre>
<p><code>COUNT(sütun)</code> boşları saymadığı için grup numarası yalnızca dolu satırlarda artar. Bu yöntem tabloyu bir kez tarar ve her SQL türünde çalışır.</p>
<h2>Yol 3: IGNORE NULLS</h2>
<p>Oracle, BigQuery, Snowflake ve SQL Server 2022 şu kısa yazımı destekler: <code>LAST_VALUE(try_rate IGNORE NULLS) OVER (ORDER BY gun)</code>. PostgreSQL ve MySQL'de yoktur; orada 2. yol kullanılır.</p>
<div class="note"><b>Dikkat</b>Dizinin <b>başında</b> boşluk varsa (ilk gün hafta sonuysa) doldurulacak bir önceki değer yoktur; sorgu NULL döndürür. Takvimi bir gün geriden başlatmak ya da ilk değeri bilinçli olarak seçmek gerekir.</div>
`,
  ex: [
    sq('1–14 Mart 2024 için her günün USD kuru; hafta sonları son bilinen kurla doldurulsun (ilişkili alt sorgu ya da pencere): <code>gun</code>, <code>kur</code>. Güne göre sırala.', "WITH RECURSIVE t(gun) AS (SELECT '2024-03-01' UNION ALL SELECT date(gun, '+1 day') FROM t WHERE gun < '2024-03-14') SELECT t.gun, (SELECT f.try_rate FROM bank_fx f WHERE f.currency = 'USD' AND f.rate_date <= t.gun ORDER BY f.rate_date DESC LIMIT 1) AS kur FROM t ORDER BY t.gun;", O),
    sq('Aynı işi COUNT OVER ile grup numarası yöntemiyle yap; 1–14 Mart EUR kuru: <code>gun</code>, <code>kur</code>. Güne göre sırala.', "WITH RECURSIVE t(gun) AS (SELECT '2024-03-01' UNION ALL SELECT date(gun, '+1 day') FROM t WHERE gun < '2024-03-14'), k AS (SELECT t.gun, f.try_rate, COUNT(f.try_rate) OVER (ORDER BY t.gun ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS grp FROM t LEFT JOIN bank_fx f ON f.rate_date = t.gun AND f.currency = 'EUR') SELECT gun, MAX(try_rate) OVER (PARTITION BY grp) AS kur FROM k ORDER BY gun;", O),
    sq('Mart 2024\'te kaç gün için kur tablosunda USD kuru <b>yok</b> (takvime göre)? <code>eksik_gun</code>.', "WITH RECURSIVE t(gun) AS (SELECT '2024-03-01' UNION ALL SELECT date(gun, '+1 day') FROM t WHERE gun < '2024-03-31') SELECT COUNT(*) AS eksik_gun FROM t LEFT JOIN bank_fx f ON f.rate_date = t.gun AND f.currency = 'USD' WHERE f.rate_date IS NULL;"),
    sq('Lezzet Kurye: Aralık 2024\'te her gün için o güne kadar açılmış (signup) son müşterinin kayıt tarihini getir; ilk 7 gün: <code>gun</code>, <code>son_kayit</code>.', "WITH RECURSIVE t(gun) AS (SELECT '2024-12-01' UNION ALL SELECT date(gun, '+1 day') FROM t WHERE gun < '2024-12-07') SELECT t.gun, (SELECT MAX(signup_date) FROM lk_customers c WHERE c.signup_date <= t.gun) AS son_kayit FROM t ORDER BY t.gun;", O),
    mc('<p><code>COUNT(try_rate) OVER (ORDER BY gun ROWS UNBOUNDED PRECEDING)</code> neden boş günlerde artmaz?</p>', ['ROWS çerçevesi boş satırları atlar', 'COUNT(sütun) NULL değerleri saymaz; bu yüzden sayı yalnızca dolu satırlarda bir artar', 'ORDER BY boşları sona atar', 'Pencere fonksiyonları NULL satırlarda çalışmaz'], 1, 'Grup numarası her dolu değerde yeni bir grup başlatır; ardından gelen boş satırlar o grupta kalır ve grubun tek dolu değeriyle doldurulur.')
  ]
});

after('ardisik-seri', {
  id: 'zaman-araligi', lv: 'C1', mod: 'İleri Sorgu Yapıları', min: 22,
  title: 'Zaman aralıkları: çakışma, eşzamanlılık ve birleştirme',
  sum: 'Başlangıcı ve bitişi olan kayıtlarla çalışmak: iki aralığın çakışma koşulu, aynı anda kaç işin sürdüğü (+1/−1 olay yöntemi) ve çakışan aralıkları birleştirmek.',
  body: `
<h2>Aralık verisi her yerde</h2>
<p>Bir teslimat kuryenin restorandan aldığı an (<code>picked_at</code>) ile teslim ettiği an (<code>delivered_at</code>) arasında sürer. Otel rezervasyonları, toplantı odaları, abonelik dönemleri, sunucu oturumları hep aynı yapıdadır: <b>[başlangıç, bitiş)</b>.</p>
<h2>1. İki aralık ne zaman çakışır?</h2>
<p>A ve B aralıkları ancak şu koşulla çakışır:</p>
<pre class="code" data-norun>A.baslangic &lt; B.bitis AND B.baslangic &lt; A.bitis</pre>
<p>Dört farklı durum (biri diğerini kapsar, soldan, sağdan, iç içe) bu tek koşulla yakalanır. Çakışmama koşulu ise tersidir: biri diğeri başlamadan biter. Aynı kuryenin aynı anda iki teslimat taşıdığı durumlar:</p>
<pre class="code">SELECT a.courier_id, a.order_id, b.order_id AS diger
FROM lk_orders a
JOIN lk_orders b
  ON b.courier_id = a.courier_id
 AND a.order_id &lt; b.order_id
 AND a.picked_at &lt; b.delivered_at
 AND b.picked_at &lt; a.delivered_at
WHERE a.status = 'teslim' AND b.status = 'teslim'
LIMIT 10;</pre>
<p><code>a.order_id &lt; b.order_id</code> her çifti bir kez sayar.</p>
<h2>2. Aynı anda kaç iş sürüyor? (olay yöntemi)</h2>
<p>Her aralığı iki olaya böl: başlangıçta <b>+1</b>, bitişte <b>−1</b>. Olayları zamana göre sırala ve kümülatif topla; her andaki toplam, o anda süren iş sayısıdır.</p>
<pre class="code">WITH olay AS (
  SELECT picked_at AS an, 1 AS d FROM lk_orders WHERE status = 'teslim'
  UNION ALL
  SELECT delivered_at, -1 FROM lk_orders WHERE status = 'teslim'
),
k AS (
  SELECT an, SUM(d) OVER (ORDER BY an, d ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS yolda
  FROM olay
)
SELECT MAX(yolda) AS en_yogun FROM k;</pre>
<p>Sıralamada aynı anda biten ve başlayan iki olay varsa <code>ORDER BY an, d</code> önce −1'i işler; böylece biten iş, başlayanla “aynı anda” sayılmaz.</p>
<h2>3. Çakışan aralıkları birleştirmek</h2>
<p>Bir kuryenin “meşgul” dönemleri: iç içe ya da çakışan teslimatları tek bir dönemde birleştir. Bu, boşluklar ve adalar probleminin aralık hâlidir: bir aralık, önceki aralıkların en geç bitişinden <b>sonra</b> başlıyorsa yeni bir ada başlatır.</p>
<pre class="code">WITH s AS (
  SELECT picked_at AS bas, delivered_at AS bit,
         MAX(delivered_at) OVER (ORDER BY picked_at ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS onceki_bitis
  FROM lk_orders
  WHERE courier_id = 55 AND status = 'teslim' AND picked_at &gt;= '2024-12-01' AND picked_at &lt; '2025-01-01'
),
i AS (
  SELECT bas, bit, SUM(CASE WHEN onceki_bitis IS NULL OR bas &gt; onceki_bitis THEN 1 ELSE 0 END)
           OVER (ORDER BY bas ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS ada
  FROM s
)
SELECT ada, MIN(bas) AS baslangic, MAX(bit) AS bitis, COUNT(*) AS teslimat
FROM i GROUP BY ada ORDER BY ada;</pre>
<div class="tip"><b>Sınır kararı</b>Bir iş tam 12:00'de bitip diğeri tam 12:00'de başlıyorsa çakışıyor mu? Yarı açık aralık [başlangıç, bitiş) kabulünde hayır. Koşulda &lt; ve &lt;= seçimi bu kararı belirler; raporda belirt.</div>
`,
  ex: [
    sq('Aynı kuryenin <b>aynı anda</b> iki teslimat taşıdığı (aralıkları çakışan) teslim sipariş çiftlerinin sayısı: <code>cift</code>.', "SELECT COUNT(*) AS cift FROM lk_orders a JOIN lk_orders b ON b.courier_id = a.courier_id AND a.order_id < b.order_id AND a.picked_at < b.delivered_at AND b.picked_at < a.delivered_at WHERE a.status = 'teslim' AND b.status = 'teslim';"),
    sq('Olay yöntemiyle: platformda aynı anda yolda olan en fazla teslimat sayısı (picked_at → delivered_at): <code>en_yogun</code>.', "WITH olay AS (SELECT picked_at AS an, 1 AS d FROM lk_orders WHERE status = 'teslim' UNION ALL SELECT delivered_at, -1 FROM lk_orders WHERE status = 'teslim'), k AS (SELECT an, SUM(d) OVER (ORDER BY an, d ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS yolda FROM olay) SELECT MAX(yolda) AS en_yogun FROM k;"),
    sq('Aynı yöntemi İzmir için uygula (restoran şehri): İzmir\'de aynı anda yolda olan en fazla teslimat: <code>en_yogun</code>.', "WITH t AS (SELECT o.picked_at, o.delivered_at FROM lk_orders o JOIN lk_restaurants r ON r.restaurant_id = o.restaurant_id WHERE o.status = 'teslim' AND r.city = 'İzmir'), olay AS (SELECT picked_at AS an, 1 AS d FROM t UNION ALL SELECT delivered_at, -1 FROM t), k AS (SELECT SUM(d) OVER (ORDER BY an, d ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS yolda FROM olay) SELECT MAX(yolda) AS en_yogun FROM k;"),
    sq('Kurye 55\'in Aralık 2024 teslimatlarını, çakışanları birleştirerek “meşgul dönemlere” ayır; teslimat sayısı ve dönem sayısı: <code>teslimat</code>, <code>donem</code>.', "WITH s AS (SELECT picked_at AS bas, delivered_at AS bit, MAX(delivered_at) OVER (ORDER BY picked_at ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS onceki FROM lk_orders WHERE courier_id = 55 AND status = 'teslim' AND picked_at >= '2024-12-01' AND picked_at < '2025-01-01'), i AS (SELECT SUM(CASE WHEN onceki IS NULL OR bas > onceki THEN 1 ELSE 0 END) OVER (ORDER BY bas ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS ada FROM s) SELECT COUNT(*) AS teslimat, COUNT(DISTINCT ada) AS donem FROM i;"),
    sq('Kanat Havayolları: aynı uçağın planlanan iki uçuşunun (sched_dep → sched_arr) çakıştığı durumların sayısı (çift başına bir kez; veri hatası testi): <code>cakisma</code>.', 'SELECT COUNT(*) AS cakisma FROM hv_flights a JOIN hv_flights b ON b.tail_no = a.tail_no AND a.flight_id < b.flight_id AND a.sched_dep < b.sched_arr AND b.sched_dep < a.sched_arr;'),
    mc('<p>[10:00, 10:30) ve [10:30, 11:00) aralıkları için hangisi doğrudur?</p>', ['Çakışırlar; 10:30 ikisinde de var', '<code>a.bas &lt; b.bit AND b.bas &lt; a.bit</code> koşuluna göre çakışmazlar; yarı açık aralıkta ilkinin bitişi ikincisine dahil değildir', 'Çakışma koşulu bu durumda hata verir', 'Sonuç SQL türüne göre değişir'], 1, '10:00 < 11:00 doğru, ama 10:30 < 10:30 yanlış; koşul sağlanmaz. Kapalı aralık istersen <= kullanırsın.')
  ]
});

after('pivot', {
  id: 'unpivot', lv: 'B2', mod: 'İleri Sorgu Yapıları', min: 15,
  title: 'Geniş tablodan uzun tabloya: UNPIVOT',
  sum: 'Sütunlara yayılmış ölçümleri satırlara çevirmek: UNION ALL, sabit liste ile CROSS JOIN, SQL türlerine özgü UNPIVOT ve uzun formatın analizdeki faydası.',
  body: `
<h2>Neden uzun format?</h2>
<p>Lezzet Kurye değerlendirmelerinde iki puan iki ayrı sütunda durur: <code>food_score</code> ve <code>courier_score</code>. “Hangi puan türünün ortalaması daha düşük?”, “Her puan türünde 1 verenlerin oranı?” gibi sorular, puanlar <b>tek sütunda</b> ve türü ayrı bir sütunda olduğunda tek bir GROUP BY ile cevaplanır. Görselleştirme araçları da çoğunlukla uzun format ister.</p>
<table><tr><th>order_id</th><th>food_score</th><th>courier_score</th></tr><tr><td>12</td><td>5</td><td>4</td></tr></table>
<p>↓</p>
<table><tr><th>order_id</th><th>tur</th><th>puan</th></tr><tr><td>12</td><td>yemek</td><td>5</td></tr><tr><td>12</td><td>kurye</td><td>4</td></tr></table>
<h2>Yol 1: UNION ALL (her yerde çalışır)</h2>
<pre class="code">SELECT order_id, 'yemek' AS tur, food_score AS puan FROM lk_ratings
UNION ALL
SELECT order_id, 'kurye', courier_score FROM lk_ratings;</pre>
<p>Tabloyu her sütun için bir kez okur. Sütun sayısı azsa en okunur yoldur.</p>
<h2>Yol 2: sabit listeyle CROSS JOIN</h2>
<pre class="code">SELECT r.order_id, t.tur,
       CASE t.tur WHEN 'yemek' THEN r.food_score ELSE r.courier_score END AS puan
FROM lk_ratings r
CROSS JOIN (SELECT 'yemek' AS tur UNION ALL SELECT 'kurye') t;</pre>
<p>Tabloyu bir kez okur; her satırı tür sayısı kadar çoğaltıp CASE ile doğru sütunu seçer.</p>
<h2>Yol 3: SQL türüne özgü operatörler</h2>
<ul><li>SQL Server ve Oracle: <code>UNPIVOT (puan FOR tur IN (food_score, courier_score))</code></li><li>BigQuery: <code>UNPIVOT (puan FOR tur IN (food_score, courier_score))</code></li><li>PostgreSQL: <code>CROSS JOIN LATERAL (VALUES ('yemek', food_score), ('kurye', courier_score)) v(tur, puan)</code></li></ul>
<div class="note"><b>NULL'lara dikkat</b>SQL Server ve Oracle UNPIVOT, değeri NULL olan satırları varsayılan olarak atar; UNION ALL yöntemi ise korur. Sayımlar bu yüzden farklı çıkabilir.</div>
`,
  ex: [
    sq('Değerlendirmeleri uzun formata çevir ve puan türüne göre ortalama (2 basamak): <code>tur</code>, <code>ort</code>.', "SELECT tur, ROUND(AVG(puan), 2) AS ort FROM (SELECT order_id, 'yemek' AS tur, food_score AS puan FROM lk_ratings UNION ALL SELECT order_id, 'kurye', courier_score FROM lk_ratings) t GROUP BY tur;"),
    sq('Uzun formatta her puan türü için 1 ve 2 puan verenlerin oranı (yüzde, 1 basamak): <code>tur</code>, <code>dusuk_oran</code>.', "SELECT tur, ROUND(100.0 * SUM(CASE WHEN puan <= 2 THEN 1 ELSE 0 END) / COUNT(*), 1) AS dusuk_oran FROM (SELECT 'yemek' AS tur, food_score AS puan FROM lk_ratings UNION ALL SELECT 'kurye', courier_score FROM lk_ratings) t GROUP BY tur;"),
    sq('CROSS JOIN yöntemiyle siparişlerin üç tutar sütununu (delivery_fee, discount, tip) uzun formata çevir ve her tutar türünün toplamını getir (tam sayı): <code>tur</code>, <code>toplam</code>.', "SELECT t.tur, ROUND(SUM(CASE t.tur WHEN 'teslimat' THEN o.delivery_fee WHEN 'indirim' THEN o.discount ELSE o.tip END)) AS toplam FROM lk_orders o CROSS JOIN (SELECT 'teslimat' AS tur UNION ALL SELECT 'indirim' UNION ALL SELECT 'bahsis') t GROUP BY t.tur;"),
    sq('Kanat Havayolları: her uçuşun planlanan ve gerçek kalkış saatlerini uzun formata çevir; 1 numaralı uçuş için iki satır: <code>tur</code>, <code>saat</code>. Türe göre sırala.', "SELECT tur, saat FROM (SELECT flight_id, 'planlanan' AS tur, sched_dep AS saat FROM hv_flights UNION ALL SELECT flight_id, 'gercek', actual_dep FROM hv_flights) t WHERE flight_id = 1 ORDER BY tur;", O)
  ]
});

/* ---------- Öğrenme yollarına yerleştir ---------- */
(window.SQLP_PATHS || []).forEach(p => {
  const put = (anchor, id) => { if (p.lessons.includes(id)) return; const i = p.lessons.indexOf(anchor); if (i >= 0) p.lessons.splice(i + 1, 0, id); };
  put('sik-hatalar', 'hata-ayiklama'); put('takvim', 'son-deger'); put('ardisik-seri', 'zaman-araligi'); put('pivot', 'unpivot');
});

/* ---------- Alıştırma bankası: Lezzet Kurye ---------- */
const PR = window.SQLP_PRACTICE; const T = window.SQLP_PRACTICE_TOPICS = window.SQLP_PRACTICE_TOPICS || {}; T.lkp = 'Lezzet Kurye verisi';
const add = (id, Lv, d, title, q, sol, o) => PR.push(Object.assign({ id, L: Lv, t: 'lkp', d, title, q: '<p>' + q + '</p>', sol, type: 'sql' }, o || {}));
/* Temel */
add('y001', 'temel', 1, 'Restoran listesi', 'Restoranların adı, mutfağı ve şehri; ada göre sırala.', 'SELECT name, cuisine, city FROM lk_restaurants ORDER BY name;', O);
add('y002', 'temel', 1, 'Vejetaryen menü', 'Vejetaryen ürün sayısı: <code>adet</code>.', 'SELECT COUNT(*) AS adet FROM lk_menu_items WHERE is_vegetarian = 1;');
add('y003', 'temel', 1, 'Bisikletli kuryeler', 'Bisikletle çalışan kuryelerin adı ve şehri; ada göre sırala.', "SELECT full_name, city FROM lk_couriers WHERE vehicle = 'bisiklet' ORDER BY full_name;", O);
add('y004', 'temel', 1, 'Premium oranı', 'Premium müşterilerin oranı (yüzde, 1 basamak): <code>oran</code>.', 'SELECT ROUND(100.0 * SUM(is_premium) / COUNT(*), 1) AS oran FROM lk_customers;');
add('y005', 'temel', 2, 'Ödeme yöntemleri', 'Ödeme yöntemine göre sipariş sayısı, sayıya göre azalan: <code>payment</code>, <code>siparis</code>.', 'SELECT payment, COUNT(*) AS siparis FROM lk_orders GROUP BY payment ORDER BY siparis DESC;', O);
add('y006', 'temel', 2, 'Kategori fiyatları', 'Menü kategorisine göre en düşük, en yüksek ve ortalama fiyat (tam sayı): <code>category</code>, <code>en_dusuk</code>, <code>en_yuksek</code>, <code>ort</code>.', 'SELECT category, MIN(price) AS en_dusuk, MAX(price) AS en_yuksek, ROUND(AVG(price)) AS ort FROM lk_menu_items GROUP BY category;');
add('y007', 'temel', 2, 'Ücretsiz teslimat', 'Teslimat ücreti 0 olan (400 TL üzeri sepet) siparişlerin sayısı: <code>adet</code>.', 'SELECT COUNT(*) AS adet FROM lk_orders WHERE delivery_fee = 0;');
add('y008', 'temel', 2, 'Yorumlu düşük puanlar', 'Yemek puanı 2 ve altında olup yorum yazılmış değerlendirme sayısı: <code>adet</code>.', 'SELECT COUNT(*) AS adet FROM lk_ratings WHERE food_score <= 2 AND comment IS NOT NULL;');
/* Orta */
add('y101', 'orta', 2, 'Restoran puanları', 'Her restoranın ortalama yemek puanı (2 basamak) ve değerlendirme sayısı; en az 30 değerlendirmesi olanlardan en yüksek 5 (eşitlikte ad): <code>name</code>, <code>puan</code>, <code>degerlendirme</code>.', 'SELECT r.name, ROUND(AVG(t.food_score), 2) AS puan, COUNT(*) AS degerlendirme FROM lk_ratings t JOIN lk_orders o ON o.order_id = t.order_id JOIN lk_restaurants r ON r.restaurant_id = o.restaurant_id GROUP BY r.restaurant_id, r.name HAVING COUNT(*) >= 30 ORDER BY puan DESC, r.name LIMIT 5;', O);
add('y102', 'orta', 2, 'Hazırlık süresi', 'Restoran başına ortalama hazırlık süresi (sipariş → kuryenin alışı, dakika, 1 basamak); en yavaş 5 (eşitlikte ad): <code>name</code>, <code>hazirlik</code>.', "SELECT r.name, ROUND(AVG(ROUND((julianday(o.picked_at) - julianday(o.placed_at)) * 86400)) / 60.0, 1) AS hazirlik FROM lk_orders o JOIN lk_restaurants r ON r.restaurant_id = o.restaurant_id WHERE o.picked_at IS NOT NULL GROUP BY r.restaurant_id, r.name ORDER BY hazirlik DESC, r.name LIMIT 5;", O);
add('y103', 'orta', 2, 'Araca göre hız', 'Araç türüne göre ortalama yolda geçen süre (alış → teslim, dakika, 1 basamak): <code>vehicle</code>, <code>yol</code>.', "SELECT c.vehicle, ROUND(AVG(ROUND((julianday(o.delivered_at) - julianday(o.picked_at)) * 86400)) / 60.0, 1) AS yol FROM lk_orders o JOIN lk_couriers c ON c.courier_id = o.courier_id WHERE o.status = 'teslim' GROUP BY c.vehicle;");
add('y104', 'orta', 2, 'Platform geliri', 'Teslim siparişlerden platformun komisyon geliri: satır tutarı × komisyon / 100, restoran şehrine göre (tam sayı): <code>city</code>, <code>komisyon</code>.', "SELECT r.city, ROUND(SUM(ol.qty * ol.unit_price * r.commission_pct / 100.0)) AS komisyon FROM lk_orders o JOIN lk_order_lines ol ON ol.order_id = o.order_id JOIN lk_restaurants r ON r.restaurant_id = o.restaurant_id WHERE o.status = 'teslim' GROUP BY r.city;");
add('y105', 'orta', 2, 'Saat × gün', 'Hafta içi ve hafta sonu siparişlerin en yoğun saati: <code>tur</code>, <code>saat</code>, <code>siparis</code> (SQLite yazımı; %w 0 = pazar).', "WITH s AS (SELECT CASE WHEN strftime('%w', placed_at) IN ('0', '6') THEN 'hafta sonu' ELSE 'hafta içi' END AS tur, CAST(strftime('%H', placed_at) AS INTEGER) AS saat, COUNT(*) AS siparis FROM lk_orders GROUP BY 1, 2), r AS (SELECT tur, saat, siparis, ROW_NUMBER() OVER (PARTITION BY tur ORDER BY siparis DESC, saat) AS rn FROM s) SELECT tur, saat, siparis FROM r WHERE rn = 1;", { dl: ['sqlite'] });
add('y106', 'orta', 3, 'Geç teslim ve puan', 'Teslim süresi 60 dakikayı aşan ve aşmayan siparişlerin ortalama kurye puanı (2 basamak): <code>gec</code> (1 = geç), <code>puan</code>.', `SELECT CASE WHEN ${SEC} > 3600 THEN 1 ELSE 0 END AS gec, ROUND(AVG(t.courier_score), 2) AS puan FROM lk_orders o JOIN lk_ratings t ON t.order_id = o.order_id WHERE o.status = 'teslim' GROUP BY CASE WHEN ${SEC} > 3600 THEN 1 ELSE 0 END;`);
add('y107', 'orta', 2, 'Davet edilenlerin değeri', 'Davetle gelen ve gelmeyen müşterilerin müşteri başına ortalama sipariş sayısı (2 basamak; hiç siparişi olmayan 0 sayılır): <code>davetli</code>, <code>ort_siparis</code>.', 'WITH m AS (SELECT c.customer_id, CASE WHEN c.referred_by IS NULL THEN 0 ELSE 1 END AS davetli, COUNT(o.order_id) AS n FROM lk_customers c LEFT JOIN lk_orders o ON o.customer_id = c.customer_id GROUP BY c.customer_id, CASE WHEN c.referred_by IS NULL THEN 0 ELSE 1 END) SELECT davetli, ROUND(AVG(n), 2) AS ort_siparis FROM m GROUP BY davetli;');
add('y108', 'orta', 2, 'En popüler ürünler', 'Teslim siparişlerde toplam adede göre en çok satan 5 ürün adı (aynı ad farklı restoranlarda toplanır; eşitlikte ad): <code>name</code>, <code>adet</code>.', "SELECT m.name, SUM(ol.qty) AS adet FROM lk_order_lines ol JOIN lk_menu_items m ON m.item_id = ol.item_id JOIN lk_orders o ON o.order_id = ol.order_id WHERE o.status = 'teslim' GROUP BY m.name ORDER BY adet DESC, m.name LIMIT 5;", O);
/* İleri */
add('y201', 'ileri', 3, 'Aylık elde tutma', 'Ekim\'de sipariş veren müşterilerin yüzde kaçı Kasım\'da, yüzde kaçı Aralık\'ta da sipariş verdi (1 basamak): <code>kasim</code>, <code>aralik</code>.', "WITH e AS (SELECT DISTINCT customer_id FROM lk_orders WHERE placed_at >= '2024-10-01' AND placed_at < '2024-11-01'), k AS (SELECT DISTINCT customer_id FROM lk_orders WHERE placed_at >= '2024-11-01' AND placed_at < '2024-12-01'), a AS (SELECT DISTINCT customer_id FROM lk_orders WHERE placed_at >= '2024-12-01' AND placed_at < '2025-01-01') SELECT ROUND(100.0 * (SELECT COUNT(*) FROM e WHERE customer_id IN (SELECT customer_id FROM k)) / (SELECT COUNT(*) FROM e), 1) AS kasim, ROUND(100.0 * (SELECT COUNT(*) FROM e WHERE customer_id IN (SELECT customer_id FROM a)) / (SELECT COUNT(*) FROM e), 1) AS aralik;");
add('y202', 'ileri', 3, 'Kurye ligi', 'Aralık 2024\'te her şehrin teslim sayısına göre ilk 3 kuryesi (ROW_NUMBER, eşitlikte numara): <code>city</code>, <code>courier_id</code>, <code>teslim</code>. Şehir ve sıraya göre.', "WITH k AS (SELECT c.city, c.courier_id, COUNT(*) AS teslim FROM lk_orders o JOIN lk_couriers c ON c.courier_id = o.courier_id WHERE o.status = 'teslim' AND o.placed_at >= '2024-12-01' GROUP BY c.city, c.courier_id), r AS (SELECT city, courier_id, teslim, ROW_NUMBER() OVER (PARTITION BY city ORDER BY teslim DESC, courier_id) AS rn FROM k) SELECT city, courier_id, teslim FROM r WHERE rn <= 3 ORDER BY city, rn;", O);
add('y203', 'ileri', 3, 'Sepet tutarı dağılımı', 'Teslim siparişlerin sepet tutarı (satır toplamı) medyanı (FLOOR ile taşınabilir; tam sayı): <code>medyan</code>.', "WITH s AS (SELECT o.order_id, SUM(ol.qty * ol.unit_price) AS sepet FROM lk_orders o JOIN lk_order_lines ol ON ol.order_id = o.order_id WHERE o.status = 'teslim' GROUP BY o.order_id), r AS (SELECT sepet, ROW_NUMBER() OVER (ORDER BY sepet, order_id) AS rn, COUNT(*) OVER () AS n FROM s) SELECT ROUND(AVG(sepet)) AS medyan FROM r WHERE rn IN (FLOOR((n + 1) / 2), FLOOR((n + 2) / 2));");
add('y204', 'ileri', 3, 'Birlikte sipariş edilenler', 'Aynı siparişte en sık birlikte görülen iki ürün <b>adı</b> (farklı adlar; çift bir kez; eşitlikte adlar): <code>urun_a</code>, <code>urun_b</code>, <code>birlikte</code>. İlk 3.', 'WITH s AS (SELECT DISTINCT ol.order_id, m.name FROM lk_order_lines ol JOIN lk_menu_items m ON m.item_id = ol.item_id) SELECT a.name AS urun_a, b.name AS urun_b, COUNT(*) AS birlikte FROM s a JOIN s b ON b.order_id = a.order_id AND a.name < b.name GROUP BY a.name, b.name ORDER BY birlikte DESC, urun_a, urun_b LIMIT 3;', O);
add('y205', 'ileri', 3, 'Restoran payının değişimi', 'Her şehirde Ekim ve Aralık 2024 arasında sipariş payı (şehir içindeki pay, yüzde puan) en çok <b>artan</b> restoran (1 basamak): <code>city</code>, <code>name</code>, <code>artis</code>.', "WITH m AS (SELECT r.city, r.name, SUM(CASE WHEN o.placed_at < '2024-11-01' THEN 1 ELSE 0 END) AS ekim, SUM(CASE WHEN o.placed_at >= '2024-12-01' THEN 1 ELSE 0 END) AS aralik FROM lk_orders o JOIN lk_restaurants r ON r.restaurant_id = o.restaurant_id GROUP BY r.city, r.restaurant_id, r.name), p AS (SELECT city, name, 100.0 * aralik / SUM(aralik) OVER (PARTITION BY city) - 100.0 * ekim / SUM(ekim) OVER (PARTITION BY city) AS artis FROM m), r AS (SELECT city, name, artis, ROW_NUMBER() OVER (PARTITION BY city ORDER BY artis DESC, name) AS rn FROM p) SELECT city, name, ROUND(artis, 1) AS artis FROM r WHERE rn = 1 ORDER BY city;", O);
add('y206', 'ileri', 3, 'Davet zincirinin değeri', '214 numaralı müşterinin davet zincirindeki (tüm kuşaklar) kişilerin toplam sipariş sayısı: <code>siparis</code>.', 'WITH RECURSIVE z(customer_id) AS (SELECT customer_id FROM lk_customers WHERE referred_by = 214 UNION ALL SELECT c.customer_id FROM lk_customers c JOIN z ON c.referred_by = z.customer_id) SELECT COUNT(*) AS siparis FROM lk_orders o WHERE o.customer_id IN (SELECT customer_id FROM z);');
})();
