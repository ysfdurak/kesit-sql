/* Kesit SQL içerik 5: T-SQL (SQL Server) modülü, SQL türlerine özgü dersler, mülakat hazırlığı ve ek konular */
(function () {
const L = window.SQLP_LESSONS = window.SQLP_LESSONS || [];
const TS = (src, v, o) => CODE(src, v || null, Object.assign({ base: 'tsql' }, o || {}));
const MOD = 'T-SQL (SQL Server)';
const ex = (o) => Object.assign({ t: 'sql', base: 'tsql', dl: ['tsql'] }, o);
const after = (id, lessons) => { const i = L.findIndex(l => l.id === id); L.splice(i < 0 ? L.length : i + 1, 0, ...lessons); };

/* ======================= Temeller: ek dersler ======================= */
after('veritabani', [{
  id: 'veri-seti', lv: 'A1', mod: 'Temeller', min: 10,
  title: 'Veri setini tanıyalım',
  sum: 'Tablolara, satır sayılarına ve ilişkilere ilk bakış.',
  body: `
<h2>Önce veriye bak</h2>
<p>İyi bir analist sorgu yazmadan önce veriyi tanır: Hangi tablolar var, kaç satır var, hangi sütunlar boş, tablolar birbirine nasıl bağlı? <b>Veri Seti</b> sayfasında tüm tabloların ilişki şemasını, sütunlarını ve verinin kendisini görebilirsin. Burada aynı keşfi SQL ile yapalım.</p>
<h3>Her tabloda kaç satır var?</h3>
<pre class="code">SELECT 'customers' AS tablo, COUNT(*) AS satir FROM customers
UNION ALL SELECT 'orders', COUNT(*) FROM orders
UNION ALL SELECT 'order_items', COUNT(*) FROM order_items
UNION ALL SELECT 'products', COUNT(*) FROM products
UNION ALL SELECT 'employees', COUNT(*) FROM employees
UNION ALL SELECT 'departments', COUNT(*) FROM departments;</pre>
<h3>Bir tablodan örnek satırlar</h3>
<pre class="code">SELECT *
FROM orders
LIMIT 5;</pre>
<h3>Veri hangi tarihleri kapsıyor?</h3>
<pre class="code">SELECT MIN(order_date) AS ilk_siparis,
       MAX(order_date) AS son_siparis,
       COUNT(DISTINCT customer_id) AS siparis_veren_musteri
FROM orders;</pre>
<div class="tip"><b>Keşif kontrol listesi</b>Satır sayısı, tarih aralığı, benzersiz değer sayıları, NULL oranları ve kategorik sütunların değer listesi. Bu beş kontrol, raporlarda yapılan hataların çoğunu daha baştan önler.</div>
`,
  ex: [
    { t: 'sql', q: '<p>Siparişlerdeki <b>farklı durum</b> (<code>status</code>) değerlerini ve her birinin kaç siparişte geçtiğini getir.</p>', sol: 'SELECT status, COUNT(*) FROM orders GROUP BY status;' },
    { t: 'sql', q: '<p>Müşteri tablosunda <b>e-postası boş</b> ve <b>şehri boş</b> olan müşteri sayılarını tek satırda getir: <code>bos_email</code>, <code>bos_sehir</code>.</p>', sol: 'SELECT COUNT(*) - COUNT(email) AS bos_email, COUNT(*) - COUNT(city) AS bos_sehir FROM customers;', hint: '<code>COUNT(*)</code> tüm satırları, <code>COUNT(sutun)</code> NULL olmayanları sayar; farkları boş olanlardır.' },
    { t: 'mc', q: '<p><code>order_items</code> tablosundaki bir satır neyi temsil eder?</p>', o: ['Bir müşteriyi', 'Bir siparişi', 'Bir siparişteki bir ürünü (sipariş satırı)', 'Bir ürünün stok hareketini'], a: 2, why: 'Bir sipariş birden çok ürün içerebilir; her ürün order_items\'ta ayrı bir satırdır. Buna tablonun grain düzeyi (grain) denir.' }
  ]
}]);

after('sorgu-sirasi', [{
  id: 'stil', lv: 'A2', mod: 'Özetleme', min: 8,
  title: 'Okunabilir SQL yazmak',
  sum: 'Ekip içinde kabul gören yazım kuralları.',
  body: `
<h2>Kod bir kez yazılır, çok kez okunur</h2>
<p>SQL motoru biçimlendirmeyi umursamaz ama ekibin umursar. Yaygın kabul gören kurallar:</p>
<ol>
<li>Anahtar kelimeleri <b>büyük</b>, tablo ve sütun adlarını <b>küçük</b> yaz.</li>
<li>Her ana bölüm (SELECT, FROM, WHERE, GROUP BY…) <b>yeni satırda</b> başlasın.</li>
<li>Anlamlı takma adlar kullan: <code>o</code> (orders), <code>c</code> (customers); <code>a</code>, <code>b</code>, <code>t1</code> değil.</li>
<li>JOIN'lerde her zaman <code>ON</code> koşulu ve tablo öneki yaz: <code>o.customer_id</code>.</li>
<li>İç içe alt sorgular yerine <b>CTE</b> kullan; her CTE tek bir iş yapsın.</li>
<li>Hesaplanan sütunlara <b>açıklayıcı takma ad</b> ver: <code>AS net_ciro</code>.</li>
<li>Neden yapıldığı belli olmayan kısımlara <b>yorum</b> ekle.</li>
<li>Adlandırmada tek bir kuralı izle: <code>snake_case</code> (order_date) yaygındır; SQL Server ekiplerinde <code>PascalCase</code> (OrderDate) da sık görülür.</li>
</ol>
<pre class="code">-- Teslim edilen siparişlerden kanal bazında net ciro
WITH teslim AS (
    SELECT o.order_id, o.channel
    FROM orders AS o
    WHERE o.status = 'delivered'
)
SELECT t.channel,
       ROUND(SUM(oi.quantity * oi.unit_price * (1 - oi.discount)), 2) AS net_ciro
FROM teslim AS t
JOIN order_items AS oi ON oi.order_id = t.order_id
GROUP BY t.channel
ORDER BY net_ciro DESC;</pre>
`,
  ex: [
    { t: 'mc', q: '<p>Hangisi okunabilirlik açısından <b>en iyi</b> takma ad seçimidir?</p>', o: ['<code>FROM orders a JOIN customers b</code>', '<code>FROM orders o JOIN customers c</code>', '<code>FROM orders t1 JOIN customers t2</code>', '<code>FROM orders x JOIN customers y</code>'], a: 1 },
    { t: 'mc', q: '<p>Üç seviye iç içe geçmiş alt sorgudan oluşan bir sorguyu okunur hale getirmenin en iyi yolu nedir?</p>', o: ['Hepsini tek satıra yazmak', 'Adımları CTE (WITH) bloklarına bölmek', 'DISTINCT eklemek', 'Takma adları kaldırmak'], a: 1 }
  ]
}]);

after('coklu-join', [{
  id: 'non-equi', lv: 'B1', mod: 'Tabloları Birleştirme', min: 12,
  title: 'Eşit olmayan JOIN ve aralık eşleştirme',
  sum: 'BETWEEN ve karşılaştırmalarla birleştirmek: fiyat bantları, kampanya dönemleri.',
  body: `
<h2>JOIN koşulu eşitlik olmak zorunda değil</h2>
<p>ON içinde her türlü koşul yazılabilir. En yaygın kullanım, bir değeri bir <b>aralık tablosuyla</b> eşleştirmektir: fiyat bantları, vergi dilimleri, kampanya dönemleri.</p>
<pre class="code">WITH bantlar AS (
  SELECT 0 AS alt, 500 AS ust, 'Ekonomik' AS bant
  UNION ALL SELECT 500, 2000, 'Orta'
  UNION ALL SELECT 2000, 100000, 'Premium'
)
SELECT b.bant, COUNT(*) AS urun_sayisi, MIN(p.price) AS en_dusuk, MAX(p.price) AS en_yuksek
FROM products p
JOIN bantlar b ON p.price >= b.alt AND p.price < b.ust
GROUP BY b.bant
ORDER BY en_dusuk;</pre>
<h2>Tarih aralığına göre eşleştirme</h2>
<pre class="code">WITH kampanyalar AS (
  SELECT 'Yaz İndirimi' AS kampanya, '2024-06-15' AS bas, '2024-07-15' AS bit
  UNION ALL SELECT 'Efsane Kasım', '2024-11-01', '2024-11-30'
)
SELECT k.kampanya, COUNT(o.order_id) AS siparis
FROM kampanyalar k
LEFT JOIN orders o ON o.order_date BETWEEN k.bas AND k.bit
GROUP BY k.kampanya;</pre>
<div class="warn"><b>Aralıklar çakışmasın</b>Bir değer iki banda birden düşerse satır iki kez sayılır. Alt sınırı dahil, üst sınırı hariç (<code>&gt;= alt AND &lt; ust</code>) yazmak bu hatayı önler.</div>
`,
  ex: [
    { t: 'sql', q: '<p>Çalışanları maaş bantlarına ayır: <b>0–50000</b> “Bant 1”, <b>50000–80000</b> “Bant 2”, <b>80000 ve üzeri</b> “Bant 3” (alt sınır dahil, üst hariç). Bant tablosunu CTE ile oluştur ve her banttaki çalışan sayısını getir: <code>bant</code>, <code>calisan</code>.</p>', sol: "WITH b AS (SELECT 0 AS alt, 50000 AS ust, 'Bant 1' AS bant UNION ALL SELECT 50000, 80000, 'Bant 2' UNION ALL SELECT 80000, 10000000, 'Bant 3') SELECT b.bant, COUNT(*) AS calisan FROM employees e JOIN b ON e.salary >= b.alt AND e.salary < b.ust GROUP BY b.bant;" },
    { t: 'sql', q: '<p>Her siparişi, müşterinin kayıt olduğu günden itibaren <b>ilk 30 gün içinde</b> verilip verilmediğine göre say: Kayıttan sonraki 30 gün içinde verilen sipariş sayısını tek değer olarak getir (<code>order_date</code> ≥ <code>signup_date</code> ve <code>order_date</code> ≤ kayıt + 30 gün).</p>', sol: "SELECT COUNT(*) FROM orders o JOIN customers c ON c.customer_id = o.customer_id AND o.order_date >= c.signup_date AND o.order_date <= date(c.signup_date, '+30 days');", hint: 'JOIN koşuluna tarih aralığı ekle. SQL Server: DATEADD(day, 30, c.signup_date), PostgreSQL: c.signup_date + INTERVAL \'30 day\'.' }
  ]
}]);

after('correlated', [{
  id: 'sik-hatalar', lv: 'B1', mod: 'Küme ve Alt Sorgular', min: 18,
  title: 'Sık yapılan SQL hataları: düzelt ve öğren',
  sum: 'Hatalı sorguları bulup düzelterek en yaygın tuzakları pekiştir.',
  body: `
<h2>Sessiz hatalar en tehlikelisidir</h2>
<p>Hata veren sorgu kolay düzeltilir. Asıl tehlike, <b>çalışan ama yanlış sonuç döndüren</b> sorgulardır. Bu derste her alıştırma hatalı bir sorguyla başlar; hatayı bul ve düzelt.</p>
<table><tr><th>Tuzak</th><th>Belirti</th><th>Çözüm</th></tr>
<tr><td><code>= NULL</code></td><td>Hiç satır gelmez</td><td><code>IS NULL</code></td></tr>
<tr><td><code>NOT IN</code> + NULL</td><td>Hiç satır gelmez</td><td><code>NOT EXISTS</code> veya alt sorguda <code>IS NOT NULL</code></td></tr>
<tr><td>LEFT JOIN + WHERE sağ tablo</td><td>LEFT JOIN, INNER'a dönüşür</td><td>Koşulu ON'a taşı</td></tr>
<tr><td>LEFT JOIN + <code>COUNT(*)</code></td><td>Eşi olmayanlar 1 sayılır</td><td><code>COUNT(sağ_tablo.id)</code></td></tr>
<tr><td>Tam sayı bölmesi</td><td>Oranlar 0 çıkar</td><td><code>100.0 * pay / payda</code></td></tr>
<tr><td>JOIN sonrası toplam</td><td>Toplamlar şişer (fan-out)</td><td>Önce topla, sonra birleştir</td></tr>
<tr><td>AND/OR önceliği</td><td>Fazla satır gelir</td><td>Parantez</td></tr>
</table>
`,
  ex: [
    { t: 'sql', q: '<p>Bu sorgu e-postası olmayan müşterileri bulmalı ama hiç satır döndürmüyor. Düzelt.</p>', start: 'SELECT customer_id, first_name\nFROM customers\nWHERE email = NULL;', sol: 'SELECT customer_id, first_name FROM customers WHERE email IS NULL;' },
    { t: 'sql', q: '<p>Bu sorgu her departmanın çalışan sayısını vermeli; ama çalışanı olmayan Hukuk departmanı 1 görünüyor. Düzelt.</p>', start: 'SELECT d.name, COUNT(*) AS calisan\nFROM departments d\nLEFT JOIN employees e ON e.dept_id = d.dept_id\nGROUP BY d.dept_id, d.name;', sol: 'SELECT d.name, COUNT(e.emp_id) AS calisan FROM departments d LEFT JOIN employees e ON e.dept_id = d.dept_id GROUP BY d.dept_id, d.name;' },
    { t: 'sql', q: '<p>Bu sorgu tüm müşterileri ve 2024 sipariş sayılarını (siparişi olmayanlar 0) vermeli; ama 2024\'te sipariş vermeyenler listede hiç yok. Düzelt.</p>', start: "SELECT c.customer_id, COUNT(o.order_id) AS siparis\nFROM customers c\nLEFT JOIN orders o ON o.customer_id = c.customer_id\nWHERE o.order_date >= '2024-01-01'\nGROUP BY c.customer_id;", sol: "SELECT c.customer_id, COUNT(o.order_id) AS siparis FROM customers c LEFT JOIN orders o ON o.customer_id = c.customer_id AND o.order_date >= '2024-01-01' GROUP BY c.customer_id;", hint: 'Sağ tabloya ait filtreyi WHERE yerine ON içine taşı.' },
    { t: 'sql', q: '<p>Bu sorgu her kanalın iptal oranını (yüzde) vermeli ama SQL Server, PostgreSQL ve SQLite\'ta hep 0 çıkıyor. Düzelt ve 1 basamağa yuvarla.</p>', start: "SELECT channel,\n       SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) * 100 / COUNT(*) AS iptal_orani\nFROM orders\nGROUP BY channel;", sol: "SELECT channel, ROUND(100.0 * SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) / COUNT(*), 1) AS iptal_orani FROM orders GROUP BY channel;", hint: 'Payı 100.0 ile çarparak ondalıklı yap.' },
    { t: 'sql', q: '<p>Bu sorgu her müşteri segmentinin toplam sipariş sayısını vermeli ama sayılar şişkin. Düzelt.</p>', start: 'SELECT c.segment, COUNT(*) AS siparis\nFROM customers c\nJOIN orders o ON o.customer_id = c.customer_id\nJOIN order_items oi ON oi.order_id = o.order_id\nGROUP BY c.segment;', sol: 'SELECT c.segment, COUNT(DISTINCT o.order_id) AS siparis FROM customers c JOIN orders o ON o.customer_id = c.customer_id JOIN order_items oi ON oi.order_id = o.order_id GROUP BY c.segment;', hint: 'Sipariş satırları siparişleri çoğaltıyor: ya order_items JOIN\'ini kaldır ya da COUNT(DISTINCT o.order_id) kullan.' }
  ]
}]);

/* ======================= Gruplama kümeleri (tüm SQL türleri) ======================= */
after('pivot', [{
  id: 'rollup', lv: 'B2', mod: 'İleri Sorgu Yapıları', min: 16,
  title: 'ROLLUP, CUBE ve GROUPING SETS: ara toplamlar',
  sum: 'Tek sorguda detay, ara toplam ve genel toplam üretmek.',
  body: `
<h2>Raporlarda ara toplam</h2>
<p>“Kategori ve kanal bazında satış, her kategorinin ara toplamı ve genel toplam” gibi raporlar için birden çok GROUP BY'ı UNION ile birleştirmek yerine <b>gruplama kümeleri</b> kullanılır. SQL Server, PostgreSQL, Oracle ve MySQL (WITH ROLLUP) destekler; SQLite desteklemez (SQLite sekmesinde UNION ALL karşılığını görebilirsin).</p>
${TS(`SELECT p.category, o.channel, COUNT(*) AS satis_satiri
FROM order_items oi
JOIN orders o   ON o.order_id = oi.order_id
JOIN products p ON p.product_id = oi.product_id
WHERE p.category IN ('Kitap', 'Spor')
GROUP BY ROLLUP (p.category, o.channel)
ORDER BY p.category, o.channel;`, {
  pg: `SELECT p.category, o.channel, COUNT(*) AS satis_satiri
FROM order_items oi
JOIN orders o   ON o.order_id = oi.order_id
JOIN products p ON p.product_id = oi.product_id
WHERE p.category IN ('Kitap', 'Spor')
GROUP BY ROLLUP (p.category, o.channel)
ORDER BY p.category, o.channel;`,
  oracle: `SELECT p.category, o.channel, COUNT(*) AS satis_satiri
FROM order_items oi
JOIN orders o   ON o.order_id = oi.order_id
JOIN products p ON p.product_id = oi.product_id
WHERE p.category IN ('Kitap', 'Spor')
GROUP BY ROLLUP (p.category, o.channel)
ORDER BY p.category, o.channel;`,
  mysql: `SELECT p.category, o.channel, COUNT(*) AS satis_satiri
FROM order_items oi
JOIN orders o   ON o.order_id = oi.order_id
JOIN products p ON p.product_id = oi.product_id
WHERE p.category IN ('Kitap', 'Spor')
GROUP BY p.category, o.channel WITH ROLLUP;`,
  sqlite: `-- SQLite'ta ROLLUP yok: her toplam düzeyi ayrı sorgu + UNION ALL
SELECT p.category, o.channel, COUNT(*) AS satis_satiri
FROM order_items oi JOIN orders o ON o.order_id = oi.order_id JOIN products p ON p.product_id = oi.product_id
WHERE p.category IN ('Kitap', 'Spor')
GROUP BY p.category, o.channel
UNION ALL
SELECT p.category, NULL, COUNT(*)
FROM order_items oi JOIN orders o ON o.order_id = oi.order_id JOIN products p ON p.product_id = oi.product_id
WHERE p.category IN ('Kitap', 'Spor')
GROUP BY p.category
UNION ALL
SELECT NULL, NULL, COUNT(*)
FROM order_items oi JOIN products p ON p.product_id = oi.product_id
WHERE p.category IN ('Kitap', 'Spor')
ORDER BY 1, 2;`
}, { diff: ['pg', 'oracle'] })}
<p>Sonuçta <code>channel</code> değeri NULL olan satırlar o kategorinin <b>ara toplamı</b>, iki sütunun da NULL olduğu satır <b>genel toplam</b>dır.</p>
<table><tr><th>Yazım</th><th>Üretilen gruplar (a, b için)</th></tr>
<tr><td><code>ROLLUP (a, b)</code></td><td>(a, b), (a), ()  — hiyerarşik ara toplamlar</td></tr>
<tr><td><code>CUBE (a, b)</code></td><td>(a, b), (a), (b), ()  — tüm kombinasyonlar</td></tr>
<tr><td><code>GROUPING SETS ((a), (b))</code></td><td>Yalnızca (a) ve (b)  — istediğin kümeler</td></tr>
</table>
<h2>GROUPING() ile toplam satırını etiketlemek</h2>
<p>Gerçek NULL değerle “toplam” NULL'ını ayırmak için <code>GROUPING(sütun)</code> kullanılır: o satırda sütun toplanmışsa 1 döner.</p>
${TS(`SELECT CASE WHEN GROUPING(c.segment) = 1 THEN N'TOPLAM' ELSE c.segment END AS segment,
       COUNT(*) AS siparis
FROM orders o
JOIN customers c ON c.customer_id = o.customer_id
GROUP BY ROLLUP (c.segment);`, {
  pg: `SELECT CASE WHEN GROUPING(c.segment) = 1 THEN 'TOPLAM' ELSE c.segment END AS segment,
       COUNT(*) AS siparis
FROM orders o
JOIN customers c ON c.customer_id = o.customer_id
GROUP BY ROLLUP (c.segment);`,
  oracle: `SELECT CASE WHEN GROUPING(c.segment) = 1 THEN 'TOPLAM' ELSE c.segment END AS segment,
       COUNT(*) AS siparis
FROM orders o
JOIN customers c ON c.customer_id = o.customer_id
GROUP BY ROLLUP (c.segment);`,
  mysql: `SELECT IF(GROUPING(c.segment) = 1, 'TOPLAM', c.segment) AS segment,
       COUNT(*) AS siparis
FROM orders o
JOIN customers c ON c.customer_id = o.customer_id
GROUP BY c.segment WITH ROLLUP;`
})}
<h2>GROUPING SETS</h2>
${TS(`SELECT c.segment, o.channel, COUNT(*) AS siparis
FROM orders o
JOIN customers c ON c.customer_id = o.customer_id
GROUP BY GROUPING SETS ((c.segment), (o.channel));`, {
  pg: `SELECT c.segment, o.channel, COUNT(*) AS siparis
FROM orders o
JOIN customers c ON c.customer_id = o.customer_id
GROUP BY GROUPING SETS ((c.segment), (o.channel));`,
  oracle: `SELECT c.segment, o.channel, COUNT(*) AS siparis
FROM orders o
JOIN customers c ON c.customer_id = o.customer_id
GROUP BY GROUPING SETS ((c.segment), (o.channel));`
})}
`,
  ex: [
    ex({ q: '<p>Her <b>yıl</b> ve <b>sipariş durumu</b> için sipariş sayısını, her yılın ara toplamını ve genel toplamı <code>ROLLUP</code> ile getir: <code>yil</code>, <code>status</code>, <code>siparis</code>.</p>', sol: 'SELECT YEAR(order_date) AS yil, status, COUNT(*) AS siparis\nFROM orders\nGROUP BY ROLLUP (YEAR(order_date), status);', dl: ['tsql', 'pg', 'oracle', 'mysql'], solv: { pg: 'SELECT EXTRACT(YEAR FROM order_date) AS yil, status, COUNT(*) AS siparis\nFROM orders\nGROUP BY ROLLUP (EXTRACT(YEAR FROM order_date), status);', oracle: 'SELECT EXTRACT(YEAR FROM order_date) AS yil, status, COUNT(*) AS siparis\nFROM orders\nGROUP BY ROLLUP (EXTRACT(YEAR FROM order_date), status);', mysql: 'SELECT YEAR(order_date) AS yil, status, COUNT(*) AS siparis\nFROM orders\nGROUP BY YEAR(order_date), status WITH ROLLUP;' }, hint: 'GROUP BY ROLLUP (yıl ifadesi, status). MySQL\'de GROUP BY ... WITH ROLLUP.' }),
    ex({ q: '<p><code>CUBE</code> ile kanal (<code>channel</code>) ve durum (<code>status</code>) için tüm kombinasyonların sipariş sayısını getir: <code>channel</code>, <code>status</code>, <code>siparis</code>.</p>', sol: 'SELECT channel, status, COUNT(*) AS siparis FROM orders GROUP BY CUBE (channel, status);', dl: ['tsql', 'pg', 'oracle'], solv: { pg: 'SELECT channel, status, COUNT(*) AS siparis FROM orders GROUP BY CUBE (channel, status);', oracle: 'SELECT channel, status, COUNT(*) AS siparis FROM orders GROUP BY CUBE (channel, status);' } })
  ]
}]);

/* ======================= T-SQL MODÜLÜ ======================= */
const tsql = [];
tsql.push({
  id: 'ts-giris', lv: 'A2', mod: MOD, min: 12,
  title: 'SQL Server ve T-SQL\'e giriş',
  sum: 'Veritabanı, şema, dbo, köşeli parantez, N\'..\' ve GO.',
  body: `
<h2>T-SQL nedir?</h2>
<p><b>Transact-SQL (T-SQL)</b>, Microsoft SQL Server ve Azure SQL'in SQL lehçesidir. Standart SQL'e değişkenler, akış kontrolü (IF, WHILE), hata yönetimi (TRY/CATCH), saklı yordamlar ve zengin bir fonksiyon kütüphanesi ekler. Türkiye'de bankacılık, perakende ve kamu sektöründe en yaygın kurumsal veritabanlarından biridir; bu yüzden veri analisti ve veri mühendisi ilanlarında sıkça istenir.</p>
<h2>Nesne adları: veritabanı.şema.nesne</h2>
<p>SQL Server'da her tablo bir <b>şemaya</b> aittir; varsayılan şema <code>dbo</code>'dur (database owner). Tam ad: <code>anadolu.dbo.customers</code>. Sorgularda şemayı yazmak iyi bir alışkanlıktır.</p>
<ul>
<li><b>[köşeli parantez]</b>: Boşluk içeren veya ayrılmış kelimeyle çakışan adlar için: <code>[Order Date]</code>, <code>[user]</code>.</li>
<li><b>N'...'</b>: Unicode metin sabiti. Türkçe karakterli değerleri <code>NVARCHAR</code> sütunlara yazarken <code>N'İzmir'</code> biçiminde kullan; yoksa “ş, ğ, ı” gibi harfler bozulabilir.</li>
<li><b>GO</b>: SQL değil, SSMS/sqlcmd'nin <i>toplu iş ayırıcısıdır</i>. Kendisinden önceki komutları ayrı bir paket olarak gönderir. CREATE PROCEDURE gibi bazı komutlar paketteki tek komut olmak zorundadır.</li>
<li>İfadeleri <code>;</code> ile bitirmek isteğe bağlıdır ama önerilir (CTE ve MERGE öncesinde gereklidir).</li>
</ul>
${TS(`SELECT @@VERSION AS surum;

SELECT TOP 5 [first_name], [last_name], [city]
FROM dbo.customers
WHERE city = N'İzmir';`)}
<div class="note"><b>Araçlar</b>SQL Server Management Studio (SSMS) en yaygın araçtır; Azure Data Studio ve VS Code eklentisi de kullanılır. Ücretsiz <b>Developer</b> ve <b>Express</b> sürümleriyle kendi bilgisayarında çalışabilirsin. Örnek veritabanı olarak Microsoft'un <i>AdventureWorks</i> ve <i>WideWorldImporters</i> veritabanları popülerdir.</div>
<div class="tip"><b>Bu modül nasıl çalışır?</b>T-SQL modülündeki alıştırmalar SQL Server sözdizimiyle yazılır. Tarayıcıdaki motor, SQL Server'ın davranışını taklit eder: TOP, değişkenler, IF/WHILE, TRY/CATCH, geçici tablolar, saklı yordamlar, fonksiyonlar, MERGE, PIVOT ve APPLY çalışır. Hata mesajları SQL Server'ın biçimindedir (ör. <code>Msg 208 Invalid object name</code>).</div>
`,
  ex: [
    { t: 'mc', q: '<p><code>WHERE city = N\'İzmir\'</code> ifadesindeki <b>N</b> ne işe yarar?</p>', o: ['Değeri sayıya çevirir', 'Metni Unicode (NVARCHAR) olarak tanımlar; Türkçe karakterlerin korunmasını sağlar', 'NULL değerleri hariç tutar', 'Büyük/küçük harf duyarlılığını kapatır'], a: 1 },
    { t: 'mc', q: '<p><code>GO</code> hakkında hangisi doğrudur?</p>', o: ['Bir T-SQL komutudur ve işlemi onaylar', 'SSMS\'in toplu iş (batch) ayırıcısıdır; SQL Server\'a gönderilmez', 'Döngüyü sonlandırır', 'Sorguyu hızlandırır'], a: 1 },
    ex({ q: '<p>Şema adıyla (<code>dbo.products</code>) ve Unicode metin sabitiyle, kategorisi <b>Ev &amp; Yaşam</b> olan ürünlerin adını ve fiyatını getir.</p>', sol: "SELECT name, price FROM dbo.products WHERE category = N'Ev & Yaşam';" })
  ]
});

tsql.push({
  id: 'ts-top', lv: 'A2', mod: MOD, min: 14,
  title: 'TOP, WITH TIES, PERCENT ve OFFSET-FETCH',
  sum: 'SQL Server\'da ilk N satır, eşitleri dahil etmek ve sayfalama.',
  body: `
<h2>TOP</h2>
<p>SQL Server'da ilk N satır <code>TOP</code> ile alınır. TOP, SELECT'ten (ve varsa DISTINCT'ten) hemen sonra yazılır. Sıralama olmadan TOP rastgele N satır döndürür; her zaman ORDER BY ile kullan.</p>
${TS(`SELECT TOP 5 name, price
FROM products
ORDER BY price DESC;`, { pg: 'SELECT name, price\nFROM products\nORDER BY price DESC\nLIMIT 5;', mysql: 'SELECT name, price\nFROM products\nORDER BY price DESC\nLIMIT 5;', sqlite: 'SELECT name, price\nFROM products\nORDER BY price DESC\nLIMIT 5;', oracle: 'SELECT name, price\nFROM products\nORDER BY price DESC\nFETCH FIRST 5 ROWS ONLY;' })}
<h2>WITH TIES: son sıradaki eşitleri de getir</h2>
<p>En yüksek maaşlı 10 çalışanı istiyoruz ama 10. sıradaki maaşı alan başka biri de varsa onu dışarıda bırakmak haksızlık olur:</p>
${TS(`SELECT TOP 10 WITH TIES first_name, salary
FROM employees
ORDER BY salary DESC;`, { oracle: 'SELECT first_name, salary\nFROM employees\nORDER BY salary DESC\nFETCH FIRST 10 ROWS WITH TIES;', pg: '-- PostgreSQL 13+\nSELECT first_name, salary\nFROM employees\nORDER BY salary DESC\nFETCH FIRST 10 ROWS WITH TIES;', mysql: 'SELECT first_name, salary FROM (\n  SELECT first_name, salary, RANK() OVER (ORDER BY salary DESC) AS rk\n  FROM employees\n) t\nWHERE rk <= 10\nORDER BY salary DESC;', sqlite: 'SELECT first_name, salary FROM (\n  SELECT first_name, salary, RANK() OVER (ORDER BY salary DESC) AS rk\n  FROM employees\n) t\nWHERE rk <= 10\nORDER BY salary DESC;' }, { nr: ['pg', 'oracle'] })}
<p>Sonuç 10 değil 11 satırdır; çünkü 10. ve 11. sıradaki çalışanların maaşı aynı.</p>
<h2>TOP PERCENT</h2>
${TS(`SELECT TOP 10 PERCENT name, price
FROM products
ORDER BY price DESC;`)}
<h2>OFFSET-FETCH ile sayfalama</h2>
<p>Web sayfalarında “2. sayfa” gibi gösterimler için standart SQL'in OFFSET-FETCH yazımı kullanılır (SQL Server 2012+). ORDER BY zorunludur.</p>
${TS(`DECLARE @sayfa INT = 2, @boyut INT = 5;

SELECT name, price
FROM products
ORDER BY price DESC
OFFSET (@sayfa - 1) * @boyut ROWS
FETCH NEXT @boyut ROWS ONLY;`)}
<div class="note"><b>TOP başka yerlerde de</b><code>DELETE TOP (1000) FROM log WHERE ...</code> gibi büyük silmeleri parçalara bölmek için de kullanılır.</div>
`,
  ex: [
    ex({ q: '<p>Stoğu en <b>az</b> olan 5 ürünün adını ve stoğunu TOP ile getir (stoğa göre artan, eşitlikte <code>product_id</code>).</p>', sol: 'SELECT TOP 5 name, stock FROM products ORDER BY stock ASC, product_id;', ord: true }),
    ex({ q: '<p>Ürün sayısı en fazla olan <b>3 kategoriyi</b>, 3. sıradaki ile eşit sayıda ürünü olan kategoriler de dahil olacak şekilde getir: <code>category</code>, <code>adet</code>.</p>', sol: 'SELECT TOP 3 WITH TIES category, COUNT(*) AS adet FROM products GROUP BY category ORDER BY COUNT(*) DESC;', hint: 'TOP 3 WITH TIES ... ORDER BY COUNT(*) DESC' }),
    ex({ q: '<p>Müşterileri <code>customer_id</code>\'ye göre sırala ve <b>3. sayfayı</b> getir (her sayfada 10 müşteri): <code>customer_id</code>, <code>first_name</code>. OFFSET-FETCH kullan.</p>', sol: 'SELECT customer_id, first_name FROM customers ORDER BY customer_id OFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY;', ord: true })
  ]
});

tsql.push({
  id: 'ts-metin', lv: 'A2', mod: MOD, min: 15,
  title: 'T-SQL metin fonksiyonları',
  sum: 'LEN, LEFT/RIGHT, SUBSTRING, CHARINDEX, STUFF, REPLICATE, CONCAT, STRING_AGG.',
  body: `
<h2>SQL Server'ın metin araç kutusu</h2>
<table><tr><th>Fonksiyon</th><th>Örnek → Sonuç</th></tr>
<tr><td><code>LEN(s)</code></td><td><code>LEN('Ankara  ')</code> → 6 (sondaki boşlukları saymaz)</td></tr>
<tr><td><code>DATALENGTH(s)</code></td><td>Bayt sayısı (NVARCHAR'da karakter başına 2)</td></tr>
<tr><td><code>LEFT(s, n)</code>, <code>RIGHT(s, n)</code></td><td><code>LEFT('Anadolu', 3)</code> → Ana</td></tr>
<tr><td><code>SUBSTRING(s, başlangıç, uzunluk)</code></td><td><code>SUBSTRING('2024-05-17', 6, 2)</code> → 05</td></tr>
<tr><td><code>CHARINDEX(aranan, s)</code></td><td><code>CHARINDEX('@', 'ali@x.com')</code> → 4</td></tr>
<tr><td><code>REPLACE</code>, <code>REPLICATE(s, n)</code>, <code>REVERSE</code></td><td><code>REPLICATE('*', 3)</code> → ***</td></tr>
<tr><td><code>STUFF(s, baş, uzunluk, yeni)</code></td><td><code>STUFF('ABCDE', 2, 3, '*')</code> → A*E</td></tr>
<tr><td><code>CONCAT(a, b, ...)</code>, <code>CONCAT_WS(ayraç, ...)</code></td><td>NULL'ları boş metin sayar</td></tr>
<tr><td><code>TRIM</code>, <code>LTRIM</code>, <code>RTRIM</code>, <code>UPPER</code>, <code>LOWER</code></td><td>TRIM 2017+</td></tr>
<tr><td><code>STRING_AGG(s, ayraç)</code></td><td>Satırları tek metinde birleştirir (2017+)</td></tr>
</table>
${TS(`SELECT first_name,
       LEN(first_name) AS uzunluk,
       LEFT(first_name, 1) + '.' + LEFT(last_name, 1) + '.' AS bas_harf,
       UPPER(last_name) AS soyad,
       CONCAT(first_name, ' ', last_name) AS tam_ad
FROM employees;`)}
<h2>+ ile CONCAT farkı</h2>
${TS(`SELECT first_name + ' ' + NULL AS arti_ile,
       CONCAT(first_name, ' ', NULL) AS concat_ile,
       CONCAT_WS(' - ', first_name, last_name, title) AS ws_ile
FROM employees
WHERE emp_id = 1;`)}
<p><code>+</code> bir NULL ile karşılaşınca sonucu NULL yapar; CONCAT NULL'ı boş metin sayar. Ayrıca <code>+</code> bir sayı ile bir metni birleştirmeye çalışırsa SQL Server metni sayıya çevirmeye çalışır ve hata verir: <code>'Adet: ' + 5</code> hata, <code>CONCAT('Adet: ', 5)</code> çalışır.</p>
<h2>E-posta maskeleme: STUFF + REPLICATE + CHARINDEX</h2>
${TS(`SELECT TOP 5 email,
       STUFF(email, 2, CHARINDEX('@', email) - 2,
             REPLICATE('*', CHARINDEX('@', email) - 2)) AS maskeli
FROM customers
WHERE email IS NOT NULL;`)}
<h2>STRING_AGG ile listeleri birleştirmek</h2>
${TS(`SELECT d.name AS departman,
       STRING_AGG(e.first_name, ', ') WITHIN GROUP (ORDER BY e.first_name) AS calisanlar
FROM departments d
JOIN employees e ON e.dept_id = d.dept_id
GROUP BY d.name;`, { pg: "SELECT d.name AS departman,\n       STRING_AGG(e.first_name, ', ' ORDER BY e.first_name) AS calisanlar\nFROM departments d\nJOIN employees e ON e.dept_id = d.dept_id\nGROUP BY d.name;", mysql: "SELECT d.name AS departman,\n       GROUP_CONCAT(e.first_name ORDER BY e.first_name SEPARATOR ', ') AS calisanlar\nFROM departments d\nJOIN employees e ON e.dept_id = d.dept_id\nGROUP BY d.name;", oracle: "SELECT d.name AS departman,\n       LISTAGG(e.first_name, ', ') WITHIN GROUP (ORDER BY e.first_name) AS calisanlar\nFROM departments d\nJOIN employees e ON e.dept_id = d.dept_id\nGROUP BY d.name;" }, { diff: ['tsql', 'pg', 'mysql', 'oracle', 'sqlite'] })}
<div class="note"><b>Sıralama ve harmanlama</b>SQL Server'da metin karşılaştırma ve sıralama, sütunun <i>collation</i> ayarına bağlıdır. Türkçe veriler için <code>Turkish_CI_AS</code> kullanılırsa “i/İ” ve “ı/I” doğru eşleşir. Varsayılan <code>SQL_Latin1_General_CP1_CI_AS</code> büyük/küçük harf duyarsızdır (<code>WHERE city = 'izmir'</code>, 'İzmir' ile eşleşmeyebilir).</div>
`,
  ex: [
    ex({ q: '<p>Çalışanlar için ad ve soyadın <b>baş harflerini</b> <code>A.Y.</code> biçiminde <code>bas_harf</code> olarak getir (sütunlar: <code>first_name</code>, <code>last_name</code>, <code>bas_harf</code>). LEFT ve + kullan.</p>', sol: "SELECT first_name, last_name, LEFT(first_name, 1) + '.' + LEFT(last_name, 1) + '.' AS bas_harf FROM employees;" }),
    ex({ q: '<p>Müşteri e-postalarından <b>alan adını</b> (<code>@</code> işaretinden sonrası) çıkar ve her alan adındaki müşteri sayısını getir: <code>alan</code>, <code>musteri</code>. CHARINDEX ve SUBSTRING kullan.</p>', sol: "SELECT SUBSTRING(email, CHARINDEX('@', email) + 1, LEN(email)) AS alan, COUNT(*) AS musteri FROM customers WHERE email IS NOT NULL GROUP BY SUBSTRING(email, CHARINDEX('@', email) + 1, LEN(email));", hint: 'SQL Server GROUP BY içinde takma adı kabul etmez; ifadeyi GROUP BY\'da tekrar yaz.' }),
    ex({ q: '<p>Her kategori için ürün adlarını <code>, </code> ile birleştirilmiş tek bir metin olarak getir (ad sırasına göre): <code>category</code>, <code>urunler</code>.</p>', sol: "SELECT category, STRING_AGG(name, ', ') WITHIN GROUP (ORDER BY name) AS urunler FROM products GROUP BY category;", diff: ['tsql'] })
  ]
});

tsql.push({
  id: 'ts-tarih', lv: 'B1', mod: MOD, min: 18,
  title: 'T-SQL tarih ve saat fonksiyonları',
  sum: 'GETDATE, DATEADD, DATEDIFF, DATEPART, DATENAME, EOMONTH, DATEFROMPARTS, FORMAT, CONVERT.',
  body: `
<h2>Tarih tipleri</h2>
<table><tr><th>Tip</th><th>Örnek</th><th>Not</th></tr>
<tr><td><code>DATE</code></td><td>2024-05-17</td><td>Sadece tarih (3 bayt)</td></tr>
<tr><td><code>DATETIME2(n)</code></td><td>2024-05-17 14:30:00.0000000</td><td>Önerilen tarih-saat tipi</td></tr>
<tr><td><code>DATETIME</code></td><td>2024-05-17 14:30:00.000</td><td>Eski tip, 3 ms hassasiyet</td></tr>
<tr><td><code>DATETIMEOFFSET</code></td><td>... +03:00</td><td>Saat dilimiyle</td></tr>
</table>
<h2>Temel fonksiyonlar</h2>
${TS(`SELECT CAST(GETDATE() AS DATE)          AS bugun,
       DATEADD(day, 30, '2024-05-17')    AS otuz_gun_sonra,
       DATEADD(month, -1, '2024-03-31')  AS bir_ay_once,
       EOMONTH('2024-02-10')             AS ay_sonu,
       DATEFROMPARTS(2024, 12, 1)        AS aralik_basi,
       DATEPART(quarter, '2024-05-17')   AS ceyrek,
       DATENAME(month, '2024-05-17')     AS ay_adi;`)}
<p><code>DATEADD(month, -1, '2024-03-31')</code> sonucu <b>2024-02-29</b>'dur: SQL Server ay sonunu korur.</p>
<h2>Aylık rapor: FORMAT ve YEAR</h2>
${TS(`SELECT FORMAT(order_date, 'yyyy-MM') AS ay,
       COUNT(*) AS siparis
FROM orders
WHERE YEAR(order_date) = 2024
GROUP BY FORMAT(order_date, 'yyyy-MM')
ORDER BY ay;`)}
<div class="warn"><b>Performans notu</b><code>WHERE YEAR(order_date) = 2024</code> okunaklıdır ama indeks kullanılamaz. Büyük tablolarda <code>WHERE order_date &gt;= '2024-01-01' AND order_date &lt; '2025-01-01'</code> yaz. FORMAT da yavaş bir fonksiyondur; milyonlarca satırda <code>DATEFROMPARTS(YEAR(d), MONTH(d), 1)</code> veya 2022'deki <code>DATETRUNC(month, d)</code> tercih edilir.</div>
<h2>Türkçe gün ve ay adları</h2>
${TS(`SELECT FORMAT(order_date, 'dddd', 'tr-TR') AS gun,
       COUNT(*) AS siparis
FROM orders
GROUP BY FORMAT(order_date, 'dddd', 'tr-TR'), DATEPART(weekday, order_date)
ORDER BY DATEPART(weekday, order_date);`)}
<p>FORMAT'ın üçüncü parametresi kültürdür: <code>'tr-TR'</code> Türkçe ad verir. <code>DATENAME</code> ise sunucunun dil ayarını (varsayılan İngilizce) kullanır.</p>
<h2>DATEDIFF sınır sayar</h2>
${TS(`SELECT DATEDIFF(year,  '2024-12-31', '2025-01-01') AS yil_farki,
       DATEDIFF(month, '2024-01-31', '2024-02-01') AS ay_farki,
       DATEDIFF(day,   '2024-01-01', '2024-12-31') AS gun_farki;`)}
<p>İlk iki sonuç 1'dir: DATEDIFF geçen tam süreyi değil, aşılan yıl/ay sınırını sayar. Yaş veya kıdem hesaplarken gün farkını 365.25'e bölmek ya da doğum gününün geçip geçmediğini kontrol etmek gerekir.</p>
<h2>CONVERT ile biçimli tarih metni</h2>
${TS(`SELECT TOP 3 order_date,
       CONVERT(VARCHAR(10), order_date, 104) AS tr_bicim,
       CONVERT(VARCHAR(10), order_date, 103) AS ingiliz_bicim,
       CONVERT(VARCHAR(8),  order_date, 112) AS iso_kompakt
FROM orders
ORDER BY order_id;`)}
<table><tr><th>Stil</th><th>Biçim</th></tr><tr><td>104</td><td>dd.mm.yyyy (Türkiye)</td></tr><tr><td>103</td><td>dd/mm/yyyy</td></tr><tr><td>23</td><td>yyyy-mm-dd</td></tr><tr><td>112</td><td>yyyymmdd</td></tr><tr><td>120</td><td>yyyy-mm-dd hh:mi:ss</td></tr></table>
`,
  ex: [
    ex({ q: '<p><b>Ayın son gününde</b> verilen siparişlerin sayısını EOMONTH ile bul (tek değer).</p>', sol: 'SELECT COUNT(*) FROM orders WHERE order_date = EOMONTH(order_date);' }),
    ex({ q: '<p>2024 yılının her ayı için sipariş sayısını <code>yyyy-MM</code> biçimli ay ile getir: <code>ay</code>, <code>siparis</code>. Aya göre sırala; filtreyi indeks dostu (tarih aralığı) yaz.</p>', sol: "SELECT FORMAT(order_date, 'yyyy-MM') AS ay, COUNT(*) AS siparis FROM orders WHERE order_date >= '2024-01-01' AND order_date < '2025-01-01' GROUP BY FORMAT(order_date, 'yyyy-MM') ORDER BY ay;", ord: true }),
    ex({ q: '<p>Her müşterinin kayıt tarihinden <b>ilk siparişine</b> kadar geçen gün sayısının ortalamasını hesapla (1 basamak). SQL Server\'da AVG tam sayılarda tam sayı döner; ondalık sonuç için <code>* 1.0</code> kullan.</p>', sol: 'SELECT ROUND(AVG(gun * 1.0), 1) FROM (SELECT c.customer_id, DATEDIFF(day, c.signup_date, MIN(o.order_date)) AS gun FROM customers c JOIN orders o ON o.customer_id = c.customer_id GROUP BY c.customer_id, c.signup_date) t;', hint: 'İç sorguda DATEDIFF(day, signup_date, MIN(order_date)), dışta ROUND(AVG(gun * 1.0), 1).' })
  ]
});

tsql.push({
  id: 'ts-donusum', lv: 'B1', mod: MOD, min: 14,
  title: 'Dönüşümler ve koşullu fonksiyonlar: CAST, CONVERT, TRY_CAST, IIF, CHOOSE',
  sum: 'Tip dönüşümü, hatasız dönüşüm, ISNULL ile COALESCE farkı.',
  body: `
<h2>CAST, CONVERT ve TRY_ ailesi</h2>
${TS(`SELECT CAST('123' AS INT) + 1             AS sayi,
       TRY_CAST('abc' AS INT)               AS gecersiz_sayi,
       TRY_CONVERT(DATE, '2024-02-30')      AS gecersiz_tarih,
       CONVERT(DATE, '2024-02-28')          AS tarih,
       CAST(19.99 AS DECIMAL(10, 1))        AS yuvarlanmis;`)}
<p><code>CAST</code> başarısız olursa sorgu hata verir; <code>TRY_CAST</code> / <code>TRY_CONVERT</code> ise NULL döner. Kirli veriyi temizlerken hayat kurtarır.</p>
${TS(`SELECT CAST('abc' AS INT) AS sonuc;`, null, { err: true })}
<h2>IIF ve CHOOSE</h2>
${TS(`SELECT TOP 8 name, stock,
       IIF(stock = 0, N'Tükendi', IIF(stock < 20, N'Az', N'Var')) AS durum
FROM products
ORDER BY stock;`)}
${TS(`SELECT CHOOSE(DATEPART(quarter, order_date), 'Q1', 'Q2', 'Q3', 'Q4') AS ceyrek,
       COUNT(*) AS siparis
FROM orders
WHERE YEAR(order_date) = 2024
GROUP BY DATEPART(quarter, order_date)
ORDER BY DATEPART(quarter, order_date);`)}
<h2>ISNULL ile COALESCE farkı</h2>
<table><tr><th></th><th><code>ISNULL(a, b)</code></th><th><code>COALESCE(a, b, c, ...)</code></th></tr>
<tr><td>Argüman sayısı</td><td>2</td><td>Sınırsız</td></tr>
<tr><td>Sonuç tipi</td><td>İlk argümanın tipi (uzun değer kırpılabilir)</td><td>En yüksek öncelikli tip</td></tr>
<tr><td>Standart</td><td>SQL Server'a özgü</td><td>ANSI standardı</td></tr>
</table>
<p>Örneğin <code>ISNULL(CAST(NULL AS VARCHAR(3)), 'Bilinmiyor')</code> sonucu <b>'Bil'</b> olur; COALESCE ise 'Bilinmiyor' döner.</p>
<div class="note"><b>Örtük dönüşüm ve tip önceliği</b>SQL Server farklı tipleri karşılaştırırken düşük öncelikli tipi yüksek olana çevirir (ör. VARCHAR → INT). <code>WHERE musteri_no = 123</code> sorgusunda musteri_no VARCHAR ise <b>her satır</b> sayıya çevrilir: hem indeks kullanılamaz hem de sayıya çevrilemeyen bir değer sorguyu patlatır.</div>
`,
  ex: [
    ex({ q: '<p>Ürünleri stok durumuna göre etiketle: stok 0 ise <code>Tükendi</code>, 20\'den az ise <code>Az</code>, değilse <code>Var</code>. Sütunlar: <code>name</code>, <code>durum</code>. IIF kullan.</p>', sol: "SELECT name, IIF(stock = 0, N'Tükendi', IIF(stock < 20, N'Az', N'Var')) AS durum FROM products;" }),
    ex({ q: '<p>Aşağıdaki değerlerden hangilerinin tam sayıya dönüştürülebildiğini göster: <code>\'12\'</code>, <code>\'x\'</code>, <code>\'7.5\'</code>, <code>\'30\'</code>. Sütunlar: <code>v</code>, <code>sayi</code> (dönüşmeyen NULL). <code>(VALUES ...) AS t(v)</code> ve TRY_CAST kullan.</p>', sol: "SELECT v, TRY_CAST(v AS INT) AS sayi FROM (VALUES ('12'), ('x'), ('7.5'), ('30')) AS t(v);", hint: "SELECT v, TRY_CAST(v AS INT) AS sayi FROM (VALUES ('12'), ('x'), ...) AS t(v);" }),
    { t: 'mc', q: '<p><code>SELECT ISNULL(CAST(NULL AS VARCHAR(2)), \'Yok\')</code> ne döndürür?</p>', o: ['<code>Yok</code>', '<code>Yo</code>', '<code>NULL</code>', 'Hata'], a: 1, why: 'ISNULL sonucu ilk argümanın tipini (VARCHAR(2)) alır; değer 2 karaktere kırpılır.' }
  ]
});

tsql.push({
  id: 'ts-degisken', lv: 'B1', mod: MOD, min: 18,
  title: 'Değişkenler ve akış kontrolü: DECLARE, IF, WHILE',
  sum: 'T-SQL\'i bir programlama diline dönüştüren yapılar.',
  body: `
<h2>Değişken tanımlamak ve değer atamak</h2>
<p>Değişkenler <code>@</code> ile başlar ve <code>DECLARE</code> ile tipiyle birlikte tanımlanır. Değer, <code>SET</code> veya <code>SELECT @x = ...</code> ile atanır. <code>PRINT</code> Mesajlar sekmesine yazar.</p>
${TS(`DECLARE @ortalama DECIMAL(12, 2);
SELECT @ortalama = AVG(price) FROM products;

PRINT 'Ortalama fiyat: ' + CAST(@ortalama AS VARCHAR(20));

SELECT name, price
FROM products
WHERE price > @ortalama
ORDER BY price DESC;`)}
<table><tr><th></th><th><code>SET @x = ...</code></th><th><code>SELECT @x = ...</code></th></tr>
<tr><td>Birden çok değişken</td><td>Tek değişken</td><td>Aynı anda birden çok</td></tr>
<tr><td>Alt sorgu birden çok satır döndürürse</td><td>Hata</td><td>Son satırın değeri (sessizce!)</td></tr>
<tr><td>Hiç satır yoksa</td><td>NULL atanır</td><td>Değişken eski değerini korur</td></tr>
</table>
<h2>IF / ELSE ve BEGIN / END</h2>
${TS(`DECLARE @stoksuz INT = (SELECT COUNT(*) FROM products WHERE stock = 0);

IF @stoksuz > 0
BEGIN
    PRINT CAST(@stoksuz AS VARCHAR(10)) + ' ürünün stoğu bitmiş.';
    SELECT name FROM products WHERE stock = 0;
END
ELSE
    PRINT 'Tüm ürünler stokta.';`)}
<p>IF yalnızca kendisinden sonraki <b>tek</b> ifadeyi kontrol eder; birden çok ifade için <code>BEGIN ... END</code> bloğu gerekir.</p>
<h2>WHILE döngüsü ve tablo değişkeni</h2>
${TS(`DECLARE @yil INT = 2022;
DECLARE @ozet TABLE (yil INT, siparis INT);

WHILE @yil <= 2024
BEGIN
    INSERT INTO @ozet (yil, siparis)
    SELECT @yil, COUNT(*) FROM orders WHERE YEAR(order_date) = @yil;

    SET @yil += 1;
END;

SELECT * FROM @ozet;`)}
<div class="warn"><b>Döngü yerine küme</b>SQL küme tabanlı bir dildir. Yukarıdaki döngü tek bir <code>GROUP BY YEAR(order_date)</code> ile yazılabilirdi ve milyonlarca satırda yüzlerce kat hızlı olurdu. WHILE'ı yönetim işleri ve parça parça işleme (batch) gibi durumlar için sakla.</div>
`,
  ex: [
    ex({ q: '<p><code>@esik</code> adında DECIMAL(12,2) bir değişken tanımla, değerini <b>1000</b> yap ve fiyatı bu eşiğin üzerindeki ürün sayısını getir (tek değer).</p>', sol: 'DECLARE @esik DECIMAL(12, 2) = 1000;\nSELECT COUNT(*) FROM products WHERE price > @esik;' }),
    ex({ q: '<p>Ankara\'da <b>15\'ten fazla</b> müşteri varsa <code>Büyük pazar</code>, değilse <code>Küçük pazar</code> yazan tek satırlık bir sonuç döndür (sütun adı <code>sonuc</code>). IF / ELSE kullan.</p>', sol: "IF (SELECT COUNT(*) FROM customers WHERE city = N'Ankara') > 15\n    SELECT N'Büyük pazar' AS sonuc;\nELSE\n    SELECT N'Küçük pazar' AS sonuc;" }),
    ex({ q: '<p>WHILE döngüsü ile 1\'den 10\'a kadar sayıları ve karelerini bir tablo değişkenine (<code>@t (n INT, kare INT)</code>) ekle, sonra tablonun tamamını getir.</p>', sol: 'DECLARE @t TABLE (n INT, kare INT);\nDECLARE @i INT = 1;\nWHILE @i <= 10\nBEGIN\n    INSERT INTO @t VALUES (@i, @i * @i);\n    SET @i += 1;\nEND;\nSELECT * FROM @t;' })
  ]
});

tsql.push({
  id: 'ts-gecici', lv: 'B2', mod: MOD, min: 14,
  title: 'Geçici tablolar, tablo değişkenleri ve SELECT INTO',
  sum: '#temp, ##global, @tablo ve ara sonuçları saklamak.',
  body: `
<h2>Ara sonucu saklamak</h2>
<p>Karmaşık raporlarda bir ara sonucu birden çok kez kullanmak gerekir. CTE yalnızca tek bir ifadede geçerlidir; birden çok sorguda kullanmak için <b>geçici tablo</b> gerekir.</p>
<table><tr><th>Tür</th><th>Yazım</th><th>Kapsam</th><th>Not</th></tr>
<tr><td>Yerel geçici tablo</td><td><code>#ad</code></td><td>Oturum</td><td>tempdb'de tutulur, indeks eklenebilir, istatistik tutar</td></tr>
<tr><td>Global geçici tablo</td><td><code>##ad</code></td><td>Tüm oturumlar</td><td>Nadiren gerekir</td></tr>
<tr><td>Tablo değişkeni</td><td><code>DECLARE @ad TABLE (...)</code></td><td>Toplu iş (batch)</td><td>Küçük veriler için; istatistik tutmaz</td></tr>
<tr><td>CTE</td><td><code>WITH ad AS (...)</code></td><td>Tek ifade</td><td>Saklanmaz, okunabilirlik içindir</td></tr>
</table>
<h2>SELECT ... INTO #tablo</h2>
${TS(`DROP TABLE IF EXISTS #musteri_ciro;

SELECT o.customer_id,
       SUM(oi.quantity * oi.unit_price * (1 - oi.discount)) AS ciro
INTO #musteri_ciro
FROM orders o
JOIN order_items oi ON oi.order_id = o.order_id
WHERE o.status = 'delivered'
GROUP BY o.customer_id;

SELECT TOP 5 c.first_name, c.last_name, ROUND(m.ciro, 2) AS ciro
FROM #musteri_ciro m
JOIN customers c ON c.customer_id = m.customer_id
ORDER BY m.ciro DESC;`)}
<p><code>SELECT ... INTO yeni_tablo</code>, tabloyu sorgunun sütunlarıyla otomatik oluşturur ve doldurur. Kalıcı tablolar için de çalışır.</p>
<h2>Önce tanımla, sonra doldur</h2>
${TS(`CREATE TABLE #sehir_ozet (
    sehir NVARCHAR(50),
    musteri INT,
    PRIMARY KEY (sehir)
);

INSERT INTO #sehir_ozet (sehir, musteri)
SELECT city, COUNT(*)
FROM customers
WHERE city IS NOT NULL
GROUP BY city;

SELECT * FROM #sehir_ozet WHERE musteri >= 10 ORDER BY musteri DESC;`)}
<div class="tip"><b>Ne zaman hangisi?</b>Birkaç yüz satır ve tek kullanım: tablo değişkeni veya CTE. Binlerce satır, birden çok sorguda kullanım veya indeks ihtiyacı: <code>#temp</code>.</div>
`,
  ex: [
    ex({ q: '<p>Fiyatı <b>2000\'den yüksek</b> ürünleri <code>#pahali</code> adlı geçici tabloya SELECT INTO ile kopyala, ardından bu tablodaki satır sayısını getir.</p>', sol: 'SELECT * INTO #pahali FROM products WHERE price > 2000;\nSELECT COUNT(*) FROM #pahali;' }),
    ex({ q: '<p><code>@kategori_ozet</code> adlı bir tablo değişkeni tanımla (<code>kategori NVARCHAR(50), urun INT, ort_fiyat DECIMAL(12,2)</code>), her kategori için ürün sayısını ve ortalama fiyatı ekle, sonra ortalama fiyata göre azalan sırayla getir.</p>', sol: 'DECLARE @kategori_ozet TABLE (kategori NVARCHAR(50), urun INT, ort_fiyat DECIMAL(12, 2));\nINSERT INTO @kategori_ozet SELECT category, COUNT(*), AVG(price) FROM products GROUP BY category;\nSELECT * FROM @kategori_ozet ORDER BY ort_fiyat DESC;', ord: true })
  ]
});

tsql.push({
  id: 'ts-pivot', lv: 'B2', mod: MOD, min: 14,
  title: 'PIVOT ve UNPIVOT',
  sum: 'SQL Server\'ın satırları sütuna çeviren operatörleri.',
  body: `
<h2>PIVOT operatörü</h2>
<p>Koşullu toplama ile pivot yapmayı “İleri Sorgu Yapıları” bölümünde gördük. SQL Server ve Oracle bunun için ayrı bir <code>PIVOT</code> operatörü sunar. Yapı: <b>kaynak sorgu</b> → <b>toplanacak değer</b> → <b>sütuna dönüşecek değerler</b>.</p>
${TS(`SELECT *
FROM (
    SELECT channel, YEAR(order_date) AS yil, order_id
    FROM orders
) AS kaynak
PIVOT (
    COUNT(order_id) FOR yil IN ([2022], [2023], [2024])
) AS p
ORDER BY channel;`, {
  oracle: "SELECT *\nFROM (\n    SELECT channel, EXTRACT(YEAR FROM order_date) AS yil, order_id\n    FROM orders\n)\nPIVOT (\n    COUNT(order_id) FOR yil IN (2022 AS y2022, 2023 AS y2023, 2024 AS y2024)\n)\nORDER BY channel;",
  pg: "-- PostgreSQL'de PIVOT yok: koşullu toplama (veya tablefunc eklentisindeki crosstab)\nSELECT channel,\n       COUNT(*) FILTER (WHERE EXTRACT(YEAR FROM order_date) = 2022) AS \"2022\",\n       COUNT(*) FILTER (WHERE EXTRACT(YEAR FROM order_date) = 2023) AS \"2023\",\n       COUNT(*) FILTER (WHERE EXTRACT(YEAR FROM order_date) = 2024) AS \"2024\"\nFROM orders\nGROUP BY channel\nORDER BY channel;",
  mysql: "SELECT channel,\n       SUM(YEAR(order_date) = 2022) AS `2022`,\n       SUM(YEAR(order_date) = 2023) AS `2023`,\n       SUM(YEAR(order_date) = 2024) AS `2024`\nFROM orders\nGROUP BY channel\nORDER BY channel;",
  sqlite: "SELECT channel,\n       SUM(CASE WHEN strftime('%Y', order_date) = '2022' THEN 1 ELSE 0 END) AS \"2022\",\n       SUM(CASE WHEN strftime('%Y', order_date) = '2023' THEN 1 ELSE 0 END) AS \"2023\",\n       SUM(CASE WHEN strftime('%Y', order_date) = '2024' THEN 1 ELSE 0 END) AS \"2024\"\nFROM orders\nGROUP BY channel\nORDER BY channel;"
})}
<div class="warn"><b>PIVOT tuzağı</b>Kaynak sorgudaki, PIVOT'ta kullanılmayan <b>her sütun</b> gruplama sütunu olur. Kaynağa fazladan bir sütun (ör. customer_id) eklersen sonuç satır sayısı patlar. Kaynak sorguda yalnızca gerekli sütunları seç.</div>
<p>Sütun değerleri sabit yazılır. Değer listesi değişkense (ör. her yıl yeni sütun) dinamik SQL ile sorgu metni üretilir; bunu ilerideki derste göreceğiz.</p>
<h2>UNPIVOT: sütunları satıra çevirmek</h2>
${TS(`WITH genis AS (
    SELECT channel,
           SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) AS teslim,
           SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS iptal
    FROM orders
    GROUP BY channel
)
SELECT channel, durum, adet
FROM genis
UNPIVOT (adet FOR durum IN (teslim, iptal)) AS u
ORDER BY channel, durum;`)}
`,
  ex: [
    ex({ q: '<p>PIVOT ile her <b>segment</b> için kanallara göre sipariş sayılarını sütunlara çevir: <code>segment</code>, <code>mobile</code>, <code>store</code>, <code>web</code>.</p>', sol: 'SELECT segment, [mobile], [store], [web]\nFROM (\n    SELECT c.segment, o.channel, o.order_id\n    FROM orders o JOIN customers c ON c.customer_id = o.customer_id\n) AS k\nPIVOT (COUNT(order_id) FOR channel IN ([mobile], [store], [web])) AS p;', hint: 'Kaynak: segment, channel, order_id. PIVOT (COUNT(order_id) FOR channel IN ([mobile], [store], [web]))' })
  ]
});

tsql.push({
  id: 'ts-apply', lv: 'B2', mod: MOD, min: 16,
  title: 'CROSS APPLY ve OUTER APPLY',
  sum: 'Her satır için çalışan alt sorgu: grup başına ilk N ve satır bazlı hesaplar.',
  body: `
<h2>APPLY nedir?</h2>
<p><code>APPLY</code>, sol taraftaki <b>her satır için</b> sağdaki tablo ifadesini (alt sorgu veya tablo değerli fonksiyon) çalıştırır ve sonuçları birleştirir. Sağ taraf, sol taraftaki sütunlara başvurabilir; normal JOIN'de bu mümkün değildir.</p>
<ul><li><b>CROSS APPLY</b>: Sağ taraf satır döndürmezse sol satır elenir (INNER JOIN gibi).</li><li><b>OUTER APPLY</b>: Sağ taraf boşsa sol satır NULL'larla korunur (LEFT JOIN gibi).</li></ul>
<h2>Her müşterinin son 2 siparişi</h2>
${TS(`SELECT c.customer_id, c.first_name, s.order_id, s.order_date
FROM customers c
CROSS APPLY (
    SELECT TOP 2 o.order_id, o.order_date
    FROM orders o
    WHERE o.customer_id = c.customer_id
    ORDER BY o.order_date DESC
) AS s
WHERE c.city = N'Bursa'
ORDER BY c.customer_id, s.order_date DESC;`, {
  pg: "-- PostgreSQL: LATERAL JOIN\nSELECT c.customer_id, c.first_name, s.order_id, s.order_date\nFROM customers c\nCROSS JOIN LATERAL (\n    SELECT o.order_id, o.order_date\n    FROM orders o\n    WHERE o.customer_id = c.customer_id\n    ORDER BY o.order_date DESC\n    LIMIT 2\n) AS s\nWHERE c.city = 'Bursa'\nORDER BY c.customer_id, s.order_date DESC;",
  sqlite: "-- APPLY/LATERAL olmayan SQL türlerinde: ROW_NUMBER ile\nSELECT c.customer_id, c.first_name, s.order_id, s.order_date\nFROM customers c\nJOIN (\n    SELECT o.customer_id, o.order_id, o.order_date,\n           ROW_NUMBER() OVER (PARTITION BY o.customer_id ORDER BY o.order_date DESC) AS rn\n    FROM orders o\n) AS s ON s.customer_id = c.customer_id AND s.rn <= 2\nWHERE c.city = 'Bursa'\nORDER BY c.customer_id, s.order_date DESC;",
  oracle: "-- Oracle 12c+: CROSS APPLY desteklenir\nSELECT c.customer_id, c.first_name, s.order_id, s.order_date\nFROM customers c\nCROSS APPLY (\n    SELECT o.order_id, o.order_date\n    FROM orders o\n    WHERE o.customer_id = c.customer_id\n    ORDER BY o.order_date DESC\n    FETCH FIRST 2 ROWS ONLY\n) s\nWHERE c.city = 'Bursa'\nORDER BY c.customer_id, s.order_date DESC;"
}, { nr: ['pg', 'oracle'] })}
<h2>OUTER APPLY ile satır bazlı özet</h2>
${TS(`SELECT d.name, x.calisan_sayisi, x.ort_maas
FROM departments d
OUTER APPLY (
    SELECT COUNT(*) AS calisan_sayisi, AVG(e.salary) AS ort_maas
    FROM employees e
    WHERE e.dept_id = d.dept_id
) AS x
ORDER BY d.dept_id;`)}
<p>Çalışanı olmayan Hukuk departmanı da 0 çalışanla listelenir.</p>
<div class="note"><b>Diğer kullanımlar</b>APPLY ayrıca tablo değerli fonksiyonları satır satır çağırmak (<code>CROSS APPLY dbo.fn(c.id)</code>), metni parçalamak (<code>CROSS APPLY STRING_SPLIT(etiketler, ',')</code>) ve JSON açmak (<code>CROSS APPLY OPENJSON(...)</code>) için kullanılır. Bu taklitte APPLY alt sorgu ve satır içi tablo fonksiyonlarıyla çalışır.</div>
`,
  ex: [
    ex({ q: '<p>Her departmanın <b>en yüksek maaşlı 2 çalışanını</b> CROSS APPLY ile getir: <code>departman</code> (departman adı), <code>first_name</code>, <code>salary</code>.</p>', sol: 'SELECT d.name AS departman, x.first_name, x.salary\nFROM departments d\nCROSS APPLY (\n    SELECT TOP 2 e.first_name, e.salary\n    FROM employees e\n    WHERE e.dept_id = d.dept_id\n    ORDER BY e.salary DESC\n) AS x;', hint: 'CROSS APPLY (SELECT TOP 2 ... FROM employees e WHERE e.dept_id = d.dept_id ORDER BY e.salary DESC) AS x' }),
    ex({ q: '<p>Her kategori için <b>son siparişin tarihini</b> OUTER APPLY ile getir: <code>category</code>, <code>son_siparis</code>. Kategori listesini <code>SELECT DISTINCT category FROM products</code> ile al.</p>', sol: 'SELECT k.category, x.son_siparis\nFROM (SELECT DISTINCT category FROM products) AS k\nOUTER APPLY (\n    SELECT MAX(o.order_date) AS son_siparis\n    FROM orders o\n    JOIN order_items oi ON oi.order_id = o.order_id\n    JOIN products p ON p.product_id = oi.product_id\n    WHERE p.category = k.category\n) AS x;' })
  ]
});

tsql.push({
  id: 'ts-sistem', lv: 'B2', mod: MOD, min: 12,
  title: 'Sistem görünümleri, IDENTITY ve yardımcı prosedürler',
  sum: 'INFORMATION_SCHEMA, sys.tables, sp_help, IDENTITY, SCOPE_IDENTITY ve @@ROWCOUNT.',
  body: `
<h2>Veritabanını sorgulayarak keşfetmek</h2>
<p>SQL Server meta veriyi (tablolar, sütunlar, indeksler) sorgulanabilir görünümlerde tutar. Standart <code>INFORMATION_SCHEMA</code> görünümleri diğer SQL türlerinde da vardır; <code>sys.*</code> görünümleri SQL Server'a özgüdür ve daha ayrıntılıdır.</p>
${TS(`SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'orders'
ORDER BY ORDINAL_POSITION;`, { pg: "SELECT table_name, column_name, data_type, is_nullable\nFROM information_schema.columns\nWHERE table_name = 'orders'\nORDER BY ordinal_position;", mysql: "SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, IS_NULLABLE\nFROM INFORMATION_SCHEMA.COLUMNS\nWHERE TABLE_NAME = 'orders'\nORDER BY ORDINAL_POSITION;", oracle: "SELECT table_name, column_name, data_type, nullable\nFROM user_tab_columns\nWHERE table_name = 'ORDERS'\nORDER BY column_id;", sqlite: "SELECT name, type, \"notnull\" FROM pragma_table_info('orders');" }, { diff: ['pg', 'mysql', 'oracle', 'sqlite'] })}
${TS(`SELECT name, object_id, type_desc FROM sys.tables ORDER BY name;
EXEC sp_help 'products';`)}
<h2>IDENTITY ile otomatik numara</h2>
${TS(`CREATE TABLE notes (
    note_id INT IDENTITY(1, 1) PRIMARY KEY,
    body    NVARCHAR(200) NOT NULL
);
INSERT INTO notes (body) VALUES (N'İlk not');
INSERT INTO notes (body) VALUES (N'İkinci not');
SELECT SCOPE_IDENTITY() AS son_eklenen_id;
SELECT * FROM notes;`)}
<table><tr><th>Fonksiyon</th><th>Ne döner?</th></tr>
<tr><td><code>SCOPE_IDENTITY()</code></td><td>Aynı kapsamda son eklenen IDENTITY (önerilen)</td></tr>
<tr><td><code>@@IDENTITY</code></td><td>Oturumdaki son IDENTITY (trigger'ların ürettiği dahil; dikkat!)</td></tr>
<tr><td><code>@@ROWCOUNT</code></td><td>Son ifadenin etkilediği satır sayısı</td></tr>
<tr><td><code>OBJECT_ID('ad')</code></td><td>Nesne yoksa NULL: <code>IF OBJECT_ID('dbo.t') IS NOT NULL ...</code></td></tr>
</table>
${TS(`UPDATE products SET stock = stock + 10 WHERE category = N'Kitap';
SELECT @@ROWCOUNT AS guncellenen;`)}
`,
  ex: [
    ex({ q: '<p><code>INFORMATION_SCHEMA.COLUMNS</code> ile <code>customers</code> tablosunun sütun adlarını tablodaki sırasıyla getir.</p>', sol: "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'customers' ORDER BY ORDINAL_POSITION;", ord: true }),
    ex({ q: '<p>Fiyatı 100\'ün altındaki ürünlerin fiyatını 5 artır ve <code>@@ROWCOUNT</code> ile kaç satırın güncellendiğini <code>guncellenen</code> adıyla getir.</p>', sol: 'UPDATE products SET price = price + 5 WHERE price < 100;\nSELECT @@ROWCOUNT AS guncellenen;' })
  ]
});

tsql.push({
  id: 'ts-merge', lv: 'C1', mod: MOD, min: 16,
  title: 'MERGE: eşitle, güncelle, ekle, sil',
  sum: 'Kaynak ile hedefi tek ifadede eşitlemek.',
  body: `
<h2>Tek ifadede üç işlem</h2>
<p><code>MERGE</code>, bir kaynak tablo ile hedef tabloyu bir anahtara göre karşılaştırır: eşleşenleri günceller, hedefte olmayanları ekler, istenirse kaynakta olmayanları siler. Veri ambarı yüklemelerinin temel aracıdır.</p>
<pre class="code" data-norun>MERGE INTO hedef AS t
USING kaynak AS s
   ON t.anahtar = s.anahtar
WHEN MATCHED [AND ek_koşul] THEN UPDATE SET ...
WHEN NOT MATCHED [BY TARGET] THEN INSERT (...) VALUES (...)
WHEN NOT MATCHED BY SOURCE THEN DELETE;   -- MERGE ; ile bitmek zorundadır</pre>
<h2>En son fiyatları ürün tablosuna işlemek</h2>
${TS(`WITH son AS (
    SELECT product_id, new_price,
           ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY updated_at DESC) AS rn
    FROM price_updates
)
MERGE INTO products AS t
USING (SELECT product_id, new_price FROM son WHERE rn = 1) AS s
   ON t.product_id = s.product_id
WHEN MATCHED AND t.price <> s.new_price THEN
    UPDATE SET price = s.new_price;

SELECT p.product_id, p.name, p.price
FROM products p
WHERE p.product_id IN (SELECT product_id FROM price_updates)
ORDER BY p.product_id;`)}
<h2>Tam eşitleme: ekle, güncelle, sil</h2>
${TS(`CREATE TABLE #hedef (dept_id INT PRIMARY KEY, name NVARCHAR(50), city NVARCHAR(50));
INSERT INTO #hedef SELECT dept_id, name, city FROM departments WHERE dept_id <= 4;
UPDATE #hedef SET city = N'Eski Şehir' WHERE dept_id = 2;

MERGE INTO #hedef AS t
USING (SELECT dept_id, name, city FROM departments WHERE dept_id >= 2) AS s
   ON t.dept_id = s.dept_id
WHEN MATCHED AND t.city <> s.city THEN UPDATE SET city = s.city
WHEN NOT MATCHED BY TARGET THEN INSERT (dept_id, name, city) VALUES (s.dept_id, s.name, s.city)
WHEN NOT MATCHED BY SOURCE THEN DELETE;

SELECT * FROM #hedef ORDER BY dept_id;`)}
<div class="warn"><b>Dikkat</b>Kaynakta aynı anahtar birden fazla kez geçerse MERGE hata verir (“The MERGE statement attempted to UPDATE or DELETE the same row more than once”). Kaynağı önce tekilleştir (yukarıdaki ROW_NUMBER gibi). <code>OUTPUT $action, inserted.*, deleted.*</code> ile hangi satıra ne yapıldığını raporlayabilirsin.</div>
`,
  ex: [
    ex({ q: '<p>MERGE ile <code>departments</code> tablosunu şu kaynakla eşitle: (2, \'Pazarlama ve İletişim\', \'İstanbul\') ve (11, \'Veri Platformu\', \'Ankara\'). Eşleşeni güncelle, olmayanı ekle.</p>', sol: "MERGE INTO departments AS t\nUSING (SELECT 2 AS dept_id, N'Pazarlama ve İletişim' AS name, N'İstanbul' AS city UNION ALL SELECT 11, N'Veri Platformu', N'Ankara') AS s\n   ON t.dept_id = s.dept_id\nWHEN MATCHED THEN UPDATE SET name = s.name, city = s.city\nWHEN NOT MATCHED THEN INSERT (dept_id, name, city) VALUES (s.dept_id, s.name, s.city);", check: 'SELECT * FROM departments ORDER BY dept_id' })
  ]
});

tsql.push({
  id: 'ts-proc', lv: 'C1', mod: MOD, min: 18,
  title: 'Saklı yordamlar (stored procedure)',
  sum: 'Parametreli, yeniden kullanılabilir ve güvenli iş mantığı.',
  body: `
<h2>Neden saklı yordam?</h2>
<ul>
<li><b>Yeniden kullanım</b>: Aynı mantık uygulamadan, raporlardan ve zamanlanmış işlerden çağrılır.</li>
<li><b>Güvenlik</b>: Kullanıcıya tabloya değil yalnızca yordama yetki verilebilir; parametreler SQL injection'ı önler.</li>
<li><b>Performans</b>: Yürütme planı önbelleğe alınır.</li>
</ul>
${TS(`CREATE OR ALTER PROCEDURE dbo.usp_MusteriSiparisleri
    @musteri_id INT,
    @yil INT = NULL          -- varsayılan değerli (isteğe bağlı) parametre
AS
BEGIN
    SET NOCOUNT ON;
    SELECT order_id, order_date, status, channel
    FROM orders
    WHERE customer_id = @musteri_id
      AND (@yil IS NULL OR YEAR(order_date) = @yil)
    ORDER BY order_date;
END;
GO

EXEC dbo.usp_MusteriSiparisleri @musteri_id = 7, @yil = 2024;`)}
<h2>OUTPUT parametreleri</h2>
${TS(`CREATE OR ALTER PROCEDURE dbo.usp_KategoriOzet
    @kategori NVARCHAR(50),
    @adet INT OUTPUT,
    @ortalama DECIMAL(12, 2) OUTPUT
AS
BEGIN
    SELECT @adet = COUNT(*), @ortalama = AVG(price)
    FROM products
    WHERE category = @kategori;
END;
GO

DECLARE @a INT, @o DECIMAL(12, 2);
EXEC dbo.usp_KategoriOzet @kategori = N'Kitap', @adet = @a OUTPUT, @ortalama = @o OUTPUT;
SELECT @a AS urun_sayisi, @o AS ortalama_fiyat;`)}
<h2>RETURN ile durum kodu</h2>
${TS(`CREATE OR ALTER PROCEDURE dbo.usp_StokDus @urun INT, @adet INT
AS
BEGIN
    IF (SELECT stock FROM products WHERE product_id = @urun) < @adet
        RETURN 1;   -- yetersiz stok
    UPDATE products SET stock = stock - @adet WHERE product_id = @urun;
    RETURN 0;
END;
GO

DECLARE @sonuc INT;
EXEC @sonuc = dbo.usp_StokDus @urun = 39, @adet = 1;
SELECT @sonuc AS durum_kodu;`)}
<div class="note"><b>Adlandırma</b>Yordamlarda <code>usp_</code> (user stored procedure) öneki yaygındır. <code>sp_</code> önekinden kaçın: SQL Server bu öneki önce master veritabanında arar.</div>
`,
  ex: [
    ex({ q: '<p><code>dbo.usp_FiyatAraligi</code> adında, <code>@kategori NVARCHAR(50)</code> ve <code>@min DECIMAL(12,2)</code> parametreleri alan ve o kategoride fiyatı <code>@min</code> ve üzerinde olan ürünlerin adını ve fiyatını fiyata göre azalan döndüren bir yordam yaz. Ardından <code>Elektronik</code> ve <code>1000</code> ile çalıştır.</p>', sol: "CREATE OR ALTER PROCEDURE dbo.usp_FiyatAraligi @kategori NVARCHAR(50), @min DECIMAL(12, 2)\nAS\nBEGIN\n    SELECT name, price FROM products WHERE category = @kategori AND price >= @min ORDER BY price DESC;\nEND;\nGO\nEXEC dbo.usp_FiyatAraligi @kategori = N'Elektronik', @min = 1000;", ord: true, hint: 'CREATE PROCEDURE ... AS BEGIN ... END; satırından sonra GO yaz, sonra EXEC ile çağır.' }),
    ex({ q: '<p><code>dbo.usp_SehirMusteri</code> adında, <code>@sehir NVARCHAR(50)</code> alıp müşteri sayısını <code>@sayi INT OUTPUT</code> ile döndüren bir yordam yaz; İzmir için çalıştırıp sonucu <code>musteri_sayisi</code> adıyla SELECT et.</p>', sol: "CREATE OR ALTER PROCEDURE dbo.usp_SehirMusteri @sehir NVARCHAR(50), @sayi INT OUTPUT\nAS\nBEGIN\n    SELECT @sayi = COUNT(*) FROM customers WHERE city = @sehir;\nEND;\nGO\nDECLARE @s INT;\nEXEC dbo.usp_SehirMusteri @sehir = N'İzmir', @sayi = @s OUTPUT;\nSELECT @s AS musteri_sayisi;" })
  ]
});

tsql.push({
  id: 'ts-func', lv: 'C1', mod: MOD, min: 16,
  title: 'Kullanıcı tanımlı fonksiyonlar (UDF)',
  sum: 'Skaler fonksiyonlar ve satır içi tablo değerli fonksiyonlar.',
  body: `
<h2>Skaler fonksiyon: tek değer döner</h2>
${TS(`CREATE OR ALTER FUNCTION dbo.fn_NetTutar (@adet INT, @fiyat DECIMAL(12, 2), @indirim DECIMAL(4, 2))
RETURNS DECIMAL(12, 2)
AS
BEGIN
    RETURN @adet * @fiyat * (1 - @indirim);
END;
GO

SELECT TOP 5 order_id, product_id,
       dbo.fn_NetTutar(quantity, unit_price, discount) AS net
FROM order_items
ORDER BY net DESC;`)}
<div class="warn"><b>Performans</b>Skaler fonksiyonlar her satır için ayrı çalışır ve eski sürümlerde sorgunun paralel çalışmasını engeller. SQL Server 2019'daki <i>scalar UDF inlining</i> bunu büyük ölçüde iyileştirdi; yine de çok büyük tablolarda ifadeyi doğrudan sorguya yazmak veya tablo değerli fonksiyon kullanmak daha hızlıdır.</div>
<h2>Satır içi tablo değerli fonksiyon (inline TVF)</h2>
<p>Parametre alan bir view gibidir; tek bir SELECT döndürür ve sorgu iyileştiricisi onu çağıran sorguya gömer.</p>
${TS(`CREATE OR ALTER FUNCTION dbo.fn_KategoriUrunleri (@kategori NVARCHAR(50))
RETURNS TABLE
AS
RETURN (
    SELECT product_id, name, price
    FROM products
    WHERE category = @kategori
);
GO

SELECT * FROM dbo.fn_KategoriUrunleri(N'Spor') ORDER BY price DESC;`)}
<p>TVF'ler APPLY ile her satır için çağrılabilir: <code>FROM kategoriler k CROSS APPLY dbo.fn_KategoriUrunleri(k.ad)</code>.</p>
<table><tr><th></th><th>Saklı yordam</th><th>Fonksiyon</th></tr>
<tr><td>SELECT içinde kullanım</td><td>Hayır</td><td>Evet</td></tr>
<tr><td>Veri değiştirme (INSERT/UPDATE)</td><td>Evet</td><td>Hayır</td></tr>
<tr><td>Transaction / TRY-CATCH</td><td>Evet</td><td>Hayır</td></tr>
<tr><td>Çıktı</td><td>Sonuç kümeleri, OUTPUT parametreleri</td><td>Tek değer veya tablo</td></tr>
</table>
`,
  ex: [
    ex({ q: '<p><code>dbo.fn_KdvDahil(@fiyat DECIMAL(12,2))</code> adında, fiyatın <b>%20 KDV dahil</b> halini döndüren (DECIMAL(12,2)) bir skaler fonksiyon yaz. Sonra ürünlerin adını, fiyatını ve <code>kdv_dahil</code> değerini getir.</p>', sol: 'CREATE OR ALTER FUNCTION dbo.fn_KdvDahil (@fiyat DECIMAL(12, 2))\nRETURNS DECIMAL(12, 2)\nAS\nBEGIN\n    RETURN @fiyat * 1.20;\nEND;\nGO\nSELECT name, price, dbo.fn_KdvDahil(price) AS kdv_dahil FROM products;' }),
    ex({ q: '<p><code>dbo.fn_SehirMusterileri(@sehir NVARCHAR(50))</code> adında, o şehirdeki müşterilerin <code>customer_id</code>, <code>first_name</code>, <code>segment</code> bilgilerini döndüren satır içi tablo fonksiyonu yaz ve Antalya için çağır.</p>', sol: "CREATE OR ALTER FUNCTION dbo.fn_SehirMusterileri (@sehir NVARCHAR(50))\nRETURNS TABLE\nAS\nRETURN (SELECT customer_id, first_name, segment FROM customers WHERE city = @sehir);\nGO\nSELECT * FROM dbo.fn_SehirMusterileri(N'Antalya');" })
  ]
});

tsql.push({
  id: 'ts-hata', lv: 'C1', mod: MOD, min: 18,
  title: 'Hata yönetimi: TRY/CATCH, THROW ve işlemler',
  sum: 'Hataları yakalamak, anlamlı mesaj üretmek ve işlemi güvenle geri almak.',
  body: `
<h2>TRY / CATCH</h2>
${TS(`BEGIN TRY
    SELECT 1 / 0 AS sonuc;
END TRY
BEGIN CATCH
    SELECT ERROR_NUMBER()   AS hata_no,
           ERROR_SEVERITY() AS onem,
           ERROR_MESSAGE()  AS mesaj;
END CATCH;`)}
<p>CATCH bloğunda <code>ERROR_NUMBER()</code>, <code>ERROR_MESSAGE()</code>, <code>ERROR_LINE()</code>, <code>ERROR_PROCEDURE()</code> fonksiyonlarıyla hatanın ayrıntılarına ulaşılır.</p>
<h2>İşlem + hata = güvenli değişiklik</h2>
<p>Bir işlemin ortasında hata olursa önceki adımların da geri alınması gerekir. Standart kalıp:</p>
${TS(`BEGIN TRY
    BEGIN TRANSACTION;

    UPDATE products SET stock = stock - 5 WHERE product_id = 1;
    -- Aşağıdaki satır birincil anahtar ihlali yapar
    INSERT INTO products (product_id, name, category, price, cost)
    VALUES (1, N'Kopya ürün', N'Test', 10, 5);

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    PRINT 'İşlem geri alındı: ' + ERROR_MESSAGE();
END CATCH;

SELECT product_id, stock FROM products WHERE product_id = 1;`)}
<p>Stok değişmedi: UPDATE de geri alındı. Mesajlar sekmesine bak.</p>
<h2>THROW ile kendi hatanı fırlatmak</h2>
${TS(`DECLARE @stok INT = (SELECT stock FROM products WHERE product_id = 39);

BEGIN TRY
    IF @stok = 0
        THROW 50001, N'Stokta olmayan ürün satılamaz.', 1;
    PRINT 'Satış yapıldı.';
END TRY
BEGIN CATCH
    SELECT ERROR_NUMBER() AS hata_no, ERROR_MESSAGE() AS mesaj;
END CATCH;`)}
<table><tr><th></th><th><code>THROW</code></th><th><code>RAISERROR</code></th></tr>
<tr><td>Sürüm</td><td>2012+ (önerilen)</td><td>Eski</td></tr>
<tr><td>Hata numarası</td><td>50000+ kullanıcı tanımlı</td><td>Mesaj metni veya sys.messages</td></tr>
<tr><td>CATCH içinde parametresiz</td><td>Orijinal hatayı yeniden fırlatır</td><td>Desteklemez</td></tr>
<tr><td>Önem (severity)</td><td>Her zaman 16</td><td>Belirlenebilir (10 ve altı yalnızca mesaj)</td></tr>
</table>
<div class="tip"><b>SET XACT_ABORT ON</b>Saklı yordamların başına eklenirse, herhangi bir çalışma zamanı hatasında tüm işlem otomatik geri alınır. Gerçek sistemlerde TRY/CATCH ile birlikte önerilir.</div>
`,
  ex: [
    ex({ q: '<p><code>CAST(\'abc\' AS INT)</code> çalıştıran bir TRY bloğu yaz; CATCH bloğunda hata numarasını <code>hata_no</code> adıyla döndür.</p>', sol: "BEGIN TRY\n    SELECT CAST('abc' AS INT);\nEND TRY\nBEGIN CATCH\n    SELECT ERROR_NUMBER() AS hata_no;\nEND CATCH;" }),
    ex({ q: '<p>Bir işlem içinde Hukuk departmanını (<code>dept_id = 7</code>) sil, ardından <b>bilerek</b> <code>THROW 50010, N\'İptal\', 1;</code> ile hata fırlat. CATCH bloğunda işlemi geri al. Sonuçta departman tablosu değişmemiş olmalı.</p>', sol: "BEGIN TRY\n    BEGIN TRANSACTION;\n    DELETE FROM departments WHERE dept_id = 7;\n    THROW 50010, N'İptal', 1;\n    COMMIT TRANSACTION;\nEND TRY\nBEGIN CATCH\n    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;\nEND CATCH;", check: 'SELECT * FROM departments ORDER BY dept_id' })
  ]
});

tsql.push({
  id: 'ts-trigger', lv: 'C1', mod: MOD, min: 14,
  title: 'SQL Server trigger\'ları: inserted ve deleted',
  sum: 'Küme bazlı tetikleyiciler ve denetim kaydı (audit).',
  body: `
<h2>inserted ve deleted sanal tabloları</h2>
<table><tr><th>İşlem</th><th><code>inserted</code></th><th><code>deleted</code></th></tr>
<tr><td>INSERT</td><td>Yeni satırlar</td><td>Boş</td></tr>
<tr><td>UPDATE</td><td>Yeni değerler</td><td>Eski değerler</td></tr>
<tr><td>DELETE</td><td>Boş</td><td>Silinen satırlar</td></tr>
</table>
<p>SQL Server trigger'ı <b>ifade başına bir kez</b> çalışır; bu tablolar etkilenen tüm satırları içerir. Bu yüzden her zaman küme bazlı (JOIN ile) yaz.</p>
${TS(`CREATE TABLE order_audit (
    order_id   INT,
    old_status NVARCHAR(20),
    new_status NVARCHAR(20),
    changed_at DATETIME2 DEFAULT SYSDATETIME()
);
GO
CREATE TRIGGER trg_order_status ON orders
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO order_audit (order_id, old_status, new_status)
    SELECT d.order_id, d.status, i.status
    FROM deleted d
    JOIN inserted i ON i.order_id = d.order_id
    WHERE d.status <> i.status;
END;
GO
UPDATE orders SET status = 'delivered'
WHERE status = 'shipped' AND order_date < '2024-12-01';

SELECT order_id, old_status, new_status FROM order_audit ORDER BY order_id;`)}
<div class="note"><b>INSTEAD OF trigger</b>Asıl işlemin yerine çalışır; çoğunlukla birden çok tabloya dayanan view'ları güncellenebilir yapmak için kullanılır. Bu taklitte AFTER trigger'lar desteklenir.</div>
<div class="note"><b>Alternatifler</b>Denetim kaydı için SQL Server'ın yerleşik <b>Temporal Tables</b> (sistem sürümlü tablolar), <b>Change Data Capture</b> ve <b>SQL Server Audit</b> özellikleri trigger'dan daha az bakım gerektirir.</div>
`,
  ex: [
    ex({ q: '<p><code>dept_log(dept_id INT, name NVARCHAR(50))</code> tablosunu oluştur. <code>departments</code> tablosundan bir satır silindiğinde silinen departmanın id ve adını <code>dept_log</code>\'a yazan <code>trg_dept_delete</code> trigger\'ını yaz. Sonra Hukuk departmanını (<code>dept_id = 7</code>) sil.</p>', sol: 'CREATE TABLE dept_log (dept_id INT, name NVARCHAR(50));\nGO\nCREATE TRIGGER trg_dept_delete ON departments\nAFTER DELETE\nAS\nBEGIN\n    INSERT INTO dept_log (dept_id, name) SELECT dept_id, name FROM deleted;\nEND;\nGO\nDELETE FROM departments WHERE dept_id = 7;', check: 'SELECT dept_id, name FROM dept_log' })
  ]
});

tsql.push({
  id: 'ts-dinamik', lv: 'C1', mod: MOD, min: 14,
  title: 'Dinamik SQL: EXEC ve sp_executesql',
  sum: 'Sorgu metnini çalışma anında üretmek ve bunu güvenle yapmak.',
  body: `
<h2>Ne zaman gerekir?</h2>
<p>Tablo adı, sütun listesi veya PIVOT değerleri gibi parametreyle verilemeyen kısımlar değişkense sorgu metni çalışma anında üretilir.</p>
${TS(`DECLARE @tablo SYSNAME = N'products';
DECLARE @sql NVARCHAR(MAX) = N'SELECT COUNT(*) AS satir FROM ' + QUOTENAME(@tablo) + N';';

PRINT @sql;
EXEC sp_executesql @sql;`)}
<p><code>QUOTENAME</code>, adı köşeli parantez içine alır ve içindeki <code>]</code> karakterlerini kaçışlar; tablo/sütun adı enjeksiyonuna karşı ilk savunmadır.</p>
<h2>Değerleri her zaman parametre olarak ver</h2>
${TS(`DECLARE @sql NVARCHAR(MAX) = N'
    SELECT name, price
    FROM products
    WHERE category = @kat AND price >= @min
    ORDER BY price DESC;';

EXEC sp_executesql
     @sql,
     N'@kat NVARCHAR(50), @min DECIMAL(12, 2)',
     @kat = N'Elektronik', @min = 1000;`)}
<div class="warn"><b>SQL injection</b>Kullanıcı girdisini metne ekleyerek dinamik SQL üretmek (<code>'... WHERE city = ''' + @girdi + ''''</code>) saldırıya açıktır. Değerler için daima <code>sp_executesql</code> parametrelerini, adlar için <code>QUOTENAME</code> ve izin verilen değerler listesini kullan. <code>EXEC(@sql)</code> parametre desteklemez; plan önbelleğini de verimsiz kullanır.</div>
`,
  ex: [
    ex({ q: '<p><code>sp_executesql</code> ile, şehir parametresi (<code>@sehir NVARCHAR(50)</code>) alan dinamik bir sorgu çalıştır: o şehirdeki müşteri sayısını <code>musteri</code> adıyla döndürsün. Bursa için çalıştır.</p>', sol: "DECLARE @sql NVARCHAR(MAX) = N'SELECT COUNT(*) AS musteri FROM customers WHERE city = @sehir;';\nEXEC sp_executesql @sql, N'@sehir NVARCHAR(50)', @sehir = N'Bursa';" })
  ]
});

tsql.push({
  id: 'ts-index', lv: 'C2', mod: MOD, min: 16,
  title: 'SQL Server indeksleri: clustered, nonclustered, INCLUDE, filtreli',
  sum: 'Doğru indeks tasarımı ve yürütme planının okunması.',
  body: `
<h2>Clustered ve nonclustered</h2>
<table><tr><th></th><th>Clustered</th><th>Nonclustered</th></tr>
<tr><td>Tabloda kaç tane?</td><td>En fazla 1</td><td>Çok sayıda (999'a kadar)</td></tr>
<tr><td>Ne saklar?</td><td>Verinin kendisi bu sıraya göre dizilir</td><td>Anahtar + satıra işaretçi (clustered anahtar)</td></tr>
<tr><td>Varsayılan</td><td>PRIMARY KEY ile otomatik</td><td>CREATE INDEX ile</td></tr>
</table>
<p>Clustered indeksi olmayan tabloya <b>heap</b> denir. İyi bir clustered anahtar dar, benzersiz, sürekli artan ve değişmeyen olmalıdır (ör. IDENTITY).</p>
<h2>Kapsayan (covering) indeks: INCLUDE</h2>
<p>Sorgunun ihtiyaç duyduğu tüm sütunlar indekste varsa SQL Server tabloya hiç gitmez (<i>Key Lookup</i> ortadan kalkar):</p>
${TS(`CREATE NONCLUSTERED INDEX ix_orders_customer
    ON orders (customer_id, order_date)
    INCLUDE (status, channel);

EXEC sp_helpindex 'orders';`)}
<h2>Filtreli indeks</h2>
<p>Yalnızca bir alt kümeyi indeksler: daha küçük, daha hızlı. Örneğin sadece iptal edilmiş siparişleri sık sorguluyorsan:</p>
${TS(`CREATE NONCLUSTERED INDEX ix_orders_iptal
    ON orders (order_date)
    WHERE status = 'cancelled';

SELECT COUNT(*) FROM orders WHERE status = 'cancelled' AND order_date >= '2024-01-01';`)}
<h2>Columnstore</h2>
<p>Analitik sorgular için veriyi sütun sütun, sıkıştırılmış saklar: milyonlarca satırlık toplamlarda 10 kat ve üzeri hız. <code>CREATE CLUSTERED COLUMNSTORE INDEX cci_sales ON fact_sales;</code></p>
<h2>Yürütme planında neye bakılır?</h2>
<ul>
<li><b>Index Seek</b> iyi, <b>Index/Table Scan</b> büyük tabloda genelde kötü.</li>
<li><b>Key Lookup</b>: Eksik sütun → INCLUDE ile çöz.</li>
<li>Tahmini ve gerçek satır sayısı arasında büyük fark: güncel olmayan istatistik (<code>UPDATE STATISTICS</code>).</li>
<li>Uyarı simgeleri: örtük dönüşüm, tempdb'ye taşma (spill).</li>
</ul>
<div class="note"><b>Bakım</b>Zamanla indeksler parçalanır (fragmentation). <code>sys.dm_db_index_physical_stats</code> ile ölçülür; %30 üzeri için <code>ALTER INDEX ... REBUILD</code>, daha az için <code>REORGANIZE</code> önerilir. <code>sys.dm_db_missing_index_details</code> eksik indeks önerileri verir (körü körüne uygulama!).</div>
`,
  ex: [
    ex({ q: '<p><code>order_items</code> tablosunda <code>product_id</code> üzerinde, <code>quantity</code> ve <code>unit_price</code> sütunlarını INCLUDE eden <code>ix_items_product</code> adlı nonclustered indeks oluştur.</p>', sol: 'CREATE NONCLUSTERED INDEX ix_items_product ON order_items (product_id) INCLUDE (quantity, unit_price);', check: "SELECT name, tbl_name FROM sqlite_master WHERE type = 'index' AND name = 'ix_items_product'" }),
    { t: 'mc', q: '<p>Bir sorgunun planında <b>Key Lookup</b> operatörü yüksek maliyetli görünüyor. En olası çözüm nedir?</p>', o: ['Tabloyu silip yeniden oluşturmak', 'Kullanılan nonclustered indekse eksik sütunları INCLUDE ile eklemek', 'NOLOCK eklemek', 'Clustered indeksi kaldırmak'], a: 1 },
    { t: 'mc', q: '<p>Hangisi clustered indeks anahtarı için <b>en uygun</b> sütundur?</p>', o: ['Sık güncellenen e-posta adresi', 'Rastgele üretilen GUID', 'Sürekli artan IDENTITY tam sayısı', 'Uzun bir açıklama metni'], a: 2 }
  ]
});

tsql.push({
  id: 'ts-izolasyon', lv: 'C2', mod: MOD, min: 12,
  title: 'SQL Server\'da kilitler, izolasyon ve NOLOCK',
  sum: 'Engelleme (blocking), kilitlenme (deadlock), RCSI ve SNAPSHOT.',
  body: `
<h2>Kilit türleri</h2>
<table><tr><th>Kilit</th><th>Ne zaman?</th></tr>
<tr><td>Paylaşımlı (S)</td><td>Okurken; diğer okuyucularla uyumlu</td></tr>
<tr><td>Özel (X)</td><td>Yazarken; hiçbir kilitle uyumlu değil</td></tr>
<tr><td>Güncelleme (U)</td><td>Güncellemeden önce okurken; kilitlenmeyi önler</td></tr>
</table>
<p>SQL Server'ın varsayılan izolasyonu <b>READ COMMITTED</b>'dır ve klasik kilitleme kullanır: bir işlem satırı güncellerken o satırı okumak isteyen sorgu <b>bekler</b> (blocking).</p>
<h2>NOLOCK neden tehlikeli?</h2>
${TS(`SELECT COUNT(*) AS siparis
FROM orders WITH (NOLOCK)
WHERE status = 'delivered';`)}
<p><code>WITH (NOLOCK)</code> (= READ UNCOMMITTED) beklemeyi önler ama kirli okuma yapar: onaylanmamış veri, aynı satırı <b>iki kez</b> okuma veya hiç okumama mümkündür. Finansal raporlarda kullanılmamalıdır.</p>
<h2>Doğru çözüm: satır sürümleme</h2>
<ul>
<li><b>READ_COMMITTED_SNAPSHOT (RCSI)</b>: Veritabanı düzeyinde açılır (<code>ALTER DATABASE ... SET READ_COMMITTED_SNAPSHOT ON</code>). Okuyucular, yazarları beklemeden son onaylanmış sürümü okur. Azure SQL'de varsayılandır.</li>
<li><b>SNAPSHOT</b>: <code>SET TRANSACTION ISOLATION LEVEL SNAPSHOT</code>; işlem boyunca tutarlı bir anlık görüntü.</li>
</ul>
<h2>Deadlock</h2>
<p>İki işlem birbirinin tuttuğu kaynağı beklerse SQL Server birini kurban seçip <b>Msg 1205</b> hatasıyla geri alır. Önlem: tablolara hep aynı sırayla eriş, işlemleri kısa tut, uygun indeksler kullan, uygulamada 1205 için yeniden deneme ekle.</p>
`,
  ex: [
    { t: 'mc', q: '<p><code>WITH (NOLOCK)</code> kullanan bir sorgu hangi soruna yol açabilir?</p>', o: ['Sorgu hiçbir zaman sonuç döndürmez', 'Onaylanmamış veriyi okuyabilir, satırları iki kez sayabilir veya atlayabilir', 'Tabloyu kalıcı olarak kilitler', 'İndeksleri bozar'], a: 1 },
    { t: 'mc', q: '<p>Okuyucuların yazarları beklememesi için SQL Server\'da önerilen veritabanı ayarı hangisidir?</p>', o: ['READ_COMMITTED_SNAPSHOT ON', 'Tüm sorgulara NOLOCK eklemek', 'SERIALIZABLE izolasyon', 'Trigger kullanmak'], a: 0 },
    { t: 'mc', q: '<p>SQL Server bir deadlock tespit ettiğinde ne yapar?</p>', o: ['İki işlemi de sonsuza kadar bekletir', 'Sunucuyu yeniden başlatır', 'Bir işlemi kurban seçip Msg 1205 ile geri alır', 'İki işlemi de onaylar'], a: 2 }
  ]
});
after('modern-ekosistem', tsql);

/* ======================= SQL türlerine özgü dersler ======================= */
const dial = [];
dial.push({
  id: 'pg-ozel', lv: 'C2', mod: 'SQL Türlerine Özgü', min: 14,
  title: 'PostgreSQL\'e özgü güçlü özellikler',
  sum: '::, ILIKE, FILTER, DISTINCT ON, RETURNING, generate_series, diziler ve JSONB.',
  body: `
<h2>PostgreSQL'in sevilen kısayolları</h2>
${CODE(`SELECT name,
       price::int AS tam_fiyat,
       DATE_TRUNC('month', DATE '2024-05-17')::date AS ay_basi
FROM products
WHERE name ILIKE '%set%';`, null, { base: 'pg' })}
<ul><li><code>x::tip</code>: CAST kısaltması.</li><li><code>ILIKE</code>: Büyük/küçük harf duyarsız LIKE.</li><li><code>DATE_TRUNC</code>: Tarihi ay/yıl/hafta başına yuvarlar.</li></ul>
<h2>FILTER ile koşullu toplama</h2>
${CODE(`SELECT channel,
       COUNT(*) AS toplam,
       COUNT(*) FILTER (WHERE status = 'cancelled') AS iptal,
       ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'cancelled') / COUNT(*), 1) AS iptal_yuzde
FROM orders
GROUP BY channel;`, null, { base: 'pg' })}
<h2>DISTINCT ON: grup başına ilk satır</h2>
<pre class="code" data-norun>-- Her müşterinin son siparişi (PostgreSQL'e özgü)
SELECT DISTINCT ON (customer_id) customer_id, order_id, order_date
FROM orders
ORDER BY customer_id, order_date DESC;</pre>
<p>Diğer SQL türlerinde bunun karşılığı <code>ROW_NUMBER() ... = 1</code> kalıbıdır.</p>
<h2>generate_series ve diziler</h2>
<pre class="code" data-norun>SELECT d::date AS gun
FROM generate_series(DATE '2024-12-01', DATE '2024-12-31', INTERVAL '1 day') AS d;

SELECT ARRAY_AGG(name ORDER BY price DESC) AS urunler FROM products WHERE category = 'Spor';
SELECT * FROM products WHERE category = ANY(ARRAY['Kitap', 'Spor']);</pre>
<div class="note"><b>Neden bu kadar popüler?</b>Açık kaynak, standarda en sadık SQL türü; JSONB, tam metin arama, coğrafi veri (PostGIS), vektör arama (pgvector) gibi eklentilerle neredeyse her işi görür. Bu taklitte DISTINCT ON, generate_series ve diziler çalıştırılamaz; kutuları başvuru olarak kullan.</div>
`,
  ex: [
    { t: 'sql', dl: ['pg'], base: 'pg', q: '<p>PostgreSQL yazımıyla: FILTER kullanarak her müşteri segmentinin toplam sipariş sayısını ve <b>mobil kanaldan</b> gelen sipariş sayısını getir: <code>segment</code>, <code>toplam</code>, <code>mobil</code>.</p>', sol: "SELECT c.segment, COUNT(*) AS toplam, COUNT(*) FILTER (WHERE o.channel = 'mobile') AS mobil FROM orders o JOIN customers c ON c.customer_id = o.customer_id GROUP BY c.segment;" },
    { t: 'sql', dl: ['pg'], base: 'pg', q: '<p>Adında büyük/küçük harf fark etmeksizin <b>“SET”</b> geçen ürünleri ILIKE ile bul ve fiyatlarını <code>::int</code> ile tam sayıya çevirerek getir: <code>name</code>, <code>fiyat</code>.</p>', sol: "SELECT name, price::int AS fiyat FROM products WHERE name ILIKE '%set%';", why: 'ILIKE büyük/küçük harfi dikkate almadığı için “SET” araması “Seti” geçen üç ürünü de bulur.' }
  ]
});
dial.push({
  id: 'mysql-ozel', lv: 'C2', mod: 'SQL Türlerine Özgü', min: 12,
  title: 'MySQL\'e özgü yazımlar ve tuzaklar',
  sum: 'LIMIT a,b, IFNULL, IF, DATE_FORMAT, GROUP_CONCAT, ON DUPLICATE KEY, WITH ROLLUP.',
  body: `
<h2>MySQL'in kendine has yazımları</h2>
${CODE("SELECT `name`, IFNULL(stock, 0) AS stok,\n       IF(price > 1000, 'Pahalı', 'Normal') AS sinif\nFROM products\nORDER BY price DESC\nLIMIT 5, 5;   -- 5 satır atla, 5 satır getir", null, { base: 'mysql' })}
<ul><li><code>\`ters tırnak\`</code> ile tanımlayıcılar.</li><li><code>LIMIT atla, getir</code> kısa yazımı (dikkat: sıra tersine benzer).</li><li><code>IF(koşul, a, b)</code> ve <code>IFNULL</code>.</li></ul>
<h2>Tarih ve metin</h2>
${CODE("SELECT DATE_FORMAT(order_date, '%Y-%m') AS ay,\n       COUNT(*) AS siparis,\n       GROUP_CONCAT(DISTINCT channel ORDER BY channel SEPARATOR ' / ') AS kanallar\nFROM orders\nWHERE YEAR(order_date) = 2024\nGROUP BY DATE_FORMAT(order_date, '%Y-%m')\nORDER BY ay;", null, { base: 'mysql' })}
<h2>Tuzaklar</h2>
<ul>
<li><b><code>||</code> mantıksal VEYA'dır</b>: Metin birleştirmek için <code>CONCAT</code> kullan. (Bu uygulamada MySQL modunda <code>||</code> yazarsan uyarılırsın.)</li>
<li><b>Varsayılan karşılaştırma büyük/küçük harf ve aksan duyarsızdır</b> (<code>utf8mb4_0900_ai_ci</code>): <code>'Şahin' = 'sahin'</code> doğru olabilir.</li>
<li><b>Eski sürümlerde GROUP BY gevşekliği</b>: <code>ONLY_FULL_GROUP_BY</code> kapalıysa gruplanmamış sütunlar rastgele değer döner.</li>
<li><b>FULL OUTER JOIN yoktur</b>; LEFT + RIGHT + UNION ile yazılır.</li>
<li><b>Tam sayı bölmesi</b> yoktur: <code>7 / 2 = 3.5000</code>; tam sayı için <code>7 DIV 2</code>.</li>
</ul>
`,
  ex: [
    { t: 'sql', dl: ['mysql'], base: 'mysql', q: '<p>MySQL yazımıyla: her kanal için 2024 sipariş sayısını ve teslim edilenlerin oranını (yüzde, 1 basamak) getir: <code>channel</code>, <code>siparis</code>, <code>teslim_orani</code>. <code>SUM(status = \'delivered\')</code> kısayolunu kullanabilirsin.</p>', sol: "SELECT channel, COUNT(*) AS siparis, ROUND(100 * SUM(status = 'delivered') / COUNT(*), 1) AS teslim_orani FROM orders WHERE YEAR(order_date) = 2024 GROUP BY channel;" },
    { t: 'sql', dl: ['mysql'], base: 'mysql', q: '<p>MySQL yazımıyla: her departmandaki çalışan adlarını <code>GROUP_CONCAT</code> ile <code> | </code> ayracıyla, ada göre sıralı tek metinde topla: <code>dept_id</code>, <code>calisanlar</code>. Departmanı olmayanları hariç tut.</p>', sol: "SELECT dept_id, GROUP_CONCAT(first_name ORDER BY first_name SEPARATOR ' | ') AS calisanlar FROM employees WHERE dept_id IS NOT NULL GROUP BY dept_id;" }
  ]
});
dial.push({
  id: 'oracle-ozel', lv: 'C2', mod: 'SQL Türlerine Özgü', min: 14,
  title: 'Oracle\'a özgü yazımlar',
  sum: 'DUAL, NVL/NVL2/DECODE, ROWNUM, TO_CHAR, boş metin = NULL, MINUS, CONNECT BY.',
  body: `
<h2>Oracle'ın temel farkları</h2>
${CODE("SELECT SYSDATE AS simdi,\n       TO_CHAR(DATE '2024-05-17', 'DD.MM.YYYY') AS tr_tarih,\n       NVL(NULL, 'yok') AS nvl_ornek,\n       NVL2('x', 'dolu', 'bos') AS nvl2_ornek,\n       DECODE('B', 'A', 'Elma', 'B', 'Armut', 'Diğer') AS decode_ornek\nFROM dual;", null, { base: 'oracle' })}
<ul>
<li><b>DUAL</b>: Oracle'da her SELECT bir FROM ister; tek satırlık yardımcı tablo <code>dual</code>'dır.</li>
<li><b>NVL / NVL2 / DECODE</b>: ISNULL, CASE benzeri Oracle fonksiyonları.</li>
<li><b>DATE tipi saat de içerir</b>; sabit tarihler için <code>DATE '2024-05-17'</code> veya <code>TO_DATE('17.05.2024', 'DD.MM.YYYY')</code>.</li>
</ul>
<h2>Boş metin NULL'dır</h2>
${CODE("SELECT CASE WHEN '' IS NULL THEN 'Boş metin NULL sayılır' ELSE 'Değil' END AS sonuc,\n       'Ad' || NULL || 'Soyad' AS birlestirme\nFROM dual;", null, { base: 'oracle' })}
<p>Oracle'da <code>''</code> ile NULL aynıdır ve <code>||</code> NULL'ı yok sayar. Diğer SQL türlerinden taşınan kodlarda sık hata kaynağıdır.</p>
<h2>ROWNUM ve FETCH FIRST</h2>
${CODE("-- Eski yöntem: önce sırala, sonra ROWNUM ile kes\nSELECT * FROM (\n  SELECT name, price FROM products ORDER BY price DESC\n)\nWHERE ROWNUM <= 3;", null, { base: 'oracle' })}
<p>ROWNUM, ORDER BY'dan <b>önce</b> atanır; bu yüzden sıralı ilk N için alt sorgu gerekir. 12c ve sonrasında <code>FETCH FIRST 3 ROWS ONLY</code> kullan.</p>
<h2>Hiyerarşik sorgu: CONNECT BY</h2>
<pre class="code" data-norun>SELECT LEVEL AS seviye, LPAD(' ', 2 * (LEVEL - 1)) || first_name AS calisan
FROM employees
START WITH manager_id IS NULL
CONNECT BY PRIOR emp_id = manager_id;</pre>
<p>Oracle'ın özyinelemeli CTE'den önceki hiyerarşi sözdizimidir; hâlâ çok yaygındır. Bu taklitte çalıştırılamaz; aynı sonucu özyinelemeli WITH ile alabilirsin.</p>
`,
  ex: [
    { t: 'sql', dl: ['oracle'], base: 'oracle', q: '<p>Oracle yazımıyla: müşterilerin adını ve şehrini getir; şehir NULL ise <code>NVL</code> ile <code>Bilinmiyor</code> yazsın. İlk 5 müşteriyi <code>customer_id</code> sırasıyla <code>FETCH FIRST</code> ile getir.</p>', sol: "SELECT first_name, NVL(city, 'Bilinmiyor') AS sehir FROM customers ORDER BY customer_id FETCH FIRST 5 ROWS ONLY;", ord: true },
    { t: 'sql', dl: ['oracle'], base: 'oracle', q: '<p>Oracle yazımıyla: 2023\'te sipariş verip 2024\'te vermemiş müşterilerin <code>customer_id</code> listesini <code>MINUS</code> ile bul.</p>', sol: 'SELECT customer_id FROM orders WHERE EXTRACT(YEAR FROM order_date) = 2023 MINUS SELECT customer_id FROM orders WHERE EXTRACT(YEAR FROM order_date) = 2024;' }
  ]
});
after('ts-izolasyon', dial);

/* ======================= Mülakat hazırlığı ======================= */
const mul = [];
mul.push({
  id: 'mulakat-1', lv: 'B2', mod: 'Mülakat Hazırlığı', min: 25,
  title: 'Mülakat soruları 1: klasikler',
  sum: 'N. en yüksek maaş, tekrar eden kayıtlar, yöneticiden fazla kazananlar ve daha fazlası.',
  body: `
<h2>Veri pozisyonu mülakatlarının değişmezleri</h2>
<p>Bu sorular veri analisti, veri bilimci ve veri mühendisi mülakatlarında neredeyse her zaman karşına çıkar. Önce kendin çöz, takılırsan ipucuna bak. Her birinin birden çok doğru çözümü vardır; sonucun doğruysa kabul edilir.</p>
<ul>
<li><b>N. en yüksek değer</b>: DENSE_RANK veya alt sorgu + DISTINCT + OFFSET.</li>
<li><b>Tekrar eden kayıtlar</b>: GROUP BY + HAVING COUNT(*) &gt; 1.</li>
<li><b>Grup başına ilk N</b>: ROW_NUMBER / RANK + filtre.</li>
<li><b>Eşi olmayanlar</b>: LEFT JOIN … IS NULL veya NOT EXISTS.</li>
<li><b>Kendine JOIN</b>: Çalışan–yönetici karşılaştırmaları.</li>
</ul>
<div class="tip"><b>Mülakatta düşünceni anlat</b>Önce veriyi ve grain düzeyini sor (ör. “eşit maaşlar nasıl sayılsın?”), sonra kenar durumları (NULL, eşitlik, boş grup) belirt. Görüşmeci doğru cevap kadar yaklaşımını da değerlendirir.</div>
`,
  ex: [
    { t: 'sql', q: '<p><b>İkinci en yüksek</b> farklı maaş değerini bul (tek değer).</p>', sol: 'SELECT MAX(salary) FROM employees WHERE salary < (SELECT MAX(salary) FROM employees);', hint: 'Yöntem 1: en yüksekten küçük olanların en büyüğü. Yöntem 2: DENSE_RANK() = 2.' },
    { t: 'sql', q: '<p>Her departmanda <b>maaşı en yüksek ikinci</b> farklı maaşı alan çalışan(lar)ı getir: <code>dept_id</code>, <code>first_name</code>, <code>salary</code>. Departmanı NULL olanları hariç tut.</p>', sol: 'WITH r AS (SELECT dept_id, first_name, salary, DENSE_RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS dr FROM employees WHERE dept_id IS NOT NULL) SELECT dept_id, first_name, salary FROM r WHERE dr = 2;' },
    { t: 'sql', q: '<p><code>raw_signups</code> tablosunda normalize edilmiş e-posta (<code>LOWER(TRIM(email))</code>) bazında <b>birden fazla kez</b> geçen e-postaları ve tekrar sayılarını getir: <code>email</code>, <code>adet</code>.</p>', sol: 'SELECT LOWER(TRIM(email)) AS email, COUNT(*) AS adet FROM raw_signups GROUP BY LOWER(TRIM(email)) HAVING COUNT(*) > 1;' },
    { t: 'sql', q: '<p><b>Hiç sipariş vermemiş</b> müşterilerin sayısını ve tüm müşterilere oranını (yüzde, 1 basamak) tek satırda getir: <code>siparissiz</code>, <code>oran</code>.</p>', sol: 'SELECT COUNT(*) AS siparissiz, ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM customers), 1) AS oran FROM customers c WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id);' },
    { t: 'sql', q: '<p>Her şehirde <b>en çok sipariş veren</b> müşteriyi bul (eşitlik varsa hepsi): <code>city</code>, <code>customer_id</code>, <code>siparis</code>. Şehri NULL olanları hariç tut.</p>', sol: 'WITH s AS (SELECT c.city, c.customer_id, COUNT(*) AS siparis FROM customers c JOIN orders o ON o.customer_id = c.customer_id WHERE c.city IS NOT NULL GROUP BY c.city, c.customer_id), r AS (SELECT city, customer_id, siparis, RANK() OVER (PARTITION BY city ORDER BY siparis DESC) AS rk FROM s) SELECT city, customer_id, siparis FROM r WHERE rk = 1;' }
  ]
});
mul.push({
  id: 'mulakat-2', lv: 'C1', mod: 'Mülakat Hazırlığı', min: 30,
  title: 'Mülakat soruları 2: analitik vakalar',
  sum: 'Kümülatif toplam, aydan aya değişim, ardışık aylar, elde tutma ve medyan.',
  body: `
<h2>İleri seviye vaka soruları</h2>
<p>Kıdemli analist ve veri bilimci mülakatlarında pencere fonksiyonları ve CTE ile çözülen çok adımlı sorular gelir. Her soruda önce adımları kâğıda yaz: “Önce müşteri bazında topla, sonra sırala, sonra filtrele” gibi.</p>
<div class="tip"><b>Kontrol sorusu</b>Sonucun satır sayısı beklediğin gibi mi? Her müşteri için bir satır bekliyorsan <code>COUNT(DISTINCT customer_id)</code> ile karşılaştır.</div>
`,
  ex: [
    { t: 'sql', q: '<p>Müşteri <b>15</b>\'in siparişlerini tarih sırasıyla getir ve her siparişte o ana kadarki <b>kümülatif sipariş sayısını</b> ekle: <code>order_id</code>, <code>order_date</code>, <code>kumulatif</code>.</p>', sol: 'SELECT order_id, order_date, COUNT(*) OVER (ORDER BY order_date, order_id ROWS UNBOUNDED PRECEDING) AS kumulatif FROM orders WHERE customer_id = 15 ORDER BY order_date, order_id;', ord: true },
    { t: 'sql', q: '<p>2024\'ün her ayı için teslim edilmiş sipariş sayısını ve <b>bir önceki aya göre değişim yüzdesini</b> (1 basamak) getir: <code>ay</code>, <code>siparis</code>, <code>degisim</code>.</p>', sol: "WITH a AS (SELECT strftime('%Y-%m', order_date) AS ay, COUNT(*) AS siparis FROM orders WHERE status = 'delivered' AND order_date >= '2024-01-01' AND order_date < '2025-01-01' GROUP BY strftime('%Y-%m', order_date)) SELECT ay, siparis, ROUND(100.0 * (siparis - LAG(siparis) OVER (ORDER BY ay)) / LAG(siparis) OVER (ORDER BY ay), 1) AS degisim FROM a ORDER BY ay;", ord: true },
    { t: 'sql', q: '<p><b>En az 3 ardışık ay</b> boyunca her ay sipariş vermiş müşterilerin sayısını bul (tek değer). İpucu: “gaps and islands”.</p>', sol: "WITH m AS (SELECT DISTINCT customer_id, CAST(strftime('%Y', order_date) AS INTEGER) * 12 + CAST(strftime('%m', order_date) AS INTEGER) AS ay_no FROM orders), g AS (SELECT customer_id, ay_no - ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY ay_no) AS ada FROM m), s AS (SELECT customer_id, COUNT(*) AS uzunluk FROM g GROUP BY customer_id, ada) SELECT COUNT(DISTINCT customer_id) FROM s WHERE uzunluk >= 3;", hint: 'Ayları sayıya çevir (yıl × 12 + ay), ay numarasından ROW_NUMBER çıkar; aynı farka sahip ardışık aylar bir adadır.' },
    { t: 'sql', q: '<p>İlk siparişini <b>2023</b>\'te vermiş müşterilerin yüzde kaçı <b>2024</b>\'te de sipariş vermiş? (1 basamak, tek değer)</p>', sol: "WITH ilk AS (SELECT customer_id, MIN(order_date) AS d FROM orders GROUP BY customer_id), k AS (SELECT customer_id FROM ilk WHERE d >= '2023-01-01' AND d < '2024-01-01') SELECT ROUND(100.0 * COUNT(DISTINCT o.customer_id) / (SELECT COUNT(*) FROM k), 1) FROM orders o JOIN k ON k.customer_id = o.customer_id WHERE o.order_date >= '2024-01-01' AND o.order_date < '2025-01-01';" },
    { t: 'sql', q: '<p>Her kanal için <b>sipariş başına ürün adedinin ortalamasını</b> (2 basamak) getir: <code>channel</code>, <code>ort_adet</code>. Dikkat: önce sipariş düzeyinde topla.</p>', sol: 'WITH s AS (SELECT o.order_id, o.channel, SUM(oi.quantity) AS adet FROM orders o JOIN order_items oi ON oi.order_id = o.order_id GROUP BY o.order_id, o.channel) SELECT channel, ROUND(AVG(adet * 1.0), 2) AS ort_adet FROM s GROUP BY channel;' }
  ]
});
after('ileri-desenler', mul);

/* ======================= Öğrenme yollarının güncellenmesi ======================= */
const PA = {}; (window.SQLP_PATHS || []).forEach(p => PA[p.id] = p);
const ins = (pid, afterId, ids) => { const p = PA[pid]; if (!p) return; ids = ids.filter(x => !p.lessons.includes(x)); const i = p.lessons.indexOf(afterId); p.lessons.splice(i < 0 ? p.lessons.length : i + 1, 0, ...ids); };
ins('temel', 'veritabani', ['veri-seti']); ins('temel', 'sorgu-sirasi', ['stil']); ins('temel', 'coklu-join', ['non-equi']); ins('temel', 'correlated', ['sik-hatalar']); ins('temel', 'pivot', ['rollup']);
ins('analist', 'veritabani', ['veri-seti']); ins('analist', 'sorgu-sirasi', ['stil']); ins('analist', 'coklu-join', ['non-equi']); ins('analist', 'correlated', ['sik-hatalar']); ins('analist', 'pivot', ['rollup']); ins('analist', 'lehceler', ['mulakat-1', 'mulakat-2']);
ins('bilimci', 'veritabani', ['veri-seti']); ins('bilimci', 'correlated', ['sik-hatalar']); ins('bilimci', 'json', ['mulakat-1', 'mulakat-2']);
ins('muhendis', 'veritabani', ['veri-seti']); ins('muhendis', 'correlated', ['sik-hatalar']); ins('muhendis', 'trigger', ['ts-merge', 'ts-proc', 'ts-hata']);
ins('uzman', 'lehceler', ['pg-ozel', 'mysql-ozel', 'oracle-ozel']); ins('uzman', 'ileri-desenler', ['rollup', 'mulakat-1', 'mulakat-2']);
window.SQLP_PATHS.splice(1, 0, { id: 'tsql', name: 'SQL Server (T-SQL) Uzmanı', short: 'T-SQL', color: 'var(--l5)',
  desc: 'Kurumsal dünyanın SQL\'i: TOP, değişkenler, TRY/CATCH, saklı yordamlar, MERGE, PIVOT, APPLY ve indeksler.',
  long: 'Microsoft SQL Server ve Azure SQL ile çalışacaklar için. Temel SQL\'i SQL Server yazımıyla öğrenir, ardından T-SQL\'in programlama özelliklerine (değişkenler, akış kontrolü, hata yönetimi), saklı yordamlara, fonksiyonlara, trigger\'lara ve SQL Server\'a özgü performans konularına geçersin. Bu öğrenme yolunda varsayılan SQL türü SQL Server yapmanı öneririz.',
  skills: ['TOP / OFFSET-FETCH', 'T-SQL fonksiyonları', 'DECLARE / IF / WHILE', 'Geçici tablolar', 'PIVOT / APPLY', 'MERGE', 'Saklı yordam', 'TRY / CATCH', 'İndeks tasarımı'],
  lessons: ['ts-giris', 'veri-seti', 'select', 'where', 'mantik', 'in-between-like', 'null', 'order-limit', 'ts-top', 'aggregate', 'group-by', 'having', 'case', 'coalesce', 'ts-metin', 'ts-tarih', 'ts-donusum', 'inner-join', 'left-join', 'coklu-join', 'subquery', 'correlated', 'sik-hatalar', 'cte', 'recursive-cte', 'window-intro', 'ranking', 'lag-lead', 'frames', 'ts-degisken', 'ts-gecici', 'rollup', 'ts-pivot', 'ts-apply', 'ts-sistem', 'ddl-create', 'dml', 'transaction', 'view', 'ts-merge', 'ts-proc', 'ts-func', 'ts-hata', 'ts-trigger', 'ts-dinamik', 'index', 'ts-index', 'ts-izolasyon', 'mulakat-1', 'mulakat-2'] });

/* Seviye testi: 3 seviyeye 4'er soru */
const PL = window.SQLP_PLACEMENT || [];
PL.splice(4, 0, { lv: 'A2', q: '<p>Ürünleri kategoriye göre gruplayıp her kategorinin ürün sayısını bulmak için hangisi gerekir?</p>', o: ['<code>ORDER BY category</code>', '<code>GROUP BY category</code> ile <code>COUNT(*)</code>', '<code>DISTINCT category</code>', '<code>WHERE category</code>'], a: 1 });
PL.splice(9, 0, { lv: 'B2', q: '<p>Bir CTE (WITH) hakkında hangisi doğrudur?</p>', o: ['Veriyi kalıcı olarak saklar', 'Yalnızca tanımlandığı ifade boyunca geçerli, isimli bir ara sonuçtur', 'Sadece SQL Server\'da vardır', 'İndeks oluşturur'], a: 1 });
PL.push({ lv: 'C1', q: '<p>Birden çok UPDATE\'in “ya hep ya hiç” çalışması için ne kullanılır?</p>', o: ['VIEW', 'TRANSACTION (BEGIN ... COMMIT / ROLLBACK)', 'INDEX', 'DISTINCT'], a: 1 });
})();
