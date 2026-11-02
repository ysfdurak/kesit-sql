/* Kesit SQL içerik 20: Büyük Sorgular
   Gerçek işte karşılaşılan çok adımlı, uzun sorgular. Her derste baştan sona çalışan bir sorgu,
   adım adım açıklaması, sık hatalar ve sorguyu değiştirip genişletmeyi isteyen alıştırmalar var. */
(function () {
const L = window.SQLP_LESSONS;
const MOD = 'Büyük Sorgular';
const sq = (q, sol, o) => Object.assign({ t: 'sql', q: '<p>' + q + '</p>', sol }, o || {});
const mc = (q, o, a, why) => ({ t: 'mc', q, o, a, why });
const NET = 'oi.quantity * oi.unit_price * (1 - oi.discount)';
const AYNO = d => `(CAST(strftime('%Y', ${d}) AS INTEGER) * 12 + CAST(strftime('%m', ${d}) AS INTEGER))`;
const DLY = 'ROUND((julianday(f.actual_dep) - julianday(f.sched_dep)) * 1440)';
const ADIM = rows => '<table><tr><th>Adım</th><th>Ne yapar?</th><th>Çıktının bir satırı</th></tr>' + rows.map(r => '<tr><td><code>' + r[0] + '</code></td><td>' + r[1] + '</td><td>' + r[2] + '</td></tr>').join('') + '</table>';
const GIRIS = `<div class="note"><b>Büyük sorgu nasıl okunur?</b>Yukarıdan aşağı, her CTE'yi ayrı bir tablo gibi düşün. Bir adımı anlamadıysan o CTE'nin adını en sondaki SELECT'e yazıp yalnızca onu çalıştır: <code>SELECT * FROM adim_adi LIMIT 20;</code></div>`;

/* ---------------- Kohort ---------------- */
const KOHORT = `WITH ilk AS (            -- 1) Müşterinin kohortu: ilk sipariş ayı
  SELECT customer_id, MIN(${AYNO('order_date')}) AS kohort_no
  FROM orders
  GROUP BY customer_id
),
aktif AS (              -- 2) Müşterinin sipariş verdiği her ay (tekrarsız)
  SELECT DISTINCT customer_id, ${AYNO('order_date')} AS ay_no
  FROM orders
),
fark AS (               -- 3) Kohorttan bu yana geçen ay sayısı
  SELECT i.kohort_no, a.ay_no - i.kohort_no AS ay_farki, a.customer_id
  FROM aktif a
  JOIN ilk i ON i.customer_id = a.customer_id
),
boyut AS (              -- 4) Her kohortun büyüklüğü
  SELECT kohort_no, COUNT(*) AS musteri
  FROM ilk
  GROUP BY kohort_no
)
SELECT                   -- 5) Matris: kohort satırda, ay farkı sütunda
  FLOOR((b.kohort_no - 1) / 12) AS yil,
  (b.kohort_no - 1) % 12 + 1 AS ay,
  b.musteri,
  ROUND(100.0 * COUNT(DISTINCT CASE WHEN f.ay_farki = 1 THEN f.customer_id END) / b.musteri, 1) AS m1,
  ROUND(100.0 * COUNT(DISTINCT CASE WHEN f.ay_farki = 2 THEN f.customer_id END) / b.musteri, 1) AS m2,
  ROUND(100.0 * COUNT(DISTINCT CASE WHEN f.ay_farki = 3 THEN f.customer_id END) / b.musteri, 1) AS m3,
  ROUND(100.0 * COUNT(DISTINCT CASE WHEN f.ay_farki BETWEEN 1 AND 6 THEN f.customer_id END) / b.musteri, 1) AS ilk6ay
FROM boyut b
JOIN fark f ON f.kohort_no = b.kohort_no
WHERE b.kohort_no >= 2023 * 12 + 1 AND b.kohort_no <= 2023 * 12 + 12
GROUP BY b.kohort_no, b.musteri
ORDER BY b.kohort_no;`;

/* ---------------- Oturumlama ---------------- */
const OTURUM = `WITH olay AS (           -- 1) Her olayın bir öncekinden sonra geçen süre (saniye)
  SELECT user_id, event_id, event_time, event_type, device,
         ROUND((julianday(event_time) - julianday(LAG(event_time) OVER (PARTITION BY user_id ORDER BY event_time, event_id))) * 86400) AS ara_sn
  FROM web_events
),
isaret AS (              -- 2) 30 dakikadan uzun ara (ya da ilk olay) yeni oturum başlatır
  SELECT *, CASE WHEN ara_sn IS NULL OR ara_sn > 1800 THEN 1 ELSE 0 END AS yeni
  FROM olay
),
oturum AS (              -- 3) Kümülatif toplam = kullanıcı içinde oturum numarası
  SELECT *, SUM(yeni) OVER (PARTITION BY user_id ORDER BY event_time, event_id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS oturum_no
  FROM isaret
),
ozet AS (                -- 4) Oturum düzeyi: cihaz, olay sayısı, huni adımları
  SELECT user_id, oturum_no,
         MIN(device) AS device,
         COUNT(*) AS olay,
         MAX(CASE WHEN event_type = 'product_view' THEN 1 ELSE 0 END) AS gordu,
         MAX(CASE WHEN event_type = 'add_to_cart' THEN 1 ELSE 0 END) AS sepet,
         MAX(CASE WHEN event_type = 'purchase' THEN 1 ELSE 0 END) AS aldi
  FROM oturum
  GROUP BY user_id, oturum_no
)
SELECT device,                -- 5) Cihaz bazında oturum hunisi
       COUNT(*) AS oturum,
       ROUND(AVG(olay), 1) AS ort_olay,
       ROUND(100.0 * SUM(gordu) / COUNT(*), 1) AS urun_goren,
       ROUND(100.0 * SUM(sepet) / COUNT(*), 1) AS sepete_ekleyen,
       ROUND(100.0 * SUM(aldi) / COUNT(*), 1) AS satin_alan
FROM ozet
GROUP BY device
ORDER BY oturum DESC;`;

/* ---------------- RFM ---------------- */
const RFM = `WITH teslim AS (          -- 1) Yalnızca teslim edilmiş siparişler, sipariş tutarıyla
  SELECT o.customer_id, o.order_id, o.order_date, SUM(${NET}) AS tutar
  FROM orders o
  JOIN order_items oi ON oi.order_id = o.order_id
  WHERE o.status = 'delivered'
  GROUP BY o.customer_id, o.order_id, o.order_date
),
ham AS (                 -- 2) Müşteri başına R, F, M ham değerleri (referans: 2025-01-01)
  SELECT customer_id,
         julianday('2025-01-01') - julianday(MAX(order_date)) AS r_gun,
         COUNT(*) AS f_siparis,
         SUM(tutar) AS m_tutar
  FROM teslim
  GROUP BY customer_id
),
puan AS (                -- 3) Her boyut 1–5 puan (5 en iyi); NTILE eşit dilimler üretir
  SELECT customer_id, r_gun, f_siparis, m_tutar,
         NTILE(5) OVER (ORDER BY r_gun DESC, customer_id) AS r,
         NTILE(5) OVER (ORDER BY f_siparis, customer_id) AS f,
         NTILE(5) OVER (ORDER BY m_tutar, customer_id) AS m
  FROM ham
),
segment AS (             -- 4) Puan birleşimlerini iş segmentlerine eşle
  SELECT *,
         CASE WHEN r >= 4 AND f >= 4 THEN 'Şampiyon'
              WHEN r >= 3 AND f >= 3 THEN 'Sadık'
              WHEN r >= 4 AND f <= 2 THEN 'Yeni ve umut vadeden'
              WHEN r <= 2 AND f >= 3 THEN 'Kaybedilmek üzere'
              WHEN r <= 2 THEN 'Uykuda'
              ELSE 'Gelişmeye açık' END AS segment
  FROM puan
)
SELECT segment,              -- 5) Segment özeti
       COUNT(*) AS musteri,
       ROUND(AVG(r_gun)) AS ort_gun,
       ROUND(AVG(f_siparis), 1) AS ort_siparis,
       ROUND(SUM(m_tutar)) AS ciro,
       ROUND(100.0 * SUM(m_tutar) / SUM(SUM(m_tutar)) OVER (), 1) AS ciro_payi
FROM segment
GROUP BY segment
ORDER BY ciro DESC;`;

/* ---------------- Operasyon panosu ---------------- */
const OPS = `WITH ucus AS (           -- 1) Uçuş düzeyi: gün, gecikme, iptal bayrağı
  SELECT f.flight_id, date(f.sched_dep) AS gun, f.status,
         ${DLY} AS gecikme
  FROM hv_flights f
  WHERE f.sched_dep >= '2024-12-01' AND f.sched_dep < '2025-01-01'
),
gunluk AS (              -- 2) Gün düzeyi: planlanan, iptal, zamanında kalkan
  SELECT gun,
         COUNT(*) AS planlanan,
         SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS iptal,
         SUM(CASE WHEN gecikme <= 15 THEN 1 ELSE 0 END) AS zamaninda,
         COUNT(gecikme) AS kalkan
  FROM ucus
  GROUP BY gun
),
neden AS (               -- 3) Her günün rötar nedenleri ve dakikaları
  SELECT u.gun, d.reason, SUM(d.minutes) AS dakika
  FROM hv_delays d
  JOIN ucus u ON u.flight_id = d.flight_id
  GROUP BY u.gun, d.reason
),
baslica AS (             -- 4) Günün en çok dakika getiren nedeni (eşitlikte alfabetik)
  SELECT gun, reason, dakika,
         ROW_NUMBER() OVER (PARTITION BY gun ORDER BY dakika DESC, reason) AS sira
  FROM neden
)
SELECT g.gun,                 -- 5) Pano: günlük değerler + 7 günlük hareketli zamanında kalkış
       g.planlanan, g.iptal,
       ROUND(100.0 * g.zamaninda / g.kalkan, 1) AS otp,
       ROUND(100.0 * SUM(g.zamaninda) OVER w / SUM(g.kalkan) OVER w, 1) AS otp_7gun,
       b.reason AS baslica_neden,
       b.dakika AS neden_dk
FROM gunluk g
LEFT JOIN baslica b ON b.gun = g.gun AND b.sira = 1
WINDOW w AS (ORDER BY g.gun ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)
ORDER BY g.gun;`;

/* ---------------- AML kuralları ---------------- */
const AML = `WITH harcama AS (        -- 0) Kart harcamaları, tutar pozitif
  SELECT t.txn_id, t.account_id, t.txn_time, -t.amount AS tutar, t.merchant_category AS kat,
         CAST(strftime('%H', t.txn_time) AS INTEGER) AS saat
  FROM bank_txns t
  WHERE t.txn_type = 'kart_harcama'
),
ort AS (                 -- 1) Hesabın kendi ortalaması (kişiye göre normal)
  SELECT account_id, AVG(tutar) AS ort_tutar, COUNT(*) AS adet
  FROM harcama
  GROUP BY account_id
),
k1 AS (                  -- Kural 1: gece 01–05 arası 20.000 TL üzeri harcama
  SELECT account_id, txn_id, 'gece_yuksek' AS kural, 3 AS puan
  FROM harcama
  WHERE saat BETWEEN 1 AND 4 AND tutar > 20000
),
k2 AS (                  -- Kural 2: hesabın kendi ortalamasının 8 katından büyük harcama
  SELECT h.account_id, h.txn_id, 'ortalama_8x' AS kural, 2 AS puan
  FROM harcama h
  JOIN ort o ON o.account_id = h.account_id
  WHERE o.adet >= 5 AND h.tutar > 8 * o.ort_tutar
),
k3 AS (                  -- Kural 3: aynı hesapta 10 dakika içinde art arda e-ticaret harcaması
  SELECT DISTINCT h.account_id, h.txn_id, 'hizli_tekrar' AS kural, 1 AS puan
  FROM harcama h
  JOIN harcama p ON p.account_id = h.account_id AND p.txn_id <> h.txn_id
                AND p.kat = 'e_ticaret'
                AND p.txn_time <= h.txn_time
                AND p.txn_time >= datetime(h.txn_time, '-10 minutes')
  WHERE h.kat = 'e_ticaret'
),
alarm AS (               -- 2) Tüm kuralları alt alta topla
  SELECT * FROM k1 UNION ALL SELECT * FROM k2 UNION ALL SELECT * FROM k3
),
hesap AS (               -- 3) Hesap başına toplam risk puanı ve tetiklenen kurallar
  SELECT account_id,
         SUM(puan) AS risk,
         COUNT(DISTINCT txn_id) AS supheli_islem,
         COUNT(DISTINCT kural) AS kural_sayisi
  FROM alarm
  GROUP BY account_id
)
SELECT h.account_id, c.full_name, c.segment, h.risk, h.supheli_islem, h.kural_sayisi,
       DENSE_RANK() OVER (ORDER BY h.risk DESC) AS oncelik
FROM hesap h
JOIN bank_accounts a ON a.account_id = h.account_id
JOIN bank_customers c ON c.customer_id = a.customer_id
ORDER BY oncelik, h.account_id
LIMIT 15;`;

/* ---------------- SCD 2 ve nokta-zaman birleştirme ---------------- */
const SCD = `WITH olay AS (           -- 1) Fiyat olayları: başlangıç fiyatı + her güncelleme
  SELECT product_id, price AS fiyat, '2000-01-01 00:00:00' AS baslangic, 0 AS kaynak
  FROM products
  WHERE product_id IN (SELECT product_id FROM price_updates)
  UNION ALL
  SELECT product_id, new_price, updated_at, 1
  FROM price_updates
),
aralik AS (              -- 2) Her fiyatın geçerli olduğu aralık: bir sonraki olayın başlangıcına kadar
  SELECT product_id, fiyat, baslangic,
         LEAD(baslangic) OVER (PARTITION BY product_id ORDER BY baslangic) AS bitis
  FROM olay
),
boyut AS (               -- 3) SCD 2 boyutu: açık uçlu aralığa uzak bir tarih ver, güncel bayrağı ekle
  SELECT product_id, fiyat, baslangic,
         COALESCE(bitis, '9999-12-31 00:00:00') AS bitis,
         CASE WHEN bitis IS NULL THEN 1 ELSE 0 END AS guncel
  FROM aralik
),
satis AS (               -- 4) Ekim–Aralık 2024 satış satırları
  SELECT oi.product_id, o.order_date, oi.unit_price, oi.quantity
  FROM order_items oi
  JOIN orders o ON o.order_id = oi.order_id
  WHERE o.order_date >= '2024-10-01'
)
SELECT s.product_id,          -- 5) Nokta-zaman birleştirme: satış anında geçerli fiyat satırı
       COUNT(*) AS satir,
       ROUND(AVG(s.unit_price), 2) AS ort_satis_fiyati,
       ROUND(AVG(b.fiyat), 2) AS ort_liste_fiyati,
       SUM(CASE WHEN b.guncel = 1 THEN 1 ELSE 0 END) AS guncel_fiyatla
FROM satis s
JOIN boyut b ON b.product_id = s.product_id
            AND s.order_date >= b.baslangic AND s.order_date < b.bitis
GROUP BY s.product_id
ORDER BY s.product_id;`;

const lessons = [
{
  id: 'bs-giris', lv: 'C1', mod: MOD, min: 12,
  title: 'Büyük sorgularla çalışmak: okuma, yazma ve hata ayıklama yöntemi',
  sum: '100 satırlık bir sorguyu parçalara ayırmak, her adımı ayrı doğrulamak ve okunur tutmak.',
  body: `
<h2>Gerçek işte sorgular uzundur</h2>
<p>Bir şirketin aylık yönetim raporu, dolandırıcılık kuralları ya da veri ambarı yüklemesi nadiren tek bir SELECT ile biter. Çoğu 5–10 adımlı bir boru hattıdır: her adım bir öncekinin çıktısını alır, biraz dönüştürür ve bir sonrakine verir. Bu modüldeki her ders böyle bir sorguyu baştan sona kurar.</p>
<h2>Beş kural</h2>
<ol>
<li><b>Her CTE tek bir iş yapsın</b> ve adı o işi söylesin: <code>ilk_siparis</code>, <code>aylik_ciro</code>, <code>segment</code>.</li>
<li><b>Her adımın taneciğini bil:</b> “bir satır = bir müşteri × ay” gibi. Tanecik değiştiğinde (gruplama) bunu yorumla yaz.</li>
<li><b>Satır sayısını kontrol et:</b> Her CTE'den sonra <code>SELECT COUNT(*)</code> ile beklenen satır sayısını doğrula. JOIN sonrası beklenmedik artış, satır çoğalmasıdır.</li>
<li><b>Filtreyi erken uygula:</b> Tarih aralığı ve durum filtrelerini ilk CTE'de yaz; sonraki adımlar daha az veriyle çalışır.</li>
<li><b>Son SELECT sunumdur:</b> Yuvarlama, Türkçe sütun adları ve sıralama en sonda yapılır; ara adımlar ham değer taşır.</li>
</ol>
<h2>Hata ayıklama: sondan değil, baştan</h2>
<p>Sonuç yanlışsa son SELECT'i değil, ilk CTE'yi incele. Her adımı tek tek çalıştır; sayıların nerede saptığını bul. Aşağıdaki iskelet her büyük sorgunun başlangıç noktasıdır:</p>
<pre class="code" data-norun>WITH adim1 AS (...),      -- satır sayısı: ?
     adim2 AS (...),      -- satır sayısı: ?
     adim3 AS (...)
SELECT * FROM adim2 LIMIT 20;   -- incelediğin adımı buraya yaz</pre>
<div class="tip"><b>Performans</b>Büyük sorguyu hızlandırmanın en etkili yolu, ilk adımda ihtiyaç duyulan satır ve sütunlara inmektir. Planı okumadan önce “hangi adımda kaç satır var?” sorusunu cevapla.</div>
`,
  ex: [
    sq('Bir büyük sorgunun ilk adımını doğrula: teslim edilmiş siparişlerin sipariş düzeyinde net tutarını hesaplayan CTE\'yi yaz ve bu adımın kaç satır ürettiğini, toplam tutarı (tam sayı) ve en büyük sipariş tutarını (tam sayı) getir: <code>satir</code>, <code>toplam</code>, <code>en_buyuk</code>.',
      `WITH teslim AS (SELECT o.order_id, SUM(${NET}) AS tutar FROM orders o JOIN order_items oi ON oi.order_id = o.order_id WHERE o.status = 'delivered' GROUP BY o.order_id) SELECT COUNT(*) AS satir, ROUND(SUM(tutar)) AS toplam, ROUND(MAX(tutar)) AS en_buyuk FROM teslim;`,
      { hint: 'CTE\'yi yaz, sonra son SELECT\'te COUNT, SUM ve MAX ile kontrol et. Satır sayısı teslim edilmiş sipariş sayısına eşit olmalı.' }),
    sq('Satır çoğalmasını yakala: <code>orders</code> ile <code>order_items</code> birleştirildiğinde kaç satır olduğunu, kaç farklı sipariş olduğunu ve sipariş başına ortalama satırı (2 basamak) tek satırda getir: <code>satir</code>, <code>siparis</code>, <code>ortalama</code>.',
      'SELECT COUNT(*) AS satir, COUNT(DISTINCT o.order_id) AS siparis, ROUND(1.0 * COUNT(*) / COUNT(DISTINCT o.order_id), 2) AS ortalama FROM orders o JOIN order_items oi ON oi.order_id = o.order_id;',
      { why: 'Birleştirme her siparişi ortalama bu kadar kez tekrarlıyor. Sipariş düzeyinde bir şey sayarken COUNT(DISTINCT) gerekmesinin nedeni bu.' }),
    mc('<p>Altı CTE\'li bir rapor sorgusu toplam ciroyu beklenenden yaklaşık 2,4 kat büyük gösteriyor. İlk ne yapılmalı?</p>', ['Son SELECT\'teki ROUND ve sıralamayı değiştirmek', 'Her CTE\'yi sırayla tek başına çalıştırıp satır sayısının ve toplamın hangi adımda sıçradığını bulmak', 'Sorgunun tamamını tek bir SELECT olarak yeniden yazmak', 'Sorguya DISTINCT ekleyip sonucun düzelip düzelmediğine bakmak'], 1,
      'Yaklaşık sabit bir kat, bir JOIN\'in satırları çoğalttığını düşündürür. Adım adım çalıştırmak, sorunun hangi birleştirmede başladığını gösterir. Rastgele DISTINCT eklemek sorunu gizleyebilir ama nedenini çözmez.')
  ]
},
{
  id: 'bs-kohort', lv: 'C1', mod: MOD, min: 22,
  title: 'Büyük sorgu 1: aylık kohort elde tutma matrisi',
  sum: 'İlk sipariş ayına göre kohortlar, ay numarası hesabı ve M1–M3 elde tutma oranlarını tek bir matriste toplamak.',
  body: `
<h2>Soru</h2>
<p>Pazarlama direktörü soruyor: “2023'te ilk siparişini veren müşterilerin kaçta kaçı sonraki aylarda geri geldi? Hangi ayın müşterileri daha sadık?” Cevap bir <b>kohort matrisi</b>: her satır bir başlangıç ayı, her sütun “kaç ay sonra” sorusu.</p>
<h2>Sorgu</h2>
${GIRIS}
<pre class="code">${KOHORT}</pre>
<h2>Adım adım</h2>
${ADIM([
  ['ilk', 'Müşterinin ilk sipariş ayını “ay numarası” (yıl × 12 + ay) olarak bulur', 'müşteri 17 → 24282 (2023 Haziran)'],
  ['aktif', 'Müşterinin sipariş verdiği her ayı bir kez listeler', 'müşteri 17 → 24282, 24284, 24290'],
  ['fark', 'Her aktif ay için kohorttan bu yana geçen ay sayısı', '24284 − 24282 = 2'],
  ['boyut', 'Kohort başına müşteri sayısı (oranların paydası)', '24282 → 9 müşteri'],
  ['son SELECT', 'Koşullu sayımla matrisi kurar, oranı kohort büyüklüğüne böler', '2023, 6, 9, m1, m2, m3, ilk6ay']
])}
<h2>Neden ay numarası?</h2>
<p>İki tarih arasındaki “ay farkı” programdan programa farklı hesaplanır (SQL Server <code>DATEDIFF(month)</code> ay sınırlarını sayar, PostgreSQL <code>AGE</code> gün hassasiyetinde çalışır). Yıl × 12 + ay dönüşümü her programda aynı sonucu verir ve aritmetiği basitleştirir. Geri dönüşüm: yıl = FLOOR((no − 1) / 12), ay = (no − 1) % 12 + 1. FLOOR gerekir; çünkü MySQL, Oracle ve BigQuery tam sayıları da ondalıklı böler.</p>
<h2>Sık hatalar</h2>
<ul>
<li><b>Aynı ayda iki sipariş:</b> <code>aktif</code> adımında DISTINCT olmazsa müşteri aynı ay için iki kez sayılır; COUNT(DISTINCT) son adımda bunu kurtarır ama ara adımlar şişer.</li>
<li><b>Payda:</b> Oran, o ay aktif olanların sayısına değil kohortun başlangıç büyüklüğüne bölünür.</li>
<li><b>Sağdan kesilme:</b> 2024 Aralık kohortunun M3 değeri henüz oluşmamıştır. Bu yüzden sorgu 2023 kohortlarıyla sınırlı.</li>
</ul>
`,
  ex: [
    sq('Kohort sorgusunun ilk adımını tek başına çalıştır: kohort ayına göre müşteri sayısını getir; ay numarasını değil okunur yıl-ay biçimini kullan: <code>kohort</code> (YYYY-AA), <code>musteri</code>. Yalnızca 2023 kohortları, kohorta göre sırala.',
      "WITH ilk AS (SELECT customer_id, MIN(order_date) AS ilk_tarih FROM orders GROUP BY customer_id) SELECT strftime('%Y-%m', ilk_tarih) AS kohort, COUNT(*) AS musteri FROM ilk WHERE ilk_tarih >= '2023-01-01' AND ilk_tarih < '2024-01-01' GROUP BY strftime('%Y-%m', ilk_tarih) ORDER BY kohort;",
      { ord: true, hint: 'Önce müşteri başına MIN(order_date), sonra bu tarihin yıl-ayına göre grupla.' }),
    sq('Matrisi <b>çeyrek</b> düzeyine indir: 2023 kohortlarını çeyreğe göre (Ç1: Ocak–Mart …) birleştir ve her çeyrek kohortu için müşteri sayısı ile ilk siparişten sonraki 1–6 ay içinde en az bir kez daha sipariş veren müşterilerin oranını (yüzde, 1 basamak) getir: <code>ceyrek</code> (1–4), <code>musteri</code>, <code>ilk6ay</code>.',
      `WITH ilk AS (SELECT customer_id, MIN(${AYNO('order_date')}) AS kohort_no FROM orders GROUP BY customer_id), aktif AS (SELECT DISTINCT customer_id, ${AYNO('order_date')} AS ay_no FROM orders), donen AS (SELECT DISTINCT i.customer_id FROM ilk i JOIN aktif a ON a.customer_id = i.customer_id AND a.ay_no - i.kohort_no BETWEEN 1 AND 6) SELECT FLOOR(((i.kohort_no - 1) % 12) / 3) + 1 AS ceyrek, COUNT(*) AS musteri, ROUND(100.0 * COUNT(d.customer_id) / COUNT(*), 1) AS ilk6ay FROM ilk i LEFT JOIN donen d ON d.customer_id = i.customer_id WHERE i.kohort_no BETWEEN 2023 * 12 + 1 AND 2023 * 12 + 12 GROUP BY FLOOR(((i.kohort_no - 1) % 12) / 3) + 1 ORDER BY ceyrek;`,
      { ord: true, hint: 'Ay = (no − 1) % 12 + 1; çeyrek = FLOOR((ay − 1) / 3) + 1. FLOOR yazmak önemli: MySQL, Oracle ve BigQuery\'de / işareti tam sayıları da ondalıklı böler. Geri dönen müşterileri ayrı bir CTE\'de bul ve LEFT JOIN ile bağla.' }),
    sq('Kohort fikrini <b>Kanat Havayolları</b>\'na uygula: üyeleri ilk gerçekleşen (flown) uçuşlarının ayına göre kohortla ve her kohort için üye sayısı ile sonraki takvim ayında da uçan üyelerin oranını (yüzde, 1 basamak) getir: <code>kohort</code> (YYYY-AA), <code>uye</code>, <code>m1</code>. Kohorta göre sırala.',
      `WITH u AS (SELECT b.passenger_id, f.sched_dep, ${AYNO('f.sched_dep')} AS ay_no FROM hv_bookings b JOIN hv_flights f ON f.flight_id = b.flight_id WHERE b.status = 'flown'), ilk AS (SELECT passenger_id, MIN(ay_no) AS kohort_no, MIN(sched_dep) AS ilk_ucus FROM u GROUP BY passenger_id), m1 AS (SELECT DISTINCT i.passenger_id FROM ilk i JOIN u ON u.passenger_id = i.passenger_id AND u.ay_no = i.kohort_no + 1) SELECT strftime('%Y-%m', i.ilk_ucus) AS kohort, COUNT(*) AS uye, ROUND(100.0 * COUNT(m.passenger_id) / COUNT(*), 1) AS m1 FROM ilk i LEFT JOIN m1 m ON m.passenger_id = i.passenger_id GROUP BY strftime('%Y-%m', i.ilk_ucus) ORDER BY kohort;`,
      { ord: true, hint: 'Aynı kalıp: olay tablosu (uçuşlar), ilk ay, sonraki ay. İlk uçuş tarihini de MIN ile taşı ve yıl-ay biçimini ondan üret.' }),
    mc('<p>Kohort matrisinde 2024 Kasım kohortunun M3 sütunu çok düşük çıktı. En olası açıklama nedir?</p>', ['Kasım müşterileri gerçekten daha az sadık', 'Veri Aralık 2024\'te bitiyor; Kasım kohortunun 3. ayı henüz yaşanmadı (sağdan kesilme)', 'Ay numarası hesabı Kasım\'da yanlış sonuç verir', 'Payda olarak aktif müşteri kullanıldığı için'], 1,
      'Son kohortların uzak sütunları henüz gözlemlenemez. Bu yüzden matris ya yalnızca olgunlaşmış kohortlarla sınırlanır ya da gözlenemeyen hücreler boş bırakılır.')
  ]
},
{
  id: 'bs-oturum', lv: 'C1', mod: MOD, min: 22,
  title: 'Büyük sorgu 2: olaylardan oturum ve oturum hunisi',
  sum: 'Ham tıklama verisini 30 dakikalık boşluk kuralıyla oturumlara bölmek, oturum düzeyinde huni ve cihaz kırılımı.',
  body: `
<h2>Soru</h2>
<p>Ürün ekibi “kullanıcı başına” değil “ziyaret başına” dönüşümü görmek istiyor. Ama <code>web_events</code> tablosunda oturum numarası yok; yalnızca kullanıcı ve zaman var. Sektörün yaygın tanımı: aynı kullanıcının iki olayı arasında <b>30 dakikadan uzun</b> boşluk varsa yeni oturum başlar.</p>
<h2>Sorgu</h2>
${GIRIS}
<pre class="code">${OTURUM}</pre>
<h2>Adım adım</h2>
${ADIM([
  ['olay', 'Kullanıcının bir önceki olayından bu yana geçen saniye (LAG)', 'kullanıcı 1001, 412 sn'],
  ['isaret', 'İlk olay ya da 1800 saniyeden (30 dk) uzun boşluk = 1, değilse 0', '1, 0, 0, 1, 0'],
  ['oturum', 'İşaretlerin kümülatif toplamı oturum numarasını verir', '1, 1, 1, 2, 2'],
  ['ozet', 'Oturum düzeyine indirger; huni adımlarını MAX(CASE) ile bayrak yapar', '1001, 2, mobile, 5 olay, 1, 1, 0'],
  ['son SELECT', 'Cihaz bazında oturum sayısı ve adım oranları', 'mobile, 412, 2.6, …']
])}
<h2>Kalıp: “işaretle ve kümülatif topla”</h2>
<p>Bu kalıp yalnızca oturum için değil, her türlü “bir koşul gerçekleşince yeni grup başlar” sorusunda kullanılır: fiyat değişimleri, vardiya başlangıçları, aynı uçağın yerde kaldığı aralıklar. Boşlukları ve adaları ROW_NUMBER farkıyla bulma yöntemine göre avantajı, eşik (30 dakika) koyabilmesidir.</p>
<div class="note"><b>Neden saniye?</b>Olay zamanları saniyeli. Dakika farkını programlar farklı hesaplar: SQL Server <code>DATEDIFF(minute)</code> geçen dakika sınırlarını sayar, diğerleri kesirli süreyi. Eşiğe yakın aralıklarda bu bir dakikalık fark oturum sayısını değiştirir; saniyeyle karşılaştırmak her programda aynı sonucu verir.</div>
<div class="warn"><b>Eşit zamanlı olaylar</b>Aynı saniyede iki olay olabilir. Pencere sıralamasına benzersiz bir sütun (event_id) eklemezsen oturum numaraları çalıştırmadan çalıştırmaya değişebilir.</div>
`,
  ex: [
    sq('Oturum sorgusunun ilk üç adımını kullanarak her kullanıcının oturum sayısını bul ve oturum sayısına göre kullanıcı dağılımını getir: <code>oturum_sayisi</code>, <code>kullanici</code>. Oturum sayısına göre sırala.',
      "WITH olay AS (SELECT user_id, event_id, event_time, ROUND((julianday(event_time) - julianday(LAG(event_time) OVER (PARTITION BY user_id ORDER BY event_time, event_id))) * 86400) AS ara_sn FROM web_events), isaret AS (SELECT user_id, event_id, event_time, CASE WHEN ara_sn IS NULL OR ara_sn > 1800 THEN 1 ELSE 0 END AS yeni FROM olay), kul AS (SELECT user_id, SUM(yeni) AS oturum_sayisi FROM isaret GROUP BY user_id) SELECT oturum_sayisi, COUNT(*) AS kullanici FROM kul GROUP BY oturum_sayisi ORDER BY oturum_sayisi;",
      { ord: true, hint: 'Kullanıcının oturum sayısı = işaretlerin toplamı; kümülatif toplama gerek yok.' }),
    sq('Eşiği değiştir: 30 dakika yerine <b>10 dakika</b> kuralıyla toplam oturum sayısını ve oturum başına ortalama olay sayısını (2 basamak) getir: <code>oturum</code>, <code>ort_olay</code>.',
      "WITH olay AS (SELECT user_id, event_id, event_time, ROUND((julianday(event_time) - julianday(LAG(event_time) OVER (PARTITION BY user_id ORDER BY event_time, event_id))) * 86400) AS ara_sn FROM web_events), isaret AS (SELECT CASE WHEN ara_sn IS NULL OR ara_sn > 600 THEN 1 ELSE 0 END AS yeni FROM olay) SELECT SUM(yeni) AS oturum, ROUND(1.0 * COUNT(*) / SUM(yeni), 2) AS ort_olay FROM isaret;",
      { hint: 'Toplam oturum = tüm yeni-oturum işaretlerinin toplamı; ortalama = olay sayısı / oturum sayısı.' }),
    sq('Oturum düzeyinde huni: <b>satın almayla biten</b> oturumların (en az bir purchase olayı olan) ortalama süresini dakika olarak (1 basamak) ve bu oturumların sayısını getir. Oturum süresi = son olay − ilk olay. Sütunlar: <code>oturum</code>, <code>ort_sure_dk</code>.',
      "WITH olay AS (SELECT user_id, event_id, event_time, event_type, ROUND((julianday(event_time) - julianday(LAG(event_time) OVER (PARTITION BY user_id ORDER BY event_time, event_id))) * 86400) AS ara_sn FROM web_events), isaret AS (SELECT *, CASE WHEN ara_sn IS NULL OR ara_sn > 1800 THEN 1 ELSE 0 END AS yeni FROM olay), oturum AS (SELECT *, SUM(yeni) OVER (PARTITION BY user_id ORDER BY event_time, event_id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS oturum_no FROM isaret), ozet AS (SELECT user_id, oturum_no, MIN(event_time) AS bas, MAX(event_time) AS bit, MAX(CASE WHEN event_type = 'purchase' THEN 1 ELSE 0 END) AS aldi FROM oturum GROUP BY user_id, oturum_no) SELECT COUNT(*) AS oturum, ROUND(AVG((julianday(bit) - julianday(bas)) * 86400) / 60.0, 1) AS ort_sure_dk FROM ozet WHERE aldi = 1;",
      { hint: 'ozet adımına MIN ve MAX(event_time) ekle; süreyi dakika farkı olarak hesapla.' }),
    sq('Aynı kalıbı <b>Kanat Havayolları</b>\'nda kullan: TC-KNA uçağının Aralık 2024 uçuşlarını, bir önceki planlanan varıştan bu yana <b>6 saatten uzun</b> ara varsa yeni “görev bloğu” başlayacak şekilde grupla. Her bloğun ilk kalkışını ve uçuş sayısını getir: <code>blok</code>, <code>ilk_kalkis</code>, <code>ucus</code>. Bloğa göre sırala.',
      "WITH u AS (SELECT flight_id, sched_dep, ROUND((julianday(sched_dep) - julianday(LAG(sched_arr) OVER (ORDER BY sched_dep, flight_id))) * 1440) AS ara FROM hv_flights WHERE tail_no = 'TC-KNA' AND sched_dep >= '2024-12-01' AND sched_dep < '2025-01-01'), i AS (SELECT *, CASE WHEN ara IS NULL OR ara > 360 THEN 1 ELSE 0 END AS yeni FROM u), b AS (SELECT *, SUM(yeni) OVER (ORDER BY sched_dep, flight_id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS blok FROM i) SELECT blok, MIN(sched_dep) AS ilk_kalkis, COUNT(*) AS ucus FROM b GROUP BY blok ORDER BY blok;",
      { ord: true, hint: 'Aynı üç adım: önceki satıra göre süre, eşik işareti, kümülatif toplam.' })
  ]
},
{
  id: 'bs-rfm', lv: 'C1', mod: MOD, min: 22,
  title: 'Büyük sorgu 3: RFM puanlama ve müşteri segmentleri',
  sum: 'Yakınlık, sıklık ve parasal değer için NTILE ile 1–5 puan, puan birleşimlerinden iş segmentleri ve segment raporu.',
  body: `
<h2>Soru</h2>
<p>CRM ekibi kampanya listeleri hazırlayacak: kimler en değerli, kimler kaybedilmek üzere? Cevap RFM: <b>R</b>ecency (son siparişten bu yana gün), <b>F</b>requency (sipariş sayısı), <b>M</b>onetary (toplam harcama).</p>
<h2>Sorgu</h2>
${GIRIS}
<pre class="code">${RFM}</pre>
<h2>Adım adım</h2>
${ADIM([
  ['teslim', 'Sipariş düzeyinde net tutar (satır çoğalması burada çözülür)', 'müşteri 5, sipariş 31, 2024-11-02, 1840.5'],
  ['ham', 'Müşteri başına gün, sipariş sayısı, toplam tutar', 'müşteri 5, 59 gün, 4 sipariş, 6120'],
  ['puan', 'Her boyutu NTILE(5) ile 1–5 arasında puanlar', 'r 4, f 4, m 5'],
  ['segment', 'Puan birleşimlerini kurallara göre adlandırır', 'Şampiyon'],
  ['son SELECT', 'Segment başına sayı, ortalamalar ve ciro payı', 'Şampiyon, 36 müşteri, …, %31,4']
])}
<h2>Tasarım kararları</h2>
<ul>
<li><b>R yönü:</b> Az gün iyidir; bu yüzden r için sıralama azalan (<code>ORDER BY r_gun DESC</code>): en çok gün en düşük dilime düşer.</li>
<li><b>NTILE ve eşitlik:</b> Aynı değerli müşteriler farklı dilimlere düşebilir; sıralamaya customer_id eklemek sonucu her çalıştırmada aynı tutar.</li>
<li><b>Kuralların sırası:</b> CASE ilk doğru koşulda durur; en seçici kural (Şampiyon) en üstte olmalıdır.</li>
</ul>
`,
  ex: [
    sq('RFM\'in ilk iki adımını çalıştır ve <b>F</b> (sipariş sayısı) dağılımını getir: teslim edilmiş sipariş sayısına göre müşteri sayısı: <code>siparis</code>, <code>musteri</code>. Sipariş sayısına göre sırala.',
      "WITH teslim AS (SELECT o.customer_id, o.order_id FROM orders o WHERE o.status = 'delivered'), ham AS (SELECT customer_id, COUNT(*) AS f_siparis FROM teslim GROUP BY customer_id) SELECT f_siparis AS siparis, COUNT(*) AS musteri FROM ham GROUP BY f_siparis ORDER BY siparis;", { ord: true }),
    sq('Segment raporunu değiştir: segment yerine <b>R ve F puanlarının birleşimine</b> göre (ör. r=5, f=4) müşteri sayısını getir; yalnızca en kalabalık 5 birleşim: <code>r</code>, <code>f</code>, <code>musteri</code>. Müşteri sayısına göre azalan, eşitlikte r ve f\'ye göre azalan sırala.',
      `WITH teslim AS (SELECT o.customer_id, o.order_id, o.order_date FROM orders o WHERE o.status = 'delivered'), ham AS (SELECT customer_id, julianday('2025-01-01') - julianday(MAX(order_date)) AS r_gun, COUNT(*) AS f_siparis FROM teslim GROUP BY customer_id), puan AS (SELECT customer_id, NTILE(5) OVER (ORDER BY r_gun DESC, customer_id) AS r, NTILE(5) OVER (ORDER BY f_siparis, customer_id) AS f FROM ham) SELECT r, f, COUNT(*) AS musteri FROM puan GROUP BY r, f ORDER BY musteri DESC, r DESC, f DESC LIMIT 5;`,
      { ord: true }),
    sq('RFM\'i <b>Ilgaz Bank</b> kart harcamalarına uygula: her müşteri için son kart harcamasından 2025-01-01\'e kadar geçen gün, kart harcaması sayısı ve toplam harcama tutarını (pozitif) hesapla; her boyutu NTILE(5) ile puanla ve <b>üç boyutta da 5 puan alan</b> müşteri sayısını getir: <code>sampiyon</code>.',
      "WITH h AS (SELECT a.customer_id, t.txn_time, -t.amount AS tutar FROM bank_txns t JOIN bank_accounts a ON a.account_id = t.account_id WHERE t.txn_type = 'kart_harcama'), ham AS (SELECT customer_id, julianday('2025-01-01') - julianday(MAX(date(txn_time))) AS r_gun, COUNT(*) AS f, SUM(tutar) AS m FROM h GROUP BY customer_id), p AS (SELECT customer_id, NTILE(5) OVER (ORDER BY r_gun DESC, customer_id) AS r5, NTILE(5) OVER (ORDER BY f, customer_id) AS f5, NTILE(5) OVER (ORDER BY m, customer_id) AS m5 FROM ham) SELECT COUNT(*) AS sampiyon FROM p WHERE r5 = 5 AND f5 = 5 AND m5 = 5;",
      { hint: 'Olay tablosu değişiyor (bank_txns → bank_accounts → müşteri), kalıp aynı kalıyor.' }),
    mc('<p>RFM sorgusundaki CASE ifadesinde <code>Uykuda</code> kuralını (r &lt;= 2) <code>Kaybedilmek üzere</code> kuralının (r &lt;= 2 AND f &gt;= 3) <b>üstüne</b> taşırsan ne olur?</p>', ['Sonuç değişmez; CASE tüm kuralları birlikte değerlendirir', 'Kaybedilmek üzere segmenti boşalır; çünkü bu müşteriler ilk doğru olan Uykuda kuralında yakalanır', 'Sorgu hata verir; CASE kuralları alfabetik olmalıdır', 'Uykuda segmenti boşalır, çünkü sonraki kural onu ezer'], 1,
      'CASE yukarıdan aşağı ilk doğru koşulda durur. Daha genel bir kuralı daha özel bir kuralın üstüne koymak özel kuralı erişilemez hale getirir.')
  ]
},
{
  id: 'bs-ops', lv: 'C1', mod: MOD, min: 22,
  title: 'Büyük sorgu 4: havayolu günlük operasyon panosu',
  sum: 'Uçuş, gün ve neden düzeylerini ayrı CTE\'lerde kurup tek pano satırında birleştirmek; günün başlıca rötar nedeni ve 7 günlük hareketli dakiklik.',
  body: `
<h2>Soru</h2>
<p>Kanat Havayolları operasyon merkezi her sabah bir pano açıyor: Dün kaç uçuş planlandı, kaçı iptal edildi, zamanında kalkış oranı ne, son yedi günün eğilimi ne, rötarların başlıca nedeni neydi? Bu soruların her biri farklı bir tanecikte hesaplanır ve sonunda gün düzeyinde birleşir.</p>
<h2>Sorgu</h2>
${GIRIS}
<pre class="code">${OPS}</pre>
<h2>Adım adım</h2>
${ADIM([
  ['ucus', 'Aralık uçuşları; gün, durum ve kalkış gecikmesi', '2341, 2024-12-05, landed, 22'],
  ['gunluk', 'Gün düzeyi sayımlar; kalkan = gecikmesi bilinen uçuş', '2024-12-05, 27, 1, 15, 26'],
  ['neden', 'Gün × neden düzeyinde rötar dakikası', '2024-12-05, hava, 180'],
  ['baslica', 'Her gün için nedenleri dakikaya göre sıralar', 'hava, 180, sıra 1'],
  ['son SELECT', 'Günlük satıra en başlıca nedeni LEFT JOIN ile ekler; hareketli oran WINDOW ile', '2024-12-05, 27, 1, 57.7, 61.2, hava, 180']
])}
<h2>İki önemli ayrıntı</h2>
<ul>
<li><b>Hareketli oran:</b> 7 günün oranlarının ortalaması değil, 7 günün <i>toplam</i> zamanında kalkışının toplam kalkışa oranıdır: <code>SUM(zamaninda) OVER w / SUM(kalkan) OVER w</code>.</li>
<li><b>Adlandırılmış pencere:</b> <code>WINDOW w AS (...)</code> aynı çerçeveyi iki kez yazmaktan kurtarır. SQL Server 2022 öncesi ve bazı programlar desteklemez; o durumda çerçeve her OVER içinde tekrarlanır.</li>
</ul>
<div class="tip"><b>Neden LEFT JOIN?</b>Hiç rötar yaşanmayan bir günde <code>baslica</code> satırı yoktur. INNER JOIN o günü panodan düşürür; LEFT JOIN günü korur ve nedeni boş bırakır.</div>
`,
  ex: [
    sq('Panonun <b>gunluk</b> adımını Kasım 2024 için çalıştır ve iptal oranı en yüksek 3 günü getir: <code>gun</code>, <code>planlanan</code>, <code>iptal</code>. İptale göre azalan, eşitlikte güne göre sırala.',
      "WITH ucus AS (SELECT date(sched_dep) AS gun, status FROM hv_flights WHERE sched_dep >= '2024-11-01' AND sched_dep < '2024-12-01') SELECT gun, COUNT(*) AS planlanan, SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS iptal FROM ucus GROUP BY gun ORDER BY iptal DESC, gun LIMIT 3;", { ord: true }),
    sq('Panoyu <b>havalimanı</b> boyutuna genişlet: Aralık 2024 için her kalkış havalimanının uçuş sayısı, zamanında kalkış oranı (yüzde, 1 basamak) ve en çok dakika getiren rötar nedenini getir (eşitlikte alfabetik): <code>origin</code>, <code>ucus</code>, <code>otp</code>, <code>baslica_neden</code>. Uçuş sayısına göre azalan, eşitlikte origin\'e göre sırala; yalnızca en az 50 uçuşu olanlar.',
      `WITH ucus AS (SELECT f.flight_id, r.origin, ${DLY} AS gecikme FROM hv_flights f JOIN hv_routes r ON r.route_id = f.route_id WHERE f.sched_dep >= '2024-12-01' AND f.sched_dep < '2025-01-01'), hav AS (SELECT origin, COUNT(*) AS ucus, SUM(CASE WHEN gecikme <= 15 THEN 1 ELSE 0 END) AS zamaninda, COUNT(gecikme) AS kalkan FROM ucus GROUP BY origin), neden AS (SELECT u.origin, d.reason, SUM(d.minutes) AS dakika FROM hv_delays d JOIN ucus u ON u.flight_id = d.flight_id GROUP BY u.origin, d.reason), bas AS (SELECT origin, reason, ROW_NUMBER() OVER (PARTITION BY origin ORDER BY dakika DESC, reason) AS sira FROM neden) SELECT h.origin, h.ucus, ROUND(100.0 * h.zamaninda / h.kalkan, 1) AS otp, b.reason AS baslica_neden FROM hav h LEFT JOIN bas b ON b.origin = h.origin AND b.sira = 1 WHERE h.ucus >= 50 ORDER BY h.ucus DESC, h.origin;`,
      { ord: true, hint: 'Aynı dört adım; gun yerine origin ile grupla.' }),
    sq('Panoya “dünle kıyas” ekle: Aralık 2024\'ün her günü için zamanında kalkış oranını (yüzde, 1 basamak) ve bir önceki güne göre farkını (yüzde puan, 1 basamak; ilk günde NULL) getir: <code>gun</code>, <code>otp</code>, <code>fark</code>. Güne göre sırala.',
      `WITH ucus AS (SELECT date(f.sched_dep) AS gun, ${DLY} AS gecikme FROM hv_flights f WHERE f.sched_dep >= '2024-12-01' AND f.sched_dep < '2025-01-01'), g AS (SELECT gun, 100.0 * SUM(CASE WHEN gecikme <= 15 THEN 1 ELSE 0 END) / COUNT(gecikme) AS otp FROM ucus GROUP BY gun) SELECT gun, ROUND(otp, 1) AS otp, ROUND(otp - LAG(otp) OVER (ORDER BY gun), 1) AS fark FROM g ORDER BY gun;`,
      { ord: true, hint: 'Farkı yuvarlanmamış oranlar üzerinden hesapla, yuvarlamayı en sonda yap.' })
  ]
},
{
  id: 'bs-aml', lv: 'C2', mod: MOD, min: 25,
  title: 'Büyük sorgu 5: bankada şüpheli işlem kural motoru',
  sum: 'Her kuralı ayrı bir CTE olarak yazmak, UNION ALL ile alarm tablosu kurmak, hesap başına risk puanı ve öncelik sırası.',
  body: `
<h2>Soru</h2>
<p>Ilgaz Bank uyum ekibi her sabah incelenecek hesapların listesini istiyor. Kurallar iş biriminden gelir ve sık değişir; bu yüzden sorgu, her kuralın ayrı bir blok olduğu ve kolayca eklenip çıkarılabildiği bir yapıda yazılır.</p>
<h2>Sorgu</h2>
${GIRIS}
<pre class="code">${AML}</pre>
<h2>Adım adım</h2>
${ADIM([
  ['harcama', 'Kart harcamaları; tutar artı, saat ayrı sütunda', '18802, 100231, 02:14, 27500'],
  ['ort', 'Hesabın kendi harcama ortalaması ve adedi', '100231, 1840, 41'],
  ['k1 / k2 / k3', 'Her kural kendi koşuluyla aynı biçimde (hesap, işlem, kural, puan) satır üretir', '100231, 18802, gece_yuksek, 3'],
  ['alarm', 'Kural çıktıları UNION ALL ile alt alta', '…'],
  ['hesap', 'Hesap başına toplam risk ve tetiklenen kural sayısı', '100231, 5, 2, 2'],
  ['son SELECT', 'Müşteri bilgisi ve DENSE_RANK ile öncelik', '100231, …, öncelik 1']
])}
<h2>Neden bu yapı?</h2>
<ul>
<li><b>Aynı şema:</b> Her kural CTE'si aynı dört sütunu döndürür; UNION ALL bu sayede çalışır. Yeni bir kural, yeni bir CTE ve alarm satırına bir <code>UNION ALL SELECT * FROM k4</code> eklemekten ibarettir.</li>
<li><b>Kişiye göre normal:</b> Kural 2 sabit bir eşik yerine hesabın kendi ortalamasını kullanır; büyük harcama yapan bir müşteri her harcamasında alarm üretmez.</li>
<li><b>UNION ALL, UNION değil:</b> Aynı işlem iki kurala takılırsa iki satır olmalıdır; puanlar toplanır. UNION tekrar eden satırları silerek puanı düşürürdü.</li>
</ul>
<div class="warn"><b>Kural 3'ün maliyeti</b>Kendi kendine birleştirme ve zaman aralığı koşulu büyük tablolarda pahalıdır. Gerçek sistemlerde (account_id, txn_time) üzerinde indeks ya da LAG ile yeniden yazım tercih edilir. Alıştırmalardan biri bunu istiyor.</div>
`,
  ex: [
    sq('Kural motorunun <b>k1</b> ve <b>k2</b> kurallarını çalıştır ve her kuralın kaç alarm ürettiğini getir: <code>kural</code>, <code>alarm</code>.',
      "WITH harcama AS (SELECT t.txn_id, t.account_id, -t.amount AS tutar, CAST(strftime('%H', t.txn_time) AS INTEGER) AS saat FROM bank_txns t WHERE t.txn_type = 'kart_harcama'), ort AS (SELECT account_id, AVG(tutar) AS ort_tutar, COUNT(*) AS adet FROM harcama GROUP BY account_id), k1 AS (SELECT account_id, txn_id, 'gece_yuksek' AS kural FROM harcama WHERE saat BETWEEN 1 AND 4 AND tutar > 20000), k2 AS (SELECT h.account_id, h.txn_id, 'ortalama_8x' AS kural FROM harcama h JOIN ort o ON o.account_id = h.account_id WHERE o.adet >= 5 AND h.tutar > 8 * o.ort_tutar) SELECT kural, COUNT(*) AS alarm FROM (SELECT * FROM k1 UNION ALL SELECT * FROM k2) a GROUP BY kural;"),
    sq('Yeni bir kural ekle: <b>k4 — aylık harcama patlaması</b>. Bir hesabın herhangi bir aydaki toplam kart harcaması, o hesabın aylık ortalamasının 2,5 katını aşıyorsa alarm üretsin (en az 6 farklı ayda harcaması olan hesaplar). Alarm veren hesap sayısını getir: <code>hesap</code>.',
      "WITH h AS (SELECT account_id, strftime('%Y-%m', txn_time) AS ay, -amount AS tutar FROM bank_txns WHERE txn_type = 'kart_harcama'), af AS (SELECT account_id, ay, SUM(tutar) AS toplam FROM h GROUP BY account_id, ay), o AS (SELECT account_id, AVG(toplam) AS ort, COUNT(*) AS ay_sayisi FROM af GROUP BY account_id) SELECT COUNT(DISTINCT af.account_id) AS hesap FROM af JOIN o ON o.account_id = af.account_id WHERE o.ay_sayisi >= 6 AND af.toplam > 2.5 * o.ort;",
      { hint: 'Önce hesap × ay toplamı, sonra hesabın aylık ortalaması; ikisini birleştirip eşiği uygula. Yeni kural, alarm tablosuna aynı dört sütunla eklenebilecek biçimde düşünülmeli.' }),
    sq('<b>k3</b> kuralını pahalı kendi kendine birleştirme yerine <b>LAG</b> ile yeniden yaz: aynı hesapta bir önceki e-ticaret kart harcamasından en fazla 10 dakika sonra gelen e-ticaret harcamalarını say: <code>alarm</code>.',
      "WITH e AS (SELECT account_id, txn_id, txn_time, LAG(txn_time) OVER (PARTITION BY account_id ORDER BY txn_time, txn_id) AS onceki FROM bank_txns WHERE txn_type = 'kart_harcama' AND merchant_category = 'e_ticaret') SELECT COUNT(*) AS alarm FROM e WHERE onceki IS NOT NULL AND ROUND((julianday(txn_time) - julianday(onceki)) * 1440) <= 10;",
      { hint: 'Yalnızca e-ticaret harcamalarını al, hesap içinde zaman sırasına koy, bir önceki zamanla dakika farkını hesapla.' }),
    mc('<p>Alarm tablosu UNION ALL yerine UNION ile kurulursa risk puanları nasıl etkilenir?</p>', ['Hiç etkilenmez; iki işlem aynı sonucu verir', 'Farklı kurallardan gelen satırlar kural adı farklı olduğu için yine iki ayrı satır kalır; ancak aynı kuralın aynı işlem için ürettiği tekrarlar silinir', 'Tüm puanlar ikiye katlanır', 'Sorgu hata verir; UNION puan sütununu kabul etmez'], 1,
      'UNION tüm sütunları aynı olan satırları tekilleştirir. Kural adı sütunu farklı olduğu için iki kurala takılan işlem iki satır olarak kalır. Ama bir kural aynı işlem için iki satır üretiyorsa (k3\'teki gibi birden çok eşleşme) UNION bunları teke indirir; bu davranış istenip istenmediğine göre bilinçli seçilmelidir.')
  ]
},
{
  id: 'bs-scd', lv: 'C2', mod: MOD, min: 25,
  title: 'Büyük sorgu 6: SCD 2 fiyat boyutu ve nokta-zaman birleştirme',
  sum: 'Fiyat geçmişinden geçerlilik aralıkları kurmak, satışları satış anındaki fiyatla eşleştirmek ve sapmaları ölçmek.',
  body: `
<h2>Soru</h2>
<p>Finans ekibi soruyor: “Satış satırlarındaki birim fiyat, o gün geçerli liste fiyatıyla tutarlı mı?” Ürün tablosu yalnızca <b>güncel</b> fiyatı tutar; geçmişi <code>price_updates</code> tablosundaki güncellemelerden geri kurmak gerekir. Bu, veri ambarlarında “yavaş değişen boyut Tip 2” ve “nokta-zaman (as-of) birleştirme” olarak bilinir.</p>
<h2>Sorgu</h2>
${GIRIS}
<pre class="code">${SCD}</pre>
<h2>Adım adım</h2>
${ADIM([
  ['olay', 'Her fiyatın başladığı an: başlangıç fiyatı (çok eski bir tarih) ve her güncelleme', '31, 520, 2000-01-01 / 31, 550, 2024-10-11'],
  ['aralik', 'LEAD ile bir sonraki olayın başlangıcı = bu fiyatın bitişi', '31, 520, 2000-01-01 → 2024-10-11'],
  ['boyut', 'Açık uçlu aralığa 9999 tarihi, güncel satıra bayrak', '31, 550, 2024-10-11 → 9999-12-31, 1'],
  ['satis', 'Ekim 2024 sonrası satış satırları', '31, 2024-10-20, 549, 1'],
  ['son SELECT', 'Satışı, tarihi aralığın içine düşen boyut satırıyla birleştirir', '31, 4, 548.75, 535, 3']
])}
<h2>Yarı açık aralık burada da kritik</h2>
<p>Birleştirme koşulu <code>s.order_date &gt;= b.baslangic AND s.order_date &lt; b.bitis</code> şeklindedir. Bitişi dahil etseydin (<code>&lt;=</code>), tam güncelleme anına denk gelen bir satış iki fiyat satırıyla eşleşir ve satır çoğalırdı.</p>
<div class="note"><b>Bilerek bırakılmış bir basitleştirme</b>Başlangıç fiyatı, products tablosundaki güncel fiyattan türetilemez; gerçek bir sistemde ilk fiyat ayrı bir kaynaktan gelir. Bu örnekte ilk aralık için güncel fiyat kullanıldı; alıştırmalardan biri bunu düzeltiyor.</div>
`,
  ex: [
    sq('SCD boyutunun ilk üç adımını çalıştır ve <b>birden fazla fiyat dönemi</b> olan ürünlerin dönem sayısını ve güncel fiyatını getir: <code>product_id</code>, <code>donem</code>, <code>guncel_fiyat</code>. Ürüne göre sırala.',
      "WITH olay AS (SELECT product_id, price AS fiyat, '2000-01-01 00:00:00' AS baslangic FROM products WHERE product_id IN (SELECT product_id FROM price_updates) UNION ALL SELECT product_id, new_price, updated_at FROM price_updates), aralik AS (SELECT product_id, fiyat, baslangic, LEAD(baslangic) OVER (PARTITION BY product_id ORDER BY baslangic) AS bitis FROM olay) SELECT product_id, COUNT(*) AS donem, MAX(CASE WHEN bitis IS NULL THEN fiyat END) AS guncel_fiyat FROM aralik GROUP BY product_id HAVING COUNT(*) > 1 ORDER BY product_id;",
      { ord: true }),
    sq('Basitleştirmeyi düzelt: ilk aralığın fiyatı olarak güncel fiyat yerine <b>ürünün ilk güncellemeden önceki en son satış birim fiyatını</b> kullan; bu fiyatın bulunduğu ürünler için ilk dönem fiyatını getir: <code>product_id</code>, <code>ilk_fiyat</code>. Ürüne göre sırala.',
      "WITH ilk_g AS (SELECT product_id, MIN(updated_at) AS ilk FROM price_updates GROUP BY product_id), once AS (SELECT oi.product_id, oi.unit_price, o.order_date, oi.item_id, ROW_NUMBER() OVER (PARTITION BY oi.product_id ORDER BY o.order_date DESC, oi.item_id DESC) AS rn FROM order_items oi JOIN orders o ON o.order_id = oi.order_id JOIN ilk_g g ON g.product_id = oi.product_id WHERE o.order_date < g.ilk) SELECT product_id, unit_price AS ilk_fiyat FROM once WHERE rn = 1 ORDER BY product_id;",
      { ord: true, hint: 'Her ürünün ilk güncelleme anından önceki satışlarını tarih sırasına koy (azalan) ve ilkini al.' }),
    sq('Nokta-zaman birleştirmeyi <b>Kanat Havayolları</b>\'nda kullan: her rezervasyonun yapıldığı anda yolcunun üyelik seviyesini bilmek istiyoruz; ancak seviye tablosunda geçmiş yok. Bunun yerine şu soruyu cevapla: her rezervasyon için, <b>rezervasyon anına kadar</b> o üyenin gerçekleşmiş (flown) uçuş sayısını hesapla (rezervasyon anından önce kalkmış uçuşlar) ve bu sayıya göre rezervasyonları grupla: 0, 1–4, 5+: <code>grup</code>, <code>rezervasyon</code>, <code>ort_ucret</code> (tam sayı).',
      "WITH r AS (SELECT b.booking_id, b.passenger_id, b.booked_at, b.price FROM hv_bookings b), g AS (SELECT r.booking_id, r.price, COUNT(f.flight_id) AS onceki FROM r LEFT JOIN hv_bookings b2 ON b2.passenger_id = r.passenger_id AND b2.status = 'flown' LEFT JOIN hv_flights f ON f.flight_id = b2.flight_id AND f.sched_dep < r.booked_at GROUP BY r.booking_id, r.price) SELECT CASE WHEN onceki = 0 THEN '0' WHEN onceki <= 4 THEN '1-4' ELSE '5+' END AS grup, COUNT(*) AS rezervasyon, ROUND(AVG(price)) AS ort_ucret FROM g GROUP BY CASE WHEN onceki = 0 THEN '0' WHEN onceki <= 4 THEN '1-4' ELSE '5+' END;",
      { hint: 'Koşul her rezervasyonun kendi zamanına göre değişir: “f.sched_dep < r.booked_at”. Saymak istediğin uçuşu LEFT JOIN\'in ON kısmında süz; WHERE\'e yazarsan hiç geçmişi olmayan rezervasyonlar kaybolur.' }),
    mc('<p>Nokta-zaman birleştirmede koşul <code>s.order_date BETWEEN b.baslangic AND b.bitis</code> yazılırsa ne olur?</p>', ['Hiçbir fark olmaz; BETWEEN yarı açık aralıktır', 'Tam bir güncelleme anına denk gelen satış hem eski hem yeni fiyat satırıyla eşleşir ve satır çoğalır', 'Açık uçlu (güncel) aralıklar eşleşmez', 'Sorgu yalnızca ilk fiyat dönemini döndürür'], 1,
      'BETWEEN iki ucu da dahil eder. Bir aralığın bitişi bir sonrakinin başlangıcıdır; o ana denk gelen satış iki aralığa birden düşer. Doğrusu: başlangıç dahil, bitiş hariç.')
  ]
}
];
const at = L.findIndex(l => l.id === 'ileri-desenler');
L.splice(at < 0 ? L.length : at + 1, 0, ...lessons);

/* Patika: Büyük Sorgular (ileri seviye) */
const P = window.SQLP_PATHS = window.SQLP_PATHS || [];
P.push({ id: 'buyuk', name: 'İleri SQL: Büyük Sorgular', short: 'BS', color: '#7C3AED',
  desc: 'Gerçek işten çok adımlı, uzun sorgular: kohort matrisi, oturumlama, RFM, operasyon panosu, kural motoru, SCD 2.',
  long: 'Pencere fonksiyonları ve CTE\'leri bildikten sonraki adım: bunları 5–10 adımlı boru hatlarında birlikte kullanmak. Her ders baştan sona çalışan bir sorguyu adım adım açıklar, sonra onu değiştirmeni, genişletmeni ve başka bir veri setine taşımanı ister. Üç veri seti (Anadolu Market, Ilgaz Bank, Kanat Havayolları) birlikte kullanılır.',
  skills: ['Çok adımlı CTE tasarımı', 'Tanecik yönetimi', 'İşaretle ve kümülatif topla', 'Kural motoru', 'Nokta-zaman birleştirme', 'Hata ayıklama'],
  lessons: ['cte', 'window-intro', 'frames', 'ardisik-seri', 'bs-giris', 'bs-kohort', 'bs-oturum', 'bs-rfm', 'bs-ops', 'bs-aml', 'bs-scd', 'ileri-desenler'],
  comp: [
    { t: 'Ön koşul', d: 'CTE ve pencere fonksiyonları', l: ['cte', 'window-intro', 'frames', 'ardisik-seri'] },
    { t: 'Yöntem', d: 'Büyük sorguyu okumak, yazmak, doğrulamak', l: ['bs-giris'] },
    { t: 'Müşteri analitiği', d: 'Kohort, oturum, RFM', l: ['bs-kohort', 'bs-oturum', 'bs-rfm'] },
    { t: 'Operasyon ve risk', d: 'Pano ve kural motoru', l: ['bs-ops', 'bs-aml'] },
    { t: 'Veri ambarı', d: 'SCD 2 ve nokta-zaman birleştirme', l: ['bs-scd'] }
  ],
  beyond: ['dbt ile bu sorguları modellere bölmek', 'Sorgu planı okuma ve indeks tasarımı', 'Veri kalitesi testleri']
});
const PA = {}; P.forEach(p => PA[p.id] = p);
['uzman', 'analist', 'muhendis'].forEach(pid => { const p = PA[pid]; if (!p) return; const i = p.lessons.indexOf('ileri-desenler'); const ids = ['bs-giris', 'bs-kohort', 'bs-oturum', 'bs-rfm', 'bs-ops', 'bs-aml', 'bs-scd'].filter(x => !p.lessons.includes(x)); if (i >= 0) p.lessons.splice(i, 0, ...ids); else p.lessons.push(...ids); });
})();
