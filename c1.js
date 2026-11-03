/* Kesit SQL içerik 1: Tarih, A1 Başlangıç, A2 Temel */
(window.SQLP_LESSONS = window.SQLP_LESSONS || []).push(

/* ======================= A1 ======================= */
{
  id: 'tarih', lv: 'A1', mod: 'SQL\'in Hikayesi', min: 12,
  title: 'SQL\'in tarihi: bir makaleden dünya standardına',
  sum: 'Codd\'un ilişkisel modeli, System R, SEQUEL, Oracle ve ANSI standartları.',
  body: `
<h2>Her şey bir makaleyle başladı</h2>
<p>1970'te IBM'de çalışan matematikçi <b>Edgar F. Codd</b>, <i>"A Relational Model of Data for Large Shared Data Banks"</i> başlıklı makalesini yayımladı. O güne kadar veriler hiyerarşik (ağaç) veya ağ yapılı veritabanlarında tutuluyordu ve bir veriye ulaşmak için programcının verinin fiziksel olarak nerede durduğunu bilmesi gerekiyordu.</p>
<p>Codd'un fikri basit ama devrimciydi: Veriyi <b>tablolar</b> (matematikteki adıyla <i>ilişkiler / relations</i>) halinde düşün, kullanıcı <b>ne istediğini</b> söylesin, <b>nasıl</b> bulunacağına sistem karar versin. Bugün SQL'in “bildirimsel” (declarative) dil olmasının kökü budur.</p>

<h2>Zaman çizelgesi</h2>
<ul class="timeline">
<li><b>1970</b> · Codd ilişkisel modeli yayımlar. İlişkisel cebir ve ilişkisel hesap kavramlarını tanımlar.</li>
<li><b>1974</b> · IBM'den Donald Chamberlin ve Raymond Boyce, <b>SEQUEL</b> (Structured English Query Language) dilini tanıtır. Amaç, matematik bilmeyen kullanıcıların da sorgu yazabilmesiydi.</li>
<li><b>1974–1979</b> · IBM'in <b>System R</b> projesi, ilişkisel modelin pratikte hızlı çalışabileceğini kanıtlar. Maliyet tabanlı sorgu optimizasyonu burada doğar.</li>
<li><b>1977</b> · SEQUEL adı, bir İngiliz havacılık şirketinin ticari markasıyla çakıştığı için <b>SQL</b> olarak kısaltılır. Bu yüzden bugün hem “es-kyu-el” hem “sikuel” okunuşu yaygındır.</li>
<li><b>1979</b> · Relational Software Inc. (bugünkü <b>Oracle</b>), ilk ticari SQL veritabanını piyasaya sürer. IBM'den önce davranır.</li>
<li><b>1981–1983</b> · IBM SQL/DS ve <b>DB2</b>'yi çıkarır. UC Berkeley'de Ingres projesi (PostgreSQL'in atası) yükselir.</li>
<li><b>1986</b> · SQL, <b>ANSI</b> tarafından, 1987'de <b>ISO</b> tarafından standart kabul edilir (SQL-86).</li>
<li><b>1989 / 1992</b> · SQL-89 ve büyük revizyon <b>SQL-92</b>: JOIN sözdizimi, CASE, CAST ve bugün temel saydığımız pek çok özellik.</li>
<li><b>1995–1996</b> · <b>MySQL</b> ve <b>PostgreSQL</b> doğar; açık kaynak veritabanları web'in omurgası olur.</li>
<li><b>1999</b> · SQL:1999: Özyinelemeli sorgular (WITH RECURSIVE), trigger'lar, boolean tipi.</li>
<li><b>2000</b> · D. Richard Hipp <b>SQLite</b>'ı yazar. Bugün telefonlarda, tarayıcılarda, uçaklarda çalışan, dünyanın en yaygın veritabanıdır. Bu uygulama da SQLite kullanır.</li>
<li><b>2003</b> · SQL:2003: <b>Pencere fonksiyonları</b> (OVER, PARTITION BY), MERGE, XML desteği.</li>
<li><b>2006–2010</b> · Büyük veri ve NoSQL dalgası: Hadoop, MongoDB, Cassandra. “SQL ölüyor mu?” tartışmaları.</li>
<li><b>2010'lar</b> · Hive, Spark SQL, Presto, BigQuery, Redshift, Snowflake: Büyük veri dünyası SQL'e geri döner.</li>
<li><b>2011 / 2016</b> · SQL:2011 zamansal (temporal) tablolar; SQL:2016 <b>JSON</b> desteği ve satır deseni eşleme.</li>
<li><b>2023</b> · SQL:2023: Özellik grafikleri için <b>SQL/PGQ</b> ve JSON veri tipi.</li>
</ul>

<h2>Neden hâlâ SQL?</h2>
<p>50 yılı aşkın sürede programlama dilleri gelip geçti; SQL kaldı. Sebebi, “neyi istediğini söyle” yaklaşımının veriyle çalışmak için çok doğal olması ve tüm büyük veri platformlarının ortak dili haline gelmesi. Bir veri analisti, veri bilimci ya da veri mühendisi için SQL bugün hâlâ iş ilanlarında en sık istenen teknik beceridir.</p>
<div class="note"><b>Lehçe meselesi</b>SQL bir standarttır ama her veritabanı onu kendi “lehçesiyle” konuşur: PostgreSQL, MySQL, SQL Server (T-SQL), Oracle (PL/SQL), SQLite, BigQuery… Temel %90 aynıdır. Farkları ileride ayrı bir derste göreceğiz.</div>
`,
  ex: [
    { t: 'mc', q: '<p>İlişkisel modeli 1970\'te yayımladığı makaleyle ortaya koyan kişi kimdir?</p>', o: ['Larry Ellison', 'Edgar F. Codd', 'D. Richard Hipp', 'Michael Stonebraker'], a: 1, why: 'Codd, IBM\'deyken yazdığı makaleyle ilişkisel modelin temelini attı. Ellison Oracle\'ın kurucusu, Hipp SQLite\'ın, Stonebraker Ingres ve PostgreSQL\'in yaratıcısıdır.' },
    { t: 'mc', q: '<p>SQL\'in ilk adı neydi ve neden değişti?</p>', o: ['QUEL; IBM beğenmediği için', 'SEQUEL; başka bir şirketin ticari markasıyla çakıştığı için', 'RQL; standart komitesi istediği için', 'DBQL; çok uzun olduğu için'], a: 1, why: 'SEQUEL (Structured English Query Language) adı ticari marka sorunu nedeniyle SQL\'e kısaltıldı.' },
    { t: 'mc', q: '<p>Pencere fonksiyonları (OVER, PARTITION BY) hangi standartla SQL\'e girdi?</p>', o: ['SQL-86', 'SQL-92', 'SQL:2003', 'SQL:2016'], a: 2, why: 'SQL:2003 pencere fonksiyonlarını getirdi. Analitik SQL\'in en güçlü araçlarından biridir; B2 seviyesinde detaylı işleyeceğiz.' },
    { t: 'mc', q: '<p>SQL\'in “bildirimsel” (declarative) bir dil olması ne anlama gelir?</p>', o: ['Kodu satır satır çalıştırır', 'Kullanıcı ne istediğini söyler, nasıl bulunacağına veritabanı karar verir', 'Sadece veri tanımlamak için kullanılır', 'Değişken ve döngü kullanmayı zorunlu kılar'], a: 1, why: 'Sorguyu yazarsın, sorgu optimizasyonu motoru en verimli yolu seçer. Bu fikir doğrudan Codd\'un modelinden gelir.' }
  ]
},
{
  id: 'veritabani', lv: 'A1', mod: 'Temeller', min: 10,
  title: 'Veritabanı, tablo, satır ve sütun',
  sum: 'İlişkisel veritabanının yapı taşları ve Anadolu Market veri seti.',
  body: `
<h2>Veritabanı nedir?</h2>
<p>Veritabanı, düzenli şekilde saklanan ve sorgulanabilen veri topluluğudur. <b>İlişkisel veritabanı yönetim sistemi</b> (RDBMS) bu veriyi tablolarda tutar, tablolar arasında ilişki kurar ve SQL ile erişim sağlar.</p>
<h2>Tablo = Excel sayfası gibi, ama kurallı</h2>
<p>Bir tabloyu bir elektronik tablo sayfası gibi düşünebilirsin:</p>
<ul>
<li><b>Sütun (column / field)</b>: Bir özellik. Ör. <code>first_name</code>, <code>city</code>. Her sütunun bir <b>veri tipi</b> vardır.</li>
<li><b>Satır (row / record)</b>: Bir kayıt. Ör. bir müşteri.</li>
<li><b>Birincil anahtar (primary key)</b>: Her satırı benzersiz tanımlayan sütun. Ör. <code>customer_id</code>.</li>
<li><b>Yabancı anahtar (foreign key)</b>: Başka bir tablonun birincil anahtarını gösteren sütun. Ör. <code>orders.customer_id</code>, hangi müşterinin sipariş verdiğini söyler.</li>
</ul>
<p>Excel'den farkı: Bir sütuna rastgele her şeyi yazamazsın; tipler, kısıtlar ve ilişkiler veri bütünlüğünü korur. Milyonlarca satırla hızlı çalışır ve aynı anda birçok kişi kullanabilir.</p>
<h2>Bu uygulamadaki veritabanı: Anadolu Market</h2>
<p>Tüm alıştırmalar, hayali bir e-ticaret şirketi olan <b>Anadolu Market</b>'in verisi üzerinde çalışır:</p>
<table><tr><th>Tablo</th><th>İçerik</th></tr>
<tr><td><code>customers</code></td><td>Müşteriler: ad, şehir, e-posta, kayıt tarihi, segment</td></tr>
<tr><td><code>products</code></td><td>Ürünler: ad, kategori, fiyat, maliyet, stok</td></tr>
<tr><td><code>orders</code></td><td>Siparişler: müşteri, tarih, durum, kanal</td></tr>
<tr><td><code>order_items</code></td><td>Sipariş satırları: hangi siparişte hangi üründen kaç adet</td></tr>
<tr><td><code>employees</code>, <code>departments</code></td><td>Çalışanlar ve departmanlar</td></tr>
<tr><td><code>web_events</code>, <code>ab_test</code></td><td>Web sitesi olayları ve A/B testi (analitik dersleri için)</td></tr>
</table>
<p>Tüm tabloları, sütunlarını ve verinin kendisini <b>Veri setleri</b> sayfasında inceleyebilirsin. Bir tablonun tamamını görmek için aşağıdaki sorguyu çalıştır. Kod kutularındaki <b>Çalıştır</b> düğmesi sorguyu gerçek veritabanında çalıştırır.</p>
<div class="tip"><b>Hangi SQL türü kullanıyorsun?</b>SQL bir standarttır ama SQL Server, PostgreSQL, MySQL, Oracle, BigQuery ve SQLite onu biraz farklı yazar. Menüden <b>varsayılan SQL türünü</b> seç; tüm kodlar o SQL türünün yazımıyla gösterilir. Bir kod kutusunun üstündeki sekmelerle, varsayılanı değiştirmeden aynı sorgunun başka bir SQL türündeki yazılışını ve çıktısını görebilirsin.</div>
<pre class="code">SELECT * FROM departments;</pre>
<div class="tip"><b>SQL komut grupları</b>SQL komutları dört aileye ayrılır: <b>DQL</b> (sorgulama: SELECT), <b>DML</b> (veri değiştirme: INSERT, UPDATE, DELETE), <b>DDL</b> (yapı tanımlama: CREATE, ALTER, DROP), <b>DCL/TCL</b> (yetki ve işlem: GRANT, COMMIT, ROLLBACK). Önce DQL ile başlıyoruz.</div>
`,
  ex: [
    { t: 'mc', q: '<p><code>orders</code> tablosundaki <code>customer_id</code> sütunu ne tür bir anahtardır?</p>', o: ['Birincil anahtar', 'Yabancı anahtar', 'Bileşik anahtar', 'Anahtar değildir'], a: 1, why: 'customer_id, customers tablosunun birincil anahtarına referans verir; bu yüzden orders içinde yabancı anahtardır.' },
    { t: 'mc', q: '<p>Tablodaki her bir kayda ne ad verilir?</p>', o: ['Sütun', 'Şema', 'Satır', 'İndeks'], a: 2 },
    { t: 'sql', q: '<p>İlk sorgunu yaz: <code>products</code> tablosundaki <b>tüm sütunları ve tüm satırları</b> getir.</p>', start: 'SELECT ', sol: 'SELECT * FROM products;', hint: '<code>SELECT * FROM tablo_adi;</code> kalıbını kullan.' }
  ]
},
{
  id: 'select', lv: 'A1', mod: 'Temeller', min: 10,
  title: 'İlk sorgu: SELECT ve FROM',
  sum: 'Belirli sütunları seçmek, sütun sırası ve hesaplanmış sütunlar.',
  body: `
<h2>SELECT ... FROM ...</h2>
<p>Her sorgu iki temel parçayla başlar: <b>SELECT</b> hangi sütunları istediğini, <b>FROM</b> hangi tablodan istediğini söyler.</p>
<pre class="code">SELECT first_name, last_name, city
FROM customers;</pre>
<ul>
<li><code>*</code> “tüm sütunlar” demektir. Keşif için pratiktir ama gerçek işte ihtiyacın olan sütunları yazmak daha hızlı ve okunaklıdır.</li>
<li>Sütunlar yazdığın sırayla gelir.</li>
<li>SQL anahtar kelimeleri büyük/küçük harf duyarsızdır: <code>select</code> ile <code>SELECT</code> aynıdır. Okunabilirlik için anahtar kelimeleri büyük yazmak yaygın bir alışkanlıktır.</li>
<li>Sorgu sonundaki <code>;</code> ifadeyi bitirir. Birden fazla sorguyu ayırmak için gereklidir.</li>
</ul>
<h2>Hesaplanmış sütunlar</h2>
<p>SELECT içinde sadece sütun değil, ifade de yazabilirsin. Ürünün kâr marjını hesaplayalım:</p>
<pre class="code">SELECT name, price, cost, price - cost
FROM products;</pre>
<p>Aritmetik operatörler: <code>+</code>, <code>-</code>, <code>*</code>, <code>/</code>, <code>%</code> (mod). Metinleri birleştirmek için SQLite ve PostgreSQL'de <code>||</code> kullanılır:</p>
<pre class="code">SELECT first_name || ' ' || last_name
FROM employees;</pre>
<div class="note"><b>Yorum satırları</b><code>-- tek satır yorum</code> ve <code>/* çok satırlı yorum */</code> sorguya not düşmeni sağlar, çalıştırılmaz.</div>
`,
  ex: [
    { t: 'sql', q: '<p><code>customers</code> tablosundan <code>first_name</code>, <code>last_name</code> ve <code>email</code> sütunlarını bu sırayla getir.</p>', sol: 'SELECT first_name, last_name, email FROM customers;', hint: 'Sütun adlarını virgülle ayır.' },
    { t: 'sql', q: '<p><code>products</code> tablosundan ürün adı (<code>name</code>), fiyatı (<code>price</code>) ve <b>fiyatın KDV dahil hali</b>ni (fiyat × 1.20) getir.</p>', sol: 'SELECT name, price, price * 1.20 FROM products;', hint: 'SELECT içinde <code>price * 1.20</code> yazabilirsin.' },
    { t: 'sql', q: '<p><code>employees</code> tablosundan her çalışanın <b>ad ve soyadını tek sütunda</b> (arada bir boşlukla) ve <code>title</code> sütununu getir.</p>', sol: "SELECT first_name || ' ' || last_name, title FROM employees;", hint: "<code>first_name || ' ' || last_name</code>" }
  ]
},
{
  id: 'alias-distinct', lv: 'A1', mod: 'Temeller', min: 10,
  title: 'Takma adlar (AS) ve DISTINCT',
  sum: 'Sütunlara okunur adlar vermek ve tekrarları kaldırmak.',
  body: `
<h2>AS ile takma ad</h2>
<p>Hesaplanmış sütunların adı genelde çirkin olur (<code>price - cost</code> gibi). <b>AS</b> ile sütuna anlamlı bir ad verirsin:</p>
<pre class="code">SELECT name AS urun,
       price - cost AS birim_kar
FROM products;</pre>
<ul>
<li><code>AS</code> kelimesi çoğu veritabanında isteğe bağlıdır: <code>price - cost birim_kar</code> da çalışır, ama AS yazmak niyeti netleştirir.</li>
<li>Boşluk veya özel karakter içeren adlar için çift tırnak kullan: <code>AS "Birim Kâr"</code>.</li>
<li>Tablolara da takma ad verilebilir: <code>FROM products AS p</code>. Bu JOIN derslerinde çok işine yarayacak.</li>
</ul>
<h2>DISTINCT ile tekrarsız değerler</h2>
<p>Hangi kategorilerde ürün sattığımızı merak ediyoruz. <code>SELECT category FROM products</code> her ürün için bir satır döndürür. Tekrarları atmak için:</p>
<pre class="code">SELECT DISTINCT category
FROM products;</pre>
<p>DISTINCT birden fazla sütunla kullanılırsa <b>kombinasyonların</b> tekrarsızını verir:</p>
<pre class="code">SELECT DISTINCT status, channel
FROM orders;</pre>
<div class="warn"><b>Dikkat</b>DISTINCT sadece ilk sütuna değil, SELECT listesinin tamamına uygulanır. Ayrıca büyük tablolarda maliyetlidir; tekrar oluşmasının sebebini anlamadan DISTINCT ile “yamamak” kötü bir alışkanlıktır.</div>
`,
  ex: [
    { t: 'sql', q: '<p><code>customers</code> tablosundaki <b>farklı segment</b> değerlerini listele.</p>', sol: 'SELECT DISTINCT segment FROM customers;' },
    { t: 'sql', q: '<p>Ürünlerin adını <code>urun</code>, maliyetini <code>maliyet</code>, fiyat ile maliyet farkını <code>kar</code> adıyla getir.</p>', sol: 'SELECT name AS urun, cost AS maliyet, price - cost AS kar FROM products;', hint: 'Her ifadenin arkasına <code>AS ad</code> ekle.' },
    { t: 'sql', q: '<p>Siparişlerde kullanılan <b>farklı kanal</b> (<code>channel</code>) değerlerini getir.</p>', sol: 'SELECT DISTINCT channel FROM orders;' }
  ]
},
{
  id: 'where', lv: 'A1', mod: 'Temeller', min: 12,
  title: 'WHERE ile filtreleme',
  sum: 'Karşılaştırma operatörleri ve metin/sayı/tarih filtreleri.',
  body: `
<h2>Sadece istediğin satırlar</h2>
<p><b>WHERE</b>, bir koşulu sağlayan satırları süzer. FROM'dan sonra gelir:</p>
<pre class="code">SELECT name, price
FROM products
WHERE price > 1000;</pre>
<h3>Karşılaştırma operatörleri</h3>
<table><tr><th>Operatör</th><th>Anlamı</th><th>Örnek</th></tr>
<tr><td><code>=</code></td><td>eşit</td><td><code>city = 'Ankara'</code></td></tr>
<tr><td><code>&lt;&gt;</code> veya <code>!=</code></td><td>eşit değil</td><td><code>status &lt;&gt; 'cancelled'</code></td></tr>
<tr><td><code>&gt;</code>, <code>&lt;</code></td><td>büyük, küçük</td><td><code>stock &lt; 10</code></td></tr>
<tr><td><code>&gt;=</code>, <code>&lt;=</code></td><td>büyük eşit, küçük eşit</td><td><code>salary &gt;= 50000</code></td></tr>
</table>
<h3>Metinler tek tırnakla yazılır</h3>
<pre class="code">SELECT first_name, last_name, city
FROM customers
WHERE city = 'İzmir';</pre>
<ul>
<li>Metin değerleri <b>tek tırnak</b> içinde yazılır: <code>'İzmir'</code>. Çift tırnak sütun/tablo adı içindir.</li>
<li>SQLite'ta <code>=</code> büyük/küçük harf duyarlıdır: <code>'izmir'</code> ile <code>'İzmir'</code> eşleşmez.</li>
</ul>
<h3>Tarihler</h3>
<p>Bu veritabanında tarihler <code>'YYYY-AA-GG'</code> biçiminde metin olarak saklanır. Bu ISO formatı sayesinde metin karşılaştırması tarih sırasıyla aynı sonucu verir:</p>
<pre class="code">SELECT order_id, order_date
FROM orders
WHERE order_date >= '2024-12-01';</pre>
`,
  ex: [
    { t: 'sql', q: '<p>Stok miktarı (<code>stock</code>) <b>20\'den az</b> olan ürünlerin adını ve stok miktarını getir.</p>', sol: 'SELECT name, stock FROM products WHERE stock < 20;' },
    { t: 'sql', q: '<p><b>Ankara</b>\'da yaşayan müşterilerin tüm bilgilerini getir.</p>', sol: "SELECT * FROM customers WHERE city = 'Ankara';", hint: "Metni tek tırnakla yaz: <code>'Ankara'</code>" },
    { t: 'sql', q: '<p>Durumu <code>cancelled</code> <b>olmayan</b> siparişlerin <code>order_id</code> ve <code>status</code> sütunlarını getir.</p>', sol: "SELECT order_id, status FROM orders WHERE status <> 'cancelled';" },
    { t: 'sql', q: '<p>2024 yılı içinde, yani <code>2024-01-01</code> ve sonrasında kayıt olmuş (<code>signup_date</code>) müşterilerin adını, soyadını ve kayıt tarihini getir.</p>', sol: "SELECT first_name, last_name, signup_date FROM customers WHERE signup_date >= '2024-01-01';" }
  ]
},
{
  id: 'mantik', lv: 'A1', mod: 'Temeller', min: 12,
  title: 'AND, OR, NOT ve işlem önceliği',
  sum: 'Birden fazla koşulu birleştirmek ve parantezin önemi.',
  body: `
<h2>Koşulları birleştirmek</h2>
<ul>
<li><b>AND</b>: Her iki koşul da doğru olmalı.</li>
<li><b>OR</b>: En az biri doğru olmalı.</li>
<li><b>NOT</b>: Koşulu tersine çevirir.</li>
</ul>
<pre class="code">SELECT name, category, price
FROM products
WHERE category = 'Elektronik' AND price < 1000;</pre>
<h2>Öncelik tuzağı</h2>
<p>SQL'de <b>AND, OR'dan önce</b> değerlendirilir (matematikte çarpmanın toplamadan önce gelmesi gibi). Şu sorgu ne döndürür?</p>
<pre class="code">-- Niyet: Kitap veya Kozmetik kategorisinde, 200 TL altı ürünler
SELECT name, category, price
FROM products
WHERE category = 'Kitap' OR category = 'Kozmetik' AND price < 200;</pre>
<p>Bu sorgu “Kitap olan HER ürün” VEYA “200 TL altı Kozmetik ürünleri” döndürür, çünkü AND önce bağlanır. Doğrusu parantez kullanmak:</p>
<pre class="code">SELECT name, category, price
FROM products
WHERE (category = 'Kitap' OR category = 'Kozmetik') AND price < 200;</pre>
<div class="tip"><b>Altın kural</b>AND ve OR'u birlikte kullandığında her zaman parantez koy. Hem hatayı önler hem de okuyan kişiye niyetini gösterir.</div>
`,
  ex: [
    { t: 'sql', q: '<p><b>Giyim</b> kategorisinde olup fiyatı <b>500 TL ve üzeri</b> olan ürünlerin adını ve fiyatını getir.</p>', sol: "SELECT name, price FROM products WHERE category = 'Giyim' AND price >= 500;" },
    { t: 'sql', q: '<p><b>mobile</b> veya <b>store</b> kanalından gelen ve durumu <b>delivered</b> olan siparişlerin <code>order_id</code>, <code>channel</code> değerlerini getir.</p>', sol: "SELECT order_id, channel FROM orders WHERE (channel = 'mobile' OR channel = 'store') AND status = 'delivered';", hint: 'OR kısmını paranteze al.' },
    { t: 'sql', q: '<p>Segmenti <b>Bireysel olmayan</b> müşterilerin adını ve segmentini <code>NOT</code> kullanarak getir.</p>', sol: "SELECT first_name, segment FROM customers WHERE NOT segment = 'Bireysel';" },
    { t: 'mc', q: '<p><code>WHERE a = 1 OR b = 2 AND c = 3</code> ifadesi nasıl değerlendirilir?</p>', o: ['<code>(a = 1 OR b = 2) AND c = 3</code>', '<code>a = 1 OR (b = 2 AND c = 3)</code>', 'Hata verir', 'Soldan sağa, sıralı'], a: 1, why: 'AND, OR\'dan daha yüksek önceliklidir.' }
  ]
},
{
  id: 'in-between-like', lv: 'A1', mod: 'Temeller', min: 14,
  title: 'IN, BETWEEN ve LIKE',
  sum: 'Liste, aralık ve desen eşleştirme ile daha kısa filtreler.',
  body: `
<h2>IN: listeden biri</h2>
<p>Çok sayıda OR yazmak yerine:</p>
<pre class="code">SELECT first_name, city
FROM customers
WHERE city IN ('İzmir', 'Bursa', 'Antalya');</pre>
<p><code>NOT IN</code> listede olmayanları getirir.</p>
<h2>BETWEEN: aralık</h2>
<p><code>BETWEEN a AND b</code>, <b>uç değerler dahil</b> a ile b arasını seçer:</p>
<pre class="code">SELECT name, price
FROM products
WHERE price BETWEEN 300 AND 900;</pre>
<p>Tarihlerle de çalışır: <code>order_date BETWEEN '2024-01-01' AND '2024-03-31'</code>.</p>
<div class="warn"><b>Tarih + saat tuzağı</b>Sütunda saat de varsa (<code>'2024-03-31 14:20:00'</code>), <code>BETWEEN ... AND '2024-03-31'</code> o günün saatli kayıtlarını kaçırır. Güvenli kalıp: <code>tarih &gt;= '2024-01-01' AND tarih &lt; '2024-04-01'</code>.</div>
<h2>LIKE: desen eşleştirme</h2>
<table><tr><th>Joker</th><th>Anlamı</th><th>Örnek</th></tr>
<tr><td><code>%</code></td><td>sıfır veya daha fazla karakter</td><td><code>'Akıllı%'</code>: Akıllı ile başlayan</td></tr>
<tr><td><code>_</code></td><td>tam olarak bir karakter</td><td><code>'_a%'</code>: ikinci harfi a olan</td></tr>
</table>
<pre class="code">SELECT name FROM products WHERE name LIKE '%Set%';</pre>
<pre class="code">SELECT email FROM customers WHERE email LIKE '%@gmail.com';</pre>
<div class="note"><b>Büyük/küçük harf</b>SQLite'ta LIKE, ASCII harflerde büyük/küçük harf duyarsızdır. PostgreSQL'de LIKE duyarlıdır, duyarsız arama için <code>ILIKE</code> kullanılır.</div>
`,
  ex: [
    { t: 'sql', q: '<p><b>Kitap, Spor veya Hediye</b> kategorilerindeki ürünlerin adını ve kategorisini <code>IN</code> ile getir.</p>', sol: "SELECT name, category FROM products WHERE category IN ('Kitap', 'Spor', 'Hediye');" },
    { t: 'sql', q: '<p>Maaşı <b>50.000 ile 70.000 arasında</b> (dahil) olan çalışanların adını ve maaşını getir.</p>', sol: 'SELECT first_name, salary FROM employees WHERE salary BETWEEN 50000 AND 70000;' },
    { t: 'sql', q: '<p>E-posta adresi <b>hotmail.com</b> ile biten müşterilerin adını ve e-postasını getir.</p>', sol: "SELECT first_name, email FROM customers WHERE email LIKE '%@hotmail.com';", hint: "<code>LIKE '%@hotmail.com'</code>" },
    { t: 'sql', q: '<p>2024\'ün <b>ilk çeyreğinde</b> (Ocak–Mart) verilen siparişlerin <code>order_id</code> ve <code>order_date</code> değerlerini getir.</p>', sol: "SELECT order_id, order_date FROM orders WHERE order_date BETWEEN '2024-01-01' AND '2024-03-31';" }
  ]
},
{
  id: 'null', lv: 'A1', mod: 'Temeller', min: 10,
  title: 'NULL: bilinmeyen değer',
  sum: 'IS NULL, IS NOT NULL ve NULL\'ın üç değerli mantığı.',
  body: `
<h2>NULL sıfır değildir, boş metin değildir</h2>
<p><b>NULL</b> “değer yok / bilinmiyor” demektir. Bazı müşterilerimizin şehri veya e-postası bilinmiyor; bu hücrelerde NULL var.</p>
<h2>NULL'ı = ile arayamazsın</h2>
<p>NULL ile yapılan her karşılaştırma <b>bilinmeyen</b> (UNKNOWN) sonucunu verir, doğru değil. Bu yüzden şu sorgu hiçbir satır döndürmez:</p>
<pre class="code">SELECT * FROM customers WHERE email = NULL;  -- yanlış!</pre>
<p>Doğrusu:</p>
<pre class="code">SELECT first_name, last_name, email
FROM customers
WHERE email IS NULL;</pre>
<p>Tersi için <code>IS NOT NULL</code>.</p>
<h2>Üç değerli mantık</h2>
<p>SQL'de bir koşul DOĞRU, YANLIŞ veya BİLİNMEYEN olabilir. WHERE sadece DOĞRU olan satırları alır.</p>
<table><tr><th>İfade</th><th>Sonuç</th></tr>
<tr><td><code>NULL = NULL</code></td><td>BİLİNMEYEN</td></tr>
<tr><td><code>NULL &lt;&gt; 5</code></td><td>BİLİNMEYEN</td></tr>
<tr><td><code>5 + NULL</code></td><td>NULL</td></tr>
<tr><td><code>TRUE OR NULL</code></td><td>DOĞRU</td></tr>
<tr><td><code>FALSE AND NULL</code></td><td>YANLIŞ</td></tr>
</table>
<div class="warn"><b>Klasik hata</b><code>WHERE city &lt;&gt; 'İstanbul'</code> şehri NULL olan müşterileri <b>getirmez</b>. Onları da istiyorsan: <code>WHERE city &lt;&gt; 'İstanbul' OR city IS NULL</code>.</div>
`,
  ex: [
    { t: 'sql', q: '<p>Şehri (<code>city</code>) <b>bilinmeyen</b> müşterilerin <code>customer_id</code>, <code>first_name</code> değerlerini getir.</p>', sol: 'SELECT customer_id, first_name FROM customers WHERE city IS NULL;' },
    { t: 'sql', q: '<p>Yöneticisi olmayan (<code>manager_id</code> boş) çalışanı bul: adını ve unvanını getir.</p>', sol: 'SELECT first_name, title FROM employees WHERE manager_id IS NULL;' },
    { t: 'sql', q: '<p>İstanbul\'da <b>yaşamayan</b> tüm müşterileri, şehri bilinmeyenler <b>dahil</b> getir: <code>first_name</code>, <code>city</code>.</p>', sol: "SELECT first_name, city FROM customers WHERE city <> 'İstanbul' OR city IS NULL;", hint: 'İki koşulu OR ile bağla: biri eşit değil, diğeri IS NULL.' },
    { t: 'mc', q: '<p><code>SELECT 10 + NULL</code> sorgusu ne döndürür?</p>', o: ['10', '0', 'NULL', 'Hata'], a: 2, why: 'NULL içeren aritmetik işlemlerin sonucu NULL olur.' }
  ]
},
{
  id: 'order-limit', lv: 'A1', mod: 'Temeller', min: 10,
  title: 'ORDER BY ve LIMIT',
  sum: 'Sonuçları sıralamak, ilk N kaydı almak ve sayfalama.',
  body: `
<h2>Sıralama</h2>
<p>SQL, ORDER BY yazmadığın sürece sonuçların sırasını <b>garanti etmez</b>. Sıralamak için:</p>
<pre class="code">SELECT name, price
FROM products
ORDER BY price DESC;</pre>
<ul>
<li><code>ASC</code> artan (varsayılan), <code>DESC</code> azalan.</li>
<li>Birden fazla sütunla sıralayabilirsin; ilk sütun eşitse ikinciye bakılır.</li>
<li>Takma adla veya SELECT listesindeki sırasıyla da sıralayabilirsin: <code>ORDER BY 2</code>.</li>
</ul>
<pre class="code">SELECT category, name, price
FROM products
ORDER BY category ASC, price DESC;</pre>
<h2>LIMIT ve OFFSET</h2>
<p>En pahalı 5 ürün:</p>
<pre class="code">SELECT name, price
FROM products
ORDER BY price DESC
LIMIT 5;</pre>
<p><code>LIMIT 5 OFFSET 10</code>: ilk 10 satırı atla, sonraki 5'i getir. Sayfalama böyle yapılır.</p>
<div class="note"><b>Lehçe farkı</b>SQL Server'da <code>SELECT TOP 5 ...</code>, standart SQL ve Oracle'da <code>FETCH FIRST 5 ROWS ONLY</code> kullanılır. Mantık aynıdır.</div>
<div class="note"><b>NULL'lar nerede?</b>SQLite ve MySQL'de NULL'lar artan sıralamada başa gelir; PostgreSQL ve Oracle'da sona. Kontrol etmek için <code>NULLS FIRST / NULLS LAST</code> kullanılabilir.</div>
`,
  ex: [
    { t: 'sql', q: '<p>Tüm çalışanların adını ve maaşını <b>maaşa göre büyükten küçüğe</b> sırala.</p>', sol: 'SELECT first_name, salary FROM employees ORDER BY salary DESC;', ord: true },
    { t: 'sql', q: '<p>En <b>ucuz 3</b> ürünün adını ve fiyatını getir.</p>', sol: 'SELECT name, price FROM products ORDER BY price ASC LIMIT 3;', ord: true },
    { t: 'sql', q: '<p>Ürünleri önce <b>kategoriye göre A\'dan Z\'ye</b>, aynı kategoride <b>fiyata göre pahalıdan ucuza</b> sırala: <code>category</code>, <code>name</code>, <code>price</code>.</p>', sol: 'SELECT category, name, price FROM products ORDER BY category ASC, price DESC;', ord: true },
    { t: 'sql', q: '<p>En son kayıt olan <b>5 müşteriyi</b> getir: <code>first_name</code>, <code>signup_date</code>. (Eşit tarihlerde <code>customer_id</code> büyük olan önce gelsin.)</p>', sol: 'SELECT first_name, signup_date FROM customers ORDER BY signup_date DESC, customer_id DESC LIMIT 5;', ord: true, hint: 'İki sütunla sırala: <code>ORDER BY signup_date DESC, customer_id DESC</code>' }
  ]
},

/* ======================= A2 ======================= */
{
  id: 'aggregate', lv: 'A2', mod: 'Özetleme', min: 12,
  title: 'Toplama fonksiyonları: COUNT, SUM, AVG, MIN, MAX',
  sum: 'Bir tablodan tek bir özet değer üretmek.',
  body: `
<h2>Satırlardan tek değere</h2>
<p>Toplama (aggregate) fonksiyonları çok sayıda satırı alıp <b>tek bir değer</b> üretir.</p>
<table><tr><th>Fonksiyon</th><th>Ne yapar?</th></tr>
<tr><td><code>COUNT(*)</code></td><td>Satır sayısı</td></tr>
<tr><td><code>COUNT(sutun)</code></td><td>O sütunda NULL olmayan değer sayısı</td></tr>
<tr><td><code>COUNT(DISTINCT sutun)</code></td><td>Farklı değer sayısı</td></tr>
<tr><td><code>SUM</code>, <code>AVG</code></td><td>Toplam, ortalama (NULL'ları yok sayar)</td></tr>
<tr><td><code>MIN</code>, <code>MAX</code></td><td>En küçük, en büyük (metin ve tarihte de çalışır)</td></tr>
</table>
<pre class="code">SELECT COUNT(*) AS musteri_sayisi,
       COUNT(email) AS emaili_olan,
       COUNT(DISTINCT city) AS sehir_sayisi
FROM customers;</pre>
<pre class="code">SELECT MIN(price) AS en_ucuz,
       MAX(price) AS en_pahali,
       ROUND(AVG(price), 2) AS ortalama
FROM products;</pre>
<p>WHERE ile birlikte: önce satırlar süzülür, sonra özetlenir.</p>
<pre class="code">SELECT COUNT(*) AS iptal_sayisi
FROM orders
WHERE status = 'cancelled';</pre>
<div class="warn"><b>AVG ve NULL</b>AVG, NULL değerleri paydaya katmaz. NULL'ları 0 saymak istiyorsan <code>AVG(COALESCE(x, 0))</code> kullanmalısın. Bu fark raporlarda büyük sapmalara yol açabilir.</div>
`,
  ex: [
    { t: 'sql', q: '<p>Toplam <b>sipariş sayısını</b> bul.</p>', sol: 'SELECT COUNT(*) FROM orders;' },
    { t: 'sql', q: '<p>Çalışanların <b>ortalama, en düşük ve en yüksek maaşını</b> bu sırayla getir.</p>', sol: 'SELECT AVG(salary), MIN(salary), MAX(salary) FROM employees;' },
    { t: 'sql', q: '<p>Kaç farklı müşterinin <b>en az bir siparişi</b> var? (<code>orders</code> tablosunda farklı <code>customer_id</code> sayısı)</p>', sol: 'SELECT COUNT(DISTINCT customer_id) FROM orders;' },
    { t: 'sql', q: '<p><code>order_items</code> tablosundan toplam <b>ciroyu</b> hesapla. Ciro = <code>quantity * unit_price * (1 - discount)</code>. Sonucu 2 basamağa yuvarla.</p>', sol: 'SELECT ROUND(SUM(quantity * unit_price * (1 - discount)), 2) FROM order_items;', hint: 'SUM içine ifadeyi yaz, dışına ROUND(..., 2) ekle.' }
  ]
},
{
  id: 'group-by', lv: 'A2', mod: 'Özetleme', min: 14,
  title: 'GROUP BY: gruplara göre özet',
  sum: 'Her kategori, şehir veya ay için ayrı özet üretmek.',
  body: `
<h2>Her grup için bir satır</h2>
<p>“Kategori başına kaç ürün var?” sorusu için GROUP BY kullanılır. Aynı değere sahip satırlar bir grup olur ve toplama fonksiyonu her grup için ayrı hesaplanır.</p>
<pre class="code">SELECT category, COUNT(*) AS urun_sayisi
FROM products
GROUP BY category;</pre>
<h2>Altın kural</h2>
<p>SELECT listesindeki her sütun ya <b>GROUP BY'da yer almalı</b> ya da bir <b>toplama fonksiyonunun içinde</b> olmalıdır.</p>
<pre class="code" data-err>-- Hatalı: name gruplanmamış
SELECT category, name, COUNT(*) FROM products GROUP BY category;</pre>
<p>PostgreSQL, SQL Server, MySQL, Oracle ve BigQuery bu sorguyu reddeder; bu uygulamada da o türleri seçince aynı hatayı alırsın. Yalnız SQLite çalıştırır ve rastgele bir <code>name</code> döndürür. Doğru alışkanlık: kuralı her zaman uygula.</p>
<h2>Birden fazla sütunla gruplama</h2>
<pre class="code">SELECT status, channel, COUNT(*) AS adet
FROM orders
GROUP BY status, channel
ORDER BY status, adet DESC;</pre>
<h2>Hesaplanmış ifadelere göre gruplama</h2>
<pre class="code">SELECT substr(order_date, 1, 4) AS yil, COUNT(*) AS siparis
FROM orders
GROUP BY yil
ORDER BY yil;</pre>
<div class="note"><b>Takma adla gruplama</b>SQLite, MySQL ve PostgreSQL GROUP BY içinde SELECT takma adını kabul eder; SQL Server ve 23ai öncesi Oracle etmez, ifadeyi tekrar yazman gerekir.</div>
`,
  ex: [
    { t: 'sql', q: '<p>Her <b>şehirdeki müşteri sayısını</b> bul: <code>city</code>, sayı.</p>', sol: 'SELECT city, COUNT(*) FROM customers GROUP BY city;' },
    { t: 'sql', q: '<p>Her kategori için <b>ortalama ürün fiyatını</b> 2 basamağa yuvarlayarak getir ve ortalamaya göre <b>azalan</b> sırala.</p>', sol: 'SELECT category, ROUND(AVG(price), 2) AS ort FROM products GROUP BY category ORDER BY ort DESC;', ord: true },
    { t: 'sql', q: '<p>Her departmanın (<code>dept_id</code>) <b>çalışan sayısını ve toplam maaşını</b> getir. Departmanı olmayan genel müdür de NULL grubu olarak görünecek, bu normal.</p>', sol: 'SELECT dept_id, COUNT(*), SUM(salary) FROM employees GROUP BY dept_id;' },
    { t: 'sql', q: '<p>Her <b>sipariş durumu</b> ve <b>kanal</b> kombinasyonu için sipariş sayısını getir: <code>status</code>, <code>channel</code>, sayı.</p>', sol: 'SELECT status, channel, COUNT(*) FROM orders GROUP BY status, channel;' }
  ]
},
{
  id: 'having', lv: 'A2', mod: 'Özetleme', min: 10,
  title: 'HAVING: grupları filtrelemek',
  sum: 'WHERE satırları, HAVING grupları süzer.',
  body: `
<h2>WHERE ile HAVING farkı</h2>
<ul>
<li><b>WHERE</b>, gruplamadan <b>önce</b> tek tek satırları süzer. İçinde toplama fonksiyonu kullanılamaz.</li>
<li><b>HAVING</b>, gruplamadan <b>sonra</b> grupları süzer. Toplama fonksiyonlarıyla çalışır.</li>
</ul>
<pre class="code">-- 5'ten fazla ürünü olan kategoriler
SELECT category, COUNT(*) AS urun_sayisi
FROM products
GROUP BY category
HAVING COUNT(*) > 5;</pre>
<p>İkisini birlikte kullanmak çok yaygındır:</p>
<pre class="code">-- Teslim edilmiş siparişlerde, 10'dan fazla siparişi olan müşteriler
SELECT customer_id, COUNT(*) AS siparis
FROM orders
WHERE status = 'delivered'
GROUP BY customer_id
HAVING COUNT(*) > 10
ORDER BY siparis DESC;</pre>
<div class="tip"><b>Performans</b>Satır düzeyinde süzebileceğin her koşulu WHERE'e koy. HAVING'e sadece toplama sonucuna bağlı koşullar kalsın. Böylece veritabanı daha az satırı gruplar.</div>
`,
  ex: [
    { t: 'sql', q: '<p><b>15\'ten fazla müşterisi</b> olan şehirleri ve müşteri sayılarını getir.</p>', sol: 'SELECT city, COUNT(*) FROM customers GROUP BY city HAVING COUNT(*) > 15;' },
    { t: 'sql', q: '<p>Ortalama ürün fiyatı <b>1000 TL\'nin üzerinde</b> olan kategorileri ve ortalamalarını getir.</p>', sol: 'SELECT category, AVG(price) FROM products GROUP BY category HAVING AVG(price) > 1000;' },
    { t: 'sql', q: '<p>Sadece <b>2024</b> yılı siparişlerinde, <b>8 veya daha fazla</b> siparişi olan müşterilerin <code>customer_id</code> ve sipariş sayısını getir.</p>', sol: "SELECT customer_id, COUNT(*) FROM orders WHERE order_date >= '2024-01-01' AND order_date < '2025-01-01' GROUP BY customer_id HAVING COUNT(*) >= 8;", hint: 'Yıl filtresi WHERE\'e, sayı filtresi HAVING\'e.' }
  ]
},
{
  id: 'metin', lv: 'A2', mod: 'Fonksiyonlar', min: 12,
  title: 'Metin fonksiyonları',
  sum: 'UPPER, LOWER, LENGTH, SUBSTR, TRIM, REPLACE, INSTR ve birleştirme.',
  body: `
<h2>En sık kullanılan metin fonksiyonları</h2>
<table><tr><th>Fonksiyon</th><th>Açıklama</th><th>Örnek → Sonuç</th></tr>
<tr><td><code>UPPER(s)</code>, <code>LOWER(s)</code></td><td>Büyük / küçük harf</td><td><code>UPPER('sql')</code> → SQL</td></tr>
<tr><td><code>LENGTH(s)</code></td><td>Karakter sayısı</td><td><code>LENGTH('Ankara')</code> → 6</td></tr>
<tr><td><code>SUBSTR(s, baş, uzunluk)</code></td><td>Parça al (1'den başlar)</td><td><code>SUBSTR('2024-05-17', 1, 4)</code> → 2024</td></tr>
<tr><td><code>TRIM(s)</code>, <code>LTRIM</code>, <code>RTRIM</code></td><td>Baştaki/sondaki boşlukları sil</td><td><code>TRIM('  a ')</code> → a</td></tr>
<tr><td><code>REPLACE(s, eski, yeni)</code></td><td>Değiştir</td><td><code>REPLACE('a-b', '-', '/')</code> → a/b</td></tr>
<tr><td><code>INSTR(s, aranan)</code></td><td>Konum (yoksa 0)</td><td><code>INSTR('ali@x.com', '@')</code> → 4</td></tr>
<tr><td><code>s1 || s2</code></td><td>Birleştirme</td><td><code>'A' || 'B'</code> → AB</td></tr>
</table>
<p>E-posta adresinden alan adını çıkaralım:</p>
<pre class="code">SELECT email,
       SUBSTR(email, INSTR(email, '@') + 1) AS alan_adi
FROM customers
WHERE email IS NOT NULL;</pre>
<p>Baş harfler:</p>
<pre class="code">SELECT first_name, last_name,
       SUBSTR(first_name, 1, 1) || '.' || SUBSTR(last_name, 1, 1) || '.' AS bas_harf
FROM employees;</pre>
<div class="warn"><b>Türkçe karakterler</b>SQLite'ın UPPER/LOWER fonksiyonları sadece ASCII harfleri dönüştürür: <code>LOWER('İZMİR')</code> beklediğin sonucu vermez. PostgreSQL'de doğru <i>collation</i> ile Türkçe düzgün çalışır. Gerçek projelerde bu farkı test et.</div>
<div class="note"><b>Lehçe farkı</b>SQL Server'da birleştirme <code>+</code> veya <code>CONCAT()</code>, uzunluk <code>LEN()</code>, parça <code>SUBSTRING()</code>; MySQL'de <code>CONCAT()</code> kullanılır.</div>
`,
  ex: [
    { t: 'sql', q: '<p>Ürün adlarını <b>büyük harfle</b> ve ad uzunluklarını getir: <code>UPPER(name)</code>, <code>LENGTH(name)</code>.</p>', sol: 'SELECT UPPER(name), LENGTH(name) FROM products;' },
    { t: 'sql', q: '<p>Müşterilerin e-posta <b>alan adına göre</b> (<code>@</code> işaretinden sonrası) kaç müşteri olduğunu say. E-postası NULL olanları hariç tut.</p>', sol: "SELECT SUBSTR(email, INSTR(email, '@') + 1) AS alan, COUNT(*) FROM customers WHERE email IS NOT NULL GROUP BY alan;", hint: "<code>SUBSTR(email, INSTR(email, '@') + 1)</code> ile alan adını çıkar, ona göre grupla." },
    { t: 'sql', q: '<p>Çalışanların <code>"Soyad, Ad"</code> biçiminde tam adını (ör. <code>Yılmaz, Ahmet</code>) <code>tam_ad</code> olarak getir.</p>', sol: "SELECT last_name || ', ' || first_name AS tam_ad FROM employees;" }
  ]
},
{
  id: 'sayi-tip', lv: 'A2', mod: 'Fonksiyonlar', min: 12,
  title: 'Sayılar, veri tipleri ve CAST',
  sum: 'ROUND, ABS, tam sayı bölmesi tuzağı ve tip dönüşümü.',
  body: `
<h2>Sayısal fonksiyonlar</h2>
<table><tr><th>Fonksiyon</th><th>Açıklama</th></tr>
<tr><td><code>ROUND(x, n)</code></td><td>n basamağa yuvarla</td></tr>
<tr><td><code>ABS(x)</code></td><td>Mutlak değer</td></tr>
<tr><td><code>CEIL(x)</code>, <code>FLOOR(x)</code></td><td>Yukarı / aşağı yuvarla</td></tr>
<tr><td><code>x % y</code></td><td>Mod (kalan)</td></tr>
<tr><td><code>POWER(x, y)</code>, <code>SQRT(x)</code></td><td>Üs, karekök</td></tr>
</table>
<h2>Tam sayı bölmesi tuzağı</h2>
<p>İki tam sayıyı böldüğünde birçok veritabanı (SQLite, PostgreSQL, SQL Server) <b>tam sayı sonucu</b> verir:</p>
<pre class="code">SELECT 7 / 2 AS tam_bolme, 7 / 2.0 AS ondalikli, CAST(7 AS REAL) / 2 AS cast_ile;</pre>
<p>Oran hesaplarken (dönüşüm oranı gibi) bu hata çok yaygındır. Çözüm: paydaya veya paya <code>1.0 *</code> ekle ya da <code>CAST</code> kullan.</p>
<h2>Veri tipleri</h2>
<table><tr><th>Genel tip</th><th>Örnekler</th></tr>
<tr><td>Tam sayı</td><td><code>INTEGER</code>, <code>BIGINT</code>, <code>SMALLINT</code></td></tr>
<tr><td>Ondalık</td><td><code>DECIMAL(10,2)</code> / <code>NUMERIC</code> (para için), <code>REAL</code> / <code>FLOAT</code> (yaklaşık)</td></tr>
<tr><td>Metin</td><td><code>VARCHAR(n)</code>, <code>TEXT</code>, <code>CHAR(n)</code></td></tr>
<tr><td>Tarih/saat</td><td><code>DATE</code>, <code>TIMESTAMP</code>, <code>INTERVAL</code></td></tr>
<tr><td>Mantıksal</td><td><code>BOOLEAN</code></td></tr>
</table>
<div class="note"><b>SQLite'ın esnek tipleri</b>SQLite'ta yalnızca 5 depolama sınıfı vardır: NULL, INTEGER, REAL, TEXT, BLOB. Tarihler TEXT olarak saklanır. Diğer veritabanları tiplerde çok daha katıdır.</div>
<h2>CAST ile dönüşüm</h2>
<pre class="code">SELECT CAST('2024' AS INTEGER) + 1 AS sonraki_yil,
       CAST(price AS INTEGER) AS tam_fiyat,
       CAST(stock AS TEXT) || ' adet' AS stok_metni
FROM products
LIMIT 3;</pre>
`,
  ex: [
    { t: 'sql', q: '<p>Her ürün için <b>kâr marjı yüzdesini</b> hesapla: <code>(price - cost) / price * 100</code>, 1 basamağa yuvarla. Sütunlar: <code>name</code>, <code>marj</code>.</p>', sol: 'SELECT name, ROUND((price - cost) / price * 100, 1) AS marj FROM products;' },
    { t: 'sql', q: '<p>Siparişlerin yüzde kaçı iptal edilmiş? Tek bir sayı döndür, 2 basamağa yuvarla. İpucu: iptal sayısı / toplam sipariş × 100.</p>', sol: "SELECT ROUND(100.0 * (SELECT COUNT(*) FROM orders WHERE status = 'cancelled') / COUNT(*), 2) FROM orders;", hint: "Paya <code>100.0 *</code> ekleyerek tam sayı bölmesinden kurtul. Örneğin: <code>SELECT ROUND(100.0 * SUM(status = 'cancelled') / COUNT(*), 2) FROM orders;</code> SQLite'ta koşul 1/0 döner." },
    { t: 'mc', q: '<p>PostgreSQL\'de <code>SELECT 5 / 2</code> ne döndürür?</p>', o: ['2.5', '2', '3', 'Hata'], a: 1, why: 'İki tam sayının bölümü tam sayıdır; ondalık kısım atılır.' }
  ]
},
{
  id: 'tarih-fn', lv: 'A2', mod: 'Fonksiyonlar', min: 15,
  title: 'Tarih ve saat fonksiyonları',
  sum: 'Yıl/ay çıkarmak, tarih farkı, tarih aritmetiği ve lehçe farkları.',
  body: `
<h2>Analistin en çok kullandığı fonksiyonlar</h2>
<p>Satış trendleri, kohortlar, büyüme oranları… hepsi tarihle başlar. Tarih fonksiyonları veritabanları arasında <b>en çok fark gösteren</b> alandır, bu yüzden önce SQLite'ı öğrenip sonra karşılıklarını göreceğiz.</p>
<h3>strftime ile parça çıkarmak (SQLite)</h3>
<table><tr><th>Biçim</th><th>Anlamı</th></tr>
<tr><td><code>%Y</code></td><td>Yıl (2024)</td></tr><tr><td><code>%m</code></td><td>Ay (01–12)</td></tr><tr><td><code>%d</code></td><td>Gün</td></tr>
<tr><td><code>%w</code></td><td>Haftanın günü (0 = Pazar)</td></tr><tr><td><code>%W</code></td><td>Yılın haftası</td></tr><tr><td><code>%H</code></td><td>Saat</td></tr>
</table>
<pre class="code">SELECT strftime('%Y-%m', order_date) AS ay,
       COUNT(*) AS siparis
FROM orders
GROUP BY ay
ORDER BY ay;</pre>
<h3>Tarih aritmetiği</h3>
<pre class="code">SELECT date('2024-01-31', '+1 month')  AS bir_ay_sonra,
       date('2024-03-15', 'start of month') AS ay_basi,
       date('2024-03-15', '-7 days') AS bir_hafta_once,
       julianday('2024-12-31') - julianday('2024-01-01') AS gun_farki;</pre>
<p>Müşterinin kayıt olduktan kaç gün sonra ilk siparişini verdiğini hesaplarken <code>julianday</code> farkı kullanılır.</p>
<h3>Lehçe karşılıkları</h3>
<table><tr><th>İşlem</th><th>PostgreSQL</th><th>MySQL</th><th>SQL Server</th></tr>
<tr><td>Yıl</td><td><code>EXTRACT(YEAR FROM d)</code></td><td><code>YEAR(d)</code></td><td><code>YEAR(d)</code></td></tr>
<tr><td>Ay başına yuvarla</td><td><code>DATE_TRUNC('month', d)</code></td><td><code>DATE_FORMAT(d,'%Y-%m-01')</code></td><td><code>DATETRUNC(month, d)</code></td></tr>
<tr><td>Gün farkı</td><td><code>d2 - d1</code></td><td><code>DATEDIFF(d2, d1)</code></td><td><code>DATEDIFF(day, d1, d2)</code></td></tr>
<tr><td>Bugün</td><td><code>CURRENT_DATE</code></td><td><code>CURDATE()</code></td><td><code>GETDATE()</code></td></tr>
</table>
`,
  ex: [
    { t: 'sql', q: '<p>Her <b>yıl</b> için sipariş sayısını getir: <code>yil</code>, sayı. Yıla göre sırala.</p>', sol: "SELECT strftime('%Y', order_date) AS yil, COUNT(*) FROM orders GROUP BY yil ORDER BY yil;", ord: true },
    { t: 'sql', q: '<p>2024 yılında, <b>haftanın hangi gününde</b> kaç sipariş verilmiş? <code>strftime(\'%w\', order_date)</code> değeri ve sayıyı getir, güne göre sırala.</p>', sol: "SELECT strftime('%w', order_date) AS gun, COUNT(*) FROM orders WHERE strftime('%Y', order_date) = '2024' GROUP BY gun ORDER BY gun;", ord: true },
    { t: 'sql', q: '<p>Her çalışanın işe girdiği tarihten <code>2025-01-01</code> tarihine kadar geçen <b>gün sayısını</b> (tam sayı) hesapla: <code>first_name</code>, <code>gun</code>. En kıdemliden başlayarak sırala.</p>', sol: "SELECT first_name, CAST(julianday('2025-01-01') - julianday(hire_date) AS INTEGER) AS gun FROM employees ORDER BY gun DESC;", ord: true, hint: "<code>julianday('2025-01-01') - julianday(hire_date)</code> ve CAST ... AS INTEGER" }
  ]
},
{
  id: 'case', lv: 'A2', mod: 'Fonksiyonlar', min: 14,
  title: 'CASE WHEN: SQL\'de eğer-ise',
  sum: 'Koşullu sütunlar, segmentleme ve koşullu sayma.',
  body: `
<h2>Koşula göre değer üretmek</h2>
<p>CASE, programlamadaki if/else'in SQL karşılığıdır. İlk doğru koşulun değerini döndürür.</p>
<pre class="code">SELECT name, price,
       CASE
         WHEN price < 300 THEN 'Ekonomik'
         WHEN price < 1500 THEN 'Orta'
         ELSE 'Premium'
       END AS fiyat_sinifi
FROM products;</pre>
<ul>
<li>Koşullar <b>sırayla</b> denenir; ilk doğru olan kazanır. Bu yüzden 1500 koşulunda “300'den büyük” demene gerek yok.</li>
<li>ELSE yazmazsan, hiçbir koşul tutmadığında sonuç NULL olur.</li>
</ul>
<h2>Gruplamada CASE</h2>
<pre class="code">SELECT CASE WHEN price < 300 THEN 'Ekonomik'
            WHEN price < 1500 THEN 'Orta'
            ELSE 'Premium' END AS sinif,
       COUNT(*) AS urun_sayisi
FROM products
GROUP BY sinif;</pre>
<h2>Koşullu toplama: analistin süper gücü</h2>
<p>Tek sorguda birden fazla sayımı yan yana koymak için CASE'i toplama fonksiyonunun içine koyarsın:</p>
<pre class="code">SELECT channel,
       COUNT(*) AS toplam,
       SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) AS teslim,
       SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS iptal
FROM orders
GROUP BY channel;</pre>
<div class="note"><b>FILTER sözdizimi</b>PostgreSQL ve SQLite standarttaki <code>COUNT(*) FILTER (WHERE status = 'cancelled')</code> yazımını da destekler.</div>
`,
  ex: [
    { t: 'sql', q: '<p>Çalışanları maaşa göre sınıflandır: <b>45000 altı</b> "Junior", <b>45000–79999</b> "Mid", <b>80000 ve üzeri</b> "Senior". Sütunlar: <code>first_name</code>, <code>salary</code>, <code>seviye</code>.</p>', sol: "SELECT first_name, salary, CASE WHEN salary < 45000 THEN 'Junior' WHEN salary < 80000 THEN 'Mid' ELSE 'Senior' END AS seviye FROM employees;" },
    { t: 'sql', q: '<p>Müşterileri doğum yılına göre gruplayıp say: <b>1980 öncesi</b> "X ve öncesi", <b>1980–1996</b> "Y", <b>1997 ve sonrası</b> "Z". Sütunlar: <code>kusak</code>, sayı.</p>', sol: "SELECT CASE WHEN birth_year < 1980 THEN 'X ve öncesi' WHEN birth_year <= 1996 THEN 'Y' ELSE 'Z' END AS kusak, COUNT(*) FROM customers GROUP BY kusak;" },
    { t: 'sql', q: '<p>Her yıl için toplam sipariş ve <b>iade edilen</b> (<code>returned</code>) sipariş sayısını yan yana getir: <code>yil</code>, <code>toplam</code>, <code>iade</code>.</p>', sol: "SELECT strftime('%Y', order_date) AS yil, COUNT(*) AS toplam, SUM(CASE WHEN status = 'returned' THEN 1 ELSE 0 END) AS iade FROM orders GROUP BY yil;", hint: "<code>SUM(CASE WHEN status = 'returned' THEN 1 ELSE 0 END)</code>" }
  ]
},
{
  id: 'coalesce', lv: 'A2', mod: 'Fonksiyonlar', min: 8,
  title: 'COALESCE, NULLIF ve NULL ile hesap',
  sum: 'NULL yerine varsayılan değer koymak ve sıfıra bölmeyi önlemek.',
  body: `
<h2>COALESCE: ilk NULL olmayan</h2>
<p><code>COALESCE(a, b, c)</code> soldan sağa bakar ve NULL olmayan ilk değeri döndürür.</p>
<pre class="code">SELECT first_name,
       COALESCE(city, 'Bilinmiyor') AS sehir,
       COALESCE(email, 'e-posta yok') AS eposta
FROM customers
LIMIT 15;</pre>
<p>SQLite/MySQL'de <code>IFNULL(a, b)</code>, SQL Server'da <code>ISNULL(a, b)</code>, Oracle'da <code>NVL(a, b)</code> iki argümanlı karşılıklarıdır. COALESCE standarttır, her yerde çalışır.</p>
<h2>NULLIF: eşitse NULL yap</h2>
<p><code>NULLIF(a, b)</code>, a = b ise NULL, değilse a döndürür. En yaygın kullanımı <b>sıfıra bölmeyi önlemek</b>tir:</p>
<pre class="code">SELECT name, stock,
       ROUND(price / NULLIF(stock, 0), 2) AS stok_basina_fiyat
FROM products
ORDER BY stock
LIMIT 5;</pre>
<p>Stok 0 olduğunda bölme hata vermek (veya sonsuz) yerine NULL üretir.</p>
`,
  ex: [
    { t: 'sql', q: '<p>Müşterileri <b>şehre göre</b> say; şehri NULL olanlar <code>\'Bilinmiyor\'</code> grubunda görünsün. Sütunlar: <code>sehir</code>, sayı.</p>', sol: "SELECT COALESCE(city, 'Bilinmiyor') AS sehir, COUNT(*) FROM customers GROUP BY sehir;" },
    { t: 'sql', q: '<p>Çalışanların <code>first_name</code> ve e-postasını getir; e-postası olmayanlarda <code>\'-\'</code> yazsın.</p>', sol: "SELECT first_name, COALESCE(email, '-') FROM employees;" }
  ]
},
{
  id: 'sorgu-sirasi', lv: 'A2', mod: 'Özetleme', min: 8,
  title: 'Bir sorgu hangi sırayla çalışır?',
  sum: 'Yazım sırası ile mantıksal çalışma sırası neden farklı?',
  body: `
<h2>Yazdığın sıra ≠ çalışan sıra</h2>
<p>Sorguyu SELECT ile başlayarak yazarız ama veritabanı onu mantıksal olarak şu sırayla işler:</p>
<ol>
<li><b>FROM</b> (ve JOIN'ler): Hangi tablolar?</li>
<li><b>WHERE</b>: Satırları süz.</li>
<li><b>GROUP BY</b>: Grupla.</li>
<li><b>HAVING</b>: Grupları süz.</li>
<li><b>SELECT</b>: Sütunları ve ifadeleri hesapla (pencere fonksiyonları burada).</li>
<li><b>DISTINCT</b>: Tekrarları at.</li>
<li><b>ORDER BY</b>: Sırala.</li>
<li><b>LIMIT / OFFSET</b>: Kes.</li>
</ol>
<h2>Bu neden önemli?</h2>
<ul>
<li>WHERE, SELECT'ten önce çalıştığı için standart SQL'de <b>WHERE içinde SELECT takma adını kullanamazsın</b>.</li>
<li>ORDER BY, SELECT'ten sonra çalıştığı için takma adı kullanabilirsin.</li>
<li>WHERE, GROUP BY'dan önce çalıştığı için içinde COUNT/SUM kullanamazsın; bu yüzden HAVING vardır.</li>
</ul>
<pre class="code">SELECT category, AVG(price) AS ort
FROM products
WHERE price > 100          -- 2. adım
GROUP BY category          -- 3. adım
HAVING AVG(price) > 500    -- 4. adım
ORDER BY ort DESC          -- 7. adım: takma ad burada geçerli
LIMIT 3;                   -- 8. adım</pre>
`,
  ex: [
    { t: 'mc', q: '<p>Aşağıdakilerden hangisi mantıksal çalışma sırasına göre <b>en önce</b> işlenir?</p>', o: ['SELECT', 'WHERE', 'HAVING', 'ORDER BY'], a: 1 },
    { t: 'mc', q: '<p><code>WHERE COUNT(*) > 5</code> neden hata verir?</p>', o: ['COUNT büyük harfle yazılmalı', 'WHERE, gruplamadan önce çalıştığı için toplama sonucu henüz yoktur', 'WHERE sadece metinlerle çalışır', 'COUNT(*) yerine COUNT(1) yazılmalı'], a: 1, why: 'Toplama sonuçlarına göre filtrelemek için HAVING kullanılır.' },
    { t: 'mc', q: '<p>Standart SQL\'de SELECT\'te tanımlanan takma ad hangi kısımda <b>güvenle</b> kullanılabilir?</p>', o: ['WHERE', 'GROUP BY', 'ORDER BY', 'FROM'], a: 2, why: 'ORDER BY, SELECT\'ten sonra işlenir. (Bazı veritabanları GROUP BY\'da da kabul eder ama bu standart değildir.)' }
  ]
}
);
