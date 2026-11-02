/* Kesit SQL içerik 3: C1 İleri (DDL, DML, tasarım, performans), C2 Uzman */
(window.SQLP_LESSONS = window.SQLP_LESSONS || []).push(

/* ======================= C1 ======================= */
{
  id: 'ddl-create', lv: 'C1', mod: 'Veritabanı Tasarımı', min: 15,
  title: 'CREATE TABLE, veri tipleri ve kısıtlar',
  sum: 'Tablo tanımlamak; PRIMARY KEY, NOT NULL, UNIQUE, CHECK, DEFAULT, FOREIGN KEY.',
  body: `
<h2>Tablo oluşturmak</h2>
<pre class="code">CREATE TABLE suppliers (
  supplier_id INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  tax_no      TEXT UNIQUE,
  city        TEXT DEFAULT 'İstanbul',
  rating      INTEGER CHECK (rating BETWEEN 1 AND 5),
  created_at  TEXT DEFAULT CURRENT_TIMESTAMP
);
SELECT name, type, "notnull", dflt_value, pk FROM pragma_table_info('suppliers');</pre>
<h2>Kısıtlar (constraints)</h2>
<table><tr><th>Kısıt</th><th>Görevi</th></tr>
<tr><td><code>PRIMARY KEY</code></td><td>Satırı benzersiz tanımlar; NULL olamaz.</td></tr>
<tr><td><code>NOT NULL</code></td><td>Boş bırakılamaz.</td></tr>
<tr><td><code>UNIQUE</code></td><td>Tekrar edemez (NULL'a genelde izin verir).</td></tr>
<tr><td><code>CHECK (koşul)</code></td><td>Değer koşulu sağlamalı.</td></tr>
<tr><td><code>DEFAULT değer</code></td><td>Değer verilmezse kullanılır.</td></tr>
<tr><td><code>REFERENCES t(sutun)</code></td><td>Yabancı anahtar: değer diğer tabloda olmalı.</td></tr>
</table>
<h2>Yabancı anahtar ve eylemler</h2>
<pre class="code" data-norun>CREATE TABLE supplier_products (
  supplier_id INTEGER REFERENCES suppliers(supplier_id) ON DELETE CASCADE,
  product_id  INTEGER REFERENCES products(product_id),
  PRIMARY KEY (supplier_id, product_id)   -- bileşik birincil anahtar
);</pre>
<p><code>ON DELETE CASCADE</code>: Tedarikçi silinince ilgili satırlar da silinir. Alternatifler: <code>SET NULL</code>, <code>RESTRICT</code>.</p>
<div class="note"><b>Lehçe farkı</b>Otomatik artan anahtar: PostgreSQL'de <code>GENERATED ALWAYS AS IDENTITY</code> veya <code>SERIAL</code>, MySQL'de <code>AUTO_INCREMENT</code>, SQL Server'da <code>IDENTITY(1,1)</code>, SQLite'ta <code>INTEGER PRIMARY KEY</code>. Para için <code>DECIMAL(12,2)</code> kullanılır, FLOAT değil.</div>
<p><code>CREATE TABLE ... AS SELECT</code> ile sorgu sonucundan tablo da üretebilirsin:</p>
<pre class="code">CREATE TABLE vip_customers AS
SELECT * FROM customers WHERE segment = 'Premium';
SELECT COUNT(*) FROM vip_customers;</pre>
`,
  ex: [
    { t: 'sql', q: '<p><code>campaigns</code> adında bir tablo oluştur: <code>campaign_id</code> INTEGER birincil anahtar, <code>name</code> TEXT boş olamaz, <code>budget</code> REAL, <code>start_date</code> TEXT.</p>', start: 'CREATE TABLE campaigns (\n  \n);', sol: 'CREATE TABLE campaigns (campaign_id INTEGER PRIMARY KEY, name TEXT NOT NULL, budget REAL, start_date TEXT);', check: "SELECT name, upper(type), \"notnull\", pk FROM pragma_table_info('campaigns') ORDER BY cid", hint: 'Sütun adlarını kontrol sorgusu doğrular; sıraya ve tiplere dikkat et.' },
    { t: 'sql', q: '<p><code>reviews</code> tablosu oluştur: <code>review_id</code> INTEGER PK, <code>product_id</code> INTEGER (products tablosuna referans), <code>stars</code> INTEGER ve <b>1–5 arasında olmalı</b> (CHECK). Sonra geçersiz değeri reddettiğini görmek için kendin bir INSERT dene.</p>', sol: 'CREATE TABLE reviews (review_id INTEGER PRIMARY KEY, product_id INTEGER REFERENCES products(product_id), stars INTEGER CHECK (stars BETWEEN 1 AND 5));', check: "SELECT name, upper(type), pk, (SELECT COUNT(*) FROM sqlite_master WHERE name='reviews' AND sql LIKE '%CHECK%') FROM pragma_table_info('reviews') ORDER BY cid" },
    { t: 'sql', q: '<p><code>CREATE TABLE ... AS SELECT</code> ile <b>Elektronik</b> kategorisindeki ürünleri içeren <code>electronics</code> tablosu oluştur.</p>', sol: "CREATE TABLE electronics AS SELECT * FROM products WHERE category = 'Elektronik';", check: 'SELECT product_id, name, price FROM electronics ORDER BY product_id' }
  ]
},
{
  id: 'dml', lv: 'C1', mod: 'Veri Değiştirme', min: 15,
  title: 'INSERT, UPDATE, DELETE',
  sum: 'Veri eklemek, güncellemek ve silmek; WHERE\'siz UPDATE felaketi.',
  body: `
<h2>INSERT: veri eklemek</h2>
<pre class="code">INSERT INTO departments (dept_id, name, city)
VALUES (8, 'Lojistik', 'Kocaeli');

-- Birden fazla satır
INSERT INTO departments (dept_id, name, city)
VALUES (9, 'Müşteri Hizmetleri', 'Ankara'),
       (10, 'Ar-Ge', 'İzmir');

SELECT * FROM departments;</pre>
<p>Sütun listesini her zaman yaz; tabloya ileride sütun eklenirse sorgun bozulmaz. Sorgu sonucundan da ekleyebilirsin: <code>INSERT INTO t (a, b) SELECT x, y FROM ...</code>.</p>
<h2>UPDATE: güncellemek</h2>
<pre class="code">UPDATE products
SET price = ROUND(price * 1.10), stock = stock - 1
WHERE category = 'Kitap';
SELECT name, price, stock FROM products WHERE category = 'Kitap';</pre>
<h2>DELETE: silmek</h2>
<pre class="code">DELETE FROM orders WHERE status = 'cancelled' AND order_date < '2023-01-01';
SELECT changes() AS silinen;</pre>
<div class="warn"><b>WHERE'siz UPDATE / DELETE</b><code>UPDATE employees SET salary = 0;</code> tüm çalışanların maaşını sıfırlar. Gerçek sistemlerde değiştirmeden önce aynı WHERE ile bir SELECT çalıştırıp etkilenecek satırları gör, işlemi transaction içinde yap.</div>
<div class="note"><b>Bu uygulamada</b>Ders alıştırmaları her denemede veritabanının temiz bir kopyası üzerinde çalışır. Rahatça silip güncelleyebilirsin.</div>
`,
  ex: [
    { t: 'sql', q: '<p><code>products</code> tablosuna yeni bir ürün ekle: id <b>41</b>, ad <b>\'Çay Bardağı Seti\'</b>, kategori <b>\'Ev & Yaşam\'</b>, fiyat <b>189</b>, maliyet <b>80</b>, stok <b>120</b>.</p>', sol: "INSERT INTO products (product_id, name, category, price, cost, stock) VALUES (41, 'Çay Bardağı Seti', 'Ev & Yaşam', 189, 80, 120);", check: 'SELECT * FROM products WHERE product_id > 40' },
    { t: 'sql', q: '<p><b>Spor</b> kategorisindeki tüm ürünlerin fiyatına <b>%15 indirim</b> uygula (fiyat × 0.85).</p>', sol: "UPDATE products SET price = price * 0.85 WHERE category = 'Spor';", check: 'SELECT product_id, price FROM products ORDER BY product_id' },
    { t: 'sql', q: '<p><code>raw_signups</code> tablosunda e-postası NULL <b>veya</b> boş olan kayıt varsa sil; ardından <b>şehri boş metin</b> (<code>\'\'</code>) <b>ya da NULL</b> olan satırları da sil.</p>', sol: "DELETE FROM raw_signups WHERE email IS NULL OR email = ''; DELETE FROM raw_signups WHERE city IS NULL OR city = '';", check: 'SELECT COUNT(*), COUNT(city) FROM raw_signups', hint: 'Boş metin ve NULL farklı değerlerdir; ikisini de yakalamak için IS NULL ile = \'\' koşulunu OR ile bağla. Oracle boş metni zaten NULL olarak saklar, orada IS NULL yeterlidir.' },
    { t: 'sql', q: '<p>Veri Analitiği departmanındaki (<code>dept_id = 3</code>) çalışanlara <b>5000 TL zam</b> yap.</p>', sol: 'UPDATE employees SET salary = salary + 5000 WHERE dept_id = 3;', check: 'SELECT emp_id, salary FROM employees ORDER BY emp_id' }
  ]
},
{
  id: 'upsert', lv: 'C1', mod: 'Veri Değiştirme', min: 12,
  title: 'UPSERT, RETURNING ve MERGE',
  sum: 'Varsa güncelle yoksa ekle; değiştirilen satırları geri döndür.',
  body: `
<h2>Varsa güncelle, yoksa ekle</h2>
<p>Veri yüklerken aynı anahtarlı kayıt zaten olabilir. Standart dışı ama yaygın çözüm <b>ON CONFLICT</b> (PostgreSQL ve SQLite):</p>
<pre class="code">INSERT INTO departments (dept_id, name, city)
VALUES (7, 'Hukuk ve Uyum', 'Ankara')
ON CONFLICT (dept_id) DO UPDATE
  SET name = excluded.name, city = excluded.city;
SELECT * FROM departments WHERE dept_id = 7;</pre>
<p><code>excluded</code>, eklenmeye çalışılan satırı temsil eder. Çakışmada hiçbir şey yapmamak için <code>DO NOTHING</code>.</p>
<h2>RETURNING</h2>
<p>Değiştirilen satırları ayrı bir sorgu yazmadan geri alırsın (PostgreSQL, SQLite 3.35+):</p>
<pre class="code">UPDATE products SET stock = stock + 50
WHERE stock < 10
RETURNING product_id, name, stock;</pre>
<h2>MERGE (standart SQL)</h2>
<p>SQL:2003 ile gelen MERGE, SQL Server, Oracle, PostgreSQL 15+, BigQuery ve Snowflake'te bulunur:</p>
<pre class="code" data-norun>MERGE INTO products AS t
USING price_updates AS s ON t.product_id = s.product_id
WHEN MATCHED THEN UPDATE SET price = s.new_price
WHEN NOT MATCHED THEN INSERT (product_id, price) VALUES (s.product_id, s.new_price);</pre>
<div class="note"><b>Lehçe</b>MySQL'de <code>INSERT ... ON DUPLICATE KEY UPDATE</code>, SQLite'ta ayrıca <code>INSERT OR REPLACE</code> vardır. REPLACE önce siler sonra ekler; bu yüzden tetikleyicileri ve yabancı anahtarları etkileyebilir.</div>
`,
  ex: [
    { t: 'sql', q: '<p><code>ON CONFLICT</code> kullanarak departman <b>2</b>\'nin adını <b>\'Pazarlama ve İletişim\'</b>, şehrini <b>\'İstanbul\'</b> yap; aynı ifadeyle departman <b>11</b> (<b>\'Veri Platformu\'</b>, <b>\'Ankara\'</b>) yoksa ekle.</p>', sol: "INSERT INTO departments (dept_id, name, city) VALUES (2, 'Pazarlama ve İletişim', 'İstanbul'), (11, 'Veri Platformu', 'Ankara') ON CONFLICT (dept_id) DO UPDATE SET name = excluded.name, city = excluded.city;", check: 'SELECT * FROM departments ORDER BY dept_id' },
    { t: 'sql', q: '<p><code>price_updates</code> tablosundaki <b>her ürünün en son</b> (<code>updated_at</code> en büyük) fiyatını <code>products.price</code>\'a uygula.</p>', sol: 'UPDATE products SET price = (SELECT pu.new_price FROM price_updates pu WHERE pu.product_id = products.product_id ORDER BY pu.updated_at DESC LIMIT 1) WHERE product_id IN (SELECT product_id FROM price_updates);', check: 'SELECT product_id, price FROM products ORDER BY product_id', hint: 'UPDATE ... SET price = (ilişkili alt sorgu ORDER BY updated_at DESC LIMIT 1) WHERE product_id IN (...)' }
  ]
},
{
  id: 'alter-drop', lv: 'C1', mod: 'Veritabanı Tasarımı', min: 8,
  title: 'ALTER TABLE, DROP ve TRUNCATE',
  sum: 'Var olan tabloyu değiştirmek ve kaldırmak.',
  body: `
<h2>ALTER TABLE</h2>
<pre class="code">ALTER TABLE customers ADD COLUMN phone TEXT;
ALTER TABLE customers RENAME COLUMN segment TO customer_segment;
SELECT name FROM pragma_table_info('customers');</pre>
<p>Diğer veritabanlarında ayrıca sütun tipi değiştirme (<code>ALTER COLUMN ... TYPE</code>), kısıt ekleme/kaldırma (<code>ADD CONSTRAINT</code>) yaygındır. SQLite'ın ALTER desteği sınırlıdır; büyük değişikliklerde yeni tablo oluşturup veriyi kopyalamak gerekir.</p>
<h2>DROP, TRUNCATE, DELETE</h2>
<table><tr><th>Komut</th><th>Ne yapar?</th></tr>
<tr><td><code>DELETE FROM t</code></td><td>Satırları siler, yapı kalır, WHERE kullanılabilir, geri alınabilir.</td></tr>
<tr><td><code>TRUNCATE TABLE t</code></td><td>Tüm satırları hızla siler, yapı kalır (SQLite'ta yok; <code>DELETE FROM t</code> kullanılır).</td></tr>
<tr><td><code>DROP TABLE t</code></td><td>Tabloyu yapısıyla birlikte kaldırır.</td></tr>
</table>
<pre class="code">DROP TABLE IF EXISTS raw_signups;
SELECT name FROM sqlite_master WHERE type = 'table';</pre>
<div class="warn"><b>Üretimde şema değişikliği</b>Gerçek sistemlerde şema değişiklikleri <i>migration</i> araçlarıyla (Flyway, Liquibase, Alembic, dbt) sürümlenir ve geri alınabilir şekilde yapılır.</div>
`,
  ex: [
    { t: 'sql', q: '<p><code>products</code> tablosuna <code>is_active</code> adında INTEGER, <b>varsayılanı 1</b> olan bir sütun ekle.</p>', sol: 'ALTER TABLE products ADD COLUMN is_active INTEGER DEFAULT 1;', check: "SELECT name, upper(type), dflt_value FROM pragma_table_info('products') ORDER BY cid" },
    { t: 'sql', q: '<p><code>price_updates</code> tablosunu <b>tamamen kaldır</b>.</p>', sol: 'DROP TABLE price_updates;', check: "SELECT COUNT(*) FROM sqlite_master WHERE name = 'price_updates'" }
  ]
},
{
  id: 'transaction', lv: 'C1', mod: 'Veri Değiştirme', min: 12,
  title: 'Transaction: BEGIN, COMMIT, ROLLBACK',
  sum: 'Ya hep ya hiç: birden çok değişikliği tek iş birimi yapmak.',
  body: `
<h2>Para transferi örneği</h2>
<p>A hesabından 100 TL düşüp B hesabına ekliyorsun. İlk adımdan sonra sistem çökerse para buharlaşır. Transaction, adımları <b>bölünmez</b> bir birim yapar:</p>
<pre class="code">CREATE TABLE accounts (id INTEGER PRIMARY KEY, owner TEXT, balance REAL CHECK (balance >= 0));
INSERT INTO accounts VALUES (1, 'Ayşe', 500), (2, 'Mehmet', 200);

BEGIN TRANSACTION;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;

SELECT * FROM accounts;</pre>
<ul>
<li><b>BEGIN</b>: İşlemi başlat.</li>
<li><b>COMMIT</b>: Tüm değişiklikleri kalıcı yap.</li>
<li><b>ROLLBACK</b>: Başlangıçtan beri yapılan her şeyi geri al.</li>
<li><b>SAVEPOINT ad / ROLLBACK TO ad</b>: İşlem içinde ara kayıt noktası.</li>
</ul>
<pre class="code">CREATE TABLE accounts (id INTEGER PRIMARY KEY, balance REAL);
INSERT INTO accounts VALUES (1, 500);
BEGIN;
UPDATE accounts SET balance = 0;
ROLLBACK;
SELECT * FROM accounts;  -- bakiye hâlâ 500</pre>
<div class="note"><b>Otomatik onay (autocommit)</b>Çoğu istemcide BEGIN yazmazsan her ifade kendi transaction'ında çalışır ve hemen kalıcı olur. Toplu güncellemeleri transaction içine almak hem güvenli hem çok daha hızlıdır.</div>
`,
  ex: [
    { t: 'sql', q: '<p>Bir transaction içinde: <b>Hukuk</b> departmanını (<code>dept_id = 7</code>) sil, ardından <b>Finans</b> departmanının (<code>dept_id = 6</code>) şehrini <b>\'İstanbul\'</b> yap ve işlemi onayla.</p>', sol: "BEGIN; DELETE FROM departments WHERE dept_id = 7; UPDATE departments SET city = 'İstanbul' WHERE dept_id = 6; COMMIT;", check: 'SELECT * FROM departments ORDER BY dept_id' },
    { t: 'sql', q: '<p>Transaction başlat, <b>tüm siparişleri sil</b>, sonra fikrini değiştirip <b>geri al</b>. Sonuçta sipariş tablosu değişmemiş olmalı.</p>', sol: 'BEGIN; DELETE FROM orders; ROLLBACK;', check: 'SELECT COUNT(*) FROM orders' },
    { t: 'mc', q: '<p>Transaction içindeki üç UPDATE\'ten ikincisi hata verdi ve ROLLBACK yapıldı. Sonuç ne olur?</p>', o: ['Sadece ilk UPDATE kalıcı olur', 'Hiçbir değişiklik kalıcı olmaz', 'Birinci ve üçüncü kalıcı olur', 'Veritabanı kilitlenir'], a: 1, why: 'Atomiklik: ya hep ya hiç.' }
  ]
},
{
  id: 'normalizasyon', lv: 'C1', mod: 'Veritabanı Tasarımı', min: 15,
  title: 'Normalizasyon: 1NF, 2NF, 3NF, BCNF',
  sum: 'Tekrarı ve anomalileri önleyen tablo tasarımı.',
  body: `
<h2>Kötü tasarımın üç anomalisi</h2>
<p>Tek bir dev tabloda <code>(siparis_no, musteri_adi, musteri_sehir, urun_adi, urun_fiyat, adet)</code> tuttuğunu düşün:</p>
<ul>
<li><b>Güncelleme anomalisi</b>: Müşteri taşınınca yüzlerce satırı güncellemen gerekir; birini unutursan veri çelişir.</li>
<li><b>Ekleme anomalisi</b>: Hiç satılmamış bir ürünü ekleyemezsin (sipariş yok).</li>
<li><b>Silme anomalisi</b>: Bir ürünün tek siparişini silersen ürün bilgisi de kaybolur.</li>
</ul>
<h2>Normal formlar</h2>
<table><tr><th>Form</th><th>Kural</th><th>Örnek ihlal</th></tr>
<tr><td><b>1NF</b></td><td>Her hücre tek (atomik) değer; tekrar eden sütun grupları yok.</td><td><code>telefonlar = '0532..., 0542...'</code></td></tr>
<tr><td><b>2NF</b></td><td>1NF + anahtar olmayan her sütun birincil anahtarın <b>tamamına</b> bağlı (bileşik anahtarda kısmi bağımlılık yok).</td><td><code>order_items(order_id, product_id, product_name)</code>: ad sadece product_id'ye bağlı</td></tr>
<tr><td><b>3NF</b></td><td>2NF + geçişli bağımlılık yok: anahtar olmayan sütun başka bir anahtar olmayan sütuna bağlı olmamalı.</td><td><code>employees(emp_id, dept_id, dept_name)</code>: dept_name, dept_id'ye bağlı</td></tr>
<tr><td><b>BCNF</b></td><td>Her belirleyici bir aday anahtardır (3NF'nin sıkı hali).</td><td>Nadir, örtüşen aday anahtarlarda ortaya çıkar</td></tr>
</table>
<p>Kısa ezber: <i>“Anahtar, bütün anahtar ve anahtardan başka hiçbir şey.”</i></p>
<h2>Denormalizasyon</h2>
<p>Analitik sistemlerde (veri ambarı) sorguları hızlandırmak için bilinçli olarak tekrar eklenir: yıldız şema, geniş tablolar. Kural: İşlem sistemleri (OLTP) normalize, analitik sistemler (OLAP) çoğu zaman denormalize.</p>
`,
  ex: [
    { t: 'mc', q: '<p><code>orders(order_id, customer_id, customer_city, order_date)</code> tablosu hangi normal formu ihlal eder?</p>', o: ['1NF', '2NF', '3NF', 'Hiçbirini'], a: 2, why: 'customer_city, anahtar olmayan customer_id üzerinden order_id\'ye bağlı: geçişli bağımlılık, 3NF ihlali.' },
    { t: 'mc', q: '<p>Bir hücrede virgülle ayrılmış birden fazla etiket (<code>\'yaz,indirim,yeni\'</code>) saklamak hangi formu ihlal eder?</p>', o: ['1NF', '2NF', '3NF', 'BCNF'], a: 0 },
    { t: 'mc', q: '<p>Bileşik anahtarı <code>(order_id, product_id)</code> olan tabloda <code>product_category</code> sütunu bulunuyor. Sorun nedir?</p>', o: ['1NF ihlali', 'Kısmi bağımlılık, 2NF ihlali', 'Sorun yok', 'Yabancı anahtar eksik'], a: 1 }
  ]
},
{
  id: 'index', lv: 'C1', mod: 'Performans', min: 15,
  title: 'İndeksler ve sorgu planı',
  sum: 'B-tree indeksler, EXPLAIN QUERY PLAN, ne zaman indeks?',
  body: `
<h2>İndeks = kitabın arkasındaki dizin</h2>
<p>İndeks olmadan veritabanı bir koşulu sağlayan satırları bulmak için tüm tabloyu tarar (<i>full table scan</i>). İndeks, sütun değerlerini sıralı bir <b>B-tree</b> yapısında tutar ve aramayı logaritmik zamana indirir.</p>
<pre class="code">EXPLAIN QUERY PLAN
SELECT * FROM orders WHERE customer_id = 42;</pre>
<p>Çıktıda <code>SCAN orders</code> görürsün: tablo taranıyor. Şimdi indeks ekleyelim:</p>
<pre class="code">CREATE INDEX idx_orders_customer ON orders(customer_id);
EXPLAIN QUERY PLAN
SELECT * FROM orders WHERE customer_id = 42;</pre>
<p>Artık <code>SEARCH orders USING INDEX idx_orders_customer</code>.</p>
<h2>Ne zaman indeks?</h2>
<ul>
<li>WHERE, JOIN ON ve ORDER BY'da sık kullanılan, <b>seçici</b> (çok farklı değer içeren) sütunlar.</li>
<li>Yabancı anahtar sütunları (JOIN'ler için).</li>
<li><b>Bileşik indeks</b> <code>(a, b)</code>: <code>WHERE a = ?</code> ve <code>WHERE a = ? AND b = ?</code> için çalışır, sadece <code>WHERE b = ?</code> için genelde çalışmaz (soldan önek kuralı).</li>
</ul>
<h2>Bedeli</h2>
<ul>
<li>Her INSERT/UPDATE/DELETE indeksleri de günceller; yazma yavaşlar.</li>
<li>Disk alanı kaplar.</li>
<li>Sütuna fonksiyon uygularsan indeks kullanılamayabilir: <code>WHERE UPPER(email) = ...</code> veya <code>WHERE strftime('%Y', order_date) = '2024'</code>. Bunun yerine aralık yaz: <code>order_date &gt;= '2024-01-01' AND order_date &lt; '2025-01-01'</code>.</li>
</ul>
`,
  ex: [
    { t: 'sql', q: '<p><code>order_items</code> tablosunda <code>product_id</code> sütunu için <code>idx_items_product</code> adında bir indeks oluştur.</p>', sol: 'CREATE INDEX idx_items_product ON order_items(product_id);', check: "SELECT name, tbl_name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'order_items'" },
    { t: 'sql', q: '<p><code>orders</code> tablosu için <code>(status, order_date)</code> sütunlarında <code>idx_orders_status_date</code> adlı <b>bileşik</b> indeks oluştur.</p>', sol: 'CREATE INDEX idx_orders_status_date ON orders(status, order_date);', check: "SELECT name, (SELECT group_concat(name, ',') FROM pragma_index_info('idx_orders_status_date')) FROM sqlite_master WHERE type = 'index' AND name = 'idx_orders_status_date'" },
    { t: 'mc', q: '<p>Indeks <code>(last_name, first_name)</code> üzerinde. Hangi sorgu bu indeksten <b>en az</b> yararlanır?</p>', o: ["<code>WHERE last_name = 'Kaya'</code>", "<code>WHERE last_name = 'Kaya' AND first_name = 'Ali'</code>", "<code>WHERE first_name = 'Ali'</code>", "<code>ORDER BY last_name, first_name</code>"], a: 2, why: 'Bileşik indeks soldan önek ile çalışır; ilk sütunu atlayan arama indeksi verimli kullanamaz.' }
  ]
},
{
  id: 'view', lv: 'C1', mod: 'Veritabanı Tasarımı', min: 10,
  title: 'View ve materialized view',
  sum: 'Sorguyu isimlendirip tablo gibi kullanmak.',
  body: `
<h2>View: kaydedilmiş sorgu</h2>
<p>View, veri saklamaz; her kullanıldığında altındaki sorguyu çalıştırır. Karmaşık JOIN'leri gizlemek, iş mantığını tek yerde tutmak ve kullanıcılara sadece belirli sütunları göstermek (güvenlik) için kullanılır.</p>
<pre class="code">CREATE VIEW v_order_revenue AS
SELECT o.order_id, o.customer_id, o.order_date, o.status, o.channel,
       SUM(oi.quantity * oi.unit_price * (1 - oi.discount)) AS revenue
FROM orders o
JOIN order_items oi ON oi.order_id = o.order_id
GROUP BY o.order_id;

SELECT channel, ROUND(AVG(revenue), 2) AS ortalama_sepet
FROM v_order_revenue
WHERE status = 'delivered'
GROUP BY channel;</pre>
<h2>Materialized view</h2>
<p>Sonucu fiziksel olarak saklar; okuma çok hızlıdır ama veri değiştikçe <code>REFRESH MATERIALIZED VIEW</code> ile yenilenmesi gerekir (PostgreSQL, Oracle, Snowflake, BigQuery). SQLite'ta yoktur; benzeri <code>CREATE TABLE ... AS SELECT</code> ile yapılır.</p>
<div class="tip"><b>Analitik pratik</b>Veri ekiplerinde “ciro” gibi metriklerin tanımı tek bir view'da (veya dbt modelinde) tutulur; böylece herkes aynı formülü kullanır.</div>
`,
  ex: [
    { t: 'sql', q: '<p><code>v_employee_dept</code> adında bir view oluştur: çalışanın <code>emp_id</code>, <code>first_name</code>, <code>last_name</code>, <code>salary</code> ve departman adını <code>dept_name</code> olarak içersin (departmanı olmayan çalışan da görünsün).</p>', sol: 'CREATE VIEW v_employee_dept AS SELECT e.emp_id, e.first_name, e.last_name, e.salary, d.name AS dept_name FROM employees e LEFT JOIN departments d ON d.dept_id = e.dept_id;', check: 'SELECT emp_id, first_name, last_name, salary, dept_name FROM v_employee_dept ORDER BY emp_id' },
    { t: 'mc', q: '<p>Normal (materialized olmayan) bir view hakkında hangisi doğrudur?</p>', o: ['Verinin kopyasını saklar', 'Her sorgulandığında altındaki sorgu çalışır', 'Sadece bir kez çalışır', 'İndeks oluşturur'], a: 1 }
  ]
},
{
  id: 'trigger', lv: 'C1', mod: 'Veritabanı Tasarımı', min: 12,
  title: 'Trigger (tetikleyici)',
  sum: 'Bir olay olduğunda otomatik çalışan SQL.',
  body: `
<h2>Olay → eylem</h2>
<p>Trigger, bir tabloda INSERT, UPDATE veya DELETE olduğunda (önce/sonra) otomatik çalışır. Denetim kaydı (audit log), türetilmiş alanları güncel tutma ve karmaşık doğrulamalar için kullanılır.</p>
<pre class="code">CREATE TABLE price_log (
  product_id INTEGER, old_price REAL, new_price REAL,
  changed_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_price_change
AFTER UPDATE OF price ON products
WHEN OLD.price <> NEW.price
BEGIN
  INSERT INTO price_log (product_id, old_price, new_price)
  VALUES (OLD.product_id, OLD.price, NEW.price);
END;

UPDATE products SET price = price + 10 WHERE category = 'Kitap';
SELECT product_id, old_price, new_price FROM price_log;</pre>
<p><code>OLD</code> değişiklikten önceki, <code>NEW</code> sonraki satırı temsil eder.</p>
<div class="warn"><b>Dikkatli kullan</b>Trigger'lar “görünmez” mantık ekler: Bir UPDATE'in neden yavaş olduğunu veya beklenmedik bir tabloyu neden değiştirdiğini bulmak zorlaşır. Mümkünse iş mantığını uygulama katmanında veya açık ETL adımlarında tut.</div>
`,
  ex: [
    { t: 'sql', q: '<p><code>stock_alerts(product_id INTEGER, stock INTEGER)</code> tablosunu oluştur. Ardından <code>trg_low_stock</code> adında, <code>products.stock</code> güncellendiğinde yeni stok <b>5\'in altına</b> düşerse <code>stock_alerts</code>\'a kayıt ekleyen bir trigger yaz. Son olarak ürün <b>1</b>\'in stokunu <b>3</b> yap.</p>', sol: 'CREATE TABLE stock_alerts (product_id INTEGER, stock INTEGER); CREATE TRIGGER trg_low_stock AFTER UPDATE OF stock ON products WHEN NEW.stock < 5 BEGIN INSERT INTO stock_alerts VALUES (NEW.product_id, NEW.stock); END; UPDATE products SET stock = 3 WHERE product_id = 1;', check: 'SELECT product_id, stock FROM stock_alerts', hint: 'AFTER UPDATE OF stock ON products WHEN NEW.stock &lt; 5 BEGIN INSERT ...; END;' }
  ]
},
{
  id: 'performans', lv: 'C1', mod: 'Performans', min: 12,
  title: 'Sorgu optimizasyonu: iyi alışkanlıklar',
  sum: 'Hızlı ve ölçeklenebilir SQL yazmanın kuralları.',
  body: `
<h2>Büyük veride fark yaratan alışkanlıklar</h2>
<ol>
<li><b>SELECT * yazma.</b> Özellikle sütun tabanlı ambarlarda (BigQuery, Snowflake) okunan sütun kadar ödersin.</li>
<li><b>Erken filtrele.</b> WHERE'i JOIN'den önce veriyi küçültecek şekilde kur; CTE'lerde ihtiyacın olan satırları en başta süz.</li>
<li><b>Sütuna fonksiyon uygulama.</b> <code>WHERE YEAR(d) = 2024</code> yerine <code>WHERE d &gt;= '2024-01-01' AND d &lt; '2025-01-01'</code> (indeks ve partition budaması çalışır).</li>
<li><b>Gereksiz DISTINCT ve ORDER BY'dan kaçın.</b> Her ikisi de sıralama maliyeti getirir.</li>
<li><b>UNION yerine UNION ALL</b>, tekrar olmayacağını biliyorsan.</li>
<li><b>EXISTS ile IN</b>: Büyük alt sorgularda EXISTS genelde daha öngörülebilirdir; NOT IN'in NULL tuzağı da yoktur.</li>
<li><b>Önce topla, sonra birleştir.</b> Büyük bir olay tablosunu boyut tablosuyla birleştirmeden önce özetle.</li>
<li><b>Planı oku.</b> <code>EXPLAIN</code> / <code>EXPLAIN ANALYZE</code> ile tam tarama, iç içe döngü ve tahmini satır sayılarını incele.</li>
</ol>
<pre class="code">-- Yavaş kalıp: yıl fonksiyonu sütunu sarıyor
EXPLAIN QUERY PLAN
SELECT COUNT(*) FROM orders WHERE strftime('%Y', order_date) = '2024';</pre>
<pre class="code">-- Daha iyi: aralık + indeks
CREATE INDEX idx_o_date ON orders(order_date);
EXPLAIN QUERY PLAN
SELECT COUNT(*) FROM orders WHERE order_date >= '2024-01-01' AND order_date < '2025-01-01';</pre>
`,
  ex: [
    { t: 'mc', q: '<p><code>order_date</code> sütununda indeks var. Hangi filtre indeksi kullanabilir?</p>', o: ["<code>WHERE strftime('%m', order_date) = '05'</code>", "<code>WHERE order_date >= '2024-05-01' AND order_date &lt; '2024-06-01'</code>", "<code>WHERE order_date || '' = '2024-05-01'</code>", "<code>WHERE substr(order_date,1,7) = '2024-05'</code>"], a: 1, why: 'Sütun çıplak bırakıldığında optimizasyon motoru indeksi aralık araması için kullanabilir.' },
    { t: 'sql', q: '<p>Aşağıdaki mantığı <b>indeks dostu</b> şekilde yaz: 2024 Kasım ayındaki sipariş sayısı. <code>strftime</code> veya <code>substr</code> kullanmadan, tarih aralığıyla.</p>', sol: "SELECT COUNT(*) FROM orders WHERE order_date >= '2024-11-01' AND order_date < '2024-12-01';" }
  ]
},

/* ======================= C2 ======================= */
{
  id: 'acid', lv: 'C2', mod: 'Veritabanı İç Yapısı', min: 15,
  title: 'ACID, izolasyon seviyeleri ve eşzamanlılık',
  sum: 'Dirty read, phantom read, kilitler ve MVCC.',
  body: `
<h2>ACID</h2>
<table><tr><th>Harf</th><th>Özellik</th><th>Anlamı</th></tr>
<tr><td>A</td><td>Atomicity (bölünmezlik)</td><td>Ya hep ya hiç.</td></tr>
<tr><td>C</td><td>Consistency (tutarlılık)</td><td>İşlem kısıtları ihlal etmeden bir geçerli durumdan diğerine geçirir.</td></tr>
<tr><td>I</td><td>Isolation (yalıtım)</td><td>Eşzamanlı işlemler birbirini bozmaz.</td></tr>
<tr><td>D</td><td>Durability (kalıcılık)</td><td>COMMIT edilen veri çökmeden sonra da durur (WAL/redo log).</td></tr>
</table>
<h2>Eşzamanlılık sorunları</h2>
<ul>
<li><b>Dirty read</b>: Başka işlemin henüz COMMIT etmediği veriyi okumak.</li>
<li><b>Non-repeatable read</b>: Aynı satırı iki kez okursun, arada başkası değiştirmiştir.</li>
<li><b>Phantom read</b>: Aynı koşulla iki kez sorgularsın, arada yeni satırlar eklenmiştir.</li>
<li><b>Lost update</b>: İki işlem aynı satırı okuyup günceller; biri diğerinin değişikliğini ezer.</li>
</ul>
<h2>İzolasyon seviyeleri (SQL standardı)</h2>
<table><tr><th>Seviye</th><th>Dirty</th><th>Non-repeatable</th><th>Phantom</th></tr>
<tr><td>READ UNCOMMITTED</td><td>Olabilir</td><td>Olabilir</td><td>Olabilir</td></tr>
<tr><td>READ COMMITTED (PostgreSQL, SQL Server varsayılanı)</td><td>Yok</td><td>Olabilir</td><td>Olabilir</td></tr>
<tr><td>REPEATABLE READ (MySQL InnoDB varsayılanı)</td><td>Yok</td><td>Yok</td><td>Olabilir*</td></tr>
<tr><td>SERIALIZABLE</td><td>Yok</td><td>Yok</td><td>Yok</td></tr>
</table>
<p>* PostgreSQL ve InnoDB'de pratikte büyük ölçüde engellenir.</p>
<h2>Kilitler ve MVCC</h2>
<p>Klasik yaklaşım satır/tablo kilitleridir; okuyucu yazarı, yazar okuyucuyu bekler. Modern veritabanları (PostgreSQL, Oracle, InnoDB) <b>MVCC</b> (Multi-Version Concurrency Control) kullanır: Her işlem verinin bir anlık görüntüsünü görür, okuyucular yazarları engellemez. Bedeli: eski sürümlerin temizlenmesi (PostgreSQL'de VACUUM).</p>
<p><b>Deadlock</b>: İki işlem birbirinin kilidini bekler. Veritabanı birini kurban seçip geri alır. Önlem: tablolara/satırlara hep aynı sırayla eriş, işlemleri kısa tut.</p>
`,
  ex: [
    { t: 'mc', q: '<p>Bir işlem, başka bir işlemin henüz onaylamadığı (sonra geri alınan) değeri okudu. Bu hangi sorundur?</p>', o: ['Phantom read', 'Dirty read', 'Lost update', 'Deadlock'], a: 1 },
    { t: 'mc', q: '<p>Tüm eşzamanlılık anomalilerini engelleyen izolasyon seviyesi hangisidir?</p>', o: ['READ COMMITTED', 'REPEATABLE READ', 'SERIALIZABLE', 'READ UNCOMMITTED'], a: 2 },
    { t: 'mc', q: '<p>ACID\'deki “D” neyi garanti eder?</p>', o: ['Verinin dağıtık saklanmasını', 'Onaylanan verinin çökme sonrası kaybolmamasını', 'Veri tiplerinin doğruluğunu', 'Sorguların deterministik olmasını'], a: 1 },
    { t: 'mc', q: '<p>MVCC\'nin temel avantajı nedir?</p>', o: ['Disk kullanımını azaltır', 'Okuyucular yazarları, yazarlar okuyucuları engellemez', 'İndeks ihtiyacını kaldırır', 'Transaction gereksiz olur'], a: 1 }
  ]
},
{
  id: 'json', lv: 'C2', mod: 'Modern SQL', min: 12,
  title: 'SQL ile JSON verisi',
  sum: 'Yarı yapılandırılmış veriyi sorgulamak: json_extract, json_each.',
  body: `
<h2>Neden JSON?</h2>
<p>Uygulama olayları, API yanıtları ve esnek nitelikler çoğu zaman JSON olarak gelir. SQL:2016 ile JSON desteği standarda girdi; PostgreSQL'in <code>jsonb</code> tipi, BigQuery ve Snowflake'in yarı yapılandırılmış tipleri çok yaygındır.</p>
<pre class="code">WITH olaylar(id, payload) AS (
  VALUES (1, '{"user": {"id": 7, "city": "Bursa"}, "items": ["kitap", "kupa"], "total": 420}'),
         (2, '{"user": {"id": 9, "city": "Konya"}, "items": ["mont"], "total": 2499}')
)
SELECT id,
       json_extract(payload, '$.user.city') AS sehir,
       json_extract(payload, '$.total') AS toplam,
       json_array_length(payload, '$.items') AS urun_sayisi
FROM olaylar;</pre>
<h2>Diziyi satırlara açmak</h2>
<pre class="code">WITH olaylar(id, payload) AS (
  VALUES (1, '{"items": ["kitap", "kupa"]}'), (2, '{"items": ["mont"]}')
)
SELECT o.id, j.value AS urun
FROM olaylar o, json_each(o.payload, '$.items') j;</pre>
<h3>Lehçe karşılıkları</h3>
<table><tr><th>İşlem</th><th>PostgreSQL</th><th>MySQL</th><th>BigQuery</th></tr>
<tr><td>Alan oku</td><td><code>payload-&gt;'user'-&gt;&gt;'city'</code></td><td><code>payload-&gt;&gt;'$.user.city'</code></td><td><code>JSON_VALUE(payload, '$.user.city')</code></td></tr>
<tr><td>Diziyi aç</td><td><code>jsonb_array_elements()</code></td><td><code>JSON_TABLE()</code></td><td><code>UNNEST(JSON_QUERY_ARRAY(...))</code></td></tr>
</table>
<p>SQL ile JSON üretmek de mümkündür: <code>json_object('id', customer_id, 'ad', first_name)</code>, <code>json_group_array(...)</code>.</p>
`,
  ex: [
    { t: 'sql', q: '<p>Her müşteri için <code>json_object</code> ile <code>{"id": ..., "ad": ..., "sehir": ...}</code> biçiminde bir JSON metni üret. İlk 3 müşteriyi <code>customer_id</code> sırasıyla getir.</p>', sol: "SELECT json_object('id', customer_id, 'ad', first_name, 'sehir', city) FROM customers ORDER BY customer_id LIMIT 3;", ord: true },
    { t: 'sql', q: '<p>Her kategori için ürün adlarını bir <b>JSON dizisi</b> olarak topla (<code>json_group_array(name)</code>): <code>category</code>, <code>urunler</code>. Kategorilere göre sırala; dizi içindeki sıra <code>product_id</code>\'ye göre olsun.</p>', sol: 'SELECT category, json_group_array(name) AS urunler FROM (SELECT * FROM products ORDER BY product_id) GROUP BY category ORDER BY category;', ord: true, hint: 'Dizi sırasını sabitlemek için alt sorguda ORDER BY product_id yap.' }
  ]
},
{
  id: 'dwh', lv: 'C2', mod: 'Veri Modelleme', min: 15,
  title: 'OLTP ve OLAP, yıldız şema, fact ve dimension',
  sum: 'Analitik veri modellemenin temelleri (Kimball).',
  body: `
<h2>İki farklı dünya</h2>
<table><tr><th></th><th>OLTP (işlem)</th><th>OLAP (analitik)</th></tr>
<tr><td>Amaç</td><td>Uygulamayı çalıştırmak: sipariş al, stok düş</td><td>Analiz ve raporlama</td></tr>
<tr><td>Sorgu</td><td>Çok sayıda küçük okuma/yazma</td><td>Az sayıda büyük taramalı sorgu</td></tr>
<tr><td>Tasarım</td><td>Normalize (3NF)</td><td>Denormalize (yıldız/kar tanesi)</td></tr>
<tr><td>Depolama</td><td>Satır tabanlı</td><td>Sütun tabanlı</td></tr>
<tr><td>Örnek</td><td>PostgreSQL, MySQL, SQL Server</td><td>Snowflake, BigQuery, Redshift, ClickHouse</td></tr>
</table>
<h2>Yıldız şema (star schema)</h2>
<ul>
<li><b>Fact (olgu) tablosu</b>: Ölçülebilir olaylar ve sayısal metrikler. Ör. <code>fact_sales(date_key, product_key, customer_key, quantity, revenue)</code>. Çok satırlı, dar.</li>
<li><b>Dimension (boyut) tabloları</b>: Olayların bağlamı. <code>dim_date</code>, <code>dim_product</code>, <code>dim_customer</code>. Az satırlı, geniş, açıklayıcı.</li>
<li>Fact ortada, dimension'lar etrafında: yıldız. Dimension'lar da normalize edilirse <b>kar tanesi</b> (snowflake) şema.</li>
</ul>
<p><b>Tanecik (grain)</b>: Fact tablosundaki bir satır tam olarak neyi temsil eder? “Bir sipariş satırı” mı, “günlük ürün özeti” mi? Modellemenin ilk ve en önemli kararıdır.</p>
<h2>Anadolu Market için küçük bir yıldız</h2>
<pre class="code">CREATE TABLE dim_date AS
SELECT DISTINCT order_date AS date_key,
       CAST(strftime('%Y', order_date) AS INTEGER) AS year,
       CAST(strftime('%m', order_date) AS INTEGER) AS month,
       FLOOR((CAST(strftime('%m', order_date) AS INTEGER) + 2) / 3) AS quarter
FROM orders;

CREATE TABLE fact_sales AS
SELECT o.order_date AS date_key, oi.product_id, o.customer_id,
       oi.quantity, oi.quantity * oi.unit_price * (1 - oi.discount) AS revenue
FROM orders o JOIN order_items oi ON oi.order_id = o.order_id
WHERE o.status = 'delivered';

SELECT d.year, d.quarter, ROUND(SUM(f.revenue)) AS ciro
FROM fact_sales f JOIN dim_date d ON d.date_key = f.date_key
GROUP BY d.year, d.quarter
ORDER BY d.year, d.quarter;</pre>
`,
  ex: [
    { t: 'mc', q: '<p>Yıldız şemada “ciro” ve “adet” gibi sayısal ölçüler hangi tabloda tutulur?</p>', o: ['Dimension tablosunda', 'Fact tablosunda', 'Lookup tablosunda', 'Staging tablosunda'], a: 1 },
    { t: 'sql', q: '<p>Teslim edilmiş siparişlerden, tanecik düzeyi <b>(gün, kategori)</b> olan bir özet tablo <code>agg_daily_category</code> oluştur: <code>order_date</code>, <code>category</code>, <code>revenue</code> (ciro toplamı, yuvarlama yok).</p>', sol: "CREATE TABLE agg_daily_category AS SELECT o.order_date, p.category, SUM(oi.quantity * oi.unit_price * (1 - oi.discount)) AS revenue FROM orders o JOIN order_items oi ON oi.order_id = o.order_id JOIN products p ON p.product_id = oi.product_id WHERE o.status = 'delivered' GROUP BY o.order_date, p.category;", check: 'SELECT order_date, category, ROUND(revenue, 2) FROM agg_daily_category' },
    { t: 'mc', q: '<p>Analitik veri ambarlarında sütun tabanlı (columnar) depolama neden tercih edilir?</p>', o: ['Tek satır güncellemeleri hızlandırır', 'Sorgu sadece ihtiyaç duyulan sütunları okur ve sıkıştırma çok verimlidir', 'Yabancı anahtarları zorunlu kılar', 'Transaction desteği verir'], a: 1 }
  ]
},
{
  id: 'lehceler', lv: 'C2', mod: 'Modern SQL', min: 12,
  title: 'SQL lehçeleri: PostgreSQL, MySQL, SQL Server, Oracle, BigQuery',
  sum: 'Aynı işin farklı veritabanlarındaki yazımı.',
  body: `
<h2>Ortak çekirdek, farklı aksanlar</h2>
<p>SELECT/FROM/WHERE/JOIN/GROUP BY her yerde aynıdır. Farklar en çok şu alanlarda çıkar:</p>
<div class="tbl-wrap"><table><tr><th>İşlem</th><th>PostgreSQL</th><th>MySQL</th><th>SQL Server</th><th>Oracle</th><th>BigQuery</th></tr>
<tr><td>İlk N satır</td><td><code>LIMIT n</code></td><td><code>LIMIT n</code></td><td><code>TOP n</code></td><td><code>FETCH FIRST n ROWS ONLY</code></td><td><code>LIMIT n</code></td></tr>
<tr><td>Metin birleştir</td><td><code>||</code></td><td><code>CONCAT()</code></td><td><code>+</code> / <code>CONCAT()</code></td><td><code>||</code></td><td><code>CONCAT()</code> / <code>||</code></td></tr>
<tr><td>NULL yerine</td><td><code>COALESCE</code></td><td><code>IFNULL</code></td><td><code>ISNULL</code></td><td><code>NVL</code></td><td><code>IFNULL</code></td></tr>
<tr><td>Ay başı</td><td><code>DATE_TRUNC('month', d)</code></td><td><code>DATE_FORMAT(d,'%Y-%m-01')</code></td><td><code>DATETRUNC(month, d)</code></td><td><code>TRUNC(d, 'MM')</code></td><td><code>DATE_TRUNC(d, MONTH)</code></td></tr>
<tr><td>Tarih ekle</td><td><code>d + INTERVAL '7 day'</code></td><td><code>DATE_ADD(d, INTERVAL 7 DAY)</code></td><td><code>DATEADD(day, 7, d)</code></td><td><code>d + 7</code></td><td><code>DATE_ADD(d, INTERVAL 7 DAY)</code></td></tr>
<tr><td>Otomatik ID</td><td><code>IDENTITY</code>/<code>SERIAL</code></td><td><code>AUTO_INCREMENT</code></td><td><code>IDENTITY(1,1)</code></td><td><code>IDENTITY</code>/sequence</td><td>yok (GENERATE_UUID)</td></tr>
<tr><td>Büyük/küçük harf duyarsız arama</td><td><code>ILIKE</code></td><td>varsayılan duyarsız</td><td>collation'a bağlı</td><td><code>UPPER()</code> ile</td><td><code>LOWER()</code> ile</td></tr>
<tr><td>Prosedürel dil</td><td>PL/pgSQL</td><td>SQL/PSM</td><td>T-SQL</td><td>PL/SQL</td><td>Scripting</td></tr>
</table></div>
<h2>Ambar dünyasına özgü özellikler</h2>
<ul>
<li><b>QUALIFY</b> (Snowflake, BigQuery, Teradata, DuckDB): Pencere fonksiyonu sonucuna göre CTE yazmadan filtreler. <code>QUALIFY ROW_NUMBER() OVER (...) = 1</code></li>
<li><b>ARRAY / STRUCT ve UNNEST</b> (BigQuery): İç içe veri tipleri.</li>
<li><b>Partition ve clustering</b>: Tabloyu tarihe göre bölüp sadece ilgili bölümleri taramak.</li>
</ul>
<div class="tip"><b>Bu uygulamada</b>Her kod kutusunun üstündeki program sekmeleri ve alıştırmalardaki “Diğer programlarda gör” düğmesi, bir sorgunun altı programdaki yazılışını ve çıktısını yan yana görmeni sağlar. Bir programda geçersiz olan sözdizimini (ör. SQL Server'da LIMIT) yazarsan o programın vereceği hatayı alırsın.</div>
<div class="tip"><b>Taşınabilir SQL yazmak</b>Standart fonksiyonları (COALESCE, CASE, CAST, pencere fonksiyonları, CTE) tercih et. Lehçeye özgü fonksiyonları tek bir view veya makroda topla.</div>
`,
  ex: [
    { t: 'mc', q: '<p>SQL Server\'da en pahalı 5 ürünü almak için hangi yazım kullanılır?</p>', o: ['<code>SELECT ... LIMIT 5</code>', '<code>SELECT TOP 5 ...</code>', '<code>SELECT FIRST 5 ...</code>', '<code>SELECT ... ROWNUM 5</code>'], a: 1 },
    { t: 'mc', q: '<p>Oracle\'da <code>COALESCE(x, 0)</code> ile eşdeğer iki argümanlı fonksiyon hangisidir?</p>', o: ['<code>ISNULL</code>', '<code>IFNULL</code>', '<code>NVL</code>', '<code>NULLIF</code>'], a: 2 },
    { t: 'mc', q: '<p><code>QUALIFY</code> ne işe yarar?</p>', o: ['GROUP BY\'ın yerini alır', 'Pencere fonksiyonu sonucuna göre filtreleme yapar', 'JOIN türünü belirtir', 'Yetki verir'], a: 1 }
  ]
},
{
  id: 'guvenlik', lv: 'C2', mod: 'Modern SQL', min: 12,
  title: 'Güvenlik: SQL injection ve yetkilendirme',
  sum: 'Parametreli sorgu, en az yetki ilkesi, GRANT/REVOKE.',
  body: `
<h2>SQL injection</h2>
<p>Kullanıcı girdisini doğrudan sorgu metnine eklemek, en eski ve hâlâ en yaygın güvenlik açıklarından biridir.</p>
<pre class="code" data-norun>-- Uygulama kodu (YANLIŞ):
sorgu = "SELECT * FROM users WHERE email = '" + girdi + "'"

-- Saldırgan girdi olarak şunu yazar:  ' OR '1'='1
-- Oluşan sorgu:
SELECT * FROM users WHERE email = '' OR '1'='1'   -- tüm kullanıcılar!</pre>
<h3>Çözüm: parametreli sorgu</h3>
<pre class="code" data-norun># Python örneği (DOĞRU)
cursor.execute("SELECT * FROM users WHERE email = %s", (girdi,))</pre>
<p>Parametre değeri hiçbir zaman SQL kodu olarak yorumlanmaz. ORM'ler (SQLAlchemy, Django ORM, Hibernate) bunu varsayılan yapar; ham SQL yazarken de mutlaka parametre kullan. Tablo/sütun adı gibi parametrelenemeyen kısımlar için beyaz liste kullan.</p>
<h2>Yetkilendirme (DCL)</h2>
<pre class="code" data-norun>CREATE ROLE analyst;
GRANT SELECT ON sales.orders TO analyst;
GRANT SELECT, INSERT ON staging.events TO etl_user;
REVOKE INSERT ON staging.events FROM etl_user;</pre>
<ul>
<li><b>En az yetki ilkesi</b>: Herkes işini yapacak kadar yetki alsın. Analistler üretim tablolarına yazamamalı.</li>
<li><b>Satır düzeyi güvenlik</b> (RLS): Bölge müdürü sadece kendi bölgesinin satırlarını görsün.</li>
<li><b>Hassas veri</b>: Kişisel verileri (KVKK/GDPR) maskele veya view ile gizle; e-posta, TCKN, telefon gibi sütunlara erişimi kısıtla.</li>
</ul>
<h2>Bir maskeleme örneği</h2>
<pre class="code">SELECT first_name,
       substr(email, 1, 2) || '***' || substr(email, instr(email, '@')) AS maskeli_email
FROM customers
WHERE email IS NOT NULL
LIMIT 5;</pre>
`,
  ex: [
    { t: 'mc', q: '<p>SQL injection\'a karşı en etkili yöntem hangisidir?</p>', o: ['Girdideki tek tırnakları silmek', 'Parametreli sorgular (prepared statements)', 'Sorguları büyük harfle yazmak', 'Veritabanı şifresini uzun tutmak'], a: 1 },
    { t: 'sql', q: '<p>Analistlere açılacak bir view için müşteri e-postalarını maskele: Kullanıcı adının <b>ilk harfi</b>, ardından <code>***</code>, ardından <code>@</code> ve sonrası. Sütunlar: <code>customer_id</code>, <code>maskeli</code>. E-postası NULL olanları hariç tut.</p>', sol: "SELECT customer_id, substr(email, 1, 1) || '***' || substr(email, instr(email, '@')) AS maskeli FROM customers WHERE email IS NOT NULL;" }
  ]
},
{
  id: 'ileri-desenler', lv: 'C2', mod: 'İleri Desenler', min: 18,
  title: 'İleri desenler: gaps & islands, ardışık seriler',
  sum: 'Kesintisiz dönemleri bulmak, ardışık gün serileri.',
  body: `
<h2>Gaps and islands (boşluklar ve adalar)</h2>
<p>“Müşterinin aralıksız sipariş verdiği ay serileri”, “sunucunun kesintisiz çalıştığı dönemler” gibi sorular bu kalıpla çözülür. Fikir: Ardışık değerlerden sıra numarası çıkarıldığında, aynı adadaki satırlar <b>aynı sabit</b> değeri verir.</p>
<pre class="code">WITH aylar AS (
  SELECT DISTINCT customer_id,
         CAST(strftime('%Y', order_date) AS INTEGER) * 12 + CAST(strftime('%m', order_date) AS INTEGER) AS ay_no
  FROM orders
  WHERE customer_id = 24
),
grup AS (
  SELECT customer_id, ay_no,
         ay_no - ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY ay_no) AS ada
  FROM aylar
)
SELECT customer_id, MIN(ay_no) AS bas, MAX(ay_no) AS son, COUNT(*) AS ardisik_ay
FROM grup
GROUP BY customer_id, ada
ORDER BY bas;</pre>
<p>Aylar 1, 2, 3, 5, 6 ise sıra numaraları 1, 2, 3, 4, 5; farklar 0, 0, 0, 1, 1 olur: iki ada.</p>
<h2>Diğer ileri kalıplar</h2>
<ul>
<li><b>Oturumlaştırma (sessionization)</b>: Olaylar arasında 30 dakikadan fazla boşluk varsa yeni oturum. <code>LAG</code> ile fark al, eşiği aşanlara 1 ver, kümülatif topla.</li>
<li><b>Aralık birleştirme</b>: Çakışan tarih aralıklarını tek aralığa indirmek (gaps & islands'ın bir türü).</li>
<li><b>Kümülatif ayrık sayım</b>: “Bugüne kadar kaç farklı müşteri?” için ilk görülme tarihine göre say.</li>
</ul>
`,
  ex: [
    { t: 'sql', q: '<p><code>web_events</code> tablosunda her kullanıcı için ardışık olayları oturumlara ayır: iki olay arasında <b>600 saniyeden fazla</b> boşluk varsa yeni oturum başlasın. Toplam <b>oturum sayısını</b> tek değer olarak döndür.</p>', sol: "WITH e AS (SELECT user_id, event_time, ROUND((julianday(event_time) - julianday(LAG(event_time) OVER (PARTITION BY user_id ORDER BY event_time, event_id))) * 86400) AS gap FROM web_events), s AS (SELECT user_id, CASE WHEN gap IS NULL OR gap > 600 THEN 1 ELSE 0 END AS yeni FROM e) SELECT SUM(yeni) FROM s;", hint: 'LAG ile önceki olay zamanını al, saniye farkını hesapla (julianday farkı × 86400). İlk olay veya 600 saniyeyi aşan fark = yeni oturum (1). Hepsini topla.' },
    { t: 'sql', q: '<p>Her ay (<code>YYYY-MM</code>) için <b>o aya kadar en az bir sipariş vermiş farklı müşteri sayısını</b> (kümülatif) getir: <code>ay</code>, <code>kumulatif_musteri</code>. Aya göre sırala.</p>', sol: "WITH ilk AS (SELECT customer_id, MIN(strftime('%Y-%m', order_date)) AS ay FROM orders GROUP BY customer_id), aylik AS (SELECT ay, COUNT(*) AS yeni FROM ilk GROUP BY ay) SELECT ay, SUM(yeni) OVER (ORDER BY ay) AS kumulatif_musteri FROM aylik ORDER BY ay;", ord: true, hint: 'Önce her müşterinin ilk sipariş ayını bul, aylara göre say, sonra kümülatif topla.' }
  ]
},
{
  id: 'modern-ekosistem', lv: 'C2', mod: 'Modern SQL', min: 10,
  title: 'Modern veri ekosistemi ve SQL\'in geleceği',
  sum: 'NoSQL, NewSQL, bulut ambarları, lakehouse, dbt ve yapay zekâ.',
  body: `
<h2>NoSQL dalgası ve geri dönüş</h2>
<p>2000'lerin sonunda web ölçeği ihtiyacı, şemasız ve yatay ölçeklenen sistemleri doğurdu:</p>
<table><tr><th>Tür</th><th>Örnek</th><th>Güçlü yanı</th></tr>
<tr><td>Doküman</td><td>MongoDB, Couchbase</td><td>Esnek şema, JSON benzeri kayıt</td></tr>
<tr><td>Anahtar-değer</td><td>Redis, DynamoDB</td><td>Çok düşük gecikme</td></tr>
<tr><td>Geniş sütun</td><td>Cassandra, HBase</td><td>Devasa yazma hacmi</td></tr>
<tr><td>Graf</td><td>Neo4j</td><td>İlişki yoğun sorgular</td></tr>
</table>
<p>Ama analiz yapma ihtiyacı herkesi SQL'e geri getirdi: Hive, Spark SQL, Presto/Trino, Cassandra'nın CQL'i, MongoDB'nin SQL arayüzleri. <b>NewSQL</b> sistemleri (Google Spanner, CockroachDB, TiDB) ise dağıtık ölçeği ACID ve SQL ile birleştirdi.</p>
<h2>Bugünün yığını (modern data stack)</h2>
<ul>
<li><b>Bulut veri ambarları</b>: Snowflake, BigQuery, Redshift, Databricks SQL. Depolama ve hesaplama ayrı ölçeklenir.</li>
<li><b>Lakehouse</b>: Veri gölündeki dosyalar (Parquet) üzerinde açık tablo formatları (Delta Lake, Apache Iceberg, Hudi) ile ACID ve SQL.</li>
<li><b>Gömülü analitik</b>: DuckDB, dizüstü bilgisayarda milyonlarca satırı saniyeler içinde sorgular.</li>
<li><b>dbt</b>: SQL SELECT'lerinden oluşan modelleri sürüm kontrolü, test ve dokümantasyonla yönetir. Analytics engineer rolünün temel aracı.</li>
<li><b>Akış (streaming) SQL</b>: Kafka ksqlDB, Flink SQL; sürekli gelen veri üzerinde sorgu.</li>
</ul>
<h2>Yapay zekâ çağında SQL</h2>
<p>Doğal dilden SQL üreten araçlar yaygınlaşıyor. Bu, SQL bilmeyi gereksiz kılmıyor; tersine, üretilen sorgunun doğru olup olmadığını (yanlış JOIN, NULL tuzağı, satır çoğalması) anlayabilen insanların değerini artırıyor. Vektör aramaları (pgvector) ve SQL/PGQ graf sorguları da SQL'in kapsamını genişletiyor.</p>
`,
  ex: [
    { t: 'mc', q: '<p>dbt\'nin temel işlevi nedir?</p>', o: ['Veritabanı sunucusu çalıştırmak', 'SQL ile yazılmış dönüşüm modellerini sürümlemek, test etmek ve çalıştırmak', 'Dashboard çizmek', 'NoSQL veritabanını SQL\'e çevirmek'], a: 1 },
    { t: 'mc', q: '<p>Dağıtık ölçeklenebilirliği ACID garantileri ve SQL ile birleştiren sistemlere ne ad verilir?</p>', o: ['NoSQL', 'NewSQL', 'OLAP küpü', 'Data mart'], a: 1 },
    { t: 'mc', q: '<p>Apache Iceberg ve Delta Lake ne sağlar?</p>', o: ['Veri gölündeki dosyalar üzerinde tablo formatı, ACID ve zaman yolculuğu', 'Yeni bir programlama dili', 'Sadece anahtar-değer depolama', 'Dashboard tasarımı'], a: 0 }
  ]
}
);
