/* Kesit SQL içerik 31: kısa kalan Veri Bilimi, Veri Mühendisliği, genel, vaka ve SQL türüne özgü derslere
   “Derinleş” bölümleri ve ek alıştırmalar. Alıştırmalar yalnızca sona eklenir (ilerleme korunur). */
(function () {
const L = window.SQLP_LESSONS; const LM = id => L.find(l => l.id === id);
const sq = (q, sol, o) => Object.assign({ t: 'sql', q: '<p>' + q + '</p>', sol }, o || {});
const X = (id, list) => { const l = LM(id); if (l) l.ex = (l.ex || []).concat(list); };
const more = (id, html) => { const l = LM(id); if (l) l.body += html; };
const E = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const A = s => E(s).replace(/"/g, '&quot;');
const C = (src) => '<pre class="code">' + E(src) + '</pre>';
const CA = (attrs, src) => '<pre class="code" ' + attrs + '>' + E(src) + '</pre>';
const NR = (src) => '<pre class="code" data-norun>' + E(src) + '</pre>';
const TS = (src) => CA('data-base="tsql"', src);
const MY = (src) => CA('data-base="mysql"', src);
const D = (title, html) => `<h2>Derinleş: ${title}</h2>${html}`;
const O = { ord: true };
const T = { base: 'tsql', dl: ['tsql'] };
const TO = { base: 'tsql', dl: ['tsql'], ord: true };
const M = { base: 'mysql', dl: ['mysql'] };
const MO = { base: 'mysql', dl: ['mysql'], ord: true };
const NET = 'oi.quantity * oi.unit_price * (1 - oi.discount)';
const SEPET = 'SELECT order_id, SUM(qty * unit_price) AS tutar FROM lk_order_lines GROUP BY order_id';

/* ======================= VERİ BİLİMİ ======================= */

more('ds-dagilim', D('çarpıklık, yüzdelikler ve aykırı değerler', `
<p>Bir dağılımı tek bir ortalamayla özetlemek çoğu zaman yanıltır. Gelir, sepet tutarı, bekleme süresi gibi iş verileri genellikle <b>sağa çarpıktır</b>: değerlerin çoğu küçüktür, az sayıda çok büyük değer ortalamayı yukarı çeker. Bu yüzden analist önce dağılımın şekline bakar, sonra hangi özeti kullanacağına karar verir.</p>
<p>Lezzet Kurye'de sepet tutarını (sipariş satırlarının toplamı) beş sayıyla özetleyelim:</p>
${C(`WITH sepet AS (
  SELECT order_id, SUM(qty * unit_price) AS tutar
  FROM lk_order_lines
  GROUP BY order_id
),
s AS (
  SELECT tutar,
         ROW_NUMBER() OVER (ORDER BY tutar) AS rn,
         COUNT(*) OVER () AS n
  FROM sepet
)
SELECT ROUND(AVG(tutar), 2) AS ortalama,
       MAX(CASE WHEN rn = FLOOR(0.25 * n) + 1 THEN tutar END) AS q1,
       MAX(CASE WHEN rn = FLOOR(0.50 * n) + 1 THEN tutar END) AS medyan,
       MAX(CASE WHEN rn = FLOOR(0.75 * n) + 1 THEN tutar END) AS q3,
       MAX(CASE WHEN rn = FLOOR(0.95 * n) + 1 THEN tutar END) AS p95,
       MAX(tutar) AS en_buyuk
FROM s;`)}
<p>Sonuç: ortalama 510,08 TL, medyan 430 TL, en büyük sepet 2.655 TL. Ortalamanın medyandan belirgin biçimde büyük olması sağa çarpıklığın işaretidir. “Tipik müşteri” için medyanı, toplam ciro planlaması için ortalamayı kullanırsın.</p>
<h3>IQR ile aykırı değer</h3>
<p>Çeyrekler arası açıklık <code>IQR = Q3 − Q1</code>. Yaygın kural: <code>Q3 + 1,5 × IQR</code> üstü ve <code>Q1 − 1,5 × IQR</code> altı “aykırı aday”dır. Burada Q1 = 270, Q3 = 665, üst sınır 1.257,5 TL; 7.178 siparişin 232'si (%3,2) bu sınırın üstünde.</p>
${C(`WITH sepet AS (
  SELECT order_id, SUM(qty * unit_price) AS tutar FROM lk_order_lines GROUP BY order_id
),
r AS (
  SELECT tutar, ROW_NUMBER() OVER (ORDER BY tutar) AS rn, COUNT(*) OVER () AS n FROM sepet
),
q AS (
  SELECT MAX(CASE WHEN rn = FLOOR(0.25 * n) + 1 THEN tutar END) AS q1,
         MAX(CASE WHEN rn = FLOOR(0.75 * n) + 1 THEN tutar END) AS q3
  FROM r
)
SELECT q1, q3, q3 + 1.5 * (q3 - q1) AS ust_sinir,
       (SELECT COUNT(*) FROM sepet WHERE tutar > q.q3 + 1.5 * (q.q3 - q.q1)) AS aykiri
FROM q;`)}
<div class="note"><b>Aykırı değer hata değildir</b>Kalabalık bir ofisin toplu siparişi gerçek bir siparişse veriden atılmaz; yalnızca ortalama yerine medyan kullanılır ya da ayrı bir segment olarak incelenir. Silme kararı, değerin <i>yanlış</i> olduğu (ör. eksi tutar, test kaydı) kanıtlanınca verilir.</div>
<table><tr><th>Durum</th><th>Tercih edilecek özet</th></tr>
<tr><td>Simetrik dağılım (ör. boy, sınav puanı)</td><td>Ortalama ve standart sapma</td></tr>
<tr><td>Sağa çarpık (sepet, gelir, süre)</td><td>Medyan, çeyrekler, p90/p95</td></tr>
<tr><td>Çok geniş aralık (fiyatlar 10 TL – 50.000 TL)</td><td>Log ölçekte histogram</td></tr>
<tr><td>SLA ve performans hedefleri</td><td>Yüzdelikler (p95 teslim süresi gibi)</td></tr></table>
<p><b>Sık hata:</b> histogram kutularını çok dar seçmek gürültü, çok geniş seçmek bilgi kaybı üretir. Kutu sayısını veriye bakarak değiştir; uç değerler için “1.500 ve üzeri” gibi açık uçlu son kutu kullan.</p>`));
X('ds-dagilim', [
  sq('Lezzet Kurye: sepet tutarının (sipariş satırlarında <code>qty * unit_price</code> toplamı) ortalaması (2 basamak) ve medyanı. Medyan için sıralı listede <code>FLOOR(0.5 * n) + 1</code>. sıradaki değeri al: <code>ortalama</code>, <code>medyan</code>.', `WITH s AS (${SEPET}), r AS (SELECT tutar, ROW_NUMBER() OVER (ORDER BY tutar) AS rn, COUNT(*) OVER () AS n FROM s) SELECT ROUND(AVG(tutar), 2) AS ortalama, MAX(CASE WHEN rn = FLOOR(0.5 * n) + 1 THEN tutar END) AS medyan FROM r;`, { hint: 'Önce sipariş başına tutarı bir CTE\'de hesapla, sonra ROW_NUMBER ve COUNT(*) OVER () ekle.' }),
  sq('Lezzet Kurye sepet tutarlarını 250 TL\'lik kutulara ayır; 1.500 TL ve üzeri tek bir son kutu (1500) olsun: <code>kutu</code> (alt sınır), <code>siparis</code>. Kutuya göre sırala.', `WITH s AS (${SEPET}) SELECT CASE WHEN tutar >= 1500 THEN 1500 ELSE FLOOR(tutar / 250) * 250 END AS kutu, COUNT(*) AS siparis FROM s GROUP BY CASE WHEN tutar >= 1500 THEN 1500 ELSE FLOOR(tutar / 250) * 250 END ORDER BY kutu;`, Object.assign({ hint: 'Açık uçlu son kutu için CASE WHEN tutar >= 1500 THEN 1500 ELSE FLOOR(tutar / 250) * 250 END.' }, O)),
  sq('IQR kuralıyla aykırı sepetleri say: Q1 ve Q3\'ü <code>FLOOR(0.25 * n) + 1</code> ve <code>FLOOR(0.75 * n) + 1</code>. sıradan al, <code>Q3 + 1.5 * (Q3 - Q1)</code> sınırını aşan sipariş sayısını bul: <code>q1</code>, <code>q3</code>, <code>aykiri</code>.', `WITH s AS (${SEPET}), r AS (SELECT tutar, ROW_NUMBER() OVER (ORDER BY tutar) AS rn, COUNT(*) OVER () AS n FROM s), q AS (SELECT MAX(CASE WHEN rn = FLOOR(0.25 * n) + 1 THEN tutar END) AS q1, MAX(CASE WHEN rn = FLOOR(0.75 * n) + 1 THEN tutar END) AS q3 FROM r) SELECT q.q1, q.q3, (SELECT COUNT(*) FROM s WHERE s.tutar > q.q3 + 1.5 * (q.q3 - q.q1)) AS aykiri FROM q;`)
]);

more('ds-korelasyon', D('korelasyonu doğru okumak', `
<p><b>Pearson korelasyon katsayısı</b> (r), iki sayısal değişken arasındaki <i>doğrusal</i> ilişkinin yönünü ve gücünü −1 ile +1 arasında ölçer. Formülün eşdeğer bir yazımı ortalamalarla kurulur ve SQL'de daha okunaklıdır:</p>
<p><code>r = (AVG(xy) − AVG(x)·AVG(y)) / (√(AVG(x²) − AVG(x)²) · √(AVG(y²) − AVG(y)²))</code></p>
<p>Pedal İzmir'de saatlik yolculuk sayısı ile hava sıcaklığı arasındaki ilişkiye bakalım. Üç aylık 2.208 saatlik gözlemin tamamında r ≈ 0,48 çıkıyor: “sıcak hava bisiklet kullanımını artırıyor” demek cazip. Ama gündüz saatleri hem daha sıcak hem daha kalabalık; asıl ortak etken <b>günün saati</b>. Saati sabitleyince (yalnızca her günün 17:00 gözlemi) tablo değişir:</p>
${C(`WITH saatlik AS (
  SELECT strftime('%Y-%m-%d %H:00:00', started_at) AS saat, COUNT(*) AS yolculuk
  FROM bk_trips
  WHERE strftime('%H', started_at) = '17'
  GROUP BY strftime('%Y-%m-%d %H:00:00', started_at)
),
d AS (
  SELECT w.temp_c AS t, w.rain_mm AS r, 1.0 * COALESCE(s.yolculuk, 0) AS y
  FROM bk_weather w
  LEFT JOIN saatlik s ON s.saat = w.obs_hour
  WHERE strftime('%H', w.obs_hour) = '17'
)
SELECT COUNT(*) AS gun,
       ROUND((AVG(t * y) - AVG(t) * AVG(y)) /
             (SQRT(AVG(t * t) - AVG(t) * AVG(t)) * SQRT(AVG(y * y) - AVG(y) * AVG(y))), 3) AS r_sicaklik,
       ROUND((AVG(r * y) - AVG(r) * AVG(y)) /
             (SQRT(AVG(r * r) - AVG(r) * AVG(r)) * SQRT(AVG(y * y) - AVG(y) * AVG(y))), 3) AS r_yagmur
FROM d;`)}
<p>Aynı saat diliminde sıcaklıkla ilişki zayıflar (r ≈ 0,12), yağmurla ilişki ise çok güçlü görünür (r ≈ −0,89). Fakat dikkat: 92 günün yalnızca 4'ünde 17:00'de yağmur var. Bu güçlü katsayıyı birkaç uç gözlem üretiyor; 4 günlük kanıtla “yağmur kullanımı %X düşürür” denmez.</p>
<div class="warn"><b>Korelasyon nedensellik değildir</b>Ortak bir etken (saat, mevsim, kampanya), ters yönlü etki (çok satılan ürün indirime girer) veya tesadüf güçlü bir r üretebilir. Nedensellik için deney (A/B testi) ya da etkeni sabitleyen bir analiz gerekir.</div>
<h3>Kontrol listesi</h3>
<ul><li>Gözlem sayısı yeterli mi; katsayıyı birkaç uç nokta mı belirliyor?</li>
<li>İlişki doğrusal mı? Pearson, U biçimli bir ilişkide 0'a yakın çıkabilir.</li>
<li>Ortak bir etken var mı? Grupları (saat, segment) ayrı ayrı hesapla.</li>
<li>Tam sayı tuzağı: SQL Server'da <code>COUNT(*)</code> ve tam sayı sütunlarının çarpımı taşabilir veya tam sayı bölmesine düşebilir; <code>1.0 *</code> ile ondalığa çevir.</li>
<li><code>r²</code>, y'deki değişimin ne kadarının x ile doğrusal olarak açıklandığını gösterir: r = 0,5 ise yalnızca %25.</li></ul>`));
X('ds-korelasyon', [
  sq('Lezzet Kurye: teslim edilen ve puanlanan siparişlerde teslim süresi (dakika, <code>ROUND((julianday(delivered_at) - julianday(placed_at)) * 1440)</code>) ile kurye puanı (<code>courier_score</code>) arasındaki Pearson korelasyonu (2 basamak): <code>n</code>, <code>r</code>.', "WITH d AS (SELECT ROUND((julianday(o.delivered_at) - julianday(o.placed_at)) * 1440) AS x, 1.0 * r.courier_score AS y FROM lk_orders o JOIN lk_ratings r ON r.order_id = o.order_id WHERE o.status = 'teslim') SELECT COUNT(*) AS n, ROUND((COUNT(*) * SUM(x * y) - SUM(x) * SUM(y)) / (SQRT(COUNT(*) * SUM(x * x) - SUM(x) * SUM(x)) * SQRT(COUNT(*) * SUM(y * y) - SUM(y) * SUM(y))), 2) AS r FROM d;", { hint: 'Önce x (dakika) ve y (puan) sütunlarını bir CTE\'de hazırla; puanı 1.0 ile çarparak ondalığa çevir.', why: 'Negatif r: teslim uzadıkça kurye puanı düşme eğiliminde. İlişki orta düzeyde; puanı etkileyen başka etkenler de var.' }),
  sq('Pusula İK: anket yanıtlarında bağlılık (<code>engagement</code>) ile yönetici puanı (<code>manager_score</code>) arasındaki Pearson korelasyonu, ortalamalı formülle (3 basamak). İkisi de dolu olan yanıtlar: <code>r</code>.', 'SELECT ROUND((AVG(engagement * manager_score) - AVG(engagement) * AVG(manager_score)) / (SQRT(AVG(engagement * engagement) - AVG(engagement) * AVG(engagement)) * SQRT(AVG(manager_score * manager_score) - AVG(manager_score) * AVG(manager_score))), 3) AS r FROM ik_survey WHERE engagement IS NOT NULL AND manager_score IS NOT NULL;', { hint: 'r = (AVG(xy) − AVG(x)·AVG(y)) / (√(AVG(x²) − AVG(x)²) · √(AVG(y²) − AVG(y)²))' })
]);

more('ds-ornekleme', D('sızıntısız ve tekrarlanabilir bölme', `
<p>Eğitim/test ayrımının amacı, modelin <b>hiç görmediği</b> veride nasıl çalışacağını dürüstçe ölçmektir. Bu amaç üç yoldan bozulur: aynı varlığın iki kümeye birden düşmesi, gelecekteki verinin eğitime karışması ve her çalıştırmada farklı bir bölme yapılması.</p>
<h3>1. Bölme birimini doğru seç</h3>
<p>Müşteri davranışını tahmin eden bir modelde birim <b>müşteridir</b>, sipariş değil. Siparişleri rastgele bölersen aynı müşterinin bazı siparişleri eğitimde, bazıları testte kalır; model müşteriyi “ezberler” ve test skoru şişer:</p>
${C(`WITH a AS (
  SELECT customer_id,
         MAX(CASE WHEN order_id % 5 = 0 THEN 1 ELSE 0 END) AS testte,
         MAX(CASE WHEN order_id % 5 <> 0 THEN 1 ELSE 0 END) AS egitimde
  FROM orders
  GROUP BY customer_id
)
SELECT SUM(testte * egitimde) AS iki_kumede, COUNT(*) AS musteri
FROM a;`)}
<p>Sipariş bazlı bölmede 136 müşterinin 108'i iki kümede birden yer alıyor. Müşteri bazlı bölmede (<code>customer_id % 5</code>) bu sayı tanım gereği 0'dır.</p>
<h3>2. Zaman varsa zamana göre böl</h3>
<p>Tahmin gelecekte kullanılacaksa test kümesi eğitimden <b>sonraki</b> dönem olmalı (ör. 2024-07-01 öncesi eğitim, sonrası test). Rastgele bölme, modelin “gelecekten” öğrenmesine izin verir.</p>
<h3>3. Tabakalı ve tekrarlanabilir örnek</h3>
<p>Küçük segmentler rastgele örnekte kaybolabilir. Tabakalı örneklemede her tabakadan aynı oranda kayıt alınır. <code>RANDOM()</code> yerine kimlikten türetilen sabit bir “karıştırma anahtarı” kullanırsan örnek her çalıştırmada aynı çıkar:</p>
${C(`WITH s AS (
  SELECT customer_id, segment,
         ROW_NUMBER() OVER (PARTITION BY segment
                            ORDER BY (customer_id * 7919) % 1000, customer_id) AS rn,
         COUNT(*) OVER (PARTITION BY segment) AS n
  FROM bank_customers
)
SELECT segment, MAX(n) AS tabaka, SUM(CASE WHEN rn * 10 <= n THEN 1 ELSE 0 END) AS ornek
FROM s
GROUP BY segment
ORDER BY segment;`)}
<p>Bireysel 400 müşteriden 40, KOBİ 48'den 4, Özel Bankacılık 52'den 5 kayıt seçilir: her tabakada yaklaşık %10. Gerçek projelerde karıştırma anahtarı bir hash fonksiyonudur (BigQuery <code>FARM_FINGERPRINT</code>, PostgreSQL <code>hashtext</code>, SQL Server <code>CHECKSUM</code>).</p>
<table><tr><th>Yöntem</th><th>Ne zaman?</th><th>Risk</th></tr>
<tr><td><code>ORDER BY RANDOM()</code></td><td>Hızlı keşif</td><td>Tekrarlanamaz, büyük tabloda pahalı</td></tr>
<tr><td>Kimlik/hash modu</td><td>Kalıcı eğitim/test ayrımı</td><td>Kimlik sırası anlamlıysa (ör. kayıt tarihi) yanlı olabilir</td></tr>
<tr><td>Zaman kesimi</td><td>Tahmin modelleri</td><td>Mevsimsellik varsa test dönemi temsil gücü düşük</td></tr>
<tr><td>Tabakalı</td><td>Dengesiz sınıflar, küçük segmentler</td><td>Tabaka tanımı yanlışsa yanlılık sürer</td></tr></table>`));
X('ds-ornekleme', [
  sq('Zamana göre bölme: Anadolu Market siparişlerini 2024-07-01 öncesi <b>train</b>, sonrası <b>test</b> olarak ayır; her kümede sipariş ve farklı müşteri sayısı: <code>kume</code>, <code>siparis</code>, <code>musteri</code>.', "SELECT CASE WHEN order_date < '2024-07-01' THEN 'train' ELSE 'test' END AS kume, COUNT(*) AS siparis, COUNT(DISTINCT customer_id) AS musteri FROM orders GROUP BY CASE WHEN order_date < '2024-07-01' THEN 'train' ELSE 'test' END;", { why: 'Müşterilerin çoğu iki dönemde de sipariş veriyor; zaman bölmesi “aynı müşteri geçmişte ve gelecekte” durumunu doğal karşılar, çünkü model yalnızca geçmişten öğrenir.' }),
  sq('Sızıntı ölçümü: siparişleri <code>order_id % 5 = 0</code> test, diğerleri train olacak şekilde bölseydin, kaç müşteri <b>iki kümede birden</b> bulunurdu? <code>iki_kumede</code>, <code>musteri</code> (siparişi olan müşteri sayısı).', 'WITH a AS (SELECT customer_id, MAX(CASE WHEN order_id % 5 = 0 THEN 1 ELSE 0 END) AS testte, MAX(CASE WHEN order_id % 5 <> 0 THEN 1 ELSE 0 END) AS trainde FROM orders GROUP BY customer_id) SELECT SUM(testte * trainde) AS iki_kumede, COUNT(*) AS musteri FROM a;', { hint: 'Müşteri başına “testte var mı” ve “train\'de var mı” bayraklarını MAX(CASE ...) ile üret; ikisi de 1 olanları say.' }),
  sq('Ilgaz Bank: her segmentten yaklaşık %10\'luk tekrarlanabilir tabakalı örnek. Segment içinde <code>(customer_id * 7919) % 1000, customer_id</code> sırasına göre numara ver ve <code>rn * 10 &lt;= n</code> olanları seç: <code>segment</code>, <code>ornek</code>. Segmente göre sırala.', 'WITH s AS (SELECT segment, ROW_NUMBER() OVER (PARTITION BY segment ORDER BY (customer_id * 7919) % 1000, customer_id) AS rn, COUNT(*) OVER (PARTITION BY segment) AS n FROM bank_customers) SELECT segment, SUM(CASE WHEN rn * 10 <= n THEN 1 ELSE 0 END) AS ornek FROM s GROUP BY segment ORDER BY segment;', O)
]);

more('ds-feature', D('veri sızıntısını yakalamak', `
<p><b>Veri sızıntısı</b> (data leakage), modelin eğitim sırasında tahmin anında elinde olmayacak bir bilgiyi görmesidir. Sızıntılı bir model test skorunda parlar, canlıda çöker. En sık türleri:</p>
<ul><li><b>Gelecek bilgisi:</b> Özellik, kesim tarihinden sonraki veriden hesaplanır (tüm zamanların son sipariş tarihi gibi).</li>
<li><b>Hedef sızıntısı:</b> Özellik, hedefin kendisinden türer (churn etiketi için “hesap kapatma tarihi dolu mu”).</li>
<li><b>Küme sızıntısı:</b> Ölçekleme ortalaması veya kategori frekansı test verisi de katılarak hesaplanır.</li></ul>
<p>Anadolu Market'te kesim tarihi 2024-07-01 ve hedef “kesimden sonra (veri 2024 sonunda bitiyor) sipariş verdi mi?” olsun. “Son sipariş tarihi” özelliğini yanlışlıkla <b>tüm</b> siparişlerden hesaplarsak:</p>
${C(`WITH m AS (
  SELECT customer_id,
         MAX(order_date) AS son_tum,
         MAX(CASE WHEN order_date < '2024-07-01' THEN order_date END) AS son_gecmis,
         MAX(CASE WHEN order_date >= '2024-07-01' THEN 1 ELSE 0 END) AS geri_geldi
  FROM orders
  GROUP BY customer_id
)
SELECT CASE WHEN son_tum >= '2024-07-01' THEN 'son sipariş kesimden sonra'
            ELSE 'son sipariş kesimden önce' END AS sizan_ozellik,
       COUNT(*) AS musteri, SUM(geri_geldi) AS geri_gelen
FROM m
WHERE son_gecmis IS NOT NULL
GROUP BY CASE WHEN son_tum >= '2024-07-01' THEN 'son sipariş kesimden sonra'
              ELSE 'son sipariş kesimden önce' END;`)}
<p>Sonuç kusursuz: 91 müşterinin 91'i geri gelmiş, 23 müşterinin hiçbiri gelmemiş. Bu kadar temiz bir ayrım neredeyse her zaman sızıntı alarmıdır; özellik etiketi “önceden biliyor”. Doğru (zaman noktasına uygun) özellik, yalnızca kesim öncesi son siparişten geçen gün sayısıdır; onunla geri gelme oranı 0–90 gün grubunda %93,8, 91–180 günde %75, 180 günden eskide %0 çıkar. Gerçekçi ve hâlâ çok bilgilendirici.</p>
<div class="tip"><b>Zaman noktası doğruluğu (point-in-time)</b>Her özellik sorgusuna “bu değeri kesim anında bilebilir miydim?” sorusunu sor. Pratik kural: özellik CTE'lerinin hepsinde <code>WHERE tarih &lt; kesim</code>, etiket CTE'sinde <code>WHERE tarih &gt;= kesim</code> bulunsun ve kesim tek bir parametre CTE'sinden gelsin.</div>
<h3>Özellik tablosu kontrol listesi</h3>
<table><tr><th>Kontrol</th><th>SQL ile nasıl?</th></tr>
<tr><td>Bir satır = bir varlık</td><td><code>COUNT(*) = COUNT(DISTINCT customer_id)</code></td></tr>
<tr><td>Eksik değer politikası</td><td><code>COALESCE(siparis_sayisi, 0)</code>; ama “hiç veri yok” bilgisi için ayrıca bayrak sütunu</td></tr>
<tr><td>Kategorik kodlama</td><td><code>CASE WHEN segment = 'Premium' THEN 1 ELSE 0 END</code></td></tr>
<tr><td>Oran özellikleri</td><td>Payda sıfırsa <code>NULLIF</code>; tam sayı bölmesinden kaçın</td></tr>
<tr><td>Sızıntı</td><td>Etiketle mükemmel ayrışan özellik var mı? Grupla ve etiket oranına bak</td></tr></table>`));
X('ds-feature', [
  sq('Kesim tarihi 2024-07-01. Yalnızca kesimden <b>önceki teslim edilmiş</b> siparişlerden RFM özellikleri üret (1–10 numaralı müşteriler): <code>customer_id</code>, <code>recency</code> (kesimden son siparişe gün), <code>frequency</code> (sipariş sayısı), <code>monetary</code> (net tutar, 2 basamak). Müşteriye göre sırala.', `SELECT o.customer_id, julianday('2024-07-01') - julianday(MAX(o.order_date)) AS recency, COUNT(DISTINCT o.order_id) AS frequency, ROUND(SUM(${NET}), 2) AS monetary FROM orders o JOIN order_items oi ON oi.order_id = o.order_id WHERE o.status = 'delivered' AND o.order_date < '2024-07-01' AND o.customer_id <= 10 GROUP BY o.customer_id ORDER BY o.customer_id;`, Object.assign({ hint: 'Sipariş satırlarıyla birleştirdiğin için sipariş sayısında COUNT(DISTINCT o.order_id) kullan.' }, O)),
  sq('Sızıntısız özellik ile etiket ilişkisi: kesim (2024-07-01) öncesi son siparişten geçen gün sayısına göre müşterileri <b>0-90 gün</b>, <b>91-180 gün</b>, <b>180+ gün</b> gruplarına ayır; her grupta müşteri sayısı ve kesimden sonra sipariş verenlerin oranı (%, 1 basamak): <code>recency</code>, <code>musteri</code>, <code>oran</code>. Kesim öncesi siparişi olmayanları dışla.', "WITH m AS (SELECT customer_id, MAX(CASE WHEN order_date < '2024-07-01' THEN order_date END) AS son_gecmis, MAX(CASE WHEN order_date >= '2024-07-01' THEN 1 ELSE 0 END) AS geri_geldi FROM orders GROUP BY customer_id) SELECT CASE WHEN julianday('2024-07-01') - julianday(son_gecmis) <= 90 THEN '0-90 gün' WHEN julianday('2024-07-01') - julianday(son_gecmis) <= 180 THEN '91-180 gün' ELSE '180+ gün' END AS recency, COUNT(*) AS musteri, ROUND(100.0 * SUM(geri_geldi) / COUNT(*), 1) AS oran FROM m WHERE son_gecmis IS NOT NULL GROUP BY CASE WHEN julianday('2024-07-01') - julianday(son_gecmis) <= 90 THEN '0-90 gün' WHEN julianday('2024-07-01') - julianday(son_gecmis) <= 180 THEN '91-180 gün' ELSE '180+ gün' END;", { hint: 'Müşteri başına kesim öncesi son sipariş (MAX(CASE WHEN order_date < kesim ...)) ve kesim sonrası sipariş bayrağı (MAX(CASE ... THEN 1 ELSE 0 END)) hesapla.' })
]);

/* ======================= VERİ MÜHENDİSLİĞİ ======================= */

more('de-etl', D('ETL mi ELT mi, ve tekrar çalıştırılabilir yükleme', `
<p>ETL ile ELT arasındaki fark yalnızca harflerin sırası değil; <b>dönüşümün nerede ve hangi araçla</b> yapıldığıdır. Bu, ekip yapısını, maliyeti ve hata ayıklamayı doğrudan etkiler.</p>
<table><tr><th></th><th>ETL</th><th>ELT</th></tr>
<tr><td>Dönüşüm yeri</td><td>Ayrı bir sunucu / araç</td><td>Hedef ambarın içinde, SQL ile</td></tr>
<tr><td>Ham veri</td><td>Çoğu zaman saklanmaz</td><td>Bronze katmanda olduğu gibi durur</td></tr>
<tr><td>Hata sonrası</td><td>Kaynaktan yeniden çekmek gerekir</td><td>Ham veriden yeniden dönüştürülür</td></tr>
<tr><td>Kim yazar?</td><td>Entegrasyon uzmanı</td><td>SQL bilen analist / analitik mühendis</td></tr>
<tr><td>Uygun olduğu yer</td><td>Hassas verinin ambara girmeden maskelenmesi, eski sistemler</td><td>Bulut ambarları (BigQuery, Snowflake), dbt projeleri</td></tr></table>
<h3>Staging katmanında tipik temizlik</h3>
<p>Ham <code>raw_signups</code> tablosunda tarihler iki biçimde geliyor: <code>2024-02-10</code> ve <code>29.07.2024</code>. Staging adımı adları standartlaştırır, e-postayı normalize eder ve tarihi tek biçime çevirir:</p>
${C(`SELECT DISTINCT
       id,
       LOWER(TRIM(email)) AS email,
       TRIM(full_name) AS full_name,
       CASE WHEN signup_date LIKE '__.__.____'
            THEN substr(signup_date, 7, 4) || '-' || substr(signup_date, 4, 2) || '-' || substr(signup_date, 1, 2)
            ELSE signup_date END AS signup_date
FROM raw_signups
ORDER BY id;`)}
<h3>İdempotent yükleme</h3>
<p>Bir iş gece yarısı yarıda kesildi ve yeniden başlatıldı. Yükleme <code>INSERT</code> ile yapılıyorsa aynı ayın satırları iki kez eklenir ve ciro iki katına çıkar. <b>İdempotent</b> bir adım, kaç kez çalışırsa çalışsın aynı sonucu bırakır. En basit kalıp, yüklenecek dilimi önce silip sonra eklemektir:</p>
${C(`CREATE TABLE aylik_ciro (ay VARCHAR(7), ciro DECIMAL(12, 2));

-- Aynı adımı iki kez çalıştırıyoruz:
DELETE FROM aylik_ciro WHERE ay = '2024-12';
INSERT INTO aylik_ciro (ay, ciro)
SELECT '2024-12', ROUND(SUM(oi.quantity * oi.unit_price * (1 - oi.discount)), 2)
FROM orders o JOIN order_items oi ON oi.order_id = o.order_id
WHERE o.status = 'delivered' AND o.order_date >= '2024-12-01' AND o.order_date < '2025-01-01';

DELETE FROM aylik_ciro WHERE ay = '2024-12';
INSERT INTO aylik_ciro (ay, ciro)
SELECT '2024-12', ROUND(SUM(oi.quantity * oi.unit_price * (1 - oi.discount)), 2)
FROM orders o JOIN order_items oi ON oi.order_id = o.order_id
WHERE o.status = 'delivered' AND o.order_date >= '2024-12-01' AND o.order_date < '2025-01-01';

SELECT ay, ciro, (SELECT COUNT(*) FROM aylik_ciro) AS satir FROM aylik_ciro;`)}
<p>İki çalıştırmadan sonra da tabloda tek satır var. Gerçek sistemlerde DELETE ile INSERT aynı işlem (transaction) içinde yapılır; böylece arada okuyan bir rapor boş tablo görmez. Diğer idempotent kalıplar: <code>MERGE</code> (upsert), <code>CREATE OR REPLACE TABLE</code> ve bölüm üzerine yazma (BigQuery'de <code>WRITE_TRUNCATE</code>).</p>
<div class="note"><b>Pipeline kontrol listesi</b>Ham veri değiştirilmeden saklanıyor mu? Her adım idempotent mi? Yüklenen satırlara <code>loaded_at</code> / <code>batch_id</code> ekleniyor mu? Kaynak ve hedef satır sayıları karşılaştırılıyor mu? Hata olursa kim, nasıl haberdar oluyor?</div>`));
X('de-etl', [
  sq('Staging: <code>raw_signups</code> tarihlerini tek biçime (YYYY-AA-GG) çevir; <code>GG.AA.YYYY</code> biçimindekileri <code>substr</code> ile yeniden diz. Tekrarlanan satırları <code>DISTINCT</code> ile at ve standart tarihin ayına göre kayıt sayısını getir: <code>ay</code> (YYYY-AA), <code>kayit</code>. Aya göre sırala.', "WITH s AS (SELECT DISTINCT id, CASE WHEN signup_date LIKE '__.__.____' THEN substr(signup_date, 7, 4) || '-' || substr(signup_date, 4, 2) || '-' || substr(signup_date, 1, 2) ELSE signup_date END AS tarih FROM raw_signups) SELECT substr(tarih, 1, 7) AS ay, COUNT(*) AS kayit FROM s GROUP BY substr(tarih, 1, 7) ORDER BY ay;", Object.assign({ hint: "LIKE '__.__.____' iki basamak, nokta, iki basamak, nokta, dört basamak demektir. Yıl 7. karakterden, ay 4. karakterden, gün 1. karakterden başlar." }, O)),
  sq('Gold katman: teslim edilen her sipariş için bir satırlık <code>fct_siparis</code> tablosunu <code>CREATE TABLE ... AS</code> ile oluştur: <code>order_id</code>, <code>customer_id</code>, <code>order_date</code>, <code>channel</code>, <code>net_tutar</code> (2 basamak).', `CREATE TABLE fct_siparis AS SELECT o.order_id, o.customer_id, o.order_date, o.channel, ROUND(SUM(${NET}), 2) AS net_tutar FROM orders o JOIN order_items oi ON oi.order_id = o.order_id WHERE o.status = 'delivered' GROUP BY o.order_id, o.customer_id, o.order_date, o.channel;`, { check: 'SELECT COUNT(*) AS satir, ROUND(SUM(net_tutar)) AS toplam FROM fct_siparis', hint: 'Sipariş satırlarını sipariş düzeyinde topla: GROUP BY o.order_id, o.customer_id, o.order_date, o.channel.' })
]);

more('de-kalite', D('veri kalitesinin beş boyutu', `
<p>“Veri kötü” demek eyleme dönüşmez. Kaliteyi ölçülebilir boyutlara ayırınca her sorun için bir test, bir sahip ve bir eşik tanımlanabilir:</p>
<table><tr><th>Boyut</th><th>Soru</th><th>Örnek test</th></tr>
<tr><td><b>Tamlık</b></td><td>Olması gereken değer var mı?</td><td>Müşterinin ilçesi boş mu?</td></tr>
<tr><td><b>Tekillik</b></td><td>Her varlık bir kez mi?</td><td>Aynı <code>order_id</code> iki kez geçiyor mu?</td></tr>
<tr><td><b>Geçerlilik</b></td><td>Değer izin verilen aralıkta / biçimde mi?</td><td>Puan 1–5 dışında mı?</td></tr>
<tr><td><b>Tutarlılık</b></td><td>İlişkili kayıtlar birbiriyle çelişiyor mu?</td><td>Sipariş, müşterinin kayıt tarihinden önce mi?</td></tr>
<tr><td><b>Güncellik</b></td><td>Veri beklenen tazelikte mi?</td><td>Son kayıt kaç gün önce geldi?</td></tr></table>
<p>Bunlara bazen <b>doğruluk</b> (değer gerçeği yansıtıyor mu) da eklenir; ama doğruluk genelde dış bir kaynakla karşılaştırma gerektirir ve tek başına SQL ile ölçülemez.</p>
<h3>Lezzet Kurye kalite karnesi</h3>
${C(`SELECT 'tamlık' AS boyut, 'lk_customers.district boş' AS test, COUNT(*) AS hatali
FROM lk_customers WHERE district IS NULL
UNION ALL
SELECT 'tekillik', 'lk_orders.order_id tekrarı', COUNT(*)
FROM (SELECT order_id FROM lk_orders GROUP BY order_id HAVING COUNT(*) > 1) t
UNION ALL
SELECT 'geçerlilik', 'puan 1-5 dışında', COUNT(*)
FROM lk_ratings WHERE food_score NOT BETWEEN 1 AND 5 OR courier_score NOT BETWEEN 1 AND 5
UNION ALL
SELECT 'tutarlılık', 'sipariş, müşteri kaydından önce', COUNT(*)
FROM lk_orders o JOIN lk_customers c ON c.customer_id = o.customer_id
WHERE o.placed_at < c.signup_date
UNION ALL
SELECT 'güncellik', 'son siparişten bu yana gün (rapor günü 2025-01-03)',
       julianday('2025-01-03') - julianday(MAX(date(placed_at)))
FROM lk_orders;`)}
<p>Karnede iki gerçek bulgu var: 1.209 müşterinin 74'ünde ilçe boş (tamlık %93,9) ve 15 sipariş, sahibinin kayıt tarihinden <b>önce</b> verilmiş görünüyor. İkincisi tipik bir tutarlılık sorunudur: ya kayıt tarihi sonradan güncelleniyor ya da misafir siparişler sonradan bir hesaba bağlanıyor. Kaynağı bilen ekiple konuşmadan “düzeltme”.</p>
<div class="tip"><b>Eşik ve önem derecesi</b>Her testin bir eşiği olsun: tekillik ihlali sıfır tolerans (hattı durdur), tamlıkta %95 altı uyarı gibi. dbt'de <code>severity: warn</code> / <code>error</code> ve <code>warn_if</code>, <code>error_if</code> ayarları bunu sağlar.</div>
<p><b>Sık hata:</b> testleri yalnızca yeni tabloya yazmak. En değerli testler, kaynaklar arasındaki ilişkileri (sipariş–müşteri, değerlendirme–sipariş) kontrol eden tutarlılık testleridir; çünkü tek tabloya bakan testler bu çelişkileri hiç görmez.</p>`));
X('de-kalite', [
  sq('Tutarlılık testi: Lezzet Kurye\'de müşterinin kayıt tarihinden (<code>signup_date</code>) <b>önce</b> verilmiş sipariş sayısı ve bu siparişlerin ait olduğu farklı müşteri sayısı: <code>adet</code>, <code>musteri</code>.', 'SELECT COUNT(*) AS adet, COUNT(DISTINCT o.customer_id) AS musteri FROM lk_orders o JOIN lk_customers c ON c.customer_id = o.customer_id WHERE o.placed_at < c.signup_date;'),
  sq('Tamlık oranı: Lezzet Kurye müşterilerinde şehir bazında ilçe (<code>district</code>) doluluk oranı (%, 1 basamak): <code>city</code>, <code>musteri</code>, <code>tamlik</code>. Orana göre artan, eşitlikte şehre göre sırala.', 'SELECT city, COUNT(*) AS musteri, ROUND(100.0 * COUNT(district) / COUNT(*), 1) AS tamlik FROM lk_customers GROUP BY city ORDER BY tamlik, city;', Object.assign({ hint: 'COUNT(sütun) yalnızca dolu değerleri sayar; COUNT(*) tüm satırları.' }, O))
]);

more('de-dedup', D('“hangi kayıt kalır?” kuralı', `
<p>Tekilleştirmenin teknik kısmı kolaydır: <code>ROW_NUMBER() OVER (PARTITION BY anahtar ORDER BY kural)</code> ve <code>rn = 1</code>. Zor kısım iki iş kararıdır: <b>anahtar</b> (iki kayıt ne zaman aynı varlıktır?) ve <b>hayatta kalma kuralı</b> (survivorship: hangisi kalır?).</p>
<h3>Anahtar seçimi</h3>
<p>Ad soyad iyi bir anahtar değildir: Lezzet Kurye'de 185 ad–şehir çifti birden fazla müşteri kaydında geçiyor ve bunların çoğu gerçekten farklı kişiler (yaygın adlar). E-posta daha güçlüdür ama onun da tuzağı var: <code>raw_signups</code> tablosunda <code>can.kaya@gmail.com</code> iki farklı <code>id</code> (8 ve 33) altında görünüyor. E-postayı anahtar yaparsan bu iki kaydı birleştirirsin; doğru olup olmadığını kaynağa sormak gerekir.</p>
<h3>Hayatta kalma kuralı</h3>
<table><tr><th>Kural</th><th>ORDER BY</th><th>Ne zaman?</th></tr>
<tr><td>İlk gelen kalır</td><td><code>created_at, id</code></td><td>Müşteri kimliğinin ilk kaydı esas</td></tr>
<tr><td>En yeni kalır</td><td><code>updated_at DESC, id DESC</code></td><td>Adres, telefon gibi güncel bilgi önemli</td></tr>
<tr><td>En eksiksiz kalır</td><td><code>CASE WHEN city IS NULL THEN 1 ELSE 0 END, id</code></td><td>Kaynaklar farklı alanları dolduruyor</td></tr>
<tr><td>Güvenilir kaynak kalır</td><td><code>CASE source WHEN 'crm' THEN 1 ELSE 2 END</code></td><td>Birden çok sistem birleşiyor</td></tr></table>
<p>ORDER BY'ın sonunda her zaman benzersiz bir sütun (eşitlik bozucu) bulunsun; yoksa aynı sorgu iki çalıştırmada farklı satırı seçebilir.</p>
<h3>RANK tuzağı</h3>
${C(`WITH s AS (
  SELECT LOWER(TRIM(email)) AS e,
         ROW_NUMBER() OVER (PARTITION BY LOWER(TRIM(email)) ORDER BY id) AS rn,
         RANK()       OVER (PARTITION BY LOWER(TRIM(email)) ORDER BY id) AS rk
  FROM raw_signups
)
SELECT SUM(CASE WHEN rn = 1 THEN 1 ELSE 0 END) AS row_number_ile,
       SUM(CASE WHEN rk = 1 THEN 1 ELSE 0 END) AS rank_ile,
       COUNT(DISTINCT e) AS tekil_email
FROM s;`)}
<p>39 tekil e-posta var; ROW_NUMBER 39 satır bırakır, RANK ise 51. Tam tekrar satırlar aynı <code>id</code>'ye sahip olduğu için RANK hepsine 1 verir ve tekrarlar yerinde kalır.</p>
<h3>Birleştirmenin bedeli</h3>
<p>Kanat Havayolları'nda 33 e-posta birden fazla yolcu kaydında geçiyor. En eski kaydı (en küçük <code>joined_date</code>) bırakırsak 34 yolcu kaydı birleşir ve bunlara bağlı 172 rezervasyonun <code>passenger_id</code>'si kalan kayda taşınmalıdır. Tekilleştirme yalnızca bir tabloyu değil, ona bakan tüm tabloları etkiler.</p>
<div class="note"><b>SQL türlerine göre kısayollar</b>PostgreSQL: <code>SELECT DISTINCT ON (email) ... ORDER BY email, joined_date</code>. BigQuery ve Snowflake: <code>QUALIFY ROW_NUMBER() OVER (...) = 1</code>. Diğerlerinde CTE + ROW_NUMBER kalıbı her yerde çalışır.</div>`));
X('de-dedup', [
  sq('Kanat Havayolları: e-postası dolu yolcuları e-postaya göre tekilleştir; her e-postada en eski <code>joined_date</code> (eşitlikte küçük <code>passenger_id</code>) kalsın. Yalnızca birden fazla kaydı olan e-postaların <b>kalan</b> kaydını getir: <code>email</code>, <code>passenger_id</code>, <code>joined_date</code>. E-postaya göre sırala.', 'WITH s AS (SELECT passenger_id, email, joined_date, ROW_NUMBER() OVER (PARTITION BY email ORDER BY joined_date, passenger_id) AS rn, COUNT(*) OVER (PARTITION BY email) AS adet FROM hv_passengers WHERE email IS NOT NULL) SELECT email, passenger_id, joined_date FROM s WHERE rn = 1 AND adet > 1 ORDER BY email;', Object.assign({ hint: 'ROW_NUMBER ile kalanı, COUNT(*) OVER (PARTITION BY email) ile grubun büyüklüğünü aynı CTE\'de hesapla.' }, O)),
  sq('Birleştirmenin etkisi: yukarıdaki kurala göre <b>silinecek</b> (rn &gt; 1) yolcu kayıtlarının sayısı ve bu kayıtlara bağlı, kalan kayda taşınması gereken rezervasyon sayısı: <code>birlesen_yolcu</code>, <code>tasinacak_rezervasyon</code>.', 'WITH s AS (SELECT passenger_id, email, ROW_NUMBER() OVER (PARTITION BY email ORDER BY joined_date, passenger_id) AS rn FROM hv_passengers WHERE email IS NOT NULL) SELECT COUNT(DISTINCT s.passenger_id) AS birlesen_yolcu, COUNT(b.booking_id) AS tasinacak_rezervasyon FROM s LEFT JOIN hv_bookings b ON b.passenger_id = s.passenger_id WHERE s.rn > 1;', { hint: 'rn > 1 olan yolculara rezervasyonları LEFT JOIN ile bağla; yolcu için COUNT(DISTINCT), rezervasyon için COUNT(b.booking_id).' })
]);

more('de-incremental', D('watermark, geç gelen veri ve kontrol tablosu', `
<p><b>Watermark</b> (su seviyesi), hedefe en son hangi noktaya kadar veri yüklendiğini gösteren değerdir: çoğunlukla bir zaman damgası, bazen artan bir kimlik. Artımlı iş her çalıştığında “watermark'tan sonrasını” okur ve sonunda watermark'ı ilerletir. Watermark'ı hedef tablodan <code>MAX()</code> ile türetmek basittir; ama üretimde genellikle ayrı bir <b>kontrol tablosunda</b> tutulur, çünkü hedef tablo silinip yeniden kurulabilir, birden çok kaynaktan beslenebilir veya boş olabilir.</p>
${C(`CREATE TABLE etl_watermark (tablo VARCHAR(30), son_deger VARCHAR(19));
INSERT INTO etl_watermark (tablo, son_deger) VALUES ('price_updates', '2024-11-15 00:00:00');

-- Daha önceki çalıştırmalarla dolmuş hedef
CREATE TABLE price_hist (product_id INTEGER, new_price REAL, updated_at VARCHAR(19));
INSERT INTO price_hist
SELECT product_id, new_price, updated_at FROM price_updates
WHERE updated_at <= '2024-11-15 00:00:00';

-- Artımlı adım: watermark'tan sonrasını ekle, sonra watermark'ı ilerlet
INSERT INTO price_hist
SELECT product_id, new_price, updated_at FROM price_updates
WHERE updated_at > (SELECT son_deger FROM etl_watermark WHERE tablo = 'price_updates');

UPDATE etl_watermark
SET son_deger = (SELECT MAX(updated_at) FROM price_hist)
WHERE tablo = 'price_updates';

SELECT (SELECT COUNT(*) FROM price_hist) AS satir, son_deger FROM etl_watermark;`)}
<p>Watermark yalnızca yükleme başarıyla bittiğinde güncellenmelidir; aynı işlem (transaction) içinde ya da yüklemeden hemen sonra. Önce watermark'ı ilerletip sonra yüklemede hata alırsan aradaki kayıtlar sonsuza dek kaybolur.</p>
<h3><code>&gt;</code> mı <code>&gt;=</code> mı?</h3>
<p><code>&gt;</code> aynı zaman damgasına sahip ama farklı çalıştırmalarda gelen kayıtları kaçırabilir; <code>&gt;=</code> ise son anı iki kez yükler. Güvenli kombinasyon: <code>&gt;=</code> ile oku, hedefe <code>MERGE</code> / NOT EXISTS ile yaz (tekrarı engelle).</p>
<h3>Geç gelen veri</h3>
<p>Lezzet Kurye'de 94 teslim siparişi, verildiği günden <b>sonraki</b> gün teslim edilmiş (gece yarısını aşan siparişler). Teslim tarihine göre günlük özet üreten bir iş öğlen çalışırsa o günün teslimlerinin bir kısmını henüz görmez. Çözüm, her çalıştırmada son birkaç günü <b>silip yeniden yüklemektir</b> (lookback penceresi). Pencere ne kadar geniş olmalı? Verinin gecikme dağılımına bak: gecikmelerin %99'u 2 gün içindeyse 3 günlük pencere yeterlidir.</p>
<table><tr><th>Sorun</th><th>Belirti</th><th>Çözüm</th></tr>
<tr><td>Geç gelen kayıt</td><td>Geçmiş günlerin sayıları sonradan artar</td><td>Lookback penceresiyle sil-yeniden yükle</td></tr>
<tr><td>Güncellenen kayıt</td><td>Durum değişikliği hedefe yansımaz</td><td><code>updated_at</code> watermark'ı + MERGE</td></tr>
<tr><td>Silinen kayıt</td><td>Hedefte “hayalet” satırlar</td><td>Kaynakta soft delete bayrağı ya da periyodik tam karşılaştırma</td></tr>
<tr><td>Saat dilimi</td><td>Gün sınırında kayıp/çift</td><td>Watermark'ı UTC tut</td></tr></table>`));
X('de-incremental', [
  sq('Lookback penceresi: başlangıç kodu <code>gunluk_teslim(gun, teslim)</code> tablosunu, 2024-12-31 12:00\'de çalışmış bir işin sonucuyla dolduruyor (o anda teslim edilmiş siparişler). Son üç günü (<code>gun &gt;= \'2024-12-29\'</code>) <b>silip</b> teslim zamanı 2024-12-29 ve sonrası olan tüm teslim siparişlerinden <b>yeniden yükle</b>.', "CREATE TABLE gunluk_teslim (gun VARCHAR(10), teslim INTEGER); INSERT INTO gunluk_teslim (gun, teslim) SELECT date(delivered_at), COUNT(*) FROM lk_orders WHERE status = 'teslim' AND delivered_at < '2024-12-31 12:00:00' GROUP BY date(delivered_at); DELETE FROM gunluk_teslim WHERE gun >= '2024-12-29'; INSERT INTO gunluk_teslim (gun, teslim) SELECT date(delivered_at), COUNT(*) FROM lk_orders WHERE status = 'teslim' AND delivered_at >= '2024-12-29' GROUP BY date(delivered_at);", { start: "CREATE TABLE gunluk_teslim (gun VARCHAR(10), teslim INTEGER);\nINSERT INTO gunluk_teslim (gun, teslim)\nSELECT date(delivered_at), COUNT(*) FROM lk_orders\nWHERE status = 'teslim' AND delivered_at < '2024-12-31 12:00:00'\nGROUP BY date(delivered_at);\n\n-- Son üç günü sil ve yeniden yükle:\n", check: "SELECT gun, teslim FROM gunluk_teslim WHERE gun >= '2024-12-27' ORDER BY gun", hint: "DELETE FROM gunluk_teslim WHERE gun >= '2024-12-29'; ardından INSERT ... SELECT date(delivered_at), COUNT(*) ... WHERE delivered_at >= '2024-12-29' GROUP BY date(delivered_at);" }),
  sq('Geç gelen veri ne kadar? Lezzet Kurye\'de teslim edilen siparişlerden, teslim <b>günü</b> sipariş gününden sonra olanların sayısı: <code>gec_kapanan</code>.', "SELECT COUNT(*) AS gec_kapanan FROM lk_orders WHERE status = 'teslim' AND date(delivered_at) > date(placed_at);", { why: 'Bu siparişler, sipariş günü kapanırken henüz “teslim” görünmez. Gün bazlı artımlı yükleme bunları ancak geriye dönük bir pencereyle yakalar.' })
]);

more('de-scd', D('SCD tiplerini seçmek ve zaman noktasına göre birleştirmek', `
<p>Boyut tablosundaki bir nitelik değiştiğinde ne olacağı bir <b>iş sorusudur</b>: “Geçen yılın raporu, geçen yılki değeri mi göstermeli?” Cevaba göre tip seçilir:</p>
<table><tr><th>Tip</th><th>Değişiklikte</th><th>Tarihçe</th><th>Artı / eksi</th></tr>
<tr><td>0</td><td>Hiç değişmez</td><td>—</td><td>Doğum tarihi gibi sabit nitelikler</td></tr>
<tr><td>1</td><td>Üzerine yazılır</td><td>Yok</td><td>Basit; geçmiş raporlar sessizce değişir</td></tr>
<tr><td>2</td><td>Eski satır kapanır, yeni satır açılır</td><td>Tam</td><td>Doğru geçmiş; tablo büyür, birleştirme tarih aralığı ister</td></tr>
<tr><td>3</td><td>Önceki değer ayrı sütuna taşınır</td><td>Yalnızca bir önceki</td><td>“Eski bölge / yeni bölge” karşılaştırmaları için yeterli</td></tr></table>
<p>Uygulamada aynı boyutta tipler karışır: müşterinin adı yazım düzeltmesinde Tip 1, segmenti Tip 2 olabilir.</p>
<h3>Zaman noktasına göre birleştirme (point-in-time join)</h3>
<p>SCD 2'nin değeri, olay tablosunu <b>olay anında geçerli</b> satırla birleştirince ortaya çıkar. Ekim–Aralık 2024'te fiyatı değişen ürünlerin satışlarını, sipariş günündeki liste fiyatıyla ve bugünkü (güncel) fiyatla ayrı ayrı değerleyelim:</p>
${C(`WITH s AS (
  SELECT product_id, price AS fiyat, '2000-01-01 00:00:00' AS g FROM products
  UNION ALL
  SELECT product_id, new_price, updated_at FROM price_updates
),
dim AS (
  SELECT product_id, fiyat, g AS valid_from,
         COALESCE(LEAD(g) OVER (PARTITION BY product_id ORDER BY g), '9999-12-31') AS valid_to,
         CASE WHEN LEAD(g) OVER (PARTITION BY product_id ORDER BY g) IS NULL THEN 1 ELSE 0 END AS is_current
  FROM s
)
SELECT ROUND(SUM(oi.quantity * d.fiyat)) AS o_gunku_fiyatla,
       ROUND(SUM(oi.quantity * c.fiyat)) AS guncel_fiyatla,
       COUNT(*) AS satir
FROM orders o
JOIN order_items oi ON oi.order_id = o.order_id
JOIN dim d ON d.product_id = oi.product_id
          AND o.order_date >= d.valid_from AND o.order_date < d.valid_to
JOIN dim c ON c.product_id = oi.product_id AND c.is_current = 1
WHERE o.order_date >= '2024-10-01'
  AND oi.product_id IN (SELECT product_id FROM price_updates);`)}
<p>Aynı 112 satış satırı, o günkü fiyatla 105.688 TL, güncel fiyatla 108.502 TL ediyor. Tip 1 kullansaydın geçmiş dönemin değeri sessizce 2.814 TL değişirdi.</p>
<div class="warn"><b>Aralık sınırı hatası</b>SCD 2'de aralıklar <b>yarı açık</b> olmalı: <code>valid_from &lt;= t &lt; valid_to</code>. Hem başlangıç hem bitişi dahil eden <code>BETWEEN</code> kullanırsan değişiklik anındaki olay iki satırla eşleşir ve satış iki kez sayılır.</div>
<h3>SCD 2 güncelleme adımları</h3>
<ol><li>Kaynaktaki değeri hedefteki güncel satırla karşılaştır (çok sütunda <code>hash</code> ile).</li>
<li>Değişenlerde güncel satırı kapat: <code>valid_to = değişiklik anı</code>, <code>is_current = 0</code>.</li>
<li>Yeni değerle <code>valid_to = '9999-12-31'</code>, <code>is_current = 1</code> satırı ekle.</li>
<li>Test: her anahtar için tam olarak bir güncel satır var mı, aralıklar çakışıyor mu?</li></ol>`));
X('de-scd', [
  sq('Zaman noktası sorgusu: fiyatı en az bir kez güncellenen ürünlerin <b>2024-11-15 00:00:00</b> anındaki geçerli fiyatı (başlangıç fiyatı <code>products.price</code>, geçerlilik 2000-01-01): <code>product_id</code>, <code>fiyat</code>. Ürüne göre sırala.', "WITH s AS (SELECT product_id, price AS fiyat, '2000-01-01 00:00:00' AS g FROM products UNION ALL SELECT product_id, new_price, updated_at FROM price_updates), d AS (SELECT product_id, fiyat, g AS valid_from, COALESCE(LEAD(g) OVER (PARTITION BY product_id ORDER BY g), '9999-12-31') AS valid_to FROM s) SELECT product_id, fiyat FROM d WHERE product_id IN (SELECT product_id FROM price_updates) AND '2024-11-15 00:00:00' >= valid_from AND '2024-11-15 00:00:00' < valid_to ORDER BY product_id;", Object.assign({ hint: 'Önce SCD 2 aralıklarını LEAD ile kur, sonra valid_from <= an < valid_to koşuluyla filtrele.' }, O)),
  sq('SCD Tip 3 görünümü: fiyatı güncellenen her ürün için güncel fiyat ve bir <b>önceki</b> fiyat (ilk önceki fiyat <code>products.price</code>): <code>product_id</code>, <code>onceki_fiyat</code>, <code>guncel_fiyat</code>. Ürüne göre sırala.', "WITH s AS (SELECT product_id, price AS fiyat, '2000-01-01 00:00:00' AS g FROM products UNION ALL SELECT product_id, new_price, updated_at FROM price_updates), d AS (SELECT product_id, fiyat, LAG(fiyat) OVER (PARTITION BY product_id ORDER BY g) AS onceki, ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY g DESC) AS rn FROM s) SELECT product_id, onceki AS onceki_fiyat, fiyat AS guncel_fiyat FROM d WHERE rn = 1 AND onceki IS NOT NULL ORDER BY product_id;", Object.assign({ hint: 'LAG(fiyat) önceki değeri, ROW_NUMBER() ... ORDER BY g DESC = 1 ise en son satırı verir.' }, O)),
  sq('30 numaralı ürünün SCD 2 fiyat geçmişi: <code>fiyat</code>, <code>valid_from</code>, <code>valid_to</code> (son satırda 9999-12-31). Geçerlilik başlangıcına göre sırala.', "WITH s AS (SELECT product_id, price AS fiyat, '2000-01-01 00:00:00' AS g FROM products WHERE product_id = 30 UNION ALL SELECT product_id, new_price, updated_at FROM price_updates WHERE product_id = 30) SELECT fiyat, g AS valid_from, COALESCE(LEAD(g) OVER (ORDER BY g), '9999-12-31') AS valid_to FROM s ORDER BY valid_from;", O)
]);

more('de-partition', D('bölüm budamasını gerçekten çalıştırmak', `
<p><b>Bölüm budaması</b> (partition pruning), sorgu motorunun filtreye bakarak okunması gereksiz bölümleri hiç açmamasıdır. Bulut ambarlarında taranan bayt faturalandığı için bu doğrudan para demektir: 3 yıllık olay tablosunda bir günlük sorgu, budama çalışırsa verinin yaklaşık 1/1000'ini okur.</p>
<h3>Budamayı bozan yazımlar</h3>
<p>Budama, filtre <b>bölümleme sütununun kendisi</b> üzerinde ve sabit değerlerle yazıldığında çalışır. Sütuna fonksiyon uygularsan motor çoğu durumda hangi bölümlere bakacağını çıkaramaz:</p>
${C(`-- Budama dostu değil: sütun fonksiyonun içinde
SELECT COUNT(*) AS adet, ROUND(SUM(amount)) AS toplam
FROM bank_txns
WHERE strftime('%Y-%m', txn_time) = '2024-03';

-- Budama dostu: sütun yalın, sınırlar sabit
SELECT COUNT(*) AS adet, ROUND(SUM(amount)) AS toplam
FROM bank_txns
WHERE txn_time >= '2024-03-01' AND txn_time < '2024-04-01';`)}
<p>İki sorgu da aynı sonucu (3.510 işlem) verir; ama bölümlenmiş bir tabloda ilki tüm bölümleri tarar. Aynı ilke indeksler için de geçerlidir (sargable koşul). Benzer tuzaklar: <code>CAST(tarih AS STRING) LIKE '2024%'</code>, alt sorgudan gelen dinamik tarih (bazı motorlar budayamaz), bölüm sütununu hiç filtrelememek.</p>
<h3>Bölüm büyüklüğünü seçmek</h3>
${C(`SELECT COUNT(*) AS satir,
       COUNT(DISTINCT date(txn_time)) AS gunluk_bolum,
       COUNT(DISTINCT strftime('%Y-%m', txn_time)) AS aylik_bolum,
       ROUND(1.0 * COUNT(*) / COUNT(DISTINCT date(txn_time))) AS gun_basina_satir
FROM bank_txns;`)}
<p>Ilgaz Bank'ta 2024'te 42.284 işlem var: günlük bölümlemede 366 bölüm ve bölüm başına yaklaşık 116 satır. Bu, gerçek bir ambar için <b>fazla küçük</b> bir bölümdür; her bölümün dosya ve meta veri maliyeti olduğundan çok sayıda küçük bölüm sorguyu yavaşlatır. Kural olarak bölüm başına yüzlerce MB – birkaç GB hedeflenir; küçük tablolarda aylık bölüm ya da hiç bölümlememek daha iyidir.</p>
<table><tr><th>Teknik</th><th>Ne yapar?</th><th>İyi olduğu filtre</th></tr>
<tr><td>Partition</td><td>Veriyi fiziksel parçalara böler</td><td>Tarih aralığı</td></tr>
<tr><td>Clustering / sort key</td><td>Bölüm içinde sıralı tutar, blok atlar</td><td>Yüksek kardinaliteli eşitlik (user_id)</td></tr>
<tr><td>İndeks (OLTP)</td><td>Satır konumuna hızlı erişim</td><td>Az sayıda satır döndüren arama</td></tr>
<tr><td>Materialized view</td><td>Sonucu önceden hesaplar</td><td>Sık tekrarlanan ağır toplama</td></tr></table>
<div class="tip"><b>Sıcak bölüm</b>Bölümler eşit büyüklükte olmayabilir. Ilgaz Bank'ta en kalabalık günler ay sonlarıdır (31 Aralık 201 işlem). Ay sonu raporları bu bölümlere yüklenir; kapasite planlamasında ortalamaya değil en büyük bölüme bak.</div>`));
X('de-partition', [
  sq('Ilgaz Bank: işlemler aylık bölümlere ayrılsaydı her bölümün satır sayısı ve toplam içindeki payı (%, 1 basamak): <code>ay</code>, <code>satir</code>, <code>pay</code>. Aya göre sırala.', "SELECT strftime('%Y-%m', txn_time) AS ay, COUNT(*) AS satir, ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pay FROM bank_txns GROUP BY strftime('%Y-%m', txn_time) ORDER BY ay;", Object.assign({ hint: 'Pay için SUM(COUNT(*)) OVER () ile genel toplamı aynı satırda al.' }, O)),
  sq('Bu sorgu sütuna fonksiyon uyguladığı için bölüm budamasından yararlanamaz. Aynı sonucu veren, <code>txn_time</code> sütununu yalın bırakan aralık filtresiyle yeniden yaz: <code>adet</code>, <code>toplam</code> (tam sayı).', "SELECT COUNT(*) AS adet, ROUND(SUM(amount)) AS toplam FROM bank_txns WHERE txn_time >= '2024-03-01' AND txn_time < '2024-04-01';", { start: "SELECT COUNT(*) AS adet, ROUND(SUM(amount)) AS toplam\nFROM bank_txns\nWHERE strftime('%Y', txn_time) = '2024' AND strftime('%m', txn_time) = '03';", hint: "txn_time >= '2024-03-01' AND txn_time < '2024-04-01'" }),
  sq('Sıcak bölümler: günlük bölümleme yapılsaydı en çok satır içeren 5 gün: <code>gun</code>, <code>satir</code>. Satıra göre azalan, eşitlikte güne göre sırala.', 'SELECT date(txn_time) AS gun, COUNT(*) AS satir FROM bank_txns GROUP BY date(txn_time) ORDER BY satir DESC, gun LIMIT 5;', O)
]);

/* ======================= GENEL ======================= */

more('sik-hatalar', D('tarih aralığı, NOT IN ve AND/OR tuzakları', `
<p>Aşağıdaki üç hata, sorgu hiç hata vermediği için en uzun süre fark edilmeyenlerdir. Üçü de Lezzet Kurye verisinde gerçek sayı farkı yaratıyor.</p>
<h3>1. BETWEEN ve saatli tarih</h3>
<p><code>placed_at</code> saat içerir. <code>BETWEEN '2024-12-01' AND '2024-12-31'</code> üst sınırı <code>2024-12-31 00:00:00</code> olarak yorumlar ve 31 Aralık'ın neredeyse tamamını dışarıda bırakır:</p>
${C(`SELECT
  (SELECT COUNT(*) FROM lk_orders
   WHERE placed_at BETWEEN '2024-12-01' AND '2024-12-31') AS between_ile,
  (SELECT COUNT(*) FROM lk_orders
   WHERE placed_at >= '2024-12-01' AND placed_at < '2025-01-01') AS aralik_ile;`)}
<p>Fark 74 sipariş: tam olarak 31 Aralık'ın siparişleri. Kural: tarih aralıklarını her zaman <b>yarı açık</b> yaz (<code>&gt;= başlangıç AND &lt; bitişten sonraki gün</code>).</p>
<h3>2. NOT IN ve alt sorgudaki NULL</h3>
<p>İptal edilen siparişlerin bir kısmında kurye atanmamış (<code>courier_id</code> NULL). “Hiç iptal siparişi olmayan kuryeler” sorusu NOT IN ile sorulursa:</p>
${C(`SELECT
  (SELECT COUNT(*) FROM lk_couriers
   WHERE courier_id NOT IN (SELECT courier_id FROM lk_orders WHERE status = 'iptal')) AS not_in_ile,
  (SELECT COUNT(*) FROM lk_couriers c
   WHERE NOT EXISTS (SELECT 1 FROM lk_orders o
                     WHERE o.courier_id = c.courier_id AND o.status = 'iptal')) AS not_exists_ile;`)}
<p>NOT IN 0 döndürür, doğru cevap 6'dır. Listede bir NULL varsa <code>x NOT IN (…, NULL)</code> hiçbir zaman TRUE olamaz (sonuç UNKNOWN), bu yüzden hiçbir satır geçmez.</p>
<h3>3. AND, OR'dan önce gelir</h3>
<p><code>WHERE status = 'iptal' AND payment = 'nakit' OR payment = 'cüzdan'</code>, motor tarafından <code>(status = 'iptal' AND payment = 'nakit') OR payment = 'cüzdan'</code> olarak okunur ve durumu ne olursa olsun tüm cüzdan siparişlerini getirir: 130 yerine 1.487 satır. OR içeren her koşulu parantezle.</p>
<h3>4. AVG ve NULL</h3>
<p>Lezzet Kurye'de 60 kuryenin 59'unun puanı var. <code>AVG(rating)</code> NULL'u atlayıp 4,22 verir; <code>AVG(COALESCE(rating, 0))</code> ise puansız kuryeyi 0 sayıp ortalamayı 4,14'e düşürür. Hangisinin doğru olduğu sorunun tanımına bağlıdır, ama sessizce değişmemelidir.</p>
<table><tr><th>Tuzak</th><th>Kontrol sorusu</th></tr>
<tr><td>BETWEEN + saat</td><td>Sütun saat içeriyor mu? Son günün kayıtları geliyor mu?</td></tr>
<tr><td>NOT IN + NULL</td><td>Alt sorgunun sütununda NULL olabilir mi?</td></tr>
<tr><td>AND/OR</td><td>OR'un iki yanı parantez içinde mi?</td></tr>
<tr><td><code>AVG</code> + NULL</td><td>NULL'lar hesaba katılmalı mı? (<code>AVG</code> onları atlar)</td></tr></table>`));
X('sik-hatalar', [
  sq('Bu sorgu hiç iptal siparişi olmayan kuryeleri saymalı ama 0 döndürüyor; çünkü iptal siparişlerin bir kısmında <code>courier_id</code> NULL. NOT EXISTS ile düzelt: <code>kurye</code>.', "SELECT COUNT(*) AS kurye FROM lk_couriers c WHERE NOT EXISTS (SELECT 1 FROM lk_orders o WHERE o.courier_id = c.courier_id AND o.status = 'iptal');", { start: "SELECT COUNT(*) AS kurye\nFROM lk_couriers\nWHERE courier_id NOT IN (SELECT courier_id FROM lk_orders WHERE status = 'iptal');", hint: 'Ya NOT EXISTS kullan ya da alt sorguya WHERE courier_id IS NOT NULL ekle.' }),
  sq('Bu sorgu <b>nakit veya cüzdanla</b> ödenmiş <b>iptal</b> siparişlerini saymalı ama 1.487 buluyor. Operatör önceliğini düzelt: <code>adet</code>.', "SELECT COUNT(*) AS adet FROM lk_orders WHERE status = 'iptal' AND (payment = 'nakit' OR payment = 'cüzdan');", { start: "SELECT COUNT(*) AS adet\nFROM lk_orders\nWHERE status = 'iptal' AND payment = 'nakit' OR payment = 'cüzdan';", hint: 'AND, OR\'dan önce değerlendirilir; OR\'u parantez içine al (ya da IN kullan).' })
]);

more('alter-drop', D('canlı tabloda güvenli şema değişikliği', `
<p>Geliştirme ortamında <code>ALTER TABLE</code> bir satırdır; üretimde ise uygulama kodu, raporlar ve veri hatları o tabloya aynı anda bağlıdır. Bu yüzden şema değişiklikleri <b>geriye uyumlu</b> küçük adımlarla yapılır. Yaygın yönteme <b>genişlet–daralt</b> (expand–contract) denir:</p>
<ol><li><b>Genişlet:</b> Yeni sütunu ekle (eski kod onu görmezden gelir, bir şey bozulmaz).</li>
<li><b>Doldur:</b> Mevcut satırlar için değeri hesapla (backfill); büyük tablolarda parça parça.</li>
<li><b>Geçir:</b> Uygulama ve raporları yeni sütuna geçir.</li>
<li><b>Daralt:</b> Artık kullanılmayan eski sütunu kaldır.</li></ol>
${C(`ALTER TABLE customers ADD COLUMN is_vip INTEGER DEFAULT 0 NOT NULL;
UPDATE customers SET is_vip = 1 WHERE segment = 'Premium';
SELECT is_vip, COUNT(*) AS musteri FROM customers GROUP BY is_vip ORDER BY is_vip;`)}
<p>Varsayılanlı ve NOT NULL bir sütun eklemek mevcut satırları varsayılanla doldurur (burada 150 müşterinin 117'si 0, Premium olan 33'ü güncellemeyle 1). Bazı eski sürümlerde bu işlem tüm tabloyu yeniden yazar ve uzun süre kilit tutar; büyük tablolarda önce NULL'a izin veren sütun ekleyip parça parça doldurmak daha güvenlidir.</p>
<h3>DELETE, TRUNCATE, DROP: ayrıntılar</h3>
<table><tr><th></th><th>DELETE</th><th>TRUNCATE</th><th>DROP</th></tr>
<tr><td>WHERE</td><td>Var</td><td>Yok</td><td>Yok</td></tr>
<tr><td>Yapı</td><td>Kalır</td><td>Kalır</td><td>Kalkar (indeks, izinler dahil)</td></tr>
<tr><td>Hız</td><td>Satır satır, günlüğe yazar</td><td>Çok hızlı (sayfaları bırakır)</td><td>Çok hızlı</td></tr>
<tr><td>IDENTITY / sıra</td><td>Devam eder</td><td>Başa döner (SQL Server, MySQL)</td><td>—</td></tr>
<tr><td>Trigger</td><td>Tetiklenir</td><td>Tetiklenmez</td><td>—</td></tr>
<tr><td>Geri alma</td><td>İşlem içinde mümkün</td><td>SQL Server ve PostgreSQL'de işlem içinde mümkün; MySQL ve Oracle'da hayır</td><td>Oracle'da Flashback/geri dönüşüm kutusu dışında hayır</td></tr></table>
<div class="warn"><b>Bağımlılıkları unutma</b>Sütun veya tablo kaldırmadan önce ona bakan görünümleri, yabancı anahtarları, saklı yordamları ve rapor sorgularını bul. SQL Server'da <code>sys.sql_expression_dependencies</code>, PostgreSQL'de <code>DROP ... RESTRICT</code> (varsayılan) bağımlı nesne varsa işlemi reddeder; <code>CASCADE</code> ise bağımlıları da sessizce siler.</div>
<p><b>Kontrol listesi:</b> Değişiklik bir migration dosyasında mı? Geri alma (down) adımı yazıldı mı? Önce test ortamında, üretim boyutunda veriyle denendi mi? Kilit süresi ölçüldü mü?</p>`));
X('alter-drop', [
  sq('<code>products</code> tablosuna <code>kar_marji</code> adında <code>DECIMAL(10,2)</code> bir sütun ekle ve her ürün için <code>price - cost</code> değeriyle doldur.', 'ALTER TABLE products ADD COLUMN kar_marji DECIMAL(10,2); UPDATE products SET kar_marji = price - cost;', { check: 'SELECT product_id, kar_marji FROM products ORDER BY product_id', hint: 'İki ifade: ALTER TABLE ... ADD (SQL Server ve Oracle\'da COLUMN yazılmaz) ve ardından WHERE\'siz bir UPDATE.' }),
  sq('Genişlet–daralt adımının “daralt” kısmı: <code>raw_signups</code> tablosundan artık kullanılmayan <code>city</code> sütununu kaldır.', 'ALTER TABLE raw_signups DROP COLUMN city;', { check: "SELECT name FROM pragma_table_info('raw_signups') ORDER BY cid", dl: ['sqlite', 'pg', 'mysql', 'oracle', 'bq'], hint: 'ALTER TABLE tablo DROP COLUMN sütun;' }),
  sq('<code>raw_signups</code> tablosunun yapısını koruyarak <b>tüm satırlarını</b> sil (bu uygulamadaki her SQL türünde çalışan yolla).', 'DELETE FROM raw_signups;', { check: "SELECT COUNT(*) AS satir, (SELECT COUNT(*) FROM sqlite_master WHERE name = 'raw_signups') AS tablo FROM raw_signups", hint: 'TRUNCATE SQLite\'ta yok; WHERE\'siz DELETE her yerde çalışır ve tabloyu korur.' })
]);

more('json', D('JSON ile çalışırken SQL türleri arası farklar', `
<p>JSON fonksiyonlarının adları SQL türüne göre değişir, ama asıl farklar daha derindedir: <b>saklama tipi</b>, <b>dönen değerin tipi</b> ve <b>dizileri satırlara açma</b> yöntemi.</p>
<table><tr><th>SQL türü</th><th>Saklama</th><th>Not</th></tr>
<tr><td>PostgreSQL</td><td><code>json</code> (metin olarak) ve <code>jsonb</code> (ikili, indekslenebilir)</td><td>Analitik için <code>jsonb</code> + GIN indeks</td></tr>
<tr><td>MySQL</td><td><code>JSON</code> tipi (doğrulanır, ikili saklanır)</td><td>Üretilmiş (generated) sütunla indekslenir</td></tr>
<tr><td>SQL Server</td><td>Ayrı tip yok (2025 öncesi): <code>NVARCHAR(MAX)</code></td><td><code>ISJSON()</code> ile CHECK kısıtı ekle</td></tr>
<tr><td>Oracle</td><td><code>JSON</code> (21c+), öncesinde <code>CLOB</code> + <code>IS JSON</code></td><td>Nokta yazımı: <code>t.j.user.city</code></td></tr>
<tr><td>BigQuery</td><td><code>JSON</code> tipi ya da <code>STRING</code></td><td><code>JSON_VALUE</code>, <code>JSON_QUERY_ARRAY</code></td></tr>
<tr><td>SQLite</td><td>Metin</td><td><code>json_extract</code> sayıyı sayı olarak döndürür</td></tr></table>
<h3>Dönen tip tuzağı</h3>
<p>PostgreSQL'de <code>-&gt;&gt;</code>, SQL Server ve Oracle'da <code>JSON_VALUE</code> her zaman <b>metin</b> döndürür. <code>'9' &gt; '10'</code> metin karşılaştırmasında doğrudur; sıralama ve filtrede sayısal alanı mutlaka <code>CAST</code> et:</p>
${C(`WITH t AS (
  SELECT restaurant_id,
         json_object('ad', name, 'sehir', city, 'komisyon', commission_pct) AS j
  FROM lk_restaurants
)
SELECT json_extract(j, '$.sehir') AS sehir, COUNT(*) AS restoran
FROM t
WHERE CAST(json_extract(j, '$.komisyon') AS REAL) >= 20
GROUP BY json_extract(j, '$.sehir')
ORDER BY sehir;`)}
<h3>Diziyi satırlara açmak</h3>
<p>Olay verisinde etiketler çoğu zaman bir dizi olarak gelir. Etiket başına sayım için dizi satırlara açılır: SQLite'ta <code>json_each</code>, SQL Server'da <code>CROSS APPLY OPENJSON</code>.</p>
${CA('data-v="' + A(JSON.stringify({ tsql: `WITH olaylar AS (
  SELECT * FROM (VALUES
    (1, N'{"user": 7, "etiketler": ["indirim", "mobil"]}'),
    (2, N'{"user": 9, "etiketler": ["mobil"]}'),
    (3, N'{"user": 7, "etiketler": []}')
  ) AS v(id, payload)
)
SELECT j.value AS etiket, COUNT(*) AS olay
FROM olaylar o
CROSS APPLY OPENJSON(o.payload, '$.etiketler') AS j
GROUP BY j.value
ORDER BY olay DESC, etiket;` })) + '" data-na="pg mysql oracle bq"', `WITH olaylar(id, payload) AS (
  VALUES (1, '{"user": 7, "etiketler": ["indirim", "mobil"]}'),
         (2, '{"user": 9, "etiketler": ["mobil"]}'),
         (3, '{"user": 7, "etiketler": []}')
)
SELECT j.value AS etiket, COUNT(*) AS olay
FROM olaylar o, json_each(json_extract(o.payload, '$.etiketler')) j
GROUP BY j.value
ORDER BY olay DESC, etiket;`)}
${NR(`-- PostgreSQL
SELECT e.etiket, COUNT(*) FROM olaylar o
CROSS JOIN LATERAL jsonb_array_elements_text(o.payload -> 'etiketler') AS e(etiket)
GROUP BY e.etiket;

-- MySQL 8 / Oracle
SELECT jt.etiket, COUNT(*) FROM olaylar o,
JSON_TABLE(o.payload, '$.etiketler[*]' COLUMNS (etiket VARCHAR(50) PATH '$')) jt
GROUP BY jt.etiket;`)}
<p>Boş dizili 3 numaralı olay sonuçta görünmez; çünkü açılacak eleman yoktur (iç birleştirme gibi davranır). “Etiketsiz olay” sayısı da gerekiyorsa ayrıca hesapla ya da LEFT JOIN LATERAL / OUTER APPLY kullan.</p>
<p><b>Performans:</b> JSON içindeki bir alana göre sık filtreleme yapılıyorsa her satırda metni yeniden ayrıştırmak pahalıdır. PostgreSQL'de <code>jsonb</code> sütununa GIN indeks, MySQL'de alanı üretilmiş sütuna çıkarıp indeksleme (<code>ALTER TABLE t ADD sehir VARCHAR(50) AS (j-&gt;&gt;'$.sehir'), ADD INDEX (sehir)</code>), SQL Server'da hesaplanmış sütun + indeks kullanılır.</p>
<div class="tip"><b>Ne zaman JSON, ne zaman sütun?</b>Sık filtrelenen, raporlanan veya birleştirilen alanları gerçek sütunlara çıkar. JSON'u gerçekten esnek, seyrek ve kaynağa göre değişen nitelikler için bırak.</div>`));
X('json', [
  sq('Her Lezzet Kurye restoranı için <code>{"ad": ..., "mutfak": ..., "komisyon": ...}</code> biçiminde bir JSON nesnesi üret (CTE), sonra JSON\'dan <code>mutfak</code> alanını okuyarak mutfak başına restoran sayısını getir: <code>mutfak</code>, <code>restoran</code>. Sayıya göre azalan, eşitlikte mutfağa göre sırala.', "WITH t AS (SELECT restaurant_id, json_object('ad', name, 'mutfak', cuisine, 'komisyon', commission_pct) AS j FROM lk_restaurants) SELECT json_extract(j, '$.mutfak') AS mutfak, COUNT(*) AS restoran FROM t GROUP BY json_extract(j, '$.mutfak') ORDER BY restoran DESC, mutfak;", Object.assign({ hint: "Alanı okumak: SQLite json_extract(j, '$.mutfak'), SQL Server/Oracle JSON_VALUE, PostgreSQL j->>'mutfak'." }, O)),
  sq('Aynı JSON\'dan komisyonu <b>sayıya çevirerek</b> (<code>CAST(... AS REAL)</code>) filtrele: komisyonu 20 ve üzeri olan restoranların şehir başına sayısı. JSON\'a <code>sehir</code> alanını koy: <code>sehir</code>, <code>restoran</code>. Şehre göre sırala.', "WITH t AS (SELECT restaurant_id, json_object('ad', name, 'sehir', city, 'komisyon', commission_pct) AS j FROM lk_restaurants) SELECT json_extract(j, '$.sehir') AS sehir, COUNT(*) AS restoran FROM t WHERE CAST(json_extract(j, '$.komisyon') AS REAL) >= 20 GROUP BY json_extract(j, '$.sehir') ORDER BY sehir;", Object.assign({ hint: 'JSON\'dan okunan değer birçok SQL türünde metindir; sayısal karşılaştırmadan önce CAST et.' }, O))
]);

more('mulakat-1', D('klasik soruların tuzakları', `
<p>Mülakatçı “ikinci en yüksek maaş” sorusunda aslında şunu ölçer: Eşitlikleri, NULL'ları ve boş sonucu düşünüyor musun? Aynı sorunun üç yaygın çözümü eşitlik olduğunda üç farklı cevap verir. Lezzet Kurye restoranlarının komisyon oranlarında 5 restoran %22, 6 restoran %20, 6 restoran %18:</p>
${C(`WITH r AS (
  SELECT commission_pct,
         ROW_NUMBER() OVER (ORDER BY commission_pct DESC, restaurant_id) AS rn,
         RANK()       OVER (ORDER BY commission_pct DESC) AS rk,
         DENSE_RANK() OVER (ORDER BY commission_pct DESC) AS dr
  FROM lk_restaurants
)
SELECT (SELECT commission_pct FROM r WHERE rn = 3)      AS row_number_3,
       (SELECT MIN(commission_pct) FROM r WHERE rk = 3) AS rank_3,
       (SELECT MIN(commission_pct) FROM r WHERE dr = 3) AS dense_rank_3;`)}
<p>“3. en yüksek <b>farklı</b> oran” 18'dir ve yalnızca DENSE_RANK bunu verir. ROW_NUMBER yine 22 döndürür (3. satır), RANK ise NULL (sıralar 1, 6, 12 diye atladığı için 3 yok). Soruyu netleştirmek (“farklı değer mi, satır mı?”) puan kazandırır.</p>
<h3>Sık çıkan kalıplar</h3>
<table><tr><th>Soru</th><th>Kalıp</th><th>Kenar durum</th></tr>
<tr><td>N. en yüksek değer</td><td><code>DENSE_RANK</code> veya <code>DISTINCT ... OFFSET N-1</code></td><td>Eşitlik, N'den az farklı değer</td></tr>
<tr><td>Ardışık günler (gaps &amp; islands)</td><td><code>tarih − ROW_NUMBER()</code> sabit kalan gruplar</td><td>Aynı gün birden çok kayıt: önce DISTINCT</td></tr>
<tr><td>Yöneticisinden fazla kazanan</td><td>Kendine JOIN</td><td>Yöneticisi olmayan (NULL) kişi</td></tr>
<tr><td>Grup başına ilk N</td><td><code>ROW_NUMBER</code> / <code>RANK</code> + filtre</td><td>Eşitlikte kaç satır istendiği</td></tr>
<tr><td>Yıldan yıla büyüme</td><td><code>LAG</code></td><td>Önceki dönem 0 veya yok</td></tr></table>
<h3>Gaps &amp; islands nasıl çalışır?</h3>
<p>Bir müşterinin sipariş verdiği günleri sırala ve her güne sıra numarası ver. Ardışık günlerde hem tarih hem sıra birer artar, yani <code>gün − sıra</code> farkı sabit kalır; bu sabit, “ada” kimliğidir. Lezzet Kurye'de 19 müşteri en az 3 gün üst üste sipariş vermiş:</p>
${C(`WITH g AS (
  SELECT DISTINCT customer_id, date(placed_at) AS gun FROM lk_orders
),
a AS (
  SELECT customer_id, gun,
         julianday(gun) - julianday('2024-01-01')
           - ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY gun) AS ada
  FROM g
),
s AS (
  SELECT customer_id, ada, COUNT(*) AS seri FROM a GROUP BY customer_id, ada
)
SELECT COUNT(DISTINCT customer_id) AS musteri, MAX(seri) AS en_uzun_seri
FROM s WHERE seri >= 3;`)}
<div class="tip"><b>Mülakatta sırayla</b>1) Tanecik ve tanımları sor. 2) Küçük bir örnek üzerinde beklenen sonucu söyle. 3) Önce okunaklı bir CTE çözümü yaz. 4) Kenar durumları (NULL, eşitlik, boş grup) say. 5) Büyük veride performansı (indeks, pencere fonksiyonu maliyeti) konuş.</div>`));
X('mulakat-1', [
  sq('Gaps &amp; islands: Lezzet Kurye\'de en az <b>3 gün üst üste</b> sipariş vermiş müşteri sayısı. Önce müşteri–gün çiftlerini tekilleştir, sonra <code>julianday(gun) - julianday(\'2024-01-01\') - ROW_NUMBER()</code> ile ada kimliği üret: <code>musteri</code>.', "WITH g AS (SELECT DISTINCT customer_id, date(placed_at) AS gun FROM lk_orders), a AS (SELECT customer_id, gun, julianday(gun) - julianday('2024-01-01') - ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY gun) AS ada FROM g), s AS (SELECT customer_id, ada, COUNT(*) AS seri FROM a GROUP BY customer_id, ada) SELECT COUNT(DISTINCT customer_id) AS musteri FROM s WHERE seri >= 3;", { hint: 'Ardışık günlerde gün ve sıra numarası birlikte artar; farkları sabit kalır.' }),
  sq('Pusula İK: güncel aylık brütü, kendi yöneticisinin güncel aylık brütünden <b>yüksek</b> olan aktif çalışan sayısı (yönetici de aktif olmalı; güncel maaş = en son <code>effective_date</code>): <code>kisi</code>.', 'WITH c AS (SELECT s.emp_id, s.monthly_gross FROM ik_salaries s WHERE s.effective_date = (SELECT MAX(x.effective_date) FROM ik_salaries x WHERE x.emp_id = s.emp_id)) SELECT COUNT(*) AS kisi FROM ik_employees e JOIN ik_employees m ON m.emp_id = e.manager_id JOIN c ce ON ce.emp_id = e.emp_id JOIN c cm ON cm.emp_id = m.emp_id WHERE e.term_date IS NULL AND m.term_date IS NULL AND ce.monthly_gross > cm.monthly_gross;', { hint: 'Önce güncel maaşları bir CTE\'de hazırla; sonra çalışanı yöneticisiyle (kendine JOIN) ve her ikisini maaş CTE\'siyle birleştir.' })
]);

/* ======================= VAKALAR ======================= */

more('vaka-yilsonu', D('raporu kurula sunmadan önce', `
<p>Yönetim kuruluna giden bir sayının yanlış çıkması, analizin geri kalanına olan güveni de yok eder. Bu yüzden deneyimli analist, rapor sorgularını yazdıktan sonra üç iş daha yapar: <b>tanımları sabitler</b>, <b>sağlama yapar</b> ve <b>karşılaştırma bağlamı ekler</b>.</p>
<h3>1. Tanımları sabitle</h3>
<ul><li><b>Hangi tarih?</b> Sipariş tarihi mi, teslim tarihi mi? Aralık sonunda verilip Ocak'ta teslim edilen sipariş hangi yıla yazılır? Bu vakada sipariş tarihi esas.</li>
<li><b>Hangi durum?</b> Yalnızca teslim edilenler; iade ve iptaller ciroya girmez.</li>
<li><b>Hangi tutar?</b> İndirim sonrası net tutar; KDV ve kargo yok.</li></ul>
<h3>2. Sağlama</h3>
<p>Aylık ciroların toplamı yıllık ciroya eşit olmalı. Eşit değilse ya ay dışında kalan kayıtlar var ya da bir JOIN satırları çoğaltıyor:</p>
${C(`WITH t AS (
  SELECT strftime('%m', o.order_date) AS ay,
         oi.quantity * oi.unit_price * (1 - oi.discount) AS tutar
  FROM orders o JOIN order_items oi ON oi.order_id = o.order_id
  WHERE o.status = 'delivered' AND o.order_date >= '2024-01-01' AND o.order_date < '2025-01-01'
),
aylik AS (SELECT ay, SUM(tutar) AS ciro FROM t GROUP BY ay)
SELECT (SELECT ROUND(SUM(tutar)) FROM t) AS yillik,
       (SELECT ROUND(SUM(ciro)) FROM aylik) AS aylik_toplam,
       (SELECT COUNT(*) FROM aylik) AS ay_sayisi;`)}
<h3>3. Karşılaştırma bağlamı</h3>
<p>“2024 cirosu 636 bin TL” tek başına iyi mi kötü mü söylemez. Bir önceki yılla ay ay yan yana koymak kurulun ilk soracağı soruyu baştan yanıtlar:</p>
${C(`WITH a AS (
  SELECT strftime('%m', o.order_date) AS ay, strftime('%Y', o.order_date) AS yil,
         oi.quantity * oi.unit_price * (1 - oi.discount) AS tutar
  FROM orders o JOIN order_items oi ON oi.order_id = o.order_id
  WHERE o.status = 'delivered' AND o.order_date >= '2023-01-01' AND o.order_date < '2025-01-01'
)
SELECT ay,
       ROUND(SUM(CASE WHEN yil = '2023' THEN tutar ELSE 0 END)) AS y2023,
       ROUND(SUM(CASE WHEN yil = '2024' THEN tutar ELSE 0 END)) AS y2024
FROM a
GROUP BY ay
ORDER BY ay;`)}
<p>Net ciro 2023'te 335.573 TL, 2024'te 636.316 TL: yaklaşık %89,6 büyüme. Büyümenin müşteri sayısından mı, sepet tutarından mı geldiğini ayırmak bir sonraki doğal sorudur.</p>
<div class="warn"><b>Kârlılıkta tarihçe tuzağı</b>Brüt kârı <code>products.cost</code> ile hesaplarsan bugünkü maliyeti geçmiş satışlara uygularsın. Maliyet zamanla değiştiyse doğru yöntem, maliyetin de bir SCD 2 tablosunda tutulup satış anındaki değerle birleştirilmesidir. Raporda bu varsayımı açıkça yaz.</div>
<p><b>Sunum kontrol listesi:</b> her sayının tanımı dipnotta mı, toplamlar sağlandı mı, yüzdeler %100 ediyor mu, önceki dönemle karşılaştırma var mı, tek seferlik etkiler (büyük kurumsal sipariş, kampanya) not edildi mi?</p>`));
X('vaka-yilsonu', [
  sq('<b>6. Büyüme:</b> Teslim edilen siparişlerin 2023 ve 2024 net cirosu (tam sayı) ve 2024\'ün 2023\'e göre büyümesi (%, 1 basamak): <code>ciro_2023</code>, <code>ciro_2024</code>, <code>buyume</code>.', `WITH y AS (SELECT strftime('%Y', o.order_date) AS yil, SUM(${NET}) AS ciro FROM orders o JOIN order_items oi ON oi.order_id = o.order_id WHERE o.status = 'delivered' AND o.order_date >= '2023-01-01' AND o.order_date < '2025-01-01' GROUP BY strftime('%Y', o.order_date)) SELECT ROUND(MAX(CASE WHEN yil = '2023' THEN ciro END)) AS ciro_2023, ROUND(MAX(CASE WHEN yil = '2024' THEN ciro END)) AS ciro_2024, ROUND(100.0 * (MAX(CASE WHEN yil = '2024' THEN ciro END) - MAX(CASE WHEN yil = '2023' THEN ciro END)) / MAX(CASE WHEN yil = '2023' THEN ciro END), 1) AS buyume FROM y;`, { hint: 'Önce yıl başına ciroyu hesapla, sonra MAX(CASE WHEN yil = ... THEN ciro END) ile iki yılı tek satıra çevir.' }),
  sq('<b>7. Kârlılık:</b> 2024\'te teslim edilen siparişlerde kategori bazında net ciro, brüt kâr (<code>adet × (net birim fiyat − products.cost)</code>) ve marj (%, 1 basamak): <code>category</code>, <code>ciro</code>, <code>brut_kar</code> (tam sayı), <code>marj</code>. Brüt kâra göre azalan, eşitlikte kategoriye göre sırala.', `SELECT p.category, ROUND(SUM(${NET})) AS ciro, ROUND(SUM(oi.quantity * (oi.unit_price * (1 - oi.discount) - p.cost))) AS brut_kar, ROUND(100.0 * SUM(oi.quantity * (oi.unit_price * (1 - oi.discount) - p.cost)) / SUM(${NET}), 1) AS marj FROM orders o JOIN order_items oi ON oi.order_id = o.order_id JOIN products p ON p.product_id = oi.product_id WHERE o.status = 'delivered' AND o.order_date >= '2024-01-01' AND o.order_date < '2025-01-01' GROUP BY p.category ORDER BY brut_kar DESC, p.category;`, Object.assign({ why: 'Not: products.cost bugünkü maliyettir; geçmiş maliyet değiştiyse marj yaklaşık bir değerdir.' }, O))
]);

more('vaka-kayip', D('kayıp tanımı ve kampanyanın ölçülmesi', `
<p>“180 gün sipariş vermeyen kayıptır” bir <b>karar</b>, bir gerçek değil. Eşik değiştikçe kaybın büyüklüğü de değişir ve pazarlamanın bütçesi bu sayıya göre ayrılır. Bu yüzden raporda eşiğin duyarlılığı gösterilir:</p>
${C(`WITH m AS (
  SELECT customer_id, julianday('2024-12-31') - julianday(MAX(order_date)) AS gun
  FROM orders
  GROUP BY customer_id
)
SELECT SUM(CASE WHEN gun > 90  THEN 1 ELSE 0 END) AS esik_90,
       SUM(CASE WHEN gun > 180 THEN 1 ELSE 0 END) AS esik_180,
       SUM(CASE WHEN gun > 365 THEN 1 ELSE 0 END) AS esik_365,
       COUNT(*) AS musteri
FROM m;`)}
<p>Sipariş vermiş 136 müşteriden kayıp sayısı eşiğe göre 42, 25 ya da 13. Eşik, ürünün doğal satın alma sıklığına göre seçilmeli: her hafta alınan bir üründe 90 gün uzun, yılda bir alınan bir üründe kısa.</p>
<h3>Kişisel ritim</h3>
<p>Sabit eşik yerine her müşterinin kendi alışkanlığına bakılabilir: ortalama sipariş aralığının 3 katından uzun süredir sessiz olan müşteri “ritmini kaybetmiş”tir. En az 3 siparişi olan 111 müşteride bu kural 16, 180 günlük sabit eşik 19 müşteri işaretliyor. Aradaki 3 kişi, ortalama sipariş aralığı zaten 60 günü aşan seyrek müşteriler: sabit eşik onları kayıp sayıyor, oysa kendi ritimlerinin içindeler. Tersi de olabilir: sık alışveriş yapan biri 60 gün susarsa ritim kuralı onu 180 günü beklemeden yakalar (bu veride böyle bir müşteri yok).</p>
<h3>Kampanyanın etkisini ölçmek</h3>
<p>Geri kazanım kampanyasından sonra “kayıpların %30'u geri döndü” demek etkiyi kanıtlamaz; bir kısmı kampanya olmadan da dönecekti. Etkiyi ölçmek için kayıp listesinden rastgele bir <b>kontrol grubu</b> (holdout) ayrılır ve kampanya ona gönderilmez. Etki = kampanya grubunun geri dönüş oranı − kontrol grubunun geri dönüş oranı.</p>
${C(`WITH k AS (
  SELECT customer_id FROM orders
  GROUP BY customer_id
  HAVING julianday('2024-12-31') - julianday(MAX(order_date)) > 180
)
SELECT CASE WHEN customer_id % 10 = 0 THEN 'kontrol' ELSE 'kampanya' END AS grup,
       COUNT(*) AS musteri
FROM k
GROUP BY CASE WHEN customer_id % 10 = 0 THEN 'kontrol' ELSE 'kampanya' END;`)}
<div class="warn"><b>Örneklem çok küçük</b>25 kayıp müşteriden kontrol grubuna yalnızca 3 kişi düşüyor. Bu büyüklükte bir deneyden anlamlı bir fark çıkmaz. Gerçek bir analizde ya daha uzun bir dönem ve daha geniş müşteri tabanı kullanılır ya da sonuç “yönlendirici” diye raporlanır.</div>
<table><tr><th>Karar</th><th>Seçenekler</th></tr>
<tr><td>Kayıp tanımı</td><td>Sabit eşik, kişisel ritim, abonelik iptali</td></tr>
<tr><td>Önceliklendirme</td><td>Geçmiş değer, kazanılma olasılığı, ikisinin çarpımı</td></tr>
<tr><td>Ölçüm</td><td>Kontrol grubu, kampanya öncesi/sonrası (zayıf), farkların farkı</td></tr></table>`));
X('vaka-kayip', [
  sq('<b>6. Kişisel ritim:</b> En az 3 siparişi olan müşterilerde ortalama sipariş aralığı = (ilk ve son sipariş arası gün) / (sipariş − 1). 2024-12-31 itibarıyla sessiz kaldığı gün, ortalama aralığının <b>3 katından</b> fazla olanları say; aynı grupta 180 gün eşiğini aşanları da say: <code>musteri</code>, <code>ritim_disi</code>, <code>sabit_esik</code>.', "WITH m AS (SELECT customer_id, COUNT(*) AS siparis, julianday(MAX(order_date)) - julianday(MIN(order_date)) AS omur, julianday('2024-12-31') - julianday(MAX(order_date)) AS sessiz FROM orders GROUP BY customer_id HAVING COUNT(*) >= 3) SELECT COUNT(*) AS musteri, SUM(CASE WHEN sessiz > 3 * omur / (siparis - 1) THEN 1 ELSE 0 END) AS ritim_disi, SUM(CASE WHEN sessiz > 180 THEN 1 ELSE 0 END) AS sabit_esik FROM m;", { hint: 'Müşteri başına sipariş sayısı, ömür (son − ilk) ve sessizlik (referans − son) hesapla; HAVING COUNT(*) >= 3.' }),
  sq('<b>7. Sessizlik süresi:</b> Kayıp müşterileri (son sipariş 180 günden eski) ne kadar süredir sessiz olduklarına göre grupla: <b>181-270 gün</b>, <b>271-365 gün</b>, <b>365+ gün</b>: <code>grup</code>, <code>musteri</code>. Gruba göre sırala.', "WITH m AS (SELECT customer_id, julianday('2024-12-31') - julianday(MAX(order_date)) AS gun FROM orders GROUP BY customer_id) SELECT CASE WHEN gun <= 270 THEN '181-270 gün' WHEN gun <= 365 THEN '271-365 gün' ELSE '365+ gün' END AS grup, COUNT(*) AS musteri FROM m WHERE gun > 180 GROUP BY CASE WHEN gun <= 270 THEN '181-270 gün' WHEN gun <= 365 THEN '271-365 gün' ELSE '365+ gün' END ORDER BY grup;", Object.assign({ why: 'Yakın zamanda kaybedilen müşteriler genellikle daha kolay geri kazanılır; kampanya önceliği bu gruptan başlar.' }, O))
]);

/* ======================= T-SQL ve SQL türlerine özgü ======================= */

more('ts-top', D('TOP\'u doğru kullanmak ve sayfalama', `
<p>TOP basit görünür ama üç inceliği vardır: <b>belirlilik</b>, <b>değişkenle kullanım</b> ve <b>büyük tablolarda sayfalama</b>.</p>
<h3>Belirlilik</h3>
<p>ORDER BY olmadan TOP “ilk N”i değil, motorun o an en kolay bulduğu N satırı verir; aynı sorgu yarın farklı satırlar döndürebilir. ORDER BY sütunu benzersiz değilse aynı sorun eşitliklerde yaşanır. Ya eşitlik bozucu ekle (<code>ORDER BY commission_pct DESC, restaurant_id</code>) ya da eşitleri bilerek dahil et (<code>WITH TIES</code>).</p>
<h3>Değişkenle TOP</h3>
<p>Satır sayısı değişkenden geliyorsa parantez zorunludur: <code>TOP (@n)</code>. Lezzet Kurye'de en yüksek komisyonlu 3 restoranı isteyelim:</p>
${TS(`DECLARE @n INT = 3;

SELECT TOP (@n) WITH TIES name, commission_pct
FROM lk_restaurants
ORDER BY commission_pct DESC;`)}
<p>Sonuç 3 değil 5 satırdır: beş restoranın komisyonu %22. “İlk 3” istenirken 5 satır gelmesi iş açısından doğru olabilir (ödül listesi) ya da yanlış (3 kişilik kontenjan); karar sorunun sahibine aittir.</p>
<h3>OFFSET-FETCH'in gizli maliyeti ve keyset sayfalama</h3>
<p><code>OFFSET 100000 ROWS FETCH NEXT 20 ROWS ONLY</code> yazdığında motor 100.020 satırı sıralayıp ilk 100.000'ini atar; sayfa numarası büyüdükçe sorgu yavaşlar. Ayrıca iki sayfa isteği arasında yeni satır eklenirse kayıtlar kayar (aynı satır iki sayfada görünür). <b>Keyset</b> (seek) sayfalamada önceki sayfanın son anahtarı hatırlanır ve indeks doğrudan oradan okunur:</p>
${TS(`DECLARE @son_id INT = 40;   -- önceki sayfanın son customer_id değeri

SELECT TOP 5 customer_id, first_name, city
FROM customers
WHERE customer_id > @son_id
ORDER BY customer_id;`)}
<table><tr><th>Yöntem</th><th>Artı</th><th>Eksi</th></tr>
<tr><td>OFFSET-FETCH</td><td>“5. sayfaya git” kolay</td><td>Derin sayfalarda yavaş, kayma olur</td></tr>
<tr><td>Keyset</td><td>Her sayfa aynı hızda, kayma yok</td><td>Rastgele sayfaya atlanamaz, sıralama anahtarı benzersiz olmalı</td></tr>
<tr><td>ROW_NUMBER + filtre</td><td>Taşınabilir</td><td>OFFSET gibi tüm önceki satırları işler</td></tr></table>
<div class="note"><b>SQL türleri arası</b>PostgreSQL ve MySQL <code>LIMIT n OFFSET m</code>; Oracle 12c+ ve PostgreSQL 13+ <code>FETCH FIRST n ROWS WITH TIES</code>; MySQL ve SQLite'ta WITH TIES yoktur, <code>RANK() &lt;= n</code> ile yazılır.</div>`));
X('ts-top', [
  sq('Değişkenle TOP: <code>@n INT = 3</code> tanımla ve Lezzet Kurye\'de komisyon oranı en yüksek <code>@n</code> restoranı, son sıradakiyle aynı orana sahip olanlar da dahil getir: <code>name</code>, <code>commission_pct</code>.', 'DECLARE @n INT = 3;\nSELECT TOP (@n) WITH TIES name, commission_pct FROM lk_restaurants ORDER BY commission_pct DESC;', Object.assign({ hint: 'Değişkenle TOP yazarken parantez zorunlu: TOP (@n) WITH TIES ... ORDER BY ...' }, T)),
  sq('Keyset sayfalama: önceki sayfanın son müşterisi <code>customer_id = 40</code>. Sonraki 5 müşteriyi OFFSET kullanmadan, TOP ve WHERE ile getir: <code>customer_id</code>, <code>first_name</code>.', 'SELECT TOP 5 customer_id, first_name FROM customers WHERE customer_id > 40 ORDER BY customer_id;', TO)
]);

more('ts-pivot', D('dinamik PIVOT ve NULL hücreler', `
<p>PIVOT'un en büyük kısıtı, sütun listesinin sorgu yazılırken <b>sabit</b> olmasıdır. Lezzet Kurye'ye yarın yeni bir ödeme yöntemi eklenirse <code>IN ([cüzdan], [kart], [nakit])</code> listesi onu göstermez. Çözüm, sütun listesini veriden üretip sorgu metnini dinamik olarak kurmaktır:</p>
${TS(`DECLARE @cols NVARCHAR(MAX), @sql NVARCHAR(MAX);

SELECT @cols = STRING_AGG(QUOTENAME(payment), ', ') WITHIN GROUP (ORDER BY payment)
FROM (SELECT DISTINCT payment FROM lk_orders) AS t;

SET @sql = N'SELECT status, ' + @cols + N'
FROM (SELECT status, payment, order_id FROM lk_orders) AS k
PIVOT (COUNT(order_id) FOR payment IN (' + @cols + N')) AS p
ORDER BY status;';

PRINT @sql;
EXEC sp_executesql @sql;`)}
<ul><li><code>QUOTENAME</code> her değeri köşeli paranteze alır; değerde boşluk, Türkçe karakter ya da <code>]</code> olsa bile sorgu bozulmaz ve enjeksiyon riski azalır.</li>
<li><code>WITHIN GROUP (ORDER BY ...)</code> sütun sırasını sabitler; yoksa STRING_AGG'in sırası garanti değildir.</li>
<li><code>PRINT @sql</code> üretilen metni görmenin en kolay yoludur; hata ayıklarken önce metni oku.</li>
<li>STRING_AGG SQL Server 2017+; daha eski sürümlerde <code>FOR XML PATH('')</code> + <code>STUFF</code> kalıbı kullanılır.</li></ul>
<h3>NULL hücreler</h3>
<p>PIVOT içinde <code>COUNT</code> eşleşme yoksa 0 verir, ama <code>SUM</code>, <code>AVG</code>, <code>MAX</code> NULL verir. Raporlarda boş hücre “veri yok” mu, “sıfır” mı karışmasın diye dış SELECT'te <code>ISNULL</code> uygulanır (PIVOT'un içinde uygulanamaz):</p>
${TS(`SELECT cuisine,
       ISNULL([İstanbul], 0) AS [İstanbul],
       ISNULL([Ankara], 0)   AS Ankara,
       ISNULL([İzmir], 0)    AS [İzmir]
FROM (SELECT r.cuisine, r.city, o.tip
      FROM lk_orders o JOIN lk_restaurants r ON r.restaurant_id = o.restaurant_id) AS k
PIVOT (SUM(tip) FOR city IN ([İstanbul], [Ankara], [İzmir])) AS p
ORDER BY cuisine;`)}
<table><tr><th>İhtiyaç</th><th>PIVOT</th><th>Koşullu toplama (CASE)</th></tr>
<tr><td>Tek ölçü, sabit sütunlar</td><td>Uygun</td><td>Uygun</td></tr>
<tr><td>Birden çok ölçü (adet + tutar)</td><td>Tek PIVOT'ta olmaz</td><td>Kolay</td></tr>
<tr><td>Farklı koşullar (tarih aralığı gibi)</td><td>Zor</td><td>Kolay</td></tr>
<tr><td>Taşınabilirlik</td><td>SQL Server, Oracle</td><td>Her SQL türü</td></tr></table>
<p><b>Kontrol listesi:</b> Kaynak sorguda yalnızca satır anahtarı, pivot sütunu ve ölçü var mı? Sütun listesi sıralı ve QUOTENAME'li mi? Toplam fonksiyonu NULL üretebiliyorsa dışarıda ISNULL var mı? Sonucun satır toplamı, pivotsuz bir GROUP BY toplamıyla aynı mı?</p>
<div class="warn"><b>Kaynak sorguyu dar tut</b>Yukarıdaki kaynağa <code>o.order_id</code> eklersen her sipariş ayrı bir gruplama anahtarı olur ve sonuç 8 satır yerine binlerce satıra çıkar.</div>`));
X('ts-pivot', [
  sq('PIVOT ile Lezzet Kurye restoranlarının mutfak türüne göre şehir dağılımı: <code>cuisine</code>, <code>İstanbul</code>, <code>Ankara</code>, <code>İzmir</code> (restoran sayısı). Mutfağa göre sırala.', 'SELECT cuisine, [İstanbul], [Ankara], [İzmir] FROM (SELECT cuisine, city, restaurant_id FROM lk_restaurants) AS k PIVOT (COUNT(restaurant_id) FOR city IN ([İstanbul], [Ankara], [İzmir])) AS p ORDER BY cuisine;', Object.assign({ hint: 'Kaynak: cuisine, city, restaurant_id. Sütun adlarında Türkçe karakter olduğu için köşeli parantez kullan.' }, TO)),
  sq('Dinamik PIVOT: ödeme yöntemlerini <code>STRING_AGG(QUOTENAME(payment), \', \') WITHIN GROUP (ORDER BY payment)</code> ile veriden üret ve her sipariş durumu için yöntem başına sipariş sayısını <code>sp_executesql</code> ile getir: <code>status</code> ve alfabetik sırayla yöntem sütunları. Duruma göre sırala.', "DECLARE @cols NVARCHAR(MAX), @sql NVARCHAR(MAX);\nSELECT @cols = STRING_AGG(QUOTENAME(payment), ', ') WITHIN GROUP (ORDER BY payment) FROM (SELECT DISTINCT payment FROM lk_orders) AS t;\nSET @sql = N'SELECT status, ' + @cols + N' FROM (SELECT status, payment, order_id FROM lk_orders) AS k PIVOT (COUNT(order_id) FOR payment IN (' + @cols + N')) AS p ORDER BY status;';\nEXEC sp_executesql @sql;", Object.assign({ hint: 'Sütun listesini bir değişkende topla, sorgu metnine iki yerde (SELECT ve IN) ekle, sonra çalıştır.' }, TO))
]);

more('ts-sistem', D('katalog görünümleriyle veritabanını keşfetmek', `
<p>Yeni bir projeye katıldığında ilk iş, veritabanında ne olduğunu belgeye değil <b>kataloga</b> sormaktır; belge eskiyebilir, katalog her zaman günceldir. SQL Server'da iki katman vardır:</p>
<table><tr><th>Katman</th><th>Örnek</th><th>Ne zaman?</th></tr>
<tr><td><code>INFORMATION_SCHEMA</code></td><td><code>TABLES</code>, <code>COLUMNS</code></td><td>Standart, diğer SQL türlerine taşınabilir sorgular</td></tr>
<tr><td><code>sys.*</code> katalog görünümleri</td><td><code>sys.tables</code>, <code>sys.columns</code>, <code>sys.indexes</code></td><td>SQL Server'a özgü ayrıntılar (indeks, IDENTITY, bağımlılık)</td></tr></table>
<p><code>sys</code> görünümleri <code>object_id</code> ile birbirine bağlanır. Lezzet Kurye tablolarının sütun sayıları:</p>
${TS(`SELECT t.name AS tablo, COUNT(*) AS sutun
FROM sys.tables t
JOIN sys.columns c ON c.object_id = t.object_id
WHERE t.name LIKE 'lk%'
GROUP BY t.name
ORDER BY t.name;`)}
<h3>IDENTITY'nin incelikleri</h3>
<ul><li><b>Boşluklar normaldir:</b> Geri alınan bir INSERT veya sunucu yeniden başlaması kimlik değerlerini tüketir; IDENTITY ardışık numara garantisi vermez. Fatura numarası gibi boşluksuz seri gerekiyorsa ayrı bir mekanizma kur.</li>
<li><b>Hangi fonksiyon?</b> <code>SCOPE_IDENTITY()</code> aynı kapsamdaki son değeri verir; <code>@@IDENTITY</code> trigger'ın başka tabloya eklediği değeri döndürebilir; <code>IDENT_CURRENT('tablo')</code> başka oturumların eklemelerini de görür.</li>
<li><b>Çok satırlı eklemede:</b> Tek bir son değer yetmez; <code>OUTPUT inserted.*</code> eklenen her satırın kimliğini döndürür.</li></ul>
${TS(`IF OBJECT_ID('dbo.notlar') IS NOT NULL DROP TABLE dbo.notlar;

CREATE TABLE notlar (
    not_id INT IDENTITY(1, 1) PRIMARY KEY,
    metin  NVARCHAR(100) NOT NULL
);

INSERT INTO notlar (metin)
OUTPUT inserted.not_id, inserted.metin
VALUES (N'Kurye geç kaldı'), (N'Paket eksik geldi');`)}
<div class="tip"><b>OBJECT_ID ile koruma</b><code>IF OBJECT_ID('dbo.t') IS NOT NULL DROP TABLE dbo.t;</code> kalıbı eski sürümlerde de çalışır. SQL Server 2016+ için kısa yol <code>DROP TABLE IF EXISTS dbo.t;</code>.</div>
<p><b>Sık hata:</b> <code>INFORMATION_SCHEMA</code> sorgularında şemayı unutmak. Aynı adlı tablo farklı şemalarda (<code>dbo.orders</code>, <code>arsiv.orders</code>) bulunabilir; filtreye <code>TABLE_SCHEMA = 'dbo'</code> ekle. <code>sys.tables</code> ile çalışırken de <code>SCHEMA_NAME(t.schema_id)</code> ile şema adını göster.</p>
<p><b>Keşif kontrol listesi:</b> Tablolar ve satır sayıları, her tablonun birincil anahtarı, yabancı anahtar ilişkileri, NULL'a izin veren sütunlar, tarih sütunlarının tipi (metin mi tarih mi), IDENTITY sütunları.</p>`));
X('ts-sistem', [
  sq('<code>sys.tables</code> ve <code>sys.columns</code> görünümlerini <code>object_id</code> ile birleştirerek adı <code>hv</code> ile başlayan Kanat Havayolları tablolarının sütun sayılarını getir: <code>tablo</code>, <code>sutun</code>. Sütun sayısına göre azalan, eşitlikte tablo adına göre sırala.', "SELECT t.name AS tablo, COUNT(*) AS sutun FROM sys.tables t JOIN sys.columns c ON c.object_id = t.object_id WHERE t.name LIKE 'hv%' GROUP BY t.name ORDER BY sutun DESC, t.name;", TO),
  sq('<code>notlar(not_id INT IDENTITY(1,1) PRIMARY KEY, metin NVARCHAR(100))</code> tablosunu oluştur ve tek bir INSERT ile iki not ekle (<b>Kurye geç kaldı</b>, <b>Paket eksik geldi</b>); <code>OUTPUT inserted.not_id, inserted.metin</code> ile eklenen satırları döndür.', "CREATE TABLE notlar (not_id INT IDENTITY(1, 1) PRIMARY KEY, metin NVARCHAR(100) NOT NULL);\nINSERT INTO notlar (metin) OUTPUT inserted.not_id, inserted.metin VALUES (N'Kurye geç kaldı'), (N'Paket eksik geldi');", Object.assign({ hint: 'OUTPUT yan tümcesi INSERT INTO ... (sütunlar) ile VALUES arasına yazılır.' }, T))
]);

more('ts-dinamik', D('enjeksiyonu önlemek ve beyaz liste', `
<p><b>SQL enjeksiyonu</b>, kullanıcı girdisinin veri olarak değil <i>kod</i> olarak yorumlanmasıdır. Dinamik SQL'de metin birleştirme yapıldığı an risk doğar. Kötü örnek (çalıştırılmaz):</p>
${NR(`-- YAPMA: girdi doğrudan metne ekleniyor
DECLARE @sehir NVARCHAR(50) = N'Bursa'' OR 1 = 1 --';
DECLARE @sql NVARCHAR(MAX) = N'SELECT * FROM customers WHERE city = ''' + @sehir + N'''';
EXEC (@sql);
-- Üretilen metin: SELECT * FROM customers WHERE city = 'Bursa' OR 1 = 1 --'
-- Sonuç: tüm müşteriler. Daha kötüsü: '; DROP TABLE customers; --`)}
<p>Doğru yol, değeri <b>parametre</b> olarak geçmektir: <code>sp_executesql</code> parametreyi her zaman veri olarak ele alır, içinde ne yazarsa yazsın kod olarak çalıştırmaz.</p>
<h3>Adlar parametre olamaz: beyaz liste</h3>
<p>Sıralama sütunu, tablo adı gibi tanımlayıcılar parametreyle verilemez. Bunlar için iki savunma birlikte kullanılır: <b>izin verilen değerler listesi</b> (beyaz liste) ve <code>QUOTENAME</code>.</p>
${TS(`DECLARE @kolon SYSNAME = N'price';   -- kullanıcıdan gelen sıralama tercihi

IF @kolon NOT IN (N'price', N'stock', N'name')
    THROW 50001, N'Bu sütuna göre sıralama yapılamaz.', 1;

DECLARE @sql NVARCHAR(MAX) =
    N'SELECT TOP 3 name, ' + QUOTENAME(@kolon) + N' AS deger
      FROM products
      ORDER BY ' + QUOTENAME(@kolon) + N' DESC, product_id;';

EXEC sp_executesql @sql;`)}
<h3>Katalogdan sorgu üretmek</h3>
<p>Dinamik SQL'in meşru bir kullanımı, katalogdaki tablolar için tekrar eden sorguları otomatik üretmektir; ör. tüm Lezzet Kurye tablolarının satır sayıları:</p>
${TS(`DECLARE @sql NVARCHAR(MAX);

SELECT @sql = STRING_AGG(
         CAST(N'SELECT N''' + TABLE_NAME + N''' AS tablo, COUNT(*) AS satir FROM '
              + QUOTENAME(TABLE_NAME) AS NVARCHAR(MAX)),
         N' UNION ALL ') WITHIN GROUP (ORDER BY TABLE_NAME)
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_NAME LIKE 'lk%';

SET @sql = @sql + N' ORDER BY tablo;';
PRINT @sql;
EXEC sp_executesql @sql;`)}
<table><tr><th></th><th><code>EXEC (@sql)</code></th><th><code>sp_executesql</code></th></tr>
<tr><td>Parametre</td><td>Yok</td><td>Var (girdi ve OUTPUT)</td></tr>
<tr><td>Plan önbelleği</td><td>Her farklı değer yeni plan</td><td>Parametreli plan yeniden kullanılır</td></tr>
<tr><td>Enjeksiyon</td><td>Birleştirme zorunlu, riskli</td><td>Değerler güvenli</td></tr></table>
<p><b>Sessiz hata:</b> Dinamik metindeki herhangi bir parça NULL ise birleştirmenin tamamı NULL olur ve <code>sp_executesql</code> hiçbir şey yapmadan, hata da vermeden döner. <code>QUOTENAME</code> 128 karakterden uzun girdide NULL döndürdüğü için bu durum beklenmedik anda ortaya çıkabilir. Çalıştırmadan önce <code>IF @sql IS NULL THROW ...</code> ile kontrol et ve geliştirirken metni <code>PRINT</code> ile oku.</p>
<div class="note"><b>OUTPUT parametresi</b>Gerçek SQL Server'da dinamik sorgudan değer almak için <code>EXEC sp_executesql @sql, N'@n INT OUTPUT', @n = @adet OUTPUT;</code> yazılır. Bu uygulamadaki öğrenme motoru OUTPUT parametrelerini desteklemez; alıştırmalarda sonucu SELECT ile döndür.</div>`));
X('ts-dinamik', [
  sq('Beyaz liste ile dinamik sıralama: <code>@kolon SYSNAME = N\'stock\'</code>. Değer <code>price</code>, <code>stock</code>, <code>name</code> dışındaysa <code>THROW</code> ile hata ver; değilse <code>QUOTENAME</code> ile sorgu kurup bu sütuna göre azalan (eşitlikte <code>product_id</code>) ilk 5 ürünü getir: <code>name</code>, <code>deger</code>.', "DECLARE @kolon SYSNAME = N'stock';\nIF @kolon NOT IN (N'price', N'stock', N'name') THROW 50001, N'izin yok', 1;\nDECLARE @sql NVARCHAR(MAX) = N'SELECT TOP 5 name, ' + QUOTENAME(@kolon) + N' AS deger FROM products ORDER BY ' + QUOTENAME(@kolon) + N' DESC, product_id;';\nEXEC sp_executesql @sql;", Object.assign({ hint: 'Sütun adı parametre olamaz: önce izin listesiyle kontrol et, sonra QUOTENAME ile metne ekle.' }, TO)),
  sq('Katalogdan sorgu üret: <code>INFORMATION_SCHEMA.TABLES</code> içinde adı <code>hv</code> ile başlayan her tablo için <code>SELECT N\'tablo\' AS tablo, COUNT(*) AS satir FROM [tablo]</code> metinlerini <code>STRING_AGG</code> ile <code>UNION ALL</code> kullanarak birleştir, sona <code>ORDER BY tablo</code> ekle ve <code>sp_executesql</code> ile çalıştır: <code>tablo</code>, <code>satir</code>.', "DECLARE @sql NVARCHAR(MAX);\nSELECT @sql = STRING_AGG(CAST(N'SELECT N''' + TABLE_NAME + N''' AS tablo, COUNT(*) AS satir FROM ' + QUOTENAME(TABLE_NAME) AS NVARCHAR(MAX)), N' UNION ALL ') WITHIN GROUP (ORDER BY TABLE_NAME) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME LIKE 'hv%';\nSET @sql = @sql + N' ORDER BY tablo;';\nEXEC sp_executesql @sql;", Object.assign({ hint: 'Metnin içindeki tek tırnaklar iki kez yazılır: N\'SELECT N\'\'\' + TABLE_NAME + N\'\'\' AS tablo ...\'' }, TO))
]);

more('mysql-ozel', D('MySQL\'de veri temizliği ve upsert', `
<p>MySQL'in kendine özgü fonksiyonları, özellikle ham veriyi temizlerken ve yükleme yaparken işe yarar. Üç tanesi çok sık kullanılır: <code>STR_TO_DATE</code>, <code>TIMESTAMPDIFF</code> ve <code>INSERT ... ON DUPLICATE KEY UPDATE</code>.</p>
<h3>STR_TO_DATE: metinden tarihe</h3>
<p><code>raw_signups</code> tablosunda tarihler iki biçimde geliyor. <code>STR_TO_DATE(metin, biçim)</code> metni gerçek DATE tipine çevirir; biçim uymazsa NULL döndürür (katı SQL modunda uyarı/hata). <code>DATE_FORMAT</code> ise tersini yapar.</p>
${MY(`SELECT id, signup_date,
       CASE WHEN signup_date LIKE '__.__.____'
            THEN STR_TO_DATE(signup_date, '%d.%m.%Y')
            ELSE STR_TO_DATE(signup_date, '%Y-%m-%d') END AS kayit_tarihi
FROM raw_signups
ORDER BY id
LIMIT 6;`)}
<h3>TIMESTAMPDIFF: süre hesabı</h3>
<p><code>TIMESTAMPDIFF(birim, başlangıç, bitiş)</code> iki zaman arasındaki farkı istenen birimde <b>tam sayı</b> (aşağı yuvarlanmış) olarak verir. <code>DATEDIFF(a, b)</code> ise yalnızca gün farkıdır ve argüman sırası terstir (bitiş önce).</p>
${MY(`SELECT r.city,
       COUNT(*) AS teslim,
       ROUND(AVG(TIMESTAMPDIFF(MINUTE, o.placed_at, o.delivered_at)), 1) AS ort_dk
FROM lk_orders o
JOIN lk_restaurants r ON r.restaurant_id = o.restaurant_id
WHERE o.status = 'teslim'
GROUP BY r.city
ORDER BY ort_dk DESC;`)}
<h3>Upsert: ON DUPLICATE KEY UPDATE</h3>
<p>Birincil veya benzersiz anahtar çakışırsa satırı güncelleyen bu yazım, MySQL'de idempotent yüklemenin en kısa yoludur:</p>
${MY(`CREATE TABLE gunluk_sayac (gun DATE PRIMARY KEY, siparis INT NOT NULL);

INSERT INTO gunluk_sayac (gun, siparis)
SELECT DATE(placed_at), COUNT(*) FROM lk_orders
WHERE placed_at >= '2024-12-30' AND placed_at < '2024-12-31'
GROUP BY DATE(placed_at)
ON DUPLICATE KEY UPDATE siparis = VALUES(siparis);

SELECT * FROM gunluk_sayac;`)}
<p>Aynı ifadeyi ikinci kez çalıştırmak satır eklemez, değeri günceller. MySQL 8.0.20+ <code>VALUES()</code> yerine takma adlı yazımı önerir: <code>INSERT ... AS yeni ON DUPLICATE KEY UPDATE siparis = yeni.siparis</code>.</p>
<p><b>Sık hata:</b> Dönüşümden sonra NULL sayısını kontrol etmemek. Biçime uymayan bir metin (ör. <code>31/12/2024</code>) STR_TO_DATE ile NULL'a döner ve kayıt sessizce “tarihsiz” kalır. Temizlik sorgusunun hemen ardından <code>SUM(CASE WHEN yeni_tarih IS NULL THEN 1 ELSE 0 END)</code> ile kaç kaydın dönüşemediğini say. Benzer şekilde TIMESTAMPDIFF aşağı yuvarladığı için 59 saniyelik bir fark 0 dakika görünür; hassas ortalamalarda <code>SECOND</code> biriminde hesaplayıp 60'a böl.</p>
<table><tr><th>Yazım</th><th>Davranış</th><th>Dikkat</th></tr>
<tr><td><code>ON DUPLICATE KEY UPDATE</code></td><td>Çakışmada günceller</td><td>Birden çok benzersiz anahtar varsa hangisinin çakıştığı belirsizleşir</td></tr>
<tr><td><code>REPLACE INTO</code></td><td>Çakışan satırı <b>siler</b>, yenisini ekler</td><td>Silme, yabancı anahtar CASCADE'lerini ve trigger'ları tetikler</td></tr>
<tr><td><code>INSERT IGNORE</code></td><td>Çakışan satırı atlar</td><td>Başka hataları da sessizce yutar</td></tr></table>`));
X('mysql-ozel', [
  sq('MySQL yazımıyla: <code>raw_signups</code> tarihlerini <code>STR_TO_DATE</code> ile gerçek tarihe çevir (<code>GG.AA.YYYY</code> ve <code>YYYY-AA-GG</code> biçimleri), tekrarlanan satırları <code>DISTINCT</code> ile at ve <code>DATE_FORMAT</code> ile aylara göre kayıt sayısını getir: <code>ay</code>, <code>kayit</code>. Aya göre sırala.', "SELECT DATE_FORMAT(d, '%Y-%m') AS ay, COUNT(*) AS kayit FROM (SELECT DISTINCT id, CASE WHEN signup_date LIKE '__.__.____' THEN STR_TO_DATE(signup_date, '%d.%m.%Y') ELSE STR_TO_DATE(signup_date, '%Y-%m-%d') END AS d FROM raw_signups) t GROUP BY DATE_FORMAT(d, '%Y-%m') ORDER BY ay;", Object.assign({ hint: "Biçim kodları: %d gün, %m ay, %Y dört basamaklı yıl. LIKE '__.__.____' noktalı biçimi yakalar." }, MO)),
  sq('MySQL yazımıyla: <code>gunluk_sayac(gun DATE PRIMARY KEY, siparis INT NOT NULL)</code> tablosunu oluştur; 2024-12-31 gününün Lezzet Kurye sipariş sayısını <code>INSERT ... SELECT ... ON DUPLICATE KEY UPDATE siparis = VALUES(siparis)</code> ile yükle. İfadeyi iki kez çalıştır; tabloda tek satır kalmalı.', "CREATE TABLE gunluk_sayac (gun DATE PRIMARY KEY, siparis INT NOT NULL);\nINSERT INTO gunluk_sayac (gun, siparis) SELECT DATE(placed_at), COUNT(*) FROM lk_orders WHERE placed_at >= '2024-12-31' AND placed_at < '2025-01-01' GROUP BY DATE(placed_at) ON DUPLICATE KEY UPDATE siparis = VALUES(siparis);\nINSERT INTO gunluk_sayac (gun, siparis) SELECT DATE(placed_at), COUNT(*) FROM lk_orders WHERE placed_at >= '2024-12-31' AND placed_at < '2025-01-01' GROUP BY DATE(placed_at) ON DUPLICATE KEY UPDATE siparis = VALUES(siparis);", Object.assign({ check: 'SELECT gun, siparis FROM gunluk_sayac ORDER BY gun', start: 'CREATE TABLE gunluk_sayac (gun DATE PRIMARY KEY, siparis INT NOT NULL);\n-- INSERT ... SELECT ... ON DUPLICATE KEY UPDATE ifadesini iki kez yaz.\n', hint: 'ON DUPLICATE KEY UPDATE siparis = VALUES(siparis) çakışmada yeni değeri yazar.' }, M))
]);

})();
