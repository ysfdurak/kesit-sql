/* Kesit SQL içerik 18: Kanat Havayolları veri seti üzerinde ayrı bir öğrenme yolu
   Temelden ileriye 10 ders, bitirme projesi ve alıştırma bankası soruları. */
(function () {
const L = window.SQLP_LESSONS;
const MOD = 'Kanat Havayolları';
const mc = (q, o, a, why) => ({ t: 'mc', q, o, a, why });
const sq = (q, sol, o) => Object.assign({ t: 'sql', q: '<p>' + q + '</p>', sol }, o || {});
/* Kalkış gecikmesi (dakika) */
const DLY = 'ROUND((julianday(f.actual_dep) - julianday(f.sched_dep)) * 1440)';
const DLYA = 'ROUND((julianday(f.actual_arr) - julianday(f.sched_arr)) * 1440)';
const TABLOLAR = `
<table>
<tr><th>Tablo</th><th>Ne tutar?</th><th>Bağlantı</th></tr>
<tr><td><code>hv_airports</code></td><td>Havalimanları: kod, şehir, ülke, UTC farkı, koordinat</td><td></td></tr>
<tr><td><code>hv_aircraft</code></td><td>Filo: kuyruk tescili, tip, koltuk sayısı</td><td></td></tr>
<tr><td><code>hv_routes</code></td><td>Rotalar: kalkış ve varış havalimanı, mesafe, planlanan süre</td><td>origin, dest → hv_airports</td></tr>
<tr><td><code>hv_flights</code></td><td>Uçuşlar: planlanan ve gerçek kalkış/varış, durum, yolcu sayısı</td><td>route_id → hv_routes, tail_no → hv_aircraft</td></tr>
<tr><td><code>hv_delays</code></td><td>Rötar nedenleri ve dakikaları</td><td>flight_id → hv_flights</td></tr>
<tr><td><code>hv_passengers</code></td><td>Kanat Mil üyeleri</td><td></td></tr>
<tr><td><code>hv_bookings</code></td><td>Üyelerin rezervasyonları</td><td>passenger_id → hv_passengers, flight_id → hv_flights</td></tr>
</table>`;

const lessons = [
/* ---------------------------------------------------------------- 1 */
{
  id: 'hv-tanis', lv: 'A1', mod: MOD, min: 12,
  title: 'Kanat Havayolları: veri setini tanı, seç ve filtrele',
  sum: 'Yeni bir sektörde aynı temel araçlar: SELECT, WHERE, IN, IS NULL, ORDER BY ve ilk N satır.',
  body: `
<h2>Neden ikinci bir veri seti?</h2>
<p>Bir dili yalnızca tek bir metinle öğrenen, o metnin dışında zorlanır. SQL'de de aynı şey geçerli: Anadolu Market'te öğrendiğin her şeyi şimdi bambaşka bir işte uygulayacaksın. <b>Kanat Havayolları</b> hayali bir havayolu şirketi; Eylül–Aralık 2024 arasında 19 havalimanına yaklaşık 3.200 uçuş yaptı.</p>
${TABLOLAR}
<div class="note"><b>Zaman bilgisi</b>Tüm zamanlar Türkiye saatiyle (UTC+3) ve <code>YYYY-AA-GG SS:DD:ss</code> biçiminde tutulur. Yurt dışı havalimanlarının yerel saati için <code>hv_airports.tz_offset</code> kullanılır.</div>
<h2>İlk sorgular</h2>
<pre class="code">SELECT airport_code, city, country
FROM hv_airports
WHERE country = 'Türkiye'
ORDER BY city;</pre>
<p>İptal edilen uçuşlarda gerçek kalkış ve varış zamanı yoktur, yani NULL'dır:</p>
<pre class="code">SELECT flight_id, flight_no, sched_dep, status
FROM hv_flights
WHERE actual_dep IS NULL
ORDER BY sched_dep
LIMIT 5;</pre>
<div class="tip"><b>Önce veriye bak</b>Bir tabloyu ilk kez sorgularken <code>SELECT * ... LIMIT 10</code> ile birkaç satırı incele ve <b>Veri setleri</b> sayfasındaki ilişki şemasına göz at. Hangi sütunun hangi tabloya bağlandığını bilmek sonraki derslerin yarısıdır.</div>
`,
  ex: [
    sq('Yurt dışındaki havalimanlarını (<code>country</code> Türkiye olmayanlar) kodu, şehri ve ülkesiyle getir: <code>airport_code</code>, <code>city</code>, <code>country</code>. Ülkeye, eşitlikte koda göre sırala.',
      "SELECT airport_code, city, country FROM hv_airports WHERE country <> 'Türkiye' ORDER BY country, airport_code;", { ord: true }),
    sq('Koltuk sayısı 200\'den fazla olan uçakları getir: <code>tail_no</code>, <code>model</code>, <code>seats</code>. Koltuk sayısına göre azalan, eşitlikte tescile göre sırala.',
      'SELECT tail_no, model, seats FROM hv_aircraft WHERE seats > 200 ORDER BY seats DESC, tail_no;', { ord: true }),
    sq('<b>KN101</b> seferinin Aralık 2024\'teki uçuşlarını planlanan kalkış zamanı ve durumuyla getir: <code>sched_dep</code>, <code>status</code>. Kalkışa göre sırala.',
      "SELECT sched_dep, status FROM hv_flights WHERE flight_no = 'KN101' AND sched_dep >= '2024-12-01' AND sched_dep < '2025-01-01' ORDER BY sched_dep;",
      { ord: true, hint: "Saatli sütunda ay filtresi: sched_dep >= '2024-12-01' AND sched_dep < '2025-01-01'." }),
    sq('İptal edilen uçuşlardan en erken planlanmış 10 tanesini getir: <code>flight_id</code>, <code>flight_no</code>, <code>sched_dep</code>.',
      "SELECT flight_id, flight_no, sched_dep FROM hv_flights WHERE status = 'cancelled' ORDER BY sched_dep, flight_id LIMIT 10;", { ord: true }),
    sq('İzmir\'de yaşayan <b>Gold</b> veya <b>Elite</b> üyeleri getir: <code>full_name</code>, <code>tier</code>. Ada göre sırala.',
      "SELECT full_name, tier FROM hv_passengers WHERE city = 'İzmir' AND tier IN ('Gold', 'Elite') ORDER BY full_name, passenger_id;",
      { ord: true, hint: "tier IN ('Gold', 'Elite') ve şehir koşulunu AND ile bağla." }),
    sq('E-posta adresi kayıtlı olmayan üyelerin sayısını getir: <code>adet</code>.',
      'SELECT COUNT(*) AS adet FROM hv_passengers WHERE email IS NULL;', { hint: 'Boş değer = NULL; IS NULL ile aranır.' }),
    mc('<p><code>hv_flights</code> tablosundaki <code>pax</code> sütunu neyi gösterir?</p>', ['Uçuşa yapılan toplam rezervasyon sayısını', 'Uçağa binen yolcu sayısını; iptal edilen uçuşta 0\'dır', 'Uçaktaki toplam koltuk sayısını', 'Kanat Mil üyelerinin o uçuştaki sayısını'], 1,
      'pax uçağa binen yolcu sayısıdır. Koltuk sayısı hv_aircraft.seats sütunundadır; hv_bookings ise yalnızca üyelerin rezervasyonlarını tutar, bu yüzden uçuştaki tüm yolcuları içermez.')
  ]
},
/* ---------------------------------------------------------------- 2 */
{
  id: 'hv-ozet', lv: 'A2', mod: MOD, min: 14,
  title: 'Uçuşları özetlemek: COUNT, SUM, AVG, GROUP BY ve HAVING',
  sum: 'Durumlara, uçak tiplerine ve ücret sınıflarına göre özetler; koşullu sayım ve grup filtresi.',
  body: `
<h2>Bir havayolunun temel sayıları</h2>
<p>Yönetim her sabah birkaç soruya cevap ister: Kaç uçuş yapıldı, kaçı iptal oldu, kaç yolcu taşındı, ortalama bilet fiyatı ne? Bunların hepsi toplama fonksiyonları ve GROUP BY ile yanıtlanır.</p>
<pre class="code">SELECT status, COUNT(*) AS ucus, SUM(pax) AS yolcu
FROM hv_flights
GROUP BY status;</pre>
<h2>COUNT(*) ile COUNT(sütun) farkı burada çok işe yarar</h2>
<pre class="code">SELECT COUNT(*)          AS planlanan,
       COUNT(actual_dep) AS kalkan,
       COUNT(actual_arr) AS inen
FROM hv_flights;</pre>
<p>İptal edilen uçuşun <code>actual_dep</code> değeri, yön değiştiren (diverted) uçuşun <code>actual_arr</code> değeri NULL'dır. COUNT(sütun) NULL'ları saymadığı için üç sayı farklı çıkar.</p>
<h2>Koşullu sayım</h2>
<pre class="code">SELECT tier,
       COUNT(*) AS uye,
       SUM(CASE WHEN email IS NULL THEN 1 ELSE 0 END) AS epostasiz
FROM hv_passengers
GROUP BY tier;</pre>
<div class="warn"><b>Ortalama yolcu sayısında iptaller</b>İptal edilen uçuşlarda pax 0'dır. Uçuş başına ortalama yolcu hesaplarken iptalleri dahil edersen ortalama düşer. Ne ölçtüğünü sorudan çıkar ve gerekirse <code>WHERE status &lt;&gt; 'cancelled'</code> ekle.</div>
`,
  ex: [
    sq('Uçuş durumlarına göre uçuş sayısını getir: <code>status</code>, <code>ucus</code>.', 'SELECT status, COUNT(*) AS ucus FROM hv_flights GROUP BY status;'),
    sq('Filoyu uçak tipine göre özetle: <code>model</code>, <code>ucak</code> (uçak sayısı), <code>toplam_koltuk</code>. Toplam koltuğa göre azalan, eşitlikte tipe göre sırala.',
      'SELECT model, COUNT(*) AS ucak, SUM(seats) AS toplam_koltuk FROM hv_aircraft GROUP BY model ORDER BY toplam_koltuk DESC, model;', { ord: true }),
    sq('Ücret sınıfına göre rezervasyon sayısı ve ortalama ücret (tam sayı): <code>fare_class</code>, <code>rezervasyon</code>, <code>ort_ucret</code>.',
      'SELECT fare_class, COUNT(*) AS rezervasyon, ROUND(AVG(price)) AS ort_ucret FROM hv_bookings GROUP BY fare_class;'),
    sq('Üyelik seviyesine göre üye sayısı ve e-postası olmayan üye sayısı: <code>tier</code>, <code>uye</code>, <code>epostasiz</code>.',
      'SELECT tier, COUNT(*) AS uye, SUM(CASE WHEN email IS NULL THEN 1 ELSE 0 END) AS epostasiz FROM hv_passengers GROUP BY tier;'),
    sq('Dört aylık dönemde 220\'den fazla uçuş yapan uçakları getir: <code>tail_no</code>, <code>ucus</code>. Uçuş sayısına göre azalan, eşitlikte tescile göre sırala.',
      'SELECT tail_no, COUNT(*) AS ucus FROM hv_flights GROUP BY tail_no HAVING COUNT(*) > 220 ORDER BY ucus DESC, tail_no;', { ord: true, hint: 'Grup koşulu HAVING ile yazılır.' }),
    sq('İptal edilmeyen uçuşlarda toplam taşınan yolcu sayısını ve uçuş başına ortalama yolcuyu (1 basamak) getir: <code>toplam</code>, <code>ort</code>.',
      "SELECT SUM(pax) AS toplam, ROUND(AVG(pax), 1) AS ort FROM hv_flights WHERE status <> 'cancelled';"),
    mc('<p><code>SELECT COUNT(*), COUNT(actual_arr) FROM hv_flights</code> sorgusunda iki sayı neden farklıdır?</p>', ['COUNT(*) yalnızca inen uçuşları sayar', 'İptal edilen ve yön değiştiren uçuşların actual_arr değeri NULL\'dır; COUNT(sütun) NULL saymaz', 'actual_arr metin olduğu için COUNT onu saymaz', 'COUNT(*) tekrar eden uçuşları da sayar'], 1,
      'COUNT(*) satırları, COUNT(sütun) o sütunda NULL olmayan değerleri sayar. Aradaki fark, inişi kayıtlı olmayan uçuş sayısıdır.')
  ]
},
/* ---------------------------------------------------------------- 3 */
{
  id: 'hv-zaman', lv: 'A2', mod: MOD, min: 16,
  title: 'Saat ve süre hesapları: rötar dakikası, saat dilimleri, zamanında kalkış',
  sum: 'İki zaman arasındaki dakika farkı, saate ve aya göre gruplama, zamanında kalkış oranı ve rezervasyon öncesi gün sayısı.',
  body: `
<h2>İki zaman arasındaki fark</h2>
<p>Havayolunda her şey dakikayla ölçülür. Kalkış gecikmesi = gerçek kalkış − planlanan kalkış. Her SQL türünün yazımı farklıdır:</p>
<table>
<tr><th>SQL türü</th><th>Dakika farkı</th></tr>
<tr><td>SQL Server</td><td><code>DATEDIFF(minute, sched_dep, actual_dep)</code></td></tr>
<tr><td>PostgreSQL</td><td><code>EXTRACT(EPOCH FROM (actual_dep - sched_dep)) / 60</code></td></tr>
<tr><td>MySQL</td><td><code>TIMESTAMPDIFF(MINUTE, sched_dep, actual_dep)</code></td></tr>
<tr><td>Oracle</td><td><code>(actual_dep - sched_dep) * 1440</code> (DATE farkı gün cinsindendir)</td></tr>
<tr><td>BigQuery</td><td><code>DATETIME_DIFF(actual_dep, sched_dep, MINUTE)</code></td></tr>
<tr><td>SQLite</td><td><code>(julianday(actual_dep) - julianday(sched_dep)) * 1440</code></td></tr>
</table>
<pre class="code">SELECT f.flight_id, f.flight_no, f.sched_dep, f.actual_dep,
       ${DLY} AS gecikme_dk
FROM hv_flights f
WHERE f.sched_dep >= '2024-12-24' AND f.sched_dep < '2024-12-25'
ORDER BY f.sched_dep
LIMIT 5;</pre>
<div class="warn"><b>Gün farkı ile dakika farkı aynı şey değil</b>SQL Server'da <code>DATEDIFF(day, a, b)</code> arada geçen gece yarısı sayısını verir: 23:50 ile ertesi gün 00:10 arasında 20 dakika olsa da sonuç 1'dir. Süre ölçerken her zaman küçük birimle (dakika) hesapla, sonra gerekirse böl.</div>
<h2>Zamanında kalkış (on-time performance)</h2>
<p>Sektörde bir uçuş planlanan saatten en fazla <b>15 dakika</b> sonra kalktıysa “zamanında” sayılır. Oran hesabında iptal edilen uçuşlar paydaya girmez:</p>
<pre class="code">SELECT ROUND(100.0 * SUM(CASE WHEN ${DLY} <= 15 THEN 1 ELSE 0 END) / COUNT(*), 1) AS otp
FROM hv_flights f
WHERE f.actual_dep IS NOT NULL;</pre>
<h2>Saate ve aya göre gruplamak</h2>
<p>Kalkış saati için saat parçasını al, ay için yıl-ay metnini kullan. Takvim gün farkı gerektiğinde iki tarafı da önce güne çevir; böylece saat kesirleri sonucu kaydırmaz.</p>
`,
  ex: [
    sq('2024-12-24 günündeki ilk 5 uçuşun (planlanan kalkış sırasıyla) kalkış gecikmesini dakika olarak getir: <code>flight_id</code>, <code>flight_no</code>, <code>gecikme</code>.',
      `SELECT f.flight_id, f.flight_no, ${DLY} AS gecikme FROM hv_flights f WHERE f.sched_dep >= '2024-12-24' AND f.sched_dep < '2024-12-25' ORDER BY f.sched_dep, f.flight_id LIMIT 5;`,
      { ord: true, hint: 'Gerçek kalkış − planlanan kalkış, dakika cinsinden. SQL türüne uygun yazım ders tablosunda.' }),
    sq('Ay bazında ortalama kalkış gecikmesini (1 basamak) getir; iptal edilen uçuşlar hariç: <code>ay</code> (YYYY-AA), <code>ort_gecikme</code>. Aya göre sırala.',
      `SELECT strftime('%Y-%m', f.sched_dep) AS ay, ROUND(AVG(${DLY}), 1) AS ort_gecikme FROM hv_flights f WHERE f.actual_dep IS NOT NULL GROUP BY strftime('%Y-%m', f.sched_dep) ORDER BY ay;`,
      { ord: true }),
    sq('Planlanan kalkış saatine (0–23) göre uçuş sayısı ve ortalama kalkış gecikmesi (1 basamak; iptaller hariç): <code>saat</code>, <code>ucus</code>, <code>ort_gecikme</code>. Saate göre sırala.',
      `SELECT CAST(strftime('%H', f.sched_dep) AS INTEGER) AS saat, COUNT(*) AS ucus, ROUND(AVG(${DLY}), 1) AS ort_gecikme FROM hv_flights f WHERE f.actual_dep IS NOT NULL GROUP BY CAST(strftime('%H', f.sched_dep) AS INTEGER) ORDER BY saat;`,
      { ord: true, hint: 'Saat parçası: SQL Server DATEPART(hour, ...), PostgreSQL/Oracle EXTRACT(HOUR FROM ...), MySQL HOUR(...).' }),
    sq('Her ay kaç uçuşun <b>60 dakikadan fazla</b> geç kalktığını getir: <code>ay</code>, <code>rotarli</code>. Aya göre sırala.',
      `SELECT strftime('%Y-%m', f.sched_dep) AS ay, SUM(CASE WHEN ${DLY} > 60 THEN 1 ELSE 0 END) AS rotarli FROM hv_flights f GROUP BY strftime('%Y-%m', f.sched_dep) ORDER BY ay;`,
      { ord: true, hint: 'Koşullu sayım: SUM(CASE WHEN gecikme > 60 THEN 1 ELSE 0 END). İptallerde gecikme NULL olduğu için sayılmaz.' }),
    sq('Zamanında kalkış oranını (planlanandan en fazla 15 dakika sonra kalkan uçuşların yüzdesi, 1 basamak) iptal edilenler hariç hesapla. Tek değer: <code>otp</code>.',
      `SELECT ROUND(100.0 * SUM(CASE WHEN ${DLY} <= 15 THEN 1 ELSE 0 END) / COUNT(*), 1) AS otp FROM hv_flights f WHERE f.actual_dep IS NOT NULL;`),
    sq('Rezervasyonları, uçuştan kaç <b>takvim günü</b> önce yapıldığına göre üç gruba ayır: 0–6 gün <b>\'Son hafta\'</b>, 7–29 gün <b>\'Son ay\'</b>, 30 ve üzeri <b>\'Erken\'</b>. Her grubun rezervasyon sayısını ve ortalama ücretini (tam sayı) getir: <code>grup</code>, <code>rezervasyon</code>, <code>ort_ucret</code>.',
      "WITH g AS (SELECT b.price, julianday(date(f.sched_dep)) - julianday(date(b.booked_at)) AS gun FROM hv_bookings b JOIN hv_flights f ON f.flight_id = b.flight_id) SELECT CASE WHEN gun < 7 THEN 'Son hafta' WHEN gun < 30 THEN 'Son ay' ELSE 'Erken' END AS grup, COUNT(*) AS rezervasyon, ROUND(AVG(price)) AS ort_ucret FROM g GROUP BY CASE WHEN gun < 7 THEN 'Son hafta' WHEN gun < 30 THEN 'Son ay' ELSE 'Erken' END;",
      { hint: 'Önce iki zamanı da tarihe (güne) çevir, sonra gün farkını al. Bir CTE içinde hesaplayıp dışarıda CASE ile grupla.', why: 'Son dakika biletleri belirgin biçimde pahalı: havayolları talep yaklaştıkça fiyatı yükseltir.' }),
    mc('<p><code>WHERE sched_dep BETWEEN \'2024-12-01\' AND \'2024-12-31\'</code> filtresi Aralık uçuşlarının hangisini kaçırır?</p>', ['1 Aralık 00:00\'daki uçuşları', '31 Aralık\'ta 00:00\'dan sonra planlanan tüm uçuşları', 'Yalnızca iptal edilen uçuşları', 'Hiçbirini; BETWEEN iki ucu da kapsar'], 1,
      "'2024-12-31' değeri 31 Aralık 00:00 anlamına gelir; o günün sonraki saatleri bu değerden büyüktür. Doğrusu yarı açık aralıktır: >= '2024-12-01' AND < '2025-01-01'.")
  ]
},
/* ---------------------------------------------------------------- 4 */
{
  id: 'hv-join', lv: 'B1', mod: MOD, min: 16,
  title: 'Uçuş, rota, havalimanı ve uçak: JOIN zinciri',
  sum: 'Dört tabloyu adım adım birleştirmek, eşi olmayanı LEFT JOIN ile bulmak ve rötar nedenlerini özetlemek.',
  body: `
<h2>Bir uçuşun tam resmi</h2>
<p><code>hv_flights</code> tek başına “KN101 kalktı” der ama nereden nereye uçtuğunu, hangi uçakla uçtuğunu söylemez. Bunlar başka tablolardadır ve yabancı anahtarlarla bağlanır:</p>
<pre class="code" data-norun>hv_flights.route_id ──> hv_routes.route_id ──> origin, dest ──> hv_airports.airport_code
hv_flights.tail_no  ──> hv_aircraft.tail_no
hv_bookings.flight_id ──> hv_flights.flight_id
hv_bookings.passenger_id ──> hv_passengers.passenger_id</pre>
<pre class="code">SELECT f.flight_no, r.origin, r.dest, a.model, f.sched_dep
FROM hv_flights f
JOIN hv_routes r   ON r.route_id = f.route_id
JOIN hv_aircraft a ON a.tail_no = f.tail_no
WHERE f.sched_dep >= '2024-12-31' AND f.sched_dep < '2025-01-01'
ORDER BY f.sched_dep
LIMIT 5;</pre>
<h2>Doluluk oranı: iki tablodan gelen iki sayı</h2>
<p>Doluluk (load factor) = binen yolcu ÷ koltuk. Yolcu uçuştan, koltuk uçaktan gelir:</p>
<pre class="code">SELECT a.model, ROUND(100.0 * SUM(f.pax) / SUM(a.seats), 1) AS doluluk
FROM hv_flights f
JOIN hv_aircraft a ON a.tail_no = f.tail_no
WHERE f.status <> 'cancelled'
GROUP BY a.model;</pre>
<div class="tip"><b>Oranların ortalaması değil, toplamların oranı</b>Her uçuşun doluluğunu ayrı hesaplayıp ortalamasını almak, küçük ve büyük uçakları eşit ağırlıklandırır. Sektör tanımı toplam yolcu ÷ toplam koltuktur.</div>
`,
  ex: [
    sq('2024-12-31 günündeki uçuşları sefer numarası, kalkış ve varış havalimanı koduyla getir: <code>flight_no</code>, <code>origin</code>, <code>dest</code>, <code>sched_dep</code>. Kalkış zamanına, eşitlikte sefer numarasına göre sırala.',
      "SELECT f.flight_no, r.origin, r.dest, f.sched_dep FROM hv_flights f JOIN hv_routes r ON r.route_id = f.route_id WHERE f.sched_dep >= '2024-12-31' AND f.sched_dep < '2025-01-01' ORDER BY f.sched_dep, f.flight_no;", { ord: true }),
    sq('Uçak tipine göre doluluk oranını (yüzde, 1 basamak; iptal edilen uçuşlar hariç) getir: <code>model</code>, <code>doluluk</code>. Doluluğa göre azalan sırala.',
      "SELECT a.model, ROUND(100.0 * SUM(f.pax) / SUM(a.seats), 1) AS doluluk FROM hv_flights f JOIN hv_aircraft a ON a.tail_no = f.tail_no WHERE f.status <> 'cancelled' GROUP BY a.model ORDER BY doluluk DESC;", { ord: true }),
    sq('Yurt dışına giden uçuş sayısını varış şehrine göre getir: <code>city</code>, <code>country</code>, <code>ucus</code>. Uçuş sayısına göre azalan, eşitlikte şehre göre sırala.',
      "SELECT a.city, a.country, COUNT(*) AS ucus FROM hv_flights f JOIN hv_routes r ON r.route_id = f.route_id JOIN hv_airports a ON a.airport_code = r.dest WHERE a.country <> 'Türkiye' GROUP BY a.city, a.country ORDER BY ucus DESC, a.city;",
      { ord: true, hint: 'Varış havalimanının ülkesi için hv_airports\'u r.dest üzerinden bağla.' }),
    sq('Elite üyelerin 2024-12-20 ve sonrasında gerçekleşen (flown) uçuşlarını getir: <code>full_name</code>, <code>flight_no</code>, <code>sched_dep</code>. Kalkış zamanına, eşitlikte ada göre sırala.',
      "SELECT p.full_name, f.flight_no, f.sched_dep FROM hv_bookings b JOIN hv_passengers p ON p.passenger_id = b.passenger_id JOIN hv_flights f ON f.flight_id = b.flight_id WHERE p.tier = 'Elite' AND b.status = 'flown' AND f.sched_dep >= '2024-12-20' ORDER BY f.sched_dep, p.full_name;", { ord: true }),
    sq('Hiç uçuşu olmayan rotaları bul: <code>route_id</code>, <code>origin</code>, <code>dest</code>.',
      'SELECT r.route_id, r.origin, r.dest FROM hv_routes r LEFT JOIN hv_flights f ON f.route_id = r.route_id WHERE f.flight_id IS NULL;',
      { hint: 'LEFT JOIN ile eşi olmayanları bul: WHERE f.flight_id IS NULL.' }),
    sq('Rötar nedenlerine göre etkilenen uçuş sayısını ve toplam dakikayı getir: <code>reason</code>, <code>ucus</code>, <code>dakika</code>. Toplam dakikaya göre azalan sırala.',
      'SELECT reason, COUNT(DISTINCT flight_id) AS ucus, SUM(minutes) AS dakika FROM hv_delays GROUP BY reason ORDER BY dakika DESC;', { ord: true }),
    mc('<p>Her uçuşun doluluğunu ayrı ayrı hesaplayıp bunların ortalamasını almak yerine neden <code>SUM(pax) / SUM(seats)</code> kullanılır?</p>', ['SUM daha hızlı çalıştığı için', 'Ortalamaların ortalaması küçük ve büyük uçakları eşit ağırlıklandırır; sektör tanımı toplam yolcunun toplam koltuğa oranıdır', 'AVG pencere fonksiyonu gerektirdiği için', 'İki yöntem her zaman aynı sonucu verdiği için fark etmez'], 1,
      '180 koltuklu bir uçakla 289 koltuklu bir uçağın doluluğu basit ortalamada eşit ağırlık taşır. Toplamların oranı ise her koltuğu bir kez sayar.')
  ]
},
/* ---------------------------------------------------------------- 5 */
{
  id: 'hv-self', lv: 'B1', mod: MOD, min: 16,
  title: 'Aynı tabloyu iki kez kullanmak: kalkış ve varış şehri, aktarmalı yolculuklar',
  sum: 'Havalimanı tablosunu iki rolde birleştirmek, dönüşü olmayan rotayı bulmak ve aktarma bağlantılarını eşleştirmek.',
  body: `
<h2>Bir tablo, iki rol</h2>
<p>Bir rotanın hem kalkışı hem varışı <code>hv_airports</code> tablosuna bağlanır. Aynı tabloyu iki farklı takma adla birleştirirsin: biri kalkış, biri varış rolünde.</p>
<pre class="code">SELECT r.route_id, k.city AS kalkis, v.city AS varis, r.distance_km
FROM hv_routes r
JOIN hv_airports k ON k.airport_code = r.origin
JOIN hv_airports v ON v.airport_code = r.dest
ORDER BY r.distance_km DESC
LIMIT 5;</pre>
<h2>Aktarma: iki uçuşu eşleştirmek</h2>
<p>Bir yolcu Van'dan İstanbul'a inip aynı gün yurt dışına devam edebilir mi? İlk uçuşun varış havalimanı ikincinin kalkışı olmalı ve arada makul bir bekleme süresi olmalıdır. Bu, <code>hv_flights</code>'ın kendisiyle birleştirilmesidir:</p>
<pre class="code">SELECT f1.flight_no AS ilk, f2.flight_no AS ikinci, r2.dest AS son_varis,
       ROUND((julianday(f2.sched_dep) - julianday(f1.sched_arr)) * 1440) AS bekleme_dk
FROM hv_flights f1
JOIN hv_routes r1 ON r1.route_id = f1.route_id
JOIN hv_routes r2 ON r2.origin = r1.dest
JOIN hv_flights f2 ON f2.route_id = r2.route_id
WHERE r1.origin = 'VAN' AND r1.dest = 'IST'
  AND f1.sched_dep >= '2024-12-20' AND f1.sched_dep < '2024-12-21'
  AND f2.sched_dep >= f1.sched_arr
  AND f2.sched_dep < '2024-12-21'
ORDER BY bekleme_dk
LIMIT 5;</pre>
<div class="warn"><b>Eşleşme patlaması</b>Kendine birleştirmede koşulları dar tutmazsan (aynı gün, belirli havalimanı) sonuç uçuş sayısının karesi kadar büyüyebilir. Önce filtrele, sonra birleştir.</div>
`,
  ex: [
    sq('En uzun 5 rotayı kalkış ve varış <b>şehir</b> adlarıyla getir: <code>route_id</code>, <code>kalkis</code>, <code>varis</code>, <code>distance_km</code>. Mesafeye göre azalan, eşitlikte route_id\'ye göre sırala.',
      'SELECT r.route_id, k.city AS kalkis, v.city AS varis, r.distance_km FROM hv_routes r JOIN hv_airports k ON k.airport_code = r.origin JOIN hv_airports v ON v.airport_code = r.dest ORDER BY r.distance_km DESC, r.route_id LIMIT 5;', { ord: true }),
    sq('Aynı şehirde birden fazla havalimanı olan şehirleri, havalimanı çiftleriyle getir (her çift bir kez): <code>city</code>, <code>a</code>, <code>b</code>.',
      'SELECT x.city, x.airport_code AS a, y.airport_code AS b FROM hv_airports x JOIN hv_airports y ON y.city = x.city AND x.airport_code < y.airport_code;',
      { hint: 'Tabloyu kendisiyle şehir üzerinden birleştir; aynı çifti iki kez görmemek için x.kod < y.kod.' }),
    sq('<b>Dönüş rotası olmayan</b> rotaları bul (A → B var ama B → A yok): <code>route_id</code>, <code>origin</code>, <code>dest</code>.',
      'SELECT r.route_id, r.origin, r.dest FROM hv_routes r LEFT JOIN hv_routes d ON d.origin = r.dest AND d.dest = r.origin WHERE d.route_id IS NULL;',
      { hint: 'Rota tablosunu kendisiyle ters yönde LEFT JOIN yap: d.origin = r.dest AND d.dest = r.origin.' }),
    sq('Her uçuşun kalkış ve varış <b>ülkesini</b> kullanarak 2024-12-01 günündeki uluslararası uçuşları (ülkeler farklı) getir: <code>flight_no</code>, <code>kalkis_ulke</code>, <code>varis_ulke</code>. Sefer numarasına göre sırala.',
      "SELECT f.flight_no, k.country AS kalkis_ulke, v.country AS varis_ulke FROM hv_flights f JOIN hv_routes r ON r.route_id = f.route_id JOIN hv_airports k ON k.airport_code = r.origin JOIN hv_airports v ON v.airport_code = r.dest WHERE f.sched_dep >= '2024-12-01' AND f.sched_dep < '2024-12-02' AND k.country <> v.country ORDER BY f.flight_no;", { ord: true }),
    sq('Aktarma bağlantısı: 2024-12-20 günü <b>VAN → IST</b> uçuşuyla İstanbul\'a inen bir yolcunun aynı gün IST\'den kalkan <b>yurt dışı</b> uçuşlarına bağlanabileceği seçenekleri bul; bekleme en az 60, en fazla 360 dakika olsun: <code>ilk</code>, <code>ikinci</code>, <code>son_varis</code>, <code>bekleme_dk</code>. Beklemeye göre sırala.',
      "SELECT f1.flight_no AS ilk, f2.flight_no AS ikinci, r2.dest AS son_varis, ROUND((julianday(f2.sched_dep) - julianday(f1.sched_arr)) * 1440) AS bekleme_dk FROM hv_flights f1 JOIN hv_routes r1 ON r1.route_id = f1.route_id JOIN hv_routes r2 ON r2.origin = r1.dest JOIN hv_airports v ON v.airport_code = r2.dest JOIN hv_flights f2 ON f2.route_id = r2.route_id WHERE r1.origin = 'VAN' AND r1.dest = 'IST' AND f1.sched_dep >= '2024-12-20' AND f1.sched_dep < '2024-12-21' AND v.country <> 'Türkiye' AND f2.sched_dep >= datetime(f1.sched_arr, '+60 minutes') AND f2.sched_dep <= datetime(f1.sched_arr, '+360 minutes') ORDER BY bekleme_dk, f2.flight_no;",
      { ord: true, hint: 'İkinci uçuşun kalkışı, ilk uçuşun varışına 60 ile 360 dakika eklenmiş zamanlar arasında olmalı.' }),
    mc('<p>Rota tablosunu havalimanı tablosuyla <b>tek</b> bir JOIN ile birleştirip hem kalkış hem varış şehrini almaya çalışırsan ne olur?</p>', ['İki şehir de doğru gelir', 'Tek takma ad tek satıra bağlandığı için yalnızca bir rolün (kalkış ya da varış) şehri gelir; ikisi için iki ayrı takma ad gerekir', 'Sorgu kartezyen çarpım üretir ve her rota 19 kez gelir', 'SQL bir tabloyu bir sorguda yalnızca bir kez kullanmaya izin verir'], 1,
      'Her takma ad bir satırla eşleşir. Kalkış ve varış farklı havalimanları olduğu için tabloyu iki kez, iki farklı adla birleştirmek gerekir. SQL bunu serbestçe izin verir.')
  ]
},
/* ---------------------------------------------------------------- 6 */
{
  id: 'hv-alt', lv: 'B1', mod: MOD, min: 14,
  title: 'Alt sorgu ve EXISTS: hiç uçmayan üyeler, ortalamanın üstündeki rotalar',
  sum: 'Tek değer döndüren alt sorgu, IN, NOT EXISTS, HAVING içinde alt sorgu ve ilişkili alt sorgu.',
  body: `
<h2>Sorunun içinde başka bir soru</h2>
<p>“Ortalamanın üstünde ödeme yapan rezervasyonlar” derken önce ortalamayı bilmek gerekir. Alt sorgu bu ara sonucu üretir:</p>
<pre class="code">SELECT COUNT(*) AS adet
FROM hv_bookings
WHERE price > (SELECT AVG(price) FROM hv_bookings);</pre>
<h2>Var mı, yok mu? EXISTS</h2>
<pre class="code">SELECT COUNT(*) AS hic_rezervasyonu_yok
FROM hv_passengers p
WHERE NOT EXISTS (SELECT 1 FROM hv_bookings b WHERE b.passenger_id = p.passenger_id);</pre>
<h2>Grupları genel ortalamayla karşılaştırmak</h2>
<pre class="code">SELECT f.route_id, ROUND(AVG(${DLY}), 1) AS ort_gecikme
FROM hv_flights f
WHERE f.actual_dep IS NOT NULL
GROUP BY f.route_id
HAVING AVG(${DLY}) > (SELECT AVG(${DLY}) FROM hv_flights f WHERE f.actual_dep IS NOT NULL)
ORDER BY ort_gecikme DESC
LIMIT 5;</pre>
<div class="note"><b>Ne zaman JOIN, ne zaman EXISTS?</b>Diğer tablodan sütun getirmen gerekiyorsa JOIN; yalnızca “karşılığı var mı” sorusu soruluyorsa EXISTS. EXISTS satır çoğaltmaz, ilk eşleşmede durur.</div>
`,
  ex: [
    sq('Tüm rezervasyonların ortalama ücretinden pahalı olan <b>Business dışı</b> rezervasyonların sayısını getir: <code>adet</code>.',
      "SELECT COUNT(*) AS adet FROM hv_bookings WHERE fare_class <> 'Business' AND price > (SELECT AVG(price) FROM hv_bookings);"),
    sq('Hiç rezervasyonu olmayan üye sayısını NOT EXISTS ile bul: <code>adet</code>.',
      'SELECT COUNT(*) AS adet FROM hv_passengers p WHERE NOT EXISTS (SELECT 1 FROM hv_bookings b WHERE b.passenger_id = p.passenger_id);'),
    sq('Ortalama kalkış gecikmesi tüm uçuşların ortalamasından yüksek olan rotaları getir (iptaller hariç): <code>route_id</code>, <code>ort_gecikme</code> (1 basamak). Gecikmeye göre azalan, eşitlikte route_id\'ye göre sırala.',
      `SELECT f.route_id, ROUND(AVG(${DLY}), 1) AS ort_gecikme FROM hv_flights f WHERE f.actual_dep IS NOT NULL GROUP BY f.route_id HAVING AVG(${DLY}) > (SELECT AVG(${DLY}) FROM hv_flights f WHERE f.actual_dep IS NOT NULL) ORDER BY ort_gecikme DESC, f.route_id;`,
      { ord: true, hint: 'HAVING içinde tek değer döndüren bir alt sorgu ile karşılaştır.' }),
    sq('Diyarbakır\'a (<code>DIY</code>) en az bir kez uçmuş (flown) üyelerin seviyelere göre sayısını getir: <code>tier</code>, <code>uye</code>.',
      "SELECT tier, COUNT(*) AS uye FROM hv_passengers WHERE passenger_id IN (SELECT b.passenger_id FROM hv_bookings b JOIN hv_flights f ON f.flight_id = b.flight_id JOIN hv_routes r ON r.route_id = f.route_id WHERE r.dest = 'DIY' AND b.status = 'flown') GROUP BY tier;",
      { hint: 'IN alt sorgusu, aynı üyeyi birden çok uçuşta sayma sorununu kendiliğinden çözer.' }),
    sq('1–10 numaralı üyelerin her biri için <b>en pahalı</b> rezervasyonunu ilişkili alt sorguyla getir: <code>passenger_id</code>, <code>booking_id</code>, <code>price</code>. Aynı fiyatta birden çok rezervasyon varsa küçük booking_id seçilsin. Üye numarasına göre sırala.',
      'SELECT b.passenger_id, b.booking_id, b.price FROM hv_bookings b WHERE b.passenger_id <= 10 AND b.booking_id = (SELECT b2.booking_id FROM hv_bookings b2 WHERE b2.passenger_id = b.passenger_id ORDER BY b2.price DESC, b2.booking_id LIMIT 1) ORDER BY b.passenger_id;',
      { ord: true, hint: 'Alt sorgu her üye için ORDER BY price DESC, booking_id ile ilk rezervasyonu seçer.' }),
    mc('<p><code>WHERE passenger_id IN (SELECT passenger_id FROM hv_bookings)</code> yerine aynı tabloyu JOIN ile birleştirip <code>COUNT(*)</code> alırsan sonuç neden büyür?</p>', ['JOIN NULL değerleri de saydığı için', 'Bir üyenin her rezervasyonu ayrı bir satır ürettiği için üye birden çok kez sayılır', 'IN alt sorgusu yalnızca ilk 100 satırı döndürdüğü için', 'JOIN her zaman kartezyen çarpım ürettiği için'], 1,
      'IN ve EXISTS yalnızca “var mı” sorusunu sorar ve satır çoğaltmaz. JOIN ise her eşleşme için bir satır üretir; doğru sayı için COUNT(DISTINCT ...) gerekir.')
  ]
},
/* ---------------------------------------------------------------- 7 */
{
  id: 'hv-pencere', lv: 'B2', mod: MOD, min: 18,
  title: 'Pencere fonksiyonları: uçağın günü, rötar zinciri ve sıralamalar',
  sum: 'ROW_NUMBER, LAG, DENSE_RANK, hareketli ortalama, FIRST_VALUE ve toplam içindeki pay.',
  body: `
<h2>Rötar neden yayılır?</h2>
<p>Bir uçak gün içinde birkaç sefer yapar. Sabahki uçuş geç kalırsa, aynı uçağın öğleden sonraki uçuşu da genellikle geç kalkar: buna <b>rötar zinciri</b> (gec_gelen_ucak) denir. Bunu görmek için aynı uçağın uçuşlarını zaman sırasına koyup bir önceki satıra bakmak gerekir; tam olarak pencere fonksiyonlarının işi.</p>
<div class="note"><b>Veri notu</b>Kanat'ta uçak ataması rastgeledir: aynı uçak aynı saatte iki seferde görünebilir, rotasyon bitişik değildir (Veri setleri → Bilinen sınırlamalar). Bu ders LAG yöntemini öğretir; çıkan zincir sayıları gerçek filo analizi değildir.</div>
<pre class="code">SELECT f.tail_no, f.sched_dep, f.flight_no,
       ${DLY} AS gecikme,
       LAG(${DLY}) OVER (PARTITION BY f.tail_no ORDER BY f.sched_dep, f.flight_id) AS onceki_gecikme
FROM hv_flights f
WHERE f.tail_no = 'TC-KNA'
  AND f.sched_dep >= '2024-12-01' AND f.sched_dep < '2024-12-03'
ORDER BY f.sched_dep;</pre>
<h2>Sıralama ve pay</h2>
<pre class="code">SELECT p.tier, ROUND(SUM(b.price)) AS harcama,
       ROUND(100.0 * SUM(b.price) / SUM(SUM(b.price)) OVER (), 1) AS pay
FROM hv_bookings b
JOIN hv_passengers p ON p.passenger_id = b.passenger_id
WHERE b.status = 'flown'
GROUP BY p.tier;</pre>
<p><code>SUM(SUM(b.price)) OVER ()</code> ilk bakışta tuhaf görünür: içteki SUM gruplamadan, dıştaki pencereden gelir. Önce her seviyenin toplamı hesaplanır, sonra bu toplamların genel toplamı her satıra yazılır.</p>
<div class="tip"><b>PARTITION BY = “her biri için”</b>“Her uçak için sırala”, “her yolcu için ilk rezervasyon” gibi ifadeler PARTITION BY'a karşılık gelir; “zamana göre” ifadesi ise ORDER BY'a.</div>
`,
  ex: [
    sq('2024-12-15 günü her uçağın uçuşlarını kalkış sırasıyla numaralandır: <code>tail_no</code>, <code>sched_dep</code>, <code>flight_no</code>, <code>sira</code>. Uçağa, sonra sıraya göre sırala.',
      "SELECT tail_no, sched_dep, flight_no, ROW_NUMBER() OVER (PARTITION BY tail_no ORDER BY sched_dep, flight_id) AS sira FROM hv_flights WHERE sched_dep >= '2024-12-15' AND sched_dep < '2024-12-16' ORDER BY tail_no, sira;", { ord: true }),
    sq('<b>TC-KNA</b> uçağının 1–2 Aralık 2024 uçuşlarında her uçuşun kalkış gecikmesini ve <b>aynı uçağın bir önceki</b> uçuşunun gecikmesini getir: <code>sched_dep</code>, <code>flight_no</code>, <code>gecikme</code>, <code>onceki_gecikme</code>. Kalkışa göre sırala.',
      `SELECT f.sched_dep, f.flight_no, ${DLY} AS gecikme, LAG(${DLY}) OVER (ORDER BY f.sched_dep, f.flight_id) AS onceki_gecikme FROM hv_flights f WHERE f.tail_no = 'TC-KNA' AND f.sched_dep >= '2024-12-01' AND f.sched_dep < '2024-12-03' ORDER BY f.sched_dep, f.flight_id;`,
      { ord: true, hint: 'LAG(ifade) OVER (ORDER BY sched_dep, flight_id). Tek uçak filtrelendiği için PARTITION BY gerekmez; flight_id eşit kalkış saatlerinde sırayı sabitler.' }),
    sq('Rotaları ortalama kalkış gecikmesine göre sırala (iptaller hariç) ve en kötü 5 rotayı getir: <code>origin</code>, <code>dest</code>, <code>ort_gecikme</code> (1 basamak), <code>sira</code> (DENSE_RANK, en kötü 1).',
      `WITH g AS (SELECT r.origin, r.dest, ROUND(AVG(${DLY}), 1) AS ort_gecikme FROM hv_flights f JOIN hv_routes r ON r.route_id = f.route_id WHERE f.actual_dep IS NOT NULL GROUP BY r.origin, r.dest), s AS (SELECT origin, dest, ort_gecikme, DENSE_RANK() OVER (ORDER BY ort_gecikme DESC) AS sira FROM g) SELECT origin, dest, ort_gecikme, sira FROM s WHERE sira <= 5 ORDER BY sira, origin, dest;`,
      { ord: true, hint: 'Önce rota ortalamalarını CTE ile hesapla, sonra DENSE_RANK; filtreyi dış sorguda uygula.' }),
    sq('Aralık 2024 için günlük taşınan yolcu sayısını ve 7 günlük hareketli ortalamayı (bu gün ve önceki 6 gün, 1 basamak) getir: <code>gun</code>, <code>yolcu</code>, <code>ort7</code>. Güne göre sırala.',
      "WITH d AS (SELECT date(sched_dep) AS gun, SUM(pax) AS yolcu FROM hv_flights WHERE sched_dep >= '2024-12-01' AND sched_dep < '2025-01-01' GROUP BY date(sched_dep)) SELECT gun, yolcu, ROUND(AVG(yolcu) OVER (ORDER BY gun ROWS BETWEEN 6 PRECEDING AND CURRENT ROW), 1) AS ort7 FROM d ORDER BY gun;",
      { ord: true }),
    sq('1–3 numaralı üyelerin rezervasyonlarını rezervasyon zamanına göre numaralandır ve her satırda üyenin <b>ilk</b> rezervasyon zamanını göster: <code>passenger_id</code>, <code>booking_id</code>, <code>sira</code>, <code>ilk_rezervasyon</code>. Üyeye, sonra sıraya göre sırala.',
      'SELECT passenger_id, booking_id, ROW_NUMBER() OVER (PARTITION BY passenger_id ORDER BY booked_at, booking_id) AS sira, FIRST_VALUE(booked_at) OVER (PARTITION BY passenger_id ORDER BY booked_at, booking_id) AS ilk_rezervasyon FROM hv_bookings WHERE passenger_id <= 3 ORDER BY passenger_id, sira;', { ord: true }),
    sq('Gerçekleşen (flown) rezervasyonlarda üyelik seviyelerinin toplam harcama içindeki payını getir: <code>tier</code>, <code>harcama</code> (tam sayı), <code>pay</code> (yüzde, 1 basamak).',
      "SELECT p.tier, ROUND(SUM(b.price)) AS harcama, ROUND(100.0 * SUM(b.price) / SUM(SUM(b.price)) OVER (), 1) AS pay FROM hv_bookings b JOIN hv_passengers p ON p.passenger_id = b.passenger_id WHERE b.status = 'flown' GROUP BY p.tier;",
      { hint: 'Genel toplam için SUM(SUM(b.price)) OVER () ya da bir CTE.' }),
    mc('<p>“Her uçak için bir önceki uçuşun gecikmesi” sorgusunda <code>PARTITION BY tail_no</code> yazmayı unutursan ne olur?</p>', ['Sorgu hata verir', 'LAG, zaman sırasındaki bir önceki uçuşu getirir; bu çoğu zaman başka bir uçağın uçuşudur', 'Her satırda NULL döner', 'Sonuç değişmez, çünkü ORDER BY yeterlidir'], 1,
      'PARTITION BY olmadan tüm uçuşlar tek bir sırada dizilir ve LAG bir önceki satıra, yani büyük olasılıkla başka bir uçağa bakar. Rötar zincirini ölçmek için her uçak kendi bölümünde olmalıdır.')
  ]
},
/* ---------------------------------------------------------------- 8 */
{
  id: 'hv-analitik', lv: 'B2', mod: MOD, min: 18,
  title: 'Havayolu metrikleri: doluluk, zamanında varış, yolcu-km ve sadakat',
  sum: 'Sektörün temel ölçülerini SQL ile tanımlamak: load factor, OTP, RPK, no-show oranı, kohort ve Pareto.',
  body: `
<h2>Sektör sözlüğü</h2>
<table>
<tr><th>Metrik</th><th>Tanım</th><th>SQL fikri</th></tr>
<tr><td>Doluluk (load factor)</td><td>Binen yolcu ÷ koltuk</td><td><code>SUM(pax) / SUM(seats)</code></td></tr>
<tr><td>Zamanında varış (OTP)</td><td>Planlanandan en fazla 15 dk geç inen uçuşların payı</td><td>Koşullu sayım ÷ inen uçuş</td></tr>
<tr><td>Yolcu-km (RPK)</td><td>Taşınan yolcu × uçulan mesafe</td><td><code>SUM(pax * distance_km)</code></td></tr>
<tr><td>Koltuk-km (ASK)</td><td>Sunulan koltuk × mesafe</td><td><code>SUM(seats * distance_km)</code></td></tr>
<tr><td>No-show oranı</td><td>Rezervasyonu olup uçuşa gelmeyenler</td><td><code>no_show ÷ (flown + no_show)</code></td></tr>
</table>
<p>Doluluğun kilometre ağırlıklı hali RPK ÷ ASK'tır; uzun rotalardaki boş koltuk, kısa rotadakinden daha pahalıdır.</p>
<pre class="code">SELECT strftime('%Y-%m', f.sched_dep) AS ay,
       ROUND(100.0 * SUM(f.pax * r.distance_km) / SUM(a.seats * r.distance_km), 1) AS km_doluluk
FROM hv_flights f
JOIN hv_routes r ON r.route_id = f.route_id
JOIN hv_aircraft a ON a.tail_no = f.tail_no
WHERE f.status <> 'cancelled'
GROUP BY strftime('%Y-%m', f.sched_dep)
ORDER BY ay;</pre>
<div class="note"><b>Paydayı dikkatle seç</b>No-show oranında iptal edilen rezervasyonlar paydaya girmez; çünkü iptal eden yolcu zaten koltuğu bıraktı. Her oran için “kimler bu olayı yaşayabilirdi?” sorusunu sor.</div>
`,
  ex: [
    sq('Doluluğu en yüksek 5 rotayı getir (iptal edilen uçuşlar hariç): <code>origin</code>, <code>dest</code>, <code>doluluk</code> (yüzde, 1 basamak). Doluluğa göre azalan, eşitlikte origin ve dest\'e göre sırala.',
      "SELECT r.origin, r.dest, ROUND(100.0 * SUM(f.pax) / SUM(a.seats), 1) AS doluluk FROM hv_flights f JOIN hv_routes r ON r.route_id = f.route_id JOIN hv_aircraft a ON a.tail_no = f.tail_no WHERE f.status <> 'cancelled' GROUP BY r.origin, r.dest ORDER BY doluluk DESC, r.origin, r.dest LIMIT 5;", { ord: true }),
    sq('Uçak tipine göre zamanında <b>varış</b> oranı (en fazla 15 dakika geç inen uçuşların yüzdesi, 1 basamak; yalnızca inişi kayıtlı uçuşlar): <code>model</code>, <code>ucus</code>, <code>otp</code>.',
      `SELECT a.model, COUNT(*) AS ucus, ROUND(100.0 * SUM(CASE WHEN ${DLYA} <= 15 THEN 1 ELSE 0 END) / COUNT(*), 1) AS otp FROM hv_flights f JOIN hv_aircraft a ON a.tail_no = f.tail_no WHERE f.actual_arr IS NOT NULL GROUP BY a.model;`),
    sq('Aylık yolcu-km (RPK) değerini <b>bin km</b> cinsinden (tam sayı) getir: <code>ay</code>, <code>rpk_bin</code>. Aya göre sırala.',
      "SELECT strftime('%Y-%m', f.sched_dep) AS ay, ROUND(SUM(f.pax * r.distance_km) / 1000.0) AS rpk_bin FROM hv_flights f JOIN hv_routes r ON r.route_id = f.route_id GROUP BY strftime('%Y-%m', f.sched_dep) ORDER BY ay;", { ord: true }),
    sq('Ücret sınıfına göre no-show oranı: payda yalnızca uçuşa gelmesi beklenenler (flown + no_show). Sütunlar: <code>fare_class</code>, <code>beklenen</code>, <code>no_show</code>, <code>oran</code> (yüzde, 2 basamak).',
      "SELECT fare_class, COUNT(*) AS beklenen, SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) AS no_show, ROUND(100.0 * SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) / COUNT(*), 2) AS oran FROM hv_bookings WHERE status IN ('flown', 'no_show') GROUP BY fare_class;"),
    sq('Üyelik yılına göre kohort: her üyelik yılı için üye sayısı ve üye başına ortalama gerçekleşen (flown) uçuş sayısı (1 basamak); hiç uçmayan üyeler 0 sayılsın: <code>uyelik_yili</code>, <code>uye</code>, <code>ort_ucus</code>. Yıla göre sırala.',
      "WITH u AS (SELECT p.passenger_id, strftime('%Y', p.joined_date) AS yil, COUNT(b.booking_id) AS ucus FROM hv_passengers p LEFT JOIN hv_bookings b ON b.passenger_id = p.passenger_id AND b.status = 'flown' GROUP BY p.passenger_id, strftime('%Y', p.joined_date)) SELECT yil AS uyelik_yili, COUNT(*) AS uye, ROUND(AVG(ucus), 1) AS ort_ucus FROM u GROUP BY yil ORDER BY uyelik_yili;",
      { ord: true, hint: 'status koşulunu WHERE yerine LEFT JOIN\'in ON kısmına yaz; yoksa hiç uçmayan üyeler kaybolur.' }),
    sq('Rötar nedenlerinin Pareto tablosu: her nedenin toplam dakikası, toplam içindeki payı ve kümülatif payı (yüzde, 1 basamak): <code>reason</code>, <code>dakika</code>, <code>pay</code>, <code>kumulatif</code>. Dakikaya göre azalan sırala.',
      'WITH d AS (SELECT reason, SUM(minutes) AS dakika FROM hv_delays GROUP BY reason) SELECT reason, dakika, ROUND(100.0 * dakika / SUM(dakika) OVER (), 1) AS pay, ROUND(100.0 * SUM(dakika) OVER (ORDER BY dakika DESC ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) / SUM(dakika) OVER (), 1) AS kumulatif FROM d ORDER BY dakika DESC;', { ord: true }),
    mc('<p>No-show oranı hesaplarken iptal edilen rezervasyonlar neden paydaya alınmaz?</p>', ['İptal edilen rezervasyonların ücreti iade edildiği için', 'İptal eden yolcu koltuğu önceden bıraktı; no-show riski yalnızca uçuşa gelmesi beklenenler için vardır', 'İptaller ayrı bir tabloda tutulduğu için', 'İptaller dahil edilirse oran 100\'ü geçer'], 1,
      'Bir oranın paydası, o olayı yaşama ihtimali olan grup olmalıdır. İptal eden yolcunun uçuşa gelmemesi beklenen bir durumdur ve no-show sayılmaz.')
  ]
},
/* ---------------------------------------------------------------- 9 */
{
  id: 'hv-veri', lv: 'C1', mod: MOD, min: 16,
  title: 'Veri değiştirme ve bütünlük: iptal, yeni rota, kısıtlar ve işlemler',
  sum: 'Rezervasyon ve uçuş iptali, INSERT ... SELECT ile rota ekleme, CHECK kısıtı ve tek işlemde birden çok değişiklik.',
  body: `
<h2>Operasyonda veri değişir</h2>
<p>Bir uçuş iptal olduğunda yalnızca uçuşun durumu değişmez; o uçuştaki tüm rezervasyonlar da iptal edilmelidir. İki değişiklikten biri yapılıp diğeri yapılamazsa sistem tutarsız kalır. Bu yüzden birlikte, tek bir işlem içinde yapılır.</p>
<pre class="code" data-norun>BEGIN;
UPDATE hv_flights
SET status = 'cancelled', actual_dep = NULL, actual_arr = NULL, pax = 0
WHERE flight_id = 3000;
UPDATE hv_bookings
SET status = 'cancelled', seat = NULL
WHERE flight_id = 3000;
COMMIT;</pre>
<h2>Var olan veriden yeni satır üretmek</h2>
<p>ADB → FRA rotası planlandı ama dönüşü yok. Dönüş rotasını elle yazmak yerine mevcut rotadan türetebilirsin:</p>
<pre class="code" data-norun>INSERT INTO hv_routes (route_id, origin, dest, distance_km, block_min)
SELECT 46, dest, origin, distance_km, block_min
FROM hv_routes
WHERE origin = 'ADB' AND dest = 'FRA';</pre>
<div class="warn"><b>Önce SELECT, sonra UPDATE</b>Bir UPDATE veya DELETE'i çalıştırmadan önce aynı WHERE koşuluyla SELECT çalıştırıp kaç satırın etkileneceğini gör. Bu derste her alıştırma veritabanının temiz bir kopyasında çalışır.</div>
`,
  ex: [
    sq('11 numaralı rezervasyon hatalı girilmiş, iptal et: durumunu <b>\'cancelled\'</b> yap ve koltuğunu boşalt (NULL).',
      "UPDATE hv_bookings SET status = 'cancelled', seat = NULL WHERE booking_id = 11;",
      { check: 'SELECT booking_id, status, seat FROM hv_bookings WHERE booking_id IN (10, 11, 12) ORDER BY booking_id', hint: 'İki sütunu tek SET içinde virgülle güncelle.' }),
    sq('3000 numaralı uçuşu iptal et ve bu uçuştaki tüm rezervasyonları da iptal et; iki değişikliği tek bir işlem (transaction) içinde yap. Uçuşta durum \'cancelled\', gerçek zamanlar NULL, pax 0; rezervasyonlarda durum \'cancelled\', koltuk NULL olsun.',
      "BEGIN; UPDATE hv_flights SET status = 'cancelled', actual_dep = NULL, actual_arr = NULL, pax = 0 WHERE flight_id = 3000; UPDATE hv_bookings SET status = 'cancelled', seat = NULL WHERE flight_id = 3000; COMMIT;",
      { dl: ['sqlite', 'pg', 'mysql', 'tsql', 'oracle'], check: "SELECT (SELECT status || '|' || COALESCE(pax, -1) FROM hv_flights WHERE flight_id = 3000) AS ucus, (SELECT COUNT(*) FROM hv_bookings WHERE flight_id = 3000 AND status <> 'cancelled') AS kalan, (SELECT COUNT(*) FROM hv_bookings WHERE flight_id = 3000 AND seat IS NOT NULL) AS koltuklu",
        solv: { tsql: "BEGIN TRANSACTION; UPDATE hv_flights SET status = 'cancelled', actual_dep = NULL, actual_arr = NULL, pax = 0 WHERE flight_id = 3000; UPDATE hv_bookings SET status = 'cancelled', seat = NULL WHERE flight_id = 3000; COMMIT;", mysql: "START TRANSACTION; UPDATE hv_flights SET status = 'cancelled', actual_dep = NULL, actual_arr = NULL, pax = 0 WHERE flight_id = 3000; UPDATE hv_bookings SET status = 'cancelled', seat = NULL WHERE flight_id = 3000; COMMIT;", oracle: "UPDATE hv_flights SET status = 'cancelled', actual_dep = NULL, actual_arr = NULL, pax = 0 WHERE flight_id = 3000; UPDATE hv_bookings SET status = 'cancelled', seat = NULL WHERE flight_id = 3000; COMMIT;" },
        hint: 'SQL Server: BEGIN TRANSACTION, MySQL: START TRANSACTION, Oracle: işlem ilk DML ile başlar.' }),
    sq('ADB → FRA rotasının dönüşünü (FRA → ADB) aynı mesafe ve süreyle, 46 numaralı rota olarak INSERT ... SELECT ile ekle.',
      "INSERT INTO hv_routes (route_id, origin, dest, distance_km, block_min) SELECT 46, dest, origin, distance_km, block_min FROM hv_routes WHERE origin = 'ADB' AND dest = 'FRA';",
      { check: "SELECT route_id, origin, dest, distance_km, block_min FROM hv_routes WHERE 'FRA' IN (origin, dest) AND 'ADB' IN (origin, dest) ORDER BY route_id", hint: 'SELECT listesinde origin ve dest\'in yerini değiştir.' }),
    sq('Ek hizmet satışları için <code>hv_ek_hizmet</code> tablosunu oluştur: <code>hizmet_id</code> birincil anahtar, <code>booking_id</code> hv_bookings\'e yabancı anahtar, <code>tur</code> yalnızca \'bagaj\', \'koltuk\' veya \'yemek\' olabilir (CHECK), <code>ucret</code> negatif olamaz (CHECK). İki satır ekle: (1, 5, \'bagaj\', 450) ve (2, 5, \'yemek\', 180).',
      "CREATE TABLE hv_ek_hizmet (hizmet_id INTEGER PRIMARY KEY, booking_id INTEGER REFERENCES hv_bookings(booking_id), tur VARCHAR(10) CHECK (tur IN ('bagaj', 'koltuk', 'yemek')), ucret DECIMAL(10, 2) CHECK (ucret >= 0)); INSERT INTO hv_ek_hizmet VALUES (1, 5, 'bagaj', 450); INSERT INTO hv_ek_hizmet VALUES (2, 5, 'yemek', 180);",
      { dl: ['tsql', 'pg', 'mysql', 'oracle', 'sqlite'], check: 'SELECT hizmet_id, booking_id, tur, ucret FROM hv_ek_hizmet ORDER BY hizmet_id', hint: "CHECK (tur IN ('bagaj', 'koltuk', 'yemek')) ve CHECK (ucret >= 0)." }),
    sq('Seviye yükseltme: gerçekleşen (flown) uçuş sayısı <b>10 veya daha fazla</b> olan <b>Silver</b> üyeleri <b>Gold</b> yap.',
      "UPDATE hv_passengers SET tier = 'Gold' WHERE tier = 'Silver' AND passenger_id IN (SELECT passenger_id FROM hv_bookings WHERE status = 'flown' GROUP BY passenger_id HAVING COUNT(*) >= 10);",
      { check: 'SELECT tier, COUNT(*) AS uye FROM hv_passengers GROUP BY tier ORDER BY tier', hint: 'Önce aynı alt sorguyu SELECT olarak çalıştırıp kaç üyenin etkileneceğini gör.' }),
    mc('<p>Uçuş iptali ile rezervasyon iptalini aynı işlem içinde yapmazsan en kötü durumda ne olur?</p>', ['Hiçbir şey; iki UPDATE her zaman birlikte başarılı olur', 'İlk UPDATE başarılı olup ikincisi hata verirse uçuş iptal görünür ama yolcuların rezervasyonları aktif kalır', 'İkinci UPDATE ilkini otomatik olarak geri alır', 'Veritabanı iki UPDATE\'i birleştirip tek satır günceller'], 1,
      'İşlem (transaction) “ya hep ya hiç” garantisi verir: ikinci adım başarısız olursa ROLLBACK ile ilk adım da geri alınır ve veri tutarlı kalır.')
  ]
},
/* ---------------------------------------------------------------- 10 */
{
  id: 'proje-hava', lv: 'C1', mod: MOD, min: 40,
  title: 'Bitirme projesi (Kanat Havayolları): operasyon ve gelir raporu',
  sum: 'Operasyon direktörü ve gelir müdürü için altı soruluk, baştan sona bir analiz.',
  body: `
<h2>Senaryo</h2>
<p>Kanat Havayolları'nın yönetim kurulu Ocak toplantısında son dört ayı değerlendirecek. Operasyon direktörü dakiklik ve iptallerle, gelir müdürü sadakat üyelerinin gelirle ilgileniyor. Senden altı soruluk bir rapor isteniyor; her sorunun sonucu bir slayda dönüşecek.</p>
<table>
<tr><th>Soru</th><th>Kullanacağın beceriler</th></tr>
<tr><td>1. Operasyon özeti</td><td>Koşullu sayım, dakika farkı, oranlar</td></tr>
<tr><td>2. Sorunlu havalimanları</td><td>JOIN, GROUP BY, HAVING, sıralama</td></tr>
<tr><td>3. Rötar nedenleri aylara göre</td><td>Pivot (koşullu toplama)</td></tr>
<tr><td>4. Aylık üye geliri ve değişim</td><td>CTE, LAG</td></tr>
<tr><td>5. En değerli üyeler</td><td>JOIN, toplama, sıralama</td></tr>
<tr><td>6. Kış iptal riski</td><td>Rota düzeyinde oran, minimum hacim filtresi</td></tr>
</table>
<div class="tip"><b>Her sonucu bir cümleyle yorumla</b>“Aralık'ta ortalama gecikme 35 dakikaya çıktı ve en büyük pay hava koşullarında” gibi bir cümle, tablonun kendisinden daha çok iş görür. Raporu yazarken sayının arkasındaki nedeni ara.</div>
`,
  ex: [
    sq('<b>Operasyon özeti.</b> Tek satırda: planlanan uçuş (<code>planlanan</code>), iptal oranı yüzde (<code>iptal_orani</code>, 2 basamak), zamanında kalkış oranı yüzde (<code>otp</code>, 1 basamak; yalnızca kalkan uçuşlar) ve ortalama kalkış gecikmesi dakika (<code>ort_gecikme</code>, 1 basamak).',
      `SELECT COUNT(*) AS planlanan, ROUND(100.0 * SUM(CASE WHEN f.status = 'cancelled' THEN 1 ELSE 0 END) / COUNT(*), 2) AS iptal_orani, ROUND(100.0 * SUM(CASE WHEN ${DLY} <= 15 THEN 1 ELSE 0 END) / COUNT(f.actual_dep), 1) AS otp, ROUND(AVG(${DLY}), 1) AS ort_gecikme FROM hv_flights f;`,
      { hint: 'OTP paydası COUNT(actual_dep) olmalı; AVG ise NULL gecikmeleri kendiliğinden atlar.' }),
    sq('<b>Sorunlu havalimanları.</b> En az 150 kalkışı olan havalimanlarından ortalama kalkış gecikmesi en yüksek 3 tanesi (iptaller hariç): <code>airport_code</code>, <code>city</code>, <code>kalkis</code>, <code>ort_gecikme</code> (1 basamak). Gecikmeye göre azalan sırala.',
      `SELECT a.airport_code, a.city, COUNT(*) AS kalkis, ROUND(AVG(${DLY}), 1) AS ort_gecikme FROM hv_flights f JOIN hv_routes r ON r.route_id = f.route_id JOIN hv_airports a ON a.airport_code = r.origin WHERE f.actual_dep IS NOT NULL GROUP BY a.airport_code, a.city HAVING COUNT(*) >= 150 ORDER BY ort_gecikme DESC, a.airport_code LIMIT 3;`, { ord: true }),
    sq('<b>Rötar nedenleri aylara göre.</b> Her ay için hava, teknik ve geç gelen uçak kaynaklı toplam rötar dakikalarını yan yana getir: <code>ay</code>, <code>hava</code>, <code>teknik</code>, <code>gec_gelen_ucak</code>. Aya göre sırala.',
      "SELECT strftime('%Y-%m', f.sched_dep) AS ay, SUM(CASE WHEN d.reason = 'hava' THEN d.minutes ELSE 0 END) AS hava, SUM(CASE WHEN d.reason = 'teknik' THEN d.minutes ELSE 0 END) AS teknik, SUM(CASE WHEN d.reason = 'gec_gelen_ucak' THEN d.minutes ELSE 0 END) AS gec_gelen_ucak FROM hv_delays d JOIN hv_flights f ON f.flight_id = d.flight_id GROUP BY strftime('%Y-%m', f.sched_dep) ORDER BY ay;", { ord: true }),
    sq('<b>Aylık üye geliri.</b> Gerçekleşen (flown) rezervasyonların uçuş ayına göre toplam gelirini (tam sayı) ve bir önceki aya göre değişim yüzdesini (1 basamak; ilk ayda NULL) getir: <code>ay</code>, <code>gelir</code>, <code>degisim</code>. Aya göre sırala.',
      "WITH m AS (SELECT strftime('%Y-%m', f.sched_dep) AS ay, SUM(b.price) AS gelir FROM hv_bookings b JOIN hv_flights f ON f.flight_id = b.flight_id WHERE b.status = 'flown' GROUP BY strftime('%Y-%m', f.sched_dep)) SELECT ay, ROUND(gelir) AS gelir, ROUND(100.0 * (gelir - LAG(gelir) OVER (ORDER BY ay)) / LAG(gelir) OVER (ORDER BY ay), 1) AS degisim FROM m ORDER BY ay;",
      { ord: true, hint: 'Gelir uçuşun gerçekleştiği aya yazılır (rezervasyon tarihine değil).' }),
    sq('<b>En değerli üyeler.</b> Gerçekleşen uçuşlardaki toplam harcamaya göre en değerli 5 üye: <code>full_name</code>, <code>tier</code>, <code>ucus</code>, <code>harcama</code> (tam sayı). Harcamaya göre azalan, eşitlikte ada göre sırala.',
      "SELECT p.full_name, p.tier, COUNT(*) AS ucus, ROUND(SUM(b.price)) AS harcama FROM hv_bookings b JOIN hv_passengers p ON p.passenger_id = b.passenger_id WHERE b.status = 'flown' GROUP BY p.passenger_id, p.full_name, p.tier ORDER BY harcama DESC, p.full_name LIMIT 5;", { ord: true }),
    sq('<b>Kış iptal riski.</b> Kasım ve Aralık 2024\'te en az 20 uçuşu olan rotalardan iptal oranı en yüksek 3 tanesi: <code>origin</code>, <code>dest</code>, <code>ucus</code>, <code>iptal</code>, <code>oran</code> (yüzde, 1 basamak). Orana göre azalan, eşitlikte origin ve dest\'e göre sırala.',
      "SELECT r.origin, r.dest, COUNT(*) AS ucus, SUM(CASE WHEN f.status = 'cancelled' THEN 1 ELSE 0 END) AS iptal, ROUND(100.0 * SUM(CASE WHEN f.status = 'cancelled' THEN 1 ELSE 0 END) / COUNT(*), 1) AS oran FROM hv_flights f JOIN hv_routes r ON r.route_id = f.route_id WHERE f.sched_dep >= '2024-11-01' AND f.sched_dep < '2025-01-01' GROUP BY r.origin, r.dest HAVING COUNT(*) >= 20 ORDER BY oran DESC, r.origin, r.dest LIMIT 3;", { ord: true })
  ]
}
];
const at = L.findIndex(l => l.id === 'proje-temel');
L.splice(at < 0 ? L.length : at + 1, 0, ...lessons);

/* ---------- Öğrenme yolu ---------- */
const P = window.SQLP_PATHS = window.SQLP_PATHS || [];
P.push({
  id: 'hava', name: 'Kanat Havayolları ile SQL', short: 'KH', color: '#1D6FB8',
  desc: 'Anadolu Market\'ten bağımsız, bir havayolu şirketinin verisiyle temelden ileriye 10 ders ve bitirme projesi.',
  long: 'Aynı SQL becerilerini bambaşka bir sektörde, sıfırdan uygula: uçuşlar, rotalar, havalimanları, rötar nedenleri ve sadakat üyeleri. Seçme ve filtrelemeyle başlar; zaman farkları, çok tablolu JOIN, kendine birleştirme, alt sorgu, pencere fonksiyonları, sektör metrikleri ve veri değiştirme ile devam eder. Konu anlatımlarının ayrıntısı için ana derslere bağlantı vermez; her ders kendi içinde tamamdır.',
  skills: ['Zaman ve süre hesapları', 'Çok tablolu JOIN', 'Kendine birleştirme', 'Doluluk ve dakiklik metrikleri', 'Pencere fonksiyonları', 'Kohort ve Pareto', 'İşlem ve kısıtlar'],
  lessons: ['hv-tanis', 'hv-ozet', 'hv-zaman', 'hv-join', 'hv-self', 'hv-alt', 'hv-pencere', 'hv-analitik', 'hv-veri', 'proje-hava'],
  comp: [
    { t: 'Temel sorgular', d: 'Seçme, filtreleme, özetleme', l: ['hv-tanis', 'hv-ozet'] },
    { t: 'Zaman', d: 'Dakika farkı, saat ve ay gruplaması, zamanında kalkış', l: ['hv-zaman'] },
    { t: 'Tabloları birleştirme', d: 'JOIN zinciri, iki rolde aynı tablo, alt sorgu', l: ['hv-join', 'hv-self', 'hv-alt'] },
    { t: 'Analitik', d: 'Pencere fonksiyonları ve sektör metrikleri', l: ['hv-pencere', 'hv-analitik'] },
    { t: 'Veri yönetimi', d: 'Güncelleme, işlem, kısıt', l: ['hv-veri'] },
    { t: 'Bitirme projesi', d: 'Yönetim kurulu için operasyon ve gelir raporu', l: ['proje-hava'] }
  ],
  beyond: ['Gerçek açık veri: ABD Ulaştırma Bakanlığı uçuş dakiklik verisi (BTS On-Time Performance)', 'Gelir yönetimi ve dinamik fiyatlama', 'Saat dilimi ve yaz saati yönetimi', 'Operasyon panoları (Power BI, Tableau)']
});

/* ---------- Alıştırma bankası: Kanat Havayolları ---------- */
const PR = window.SQLP_PRACTICE = window.SQLP_PRACTICE || [];
const T = window.SQLP_PRACTICE_TOPICS = window.SQLP_PRACTICE_TOPICS || {}; T.hav = 'Havayolu verisi';
const add = (id, Lv, d, title, q, sol, o) => PR.push(Object.assign({ id, L: Lv, t: 'hav', d, title, q: '<p>' + q + '</p>', sol, type: 'sql' }, o || {}));
/* Temel */
add('k001', 'temel', 1, 'Filo listesi', 'Tüm uçakları tescil sırasıyla getir: <code>tail_no</code>, <code>model</code>, <code>seats</code>.', 'SELECT tail_no, model, seats FROM hv_aircraft ORDER BY tail_no;', { ord: true });
add('k002', 'temel', 1, 'Türkiye havalimanları', 'Türkiye\'deki havalimanı sayısı: <code>adet</code>.', "SELECT COUNT(*) AS adet FROM hv_airports WHERE country = 'Türkiye';");
add('k003', 'temel', 1, 'Uzun rotalar', '2000 km\'den uzun rotalar: <code>route_id</code>, <code>origin</code>, <code>dest</code>, <code>distance_km</code>. Mesafeye göre azalan, eşitlikte route_id\'ye göre sırala.', 'SELECT route_id, origin, dest, distance_km FROM hv_routes WHERE distance_km > 2000 ORDER BY distance_km DESC, route_id;', { ord: true });
add('k004', 'temel', 1, 'Yön değiştiren uçuşlar', 'Başka bir havalimanına yönlendirilen (diverted) uçuşlar: <code>flight_id</code>, <code>flight_no</code>, <code>sched_dep</code>. Kalkışa göre sırala.', "SELECT flight_id, flight_no, sched_dep FROM hv_flights WHERE status = 'diverted' ORDER BY sched_dep;", { ord: true });
add('k005', 'temel', 1, 'Seviye dağılımı', 'Üyelik seviyesine göre üye sayısı: <code>tier</code>, <code>uye</code>. Üye sayısına göre azalan sırala.', 'SELECT tier, COUNT(*) AS uye FROM hv_passengers GROUP BY tier ORDER BY uye DESC;', { ord: true });
add('k006', 'temel', 1, 'Business rezervasyonları', 'Business sınıfı rezervasyon sayısı ve ortalama ücreti (tam sayı): <code>adet</code>, <code>ort</code>.', "SELECT COUNT(*) AS adet, ROUND(AVG(price)) AS ort FROM hv_bookings WHERE fare_class = 'Business';");
add('k007', 'temel', 2, 'En eski uçaklar', 'Üretim yılı en eski 3 uçak: <code>tail_no</code>, <code>model</code>, <code>year_built</code>. Yıla, eşitlikte tescile göre sırala.', 'SELECT tail_no, model, year_built FROM hv_aircraft ORDER BY year_built, tail_no LIMIT 3;', { ord: true });
add('k008', 'temel', 2, 'Şehre göre üyeler', 'Şehri kayıtlı üyelerin şehir başına sayısı; yalnızca 50\'den fazla üyesi olan şehirler: <code>city</code>, <code>uye</code>. Üye sayısına göre azalan sırala.', 'SELECT city, COUNT(*) AS uye FROM hv_passengers WHERE city IS NOT NULL GROUP BY city HAVING COUNT(*) > 50 ORDER BY uye DESC;', { ord: true });
add('k009', 'temel', 2, 'Sefer başına uçuş', 'Sefer numarası başına uçuş sayısı; en çok uçan 5 sefer: <code>flight_no</code>, <code>ucus</code>. Uçuş sayısına göre azalan, eşitlikte sefer numarasına göre sırala.', 'SELECT flight_no, COUNT(*) AS ucus FROM hv_flights GROUP BY flight_no ORDER BY ucus DESC, flight_no LIMIT 5;', { ord: true });
add('k010', 'temel', 2, 'Bagajsız yolcular', 'Gerçekleşen rezervasyonlarda bagajsız (bags = 0) yolculuk oranı (yüzde, 1 basamak): <code>oran</code>.', "SELECT ROUND(100.0 * SUM(CASE WHEN bags = 0 THEN 1 ELSE 0 END) / COUNT(*), 1) AS oran FROM hv_bookings WHERE status = 'flown';");
add('k011', 'temel', 2, 'Gmail kullanan üyeler', 'E-postası <code>@gmail.com</code> ile biten üye sayısı: <code>adet</code>.', "SELECT COUNT(*) AS adet FROM hv_passengers WHERE email LIKE '%@gmail.com';");
add('k012', 'temel', 2, 'Doğum on yılları', 'Üyeleri doğum yılına göre on yıllık gruplara ayır (1950, 1960, …) ve say: <code>onyil</code>, <code>uye</code>. On yıla göre sırala.', 'SELECT FLOOR(birth_year / 10) * 10 AS onyil, COUNT(*) AS uye FROM hv_passengers GROUP BY FLOOR(birth_year / 10) * 10 ORDER BY onyil;', { ord: true });
add('k013', 'temel', 2, 'Koltuk harfi', 'Gerçekleşen rezervasyonlarda koltuk harfine göre (koltuğun son karakteri) rezervasyon sayısı: <code>harf</code>, <code>adet</code>. Harfe göre sırala.', "SELECT SUBSTR(seat, LENGTH(seat), 1) AS harf, COUNT(*) AS adet FROM hv_bookings WHERE status = 'flown' AND seat IS NOT NULL GROUP BY SUBSTR(seat, LENGTH(seat), 1) ORDER BY harf;", { ord: true });
add('k014', 'temel', 3, 'Ücret bantları', 'Rezervasyonları ücretine göre bantla: 1000 altı <b>\'Ekonomik\'</b>, 1000–2999 <b>\'Orta\'</b>, 3000 ve üzeri <b>\'Yüksek\'</b>; her bandın rezervasyon sayısı: <code>bant</code>, <code>adet</code>.', "SELECT CASE WHEN price < 1000 THEN 'Ekonomik' WHEN price < 3000 THEN 'Orta' ELSE 'Yüksek' END AS bant, COUNT(*) AS adet FROM hv_bookings GROUP BY CASE WHEN price < 1000 THEN 'Ekonomik' WHEN price < 3000 THEN 'Orta' ELSE 'Yüksek' END;");
add('k015', 'temel', 3, 'Aylık uçuş', 'Ay başına planlanan uçuş ve iptal sayısı: <code>ay</code>, <code>ucus</code>, <code>iptal</code>. Aya göre sırala.', "SELECT strftime('%Y-%m', sched_dep) AS ay, COUNT(*) AS ucus, SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS iptal FROM hv_flights GROUP BY strftime('%Y-%m', sched_dep) ORDER BY ay;", { ord: true });
add('k016', 'temel', 3, 'Planlanan süre', 'Planlanan uçuş süresi (block_min) 120 dakikadan uzun rotaların sayısı ve ortalama süresi (tam sayı): <code>rota</code>, <code>ort_dk</code>.', 'SELECT COUNT(*) AS rota, ROUND(AVG(block_min)) AS ort_dk FROM hv_routes WHERE block_min > 120;');
/* Orta */
add('k101', 'orta', 1, 'Rota şehirleri', 'Ankara\'dan (ESB) kalkan rotaları varış şehri adıyla getir: <code>dest</code>, <code>city</code>, <code>distance_km</code>. Mesafeye göre sırala.', "SELECT r.dest, a.city, r.distance_km FROM hv_routes r JOIN hv_airports a ON a.airport_code = r.dest WHERE r.origin = 'ESB' ORDER BY r.distance_km;", { ord: true });
add('k102', 'orta', 1, 'Uçak tipine göre uçuş', 'Uçak tipine göre uçuş sayısı: <code>model</code>, <code>ucus</code>. Uçuş sayısına göre azalan sırala.', 'SELECT a.model, COUNT(*) AS ucus FROM hv_flights f JOIN hv_aircraft a ON a.tail_no = f.tail_no GROUP BY a.model ORDER BY ucus DESC;', { ord: true });
add('k103', 'orta', 2, 'Varış gecikmesi', 'Aylık ortalama varış gecikmesi (1 basamak; yalnızca inişi kayıtlı uçuşlar): <code>ay</code>, <code>ort</code>. Aya göre sırala.', `SELECT strftime('%Y-%m', f.sched_dep) AS ay, ROUND(AVG(${DLYA}), 1) AS ort FROM hv_flights f WHERE f.actual_arr IS NOT NULL GROUP BY strftime('%Y-%m', f.sched_dep) ORDER BY ay;`, { ord: true });
add('k104', 'orta', 2, 'Haftanın günü', 'Haftanın gününe göre (0 = Pazar … 6 = Cumartesi) ortalama yolcu sayısı (1 basamak; iptaller hariç): <code>gun</code>, <code>ort_yolcu</code>. Güne göre sırala.', "SELECT CAST(strftime('%w', sched_dep) AS INTEGER) AS gun, ROUND(AVG(pax), 1) AS ort_yolcu FROM hv_flights WHERE status <> 'cancelled' GROUP BY CAST(strftime('%w', sched_dep) AS INTEGER) ORDER BY gun;", { ord: true, hint: 'SQLite %w Pazar\'ı 0 sayar. SQL Server\'da DATEPART(weekday, ...) DATEFIRST ayarına bağlıdır; bu uygulama SQLite numaralandırmasını kullanır.' });
add('k105', 'orta', 2, 'Seviyeye göre ücret', 'Gerçekleşen rezervasyonlarda üyelik seviyesine göre ortalama ücret (tam sayı): <code>tier</code>, <code>ort_ucret</code>. Ücrete göre azalan sırala.', "SELECT p.tier, ROUND(AVG(b.price)) AS ort_ucret FROM hv_bookings b JOIN hv_passengers p ON p.passenger_id = b.passenger_id WHERE b.status = 'flown' GROUP BY p.tier ORDER BY ort_ucret DESC;", { ord: true });
add('k106', 'orta', 2, 'Hiç uçmayan Gold üyeler', 'Hiç gerçekleşen (flown) uçuşu olmayan Gold ve Elite üye sayısı: <code>adet</code>.', "SELECT COUNT(*) AS adet FROM hv_passengers p WHERE p.tier IN ('Gold', 'Elite') AND NOT EXISTS (SELECT 1 FROM hv_bookings b WHERE b.passenger_id = p.passenger_id AND b.status = 'flown');");
add('k107', 'orta', 2, 'Uçağın ilk ve son uçuşu', 'Her uçağın dönemdeki ilk ve son planlanan kalkışı: <code>tail_no</code>, <code>ilk</code>, <code>son</code>. Tescile göre sırala.', 'SELECT tail_no, MIN(sched_dep) AS ilk, MAX(sched_dep) AS son FROM hv_flights GROUP BY tail_no ORDER BY tail_no;', { ord: true });
add('k108', 'orta', 2, 'Rötar nedenli uçuş payı', 'Tüm uçuşların yüzde kaçında en az bir rötar nedeni kaydı var? (1 basamak) <code>oran</code>.', 'SELECT ROUND(100.0 * (SELECT COUNT(DISTINCT flight_id) FROM hv_delays) / COUNT(*), 1) AS oran FROM hv_flights;');
add('k109', 'orta', 2, 'Yurt içi ve yurt dışı', 'Uçuşları yurt içi (iki uç da Türkiye) ve yurt dışı olarak ayır; her grubun uçuş sayısı ve ortalama yolcusu (1 basamak; iptaller hariç): <code>tur</code>, <code>ucus</code>, <code>ort_yolcu</code>.', "SELECT CASE WHEN k.country = 'Türkiye' AND v.country = 'Türkiye' THEN 'yurt_ici' ELSE 'yurt_disi' END AS tur, COUNT(*) AS ucus, ROUND(AVG(f.pax), 1) AS ort_yolcu FROM hv_flights f JOIN hv_routes r ON r.route_id = f.route_id JOIN hv_airports k ON k.airport_code = r.origin JOIN hv_airports v ON v.airport_code = r.dest WHERE f.status <> 'cancelled' GROUP BY CASE WHEN k.country = 'Türkiye' AND v.country = 'Türkiye' THEN 'yurt_ici' ELSE 'yurt_disi' END;");
add('k110', 'orta', 3, 'Doluluğu düşük uçuşlar', 'Doluluk oranı %50\'nin altında kalan (iptal edilmemiş) uçuş sayısı aylara göre: <code>ay</code>, <code>dusuk</code>. Aya göre sırala.', "SELECT strftime('%Y-%m', f.sched_dep) AS ay, SUM(CASE WHEN f.pax * 1.0 / a.seats < 0.5 THEN 1 ELSE 0 END) AS dusuk FROM hv_flights f JOIN hv_aircraft a ON a.tail_no = f.tail_no WHERE f.status <> 'cancelled' GROUP BY strftime('%Y-%m', f.sched_dep) ORDER BY ay;", { ord: true, hint: 'pax * 1.0 / seats tam sayı bölmesini önler.' });
add('k111', 'orta', 3, 'Rezervasyon öncesi gün', 'Ücret sınıfına göre rezervasyonun uçuştan ortalama kaç takvim günü önce yapıldığı (1 basamak): <code>fare_class</code>, <code>ort_gun</code>.', 'SELECT b.fare_class, ROUND(AVG(julianday(date(f.sched_dep)) - julianday(date(b.booked_at))), 1) AS ort_gun FROM hv_bookings b JOIN hv_flights f ON f.flight_id = b.flight_id GROUP BY b.fare_class;');
add('k112', 'orta', 3, 'Rota başına üye geliri', 'Gerçekleşen rezervasyonlardan en çok gelir getiren 5 rota (tam sayı): <code>origin</code>, <code>dest</code>, <code>gelir</code>. Gelire göre azalan sırala.', "SELECT r.origin, r.dest, ROUND(SUM(b.price)) AS gelir FROM hv_bookings b JOIN hv_flights f ON f.flight_id = b.flight_id JOIN hv_routes r ON r.route_id = f.route_id WHERE b.status = 'flown' GROUP BY r.origin, r.dest ORDER BY gelir DESC, r.origin LIMIT 5;", { ord: true });
add('k113', 'orta', 3, 'Rötar nedeni çeşitliliği', 'Birden fazla rötar nedeni kaydedilmiş uçuşların sayısı: <code>adet</code>.', 'SELECT COUNT(*) AS adet FROM (SELECT flight_id FROM hv_delays GROUP BY flight_id HAVING COUNT(*) > 1) t;');
add('k114', 'orta', 2, 'Uçağa göre son uçuş', 'Her uçağın en son planlanan uçuşunun sefer numarası ve kalkışı (ROW_NUMBER ile): <code>tail_no</code>, <code>flight_no</code>, <code>sched_dep</code>. Tescile göre sırala.', 'WITH s AS (SELECT tail_no, flight_no, sched_dep, ROW_NUMBER() OVER (PARTITION BY tail_no ORDER BY sched_dep DESC, flight_id DESC) AS rn FROM hv_flights) SELECT tail_no, flight_no, sched_dep FROM s WHERE rn = 1 ORDER BY tail_no;', { ord: true });
add('k115', 'orta', 3, 'Gidiş-dönüş yolcular', 'Aynı rota çiftinde hem gidiş hem dönüş uçuşu gerçekleştirmiş (flown) üye sayısı: <code>uye</code>.', "WITH u AS (SELECT DISTINCT b.passenger_id, r.origin, r.dest FROM hv_bookings b JOIN hv_flights f ON f.flight_id = b.flight_id JOIN hv_routes r ON r.route_id = f.route_id WHERE b.status = 'flown') SELECT COUNT(DISTINCT a.passenger_id) AS uye FROM u a JOIN u d ON d.passenger_id = a.passenger_id AND d.origin = a.dest AND d.dest = a.origin;");
add('k116', 'orta', 3, 'İptal edilen uçuştaki üyeler', 'Havayolu tarafından iptal edilen uçuşlarda rezervasyonu olan farklı üye sayısı: <code>uye</code>.', "SELECT COUNT(DISTINCT b.passenger_id) AS uye FROM hv_bookings b JOIN hv_flights f ON f.flight_id = b.flight_id WHERE f.status = 'cancelled';");
add('k117', 'orta', 2, 'Kanal kıyası yerine seviye kıyası', 'Seviyeye göre üye başına ortalama rezervasyon sayısı (1 basamak; hiç rezervasyonu olmayanlar 0): <code>tier</code>, <code>ort</code>.', 'WITH u AS (SELECT p.passenger_id, p.tier, COUNT(b.booking_id) AS n FROM hv_passengers p LEFT JOIN hv_bookings b ON b.passenger_id = p.passenger_id GROUP BY p.passenger_id, p.tier) SELECT tier, ROUND(AVG(n), 1) AS ort FROM u GROUP BY tier;');
add('k118', 'orta', 3, 'Saat dilimi', 'Londra (LHR) uçuşlarının Aralık 2024\'teki ilk 3 tanesinin planlanan varışını <b>Londra yerel saatiyle</b> getir (tz_offset farkı kadar kaydır): <code>flight_no</code>, <code>tr_saati</code>, <code>yerel</code>. Kalkışa göre sırala.', "SELECT f.flight_no, f.sched_arr AS tr_saati, datetime(f.sched_arr, (a.tz_offset - 3) || ' hours') AS yerel FROM hv_flights f JOIN hv_routes r ON r.route_id = f.route_id JOIN hv_airports a ON a.airport_code = r.dest WHERE r.dest = 'LHR' AND f.sched_dep >= '2024-12-01' ORDER BY f.sched_dep LIMIT 3;", { ord: true, hint: 'Yerel saat = Türkiye saati + (tz_offset − 3) saat. SQL Server: DATEADD(hour, a.tz_offset - 3, f.sched_arr).' });
/* İleri */
add('k201', 'ileri', 2, 'Uçak dönüş süresi', 'TC-KNA uçağının 2024-12-10 günündeki uçuşları arasında yerde kalma süresi (bir önceki planlanan varıştan bu planlanan kalkışa, dakika): <code>flight_no</code>, <code>sched_dep</code>, <code>yerde_dk</code>. Kalkışa göre sırala.', "SELECT flight_no, sched_dep, ROUND((julianday(sched_dep) - julianday(LAG(sched_arr) OVER (ORDER BY sched_dep, flight_id))) * 1440) AS yerde_dk FROM hv_flights WHERE tail_no = 'TC-KNA' AND sched_dep >= '2024-12-10' AND sched_dep < '2024-12-11' ORDER BY sched_dep, flight_id;", { ord: true });
add('k202', 'ileri', 2, 'Rotada en kötü gün', 'IST → ESB rotasında kalkış gecikmesi en yüksek 3 uçuşu DENSE_RANK ile bul: <code>sched_dep</code>, <code>gecikme</code>, <code>sira</code>.', `WITH g AS (SELECT f.sched_dep, ${DLY} AS gecikme FROM hv_flights f JOIN hv_routes r ON r.route_id = f.route_id WHERE r.origin = 'IST' AND r.dest = 'ESB' AND f.actual_dep IS NOT NULL), s AS (SELECT sched_dep, gecikme, DENSE_RANK() OVER (ORDER BY gecikme DESC) AS sira FROM g) SELECT sched_dep, gecikme, sira FROM s WHERE sira <= 3 ORDER BY sira, sched_dep;`, { ord: true });
add('k203', 'ileri', 3, 'Kümülatif yolcu', 'Aralık 2024\'te her gün taşınan yolcu ve ay başından itibaren kümülatif toplam: <code>gun</code>, <code>yolcu</code>, <code>kumulatif</code>. Güne göre sırala.', "WITH d AS (SELECT date(sched_dep) AS gun, SUM(pax) AS yolcu FROM hv_flights WHERE sched_dep >= '2024-12-01' AND sched_dep < '2025-01-01' GROUP BY date(sched_dep)) SELECT gun, yolcu, SUM(yolcu) OVER (ORDER BY gun ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS kumulatif FROM d ORDER BY gun;", { ord: true });
add('k204', 'ileri', 3, 'Rötar zinciri', 'Aynı uçağın bir önceki uçuşu 30 dakikadan fazla gecikmişken bir sonraki uçuşu da 30 dakikadan fazla geciken uçuş sayısı: <code>zincir</code>.', `WITH g AS (SELECT f.tail_no, f.sched_dep, ${DLY} AS gecikme FROM hv_flights f WHERE f.actual_dep IS NOT NULL), l AS (SELECT gecikme, LAG(gecikme) OVER (PARTITION BY tail_no ORDER BY sched_dep) AS onceki FROM g) SELECT COUNT(*) AS zincir FROM l WHERE gecikme > 30 AND onceki > 30;`);
add('k205', 'ileri', 3, 'Üyenin uçuş sıklığı', 'En az 5 gerçekleşen uçuşu olan üyeler için iki uçuş arası ortalama gün (1 basamak); en sık uçan 5 üye: <code>passenger_id</code>, <code>ucus</code>, <code>ort_ara</code>. Ortalama araya göre artan, eşitlikte üye numarasına göre sırala.', "WITH u AS (SELECT b.passenger_id, date(f.sched_dep) AS gun FROM hv_bookings b JOIN hv_flights f ON f.flight_id = b.flight_id WHERE b.status = 'flown'), a AS (SELECT passenger_id, julianday(gun) - julianday(LAG(gun) OVER (PARTITION BY passenger_id ORDER BY gun)) AS ara FROM u) SELECT passenger_id, COUNT(*) AS ucus, ROUND(AVG(ara), 1) AS ort_ara FROM a GROUP BY passenger_id HAVING COUNT(*) >= 5 ORDER BY ort_ara, passenger_id LIMIT 5;", { ord: true });
add('k206', 'ileri', 3, 'Kategori pivotu', 'Her üyelik seviyesi için ücret sınıflarına göre gerçekleşen rezervasyon sayılarını yan yana getir: <code>tier</code>, <code>eko</code>, <code>ekoflex</code>, <code>business</code>.', "SELECT p.tier, SUM(CASE WHEN b.fare_class = 'Eko' THEN 1 ELSE 0 END) AS eko, SUM(CASE WHEN b.fare_class = 'EkoFlex' THEN 1 ELSE 0 END) AS ekoflex, SUM(CASE WHEN b.fare_class = 'Business' THEN 1 ELSE 0 END) AS business FROM hv_bookings b JOIN hv_passengers p ON p.passenger_id = b.passenger_id WHERE b.status = 'flown' GROUP BY p.tier;");
add('k207', 'ileri', 3, 'Yolcu-km doluluğu', 'Aylık kilometre ağırlıklı doluluk (RPK ÷ ASK, yüzde, 1 basamak; iptaller hariç): <code>ay</code>, <code>km_doluluk</code>. Aya göre sırala.', "SELECT strftime('%Y-%m', f.sched_dep) AS ay, ROUND(100.0 * SUM(f.pax * r.distance_km) / SUM(a.seats * r.distance_km), 1) AS km_doluluk FROM hv_flights f JOIN hv_routes r ON r.route_id = f.route_id JOIN hv_aircraft a ON a.tail_no = f.tail_no WHERE f.status <> 'cancelled' GROUP BY strftime('%Y-%m', f.sched_dep) ORDER BY ay;", { ord: true });
add('k208', 'ileri', 3, 'Rota sıralaması aylara göre', 'Her ay için yolcu sayısına göre en kalabalık rotayı bul: <code>ay</code>, <code>origin</code>, <code>dest</code>, <code>yolcu</code>. Aya göre sırala.', "WITH m AS (SELECT strftime('%Y-%m', f.sched_dep) AS ay, r.origin, r.dest, SUM(f.pax) AS yolcu FROM hv_flights f JOIN hv_routes r ON r.route_id = f.route_id GROUP BY strftime('%Y-%m', f.sched_dep), r.origin, r.dest), s AS (SELECT ay, origin, dest, yolcu, ROW_NUMBER() OVER (PARTITION BY ay ORDER BY yolcu DESC, origin, dest) AS rn FROM m) SELECT ay, origin, dest, yolcu FROM s WHERE rn = 1 ORDER BY ay;", { ord: true });
add('k209', 'ileri', 3, 'Aktarma sayısı', '2024-12-20 günü yurt içinden IST\'e inen uçuşlarla aynı gün IST\'den yurt dışına kalkan uçuşlar arasında 90–240 dakika beklemeli kaç bağlantı var? <code>baglanti</code>.', "SELECT COUNT(*) AS baglanti FROM hv_flights f1 JOIN hv_routes r1 ON r1.route_id = f1.route_id JOIN hv_airports k ON k.airport_code = r1.origin JOIN hv_routes r2 ON r2.origin = r1.dest JOIN hv_airports v ON v.airport_code = r2.dest JOIN hv_flights f2 ON f2.route_id = r2.route_id WHERE r1.dest = 'IST' AND k.country = 'Türkiye' AND v.country <> 'Türkiye' AND f1.sched_dep >= '2024-12-20' AND f1.sched_dep < '2024-12-21' AND f2.sched_dep >= datetime(f1.sched_arr, '+90 minutes') AND f2.sched_dep <= datetime(f1.sched_arr, '+240 minutes');");
add('k210', 'ileri', 3, 'Sadakat seviyesi önerisi', 'Gerçekleşen uçuş sayısına göre önerilen seviyeyi hesapla (0–4 Classic, 5–9 Silver, 10–19 Gold, 20+ Elite) ve mevcut seviyesinden <b>farklı</b> olan üye sayısını getir: <code>farkli</code>.', "WITH u AS (SELECT p.passenger_id, p.tier, COUNT(b.booking_id) AS n FROM hv_passengers p LEFT JOIN hv_bookings b ON b.passenger_id = p.passenger_id AND b.status = 'flown' GROUP BY p.passenger_id, p.tier) SELECT COUNT(*) AS farkli FROM u WHERE tier <> CASE WHEN n >= 20 THEN 'Elite' WHEN n >= 10 THEN 'Gold' WHEN n >= 5 THEN 'Silver' ELSE 'Classic' END;");
add('k211', 'ileri', 2, 'Veri kalitesi: zaman tutarlılığı', 'Gerçek varışı gerçek kalkıştan önce görünen ya da planlanan varışı planlanan kalkıştan önce olan hatalı uçuş sayısı (test geçerse 0): <code>hata</code>.', 'SELECT COUNT(*) AS hata FROM hv_flights WHERE actual_arr < actual_dep OR sched_arr <= sched_dep;');
add('k212', 'ileri', 3, 'Koltuk çakışması testi', 'Aynı uçuşta aynı koltuğa atanmış birden fazla gerçekleşen rezervasyon var mı? Çakışan uçuş-koltuk çiftlerinin sayısı: <code>cakisma</code>.', "SELECT COUNT(*) AS cakisma FROM (SELECT flight_id, seat FROM hv_bookings WHERE status = 'flown' AND seat IS NOT NULL GROUP BY flight_id, seat HAVING COUNT(*) > 1) t;");
add('k213', 'ileri', 3, 'Erken rezervasyon indirimi', 'Eko sınıfında 30+ gün önce yapılan rezervasyonların ortalama ücretinin, 0–6 gün önce yapılanlara oranı (yüzde, 1 basamak): <code>oran</code>.', "WITH g AS (SELECT b.price, julianday(date(f.sched_dep)) - julianday(date(b.booked_at)) AS gun FROM hv_bookings b JOIN hv_flights f ON f.flight_id = b.flight_id WHERE b.fare_class = 'Eko') SELECT ROUND(100.0 * AVG(CASE WHEN gun >= 30 THEN price END) / AVG(CASE WHEN gun < 7 THEN price END), 1) AS oran FROM g;", { hint: 'AVG(CASE WHEN ... THEN price END) koşulu tutmayan satırlarda NULL üretir ve AVG onları atlar.' });
add('k214', 'ileri', 3, 'Rotada mevsim etkisi', 'Her rota için Eylül ve Aralık ortalama kalkış gecikmelerini yan yana getir ve farkı en büyük 3 rotayı listele (iptaller hariç, 1 basamak): <code>origin</code>, <code>dest</code>, <code>eylul</code>, <code>aralik</code>, <code>fark</code>.', `WITH g AS (SELECT r.origin, r.dest, strftime('%m', f.sched_dep) AS ay, ${DLY} AS gecikme FROM hv_flights f JOIN hv_routes r ON r.route_id = f.route_id WHERE f.actual_dep IS NOT NULL), p AS (SELECT origin, dest, AVG(CASE WHEN ay = '09' THEN gecikme END) AS eylul, AVG(CASE WHEN ay = '12' THEN gecikme END) AS aralik FROM g GROUP BY origin, dest) SELECT origin, dest, ROUND(eylul, 1) AS eylul, ROUND(aralik, 1) AS aralik, ROUND(aralik - eylul, 1) AS fark FROM p ORDER BY aralik - eylul DESC, origin, dest LIMIT 3;`, { ord: true });
})();
