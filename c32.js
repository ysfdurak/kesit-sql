/* Kesit SQL içerik 32: az alıştırmalı derslere SQL alıştırması ve alıştırma bankası dengesi
   - 25 derse 3–5 yeni alıştırma (motorun desteklemediği yerlerde çoktan seçmeli)
   - alıştırma bankasında 14 konuyu en az 15 göreve tamamlama (n001 …) */
(function () {
const L = window.SQLP_LESSONS; const LM = id => L.find(l => l.id === id);
const sq = (q, sol, o) => Object.assign({ t: 'sql', q: '<p>' + q + '</p>', sol }, o || {});
const mc = (q, o, a, why) => ({ t: 'mc', q, o, a, why });
const X = (id, list) => { const l = LM(id); if (l) l.ex = (l.ex || []).concat(list); };
const O = { ord: true };
const TS = (o) => Object.assign({ base: 'tsql', dl: ['tsql'] }, o || {});
const OR = (o) => Object.assign({ base: 'oracle', dl: ['oracle'] }, o || {});
const PG = (o) => Object.assign({ base: 'pg', dl: ['pg'] }, o || {});
const BQ = (o) => Object.assign({ base: 'bq', dl: ['bq'] }, o || {});

/* ======================= Görev A: ders alıştırmaları ======================= */

X('tasarim-kaliplari', [
  sq('Soft delete ile tekillik: <code>uye</code> tablosunu oluştur (<code>uye_id</code> birincil anahtar, <code>email</code>, <code>deleted_at</code>). Yalnızca silinmemiş satırlarda e-posta tekil olsun diye <code>ux_uye_email</code> adlı <b>filtreli benzersiz indeks</b> yaz (<code>WHERE deleted_at IS NULL</code>). Ardından şu üç satırı ekle: (1, ayse@ornek.com, 2024-10-01), (2, ayse@ornek.com, NULL), (3, can@ornek.com, NULL). Silinmiş eski hesapla aynı e-postada yeni hesap açılabildiğini gör.',
    "CREATE TABLE uye (uye_id INTEGER PRIMARY KEY, email TEXT, deleted_at TEXT);\nCREATE UNIQUE INDEX ux_uye_email ON uye (email) WHERE deleted_at IS NULL;\nINSERT INTO uye VALUES (1, 'ayse@ornek.com', '2024-10-01'), (2, 'ayse@ornek.com', NULL), (3, 'can@ornek.com', NULL);",
    { dl: ['sqlite', 'tsql', 'pg'], check: 'SELECT uye_id, email, deleted_at FROM uye ORDER BY uye_id', hint: 'MySQL ve Oracle filtreli indeksi bu yazımla desteklemez; bu yüzden alıştırma SQLite, SQL Server ve PostgreSQL içindir.' }),
  sq('Denetim sütunları: <code>kampanya_notu</code> tablosunu oluştur: <code>not_id</code> (birincil anahtar), <code>metin</code> (boş olamaz), <code>created_by</code> (varsayılan <code>\'sistem\'</code>). Sonra yalnızca <code>not_id</code> ve <code>metin</code> vererek iki not ekle: (1, Fiyat kontrolü), (2, Stok sayımı). Varsayılan değerin kendiliğinden dolduğunu gör.',
    "CREATE TABLE kampanya_notu (not_id INTEGER PRIMARY KEY, metin TEXT NOT NULL, created_by TEXT DEFAULT 'sistem');\nINSERT INTO kampanya_notu (not_id, metin) VALUES (1, 'Fiyat kontrolü');\nINSERT INTO kampanya_notu (not_id, metin) VALUES (2, 'Stok sayımı');",
    { check: 'SELECT not_id, metin, created_by FROM kampanya_notu ORDER BY not_id' }),
  sq('Virgüllü liste tuzağı: başlangıç kodundaki CTE\'de etiketler tek sütunda virgülle tutuluyor. <b>indirim</b> etiketi olan ürün sayısını bul (<b>indirimli</b> sayılmasın): <code>adet</code>. İpucu: listenin iki ucuna virgül ekleyip <code>\'%,indirim,%\'</code> ara.',
    "WITH u AS (SELECT 1 AS urun_id, 'yeni,indirim' AS etiketler UNION ALL SELECT 2, 'indirimli,kampanya' UNION ALL SELECT 3, 'indirim' UNION ALL SELECT 4, 'kampanya,yeni')\nSELECT COUNT(*) AS adet FROM u WHERE ',' || etiketler || ',' LIKE '%,indirim,%';",
    { start: "WITH u AS (SELECT 1 AS urun_id, 'yeni,indirim' AS etiketler UNION ALL SELECT 2, 'indirimli,kampanya' UNION ALL SELECT 3, 'indirim' UNION ALL SELECT 4, 'kampanya,yeni')\nSELECT ...", why: 'Basit LIKE \'%indirim%\' “indirimli”yi de yakalar; virgüllü liste her sorguda bu tür hileler ister. Asıl çözüm ara tablodur.' }),
  sq('Aynı veriyi doğru tasarla: <code>urun_etiket</code> ara tablosunu oluştur (<code>product_id</code>, <code>etiket</code>; birincil anahtar ikisinin birleşimi). Şu satırları ekle: (1, yeni), (1, indirim), (2, kampanya), (3, indirim), (4, kampanya), (4, yeni).',
    "CREATE TABLE urun_etiket (product_id INTEGER, etiket TEXT, PRIMARY KEY (product_id, etiket));\nINSERT INTO urun_etiket VALUES (1, 'yeni'), (1, 'indirim'), (2, 'kampanya'), (3, 'indirim'), (4, 'kampanya'), (4, 'yeni');",
    { check: 'SELECT etiket, COUNT(*) AS urun FROM urun_etiket GROUP BY etiket ORDER BY etiket' })
]);

X('view-ileri', [
  sq('Görünüm üstüne sorgu: teslim edilmiş siparişlerin net tutarını veren <code>v_teslim_tutar</code> görünümünü oluştur (<code>order_id</code>, <code>channel</code>, <code>tutar</code>). Ardından görünümden kanal başına ortalama sipariş tutarını getir (2 basamak): <code>channel</code>, <code>ort</code>. Kanala göre sırala.',
    "CREATE VIEW v_teslim_tutar AS\nSELECT o.order_id, o.channel, SUM(oi.quantity * oi.unit_price * (1 - oi.discount)) AS tutar\nFROM orders o JOIN order_items oi ON oi.order_id = o.order_id\nWHERE o.status = 'delivered'\nGROUP BY o.order_id, o.channel;\nSELECT channel, ROUND(AVG(tutar), 2) AS ort FROM v_teslim_tutar GROUP BY channel ORDER BY channel;", O),
  sq('Görünümün tanımını değiştir: önce 5000 TL üstü ürünleri gösteren <code>v_pahali</code> görünümünü oluştur. Sonra iş kuralı değişti: görünümü <code>DROP VIEW</code> ile kaldırıp eşiği 3000 TL yaparak yeniden oluştur ve görünümdeki ürün sayısını getir: <code>adet</code>.',
    "CREATE VIEW v_pahali AS SELECT product_id, name, price FROM products WHERE price > 5000;\nDROP VIEW v_pahali;\nCREATE VIEW v_pahali AS SELECT product_id, name, price FROM products WHERE price > 3000;\nSELECT COUNT(*) AS adet FROM v_pahali;"),
  sq('Somut görünümü elle ve <b>artımlı</b> yenile: kanal başına sipariş sayısını tutan <code>mv_kanal</code> tablosunu oluştur (<code>channel</code>, <code>siparis</code>). Sonra yeni bir sipariş ekle (order_id 5001, customer_id 1, 2024-12-31, delivered, web) ve tabloyu baştan kurmak yerine yalnızca <b>web</b> satırını yenile (o satırı sil, yalnızca web için yeniden hesaplayıp ekle).',
    "CREATE TABLE mv_kanal AS SELECT channel, COUNT(*) AS siparis FROM orders GROUP BY channel;\nINSERT INTO orders (order_id, customer_id, order_date, status, channel) VALUES (5001, 1, '2024-12-31', 'delivered', 'web');\nDELETE FROM mv_kanal WHERE channel = 'web';\nINSERT INTO mv_kanal SELECT channel, COUNT(*) FROM orders WHERE channel = 'web' GROUP BY channel;",
    { dl: ['sqlite', 'pg', 'mysql', 'oracle'], check: 'SELECT channel, siparis FROM mv_kanal ORDER BY channel', why: 'Değişen kısmı yenilemek, büyük özet tablolarda tamamını yeniden hesaplamaktan çok daha ucuzdur; materialized view\'lerin “fast/incremental refresh” fikri budur.' })
]);

X('trigger', [
  sq('Denetim kaydı: <code>hesap_log</code> tablosunu oluştur (<code>account_id</code>, <code>eski</code>, <code>yeni</code>). <code>bank_accounts.status</code> değiştiğinde (eski ≠ yeni) eski ve yeni durumu bu tabloya yazan <code>trg_hesap_durum</code> trigger\'ını yaz. Sonra 100001 ve 100002 numaralı hesapları <code>kapali</code> yap.',
    "CREATE TABLE hesap_log (account_id INTEGER, eski TEXT, yeni TEXT);\nCREATE TRIGGER trg_hesap_durum AFTER UPDATE OF status ON bank_accounts\nWHEN OLD.status <> NEW.status\nBEGIN\n  INSERT INTO hesap_log VALUES (NEW.account_id, OLD.status, NEW.status);\nEND;\nUPDATE bank_accounts SET status = 'kapali' WHERE account_id IN (100001, 100002);",
    { dl: ['tsql', 'sqlite'], nr: ['pg', 'mysql', 'oracle'], solv: { tsql: "CREATE TABLE hesap_log (account_id INT, eski NVARCHAR(10), yeni NVARCHAR(10));\nGO\nCREATE TRIGGER trg_hesap_durum ON bank_accounts AFTER UPDATE AS\nBEGIN\n  SET NOCOUNT ON;\n  INSERT INTO hesap_log (account_id, eski, yeni)\n  SELECT i.account_id, d.status, i.status FROM inserted i JOIN deleted d ON d.account_id = i.account_id WHERE d.status <> i.status;\nEND;\nGO\nUPDATE bank_accounts SET status = 'kapali' WHERE account_id IN (100001, 100002);" }, check: 'SELECT account_id, eski, yeni FROM hesap_log ORDER BY account_id', hint: 'SQL Server\'da eski değer deleted, yeni değer inserted sanal tablosundadır; SQLite\'ta OLD ve NEW.' }),
  sq('Türetilmiş alanı güncel tut: <code>order_items</code> tablosuna satır eklendiğinde ilgili ürünün <code>products.stock</code> değerini eklenen adet kadar azaltan <code>trg_stok_dus</code> trigger\'ını yaz. Sonra 1 numaralı siparişe 5 numaralı üründen 2 adet ekle (item_id 9001, birim fiyat 100, indirim 0).',
    "CREATE TRIGGER trg_stok_dus AFTER INSERT ON order_items\nBEGIN\n  UPDATE products SET stock = stock - NEW.quantity WHERE product_id = NEW.product_id;\nEND;\nINSERT INTO order_items (item_id, order_id, product_id, quantity, unit_price, discount) VALUES (9001, 1, 5, 2, 100, 0);",
    { dl: ['tsql', 'sqlite'], nr: ['pg', 'mysql', 'oracle'], solv: { tsql: "CREATE TRIGGER trg_stok_dus ON order_items AFTER INSERT AS\nBEGIN\n  SET NOCOUNT ON;\n  UPDATE products SET stock = stock - (SELECT SUM(i.quantity) FROM inserted i WHERE i.product_id = products.product_id)\n  WHERE product_id IN (SELECT product_id FROM inserted);\nEND;\nGO\nINSERT INTO order_items (item_id, order_id, product_id, quantity, unit_price, discount) VALUES (9001, 1, 5, 2, 100, 0);" }, check: 'SELECT product_id, stock FROM products WHERE product_id = 5' }),
  sq('T-SQL ile küme bazlı trigger: <code>dbo.buyuk_islem</code> tablosunu oluştur (<code>txn_id</code>, <code>amount</code>). <code>dbo.bank_txns</code> tablosuna satır eklendiğinde tutarın mutlak değeri 50.000 ve üzeri olan satırları <code>inserted</code> sanal tablosundan bu tabloya yazan <code>trg_buyuk_islem</code> trigger\'ını yaz. Sonra tek bir INSERT ile üç hareket ekle: (900001, hesap 100001, 2024-12-31 10:00, 75000, havale_giris, internet, NULL), (900002, 100001, 2024-12-31 11:00, -1200, fatura, internet, NULL), (900003, 100002, 2024-12-31 12:00, -52000, havale_cikis, sube, NULL).',
    "CREATE TABLE dbo.buyuk_islem (txn_id INT, amount DECIMAL(12,2));\nGO\nCREATE TRIGGER trg_buyuk_islem ON dbo.bank_txns AFTER INSERT AS\nBEGIN\n  SET NOCOUNT ON;\n  INSERT INTO dbo.buyuk_islem (txn_id, amount)\n  SELECT txn_id, amount FROM inserted WHERE ABS(amount) >= 50000;\nEND;\nGO\nINSERT INTO dbo.bank_txns (txn_id, account_id, txn_time, amount, txn_type, channel, merchant_category) VALUES\n (900001, 100001, '2024-12-31 10:00:00', 75000, 'havale_giris', 'internet', NULL),\n (900002, 100001, '2024-12-31 11:00:00', -1200, 'fatura', 'internet', NULL),\n (900003, 100002, '2024-12-31 12:00:00', -52000, 'havale_cikis', 'sube', NULL);",
    TS({ check: 'SELECT txn_id, amount FROM buyuk_islem ORDER BY txn_id', why: 'SQL Server trigger\'ı ifade başına bir kez çalışır; üç satırlık INSERT\'te inserted tablosunda üç satır vardır. Bu yüzden trigger içinde tek satır varsayan değişken ataması yerine küme bazlı INSERT ... SELECT yazılır.' }))
]);

X('performans-lab', [
  sq('Fonksiyon indeksi bozar: <code>SELECT COUNT(*) FROM bank_txns WHERE strftime(\'%Y-%m\', txn_time) = \'2024-11\'</code> sorgusu sütunu fonksiyona soktuğu için indeks kullanamaz. Aynı sonucu sütunu çıplak bırakan bir <b>aralık koşuluyla</b> yaz: <code>islem</code>.',
    "SELECT COUNT(*) AS islem FROM bank_txns WHERE txn_time >= '2024-11-01' AND txn_time < '2024-12-01';"),
  sq('Bileşik indeks ve sorgu: <code>bank_txns</code> üzerinde <code>(txn_type, merchant_category)</code> sütunlarına <code>ix_tur_kategori</code> indeksini oluştur. Ardından kart harcamalarında kategori başına işlem sayısının en yüksek 3 kategorisini getir: <code>merchant_category</code>, <code>islem</code>.',
    "CREATE INDEX ix_tur_kategori ON bank_txns (txn_type, merchant_category);\nSELECT merchant_category, COUNT(*) AS islem FROM bank_txns WHERE txn_type = 'kart_harcama' GROUP BY merchant_category ORDER BY islem DESC, merchant_category LIMIT 3;",
    { ord: true, dl: ['sqlite', 'tsql', 'pg', 'mysql', 'oracle'] }),
  sq('SQLite\'ta kaplayan indeksi gör: <code>(channel, amount)</code> sütunlarına <code>ix_kanal_tutar</code> indeksini oluştur, sonra <code>EXPLAIN QUERY PLAN</code> ile <code>SELECT SUM(amount) FROM bank_txns WHERE channel = \'mobil\'</code> sorgusunun planını getir. Planda <b>COVERING INDEX</b> ifadesini ara.',
    "CREATE INDEX ix_kanal_tutar ON bank_txns (channel, amount);\nEXPLAIN QUERY PLAN SELECT SUM(amount) FROM bank_txns WHERE channel = 'mobil';",
    { base: 'sqlite', dl: ['sqlite'] })
]);

X('bs-giris', [
  sq('Üç adımlı boru hattı (Lezzet Kurye): (1) teslim edilen siparişlerin sipariş tutarı (satır toplamı <code>qty * unit_price</code>), (2) restoran başına sipariş sayısı ve ortalama sepet, (3) restoran adıyla birleştirip ortalama sepeti en yüksek 3 restoran: <code>name</code>, <code>siparis</code>, <code>ort_sepet</code> (2 basamak). Her adımı ayrı CTE yaz.',
    "WITH teslim AS (\n  SELECT o.order_id, o.restaurant_id, SUM(l.qty * l.unit_price) AS tutar\n  FROM lk_orders o JOIN lk_order_lines l ON l.order_id = o.order_id\n  WHERE o.status = 'teslim'\n  GROUP BY o.order_id, o.restaurant_id\n), restoran AS (\n  SELECT restaurant_id, COUNT(*) AS siparis, AVG(tutar) AS ort FROM teslim GROUP BY restaurant_id\n)\nSELECT r.name, x.siparis, ROUND(x.ort, 2) AS ort_sepet\nFROM restoran x JOIN lk_restaurants r ON r.restaurant_id = x.restaurant_id\nORDER BY x.ort DESC, r.name LIMIT 3;", O),
  sq('Adım adım satır sayısı kontrolü (Ilgaz Bank): (a) aktif hesaplar, (b) bu hesapların Aralık 2024 hareketleri, (c) Aralıkta en az bir hareketi olan farklı hesaplar. Her adımı CTE yaz ve sayıları tek sonuçta alt alta göster: <code>adim</code> (a, b, c), <code>satir</code>.',
    "WITH aktif AS (SELECT account_id FROM bank_accounts WHERE status = 'aktif'),\nhareket AS (SELECT t.txn_id, t.account_id FROM bank_txns t JOIN aktif a ON a.account_id = t.account_id WHERE t.txn_time >= '2024-12-01' AND t.txn_time < '2025-01-01'),\nhesap AS (SELECT DISTINCT account_id FROM hareket)\nSELECT 'a' AS adim, COUNT(*) AS satir FROM aktif\nUNION ALL SELECT 'b', COUNT(*) FROM hareket\nUNION ALL SELECT 'c', COUNT(*) FROM hesap\nORDER BY adim;", O),
  sq('Filtreyi erken uygula (Kanat Havayolları): ilk CTE\'de yalnızca Aralık 2024\'te inmiş (<code>landed</code>) uçuşları ve kalkış gecikmesini (dakika) al; sonra rota ile birleştirip kalkış havalimanına göre ortalama gecikmeyi hesapla (1 basamak). En yüksek 5: <code>origin</code>, <code>ort_gecikme</code>.',
    "WITH ucus AS (\n  SELECT route_id, ROUND((julianday(actual_dep) - julianday(sched_dep)) * 1440) AS gecikme\n  FROM hv_flights\n  WHERE status = 'landed' AND sched_dep >= '2024-12-01' AND sched_dep < '2025-01-01'\n)\nSELECT r.origin, ROUND(AVG(u.gecikme), 1) AS ort_gecikme\nFROM ucus u JOIN hv_routes r ON r.route_id = u.route_id\nGROUP BY r.origin\nORDER BY ort_gecikme DESC, r.origin LIMIT 5;", O)
]);

X('mk-yontem', [
  sq('Mülakat sorusu: “Her departmanın en yüksek maaşlı çalışanı; eşitlik varsa hepsi.” Eşitliği koruyan sıralama fonksiyonunu seç: <code>departman</code>, <code>first_name</code>, <code>salary</code>. Departmana, sonra ada göre sırala.',
    "WITH r AS (SELECT d.name AS departman, e.first_name, e.salary, RANK() OVER (PARTITION BY e.dept_id ORDER BY e.salary DESC) AS sira FROM employees e JOIN departments d ON d.dept_id = e.dept_id)\nSELECT departman, first_name, salary FROM r WHERE sira = 1 ORDER BY departman, first_name;",
    { ord: true, why: 'ROW_NUMBER eşit maaşlılardan yalnızca birini getirirdi; soru “hepsi” dediği için RANK (ya da DENSE_RANK) gerekir.' }),
  sq('Oran sorusu (tam sayı bölmesi tuzağı): rota başına uçuş sayısı ve iptal oranı (yüzde, 1 basamak). Yalnızca en az bir iptali olan rotalar; orana göre azalan, eşitlikte rota numarası: <code>route_id</code>, <code>ucus</code>, <code>iptal_oran</code>.',
    "SELECT route_id, COUNT(*) AS ucus, ROUND(100.0 * SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) / COUNT(*), 1) AS iptal_oran\nFROM hv_flights\nGROUP BY route_id\nHAVING SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) > 0\nORDER BY iptal_oran DESC, route_id;", O),
  sq('LEFT JOIN tuzağı: her müşteri segmentinde toplam müşteri sayısı ve Aralık 2024\'te sipariş veren müşteri sayısı. Tarih koşulunu WHERE\'e değil ON\'a yaz ki siparişsiz müşteriler kaybolmasın: <code>segment</code>, <code>musteri</code>, <code>aralik_alan</code>.',
    "SELECT c.segment, COUNT(DISTINCT c.customer_id) AS musteri, COUNT(DISTINCT o.customer_id) AS aralik_alan\nFROM customers c\nLEFT JOIN orders o ON o.customer_id = c.customer_id AND o.order_date >= '2024-12-01' AND o.order_date < '2025-01-01'\nGROUP BY c.segment;")
]);

X('tam-metin', [
  sq('SQLite FTS ile: <code>menu_ara</code> adında bir fts4 tablosu oluştur (<code>name</code>, <code>category</code>; docid = <code>item_id</code>), Lezzet Kurye menüsünün tamamını ekle ve adında <b>pizza</b> geçen menü kalemlerinin sayısını bul: <code>adet</code>.',
    "CREATE VIRTUAL TABLE menu_ara USING fts4(name, category);\nINSERT INTO menu_ara (docid, name, category) SELECT item_id, name, category FROM lk_menu_items;\nSELECT COUNT(*) AS adet FROM menu_ara WHERE name MATCH 'pizza';",
    { base: 'sqlite', dl: ['sqlite'] }),
  sq('Kök bulma yok, önek var: tam metin arama kelimeyi olduğu gibi dizinler; “Türk Kahvesi” içindeki <i>Kahvesi</i>, <i>kahve</i> aramasıyla bulunmaz. fts4 tablosu <code>menu_ara2</code> (<code>name</code>; docid = <code>item_id</code>) oluştur ve önek araması <code>kahve*</code> ile bulunan kalemleri menü tablosuyla birleştirip ada göre say: <code>name</code>, <code>adet</code>.',
    "CREATE VIRTUAL TABLE menu_ara2 USING fts4(name);\nINSERT INTO menu_ara2 (docid, name) SELECT item_id, name FROM lk_menu_items;\nSELECT m.name, COUNT(*) AS adet FROM menu_ara2 a JOIN lk_menu_items m ON m.item_id = a.docid WHERE menu_ara2 MATCH 'kahve*' GROUP BY m.name;",
    { base: 'sqlite', dl: ['sqlite'] }),
  sq('Karşılaştırma için LIKE: dizinsiz yöntemle, adında <b>Döner</b> geçen menü kalemlerinin kategori başına sayısını bul: <code>category</code>, <code>adet</code>. (Büyük tabloda bu sorgu her satırı tarar.)',
    "SELECT category, COUNT(*) AS adet FROM lk_menu_items WHERE name LIKE '%Döner%' GROUP BY category;")
]);

X('ts-guvenlik', [
  sq('Sütun gizleyen görünüm: maaşı göstermeden çalışan rehberi sunan <code>dbo.v_calisan_rehber</code> görünümünü oluştur (<code>emp_id</code>, <code>first_name</code>, <code>last_name</code>, <code>title</code>, <code>email</code>). <code>GO</code> ile ayırıp 2 numaralı departmanın rehberini getir: <code>first_name</code>, <code>title</code>. Ada göre sırala. (Raporculara tablo yerine bu görünüme SELECT izni verilir.)',
    "CREATE VIEW dbo.v_calisan_rehber AS\nSELECT emp_id, first_name, last_name, title, email, dept_id FROM dbo.employees;\nGO\nSELECT first_name, title FROM dbo.v_calisan_rehber WHERE dept_id = 2 ORDER BY first_name;",
    TS(O)),
  sq('Elle maskeleme (Dynamic Data Masking\'in yaptığını görmek için): e-postanın ilk iki karakteri + <code>***</code> + <code>@</code> ve sonrası biçiminde maskeli e-posta üret (<code>LEFT</code>, <code>CHARINDEX</code>, <code>SUBSTRING</code>). E-postası olan ilk 5 müşteri, numaraya göre: <code>customer_id</code>, <code>email_maskeli</code>.',
    "SELECT TOP (5) customer_id, LEFT(email, 2) + '***' + SUBSTRING(email, CHARINDEX('@', email), 100) AS email_maskeli\nFROM dbo.customers\nWHERE email IS NOT NULL\nORDER BY customer_id;",
    TS(O)),
  sq('Satır düzeyi güvenliğin fikri: şube numarası alan ve yalnızca o şubenin müşterilerini döndüren satır içi tablo fonksiyonu <code>dbo.fn_sube_musteri(@sube INT)</code> yaz (<code>customer_id</code>, <code>segment</code>). Sonra 3 numaralı şube için segment başına müşteri sayısını getir: <code>segment</code>, <code>musteri</code>.',
    "CREATE FUNCTION dbo.fn_sube_musteri (@sube INT)\nRETURNS TABLE\nAS RETURN (SELECT customer_id, segment FROM dbo.bank_customers WHERE branch_id = @sube);\nGO\nSELECT segment, COUNT(*) AS musteri FROM dbo.fn_sube_musteri(3) GROUP BY segment;",
    TS({ why: 'Row-Level Security\'de de aynı yapı kullanılır: bir filtre fonksiyonu yazılır ve CREATE SECURITY POLICY ile tabloya bağlanır; kullanıcı tabloyu sorgulasa bile yalnızca izinli satırları görür.' })),
  sq('Yalnızca prosedüre izin: müşterinin hesap bakiyelerini veren <code>dbo.usp_hesap_bakiye @musteri INT</code> saklı yordamını yaz (<code>account_id</code>, <code>account_type</code>, <code>bakiye</code> = hareket toplamı, tam sayı). <code>GO</code> ile ayırıp <code>EXEC dbo.usp_hesap_bakiye @musteri = 1;</code> çalıştır.',
    "CREATE PROCEDURE dbo.usp_hesap_bakiye @musteri INT\nAS\nBEGIN\n  SET NOCOUNT ON;\n  SELECT a.account_id, a.account_type, ROUND(SUM(t.amount), 0) AS bakiye\n  FROM dbo.bank_accounts a JOIN dbo.bank_txns t ON t.account_id = a.account_id\n  WHERE a.customer_id = @musteri\n  GROUP BY a.account_id, a.account_type;\nEND;\nGO\nEXEC dbo.usp_hesap_bakiye @musteri = 1;",
    TS())
]);

X('ts-temporal', [
  sq('Temporal tablonun yaptığını elle kur: <code>dbo.urun_gecmis</code> tablosunu oluştur (<code>product_id</code>, <code>price</code>). <code>dbo.products</code> güncellendiğinde fiyatı değişen satırların <b>eski</b> halini <code>deleted</code> tablosundan buraya yazan <code>trg_urun_gecmis</code> trigger\'ını yaz. Sonra Hediye kategorisinin fiyatlarını %20 artır.',
    "CREATE TABLE dbo.urun_gecmis (product_id INT, price DECIMAL(12,2));\nGO\nCREATE TRIGGER trg_urun_gecmis ON dbo.products AFTER UPDATE AS\nBEGIN\n  SET NOCOUNT ON;\n  INSERT INTO dbo.urun_gecmis (product_id, price)\n  SELECT d.product_id, d.price FROM deleted d JOIN inserted i ON i.product_id = d.product_id WHERE d.price <> i.price;\nEND;\nGO\nUPDATE dbo.products SET price = price * 1.2 WHERE category = N'Hediye';",
    TS({ check: 'SELECT product_id, price FROM urun_gecmis ORDER BY product_id' })),
  sq('“AS OF” sorgusunu elle yaz: başlangıç kodundaki fiyat geçmişinde her satırın geçerlilik aralığı var (<code>bas</code> dahil, <code>bit</code> hariç). <b>2024-06-15</b> itibarıyla geçerli fiyatları getir: <code>product_id</code>, <code>price</code>. Ürüne göre sırala.',
    "WITH gecmis AS (\n  SELECT 5 AS product_id, 1500 AS price, CAST('2024-01-01' AS DATE) AS bas, CAST('2024-05-01' AS DATE) AS bit UNION ALL\n  SELECT 5, 1650, '2024-05-01', '9999-12-31' UNION ALL\n  SELECT 9, 140, '2024-01-01', '2024-07-01' UNION ALL\n  SELECT 9, 145, '2024-07-01', '9999-12-31' UNION ALL\n  SELECT 12, 180, '2024-03-01', '9999-12-31'\n)\nSELECT product_id, price FROM gecmis\nWHERE bas <= '2024-06-15' AND bit > '2024-06-15'\nORDER BY product_id;",
    TS({ ord: true, start: "WITH gecmis AS (\n  SELECT 5 AS product_id, 1500 AS price, CAST('2024-01-01' AS DATE) AS bas, CAST('2024-05-01' AS DATE) AS bit UNION ALL\n  SELECT 5, 1650, '2024-05-01', '9999-12-31' UNION ALL\n  SELECT 9, 140, '2024-01-01', '2024-07-01' UNION ALL\n  SELECT 9, 145, '2024-07-01', '9999-12-31' UNION ALL\n  SELECT 12, 180, '2024-03-01', '9999-12-31'\n)\nSELECT ...", why: 'FOR SYSTEM_TIME AS OF \'2024-06-15\' tam olarak bu koşulu uygular: başlangıç ≤ an < bitiş.' })),
  sq('Değişiklik yakalama (CDC fikri): <code>dbo.price_updates</code> tablosunda her ürünün <b>en son</b> güncellemesini al ve mevcut fiyattan farklı olanları listele: <code>product_id</code>, <code>eski</code>, <code>yeni</code>. Ürüne göre sırala.',
    "WITH son AS (\n  SELECT product_id, new_price, ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY updated_at DESC) AS rn FROM dbo.price_updates\n)\nSELECT p.product_id, p.price AS eski, s.new_price AS yeni\nFROM son s JOIN dbo.products p ON p.product_id = s.product_id\nWHERE s.rn = 1 AND s.new_price <> p.price\nORDER BY p.product_id;",
    TS(O))
]);

X('ts-izolasyon', [
  sq('Geri alınan işlem: <code>BEGIN TRAN</code> ile başla, Kitap kategorisindeki tüm fiyatları 0 yap, sonra <code>ROLLBACK</code> ile geri al. Son olarak kitapların toplam fiyatını getir: <code>toplam</code> (değişmemiş olmalı).',
    "BEGIN TRAN;\nUPDATE dbo.products SET price = 0 WHERE category = N'Kitap';\nROLLBACK;\nSELECT SUM(price) AS toplam FROM dbo.products WHERE category = N'Kitap';",
    TS()),
  sq('İç içe işlem sayacı: iki kez <code>BEGIN TRAN</code> yaz, o anki <code>@@TRANCOUNT</code> değerini <code>@ic</code> değişkenine al, sonra iki kez <code>COMMIT</code> yaz. Sonuç: <code>ic</code>, <code>dis</code> (son <code>@@TRANCOUNT</code>).',
    "BEGIN TRAN;\nBEGIN TRAN;\nDECLARE @ic INT = @@TRANCOUNT;\nCOMMIT;\nCOMMIT;\nSELECT @ic AS ic, @@TRANCOUNT AS dis;",
    TS({ why: 'SQL Server\'da iç COMMIT yalnızca sayacı bir azaltır; asıl kalıcılık sayaç 0\'a indiğinde olur. İçteki ROLLBACK ise (savepoint yoksa) tüm işlemi geri alır.' })),
  sq('Stok rezervasyonu (kayıp güncellemeyi önlemek): bir işlem içinde 7 numaralı ürünün stoğunu <code>WITH (UPDLOCK, ROWLOCK)</code> ipucuyla <code>@stok</code> değişkenine oku; stok en az 3 ise 3 azalt, sonra <code>COMMIT</code>.',
    "BEGIN TRAN;\nDECLARE @stok INT;\nSELECT @stok = stock FROM dbo.products WITH (UPDLOCK, ROWLOCK) WHERE product_id = 7;\nIF @stok >= 3\n  UPDATE dbo.products SET stock = stock - 3 WHERE product_id = 7;\nCOMMIT;",
    TS({ check: 'SELECT product_id, stock FROM products WHERE product_id = 7', why: 'UPDLOCK okunan satırı güncelleme kilidiyle tutar; aynı anda çalışan ikinci işlem aynı stoğu okuyup ikinci kez satamaz. Ayrıca U kilitleri birbirine uyumsuz olduğundan klasik “ikisi de okuyup ikisi de yazmak isterken” oluşan deadlock da önlenir.' })),
  sq('Hata ve deadlock (1205) için kalıp: <code>BEGIN TRY</code> içinde işlemi başlat, 7 numaralı ürünün stoğunu 0 yap, ardından <code>THROW 51205, N\'deneme hatası\', 1;</code> ile hata fırlat. <code>CATCH</code> bloğunda işlem açıksa geri al ve <code>ERROR_NUMBER()</code> değerini <code>hata</code> olarak döndür.',
    "BEGIN TRY\n  BEGIN TRAN;\n  UPDATE dbo.products SET stock = 0 WHERE product_id = 7;\n  THROW 51205, N'deneme hatası', 1;\n  COMMIT;\nEND TRY\nBEGIN CATCH\n  IF @@TRANCOUNT > 0 ROLLBACK;\n  SELECT ERROR_NUMBER() AS hata;\nEND CATCH;",
    TS({ check: 'SELECT product_id, stock FROM products WHERE product_id = 7' }))
]);

X('plsql', [
  mc('PL/SQL\'de son UPDATE ifadesinin kaç satırı etkilediğini öğrenmek için ne kullanılır?', ['<code>@@ROWCOUNT</code> sistem değişkeni', '<code>SQL%ROWCOUNT</code>', '<code>ROW_COUNT()</code> fonksiyonu', '<code>DBMS_OUTPUT.ROWS</code> paketi'], 1, 'Oracle\'da örtük imlecin öznitelikleri SQL% önekiyle okunur: SQL%ROWCOUNT, SQL%FOUND, SQL%NOTFOUND. @@ROWCOUNT T-SQL\'e, ROW_COUNT() MySQL\'e aittir.'),
  mc('<code>FOR r IN (SELECT ...) LOOP ... END LOOP;</code> imleç döngüsünün açık imleçe (OPEN/FETCH/CLOSE) göre avantajı nedir?', ['Sorgu sonucunu otomatik olarak bir tabloya kaydeder ve tekrar kullanır', 'İmleci açma, satır okuma ve kapatma işlerini Oracle kendisi yapar', 'Satırları paralel işler ve her zaman daha hızlıdır', 'Döngü içinde DML yazılmasına izin vermez'], 1, 'İmleç FOR döngüsü OPEN, FETCH, EXIT WHEN %NOTFOUND ve CLOSE adımlarını kendisi yapar; kapatmayı unutma hatası ortadan kalkar.'),
  mc('Paket (PACKAGE) yapısında spesifikasyon ile gövde (BODY) ayrımının faydası nedir?', ['Gövde değişmeden spesifikasyonun her çağrıda yeniden derlenmesini sağlar', 'Spesifikasyon yalnızca DBA tarafından görülebilir, bu yüzden paket kodu gizli kalır', 'Gövdede yazılan her yordam ve değişken otomatik olarak herkese açık olur', 'Arayüz sabit kalırken gövde değişebilir; çağıran kod bozulmaz'], 3, 'Spesifikasyon sözleşmedir: hangi yordam ve fonksiyonların dışarıdan çağrılabileceğini söyler. Gövdedeki uygulama değiştiğinde spesifikasyona bağlı kodlar yeniden derleme gerektirmez; yalnızca gövdede tanımlanan yardımcılar paket içinde gizli kalır.'),
  sq('PL/SQL bloğundaki IF/ELSIF mantığını tek sorguda <code>CASE</code> ile yaz: iptal edilen sipariş sayısı ve sınıfı (100\'den fazla <b>yüksek</b>, 50\'den fazla <b>izlenmeli</b>, değilse <b>normal</b>): <code>adet</code>, <code>durum</code>.',
    "SELECT COUNT(*) AS adet, CASE WHEN COUNT(*) > 100 THEN 'yüksek' WHEN COUNT(*) > 50 THEN 'izlenmeli' ELSE 'normal' END AS durum FROM orders WHERE status = 'cancelled';",
    OR()),
  sq('<code>net_tutar</code> fonksiyonunun gövdesindeki ifadeyi sorguda kullan: 1 numaralı siparişin satırları için <code>ROUND(quantity * unit_price * (1 - NVL(discount, 0)), 2)</code>: <code>item_id</code>, <code>net</code>. Satıra göre sırala.',
    "SELECT item_id, ROUND(quantity * unit_price * (1 - NVL(discount, 0)), 2) AS net FROM order_items WHERE order_id = 1 ORDER BY item_id;",
    OR(O))
]);

X('plpgsql', [
  mc('PL/pgSQL fonksiyon gövdesini <code>$$ ... $$</code> arasına yazmanın amacı nedir?', ['Fonksiyonun bir sonraki çağrıda daha hızlı derlenmesini sağlar', 'Fonksiyonun kaynak kodunu yalnızca yöneticilerin görebileceği şekilde gizler', 'İçerideki tek tırnakları ikişer kez yazmamak', 'Gövdeyi otomatik olarak bir işlem (transaction) içine alır ve onaylar'], 2, 'Dolar tırnağı, gövdeyi bir metin sabiti olarak sınırlar; içerideki \'delivered\' gibi tırnaklar \'\'delivered\'\' diye yazılmak zorunda kalmaz.'),
  mc('BEFORE UPDATE satır trigger\'ında <code>NEW.updated_at := now(); RETURN NEW;</code> yazılmasının sebebi nedir?', ['Değişmiş satırı yazılmak üzere geri vermek', 'Trigger\'ın her ifade için yalnızca bir kez çalışmasını garanti etmek', 'Eski satırı geçmiş tablosuna kopyalayıp günlüğe yazmak', 'İşlemi trigger biter bitmez hemen onaylamak (COMMIT)'], 0, 'BEFORE satır trigger\'ı, yazılacak satırı döndürür. NEW üzerinde yapılan değişiklik tabloya o şekilde yazılır; NULL dönülürse o satırın işlemi sessizce atlanır.'),
  sq('<code>musteri_ciro</code> fonksiyonunun gövdesindeki sorguyu 1–5 numaralı müşteriler için tek sorguda yaz: teslim edilmiş siparişlerin net cirosu, hiç yoksa 0 (<code>COALESCE</code>, 2 basamak): <code>customer_id</code>, <code>ciro</code>. Müşteriye göre sırala.',
    "SELECT c.customer_id, ROUND(COALESCE(SUM(oi.quantity * oi.unit_price * (1 - oi.discount)), 0)::numeric, 2) AS ciro\nFROM customers c\nLEFT JOIN orders o ON o.customer_id = c.customer_id AND o.status = 'delivered'\nLEFT JOIN order_items oi ON oi.order_id = o.order_id\nWHERE c.customer_id <= 5\nGROUP BY c.customer_id\nORDER BY c.customer_id;",
    PG(O)),
  sq('Fonksiyon yazmadan satır üret: <code>generate_series(1, 12)</code> ile 2024\'ün ay numaralarını üret ve her ayda verilen sipariş sayısını (yoksa 0) getir: <code>ay</code>, <code>siparis</code>.',
    "SELECT g.ay, COUNT(o.order_id) AS siparis\nFROM generate_series(1, 12) AS g(ay)\nLEFT JOIN orders o ON EXTRACT(MONTH FROM o.order_date) = g.ay AND EXTRACT(YEAR FROM o.order_date) = 2024\nGROUP BY g.ay\nORDER BY g.ay;",
    PG(O))
]);

const EMB = "WITH emb AS (\n  SELECT 1 AS product_id, 0.90 AS x, 0.10 AS y, 0.05 AS z UNION ALL\n  SELECT 3, 0.80, 0.20, 0.10 UNION ALL\n  SELECT 9, 0.05, 0.90, 0.20 UNION ALL\n  SELECT 28, 0.10, 0.20, 0.95 UNION ALL\n  SELECT 6, 0.70, 0.35, 0.15\n)\n";
X('ai-vektor', [
  sq('Öklid (L2) mesafesi: başlangıç kodundaki <code>emb</code> tablosunda 1 numaralı ürüne <b>en yakın</b> 2 ürünü <code>SQRT((a.x-b.x)² + …)</code> mesafesiyle bul (küçük mesafe = daha benzer): <code>product_id</code>, <code>mesafe</code> (3 basamak). Mesafeye göre artan.',
    EMB + "SELECT b.product_id, ROUND(SQRT((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y) + (a.z - b.z) * (a.z - b.z)), 3) AS mesafe\nFROM emb a JOIN emb b ON b.product_id <> a.product_id\nWHERE a.product_id = 1\nORDER BY mesafe, b.product_id LIMIT 2;",
    { ord: true, start: EMB + 'SELECT ...' }),
  sq('Vektörü normalleştir: <code>emb</code> tablosundaki her vektörü kendi uzunluğuna bölerek birim vektöre çevir (normalleşmiş vektörlerde kosinüs benzerliği düz iç çarpıma eşittir): <code>product_id</code>, <code>nx</code>, <code>ny</code>, <code>nz</code> (3 basamak). Ürüne göre sırala.',
    EMB + "SELECT product_id, ROUND(x / SQRT(x * x + y * y + z * z), 3) AS nx, ROUND(y / SQRT(x * x + y * y + z * z), 3) AS ny, ROUND(z / SQRT(x * x + y * y + z * z), 3) AS nz\nFROM emb ORDER BY product_id;",
    { ord: true, start: EMB + 'SELECT ...' }),
  sq('RAG için eşikli arama: soru vektörü (0.85, 0.15, 0.10). <code>emb</code> tablosunda kosinüs benzerliği <b>0,95 ve üzeri</b> olan ürünleri benzerliğe göre azalan getir: <code>product_id</code>, <code>benzerlik</code> (3 basamak). Eşik, modele alakasız bağlam gitmesini engeller.',
    EMB + ", q AS (SELECT 0.85 AS x, 0.15 AS y, 0.10 AS z)\nSELECT e.product_id, ROUND((e.x * q.x + e.y * q.y + e.z * q.z) / (SQRT(e.x * e.x + e.y * e.y + e.z * e.z) * SQRT(q.x * q.x + q.y * q.y + q.z * q.z)), 3) AS benzerlik\nFROM emb e CROSS JOIN q\nWHERE (e.x * q.x + e.y * q.y + e.z * q.z) / (SQRT(e.x * e.x + e.y * e.y + e.z * e.z) * SQRT(q.x * q.x + q.y * q.y + q.z * q.z)) >= 0.95\nORDER BY benzerlik DESC, e.product_id;",
    { ord: true, start: EMB + 'SELECT ...' })
]);

const TAH = "WITH tahmin AS (\n  SELECT 1 AS musteri, 1 AS gercek, 1 AS tahmin UNION ALL SELECT 2, 1, 0 UNION ALL SELECT 3, 0, 0 UNION ALL\n  SELECT 4, 0, 1 UNION ALL SELECT 5, 1, 1 UNION ALL SELECT 6, 0, 0 UNION ALL SELECT 7, 0, 0 UNION ALL\n  SELECT 8, 1, 1 UNION ALL SELECT 9, 0, 0 UNION ALL SELECT 10, 0, 1\n)\n";
X('ai-ml', [
  sq('Eğitim/test ayrımı: modeli değerlendirmek için müşterileri tekrarlanabilir biçimde ayır; <code>customer_id</code> 5\'e tam bölünüyorsa <b>test</b>, değilse <b>egitim</b>. Her bölümdeki müşteri sayısı: <code>bolum</code>, <code>musteri</code>.',
    "SELECT CASE WHEN customer_id % 5 = 0 THEN 'test' ELSE 'egitim' END AS bolum, COUNT(*) AS musteri\nFROM customers\nGROUP BY CASE WHEN customer_id % 5 = 0 THEN 'test' ELSE 'egitim' END;",
    { why: 'Rastgele fonksiyonla ayırmak her çalıştırmada farklı küme verir; kimliğe dayalı kural aynı müşteriyi hep aynı tarafa koyar.' }),
  sq('ML.EVALUATE\'in hesapladığını kendin hesapla: başlangıç kodundaki <code>tahmin</code> tablosunda gerçek ve tahmin edilen kayıp etiketi var. Doğruluk (doğru tahmin / tüm), kesinlik (gerçek 1 ve tahmin 1 / tahmin 1) ve duyarlılık (gerçek 1 ve tahmin 1 / gerçek 1), 2 basamak: <code>dogruluk</code>, <code>kesinlik</code>, <code>duyarlilik</code>.',
    TAH + "SELECT ROUND(1.0 * SUM(CASE WHEN gercek = tahmin THEN 1 ELSE 0 END) / COUNT(*), 2) AS dogruluk,\n       ROUND(1.0 * SUM(CASE WHEN gercek = 1 AND tahmin = 1 THEN 1 ELSE 0 END) / SUM(tahmin), 2) AS kesinlik,\n       ROUND(1.0 * SUM(CASE WHEN gercek = 1 AND tahmin = 1 THEN 1 ELSE 0 END) / SUM(gercek), 2) AS duyarlilik\nFROM tahmin;",
    { start: TAH + 'SELECT ...' }),
  sq('Özellik ölçekleme: banka müşterilerinin <code>risk_score</code> değerini min-max yöntemiyle 0–1 aralığına çevir (<code>(x - min) / (max - min)</code>, pencere fonksiyonuyla). İlk 5 müşteri numarasına göre: <code>customer_id</code>, <code>risk_score</code>, <code>olcekli</code> (3 basamak).',
    "WITH s AS (SELECT customer_id, risk_score, MIN(risk_score) OVER () AS mn, MAX(risk_score) OVER () AS mx FROM bank_customers)\nSELECT customer_id, risk_score, ROUND(1.0 * (risk_score - mn) / (mx - mn), 3) AS olcekli FROM s ORDER BY customer_id LIMIT 5;", O)
]);

const DEG = "WITH degerlendirme AS (\n  SELECT 1 AS soru_id, 'ciro' AS konu, 1250 AS beklenen, 1250 AS uretilen UNION ALL\n  SELECT 2, 'ciro', 980, 1012 UNION ALL\n  SELECT 3, 'musteri', 61, 61 UNION ALL\n  SELECT 4, 'musteri', 18, 18 UNION ALL\n  SELECT 5, 'siparis', 910, 838 UNION ALL\n  SELECT 6, 'siparis', 72, 72\n)\n";
X('ai-guvenli', [
  sq('Semantik katman: asistanın formülü uydurmaması için net tutarı hazır hesaplayan <code>v_satis</code> görünümünü oluştur (<code>order_id</code>, <code>order_date</code>, <code>channel</code>, <code>net_tutar</code>; yalnızca teslim edilmiş siparişlerin satırları). Sonra görünümden kanal başına ciroyu (tam sayı) azalan getir: <code>channel</code>, <code>ciro</code>.',
    "CREATE VIEW v_satis AS\nSELECT o.order_id, o.order_date, o.channel, oi.quantity * oi.unit_price * (1 - oi.discount) AS net_tutar\nFROM orders o JOIN order_items oi ON oi.order_id = o.order_id\nWHERE o.status = 'delivered';\nSELECT channel, ROUND(SUM(net_tutar)) AS ciro FROM v_satis GROUP BY channel ORDER BY ciro DESC;", O),
  sq('Kapsamı veritabanında daralt: İzmir bölge müdürü için yalnızca İzmirli müşterilerin siparişlerini gösteren <code>v_izmir_siparis</code> görünümünü oluştur (<code>order_id</code>, <code>status</code>, <code>channel</code>). Asistan bu görünüme bağlansın; görünümden durum başına sipariş sayısını getir: <code>status</code>, <code>siparis</code>.',
    "CREATE VIEW v_izmir_siparis AS\nSELECT o.order_id, o.status, o.channel FROM orders o JOIN customers c ON c.customer_id = o.customer_id WHERE c.city = 'İzmir';\nSELECT status, COUNT(*) AS siparis FROM v_izmir_siparis GROUP BY status;"),
  sq('Değerlendirme seti: başlangıç kodunda asistana sorulan altı sorunun beklenen ve ürettiği cevaplar var. Konu başına soru sayısı ve doğruluk oranı (yüzde, tam sayı): <code>konu</code>, <code>soru</code>, <code>dogruluk</code>. Konuya göre sırala.',
    DEG + "SELECT konu, COUNT(*) AS soru, ROUND(100.0 * SUM(CASE WHEN beklenen = uretilen THEN 1 ELSE 0 END) / COUNT(*)) AS dogruluk\nFROM degerlendirme GROUP BY konu ORDER BY konu;",
    { ord: true, start: DEG + 'SELECT ...' })
]);

X('bq-maliyet', [
  sq('BigQuery yazımıyla bölümlenmiş ve kümelenmiş tablo: <code>txn_bolumlu</code> tablosunu <code>bank_txns</code>\'ten oluştur; işlem gününe göre bölümle (<code>PARTITION BY DATE(txn_time)</code>), <code>txn_type</code> ile kümele. Sonra bölüm filtresiyle 2024-12-31 gününün kart harcaması toplamını getir (tam sayı): <code>harcama</code>.',
    "CREATE TABLE txn_bolumlu\nPARTITION BY DATE(txn_time)\nCLUSTER BY txn_type\nAS SELECT * FROM bank_txns;\nSELECT ROUND(SUM(-amount)) AS harcama FROM txn_bolumlu\nWHERE txn_time >= '2024-12-31' AND txn_time < '2025-01-01' AND txn_type = 'kart_harcama';",
    BQ()),
  sq('Özet tablo ile tekrar taramayı önle: <code>web_events</code>\'ten gün ve cihaz başına olay sayısını tutan <code>gunluk_cihaz</code> tablosunu oluştur (<code>gun</code>, <code>device</code>, <code>olay</code>). Panolar artık büyük tablo yerine bunu okusun.',
    "CREATE TABLE gunluk_cihaz AS\nSELECT DATE(event_time) AS gun, device, COUNT(*) AS olay FROM web_events GROUP BY DATE(event_time), device;",
    BQ({ check: 'SELECT device, SUM(olay) AS olay FROM gunluk_cihaz GROUP BY device ORDER BY device' })),
  sq('Tek taramada çok ölçü: <code>COUNTIF</code> ve <code>SAFE_DIVIDE</code> ile kanal başına sipariş, iptal ve iptal oranı (yüzde, 1 basamak): <code>channel</code>, <code>siparis</code>, <code>iptal</code>, <code>oran</code>.',
    "SELECT channel, COUNT(*) AS siparis, COUNTIF(status = 'cancelled') AS iptal, ROUND(100 * SAFE_DIVIDE(COUNTIF(status = 'cancelled'), COUNT(*)), 1) AS oran\nFROM orders GROUP BY channel;",
    BQ())
]);

X('dwh-bulut', [
  sq('Madalyon katmanları: bronze = <code>raw_signups</code>. Silver CTE\'de kayıtları tekilleştir (<code>id</code> başına bir satır) ve şehri temizle (<code>TRIM</code> + <code>UPPER</code>; boş şehir NULL kalsın). Gold katmanında temiz şehir başına kayıt sayısı: <code>sehir</code>, <code>kayit</code>. Kayda göre azalan.',
    "WITH silver AS (\n  SELECT id, MAX(UPPER(TRIM(city))) AS sehir FROM raw_signups GROUP BY id\n)\nSELECT sehir, COUNT(*) AS kayit FROM silver WHERE sehir IS NOT NULL GROUP BY sehir ORDER BY kayit DESC, sehir;",
    { ord: true, dl: ['sqlite'], hint: 'Türkçe İ/ı harflerinde UPPER davranışı programdan programa değişir; bu yüzden alıştırma SQLite içindir.' }),
  sq('Klon taklidi: test için <code>orders_test</code> adında <code>orders</code> kopyası oluştur ve yalnızca kopyadan iptal edilen siparişleri sil. Asıl tablonun etkilenmediğini doğrula.',
    "CREATE TABLE orders_test AS SELECT * FROM orders;\nDELETE FROM orders_test WHERE status = 'cancelled';",
    { dl: ['sqlite', 'pg', 'mysql', 'oracle', 'bq'], check: 'SELECT (SELECT COUNT(*) FROM orders) AS asil, (SELECT COUNT(*) FROM orders_test) AS test' }),
  sq('BigQuery\'de <code>QUALIFY</code>: her şehirde en erken kaydolan müşteriyi CTE yazmadan getir (eşitlikte numara): <code>city</code>, <code>customer_id</code>, <code>signup_date</code>. Şehre göre sırala.',
    "SELECT city, customer_id, signup_date FROM customers\nWHERE city IS NOT NULL\nQUALIFY ROW_NUMBER() OVER (PARTITION BY city ORDER BY signup_date, customer_id) = 1\nORDER BY city;",
    BQ(O))
]);

X('z071-donusum', [
  sq('<code>TO_CHAR(order_date, \'DY\')</code> ile haftanın günü kısa adına göre sipariş sayısı; en çok siparişten aza, eşitlikte gün adı: <code>gun</code>, <code>siparis</code>.',
    "SELECT TO_CHAR(order_date, 'DY') AS gun, COUNT(*) AS siparis FROM orders GROUP BY TO_CHAR(order_date, 'DY') ORDER BY siparis DESC, gun;",
    OR(O)),
  sq('Saatli <code>TO_DATE</code>: <code>\'2024-11-28 12:00\'</code> metnini <code>\'YYYY-MM-DD HH24:MI\'</code> biçimiyle tarihe çevir ve o andan sonra (dahil) gerçekleşen web olaylarını türe göre say: <code>event_type</code>, <code>olay</code>.',
    "SELECT event_type, COUNT(*) AS olay FROM web_events WHERE event_time >= TO_DATE('2024-11-28 12:00', 'YYYY-MM-DD HH24:MI') GROUP BY event_type;",
    OR()),
  sq('Ay numarası ve kısa ay adı: 2024 siparişlerini <code>TO_CHAR(order_date, \'MM\')</code> ve <code>TO_CHAR(order_date, \'MON\')</code> ile grupla; ay numarasına göre sırala: <code>ay_no</code>, <code>ay</code>, <code>siparis</code>.',
    "SELECT TO_CHAR(order_date, 'MM') AS ay_no, TO_CHAR(order_date, 'MON') AS ay, COUNT(*) AS siparis FROM orders WHERE order_date >= DATE '2024-01-01' AND order_date < DATE '2025-01-01' GROUP BY TO_CHAR(order_date, 'MM'), TO_CHAR(order_date, 'MON') ORDER BY ay_no;",
    OR(O))
]);

X('z071-dml-tcl', [
  sq('Oracle\'da SAVEPOINT: <code>deneme</code> tablosunu oluştur (<code>id NUMBER</code>). Sırasıyla 1 ekle, <code>SAVEPOINT a</code>, 2 ekle, <code>SAVEPOINT b</code>, 3 ekle, <code>ROLLBACK TO SAVEPOINT b</code>, <code>COMMIT</code>. Tabloda hangi satırlar kaldı?',
    "CREATE TABLE deneme (id NUMBER);\nINSERT INTO deneme VALUES (1);\nSAVEPOINT a;\nINSERT INTO deneme VALUES (2);\nSAVEPOINT b;\nINSERT INTO deneme VALUES (3);\nROLLBACK TO SAVEPOINT b;\nCOMMIT;",
    OR({ check: 'SELECT id FROM deneme ORDER BY id' })),
  sq('Alt sorgudan ekleme: <code>urun_arsiv</code> tablosunu <code>products</code>\'tan yalnızca yapı olarak oluştur (<code>product_id</code>, <code>name</code>, <code>price</code>; <code>WHERE 1 = 0</code>). Sonra <code>VALUES</code> yazmadan, stoğu 10\'un altındaki ürünleri bu tabloya ekle.',
    "CREATE TABLE urun_arsiv AS SELECT product_id, name, price FROM products WHERE 1 = 0;\nINSERT INTO urun_arsiv (product_id, name, price) SELECT product_id, name, price FROM products WHERE stock < 10;",
    OR({ check: 'SELECT product_id, name, price FROM urun_arsiv ORDER BY product_id' })),
  sq('İlişkili alt sorguyla güncelleme: maaşı kendi departmanının ortalamasının altında kalan çalışanların maaşını departman ortalamasına (tam sayıya yuvarlanmış) yükselt.',
    "UPDATE employees SET salary = (SELECT ROUND(AVG(x.salary)) FROM employees x WHERE x.dept_id = employees.dept_id)\nWHERE salary < (SELECT AVG(x.salary) FROM employees x WHERE x.dept_id = employees.dept_id);",
    OR({ check: 'SELECT emp_id, salary FROM employees ORDER BY emp_id' })),
  sq('Alt sorguyla silme: 2023\'te verilip iptal edilen siparişlerin satırlarını <code>order_items</code>\'tan sil.',
    "DELETE FROM order_items WHERE order_id IN (SELECT order_id FROM orders WHERE status = 'cancelled' AND order_date < DATE '2024-01-01');",
    OR({ check: 'SELECT COUNT(*) AS kalan FROM order_items' }))
]);

X('z071-ddl', [
  sq('Kısıtlı tablo: <code>kampanya</code> tablosunu oluştur: <code>kampanya_id NUMBER(6)</code> (adlandırılmış birincil anahtar <code>pk_kampanya</code>), <code>kod VARCHAR2(20)</code> (boş olamaz, tekil), <code>indirim NUMBER(3,2)</code> (0 ile 0.5 arası, <code>ck_indirim</code>), <code>urun_id NUMBER(6)</code> (<code>products</code>\'a yabancı anahtar). Sonra iki satır ekle: (1, YILBASI, 0.25, 5), (2, KITAP10, 0.10, 9).',
    "CREATE TABLE kampanya (\n  kampanya_id NUMBER(6) CONSTRAINT pk_kampanya PRIMARY KEY,\n  kod VARCHAR2(20) NOT NULL UNIQUE,\n  indirim NUMBER(3,2) CONSTRAINT ck_indirim CHECK (indirim BETWEEN 0 AND 0.5),\n  urun_id NUMBER(6) REFERENCES products (product_id)\n);\nINSERT INTO kampanya VALUES (1, 'YILBASI', 0.25, 5);\nINSERT INTO kampanya VALUES (2, 'KITAP10', 0.10, 9);",
    OR({ check: 'SELECT kampanya_id, kod, indirim, urun_id FROM kampanya ORDER BY kampanya_id' })),
  sq('Yalnızca yapıyı kopyala: <code>kitap_kopya</code> tablosunu <code>products</code>\'tan <code>WHERE 1 = 0</code> ile satırsız oluştur (<code>product_id</code>, <code>name</code>, <code>price</code>), sonra yalnızca Kitap kategorisindeki ürünleri ekle.',
    "CREATE TABLE kitap_kopya AS SELECT product_id, name, price FROM products WHERE 1 = 0;\nINSERT INTO kitap_kopya SELECT product_id, name, price FROM products WHERE category = 'Kitap';",
    OR({ check: 'SELECT product_id, name, price FROM kitap_kopya ORDER BY product_id' })),
  sq('Tabloyu değiştir: <code>tedarikci</code> tablosunu oluştur (<code>tedarikci_id NUMBER(6) PRIMARY KEY</code>, <code>ad VARCHAR2(60)</code>, <code>faks VARCHAR2(20)</code>). Sonra <code>ALTER TABLE</code> ile <code>sehir VARCHAR2(40)</code> sütunu ekle, <code>ad</code> sütununun adını <code>unvan</code> yap ve artık kullanılmayan <code>faks</code> sütununu sil. Son olarak (1, Anadolu Kâğıt, Bursa) satırını ekle.',
    "CREATE TABLE tedarikci (tedarikci_id NUMBER(6) PRIMARY KEY, ad VARCHAR2(60), faks VARCHAR2(20));\nALTER TABLE tedarikci ADD (sehir VARCHAR2(40));\nALTER TABLE tedarikci RENAME COLUMN ad TO unvan;\nALTER TABLE tedarikci DROP COLUMN faks;\nINSERT INTO tedarikci (tedarikci_id, unvan, sehir) VALUES (1, 'Anadolu Kâğıt', 'Bursa');",
    OR({ check: 'SELECT * FROM tedarikci' }))
]);

X('z071-nesneler', [
  sq('Sequence ile anahtar üret: 1000\'den başlayıp birer artan <code>seq_kupon</code> sequence\'ını ve <code>kupon</code> tablosunu (<code>kupon_id NUMBER</code>, <code>kod VARCHAR2(20)</code>) oluştur. <code>INSERT ... VALUES</code> içinde <code>seq_kupon.NEXTVAL</code> kullanarak üç kupon ekle: HOSGELDIN, YAZ25, SADAKAT.',
    "CREATE SEQUENCE seq_kupon START WITH 1000 INCREMENT BY 1;\nCREATE TABLE kupon (kupon_id NUMBER, kod VARCHAR2(20));\nINSERT INTO kupon VALUES (seq_kupon.NEXTVAL, 'HOSGELDIN');\nINSERT INTO kupon VALUES (seq_kupon.NEXTVAL, 'YAZ25');\nINSERT INTO kupon VALUES (seq_kupon.NEXTVAL, 'SADAKAT');",
    OR({ check: 'SELECT kupon_id, kod FROM kupon ORDER BY kupon_id' })),
  sq('Karmaşık görünüm: kategori başına ürün sayısı ve toplam stoğu veren <code>v_kategori_stok</code> görünümünü oluştur (<code>category</code>, <code>urun</code>, <code>stok</code>). (Bu görünüm GROUP BY içerdiği için üzerinden DML yapılamaz.) Görünümden stoğu 500\'den fazla kategorileri getir.',
    "CREATE VIEW v_kategori_stok AS SELECT category, COUNT(*) AS urun, SUM(stock) AS stok FROM products GROUP BY category;\nSELECT category, urun, stok FROM v_kategori_stok WHERE stok > 500;",
    OR()),
  sq('Fonksiyon tabanlı indeks: <code>customers</code> tablosunda <code>UPPER(last_name)</code> üzerine <code>ix_soyad_buyuk</code> indeksini oluştur; ardından aynı ifadeyle soyadı <b>Y</b> ile başlayan müşterileri say: <code>adet</code>.',
    "CREATE INDEX ix_soyad_buyuk ON customers (UPPER(last_name));\nSELECT COUNT(*) AS adet FROM customers WHERE UPPER(last_name) LIKE 'Y%';",
    OR({ why: 'İndeks, sorgudaki ifadeyle birebir aynı ifadeye (UPPER(last_name)) kurulduğunda kullanılabilir.' }))
]);

X('oracle-1z0', [
  sq('Veri sözlüğü: <code>USER_TABLES</code> görünümünden adı <b>LK_</b> ile başlayan (Lezzet Kurye) tabloları listele: <code>table_name</code>. Ada göre sırala.',
    "SELECT table_name FROM user_tables WHERE table_name LIKE 'LK%' ORDER BY table_name;",
    OR(O)),
  sq('<code>USER_TAB_COLUMNS</code> ile <code>HV_FLIGHTS</code> tablosundaki <b>NUMBER</b> tipli sütunları getir: <code>column_name</code>. Sütun adına göre sırala.',
    "SELECT column_name FROM user_tab_columns WHERE table_name = 'HV_FLIGHTS' AND data_type = 'NUMBER' ORDER BY column_name;",
    OR(O)),
  sq('MERGE ile fiyat güncellemesi: <code>price_updates</code> tablosunda her ürünün <b>en son</b> fiyatını kaynak olarak al ve <code>products</code> fiyatını <code>MERGE INTO ... WHEN MATCHED THEN UPDATE</code> ile güncelle.',
    "MERGE INTO products p\nUSING (SELECT u.product_id, u.new_price FROM price_updates u WHERE u.updated_at = (SELECT MAX(x.updated_at) FROM price_updates x WHERE x.product_id = u.product_id)) s\nON (p.product_id = s.product_id)\nWHEN MATCHED THEN UPDATE SET p.price = s.new_price;",
    OR({ check: 'SELECT product_id, price FROM products WHERE product_id IN (SELECT product_id FROM price_updates) ORDER BY product_id' }))
]);

X('cert-gda', [
  sq('BigQuery ile temizleme: <code>raw_signups</code>\'ta küçük harfe çevrilip kırpılmış e-postaya göre birden fazla kez geçen kayıtları bul: <code>email</code>, <code>adet</code>. E-postaya göre sırala.',
    "SELECT LOWER(TRIM(email)) AS email, COUNT(*) AS adet FROM raw_signups WHERE email IS NOT NULL GROUP BY LOWER(TRIM(email)) HAVING COUNT(*) > 1 ORDER BY email;",
    BQ(O)),
  sq('<code>SAFE_CAST</code> ile tip kontrolü: <code>signup_date</code> metninin kaçı tarihe çevrilemiyor (ör. <code>29.07.2024</code> biçimi)? <code>hatali</code>, <code>toplam</code>.',
    "SELECT COUNTIF(SAFE_CAST(signup_date AS DATE) IS NULL) AS hatali, COUNT(*) AS toplam FROM raw_signups;",
    BQ()),
  sq('Analiz et: kanal başına müşteri başına ortalama sipariş sayısı (<code>SAFE_DIVIDE</code>, 2 basamak): <code>channel</code>, <code>musteri</code>, <code>siparis</code>, <code>musteri_basina</code>. Kanala göre sırala.',
    "SELECT channel, COUNT(DISTINCT customer_id) AS musteri, COUNT(*) AS siparis, ROUND(SAFE_DIVIDE(COUNT(*), COUNT(DISTINCT customer_id)), 2) AS musteri_basina FROM orders GROUP BY channel ORDER BY channel;",
    BQ(O))
]);

X('cert-tsql', [
  sq('Sayfalama: ürünleri fiyata göre azalan (eşitlikte numara) sırala ve 5\'erli sayfalardan <b>2. sayfayı</b> <code>OFFSET ... FETCH</code> ile getir: <code>product_id</code>, <code>name</code>, <code>price</code>.',
    "SELECT product_id, name, price FROM dbo.products ORDER BY price DESC, product_id OFFSET 5 ROWS FETCH NEXT 5 ROWS ONLY;",
    TS(O)),
  sq('<code>CROSS APPLY</code> ile her kategorinin en pahalı ürünü: kategoriler için alt sorguda <code>TOP (1)</code> kullan (eşitlikte numara): <code>category</code>, <code>name</code>, <code>price</code>. Kategoriye göre sırala.',
    "SELECT k.category, x.name, x.price\nFROM (SELECT DISTINCT category FROM dbo.products) k\nCROSS APPLY (SELECT TOP (1) p.name, p.price FROM dbo.products p WHERE p.category = k.category ORDER BY p.price DESC, p.product_id) x\nORDER BY k.category;",
    TS(O)),
  sq('<code>ROLLUP</code> ve <code>GROUPING</code>: kategori başına ürün sayısı ve en altta genel toplam; toplam satırında kategori yerine <b>TOPLAM</b> yazsın: <code>kategori</code>, <code>urun</code>.',
    "SELECT CASE WHEN GROUPING(category) = 1 THEN N'TOPLAM' ELSE category END AS kategori, COUNT(*) AS urun\nFROM dbo.products\nGROUP BY ROLLUP (category);",
    TS()),
  sq('Hata yönetimi: <code>BEGIN TRY</code> içinde sıfıra bölme yap; <code>CATCH</code> bloğunda hata numarasını ve mesajını döndür: <code>no</code>, <code>mesaj</code>.',
    "BEGIN TRY\n  SELECT 1 / 0 AS sonuc;\nEND TRY\nBEGIN CATCH\n  SELECT ERROR_NUMBER() AS no, ERROR_MESSAGE() AS mesaj;\nEND CATCH;",
    TS())
]);

X('lehceler', [
  sq('SQL Server lehçesiyle: <code>TOP</code> ve <code>ISNULL</code> kullanarak en yeni kaydolan 3 müşteriyi getir; şehir yoksa <b>Bilinmiyor</b> yazsın (eşitlikte numara): <code>customer_id</code>, <code>sehir</code>, <code>signup_date</code>.',
    "SELECT TOP (3) customer_id, ISNULL(city, N'Bilinmiyor') AS sehir, signup_date FROM dbo.customers ORDER BY signup_date DESC, customer_id;",
    TS(O)),
  sq('Oracle lehçesiyle: <code>TRUNC(order_date, \'MM\')</code> ile ay başına göre 2024 son çeyreğinin aylık sipariş sayısı: <code>ay</code>, <code>siparis</code>. Aya göre sırala.',
    "SELECT TRUNC(order_date, 'MM') AS ay, COUNT(*) AS siparis FROM orders WHERE order_date >= DATE '2024-10-01' AND order_date < DATE '2025-01-01' GROUP BY TRUNC(order_date, 'MM') ORDER BY ay;",
    OR(O)),
  sq('PostgreSQL lehçesiyle: <code>DATE_TRUNC</code> ile aynı soru (2024 son çeyreği, aylık sipariş); ayı <code>::date</code> ile tarihe çevir: <code>ay</code>, <code>siparis</code>.',
    "SELECT DATE_TRUNC('month', order_date)::date AS ay, COUNT(*) AS siparis FROM orders WHERE order_date >= '2024-10-01' AND order_date < '2025-01-01' GROUP BY 1 ORDER BY 1;",
    PG(O)),
  sq('BigQuery lehçesiyle: <code>DATE_TRUNC(order_date, MONTH)</code> ile aynı soru: <code>ay</code>, <code>siparis</code>.',
    "SELECT DATE_TRUNC(order_date, MONTH) AS ay, COUNT(*) AS siparis FROM orders WHERE order_date >= '2024-10-01' AND order_date < '2025-01-01' GROUP BY ay ORDER BY ay;",
    BQ(O)),
  sq('MySQL lehçesiyle: <code>DATE_FORMAT(order_date, \'%Y-%m-01\')</code> ile aynı soru: <code>ay</code>, <code>siparis</code>.',
    "SELECT DATE_FORMAT(order_date, '%Y-%m-01') AS ay, COUNT(*) AS siparis FROM orders WHERE order_date >= '2024-10-01' AND order_date < '2025-01-01' GROUP BY DATE_FORMAT(order_date, '%Y-%m-01') ORDER BY ay;",
    { base: 'mysql', dl: ['mysql'], ord: true })
]);

/* ======================= Görev B: alıştırma bankası ======================= */
const PR = window.SQLP_PRACTICE = window.SQLP_PRACTICE || [];
const add = (t) => (id, Lv, d, title, q, sol, o) => PR.push(Object.assign({ id, L: Lv, t, d, title, q: '<p>' + q + '</p>', sol, type: 'sql' }, o || {}));
const cte = add('cte'), rek = add('rek'), kum = add('kum'), ddl = add('ddl'), dml = add('dml'), sec = add('sec'), met = add('met'),
  sir = add('sir'), hes = add('hes'), nul = add('nul'), cas = add('cas'), tem = add('tem'), piv = add('piv'), alt = add('alt');

/* CTE */
cte('n001', 'orta', 1, 'Yoğun kuryeler', 'Lezzet Kurye: CTE ile kurye başına teslim edilen sipariş sayısını hesapla, sonra 130\'dan fazla teslimi olan kuryeleri adlarıyla getir: <code>full_name</code>, <code>teslim</code>. Teslime göre azalan.',
  "WITH t AS (SELECT courier_id, COUNT(*) AS teslim FROM lk_orders WHERE status = 'teslim' GROUP BY courier_id)\nSELECT c.full_name, t.teslim FROM t JOIN lk_couriers c ON c.courier_id = t.courier_id WHERE t.teslim > 130 ORDER BY t.teslim DESC, c.full_name;", O);
cte('n002', 'orta', 2, 'Ortalamanın üstündeki şubeler', 'Ilgaz Bank: şube başına müşteri sayısını CTE\'de hesapla; müşteri sayısı şube ortalamasının üstünde olan şubeleri getir: <code>name</code>, <code>musteri</code>. Müşteriye göre azalan.',
  "WITH s AS (SELECT branch_id, COUNT(*) AS musteri FROM bank_customers GROUP BY branch_id)\nSELECT b.name, s.musteri FROM s JOIN bank_branches b ON b.branch_id = s.branch_id\nWHERE s.musteri > (SELECT AVG(musteri) FROM s)\nORDER BY s.musteri DESC, b.name;", O);
cte('n003', 'orta', 2, 'En boş rotalar', 'Kanat Havayolları: inmiş uçuşlarda doluluğu (yolcu / koltuk, yüzde) uçuş düzeyinde CTE\'de hesapla; rota başına ortalama doluluğu en düşük 5 rota (1 basamak): <code>route_id</code>, <code>doluluk</code>.',
  "WITH u AS (SELECT f.route_id, 100.0 * f.pax / a.seats AS d FROM hv_flights f JOIN hv_aircraft a ON a.tail_no = f.tail_no WHERE f.status = 'landed')\nSELECT route_id, ROUND(AVG(d), 1) AS doluluk FROM u GROUP BY route_id ORDER BY doluluk, route_id LIMIT 5;", O);
cte('n004', 'orta', 3, 'Bölüm devir oranı', 'Pusula İK: iki CTE yaz: (1) bölüm başına 2024 başında aktif kadro (işe giriş 2024 öncesi, ayrılmamış ya da 2024 ve sonrasında ayrılmış), (2) bölüm başına 2024\'te ayrılan sayısı. Birleştirip devir oranını (yüzde, 1 basamak) hesapla; en yüksek 3 bölüm: <code>name</code>, <code>kadro</code>, <code>ayrilan</code>, <code>oran</code>.',
  "WITH k AS (\n  SELECT p.dept_id, COUNT(*) AS kadro FROM ik_employees e JOIN ik_positions p ON p.position_id = e.position_id\n  WHERE e.hire_date < '2024-01-01' AND (e.term_date IS NULL OR e.term_date >= '2024-01-01') GROUP BY p.dept_id\n), a AS (\n  SELECT p.dept_id, COUNT(*) AS ayrilan FROM ik_employees e JOIN ik_positions p ON p.position_id = e.position_id\n  WHERE e.term_date >= '2024-01-01' AND e.term_date < '2025-01-01' GROUP BY p.dept_id\n)\nSELECT d.name, k.kadro, COALESCE(a.ayrilan, 0) AS ayrilan, ROUND(100.0 * COALESCE(a.ayrilan, 0) / k.kadro, 1) AS oran\nFROM k JOIN ik_departments d ON d.dept_id = k.dept_id LEFT JOIN a ON a.dept_id = k.dept_id\nORDER BY oran DESC, d.name LIMIT 3;", O);
cte('n005', 'ileri', 3, 'İstasyon net akışı', 'Pedal İzmir: iki CTE ile istasyon başına başlayan ve biten yolculuk sayısını hesapla; net akışı (biten − başlayan) en negatif 5 istasyon (bisiklet kaybeden istasyonlar): <code>name</code>, <code>net</code>.',
  "WITH b AS (SELECT start_station AS st, COUNT(*) AS n FROM bk_trips GROUP BY start_station),\ns AS (SELECT end_station AS st, COUNT(*) AS n FROM bk_trips WHERE end_station IS NOT NULL GROUP BY end_station)\nSELECT x.name, COALESCE(s.n, 0) - b.n AS net\nFROM b JOIN bk_stations x ON x.station_id = b.st LEFT JOIN s ON s.st = b.st\nORDER BY net, x.name LIMIT 5;", O);
cte('n006', 'orta', 2, 'İlk siparişin kanalı', 'Anadolu Market: CTE\'de her müşterinin ilk siparişini bul (en erken tarih, eşitlikte küçük numara; ROW_NUMBER). İlk siparişi 2024\'te olan müşterilerin ilk siparişlerinin kanala göre dağılımı: <code>channel</code>, <code>yeni_musteri</code>.',
  "WITH r AS (SELECT customer_id, order_date, channel, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date, order_id) AS rn FROM orders)\nSELECT channel, COUNT(*) AS yeni_musteri FROM r WHERE rn = 1 AND order_date >= '2024-01-01' GROUP BY channel;");
cte('n007', 'ileri', 3, 'Restoranın en iyi ayı', 'Lezzet Kurye: CTE\'de restoran × ay teslim sayısını hesapla, ikinci CTE\'de her restoranın en çok teslim yaptığı ayı seç (eşitlikte erken ay). İlk 5 restoran adına göre: <code>name</code>, <code>ay</code>, <code>teslim</code>.',
  "WITH a AS (SELECT restaurant_id, strftime('%Y-%m', placed_at) AS ay, COUNT(*) AS teslim FROM lk_orders WHERE status = 'teslim' GROUP BY restaurant_id, strftime('%Y-%m', placed_at)),\nr AS (SELECT restaurant_id, ay, teslim, ROW_NUMBER() OVER (PARTITION BY restaurant_id ORDER BY teslim DESC, ay) AS rn FROM a)\nSELECT x.name, r.ay, r.teslim FROM r JOIN lk_restaurants x ON x.restaurant_id = r.restaurant_id WHERE r.rn = 1 ORDER BY x.name LIMIT 5;", O);

/* Özyinelemeli */
rek('n011', 'ileri', 1, 'Haftalık takvim', 'Özyinelemeli CTE ile 2024-12-01\'den 2024-12-07\'ye günleri üret ve Lezzet Kurye\'de her gün verilen sipariş sayısını getir: <code>gun</code>, <code>siparis</code>.',
  "WITH RECURSIVE g(gun) AS (SELECT '2024-12-01' UNION ALL SELECT date(gun, '+1 day') FROM g WHERE gun < '2024-12-07')\nSELECT g.gun, COUNT(o.order_id) AS siparis FROM g LEFT JOIN lk_orders o ON date(o.placed_at) = g.gun GROUP BY g.gun ORDER BY g.gun;", O);
rek('n012', 'ileri', 2, 'Bölüm ağacı', 'Pusula İK: <code>ik_departments.parent_id</code> ile bölüm hiyerarşisini özyinelemeli gez; her bölümün Genel Müdürlük\'e uzaklığı (kök = 0): <code>name</code>, <code>duzey</code>. Düzeye, sonra ada göre.',
  "WITH RECURSIVE h(dept_id, name, duzey) AS (\n  SELECT dept_id, name, 0 FROM ik_departments WHERE parent_id IS NULL\n  UNION ALL\n  SELECT d.dept_id, d.name, h.duzey + 1 FROM ik_departments d JOIN h ON d.parent_id = h.dept_id\n)\nSELECT name, duzey FROM h ORDER BY duzey, name;", O);
rek('n013', 'ileri', 2, 'Davet ağı', 'Lezzet Kurye: 214 numaralı müşterinin doğrudan ya da dolaylı (davet ettiğinin davet ettiği …) getirdiği müşteri sayısı: <code>getirilen</code>.',
  "WITH RECURSIVE a(customer_id) AS (\n  SELECT customer_id FROM lk_customers WHERE referred_by = 214\n  UNION ALL\n  SELECT c.customer_id FROM lk_customers c JOIN a ON c.referred_by = a.customer_id\n)\nSELECT COUNT(*) AS getirilen FROM a;");
rek('n014', 'ileri', 3, 'Satış örgütünün büyüklüğü', 'Pusula İK: Satış bölümü (dept_id 2) ve altındaki tüm bölümlerde (alt bölümler dahil, özyinelemeli) çalışan aktif kişi sayısı: <code>aktif</code>.',
  "WITH RECURSIVE b(dept_id) AS (SELECT 2 UNION ALL SELECT d.dept_id FROM ik_departments d JOIN b ON d.parent_id = b.dept_id)\nSELECT COUNT(*) AS aktif FROM ik_employees e JOIN ik_positions p ON p.position_id = e.position_id\nWHERE e.term_date IS NULL AND p.dept_id IN (SELECT dept_id FROM b);");
rek('n015', 'ileri', 2, 'Bileşik faiz tablosu', 'Ilgaz Bank: 10.000 TL\'lik mevduat aylık %3 bileşik faizle 12 ay büyüyor. Özyinelemeli CTE ile ay ay bakiyeyi üret (ay 0 = 10.000): <code>ay</code>, <code>bakiye</code> (2 basamak).',
  "WITH RECURSIVE b(ay, bakiye) AS (SELECT 0, 10000.0 UNION ALL SELECT ay + 1, bakiye * 1.03 FROM b WHERE ay < 12)\nSELECT ay, ROUND(bakiye, 2) AS bakiye FROM b ORDER BY ay;", O);
rek('n016', 'ileri', 3, 'Tek aktarmayla ulaşım', 'Kanat Havayolları: IST\'den en fazla iki uçuşla (en çok bir aktarma) ulaşılabilen farklı havalimanı sayısı (IST hariç); rota tablosunu özyinelemeli gez: <code>havalimani</code>.',
  "WITH RECURSIVE y(airport, adim) AS (\n  SELECT 'IST', 0\n  UNION ALL\n  SELECT r.dest, y.adim + 1 FROM hv_routes r JOIN y ON r.origin = y.airport WHERE y.adim < 2\n)\nSELECT COUNT(DISTINCT airport) AS havalimani FROM y WHERE airport <> 'IST';");
rek('n017', 'ileri', 3, 'Mesafe dilimleri', 'Pedal İzmir: özyinelemeli CTE ile 0–9 sayılarını üret; her tam kilometre dilimindeki (FLOOR(distance_km) = n) yolculuk sayısını getir, hiç yolculuk yoksa 0: <code>km</code>, <code>yolculuk</code>.',
  "WITH RECURSIVE s(n) AS (SELECT 0 UNION ALL SELECT n + 1 FROM s WHERE n < 9),\nt AS (SELECT FLOOR(distance_km) AS km, COUNT(*) AS c FROM bk_trips GROUP BY FLOOR(distance_km))\nSELECT s.n AS km, COALESCE(t.c, 0) AS yolculuk FROM s LEFT JOIN t ON t.km = s.n ORDER BY s.n;", O);

/* Küme işlemleri */
kum('n021', 'orta', 1, 'Vadesiz ve kart', 'Ilgaz Bank: hem vadesiz hesabı hem kredi kartı olan müşteri sayısı (<code>INTERSECT</code>): <code>musteri</code>.',
  "SELECT COUNT(*) AS musteri FROM (SELECT customer_id FROM bank_accounts WHERE account_type = 'vadesiz' INTERSECT SELECT customer_id FROM bank_accounts WHERE account_type = 'kredi_karti') t;");
kum('n022', 'orta', 2, 'Gecikmesiz uçuşlar', 'Kanat Havayolları: hiç gecikme kaydı olmayan inmiş uçuş sayısı (<code>EXCEPT</code>): <code>ucus</code>.',
  "SELECT COUNT(*) AS ucus FROM (SELECT flight_id FROM hv_flights WHERE status = 'landed' EXCEPT SELECT flight_id FROM hv_delays) t;");
kum('n023', 'orta', 2, 'Eğitimli yıldızlar', 'Pusula İK: hem 2024\'te eğitim tamamlamış hem de 2024 performans puanı 5 olan aktif çalışan sayısı: <code>kisi</code>.',
  "SELECT COUNT(*) AS kisi FROM (\n  SELECT emp_id FROM ik_training WHERE completed_date >= '2024-01-01' AND completed_date < '2025-01-01'\n  INTERSECT SELECT emp_id FROM ik_reviews WHERE review_year = 2024 AND rating = 5\n  INTERSECT SELECT emp_id FROM ik_employees WHERE term_date IS NULL\n) t;");
kum('n024', 'orta', 2, 'İzmir rehberi', 'Lezzet Kurye: İzmir\'deki kuryeleri ve müşterileri tek listede topla (<code>UNION ALL</code>); <code>tur</code> sütunu kurye/müşteri olsun. Ada göre ilk 6: <code>tur</code>, <code>full_name</code>.',
  "SELECT 'kurye' AS tur, full_name FROM lk_couriers WHERE city = 'İzmir'\nUNION ALL\nSELECT 'müşteri', full_name FROM lk_customers WHERE city = 'İzmir'\nORDER BY full_name, tur LIMIT 6;", O);
kum('n025', 'orta', 3, 'Arızalı ama aktif', 'Pedal İzmir: Ağustos 2024\'te hem bakıma girmiş (bakım kaydı açılmış) hem de aynı ay en az bir yolculuk yapmış bisiklet sayısı: <code>bisiklet</code>.',
  "SELECT COUNT(*) AS bisiklet FROM (\n  SELECT bike_id FROM bk_maintenance WHERE opened_at >= '2024-08-01' AND opened_at < '2024-09-01'\n  INTERSECT\n  SELECT bike_id FROM bk_trips WHERE started_at >= '2024-08-01' AND started_at < '2024-09-01'\n) t;");
kum('n026', 'orta', 2, 'UNION mı UNION ALL mı', 'Anadolu Market: 2023 ve 2024\'te sipariş veren müşteri listelerini birleştir. <code>UNION</code> ile tekil müşteri sayısını ve <code>UNION ALL</code> ile toplam satır sayısını tek satırda getir: <code>tekil</code>, <code>toplam</code>.',
  "SELECT (SELECT COUNT(*) FROM (SELECT DISTINCT customer_id FROM orders WHERE order_date >= '2023-01-01' AND order_date < '2024-01-01' UNION SELECT DISTINCT customer_id FROM orders WHERE order_date >= '2024-01-01' AND order_date < '2025-01-01') a) AS tekil,\n       (SELECT COUNT(*) FROM (SELECT DISTINCT customer_id FROM orders WHERE order_date >= '2023-01-01' AND order_date < '2024-01-01' UNION ALL SELECT DISTINCT customer_id FROM orders WHERE order_date >= '2024-01-01' AND order_date < '2025-01-01') b) AS toplam;");
kum('n027', 'ileri', 3, 'Simetrik fark', 'Ilgaz Bank: Kasım 2024\'te işlem yapıp Aralık\'ta yapmayan hesap sayısı ile Aralık\'ta yapıp Kasım\'da yapmayan hesap sayısı: <code>sadece_kasim</code>, <code>sadece_aralik</code>.',
  "SELECT (SELECT COUNT(*) FROM (SELECT account_id FROM bank_txns WHERE txn_time >= '2024-11-01' AND txn_time < '2024-12-01' EXCEPT SELECT account_id FROM bank_txns WHERE txn_time >= '2024-12-01' AND txn_time < '2025-01-01') a) AS sadece_kasim,\n       (SELECT COUNT(*) FROM (SELECT account_id FROM bank_txns WHERE txn_time >= '2024-12-01' AND txn_time < '2025-01-01' EXCEPT SELECT account_id FROM bank_txns WHERE txn_time >= '2024-11-01' AND txn_time < '2024-12-01') b) AS sadece_aralik;");

/* Tablo tasarımı */
ddl('n031', 'ileri', 1, 'Kapı tablosu', 'Kanat Havayolları için <code>hv_gates</code> tablosu oluştur: <code>gate_id</code> (birincil anahtar), <code>airport_code</code> (boş olamaz), <code>terminal</code>. Üç kapı ekle: (1, IST, A), (2, IST, B), (3, ESB, 1).',
  "CREATE TABLE hv_gates (gate_id INTEGER PRIMARY KEY, airport_code TEXT NOT NULL, terminal TEXT);\nINSERT INTO hv_gates VALUES (1, 'IST', 'A'), (2, 'IST', 'B'), (3, 'ESB', '1');",
  { check: 'SELECT gate_id, airport_code, terminal FROM hv_gates ORDER BY gate_id' });
ddl('n032', 'ileri', 2, 'Eğitim planı', 'Pusula İK için <code>ik_egitim_plan</code> tablosu: <code>plan_id</code> (birincil anahtar), <code>course</code> (boş olamaz), <code>kontenjan</code> (0\'dan büyük olmalı, CHECK), <code>baslangic</code> (tarih). İki plan ekle: (1, SQL Temelleri, 20, 2025-02-03), (2, Liderlik, 12, 2025-03-10).',
  "CREATE TABLE ik_egitim_plan (plan_id INTEGER PRIMARY KEY, course TEXT NOT NULL, kontenjan INTEGER CHECK (kontenjan > 0), baslangic DATE);\nINSERT INTO ik_egitim_plan VALUES (1, 'SQL Temelleri', 20, '2025-02-03'), (2, 'Liderlik', 12, '2025-03-10');",
  { dl: ['sqlite', 'tsql', 'pg', 'mysql', 'oracle'], check: 'SELECT plan_id, course, kontenjan FROM ik_egitim_plan ORDER BY plan_id' });
ddl('n033', 'ileri', 2, 'Minimum sepet', 'Lezzet Kurye: restoranlara <code>min_tutar</code> (tam sayı) sütunu ekle; pizza restoranları için 150, diğerleri için 100 olarak doldur.',
  "ALTER TABLE lk_restaurants ADD COLUMN min_tutar INTEGER;\nUPDATE lk_restaurants SET min_tutar = CASE WHEN cuisine = 'Pizza' THEN 150 ELSE 100 END;",
  { check: 'SELECT min_tutar, COUNT(*) AS restoran FROM lk_restaurants GROUP BY min_tutar ORDER BY min_tutar' });
ddl('n034', 'ileri', 3, 'Hesap limitleri', 'Ilgaz Bank: <code>bank_limits</code> tablosu oluştur: <code>limit_id</code> (birincil anahtar), <code>account_id</code> (<code>bank_accounts</code>\'a yabancı anahtar, her hesap için en fazla bir satır: UNIQUE), <code>gunluk_limit</code> (boş olamaz). İki satır ekle: (1, 100001, 50000), (2, 100002, 25000).',
  "CREATE TABLE bank_limits (limit_id INTEGER PRIMARY KEY, account_id INTEGER UNIQUE REFERENCES bank_accounts(account_id), gunluk_limit INTEGER NOT NULL);\nINSERT INTO bank_limits VALUES (1, 100001, 50000), (2, 100002, 25000);",
  { dl: ['sqlite', 'tsql', 'pg', 'mysql', 'oracle'], check: 'SELECT limit_id, account_id, gunluk_limit FROM bank_limits ORDER BY limit_id' });
ddl('n035', 'ileri', 2, 'İstasyon zaman indeksi', 'Pedal İzmir: <code>bk_trips</code> üzerinde <code>(start_station, started_at)</code> sütunlarına <code>ix_trip_st_zaman</code> indeksini oluştur; sonra 1 numaralı istasyondan Ağustos 2024\'te başlayan yolculuk sayısını getir: <code>yolculuk</code>.',
  "CREATE INDEX ix_trip_st_zaman ON bk_trips (start_station, started_at);\nSELECT COUNT(*) AS yolculuk FROM bk_trips WHERE start_station = 1 AND started_at >= '2024-08-01' AND started_at < '2024-09-01';",
  { dl: ['sqlite', 'tsql', 'pg', 'mysql', 'oracle'] });
ddl('n036', 'ileri', 3, 'Müşteri özeti görünümü', 'Anadolu Market: müşteri başına sipariş sayısı ve son sipariş tarihini veren <code>v_musteri_ozet</code> görünümünü oluştur (<code>customer_id</code>, <code>siparis</code>, <code>son_siparis</code>).',
  "CREATE VIEW v_musteri_ozet AS SELECT customer_id, COUNT(*) AS siparis, MAX(order_date) AS son_siparis FROM orders GROUP BY customer_id;",
  { check: 'SELECT customer_id, siparis, son_siparis FROM v_musteri_ozet ORDER BY customer_id LIMIT 5' });
ddl('n037', 'ileri', 2, 'İptal arşivi', 'Kanat Havayolları: iptal edilmiş uçuşların <code>flight_id</code>, <code>flight_no</code>, <code>sched_dep</code> sütunlarından oluşan <code>hv_iptal_arsiv</code> tablosunu sorgudan oluştur (CREATE TABLE … AS SELECT).',
  "CREATE TABLE hv_iptal_arsiv AS SELECT flight_id, flight_no, sched_dep FROM hv_flights WHERE status = 'cancelled';",
  { dl: ['sqlite', 'pg', 'mysql', 'oracle', 'bq'], check: 'SELECT COUNT(*) AS ucus, MIN(flight_id) AS ilk, MAX(flight_id) AS son FROM hv_iptal_arsiv' });

/* Veri değiştirme */
dml('n041', 'ileri', 1, 'Yeni kurye', 'Lezzet Kurye: 61 numaralı yeni kuryeyi ekle: Deniz Aksoy, İzmir, motosiklet, işe giriş 2025-01-02, puan henüz yok (NULL).',
  "INSERT INTO lk_couriers (courier_id, full_name, city, vehicle, hired_date, rating) VALUES (61, 'Deniz Aksoy', 'İzmir', 'motosiklet', '2025-01-02', NULL);",
  { check: 'SELECT courier_id, full_name, city, vehicle, rating FROM lk_couriers WHERE courier_id = 61' });
dml('n042', 'ileri', 2, 'Bagaj kampanyası', 'Kanat Havayolları: Aralık 2024\'te kalkan uçuşlardaki, bagaj hakkı 0 olan Eko sınıfı rezervasyonlara 1 bagaj hakkı tanımla.',
  "UPDATE hv_bookings SET bags = 1 WHERE fare_class = 'Eko' AND bags = 0 AND flight_id IN (SELECT flight_id FROM hv_flights WHERE sched_dep >= '2024-12-01' AND sched_dep < '2025-01-01');",
  { check: "SELECT fare_class, bags, COUNT(*) AS rezervasyon FROM hv_bookings GROUP BY fare_class, bags ORDER BY fare_class, bags" });
dml('n043', 'ileri', 2, 'Hareketsiz hesapları kapat', 'Ilgaz Bank: 2024\'te hiç hareketi olmayan aktif vadesiz hesapları kapat: <code>status = \'kapali\'</code>, <code>closed_date = \'2024-12-31\'</code>.',
  "UPDATE bank_accounts SET status = 'kapali', closed_date = '2024-12-31'\nWHERE status = 'aktif' AND account_type = 'vadesiz'\n  AND account_id NOT IN (SELECT account_id FROM bank_txns WHERE txn_time >= '2024-01-01' AND txn_time < '2025-01-01');",
  { check: "SELECT status, COUNT(*) AS hesap FROM bank_accounts WHERE account_type = 'vadesiz' GROUP BY status ORDER BY status" });
dml('n044', 'ileri', 3, 'Performans zammı', 'Pusula İK: 2024 performans puanı 5 olan aktif çalışanlar için <code>ik_salaries</code>\'e 2025-01-01 tarihli, son maaşın %15 fazlası (tam sayıya yuvarlanmış) yeni bir satır ekle; <code>reason</code> = <b>performans</b>.',
  "INSERT INTO ik_salaries (emp_id, effective_date, monthly_gross, reason)\nSELECT e.emp_id, '2025-01-01', ROUND((SELECT s.monthly_gross FROM ik_salaries s WHERE s.emp_id = e.emp_id AND s.effective_date = (SELECT MAX(x.effective_date) FROM ik_salaries x WHERE x.emp_id = e.emp_id)) * 1.15), 'performans'\nFROM ik_employees e JOIN ik_reviews r ON r.emp_id = e.emp_id AND r.review_year = 2024 AND r.rating = 5\nWHERE e.term_date IS NULL;",
  { check: "SELECT COUNT(*) AS satir, SUM(monthly_gross) AS toplam FROM ik_salaries WHERE effective_date = '2025-01-01' AND reason = 'performans'" });
dml('n045', 'ileri', 2, 'Açık bakımları kapat', 'Pedal İzmir: kapanmamış (<code>closed_at</code> boş) ve 2024-08-15 öncesinde açılmış bakım kayıtlarını <code>2024-09-01 09:00:00</code> ile kapat.',
  "UPDATE bk_maintenance SET closed_at = '2024-09-01 09:00:00' WHERE closed_at IS NULL AND opened_at < '2024-08-15';",
  { check: 'SELECT COUNT(*) AS acik FROM bk_maintenance WHERE closed_at IS NULL' });
dml('n046', 'ileri', 3, 'Eksik puanları doldur', 'Lezzet Kurye: 2024-12-31 günü teslim edilip puanı olmayan siparişler için <code>lk_ratings</code>\'e varsayılan satır ekle: yemek ve kurye puanı 3, yorum NULL.',
  "INSERT INTO lk_ratings (order_id, food_score, courier_score, comment)\nSELECT o.order_id, 3, 3, NULL FROM lk_orders o\nWHERE o.status = 'teslim' AND o.placed_at >= '2024-12-31' AND o.placed_at < '2025-01-01'\n  AND NOT EXISTS (SELECT 1 FROM lk_ratings r WHERE r.order_id = o.order_id);",
  { check: "SELECT COUNT(*) AS puanli FROM lk_ratings r JOIN lk_orders o ON o.order_id = r.order_id WHERE o.placed_at >= '2024-12-31' AND o.placed_at < '2025-01-01'" });

/* SELECT ve sütunlar */
sec('n051', 'temel', 1, 'Şube rehberi', 'Ilgaz Bank şubelerinin adı, şehri ve açılış yılı: <code>name</code>, <code>city</code>, <code>opened_year</code>.', 'SELECT name, city, opened_year FROM bank_branches;');
sec('n052', 'temel', 1, 'Filo listesi', 'Kanat Havayolları uçaklarının kuyruk numarası, modeli ve koltuk sayısı; koltuk sütununa <code>koltuk</code> takma adını ver: <code>tail_no</code>, <code>model</code>, <code>koltuk</code>.', 'SELECT tail_no, model, seats AS koltuk FROM hv_aircraft;');
sec('n053', 'temel', 1, 'Maaş bantları', 'Pusula İK pozisyonlarının unvanı, kademesi ve maaş bandı: <code>title</code>, <code>level</code>, <code>band_min</code>, <code>band_max</code>.', 'SELECT title, level, band_min, band_max FROM ik_positions;');
sec('n054', 'temel', 2, 'Kullanıcı tipleri', 'Pedal İzmir\'de var olan tekil kullanıcı tipi ve cinsiyet çiftleri (<code>DISTINCT</code>): <code>user_type</code>, <code>gender</code>.', 'SELECT DISTINCT user_type, gender FROM bk_users;');
sec('n055', 'temel', 1, 'Restoran kartı', 'Lezzet Kurye restoranlarını Türkçe sütun adlarıyla getir: <code>restoran</code> (name), <code>mutfak</code> (cuisine), <code>ilce</code> (district).', 'SELECT name AS restoran, cuisine AS mutfak, district AS ilce FROM lk_restaurants;');
sec('n056', 'temel', 1, 'Kategori listesi', 'Anadolu Market\'te hangi ürün kategorileri var? Her kategori bir kez: <code>category</code>.', 'SELECT DISTINCT category FROM products;');
sec('n057', 'temel', 2, 'Uçulan ülkeler', 'Kanat Havayolları\'nın havalimanı listesindeki tekil ülkeler: <code>country</code>.', 'SELECT DISTINCT country FROM hv_airports;');

/* Metin fonksiyonları */
met('n061', 'temel', 1, 'Uçuş etiketi', 'Kanat Havayolları: ilk 5 uçuş için (numaraya göre) uçuş kodu ve rotayı tek metinde birleştir, <b>TK101 IST-ESB</b> biçiminde: <code>flight_id</code>, <code>etiket</code>.',
  "SELECT f.flight_id, f.flight_no || ' ' || r.origin || '-' || r.dest AS etiket FROM hv_flights f JOIN hv_routes r ON r.route_id = f.route_id ORDER BY f.flight_id LIMIT 5;", O);
met('n062', 'temel', 2, 'Ad ve soyad', 'Ilgaz Bank: 2–6 numaralı müşterilerin tam adından yalnızca ilk kelimeyi (adı) ayıkla (<code>SUBSTR</code> + <code>INSTR</code>): <code>customer_id</code>, <code>ad</code>.',
  "SELECT customer_id, SUBSTR(full_name, 1, INSTR(full_name, ' ') - 1) AS ad FROM bank_customers WHERE customer_id BETWEEN 2 AND 6 ORDER BY customer_id;", O);
met('n063', 'temel', 2, 'En uzun adlar', 'Pusula İK: adı (tam adı) en uzun 3 çalışan; eşitlikte sicil numarası: <code>full_name</code>, <code>uzunluk</code>.',
  "SELECT full_name, LENGTH(full_name) AS uzunluk FROM ik_employees ORDER BY uzunluk DESC, emp_id LIMIT 3;", O);
met('n064', 'temel', 2, 'Koltuk harfi', 'Kanat Havayolları: koltuk numarasının son harfine (A–F) göre rezervasyon sayısı (<code>SUBSTR(seat, LENGTH(seat), 1)</code>); boş koltuklar hariç: <code>harf</code>, <code>rezervasyon</code>. Harfe göre.',
  "SELECT SUBSTR(seat, LENGTH(seat), 1) AS harf, COUNT(*) AS rezervasyon FROM hv_bookings WHERE seat IS NOT NULL GROUP BY SUBSTR(seat, LENGTH(seat), 1) ORDER BY harf;", O);
met('n065', 'temel', 2, 'Ad ve ilçe', 'Lezzet Kurye: İzmir restoranlarını <b>ad (ilçe)</b> biçiminde tek metin olarak getir; ada göre sırala: <code>etiket</code>.',
  "SELECT name || ' (' || district || ')' AS etiket FROM lk_restaurants WHERE city = 'İzmir' ORDER BY name;", O);
met('n066', 'temel', 3, 'Fazla boşluk', 'Ham kayıtlar (<code>raw_signups</code>): adı boşlukla başlayan kayıtlar ve baştaki boşluk sayısı (<code>LENGTH − LENGTH(LTRIM)</code>): <code>id</code>, <code>bastaki</code>. Numaraya göre.',
  "SELECT id, LENGTH(full_name) - LENGTH(LTRIM(full_name)) AS bastaki FROM raw_signups WHERE LENGTH(full_name) > LENGTH(LTRIM(full_name)) ORDER BY id;", O);
met('n067', 'temel', 2, 'Kısaltılmış ad', 'Anadolu Market: ürün adı 12 karakterden uzunsa ilk 12 karakteri ve <b>...</b>, değilse adın kendisi; Elektronik ürünler, numaraya göre: <code>product_id</code>, <code>kisa_ad</code>.',
  "SELECT product_id, CASE WHEN LENGTH(name) > 12 THEN SUBSTR(name, 1, 12) || '...' ELSE name END AS kisa_ad FROM products WHERE category = 'Elektronik' ORDER BY product_id;", O);

/* Sıralama ve sınırlama */
sir('n071', 'temel', 1, 'En uzun rotalar', 'Kanat Havayolları: mesafesi en uzun 5 rota (eşitlikte rota numarası): <code>origin</code>, <code>dest</code>, <code>distance_km</code>.', 'SELECT origin, dest, distance_km FROM hv_routes ORDER BY distance_km DESC, route_id LIMIT 5;', O);
sir('n072', 'temel', 1, 'Riskli müşteriler', 'Ilgaz Bank: risk skoru en yüksek 5 müşteri (eşitlikte numara): <code>full_name</code>, <code>risk_score</code>.', 'SELECT full_name, risk_score FROM bank_customers ORDER BY risk_score DESC, customer_id LIMIT 5;', O);
sir('n073', 'temel', 2, 'Son işe alımlar', 'Pusula İK: en son işe giren 5 çalışan (eşitlikte sicil): <code>full_name</code>, <code>hire_date</code>.', 'SELECT full_name, hire_date FROM ik_employees ORDER BY hire_date DESC, emp_id LIMIT 5;', O);
sir('n074', 'temel', 2, 'En uzun sürüşler', 'Pedal İzmir: mesafesi bilinen yolculuklardan en uzun 3\'ü (eşitlikte numara; PostgreSQL ve Oracle\'da NULL değerler azalan sıralamada başa gelir): <code>trip_id</code>, <code>distance_km</code>.', 'SELECT trip_id, distance_km FROM bk_trips WHERE distance_km IS NOT NULL ORDER BY distance_km DESC, trip_id LIMIT 3;', O);
sir('n075', 'temel', 2, 'Tatlı menüsü 2. sayfa', 'Lezzet Kurye: Tatlı kategorisindeki menü kalemlerini fiyata göre azalan (eşitlikte kalem numarası) sırala ve 5\'erli sayfalardan ikinci sayfayı getir: <code>name</code>, <code>price</code>.', "SELECT name, price FROM lk_menu_items WHERE category = 'Tatlı' ORDER BY price DESC, item_id LIMIT 5 OFFSET 5;", O);
sir('n076', 'temel', 3, 'Özel sıralama', 'Kanat Havayolları: yolcuları üyelik düzeyine göre Elite, Gold, Silver, Classic sırasıyla (ORDER BY içinde CASE), aynı düzeyde ada göre sırala; ilk 8: <code>full_name</code>, <code>tier</code>.',
  "SELECT full_name, tier FROM hv_passengers ORDER BY CASE tier WHEN 'Elite' THEN 1 WHEN 'Gold' THEN 2 WHEN 'Silver' THEN 3 ELSE 4 END, full_name, passenger_id LIMIT 8;", O);

/* Hesaplama */
hes('n081', 'temel', 1, 'Müşterinin ödediği', 'Lezzet Kurye: ilk 5 sipariş için (numaraya göre) teslimat ücreti − indirim + bahşiş toplamı: <code>order_id</code>, <code>odenen</code>.', 'SELECT order_id, delivery_fee - discount + tip AS odenen FROM lk_orders ORDER BY order_id LIMIT 5;', O);
hes('n082', 'temel', 2, 'Blok süre saat:dakika', 'Kanat Havayolları: rotaların blok süresini saat ve dakikaya ayır (<code>FLOOR(block_min / 60)</code> ve kalan dakika); en uzun 5 rota: <code>route_id</code>, <code>saat</code>, <code>dakika</code>.',
  'SELECT route_id, FLOOR(block_min / 60) AS saat, block_min - 60 * FLOOR(block_min / 60) AS dakika FROM hv_routes ORDER BY block_min DESC, route_id LIMIT 5;', O);
hes('n083', 'temel', 2, 'Kur çevirisi', 'Ilgaz Bank: 2024-12-31 kurlarıyla 1.000 birim dövizin TL karşılığı (2 basamak): <code>currency</code>, <code>tl</code>.', "SELECT currency, ROUND(1000 * try_rate, 2) AS tl FROM bank_fx WHERE rate_date = '2024-12-31';");
hes('n084', 'temel', 2, 'Yolculuk dakikası', 'Pedal İzmir: kapanmış ilk 5 yolculuğun (numaraya göre) süresi saniye olarak ve dakika başına ücret (<code>fare × 60 / saniye</code>, 2 basamak): <code>trip_id</code>, <code>saniye</code>, <code>dk_ucret</code>.',
  'SELECT trip_id, ROUND((julianday(ended_at) - julianday(started_at)) * 86400) AS saniye, ROUND(fare * 60 / ROUND((julianday(ended_at) - julianday(started_at)) * 86400), 2) AS dk_ucret FROM bk_trips WHERE ended_at IS NOT NULL ORDER BY trip_id LIMIT 5;', O);
hes('n085', 'temel', 3, 'Bant genişliği', 'Pusula İK: her pozisyonun maaş bandının orta noktası ve bant genişliği yüzdesi (<code>(band_max − band_min) × 100 / band_min</code>, 1 basamak); en geniş 5 bant: <code>title</code>, <code>orta</code>, <code>genislik</code>.',
  'SELECT title, (band_min + band_max) / 2.0 AS orta, ROUND((band_max - band_min) * 100.0 / band_min, 1) AS genislik FROM ik_positions ORDER BY genislik DESC, position_id LIMIT 5;', O);
hes('n086', 'temel', 2, 'İndirim tutarı', 'Anadolu Market: satır başına verilen indirim tutarı (<code>quantity × unit_price × discount</code>, 2 basamak); en büyük 5 indirim (eşitlikte satır numarası): <code>item_id</code>, <code>indirim_tl</code>.',
  'SELECT item_id, ROUND(quantity * unit_price * discount, 2) AS indirim_tl FROM order_items ORDER BY indirim_tl DESC, item_id LIMIT 5;', O);

/* NULL */
nul('n091', 'temel', 1, 'Bilinmeyen yaş', 'Pedal İzmir: doğum yılı girilmemiş kullanıcıların kullanıcı tipine göre sayısı: <code>user_type</code>, <code>kullanici</code>.', 'SELECT user_type, COUNT(*) AS kullanici FROM bk_users WHERE birth_year IS NULL GROUP BY user_type;');
nul('n092', 'temel', 1, 'Kategorisiz işlemler', 'Ilgaz Bank: harcama kategorisi (<code>merchant_category</code>) boş olan işlemlerin işlem türüne göre sayısı: <code>txn_type</code>, <code>islem</code>.', 'SELECT txn_type, COUNT(*) AS islem FROM bank_txns WHERE merchant_category IS NULL GROUP BY txn_type;');
nul('n093', 'temel', 2, 'Kalkış saati yok', 'Kanat Havayolları: gerçekleşen kalkış saati (<code>actual_dep</code>) boş olan uçuşların durumuna göre sayısı: <code>status</code>, <code>ucus</code>.', 'SELECT status, COUNT(*) AS ucus FROM hv_flights WHERE actual_dep IS NULL GROUP BY status;');
nul('n094', 'temel', 2, 'Ayrılma türü', 'Pusula İK: ayrılmış çalışanlar (<code>term_date</code> dolu) için ayrılma türü; tür boşsa <b>belirtilmemiş</b> (<code>COALESCE</code>): <code>tur</code>, <code>kisi</code>.', "SELECT COALESCE(term_type, 'belirtilmemiş') AS tur, COUNT(*) AS kisi FROM ik_employees WHERE term_date IS NOT NULL GROUP BY COALESCE(term_type, 'belirtilmemiş');");
nul('n095', 'temel', 2, 'Kuryesiz siparişlerin payı', 'Lezzet Kurye: tüm siparişler, kuryesi atanmış siparişler (<code>COUNT(courier_id)</code>) ve kuryesiz siparişler tek satırda: <code>toplam</code>, <code>kuryeli</code>, <code>kuryesiz</code>.', 'SELECT COUNT(*) AS toplam, COUNT(courier_id) AS kuryeli, COUNT(*) - COUNT(courier_id) AS kuryesiz FROM lk_orders;');
nul('n096', 'temel', 3, 'Sıfıra bölmeyi önle', 'Pedal İzmir: istasyon başına başlayan yolculukların ortalama mesafesini <code>SUM(distance_km) / NULLIF(COUNT(*), 0)</code> ile hesapla (2 basamak); en yüksek 3 istasyon (eşitlikte numara): <code>start_station</code>, <code>ort_km</code>.',
  'SELECT start_station, ROUND(SUM(distance_km) / NULLIF(COUNT(*), 0), 2) AS ort_km FROM bk_trips GROUP BY start_station ORDER BY ort_km DESC, start_station LIMIT 3;', O);

/* CASE */
cas('n101', 'temel', 1, 'Risk sınıfı', 'Ilgaz Bank: risk skoru 40\'ın altı <b>düşük</b>, 70\'in altı <b>orta</b>, diğerleri <b>yüksek</b>; sınıf başına müşteri sayısı: <code>sinif</code>, <code>musteri</code>.',
  "SELECT CASE WHEN risk_score < 40 THEN 'düşük' WHEN risk_score < 70 THEN 'orta' ELSE 'yüksek' END AS sinif, COUNT(*) AS musteri FROM bank_customers GROUP BY CASE WHEN risk_score < 40 THEN 'düşük' WHEN risk_score < 70 THEN 'orta' ELSE 'yüksek' END;");
cas('n102', 'temel', 2, 'Zamanında kalkış', 'Kanat Havayolları: inmiş uçuşları kalkış gecikmesine göre sınıflandır: 15 dakikaya kadar <b>zamanında</b>, 60\'a kadar <b>gecikmeli</b>, üstü <b>çok gecikmeli</b>: <code>sinif</code>, <code>ucus</code>.',
  "SELECT CASE WHEN ROUND((julianday(actual_dep) - julianday(sched_dep)) * 1440) <= 15 THEN 'zamanında' WHEN ROUND((julianday(actual_dep) - julianday(sched_dep)) * 1440) <= 60 THEN 'gecikmeli' ELSE 'çok gecikmeli' END AS sinif, COUNT(*) AS ucus FROM hv_flights WHERE status = 'landed' GROUP BY CASE WHEN ROUND((julianday(actual_dep) - julianday(sched_dep)) * 1440) <= 15 THEN 'zamanında' WHEN ROUND((julianday(actual_dep) - julianday(sched_dep)) * 1440) <= 60 THEN 'gecikmeli' ELSE 'çok gecikmeli' END;");
cas('n103', 'temel', 2, 'Kıdem grubu', 'Pusula İK: aktif çalışanları işe giriş tarihine göre grupla: 2020 öncesi <b>kıdemli</b>, 2020–2022 <b>orta</b>, 2023 ve sonrası <b>yeni</b>: <code>grup</code>, <code>kisi</code>.',
  "SELECT CASE WHEN hire_date < '2020-01-01' THEN 'kıdemli' WHEN hire_date < '2023-01-01' THEN 'orta' ELSE 'yeni' END AS grup, COUNT(*) AS kisi FROM ik_employees WHERE term_date IS NULL GROUP BY CASE WHEN hire_date < '2020-01-01' THEN 'kıdemli' WHEN hire_date < '2023-01-01' THEN 'orta' ELSE 'yeni' END;");
cas('n104', 'temel', 2, 'Hava durumu saatleri', 'Pedal İzmir: hava gözlem saatlerini sınıflandır: yağış varsa <b>yağmurlu</b>, değilse sıcaklık 30 ve üstüyse <b>sıcak</b>, diğerleri <b>normal</b>: <code>durum</code>, <code>saat</code>.',
  "SELECT CASE WHEN rain_mm > 0 THEN 'yağmurlu' WHEN temp_c >= 30 THEN 'sıcak' ELSE 'normal' END AS durum, COUNT(*) AS saat FROM bk_weather GROUP BY CASE WHEN rain_mm > 0 THEN 'yağmurlu' WHEN temp_c >= 30 THEN 'sıcak' ELSE 'normal' END;");
cas('n105', 'temel', 3, 'Koşullu ortalama', 'Lezzet Kurye: ödeme yöntemine göre sipariş sayısı ve yalnızca teslim edilen siparişlerin ortalama bahşişi (<code>AVG(CASE WHEN … THEN tip END)</code>, 2 basamak): <code>payment</code>, <code>siparis</code>, <code>ort_bahsis</code>.',
  "SELECT payment, COUNT(*) AS siparis, ROUND(AVG(CASE WHEN status = 'teslim' THEN tip END), 2) AS ort_bahsis FROM lk_orders GROUP BY payment;");
cas('n106', 'temel', 3, 'Sepet büyüklüğü', 'Anadolu Market: siparişleri satır sayısına göre sınıflandır: 1 satır <b>tekli</b>, 2–3 <b>küçük</b>, 4 ve üstü <b>büyük</b>; sınıf başına sipariş: <code>sepet</code>, <code>siparis</code>.',
  "SELECT CASE WHEN n = 1 THEN 'tekli' WHEN n <= 3 THEN 'küçük' ELSE 'büyük' END AS sepet, COUNT(*) AS siparis FROM (SELECT order_id, COUNT(*) AS n FROM order_items GROUP BY order_id) t GROUP BY CASE WHEN n = 1 THEN 'tekli' WHEN n <= 3 THEN 'küçük' ELSE 'büyük' END;");

/* Veri temizleme */
tem('n111', 'orta', 2, 'Kırpılacak adlar', 'Ham kayıtlar: adının başında ya da sonunda boşluk olan kaç satır var ve kırpıldığında kaç farklı ad kalıyor: <code>bosluklu</code>, <code>farkli_ad</code>.',
  'SELECT SUM(CASE WHEN LENGTH(full_name) > LENGTH(TRIM(full_name)) THEN 1 ELSE 0 END) AS bosluklu, COUNT(DISTINCT TRIM(full_name)) AS farkli_ad FROM raw_signups;');
tem('n112', 'orta', 2, 'Boş şehir', 'Ham kayıtlar: şehri NULL ya da yalnızca boşluk olan kayıt sayısı (<code>NULLIF(TRIM(city), \'\')</code>): <code>bilinmeyen</code>.',
  "SELECT COUNT(*) AS bilinmeyen FROM raw_signups WHERE NULLIF(TRIM(city), '') IS NULL;");
tem('n113', 'orta', 2, 'Tarih biçimi envanteri', 'Ham kayıtlar: <code>signup_date</code> metni hangi biçimlerde? <code>GG.AA.YYYY</code> (<code>LIKE \'__.__.____\'</code>), ISO <code>YYYY-AA-GG</code> ve diğer biçimlerdeki kayıt sayısı: <code>bicim</code>, <code>kayit</code>.',
  "SELECT CASE WHEN signup_date LIKE '__.__.____' THEN 'GG.AA.YYYY' WHEN signup_date LIKE '____-__-__' THEN 'ISO' ELSE 'diğer' END AS bicim, COUNT(*) AS kayit FROM raw_signups GROUP BY CASE WHEN signup_date LIKE '__.__.____' THEN 'GG.AA.YYYY' WHEN signup_date LIKE '____-__-__' THEN 'ISO' ELSE 'diğer' END;");
tem('n114', 'orta', 2, 'Kapanmamış yolculuk oranı', 'Pedal İzmir veri kalitesi: bitiş zamanı boş (kapanmamış) yolculukların bisiklet modeline göre sayısı ve oranı (yüzde, 2 basamak). Analizden önce bu satırların nereden geldiğini bilmek gerekir: <code>model</code>, <code>acik</code>, <code>oran</code>.',
  "SELECT b.model, SUM(CASE WHEN t.ended_at IS NULL THEN 1 ELSE 0 END) AS acik, ROUND(100.0 * SUM(CASE WHEN t.ended_at IS NULL THEN 1 ELSE 0 END) / COUNT(*), 2) AS oran FROM bk_trips t JOIN bk_bikes b ON b.bike_id = t.bike_id GROUP BY b.model;");
tem('n115', 'orta', 3, 'Eksik kur günleri', 'Ilgaz Bank: kur tablosunda (<code>bank_fx</code>) 2024 için her para biriminin kaç günü var ve 366 günlük takvime göre kaç gün eksik (hafta sonu ve tatillerde kur yayımlanmaz; raporda önceki günün kuruyla doldurmak gerekir): <code>currency</code>, <code>gun</code>, <code>eksik</code>.',
  "SELECT currency, COUNT(*) AS gun, 366 - COUNT(*) AS eksik FROM bank_fx WHERE rate_date >= '2024-01-01' AND rate_date < '2025-01-01' GROUP BY currency;");
tem('n116', 'ileri', 3, 'Bant dışı maaşlar', 'Pusula İK: aktif çalışanların güncel maaşını (en son <code>effective_date</code>) pozisyonlarının maaş bandıyla karşılaştır; bandın altında ve üstünde kalan kişi sayısı: <code>alti</code>, <code>ustu</code>.',
  "WITH g AS (SELECT s.emp_id, s.monthly_gross FROM ik_salaries s WHERE s.effective_date = (SELECT MAX(x.effective_date) FROM ik_salaries x WHERE x.emp_id = s.emp_id))\nSELECT SUM(CASE WHEN g.monthly_gross < p.band_min THEN 1 ELSE 0 END) AS alti, SUM(CASE WHEN g.monthly_gross > p.band_max THEN 1 ELSE 0 END) AS ustu\nFROM ik_employees e JOIN g ON g.emp_id = e.emp_id JOIN ik_positions p ON p.position_id = e.position_id WHERE e.term_date IS NULL;");

/* Pivot */
piv('n121', 'orta', 2, 'Şehir × ödeme', 'Lezzet Kurye: restoran şehrine göre ödeme yöntemlerinin sipariş sayısını sütunlara çevir: <code>city</code>, <code>kart</code>, <code>nakit</code>, <code>cuzdan</code>.',
  "SELECT r.city, SUM(CASE WHEN o.payment = 'kart' THEN 1 ELSE 0 END) AS kart, SUM(CASE WHEN o.payment = 'nakit' THEN 1 ELSE 0 END) AS nakit, SUM(CASE WHEN o.payment = 'cüzdan' THEN 1 ELSE 0 END) AS cuzdan FROM lk_orders o JOIN lk_restaurants r ON r.restaurant_id = o.restaurant_id GROUP BY r.city;");
piv('n122', 'orta', 2, 'Sınıf × durum', 'Kanat Havayolları: bilet sınıfı başına rezervasyon durumlarını sütunlara çevir: <code>fare_class</code>, <code>flown</code>, <code>cancelled</code>, <code>no_show</code>.',
  "SELECT fare_class, SUM(CASE WHEN status = 'flown' THEN 1 ELSE 0 END) AS flown, SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled, SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) AS no_show FROM hv_bookings GROUP BY fare_class;");
piv('n123', 'orta', 3, 'Hesap türü × para birimi', 'Ilgaz Bank: aktif hesaplarda hesap türü başına TRY, EUR ve USD hesap sayısı: <code>account_type</code>, <code>try_hesap</code>, <code>eur_hesap</code>, <code>usd_hesap</code>.',
  "SELECT account_type, SUM(CASE WHEN currency = 'TRY' THEN 1 ELSE 0 END) AS try_hesap, SUM(CASE WHEN currency = 'EUR' THEN 1 ELSE 0 END) AS eur_hesap, SUM(CASE WHEN currency = 'USD' THEN 1 ELSE 0 END) AS usd_hesap FROM bank_accounts WHERE status = 'aktif' GROUP BY account_type;");
piv('n124', 'ileri', 3, 'Yıllara göre puan', 'Pusula İK: bölüm başına 2023 ve 2024 ortalama performans puanını yan yana getir (2 basamak; çalışanın şu anki pozisyonunun bölümü): <code>name</code>, <code>p2023</code>, <code>p2024</code>. Ada göre.',
  "SELECT d.name, ROUND(AVG(CASE WHEN r.review_year = 2023 THEN r.rating END), 2) AS p2023, ROUND(AVG(CASE WHEN r.review_year = 2024 THEN r.rating END), 2) AS p2024\nFROM ik_reviews r JOIN ik_employees e ON e.emp_id = r.emp_id JOIN ik_positions p ON p.position_id = e.position_id JOIN ik_departments d ON d.dept_id = p.dept_id\nGROUP BY d.dept_id, d.name ORDER BY d.name;", O);
piv('n125', 'orta', 2, 'Yaz ayları', 'Pedal İzmir: kullanıcı tipine göre Haziran, Temmuz ve Ağustos 2024 yolculuk sayılarını sütunlara çevir: <code>user_type</code>, <code>haziran</code>, <code>temmuz</code>, <code>agustos</code>.',
  "SELECT u.user_type, SUM(CASE WHEN t.started_at < '2024-07-01' THEN 1 ELSE 0 END) AS haziran, SUM(CASE WHEN t.started_at >= '2024-07-01' AND t.started_at < '2024-08-01' THEN 1 ELSE 0 END) AS temmuz, SUM(CASE WHEN t.started_at >= '2024-08-01' THEN 1 ELSE 0 END) AS agustos FROM bk_trips t JOIN bk_users u ON u.user_id = t.user_id GROUP BY u.user_type;");

/* Alt sorgu */
alt('n131', 'orta', 1, 'Ortalamadan uzun rotalar', 'Kanat Havayolları: mesafesi tüm rotaların ortalama mesafesinden uzun olan rota sayısı: <code>rota</code>.', 'SELECT COUNT(*) AS rota FROM hv_routes WHERE distance_km > (SELECT AVG(distance_km) FROM hv_routes);');
alt('n132', 'orta', 2, 'Hiç sipariş vermeyenler', 'Lezzet Kurye: kayıtlı olup hiç sipariş vermemiş müşteri sayısı (<code>NOT EXISTS</code>): <code>musteri</code>.', 'SELECT COUNT(*) AS musteri FROM lk_customers c WHERE NOT EXISTS (SELECT 1 FROM lk_orders o WHERE o.customer_id = c.customer_id);');
alt('n133', 'orta', 2, 'En yüksek maaş yatışı', 'Ilgaz Bank: tek seferde en yüksek maaş (<code>txn_type = \'maas\'</code>) yatışını alan müşteri(ler)in adı ve tutar: <code>full_name</code>, <code>amount</code>.',
  "SELECT DISTINCT c.full_name, t.amount FROM bank_txns t JOIN bank_accounts a ON a.account_id = t.account_id JOIN bank_customers c ON c.customer_id = a.customer_id WHERE t.txn_type = 'maas' AND t.amount = (SELECT MAX(amount) FROM bank_txns WHERE txn_type = 'maas');");
alt('n134', 'orta', 3, 'Yöneticisinden kıdemli', 'Pusula İK: aktif çalışanlardan yöneticisinden daha önce işe girmiş olanların sayısı (ilişkili alt sorgu): <code>kisi</code>.',
  'SELECT COUNT(*) AS kisi FROM ik_employees e WHERE e.term_date IS NULL AND e.hire_date < (SELECT m.hire_date FROM ik_employees m WHERE m.emp_id = e.manager_id);');
alt('n135', 'orta', 3, 'İlçesinin üstünde', 'Pedal İzmir: kapasitesi kendi ilçesindeki istasyonların ortalama kapasitesinden büyük olan istasyonlar: <code>district</code>, <code>name</code>, <code>capacity</code>. İlçeye, sonra ada göre.',
  'SELECT s.district, s.name, s.capacity FROM bk_stations s WHERE s.capacity > (SELECT AVG(x.capacity) FROM bk_stations x WHERE x.district = s.district) ORDER BY s.district, s.name;', O);

})();
