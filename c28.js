/* Kesit SQL içerik 28: Büyük Veriyle Çalışmak (Pedal İzmir) modülü ve iki yeni alıştırma bankası (İK, Bisiklet) */
(function () {
const L = window.SQLP_LESSONS;
const sq = (q, sol, o) => Object.assign({ t: 'sql', q: '<p>' + q + '</p>', sol }, o || {});
const mc = (q, o, a, why) => ({ t: 'mc', q, o, a, why });
const O = { ord: true };
const MOD = 'Büyük Veriyle Çalışmak';
const DUR = "ROUND((julianday(t.ended_at) - julianday(t.started_at)) * 86400)";
const HOUR = "strftime('%Y-%m-%d %H:00:00', t.started_at)";

const lessons = [
{
  id: 'bv-giris', lv: 'B1', mod: MOD, min: 15,
  title: 'Büyük tabloyla tanışma: profil çıkarmak ve örneklemek',
  sum: 'Yüz binlerce satırlık bir tabloyu körlemesine sorgulamadan önce satır sayısı, tarih aralığı, boş değerler ve dağılımlarla tanımak; tekrarlanabilir örnekleme.',
  body: `
<h2>Pedal İzmir</h2>
<p>Bu modülde İzmir'de hayali bir bisiklet paylaşım sisteminin üç aylık verisiyle çalışacaksın. Yolculuk tablosu (<code>bk_trips</code>) yaklaşık <b>116.000 satır</b>dır: şimdiye kadarki tabloların çok üstünde. Büyük tabloda iki şey değişir: <b>her sorgunun bir maliyeti vardır</b> ve <b>sonuca bakarak hatayı görmek zorlaşır</b>, çünkü satırları tek tek okuyamazsın.</p>
<h2>Önce profil</h2>
<p>Sorgulamaya başlamadan önce tabloyu tek bir sorguyla “fotoğrafla”: kaç satır, hangi aralık, ne kadar boşluk?</p>
<pre class="code">SELECT COUNT(*)                          AS satir,
       MIN(started_at)                   AS ilk,
       MAX(started_at)                   AS son,
       COUNT(*) - COUNT(ended_at)        AS kapanmamis,
       COUNT(DISTINCT user_id)           AS kullanici,
       COUNT(DISTINCT bike_id)           AS bisiklet,
       ROUND(AVG(distance_km), 2)        AS ort_km
FROM bk_trips;</pre>
<h2>Önce küçükte dene</h2>
<p>Karmaşık bir sorguyu yazarken tüm tabloda değil, küçük ve <b>tekrarlanabilir</b> bir örneklemde dene. <code>ORDER BY RANDOM()</code> her çalıştırmada farklı satır verir ve tüm tabloyu sıralar; bunun yerine anahtar üzerinden deterministik örnek al:</p>
<pre class="code">SELECT * FROM bk_trips WHERE trip_id % 100 = 0;   -- yaklaşık %1, her seferinde aynı satırlar</pre>
<p>Ya da bir zaman dilimiyle sınırla: <code>WHERE started_at &gt;= '2024-06-01' AND started_at &lt; '2024-06-08'</code>. Sorgu doğru çalışınca filtreyi kaldır.</p>
<div class="tip"><b>Alışkanlık</b>Büyük tabloda <code>SELECT *</code> yerine ihtiyacın olan sütunları seç ve sonuç ekranına yüz binlerce satır getirme; önce özetle.</div>
`,
  ex: [
    sq('Yolculuk tablosunun profili: <code>satir</code>, <code>ilk</code>, <code>son</code>, <code>kapanmamis</code>, <code>kullanici</code>.', 'SELECT COUNT(*) AS satir, MIN(started_at) AS ilk, MAX(started_at) AS son, COUNT(*) - COUNT(ended_at) AS kapanmamis, COUNT(DISTINCT user_id) AS kullanici FROM bk_trips;'),
    sq('Deterministik %1 örneklem (trip_id 100\'ün katı) kaç satırdır ve bu örneklemde ortalama mesafe nedir (2 basamak)? <code>orneklem</code>, <code>ort_km</code>.', 'SELECT COUNT(*) AS orneklem, ROUND(AVG(distance_km), 2) AS ort_km FROM bk_trips WHERE trip_id % 100 = 0;'),
    sq('Örneklem ile tüm tablonun ortalama mesafesini yan yana getir (2 basamak): <code>orneklem</code>, <code>tum</code>.', 'SELECT ROUND((SELECT AVG(distance_km) FROM bk_trips WHERE trip_id % 100 = 0), 2) AS orneklem, ROUND(AVG(distance_km), 2) AS tum FROM bk_trips;'),
    sq('Kullanıcı türüne göre yolculuk sayısı ve payı (yüzde, 1 basamak): <code>user_type</code>, <code>yolculuk</code>, <code>pay</code>.', 'SELECT u.user_type, COUNT(*) AS yolculuk, ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pay FROM bk_trips t JOIN bk_users u ON u.user_id = t.user_id GROUP BY u.user_type;'),
    sq('Aylık yolculuk sayısı: <code>ay</code>, <code>yolculuk</code>. Aya göre.', "SELECT strftime('%Y-%m', started_at) AS ay, COUNT(*) AS yolculuk FROM bk_trips GROUP BY strftime('%Y-%m', started_at) ORDER BY ay;", O),
    mc('<p>116.000 satırlık bir tabloda sorgunu denerken hangisi en iyi alışkanlıktır?</p>', ['Her denemede tüm satırları ekrana getirip sonuçları gözle tek tek kontrol etmek', 'Önce sabit, küçük bir örneklemde denemek, sonra filtreyi kaldırmak', '<code>ORDER BY RANDOM() LIMIT 100</code> ile her çalıştırmada başka rastgele satırlara bakarak ilerlemek', 'Sorguyu denemeden doğrudan raporlamak'], 1, 'Küçük ve tekrarlanabilir bir alt kümede çalışmak hem hızlıdır hem de hata ayıklarken aynı satırları görmeni sağlar.')
  ]
},
{
  id: 'bv-plan', lv: 'C1', mod: MOD, min: 22,
  title: 'Sorgu planı ve indeks: büyük tabloda hız farkı',
  sum: 'EXPLAIN QUERY PLAN ile tam tarama ve indeks aramasını ayırt etmek, indeks oluşturup süre farkını ölçmek, sütuna fonksiyon uygulamanın indeksi nasıl devre dışı bıraktığını görmek.',
  body: `
<h2>Plan neyi söyler?</h2>
<p>Veritabanı bir sorguyu çalıştırmadan önce bir <b>plan</b> yapar: tabloyu baştan sona mı tarayacak (SCAN), yoksa bir indeksle doğrudan ilgili satırlara mı gidecek (SEARCH)? SQLite'ta planı <code>EXPLAIN QUERY PLAN</code> gösterir. Diğer SQL türlerinde karşılığı <code>EXPLAIN</code> (PostgreSQL, MySQL), tahmini yürütme planı (SQL Server) ve <code>EXPLAIN PLAN FOR</code> (Oracle) ifadeleridir.</p>
<pre class="code" data-na="tsql pg mysql oracle bq">EXPLAIN QUERY PLAN
SELECT COUNT(*) FROM bk_trips WHERE start_station = 5;</pre>
<p><code>bk_trips</code> tablosunda yalnızca <code>started_at</code> ve <code>user_id</code> üzerinde indeks var; istasyon sütunlarında yok. Bu yüzden <code>start_station</code> filtresi <b>SCAN bk_trips</b> (tam tarama) üretir. Sonuç kutusunun altındaki süreye dikkat et.</p>
<h2>İndeks oluştur, tekrar ölç</h2>
<pre class="code" data-na="tsql pg mysql oracle bq">CREATE INDEX ix_trips_start ON bk_trips (start_station);
EXPLAIN QUERY PLAN
SELECT COUNT(*) FROM bk_trips WHERE start_station = 5;</pre>
<p>Plan artık <b>SEARCH bk_trips USING COVERING INDEX ix_trips_start</b> der: motor yalnızca indeksi okur. Ders kutuları her çalıştırmada temiz bir veritabanıyla başlar; indeks yalnızca o çalıştırma boyunca vardır.</p>
<h2>İndeksi bozan yazımlar</h2>
<table><tr><th>Yavaş (indeks kullanılamaz)</th><th>Hızlı (indeks kullanılır)</th></tr>
<tr><td><code>WHERE date(started_at) = '2024-07-01'</code></td><td><code>WHERE started_at &gt;= '2024-07-01' AND started_at &lt; '2024-07-02'</code></td></tr>
<tr><td><code>WHERE strftime('%m', started_at) = '07'</code></td><td><code>WHERE started_at &gt;= '2024-07-01' AND started_at &lt; '2024-08-01'</code></td></tr>
<tr><td><code>WHERE start_station + 0 = 5</code></td><td><code>WHERE start_station = 5</code></td></tr></table>
<p>Sütuna fonksiyon uygulamak, motorun indeksteki sıralı değerleri kullanmasını engeller (sargable olmayan koşul).</p>
${''}<pre class="code" data-na="tsql pg mysql oracle bq">EXPLAIN QUERY PLAN SELECT COUNT(*) FROM bk_trips WHERE date(started_at) = '2024-07-01';
EXPLAIN QUERY PLAN SELECT COUNT(*) FROM bk_trips WHERE started_at &gt;= '2024-07-01' AND started_at &lt; '2024-07-02';</pre>
<h2>Birleştirmede indeks</h2>
<p>Büyük bir tabloyu küçük bir tabloyla birleştirirken eşleşme koşulu küçük tablonun <b>anahtarı</b> üzerindeyse her satır için hızlı bir arama yapılır. Saatlik hava durumunu yolculuklarla birleştirmenin hızlı yolu, yolculuk tarafında saati hesaplayıp hava tablosunun birincil anahtarında aramaktır:</p>
<pre class="code">SELECT CASE WHEN w.rain_mm &gt; 0 THEN 'yağmurlu' ELSE 'kuru' END AS hava, COUNT(*) AS yolculuk
FROM bk_trips t
JOIN bk_weather w ON w.obs_hour = strftime('%Y-%m-%d %H:00:00', t.started_at)
GROUP BY CASE WHEN w.rain_mm &gt; 0 THEN 'yağmurlu' ELSE 'kuru' END;</pre>
<p>Tersini yapmak, yani hava tablosundan başlayıp her saat için tüm yolculukları taramak, aynı sonucu çok daha uzun sürede verir.</p>
<div class="note"><b>İndeksin bedeli</b>İndeks okumayı hızlandırır ama her INSERT ve UPDATE'te güncellenmesi gerekir ve yer kaplar. Sık filtrelenen ve birleştirilen sütunlara indeks koy; her sütuna değil.</div>
`,
  ex: [
    sq('<code>EXPLAIN QUERY PLAN</code> ile 12 numaralı istasyondan başlayan yolculukları sayan sorgunun planını getir (SQLite).', 'EXPLAIN QUERY PLAN SELECT COUNT(*) FROM bk_trips WHERE start_station = 12;', { base: 'sqlite', dl: ['sqlite'] }),
    sq('Önce <code>start_station</code> üzerinde <code>ix_trips_start</code> adıyla indeks oluştur, sonra aynı sorgunun planını getir; plan SEARCH ve indeks adını göstermeli.', 'CREATE INDEX ix_trips_start ON bk_trips (start_station); EXPLAIN QUERY PLAN SELECT COUNT(*) FROM bk_trips WHERE start_station = 12;', { base: 'sqlite', dl: ['sqlite'] }),
    sq('İndeksi kullanabilen (sargable) biçimde yaz: 15 Temmuz 2024\'te başlayan yolculuk sayısı (<code>date()</code> kullanmadan): <code>yolculuk</code>.', "SELECT COUNT(*) AS yolculuk FROM bk_trips WHERE started_at >= '2024-07-15' AND started_at < '2024-07-16';"),
    sq('Saatlik hava ile birleştir (hava tablosunun anahtarında arama): yağmurlu ve kuru saatlerde başlayan yolculuk sayısı: <code>yagmur</code> (1/0), <code>yolculuk</code>.', `SELECT CASE WHEN w.rain_mm > 0 THEN 1 ELSE 0 END AS yagmur, COUNT(*) AS yolculuk FROM bk_trips t JOIN bk_weather w ON w.obs_hour = ${HOUR} GROUP BY CASE WHEN w.rain_mm > 0 THEN 1 ELSE 0 END;`),
    sq('Bileşik indeks: <code>(start_station, started_at)</code> üzerinde <code>ix_st_time</code> oluştur ve 5 numaralı istasyondan Temmuz 2024\'te başlayan yolculukları say: <code>yolculuk</code>.', "CREATE INDEX ix_st_time ON bk_trips (start_station, started_at); SELECT COUNT(*) AS yolculuk FROM bk_trips WHERE start_station = 5 AND started_at >= '2024-07-01' AND started_at < '2024-08-01';", { base: 'sqlite', dl: ['sqlite'] }),
    mc('<p><code>WHERE strftime(\'%m\', started_at) = \'07\'</code> neden <code>started_at</code> indeksini kullanamaz?</p>', ['strftime her veritabanında yavaş çalışan, indeksle birlikte kullanılması yasak bir fonksiyon olduğu için', 'İndeks sütunun ham değerlerini sıralı tutar; fonksiyonun çıktısı için sıralı bir yapı yoktur', 'Ay numarası metin olarak döndüğü için karşılaştırma sayı indeksiyle eşleşemez', 'İndeks yalnızca eşitlik koşullarında çalışır, aralık ve fonksiyonlarda hiç kullanılmaz'], 1, 'Sütuna fonksiyon uygulanan koşullar “sargable” değildir. Aynı soruyu aralık koşuluyla yazmak indeksin sıralı yapısından yararlanır. Bazı SQL türleri ifade (fonksiyon tabanlı) indeksleri de destekler.')
  ]
},
{
  id: 'bv-zaman', lv: 'B2', mod: MOD, min: 18,
  title: 'Zaman desenleri ve hava durumu: ne zaman, neden binilir?',
  sum: 'Saat ve gün desenleri, hafta içi ile hafta sonu farkı, saatlik hava durumuyla birleştirip yağmur ve sıcaklık etkisini ölçmek; saat başına normalize etmek.',
  body: `
<h2>İki farklı kullanıcı, iki farklı desen</h2>
<p>Hafta içi yolculuklar sabah 8 ve akşam 18 civarında iki zirve yapar: işe gidiş ve dönüş. Hafta sonu ise öğleden sonraya yayılan tek bir tepe vardır. Bu deseni görmek için saat × gün türü çapraz tablosu yeterlidir.</p>
<h2>Normalizasyon: sayı değil oran</h2>
<p>“Yağmurlu saatlerde kaç yolculuk oldu?” sorusunun cevabı yanıltıcıdır, çünkü yağmurlu saat sayısı kuru saatlerden çok azdır. Doğru karşılaştırma <b>saat başına ortalama yolculuktur</b>: önce saat başına yolculuk sayısını bul, sonra hava koşuluna göre ortalamasını al.</p>
<pre class="code">WITH s AS (     -- saat başına yolculuk (yalnızca yolculuk olan saatler)
  SELECT strftime('%Y-%m-%d %H:00:00', started_at) AS saat, COUNT(*) AS n
  FROM bk_trips GROUP BY strftime('%Y-%m-%d %H:00:00', started_at)
),
h AS (          -- payda: her koşulda kaç saat var (hava tablosundan)
  SELECT CASE WHEN w.rain_mm &gt; 0 THEN 'yağmurlu' ELSE 'kuru' END AS hava, COUNT(*) AS saat_sayisi
  FROM bk_weather w
  WHERE CAST(strftime('%H', w.obs_hour) AS INTEGER) BETWEEN 10 AND 19
  GROUP BY CASE WHEN w.rain_mm &gt; 0 THEN 'yağmurlu' ELSE 'kuru' END
),
y AS (          -- pay: bu saatlerde başlayan yolculuklar
  SELECT CASE WHEN w.rain_mm &gt; 0 THEN 'yağmurlu' ELSE 'kuru' END AS hava, SUM(s.n) AS yolculuk
  FROM s JOIN bk_weather w ON w.obs_hour = s.saat
  WHERE CAST(strftime('%H', w.obs_hour) AS INTEGER) BETWEEN 10 AND 19
  GROUP BY CASE WHEN w.rain_mm &gt; 0 THEN 'yağmurlu' ELSE 'kuru' END
)
SELECT h.hava, h.saat_sayisi, ROUND(1.0 * COALESCE(y.yolculuk, 0) / h.saat_sayisi, 1) AS saat_basina
FROM h LEFT JOIN y ON y.hava = h.hava;</pre>
<p>Pay ve paydayı ayrı hesaplamanın bir nedeni daha var: bazı yağmurlu saatlerde <b>hiç</b> yolculuk yoktur. Saatleri yolculuk tablosundan türetirsen bu sıfırlı saatler kaybolur ve yağmurlu saatin ortalaması olduğundan yüksek çıkar. Payda her zaman olası tüm saatleri içeren hava tablosundan gelmelidir. Hava tablosundan başlayıp her saat için saatlik özeti LEFT JOIN ile aramak da doğru sonucu verir, ancak büyük tabloda çok daha yavaştır.</p>
<p>Yalnızca 10:00–19:00 arasına bakmak adil bir karşılaştırma sağlar, çünkü yağmurlar bu saatlerde yağmış; gece saatleri zaten sakindir. Bu tür <b>karıştırıcı değişkenleri</b> kontrol etmek analizin kalitesini belirler.</p>
`,
  ex: [
    sq('Hafta içi ve hafta sonu için saat başına (0–23) yolculuk sayısı yan yana (SQLite <code>%w</code>: 0 pazar, 6 cumartesi): <code>saat</code>, <code>hafta_ici</code>, <code>hafta_sonu</code>. Saate göre.', "SELECT CAST(strftime('%H', started_at) AS INTEGER) AS saat, SUM(CASE WHEN strftime('%w', started_at) NOT IN ('0', '6') THEN 1 ELSE 0 END) AS hafta_ici, SUM(CASE WHEN strftime('%w', started_at) IN ('0', '6') THEN 1 ELSE 0 END) AS hafta_sonu FROM bk_trips GROUP BY CAST(strftime('%H', started_at) AS INTEGER) ORDER BY saat;", { ord: true, dl: ['sqlite'] }),
    sq('Haftanın gününe göre <b>gün başına</b> ortalama yolculuk (1 basamak; SQLite %w): <code>gun</code>, <code>ort</code>. Güne göre.', "WITH g AS (SELECT date(started_at) AS d, COUNT(*) AS n FROM bk_trips GROUP BY date(started_at)) SELECT CAST(strftime('%w', d) AS INTEGER) AS gun, ROUND(AVG(n), 1) AS ort FROM g GROUP BY CAST(strftime('%w', d) AS INTEGER) ORDER BY gun;", { ord: true, dl: ['sqlite'] }),
    sq('Yağmur etkisi (normalize): 10:00–19:00 arasındaki saatlerde yağmurlu ve kuru saatlerde saat başına ortalama yolculuk (1 basamak). Paydayı hava tablosundan, payı yolculuklardan ayrı hesapla: <code>hava</code>, <code>saat_sayisi</code>, <code>saat_basina</code>.', "WITH s AS (SELECT strftime('%Y-%m-%d %H:00:00', started_at) AS saat, COUNT(*) AS n FROM bk_trips GROUP BY strftime('%Y-%m-%d %H:00:00', started_at)), h AS (SELECT CASE WHEN w.rain_mm > 0 THEN 'yağmurlu' ELSE 'kuru' END AS hava, COUNT(*) AS saat_sayisi FROM bk_weather w WHERE CAST(strftime('%H', w.obs_hour) AS INTEGER) BETWEEN 10 AND 19 GROUP BY CASE WHEN w.rain_mm > 0 THEN 'yağmurlu' ELSE 'kuru' END), y AS (SELECT CASE WHEN w.rain_mm > 0 THEN 'yağmurlu' ELSE 'kuru' END AS hava, SUM(s.n) AS yolculuk FROM s JOIN bk_weather w ON w.obs_hour = s.saat WHERE CAST(strftime('%H', w.obs_hour) AS INTEGER) BETWEEN 10 AND 19 GROUP BY CASE WHEN w.rain_mm > 0 THEN 'yağmurlu' ELSE 'kuru' END) SELECT h.hava, h.saat_sayisi, ROUND(1.0 * COALESCE(y.yolculuk, 0) / h.saat_sayisi, 1) AS saat_basina FROM h LEFT JOIN y ON y.hava = h.hava;", { dl: ['sqlite'] }),
    sq('Sıcaklık bandına göre (öğleden sonra 12:00–16:59, kuru saatler) saat başına ortalama yolculuk: 30 altı, 30–33, 33 üstü (1 basamak): <code>bant</code>, <code>saat_basina</code>.', "WITH s AS (SELECT strftime('%Y-%m-%d %H:00:00', started_at) AS saat, COUNT(*) AS n FROM bk_trips GROUP BY strftime('%Y-%m-%d %H:00:00', started_at)), h AS (SELECT CASE WHEN w.temp_c < 30 THEN '30 altı' WHEN w.temp_c <= 33 THEN '30-33' ELSE '33 üstü' END AS bant, COUNT(*) AS saat_sayisi FROM bk_weather w WHERE CAST(strftime('%H', w.obs_hour) AS INTEGER) BETWEEN 12 AND 16 AND w.rain_mm = 0 GROUP BY CASE WHEN w.temp_c < 30 THEN '30 altı' WHEN w.temp_c <= 33 THEN '30-33' ELSE '33 üstü' END), y AS (SELECT CASE WHEN w.temp_c < 30 THEN '30 altı' WHEN w.temp_c <= 33 THEN '30-33' ELSE '33 üstü' END AS bant, SUM(s.n) AS yolculuk FROM s JOIN bk_weather w ON w.obs_hour = s.saat WHERE CAST(strftime('%H', w.obs_hour) AS INTEGER) BETWEEN 12 AND 16 AND w.rain_mm = 0 GROUP BY CASE WHEN w.temp_c < 30 THEN '30 altı' WHEN w.temp_c <= 33 THEN '30-33' ELSE '33 üstü' END) SELECT h.bant, ROUND(1.0 * COALESCE(y.yolculuk, 0) / h.saat_sayisi, 1) AS saat_basina FROM h LEFT JOIN y ON y.bant = h.bant;", { dl: ['sqlite'] }),
    sq('En yoğun 5 saat (tarih + saat; eşitlikte saate göre): <code>saat</code>, <code>yolculuk</code>.', "SELECT strftime('%Y-%m-%d %H:00:00', started_at) AS saat, COUNT(*) AS yolculuk FROM bk_trips GROUP BY strftime('%Y-%m-%d %H:00:00', started_at) ORDER BY yolculuk DESC, saat LIMIT 5;", { ord: true, dl: ['sqlite'] })
  ]
},
{
  id: 'bv-istasyon', lv: 'B2', mod: MOD, min: 18,
  title: 'İstasyon dengesi ve güzergâhlar: sistemi işletmek',
  sum: 'İstasyon bazında giren–çıkan farkıyla yeniden dağıtım ihtiyacı, en yoğun güzergâhlar, doluluk baskısı ve veri kalitesi kontrolleri (kapanmamış yolculuk, aynı anda iki yolculukta görünen bisiklet).',
  body: `
<h2>Net akış</h2>
<p>Bir istasyondan çıkan bisiklet sayısı gelen sayısından fazlaysa istasyon boşalır; tersi doluysa yer kalmaz. İşletme ekibi her gece kamyonetle bisikletleri yeniden dağıtır. Hangi istasyonların kronik olarak boşaldığını <b>net akış = gelen − giden</b> ile bulursun. Bunu iki ayrı toplamın birleşimiyle yazmak, büyük tabloyu OR koşuluyla birleştirmekten çok daha hızlıdır:</p>
<pre class="code">WITH cikis AS (SELECT start_station AS st, COUNT(*) AS n FROM bk_trips GROUP BY start_station),
     giris AS (SELECT end_station AS st, COUNT(*) AS n FROM bk_trips WHERE end_station IS NOT NULL GROUP BY end_station)
SELECT s.name, COALESCE(g.n, 0) - COALESCE(c.n, 0) AS net
FROM bk_stations s
LEFT JOIN cikis c ON c.st = s.station_id
LEFT JOIN giris g ON g.st = s.station_id
ORDER BY net
LIMIT 5;</pre>
<h2>Veri kalitesi</h2>
<p>Büyük sistemlerde veri hatası kaçınılmazdır. İki kontrol:</p>
<ul><li><b>Kapanmamış yolculuk:</b> <code>ended_at</code> boş; kilit sinyali gelmemiş ya da bisiklet kaybolmuş olabilir.</li>
<li><b>Aynı bisiklet aynı anda iki yolculukta:</b> aralıkları çakışan iki yolculuk aynı <code>bike_id</code>’yi taşıyorsa ya kayıt hatası ya da bisiklet kimliği yanlış okunmuştur. Bu kontrol büyük tabloda kendine birleştirme gerektirir; önce dar bir tarih aralığında dene.</li></ul>
`,
  ex: [
    sq('Net akışı en negatif (en çok boşalan) 5 istasyon: <code>name</code>, <code>net</code>.', 'WITH cikis AS (SELECT start_station AS st, COUNT(*) AS n FROM bk_trips GROUP BY start_station), giris AS (SELECT end_station AS st, COUNT(*) AS n FROM bk_trips WHERE end_station IS NOT NULL GROUP BY end_station) SELECT s.name, COALESCE(g.n, 0) - COALESCE(c.n, 0) AS net FROM bk_stations s LEFT JOIN cikis c ON c.st = s.station_id LEFT JOIN giris g ON g.st = s.station_id ORDER BY net, s.name LIMIT 5;', O),
    sq('Sahil ve iç istasyonlarda ortalama net akış (1 basamak): <code>is_coastal</code>, <code>ort_net</code>.', 'WITH cikis AS (SELECT start_station AS st, COUNT(*) AS n FROM bk_trips GROUP BY start_station), giris AS (SELECT end_station AS st, COUNT(*) AS n FROM bk_trips WHERE end_station IS NOT NULL GROUP BY end_station) SELECT s.is_coastal, ROUND(AVG(COALESCE(g.n, 0) - COALESCE(c.n, 0)), 1) AS ort_net FROM bk_stations s LEFT JOIN cikis c ON c.st = s.station_id LEFT JOIN giris g ON g.st = s.station_id GROUP BY s.is_coastal;'),
    sq('En yoğun 5 güzergâh (başlangıç ≠ bitiş; yön önemli; eşitlikte istasyon numaraları): <code>start_station</code>, <code>end_station</code>, <code>yolculuk</code>.', 'SELECT start_station, end_station, COUNT(*) AS yolculuk FROM bk_trips WHERE end_station IS NOT NULL AND end_station <> start_station GROUP BY start_station, end_station ORDER BY yolculuk DESC, start_station, end_station LIMIT 5;', O),
    sq('Kapanmamış yolculukların istasyona göre dağılımı; en çok olan 3 başlangıç istasyonu (eşitlikte numara): <code>start_station</code>, <code>kapanmamis</code>.', 'SELECT start_station, COUNT(*) AS kapanmamis FROM bk_trips WHERE ended_at IS NULL GROUP BY start_station ORDER BY kapanmamis DESC, start_station LIMIT 3;', O),
    sq('Veri kalitesi: 1–3 Haziran 2024 arasında başlayan yolculuklarda aynı bisikletin aralıkları çakışan iki yolculuğu (çift bir kez): <code>cakisma</code>.', "WITH t AS (SELECT trip_id, bike_id, started_at, ended_at FROM bk_trips WHERE started_at >= '2024-06-01' AND started_at < '2024-06-04' AND ended_at IS NOT NULL) SELECT COUNT(*) AS cakisma FROM t a JOIN t b ON b.bike_id = a.bike_id AND a.trip_id < b.trip_id AND a.started_at < b.ended_at AND b.started_at < a.ended_at;"),
    sq('Bakım: açık (kapanmamış) bakım kaydı olan bisiklet sayısı ve bu bisikletlerin bakımı açıkken yaptığı yolculuk sayısı (veri tutarsızlığı): <code>bisiklet</code>, <code>yolculuk</code>.', 'SELECT COUNT(DISTINCT m.bike_id) AS bisiklet, (SELECT COUNT(*) FROM bk_trips t JOIN bk_maintenance m2 ON m2.bike_id = t.bike_id AND m2.closed_at IS NULL AND t.started_at > m2.opened_at) AS yolculuk FROM bk_maintenance m WHERE m.closed_at IS NULL;')
  ]
},
{
  id: 'bv-gelir', lv: 'B2', mod: MOD, min: 15,
  title: 'Ücret ve kullanıcı segmentleri: aboneler mi, tek seferlikler mi?',
  sum: 'Ücret modelinin gelire etkisi, abonelikte ücretsiz 30 dakikanın sonucu, kullanım sıklığına göre segmentler ve elektrikli bisikletin farkı.',
  body: `
<h2>Ücret modeli</h2>
<p>Aboneler ilk 30 dakikayı ücretsiz kullanır, sonrası dakikası 2 TL. Tek seferlik kullanıcılar açılış için 10 TL ve dakikası 1,5 TL öder. Bu yüzden abonelerin çoğu yolculuğu 0 TL'dir ve gelir tek seferlik kullanıcılardan gelir; ama aboneler sistemi düzenli kullanır.</p>
<h2>Sıklık segmentleri</h2>
<p>Kullanıcıları yolculuk sayısına göre NTILE ile dörde böl: en sık kullanan %25 çoğu zaman yolculukların yarısından fazlasını yapar. Bu, Pareto benzeri bir yoğunlaşmadır.</p>
`,
  ex: [
    sq('Kullanıcı türüne göre toplam gelir (tam sayı) ve 0 TL\'lik yolculukların oranı (yüzde, 1 basamak): <code>user_type</code>, <code>gelir</code>, <code>ucretsiz_oran</code>.', 'SELECT u.user_type, ROUND(SUM(t.fare)) AS gelir, ROUND(100.0 * SUM(CASE WHEN t.fare = 0 THEN 1 ELSE 0 END) / COUNT(t.fare), 1) AS ucretsiz_oran FROM bk_trips t JOIN bk_users u ON u.user_id = t.user_id GROUP BY u.user_type;'),
    sq('Elektrikli ve klasik bisikletlerde ortalama süre (dakika, 1 basamak) ve ortalama hız (km/saat, 1 basamak); başlangıç ≠ bitiş olan kapanmış yolculuklar: <code>model</code>, <code>ort_dk</code>, <code>hiz</code>.', `SELECT b.model, ROUND(AVG(${DUR}) / 60.0, 1) AS ort_dk, ROUND(AVG(t.distance_km / (${DUR} / 3600.0)), 1) AS hiz FROM bk_trips t JOIN bk_bikes b ON b.bike_id = t.bike_id WHERE t.ended_at IS NOT NULL AND t.end_station <> t.start_station GROUP BY b.model;`),
    sq('Sıklık segmentleri: yolculuk yapan kullanıcıları yolculuk sayısına göre 4 dilime ayır (NTILE, en sık 4); her dilimin kullanıcı sayısı ve yolculuk payı (yüzde, 1 basamak): <code>dilim</code>, <code>kullanici</code>, <code>pay</code>.', 'WITH k AS (SELECT user_id, COUNT(*) AS n FROM bk_trips GROUP BY user_id), d AS (SELECT n, NTILE(4) OVER (ORDER BY n, user_id) AS dilim FROM k) SELECT dilim, COUNT(*) AS kullanici, ROUND(100.0 * SUM(n) / (SELECT COUNT(*) FROM bk_trips), 1) AS pay FROM d GROUP BY dilim ORDER BY dilim;', O),
    sq('Abonelerin 30 dakika sınırı: abonelerin yolculuklarından 25–30 dakika ve 30–35 dakika sürenlerin sayısı (sınırın hemen altında yığılma var mı?): <code>aralik</code>, <code>yolculuk</code>.', `SELECT CASE WHEN ${DUR} < 1800 THEN '25-30' ELSE '30-35' END AS aralik, COUNT(*) AS yolculuk FROM bk_trips t JOIN bk_users u ON u.user_id = t.user_id WHERE u.user_type = 'abone' AND t.ended_at IS NOT NULL AND ${DUR} >= 1500 AND ${DUR} < 2100 GROUP BY CASE WHEN ${DUR} < 1800 THEN '25-30' ELSE '30-35' END;`)
  ]
}
];
const at = L.findIndex(l => l.id === 'performans-lab');
L.splice(at < 0 ? L.length : at + 1, 0, ...lessons);
const P = window.SQLP_PATHS;
P.push({ id: 'buyuk-veri', name: 'Büyük Veriyle Çalışmak', short: 'BV', color: '#0D9488',
  desc: '116.000 satırlık bisiklet paylaşım verisiyle profil çıkarma, sorgu planı ve indeks, zaman desenleri ve işletme analitiği.',
  long: 'Şimdiye kadarki tabloların çok üstünde bir tabloyla çalışırsın: Pedal İzmir\'in üç aylık yolculukları. Büyük tabloyu tanımayı, örneklemeyi, sorgu planını okumayı, indeksin etkisini ölçmeyi ve indeksi bozan yazımlardan kaçınmayı öğrenirsin. Ardından zaman ve hava durumu desenleri, istasyon dengesi, veri kalitesi ve ücret analizleriyle gerçek bir işletme sorusuna cevap verirsin.',
  skills: ['Veri profili', 'Tekrarlanabilir örnekleme', 'EXPLAIN QUERY PLAN', 'İndeks ve sargable koşul', 'Normalize karşılaştırma', 'Net akış', 'Veri kalitesi'],
  lessons: ['bv-giris', 'index', 'bv-plan', 'bv-zaman', 'bv-istasyon', 'bv-gelir', 'hata-ayiklama'].filter(id => L.some(l => l.id === id)),
  comp: [
    { t: 'Büyük tabloyu tanımak', d: 'Profil, örneklem, plan ve indeks', l: ['bv-giris', 'index', 'bv-plan'] },
    { t: 'Analiz', d: 'Zaman, istasyon ve gelir', l: ['bv-zaman', 'bv-istasyon', 'bv-gelir'] }
  ],
  beyond: ['Arena: Pedal İzmir meydan okumaları', 'Alıştırma: Bisiklet verisi konusu', 'Bölümleme ve sütun tabanlı depolama (Veri Mühendisliği öğrenme yolu)', 'Gerçek açık veri: belediyelerin bisiklet paylaşım verileri'] });

/* ---------- Alıştırma bankası: İK ve Bisiklet ---------- */
const PR = window.SQLP_PRACTICE; const T = window.SQLP_PRACTICE_TOPICS = window.SQLP_PRACTICE_TOPICS || {};
T.ika = 'İK verisi'; T.bvk = 'Bisiklet verisi (büyük tablo)';
const add = (t) => (id, Lv, d, title, q, sol, o) => PR.push(Object.assign({ id, L: Lv, t, d, title, q: '<p>' + q + '</p>', sol, type: 'sql' }, o || {}));
const ik = add('ika'), bk = add('bvk');
ik('h001', 'temel', 1, 'Bölüm listesi', 'İK bölümlerinin adı ve fonksiyon alanı; ada göre sırala.', 'SELECT name, function_area FROM ik_departments ORDER BY name;', O);
ik('h002', 'temel', 1, 'Aktif çalışan', 'Ayrılmamış çalışan sayısı: <code>aktif</code>.', 'SELECT COUNT(*) AS aktif FROM ik_employees WHERE term_date IS NULL;');
ik('h003', 'temel', 1, 'Eğitim düzeyi', 'Aktif çalışanların eğitim düzeyine göre sayısı, azalan: <code>education</code>, <code>kisi</code>.', 'SELECT education, COUNT(*) AS kisi FROM ik_employees WHERE term_date IS NULL GROUP BY education ORDER BY kisi DESC, education;', O);
ik('h004', 'temel', 2, 'Şehre göre kadro', 'Aktif çalışanların şehre göre sayısı; 50\'den fazla olanlar: <code>city</code>, <code>kisi</code>.', 'SELECT city, COUNT(*) AS kisi FROM ik_employees WHERE term_date IS NULL GROUP BY city HAVING COUNT(*) > 50 ORDER BY kisi DESC;', O);
ik('h005', 'temel', 2, '2024 işe girişler', '2024\'te işe girenlerin kaynağa göre sayısı: <code>hire_source</code>, <code>kisi</code>. Azalan.', "SELECT hire_source, COUNT(*) AS kisi FROM ik_employees WHERE hire_date >= '2024-01-01' AND hire_date < '2025-01-01' GROUP BY hire_source ORDER BY kisi DESC, hire_source;", O);
ik('h006', 'temel', 2, 'Eğitim saatleri', 'Eğitime göre toplam katılım ve toplam saat: <code>course</code>, <code>katilim</code>, <code>saat</code>. Saate göre azalan.', 'SELECT course, COUNT(*) AS katilim, SUM(hours) AS saat FROM ik_training GROUP BY course ORDER BY saat DESC, course;', O);
ik('h007', 'temel', 2, 'Yaş grupları', 'Aktif çalışanları 2024 itibarıyla yaş grubuna ayır (30 altı, 30–44, 45+): <code>grup</code>, <code>kisi</code>.', "SELECT CASE WHEN 2024 - birth_year < 30 THEN '30 altı' WHEN 2024 - birth_year < 45 THEN '30-44' ELSE '45+' END AS grup, COUNT(*) AS kisi FROM ik_employees WHERE term_date IS NULL GROUP BY CASE WHEN 2024 - birth_year < 30 THEN '30 altı' WHEN 2024 - birth_year < 45 THEN '30-44' ELSE '45+' END;");
ik('h101', 'orta', 2, 'Terfi sayısı', 'Yıllara göre terfi sayısı (görev geçmişinde change_type = terfi): <code>yil</code>, <code>terfi</code>.', "SELECT strftime('%Y', start_date) AS yil, COUNT(*) AS terfi FROM ik_job_history WHERE change_type = 'terfi' GROUP BY strftime('%Y', start_date) ORDER BY yil;", O);
ik('h102', 'orta', 2, 'Bölüm ortalama kıdem', 'Aktif çalışanların bölüme göre ortalama kıdemi (yıl, 1 basamak; 31.12.2024): <code>name</code>, <code>kidem</code>. Azalan.', "SELECT d.name, ROUND(AVG((julianday('2024-12-31') - julianday(e.hire_date)) / 365.25), 1) AS kidem FROM ik_employees e JOIN ik_positions p ON p.position_id = e.position_id JOIN ik_departments d ON d.dept_id = p.dept_id WHERE e.term_date IS NULL GROUP BY d.dept_id, d.name ORDER BY kidem DESC, d.name;", O);
ik('h103', 'orta', 2, 'Ortalama izin', '2024\'te çalışan başına ortalama yıllık izin günü (2 basamak; yıllık izin kullananlar): <code>ort</code>.', "SELECT ROUND(AVG(g), 2) AS ort FROM (SELECT emp_id, SUM(days) AS g FROM ik_leaves WHERE leave_type = 'yıllık' AND start_date >= '2024-01-01' GROUP BY emp_id) t;");
ik('h104', 'orta', 2, 'Yöneticisiz çalışan', 'Yöneticisi olmayan çalışanlar: <code>full_name</code>.', 'SELECT full_name FROM ik_employees WHERE manager_id IS NULL;');
ik('h105', 'orta', 3, 'Kaynağa göre performans', '2022–2023\'te işe girenlerin işe alım kaynağına göre 2024 ortalama performans puanı (2 basamak): <code>hire_source</code>, <code>puan</code>. Azalan.', "SELECT e.hire_source, ROUND(AVG(r.rating), 2) AS puan FROM ik_employees e JOIN ik_reviews r ON r.emp_id = e.emp_id AND r.review_year = 2024 WHERE e.hire_date >= '2022-01-01' AND e.hire_date < '2024-01-01' GROUP BY e.hire_source ORDER BY puan DESC, e.hire_source;", O);
ik('h106', 'orta', 2, 'Talep durumu', 'Kadro taleplerinin durumuna göre sayısı: <code>status</code>, <code>talep</code>.', 'SELECT status, COUNT(*) AS talep FROM ik_requisitions GROUP BY status;');
ik('h107', 'orta', 3, 'Son zam tarihi', 'Aktif çalışanlardan son maaş değişikliği 2024 öncesinde olanların sayısı (zam almamış görünenler): <code>kisi</code>.', "SELECT COUNT(*) AS kisi FROM ik_employees e WHERE e.term_date IS NULL AND (SELECT MAX(effective_date) FROM ik_salaries s WHERE s.emp_id = e.emp_id) < '2024-01-01';");
ik('h201', 'ileri', 3, 'Maaş artışı', 'Hem 31.12.2022 hem 31.12.2024\'te aktif olan çalışanların o tarihlerdeki maaşlarına göre ortalama iki yıllık artış (yüzde, 1 basamak): <code>artis</code>.', "WITH a AS (SELECT e.emp_id, (SELECT s.monthly_gross FROM ik_salaries s WHERE s.emp_id = e.emp_id AND s.effective_date <= '2022-12-31' ORDER BY s.effective_date DESC LIMIT 1) AS m22, (SELECT s.monthly_gross FROM ik_salaries s WHERE s.emp_id = e.emp_id AND s.effective_date <= '2024-12-31' ORDER BY s.effective_date DESC LIMIT 1) AS m24 FROM ik_employees e WHERE e.hire_date <= '2022-12-31' AND (e.term_date IS NULL OR e.term_date > '2024-12-31')) SELECT ROUND(AVG(100.0 * (m24 - m22) / m22), 1) AS artis FROM a;");
ik('h202', 'ileri', 3, 'Organizasyon derinliği', 'Özyinelemeli CTE ile aktif çalışanların genel müdüre (yöneticisi olmayan) uzaklığı; düzey başına kişi sayısı: <code>duzey</code>, <code>kisi</code>.', 'WITH RECURSIVE o(emp_id, duzey) AS (SELECT emp_id, 0 FROM ik_employees WHERE manager_id IS NULL AND term_date IS NULL UNION ALL SELECT e.emp_id, o.duzey + 1 FROM ik_employees e JOIN o ON e.manager_id = o.emp_id WHERE e.term_date IS NULL) SELECT duzey, COUNT(*) AS kisi FROM o GROUP BY duzey ORDER BY duzey;', O);
ik('h203', 'ileri', 3, 'Bölüm içi maaş sırası', 'Her bölümde güncel maaşı en yüksek 2 aktif çalışan (ROW_NUMBER; eşitlikte sicil); yalnızca Finans ve İnsan Kaynakları: <code>name</code>, <code>full_name</code>, <code>maas</code>.', "WITH c AS (SELECT s.emp_id, s.monthly_gross FROM ik_salaries s WHERE s.effective_date = (SELECT MAX(x.effective_date) FROM ik_salaries x WHERE x.emp_id = s.emp_id)), r AS (SELECT d.name, e.full_name, c.monthly_gross AS maas, ROW_NUMBER() OVER (PARTITION BY d.dept_id ORDER BY c.monthly_gross DESC, e.emp_id) AS rn FROM ik_employees e JOIN c ON c.emp_id = e.emp_id JOIN ik_positions p ON p.position_id = e.position_id JOIN ik_departments d ON d.dept_id = p.dept_id WHERE e.term_date IS NULL AND d.name IN ('Finans', 'İnsan Kaynakları')) SELECT name, full_name, maas FROM r WHERE rn <= 2 ORDER BY name, maas DESC;", O);
ik('h204', 'ileri', 3, 'Aylık devir serisi', '2024 için her ay ayrılan kişi sayısı ve o ayın sonundaki kadroya oranı (yüzde, 2 basamak): <code>ay</code>, <code>ayrilan</code>, <code>oran</code>.', "WITH RECURSIVE m(son) AS (SELECT '2024-01-31' UNION ALL SELECT date(son, '+1 day', '+1 month', '-1 day') FROM m WHERE son < '2024-12-31') SELECT strftime('%Y-%m', m.son) AS ay, (SELECT COUNT(*) FROM ik_employees e WHERE strftime('%Y-%m', e.term_date) = strftime('%Y-%m', m.son)) AS ayrilan, ROUND(100.0 * (SELECT COUNT(*) FROM ik_employees e WHERE strftime('%Y-%m', e.term_date) = strftime('%Y-%m', m.son)) / (SELECT COUNT(*) FROM ik_employees e WHERE e.hire_date <= m.son AND (e.term_date IS NULL OR e.term_date > m.son)), 2) AS oran FROM m ORDER BY ay;", { ord: true, dl: ['sqlite'] });
ik('h205', 'ileri', 3, 'Görev aralığı çakışması', 'Veri kalitesi: görev geçmişinde aynı kişinin aralıkları çakışan iki görev kaydının sayısı (end_date boşsa devam ediyor; çift bir kez): <code>cakisma</code>.', "SELECT COUNT(*) AS cakisma FROM ik_job_history a JOIN ik_job_history b ON b.emp_id = a.emp_id AND a.start_date < b.start_date AND b.start_date <= COALESCE(a.end_date, '9999-12-31');");
bk('g001', 'temel', 1, 'İstasyon kapasitesi', 'İlçeye göre istasyon sayısı ve toplam yuva: <code>district</code>, <code>istasyon</code>, <code>yuva</code>. Yuvaya göre azalan.', 'SELECT district, COUNT(*) AS istasyon, SUM(capacity) AS yuva FROM bk_stations GROUP BY district ORDER BY yuva DESC, district;', O);
bk('g002', 'temel', 1, 'Filo karışımı', 'Bisiklet modeline göre sayı: <code>model</code>, <code>adet</code>.', 'SELECT model, COUNT(*) AS adet FROM bk_bikes GROUP BY model;');
bk('g003', 'temel', 2, 'En sıcak saat', 'Hava durumunda en yüksek sıcaklığın görüldüğü saat ve değer: <code>obs_hour</code>, <code>temp_c</code>.', 'SELECT obs_hour, temp_c FROM bk_weather ORDER BY temp_c DESC, obs_hour LIMIT 1;');
bk('g004', 'temel', 2, 'Yağmurlu günler', 'En az bir saatinde yağmur yağan gün sayısı: <code>gun</code>.', 'SELECT COUNT(DISTINCT date(obs_hour)) AS gun FROM bk_weather WHERE rain_mm > 0;');
bk('g005', 'temel', 2, 'Bakım türleri', 'Bakım kayıtlarının türe göre sayısı, azalan: <code>issue</code>, <code>kayit</code>.', 'SELECT issue, COUNT(*) AS kayit FROM bk_maintenance GROUP BY issue ORDER BY kayit DESC, issue;', O);
bk('g101', 'orta', 2, 'İlçe yolculukları', 'Başlangıç ilçesine göre yolculuk sayısı (istasyonla birleştir), azalan: <code>district</code>, <code>yolculuk</code>.', 'SELECT s.district, COUNT(*) AS yolculuk FROM bk_trips t JOIN bk_stations s ON s.station_id = t.start_station GROUP BY s.district ORDER BY yolculuk DESC, s.district;', O);
bk('g102', 'orta', 2, 'Gidiş-dönüş', 'Aynı istasyonda başlayıp biten (tur) yolculukların oranı (yüzde, 1 basamak): <code>tur_oran</code>.', 'SELECT ROUND(100.0 * SUM(CASE WHEN end_station = start_station THEN 1 ELSE 0 END) / COUNT(end_station), 1) AS tur_oran FROM bk_trips;');
bk('g103', 'orta', 2, 'Ortalama süre', 'Kapanmış yolculukların ortalama süresi (dakika, 1 basamak): <code>ort_dk</code>.', 'SELECT ROUND(AVG(ROUND((julianday(ended_at) - julianday(started_at)) * 86400)) / 60.0, 1) AS ort_dk FROM bk_trips WHERE ended_at IS NOT NULL;');
bk('g104', 'orta', 3, 'Yaş grubu ve kullanım', 'Doğum yılı bilinen kullanıcılarda yaş grubuna göre (2024: 25 altı, 25–39, 40+) kullanıcı başına yolculuk (1 basamak): <code>grup</code>, <code>yolculuk_basina</code>.', "WITH k AS (SELECT t.user_id, COUNT(*) AS n FROM bk_trips t GROUP BY t.user_id) SELECT CASE WHEN 2024 - u.birth_year < 25 THEN '25 altı' WHEN 2024 - u.birth_year < 40 THEN '25-39' ELSE '40+' END AS grup, ROUND(AVG(k.n), 1) AS yolculuk_basina FROM k JOIN bk_users u ON u.user_id = k.user_id WHERE u.birth_year IS NOT NULL GROUP BY CASE WHEN 2024 - u.birth_year < 25 THEN '25 altı' WHEN 2024 - u.birth_year < 40 THEN '25-39' ELSE '40+' END;");
bk('g105', 'orta', 2, 'Gün sayısı', 'Günlük yolculuk sayısı en düşük 3 gün (eşitlikte tarih): <code>gun</code>, <code>yolculuk</code>.', 'SELECT date(started_at) AS gun, COUNT(*) AS yolculuk FROM bk_trips GROUP BY date(started_at) ORDER BY yolculuk, gun LIMIT 3;', O);
bk('g201', 'ileri', 3, '7 günlük ortalama', 'Günlük yolculuk sayısının 7 günlük hareketli ortalaması; Ağustos\'un son 3 günü (1 basamak): <code>gun</code>, <code>ort7</code>.', "WITH g AS (SELECT date(started_at) AS gun, COUNT(*) AS n FROM bk_trips GROUP BY date(started_at)), m AS (SELECT gun, AVG(n) OVER (ORDER BY gun ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS ort7 FROM g) SELECT gun, ROUND(ort7, 1) AS ort7 FROM m WHERE gun >= '2024-08-29' ORDER BY gun;", O);
bk('g202', 'ileri', 3, 'İlk yolculuk', 'Her kullanıcının ilk yolculuğunun ayı; aylara göre ilk kez binen kullanıcı sayısı: <code>ay</code>, <code>yeni</code>.', "WITH f AS (SELECT user_id, MIN(started_at) AS ilk FROM bk_trips GROUP BY user_id) SELECT strftime('%Y-%m', ilk) AS ay, COUNT(*) AS yeni FROM f GROUP BY strftime('%Y-%m', ilk) ORDER BY ay;", O);
bk('g203', 'ileri', 3, 'Yoğun saatte hız', 'Hafta içi 07:00–09:59 ile diğer saatlerde ortalama hız (km/saat, 1 basamak; başlangıç ≠ bitiş, kapanmış): <code>dilim</code>, <code>hiz</code> (SQLite).', "SELECT CASE WHEN strftime('%w', started_at) NOT IN ('0', '6') AND CAST(strftime('%H', started_at) AS INTEGER) BETWEEN 7 AND 9 THEN 'sabah zirvesi' ELSE 'diğer' END AS dilim, ROUND(AVG(distance_km / ((julianday(ended_at) - julianday(started_at)) * 24)), 1) AS hiz FROM bk_trips WHERE ended_at IS NOT NULL AND end_station <> start_station GROUP BY 1;", { dl: ['sqlite'] });
bk('g204', 'ileri', 3, 'İstasyon sırası', 'Her ilçede en çok yolculuk başlayan istasyon (eşitlikte numara): <code>district</code>, <code>name</code>, <code>yolculuk</code>. İlçeye göre.', 'WITH s AS (SELECT start_station, COUNT(*) AS n FROM bk_trips GROUP BY start_station), r AS (SELECT st.district, st.name, s.n, ROW_NUMBER() OVER (PARTITION BY st.district ORDER BY s.n DESC, st.station_id) AS rn FROM s JOIN bk_stations st ON st.station_id = s.start_station) SELECT district, name, n AS yolculuk FROM r WHERE rn = 1 ORDER BY district;', O);
})();
