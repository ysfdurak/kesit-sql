/* Kesit SQL içerik 6: kaynak taramasıyla bulunan eksik konular
   (araçlar, aritmetik, koşullu toplama, regex, metin benzerliği, takvim, BI ve raporlama,
   analist metrikleri, olasılık, dbt, vaka çalışmaları) */
(function () {
const L = window.SQLP_LESSONS = window.SQLP_LESSONS || [];
const after = (id, lessons) => { const i = L.findIndex(l => l.id === id); L.splice(i < 0 ? L.length : i + 1, 0, ...lessons); };
const TS = (src, v, o) => CODE(src, v || null, Object.assign({ base: 'tsql' }, o || {}));
const NR = src => CODE(src, null, { norun: true });
const mc = (q, o, a, why) => ({ t: 'mc', q, o, a, why });
const NET = 'oi.quantity * oi.unit_price * (1 - oi.discount)';
const TR = [['İ', 'I'], ['ı', 'i'], ['Ş', 'S'], ['ş', 's'], ['Ğ', 'G'], ['ğ', 'g'], ['Ü', 'U'], ['ü', 'u'], ['Ö', 'O'], ['ö', 'o'], ['Ç', 'C'], ['ç', 'c']];
const nestRep = x => TR.reduce((a, [f, t]) => `REPLACE(${a}, '${f}', '${t}')`, x);
const RX4 = ['tsql', 'pg', 'mysql', 'oracle'];

/* ======================= Temeller ======================= */
after('veri-seti', [{
  id: 'araclar', lv: 'A1', mod: 'Temeller', min: 10,
  title: 'SQL nerede yazılır? Araçlar ve komut grupları',
  sum: 'SSMS, DBeaver, pgAdmin gibi araçlar; DDL, DML, DCL, TCL ayrımı.',
  body: `
<h2>Sunucu ve istemci</h2>
<p>Veritabanı bir <b>sunucu</b> programıdır (SQL Server, PostgreSQL, MySQL, Oracle). Sorguyu ise bir <b>istemci araçta</b> yazarsın; araç sorguyu sunucuya gönderir, sonucu tablo olarak gösterir. Bu uygulamada istemci de veritabanı da tarayıcının içinde çalışır. İş hayatında ise genellikle şu araçlardan birini kullanırsın:</p>
<table>
<tr><th>SQL türü</th><th>Resmi araç</th><th>Not</th></tr>
<tr><td>SQL Server</td><td>SQL Server Management Studio (SSMS)</td><td>Windows'ta en yaygın araç. VS Code için resmi <b>MSSQL eklentisi</b> de var.</td></tr>
<tr><td>PostgreSQL</td><td>pgAdmin, psql (komut satırı)</td><td>psql, sunucu yönetiminde çok kullanılır.</td></tr>
<tr><td>MySQL</td><td>MySQL Workbench</td><td>Modelleme (ER diyagramı) özellikleri de vardır.</td></tr>
<tr><td>Oracle</td><td>SQL Developer, SQL*Plus</td><td>PL/SQL geliştirme için.</td></tr>
<tr><td>SQLite</td><td>DB Browser for SQLite</td><td>Tek dosyalık veritabanlarını açar.</td></tr>
<tr><td>Hepsi</td><td>DBeaver, DataGrip, VS Code</td><td>Birden çok SQL türüyle çalışanlar için tek araç.</td></tr>
</table>
<div class="tip"><b>Kendi bilgisayarında denemek istersen</b>SQL Server'ın <b>Developer</b> ve <b>Express</b> sürümleri, PostgreSQL ve MySQL'in topluluk sürümleri ücretsizdir. Docker biliyorsan tek komutla bir veritabanı sunucusu başlatabilirsin.</div>
<h2>Sorgu nasıl çalıştırılır?</h2>
<ul>
<li><b>SSMS:</b> F5 veya Ctrl+E. Bir bölümü seçip F5'e basarsan <b>yalnızca seçili kısım</b> çalışır; bu, uzun betiklerde en çok kullanılan alışkanlıktır.</li>
<li><b>SSMS'te GO:</b> Betiği “batch”lere böler. GO bir SQL komutu değil, aracın ayırıcısıdır.</li>
<li><b>pgAdmin / DBeaver:</b> Ctrl+Enter (imlecin bulunduğu ifade) ya da F5.</li>
<li><b>Bu uygulama:</b> Ctrl+Enter (Mac'te ⌘+Enter) sorguyu kontrol eder.</li>
</ul>
<h2>SQL komut grupları</h2>
<p>SQL komutları ne iş yaptıklarına göre beş gruba ayrılır. İş ilanlarında ve mülakatlarda bu kısaltmalar sık geçer:</p>
<table>
<tr><th>Grup</th><th>Açılımı</th><th>Komutlar</th><th>Ne yapar?</th></tr>
<tr><td><b>DQL</b></td><td>Data Query Language</td><td><code>SELECT</code></td><td>Veriyi okur</td></tr>
<tr><td><b>DML</b></td><td>Data Manipulation Language</td><td><code>INSERT</code>, <code>UPDATE</code>, <code>DELETE</code>, <code>MERGE</code></td><td>Veriyi değiştirir</td></tr>
<tr><td><b>DDL</b></td><td>Data Definition Language</td><td><code>CREATE</code>, <code>ALTER</code>, <code>DROP</code>, <code>TRUNCATE</code></td><td>Tablo gibi nesneleri tanımlar</td></tr>
<tr><td><b>DCL</b></td><td>Data Control Language</td><td><code>GRANT</code>, <code>REVOKE</code>, <code>DENY</code></td><td>Yetki verir veya alır</td></tr>
<tr><td><b>TCL</b></td><td>Transaction Control Language</td><td><code>BEGIN</code>, <code>COMMIT</code>, <code>ROLLBACK</code>, <code>SAVEPOINT</code></td><td>İşlemleri yönetir</td></tr>
</table>
<div class="note"><b>Bazı kaynaklar DQL'i ayırmaz</b>SELECT'i DML'in içinde sayan kitaplar da var. Önemli olan ayrım şudur: veriyi mi değiştiriyorsun, yapıyı mı, yetkiyi mi?</div>
`,
  ex: [
    mc('<p><code>TRUNCATE TABLE</code> hangi komut grubundandır?</p>', ['DML', 'DDL', 'DCL', 'TCL'], 1, 'TRUNCATE tabloyu satır satır silmez, tablonun veri sayfalarını serbest bırakır; bu yüzden DDL sayılır. DELETE ise DML\'dir.'),
    mc('<p>Bir kullanıcıya <code>orders</code> tablosunu okuma izni vermek için hangi grup kullanılır?</p>', ['DDL', 'DML', 'DCL', 'DQL'], 2, 'GRANT SELECT ON orders TO kullanici; bir DCL komutudur.'),
    mc('<p>SSMS\'te 200 satırlık bir betiğin yalnızca 3 satırını seçip F5\'e basarsan ne olur?</p>', ['Tüm betik çalışır', 'Yalnızca seçili satırlar çalışır', 'Hata verir', 'Betik kaydedilir'], 1, 'Seçili kısmı çalıştırmak, uzun betiklerde adım adım ilerlemenin en yaygın yoludur.')
  ]
}]);

after('alias-distinct', [{
  id: 'hesaplama', lv: 'A1', mod: 'Temeller', min: 12,
  title: 'Hesaplanan sütunlar ve aritmetik',
  sum: 'Dört işlem, mod, yuvarlama ve kâr marjı gibi türetilmiş sütunlar.',
  body: `
<h2>Sütunlarla hesap yapmak</h2>
<p>SELECT listesinde yalnızca sütun değil, <b>ifade</b> de yazabilirsin. Her satır için hesaplanır ve sonuçta yeni bir sütun olarak görünür. Bu sütuna <code>AS</code> ile anlamlı bir ad vermek iyi bir alışkanlıktır.</p>
<pre class="code">SELECT name,
       price,
       cost,
       price - cost AS birim_kar,
       ROUND(100.0 * (price - cost) / price, 1) AS kar_marji
FROM products
ORDER BY kar_marji DESC
LIMIT 5;</pre>
<table>
<tr><th>Operatör</th><th>Anlamı</th><th>Örnek</th></tr>
<tr><td><code>+ - * /</code></td><td>Dört işlem</td><td><code>price * 1.2</code></td></tr>
<tr><td><code>%</code></td><td>Bölümden kalan (Oracle'da <code>MOD(a, b)</code>)</td><td><code>order_id % 2</code></td></tr>
<tr><td><code>( )</code></td><td>Öncelik</td><td><code>(price - cost) / price</code></td></tr>
</table>
<h2>İşlem önceliği</h2>
<p>Matematikteki gibi önce çarpma ve bölme, sonra toplama ve çıkarma yapılır. <code>price - cost / price</code> ile <code>(price - cost) / price</code> çok farklı sonuç verir. Emin değilsen parantez kullan.</p>
<h2>Tam sayı bölmesi tuzağı</h2>
<p>İki tam sayıyı bölmek, SQL türüne göre farklı sonuç verir. SQL Server, PostgreSQL ve SQLite küsuratı atar; MySQL ve Oracle ondalıklı sonuç döndürür. SQL türü sekmelerini değiştirip çıktıya bak:</p>
${CODE("SELECT 7 / 2 AS tam_bolme,\n       7 % 2 AS kalan,\n       7 / 2.0 AS ondalikli;", { oracle: 'SELECT 7 / 2 AS tam_bolme,\n       MOD(7, 2) AS kalan,\n       7 / 2.0 AS ondalikli\nFROM dual;' }, { diff: ['mysql', 'oracle'] })}
<div class="tip"><b>Oran hesaplarken</b>Sayılardan birini ondalıklı yap: <code>100.0 * a / b</code> veya <code>CAST(a AS DECIMAL(10,2)) / b</code>. Bu tek alışkanlık, raporlardaki en yaygın hatayı önler.</div>
<h2>Yuvarlama ve matematik fonksiyonları</h2>
<pre class="code">SELECT name,
       price,
       ROUND(price / 3.0, 2) AS ucte_bir,
       FLOOR(price / 1000) AS bin_tl_dilimi,
       ABS(cost - price) AS fark
FROM products
LIMIT 5;</pre>
<table>
<tr><th>Fonksiyon</th><th>Ne yapar?</th></tr>
<tr><td><code>ROUND(x, n)</code></td><td>n basamağa yuvarlar</td></tr>
<tr><td><code>FLOOR(x)</code> / <code>CEILING(x)</code></td><td>Aşağı / yukarı tam sayıya (PostgreSQL ve Oracle'da <code>CEIL</code>)</td></tr>
<tr><td><code>ABS(x)</code></td><td>Mutlak değer</td></tr>
<tr><td><code>POWER(x, y)</code>, <code>SQRT(x)</code></td><td>Üs alma, karekök</td></tr>
</table>
<div class="warn"><b>NULL ile aritmetik</b>Bir işlemde değerlerden biri NULL ise sonuç da NULL olur: <code>100 + NULL = NULL</code>. Bunu COALESCE dersinde çözeceğiz.</div>
`,
  ex: [
    { t: 'sql', q: '<p>Her ürünün <code>name</code>, <code>price</code>, <code>cost</code> değerlerini ve birim kârını (<code>kar</code> = fiyat − maliyet) getir. Kâra göre büyükten küçüğe sıralayıp <b>ilk 5</b> ürünü göster.</p>', sol: 'SELECT name, price, cost, price - cost AS kar FROM products ORDER BY kar DESC LIMIT 5;', ord: true },
    { t: 'sql', q: '<p><b>Kitap</b> kategorisindeki ürünlerin adını ve %20 KDV dahil fiyatını (<code>kdvli</code>, 2 basamak) getir.</p>', sol: "SELECT name, ROUND(price * 1.2, 2) AS kdvli FROM products WHERE category = 'Kitap';", hint: 'Fiyatı 1.2 ile çarp ve ROUND(..., 2) ile yuvarla.' },
    { t: 'sql', q: '<p>Her ürün için stoktaki malın maliyet değerini (<code>stok_degeri</code> = stock × cost) hesapla ve kategori bazında topla: <code>category</code>, <code>stok_degeri</code> (tam sayıya yuvarla).</p>', sol: 'SELECT category, ROUND(SUM(stock * cost), 0) AS stok_degeri FROM products GROUP BY category;' },
    mc('<p>SQL Server\'da <code>SELECT 10 / 4</code> sonucu nedir?</p>', ['2.5', '2', '3', 'Hata'], 1, 'İki tam sayı bölündüğü için sonuç da tam sayıdır ve küsurat atılır. 2.5 için 10 / 4.0 yazmalısın.')
  ]
}]);

/* ======================= Fonksiyonlar ======================= */
after('coalesce', [{
  id: 'kosullu', lv: 'A2', mod: 'Fonksiyonlar', min: 12,
  title: 'Koşullu sayım ve oranlar: SUM(CASE WHEN …)',
  sum: 'Tek sorguda birden çok koşulu saymak ve oran hesaplamak.',
  body: `
<h2>Bir sorguda birden çok sayım</h2>
<p>“Her kanalda kaç sipariş var, bunların kaçı iptal, iptal oranı ne?” sorusunu tek sorguda yanıtlamak için CASE ifadesini toplama fonksiyonunun <b>içine</b> koyarız. Analist raporlarının belki de en sık kullanılan kalıbı budur.</p>
<pre class="code">SELECT channel,
       COUNT(*) AS siparis,
       SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS iptal,
       ROUND(100.0 * SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) / COUNT(*), 1) AS iptal_orani
FROM orders
GROUP BY channel;</pre>
<h3>Üç eşdeğer yazım</h3>
<table>
<tr><th>Yazım</th><th>Açıklama</th></tr>
<tr><td><code>SUM(CASE WHEN koşul THEN 1 ELSE 0 END)</code></td><td>Her SQL türünde çalışır. En yaygın yazım.</td></tr>
<tr><td><code>COUNT(CASE WHEN koşul THEN 1 END)</code></td><td>ELSE yazılmayınca NULL döner; COUNT NULL'ları saymaz.</td></tr>
<tr><td><code>COUNT(*) FILTER (WHERE koşul)</code></td><td>Standart SQL. PostgreSQL ve SQLite'ta var; SQL Server, MySQL ve Oracle'da yok.</td></tr>
</table>
${CODE("SELECT channel,\n       COUNT(*) FILTER (WHERE status = 'returned') AS iade\nFROM orders\nGROUP BY channel;", { sqlite: "SELECT channel,\n       COUNT(*) FILTER (WHERE status = 'returned') AS iade\nFROM orders\nGROUP BY channel;" }, { base: 'pg' })}
<h2>Oran için AVG hilesi</h2>
<p>Koşul sağlanınca 1, sağlanmayınca 0 olan bir sütunun ortalaması, koşulun <b>oranıdır</b>. Ondalıklı sonuç için <code>1.0</code> kullan:</p>
<pre class="code">SELECT segment,
       ROUND(AVG(CASE WHEN city IS NULL THEN 1.0 ELSE 0 END), 3) AS sehirsiz_orani
FROM customers
GROUP BY segment;</pre>
<div class="tip"><b>Satırları sütuna çevirmek</b>Aynı kalıp “pivot” yapmanın taşınabilir yoludur: her durum için bir SUM(CASE…) sütunu yazarsın. Pivot dersinde bunu genişleteceğiz.</div>
`,
  ex: [
    { t: 'sql', q: '<p>Her <code>segment</code> için müşteri sayısını (<code>musteri</code>) ve şehri boş (NULL) olan müşteri sayısını (<code>sehirsiz</code>) getir.</p>', sol: 'SELECT segment, COUNT(*) AS musteri, SUM(CASE WHEN city IS NULL THEN 1 ELSE 0 END) AS sehirsiz FROM customers GROUP BY segment;' },
    { t: 'sql', q: '<p>Her yıl için teslim edilen (<code>delivered</code>) ve iade edilen (<code>returned</code>) sipariş sayılarını getir: <code>yil</code>, <code>teslim</code>, <code>iade</code>. Yıla göre sırala.</p>', sol: "SELECT strftime('%Y', order_date) AS yil, SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) AS teslim, SUM(CASE WHEN status = 'returned' THEN 1 ELSE 0 END) AS iade FROM orders GROUP BY strftime('%Y', order_date) ORDER BY yil;", ord: true, hint: 'Yılı tarih fonksiyonuyla al, her durum için ayrı bir SUM(CASE WHEN …) yaz.' },
    { t: 'sql', q: '<p>Her kategoride fiyatı <b>1000 TL\'den yüksek</b> ürünlerin oranını yüzde olarak (1 basamak) getir: <code>category</code>, <code>pahali_orani</code>.</p>', sol: 'SELECT category, ROUND(100.0 * SUM(CASE WHEN price > 1000 THEN 1 ELSE 0 END) / COUNT(*), 1) AS pahali_orani FROM products GROUP BY category;' }
  ]
}, {
  id: 'regex', lv: 'B1', mod: 'Fonksiyonlar', min: 15,
  title: 'Desen eşleme: LIKE\'tan düzenli ifadelere (REGEX)',
  sum: 'REGEXP_LIKE, REGEXP_REPLACE, REGEXP_SUBSTR ve SQL türleri arası farklar.',
  body: `
<h2>LIKE yetmediğinde</h2>
<p><code>LIKE</code> yalnızca iki joker bilir: <code>%</code> ve <code>_</code>. “İçinde rakam geçen e-postalar”, “birden fazla boşluk”, “@ işaretinden sonraki kısım” gibi işler için <b>düzenli ifadeler</b> (regular expressions, regex) kullanılır.</p>
<table>
<tr><th>Desen</th><th>Anlamı</th><th>Örnek</th></tr>
<tr><td><code>^</code> / <code>$</code></td><td>Metnin başı / sonu</td><td><code>^A</code>: A ile başlar</td></tr>
<tr><td><code>.</code></td><td>Herhangi bir karakter</td><td><code>a.c</code>: abc, a1c</td></tr>
<tr><td><code>[abc]</code>, <code>[0-9]</code></td><td>Kümeden bir karakter</td><td><code>[0-9]</code>: bir rakam</td></tr>
<tr><td><code>[^0-9]</code></td><td>Küme dışından bir karakter</td><td>rakam olmayan</td></tr>
<tr><td><code>*</code> <code>+</code> <code>?</code></td><td>0 veya daha çok / 1 veya daha çok / 0 ya da 1</td><td><code>[0-9]+</code>: bir veya daha çok rakam</td></tr>
<tr><td><code>{n}</code>, <code>{n,m}</code></td><td>Tam n kez / n ile m arası</td><td><code>[0-9]{4}</code>: 4 rakam</td></tr>
<tr><td><code>a|b</code></td><td>a veya b</td><td><code>gmail|hotmail</code></td></tr>
<tr><td><code>\\.</code></td><td>Özel karakterin kendisi</td><td><code>\\.com$</code></td></tr>
</table>
<h2>SQL türlerine göre regex</h2>
<table>
<tr><th>SQL türü</th><th>Eşleşiyor mu?</th><th>Değiştir</th><th>Parça al</th></tr>
<tr><td>SQL Server 2025</td><td><code>REGEXP_LIKE(s, p)</code></td><td><code>REGEXP_REPLACE</code></td><td><code>REGEXP_SUBSTR</code></td></tr>
<tr><td>PostgreSQL</td><td><code>s ~ p</code>, büyük/küçük harf duyarsız: <code>s ~* p</code></td><td><code>regexp_replace(s, p, r, 'g')</code></td><td><code>regexp_substr</code> (15+)</td></tr>
<tr><td>MySQL 8</td><td><code>s REGEXP p</code>, <code>REGEXP_LIKE</code></td><td><code>REGEXP_REPLACE</code></td><td><code>REGEXP_SUBSTR</code></td></tr>
<tr><td>Oracle</td><td><code>REGEXP_LIKE(s, p)</code> (yalnızca WHERE içinde)</td><td><code>REGEXP_REPLACE</code></td><td><code>REGEXP_SUBSTR</code></td></tr>
<tr><td>SQLite</td><td><code>s REGEXP p</code> (eklenti gerekir)</td><td colspan="2">Yerleşik değil</td></tr>
</table>
<div class="warn"><b>SQL Server'ın eski sürümleri</b>REGEXP fonksiyonları SQL Server 2025 ile geldi. Daha eski sürümlerde <code>LIKE '%[0-9]%'</code> ve <code>PATINDEX</code> ile idare edilir.</div>
<h3>Deseni sağlayan satırları bulmak</h3>
${TS("SELECT customer_id, email\nFROM customers\nWHERE REGEXP_LIKE(email, '^[a-z]+\\.[a-z]+@gmail\\.com$');", { pg: "SELECT customer_id, email\nFROM customers\nWHERE email ~ '^[a-z]+\\.[a-z]+@gmail\\.com$';", mysql: "SELECT customer_id, email\nFROM customers\nWHERE email REGEXP '^[a-z]+\\\\.[a-z]+@gmail\\\\.com$';", oracle: "SELECT customer_id, email\nFROM customers\nWHERE REGEXP_LIKE(email, '^[a-z]+\\.[a-z]+@gmail\\.com$');", sqlite: "SELECT customer_id, email\nFROM customers\nWHERE email REGEXP '^[a-z]+\\.[a-z]+@gmail\\.com$';" })}
<div class="note"><b>MySQL'de çift ters bölü</b>MySQL metin sabitlerinde <code>\\</code> kaçış karakteridir; desendeki <code>\\.</code> için <code>'\\\\.'</code> yazılır. Bunun yerine <code>[.]</code> yazmak her SQL türünde çalışır.</div>
<h3>Değiştirmek</h3>
<p>Ad soyad alanındaki fazladan boşlukları teke indirelim. PostgreSQL'de <code>'g'</code> bayrağı yazılmazsa yalnızca <b>ilk</b> eşleşme değişir; diğer SQL türleri varsayılan olarak hepsini değiştirir.</p>
${TS("SELECT id,\n       full_name,\n       TRIM(REGEXP_REPLACE(full_name, ' +', ' ')) AS temiz_ad\nFROM raw_signups;", { pg: "SELECT id,\n       full_name,\n       TRIM(regexp_replace(full_name, ' +', ' ', 'g')) AS temiz_ad\nFROM raw_signups;", mysql: "SELECT id,\n       full_name,\n       TRIM(REGEXP_REPLACE(full_name, ' +', ' ')) AS temiz_ad\nFROM raw_signups;", oracle: "SELECT id,\n       full_name,\n       TRIM(REGEXP_REPLACE(full_name, ' +', ' ')) AS temiz_ad\nFROM raw_signups;" })}
<h3>Parça almak</h3>
${TS("SELECT REGEXP_SUBSTR(email, '[^@]+$') AS alan_adi,\n       COUNT(*) AS musteri\nFROM customers\nWHERE email IS NOT NULL\nGROUP BY REGEXP_SUBSTR(email, '[^@]+$');", { pg: "SELECT regexp_substr(email, '[^@]+$') AS alan_adi,\n       COUNT(*) AS musteri\nFROM customers\nWHERE email IS NOT NULL\nGROUP BY regexp_substr(email, '[^@]+$');", mysql: "SELECT REGEXP_SUBSTR(email, '[^@]+$') AS alan_adi,\n       COUNT(*) AS musteri\nFROM customers\nWHERE email IS NOT NULL\nGROUP BY alan_adi;", oracle: "SELECT REGEXP_SUBSTR(email, '[^@]+$') AS alan_adi,\n       COUNT(*) AS musteri\nFROM customers\nWHERE email IS NOT NULL\nGROUP BY REGEXP_SUBSTR(email, '[^@]+$');" })}
<div class="tip"><b>Regex pahalıdır</b>Regex koşulları indeks kullanamaz ve her satırda çalışır. Büyük tablolarda önce basit bir filtreyle (tarih, durum) satır sayısını azalt.</div>
`,
  ex: [
    { t: 'sql', base: 'tsql', dl: RX4, q: '<p>E-posta adresinde <b>en az bir rakam</b> geçen müşterilerin <code>customer_id</code> ve <code>email</code> değerlerini getir.</p>', sol: "SELECT customer_id, email FROM customers WHERE REGEXP_LIKE(email, '[0-9]');", solv: { pg: "SELECT customer_id, email FROM customers WHERE email ~ '[0-9]';", mysql: "SELECT customer_id, email FROM customers WHERE email REGEXP '[0-9]';", oracle: "SELECT customer_id, email FROM customers WHERE REGEXP_LIKE(email, '[0-9]');" }, hint: 'Rakam deseni <code>[0-9]</code>. PostgreSQL\'de <code>~</code>, MySQL\'de <code>REGEXP</code>, SQL Server ve Oracle\'da <code>REGEXP_LIKE</code>.' },
    { t: 'sql', base: 'tsql', dl: RX4, q: '<p><code>raw_signups</code> tablosunda <code>full_name</code> içindeki art arda boşlukları teke indir ve baştaki/sondaki boşlukları kırp: <code>id</code>, <code>temiz_ad</code>.</p>', sol: "SELECT id, TRIM(REGEXP_REPLACE(full_name, ' +', ' ')) AS temiz_ad FROM raw_signups;", solv: { pg: "SELECT id, TRIM(regexp_replace(full_name, ' +', ' ', 'g')) AS temiz_ad FROM raw_signups;", mysql: "SELECT id, TRIM(REGEXP_REPLACE(full_name, ' +', ' ')) AS temiz_ad FROM raw_signups;", oracle: "SELECT id, TRIM(REGEXP_REPLACE(full_name, ' +', ' ')) AS temiz_ad FROM raw_signups;" }, hint: 'PostgreSQL kullanıyorsan <code>\'g\'</code> bayrağını unutma.' },
    { t: 'sql', base: 'tsql', dl: RX4, q: '<p>Müşteri e-postalarının <b>alan adına</b> (@ işaretinden sonrası) göre müşteri sayısını getir: <code>alan_adi</code>, <code>musteri</code>. E-postası boş olanları dışla.</p>', sol: "SELECT REGEXP_SUBSTR(email, '[^@]+$') AS alan_adi, COUNT(*) AS musteri FROM customers WHERE email IS NOT NULL GROUP BY REGEXP_SUBSTR(email, '[^@]+$');", solv: { pg: "SELECT regexp_substr(email, '[^@]+$') AS alan_adi, COUNT(*) AS musteri FROM customers WHERE email IS NOT NULL GROUP BY regexp_substr(email, '[^@]+$');", mysql: "SELECT REGEXP_SUBSTR(email, '[^@]+$') AS alan_adi, COUNT(*) AS musteri FROM customers WHERE email IS NOT NULL GROUP BY alan_adi;", oracle: "SELECT REGEXP_SUBSTR(email, '[^@]+$') AS alan_adi, COUNT(*) AS musteri FROM customers WHERE email IS NOT NULL GROUP BY REGEXP_SUBSTR(email, '[^@]+$');" } },
    mc('<p><code>^[0-9]{3}-[0-9]{4}$</code> deseni hangisiyle eşleşir?</p>', ['<code>12-3456</code>', '<code>123-4567</code>', '<code>tel: 123-4567</code>', '<code>1234567</code>'], 1, '^ ve $ tüm metnin desene uymasını ister: tam 3 rakam, tire, tam 4 rakam.')
  ]
}, {
  id: 'metin-benzerlik', lv: 'B1', mod: 'Fonksiyonlar', min: 14,
  title: 'Metin temizleme ve benzerlik: TRANSLATE, SOUNDEX, Levenshtein',
  sum: 'Türkçe karakterleri sadeleştirmek, yazım farklarını eşleştirmek.',
  body: `
<h2>Aynı şehir, beş farklı yazım</h2>
<p><code>raw_signups</code> tablosunda İstanbul; “ISTANBUL”, “istanbul”, “İstanbul” diye üç farklı biçimde geçiyor. Gruplamadan önce her değeri tek bir <b>anahtar</b> biçimine çevirmek gerekir: boşlukları kırp, Türkçe karakterleri sadeleştir, büyük harfe çevir.</p>
<h3>TRANSLATE: karakter karakter değiştir</h3>
<p><code>TRANSLATE(metin, 'bulunan', 'yerine')</code>, ikinci listedeki her karakteri üçüncü listede aynı sıradaki karakterle değiştirir. Tek tek REPLACE yazmaktan çok daha kısadır. SQL Server (2017+), PostgreSQL ve Oracle'da vardır; MySQL ve SQLite'ta iç içe REPLACE yazılır.</p>
${TS("SELECT DISTINCT city,\n       UPPER(TRANSLATE(TRIM(city), 'İıŞşĞğÜüÖöÇç', 'IiSsGgUuOoCc')) AS anahtar\nFROM raw_signups\nWHERE LEN(TRIM(city)) > 0;", { pg: "SELECT DISTINCT city,\n       UPPER(TRANSLATE(TRIM(city), 'İıŞşĞğÜüÖöÇç', 'IiSsGgUuOoCc')) AS anahtar\nFROM raw_signups\nWHERE LENGTH(TRIM(city)) > 0;", oracle: "SELECT DISTINCT city,\n       UPPER(TRANSLATE(TRIM(city), 'İıŞşĞğÜüÖöÇç', 'IiSsGgUuOoCc')) AS anahtar\nFROM raw_signups\nWHERE LENGTH(TRIM(city)) > 0;", mysql: "SELECT DISTINCT city,\n       UPPER(" + nestRep('TRIM(city)') + ") AS anahtar\nFROM raw_signups\nWHERE CHAR_LENGTH(TRIM(city)) > 0;", sqlite: "SELECT DISTINCT city,\n       UPPER(" + nestRep('TRIM(city)') + ") AS anahtar\nFROM raw_signups\nWHERE LENGTH(TRIM(city)) > 0;" })}
<div class="warn"><b>SQL Server'da TRANSLATE kuralı</b>İkinci ve üçüncü argüman aynı uzunlukta olmalı, yoksa hata verir. PostgreSQL ve Oracle'da üçüncü liste kısaysa fazlalık karakterler <b>silinir</b>: <code>TRANSLATE('a-b', '-', '')</code> → <code>ab</code>.</div>
<div class="note"><b>Neden <code>LEN(TRIM(city)) &gt; 0</code>?</b>Oracle boş metni ('') NULL kabul eder; <code>city &lt;&gt; ''</code> koşulu Oracle'da hiçbir satır döndürmez. Uzunluk kontrolü her SQL türünde aynı çalışır.</div>
<h2>Sesçil benzerlik: SOUNDEX ve DIFFERENCE</h2>
<p><code>SOUNDEX</code> bir kelimeyi okunuşuna göre 4 karakterlik bir koda çevirir: “Mehmet” ve “Mehmed” aynı kodu (M530) alır. SQL Server'daki <code>DIFFERENCE(a, b)</code> iki kodun kaç karakterinin tuttuğunu 0–4 arası verir.</p>
${TS("SELECT SOUNDEX('Mehmet') AS a,\n       SOUNDEX('Mehmed') AS b,\n       DIFFERENCE('Mehmet', 'Mehmed') AS benzerlik;", { pg: "-- fuzzystrmatch eklentisi gerekir: CREATE EXTENSION fuzzystrmatch;\nSELECT soundex('Mehmet') AS a,\n       soundex('Mehmed') AS b,\n       difference('Mehmet', 'Mehmed') AS benzerlik;" })}
<div class="warn"><b>Türkçe için sınırlı</b>SOUNDEX İngilizce okunuşa göre tasarlanmıştır; Türkçe karakterleri yok sayar veya yanlış kodlar. Türkçe isimlerde önce TRANSLATE ile sadeleştirip sonra kullan, sonuçları mutlaka gözle kontrol et.</div>
<h2>Düzenleme mesafesi: Levenshtein</h2>
<p>İki metni birbirine dönüştürmek için gereken en az harf ekleme, silme veya değiştirme sayısıdır: “Ankara” ile “Ankra” arasındaki mesafe 1'dir. Yazım hatalı kayıtları bulmak için idealdir.</p>
<table>
<tr><th>SQL türü</th><th>Fonksiyon</th></tr>
<tr><td>PostgreSQL</td><td><code>levenshtein(a, b)</code> (fuzzystrmatch eklentisi)</td></tr>
<tr><td>Oracle</td><td><code>UTL_MATCH.EDIT_DISTANCE(a, b)</code></td></tr>
<tr><td>SQL Server, MySQL</td><td>Yerleşik değil; kullanıcı tanımlı fonksiyon veya uygulama tarafında hesaplanır</td></tr>
</table>
${CODE("SELECT levenshtein('Ankara', 'Ankra') AS mesafe;", null, { base: 'pg' })}
`,
  ex: [
    { t: 'sql', base: 'tsql', q: '<p><code>raw_signups</code>\'taki şehirleri anahtar biçimine (kırpılmış, Türkçe karaktersiz, büyük harf) çevir ve her anahtar için kayıt sayısını getir: <code>anahtar</code>, <code>kayit</code>. Şehri boş olanları dışla.</p>', sol: "SELECT UPPER(TRANSLATE(TRIM(city), 'İıŞşĞğÜüÖöÇç', 'IiSsGgUuOoCc')) AS anahtar, COUNT(*) AS kayit FROM raw_signups WHERE LEN(TRIM(city)) > 0 GROUP BY UPPER(TRANSLATE(TRIM(city), 'İıŞşĞğÜüÖöÇç', 'IiSsGgUuOoCc'));", solv: { pg: "SELECT UPPER(TRANSLATE(TRIM(city), 'İıŞşĞğÜüÖöÇç', 'IiSsGgUuOoCc')) AS anahtar, COUNT(*) AS kayit FROM raw_signups WHERE LENGTH(TRIM(city)) > 0 GROUP BY 1;", oracle: "SELECT UPPER(TRANSLATE(TRIM(city), 'İıŞşĞğÜüÖöÇç', 'IiSsGgUuOoCc')) AS anahtar, COUNT(*) AS kayit FROM raw_signups WHERE LENGTH(TRIM(city)) > 0 GROUP BY UPPER(TRANSLATE(TRIM(city), 'İıŞşĞğÜüÖöÇç', 'IiSsGgUuOoCc'));", mysql: "SELECT UPPER(" + nestRep('TRIM(city)') + ") AS anahtar, COUNT(*) AS kayit FROM raw_signups WHERE CHAR_LENGTH(TRIM(city)) > 0 GROUP BY anahtar;", sqlite: "SELECT UPPER(" + nestRep('TRIM(city)') + ") AS anahtar, COUNT(*) AS kayit FROM raw_signups WHERE LENGTH(TRIM(city)) > 0 GROUP BY anahtar;" }, hint: 'Önce TRIM, sonra TRANSLATE (MySQL/SQLite\'ta iç içe REPLACE), en son UPPER. GROUP BY\'da aynı ifadeyi tekrar yaz.' },
    { t: 'sql', base: 'tsql', dl: ['tsql', 'pg'], q: '<p>Çalışanlar arasında adının <b>SOUNDEX kodu “Elif” ile aynı</b> olanların <code>emp_id</code> ve <code>first_name</code> değerlerini getir.</p>', sol: "SELECT emp_id, first_name FROM employees WHERE SOUNDEX(first_name) = SOUNDEX('Elif');", solv: { pg: "SELECT emp_id, first_name FROM employees WHERE soundex(first_name) = soundex('Elif');" } },
    mc('<p><code>levenshtein(\'Ankara\', \'Ankra\')</code> sonucu kaçtır?</p>', ['0', '1', '2', '5'], 1, 'Bir harf (a) silinince iki metin eşitlenir; mesafe 1\'dir.'),
    mc('<p>SQL Server\'da <code>TRANSLATE(\'abc\', \'ab\', \'x\')</code> ne döndürür?</p>', ['<code>xc</code>', '<code>xbc</code>', 'Hata verir', '<code>abc</code>'], 2, 'SQL Server ikinci ve üçüncü argümanın aynı uzunlukta olmasını ister (Msg 9828). PostgreSQL ve Oracle\'da sonuç “xc” olurdu.')
  ]
}]);

/* ======================= İleri sorgu: takvim ======================= */
after('recursive-cte', [{
  id: 'takvim', lv: 'B2', mod: 'İleri Sorgu Yapıları', min: 15,
  title: 'Tarih serisi ve takvim tablosu: eksik günleri doldurmak',
  sum: 'Özyinelemeli CTE, GENERATE_SERIES ve LEFT JOIN ile boşluksuz zaman serisi.',
  body: `
<h2>Sipariş olmayan gün raporda kaybolur</h2>
<p>Günlük sipariş sayısını <code>GROUP BY order_date</code> ile alırsan, hiç sipariş olmayan günler sonuçta <b>hiç görünmez</b>. Grafikte bu günler atlanır ve trend olduğundan iyi görünür. Çözüm: önce eksiksiz bir <b>gün listesi</b> üret, sonra veriyi ona <b>LEFT JOIN</b> ile bağla.</p>
<h3>1. Özyinelemeli CTE ile gün listesi (her SQL türünde)</h3>
<pre class="code">WITH RECURSIVE gunler(gun) AS (
    SELECT DATE('2024-12-01')
    UNION ALL
    SELECT DATE(gun, '+1 day') FROM gunler WHERE gun < '2024-12-31'
)
SELECT g.gun,
       COUNT(o.order_id) AS siparis
FROM gunler g
LEFT JOIN orders o ON o.order_date = g.gun
GROUP BY g.gun
ORDER BY g.gun;</pre>
<div class="warn"><b>SQL Server'da özyineleme sınırı</b>SQL Server varsayılan olarak en fazla 100 tur özyinelemeye izin verir. Bir yıllık seri (365 gün) için sorgunun sonuna <code>OPTION (MAXRECURSION 0)</code> eklemelisin.</div>
<h3>2. Hazır seri fonksiyonları</h3>
<p>SQL Server 2022 ve PostgreSQL seri üreten fonksiyonlara sahiptir; Oracle'da klasik yöntem <code>CONNECT BY LEVEL</code>'dır:</p>
${TS("SELECT DATEADD(day, value, '2024-12-01') AS gun\nFROM GENERATE_SERIES(0, 6);", { pg: "SELECT CAST(gun AS date) AS gun\nFROM generate_series(DATE '2024-12-01', DATE '2024-12-07', INTERVAL '1 day') AS gun;" })}
${NR("-- Oracle\nSELECT DATE '2024-12-01' + LEVEL - 1 AS gun\nFROM dual\nCONNECT BY LEVEL <= 7;")}
<h2>Takvim (tarih boyutu) tablosu</h2>
<p>Raporlama yapılan her veritabanında genellikle kalıcı bir <b>takvim tablosu</b> bulunur: her gün için bir satır ve hazır hesaplanmış sütunlar. Böylece “hafta sonu mu?”, “hangi çeyrek?”, “resmî tatil mi?” soruları her sorguda yeniden hesaplanmaz.</p>
<pre class="code">WITH RECURSIVE gunler(gun) AS (
    SELECT DATE('2024-12-01')
    UNION ALL
    SELECT DATE(gun, '+1 day') FROM gunler WHERE gun < '2024-12-31'
)
SELECT gun,
       CAST(strftime('%Y', gun) AS INTEGER) AS yil,
       CAST(strftime('%m', gun) AS INTEGER) AS ay,
       CAST(strftime('%w', gun) AS INTEGER) AS haftanin_gunu,
       CASE WHEN CAST(strftime('%w', gun) AS INTEGER) IN (0, 6) THEN 1 ELSE 0 END AS hafta_sonu
FROM gunler;</pre>
<div class="tip"><b>Takvim tablosuna eklenebilecekler</b>Resmî tatiller, mali yıl/çeyrek, ISO hafta numarası, ayın son iş günü, kampanya dönemleri. BI araçlarında (Power BI, Tableau) bu tablo “Date” boyutu olarak modele bağlanır.</div>
`,
  ex: [
    { t: 'sql', q: '<p>Kasım 2024\'ün <b>her günü</b> için web sitesindeki olay sayısını getir; olay olmayan günler <b>0</b> olarak görünsün: <code>gun</code>, <code>olay</code>. Güne göre sırala.</p>', sol: "WITH RECURSIVE gunler(gun) AS (SELECT DATE('2024-11-01') UNION ALL SELECT DATE(gun, '+1 day') FROM gunler WHERE gun < '2024-11-30') SELECT g.gun, COUNT(e.event_id) AS olay FROM gunler g LEFT JOIN web_events e ON DATE(e.event_time) = g.gun GROUP BY g.gun ORDER BY g.gun;", ord: true, hint: 'Önce 30 günlük bir seri üret, sonra web_events\'i olay tarihinin gün kısmıyla LEFT JOIN yap. COUNT(*) değil COUNT(e.event_id) kullan.' },
    { t: 'sql', q: '<p>2024\'ün <b>her ayı</b> (12 satır) için teslim edilen (<code>delivered</code>) sipariş sayısını getir: <code>ay</code> (YYYY-AA biçiminde), <code>siparis</code>. Sipariş olmayan ay olsa da görünmeli.</p>', sol: "WITH RECURSIVE aylar(ay) AS (SELECT DATE('2024-01-01') UNION ALL SELECT DATE(ay, '+1 month') FROM aylar WHERE ay < '2024-12-01') SELECT strftime('%Y-%m', a.ay) AS ay, COUNT(o.order_id) AS siparis FROM aylar a LEFT JOIN orders o ON strftime('%Y-%m', o.order_date) = strftime('%Y-%m', a.ay) AND o.status = 'delivered' GROUP BY a.ay ORDER BY a.ay;", ord: true, hint: 'Durum filtresini WHERE\'e değil ON koşuluna yaz; yoksa LEFT JOIN iç birleşime dönüşür.' },
    { t: 'sql', q: '<p>Aralık 2024\'te kaç gün <b>hafta sonudur</b>? (tek değer: <code>hafta_sonu_gunu</code>)</p>', sol: "WITH RECURSIVE gunler(gun) AS (SELECT DATE('2024-12-01') UNION ALL SELECT DATE(gun, '+1 day') FROM gunler WHERE gun < '2024-12-31') SELECT SUM(CASE WHEN CAST(strftime('%w', gun) AS INTEGER) IN (0, 6) THEN 1 ELSE 0 END) AS hafta_sonu_gunu FROM gunler;" },
    mc('<p>Günlük ciroyu <code>GROUP BY order_date</code> ile alıp grafiğe dökersen ne sorun çıkar?</p>', ['Sorgu hata verir', 'Sipariş olmayan günler grafikte hiç görünmez', 'Ciro iki kat hesaplanır', 'Hiçbir sorun çıkmaz'], 1, 'Satırı olmayan gün GROUP BY sonucunda da yoktur. Eksiksiz bir gün listesine LEFT JOIN yapınca 0 olarak görünür.')
  ]
}]);

/* ======================= İş Zekâsı ve Raporlama ======================= */
const BI = 'İş Zekâsı ve Raporlama';
after('an-dashboard', [{
  id: 'bi-pay', lv: 'B1', mod: BI, min: 12,
  title: 'Pay ve oran analizleri: toplama göre yüzde',
  sum: 'SUM() OVER () ile genel toplam, grup içi pay ve endeks.',
  body: `
<h2>“Toplamın yüzde kaçı?”</h2>
<p>Raporlarda en çok sorulan sorulardan biri payların dağılımıdır: hangi kategori cironun yüzde kaçını getiriyor? Bunun için her satırda <b>genel toplamı</b> da görmemiz gerekir. Pencere fonksiyonu <code>SUM(...) OVER ()</code> tam bunu yapar: satırları gruplamadan tüm sonucun toplamını her satıra yazar.</p>
<pre class="code">SELECT p.category,
       ROUND(SUM(${NET}), 0) AS ciro,
       ROUND(100.0 * SUM(${NET}) / SUM(SUM(${NET})) OVER (), 1) AS pay
FROM order_items oi
JOIN products p ON p.product_id = oi.product_id
GROUP BY p.category
ORDER BY ciro DESC;</pre>
<div class="note"><b>SUM(SUM(...)) OVER () ne demek?</b>İçteki SUM, GROUP BY ile her kategorinin cirosunu hesaplar. Dıştaki SUM ... OVER () bu kategori cirolarını toplar. Pencere fonksiyonları GROUP BY'dan <b>sonra</b> çalıştığı için bu iç içe yazım geçerlidir.</div>
<h2>Grup içi pay</h2>
<p><code>OVER (PARTITION BY ...)</code> ile toplam, her grubun kendi içinde alınır. Örneğin her şehirde segmentlerin payı:</p>
<pre class="code">SELECT city,
       segment,
       COUNT(*) AS musteri,
       ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (PARTITION BY city), 1) AS sehir_ici_pay
FROM customers
WHERE city IN ('İstanbul', 'Ankara')
GROUP BY city, segment
ORDER BY city, segment;</pre>
<h2>Endeks: baz dönem = 100</h2>
<p>Farklı büyüklükteki serileri karşılaştırmak için ilk dönem 100 kabul edilir, diğer dönemler ona oranlanır. <code>FIRST_VALUE</code> ilk dönemin değerini her satıra taşır.</p>
`,
  ex: [
    { t: 'sql', q: '<p>Her satış kanalının (<code>channel</code>) sipariş sayısını ve tüm siparişler içindeki payını (%, 1 basamak) getir: <code>channel</code>, <code>siparis</code>, <code>pay</code>.</p>', sol: 'SELECT channel, COUNT(*) AS siparis, ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pay FROM orders GROUP BY channel;', hint: '<code>SUM(COUNT(*)) OVER ()</code> tüm kanalların toplam sipariş sayısıdır.' },
    { t: 'sql', q: '<p>Şehri boş olmayan müşteriler için her şehirde her segmentin <b>şehir içindeki payını</b> (%, 1 basamak) getir: <code>city</code>, <code>segment</code>, <code>musteri</code>, <code>pay</code>.</p>', sol: 'SELECT city, segment, COUNT(*) AS musteri, ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (PARTITION BY city), 1) AS pay FROM customers WHERE city IS NOT NULL GROUP BY city, segment;' },
    { t: 'sql', q: '<p>2024\'te teslim edilen siparişlerin aylık net cirosunu ve <b>Ocak = 100</b> kabul edilen endeksini getir: <code>ay</code> (01–12), <code>ciro</code> (tam sayı), <code>endeks</code> (1 basamak). Net ciro = adet × birim fiyat × (1 − indirim).</p>', sol: `WITH a AS (SELECT strftime('%m', o.order_date) AS ay, SUM(${NET}) AS ciro FROM orders o JOIN order_items oi ON oi.order_id = o.order_id WHERE o.status = 'delivered' AND o.order_date >= '2024-01-01' AND o.order_date < '2025-01-01' GROUP BY strftime('%m', o.order_date)) SELECT ay, ROUND(ciro, 0) AS ciro, ROUND(100.0 * ciro / FIRST_VALUE(ciro) OVER (ORDER BY ay), 1) AS endeks FROM a ORDER BY ay;`, ord: true, hint: 'Önce CTE ile aylık ciroyu bul; sonra <code>FIRST_VALUE(ciro) OVER (ORDER BY ay)</code> ile Ocak cirosunu her satıra taşı.' }
  ]
}, {
  id: 'ytd', lv: 'B2', mod: BI, min: 15,
  title: 'Dönem karşılaştırmaları: YTD, MTD ve geçen yılın aynı dönemi',
  sum: 'Yıl başından bugüne toplamlar ve yıllık değişim yüzdeleri.',
  body: `
<h2>Yöneticinin üç sorusu</h2>
<ol>
<li><b>YTD</b> (year to date): Yıl başından bugüne ne kadar sattık?</li>
<li><b>MTD / QTD</b>: Ay ya da çeyrek başından bugüne?</li>
<li><b>YoY</b> (year over year): Geçen yılın aynı dönemine göre ne değişti?</li>
</ol>
<p>Önce aylık ciroyu bir CTE'de hesaplayıp, YTD'yi pencere fonksiyonuyla, geçen yılı ise CTE'yi kendisiyle birleştirerek buluruz.</p>
<pre class="code">WITH aylik AS (
    SELECT CAST(strftime('%Y', o.order_date) AS INTEGER) AS yil,
           CAST(strftime('%m', o.order_date) AS INTEGER) AS ay,
           SUM(${NET}) AS ciro
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.order_id
    WHERE o.status = 'delivered'
    GROUP BY CAST(strftime('%Y', o.order_date) AS INTEGER),
             CAST(strftime('%m', o.order_date) AS INTEGER)
)
SELECT yil, ay,
       ROUND(ciro, 0) AS ciro,
       ROUND(SUM(ciro) OVER (PARTITION BY yil ORDER BY ay), 0) AS ytd
FROM aylik
WHERE yil = 2024
ORDER BY ay;</pre>
<h2>Geçen yılın aynı ayı</h2>
<p><code>LAG(ciro, 12)</code> pratik görünür ama arada satırı olmayan bir ay varsa yanlış aya kayar. Yıl ve ay üzerinden kendine birleştirme daha güvenlidir:</p>
<pre class="code">WITH aylik AS (
    SELECT CAST(strftime('%Y', o.order_date) AS INTEGER) AS yil,
           CAST(strftime('%m', o.order_date) AS INTEGER) AS ay,
           SUM(${NET}) AS ciro
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.order_id
    WHERE o.status = 'delivered'
    GROUP BY CAST(strftime('%Y', o.order_date) AS INTEGER),
             CAST(strftime('%m', o.order_date) AS INTEGER)
)
SELECT b.ay,
       ROUND(b.ciro, 0) AS ciro_2024,
       ROUND(a.ciro, 0) AS ciro_2023,
       ROUND(100.0 * (b.ciro - a.ciro) / a.ciro, 1) AS degisim
FROM aylik b
LEFT JOIN aylik a ON a.yil = b.yil - 1 AND a.ay = b.ay
WHERE b.yil = 2024
ORDER BY b.ay;</pre>
<div class="warn"><b>“Bugün” tuzağı</b>YTD raporunu <code>GETDATE()</code> / <code>CURRENT_DATE</code> ile yazarsan, geçen yılın YTD'sini de aynı gün ve aya kadar kesmelisin; yoksa eksik bir yılı tam bir yılla kıyaslarsın. Raporlarda tarihi bir <b>parametre</b> olarak almak en temiz yoldur.</div>
`,
  ex: [
    { t: 'sql', q: '<p>2023 ve 2024 için teslim edilen siparişlerin aylık net cirosunu ve <b>yıl içi kümülatif</b> cirosunu getir: <code>yil</code>, <code>ay</code> (sayı), <code>ciro</code>, <code>ytd</code> (ikisi de tam sayıya yuvarlı). Yıl ve aya göre sırala.</p>', sol: `WITH aylik AS (SELECT CAST(strftime('%Y', o.order_date) AS INTEGER) AS yil, CAST(strftime('%m', o.order_date) AS INTEGER) AS ay, SUM(${NET}) AS ciro FROM orders o JOIN order_items oi ON oi.order_id = o.order_id WHERE o.status = 'delivered' GROUP BY CAST(strftime('%Y', o.order_date) AS INTEGER), CAST(strftime('%m', o.order_date) AS INTEGER)) SELECT yil, ay, ROUND(ciro, 0) AS ciro, ROUND(SUM(ciro) OVER (PARTITION BY yil ORDER BY ay), 0) AS ytd FROM aylik WHERE yil IN (2023, 2024) ORDER BY yil, ay;`, ord: true, hint: 'Kümülatif toplam her yıl yeniden başlamalı: <code>PARTITION BY yil ORDER BY ay</code>.' },
    { t: 'sql', q: '<p>2024\'ün her ayı için net ciroyu, 2023\'ün aynı ayının cirosunu ve değişim yüzdesini getir: <code>ay</code>, <code>ciro</code>, <code>gecen_yil</code> (tam sayı), <code>degisim</code> (1 basamak).</p>', sol: `WITH aylik AS (SELECT CAST(strftime('%Y', o.order_date) AS INTEGER) AS yil, CAST(strftime('%m', o.order_date) AS INTEGER) AS ay, SUM(${NET}) AS ciro FROM orders o JOIN order_items oi ON oi.order_id = o.order_id WHERE o.status = 'delivered' GROUP BY CAST(strftime('%Y', o.order_date) AS INTEGER), CAST(strftime('%m', o.order_date) AS INTEGER)) SELECT b.ay, ROUND(b.ciro, 0) AS ciro, ROUND(a.ciro, 0) AS gecen_yil, ROUND(100.0 * (b.ciro - a.ciro) / a.ciro, 1) AS degisim FROM aylik b LEFT JOIN aylik a ON a.yil = b.yil - 1 AND a.ay = b.ay WHERE b.yil = 2024 ORDER BY b.ay;`, ord: true },
    { t: 'sql', q: '<p><b>Eylül sonu itibarıyla YTD</b> karşılaştırması: 2024\'ün ilk 9 ayı ile 2023\'ün ilk 9 ayındaki teslim edilen net ciroyu ve değişimi tek satırda getir: <code>ytd_2024</code>, <code>ytd_2023</code> (tam sayı), <code>degisim</code> (%, 1 basamak).</p>', sol: `WITH s AS (SELECT o.order_date, ${NET} AS tutar FROM orders o JOIN order_items oi ON oi.order_id = o.order_id WHERE o.status = 'delivered') SELECT ROUND(SUM(CASE WHEN order_date >= '2024-01-01' AND order_date < '2024-10-01' THEN tutar ELSE 0 END), 0) AS ytd_2024, ROUND(SUM(CASE WHEN order_date >= '2023-01-01' AND order_date < '2023-10-01' THEN tutar ELSE 0 END), 0) AS ytd_2023, ROUND(100.0 * (SUM(CASE WHEN order_date >= '2024-01-01' AND order_date < '2024-10-01' THEN tutar ELSE 0 END) - SUM(CASE WHEN order_date >= '2023-01-01' AND order_date < '2023-10-01' THEN tutar ELSE 0 END)) / SUM(CASE WHEN order_date >= '2023-01-01' AND order_date < '2023-10-01' THEN tutar ELSE 0 END), 1) AS degisim FROM s;`, hint: 'Koşullu toplama kullan: her dönem için ayrı bir <code>SUM(CASE WHEN tarih aralığı THEN tutar ELSE 0 END)</code>.' }
  ]
}, {
  id: 'bi-hazirlik', lv: 'B2', mod: BI, min: 14,
  title: 'BI aracına veri hazırlamak: grain (tanecik), görünüm ve boyutlar',
  sum: 'Power BI / Tableau için olgu (fact) görünümü ve boyut tabloları.',
  body: `
<h2>Raporu kim çizer, veriyi kim hazırlar?</h2>
<p>Power BI, Tableau, Looker Studio gibi araçlar grafiği çizer; ama doğru, temiz ve tutarlı veriyi hazırlamak çoğu zaman SQL'in işidir. İyi bir BI veri hazırlığının adımları:</p>
<ol>
<li><b>Tanecik (grain) seç:</b> Bir satır neyi temsil edecek? Sipariş mi, sipariş satırı mı, gün mü? Her şey buna göre şekillenir.</li>
<li><b>Olgu (fact) görünümü:</b> Ölçülebilir değerler (adet, tutar) ve boyutlara bağlanan anahtarlar.</li>
<li><b>Boyutlar (dimension):</b> Müşteri, ürün, tarih. Okunur adlar, NULL yerine “Bilinmiyor”.</li>
<li><b>İş kuralları tek yerde:</b> “Net ciro” tanımı her raporda ayrı formülle değil, görünümde bir kez yazılır.</li>
</ol>
<pre class="code">CREATE VIEW v_satis AS
SELECT oi.item_id,
       o.order_id,
       o.order_date,
       o.channel,
       o.status,
       o.customer_id,
       oi.product_id,
       oi.quantity,
       ROUND(${NET}, 2) AS net_tutar
FROM order_items oi
JOIN orders o ON o.order_id = oi.order_id;

SELECT channel, ROUND(SUM(net_tutar), 0) AS ciro
FROM v_satis
WHERE status = 'delivered'
GROUP BY channel;</pre>
<div class="tip"><b>Import mu, DirectQuery mi?</b>Power BI veriyi kendi belleğine alırsa (import) raporlar hızlıdır ama veri yenileme zamanına kadar eskidir. DirectQuery her tıklamada veritabanına sorgu gönderir; bu durumda görünümlerin ve indekslerin performansı doğrudan kullanıcı deneyimidir.</div>
<h2>Yıldız şema</h2>
<p>BI modelinin ortasında olgu tablosu, çevresinde boyutlar durur (yıldız şema). Ayrıntılar <b>Veri Modelleme</b> dersinde; burada SQL tarafında yapılacakları gördük.</p>
<table>
<tr><th>Kural</th><th>Neden?</th></tr>
<tr><td>Boyut anahtarları tekil olsun</td><td>Yoksa BI aracı ilişkide satırları çoğaltır.</td></tr>
<tr><td>Tarih için ayrı takvim tablosu</td><td>Zaman zekâsı (YTD, geçen yıl) hesapları bunu ister.</td></tr>
<tr><td>Hesaplanmış oranları olgu tablosuna yazma</td><td>Oranlar toplanamaz; pay ve paydayı ayrı ver, oranı araç hesaplasın.</td></tr>
<tr><td>Sütun adlarını işin diliyle ver</td><td>Raporu kullanan kişi <code>col_17</code> değil “Net Tutar” görmeli.</td></tr>
</table>
`,
  ex: [
    { t: 'sql', q: '<p>BI aracı için sipariş satırı düzeyinde bir görünüm oluştur: <code>v_satis_satir</code>. Sütunlar: <code>order_id</code>, <code>order_date</code>, <code>channel</code>, <code>status</code>, <code>category</code>, <code>urun</code> (ürün adı), <code>quantity</code>, <code>net_tutar</code> (adet × birim fiyat × (1 − indirim), 2 basamak).</p>', sol: `CREATE VIEW v_satis_satir AS SELECT o.order_id, o.order_date, o.channel, o.status, p.category, p.name AS urun, oi.quantity, ROUND(${NET}, 2) AS net_tutar FROM order_items oi JOIN orders o ON o.order_id = oi.order_id JOIN products p ON p.product_id = oi.product_id;`, check: "SELECT COUNT(*) AS satir, ROUND(SUM(net_tutar), 2) AS toplam, COUNT(DISTINCT category) AS kategori, SUM(CASE WHEN urun IS NULL THEN 1 ELSE 0 END) AS adsiz FROM v_satis_satir;", hint: 'CREATE VIEW ad AS SELECT ... üç tabloyu birleştiren bir sorgu.' },
    { t: 'sql', q: '<p>Müşteri boyutu hazırla: her müşteri için <code>customer_id</code>, <code>ad_soyad</code> (ad + boşluk + soyad), <code>sehir</code> (boşsa “Bilinmiyor”), <code>segment</code>, <code>ilk_siparis</code> (ilk sipariş tarihi) ve <code>siparis_sayisi</code>. Hiç siparişi olmayan müşteriler de listede olmalı.</p>', sol: "SELECT c.customer_id, c.first_name || ' ' || c.last_name AS ad_soyad, COALESCE(c.city, 'Bilinmiyor') AS sehir, c.segment, MIN(o.order_date) AS ilk_siparis, COUNT(o.order_id) AS siparis_sayisi FROM customers c LEFT JOIN orders o ON o.customer_id = c.customer_id GROUP BY c.customer_id, c.first_name, c.last_name, c.city, c.segment;", hint: 'Siparişi olmayanlar için LEFT JOIN ve COUNT(o.order_id).' },
    mc('<p>BI modeline “iptal oranı” bilgisini nasıl vermek en doğrudur?</p>', ['Her satıra hesaplanmış oran sütunu eklemek', 'İptal sayısını ve toplam sipariş sayısını ayrı ölçüler olarak verip oranı raporda hesaplatmak', 'Oranı metin olarak yazmak', 'Oranı yalnızca toplam satırına yazmak'], 1, 'Oranlar toplanamaz veya ortalaması alınamaz; filtre değiştikçe pay ve paydanın yeniden toplanıp bölünmesi gerekir.')
  ]
}]);

/* ======================= Veri Analisti ======================= */
const AN = 'Veri Analisti';
after('an-temizlik', [{
  id: 'an-eda', lv: 'B1', mod: AN, min: 14,
  title: 'Keşifsel veri analizi (EDA): bir tabloyu tanımak',
  sum: 'Profil çıkarma: dağılım, boşluklar, uç değerler ve tutarlılık kontrolleri.',
  body: `
<h2>Analizden önce profil</h2>
<p>Yeni bir tabloyla karşılaştığında hemen rapora geçme. Önce tablonun <b>profilini</b> çıkar. Bu adım hem veriyi tanımanı sağlar hem de kirli veriyi erkenden yakalar.</p>
<table>
<tr><th>Soru</th><th>SQL</th></tr>
<tr><td>Kaç satır? Tanecik ne?</td><td><code>COUNT(*)</code>, <code>COUNT(DISTINCT anahtar)</code></td></tr>
<tr><td>Hangi sütunlar boş?</td><td><code>COUNT(*) - COUNT(sutun)</code></td></tr>
<tr><td>Sayısal aralık mantıklı mı?</td><td><code>MIN</code>, <code>MAX</code>, <code>AVG</code>, medyan</td></tr>
<tr><td>Kategorik değerler neler?</td><td><code>GROUP BY sutun ORDER BY COUNT(*) DESC</code></td></tr>
<tr><td>Tarih aralığı?</td><td><code>MIN(tarih)</code>, <code>MAX(tarih)</code></td></tr>
<tr><td>İş kurallarına aykırı satır var mı?</td><td>Fiyat &lt; maliyet, negatif adet, gelecek tarih…</td></tr>
<tr><td>Anahtar tekrar ediyor mu?</td><td><code>GROUP BY anahtar HAVING COUNT(*) &gt; 1</code></td></tr>
</table>
<h3>Tek sorguda sayısal profil</h3>
<pre class="code">SELECT COUNT(*) AS satir,
       COUNT(DISTINCT order_id) AS siparis,
       MIN(quantity) AS min_adet,
       MAX(quantity) AS max_adet,
       ROUND(AVG(quantity * 1.0), 2) AS ort_adet,
       MIN(discount) AS min_indirim,
       MAX(discount) AS max_indirim
FROM order_items;</pre>
<h3>Kategorik değerlerin dağılımı</h3>
<pre class="code">SELECT status,
       COUNT(*) AS adet,
       ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS yuzde
FROM orders
GROUP BY status
ORDER BY adet DESC;</pre>
<div class="tip"><b>Sayılar mantıklı mı?</b>Profil sonuçlarını iş bilgisiyle karşılaştır: indirim oranı 1'den büyük olabilir mi? Doğum yılı 1900 öncesi mi? En pahalı ürün gerçekten o mu? EDA'nın değeri bu soruları sormaktadır.</div>
`,
  ex: [
    { t: 'sql', q: '<p><code>products</code> tablosunun profilini tek satırda çıkar: <code>urun</code> (satır sayısı), <code>kategori</code> (farklı kategori sayısı), <code>min_fiyat</code>, <code>max_fiyat</code>, <code>ort_fiyat</code> (2 basamak), <code>stoksuz</code> (stok adedi 0 olan ürün sayısı).</p>', sol: 'SELECT COUNT(*) AS urun, COUNT(DISTINCT category) AS kategori, MIN(price) AS min_fiyat, MAX(price) AS max_fiyat, ROUND(AVG(price), 2) AS ort_fiyat, SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END) AS stoksuz FROM products;' },
    { t: 'sql', q: '<p><code>customers</code> tablosunda <code>city</code>, <code>email</code> ve <code>birth_year</code> sütunlarının kaç satırda boş olduğunu tek satırda getir: <code>sehir_bos</code>, <code>email_bos</code>, <code>dogum_bos</code>.</p>', sol: 'SELECT COUNT(*) - COUNT(city) AS sehir_bos, COUNT(*) - COUNT(email) AS email_bos, COUNT(*) - COUNT(birth_year) AS dogum_bos FROM customers;' },
    { t: 'sql', q: '<p>Müşteriler arasında <b>en sık geçen 5 ad</b>ı ve kaç kez geçtiğini getir: <code>first_name</code>, <code>adet</code>. Adede göre azalan, eşitlikte ada göre artan sırala.</p>', sol: 'SELECT first_name, COUNT(*) AS adet FROM customers GROUP BY first_name ORDER BY adet DESC, first_name LIMIT 5;', ord: true }
  ]
}]);
after('an-funnel', [{
  id: 'an-aktif', lv: 'B2', mod: AN, min: 14,
  title: 'Aktif kullanıcı metrikleri: DAU, MAU ve yapışkanlık',
  sum: 'Günlük/aylık tekil kullanıcılar, stickiness ve yeni kullanıcılar.',
  body: `
<h2>Ürün analitiğinin temel metrikleri</h2>
<table>
<tr><th>Metrik</th><th>Tanım</th></tr>
<tr><td><b>DAU</b> (daily active users)</td><td>Bir günde en az bir olay yapan tekil kullanıcı sayısı</td></tr>
<tr><td><b>WAU / MAU</b></td><td>Haftalık / aylık tekil aktif kullanıcı</td></tr>
<tr><td><b>Yapışkanlık</b> (stickiness)</td><td>Ortalama DAU ÷ MAU. Kullanıcılar ayın kaçta kaçında geri geliyor?</td></tr>
<tr><td><b>Yeni kullanıcı</b></td><td>İlk olayı o dönemde olan kullanıcı</td></tr>
</table>
<p>Hepsinin anahtarı <code>COUNT(DISTINCT user_id)</code>'dir: aynı kullanıcı bir günde 10 olay yapsa da bir kez sayılır.</p>
<pre class="code">SELECT DATE(event_time) AS gun,
       COUNT(DISTINCT user_id) AS dau,
       COUNT(*) AS olay
FROM web_events
GROUP BY DATE(event_time)
ORDER BY gun
LIMIT 7;</pre>
<div class="warn"><b>DAU'lar toplanamaz</b>Bir haftanın DAU'larını toplarsan WAU'yu bulamazsın; aynı kişi birden çok gün sayılır. WAU ve MAU her zaman kendi döneminde yeniden COUNT(DISTINCT) ile hesaplanır.</div>
<h2>Yapışkanlık</h2>
<p>Önce günlük DAU'ları, sonra aylık MAU'yu bulup birleştiririz. %20 üzeri yapışkanlık, kullanıcıların ayda ortalama altı günden fazla geri geldiği anlamına gelir.</p>
`,
  ex: [
    { t: 'sql', q: '<p>Kasım 2024\'te her gün için günlük aktif kullanıcı sayısını getir: <code>gun</code>, <code>dau</code>. Güne göre sırala.</p>', sol: "SELECT DATE(event_time) AS gun, COUNT(DISTINCT user_id) AS dau FROM web_events WHERE event_time >= '2024-11-01' AND event_time < '2024-12-01' GROUP BY DATE(event_time) ORDER BY gun;", ord: true },
    { t: 'sql', q: '<p>Her ay için MAU\'yu, olay olan günlerin ortalama DAU\'sunu (1 basamak) ve yapışkanlığı (%, 1 basamak) getir: <code>ay</code> (YYYY-AA), <code>mau</code>, <code>ort_dau</code>, <code>yapiskanlik</code>.</p>', sol: "WITH g AS (SELECT strftime('%Y-%m', event_time) AS ay, DATE(event_time) AS gun, COUNT(DISTINCT user_id) AS dau FROM web_events GROUP BY strftime('%Y-%m', event_time), DATE(event_time)), m AS (SELECT strftime('%Y-%m', event_time) AS ay, COUNT(DISTINCT user_id) AS mau FROM web_events GROUP BY strftime('%Y-%m', event_time)) SELECT m.ay, m.mau, ROUND(AVG(g.dau * 1.0), 1) AS ort_dau, ROUND(100.0 * AVG(g.dau * 1.0) / m.mau, 1) AS yapiskanlik FROM m JOIN g ON g.ay = m.ay GROUP BY m.ay, m.mau ORDER BY m.ay;", ord: true, hint: 'İki CTE: biri gün düzeyinde DAU, diğeri ay düzeyinde MAU. Sonra ay üzerinden birleştir.' },
    { t: 'sql', q: '<p>Her gün kaç <b>yeni</b> kullanıcı geldiğini getir (ilk olayı o gün olan kullanıcılar): <code>gun</code>, <code>yeni</code>. Güne göre sırala.</p>', sol: 'WITH ilk AS (SELECT user_id, MIN(DATE(event_time)) AS gun FROM web_events GROUP BY user_id) SELECT gun, COUNT(*) AS yeni FROM ilk GROUP BY gun ORDER BY gun;', ord: true, hint: 'Önce her kullanıcının ilk olay gününü bul, sonra o güne göre say.' }
  ]
}, {
  id: 'an-churn', lv: 'B2', mod: AN, min: 15,
  title: 'Müşteri kaybı (churn), ARPU ve yaşam boyu değer',
  sum: 'Churn tanımı ve oranı, müşteri başına gelir, basit CLV hesabı.',
  body: `
<h2>Churn: müşteri ne zaman “kaybedilmiş” sayılır?</h2>
<p>Abonelik işlerinde churn açıktır: abonelik iptal edilir. E-ticarette ise müşteri ayrıldığını söylemez; <b>bir süre alışveriş yapmazsa</b> kayıp sayılır. Bu süre işe göre seçilir (ör. 90 veya 180 gün) ve raporda açıkça yazılmalıdır.</p>
<pre class="code">WITH son AS (
    SELECT customer_id, MAX(order_date) AS son_siparis
    FROM orders
    GROUP BY customer_id
)
SELECT customer_id,
       son_siparis,
       CAST(julianday('2024-12-31') - julianday(son_siparis) AS INTEGER) AS gecen_gun,
       CASE WHEN julianday('2024-12-31') - julianday(son_siparis) > 180 THEN 'kayıp' ELSE 'aktif' END AS durum
FROM son
ORDER BY gecen_gun DESC
LIMIT 5;</pre>
<div class="note"><b>Referans tarih</b>Örnek veri 2024 sonunda bittiği için “bugün” yerine sabit bir tarih (2024-12-31) kullanıyoruz. Canlı raporlarda bu, rapor tarihi parametresidir.</div>
<h2>ARPU ve CLV</h2>
<table>
<tr><th>Metrik</th><th>Formül</th></tr>
<tr><td><b>ARPU</b> (average revenue per user)</td><td>Dönem cirosu ÷ dönemde aktif müşteri</td></tr>
<tr><td><b>AOV</b> (ortalama sepet)</td><td>Ciro ÷ sipariş sayısı</td></tr>
<tr><td><b>Sıklık</b></td><td>Sipariş sayısı ÷ müşteri sayısı</td></tr>
<tr><td><b>Basit CLV</b></td><td>AOV × sıklık (× beklenen ömür, kâr marjı)</td></tr>
</table>
<div class="tip"><b>CLV'nin gerçek hali</b>İleri modeller kâr marjını, iskonto oranını ve elde tutma olasılığını da hesaba katar (ör. BG/NBD modelleri). SQL burada verinin hazırlanması ve basit tahminler için kullanılır.</div>
`,
  ex: [
    { t: 'sql', q: '<p>Referans tarih <b>2024-12-31</b>. Son siparişi bu tarihten <b>180 günden daha eski</b> olan müşterilerin, sipariş vermiş tüm müşteriler içindeki oranını (%, 1 basamak) bul: <code>churn_orani</code>.</p>', sol: "WITH son AS (SELECT customer_id, MAX(order_date) AS son_siparis FROM orders GROUP BY customer_id) SELECT ROUND(100.0 * SUM(CASE WHEN julianday('2024-12-31') - julianday(son_siparis) > 180 THEN 1 ELSE 0 END) / COUNT(*), 1) AS churn_orani FROM son;", hint: 'Önce müşteri başına son sipariş tarihi; sonra koşullu sayım ÷ toplam.' },
    { t: 'sql', q: '<p>2024\'te teslim edilen siparişlerde segment bazında ARPU hesapla: <code>segment</code>, <code>musteri</code> (sipariş veren tekil müşteri), <code>ciro</code>, <code>arpu</code> (ikisi de tam sayıya yuvarlı).</p>', sol: `SELECT c.segment, COUNT(DISTINCT o.customer_id) AS musteri, ROUND(SUM(${NET}), 0) AS ciro, ROUND(SUM(${NET}) / COUNT(DISTINCT o.customer_id), 0) AS arpu FROM orders o JOIN customers c ON c.customer_id = o.customer_id JOIN order_items oi ON oi.order_id = o.order_id WHERE o.status = 'delivered' AND o.order_date >= '2024-01-01' AND o.order_date < '2025-01-01' GROUP BY c.segment;` },
    { t: 'sql', q: '<p>Tüm teslim edilen siparişlerle segment bazında basit CLV hesapla: <code>segment</code>, <code>aov</code> (sipariş başına ciro), <code>siklik</code> (müşteri başına sipariş), <code>clv</code> (aov × sıklık). Hepsini 2 basamağa yuvarla.</p>', sol: `WITH s AS (SELECT o.order_id, o.customer_id, SUM(${NET}) AS tutar FROM orders o JOIN order_items oi ON oi.order_id = o.order_id WHERE o.status = 'delivered' GROUP BY o.order_id, o.customer_id) SELECT c.segment, ROUND(AVG(s.tutar), 2) AS aov, ROUND(1.0 * COUNT(*) / COUNT(DISTINCT s.customer_id), 2) AS siklik, ROUND(AVG(s.tutar) * COUNT(*) / COUNT(DISTINCT s.customer_id), 2) AS clv FROM s JOIN customers c ON c.customer_id = s.customer_id GROUP BY c.segment;`, hint: 'Önce sipariş düzeyinde tutarı bul (CTE), sonra segmente göre AVG ve sayımlar.' }
  ]
}, {
  id: 'an-sepet', lv: 'B2', mod: AN, min: 14,
  title: 'Sepet analizi: birlikte satın alınan ürünler',
  sum: 'Ürün çiftleri, destek (support), güven (confidence) ve kaldıraç (lift).',
  body: `
<h2>“Bunu alanlar şunu da aldı”</h2>
<p>Sepet analizi (market basket analysis), aynı siparişte birlikte görünen ürünleri bulur. Öneri sistemlerinin, raf düzeninin ve çapraz satış kampanyalarının temelidir. SQL'deki karşılığı, <code>order_items</code> tablosunu <b>kendisiyle</b> sipariş numarası üzerinden birleştirmektir.</p>
<pre class="code">SELECT p1.name AS urun1,
       p2.name AS urun2,
       COUNT(DISTINCT a.order_id) AS birlikte
FROM order_items a
JOIN order_items b ON b.order_id = a.order_id
                  AND a.product_id < b.product_id
JOIN products p1 ON p1.product_id = a.product_id
JOIN products p2 ON p2.product_id = b.product_id
GROUP BY p1.name, p2.name
ORDER BY birlikte DESC, urun1, urun2
LIMIT 5;</pre>
<div class="note"><b>Neden <code>a.product_id &lt; b.product_id</code>?</b>Eşitsizlik hem ürünün kendisiyle eşleşmesini engeller hem de (A, B) ile (B, A) çiftlerinin iki kez sayılmasını önler.</div>
<h2>Üç ölçü</h2>
<table>
<tr><th>Ölçü</th><th>Formül</th><th>Anlamı</th></tr>
<tr><td><b>Destek</b></td><td>A ve B'yi içeren sipariş ÷ tüm siparişler</td><td>Çift ne kadar yaygın?</td></tr>
<tr><td><b>Güven</b> A→B</td><td>A ve B'yi içeren ÷ A'yı içeren</td><td>A alanların yüzde kaçı B de alıyor?</td></tr>
<tr><td><b>Kaldıraç</b></td><td>Güven(A→B) ÷ Destek(B)</td><td>1'den büyükse birliktelik tesadüften güçlü</td></tr>
</table>
`,
  ex: [
    { t: 'sql', q: '<p>En sık birlikte satılan <b>5 ürün çiftini</b> getir: <code>urun1</code>, <code>urun2</code>, <code>birlikte</code> (ortak sipariş sayısı). Çiftte küçük <code>product_id</code>\'li ürün önce gelsin. Sayıya göre azalan, eşitlikte <code>urun1</code> ve <code>urun2</code>\'ye göre artan sırala.</p>', sol: 'SELECT p1.name AS urun1, p2.name AS urun2, COUNT(DISTINCT a.order_id) AS birlikte FROM order_items a JOIN order_items b ON b.order_id = a.order_id AND a.product_id < b.product_id JOIN products p1 ON p1.product_id = a.product_id JOIN products p2 ON p2.product_id = b.product_id GROUP BY p1.name, p2.name ORDER BY birlikte DESC, urun1, urun2 LIMIT 5;', ord: true },
    { t: 'sql', q: '<p><b>Kablosuz Kulaklık</b> içeren siparişlerde en sık görülen diğer <b>3 ürünü</b> getir: <code>urun</code>, <code>siparis</code>. Sayıya göre azalan, eşitlikte ürün adına göre sırala.</p>', sol: "SELECT p2.name AS urun, COUNT(DISTINCT a.order_id) AS siparis FROM order_items a JOIN products p1 ON p1.product_id = a.product_id JOIN order_items b ON b.order_id = a.order_id AND b.product_id <> a.product_id JOIN products p2 ON p2.product_id = b.product_id WHERE p1.name = 'Kablosuz Kulaklık' GROUP BY p2.name ORDER BY siparis DESC, urun LIMIT 3;", ord: true },
    { t: 'sql', q: '<p><b>Elektronik</b> kategorisinden ürün içeren siparişlerin yüzde kaçında <b>Kitap</b> kategorisinden de ürün var? (güven, %, 1 basamak: <code>guven</code>)</p>', sol: "WITH k AS (SELECT DISTINCT oi.order_id, p.category FROM order_items oi JOIN products p ON p.product_id = oi.product_id) SELECT ROUND(100.0 * COUNT(DISTINCT b.order_id) / COUNT(DISTINCT a.order_id), 1) AS guven FROM k a LEFT JOIN k b ON b.order_id = a.order_id AND b.category = 'Kitap' WHERE a.category = 'Elektronik';", hint: 'Sipariş–kategori çiftlerini tekilleştir; Elektronik siparişlere Kitap satırlarını LEFT JOIN ile bağla.' }
  ]
}]);

/* ======================= Veri Bilimi ======================= */
after('ds-tanimsal', [{
  id: 'ds-olasilik', lv: 'B2', mod: 'Veri Bilimi', min: 12,
  title: 'SQL ile olasılık ve koşullu olasılık',
  sum: 'Frekanslardan olasılık, P(A|B), bağımsızlık ve beklenen değer.',
  body: `
<h2>Olasılık = oran</h2>
<p>Elinde geçmiş veri varsa, bir olayın olasılığını <b>görülme oranıyla</b> tahmin edersin: P(iptal) = iptal edilen sipariş ÷ tüm siparişler. SQL'de bu, koşullu sayımın ta kendisidir.</p>
<pre class="code">SELECT ROUND(AVG(CASE WHEN status = 'cancelled' THEN 1.0 ELSE 0 END), 3) AS p_iptal
FROM orders;</pre>
<h2>Koşullu olasılık: P(A | B)</h2>
<p>“B olduğunu bildiğimizde A'nın olasılığı” = A ve B birlikte ÷ B. Örneğin mobil kanaldan gelen bir siparişin iptal olasılığı:</p>
<pre class="code">SELECT channel,
       COUNT(*) AS siparis,
       ROUND(AVG(CASE WHEN status = 'cancelled' THEN 1.0 ELSE 0 END), 3) AS p_iptal
FROM orders
GROUP BY channel;</pre>
<p>Kanallar arasında P(iptal | kanal) belirgin biçimde farklıysa, iptal ile kanal <b>bağımsız değildir</b>. Farkın tesadüf olup olmadığını anlamak için A/B testi dersindeki istatistiksel testlere başvurulur.</p>
<h2>Beklenen değer</h2>
<p>Bir rastgele değişkenin ortalama sonucudur: E[gelir] = Σ (değer × olasılık). Gözlem verisinde bu basitçe ortalamadır; A/B testinde her varyantın kullanıcı başına beklenen geliri şöyle bulunur:</p>
<pre class="code">SELECT variant,
       COUNT(*) AS kullanici,
       ROUND(AVG(converted * 1.0), 3) AS p_donusum,
       ROUND(AVG(revenue), 2) AS beklenen_gelir
FROM ab_test
GROUP BY variant;</pre>
<div class="tip"><b>Bayes kuralı</b>P(A|B) = P(B|A) × P(A) ÷ P(B). Örneğin “satın alan kullanıcıların %90'ı sepete ekledi” bilgisinden “sepete ekleyenin satın alma olasılığına” geçmek için kullanılır. SQL ile her terimi ayrı ayrı sayıp hesaplayabilirsin.</div>
`,
  ex: [
    { t: 'sql', q: '<p>Her kanal için siparişin <b>iade edilme</b> (<code>returned</code>) olasılığını 3 basamakla getir: <code>channel</code>, <code>p_iade</code>.</p>', sol: "SELECT channel, ROUND(AVG(CASE WHEN status = 'returned' THEN 1.0 ELSE 0 END), 3) AS p_iade FROM orders GROUP BY channel;" },
    { t: 'sql', q: '<p>Kullanıcı düzeyinde düşün: sepete ekleme (<code>add_to_cart</code>) yapmış bir kullanıcının satın alma (<code>purchase</code>) yapmış olma olasılığı nedir? (3 basamak: <code>p_satin_alma</code>)</p>', sol: "WITH u AS (SELECT user_id, MAX(CASE WHEN event_type = 'add_to_cart' THEN 1 ELSE 0 END) AS sepet, MAX(CASE WHEN event_type = 'purchase' THEN 1 ELSE 0 END) AS satin FROM web_events GROUP BY user_id) SELECT ROUND(1.0 * SUM(CASE WHEN sepet = 1 AND satin = 1 THEN 1 ELSE 0 END) / SUM(sepet), 3) AS p_satin_alma FROM u;", hint: 'Önce her kullanıcı için iki bayrak (sepet, satın alma) çıkar. P(satın alma | sepet) = ikisi birden ÷ sepet.' },
    { t: 'sql', q: '<p>A/B testinde her varyant için kullanıcı sayısı, dönüşüm olasılığı (3 basamak) ve <b>dönüşen kullanıcı başına</b> ortalama geliri (2 basamak) getir: <code>variant</code>, <code>kullanici</code>, <code>p_donusum</code>, <code>donusen_basina_gelir</code>.</p>', sol: 'SELECT variant, COUNT(*) AS kullanici, ROUND(AVG(converted * 1.0), 3) AS p_donusum, ROUND(SUM(revenue) / SUM(converted), 2) AS donusen_basina_gelir FROM ab_test GROUP BY variant;' }
  ]
}]);

/* ======================= Veri Mühendisliği: dbt ======================= */
after('de-scd', [{
  id: 'de-dbt', lv: 'C1', mod: 'Veri Mühendisliği', min: 15,
  title: 'dbt ile SQL dönüşüm katmanı: modeller ve testler',
  sum: 'Modern veri ekiplerinin SQL iş akışı: staging, marts, ref() ve veri testleri.',
  body: `
<h2>dbt nedir?</h2>
<p><b>dbt</b> (data build tool), veri ambarındaki dönüşümleri yalnızca SELECT sorgularıyla yazmanı sağlayan açık kaynaklı bir araçtır. Her <b>model</b> bir <code>.sql</code> dosyasıdır; dbt bu sorguları doğru sırayla çalıştırıp tablo veya görünüme çevirir, test eder ve belgeler. Snowflake, BigQuery, Databricks, PostgreSQL, SQL Server gibi ortamlarda kullanılır.</p>
<h3>Katmanlar</h3>
<table>
<tr><th>Katman</th><th>Görev</th><th>Örnek</th></tr>
<tr><td><b>staging</b></td><td>Kaynağı temizle: ad değiştir, tip dönüştür, boşlukları kırp. Kaynak başına bir model.</td><td><code>stg_orders</code></td></tr>
<tr><td><b>intermediate</b></td><td>Ara birleştirmeler, iş kuralları</td><td><code>int_order_totals</code></td></tr>
<tr><td><b>marts</b></td><td>İş birimine hazır olgu ve boyutlar</td><td><code>fct_orders</code>, <code>dim_customers</code></td></tr>
</table>
<h3>Bir dbt modeli</h3>
${NR("-- models/staging/stg_signups.sql\nSELECT DISTINCT\n    id                     AS signup_id,\n    TRIM(full_name)        AS full_name,\n    LOWER(TRIM(email))     AS email,\n    UPPER(TRIM(city))      AS city\nFROM {{ source('crm', 'raw_signups') }}\n\n-- models/marts/fct_orders.sql\nSELECT o.order_id, o.customer_id, o.order_date, t.net_tutar\nFROM {{ ref('stg_orders') }} o\nJOIN {{ ref('int_order_totals') }} t USING (order_id)")}
<p><code>{{ ref('...') }}</code> başka bir modele başvurur. dbt bu başvurulardan bir bağımlılık grafiği (DAG) çıkarır ve modelleri doğru sırayla oluşturur. Ortama göre (geliştirme / canlı) doğru şema adını da kendisi yazar.</p>
<h3>Materyalizasyon</h3>
<ul>
<li><b>view</b>: Her sorguda yeniden hesaplanır, yer kaplamaz.</li>
<li><b>table</b>: Her çalıştırmada baştan oluşturulur.</li>
<li><b>incremental</b>: Yalnızca yeni/değişen satırlar eklenir (Artımlı yükleme dersindeki mantık).</li>
<li><b>ephemeral</b>: Ayrı nesne olmaz, kullanan modele CTE olarak gömülür.</li>
</ul>
<h2>Veri testleri aslında SQL sorgusudur</h2>
<p>dbt'nin hazır testleri arka planda “hatalı satırları döndüren” sorgular üretir. Sonuç boşsa test geçer:</p>
<table>
<tr><th>Test</th><th>Ürettiği sorgunun mantığı</th></tr>
<tr><td><code>unique</code></td><td><code>GROUP BY sutun HAVING COUNT(*) &gt; 1</code></td></tr>
<tr><td><code>not_null</code></td><td><code>WHERE sutun IS NULL</code></td></tr>
<tr><td><code>accepted_values</code></td><td><code>WHERE sutun NOT IN (...)</code></td></tr>
<tr><td><code>relationships</code></td><td>Çocuk tabloda olup ebeveynde olmayan anahtarlar (LEFT JOIN ... IS NULL)</td></tr>
</table>
`,
  ex: [
    { t: 'sql', q: '<p><code>accepted_values</code> testini SQL ile yaz: <code>orders.status</code> değerlerinden <b>delivered, shipped, cancelled</b> dışında kalanları ve kaç kez geçtiklerini getir: <code>status</code>, <code>adet</code>.</p>', sol: "SELECT status, COUNT(*) AS adet FROM orders WHERE status NOT IN ('delivered', 'shipped', 'cancelled') GROUP BY status;", hint: 'Testin mantığı: kabul edilen liste dışındakileri döndür. Sonuç boş değilse test başarısızdır.' },
    { t: 'sql', q: '<p><code>relationships</code> testi: <code>order_items</code>\'ta olup <code>orders</code>\'ta karşılığı <b>olmayan</b> <code>order_id</code> sayısını bul (tek değer: <code>yetim</code>).</p>', sol: 'SELECT COUNT(*) AS yetim FROM order_items oi LEFT JOIN orders o ON o.order_id = oi.order_id WHERE o.order_id IS NULL;' },
    { t: 'sql', q: '<p>Bir staging modeli yaz: <code>raw_signups</code>\'tan tekrar eden kayıtları atıp e-postayı küçük harfe çevir. Sonuç: her <b>tekil e-posta</b> (<code>email</code>, küçük harf ve kırpılmış) için ilk <code>id</code> (<code>signup_id</code>).</p>', sol: 'SELECT LOWER(TRIM(email)) AS email, MIN(id) AS signup_id FROM raw_signups GROUP BY LOWER(TRIM(email));' },
    mc('<p>dbt\'de <code>{{ ref(\'stg_orders\') }}</code> yazmanın, tablo adını doğrudan yazmaya göre en önemli faydası nedir?</p>', ['Sorguyu hızlandırır', 'Modeller arası bağımlılığı dbt\'ye bildirir; doğru sırayla ve doğru şemada oluşturulur', 'Veriyi şifreler', 'İndeks oluşturur'], 1)
  ]
}]);

/* ======================= Vaka çalışmaları ======================= */
const VK = 'Vaka Çalışmaları';
after('mulakat-2', [{
  id: 'vaka-yilsonu', lv: 'B1', mod: VK, min: 25,
  title: 'Vaka: Anadolu Market 2024 yıl sonu raporu',
  sum: 'Yönetim kurulu sunumu için beş adımda baştan sona bir analiz.',
  body: `
<h2>Durum</h2>
<p>Anadolu Market'in genel müdürü, yönetim kurulu toplantısı için 2024 yılının özetini istiyor. Senden beş sorunun yanıtını tek tek SQL ile çıkarmanı bekliyor. Her adım bir alıştırma; sırayla ilerle.</p>
<div class="note"><b>Ortak tanımlar</b><b>Net ciro</b> = adet × birim fiyat × (1 − indirim). Yalnızca <b>teslim edilen</b> (<code>delivered</code>) siparişler sayılır. 2024 = <code>order_date</code> 2024-01-01 ile 2024-12-31 arası.</div>
<h3>Kurul hangi sorulara yanıt arıyor?</h3>
<ol>
<li>Yılı nasıl kapattık? (ciro, sipariş, ortalama sepet)</li>
<li>Ciro aylara nasıl dağıldı?</li>
<li>Hangi ürünler öne çıktı?</li>
<li>Satış kanallarının payı ne?</li>
<li>Kaç yeni müşteri kazandık ve ne kadar harcadılar?</li>
</ol>
<div class="tip"><b>Analist alışkanlığı</b>Her sorgunun sonucunu bir sonraki adıma geçmeden önce sağlama yap: aylık ciroların toplamı yıllık ciroya eşit mi? Kanal paylarının toplamı %100 mü?</div>
`,
  ex: [
    { t: 'sql', q: '<p><b>1. Yıl özeti:</b> 2024\'te teslim edilen siparişlerin toplam net cirosu (<code>ciro</code>, tam sayı), sipariş sayısı (<code>siparis</code>) ve ortalama sepet tutarı (<code>ort_sepet</code>, 2 basamak).</p>', sol: `SELECT ROUND(SUM(${NET}), 0) AS ciro, COUNT(DISTINCT o.order_id) AS siparis, ROUND(SUM(${NET}) / COUNT(DISTINCT o.order_id), 2) AS ort_sepet FROM orders o JOIN order_items oi ON oi.order_id = o.order_id WHERE o.status = 'delivered' AND o.order_date >= '2024-01-01' AND o.order_date < '2025-01-01';`, hint: 'Sipariş sayısı için COUNT(DISTINCT o.order_id); JOIN sonrası her sipariş birden çok satır olabilir.' },
    { t: 'sql', q: '<p><b>2. Aylık trend:</b> 2024\'ün aylık net cirosu: <code>ay</code> (YYYY-AA), <code>ciro</code> (tam sayı). Aya göre sırala.</p>', sol: `SELECT strftime('%Y-%m', o.order_date) AS ay, ROUND(SUM(${NET}), 0) AS ciro FROM orders o JOIN order_items oi ON oi.order_id = o.order_id WHERE o.status = 'delivered' AND o.order_date >= '2024-01-01' AND o.order_date < '2025-01-01' GROUP BY strftime('%Y-%m', o.order_date) ORDER BY ay;`, ord: true },
    { t: 'sql', q: '<p><b>3. Yıldız ürünler:</b> 2024\'te en çok net ciro getiren <b>5 ürün</b>: <code>urun</code>, <code>category</code>, <code>ciro</code> (tam sayı). Ciroya göre azalan sırala.</p>', sol: `SELECT p.name AS urun, p.category, ROUND(SUM(${NET}), 0) AS ciro FROM orders o JOIN order_items oi ON oi.order_id = o.order_id JOIN products p ON p.product_id = oi.product_id WHERE o.status = 'delivered' AND o.order_date >= '2024-01-01' AND o.order_date < '2025-01-01' GROUP BY p.name, p.category ORDER BY ciro DESC LIMIT 5;`, ord: true },
    { t: 'sql', q: '<p><b>4. Kanal karması:</b> 2024\'te teslim edilen siparişlerin kanal bazında sayısı ve payı: <code>channel</code>, <code>siparis</code>, <code>pay</code> (%, 1 basamak).</p>', sol: "SELECT channel, COUNT(*) AS siparis, ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pay FROM orders WHERE status = 'delivered' AND order_date >= '2024-01-01' AND order_date < '2025-01-01' GROUP BY channel;" },
    { t: 'sql', q: '<p><b>5. Yeni müşteriler:</b> İlk siparişini (durumu ne olursa olsun) 2024\'te veren müşteri sayısı (<code>yeni_musteri</code>) ve bu müşterilerin 2024\'teki teslim edilen net cirosu (<code>ciro</code>, tam sayı).</p>', sol: `WITH ilk AS (SELECT customer_id FROM orders GROUP BY customer_id HAVING MIN(order_date) >= '2024-01-01' AND MIN(order_date) < '2025-01-01') SELECT (SELECT COUNT(*) FROM ilk) AS yeni_musteri, ROUND(SUM(${NET}), 0) AS ciro FROM orders o JOIN ilk i ON i.customer_id = o.customer_id JOIN order_items oi ON oi.order_id = o.order_id WHERE o.status = 'delivered' AND o.order_date >= '2024-01-01' AND o.order_date < '2025-01-01';`, hint: 'Önce ilk sipariş tarihi 2024\'te olan müşterileri CTE ile bul (HAVING MIN(order_date) ...).' }
  ]
}, {
  id: 'vaka-kayip', lv: 'B2', mod: VK, min: 25,
  title: 'Vaka: Kayıp müşterilerin izinde',
  sum: 'Churn olan müşterileri bul, nedenlerini ara, geri kazanım listesi hazırla.',
  body: `
<h2>Durum</h2>
<p>Pazarlama ekibi müşteri kaybının arttığını düşünüyor ve bir geri kazanım kampanyası planlıyor. Senden üç şey istiyorlar: kaybın büyüklüğü, olası nedenler ve kampanya için öncelikli müşteri listesi.</p>
<div class="note"><b>Tanımlar</b>Referans tarih <b>2024-12-31</b>. Son siparişi bu tarihten <b>180 günden eski</b> olan (en az bir siparişi olan) müşteri <b>kayıp</b>, diğerleri <b>aktif</b>. Net ciro tanımı yıl sonu vakasındakiyle aynı.</div>
<h3>Adımlar</h3>
<ol>
<li>Müşteri başına son sipariş ve sipariş sayısı</li>
<li>Segment bazında kayıp oranı</li>
<li>Kayıp müşterilerin sipariş deneyimi: iptal ve iade oranı daha mı yüksek?</li>
<li>Kayıp müşteriler hangi kanalı kullanıyordu?</li>
<li>Geri kazanım listesi: en değerli 10 kayıp müşteri</li>
</ol>
<div class="tip"><b>Korelasyon ≠ nedensellik</b>Kayıp müşterilerde iade oranı yüksek çıkarsa bu bir ipucudur, kanıt değil. Bulguyu “araştırılmalı” diye raporla.</div>
`,
  ex: [
    { t: 'sql', q: '<p><b>1.</b> Sipariş vermiş her müşteri için <code>customer_id</code>, <code>son_siparis</code> (son sipariş tarihi) ve <code>siparis</code> (sipariş sayısı) getir.</p>', sol: 'SELECT customer_id, MAX(order_date) AS son_siparis, COUNT(*) AS siparis FROM orders GROUP BY customer_id;' },
    { t: 'sql', q: '<p><b>2.</b> Segment bazında kayıp oranı: <code>segment</code>, <code>musteri</code> (sipariş vermiş müşteri), <code>kayip</code>, <code>oran</code> (%, 1 basamak).</p>', sol: "WITH m AS (SELECT o.customer_id, c.segment, MAX(o.order_date) AS son FROM orders o JOIN customers c ON c.customer_id = o.customer_id GROUP BY o.customer_id, c.segment) SELECT segment, COUNT(*) AS musteri, SUM(CASE WHEN julianday('2024-12-31') - julianday(son) > 180 THEN 1 ELSE 0 END) AS kayip, ROUND(100.0 * SUM(CASE WHEN julianday('2024-12-31') - julianday(son) > 180 THEN 1 ELSE 0 END) / COUNT(*), 1) AS oran FROM m GROUP BY segment;" },
    { t: 'sql', q: '<p><b>3.</b> Kayıp ve aktif müşterilerin <b>tüm siparişlerinde</b> iptal veya iade (<code>cancelled</code>, <code>returned</code>) olan siparişlerin oranını karşılaştır: <code>durum</code> (“kayıp” / “aktif”), <code>siparis</code>, <code>sorunlu_oran</code> (%, 1 basamak).</p>', sol: "WITH m AS (SELECT customer_id, CASE WHEN julianday('2024-12-31') - julianday(MAX(order_date)) > 180 THEN 'kayıp' ELSE 'aktif' END AS durum FROM orders GROUP BY customer_id) SELECT m.durum, COUNT(*) AS siparis, ROUND(100.0 * SUM(CASE WHEN o.status IN ('cancelled', 'returned') THEN 1 ELSE 0 END) / COUNT(*), 1) AS sorunlu_oran FROM orders o JOIN m ON m.customer_id = o.customer_id GROUP BY m.durum;", hint: 'Önce müşteri düzeyinde durum etiketini bul, sonra siparişlere bağlayıp duruma göre grupla.' },
    { t: 'sql', q: '<p><b>4.</b> Kayıp müşterilerin siparişlerinin kanal dağılımı: <code>channel</code>, <code>siparis</code>, <code>pay</code> (%, 1 basamak).</p>', sol: "WITH k AS (SELECT customer_id FROM orders GROUP BY customer_id HAVING julianday('2024-12-31') - julianday(MAX(order_date)) > 180) SELECT o.channel, COUNT(*) AS siparis, ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pay FROM orders o JOIN k ON k.customer_id = o.customer_id GROUP BY o.channel;" },
    { t: 'sql', q: '<p><b>5. Geri kazanım listesi:</b> Kayıp müşteriler arasında teslim edilen siparişlerdeki toplam net harcaması en yüksek <b>10 müşteri</b>: <code>customer_id</code>, <code>ad_soyad</code>, <code>harcama</code> (tam sayı), <code>son_siparis</code>. Harcamaya göre azalan sırala.</p>', sol: `WITH k AS (SELECT customer_id, MAX(order_date) AS son_siparis FROM orders GROUP BY customer_id HAVING julianday('2024-12-31') - julianday(MAX(order_date)) > 180) SELECT c.customer_id, c.first_name || ' ' || c.last_name AS ad_soyad, ROUND(SUM(${NET}), 0) AS harcama, k.son_siparis FROM k JOIN customers c ON c.customer_id = k.customer_id JOIN orders o ON o.customer_id = k.customer_id AND o.status = 'delivered' JOIN order_items oi ON oi.order_id = o.order_id GROUP BY c.customer_id, c.first_name, c.last_name, k.son_siparis ORDER BY harcama DESC LIMIT 10;`, ord: true }
  ]
}]);
})();
