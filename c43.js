/* 67 yayın bulgusu ve kaynak dalındaki üç ek görev: sabit sonuç regresyonu.
   Kimlikler ex dizisinde 1 tabanlıdır. Test verisi yalnız ayrı DB kopyasına uygulanır. */
(function (root) {
'use strict';
const targets = 'alias-distinct#1 alias-distinct#3 alias-distinct#4 alias-distinct#7 in-between-like#8 null#2 ilk-gun#1 araclar#7 having#6 having#9 metin-birlestir#3 iliskiler#6 iliskiler#7 left-join#6 metin-benzerlik#2 metin-benzerlik#5 self-cross-join#8 set-ops#2 set-ops#5 set-ops#7 hata-ayiklama#1 hata-ayiklama#5 takvim#7 son-deger#6 zaman-araligi#5 normalizasyon#4 normalizasyon#6 performans-lab#1 performans-lab#8 bv-plan#1 bv-plan#2 mulakat-1#1 mk-topn#2 ts-degisken#2 ts-proc#3 ts-plan#5 ds-korelasyon#1 sql-test#1 sql-test#5 de-dbt#2 cert-gda#2 proje-tsql#4 ba-veri#6 ba-uat#6 opt-olc#3 opt-plan#1 opt-proje#2 P:t004 P:t005 P:t021 P:t025 P:t029 P:o135 P:i174 P:i258 P:k201 P:k211 P:z005 P:z013 P:z015 P:z026 P:h104 P:h205 P:g004 P:g102 P:n056 P:m002 P:op22 P:mk07 P:mk15'.split(' ');
const get = id => { if (id.startsWith('P:')) return root.SQLP_PRACTICE.find(x => x.id === id.slice(2)); const [l,n] = id.split('#'); const lesson = root.SQLP_LESSONS.find(x => x.id === l); return lesson && lesson.ex[+n-1]; };
const add = (ids, sql, ad, extra) => ids.split(' ').forEach(id => { const e = get(id); if (e) (e.variants = e.variants || []).push(Object.assign({ ad, sql }, extra || {})); });
const rule = (id, re, msg) => { const e = get(id); if (e) (e.must = e.must || []).push({ re, msg }); };
for (const id of targets) { const e = get(id); if (e) e.noLiteralResult = true; }
root.SQLP_SABIT_HEDEFLER = targets.filter(get);

add('alias-distinct#1', "UPDATE customers SET segment = 'yeni_segment' WHERE customer_id = (SELECT MIN(customer_id) FROM customers);", 'yeni segment');
add('alias-distinct#3 P:t005', "UPDATE orders SET channel = 'yeni_kanal' WHERE order_id = (SELECT MIN(order_id) FROM orders);", 'yeni kanal');
add('alias-distinct#4', "UPDATE lk_restaurants SET city = 'Yenişehir' WHERE restaurant_id = (SELECT MIN(restaurant_id) FROM lk_restaurants);", 'yeni restoran şehri');
add('alias-distinct#7', "UPDATE bank_accounts SET currency = 'CHF' WHERE account_id = (SELECT MIN(account_id) FROM bank_accounts);", 'yeni para birimi');
add('in-between-like#8', "UPDATE hv_flights SET flight_no = 'KN19999' WHERE flight_id = (SELECT MIN(flight_id) FROM hv_flights);", 'yeni sefer numarası');
add('null#2 P:t021', "UPDATE employees SET first_name = 'YeniÇalışan', manager_id = NULL, dept_id = NULL WHERE emp_id = (SELECT MIN(emp_id) FROM employees);", 'yeni NULL eşleşmesi');
add('araclar#7', "UPDATE hv_aircraft SET model = 'Yeni model' WHERE tail_no = (SELECT MIN(tail_no) FROM hv_aircraft);", 'yeni uçak modeli');
add('having#6', "UPDATE lk_orders SET customer_id = (SELECT MIN(customer_id) FROM lk_customers) WHERE status = 'teslim';", 'müşteri eşiği');
add('having#9', "UPDATE ik_leaves SET days = 30 WHERE leave_type = 'hastalık' AND start_date >= '2024-01-01';", 'izin günü eşiği');
add('metin-birlestir#3', "UPDATE bank_customers SET city = 'Yenişehir' WHERE customer_id = (SELECT MIN(customer_id) FROM bank_customers);", 'yeni şube şehri');
add('metin-benzerlik#2 metin-benzerlik#5', "UPDATE employees SET first_name = 'Elif' WHERE emp_id = (SELECT MIN(emp_id) FROM employees WHERE first_name <> 'Elif');", 'yeni benzer ad');
add('self-cross-join#8', "UPDATE ik_employees SET term_date = NULL, manager_id = 1 WHERE emp_id = 2; UPDATE ik_employees SET term_date = '2024-12-01' WHERE emp_id = 1;", 'ayrılan yönetici');
add('set-ops#2 set-ops#7 P:t004', "UPDATE customers SET city = 'Yenişehir' WHERE customer_id = (SELECT MIN(customer_id) FROM customers);", 'yeni müşteri şehri');
add('set-ops#5', "UPDATE lk_restaurants SET city = 'Yenişehir'; UPDATE lk_couriers SET city = 'Yenişehir';", 'şehir kesişimi');
add('takvim#7', "DELETE FROM bk_trips WHERE start_station = 3 AND started_at >= '2024-06-15' AND started_at < '2024-06-16';", 'yolculuksuz takvim günü');
add('son-deger#6', "INSERT INTO lk_orders SELECT 900001, customer_id, 31, courier_id, '2024-12-02 12:00:00', NULL, NULL, 'hazirlaniyor', payment, delivery_fee, discount, tip FROM lk_orders LIMIT 1;", 'yeni son sipariş');
const salary = "INSERT INTO employees SELECT 900001, 'Yeni', 'Çalışan', dept_id, manager_id, title, (SELECT MAX(salary) + 12345 FROM employees), '2099-01-01', 'yeni@example.invalid' FROM employees LIMIT 1;";
add('mulakat-1#1 mk-topn#2 P:t025 P:t029', salary, 'yeni en yüksek maaş ve işe giriş');
add('ts-plan#5', "UPDATE products SET name = 'Kot Yeni' WHERE product_id = (SELECT MIN(product_id) FROM products WHERE name NOT LIKE 'Kot%');", 'yeni Kot ürünü');
add('ds-korelasyon#1', "UPDATE products SET cost = 999999 WHERE product_id = (SELECT MIN(product_id) FROM products);", 'değişen maliyet ilişkisi');
add('cert-gda#2', "UPDATE customers SET first_name = 'A', last_name = 'B';", 'kısa müşteri adları');
add('P:o135', "DELETE FROM orders; INSERT INTO orders VALUES (900001, 1, '2024-06-01', 'completed', 'web'), (900002, 1, '2024-06-02', 'completed', 'web');", 'ardışık iki gün');
add('P:i174', "UPDATE order_items SET unit_price = (SELECT price * 2 FROM products WHERE product_id = order_items.product_id) WHERE item_id = (SELECT MIN(item_id) FROM order_items);", 'fiyat sapması');
add('P:i258', "DELETE FROM bank_txns WHERE txn_time >= '2024-12-01';", 'Aralıkta kart harcaması yok');
add('P:k201', "INSERT INTO hv_flights SELECT 900001, 'KN19999', route_id, 'TC-KNA', '2024-12-10 23:00:00', '2024-12-10 23:30:00', NULL, NULL, status, pax FROM hv_flights LIMIT 1;", 'yeni uçuş aralığı');
add('P:z005', "UPDATE lk_couriers SET rating = NULL, full_name = 'Yeni Kurye' WHERE courier_id = (SELECT MIN(courier_id) FROM lk_couriers);", 'yeni puansız kurye');
add('P:z013', "UPDATE lk_restaurants SET city = CASE WHEN restaurant_id = 1 THEN 'İstanbul' ELSE 'Ankara' END; UPDATE lk_orders SET customer_id = 1;", 'iki şehirde aynı müşteri');
add('P:z015', "UPDATE lk_customers SET city = 'Yenişehir' WHERE customer_id = (SELECT MIN(customer_id) FROM lk_customers);", 'yeni kurye müşteri şehri');
add('P:z026', "UPDATE lk_orders SET status = 'teslim', delivered_at = datetime(placed_at, '+6 hours') WHERE order_id = (SELECT MIN(order_id) FROM lk_orders);", '90 dakikayı aşan teslimat');
add('P:h104', "UPDATE ik_employees SET manager_id = NULL, full_name = 'Yeni Yönetici' WHERE emp_id = (SELECT MIN(emp_id) FROM ik_employees);", 'yöneticisiz yeni çalışan');
add('P:g004', "UPDATE bk_weather SET rain_mm = 0;", 'yağmursuz hava');
add('P:g102', "UPDATE bk_trips SET end_station = start_station;", 'bütün yolculuklar tur');
add('P:n056', "UPDATE products SET category = 'Yeni kategori' WHERE product_id = (SELECT MIN(product_id) FROM products);", 'yeni ürün kategorisi');
add('P:m002', "UPDATE bank_txns SET txn_type = 'atm', amount = -9000;", 'mutlak ATM tutarı');
add('ilk-gun#1', "UPDATE products SET stock = 0 WHERE product_id = (SELECT MIN(product_id) FROM products);", 'yeni sıfır stok');

add('P:mk07', "INSERT INTO hv_routes SELECT 900001, origin, dest, (SELECT MAX(distance_km) + 12345 FROM hv_routes), block_min FROM hv_routes LIMIT 1;", 'yeni en uzun rota');
add('P:mk15', "UPDATE employees SET manager_id = NULL;", 'yöneticisiz çalışanlar');
add('P:mk15', "UPDATE employees SET manager_id = NULL; UPDATE employees SET hire_date = '2024-01-01' WHERE emp_id = 1; UPDATE employees SET manager_id = 1, hire_date = '2023-01-01' WHERE emp_id = 2;", 'yöneticiden önce işe giriş');

/* Temiz verinin hep 0 verdiği görevler için kasıtlı bozuk kopyalar. Anahtar
   ihlali öğreten iki görevde yalnız test kopyasının PK'sı gevşetilir. */
add('iliskiler#6', "CREATE TABLE _varyant_menu AS SELECT * FROM lk_menu_items; DROP TABLE lk_menu_items; ALTER TABLE _varyant_menu RENAME TO lk_menu_items; INSERT INTO lk_menu_items SELECT item_id, restaurant_id + 100000, name, category, price, is_vegetarian FROM lk_menu_items LIMIT 1;", 'aynı ürün iki restoranda');
add('iliskiler#7', "UPDATE lk_orders SET restaurant_id = 900001 WHERE order_id = (SELECT MIN(order_id) FROM lk_orders);", 'öksüz restoran');
add('left-join#6', "INSERT INTO lk_menu_items SELECT 900001, restaurant_id, 'Yeni ürün', category, price, is_vegetarian FROM lk_menu_items LIMIT 1;", 'hiç satılmamış yeni ürün');
add('hata-ayiklama#1', "CREATE TABLE _varyant_lines AS SELECT * FROM lk_order_lines; DROP TABLE lk_order_lines; ALTER TABLE _varyant_lines RENAME TO lk_order_lines; INSERT INTO lk_order_lines SELECT * FROM lk_order_lines LIMIT 1;", 'tekrarlanan sipariş ürün çifti');
add('hata-ayiklama#5', "UPDATE lk_orders SET status = 'teslim', picked_at = datetime(placed_at, '-1 hour') WHERE order_id = (SELECT MIN(order_id) FROM lk_orders);", 'ters teslimat zamanı');
add('zaman-araligi#5', "INSERT INTO hv_flights SELECT 900001, flight_no, route_id, tail_no, sched_dep, sched_arr, actual_dep, actual_arr, status, pax FROM hv_flights WHERE tail_no IS NOT NULL LIMIT 1;", 'aynı uçakta çakışma');
add('normalizasyon#4', "INSERT INTO lk_menu_items SELECT 900001, restaurant_id, name, 'Farklı kategori', price, is_vegetarian FROM lk_menu_items LIMIT 1;", 'aynı ad farklı kategori');
add('normalizasyon#6', "UPDATE lk_order_lines SET unit_price = unit_price + 100 WHERE order_id = (SELECT MIN(order_id) FROM lk_order_lines);", 'tarihsel fiyat farkı');
add('sql-test#1', "UPDATE order_items SET product_id = 900001 WHERE item_id = (SELECT MIN(item_id) FROM order_items);", 'öksüz ürün');
add('sql-test#5', "UPDATE orders SET customer_id = 900001 WHERE order_id = (SELECT MIN(order_id) FROM orders);", 'öksüz müşteri');
add('de-dbt#2', "UPDATE order_items SET order_id = 900001 WHERE item_id = (SELECT MIN(item_id) FROM order_items);", 'öksüz sipariş');
add('ba-veri#6', '', 'aynı siparişe iki kupon', { beforeLast: 'INSERT INTO ba_kupon SELECT * FROM ba_kupon LIMIT 1;' });
add('ba-uat#6', '', 'kupon tutarı değişti', { beforeLast: 'UPDATE ba_kupon SET tutar = tutar + 1 WHERE order_id = (SELECT MIN(order_id) FROM ba_kupon);' });
add('P:k211', "UPDATE hv_flights SET actual_arr = datetime(actual_dep, '-1 hour') WHERE flight_id = (SELECT MIN(flight_id) FROM hv_flights WHERE actual_dep IS NOT NULL);", 'ters uçuş zamanı');
add('P:h205', "INSERT INTO ik_job_history SELECT emp_id, position_id, '2099-01-01', '2099-01-03', change_type FROM ik_job_history LIMIT 1; INSERT INTO ik_job_history SELECT emp_id, position_id, '2099-01-02', '2099-01-04', change_type FROM ik_job_history LIMIT 1;", 'çakışan görev geçmişi');

rule('ts-degisken#2', '\\bIF\\b[\\s\\S]*\\bELSE\\b', 'Bu görevde IF / ELSE kullan.');
add('ts-degisken#2', "UPDATE customers SET city = 'İzmir';", 'eşik altı müşteri');
add('ts-degisken#2', "UPDATE customers SET city = 'Ankara';", 'eşik üstü müşteri');
rule('ts-proc#3', '\\bCREATE\\s+(OR\\s+ALTER\\s+)?PROC(EDURE)?\\b', 'Ürün kontrolü için istenen yordamı tanımla.');
add('ts-proc#3', '', 'var olan ürün çağrısı', { tail: '\nGO\nDECLARE @varyant_r INT; EXEC @varyant_r = dbo.usp_UrunVarMi @id = 1; SELECT @varyant_r AS durum;' });
add('ts-proc#3', '', 'olmayan ürün çağrısı', { tail: '\nGO\nDECLARE @varyant_r INT; EXEC @varyant_r = dbo.usp_UrunVarMi @id = 900001; SELECT @varyant_r AS durum;' });
rule('proje-tsql#4', '\\bCREATE\\s+(OR\\s+ALTER\\s+)?PROC(EDURE)?\\b', 'Şube kontrolünü yordam içinde tanımla.');
rule('proje-tsql#4', '\\bBEGIN\\s+TRY\\b[\\s\\S]*\\bBEGIN\\s+CATCH\\b', 'Hata yönetiminde TRY / CATCH kullan.');
add('proje-tsql#4', '', 'mevcut şube çağrısı', { tail: '\nGO\nEXEC dbo.usp_sube_ozet @sube = 1, @ay = \'2024-11\';' });

for (const id of 'performans-lab#1 performans-lab#8 bv-plan#1 bv-plan#2 opt-olc#3 opt-plan#1 opt-proje#2 P:op22'.split(' ')) {
  const e = get(id); if (!e) continue; e.explainResult = true;
  const q = e.sol.slice(e.sol.toUpperCase().lastIndexOf('EXPLAIN QUERY PLAN') + 18).trim();
  e.plan = Object.assign({}, e.plan, { q });
}
for (const [id, ad, cols] of [['performans-lab#1','ix_kategori',['merchant_category']], ['performans-lab#8','ix_kanal_tutar',['channel','amount']], ['bv-plan#2','ix_trips_start',['start_station']]]) {
  const e = get(id); if (e) e.plan.index = { ad, cols };
}
})(window);
