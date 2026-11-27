/* Kesit SQL içerik 44 (Kasım 2026): az uygulamalı derslere görev ve şema tasarlama alıştırmaları.
   DBA, köprü ve sertifika dersleri ağırlıkla seçmeliydi; burada gerçek iş adımları sorgu olarak eklenir:
   yedek zinciri ve RPO, bakım kararı, engelleme zincirinin kökü, rol üyeliği, ETL red oranı, CDC'den son durum.
   T-SQL görevleri sys.* ve msdb.dbo.* yazımıyla yazılır; motor bunları kurgusal kopyalara yönlendirir (bkz. c41.js KOPYA notu).
   Şema tasarlama: tabloyu kurdurur, kontrol sorgusu (pragma) yapıyı ve anahtarları denetler. */
(function () {
const L = window.SQLP_LESSONS = window.SQLP_LESSONS || [];
const ext = (id, ex) => { const l = L.find(x => x.id === id); if (!l) { if (window.console) console.warn('c44: ders yok', id); return; } l.ex = (l.ex || []).concat(ex); };
const p = q => '<p>' + q + '</p>';
const sq = (q, sol, hint, x) => Object.assign({ t: 'sql', q: p(q), sol, hint }, x || {});
const ts = (q, sol, hint, x) => Object.assign({ t: 'sql', q: p(q), sol, hint, base: 'tsql', dl: ['tsql'] }, x || {});
const ora = (q, sol, hint, x) => Object.assign({ t: 'sql', q: p(q), sol, hint, base: 'oracle', dl: ['oracle'] }, x || {});
const pg = (q, sol, hint, x) => Object.assign({ t: 'sql', q: p(q), sol, hint, base: 'pg', dl: ['pg'] }, x || {});
const BAKIM = "FROM sys.dm_db_index_physical_stats(DB_ID(), NULL, NULL, NULL, 'SAMPLED') AS ips JOIN sys.indexes AS i ON i.object_id = ips.object_id AND i.index_id = ips.index_id";

/* ---------------------------------------------------------------- DBA */
ext('dba-mimari', [
  ts('Sunucudaki her <b>kullanıcı tablosu</b> için tanımlı indeks sayısı: <code>tablo</code>, <code>indeks</code>. Önce indeks sayısına göre azalan, sonra ada göre sırala.',
    "SELECT o.name AS tablo, COUNT(i.index_id) AS indeks FROM sys.objects AS o LEFT JOIN sys.indexes AS i ON i.object_id = o.object_id WHERE o.type_desc = 'USER_TABLE' GROUP BY o.name ORDER BY indeks DESC, o.name;",
    'sys.objects ile sys.indexes object_id üzerinden birleşir; indeksi olmayan tablo da görünsün diye LEFT JOIN.', { ord: true }),
  ts('<b>Heap</b> tabloları bul: kümelenmiş (CLUSTERED) indeksi olmayan kullanıcı tabloları, <code>tablo</code>, ada göre sıralı.',
    "SELECT o.name AS tablo FROM sys.objects AS o WHERE o.type_desc = 'USER_TABLE' AND NOT EXISTS (SELECT 1 FROM sys.indexes AS i WHERE i.object_id = o.object_id AND i.type_desc = 'CLUSTERED') ORDER BY o.name;",
    'NOT EXISTS ile kümelenmiş indeksi olmayanları süz.', { ord: true }),
]);
ext('dba-yedek', [
  ts('Her veritabanının <b>son tam yedeği</b> (type = <code>D</code>) ne zaman bitti? <code>database_name</code>, <code>son_tam</code>; veritabanı adına göre sıralı.',
    "SELECT database_name, MAX(backup_finish_date) AS son_tam FROM msdb.dbo.backupset WHERE type = 'D' GROUP BY database_name ORDER BY database_name;",
    'msdb.dbo.backupset, type = \'D\', MAX(backup_finish_date).', { ord: true }),
  ts('<b>RPO kontrolü</b>: 13 Kasım 2024 15:00 itibarıyla her veritabanının son <b>günlük</b> yedeğinin (type = <code>L</code>) üzerinden kaç dakika geçti? <code>database_name</code>, <code>dakika</code>; en eskiden yeniye.',
    "SELECT database_name, DATEDIFF(MINUTE, MAX(backup_finish_date), '2024-11-13 15:00:00') AS dakika FROM msdb.dbo.backupset WHERE type = 'L' GROUP BY database_name ORDER BY dakika DESC;",
    'DATEDIFF(MINUTE, MAX(backup_finish_date), ...)', { ord: true }),
]);
ext('dba-bakim', [
  ts('Bakım kararı: en az 1.000 sayfalık indeksler için parçalanma %30\'dan büyükse <code>REBUILD</code>, %5–30 arasıysa <code>REORGANIZE</code>, küçükse <code>YOK</code>. <code>tablo</code>, <code>indeks</code>, <code>parcalanma</code>, <code>islem</code>; parçalanmaya göre azalan.',
    "SELECT OBJECT_NAME(ips.object_id) AS tablo, i.name AS indeks, ips.avg_fragmentation_in_percent AS parcalanma, CASE WHEN ips.avg_fragmentation_in_percent > 30 THEN 'REBUILD' WHEN ips.avg_fragmentation_in_percent >= 5 THEN 'REORGANIZE' ELSE 'YOK' END AS islem " + BAKIM + " WHERE ips.page_count >= 1000 ORDER BY parcalanma DESC;",
    'CASE ile eşikler; küçük indeksleri page_count ile ele.', { ord: true }),
  ts('Sayfa doluluğu düşük indeksler: <code>avg_page_space_used_in_percent</code> %70\'in altında olanların sayısı, <code>adet</code>.',
    "SELECT COUNT(*) AS adet " + BAKIM + " WHERE ips.avg_page_space_used_in_percent < 70;",
    'Aynı DMV, farklı sütun: avg_page_space_used_in_percent.'),
]);
ext('dba-izleme', [
  ts('<b>Engelleme zincirinin kökü</b>: başkasını engelleyen ama kendisi engellenmeyen oturum(lar), <code>kok</code>.',
    'SELECT DISTINCT r.blocking_session_id AS kok FROM sys.dm_exec_requests AS r WHERE r.blocking_session_id <> 0 AND r.blocking_session_id NOT IN (SELECT session_id FROM sys.dm_exec_requests WHERE blocking_session_id <> 0);',
    'Engelleyenler arasından, kendisi engellenen listede olmayanı seç.'),
  ts('Zararsız arka plan beklemelerini (<code>LAZYWRITER_SLEEP</code>, <code>SLEEP_TASK</code>, <code>BROKER_TO_FLUSH</code>) çıkar; <b>en çok bekleten 3 türü</b> getir: <code>wait_type</code>, <code>wait_time_ms</code>.',
    "SELECT TOP 3 wait_type, wait_time_ms FROM sys.dm_os_wait_stats WHERE wait_type NOT IN ('LAZYWRITER_SLEEP', 'SLEEP_TASK', 'BROKER_TO_FLUSH') ORDER BY wait_time_ms DESC;",
    'NOT IN ile çıkar, TOP 3 ... ORDER BY wait_time_ms DESC.', { ord: true }),
]);
ext('dba-ha', [
  ts('Günlük yedek zinciri: <code>ilgaz_portal</code> için ardışık iki günlük yedeği (type = <code>L</code>) arasında <b>30 dakikadan uzun</b> boşluk kaç kez oluştu? <code>adet</code>.',
    "SELECT COUNT(*) AS adet FROM (SELECT DATEDIFF(MINUTE, LAG(backup_finish_date) OVER (ORDER BY backup_finish_date), backup_finish_date) AS bosluk FROM msdb.dbo.backupset WHERE database_name = 'ilgaz_portal' AND type = 'L') AS z WHERE bosluk > 30;",
    'LAG ile önceki yedeğin bitişini al, farkı alt sorguda süz.'),
]);
ext('kopru-hadr', [
  ts('Always On ve günlük aktarımı için <b>FULL kurtarma modeli</b> gerekir. Yedek geçmişinden her veritabanının kurtarma modelini ve yedek sayısını çıkar: <code>database_name</code>, <code>recovery_model</code>, <code>yedek</code>; veritabanı adına göre sıralı. Hangisi bu mimariye hazır değil?',
    'SELECT database_name, recovery_model, COUNT(*) AS yedek FROM msdb.dbo.backupset GROUP BY database_name, recovery_model ORDER BY database_name;',
    'GROUP BY database_name, recovery_model', { ord: true }),
]);
ext('kopru-kurulum', [
  ts('Yama öncesi kontrol: son çalışmalarında <b>başarısız olan işler</b> (iş düzeyi satır <code>step_id = 0</code>, <code>run_status = 0</code>). <code>is_adi</code>, <code>hata</code> (kaç kez); ada göre sıralı.',
    'SELECT j.name AS is_adi, COUNT(*) AS hata FROM msdb.dbo.sysjobhistory AS h JOIN msdb.dbo.sysjobs AS j ON j.job_id = h.job_id WHERE h.step_id = 0 AND h.run_status = 0 GROUP BY j.name ORDER BY j.name;',
    'sysjobhistory ile sysjobs job_id üzerinden birleşir.', { ord: true }),
]);
ext('dp300-yonetim', [
  ts('Rol üyeliklerini çıkar: <code>rol</code>, <code>uye</code>; önce role, sonra üyeye göre sıralı.',
    'SELECT r.name AS rol, m.name AS uye FROM sys.database_role_members AS rm JOIN sys.database_principals AS r ON r.principal_id = rm.role_principal_id JOIN sys.database_principals AS m ON m.principal_id = rm.member_principal_id ORDER BY r.name, m.name;',
    'sys.database_principals tablosunu iki kez (rol ve üye için) birleştir.', { ord: true }),
  ts('En az yetki ilkesi: <code>db_owner</code> rolündeki <b>servis hesapları</b> (adı <code>svc_</code> ile başlayan) kimler? <code>uye</code>, ada göre sıralı.',
    "SELECT m.name AS uye FROM sys.database_role_members AS rm JOIN sys.database_principals AS r ON r.principal_id = rm.role_principal_id JOIN sys.database_principals AS m ON m.principal_id = rm.member_principal_id WHERE r.name = 'db_owner' AND m.name LIKE 'svc[_]%' ORDER BY m.name;",
    "LIKE 'svc[_]%': alt çizgi T-SQL'de joker karakterdir, köşeli parantezle kaçır.", { ord: true }),
]);
ext('azure-sql', [
  ts('Açıkça <b>reddedilen</b> (DENY) izinler: <code>kim</code>, <code>izin</code>, <code>nesne_no</code> (major_id).',
    "SELECT pr.name AS kim, pe.permission_name AS izin, pe.major_id AS nesne_no FROM sys.database_permissions AS pe JOIN sys.database_principals AS pr ON pr.principal_id = pe.grantee_principal_id WHERE pe.state_desc = 'DENY';",
    "state_desc = 'DENY'"),
]);

/* ---------------------------------------------------------------- veri aktarımı ve ETL */
ext('veri-aktarim', [
  sq('Her yüklemenin <b>red oranı</b>: <code>batch_id</code>, <code>okunan</code>, <code>reddedilen</code>, <code>red_yuzde</code> (yüzde, 2 basamak; okunan 0 ise boş). Yükleme numarasına göre sıralı.',
    'SELECT batch_id, okunan, reddedilen, ROUND(100.0 * reddedilen / NULLIF(okunan, 0), 2) AS red_yuzde FROM etl_yukleme_log ORDER BY batch_id;',
    'NULLIF(okunan, 0) sıfıra bölmeyi önler.', { ord: true }),
  sq('Aktarımdan önce: şube tablosunda <b>karşılığı olmayan</b> şube koduyla gelen staging satırları, <code>stg_id</code>, <code>sube_kodu</code>, sıralı.',
    'SELECT h.stg_id, h.sube_kodu FROM etl_stg_hareket AS h LEFT JOIN etl_stg_sube AS s ON s.sube_kodu = h.sube_kodu WHERE s.sube_kodu IS NULL ORDER BY h.stg_id;',
    'LEFT JOIN ... WHERE sağ taraf IS NULL', { ord: true }),
]);
ext('kopru-ssis-adf', [
  sq('SSIS paketinin günlüğü gibi: her iş için yükleme sayısı, hatayla biten yükleme sayısı ve toplam okunan satır: <code>is_adi</code>, <code>yukleme</code>, <code>hatali</code>, <code>okunan</code>.',
    "SELECT is_adi, COUNT(*) AS yukleme, SUM(CASE WHEN durum = 'hata' THEN 1 ELSE 0 END) AS hatali, SUM(okunan) AS okunan FROM etl_yukleme_log GROUP BY is_adi;",
    "SUM(CASE WHEN durum = 'hata' THEN 1 ELSE 0 END)"),
]);
ext('de-cdc', [
  sq('Değişiklik akışından son durum: <code>price_updates</code> her ürün için birden çok olay içerir. Her ürünün <b>en son</b> fiyatını getir: <code>product_id</code>, <code>new_price</code>; ürüne göre sıralı.',
    'SELECT product_id, new_price FROM (SELECT product_id, new_price, ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY updated_at DESC) AS rn FROM price_updates) AS z WHERE rn = 1 ORDER BY product_id;',
    'ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY updated_at DESC) = 1', { ord: true }),
]);

/* ---------------------------------------------------------------- genel dersler */
ext('tarih', [
  sq('Codd\'un ilişkisel modeli: veri tablolarda, ilişki ortak sütunda. <b>Şehir başına sipariş sayısını</b> iki tabloyu birleştirerek bul: <code>city</code>, <code>siparis</code>; sipariş sayısına göre azalan, sonra şehir adı.',
    'SELECT c.city, COUNT(*) AS siparis FROM orders AS o JOIN customers AS c ON c.customer_id = o.customer_id GROUP BY c.city ORDER BY siparis DESC, c.city;',
    'orders ile customers customer_id üzerinden birleşir.', { ord: true }),
  sq('SEQUEL\'in ilk örnekleri gibi bildirimsel bir soru: fiyatı <b>ortalamanın üstündeki</b> ürünlerin sayısı, <code>adet</code>.',
    'SELECT COUNT(*) AS adet FROM products WHERE price > (SELECT AVG(price) FROM products);',
    'Alt sorgu ile ortalama.'),
]);
ext('acid', [
  sq('Tutarlılık ve tarih: sipariş satırındaki fiyat (<code>unit_price</code>) ürünün <b>bugünkü</b> liste fiyatından farklı olan satır sayısı, <code>farkli</code>. (İpucu: satır, satış anındaki fiyatı saklar; fark hata değildir.)',
    'SELECT COUNT(*) AS farkli FROM order_items AS i JOIN products AS p ON p.product_id = i.product_id WHERE i.unit_price <> p.price;',
    'order_items ile products birleşir, fiyatlar karşılaştırılır.'),
  sq('İptal edilen siparişlerin satırları silinmez, durum değişir. İptal siparişlere ait <b>satır sayısı</b> ve bu satırların adet toplamı: <code>satir</code>, <code>adet</code>.',
    "SELECT COUNT(*) AS satir, SUM(i.quantity) AS adet FROM order_items AS i JOIN orders AS o ON o.order_id = i.order_id WHERE o.status = 'cancelled';",
    "orders.status = 'cancelled' ile süz."),
]);
ext('be-kilit', [
  sq('Çift rezervasyon tespiti: aynı uçuşta aynı koltuğa <b>birden fazla iptal edilmemiş</b> rezervasyon. <code>flight_id</code>, <code>seat</code>, <code>adet</code>; uçuş ve koltuğa göre sıralı.',
    "SELECT flight_id, seat, COUNT(*) AS adet FROM hv_bookings WHERE seat IS NOT NULL AND status <> 'cancelled' GROUP BY flight_id, seat HAVING COUNT(*) > 1 ORDER BY flight_id, seat;",
    'GROUP BY flight_id, seat HAVING COUNT(*) > 1', { ord: true }),
]);
ext('modern-ekosistem', [
  sq('Bulut ambarlarındaki <code>QUALIFY</code> kısayolunun standart karşılığı: her kategorinin <b>en pahalı</b> ürünü, <code>category</code>, <code>name</code>, <code>price</code>; kategoriye göre sıralı (eşitlikte ürün adı küçük olan).',
    'SELECT category, name, price FROM (SELECT category, name, price, ROW_NUMBER() OVER (PARTITION BY category ORDER BY price DESC, name) AS rn FROM products) AS z WHERE rn = 1 ORDER BY category;',
    'ROW_NUMBER() ... alt sorguda, dışarıda rn = 1.', { ord: true }),
]);
ext('cert-dbx-snow', [
  sq('Sınav kalıbı: her müşterinin <b>ilk siparişi</b>: <code>customer_id</code>, <code>order_id</code>, <code>order_date</code>; müşteriye göre sıralı (aynı gün birden çok siparişte küçük numara).',
    'SELECT customer_id, order_id, order_date FROM (SELECT customer_id, order_id, order_date, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date, order_id) AS rn FROM orders) AS z WHERE rn = 1 ORDER BY customer_id;',
    'Snowflake ve Databricks QUALIFY kabul eder; standart yazım alt sorgu ile.', { ord: true }),
]);
ext('sertifika-rehber', [
  sq('Sınavlarda sık gelen kalıp: en az <b>10 müşterisi</b> olan şehirler ve müşteri sayıları, <code>city</code>, <code>musteri</code>; çoktan aza.',
    'SELECT city, COUNT(*) AS musteri FROM customers GROUP BY city HAVING COUNT(*) >= 10 ORDER BY musteri DESC, city;',
    'Grup filtresi HAVING ile.', { ord: true }),
  sq('Bir başka klasik: <b>hiç satılmamış</b> ürünler, <code>product_id</code>, <code>name</code>.',
    'SELECT p.product_id, p.name FROM products AS p WHERE NOT EXISTS (SELECT 1 FROM order_items AS i WHERE i.product_id = p.product_id);',
    'NOT EXISTS ya da LEFT JOIN ... IS NULL'),
]);
ext('ba-rol', [
  sq('Gereksinimi veriyle doğrula: "Premium müşterilerin çoğu son 3 ayda sipariş vermiyor" iddiası. 1 Ekim 2024 ve sonrasında siparişi <b>olmayan</b> Premium müşteri sayısı ve toplam Premium sayısı: <code>siparissiz</code>, <code>toplam</code>.',
    "SELECT SUM(CASE WHEN r.customer_id IS NULL THEN 1 ELSE 0 END) AS siparissiz, COUNT(*) AS toplam FROM customers AS c LEFT JOIN (SELECT DISTINCT customer_id FROM orders WHERE order_date >= '2024-10-01') AS r ON r.customer_id = c.customer_id WHERE c.segment = 'Premium';",
    'Son 3 ayda sipariş verenleri alt sorguda topla, LEFT JOIN ile eşleşmeyenleri say. (SQL Server toplama içinde alt sorguya izin vermez.)'),
]);
ext('kopru-plsql', [
  ora('T-SQL\'deki <code>ISNULL</code> Oracle\'da <code>NVL</code>: şehri boş müşterileri <code>(bilinmiyor)</code> göstererek şehir başına müşteri sayısı, <code>sehir</code>, <code>musteri</code>; şehre göre sıralı.',
    "SELECT NVL(city, '(bilinmiyor)') AS sehir, COUNT(*) AS musteri FROM customers GROUP BY NVL(city, '(bilinmiyor)') ORDER BY sehir;",
    'Oracle GROUP BY içinde takma ad kabul etmez; ifadeyi tekrar yaz.', { ord: true }),
]);
ext('plsql', [
  ora('<code>DECODE</code> ile sipariş durumlarını Türkçeleştir: <code>durum</code> (delivered → Teslim, cancelled → İptal, diğerleri → Diğer) ve <code>adet</code>; duruma göre sıralı.',
    "SELECT DECODE(status, 'delivered', 'Teslim', 'cancelled', 'İptal', 'Diğer') AS durum, COUNT(*) AS adet FROM orders GROUP BY DECODE(status, 'delivered', 'Teslim', 'cancelled', 'İptal', 'Diğer') ORDER BY durum;",
    'DECODE(ifade, ara1, sonuç1, ara2, sonuç2, varsayılan)', { ord: true }),
]);
ext('plpgsql', [
  pg('PostgreSQL\'in <code>FILTER</code> yan tümcesi: tek sorguda toplam sipariş ve iptal edilen sipariş sayısı, <code>toplam</code>, <code>iptal</code>.',
    "SELECT COUNT(*) AS toplam, COUNT(*) FILTER (WHERE status = 'cancelled') AS iptal FROM orders;",
    "COUNT(*) FILTER (WHERE status = 'cancelled')"),
]);

/* ---------------------------------------------------------------- şema tasarlama */
ext('normalizasyon', [
  sq('3NF\'e doğru bir adım: müşteri tablosundaki şehirleri ayrı bir tabloya çıkar. <code>cities</code> adında, boş olmayan <b>tekil şehirlerden</b> oluşan ve tek sütunu <code>city</code> olan tabloyu <code>CREATE TABLE ... AS SELECT</code> ile kur.',
    'CREATE TABLE cities AS SELECT DISTINCT city FROM customers WHERE city IS NOT NULL;',
    'CREATE TABLE cities AS SELECT DISTINCT ...', { check: 'SELECT city FROM cities ORDER BY city' }),
  sq('Çoka çok ilişki için <b>bağlantı tablosu</b> tasarla: <code>campaign_products</code>; sütunlar <code>campaign_id</code> INTEGER boş olamaz, <code>product_id</code> INTEGER boş olamaz ve <code>products(product_id)</code>\'e başvurur; birincil anahtar iki sütunun birleşimi.',
    'CREATE TABLE campaign_products (campaign_id INTEGER NOT NULL, product_id INTEGER NOT NULL REFERENCES products(product_id), PRIMARY KEY (campaign_id, product_id));',
    'PRIMARY KEY (campaign_id, product_id) tablo düzeyinde yazılır.',
    { start: 'CREATE TABLE campaign_products (\n  \n);', check: "SELECT name, \"notnull\", pk, (SELECT COUNT(*) FROM pragma_foreign_key_list('campaign_products') WHERE \"table\" = 'products') FROM pragma_table_info('campaign_products') ORDER BY cid" }),
]);
ext('dwh-tasarim', [
  sq('Yıldız şemanın boyutu: <code>dim_urun</code> tablosunu kur; <code>urun_key</code> INTEGER birincil anahtar (vekil anahtar), <code>product_id</code> INTEGER boş olamaz (iş anahtarı), <code>ad</code> TEXT, <code>kategori</code> TEXT.',
    'CREATE TABLE dim_urun (urun_key INTEGER PRIMARY KEY, product_id INTEGER NOT NULL, ad TEXT, kategori TEXT);',
    'Vekil anahtar birincil anahtar olur; iş anahtarı ayrı sütunda kalır.',
    { start: 'CREATE TABLE dim_urun (\n  \n);', check: "SELECT name, \"notnull\", pk FROM pragma_table_info('dim_urun') ORDER BY cid" }),
]);

/* ---------------------------------------------------------------- üçüncü görevler (her derste en az üç uygulamalı görev) */
ext('tarih', [
  sq('Bildirimsel dilin gücü: kategori başına ürün sayısı ve ortalama fiyat (2 basamak): <code>category</code>, <code>urun</code>, <code>ort_fiyat</code>; kategoriye göre sıralı.',
    'SELECT category, COUNT(*) AS urun, ROUND(AVG(price), 2) AS ort_fiyat FROM products GROUP BY category ORDER BY category;', 'GROUP BY category', { ord: true }),
]);
ext('acid', [
  sq('Kalıcı kayıt üzerinden ciro: <b>teslim edilmiş</b> siparişlerin net tutarı, satır başına <code>quantity * unit_price * (1 - discount)</code>, 2 basamak: <code>ciro</code>.',
    "SELECT ROUND(SUM(i.quantity * i.unit_price * (1 - i.discount)), 2) AS ciro FROM order_items AS i JOIN orders AS o ON o.order_id = i.order_id WHERE o.status = 'delivered';", "orders.status = 'delivered' ile süz, satır tutarını topla."),
]);
ext('be-kilit', [
  sq('Kapasite kontrolü için önce sayım: her uçuşta <b>iptal edilmemiş</b> rezervasyon sayısı en yüksek 5 uçuş, <code>flight_id</code>, <code>rezervasyon</code>; çoktan aza, eşitlikte uçuş numarası.',
    "SELECT flight_id, COUNT(*) AS rezervasyon FROM hv_bookings WHERE status <> 'cancelled' GROUP BY flight_id ORDER BY rezervasyon DESC, flight_id LIMIT 5;", 'GROUP BY flight_id, ORDER BY ... LIMIT 5', { ord: true }),
]);
ext('modern-ekosistem', [
  sq('Lakehouse\'taki altın tablo gibi: kanal başına sipariş sayısı ve iptal oranı (yüzde, 1 basamak): <code>channel</code>, <code>siparis</code>, <code>iptal_yuzde</code>; kanala göre sıralı.',
    "SELECT channel, COUNT(*) AS siparis, ROUND(100.0 * SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) / COUNT(*), 1) AS iptal_yuzde FROM orders GROUP BY channel ORDER BY channel;", 'SUM(CASE ...) / COUNT(*)', { ord: true }),
  sq('Bulut ambarlarında sık kalıp: her kategorinin satış adedinin <b>toplam içindeki payı</b> (yüzde, 1 basamak) pencere işleviyle: <code>category</code>, <code>adet</code>, <code>pay</code>; kategoriye göre sıralı.',
    'SELECT p.category, SUM(i.quantity) AS adet, ROUND(100.0 * SUM(i.quantity) / SUM(SUM(i.quantity)) OVER (), 1) AS pay FROM order_items AS i JOIN products AS p ON p.product_id = i.product_id GROUP BY p.category ORDER BY p.category;', 'SUM(SUM(...)) OVER () toplamı verir.', { ord: true }),
]);
ext('cert-dbx-snow', [
  sq('Her kategoride en çok satan (adet) ürün: <code>category</code>, <code>name</code>, <code>adet</code>; kategoriye göre sıralı (eşitlikte ürün adı küçük olan).',
    'SELECT category, name, adet FROM (SELECT p.category, p.name, SUM(i.quantity) AS adet, ROW_NUMBER() OVER (PARTITION BY p.category ORDER BY SUM(i.quantity) DESC, p.name) AS rn FROM order_items AS i JOIN products AS p ON p.product_id = i.product_id GROUP BY p.category, p.name) AS z WHERE rn = 1 ORDER BY category;', 'Önce GROUP BY, sonra ROW_NUMBER, dışarıda rn = 1.', { ord: true }),
  sq('Kümülatif toplam: 2024\'te sipariş verilen her günün sipariş sayısı ve yıl başından o güne birikimli sayı, ilk 5 gün: <code>order_date</code>, <code>siparis</code>, <code>birikimli</code>.',
    "SELECT order_date, siparis, SUM(siparis) OVER (ORDER BY order_date) AS birikimli FROM (SELECT order_date, COUNT(*) AS siparis FROM orders WHERE order_date >= '2024-01-01' AND order_date < '2025-01-01' GROUP BY order_date) AS g ORDER BY order_date LIMIT 5;", 'SUM(...) OVER (ORDER BY order_date)', { ord: true }),
]);
ext('sertifika-rehber', [
  sq('İlişkili alt sorgu: <b>kendi kategorisinin ortalamasından</b> pahalı ürün sayısı, <code>adet</code>.',
    'SELECT COUNT(*) AS adet FROM products AS p WHERE p.price > (SELECT AVG(x.price) FROM products AS x WHERE x.category = p.category);', 'Alt sorgu dıştaki satırın kategorisine bağlanır.'),
]);
ext('de-cdc', [
  sq('Hangi ürünlerin fiyatı <b>birden fazla kez</b> değişti? <code>product_id</code>, <code>degisim</code>; ürüne göre sıralı.',
    'SELECT product_id, COUNT(*) AS degisim FROM price_updates GROUP BY product_id HAVING COUNT(*) > 1 ORDER BY product_id;', 'HAVING COUNT(*) > 1', { ord: true }),
]);
ext('veri-aktarim', [
  sq('Mükerrer kaynak kaydı: staging\'de birden fazla gelen <code>kaynak_no</code> değerleri ve tekrar sayısı: <code>kaynak_no</code>, <code>adet</code>; sıralı.',
    'SELECT kaynak_no, COUNT(*) AS adet FROM etl_stg_hareket GROUP BY kaynak_no HAVING COUNT(*) > 1 ORDER BY kaynak_no;', 'GROUP BY kaynak_no HAVING COUNT(*) > 1', { ord: true }),
]);
ext('dba-mimari', [
  ts('Her tablodaki <b>benzersiz</b> indeks sayısı: <code>tablo</code>, <code>benzersiz</code>; tablo adına göre sıralı.',
    'SELECT OBJECT_NAME(object_id) AS tablo, SUM(CASE WHEN is_unique = 1 THEN 1 ELSE 0 END) AS benzersiz FROM sys.indexes GROUP BY OBJECT_NAME(object_id) ORDER BY tablo;', 'OBJECT_NAME(object_id) ile grupla.', { ord: true }),
]);
ext('dba-yedek', [
  ts('Fark yedekleri (type = <code>I</code>): veritabanı başına sayı ve son fark yedeğinin bitişi: <code>database_name</code>, <code>adet</code>, <code>son</code>.',
    "SELECT database_name, COUNT(*) AS adet, MAX(backup_finish_date) AS son FROM msdb.dbo.backupset WHERE type = 'I' GROUP BY database_name;", "type = 'I'"),
]);
ext('dba-bakim', [
  ts('Bakım penceresini boyutla: tablo başına toplam sayfa sayısı (indeks sayfaları dahil): <code>tablo</code>, <code>sayfa</code>; çoktan aza.',
    "SELECT OBJECT_NAME(ips.object_id) AS tablo, SUM(ips.page_count) AS sayfa FROM sys.dm_db_index_physical_stats(DB_ID(), NULL, NULL, NULL, 'SAMPLED') AS ips GROUP BY OBJECT_NAME(ips.object_id) ORDER BY sayfa DESC;", 'SUM(page_count)', { ord: true }),
]);
ext('dba-izleme', [
  ts('Açık işlemi olan oturumlar (engellemenin ilk şüphelileri): <code>session_id</code>, <code>login_name</code>; oturuma göre sıralı.',
    'SELECT session_id, login_name FROM sys.dm_exec_sessions WHERE open_transaction_count > 0 ORDER BY session_id;', 'open_transaction_count > 0', { ord: true }),
]);
ext('dba-ha', [
  ts('Geri yükleme zinciri: <code>ilgaz_portal</code> için son tam yedekten <b>sonra</b> alınan günlük yedek sayısı, <code>gunluk</code>.',
    "SELECT COUNT(*) AS gunluk FROM msdb.dbo.backupset WHERE database_name = 'ilgaz_portal' AND type = 'L' AND backup_finish_date > (SELECT MAX(backup_finish_date) FROM msdb.dbo.backupset WHERE database_name = 'ilgaz_portal' AND type = 'D');", 'Alt sorguyla son tam yedeğin zamanı.'),
  ts('Yedek türü başına ortalama süre (dakika, 1 basamak): <code>type</code>, <code>ort_dk</code>; türe göre sıralı.',
    'SELECT type, ROUND(AVG(CAST(DATEDIFF(SECOND, backup_start_date, backup_finish_date) AS FLOAT)) / 60, 1) AS ort_dk FROM msdb.dbo.backupset GROUP BY type ORDER BY type;', 'DATEDIFF(SECOND, ...) / 60', { ord: true }),
]);
ext('kopru-hadr', [
  ts('Felaket kurtarma planı için: her veritabanının <b>son tam yedeğinin boyutu</b>: <code>database_name</code>, <code>boyut</code>; veritabanına göre sıralı.',
    "SELECT b.database_name, b.backup_size AS boyut FROM msdb.dbo.backupset AS b WHERE b.type = 'D' AND b.backup_finish_date = (SELECT MAX(x.backup_finish_date) FROM msdb.dbo.backupset AS x WHERE x.database_name = b.database_name AND x.type = 'D') ORDER BY b.database_name;", 'İlişkili alt sorguyla son tam yedeği seç.', { ord: true }),
  ts('Günlük yedeklerin sıklığı: veritabanı başına günlük yedek sayısı ve ilk ile son arasındaki saat: <code>database_name</code>, <code>adet</code>, <code>saat</code>.',
    "SELECT database_name, COUNT(*) AS adet, DATEDIFF(HOUR, MIN(backup_finish_date), MAX(backup_finish_date)) AS saat FROM msdb.dbo.backupset WHERE type = 'L' GROUP BY database_name;", 'DATEDIFF(HOUR, MIN(...), MAX(...))'),
]);
ext('azure-sql', [
  ts('Rol düzeyinde yetki: her <b>sorumlu</b> (kullanıcı ya da rol) için verilmiş (GRANT) izin sayısı: <code>kim</code>, <code>izin</code>; ada göre sıralı.',
    "SELECT pr.name AS kim, COUNT(*) AS izin FROM sys.database_permissions AS pe JOIN sys.database_principals AS pr ON pr.principal_id = pe.grantee_principal_id WHERE pe.state_desc = 'GRANT' GROUP BY pr.name ORDER BY pr.name;", "state_desc = 'GRANT', GROUP BY pr.name", { ord: true }),
  ts('Rol başına üye sayısı (en az yetki incelemesinin ilk tablosu): <code>rol</code>, <code>uye</code>; çoktan aza, sonra ada göre.',
    'SELECT r.name AS rol, COUNT(*) AS uye FROM sys.database_role_members AS rm JOIN sys.database_principals AS r ON r.principal_id = rm.role_principal_id GROUP BY r.name ORDER BY uye DESC, r.name;', 'GROUP BY r.name', { ord: true }),
]);
ext('dp300-yonetim', [
  ts('Çelişen yetki: <b>DENY</b> izni olan kullanıcının üye olduğu roller: <code>kullanici</code>, <code>rol</code>.',
    "SELECT DISTINCT u.name AS kullanici, r.name AS rol FROM sys.database_permissions AS pe JOIN sys.database_principals AS u ON u.principal_id = pe.grantee_principal_id JOIN sys.database_role_members AS rm ON rm.member_principal_id = u.principal_id JOIN sys.database_principals AS r ON r.principal_id = rm.role_principal_id WHERE pe.state_desc = 'DENY';", 'İzin → kullanıcı → rol üyeliği → rol.'),
]);
ext('kopru-plsql', [
  ora('SQL Server\'daki <code>TOP</code> Oracle\'da <code>FETCH FIRST</code>: en pahalı 3 ürün, <code>name</code>, <code>price</code>.',
    'SELECT name, price FROM products ORDER BY price DESC, name FETCH FIRST 3 ROWS ONLY;', 'ORDER BY ... FETCH FIRST 3 ROWS ONLY', { ord: true }),
  ora('Metin birleştirme <code>+</code> değil <code>||</code>: ilk beş müşterinin adı ve soyadı tek sütunda, <code>ad_soyad</code>; müşteri numarasına göre sıralı.',
    "SELECT first_name || ' ' || last_name AS ad_soyad FROM customers WHERE customer_id <= 5 ORDER BY customer_id;", "first_name || ' ' || last_name", { ord: true }),
]);
})();
