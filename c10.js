/* Kesit SQL içerik 10: seviye içi ek dersler ve sertifika konu dersleri */
(function () {
const L = window.SQLP_LESSONS;
const LM = id => L.find(l => l.id === id);
const after = (id, lessons) => { const i = L.findIndex(l => l.id === id); L.splice(i < 0 ? L.length : i + 1, 0, ...lessons); };
const NR = src => CODE(src, null, { norun: true });
const ORA = (src, v) => CODE(src, v || null, { base: 'oracle' });
const mc = (q, o, a, why) => ({ t: 'mc', q, o, a, why });
const sq = (q, sol, o) => Object.assign({ t: 'sql', q: '<p>' + q + '</p>', sol }, o || {});
const osq = (q, sol, o) => Object.assign({ t: 'sql', base: 'oracle', dl: ['oracle'], q: '<p>' + q + '</p>', sol }, o || {});
const NET = 'oi.quantity * oi.unit_price * (1 - oi.discount)';

/* ============================ TEMEL ============================ */
after('veri-seti', [{
  id: 'sozdizimi', lv: 'A1', mod: 'Temeller', min: 10,
  title: 'SQL yazım kuralları: anahtar kelime, noktalı virgül, yorum ve tırnak',
  sum: 'Bir SQL ifadesinin parçaları, okunabilir yazım ve sık yapılan yazım hataları.',
  body: `
<h2>Bir SQL ifadesinin anatomisi</h2>
<p>SQL, İngilizceye benzeyen bir dildir. Bir sorgu <b>ifadelerden</b> (statement), ifadeler de <b>yan cümlelerden</b> (clause) oluşur: <code>SELECT ...</code>, <code>FROM ...</code>, <code>WHERE ...</code>.</p>
<pre class="code">-- Bu bir yorum satırıdır; motor bu satırı okumaz
SELECT name, price          -- hangi sütunlar?
FROM products               /* hangi tablo? */
WHERE category = 'Kitap'    -- hangi satırlar?
ORDER BY price DESC;        -- hangi sırayla? (; ifadenin sonu)</pre>
<h2>Kurallar</h2>
<table>
<tr><th>Kural</th><th>Açıklama</th></tr>
<tr><td>Büyük/küçük harf</td><td>Anahtar kelimelerde fark etmez: <code>select</code> = <code>SELECT</code>. Okunabilirlik için anahtar kelimeleri BÜYÜK, tablo ve sütunları küçük yazmak yaygındır.</td></tr>
<tr><td>Boşluk ve satır</td><td>Boşluk ve satır sonu fark etmez; uzun sorguları her yan cümle ayrı satırda olacak şekilde yaz.</td></tr>
<tr><td>Noktalı virgül</td><td>İfadenin sonunu gösterir. Birden fazla ifade çalıştırırken zorunludur; tek ifadede çoğu araç affeder.</td></tr>
<tr><td>Metin sabiti</td><td><b>Tek tırnak</b>: <code>'Kitap'</code>. Metnin içinde tek tırnak varsa iki kez yazılır: <code>'Ali''nin'</code>.</td></tr>
<tr><td>Tanımlayıcı</td><td>Boşluk veya ayrılmış kelime içeren tablo/sütun adları için: SQL Server <code>[ad]</code>, PostgreSQL ve Oracle <code>"ad"</code>, MySQL ve BigQuery <code>\`ad\`</code>.</td></tr>
<tr><td>Yorum</td><td>Tek satır <code>-- ...</code>, çok satır <code>/* ... */</code>. MySQL'de <code>#</code> de kullanılır.</td></tr>
<tr><td>Sayılar</td><td>Ondalık ayırıcı noktadır: <code>12.5</code>. Binlik ayırıcı yazılmaz.</td></tr>
</table>
<div class="warn"><b>Çift tırnak tuzağı</b>PostgreSQL ve Oracle'da <code>WHERE city = "İzmir"</code> yazarsan motor “İzmir” adında bir <b>sütun</b> arar ve hata verir. Metinler her zaman tek tırnaklıdır.</div>
<h2>Mantıksal yazım sırası</h2>
<p>Yan cümleler şu sırayla yazılır (hepsi zorunlu değildir): <code>SELECT → FROM → JOIN → WHERE → GROUP BY → HAVING → ORDER BY → LIMIT</code>. Sırayı karıştırmak (WHERE'i GROUP BY'dan sonra yazmak gibi) sözdizimi hatası verir.</p>
<pre class="code">SELECT category, COUNT(*) AS urun
FROM products
WHERE price > 500
GROUP BY category
HAVING COUNT(*) >= 3
ORDER BY urun DESC;</pre>
<div class="tip"><b>Biçimlendir düğmesi</b>Editördeki <b>Biçimlendir</b> düğmesi sorgunu bu kurallara göre otomatik düzenler.</div>
`,
  ex: [
    mc('<p>Aşağıdakilerden hangisi <b>metin sabiti</b> için doğru yazımdır?</p>', ['<code>"Ankara"</code>', "<code>'Ankara'</code>", '<code>[Ankara]</code>', '<code>Ankara</code>'], 1),
    mc("<p>Metin içinde tek tırnak geçen <b>Ali'nin</b> ifadesi SQL'de nasıl yazılır?</p>", ["<code>'Ali'nin'</code>", "<code>'Ali''nin'</code>", "<code>\"Ali'nin\"</code>", "<code>'Ali\\\\'nin'</code> (tüm programlarda)"], 1, 'Standart SQL\'de tırnak iki kez yazılarak kaçırılır.'),
    sq('Yorum satırı ekleyerek Ankara\'daki departmanların adını getir. (Yorum içeriği serbest.)', "-- Ankara departmanları\nSELECT name FROM departments WHERE city = 'Ankara';"),
    sq("Ürün adında tek tırnak geçen bir arama yap: adı <b>27\" Monitör</b> olan ürünün fiyatını getir (çift tırnak burada metnin parçasıdır).", "SELECT price FROM products WHERE name = '27\" Monitör';", { hint: 'Metin tek tırnak içinde olduğu için içindeki çift tırnak sorun değildir.' })
  ]
}]);

after('tarih-fn', [{
  id: 'tarih-filtre', lv: 'A2', mod: 'Fonksiyonlar', min: 14,
  title: 'Tarihlerle filtreleme ve gruplama: aralıklar, aylar, haftanın günleri',
  sum: 'Yarı açık tarih aralığı, saatli sütun tuzağı, ay/yıl/çeyrek gruplama.',
  body: `
<h2>Altın kural: yarı açık aralık</h2>
<p>“2024 yılı” filtresini yazmanın en güvenli yolu <b>başlangıç dahil, bitiş hariç</b> aralıktır:</p>
<pre class="code">SELECT COUNT(*) AS siparis
FROM orders
WHERE order_date >= '2024-01-01'
  AND order_date <  '2025-01-01';</pre>
<p>Neden <code>BETWEEN '2024-01-01' AND '2024-12-31'</code> değil? Sütun <b>saat</b> de içeriyorsa (<code>2024-12-31 14:30</code>) bu değer <code>'2024-12-31'</code>'den büyüktür ve kaçar. Yarı açık aralık her iki durumda da doğrudur.</p>
<div class="warn"><b>Fonksiyon tuzağı</b><code>WHERE YEAR(order_date) = 2024</code> doğru sonuç verir ama sütun bir fonksiyona girdiği için indeks kullanılamaz; büyük tablolarda yavaştır. Aralık yazmak hem doğru hem hızlıdır.</div>
<h2>Saatli sütunda tek gün</h2>
<pre class="code">SELECT COUNT(*) AS olay
FROM web_events
WHERE event_time >= '2024-11-29'
  AND event_time <  '2024-11-30';</pre>
<h2>Döneme göre gruplama</h2>
<table>
<tr><th>Dönem</th><th>SQL Server</th><th>PostgreSQL</th><th>MySQL</th><th>BigQuery</th></tr>
<tr><td>Yıl-ay metni</td><td><code>FORMAT(d, 'yyyy-MM')</code></td><td><code>TO_CHAR(d, 'YYYY-MM')</code></td><td><code>DATE_FORMAT(d, '%Y-%m')</code></td><td><code>FORMAT_DATE('%Y-%m', d)</code></td></tr>
<tr><td>Ay başı tarihi</td><td><code>DATETRUNC(month, d)</code></td><td><code>DATE_TRUNC('month', d)</code></td><td><code>DATE_FORMAT(d, '%Y-%m-01')</code></td><td><code>DATE_TRUNC(d, MONTH)</code></td></tr>
<tr><td>Çeyrek</td><td><code>DATEPART(quarter, d)</code></td><td><code>EXTRACT(QUARTER FROM d)</code></td><td><code>QUARTER(d)</code></td><td><code>EXTRACT(QUARTER FROM d)</code></td></tr>
</table>
<pre class="code">SELECT strftime('%Y', order_date) AS yil,
       CASE WHEN CAST(strftime('%m', order_date) AS INTEGER) <= 3 THEN 1 WHEN CAST(strftime('%m', order_date) AS INTEGER) <= 6 THEN 2 WHEN CAST(strftime('%m', order_date) AS INTEGER) <= 9 THEN 3 ELSE 4 END AS ceyrek,
       COUNT(*) AS siparis
FROM orders
WHERE order_date >= '2023-01-01'
GROUP BY strftime('%Y', order_date), CASE WHEN CAST(strftime('%m', order_date) AS INTEGER) <= 3 THEN 1 WHEN CAST(strftime('%m', order_date) AS INTEGER) <= 6 THEN 2 WHEN CAST(strftime('%m', order_date) AS INTEGER) <= 9 THEN 3 ELSE 4 END
ORDER BY yil, ceyrek;</pre>
<h2>Göreli tarihler</h2>
<p>“Son 30 gün” gibi filtrelerde bugünün tarihi kullanılır: SQL Server <code>DATEADD(day, -30, GETDATE())</code>, PostgreSQL <code>CURRENT_DATE - 30</code>, MySQL <code>CURDATE() - INTERVAL 30 DAY</code>, BigQuery <code>DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)</code>. Bu uygulamadaki veri 2024 sonunda bittiği için alıştırmalarda sabit bir referans tarih (2024-12-31) kullanıyoruz.</p>
<pre class="code">SELECT COUNT(*) AS siparis
FROM orders
WHERE order_date > date('2024-12-31', '-30 days');</pre>
`,
  ex: [
    sq('2024\'ün ikinci yarısında (Temmuz–Aralık) verilen sipariş sayısı: <code>adet</code>. Yarı açık aralık kullan.', "SELECT COUNT(*) AS adet FROM orders WHERE order_date >= '2024-07-01' AND order_date < '2025-01-01';"),
    sq('2024-11-15 günü gerçekleşen web olaylarının sayısı (<code>event_time</code> saat içerir): <code>olay</code>.', "SELECT COUNT(*) AS olay FROM web_events WHERE event_time >= '2024-11-15' AND event_time < '2024-11-16';"),
    sq('2024 siparişlerini çeyreklere göre say: <code>ceyrek</code> (1–4), <code>siparis</code>. Çeyreğe göre sırala.', "SELECT CASE WHEN CAST(strftime('%m', order_date) AS INTEGER) <= 3 THEN 1 WHEN CAST(strftime('%m', order_date) AS INTEGER) <= 6 THEN 2 WHEN CAST(strftime('%m', order_date) AS INTEGER) <= 9 THEN 3 ELSE 4 END AS ceyrek, COUNT(*) AS siparis FROM orders WHERE order_date >= '2024-01-01' AND order_date < '2025-01-01' GROUP BY CASE WHEN CAST(strftime('%m', order_date) AS INTEGER) <= 3 THEN 1 WHEN CAST(strftime('%m', order_date) AS INTEGER) <= 6 THEN 2 WHEN CAST(strftime('%m', order_date) AS INTEGER) <= 9 THEN 3 ELSE 4 END ORDER BY ceyrek;", { ord: true }),
    mc("<p><code>event_time</code> sütunu saat içeriyorsa <code>WHERE event_time BETWEEN '2024-11-01' AND '2024-11-30'</code> ne yapar?</p>", ['Kasım\'ın tamamını getirir', '30 Kasım\'ın 00:00\'dan sonraki olaylarını kaçırır', 'Hata verir', 'Ekim\'i de getirir'], 1)
  ]
}, {
  id: 'toplama-tuzak', lv: 'A2', mod: 'Özetleme', min: 12,
  title: 'Toplama fonksiyonlarında tuzaklar: COUNT türleri, NULL ve tam sayı bölmesi',
  sum: 'COUNT(*) / COUNT(sütun) / COUNT(DISTINCT), AVG ve NULL, oran hesaplarken bölme.',
  body: `
<h2>Üç farklı COUNT</h2>
<pre class="code">SELECT COUNT(*)              AS satir,        -- tüm satırlar
       COUNT(email)          AS email_dolu,   -- NULL olmayan e-postalar
       COUNT(DISTINCT city)  AS farkli_sehir  -- NULL hariç tekrarsız şehir
FROM customers;</pre>
<h2>AVG ve NULL</h2>
<p><code>AVG</code>, NULL değerleri <b>yok sayar</b>; paydaya da katmaz. NULL'ları 0 saymak istiyorsan açıkça yaz: <code>AVG(COALESCE(x, 0))</code>. Sonuçlar farklı olabilir ve hangisinin doğru olduğu iş sorusuna bağlıdır.</p>
<h2>Tam sayı bölmesi</h2>
<p>SQL Server, PostgreSQL ve SQLite'ta iki tam sayının bölümü tam sayıdır: <code>7 / 2 = 3</code>. Oran hesaplarken bir tarafı ondalığa çevir:</p>
<pre class="code">SELECT ROUND(100.0 * SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) / COUNT(*), 1) AS iptal_orani
FROM orders;</pre>
<p>MySQL, Oracle ve BigQuery'de <code>/</code> her zaman ondalık sonuç verir; ama taşınabilir yazmak için <code>100.0 *</code> alışkanlığı iyidir.</p>
<h2>Boş grupta SUM</h2>
<p>Hiç satır yoksa <code>SUM</code> 0 değil <b>NULL</b> döner; <code>COUNT</code> ise 0 döner. Raporlarda <code>COALESCE(SUM(x), 0)</code> yazılır.</p>
<pre class="code">SELECT COUNT(*) AS adet, SUM(quantity) AS toplam, COALESCE(SUM(quantity), 0) AS toplam_0
FROM order_items
WHERE order_id = -1;</pre>
<h2>Ortalamaların ortalaması</h2>
<p>Kategori ortalamalarının ortalaması, tüm ürünlerin ortalamasına eşit değildir (kategorilerdeki ürün sayıları farklıysa). Doğru ağırlıklı ortalama için ham veriden hesapla.</p>
`,
  ex: [
    sq('Çalışan tablosunda toplam satır (<code>satir</code>), e-postası dolu çalışan (<code>email_var</code>) ve farklı unvan sayısı (<code>unvan</code>).', 'SELECT COUNT(*) AS satir, COUNT(email) AS email_var, COUNT(DISTINCT title) AS unvan FROM employees;'),
    sq('Her segmentte e-postası boş müşterilerin oranı (%, 1 basamak): <code>segment</code>, <code>bos_oran</code>.', 'SELECT segment, ROUND(100.0 * SUM(CASE WHEN email IS NULL THEN 1 ELSE 0 END) / COUNT(*), 1) AS bos_oran FROM customers GROUP BY segment;'),
    sq('Kategori ortalamalarının ortalamasını (<code>ort_ort</code>) ve tüm ürünlerin ortalama fiyatını (<code>genel_ort</code>) 2 basamakla yan yana getir.', 'SELECT ROUND((SELECT AVG(o) FROM (SELECT AVG(price) AS o FROM products GROUP BY category) AS k), 2) AS ort_ort, ROUND(AVG(price), 2) AS genel_ort FROM products;'),
    mc('<p>Hiç satırı olmayan bir grupta <code>SUM(x)</code> ne döner?</p>', ['0', 'NULL', 'Hata', 'Boş metin'], 1)
  ]
}]);

/* ============================ ORTA ============================ */
after('correlated', [{
  id: 'exists-anyall', lv: 'B1', mod: 'Küme ve Alt Sorgular', min: 15,
  title: 'EXISTS, NOT EXISTS, ANY ve ALL: yarı ve karşıt birleştirmeler',
  sum: 'Var mı / yok mu soruları, NOT IN ve NULL tuzağı, ANY/ALL ile karşılaştırma.',
  body: `
<h2>EXISTS: “en az bir tane var mı?”</h2>
<p><code>EXISTS (alt sorgu)</code>, alt sorgu en az bir satır döndürürse doğrudur. Alt sorgunun SELECT listesi önemsizdir (<code>SELECT 1</code> yazılır). Bu desene <b>yarı birleştirme</b> (semi-join) denir: müşteri satırı çoğalmaz.</p>
<pre class="code">-- En az bir iade siparişi olan müşteriler
SELECT c.customer_id, c.first_name
FROM customers c
WHERE EXISTS (SELECT 1 FROM orders o
              WHERE o.customer_id = c.customer_id AND o.status = 'returned')
ORDER BY c.customer_id
LIMIT 5;</pre>
<h2>NOT EXISTS: karşıt birleştirme</h2>
<pre class="code">-- Hiç sipariş vermemiş müşteriler
SELECT COUNT(*) AS siparissiz
FROM customers c
WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id);</pre>
<div class="warn"><b>NOT IN ve NULL</b><code>WHERE x NOT IN (SELECT y ...)</code> listesinde tek bir NULL varsa koşul hiçbir satır için doğru olmaz ve sonuç boş döner. <code>NOT EXISTS</code> bu tuzağa düşmez. Alışkanlık edin: “yok mu?” sorularında NOT EXISTS.</div>
<pre class="code">-- Departmanı olmayan çalışan (dept_id NULL) yüzünden boş sonuç:
SELECT name FROM departments
WHERE dept_id NOT IN (SELECT dept_id FROM employees);</pre>
<pre class="code">-- Doğrusu
SELECT name FROM departments d
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE e.dept_id = d.dept_id);</pre>
<h2>ANY / SOME ve ALL</h2>
<p>Bir değeri alt sorgunun döndürdüğü <b>listeyle</b> karşılaştırır. Oracle sertifika sınavında sık sorulur.</p>
<table>
<tr><th>İfade</th><th>Anlamı</th><th>Eşdeğeri</th></tr>
<tr><td><code>x &gt; ALL (liste)</code></td><td>listedeki her değerden büyük</td><td><code>x &gt; MAX(liste)</code></td></tr>
<tr><td><code>x &gt; ANY (liste)</code></td><td>en az birinden büyük</td><td><code>x &gt; MIN(liste)</code></td></tr>
<tr><td><code>x &lt; ALL (liste)</code></td><td>hepsinden küçük</td><td><code>x &lt; MIN(liste)</code></td></tr>
<tr><td><code>x = ANY (liste)</code></td><td>listede var</td><td><code>x IN (liste)</code></td></tr>
<tr><td><code>x &lt;&gt; ALL (liste)</code></td><td>listede yok</td><td><code>x NOT IN (liste)</code></td></tr>
</table>
${CODE("SELECT name, price\nFROM products\nWHERE price > ALL (SELECT price FROM products WHERE category = 'Kitap')\n  AND category = 'Giyim'\nORDER BY price;", { sqlite: "-- SQLite ANY/ALL desteklemez; MAX ile eşdeğeri:\nSELECT name, price\nFROM products\nWHERE price > (SELECT MAX(price) FROM products WHERE category = 'Kitap')\n  AND category = 'Giyim'\nORDER BY price;", bq: "-- BigQuery ANY/ALL alt sorgusunu desteklemez; MAX ile eşdeğeri:\nSELECT name, price\nFROM products\nWHERE price > (SELECT MAX(price) FROM products WHERE category = 'Kitap')\n  AND category = 'Giyim'\nORDER BY price;" }, { base: 'pg' })}
<div class="note"><b>Boş liste</b><code>x &gt; ALL (boş)</code> her zaman doğrudur, <code>x &gt; ANY (boş)</code> her zaman yanlıştır. MAX/MIN eşdeğerinde boş liste NULL verir; bu ince farka dikkat.</div>
`,
  ex: [
    sq('Hiç iade (<code>returned</code>) edilmemiş siparişlerde satılmış ürün sayısı değil, <b>hiç iade edilen bir siparişte yer almamış</b> ürünlerin sayısı: <code>urun</code>.', "SELECT COUNT(*) AS urun FROM products p WHERE NOT EXISTS (SELECT 1 FROM order_items oi JOIN orders o ON o.order_id = oi.order_id WHERE oi.product_id = p.product_id AND o.status = 'returned');"),
    sq('Hem mobil hem mağaza (<code>store</code>) kanalından sipariş vermiş müşteri sayısı (EXISTS ile): <code>musteri</code>.', "SELECT COUNT(*) AS musteri FROM customers c WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id AND o.channel = 'mobile') AND EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id AND o.channel = 'store');"),
    sq('Fiyatı, Kozmetik kategorisindeki <b>tüm</b> ürünlerden yüksek olan Ev &amp; Yaşam ürünleri: <code>name</code>, <code>price</code> (ALL veya MAX ile).', "SELECT name, price FROM products WHERE category = 'Ev & Yaşam' AND price > (SELECT MAX(price) FROM products WHERE category = 'Kozmetik');"),
    mc('<p><code>WHERE dept_id NOT IN (SELECT dept_id FROM employees)</code> neden boş sonuç döndürebilir?</p>', ['Alt sorgu çok yavaş olduğu için', 'Alt sorgunun sonucunda NULL varsa NOT IN koşulu hiçbir satır için doğru olmaz', 'NOT IN yalnızca sayılarla çalıştığı için', 'Yanlış yazım'], 1),
    mc('<p><code>salary &lt; ANY (SELECT salary FROM ...)</code> neye eşdeğerdir?</p>', ['salary &lt; MIN(...)', 'salary &lt; MAX(...)', 'salary NOT IN (...)', 'salary = ALL (...)'], 1)
  ]
}, {
  id: 'join-ozet', lv: 'B1', mod: 'Tabloları Birleştirme', min: 14,
  title: 'JOIN ile özetleme: satır çoğalması ve önce özetle sonra birleştir',
  sum: 'Bire-çok birleştirmede toplamların şişmesi ve doğru sıralama.',
  body: `
<h2>Sorun: şişen toplamlar</h2>
<p>Müşteri tablosunu siparişlerle, siparişleri satırlarla birleştirdiğinde her müşteri, sipariş satırı kadar tekrar eder. Bu satırlarda müşteri düzeyindeki bir değeri (ör. sipariş sayısı) toplarsan sonuç şişer.</p>
<pre class="code">-- YANLIŞ: sipariş sayısı satır sayısı kadar şişiyor
SELECT c.segment, COUNT(o.order_id) AS siparis
FROM customers c
JOIN orders o       ON o.customer_id = c.customer_id
JOIN order_items oi ON oi.order_id = o.order_id
GROUP BY c.segment;</pre>
<pre class="code">-- DOĞRU 1: tekrarsız say
SELECT c.segment, COUNT(DISTINCT o.order_id) AS siparis
FROM customers c
JOIN orders o       ON o.customer_id = c.customer_id
JOIN order_items oi ON oi.order_id = o.order_id
GROUP BY c.segment;</pre>
<h2>Önce özetle, sonra birleştir</h2>
<p>İki farklı ayrıntı düzeyindeki ölçüyü (sipariş sayısı ve ciro) birlikte istiyorsan her birini kendi düzeyinde özetleyip sonra birleştir:</p>
<pre class="code">WITH s AS (                       -- müşteri başına sipariş sayısı
  SELECT customer_id, COUNT(*) AS siparis FROM orders GROUP BY customer_id
), c AS (                         -- müşteri başına net ciro
  SELECT o.customer_id, SUM(${NET}) AS ciro
  FROM orders o JOIN order_items oi ON oi.order_id = o.order_id
  WHERE o.status = 'delivered'
  GROUP BY o.customer_id
)
SELECT s.customer_id, s.siparis, ROUND(c.ciro, 0) AS ciro
FROM s JOIN c ON c.customer_id = s.customer_id
ORDER BY ciro DESC
LIMIT 5;</pre>
<div class="tip"><b>Sağlama</b>Birleştirmeden önce ve sonra satır sayısını ve bir toplamı karşılaştır. Tutmuyorsa bir yerde çoğalma vardır.</div>
<h2>Ayrıntı düzeyi (grain)</h2>
<p>Her tablonun bir satırı neyi temsil eder? <code>orders</code>: bir sipariş; <code>order_items</code>: bir sipariş satırı. Sorgunun sonucundaki bir satırın neyi temsil edeceğini önceden söylemek, çoğalma hatalarının çoğunu önler.</p>
`,
  ex: [
    sq('Her kanal için sipariş sayısı (<code>siparis</code>) ve satılan toplam ürün adedi (<code>adet</code>): <code>channel</code>, <code>siparis</code>, <code>adet</code>. Sipariş sayısı şişmesin.', 'SELECT o.channel, COUNT(DISTINCT o.order_id) AS siparis, SUM(oi.quantity) AS adet FROM orders o JOIN order_items oi ON oi.order_id = o.order_id GROUP BY o.channel;'),
    sq(`Her segment için müşteri sayısı (tüm müşteriler) ve teslim edilen net ciro (tam sayı, yoksa 0): <code>segment</code>, <code>musteri</code>, <code>ciro</code>. Önce müşteri başına ciroyu hesapla.`, `WITH c AS (SELECT o.customer_id, SUM(${NET}) AS ciro FROM orders o JOIN order_items oi ON oi.order_id = o.order_id WHERE o.status = 'delivered' GROUP BY o.customer_id) SELECT cu.segment, COUNT(*) AS musteri, ROUND(COALESCE(SUM(c.ciro), 0), 0) AS ciro FROM customers cu LEFT JOIN c ON c.customer_id = cu.customer_id GROUP BY cu.segment;`),
    mc('<p>Siparişleri satırlarla birleştirip <code>COUNT(o.order_id)</code> ile sipariş saydın; sonuç beklenenden büyük. Neden?</p>', ['COUNT NULL saydığı için', 'Her sipariş, satır sayısı kadar tekrar ettiği için', 'GROUP BY eksik olduğu için', 'İndeks olmadığı için'], 1)
  ]
}]);

after('ntile-dist', [{
  id: 'first-last', lv: 'B2', mod: 'Pencere Fonksiyonları', min: 13,
  title: 'FIRST_VALUE, LAST_VALUE, NTH_VALUE ve varsayılan çerçeve tuzağı',
  sum: 'Bölümdeki ilk/son/n. değere erişim ve ROWS BETWEEN ... UNBOUNDED FOLLOWING.',
  body: `
<h2>Bölümün ilk değeri</h2>
<pre class="code">SELECT category, name, price,
       FIRST_VALUE(name) OVER (PARTITION BY category ORDER BY price) AS en_ucuz
FROM products
WHERE category IN ('Kitap', 'Hediye');</pre>
<h2>LAST_VALUE neden yanlış görünür?</h2>
<p>ORDER BY içeren bir pencerenin <b>varsayılan çerçevesi</b> “bölümün başından bu satıra kadar”dır (<code>RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW</code>). Bu yüzden <code>LAST_VALUE</code> çoğu zaman satırın kendisini döndürür. Bölümün gerçek son değeri için çerçeveyi açıkça genişlet:</p>
<pre class="code">SELECT category, name, price,
       LAST_VALUE(name) OVER (PARTITION BY category ORDER BY price) AS yanlis_son,
       LAST_VALUE(name) OVER (PARTITION BY category ORDER BY price
                              ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS dogru_son
FROM products
WHERE category = 'Kitap';</pre>
<div class="tip"><b>Pratik çözüm</b>Son değeri, sıralamayı ters çevirip <code>FIRST_VALUE</code> ile almak çerçeve derdinden kurtarır: <code>FIRST_VALUE(name) OVER (PARTITION BY category ORDER BY price DESC)</code>.</div>
<h2>NTH_VALUE</h2>
<pre class="code">SELECT DISTINCT category,
       NTH_VALUE(name, 2) OVER (PARTITION BY category ORDER BY price DESC
                                ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS ikinci_pahali
FROM products;</pre>
<p>NTH_VALUE; SQL Server'da (2022 dahil) yoktur, orada <code>ROW_NUMBER</code> ile n. satır seçilir.</p>
`,
  ex: [
    sq('Her müşterinin her siparişi yanında o müşterinin <b>ilk</b> sipariş tarihini göster; yalnızca 1–3 numaralı müşteriler: <code>customer_id</code>, <code>order_id</code>, <code>ilk_tarih</code>.', 'SELECT customer_id, order_id, FIRST_VALUE(order_date) OVER (PARTITION BY customer_id ORDER BY order_date, order_id) AS ilk_tarih FROM orders WHERE customer_id <= 3;'),
    sq('Her kategoride ürün adı ve kategorinin <b>en pahalı</b> ürününün adı (çerçeve tuzağına düşmeden): <code>category</code>, <code>name</code>, <code>en_pahali</code>.', 'SELECT category, name, FIRST_VALUE(name) OVER (PARTITION BY category ORDER BY price DESC, product_id) AS en_pahali FROM products;'),
    mc('<p><code>LAST_VALUE(x) OVER (ORDER BY d)</code> neden çoğu satırda satırın kendi değerini döndürür?</p>', ['LAST_VALUE hatalı bir fonksiyondur', 'Varsayılan çerçeve bölüm başından mevcut satıra kadar olduğu için', 'PARTITION BY yazılmadığı için', 'DISTINCT gerektiği için'], 1)
  ]
}, {
  id: 'ardisik-seri', lv: 'B2', mod: 'İleri Sorgu Yapıları', min: 15,
  title: 'Boşluklar ve adalar: ardışık serileri bulmak',
  sum: 'ROW_NUMBER farkı yöntemiyle ardışık gün/ay serileri ve kesintiler.',
  body: `
<h2>Problem</h2>
<p>“Müşteri kaç ay üst üste alışveriş yaptı?”, “Sensör hangi aralıklarda veri göndermedi?” gibi sorular <b>boşluklar ve adalar</b> (gaps and islands) problemidir. Ada: kesintisiz bir seri; boşluk: iki seri arasındaki kesinti.</p>
<h2>ROW_NUMBER farkı yöntemi</h2>
<p>Ardışık değerlerden sıra numarasını çıkarırsan, aynı serideki tüm satırlar <b>aynı sabiti</b> verir:</p>
<table>
<tr><th>ay no</th><th>sıra</th><th>fark</th></tr>
<tr><td>24291</td><td>1</td><td>24290</td></tr>
<tr><td>24292</td><td>2</td><td>24290</td></tr>
<tr><td>24295</td><td>3</td><td>24292</td></tr>
<tr><td>24296</td><td>4</td><td>24292</td></tr>
</table>
<pre class="code">WITH m AS (               -- 1 numaralı müşterinin sipariş verdiği aylar (ay numarası)
  SELECT DISTINCT CAST(strftime('%Y', order_date) AS INTEGER) * 12
                + CAST(strftime('%m', order_date) AS INTEGER) AS ay_no,
         strftime('%Y-%m', order_date) AS ay
  FROM orders WHERE customer_id = 1
), g AS (
  SELECT ay, ay_no - ROW_NUMBER() OVER (ORDER BY ay_no) AS grp FROM m
)
SELECT MIN(ay) AS baslangic, MAX(ay) AS bitis, COUNT(*) AS ay_sayisi
FROM g
GROUP BY grp
ORDER BY baslangic;</pre>
<h2>Boşlukları bulmak: LEAD</h2>
<pre class="code">WITH m AS (
  SELECT DISTINCT order_date AS gun FROM orders
  WHERE order_date >= '2024-12-01' AND order_date < '2025-01-01'
)
SELECT gun AS son_dolu, LEAD(gun) OVER (ORDER BY gun) AS sonraki_dolu
FROM m;</pre>
<p>Sonraki dolu gün ile aradaki fark 1'den büyükse arada boşluk vardır.</p>
`,
  ex: [
    sq('Aralık 2024\'te sipariş <b>olmayan</b> gün var mı? Sipariş olan günleri sırala ve bir sonraki dolu güne kadar 1 günden fazla ara olan satırları getir: <code>gun</code>, <code>sonraki</code>.', "WITH m AS (SELECT DISTINCT order_date AS gun FROM orders WHERE order_date >= '2024-12-01' AND order_date < '2025-01-01'), n AS (SELECT gun, LEAD(gun) OVER (ORDER BY gun) AS sonraki FROM m) SELECT gun, sonraki FROM n WHERE julianday(sonraki) - julianday(gun) > 1;"),
    sq('2 numaralı müşterinin ardışık sipariş aylarını seriler halinde getir: <code>baslangic</code>, <code>bitis</code>, <code>ay_sayisi</code>. Başlangıca göre sırala.', "WITH m AS (SELECT DISTINCT CAST(strftime('%Y', order_date) AS INTEGER) * 12 + CAST(strftime('%m', order_date) AS INTEGER) AS n, strftime('%Y-%m', order_date) AS ay FROM orders WHERE customer_id = 2), g AS (SELECT ay, n - ROW_NUMBER() OVER (ORDER BY n) AS grp FROM m) SELECT MIN(ay) AS baslangic, MAX(ay) AS bitis, COUNT(*) AS ay_sayisi FROM g GROUP BY grp ORDER BY baslangic;", { ord: true }),
    mc('<p>Ardışık tarihlerden ROW_NUMBER çıkarıldığında aynı serideki satırlar için ne olur?</p>', ['Hepsi farklı değer alır', 'Hepsi aynı sabit değeri alır', 'NULL olur', 'Sıfır olur'], 1)
  ]
}]);

/* ============================ İLERİ ============================ */
after('alter-drop', [{
  id: 'kisitlar', lv: 'C1', mod: 'Veritabanı Tasarımı', min: 15,
  title: 'Kısıtlar ayrıntılı: NOT NULL, UNIQUE, CHECK, DEFAULT, FOREIGN KEY eylemleri',
  sum: 'Veri bütünlüğünü veritabanında güvenceye almak; ON DELETE CASCADE / SET NULL.',
  body: `
<h2>Neden kısıt?</h2>
<p>Uygulama kodu değişir, farklı ekipler aynı tabloya yazar; ama kısıtlar <b>her zaman</b> çalışır. Bozuk veri bir kez girdiğinde temizlemek, girmesini engellemekten çok daha pahalıdır.</p>
<table>
<tr><th>Kısıt</th><th>Ne sağlar?</th></tr>
<tr><td><code>NOT NULL</code></td><td>Değer boş olamaz</td></tr>
<tr><td><code>UNIQUE</code></td><td>Değer tekrar edemez (NULL'lar çoğu programda birden fazla olabilir)</td></tr>
<tr><td><code>PRIMARY KEY</code></td><td>NOT NULL + UNIQUE; satırın kimliği</td></tr>
<tr><td><code>CHECK (koşul)</code></td><td>Koşulu sağlamayan değer reddedilir</td></tr>
<tr><td><code>DEFAULT</code></td><td>Değer verilmezse kullanılacak varsayılan (kısıt değil, sütun özelliği)</td></tr>
<tr><td><code>FOREIGN KEY</code></td><td>Değer başka tablodaki bir anahtarda bulunmalı</td></tr>
</table>
<pre class="code" data-na="bq">CREATE TABLE kampanya (
  kampanya_id INTEGER PRIMARY KEY,
  kod         TEXT NOT NULL UNIQUE,
  indirim     REAL NOT NULL CHECK (indirim > 0 AND indirim <= 0.5),
  baslangic   TEXT NOT NULL,
  bitis       TEXT NOT NULL,
  aktif       INTEGER DEFAULT 1,
  CHECK (bitis >= baslangic)
);
INSERT INTO kampanya (kampanya_id, kod, indirim, baslangic, bitis) VALUES (1, 'YILBASI', 0.2, '2024-12-20', '2025-01-05');
SELECT * FROM kampanya;</pre>
<pre class="code" data-err data-na="bq">-- CHECK ihlali: indirim %60 olamaz
INSERT INTO kampanya (kampanya_id, kod, indirim, baslangic, bitis) VALUES (2, 'HATA', 0.6, '2024-12-01', '2024-12-10');</pre>
<h2>Yabancı anahtar eylemleri</h2>
<p>Ana tablodaki bir satır silinince veya anahtarı değişince alt tablodaki satırlara ne olacağını belirler:</p>
<table>
<tr><th>Eylem</th><th>Davranış</th></tr>
<tr><td><code>NO ACTION</code> / <code>RESTRICT</code> (varsayılan)</td><td>Bağlı satır varsa silme reddedilir</td></tr>
<tr><td><code>ON DELETE CASCADE</code></td><td>Bağlı satırlar da silinir (sipariş silinince satırları)</td></tr>
<tr><td><code>ON DELETE SET NULL</code></td><td>Bağlı satırların yabancı anahtarı NULL olur (yönetici ayrılınca)</td></tr>
<tr><td><code>ON DELETE SET DEFAULT</code></td><td>Varsayılan değere döner (her programda yok)</td></tr>
</table>
${NR("CREATE TABLE siparis_satiri (\n  satir_id   INT PRIMARY KEY,\n  siparis_id INT NOT NULL,\n  CONSTRAINT fk_satir_siparis FOREIGN KEY (siparis_id)\n    REFERENCES siparis (siparis_id) ON DELETE CASCADE\n);\n\n-- Kısıtı sonradan eklemek ve kaldırmak\nALTER TABLE products ADD CONSTRAINT ck_fiyat CHECK (price >= cost);\nALTER TABLE products DROP CONSTRAINT ck_fiyat;")}
<div class="note"><b>Programlara göre</b>MySQL CHECK kısıtını 8.0.16'dan beri uygular; daha eski sürümler sessizce yok sayardı. Oracle'da NOT NULL yalnızca sütun düzeyinde (inline) yazılabilir ve kısıtlar <code>DEFERRABLE</code> yapılarak işlem sonunda denetlenebilir. BigQuery'de PRIMARY/FOREIGN KEY yalnızca bilgi amaçlıdır (NOT ENFORCED), UNIQUE ve CHECK yoktur.</div>
<div class="tip"><b>Kısıtlara ad ver</b><code>CONSTRAINT ck_fiyat CHECK (...)</code> gibi adlandırılmış kısıtlar hata mesajlarında anlaşılır görünür ve kolayca kaldırılır.</div>
`,
  ex: [
    sq('<code>uye</code> adında bir tablo oluştur: <code>uye_id</code> (birincil anahtar), <code>email</code> (boş olamaz, tekil), <code>yas</code> (18 veya üstü olmalı, CHECK). Ardından (1, \'a@x.com\', 25) satırını ekle ve tabloyu sorgula.', "CREATE TABLE uye (uye_id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE, yas INTEGER CHECK (yas >= 18)); INSERT INTO uye VALUES (1, 'a@x.com', 25); SELECT * FROM uye;", { dl: ['tsql', 'pg', 'mysql', 'oracle', 'sqlite'] }),
    mc('<p>Bir sipariş silindiğinde satırlarının da otomatik silinmesi için yabancı anahtara ne eklenir?</p>', ['<code>ON DELETE SET NULL</code>', '<code>ON DELETE CASCADE</code>', '<code>ON UPDATE NO ACTION</code>', '<code>DEFAULT NULL</code>'], 1),
    mc('<p>Bir çalışan silindiğinde, ona bağlı çalışanların <code>manager_id</code> değerinin boşalması için hangisi uygundur?</p>', ['<code>ON DELETE CASCADE</code>', '<code>ON DELETE SET NULL</code>', '<code>CHECK (manager_id IS NULL)</code>', '<code>UNIQUE (manager_id)</code>'], 1),
    mc('<p>Hangisi bir kısıt <b>değildir</b>?</p>', ['CHECK', 'UNIQUE', 'DEFAULT', 'FOREIGN KEY'], 2, 'DEFAULT bir değer sağlar ama hiçbir değeri reddetmez; birçok kaynak yine de kısıtlarla birlikte anlatır (SQL Server onu DEFAULT constraint olarak saklar).')
  ]
}]);

after('view', [{
  id: 'view-ileri', lv: 'C1', mod: 'Veritabanı Tasarımı', min: 13,
  title: 'Görünümler ileri: güncellenebilir view, WITH CHECK OPTION, materialized view',
  sum: 'Hangi view\'a INSERT/UPDATE yapılabilir, veri hazır saklayan görünümler ve yenileme.',
  body: `
<h2>Güncellenebilir görünüm</h2>
<p>Tek tabloya dayanan, GROUP BY / DISTINCT / toplama / pencere fonksiyonu içermeyen basit görünümler üzerinden INSERT, UPDATE ve DELETE yapılabilir; değişiklik alttaki tabloya yansır.</p>
${NR("CREATE VIEW v_kitap AS\nSELECT product_id, name, price, category\nFROM products\nWHERE category = 'Kitap';\n\nUPDATE v_kitap SET price = price * 1.05;   -- products tablosundaki kitaplar güncellenir")}
<h2>WITH CHECK OPTION</h2>
<p>Görünümün filtresine uymayan satırların görünüm üzerinden eklenmesini veya değiştirilmesini engeller:</p>
${NR("CREATE VIEW v_kitap AS\nSELECT product_id, name, price, category\nFROM products\nWHERE category = 'Kitap'\nWITH CHECK OPTION;\n\n-- Hata: satır görünümün dışına çıkardı\nUPDATE v_kitap SET category = 'Elektronik' WHERE product_id = 9;")}
<p>Oracle'da ayrıca <code>WITH READ ONLY</code> görünümü salt okunur yapar, <code>CREATE FORCE VIEW</code> tablo henüz yokken görünüm oluşturur.</p>
<h2>Materialized view (somut görünüm)</h2>
<p>Normal görünüm her sorguda yeniden hesaplanır. <b>Materialized view</b> sonucu diskte saklar; okunması hızlıdır ama veriler değiştikçe <b>yenilenmesi</b> gerekir.</p>
<table>
<tr><th>Program</th><th>Nasıl?</th></tr>
<tr><td>PostgreSQL</td><td><code>CREATE MATERIALIZED VIEW</code>, <code>REFRESH MATERIALIZED VIEW [CONCURRENTLY]</code></td></tr>
<tr><td>Oracle</td><td><code>CREATE MATERIALIZED VIEW ... REFRESH FAST|COMPLETE ON COMMIT|DEMAND</code>, sorgu yeniden yazma (query rewrite)</td></tr>
<tr><td>SQL Server</td><td><b>Indexed view</b>: <code>WITH SCHEMABINDING</code> ile görünüm + benzersiz kümelenmiş indeks; otomatik güncel tutulur</td></tr>
<tr><td>BigQuery, Snowflake</td><td><code>CREATE MATERIALIZED VIEW</code>; artımlı ve otomatik yenileme</td></tr>
<tr><td>MySQL</td><td>Yok; özet tablo + zamanlanmış olay (EVENT) ile taklit edilir</td></tr>
</table>
${NR("-- PostgreSQL\nCREATE MATERIALIZED VIEW mv_aylik_ciro AS\nSELECT date_trunc('month', o.order_date) AS ay,\n       SUM(oi.quantity * oi.unit_price * (1 - oi.discount)) AS ciro\nFROM orders o JOIN order_items oi ON oi.order_id = o.order_id\nWHERE o.status = 'delivered'\nGROUP BY 1;\n\nCREATE UNIQUE INDEX ON mv_aylik_ciro (ay);\nREFRESH MATERIALIZED VIEW CONCURRENTLY mv_aylik_ciro;   -- okuyanları kilitlemeden yenile")}
<div class="tip"><b>Ne zaman?</b>Pahalı ve sık okunan, ama birkaç dakika/saat eski olmasında sakınca olmayan raporlar için. Gerçek zamanlı doğruluk gereken yerde normal görünüm veya indeks tercih edilir.</div>
`,
  ex: [
    mc('<p>Hangi görünüm üzerinden <b>UPDATE yapılamaz</b>?</p>', ['Tek tablodan sütun seçen görünüm', 'WHERE filtresi olan tek tablo görünümü', 'GROUP BY ile kategori toplamlarını gösteren görünüm', 'Takma adlı sütunları olan tek tablo görünümü'], 2),
    mc('<p><code>WITH CHECK OPTION</code> neyi engeller?</p>', ['Görünümün silinmesini', 'Görünümün filtresine uymayan satırların görünüm üzerinden eklenmesini veya o duruma getirilmesini', 'SELECT * kullanımını', 'İndeks oluşturmayı'], 1),
    mc('<p>Materialized view\'ın normal view\'dan temel farkı nedir?</p>', ['Sonucu diskte saklar ve yenilenmesi gerekir', 'Yalnızca tek tabloya dayanabilir', 'Güncellenemez', 'Yalnızca Oracle\'da vardır'], 0),
    sq('Normal bir görünüm oluştur: <code>v_kategori_ozet</code> (category, urun sayısı <code>urun</code>, ortalama fiyat <code>ort</code> 2 basamak) ve görünümden ortalama fiyatı 1000\'den büyük kategorileri getir.', 'CREATE VIEW v_kategori_ozet AS SELECT category, COUNT(*) AS urun, ROUND(AVG(price), 2) AS ort FROM products GROUP BY category; SELECT * FROM v_kategori_ozet WHERE ort > 1000;')
  ]
}]);

after('performans', [{
  id: 'sargable', lv: 'C1', mod: 'Performans', min: 14,
  title: 'Hızlı sorgu yazmak: SARGable koşullar ve sık yapılan performans hataları',
  sum: 'İndeksin kullanılabildiği koşullar, fonksiyonlu sütun, OR, LIKE \'%x\', SELECT *.',
  body: `
<h2>SARGable ne demek?</h2>
<p><b>S</b>earch <b>ARG</b>ument-<b>able</b>: indeks üzerinde arama yapılabilen koşul. Kural basit: <b>sütunu yalnız bırak</b>. Sütun bir fonksiyonun veya işlemin içine girerse motor her satırı tek tek hesaplamak zorunda kalır.</p>
<table>
<tr><th>Yavaş (SARGable değil)</th><th>Hızlı (SARGable)</th></tr>
<tr><td><code>WHERE YEAR(order_date) = 2024</code></td><td><code>WHERE order_date &gt;= '2024-01-01' AND order_date &lt; '2025-01-01'</code></td></tr>
<tr><td><code>WHERE price * 1.2 &gt; 1200</code></td><td><code>WHERE price &gt; 1000</code></td></tr>
<tr><td><code>WHERE SUBSTRING(email, 1, 4) = 'ayse'</code></td><td><code>WHERE email LIKE 'ayse%'</code></td></tr>
<tr><td><code>WHERE LIKE '%gmail.com'</code></td><td>Ters çevrilmiş sütun, tam metin arama ya da ayrı bir alan adı sütunu</td></tr>
<tr><td><code>WHERE ISNULL(city, '') = ''</code></td><td><code>WHERE city IS NULL OR city = ''</code></td></tr>
<tr><td><code>WHERE CAST(customer_id AS VARCHAR) = '42'</code></td><td><code>WHERE customer_id = 42</code> (tipleri eşleştir)</td></tr>
</table>
<h2>Örtük tip dönüşümü</h2>
<p>Metin sütununu sayıyla karşılaştırmak (<code>WHERE tax_no = 1234567890</code>) motoru her satırda dönüşüm yapmaya zorlar ve indeks kullanılamaz. SQL Server'da NVARCHAR sabiti VARCHAR sütunla karşılaştırıldığında da benzer durum olur.</p>
<h2>Diğer sık hatalar</h2>
<ul>
<li><b>SELECT *</b>: Gereksiz sütunlar ağ ve bellek yükü getirir, kaplayan (covering) indeksi devre dışı bırakır.</li>
<li><b>Gereksiz DISTINCT</b>: Çoğalma bir JOIN hatasının belirtisidir; DISTINCT ile örtmek yerine nedeni düzelt.</li>
<li><b>Satır satır işlem</b>: İmleç veya döngüyle tek tek UPDATE yerine tek bir küme tabanlı UPDATE.</li>
<li><b>Ilişkili alt sorgu SELECT listesinde</b>: Her satır için çalışır; JOIN + GROUP BY veya pencere fonksiyonu genellikle daha iyidir.</li>
<li><b>OR ile farklı sütunlar</b>: <code>WHERE a = 1 OR b = 2</code> indeksleri zor kullanır; <code>UNION ALL</code> ile ikiye bölmek bazen hızlandırır.</li>
<li><b>Sayfalamada büyük OFFSET</b>: <code>OFFSET 100000</code> önceki satırların hepsini okur; anahtar tabanlı (keyset) sayfalama kullan.</li>
</ul>
<h2>Planı oku</h2>
<p>Tahmin etme, ölç: SQL Server'da gerçek yürütme planı ve <code>SET STATISTICS IO ON</code>; PostgreSQL'de <code>EXPLAIN (ANALYZE, BUFFERS)</code>; MySQL'de <code>EXPLAIN ANALYZE</code>; Oracle'da <code>DBMS_XPLAN</code>; BigQuery'de yürütme ayrıntıları ve taranan bayt.</p>
${NR("-- SQLite\nEXPLAIN QUERY PLAN SELECT * FROM orders WHERE customer_id = 7;\n-- PostgreSQL\nEXPLAIN (ANALYZE, BUFFERS) SELECT * FROM orders WHERE customer_id = 7;\n-- MySQL\nEXPLAIN ANALYZE SELECT * FROM orders WHERE customer_id = 7;\n-- SQL Server\nSET STATISTICS IO, TIME ON;\nSELECT * FROM dbo.orders WHERE customer_id = 7;\n-- Oracle\nEXPLAIN PLAN FOR SELECT * FROM orders WHERE customer_id = 7;\nSELECT * FROM TABLE(DBMS_XPLAN.DISPLAY);")}
`,
  ex: [
    sq('Aşağıdaki SARGable olmayan sorguyu aynı sonucu verecek şekilde SARGable yaz: <code>SELECT COUNT(*) AS adet FROM orders WHERE strftime(\'%Y-%m\', order_date) = \'2024-11\'</code>.', "SELECT COUNT(*) AS adet FROM orders WHERE order_date >= '2024-11-01' AND order_date < '2024-12-01';"),
    sq('SARGable biçimde: KDV dahil fiyatı (fiyat × 1,20) 6000 TL\'yi geçen ürünlerin sayısı: <code>adet</code>. Sütunu işleme sokma.', 'SELECT COUNT(*) AS adet FROM products WHERE price > 5000;'),
    mc('<p>Hangisi indeks kullanımını engelleyebilir?</p>', ["<code>WHERE email LIKE 'ayse%'</code>", "<code>WHERE UPPER(email) = 'AYSE@X.COM'</code>", '<code>WHERE customer_id = 42</code>', "<code>WHERE order_date >= '2024-01-01'</code>"], 1),
    mc('<p>Çok büyük tablolarda derin sayfalamada (100.000. satırdan sonrası) en verimli yöntem hangisidir?</p>', ['Daha büyük OFFSET', 'Son görülen anahtarı hatırlayıp <code>WHERE id &gt; :son_id ORDER BY id LIMIT n</code> (keyset)', 'SELECT * ile tamamını çekmek', 'DISTINCT eklemek'], 1)
  ]
}]);

/* ======================= Sertifika konu dersleri ======================= */
const SRT = 'Sertifika Hazırlık';
const certLessons = [{
  id: 'z071-fonksiyon', lv: 'B2', mod: SRT, min: 18,
  title: '1Z0-071: Oracle tek satır fonksiyonları (karakter, sayı, tarih, genel)',
  sum: 'INITCAP, LPAD, INSTR, SUBSTR; ROUND/TRUNC/MOD; MONTHS_BETWEEN, ADD_MONTHS, NEXT_DAY; NVL ailesi.',
  body: `
<h2>Karakter fonksiyonları</h2>
${ORA("SELECT INITCAP('ankara merkez')      AS initcap_,\n       LPAD('42', 5, '0')              AS lpad_,\n       RPAD('SQL', 6, '*')             AS rpad_,\n       SUBSTR('Patika', 2, 3)          AS substr_,\n       SUBSTR('Patika', -3)            AS sondan_3,\n       INSTR('banana', 'a', 1, 2)      AS ikinci_a,\n       LENGTH('Merhaba')               AS uzunluk,\n       TRIM('  x  ')                   AS trim_,\n       REPLACE('2024-12-31', '-', '/') AS replace_\nFROM dual;")}
<ul>
<li><code>SUBSTR(s, -3)</code> negatif başlangıçta sondan sayar.</li>
<li><code>INSTR(s, aranan, başlangıç, kaçıncı)</code>: başlangıç negatifse sondan geriye arar; bulamazsa 0.</li>
<li><code>CONCAT</code> Oracle'da <b>yalnızca iki</b> argüman alır; fazlası için <code>||</code> kullanılır.</li>
<li><code>TRIM(LEADING '0' FROM s)</code>, <code>LTRIM</code>, <code>RTRIM</code>.</li>
</ul>
<h2>Sayı fonksiyonları</h2>
${ORA("SELECT ROUND(15.567, 1)   AS r1,\n       ROUND(15.567, -1)  AS r_onlar,\n       TRUNC(15.567, 1)   AS t1,\n       MOD(17, 5)         AS kalan,\n       CEIL(4.1)          AS tavan,\n       FLOOR(4.9)         AS taban\nFROM dual;")}
<p>Negatif basamak sayısı virgülün soluna yuvarlar: <code>ROUND(15.567, -1) = 20</code>.</p>
<h2>Tarih fonksiyonları</h2>
${ORA("SELECT MONTHS_BETWEEN(DATE '2024-12-31', DATE '2024-06-30') AS ay_farki,\n       ADD_MONTHS(DATE '2024-01-31', 1)                     AS ay_ekle,\n       NEXT_DAY(DATE '2024-12-25', 'MONDAY')                AS sonraki_pazartesi,\n       LAST_DAY(DATE '2024-02-10')                          AS ay_sonu,\n       TRUNC(DATE '2024-12-25', 'MM')                       AS ay_basi,\n       ROUND(DATE '2024-12-25', 'YEAR')                     AS yila_yuvarla\nFROM dual;")}
<ul>
<li>Tarih aritmetiği: <code>tarih + 1</code> bir gün ekler, <code>tarih2 - tarih1</code> gün farkını sayı olarak verir, <code>tarih + 1/24</code> bir saat ekler.</li>
<li><code>ADD_MONTHS</code> ayın son gününden başlarsa sonucun da ayın son günü olduğunu unutma (31 Ocak + 1 ay = 29 Şubat 2024).</li>
<li><code>ROUND(tarih, 'MONTH')</code> ayın 16'sında ve sonrasında bir sonraki aya yuvarlar; <code>'YEAR'</code> Temmuz'dan itibaren bir sonraki yıla.</li>
</ul>
<h2>Genel fonksiyonlar</h2>
<table>
<tr><th>Fonksiyon</th><th>Döndürür</th></tr>
<tr><td><code>NVL(a, b)</code></td><td>a NULL ise b</td></tr>
<tr><td><code>NVL2(a, b, c)</code></td><td>a NULL değilse b, NULL ise c</td></tr>
<tr><td><code>NULLIF(a, b)</code></td><td>a = b ise NULL, değilse a</td></tr>
<tr><td><code>COALESCE(a, b, c, ...)</code></td><td>ilk NULL olmayan</td></tr>
<tr><td><code>DECODE(x, d1, s1, d2, s2, varsayılan)</code></td><td>Oracle'a özgü CASE kısaltması; NULL'u NULL'a <b>eşit</b> sayar</td></tr>
</table>
${ORA("SELECT first_name,\n       NVL(TO_CHAR(manager_id), 'Yönetici yok') AS yonetici,\n       NVL2(email, 'Var', 'Yok')                  AS email_durumu,\n       DECODE(dept_id, 1, 'Satış', 3, 'Analitik', 'Diğer') AS bolum\nFROM employees\nWHERE emp_id <= 6;")}
<div class="warn"><b>Sınav tuzağı</b>NVL'nin iki argümanı uyumlu tipte olmalı: <code>NVL(manager_id, 'Yok')</code> sayı sütununa metin verdiği için hata verir; önce <code>TO_CHAR</code>.</div>
`,
  ex: [
    osq('Çalışanların adını baş harfi büyük (<code>INITCAP</code>) ve soyadını 12 karaktere sağdan nokta ile doldurarak (<code>RPAD</code>) getir; yalnızca ilk 5 çalışan (<code>emp_id</code> sırasıyla): <code>ad</code>, <code>soyad</code>.', "SELECT INITCAP(first_name) AS ad, RPAD(last_name, 12, '.') AS soyad FROM employees ORDER BY emp_id FETCH FIRST 5 ROWS ONLY;", { ord: true }),
    osq('Her çalışanın işe girişinden 2024-12-31\'e kadar geçen tam ay sayısı (<code>MONTHS_BETWEEN</code>, <code>TRUNC</code> ile): <code>first_name</code>, <code>ay</code>.', "SELECT first_name, TRUNC(MONTHS_BETWEEN(DATE '2024-12-31', hire_date)) AS ay FROM employees;"),
    osq('Çalışanların e-posta durumunu <code>NVL2</code> ile <b>Var</b>/<b>Yok</b> olarak say: <code>durum</code>, <code>adet</code>.', "SELECT NVL2(email, 'Var', 'Yok') AS durum, COUNT(*) AS adet FROM employees GROUP BY NVL2(email, 'Var', 'Yok');"),
    mc("<p><code>SELECT ROUND(1234.567, -2) FROM dual;</code> sonucu nedir?</p>", ['1234.57', '1200', '1300', '1234.6'], 1),
    mc("<p><code>NULLIF(10, 10)</code> ne döner?</p>", ['10', '0', 'NULL', 'Hata'], 2),
    mc("<p><code>SELECT ADD_MONTHS(DATE '2024-01-31', 1) FROM dual;</code> sonucu?</p>", ['2024-02-31', '2024-03-02', '2024-02-29', '2024-03-01'], 2),
    mc("<p>Oracle'da <code>CONCAT('A', 'B', 'C')</code> ne yapar?</p>", ["'ABC' döndürür", 'Hata verir; CONCAT iki argüman alır', "'A B C' döndürür", 'NULL döndürür'], 1)
  ]
}, {
  id: 'z071-donusum', lv: 'B2', mod: SRT, min: 16,
  title: '1Z0-071: Dönüşüm fonksiyonları ve biçim modelleri (TO_CHAR, TO_DATE, TO_NUMBER)',
  sum: 'Örtük ve açık dönüşüm, tarih ve sayı biçim öğeleri, fm ve RR.',
  body: `
<h2>Örtük ve açık dönüşüm</h2>
<p>Oracle bazı durumlarda tipi kendiliğinden çevirir (<code>WHERE hire_date = '01-MAR-15'</code> oturumun NLS_DATE_FORMAT ayarına göre çevrilir). Bu davranış ortama bağlı olduğu için güvenilmezdir; her zaman <b>açık dönüşüm</b> kullan.</p>
<table>
<tr><th>Fonksiyon</th><th>Yön</th></tr>
<tr><td><code>TO_CHAR(tarih|sayı, 'biçim')</code></td><td>tarih/sayı → metin</td></tr>
<tr><td><code>TO_DATE('metin', 'biçim')</code></td><td>metin → tarih</td></tr>
<tr><td><code>TO_NUMBER('metin', 'biçim')</code></td><td>metin → sayı</td></tr>
<tr><td><code>CAST(x AS tip)</code></td><td>standart dönüşüm</td></tr>
</table>
<h2>Tarih biçim öğeleri</h2>
<table>
<tr><th>Öğe</th><th>Anlamı</th><th>Örnek</th></tr>
<tr><td><code>YYYY</code> / <code>YY</code> / <code>RR</code></td><td>Yıl (RR: 50–99 → 1900'ler, 00–49 → 2000'ler)</td><td>2024</td></tr>
<tr><td><code>MM</code> / <code>MON</code> / <code>MONTH</code></td><td>Ay numarası / kısa ad / uzun ad</td><td>12 / DEC / DECEMBER</td></tr>
<tr><td><code>DD</code> / <code>DY</code> / <code>DAY</code></td><td>Gün / kısa gün adı / uzun gün adı</td><td>25 / WED / WEDNESDAY</td></tr>
<tr><td><code>HH24:MI:SS</code></td><td>Saat:dakika:saniye</td><td>14:05:09</td></tr>
<tr><td><code>Q</code>, <code>WW</code>, <code>D</code></td><td>Çeyrek, yılın haftası, haftanın günü</td><td>4</td></tr>
<tr><td><code>fm</code></td><td>Dolgu boşluklarını ve baştaki sıfırları kaldırır</td><td><code>fmMonth</code></td></tr>
<tr><td><code>"metin"</code></td><td>Biçime sabit metin ekler</td><td><code>'DD "Aralık"'</code></td></tr>
</table>
${ORA("SELECT TO_CHAR(DATE '2024-12-05', 'DD.MM.YYYY')         AS tr_tarih,\n       TO_CHAR(DATE '2024-12-05', 'YYYY-\"Q\"Q')         AS ceyrek,\n       TO_DATE('31.12.2024', 'DD.MM.YYYY')            AS tarih,\n       TO_CHAR(1234567.891, '9,999,999.99')           AS sayi,\n       TO_CHAR(42, '00000')                           AS sifirli,\n       TO_NUMBER('1,250.75', '9,999.99')              AS metinden_sayi\nFROM dual;")}
<h2>Sayı biçim öğeleri</h2>
<table>
<tr><th>Öğe</th><th>Anlamı</th></tr>
<tr><td><code>9</code></td><td>Rakam (baştaki sıfırlar boşluk)</td></tr>
<tr><td><code>0</code></td><td>Rakam (baştaki sıfırlar yazılır)</td></tr>
<tr><td><code>,</code> <code>.</code></td><td>Binlik ve ondalık ayırıcı (<code>G</code> ve <code>D</code> yerel ayara göre)</td></tr>
<tr><td><code>$</code>, <code>L</code></td><td>Para birimi</td></tr>
<tr><td><code>MI</code>, <code>PR</code></td><td>Negatifi sonda eksi / açılı parantezle göster</td></tr>
</table>
<div class="warn"><b>Sınav tuzağı</b>Biçimdeki basamak sayısı yetmezse <code>TO_CHAR</code> sonucu <code>#####</code> olur. <code>TO_DATE</code>'te metin biçimle uyuşmazsa hata (ORA-01861) verir.</div>
`,
  ex: [
    osq('Siparişleri <code>TO_CHAR</code> ile <b>yıl-çeyrek</b> biçiminde (ör. 2024-Q4) grupla ve 2024 için say: <code>ceyrek</code>, <code>siparis</code>. Çeyreğe göre sırala.', "SELECT TO_CHAR(order_date, 'YYYY-\"Q\"Q') AS ceyrek, COUNT(*) AS siparis FROM orders WHERE order_date >= DATE '2024-01-01' AND order_date < DATE '2025-01-01' GROUP BY TO_CHAR(order_date, 'YYYY-\"Q\"Q') ORDER BY ceyrek;", { ord: true }),
    osq('<code>TO_DATE</code> ile \'15.11.2024\' metnini tarihe çevirip o tarihten sonra (dahil) verilen sipariş sayısını bul: <code>adet</code>.', "SELECT COUNT(*) AS adet FROM orders WHERE order_date >= TO_DATE('15.11.2024', 'DD.MM.YYYY');"),
    mc("<p><code>TO_CHAR(7, '000')</code> ne döner?</p>", ["'7'", "'  7'", "'007'", "'7.00'"], 2),
    mc("<p>RR biçiminde, mevcut yıl 2024 iken <code>TO_DATE('15-03-87', 'DD-MM-RR')</code> hangi yılı verir?</p>", ['2087', '1987', '0087', 'Hata'], 1),
    mc("<p><code>TO_CHAR(SYSDATE, 'fmDD Month')</code> ifadesindeki <code>fm</code> ne yapar?</p>", ['Ayı Türkçe yazar', 'Dolgu boşluklarını ve baştaki sıfırları kaldırır', 'Saat dilimini ekler', 'Biçimi kilitler'], 1)
  ]
}, {
  id: 'z071-dml-tcl', lv: 'C1', mod: SRT, min: 15,
  title: '1Z0-071: DML ve işlem kontrolü (INSERT/UPDATE/DELETE, COMMIT, SAVEPOINT, TRUNCATE)',
  sum: 'Alt sorgulu DML, okuma tutarlılığı, örtük commit, SAVEPOINT ve FOR UPDATE.',
  body: `
<h2>Alt sorgulu DML</h2>
${NR("-- Alt sorgudan çoklu satır ekleme (VALUES yazılmaz)\nINSERT INTO urun_arsiv (product_id, name, price)\nSELECT product_id, name, price FROM products WHERE stock = 0;\n\n-- İlişkili alt sorguyla güncelleme\nUPDATE employees e\nSET salary = (SELECT ROUND(AVG(x.salary)) FROM employees x WHERE x.dept_id = e.dept_id)\nWHERE e.salary IS NULL;\n\n-- Alt sorguyla silme\nDELETE FROM order_items\nWHERE order_id IN (SELECT order_id FROM orders WHERE status = 'cancelled');\n\n-- Alt sorgu hedef olarak (inline view)\nUPDATE (SELECT price FROM products WHERE category = 'Kitap') SET price = price * 1.1;")}
<h2>DELETE, TRUNCATE ve DROP</h2>
<table>
<tr><th></th><th>DELETE</th><th>TRUNCATE</th><th>DROP</th></tr>
<tr><td>Tür</td><td>DML</td><td>DDL</td><td>DDL</td></tr>
<tr><td>WHERE</td><td>Var</td><td>Yok (tümü)</td><td>—</td></tr>
<tr><td>Geri alınabilir mi?</td><td>Evet (ROLLBACK)</td><td>Hayır (örtük COMMIT)</td><td>Hayır (geri dönüşüm kutusundan FLASHBACK)</td></tr>
<tr><td>Trigger</td><td>Çalışır</td><td>Çalışmaz</td><td>—</td></tr>
<tr><td>Yapı</td><td>Kalır</td><td>Kalır, alan serbest kalır</td><td>Tablo silinir</td></tr>
</table>
<h2>İşlem kontrolü (TCL)</h2>
${NR("UPDATE accounts SET balance = balance - 100 WHERE id = 1;\nSAVEPOINT once_borc;\nUPDATE accounts SET balance = balance + 100 WHERE id = 2;\nROLLBACK TO SAVEPOINT once_borc;   -- yalnızca ikinci UPDATE geri alınır\nCOMMIT;                            -- birinci UPDATE kalıcı olur")}
<ul>
<li>Bir işlem ilk DML ile başlar; <b>COMMIT</b> veya <b>ROLLBACK</b> ile biter.</li>
<li><b>DDL ve DCL</b> (CREATE, ALTER, DROP, TRUNCATE, GRANT) çalışmadan önce ve sonra <b>örtük COMMIT</b> yapar.</li>
<li>Oturum normal kapanırsa (çoğu araçta) COMMIT; bağlantı koparsa ROLLBACK.</li>
<li><b>Okuma tutarlılığı</b>: Başka oturumlar, sen COMMIT edene kadar değişikliklerini görmez; sen ise kendi değişikliklerini görürsün. Okuyucular yazıcıları, yazıcılar okuyucuları beklemez.</li>
<li><code>SELECT ... FOR UPDATE</code> seçilen satırları kilitler; diğer oturumlar bu satırları değiştirmek için COMMIT/ROLLBACK'i bekler.</li>
<li>ROLLBACK TO SAVEPOINT sonrasında, o noktadan sonraki savepoint'ler silinir.</li>
</ul>
`,
  ex: [
    mc('<p>Şu sıra çalıştırılıyor: INSERT (1), SAVEPOINT a, INSERT (2), SAVEPOINT b, INSERT (3), ROLLBACK TO a, COMMIT. Tabloda hangi satırlar kalır?</p>', ['1, 2, 3', '1', '1, 2', 'Hiçbiri'], 1),
    mc('<p>INSERT yaptıktan sonra <code>CREATE TABLE</code> çalıştırdın ve oturumun çöktü. INSERT ne olur?</p>', ['Geri alınır', 'Kalıcıdır; CREATE TABLE örtük COMMIT yaptı', 'Yarım kalır', 'Hata verir'], 1),
    mc('<p>Hangisi TRUNCATE için <b>yanlıştır</b>?</p>', ['DDL komutudur', 'WHERE alabilir', 'Geri alınamaz', 'DELETE trigger\'larını çalıştırmaz'], 1),
    mc('<p>Oturum A bir satırı güncelledi ama COMMIT etmedi. Oturum B aynı satırı SELECT ile okursa ne görür?</p>', ['Güncellenmiş değeri', 'Eski (commit edilmiş) değeri', 'Hata alır', 'A commit edene kadar bekler'], 1),
    sq('Bir işlem içinde: Hediye kategorisindeki ürünlerin stoğunu 10 artır, sonra sonucu sorgula: <code>name</code>, <code>stock</code>. (COMMIT ile bitir.)', "BEGIN TRANSACTION; UPDATE products SET stock = stock + 10 WHERE category = 'Hediye'; COMMIT; SELECT name, stock FROM products WHERE category = 'Hediye';", { dl: ['tsql', 'pg', 'mysql', 'sqlite'] })
  ]
}, {
  id: 'z071-ddl', lv: 'C1', mod: SRT, min: 15,
  title: '1Z0-071: Oracle veri tipleri, tablo oluşturma ve değiştirme',
  sum: 'VARCHAR2, NUMBER(p,s), DATE/TIMESTAMP/INTERVAL, LOB; CTAS, ALTER TABLE, DROP ... PURGE, geçici tablolar.',
  body: `
<h2>Veri tipleri</h2>
<table>
<tr><th>Tip</th><th>Not</th></tr>
<tr><td><code>VARCHAR2(n [BYTE|CHAR])</code></td><td>Değişken uzunluklu metin; Oracle'da önerilen metin tipi</td></tr>
<tr><td><code>CHAR(n)</code></td><td>Sabit uzunluk, boşlukla doldurulur</td></tr>
<tr><td><code>NUMBER(p, s)</code></td><td>p toplam basamak, s ondalık basamak. <code>NUMBER(5,2)</code> en fazla 999.99. s negatifse sola yuvarlar.</td></tr>
<tr><td><code>DATE</code></td><td>Tarih <b>ve saat</b> (saniyeye kadar)</td></tr>
<tr><td><code>TIMESTAMP [WITH [LOCAL] TIME ZONE]</code></td><td>Kesirli saniye, saat dilimi</td></tr>
<tr><td><code>INTERVAL YEAR TO MONTH</code>, <code>INTERVAL DAY TO SECOND</code></td><td>Süre</td></tr>
<tr><td><code>CLOB</code>, <code>BLOB</code>, <code>NCLOB</code></td><td>Büyük metin / ikili veri (eski <code>LONG</code> yerine)</td></tr>
<tr><td><code>RAW</code>, <code>ROWID</code></td><td>İkili, satır adresi</td></tr>
</table>
<h2>Oluşturma</h2>
${NR("CREATE TABLE kampanya (\n  kampanya_id NUMBER(6)      CONSTRAINT pk_kampanya PRIMARY KEY,\n  kod         VARCHAR2(20)   NOT NULL CONSTRAINT uq_kampanya_kod UNIQUE,\n  indirim     NUMBER(3,2)    CONSTRAINT ck_indirim CHECK (indirim BETWEEN 0 AND 0.5),\n  baslangic   DATE DEFAULT SYSDATE,\n  urun_id     NUMBER(6),\n  CONSTRAINT fk_kampanya_urun FOREIGN KEY (urun_id) REFERENCES products (product_id) ON DELETE SET NULL\n);\n\n-- Sorgudan tablo (CTAS): NOT NULL dışındaki kısıtlar kopyalanmaz\nCREATE TABLE kitaplar AS SELECT product_id, name, price FROM products WHERE category = 'Kitap';\n\n-- Yalnızca yapı (satırsız)\nCREATE TABLE bos_kopya AS SELECT * FROM products WHERE 1 = 0;")}
<h2>Değiştirme</h2>
${NR("ALTER TABLE kampanya ADD (aciklama VARCHAR2(200));\nALTER TABLE kampanya MODIFY (aciklama VARCHAR2(500));\nALTER TABLE kampanya RENAME COLUMN aciklama TO notlar;\nALTER TABLE kampanya DROP COLUMN notlar;\nALTER TABLE kampanya SET UNUSED (kod);         -- anında gizle, sonra DROP UNUSED COLUMNS\nALTER TABLE kampanya READ ONLY;                -- DML engellenir\nALTER TABLE kampanya READ WRITE;\nRENAME kampanya TO kampanyalar;\n\nDROP TABLE kampanyalar;                        -- geri dönüşüm kutusuna gider\nFLASHBACK TABLE kampanyalar TO BEFORE DROP;     -- geri getir\nDROP TABLE kampanyalar PURGE;                  -- kalıcı sil")}
<ul>
<li>Bir sütunu küçültmek veya tipini değiştirmek için sütun boş olmalı ya da veri yeni tipe sığmalı.</li>
<li>NOT NULL eklemek için mevcut satırlarda NULL olmamalı (veya DEFAULT ile birlikte eklenmeli).</li>
<li><b>Geçici tablo</b>: <code>CREATE GLOBAL TEMPORARY TABLE ... ON COMMIT DELETE ROWS | PRESERVE ROWS</code>; yapı kalıcı, veri oturuma/işleme özel. Oracle 18c'den itibaren <code>PRIVATE TEMPORARY TABLE</code> (ad <code>ORA$PTT_</code> ile başlar).</li>
</ul>
`,
  ex: [
    mc('<p><code>NUMBER(5,2)</code> sütununa hangisi <b>sığmaz</b>?</p>', ['999.99', '12.345 (12.35 olarak saklanır)', '1000', '-999.99'], 2),
    mc('<p>CTAS (<code>CREATE TABLE ... AS SELECT</code>) ile kaynak tablodan hangi kısıt kopyalanır?</p>', ['PRIMARY KEY', 'FOREIGN KEY', 'NOT NULL', 'CHECK'], 2),
    mc('<p><code>DROP TABLE t;</code> sonrası tabloyu geri getiren komut?</p>', ['<code>ROLLBACK</code>', '<code>UNDROP TABLE t</code>', '<code>FLASHBACK TABLE t TO BEFORE DROP</code>', '<code>RECOVER TABLE t</code>'], 2),
    mc('<p>Oracle\'da <code>DATE</code> tipi neyi saklar?</p>', ['Yalnızca tarihi', 'Tarih ve saati (saniyeye kadar)', 'Tarih, saat ve saat dilimini', 'Yalnızca yılı'], 1),
    mc('<p><code>ALTER TABLE t SET UNUSED (c);</code> ne yapar?</p>', ['Sütunu anında kalıcı siler ve alanı geri kazanır', 'Sütunu hemen erişilemez yapar; fiziksel silme DROP UNUSED COLUMNS ile sonra yapılır', 'Sütunu görünmez yapar ama adıyla seçilebilir', 'Sütuna NULL yazar'], 1)
  ]
}, {
  id: 'z071-nesneler', lv: 'C1', mod: SRT, min: 14,
  title: '1Z0-071: Şema nesneleri: view, sequence, synonym, index',
  sum: 'Görünüm kuralları, NEXTVAL/CURRVAL, açık/özel eşanlamlılar, indeks türleri.',
  body: `
<h2>Sequence (dizi)</h2>
${ORA("CREATE SEQUENCE seq_kampanya START WITH 100 INCREMENT BY 10;\nSELECT seq_kampanya.NEXTVAL AS ilk FROM dual;\nSELECT seq_kampanya.NEXTVAL AS ikinci, seq_kampanya.CURRVAL AS su_an FROM dual;")}
<ul>
<li><code>CURRVAL</code>, oturumda en az bir kez <code>NEXTVAL</code> çağrılmadan kullanılamaz.</li>
<li>Seçenekler: <code>MINVALUE</code>, <code>MAXVALUE</code>, <code>CYCLE</code> (sona gelince başa döner), <code>CACHE n</code> (performans; çökmede boşluk oluşabilir), <code>NOCACHE</code>.</li>
<li>NEXTVAL; alt sorguda, GROUP BY / ORDER BY / DISTINCT içeren SELECT'te, view tanımında ve CHECK kısıtında kullanılamaz.</li>
<li>Sequence değerleri ROLLBACK ile geri alınmaz; numaralarda <b>boşluk</b> olabilir.</li>
<li>12c'den beri sütun varsayılanı olabilir: <code>DEFAULT seq.NEXTVAL</code> veya <code>GENERATED ALWAYS AS IDENTITY</code>.</li>
</ul>
<h2>Synonym (eşanlamlı)</h2>
${NR("CREATE SYNONYM urunler FOR satis.products;            -- özel (yalnızca senin şemanda)\nCREATE PUBLIC SYNONYM urunler FOR satis.products;     -- herkese açık (yetki gerekir)\nDROP SYNONYM urunler;")}
<p>Eşanlamlı yalnızca bir <b>ad</b>dır; nesneye erişim yetkisi vermez.</p>
<h2>Görünüm kuralları (sınav)</h2>
<ul>
<li>Basit görünüm (tek tablo, fonksiyon/grup yok) üzerinden DML yapılabilir.</li>
<li>Grup fonksiyonu, GROUP BY, DISTINCT, ROWNUM veya ifadeyle tanımlanmış sütun varsa: o sütuna INSERT/UPDATE yapılamaz.</li>
<li>Görünüm alttaki tablonun NOT NULL sütunlarını içermiyorsa görünüm üzerinden INSERT başarısız olur.</li>
<li><code>CREATE OR REPLACE VIEW</code> yetkileri korur; <code>DROP VIEW</code> alttaki veriyi silmez.</li>
</ul>
<h2>İndeksler</h2>
<ul>
<li>PRIMARY KEY ve UNIQUE kısıtları otomatik <b>benzersiz indeks</b> oluşturur; FOREIGN KEY oluşturmaz.</li>
<li><b>Bileşik indeks</b>: sütun sırası önemlidir; ilk sütunu içermeyen koşullar indeksten tam yararlanamaz.</li>
<li><b>Fonksiyon tabanlı indeks</b>: <code>CREATE INDEX ix ON employees (UPPER(last_name));</code></li>
<li><b>Görünmez indeks</b>: <code>ALTER INDEX ix INVISIBLE;</code></li>
<li>Aynı sütun kümesinde birden fazla indeks ancak türleri (B-tree/bitmap) veya benzersizlik/bölümleme farklıysa olabilir ve yalnızca biri görünür olabilir.</li>
</ul>
`,
  ex: [
    mc('<p>Yeni bir oturumda ilk komut olarak <code>SELECT s.CURRVAL FROM dual;</code> çalıştırılırsa ne olur?</p>', ['Başlangıç değeri döner', 'Hata: önce NEXTVAL çağrılmalı', 'NULL döner', '0 döner'], 1),
    mc('<p>Hangisi otomatik olarak indeks oluşturur?</p>', ['FOREIGN KEY', 'CHECK', 'UNIQUE', 'NOT NULL'], 2),
    mc('<p>Bir PUBLIC SYNONYM oluşturmak kullanıcılara neyi sağlar?</p>', ['Nesne üzerinde SELECT yetkisi', 'Nesneye şema adı yazmadan erişebilecekleri bir ad (yetki ayrıca verilmelidir)', 'Nesnenin kopyasını', 'Nesnenin silinmesini engeller'], 1),
    mc('<p>NEXTVAL hangisinde kullanılabilir?</p>', ['View tanımında', 'INSERT ... VALUES listesinde', 'CHECK kısıtında', 'DISTINCT içeren SELECT\'te'], 1),
    osq('<code>seq_test</code> adında 1\'den başlayıp 5\'er artan bir sequence oluştur ve art arda iki NEXTVAL değerini tek satırda değil, iki ayrı SELECT ile al; son SELECT <code>CURRVAL</code>\'ı <code>su_an</code> olarak döndürsün.', 'CREATE SEQUENCE seq_test START WITH 1 INCREMENT BY 5; SELECT seq_test.NEXTVAL FROM dual; SELECT seq_test.NEXTVAL FROM dual; SELECT seq_test.CURRVAL AS su_an FROM dual;')
  ]
}, {
  id: 'dp300-yonetim', lv: 'C2', mod: SRT, min: 16,
  title: 'DP-300: Azure SQL\'de güvenlik, izleme ve otomasyon',
  sum: 'Entra kimlik doğrulama, denetim, Query Store, DMV\'ler, otomatik ayar, elastic jobs, Agent.',
  body: `
<h2>Sınavın konu alanları</h2>
<p>Microsoft'un çalışma rehberine göre DP-300 kabaca şu alanlardan oluşur: veri platformu kaynaklarını planlama ve uygulama, güvenli ortam uygulama, veritabanı performansını izleme/yapılandırma/optimize etme, otomasyon ve yüksek erişilebilirlik ile felaket kurtarma. Oranlar dönem dönem güncellenir; resmi sayfayı kontrol et.</p>
<h2>Güvenlik</h2>
${NR("-- Entra ID (Azure AD) kullanıcısını veritabanına ekle (contained user)\nCREATE USER [ayse@sirket.com] FROM EXTERNAL PROVIDER;\nALTER ROLE db_datareader ADD MEMBER [ayse@sirket.com];\n\n-- Dinamik veri maskeleme\nALTER TABLE dbo.customers ALTER COLUMN email\n  ADD MASKED WITH (FUNCTION = 'email()');\n\n-- Satır düzeyinde güvenlik: kullanıcı yalnızca kendi bölgesini görür\nCREATE FUNCTION sec.fn_bolge(@bolge NVARCHAR(50))\nRETURNS TABLE WITH SCHEMABINDING AS\nRETURN SELECT 1 AS izin WHERE @bolge = CAST(SESSION_CONTEXT(N'bolge') AS NVARCHAR(50));\nCREATE SECURITY POLICY sec.bolge_filtresi\n  ADD FILTER PREDICATE sec.fn_bolge(city) ON dbo.customers WITH (STATE = ON);")}
<table>
<tr><th>Özellik</th><th>Korur</th></tr>
<tr><td>TDE</td><td>Diskteki veri (varsayılan açık)</td></tr>
<tr><td>Always Encrypted</td><td>Hassas sütunlar; sunucu bile düz metni görmez</td></tr>
<tr><td>Dinamik veri maskeleme</td><td>Yetkisiz kullanıcının gördüğü değer (veri değişmez)</td></tr>
<tr><td>RLS</td><td>Hangi satırların görüleceği</td></tr>
<tr><td>Denetim (Auditing), Defender for SQL</td><td>Kim ne yaptı, şüpheli etkinlik ve zafiyet değerlendirmesi</td></tr>
<tr><td>Veri keşfi ve sınıflandırma</td><td>Hassas sütunların etiketlenmesi</td></tr>
</table>
<h2>İzleme ve performans</h2>
${NR("-- En çok CPU kullanan sorgular (Query Store)\nSELECT TOP (10) q.query_id, t.query_sql_text,\n       SUM(rs.count_executions) AS calisma,\n       SUM(rs.avg_cpu_time * rs.count_executions) / 1000 AS toplam_cpu_ms\nFROM sys.query_store_query q\nJOIN sys.query_store_query_text t ON t.query_text_id = q.query_text_id\nJOIN sys.query_store_plan p ON p.query_id = q.query_id\nJOIN sys.query_store_runtime_stats rs ON rs.plan_id = p.plan_id\nGROUP BY q.query_id, t.query_sql_text\nORDER BY toplam_cpu_ms DESC;\n\n-- Kaynak kullanımı (Azure SQL Database)\nSELECT TOP (20) end_time, avg_cpu_percent, avg_data_io_percent, avg_log_write_percent\nFROM sys.dm_db_resource_stats ORDER BY end_time DESC;\n\n-- Bekleme türleri\nSELECT TOP (10) wait_type, wait_time_ms FROM sys.dm_db_wait_stats ORDER BY wait_time_ms DESC;\n\n-- Otomatik ayar\nALTER DATABASE CURRENT SET AUTOMATIC_TUNING (FORCE_LAST_GOOD_PLAN = ON, CREATE_INDEX = ON);")}
<ul>
<li><b>Query Store</b>: Planları ve çalışma istatistiklerini saklar; plan zorlama (force plan) ile kötüleşen sorguyu eski plana döndürür.</li>
<li><b>Intelligent Query Processing</b>: uyarlanabilir join, bellek geri bildirimi, parametreye duyarlı plan (PSP) gibi otomatik iyileştirmeler; uyumluluk düzeyine bağlıdır.</li>
<li>İndeks bakımı: parçalanma (<code>sys.dm_db_index_physical_stats</code>), istatistik güncelleme.</li>
<li>Azure Monitor, Log Analytics, <b>Database Watcher</b> ve uyarılar.</li>
</ul>
<h2>Otomasyon</h2>
<table>
<tr><th>Ortam</th><th>Zamanlanmış görev</th></tr>
<tr><td>SQL Server / Managed Instance / VM</td><td>SQL Server Agent işleri, bakım planları</td></tr>
<tr><td>Azure SQL Database</td><td>Elastic jobs, Azure Automation, Logic Apps, Azure Functions</td></tr>
<tr><td>Dağıtım</td><td>ARM/Bicep şablonları, PowerShell, Azure CLI, DACPAC ile şema dağıtımı</td></tr>
</table>
<h2>HA/DR</h2>
<p>Geo-replication ve failover groups (Azure SQL), Always On availability groups ve failover cluster instance (VM), log shipping, otomatik yedeklemeler, belirli bir ana geri yükleme (PITR) ve uzun süreli saklama (LTR). RPO (ne kadar veri kaybı göze alınır) ve RTO (ne kadar sürede geri dönülür) hedeflerine göre seçilir.</p>
`,
  ex: [
    mc('<p>Bir sorgunun planı değişip yavaşladı. Eski iyi planı zorlamak için hangi özellik kullanılır?</p>', ['Dinamik veri maskeleme', 'Query Store (plan zorlama) veya otomatik ayar FORCE_LAST_GOOD_PLAN', 'Elastic jobs', 'TDE'], 1),
    mc('<p>Azure SQL Database\'de SQL Server Agent yoktur. Zamanlanmış bakım betikleri için ne kullanılır?</p>', ['Elastic jobs', 'Log shipping', 'Linked server', 'Always Encrypted'], 0),
    mc('<p>Veritabanı yöneticisinin bile kredi kartı numaralarını düz metin olarak görmemesi için hangisi uygundur?</p>', ['TDE', 'Always Encrypted', 'Dinamik veri maskeleme', 'Firewall kuralı'], 1, 'TDE diskteki veriyi korur ama sorgu sonucu düz metindir; maskeleme yalnızca gösterimi değiştirir ve yetkili kullanıcı gerçek değeri görür.'),
    mc('<p>“En fazla 5 dakika veri kaybı” hedefi hangi kavramdır?</p>', ['RTO', 'RPO', 'SLA', 'DTU'], 1),
    mc('<p>Azure SQL Database\'de son bir saatlik CPU ve G/Ç kullanımını hangi DMV gösterir?</p>', ['sys.dm_exec_sessions', 'sys.dm_db_resource_stats', 'sys.tables', 'sys.dm_os_sys_info'], 1)
  ]
}, {
  id: 'cert-gda', lv: 'B1', mod: SRT, min: 14,
  title: 'Google Data Analytics sertifikasındaki SQL: BigQuery ile analiz adımları',
  sum: 'Ask–Prepare–Process–Analyze–Share–Act döngüsünde SQL; temizleme ve doğrulama kalıpları.',
  body: `
<h2>Sertifikanın SQL tarafı</h2>
<p>Google'ın Coursera'daki veri analitiği sertifikası analiz sürecini altı adımda anlatır: <b>Sor, Hazırla, İşle, Analiz et, Paylaş, Harekete geç</b>. SQL özellikle <b>İşle</b> (temizleme) ve <b>Analiz et</b> adımlarında BigQuery üzerinden kullanılır. Programı BigQuery'ye alıp aşağıdaki kalıpları çalıştırabilirsin.</p>
<h2>İşle: temizleme kalıpları</h2>
<table>
<tr><th>Amaç</th><th>BigQuery kalıbı</th></tr>
<tr><td>Tekrarları görmek</td><td><code>SELECT id, COUNT(*) FROM t GROUP BY id HAVING COUNT(*) &gt; 1</code></td></tr>
<tr><td>Tekrarsız satırlar</td><td><code>SELECT DISTINCT ...</code></td></tr>
<tr><td>Boşluk ve büyük/küçük harf</td><td><code>TRIM</code>, <code>LOWER</code>, <code>UPPER</code></td></tr>
<tr><td>Uzunluk kontrolü</td><td><code>WHERE LENGTH(posta_kodu) &lt;&gt; 5</code></td></tr>
<tr><td>Tip dönüşümü</td><td><code>CAST(x AS INT64)</code>, hatalı değerde NULL için <code>SAFE_CAST</code></td></tr>
<tr><td>Eksik değer</td><td><code>WHERE x IS NULL</code>, <code>COALESCE</code>, <code>IFNULL</code></td></tr>
<tr><td>Birleştirme</td><td><code>CONCAT(ad, ' ', soyad)</code></td></tr>
<tr><td>Ara sonuç</td><td><code>WITH</code> (geçici tablo gibi), <code>CREATE TEMP TABLE</code> betiklerde</td></tr>
</table>
${CODE("SELECT id,\n       TRIM(full_name)                AS ad,\n       LOWER(TRIM(email))             AS email,\n       LENGTH(TRIM(email))            AS uzunluk\nFROM raw_signups\nWHERE email IS NOT NULL\nLIMIT 6;", null, { base: 'bq' })}
<h2>Analiz et: toplama ve birleştirme</h2>
${CODE("SELECT c.segment,\n       COUNT(DISTINCT o.customer_id) AS musteri,\n       COUNT(*) AS siparis,\n       ROUND(SAFE_DIVIDE(COUNT(*), COUNT(DISTINCT o.customer_id)), 2) AS musteri_basina\nFROM anadolu.orders AS o\nJOIN anadolu.customers AS c ON c.customer_id = o.customer_id\nGROUP BY c.segment\nORDER BY siparis DESC;", null, { base: 'bq' })}
<h2>Doğrulama alışkanlıkları</h2>
<ul>
<li>Temizlikten önce ve sonra satır sayısını karşılaştır.</li>
<li><code>MIN</code>/<code>MAX</code> ile aralık dışı değerleri ara (gelecek tarihli sipariş, negatif fiyat).</li>
<li>Kategorik sütunlarda <code>SELECT DISTINCT</code> ile yazım farklarını gör (İstanbul / ISTANBUL / istanbul).</li>
<li>Sonucu bir kaynakla (finans raporu) sağla.</li>
</ul>
<div class="note"><b>Programın diğer kısımları</b>Sertifika ayrıca tablolama (spreadsheet), R programlama ve Tableau ile görselleştirmeyi kapsar; bunlar bu uygulamanın dışında.</div>
`,
  ex: [
    { t: 'sql', base: 'bq', dl: ['bq'], q: '<p>BigQuery yazımıyla: <code>raw_signups</code>\'ta e-postası boş olmayan satırlar için kırpılmış ve küçük harfe çevrilmiş e-postaların kaç farklı değer olduğunu ve toplam satırı getir: <code>satir</code>, <code>farkli_email</code>.</p>', sol: 'SELECT COUNT(*) AS satir, COUNT(DISTINCT LOWER(TRIM(email))) AS farkli_email FROM raw_signups WHERE email IS NOT NULL;' },
    { t: 'sql', base: 'bq', dl: ['bq'], q: '<p>BigQuery yazımıyla: müşterilerin tam adını <code>CONCAT</code> ile oluştur ve adı + soyadı 15 karakterden uzun olanları say: <code>adet</code>.</p>', sol: "SELECT COUNT(*) AS adet FROM customers WHERE LENGTH(CONCAT(first_name, ' ', last_name)) > 15;" },
    mc('<p>Google\'ın veri analizi sürecinde verinin temizlendiği adım hangisidir?</p>', ['Ask (Sor)', 'Prepare (Hazırla)', 'Process (İşle)', 'Share (Paylaş)'], 2),
    mc('<p>BigQuery\'de “abc” gibi hatalı değerlerde sorgu durmadan NULL dönmesi için hangisi kullanılır?</p>', ['<code>CAST</code>', '<code>SAFE_CAST</code>', '<code>CONVERT</code>', '<code>TRY_PARSE</code>'], 1)
  ]
}, {
  id: 'cert-dbx-snow', lv: 'C1', mod: SRT, min: 16,
  title: 'Databricks Data Analyst ve SnowPro Core: platforma özgü SQL konuları',
  sum: 'Unity Catalog, Delta, COPY INTO, MERGE, yüksek dereceli fonksiyonlar; Snowflake mimarisi, önbellek, Time Travel, VARIANT.',
  body: `
<h2>Databricks Certified Data Analyst Associate</h2>
<p>Sınav, Databricks SQL ile veri sorgulama, yönetme ve görselleştirmeye odaklanır. SQL tarafında öne çıkanlar:</p>
<ul>
<li><b>Unity Catalog</b>: üç düzeyli ad <code>katalog.şema.tablo</code>; <code>GRANT SELECT ON TABLE ... TO ...</code>; managed ve external tablolar.</li>
<li><b>Delta Lake</b>: ACID tablolar, <code>DESCRIBE HISTORY</code>, <code>VERSION AS OF</code> / <code>TIMESTAMP AS OF</code>, <code>OPTIMIZE</code>, <code>ZORDER BY</code>, <code>VACUUM</code>.</li>
<li><b>Veri alma</b>: <code>COPY INTO</code>, <code>CREATE TABLE ... AS SELECT</code>, <code>read_files()</code>, yükleme arayüzü.</li>
<li><b>MERGE INTO</b> ile upsert; <code>INSERT OVERWRITE</code>.</li>
<li><b>Yüksek dereceli fonksiyonlar</b> (dizi/harita): <code>transform</code>, <code>filter</code>, <code>exists</code>, <code>aggregate</code>; <code>explode</code>.</li>
<li>Pencere fonksiyonları, <code>PIVOT</code>, <code>QUALIFY</code>, CTE, SQL UDF.</li>
<li>Sorgu geçmişi ve profil, SQL warehouse türleri (serverless/pro/classic), panolar, uyarılar (alerts), parametreli sorgular.</li>
</ul>
${NR("-- Databricks SQL\nCOPY INTO anadolu.satis.orders\nFROM '/Volumes/anadolu/ham/siparisler/'\nFILEFORMAT = CSV\nFORMAT_OPTIONS ('header' = 'true');\n\nMERGE INTO anadolu.satis.products AS t\nUSING anadolu.ham.fiyat_guncelleme AS s ON t.product_id = s.product_id\nWHEN MATCHED THEN UPDATE SET t.price = s.new_price\nWHEN NOT MATCHED THEN INSERT *;\n\nSELECT order_id, transform(etiketler, x -> upper(x)) AS buyuk_etiketler,\n       filter(etiketler, x -> x LIKE 'k%') AS k_ile_baslayan\nFROM anadolu.satis.siparis_etiket;\n\nSELECT * FROM anadolu.satis.orders TIMESTAMP AS OF '2024-12-01';")}
<h2>SnowPro Core</h2>
<p>Snowflake'in temel sertifikası mimari ve platform bilgisini SQL ile birlikte ölçer:</p>
<table>
<tr><th>Konu</th><th>Bilinmesi gerekenler</th></tr>
<tr><td>Mimari</td><td>Üç katman: depolama (mikro-bölümler), işlem (sanal ambarlar), bulut hizmetleri (meta veri, optimizasyon, güvenlik)</td></tr>
<tr><td>Sanal ambar</td><td>Boyutlar (XS…6XL), çok kümeli ambar (eşzamanlılık), <code>AUTO_SUSPEND</code>, <code>AUTO_RESUME</code>; ölçek büyütme (up) sorgu hızı, ölçek genişletme (out) eşzamanlılık için</td></tr>
<tr><td>Önbellekler</td><td>Sonuç önbelleği (24 saat, tablo değişmediyse), ambarın yerel disk önbelleği, meta veri önbelleği (ör. COUNT(*))</td></tr>
<tr><td>Mikro-bölümler</td><td>Otomatik bölümleme, budama, clustering key ve clustering derinliği</td></tr>
<tr><td>Veri yükleme</td><td>Stage'ler (user <code>@~</code>, table <code>@%t</code>, named <code>@s</code>), <code>PUT</code>, <code>COPY INTO</code>, Snowpipe, dosya biçimleri</td></tr>
<tr><td>Yarı yapısal</td><td><code>VARIANT</code>, <code>v:alan::string</code> notasyonu, <code>LATERAL FLATTEN</code></td></tr>
<tr><td>Veri koruma</td><td>Time Travel (<code>AT</code>/<code>BEFORE</code>, <code>UNDROP</code>), Fail-safe (7 gün, yalnızca Snowflake destek), sıfır kopya klon</td></tr>
<tr><td>Güvenlik</td><td>RBAC, sistem rolleri (ACCOUNTADMIN, SECURITYADMIN, SYSADMIN, USERADMIN, PUBLIC), maskeleme ve satır erişim politikaları</td></tr>
<tr><td>Paylaşım</td><td>Secure Data Sharing, reader account, Marketplace</td></tr>
</table>
${NR("-- Snowflake\nCREATE WAREHOUSE wh_analiz WAREHOUSE_SIZE = 'XSMALL' AUTO_SUSPEND = 60 AUTO_RESUME = TRUE;\n\nSELECT v:musteri.ad::string AS ad, f.value:urun::string AS urun\nFROM ham_siparis,\n     LATERAL FLATTEN(input => v:satirlar) f;\n\nSELECT * FROM orders AT(OFFSET => -60 * 30);     -- 30 dakika önceki hali\nCREATE TABLE orders_dev CLONE orders;              -- sıfır kopya klon\nUNDROP TABLE orders;")}
<div class="warn"><b>Güncellik</b>Her iki sınavın kapsamı ve soru sayısı sık güncellenir. Resmi sınav rehberini indir ve maddeleri buradaki derslerle eşle.</div>
`,
  ex: [
    mc('<p>Databricks\'te bir Delta tablosunun dünkü halini sorgulamak için ne yazılır?</p>', ['<code>FOR SYSTEM_TIME AS OF</code>', '<code>TIMESTAMP AS OF \'...\'</code> veya <code>VERSION AS OF n</code>', '<code>AT(OFFSET =&gt; -86400)</code>', '<code>FLASHBACK QUERY</code>'], 1),
    mc('<p>Unity Catalog\'da tam tablo adı kaç parçalıdır?</p>', ['1 (tablo)', '2 (şema.tablo)', '3 (katalog.şema.tablo)', '4 (sunucu.katalog.şema.tablo)'], 2),
    mc('<p>Snowflake\'te aynı anda çok sayıda kullanıcının sorgusu kuyruğa giriyor. Uygun çözüm hangisidir?</p>', ['Ambarı büyütmek (scale up)', 'Çok kümeli ambar ile genişletmek (scale out)', 'Sonuç önbelleğini kapatmak', 'Fail-safe süresini artırmak'], 1),
    mc('<p>Snowflake\'te silinen bir tabloyu Time Travel süresi içinde geri getiren komut?</p>', ['<code>FLASHBACK TABLE</code>', '<code>UNDROP TABLE</code>', '<code>RESTORE TABLE</code>', '<code>ROLLBACK</code>'], 1),
    mc('<p>Snowflake\'te aynı sorgu, tablo değişmediyse 24 saat içinde tekrar çalıştırıldığında ambar çalışmadan sonuç döner. Bu hangi önbellektir?</p>', ['Yerel disk önbelleği', 'Sonuç önbelleği (result cache)', 'Meta veri önbelleği', 'Tarayıcı önbelleği'], 1),
    mc('<p>Databricks SQL\'de bir dizideki her elemana fonksiyon uygulayan yüksek dereceli fonksiyon?</p>', ['<code>explode</code>', '<code>transform</code>', '<code>flatten</code>', '<code>unnest</code>'], 1)
  ]
}, {
  id: 'cert-tsql', lv: 'C1', mod: SRT, min: 13,
  title: 'T-SQL sorgulama sertifika konuları: SQL Server ile sorgu yazmak',
  sum: 'Eski 70-761 / DP-080 kapsamındaki T-SQL konularının kontrol listesi ve tuzaklar.',
  body: `
<h2>Hangi sınav?</h2>
<p>Microsoft'un T-SQL sorgulama sınavı (70-761) emekliye ayrıldı; konuları bugün <b>DP-080: Querying Data with Microsoft Transact-SQL</b> eğitimi ve DP-300 / DP-203 gibi rol sertifikalarının içinde yaşıyor. Kurumların iş ilanlarında da “ileri T-SQL” bu kapsam olarak beklenir.</p>
<h2>Kontrol listesi</h2>
<table>
<tr><th>Konu</th><th>Kesit SQL dersi</th></tr>
<tr><td>SELECT, TOP / OFFSET-FETCH, WHERE, ORDER BY</td><td>Temeller, T-SQL: TOP</td></tr>
<tr><td>Tarih, metin, dönüşüm (CAST, CONVERT, TRY_CONVERT, PARSE, FORMAT)</td><td>T-SQL: tarih, metin, dönüşüm</td></tr>
<tr><td>JOIN, APPLY, alt sorgular, türetilmiş tablolar, CTE, özyineleme</td><td>Birleştirme, T-SQL APPLY, CTE</td></tr>
<tr><td>Küme işlemleri (UNION, INTERSECT, EXCEPT)</td><td>Küme işlemleri</td></tr>
<tr><td>Gruplama, GROUPING SETS / ROLLUP / CUBE, PIVOT / UNPIVOT</td><td>Ara toplamlar, T-SQL PIVOT</td></tr>
<tr><td>Pencere fonksiyonları (sıralama, offset, toplama, çerçeve)</td><td>Pencere fonksiyonları modülü</td></tr>
<tr><td>DML, OUTPUT, MERGE, işlemler, hata yönetimi (TRY/CATCH, THROW)</td><td>T-SQL MERGE, hata yönetimi</td></tr>
<tr><td>Değişkenler, akış kontrolü, geçici tablolar ve tablo değişkenleri</td><td>T-SQL değişkenler, geçici tablolar</td></tr>
<tr><td>View, fonksiyon (skaler, satır içi tablo), saklı yordam</td><td>T-SQL yordam ve fonksiyon</td></tr>
<tr><td>JSON ve XML, temporal tablolar</td><td>T-SQL JSON, temporal</td></tr>
</table>
<h2>Sık tuzaklar</h2>
<ul>
<li><code>TOP</code> ORDER BY olmadan rastgele satır döndürür; eşitlikler için <code>WITH TIES</code>.</li>
<li><code>OFFSET ... FETCH</code> ORDER BY olmadan yazılamaz.</li>
<li>Tam sayı bölmesi: <code>5 / 2 = 2</code>.</li>
<li><code>ISNULL</code> sonucun tipini ilk argümana göre belirler ve metni kesebilir; <code>COALESCE</code> en yüksek öncelikli tipi kullanır.</li>
<li>CROSS APPLY satır döndürmeyen sol satırı eler, OUTER APPLY korur.</li>
<li>Tablo değişkenleri işlem geri alındığında geri alınmaz; geçici tablolar alınır.</li>
<li><code>THROW</code>'dan önceki ifade noktalı virgülle bitmelidir.</li>
<li><code>OUTPUT inserted.*, deleted.*</code> ile değişen satırları yakala.</li>
</ul>
${CODE("SELECT TOP (3) WITH TIES name, price\nFROM dbo.products\nORDER BY price DESC;", null, { base: 'tsql' })}
`,
  ex: [
    mc('<p><code>SELECT ISNULL(NULL, \'Merhaba Dünya\')</code> ifadesinde ilk argüman <code>CAST(NULL AS VARCHAR(5))</code> olursa sonuç ne olur?</p>', ["'Merhaba Dünya'", "'Merha' (ilk argümanın uzunluğuna kesilir)", 'NULL', 'Hata'], 1),
    mc('<p>Hangisi <code>OFFSET 10 ROWS FETCH NEXT 5 ROWS ONLY</code> için zorunludur?</p>', ['GROUP BY', 'ORDER BY', 'TOP', 'WHERE'], 1),
    mc('<p>Bir işlem içinde tablo değişkenine (<code>@t</code>) ve geçici tabloya (<code>#t</code>) satır eklenip ROLLBACK yapılırsa ne olur?</p>', ['İkisi de geri alınır', 'Yalnızca @t geri alınır', 'Yalnızca #t geri alınır; @t satırları kalır', 'Hiçbiri geri alınmaz'], 2),
    { t: 'sql', base: 'tsql', dl: ['tsql'], q: '<p>T-SQL ile: en pahalı 2 ürünü eşitlikleri de dahil ederek getir (<code>TOP ... WITH TIES</code>): <code>name</code>, <code>price</code>.</p>', sol: 'SELECT TOP (2) WITH TIES name, price FROM dbo.products ORDER BY price DESC;' }
  ]
}];
const iR = L.findIndex(l => l.id === 'oracle-1z0');
L.splice(iR < 0 ? L.length : iR + 1, 0, ...certLessons);

/* ======================= Patikalara ekle ======================= */
const P = window.SQLP_PATHS; const PA = {}; P.forEach(p => PA[p.id] = p);
const ins = (pid, afterId, ids) => { const p = PA[pid]; if (!p) return; ids = ids.filter(x => !p.lessons.includes(x)); const i = p.lessons.indexOf(afterId); p.lessons.splice(i < 0 ? p.lessons.length : i + 1, 0, ...ids); };
const compAdd = (pid, title, ids) => { const p = PA[pid]; if (!p || !p.comp) return; const c = p.comp.find(x => x.t === title); if (c) ids.forEach(id => { if (!c.l.includes(id)) c.l.push(id); }); };
ins('temel', 'veri-seti', ['sozdizimi']); ins('temel', 'tarih-fn', ['tarih-filtre']); ins('temel', 'having', ['toplama-tuzak']); ins('temel', 'correlated', ['exists-anyall']); ins('temel', 'coklu-join', ['join-ozet']);
ins('analist', 'tarih-fn', ['tarih-filtre']); ins('analist', 'having', ['toplama-tuzak']); ins('analist', 'coklu-join', ['join-ozet']); ins('analist', 'correlated', ['exists-anyall']); ins('analist', 'lag-lead', ['first-last']); ins('analist', 'an-aktif', ['ardisik-seri']); ins('analist', 'bq-giris', ['cert-gda']);
ins('bilimci', 'correlated', ['exists-anyall']); ins('bilimci', 'lag-lead', ['first-last', 'ardisik-seri']);
ins('muhendis', 'ddl-create', ['kisitlar']); ins('muhendis', 'view', ['view-ileri']); ins('muhendis', 'index', ['sargable']); ins('muhendis', 'dwh-bulut', ['cert-dbx-snow']);
ins('tsql', 'ts-top', ['sozdizimi']); ins('tsql', 'ts-index', ['sargable']); ins('tsql', 'view', ['view-ileri']); ins('tsql', 'ts-merge', ['cert-tsql']);
ins('bi', 'tarih-fn', ['tarih-filtre']); ins('bi', 'view', ['view-ileri']); ins('bi', 'coklu-join', ['join-ozet']);
ins('dba', 'index', ['sargable']); ins('dba', 'ddl-create', ['kisitlar']); ins('dba', 'azure-sql', ['dp300-yonetim']);
ins('backend', 'ddl-create', ['kisitlar']); ins('backend', 'index', ['sargable']); ins('backend', 'view', ['view-ileri']);
ins('uzman', 'correlated', ['exists-anyall']); ins('uzman', 'ileri-desenler', ['ardisik-seri', 'first-last']);
ins('sertifika', 'oracle-ozel', ['z071-fonksiyon', 'z071-donusum']); ins('sertifika', 'transaction', ['z071-dml-tcl']); ins('sertifika', 'alter-drop', ['z071-ddl', 'kisitlar']); ins('sertifika', 'ts-sequence', ['z071-nesneler', 'view-ileri']); ins('sertifika', 'correlated', ['exists-anyall']); ins('sertifika', 'tarih-fn', ['tarih-filtre']); ins('sertifika', 'having', ['toplama-tuzak']);
ins('sertifika', 'mulakat-2', ['cert-tsql', 'dp300-yonetim', 'cert-gda', 'cert-dbx-snow']);
compAdd('sertifika', 'Fonksiyonlar', ['z071-fonksiyon', 'z071-donusum']); compAdd('sertifika', 'Alt sorgular', ['exists-anyall']); compAdd('sertifika', 'Veri değiştirme', ['z071-dml-tcl']); compAdd('sertifika', 'Şema nesneleri', ['z071-ddl', 'z071-nesneler', 'kisitlar', 'view-ileri']);
if (PA.sertifika) { PA.sertifika.comp.push({ t: 'Diğer sertifikalar', d: 'T-SQL, DP-300, Google DA, Databricks ve SnowPro konuları', l: ['cert-tsql', 'dp300-yonetim', 'cert-gda', 'cert-dbx-snow'] }); PA.sertifika.long += ' Ayrıca Microsoft DP-300, Google Data Analytics, Databricks Data Analyst ve SnowPro Core için platforma özgü konu dersleri ve Sınavlar bölümünde süreli deneme sınavları var.'; }
compAdd('dba', 'Bulut ve veri hareketi', ['dp300-yonetim']);

const G = window.SQLP_GLOSSARY || [];
G.push(['SARGable', 'İndeks üzerinde arama yapılabilen koşul; sütun fonksiyon veya işlem içine sokulmadan yazılır.'], ['Semi-join', 'Sol tablodaki satırları, sağda eşleşmesi olup olmadığına göre süzen birleştirme (EXISTS).'], ['Anti-join', 'Sağda eşleşmesi olmayan sol satırları getiren birleştirme (NOT EXISTS).'], ['Boşluklar ve adalar', 'Ardışık değer serilerini (adalar) ve aralarındaki kesintileri (boşluklar) bulma problemi.'], ['Materialized view', 'Sonucu diskte saklanan, yenilenmesi gereken görünüm.'], ['Biçim modeli', 'TO_CHAR / TO_DATE gibi fonksiyonlarda kullanılan YYYY, MM, 9, 0 gibi biçim öğeleri.'], ['Synonym', 'Bir veritabanı nesnesi için takma ad (Oracle, SQL Server).'], ['RPO / RTO', 'Felaket kurtarmada göze alınan en fazla veri kaybı süresi / hizmetin geri dönme süresi.']);
})();
