/* Kesit SQL içerik 7: T-SQL ek dersleri, Veritabanı Yönetimi (DBA), Uygulama Geliştirme,
   yeni öğrenme yolları ve öğrenme yolu yetkinlik haritaları */
(function () {
const L = window.SQLP_LESSONS = window.SQLP_LESSONS || [];
const after = (id, lessons) => { const i = L.findIndex(l => l.id === id); L.splice(i < 0 ? L.length : i + 1, 0, ...lessons); };
const TS = (src, v, o) => CODE(src, v || null, Object.assign({ base: 'tsql' }, o || {}));
const NR = src => CODE(src, null, { norun: true });
const mc = (q, o, a, why) => ({ t: 'mc', q, o, a, why });
const tx = (o) => Object.assign({ t: 'sql', base: 'tsql', dl: ['tsql'] }, o);
const MOD = 'T-SQL (SQL Server)';

/* ======================= T-SQL ======================= */
after('ts-sistem', [{
  id: 'ts-sequence', lv: 'B2', mod: MOD, min: 14,
  title: 'SEQUENCE, IDENTITY ve anahtar üretimi',
  sum: 'Otomatik numaralar: IDENTITY, SEQUENCE, SCOPE_IDENTITY ve GUID.',
  body: `
<h2>Otomatik numara üretmenin yolları</h2>
<table>
<tr><th>Yöntem</th><th>Nerede?</th><th>Özellik</th></tr>
<tr><td><code>IDENTITY(1,1)</code></td><td>Tek bir tablonun sütunu</td><td>Satır eklenince otomatik artar.</td></tr>
<tr><td><code>SEQUENCE</code></td><td>Bağımsız bir nesne (2012+)</td><td>Birden çok tablo paylaşabilir; değeri satırı eklemeden önce alabilirsin.</td></tr>
<tr><td><code>NEWID()</code> / <code>NEWSEQUENTIALID()</code></td><td>UNIQUEIDENTIFIER sütunu</td><td>Dünyada tekil GUID; sistemler arası birleştirmede işe yarar ama indekste parçalanmaya yol açar.</td></tr>
</table>
<h2>SEQUENCE</h2>
${TS("CREATE SEQUENCE dbo.fatura_no AS INT\n    START WITH 1000\n    INCREMENT BY 1;\n\nSELECT NEXT VALUE FOR dbo.fatura_no AS ilk;\nSELECT NEXT VALUE FOR dbo.fatura_no AS ikinci;", { pg: "CREATE SEQUENCE fatura_no START 1000 INCREMENT 1;\n\nSELECT nextval('fatura_no') AS ilk;\nSELECT nextval('fatura_no') AS ikinci;", oracle: "CREATE SEQUENCE fatura_no START WITH 1000 INCREMENT BY 1;\n\nSELECT fatura_no.NEXTVAL AS ilk FROM dual;\nSELECT fatura_no.NEXTVAL AS ikinci FROM dual;" })}
<div class="warn"><b>START WITH'i unutma</b>SQL Server'da START WITH yazılmazsa sıra, veri tipinin <b>en küçük değerinden</b> başlar: INT için −2.147.483.648. Bu yaygın bir sürprizdir. PostgreSQL ve Oracle'da varsayılan başlangıç 1'dir.</div>
<h3>Toplu eklemede sıra kullanmak</h3>
${TS("CREATE SEQUENCE dbo.fatura_no AS INT START WITH 1000 INCREMENT BY 1;\nCREATE TABLE #fatura (fatura_no INT, order_id INT);\n\nINSERT INTO #fatura (fatura_no, order_id)\nSELECT NEXT VALUE FOR dbo.fatura_no, order_id\nFROM orders\nWHERE order_date = '2024-12-31';\n\nSELECT * FROM #fatura;")}
<p>Tabloda varsayılan değer olarak da tanımlanabilir: <code>fatura_no INT DEFAULT (NEXT VALUE FOR dbo.fatura_no)</code>.</p>
<div class="note"><b>Kısıtlama</b>NEXT VALUE FOR; TOP veya OFFSET içeren sorgularda, alt sorgularda ve CTE'lerde kullanılamaz.</div>
<h2>Numaralarda boşluk olur</h2>
<p>Sıra numarası verildikten sonra işlem geri alınsa bile o numara <b>geri gelmez</b>. Bu, eşzamanlı kullanıcılar birbirini beklemesin diye bilinçli bir tasarımdır. Fatura numarasında boşluk yasal olarak sorunsa, numara ayrı ve kilitli bir tabloyla verilir.</p>
${TS("CREATE SEQUENCE dbo.s AS INT START WITH 1 INCREMENT BY 1;\n\nBEGIN TRAN;\n    SELECT NEXT VALUE FOR dbo.s AS geri_alinan;\nROLLBACK;\n\nSELECT NEXT VALUE FOR dbo.s AS sonraki;  -- 2 gelir, 1 kayboldu")}
<h2>Eklenen satırın numarası</h2>
<table>
<tr><th>Fonksiyon</th><th>Döndürdüğü</th></tr>
<tr><td><code>SCOPE_IDENTITY()</code></td><td>Aynı oturum ve aynı kapsamda üretilen son IDENTITY. <b>Doğru seçim budur.</b></td></tr>
<tr><td><code>@@IDENTITY</code></td><td>Oturumdaki son IDENTITY; bir trigger başka tabloya eklediyse onun numarasını döndürür.</td></tr>
<tr><td><code>IDENT_CURRENT('tablo')</code></td><td>Tablonun son numarası, <b>herhangi bir</b> oturumdan.</td></tr>
<tr><td><code>OUTPUT inserted.id</code></td><td>Çok satırlı eklemede tüm yeni numaralar.</td></tr>
</table>
<p>Diğer SQL türleri: PostgreSQL'de <code>GENERATED ALWAYS AS IDENTITY</code> ve <code>RETURNING id</code>, MySQL'de <code>AUTO_INCREMENT</code> ve <code>LAST_INSERT_ID()</code>, Oracle'da <code>GENERATED AS IDENTITY</code> veya sequence kullanılır.</p>
`,
  ex: [
    tx({ q: '<p>5000\'den başlayıp <b>5\'er</b> artan <code>musteri_no</code> adında bir sequence oluştur. Ardından <code>yeni_musteri</code> tablosunu (<code>no INT</code>, <code>ad NVARCHAR(50)</code>) oluştur ve <b>Ankara\'daki Premium</b> müşterileri sıradan aldıkları numarayla bu tabloya ekle.</p>', sol: "CREATE SEQUENCE musteri_no AS INT START WITH 5000 INCREMENT BY 5;\nCREATE TABLE yeni_musteri (no INT, ad NVARCHAR(50));\nINSERT INTO yeni_musteri (no, ad)\nSELECT NEXT VALUE FOR musteri_no, first_name FROM customers WHERE city = N'Ankara' AND segment = 'Premium';", check: 'SELECT COUNT(*) AS adet, MIN(no) AS ilk, MAX(no) AS son FROM yeni_musteri;', hint: 'CREATE SEQUENCE ... START WITH 5000 INCREMENT BY 5; sonra INSERT INTO ... SELECT NEXT VALUE FOR musteri_no, ...' }),
    mc('<p>Bir işlem içinde <code>NEXT VALUE FOR</code> ile 41 numarası alındı, sonra işlem <code>ROLLBACK</code> edildi. Sonraki çağrı ne döndürür?</p>', ['41', '42', 'NULL', 'Hata'], 1, 'Sıra değerleri işlemden bağımsızdır; geri alınsa da kullanılmış sayılır. Bu yüzden numaralarda boşluk olabilir.'),
    mc('<p>Tabloda bir AFTER INSERT trigger\'ı başka bir log tablosuna (IDENTITY\'li) satır ekliyor. Eklediğin satırın numarasını doğru veren hangisidir?</p>', ['<code>@@IDENTITY</code>', '<code>SCOPE_IDENTITY()</code>', '<code>IDENT_CURRENT(\'log\')</code>', '<code>MAX(id)</code>'], 1, '@@IDENTITY trigger\'ın eklediği log satırının numarasını döndürür; SCOPE_IDENTITY yalnızca senin kapsamındakini.')
  ]
}]);

after('ts-apply', [{
  id: 'ts-liste', lv: 'B2', mod: MOD, min: 14,
  title: 'Listeleri bölmek ve birleştirmek: STRING_SPLIT, STRING_AGG, FOR XML PATH',
  sum: 'Virgüllü listeyi satırlara, satırları virgüllü listeye çevirmek.',
  body: `
<h2>Satırdan listeye: STRING_AGG</h2>
<p>SQL Server 2017'den beri birden çok satırı tek metinde birleştirmenin yolu <code>STRING_AGG</code>'dır. Sıra önemliyse <code>WITHIN GROUP (ORDER BY ...)</code> eklenir.</p>
${TS("SELECT d.name AS departman,\n       STRING_AGG(e.first_name, ', ') WITHIN GROUP (ORDER BY e.first_name) AS calisanlar\nFROM departments d\nJOIN employees e ON e.dept_id = d.dept_id\nGROUP BY d.name;", { pg: "SELECT d.name AS departman,\n       STRING_AGG(e.first_name, ', ' ORDER BY e.first_name) AS calisanlar\nFROM departments d\nJOIN employees e ON e.dept_id = d.dept_id\nGROUP BY d.name;", mysql: "SELECT d.name AS departman,\n       GROUP_CONCAT(e.first_name ORDER BY e.first_name SEPARATOR ', ') AS calisanlar\nFROM departments d\nJOIN employees e ON e.dept_id = d.dept_id\nGROUP BY d.name;", oracle: "SELECT d.name AS departman,\n       LISTAGG(e.first_name, ', ') WITHIN GROUP (ORDER BY e.first_name) AS calisanlar\nFROM departments d\nJOIN employees e ON e.dept_id = d.dept_id\nGROUP BY d.name;" })}
<h3>Eski yöntem: FOR XML PATH</h3>
<p>2017 öncesi sürümlerde ve eski kodlarda bu kalıbı çok görürsün. Mantığı adım adım:</p>
<ol>
<li>İç sorgu, her çalışan adının başına <code>', '</code> ekler.</li>
<li><code>FOR XML PATH('')</code> satırları etiketsiz tek bir metin olarak yan yana yazar.</li>
<li><code>STUFF(metin, 1, 2, '')</code> baştaki fazla <code>', '</code>'yi siler.</li>
</ol>
${TS("SELECT d.name AS departman,\n       STUFF((SELECT ', ' + e.first_name\n              FROM employees e\n              WHERE e.dept_id = d.dept_id\n              ORDER BY e.first_name\n              FOR XML PATH('')), 1, 2, '') AS calisanlar\nFROM departments d;")}
<div class="warn"><b>Özel karakterler</b>FOR XML PATH, <code>&amp;</code> ve <code>&lt;</code> gibi karakterleri XML kodlarına çevirir (<code>&amp;amp;</code>). Bunu önlemek için <code>FOR XML PATH(''), TYPE).value('.', 'NVARCHAR(MAX)')</code> yazılır.</div>
<h2>Listeden satıra: STRING_SPLIT</h2>
<p>Uygulamadan “Ankara,İzmir,Bursa” gibi virgüllü bir parametre geldiğinde, <code>STRING_SPLIT</code> (2016+) onu <code>value</code> sütunlu bir tabloya çevirir. SQL Server 2022'de üçüncü argüman <code>1</code> verilirse sırayı gösteren <code>ordinal</code> sütunu da gelir.</p>
${TS("DECLARE @etiketler NVARCHAR(200) = N'kampanya,yeni,indirimli';\n\nSELECT value AS etiket\nFROM STRING_SPLIT(@etiketler, ',');")}
<h3>Parametre listesiyle filtrelemek</h3>
${TS("DECLARE @kategoriler NVARCHAR(200) = N'Kitap,Spor';\n\nSELECT name, category, price\nFROM products\nWHERE category IN (SELECT value FROM STRING_SPLIT(@kategoriler, ','));")}
<h3>Sütundaki listeyi açmak: CROSS APPLY</h3>
${TS("WITH t AS (\n    SELECT 1 AS siparis, N'kupon,hediye paketi' AS notlar\n    UNION ALL\n    SELECT 2, N'hızlı kargo'\n)\nSELECT t.siparis, s.value AS not_\nFROM t\nCROSS APPLY STRING_SPLIT(t.notlar, ',') AS s;")}
<div class="tip"><b>Diğer SQL türleri</b>PostgreSQL: <code>string_to_table(metin, ',')</code> veya <code>unnest(string_to_array(...))</code>. MySQL: <code>JSON_TABLE</code> ya da özyinelemeli CTE. Oracle: <code>REGEXP_SUBSTR</code> + <code>CONNECT BY LEVEL</code>. Kalıcı çözüm ise listeyi tek sütunda tutmamak (normalizasyon) ve ayrı bir tabloya yazmaktır.</div>
`,
  ex: [
    tx({ q: '<p><code>@sehirler</code> parametresindeki şehirlerde bulunan müşterileri şehir bazında say: <code>city</code>, <code>musteri</code>.</p>', start: "DECLARE @sehirler NVARCHAR(200) = N'Ankara,İzmir,Bursa';\n\n", sol: "DECLARE @sehirler NVARCHAR(200) = N'Ankara,İzmir,Bursa';\nSELECT city, COUNT(*) AS musteri FROM customers WHERE city IN (SELECT value FROM STRING_SPLIT(@sehirler, ',')) GROUP BY city;", hint: '<code>WHERE city IN (SELECT value FROM STRING_SPLIT(@sehirler, \',\'))</code>' }),
    tx({ q: '<p>Her kategori için ürün adlarını <b>fiyata göre azalan</b> (eşitlikte ada göre) sırada, aralarına <code>, </code> koyarak tek satırda getir: <code>category</code>, <code>urunler</code>.</p>', sol: "SELECT category, STRING_AGG(name, ', ') WITHIN GROUP (ORDER BY price DESC, name) AS urunler FROM products GROUP BY category;", hint: 'STRING_AGG(name, \', \') WITHIN GROUP (ORDER BY price DESC, name)' }),
    tx({ q: '<p>Aynı işi <b>eski yöntemle</b> yap: her departman için çalışanların adlarını alfabetik sırayla <code>STUFF</code> + <code>FOR XML PATH(\'\')</code> kullanarak birleştir: <code>name</code> (departman adı), <code>calisanlar</code>. Çalışanı olmayan departman varsa NULL görünsün.</p>', sol: "SELECT d.name, STUFF((SELECT ', ' + e.first_name FROM employees e WHERE e.dept_id = d.dept_id ORDER BY e.first_name FOR XML PATH('')), 1, 2, '') AS calisanlar FROM departments d;" })
  ]
}]);

after('ts-dinamik', [{
  id: 'ts-json', lv: 'C1', mod: MOD, min: 15,
  title: 'SQL Server\'da JSON: FOR JSON, OPENJSON, JSON_VALUE',
  sum: 'Sorgu sonucunu JSON\'a, JSON\'u tabloya çevirmek.',
  body: `
<h2>SQL Server ve JSON</h2>
<p>SQL Server 2016'dan beri JSON'u metin (<code>NVARCHAR</code>) olarak saklayıp işleyebilir; SQL Server 2025 ve Azure SQL'de ayrıca yerel <code>json</code> veri tipi vardır. Dört temel araç:</p>
<table>
<tr><th>Araç</th><th>Yön</th><th>Ne yapar?</th></tr>
<tr><td><code>FOR JSON PATH</code></td><td>Tablo → JSON</td><td>Sorgu sonucunu JSON dizisine çevirir. API'lere veri vermek için.</td></tr>
<tr><td><code>OPENJSON</code></td><td>JSON → tablo</td><td>JSON dizisini satırlara açar.</td></tr>
<tr><td><code>JSON_VALUE</code> / <code>JSON_QUERY</code></td><td>JSON → değer</td><td>Tek bir alanı (skaler) veya alt nesneyi okur.</td></tr>
<tr><td><code>JSON_MODIFY</code>, <code>ISJSON</code></td><td>Düzenleme, doğrulama</td><td>Alanı değiştirir; metnin geçerli JSON olup olmadığını söyler.</td></tr>
</table>
<h2>FOR JSON PATH</h2>
${TS("SELECT TOP 2 customer_id AS id,\n       first_name AS [musteri.ad],\n       city AS [musteri.sehir]\nFROM customers\nORDER BY customer_id\nFOR JSON PATH, ROOT('musteriler');")}
<p>Takma addaki nokta (<code>musteri.ad</code>) iç içe nesne oluşturur. Varsayılan olarak NULL alanlar JSON'a <b>yazılmaz</b>; yazılsın istiyorsan <code>INCLUDE_NULL_VALUES</code> ekle. Tek satır dönecekse <code>WITHOUT_ARRAY_WRAPPER</code> köşeli parantezleri kaldırır.</p>
<h3>İç içe JSON: alt sorgu ile</h3>
${TS("SELECT c.customer_id,\n       c.first_name,\n       (SELECT o.order_id, o.status\n        FROM orders o\n        WHERE o.customer_id = c.customer_id\n        ORDER BY o.order_id\n        FOR JSON PATH) AS siparisler\nFROM customers c\nWHERE c.customer_id <= 3;")}
<h2>OPENJSON</h2>
${TS("DECLARE @sepet NVARCHAR(MAX) = N'[\n  {\"urun_id\": 1, \"adet\": 2},\n  {\"urun_id\": 5, \"adet\": 1}\n]';\n\nSELECT j.urun_id, p.name, j.adet, j.adet * p.price AS tutar\nFROM OPENJSON(@sepet)\n     WITH (urun_id INT '$.urun_id', adet INT '$.adet') AS j\nJOIN products p ON p.product_id = j.urun_id;")}
<p><code>WITH</code> bölümü yazılmazsa OPENJSON üç sütun döndürür: <code>key</code>, <code>value</code> ve <code>type</code> (0: null, 1: metin, 2: sayı, 3: true/false, 4: dizi, 5: nesne).</p>
<h2>JSON_VALUE ve JSON_MODIFY</h2>
${TS("DECLARE @profil NVARCHAR(MAX) = N'{\"ad\": \"Ayşe\", \"adres\": {\"sehir\": \"İzmir\"}, \"puan\": 4}';\n\nSELECT JSON_VALUE(@profil, '$.adres.sehir') AS sehir,\n       ISJSON(@profil) AS gecerli,\n       JSON_MODIFY(@profil, '$.puan', 5) AS guncel;")}
<div class="tip"><b>Performans</b>JSON içindeki bir alana sık filtre uyguluyorsan, o alanı <b>hesaplanmış sütun</b> olarak çıkarıp indeksle: <code>ALTER TABLE t ADD sehir AS JSON_VALUE(profil, '$.adres.sehir'); CREATE INDEX ix_sehir ON t(sehir);</code></div>
`,
  ex: [
    tx({ q: '<p><code>product_id</code> sırasına göre ilk 3 ürünü <code>id</code>, <code>ad</code>, <code>fiyat</code> anahtarlarıyla bir JSON dizisi olarak döndür (FOR JSON PATH).</p>', sol: 'SELECT TOP 3 product_id AS id, name AS ad, price AS fiyat FROM products ORDER BY product_id FOR JSON PATH;', hint: 'SELECT TOP 3 ... ORDER BY product_id FOR JSON PATH;' }),
    tx({ q: '<p><code>@sepet</code> JSON\'undaki ürünlerin güncel fiyatlarla <b>toplam tutarını</b> hesapla (tek değer: <code>toplam</code>). OPENJSON ... WITH kullan.</p>', start: "DECLARE @sepet NVARCHAR(MAX) = N'[{\"urun_id\":1,\"adet\":2},{\"urun_id\":5,\"adet\":1},{\"urun_id\":9,\"adet\":3}]';\n\n", sol: "DECLARE @sepet NVARCHAR(MAX) = N'[{\"urun_id\":1,\"adet\":2},{\"urun_id\":5,\"adet\":1},{\"urun_id\":9,\"adet\":3}]';\nSELECT SUM(j.adet * p.price) AS toplam FROM OPENJSON(@sepet) WITH (urun_id INT '$.urun_id', adet INT '$.adet') AS j JOIN products p ON p.product_id = j.urun_id;" }),
    tx({ q: '<p>İlk 2 müşteri (<code>customer_id</code> 1 ve 2) için <code>customer_id</code> ve son 2 siparişini (<code>order_id</code> azalan) <code>id</code> ve <code>durum</code> anahtarlarıyla JSON olarak içeren <code>siparisler</code> sütununu getir.</p>', sol: 'SELECT c.customer_id, (SELECT TOP 2 o.order_id AS id, o.status AS durum FROM orders o WHERE o.customer_id = c.customer_id ORDER BY o.order_id DESC FOR JSON PATH) AS siparisler FROM customers c WHERE c.customer_id <= 2;' })
  ]
}]);

after('ts-hata', [{
  id: 'ts-cursor', lv: 'C1', mod: MOD, min: 15,
  title: 'İmleçler (CURSOR): satır satır işlem',
  sum: 'DECLARE CURSOR, FETCH, @@FETCH_STATUS ve neden küme tabanlı düşünmek gerekir.',
  body: `
<h2>İmleç nedir?</h2>
<p>SQL küme (set) tabanlı çalışır: bir UPDATE binlerce satırı tek seferde değiştirir. Bazen ise satırları <b>tek tek</b> dolaşmak gerekir: her müşteri için bir prosedür çağırmak, her veritabanının yedeğini almak gibi. Bunun için <b>imleç</b> (cursor) kullanılır.</p>
<h3>İmlecin yaşam döngüsü</h3>
<ol>
<li><code>DECLARE ad CURSOR FOR SELECT ...</code>: tanımla</li>
<li><code>OPEN ad</code>: sorguyu çalıştır</li>
<li><code>FETCH NEXT FROM ad INTO @degiskenler</code>: bir satır oku</li>
<li><code>WHILE @@FETCH_STATUS = 0</code>: satır geldikçe döngü</li>
<li><code>CLOSE ad</code> ve <code>DEALLOCATE ad</code>: kapat ve serbest bırak</li>
</ol>
${TS("DECLARE @ad NVARCHAR(50), @maas INT;\n\nDECLARE maas_cur CURSOR LOCAL FAST_FORWARD FOR\n    SELECT first_name, salary\n    FROM employees\n    WHERE dept_id = 3\n    ORDER BY salary DESC;\n\nOPEN maas_cur;\nFETCH NEXT FROM maas_cur INTO @ad, @maas;\n\nWHILE @@FETCH_STATUS = 0\nBEGIN\n    PRINT @ad + N': ' + CAST(@maas AS NVARCHAR(20)) + N' TL';\n    FETCH NEXT FROM maas_cur INTO @ad, @maas;\nEND;\n\nCLOSE maas_cur;\nDEALLOCATE maas_cur;")}
<table>
<tr><th><code>@@FETCH_STATUS</code></th><th>Anlamı</th></tr>
<tr><td>0</td><td>Satır başarıyla okundu</td></tr>
<tr><td>−1</td><td>Okunacak satır kalmadı (veya okuma başarısız)</td></tr>
<tr><td>−2</td><td>Okunacak satır artık yok (silinmiş)</td></tr>
</table>
<h3>Seçenekler</h3>
<ul>
<li><code>LOCAL</code>: İmleç yalnızca bu batch/prosedürde görünür. Her zaman yazılması önerilir.</li>
<li><code>FAST_FORWARD</code>: Salt okunur, yalnızca ileri giden en hızlı imleç.</li>
<li><code>SCROLL</code> / <code>STATIC</code>: <code>FETCH PRIOR</code>, <code>FIRST</code>, <code>LAST</code>, <code>ABSOLUTE n</code> ile geri ve ileri gidilebilir.</li>
</ul>
<h2>Ne zaman kullanmamalı?</h2>
<p>İmleçler küme tabanlı sorgulardan genellikle <b>yüzlerce kat yavaştır</b>: her FETCH ayrı bir işlemdir ve kilitler daha uzun tutulur. Hesaplama veya güncelleme yapıyorsan önce tek bir UPDATE, INSERT ... SELECT veya pencere fonksiyonuyla yazmayı dene.</p>
${TS("-- İmleçle (yavaş): her ürünü tek tek güncellemek\n-- DECLARE c CURSOR FOR SELECT product_id FROM products WHERE category = 'Kitap'\n-- ... UPDATE products SET price = price * 1.1 WHERE product_id = @id ...\n\n-- Küme tabanlı (hızlı): tek ifade\nUPDATE products\nSET price = ROUND(price * 1.1, 2)\nWHERE category = N'Kitap';\n\nSELECT name, price FROM products WHERE category = N'Kitap';")}
<div class="tip"><b>İmlecin meşru kullanımları</b>Her satır için saklı yordam çağırmak, yönetim betikleri (her veritabanı / her tablo için bakım), satır satır e-posta gönderimi gibi dış işlemler ve sırayla birbirine bağımlı hesaplar.</div>
`,
  ex: [
    tx({ q: '<p>Departmanları bir imleçle dolaş; her departman için en yüksek maaşı bul ve <code>@sonuc</code> tablo değişkenine (<code>dept_id INT</code>, <code>en_yuksek INT</code>) ekle. Sonunda <code>@sonuc</code>\'u döndür.</p>', start: "DECLARE @sonuc TABLE (dept_id INT, en_yuksek INT);\nDECLARE @d INT;\n\n", sol: "DECLARE @sonuc TABLE (dept_id INT, en_yuksek INT);\nDECLARE @d INT;\nDECLARE dept_cur CURSOR LOCAL FAST_FORWARD FOR SELECT dept_id FROM departments;\nOPEN dept_cur;\nFETCH NEXT FROM dept_cur INTO @d;\nWHILE @@FETCH_STATUS = 0\nBEGIN\n    INSERT INTO @sonuc SELECT @d, MAX(salary) FROM employees WHERE dept_id = @d;\n    FETCH NEXT FROM dept_cur INTO @d;\nEND;\nCLOSE dept_cur;\nDEALLOCATE dept_cur;\nSELECT dept_id, en_yuksek FROM @sonuc;", hint: 'DECLARE ... CURSOR FOR SELECT dept_id FROM departments; OPEN; FETCH NEXT ... INTO @d; WHILE @@FETCH_STATUS = 0 BEGIN ... END' }),
    tx({ q: '<p>Bir geliştirici <b>Spor</b> kategorisindeki ürünlerin stokunu imleçle tek tek 10 artırıyor. Aynı işi <b>tek bir UPDATE</b> ile yap.</p>', sol: "UPDATE products SET stock = stock + 10 WHERE category = N'Spor';", check: "SELECT SUM(stock) AS toplam_stok FROM products WHERE category = 'Spor';" }),
    mc('<p><code>FETCH NEXT</code> son satırdan sonra çağrıldığında <code>@@FETCH_STATUS</code> kaç olur?</p>', ['0', '1', '−1', 'NULL'], 2, 'Okunacak satır kalmayınca −1 döner ve WHILE döngüsü biter.'),
    mc('<p>Hangisi imleç kullanmak için <b>en meşru</b> nedendir?</p>', ['Tüm siparişlerin toplam tutarını hesaplamak', 'Her müşteri için ayrı ayrı bir e-posta gönderim prosedürü çağırmak', 'Fiyatları %10 artırmak', 'Kategori bazında ortalama almak'], 1, 'Diğerleri tek bir küme tabanlı sorguyla yapılabilir; dış bir işlemi satır başına tetiklemek ise imlecin tipik kullanımıdır.')
  ]
}]);

after('ts-trigger', [{
  id: 'ts-guvenlik', lv: 'C1', mod: MOD, min: 14,
  title: 'SQL Server güvenliği: login, user, rol, şema ve yetkiler',
  sum: 'Kimlik doğrulama ve yetkilendirme katmanları, GRANT / DENY / REVOKE.',
  body: `
<h2>İki kapı: sunucu ve veritabanı</h2>
<table>
<tr><th>Kavram</th><th>Düzey</th><th>Açıklama</th></tr>
<tr><td><b>Login</b></td><td>Sunucu (instance)</td><td>Sunucuya bağlanma kimliği. Windows (Active Directory) veya SQL Server kimlik doğrulaması.</td></tr>
<tr><td><b>User</b></td><td>Veritabanı</td><td>Login'in bir veritabanındaki karşılığı. Login olmadan (contained database) da olabilir.</td></tr>
<tr><td><b>Rol</b></td><td>Sunucu veya veritabanı</td><td>Yetkileri gruplar. Kullanıcıya tek tek değil, role yetki verilir.</td></tr>
<tr><td><b>Şema</b> (schema)</td><td>Veritabanı</td><td>Nesnelerin klasörü (<code>dbo</code>, <code>sales</code>, <code>hr</code>). Yetki sınırı olarak kullanılır.</td></tr>
</table>
${NR("-- 1. Sunucu düzeyinde login\nCREATE LOGIN rapor_login WITH PASSWORD = N'Guclu!Parola#2025';\n\n-- 2. Veritabanında kullanıcı\nUSE anadolu;\nCREATE USER rapor_user FOR LOGIN rapor_login;\n\n-- 3. Rol oluştur, yetkiyi role ver, kullanıcıyı role ekle\nCREATE ROLE raporcular;\nGRANT SELECT ON SCHEMA::sales TO raporcular;\nALTER ROLE raporcular ADD MEMBER rapor_user;")}
<h2>Hazır roller</h2>
<table>
<tr><th>Rol</th><th>Yetki</th></tr>
<tr><td><code>sysadmin</code> (sunucu)</td><td>Her şey. Çok az kişide olmalı.</td></tr>
<tr><td><code>db_owner</code></td><td>Veritabanında her şey</td></tr>
<tr><td><code>db_datareader</code> / <code>db_datawriter</code></td><td>Tüm tabloları okuma / yazma</td></tr>
<tr><td><code>db_ddladmin</code></td><td>Nesne oluşturma ve değiştirme</td></tr>
</table>
<h2>GRANT, DENY, REVOKE</h2>
<ul>
<li><code>GRANT</code>: izin verir.</li>
<li><code>DENY</code>: açıkça yasaklar; <b>her zaman kazanır</b>. Kullanıcı bir rolden GRANT, başka bir rolden DENY alıyorsa erişemez.</li>
<li><code>REVOKE</code>: daha önce verilen GRANT veya DENY'ı geri alır (nötr duruma döner).</li>
</ul>
${NR("GRANT EXECUTE ON dbo.usp_SiparisOzet TO raporcular;  -- tabloya değil, prosedüre izin\nDENY SELECT ON dbo.employees (salary) TO raporcular;  -- tek sütunu gizle\nREVOKE SELECT ON SCHEMA::sales FROM raporcular;")}
<div class="tip"><b>En az yetki ilkesi</b>Uygulamalara tablolara doğrudan erişim yerine yalnızca saklı yordamlara EXECUTE izni vermek hem güvenliği hem de değişiklik yönetimini kolaylaştırır (ownership chaining sayesinde prosedür, tabloya kullanıcının doğrudan yetkisi olmadan erişir).</div>
<h2>Satır ve veri düzeyinde koruma</h2>
<ul>
<li><b>Row-Level Security</b>: Bir kullanıcının yalnızca kendi bölgesinin satırlarını görmesini sağlar (güvenlik predikatı fonksiyonu ile).</li>
<li><b>Dynamic Data Masking</b>: E-posta, telefon gibi alanları yetkisiz kullanıcıya maskeli gösterir (<code>a***@gmail.com</code>).</li>
<li><b>TDE</b> (Transparent Data Encryption): Diskteki veri ve yedek dosyalarını şifreler.</li>
<li><b>Always Encrypted</b>: Veri istemcide şifrelenir; DBA bile açık halini göremez.</li>
</ul>
`,
  ex: [
    mc('<p>Login ile user arasındaki fark nedir?</p>', ['Aynı şeydir', 'Login sunucuya bağlanma kimliğidir; user, login\'in belirli bir veritabanındaki karşılığıdır', 'User sunucu düzeyinde, login veritabanı düzeyindedir', 'Login sadece Windows içindir'], 1),
    mc('<p>Bir kullanıcı <code>analist</code> rolünden <code>GRANT SELECT</code>, <code>stajyer</code> rolünden aynı tablo için <code>DENY SELECT</code> almış. Sonuç?</p>', ['Okuyabilir', 'Okuyamaz', 'Yalnızca ilk 100 satırı okur', 'Hata verir'], 1, 'DENY her zaman GRANT\'tan önce gelir.'),
    mc('<p>Uygulamanın yalnızca belirli işlemleri yapabilmesi için en güvenli yaklaşım hangisidir?</p>', ['Uygulamaya db_owner vermek', 'Uygulamaya sysadmin vermek', 'Uygulama kullanıcısına yalnızca gerekli saklı yordamlar için EXECUTE izni vermek', 'Tüm tablolara db_datawriter vermek'], 2),
    mc('<p>Çağrı merkezi çalışanlarının müşteri telefonunu yalnızca son 4 hanesiyle görmesi için hangi özellik kullanılır?</p>', ['TDE', 'Dynamic Data Masking', 'Row-Level Security', 'Always On'], 1)
  ]
}]);

after('ts-index', [{
  id: 'ts-plan', lv: 'C2', mod: MOD, min: 16,
  title: 'Yürütme planı ve STATISTICS IO: sorgu neden yavaş?',
  sum: 'Plan operatörleri, mantıksal okuma, SARGable koşullar ve parameter sniffing.',
  body: `
<h2>Plan: motorun yol haritası</h2>
<p>SQL Server bir sorguyu çalıştırmadan önce <b>sorgu iyileştirici</b> (optimizer) birçok olası yol arasından en ucuz görüneni seçer. Bu seçim <b>yürütme planıdır</b>. SSMS'te <b>Ctrl+L</b> tahmini planı, <b>Ctrl+M</b> ile açılan “gerçek plan” ise sorguyla birlikte gerçekleşen planı gösterir.</p>
<table>
<tr><th>Operatör</th><th>Anlamı</th><th>İpucu</th></tr>
<tr><td>Table / Clustered Index <b>Scan</b></td><td>Tüm tabloyu okur</td><td>Büyük tabloda seçici bir filtre varsa şüphelen.</td></tr>
<tr><td>Index <b>Seek</b></td><td>İndeks ağacında doğrudan ilgili satırlara gider</td><td>Genellikle istediğimiz.</td></tr>
<tr><td><b>Key Lookup</b></td><td>İndekste olmayan sütunlar için ana tabloya geri döner</td><td>Çok satırda pahalı; <code>INCLUDE</code> ile kapsayan indeks çözer.</td></tr>
<tr><td><b>Nested Loops</b></td><td>Her dış satır için iç tabloyu arar</td><td>Az satırda hızlı.</td></tr>
<tr><td><b>Hash Match</b></td><td>Bellekte karma tablo kurar</td><td>Büyük ve sırasız girdilerde.</td></tr>
<tr><td><b>Sort</b></td><td>Sıralar</td><td>Belleğe sığmazsa tempdb'ye taşar (spill).</td></tr>
</table>
<h2>STATISTICS IO ve TIME</h2>
${NR("SET STATISTICS IO ON;\nSET STATISTICS TIME ON;\n\nSELECT COUNT(*) FROM orders WHERE YEAR(order_date) = 2024;\n\n-- Mesajlar sekmesinde:\n-- Table 'orders'. Scan count 1, logical reads 412, physical reads 0 ...\n-- SQL Server Execution Times: CPU time = 15 ms, elapsed time = 18 ms.")}
<p><b>Mantıksal okuma</b> (logical reads), bellekten okunan 8 KB'lık sayfa sayısıdır ve sorgunun ne kadar iş yaptığının en güvenilir ölçüsüdür. Süre, sunucunun o anki yüküne göre değişir; mantıksal okuma değişmez. İyileştirme yaptıktan sonra bu sayının düştüğünü görmelisin.</p>
<h2>SARGable koşullar</h2>
<p>Bir koşulun indeksi kullanabilmesi için sütun <b>çıplak</b> olmalıdır. Sütunu bir fonksiyona sokarsan motor her satırı hesaplamak zorunda kalır:</p>
<table>
<tr><th>İndeksi kullanamaz</th><th>İndeksi kullanır</th></tr>
<tr><td><code>WHERE YEAR(order_date) = 2024</code></td><td><code>WHERE order_date &gt;= '2024-01-01' AND order_date &lt; '2025-01-01'</code></td></tr>
<tr><td><code>WHERE LEFT(name, 3) = 'Kab'</code></td><td><code>WHERE name LIKE 'Kab%'</code></td></tr>
<tr><td><code>WHERE price * 1.2 &gt; 1200</code></td><td><code>WHERE price &gt; 1000</code></td></tr>
<tr><td><code>WHERE ISNULL(city, '') = 'Ankara'</code></td><td><code>WHERE city = 'Ankara'</code></td></tr>
</table>
${TS("-- İki sorgu aynı sonucu verir; yalnızca ikincisi order_date indeksini kullanabilir\nSELECT COUNT(*) AS adet FROM orders WHERE YEAR(order_date) = 2024;\nSELECT COUNT(*) AS adet FROM orders WHERE order_date >= '2024-01-01' AND order_date < '2025-01-01';")}
<h2>Gizli tuzaklar</h2>
<ul>
<li><b>Örtük dönüşüm</b>: VARCHAR bir sütunu NVARCHAR bir parametreyle (<code>N'...'</code>) karşılaştırmak, sütunun her satırda dönüştürülmesine ve Seek yerine Scan'e yol açabilir. Planda sarı ünlem ile uyarılır.</li>
<li><b>Parameter sniffing</b> (parameter sniffing): Prosedür ilk çağrıldığındaki parametreye göre plan seçilir ve önbellekte kalır. Veri çok dengesizse diğer değerler için kötü bir plan kullanılır. Çözümler: <code>OPTION (RECOMPILE)</code>, <code>OPTIMIZE FOR</code>, sorguyu ayırmak.</li>
<li><b>Güncel olmayan istatistikler</b>: Optimizer satır sayısını yanlış tahmin eder. Planda “tahmini” ile “gerçek” satır sayısı arasındaki büyük fark bunun işaretidir.</li>
</ul>
<div class="tip"><b>Query Store</b>SQL Server 2016+'da sorguların plan geçmişini ve performansını saklar. “Dün hızlıydı, bugün yavaş” sorununda hangi planın değiştiğini gösterir ve eski planı zorlamana izin verir.</div>
`,
  ex: [
    tx({ q: '<p>Aralık 2024\'teki sipariş sayısını <b>SARGable</b> biçimde (sütuna fonksiyon uygulamadan) bul: <code>adet</code>.</p>', sol: "SELECT COUNT(*) AS adet FROM orders WHERE order_date >= '2024-12-01' AND order_date < '2025-01-01';", hint: 'Ay başı ile sonraki ay başı arasında yarı açık aralık: >= ve &lt;.' }),
    mc('<p>Planda <code>products</code> üzerinde büyük maliyetli bir <b>Key Lookup</b> görüyorsun. Sorgu <code>WHERE category = @k</code> ile <code>name, price</code> getiriyor ve <code>category</code> üzerinde indeks var. En iyi çözüm?</p>', ['İndeksi silmek', '<code>CREATE INDEX ... ON products(category) INCLUDE (name, price)</code>', 'NOLOCK eklemek', 'Sorguya DISTINCT eklemek'], 1, 'INCLUDE ile istenen sütunlar indeksin yaprak düzeyine eklenir; ana tabloya dönmeye gerek kalmaz (kapsayan indeks).'),
    mc('<p>Hangisi <b>SARGable değildir</b>?</p>', ['<code>WHERE order_id = 10</code>', '<code>WHERE email LIKE \'ali%\'</code>', '<code>WHERE UPPER(email) = \'ALI@X.COM\'</code>', '<code>WHERE order_date &gt;= \'2024-01-01\'</code>'], 2, 'Sütun UPPER fonksiyonunun içinde olduğu için indeks aranamaz.'),
    mc('<p>Bir iyileştirmenin işe yarayıp yaramadığını anlamak için en güvenilir ölçü hangisidir?</p>', ['Geçen süre (elapsed time)', 'Mantıksal okuma (logical reads)', 'Sonuç satır sayısı', 'Plan ekranındaki operatör sayısı'], 1, 'Süre sunucu yüküne göre değişir; mantıksal okuma ise yapılan işi doğrudan ölçer.')
  ]
}]);

/* ======================= Veritabanı Yönetimi (DBA) ======================= */
const DBA = 'Veritabanı Yönetimi (DBA)';
after('ts-izolasyon', [{
  id: 'dba-mimari', lv: 'C1', mod: DBA, min: 14,
  title: 'SQL Server mimarisi: instance, dosyalar ve sistem veritabanları',
  sum: 'Veritabanı nasıl saklanır? mdf/ldf, sayfalar, tempdb, buffer pool.',
  body: `
<h2>Instance ve veritabanı</h2>
<p>Bir sunucuya kurulan her SQL Server hizmetine <b>instance</b> denir; bir makinede birden çok instance olabilir. Her instance içinde birçok veritabanı bulunur.</p>
<h3>Sistem veritabanları</h3>
<table>
<tr><th>Veritabanı</th><th>Görevi</th></tr>
<tr><td><code>master</code></td><td>Instance'ın kaydı: login'ler, veritabanı listesi, ayarlar. Kaybı ciddi sorundur, yedeklenmelidir.</td></tr>
<tr><td><code>model</code></td><td>Yeni veritabanları için şablon.</td></tr>
<tr><td><code>msdb</code></td><td>SQL Server Agent işleri, yedekleme geçmişi, zamanlamalar.</td></tr>
<tr><td><code>tempdb</code></td><td>Geçici tablolar, sıralama ve karma işlemleri, satır sürümleri. Her yeniden başlatmada sıfırlanır; performans için çok önemlidir.</td></tr>
</table>
<h2>Dosyalar</h2>
<ul>
<li><b>.mdf</b>: Birincil veri dosyası. <b>.ndf</b>: ek veri dosyaları.</li>
<li><b>.ldf</b>: İşlem günlüğü (transaction log). Her değişiklik önce buraya yazılır (write-ahead logging); çökme sonrası kurtarma buradan yapılır.</li>
<li><b>Dosya grupları</b> (filegroup): Veri dosyalarını mantıksal gruplar. Büyük tabloları farklı disklere dağıtmak için kullanılır.</li>
</ul>
<h2>Sayfa ve kapsam</h2>
<p>Veri diskte <b>8 KB'lık sayfalar</b> halinde saklanır; 8 ardışık sayfa bir <b>kapsamdır</b> (extent, 64 KB). Bir satır (LOB hariç) bir sayfaya sığmalıdır. Sorgu performansındaki “mantıksal okuma” bu sayfaların sayısıdır.</p>
<h2>Bellek: buffer pool</h2>
<p>Okunan sayfalar bellekteki <b>buffer pool</b>'da tutulur. Değiştirilen (kirli) sayfalar hemen diske yazılmaz; <b>checkpoint</b> süreci periyodik olarak yazar. Günlük ise her COMMIT'te diske yazılır; dayanıklılığı (ACID'deki D) sağlayan budur.</p>
<h3>Bilgi alma sorguları</h3>
${NR("SELECT name, recovery_model_desc, state_desc FROM sys.databases;\n\nSELECT name, type_desc, physical_name, size * 8 / 1024 AS boyut_mb\nFROM sys.database_files;\n\nSELECT @@VERSION;")}
<div class="note"><b>Diğer SQL türlerinde karşılıklar</b>PostgreSQL'de “cluster” bir instance'tır; veri dizini (PGDATA), WAL (günlük) ve <code>shared_buffers</code> vardır. Oracle'da instance ile veritabanı ayrı kavramlardır; redo log, tablespace ve SGA karşılık gelir.</div>
`,
  ex: [
    mc('<p>Geçici tablolar ve sıralama işlemleri hangi sistem veritabanını kullanır?</p>', ['master', 'model', 'msdb', 'tempdb'], 3),
    mc('<p>SQL Server Agent işlerinin tanımları ve yedekleme geçmişi nerede saklanır?</p>', ['master', 'msdb', 'tempdb', 'model'], 1),
    mc('<p>Çökme sonrası, COMMIT edilmiş ama veri dosyasına henüz yazılmamış değişiklikler nereden kurtarılır?</p>', ['.mdf dosyasından', 'İşlem günlüğünden (.ldf)', 'tempdb\'den', 'Kurtarılamaz'], 1, 'Write-ahead logging: değişiklik önce günlüğe yazılır, veri sayfası sonra. Kurtarma sırasında günlük yeniden oynatılır.'),
    mc('<p>SQL Server\'da bir veri sayfasının boyutu nedir?</p>', ['4 KB', '8 KB', '64 KB', '1 MB'], 1)
  ]
}, {
  id: 'dba-yedek', lv: 'C1', mod: DBA, min: 16,
  title: 'Yedekleme ve geri yükleme: recovery model, RPO ve RTO',
  sum: 'Tam, fark ve günlük yedekleri; zincir; belirli bir ana geri dönmek.',
  body: `
<h2>Önce iki soru: RPO ve RTO</h2>
<ul>
<li><b>RPO</b> (Recovery Point Objective): En fazla ne kadar veri kaybını kabul edebiliriz? (ör. 15 dakika)</li>
<li><b>RTO</b> (Recovery Time Objective): Sistem en geç ne kadar sürede ayağa kalkmalı? (ör. 1 saat)</li>
</ul>
<p>Yedekleme stratejisi bu iki sayıdan türetilir. “Her gece tam yedek” stratejisinin RPO'su 24 saattir.</p>
<h2>Recovery model</h2>
<table>
<tr><th>Model</th><th>Günlük yedeği</th><th>Belirli bir ana dönüş</th><th>Kullanım</th></tr>
<tr><td><b>SIMPLE</b></td><td>Yok; günlük kendiliğinden temizlenir</td><td>Hayır, yalnızca son yedeğe</td><td>Test, geliştirme, kaybı tolere edilebilen veri</td></tr>
<tr><td><b>FULL</b></td><td>Var ve zorunlu</td><td>Evet (point-in-time)</td><td>Canlı sistemler</td></tr>
<tr><td><b>BULK_LOGGED</b></td><td>Var</td><td>Kısmen</td><td>Büyük toplu yüklemeler sırasında geçici</td></tr>
</table>
<div class="warn"><b>FULL modelde günlük yedeği almamak</b>.ldf dosyası sürekli büyür ve diski doldurur. Bu, en sık görülen DBA acil durumlarındandır.</div>
<h2>Yedek türleri</h2>
<ul>
<li><b>Tam</b> (full): Veritabanının tamamı.</li>
<li><b>Fark</b> (differential): Son <b>tam</b> yedekten beri değişen kapsamlar.</li>
<li><b>Günlük</b> (log): Son günlük yedeğinden beri günlük kayıtları; zincir oluşturur.</li>
</ul>
${NR("BACKUP DATABASE anadolu TO DISK = N'D:\\yedek\\anadolu_full.bak' WITH COMPRESSION, CHECKSUM;\nBACKUP DATABASE anadolu TO DISK = N'D:\\yedek\\anadolu_diff.bak' WITH DIFFERENTIAL, COMPRESSION, CHECKSUM;\nBACKUP LOG anadolu TO DISK = N'D:\\yedek\\anadolu_1015.trn' WITH COMPRESSION, CHECKSUM;")}
<h2>Geri yükleme sırası</h2>
<p>Örnek strateji: Pazar 00:00 tam, her gece fark, her 15 dakikada günlük yedeği. Çarşamba 10:20'de bir tablo yanlışlıkla silindi; 10:19'a dönmek istiyoruz:</p>
${NR("RESTORE DATABASE anadolu FROM DISK = N'...full.bak' WITH NORECOVERY;   -- Pazar tam\nRESTORE DATABASE anadolu FROM DISK = N'...diff_sali.bak' WITH NORECOVERY;  -- son fark (Salı gecesi)\nRESTORE LOG anadolu FROM DISK = N'...0000.trn' WITH NORECOVERY;  -- farktan sonraki tüm günlükler, sırayla\n-- ...\nRESTORE LOG anadolu FROM DISK = N'...1030.trn'\n    WITH STOPAT = '2025-03-12 10:19:00', RECOVERY;  -- belirli ana kadar, sonra aç")}
<p><code>NORECOVERY</code>, veritabanını sonraki yedekleri kabul edecek şekilde açık bırakır; son adımda <code>RECOVERY</code> ile kullanıma açılır.</p>
<div class="tip"><b>Altın kurallar</b>Geri yüklenmemiş yedek, yedek değildir: düzenli olarak test sunucusuna geri yükle. 3-2-1 kuralı: 3 kopya, 2 farklı ortam, 1'i başka bir konumda. CHECKSUM ile yedek bozulmalarını erken yakala.</div>
<table>
<tr><th>SQL türü</th><th>Araçlar</th></tr>
<tr><td>PostgreSQL</td><td><code>pg_dump</code> (mantıksal), <code>pg_basebackup</code> + WAL arşivi (fiziksel, belirli ana dönüş)</td></tr>
<tr><td>MySQL</td><td><code>mysqldump</code>, binlog ile belirli ana dönüş; büyük sistemlerde Percona XtraBackup</td></tr>
<tr><td>Oracle</td><td>RMAN (Recovery Manager)</td></tr>
</table>
`,
  ex: [
    mc('<p>Şirket “en fazla 15 dakikalık veri kaybını kabul ederiz” diyor. Bu hangi hedeftir ve SQL Server\'da neyi gerektirir?</p>', ['RTO; daha hızlı disk', 'RPO; FULL recovery model ve en az 15 dakikada bir günlük yedeği', 'RPO; SIMPLE model ve gece yedeği', 'RTO; Always On'], 1),
    mc('<p>FULL recovery modeldeki bir veritabanının .ldf dosyası sürekli büyüyor. En olası neden?</p>', ['Tam yedek alınmıyor', 'Günlük (log) yedeği alınmıyor', 'İndeksler parçalanmış', 'tempdb dolu'], 1, 'FULL modelde günlük, yalnızca günlük yedeği alındıktan sonra yeniden kullanılabilir hale gelir.'),
    mc('<p>Fark (differential) yedeği neye göre değişenleri içerir?</p>', ['Bir önceki fark yedeğine', 'Son tam yedeğe', 'Son günlük yedeğine', 'Dün geceye'], 1, 'Bu yüzden geri yüklemede yalnızca son tam ve son fark yedeği gerekir.'),
    mc('<p>Geri yükleme zincirinde son yedek hariç tüm adımlarda hangi seçenek kullanılır?</p>', ['WITH RECOVERY', 'WITH NORECOVERY', 'WITH REPLACE', 'WITH CHECKSUM'], 1)
  ]
}, {
  id: 'dba-bakim', lv: 'C2', mod: DBA, min: 14,
  title: 'Bakım: indeks parçalanması, istatistikler, DBCC ve Agent işleri',
  sum: 'Veritabanını sağlıklı tutan düzenli işler ve zamanlanması.',
  body: `
<h2>Düzenli bakım işleri</h2>
<table>
<tr><th>İş</th><th>Neden?</th><th>Sıklık (tipik)</th></tr>
<tr><td>İndeks bakımı</td><td>Ekleme ve silmelerle sayfalar parçalanır, okuma artar</td><td>Haftalık</td></tr>
<tr><td>İstatistik güncelleme</td><td>Optimizer satır sayısını doğru tahmin etsin</td><td>Günlük / haftalık</td></tr>
<tr><td>Bütünlük kontrolü (<code>DBCC CHECKDB</code>)</td><td>Disk kaynaklı bozulmaları erken yakala</td><td>Haftalık</td></tr>
<tr><td>Yedekler</td><td>Önceki ders</td><td>Stratejiye göre</td></tr>
<tr><td>Geçmiş temizliği</td><td>msdb'deki eski yedek/iş geçmişi</td><td>Aylık</td></tr>
</table>
<h2>İndeks parçalanması</h2>
${NR("SELECT OBJECT_NAME(ps.object_id) AS tablo,\n       i.name AS indeks,\n       ps.avg_fragmentation_in_percent AS parcalanma,\n       ps.page_count\nFROM sys.dm_db_index_physical_stats(DB_ID(), NULL, NULL, NULL, 'LIMITED') ps\nJOIN sys.indexes i ON i.object_id = ps.object_id AND i.index_id = ps.index_id\nWHERE ps.page_count > 1000\nORDER BY parcalanma DESC;")}
<table>
<tr><th>Parçalanma</th><th>Önerilen işlem (genel kural)</th></tr>
<tr><td>%5–30</td><td><code>ALTER INDEX ... REORGANIZE</code> (çevrimiçi, hafif)</td></tr>
<tr><td>%30 üzeri</td><td><code>ALTER INDEX ... REBUILD</code> (Enterprise'da <code>ONLINE = ON</code>)</td></tr>
<tr><td>1000 sayfadan küçük</td><td>Uğraşmaya değmez</td></tr>
</table>
<div class="note"><b>Modern görüş</b>SSD disklerde parçalanmanın etkisi azaldı; birçok uzman artık sık REBUILD yerine düzenli istatistik güncellemesini daha önemli buluyor. Kararı ölçerek ver.</div>
${NR("ALTER INDEX ix_orders_date ON dbo.orders REORGANIZE;\nALTER INDEX ALL ON dbo.order_items REBUILD WITH (ONLINE = ON);\nUPDATE STATISTICS dbo.orders WITH FULLSCAN;\nDBCC CHECKDB (anadolu) WITH NO_INFOMSGS;")}
<h2>Zamanlama: SQL Server Agent</h2>
<p>Bakım işleri SQL Server Agent <b>işleri</b> (job) olarak zamanlanır: adımlar, zamanlama ve hata durumunda operatöre e-posta. Topluluğun yaygın kullandığı hazır çözüm Ola Hallengren'in bakım betikleridir. Azure SQL Database'de Agent yoktur; Elastic Jobs veya Azure Automation kullanılır.</p>
<table>
<tr><th>SQL türü</th><th>Karşılık</th></tr>
<tr><td>PostgreSQL</td><td><code>VACUUM</code> (ölü satırları temizler, MVCC gereği), <code>ANALYZE</code> (istatistik), autovacuum; zamanlama için pg_cron</td></tr>
<tr><td>MySQL</td><td><code>OPTIMIZE TABLE</code>, <code>ANALYZE TABLE</code>; zamanlama için Event Scheduler</td></tr>
<tr><td>Oracle</td><td>Otomatik istatistik toplama (DBMS_STATS), DBMS_SCHEDULER</td></tr>
</table>
`,
  ex: [
    mc('<p>Bir indeksin parçalanması %45 ve 50.000 sayfa. Genel kurala göre ne yapılır?</p>', ['Hiçbir şey', 'REORGANIZE', 'REBUILD', 'İndeksi silmek'], 2),
    mc('<p>Optimizer\'ın tahmini satır sayısı ile gerçek satır sayısı arasında büyük fark var. İlk bakılacak şey?</p>', ['İstatistiklerin güncelliği', 'Disk boyutu', 'Login yetkileri', 'Yedekleme zinciri'], 0),
    mc('<p>PostgreSQL\'de UPDATE ve DELETE sonrası oluşan ölü satırları temizleyen işlem hangisidir?</p>', ['REINDEX', 'VACUUM', 'CHECKPOINT', 'TRUNCATE'], 1, 'MVCC nedeniyle eski satır sürümleri hemen silinmez; VACUUM (ve autovacuum) bu alanı geri kazanır.'),
    mc('<p>Veritabanı sayfalarında disk kaynaklı bozulma olup olmadığını hangi komut denetler?</p>', ['DBCC CHECKDB', 'UPDATE STATISTICS', 'sp_who2', 'BACKUP LOG'], 0)
  ]
}, {
  id: 'dba-izleme', lv: 'C2', mod: DBA, min: 15,
  title: 'İzleme: DMV\'ler, bekleme istatistikleri, engelleme ve deadlock',
  sum: 'Sunucu yavaşladığında nereye bakılır?',
  body: `
<h2>“Sunucu yavaş” dendiğinde</h2>
<ol>
<li><b>Şu an ne çalışıyor?</b> Aktif istekler ve kim kimi engelliyor?</li>
<li><b>Sunucu neyi bekliyor?</b> Bekleme istatistikleri darboğazın türünü söyler.</li>
<li><b>En pahalı sorgular hangileri?</b> Toplam CPU ve okuma bazında.</li>
</ol>
<h3>Aktif istekler ve engelleme</h3>
${NR("SELECT r.session_id, r.status, r.blocking_session_id, r.wait_type,\n       r.wait_time, r.cpu_time, r.logical_reads, t.text AS sorgu\nFROM sys.dm_exec_requests r\nCROSS APPLY sys.dm_exec_sql_text(r.sql_handle) t\nWHERE r.session_id <> @@SPID;")}
<p><code>blocking_session_id</code> dolu olan satırlar, başka bir oturumun kilidini bekliyor demektir. Zincirin başındaki oturum genellikle uzun süren veya COMMIT edilmeyi unutulmuş bir işlemdir.</p>
<h3>En pahalı sorgular</h3>
${NR("SELECT TOP 10\n       qs.total_worker_time / qs.execution_count AS ort_cpu,\n       qs.total_logical_reads / qs.execution_count AS ort_okuma,\n       qs.execution_count,\n       SUBSTRING(t.text, 1, 200) AS sorgu\nFROM sys.dm_exec_query_stats qs\nCROSS APPLY sys.dm_exec_sql_text(qs.sql_handle) t\nORDER BY qs.total_logical_reads DESC;")}
<h2>Bekleme türleri</h2>
<table>
<tr><th>Bekleme</th><th>Genellikle işaret ettiği</th></tr>
<tr><td><code>PAGEIOLATCH_*</code></td><td>Diskten sayfa okuma: bellek yetersiz veya eksik indeks yüzünden çok okuma</td></tr>
<tr><td><code>LCK_M_*</code></td><td>Kilit bekleme: engelleme, uzun işlemler</td></tr>
<tr><td><code>CXPACKET</code> / <code>CXCONSUMER</code></td><td>Paralel sorgu senkronizasyonu</td></tr>
<tr><td><code>WRITELOG</code></td><td>Günlük diski yavaş</td></tr>
<tr><td><code>SOS_SCHEDULER_YIELD</code></td><td>CPU baskısı</td></tr>
</table>
<h2>Deadlock (kilitlenme)</h2>
<p>İki işlem birbirinin kilidini bekler: A, X'i kilitleyip Y'yi ister; B, Y'yi kilitleyip X'i ister. SQL Server bunu otomatik algılar ve birini <b>kurban</b> seçip geri alır (hata 1205). Uygulama bu hatayı yakalayıp işlemi yeniden denemelidir.</p>
<ul>
<li>Tabloları her işlemde <b>aynı sırayla</b> güncelle.</li>
<li>İşlemleri kısa tut; kullanıcı girdisi beklerken işlem açık bırakma.</li>
<li>Uygun indekslerle daha az satır kilitle.</li>
<li>Okuma ağırlıklı sistemlerde <code>READ_COMMITTED_SNAPSHOT</code> düşün.</li>
</ul>
<div class="tip"><b>Araçlar</b>Query Store (sorgu geçmişi), Extended Events (deadlock grafikleri dahil hafif izleme), Activity Monitor. PostgreSQL'de <code>pg_stat_activity</code> ve <code>pg_stat_statements</code>; MySQL'de <code>performance_schema</code> ve sys şeması; Oracle'da AWR raporları.</div>
`,
  ex: [
    mc('<p><code>sys.dm_exec_requests</code>\'te bir oturumun <code>blocking_session_id</code> değeri 57. Bu ne demektir?</p>', ['57 numaralı oturum bu oturumu engelliyor (kilidini bekliyor)', 'Bu oturum 57 ms bekledi', '57 satır kilitlendi', 'Oturum 57 kez çalıştı'], 0),
    mc('<p>Bekleme istatistiklerinde <code>PAGEIOLATCH_SH</code> çok yüksek. İlk şüphe?</p>', ['CPU yetersiz', 'Diskten çok fazla sayfa okunuyor: bellek yetersiz veya eksik indeks', 'Ağ yavaş', 'Deadlock'], 1),
    mc('<p>Uygulama 1205 (deadlock victim) hatası aldığında doğru davranış nedir?</p>', ['Kullanıcıya hatayı gösterip vazgeçmek', 'İşlemi kısa bir beklemeden sonra yeniden denemek', 'Veritabanını yeniden başlatmak', 'NOLOCK eklemek'], 1),
    mc('<p>Deadlock riskini azaltan alışkanlık hangisidir?</p>', ['Tabloları her işlemde farklı sırayla güncellemek', 'İşlemleri uzun tutmak', 'Tabloları her işlemde aynı sırayla güncellemek', 'Tüm indeksleri silmek'], 2)
  ]
}, {
  id: 'dba-ha', lv: 'C2', mod: DBA, min: 13,
  title: 'Yüksek erişilebilirlik ve ölçekleme: Always On, replikasyon, sharding',
  sum: 'Sunucu çökünce ne olur? HA ve DR çözümleri, okuma ölçekleme.',
  body: `
<h2>HA ve DR</h2>
<ul>
<li><b>Yüksek erişilebilirlik</b> (HA): Bir sunucu çöktüğünde saniyeler/dakikalar içinde başka bir sunucunun devralması. Genellikle aynı veri merkezinde, eşzamanlı.</li>
<li><b>Felaket kurtarma</b> (DR): Tüm veri merkezi kaybedildiğinde başka bir bölgede ayağa kalkmak. Genellikle eşzamansız.</li>
</ul>
<h2>SQL Server seçenekleri</h2>
<table>
<tr><th>Çözüm</th><th>Ne kopyalanır?</th><th>Not</th></tr>
<tr><td><b>Always On Availability Groups</b></td><td>Bir grup veritabanı, birincilden ikincillere</td><td>Eşzamanlı (veri kaybı yok) veya eşzamansız. İkinciller okuma ve yedek için kullanılabilir.</td></tr>
<tr><td><b>Failover Cluster Instance</b></td><td>Instance'ın tamamı, paylaşımlı disk</td><td>Disk tek nokta olarak kalır.</td></tr>
<tr><td><b>Log Shipping</b></td><td>Günlük yedekleri başka sunucuya taşınıp geri yüklenir</td><td>Basit ve ucuz DR; dakikalar düzeyinde gecikme.</td></tr>
<tr><td><b>Replikasyon</b></td><td>Seçilen tablolar veya satırlar</td><td>Raporlama sunucusu besleme, dağıtık sistemler.</td></tr>
</table>
<h2>Diğer SQL türleri</h2>
<table>
<tr><th>SQL türü</th><th>Yaygın çözümler</th></tr>
<tr><td>PostgreSQL</td><td>Akış replikasyonu (streaming replication), mantıksal replikasyon, otomatik devralma için Patroni</td></tr>
<tr><td>MySQL</td><td>Kaynak–kopya replikasyonu, Group Replication / InnoDB Cluster</td></tr>
<tr><td>Oracle</td><td>Data Guard (DR), RAC (aynı veritabanına birden çok sunucu)</td></tr>
</table>
<h2>Ölçekleme</h2>
<ul>
<li><b>Dikey ölçekleme</b>: Daha güçlü sunucu. Basit ama sınırlı.</li>
<li><b>Okuma kopyaları</b>: Raporlar ve okumalar ikincil sunuculara yönlendirilir.</li>
<li><b>Bölümleme</b> (partitioning): Büyük tablo tek veritabanında parçalara ayrılır (ör. yıla göre). Bakım ve arşivlemeyi kolaylaştırır.</li>
<li><b>Sharding</b>: Veri birden çok veritabanına anahtara göre dağıtılır (ör. müşteri numarasına göre). Yazma ölçeklenir ama sorgular ve işlemler karmaşıklaşır.</li>
</ul>
<div class="tip"><b>Bulut</b>Azure SQL, Amazon RDS / Aurora, Google Cloud SQL gibi yönetilen hizmetler yedekleme, yama ve yüksek erişilebilirliği büyük ölçüde üstlenir. DBA'nın işi performans, maliyet, güvenlik ve mimari kararlara kayar.</div>
`,
  ex: [
    mc('<p>Birincil sunucu çöktüğünde <b>hiç veri kaybetmeden</b> devralma için Always On\'da hangi mod gerekir?</p>', ['Eşzamansız (asynchronous) commit', 'Eşzamanlı (synchronous) commit', 'Log shipping', 'Replikasyon'], 1),
    mc('<p>Rapor sorguları canlı sistemi yavaşlatıyor. Hangisi en uygun çözümdür?</p>', ['Raporları okunabilir ikincil kopyaya yönlendirmek', 'Tüm indeksleri silmek', 'Recovery model\'i SIMPLE yapmak', 'Raporları gece yarısı iptal etmek'], 0),
    mc('<p>Sharding\'in temel zorluğu nedir?</p>', ['Okumaların yavaşlaması', 'Birden çok parçaya yayılan sorgular ve işlemlerin karmaşıklaşması', 'Yedek alınamaması', 'İndeks oluşturulamaması'], 1)
  ]
}]);

/* ======================= Uygulama Geliştirme ======================= */
const APP = 'Uygulama Geliştirme';
after('performans', [{
  id: 'be-orm', lv: 'B2', mod: APP, min: 14,
  title: 'Uygulamadan SQL\'e: parametreli sorgu, ORM ve N+1',
  sum: 'Kod içinden veritabanına güvenli ve verimli erişim.',
  body: `
<h2>Parametreli sorgu: tek doğru yol</h2>
<p>Kullanıcı girdisini sorgu metnine <b>birleştirmek</b>, SQL injection açığının kaynağıdır. Bunun yerine sorgu bir kez yazılır, değerler <b>parametre</b> olarak ayrı gönderilir. Veritabanı parametreyi her zaman veri olarak görür, kod olarak çalıştırmaz.</p>
${NR("# Yanlış (Python) — girdi sorguya birleştiriliyor\ncur.execute(\"SELECT * FROM customers WHERE email = '\" + email + \"'\")\n\n# Doğru — parametre\ncur.execute(\"SELECT * FROM customers WHERE email = %s\", (email,))\n\n// C# / ADO.NET\nvar cmd = new SqlCommand(\"SELECT * FROM customers WHERE email = @email\", conn);\ncmd.Parameters.AddWithValue(\"@email\", email);")}
<p>Parametreli sorguların bir faydası da <b>plan önbelleği</b>dir: aynı sorgu metni farklı değerlerle tekrar kullanılır.</p>
<h2>ORM nedir?</h2>
<p>Entity Framework, Hibernate, Django ORM, SQLAlchemy, Prisma gibi araçlar tabloları sınıflara eşler ve SQL'i senin yerine üretir. Hızlı geliştirme sağlar ama ürettiği SQL'i <b>görmeden</b> kullanmak performans sorunlarına yol açar. ORM kullanan iyi bir geliştirici, ürettiği SQL'i günlükte okuyabilir.</p>
<h2>N+1 sorunu</h2>
<p>Bir sayfada 50 müşteri ve her birinin sipariş sayısı gösterilecek. Saf bir ORM kodu önce müşterileri çeker (1 sorgu), sonra döngüde her müşteri için sipariş sayısını sorar (50 sorgu): toplam <b>51 sorgu</b>. Her sorgu ağ gidiş-dönüşü demektir.</p>
${NR("-- N+1: uygulama döngüsünde\nSELECT customer_id, first_name FROM customers WHERE segment = 'Premium';\nSELECT COUNT(*) FROM orders WHERE customer_id = 3;\nSELECT COUNT(*) FROM orders WHERE customer_id = 7;\n-- ... müşteri sayısı kadar")}
<pre class="code">-- Çözüm: tek sorgu
SELECT c.customer_id,
       c.first_name,
       COUNT(o.order_id) AS siparis_sayisi
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id
WHERE c.segment = 'Premium'
GROUP BY c.customer_id, c.first_name;</pre>
<p>ORM'lerde bunun karşılığı “eager loading”dir: <code>Include()</code> (EF), <code>select_related</code> / <code>prefetch_related</code> (Django), <code>joinedload</code> (SQLAlchemy).</p>
<h2>Diğer iyi alışkanlıklar</h2>
<ul>
<li><b>SELECT *</b> yerine gereken sütunları iste; tablo genişledikçe uygulama sessizce yavaşlar.</li>
<li><b>Bağlantı havuzu</b> (connection pool) kullan; her istekte yeni bağlantı açmak pahalıdır.</li>
<li><b>İşlemleri kısa tut</b>; işlem açıkken dış servise HTTP isteği yapma.</li>
<li><b>Sayfalama</b> yap; bir listeye 100.000 satır çekme (sonraki ders).</li>
</ul>
`,
  ex: [
    { t: 'sql', q: '<p>N+1 sorununu çöz: <b>Kurumsal</b> segmentteki her müşteri için <code>customer_id</code>, <code>first_name</code> ve toplam sipariş sayısını (<code>siparis_sayisi</code>, siparişi yoksa 0) tek sorguda getir.</p>', sol: "SELECT c.customer_id, c.first_name, COUNT(o.order_id) AS siparis_sayisi FROM customers c LEFT JOIN orders o ON o.customer_id = c.customer_id WHERE c.segment = 'Kurumsal' GROUP BY c.customer_id, c.first_name;", hint: 'LEFT JOIN + GROUP BY; COUNT(o.order_id) siparişi olmayanlar için 0 verir.' },
    mc('<p>Hangisi SQL injection\'a karşı <b>asıl</b> korumadır?</p>', ['Girdideki tırnakları elle silmek', 'Parametreli sorgu (prepared statement) kullanmak', 'Sorguyu büyük harfle yazmak', 'Veritabanı şifresini uzatmak'], 1),
    mc('<p>Bir sayfa yüklenirken günlükte aynı biçimde 200 küçük SELECT görüyorsun (her biri farklı bir id ile). Sorunun adı ve çözümü?</p>', ['Deadlock; NOLOCK', 'N+1; JOIN veya eager loading ile tek sorgu', 'Parameter sniffing; RECOMPILE', 'Parçalanma; REBUILD'], 1)
  ]
}, {
  id: 'be-sayfalama', lv: 'B2', mod: APP, min: 14,
  title: 'Uygulamalarda sayfalama: OFFSET ve keyset',
  sum: 'Liste ekranları için doğru sayfalama yöntemi ve sonsuz kaydırma.',
  body: `
<h2>OFFSET ile sayfalama</h2>
<p>En bilinen yöntem: sırala, ilk (sayfa − 1) × boyut satırı atla, sonraki boyut kadar satırı al.</p>
<pre class="code">-- 3. sayfa, sayfa başına 10 ürün
SELECT product_id, name, price
FROM products
ORDER BY product_id
LIMIT 10 OFFSET 20;</pre>
<p>Basittir ve “sayfa 7'ye git” yapılabilir. Ama iki sorunu var:</p>
<ol>
<li><b>Derin sayfalar yavaşlar:</b> OFFSET 100000, veritabanının 100.000 satırı okuyup atması demektir.</li>
<li><b>Kayma:</b> Kullanıcı sayfalar arasında gezerken yeni satır eklenirse aynı kayıt iki sayfada görünür veya biri atlanır.</li>
</ol>
<h2>Keyset (seek) sayfalama</h2>
<p>Önceki sayfanın <b>son satırının</b> sıralama anahtarını hatırla ve “ondan sonrakileri” iste. İndeks doğrudan o noktaya gider; sayfa ne kadar derin olursa olsun hız aynıdır. Sonsuz kaydırma (infinite scroll) ve API'ler için standart yöntemdir.</p>
<pre class="code">-- Önceki sayfa product_id = 20 ile bitti
SELECT product_id, name, price
FROM products
WHERE product_id > 20
ORDER BY product_id
LIMIT 10;</pre>
<h3>Tekil olmayan sıralama: eşitlik bozucu</h3>
<p>Fiyata göre sıralarken aynı fiyatlı ürünler olabilir; yalnızca fiyatı hatırlamak satır kaybettirir. Sıralamaya tekil bir sütun (<code>product_id</code>) eklenir ve koşul iki sütunla yazılır:</p>
<pre class="code">-- Fiyata göre azalan; önceki sayfa (price = 1899, product_id = 25) ile bitti
SELECT product_id, name, price
FROM products
WHERE price < 1899
   OR (price = 1899 AND product_id < 25)
ORDER BY price DESC, product_id DESC
LIMIT 5;</pre>
<div class="note"><b>Satır değeri karşılaştırması</b>PostgreSQL, MySQL ve SQLite aynı koşulu kısaca <code>WHERE (price, product_id) &lt; (1899, 25)</code> diye yazmana izin verir. SQL Server ve Oracle'da yukarıdaki açık yazım gerekir.</div>
<table>
<tr><th></th><th>OFFSET</th><th>Keyset</th></tr>
<tr><td>Belirli sayfaya atlama</td><td>Var</td><td>Yok (yalnız ileri/geri)</td></tr>
<tr><td>Derin sayfa hızı</td><td>Yavaşlar</td><td>Sabit</td></tr>
<tr><td>Yeni kayıtlarda tutarlılık</td><td>Kayabilir</td><td>Tutarlı</td></tr>
<tr><td>Uygun olduğu yer</td><td>Yönetim panelleri, küçük tablolar</td><td>Akışlar, API'ler, büyük tablolar</td></tr>
</table>
<div class="tip"><b>Toplam sayfa sayısı</b>“Toplam 4.321 kayıt” bilgisi için ayrı bir <code>COUNT(*)</code> gerekir ve büyük tablolarda pahalıdır. Birçok uygulama bunu önbelleğe alır ya da yalnızca “daha fazla” düğmesi gösterir.</div>
`,
  ex: [
    { t: 'sql', q: '<p>Ürünleri <code>product_id</code>\'ye göre sırala ve sayfa başına 10 ürünle <b>3. sayfayı</b> OFFSET yöntemiyle getir: <code>product_id</code>, <code>name</code>.</p>', sol: 'SELECT product_id, name FROM products ORDER BY product_id LIMIT 10 OFFSET 20;', ord: true },
    { t: 'sql', q: '<p>Keyset sayfalama: önceki sayfa <code>order_id = 900</code> ile bitti. Siparişleri <code>order_id</code>\'ye göre artan sırada sonraki <b>5</b> kaydı getir: <code>order_id</code>, <code>order_date</code>, <code>status</code>.</p>', sol: 'SELECT order_id, order_date, status FROM orders WHERE order_id > 900 ORDER BY order_id LIMIT 5;', ord: true },
    { t: 'sql', q: '<p>Ürünler <b>fiyata göre azalan</b>, eşitlikte <code>product_id</code>\'ye göre azalan sırada listeleniyor. Önceki sayfa <code>price = 1899</code>, <code>product_id = 25</code> satırıyla bitti. Sonraki <b>5</b> ürünü keyset yöntemiyle getir: <code>product_id</code>, <code>name</code>, <code>price</code>.</p>', sol: 'SELECT product_id, name, price FROM products WHERE price < 1899 OR (price = 1899 AND product_id < 25) ORDER BY price DESC, product_id DESC LIMIT 5;', ord: true, hint: 'Aynı fiyatlı ürünleri kaybetmemek için: price &lt; 1899 OR (price = 1899 AND product_id &lt; 25).' }
  ]
}, {
  id: 'be-desenler', lv: 'C1', mod: APP, min: 15,
  title: 'Uygulama veritabanı desenleri: yumuşak silme, denetim sütunları, iyimser kilit',
  sum: 'Gerçek uygulamalarda her tabloda karşılaşılan kalıplar.',
  body: `
<h2>Yumuşak silme (soft delete)</h2>
<p>Satırı gerçekten silmek yerine <code>deleted_at</code> sütununa tarih yazılır. Kayıt geri getirilebilir, geçmiş raporlar bozulmaz. Bedeli: <b>her sorguda</b> <code>WHERE deleted_at IS NULL</code> unutulmamalıdır. Bunu garanti etmenin yolu, uygulamanın tabloya değil bir görünüme bakmasıdır.</p>
<pre class="code">ALTER TABLE products ADD COLUMN deleted_at TEXT;

UPDATE products SET deleted_at = '2024-12-31' WHERE product_id IN (39, 40);

CREATE VIEW v_aktif_urunler AS
SELECT product_id, name, category, price
FROM products
WHERE deleted_at IS NULL;

SELECT COUNT(*) AS aktif FROM v_aktif_urunler;</pre>
<div class="warn"><b>Benzersizlik tuzağı</b>E-posta tekil olmalıysa, silinmiş bir kaydın e-postası yeni kayda engel olur. SQL Server ve PostgreSQL'de filtreli/kısmi tekil indeks (<code>WHERE deleted_at IS NULL</code>) bunu çözer.</div>
<h2>Denetim (audit) sütunları</h2>
<p>Hemen her tabloda bulunur: <code>created_at</code>, <code>created_by</code>, <code>updated_at</code>, <code>updated_by</code>. Oluşturma zamanı varsayılan değerle, güncelleme zamanı uygulama veya trigger ile doldurulur. Değerlerin tam geçmişi gerekiyorsa ayrı bir geçmiş tablosu (veya SQL Server'ın <b>temporal table</b> özelliği) kullanılır.</p>
<h2>İyimser kilit (optimistic concurrency)</h2>
<p>İki kullanıcı aynı kaydı açıp düzenliyor. İkincisi kaydettiğinde birincinin değişikliğini <b>sessizce ezmemeli</b>. Çözüm: her satırda bir <code>versiyon</code> sütunu tut; güncellerken okuduğun versiyonu koşula ekle.</p>
<pre class="code">CREATE TABLE hesap (id INTEGER PRIMARY KEY, bakiye INTEGER, versiyon INTEGER);
INSERT INTO hesap VALUES (1, 1000, 1);

-- Ayşe ve Mehmet ikisi de versiyon = 1 olarak okudu.
-- Ayşe önce kaydeder: 1 satır etkilenir, versiyon 2 olur
UPDATE hesap SET bakiye = 900, versiyon = versiyon + 1 WHERE id = 1 AND versiyon = 1;

-- Mehmet eski versiyonla kaydetmeye çalışır: 0 satır etkilenir
UPDATE hesap SET bakiye = 1200, versiyon = versiyon + 1 WHERE id = 1 AND versiyon = 1;

SELECT * FROM hesap;</pre>
<p>Uygulama etkilenen satır sayısına bakar; 0 ise “kayıt siz düzenlerken değişti, yeniden yükleyin” der. SQL Server'da bunun için hazır <code>rowversion</code> veri tipi vardır.</p>
<h2>Tekrarlanabilir (idempotent) istekler</h2>
<p>Ödeme gibi işlemlerde ağ hatası yüzünden aynı istek iki kez gelebilir. İsteğe tekil bir <b>idempotency anahtarı</b> verilip tekil kısıtla saklanır; ikinci istek kısıta takılır ve ilk sonucun aynısı döndürülür.</p>
`,
  ex: [
    { t: 'sql', q: '<p><code>customers</code> tablosuna <code>deleted_at</code> sütunu (tarih) ekle; 1, 2 ve 3 numaralı müşterileri <code>2024-12-31</code> tarihiyle yumuşak sil ve silinmemiş müşterileri gösteren <code>v_aktif_musteriler</code> görünümünü (<code>customer_id</code>, <code>first_name</code>, <code>segment</code>) oluştur.</p>', sol: "ALTER TABLE customers ADD COLUMN deleted_at DATE;\nUPDATE customers SET deleted_at = '2024-12-31' WHERE customer_id IN (1, 2, 3);\nCREATE VIEW v_aktif_musteriler AS SELECT customer_id, first_name, segment FROM customers WHERE deleted_at IS NULL;", check: 'SELECT (SELECT COUNT(*) FROM v_aktif_musteriler) AS aktif, (SELECT COUNT(*) FROM customers WHERE deleted_at IS NOT NULL) AS silinen;', hint: 'Üç adım: ALTER TABLE ... ADD, UPDATE ... SET deleted_at, CREATE VIEW ... WHERE deleted_at IS NULL.' },
    { t: 'sql', q: '<p>Başlangıç kodu <code>stok</code> tablosunu oluşturuyor (ürün 1, adet 50, versiyon 1). Ayşe adedi <b>45</b> yapıyor, ardından Mehmet <b>eski versiyonu (1)</b> kullanarak adedi <b>60</b> yapmaya çalışıyor. İyimser kilit kullanarak iki UPDATE\'i yaz; Mehmet\'in güncellemesi etkisiz kalmalı.</p>', start: 'CREATE TABLE stok (urun_id INTEGER PRIMARY KEY, adet INTEGER, versiyon INTEGER);\nINSERT INTO stok VALUES (1, 50, 1);\n\n', sol: 'CREATE TABLE stok (urun_id INTEGER PRIMARY KEY, adet INTEGER, versiyon INTEGER);\nINSERT INTO stok VALUES (1, 50, 1);\nUPDATE stok SET adet = 45, versiyon = versiyon + 1 WHERE urun_id = 1 AND versiyon = 1;\nUPDATE stok SET adet = 60, versiyon = versiyon + 1 WHERE urun_id = 1 AND versiyon = 1;', check: 'SELECT adet, versiyon FROM stok;' },
    mc('<p>Yumuşak silme kullanan bir sistemde en sık yapılan hata nedir?</p>', ['Silinen kayıtların geri getirilememesi', 'Sorgularda <code>deleted_at IS NULL</code> koşulunun unutulması', 'Diskin dolması', 'İndeks oluşturulamaması'], 1)
  ]
}, {
  id: 'be-migration', lv: 'C1', mod: APP, min: 12,
  title: 'Şema değişikliklerini yönetmek: migration ve kesintisiz dağıtım',
  sum: 'Sürümlü SQL betikleri, genişlet–daralt (expand–contract) yöntemi.',
  body: `
<h2>Migration nedir?</h2>
<p>Veritabanı şeması da kod gibi sürümlenmelidir. Her değişiklik numaralı bir betikte tutulur (<code>V12__add_phone.sql</code>) ve araç hangi betiklerin uygulandığını veritabanındaki bir tabloda takip eder. Böylece geliştirme, test ve canlı ortam aynı sırayla aynı şemaya ulaşır.</p>
<table>
<tr><th>Ekosistem</th><th>Araç</th></tr>
<tr><td>Java / genel</td><td>Flyway, Liquibase</td></tr>
<tr><td>.NET</td><td>EF Core Migrations, DbUp; SQL Server için SSDT / DACPAC</td></tr>
<tr><td>Python</td><td>Alembic, Django migrations</td></tr>
<tr><td>Node.js</td><td>Prisma Migrate, Knex</td></tr>
</table>
<h2>Kesintisiz değişiklik: genişlet–daralt</h2>
<p>Çalışan bir uygulamada sütun adını değiştirmek (<code>first_name + last_name → full_name</code>) tek adımda yapılırsa, eski kod yeni şemayla çöker. Bunun yerine değişiklik geriye uyumlu adımlara bölünür:</p>
<ol>
<li><b>Genişlet:</b> Yeni sütunu ekle (boş bırakılabilir), eski sütunlara dokunma.</li>
<li><b>Doldur:</b> Mevcut veriyi yeni sütuna kopyala (büyük tablolarda parça parça).</li>
<li><b>Geçiş:</b> Uygulama hem eskiye hem yeniye yazsın, sonra yalnızca yeniden okusun.</li>
<li><b>Daralt:</b> Hiçbir kod eski sütunu kullanmadığında eski sütunu kaldır.</li>
</ol>
<pre class="code">-- 1. Genişlet
ALTER TABLE customers ADD COLUMN full_name TEXT;
-- 2. Doldur
UPDATE customers SET full_name = first_name || ' ' || last_name WHERE full_name IS NULL;
SELECT customer_id, first_name, last_name, full_name FROM customers LIMIT 3;</pre>
<div class="warn"><b>Büyük tablolarda kilit</b>Milyonlarca satırlı bir tabloda tek seferlik UPDATE veya bazı ALTER işlemleri tabloyu uzun süre kilitler. Doldurma işlemi 5.000–10.000 satırlık partilerle, kısa işlemlerde yapılır.</div>
<h2>İyi bir migration betiği</h2>
<ul>
<li><b>Tekrar çalıştırılabilir</b> olsun: <code>IF NOT EXISTS</code>, <code>CREATE OR ALTER</code>.</li>
<li>Tek bir mantıksal değişiklik içersin.</li>
<li>Canlıya gitmeden önce canlı boyutuna yakın veride denenmiş olsun.</li>
<li>Geri dönüş planı olsun (down script veya ileri düzeltme).</li>
</ul>
`,
  ex: [
    { t: 'sql', q: '<p><b>Genişlet ve doldur</b> adımlarını uygula: <code>customers</code> tablosuna <code>full_name</code> (metin) sütununu ekle ve mevcut satırlarda “ad soyad” biçiminde doldur.</p>', sol: "ALTER TABLE customers ADD COLUMN full_name TEXT;\nUPDATE customers SET full_name = first_name || ' ' || last_name;", check: "SELECT COUNT(*) AS dolu, SUM(CASE WHEN full_name = first_name || ' ' || last_name THEN 1 ELSE 0 END) AS dogru FROM customers WHERE full_name IS NOT NULL;" },
    mc('<p>Canlı uygulama <code>phone</code> sütununu okurken sütun adını <code>telefon</code> yapmak istiyorsun. Kesintisiz yol hangisidir?</p>', ['Doğrudan RENAME COLUMN çalıştırmak', 'Yeni sütunu ekle, veriyi kopyala, uygulamayı yeni sütuna geçir, sonra eskiyi kaldır', 'Tabloyu silip yeniden oluşturmak', 'Uygulamayı kapatıp hiç açmamak'], 1),
    mc('<p>Migration araçları hangi betiklerin uygulandığını nasıl bilir?</p>', ['Dosya tarihlerinden', 'Veritabanında tuttukları bir sürüm geçmişi tablosundan', 'Rastgele', 'Git geçmişinden'], 1)
  ]
}]);

/* ======================= Öğrenme yolları ======================= */
const P = window.SQLP_PATHS; const PA = {}; P.forEach(p => PA[p.id] = p);
const ins = (pid, afterId, ids) => { const p = PA[pid]; if (!p) return; ids = ids.filter(x => !p.lessons.includes(x)); const i = p.lessons.indexOf(afterId); p.lessons.splice(i < 0 ? p.lessons.length : i + 1, 0, ...ids); };
const BEYOND = {
  temel: ['Bir veritabanı aracını kurup kullanmak (SSMS, DBeaver)', 'Excel veya Google Sheets ile temel veri işleme'],
  tsql: ['SSMS ve SQL Server Agent kullanımı', 'SSIS / Azure Data Factory ile veri entegrasyonu', 'Power BI ile SQL Server raporlama'],
  analist: ['Excel / Google Sheets (pivot tablo, formüller)', 'Power BI, Tableau veya Looker Studio', 'Temel istatistik', 'Veriyle hikâye anlatma ve sunum', 'İsteğe bağlı: Python (pandas)'],
  bilimci: ['Python (pandas, scikit-learn) veya R', 'İstatistik ve olasılık teorisi', 'Makine öğrenmesi algoritmaları', 'Jupyter defterleri ve Git'],
  muhendis: ['Python ve komut satırı', 'Airflow / dbt / Data Factory gibi orkestrasyon araçları', 'Bulut veri ambarları (Snowflake, BigQuery, Databricks)', 'Docker ve Git'],
  bi: ['Power BI (DAX, Power Query) veya Tableau', 'Görselleştirme ilkeleri ve gösterge paneli tasarımı', 'Excel', 'İş birimleriyle ihtiyaç analizi'],
  dba: ['Windows Server / Linux sistem yönetimi', 'Depolama ve ağ temelleri', 'PowerShell (dbatools) ile otomasyon', 'Bulut veritabanı hizmetleri (Azure SQL, RDS)'],
  backend: ['Bir programlama dili (C#, Java, Python, Node.js)', 'Bir ORM aracı', 'REST API tasarımı', 'Test ve CI/CD'],
  uzman: ['Kendi projelerinde gerçek ölçekte performans deneyimi', 'Veritabanı iç yapısı üzerine kitaplar ve belgeler']
};
P.push({ id: 'bi', name: 'İş Zekâsı ve Raporlama Uzmanı', short: 'BI', color: '#A16207',
  desc: 'Power BI / Tableau için doğru veri: KPI, dönem karşılaştırmaları, paylar, takvim ve yıldız şema.',
  long: 'Raporları ve gösterge panellerini besleyen rol. Temel SQL\'in üzerine metrik tanımlamayı, YTD ve geçen yıl karşılaştırmalarını, pay ve endeks hesaplarını, takvim tablosu ve yıldız şemayla BI aracına doğru veri hazırlamayı öğrenirsin.',
  skills: ['KPI tanımlama', 'Pay ve endeks', 'YTD / YoY', 'Takvim tablosu', 'Yıldız şema', 'View tasarımı', 'ROLLUP', 'Pivot'],
  lessons: ['veri-seti', 'araclar', 'select', 'alias-distinct', 'hesaplama', 'where', 'mantik', 'in-between-like', 'null', 'order-limit', 'aggregate', 'group-by', 'having', 'case', 'coalesce', 'kosullu', 'metin', 'tarih-fn', 'sorgu-sirasi', 'stil', 'iliskiler', 'inner-join', 'left-join', 'coklu-join', 'subquery', 'cte', 'recursive-cte', 'takvim', 'window-intro', 'ranking', 'lag-lead', 'frames', 'an-kpi', 'an-dashboard', 'bi-pay', 'an-buyume', 'ytd', 'pivot', 'rollup', 'an-pareto', 'view', 'dwh', 'bi-hazirlik', 'performans', 'vaka-yilsonu'] });
P.push({ id: 'dba', name: 'Veritabanı Yöneticisi (DBA)', short: 'DBA', color: '#4B5563',
  desc: 'SQL Server\'ı ayakta, hızlı ve güvende tutmak: mimari, yedekleme, bakım, izleme, güvenlik, HA.',
  long: 'Veritabanı sunucularından sorumlu rol. Sağlam bir SQL ve T-SQL temelinin ardından mimari, işlemler ve kilitler, indeks ve yürütme planı, yedekleme ve geri yükleme, bakım işleri, izleme, güvenlik ve yüksek erişilebilirlik konularını öğrenirsin. Örnekler SQL Server odaklıdır; her derste PostgreSQL, MySQL ve Oracle karşılıkları da verilir.',
  skills: ['Mimari', 'Yedekleme / geri yükleme', 'İndeks bakımı', 'Yürütme planı', 'İzleme ve DMV', 'Kilit ve deadlock', 'Güvenlik', 'Always On'],
  lessons: ['araclar', 'ts-giris', 'select', 'where', 'order-limit', 'ts-top', 'aggregate', 'group-by', 'inner-join', 'left-join', 'subquery', 'cte', 'ts-degisken', 'ts-gecici', 'ts-sistem', 'ts-sequence', 'ddl-create', 'alter-drop', 'dml', 'transaction', 'acid', 'normalizasyon', 'view', 'ts-proc', 'ts-hata', 'ts-cursor', 'ts-trigger', 'ts-dinamik', 'index', 'ts-index', 'ts-plan', 'performans', 'ts-izolasyon', 'guvenlik', 'ts-guvenlik', 'dba-mimari', 'dba-yedek', 'dba-bakim', 'dba-izleme', 'dba-ha', 'de-partition', 'lehceler'] });
P.push({ id: 'backend', name: 'Backend Geliştirici için SQL', short: 'API', color: '#0E7C86',
  desc: 'Uygulama yazanların bilmesi gereken SQL: tasarım, işlemler, sayfalama, ORM, güvenlik, migration.',
  long: 'Uygulama geliştiren ve veritabanını koddan kullanan rol. Sorgu temellerinin yanında doğru tablo tasarımı, kısıtlar, işlemler ve izolasyon, upsert, sayfalama, ORM ve N+1 sorunu, iyimser kilit gibi uygulama desenleri ile şema değişikliklerini kesintisiz yönetmeyi öğrenirsin.',
  skills: ['Tablo tasarımı', 'Kısıtlar', 'Transaction', 'Upsert', 'Sayfalama', 'ORM ve N+1', 'İyimser kilit', 'Migration', 'SQL injection'],
  lessons: ['veritabani', 'araclar', 'select', 'where', 'mantik', 'null', 'order-limit', 'aggregate', 'group-by', 'having', 'case', 'coalesce', 'iliskiler', 'inner-join', 'left-join', 'subquery', 'correlated', 'cte', 'window-intro', 'ranking', 'ddl-create', 'normalizasyon', 'alter-drop', 'dml', 'upsert', 'transaction', 'acid', 'index', 'view', 'trigger', 'json', 'performans', 'be-orm', 'be-sayfalama', 'be-desenler', 'be-migration', 'ts-sequence', 'guvenlik', 'lehceler'] });
// mevcut öğrenme yollarına yeni dersler
ins('temel', 'veri-seti', ['araclar']); ins('temel', 'alias-distinct', ['hesaplama']); ins('temel', 'coalesce', ['kosullu']); ins('temel', 'recursive-cte', ['takvim']); ins('temel', 'metin', ['regex']);
ins('analist', 'veri-seti', ['araclar']); ins('analist', 'alias-distinct', ['hesaplama']); ins('analist', 'coalesce', ['kosullu']); ins('analist', 'an-temizlik', ['an-eda', 'regex', 'metin-benzerlik']); ins('analist', 'recursive-cte', ['takvim']); ins('analist', 'an-dashboard', ['bi-pay']); ins('analist', 'an-buyume', ['ytd']); ins('analist', 'an-funnel', ['an-aktif', 'an-churn', 'an-sepet']); ins('analist', 'mulakat-2', ['vaka-yilsonu', 'vaka-kayip']);
ins('bilimci', 'alias-distinct', ['hesaplama']); ins('bilimci', 'coalesce', ['kosullu']); ins('bilimci', 'ds-tanimsal', ['ds-olasilik']); ins('bilimci', 'recursive-cte', ['takvim']); ins('bilimci', 'ds-feature', ['an-sepet']); ins('bilimci', 'mulakat-2', ['vaka-kayip']);
ins('muhendis', 'veri-seti', ['araclar']); ins('muhendis', 'coalesce', ['kosullu', 'regex']); ins('muhendis', 'de-scd', ['de-dbt']); ins('muhendis', 'cte', ['takvim']); ins('muhendis', 'index', ['ts-sequence']);
ins('tsql', 'ts-giris', ['araclar']); ins('tsql', 'coalesce', ['kosullu']); ins('tsql', 'ts-metin', ['regex', 'metin-benzerlik']); ins('tsql', 'recursive-cte', ['takvim']); ins('tsql', 'ts-sistem', ['ts-sequence']); ins('tsql', 'ts-apply', ['ts-liste']); ins('tsql', 'ts-dinamik', ['ts-json']); ins('tsql', 'ts-hata', ['ts-cursor']); ins('tsql', 'ts-trigger', ['ts-guvenlik']); ins('tsql', 'ts-index', ['ts-plan']);
ins('uzman', 'index', ['ts-plan']); ins('uzman', 'guvenlik', ['ts-guvenlik']); ins('uzman', 'acid', ['dba-izleme']); ins('uzman', 'ileri-desenler', ['be-sayfalama', 'be-desenler']);

/* Yetkinlik haritaları: rolün bilmesi gerekenler → karşılayan dersler */
const C = (t, d, l) => ({ t, d, l });
const COMP = {
  temel: [C('Veritabanı mantığı', 'Tablo, satır, sütun, anahtar; komut grupları', ['tarih', 'veritabani', 'veri-seti', 'araclar']), C('Veri okuma ve filtreleme', 'SELECT, WHERE, mantık, desenler, NULL, sıralama', ['select', 'alias-distinct', 'hesaplama', 'where', 'mantik', 'in-between-like', 'null', 'order-limit']), C('Özetleme', 'Toplama, gruplama, koşullu sayım', ['aggregate', 'group-by', 'having', 'kosullu', 'sorgu-sirasi']), C('Fonksiyonlar', 'Metin, sayı, tarih, CASE, regex', ['metin', 'sayi-tip', 'tarih-fn', 'case', 'coalesce', 'regex']), C('Birleştirme', 'JOIN türleri ve küme işlemleri', ['iliskiler', 'inner-join', 'left-join', 'right-full-join', 'self-cross-join', 'coklu-join', 'set-ops']), C('İleri sorgular', 'Alt sorgu, CTE, pencere fonksiyonları', ['subquery', 'correlated', 'cte', 'recursive-cte', 'takvim', 'window-intro', 'ranking', 'lag-lead', 'frames', 'ntile-dist', 'pivot'])],
  tsql: [C('SQL Server ortamı', 'SSMS, dbo şeması, T-SQL yazımı', ['araclar', 'ts-giris', 'ts-sistem']), C('T-SQL sorgu dili', 'TOP, metin/tarih/dönüşüm fonksiyonları', ['ts-top', 'ts-metin', 'ts-tarih', 'ts-donusum', 'regex']), C('Programlama', 'Değişkenler, akış kontrolü, geçici tablolar, imleç', ['ts-degisken', 'ts-gecici', 'ts-cursor', 'ts-dinamik']), C('İleri sorgular', 'APPLY, PIVOT, ROLLUP, listeler, JSON', ['ts-apply', 'ts-pivot', 'rollup', 'ts-liste', 'ts-json', 'window-intro', 'ranking']), C('Veritabanı nesneleri', 'Tablo, view, prosedür, fonksiyon, trigger, sequence', ['ddl-create', 'view', 'ts-proc', 'ts-func', 'ts-trigger', 'ts-sequence']), C('Veri değiştirme ve işlemler', 'DML, MERGE, TRY/CATCH, işlemler', ['dml', 'transaction', 'ts-merge', 'ts-hata']), C('Performans ve güvenlik', 'İndeks, plan, izolasyon, yetkiler', ['index', 'ts-index', 'ts-plan', 'ts-izolasyon', 'ts-guvenlik'])],
  analist: [C('SQL temeli', 'Sorgu, filtre, gruplama, JOIN', ['select', 'where', 'group-by', 'having', 'inner-join', 'left-join', 'coklu-join']), C('Veri hazırlama', 'Temizleme, EDA, regex, metin eşleştirme', ['an-temizlik', 'an-eda', 'regex', 'metin-benzerlik', 'coalesce']), C('Metrikler', 'KPI, koşullu sayım, paylar', ['an-kpi', 'kosullu', 'bi-pay']), C('Zaman analizi', 'Tarih fonksiyonları, takvim, MoM/YoY, YTD', ['tarih-fn', 'takvim', 'an-buyume', 'ytd']), C('Müşteri ve ürün analitiği', 'Kohort, funnel, aktif kullanıcı, churn, RFM, sepet, Pareto', ['an-kohort', 'an-funnel', 'an-aktif', 'an-churn', 'an-rfm', 'an-sepet', 'an-pareto']), C('Analitik SQL', 'CTE ve pencere fonksiyonları', ['cte', 'window-intro', 'ranking', 'lag-lead', 'frames']), C('Raporlama ve iletişim', 'Dashboard sorguları, vaka çalışmaları', ['an-dashboard', 'view', 'vaka-yilsonu', 'vaka-kayip'])],
  bilimci: [C('SQL temeli', 'Sorgu, gruplama, JOIN, alt sorgu', ['select', 'group-by', 'inner-join', 'left-join', 'subquery', 'cte']), C('Tanımlayıcı istatistik', 'Ortalama, medyan, dağılım, aykırı değer', ['ds-tanimsal', 'ds-dagilim', 'ds-outlier']), C('Olasılık ve çıkarım', 'Koşullu olasılık, korelasyon, A/B testi', ['ds-olasilik', 'ds-korelasyon', 'ds-ab']), C('Model için veri', 'Örnekleme, özellik mühendisliği, zaman serisi', ['ds-ornekleme', 'ds-feature', 'ds-zaman', 'takvim']), C('Analitik SQL', 'Pencere fonksiyonları ve pivot', ['window-intro', 'ranking', 'lag-lead', 'frames', 'ntile-dist', 'pivot']), C('Yarı yapısal veri', 'JSON', ['json'])],
  muhendis: [C('SQL temeli', 'Sorgu, JOIN, CTE, pencere', ['select', 'group-by', 'inner-join', 'left-join', 'cte', 'window-intro', 'ranking']), C('Tasarım', 'DDL, normalizasyon, kısıtlar, sequence', ['ddl-create', 'alter-drop', 'normalizasyon', 'ts-sequence']), C('Veri değiştirme', 'DML, upsert, işlemler, ACID', ['dml', 'upsert', 'transaction', 'acid']), C('Veri boru hatları', 'ETL/ELT, artımlı yükleme, SCD, tekilleştirme, dbt', ['de-etl', 'de-incremental', 'de-scd', 'de-dedup', 'de-dbt']), C('Veri kalitesi', 'Testler ve temizleme', ['de-kalite', 'regex']), C('Ambar ve performans', 'Yıldız şema, indeks, bölümleme', ['dwh', 'index', 'performans', 'de-partition']), C('Ekosistem', 'Lehçeler, JSON, güvenlik, modern araçlar', ['lehceler', 'json', 'guvenlik', 'modern-ekosistem'])],
  uzman: [C('Tasarım', 'Normalizasyon ve DDL', ['ddl-create', 'normalizasyon', 'alter-drop']), C('Eşzamanlılık', 'İşlemler, ACID, izolasyon, izleme', ['transaction', 'acid', 'dba-izleme']), C('Performans', 'İndeks, plan, optimizasyon', ['index', 'ts-plan', 'performans']), C('İleri desenler', 'Gaps & islands, sayfalama, uygulama desenleri', ['ileri-desenler', 'be-sayfalama', 'be-desenler', 'rollup']), C('SQL türleri ve güvenlik', 'Lehçeler, güvenlik, JSON', ['lehceler', 'pg-ozel', 'mysql-ozel', 'oracle-ozel', 'guvenlik', 'ts-guvenlik', 'json'])],
  bi: [C('SQL temeli', 'Sorgu, filtre, gruplama, JOIN', ['select', 'where', 'group-by', 'having', 'inner-join', 'left-join', 'coklu-join']), C('Metrik tanımlama', 'KPI, koşullu sayım, hesaplanan alanlar', ['an-kpi', 'kosullu', 'hesaplama', 'case']), C('Zaman zekâsı', 'Takvim tablosu, YTD, MoM/YoY', ['tarih-fn', 'takvim', 'an-buyume', 'ytd']), C('Pay ve dağılım', 'Toplama göre yüzde, endeks, Pareto', ['bi-pay', 'an-pareto', 'window-intro', 'frames']), C('Rapor yapıları', 'Pivot, ara toplamlar, dashboard sorguları', ['pivot', 'rollup', 'an-dashboard']), C('Veri modeli', 'View, yıldız şema, BI veri hazırlığı', ['view', 'dwh', 'bi-hazirlik']), C('Performans ve uygulama', 'Hızlı rapor sorguları, vaka', ['performans', 'vaka-yilsonu'])],
  dba: [C('SQL ve T-SQL temeli', 'Sorgu ve programlama', ['select', 'group-by', 'inner-join', 'ts-giris', 'ts-degisken', 'ts-gecici', 'ts-proc', 'ts-hata', 'ts-cursor']), C('Mimari', 'Instance, dosyalar, sistem veritabanları', ['dba-mimari', 'ts-sistem']), C('İşlemler ve kilitler', 'ACID, izolasyon, deadlock', ['transaction', 'acid', 'ts-izolasyon']), C('Performans', 'İndeks, plan, istatistik', ['index', 'ts-index', 'ts-plan', 'performans']), C('Koruma', 'Yedekleme ve geri yükleme', ['dba-yedek']), C('Operasyon', 'Bakım, izleme, otomasyon', ['dba-bakim', 'dba-izleme', 'ts-dinamik']), C('Güvenlik', 'Login, rol, yetki, şifreleme', ['guvenlik', 'ts-guvenlik']), C('Süreklilik ve ölçek', 'HA/DR, bölümleme', ['dba-ha', 'de-partition'])],
  backend: [C('Sorgu temeli', 'CRUD sorguları, JOIN, alt sorgu', ['select', 'where', 'group-by', 'inner-join', 'left-join', 'subquery']), C('Şema tasarımı', 'Tablolar, kısıtlar, normalizasyon, anahtar üretimi', ['ddl-create', 'normalizasyon', 'alter-drop', 'ts-sequence']), C('Veri değiştirme', 'DML, upsert', ['dml', 'upsert']), C('İşlemler ve eşzamanlılık', 'Transaction, izolasyon, iyimser kilit', ['transaction', 'acid', 'be-desenler']), C('Koddan veritabanı', 'Parametreli sorgu, ORM, N+1, sayfalama', ['be-orm', 'be-sayfalama']), C('Performans', 'İndeksler ve sorgu optimizasyonu', ['index', 'performans']), C('Güvenlik ve dağıtım', 'SQL injection, yetkiler, migration', ['guvenlik', 'be-migration'])]
};
P.forEach(p => { if (COMP[p.id]) p.comp = COMP[p.id]; if (BEYOND[p.id]) p.beyond = BEYOND[p.id]; });
if (PA.tsql) PA.tsql.color = '#A61E4D';

/* Sözlük ekleri */
const G = window.SQLP_GLOSSARY || [];
G.push(['DAU / MAU', 'Günlük / aylık tekil aktif kullanıcı sayısı. Oranları “yapışkanlık” olarak izlenir.'], ['Churn', 'Müşteri kaybı. E-ticarette genellikle belirli bir süre alışveriş yapmama olarak tanımlanır.'], ['YTD', 'Year to date: yıl başından bugüne kümülatif değer.'], ['Keyset sayfalama', 'Önceki sayfanın son anahtarından devam eden, derin sayfalarda da hızlı sayfalama yöntemi.'], ['N+1 sorunu', 'Bir liste için 1 sorgu, her eleman için 1 sorgu daha atılması; JOIN ile tek sorguya indirilir.'], ['RPO / RTO', 'Kabul edilebilir en fazla veri kaybı / en uzun kesinti süresi. Yedekleme stratejisini belirler.'], ['Recovery model', 'SQL Server\'da işlem günlüğünün nasıl tutulacağını ve hangi geri yüklemelerin mümkün olacağını belirleyen ayar (SIMPLE, FULL, BULK_LOGGED).'], ['Cursor (imleç)', 'Sorgu sonucunu satır satır dolaşmayı sağlayan yapı. Küme tabanlı çözümlerden yavaştır.'], ['SEQUENCE', 'Tablodan bağımsız, sıralı sayı üreten veritabanı nesnesi.'], ['SARGable', 'İndeks aramasından yararlanabilen koşul; sütun bir fonksiyonun içine alınmamıştır.'], ['Regex', 'Düzenli ifade: metin desenlerini tanımlayan dil (^, $, [0-9], +, * …).'], ['dbt', 'Veri ambarındaki dönüşümleri SELECT sorgularıyla yazmayı, test etmeyi ve belgelemeyi sağlayan araç.'], ['Sepet analizi', 'Aynı siparişte birlikte satın alınan ürünleri bulan analiz; destek, güven ve kaldıraç ölçülerini kullanır.'], ['Login / User', 'SQL Server\'da sunucuya bağlanma kimliği (login) ve onun bir veritabanındaki karşılığı (user).']);
})();
