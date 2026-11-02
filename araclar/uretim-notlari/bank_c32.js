/* ======================= Görev B: alıştırma bankası ======================= */
const PR = window.SQLP_PRACTICE = window.SQLP_PRACTICE || [];
const add = (t) => (id, Lv, d, title, q, sol, o) => PR.push(Object.assign({ id, L: Lv, t, d, title, q: '<p>' + q + '</p>', sol, type: 'sql' }, o || {}));
const cte = add('cte'), rek = add('rek'), kum = add('kum'), ddl = add('ddl'), dml = add('dml'), sec = add('sec'), met = add('met'),
  sir = add('sir'), hes = add('hes'), nul = add('nul'), cas = add('cas'), tem = add('tem'), piv = add('piv'), alt = add('alt');

/* CTE */
cte('n001', 'orta', 1, 'Yoğun kuryeler', 'Lezzet Kurye: CTE ile kurye başına teslim edilen sipariş sayısını hesapla, sonra 130\'dan fazla teslimi olan kuryeleri adlarıyla getir: <code>full_name</code>, <code>teslim</code>. Teslime göre azalan.',
  "WITH t AS (SELECT courier_id, COUNT(*) AS teslim FROM lk_orders WHERE status = 'teslim' GROUP BY courier_id)\nSELECT c.full_name, t.teslim FROM t JOIN lk_couriers c ON c.courier_id = t.courier_id WHERE t.teslim > 130 ORDER BY t.teslim DESC, c.full_name;", O);
