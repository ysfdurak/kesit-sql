/* Kesit SQL içerik 26: ikinci kontrol turunda bulunan eksikler
   - çekirdek derslerde en az 5 SQL alıştırması
   - hiç SQL alıştırması olmayan uygulanabilir derslere alıştırma
   - kalan kısa anlatımlara “Derinleş” bölümü, Veri Seti dersine altı veri seti
   - küçük kalan alıştırma bankası konularına yeni görevler */
(function () {
const L = window.SQLP_LESSONS; const LM = id => L.find(l => l.id === id);
const sq = (q, sol, o) => Object.assign({ t: 'sql', q: '<p>' + q + '</p>', sol }, o || {});
const X = (id, list) => { const l = LM(id); if (l) l.ex = (l.ex || []).concat(list); };
const more = (id, html) => { const l = LM(id); if (l) l.body += html; };
const C = (src) => '<pre class="code">' + src.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre>';
const D = (title, html) => `<h2>Derinleş: ${title}</h2>${html}`;
const O = { ord: true };

/* ---------- Çekirdek dersler: en az 5 SQL alıştırması ---------- */
X('veritabani', [
  sq('Kanat Havayolları\'nın tablolarından <code>hv_aircraft</code> tablosunun tüm sütunlarını getir.', 'SELECT * FROM hv_aircraft;'),
  sq('Lezzet Kurye\'de bir siparişin ayrıntısını gör: 1 numaralı siparişin satırlarını getir (<code>lk_order_lines</code>).', 'SELECT * FROM lk_order_lines WHERE order_id = 1;')
]);
X('veri-seti', [
  sq('Dört veri setinin ana tablolarının satır sayılarını tek sonuçta alt alta getir: <code>tablo</code>, <code>satir</code> — orders, bank_txns, hv_flights, lk_orders.', "SELECT 'orders' AS tablo, COUNT(*) AS satir FROM orders UNION ALL SELECT 'bank_txns', COUNT(*) FROM bank_txns UNION ALL SELECT 'hv_flights', COUNT(*) FROM hv_flights UNION ALL SELECT 'lk_orders', COUNT(*) FROM lk_orders;")
]);
X('sozdizimi', [
  sq('Bu sorgu hatalı: <code>SELECT city, COUNT(*) FROM lk_restaurants GROUP city;</code> (BY eksik). Düzelt: <code>city</code>, <code>adet</code>.', 'SELECT city, COUNT(*) AS adet FROM lk_restaurants GROUP BY city;', { start: 'SELECT city, COUNT(*) AS adet FROM lk_restaurants GROUP city;' })
]);
X('araclar', [
  sq('Yorum satırı ekleyerek yaz: <code>-- en pahalı ürün</code> yorumunun altında menünün en yüksek fiyatını getir: <code>en_yuksek</code>.', '-- en pahalı ürün\nSELECT MAX(price) AS en_yuksek FROM lk_menu_items;')
]);
X('metin-birlestir', [
  sq('Her kuryenin aracını ve şehrini tek metin olarak birleştir: <b>motosiklet · İstanbul</b> biçiminde: <code>courier_id</code>, <code>etiket</code>. İlk 5 kurye.', "SELECT courier_id, vehicle || ' · ' || city AS etiket FROM lk_couriers ORDER BY courier_id LIMIT 5;", O)
]);
X('veri-tipleri', [
  sq('Komisyon yüzdesini ondalık kesin sayıya (DECIMAL(5,2)) çevirerek restoranların ortalama komisyonunu getir: <code>ort</code>.', 'SELECT CAST(AVG(commission_pct) AS DECIMAL(5,2)) AS ort FROM lk_restaurants;'),
  sq('Sipariş zamanını tarihe (saatsiz) çevirip Aralık 2024\'ün ilk günündeki sipariş sayısını bul (CAST AS DATE ya da date()): <code>adet</code>.', "SELECT COUNT(*) AS adet FROM lk_orders WHERE date(placed_at) = '2024-12-01';")
]);
X('regex', [
  sq('Yorumlarında rakam geçen değerlendirmelerin sayısı (REGEXP ile <code>[0-9]</code>): <code>adet</code>.', "SELECT COUNT(*) AS adet FROM lk_ratings WHERE comment REGEXP '[0-9]';", { dl: ['sqlite', 'mysql'] })
]);
X('metin-benzerlik', [
  sq('Lezzet Kurye müşteri adlarını büyük harfe çevirip Türkçe karakterleri sadeleştir (REPLACE zinciri; Ç→C, Ğ→G, İ→I, Ö→O, Ş→S, Ü→U) ve sadeleşmiş ad başına tekrar eden ad sayısını bul: <code>tekrar_eden</code>.', "SELECT COUNT(*) AS tekrar_eden FROM (SELECT REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(UPPER(full_name), 'Ç', 'C'), 'Ğ', 'G'), 'İ', 'I'), 'Ö', 'O'), 'Ş', 'S'), 'Ü', 'U') AS anahtar FROM lk_customers GROUP BY 1 HAVING COUNT(*) > 1) t;", { dl: ['sqlite'] }),
  sq('Aynı ada sahip farklı müşteri numaraları: tam adı birden fazla müşteride geçen ad sayısı: <code>ad</code>.', 'SELECT COUNT(*) AS ad FROM (SELECT full_name FROM lk_customers GROUP BY full_name HAVING COUNT(*) > 1) t;')
]);
X('collation', [
  sq('Menü ürün adlarını büyük/küçük harf duyarsız tekilleştir (LOWER) ve kaç farklı ad olduğunu bul: <code>farkli</code>.', 'SELECT COUNT(DISTINCT LOWER(name)) AS farkli FROM lk_menu_items;')
]);
X('sorgu-sirasi', [
  sq('Pencere fonksiyonu WHERE\'de kullanılamaz; dış sorguya taşı. Her şehrin en pahalı ürününü sunan restoranın en pahalı ürünü: önce ürünlere şehir içinde sıra ver, sonra 1\'leri al (eşitlikte ad): <code>city</code>, <code>name</code>, <code>price</code>.', 'WITH s AS (SELECT r.city, m.name, m.price, ROW_NUMBER() OVER (PARTITION BY r.city ORDER BY m.price DESC, m.name) AS rn FROM lk_menu_items m JOIN lk_restaurants r ON r.restaurant_id = m.restaurant_id) SELECT city, name, price FROM s WHERE rn = 1 ORDER BY city;', O),
  sq('DISTINCT, ORDER BY\'dan önce çalışır. Restoranların bulunduğu farklı ilçeleri alfabetik getir; yalnızca İzmir: <code>district</code>.', "SELECT DISTINCT district FROM lk_restaurants WHERE city = 'İzmir' ORDER BY district;", O)
]);
X('stil', [
  sq('Sihirli sayıları açıkla: 400 TL ücretsiz teslimat eşiğini bir CTE\'de adlandır (<code>esik</code>) ve teslimat ücreti ödemeyen sipariş sayısını onunla hesapla: sepeti eşiğin üzerinde olan teslim sipariş sayısı: <code>adet</code>.', "WITH esik AS (SELECT 400 AS tl), s AS (SELECT o.order_id, SUM(ol.qty * ol.unit_price) AS sepet FROM lk_orders o JOIN lk_order_lines ol ON ol.order_id = o.order_id WHERE o.status = 'teslim' GROUP BY o.order_id) SELECT COUNT(*) AS adet FROM s, esik WHERE s.sepet >= esik.tl;"),
  sq('İç içe alt sorguyu CTE ile yeniden yaz: <code>SELECT AVG(n) FROM (SELECT courier_id, COUNT(*) n FROM (SELECT * FROM lk_orders WHERE status = \'teslim\') t GROUP BY courier_id) u</code>. Sonuç (2 basamak): <code>ort</code>.', "WITH teslim AS (SELECT courier_id FROM lk_orders WHERE status = 'teslim'), kurye AS (SELECT courier_id, COUNT(*) AS n FROM teslim GROUP BY courier_id) SELECT ROUND(AVG(n), 2) AS ort FROM kurye;")
]);
X('iliskiler', [
  sq('Bire-çok doğrulaması: her menü ürünü tek bir restorana mı ait? Birden fazla restorana bağlı ürün numarası sayısı (0 beklenir): <code>sorunlu</code>.', 'SELECT COUNT(*) AS sorunlu FROM (SELECT item_id FROM lk_menu_items GROUP BY item_id HAVING COUNT(DISTINCT restaurant_id) > 1) t;'),
  sq('Yabancı anahtar doğrulaması: restoran tablosunda karşılığı olmayan <code>restaurant_id</code> içeren sipariş sayısı (öksüz kayıt): <code>oksuz</code>.', 'SELECT COUNT(*) AS oksuz FROM lk_orders o WHERE NOT EXISTS (SELECT 1 FROM lk_restaurants r WHERE r.restaurant_id = o.restaurant_id);')
]);
X('er-modelleme', [
  sq('Çoka-çok: bir sipariş birden çok ürün, bir ürün birden çok sipariş içerebilir. En az 3 farklı ürün içeren siparişlerin sayısı: <code>siparis</code>.', 'SELECT COUNT(*) AS siparis FROM (SELECT order_id FROM lk_order_lines GROUP BY order_id HAVING COUNT(*) >= 3) t;')
]);
X('lateral', [
  sq('Her kuryenin en son iki teslimatı (ilişkili alt sorgu ya da pencere): yalnızca 1–3 numaralı kuryeler, kurye ve zamana göre azalan: <code>courier_id</code>, <code>order_id</code>, <code>delivered_at</code>.', "WITH s AS (SELECT courier_id, order_id, delivered_at, ROW_NUMBER() OVER (PARTITION BY courier_id ORDER BY delivered_at DESC, order_id DESC) AS rn FROM lk_orders WHERE status = 'teslim' AND courier_id <= 3) SELECT courier_id, order_id, delivered_at FROM s WHERE rn <= 2 ORDER BY courier_id, delivered_at DESC;", O)
]);
X('join-ozet', [
  sq('Banka ve havayolu: hem Ilgaz Bank müşterisi hem Kanat Mil üyesi olan (aynı tam ad ve şehir) kişi sayısı: <code>kisi</code>.', 'SELECT COUNT(*) AS kisi FROM (SELECT DISTINCT b.full_name, b.city FROM bank_customers b JOIN hv_passengers p ON p.full_name = b.full_name AND p.city = b.city) t;')
]);
X('hiyerarsi', [
  sq('Davet ağacında her kökten (davet edilmemiş müşteri) başlayan ağacın büyüklüğü; en büyük 3 ağacın kökü ve kişi sayısı (kök dahil; eşitlikte numara): <code>kok</code>, <code>kisi</code>.', 'WITH RECURSIVE z(kok, customer_id) AS (SELECT customer_id, customer_id FROM lk_customers WHERE referred_by IS NULL UNION ALL SELECT z.kok, c.customer_id FROM lk_customers c JOIN z ON c.referred_by = z.customer_id) SELECT kok, COUNT(*) AS kisi FROM z GROUP BY kok ORDER BY kisi DESC, kok LIMIT 3;', O),
  sq('Davet yolunu metin olarak üret: 1201 numaralı müşteriden köke kadar müşteri numaralarını <b>1201 &gt; 214 &gt; …</b> biçiminde getir: <code>yol</code>.', "WITH RECURSIVE z(customer_id, referred_by, yol) AS (SELECT customer_id, referred_by, CAST(customer_id AS TEXT) FROM lk_customers WHERE customer_id = 1201 UNION ALL SELECT c.customer_id, c.referred_by, z.yol || ' > ' || c.customer_id FROM lk_customers c JOIN z ON c.customer_id = z.referred_by) SELECT yol FROM z WHERE referred_by IS NULL;", { dl: ['sqlite', 'pg'] })
]);
X('takvim', [
  sq('Kanat Havayolları: Aralık 2024\'ün her günü için IST kalkışlı uçuş sayısı; uçuş olmayan gün 0. En az uçuşlu 3 gün (eşitlikte tarih): <code>gun</code>, <code>ucus</code>.', "WITH RECURSIVE t(gun) AS (SELECT '2024-12-01' UNION ALL SELECT date(gun, '+1 day') FROM t WHERE gun < '2024-12-31'), u AS (SELECT date(f.sched_dep) AS gun, COUNT(*) AS ucus FROM hv_flights f JOIN hv_routes r ON r.route_id = f.route_id WHERE r.origin = 'IST' GROUP BY date(f.sched_dep)) SELECT t.gun, COALESCE(u.ucus, 0) AS ucus FROM t LEFT JOIN u ON u.gun = t.gun ORDER BY ucus, t.gun LIMIT 3;", O)
]);
X('son-deger', [
  sq('Lezzet Kurye: her restoranın Aralık 2024\'teki her günü için o güne kadarki son sipariş zamanı; restoran 31 (kapanan restoran) için ilk 3 gün: <code>gun</code>, <code>son_siparis</code>. Güne göre.', "WITH RECURSIVE t(gun) AS (SELECT '2024-12-01' UNION ALL SELECT date(gun, '+1 day') FROM t WHERE gun < '2024-12-03') SELECT t.gun, (SELECT MAX(placed_at) FROM lk_orders o WHERE o.restaurant_id = 31 AND o.placed_at < date(t.gun, '+1 day')) AS son_siparis FROM t ORDER BY t.gun;", O)
]);
X('pencere-cerceve', [
  sq('Her kuryenin teslimatlarında, bir teslimat ile ondan önceki 2 teslimatın ortalama bahşişi (ROWS çerçevesi); kurye 1\'in ilk 5 teslimatı (zamana göre): <code>order_id</code>, <code>tip</code>, <code>ort3</code> (2 basamak).', "SELECT order_id, tip, ROUND(AVG(tip) OVER (ORDER BY delivered_at, order_id ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2) AS ort3 FROM lk_orders WHERE courier_id = 1 AND status = 'teslim' ORDER BY delivered_at, order_id LIMIT 5;", O),
  sq('Menüde her ürün için aynı restoranda fiyatı kendisinden <b>en fazla 50 TL</b> farklı olan ürün sayısı (kendisi dahil); RANGE çerçevesi ya da kendine birleştirme ile. Restoran 1\'in ürünleri, fiyata göre: <code>name</code>, <code>price</code>, <code>yakin</code>.', 'SELECT a.name, a.price, COUNT(*) AS yakin FROM lk_menu_items a JOIN lk_menu_items b ON b.restaurant_id = a.restaurant_id AND b.price BETWEEN a.price - 50 AND a.price + 50 WHERE a.restaurant_id = 1 GROUP BY a.item_id, a.name, a.price ORDER BY a.price, a.name;', O)
]);
X('unpivot', [
  sq('Banka hesaplarının açılış ve kapanış tarihlerini uzun formata çevir (olay türü, tarih) ve 2024 yılındaki olay türlerini say: <code>tur</code>, <code>adet</code>.', "SELECT tur, COUNT(*) AS adet FROM (SELECT 'acilis' AS tur, opened_date AS tarih FROM bank_accounts UNION ALL SELECT 'kapanis', closed_date FROM bank_accounts) t WHERE tarih >= '2024-01-01' AND tarih < '2025-01-01' GROUP BY tur;")
]);
X('rollup', [
  sq('Ödeme yöntemi ve durum için sipariş sayıları, ödeme yöntemi ara toplamları ve genel toplam (ROLLUP): <code>payment</code>, <code>status</code>, <code>siparis</code>.', 'SELECT payment, status, COUNT(*) AS siparis FROM lk_orders GROUP BY ROLLUP (payment, status);', { base: 'tsql', dl: ['tsql', 'pg', 'oracle', 'mysql'], solv: { pg: 'SELECT payment, status, COUNT(*) AS siparis FROM lk_orders GROUP BY ROLLUP (payment, status);', oracle: 'SELECT payment, status, COUNT(*) AS siparis FROM lk_orders GROUP BY ROLLUP (payment, status);', mysql: 'SELECT payment, status, COUNT(*) AS siparis FROM lk_orders GROUP BY payment, status WITH ROLLUP;' } })
]);
X('upsert', [
  sq('Restoran 1\'in menüsüne <b>Ayran</b> ekle; aynı numaralı ürün varsa yalnızca fiyatını 40 yap (SQLite <code>ON CONFLICT</code>). Ürün numarası olarak restoranın Ayran ürününün numarasını kullan.', "INSERT INTO lk_menu_items (item_id, restaurant_id, name, category, price, is_vegetarian) SELECT item_id, 1, 'Ayran', 'İçecek', 40, 1 FROM lk_menu_items WHERE restaurant_id = 1 AND name = 'Ayran' ON CONFLICT (item_id) DO UPDATE SET price = excluded.price;",
    { base: 'sqlite', dl: ['sqlite'], check: "SELECT name, price FROM lk_menu_items WHERE restaurant_id = 1 ORDER BY item_id", ord: true })
]);
X('transaction', [
  sq('Bir işlemde kurye 3\'e ait Aralık iptallerini teslim olarak işaretle, SAVEPOINT al, sonra tüm Aralık iptallerini sil ama savepoint\'e geri dön ve COMMIT et. Son durumda yalnızca ilk güncelleme kalıcı olmalı.', "BEGIN; UPDATE lk_orders SET status = 'teslim' WHERE courier_id = 3 AND status = 'iptal' AND placed_at >= '2024-12-01'; SAVEPOINT s1; DELETE FROM lk_orders WHERE status = 'iptal' AND placed_at >= '2024-12-01'; ROLLBACK TO s1; COMMIT;",
    { base: 'sqlite', dl: ['sqlite'], check: "SELECT status, COUNT(*) AS n FROM lk_orders WHERE placed_at >= '2024-12-01' GROUP BY status ORDER BY status", ord: true })
]);

/* ---------- SQL alıştırması olmayan uygulanabilir dersler ---------- */
X('normalizasyon', [
  sq('Fonksiyonel bağımlılığı veriyle sına: <code>lk_menu_items</code> tablosunda aynı ürün <b>adı</b> farklı kategorilerde geçiyor mu? Birden fazla kategoride görülen ad sayısı (0 ise ad → kategori bağımlılığı tutarlı): <code>ad</code>.', 'SELECT COUNT(*) AS ad FROM (SELECT name FROM lk_menu_items GROUP BY name HAVING COUNT(DISTINCT category) > 1) t;'),
  sq('Tekrarlanan bilgi: restoranın şehrini her siparişte saklasaydık kaç kez tekrar ederdi? Sipariş sayısı ile restoran sayısını yan yana getir: <code>siparis</code>, <code>restoran</code>.', 'SELECT (SELECT COUNT(*) FROM lk_orders) AS siparis, (SELECT COUNT(*) FROM lk_restaurants) AS restoran;'),
  sq('Sipariş satırında birim fiyatın kopyası tutulur (unit_price). Bu bir denormalizasyon mu, yoksa tarihsel kayıt mı? Fiyatı menüdeki güncel fiyattan farklı olan satır sayısı: <code>farkli</code>.', 'SELECT COUNT(*) AS farkli FROM lk_order_lines ol JOIN lk_menu_items m ON m.item_id = ol.item_id WHERE ol.unit_price <> m.price;')
]);
X('de-partition', [
  sq('Bölüm budamasının mantığı: yalnızca Aralık 2024 “bölümünü” okuyan bir sorgu yaz; sütuna fonksiyon uygulamadan aralık filtresiyle Aralık sipariş sayısı: <code>adet</code>.', "SELECT COUNT(*) AS adet FROM lk_orders WHERE placed_at >= '2024-12-01' AND placed_at < '2025-01-01';"),
  sq('Bölüm büyüklüklerini incele: aylık bölümlere ayrılsaydı her ayın satır sayısı ne olurdu? <code>ay</code>, <code>satir</code>. Aya göre.', "SELECT strftime('%Y-%m', placed_at) AS ay, COUNT(*) AS satir FROM lk_orders GROUP BY strftime('%Y-%m', placed_at) ORDER BY ay;", O)
]);
X('dwh-bulut', [
  sq('Yıldız şeması gibi sorgula: olgu tablosu <code>lk_order_lines</code>, boyutlar ürün ve restoran. Mutfak türü ve ürün kategorisine göre teslim satır cirosu (tam sayı); en yüksek 5: <code>cuisine</code>, <code>category</code>, <code>ciro</code>.', "SELECT r.cuisine, m.category, ROUND(SUM(ol.qty * ol.unit_price)) AS ciro FROM lk_order_lines ol JOIN lk_orders o ON o.order_id = ol.order_id JOIN lk_menu_items m ON m.item_id = ol.item_id JOIN lk_restaurants r ON r.restaurant_id = o.restaurant_id WHERE o.status = 'teslim' GROUP BY r.cuisine, m.category ORDER BY ciro DESC, r.cuisine, m.category LIMIT 5;", O),
  sq('Sütun tabanlı depolamada yalnızca gereken sütunlar okunur. Yalnızca iki sütunla: ödeme yöntemine göre toplam bahşiş: <code>payment</code>, <code>bahsis</code>.', 'SELECT payment, SUM(tip) AS bahsis FROM lk_orders GROUP BY payment;')
]);

/* ---------- Kısa anlatımlara Derinleş ---------- */
more('veri-seti', D('altı veri seti', `<p>Uygulamadaki veritabanında birbirinden bağımsız altı hayali şirketin verisi var. Hepsi aynı veritabanında durduğu için bir sorguda istediğin tabloyu kullanabilirsin.</p>
<table><tr><th>Veri seti</th><th>Tablo öneki</th><th>Ne için iyi?</th></tr>
<tr><td>Anadolu Market</td><td>customers, orders, products …</td><td>Temel sorgular, JOIN, ciro hesapları, çalışan hiyerarşisi</td></tr>
<tr><td>Ilgaz Bank</td><td>bank_</td><td>Büyük işlem tablosu, zaman serisi, risk ve döviz</td></tr>
<tr><td>Kanat Havayolları</td><td>hv_</td><td>Saat ve süre hesapları, rotalar, doluluk, gecikme</td></tr>
<tr><td>Lezzet Kurye</td><td>lk_</td><td>Teslimat süreleri, sepet ve komisyon, davet zinciri, NULL içeren durumlar</td></tr>
<tr><td>Pusula İK</td><td>ik_</td><td>Kadro ve devir hızı, ücret bantları, performans, işe alım hunisi, geçmiş (tarihli) tablolar</td></tr>
<tr><td>Pedal İzmir</td><td>bk_</td><td>116.000 satırlık yolculuk tablosu: sorgu planı, indeks, zaman deseni, hava durumu birleştirme</td></tr></table>
${C("SELECT 'Lezzet Kurye' AS veri_seti, COUNT(*) AS siparis FROM lk_orders\nUNION ALL\nSELECT 'Anadolu Market', COUNT(*) FROM orders;")}
<p>Yeni bir veri setiyle karşılaştığında aynı dört soruyu sor: Hangi tablolar var? Her birinde bir satır neyi temsil ediyor? Anahtarlar neler? Hangi sütunlar boş olabilir?</p>`));
more('toplama-tuzak', D('dört tuzak, dört kontrol', `<table><tr><th>Tuzak</th><th>Kontrol</th></tr><tr><td>JOIN sonrası SUM şişer</td><td>Toplamı birleştirmeden önce ve sonra karşılaştır</td></tr><tr><td>AVG boşları atlar</td><td><code>COUNT(*)</code> ile <code>COUNT(x)</code> farkına bak</td></tr><tr><td>Oranların ortalaması</td><td>Toplam pay / toplam payda ile karşılaştır</td></tr><tr><td>COUNT(DISTINCT) ile toplamak</td><td>Taneciği yaz: neyi sayıyorsun?</td></tr></table>
${C("SELECT (SELECT SUM(tip) FROM lk_orders) AS dogru_bahsis,\n       (SELECT SUM(o.tip) FROM lk_orders o JOIN lk_order_lines ol ON ol.order_id = o.order_id) AS sisirilmis;")}`));
more('stil', D('aynı sorgu, iki yazım', `<p>Okunabilir yazım hataları da görünür kılar. Karşılaştır:</p>${C("select r.name,count(*) from lk_orders o,lk_restaurants r where o.restaurant_id=r.restaurant_id and o.status='teslim' group by r.name order by 2 desc")}
${C("SELECT r.name   AS restoran,\n       COUNT(*) AS teslim\nFROM lk_orders o\nJOIN lk_restaurants r\n  ON r.restaurant_id = o.restaurant_id\nWHERE o.status = 'teslim'\nGROUP BY r.name\nORDER BY teslim DESC;")}
<p>İkincisinde birleştirme koşulu ile filtre ayrıdır, çıktı sütunlarının adı vardır ve sıralama sütun numarası yerine adla yapılır. Aynı adlı iki restoran olursa GROUP BY r.name onları birleştirir; restoran numarasını da gruplamaya eklemek daha güvenlidir.</p>`));
more('iliskiler', D('ilişkileri veriyle doğrulamak', `<p>Bir ilişkinin türünü varsaymak yerine sorgula. “Her siparişin en fazla bir değerlendirmesi var mı?” sorusu bire-bir mi bire-çok mu olduğunu söyler:</p>${C("SELECT MAX(n) AS en_fazla_degerlendirme\nFROM (SELECT order_id, COUNT(*) AS n FROM lk_ratings GROUP BY order_id) t;")}
<p>Sonuç 1 ise ilişki siparişten değerlendirmeye bire-birdir (ya da değerlendirme yoktur). Benzer biçimde öksüz kayıtları (karşılığı olmayan yabancı anahtar) NOT EXISTS ile ara.</p>`));
more('first-last', D('son değeri güvenle almak', `<p>Üç yol aynı sonucu verir: sıralamayı tersine çevirip FIRST_VALUE, çerçeveyi genişletip LAST_VALUE ya da ROW_NUMBER ile filtre. En okunur ve hatasız olanı genellikle ilkidir.</p>${C("SELECT DISTINCT restaurant_id,\n       FIRST_VALUE(name) OVER (PARTITION BY restaurant_id ORDER BY price DESC, name) AS en_pahali\nFROM lk_menu_items\nWHERE restaurant_id <= 3;")}`));
more('ardisik-seri', D('takvim günü mü, kayıt mı?', `<p>“Art arda gün” sorularında önce veriyi <b>gün düzeyine</b> indir (DISTINCT), sonra sıra numarası farkını uygula. Aynı gün birden çok kayıt varsa ROW_NUMBER iki kez artar ve seri kırılmış görünür. Saatli zaman damgalarında <code>date(...)</code> ile gün çıkar; gün farkı hesaplarken de saatleri at: <code>julianday(date(b)) - julianday(date(a))</code>.</p>`));
more('upsert', D('upsert ne zaman gerekir?', `<p>Bir kaynaktan gelen verinin bir kısmı hedefte zaten varsa ve tekrar çalıştırmanın aynı sonucu vermesi (idempotency) isteniyorsa upsert kullanılır. Yazımlar:</p><table><tr><th>SQL türü</th><th>Yazım</th></tr><tr><td>PostgreSQL, SQLite</td><td><code>INSERT ... ON CONFLICT (anahtar) DO UPDATE SET ...</code></td></tr><tr><td>MySQL</td><td><code>INSERT ... ON DUPLICATE KEY UPDATE ...</code></td></tr><tr><td>SQL Server, Oracle, BigQuery</td><td><code>MERGE INTO hedef USING kaynak ON ... WHEN MATCHED ... WHEN NOT MATCHED ...</code></td></tr></table><p>ON CONFLICT için çakışmanın bakılacağı sütunda birincil anahtar ya da benzersiz kısıt olmalıdır.</p>`));
more('transaction', D('işlem sınırlarını çizmek', `<p>Birlikte başarılı ya da birlikte başarısız olması gereken adımlar tek bir işlemdir: bir siparişi iptal edip stok iade etmek, bir hesaptan düşüp diğerine eklemek. SAVEPOINT, işlemin bir kısmını geri almanı sağlar. İşlemi kısa tut: açık kalan bir işlem kilitleri tutar ve diğer oturumları bekletir.</p>`));
more('sik-hatalar', '<p>Bu listenin tamamını uygulamalı görmek için <b>Sorgu hata ayıklama</b> dersine geç.</p>');

/* ---------- Küçük kalan alıştırma bankası konuları ---------- */
const PR = window.SQLP_PRACTICE;
const add = (id, L, t, d, title, q, sol, o) => PR.push(Object.assign({ id, L, t, d, title, q: '<p>' + q + '</p>', sol, type: 'sql' }, o || {}));
add('z001', 'temel', 'sec', 1, 'Kurye listesi', 'Kuryelerin adı, şehri ve aracı.', 'SELECT full_name, city, vehicle FROM lk_couriers;');
add('z002', 'temel', 'sec', 1, 'Rota mesafeleri', 'Rotaların kalkış, varış ve mesafe sütunları; takma adlarla: <code>kalkis</code>, <code>varis</code>, <code>km</code>.', 'SELECT origin AS kalkis, dest AS varis, distance_km AS km FROM hv_routes;');
add('z003', 'temel', 'sec', 2, 'Şube açılış yaşı', 'Banka şubelerinin adı ve 2024 itibarıyla kaç yıllık olduğu: <code>name</code>, <code>yas</code>.', 'SELECT name, 2024 - opened_year AS yas FROM bank_branches;');
add('z004', 'temel', 'nul', 1, 'Kuryesiz siparişler', 'Kuryesi olmayan siparişlerin durumlarına göre sayısı: <code>status</code>, <code>adet</code>.', 'SELECT status, COUNT(*) AS adet FROM lk_orders WHERE courier_id IS NULL GROUP BY status;');
add('z005', 'temel', 'nul', 2, 'Puanı olmayan kuryeler', 'Puanı boş olan kuryelerin adı: <code>full_name</code>. Ada göre sırala.', 'SELECT full_name FROM lk_couriers WHERE rating IS NULL ORDER BY full_name;', O);
add('z006', 'temel', 'nul', 2, 'Kapanmamış hesaplar', 'Kapanış tarihi boş olan banka hesaplarının türe göre sayısı: <code>account_type</code>, <code>adet</code>.', 'SELECT account_type, COUNT(*) AS adet FROM bank_accounts WHERE closed_date IS NULL GROUP BY account_type;');
add('z007', 'temel', 'hes', 1, 'Satır tutarı', 'İlk 5 sipariş satırının tutarı (adet × birim fiyat); sipariş ve ürün numarasına göre: <code>order_id</code>, <code>item_id</code>, <code>tutar</code>.', 'SELECT order_id, item_id, qty * unit_price AS tutar FROM lk_order_lines ORDER BY order_id, item_id LIMIT 5;', O);
add('z008', 'temel', 'hes', 2, 'Yaş hesabı', 'Kanat Mil üyelerinin 2024\'teki yaşının ortalaması (1 basamak): <code>ort_yas</code>.', 'SELECT ROUND(AVG(2024 - birth_year), 1) AS ort_yas FROM hv_passengers;');
add('z009', 'temel', 'hes', 2, 'Kâr marjı', 'Kanat Havayolları rotalarının dakika başına km değeri (2 basamak), en yüksek 3: <code>route_id</code>, <code>km_dk</code>.', 'SELECT route_id, ROUND(1.0 * distance_km / block_min, 2) AS km_dk FROM hv_routes ORDER BY km_dk DESC, route_id LIMIT 3;', O);
add('z010', 'temel', 'cas', 1, 'Araç etiketi', 'Kuryeleri motorlu (motosiklet, araba) ve motorsuz (bisiklet) diye grupla ve say: <code>tur</code>, <code>kurye</code>.', "SELECT CASE WHEN vehicle = 'bisiklet' THEN 'motorsuz' ELSE 'motorlu' END AS tur, COUNT(*) AS kurye FROM lk_couriers GROUP BY CASE WHEN vehicle = 'bisiklet' THEN 'motorsuz' ELSE 'motorlu' END;");
add('z011', 'temel', 'cas', 2, 'Puan sınıfı', 'Yemek puanlarını 1–2 <b>kötü</b>, 3 <b>orta</b>, 4–5 <b>iyi</b> diye sınıflandırıp say: <code>sinif</code>, <code>adet</code>.', "SELECT CASE WHEN food_score <= 2 THEN 'kötü' WHEN food_score = 3 THEN 'orta' ELSE 'iyi' END AS sinif, COUNT(*) AS adet FROM lk_ratings GROUP BY CASE WHEN food_score <= 2 THEN 'kötü' WHEN food_score = 3 THEN 'orta' ELSE 'iyi' END;");
add('z012', 'temel', 'cas', 2, 'Uçuş mesafesi sınıfı', 'Rotaları 1000 km altı <b>kısa</b>, 1000–2499 <b>orta</b>, üstü <b>uzun</b> diye sınıflandır: <code>sinif</code>, <code>rota</code>.', "SELECT CASE WHEN distance_km < 1000 THEN 'kısa' WHEN distance_km < 2500 THEN 'orta' ELSE 'uzun' END AS sinif, COUNT(*) AS rota FROM hv_routes GROUP BY CASE WHEN distance_km < 1000 THEN 'kısa' WHEN distance_km < 2500 THEN 'orta' ELSE 'uzun' END;");
add('z013', 'orta', 'kum', 2, 'İki şehirde kurye', 'Hem İstanbul\'da hem Ankara\'da en az bir restorandan sipariş vermiş müşteri sayısı (INTERSECT): <code>musteri</code>.', "SELECT COUNT(*) AS musteri FROM (SELECT o.customer_id FROM lk_orders o JOIN lk_restaurants r ON r.restaurant_id = o.restaurant_id WHERE r.city = 'İstanbul' INTERSECT SELECT o.customer_id FROM lk_orders o JOIN lk_restaurants r ON r.restaurant_id = o.restaurant_id WHERE r.city = 'Ankara') t;");
add('z014', 'orta', 'kum', 2, 'Hiç iadesi olmayan restoran', 'Hiç iade siparişi olmayan restoranların numaraları (EXCEPT): <code>restaurant_id</code>.', "SELECT restaurant_id FROM lk_restaurants EXCEPT SELECT restaurant_id FROM lk_orders WHERE status = 'iade';");
add('z015', 'orta', 'kum', 2, 'Şehir listesi', 'Lezzet Kurye\'de restoran, müşteri ve kurye tablolarında geçen tüm şehirleri tekrarsız getir: <code>city</code>.', 'SELECT city FROM lk_restaurants UNION SELECT city FROM lk_customers UNION SELECT city FROM lk_couriers;');
add('z016', 'orta', 'cte', 2, 'Aylık aktif müşteri', 'CTE ile ay başına sipariş veren farklı müşteri sayısı ve müşteri başına sipariş (2 basamak): <code>ay</code>, <code>aktif</code>, <code>siparis_basina</code>.', "WITH a AS (SELECT strftime('%Y-%m', placed_at) AS ay, customer_id FROM lk_orders) SELECT ay, COUNT(DISTINCT customer_id) AS aktif, ROUND(1.0 * COUNT(*) / COUNT(DISTINCT customer_id), 2) AS siparis_basina FROM a GROUP BY ay ORDER BY ay;", O);
add('z017', 'orta', 'cte', 3, 'En iyi restoranın en iyi ürünü', 'CTE zinciri: en çok teslim siparişi olan restoranı bul, sonra o restoranda en çok satılan ürünü (adet; eşitlikte ad): <code>restoran</code>, <code>urun</code>, <code>adet</code>.', "WITH r AS (SELECT restaurant_id FROM lk_orders WHERE status = 'teslim' GROUP BY restaurant_id ORDER BY COUNT(*) DESC, restaurant_id LIMIT 1), u AS (SELECT m.name, SUM(ol.qty) AS adet FROM lk_order_lines ol JOIN lk_orders o ON o.order_id = ol.order_id JOIN lk_menu_items m ON m.item_id = ol.item_id WHERE o.status = 'teslim' AND o.restaurant_id = (SELECT restaurant_id FROM r) GROUP BY m.name) SELECT (SELECT x.name FROM lk_restaurants x WHERE x.restaurant_id = (SELECT restaurant_id FROM r)) AS restoran, name AS urun, adet FROM u ORDER BY adet DESC, name LIMIT 1;");
add('z018', 'ileri', 'rek', 2, 'Sayı üreteci', 'Özyinelemeli CTE ile 0–23 saatlerini üret ve her saat için sipariş sayısını getir (0 olanlar dahil): <code>saat</code>, <code>siparis</code>.', "WITH RECURSIVE h(saat) AS (SELECT 0 UNION ALL SELECT saat + 1 FROM h WHERE saat < 23) SELECT h.saat, COUNT(o.order_id) AS siparis FROM h LEFT JOIN lk_orders o ON CAST(strftime('%H', o.placed_at) AS INTEGER) = h.saat GROUP BY h.saat ORDER BY h.saat;", O);
add('z019', 'ileri', 'rek', 3, 'Davet kuşakları', 'Davet ağacında her kuşakta (kök = 0) kaç müşteri olduğunu getir: <code>kusak</code>, <code>musteri</code>.', 'WITH RECURSIVE z(customer_id, k) AS (SELECT customer_id, 0 FROM lk_customers WHERE referred_by IS NULL UNION ALL SELECT c.customer_id, z.k + 1 FROM lk_customers c JOIN z ON c.referred_by = z.customer_id) SELECT k AS kusak, COUNT(*) AS musteri FROM z GROUP BY k ORDER BY k;', O);
add('z020', 'ileri', 'ddl', 2, 'Kampanya tablosu', 'Lezzet Kurye için <code>lk_promos</code> tablosu oluştur: promo_id (birincil anahtar, tam sayı), code (boş olamaz, benzersiz metin), pct (indirim yüzdesi, 1–50 arası CHECK), valid_until (tarih). Ardından bir kayıt ekle: 1, \'KIS25\', 25, \'2025-02-28\'.', "CREATE TABLE lk_promos (promo_id INTEGER PRIMARY KEY, code TEXT NOT NULL UNIQUE, pct INTEGER CHECK (pct BETWEEN 1 AND 50), valid_until DATE); INSERT INTO lk_promos (promo_id, code, pct, valid_until) VALUES (1, 'KIS25', 25, '2025-02-28');", { base: 'sqlite', dl: ['sqlite'], check: 'SELECT promo_id, code, pct, valid_until FROM lk_promos' });
add('z021', 'ileri', 'ddl', 2, 'Sütun eklemek', 'Kurye tablosuna <code>phone</code> (metin) sütunu ekle ve kurye 1\'in telefonunu \'555 010 0001\' yap.', "ALTER TABLE lk_couriers ADD COLUMN phone TEXT; UPDATE lk_couriers SET phone = '555 010 0001' WHERE courier_id = 1;", { base: 'sqlite', dl: ['sqlite'], check: 'SELECT courier_id, phone FROM lk_couriers WHERE phone IS NOT NULL' });
add('z022', 'ileri', 'ddl', 3, 'Rapor görünümü', 'Restoran başına teslim sipariş sayısını veren <code>v_restoran_teslim</code> görünümünü (VIEW) oluştur; ardından görünümden en yüksek 3 restoranı getir (eşitlikte numara): <code>restaurant_id</code>, <code>teslim</code>.', "CREATE VIEW v_restoran_teslim AS SELECT restaurant_id, COUNT(*) AS teslim FROM lk_orders WHERE status = 'teslim' GROUP BY restaurant_id; SELECT restaurant_id, teslim FROM v_restoran_teslim ORDER BY teslim DESC, restaurant_id LIMIT 3;", { base: 'sqlite', dl: ['sqlite'], ord: true });

X('araclar', [sq('Editörde birden fazla satıra yayılan bir sorgu yaz: Kanat Havayolları uçak tiplerini tekrarsız ve alfabetik getir: <code>model</code>.', 'SELECT DISTINCT model\nFROM hv_aircraft\nORDER BY model;', O)]);
X('stil', [sq('Anlamlı takma adlarla yeniden yaz: <code>SELECT x.city, AVG(y.tip) FROM lk_restaurants x JOIN lk_orders y ON x.restaurant_id = y.restaurant_id GROUP BY x.city</code>. Restoran şehrine göre ortalama bahşiş (2 basamak): <code>sehir</code>, <code>ort_bahsis</code>.', 'SELECT r.city AS sehir, ROUND(AVG(o.tip), 2) AS ort_bahsis FROM lk_orders o JOIN lk_restaurants r ON r.restaurant_id = o.restaurant_id GROUP BY r.city;')]);
add('z023', 'temel', 'sir', 1, 'En yeni kuryeler', 'En son işe başlayan 5 kurye (eşitlikte numara): <code>full_name</code>, <code>hired_date</code>.', 'SELECT full_name, hired_date FROM lk_couriers ORDER BY hired_date DESC, courier_id LIMIT 5;', O);
add('z024', 'temel', 'sir', 2, 'İkinci sayfa', 'Restoranları ada göre sıralayıp 6.–10. restoranları getir: <code>name</code>.', 'SELECT name FROM lk_restaurants ORDER BY name LIMIT 5 OFFSET 5;', O);
add('z025', 'orta', 'tem', 2, 'Boşlukları temizle', 'Müşteri ilçelerini kırpıp (TRIM) boş metni NULL kabul ederek (NULLIF) ilçesi bilinmeyen müşteri sayısını getir: <code>bilinmeyen</code>.', "SELECT COUNT(*) AS bilinmeyen FROM lk_customers WHERE NULLIF(TRIM(district), '') IS NULL;", { dl: ['sqlite', 'tsql', 'pg', 'mysql', 'bq'] });
add('z026', 'orta', 'tem', 2, 'Aykırı teslim süreleri', 'Teslim süresi 90 dakikayı aşan (olası veri hatası ya da sorun) teslim sipariş sayısı: <code>adet</code>.', "SELECT COUNT(*) AS adet FROM lk_orders WHERE status = 'teslim' AND ROUND((julianday(delivered_at) - julianday(placed_at)) * 86400) > 5400;");
add('z027', 'ileri', 'rek', 3, 'Ay iskeleti', 'Özyinelemeli CTE ile 2024-10 … 2024-12 aylarını üret ve her ayın kayıt olan Lezzet Kurye müşteri sayısını getir (0 dahil): <code>ay</code>, <code>yeni</code>.', "WITH RECURSIVE a(ay) AS (SELECT '2024-10' UNION ALL SELECT strftime('%Y-%m', date(ay || '-01', '+1 month')) FROM a WHERE ay < '2024-12') SELECT a.ay, COUNT(c.customer_id) AS yeni FROM a LEFT JOIN lk_customers c ON strftime('%Y-%m', c.signup_date) = a.ay GROUP BY a.ay ORDER BY a.ay;", { ord: true, dl: ['sqlite'] });
add('z028', 'ileri', 'dml', 2, 'Kapanan restoranın menüsü', 'Aktif olmayan restoranların menü ürünlerini vejetaryen olmayan olarak işaretle (is_vegetarian = 0).', 'UPDATE lk_menu_items SET is_vegetarian = 0 WHERE restaurant_id IN (SELECT restaurant_id FROM lk_restaurants WHERE is_active = 0);', { check: 'SELECT SUM(is_vegetarian) AS veg, COUNT(*) AS urun FROM lk_menu_items' });
add('z029', 'ileri', 'dml', 3, 'Kurye puanını yeniden hesapla', 'Kuryelerin <code>rating</code> sütununu değerlendirmelerdeki kurye puanlarının ortalamasıyla (2 basamak) güncelle; puanı olmayan kurye NULL kalsın.', 'UPDATE lk_couriers SET rating = (SELECT ROUND(AVG(t.courier_score), 2) FROM lk_orders o JOIN lk_ratings t ON t.order_id = o.order_id WHERE o.courier_id = lk_couriers.courier_id);', { check: 'SELECT COUNT(rating) AS puanli, ROUND(AVG(rating), 2) AS ort FROM lk_couriers' });
})();
