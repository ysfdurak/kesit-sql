/* Kesit SQL içerik 12: eksik konu dersleri (veri tipleri ve saat dilimleri, KVKK, Python ile SQL,
   tam metin arama, hiyerarşik sorgular, ileri pencere çerçeveleri, tasarım kalıpları, SQL testleri, coğrafi veri) */
(function () {
const L = window.SQLP_LESSONS;
const after = (id, lessons) => { const i = L.findIndex(l => l.id === id); L.splice(i < 0 ? L.length : i + 1, 0, ...lessons); };
const NR = src => CODE(src, null, { norun: true });
const mc = (q, o, a, why) => ({ t: 'mc', q, o, a, why });
const sq = (q, sol, o) => Object.assign({ t: 'sql', q: '<p>' + q + '</p>', sol }, o || {});

after('sayi-tip', [{
  id: 'veri-tipleri', lv: 'B2', mod: 'Fonksiyonlar', min: 18,
  title: 'Veri tipleri ayrıntılı: ondalık hassasiyet, Unicode metin ve saat dilimleri',
  sum: 'FLOAT ile DECIMAL farkı, NVARCHAR ve N\'..\', DATE/DATETIME/TIMESTAMP, AT TIME ZONE.',
  body: `
<h2>Para FLOAT'ta tutulmaz</h2>
<p><code>FLOAT</code>/<code>REAL</code>/<code>DOUBLE</code> ikili kayan noktalı sayılardır; 0,1 gibi değerleri tam saklayamazlar. Küçük farklar toplamlarda büyür ve <code>=</code> karşılaştırmaları şaşırtıcı sonuç verir.</p>
<pre class="code">SELECT 0.1 + 0.2                        AS toplam,
       CASE WHEN 0.1 + 0.2 = 0.3 THEN 'eşit' ELSE 'eşit değil' END AS karsilastirma,
       ROUND(0.1 + 0.2, 2)              AS yuvarlanmis;</pre>
<table>
<tr><th>İhtiyaç</th><th>Tip</th></tr>
<tr><td>Para, miktar, oran</td><td><code>DECIMAL(p,s)</code> / <code>NUMERIC(p,s)</code> (SQL Server'da <code>MONEY</code> da var ama hesaplamada yuvarlama riski nedeniyle DECIMAL önerilir; BigQuery'de <code>NUMERIC</code>)</td></tr>
<tr><td>Ölçüm, bilimsel değer</td><td><code>FLOAT</code> / <code>DOUBLE PRECISION</code> / <code>FLOAT64</code></td></tr>
<tr><td>Sayaç, kimlik</td><td><code>INT</code>, büyükse <code>BIGINT</code> (SQL Server INT sınırı ≈ 2,1 milyar)</td></tr>
<tr><td>Evet/hayır</td><td><code>BIT</code> (SQL Server), <code>BOOLEAN</code> (PostgreSQL, MySQL), <code>BOOL</code> (BigQuery); Oracle'da 23ai öncesi <code>NUMBER(1)</code></td></tr>
</table>
<div class="tip"><b>Kural</b>Ondalıklı değerleri karşılaştırırken eşitlik yerine fark kullan: <code>ABS(a - b) &lt; 0.0001</code>. Raporlarda yuvarlamayı en sonda yap.</div>
<h2>Metin: uzunluk ve Unicode</h2>
<ul>
<li><b>SQL Server</b>: <code>VARCHAR</code> tek baytlık kod sayfası, <code>NVARCHAR</code> Unicode. Türkçe karakterler için <code>NVARCHAR</code> ve sabitlerde <code>N'İstanbul'</code> kullan; aksi halde “ş, ğ, İ” soru işaretine dönebilir (UTF-8 collation'lı VARCHAR da bir seçenektir, SQL Server 2019+).</li>
<li><b>PostgreSQL</b>: <code>TEXT</code> ve <code>VARCHAR(n)</code> aynı performanstadır; veritabanı UTF-8 ise sorun yoktur.</li>
<li><b>MySQL</b>: <code>utf8mb4</code> karakter kümesi kullan (eski <code>utf8</code> emojileri saklayamaz).</li>
<li><b>Oracle</b>: <code>VARCHAR2(n CHAR)</code>; bayt ve karakter uzunluğu farkına dikkat (<code>VARCHAR2(10 BYTE)</code> Türkçe karakterlerle 10 harf almayabilir).</li>
</ul>
<pre class="code">SELECT name, LENGTH(name) AS karakter
FROM products
WHERE name LIKE '%ş%' OR name LIKE '%ğ%' OR name LIKE '%ı%';</pre>
<h2>Tarih ve saat tipleri</h2>
<table>
<tr><th></th><th>Yalnız tarih</th><th>Tarih + saat (bölgesiz)</th><th>Saat dilimli an</th></tr>
<tr><td>SQL Server</td><td><code>DATE</code></td><td><code>DATETIME2</code> (<code>DATETIME</code> eski)</td><td><code>DATETIMEOFFSET</code></td></tr>
<tr><td>PostgreSQL</td><td><code>DATE</code></td><td><code>TIMESTAMP</code></td><td><code>TIMESTAMPTZ</code> (UTC saklar, oturumun saat diliminde gösterir)</td></tr>
<tr><td>MySQL</td><td><code>DATE</code></td><td><code>DATETIME</code></td><td><code>TIMESTAMP</code> (UTC'ye çevirip saklar)</td></tr>
<tr><td>Oracle</td><td><code>DATE</code> (saat de içerir!)</td><td><code>TIMESTAMP</code></td><td><code>TIMESTAMP WITH TIME ZONE</code></td></tr>
<tr><td>BigQuery</td><td><code>DATE</code></td><td><code>DATETIME</code></td><td><code>TIMESTAMP</code> (her zaman UTC an)</td></tr>
</table>
<h2>Saat dilimleri</h2>
<p>Altın kural: <b>anları UTC olarak sakla, kullanıcıya gösterirken yerel saate çevir.</b> Türkiye 2016'dan beri yaz-kış saati uygulamadan UTC+3'tür ama müşterilerin veya sunucuların başka bölgelerde olabileceğini unutma.</p>
${NR("-- SQL Server\nSELECT CAST('2024-11-29 21:30:00' AS DATETIME2) AT TIME ZONE 'UTC' AT TIME ZONE 'Turkey Standard Time' AS istanbul;\nSELECT SYSUTCDATETIME() AS utc_simdi, SYSDATETIMEOFFSET() AS yerel_simdi;\n\n-- PostgreSQL\nSELECT TIMESTAMPTZ '2024-11-29 21:30:00+00' AT TIME ZONE 'Europe/Istanbul' AS istanbul;\nSET TIME ZONE 'Europe/Istanbul';\n\n-- MySQL (saat dilimi tabloları yüklüyse)\nSELECT CONVERT_TZ('2024-11-29 21:30:00', 'UTC', 'Europe/Istanbul');\n\n-- Oracle\nSELECT FROM_TZ(TIMESTAMP '2024-11-29 21:30:00', 'UTC') AT TIME ZONE 'Europe/Istanbul' FROM dual;\n\n-- BigQuery\nSELECT DATETIME(TIMESTAMP '2024-11-29 21:30:00+00', 'Europe/Istanbul') AS istanbul;")}
<div class="warn"><b>Gün sınırı</b>UTC'de saklanan olayları “günlük” raporlarken yerel saate çevirmeden <code>DATE(event_time)</code> alırsan, Türkiye için 00:00–03:00 arasındaki olaylar bir önceki güne yazılır.</div>
<p>Bu uygulamadaki <code>web_events.event_time</code> değerlerini UTC kabul edip İstanbul saatine çevirelim (+3 saat):</p>
<pre class="code">SELECT event_time AS utc,
       datetime(event_time, '+3 hours') AS istanbul,
       date(event_time) AS utc_gun,
       date(datetime(event_time, '+3 hours')) AS istanbul_gun
FROM web_events
WHERE strftime('%H', event_time) IN ('21', '22', '23')
ORDER BY event_id
LIMIT 5;</pre>
`,
  ex: [
    sq('<code>web_events.event_time</code> UTC olsun. İstanbul saatine (+3 saat) göre gün bazında olay sayısı ile UTC gününe göre sayının farklı olduğu günleri getir; yalnızca Kasım 2024 (<code>gun</code>, <code>utc_olay</code>, <code>istanbul_olay</code>).', "WITH u AS (SELECT date(event_time) AS gun, COUNT(*) AS c FROM web_events GROUP BY date(event_time)), i AS (SELECT date(datetime(event_time, '+3 hours')) AS gun, COUNT(*) AS c FROM web_events GROUP BY date(datetime(event_time, '+3 hours'))) SELECT u.gun, u.c AS utc_olay, i.c AS istanbul_olay FROM u JOIN i ON i.gun = u.gun WHERE u.gun >= '2024-11-01' AND u.gun < '2024-12-01' AND u.c <> i.c;", { hint: 'İki ayrı gruplama yapıp gün üzerinden birleştir.' }),
    mc('<p>Para tutarlarını saklamak için en uygun tip hangisidir?</p>', ['FLOAT', 'REAL', 'DECIMAL(12,2)', 'VARCHAR(20)'], 2),
    mc('<p>SQL Server\'da Türkçe karakterli bir metin sabitini güvenle yazmak için?</p>', ["<code>'İstanbul'</code>", "<code>N'İstanbul'</code>", '<code>"İstanbul"</code>', '<code>[İstanbul]</code>'], 1),
    mc('<p>Farklı ülkelerdeki kullanıcıların işlem zamanlarını saklarken en doğru yaklaşım?</p>', ['Her kullanıcının yerel saatini saklamak', 'UTC olarak saklayıp gösterirken yerel saate çevirmek', 'Metin olarak saklamak', 'Yalnızca tarihi saklamak'], 1),
    mc('<p>Oracle\'da <code>DATE</code> tipi hakkında doğru olan?</p>', ['Yalnızca tarihi tutar', 'Tarih ve saati (saniyeye kadar) tutar', 'Saat dilimini de tutar', 'Metin olarak saklanır'], 1)
  ]
}]);

after('guvenlik', [{
  id: 'kvkk', lv: 'C1', mod: 'Modern SQL', min: 16,
  title: 'KVKK ve kişisel veri: maskeleme, takma adlandırma, saklama ve silme',
  sum: 'Veri sorumlusu olarak SQL tarafında yapılacaklar: en az veri, maskeleme, k-anonimlik, imha.',
  body: `
<h2>Neden SQL geliştiricisini ilgilendirir?</h2>
<p>6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) ve AB'deki GDPR, kişisel verinin işlenmesine, saklanmasına ve silinmesine kurallar getirir. Kuralları hukuk ekibi yorumlar ama uygulama çoğu zaman veritabanında yapılır: kimin hangi sütunu gördüğü, test ortamına ne kopyalandığı, verinin ne zaman imha edildiği.</p>
<div class="note"><b>Hukuki not</b>Bu ders teknik uygulamaları anlatır; hukuki danışmanlık değildir. Kurumunun KVKK politikası ve veri envanteri esas alınmalıdır.</div>
<h2>Temel ilkeler ve SQL karşılıkları</h2>
<table>
<tr><th>İlke</th><th>Veritabanında</th></tr>
<tr><td>Amaçla sınırlı ve ölçülü işleme</td><td>Raporlara yalnızca gereken sütunlar; <code>SELECT *</code> ile kişisel veriyi gereksiz taşımama</td></tr>
<tr><td>Erişimin sınırlanması</td><td>Rol bazlı yetki, görünüm üzerinden erişim, satır düzeyinde güvenlik, dinamik veri maskeleme</td></tr>
<tr><td>Veri güvenliği</td><td>Şifreleme (diskte ve iletimde), denetim kayıtları</td></tr>
<tr><td>Saklama süresi ve imha</td><td>Süresi dolan verinin silinmesi, anonimleştirilmesi; imha kayıtları</td></tr>
<tr><td>İlgili kişinin hakları</td><td>Kişinin verilerini bulup raporlayabilmek, düzeltebilmek, silebilmek</td></tr>
</table>
<h2>Maskeleme</h2>
<p>Raporu veya test verisini hazırlarken değerin bir kısmını gizlemek:</p>
<pre class="code">SELECT customer_id,
       SUBSTR(first_name, 1, 1) || '***'                         AS ad,
       SUBSTR(last_name, 1, 1) || '.'                             AS soyad,
       SUBSTR(email, 1, 2) || '***' || SUBSTR(email, INSTR(email, '@')) AS email_maskeli,
       2024 - birth_year - (2024 - birth_year) % 10               AS yas_grubu
FROM customers
WHERE email IS NOT NULL
ORDER BY customer_id
LIMIT 5;</pre>
${NR("-- SQL Server: dinamik veri maskeleme (veri değişmez, yetkisiz kullanıcı maskeli görür)\nALTER TABLE dbo.customers ALTER COLUMN email ADD MASKED WITH (FUNCTION = 'email()');\nALTER TABLE dbo.customers ALTER COLUMN last_name ADD MASKED WITH (FUNCTION = 'partial(1, \"***\", 0)');\nGRANT UNMASK TO rapor_yoneticisi;\n\n-- PostgreSQL: maskeli görünüm ve yetki\nCREATE VIEW rapor.v_musteri AS\nSELECT customer_id, left(first_name, 1) || '***' AS ad, city, segment FROM customers;\nREVOKE ALL ON customers FROM analist;\nGRANT SELECT ON rapor.v_musteri TO analist;")}
<h2>Takma adlandırma (pseudonymization)</h2>
<p>Kimlik bilgisini, geri döndürülmesi zor bir anahtarla değiştirmek: e-posta yerine e-postanın tuzlu özeti (hash). Analizde aynı kişiyi takip edebilirsin ama kim olduğunu doğrudan göremezsin. Tuz (salt) ayrı ve güvenli saklanmalı.</p>
${NR("-- SQL Server\nSELECT CONVERT(VARCHAR(64), HASHBYTES('SHA2_256', CONCAT(@tuz, LOWER(email))), 2) AS kisi_anahtari FROM dbo.customers;\n-- PostgreSQL (pgcrypto)\nSELECT encode(digest(:tuz || lower(email), 'sha256'), 'hex') AS kisi_anahtari FROM customers;\n-- BigQuery\nSELECT TO_HEX(SHA256(CONCAT(@tuz, LOWER(email)))) AS kisi_anahtari FROM anadolu.customers;")}
<div class="warn"><b>Takma ad ≠ anonim</b>Takma adlandırılmış veri hâlâ kişisel veridir; anahtar ve başka bilgilerle kişiye ulaşılabilir. Anonim veri için kişiyi tekrar tanımlamak makul yollarla mümkün olmamalıdır.</div>
<h2>Yeniden tanınma riski: k-anonimlik</h2>
<p>Ad soyad silinse bile “şehir + doğum yılı + cinsiyet” birleşimi tek bir kişiye işaret edebilir. Bir veri setinde bu tür <b>yarı tanımlayıcıların</b> her birleşiminin en az <i>k</i> kişide görünmesi istenir. SQL ile kontrol:</p>
<pre class="code">SELECT city, birth_year, gender, COUNT(*) AS kisi
FROM customers
WHERE city IS NOT NULL
GROUP BY city, birth_year, gender
HAVING COUNT(*) < 3
ORDER BY kisi, city
LIMIT 8;</pre>
<p>Çözüm genellikle genelleştirmedir: doğum yılı yerine 10'luk yaş grubu, şehir yerine bölge.</p>
<h2>Saklama süresi ve imha</h2>
${NR("-- 10 yılı dolmuş, ilişkisi bitmiş müşterilerin kişisel alanlarını anonimleştir\nUPDATE customers\nSET first_name = 'Anonim', last_name = 'Anonim', email = NULL, birth_year = NULL\nWHERE iliski_bitis < DATEADD(year, -10, GETDATE());\n\n-- İmha kaydı\nINSERT INTO imha_kaydi (tablo, kayit_sayisi, yontem, tarih)\nVALUES ('customers', @@ROWCOUNT, 'anonimleştirme', SYSDATETIME());")}
<h2>İlgili kişinin talebi</h2>
<p>“Hakkımda hangi verileri tutuyorsunuz?” sorusuna yanıt verebilmek için kişiye bağlı tüm tabloları bilmek gerekir (veri envanteri). Yabancı anahtarlar ve iyi adlandırılmış sütunlar bu işi kolaylaştırır.</p>
`,
  ex: [
    sq('Analistlere verilecek bir müşteri listesi hazırla: <code>customer_id</code>, adın ilk harfi + \'***\' (<code>ad</code>), şehir, segment ve doğum yılı yerine onluk yaş grubu (<code>yas_grubu</code>; 2024 yılına göre yaşın 10\'a yuvarlanmış alt sınırı, ör. 34 → 30). İlk 10 müşteri (<code>customer_id</code> sırasıyla).', "SELECT customer_id, SUBSTR(first_name, 1, 1) || '***' AS ad, city, segment, (2024 - birth_year) - (2024 - birth_year) % 10 AS yas_grubu FROM customers ORDER BY customer_id LIMIT 10;", { ord: true, hint: 'Yaştan, yaşın 10\'a bölümünden kalanı çıkar (MOD / %).' }),
    sq('k-anonimlik kontrolü: şehir ve cinsiyet birleşiminde 3\'ten az müşterinin bulunduğu grupların sayısı (şehri boş olanlar hariç): <code>riskli_grup</code>.', 'SELECT COUNT(*) AS riskli_grup FROM (SELECT city, gender FROM customers WHERE city IS NOT NULL GROUP BY city, gender HAVING COUNT(*) < 3) AS t;'),
    mc('<p>E-postayı tuzlu SHA-256 özetiyle değiştirmek hangisidir?</p>', ['Anonimleştirme', 'Takma adlandırma (pseudonymization)', 'Şifre çözme', 'Normalizasyon'], 1),
    mc('<p>SQL Server dinamik veri maskeleme için doğru olan?</p>', ['Diskteki veriyi şifreler', 'Veriyi değiştirmeden yetkisiz kullanıcıya maskeli gösterir', 'Veriyi siler', 'Yalnızca yedekleri korur'], 1),
    mc('<p>Ad soyad silinmiş bir veri setinde yeniden tanınma riskini artıran nedir?</p>', ['Satır sayısının fazla olması', 'Şehir, doğum yılı, cinsiyet gibi yarı tanımlayıcıların nadir birleşimleri', 'İndeks olması', 'Tablonun büyük olması'], 1)
  ]
}]);

after('an-dashboard', [{
  id: 'python-sql', lv: 'B2', mod: 'Veri Analisti', min: 15,
  title: 'Python ile SQL: pandas, parametreli sorgu ve SQLAlchemy',
  sum: 'Sorgu sonucunu DataFrame\'e almak, güvenli parametre, büyük veride parça parça okuma, tabloya yazma.',
  body: `
<h2>Neden Python?</h2>
<p>Analist ve veri bilimciler çoğu zaman veriyi SQL ile süzer ve özetler, sonra Python ile görselleştirir, modeller veya otomatikleştirir. İyi pratik: <b>ağır işi veritabanında yap</b> (filtre, birleştirme, toplama), Python'a yalnızca gereken özet satırları getir.</p>
<h2>pandas ile okumak</h2>
${NR("import pandas as pd\nfrom sqlalchemy import create_engine, text\n\n# Bağlantı adresleri\n# PostgreSQL : postgresql+psycopg://kullanici:sifre@sunucu:5432/anadolu\n# SQL Server : mssql+pyodbc://kullanici:sifre@sunucu/anadolu?driver=ODBC+Driver+18+for+SQL+Server\n# MySQL      : mysql+pymysql://kullanici:sifre@sunucu/anadolu\n# SQLite     : sqlite:///anadolu.db\nengine = create_engine(\"postgresql+psycopg://analist:***@db.sirket.local/anadolu\")\n\nsorgu = text(\"\"\"\n    SELECT date_trunc('month', o.order_date) AS ay,\n           o.channel,\n           SUM(oi.quantity * oi.unit_price * (1 - oi.discount)) AS ciro\n    FROM orders o JOIN order_items oi ON oi.order_id = o.order_id\n    WHERE o.status = 'delivered' AND o.order_date >= :baslangic\n    GROUP BY 1, 2\n\"\"\")\ndf = pd.read_sql(sorgu, engine, params={\"baslangic\": \"2024-01-01\"})\npivot = df.pivot(index=\"ay\", columns=\"channel\", values=\"ciro\")\npivot.plot(kind=\"line\")")}
<h2>Parametre: asla metin birleştirme</h2>
${NR("# YANLIŞ: SQL enjeksiyonuna açık ve tip sorunları çıkarır\nsehir = input()\npd.read_sql(f\"SELECT * FROM customers WHERE city = '{sehir}'\", engine)\n\n# DOĞRU: parametreli\npd.read_sql(text(\"SELECT * FROM customers WHERE city = :sehir\"), engine, params={\"sehir\": sehir})\n\n# Sürücüye göre yer tutucular: psycopg %s, pyodbc ?, sqlite3 ? veya :ad")}
<h2>Büyük veri</h2>
<ul>
<li><code>pd.read_sql(..., chunksize=50_000)</code> sonucu parça parça okur; bellek taşmaz.</li>
<li>Gereksiz sütun çekme: <code>SELECT *</code> yerine sütun listesi.</li>
<li>BigQuery için <code>google-cloud-bigquery</code> ve <code>client.query(sql).to_dataframe()</code>; Snowflake ve Databricks'in de kendi bağlayıcıları var.</li>
</ul>
<h2>Tabloya yazmak</h2>
${NR("df_sonuc.to_sql(\"kampanya_skorlari\", engine, schema=\"analiz\", if_exists=\"replace\", index=False, chunksize=10_000)\n\n# İşlem içinde birden çok ifade\nwith engine.begin() as conn:\n    conn.execute(text(\"DELETE FROM analiz.gunluk WHERE gun = :g\"), {\"g\": gun})\n    df_gun.to_sql(\"gunluk\", conn, schema=\"analiz\", if_exists=\"append\", index=False)")}
<h2>SQL'de mi pandas'ta mı?</h2>
<table>
<tr><th>İş</th><th>Nerede?</th></tr>
<tr><td>Milyonlarca satırı süzmek, birleştirmek, toplamak</td><td>SQL</td></tr>
<tr><td>Pencere fonksiyonları, kohort, huni</td><td>SQL (pandas'ta da yapılır ama veri önce taşınmalı)</td></tr>
<tr><td>Görselleştirme, istatistik testleri, makine öğrenmesi</td><td>Python</td></tr>
<tr><td>Zamanlanmış rapor</td><td>SQL sorgusu + Python betiği + zamanlayıcı (Airflow, cron)</td></tr>
</table>
`,
  ex: [
    sq('pandas\'a aktarılacak özet sorguyu yaz: 2024 için ay ve kanal kırılımında teslim edilen net ciro (tam sayı) — <code>ay</code> (YYYY-AA), <code>channel</code>, <code>ciro</code>. Aya ve kanala göre sırala.', "SELECT strftime('%Y-%m', o.order_date) AS ay, o.channel, ROUND(SUM(oi.quantity * oi.unit_price * (1 - oi.discount)), 0) AS ciro FROM orders o JOIN order_items oi ON oi.order_id = o.order_id WHERE o.status = 'delivered' AND o.order_date >= '2024-01-01' AND o.order_date < '2025-01-01' GROUP BY strftime('%Y-%m', o.order_date), o.channel ORDER BY ay, o.channel;", { ord: true }),
    mc('<p>Kullanıcıdan gelen şehir adıyla sorgu çalıştırırken doğru yöntem?</p>', ['f-string ile sorguya eklemek', 'Parametreli sorgu (params) kullanmak', 'Tırnakları silip eklemek', 'Sorguyu Python\'da filtrelemek için tüm tabloyu çekmek'], 1),
    mc('<p>50 milyon satırlık tablodan aylık toplam gerekiyor. En verimli yol?</p>', ['Tüm tabloyu pandas\'a çekip groupby yapmak', 'Toplamayı SQL\'de yapıp yalnızca özet satırları çekmek', 'CSV\'ye aktarıp Excel\'de açmak', 'chunksize=1 ile okumak'], 1),
    mc('<p><code>pd.read_sql(..., chunksize=50000)</code> ne sağlar?</p>', ['Sorguyu hızlandırır', 'Sonucu parçalar halinde okuyarak belleği korur', 'İlk 50.000 satırı getirir', 'İndeks oluşturur'], 1)
  ]
}]);

after('mysql-ozel', [{
  id: 'tam-metin', lv: 'C1', mod: 'Programlara Özgü', min: 15,
  title: 'Tam metin arama: LIKE yerine dizinli kelime araması',
  sum: 'PostgreSQL tsvector, SQL Server CONTAINS, MySQL MATCH AGAINST, SQLite FTS; sıralama ve Türkçe.',
  body: `
<h2>LIKE'ın sınırları</h2>
<p><code>WHERE aciklama LIKE '%kablosuz%'</code> her satırı baştan sona tarar (baştaki % yüzünden indeks kullanılamaz), kelime köklerini bilmez (“kulaklıklar”ı bulmaz) ve sonuçları alaka düzeyine göre sıralayamaz. <b>Tam metin arama</b> metni kelimelere (token) ayırıp ters dizin (inverted index) oluşturur.</p>
<h2>SQLite FTS ile deneyelim</h2>
<pre class="code" data-na="tsql pg mysql oracle bq">CREATE VIRTUAL TABLE urun_ara USING fts4(name, category);
INSERT INTO urun_ara (docid, name, category) SELECT product_id, name, category FROM products;

SELECT docid AS product_id, name
FROM urun_ara
WHERE urun_ara MATCH 'kablosuz OR bluetooth';</pre>
<h2>Programlara göre</h2>
${NR("-- PostgreSQL\nALTER TABLE products ADD COLUMN arama tsvector\n  GENERATED ALWAYS AS (to_tsvector('turkish', coalesce(name, '') || ' ' || coalesce(category, ''))) STORED;\nCREATE INDEX ix_products_arama ON products USING GIN (arama);\n\nSELECT name, ts_rank(arama, q) AS puan\nFROM products, websearch_to_tsquery('turkish', 'kablosuz kulaklık') AS q\nWHERE arama @@ q\nORDER BY puan DESC;\n\n-- Benzer yazım için: CREATE EXTENSION pg_trgm; WHERE name % 'kulaklik'\n\n-- SQL Server\nCREATE FULLTEXT CATALOG ftc AS DEFAULT;\nCREATE FULLTEXT INDEX ON dbo.products (name LANGUAGE 1055) KEY INDEX PK_products;  -- 1055 = Türkçe\nSELECT name FROM dbo.products WHERE CONTAINS(name, N'\"kablosuz*\"');\nSELECT name FROM dbo.products WHERE FREETEXT(name, N'kablosuz kulaklık');\n\n-- MySQL (InnoDB)\nALTER TABLE products ADD FULLTEXT INDEX ft_name (name);\nSELECT name, MATCH(name) AGAINST('kablosuz kulaklık' IN NATURAL LANGUAGE MODE) AS puan\nFROM products WHERE MATCH(name) AGAINST('+kablosuz -hoparlör' IN BOOLEAN MODE);\n\n-- Oracle Text\nCREATE INDEX ix_ad ON products (name) INDEXTYPE IS CTXSYS.CONTEXT;\nSELECT name, SCORE(1) FROM products WHERE CONTAINS(name, 'kablosuz', 1) > 0 ORDER BY SCORE(1) DESC;\n\n-- BigQuery\nCREATE SEARCH INDEX ix_ara ON anadolu.products (name);\nSELECT name FROM anadolu.products WHERE SEARCH(name, 'kablosuz');")}
<h2>Türkçe dikkat noktaları</h2>
<ul>
<li>Kök bulma (stemming) dile özgüdür: PostgreSQL'de <code>'turkish'</code> yapılandırması, SQL Server'da dil kodu 1055.</li>
<li>Büyük/küçük harf ve “İ/ı” dönüşümü için önce collation dersindeki normalleştirmeyi uygula.</li>
<li>Yazım hatalı aramalar için trigram (pg_trgm) veya Levenshtein; anlam araması için vektör arama (Yapay Zekâ modülü).</li>
<li>Çok büyük ve karmaşık arama ihtiyaçlarında Elasticsearch/OpenSearch gibi arama motorları kullanılır; veritabanı yine asıl kaynak olarak kalır.</li>
</ul>
`,
  ex: [
    { t: 'sql', base: 'sqlite', dl: ['sqlite'], q: '<p>SQLite FTS ile: ürün adlarından oluşan <code>ara</code> adında bir fts4 tablosu oluştur (docid = product_id), içine tüm ürünleri ekle ve adında <b>kulaklık</b> veya <b>mouse</b> geçen ürünleri getir: <code>product_id</code>, <code>name</code>.</p>', sol: "CREATE VIRTUAL TABLE ara USING fts4(name); INSERT INTO ara (docid, name) SELECT product_id, name FROM products; SELECT docid AS product_id, name FROM ara WHERE ara MATCH 'kulaklık OR mouse';" },
    mc('<p><code>WHERE name LIKE \'%kablosuz%\'</code> neden büyük tablolarda yavaştır?</p>', ['LIKE yanlış yazılmıştır', 'Baştaki % nedeniyle B-tree indeks kullanılamaz ve her satır taranır', 'Türkçe karakter içerdiği için', 'COUNT gerektirdiği için'], 1),
    mc('<p>PostgreSQL\'de tsvector sütunu için uygun indeks türü?</p>', ['B-tree', 'GIN', 'Hash', 'BRIN'], 1),
    mc('<p>MySQL\'de “kablosuz geçsin ama hoparlör geçmesin” araması hangi modla yazılır?</p>', ['NATURAL LANGUAGE MODE', 'BOOLEAN MODE (+kablosuz -hoparlör)', 'QUERY EXPANSION', 'LIKE'], 1)
  ]
}]);

after('recursive-cte', [{
  id: 'hiyerarsi', lv: 'C1', mod: 'İleri Sorgu Yapıları', min: 16,
  title: 'Hiyerarşik veriler: CONNECT BY, özyinelemeli CTE, hierarchyid ve yol yöntemi',
  sum: 'Oracle START WITH / CONNECT BY PRIOR, LEVEL, SYS_CONNECT_BY_PATH; diğer programlarda karşılıkları.',
  body: `
<h2>Ağaç yapıları</h2>
<p>Organizasyon şeması, kategori ağacı, ürün reçetesi (bill of materials), yorum yanıtları… Hepsi bir satırın başka bir satıra “ebeveyn” olarak bağlandığı yapılardır. En yaygın saklama biçimi <b>komşuluk listesi</b>dir: <code>employees.manager_id → employees.emp_id</code>.</p>
<h2>Oracle: CONNECT BY</h2>
<p>Oracle'ın özyinelemeli CTE'den önce de var olan ve hâlâ çok kullanılan sözdizimi:</p>
${CODE("SELECT LPAD(' ', 2 * (LEVEL - 1)) || first_name AS agac,\n       LEVEL,\n       SYS_CONNECT_BY_PATH(first_name, '/') AS yol,\n       CONNECT_BY_ISLEAF AS yaprak\nFROM employees\nSTART WITH manager_id IS NULL\nCONNECT BY PRIOR emp_id = manager_id\nORDER SIBLINGS BY first_name;", null, { base: 'oracle' })}
<table>
<tr><th>Öğe</th><th>Anlamı</th></tr>
<tr><td><code>START WITH</code></td><td>Kök satır(lar)</td></tr>
<tr><td><code>CONNECT BY PRIOR emp_id = manager_id</code></td><td>Ebeveynin emp_id'si çocuğun manager_id'sine eşit (yukarıdan aşağı)</td></tr>
<tr><td><code>LEVEL</code></td><td>Derinlik (kök = 1)</td></tr>
<tr><td><code>SYS_CONNECT_BY_PATH(sütun, '/')</code></td><td>Kökten satıra kadar yol</td></tr>
<tr><td><code>CONNECT_BY_ROOT sütun</code></td><td>Satırın kökündeki değer</td></tr>
<tr><td><code>CONNECT_BY_ISLEAF</code></td><td>Yaprak mı (çocuğu yok)?</td></tr>
<tr><td><code>ORDER SIBLINGS BY</code></td><td>Ağaç düzenini bozmadan kardeşleri sırala</td></tr>
<tr><td><code>NOCYCLE</code></td><td>Döngü varsa durdur</td></tr>
</table>
<h3>Satır üreteci</h3>
${CODE("SELECT LEVEL AS gun_no,\n       DATE '2024-12-01' + LEVEL - 1 AS gun\nFROM dual\nCONNECT BY LEVEL <= 7;", null, { base: 'oracle' })}
<h2>Standart yol: özyinelemeli CTE</h2>
<pre class="code">WITH RECURSIVE agac AS (
  SELECT emp_id, first_name, manager_id, 1 AS duzey, '/' || first_name AS yol
  FROM employees WHERE manager_id IS NULL
  UNION ALL
  SELECT e.emp_id, e.first_name, e.manager_id, a.duzey + 1, a.yol || '/' || e.first_name
  FROM employees e JOIN agac a ON e.manager_id = a.emp_id
)
SELECT duzey, yol FROM agac ORDER BY yol;</pre>
<h2>Diğer saklama yöntemleri</h2>
<table>
<tr><th>Yöntem</th><th>Nasıl?</th><th>Güçlü yanı</th></tr>
<tr><td>Komşuluk listesi</td><td>parent_id sütunu</td><td>Basit, güncellemesi kolay; derin sorgular özyineleme ister</td></tr>
<tr><td>Yol (materialized path)</td><td><code>'/1/3/7/'</code> metni; <code>WHERE yol LIKE '/1/3/%'</code></td><td>Alt ağaç sorgusu hızlı; taşıma pahalı</td></tr>
<tr><td>SQL Server <code>hierarchyid</code></td><td><code>node.IsDescendantOf(@kok)</code>, <code>GetLevel()</code></td><td>Yerleşik tip ve indeks</td></tr>
<tr><td>PostgreSQL <code>ltree</code></td><td><code>yol &lt;@ 'genel.satis'</code></td><td>GiST indeksli yol sorgusu</td></tr>
<tr><td>Kapanış tablosu (closure)</td><td>(ata, torun, derinlik) satırları</td><td>Her sorgu hızlı; yazma maliyeti yüksek</td></tr>
</table>
${NR("-- SQL Server hierarchyid\nSELECT ad, dugum.ToString() AS yol, dugum.GetLevel() AS duzey\nFROM dbo.org\nWHERE dugum.IsDescendantOf(hierarchyid::Parse('/1/')) = 1;\n\n-- PostgreSQL ltree\nCREATE EXTENSION ltree;\nSELECT ad FROM kategori WHERE yol <@ 'elektronik.ses';")}
`,
  ex: [
    { t: 'sql', base: 'oracle', dl: ['oracle'], q: '<p>Oracle <code>CONNECT BY</code> ile: Elif adlı ve <code>emp_id = 2</code> olan yöneticiden başlayarak altındaki tüm çalışanları düzeyleriyle getir (Elif dahil): <code>first_name</code>, <code>duzey</code> (LEVEL).</p>', sol: 'SELECT first_name, LEVEL AS duzey FROM employees START WITH emp_id = 2 CONNECT BY PRIOR emp_id = manager_id;' },
    { t: 'sql', base: 'oracle', dl: ['oracle'], q: '<p>Oracle satır üreteciyle 1\'den 12\'ye kadar ay numaraları ve her ay 2024\'te verilen sipariş sayısı (yoksa 0): <code>ay</code>, <code>siparis</code>.</p>', sol: "SELECT g.ay, COUNT(o.order_id) AS siparis FROM (SELECT LEVEL AS ay FROM dual CONNECT BY LEVEL <= 12) g LEFT JOIN orders o ON EXTRACT(MONTH FROM o.order_date) = g.ay AND EXTRACT(YEAR FROM o.order_date) = 2024 GROUP BY g.ay ORDER BY g.ay;", ord: true },
    sq('Özyinelemeli CTE ile her çalışanın genel müdüre olan uzaklığını (düzey) ve yöneticisinin adını getir; yalnızca düzeyi 3 olanlar: <code>first_name</code>, <code>yonetici</code>.', 'WITH RECURSIVE a AS (SELECT emp_id, first_name, manager_id, 1 AS duzey FROM employees WHERE manager_id IS NULL UNION ALL SELECT e.emp_id, e.first_name, e.manager_id, a.duzey + 1 FROM employees e JOIN a ON e.manager_id = a.emp_id) SELECT a.first_name, m.first_name AS yonetici FROM a JOIN employees m ON m.emp_id = a.manager_id WHERE a.duzey = 3;'),
    mc('<p>Oracle\'da <code>CONNECT BY PRIOR manager_id = emp_id</code> hangi yönde ilerler?</p>', ['Yukarıdan aşağı (yöneticiden çalışanlara)', 'Aşağıdan yukarı (çalışandan yöneticilere)', 'Yatay', 'Döngüsel'], 1, 'PRIOR, bir önceki (ebeveyn) satırı gösterir; burada önceki satırın manager_id\'si bu satırın emp_id\'si, yani yukarı çıkılır.'),
    mc('<p>Kardeşleri sıralarken ağaç düzenini koruyan ifade?</p>', ['ORDER BY LEVEL', 'ORDER SIBLINGS BY', 'GROUP BY PRIOR', 'SORT TREE'], 1)
  ]
}]);

after('first-last', [{
  id: 'pencere-cerceve', lv: 'C1', mod: 'Pencere Fonksiyonları', min: 15,
  title: 'İleri pencere çerçeveleri: ROWS, RANGE, GROUPS ve EXCLUDE',
  sum: 'Eşitliklerin pencereyi nasıl etkilediği, değer aralığına göre pencere, programlara göre destek.',
  body: `
<h2>Üç çerçeve birimi</h2>
<table>
<tr><th>Birim</th><th>Pencereyi neye göre sayar?</th></tr>
<tr><td><code>ROWS</code></td><td>Fiziksel satır sayısı</td></tr>
<tr><td><code>RANGE</code></td><td>ORDER BY değerinin aralığı (eşit değerler hep birlikte)</td></tr>
<tr><td><code>GROUPS</code></td><td>Eşit değer gruplarının sayısı</td></tr>
</table>
<h3>ROWS ile RANGE farkı: eşitlikler</h3>
<p>Aynı fiyattaki ürünlerde yürüyen toplam:</p>
<pre class="code">SELECT name, price,
       SUM(price) OVER (ORDER BY price ROWS  BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS rows_toplam,
       SUM(price) OVER (ORDER BY price RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS range_toplam
FROM products
WHERE category IN ('Kitap', 'Hediye')
ORDER BY price, name;</pre>
<p>RANGE, aynı fiyattaki tüm satırları “şu ana kadar” sayar; bu yüzden eşit değerli satırlar aynı toplamı gösterir. ORDER BY yazıp çerçeve yazmazsan <b>varsayılan RANGE</b>'dir; yürüyen toplamda beklenmedik sonuç görürsen nedeni budur.</p>
<h3>Değer aralığına göre pencere</h3>
<p>“Son 7 günlük sipariş sayısı” gibi takvime dayalı pencerelerde satır sayısı değil <b>tarih aralığı</b> gerekir (bazı günlerde hiç sipariş yoksa ROWS yanlış olur):</p>
${NR("-- PostgreSQL, Oracle, MySQL 8\nSELECT order_date, gunluk,\n       SUM(gunluk) OVER (ORDER BY order_date\n                         RANGE BETWEEN INTERVAL '6' DAY PRECEDING AND CURRENT ROW) AS son7\nFROM gunluk_siparis;\n\n-- BigQuery: RANGE yalnızca sayısal; tarihi gün numarasına çevir\nSUM(gunluk) OVER (ORDER BY UNIX_DATE(order_date) RANGE BETWEEN 6 PRECEDING AND CURRENT ROW)\n\n-- SQL Server: RANGE yalnızca UNBOUNDED / CURRENT ROW destekler;\n-- takvim tablosuyla eksik günleri doldurup ROWS BETWEEN 6 PRECEDING kullanılır.")}
<p>SQLite'ta da sayısal RANGE vardır; tarihi gün numarasına (julianday) çevirerek deneyelim:</p>
<pre class="code" data-na="tsql pg oracle bq mysql">WITH g AS (
  SELECT order_date, COUNT(*) AS gunluk
  FROM orders
  WHERE order_date >= '2024-12-01'
  GROUP BY order_date
)
SELECT order_date, gunluk,
       SUM(gunluk) OVER (ORDER BY julianday(order_date) RANGE BETWEEN 6 PRECEDING AND CURRENT ROW) AS son7
FROM g
ORDER BY order_date;</pre>
<h3>GROUPS ve EXCLUDE</h3>
<pre class="code" data-na="tsql mysql bq">SELECT name, price,
       SUM(price) OVER (ORDER BY price GROUPS BETWEEN 1 PRECEDING AND 1 FOLLOWING) AS komsu_gruplar,
       AVG(price) OVER (PARTITION BY category ORDER BY price
                        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
                        EXCLUDE CURRENT ROW) AS digerlerinin_ort
FROM products
WHERE category = 'Kitap'
ORDER BY price;</pre>
<p><code>EXCLUDE CURRENT ROW</code> satırın kendisini pencereden çıkarır: “bu ürün kategorideki diğer ürünlerin ortalamasından ne kadar farklı?” sorusu için idealdir. Diğer seçenekler: <code>EXCLUDE GROUP</code>, <code>EXCLUDE TIES</code>, <code>EXCLUDE NO OTHERS</code>.</p>
<table>
<tr><th>Program</th><th>ROWS</th><th>RANGE (değer aralığı)</th><th>GROUPS</th><th>EXCLUDE</th></tr>
<tr><td>PostgreSQL 11+</td><td>✓</td><td>✓ (interval dahil)</td><td>✓</td><td>✓</td></tr>
<tr><td>Oracle</td><td>✓</td><td>✓</td><td>21c+</td><td>21c+</td></tr>
<tr><td>MySQL 8</td><td>✓</td><td>✓</td><td>—</td><td>—</td></tr>
<tr><td>SQL Server</td><td>✓</td><td>yalnızca UNBOUNDED/CURRENT ROW</td><td>—</td><td>—</td></tr>
<tr><td>BigQuery</td><td>✓</td><td>yalnızca sayısal</td><td>—</td><td>—</td></tr>
<tr><td>SQLite 3.28+</td><td>✓</td><td>✓ (sayısal)</td><td>✓</td><td>✓</td></tr>
</table>
`,
  ex: [
    sq('Aralık 2024\'te her gün için o gün ve önceki 2 takvim günündeki toplam sipariş sayısı (sipariş olmayan günler atlanmış olsa bile takvime göre): <code>order_date</code>, <code>gunluk</code>, <code>son3</code>. Tarihe göre sırala.', "WITH g AS (SELECT order_date, COUNT(*) AS gunluk FROM orders WHERE order_date >= '2024-12-01' AND order_date < '2025-01-01' GROUP BY order_date) SELECT a.order_date, a.gunluk, (SELECT SUM(b.gunluk) FROM g b WHERE b.order_date BETWEEN date(a.order_date, '-2 days') AND a.order_date) AS son3 FROM g a ORDER BY a.order_date;", { ord: true, hint: 'Her programda çalışan yol: ilişkili alt sorgu veya kendine birleştirme ile tarih aralığı. RANGE destekleyen programlarda pencereyle de yazabilirsin.' }),
    sq('Her Kitap ürününün fiyatı ile aynı kategorideki <b>diğer</b> ürünlerin ortalama fiyatı arasındaki fark (2 basamak): <code>name</code>, <code>price</code>, <code>fark</code>. (EXCLUDE yoksa toplamdan kendini çıkararak hesapla.)', "SELECT name, price, ROUND(price - (SUM(price) OVER () - price) / (COUNT(*) OVER () - 1), 2) AS fark FROM products WHERE category = 'Kitap';", { hint: 'Diğerlerinin ortalaması = (toplam − kendisi) ÷ (adet − 1).' }),
    mc('<p>ORDER BY içeren bir pencerede çerçeve yazılmazsa varsayılan nedir?</p>', ['ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW', 'RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW', 'Tüm bölüm', 'Yalnızca mevcut satır'], 1),
    mc('<p>Bazı günlerde hiç kaydın olmadığı bir tabloda “son 7 takvim günü” toplamı için hangisi doğrudur?</p>', ['ROWS BETWEEN 6 PRECEDING AND CURRENT ROW', 'Tarihe göre RANGE aralığı veya eksik günleri takvimle doldurduktan sonra ROWS', 'GROUPS BETWEEN 6 PRECEDING', 'LAG(x, 7)'], 1)
  ]
}]);

after('normalizasyon', [{
  id: 'tasarim-kaliplari', lv: 'C1', mod: 'Veritabanı Tasarımı', min: 15,
  title: 'Tasarım kalıpları ve kötü pratikler: soft delete, denetim sütunları, EAV, JSON mu tablo mu?',
  sum: 'Gerçek projelerde sık karşılaşılan tasarım kararları ve sonuçları.',
  body: `
<h2>Denetim sütunları</h2>
<p>Neredeyse her iş tablosunda bulunur: <code>created_at</code>, <code>created_by</code>, <code>updated_at</code>, <code>updated_by</code>. Varsayılan değerle (<code>DEFAULT CURRENT_TIMESTAMP</code>) ve güncellemede trigger veya uygulama katmanıyla doldurulur. Ayrıntılı geçmiş gerekiyorsa temporal tablo veya ayrı bir geçmiş tablosu.</p>
<h2>Soft delete (yumuşak silme)</h2>
<p>Satırı silmek yerine <code>is_deleted = 1</code> veya <code>deleted_at</code> işaretlemek. Geri alınabilirlik ve denetim sağlar ama bedeli vardır:</p>
<ul>
<li>Her sorguya <code>WHERE deleted_at IS NULL</code> eklemek gerekir; unutulursa silinmiş veri raporlara karışır. Çözüm: aktif satırları gösteren bir <b>görünüm</b>.</li>
<li>Tekil kısıtlar bozulur (silinen e-postayla yeni kayıt açılamaz). Çözüm: filtreli/kısmi indeks (<code>CREATE UNIQUE INDEX ... WHERE deleted_at IS NULL</code>, PostgreSQL ve SQL Server destekler).</li>
<li>KVKK açısından “silindi” sayılmaz; kişisel veri imhası ayrıca yapılmalı.</li>
</ul>
<pre class="code">CREATE TABLE etiket (
  etiket_id  INTEGER PRIMARY KEY,
  ad         TEXT NOT NULL,
  deleted_at TEXT
);
INSERT INTO etiket VALUES (1, 'kampanya', NULL), (2, 'yeni', '2024-11-01'), (3, 'indirim', NULL);
CREATE VIEW v_etiket AS SELECT etiket_id, ad FROM etiket WHERE deleted_at IS NULL;
SELECT * FROM v_etiket;</pre>
<h2>EAV: varlık-öznitelik-değer tuzağı</h2>
<p>“Her ürünün farklı özellikleri var” diye tek bir <code>(urun_id, ozellik, deger)</code> tablosu kurmak esnek görünür ama:</p>
<ul>
<li>Tip güvenliği yoktur (her değer metin), kısıt yazılamaz.</li>
<li>Basit bir rapor bile çok sayıda self join veya pivot gerektirir.</li>
<li>İndekslemek ve optimize etmek zordur.</li>
</ul>
<p>Alternatifler: ortak alanlar sütun, değişken alanlar <b>JSON</b> sütunu (PostgreSQL <code>jsonb</code> + GIN indeks, SQL Server JSON fonksiyonları, MySQL JSON); ya da alt tip tabloları.</p>
<h2>JSON mu, tablo mu?</h2>
<table>
<tr><th>Tablo/sütun seç</th><th>JSON seç</th></tr>
<tr><td>Alan sık filtreleniyor, birleştiriliyor, toplanıyor</td><td>Alan yalnızca saklanıp aynen gösteriliyor</td></tr>
<tr><td>Kısıt ve tip güvenliği gerekiyor</td><td>Yapı kaynağa göre değişiyor (API yanıtları, olay yükleri)</td></tr>
<tr><td>Raporlama ve BI kullanacak</td><td>Seyrek, isteğe bağlı nitelikler</td></tr>
</table>
<h2>Diğer kalıplar ve tuzaklar</h2>
<ul>
<li><b>Virgülle ayrılmış liste</b> (<code>etiketler = 'a,b,c'</code>): 1NF ihlali; ara tablo kullan.</li>
<li><b>Çok amaçlı arama tablosu</b> (tüm kodlar tek tabloda, <code>tur</code> sütunuyla): yabancı anahtar kurulamaz; her kod listesi ayrı tablo.</li>
<li><b>Polimorfik ilişki</b> (<code>hedef_tur, hedef_id</code>): yabancı anahtar yok; her hedef için ayrı nullable FK sütunu veya ayrı ara tablo.</li>
<li><b>Para birimi olmadan tutar</b>: çok para birimli sistemde <code>currency</code> sütunu şart.</li>
<li><b>Adlandırma</b>: tutarlı tekil/çoğul, snake_case, anlamlı adlar (<code>tarih1</code> değil <code>order_date</code>); ayrılmış kelimelerden kaçın.</li>
<li><b>Durum sütunu</b>: serbest metin yerine sınırlı değer listesi (CHECK veya arama tablosu).</li>
</ul>
`,
  ex: [
    sq('Soft delete senaryosu: <code>urun_notu</code> tablosu oluştur (<code>not_id</code> birincil anahtar, <code>product_id</code>, <code>metin</code>, <code>deleted_at</code>), üç not ekle (biri silinmiş olsun: deleted_at = \'2024-12-01\'), aktif notları gösteren <code>v_urun_notu</code> görünümünü oluştur ve görünümdeki satır sayısını getir: <code>adet</code>.', "CREATE TABLE urun_notu (not_id INTEGER PRIMARY KEY, product_id INTEGER, metin TEXT, deleted_at TEXT); INSERT INTO urun_notu VALUES (1, 5, 'Stok az', NULL), (2, 5, 'Fiyat değişti', '2024-12-01'), (3, 9, 'Yeni baskı', NULL); CREATE VIEW v_urun_notu AS SELECT not_id, product_id, metin FROM urun_notu WHERE deleted_at IS NULL; SELECT COUNT(*) AS adet FROM v_urun_notu;", { dl: ['tsql', 'pg', 'mysql', 'oracle', 'sqlite'] }),
    mc('<p>Soft delete uygulanan tabloda e-posta tekilliğini korumanın doğru yolu?</p>', ['UNIQUE kısıtını kaldırmak', 'Yalnızca silinmemiş satırlar için filtreli/kısmi benzersiz indeks', 'E-postayı JSON\'a taşımak', 'Trigger ile her şeyi silmek'], 1),
    mc('<p>EAV tasarımının temel sorunu hangisidir?</p>', ['Az yer kaplaması', 'Tip güvenliği ve kısıt olmaması, raporların karmaşıklaşması', 'Çok hızlı olması', 'Normalizasyona fazla uyması'], 1),
    mc('<p>Ürünlerin seyrek ve kaynağa göre değişen teknik özellikleri için makul seçim?</p>', ['Her özellik için ayrı sütun (yüzlerce)', 'Ortak alanlar sütun, değişken özellikler JSON sütunu', 'Virgülle ayrılmış metin', 'Her ürün için ayrı tablo'], 1)
  ]
}]);

after('de-kalite', [{
  id: 'sql-test', lv: 'C1', mod: 'Veri Mühendisliği', min: 14,
  title: 'SQL kodunu test etmek: veri testleri, birim testleri ve CI',
  sum: 'Hata varsa satır döndüren test sorguları, tSQLt, pgTAP, dbt testleri, sürekli entegrasyon.',
  body: `
<h2>İki tür test</h2>
<ul>
<li><b>Veri testleri</b>: Veri beklentilere uyuyor mu? (benzersiz, boş değil, geçerli değer, referans bütünlüğü, aralık)</li>
<li><b>Kod (birim) testleri</b>: Saklı yordam, fonksiyon veya dönüşüm sorgusu verilen girdiye doğru çıktıyı üretiyor mu?</li>
</ul>
<h2>Kalıp: hata varsa satır döndür</h2>
<p>Test sorgusu, kuralı bozan satırları döndürür. Boş sonuç = test geçti. dbt, Great Expectations ve birçok veri kalite aracı bu fikirle çalışır.</p>
<pre class="code">-- 1) Benzersizlik: aynı order_id iki kez var mı?
SELECT order_id, COUNT(*) AS adet FROM orders GROUP BY order_id HAVING COUNT(*) > 1;</pre>
<pre class="code">-- 2) Referans bütünlüğü: müşterisi olmayan sipariş var mı?
SELECT o.order_id FROM orders o
LEFT JOIN customers c ON c.customer_id = o.customer_id
WHERE c.customer_id IS NULL;</pre>
<pre class="code">-- 3) Kabul edilen değerler
SELECT DISTINCT status FROM orders
WHERE status NOT IN ('delivered', 'shipped', 'cancelled', 'returned');</pre>
<pre class="code">-- 4) Aralık ve iş kuralı: indirim 0–0,5 arasında, adet pozitif
SELECT item_id FROM order_items WHERE discount < 0 OR discount > 0.5 OR quantity <= 0;</pre>
<h3>Tek raporda tüm testler</h3>
<pre class="code">SELECT 'siparis_tekil' AS test, COUNT(*) AS hata FROM (SELECT order_id FROM orders GROUP BY order_id HAVING COUNT(*) > 1) AS t
UNION ALL
SELECT 'siparis_musteri_var', COUNT(*) FROM orders o LEFT JOIN customers c ON c.customer_id = o.customer_id WHERE c.customer_id IS NULL
UNION ALL
SELECT 'musteri_email_bos', COUNT(*) FROM customers WHERE email IS NULL
UNION ALL
SELECT 'fiyat_maliyet_ustu', COUNT(*) FROM products WHERE price < cost;</pre>
<h2>Birim test çerçeveleri</h2>
${NR("-- SQL Server: tSQLt\nEXEC tSQLt.NewTestClass 'testCiro';\nGO\nCREATE PROCEDURE testCiro.[test net tutar indirimi düşer]\nAS\nBEGIN\n  EXEC tSQLt.FakeTable 'dbo.order_items';\n  INSERT INTO dbo.order_items (order_id, quantity, unit_price, discount) VALUES (1, 2, 100, 0.1);\n  DECLARE @sonuc DECIMAL(12,2) = dbo.fn_siparis_tutari(1);\n  EXEC tSQLt.AssertEquals 180.00, @sonuc;\nEND;\nGO\nEXEC tSQLt.Run 'testCiro';\n\n-- PostgreSQL: pgTAP\nSELECT plan(2);\nSELECT has_table('orders');\nSELECT is((SELECT musteri_ciro(1)), 1234.50::numeric, 'Müşteri 1 cirosu');\nSELECT * FROM finish();\n\n-- dbt (schema.yml)\n-- models:\n--   - name: fct_siparis\n--     columns:\n--       - name: order_id\n--         tests: [unique, not_null]\n--       - name: customer_id\n--         tests:\n--           - relationships: {to: ref('dim_musteri'), field: customer_id}")}
<h2>Sürekli entegrasyon (CI)</h2>
<ol>
<li>Her değişiklik (pull request) için boş bir test veritabanı oluşturulur, migration'lar uygulanır.</li>
<li>Örnek veri yüklenir, birim ve veri testleri çalışır.</li>
<li>SQL biçim ve stil denetimi (ör. <b>SQLFluff</b>) yapılır.</li>
<li>Testler geçerse değişiklik birleştirilir ve üretime dağıtılır.</li>
</ol>
`,
  ex: [
    sq('Veri testi yaz: <code>order_items</code> tablosunda ürünü <code>products</code> tablosunda bulunmayan satırları say; test raporunda kullanılacak tek değer: <code>hata</code> (0 ise test geçti).', 'SELECT COUNT(*) AS hata FROM order_items oi LEFT JOIN products p ON p.product_id = oi.product_id WHERE p.product_id IS NULL;'),
    sq('Tek raporda üç test: <code>musteri_sehir_bos</code> (şehri boş müşteri), <code>satis_fiyat_sifir</code> (birim fiyatı 0 veya negatif satır), <code>calisan_maas_bos</code> (maaşı boş çalışan); sütunlar <code>test</code>, <code>hata</code>.', "SELECT 'musteri_sehir_bos' AS test, COUNT(*) AS hata FROM customers WHERE city IS NULL UNION ALL SELECT 'satis_fiyat_sifir', COUNT(*) FROM order_items WHERE unit_price <= 0 UNION ALL SELECT 'calisan_maas_bos', COUNT(*) FROM employees WHERE salary IS NULL;"),
    mc('<p>“Hata varsa satır döndür” kalıbında test ne zaman geçmiş sayılır?</p>', ['Sorgu en az bir satır döndürünce', 'Sorgu boş sonuç döndürünce', 'Sorgu hata verince', 'Sorgu 1 döndürünce'], 1),
    mc('<p>SQL Server\'da saklı yordam ve fonksiyonlar için birim test çerçevesi?</p>', ['pgTAP', 'tSQLt', 'SQLFluff', 'JUnit'], 1)
  ]
}]);

after('json', [{
  id: 'cografi', lv: 'C2', mod: 'Modern SQL', min: 13,
  title: 'Coğrafi veri: mesafe, en yakın nokta ve uzamsal tipler',
  sum: 'Haversine ile mesafe, PostGIS, SQL Server geography, BigQuery GEOGRAPHY.',
  body: `
<h2>Konum sorguları</h2>
<p>“Müşteriye en yakın mağaza”, “5 km içindeki kuryeler”, “hangi ilçede?” gibi sorular coğrafi (uzamsal) veri gerektirir. Basit mesafe hesabı düz SQL ile yapılabilir; ciddi işler için uzamsal tipler ve indeksler kullanılır.</p>
<h2>Haversine: iki koordinat arasındaki mesafe</h2>
<p>Dünyayı küre kabul ederek iki enlem/boylam arasındaki büyük daire mesafesi (km):</p>
<pre class="code">WITH sehir AS (
  SELECT 'İstanbul' AS ad, 41.0082 AS enlem, 28.9784 AS boylam UNION ALL
  SELECT 'Ankara',   39.9334, 32.8597 UNION ALL
  SELECT 'İzmir',    38.4237, 27.1428 UNION ALL
  SELECT 'Bursa',    40.1885, 29.0610 UNION ALL
  SELECT 'Antalya',  36.8969, 30.7133
)
SELECT a.ad AS nereden, b.ad AS nereye,
       ROUND(6371 * 2 * ASIN(SQRT(
         POWER(SIN((b.enlem - a.enlem) * 0.0174532925 / 2), 2) +
         COS(a.enlem * 0.0174532925) * COS(b.enlem * 0.0174532925) *
         POWER(SIN((b.boylam - a.boylam) * 0.0174532925 / 2), 2))), 0) AS km
FROM sehir a JOIN sehir b ON a.ad = 'İstanbul' AND b.ad <> a.ad
ORDER BY km;</pre>
<p>(0.0174532925 = π/180, dereceyi radyana çevirir; 6371 km Dünya'nın ortalama yarıçapı.)</p>
<h2>Uzamsal tipler</h2>
${NR("-- PostgreSQL + PostGIS\nCREATE EXTENSION postgis;\nALTER TABLE magaza ADD COLUMN konum geography(Point, 4326);\nUPDATE magaza SET konum = ST_SetSRID(ST_MakePoint(boylam, enlem), 4326)::geography;\nCREATE INDEX ix_magaza_konum ON magaza USING GIST (konum);\n\n-- 5 km içindeki mağazalar ve en yakın 3\nSELECT ad, ST_Distance(konum, ST_MakePoint(28.98, 41.01)::geography) / 1000 AS km\nFROM magaza\nWHERE ST_DWithin(konum, ST_MakePoint(28.98, 41.01)::geography, 5000)\nORDER BY konum <-> ST_MakePoint(28.98, 41.01)::geography\nLIMIT 3;\n\n-- SQL Server\nDECLARE @ben geography = geography::Point(41.01, 28.98, 4326);\nSELECT TOP (3) ad, konum.STDistance(@ben) / 1000 AS km FROM dbo.magaza ORDER BY konum.STDistance(@ben);\n\n-- BigQuery\nSELECT ad, ST_DISTANCE(konum, ST_GEOGPOINT(28.98, 41.01)) / 1000 AS km\nFROM anadolu.magaza\nWHERE ST_DWITHIN(konum, ST_GEOGPOINT(28.98, 41.01), 5000);\n\n-- MySQL 8\nSELECT ad, ST_Distance_Sphere(konum, POINT(28.98, 41.01)) / 1000 AS km FROM magaza;")}
<div class="warn"><b>Sıra tuzağı</b>Fonksiyonların çoğu nokta için <b>(boylam, enlem)</b> sırası ister (x, y); SQL Server'ın <code>geography::Point</code> fonksiyonu ise (enlem, boylam). Ters yazılan koordinatlar okyanusun ortasında nokta üretir.</div>
<p>SRID 4326 = WGS 84 (GPS koordinatları). <code>geography</code> mesafeyi metre olarak küre üzerinde, <code>geometry</code> düzlemde hesaplar.</p>
`,
  ex: [
    sq('Haversine ile Ankara\'ya (39.9334, 32.8597) en yakın şehri bul; şehir listesi olarak başlangıç kodundaki CTE\'yi kullan: <code>ad</code>, <code>km</code> (tam sayı).', "WITH sehir AS (SELECT 'İstanbul' AS ad, 41.0082 AS enlem, 28.9784 AS boylam UNION ALL SELECT 'İzmir', 38.4237, 27.1428 UNION ALL SELECT 'Bursa', 40.1885, 29.0610 UNION ALL SELECT 'Eskişehir', 39.7767, 30.5206 UNION ALL SELECT 'Konya', 37.8746, 32.4932) SELECT ad, ROUND(6371 * 2 * ASIN(SQRT(POWER(SIN((enlem - 39.9334) * 0.0174532925 / 2), 2) + COS(39.9334 * 0.0174532925) * COS(enlem * 0.0174532925) * POWER(SIN((boylam - 32.8597) * 0.0174532925 / 2), 2))), 0) AS km FROM sehir ORDER BY km LIMIT 1;", { start: "WITH sehir AS (\n  SELECT 'İstanbul' AS ad, 41.0082 AS enlem, 28.9784 AS boylam UNION ALL\n  SELECT 'İzmir', 38.4237, 27.1428 UNION ALL\n  SELECT 'Bursa', 40.1885, 29.0610 UNION ALL\n  SELECT 'Eskişehir', 39.7767, 30.5206 UNION ALL\n  SELECT 'Konya', 37.8746, 32.4932\n)\n", ord: true }),
    mc('<p>PostGIS\'te <code>ST_MakePoint</code> argüman sırası?</p>', ['(enlem, boylam)', '(boylam, enlem)', '(x, z)', 'Fark etmez'], 1),
    mc('<p>“5 km içindeki noktalar” sorgusunu indeksle hızlandıran PostGIS fonksiyonu?</p>', ['ST_Distance(...) &lt; 5000', 'ST_DWithin', 'ST_Area', 'ST_AsText'], 1)
  ]
}]);

/* Patikalar */
const P = window.SQLP_PATHS; const PA = {}; P.forEach(p => PA[p.id] = p);
const ins = (pid, afterId, ids) => { const p = PA[pid]; if (!p) return; ids = ids.filter(x => !p.lessons.includes(x)); const i = p.lessons.indexOf(afterId); p.lessons.splice(i < 0 ? p.lessons.length : i + 1, 0, ...ids); };
const comp = (pid, t, d, ids) => { const p = PA[pid]; if (p && p.comp) p.comp.push({ t, d, l: ids }); };
ins('temel', 'sayi-tip', ['veri-tipleri']);
ins('analist', 'an-dashboard', ['python-sql']); ins('analist', 'sayi-tip', ['veri-tipleri']); ins('analist', 'guvenlik', ['kvkk']); ins('analist', 'first-last', ['pencere-cerceve']);
ins('bilimci', 'json', ['python-sql', 'cografi']); ins('bilimci', 'first-last', ['pencere-cerceve']);
ins('muhendis', 'de-kalite', ['sql-test']); ins('muhendis', 'normalizasyon', ['tasarim-kaliplari']); ins('muhendis', 'sayi-tip', ['veri-tipleri']); ins('muhendis', 'recursive-cte', ['hiyerarsi']); ins('muhendis', 'json', ['kvkk']);
ins('tsql', 'ts-tarih', ['veri-tipleri']); ins('tsql', 'ts-guvenlik', ['kvkk']); ins('tsql', 'recursive-cte', ['hiyerarsi']);
ins('bi', 'an-dashboard', ['python-sql']); ins('bi', 'guvenlik', ['kvkk']);
ins('dba', 'ts-guvenlik', ['kvkk']); ins('dba', 'veri-aktarim', ['tam-metin']); ins('dba', 'normalizasyon', ['tasarim-kaliplari']);
ins('backend', 'be-desenler', ['tasarim-kaliplari', 'tam-metin', 'cografi']); ins('backend', 'be-migration', ['sql-test', 'kvkk']); ins('backend', 'sayi-tip', ['veri-tipleri']);
ins('uzman', 'ileri-desenler', ['pencere-cerceve', 'hiyerarsi', 'tam-metin', 'cografi']);
ins('sertifika', 'oracle-ozel', ['hiyerarsi']);
comp('analist', 'Araçlar ve uyum', 'Python ile SQL, veri tipleri, KVKK', ['python-sql', 'veri-tipleri', 'kvkk']);
comp('muhendis', 'Kalite ve tasarım', 'Testler, tasarım kalıpları, hiyerarşik veri', ['sql-test', 'tasarim-kaliplari', 'hiyerarsi', 'veri-tipleri']);
comp('backend', 'Uygulama ihtiyaçları', 'Tam metin arama, coğrafi sorgular, tasarım kalıpları, testler', ['tam-metin', 'cografi', 'tasarim-kaliplari', 'sql-test']);

const G = window.SQLP_GLOSSARY || [];
G.push(['KVKK', '6698 sayılı Kişisel Verilerin Korunması Kanunu.'], ['Takma adlandırma', 'Kimlik bilgisini geri döndürülmesi zor bir anahtarla değiştirme (pseudonymization).'], ['k-anonimlik', 'Yarı tanımlayıcıların her birleşiminin en az k kişide görünmesi koşulu.'], ['Tam metin arama', 'Metni kelimelere ayırıp ters dizinle arama; LIKE\'tan hızlı ve alaka sıralamalı.'], ['CONNECT BY', 'Oracle\'ın hiyerarşik sorgu sözdizimi.'], ['Soft delete', 'Satırı silmek yerine silindi olarak işaretleme.'], ['EAV', 'Entity-attribute-value: her özniteliği satır olarak saklayan, genellikle kaçınılan tasarım.'], ['Haversine', 'Küre üzerinde iki koordinat arasındaki büyük daire mesafesini veren formül.'], ['UTC', 'Eşgüdümlü evrensel zaman; anlar bu saatte saklanır.']);
})();
