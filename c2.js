/* Kesit SQL içerik 2: B1 Orta (JOIN, küme, alt sorgu), B2 İleri-Orta (CTE, pencere) */
(window.SQLP_LESSONS = window.SQLP_LESSONS || []).push(

/* ======================= B1 ======================= */
{
  id: 'iliskiler', lv: 'B1', mod: 'Tabloları Birleştirme', min: 10,
  title: 'İlişkiler: bire-bir, bire-çok, çoka-çok',
  sum: 'Tablolar neden ayrı tutulur ve anahtarlar onları nasıl bağlar?',
  body: `
<h2>Neden her şey tek tabloda değil?</h2>
<p>Her siparişin içine müşterinin adını, şehrini, e-postasını tekrar tekrar yazsaydık: veri şişer, müşteri adres değiştirdiğinde yüzlerce satırı güncellememiz gerekir ve tutarsızlık kaçınılmaz olur. İlişkisel tasarım her bilgiyi <b>bir kez</b> saklar ve anahtarlarla bağlar.</p>
<h2>İlişki türleri</h2>
<table><tr><th>Tür</th><th>Örnek</th><th>Nasıl kurulur?</th></tr>
<tr><td>Bire-çok (1:N)</td><td>Bir müşterinin çok siparişi olur</td><td><code>orders.customer_id</code> → <code>customers.customer_id</code></td></tr>
<tr><td>Çoka-çok (N:M)</td><td>Bir siparişte çok ürün, bir ürün çok siparişte</td><td>Ara tablo: <code>order_items</code> (order_id, product_id)</td></tr>
<tr><td>Bire-bir (1:1)</td><td>Bir çalışanın bir özlük dosyası</td><td>Aynı anahtarı paylaşan iki tablo</td></tr>
<tr><td>Kendine referans</td><td>Çalışanın yöneticisi de bir çalışandır</td><td><code>employees.manager_id</code> → <code>employees.emp_id</code></td></tr>
</table>
<h2>Anadolu Market şeması</h2>
<pre class="code" data-norun>customers (customer_id PK)
   └─< orders (order_id PK, customer_id FK)
          └─< order_items (item_id PK, order_id FK, product_id FK) >─┐
products (product_id PK) ────────────────────────────────────────────┘
departments (dept_id PK) ─< employees (emp_id PK, dept_id FK, manager_id FK → emp_id)</pre>
<p><code>─&lt;</code> işareti “bire-çok” demektir. JOIN, bu okları takip ederek tabloları birleştirmektir.</p>
`,
  ex: [
    { t: 'mc', q: '<p><code>orders</code> ile <code>products</code> arasındaki ilişki nedir ve hangi tablo onu kurar?</p>', o: ['Bire-bir; orders', 'Bire-çok; products', 'Çoka-çok; order_items', 'İlişki yoktur'], a: 2, why: 'Bir sipariş birden çok ürün, bir ürün birden çok sipariş içerebilir. Ara tablo order_items bu ilişkiyi kurar.' },
    { t: 'mc', q: '<p><code>employees.manager_id</code> neyi gösterir?</p>', o: ['departments tablosunu', 'Aynı tablodaki başka bir çalışanı', 'customers tablosunu', 'Hiçbir şeyi, sadece sayıdır'], a: 1, why: 'Kendine referans veren (self-referencing) yabancı anahtar. Self join dersinde kullanacağız.' }
  ]
},
{
  id: 'inner-join', lv: 'B1', mod: 'Tabloları Birleştirme', min: 15,
  title: 'INNER JOIN',
  sum: 'İki tablonun eşleşen satırlarını birleştirmek.',
  body: `
<h2>Eşleşenleri birleştir</h2>
<p><b>INNER JOIN</b>, ON koşulunu sağlayan satır çiftlerini birleştirir. Eşi olmayan satırlar sonuçta yer almaz.</p>
<pre class="code">SELECT o.order_id, o.order_date, c.first_name, c.last_name
FROM orders AS o
INNER JOIN customers AS c
        ON o.customer_id = c.customer_id
LIMIT 10;</pre>
<ul>
<li><code>o</code> ve <code>c</code> tablo takma adlarıdır; sorguyu kısaltır.</li>
<li>Aynı adlı sütun iki tabloda varsa (<code>customer_id</code> gibi) hangi tablodan geldiğini belirtmen gerekir: <code>o.customer_id</code>.</li>
<li><code>INNER</code> kelimesi isteğe bağlıdır; sadece <code>JOIN</code> yazmak aynı şeydir.</li>
</ul>
<h2>Join'den sonra gruplama</h2>
<p>Kategori bazında satılan adet:</p>
<pre class="code">SELECT p.category, SUM(oi.quantity) AS adet
FROM order_items oi
JOIN products p ON p.product_id = oi.product_id
GROUP BY p.category
ORDER BY adet DESC;</pre>
<h2>Eski usul yazım</h2>
<p>Eski kodlarda <code>FROM a, b WHERE a.id = b.a_id</code> görebilirsin. Aynı sonucu verir ama birleştirme koşulunu WHERE'e karıştırdığı için okunması zordur ve koşul unutulursa her satırı her satırla eşleştirir. Açık <code>JOIN ... ON</code> yazımını tercih et.</p>
<div class="tip"><b>USING</b>Birleştirilen sütunun adı iki tabloda aynıysa <code>JOIN customers USING (customer_id)</code> kısaltması kullanılabilir.</div>
`,
  ex: [
    { t: 'sql', q: '<p>Her çalışanın adını (<code>first_name</code>) ve <b>departman adını</b> (<code>departments.name</code>) getir. Departmanı olmayan çalışan sonuçta görünmeyecek.</p>', sol: 'SELECT e.first_name, d.name FROM employees e JOIN departments d ON e.dept_id = d.dept_id;' },
    { t: 'sql', q: '<p><code>order_items</code> ile <code>products</code>\'ı birleştirerek her <b>kategori</b> için toplam ciroyu (<code>quantity * unit_price * (1 - discount)</code>) hesapla, 2 basamağa yuvarla, ciroya göre azalan sırala.</p>', sol: 'SELECT p.category, ROUND(SUM(oi.quantity * oi.unit_price * (1 - oi.discount)), 2) AS ciro FROM order_items oi JOIN products p ON p.product_id = oi.product_id GROUP BY p.category ORDER BY ciro DESC;', ord: true },
    { t: 'sql', q: '<p><b>İzmir</b>\'deki müşterilerin verdiği siparişlerin sayısını bul (tek sayı).</p>', sol: "SELECT COUNT(*) FROM orders o JOIN customers c ON c.customer_id = o.customer_id WHERE c.city = 'İzmir';" },
    { t: 'sql', q: '<p>Her müşterinin adı, soyadı ve <b>sipariş sayısı</b>nı getir; en çok sipariş verenden başlayarak ilk 5 müşteriyi listele. Eşitlikte <code>customer_id</code> küçük olan önce gelsin.</p>', sol: 'SELECT c.first_name, c.last_name, COUNT(*) AS siparis FROM customers c JOIN orders o ON o.customer_id = c.customer_id GROUP BY c.customer_id, c.first_name, c.last_name ORDER BY siparis DESC, c.customer_id LIMIT 5;', ord: true, hint: 'Ada göre değil, <code>customer_id</code>\'ye göre grupla; aynı adlı farklı müşteriler olabilir.' }
  ]
},
{
  id: 'left-join', lv: 'B1', mod: 'Tabloları Birleştirme', min: 15,
  title: 'LEFT JOIN ve eşi olmayanları bulmak',
  sum: 'Sol tablonun tüm satırlarını korumak, anti-join kalıbı.',
  body: `
<h2>Soldaki her satır kalsın</h2>
<p><b>LEFT JOIN</b> (LEFT OUTER JOIN), sol tablodaki <b>tüm</b> satırları döndürür. Sağda eşi yoksa sağ tablonun sütunları NULL gelir.</p>
<pre class="code">SELECT d.name AS departman, e.first_name
FROM departments d
LEFT JOIN employees e ON e.dept_id = d.dept_id
ORDER BY d.dept_id;</pre>
<p>Hukuk departmanında çalışan olmadığı için o satırda <code>first_name</code> NULL görünür. INNER JOIN kullansaydık Hukuk hiç görünmezdi.</p>
<h2>Anti-join: hiç sipariş vermemiş müşteriler</h2>
<p>LEFT JOIN'den sonra sağ tablonun anahtarı NULL olan satırları seçmek, “eşi olmayanları” bulmanın klasik yoludur:</p>
<pre class="code">SELECT c.customer_id, c.first_name, c.last_name
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id
WHERE o.order_id IS NULL;</pre>
<h2>ON mu WHERE mi?</h2>
<p>LEFT JOIN'de sağ tabloya ait filtreyi <b>WHERE</b>'e yazarsan, NULL satırlar elenir ve sorgu farkında olmadan INNER JOIN'e dönüşür. Filtreyi <b>ON</b> içine yazarsan sol tablo korunur:</p>
<pre class="code">-- Her müşteri ve 2024'teki sipariş sayısı (siparişi olmayan 0 görünür)
SELECT c.customer_id, COUNT(o.order_id) AS siparis_2024
FROM customers c
LEFT JOIN orders o
       ON o.customer_id = c.customer_id
      AND o.order_date >= '2024-01-01'
GROUP BY c.customer_id
ORDER BY siparis_2024
LIMIT 10;</pre>
<div class="warn"><b>COUNT(*) değil COUNT(sütun)</b>LEFT JOIN sonrası COUNT(*) eşi olmayan satırı da 1 sayar. Sağ tablodaki bir sütunu saymak (<code>COUNT(o.order_id)</code>) doğru sonucu verir.</div>
`,
  ex: [
    { t: 'sql', q: '<p><b>Hiç sipariş vermemiş</b> müşterilerin <code>customer_id</code>, <code>first_name</code>, <code>last_name</code> değerlerini getir.</p>', sol: 'SELECT c.customer_id, c.first_name, c.last_name FROM customers c LEFT JOIN orders o ON o.customer_id = c.customer_id WHERE o.order_id IS NULL;' },
    { t: 'sql', q: '<p><b>Hiç satılmamış</b> ürünlerin adını ve kategorisini getir.</p>', sol: 'SELECT p.name, p.category FROM products p LEFT JOIN order_items oi ON oi.product_id = p.product_id WHERE oi.item_id IS NULL;' },
    { t: 'sql', q: '<p>Tüm departmanları ve her birindeki <b>çalışan sayısını</b> getir; çalışanı olmayan departman 0 ile görünsün. Sütunlar: <code>name</code>, sayı.</p>', sol: 'SELECT d.name, COUNT(e.emp_id) FROM departments d LEFT JOIN employees e ON e.dept_id = d.dept_id GROUP BY d.dept_id, d.name;', hint: '<code>COUNT(e.emp_id)</code> kullan, <code>COUNT(*)</code> değil.' }
  ]
},
{
  id: 'right-full-join', lv: 'B1', mod: 'Tabloları Birleştirme', min: 10,
  title: 'RIGHT JOIN, FULL OUTER JOIN',
  sum: 'Sağ tabloyu korumak ve iki tarafı da korumak.',
  body: `
<h2>RIGHT JOIN</h2>
<p>LEFT JOIN'in aynasıdır: sağ tablonun tüm satırlarını korur. Pratikte tablo sırasını değiştirip LEFT JOIN yazmak daha okunaklı olduğu için az kullanılır.</p>
<pre class="code">SELECT e.first_name, d.name
FROM employees e
RIGHT JOIN departments d ON e.dept_id = d.dept_id;</pre>
<h2>FULL OUTER JOIN</h2>
<p>Her iki tablonun da tüm satırlarını döndürür; eşi olmayan taraf NULL olur. İki kaynağı karşılaştırırken (“hangi kayıt sadece birinde var?”) çok kullanışlıdır.</p>
<pre class="code">SELECT e.first_name, e.dept_id AS calisan_dept, d.name AS departman
FROM employees e
FULL OUTER JOIN departments d ON e.dept_id = d.dept_id
WHERE e.emp_id IS NULL OR d.dept_id IS NULL;</pre>
<p>Bu sorgu hem departmanı olmayan çalışanı (genel müdür) hem de çalışanı olmayan departmanı (Hukuk) gösterir.</p>
<div class="note"><b>Destek</b>SQLite 3.39'dan beri RIGHT ve FULL JOIN destekler. MySQL FULL OUTER JOIN desteklemez; orada LEFT JOIN ile RIGHT JOIN'i UNION ile birleştirirsin.</div>
<h2>Özet</h2>
<table><tr><th>JOIN</th><th>Sol tablonun eşsizleri</th><th>Sağ tablonun eşsizleri</th></tr>
<tr><td>INNER</td><td>Yok</td><td>Yok</td></tr>
<tr><td>LEFT</td><td>Var</td><td>Yok</td></tr>
<tr><td>RIGHT</td><td>Yok</td><td>Var</td></tr>
<tr><td>FULL</td><td>Var</td><td>Var</td></tr>
</table>
`,
  ex: [
    { t: 'sql', q: '<p><code>FULL OUTER JOIN</code> kullanarak <code>employees</code> ve <code>departments</code> tablolarını birleştir ve <b>sadece eşi olmayan</b> satırları getir: <code>e.first_name</code>, <code>d.name</code>.</p>', sol: 'SELECT e.first_name, d.name FROM employees e FULL OUTER JOIN departments d ON e.dept_id = d.dept_id WHERE e.emp_id IS NULL OR d.dept_id IS NULL;' },
    { t: 'mc', q: '<p><code>A LEFT JOIN B</code> ile aynı sonucu veren ifade hangisidir?</p>', o: ['<code>B LEFT JOIN A</code>', '<code>B RIGHT JOIN A</code>', '<code>A INNER JOIN B</code>', '<code>A FULL JOIN B</code>'], a: 1 }
  ]
},
{
  id: 'self-cross-join', lv: 'B1', mod: 'Tabloları Birleştirme', min: 12,
  title: 'Self JOIN ve CROSS JOIN',
  sum: 'Tabloyu kendisiyle birleştirmek ve tüm kombinasyonları üretmek.',
  body: `
<h2>Self join: çalışan ve yöneticisi</h2>
<p>Aynı tabloyu iki farklı takma adla iki kez kullanırsın:</p>
<pre class="code" data-diff="oracle">SELECT e.first_name || ' ' || e.last_name AS calisan,
       m.first_name || ' ' || m.last_name AS yonetici
FROM employees e
LEFT JOIN employees m ON e.manager_id = m.emp_id;</pre>
<p>Self join ayrıca aynı tablodaki satırları karşılaştırmak için de kullanılır: aynı şehirde yaşayan müşteri çiftleri, aynı gün iki sipariş veren müşteriler gibi.</p>
<h2>CROSS JOIN: kartezyen çarpım</h2>
<p>Her satırı diğer tablonun her satırıyla eşleştirir. 7 departman × 3 kanal = 21 satır.</p>
<pre class="code">SELECT d.name, ch.channel
FROM departments d
CROSS JOIN (SELECT DISTINCT channel FROM orders) ch;</pre>
<p>Raporlarda “her ay × her kategori” iskeleti oluşturup boş kombinasyonları 0 ile göstermek için çok kullanılır.</p>
<div class="warn"><b>Kazara kartezyen</b>JOIN koşulunu unutmak (veya yanlış yazmak) satır sayısını patlatır: 1 milyon × 1 milyon = 1 trilyon satır. Sonuç beklenmedik şekilde büyükse ilk şüphelin bu olsun.</div>
`,
  ex: [
    { t: 'sql', q: '<p>Her çalışanın adı (<code>first_name</code>) ve <b>yöneticisinin adı</b>nı getir. Yöneticisi olmayan da görünsün (NULL).</p>', sol: 'SELECT e.first_name, m.first_name FROM employees e LEFT JOIN employees m ON e.manager_id = m.emp_id;' },
    { t: 'sql', q: '<p>Maaşı, <b>yöneticisinin maaşının %80\'inden fazla</b> olan çalışanları bul: çalışanın adı, maaşı ve yöneticisinin maaşı.</p>', sol: 'SELECT e.first_name, e.salary, m.salary FROM employees e JOIN employees m ON e.manager_id = m.emp_id WHERE e.salary > m.salary * 0.8;', hint: 'Self join yap, WHERE ile <code>e.salary > m.salary * 0.8</code>.' },
    { t: 'sql', q: '<p>Her yöneticinin <b>doğrudan bağlı çalışan sayısını</b> getir: yönetici adı (<code>first_name</code>), sayı. Sadece en az bir çalışanı olanlar.</p>', sol: 'SELECT m.first_name, COUNT(*) FROM employees e JOIN employees m ON e.manager_id = m.emp_id GROUP BY m.emp_id, m.first_name;' }
  ]
},
{
  id: 'coklu-join', lv: 'B1', mod: 'Tabloları Birleştirme', min: 15,
  title: 'Çoklu JOIN ve satır çoğalması tuzağı',
  sum: 'Üç-dört tabloyu zincirlemek ve yanlış toplamları önlemek.',
  body: `
<h2>Zincirleme JOIN</h2>
<p>Müşteri → sipariş → sipariş satırı → ürün yolunu takip edelim:</p>
<pre class="code">SELECT c.city,
       p.category,
       ROUND(SUM(oi.quantity * oi.unit_price * (1 - oi.discount)), 2) AS ciro
FROM customers c
JOIN orders o       ON o.customer_id = c.customer_id
JOIN order_items oi ON oi.order_id = o.order_id
JOIN products p     ON p.product_id = oi.product_id
WHERE o.status = 'delivered'
GROUP BY c.city, p.category
ORDER BY ciro DESC
LIMIT 10;</pre>
<h2>Fan-out: satırların çoğalması</h2>
<p>Bire-çok ilişkide JOIN yaptığında “bir” tarafındaki satır “çok” tarafındaki her satır için <b>tekrarlanır</b>. Sipariş tablosunu satırlarıyla birleştirip sipariş sayısını <code>COUNT(*)</code> ile sayarsan, sipariş satırı sayısını bulursun:</p>
<pre class="code">SELECT COUNT(*) AS yanlis, COUNT(DISTINCT o.order_id) AS dogru
FROM orders o
JOIN order_items oi ON oi.order_id = o.order_id;</pre>
<div class="warn"><b>Altın kural</b>JOIN'den sonra toplam alırken, sonuç tablonun <b>grain düzeyini</b> (tanecik) bil: Her satır neyi temsil ediyor? Bir sipariş mi, bir sipariş satırı mı? Farklı grain düzeyindeki iki tabloyu birleştirmeden önce birini önce özetlemek (alt sorgu/CTE) çoğu zaman doğru yoldur.</div>
`,
  ex: [
    { t: 'sql', q: '<p>Her <b>sipariş kanalı</b> (<code>channel</code>) için teslim edilmiş (<code>delivered</code>) siparişlerin cirosunu hesapla (2 basamak). Sütunlar: <code>channel</code>, <code>ciro</code>.</p>', sol: "SELECT o.channel, ROUND(SUM(oi.quantity * oi.unit_price * (1 - oi.discount)), 2) AS ciro FROM orders o JOIN order_items oi ON oi.order_id = o.order_id WHERE o.status = 'delivered' GROUP BY o.channel;" },
    { t: 'sql', q: '<p>Her <b>müşteri segmenti</b> için <b>sipariş sayısını</b> (sipariş satırı değil!) ve <b>satılan toplam ürün adedini</b> getir. Sütunlar: <code>segment</code>, <code>siparis</code>, <code>adet</code>.</p>', sol: 'SELECT c.segment, COUNT(DISTINCT o.order_id) AS siparis, SUM(oi.quantity) AS adet FROM customers c JOIN orders o ON o.customer_id = c.customer_id JOIN order_items oi ON oi.order_id = o.order_id GROUP BY c.segment;', hint: 'Sipariş sayısı için <code>COUNT(DISTINCT o.order_id)</code>.' },
    { t: 'sql', q: '<p><b>Kitap</b> kategorisinden en az bir ürün satın almış <b>farklı müşteri</b> sayısını bul.</p>', sol: "SELECT COUNT(DISTINCT o.customer_id) FROM orders o JOIN order_items oi ON oi.order_id = o.order_id JOIN products p ON p.product_id = oi.product_id WHERE p.category = 'Kitap';" }
  ]
},
{
  id: 'set-ops', lv: 'B1', mod: 'Küme ve Alt Sorgular', min: 12,
  title: 'UNION, INTERSECT, EXCEPT',
  sum: 'Sorgu sonuçlarını alt alta eklemek, kesişim ve fark.',
  body: `
<h2>Küme işlemleri</h2>
<p>JOIN tabloları <b>yan yana</b> birleştirir; küme işlemleri sorgu sonuçlarını <b>alt alta</b> birleştirir.</p>
<table><tr><th>İşlem</th><th>Sonuç</th></tr>
<tr><td><code>UNION</code></td><td>İki sonucun birleşimi, tekrarlar atılır</td></tr>
<tr><td><code>UNION ALL</code></td><td>Birleşim, tekrarlar korunur (daha hızlı)</td></tr>
<tr><td><code>INTERSECT</code></td><td>Her ikisinde de olanlar</td></tr>
<tr><td><code>EXCEPT</code></td><td>Birincide olup ikincide olmayanlar (Oracle'da <code>MINUS</code>)</td></tr>
</table>
<p>Kurallar: Her iki sorgu <b>aynı sayıda sütun</b> döndürmeli ve tipler uyumlu olmalı. Sütun adları ilk sorgudan gelir. ORDER BY en sonda bir kez yazılır.</p>
<pre class="code">-- Şirketle ilişkili tüm kişiler: müşteri ve çalışanlar tek listede
SELECT first_name, last_name, 'Müşteri' AS tip FROM customers
UNION ALL
SELECT first_name, last_name, 'Çalışan' FROM employees
ORDER BY last_name
LIMIT 15;</pre>
<pre class="code">-- Hem 2023'te hem 2024'te sipariş veren müşteriler
SELECT customer_id FROM orders WHERE order_date LIKE '2023%'
INTERSECT
SELECT customer_id FROM orders WHERE order_date LIKE '2024%';</pre>
`,
  ex: [
    { t: 'sql', q: '<p>2023\'te sipariş verip <b>2024\'te hiç sipariş vermemiş</b> müşterilerin <code>customer_id</code> listesini <code>EXCEPT</code> ile bul.</p>', sol: "SELECT customer_id FROM orders WHERE order_date LIKE '2023%' EXCEPT SELECT customer_id FROM orders WHERE order_date LIKE '2024%';" },
    { t: 'sql', q: '<p>Müşterilerin ve çalışanların yaşadığı/çalıştığı <b>şehirlerin tekrarsız listesini</b> getir: <code>customers.city</code> ve <code>departments.city</code>. NULL değerleri hariç tut.</p>', sol: 'SELECT city FROM customers WHERE city IS NOT NULL UNION SELECT city FROM departments WHERE city IS NOT NULL;' },
    { t: 'mc', q: '<p>UNION ile UNION ALL arasındaki fark nedir?</p>', o: ['UNION ALL sütun sayısı farklı sorguları birleştirebilir', 'UNION tekrarları atar, UNION ALL korur', 'UNION ALL sadece iki sorguyla çalışır', 'Fark yoktur'], a: 1, why: 'Tekrarları atmak sıralama/karşılaştırma gerektirdiği için UNION daha yavaştır. Tekrar olmayacağını biliyorsan UNION ALL kullan.' }
  ]
},
{
  id: 'subquery', lv: 'B1', mod: 'Küme ve Alt Sorgular', min: 15,
  title: 'Alt sorgular (subquery)',
  sum: 'Skaler alt sorgu, IN ile alt sorgu ve FROM içinde türetilmiş tablo.',
  body: `
<h2>Sorgu içinde sorgu</h2>
<p>Alt sorgu, parantez içindeki bir SELECT'tir. Üç yaygın yerde kullanılır.</p>
<h3>1. Skaler alt sorgu: tek değer</h3>
<pre class="code">-- Ortalamanın üzerindeki ürünler
SELECT name, price
FROM products
WHERE price > (SELECT AVG(price) FROM products)
ORDER BY price;</pre>
<h3>2. IN ile liste</h3>
<pre class="code">-- Elektronik ürün almış müşteriler
SELECT first_name, last_name
FROM customers
WHERE customer_id IN (
  SELECT o.customer_id
  FROM orders o
  JOIN order_items oi ON oi.order_id = o.order_id
  JOIN products p ON p.product_id = oi.product_id
  WHERE p.category = 'Elektronik'
);</pre>
<h3>3. FROM içinde: türetilmiş tablo</h3>
<p>Önce özetle, sonra özet üzerinden sorgula:</p>
<pre class="code">SELECT ROUND(AVG(siparis_sayisi), 2) AS musteri_basina_ort_siparis
FROM (
  SELECT customer_id, COUNT(*) AS siparis_sayisi
  FROM orders
  GROUP BY customer_id
) AS t;</pre>
<div class="warn"><b>NOT IN ve NULL</b>Alt sorgu tek bir NULL döndürürse <code>NOT IN</code> hiç satır döndürmez (çünkü <code>x &lt;&gt; NULL</code> bilinmeyendir). NOT IN kullanırken alt sorguya <code>WHERE ... IS NOT NULL</code> ekle veya <code>NOT EXISTS</code> tercih et.</div>
`,
  ex: [
    { t: 'sql', q: '<p>Maaşı <b>şirket ortalamasının üzerinde</b> olan çalışanların adını ve maaşını getir.</p>', sol: 'SELECT first_name, salary FROM employees WHERE salary > (SELECT AVG(salary) FROM employees);' },
    { t: 'sql', q: '<p>Müşteri başına sipariş sayılarını hesaplayan bir alt sorgu yaz, sonra <b>en yüksek sipariş sayısını</b> tek değer olarak döndür.</p>', sol: 'SELECT MAX(n) FROM (SELECT customer_id, COUNT(*) AS n FROM orders GROUP BY customer_id) t;' },
    { t: 'sql', q: '<p>En az bir siparişi <b>iade edilmiş</b> (<code>returned</code>) müşterilerin adını ve soyadını <code>IN</code> ve alt sorgu ile getir.</p>', sol: "SELECT first_name, last_name FROM customers WHERE customer_id IN (SELECT customer_id FROM orders WHERE status = 'returned');" }
  ]
},
{
  id: 'correlated', lv: 'B1', mod: 'Küme ve Alt Sorgular', min: 14,
  title: 'İlişkili alt sorgular ve EXISTS',
  sum: 'Dış sorgunun her satırı için çalışan alt sorgular.',
  body: `
<h2>Dış sorguya bakan alt sorgu</h2>
<p>İlişkili (correlated) alt sorgu, dış sorgudaki bir sütunu kullanır; mantıksal olarak her satır için yeniden çalışır.</p>
<pre class="code">-- Kendi kategorisinin ortalamasından pahalı ürünler
SELECT p.name, p.category, p.price
FROM products p
WHERE p.price > (
  SELECT AVG(p2.price)
  FROM products p2
  WHERE p2.category = p.category
);</pre>
<h2>EXISTS ve NOT EXISTS</h2>
<p>EXISTS, alt sorgu <b>en az bir satır</b> döndürürse doğrudur. Satırların içeriği önemsizdir; bu yüzden <code>SELECT 1</code> yazmak gelenektir.</p>
<pre class="code">-- Mobil kanaldan en az bir sipariş vermiş müşteriler
SELECT c.first_name, c.last_name
FROM customers c
WHERE EXISTS (
  SELECT 1 FROM orders o
  WHERE o.customer_id = c.customer_id AND o.channel = 'mobile'
);</pre>
<p><code>NOT EXISTS</code>, anti-join'in en güvenli yazımıdır; NULL tuzağına düşmez.</p>
<h2>SELECT içinde ilişkili alt sorgu</h2>
<pre class="code">SELECT c.first_name,
       (SELECT MAX(o.order_date) FROM orders o WHERE o.customer_id = c.customer_id) AS son_siparis
FROM customers c
LIMIT 10;</pre>
<div class="tip"><b>Performans</b>Modern optimizasyon motorları çoğu ilişkili alt sorguyu JOIN'e dönüştürür. Yine de büyük tablolarda SELECT içindeki ilişkili alt sorgular yavaş olabilir; JOIN + GROUP BY veya pencere fonksiyonu alternatiflerini düşün.</div>
`,
  ex: [
    { t: 'sql', q: '<p>Kendi departmanının <b>ortalama maaşından fazla</b> kazanan çalışanların adını, departman numarasını ve maaşını getir.</p>', sol: 'SELECT e.first_name, e.dept_id, e.salary FROM employees e WHERE e.salary > (SELECT AVG(e2.salary) FROM employees e2 WHERE e2.dept_id = e.dept_id);' },
    { t: 'sql', q: '<p><code>NOT EXISTS</code> kullanarak <b>hiç sipariş vermemiş</b> müşterilerin <code>customer_id</code> ve <code>first_name</code> değerlerini getir.</p>', sol: 'SELECT c.customer_id, c.first_name FROM customers c WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id);' },
    { t: 'sql', q: '<p>Her ürünün adını ve <b>toplam satılan adedini</b> SELECT içinde ilişkili alt sorgu ile getir; hiç satılmamışsa 0 yazsın.</p>', sol: 'SELECT p.name, COALESCE((SELECT SUM(oi.quantity) FROM order_items oi WHERE oi.product_id = p.product_id), 0) FROM products p;', hint: 'Alt sorguyu <code>COALESCE(..., 0)</code> ile sar.' }
  ]
},

/* ======================= B2 ======================= */
{
  id: 'cte', lv: 'B2', mod: 'İleri Sorgu Yapıları', min: 14,
  title: 'CTE: WITH ile okunabilir sorgular',
  sum: 'Karmaşık sorguları adım adım, isimli bloklara bölmek.',
  body: `
<h2>Common Table Expression</h2>
<p>CTE, sorgunun başında <b>WITH</b> ile tanımlanan, isim verilmiş geçici bir sonuç kümesidir. İç içe alt sorgular yerine yukarıdan aşağı okunan adımlar yazmanı sağlar.</p>
<pre class="code">WITH musteri_ciro AS (
  SELECT o.customer_id,
         SUM(oi.quantity * oi.unit_price * (1 - oi.discount)) AS ciro
  FROM orders o
  JOIN order_items oi ON oi.order_id = o.order_id
  WHERE o.status = 'delivered'
  GROUP BY o.customer_id
)
SELECT c.first_name, c.last_name, ROUND(mc.ciro, 2) AS ciro
FROM musteri_ciro mc
JOIN customers c ON c.customer_id = mc.customer_id
ORDER BY mc.ciro DESC
LIMIT 5;</pre>
<h2>Birden fazla CTE</h2>
<p>Virgülle ayrılır; sonraki CTE öncekileri kullanabilir:</p>
<pre class="code">WITH aylik AS (
  SELECT strftime('%Y-%m', o.order_date) AS ay,
         SUM(oi.quantity * oi.unit_price * (1 - oi.discount)) AS ciro
  FROM orders o JOIN order_items oi ON oi.order_id = o.order_id
  WHERE o.status = 'delivered'
  GROUP BY ay
),
ortalama AS (
  SELECT AVG(ciro) AS ort FROM aylik
)
SELECT a.ay, ROUND(a.ciro) AS ciro
FROM aylik a, ortalama
WHERE a.ciro > ortalama.ort
ORDER BY a.ay;</pre>
<div class="tip"><b>Ne zaman CTE?</b>Aynı alt sonucu birden çok kez kullanacaksan, sorgu üç seviyeden fazla iç içe geçiyorsa veya başkası okuyacaksa. Analist ekiplerinde CTE ile yazmak neredeyse standarttır.</div>
`,
  ex: [
    { t: 'sql', q: '<p>Bir CTE ile her müşterinin <b>sipariş sayısını</b> hesapla; sonra sipariş sayısına göre müşteri dağılımını getir: <code>siparis_sayisi</code>, <code>musteri_sayisi</code>, siparis_sayisi\'na göre sıralı.</p>', sol: 'WITH t AS (SELECT customer_id, COUNT(*) AS siparis_sayisi FROM orders GROUP BY customer_id) SELECT siparis_sayisi, COUNT(*) AS musteri_sayisi FROM t GROUP BY siparis_sayisi ORDER BY siparis_sayisi;', ord: true },
    { t: 'sql', q: '<p>CTE kullanarak her <b>departmanın ortalama maaşını</b> hesapla, ardından ortalaması <b>şirket genel ortalamasından yüksek</b> olan departmanların adını ve ortalamasını (tam sayıya yuvarlanmış) getir.</p>', sol: 'WITH d AS (SELECT dept_id, AVG(salary) AS ort FROM employees WHERE dept_id IS NOT NULL GROUP BY dept_id) SELECT dp.name, ROUND(d.ort) FROM d JOIN departments dp ON dp.dept_id = d.dept_id WHERE d.ort > (SELECT AVG(salary) FROM employees);', hint: 'Genel ortalama için <code>(SELECT AVG(salary) FROM employees)</code>. Genel müdürün departmanı NULL; onu departman listesinden çıkar.' }
  ]
},
{
  id: 'recursive-cte', lv: 'B2', mod: 'İleri Sorgu Yapıları', min: 15,
  title: 'Özyinelemeli CTE (WITH RECURSIVE)',
  sum: 'Hiyerarşiler, ağaçlar ve sayı/tarih dizileri üretmek.',
  body: `
<h2>Kendini çağıran sorgu</h2>
<p>Özyinelemeli CTE iki parçadan oluşur: <b>çapa</b> (başlangıç satırları) ve <b>özyinelemeli kısım</b> (bir önceki adımın sonucunu kullanır). UNION ALL ile birleştirilir ve yeni satır üretilmeyene kadar devam eder.</p>
<h3>Sayı dizisi üretmek</h3>
<pre class="code">WITH RECURSIVE sayilar(n) AS (
  SELECT 1
  UNION ALL
  SELECT n + 1 FROM sayilar WHERE n < 10
)
SELECT n FROM sayilar;</pre>
<h3>Tarih iskeleti</h3>
<p>Hiç sipariş olmayan günleri de raporda göstermek için:</p>
<pre class="code">WITH RECURSIVE gunler(gun) AS (
  SELECT '2024-12-01'
  UNION ALL
  SELECT date(gun, '+1 day') FROM gunler WHERE gun < '2024-12-31'
)
SELECT g.gun, COUNT(o.order_id) AS siparis
FROM gunler g
LEFT JOIN orders o ON o.order_date = g.gun
GROUP BY g.gun;</pre>
<h3>Organizasyon şeması</h3>
<pre class="code">WITH RECURSIVE org AS (
  SELECT emp_id, first_name, manager_id, 0 AS seviye
  FROM employees WHERE manager_id IS NULL
  UNION ALL
  SELECT e.emp_id, e.first_name, e.manager_id, org.seviye + 1
  FROM employees e
  JOIN org ON e.manager_id = org.emp_id
)
SELECT * FROM org ORDER BY seviye, emp_id;</pre>
<div class="warn"><b>Sonsuz döngü</b>Durma koşulunu (WHERE n &lt; 10 gibi) unutursan sorgu bitmez. Döngü içeren verilerde (A, B'yi; B, A'yı gösteriyorsa) ziyaret edilenleri takip etmen gerekir.</div>
`,
  ex: [
    { t: 'sql', q: '<p>Özyinelemeli CTE ile <b>1\'den 12\'ye</b> kadar sayıları üret (tek sütun).</p>', sol: 'WITH RECURSIVE s(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM s WHERE n < 12) SELECT n FROM s;' },
    { t: 'sql', q: '<p>Organizasyon şemasında her çalışanın <b>kademesini</b> bul (genel müdür 0). <code>emp_id</code>, <code>first_name</code>, <code>seviye</code> döndür.</p>', sol: 'WITH RECURSIVE org AS (SELECT emp_id, first_name, 0 AS seviye FROM employees WHERE manager_id IS NULL UNION ALL SELECT e.emp_id, e.first_name, org.seviye + 1 FROM employees e JOIN org ON e.manager_id = org.emp_id) SELECT emp_id, first_name, seviye FROM org;' },
    { t: 'sql', q: '<p>2024 yılının <b>12 ayını</b> (<code>\'2024-01\'</code> … <code>\'2024-12\'</code>) üret ve her ay için sipariş sayısını getir. Sütunlar: <code>ay</code>, <code>siparis</code>, aya göre sıralı.</p>', sol: "WITH RECURSIVE aylar(d) AS (SELECT '2024-01-01' UNION ALL SELECT date(d, '+1 month') FROM aylar WHERE d < '2024-12-01') SELECT strftime('%Y-%m', d) AS ay, (SELECT COUNT(*) FROM orders o WHERE strftime('%Y-%m', o.order_date) = strftime('%Y-%m', d)) AS siparis FROM aylar ORDER BY ay;", ord: true, hint: "<code>date(d, '+1 month')</code> ile ay ilerlet, sonra LEFT JOIN veya alt sorguyla say." }
  ]
},
{
  id: 'window-intro', lv: 'B2', mod: 'Pencere Fonksiyonları', min: 15,
  title: 'Pencere fonksiyonlarına giriş: OVER ve PARTITION BY',
  sum: 'Satırları kaybetmeden grup hesapları yapmak.',
  body: `
<h2>GROUP BY satırları ezer, pencere fonksiyonu ezmez</h2>
<p>GROUP BY her grup için tek satır döndürür. Ama bazen hem ayrıntıyı hem özeti aynı satırda isteriz: “Her çalışanın maaşı ve departmanının ortalaması”. Pencere fonksiyonu tam olarak budur.</p>
<pre class="code">SELECT first_name, dept_id, salary,
       AVG(salary) OVER (PARTITION BY dept_id) AS dept_ort,
       salary - AVG(salary) OVER (PARTITION BY dept_id) AS fark
FROM employees
WHERE dept_id IS NOT NULL;</pre>
<ul>
<li><code>OVER ()</code>: Pencere tüm sonuç kümesidir.</li>
<li><code>OVER (PARTITION BY x)</code>: Her x grubu ayrı bir penceredir.</li>
<li><code>OVER (ORDER BY y)</code>: Pencere sıralıdır; toplamalar <b>kümülatif</b> olur (sonraki derste).</li>
</ul>
<h2>Paya oranlamak</h2>
<p>Her kategorinin toplam içindeki payı:</p>
<pre class="code">SELECT category,
       COUNT(*) AS urun,
       ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS yuzde
FROM products
GROUP BY category
ORDER BY urun DESC;</pre>
<p>Burada <code>SUM(COUNT(*)) OVER ()</code> “tüm grupların sayılarının toplamı” demektir; pencere fonksiyonları GROUP BY'dan sonra çalıştığı için bu mümkündür.</p>
<div class="note"><b>Nerede kullanılamaz?</b>Pencere fonksiyonları SELECT ve ORDER BY'da kullanılabilir; WHERE, GROUP BY ve HAVING'de kullanılamaz. Pencere sonucuna göre filtrelemek için sorguyu CTE/alt sorguya sarman gerekir.</div>
`,
  ex: [
    { t: 'sql', q: '<p>Her ürünün adı, kategorisi, fiyatı ve <b>kategorisindeki ortalama fiyat</b> (2 basamak) bilgisini getir: <code>name</code>, <code>category</code>, <code>price</code>, <code>kat_ort</code>.</p>', sol: 'SELECT name, category, price, ROUND(AVG(price) OVER (PARTITION BY category), 2) AS kat_ort FROM products;' },
    { t: 'sql', q: '<p>Her çalışanın adı, maaşı ve maaşının <b>toplam maaş bütçesindeki yüzdesi</b>ni (2 basamak) getir.</p>', sol: 'SELECT first_name, salary, ROUND(100.0 * salary / SUM(salary) OVER (), 2) FROM employees;' },
    { t: 'sql', q: '<p>Her şehrin müşteri sayısını ve bu sayının <b>tüm müşteriler içindeki payını</b> (yüzde, 1 basamak) getir. Şehri NULL olanlar da kendi satırında görünsün.</p>', sol: 'SELECT city, COUNT(*), ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) FROM customers GROUP BY city;', hint: '<code>SUM(COUNT(*)) OVER ()</code>' }
  ]
},
{
  id: 'ranking', lv: 'B2', mod: 'Pencere Fonksiyonları', min: 15,
  title: 'Sıralama: ROW_NUMBER, RANK, DENSE_RANK',
  sum: 'Sıra numarası vermek ve her gruptaki ilk N kaydı bulmak.',
  body: `
<h2>Üç sıralama fonksiyonu</h2>
<table><tr><th>Maaş</th><th>ROW_NUMBER</th><th>RANK</th><th>DENSE_RANK</th></tr>
<tr><td>90.000</td><td>1</td><td>1</td><td>1</td></tr>
<tr><td>80.000</td><td>2</td><td>2</td><td>2</td></tr>
<tr><td>80.000</td><td>3</td><td>2</td><td>2</td></tr>
<tr><td>70.000</td><td>4</td><td>4</td><td>3</td></tr>
</table>
<ul>
<li><b>ROW_NUMBER</b>: Her satıra benzersiz numara. Eşitlikte sıra rastgele olabilir.</li>
<li><b>RANK</b>: Eşitlere aynı sıra, sonra boşluk bırakır (olimpiyat sıralaması).</li>
<li><b>DENSE_RANK</b>: Eşitlere aynı sıra, boşluk bırakmaz.</li>
</ul>
<pre class="code">SELECT first_name, dept_id, salary,
       RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS dept_sira
FROM employees
WHERE dept_id IS NOT NULL;</pre>
<h2>Her gruptaki ilk N: en sık sorulan mülakat sorusu</h2>
<p>“Her kategorinin en pahalı 2 ürünü” gibi sorular için sırala, sonra dış sorguda filtrele:</p>
<pre class="code">WITH s AS (
  SELECT category, name, price,
         ROW_NUMBER() OVER (PARTITION BY category ORDER BY price DESC) AS rn
  FROM products
)
SELECT category, name, price
FROM s
WHERE rn <= 2
ORDER BY category, rn;</pre>
<div class="tip"><b>Tekilleştirme</b>Aynı kaydın birden çok versiyonu varken en günceli seçmek için de bu kalıp kullanılır: <code>ROW_NUMBER() OVER (PARTITION BY anahtar ORDER BY guncelleme DESC) = 1</code>.</div>
`,
  ex: [
    { t: 'sql', q: '<p>Ürünleri fiyata göre pahalıdan ucuza <code>DENSE_RANK</code> ile sırala: <code>name</code>, <code>price</code>, <code>sira</code>. Sonuç sıraya göre sıralı olsun.</p>', sol: 'SELECT name, price, DENSE_RANK() OVER (ORDER BY price DESC) AS sira FROM products ORDER BY sira;', ord: true },
    { t: 'sql', q: '<p>Her departmanda <b>en yüksek maaşı alan</b> çalışanı bul (eşitlik varsa hepsi gelsin): <code>dept_id</code>, <code>first_name</code>, <code>salary</code>. Departmanı NULL olanları hariç tut.</p>', sol: 'WITH s AS (SELECT dept_id, first_name, salary, RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS r FROM employees WHERE dept_id IS NOT NULL) SELECT dept_id, first_name, salary FROM s WHERE r = 1;', hint: 'Eşitlikleri korumak için ROW_NUMBER yerine RANK kullan.' },
    { t: 'sql', q: '<p>Her müşterinin <b>ilk siparişini</b> bul: <code>customer_id</code>, <code>order_id</code>, <code>order_date</code>. Aynı gün birden fazla sipariş varsa <code>order_id</code> küçük olan seçilsin.</p>', sol: 'WITH s AS (SELECT customer_id, order_id, order_date, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date, order_id) AS rn FROM orders) SELECT customer_id, order_id, order_date FROM s WHERE rn = 1;' }
  ]
},
{
  id: 'lag-lead', lv: 'B2', mod: 'Pencere Fonksiyonları', min: 15,
  title: 'LAG ve LEAD: önceki ve sonraki satır',
  sum: 'Dönemler arası değişim, siparişler arası süre.',
  body: `
<h2>Bir önceki satıra bakmak</h2>
<p><code>LAG(sutun, n, varsayilan)</code> sıralı penceredeki n önceki satırın değerini, <code>LEAD</code> n sonrakini getirir (n varsayılanı 1).</p>
<pre class="code">WITH aylik AS (
  SELECT strftime('%Y-%m', order_date) AS ay, COUNT(*) AS siparis
  FROM orders
  WHERE order_date >= '2024-01-01'
  GROUP BY ay
)
SELECT ay, siparis,
       LAG(siparis) OVER (ORDER BY ay) AS onceki_ay,
       siparis - LAG(siparis) OVER (ORDER BY ay) AS degisim,
       ROUND(100.0 * (siparis - LAG(siparis) OVER (ORDER BY ay)) / LAG(siparis) OVER (ORDER BY ay), 1) AS yuzde
FROM aylik;</pre>
<h2>Müşteri bazında: siparişler arası gün</h2>
<pre class="code">SELECT customer_id, order_date,
       LAG(order_date) OVER (PARTITION BY customer_id ORDER BY order_date) AS onceki,
       julianday(order_date) - julianday(LAG(order_date) OVER (PARTITION BY customer_id ORDER BY order_date)) AS gun_farki
FROM orders
WHERE customer_id = 7;</pre>
<div class="tip"><b>WINDOW kısaltması</b>Aynı pencereyi tekrar tekrar yazmak yerine sorgunun sonunda isim verebilirsin: <code>... OVER w ... WINDOW w AS (ORDER BY ay)</code>.</div>
`,
  ex: [
    { t: 'sql', q: '<p>Her yılın sipariş sayısını ve <b>bir önceki yılın</b> sipariş sayısını getir: <code>yil</code>, <code>siparis</code>, <code>onceki</code>. Yıla göre sırala.</p>', sol: "WITH y AS (SELECT strftime('%Y', order_date) AS yil, COUNT(*) AS siparis FROM orders GROUP BY yil) SELECT yil, siparis, LAG(siparis) OVER (ORDER BY yil) AS onceki FROM y ORDER BY yil;", ord: true },
    { t: 'sql', q: '<p>Müşteri <b>42</b>\'nin siparişlerini tarih sırasıyla getir ve her siparişin <b>bir sonraki siparişinin tarihini</b> ekle: <code>order_id</code>, <code>order_date</code>, <code>sonraki</code>.</p>', sol: 'SELECT order_id, order_date, LEAD(order_date) OVER (ORDER BY order_date, order_id) AS sonraki FROM orders WHERE customer_id = 42 ORDER BY order_date, order_id;', ord: true },
    { t: 'sql', q: '<p>Tüm müşteriler için siparişler arası <b>ortalama gün sayısını</b> hesapla (tek değer, tam sayıya yuvarla).</p>', sol: 'WITH t AS (SELECT julianday(order_date) - julianday(LAG(order_date) OVER (PARTITION BY customer_id ORDER BY order_date, order_id)) AS fark FROM orders) SELECT ROUND(AVG(fark)) FROM t;', hint: 'LAG ile farkı CTE içinde hesapla, dışarıda AVG al; ilk siparişlerin farkı NULL olduğu için AVG onları zaten yok sayar.' }
  ]
},
{
  id: 'frames', lv: 'B2', mod: 'Pencere Fonksiyonları', min: 15,
  title: 'Kümülatif toplam ve hareketli ortalama',
  sum: 'ROWS BETWEEN ile pencere çerçevesi tanımlamak.',
  body: `
<h2>ORDER BY eklenince toplam birikir</h2>
<pre class="code">WITH aylik AS (
  SELECT strftime('%Y-%m', order_date) AS ay, COUNT(*) AS siparis
  FROM orders WHERE order_date LIKE '2024%'
  GROUP BY ay
)
SELECT ay, siparis,
       SUM(siparis) OVER (ORDER BY ay) AS kumulatif
FROM aylik;</pre>
<h2>Çerçeve (frame) tanımı</h2>
<p>Pencerenin hangi satırları kapsayacağını açıkça belirtebilirsin:</p>
<table><tr><th>İfade</th><th>Anlamı</th></tr>
<tr><td><code>ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW</code></td><td>Baştan bu satıra (kümülatif)</td></tr>
<tr><td><code>ROWS BETWEEN 2 PRECEDING AND CURRENT ROW</code></td><td>Son 3 satır (hareketli pencere)</td></tr>
<tr><td><code>ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING</code></td><td>Önceki, kendisi, sonraki</td></tr>
<tr><td><code>ROWS BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING</code></td><td>Bu satırdan sona</td></tr>
</table>
<pre class="code">WITH gunluk AS (
  SELECT order_date AS gun, COUNT(*) AS siparis
  FROM orders WHERE order_date >= '2024-11-01'
  GROUP BY gun
)
SELECT gun, siparis,
       ROUND(AVG(siparis) OVER (ORDER BY gun ROWS BETWEEN 6 PRECEDING AND CURRENT ROW), 2) AS ort_7
FROM gunluk;</pre>
<div class="warn"><b>ROWS ile RANGE farkı</b>ORDER BY olup çerçeve belirtilmediğinde varsayılan <code>RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW</code>'dur. RANGE, sıralama değeri eşit olan satırları birlikte ele alır; tekrarlı tarihlerde beklenmedik kümülatif değerler görürsün. Emin olmak için ROWS yaz.</div>
`,
  ex: [
    { t: 'sql', q: '<p>2024 yılı için her ayın teslim edilmiş (<code>delivered</code>) sipariş sayısını ve yıl başından itibaren <b>kümülatif</b> toplamını getir: <code>ay</code>, <code>siparis</code>, <code>kumulatif</code>.</p>', sol: "WITH a AS (SELECT strftime('%Y-%m', order_date) AS ay, COUNT(*) AS siparis FROM orders WHERE order_date LIKE '2024%' AND status = 'delivered' GROUP BY ay) SELECT ay, siparis, SUM(siparis) OVER (ORDER BY ay ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS kumulatif FROM a ORDER BY ay;", ord: true },
    { t: 'sql', q: '<p>2024 için aylık sipariş sayısının <b>3 aylık hareketli ortalamasını</b> (bu ay + önceki 2 ay, 1 basamak) getir: <code>ay</code>, <code>siparis</code>, <code>ort3</code>.</p>', sol: "WITH a AS (SELECT strftime('%Y-%m', order_date) AS ay, COUNT(*) AS siparis FROM orders WHERE order_date LIKE '2024%' GROUP BY ay) SELECT ay, siparis, ROUND(AVG(siparis) OVER (ORDER BY ay ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 1) AS ort3 FROM a ORDER BY ay;", ord: true }
  ]
},
{
  id: 'ntile-dist', lv: 'B2', mod: 'Pencere Fonksiyonları', min: 12,
  title: 'NTILE, PERCENT_RANK, FIRST_VALUE',
  sum: 'Dilimlere ayırmak, yüzdelik sıra ve penceredeki ilk/son değer.',
  body: `
<h2>NTILE: eşit dilimler</h2>
<p><code>NTILE(4)</code> sıralı satırları 4 eşit gruba (çeyrek) böler. Müşteri segmentasyonunda çok kullanılır.</p>
<pre class="code">SELECT name, price,
       NTILE(4) OVER (ORDER BY price) AS fiyat_ceyregi
FROM products;</pre>
<h2>PERCENT_RANK ve CUME_DIST</h2>
<ul>
<li><code>PERCENT_RANK()</code>: (sıra − 1) / (satır sayısı − 1). 0 ile 1 arası.</li>
<li><code>CUME_DIST()</code>: Bu değere eşit veya küçük satırların oranı.</li>
</ul>
<pre class="code">SELECT first_name, salary,
       ROUND(PERCENT_RANK() OVER (ORDER BY salary), 2) AS yuzdelik
FROM employees
ORDER BY salary;</pre>
<h2>FIRST_VALUE, LAST_VALUE, NTH_VALUE</h2>
<pre class="code">SELECT category, name, price,
       FIRST_VALUE(name) OVER (PARTITION BY category ORDER BY price DESC) AS en_pahali
FROM products;</pre>
<div class="warn"><b>LAST_VALUE tuzağı</b>Varsayılan çerçeve “baştan bu satıra” olduğu için LAST_VALUE genelde satırın kendisini döndürür. Doğrusu: <code>LAST_VALUE(x) OVER (... ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)</code>.</div>
`,
  ex: [
    { t: 'sql', q: '<p>Çalışanları maaşa göre (artan) <b>3 dilime</b> ayır: <code>first_name</code>, <code>salary</code>, <code>dilim</code>.</p>', sol: 'SELECT first_name, salary, NTILE(3) OVER (ORDER BY salary, emp_id) AS dilim FROM employees;', hint: 'Eşit maaşlarda dilim sınırı değişebilir; <code>ORDER BY salary, emp_id</code> ile sabitle.' },
    { t: 'sql', q: '<p>Her ürün için adı, kategorisi, fiyatı ve <b>kategorisindeki en ucuz ürünün fiyatı</b>nı FIRST_VALUE ile getir.</p>', sol: 'SELECT name, category, price, FIRST_VALUE(price) OVER (PARTITION BY category ORDER BY price) FROM products;' }
  ]
},
{
  id: 'pivot', lv: 'B2', mod: 'İleri Sorgu Yapıları', min: 12,
  title: 'Pivot: satırları sütuna çevirmek',
  sum: 'Koşullu toplama ile çapraz tablo raporları.',
  body: `
<h2>Uzun formattan geniş formata</h2>
<p>Raporlarda sıklıkla “satırda kategori, sütunda yıl” gibi çapraz tablolar istenir. Standart SQL'de bunun en taşınabilir yolu <b>koşullu toplama</b>dır:</p>
<pre class="code">SELECT p.category,
       ROUND(SUM(CASE WHEN o.order_date LIKE '2023%' THEN oi.quantity * oi.unit_price * (1 - oi.discount) ELSE 0 END)) AS ciro_2023,
       ROUND(SUM(CASE WHEN o.order_date LIKE '2024%' THEN oi.quantity * oi.unit_price * (1 - oi.discount) ELSE 0 END)) AS ciro_2024
FROM order_items oi
JOIN orders o   ON o.order_id = oi.order_id
JOIN products p ON p.product_id = oi.product_id
WHERE o.status = 'delivered'
GROUP BY p.category
ORDER BY ciro_2024 DESC;</pre>
<p>SQL Server ve Oracle'da <code>PIVOT</code> operatörü, PostgreSQL'de <code>crosstab()</code> eklentisi vardır; ama koşullu toplama her yerde çalışır.</p>
<h2>Unpivot: tersine çevirmek</h2>
<p>Geniş tabloyu uzun formata çevirmek için UNION ALL kullanılır:</p>
<pre class="code">WITH genis AS (SELECT 'Elektronik' AS kat, 10 AS q1, 14 AS q2)
SELECT kat, 'Q1' AS ceyrek, q1 AS deger FROM genis
UNION ALL
SELECT kat, 'Q2', q2 FROM genis;</pre>
`,
  ex: [
    { t: 'sql', q: '<p>Her <b>kanal</b> için sipariş sayılarını durumlara göre sütunlara çevir: <code>channel</code>, <code>delivered</code>, <code>cancelled</code>, <code>returned</code>, <code>shipped</code> (bu sırayla).</p>', sol: "SELECT channel, SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) AS delivered, SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled, SUM(CASE WHEN status = 'returned' THEN 1 ELSE 0 END) AS returned, SUM(CASE WHEN status = 'shipped' THEN 1 ELSE 0 END) AS shipped FROM orders GROUP BY channel;" },
    { t: 'sql', q: '<p>Her <b>segment</b> için 2023 ve 2024 yıllarındaki sipariş sayılarını yan yana getir: <code>segment</code>, <code>s2023</code>, <code>s2024</code>.</p>', sol: "SELECT c.segment, SUM(CASE WHEN o.order_date LIKE '2023%' THEN 1 ELSE 0 END) AS s2023, SUM(CASE WHEN o.order_date LIKE '2024%' THEN 1 ELSE 0 END) AS s2024 FROM orders o JOIN customers c ON c.customer_id = o.customer_id GROUP BY c.segment;" }
  ]
}
);