cte('n002', 'orta', 2, 'Ortalamanın üstündeki şubeler', 'Anadolu Bank: şube başına müşteri sayısını CTE\'de hesapla; müşteri sayısı şube ortalamasının üstünde olan şubeleri getir: <code>name</code>, <code>musteri</code>. Müşteriye göre azalan.',
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
rek('n015', 'ileri', 2, 'Bileşik faiz tablosu', 'Anadolu Bank: 10.000 TL\'lik mevduat aylık %3 bileşik faizle 12 ay büyüyor. Özyinelemeli CTE ile ay ay bakiyeyi üret (ay 0 = 10.000): <code>ay</code>, <code>bakiye</code> (2 basamak).',
  "WITH RECURSIVE b(ay, bakiye) AS (SELECT 0, 10000.0 UNION ALL SELECT ay + 1, bakiye * 1.03 FROM b WHERE ay < 12)\nSELECT ay, ROUND(bakiye, 2) AS bakiye FROM b ORDER BY ay;", O);
rek('n016', 'ileri', 3, 'Tek aktarmayla ulaşım', 'Kanat Havayolları: IST\'den en fazla iki uçuşla (en çok bir aktarma) ulaşılabilen farklı havalimanı sayısı (IST hariç); rota tablosunu özyinelemeli gez: <code>havalimani</code>.',
  "WITH RECURSIVE y(airport, adim) AS (\n  SELECT 'IST', 0\n  UNION ALL\n  SELECT r.dest, y.adim + 1 FROM hv_routes r JOIN y ON r.origin = y.airport WHERE y.adim < 2\n)\nSELECT COUNT(DISTINCT airport) AS havalimani FROM y WHERE airport <> 'IST';");
rek('n017', 'ileri', 3, 'Mesafe dilimleri', 'Pedal İzmir: özyinelemeli CTE ile 0–9 sayılarını üret; her tam kilometre dilimindeki (FLOOR(distance_km) = n) yolculuk sayısını getir, hiç yolculuk yoksa 0: <code>km</code>, <code>yolculuk</code>.',
  "WITH RECURSIVE s(n) AS (SELECT 0 UNION ALL SELECT n + 1 FROM s WHERE n < 9),\nt AS (SELECT FLOOR(distance_km) AS km, COUNT(*) AS c FROM bk_trips GROUP BY FLOOR(distance_km))\nSELECT s.n AS km, COALESCE(t.c, 0) AS yolculuk FROM s LEFT JOIN t ON t.km = s.n ORDER BY s.n;", O);

/* Küme işlemleri */
kum('n021', 'orta', 1, 'Vadesiz ve kart', 'Anadolu Bank: hem vadesiz hesabı hem kredi kartı olan müşteri sayısı (<code>INTERSECT</code>): <code>musteri</code>.',
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
kum('n027', 'ileri', 3, 'Simetrik fark', 'Anadolu Bank: Kasım 2024\'te işlem yapıp Aralık\'ta yapmayan hesap sayısı ile Aralık\'ta yapıp Kasım\'da yapmayan hesap sayısı: <code>sadece_kasim</code>, <code>sadece_aralik</code>.',
  "SELECT (SELECT COUNT(*) FROM (SELECT account_id FROM bank_txns WHERE txn_time >= '2024-11-01' AND txn_time < '2024-12-01' EXCEPT SELECT account_id FROM bank_txns WHERE txn_time >= '2024-12-01' AND txn_time < '2025-01-01') a) AS sadece_kasim,\n       (SELECT COUNT(*) FROM (SELECT account_id FROM bank_txns WHERE txn_time >= '2024-12-01' AND txn_time < '2025-01-01' EXCEPT SELECT account_id FROM bank_txns WHERE txn_time >= '2024-11-01' AND txn_time < '2024-12-01') b) AS sadece_aralik;");

/* Tablo tasarımı */
ddl('n031', 'ileri', 1, 'Kapı tablosu', 'Kanat Havayolları için <code>hv_gates</code> tablosu oluştur: <code>gate_id</code> (birincil anahtar), <code>airport_code</code> (boş olamaz), <code>terminal</code>. Üç kapı ekle: (1, IST, A), (2, IST, B), (3, ESB, 1).',
  "CREATE TABLE hv_gates (gate_id INTEGER PRIMARY KEY, airport_code TEXT NOT NULL, terminal TEXT);\nINSERT INTO hv_gates VALUES (1, 'IST', 'A'), (2, 'IST', 'B'), (3, 'ESB', '1');",
  { check: 'SELECT gate_id, airport_code, terminal FROM hv_gates ORDER BY gate_id' });
ddl('n032', 'ileri', 2, 'Eğitim planı', 'Pusula İK için <code>ik_egitim_plan</code> tablosu: <code>plan_id</code> (birincil anahtar), <code>course</code> (boş olamaz), <code>kontenjan</code> (0\'dan büyük olmalı, CHECK), <code>baslangic</code> (tarih). İki plan ekle: (1, SQL Temelleri, 20, 2025-02-03), (2, Liderlik, 12, 2025-03-10).',
  "CREATE TABLE ik_egitim_plan (plan_id INTEGER PRIMARY KEY, course TEXT NOT NULL, kontenjan INTEGER CHECK (kontenjan > 0), baslangic DATE);\nINSERT INTO ik_egitim_plan VALUES (1, 'SQL Temelleri', 20, '2025-02-03'), (2, 'Liderlik', 12, '2025-03-10');",
  { check: 'SELECT plan_id, course, kontenjan FROM ik_egitim_plan ORDER BY plan_id' });
ddl('n033', 'ileri', 2, 'Minimum sepet', 'Lezzet Kurye: restoranlara <code>min_tutar</code> (tam sayı) sütunu ekle; pizza restoranları için 150, diğerleri için 100 olarak doldur.',
  "ALTER TABLE lk_restaurants ADD COLUMN min_tutar INTEGER;\nUPDATE lk_restaurants SET min_tutar = CASE WHEN cuisine = 'Pizza' THEN 150 ELSE 100 END;",
  { check: 'SELECT min_tutar, COUNT(*) AS restoran FROM lk_restaurants GROUP BY min_tutar ORDER BY min_tutar' });
ddl('n034', 'ileri', 3, 'Hesap limitleri', 'Anadolu Bank: <code>bank_limits</code> tablosu oluştur: <code>limit_id</code> (birincil anahtar), <code>account_id</code> (<code>bank_accounts</code>\'a yabancı anahtar, her hesap için en fazla bir satır: UNIQUE), <code>gunluk_limit</code> (boş olamaz). İki satır ekle: (1, 100001, 50000), (2, 100002, 25000).',
  "CREATE TABLE bank_limits (limit_id INTEGER PRIMARY KEY, account_id INTEGER UNIQUE REFERENCES bank_accounts(account_id), gunluk_limit INTEGER NOT NULL);\nINSERT INTO bank_limits VALUES (1, 100001, 50000), (2, 100002, 25000);",
  { check: 'SELECT limit_id, account_id, gunluk_limit FROM bank_limits ORDER BY limit_id' });
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
dml('n042', 'ileri', 2, 'İptal uçuşun biletleri', 'Kanat Havayolları: iptal edilmiş uçuşlardaki henüz <code>flown</code> ya da <code>no_show</code> olmayan değil, tüm <b>uçulmuş görünen</b> (status = flown) rezervasyonları <code>cancelled</code> yap (veri düzeltmesi).',
  "UPDATE hv_bookings SET status = 'cancelled' WHERE status = 'flown' AND flight_id IN (SELECT flight_id FROM hv_flights WHERE status = 'cancelled');",
  { check: 'SELECT status, COUNT(*) AS rezervasyon FROM hv_bookings GROUP BY status ORDER BY status' });
dml('n043', 'ileri', 2, 'Hareketsiz hesapları kapat', 'Anadolu Bank: 2024\'te hiç hareketi olmayan aktif vadesiz hesapları kapat: <code>status = \'kapali\'</code>, <code>closed_date = \'2024-12-31\'</code>.',
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
sec('n051', 'temel', 1, 'Şube rehberi', 'Anadolu Bank şubelerinin adı, şehri ve açılış yılı: <code>name</code>, <code>city</code>, <code>opened_year</code>.', 'SELECT name, city, opened_year FROM bank_branches;');
sec('n052', 'temel', 1, 'Filo listesi', 'Kanat Havayolları uçaklarının kuyruk numarası, modeli ve koltuk sayısı; koltuk sütununa <code>koltuk</code> takma adını ver: <code>tail_no</code>, <code>model</code>, <code>koltuk</code>.', 'SELECT tail_no, model, seats AS koltuk FROM hv_aircraft;');
sec('n053', 'temel', 1, 'Maaş bantları', 'Pusula İK pozisyonlarının unvanı, kademesi ve maaş bandı: <code>title</code>, <code>level</code>, <code>band_min</code>, <code>band_max</code>.', 'SELECT title, level, band_min, band_max FROM ik_positions;');
sec('n054', 'temel', 2, 'Kullanıcı tipleri', 'Pedal İzmir\'de var olan tekil kullanıcı tipi ve cinsiyet çiftleri (<code>DISTINCT</code>): <code>user_type</code>, <code>gender</code>.', 'SELECT DISTINCT user_type, gender FROM bk_users;');
sec('n055', 'temel', 1, 'Restoran kartı', 'Lezzet Kurye restoranlarını Türkçe sütun adlarıyla getir: <code>restoran</code> (name), <code>mutfak</code> (cuisine), <code>ilce</code> (district).', 'SELECT name AS restoran, cuisine AS mutfak, district AS ilce FROM lk_restaurants;');
sec('n056', 'temel', 1, 'Kategori listesi', 'Anadolu Market\'te hangi ürün kategorileri var? Her kategori bir kez: <code>category</code>.', 'SELECT DISTINCT category FROM products;');
sec('n057', 'temel', 2, 'Uçulan ülkeler', 'Kanat Havayolları\'nın havalimanı listesindeki tekil ülkeler: <code>country</code>.', 'SELECT DISTINCT country FROM hv_airports;');

/* Metin fonksiyonları */
met('n061', 'temel', 1, 'Uçuş etiketi', 'Kanat Havayolları: ilk 5 uçuş için (numaraya göre) uçuş kodu ve rotayı tek metinde birleştir, <b>TK101 IST-ESB</b> biçiminde: <code>flight_id</code>, <code>etiket</code>.',
  "SELECT f.flight_id, f.flight_no || ' ' || r.origin || '-' || r.dest AS etiket FROM hv_flights f JOIN hv_routes r ON r.route_id = f.route_id ORDER BY f.flight_id LIMIT 5;", O);
met('n062', 'temel', 2, 'Ad ve soyad', 'Anadolu Bank: ilk 5 müşterinin tam adından yalnızca ilk kelimeyi (adı) ayıkla (<code>SUBSTR</code> + <code>INSTR</code>): <code>customer_id</code>, <code>ad</code>.',
  "SELECT customer_id, SUBSTR(full_name, 1, INSTR(full_name, ' ') - 1) AS ad FROM bank_customers ORDER BY customer_id LIMIT 5;", O);
met('n063', 'temel', 2, 'En uzun adlar', 'Pusula İK: adı (tam adı) en uzun 3 çalışan; eşitlikte sicil numarası: <code>full_name</code>, <code>uzunluk</code>.',
  "SELECT full_name, LENGTH(full_name) AS uzunluk FROM ik_employees ORDER BY uzunluk DESC, emp_id LIMIT 3;", O);
met('n064', 'temel', 2, 'Koltuk harfi', 'Kanat Havayolları: koltuk numarasının son harfine (A–F) göre rezervasyon sayısı (<code>SUBSTR(seat, LENGTH(seat), 1)</code>); boş koltuklar hariç: <code>harf</code>, <code>rezervasyon</code>. Harfe göre.',
  "SELECT SUBSTR(seat, LENGTH(seat), 1) AS harf, COUNT(*) AS rezervasyon FROM hv_bookings WHERE seat IS NOT NULL GROUP BY SUBSTR(seat, LENGTH(seat), 1) ORDER BY harf;", O);
met('n065', 'temel', 2, 'Ad ve ilçe', 'Lezzet Kurye: İzmir restoranlarını <b>ad (ilçe)</b> biçiminde tek metin olarak getir; ada göre sırala: <code>etiket</code>.',
  "SELECT name || ' (' || district || ')' AS etiket FROM lk_restaurants WHERE city = 'İzmir' ORDER BY name;", O);
met('n066', 'temel', 3, 'Fazla boşluk', 'Ham kayıtlar (<code>raw_signups</code>): adının başında ya da sonunda boşluk olan kayıtlar ve kaç fazla boşluk olduğu (<code>LENGTH − LENGTH(TRIM)</code>): <code>id</code>, <code>fazla</code>. Numaraya göre.',
  "SELECT id, LENGTH(full_name) - LENGTH(TRIM(full_name)) AS fazla FROM raw_signups WHERE LENGTH(full_name) > LENGTH(TRIM(full_name)) ORDER BY id;", O);
met('n067', 'temel', 2, 'Kısaltılmış ad', 'Anadolu Market: ürün adı 12 karakterden uzunsa ilk 12 karakteri ve <b>...</b>, değilse adın kendisi; Elektronik ürünler, numaraya göre: <code>product_id</code>, <code>kisa_ad</code>.',
  "SELECT product_id, CASE WHEN LENGTH(name) > 12 THEN SUBSTR(name, 1, 12) || '...' ELSE name END AS kisa_ad FROM products WHERE category = 'Elektronik' ORDER BY product_id;", O);

/* Sıralama ve sınırlama */
sir('n071', 'temel', 1, 'En uzun rotalar', 'Kanat Havayolları: mesafesi en uzun 5 rota (eşitlikte rota numarası): <code>origin</code>, <code>dest</code>, <code>distance_km</code>.', 'SELECT origin, dest, distance_km FROM hv_routes ORDER BY distance_km DESC, route_id LIMIT 5;', O);
sir('n072', 'temel', 1, 'Riskli müşteriler', 'Anadolu Bank: risk skoru en yüksek 5 müşteri (eşitlikte numara): <code>full_name</code>, <code>risk_score</code>.', 'SELECT full_name, risk_score FROM bank_customers ORDER BY risk_score DESC, customer_id LIMIT 5;', O);
sir('n073', 'temel', 2, 'Son işe alımlar', 'Pusula İK: en son işe giren 5 çalışan (eşitlikte sicil): <code>full_name</code>, <code>hire_date</code>.', 'SELECT full_name, hire_date FROM ik_employees ORDER BY hire_date DESC, emp_id LIMIT 5;', O);
sir('n074', 'temel', 2, 'En uzun sürüşler', 'Pedal İzmir: mesafesi en uzun 3 yolculuk (eşitlikte numara): <code>trip_id</code>, <code>distance_km</code>.', 'SELECT trip_id, distance_km FROM bk_trips ORDER BY distance_km DESC, trip_id LIMIT 3;', O);
sir('n075', 'temel', 2, 'Tatlı menüsü 2. sayfa', 'Lezzet Kurye: Tatlı kategorisindeki menü kalemlerini fiyata göre azalan (eşitlikte kalem numarası) sırala ve 5\'erli sayfalardan ikinci sayfayı getir: <code>name</code>, <code>price</code>.', "SELECT name, price FROM lk_menu_items WHERE category = 'Tatlı' ORDER BY price DESC, item_id LIMIT 5 OFFSET 5;", O);
sir('n076', 'temel', 3, 'Özel sıralama', 'Kanat Havayolları: yolcuları üyelik düzeyine göre Elite, Gold, Silver, Classic sırasıyla (ORDER BY içinde CASE), aynı düzeyde ada göre sırala; ilk 8: <code>full_name</code>, <code>tier</code>.',
  "SELECT full_name, tier FROM hv_passengers ORDER BY CASE tier WHEN 'Elite' THEN 1 WHEN 'Gold' THEN 2 WHEN 'Silver' THEN 3 ELSE 4 END, full_name, passenger_id LIMIT 8;", O);

/* Hesaplama */
hes('n081', 'temel', 1, 'Müşterinin ödediği', 'Lezzet Kurye: ilk 5 sipariş için (numaraya göre) teslimat ücreti − indirim + bahşiş toplamı: <code>order_id</code>, <code>odenen</code>.', 'SELECT order_id, delivery_fee - discount + tip AS odenen FROM lk_orders ORDER BY order_id LIMIT 5;', O);
hes('n082', 'temel', 2, 'Blok süre saat:dakika', 'Kanat Havayolları: rotaların blok süresini saat ve dakikaya ayır (<code>FLOOR(block_min / 60)</code> ve kalan dakika); en uzun 5 rota: <code>route_id</code>, <code>saat</code>, <code>dakika</code>.',
  'SELECT route_id, FLOOR(block_min / 60) AS saat, block_min - 60 * FLOOR(block_min / 60) AS dakika FROM hv_routes ORDER BY block_min DESC, route_id LIMIT 5;', O);
hes('n083', 'temel', 2, 'Kur çevirisi', 'Anadolu Bank: 2024-12-31 kurlarıyla 1.000 birim dövizin TL karşılığı (2 basamak): <code>currency</code>, <code>tl</code>.', "SELECT currency, ROUND(1000 * try_rate, 2) AS tl FROM bank_fx WHERE rate_date = '2024-12-31';");
hes('n084', 'temel', 2, 'Yolculuk dakikası', 'Pedal İzmir: kapanmış ilk 5 yolculuğun (numaraya göre) süresi dakika olarak (yuvarlanmış) ve dakika başına ücret (2 basamak): <code>trip_id</code>, <code>dakika</code>, <code>dk_ucret</code>.',
  'SELECT trip_id, ROUND((julianday(ended_at) - julianday(started_at)) * 1440) AS dakika, ROUND(fare / ROUND((julianday(ended_at) - julianday(started_at)) * 1440), 2) AS dk_ucret FROM bk_trips WHERE ended_at IS NOT NULL ORDER BY trip_id LIMIT 5;', O);
hes('n085', 'temel', 3, 'Bant genişliği', 'Pusula İK: her pozisyonun maaş bandının orta noktası ve bant genişliği yüzdesi (<code>(band_max − band_min) × 100 / band_min</code>, 1 basamak); en geniş 5 bant: <code>title</code>, <code>orta</code>, <code>genislik</code>.',
  'SELECT title, (band_min + band_max) / 2.0 AS orta, ROUND((band_max - band_min) * 100.0 / band_min, 1) AS genislik FROM ik_positions ORDER BY genislik DESC, position_id LIMIT 5;', O);
hes('n086', 'temel', 2, 'İndirim tutarı', 'Anadolu Market: satır başına verilen indirim tutarı (<code>quantity × unit_price × discount</code>, 2 basamak); en büyük 5 indirim (eşitlikte satır numarası): <code>item_id</code>, <code>indirim_tl</code>.',
  'SELECT item_id, ROUND(quantity * unit_price * discount, 2) AS indirim_tl FROM order_items ORDER BY indirim_tl DESC, item_id LIMIT 5;', O);

/* NULL */
nul('n091', 'temel', 1, 'Bilinmeyen yaş', 'Pedal İzmir: doğum yılı girilmemiş kullanıcıların kullanıcı tipine göre sayısı: <code>user_type</code>, <code>kullanici</code>.', 'SELECT user_type, COUNT(*) AS kullanici FROM bk_users WHERE birth_year IS NULL GROUP BY user_type;');
nul('n092', 'temel', 1, 'Kategorisiz işlemler', 'Anadolu Bank: harcama kategorisi (<code>merchant_category</code>) boş olan işlemlerin işlem türüne göre sayısı: <code>txn_type</code>, <code>islem</code>.', 'SELECT txn_type, COUNT(*) AS islem FROM bank_txns WHERE merchant_category IS NULL GROUP BY txn_type;');
nul('n093', 'temel', 2, 'Kalkış saati yok', 'Kanat Havayolları: gerçekleşen kalkış saati (<code>actual_dep</code>) boş olan uçuşların durumuna göre sayısı: <code>status</code>, <code>ucus</code>.', 'SELECT status, COUNT(*) AS ucus FROM hv_flights WHERE actual_dep IS NULL GROUP BY status;');
nul('n094', 'temel', 2, 'Ayrılma türü', 'Pusula İK: ayrılmış çalışanlar (<code>term_date</code> dolu) için ayrılma türü; tür boşsa <b>belirtilmemiş</b> (<code>COALESCE</code>): <code>tur</code>, <code>kisi</code>.', "SELECT COALESCE(term_type, 'belirtilmemiş') AS tur, COUNT(*) AS kisi FROM ik_employees WHERE term_date IS NOT NULL GROUP BY COALESCE(term_type, 'belirtilmemiş');");
nul('n095', 'temel', 2, 'Kuryesiz siparişlerin payı', 'Lezzet Kurye: tüm siparişler, kuryesi atanmış siparişler (<code>COUNT(courier_id)</code>) ve kuryesiz siparişler tek satırda: <code>toplam</code>, <code>kuryeli</code>, <code>kuryesiz</code>.', 'SELECT COUNT(*) AS toplam, COUNT(courier_id) AS kuryeli, COUNT(*) - COUNT(courier_id) AS kuryesiz FROM lk_orders;');
nul('n096', 'temel', 3, 'Sıfıra bölmeyi önle', 'Pedal İzmir: istasyon başına başlayan yolculukların ortalama mesafesini <code>SUM(distance_km) / NULLIF(COUNT(*), 0)</code> ile hesapla (2 basamak); en yüksek 3 istasyon (eşitlikte numara): <code>start_station</code>, <code>ort_km</code>.',
  'SELECT start_station, ROUND(SUM(distance_km) / NULLIF(COUNT(*), 0), 2) AS ort_km FROM bk_trips GROUP BY start_station ORDER BY ort_km DESC, start_station LIMIT 3;', O);

/* CASE */
cas('n101', 'temel', 1, 'Risk sınıfı', 'Anadolu Bank: risk skoru 40\'ın altı <b>düşük</b>, 70\'in altı <b>orta</b>, diğerleri <b>yüksek</b>; sınıf başına müşteri sayısı: <code>sinif</code>, <code>musteri</code>.',
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
tem('n113', 'orta', 3, 'Kapasite aşımı', 'Kanat Havayolları veri kalitesi: yolcu sayısı uçağın koltuk sayısını aşan ya da negatif olan uçuş sayısı ile yolcu sayısı boş olan uçuş sayısı: <code>hatali</code>, <code>bos</code>.',
  'SELECT SUM(CASE WHEN f.pax > a.seats OR f.pax < 0 THEN 1 ELSE 0 END) AS hatali, SUM(CASE WHEN f.pax IS NULL THEN 1 ELSE 0 END) AS bos FROM hv_flights f JOIN hv_aircraft a ON a.tail_no = f.tail_no;');
tem('n114', 'orta', 2, 'Geçersiz yolculuklar', 'Pedal İzmir: bitişi başlangıcından önce olan ya da mesafesi 0 veya negatif olan kapanmış yolculuk sayısı: <code>gecersiz</code>.',
  'SELECT COUNT(*) AS gecersiz FROM bk_trips WHERE ended_at IS NOT NULL AND (ended_at < started_at OR distance_km <= 0);');
tem('n115', 'orta', 3, 'Mükerrer işlem şüphesi', 'Anadolu Bank: aynı hesapta, aynı tutarda ve aynı gün içinde birden fazla kez görülen kart harcaması grupları: grup sayısı ve bu gruplardaki işlem sayısı: <code>grup</code>, <code>islem</code>.',
  "SELECT COUNT(*) AS grup, SUM(n) AS islem FROM (SELECT account_id, amount, date(txn_time) AS gun, COUNT(*) AS n FROM bank_txns WHERE txn_type = 'kart_harcama' GROUP BY account_id, amount, date(txn_time) HAVING COUNT(*) > 1) t;");
tem('n116', 'ileri', 3, 'Tutarsız ayrılma kaydı', 'Pusula İK: ayrılma tarihi işe girişten önce olan kayıtlar ile ayrılma tarihi dolu ama ayrılma türü boş olan kayıtların sayısı: <code>tarih_hatasi</code>, <code>tur_eksik</code>.',
  'SELECT SUM(CASE WHEN term_date < hire_date THEN 1 ELSE 0 END) AS tarih_hatasi, SUM(CASE WHEN term_date IS NOT NULL AND term_type IS NULL THEN 1 ELSE 0 END) AS tur_eksik FROM ik_employees;');

/* Pivot */
piv('n121', 'orta', 2, 'Şehir × ödeme', 'Lezzet Kurye: restoran şehrine göre ödeme yöntemlerinin sipariş sayısını sütunlara çevir: <code>city</code>, <code>kart</code>, <code>nakit</code>, <code>cuzdan</code>.',
  "SELECT r.city, SUM(CASE WHEN o.payment = 'kart' THEN 1 ELSE 0 END) AS kart, SUM(CASE WHEN o.payment = 'nakit' THEN 1 ELSE 0 END) AS nakit, SUM(CASE WHEN o.payment = 'cüzdan' THEN 1 ELSE 0 END) AS cuzdan FROM lk_orders o JOIN lk_restaurants r ON r.restaurant_id = o.restaurant_id GROUP BY r.city;");
piv('n122', 'orta', 2, 'Sınıf × durum', 'Kanat Havayolları: bilet sınıfı başına rezervasyon durumlarını sütunlara çevir: <code>fare_class</code>, <code>flown</code>, <code>cancelled</code>, <code>no_show</code>.',
  "SELECT fare_class, SUM(CASE WHEN status = 'flown' THEN 1 ELSE 0 END) AS flown, SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled, SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) AS no_show FROM hv_bookings GROUP BY fare_class;");
piv('n123', 'orta', 3, 'Hesap türü × para birimi', 'Anadolu Bank: aktif hesaplarda hesap türü başına TRY, EUR ve USD hesap sayısı: <code>account_type</code>, <code>try_hesap</code>, <code>eur_hesap</code>, <code>usd_hesap</code>.',
  "SELECT account_type, SUM(CASE WHEN currency = 'TRY' THEN 1 ELSE 0 END) AS try_hesap, SUM(CASE WHEN currency = 'EUR' THEN 1 ELSE 0 END) AS eur_hesap, SUM(CASE WHEN currency = 'USD' THEN 1 ELSE 0 END) AS usd_hesap FROM bank_accounts WHERE status = 'aktif' GROUP BY account_type;");
piv('n124', 'ileri', 3, 'Yıllara göre puan', 'Pusula İK: bölüm başına 2023 ve 2024 ortalama performans puanını yan yana getir (2 basamak; çalışanın şu anki pozisyonunun bölümü): <code>name</code>, <code>p2023</code>, <code>p2024</code>. Ada göre.',
  "SELECT d.name, ROUND(AVG(CASE WHEN r.review_year = 2023 THEN r.rating END), 2) AS p2023, ROUND(AVG(CASE WHEN r.review_year = 2024 THEN r.rating END), 2) AS p2024\nFROM ik_reviews r JOIN ik_employees e ON e.emp_id = r.emp_id JOIN ik_positions p ON p.position_id = e.position_id JOIN ik_departments d ON d.dept_id = p.dept_id\nGROUP BY d.dept_id, d.name ORDER BY d.name;", O);
piv('n125', 'orta', 2, 'Yaz ayları', 'Pedal İzmir: kullanıcı tipine göre Haziran, Temmuz ve Ağustos 2024 yolculuk sayılarını sütunlara çevir: <code>user_type</code>, <code>haziran</code>, <code>temmuz</code>, <code>agustos</code>.',
  "SELECT u.user_type, SUM(CASE WHEN t.started_at < '2024-07-01' THEN 1 ELSE 0 END) AS haziran, SUM(CASE WHEN t.started_at >= '2024-07-01' AND t.started_at < '2024-08-01' THEN 1 ELSE 0 END) AS temmuz, SUM(CASE WHEN t.started_at >= '2024-08-01' THEN 1 ELSE 0 END) AS agustos FROM bk_trips t JOIN bk_users u ON u.user_id = t.user_id GROUP BY u.user_type;");

/* Alt sorgu */
alt('n131', 'orta', 1, 'Ortalamadan uzun rotalar', 'Kanat Havayolları: mesafesi tüm rotaların ortalama mesafesinden uzun olan rota sayısı: <code>rota</code>.', 'SELECT COUNT(*) AS rota FROM hv_routes WHERE distance_km > (SELECT AVG(distance_km) FROM hv_routes);');
alt('n132', 'orta', 2, 'Hiç sipariş vermeyenler', 'Lezzet Kurye: kayıtlı olup hiç sipariş vermemiş müşteri sayısı (<code>NOT EXISTS</code>): <code>musteri</code>.', 'SELECT COUNT(*) AS musteri FROM lk_customers c WHERE NOT EXISTS (SELECT 1 FROM lk_orders o WHERE o.customer_id = c.customer_id);');
alt('n133', 'orta', 2, 'En yüksek maaş yatışı', 'Anadolu Bank: tek seferde en yüksek maaş (<code>txn_type = \'maas\'</code>) yatışını alan müşteri(ler)in adı ve tutar: <code>full_name</code>, <code>amount</code>.',
  "SELECT DISTINCT c.full_name, t.amount FROM bank_txns t JOIN bank_accounts a ON a.account_id = t.account_id JOIN bank_customers c ON c.customer_id = a.customer_id WHERE t.txn_type = 'maas' AND t.amount = (SELECT MAX(amount) FROM bank_txns WHERE txn_type = 'maas');");
alt('n134', 'orta', 3, 'Yöneticisinden kıdemli', 'Pusula İK: aktif çalışanlardan yöneticisinden daha önce işe girmiş olanların sayısı (ilişkili alt sorgu): <code>kisi</code>.',
  'SELECT COUNT(*) AS kisi FROM ik_employees e WHERE e.term_date IS NULL AND e.hire_date < (SELECT m.hire_date FROM ik_employees m WHERE m.emp_id = e.manager_id);');
alt('n135', 'orta', 3, 'İlçesinin üstünde', 'Pedal İzmir: kapasitesi kendi ilçesindeki istasyonların ortalama kapasitesinden büyük olan istasyonlar: <code>district</code>, <code>name</code>, <code>capacity</code>. İlçeye, sonra ada göre.',
  'SELECT s.district, s.name, s.capacity FROM bk_stations s WHERE s.capacity > (SELECT AVG(x.capacity) FROM bk_stations x WHERE x.district = s.district) ORDER BY s.district, s.name;', O);
