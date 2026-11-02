/* Kesit SQL içerik 29: İK (Pusula) ve bisiklet (Pedal İzmir) verisiyle çekirdek ve mülakat derslerine pekiştirme alıştırmaları */
(function () {
const L = window.SQLP_LESSONS; const LM = id => L.find(l => l.id === id);
const sq = (q, sol, o) => Object.assign({ t: 'sql', q: '<p>' + q + '</p>', sol }, o || {});
const X = (id, list) => { const l = LM(id); if (l) l.ex = (l.ex || []).concat(list); };
const O = { ord: true };
const DEPT = 'JOIN ik_positions p ON p.position_id = e.position_id JOIN ik_departments d ON d.dept_id = p.dept_id';
const CUR = 'SELECT s.emp_id, s.monthly_gross FROM ik_salaries s WHERE s.effective_date = (SELECT MAX(x.effective_date) FROM ik_salaries x WHERE x.emp_id = s.emp_id)';

X('veri-seti', [
  sq('Yeni iki veri setini tanı: Pusula İK\'nın çalışan sayısı ve Pedal İzmir\'in yolculuk sayısını tek satırda getir: <code>calisan</code>, <code>yolculuk</code>.', 'SELECT (SELECT COUNT(*) FROM ik_employees) AS calisan, (SELECT COUNT(*) FROM bk_trips) AS yolculuk;')
]);
X('where', [
  sq('Pusula İK: 2024\'te <b>gönüllü</b> ayrılan çalışanların adı ve ayrılma nedeni; ayrılma tarihine göre ilk 5: <code>full_name</code>, <code>term_reason</code>, <code>term_date</code>.', "SELECT full_name, term_reason, term_date FROM ik_employees WHERE term_type = 'gönüllü' AND term_date >= '2024-01-01' AND term_date < '2025-01-01' ORDER BY term_date, emp_id LIMIT 5;", O)
]);
X('null', [
  sq('Pusula İK: değerlendirmesinde potansiyel alanı <b>boş</b> olan 2024 kayıtlarının sayısı: <code>bos</code>.', 'SELECT COUNT(*) AS bos FROM ik_reviews WHERE review_year = 2024 AND potential IS NULL;'),
  sq('Pedal İzmir: bitiş istasyonu bilinmeyen (kapanmamış) yolculukların sayısı ve bunların ücreti olan kısmı: <code>kapanmamis</code>, <code>ucretli</code>.', 'SELECT COUNT(*) AS kapanmamis, COUNT(fare) AS ucretli FROM bk_trips WHERE end_station IS NULL;')
]);
X('aggregate', [
  sq('Pusula İK: tüm maaş kayıtlarında en düşük, en yüksek ve ortalama aylık brüt (tam sayı): <code>en_dusuk</code>, <code>en_yuksek</code>, <code>ort</code>.', 'SELECT MIN(monthly_gross) AS en_dusuk, MAX(monthly_gross) AS en_yuksek, ROUND(AVG(monthly_gross)) AS ort FROM ik_salaries;')
]);
X('inner-join', [
  sq('Pusula İK: aktif çalışanların bölüme göre sayısı (çalışan → pozisyon → bölüm): <code>name</code>, <code>kisi</code>. Azalan.', `SELECT d.name, COUNT(*) AS kisi FROM ik_employees e ${DEPT} WHERE e.term_date IS NULL GROUP BY d.dept_id, d.name ORDER BY kisi DESC, d.name;`, O)
]);
X('group-by', [
  sq('Pusula İK: yıllara göre ayrılan kişi sayısı, gönüllü ve gönülsüz ayrı sütunlarda: <code>yil</code>, <code>gonullu</code>, <code>gonulsuz</code>.', "SELECT strftime('%Y', term_date) AS yil, SUM(CASE WHEN term_type = 'gönüllü' THEN 1 ELSE 0 END) AS gonullu, SUM(CASE WHEN term_type = 'gönülsüz' THEN 1 ELSE 0 END) AS gonulsuz FROM ik_employees WHERE term_date IS NOT NULL GROUP BY strftime('%Y', term_date) ORDER BY yil;", O),
  sq('Pedal İzmir: bisiklet modeline göre yolculuk sayısı ve toplam mesafe (tam sayı km): <code>model</code>, <code>yolculuk</code>, <code>km</code>.', 'SELECT b.model, COUNT(*) AS yolculuk, ROUND(SUM(t.distance_km)) AS km FROM bk_trips t JOIN bk_bikes b ON b.bike_id = t.bike_id GROUP BY b.model;')
]);
X('having', [
  sq('Pusula İK: 2024\'te en az 20 gün <b>hastalık</b> izni kullanan çalışan sayısı: <code>kisi</code>.', "SELECT COUNT(*) AS kisi FROM (SELECT emp_id FROM ik_leaves WHERE leave_type = 'hastalık' AND start_date >= '2024-01-01' GROUP BY emp_id HAVING SUM(days) >= 20) t;"),
  sq('Pedal İzmir: üç ayda 100\'den fazla yolculuk yapan kullanıcılar ve yolculuk sayıları: <code>user_id</code>, <code>yolculuk</code>. Azalan; eşitlikte kullanıcı numarası.', 'SELECT user_id, COUNT(*) AS yolculuk FROM bk_trips GROUP BY user_id HAVING COUNT(*) > 100 ORDER BY yolculuk DESC, user_id;', O)
]);
X('case', [
  sq('Pusula İK: aktif çalışanları 31.12.2024 itibarıyla kıdem grubuna ayır (1 yıldan az, 1–3, 3–5, 5+ yıl; yıl = gün / 365.25): <code>grup</code>, <code>kisi</code>.', "SELECT CASE WHEN g < 1 THEN '1 yıldan az' WHEN g < 3 THEN '1-3' WHEN g < 5 THEN '3-5' ELSE '5+' END AS grup, COUNT(*) AS kisi FROM (SELECT (julianday('2024-12-31') - julianday(hire_date)) / 365.25 AS g FROM ik_employees WHERE term_date IS NULL) t GROUP BY CASE WHEN g < 1 THEN '1 yıldan az' WHEN g < 3 THEN '1-3' WHEN g < 5 THEN '3-5' ELSE '5+' END;")
]);
X('left-join', [
  sq('Pusula İK: 2024\'te hiç eğitim kaydı olmayan aktif çalışan sayısı (LEFT JOIN ile): <code>kisi</code>.', "SELECT COUNT(*) AS kisi FROM ik_employees e LEFT JOIN ik_training t ON t.emp_id = e.emp_id AND t.completed_date >= '2024-01-01' WHERE e.term_date IS NULL AND t.emp_id IS NULL;"),
  sq('Pusula İK: 2024-Q4 anketine katılmayan aktif çalışanların oranı (yüzde, 1 basamak): <code>katilmayan</code>.', "SELECT ROUND(100.0 * SUM(CASE WHEN s.emp_id IS NULL THEN 1 ELSE 0 END) / COUNT(*), 1) AS katilmayan FROM ik_employees e LEFT JOIN ik_survey s ON s.emp_id = e.emp_id AND s.wave = '2024-Q4' WHERE e.term_date IS NULL;")
]);
X('self-cross-join', [
  sq('Pusula İK: çalışan ile yöneticisini eşleştir; aktif çalışanlardan yöneticisi <b>ayrılmış</b> görünenler (veri kalitesi): <code>calisan</code>, <code>yonetici</code>.', 'SELECT e.full_name AS calisan, m.full_name AS yonetici FROM ik_employees e JOIN ik_employees m ON m.emp_id = e.manager_id WHERE e.term_date IS NULL AND m.term_date IS NOT NULL ORDER BY e.full_name;', O),
  sq('Pusula İK: yöneticisinden <b>önce</b> işe girmiş aktif çalışan sayısı: <code>kisi</code>.', 'SELECT COUNT(*) AS kisi FROM ik_employees e JOIN ik_employees m ON m.emp_id = e.manager_id WHERE e.term_date IS NULL AND e.hire_date < m.hire_date;')
]);
X('subquery', [
  sq('Pusula İK: güncel maaşı şirket ortalamasının üstünde olan aktif çalışan sayısı (aktiflerin güncel maaş ortalamasına göre): <code>kisi</code>.', `WITH c AS (${CUR}) SELECT COUNT(*) AS kisi FROM ik_employees e JOIN c ON c.emp_id = e.emp_id WHERE e.term_date IS NULL AND c.monthly_gross > (SELECT AVG(c2.monthly_gross) FROM c c2 JOIN ik_employees e2 ON e2.emp_id = c2.emp_id WHERE e2.term_date IS NULL);`),
  sq('Pedal İzmir: ortalama mesafenin iki katından uzun yolculukların sayısı: <code>uzun</code>.', 'SELECT COUNT(*) AS uzun FROM bk_trips WHERE distance_km > 2 * (SELECT AVG(distance_km) FROM bk_trips);')
]);
X('correlated', [
  sq('Pusula İK: kendi bölümünün 2024 ortalama performans puanından <b>yüksek</b> puan alan çalışan sayısı (ilişkili alt sorgu). İpucu: önce her değerlendirmeye bölümünü ekleyen ve bölüm ortalamalarını tutan iki CTE hazırla; alt sorgu küçük ortalama tablosuna baksın: <code>kisi</code>.', 'WITH r AS (SELECT r.rating, p.dept_id FROM ik_reviews r JOIN ik_employees e ON e.emp_id = r.emp_id JOIN ik_positions p ON p.position_id = e.position_id WHERE r.review_year = 2024), b AS (SELECT dept_id, AVG(rating) AS ort FROM r GROUP BY dept_id) SELECT COUNT(*) AS kisi FROM r WHERE r.rating > (SELECT b.ort FROM b WHERE b.dept_id = r.dept_id);'),
  sq('Pusula İK: hiç terfi kaydı olmayan ve 5 yıldan uzun süredir (31.12.2024) çalışan aktif kişi sayısı (NOT EXISTS): <code>kisi</code>.', "SELECT COUNT(*) AS kisi FROM ik_employees e WHERE e.term_date IS NULL AND e.hire_date < '2019-12-31' AND NOT EXISTS (SELECT 1 FROM ik_job_history j WHERE j.emp_id = e.emp_id AND j.change_type = 'terfi');")
]);
X('cte', [
  sq('Pusula İK: bölüme göre ortalama güncel maaş ve şirket ortalamasına oranı (aktifler; 2 basamak): <code>name</code>, <code>ort</code> (tam sayı), <code>oran</code>. Orana göre azalan.', `WITH c AS (${CUR}), b AS (SELECT d.name, AVG(c.monthly_gross) AS ort FROM ik_employees e JOIN c ON c.emp_id = e.emp_id ${DEPT} WHERE e.term_date IS NULL GROUP BY d.dept_id, d.name) SELECT name, ROUND(ort) AS ort, ROUND(ort / (SELECT AVG(ort) FROM b), 2) AS oran FROM b ORDER BY oran DESC, name;`, O),
  sq('Pedal İzmir: önce günlük yolculuk sayılarını hesapla, sonra en yoğun ve en sakin günü ve sayılarını tek satırda getir: <code>en_yogun</code>, <code>en_sakin</code>.', 'WITH g AS (SELECT date(started_at) AS gun, COUNT(*) AS n FROM bk_trips GROUP BY date(started_at)) SELECT MAX(n) AS en_yogun, MIN(n) AS en_sakin FROM g;')
]);
X('recursive-cte', [
  sq('Pusula İK: bölüm ağacı. Genel Müdürlük\'ten başlayarak her bölümün derinliği (Genel Müdürlük 0): <code>name</code>, <code>derinlik</code>. Derinlik, ad.', 'WITH RECURSIVE t(dept_id, name, derinlik) AS (SELECT dept_id, name, 0 FROM ik_departments WHERE parent_id IS NULL UNION ALL SELECT d.dept_id, d.name, t.derinlik + 1 FROM ik_departments d JOIN t ON d.parent_id = t.dept_id) SELECT name, derinlik FROM t ORDER BY derinlik, name;', O),
  sq('Pusula İK: Rıza Karabulut\'a (doğrudan veya dolaylı) bağlı aktif çalışan sayısı: <code>kisi</code>.', "WITH RECURSIVE o(emp_id) AS (SELECT emp_id FROM ik_employees WHERE full_name = 'Rıza Karabulut' UNION ALL SELECT e.emp_id FROM ik_employees e JOIN o ON e.manager_id = o.emp_id WHERE e.term_date IS NULL) SELECT COUNT(*) - 1 AS kisi FROM o;")
]);
X('window-intro', [
  sq('Pusula İK: her aktif çalışanın güncel maaşının kendi bölüm ortalamasından farkı; Finans bölümünde farkı en büyük 3 kişi (tam sayı): <code>full_name</code>, <code>maas</code>, <code>fark</code>.', `WITH c AS (${CUR}), w AS (SELECT e.full_name, e.emp_id, d.name, c.monthly_gross AS maas, c.monthly_gross - AVG(c.monthly_gross) OVER (PARTITION BY d.dept_id) AS fark FROM ik_employees e JOIN c ON c.emp_id = e.emp_id ${DEPT} WHERE e.term_date IS NULL) SELECT full_name, maas, ROUND(fark) AS fark FROM w WHERE name = 'Finans' ORDER BY fark DESC, emp_id LIMIT 3;`, O)
]);
X('ranking', [
  sq('Pusula İK: her bölümde en uzun kıdemli aktif çalışan (ROW_NUMBER; eşitlikte sicil): <code>name</code>, <code>full_name</code>, <code>hire_date</code>. Bölüm adına göre.', `WITH r AS (SELECT d.name, e.full_name, e.hire_date, ROW_NUMBER() OVER (PARTITION BY d.dept_id ORDER BY e.hire_date, e.emp_id) AS rn FROM ik_employees e ${DEPT} WHERE e.term_date IS NULL) SELECT name, full_name, hire_date FROM r WHERE rn = 1 ORDER BY name;`, O),
  sq('Pedal İzmir: istasyonları başlayan yolculuk sayısına göre DENSE_RANK ile sırala; ilk 3 sıradakiler: <code>name</code>, <code>yolculuk</code>, <code>sira</code>.', 'WITH s AS (SELECT start_station, COUNT(*) AS n FROM bk_trips GROUP BY start_station), r AS (SELECT st.name, s.n, DENSE_RANK() OVER (ORDER BY s.n DESC) AS sira FROM s JOIN bk_stations st ON st.station_id = s.start_station) SELECT name, n AS yolculuk, sira FROM r WHERE sira <= 3 ORDER BY sira, name;', O)
]);
X('lag-lead', [
  sq('Pusula İK: maaş geçmişinde bir önceki kayda göre artış; 2024 kayıtlarında ortalama artış yüzdesi, nedene göre (1 basamak): <code>reason</code>, <code>artis</code>.', "WITH s AS (SELECT emp_id, effective_date, reason, monthly_gross, LAG(monthly_gross) OVER (PARTITION BY emp_id ORDER BY effective_date) AS onceki FROM ik_salaries) SELECT reason, ROUND(AVG(100.0 * (monthly_gross - onceki) / onceki), 1) AS artis FROM s WHERE onceki IS NOT NULL AND effective_date >= '2024-01-01' GROUP BY reason ORDER BY artis DESC;", O),
  sq('Pedal İzmir: veri kalitesi. 1–14 Temmuz 2024\'te başlayan yolculuklarda, aynı kullanıcının <b>önceki</b> yolculuğu bitmeden başlayan (aynı anda iki bisiklet) yolculukların sayısı (LAG): <code>cakisan</code>.', "WITH t AS (SELECT user_id, started_at, LAG(ended_at) OVER (PARTITION BY user_id ORDER BY started_at, trip_id) AS onceki_son FROM bk_trips WHERE started_at >= '2024-07-01' AND started_at < '2024-07-15') SELECT COUNT(*) AS cakisan FROM t WHERE started_at < onceki_son;")
]);
X('frames', [
  sq('Pusula İK: 2024\'te aylık işe giriş sayısı ve yıl içi kümülatif toplamı: <code>ay</code>, <code>giris</code>, <code>kumulatif</code>.', "WITH m AS (SELECT strftime('%Y-%m', hire_date) AS ay, COUNT(*) AS giris FROM ik_employees WHERE hire_date >= '2024-01-01' AND hire_date < '2025-01-01' GROUP BY strftime('%Y-%m', hire_date)) SELECT ay, giris, SUM(giris) OVER (ORDER BY ay ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS kumulatif FROM m ORDER BY ay;", O),
  sq('Pedal İzmir: Temmuz 2024 günlük yolculuk sayısı ve 3 günlük merkezî hareketli ortalama (önceki, kendisi, sonraki; 1 basamak); ilk 5 gün: <code>gun</code>, <code>n</code>, <code>ort3</code>.', "WITH g AS (SELECT date(started_at) AS gun, COUNT(*) AS n FROM bk_trips WHERE started_at >= '2024-07-01' AND started_at < '2024-08-01' GROUP BY date(started_at)) SELECT gun, n, ROUND(AVG(n) OVER (ORDER BY gun ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING), 1) AS ort3 FROM g ORDER BY gun LIMIT 5;", O)
]);
X('ntile-dist', [
  sq('Pusula İK: aktif çalışanların güncel maaşını 10 dilime ayır (NTILE); her dilimin en düşük ve en yüksek maaşı: <code>dilim</code>, <code>en_dusuk</code>, <code>en_yuksek</code>.', `WITH c AS (${CUR}), d AS (SELECT c.monthly_gross AS m, NTILE(10) OVER (ORDER BY c.monthly_gross, c.emp_id) AS dilim FROM ik_employees e JOIN c ON c.emp_id = e.emp_id WHERE e.term_date IS NULL) SELECT dilim, MIN(m) AS en_dusuk, MAX(m) AS en_yuksek FROM d GROUP BY dilim ORDER BY dilim;`, O),
  sq('Pusula İK: en üst %10 ile en alt %10 dilimin ortalama maaş oranı (“90/10 oranı”, 2 basamak): <code>oran</code>.', `WITH c AS (${CUR}), d AS (SELECT c.monthly_gross AS m, NTILE(10) OVER (ORDER BY c.monthly_gross, c.emp_id) AS dilim FROM ik_employees e JOIN c ON c.emp_id = e.emp_id WHERE e.term_date IS NULL) SELECT ROUND(AVG(CASE WHEN dilim = 10 THEN m END) / AVG(CASE WHEN dilim = 1 THEN m END), 2) AS oran FROM d;`)
]);
X('takvim', [
  sq('Pedal İzmir: Haziran 2024\'ün her günü için (takvim CTE\'siyle) 3 numaralı istasyondan başlayan yolculuk sayısı; hiç yolculuk olmayan günler 0. Yolculuksuz gün sayısı: <code>bos_gun</code>.', "WITH RECURSIVE k(gun) AS (SELECT '2024-06-01' UNION ALL SELECT date(gun, '+1 day') FROM k WHERE gun < '2024-06-30'), y AS (SELECT date(started_at) AS gun, COUNT(*) AS n FROM bk_trips WHERE start_station = 3 AND started_at < '2024-07-01' GROUP BY date(started_at)) SELECT SUM(CASE WHEN y.n IS NULL THEN 1 ELSE 0 END) AS bos_gun FROM k LEFT JOIN y ON y.gun = k.gun;"),
  sq('Pusula İK: 2024\'ün her ayı için (takvim CTE\'siyle) ay içinde başlayan izin kaydı sayısı: <code>ay</code>, <code>izin</code>.', "WITH RECURSIVE k(ay) AS (SELECT '2024-01' UNION ALL SELECT strftime('%Y-%m', date(ay || '-01', '+1 month')) FROM k WHERE ay < '2024-12') SELECT k.ay, COUNT(l.leave_id) AS izin FROM k LEFT JOIN ik_leaves l ON strftime('%Y-%m', l.start_date) = k.ay GROUP BY k.ay ORDER BY k.ay;", { ord: true, dl: ['sqlite', 'mysql', 'oracle', 'bq'] })
]);
X('son-deger', [
  sq('Pusula İK: “belli bir tarihteki değer” kalıbı. 30 Haziran 2023\'te aktif olan çalışanların o tarihteki maaşlarının ortalaması (tam sayı): <code>ort</code>.', "SELECT ROUND(AVG(m)) AS ort FROM (SELECT e.emp_id, (SELECT s.monthly_gross FROM ik_salaries s WHERE s.emp_id = e.emp_id AND s.effective_date <= '2023-06-30' ORDER BY s.effective_date DESC LIMIT 1) AS m FROM ik_employees e WHERE e.hire_date <= '2023-06-30' AND (e.term_date IS NULL OR e.term_date > '2023-06-30')) t;")
]);
X('zaman-araligi', [
  sq('Pusula İK: görev geçmişi bir aralık tablosudur. 1 Ocak 2022\'de her çalışanın bulunduğu pozisyon (start ≤ tarih ve bitiş boş ya da tarihten sonra); o tarihte pozisyonu olan kişi sayısı: <code>kisi</code>.', "SELECT COUNT(*) AS kisi FROM ik_job_history WHERE start_date <= '2022-01-01' AND (end_date IS NULL OR end_date > '2022-01-01');"),
  sq('Pedal İzmir: 15 Temmuz 2024 saat 18:00:00 anında yolda olan (başlamış, bitmemiş) bisiklet sayısı: <code>yolda</code>.', "SELECT COUNT(*) AS yolda FROM bk_trips WHERE started_at <= '2024-07-15 18:00:00' AND ended_at > '2024-07-15 18:00:00' AND started_at >= '2024-07-14';")
]);
X('mk-oran', [
  sq('Mülakat klasiği, İK: 2024 devir oranı = 2024\'te ayrılan / ortalama kadro, ortalama kadro = (1 Ocak + 31 Aralık kadrosu) / 2 (yüzde, 1 basamak): <code>devir</code>.', "SELECT ROUND(100.0 * (SELECT COUNT(*) FROM ik_employees WHERE term_date >= '2024-01-01' AND term_date < '2025-01-01') / (((SELECT COUNT(*) FROM ik_employees WHERE hire_date <= '2024-01-01' AND (term_date IS NULL OR term_date > '2024-01-01')) + (SELECT COUNT(*) FROM ik_employees WHERE hire_date <= '2024-12-31' AND (term_date IS NULL OR term_date > '2024-12-31'))) / 2.0), 1) AS devir;"),
  sq('İK hunisi: kaynağa göre adayların işe alınma oranı (yüzde, 2 basamak): <code>source</code>, <code>aday</code>, <code>oran</code>. Orana göre azalan.', "SELECT source, COUNT(*) AS aday, ROUND(100.0 * SUM(CASE WHEN stage = 'işe alındı' THEN 1 ELSE 0 END) / COUNT(*), 2) AS oran FROM ik_candidates GROUP BY source ORDER BY oran DESC, source;", O)
]);
X('mk-medyan', [
  sq('Mülakat klasiği, İK: aktif çalışanların güncel maaşının <b>medyanı</b> (ROW_NUMBER ve COUNT ile; çift sayıda ise iki ortadakinin ortalaması): <code>medyan</code>.', `WITH c AS (${CUR}), s AS (SELECT c.monthly_gross AS m, ROW_NUMBER() OVER (ORDER BY c.monthly_gross, c.emp_id) AS rn, COUNT(*) OVER () AS n FROM ik_employees e JOIN c ON c.emp_id = e.emp_id WHERE e.term_date IS NULL) SELECT ROUND(AVG(m)) AS medyan FROM s WHERE rn IN (FLOOR((n + 1) / 2.0), FLOOR((n + 2) / 2.0));`),
  sq('Pedal İzmir: Temmuz 2024\'te başlayan kapanmış yolculukların süre medyanı (saniye): <code>medyan_sn</code>.', "WITH s AS (SELECT ROUND((julianday(ended_at) - julianday(started_at)) * 86400) AS sn, ROW_NUMBER() OVER (ORDER BY ROUND((julianday(ended_at) - julianday(started_at)) * 86400), trip_id) AS rn, COUNT(*) OVER () AS n FROM bk_trips WHERE ended_at IS NOT NULL AND started_at >= '2024-07-01' AND started_at < '2024-08-01') SELECT AVG(sn) AS medyan_sn FROM s WHERE rn IN (FLOOR((n + 1) / 2.0), FLOOR((n + 2) / 2.0));")
]);
X('mk-zaman', [
  sq('Mülakat klasiği, bisiklet: haftalık yolculuk sayısı ve önceki haftaya göre değişim yüzdesi (1 basamak); hafta = pazartesi başlangıcı (SQLite): <code>hafta</code>, <code>yolculuk</code>, <code>degisim</code>. İlk 5 hafta.', "WITH w AS (SELECT date(started_at, '-' || ((CAST(strftime('%w', started_at) AS INTEGER) + 6) % 7) || ' days') AS hafta, COUNT(*) AS yolculuk FROM bk_trips GROUP BY 1) SELECT hafta, yolculuk, ROUND(100.0 * (yolculuk - LAG(yolculuk) OVER (ORDER BY hafta)) / LAG(yolculuk) OVER (ORDER BY hafta), 1) AS degisim FROM w ORDER BY hafta LIMIT 5;", { ord: true, dl: ['sqlite'] }),
  sq('İK: Aralık 2024 itibarıyla “son 90 gün”de (2 Ekim – 31 Aralık dahil) işe girenlerden hâlâ aktif olanların oranı (yüzde, 1 basamak): <code>oran</code>.', "SELECT ROUND(100.0 * SUM(CASE WHEN term_date IS NULL THEN 1 ELSE 0 END) / COUNT(*), 1) AS oran FROM ik_employees WHERE hire_date >= '2024-10-02' AND hire_date <= '2024-12-31';")
]);
X('bs-kohort', [
  sq('İK kohortu: işe giriş yılına göre (2019–2023) kohort büyüklüğü ve 1 yıl sonra hâlâ çalışanların oranı (yüzde, 1 basamak; ayrılış hire_date + 365 günden sonra ya da hiç): <code>kohort</code>, <code>kisi</code>, <code>kalan1</code>.', "SELECT strftime('%Y', hire_date) AS kohort, COUNT(*) AS kisi, ROUND(100.0 * SUM(CASE WHEN term_date IS NULL OR julianday(term_date) - julianday(hire_date) > 365 THEN 1 ELSE 0 END) / COUNT(*), 1) AS kalan1 FROM ik_employees WHERE hire_date >= '2019-01-01' AND hire_date < '2024-01-01' GROUP BY strftime('%Y', hire_date) ORDER BY kohort;", O),
  sq('Bisiklet kohortu: ilk yolculuk ayına göre kullanıcı kohortları ve sonraki ayda yeniden binenlerin oranı (yüzde, 1 basamak): <code>kohort</code>, <code>kisi</code>, <code>sonraki_ay</code>. Haziran ve Temmuz kohortları. Önce kullanıcı-ay çiftlerini bir kez özetle; 116.000 satırı her kullanıcı için yeniden taramak çok yavaştır.', "WITH k AS (SELECT user_id, strftime('%Y-%m', started_at) AS ay FROM bk_trips GROUP BY user_id, strftime('%Y-%m', started_at)), f AS (SELECT user_id, MIN(ay) AS kohort FROM k GROUP BY user_id) SELECT f.kohort, COUNT(*) AS kisi, ROUND(100.0 * COUNT(k.user_id) / COUNT(*), 1) AS sonraki_ay FROM f LEFT JOIN k ON k.user_id = f.user_id AND k.ay = CASE f.kohort WHEN '2024-06' THEN '2024-07' ELSE '2024-08' END WHERE f.kohort IN ('2024-06', '2024-07') GROUP BY f.kohort ORDER BY f.kohort;", O)
]);
X('index', [
  sq('Pedal İzmir: <code>bk_trips</code> tablosundaki indeksleri listele (SQLite <code>sqlite_master</code>): <code>name</code>.', "SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'bk_trips' AND name NOT LIKE 'sqlite_autoindex%';", { base: 'sqlite', dl: ['sqlite'] })
]);
})();
