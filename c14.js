/* Kesit SQL içerik 14: değerlendirme sonrası eklemeler
   - INSERT / UPDATE / DELETE temel seviyeye taşındı
   - yeni dersler: metin birleştirme, NULL güvenli karşılaştırma, LIKE'ta özel karakter, LATERAL, temel bitirme projesi
   - alıştırması az olan derslere yeni sorgu alıştırmaları
   - alıştırma bankasına tarih, pivot ve pencere soruları */
(function () {
const L = window.SQLP_LESSONS;
const LM = id => L.find(l => l.id === id);
const after = (id, lessons) => { const i = L.findIndex(l => l.id === id); L.splice(i < 0 ? L.length : i + 1, 0, ...lessons); };
const mc = (q, o, a, why) => ({ t: 'mc', q, o, a, why });
const sq = (q, sol, o) => Object.assign({ t: 'sql', q: '<p>' + q + '</p>', sol }, o || {});
const NET = 'oi.quantity * oi.unit_price * (1 - oi.discount)';
const add = (id, ...ex) => { const l = LM(id); if (l) l.ex.push(...ex); };

/* ======================= Veri değiştirme temel seviyeye ======================= */
const dml = LM('dml');
if (dml) {
  L.splice(L.indexOf(dml), 1);
  dml.lv = 'A2';
  dml.sum = 'Tabloya satır eklemek, satırları güncellemek ve silmek; WHERE\'siz UPDATE felaketinden korunmak.';
  after('kosullu', [dml]);
  dml.ex.push(sq('Tek bir INSERT ifadesiyle iki yeni departman ekle: <b>8, \'Kalite\', \'Bursa\'</b> ve <b>9, \'Satın Alma\', \'Ankara\'</b>.',
    "INSERT INTO departments (dept_id, name, city) VALUES (8, 'Kalite', 'Bursa'), (9, 'Satın Alma', 'Ankara');",
    { check: 'SELECT dept_id, name, city FROM departments ORDER BY dept_id', hint: 'VALUES sonrasına parantez içindeki satırları virgülle ayırarak yaz.', why: 'Çok satırlı VALUES tüm programlarda çalışır (Oracle 23ai öncesinde INSERT ALL gerekir).' }));
}

/* ======================= Yeni dersler ======================= */
after('in-between-like', [{
  id: 'like-escape', lv: 'A1', mod: 'Temeller', min: 8,
  title: 'LIKE ile alt çizgi ve yüzde işaretini aramak: ESCAPE',
  sum: '_ ve % joker karakterdir; metnin içinde gerçekten geçen _ veya % işaretini aramak için kaçış karakteri kullanılır.',
  body: `
<h2>Joker karakterler hatırlatma</h2>
<table>
<tr><th>Desen</th><th>Anlamı</th><th>Eşleşir</th></tr>
<tr><td><code>'e%'</code></td><td>e ile başlayan her şey</td><td>egitim, elektronik, e_ticaret</td></tr>
<tr><td><code>'e_%'</code></td><td>e, ardından <b>herhangi bir</b> karakter, sonra her şey</td><td>yine egitim, elektronik, e_ticaret</td></tr>
<tr><td><code>'%_%'</code></td><td>en az bir karakter</td><td>boş olmayan her değer</td></tr>
</table>
<p>Yani <code>_</code> yazınca motor “alt çizgi karakteri” değil “tek bir karakter” anlar. <code>bank_txns.merchant_category</code> sütununda gerçekten alt çizgi içeren tek değer <code>e_ticaret</code>'tir; ama <code>LIKE 'e_%'</code> üç kategoriyi birden getirir.</p>
<pre class="code">SELECT DISTINCT merchant_category
FROM bank_txns
WHERE merchant_category LIKE 'e_%'
ORDER BY merchant_category;</pre>
<h2>ESCAPE: “bu karakteri harfiyen al”</h2>
<p>Desende joker karakterin önüne bir <b>kaçış karakteri</b> koyup bu karakteri <code>ESCAPE</code> ile bildirirsin. Kaçış karakteri olarak metinde geçmeyen bir işaret seç; <code>!</code> yaygın bir seçimdir.</p>
<pre class="code">SELECT DISTINCT merchant_category
FROM bank_txns
WHERE merchant_category LIKE 'e!_%' ESCAPE '!'
ORDER BY merchant_category;</pre>
<p>Artık yalnızca <code>e_ticaret</code> gelir. Aynı yöntem yüzde işareti için de geçerlidir: <code>LIKE '%!%%' ESCAPE '!'</code> içinde “%” geçen değerleri bulur (örneğin “%20 indirim”).</p>
<table>
<tr><th>Program</th><th>Not</th></tr>
<tr><td>Tüm programlar</td><td><code>LIKE '...' ESCAPE '!'</code> standarttır ve her yerde çalışır.</td></tr>
<tr><td>SQL Server</td><td>Ayrıca köşeli parantezle de kaçırılabilir: <code>LIKE 'e[_]%'</code>. Köşeli parantez SQL Server'a özgüdür.</td></tr>
<tr><td>MySQL, PostgreSQL</td><td>ESCAPE yazmazsan varsayılan kaçış karakteri ters bölüdür: <code>LIKE 'e\\_%'</code>. Taşınabilirlik için ESCAPE'i açıkça yazmak daha güvenlidir.</td></tr>
<tr><td>Oracle, BigQuery</td><td>Varsayılan kaçış karakteri yoktur; ESCAPE yazmak gerekir (BigQuery'de ters bölü desteklenir).</td></tr>
</table>
<div class="tip"><b>Kullanıcı girdisi</b>Uygulamada kullanıcının yazdığı arama metnini LIKE desenine koyarken içindeki <code>_</code> ve <code>%</code> karakterlerini kaçırmazsan “a_b” araması “axb”yi de bulur. Parametreli sorgu SQL injection'ı önler ama joker karakterleri kaçırmaz; bunu ayrıca yapman gerekir.</div>
`,
  ex: [
    mc('<p><code>WHERE code LIKE \'A_1\'</code> koşulu aşağıdakilerden hangisini <b>eşleştirmez</b>?</p>', ['<code>A_1</code>', '<code>AB1</code>', '<code>A11</code>', '<code>A__1</code>'], 3, '_ tam olarak bir karakterle eşleşir. A__1 değerinde A ile 1 arasında iki karakter var, bu yüzden eşleşmez; diğer üçünde tek karakter var.'),
    sq('<code>web_events</code> tablosunda olay türü (<code>event_type</code>) adında gerçekten <b>alt çizgi</b> geçen olay türlerini ve her birinin kaç kez geçtiğini getir: <code>event_type</code>, <code>adet</code>.',
      "SELECT event_type, COUNT(*) AS adet FROM web_events WHERE event_type LIKE '%!_%' ESCAPE '!' GROUP BY event_type;",
      { hint: "'%_%' her değeri eşleştirir. Alt çizginin önüne kaçış karakteri koy: '%!_%' ESCAPE '!'", why: 'Yalnızca add_to_cart alt çizgi içeriyor; kaçış karakteri olmadan tüm olay türleri gelirdi.' }),
    sq('<code>bank_txns</code> tablosunda kategori adı <b>e_</b> ile başlayan (alt çizgi harfiyen) işlemleri kategoriye göre say: <code>merchant_category</code>, <code>islem</code>.',
      "SELECT merchant_category, COUNT(*) AS islem FROM bank_txns WHERE merchant_category LIKE 'e!_%' ESCAPE '!' GROUP BY merchant_category;",
      { hint: "Desen: 'e!_%' ve ESCAPE '!'", why: 'Kaçış karakteri olmadan egitim ve elektronik kategorileri de sonuca karışırdı.' }),
    sq('<code>bank_txns</code> tablosunda işlem türü (<code>txn_type</code>) <b>havale_</b> ile başlayan işlem türlerini ve işlem sayılarını getir: <code>txn_type</code>, <code>islem</code>. İşlem türüne göre sırala.',
      "SELECT txn_type, COUNT(*) AS islem FROM bank_txns WHERE txn_type LIKE 'havale!_%' ESCAPE '!' GROUP BY txn_type ORDER BY txn_type;",
      { ord: true, hint: "Desen: 'havale!_%' ESCAPE '!'" })
  ]
}]);

after('coalesce', [{
  id: 'null-guvenli', lv: 'A2', mod: 'Fonksiyonlar', min: 10,
  title: 'NULL güvenli karşılaştırma: IS DISTINCT FROM ve eşdeğerleri',
  sum: '“Eşit değil” koşulu NULL satırları neden kaçırır; iki değeri NULL dahil doğru karşılaştırmanın yolları.',
  body: `
<h2>Sorun: <code>&lt;&gt;</code> NULL'ı görmez</h2>
<p><code>raw_signups</code> tablosunda şehri “İstanbul” <b>olmayan</b> kayıtları saymak istiyorsun:</p>
<pre class="code">SELECT COUNT(*) AS adet
FROM raw_signups
WHERE city <> 'İstanbul';</pre>
<p>Şehri NULL olan iki kayıt bu sayıya girmez. Çünkü <code>NULL &lt;&gt; 'İstanbul'</code> sonucu <b>doğru</b> değil <b>bilinmiyor</b>dur ve WHERE yalnızca doğru olan satırları geçirir. İş kuralı “İstanbul dışındaki herkes” ise NULL satırlar da sayılmalıdır.</p>
<h2>Taşınabilir çözüm</h2>
<pre class="code">SELECT COUNT(*) AS adet
FROM raw_signups
WHERE city <> 'İstanbul' OR city IS NULL;</pre>
<p>Her programda çalışır. İki <b>sütunu</b> karşılaştırırken (örneğin eski ve yeni değer) yazım uzar:</p>
<pre class="code" data-norun>WHERE (a <> b) OR (a IS NULL AND b IS NOT NULL) OR (a IS NOT NULL AND b IS NULL)</pre>
<h2>IS DISTINCT FROM</h2>
<p>SQL standardı bu karşılaştırma için ayrı bir operatör tanımlar. <code>a IS DISTINCT FROM b</code>, NULL'ı sıradan bir değer gibi ele alır:</p>
<table>
<tr><th>a</th><th>b</th><th><code>a &lt;&gt; b</code></th><th><code>a IS DISTINCT FROM b</code></th></tr>
<tr><td>1</td><td>2</td><td>doğru</td><td>doğru</td></tr>
<tr><td>1</td><td>1</td><td>yanlış</td><td>yanlış</td></tr>
<tr><td>1</td><td>NULL</td><td><b>bilinmiyor</b></td><td>doğru</td></tr>
<tr><td>NULL</td><td>NULL</td><td><b>bilinmiyor</b></td><td>yanlış</td></tr>
</table>
<p>Tersi <code>IS NOT DISTINCT FROM</code>'dur: iki NULL'ı da “eşit” sayar.</p>
<table>
<tr><th>Program</th><th>“Farklı mı?” (NULL dahil)</th><th>“Aynı mı?” (NULL dahil)</th></tr>
<tr><td>PostgreSQL, BigQuery, SQL Server 2022+</td><td><code>a IS DISTINCT FROM b</code></td><td><code>a IS NOT DISTINCT FROM b</code></td></tr>
<tr><td>MySQL</td><td><code>NOT (a &lt;=&gt; b)</code></td><td><code>a &lt;=&gt; b</code> (NULL güvenli eşitlik)</td></tr>
<tr><td>Oracle</td><td><code>DECODE(a, b, 0, 1) = 1</code> (DECODE iki NULL'ı eşit sayar)</td><td><code>DECODE(a, b, 1, 0) = 1</code></td></tr>
<tr><td>SQLite</td><td><code>a IS NOT b</code></td><td><code>a IS b</code></td></tr>
</table>
<div class="tip"><b>Nerede işe yarar?</b>Veri mühendisliğinde “hangi satırlar değişti?” sorusu: kaynak ve hedefteki değerleri karşılaştırırken eski değer NULL, yeni değer dolu ise satır değişmiş sayılmalıdır. <code>&lt;&gt;</code> bu değişikliği kaçırır.</div>
`,
  ex: [
    mc('<p><code>SELECT COUNT(*) FROM t WHERE x &lt;&gt; 5</code> sorgusunda <code>x</code> değeri NULL olan satırlar ne olur?</p>', ['Sayılır, çünkü NULL 5 değildir', 'Sayılmaz, çünkü karşılaştırmanın sonucu “bilinmiyor”dur', 'Sorgu hata verir', 'Yalnızca SQL Server\'da sayılır'], 1, 'NULL ile yapılan her karşılaştırmanın sonucu “bilinmiyor”dur; WHERE yalnızca “doğru” olan satırları geçirir.'),
    sq('<code>raw_signups</code> tablosunda şehri tam olarak <b>\'İstanbul\'</b> olmayan kayıtların sayısını, şehri NULL olanlar <b>dahil</b> olacak şekilde getir. Tek değer: <code>adet</code>.',
      "SELECT COUNT(*) AS adet FROM raw_signups WHERE city <> 'İstanbul' OR city IS NULL;",
      { hint: '<> tek başına NULL satırları kaçırır; OR city IS NULL ekle ya da programın NULL güvenli karşılaştırmasını kullan.', why: 'Sonuca şehri boş ve NULL olan kayıtlar da girdi.' }),
    sq('Departmanı <b>1 olmayan</b> çalışanları getir; departmanı hiç olmayan (NULL) çalışan da listede olsun: <code>emp_id</code>, <code>first_name</code>, <code>dept_id</code>.',
      'SELECT emp_id, first_name, dept_id FROM employees WHERE dept_id IS DISTINCT FROM 1;',
      { solv: { mysql: 'SELECT emp_id, first_name, dept_id FROM employees WHERE NOT (dept_id <=> 1);', oracle: 'SELECT emp_id, first_name, dept_id FROM employees WHERE DECODE(dept_id, 1, 0, 1) = 1;' }, hint: 'IS DISTINCT FROM 1 (MySQL: NOT (dept_id <=> 1), Oracle: DECODE) ya da dept_id <> 1 OR dept_id IS NULL.', why: 'Genel Müdür\'ün departmanı NULL olduğu için <> 1 onu kaçırırdı.' }),
    sq('<code>price_updates</code> tablosundaki her güncellemeyi ürünün mevcut fiyatıyla karşılaştır ve fiyatı <b>gerçekten değiştiren</b> güncellemeleri say. Tek değer: <code>degisen</code>.',
      'SELECT COUNT(*) AS degisen FROM price_updates u JOIN products p ON p.product_id = u.product_id WHERE u.new_price IS DISTINCT FROM p.price;',
      { solv: { mysql: 'SELECT COUNT(*) AS degisen FROM price_updates u JOIN products p ON p.product_id = u.product_id WHERE NOT (u.new_price <=> p.price);', oracle: 'SELECT COUNT(*) AS degisen FROM price_updates u JOIN products p ON p.product_id = u.product_id WHERE DECODE(u.new_price, p.price, 0, 1) = 1;' }, hint: 'Sütunlar NULL olmasa da “değişti mi?” sorusunu NULL güvenli yazmak iyi bir alışkanlıktır.' })
  ]
}]);

after('having', [{
  id: 'metin-birlestir', lv: 'A2', mod: 'Özetleme', min: 12,
  title: 'Satırları tek metinde toplamak: STRING_AGG, LISTAGG, GROUP_CONCAT',
  sum: 'Bir gruptaki değerleri virgülle ayrılmış tek bir metinde birleştirmek; sıralama, tekrarsızlık ve uzunluk sınırları.',
  body: `
<h2>Ne işe yarar?</h2>
<p>“Her departmanın çalışanlarını tek satırda listele” gibi raporlarda, gruptaki değerleri bir metinde birleştiren toplama fonksiyonu kullanılır. COUNT veya SUM gibi çalışır; yalnızca sonuç sayı değil metindir.</p>
<table>
<tr><th>Program</th><th>Fonksiyon</th><th>Sıralı yazım</th></tr>
<tr><td>SQL Server 2017+</td><td><code>STRING_AGG(ad, ', ')</code></td><td><code>STRING_AGG(ad, ', ') WITHIN GROUP (ORDER BY ad)</code></td></tr>
<tr><td>PostgreSQL, BigQuery</td><td><code>STRING_AGG(ad, ', ')</code></td><td><code>STRING_AGG(ad, ', ' ORDER BY ad)</code></td></tr>
<tr><td>MySQL</td><td><code>GROUP_CONCAT(ad SEPARATOR ', ')</code></td><td><code>GROUP_CONCAT(ad ORDER BY ad SEPARATOR ', ')</code></td></tr>
<tr><td>Oracle</td><td><code>LISTAGG(ad, ', ')</code></td><td><code>LISTAGG(ad, ', ') WITHIN GROUP (ORDER BY ad)</code></td></tr>
<tr><td>SQLite</td><td><code>GROUP_CONCAT(ad, ', ')</code></td><td><code>GROUP_CONCAT(ad, ', ' ORDER BY ad)</code> (3.44+)</td></tr>
</table>
<h2>Temel kullanım</h2>
${CODE("SELECT d.name AS departman, GROUP_CONCAT(e.first_name, ', ' ORDER BY e.hire_date) AS calisanlar\nFROM departments d\nJOIN employees e ON e.dept_id = d.dept_id\nGROUP BY d.name;", {
  tsql: "SELECT d.name AS departman, STRING_AGG(e.first_name, ', ') WITHIN GROUP (ORDER BY e.hire_date) AS calisanlar\nFROM departments d\nJOIN employees e ON e.dept_id = d.dept_id\nGROUP BY d.name;",
  pg: "SELECT d.name AS departman, STRING_AGG(e.first_name, ', ' ORDER BY e.hire_date) AS calisanlar\nFROM departments d\nJOIN employees e ON e.dept_id = d.dept_id\nGROUP BY d.name;",
  mysql: "SELECT d.name AS departman, GROUP_CONCAT(e.first_name ORDER BY e.hire_date SEPARATOR ', ') AS calisanlar\nFROM departments d\nJOIN employees e ON e.dept_id = d.dept_id\nGROUP BY d.name;",
  oracle: "SELECT d.name AS departman, LISTAGG(e.first_name, ', ') WITHIN GROUP (ORDER BY e.hire_date) AS calisanlar\nFROM departments d\nJOIN employees e ON e.dept_id = d.dept_id\nGROUP BY d.name;",
  bq: "SELECT d.name AS departman, STRING_AGG(e.first_name, ', ' ORDER BY e.hire_date) AS calisanlar\nFROM departments d\nJOIN employees e ON e.dept_id = d.dept_id\nGROUP BY d.name;"
})}
<div class="warn"><b>Sırayı belirt</b>ORDER BY yazmazsan birleştirme sırası garanti değildir; aynı sorgu farklı günlerde farklı sırayla dönebilir. Raporda sıra önemliyse her zaman sıralı yazımı kullan.</div>
<h2>NULL ve tekrarlar</h2>
<ul>
<li>NULL değerler atlanır; ayraç da eklenmez.</li>
<li>Tekrarsız liste için PostgreSQL ve MySQL'de <code>DISTINCT</code> yazılır: <code>STRING_AGG(DISTINCT city, ', ')</code>. SQL Server'da STRING_AGG içinde DISTINCT yoktur; önce alt sorguda tekrarları temizle.</li>
</ul>
<h2>Uzunluk sınırları</h2>
<table>
<tr><th>Program</th><th>Sınır</th><th>Çözüm</th></tr>
<tr><td>MySQL</td><td><code>group_concat_max_len</code> varsayılan 1024 bayt; aşan kısım <b>sessizce kesilir</b></td><td><code>SET SESSION group_concat_max_len = 100000;</code></td></tr>
<tr><td>Oracle</td><td>VARCHAR2 sınırı (4000 bayt) aşılırsa hata</td><td><code>LISTAGG(ad, ', ' ON OVERFLOW TRUNCATE)</code> (12.2+)</td></tr>
<tr><td>SQL Server</td><td>Girdi NVARCHAR(4000) ise sonuç 8000 bayta sığmalı</td><td><code>STRING_AGG(CAST(ad AS NVARCHAR(MAX)), ', ')</code></td></tr>
</table>
<div class="note"><b>Eski SQL Server sürümleri</b>2017 öncesinde aynı iş <code>STUFF(... FOR XML PATH(''))</code> ile yapılırdı. Bu yöntem T-SQL modülündeki “Listeleri bölmek ve birleştirmek” dersinde anlatılıyor.</div>
`,
  ex: [
    sq('Her departman numarası için çalışanların adlarını <b>işe giriş tarihine göre</b> (eskiden yeniye) virgül ve boşlukla (<code>, </code>) birleştir: <code>dept_id</code>, <code>calisanlar</code>. Departmanı olmayan çalışanları hariç tut.',
      "SELECT dept_id, GROUP_CONCAT(first_name, ', ' ORDER BY hire_date) AS calisanlar FROM employees WHERE dept_id IS NOT NULL GROUP BY dept_id;",
      { solv: {
        tsql: "SELECT dept_id, STRING_AGG(first_name, ', ') WITHIN GROUP (ORDER BY hire_date) AS calisanlar FROM employees WHERE dept_id IS NOT NULL GROUP BY dept_id;",
        pg: "SELECT dept_id, STRING_AGG(first_name, ', ' ORDER BY hire_date) AS calisanlar FROM employees WHERE dept_id IS NOT NULL GROUP BY dept_id;",
        mysql: "SELECT dept_id, GROUP_CONCAT(first_name ORDER BY hire_date SEPARATOR ', ') AS calisanlar FROM employees WHERE dept_id IS NOT NULL GROUP BY dept_id;",
        oracle: "SELECT dept_id, LISTAGG(first_name, ', ') WITHIN GROUP (ORDER BY hire_date) AS calisanlar FROM employees WHERE dept_id IS NOT NULL GROUP BY dept_id;",
        bq: "SELECT dept_id, STRING_AGG(first_name, ', ' ORDER BY hire_date) AS calisanlar FROM employees WHERE dept_id IS NOT NULL GROUP BY dept_id;" },
        hint: 'Programının birleştirme fonksiyonunu ders tablosundan bul; sıralamayı hire_date ile ver.' }),
    sq('Her kategori için ürün adlarını <b>fiyata göre pahalıdan ucuza</b> sıralayıp <code> | </code> ayracıyla birleştir: <code>category</code>, <code>urunler</code>.',
      "SELECT category, GROUP_CONCAT(name, ' | ' ORDER BY price DESC, product_id) AS urunler FROM products GROUP BY category;",
      { solv: {
        tsql: "SELECT category, STRING_AGG(name, ' | ') WITHIN GROUP (ORDER BY price DESC, product_id) AS urunler FROM products GROUP BY category;",
        pg: "SELECT category, STRING_AGG(name, ' | ' ORDER BY price DESC, product_id) AS urunler FROM products GROUP BY category;",
        mysql: "SELECT category, GROUP_CONCAT(name ORDER BY price DESC, product_id SEPARATOR ' | ') AS urunler FROM products GROUP BY category;",
        oracle: "SELECT category, LISTAGG(name, ' | ') WITHIN GROUP (ORDER BY price DESC, product_id) AS urunler FROM products GROUP BY category;",
        bq: "SELECT category, STRING_AGG(name, ' | ' ORDER BY price DESC, product_id) AS urunler FROM products GROUP BY category;" },
        hint: 'Aynı fiyatlı ürünler olabilir; eşitlikte product_id ile sırala.' }),
    sq('Her şube (<code>bank_branches</code>) için şubenin müşterilerinin bulunduğu <b>şehirlerin tekrarsız</b> ve alfabetik listesini getir: <code>branch_id</code>, <code>sehirler</code>. Bunun için önce alt sorguda şube ve şehir çiftlerini tekrarsız hale getir.',
      "SELECT branch_id, GROUP_CONCAT(city, ', ' ORDER BY city) AS sehirler FROM (SELECT DISTINCT branch_id, city FROM bank_customers WHERE city IS NOT NULL) t GROUP BY branch_id;",
      { solv: {
        tsql: "SELECT branch_id, STRING_AGG(city, ', ') WITHIN GROUP (ORDER BY city) AS sehirler FROM (SELECT DISTINCT branch_id, city FROM bank_customers WHERE city IS NOT NULL) t GROUP BY branch_id;",
        pg: "SELECT branch_id, STRING_AGG(city, ', ' ORDER BY city) AS sehirler FROM (SELECT DISTINCT branch_id, city FROM bank_customers WHERE city IS NOT NULL) t GROUP BY branch_id;",
        mysql: "SELECT branch_id, GROUP_CONCAT(city ORDER BY city SEPARATOR ', ') AS sehirler FROM (SELECT DISTINCT branch_id, city FROM bank_customers WHERE city IS NOT NULL) t GROUP BY branch_id;",
        oracle: "SELECT branch_id, LISTAGG(city, ', ') WITHIN GROUP (ORDER BY city) AS sehirler FROM (SELECT DISTINCT branch_id, city FROM bank_customers WHERE city IS NOT NULL) t GROUP BY branch_id;",
        bq: "SELECT branch_id, STRING_AGG(city, ', ' ORDER BY city) AS sehirler FROM (SELECT DISTINCT branch_id, city FROM bank_customers WHERE city IS NOT NULL) t GROUP BY branch_id;" },
        hint: 'FROM (SELECT DISTINCT branch_id, city FROM bank_customers) t ile başla, sonra GROUP BY branch_id.' }),
    mc('<p>MySQL\'de çok uzun bir GROUP_CONCAT sonucu beklenenden kısa çıkıyor ve hata da yok. En olası neden nedir?</p>', ['NULL değerler sonucu kısaltır', 'group_concat_max_len sınırı (varsayılan 1024 bayt) aşıldı ve sonuç kesildi', 'ORDER BY yazılmadığı için', 'GROUP BY sütunu yanlış'], 1, 'MySQL bu sınırı aşan kısmı uyarı vererek keser. SET SESSION group_concat_max_len ile artırılır.')
  ]
}]);

after('correlated', [{
  id: 'lateral', lv: 'B2', mod: 'Küme ve Alt Sorgular', min: 14,
  title: 'Satır başına alt sorgu: LATERAL ve APPLY',
  sum: 'Her satır için ayrı çalışan, birden çok sütun ve satır döndürebilen alt sorgular; “her müşterinin son N siparişi”.',
  body: `
<h2>Sorun</h2>
<p>“Her müşterinin <b>son iki</b> siparişi” sorusunu düşün. İlişkili alt sorgu SELECT listesinde yalnızca <b>tek bir değer</b> döndürebilir; iki satır ve birkaç sütun döndüremez. FROM içindeki normal alt sorgu ise dışarıdaki tabloyu göremez.</p>
<h2>LATERAL: FROM içinde ilişkili alt sorgu</h2>
<p><code>LATERAL</code> anahtar kelimesi, FROM içindeki alt sorgunun solundaki tablolara başvurmasına izin verir. Alt sorgu her dış satır için yeniden çalışır gibi düşünülebilir.</p>
${CODE("SELECT c.customer_id, s.order_id, s.order_date\nFROM customers c\nCROSS JOIN LATERAL (\n  SELECT o.order_id, o.order_date\n  FROM orders o\n  WHERE o.customer_id = c.customer_id\n  ORDER BY o.order_date DESC\n  LIMIT 2\n) AS s\nWHERE c.customer_id <= 3\nORDER BY c.customer_id, s.order_date DESC;", {
  tsql: "SELECT c.customer_id, s.order_id, s.order_date\nFROM customers c\nCROSS APPLY (\n  SELECT TOP 2 o.order_id, o.order_date\n  FROM orders o\n  WHERE o.customer_id = c.customer_id\n  ORDER BY o.order_date DESC\n) AS s\nWHERE c.customer_id <= 3\nORDER BY c.customer_id, s.order_date DESC;",
  mysql: "SELECT c.customer_id, s.order_id, s.order_date\nFROM customers c\nCROSS JOIN LATERAL (\n  SELECT o.order_id, o.order_date\n  FROM orders o\n  WHERE o.customer_id = c.customer_id\n  ORDER BY o.order_date DESC\n  LIMIT 2\n) AS s\nWHERE c.customer_id <= 3\nORDER BY c.customer_id, s.order_date DESC;",
  oracle: "SELECT c.customer_id, s.order_id, s.order_date\nFROM customers c\nCROSS APPLY (\n  SELECT o.order_id, o.order_date\n  FROM orders o\n  WHERE o.customer_id = c.customer_id\n  ORDER BY o.order_date DESC\n  FETCH FIRST 2 ROWS ONLY\n) s\nWHERE c.customer_id <= 3\nORDER BY c.customer_id, s.order_date DESC;"
}, { base: 'pg' })}
<table>
<tr><th>Program</th><th>İç birleşim</th><th>Dış birleşim (eşi olmayan da kalsın)</th></tr>
<tr><td>PostgreSQL 9.3+, MySQL 8.0.14+</td><td><code>CROSS JOIN LATERAL (...) AS s</code></td><td><code>LEFT JOIN LATERAL (...) AS s ON TRUE</code></td></tr>
<tr><td>SQL Server</td><td><code>CROSS APPLY (...) AS s</code></td><td><code>OUTER APPLY (...) AS s</code></td></tr>
<tr><td>Oracle 12c+</td><td><code>CROSS APPLY</code> veya <code>CROSS JOIN LATERAL</code></td><td><code>OUTER APPLY</code></td></tr>
<tr><td>BigQuery</td><td colspan="2">FROM içinde ilişkili alt sorgu yoktur; aynı iş pencere fonksiyonuyla yapılır (aşağıda).</td></tr>
</table>
<h2>Eşi olmayanı korumak: LEFT JOIN LATERAL ... ON TRUE</h2>
<p>Alt sorgu bir dış satır için hiç satır döndürmezse CROSS JOIN LATERAL o satırı düşürür. Dış satırın kalması için LEFT JOIN LATERAL kullanılır. Koşul zaten alt sorgunun içinde olduğundan ON kısmına <code>TRUE</code> yazılır.</p>
${CODE("SELECT d.name, s.calisan\nFROM departments d\nLEFT JOIN LATERAL (\n  SELECT COUNT(*) AS calisan\n  FROM employees e\n  WHERE e.dept_id = d.dept_id\n) AS s ON TRUE;", {
  tsql: "SELECT d.name, s.calisan\nFROM departments d\nOUTER APPLY (\n  SELECT COUNT(*) AS calisan\n  FROM employees e\n  WHERE e.dept_id = d.dept_id\n) AS s;",
  mysql: "SELECT d.name, s.calisan\nFROM departments d\nLEFT JOIN LATERAL (\n  SELECT COUNT(*) AS calisan\n  FROM employees e\n  WHERE e.dept_id = d.dept_id\n) AS s ON TRUE;",
  oracle: "SELECT d.name, s.calisan\nFROM departments d\nOUTER APPLY (\n  SELECT COUNT(*) AS calisan\n  FROM employees e\n  WHERE e.dept_id = d.dept_id\n) s;"
}, { base: 'pg' })}
<h2>Pencere fonksiyonuyla karşılaştırma</h2>
<p>Aynı “her gruptan ilk N” sorusu ROW_NUMBER ile de çözülür ve her programda çalışır:</p>
<pre class="code">WITH s AS (
  SELECT customer_id, order_id, order_date,
         ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date DESC) AS rn
  FROM orders
)
SELECT customer_id, order_id, order_date
FROM s
WHERE rn <= 2 AND customer_id <= 3
ORDER BY customer_id, order_date DESC;</pre>
<table>
<tr><th></th><th>ROW_NUMBER</th><th>LATERAL / APPLY</th></tr>
<tr><td>Taşınabilirlik</td><td>Her programda</td><td>BigQuery'de yok</td></tr>
<tr><td>Az sayıda dış satır, büyük iç tablo</td><td>Tüm tabloyu numaralandırır</td><td>İndeks varsa her dış satır için birkaç satır okur; çok daha hızlı olabilir</td></tr>
<tr><td>Satır başına fonksiyon çağırmak</td><td>Uygun değil</td><td>Tablo döndüren fonksiyonları (STRING_SPLIT, OPENJSON, jsonb_array_elements) satır başına çağırmak için doğal yol</td></tr>
</table>
<div class="note"><b>Bu uygulamada</b>Tarayıcıdaki motor LATERAL ve APPLY alt sorgularını eşdeğer bir birleşime çevirerek çalıştırır. Alt sorgu dış tabloya WHERE içindeki eşitlik koşullarıyla bağlanmalıdır (yukarıdaki örneklerdeki gibi).</div>
`,
  ex: [
    sq('1–5 numaralı müşterilerin her biri için <b>en son iki</b> siparişini getir: <code>customer_id</code>, <code>order_id</code>, <code>order_date</code>. Müşteriye göre, sonra tarihe göre yeniden eskiye sırala.',
      'SELECT c.customer_id, s.order_id, s.order_date FROM customers c CROSS JOIN LATERAL (SELECT o.order_id, o.order_date FROM orders o WHERE o.customer_id = c.customer_id ORDER BY o.order_date DESC, o.order_id DESC LIMIT 2) AS s WHERE c.customer_id <= 5 ORDER BY c.customer_id, s.order_date DESC, s.order_id DESC;',
      { base: 'pg', dl: ['pg', 'mysql', 'oracle', 'tsql'], ord: true, solv: {
        mysql: 'SELECT c.customer_id, s.order_id, s.order_date FROM customers c CROSS JOIN LATERAL (SELECT o.order_id, o.order_date FROM orders o WHERE o.customer_id = c.customer_id ORDER BY o.order_date DESC, o.order_id DESC LIMIT 2) AS s WHERE c.customer_id <= 5 ORDER BY c.customer_id, s.order_date DESC, s.order_id DESC;',
        oracle: 'SELECT c.customer_id, s.order_id, s.order_date FROM customers c CROSS APPLY (SELECT o.order_id, o.order_date FROM orders o WHERE o.customer_id = c.customer_id ORDER BY o.order_date DESC, o.order_id DESC FETCH FIRST 2 ROWS ONLY) s WHERE c.customer_id <= 5 ORDER BY c.customer_id, s.order_date DESC, s.order_id DESC;',
        tsql: 'SELECT c.customer_id, s.order_id, s.order_date FROM customers c CROSS APPLY (SELECT TOP 2 o.order_id, o.order_date FROM orders o WHERE o.customer_id = c.customer_id ORDER BY o.order_date DESC, o.order_id DESC) AS s WHERE c.customer_id <= 5 ORDER BY c.customer_id, s.order_date DESC, s.order_id DESC;' },
        hint: 'Alt sorguda ORDER BY order_date DESC ve LIMIT 2 (SQL Server: TOP 2, Oracle: FETCH FIRST 2 ROWS ONLY).' }),
    sq('Her departman için <b>en yüksek maaşlı</b> çalışanın adını ve maaşını getir; çalışanı olmayan departman da listede kalsın (ad ve maaş NULL): <code>name</code> (departman), <code>first_name</code>, <code>salary</code>. Eşit maaşta küçük emp_id seçilsin.',
      'SELECT d.name, s.first_name, s.salary FROM departments d LEFT JOIN LATERAL (SELECT e.first_name, e.salary FROM employees e WHERE e.dept_id = d.dept_id ORDER BY e.salary DESC, e.emp_id LIMIT 1) AS s ON TRUE;',
      { base: 'pg', dl: ['pg', 'mysql', 'oracle', 'tsql'], solv: {
        mysql: 'SELECT d.name, s.first_name, s.salary FROM departments d LEFT JOIN LATERAL (SELECT e.first_name, e.salary FROM employees e WHERE e.dept_id = d.dept_id ORDER BY e.salary DESC, e.emp_id LIMIT 1) AS s ON TRUE;',
        oracle: 'SELECT d.name, s.first_name, s.salary FROM departments d OUTER APPLY (SELECT e.first_name, e.salary FROM employees e WHERE e.dept_id = d.dept_id ORDER BY e.salary DESC, e.emp_id FETCH FIRST 1 ROWS ONLY) s;',
        tsql: 'SELECT d.name, s.first_name, s.salary FROM departments d OUTER APPLY (SELECT TOP 1 e.first_name, e.salary FROM employees e WHERE e.dept_id = d.dept_id ORDER BY e.salary DESC, e.emp_id) AS s;' },
        hint: 'Eşi olmayan departmanın kalması için LEFT JOIN LATERAL ... ON TRUE (SQL Server ve Oracle: OUTER APPLY).' }),
    sq('Her departmanın çalışan sayısını ve ortalama maaşını (tam sayı) LATERAL alt sorguyla getir; çalışanı olmayan departmanda sayı 0 görünsün: <code>name</code>, <code>calisan</code>, <code>ort_maas</code>.',
      'SELECT d.name, s.calisan, s.ort_maas FROM departments d LEFT JOIN LATERAL (SELECT COUNT(*) AS calisan, ROUND(AVG(e.salary)) AS ort_maas FROM employees e WHERE e.dept_id = d.dept_id) AS s ON TRUE;',
      { base: 'pg', dl: ['pg', 'mysql', 'oracle', 'tsql'], solv: {
        mysql: 'SELECT d.name, s.calisan, s.ort_maas FROM departments d LEFT JOIN LATERAL (SELECT COUNT(*) AS calisan, ROUND(AVG(e.salary)) AS ort_maas FROM employees e WHERE e.dept_id = d.dept_id) AS s ON TRUE;',
        oracle: 'SELECT d.name, s.calisan, s.ort_maas FROM departments d OUTER APPLY (SELECT COUNT(*) AS calisan, ROUND(AVG(e.salary)) AS ort_maas FROM employees e WHERE e.dept_id = d.dept_id) s;',
        tsql: 'SELECT d.name, s.calisan, s.ort_maas FROM departments d OUTER APPLY (SELECT COUNT(*) AS calisan, ROUND(AVG(e.salary), 0) AS ort_maas FROM employees e WHERE e.dept_id = d.dept_id) AS s;' },
        hint: 'Toplama yapan alt sorgu her zaman bir satır döndürür; çalışanı olmayan departmanda COUNT(*) 0, AVG NULL olur.' }),
    mc('<p>“Her müşterinin son 3 siparişi” sorgusunu BigQuery\'de yazman gerekiyor. Hangi yöntem kullanılır?</p>', ['CROSS APPLY', 'LEFT JOIN LATERAL ... ON TRUE', 'ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date DESC) ile numaralandırıp rn <= 3 filtrelemek', 'SELECT listesinde ilişkili alt sorgu'], 2, 'BigQuery FROM içinde ilişkili alt sorguyu desteklemez; pencere fonksiyonu her programda çalışan yoldur (BigQuery\'de QUALIFY ile daha da kısa yazılır).')
  ]
}]);

/* ---------- Temel bitirme projesi ---------- */
after('stil', [{
  id: 'proje-temel', lv: 'A2', mod: 'Bitirme Projeleri', min: 35,
  title: 'Bitirme projesi (Temeller): Anadolu Market için ilk raporun',
  sum: 'Tek tabloda seçme, filtreleme, sıralama, hesaplama, gruplama, CASE ve tarih fonksiyonlarıyla altı soruluk bir yönetici raporu.',
  body: `
<h2>Senaryo</h2>
<p>Anadolu Market'in satış müdürü, yıl sonu toplantısı öncesinde senden kısa bir rapor istiyor. Henüz tabloları birleştirmeyi bilmen gerekmiyor: her soru tek bir tabloyla çözülür. Bu projede şimdiye kadar öğrendiklerini bir arada kullanacaksın.</p>
<table>
<tr><th>Soru</th><th>Kullanacağın konular</th></tr>
<tr><td>1. Kanal performansı</td><td>WHERE ile tarih aralığı, GROUP BY, ORDER BY</td></tr>
<tr><td>2. Elektronik kâr marjı</td><td>Hesaplanan sütun, ROUND, sıralama</td></tr>
<tr><td>3. Kalabalık şehirler</td><td>GROUP BY, HAVING</td></tr>
<tr><td>4. Yaş grupları</td><td>CASE, GROUP BY</td></tr>
<tr><td>5. E-posta sağlayıcıları</td><td>LIKE, koşullu sayım</td></tr>
<tr><td>6. Stok uyarısı</td><td>Çoklu koşul, NULL, sıralama ve ilk N satır</td></tr>
</table>
<h2>Kullanacağın tablolar</h2>
<ul>
<li><code>orders</code>: order_id, customer_id, order_date, status (delivered, shipped, cancelled, returned), channel (web, mobile, store)</li>
<li><code>products</code>: product_id, name, category, price, cost, stock</li>
<li><code>customers</code>: customer_id, first_name, last_name, gender, birth_year, city, email, signup_date, segment</li>
</ul>
<div class="tip"><b>Çalışma önerisi</b>Her soruda önce <code>SELECT *</code> ile ilgili satırlara bak, sonra sütunları ve koşulları ekle. Sonucu yorumlamayı da unutma: hangi kanal öne çıkıyor, hangi ürün en az kâr bırakıyor?</div>
`,
  ex: [
    sq('<b>Kanal performansı.</b> 2024 yılında verilen siparişleri kanala göre say: <code>channel</code>, <code>siparis</code>. En çok siparişi olan kanal en üstte olsun.',
      "SELECT channel, COUNT(*) AS siparis FROM orders WHERE order_date >= '2024-01-01' AND order_date < '2025-01-01' GROUP BY channel ORDER BY siparis DESC;",
      { ord: true, hint: "Yarı açık aralık: order_date >= '2024-01-01' AND order_date < '2025-01-01'." }),
    sq('<b>Elektronik kâr marjı.</b> Elektronik kategorisindeki ürünlerin adını, fiyatını, maliyetini ve kâr marjını yüzde olarak (1 basamak) getir: <code>name</code>, <code>price</code>, <code>cost</code>, <code>marj</code>. Marjı en düşük ürün en üstte olsun.',
      "SELECT name, price, cost, ROUND((price - cost) * 100.0 / price, 1) AS marj FROM products WHERE category = 'Elektronik' ORDER BY marj, name;",
      { ord: true, hint: 'Marj = (price - cost) * 100.0 / price. 100.0 yazmak tam sayı bölmesini önler.' }),
    sq('<b>Kalabalık şehirler.</b> En az 8 müşterisi olan şehirleri ve müşteri sayılarını getir: <code>city</code>, <code>musteri</code>. Müşteri sayısına göre azalan sırala; eşitlikte şehir adına göre.',
      'SELECT city, COUNT(*) AS musteri FROM customers WHERE city IS NOT NULL GROUP BY city HAVING COUNT(*) >= 8 ORDER BY musteri DESC, city;',
      { ord: true, hint: 'Grup koşulu HAVING ile yazılır.' }),
    sq('<b>Yaş grupları.</b> Müşterileri doğum yılına göre üç gruba ayır ve her gruptaki müşteri sayısını getir: 1995 ve sonrası <b>\'Genç\'</b>, 1980–1994 <b>\'Orta\'</b>, 1980 öncesi <b>\'Olgun\'</b>. Sütunlar: <code>yas_grubu</code>, <code>musteri</code>.',
      "SELECT CASE WHEN birth_year >= 1995 THEN 'Genç' WHEN birth_year >= 1980 THEN 'Orta' ELSE 'Olgun' END AS yas_grubu, COUNT(*) AS musteri FROM customers GROUP BY CASE WHEN birth_year >= 1995 THEN 'Genç' WHEN birth_year >= 1980 THEN 'Orta' ELSE 'Olgun' END;",
      { hint: 'CASE koşulları yukarıdan aşağı denenir; ilk doğru olan kazanır. GROUP BY içinde aynı CASE ifadesini tekrar yaz.' }),
    sq('<b>E-posta sağlayıcıları.</b> Tek satırda üç sayı getir: toplam müşteri (<code>toplam</code>), Gmail kullanan müşteri (<code>gmail</code>, adresi <code>@gmail.com</code> ile biten) ve Gmail kullananların oranı yüzde olarak (<code>oran</code>, 1 basamak).',
      "SELECT COUNT(*) AS toplam, SUM(CASE WHEN email LIKE '%@gmail.com' THEN 1 ELSE 0 END) AS gmail, ROUND(100.0 * SUM(CASE WHEN email LIKE '%@gmail.com' THEN 1 ELSE 0 END) / COUNT(*), 1) AS oran FROM customers;",
      { hint: "Koşullu sayım: SUM(CASE WHEN email LIKE '%@gmail.com' THEN 1 ELSE 0 END)." }),
    sq('<b>Stok uyarısı.</b> Stoğu bilinmeyen (NULL) <b>ya da</b> 20\'nin altında olan ürünlerden fiyatı en yüksek 5 tanesini getir: <code>name</code>, <code>category</code>, <code>price</code>, <code>stock</code>. Fiyata göre azalan sırala.',
      'SELECT name, category, price, stock FROM products WHERE stock IS NULL OR stock < 20 ORDER BY price DESC, product_id LIMIT 5;',
      { ord: true, hint: 'NULL bir karşılaştırmada yakalanmaz; stock IS NULL OR stock < 20 yaz. İlk 5 satır için programının yazımını kullan (LIMIT / TOP / FETCH FIRST).' })
  ]
}]);

/* ======================= Alıştırması az olan derslere ekler ======================= */
add('sayi-tip',
  sq('Her kategorinin ortalama fiyatını iki şekilde getir: tam sayıya yuvarlanmış (<code>yuvarlak</code>) ve aşağı yuvarlanmış (<code>asagi</code>). Sütunlar: <code>category</code>, <code>yuvarlak</code>, <code>asagi</code>.',
    'SELECT category, ROUND(AVG(price)) AS yuvarlak, FLOOR(AVG(price)) AS asagi FROM products GROUP BY category;',
    { hint: 'ROUND en yakına, FLOOR aşağıya yuvarlar.' }));

add('coalesce',
  sq('Her ürünün adını ve stok durumunu getir: stok NULL ise 0 kabul et ve <code>stok</code> sütununda göster; ayrıca stok değeri fiyatla çarpılarak stok değeri (<code>stok_degeri</code>, tam sayı) hesaplansın. Yalnızca Spor kategorisi: <code>name</code>, <code>stok</code>, <code>stok_degeri</code>.',
    "SELECT name, COALESCE(stock, 0) AS stok, ROUND(COALESCE(stock, 0) * price) AS stok_degeri FROM products WHERE category = 'Spor';",
    { hint: 'NULL ile çarpım NULL verir; önce COALESCE(stock, 0).' }));

add('non-equi',
  sq('Her ürünü fiyat aralığına göre etiketle ve her aralıktaki ürün sayısını getir. Aralıkları CTE ile tanımla: 0–250 <b>\'Ekonomik\'</b>, 250–1000 <b>\'Orta\'</b>, 1000 ve üzeri <b>\'Premium\'</b> (alt sınır dahil, üst hariç). Sütunlar: <code>aralik</code>, <code>urun</code>.',
    "WITH a AS (SELECT 0 AS alt, 250 AS ust, 'Ekonomik' AS aralik UNION ALL SELECT 250, 1000, 'Orta' UNION ALL SELECT 1000, 100000000, 'Premium') SELECT a.aralik, COUNT(*) AS urun FROM products p JOIN a ON p.price >= a.alt AND p.price < a.ust GROUP BY a.aralik;",
    { hint: 'JOIN a ON p.price >= a.alt AND p.price < a.ust' }));

add('set-ops',
  sq('Hem <b>web</b> hem de <b>store</b> kanalından en az bir sipariş vermiş müşterilerin numaralarını INTERSECT ile bul: <code>customer_id</code>.',
    "SELECT customer_id FROM orders WHERE channel = 'web' INTERSECT SELECT customer_id FROM orders WHERE channel = 'store';",
    { hint: 'İki SELECT de yalnızca customer_id döndürmeli.' }));

add('join-ozet',
  sq('Her kategori için ürün sayısını (tüm ürünler) ve 2024\'te satılan toplam adedi (satılmamışsa 0) getir: <code>category</code>, <code>urun</code>, <code>adet_2024</code>. Ürün sayısının satırlarla şişmemesine dikkat et.',
    "WITH s AS (SELECT oi.product_id, SUM(oi.quantity) AS adet FROM order_items oi JOIN orders o ON o.order_id = oi.order_id WHERE o.order_date >= '2024-01-01' AND o.order_date < '2025-01-01' GROUP BY oi.product_id) SELECT p.category, COUNT(*) AS urun, COALESCE(SUM(s.adet), 0) AS adet_2024 FROM products p LEFT JOIN s ON s.product_id = p.product_id GROUP BY p.category;",
    { hint: 'Önce ürün başına 2024 adedini özetle (CTE), sonra products ile LEFT JOIN.' }));

add('right-full-join',
  sq('<code>departments</code> tablosunu sağa alarak RIGHT JOIN ile her departmanın adını ve çalışan sayısını getir; çalışanı olmayan departman 0 görünsün: <code>name</code>, <code>calisan</code>.',
    'SELECT d.name, COUNT(e.emp_id) AS calisan FROM employees e RIGHT JOIN departments d ON d.dept_id = e.dept_id GROUP BY d.dept_id, d.name;',
    { hint: 'COUNT(*) yerine COUNT(e.emp_id) yaz; eşi olmayan satırda emp_id NULL olduğu için 0 sayılır.' }),
  sq('Tüm çalışanları ve tüm departmanları FULL OUTER JOIN ile birleştir ve kaç satırın eşleştiğini, kaçının yalnızca bir tarafta kaldığını say: <code>durum</code> (\'eslesen\', \'departmansiz_calisan\', \'calisansiz_departman\'), <code>adet</code>.',
    "SELECT CASE WHEN e.emp_id IS NOT NULL AND d.dept_id IS NOT NULL THEN 'eslesen' WHEN d.dept_id IS NULL THEN 'departmansiz_calisan' ELSE 'calisansiz_departman' END AS durum, COUNT(*) AS adet FROM employees e FULL OUTER JOIN departments d ON d.dept_id = e.dept_id GROUP BY CASE WHEN e.emp_id IS NOT NULL AND d.dept_id IS NOT NULL THEN 'eslesen' WHEN d.dept_id IS NULL THEN 'departmansiz_calisan' ELSE 'calisansiz_departman' END;",
    { dl: ['tsql', 'pg', 'oracle', 'sqlite'], hint: 'MySQL ve BigQuery dışındaki programlarda FULL OUTER JOIN vardır. Durumu CASE ile belirle.' }));

add('cte',
  sq('İki CTE kullan: birincisi müşteri başına teslim edilen sipariş sayısını, ikincisi bu sayıların ortalamasını hesaplasın. Ortalamanın üstünde teslim edilmiş siparişi olan müşteri sayısını getir: <code>musteri</code>.',
    "WITH m AS (SELECT customer_id, COUNT(*) AS n FROM orders WHERE status = 'delivered' GROUP BY customer_id), o AS (SELECT AVG(n) AS ort FROM m) SELECT COUNT(*) AS musteri FROM m CROSS JOIN o WHERE m.n > o.ort;",
    { hint: 'WITH m AS (...), o AS (SELECT AVG(n) ...) ile başla; sonra m ile o\'yu CROSS JOIN ile birleştir.' }));

add('frames',
  sq('1 numaralı müşterinin siparişlerini tarih sırasıyla listele ve her siparişte o ana kadarki toplam net harcamayı (2 basamak) göster: <code>order_id</code>, <code>order_date</code>, <code>tutar</code>, <code>kumulatif</code>.',
    `WITH t AS (SELECT o.order_id, o.order_date, SUM(${NET}) AS tutar FROM orders o JOIN order_items oi ON oi.order_id = o.order_id WHERE o.customer_id = 1 GROUP BY o.order_id, o.order_date) SELECT order_id, order_date, ROUND(tutar, 2) AS tutar, ROUND(SUM(tutar) OVER (ORDER BY order_date, order_id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW), 2) AS kumulatif FROM t ORDER BY order_date, order_id;`,
    { ord: true, hint: 'Önce sipariş başına tutarı hesapla, sonra SUM(tutar) OVER (ORDER BY order_date, order_id).' }));

add('ntile-dist',
  sq('Ürünleri fiyata göre yüzdelik sıralamaya koy: her ürün için <code>name</code>, <code>price</code> ve <code>yuzdelik</code> (PERCENT_RANK × 100, 1 basamak). Yalnızca yüzdeliği 90 ve üzeri olan ürünleri getir.',
    'WITH r AS (SELECT name, price, PERCENT_RANK() OVER (ORDER BY price) AS pr FROM products) SELECT name, price, ROUND(pr * 100, 1) AS yuzdelik FROM r WHERE pr >= 0.9;',
    { hint: 'Pencere fonksiyonu WHERE içinde kullanılamaz; önce CTE içinde hesapla.' }));

add('first-last',
  sq('Her departmanda maaşı en yüksek ve en düşük çalışanın adını aynı satırda getir: <code>dept_id</code>, <code>en_yuksek</code>, <code>en_dusuk</code>. LAST_VALUE kullanacaksan çerçeveyi doğru tanımla. Departmanı olmayanları hariç tut.',
    'SELECT DISTINCT dept_id, FIRST_VALUE(first_name) OVER (PARTITION BY dept_id ORDER BY salary DESC, emp_id) AS en_yuksek, LAST_VALUE(first_name) OVER (PARTITION BY dept_id ORDER BY salary DESC, emp_id ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS en_dusuk FROM employees WHERE dept_id IS NOT NULL;',
    { hint: 'LAST_VALUE için ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING. Ya da en düşüğü ters sıralı FIRST_VALUE ile bul.' }));

add('ardisik-seri',
  sq('2024 Aralık ayında sipariş verilen günleri ardışık serilere ayır ve her serinin başlangıcını, bitişini ve gün sayısını getir: <code>baslangic</code>, <code>bitis</code>, <code>gun</code>. Başlangıca göre sırala.',
    "WITH g AS (SELECT DISTINCT order_date AS d FROM orders WHERE order_date >= '2024-12-01' AND order_date < '2025-01-01'), n AS (SELECT d, (julianday(d) - julianday('2024-12-01')) - ROW_NUMBER() OVER (ORDER BY d) AS grp FROM g) SELECT MIN(d) AS baslangic, MAX(d) AS bitis, COUNT(*) AS gun FROM n GROUP BY grp ORDER BY baslangic;",
    { ord: true, hint: 'Tarih eksi ROW_NUMBER aynı serideki günlerde sabit kalır; bu değere göre grupla.' }));

add('pivot',
  sq('Her müşteri segmenti için cinsiyete göre müşteri sayılarını yan yana getir: <code>segment</code>, <code>kadin</code> (gender = \'K\'), <code>erkek</code> (gender = \'E\'), <code>toplam</code>.',
    "SELECT segment, SUM(CASE WHEN gender = 'K' THEN 1 ELSE 0 END) AS kadin, SUM(CASE WHEN gender = 'E' THEN 1 ELSE 0 END) AS erkek, COUNT(*) AS toplam FROM customers GROUP BY segment;",
    { hint: "Her sütun için SUM(CASE WHEN gender = 'K' THEN 1 ELSE 0 END)." }));

add('upsert',
  sq('<code>products</code> tablosunda 5 numaralı ürünün stoğunu 0 yap ve aynı işlemde değişen satırın <code>product_id</code> ve yeni <code>stock</code> değerini döndür. (PostgreSQL ve SQLite: RETURNING, SQL Server: OUTPUT inserted.*)',
    'UPDATE products SET stock = 0 WHERE product_id = 5 RETURNING product_id, stock;',
    { dl: ['pg', 'sqlite', 'tsql'], solv: { tsql: 'UPDATE products SET stock = 0 OUTPUT inserted.product_id, inserted.stock WHERE product_id = 5;' }, hint: 'RETURNING ifadesi UPDATE\'in sonuna yazılır; SQL Server\'da OUTPUT SET ile WHERE arasına gelir.' }));

add('view',
  sq('Kategori bazında ürün sayısı ve ortalama fiyatı (2 basamak) veren <code>v_kategori_ozet</code> adında bir view oluştur: <code>category</code>, <code>urun</code>, <code>ort_fiyat</code>.',
    'CREATE VIEW v_kategori_ozet AS SELECT category, COUNT(*) AS urun, ROUND(AVG(price), 2) AS ort_fiyat FROM products GROUP BY category;',
    { check: 'SELECT category, urun, ort_fiyat FROM v_kategori_ozet ORDER BY category', hint: 'CREATE VIEW ad AS SELECT ...' }),
  sq('Önce teslim edilmiş siparişleri gösteren <code>v_teslim</code> view\'ını oluştur (orders tablosunun tüm sütunları, status = \'delivered\'). Ardından bu view\'ı kullanarak kanal başına teslim edilen sipariş sayısını getir: <code>channel</code>, <code>siparis</code>.',
    "CREATE VIEW v_teslim AS SELECT * FROM orders WHERE status = 'delivered'; SELECT channel, COUNT(*) AS siparis FROM v_teslim GROUP BY channel;",
    { hint: 'İki ifadeyi noktalı virgülle ayır. View bir tablo gibi sorgulanır.' }));

add('json',
  sq('1–3 numaralı departmanlar için her departmanı <code>{"departman": ..., "sehir": ...}</code> biçiminde bir JSON nesnesi olarak üret: <code>dept_id</code>, <code>j</code>. Departman numarasına göre sırala.',
    "SELECT dept_id, json_object('departman', name, 'sehir', city) AS j FROM departments WHERE dept_id <= 3 ORDER BY dept_id;",
    { ord: true, dl: ['sqlite', 'pg', 'mysql'], solv: { pg: "SELECT dept_id, json_build_object('departman', name, 'sehir', city) AS j FROM departments WHERE dept_id <= 3 ORDER BY dept_id;", mysql: "SELECT dept_id, JSON_OBJECT('departman', name, 'sehir', city) AS j FROM departments WHERE dept_id <= 3 ORDER BY dept_id;" }, hint: 'SQLite ve MySQL: JSON_OBJECT, PostgreSQL: json_build_object.' }));

add('an-buyume',
  sq('2024 yılının her ayı için teslim edilmiş sipariş sayısını ve bir önceki aya göre değişimi (adet farkı) getir: <code>ay</code>, <code>siparis</code>, <code>fark</code>. İlk ayın farkı NULL olacak.',
    "WITH m AS (SELECT strftime('%Y-%m', order_date) AS ay, COUNT(*) AS siparis FROM orders WHERE status = 'delivered' AND order_date >= '2024-01-01' AND order_date < '2025-01-01' GROUP BY strftime('%Y-%m', order_date)) SELECT ay, siparis, siparis - LAG(siparis) OVER (ORDER BY ay) AS fark FROM m ORDER BY ay;",
    { ord: true, hint: 'Önce aylık sayıyı CTE ile çıkar, sonra LAG ile bir önceki aya bak.' }));

add('an-pareto',
  sq('Teslim edilmiş siparişlerde ürünleri ciroya göre büyükten küçüğe sırala ve her ürün için kümülatif ciro payını yüzde olarak (1 basamak) göster: <code>name</code>, <code>ciro</code> (tam sayı), <code>kumulatif_pay</code>.',
    `WITH u AS (SELECT p.product_id, p.name, SUM(${NET}) AS ciro FROM order_items oi JOIN orders o ON o.order_id = oi.order_id JOIN products p ON p.product_id = oi.product_id WHERE o.status = 'delivered' GROUP BY p.product_id, p.name) SELECT name, ROUND(ciro) AS ciro, ROUND(100.0 * SUM(ciro) OVER (ORDER BY ciro DESC, product_id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) / SUM(ciro) OVER (), 1) AS kumulatif_pay FROM u ORDER BY ciro DESC, product_id;`,
    { ord: true, hint: 'Kümülatif toplam / genel toplam × 100. Genel toplam için SUM(ciro) OVER ().' }));

add('an-kohort',
  sq('Kayıt yılına (<code>signup_date</code>) göre müşteri kohortları oluştur ve her kohortta en az bir siparişi olan müşterilerin oranını yüzde olarak (1 basamak) getir: <code>kayit_yili</code>, <code>musteri</code>, <code>siparisli</code>, <code>oran</code>.',
    "SELECT strftime('%Y', c.signup_date) AS kayit_yili, COUNT(*) AS musteri, SUM(CASE WHEN EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id) THEN 1 ELSE 0 END) AS siparisli, ROUND(100.0 * SUM(CASE WHEN EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id) THEN 1 ELSE 0 END) / COUNT(*), 1) AS oran FROM customers c GROUP BY strftime('%Y', c.signup_date);",
    { hint: 'Kohort = kayıt yılı. Siparişli müşteriyi EXISTS ile koşullu say.' }));

add('an-funnel',
  sq('Huni adımlarını tek sorguda say: ziyaret (visit), ürün görüntüleme (product_view), sepete ekleme (add_to_cart), ödeme (checkout) ve satın alma (purchase) adımlarındaki <b>farklı kullanıcı</b> sayıları ile her adımın ziyarete oranı (yüzde, 1 basamak): <code>adim</code>, <code>kullanici</code>, <code>oran</code>. Adım sırasına göre sırala.',
    "WITH a AS (SELECT 1 AS sira, 'visit' AS adim UNION ALL SELECT 2, 'product_view' UNION ALL SELECT 3, 'add_to_cart' UNION ALL SELECT 4, 'checkout' UNION ALL SELECT 5, 'purchase'), k AS (SELECT a.sira, a.adim, COUNT(DISTINCT w.user_id) AS kullanici FROM a LEFT JOIN web_events w ON w.event_type = a.adim GROUP BY a.sira, a.adim) SELECT adim, kullanici, ROUND(100.0 * kullanici / (SELECT kullanici FROM k WHERE sira = 1), 1) AS oran FROM k ORDER BY sira;",
    { ord: true, hint: 'Adımları sıra numarasıyla bir CTE\'de tanımla; web_events ile LEFT JOIN yap ve COUNT(DISTINCT user_id) al.' }));

add('an-rfm',
  sq('RFM\'in <b>R</b> (yakınlık) bileşeni: teslim edilmiş siparişi olan her müşteri için referans tarih 2025-01-01\'e göre son siparişten bu yana geçen gün sayısını hesapla ve müşterileri NTILE(4) ile dört dilime ayır (1 = en yeni). Her dilimdeki müşteri sayısını ve ortalama gün sayısını (tam sayı) getir: <code>r_dilim</code>, <code>musteri</code>, <code>ort_gun</code>.',
    "WITH m AS (SELECT customer_id, julianday('2025-01-01') - julianday(MAX(order_date)) AS gun FROM orders WHERE status = 'delivered' GROUP BY customer_id), r AS (SELECT customer_id, gun, NTILE(4) OVER (ORDER BY gun, customer_id) AS r_dilim FROM m) SELECT r_dilim, COUNT(*) AS musteri, ROUND(AVG(gun)) AS ort_gun FROM r GROUP BY r_dilim ORDER BY r_dilim;",
    { ord: true, hint: 'Gün farkı: programının tarih farkı fonksiyonu. NTILE(4) OVER (ORDER BY gun) ile en yeni müşteriler 1. dilime düşer.' }),
  sq('RFM\'in <b>F</b> (sıklık) bileşeni: teslim edilmiş sipariş sayısına göre müşterileri üç gruba ayır: 1 sipariş <b>\'Tek\'</b>, 2–3 sipariş <b>\'Ara sıra\'</b>, 4 ve üzeri <b>\'Sadık\'</b>. Her gruptaki müşteri sayısını getir: <code>grup</code>, <code>musteri</code>.',
    "WITH m AS (SELECT customer_id, COUNT(*) AS n FROM orders WHERE status = 'delivered' GROUP BY customer_id) SELECT CASE WHEN n = 1 THEN 'Tek' WHEN n <= 3 THEN 'Ara sıra' ELSE 'Sadık' END AS grup, COUNT(*) AS musteri FROM m GROUP BY CASE WHEN n = 1 THEN 'Tek' WHEN n <= 3 THEN 'Ara sıra' ELSE 'Sadık' END;",
    { hint: 'Önce müşteri başına teslim edilmiş sipariş sayısını hesapla, sonra CASE ile grupla.' }));

add('ds-tanimsal',
  sq('Ürün fiyatlarının en küçük, en büyük ve aralık (max − min) değerlerini, ayrıca ortalamasını (2 basamak) tek satırda getir: <code>en_kucuk</code>, <code>en_buyuk</code>, <code>aralik</code>, <code>ort</code>.',
    'SELECT MIN(price) AS en_kucuk, MAX(price) AS en_buyuk, MAX(price) - MIN(price) AS aralik, ROUND(AVG(price), 2) AS ort FROM products;',
    { hint: 'Hepsi tek bir SELECT içinde toplama fonksiyonlarıyla yazılır.' }));

add('ds-dagilim',
  sq('Banka müşterilerinin risk puanı (<code>risk_score</code>) dağılımını 5\'erli kutularla göster (0–4, 5–9, …): <code>kutu</code> (alt sınır), <code>musteri</code>. Kutuya göre sırala.',
    'SELECT FLOOR(risk_score / 5) * 5 AS kutu, COUNT(*) AS musteri FROM bank_customers GROUP BY FLOOR(risk_score / 5) * 5 ORDER BY kutu;',
    { ord: true, hint: 'Kutu alt sınırı = FLOOR(değer / genişlik) × genişlik.' }));

add('ds-outlier',
  sq('IQR yöntemi için önce ürün fiyatlarının çeyreklerini yaklaşık hesapla: fiyatları NTILE(4) ile dört dilime ayır ve her dilimin en küçük ve en büyük fiyatını getir: <code>ceyrek</code>, <code>en_kucuk</code>, <code>en_buyuk</code>, <code>urun</code>.',
    'WITH q AS (SELECT price, NTILE(4) OVER (ORDER BY price, product_id) AS ceyrek FROM products) SELECT ceyrek, MIN(price) AS en_kucuk, MAX(price) AS en_buyuk, COUNT(*) AS urun FROM q GROUP BY ceyrek ORDER BY ceyrek;',
    { ord: true, hint: 'NTILE(4) OVER (ORDER BY price) ile dilimle, sonra dilime göre grupla.' }),
  sq('Banka işlemlerinde <b>kart harcamalarının</b> (txn_type = \'kart_harcama\') tutar mutlak değerinin z-skorunu hesapla ve z &gt; 4 olan işlem sayısını getir: <code>aykiri</code>.',
    "WITH k AS (SELECT ABS(amount) AS t FROM bank_txns WHERE txn_type = 'kart_harcama'), s AS (SELECT AVG(t) AS ort, STDDEV(t) AS sd FROM k) SELECT COUNT(*) AS aykiri FROM k CROSS JOIN s WHERE (k.t - s.ort) / s.sd > 4;",
    { hint: 'Ortalama ve standart sapmayı bir CTE\'de hesapla, sonra CROSS JOIN ile her satıra taşı.' }));

add('ds-korelasyon',
  sq('Çalışanların işe giriş yılı (x) ile maaşı (y) arasındaki Pearson korelasyonunu hesapla (3 basamak). Tek değer: <code>r</code>. İşe giriş yılını tarihten tam sayı olarak çıkar.',
    "WITH t AS (SELECT CAST(strftime('%Y', hire_date) AS INTEGER) AS x, salary AS y FROM employees) SELECT ROUND((COUNT(*) * SUM(x * y) - SUM(x) * SUM(y)) / (SQRT(COUNT(*) * SUM(x * x) - SUM(x) * SUM(x)) * SQRT(COUNT(*) * SUM(y * y) - SUM(y) * SUM(y))), 3) AS r FROM t;",
    { hint: 'Ders anlatımındaki formülü kullan; önce x ve y\'yi bir CTE\'de hazırla.' }));

add('ds-ab',
  sq('A/B testinde her varyant için dönüşüm oranını yüzde olarak (2 basamak) ve B\'nin A\'ya göre <b>göreli artışını</b> (yüzde, 1 basamak) tek satırda getir: <code>oran_a</code>, <code>oran_b</code>, <code>artis</code>.',
    "WITH g AS (SELECT variant, AVG(converted) AS p FROM ab_test GROUP BY variant) SELECT ROUND(100.0 * a.p, 2) AS oran_a, ROUND(100.0 * b.p, 2) AS oran_b, ROUND(100.0 * (b.p - a.p) / a.p, 1) AS artis FROM g a CROSS JOIN g b WHERE a.variant = 'A' AND b.variant = 'B';",
    { hint: 'Varyant oranlarını bir CTE\'de hesapla; CTE\'yi kendisiyle CROSS JOIN yaparak A ve B\'yi aynı satıra getir.' }));

add('ds-feature',
  sq('Her müşteri için (siparişi olanlar) iki zaman özelliği üret: ilk siparişten son siparişe geçen gün (<code>omur_gun</code>) ve siparişler arası ortalama gün (<code>ort_aralik</code>, 1 basamak; tek siparişi olanlarda NULL). Sütunlar: <code>customer_id</code>, <code>siparis</code>, <code>omur_gun</code>, <code>ort_aralik</code>. Yalnızca 1–10 numaralı müşteriler.',
    "SELECT customer_id, COUNT(*) AS siparis, julianday(MAX(order_date)) - julianday(MIN(order_date)) AS omur_gun, ROUND(1.0 * (julianday(MAX(order_date)) - julianday(MIN(order_date))) / NULLIF(COUNT(*) - 1, 0), 1) AS ort_aralik FROM orders WHERE customer_id <= 10 GROUP BY customer_id;",
    { hint: 'Ortalama aralık = ömür / (sipariş − 1). Sıfıra bölmeyi NULLIF ile önle; tam sayı bölmesine düşmemek için 1.0 ile çarp.' }),
  sq('Her müşteri için sipariş verdiği <b>farklı kategori sayısını</b> özellik olarak üret ve bu sayıya göre müşteri dağılımını getir: <code>kategori_sayisi</code>, <code>musteri</code>. Kategori sayısına göre sırala.',
    'WITH m AS (SELECT o.customer_id, COUNT(DISTINCT p.category) AS kategori_sayisi FROM orders o JOIN order_items oi ON oi.order_id = o.order_id JOIN products p ON p.product_id = oi.product_id GROUP BY o.customer_id) SELECT kategori_sayisi, COUNT(*) AS musteri FROM m GROUP BY kategori_sayisi ORDER BY kategori_sayisi;',
    { ord: true, hint: 'COUNT(DISTINCT p.category) müşteri başına; sonra bu değere göre grupla.' }));

add('ds-zaman',
  sq('2024\'ün her ayı için sipariş sayısını ve <b>geçen yılın aynı ayının</b> değerini (lag_12) getir: <code>ay</code>, <code>y</code>, <code>lag_12</code>. 2023 ve 2024 verisini birlikte numaralandır, sonra yalnızca 2024 satırlarını göster.',
    "WITH m AS (SELECT strftime('%Y-%m', order_date) AS ay, COUNT(*) AS y FROM orders WHERE order_date >= '2023-01-01' AND order_date < '2025-01-01' GROUP BY strftime('%Y-%m', order_date)), l AS (SELECT ay, y, LAG(y, 12) OVER (ORDER BY ay) AS lag_12 FROM m) SELECT ay, y, lag_12 FROM l WHERE ay >= '2024-01' ORDER BY ay;",
    { ord: true, hint: 'LAG(y, 12) 12 satır önceki değeri getirir. Filtreyi pencere fonksiyonundan sonra (dış sorguda) uygula; yoksa 2023 değerleri kaybolur.' }),
  sq('2024 için günlük sipariş sayısını ve 7 günlük hareketli toplamı (bu gün ve önceki 6 sipariş günü) getir; yalnızca Aralık ayı satırlarını göster: <code>gun</code>, <code>siparis</code>, <code>toplam_7</code>.',
    "WITH d AS (SELECT order_date AS gun, COUNT(*) AS siparis FROM orders WHERE order_date >= '2024-01-01' AND order_date < '2025-01-01' GROUP BY order_date), w AS (SELECT gun, siparis, SUM(siparis) OVER (ORDER BY gun ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS toplam_7 FROM d) SELECT gun, siparis, toplam_7 FROM w WHERE gun >= '2024-12-01' ORDER BY gun;",
    { ord: true, hint: 'ROWS BETWEEN 6 PRECEDING AND CURRENT ROW. Aralık filtresini dış sorguda uygula.' }));

add('de-kalite',
  sq('Bir iş kuralı testi yaz. Kural: “Her ürünün fiyatı maliyetinin en az 1,5 katı olmalı; fiyat ve maliyet sıfırdan büyük olmalı.” Kuralı <b>ihlal eden</b> ürünleri getir (test geçseydi sorgu sıfır satır döndürürdü): <code>product_id</code>, <code>name</code>, <code>price</code>, <code>cost</code>.',
    'SELECT product_id, name, price, cost FROM products WHERE price < cost * 1.5 OR price <= 0 OR cost <= 0;',
    { hint: 'Kuralın tersini WHERE ile yaz: price < cost * 1.5 OR price <= 0 OR cost <= 0.', why: 'Bu ürünler kuralı ihlal ediyor. Gerçek bir veri hattında bu test başarısız olur ve ekip uyarılır.' }));
/* Oracle boş metni NULL saklar; bu yüzden tam tekrar sayısı programdan bağımsız bir kontrolle ölçülür */
{ const e = (LM('de-dedup') || { ex: [] }).ex[1]; if (e && e.check) e.check = 'SELECT COUNT(DISTINCT id) AS kimlik, COUNT(*) - (SELECT COUNT(*) FROM (SELECT DISTINCT id, full_name, email, city, signup_date FROM raw_signups) x) AS fazla FROM raw_signups'; }

add('de-dedup',
  sq('<code>raw_signups</code> tablosunda normalize edilmiş e-posta (<code>LOWER(TRIM(email))</code>) başına kaç kayıt olduğunu bul ve <b>birden fazla</b> kaydı olan e-postaları getir: <code>email</code>, <code>adet</code>. Adede göre azalan, eşitlikte e-postaya göre sırala.',
    'SELECT LOWER(TRIM(email)) AS email, COUNT(*) AS adet FROM raw_signups WHERE email IS NOT NULL GROUP BY LOWER(TRIM(email)) HAVING COUNT(*) > 1 ORDER BY adet DESC, email;',
    { ord: true, hint: 'GROUP BY LOWER(TRIM(email)) HAVING COUNT(*) > 1' }));

add('de-incremental',
  sq('Artımlı yüklemede “hangi kayıtlar yeni?” sorusu: <code>price_updates</code> tablosunda 2024-11-15 00:00 sonrasında gelen güncellemeleri ve bunların hangi ürüne ait olduğunu getir: <code>product_id</code>, <code>name</code>, <code>new_price</code>, <code>updated_at</code>. Güncelleme zamanına göre sırala.',
    "SELECT u.product_id, p.name, u.new_price, u.updated_at FROM price_updates u JOIN products p ON p.product_id = u.product_id WHERE u.updated_at > '2024-11-15 00:00:00' ORDER BY u.updated_at;",
    { ord: true, hint: 'Watermark değerinden büyük kayıtları seç; >= yerine > kullanmak aynı anı iki kez yüklemeyi önler.' }),
  sq('Başlangıç kodu hedef tabloyu boş oluşturuyor. Kaynaktaki (<code>price_updates</code>) kayıtlardan hedefte <b>henüz olmayanları</b> (product_id ve updated_at aynı olan kayıt yoksa) NOT EXISTS ile ekleyen INSERT ifadesini yaz; ifade iki kez çalıştırılsa bile tekrar oluşmasın.',
    'CREATE TABLE price_stage AS SELECT * FROM price_updates WHERE 1 = 0; INSERT INTO price_stage SELECT * FROM price_updates u WHERE NOT EXISTS (SELECT 1 FROM price_stage s WHERE s.product_id = u.product_id AND s.updated_at = u.updated_at); INSERT INTO price_stage SELECT * FROM price_updates u WHERE NOT EXISTS (SELECT 1 FROM price_stage s WHERE s.product_id = u.product_id AND s.updated_at = u.updated_at);',
    { start: 'CREATE TABLE price_stage AS SELECT * FROM price_updates WHERE 1 = 0;\n-- Aşağıya INSERT ... SELECT ... WHERE NOT EXISTS (...) ifadesini yaz.\n-- İfadeyi iki kez yazıp çalıştırarak tekrar oluşmadığını görebilirsin.\n', check: 'SELECT COUNT(*) AS satir, COUNT(DISTINCT product_id || updated_at) AS tekil FROM price_stage', dl: ['sqlite', 'pg', 'mysql', 'oracle'], hint: 'INSERT INTO price_stage SELECT * FROM price_updates u WHERE NOT EXISTS (SELECT 1 FROM price_stage s WHERE s.product_id = u.product_id AND s.updated_at = u.updated_at);' }));

add('de-scd',
  sq('SCD Tip 2 kontrolü: <code>price_updates</code> tablosunda her ürünün fiyat geçmişini LEAD ile aralıklara çevir ve <b>birden fazla</b> fiyat dönemi olan ürünleri, dönem sayılarıyla getir: <code>product_id</code>, <code>donem</code>. Ürün numarasına göre sırala.',
    'SELECT product_id, COUNT(*) AS donem FROM price_updates GROUP BY product_id HAVING COUNT(*) > 1 ORDER BY product_id;',
    { ord: true, hint: 'Her güncelleme yeni bir dönem başlatır; ürün başına güncelleme sayısı dönem sayısıdır.' }));

add('bi-hazirlik',
  sq('BI aracı için tarih boyutu üret: 2024 Ocak ayının her günü için <code>tarih</code>, <code>yil</code>, <code>ay</code>, <code>gun</code> sütunlarını içeren 31 satırlık bir tablo getir. Özyinelemeli CTE kullan.',
    "WITH RECURSIVE g(d) AS (SELECT '2024-01-01' UNION ALL SELECT date(d, '+1 day') FROM g WHERE d < '2024-01-31') SELECT d AS tarih, CAST(strftime('%Y', d) AS INTEGER) AS yil, CAST(strftime('%m', d) AS INTEGER) AS ay, CAST(strftime('%d', d) AS INTEGER) AS gun FROM g;",
    { hint: 'Başlangıç: SELECT \'2024-01-01\', adım: bir gün ekle, durma: 31 Ocak.' }));

add('an-dashboard',
  sq('Dashboard kartı için tek satırlık özet: 2024 yılında toplam sipariş (<code>siparis</code>), teslim edilen sipariş (<code>teslim</code>), iptal oranı yüzde olarak (<code>iptal_orani</code>, 1 basamak) ve sipariş veren farklı müşteri sayısı (<code>musteri</code>).',
    "SELECT COUNT(*) AS siparis, SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) AS teslim, ROUND(100.0 * SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) / COUNT(*), 1) AS iptal_orani, COUNT(DISTINCT customer_id) AS musteri FROM orders WHERE order_date >= '2024-01-01' AND order_date < '2025-01-01';",
    { hint: 'Hepsi tek bir SELECT; koşullu sayımlar için SUM(CASE ...).' }),
  sq('Kanal kırılımlı aylık trend tablosu: 2024 için her ay ve kanal için sipariş sayısı, sipariş olmayan ay-kanal birleşimleri 0 görünsün: <code>ay</code>, <code>channel</code>, <code>siparis</code>. Önce ay ve kanal listelerini CROSS JOIN ile birleştir. Aya, sonra kanala göre sırala.',
    "WITH a AS (SELECT DISTINCT strftime('%Y-%m', order_date) AS ay FROM orders WHERE order_date >= '2024-01-01' AND order_date < '2025-01-01'), k AS (SELECT DISTINCT channel FROM orders), s AS (SELECT strftime('%Y-%m', order_date) AS ay, channel, COUNT(*) AS n FROM orders WHERE order_date >= '2024-01-01' AND order_date < '2025-01-01' GROUP BY strftime('%Y-%m', order_date), channel) SELECT a.ay, k.channel, COALESCE(s.n, 0) AS siparis FROM a CROSS JOIN k LEFT JOIN s ON s.ay = a.ay AND s.channel = k.channel ORDER BY a.ay, k.channel;",
    { ord: true, hint: 'Tüm ay × kanal birleşimlerini CROSS JOIN ile üret, gerçek sayıları LEFT JOIN ile bağla, eksikleri COALESCE ile 0 yap.' }));

add('ileri-desenler',
  sq('Her müşterinin ardışık iki siparişi arasındaki <b>en uzun</b> süreyi gün olarak bul ve en uzun ara veren 5 müşteriyi getir: <code>customer_id</code>, <code>en_uzun_ara</code>. Süreye göre azalan, eşitlikte müşteri numarasına göre sırala.',
    'WITH t AS (SELECT customer_id, julianday(order_date) - julianday(LAG(order_date) OVER (PARTITION BY customer_id ORDER BY order_date, order_id)) AS ara FROM orders) SELECT customer_id, MAX(ara) AS en_uzun_ara FROM t WHERE ara IS NOT NULL GROUP BY customer_id ORDER BY en_uzun_ara DESC, customer_id LIMIT 5;',
    { ord: true, hint: 'LAG ile önceki siparişin tarihini al, gün farkını hesapla, sonra müşteri başına MAX. Tek siparişi olan müşterilerde fark NULL olur; PostgreSQL ve Oracle azalan sıralamada NULL\'ları en üste koyar, bu yüzden WHERE ara IS NOT NULL ile ele.' }));

add('veri-seti',
  sq('Veri setini tanımak için üç tablonun satır sayısını tek sonuçta getir: <code>tablo</code> (\'customers\', \'orders\', \'products\'), <code>satir</code>. UNION ALL kullan.',
    "SELECT 'customers' AS tablo, COUNT(*) AS satir FROM customers UNION ALL SELECT 'orders', COUNT(*) FROM orders UNION ALL SELECT 'products', COUNT(*) FROM products;",
    { hint: "Her tablo için SELECT 'ad', COUNT(*) FROM tablo yaz ve UNION ALL ile alt alta ekle." }));

add('sozdizimi',
  sq('Okunabilir yazım kurallarına uyarak (anahtar kelimeler büyük harf, her yan cümle ayrı satırda) Kitap kategorisindeki ürünlerin adını ve fiyatını pahalıdan ucuza getir: <code>name</code>, <code>price</code>.',
    "SELECT name, price\nFROM products\nWHERE category = 'Kitap'\nORDER BY price DESC, name;",
    { ord: true, hint: 'SELECT, FROM, WHERE ve ORDER BY her biri ayrı satırda. Metin sabiti tek tırnakla yazılır.' }));

add('alter-drop',
  sq('<code>departments</code> tablosuna <code>phone</code> adında, en fazla 20 karakterlik bir metin sütunu ekle; ardından 1 numaralı departmanın telefonunu <b>\'0212 555 00 00\'</b> yap.',
    "ALTER TABLE departments ADD COLUMN phone VARCHAR(20); UPDATE departments SET phone = '0212 555 00 00' WHERE dept_id = 1;",
    { check: 'SELECT dept_id, phone FROM departments ORDER BY dept_id', hint: 'İki ifade: ALTER TABLE ... ADD (SQL Server ve Oracle\'da COLUMN kelimesi yazılmaz) ve UPDATE ... WHERE dept_id = 1.' }));

add('transaction',
  sq('Bir işlem içinde Kitap kategorisindeki ürünlere %10 zam yap, ardından bir kayıt noktası (<code>SAVEPOINT s1</code>) oluştur, sonra Kitap ürünlerini sil. Silmeden vazgeçip kayıt noktasına dön ve işlemi onayla. Sonuçta kitaplar silinmemiş ama zamlı olmalı.',
    "BEGIN; UPDATE products SET price = price * 1.10 WHERE category = 'Kitap'; SAVEPOINT s1; DELETE FROM products WHERE category = 'Kitap'; ROLLBACK TO s1; COMMIT;",
    { check: "SELECT COUNT(*) AS kitap, ROUND(SUM(price), 2) AS toplam FROM products WHERE category = 'Kitap'", dl: ['sqlite', 'pg', 'mysql', 'tsql', 'oracle'], solv: { tsql: "BEGIN TRANSACTION; UPDATE products SET price = price * 1.10 WHERE category = 'Kitap'; SAVE TRANSACTION s1; DELETE FROM products WHERE category = 'Kitap'; ROLLBACK TRANSACTION s1; COMMIT;", mysql: "START TRANSACTION; UPDATE products SET price = price * 1.10 WHERE category = 'Kitap'; SAVEPOINT s1; DELETE FROM products WHERE category = 'Kitap'; ROLLBACK TO s1; COMMIT;", oracle: "UPDATE products SET price = price * 1.10 WHERE category = 'Kitap'; SAVEPOINT s1; DELETE FROM products WHERE category = 'Kitap'; ROLLBACK TO s1; COMMIT;" }, hint: 'SQL Server: SAVE TRANSACTION s1 ve ROLLBACK TRANSACTION s1. Oracle\'da BEGIN yazılmaz; işlem ilk DML ile kendiliğinden başlar.' }));

add('index',
  sq('<code>departments</code> tablosunda departman adlarının tekrar etmemesini sağlayan <code>ux_departments_name</code> adında bir <b>benzersiz indeks</b> oluştur.',
    'CREATE UNIQUE INDEX ux_departments_name ON departments(name);',
    { check: "SELECT name, \"unique\" FROM pragma_index_list('departments') WHERE name = 'ux_departments_name'", dl: ['tsql', 'pg', 'mysql', 'oracle', 'sqlite'], hint: 'CREATE UNIQUE INDEX ad ON tablo(sütun);' }));

add('sargable',
  sq('Adı <b>Ko</b> ile başlayan ürünlerin sayısını getir; <code>SUBSTR</code> / <code>LEFT</code> gibi bir fonksiyonu sütuna uygulamadan, indeks kullanılabilecek biçimde yaz: <code>adet</code>.',
    "SELECT COUNT(*) AS adet FROM products WHERE name LIKE 'Ko%';",
    { hint: "Baştaki sabit kısımla LIKE 'Ko%' indeks aralığı olarak kullanılabilir; SUBSTR(name, 1, 2) = 'Ko' kullanılamaz." }));

add('pg-ozel',
  sq('PostgreSQL yazımıyla: <b>DISTINCT ON</b> kullanarak 1–5 numaralı müşterilerin her birinin <b>en son</b> siparişini getir: <code>customer_id</code>, <code>order_id</code>, <code>order_date</code>.',
    'SELECT DISTINCT ON (customer_id) customer_id, order_id, order_date FROM orders WHERE customer_id <= 5 ORDER BY customer_id, order_date DESC, order_id DESC;',
    { base: 'pg', dl: ['pg'], hint: 'DISTINCT ON (customer_id) her müşteri için ORDER BY sırasındaki ilk satırı bırakır; ORDER BY customer_id ile başlamalıdır.' }));

add('mysql-ozel',
  sq('MySQL yazımıyla: 2024 siparişlerini <code>DATE_FORMAT(order_date, \'%Y-%m\')</code> ile aylara göre say: <code>ay</code>, <code>siparis</code>. Aya göre sırala.',
    "SELECT DATE_FORMAT(order_date, '%Y-%m') AS ay, COUNT(*) AS siparis FROM orders WHERE order_date >= '2024-01-01' AND order_date < '2025-01-01' GROUP BY DATE_FORMAT(order_date, '%Y-%m') ORDER BY ay;",
    { base: 'mysql', dl: ['mysql'], ord: true, hint: "DATE_FORMAT biçim kodları: %Y yıl, %m ay. Filtrede YEAR() yerine aralık kullanmak indeks dostudur." }));

add('oracle-ozel',
  sq('Oracle yazımıyla: <b>DECODE</b> kullanarak sipariş durumlarını Türkçeleştir (delivered → \'Teslim\', cancelled → \'İptal\', diğerleri → \'Diğer\') ve her durumdaki sipariş sayısını getir: <code>durum</code>, <code>siparis</code>.',
    "SELECT DECODE(status, 'delivered', 'Teslim', 'cancelled', 'İptal', 'Diğer') AS durum, COUNT(*) AS siparis FROM orders GROUP BY DECODE(status, 'delivered', 'Teslim', 'cancelled', 'İptal', 'Diğer');",
    { base: 'oracle', dl: ['oracle'], hint: 'DECODE(sütun, değer1, sonuç1, değer2, sonuç2, varsayılan). Oracle\'da GROUP BY içinde SELECT takma adı kullanılamaz; ifadeyi tekrar yaz.' }));

/* ======================= Patikalar ======================= */
const PA = {}; (window.SQLP_PATHS || []).forEach(p => PA[p.id] = p);
/* Bağlantı dersi patikada yoksa ekleme yapılmaz (sona eklenip sırayı bozmasın) */
const ins = (pid, afterId, ids) => { const p = PA[pid]; if (!p) return; ids = ids.filter(x => !p.lessons.includes(x)); const i = p.lessons.indexOf(afterId); if (i < 0) return; p.lessons.splice(i + 1, 0, ...ids); };
const move = (pid, id, afterId) => { const p = PA[pid]; if (!p) return; const i = p.lessons.indexOf(id); if (i >= 0) p.lessons.splice(i, 1); ins(pid, afterId, [id]); };
['temel', 'analist', 'bi', 'sertifika', 'tsql', 'bilimci', 'yz'].forEach(pid => {
  ins(pid, 'in-between-like', ['like-escape']);
  ins(pid, 'having', ['metin-birlestir']);
  ins(pid, 'coalesce', ['null-guvenli']);
});
ins('temel', 'kosullu', ['dml']);
ins('temel', 'stil', ['proje-temel']);
ins('analist', 'stil', ['proje-temel']);
ins('bi', 'stil', ['proje-temel']);
ins('sertifika', 'having', ['proje-temel']);
['temel', 'analist', 'bilimci', 'uzman', 'backend', 'sertifika', 'muhendis'].forEach(pid => ins(pid, 'correlated', ['lateral']));
ins('tsql', 'ts-apply', ['lateral']);
ins('muhendis', 'kosullu', ['null-guvenli']);
ins('backend', 'coalesce', ['null-guvenli', 'like-escape']);
if (PA.temel && PA.temel.comp) PA.temel.comp.push({ t: 'Temel bitirme projesi', d: 'Tek tabloyla altı soruluk bir yönetici raporu', l: ['proje-temel'] });
/* Sertifika patikasında DML artık temel bölümünde */
move('sertifika', 'dml', 'coalesce');

/* ======================= Alıştırma bankası: zayıf konular ======================= */
const PR = window.SQLP_PRACTICE = window.SQLP_PRACTICE || [];
const P = (id, Lv, t, d, title, q, sol, o) => PR.push(Object.assign({ id, L: Lv, t, d, title, q: '<p>' + q + '</p>', sol, type: 'sql' }, o || {}));
/* orta: tarih */
P('o259', 'orta', 'tar', 1, 'Kayıt yılları', 'Müşterileri kayıt yılına göre say: <code>yil</code>, <code>musteri</code>. Yıla göre sırala.',
  "SELECT strftime('%Y', signup_date) AS yil, COUNT(*) AS musteri FROM customers GROUP BY strftime('%Y', signup_date) ORDER BY yil;", { ord: true });
P('o260', 'orta', 'tar', 2, 'Beklenen teslim', '1 numaralı müşterinin siparişleri için sipariş tarihinden 7 gün sonrasını beklenen teslim tarihi olarak getir: <code>order_id</code>, <code>order_date</code>, <code>beklenen</code>. Tarihe göre sırala.',
  "SELECT order_id, order_date, date(order_date, '+7 days') AS beklenen FROM orders WHERE customer_id = 1 ORDER BY order_date, order_id;", { ord: true });
P('o261', 'orta', 'tar', 2, 'Ayın son siparişi', '2024\'ün her ayında verilen son siparişin tarihini getir: <code>ay</code> (YYYY-AA), <code>son_siparis</code>. Aya göre sırala.',
  "SELECT strftime('%Y-%m', order_date) AS ay, MAX(order_date) AS son_siparis FROM orders WHERE order_date >= '2024-01-01' AND order_date < '2025-01-01' GROUP BY strftime('%Y-%m', order_date) ORDER BY ay;", { ord: true });
P('o262', 'orta', 'tar', 3, 'Siparişler arası gün', '2 numaralı müşterinin her siparişi için bir önceki siparişinden bu yana geçen gün sayısını getir (ilk siparişte NULL): <code>order_id</code>, <code>order_date</code>, <code>gun_farki</code>. Tarihe göre sırala.',
  'SELECT order_id, order_date, julianday(order_date) - julianday(LAG(order_date) OVER (ORDER BY order_date, order_id)) AS gun_farki FROM orders WHERE customer_id = 2 ORDER BY order_date, order_id;', { ord: true });
P('o263', 'orta', 'tar', 2, 'Kayıttan ilk siparişe', 'Siparişi olan müşterilerde kayıt tarihinden ilk siparişe geçen ortalama gün sayısını (1 basamak) hesapla. Tek değer: <code>ort_gun</code>.',
  'WITH f AS (SELECT c.customer_id, julianday(MIN(o.order_date)) - julianday(c.signup_date) AS gun FROM customers c JOIN orders o ON o.customer_id = c.customer_id GROUP BY c.customer_id, c.signup_date) SELECT ROUND(AVG(gun), 1) AS ort_gun FROM f;');
/* orta: pivot */
P('o264', 'orta', 'piv', 2, 'Kanal ve durum', 'Her kanal için teslim edilen ve iptal edilen sipariş sayılarını yan yana, ayrıca iptal oranını (yüzde, 1 basamak) getir: <code>channel</code>, <code>teslim</code>, <code>iptal</code>, <code>iptal_orani</code>.',
  "SELECT channel, SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) AS teslim, SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS iptal, ROUND(100.0 * SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) / COUNT(*), 1) AS iptal_orani FROM orders GROUP BY channel;");
P('o265', 'orta', 'piv', 3, 'Yıllara göre kategori cirosu', 'Teslim edilmiş siparişlerde her kategorinin 2023 ve 2024 net cirosunu (tam sayı) yan yana getir: <code>category</code>, <code>c2023</code>, <code>c2024</code>.',
  `SELECT p.category, ROUND(SUM(CASE WHEN o.order_date >= '2023-01-01' AND o.order_date < '2024-01-01' THEN ${NET} ELSE 0 END)) AS c2023, ROUND(SUM(CASE WHEN o.order_date >= '2024-01-01' AND o.order_date < '2025-01-01' THEN ${NET} ELSE 0 END)) AS c2024 FROM orders o JOIN order_items oi ON oi.order_id = o.order_id JOIN products p ON p.product_id = oi.product_id WHERE o.status = 'delivered' GROUP BY p.category;`);
P('o266', 'orta', 'piv', 2, 'Cihaz ve olay', 'Her cihaz (<code>device</code>) için ziyaret (visit) ve satın alma (purchase) olay sayılarını yan yana getir: <code>device</code>, <code>visit</code>, <code>purchase</code>.',
  "SELECT device, SUM(CASE WHEN event_type = 'visit' THEN 1 ELSE 0 END) AS visit, SUM(CASE WHEN event_type = 'purchase' THEN 1 ELSE 0 END) AS purchase FROM web_events GROUP BY device;");
/* ileri: pencere */
P('i267', 'ileri', 'pen', 2, 'Sipariş sırası ve toplam', '1–3 numaralı müşterilerin her siparişi için müşterinin kaçıncı siparişi olduğunu ve müşterinin toplam sipariş sayısını getir: <code>customer_id</code>, <code>order_id</code>, <code>sira</code>, <code>toplam</code>. Müşteriye ve sıraya göre sırala.',
  'SELECT customer_id, order_id, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date, order_id) AS sira, COUNT(*) OVER (PARTITION BY customer_id) AS toplam FROM orders WHERE customer_id <= 3 ORDER BY customer_id, sira;', { ord: true });
P('i268', 'ileri', 'pen', 2, 'Kategori içi fiyat payı', 'Her ürünün fiyatının, kategorisindeki ürünlerin fiyat toplamına oranını yüzde olarak (1 basamak) getir: <code>category</code>, <code>name</code>, <code>pay</code>.',
  'SELECT category, name, ROUND(100.0 * price / SUM(price) OVER (PARTITION BY category), 1) AS pay FROM products;');
P('i269', 'ileri', 'pen', 2, 'Departman ortalamasına uzaklık', 'Her çalışanın maaşının departman ortalamasından farkını (tam sayı) getir; departmanı olmayanları hariç tut: <code>first_name</code>, <code>dept_id</code>, <code>salary</code>, <code>fark</code>.',
  'SELECT first_name, dept_id, salary, ROUND(salary - AVG(salary) OVER (PARTITION BY dept_id)) AS fark FROM employees WHERE dept_id IS NOT NULL;');
P('i270', 'ileri', 'pen', 3, 'Hesap bakiyesi', '100019 numaralı hesabın işlemlerini zamana göre sırala ve her işlemden sonraki kümülatif bakiyeyi (2 basamak) göster; ilk 10 işlem: <code>txn_id</code>, <code>txn_time</code>, <code>amount</code>, <code>bakiye</code>.',
  'SELECT txn_id, txn_time, amount, ROUND(SUM(amount) OVER (ORDER BY txn_time, txn_id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW), 2) AS bakiye FROM bank_txns WHERE account_id = 100019 ORDER BY txn_time, txn_id LIMIT 10;', { ord: true });
/* ileri: pivot ve ara toplam */
P('i271', 'ileri', 'piv', 2, 'Toplam satırı', 'Kanal başına sipariş sayısını getir ve en alta <b>\'TOPLAM\'</b> etiketli genel toplam satırı ekle (UNION ALL ile): <code>channel</code>, <code>siparis</code>.',
  "SELECT channel, siparis FROM (SELECT channel, COUNT(*) AS siparis, 0 AS s FROM orders GROUP BY channel UNION ALL SELECT 'TOPLAM', COUNT(*), 1 FROM orders) t ORDER BY s, channel;", { ord: true });
P('i272', 'ileri', 'piv', 3, 'Sütundan satıra', 'Kitap kategorisindeki ürünlerin fiyat ve maliyetini satırlara çevir (unpivot): <code>name</code>, <code>tur</code> (\'fiyat\' veya \'maliyet\'), <code>deger</code>. Ada, sonra türe göre sırala.',
  "SELECT name, 'fiyat' AS tur, price AS deger FROM products WHERE category = 'Kitap' UNION ALL SELECT name, 'maliyet', cost FROM products WHERE category = 'Kitap' ORDER BY name, tur;", { ord: true });
})();
