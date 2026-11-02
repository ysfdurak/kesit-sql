/* Kesit SQL içerik 34: yapı düzenlemesi
   - 1 dakikada ilk sorgu dersi (ilk-sorgu) ve Temeller sırası: önce sorgu, sonra kavramlar
   - seviye etiketlerinin dengelenmesi (tablo oluşturma, basit JOIN, işlemler, view daha erken)
   - SQL Temelleri patikası: çekirdek dersler + isteğe bağlı derinleşme */
(function () {
const L = window.SQLP_LESSONS; const LM = id => L.find(l => l.id === id);
const sq = (q, sol, o) => Object.assign({ t: 'sql', q: '<p>' + q + '</p>', sol }, o || {});

/* ---------- 1 dakikada ilk sorgu ---------- */
const first = {
  id: 'ilk-sorgu', lv: 'A1', mod: 'Temeller', min: 3,
  title: '1 dakikada ilk sorgun',
  sum: 'Hiçbir şey kurmadan, tarayıcında gerçek bir veritabanına ilk sorgunu yaz ve sonucunu gör.',
  body: `
<h2>Hazırsın</h2>
<p>Bu sayfanın içinde gerçek bir veritabanı çalışıyor. İçinde hayali bir mağazanın, Anadolu Market'in ürünleri, müşterileri ve siparişleri var. Kurulum yok, hesap yok.</p>
<p>Aşağıdaki kutuda <b>Çalıştır</b>'a bas:</p>
<pre class="code">SELECT name, price
FROM products;</pre>
<p>Az önce veritabanına şunu söyledin: “<b>products</b> tablosundan <b>name</b> ve <b>price</b> sütunlarını getir.” SQL'in neredeyse tamamı bu iki kelimenin üstüne kurulur: <code>SELECT</code> neyi istediğini, <code>FROM</code> nereden istediğini söyler.</p>
<div class="tip"><b>Şimdi sıra sende</b>Üstteki <b>1</b> numaralı adıma geç. Kutuda hazır bir sorgu var; çalıştır, sonra küçük bir değişiklik yap. Üç kısa adımın sonunda ilk filtreni de yazmış olacaksın.</div>
`,
  ex: [
    sq('Kutudaki sorgu hazır: tüm ürünleri getiriyor. <b>Kontrol et</b>\'e bas ve sonucu gör.', 'SELECT * FROM products;', { start: 'SELECT * FROM products;', hint: 'Hiçbir şeyi değiştirmeden Kontrol et\'e basman yeterli.', norv: true }),
    sq('Şimdi yalnızca ürün adını (<code>name</code>) ve kategorisini (<code>category</code>) getir. <code>*</code> yerine sütun adlarını virgülle yaz.', 'SELECT name, category FROM products;', { start: 'SELECT * FROM products;', hint: '<code>*</code> “tüm sütunlar” demek. Onu sil ve yerine istediğin iki sütunun adını aralarına virgül koyarak yaz.' }),
    sq('İlk filtren: fiyatı (<code>price</code>) <b>1000\'den büyük</b> ürünlerin adını ve fiyatını getir. Koşul <code>WHERE</code> ile yazılır ve FROM\'dan sonra gelir.', 'SELECT name, price FROM products WHERE price > 1000;', { start: 'SELECT name, price\nFROM products\nWHERE ', hint: 'Koşulu WHERE\'den sonra yaz: önce sütun adı, sonra “büyüktür” işareti (&gt;), sonra sayı.' })
  ]
};
L.splice(0, 0, first);

/* ---------- Temeller sırası: önce sorgu yazmak ---------- */
const moveAfter = (id, after) => { const i = L.findIndex(l => l.id === id); if (i < 0) return; const [x] = L.splice(i, 1); const j = L.findIndex(l => l.id === after); L.splice(j < 0 ? L.length : j + 1, 0, x); };
moveAfter('veri-seti', 'select');
moveAfter('sozdizimi', 'order-limit');
moveAfter('araclar', 'sozdizimi');
moveAfter('tarih', 'araclar');
{ const t = LM('tarih'); if (t) { t.title = 'SQL\'in tarihi: bir makaleden dünya standardına (isteğe bağlı okuma)'; } }

/* ---------- Seviye etiketleri ----------
   Tablo oluşturmak, iki tabloyu birleştirmek ve işlem (transaction) mantığı çoğu müfredatta erken öğretilir.
   Bunlar önceden C1 (İleri) idi; yeni başlayan biri İleri seviyeye kadar tablo oluşturmuyordu. */
const LV = {
  iliskiler: 'A2', 'inner-join': 'A2', 'left-join': 'A2', 'ddl-create': 'A2',
  kisitlar: 'B1', 'alter-drop': 'B1', transaction: 'B1', view: 'B1', normalizasyon: 'B1', upsert: 'B2',
  index: 'B2', sargable: 'B2', 'tasarim-kaliplari': 'B2', 'bv-giris': 'B1', 'bv-plan': 'B2'
};
for (const [id, lv] of Object.entries(LV)) { const l = LM(id); if (l) l.lv = lv; }
/* JOIN ve tablo oluşturma dersleri artık Temel'de: modül sırası da buna uysun */
moveAfter('iliskiler', 'dml');
moveAfter('inner-join', 'iliskiler');
moveAfter('left-join', 'inner-join');
moveAfter('ddl-create', 'left-join');

/* ---------- SQL Temelleri: çekirdek + isteğe bağlı ---------- */
const P = window.SQLP_PATHS.find(p => p.id === 'temel');
if (P) {
  const core = ['ilk-sorgu', 'veritabani', 'select', 'veri-seti', 'alias-distinct', 'hesaplama', 'where', 'mantik', 'in-between-like', 'null', 'order-limit',
    'aggregate', 'group-by', 'having', 'case', 'coalesce', 'kosullu', 'metin', 'sayi-tip', 'tarih-fn', 'tarih-filtre', 'sorgu-sirasi',
    'dml', 'ddl-create', 'kisitlar', 'proje-temel', 'kamp-musteri',
    'iliskiler', 'inner-join', 'left-join', 'self-cross-join', 'coklu-join', 'set-ops', 'subquery', 'correlated', 'cte',
    'window-intro', 'ranking', 'lag-lead', 'frames', 'kamp-eticaret'].filter(id => LM(id));
  const all = P.lessons.slice();
  P.lessons = core;
  P.opt = ['tarih', 'sozdizimi', 'araclar'].concat(all).filter((id, i, a) => LM(id) && !core.includes(id) && a.indexOf(id) === i);
  P.desc = 'Hiç bilmeyenler için: ilk sorgudan tablo oluşturmaya, JOIN, alt sorgu, CTE ve pencere fonksiyonlarına. Yaklaşık 10 saatlik çekirdek; istersen derinleşme dersleri.';
  P.comp = [
    { t: 'İlk adımlar', d: 'İlk sorgu, tablo, satır ve sütun', l: ['ilk-sorgu', 'veritabani', 'select', 'veri-seti'] },
    { t: 'Veri okuma ve filtreleme', d: 'SELECT, WHERE, mantık, desenler, NULL, sıralama', l: ['alias-distinct', 'hesaplama', 'where', 'mantik', 'in-between-like', 'null', 'order-limit'] },
    { t: 'Özetleme', d: 'Toplama, gruplama, koşullu sayım', l: ['aggregate', 'group-by', 'having', 'kosullu', 'sorgu-sirasi'] },
    { t: 'Fonksiyonlar', d: 'Metin, sayı, tarih, CASE ve NULL', l: ['case', 'coalesce', 'metin', 'sayi-tip', 'tarih-fn', 'tarih-filtre'] },
    { t: 'Tablo oluşturmak ve veri değiştirmek', d: 'INSERT, UPDATE, DELETE, CREATE TABLE ve kısıtlar', l: ['dml', 'ddl-create', 'kisitlar'] },
    { t: 'Birleştirme', d: 'İlişkiler ve JOIN türleri, küme işlemleri', l: ['iliskiler', 'inner-join', 'left-join', 'self-cross-join', 'coklu-join', 'set-ops'] },
    { t: 'Bir üst basamak', d: 'Alt sorgu, CTE ve pencere fonksiyonları', l: ['subquery', 'correlated', 'cte', 'window-intro', 'ranking', 'lag-lead', 'frames'] },
    { t: 'Uygula', d: 'Bitirme projesi ve alıştırma kampları', l: ['proje-temel', 'kamp-musteri', 'kamp-eticaret'] }
  ];
}
/* ---------- Alıştırma bankası: çekirdek konuları diğer veri setlerine yay ---------- */
{ const PR = window.SQLP_PRACTICE; const O = { ord: true };
  const a = (id, t, Lv, d, title, q, sol, o) => PR.push(Object.assign({ id, L: Lv, t, d, title, q: '<p>' + q + '</p>', sol, type: 'sql' }, o || {}));
  a('m001', 'fil', 'temel', 1, 'Yüksek komisyon', 'Lezzet Kurye\'de komisyon oranı (<code>commission_pct</code>) yüzde 20 ve üzeri olan restoranların adı, şehri ve oranı.', 'SELECT name, city, commission_pct FROM lk_restaurants WHERE commission_pct >= 20;');
  a('m002', 'fil', 'temel', 2, 'Büyük ATM çekimleri', 'Ilgaz Bank\'ta 5.000 TL ve üzeri ATM işlemlerinin sayısı (tutar negatif olabilir; mutlak değere bak): <code>adet</code>.', "SELECT COUNT(*) AS adet FROM bank_txns WHERE txn_type = 'atm' AND ABS(amount) >= 5000;");
  a('m003', 'fil', 'temel', 2, 'İptal ya da yön değiştiren', 'Kanat Havayolları\'nda iptal edilen ya da başka havalimanına yönlendirilen uçuşların sayısı: <code>adet</code>.', "SELECT COUNT(*) AS adet FROM hv_flights WHERE status IN ('cancelled', 'diverted');");
  a('m004', 'fil', 'temel', 2, 'Uzaktan çalışanlar', 'Pusula İK\'da aktif ve <code>work_mode</code> değeri uzaktan çalışma olan çalışan sayısı. Önce değerlere bak: <code>SELECT DISTINCT work_mode FROM ik_employees</code>. Çıktı: <code>kisi</code>.', "SELECT COUNT(*) AS kisi FROM ik_employees WHERE term_date IS NULL AND work_mode = 'uzaktan';");
  a('m005', 'ozt', 'temel', 1, 'Duruma göre sipariş', 'Lezzet Kurye siparişlerinin duruma göre sayısı, azalan: <code>status</code>, <code>siparis</code>.', 'SELECT status, COUNT(*) AS siparis FROM lk_orders GROUP BY status ORDER BY siparis DESC;', O);
  a('m006', 'ozt', 'temel', 2, 'İşlem türü özeti', 'Ilgaz Bank işlemlerinde türe göre işlem sayısı ve toplam tutar (tam sayı); toplam tutara göre artan: <code>txn_type</code>, <code>adet</code>, <code>toplam</code>.', 'SELECT txn_type, COUNT(*) AS adet, ROUND(SUM(amount)) AS toplam FROM bank_txns GROUP BY txn_type ORDER BY toplam;', O);
  a('m007', 'ozt', 'temel', 2, 'İzin türleri', 'Pusula İK\'da 2024\'te başlayan izinlerin türe göre kayıt sayısı ve toplam gün: <code>leave_type</code>, <code>kayit</code>, <code>gun</code>. Güne göre azalan.', "SELECT leave_type, COUNT(*) AS kayit, SUM(days) AS gun FROM ik_leaves WHERE start_date >= '2024-01-01' AND start_date < '2025-01-01' GROUP BY leave_type ORDER BY gun DESC;", O);
  a('m008', 'ozt', 'orta', 2, 'Az kullanılan bisikletler', 'Pedal İzmir\'de üç ayda 100\'den az yolculuk yapılan bisiklet sayısı: <code>bisiklet</code>.', 'SELECT COUNT(*) AS bisiklet FROM (SELECT bike_id FROM bk_trips GROUP BY bike_id HAVING COUNT(*) < 100) t;');
  a('m009', 'joi', 'orta', 2, 'Mutfağa göre puan', 'Lezzet Kurye\'de mutfak türüne göre ortalama restoran puanı (değerlendirme → sipariş → restoran; 2 basamak), azalan: <code>cuisine</code>, <code>puan</code>. Önce <code>lk_ratings</code> sütunlarına bak.', 'SELECT r.cuisine, ROUND(AVG(t.food_score), 2) AS puan FROM lk_ratings t JOIN lk_orders o ON o.order_id = t.order_id JOIN lk_restaurants r ON r.restaurant_id = o.restaurant_id GROUP BY r.cuisine ORDER BY puan DESC, r.cuisine;', O);
  a('m010', 'joi', 'orta', 2, 'Rota başına uçuş', 'Kanat Havayolları\'nda kalkış–varış çiftine göre uçuş sayısı; en çok uçulan 5 rota (eşitlikte kalkış, varış): <code>origin</code>, <code>dest</code>, <code>ucus</code>.', 'SELECT r.origin, r.dest, COUNT(*) AS ucus FROM hv_flights f JOIN hv_routes r ON r.route_id = f.route_id GROUP BY r.origin, r.dest ORDER BY ucus DESC, r.origin, r.dest LIMIT 5;', O);
  a('m011', 'tar', 'temel', 2, 'Saatlik yoğunluk', 'Pedal İzmir\'de Temmuz 2024\'te başlayan yolculukların başlangıç saatine (0–23) göre sayısı: <code>saat</code>, <code>yolculuk</code>.', "SELECT CAST(strftime('%H', started_at) AS INTEGER) AS saat, COUNT(*) AS yolculuk FROM bk_trips WHERE started_at >= '2024-07-01' AND started_at < '2024-08-01' GROUP BY CAST(strftime('%H', started_at) AS INTEGER) ORDER BY saat;", O);
  a('m012', 'tar', 'orta', 2, 'İşe giriş ayı', 'Pusula İK\'da 2024\'te işe girenlerin aylara göre sayısı: <code>ay</code>, <code>giris</code>.', "SELECT strftime('%Y-%m', hire_date) AS ay, COUNT(*) AS giris FROM ik_employees WHERE hire_date >= '2024-01-01' AND hire_date < '2025-01-01' GROUP BY strftime('%Y-%m', hire_date) ORDER BY ay;", O);
}
})();
