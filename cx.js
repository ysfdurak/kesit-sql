/* Kesit SQL — programdan bağımsız yeniden yazılan dersler (mevcut derslerin yerine geçer) */
(function () {
const R = window.SQLP_LESSONS || [];
const REV = 'oi.quantity * oi.unit_price * (1 - oi.discount)';
const put = l => { const i = R.findIndex(x => x.id === l.id); if (i >= 0) R[i] = Object.assign({}, R[i], l); else R.push(l); };

put({
  id: 'order-limit', lv: 'A1', mod: 'Temeller', min: 12,
  title: 'ORDER BY ve ilk N satır (LIMIT / TOP / FETCH)',
  sum: 'Sıralama, ilk N kaydı almak ve sayfalama; her programın kendi yazımı.',
  body: `
<h2>Sıralama</h2>
<p>SQL, ORDER BY yazmadığın sürece sonuçların sırasını <b>garanti etmez</b>. Sıralamak için:</p>
<pre class="code">SELECT name, price
FROM products
ORDER BY price DESC;</pre>
<ul>
<li><code>ASC</code> artan (varsayılan), <code>DESC</code> azalan.</li>
<li>Birden fazla sütunla sıralayabilirsin; ilk sütun eşitse ikinciye bakılır.</li>
<li>SELECT listesindeki takma adla da sıralayabilirsin.</li>
</ul>
<pre class="code">SELECT category, name, price
FROM products
ORDER BY category ASC, price DESC;</pre>
<h2>İlk N satır: her program farklı yazar</h2>
<p>Standart SQL'de bu iş <code>FETCH FIRST n ROWS ONLY</code> ile yapılır; ama en yaygın iki yazım <code>LIMIT</code> ve <code>TOP</code>'tur. Aşağıdaki kutunun üstündeki program sekmelerine tıklayarak farkı gör:</p>
<pre class="code">SELECT name, price
FROM products
ORDER BY price DESC
LIMIT 5;</pre>
<table><tr><th>Program</th><th>İlk 5 satır</th><th>6–10. satırlar (sayfalama)</th></tr>
<tr><td>SQL Server</td><td><code>SELECT TOP 5 ...</code></td><td><code>ORDER BY ... OFFSET 5 ROWS FETCH NEXT 5 ROWS ONLY</code></td></tr>
<tr><td>PostgreSQL, SQLite</td><td><code>... LIMIT 5</code></td><td><code>LIMIT 5 OFFSET 5</code></td></tr>
<tr><td>MySQL</td><td><code>... LIMIT 5</code></td><td><code>LIMIT 5 OFFSET 5</code> veya <code>LIMIT 5, 5</code></td></tr>
<tr><td>Oracle (12c+)</td><td><code>FETCH FIRST 5 ROWS ONLY</code></td><td><code>OFFSET 5 ROWS FETCH NEXT 5 ROWS ONLY</code></td></tr>
</table>
<div class="note" data-d="tsql"><b>SQL Server'a özel</b><code>TOP</code>, SELECT'ten hemen sonra yazılır. <code>TOP (5) WITH TIES</code> son sıradaki eşitleri de getirir, <code>TOP 10 PERCENT</code> satırların %10'unu getirir. Bunları T-SQL modülünde ayrıca işliyoruz. OFFSET/FETCH kullanmak için ORDER BY zorunludur.</div>
<div class="note" data-d="oracle"><b>Oracle'a özel</b>12c öncesi sürümlerde <code>WHERE ROWNUM &lt;= 5</code> kullanılırdı. ROWNUM, sıralamadan <i>önce</i> atandığı için sıralı ilk N için alt sorgu gerekir; FETCH FIRST bu sorunu çözer.</div>
<pre class="code">-- 2. sayfa (her sayfada 5 ürün)
SELECT name, price
FROM products
ORDER BY price DESC
LIMIT 5 OFFSET 5;</pre>
<div class="note"><b>NULL'lar nerede?</b>SQL Server, MySQL ve SQLite'ta NULL'lar artan sıralamada başa gelir; PostgreSQL ve Oracle'da sona. PostgreSQL, Oracle ve SQLite <code>NULLS FIRST / NULLS LAST</code> ile bunu kontrol etmene izin verir. Şehre göre sıralayıp program sekmesini PostgreSQL'e çevirerek dene:</div>
${CODE("SELECT first_name, city\nFROM customers\nORDER BY city\nLIMIT 8;", null, { diff: ['pg', 'oracle'] })}
`
});

put({
  id: 'metin', lv: 'A2', mod: 'Fonksiyonlar', min: 15,
  title: 'Metin fonksiyonları',
  sum: 'Büyük/küçük harf, uzunluk, parça alma, arama, birleştirme ve programlar arası farklar.',
  body: `
<h2>En sık kullanılan metin işlemleri</h2>
<p>Metin fonksiyonları programlar arasında en çok isim değiştiren gruptur. Tabloyu bir başvuru olarak kullan; kod kutularında seçili programın yazımı görünür.</p>
<div class="tbl-wrap"><table><tr><th>İşlem</th><th>SQL Server</th><th>PostgreSQL</th><th>MySQL</th><th>Oracle</th><th>SQLite</th></tr>
<tr><td>Büyük / küçük harf</td><td colspan="5"><code>UPPER(s)</code>, <code>LOWER(s)</code> (hepsinde aynı)</td></tr>
<tr><td>Uzunluk</td><td><code>LEN(s)</code></td><td><code>LENGTH(s)</code></td><td><code>CHAR_LENGTH(s)</code></td><td><code>LENGTH(s)</code></td><td><code>LENGTH(s)</code></td></tr>
<tr><td>Parça al</td><td><code>SUBSTRING(s, 1, 4)</code></td><td><code>SUBSTRING(s, 1, 4)</code></td><td><code>SUBSTRING(s, 1, 4)</code></td><td><code>SUBSTR(s, 1, 4)</code></td><td><code>SUBSTR(s, 1, 4)</code></td></tr>
<tr><td>Soldan / sağdan</td><td><code>LEFT(s,3)</code></td><td><code>LEFT(s,3)</code></td><td><code>LEFT(s,3)</code></td><td><code>SUBSTR(s,1,3)</code></td><td><code>SUBSTR(s,1,3)</code></td></tr>
<tr><td>Konum bul</td><td><code>CHARINDEX('@', s)</code></td><td><code>STRPOS(s, '@')</code></td><td><code>INSTR(s, '@')</code></td><td><code>INSTR(s, '@')</code></td><td><code>INSTR(s, '@')</code></td></tr>
<tr><td>Birleştir</td><td><code>a + b</code>, <code>CONCAT(a, b)</code></td><td><code>a || b</code></td><td><code>CONCAT(a, b)</code></td><td><code>a || b</code></td><td><code>a || b</code></td></tr>
<tr><td>Boşluk temizle</td><td colspan="5"><code>TRIM(s)</code>, <code>LTRIM(s)</code>, <code>RTRIM(s)</code></td></tr>
<tr><td>Değiştir</td><td colspan="5"><code>REPLACE(s, 'eski', 'yeni')</code></td></tr>
</table></div>
<h2>E-postadan alan adı çıkarmak</h2>
<pre class="code">SELECT email,
       SUBSTR(email, INSTR(email, '@') + 1) AS alan_adi
FROM customers
WHERE email IS NOT NULL;</pre>
<h2>Baş harfler ve birleştirme</h2>
<pre class="code">SELECT first_name, last_name,
       SUBSTR(first_name, 1, 1) || '.' || SUBSTR(last_name, 1, 1) || '.' AS bas_harf
FROM employees;</pre>
<div class="warn"><b>Birleştirme ve NULL</b><code>||</code> ve SQL Server'daki <code>+</code>, bir taraf NULL ise sonucu NULL yapar. <code>CONCAT()</code> ise SQL Server, PostgreSQL ve Oracle'da NULL'ı boş metin sayar; MySQL'de CONCAT yine NULL döner. Oracle'da boş metin <code>''</code> zaten NULL'dır.</div>
<div class="warn" data-d="mysql"><b>MySQL tuzağı</b>MySQL'de <code>||</code> varsayılan olarak mantıksal VEYA (OR) demektir: <code>'a' || 'b'</code> sonuç olarak 0 döner. Metin birleştirmek için her zaman <code>CONCAT</code> kullan.</div>
<div class="note"><b>Türkçe karakterler</b>SQLite'ın UPPER/LOWER fonksiyonları yalnızca İngilizce harfleri dönüştürür. SQL Server, PostgreSQL ve Oracle'da doğru <i>collation</i> (harmanlama) ile Türkçe <code>İ/ı</code> düzgün çalışır; yine de “i” ile “İ” dönüşümünü mutlaka test et.</div>
`
});

put({
  id: 'sayi-tip', lv: 'A2', mod: 'Fonksiyonlar', min: 14,
  title: 'Sayılar, veri tipleri ve CAST',
  sum: 'ROUND, tam sayı bölmesi tuzağı (programdan programa değişir) ve tip dönüşümü.',
  body: `
<h2>Sayısal fonksiyonlar</h2>
<table><tr><th>Fonksiyon</th><th>Açıklama</th></tr>
<tr><td><code>ROUND(x, n)</code></td><td>n basamağa yuvarla</td></tr>
<tr><td><code>ABS(x)</code></td><td>Mutlak değer</td></tr>
<tr><td><code>CEILING(x)</code> / <code>CEIL(x)</code>, <code>FLOOR(x)</code></td><td>Yukarı / aşağı yuvarla</td></tr>
<tr><td><code>x % y</code> (Oracle: <code>MOD(x, y)</code>)</td><td>Bölümden kalan</td></tr>
<tr><td><code>POWER(x, y)</code>, <code>SQRT(x)</code></td><td>Üs, karekök</td></tr>
</table>
<h2>Tam sayı bölmesi: aynı sorgu, farklı sonuç</h2>
<p>İki tam sayıyı böldüğünde sonuç programa göre değişir. Aşağıdaki sorguyu çalıştır, sonra program sekmesini değiştirip tekrar çalıştır:</p>
${CODE("SELECT 7 / 2 AS tam_bolme,\n       7 / 2.0 AS ondalikli,\n       CAST(7 AS REAL) / 2 AS cast_ile;", null, { diff: ['mysql', 'oracle'] })}
<table><tr><th>Program</th><th><code>7 / 2</code></th></tr>
<tr><td>SQL Server, PostgreSQL, SQLite</td><td><b>3</b> (tam sayı bölmesi)</td></tr>
<tr><td>MySQL, Oracle</td><td><b>3.5</b> (MySQL'de tam sayı bölmesi için <code>DIV</code>)</td></tr>
</table>
<p>Oran hesaplarken (dönüşüm oranı, yüzde) bu hata çok yaygındır. Güvenli yol, payı ondalıklı yapmaktır: <code>100.0 * pay / payda</code>. Böylece her programda aynı sonucu alırsın.</p>
<h2>Veri tipleri</h2>
<div class="tbl-wrap"><table><tr><th>Genel tip</th><th>SQL Server</th><th>PostgreSQL</th><th>MySQL</th><th>Oracle</th></tr>
<tr><td>Tam sayı</td><td><code>INT</code>, <code>BIGINT</code></td><td><code>INTEGER</code>, <code>BIGINT</code></td><td><code>INT</code>, <code>BIGINT</code></td><td><code>NUMBER(10)</code></td></tr>
<tr><td>Para / kesin ondalık</td><td><code>DECIMAL(12,2)</code></td><td><code>NUMERIC(12,2)</code></td><td><code>DECIMAL(12,2)</code></td><td><code>NUMBER(12,2)</code></td></tr>
<tr><td>Yaklaşık ondalık</td><td><code>FLOAT</code></td><td><code>DOUBLE PRECISION</code></td><td><code>DOUBLE</code></td><td><code>BINARY_DOUBLE</code></td></tr>
<tr><td>Metin</td><td><code>NVARCHAR(n)</code></td><td><code>VARCHAR(n)</code>, <code>TEXT</code></td><td><code>VARCHAR(n)</code></td><td><code>VARCHAR2(n)</code></td></tr>
<tr><td>Tarih / zaman</td><td><code>DATE</code>, <code>DATETIME2</code></td><td><code>DATE</code>, <code>TIMESTAMP</code></td><td><code>DATE</code>, <code>DATETIME</code></td><td><code>DATE</code>, <code>TIMESTAMP</code></td></tr>
<tr><td>Mantıksal</td><td><code>BIT</code></td><td><code>BOOLEAN</code></td><td><code>BOOLEAN</code> (TINYINT)</td><td><code>NUMBER(1)</code> (23ai: BOOLEAN)</td></tr>
</table></div>
<div class="note"><b>SQLite'ın esnek tipleri</b>SQLite'ta yalnızca 5 depolama sınıfı vardır (NULL, INTEGER, REAL, TEXT, BLOB) ve tarihler metin olarak saklanır. Diğer programlar tiplerde çok daha katıdır.</div>
<h2>CAST ile dönüşüm</h2>
<pre class="code">SELECT name,
       CAST(price AS INTEGER) AS tam_fiyat,
       CAST(stock AS TEXT) || ' adet' AS stok_metni
FROM products
LIMIT 3;</pre>
<div class="note" data-d="tsql"><b>SQL Server'da</b><code>CONVERT(tip, değer, stil)</code> ve hata vermek yerine NULL döndüren <code>TRY_CAST</code> / <code>TRY_CONVERT</code> da vardır. Ayrıntılar T-SQL modülünde.</div>
<div class="warn"><b>Ondalığı tam sayıya çevirmek</b>SQL Server ve SQLite <code>CAST(2.7 AS INT)</code> sonucunu 2'ye <b>keser</b>; PostgreSQL, MySQL ve Oracle 3'e <b>yuvarlar</b>. Niyetin buysa açıkça <code>FLOOR</code> veya <code>ROUND</code> kullan.</div>
`
});

put({
  id: 'tarih-fn', lv: 'A2', mod: 'Fonksiyonlar', min: 18,
  title: 'Tarih ve saat fonksiyonları',
  sum: 'Yıl/ay çıkarmak, tarih farkı ve tarih aritmetiği; programlar arası en büyük fark burada.',
  body: `
<h2>Analistin en çok kullandığı fonksiyonlar</h2>
<p>Satış trendleri, kohortlar, büyüme oranları… hepsi tarihle başlar. Tarih fonksiyonları programlar arasında <b>en çok fark gösteren</b> alandır. Aşağıdaki her kod kutusunda program sekmesini değiştirerek aynı işin nasıl yazıldığını gör.</p>
<h3>Yıl, ay, gün parçaları</h3>
<div class="tbl-wrap"><table><tr><th>İşlem</th><th>SQL Server</th><th>PostgreSQL / Oracle</th><th>MySQL</th><th>SQLite</th></tr>
<tr><td>Yıl</td><td><code>YEAR(d)</code></td><td><code>EXTRACT(YEAR FROM d)</code></td><td><code>YEAR(d)</code></td><td><code>strftime('%Y', d)</code></td></tr>
<tr><td>Ay (sayı)</td><td><code>MONTH(d)</code></td><td><code>EXTRACT(MONTH FROM d)</code></td><td><code>MONTH(d)</code></td><td><code>strftime('%m', d)</code></td></tr>
<tr><td>“2024-05” biçimi</td><td><code>FORMAT(d, 'yyyy-MM')</code></td><td><code>TO_CHAR(d, 'YYYY-MM')</code></td><td><code>DATE_FORMAT(d, '%Y-%m')</code></td><td><code>strftime('%Y-%m', d)</code></td></tr>
<tr><td>Haftanın günü</td><td><code>DATEPART(weekday, d)</code></td><td><code>EXTRACT(DOW FROM d)</code> / <code>TO_CHAR(d,'D')</code></td><td><code>DAYOFWEEK(d)</code></td><td><code>strftime('%w', d)</code></td></tr>
<tr><td>Bugün</td><td><code>GETDATE()</code></td><td><code>CURRENT_DATE</code> / <code>SYSDATE</code></td><td><code>CURDATE()</code></td><td><code>date('now')</code></td></tr>
</table></div>
<pre class="code">SELECT strftime('%Y-%m', order_date) AS ay,
       COUNT(*) AS siparis
FROM orders
GROUP BY strftime('%Y-%m', order_date)
ORDER BY ay;</pre>
<h3>Tarih aritmetiği</h3>
<div class="tbl-wrap"><table><tr><th>İşlem</th><th>SQL Server</th><th>PostgreSQL</th><th>MySQL</th><th>Oracle</th></tr>
<tr><td>7 gün ekle</td><td><code>DATEADD(day, 7, d)</code></td><td><code>d + INTERVAL '7 day'</code></td><td><code>DATE_ADD(d, INTERVAL 7 DAY)</code></td><td><code>d + 7</code></td></tr>
<tr><td>1 ay ekle</td><td><code>DATEADD(month, 1, d)</code></td><td><code>d + INTERVAL '1 month'</code></td><td><code>DATE_ADD(d, INTERVAL 1 MONTH)</code></td><td><code>ADD_MONTHS(d, 1)</code></td></tr>
<tr><td>Ayın ilk günü</td><td><code>DATEFROMPARTS(YEAR(d), MONTH(d), 1)</code></td><td><code>DATE_TRUNC('month', d)</code></td><td><code>DATE_FORMAT(d, '%Y-%m-01')</code></td><td><code>TRUNC(d, 'MM')</code></td></tr>
<tr><td>Gün farkı</td><td><code>DATEDIFF(day, d1, d2)</code></td><td><code>d2 - d1</code></td><td><code>DATEDIFF(d2, d1)</code></td><td><code>d2 - d1</code></td></tr>
</table></div>
<pre class="code">SELECT date('2024-01-15', '+1 month') AS bir_ay_sonra,
       date('2024-03-15', 'start of month') AS ay_basi,
       date('2024-03-15', '-7 days') AS bir_hafta_once,
       julianday('2024-12-31') - julianday('2024-01-01') AS gun_farki;</pre>
<div class="warn"><b>Ay sonu tuzağı</b>31 Ocak'a 1 ay eklemek: SQL Server, PostgreSQL, MySQL ve Oracle <code>2024-02-29</code> (ayın son günü) verir; SQLite ise taşmayı sonraki aya aktarır ve <code>2024-03-02</code> verir. Ay sonu tarihleriyle çalışırken programının davranışını mutlaka test et.</div>
<div class="note" data-d="tsql"><b>SQL Server'da DATEDIFF</b><code>DATEDIFF(month, '2024-01-31', '2024-02-01')</code> sonucu 1'dir; çünkü DATEDIFF geçen tam süreyi değil, <b>aşılan sınır sayısını</b> sayar. Yaş hesaplarken bu fark önemlidir.</div>
<p>Çalışanların işe girişinden bu yana geçen gün:</p>
<pre class="code">SELECT first_name, hire_date,
       CAST(julianday('2025-01-01') - julianday(hire_date) AS INTEGER) AS gun
FROM employees
ORDER BY gun DESC
LIMIT 5;</pre>
`,
  ex: [
    { t: 'sql', q: '<p>Her <b>yıl</b> için sipariş sayısını getir: <code>yil</code>, sayı. Yıla göre sırala.</p>', sol: "SELECT strftime('%Y', order_date) AS yil, COUNT(*) FROM orders GROUP BY strftime('%Y', order_date) ORDER BY yil;", ord: true, hint: 'Yılı çıkaran fonksiyonu kullan (SQL Server: YEAR(d), PostgreSQL/Oracle: EXTRACT(YEAR FROM d), MySQL: YEAR(d), SQLite: strftime(\'%Y\', d)).' },
    { t: 'sql', q: '<p>2024 yılında, <b>haftanın hangi gününde</b> kaç sipariş verilmiş? Gün numarası (Pazar = 0, Pazartesi = 1 …) ve sayıyı getir, güne göre sırala.</p>', sol: "SELECT CAST(strftime('%w', order_date) AS INTEGER) AS gun, COUNT(*) FROM orders WHERE order_date >= '2024-01-01' AND order_date < '2025-01-01' GROUP BY CAST(strftime('%w', order_date) AS INTEGER) ORDER BY gun;", ord: true, hint: 'SQL Server: DATEPART(weekday, d) - 1 (Pazar=1 olduğu için), PostgreSQL: EXTRACT(DOW FROM d), MySQL: DAYOFWEEK(d) - 1, SQLite: strftime(\'%w\', d).' },
    { t: 'sql', q: '<p>Her çalışanın işe girdiği tarihten <code>2025-01-01</code> tarihine kadar geçen <b>gün sayısını</b> hesapla: <code>first_name</code>, <code>gun</code>. En kıdemliden başlayarak sırala.</p>', sol: "SELECT first_name, CAST(julianday('2025-01-01') - julianday(hire_date) AS INTEGER) AS gun FROM employees ORDER BY gun DESC;", ord: true, hint: 'SQL Server: DATEDIFF(day, hire_date, \'2025-01-01\'), MySQL: DATEDIFF(\'2025-01-01\', hire_date), PostgreSQL/Oracle: DATE \'2025-01-01\' - hire_date.' }
  ]
});

put({
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
${CODE("SELECT e.first_name, e.dept_id AS calisan_dept, d.name AS departman\nFROM employees e\nFULL OUTER JOIN departments d ON e.dept_id = d.dept_id\nWHERE e.emp_id IS NULL OR d.dept_id IS NULL;", { mysql: "-- MySQL FULL OUTER JOIN desteklemez: LEFT ve RIGHT JOIN'i birleştir\nSELECT e.first_name, e.dept_id AS calisan_dept, d.name AS departman\nFROM employees e\nLEFT JOIN departments d ON e.dept_id = d.dept_id\nWHERE d.dept_id IS NULL\nUNION ALL\nSELECT e.first_name, e.dept_id, d.name\nFROM employees e\nRIGHT JOIN departments d ON e.dept_id = d.dept_id\nWHERE e.emp_id IS NULL;" })}
<p>Bu sorgu hem departmanı olmayan çalışanı (genel müdür) hem de çalışanı olmayan departmanı (Hukuk) gösterir.</p>
<div class="note"><b>Destek</b>SQL Server, PostgreSQL, Oracle ve SQLite (3.39+) FULL OUTER JOIN destekler. MySQL desteklemez; orada LEFT JOIN ile RIGHT JOIN sonuçları UNION ile birleştirilir. MySQL sekmesine geçip yazımı gör.</div>
<h2>Özet</h2>
<table><tr><th>JOIN</th><th>Sol tablonun eşsizleri</th><th>Sağ tablonun eşsizleri</th></tr>
<tr><td>INNER</td><td>Yok</td><td>Yok</td></tr>
<tr><td>LEFT</td><td>Var</td><td>Yok</td></tr>
<tr><td>RIGHT</td><td>Yok</td><td>Var</td></tr>
<tr><td>FULL</td><td>Var</td><td>Var</td></tr>
</table>
`,
  ex: [
    { t: 'sql', q: '<p><code>employees</code> ve <code>departments</code> tablolarını birleştir ve <b>sadece eşi olmayan</b> satırları getir: <code>e.first_name</code>, <code>d.name</code>. (MySQL\'de FULL OUTER JOIN yerine LEFT + RIGHT JOIN birleşimini kullan.)</p>', sol: 'SELECT e.first_name, d.name FROM employees e FULL OUTER JOIN departments d ON e.dept_id = d.dept_id WHERE e.emp_id IS NULL OR d.dept_id IS NULL;', solv: { mysql: 'SELECT e.first_name, d.name FROM employees e LEFT JOIN departments d ON e.dept_id = d.dept_id WHERE d.dept_id IS NULL\nUNION ALL\nSELECT e.first_name, d.name FROM employees e RIGHT JOIN departments d ON e.dept_id = d.dept_id WHERE e.emp_id IS NULL;' } },
    { t: 'mc', q: '<p><code>A LEFT JOIN B</code> ile aynı sonucu veren ifade hangisidir?</p>', o: ['<code>B LEFT JOIN A</code>', '<code>B RIGHT JOIN A</code>', '<code>A INNER JOIN B</code>', '<code>A FULL JOIN B</code>'], a: 1 }
  ]
});

put({
  id: 'ddl-create', lv: 'C1', mod: 'Veritabanı Tasarımı', min: 15,
  title: 'CREATE TABLE, veri tipleri ve kısıtlar',
  sum: 'Tablo tanımlamak; PRIMARY KEY, NOT NULL, UNIQUE, CHECK, DEFAULT, FOREIGN KEY.',
  body: `
<h2>Tablo oluşturmak</h2>
<p>Kod kutusundaki program sekmesini değiştirerek her programın veri tiplerini gör (ör. metin için SQL Server'da <code>NVARCHAR</code>, Oracle'da <code>VARCHAR2</code>).</p>
<pre class="code">CREATE TABLE suppliers (
  supplier_id INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  tax_no      TEXT UNIQUE,
  city        TEXT DEFAULT 'İstanbul',
  rating      INTEGER CHECK (rating BETWEEN 1 AND 5)
);
INSERT INTO suppliers (supplier_id, name, tax_no, rating) VALUES (1, 'Ege Tekstil', '1234567890', 4);
SELECT * FROM suppliers;</pre>
<h2>Kısıtlar (constraints)</h2>
<table><tr><th>Kısıt</th><th>Görevi</th></tr>
<tr><td><code>PRIMARY KEY</code></td><td>Satırı benzersiz tanımlar; NULL olamaz.</td></tr>
<tr><td><code>NOT NULL</code></td><td>Boş bırakılamaz.</td></tr>
<tr><td><code>UNIQUE</code></td><td>Tekrar edemez.</td></tr>
<tr><td><code>CHECK (koşul)</code></td><td>Değer koşulu sağlamalı.</td></tr>
<tr><td><code>DEFAULT değer</code></td><td>Değer verilmezse kullanılır.</td></tr>
<tr><td><code>REFERENCES t(sutun)</code></td><td>Yabancı anahtar: değer diğer tabloda olmalı.</td></tr>
</table>
<p>Kısıtların işe yaradığını gör: aşağıdaki sorgu CHECK kuralını ihlal ettiği için hata verir. Hata mesajı seçili programın kendi mesajına benzer şekilde gösterilir.</p>
${CODE("CREATE TABLE ratings (id INTEGER PRIMARY KEY, stars INTEGER CHECK (stars BETWEEN 1 AND 5));\nINSERT INTO ratings (id, stars) VALUES (1, 7);", null, { err: true })}
<h2>Yabancı anahtar ve eylemler</h2>
<pre class="code" data-norun>CREATE TABLE supplier_products (
  supplier_id INTEGER REFERENCES suppliers(supplier_id) ON DELETE CASCADE,
  product_id  INTEGER REFERENCES products(product_id),
  PRIMARY KEY (supplier_id, product_id)   -- bileşik birincil anahtar
);</pre>
<p><code>ON DELETE CASCADE</code>: Tedarikçi silinince ilgili satırlar da silinir. Alternatifler: <code>SET NULL</code>, <code>NO ACTION</code>.</p>
<div class="note"><b>Otomatik artan anahtar</b>SQL Server: <code>INT IDENTITY(1,1) PRIMARY KEY</code> · PostgreSQL: <code>INTEGER GENERATED ALWAYS AS IDENTITY</code> (eski: <code>SERIAL</code>) · MySQL: <code>INT AUTO_INCREMENT PRIMARY KEY</code> · Oracle: <code>NUMBER GENERATED AS IDENTITY</code> · SQLite: <code>INTEGER PRIMARY KEY</code>. Para için <code>DECIMAL(12,2)</code> kullanılır, FLOAT değil.</div>
<p>Sorgu sonucundan tablo üretmek de mümkündür. SQL Server'da bu iş <code>SELECT ... INTO</code> ile yapılır:</p>
<pre class="code">CREATE TABLE vip_customers AS
SELECT * FROM customers WHERE segment = 'Premium';
SELECT COUNT(*) FROM vip_customers;</pre>
`,
  ex: [
    { t: 'sql', q: '<p><code>campaigns</code> adında bir tablo oluştur: <code>campaign_id</code> tam sayı birincil anahtar, <code>name</code> metin ve boş olamaz, <code>budget</code> ondalıklı sayı, <code>start_date</code> tarih (programının tiplerini kullan: SQL Server\'da INT, NVARCHAR(100), DECIMAL(12,2), DATE gibi).</p>', start: 'CREATE TABLE campaigns (\n  \n);', sol: 'CREATE TABLE campaigns (campaign_id INTEGER PRIMARY KEY, name TEXT NOT NULL, budget REAL, start_date TEXT);', check: "SELECT name, affinity_(type), \"notnull\", pk FROM pragma_table_info('campaigns') ORDER BY cid", hint: 'Sütun adları ve sırası kontrol edilir; tipler genel ailesine göre (tam sayı / ondalık / metin) değerlendirilir.' },
    { t: 'sql', q: '<p><code>reviews</code> tablosu oluştur: <code>review_id</code> tam sayı birincil anahtar, <code>product_id</code> tam sayı (products tablosuna referans), <code>stars</code> tam sayı ve <b>1–5 arasında olmalı</b> (CHECK).</p>', sol: 'CREATE TABLE reviews (review_id INTEGER PRIMARY KEY, product_id INTEGER REFERENCES products(product_id), stars INTEGER CHECK (stars BETWEEN 1 AND 5));', check: "SELECT name, affinity_(type), pk, (SELECT COUNT(*) FROM sqlite_master WHERE name='reviews' AND sql LIKE '%CHECK%') FROM pragma_table_info('reviews') ORDER BY cid" },
    { t: 'sql', q: '<p><b>Elektronik</b> kategorisindeki ürünleri içeren <code>electronics</code> tablosunu bir sorgunun sonucundan oluştur (SQL Server\'da <code>SELECT ... INTO</code>, diğerlerinde <code>CREATE TABLE ... AS SELECT</code>).</p>', sol: "CREATE TABLE electronics AS SELECT * FROM products WHERE category = 'Elektronik';", check: 'SELECT product_id, name, price FROM electronics ORDER BY product_id' }
  ]
});

put({
  id: 'dml', lv: 'C1', mod: 'Veri Değiştirme', min: 15,
  title: 'INSERT, UPDATE, DELETE',
  sum: 'Veri eklemek, güncellemek ve silmek; WHERE\'siz UPDATE felaketi.',
  body: `
<h2>INSERT: veri eklemek</h2>
<pre class="code">INSERT INTO departments (dept_id, name, city)
VALUES (8, 'Lojistik', 'Kocaeli');

INSERT INTO departments (dept_id, name, city)
VALUES (9, 'Müşteri Hizmetleri', 'Ankara'),
       (10, 'Ar-Ge', 'İzmir');

SELECT * FROM departments;</pre>
<p>Sütun listesini her zaman yaz; tabloya ileride sütun eklenirse sorgun bozulmaz. Sorgu sonucundan da ekleyebilirsin: <code>INSERT INTO t (a, b) SELECT x, y FROM ...</code>. Mesajlar bölümünde kaç satırın etkilendiğini görürsün.</p>
<h2>UPDATE: güncellemek</h2>
<pre class="code">UPDATE products
SET price = ROUND(price * 1.10, 0), stock = stock - 1
WHERE category = 'Kitap';
SELECT name, price, stock FROM products WHERE category = 'Kitap';</pre>
<h2>DELETE: silmek</h2>
<pre class="code">DELETE FROM orders WHERE status = 'cancelled' AND order_date < '2023-01-01';
SELECT COUNT(*) AS kalan_iptal FROM orders WHERE status = 'cancelled';</pre>
<div class="warn"><b>WHERE'siz UPDATE / DELETE</b><code>UPDATE employees SET salary = 0;</code> tüm çalışanların maaşını sıfırlar. Gerçek sistemlerde değiştirmeden önce aynı WHERE ile bir SELECT çalıştırıp etkilenecek satırları gör, işlemi transaction içinde yap.</div>
<div class="note"><b>Bu uygulamada</b>Ders alıştırmaları her denemede veritabanının temiz bir kopyası üzerinde çalışır. Rahatça silip güncelleyebilirsin.</div>
`
});

put({
  id: 'upsert', lv: 'C1', mod: 'Veri Değiştirme', min: 15,
  title: 'UPSERT ve MERGE: varsa güncelle, yoksa ekle',
  sum: 'ON CONFLICT, ON DUPLICATE KEY UPDATE, MERGE ve değişen satırları döndürmek.',
  body: `
<h2>Varsa güncelle, yoksa ekle</h2>
<p>Veri yüklerken aynı anahtarlı kayıt zaten olabilir. Her program bunu farklı yazar; bu ders program sekmeleri arasındaki farkı görmek için en iyi örneklerden biri:</p>
${CODE("INSERT INTO departments (dept_id, name, city)\nVALUES (7, 'Hukuk ve Uyum', 'Ankara'),\n       (12, 'Satın Alma', 'Bursa')\nON CONFLICT (dept_id) DO UPDATE\n  SET name = excluded.name, city = excluded.city;\nSELECT * FROM departments ORDER BY dept_id;", {
  tsql: "MERGE INTO departments AS t\nUSING (SELECT 7 AS dept_id, N'Hukuk ve Uyum' AS name, N'Ankara' AS city\n       UNION ALL SELECT 12, N'Satın Alma', N'Bursa') AS s\n   ON t.dept_id = s.dept_id\nWHEN MATCHED THEN\n  UPDATE SET name = s.name, city = s.city\nWHEN NOT MATCHED THEN\n  INSERT (dept_id, name, city) VALUES (s.dept_id, s.name, s.city);\nSELECT * FROM departments ORDER BY dept_id;",
  mysql: "INSERT INTO departments (dept_id, name, city)\nVALUES (7, 'Hukuk ve Uyum', 'Ankara'),\n       (12, 'Satın Alma', 'Bursa')\nON DUPLICATE KEY UPDATE\n  name = VALUES(name), city = VALUES(city);\nSELECT * FROM departments ORDER BY dept_id;",
  oracle: "MERGE INTO departments t\nUSING (SELECT 7 AS dept_id, 'Hukuk ve Uyum' AS name, 'Ankara' AS city FROM dual\n       UNION ALL SELECT 12, 'Satın Alma', 'Bursa' FROM dual) s\n   ON (t.dept_id = s.dept_id)\nWHEN MATCHED THEN\n  UPDATE SET t.name = s.name, t.city = s.city\nWHEN NOT MATCHED THEN\n  INSERT (dept_id, name, city) VALUES (s.dept_id, s.name, s.city);\nSELECT * FROM departments ORDER BY dept_id;"
})}
<table><tr><th>Program</th><th>Yazım</th></tr>
<tr><td>PostgreSQL, SQLite</td><td><code>INSERT ... ON CONFLICT (anahtar) DO UPDATE SET ... = excluded....</code></td></tr>
<tr><td>MySQL</td><td><code>INSERT ... ON DUPLICATE KEY UPDATE ... = VALUES(...)</code></td></tr>
<tr><td>SQL Server, Oracle</td><td><code>MERGE INTO hedef USING kaynak ON ... WHEN MATCHED ... WHEN NOT MATCHED ...</code></td></tr>
</table>
<p>MERGE en güçlü olanıdır: Kaynakta olmayan hedef satırları silmek için <code>WHEN NOT MATCHED BY SOURCE THEN DELETE</code> (SQL Server) da yazılabilir. PostgreSQL 15+ da MERGE destekler.</p>
<h2>Değişen satırları döndürmek</h2>
${CODE("UPDATE products SET stock = stock + 50\nWHERE stock < 10\nRETURNING product_id, name, stock;", {
  tsql: "UPDATE products SET stock = stock + 50\nOUTPUT inserted.product_id, inserted.name, inserted.stock\nWHERE stock < 10;",
  mysql: "-- MySQL'de RETURNING yoktur; güncellemeden sonra ayrı bir SELECT çalıştırılır\nUPDATE products SET stock = stock + 50 WHERE stock < 10;\nSELECT product_id, name, stock FROM products WHERE stock BETWEEN 50 AND 59;",
  oracle: "-- Oracle'da RETURNING ... INTO yalnızca PL/SQL içinde değişkenlere döner\nUPDATE products SET stock = stock + 50 WHERE stock < 10;\nSELECT product_id, name, stock FROM products WHERE stock BETWEEN 50 AND 59;"
}, { diff: ['mysql', 'oracle'] })}
<div class="note"><b>Özet</b>PostgreSQL ve SQLite <code>RETURNING</code>, SQL Server <code>OUTPUT inserted.* / deleted.*</code> kullanır. OUTPUT, DELETE'te silinen satırları, UPDATE'te hem eski (<code>deleted</code>) hem yeni (<code>inserted</code>) değerleri verebilir.</div>
`,
  ex: [
    { t: 'sql', q: '<p>Departman <b>2</b>\'nin adını <b>\'Pazarlama ve İletişim\'</b>, şehrini <b>\'İstanbul\'</b> yap; aynı ifadeyle departman <b>11</b> (<b>\'Veri Platformu\'</b>, <b>\'Ankara\'</b>) yoksa ekle. Programının upsert yazımını kullan (SQL Server/Oracle: MERGE).</p>', sol: "INSERT INTO departments (dept_id, name, city) VALUES (2, 'Pazarlama ve İletişim', 'İstanbul'), (11, 'Veri Platformu', 'Ankara') ON CONFLICT (dept_id) DO UPDATE SET name = excluded.name, city = excluded.city;", solv: { tsql: "MERGE INTO departments AS t\nUSING (SELECT 2 AS dept_id, N'Pazarlama ve İletişim' AS name, N'İstanbul' AS city\n       UNION ALL SELECT 11, N'Veri Platformu', N'Ankara') AS s\n   ON t.dept_id = s.dept_id\nWHEN MATCHED THEN UPDATE SET name = s.name, city = s.city\nWHEN NOT MATCHED THEN INSERT (dept_id, name, city) VALUES (s.dept_id, s.name, s.city);", mysql: "INSERT INTO departments (dept_id, name, city) VALUES (2, 'Pazarlama ve İletişim', 'İstanbul'), (11, 'Veri Platformu', 'Ankara')\nON DUPLICATE KEY UPDATE name = VALUES(name), city = VALUES(city);", oracle: "MERGE INTO departments t\nUSING (SELECT 2 AS dept_id, 'Pazarlama ve İletişim' AS name, 'İstanbul' AS city FROM dual\n       UNION ALL SELECT 11, 'Veri Platformu', 'Ankara' FROM dual) s\n   ON (t.dept_id = s.dept_id)\nWHEN MATCHED THEN UPDATE SET t.name = s.name, t.city = s.city\nWHEN NOT MATCHED THEN INSERT (dept_id, name, city) VALUES (s.dept_id, s.name, s.city);" }, check: 'SELECT * FROM departments ORDER BY dept_id' },
    { t: 'sql', q: '<p><code>price_updates</code> tablosundaki <b>her ürünün en son</b> (<code>updated_at</code> en büyük) fiyatını <code>products.price</code>\'a uygula.</p>', sol: 'UPDATE products SET price = (SELECT pu.new_price FROM price_updates pu WHERE pu.product_id = products.product_id ORDER BY pu.updated_at DESC LIMIT 1) WHERE product_id IN (SELECT product_id FROM price_updates);', check: 'SELECT product_id, price FROM products ORDER BY product_id', hint: 'UPDATE ... SET price = (ilişkili alt sorgu: en son kaydı alan TOP 1 / LIMIT 1 / FETCH FIRST 1) WHERE product_id IN (...)' }
  ]
});

put({
  id: 'alter-drop', lv: 'C1', mod: 'Veritabanı Tasarımı', min: 10,
  title: 'ALTER TABLE, DROP ve TRUNCATE',
  sum: 'Var olan tabloyu değiştirmek, kaldırmak ve şemayı sorgulamak.',
  body: `
<h2>ALTER TABLE</h2>
${CODE("ALTER TABLE customers ADD COLUMN phone TEXT;\nALTER TABLE customers RENAME COLUMN segment TO customer_segment;\nSELECT name FROM pragma_table_info('customers');", {
  tsql: "ALTER TABLE customers ADD phone NVARCHAR(20);\nEXEC sp_rename 'customers.segment', 'customer_segment', 'COLUMN';\nSELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS\nWHERE TABLE_NAME = 'customers' ORDER BY ORDINAL_POSITION;",
  pg: "ALTER TABLE customers ADD COLUMN phone VARCHAR(20);\nALTER TABLE customers RENAME COLUMN segment TO customer_segment;\nSELECT column_name FROM information_schema.columns\nWHERE table_name = 'customers' ORDER BY ordinal_position;",
  mysql: "ALTER TABLE customers ADD COLUMN phone VARCHAR(20);\nALTER TABLE customers RENAME COLUMN segment TO customer_segment;\nSELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS\nWHERE TABLE_NAME = 'customers' ORDER BY ORDINAL_POSITION;",
  oracle: "ALTER TABLE customers ADD (phone VARCHAR2(20));\nALTER TABLE customers RENAME COLUMN segment TO customer_segment;\nSELECT column_name FROM user_tab_columns\nWHERE table_name = 'CUSTOMERS' ORDER BY column_id;"
}, { diff: ['oracle'] })}
<p>Sütun adlarını listelemek için standart yol <code>INFORMATION_SCHEMA.COLUMNS</code> görünümüdür (SQL Server, PostgreSQL, MySQL). Oracle kendi sözlük görünümlerini (<code>USER_TAB_COLUMNS</code>), SQLite <code>pragma_table_info</code> kullanır. Oracle tablo adlarını büyük harfle saklar.</p>
<p>Sütun tipini değiştirmek de yaygındır: SQL Server <code>ALTER TABLE t ALTER COLUMN c NVARCHAR(200)</code>, PostgreSQL <code>ALTER COLUMN c TYPE ...</code>, MySQL/Oracle <code>MODIFY</code>. SQLite'ın ALTER desteği sınırlıdır.</p>
<h2>DROP, TRUNCATE, DELETE</h2>
<table><tr><th>Komut</th><th>Ne yapar?</th></tr>
<tr><td><code>DELETE FROM t</code></td><td>Satırları siler, yapı kalır, WHERE kullanılabilir, geri alınabilir.</td></tr>
<tr><td><code>TRUNCATE TABLE t</code></td><td>Tüm satırları hızla siler, yapı kalır (SQLite'ta yok).</td></tr>
<tr><td><code>DROP TABLE t</code></td><td>Tabloyu yapısıyla birlikte kaldırır.</td></tr>
</table>
${CODE("DROP TABLE IF EXISTS raw_signups;\nSELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name;", {
  tsql: "DROP TABLE IF EXISTS raw_signups;\nSELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES\nWHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME;",
  pg: "DROP TABLE IF EXISTS raw_signups;\nSELECT table_name FROM information_schema.tables\nWHERE table_type = 'BASE TABLE' ORDER BY table_name;",
  mysql: "DROP TABLE IF EXISTS raw_signups;\nSELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES\nWHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME;",
  oracle: "DROP TABLE raw_signups;\nSELECT table_name FROM user_tables ORDER BY table_name;"
}, { diff: ['oracle'] })}
<div class="warn"><b>Üretimde şema değişikliği</b>Gerçek sistemlerde şema değişiklikleri <i>migration</i> araçlarıyla (Flyway, Liquibase, Alembic, dbt) sürümlenir ve geri alınabilir şekilde yapılır.</div>
`
});

put({
  id: 'index', lv: 'C1', mod: 'Performans', min: 15,
  title: 'İndeksler ve sorgu planı',
  sum: 'B-tree indeksler, sorgu planını okumak, ne zaman indeks?',
  body: `
<h2>İndeks = kitabın arkasındaki dizin</h2>
<p>İndeks olmadan veritabanı bir koşulu sağlayan satırları bulmak için tüm tabloyu tarar (<i>full table scan</i> / SQL Server'da <i>Table Scan</i>). İndeks, sütun değerlerini sıralı bir <b>B-tree</b> yapısında tutar ve aramayı logaritmik zamana indirir.</p>
<h2>Sorgu planını görmek</h2>
<table><tr><th>Program</th><th>Planı görme</th></tr>
<tr><td>SQL Server</td><td>SSMS'te <b>Ctrl+M</b> (gerçek plan) veya <code>SET SHOWPLAN_TEXT ON</code></td></tr>
<tr><td>PostgreSQL</td><td><code>EXPLAIN</code>, <code>EXPLAIN ANALYZE</code></td></tr>
<tr><td>MySQL</td><td><code>EXPLAIN</code>, <code>EXPLAIN ANALYZE</code> (8.0.18+)</td></tr>
<tr><td>Oracle</td><td><code>EXPLAIN PLAN FOR ...</code> + <code>DBMS_XPLAN.DISPLAY</code></td></tr>
<tr><td>SQLite</td><td><code>EXPLAIN QUERY PLAN</code></td></tr>
</table>
<p>Tarayıcıdaki motor SQLite olduğu için aşağıdaki kutular hangi programı seçersen seç SQLite planını gösterir; yazım farkını sekmelerde görebilirsin.</p>
${CODE("EXPLAIN QUERY PLAN\nSELECT * FROM orders WHERE customer_id = 42;", {
  tsql: "SET SHOWPLAN_TEXT ON;\nGO\nSELECT * FROM orders WHERE customer_id = 42;\nGO\nSET SHOWPLAN_TEXT OFF;",
  pg: "EXPLAIN\nSELECT * FROM orders WHERE customer_id = 42;",
  mysql: "EXPLAIN\nSELECT * FROM orders WHERE customer_id = 42;",
  oracle: "EXPLAIN PLAN FOR\nSELECT * FROM orders WHERE customer_id = 42;\nSELECT * FROM TABLE(DBMS_XPLAN.DISPLAY);"
}, { nr: ['tsql', 'pg', 'mysql', 'oracle'] })}
<p>Çıktıda <code>SCAN orders</code> görürsün: tablo baştan sona taranıyor. Şimdi indeks ekleyelim:</p>
${CODE("CREATE INDEX idx_orders_customer ON orders(customer_id);\nEXPLAIN QUERY PLAN\nSELECT * FROM orders WHERE customer_id = 42;", {
  tsql: "CREATE NONCLUSTERED INDEX idx_orders_customer ON orders(customer_id);\nGO\nSET SHOWPLAN_TEXT ON;\nGO\nSELECT * FROM orders WHERE customer_id = 42;",
  pg: "CREATE INDEX idx_orders_customer ON orders(customer_id);\nEXPLAIN SELECT * FROM orders WHERE customer_id = 42;",
  mysql: "CREATE INDEX idx_orders_customer ON orders(customer_id);\nEXPLAIN SELECT * FROM orders WHERE customer_id = 42;",
  oracle: "CREATE INDEX idx_orders_customer ON orders(customer_id);\nEXPLAIN PLAN FOR SELECT * FROM orders WHERE customer_id = 42;\nSELECT * FROM TABLE(DBMS_XPLAN.DISPLAY);"
}, { nr: ['tsql', 'pg', 'mysql', 'oracle'] })}
<p>Artık <code>SEARCH orders USING INDEX idx_orders_customer</code> (SQL Server'da <i>Index Seek</i>, PostgreSQL'de <i>Index Scan</i>).</p>
<h2>Ne zaman indeks?</h2>
<ul>
<li>WHERE, JOIN ON ve ORDER BY'da sık kullanılan, <b>seçici</b> (çok farklı değer içeren) sütunlar.</li>
<li>Yabancı anahtar sütunları (JOIN'ler için).</li>
<li><b>Bileşik indeks</b> <code>(a, b)</code>: <code>WHERE a = ?</code> ve <code>WHERE a = ? AND b = ?</code> için çalışır, sadece <code>WHERE b = ?</code> için genelde çalışmaz (soldan önek kuralı).</li>
</ul>
<div class="note" data-d="tsql"><b>SQL Server'da</b>Bir tabloda tek bir <b>clustered</b> indeks olur (veri bu sıraya göre fiziksel olarak dizilir, genelde birincil anahtar). Diğerleri <b>nonclustered</b>'dır. <code>INCLUDE (sütunlar)</code> ile kapsayan (covering) indeks yapılabilir. T-SQL modülünde ayrıntılı işliyoruz.</div>
<h2>Bedeli</h2>
<ul>
<li>Her INSERT/UPDATE/DELETE indeksleri de günceller; yazma yavaşlar.</li>
<li>Disk alanı kaplar.</li>
<li>Sütuna fonksiyon uygularsan indeks kullanılamayabilir: <code>WHERE YEAR(order_date) = 2024</code> yerine aralık yaz: <code>order_date &gt;= '2024-01-01' AND order_date &lt; '2025-01-01'</code>. Bu kurala SQL Server dünyasında <b>SARGable</b> sorgu denir.</li>
</ul>
`
});

put({
  id: 'view', lv: 'C1', mod: 'Veritabanı Tasarımı', min: 10,
  title: 'View ve materialized view',
  sum: 'Sorguyu isimlendirip tablo gibi kullanmak.',
  body: `
<h2>View: kaydedilmiş sorgu</h2>
<p>View veri saklamaz; her kullanıldığında altındaki sorguyu çalıştırır. Karmaşık JOIN'leri gizlemek, iş mantığını tek yerde tutmak ve kullanıcılara yalnızca belirli sütunları göstermek (güvenlik) için kullanılır.</p>
<pre class="code">CREATE VIEW v_order_revenue AS
SELECT o.order_id, o.customer_id, o.order_date, o.status, o.channel,
       SUM(oi.quantity * oi.unit_price * (1 - oi.discount)) AS revenue
FROM orders o
JOIN order_items oi ON oi.order_id = o.order_id
GROUP BY o.order_id, o.customer_id, o.order_date, o.status, o.channel;

SELECT channel, ROUND(AVG(revenue), 2) AS ortalama_sepet
FROM v_order_revenue
WHERE status = 'delivered'
GROUP BY channel;</pre>
<div class="note"><b>GROUP BY'da tüm sütunlar</b>Yukarıda GROUP BY'a seçilen tüm sütunları yazdık. SQLite ve MySQL eksik yazmana izin verebilir ama SQL Server, PostgreSQL ve Oracle hata verir. Taşınabilir SQL için her zaman tam yaz.</div>
<div class="note" data-d="tsql"><b>SQL Server'da</b>View içinde ORDER BY kullanılamaz (TOP olmadan). Değiştirmek için <code>CREATE OR ALTER VIEW</code> (2016 SP1+) kullanılır. <code>WITH SCHEMABINDING</code> ile bağlı tabloların yapısının değiştirilmesi engellenir; indeksli view'lar (indexed view) için şarttır.</div>
<h2>Materialized view</h2>
<p>Sonucu fiziksel olarak saklar; okuma çok hızlıdır ama veri değiştikçe yenilenmesi gerekir. PostgreSQL: <code>CREATE MATERIALIZED VIEW</code> + <code>REFRESH MATERIALIZED VIEW</code>; Oracle: materialized view; SQL Server: <b>indexed view</b> (otomatik güncellenir); MySQL ve SQLite'ta yoktur, özet tablo ile taklit edilir.</p>
<div class="tip"><b>Analitik pratik</b>Veri ekiplerinde “ciro” gibi metriklerin tanımı tek bir view'da (veya dbt modelinde) tutulur; böylece herkes aynı formülü kullanır.</div>
`
});

put({
  id: 'trigger', lv: 'C1', mod: 'Veritabanı Tasarımı', min: 14,
  title: 'Trigger (tetikleyici)',
  sum: 'Bir olay olduğunda otomatik çalışan SQL; satır bazlı ve küme bazlı tetikleyiciler.',
  body: `
<h2>Olay → eylem</h2>
<p>Trigger, bir tabloda INSERT, UPDATE veya DELETE olduğunda otomatik çalışır. Denetim kaydı (audit log), türetilmiş alanları güncel tutma ve karmaşık doğrulamalar için kullanılır. Yazım programdan programa çok değişir; sekmelerle karşılaştır:</p>
${CODE("CREATE TABLE price_log (\n  product_id INTEGER, old_price REAL, new_price REAL\n);\n\nCREATE TRIGGER trg_price_change\nAFTER UPDATE OF price ON products\nFOR EACH ROW\nWHEN OLD.price <> NEW.price\nBEGIN\n  INSERT INTO price_log (product_id, old_price, new_price)\n  VALUES (OLD.product_id, OLD.price, NEW.price);\nEND;\n\nUPDATE products SET price = price + 10 WHERE category = 'Kitap';\nSELECT product_id, old_price, new_price FROM price_log ORDER BY product_id;", {
  tsql: "CREATE TABLE price_log (\n  product_id INT, old_price DECIMAL(12,2), new_price DECIMAL(12,2)\n);\nGO\nCREATE TRIGGER trg_price_change ON products\nAFTER UPDATE\nAS\nBEGIN\n  SET NOCOUNT ON;\n  INSERT INTO price_log (product_id, old_price, new_price)\n  SELECT d.product_id, d.price, i.price\n  FROM deleted d\n  JOIN inserted i ON i.product_id = d.product_id\n  WHERE d.price <> i.price;\nEND;\nGO\nUPDATE products SET price = price + 10 WHERE category = N'Kitap';\nSELECT product_id, old_price, new_price FROM price_log ORDER BY product_id;",
  pg: "CREATE TABLE price_log (product_id INTEGER, old_price NUMERIC(12,2), new_price NUMERIC(12,2));\n\nCREATE FUNCTION fn_price_change() RETURNS trigger AS $$\nBEGIN\n  IF OLD.price <> NEW.price THEN\n    INSERT INTO price_log VALUES (OLD.product_id, OLD.price, NEW.price);\n  END IF;\n  RETURN NEW;\nEND;\n$$ LANGUAGE plpgsql;\n\nCREATE TRIGGER trg_price_change\nAFTER UPDATE OF price ON products\nFOR EACH ROW EXECUTE FUNCTION fn_price_change();",
  mysql: "CREATE TABLE price_log (product_id INT, old_price DECIMAL(12,2), new_price DECIMAL(12,2));\n\nDELIMITER //\nCREATE TRIGGER trg_price_change\nAFTER UPDATE ON products\nFOR EACH ROW\nBEGIN\n  IF OLD.price <> NEW.price THEN\n    INSERT INTO price_log VALUES (OLD.product_id, OLD.price, NEW.price);\n  END IF;\nEND //\nDELIMITER ;",
  oracle: "CREATE TABLE price_log (product_id NUMBER(10), old_price NUMBER(12,2), new_price NUMBER(12,2));\n\nCREATE OR REPLACE TRIGGER trg_price_change\nAFTER UPDATE OF price ON products\nFOR EACH ROW\nWHEN (OLD.price <> NEW.price)\nBEGIN\n  INSERT INTO price_log VALUES (:OLD.product_id, :OLD.price, :NEW.price);\nEND;\n/"
}, { nr: ['pg', 'mysql', 'oracle'] })}
<table><tr><th>Program</th><th>Önceki / yeni değer</th><th>Çalışma biçimi</th></tr>
<tr><td>SQL Server</td><td><code>deleted</code> / <code>inserted</code> sanal tabloları</td><td>İfade başına bir kez (küme bazlı)</td></tr>
<tr><td>PostgreSQL</td><td><code>OLD</code> / <code>NEW</code></td><td>Trigger fonksiyonu + <code>FOR EACH ROW</code> veya <code>STATEMENT</code></td></tr>
<tr><td>MySQL, SQLite</td><td><code>OLD</code> / <code>NEW</code></td><td>Satır başına</td></tr>
<tr><td>Oracle</td><td><code>:OLD</code> / <code>:NEW</code></td><td>Satır veya ifade düzeyi</td></tr>
</table>
<div class="warn" data-d="tsql"><b>SQL Server'ın en sık yapılan trigger hatası</b>SQL Server trigger'ı her satır için değil, <b>ifade başına bir kez</b> çalışır. 100 satırı güncelleyen bir UPDATE'te <code>inserted</code> tablosunda 100 satır vardır. <code>SELECT @id = product_id FROM inserted</code> gibi tek satır varsayan kod hatalıdır; her zaman küme bazlı yaz.</div>
<div class="warn"><b>Dikkatli kullan</b>Trigger'lar “görünmez” mantık ekler: Bir UPDATE'in neden yavaş olduğunu veya beklenmedik bir tabloyu neden değiştirdiğini bulmak zorlaşır.</div>
`,
  ex: [
    { t: 'sql', q: '<p><code>stock_alerts(product_id, stock)</code> tablosunu oluştur. Ardından <code>trg_low_stock</code> adında, <code>products.stock</code> güncellendiğinde yeni stok <b>5\'in altına</b> düşerse <code>stock_alerts</code>\'a kayıt ekleyen bir trigger yaz. Son olarak ürün <b>1</b>\'in stokunu <b>3</b> yap.</p>', sol: 'CREATE TABLE stock_alerts (product_id INTEGER, stock INTEGER); CREATE TRIGGER trg_low_stock AFTER UPDATE OF stock ON products WHEN NEW.stock < 5 BEGIN INSERT INTO stock_alerts VALUES (NEW.product_id, NEW.stock); END; UPDATE products SET stock = 3 WHERE product_id = 1;', solv: { tsql: "CREATE TABLE stock_alerts (product_id INT, stock INT);\nGO\nCREATE TRIGGER trg_low_stock ON products\nAFTER UPDATE\nAS\nBEGIN\n  INSERT INTO stock_alerts (product_id, stock)\n  SELECT product_id, stock FROM inserted WHERE stock < 5;\nEND;\nGO\nUPDATE products SET stock = 3 WHERE product_id = 1;" }, nr: ['pg', 'mysql', 'oracle'], dl: ['tsql', 'sqlite'], check: 'SELECT product_id, stock FROM stock_alerts', hint: 'SQL Server: CREATE TRIGGER ... ON products AFTER UPDATE AS BEGIN INSERT ... SELECT ... FROM inserted WHERE stock &lt; 5; END; ve ardından GO. SQLite: AFTER UPDATE OF stock ON products WHEN NEW.stock &lt; 5 BEGIN ... END;' }
  ]
});

put({
  id: 'performans', lv: 'C1', mod: 'Performans', min: 12,
  title: 'Sorgu optimizasyonu: iyi alışkanlıklar',
  sum: 'Hızlı ve ölçeklenebilir SQL yazmanın kuralları.',
  body: `
<h2>Büyük veride fark yaratan alışkanlıklar</h2>
<ol>
<li><b>SELECT * yazma.</b> Özellikle sütun tabanlı ambarlarda (BigQuery, Snowflake) okunan sütun kadar ödersin.</li>
<li><b>Erken filtrele.</b> WHERE'i JOIN'den önce veriyi küçültecek şekilde kur; CTE'lerde ihtiyacın olan satırları en başta süz.</li>
<li><b>Sütuna fonksiyon uygulama (SARGable yaz).</b> <code>WHERE YEAR(d) = 2024</code> yerine <code>WHERE d &gt;= '2024-01-01' AND d &lt; '2025-01-01'</code>; böylece indeks ve bölüm (partition) budaması çalışır.</li>
<li><b>Gereksiz DISTINCT ve ORDER BY'dan kaçın.</b> İkisi de sıralama maliyeti getirir.</li>
<li><b>UNION yerine UNION ALL</b>, tekrar olmayacağını biliyorsan.</li>
<li><b>EXISTS ile IN</b>: Büyük alt sorgularda EXISTS genelde daha öngörülebilirdir; NOT IN'in NULL tuzağı da yoktur.</li>
<li><b>Önce topla, sonra birleştir.</b> Büyük bir olay tablosunu boyut tablosuyla birleştirmeden önce özetle.</li>
<li><b>Planı oku.</b> Tam tarama, iç içe döngü ve tahmini satır sayılarını incele (önceki ders).</li>
</ol>
<div class="note" data-d="tsql"><b>SQL Server'a özgü</b>Parametre koklama (parameter sniffing), eksik istatistikler ve örtük tip dönüşümleri (ör. NVARCHAR sütunu VARCHAR parametreyle karşılaştırmak) en sık performans sorunlarıdır. <code>SET STATISTICS IO, TIME ON</code> ile okunan sayfa sayısını ölç.</div>
${CODE("-- Yavaş kalıp: tarih fonksiyonu sütunu sarıyor\nEXPLAIN QUERY PLAN\nSELECT COUNT(*) FROM orders WHERE strftime('%Y', order_date) = '2024';", {
  tsql: "-- Yavaş kalıp (SARGable değil)\nSET STATISTICS IO ON;\nSELECT COUNT(*) FROM orders WHERE YEAR(order_date) = 2024;",
  pg: "EXPLAIN SELECT COUNT(*) FROM orders WHERE EXTRACT(YEAR FROM order_date) = 2024;",
  mysql: "EXPLAIN SELECT COUNT(*) FROM orders WHERE YEAR(order_date) = 2024;",
  oracle: "EXPLAIN PLAN FOR SELECT COUNT(*) FROM orders WHERE EXTRACT(YEAR FROM order_date) = 2024;"
}, { nr: ['tsql', 'pg', 'mysql', 'oracle'] })}
${CODE("-- Daha iyi: aralık + indeks\nCREATE INDEX idx_o_date ON orders(order_date);\nEXPLAIN QUERY PLAN\nSELECT COUNT(*) FROM orders WHERE order_date >= '2024-01-01' AND order_date < '2025-01-01';", {
  tsql: "CREATE INDEX idx_o_date ON orders(order_date);\nSELECT COUNT(*) FROM orders\nWHERE order_date >= '2024-01-01' AND order_date < '2025-01-01';",
  pg: "CREATE INDEX idx_o_date ON orders(order_date);\nEXPLAIN SELECT COUNT(*) FROM orders WHERE order_date >= DATE '2024-01-01' AND order_date < DATE '2025-01-01';",
  mysql: "CREATE INDEX idx_o_date ON orders(order_date);\nEXPLAIN SELECT COUNT(*) FROM orders WHERE order_date >= '2024-01-01' AND order_date < '2025-01-01';",
  oracle: "CREATE INDEX idx_o_date ON orders(order_date);\nEXPLAIN PLAN FOR SELECT COUNT(*) FROM orders WHERE order_date >= DATE '2024-01-01' AND order_date < DATE '2025-01-01';"
}, { nr: ['tsql', 'pg', 'mysql', 'oracle'] })}
`
});

put({
  id: 'json', lv: 'C2', mod: 'Modern SQL', min: 14,
  title: 'SQL ile JSON verisi',
  sum: 'Yarı yapılandırılmış veriyi sorgulamak ve üretmek; programlar arası farklar.',
  body: `
<h2>Neden JSON?</h2>
<p>Uygulama olayları, API yanıtları ve esnek nitelikler çoğu zaman JSON olarak gelir. SQL:2016 ile JSON desteği standarda girdi; ama her program kendi fonksiyonlarını kullanır.</p>
<div class="tbl-wrap"><table><tr><th>İşlem</th><th>SQL Server</th><th>PostgreSQL</th><th>MySQL</th><th>Oracle</th><th>SQLite</th></tr>
<tr><td>Alan oku</td><td><code>JSON_VALUE(j, '$.a.b')</code></td><td><code>j-&gt;'a'-&gt;&gt;'b'</code></td><td><code>j-&gt;&gt;'$.a.b'</code></td><td><code>JSON_VALUE(j, '$.a.b')</code></td><td><code>json_extract(j, '$.a.b')</code></td></tr>
<tr><td>Diziyi satırlara aç</td><td><code>OPENJSON</code></td><td><code>jsonb_array_elements</code></td><td><code>JSON_TABLE</code></td><td><code>JSON_TABLE</code></td><td><code>json_each</code></td></tr>
<tr><td>JSON üret</td><td><code>FOR JSON PATH</code>, <code>JSON_OBJECT</code> (2022)</td><td><code>json_build_object</code>, <code>json_agg</code></td><td><code>JSON_OBJECT</code>, <code>JSON_ARRAYAGG</code></td><td><code>JSON_OBJECT</code>, <code>JSON_ARRAYAGG</code></td><td><code>json_object</code>, <code>json_group_array</code></td></tr>
</table></div>
${CODE("WITH olaylar(id, payload) AS (\n  VALUES (1, '{\"user\": {\"id\": 7, \"city\": \"Bursa\"}, \"total\": 420}'),\n         (2, '{\"user\": {\"id\": 9, \"city\": \"Konya\"}, \"total\": 2499}')\n)\nSELECT id,\n       json_extract(payload, '$.user.city') AS sehir,\n       json_extract(payload, '$.total') AS toplam\nFROM olaylar;", {
  tsql: "WITH olaylar AS (\n  SELECT * FROM (VALUES\n    (1, N'{\"user\": {\"id\": 7, \"city\": \"Bursa\"}, \"total\": 420}'),\n    (2, N'{\"user\": {\"id\": 9, \"city\": \"Konya\"}, \"total\": 2499}')\n  ) AS v(id, payload)\n)\nSELECT id,\n       JSON_VALUE(payload, '$.user.city') AS sehir,\n       JSON_VALUE(payload, '$.total') AS toplam\nFROM olaylar;",
  pg: "WITH olaylar(id, payload) AS (\n  VALUES (1, '{\"user\": {\"id\": 7, \"city\": \"Bursa\"}, \"total\": 420}'::jsonb),\n         (2, '{\"user\": {\"id\": 9, \"city\": \"Konya\"}, \"total\": 2499}'::jsonb)\n)\nSELECT id,\n       payload->'user'->>'city' AS sehir,\n       payload->>'total' AS toplam\nFROM olaylar;",
  mysql: "WITH olaylar(id, payload) AS (\n  SELECT 1, '{\"user\": {\"id\": 7, \"city\": \"Bursa\"}, \"total\": 420}'\n  UNION ALL SELECT 2, '{\"user\": {\"id\": 9, \"city\": \"Konya\"}, \"total\": 2499}'\n)\nSELECT id,\n       payload->>'$.user.city' AS sehir,\n       payload->>'$.total' AS toplam\nFROM olaylar;",
  oracle: "WITH olaylar AS (\n  SELECT 1 AS id, '{\"user\": {\"id\": 7, \"city\": \"Bursa\"}, \"total\": 420}' AS payload FROM dual\n  UNION ALL SELECT 2, '{\"user\": {\"id\": 9, \"city\": \"Konya\"}, \"total\": 2499}' FROM dual\n)\nSELECT id,\n       JSON_VALUE(payload, '$.user.city') AS sehir,\n       JSON_VALUE(payload, '$.total') AS toplam\nFROM olaylar;"
}, { nr: ['tsql', 'pg', 'mysql'] })}
<h2>SQL ile JSON üretmek</h2>
${CODE("SELECT json_object('id', customer_id, 'ad', first_name, 'sehir', city) AS musteri_json\nFROM customers\nORDER BY customer_id\nLIMIT 3;", {
  tsql: "SELECT TOP 3 customer_id AS id, first_name AS ad, city AS sehir\nFROM customers\nORDER BY customer_id\nFOR JSON PATH;",
  pg: "SELECT json_build_object('id', customer_id, 'ad', first_name, 'sehir', city) AS musteri_json\nFROM customers ORDER BY customer_id LIMIT 3;",
  mysql: "SELECT JSON_OBJECT('id', customer_id, 'ad', first_name, 'sehir', city) AS musteri_json\nFROM customers ORDER BY customer_id LIMIT 3;",
  oracle: "SELECT JSON_OBJECT('id' VALUE customer_id, 'ad' VALUE first_name, 'sehir' VALUE city) AS musteri_json\nFROM customers ORDER BY customer_id FETCH FIRST 3 ROWS ONLY;"
}, { nr: ['tsql'] })}
`,
  ex: [
    { t: 'sql', q: '<p>Her müşteri için <code>{"id": ..., "ad": ..., "sehir": ...}</code> biçiminde bir JSON metni üret. İlk 3 müşteriyi <code>customer_id</code> sırasıyla getir. (SQL Server modunda <code>JSON_OBJECT(\'id\': customer_id, ...)</code> yazımı kullanılabilir.)</p>', sol: "SELECT json_object('id', customer_id, 'ad', first_name, 'sehir', city) FROM customers ORDER BY customer_id LIMIT 3;", ord: true },
    { t: 'sql', q: '<p>Her kategori için ürün adlarını bir <b>JSON dizisi</b> olarak topla: <code>category</code>, <code>urunler</code>. Kategorilere göre sırala; dizi içindeki sıra <code>product_id</code>\'ye göre olsun.</p>', sol: 'SELECT category, json_group_array(name) AS urunler FROM (SELECT * FROM products ORDER BY product_id) GROUP BY category ORDER BY category;', ord: true, dl: ['sqlite', 'pg', 'mysql'], hint: 'SQLite: json_group_array, PostgreSQL: json_agg, MySQL: JSON_ARRAYAGG. Dizi sırasını sabitlemek için alt sorguda ORDER BY product_id yap.' }
  ]
});

put({
  id: 'ds-tanimsal', lv: 'B1', mod: 'Veri Bilimi', min: 16,
  title: 'SQL ile tanımlayıcı istatistik',
  sum: 'Ortalama, medyan, standart sapma, varyans, mod; programlara göre fonksiyon adları.',
  body: `
<h2>Veriyi tanımak</h2>
<p>Modelden önce dağılımı anlamak gerekir. İstatistik fonksiyonlarının adları programa göre değişir:</p>
<div class="tbl-wrap"><table><tr><th>Ölçü</th><th>SQL Server</th><th>PostgreSQL</th><th>MySQL</th><th>Oracle</th></tr>
<tr><td>Ortalama</td><td colspan="4"><code>AVG(x)</code></td></tr>
<tr><td>Standart sapma (örneklem)</td><td><code>STDEV(x)</code></td><td><code>STDDEV(x)</code></td><td><code>STDDEV_SAMP(x)</code></td><td><code>STDDEV(x)</code></td></tr>
<tr><td>Varyans (örneklem)</td><td><code>VAR(x)</code></td><td><code>VARIANCE(x)</code></td><td><code>VAR_SAMP(x)</code></td><td><code>VARIANCE(x)</code></td></tr>
<tr><td>Medyan</td><td><code>PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY x) OVER ()</code></td><td><code>PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY x)</code></td><td>yok (pencere fonksiyonuyla hesaplanır)</td><td><code>MEDIAN(x)</code></td></tr>
</table></div>
<div class="note"><b>Bu uygulamada</b>SQLite'ta istatistik fonksiyonu yoktur; uygulama <code>MEDIAN</code>, <code>STDDEV</code>, <code>VARIANCE</code> fonksiyonlarını ekler. SQL Server'da PERCENTILE_CONT bir <b>pencere</b> fonksiyonudur; bu yüzden medyanı ayrı bir CTE'de hesaplayıp birleştiririz (SQL Server sekmesine bak).</div>
${CODE("WITH sepet AS (\n  SELECT o.order_id, SUM(" + REV + ") AS tutar\n  FROM orders o JOIN order_items oi ON oi.order_id = o.order_id\n  WHERE o.status = 'delivered'\n  GROUP BY o.order_id\n)\nSELECT COUNT(*) AS n,\n       ROUND(AVG(tutar), 1) AS ortalama,\n       ROUND(MEDIAN(tutar), 1) AS medyan,\n       ROUND(STDDEV(tutar), 1) AS std\nFROM sepet;", {
  tsql: "WITH sepet AS (\n  SELECT o.order_id, SUM(" + REV + ") AS tutar\n  FROM orders o JOIN order_items oi ON oi.order_id = o.order_id\n  WHERE o.status = 'delivered'\n  GROUP BY o.order_id\n),\nmed AS (\n  SELECT DISTINCT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY tutar) OVER () AS m\n  FROM sepet\n)\nSELECT COUNT(*) AS n,\n       ROUND(AVG(tutar), 1) AS ortalama,\n       ROUND(MAX(med.m), 1) AS medyan,\n       ROUND(STDEV(tutar), 1) AS std\nFROM sepet CROSS JOIN med;",
  mysql: "WITH sepet AS (\n  SELECT o.order_id, SUM(" + REV + ") AS tutar\n  FROM orders o JOIN order_items oi ON oi.order_id = o.order_id\n  WHERE o.status = 'delivered'\n  GROUP BY o.order_id\n),\nsirali AS (\n  SELECT tutar, ROW_NUMBER() OVER (ORDER BY tutar) AS rn, COUNT(*) OVER () AS c FROM sepet\n),\nmed AS (\n  SELECT AVG(tutar) AS m FROM sirali WHERE rn IN (FLOOR((c + 1) / 2), FLOOR((c + 2) / 2))\n)\nSELECT COUNT(*) AS n,\n       ROUND(AVG(tutar), 1) AS ortalama,\n       ROUND(MAX(med.m), 1) AS medyan,\n       ROUND(STDDEV_SAMP(tutar), 1) AS std\nFROM sepet CROSS JOIN med;"
})}
<p>Ortalama medyandan çok büyükse dağılım <b>sağa çarpık</b>tır (birkaç büyük sepet ortalamayı yukarı çeker). E-ticarette çok yaygındır; bu yüzden medyan raporlamak çoğu zaman daha dürüsttür.</p>
<h2>Mod (en sık değer)</h2>
<pre class="code">SELECT quantity, COUNT(*) AS frekans
FROM order_items
GROUP BY quantity
ORDER BY frekans DESC
LIMIT 1;</pre>
<h2>Varyansı elle hesaplamak</h2>
<p>Formül: <code>Var = (Σx² − (Σx)²/n) / (n − 1)</code>. Fonksiyonun olmadığı ortamlarda işe yarar:</p>
<pre class="code">SELECT (SUM(price * price) - SUM(price) * SUM(price) / COUNT(*)) / (COUNT(*) - 1) AS varyans_elle,
       VARIANCE(price) AS varyans_fonk
FROM products;</pre>
`,
  ex: [
    { t: 'sql', q: '<p>Çalışan maaşlarının <b>ortalama, medyan ve standart sapmasını</b> (örneklem) getir, hepsini tam sayıya yuvarla.</p>', sol: 'SELECT ROUND(AVG(salary)), ROUND(MEDIAN(salary)), ROUND(STDDEV(salary)) FROM employees;', solv: { tsql: 'WITH med AS (SELECT DISTINCT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY salary) OVER () AS m FROM employees)\nSELECT ROUND(AVG(salary), 0), ROUND(MAX(med.m), 0), ROUND(STDEV(salary), 0)\nFROM employees CROSS JOIN med;', mysql: 'WITH s AS (SELECT salary, ROW_NUMBER() OVER (ORDER BY salary) AS rn, COUNT(*) OVER () AS c FROM employees),\nmed AS (SELECT AVG(salary) AS m FROM s WHERE rn IN (FLOOR((c + 1) / 2), FLOOR((c + 2) / 2)))\nSELECT ROUND(AVG(salary)), ROUND(MAX(med.m)), ROUND(STDDEV_SAMP(salary))\nFROM employees CROSS JOIN med;' }, hint: 'Programının fonksiyon adlarını tablodan kontrol et. SQL Server\'da medyanı ayrı CTE\'de PERCENTILE_CONT ... OVER () ile hesapla.' },
    { t: 'sql', q: '<p>Her kategori için ürün fiyatlarının <b>ortalama ve medyanını</b> getir (1 basamak) ve ortalama/medyan oranına göre en çarpık kategori en üstte olacak şekilde sırala: <code>category</code>, <code>ort</code>, <code>med</code>.</p>', sol: 'SELECT category, ROUND(AVG(price), 1) AS ort, ROUND(MEDIAN(price), 1) AS med FROM products GROUP BY category ORDER BY AVG(price) / MEDIAN(price) DESC;', ord: true, dl: ['sqlite', 'pg', 'oracle'], hint: 'PostgreSQL: PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price), Oracle: MEDIAN(price).' }
  ]
});

})();
