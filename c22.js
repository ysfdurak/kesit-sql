/* Kesit SQL içerik 22: Sertifika sınavları için ayrı hazırlık
   - Uygulama laboratuvarları: Oracle 1Z0-071, T-SQL / DP-300, Google / BigQuery (yalnızca o SQL türünün yazımıyla)
   - SQL türüne özgü pratik konuları (ora / tsq / bqk) ve bunlardan beslenen süreli kodlama sınavları
   - Çoktan seçmeli deneme bankalarının genişletilmesi
   - Sertifika ailelerine göre ayrı öğrenme yolları */
(function () {
const L = window.SQLP_LESSONS, E = window.SQLP_EXAMS, PR = window.SQLP_PRACTICE;
const PA = {}; (window.SQLP_PATHS || []).forEach(p => PA[p.id] = p);
const SRT = 'Sertifika Hazırlık';
const C = (src, base) => window.CODE(src, null, { base });
const mk = base => (q, sol, o) => Object.assign({ t: 'sql', base, dl: [base], q: '<p>' + q + '</p>', sol }, o || {});
const oq = mk('oracle'), tq = mk('tsql'), bq = mk('bq');
const mc = (q, o, a, why) => ({ t: 'mc', q, o, a, why });
const SINAV = `<div class="note"><b>Sınav bilgisi</b>Soru sayısı, süre, geçme notu ve kayıt koşulları zaman zaman değişir. Kayıt olmadan önce sınav sağlayıcısının sayfasındaki güncel konu listesini ve bilgileri kontrol et. Buradaki denemeler resmi soruların kopyası değildir; aynı konu alanlarını ölçer.</div>`;

/* ============================ LAB: ORACLE 1Z0-071 ============================ */
const labZ071 = {
  id: 'lab-z071', lv: 'C1', mod: SRT, min: 30,
  title: '1Z0-071 laboratuvarı: Oracle yazımıyla uygulama',
  sum: 'Oracle sınavında en çok puan kaybettiren konuları Oracle sözdizimiyle çalıştırarak pekiştir: NVL ailesi, dönüşümler, ROWNUM, FETCH, küme işlemleri ve ANY/ALL.',
  body: `
<p>1Z0-071 sınavı soruları çoğunlukla <b>“bu ifade ne döndürür?”</b> ya da <b>“hangisi hata verir?”</b> biçimindedir. Bu yüzden konuyu okumak yetmez; ifadeleri çalıştırıp sonucu görmek gerekir. Bu laboratuvardaki tüm kutular ve alıştırmalar <b>Oracle</b> yazımıyla çalışır.</p>
${SINAV}
<h2>1. NULL fonksiyonları ve tip uyumu</h2>
<p>NVL'nin iki bağımsız değişkeni aynı tipte olmalıdır. Sayı sütununa metin yedeği vermek için önce TO_CHAR ile çevir.</p>
${C("SELECT first_name,\n       NVL(TO_CHAR(dept_id), 'Atanmadı') AS departman,\n       NVL2(manager_id, 'Yöneticisi var', 'En üst') AS konum,\n       NULLIF(title, 'Genel Müdür') AS unvan\nFROM employees\nWHERE ROWNUM <= 5;", 'oracle')}
<table><tr><th>Fonksiyon</th><th>Ne yapar?</th><th>Tuzak</th></tr>
<tr><td>NVL(a, b)</td><td>a NULL ise b</td><td>a ve b aynı tipte olmalı</td></tr>
<tr><td>NVL2(a, b, c)</td><td>a dolu ise b, NULL ise c</td><td>Sıra: <i>dolu</i> önce gelir</td></tr>
<tr><td>NULLIF(a, b)</td><td>a = b ise NULL, değilse a</td><td>İlk değişken NULL sabiti olamaz</td></tr>
<tr><td>COALESCE(a, b, …)</td><td>İlk NULL olmayan</td><td>Tüm değerler uyumlu tipte olmalı</td></tr>
<tr><td>DECODE(x, a, r1, …, varsayılan)</td><td>Eşitliğe göre seçim</td><td>DECODE, NULL = NULL eşleşmesini <b>doğru</b> sayar</td></tr>
</table>
<h2>2. ROWNUM ve FETCH</h2>
<p>ROWNUM, satıra <b>ORDER BY'dan önce</b> verilir. “En yüksek 3 maaş” için önce alt sorguda sırala, dışta ROWNUM uygula. 12c ve sonrasında FETCH FIRST daha açıktır.</p>
${C("-- Yanlış: rastgele 3 satırı alır, sonra sıralar\nSELECT first_name, salary FROM employees WHERE ROWNUM <= 3 ORDER BY salary DESC;", 'oracle')}
${C("-- Doğru (klasik)\nSELECT * FROM (SELECT first_name, salary FROM employees ORDER BY salary DESC)\nWHERE ROWNUM <= 3;", 'oracle')}
${C("-- Doğru (12c+): 4.–6. sıradakiler\nSELECT name, price FROM products\nORDER BY price DESC, product_id\nOFFSET 3 ROWS FETCH NEXT 3 ROWS ONLY;", 'oracle')}
<div class="tip"><b>Sınav tuzağı</b><code>WHERE ROWNUM = 2</code> hiçbir satır döndürmez: ilk satır 1 numarayı alamadığı için elenir, sonraki satır yine 1 olur ve o da elenir.</div>
<h2>3. Dönüşüm ve tarih fonksiyonları</h2>
${C("SELECT TO_CHAR(DATE '2024-03-05', 'YYYY-MM') AS ay,\n       ADD_MONTHS(DATE '2024-01-31', 1) AS bir_ay_sonra,\n       LAST_DAY(DATE '2024-02-10') AS ay_sonu,\n       MONTHS_BETWEEN(DATE '2024-03-31', DATE '2024-01-31') AS ay_farki,\n       TRUNC(DATE '2024-05-17', 'MM') AS ay_basi\nFROM dual;", 'oracle')}
<h2>4. Küme işlemleri, ANY ve ALL</h2>
${C("SELECT customer_id FROM customers\nMINUS\nSELECT customer_id FROM orders;", 'oracle')}
<p><code>&gt; ALL (alt sorgu)</code> en büyükten büyük, <code>&gt; ANY</code> en küçükten büyük demektir. Alt sorgu boşsa <code>ALL</code> her satır için doğru, <code>ANY</code> her satır için yanlıştır.</p>
${C("SELECT first_name, salary FROM employees\nWHERE salary > ALL (SELECT salary FROM employees WHERE dept_id = 2)\n  AND (dept_id <> 2 OR dept_id IS NULL);", 'oracle')}
<h2>5. LISTAGG ve hiyerarşi</h2>
${C("SELECT dept_id, LISTAGG(first_name, ', ') WITHIN GROUP (ORDER BY first_name) AS calisanlar\nFROM employees\nWHERE dept_id IS NOT NULL\nGROUP BY dept_id\nORDER BY dept_id;", 'oracle')}
<div class="note"><b>Sonraki adım</b>Bu laboratuvarı bitirince <b>Sınavlar</b> sayfasındaki <b>1Z0-071 Kodlama Laboratuvarı</b> ile süre altında Oracle yazımıyla görev çöz, ardından çoktan seçmeli denemeyi dene.</div>
`,
  ex: [
    oq('Çalışanların adını ve departman numarasını getir; departmanı olmayanlar için <b>Atanmadı</b> yazsın (NVL ve TO_CHAR): <code>first_name</code>, <code>departman</code>.',
      "SELECT first_name, NVL(TO_CHAR(dept_id), 'Atanmadı') AS departman FROM employees;"),
    oq('ROWNUM ile en yüksek maaşlı 3 çalışanı getir (önce alt sorguda sırala): <code>first_name</code>, <code>salary</code>. Maaşa göre azalan sırada.',
      'SELECT * FROM (SELECT first_name, salary FROM employees ORDER BY salary DESC, emp_id) WHERE ROWNUM <= 3;', { ord: true }),
    oq('DECODE ile tek satırda sipariş durumu dağılımı: <code>teslim</code>, <code>iptal</code>, <code>iade</code>, <code>diger</code>.',
      "SELECT SUM(DECODE(status, 'delivered', 1, 0)) AS teslim, SUM(DECODE(status, 'cancelled', 1, 0)) AS iptal, SUM(DECODE(status, 'returned', 1, 0)) AS iade, SUM(DECODE(status, 'delivered', 0, 'cancelled', 0, 'returned', 0, 1)) AS diger FROM orders;"),
    oq('LISTAGG ile her departmanın çalışan adlarını alfabetik ve virgülle ayrılmış getir (departmanı olmayanlar hariç): <code>dept_id</code>, <code>calisanlar</code>. Departmana göre sırala.',
      "SELECT dept_id, LISTAGG(first_name, ', ') WITHIN GROUP (ORDER BY first_name) AS calisanlar FROM employees WHERE dept_id IS NOT NULL GROUP BY dept_id ORDER BY dept_id;", { ord: true }),
    oq('MINUS ile hiç sipariş vermemiş müşterilerin numaralarını getir: <code>customer_id</code>.',
      'SELECT customer_id FROM customers MINUS SELECT customer_id FROM orders;'),
    oq('1 Ocak 2025 itibarıyla kıdemi <b>8 yıl ve üzeri</b> olan çalışanlar (MONTHS_BETWEEN / 12, 1 basamak): <code>first_name</code>, <code>kidem</code>. Kıdeme göre azalan, eşitlikte ada göre sırala.',
      "SELECT first_name, ROUND(MONTHS_BETWEEN(DATE '2025-01-01', hire_date) / 12, 1) AS kidem FROM employees WHERE MONTHS_BETWEEN(DATE '2025-01-01', hire_date) >= 96 ORDER BY kidem DESC, first_name;", { ord: true }),
    oq('Fiyata göre azalan sıralamada <b>4., 5. ve 6.</b> ürünleri OFFSET ve FETCH ile getir (eşit fiyatta küçük product_id önce): <code>name</code>, <code>price</code>.',
      'SELECT name, price FROM products ORDER BY price DESC, product_id OFFSET 3 ROWS FETCH NEXT 3 ROWS ONLY;', { ord: true }),
    oq('Maaşı 2 numaralı departmandaki <b>herkesten</b> yüksek olan, o departman dışındaki çalışanlar (ALL): <code>first_name</code>, <code>salary</code>. Maaşa göre azalan sırala.',
      'SELECT first_name, salary FROM employees WHERE salary > ALL (SELECT salary FROM employees WHERE dept_id = 2) AND (dept_id <> 2 OR dept_id IS NULL) ORDER BY salary DESC;', { ord: true }),
    oq('2024 yılı için ay numarası (TO_CHAR ile iki haneli) ve o ayın sipariş sayısı; tarih filtresinde DATE sabiti kullan: <code>ay</code>, <code>siparis</code>. Aya göre sırala.',
      "SELECT TO_CHAR(order_date, 'MM') AS ay, COUNT(*) AS siparis FROM orders WHERE order_date >= DATE '2024-01-01' AND order_date < DATE '2025-01-01' GROUP BY TO_CHAR(order_date, 'MM') ORDER BY ay;", { ord: true }),
    mc('<p><code>SELECT first_name FROM employees WHERE ROWNUM = 2;</code> ne döndürür?</p>', ['Tablodaki ikinci satırı döndürür', 'Hiçbir satır döndürmez', 'Hata verir; ROWNUM yalnızca < ve <= ile kullanılır', 'İlk iki satırı rastgele sırayla döndürür'], 1,
      'ROWNUM, WHERE koşulunu geçen satırlara sırayla verilir. İlk aday satır 1 numarayı alır ve “= 2” koşulunu geçemez; sonraki satır yine 1 olur. Böylece hiçbir satır 2 numaraya ulaşamaz.')
  ]
};

/* ============================ LAB: T-SQL / DP-300 ============================ */
const labTsql = {
  id: 'lab-tsql', lv: 'C1', mod: SRT, min: 30,
  title: 'T-SQL laboratuvarı: SQL Server yazımıyla uygulama',
  sum: 'Microsoft sınavlarında ve SQL Server işlerinde sık çıkan T-SQL yapıları: TOP WITH TIES, APPLY, IIF, EOMONTH, STRING_AGG, OFFSET/FETCH ve ROLLUP.',
  body: `
<p>Microsoft'un veri sınavları (DP-300 yönetim ağırlıklıdır, ama sorgu soruları da içerir) ve SQL Server mülakatları T-SQL'e özgü yapıları sorar. Bu laboratuvardaki her şey <b>SQL Server (T-SQL)</b> yazımıyla çalışır.</p>
${SINAV}
<h2>1. TOP, WITH TIES ve sayfalama</h2>
${C("SELECT TOP (3) WITH TIES name, price\nFROM products\nORDER BY price DESC;", 'tsql')}
${C("-- 3. sayfa, sayfa başına 5 ürün\nSELECT name, price\nFROM products\nORDER BY name\nOFFSET 10 ROWS FETCH NEXT 5 ROWS ONLY;", 'tsql')}
<h2>2. CROSS APPLY ve OUTER APPLY</h2>
<p>APPLY, sol tablonun her satırı için sağdaki sorguyu çalıştırır. “Her müşterinin son 2 siparişi” gibi grup başına ilk N sorularının en doğal T-SQL çözümüdür. OUTER APPLY, sağ taraf boş dönse de sol satırı korur (LEFT JOIN gibi).</p>
${C("SELECT c.customer_id, s.order_id, s.order_date\nFROM customers c\nCROSS APPLY (SELECT TOP (2) o.order_id, o.order_date\n             FROM orders o\n             WHERE o.customer_id = c.customer_id\n             ORDER BY o.order_date DESC, o.order_id DESC) s\nWHERE c.customer_id <= 3;", 'tsql')}
<h2>3. Koşul, tarih ve metin fonksiyonları</h2>
${C("SELECT IIF(price > 1000, 'Pahalı', 'Uygun') AS grup, COUNT(*) AS urun\nFROM products\nGROUP BY IIF(price > 1000, 'Pahalı', 'Uygun');", 'tsql')}
${C("SELECT EOMONTH('2024-02-10') AS ay_sonu,\n       DATEADD(month, 1, '2024-01-31') AS bir_ay_sonra,\n       DATEDIFF(day, '2024-01-01', '2024-03-01') AS gun,\n       DATEFROMPARTS(2024, 5, 1) AS tarih,\n       TRY_CAST('abc' AS INT) AS hatali_sayi;", 'tsql')}
<table><tr><th>Yapı</th><th>Not</th></tr>
<tr><td><code>DATEDIFF(year, '2024-12-31', '2025-01-01')</code></td><td>1 döner: yıl <b>sınırı</b> sayılır, geçen süre değil</td></tr>
<tr><td><code>'A' + NULL</code></td><td>NULL; <code>CONCAT('A', NULL)</code> ise 'A'</td></tr>
<tr><td><code>7 / 2</code></td><td>3 (tam sayı bölmesi); <code>7 / 2.0</code> = 3.5</td></tr>
<tr><td><code>ISNULL(a, b)</code></td><td>İki değişken alır; sonuç tipi ilk değişkenin tipidir</td></tr>
</table>
<h2>4. Ara toplamlar ve metin birleştirme</h2>
${C("SELECT IIF(GROUPING(category) = 1, 'TOPLAM', category) AS kategori, SUM(stock) AS stok\nFROM products\nGROUP BY ROLLUP(category);", 'tsql')}
${C("SELECT category, STRING_AGG(name, ', ') WITHIN GROUP (ORDER BY name) AS urunler\nFROM products\nGROUP BY category;", 'tsql')}
<div class="note"><b>Sonraki adım</b>Sınavlar sayfasındaki <b>T-SQL Kodlama Laboratuvarı</b> süre altında T-SQL görevleri verir. Yönetim konuları (yedekleme, yüksek erişilebilirlik, izleme) için DP-300 çoktan seçmeli denemesini kullan.</div>
`,
  ex: [
    tq('TOP ve WITH TIES ile en pahalı 3 ürünü getir; 3. sıradaki fiyata eşit ürünler de dahil olsun: <code>name</code>, <code>price</code>.',
      'SELECT TOP (3) WITH TIES name, price FROM products ORDER BY price DESC;'),
    tq('CROSS APPLY ile 1–5 numaralı müşterilerin <b>son 2</b> siparişini getir (aynı tarihte büyük order_id önce): <code>customer_id</code>, <code>order_id</code>, <code>order_date</code>. Müşteriye, sonra tarihe göre azalan sırala.',
      'SELECT c.customer_id, s.order_id, s.order_date FROM customers c CROSS APPLY (SELECT TOP (2) o.order_id, o.order_date FROM orders o WHERE o.customer_id = c.customer_id ORDER BY o.order_date DESC, o.order_id DESC) s WHERE c.customer_id <= 5 ORDER BY c.customer_id, s.order_date DESC, s.order_id DESC;', { ord: true }),
    tq('OUTER APPLY ile her departmanın <b>en son işe alınan</b> çalışanını getir; çalışanı olmayan departman da NULL ile görünsün: <code>name</code>, <code>first_name</code>, <code>hire_date</code>. Departman adına göre sırala.',
      'SELECT d.name, s.first_name, s.hire_date FROM departments d OUTER APPLY (SELECT TOP (1) e.first_name, e.hire_date FROM employees e WHERE e.dept_id = d.dept_id ORDER BY e.hire_date DESC, e.emp_id) s ORDER BY d.name;', { ord: true }),
    tq('IIF ile ürünleri fiyatı 1000 TL üzerindeyse <b>Pahalı</b>, değilse <b>Uygun</b> diye grupla ve say: <code>grup</code>, <code>urun</code>.',
      "SELECT IIF(price > 1000, 'Pahalı', 'Uygun') AS grup, COUNT(*) AS urun FROM products GROUP BY IIF(price > 1000, 'Pahalı', 'Uygun');"),
    tq('EOMONTH ile 2024 siparişlerini ay sonu tarihine göre grupla: <code>ay_sonu</code>, <code>siparis</code>. Tarihe göre sırala.',
      "SELECT EOMONTH(order_date) AS ay_sonu, COUNT(*) AS siparis FROM orders WHERE order_date >= '2024-01-01' AND order_date < '2025-01-01' GROUP BY EOMONTH(order_date) ORDER BY ay_sonu;", { ord: true }),
    tq('Ürünleri ada göre sıralayıp sayfa başına 5 ürünle <b>3. sayfayı</b> getir (OFFSET / FETCH): <code>name</code>, <code>price</code>.',
      'SELECT name, price FROM products ORDER BY name OFFSET 10 ROWS FETCH NEXT 5 ROWS ONLY;', { ord: true }),
    tq('ROLLUP ve GROUPING ile kategori bazında toplam stok ve en altta <b>TOPLAM</b> satırı: <code>kategori</code>, <code>stok</code>.',
      "SELECT IIF(GROUPING(category) = 1, 'TOPLAM', category) AS kategori, SUM(stock) AS stok FROM products GROUP BY ROLLUP(category);"),
    tq('STRING_AGG ile her kategorideki ürün adlarını alfabetik birleştir: <code>category</code>, <code>urunler</code>.',
      "SELECT category, STRING_AGG(name, ', ') WITHIN GROUP (ORDER BY name) AS urunler FROM products GROUP BY category;"),
    mc('<p><code>SELECT DATEDIFF(year, \'2024-12-31\', \'2025-01-01\');</code> sonucu nedir?</p>', ['0, çünkü arada yalnızca bir gün var', '1, çünkü bir yıl sınırı geçiliyor', '-1, çünkü tarihlerin sırası ters', 'NULL, çünkü tam bir yıl dolmamış'], 1,
      'DATEDIFF, istenen birimde kaç sınırın geçildiğini sayar. 31 Aralık ile 1 Ocak arasında bir yıl sınırı vardır; sonuç 1\'dir.')
  ]
};

/* ============================ LAB: GOOGLE / BIGQUERY ============================ */
const labGda = {
  id: 'lab-gda', lv: 'B2', mod: SRT, min: 25,
  title: 'BigQuery laboratuvarı: Google veri analitiği yazımıyla uygulama',
  sum: 'Google Data Analytics ve BigQuery tabanlı işlerde sık kullanılan yapılar: QUALIFY, COUNTIF, SAFE_DIVIDE, DATE_TRUNC, EXCEPT DISTINCT, SELECT * EXCEPT ve takvim üretme.',
  body: `
<p>Google'ın veri analitiği programı ve bulut veri sertifikaları SQL'i BigQuery üzerinde öğretir. Bu laboratuvardaki her şey <b>BigQuery</b> yazımıyla çalışır.</p>
${SINAV}
<h2>1. Pencere sonucuna göre filtre: QUALIFY</h2>
${C("SELECT category, name, price\nFROM products\nWHERE TRUE\nQUALIFY ROW_NUMBER() OVER (PARTITION BY category ORDER BY price DESC) = 1;", 'bq')}
<h2>2. Koşullu sayım ve güvenli bölme</h2>
${C("SELECT device,\n       COUNT(DISTINCT user_id) AS kullanici,\n       COUNTIF(event_type = 'purchase') AS satin_alma,\n       ROUND(SAFE_DIVIDE(COUNTIF(event_type = 'purchase'), COUNT(*)) * 100, 2) AS olay_orani\nFROM web_events\nGROUP BY device;", 'bq')}
<h2>3. Tarihler</h2>
${C("SELECT DATE_TRUNC(DATE '2024-05-17', MONTH) AS ay_basi,\n       DATE_DIFF(DATE '2024-12-31', DATE '2024-12-01', DAY) AS gun,\n       FORMAT_DATE('%Y-%m', DATE '2024-05-17') AS ay,\n       EXTRACT(DAYOFWEEK FROM DATE '2024-05-19') AS haftanin_gunu,\n       LAST_DAY(DATE '2024-02-10') AS ay_sonu;", 'bq')}
<p><code>DAYOFWEEK</code> pazar için 1, cumartesi için 7 döndürür.</p>
<h2>4. Takvim üretme: GENERATE_DATE_ARRAY</h2>
<p>Boş günleri de göstermek için önce tarih dizisi üret, UNNEST ile satırlara aç, sonra LEFT JOIN yap.</p>
${C("SELECT gun, COUNT(o.order_id) AS siparis\nFROM UNNEST(GENERATE_DATE_ARRAY(DATE '2024-12-01', DATE '2024-12-07')) AS gun\nLEFT JOIN orders o ON o.order_date = gun\nGROUP BY gun\nORDER BY gun;", 'bq')}
<h2>5. Kısayollar</h2>
${C("SELECT * EXCEPT (email) FROM customers ORDER BY customer_id LIMIT 3;", 'bq')}
${C("SELECT customer_id FROM customers\nEXCEPT DISTINCT\nSELECT customer_id FROM orders;", 'bq')}
<div class="tip"><b>Maliyet hatırlatması</b>İsteğe bağlı fiyatlandırmada taranan bayt ücretlendirilir. <code>SELECT *</code> yerine gereken sütunları seçmek ve bölüm sütununa filtre koymak taramayı azaltır; <code>LIMIT</code> ise kümelenmemiş tabloda taramayı azaltmaz.</div>
`,
  ex: [
    bq('QUALIFY ile her kategorinin <b>en pahalı</b> ürününü getir (eşitlikte küçük product_id): <code>category</code>, <code>name</code>, <code>price</code>. Kategoriye göre sırala.',
      'SELECT category, name, price FROM products WHERE TRUE QUALIFY ROW_NUMBER() OVER (PARTITION BY category ORDER BY price DESC, product_id) = 1 ORDER BY category;', { ord: true }),
    bq('COUNTIF ile her cihaz için ziyaret, sepete ekleme ve satın alma <b>olay</b> sayılarını tek satırda getir: <code>device</code>, <code>ziyaret</code>, <code>sepet</code>, <code>satin_alma</code>.',
      "SELECT device, COUNTIF(event_type = 'visit') AS ziyaret, COUNTIF(event_type = 'add_to_cart') AS sepet, COUNTIF(event_type = 'purchase') AS satin_alma FROM web_events GROUP BY device;"),
    bq('SAFE_DIVIDE ile her ürün kategorisinin ortalama <b>kâr marjını</b> (yüzde, 1 basamak; (fiyat − maliyet) / fiyat): <code>category</code>, <code>marj</code>. Marja göre azalan sırala.',
      'SELECT category, ROUND(AVG(SAFE_DIVIDE(price - cost, price)) * 100, 1) AS marj FROM products GROUP BY category ORDER BY marj DESC;', { ord: true }),
    bq('DATE_TRUNC ile 2024\'ün her ayının teslim edilen sipariş sayısı: <code>ay</code> (ayın ilk günü), <code>siparis</code>. Aya göre sırala.',
      "SELECT DATE_TRUNC(order_date, MONTH) AS ay, COUNT(*) AS siparis FROM orders WHERE status = 'delivered' AND order_date >= DATE '2024-01-01' AND order_date < DATE '2025-01-01' GROUP BY ay ORDER BY ay;", { ord: true }),
    bq('EXCEPT DISTINCT ile hiç sipariş vermemiş müşterilerin numaraları: <code>customer_id</code>.',
      'SELECT customer_id FROM customers EXCEPT DISTINCT SELECT customer_id FROM orders;'),
    bq('GENERATE_DATE_ARRAY ile Aralık 2024\'ün <b>her günü</b> için sipariş sayısı (siparişsiz günler 0): <code>gun</code>, <code>siparis</code>. Güne göre sırala.',
      "SELECT gun, COUNT(o.order_id) AS siparis FROM UNNEST(GENERATE_DATE_ARRAY(DATE '2024-12-01', DATE '2024-12-31')) AS gun LEFT JOIN orders o ON o.order_date = gun GROUP BY gun ORDER BY gun;", { ord: true }),
    bq('DATE_DIFF ile her segmentte müşterilerin kayıt tarihinden <b>ilk siparişine</b> kadar geçen ortalama gün (1 basamak; siparişi olmayanlar hariç): <code>segment</code>, <code>ort_gun</code>. Segmente göre sırala.',
      'WITH ilk AS (SELECT customer_id, MIN(order_date) AS ilk_siparis FROM orders GROUP BY customer_id) SELECT c.segment, ROUND(AVG(DATE_DIFF(i.ilk_siparis, c.signup_date, DAY)), 1) AS ort_gun FROM customers c JOIN ilk i ON i.customer_id = c.customer_id GROUP BY c.segment ORDER BY c.segment;', { ord: true }),
    bq('SELECT * EXCEPT ile müşteri tablosunu e-posta sütunu <b>olmadan</b> getir; ilk 5 müşteri (numaraya göre).',
      'SELECT * EXCEPT (email) FROM customers ORDER BY customer_id LIMIT 5;', { ord: true }),
    mc('<p>BigQuery\'de <code>EXTRACT(DAYOFWEEK FROM DATE \'2024-05-19\')</code> (bir pazar günü) ne döndürür?</p>', ['1, çünkü hafta pazar günü başlar', '7, çünkü pazar haftanın son günüdür', '0, çünkü numaralama sıfırdan başlar', '6, çünkü pazartesi 0 kabul edilir'], 0,
      'BigQuery\'de DAYOFWEEK pazar = 1 … cumartesi = 7 aralığında değer verir. Pazartesi başlangıçlı hafta için ISOWEEK ya da FORMAT_DATE(\'%u\') kullanılır.')
  ]
};

const labs = [labZ071, labTsql, labGda];
const at = L.findIndex(l => l.id === 'cert-tsql');
L.splice(at < 0 ? L.length : at + 1, 0, ...labs);

/* ============================ PRATİK: SQL türüne özgü görevler ============================ */
const T = window.SQLP_PRACTICE_TOPICS = window.SQLP_PRACTICE_TOPICS || {};
T.ora = 'Oracle yazımı'; T.tsq = 'T-SQL yazımı'; T.bqk = 'BigQuery yazımı';
const add = (t, base) => (id, Lv, d, title, q, sol, o) => PR.push(Object.assign({ id, L: Lv, t, d, title, q: '<p>' + q + '</p>', sol, type: 'sql', base, dl: [base] }, o || {}));
const ora = add('ora', 'oracle'), tsq = add('tsq', 'tsql'), bqk = add('bqk', 'bq');
const O = { ord: true };

/* Oracle */
ora('ora01', 'orta', 1, 'Departmansız çalışan', 'NVL ve TO_CHAR ile çalışanların adı ve departman numarası; departmanı yoksa <b>Yok</b>: <code>first_name</code>, <code>dept</code>. Ada göre sırala.', "SELECT first_name, NVL(TO_CHAR(dept_id), 'Yok') AS dept FROM employees ORDER BY first_name;", O);
ora('ora02', 'orta', 2, 'Saatlik kalkış', 'TO_CHAR(..., \'HH24\') ile Kanat Havayolları uçuşlarının planlanan kalkış saatine göre sayısı: <code>saat</code>, <code>ucus</code>. Saate göre sırala.', "SELECT TO_CHAR(sched_dep, 'HH24') AS saat, COUNT(*) AS ucus FROM hv_flights GROUP BY TO_CHAR(sched_dep, 'HH24') ORDER BY saat;", O);
ora('ora03', 'orta', 2, 'Ücret sınıfı pivotu', 'DECODE ile tek satırda ücret sınıfına göre rezervasyon sayıları: <code>eko</code>, <code>ekoflex</code>, <code>business</code>.', "SELECT SUM(DECODE(fare_class, 'Eko', 1, 0)) AS eko, SUM(DECODE(fare_class, 'EkoFlex', 1, 0)) AS ekoflex, SUM(DECODE(fare_class, 'Business', 1, 0)) AS business FROM hv_bookings;");
ora('ora04', 'orta', 2, 'ROWNUM ile ilk 5', 'ROWNUM ile risk puanı en yüksek 5 banka müşterisi (eşitlikte küçük numara önce): <code>customer_id</code>, <code>risk_score</code>.', 'SELECT * FROM (SELECT customer_id, risk_score FROM bank_customers ORDER BY risk_score DESC, customer_id) WHERE ROWNUM <= 5;', O);
ora('ora05', 'orta', 2, 'Ülkeye göre havalimanları', 'LISTAGG ile her ülkenin havalimanı kodlarını alfabetik birleştir: <code>country</code>, <code>kodlar</code>. Ülkeye göre sırala.', "SELECT country, LISTAGG(airport_code, ', ') WITHIN GROUP (ORDER BY airport_code) AS kodlar FROM hv_airports GROUP BY country ORDER BY country;", O);
ora('ora06', 'ileri', 2, 'İki sınıfta da uçanlar', 'INTERSECT ile hem <b>Eko</b> hem <b>Business</b> sınıfında gerçekleşmiş uçuşu olan üye sayısı: <code>uye</code>.', "SELECT COUNT(*) AS uye FROM (SELECT passenger_id FROM hv_bookings WHERE fare_class = 'Eko' AND status = 'flown' INTERSECT SELECT passenger_id FROM hv_bookings WHERE fare_class = 'Business' AND status = 'flown') t;");
ora('ora07', 'ileri', 3, 'Ay üreteci', 'CONNECT BY LEVEL ile 1–12 ay numaralarını üret ve 2024\'te her ay açılan banka hesabı sayısını getir (yoksa 0): <code>ay</code>, <code>hesap</code>. Aya göre sırala.', "SELECT g.ay, COUNT(a.account_id) AS hesap FROM (SELECT LEVEL AS ay FROM dual CONNECT BY LEVEL <= 12) g LEFT JOIN bank_accounts a ON EXTRACT(MONTH FROM a.opened_date) = g.ay AND EXTRACT(YEAR FROM a.opened_date) = 2024 GROUP BY g.ay ORDER BY g.ay;", O);
ora('ora08', 'ileri', 2, 'Üyelik süresi', 'MONTHS_BETWEEN ile 1 Ocak 2025 itibarıyla seviyeye göre ortalama üyelik süresi (yıl, 1 basamak): <code>tier</code>, <code>ort_yil</code>. Seviyeye göre sırala.', "SELECT tier, ROUND(AVG(MONTHS_BETWEEN(DATE '2025-01-01', joined_date)) / 12, 1) AS ort_yil FROM hv_passengers GROUP BY tier ORDER BY tier;", O);
ora('ora09', 'ileri', 3, 'Hiyerarşi düzeyleri', 'START WITH / CONNECT BY ile organizasyon şemasında her düzeyde kaç çalışan olduğunu getir: <code>duzey</code>, <code>calisan</code>. Düzeye göre sırala.', 'SELECT duzey, COUNT(*) AS calisan FROM (SELECT LEVEL AS duzey FROM employees START WITH manager_id IS NULL CONNECT BY PRIOR emp_id = manager_id) t GROUP BY duzey ORDER BY duzey;', O);
ora('ora10', 'orta', 2, 'Uzun rotalar sayfası', 'Mesafeye göre azalan sıralamada 6.–10. rotalar (OFFSET / FETCH; eşitlikte route_id): <code>route_id</code>, <code>origin</code>, <code>dest</code>, <code>distance_km</code>.', 'SELECT route_id, origin, dest, distance_km FROM hv_routes ORDER BY distance_km DESC, route_id OFFSET 5 ROWS FETCH NEXT 5 ROWS ONLY;', O);
ora('ora11', 'ileri', 2, 'Ay sonu hesapları', 'LAST_DAY ve TRUNC ile 2024\'te açılan hesapların, açıldığı ayın son gününe göre sayısı; yalnızca ilk 3 ay: <code>ay_sonu</code>, <code>hesap</code>. Tarihe göre sırala.', "SELECT LAST_DAY(opened_date) AS ay_sonu, COUNT(*) AS hesap FROM bank_accounts WHERE opened_date >= DATE '2024-01-01' AND opened_date < DATE '2024-04-01' GROUP BY LAST_DAY(opened_date) ORDER BY ay_sonu;", O);
ora('ora12', 'orta', 1, 'NVL2 ile durum', 'NVL2 ile banka hesaplarını kapanış tarihi doluysa <b>Kapalı</b>, boşsa <b>Açık</b> diye grupla ve say: <code>durum</code>, <code>hesap</code>.', "SELECT NVL2(closed_date, 'Kapalı', 'Açık') AS durum, COUNT(*) AS hesap FROM bank_accounts GROUP BY NVL2(closed_date, 'Kapalı', 'Açık');");

/* T-SQL */
tsq('tsq01', 'orta', 1, 'Eşitler dahil ilk 5', 'TOP WITH TIES ile en çok yolcu taşıyan 5 uçuş (eşitler dahil): <code>flight_id</code>, <code>pax</code>.', 'SELECT TOP (5) WITH TIES flight_id, pax FROM hv_flights ORDER BY pax DESC;');
tsq('tsq02', 'ileri', 2, 'Hesap başına son işlem', 'CROSS APPLY ile 100001–100005 numaralı hesapların <b>en son</b> işlemini getir: <code>account_id</code>, <code>txn_time</code>, <code>amount</code>. Hesaba göre sırala.', 'SELECT a.account_id, s.txn_time, s.amount FROM bank_accounts a CROSS APPLY (SELECT TOP (1) t.txn_time, t.amount FROM bank_txns t WHERE t.account_id = a.account_id ORDER BY t.txn_time DESC, t.txn_id DESC) s WHERE a.account_id BETWEEN 100001 AND 100005 ORDER BY a.account_id;', O);
tsq('tsq03', 'ileri', 2, 'Uçuşu olmayan rota', 'OUTER APPLY ile her rotanın en kalabalık uçuşunun yolcu sayısı; uçuşu olmayan rota da NULL ile görünsün. Yalnızca İzmir (ADB) çıkışlı rotalar: <code>route_id</code>, <code>dest</code>, <code>en_cok</code>. Rotaya göre sırala.', "SELECT r.route_id, r.dest, s.pax AS en_cok FROM hv_routes r OUTER APPLY (SELECT TOP (1) f.pax FROM hv_flights f WHERE f.route_id = r.route_id ORDER BY f.pax DESC) s WHERE r.origin = 'ADB' ORDER BY r.route_id;", O);
tsq('tsq04', 'orta', 1, 'IIF ile risk', 'IIF ile banka müşterilerini risk puanı 7 ve üzeriyse <b>Yüksek</b>, değilse <b>Normal</b> diye grupla: <code>risk</code>, <code>musteri</code>.', "SELECT IIF(risk_score >= 7, 'Yüksek', 'Normal') AS risk, COUNT(*) AS musteri FROM bank_customers GROUP BY IIF(risk_score >= 7, 'Yüksek', 'Normal');");
tsq('tsq05', 'orta', 2, 'Ay sonuna göre uçuş', 'EOMONTH ile uçuşları ay sonu tarihine göre say (planlanan kalkışa göre): <code>ay_sonu</code>, <code>ucus</code>. Tarihe göre sırala.', 'SELECT EOMONTH(sched_dep) AS ay_sonu, COUNT(*) AS ucus FROM hv_flights GROUP BY EOMONTH(sched_dep) ORDER BY ay_sonu;', O);
tsq('tsq06', 'orta', 2, 'Şubeye göre müşteriler', 'STRING_AGG ile her şehirdeki banka şubelerinin adlarını alfabetik birleştir: <code>city</code>, <code>subeler</code>. Şehre göre sırala.', "SELECT city, STRING_AGG(name, ', ') WITHIN GROUP (ORDER BY name) AS subeler FROM bank_branches GROUP BY city ORDER BY city;", O);
tsq('tsq07', 'orta', 2, 'Sayfalama', 'Yolcuları ada göre sıralayıp sayfa başına 10 kişiyle <b>5. sayfayı</b> getir: <code>passenger_id</code>, <code>full_name</code>.', 'SELECT passenger_id, full_name FROM hv_passengers ORDER BY full_name, passenger_id OFFSET 40 ROWS FETCH NEXT 10 ROWS ONLY;', O);
tsq('tsq08', 'ileri', 2, 'Seviye ara toplamı', 'ROLLUP ve GROUPING ile üye seviyesine göre üye sayısı ve en altta <b>TOPLAM</b>: <code>seviye</code>, <code>uye</code>.', "SELECT IIF(GROUPING(tier) = 1, 'TOPLAM', tier) AS seviye, COUNT(*) AS uye FROM hv_passengers GROUP BY ROLLUP(tier);");
tsq('tsq09', 'ileri', 3, 'Dakika cinsinden gecikme', 'DATEDIFF(minute, ...) ile rota başına ortalama kalkış gecikmesi (iptaller hariç, 1 basamak); ortalaması en yüksek 5 rota: <code>route_id</code>, <code>ort_gecikme</code>. Ortalamaya göre azalan, eşitlikte rotaya göre sırala.', 'SELECT TOP (5) route_id, ROUND(AVG(CAST(DATEDIFF(minute, sched_dep, actual_dep) AS FLOAT)), 1) AS ort_gecikme FROM hv_flights WHERE actual_dep IS NOT NULL GROUP BY route_id ORDER BY ort_gecikme DESC, route_id;', O);
tsq('tsq10', 'ileri', 3, 'Karışık tarih biçimi', '<code>raw_signups</code> tablosunda kayıt tarihleri iki biçimde: YYYY-AA-GG ve GG.AA.YYYY. Noktalı olanları TRY_CONVERT(DATE, ..., 104), diğerlerini TRY_CAST ile tarihe çevirip kayıt ayına göre say: <code>ay</code>, <code>kayit</code>. Aya göre sırala.', "SELECT MONTH(t.tarih) AS ay, COUNT(*) AS kayit FROM (SELECT CASE WHEN signup_date LIKE '__.__.____' THEN TRY_CONVERT(DATE, signup_date, 104) ELSE TRY_CAST(signup_date AS DATE) END AS tarih FROM raw_signups) t GROUP BY MONTH(t.tarih) ORDER BY ay;", Object.assign({ hint: '104 biçim kodu Alman/Türk tarih yazımıdır (GG.AA.YYYY). Biçimi belirtmeden çevirmek dil ayarına bağlıdır ve 02.05.2024 gibi değerleri yanlış ayla okuyabilir.' }, O));
tsq('tsq11', 'ileri', 2, 'Yıl ve ay', 'YEAR ve MONTH fonksiyonlarıyla 2024 siparişlerinin ay başına sayısı ve ortalama günlük sipariş (ay uzunluğu DAY(EOMONTH(...)) ile, 2 basamak): <code>ay</code>, <code>siparis</code>, <code>gunluk</code>. Aya göre sırala.', 'SELECT MONTH(order_date) AS ay, COUNT(*) AS siparis, ROUND(1.0 * COUNT(*) / DAY(EOMONTH(MIN(order_date))), 2) AS gunluk FROM orders WHERE YEAR(order_date) = 2024 GROUP BY MONTH(order_date) ORDER BY ay;', O);
tsq('tsq12', 'ileri', 2, 'Tablo değişkeni', 'Bir tablo değişkenine fiyatı 5000 TL üzerindeki ürünlerin kimlik ve fiyatını ekle, sonra değişkenden ürün sayısını ve ortalama fiyatı (tam sayı) getir: <code>urun</code>, <code>ort</code>.', 'DECLARE @p TABLE (id INT, fiyat DECIMAL(10, 2)); INSERT INTO @p SELECT product_id, price FROM products WHERE price > 5000; SELECT COUNT(*) AS urun, ROUND(AVG(fiyat), 0) AS ort FROM @p;');

/* BigQuery */
bqk('bqk01', 'orta', 2, 'Rota başına en kalabalık', 'QUALIFY ile her rotanın en kalabalık uçuşu (eşitlikte küçük flight_id); yalnızca IST çıkışlı rotalar: <code>route_id</code>, <code>flight_id</code>, <code>pax</code>. Rotaya göre sırala.', "SELECT f.route_id, f.flight_id, f.pax FROM hv_flights f JOIN hv_routes r ON r.route_id = f.route_id WHERE r.origin = 'IST' QUALIFY ROW_NUMBER() OVER (PARTITION BY f.route_id ORDER BY f.pax DESC, f.flight_id) = 1 ORDER BY f.route_id;", O);
bqk('bqk02', 'orta', 1, 'Koşullu sayım', 'COUNTIF ile uçuş durumlarına göre tek satırda sayılar: <code>indi</code>, <code>iptal</code>, <code>yonlendi</code>.', "SELECT COUNTIF(status = 'landed') AS indi, COUNTIF(status = 'cancelled') AS iptal, COUNTIF(status = 'diverted') AS yonlendi FROM hv_flights;");
bqk('bqk03', 'orta', 2, 'Doluluk oranı', 'SAFE_DIVIDE ile uçak tipine göre ortalama doluluk oranı (yolcu / koltuk, yüzde, 1 basamak; iptaller hariç): <code>model</code>, <code>doluluk</code>. Doluluğa göre azalan sırala.', "SELECT a.model, ROUND(AVG(SAFE_DIVIDE(f.pax, a.seats)) * 100, 1) AS doluluk FROM hv_flights f JOIN hv_aircraft a ON a.tail_no = f.tail_no WHERE f.status <> 'cancelled' GROUP BY a.model ORDER BY doluluk DESC;", O);
bqk('bqk04', 'orta', 2, 'Haftalık değil aylık', 'DATE_TRUNC ile banka işlemlerinin aylık toplam tutarı (tam sayı, işlem tarihi DATE(txn_time)): <code>ay</code>, <code>toplam</code>. Aya göre sırala.', 'SELECT DATE_TRUNC(DATE(txn_time), MONTH) AS ay, ROUND(SUM(amount)) AS toplam FROM bank_txns GROUP BY ay ORDER BY ay;', O);
bqk('bqk05', 'orta', 2, 'Hiç uçmayanlar', 'EXCEPT DISTINCT ile hiç gerçekleşmiş (flown) uçuşu olmayan üyelerin sayısı: <code>uye</code>.', "SELECT COUNT(*) AS uye FROM (SELECT passenger_id FROM hv_passengers EXCEPT DISTINCT SELECT passenger_id FROM hv_bookings WHERE status = 'flown');");
bqk('bqk06', 'ileri', 3, 'Günlük takvim', 'GENERATE_DATE_ARRAY ile 1–14 Aralık 2024 arasındaki her gün için Kanat Havayolları iptal sayısı (iptal yoksa 0): <code>gun</code>, <code>iptal</code>. Güne göre sırala.', "SELECT gun, COUNTIF(f.status = 'cancelled') AS iptal FROM UNNEST(GENERATE_DATE_ARRAY(DATE '2024-12-01', DATE '2024-12-14')) AS gun LEFT JOIN hv_flights f ON DATE(f.sched_dep) = gun GROUP BY gun ORDER BY gun;", O);
bqk('bqk07', 'ileri', 2, 'Rezervasyon öncesi süre', 'DATE_DIFF ile ücret sınıfına göre rezervasyon ile uçuş arasındaki ortalama gün (1 basamak; yalnızca gerçekleşenler): <code>fare_class</code>, <code>ort_gun</code>. Sınıfa göre sırala.', "SELECT b.fare_class, ROUND(AVG(DATE_DIFF(DATE(f.sched_dep), DATE(b.booked_at), DAY)), 1) AS ort_gun FROM hv_bookings b JOIN hv_flights f ON f.flight_id = b.flight_id WHERE b.status = 'flown' GROUP BY b.fare_class ORDER BY b.fare_class;", O);
bqk('bqk08', 'orta', 1, 'Sütun hariç tut', 'SELECT * EXCEPT ile yolcu tablosunu e-posta ve doğum yılı <b>olmadan</b>, numaraya göre ilk 5 satır.', 'SELECT * EXCEPT (email, birth_year) FROM hv_passengers ORDER BY passenger_id LIMIT 5;', O);
bqk('bqk09', 'ileri', 2, 'Kategori ürün listesi', 'STRING_AGG ile her kategorinin en pahalıdan ucuza ürün adlarını birleştir: <code>category</code>, <code>urunler</code>. Kategoriye göre sırala.', "SELECT category, STRING_AGG(name, ' > ' ORDER BY price DESC, name) AS urunler FROM products GROUP BY category ORDER BY category;", O);
bqk('bqk10', 'orta', 2, 'Ay biçimi', 'FORMAT_DATE ile Kasım ve Aralık 2024 için ay (YYYY-AA) başına gerçekleşen rezervasyon geliri (tam sayı): <code>ay</code>, <code>gelir</code>. Aya göre sırala.', "SELECT FORMAT_DATE('%Y-%m', DATE(f.sched_dep)) AS ay, ROUND(SUM(b.price)) AS gelir FROM hv_bookings b JOIN hv_flights f ON f.flight_id = b.flight_id WHERE b.status = 'flown' AND f.sched_dep >= '2024-11-01' AND f.sched_dep < '2025-01-01' GROUP BY ay ORDER BY ay;", O);
bqk('bqk11', 'ileri', 2, 'Bölme hatasız oran', 'SAFE_DIVIDE ile her şubenin müşterilerinin KVKK onay oranı (yüzde, 1 basamak): <code>branch_id</code>, <code>onay</code>. Orana göre azalan, eşitlikte şubeye göre sırala.', 'SELECT branch_id, ROUND(SAFE_DIVIDE(COUNTIF(kvkk_consent = 1), COUNT(*)) * 100, 1) AS onay FROM bank_customers GROUP BY branch_id ORDER BY onay DESC, branch_id;', O);
bqk('bqk12', 'orta', 1, 'Boş değer yedeği', 'IFNULL ile müşterilerin şehri; şehir boşsa <b>Bilinmiyor</b>. Şehre göre müşteri sayısı: <code>sehir</code>, <code>musteri</code>. Sayıya göre azalan, eşitlikte şehre göre sırala.', "SELECT IFNULL(city, 'Bilinmiyor') AS sehir, COUNT(*) AS musteri FROM customers GROUP BY sehir ORDER BY musteri DESC, sehir;", O);

/* ============================ SINAVLAR ============================ */
window.SQLP_CERTFAM = [
  { id: 'oracle', name: 'Oracle Database SQL (1Z0-071)', desc: 'Çoktan seçmeli deneme ve Oracle yazımıyla süreli kodlama laboratuvarı.', path: 'sertifika' },
  { id: 'mssql', name: 'Microsoft SQL Server ve Azure SQL (T-SQL, DP-300)', desc: 'T-SQL sorgulama, Azure SQL yönetimi ve T-SQL yazımıyla kodlama laboratuvarı.', path: 'sert-mssql' },
  { id: 'google', name: 'Google Data Analytics ve BigQuery', desc: 'Analiz süreci, veri temizliği, BigQuery ve BigQuery yazımıyla kodlama laboratuvarı.', path: 'sert-bulut' },
  { id: 'bulut', name: 'Bulut veri platformları (Databricks, Snowflake)', desc: 'Lakehouse ve bulut veri ambarı kavramları; çoktan seçmeli denemeler.', path: 'sert-bulut' }
];
const EM = {}; E.forEach(e => EM[e.id] = e);
const fam = { z071: 'oracle', dp300: 'mssql', tsql: 'mssql', gda: 'google', dbx: 'bulut', snow: 'bulut' };
Object.keys(fam).forEach(k => { if (EM[k]) EM[k].fam = fam[k]; });
E.push({ id: 'kod-z071', kind: 'code', fam: 'oracle', d: 'oracle', name: '1Z0-071 Kodlama Laboratuvarı', short: 'Oracle Lab', lv: 'ileri', n: 5, min: 35, pass: 60, pool: { t: ['ora'] },
  desc: 'Oracle yazımıyla 5 görev, 35 dakika: NVL ailesi, DECODE, ROWNUM, FETCH, LISTAGG, küme işlemleri ve CONNECT BY.' });
E.push({ id: 'kod-tsql', kind: 'code', fam: 'mssql', d: 'tsql', name: 'T-SQL Kodlama Laboratuvarı', short: 'T-SQL Lab', lv: 'ileri', n: 5, min: 35, pass: 60, pool: { t: ['tsq'] },
  desc: 'T-SQL yazımıyla 5 görev, 35 dakika: TOP WITH TIES, APPLY, IIF, EOMONTH, STRING_AGG, ROLLUP ve tablo değişkenleri.' });
E.push({ id: 'kod-bq', kind: 'code', fam: 'google', d: 'bq', name: 'BigQuery Kodlama Laboratuvarı', short: 'BigQuery Lab', lv: 'ileri', n: 5, min: 30, pass: 60, pool: { t: ['bqk'] },
  desc: 'BigQuery yazımıyla 5 görev, 30 dakika: QUALIFY, COUNTIF, SAFE_DIVIDE, DATE_TRUNC, GENERATE_DATE_ARRAY ve EXCEPT DISTINCT.' });

/* Çoktan seçmeli bankaların genişletilmesi */
const q = (k, s, o, a, w) => ({ k, q: s, o, a, w });
const more = (id, list) => { if (EM[id]) EM[id].qs.push(...list); };

more('z071', [
  q('Fonksiyon', "<code>SELECT TRIM(LEADING '0' FROM '00450') FROM dual;</code> sonucu?", ["'450'", "'45'", "'0450'", "'00450'"], 0, 'LEADING yalnızca baştaki karakterleri siler; sondaki 0 korunur.'),
  q('Fonksiyon', "<code>SELECT REPLACE('BANANA', 'AN') FROM dual;</code> sonucu?", ["'BA'", "'BNN'", "'BANANA'", 'NULL'], 0, 'Üçüncü değişken verilmezse aranan metin silinir: B·AN·AN·A → BA.'),
  q('Fonksiyon', "<code>SELECT ROUND(DATE '2024-07-16', 'MONTH') FROM dual;</code> sonucu?", ['1 Temmuz 2024', '1 Ağustos 2024', '31 Temmuz 2024', '16 Temmuz 2024'], 1, 'Ay düzeyinde yuvarlamada ayın 16\'sı ve sonrası bir sonraki ayın ilk gününe yuvarlanır.'),
  q('Fonksiyon', "<code>SELECT CONCAT('A', 'B', 'C') FROM dual;</code> ne olur?", ["'ABC' döner, üç değer birleşir", "'AB' döner, üçüncü değer atlanır", 'Hata verir, CONCAT tam iki değer alır', 'NULL döner, fazla değer geçersizdir'], 2, 'Oracle\'da CONCAT tam iki değişken alır. Üç değer için iç içe CONCAT ya da || kullanılır.'),
  q('Dönüşüm', "<code>TO_CHAR(DATE '2024-03-05', 'fmDD Month YYYY')</code> (İngilizce ayarlarla) sonucu?", ["'5 March 2024'", "'05 March     2024'", "'05 MARCH 2024'", "'5 MARCH 2024'"], 0, 'fm öğesi baştaki sıfırları ve dolgu boşluklarını kaldırır; “Month” yazımı ayın baş harfini büyük verir.'),
  q('Dönüşüm', "Sayı tipindeki <code>emp_id</code> için <code>WHERE emp_id = '101'</code> ne olur?", ['Hata verir; tipler uyuşmaz', 'Çalışır; metin sayıya örtük çevrilir', 'Çalışır ama hiçbir satır dönmez', 'Çalışır; sütun metne çevrilir'], 1, 'Oracle sayı ile metin karşılaştırmasında metni sayıya çevirir. Sütun çevrilmediği için indeks de kullanılabilir.'),
  q('Dönüşüm', "<code>SELECT TO_NUMBER('$1,250.00', '$9,999.99') FROM dual;</code> sonucu?", ['1250', 'Hata: geçersiz sayı', "'1,250'", '125000'], 0, 'Biçim maskesi metindeki $ ve binlik ayırıcıyı tanımlar; sonuç 1250 sayısıdır.'),
  q('JOIN', 'NATURAL JOIN ile birleştirilen ortak sütun SELECT listesinde tablo önekiyle (<code>e.dept_id</code>) yazılırsa?', ['Hata verir; ortak sütun önek alamaz', 'Önek yok sayılır ve sorgu çalışır', 'Sol tablodaki değer getirilir', 'İki tablonun sütunu ayrı ayrı gelir'], 0, 'NATURAL JOIN ve USING ile birleştirilen sütunlar tek sütun sayılır; önekle kullanılmaları hata verir.'),
  q('JOIN', '<code>e LEFT OUTER JOIN d ON e.dept_id = d.dept_id WHERE d.city = \'Ankara\'</code> için doğru olan?', ['Departmanı olmayan çalışanlar da gelir', 'Sorgu fiilen iç birleştirmeye dönüşür', 'WHERE, birleştirmeden önce uygulanır', 'Ankara dışındaki departmanlar NULL ile gelir'], 1, 'Sağ tablodaki sütuna WHERE ile koşul koymak NULL satırları eler; dış birleştirmenin etkisi kaybolur. Koşul ON içine yazılmalıdır.'),
  q('Gruplama', '<code>SELECT dept_id, AVG(salary) FROM employees WHERE AVG(salary) > 5000 GROUP BY dept_id;</code>', ['Ortalaması 5000\'i aşan departmanları getirir', 'Hata verir; grup fonksiyonu WHERE içinde kullanılamaz', 'Tüm departmanları getirir', 'Tek satır döndürür'], 1, 'Grup koşulları HAVING ile yazılır. WHERE satırları gruplamadan önce süzer.'),
  q('Gruplama', '<code>SELECT MAX(AVG(salary)) FROM employees GROUP BY dept_id;</code> kaç satır döndürür?', ['Departman sayısı kadar', 'Tek satır', 'Hata verir', 'Hiç satır döndürmez'], 1, 'İç içe grup fonksiyonu, departman ortalamalarının en büyüğünü tek satır olarak verir; SELECT listesinde başka sütun olamaz.'),
  q('Alt sorgu', '<code>WHERE dept_id NOT IN (SELECT dept_id FROM employees)</code> alt sorgusu bir NULL değer içeriyorsa?', ['NULL yok sayılır ve sorgu normal çalışır', 'Hiçbir satır döndürmez', 'Hata verir', 'Yalnızca NULL departmanlar döner'], 1, 'NOT IN listesinde NULL varsa her karşılaştırma UNKNOWN olur ve hiçbir satır koşulu geçemez. NOT EXISTS bu tuzağa düşmez.'),
  q('Alt sorgu', '<code>WHERE salary &gt; ALL (SELECT salary FROM employees WHERE dept_id = 99)</code> (99 numaralı departman yok) ne döndürür?', ['Hiçbir satır', 'Tüm satırlar', 'Hata verir', 'Yalnızca NULL maaşlılar'], 1, 'Boş kümeye karşı ALL her zaman doğrudur; ANY ise her zaman yanlıştır.'),
  q('Küme', "<code>SELECT 1 FROM dual UNION SELECT 'A' FROM dual;</code>", ['İki satır döner', 'Hata verir; sütun tipleri uyuşmalı', "Tek satır döner: '1'", 'A, sayıya çevrilir'], 1, 'Küme işlemlerinde karşılıklı sütunların tip grubu aynı olmalıdır; Oracle burada örtük çevirme yapmaz.'),
  q('Küme', '<code>SELECT ad FROM a UNION SELECT isim FROM b ORDER BY isim;</code> için doğru olan?', ['Çalışır; ikinci sorgunun adı da kullanılabilir', 'Hata verir; yalnızca ilk sorgunun adı ya da sıra numarası kullanılabilir', 'Çalışır ama sıralama yapılmaz', 'Her sorgu ayrı ayrı sıralanır'], 1, 'Birleşik sorgunun sütun adları ilk sorgudan gelir. ORDER BY sonda tek kez yazılır; ad, takma ad ya da konum kullanılabilir.'),
  q('DML', 'DELETE ile TRUNCATE için doğru olan?', ['İkisi de ROLLBACK ile geri alınabilir', 'TRUNCATE bir DDL komutudur ve geri alınamaz; DELETE geri alınabilir', 'DELETE tabloyu yapısıyla birlikte siler', 'TRUNCATE yalnızca WHERE ile kullanılır'], 1, 'TRUNCATE örtük COMMIT yapan bir DDL komutudur; satır satır geri alma bilgisi üretmez.'),
  q('DML', 'Çok tablolu eklemede <code>INSERT FIRST</code> ile <code>INSERT ALL</code> farkı?', ['FIRST yalnızca ilk satırı ekler', 'FIRST her satır için koşulu sağlayan ilk WHEN dalını uygular; ALL tüm uygun dalları', 'ALL yalnızca koşulsuz eklemede kullanılır', 'Aralarında fark yoktur'], 1, 'INSERT ALL her satırı koşulu sağlayan tüm hedeflere ekler; INSERT FIRST ilk eşleşen WHEN\'den sonra durur.'),
  q('TCL', 'Bir oturum COMMIT yapmadan beklenmedik biçimde koparsa bekleyen değişiklikler?', ['Otomatik olarak kalıcı olur', 'Otomatik olarak geri alınır', 'Bir sonraki girişte sorulur', 'Son SAVEPOINT\'e kadar kalıcı olur'], 1, 'Olağan dışı sonlanan oturumun tamamlanmamış işlemi Oracle tarafından geri alınır.'),
  q('DDL', '<code>ALTER TABLE t SET UNUSED (not_sutunu);</code> sonrası doğru olan?', ['Sütun gizlenir; daha sonra DROP UNUSED COLUMNS ile kalıcı silinir ve geri alınamaz', 'Sütun yalnızca bu oturumda gizlenir', 'Sütun verisi korunur ve geri açılabilir', 'Sütun NULL değerlerle doldurulur'], 0, 'SET UNUSED sütunu hemen erişilemez yapar (hızlıdır); geri getirilemez. Disk alanı DROP UNUSED COLUMNS ile geri kazanılır.'),
  q('Nesne', 'Yeni bir oturumda <code>seq.NEXTVAL</code> çağrılmadan <code>seq.CURRVAL</code> kullanılırsa?', ['Son üretilen değer döner', 'Hata verir; oturumda önce NEXTVAL gerekir', '0 döner', 'Başlangıç değeri döner'], 1, 'CURRVAL oturuma özeldir ve o oturumda NEXTVAL en az bir kez çağrılmadan tanımsızdır.')
]);

more('dp300', [
  q('Plan', 'DTU modeline göre vCore satın alma modelinin avantajı?', ['İşlem ve depolamayı ayrı seçmek ve lisans indiriminden yararlanmak', 'Her zaman daha ucuz olması', 'Yedeklemenin kapatılabilmesi', 'Yalnızca Managed Instance için geçerli olması'], 0, 'vCore modelinde işlem, bellek ve depolama ayrı boyutlandırılır; Azure Hybrid Benefit ile mevcut lisanslar kullanılabilir.'),
  q('Plan', 'Azure Hybrid Benefit ne sağlar?', ['Mevcut SQL Server lisanslarıyla Azure maliyetini düşürmek', 'İki bölgede ücretsiz çoğaltma', 'Ücretsiz uzun süreli yedek saklama', 'Otomatik performans ayarı'], 0, 'Yazılım güvencesi olan SQL Server lisansları Azure SQL ve SQL Server VM\'lerde indirimli fiyat için kullanılabilir.'),
  q('Plan', 'Hyperscale katmanında yedekleme ve geri yüklemenin veri boyutundan neredeyse bağımsız hızlı olmasının nedeni?', ['Depolama katmanındaki dosya anlık görüntüleri', 'Verinin sıkıştırılarak saklanması', 'Yedeklerin yalnızca günlükten oluşması', 'İkincil bölgeye eşzamanlı yazma'], 0, 'Hyperscale, sayfa sunucularının dosyalarının anlık görüntülerini (snapshot) kullanır; büyük veritabanları da hızlı geri yüklenir.'),
  q('Güvenlik', 'Always Encrypted\'ın TDE\'den temel farkı?', ['Veri istemcide şifrelenir; veritabanı motoru düz metni ve anahtarları görmez', 'Yalnızca yedek dosyalarını şifreler', 'Ağ trafiğini şifreler', 'Varsayılan olarak tüm veritabanlarında açıktır'], 0, 'TDE bekleyen veriyi korur ama motor veriyi düz metin olarak işler. Always Encrypted\'da anahtarlar istemci tarafındadır.'),
  q('Güvenlik', 'Satır düzeyi güvenlik (RLS) nasıl uygulanır?', ['Bir koşul fonksiyonu (satır içi TVF) ve ona bağlı güvenlik ilkesiyle', 'Her kullanıcı için ayrı görünüm oluşturarak', 'Tabloya CHECK kısıtı ekleyerek', 'Dinamik veri maskelemeyle'], 0, 'CREATE SECURITY POLICY, filtre ve engelleme koşullarını bir satır içi tablo değerli fonksiyona bağlar.'),
  q('Güvenlik', 'Microsoft Defender for SQL ne sağlar?', ['Güvenlik açığı değerlendirmesi ve şüpheli etkinlik uyarıları', 'Otomatik indeks oluşturma', 'Bölgeler arası çoğaltma', 'Sorgu planı zorlama'], 0, 'Defender for SQL, yanlış yapılandırmaları raporlar ve SQL enjeksiyonu, olağan dışı erişim gibi tehditlerde uyarı üretir.'),
  q('Güvenlik', 'Azure SQL denetim (auditing) kayıtları nereye yazılabilir?', ['Depolama hesabı, Log Analytics ya da Event Hubs', 'Yalnızca veritabanındaki bir tabloya', 'Yalnızca SQL Server hata günlüğüne', 'Yalnızca yerel diske'], 0, 'Denetim hedefi olarak bir veya birden çok Azure hizmeti seçilebilir.'),
  q('İzleme', 'Query Store\'da en çok CPU veya süre harcayan sorguları bulmak için kullanılan rapor?', ['Top Resource Consuming Queries', 'Activity Monitor', 'Database Engine Tuning Advisor', 'Error Log Viewer'], 0, 'Query Store raporları sorguları kaynak tüketimine göre sıralar ve plan geçmişini gösterir.'),
  q('İzleme', 'SQL Server örneğinde birikmiş bekleme istatistiklerini (wait stats) veren DMV?', ['sys.dm_os_wait_stats', 'sys.dm_exec_sessions', 'sys.dm_db_index_usage_stats', 'sys.dm_io_virtual_file_stats'], 0, 'Bekleme türlerine göre toplam bekleme süresi ve sayısını verir; Azure SQL Database\'de veritabanı kapsamlı karşılığı sys.dm_db_wait_stats\'tır.'),
  q('Performans', 'Azure SQL Database otomatik ayar (automatic tuning) seçenekleri?', ['CREATE INDEX, DROP INDEX ve FORCE LAST GOOD PLAN', 'Yalnızca istatistik güncelleme', 'Bellek ve CPU ölçekleme', 'Yedek sıklığını ayarlama'], 0, 'Otomatik ayar eksik indeks ekleyebilir, kullanılmayanları kaldırabilir ve plan regresyonunda son iyi planı zorlayabilir.'),
  q('Performans', 'Eksik indeks önerilerini sorgulamak için hangi DMV ailesi kullanılır?', ['sys.dm_db_missing_index_details ve ilgili görünümler', 'sys.dm_os_performance_counters', 'sys.dm_exec_requests', 'sys.dm_tran_locks'], 0, 'Eksik indeks DMV\'leri optimizasyon sırasında istenip bulunamayan indeksleri kaydeder.'),
  q('Performans', 'Uyumluluk düzeyini yükseltirken plan regresyonu riskini azaltmanın önerilen yolu?', ['Önce Query Store\'u açıp eski düzeyde temel toplamak, sonra yükseltmek', 'İstatistikleri kapatıp yükseltmek', 'Tüm indeksleri silip yeniden oluşturmak', 'Yükseltmeden önce veritabanını küçültmek'], 0, 'Query Store eski planları saklar; regresyon görülürse eski plan zorlanabilir.'),
  q('Performans', 'Azure SQL Database\'de In-Memory OLTP hangi katmanlarda kullanılabilir?', ['Premium ve Business Critical', 'Yalnızca Basic', 'Yalnızca General Purpose', 'Tüm sunucusuz veritabanlarında'], 0, 'Bellek içi tablolar ve yerel derlenen yordamlar Premium / Business Critical katmanlarında desteklenir.'),
  q('Otomasyon', 'Azure SQL Managed Instance\'ta SQL Server Agent var mı?', ['Evet, iş zamanlamak için kullanılabilir', 'Hayır, yalnızca Elastic Jobs kullanılır', 'Yalnızca okuma amaçlı vardır', 'Yalnızca Business Critical katmanında vardır'], 0, 'Managed Instance, SQL Server ile yüksek uyumludur ve SQL Agent içerir; Azure SQL Database\'de Agent yoktur.'),
  q('HA/DR', 'Aktif coğrafi çoğaltma ile yük devretme grubu farkı?', ['Yük devretme grubu birden çok veritabanını birlikte, sabit dinleyiciyle ve otomatik devredebilir', 'Coğrafi çoğaltma yalnızca aynı bölgede çalışır', 'Yük devretme grubu okunabilir ikincil sağlamaz', 'İkisi de yalnızca Managed Instance içindir'], 0, 'Coğrafi çoğaltma veritabanı başınadır ve bağlantı dizesi değişir; yük devretme grubu okuma-yazma dinleyicisi ve otomatik ilke sunar.'),
  q('HA/DR', 'Azure SQL Database\'de yanlışlıkla silinen bir veritabanı nasıl geri getirilir?', ['Saklama süresi içinde silinen veritabanı geri yüklemesiyle', 'Geri getirilemez', 'Yalnızca destek talebiyle', 'Coğrafi çoğaltmayı tersine çevirerek'], 0, 'Otomatik yedekler saklama süresi boyunca tutulur; silinen veritabanı silinme anına kadar geri yüklenebilir.'),
  q('HA/DR', 'Bölge yedekli (zone redundant) yapılandırma neye karşı korur?', ['Aynı bölgedeki bir kullanılabilirlik alanının arızasına', 'Tüm bölgenin kapanmasına', 'Kullanıcının yanlışlıkla sildiği verilere', 'Uygulama hatalarına'], 0, 'Kopyalar aynı bölgedeki farklı kullanılabilirlik alanlarına dağıtılır; bölgesel felaket için coğrafi çözüm gerekir.'),
  q('Geçiş', 'Şirket içi SQL Server\'dan en az kesintiyle Azure\'a geçiş için uygun yöntem?', ['Azure Database Migration Service ile çevrim içi geçiş', 'Yedek dosyasını e-postayla gönderip geri yüklemek', 'Tabloları CSV olarak dışa aktarmak', 'Veritabanını kapatıp dosyaları kopyalamak'], 0, 'Çevrim içi geçişte kaynak çalışmaya devam ederken değişiklikler sürekli aktarılır; kesinti yalnızca son geçiş anındadır.')
]);

more('gda', [
  q('Süreç', 'Analiz sürecinin “Process” (işle) adımında ne yapılır?', ['Veri temizlenir, dönüştürülür ve bütünlüğü doğrulanır', 'Paydaşlarla iş sorusu belirlenir', 'Bulgular sunulur', 'Veri kaynakları satın alınır'], 0, 'Ask, Prepare, Process, Analyze, Share, Act sıralamasında Process, verinin analize hazırlandığı temizlik adımıdır.'),
  q('Süreç', 'SMART soru ölçütündeki M neyi ifade eder?', ['Ölçülebilir (Measurable)', 'Yönetilebilir (Manageable)', 'Anlamlı (Meaningful)', 'Çok boyutlu (Multiple)'], 0, 'SMART: Specific, Measurable, Action-oriented, Relevant, Time-bound.'),
  q('Süreç', 'Hangisi nitel (qualitative) veriye örnektir?', ['Müşterilerin açık uçlu yorumları', 'Günlük sipariş sayısı', 'Ortalama sepet tutarı', 'Sayfada geçirilen saniye'], 0, 'Nitel veri ölçülemeyen, sınıflandırılan ya da betimlenen bilgidir; nicel veri sayılabilir ve ölçülebilir.'),
  q('Temizlik', 'Bir anketin yalnızca mobil uygulama kullanıcılarından toplanması hangi yanlılığa örnektir?', ['Örneklem yanlılığı', 'Doğrulama yanlılığı', 'Gözlemci yanlılığı', 'Yorum yanlılığı'], 0, 'Örneklem nüfusu temsil etmezse sonuçlar tüm müşterilere genellenemez.'),
  q('Temizlik', 'BigQuery\'de metnin başındaki ve sonundaki boşlukları silen fonksiyon?', ['TRIM', 'STRIP', 'CLEAN', 'SUBSTR'], 0, 'TRIM(x) baştaki ve sondaki boşlukları siler; LTRIM ve RTRIM tek tarafı temizler.'),
  q('Temizlik', 'Tamamen aynı satırları kaldırılmış yeni bir tablo oluşturmanın en kısa yolu?', ['CREATE TABLE yeni AS SELECT DISTINCT * FROM eski', 'DELETE FROM eski WHERE DISTINCT', 'ALTER TABLE eski REMOVE DUPLICATES', 'SELECT UNIQUE eski INTO yeni'], 0, 'SELECT DISTINCT * tüm sütunları aynı olan satırlardan birini tutar.'),
  q('BigQuery', '<code>SELECT * EXCEPT (email) FROM customers</code> ne yapar?', ['email dışındaki tüm sütunları getirir', 'email\'i boş olanları hariç tutar', 'Hata verir', 'Yalnızca email sütununu getirir'], 0, 'SELECT * EXCEPT belirtilen sütunları seçim listesinden çıkarır; satırları süzmez.'),
  q('BigQuery', '<code>COUNTIF(x &gt; 0)</code> hangisine eşdeğerdir?', ['SUM(CASE WHEN x > 0 THEN 1 ELSE 0 END)', 'COUNT(x)', 'COUNT(*) WHERE x > 0', 'MAX(x > 0)'], 0, 'COUNTIF koşulu doğru olan satırları sayar.'),
  q('BigQuery', "<code>DATE_TRUNC(DATE '2024-05-17', MONTH)</code> sonucu?", ['2024-05-01', '2024-05-31', '2024-01-01', '2024-05-17'], 0, 'DATE_TRUNC tarihi istenen birimin başlangıcına indirir.'),
  q('BigQuery', "<code>EXTRACT(DAYOFWEEK FROM DATE '2024-05-19')</code> (pazar) sonucu?", ['1', '7', '0', '6'], 0, 'BigQuery\'de pazar = 1, cumartesi = 7.'),
  q('BigQuery', 'Tarihe göre bölümlenmiş (partitioned) bir tabloda taranan veriyi azaltmak için?', ['WHERE içinde bölüm sütununa doğrudan filtre koymak', 'Sorguya LIMIT eklemek', 'ORDER BY ile sıralamak', 'SELECT * kullanmak'], 0, 'Bölüm sütununa filtre, sorgunun yalnızca ilgili bölümleri okumasını (budama) sağlar.'),
  q('Maliyet', 'Kümeleme (clustering) ne sağlar?', ['Veriyi küme sütunlarına göre düzenler; o sütunlara filtrede okunan blokları azaltır', 'Tabloyu birden çok bölgeye kopyalar', 'Sorgu sonuçlarını önbelleğe alır', 'Satırları şifreler'], 0, 'Kümelenmiş tablolarda filtre ve gruplama, ilgisiz blokların atlanmasıyla daha az veri tarar.'),
  q('Maliyet', 'BigQuery konsolundaki tablo önizlemesi (Preview) için doğru olan?', ['Sorgu çalıştırmadığı için tarama ücreti doğurmaz', 'Tüm tabloyu tarar ve ücretlendirilir', 'Yalnızca kümelenmiş tablolarda çalışır', 'Sonuçları kalıcı tabloya yazar'], 0, 'Önizleme veriyi sorgu olmadan gösterir; SELECT * ... LIMIT ise tüm sütunları tarar.'),
  q('Analiz', 'E-tabloda koşula uyan hücreleri sayan fonksiyon?', ['COUNTIF', 'SUMIF', 'VLOOKUP', 'COUNTA'], 0, 'COUNTIF(aralık, koşul) koşulu sağlayan hücreleri sayar; COUNTA boş olmayanları sayar.'),
  q('Analiz', 'VLOOKUP\'ın SQL\'deki en yakın karşılığı?', ['JOIN ile başka tablodan eşleşen değeri getirmek', 'GROUP BY ile toplamak', 'ORDER BY ile sıralamak', 'UNION ile alt alta eklemek'], 0, 'VLOOKUP bir anahtarla başka bir tabloda arama yapar; SQL\'de bu bir birleştirmedir.'),
  q('Paylaş', 'Renk körlüğüne duyarlı bir grafik için en doğru uygulama?', ['Anlamı yalnızca renge değil etiket, şekil veya desene de bağlamak', 'Kırmızı ve yeşili zıt anlamlar için kullanmak', 'Tüm serileri aynı renkte göstermek', 'Açıklamayı (legend) kaldırmak'], 0, 'Erişilebilir görselleştirme renge ek ipuçları kullanır; kırmızı–yeşil ayrımı en yaygın renk körlüğüdür.')
]);

more('dbx', [
  q('Platform', 'Databricks SQL\'de çalışmış sorguları kullanıcı, warehouse ve süreye göre listeleyen sayfa?', ['Query History', 'Catalog Explorer', 'Alerts', 'Partner Connect'], 0, 'Query History her sorgunun süresini, durumunu ve çalıştığı warehouse\'u gösterir; ayrıntı için Query Profile açılır.'),
  q('Katalog', 'Harici (external) bir tablo DROP edilince ne olur?', ['Yalnızca meta veri silinir, dosyalar yerinde kalır', 'Dosyalar da silinir', 'Tablo arşive taşınır', 'Hata verir'], 0, 'Harici tablonun verisi kullanıcının yönettiği konumdadır; DROP yalnızca katalog kaydını kaldırır.'),
  q('Katalog', 'Unity Catalog\'da bir tabloyu okuyabilmek için gereken yetkiler?', ['Katalogda USE CATALOG, şemada USE SCHEMA ve tabloda SELECT', 'Yalnızca tabloda SELECT', 'Şemada ALL PRIVILEGES', 'Katalogda OWNER'], 0, 'Üst nesnelerde kullanım yetkisi olmadan tablodaki SELECT yetkisi tek başına yetmez.'),
  q('Katalog', 'Tabloların hangi kaynaklardan beslendiğini ve hangi panolarda kullanıldığını görmek için?', ['Unity Catalog veri soy ağacı (lineage)', 'DESCRIBE HISTORY', 'Query Profile', 'OPTIMIZE'], 0, 'Unity Catalog sorgulardan soy ağacını otomatik toplar ve Catalog Explorer\'da gösterir.'),
  q('Delta', 'Delta Lake ACID işlemlerini nasıl sağlar?', ['Her değişikliği sıralı bir işlem günlüğüne (_delta_log) yazarak', 'Tabloyu kilitleyip kopyalayarak', 'Verileri bellekte tutarak', 'Her satıra zaman damgası ekleyerek'], 0, 'İşlem günlüğü tablonun hangi dosyalardan oluştuğunu sürüm sürüm kaydeder; okuyucular tutarlı bir anlık görüntü görür.'),
  q('Delta', '<code>RESTORE TABLE satislar TO VERSION AS OF 5</code> ne yapar?', ['Tabloyu 5. sürümdeki haline geri döndürür', '5. sürümü yeni bir tabloya kopyalar', 'Son 5 sürümü siler', 'Yalnızca 5. sürümü sorgular'], 0, 'RESTORE geçmiş bir sürümü geçerli sürüm yapar ve bu işlem de geçmişe yeni bir sürüm olarak yazılır.'),
  q('Delta', 'ZORDER BY (veya liquid clustering) ne sağlar?', ['Benzer değerleri aynı dosyalarda toplayıp filtrede dosya atlamayı artırır', 'Satırları alfabetik sıralayıp gösterir', 'Eski sürümleri siler', 'Şemayı otomatik genişletir'], 0, 'Veri yerleşimi iyileşince min/max istatistikleriyle daha çok dosya okunmadan atlanır.'),
  q('Delta', 'Delta tablosuna, tabloda olmayan bir sütun içeren veri eklenmeye çalışılırsa varsayılan davranış?', ['Şema uygulaması (schema enforcement) nedeniyle hata verir', 'Sütun sessizce eklenir', 'Fazla sütun atılır ve ekleme yapılır', 'Tablo yeniden oluşturulur'], 0, 'Şema evrimi açıkça istenmedikçe (ör. mergeSchema) Delta uyumsuz yazımı reddeder.'),
  q('Mimari', 'Madalyon (medallion) mimarisinde Silver katmanı?', ['Temizlenmiş, tekilleştirilmiş ve birleştirilmiş veri', 'Kaynaktan geldiği gibi ham veri', 'Panolar için toplanmış iş metrikleri', 'Yedek kopyalar'], 0, 'Bronze ham, Silver temiz ve uyumlu, Gold iş düzeyinde toplanmış veridir.'),
  q('Mimari', 'Madalyon mimarisinde Gold katmanı?', ['Rapor ve panolar için iş düzeyinde toplanmış tablolar', 'Ham olay kayıtları', 'Geçici hazırlık dosyaları', 'Şifrelenmiş kişisel veri'], 0, 'Gold tablolar son kullanıcı sorgularına ve BI araçlarına hazır özetlerdir.'),
  q('SQL', 'Databricks SQL\'de bir dizinin eleman sayısını veren fonksiyon?', ['size(dizi)', 'length_of(dizi)', 'count(dizi)', 'elements(dizi)'], 0, 'size (veya array_size) dizi ya da harita uzunluğunu döndürür.'),
  q('SQL', 'JSON metni tutan <code>raw</code> sütunu için <code>raw:musteri.ad</code> ne yapar?', ['JSON yolunu izleyip alanı metin olarak okur', 'Sütunu ikiye böler', 'Hata verir', 'Tabloyu musteri tablosuyla birleştirir'], 0, 'Databricks SQL\'de iki nokta sözdizimi metin sütunundaki JSON\'dan alan çıkarır.'),
  q('SQL', 'İki tarih arasındaki gün farkı için Databricks SQL fonksiyonu?', ['datediff(bitis, baslangic)', 'date_diff_days(baslangic, bitis)', 'days_between(bitis, baslangic)', 'diff(bitis, baslangic, "day")'], 0, 'datediff(end, start) gün sayısını verir; ilk değişken bitiş tarihidir.'),
  q('Pano', 'Bir panonun belirli aralıklarla yenilenip abonelere gönderilmesi için?', ['Pano zamanlaması (schedule) ve aboneler', 'OPTIMIZE komutu', 'Query Profile', 'Catalog Explorer'], 0, 'Zamanlanmış yenileme sorguları çalıştırır ve sonuç anlık görüntüsünü abonelere iletir.'),
  q('Pano', 'Sorgu parametresi ile sonuç filtresi farkı?', ['Parametre sorguyu yeniden çalıştırır; filtre mevcut sonucu süzer', 'İkisi de sorguyu yeniden çalıştırır', 'Filtre veritabanında indeks oluşturur', 'Parametre yalnızca metin alır'], 0, 'Parametre değeri SQL metnine girer ve sorgu yeniden çalışır; filtre gelen sonuç kümesi üzerinde uygulanır.'),
  q('Güvenlik', 'Unity Catalog\'da satır filtresi ve sütun maskesi nasıl uygulanır?', ['Bir SQL fonksiyonu tanımlanıp tabloya ROW FILTER veya MASK olarak bağlanır', 'Her kullanıcıya ayrı tablo kopyası verilir', 'Panoda filtre ekleyerek', 'Delta günlüğünü düzenleyerek'], 0, 'Fonksiyon, sorgulayan kullanıcıya (ör. grup üyeliği) göre hangi satırların görüneceğine ya da değerin nasıl maskeleneceğine karar verir.'),
  q('Maliyet', 'SQL warehouse için otomatik durdurma (auto stop) ne sağlar?', ['Belirli süre boşta kalınca warehouse\'u durdurup maliyeti keser', 'Uzun süren sorguları iptal eder', 'Warehouse\'u en küçük boyuta indirir', 'Sorgu sonuçlarını siler'], 0, 'Boşta kalan işlem kaynağı ücret yazmaya devam eder; otomatik durdurma bunu önler.')
]);

more('snow', [
  q('Mimari', 'Snowflake\'te depolama ve işlem kaynakları için doğru olan?', ['Birbirinden bağımsız ölçeklenir ve ayrı ücretlendirilir', 'Her zaman birlikte büyür', 'Depolama işlem kaynağının diskinde tutulur', 'Yalnızca işlem ücretlendirilir'], 0, 'Veri merkezi depolamada durur; sanal ambarlar ayrı ayrı başlatılır, büyütülür ve durdurulur.'),
  q('Ambar', 'Bir sanal ambarı bir boyut büyütmek (ör. M → L) saatlik kredi tüketimini nasıl etkiler?', ['İki katına çıkarır', 'Değiştirmez', 'Yarıya indirir', 'On katına çıkarır'], 0, 'Her boyut bir öncekinin iki katı işlem gücü ve iki katı kredi tüketimi demektir.'),
  q('Ambar', 'Sanal ambar ücretlendirmesi nasıl yapılır?', ['Saniye bazında; her başlatmada en az 60 saniye', 'Saat bazında, yukarı yuvarlanarak', 'Çalıştırılan sorgu sayısına göre', 'Taranan bayt miktarına göre'], 0, 'Ambar çalıştığı süre kadar saniye bazında ücretlendirilir; başlatma ve devam ettirmede ilk dakika tam faturalanır.'),
  q('Önbellek', 'Sonuç önbelleği (result cache) bir sorgu sonucunu ne kadar tutar?', ['24 saat; her yeniden kullanımda süre yenilenir (en fazla 31 gün)', '1 saat', 'Ambar açık kaldığı sürece', 'Süresiz'], 0, 'Alttaki veri değişmediyse aynı sorgu önbellekten döner ve ambar kredisi harcamaz.'),
  q('Yükleme', 'CSV ayırıcısı, başlık satırı ve tarih biçimi gibi ayarları yeniden kullanılabilir biçimde tanımlayan nesne?', ['FILE FORMAT', 'PIPE', 'STREAM', 'SEQUENCE'], 0, 'CREATE FILE FORMAT ile tanımlanan biçim, stage ve COPY INTO komutlarında adıyla kullanılır.'),
  q('Yükleme', "<code>COPY INTO ... ON_ERROR = 'CONTINUE'</code> ne yapar?", ['Hatalı satırları atlayıp yüklemeye devam eder', 'İlk hatada tüm yüklemeyi geri alır', 'Hatalı dosyayı siler', 'Hatalı satırları NULL ile doldurur'], 0, 'Varsayılan ABORT_STATEMENT yüklemeyi durdurur; CONTINUE hatalı satırları atlar, SKIP_FILE ise dosyanın tamamını atlar.'),
  q('Yükleme', 'Harici (external) stage nedir?', ['S3, Azure Blob veya GCS gibi bulut depolama konumuna işaret eden nesne', 'Snowflake içindeki kullanıcı alanı', 'Yerel bilgisayardaki klasör', 'Bir başka hesabın veritabanı'], 0, 'Harici stage, dosyaların müşterinin bulut depolamasında kaldığı yükleme kaynağıdır; dahili stage\'ler Snowflake\'te tutulur.'),
  q('Yarı yapısal', 'LATERAL FLATTEN çıktısındaki VALUE sütunu neyi içerir?', ['Açılan dizinin ya da nesnenin her bir elemanı', 'Dizinin uzunluğu', 'Elemanın sırası', 'JSON belgesinin tamamı'], 0, 'FLATTEN; SEQ, KEY, PATH, INDEX, VALUE ve THIS sütunlarını üretir. INDEX sırayı, VALUE elemanın kendisini verir.'),
  q('Koruma', 'Bir tablonun 5 dakika önceki halini sorgulamak için?', ['SELECT * FROM t AT(OFFSET => -300)', 'SELECT * FROM t VERSION 5', 'SELECT * FROM t HISTORY(5)', 'UNDROP TABLE t'], 0, 'Time Travel; AT veya BEFORE ile zaman damgası, saniye cinsinden ofset ya da sorgu kimliğine göre geçmişe bakar.'),
  q('Koruma', 'Standard sürümde Time Travel saklama süresi en fazla?', ['1 gün', '7 gün', '90 gün', '365 gün'], 0, 'Standard sürümde en fazla 1 gün; Enterprise ve üzerinde kalıcı tablolar için 90 güne kadar ayarlanabilir.'),
  q('Koruma', 'Geçici (transient) tablo için doğru olan?', ['Fail-safe süresi yoktur ve Time Travel en fazla 1 gündür', 'Oturum kapanınca silinir', 'Time Travel süresi 90 gündür', 'Başka hesaplarla paylaşılamaz'], 0, 'Transient tablolar kalıcıdır ama Fail-safe maliyeti doğurmaz. Oturum sonunda silinen tür TEMPORARY tablodur.'),
  q('Güvenlik', 'SYSADMIN rolünün önerilen görevi?', ['Ambar, veritabanı ve şema gibi nesneleri oluşturup yönetmek', 'Kullanıcı ve rol oluşturmak', 'Faturalandırmayı yönetmek', 'Ağ politikalarını tanımlamak'], 0, 'Kullanıcı ve rol yönetimi USERADMIN / SECURITYADMIN, hesap düzeyindeki işler ACCOUNTADMIN rolündedir.'),
  q('Güvenlik', 'Kullanıcının rolüne göre tablonun hangi satırlarını görebileceğini belirleyen nesne?', ['Satır erişim politikası (row access policy)', 'Maskeleme politikası', 'Ağ politikası', 'Kaynak izleyici'], 0, 'Satır erişim politikası sorgu anında satırları süzer; maskeleme politikası sütun değerini gizler.'),
  q('Güvenlik', 'Hesaba yalnızca belirli IP adreslerinden erişime izin vermek için?', ['Ağ politikası (network policy)', 'Kaynak izleyici', 'Satır erişim politikası', 'Dosya biçimi'], 0, 'Ağ politikası izin verilen ve engellenen IP listelerini tanımlar; hesaba ya da kullanıcıya atanır.'),
  q('Performans', 'Kümeleme anahtarı (clustering key) tanımlamak en çok ne zaman faydalıdır?', ['Çok büyük tablolarda, sık filtrelenen sütunlar için', 'Her küçük tabloda', 'Yalnızca JSON sütunlarında', 'Sık güncellenen küçük tablolarda'], 0, 'Snowflake mikro bölümleri otomatik oluşturur; çok büyük tablolarda kümeleme anahtarı budamayı iyileştirir ama yeniden kümeleme kredisi harcar.'),
  q('Performans', 'Search Optimization Service hangi sorguları hızlandırır?', ['Büyük tablolarda az sayıda satır döndüren seçici eşitlik aramalarını', 'Tüm tabloyu tarayan toplama sorgularını', 'Veri yükleme işlemlerini', 'Sonuç önbelleğini'], 0, 'Nokta aramaları (WHERE id = ...) için ek erişim yapıları oluşturur.'),
  q('Nesne', 'Stream nesnesi ne işe yarar?', ['Bir tablodaki eklenen, güncellenen ve silinen satırları (değişiklik verisi) izler', 'Dosyaları sürekli yükler', 'Sorguları zamanlar', 'Tabloyu başka hesaba kopyalar'], 0, 'Stream, son okumadan bu yana olan değişiklikleri verir; genellikle bir TASK ile zamanlanmış dönüşümlerde kullanılır.')
]);

more('tsql', [
  q('Sorgu', '<code>SELECT TOP (10) PERCENT * FROM t ORDER BY x;</code> 25 satırlık tabloda kaç satır döndürür?', ['3', '2', '10', '25'], 0, 'TOP PERCENT yukarı yuvarlar: 25 × %10 = 2,5 → 3 satır.'),
  q('Dönüşüm', '<code>SELECT CAST(2.7 AS INT);</code> sonucu?', ['2', '3', '2.7', 'Hata'], 0, 'Ondalıklı sayıdan tam sayıya CAST yuvarlamaz, keser.'),
  q('Dönüşüm', '<code>SELECT 7 / 2, 7 / 2.0;</code> sonucu?', ['3 ve 3.5', '3.5 ve 3.5', '3 ve 3', '4 ve 3.5'], 0, 'İki tam sayının bölümü tam sayıdır; işlenenlerden biri ondalıklıysa sonuç ondalıklıdır.'),
  q('Fonksiyon', "<code>SELECT DATEADD(month, 1, '2024-01-31');</code> sonucu?", ['2024-02-29', '2024-03-02', '2024-02-28', '2024-03-01'], 0, 'Hedef ayda o gün yoksa ayın son günü kullanılır; 2024 artık yıldır.'),
  q('Fonksiyon', "<code>SELECT value FROM STRING_SPLIT('a,b,c', ',');</code> ne döndürür?", ['Üç satır: a, b, c', "Tek satır: 'a b c'", 'Üç sütunlu tek satır', 'Hata verir'], 0, 'STRING_SPLIT tablo değerli bir fonksiyondur ve value sütununda her parçayı ayrı satırda verir.'),
  q('Fonksiyon', 'ISNULL ile COALESCE farkı?', ['ISNULL iki değer alır ve ilk değerin tipini kullanır; COALESCE çok değer alır ve en yüksek öncelikli tipi kullanır', 'COALESCE yalnızca sayılarla çalışır', 'ISNULL standart SQL\'dir, COALESCE değildir', 'Aralarında fark yoktur'], 0, '<code>ISNULL(CAST(NULL AS VARCHAR(2)), \'abc\')</code> ilk tipin uzunluğuna göre \'ab\' döndürür; COALESCE \'abc\' döndürür.'),
  q('Pencere', '<code>LAST_VALUE(x) OVER (ORDER BY d)</code> çerçeve belirtilmezse ne döndürür?', ['Genellikle geçerli satırın (ve eşlerinin) değerini', 'Bölümün son satırının değerini', 'İlk satırın değerini', 'NULL'], 0, 'Varsayılan çerçeve RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW olduğu için “son” değer geçerli satırdır. ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING gerekir.'),
  q('Pencere', '10 satırda <code>NTILE(4)</code> grupları hangi büyüklüklerde oluşturur?', ['3, 3, 2, 2', '2, 2, 3, 3', '3, 3, 3, 1', '2, 2, 2, 4'], 0, 'Artan satırlar ilk gruplara dağıtılır.'),
  q('Gruplama', '<code>GROUP BY CUBE(a, b)</code> kaç gruplama kümesi üretir?', ['4: (a, b), (a), (b), ()', '3: (a, b), (a), ()', '2: (a), (b)', '1: (a, b)'], 0, 'CUBE tüm alt kümeleri üretir; n sütun için 2ⁿ küme. ROLLUP ise hiyerarşik n + 1 küme üretir.'),
  q('DML', 'T-SQL\'de başka bir tablodaki değerle güncellemenin yaygın sözdizimi?', ['UPDATE t SET t.x = s.x FROM t JOIN s ON s.id = t.id', 'UPDATE t JOIN s SET t.x = s.x', 'UPDATE t SET x = s.x USING s', 'MERGE t SET x = s.x'], 0, 'SQL Server UPDATE ... FROM ... JOIN biçimini destekler; MySQL ise UPDATE t JOIN s SET ... yazımını kullanır.'),
  q('DML', 'IDENTITY sütunu olan tabloda TRUNCATE TABLE sonrası?', ['IDENTITY başlangıç değerine sıfırlanır', 'IDENTITY kaldığı yerden devam eder', 'TRUNCATE IDENTITY olan tabloda çalışmaz', 'IDENTITY sütunu silinir'], 0, 'DELETE kaldığı yerden devam ettirir; TRUNCATE sayacı başa döndürür.'),
  q('Hata', '<code>THROW</code> ile kullanıcı tanımlı hata numarası için kural?', ['50000 veya üzeri olmalı', '1 ile 100 arasında olmalı', 'Negatif olmalı', 'sys.messages\'ta kayıtlı olmalı'], 0, 'THROW 50001, \'İleti\', 1; biçiminde numara 50000\'den büyük olmalıdır ve sys.messages kaydı gerektirmez.'),
  q('Programlama', 'Bir saklı yordamın sonuç kümesi dışında çağırana değer döndürmesinin yolu?', ['OUTPUT parametresi', 'PRINT ifadesi', 'SELECT INTO', 'RAISERROR'], 0, 'OUTPUT olarak tanımlanan parametre çağıran tarafta değişkene yazılır; RETURN ise yalnızca tam sayı durum kodu döndürür.'),
  q('Programlama', '<code>@@ROWCOUNT</code> neyi verir?', ['Son ifadenin etkilediği ya da döndürdüğü satır sayısını', 'Tablonun toplam satır sayısını', 'Açık işlem sayısını', 'Son IDENTITY değerini'], 0, 'Her ifadeden sonra yeniden ayarlanır; değeri hemen bir değişkene almak gerekir.'),
  q('İşlem', 'İç içe iki <code>BEGIN TRAN</code> sonrasında tek bir <code>ROLLBACK</code> ne yapar?', ['Tüm işlemi geri alır ve @@TRANCOUNT 0 olur', 'Yalnızca içteki işlemi geri alır', '@@TRANCOUNT\'ı 1 azaltır', 'Hata verir'], 0, 'SQL Server\'da iç içe işlemler gerçek alt işlem değildir; ROLLBACK (savepoint adı olmadan) en dıştaki işleme kadar her şeyi geri alır.')
]);


/* Seçenek uzunluklarını dengele: doğru cevap en uzun seçenek olarak öne çıkmasın */
const FIX = {
  'z071#63': ["'ABC' döner; üç değer sırayla birleşir", "'AB' döner; fazla olan üçüncü değer atlanır", 'Hata verir; CONCAT iki değer alır', "NULL döner; fazla değişken NULL sayılır"],
  'z071#65': ['Hata verir; NUMBER ile metin karşılaştırılamaz', 'Çalışır; metin sayıya örtük çevrilir', 'Çalışır ama tırnak yüzünden hiçbir satır dönmez', 'Çalışır; sütun metne çevrilir ve indeks kullanılamaz'],
  'z071#69': ['Ortalaması 5000\'i aşan departmanları getirir', 'Hata verir; grup fonksiyonu WHERE\'de olamaz', 'Tüm departmanları ortalamalarıyla getirir', 'Tek satır döndürür: genel ortalama'],
  'z071#73': ['İki satır döner: 1 ve A', 'Hata verir; sütun tipleri uyuşmalı', "Tek satır döner, çünkü '1' metne çevrilir", "A sayıya çevrilmeye çalışılır ve NULL olur"],
  'z071#74': ['Çalışır; ikinci sorgunun sütun adı da geçerlidir', 'Hata verir; ilk sorgunun adı ya da konum gerekir', 'Çalışır ama ORDER BY sessizce yok sayılır', 'Her sorgu kendi içinde ayrı ayrı sıralanır'],
  'z071#75': ['İkisi de ROLLBACK ile geri alınabilir', 'TRUNCATE DDL\'dir, geri alınamaz; DELETE alınabilir', 'DELETE tabloyu yapısıyla birlikte kalıcı siler', 'TRUNCATE yalnızca WHERE koşuluyla kullanılabilir'],
  'z071#76': ['FIRST yalnızca alt sorgunun ilk satırını ekler', 'FIRST ilk eşleşen WHEN dalını, ALL tüm dalları uygular', 'ALL yalnızca koşulsuz (WHEN içermeyen) eklemede çalışır', 'Aralarında fark yoktur; FIRST eski yazımdır'],
  'z071#78': ['Sütun gizlenir; geri alınamaz, sonra silinebilir', 'Sütun yalnızca bu oturum boyunca gizlenir', 'Sütun verisi korunur ve SET USED ile geri açılır', 'Sütunun tüm değerleri NULL ile doldurulur'],
  'z071#79': ['Başka oturumda üretilen son değer döner', 'Hata verir; önce NEXTVAL gerekir', 'Hiç değer üretilmediği için 0 döner', 'Sequence\'in START WITH değeri döner'],
  'dp300#32': ['İşlem ve depolamayı ayrı seçip lisans indirimi almak', 'Her iş yükünde DTU modelinden ucuz olması', 'Otomatik yedeklemenin kapatılabilmesi', 'Yalnızca Managed Instance için geçerli olması'],
  'dp300#33': ['Mevcut SQL Server lisanslarıyla indirim', 'İki bölgede ücretsiz coğrafi çoğaltma', 'Uzun süreli yedeklerin ücretsiz saklanması', 'Sorgular için otomatik performans ayarı'],
  'dp300#34': ['Depolamadaki dosya anlık görüntüleri', 'Verinin sütun bazında sıkıştırılarak saklanması', 'Yedeklerin yalnızca işlem günlüğünden oluşması', 'İkincil bölgeye her yazmanın eşzamanlı kopyalanması'],
  'dp300#35': ['Veri istemcide şifrelenir; motor düz metni görmez', 'Yalnızca yedek dosyalarını ve günlükleri şifreler', 'Yalnızca istemci ile sunucu arasındaki ağ trafiğini şifreler', 'Varsayılan olarak tüm veritabanlarında açık gelir'],
  'dp300#36': ['Koşul fonksiyonu ve güvenlik ilkesiyle', 'Her kullanıcı için ayrı bir görünüm oluşturarak', 'Tabloya kullanıcı adını denetleyen CHECK kısıtı ekleyerek', 'Hassas sütunlarda dinamik veri maskelemesi açarak'],
  'dp300#37': ['Güvenlik açığı taraması ve tehdit uyarıları', 'Eksik indeksleri otomatik olarak oluşturma', 'Veritabanını bölgeler arasında çoğaltma', 'Plan regresyonunda iyi planı zorlama'],
  'dp300#38': ['Depolama hesabı, Log Analytics veya Event Hubs', 'Yalnızca aynı veritabanındaki bir denetim tablosu', 'Yalnızca SQL Server hata günlüğü (ERRORLOG)', 'Yalnızca sunucunun yerel geçici diski'],
  'dp300#41': ['İndeks ekleme, indeks silme ve son iyi planı zorlama', 'Yalnızca istatistiklerin otomatik güncellenmesi', 'Yük arttığında bellek ve CPU\'nun ölçeklenmesi', 'Yedekleme sıklığının iş yüküne göre ayarlanması'],
  'dp300#42': ['sys.dm_db_missing_index_details', 'sys.dm_os_performance_counters', 'sys.dm_exec_requests ve sys.dm_exec_sessions', 'sys.dm_tran_locks ve sys.dm_os_waiting_tasks'],
  'dp300#43': ['Önce Query Store ile eski düzeyde temel toplamak', 'Otomatik istatistikleri kapatıp düzeyi yükseltmek', 'Tüm indeksleri silip yeni düzeyde yeniden oluşturmak', 'Yükseltmeden önce veritabanını küçültmek (shrink)'],
  'dp300#46': ['Grup, veritabanlarını sabit dinleyiciyle birlikte devreder', 'Coğrafi çoğaltma yalnızca aynı bölge içinde çalışır', 'Yük devretme grubunda ikincil kopya okunamaz', 'İkisi de yalnızca Managed Instance için kullanılabilir'],
  'dp300#47': ['Saklama süresi içinde geri yükleyerek', 'Geri getirilemez; silme işlemi kalıcıdır', 'Yalnızca Microsoft desteğine talep açarak', 'Coğrafi çoğaltmayı tersine çevirip ikinciden alarak'],
  'dp300#48': ['Bölgedeki tek bir veri merkezi arızasına', 'Tüm Azure bölgesinin kapanmasına', 'Kullanıcının yanlışlıkla sildiği satırlara', 'Uygulama kodundaki mantık hatalarına'],
  'dp300#49': ['Database Migration Service ile çevrim içi geçiş', 'Yedek dosyasını taşıyıp gece geri yüklemek', 'Tüm tabloları CSV olarak dışa aktarıp yüklemek', 'Veritabanını kapatıp veri dosyalarını kopyalamak'],
  'gda#24': ['Veri temizlenir ve doğrulanır', 'Paydaşlarla iş sorusu ve başarı ölçütü belirlenir', 'Bulgular görselleştirilip paydaşlara sunulur', 'Gerekli veri kaynakları bulunup toplanır'],
  'gda#26': ['Müşterilerin açık uçlu yorumları', 'Gün başına verilen sipariş sayısı', 'Kategori başına ortalama sepet tutarı', 'Bir sayfada geçirilen ortalama saniye'],
  'gda#29': ['CREATE TABLE yeni AS SELECT DISTINCT * FROM eski', 'DELETE FROM eski WHERE DISTINCT tüm sütunlar', 'ALTER TABLE eski REMOVE DUPLICATE ROWS', 'SELECT UNIQUE * INTO yeni FROM eski'],
  'gda#30': ['email dışındaki tüm sütunları getirir', 'email sütunu boş olan satırları hariç tutar', 'Hata verir; EXCEPT yalnızca küme işlemidir', 'Yalnızca email sütununu tekrarsız getirir'],
  'gda#31': ['SUM(CASE WHEN x > 0 THEN 1 ELSE 0 END)', 'COUNT(x), çünkü NULL olmayanları sayar', 'COUNT(DISTINCT x) WHERE x > 0', 'MAX(CASE WHEN x > 0 THEN x END)'],
  'gda#34': ['Bölüm sütununa doğrudan filtre koymak', 'Sorgunun sonuna LIMIT 100 eklemek', 'Sonucu bölüm sütununa göre ORDER BY ile sıralamak', 'Sütun seçmek yerine SELECT * kullanmak'],
  'gda#35': ['Filtrede okunan blokları azaltır', 'Tabloyu birden çok bölgeye otomatik kopyalar', 'Sorgu sonuçlarını 24 saat önbelleğe alır', 'Satırları müşteri anahtarlarıyla şifreler'],
  'gda#36': ['Sorgu çalıştırmadığı için ücret doğurmaz', 'Tüm tabloyu tarar ve taranan bayt kadar ücretlenir', 'Yalnızca kümelenmiş tablolarda kullanılabilir', 'Önizlenen satırları geçici bir tabloya yazar'],
  'gda#38': ['JOIN ile eşleşen değeri getirmek', 'GROUP BY ile anahtara göre değerleri toplamak', 'ORDER BY ile anahtar sütununa göre sıralamak', 'UNION ALL ile iki tabloyu alt alta eklemek'],
  'gda#39': ['Renge ek olarak etiket veya şekil kullanmak', 'Kırmızı ve yeşili zıt anlamlar için kullanmak', 'Karışıklığı önlemek için tüm serileri aynı renkte göstermek', 'Kalabalığı azaltmak için açıklamayı (legend) kaldırmak'],
  'dbx#19': ['Yalnızca meta veri silinir', 'Meta veriyle birlikte veri dosyaları da silinir', 'Tablo 30 gün boyunca arşive taşınır', 'Hata verir; harici tablolar silinemez'],
  'dbx#20': ['USE CATALOG, USE SCHEMA ve SELECT', 'Yalnızca tablo üzerinde SELECT yetkisi', 'Şema üzerinde ALL PRIVILEGES yetkisi', 'Katalogda OWNER ve tabloda MODIFY yetkisi'],
  'dbx#21': ['Unity Catalog lineage', 'DESCRIBE HISTORY komutu', 'Query Profile ekranı', 'OPTIMIZE ve VACUUM çıktısı'],
  'dbx#22': ['İşlem günlüğüne (_delta_log) yazarak', 'Her yazmada tabloyu kilitleyip kopyalayarak', 'Verilerin tamamını küme belleğinde tutarak', 'Her satıra değişiklik zaman damgası ekleyerek'],
  'dbx#23': ['Tabloyu 5. sürüme geri döndürür', '5. sürümü yeni bir tabloya kopyalar', 'Son 5 sürümü geçmişten kalıcı olarak siler', 'Yalnızca 5. sürümü okur, tabloyu değiştirmez'],
  'dbx#24': ['İlgili değerleri aynı dosyalarda toplar', 'Satırları alfabetik sıralayıp sonuçta öyle gösterir', 'Saklama süresi dolan eski sürümleri siler', 'Yeni gelen sütunlar için şemayı genişletir'],
  'dbx#25': ['Şema uygulaması nedeniyle hata verir', 'Yeni sütun tabloya sessizce eklenir', 'Fazla sütun atılır ve kalan veri eklenir', 'Tablo yeni şemayla yeniden oluşturulur'],
  'dbx#26': ['Temizlenmiş ve birleştirilmiş veri', 'Kaynaktan geldiği gibi saklanan ham veri', 'Panolar için toplanmış iş metrikleri', 'Felaket kurtarma için tutulan yedek kopyalar'],
  'dbx#27': ['Raporlara hazır toplanmış tablolar', 'Kaynaktan gelen ham olay kayıtları', 'Dönüşüm sırasında oluşan geçici dosyalar', 'Şifrelenmiş kişisel veri içeren tablolar'],
  'dbx#29': ['JSON yolundaki alanı okur', 'Sütunu iki nokta işaretinden ikiye böler', 'Hata verir; JSON için from_json gerekir', 'Tabloyu musteri tablosuyla örtük birleştirir'],
  'dbx#31': ['Pano zamanlaması ve aboneler', 'Tablo üzerinde OPTIMIZE komutu', 'Sorgu için Query Profile ekranı', 'Catalog Explorer\'daki tablo ayrıntıları'],
  'dbx#32': ['Parametre sorguyu yeniden çalıştırır', 'İkisi de sorguyu her değişimde yeniden çalıştırır', 'Filtre veritabanında geçici bir indeks oluşturur', 'Parametre yalnızca metin, filtre yalnızca sayı alır'],
  'dbx#33': ['SQL fonksiyonu ROW FILTER veya MASK olarak bağlanır', 'Her kullanıcıya tablonun ayrı bir kopyası verilir', 'Panoya kullanıcıya göre değişen filtre eklenir', 'Delta işlem günlüğü kullanıcıya göre düzenlenir'],
  'dbx#34': ['Boşta kalınca warehouse\'u durdurur', 'Belirli süreyi aşan sorguları iptal eder', 'Warehouse\'u boşta en küçük boyuta indirir', 'Bir saat sonra sorgu sonuçlarını siler'],
  'snow#23': ['Bağımsız ölçeklenir, ayrı ücretlenir', 'Her zaman birlikte ve aynı oranda büyür', 'Veri, ambarın yerel diskinde kalıcı tutulur', 'Yalnızca işlem ücretlenir, depolama ücretsizdir'],
  'snow#25': ['Saniye bazında; başlatmada en az 60 saniye', 'Saat bazında; başlayan her saat tam ödenir', 'Çalıştırılan sorgu sayısına göre', 'Sorguların taradığı bayt miktarına göre'],
  'snow#26': ['24 saat; kullanıldıkça yenilenir', '1 saat; sonra otomatik silinir', 'Ambar açık kaldığı sürece tutulur', 'Tablo silinene kadar süresiz tutulur'],
  'snow#28': ['Hatalı satırları atlayıp devam eder', 'İlk hatada yüklemeyi durdurup geri alır', 'Hatalı satır içeren dosyayı stage\'den siler', 'Hatalı satırların değerlerini NULL ile doldurur'],
  'snow#29': ['Bulut depolama konumuna işaret eden nesne', 'Snowflake içinde her kullanıcıya ayrılan alan', 'Kullanıcının yerel bilgisayarındaki bir klasör', 'Başka bir Snowflake hesabındaki veritabanı'],
  'snow#30': ['Dizinin her bir elemanı', 'Açılan dizinin toplam uzunluğu', 'Elemanın dizideki sıra numarası', 'Kaynak JSON belgesinin tamamı'],
  'snow#33': ['Fail-safe yoktur; Time Travel en çok 1 gün', 'Oturum kapanınca otomatik olarak silinir', 'Time Travel süresi her zaman 90 gündür', 'Başka hesaplarla hiçbir şekilde paylaşılamaz'],
  'snow#34': ['Ambar ve veritabanı nesnelerini yönetmek', 'Kullanıcı ve rolleri oluşturup atamak', 'Hesabın faturalandırmasını yönetmek', 'Hesap için ağ politikalarını tanımlamak'],
  'snow#35': ['Satır erişim politikası', 'Sütun maskeleme politikası', 'Hesap düzeyinde ağ politikası', 'Kredi için kaynak izleyici'],
  'snow#36': ['Ağ politikası', 'Kaynak izleyici (resource monitor)', 'Satır erişim politikası', 'Kullanıcıya özel dosya biçimi'],
  'snow#37': ['Çok büyük tablolarda sık filtrelenen sütunlar', 'Her küçük tabloda varsayılan olarak', 'Yalnızca VARIANT (JSON) sütunlarında', 'Sık güncellenen küçük boyut tablolarında'],
  'snow#38': ['Seçici eşitlik (nokta) aramalarını', 'Tüm tabloyu tarayan toplama sorgularını', 'COPY INTO ile toplu veri yüklemelerini', 'Sonuç önbelleğinden dönen sorguları'],
  'snow#39': ['Tablodaki değişiklikleri izler', 'Stage\'e gelen dosyaları sürekli yükler', 'SQL ifadelerini belirli aralıklarla zamanlar', 'Tabloyu başka bir hesaba sürekli kopyalar'],
  'tsql#35': ['ISNULL iki değer alır ve ilk değerin tipini kullanır', 'COALESCE yalnızca sayısal değerlerle çalışır', 'ISNULL standart SQL\'dir, COALESCE ise T-SQL\'e özgüdür', 'Aralarında fark yoktur; ikisi de aynı tipi döndürür'],
  'tsql#36': ['Çoğu zaman geçerli satırın değerini', 'Bölümün son satırının değerini', 'Bölümün ilk satırının değerini', 'Çerçeve eksik olduğu için NULL'],
  'tsql#39': ['UPDATE t SET x = s.x FROM t JOIN s ON s.id = t.id', 'UPDATE t JOIN s ON s.id = t.id SET t.x = s.x', 'UPDATE t SET x = s.x USING s WHERE s.id = t.id', 'MERGE t SET x = s.x FROM s WHERE s.id = t.id'],
  'tsql#43': ['Son ifadenin etkilediği satır sayısını', 'Tablonun toplam satır sayısını', 'Oturumdaki açık işlem sayısını', 'Son eklenen IDENTITY değerini'],
  'tsql#44': ['Tüm işlemi geri alır; @@TRANCOUNT 0 olur', 'Yalnızca içteki işlemi geri alır', '@@TRANCOUNT\'ı yalnızca 1 azaltır', 'Hata verir; önce iç işlem kapanmalı']
};
Object.keys(FIX).forEach(k => { const [id, i] = k.split('#'); const x = EM[id] && EM[id].qs[+i]; if (x && FIX[k].length === x.o.length) x.o = FIX[k]; });

/* ============================ PATİKALAR ============================ */
const P = window.SQLP_PATHS;
const ins = (pid, afterId, ids) => { const p = PA[pid]; if (!p) return; ids = ids.filter(x => !p.lessons.includes(x)); const i = p.lessons.indexOf(afterId); if (i < 0) return; p.lessons.splice(i + 1, 0, ...ids); };
ins('sertifika', 'oracle-1z0', ['lab-z071']);
ins('tsql', 'cert-tsql', ['lab-tsql']);
P.push({ id: 'sert-mssql', name: 'Microsoft SQL Sertifika Hazırlık', short: 'MS', color: '#2563EB',
  desc: 'T-SQL sorgulama ve Azure SQL yönetimi (DP-300) için ayrı hazırlık öğrenme yolu.',
  long: 'SQL Server ve Azure SQL sertifikalarına hazırlananlar için. Önce T-SQL sorgulamanın sınavda sık çıkan yapılarını (TOP, APPLY, pencere fonksiyonları, hata yönetimi, işlemler) T-SQL yazımıyla çalışırsın; ardından Azure SQL\'in yönetim konularına (dağıtım seçenekleri, güvenlik, izleme, performans, yüksek erişilebilirlik) geçersin. Öğrenme yolu T-SQL kodlama laboratuvarı ve iki çoktan seçmeli denemeyle biter.',
  skills: ['T-SQL sözdizimi', 'APPLY ve TOP', 'Hata yönetimi', 'İşlemler', 'Azure SQL dağıtım seçenekleri', 'Güvenlik', 'İzleme ve performans', 'HA/DR'],
  lessons: ['sertifika-rehber', 'lehceler', 'cert-tsql', 'lab-tsql', 'pencere-cerceve', 'rollup', 'transaction', 'index', 'guvenlik', 'dba-yedek', 'dba-izleme', 'dba-ha', 'azure-sql', 'dp300-yonetim'].filter(id => L.some(l => l.id === id)),
  comp: [
    { t: 'T-SQL sorgulama', d: 'Sınavda sık çıkan T-SQL yapıları', l: ['cert-tsql', 'lab-tsql', 'pencere-cerceve', 'rollup'] },
    { t: 'Veritabanı yönetimi', d: 'İşlem, indeks, güvenlik, yedek ve izleme', l: ['transaction', 'index', 'guvenlik', 'dba-yedek', 'dba-izleme', 'dba-ha'] },
    { t: 'Azure SQL', d: 'Dağıtım seçenekleri ve DP-300 konuları', l: ['azure-sql', 'dp300-yonetim'] }
  ],
  beyond: ['Sınavlar: T-SQL Kodlama Laboratuvarı', 'Sınavlar: T-SQL Sorgulama ve DP-300 denemeleri', 'Azure portalında uygulamalı çalışma (ücretsiz deneme hesabı)', 'Resmi Microsoft Learn öğrenme yolları'] });
P.push({ id: 'sert-bulut', name: 'Bulut Veri Sertifikaları Hazırlık', short: 'BLT', color: '#0E7490',
  desc: 'Google Data Analytics / BigQuery, Databricks ve Snowflake sınavları için ayrı hazırlık öğrenme yolu.',
  long: 'Bulut veri platformlarının sertifikalarına hazırlananlar için. Önce analiz sürecini ve BigQuery yazımını laboratuvarla çalışırsın, sonra bulut veri ambarlarının ortak kavramlarına (depolama ve işlem ayrımı, bölümleme, maliyet, yarı yapısal veri) ve Databricks ile Snowflake\'e özgü konulara geçersin. Her sınav için ayrı çoktan seçmeli deneme ve BigQuery kodlama laboratuvarı vardır.',
  skills: ['Analiz süreci', 'BigQuery sözdizimi', 'Diziler ve UNNEST', 'Maliyet ve bölümleme', 'Lakehouse ve Delta', 'Snowflake mimarisi', 'Yarı yapısal veri'],
  lessons: ['sertifika-rehber', 'cert-gda', 'bq-giris', 'lab-gda', 'bq-dizi', 'bq-kisayol', 'bq-maliyet', 'dwh-bulut', 'json', 'cert-dbx-snow'].filter(id => L.some(l => l.id === id)),
  comp: [
    { t: 'Google ve BigQuery', d: 'Analiz süreci, BigQuery yazımı ve maliyet', l: ['cert-gda', 'bq-giris', 'lab-gda', 'bq-dizi', 'bq-kisayol', 'bq-maliyet'] },
    { t: 'Bulut veri ambarları', d: 'Ortak kavramlar, Databricks ve Snowflake', l: ['dwh-bulut', 'json', 'cert-dbx-snow'] }
  ],
  beyond: ['Sınavlar: BigQuery Kodlama Laboratuvarı', 'Sınavlar: GDA, Databricks ve SnowPro denemeleri', 'BigQuery sandbox ile ücretsiz uygulama', 'Databricks Free Edition ve Snowflake deneme hesabı'] });
})();
