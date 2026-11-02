/* Kesit SQL içerik 23: Temel konuların pekiştirilmesi (1/2)
   Temeller, Özetleme, Fonksiyonlar ve Veri Değiştirme derslerine dört veri setinden yeni alıştırmalar
   ve kısa anlatımlı derslere “Derinleş” bölümleri. Alıştırmalar sona eklenir (mevcut ilerleme korunur). */
(function () {
const L = window.SQLP_LESSONS; const LM = id => L.find(l => l.id === id);
const sq = (q, sol, o) => Object.assign({ t: 'sql', q: '<p>' + q + '</p>', sol }, o || {});
const mc = (q, o, a, why) => ({ t: 'mc', q, o, a, why });
const X = (id, list) => { const l = LM(id); if (l) l.ex = (l.ex || []).concat(list); };
const more = (id, html) => { const l = LM(id); if (l) l.body += html; };
const C = (src) => '<pre class="code">' + src.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre>';
const O = { ord: true };
const LKNET = 'ol.qty * ol.unit_price';
const DK = "ROUND((julianday(o.delivered_at) - julianday(o.placed_at)) * 86400)";

/* ================================ TEMELLER ================================ */
X('veritabani', [
  sq('Lezzet Kurye veri setini tanı: <code>lk_restaurants</code> tablosunun tüm sütunlarını getir.', 'SELECT * FROM lk_restaurants;'),
  sq('Ilgaz Bank\'ın şubelerini listele: <code>name</code>, <code>city</code>.', 'SELECT name, city FROM bank_branches;')
]);
X('araclar', [
  sq('Editörü dene: Kanat Havayolları\'nın havalimanlarını kod ve şehirleriyle getir: <code>airport_code</code>, <code>city</code>.', 'SELECT airport_code, city FROM hv_airports;'),
  sq('Birden fazla ifade çalıştırılabilir; son ifadenin sonucu kontrol edilir. Önce <code>SELECT 1;</code>, sonra kuryelerin adını ve aracını getiren sorguyu yaz: <code>full_name</code>, <code>vehicle</code>.', 'SELECT 1; SELECT full_name, vehicle FROM lk_couriers;')
]);
X('select', [
  sq('Lezzet Kurye menüsündeki ürünlerin adını, kategorisini ve fiyatını getir.', 'SELECT name, category, price FROM lk_menu_items;'),
  sq('Kanat Havayolları filosundaki her uçağın tescilini, tipini ve <b>koltuk sayısının yarısını</b> (<code>yari</code>) getir.', 'SELECT tail_no, model, seats / 2.0 AS yari FROM hv_aircraft;'),
  sq('Her menü ürünü için adı ve <b>%10 zamlı</b> fiyatı (<code>yeni_fiyat</code>) getir.', 'SELECT name, price * 1.10 AS yeni_fiyat FROM lk_menu_items;'),
  sq('Banka müşterilerinin adını, şehrini ve risk puanını getir.', 'SELECT full_name, city, risk_score FROM bank_customers;')
]);
X('alias-distinct', [
  sq('Lezzet Kurye\'de restoranların bulunduğu <b>farklı</b> şehirleri listele.', 'SELECT DISTINCT city FROM lk_restaurants;'),
  sq('Restoranlardaki farklı <b>şehir–mutfak</b> kombinasyonlarını getir: <code>city</code>, <code>cuisine</code>.', 'SELECT DISTINCT city, cuisine FROM lk_restaurants;'),
  sq('Kanat Havayolları rotalarını Türkçe takma adlarla getir: <code>kalkis</code>, <code>varis</code>, <code>mesafe</code>.', 'SELECT origin AS kalkis, dest AS varis, distance_km AS mesafe FROM hv_routes;'),
  sq('Banka hesaplarında kullanılan farklı para birimlerini getir.', 'SELECT DISTINCT currency FROM bank_accounts;')
]);
X('hesaplama', [
  sq('Kanat Havayolları rotalarının mesafesini <b>mil</b> cinsinden (1 km = 0,621371 mil, tam sayıya yuvarla) getir: <code>route_id</code>, <code>mil</code>.', 'SELECT route_id, ROUND(distance_km * 0.621371) AS mil FROM hv_routes;'),
  sq('Lezzet Kurye siparişlerinde müşterinin ödediği ek tutarı hesapla: teslimat ücreti + bahşiş − indirim. İlk 10 sipariş (numaraya göre): <code>order_id</code>, <code>ek</code>.', 'SELECT order_id, delivery_fee + tip - discount AS ek FROM lk_orders ORDER BY order_id LIMIT 10;', O),
  sq('Rotalarda ortalama hızı hesapla: mesafe / (planlanan süre dakika / 60), tam sayı. Rota numarasına göre sırala: <code>route_id</code>, <code>km_saat</code>.', 'SELECT route_id, ROUND(distance_km / (block_min / 60.0)) AS km_saat FROM hv_routes ORDER BY route_id;', O),
  sq('Restoranların komisyon oranını ondalık olarak (ör. 18 → 0.18) getir: <code>name</code>, <code>oran</code>.', 'SELECT name, commission_pct / 100.0 AS oran FROM lk_restaurants;')
]);
X('where', [
  sq('Fiyatı 300 TL ve üzeri olan menü ürünlerini getir: <code>name</code>, <code>price</code>.', 'SELECT name, price FROM lk_menu_items WHERE price >= 300;'),
  sq('İptal edilen Lezzet Kurye siparişlerinin sayısını bul: <code>adet</code>.', "SELECT COUNT(*) AS adet FROM lk_orders WHERE status = 'iptal';"),
  sq('2000 km\'den uzun rotalar: <code>origin</code>, <code>dest</code>, <code>distance_km</code>.', 'SELECT origin, dest, distance_km FROM hv_routes WHERE distance_km > 2000;'),
  sq('Kasım 2024\'te (1–30 Kasım) verilen Lezzet Kurye siparişlerinin sayısı: <code>adet</code>. Saat içeren sütunda güvenli aralık kalıbını kullan.', "SELECT COUNT(*) AS adet FROM lk_orders WHERE placed_at >= '2024-11-01' AND placed_at < '2024-12-01';")
]);
X('mantik', [
  sq('İstanbul\'daki <b>Döner</b> veya <b>Pizza</b> restoranlarını getir: <code>name</code>, <code>cuisine</code>. Parantezleri unutma.', "SELECT name, cuisine FROM lk_restaurants WHERE city = 'İstanbul' AND (cuisine = 'Döner' OR cuisine = 'Pizza');"),
  sq('Vejetaryen olup fiyatı 100 TL\'nin altında olan menü ürünlerinin sayısı: <code>adet</code>.', 'SELECT COUNT(*) AS adet FROM lk_menu_items WHERE is_vegetarian = 1 AND price < 100;'),
  sq('Nakitle ödenmeyen ve durumu teslim olan siparişlerin sayısı (NOT kullan): <code>adet</code>.', "SELECT COUNT(*) AS adet FROM lk_orders WHERE NOT payment = 'nakit' AND status = 'teslim';"),
  sq('Kanat Havayolları\'nda iptal edilen <b>ya da</b> 200\'den fazla yolcusu olan uçuşların sayısı: <code>adet</code>.', "SELECT COUNT(*) AS adet FROM hv_flights WHERE status = 'cancelled' OR pax > 200;")
]);
X('in-between-like', [
  sq('İstanbul, İzmir veya Ankara dışındaki şehirlerde bulunan banka şubeleri (NOT IN): <code>name</code>, <code>city</code>.', "SELECT name, city FROM bank_branches WHERE city NOT IN ('İstanbul', 'İzmir', 'Ankara');"),
  sq('Fiyatı 150 ile 250 TL arasında (dahil) olan menü ürünlerinin sayısı: <code>adet</code>.', 'SELECT COUNT(*) AS adet FROM lk_menu_items WHERE price BETWEEN 150 AND 250;'),
  sq('Adında <b>Burger</b> geçen menü ürünlerini getir: <code>name</code>, <code>price</code>.', "SELECT name, price FROM lk_menu_items WHERE name LIKE '%Burger%';"),
  sq('Sefer numarası <b>KN1</b> ile başlayan uçuşların farklı sefer numaraları: <code>flight_no</code>.', "SELECT DISTINCT flight_no FROM hv_flights WHERE flight_no LIKE 'KN1%';")
]);
X('like-escape', [
  sq('Lezzet Kurye müşterilerinden adı <b>A</b> harfiyle başlayan ve soyadı <b>Kaya</b> olanların sayısı: <code>adet</code>.', "SELECT COUNT(*) AS adet FROM lk_customers WHERE full_name LIKE 'A% Kaya';"),
  sq('Yorumunda <b>geç</b> kelimesi geçen değerlendirmelerin sayısı: <code>adet</code>.', "SELECT COUNT(*) AS adet FROM lk_ratings WHERE comment LIKE '%geç%';")
]);
X('null', [
  sq('Kuryesi atanmamış (courier_id boş) siparişlerin sayısı: <code>adet</code>.', 'SELECT COUNT(*) AS adet FROM lk_orders WHERE courier_id IS NULL;'),
  sq('Yorum yazılmış değerlendirmelerin sayısı ve toplam değerlendirme sayısı: <code>yorumlu</code>, <code>toplam</code>.', 'SELECT COUNT(comment) AS yorumlu, COUNT(*) AS toplam FROM lk_ratings;'),
  sq('İlçesi bilinmeyen Lezzet Kurye müşterilerinin adı ve şehri: <code>full_name</code>, <code>city</code>.', 'SELECT full_name, city FROM lk_customers WHERE district IS NULL;'),
  sq('Kanat Havayolları\'nda gerçek kalkış saati boş olan uçuşların durumlarına göre sayısı: <code>status</code>, <code>adet</code>.', 'SELECT status, COUNT(*) AS adet FROM hv_flights WHERE actual_dep IS NULL GROUP BY status;'),
  mc('<p><code>SELECT COUNT(*) FROM lk_customers WHERE district &lt;&gt; \'Kadıköy\';</code> ilçesi boş müşterileri sayar mı?</p>', ['Evet, boş ilçe Kadıköy olmadığı için sayılır', 'Hayır, NULL ile karşılaştırma bilinmeyen döner ve satır elenir', 'Hata verir', 'Yalnızca SQLite\'ta sayar'], 1, 'NULL ile &lt;> karşılaştırması UNKNOWN verir. Boşları da istiyorsan OR district IS NULL ekle.')
]);
X('order-limit', [
  sq('En pahalı 5 menü ürünü (eşitlikte ada göre): <code>name</code>, <code>price</code>.', 'SELECT name, price FROM lk_menu_items ORDER BY price DESC, name LIMIT 5;', O),
  sq('En kısa 3 rota (eşitlikte route_id): <code>route_id</code>, <code>origin</code>, <code>dest</code>, <code>distance_km</code>.', 'SELECT route_id, origin, dest, distance_km FROM hv_routes ORDER BY distance_km, route_id LIMIT 3;', O),
  sq('Restoranları şehre (artan), sonra komisyona (azalan), sonra ada göre sırala: <code>city</code>, <code>name</code>, <code>commission_pct</code>.', 'SELECT city, name, commission_pct FROM lk_restaurants ORDER BY city, commission_pct DESC, name;', O),
  sq('Risk puanına göre azalan sıralamada <b>6.–10.</b> banka müşterileri (eşitlikte müşteri numarası): <code>customer_id</code>, <code>risk_score</code>.', 'SELECT customer_id, risk_score FROM bank_customers ORDER BY risk_score DESC, customer_id LIMIT 5 OFFSET 5;', O)
]);
X('veri-seti', [
  sq('Lezzet Kurye\'nin kaç restoranı, kuryesi ve müşterisi var? Tek satır: <code>restoran</code>, <code>kurye</code>, <code>musteri</code>.', 'SELECT (SELECT COUNT(*) FROM lk_restaurants) AS restoran, (SELECT COUNT(*) FROM lk_couriers) AS kurye, (SELECT COUNT(*) FROM lk_customers) AS musteri;')
]);
X('sozdizimi', [
  sq('Bu sorgu hatalı: <code>SELECT name price FROM lk_menu_items</code> (virgül eksik; price ad sütununun takma adı oldu). Düzeltip ad ve fiyatı getir.', 'SELECT name, price FROM lk_menu_items;', { start: 'SELECT name price FROM lk_menu_items' })
]);

/* ================================ ÖZETLEME ================================ */
X('aggregate', [
  sq('Lezzet Kurye\'de teslim edilen siparişlerin ortalama bahşişi (2 basamak): <code>ort_bahsis</code>.', "SELECT ROUND(AVG(tip), 2) AS ort_bahsis FROM lk_orders WHERE status = 'teslim';"),
  sq('Menüdeki en ucuz ve en pahalı ürün fiyatı: <code>en_ucuz</code>, <code>en_pahali</code>.', 'SELECT MIN(price) AS en_ucuz, MAX(price) AS en_pahali FROM lk_menu_items;'),
  sq('Kanat Havayolları\'nın toplam taşıdığı yolcu (iptaller hariç) ve uçuş sayısı: <code>yolcu</code>, <code>ucus</code>.', "SELECT SUM(pax) AS yolcu, COUNT(*) AS ucus FROM hv_flights WHERE status <> 'cancelled';"),
  sq('Lezzet Kurye\'de en az bir sipariş vermiş <b>farklı</b> müşteri sayısı: <code>musteri</code>.', 'SELECT COUNT(DISTINCT customer_id) AS musteri FROM lk_orders;'),
  sq('Kurye puanlarının ortalaması, puanı olan ve olmayan kurye sayısı (2 basamak): <code>ort</code>, <code>puanli</code>, <code>puansiz</code>.', 'SELECT ROUND(AVG(rating), 2) AS ort, COUNT(rating) AS puanli, COUNT(*) - COUNT(rating) AS puansiz FROM lk_couriers;')
]);
X('group-by', [
  sq('Lezzet Kurye\'de sipariş durumuna göre sipariş sayısı: <code>status</code>, <code>adet</code>.', 'SELECT status, COUNT(*) AS adet FROM lk_orders GROUP BY status;'),
  sq('Mutfak türüne göre restoran sayısı; sayıya göre azalan, eşitlikte mutfağa göre: <code>cuisine</code>, <code>restoran</code>.', 'SELECT cuisine, COUNT(*) AS restoran FROM lk_restaurants GROUP BY cuisine ORDER BY restoran DESC, cuisine;', O),
  sq('Ödeme yöntemine göre sipariş sayısı ve toplam bahşiş: <code>payment</code>, <code>siparis</code>, <code>bahsis</code>.', 'SELECT payment, COUNT(*) AS siparis, SUM(tip) AS bahsis FROM lk_orders GROUP BY payment;'),
  sq('Kanat Havayolları\'nda uçak tipine göre uçak sayısı ve ortalama üretim yılı (tam sayı): <code>model</code>, <code>ucak</code>, <code>ort_yil</code>.', 'SELECT model, COUNT(*) AS ucak, ROUND(AVG(year_built)) AS ort_yil FROM hv_aircraft GROUP BY model;'),
  sq('Şehir ve araç türüne göre kurye sayısı; şehir, sonra araca göre sırala: <code>city</code>, <code>vehicle</code>, <code>kurye</code>.', 'SELECT city, vehicle, COUNT(*) AS kurye FROM lk_couriers GROUP BY city, vehicle ORDER BY city, vehicle;', O)
]);
X('having', [
  sq('100\'den fazla siparişi olan restoranlar: <code>restaurant_id</code>, <code>siparis</code>. Sipariş sayısına göre azalan sırala.', 'SELECT restaurant_id, COUNT(*) AS siparis FROM lk_orders GROUP BY restaurant_id HAVING COUNT(*) > 100 ORDER BY siparis DESC, restaurant_id;', O),
  sq('Ortalama fiyatı 200 TL\'nin üzerinde olan menü kategorileri (tam sayı): <code>category</code>, <code>ort</code>.', 'SELECT category, ROUND(AVG(price)) AS ort FROM lk_menu_items GROUP BY category HAVING AVG(price) > 200;'),
  sq('Yalnızca <b>teslim</b> siparişler arasında 15\'ten fazla siparişi olan müşterilerin sayısı: <code>musteri</code>.', "SELECT COUNT(*) AS musteri FROM (SELECT customer_id FROM lk_orders WHERE status = 'teslim' GROUP BY customer_id HAVING COUNT(*) > 15) t;"),
  sq('En az 3 uçağı olan uçak tipleri: <code>model</code>, <code>ucak</code>.', 'SELECT model, COUNT(*) AS ucak FROM hv_aircraft GROUP BY model HAVING COUNT(*) >= 3;'),
  mc('<p>“Teslim siparişi 10\'dan fazla olan müşteriler” için hangisi doğru?</p>', ["WHERE status = 'teslim' ... GROUP BY customer_id HAVING COUNT(*) > 10", "GROUP BY customer_id HAVING status = 'teslim' AND COUNT(*) > 10", "WHERE COUNT(*) > 10 AND status = 'teslim' GROUP BY customer_id", "GROUP BY customer_id, status WHERE COUNT(*) > 10"], 0, 'Satır koşulu (status) WHERE\'de, grup koşulu (COUNT) HAVING\'de. HAVING içinde gruplanmamış bir sütuna koşul yazmak çoğu SQL türünde hata verir.')
]);
X('metin-birlestir', [
  sq('Her şehrin restoran adlarını alfabetik ve virgülle ayrılmış olarak birleştir: <code>city</code>, <code>restoranlar</code>. Şehre göre sırala.', "SELECT city, GROUP_CONCAT(name, ', ' ORDER BY name) AS restoranlar FROM lk_restaurants GROUP BY city ORDER BY city;", Object.assign({ solv: { mysql: "SELECT city, GROUP_CONCAT(name ORDER BY name SEPARATOR ', ') AS restoranlar FROM lk_restaurants GROUP BY city ORDER BY city;", oracle: "SELECT city, LISTAGG(name, ', ') WITHIN GROUP (ORDER BY name) AS restoranlar FROM lk_restaurants GROUP BY city ORDER BY city;" } }, O))
]);
X('toplama-tuzak', [
  sq('Sipariş başına ortalama satır sayısını hesapla. Tuzak: lk_orders ile lk_order_lines\'ı birleştirip COUNT(*) / COUNT(*) yazmak. Doğru sonuç (2 basamak): <code>ort_satir</code>.', 'SELECT ROUND(1.0 * COUNT(*) / COUNT(DISTINCT order_id), 2) AS ort_satir FROM lk_order_lines;'),
  sq('Değerlendirmesi olan siparişlerin <b>sipariş</b> düzeyinde ortalama teslimat ücreti (2 basamak): <code>ort_ucret</code>.', 'SELECT ROUND(AVG(o.delivery_fee), 2) AS ort_ucret FROM lk_orders o WHERE EXISTS (SELECT 1 FROM lk_ratings r WHERE r.order_id = o.order_id);')
]);
X('sorgu-sirasi', [
  sq('Bu sorgu hata verir: <code>SELECT price * 1.2 AS kdvli FROM lk_menu_items WHERE kdvli &gt; 300;</code> WHERE, SELECT\'ten önce çalıştığı için takma adı tanımaz. İfadeyi tekrar yazarak düzelt: <code>name</code>, <code>kdvli</code>.', 'SELECT name, price * 1.2 AS kdvli FROM lk_menu_items WHERE price * 1.2 > 300;', { start: 'SELECT name, price * 1.2 AS kdvli FROM lk_menu_items WHERE kdvli > 300;' }),
  sq('ORDER BY, SELECT\'ten sonra çalışır; takma adı kullanabilir. Mutfak türüne göre ortalama komisyonu hesapla ve <b>takma adıyla</b> azalan sırala (2 basamak): <code>cuisine</code>, <code>ort_kom</code>.', 'SELECT cuisine, ROUND(AVG(commission_pct), 2) AS ort_kom FROM lk_restaurants GROUP BY cuisine ORDER BY ort_kom DESC, cuisine;', O),
  sq('Sıra: WHERE önce satırları süzer, HAVING sonra grupları. Yalnızca İstanbul restoranlarını al, 2\'den fazla restoranı olan mutfakları getir: <code>cuisine</code>, <code>restoran</code>.', "SELECT cuisine, COUNT(*) AS restoran FROM lk_restaurants WHERE city = 'İstanbul' GROUP BY cuisine HAVING COUNT(*) > 2;")
]);
X('stil', [
  sq('Bu sorgu çalışıyor ama okunması zor: <code>select a.name,count(*) from lk_restaurants a join lk_orders b on a.restaurant_id=b.restaurant_id group by a.name</code>. Anlamlı takma adlar (r, o) ve çıktı adlarıyla yeniden yaz; teslim siparişleri restoran adına göre say: <code>restoran</code>, <code>siparis</code>.', "SELECT r.name AS restoran, COUNT(*) AS siparis FROM lk_restaurants r JOIN lk_orders o ON o.restaurant_id = r.restaurant_id WHERE o.status = 'teslim' GROUP BY r.name;"),
  sq('CTE ile adım adım yaz: önce müşteri başına sipariş sayısı (<code>m</code>), sonra bu sayıların ortalaması (2 basamak): <code>ort_siparis</code>.', 'WITH m AS (SELECT customer_id, COUNT(*) AS siparis FROM lk_orders GROUP BY customer_id) SELECT ROUND(AVG(siparis), 2) AS ort_siparis FROM m;')
]);

/* ================================ FONKSİYONLAR ================================ */
X('metin', [
  sq('Kurye adlarını büyük harfle ve karakter uzunluğuyla getir: <code>ad</code>, <code>uzunluk</code>. Uzunluğa göre azalan, eşitlikte ada göre ilk 5.', 'SELECT UPPER(full_name) AS ad, LENGTH(full_name) AS uzunluk FROM lk_couriers ORDER BY uzunluk DESC, ad LIMIT 5;', O),
  sq('Lezzet Kurye müşterilerinin <b>ilk adını</b> (ilk boşluğa kadar) çıkar ve en yaygın 5 ilk adı say (eşitlikte ada göre): <code>ad</code>, <code>adet</code>.', "SELECT SUBSTR(full_name, 1, INSTR(full_name, ' ') - 1) AS ad, COUNT(*) AS adet FROM lk_customers GROUP BY SUBSTR(full_name, 1, INSTR(full_name, ' ') - 1) ORDER BY adet DESC, ad LIMIT 5;", O),
  sq('Havalimanı adlarında <b>Havalimanı</b> kelimesini <b>Hvl.</b> ile değiştir: <code>airport_code</code>, <code>kisa</code>.', "SELECT airport_code, REPLACE(name, 'Havalimanı', 'Hvl.') AS kisa FROM hv_airports;"),
  sq('Restoran adı ve şehrini tek sütunda <b>Ad (Şehir)</b> biçiminde birleştir: <code>etiket</code>.', "SELECT name || ' (' || city || ')' AS etiket FROM lk_restaurants;")
]);
X('sayi-tip', [
  sq('Menü fiyatlarının KDV hariç tutarını (%10 KDV, fiyat / 1,10) iki basamağa yuvarla: <code>name</code>, <code>kdv_haric</code>.', 'SELECT name, ROUND(price / 1.10, 2) AS kdv_haric FROM lk_menu_items;'),
  sq('Uçakların yaşını 2024 itibarıyla hesapla ve yaş grubunu 5\'lik dilimlere böl (FLOOR(yaş / 5) * 5): <code>tail_no</code>, <code>yas</code>, <code>grup</code>.', 'SELECT tail_no, 2024 - year_built AS yas, FLOOR((2024 - year_built) / 5) * 5 AS grup FROM hv_aircraft;'),
  sq('Teslim siparişlerde bahşişin teslimat ücretine oranını yüzde olarak hesapla; teslimat ücreti 0 olanlarda sıfıra bölme olmasın (NULL dönsün). Ortalama oran (1 basamak): <code>ort_oran</code>.', "SELECT ROUND(AVG(100.0 * tip / NULLIF(delivery_fee, 0)), 1) AS ort_oran FROM lk_orders WHERE status = 'teslim';"),
  sq('Sipariş satırı tutarlarının (adet × birim fiyat) yuvarlanmış ortalaması: yukarı (CEIL) ve aşağı (FLOOR) tam sayı: <code>yukari</code>, <code>asagi</code>.', 'SELECT CEIL(AVG(qty * unit_price)) AS yukari, FLOOR(AVG(qty * unit_price)) AS asagi FROM lk_order_lines;')
]);
X('tarih-fn', [
  sq('Lezzet Kurye siparişlerini aya göre say (YYYY-AA): <code>ay</code>, <code>siparis</code>. Aya göre sırala.', "SELECT strftime('%Y-%m', placed_at) AS ay, COUNT(*) AS siparis FROM lk_orders GROUP BY strftime('%Y-%m', placed_at) ORDER BY ay;", O),
  sq('Siparişlerin saat dilimine göre dağılımı: saat (0–23, sayı) ve sipariş sayısı. Saate göre sırala: <code>saat</code>, <code>siparis</code>.', "SELECT CAST(strftime('%H', placed_at) AS INTEGER) AS saat, COUNT(*) AS siparis FROM lk_orders GROUP BY CAST(strftime('%H', placed_at) AS INTEGER) ORDER BY saat;", O),
  sq('Teslim siparişlerde sipariş ile teslim arasındaki ortalama süre (dakika, 1 basamak): <code>ort_dk</code>.', "SELECT ROUND(AVG((julianday(delivered_at) - julianday(placed_at)) * 1440), 1) AS ort_dk FROM lk_orders WHERE status = 'teslim';"),
  sq('Kuryelerin 1 Ocak 2025 itibarıyla kaç gündür çalıştığı; en kıdemli 5 kurye (eşitlikte numara): <code>courier_id</code>, <code>gun</code>.', "SELECT courier_id, julianday('2025-01-01') - julianday(hired_date) AS gun FROM lk_couriers ORDER BY gun DESC, courier_id LIMIT 5;", O)
]);
X('tarih-filtre', [
  sq('Aralık 2024\'ün hafta sonlarında (cumartesi, pazar) verilen sipariş sayısı. SQLite\'ta <code>strftime(\'%w\', ...)</code> pazar için 0, cumartesi için 6 döner: <code>adet</code>.', "SELECT COUNT(*) AS adet FROM lk_orders WHERE placed_at >= '2024-12-01' AND placed_at < '2025-01-01' AND strftime('%w', placed_at) IN ('0', '6');", { dl: ['sqlite'] }),
  sq('Öğle yoğunluğu: 12:00–13:59 arasında verilen siparişlerin sayısı: <code>adet</code>.', "SELECT COUNT(*) AS adet FROM lk_orders WHERE strftime('%H', placed_at) IN ('12', '13');"),
  sq('Kanat Havayolları\'nın 24 Aralık 2024 tarihli (planlanan kalkış) uçuş sayısı. Saatli sütunda gün filtresi: <code>adet</code>.', "SELECT COUNT(*) AS adet FROM hv_flights WHERE sched_dep >= '2024-12-24' AND sched_dep < '2024-12-25';")
]);
X('case', [
  sq('Menü ürünlerini fiyata göre sınıflandır: 100 altı <b>Ekonomik</b>, 100–249 <b>Orta</b>, 250 ve üzeri <b>Premium</b>. Sınıf başına ürün sayısı: <code>sinif</code>, <code>urun</code>.', "SELECT CASE WHEN price < 100 THEN 'Ekonomik' WHEN price < 250 THEN 'Orta' ELSE 'Premium' END AS sinif, COUNT(*) AS urun FROM lk_menu_items GROUP BY CASE WHEN price < 100 THEN 'Ekonomik' WHEN price < 250 THEN 'Orta' ELSE 'Premium' END;"),
  sq('Teslim süresine göre sınıfla: 30 dk ve altı <b>Hızlı</b>, 31–50 <b>Normal</b>, üstü <b>Geç</b> (yalnızca teslim siparişler). Sınıf başına sipariş: <code>sinif</code>, <code>siparis</code>.', `SELECT CASE WHEN ${DK} <= 1800 THEN 'Hızlı' WHEN ${DK} <= 3000 THEN 'Normal' ELSE 'Geç' END AS sinif, COUNT(*) AS siparis FROM lk_orders o WHERE o.status = 'teslim' GROUP BY CASE WHEN ${DK} <= 1800 THEN 'Hızlı' WHEN ${DK} <= 3000 THEN 'Normal' ELSE 'Geç' END;`),
  sq('Koşullu sayım: tek satırda teslim, iptal ve iade sipariş sayıları: <code>teslim</code>, <code>iptal</code>, <code>iade</code>.', "SELECT SUM(CASE WHEN status = 'teslim' THEN 1 ELSE 0 END) AS teslim, SUM(CASE WHEN status = 'iptal' THEN 1 ELSE 0 END) AS iptal, SUM(CASE WHEN status = 'iade' THEN 1 ELSE 0 END) AS iade FROM lk_orders;"),
  sq('Her şehir için premium ve standart müşteri sayılarını yan yana getir: <code>city</code>, <code>premium</code>, <code>standart</code>. Şehre göre sırala.', 'SELECT city, SUM(CASE WHEN is_premium = 1 THEN 1 ELSE 0 END) AS premium, SUM(CASE WHEN is_premium = 0 THEN 1 ELSE 0 END) AS standart FROM lk_customers GROUP BY city ORDER BY city;', O)
]);
X('coalesce', [
  sq('Müşterileri ilçeye göre say; ilçesi boş olanlar <b>Belirtilmemiş</b> grubunda olsun. Yalnızca İzmir: <code>ilce</code>, <code>musteri</code>.', "SELECT COALESCE(district, 'Belirtilmemiş') AS ilce, COUNT(*) AS musteri FROM lk_customers WHERE city = 'İzmir' GROUP BY COALESCE(district, 'Belirtilmemiş');"),
  sq('Kuryelerin puanını getir; puanı olmayanlarda <b>0</b> göster ve en düşük 5\'i listele (eşitlikte numara): <code>courier_id</code>, <code>puan</code>.', 'SELECT courier_id, COALESCE(rating, 0) AS puan FROM lk_couriers ORDER BY puan, courier_id LIMIT 5;', O),
  sq('Restoranların platforma katılma tarihini getir; boşsa <b>bilinmiyor</b> yaz: <code>name</code>, <code>katilim</code>.', "SELECT name, COALESCE(opened_date, 'bilinmiyor') AS katilim FROM lk_restaurants;"),
  sq('Kanat Havayolları\'nda her uçuşun gecikmesi için gerçek kalkış yoksa planlananı kullan; COALESCE ile hesaplanan ortalama gecikme (tüm uçuşlar, 2 basamak): <code>ort</code>.', 'SELECT ROUND(AVG((julianday(COALESCE(actual_dep, sched_dep)) - julianday(sched_dep)) * 1440), 2) AS ort FROM hv_flights;')
]);
X('null-guvenli', [
  sq('Kurye puanı 4\'ten <b>farklı</b> olan kuryelerin sayısı; puanı boş olanlar da “farklı” sayılsın: <code>adet</code>.', 'SELECT COUNT(*) AS adet FROM lk_couriers WHERE rating <> 4 OR rating IS NULL;'),
  sq('İki müşterinin ilçesi aynı mı? Boşları da eşit sayarak 1 ve 2 numaralı müşterileri karşılaştır; eşitse 1, değilse 0: <code>ayni</code>.', 'SELECT CASE WHEN (a.district = b.district) OR (a.district IS NULL AND b.district IS NULL) THEN 1 ELSE 0 END AS ayni FROM lk_customers a, lk_customers b WHERE a.customer_id = 1 AND b.customer_id = 2;')
]);
X('kosullu', [
  sq('Her mutfak türü için toplam restoran ve aktif olmayan restoran sayısı: <code>cuisine</code>, <code>toplam</code>, <code>kapali</code>.', 'SELECT cuisine, COUNT(*) AS toplam, SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) AS kapali FROM lk_restaurants GROUP BY cuisine;'),
  sq('Her ay için kartla, nakitle ve cüzdanla ödenen sipariş sayıları: <code>ay</code>, <code>kart</code>, <code>nakit</code>, <code>cuzdan</code>. Aya göre sırala.', "SELECT strftime('%Y-%m', placed_at) AS ay, SUM(CASE WHEN payment = 'kart' THEN 1 ELSE 0 END) AS kart, SUM(CASE WHEN payment = 'nakit' THEN 1 ELSE 0 END) AS nakit, SUM(CASE WHEN payment = 'cüzdan' THEN 1 ELSE 0 END) AS cuzdan FROM lk_orders GROUP BY strftime('%Y-%m', placed_at) ORDER BY ay;", O),
  sq('Her şehir için iptal oranı (yüzde, 1 basamak): restoranın şehrine göre: <code>city</code>, <code>iptal_orani</code>.', "SELECT r.city, ROUND(100.0 * SUM(CASE WHEN o.status = 'iptal' THEN 1 ELSE 0 END) / COUNT(*), 1) AS iptal_orani FROM lk_orders o JOIN lk_restaurants r ON r.restaurant_id = o.restaurant_id GROUP BY r.city;")
]);
X('collation', [
  sq('Büyük/küçük harf farkını yok sayarak menüde <b>ayran</b> geçen ürünleri bul (LOWER kullan): <code>name</code>, <code>restaurant_id</code>.', "SELECT name, restaurant_id FROM lk_menu_items WHERE LOWER(name) LIKE '%ayran%';"),
  sq('Restoran adlarını alfabetik sırala ve ilk 5\'i getir: <code>name</code>.', 'SELECT name FROM lk_restaurants ORDER BY name LIMIT 5;', O)
]);
X('regex', [
  sq('Yorumu <b>Çok</b> ya da <b>çok</b> ile başlayan değerlendirmelerin sayısı (REGEXP): <code>adet</code>.', "SELECT COUNT(*) AS adet FROM lk_ratings WHERE comment REGEXP '^[Çç]ok';", { dl: ['sqlite', 'mysql'] })
]);

/* ================================ VERİ DEĞİŞTİRME ================================ */
X('dml', [
  sq('Lezzet Kurye\'ye yeni bir kurye ekle: numara 61, ad <b>Ece Tunç</b>, şehir İzmir, araç bisiklet, işe başlama 2024-12-15, puan boş.', "INSERT INTO lk_couriers (courier_id, full_name, city, vehicle, hired_date, rating) VALUES (61, 'Ece Tunç', 'İzmir', 'bisiklet', '2024-12-15', NULL);",
    { check: 'SELECT courier_id, full_name, city, vehicle, hired_date, rating FROM lk_couriers WHERE courier_id >= 60 ORDER BY courier_id', ord: true }),
  sq('Pizza restoranlarının komisyonunu 2 puan artır.', "UPDATE lk_restaurants SET commission_pct = commission_pct + 2 WHERE cuisine = 'Pizza';",
    { check: 'SELECT cuisine, SUM(commission_pct) AS k FROM lk_restaurants GROUP BY cuisine ORDER BY cuisine', ord: true }),
  sq('Ankara\'daki restoranların menü ürünlerini sil.', "DELETE FROM lk_menu_items WHERE restaurant_id IN (SELECT restaurant_id FROM lk_restaurants WHERE city = 'Ankara');",
    { check: 'SELECT COUNT(*) AS urun, COUNT(DISTINCT restaurant_id) AS restoran FROM lk_menu_items' }),
  sq('Tek ifadeyle: teslim edilmiş ama bahşişi 0 olan Aralık siparişlerine 5 TL bahşiş yaz (kampanya).', "UPDATE lk_orders SET tip = 5 WHERE status = 'teslim' AND tip = 0 AND placed_at >= '2024-12-01';",
    { check: 'SELECT SUM(tip) AS toplam, SUM(CASE WHEN tip = 5 THEN 1 ELSE 0 END) AS bes FROM lk_orders' })
]);
X('upsert', [
  sq('Kurye 1\'in kaydını güncelle ya da yoksa ekle (SQLite yazımı): numara 1, ad <b>Oğuz Güneş</b>, şehir İstanbul, araç araba, işe başlama 2023-01-19, puan 4.5. <code>INSERT ... ON CONFLICT (courier_id) DO UPDATE</code> kullan.', "INSERT INTO lk_couriers (courier_id, full_name, city, vehicle, hired_date, rating) VALUES (1, 'Oğuz Güneş', 'İstanbul', 'araba', '2023-01-19', 4.5) ON CONFLICT (courier_id) DO UPDATE SET vehicle = excluded.vehicle, rating = excluded.rating;",
    { base: 'sqlite', dl: ['sqlite'], check: 'SELECT courier_id, vehicle, rating FROM lk_couriers WHERE courier_id = 1' })
]);
X('transaction', [
  sq('Bir işlem içinde kurye 2\'nin şehrini Ankara yap, sonra ROLLBACK ile geri al. Son durumda şehir değişmemiş olmalı.', "BEGIN; UPDATE lk_couriers SET city = 'Ankara' WHERE courier_id = 2; ROLLBACK;",
    { base: 'sqlite', dl: ['sqlite'], check: 'SELECT courier_id, city FROM lk_couriers WHERE courier_id = 2' })
]);

/* ================================ DERİNLEŞ ================================ */
const D = (title, html) => `<h2>Derinleş: ${title}</h2>${html}`;
more('select', D('başka bir veri setinde ilk sorgular', `<p>Aynı kalıp her tabloda çalışır. Lezzet Kurye'nin menüsünden ürün adı, fiyat ve fiyatın %10 zamlı hâli:</p>${C("SELECT name, price, price * 1.10 AS zamli\nFROM lk_menu_items;")}
<table><tr><th>Sık hata</th><th>Neden olur?</th></tr><tr><td><code>SELECT name price FROM ...</code></td><td>Virgül unutulunca <code>price</code>, <code>name</code> sütununun takma adı olur; tek sütun gelir ve hata vermez</td></tr><tr><td><code>SELECT * FROM</code> büyük tabloda</td><td>Gereksiz sütunlar ağ ve bellek yükü yaratır; bulut ambarlarında ücretlendirilir</td></tr><tr><td><code>"İstanbul"</code> ile metin yazmak</td><td>Çift tırnak ad (sütun) içindir; metin tek tırnakla yazılır</td></tr></table>`));
more('alias-distinct', D('DISTINCT nasıl düşünülmeli?', `<p>DISTINCT, seçtiğin <b>tüm sütunların birlikte</b> tekrarsız kombinasyonlarını verir; tek bir sütuna uygulanmaz. Aşağıdaki sorgu “her şehir” değil, “her şehir–mutfak çifti” için bir satır döndürür:</p>${C("SELECT DISTINCT city, cuisine\nFROM lk_restaurants\nORDER BY city, cuisine;")}
<p><code>COUNT(DISTINCT city)</code> ise farklı şehir sayısını verir. DISTINCT çoğu zaman bir JOIN'in satırları beklenmedik biçimde çoğalttığını gizler: sonuçta tekrar görüyorsan önce nedenini anla, DISTINCT'i yara bandı olarak kullanma.</p>`));
more('where', D('koşul yazarken dikkat', `<p>WHERE her satır için ayrı ayrı doğru/yanlış sorusu sorar. Saat içeren sütunlarda (<code>placed_at</code>, <code>sched_dep</code>) gün filtresi için <b>yarı açık aralık</b> kullan:</p>${C("SELECT COUNT(*) AS kasim_siparis\nFROM lk_orders\nWHERE placed_at >= '2024-11-01'\n  AND placed_at <  '2024-12-01';")}
<ul><li><code>placed_at = '2024-11-05'</code> saatli kayıtlarla hiç eşleşmez.</li><li>Sütuna fonksiyon uygulamak (<code>WHERE strftime('%Y', placed_at) = '2024'</code>) çalışır ama indeks kullanımını engelleyebilir; mümkünse aralık yaz.</li><li>Sayı sütununu metinle karşılaştırma (<code>price &gt; '300'</code>) SQL türüne göre farklı sonuç verebilir.</li></ul>`));
more('mantik', D('doğruluk tablosu ve NOT', `<p>NOT, koşulun tamamını tersine çevirir. <code>NOT (A AND B)</code>, <code>NOT A OR NOT B</code> ile aynıdır (De Morgan kuralı). Şu iki sorgu aynı sonucu verir:</p>${C("SELECT COUNT(*) FROM lk_orders WHERE NOT (status = 'teslim' AND payment = 'kart');\nSELECT COUNT(*) FROM lk_orders WHERE status <> 'teslim' OR payment <> 'kart';")}
<p>Parantez yazmak hem hatayı önler hem de okuyan kişiye niyetini gösterir. Bir koşulu yazdıktan sonra küçük bir örnek satır üzerinde sesli dene: “Bu satır gelir mi?”</p>`));
more('in-between-like', D('IN, BETWEEN ve LIKE için ipuçları', `<ul><li><code>IN</code> listesine alt sorgu da yazılabilir: <code>WHERE restaurant_id IN (SELECT restaurant_id FROM lk_restaurants WHERE city = 'İzmir')</code>.</li><li><code>BETWEEN 100 AND 200</code> her iki ucu da kapsar; <code>BETWEEN 200 AND 100</code> hiç satır döndürmez.</li><li><code>LIKE '%burger%'</code> baştaki % yüzünden indeks kullanamaz; büyük tablolarda yavaştır.</li><li>Büyük/küçük harf davranışı SQL türüne göre değişir: PostgreSQL'de LIKE duyarlıdır (ILIKE duyarsızdır), SQL Server'da harmanlamaya bağlıdır.</li></ul>${C("SELECT name, price\nFROM lk_menu_items\nWHERE category IN ('Tatlı', 'İçecek')\n  AND price BETWEEN 50 AND 120\n  AND name LIKE '%a%';")}`));
more('null', D('NULL nerelerde karşına çıkar?', `<table><tr><th>Durum</th><th>Örnek</th><th>Doğru yazım</th></tr><tr><td>Henüz olmamış olay</td><td>İptal edilen siparişin <code>delivered_at</code> değeri</td><td><code>delivered_at IS NULL</code></td></tr><tr><td>Bilinmeyen bilgi</td><td>Müşterinin ilçesi</td><td><code>COALESCE(district, 'Belirtilmemiş')</code></td></tr><tr><td>Uygulanamaz</td><td>Vadesiz hesabın kredi limiti</td><td>Ortalamada payda dikkat: <code>AVG</code> boşları atlar</td></tr></table>
${C("SELECT COUNT(*) AS toplam,\n       COUNT(courier_id) AS kuryeli,\n       COUNT(*) - COUNT(courier_id) AS kuryesiz\nFROM lk_orders;")}
<p>Raporda bir oran hesaplarken paydanın boşları içerip içermediğini her zaman açıkça söyle.</p>`));
more('aggregate', D('toplama fonksiyonlarını birlikte kullanmak', `<p>Tek satırda hem sayıyı hem toplamı hem ortalamayı görmek, verinin genel resmini hızla verir. Lezzet Kurye'nin teslim siparişleri:</p>${C("SELECT COUNT(*)               AS siparis,\n       SUM(tip)               AS toplam_bahsis,\n       ROUND(AVG(tip), 2)     AS ort_bahsis,\n       MIN(placed_at)         AS ilk,\n       MAX(placed_at)         AS son\nFROM lk_orders\nWHERE status = 'teslim';")}
<ul><li>Hiç satır yoksa <code>COUNT</code> 0, <code>SUM</code> ve <code>AVG</code> NULL döner.</li><li>Tam sayı sütunlarında <code>AVG</code> bazı SQL türlerinde tam sayı döndürür (SQL Server); <code>AVG(1.0 * x)</code> güvenlidir.</li><li><code>SUM(DISTINCT x)</code> tekrar eden değerleri bir kez toplar; nadiren istenen şeydir.</li></ul>`));
more('group-by', D('gruplamayı adım adım düşün', `<p>GROUP BY yazmadan önce şu soruyu sor: <b>sonuçta bir satır neyi temsil edecek?</b> “Her şehir” mi, “her şehir ve ay” mı? Sonra SELECT'e yalnızca bu taneciği tanımlayan sütunlar ve toplama fonksiyonları girer.</p>${C("SELECT r.city,\n       strftime('%Y-%m', o.placed_at) AS ay,\n       COUNT(*) AS siparis\nFROM lk_orders o\nJOIN lk_restaurants r ON r.restaurant_id = o.restaurant_id\nGROUP BY r.city, strftime('%Y-%m', o.placed_at)\nORDER BY r.city, ay;")}
<p>Gruplama NULL değerleri tek bir grup olarak toplar; bu grup sonuçta boş bir satır olarak görünür.</p>`));
more('having', D('WHERE mi HAVING mi?', `<p>Karar kuralı basit: koşul <b>tek bir satıra bakarak</b> değerlendirilebiliyorsa WHERE, <b>bir grubun özetine</b> bakmayı gerektiriyorsa HAVING.</p><table><tr><th>Koşul</th><th>Yer</th></tr><tr><td>Durumu teslim olan siparişler</td><td>WHERE</td></tr><tr><td>100'den fazla siparişi olan restoranlar</td><td>HAVING</td></tr><tr><td>Ortalama bahşişi 10 TL'yi aşan kuryeler</td><td>HAVING</td></tr><tr><td>Aralık siparişleri</td><td>WHERE</td></tr></table>
${C("SELECT courier_id, COUNT(*) AS siparis, ROUND(AVG(tip), 2) AS ort_bahsis\nFROM lk_orders\nWHERE status = 'teslim'\nGROUP BY courier_id\nHAVING AVG(tip) > 8\nORDER BY ort_bahsis DESC;")}`));
more('case', D('CASE ile yapılan dört iş', `<ol><li><b>Sınıflandırma:</b> fiyatı bantlara ayırmak.</li><li><b>Koşullu sayım:</b> <code>SUM(CASE WHEN status = 'iptal' THEN 1 ELSE 0 END)</code>.</li><li><b>Özel sıralama:</b> <code>ORDER BY CASE status WHEN 'teslim' THEN 1 WHEN 'iade' THEN 2 ELSE 3 END</code>.</li><li><b>Güvenli bölme:</b> <code>CASE WHEN payda = 0 THEN NULL ELSE pay / payda END</code>.</li></ol>
${C("SELECT status, COUNT(*) AS siparis\nFROM lk_orders\nGROUP BY status\nORDER BY CASE status WHEN 'teslim' THEN 1 WHEN 'iade' THEN 2 ELSE 3 END;")}
<p>CASE'in her dalı aynı tipte değer döndürmelidir; bir dalda sayı, diğerinde metin döndürmek bazı SQL türlerinde hata verir.</p>`));
more('coalesce', D('COALESCE, NULLIF ve ortalamalar', `<p>Aynı veride iki farklı “ortalama kurye puanı” hesaplanabilir; hangisinin doğru olduğu soruya bağlıdır:</p>${C("SELECT ROUND(AVG(rating), 2)              AS puanlilarin_ortalamasi,\n       ROUND(AVG(COALESCE(rating, 0)), 2) AS bos_sifir_sayilirsa\nFROM lk_couriers;")}
<p>İkinci değer daha düşüktür, çünkü puanı olmayan kuryeleri 0 puan almış gibi sayar. Raporda hangisini kullandığını belirt. <code>NULLIF(x, 0)</code> ise tersini yapar: sıfırı “bilinmeyen”e çevirir ve sıfıra bölmeyi önler.</p>`));
more('dml', D('güvenli değişiklik alışkanlıkları', `<ol><li>Önce aynı WHERE ile <b>SELECT</b> çalıştır, kaç satırın etkileneceğini gör.</li><li>Değişikliği bir işlem (transaction) içinde yap; sonucu kontrol edip COMMIT veya ROLLBACK de.</li><li>Toplu silmede önce yedek tablo oluştur: <code>CREATE TABLE yedek AS SELECT ...</code>.</li><li>UPDATE'te başka bir tablodan değer alırken birden çok eşleşme olmadığından emin ol.</li></ol>
${C("SELECT COUNT(*) AS etkilenecek\nFROM lk_orders\nWHERE status = 'teslim' AND tip = 0 AND placed_at >= '2024-12-01';")}`));
more('sorgu-sirasi', D('mantıksal sıra bir örnekte', `<p>Aşağıdaki sorgunun veritabanında nasıl işlendiğini satır satır izle:</p>${C("SELECT r.cuisine, COUNT(*) AS siparis          -- 5: sütunlar\nFROM lk_orders o                                -- 1: tablolar\nJOIN lk_restaurants r ON r.restaurant_id = o.restaurant_id\nWHERE o.status = 'teslim'                       -- 2: satır süzme\nGROUP BY r.cuisine                              -- 3: gruplama\nHAVING COUNT(*) > 300                           -- 4: grup süzme\nORDER BY siparis DESC                           -- 6: sıralama\nLIMIT 3;                                        -- 7: kesme")}
<p>Bu sırayı bilmek, “takma adı neden WHERE'de kullanamıyorum?” ve “pencere fonksiyonu neden WHERE'de olmaz?” sorularının cevabıdır.</p>`));
})();
