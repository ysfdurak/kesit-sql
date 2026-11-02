/* Kesit SQL içerik 13: performans laboratuvarı ve patika sonu bitirme projeleri */
(function () {
const L = window.SQLP_LESSONS;
const after = (id, lessons) => { const i = L.findIndex(l => l.id === id); L.splice(i < 0 ? L.length : i + 1, 0, ...lessons); };
const NR = src => CODE(src, null, { norun: true });
const mc = (q, o, a, why) => ({ t: 'mc', q, o, a, why });
const st = (n, q, sol, o) => Object.assign({ t: 'sql', q: '<p><b>Adım ' + n + '.</b> ' + q + '</p>', sol }, o || {});
const NET = 'oi.quantity * oi.unit_price * (1 - oi.discount)';
const NOBQ = ['tsql', 'pg', 'mysql', 'oracle', 'sqlite'];

/* ---------------- Performans laboratuvarı ---------------- */
after('sargable', [{
  id: 'performans-lab', lv: 'C1', mod: 'Performans', min: 15,
  title: 'Performans laboratuvarı: 42.000 satırlık tabloda indeksin etkisini ölç',
  sum: 'Aynı sorguyu indeks öncesi ve sonrası çalıştır, süreyi ve sorgu planını karşılaştır.',
  body: `
<h2>Deney düzeneği</h2>
<p><code>bank_txns</code> tablosunda yaklaşık 42.000 hesap hareketi var. Tabloda yalnızca birincil anahtar ve <code>account_id</code> üzerinde indeks bulunuyor; <code>txn_time</code>, <code>txn_type</code> ve <code>merchant_category</code> indekssiz. Her kod kutusunun altında sorgunun tarayıcıda kaç milisaniye sürdüğü yazar. Kutuları sırayla çalıştır ve süreleri karşılaştır.</p>
<div class="note"><b>Ölçek</b>Tarayıcıdaki motor gerçek bir sunucudan yavaştır ve tablo “büyük” sayılmaz; gerçek sistemlerde milyonlarca satırda fark saniyelerden dakikalara çıkar. Burada amaç farkın <b>yönünü</b> ve planın nasıl değiştiğini görmek.</div>
<h3>1) İndekssiz: tarih aralığı</h3>
<pre class="code">SELECT COUNT(*) AS islem, ROUND(SUM(-amount), 0) AS harcama
FROM bank_txns
WHERE txn_time >= '2024-12-24' AND txn_time < '2024-12-25'
  AND txn_type = 'kart_harcama';</pre>
<pre class="code" data-na="tsql pg mysql oracle bq">EXPLAIN QUERY PLAN
SELECT COUNT(*) FROM bank_txns
WHERE txn_time >= '2024-12-24' AND txn_time < '2024-12-25';</pre>
<p>Planda <code>SCAN bank_txns</code> görürsün: tüm tablo okunuyor.</p>
<h3>2) İndeks ekle, aynı sorguyu tekrar çalıştır</h3>
<pre class="code" data-na="bq">CREATE INDEX ix_txn_time ON bank_txns (txn_time);

SELECT COUNT(*) AS islem, ROUND(SUM(-amount), 0) AS harcama
FROM bank_txns
WHERE txn_time >= '2024-12-24' AND txn_time < '2024-12-25'
  AND txn_type = 'kart_harcama';</pre>
<pre class="code" data-na="tsql pg mysql oracle bq">CREATE INDEX ix_txn_time ON bank_txns (txn_time);
EXPLAIN QUERY PLAN
SELECT COUNT(*) FROM bank_txns
WHERE txn_time >= '2024-12-24' AND txn_time < '2024-12-25';</pre>
<p>Plan artık <code>SEARCH bank_txns USING INDEX ix_txn_time</code> diyor: yalnızca ilgili aralık okunuyor.</p>
<h3>3) Fonksiyon indeksi bozar</h3>
<pre class="code" data-na="tsql pg mysql oracle bq">CREATE INDEX ix_txn_time ON bank_txns (txn_time);
EXPLAIN QUERY PLAN
SELECT COUNT(*) FROM bank_txns
WHERE date(txn_time) = '2024-12-24';</pre>
<p>İndeks var ama sütun <code>date()</code> fonksiyonunun içinde olduğu için yine tüm tablo taranır.</p>
<h3>4) Bileşik ve kaplayan indeks</h3>
<pre class="code" data-na="tsql pg mysql oracle bq">CREATE INDEX ix_tip_zaman ON bank_txns (txn_type, txn_time, amount);
EXPLAIN QUERY PLAN
SELECT SUM(amount) FROM bank_txns
WHERE txn_type = 'maas' AND txn_time >= '2024-06-01' AND txn_time < '2024-07-01';</pre>
<p><code>USING COVERING INDEX</code>: sorgunun ihtiyaç duyduğu tüm sütunlar indekste olduğu için tabloya hiç gidilmez. Eşitlik koşulu olan sütun (<code>txn_type</code>) önce, aralık koşulu olan (<code>txn_time</code>) sonra gelir.</p>
<h2>Gerçek programlarda plan okumak</h2>
${NR("-- SQL Server\nSET STATISTICS IO, TIME ON;\n-- Yürütme planı: Ctrl+M (gerçek plan), Index Seek / Index Scan / Key Lookup\n\n-- PostgreSQL\nEXPLAIN (ANALYZE, BUFFERS) SELECT ...;   -- Seq Scan, Index Scan, Index Only Scan, Bitmap Heap Scan\n\n-- MySQL\nEXPLAIN ANALYZE SELECT ...;             -- type: ALL (tam tarama), range, ref, const\n\n-- Oracle\nEXPLAIN PLAN FOR SELECT ...; SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY);  -- TABLE ACCESS FULL, INDEX RANGE SCAN\n\n-- BigQuery: yürütme ayrıntıları sekmesi ve taranan bayt; indeks yerine bölümleme/kümeleme")}
`,
  ex: [
    { t: 'sql', base: 'sqlite', dl: ['sqlite'], q: '<p>SQLite\'ta: <code>bank_txns</code> üzerinde <code>merchant_category</code> sütununa indeks oluştur (<code>ix_kategori</code>), sonra <code>EXPLAIN QUERY PLAN</code> ile şu sorgunun planını getir: <code>SELECT COUNT(*) FROM bank_txns WHERE merchant_category = \'elektronik\'</code>. Plan indeks kullandığını göstermeli.</p>', sol: "CREATE INDEX ix_kategori ON bank_txns (merchant_category); EXPLAIN QUERY PLAN SELECT COUNT(*) FROM bank_txns WHERE merchant_category = 'elektronik';" },
    mc('<p><code>WHERE txn_type = \'maas\' AND txn_time &gt;= ...</code> sorgusu için bileşik indeksin sütun sırası nasıl olmalı?</p>', ['(txn_time, txn_type)', '(txn_type, txn_time)', 'Fark etmez', 'İki ayrı indeks şart'], 1, 'Eşitlik koşulu olan sütun önce gelirse indeks içinde tek bir aralık okunur.'),
    mc('<p>Planda “USING COVERING INDEX” ne anlama gelir?</p>', ['İndeks bozuk', 'Sorgunun ihtiyaç duyduğu tüm sütunlar indekste; tabloya gidilmiyor', 'Tablo kilitli', 'Sorgu önbellekten geldi'], 1),
    mc('<p>İndeks varken <code>WHERE date(txn_time) = \'2024-12-24\'</code> neden tam tarama yapar?</p>', ['date() yavaş bir fonksiyondur', 'Sütun fonksiyonun içinde olduğu için indeksteki sıralı değerler doğrudan kullanılamaz', 'Tarih metin olduğu için', 'İndeks yalnızca sayılarda çalışır'], 1)
  ]
}]);

/* ---------------- Bitirme projeleri ---------------- */
const PRJ = 'Bitirme Projeleri';
const projects = [{
  id: 'proje-analist', lv: 'B2', mod: PRJ, min: 60,
  title: 'Bitirme projesi (Veri Analisti): Ilgaz Bank müşteri ve harcama analizi',
  sum: 'Pazarlama ekibi için segment profili, harcama trendi, kategori tercihleri ve özet tablo.',
  body: `
<h2>Senaryo</h2>
<p>Ilgaz Bank'ın pazarlama direktörü yeni yıl kampanyası için senden bir analiz istiyor: <i>“Hangi segment ne kadar harcıyor, ne zaman ve nerede? Maaşını bize yatıranlar daha mı çok harcıyor? Bize segment bazında tek sayfalık bir özet ver.”</i></p>
<h2>Teslim edilecekler</h2>
<ol>
<li>Segment profili (müşteri, yaş, risk)</li>
<li>Aylık harcama trendi ve büyüme</li>
<li>Segmentlere göre en çok harcanan kategori</li>
<li>Maaş müşterisi olanlarla olmayanların karşılaştırması</li>
<li>Kanal tercihleri</li>
<li>Segment bazında yönetici özeti</li>
</ol>
<div class="tip"><b>Çalışma yöntemi</b>Her adımda önce sonucun bir satırının neyi temsil edeceğini belirle (segment mi, müşteri mi, ay mı?). Ara hesapları CTE ile adlandır. Bitirdiğinde adımların sorgularını bir dosyada topla: bu senin portföy işin olur.</div>
<p>Tablolar: <code>bank_customers</code>, <code>bank_accounts</code>, <code>bank_txns</code>. Kart harcamaları <code>txn_type = 'kart_harcama'</code>, tutarlar eksi işaretlidir.</p>
`,
  ex: [
    st(1, 'Segment profili: her segment için müşteri sayısı, 2024 sonundaki ortalama yaş (doğum yılından, 1 basamak) ve ortalama risk puanı (2 basamak): <code>segment</code>, <code>musteri</code>, <code>ort_yas</code>, <code>ort_risk</code>.', "SELECT segment, COUNT(*) AS musteri, ROUND(AVG(2024 - CAST(SUBSTR(birth_date, 1, 4) AS INTEGER)), 1) AS ort_yas, ROUND(AVG(risk_score), 2) AS ort_risk FROM bank_customers GROUP BY segment;"),
    st(2, 'Aylık kart harcaması (pozitif, tam sayı) ve önceki aya göre değişim (%, 1 basamak; ilk ayda NULL): <code>ay</code>, <code>harcama</code>, <code>degisim</code>. Aya göre sırala.', "WITH m AS (SELECT strftime('%Y-%m', txn_time) AS ay, SUM(-amount) AS h FROM bank_txns WHERE txn_type = 'kart_harcama' GROUP BY strftime('%Y-%m', txn_time)) SELECT ay, ROUND(h, 0) AS harcama, ROUND(100.0 * (h - LAG(h) OVER (ORDER BY ay)) / LAG(h) OVER (ORDER BY ay), 1) AS degisim FROM m ORDER BY ay;", { ord: true }),
    st(3, 'Her segmentte en çok harcama yapılan işyeri kategorisi (eşitlikte alfabetik): <code>segment</code>, <code>merchant_category</code>, <code>harcama</code> (tam sayı).', "WITH h AS (SELECT c.segment, t.merchant_category, SUM(-t.amount) AS harcama FROM bank_txns t JOIN bank_accounts a ON a.account_id = t.account_id JOIN bank_customers c ON c.customer_id = a.customer_id WHERE t.txn_type = 'kart_harcama' GROUP BY c.segment, t.merchant_category), r AS (SELECT segment, merchant_category, harcama, ROW_NUMBER() OVER (PARTITION BY segment ORDER BY harcama DESC, merchant_category) AS rn FROM h) SELECT segment, merchant_category, ROUND(harcama, 0) AS harcama FROM r WHERE rn = 1;"),
    st(4, 'Bireysel segmentte maaş müşterisi olanlar (en az bir <code>maas</code> hareketi) ile olmayanların müşteri sayısı ve müşteri başına ortalama yıllık kart harcaması (tam sayı; harcaması olmayan müşteri 0 sayılır): <code>grup</code> (\'maaşlı\' / \'maaşsız\'), <code>musteri</code>, <code>ort_harcama</code>.', "WITH c AS (SELECT cu.customer_id, MAX(CASE WHEN t.txn_type = 'maas' THEN 1 ELSE 0 END) AS maasli, COALESCE(SUM(CASE WHEN t.txn_type = 'kart_harcama' THEN -t.amount END), 0) AS harcama FROM bank_customers cu LEFT JOIN bank_accounts a ON a.customer_id = cu.customer_id LEFT JOIN bank_txns t ON t.account_id = a.account_id WHERE cu.segment = 'Bireysel' GROUP BY cu.customer_id) SELECT CASE WHEN maasli = 1 THEN 'maaşlı' ELSE 'maaşsız' END AS grup, COUNT(*) AS musteri, ROUND(AVG(harcama), 0) AS ort_harcama FROM c GROUP BY CASE WHEN maasli = 1 THEN 'maaşlı' ELSE 'maaşsız' END;"),
    st(5, 'Kart harcamalarında segment ve kanal kırılımında işlem payı: her segmentin işlemlerinin yüzde kaçı hangi kanaldan (%, 1 basamak): <code>segment</code>, <code>channel</code>, <code>pay</code>.', "WITH k AS (SELECT c.segment, t.channel, COUNT(*) AS adet FROM bank_txns t JOIN bank_accounts a ON a.account_id = t.account_id JOIN bank_customers c ON c.customer_id = a.customer_id WHERE t.txn_type = 'kart_harcama' GROUP BY c.segment, t.channel) SELECT segment, channel, ROUND(100.0 * adet / SUM(adet) OVER (PARTITION BY segment), 1) AS pay FROM k;"),
    st(6, 'Yönetici özeti: segment başına müşteri sayısı, maaş müşterisi oranı (%, 1 basamak), müşteri başına yıllık kart harcaması (tam sayı) ve pazarlama izni veren müşteri oranı (%, 1 basamak): <code>segment</code>, <code>musteri</code>, <code>maas_orani</code>, <code>harcama_kisi</code>, <code>izin_orani</code>.', "WITH c AS (SELECT cu.customer_id, cu.segment, cu.kvkk_consent, MAX(CASE WHEN t.txn_type = 'maas' THEN 1 ELSE 0 END) AS maasli, COALESCE(SUM(CASE WHEN t.txn_type = 'kart_harcama' THEN -t.amount END), 0) AS harcama FROM bank_customers cu LEFT JOIN bank_accounts a ON a.customer_id = cu.customer_id LEFT JOIN bank_txns t ON t.account_id = a.account_id GROUP BY cu.customer_id, cu.segment, cu.kvkk_consent) SELECT segment, COUNT(*) AS musteri, ROUND(100.0 * SUM(maasli) / COUNT(*), 1) AS maas_orani, ROUND(AVG(harcama), 0) AS harcama_kisi, ROUND(100.0 * SUM(kvkk_consent) / COUNT(*), 1) AS izin_orani FROM c GROUP BY segment;")
  ]
}, {
  id: 'proje-bi', lv: 'B2', mod: PRJ, min: 50,
  title: 'Bitirme projesi (İş Zekası): Anadolu Market yönetim KPI panosu için veri hazırlığı',
  sum: 'Panoya beslenecek aylık KPI tablosu, kanal payları, yıllık karşılaştırma ve ürün liderleri.',
  body: `
<h2>Senaryo</h2>
<p>Genel müdür her ay başında tek ekranda şirketin nabzını görmek istiyor. Power BI / Looker Studio panosunu kuracak ekip, senden <b>hazır hesaplanmış</b> tablolar bekliyor; panoda karmaşık hesap yapılmayacak.</p>
<h2>Tanımlar (KPI sözlüğü)</h2>
<table>
<tr><th>KPI</th><th>Tanım</th></tr>
<tr><td>Net ciro</td><td>Teslim edilen siparişlerin Σ adet × birim fiyat × (1 − indirim)</td></tr>
<tr><td>Sipariş</td><td>Tüm durumlardaki sipariş sayısı</td></tr>
<tr><td>Aktif müşteri</td><td>O ay en az bir sipariş veren tekil müşteri</td></tr>
<tr><td>Ortalama sepet</td><td>Net ciro ÷ teslim edilen sipariş sayısı</td></tr>
<tr><td>İptal oranı</td><td>İptal edilen sipariş ÷ tüm siparişler</td></tr>
</table>
<div class="tip"><b>BI ekibine iyilik</b>Her tabloya açık sütun adları ver, oranları yüzde değil 0–1 arası ya da tutarlı biçimde ver ve tanımları dokümante et. Tanım farkı, panolardaki tartışmaların bir numaralı nedenidir.</div>
`,
  ex: [
    st(1, '2024 için aylık KPI tablosu: <code>ay</code> (YYYY-AA), <code>siparis</code>, <code>aktif_musteri</code>, <code>net_ciro</code> (tam sayı), <code>ort_sepet</code> (tam sayı), <code>iptal_orani</code> (%, 1 basamak). Aya göre sırala.', `WITH s AS (SELECT strftime('%Y-%m', order_date) AS ay, COUNT(*) AS siparis, COUNT(DISTINCT customer_id) AS aktif, SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS iptal, SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) AS teslim FROM orders WHERE order_date >= '2024-01-01' AND order_date < '2025-01-01' GROUP BY strftime('%Y-%m', order_date)), c AS (SELECT strftime('%Y-%m', o.order_date) AS ay, SUM(${NET}) AS ciro FROM orders o JOIN order_items oi ON oi.order_id = o.order_id WHERE o.status = 'delivered' AND o.order_date >= '2024-01-01' AND o.order_date < '2025-01-01' GROUP BY strftime('%Y-%m', o.order_date)) SELECT s.ay, s.siparis, s.aktif AS aktif_musteri, ROUND(c.ciro, 0) AS net_ciro, ROUND(c.ciro / s.teslim, 0) AS ort_sepet, ROUND(100.0 * s.iptal / s.siparis, 1) AS iptal_orani FROM s JOIN c ON c.ay = s.ay ORDER BY s.ay;`, { ord: true, hint: 'Sipariş düzeyindeki ölçüleri ve satır düzeyindeki ciroyu ayrı CTE\'lerde hesaplayıp ay üzerinden birleştir.' }),
    st(2, 'Kanal payı: 2024 teslim edilen net cironun kanallara dağılımı (%, 1 basamak): <code>channel</code>, <code>pay</code>.', `WITH k AS (SELECT o.channel, SUM(${NET}) AS ciro FROM orders o JOIN order_items oi ON oi.order_id = o.order_id WHERE o.status = 'delivered' AND o.order_date >= '2024-01-01' AND o.order_date < '2025-01-01' GROUP BY o.channel) SELECT channel, ROUND(100.0 * ciro / SUM(ciro) OVER (), 1) AS pay FROM k;`),
    st(3, 'Yıllık karşılaştırma: her ay numarası (1–12) için 2023 ve 2024 net cirosu yan yana (tam sayı) ve değişim (%, 1 basamak): <code>ay</code>, <code>c2023</code>, <code>c2024</code>, <code>degisim</code>. Aya göre sırala.', `WITH m AS (SELECT CAST(strftime('%m', o.order_date) AS INTEGER) AS ay, SUM(CASE WHEN strftime('%Y', o.order_date) = '2023' THEN ${NET} ELSE 0 END) AS c2023, SUM(CASE WHEN strftime('%Y', o.order_date) = '2024' THEN ${NET} ELSE 0 END) AS c2024 FROM orders o JOIN order_items oi ON oi.order_id = o.order_id WHERE o.status = 'delivered' GROUP BY CAST(strftime('%m', o.order_date) AS INTEGER)) SELECT ay, ROUND(c2023, 0) AS c2023, ROUND(c2024, 0) AS c2024, ROUND(100.0 * (c2024 - c2023) / c2023, 1) AS degisim FROM m ORDER BY ay;`, { ord: true }),
    st(4, '2024 son çeyreğinde (Ekim–Aralık) net ciroya göre ilk 5 ürün ve kategorileri (tam sayı): <code>name</code>, <code>category</code>, <code>ciro</code>. Ciroya göre azalan.', `SELECT p.name, p.category, ROUND(SUM(${NET}), 0) AS ciro FROM orders o JOIN order_items oi ON oi.order_id = o.order_id JOIN products p ON p.product_id = oi.product_id WHERE o.status = 'delivered' AND o.order_date >= '2024-10-01' AND o.order_date < '2025-01-01' GROUP BY p.product_id, p.name, p.category ORDER BY ciro DESC LIMIT 5;`, { ord: true }),
    st(5, 'Pano için görünüm: yukarıdaki aylık KPI hesabını <code>v_aylik_kpi</code> adında bir görünüm olarak tanımla (yalnızca <code>ay</code>, <code>siparis</code>, <code>net_ciro</code> sütunları, 2024) ve görünümden net cirosu en yüksek 3 ayı getir: <code>ay</code>, <code>net_ciro</code>.', `CREATE VIEW v_aylik_kpi AS SELECT strftime('%Y-%m', o.order_date) AS ay, COUNT(DISTINCT o.order_id) AS siparis, ROUND(SUM(CASE WHEN o.status = 'delivered' THEN ${NET} ELSE 0 END), 0) AS net_ciro FROM orders o JOIN order_items oi ON oi.order_id = o.order_id WHERE o.order_date >= '2024-01-01' AND o.order_date < '2025-01-01' GROUP BY strftime('%Y-%m', o.order_date); SELECT ay, net_ciro FROM v_aylik_kpi ORDER BY net_ciro DESC LIMIT 3;`, { ord: true, dl: NOBQ })
  ]
}, {
  id: 'proje-bilimci', lv: 'C1', mod: PRJ, min: 60,
  title: 'Bitirme projesi (Veri Bilimi): şüpheli işlem tespiti ve müşteri özellik tablosu',
  sum: 'İstatistiksel aykırı değer, kural tabanlı skor ve model için özellik tablosu.',
  body: `
<h2>Senaryo</h2>
<p>Ilgaz Bank'ın risk ekibi dolandırıcılık modeli kurmadan önce veriyi tanımak istiyor. İki şey bekleniyor: kural ve istatistikle şüpheli işlemlerin işaretlenmesi, ve her müşteri için bir satırlık <b>özellik tablosu</b> (feature table).</p>
<h2>Yöntem</h2>
<ul>
<li><b>z-skoru</b>: (değer − ortalama) ÷ standart sapma. Hesap bazında hesaplanırsa “bu müşteri için olağandışı” işlemi bulur.</li>
<li><b>Kurallar</b>: gece saatleri, yeni kanal, çok yüksek tutar gibi işaretler birleştirilerek basit bir skor oluşturulur.</li>
<li><b>Sızıntı yok</b>: Özellik tablosu, tahmin anından önceki veriden üretilmelidir (burada referans tarih 2024-12-01; Aralık verisi etiket için ayrılır).</li>
</ul>
<p>Standart sapma bu uygulamada <code>STDDEV</code> (SQL Server'da <code>STDEV</code>) ile hesaplanabilir; taşınabilir yol <code>SQRT(AVG(x*x) - AVG(x)*AVG(x))</code>.</p>
`,
  ex: [
    st(1, 'Kart harcamalarında genel dağılım: işlem sayısı, ortalama tutar, en büyük tutar ve %99. yüzdelik sınırına yakın bir eşik olarak “ortalama + 3 × standart sapma” (hepsi pozitif, 2 basamak): <code>adet</code>, <code>ort</code>, <code>en_buyuk</code>, <code>esik</code>.', "SELECT COUNT(*) AS adet, ROUND(AVG(-amount), 2) AS ort, ROUND(MAX(-amount), 2) AS en_buyuk, ROUND(AVG(-amount) + 3 * SQRT(AVG(amount * amount) - AVG(amount) * AVG(amount)), 2) AS esik FROM bank_txns WHERE txn_type = 'kart_harcama';"),
    st(2, 'Hesap bazında z-skoru 4\'ten büyük kart harcamaları (en az 10 harcaması olan hesaplarda): <code>txn_id</code>, <code>account_id</code>, <code>tutar</code> (pozitif), <code>z</code> (2 basamak). z\'ye göre azalan.', "WITH s AS (SELECT txn_id, account_id, -amount AS tutar, AVG(-amount) OVER (PARTITION BY account_id) AS ort, SQRT(AVG(amount * amount) OVER (PARTITION BY account_id) - AVG(amount) OVER (PARTITION BY account_id) * AVG(amount) OVER (PARTITION BY account_id)) AS sd, COUNT(*) OVER (PARTITION BY account_id) AS n FROM bank_txns WHERE txn_type = 'kart_harcama') SELECT txn_id, account_id, tutar, ROUND((tutar - ort) / sd, 2) AS z FROM s WHERE n >= 10 AND sd > 0 AND (tutar - ort) / sd > 4 ORDER BY z DESC;", { ord: true }),
    st(3, 'Kural tabanlı skor: her kart harcaması için skor = (tutar > 20.000 ise 2) + (saat 00–05 ise 2) + (kanal internet ise 1). Skoru 4 ve üstü olan işlemlerin sayısı: <code>supheli</code>.', "SELECT COUNT(*) AS supheli FROM (SELECT (CASE WHEN -amount > 20000 THEN 2 ELSE 0 END) + (CASE WHEN CAST(strftime('%H', txn_time) AS INTEGER) < 6 THEN 2 ELSE 0 END) + (CASE WHEN channel = 'internet' THEN 1 ELSE 0 END) AS skor FROM bank_txns WHERE txn_type = 'kart_harcama') AS t WHERE skor >= 4;"),
    st(4, 'Özellik tablosu (referans 2024-12-01, yalnızca öncesindeki hareketler): her müşteri için <code>customer_id</code>, <code>islem</code> (kart harcaması adedi), <code>harcama</code> (toplam, pozitif, tam sayı), <code>kategori_cesit</code> (farklı işyeri kategorisi), <code>gece_orani</code> (00–05 arası harcama oranı, 3 basamak), <code>son_gun</code> (son harcamadan referansa gün). Yalnızca harcaması olan müşteriler.', "SELECT a.customer_id, COUNT(*) AS islem, ROUND(SUM(-t.amount), 0) AS harcama, COUNT(DISTINCT t.merchant_category) AS kategori_cesit, ROUND(1.0 * SUM(CASE WHEN CAST(strftime('%H', t.txn_time) AS INTEGER) < 6 THEN 1 ELSE 0 END) / COUNT(*), 3) AS gece_orani, CAST(julianday('2024-12-01') - julianday(MAX(date(t.txn_time))) AS INTEGER) AS son_gun FROM bank_txns t JOIN bank_accounts a ON a.account_id = t.account_id WHERE t.txn_type = 'kart_harcama' AND t.txn_time < '2024-12-01' GROUP BY a.customer_id;"),
    st(5, 'Etiket: Aralık 2024\'te hiç kart harcaması olmayan müşteriler “pasif” (1), diğerleri 0. Kasım sonuna kadar harcaması olan müşteriler için etiket dağılımı: <code>pasif</code>, <code>musteri</code>.', "WITH once AS (SELECT DISTINCT a.customer_id FROM bank_txns t JOIN bank_accounts a ON a.account_id = t.account_id WHERE t.txn_type = 'kart_harcama' AND t.txn_time < '2024-12-01'), aralik AS (SELECT DISTINCT a.customer_id FROM bank_txns t JOIN bank_accounts a ON a.account_id = t.account_id WHERE t.txn_type = 'kart_harcama' AND t.txn_time >= '2024-12-01') SELECT CASE WHEN ar.customer_id IS NULL THEN 1 ELSE 0 END AS pasif, COUNT(*) AS musteri FROM once o LEFT JOIN aralik ar ON ar.customer_id = o.customer_id GROUP BY CASE WHEN ar.customer_id IS NULL THEN 1 ELSE 0 END;"),
    mc('<p>Özellik tablosunu 2024-12-01 öncesi veriden, etiketi Aralık verisinden üretmemizin nedeni?</p>', ['Sorguyu hızlandırmak', 'Hedef bilgisinin özelliklere sızmasını (leakage) önlemek', 'Daha az satır elde etmek', 'Kur farkı nedeniyle'], 1)
  ]
}, {
  id: 'proje-muhendis', lv: 'C1', mod: PRJ, min: 60,
  title: 'Bitirme projesi (Veri Mühendisi): ham kayıttan temiz boyut tablosuna ve veri testlerine',
  sum: 'Staging, temizleme, tekilleştirme, boyut ve olgu tabloları, artımlı yükleme ve testler.',
  body: `
<h2>Senaryo</h2>
<p>Pazarlama formlarından gelen <code>raw_signups</code> verisi kirli: büyük/küçük harf karışık, tekrar eden satırlar, iki farklı tarih biçimi. Ayrıca fiyat güncellemeleri ayrı bir dosyadan geliyor. Senden temiz tablolar ve bunları koruyan testler isteniyor.</p>
<h2>Katmanlar</h2>
<ol>
<li><b>staging</b>: ham verinin tip ve biçim olarak standartlaştırılmış kopyası</li>
<li><b>temiz</b>: tekilleştirilmiş, iş kurallarına uygun tablo</li>
<li><b>mart</b>: raporlamaya hazır özet</li>
<li><b>test</b>: her katmanın doğruluğunu denetleyen sorgular</li>
</ol>
<div class="note"><b>Not</b>Her adım boş bir veritabanında ayrı denetlendiği için, önceki adımın tablosu gerekiyorsa adımın içinde yeniden oluşturulur. Gerçek projede bu adımlar bir dbt modeli veya saklı yordam zinciri olur.</div>
`,
  ex: [
    st(1, 'Staging: <code>stg_signups</code> tablosunu <code>raw_signups</code>\'tan oluştur: <code>id</code>, kırpılmış ve baş harfleri olduğu gibi bırakılmış ad (<code>full_name</code> = TRIM), küçük harfli ve kırpılmış e-posta (<code>email</code>), kırpılıp büyük harfe çevrilmiş ve İ→I dönüştürülmüş şehir (<code>city</code>, boş metin NULL olsun), YYYY-AA-GG biçimli tarih (<code>signup_date</code>). Sonra satır sayısını ve şehri ISTANBUL olan satır sayısını getir: <code>satir</code>, <code>istanbul</code>.', "CREATE TABLE stg_signups AS SELECT id, TRIM(full_name) AS full_name, LOWER(TRIM(email)) AS email, NULLIF(REPLACE(UPPER(TRIM(city)), 'İ', 'I'), '') AS city, CASE WHEN signup_date LIKE '__.__.____' THEN SUBSTR(signup_date, 7, 4) || '-' || SUBSTR(signup_date, 4, 2) || '-' || SUBSTR(signup_date, 1, 2) ELSE signup_date END AS signup_date FROM raw_signups; SELECT COUNT(*) AS satir, SUM(CASE WHEN city = 'ISTANBUL' THEN 1 ELSE 0 END) AS istanbul FROM stg_signups;", { dl: NOBQ }),
    st(2, 'Tekilleştirme: aynı <code>id</code> için tek satır kalacak şekilde temiz kayıtları getir (ROW_NUMBER ile, e-postaya göre alfabetik ilk satır): <code>id</code>, <code>email</code>, <code>signup_date</code> (YYYY-AA-GG). id\'ye göre sırala.', "WITH s AS (SELECT id, LOWER(TRIM(email)) AS email, CASE WHEN signup_date LIKE '__.__.____' THEN SUBSTR(signup_date, 7, 4) || '-' || SUBSTR(signup_date, 4, 2) || '-' || SUBSTR(signup_date, 1, 2) ELSE signup_date END AS signup_date FROM raw_signups), r AS (SELECT id, email, signup_date, ROW_NUMBER() OVER (PARTITION BY id ORDER BY email) AS rn FROM s) SELECT id, email, signup_date FROM r WHERE rn = 1 ORDER BY id;", { ord: true }),
    st(3, 'Mart: aylık yeni kayıt sayısı (tekilleştirilmiş kayıtlar üzerinden): <code>ay</code> (YYYY-AA), <code>kayit</code>. Aya göre sırala.', "WITH s AS (SELECT DISTINCT id, CASE WHEN signup_date LIKE '__.__.____' THEN SUBSTR(signup_date, 7, 4) || '-' || SUBSTR(signup_date, 4, 2) || '-' || SUBSTR(signup_date, 1, 2) ELSE signup_date END AS d FROM raw_signups) SELECT SUBSTR(d, 1, 7) AS ay, COUNT(*) AS kayit FROM s GROUP BY SUBSTR(d, 1, 7) ORDER BY ay;", { ord: true }),
    st(4, 'Artımlı yükleme: <code>price_updates</code>\'teki her ürünün <b>son</b> fiyatını <code>products</code> tablosuna uygula, ardından fiyatı değişen ürünlerin sayısını getir (değişiklik, güncelleme tablosunda yer almak demek): <code>guncellenen</code>.', 'UPDATE products SET price = (SELECT u.new_price FROM price_updates u WHERE u.product_id = products.product_id ORDER BY u.updated_at DESC LIMIT 1) WHERE product_id IN (SELECT product_id FROM price_updates); SELECT COUNT(*) AS guncellenen FROM products p WHERE EXISTS (SELECT 1 FROM price_updates u WHERE u.product_id = p.product_id);', { check: 'SELECT product_id, price FROM products ORDER BY product_id' }),
    st(5, 'Veri testleri raporu: <code>raw_signups</code> için üç test ve hata sayıları — <code>email_bos</code> (e-postası boş), <code>tarih_gecersiz</code> (iki biçime de uymayan tarih), <code>tekrar_id</code> (birden fazla satırı olan id sayısı). Sütunlar: <code>test</code>, <code>hata</code>.', "SELECT 'email_bos' AS test, COUNT(*) AS hata FROM raw_signups WHERE email IS NULL OR TRIM(email) = '' UNION ALL SELECT 'tarih_gecersiz', COUNT(*) FROM raw_signups WHERE NOT (signup_date LIKE '____-__-__' OR signup_date LIKE '__.__.____') UNION ALL SELECT 'tekrar_id', COUNT(*) FROM (SELECT id FROM raw_signups GROUP BY id HAVING COUNT(*) > 1) AS t;")
  ]
}, {
  id: 'proje-dba', lv: 'C1', mod: PRJ, min: 45,
  title: 'Bitirme projesi (DBA): yavaş raporu hızlandır ve veritabanını güvenceye al',
  sum: 'Sorgu analizi, indeks tasarımı, SARGable yeniden yazım, salt okunur rapor katmanı.',
  body: `
<h2>Senaryo</h2>
<p>Ilgaz Bank'ın gün sonu raporu yavaşladı ve denetçiler, analistlerin ham hesap tablolarına doğrudan eriştiğini fark etti. Görevin: raporu hızlandırmak ve raporlama için güvenli bir katman kurmak.</p>
<h2>Yavaş rapor</h2>
<pre class="code">SELECT date(txn_time) AS gun, txn_type, COUNT(*) AS adet, ROUND(SUM(amount), 0) AS toplam
FROM bank_txns
WHERE strftime('%Y-%m', txn_time) = '2024-12'
GROUP BY date(txn_time), txn_type
ORDER BY gun, txn_type;</pre>
<p>Sorunlar: tarih sütunu fonksiyon içinde (SARGable değil), <code>txn_time</code> üzerinde indeks yok.</p>
<div class="note"><b>Programlar</b>İndeks adımları BigQuery dışındaki tüm programlarda yapılabilir; BigQuery'de karşılığı bölümleme ve kümelemedir.</div>
`,
  ex: [
    st(1, 'Raporu SARGable yaz: aynı sonucu, <code>txn_time</code>\'ı fonksiyona sokmadan Aralık 2024 aralığıyla filtreleyerek üret: <code>gun</code>, <code>txn_type</code>, <code>adet</code>, <code>toplam</code>. Gün ve türe göre sırala.', "SELECT date(txn_time) AS gun, txn_type, COUNT(*) AS adet, ROUND(SUM(amount), 0) AS toplam FROM bank_txns WHERE txn_time >= '2024-12-01' AND txn_time < '2025-01-01' GROUP BY date(txn_time), txn_type ORDER BY gun, txn_type;", { ord: true }),
    st(2, '<code>bank_txns</code> üzerinde rapora uygun bir indeks oluştur (<code>ix_txn_time</code>, txn_time sütunu) ve veritabanındaki <code>bank_txns</code> indekslerinin adlarını alfabetik listele (SQLite: <code>sqlite_master</code>): <code>name</code>.', "CREATE INDEX ix_txn_time ON bank_txns (txn_time); SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'bank_txns' AND name NOT LIKE 'sqlite_%' ORDER BY name;", { ord: true, base: 'sqlite', dl: ['sqlite'] }),
    st(3, 'Rapor katmanı: analistler için ham tablolar yerine <code>v_gunluk_ozet</code> görünümü oluştur (gün, işlem türü, adet, toplam; tüm 2024) ve görünümden 2024-12-31 gününün satırlarını getir: <code>gun</code>, <code>txn_type</code>, <code>adet</code>, <code>toplam</code>.', "CREATE VIEW v_gunluk_ozet AS SELECT date(txn_time) AS gun, txn_type, COUNT(*) AS adet, ROUND(SUM(amount), 0) AS toplam FROM bank_txns GROUP BY date(txn_time), txn_type; SELECT gun, txn_type, adet, toplam FROM v_gunluk_ozet WHERE gun = '2024-12-31';", { dl: NOBQ }),
    st(4, 'Kişisel veri koruması: analist görünümü <code>v_musteri_analiz</code> oluştur — müşteri numarası, ad soyadın yalnızca baş harfi + \'***\', şehir, segment, doğum yılı (tarihin ilk 4 karakteri) — ve görünümden şehir başına müşteri sayısını getir: <code>city</code>, <code>musteri</code>.', "CREATE VIEW v_musteri_analiz AS SELECT customer_id, SUBSTR(full_name, 1, 1) || '***' AS ad, city, segment, SUBSTR(birth_date, 1, 4) AS dogum_yili FROM bank_customers; SELECT city, COUNT(*) AS musteri FROM v_musteri_analiz GROUP BY city;", { dl: NOBQ }),
    mc('<p>Analistlerin ham <code>bank_customers</code> tablosuna erişimini kaldırıp yalnızca <code>v_musteri_analiz</code> görünümüne SELECT yetkisi vermek hangi ilkeye örnektir?</p>', ['Normalizasyon', 'En az yetki ve veri minimizasyonu', 'Yatay ölçekleme', 'Denormalizasyon'], 1),
    mc('<p>Rapor her gece çalışıyor ve gün içinde OLTP yükünü artırıyorsa, DBA\'nın düşünebileceği yapısal çözüm hangisidir?</p>', ['Tüm indeksleri silmek', 'Raporu okunabilir ikincil replikaya veya veri ambarına taşımak', 'Tabloyu bölmek yerine birleştirmek', 'Yedeklemeyi kapatmak'], 1)
  ]
}, {
  id: 'proje-backend', lv: 'C1', mod: PRJ, min: 45,
  title: 'Bitirme projesi (Backend): sepet özelliği için şema ve sorgular',
  sum: 'Kısıtlı tablo tasarımı, idempotent ekleme, anahtar tabanlı sayfalama, işlemle sipariş oluşturma.',
  body: `
<h2>Senaryo</h2>
<p>Anadolu Market mobil uygulamasına kalıcı sepet özelliği eklenecek. Kullanıcı sepete ürün ekler, adet değiştirir, siparişe çevirir. API ekibi senden şemayı ve uç noktaların çalıştıracağı sorguları istiyor.</p>
<h2>Gereksinimler</h2>
<ul>
<li>Bir müşterinin tek açık sepeti olur; sepette aynı ürün bir kez bulunur (adet artar).</li>
<li>Adet 1–20 arasında olmalı.</li>
<li>Ürün listesi sayfalaması derin sayfalarda da hızlı olmalı.</li>
<li>Siparişe çevirme tek işlemde yapılmalı; yarım kalırsa hiçbir şey değişmemeli.</li>
</ul>
<div class="tip"><b>Kısıt veritabanında</b>Uygulama kodundaki doğrulamalar değişebilir; veritabanı kısıtları her zaman çalışır.</div>
`,
  ex: [
    st(1, 'Şema: <code>cart</code> (<code>cart_id</code> birincil anahtar, <code>customer_id</code> customers\'a yabancı anahtar ve tekil, <code>created_at</code>) ve <code>cart_item</code> (<code>cart_id</code> cart\'a yabancı anahtar, <code>product_id</code> products\'a yabancı anahtar, <code>quantity</code> 1–20 CHECK, birincil anahtar (<code>cart_id</code>, <code>product_id</code>)) tablolarını oluştur. 1 numaralı müşteri için sepet (cart_id 1) ve içine 5 numaralı üründen 2 adet ekle. Sonra sepeti getir: <code>cart_id</code>, <code>product_id</code>, <code>quantity</code>.', "CREATE TABLE cart (cart_id INTEGER PRIMARY KEY, customer_id INTEGER NOT NULL UNIQUE REFERENCES customers(customer_id), created_at TEXT); CREATE TABLE cart_item (cart_id INTEGER NOT NULL REFERENCES cart(cart_id), product_id INTEGER NOT NULL REFERENCES products(product_id), quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 20), PRIMARY KEY (cart_id, product_id)); INSERT INTO cart VALUES (1, 1, '2024-12-31'); INSERT INTO cart_item VALUES (1, 5, 2); SELECT cart_id, product_id, quantity FROM cart_item;", { dl: NOBQ }),
    st(2, 'Sepete ürün ekleme (varsa adet artır): sepette 5 numaralı üründen 2 adet varken aynı üründen 3 adet daha eklenince adet 5 olmalı, 9 numaralı üründen 1 adet yeni satır olarak eklenmeli. Önce tabloyu ve ilk satırı oluştur, sonra iki ekleme işlemini UPDATE + INSERT ... WHERE NOT EXISTS desenleriyle yap ve sepeti ürün numarasına göre getir.', "CREATE TABLE cart_item (cart_id INTEGER, product_id INTEGER, quantity INTEGER, PRIMARY KEY (cart_id, product_id)); INSERT INTO cart_item VALUES (1, 5, 2); UPDATE cart_item SET quantity = quantity + 3 WHERE cart_id = 1 AND product_id = 5; INSERT INTO cart_item (cart_id, product_id, quantity) SELECT 1, 5, 3 WHERE NOT EXISTS (SELECT 1 FROM cart_item WHERE cart_id = 1 AND product_id = 5); UPDATE cart_item SET quantity = quantity + 1 WHERE cart_id = 1 AND product_id = 9; INSERT INTO cart_item (cart_id, product_id, quantity) SELECT 1, 9, 1 WHERE NOT EXISTS (SELECT 1 FROM cart_item WHERE cart_id = 1 AND product_id = 9); SELECT cart_id, product_id, quantity FROM cart_item ORDER BY product_id;", { ord: true, dl: NOBQ, hint: 'Her ürün için önce UPDATE dene; satır yoksa INSERT ... SELECT ... WHERE NOT EXISTS. (Programına göre MERGE veya ON CONFLICT de kullanılabilir.)' }),
    st(3, 'Anahtar tabanlı sayfalama: ürünleri <code>product_id</code>\'ye göre sayfa başına 8 kayıtla listeliyoruz; bir önceki sayfanın son ürünü 16 idi. Sonraki sayfayı OFFSET kullanmadan getir: <code>product_id</code>, <code>name</code>, <code>price</code>.', 'SELECT product_id, name, price FROM products WHERE product_id > 16 ORDER BY product_id LIMIT 8;', { ord: true }),
    st(4, 'Sepet özeti uç noktası: 7 numaralı müşterinin son siparişindeki ürünlerin sepette olduğunu varsayarak satır tutarlarını ve genel toplamı (indirim dahil, 2 basamak) tek sorguda getir; son satır <b>TOPLAM</b> olsun: <code>urun</code>, <code>tutar</code>.', `WITH s AS (SELECT MAX(order_id) AS oid FROM orders WHERE customer_id = 7), k AS (SELECT p.name AS urun, ${NET} AS tutar, 0 AS sira FROM order_items oi JOIN products p ON p.product_id = oi.product_id WHERE oi.order_id = (SELECT oid FROM s)) SELECT urun, tutar FROM (SELECT urun, ROUND(tutar, 2) AS tutar, sira FROM k UNION ALL SELECT 'TOPLAM', ROUND(SUM(tutar), 2), 1 FROM k) AS t ORDER BY sira, urun;`, { ord: true }),
    mc('<p>Sepeti siparişe çevirirken sipariş, sipariş satırları ve stok güncellemesi neden tek bir işlem (transaction) içinde yapılmalı?</p>', ['Daha hızlı olduğu için', 'Biri başarısız olursa hepsi geri alınsın, yarım sipariş veya yanlış stok kalmasın diye', 'Kilit gerekmediği için', 'Zorunlu sözdizimi olduğu için'], 1),
    mc('<p>Mobil uygulama ağ sorunu nedeniyle “sepete ekle” isteğini iki kez gönderdi. Adetin iki kat artmaması için ne yapılır?</p>', ['Hiçbir şey; sorun yok', 'İstek kimliği (idempotency key) saklayıp aynı isteği ikinci kez uygulamamak', 'Adeti her seferinde sıfırlamak', 'Tabloyu kilitlemek'], 1)
  ]
}, {
  id: 'proje-tsql', lv: 'C1', mod: PRJ, min: 45,
  title: 'Bitirme projesi (T-SQL): şube raporu için saklı yordam ve hata yönetimi',
  sum: 'Değişkenler, geçici tablo, saklı yordam, TRY/CATCH ve işlem yönetimi.',
  body: `
<h2>Senaryo</h2>
<p>Ilgaz Bank şube müdürleri kendi şubelerinin aylık özetini bir düğmeyle almak istiyor. Raporu SQL Server'da bir saklı yordam olarak yazacaksın; yanlış parametrede anlaşılır hata vermeli.</p>
<p>Bu proje yalnızca SQL Server (T-SQL) yazımıyla çözülür. Varsayılan programın farklıysa adımlar yine SQL Server modunda açılır.</p>
`,
  ex: [
    { t: 'sql', base: 'tsql', dl: ['tsql'], q: '<p><b>Adım 1.</b> Değişkenlerle: <code>@sube = 1</code> ve <code>@ay = \'2024-12\'</code> için şubenin müşterilerine ait hesaplardaki hareket sayısı ve toplam tutarı (tam sayı) getir: <code>adet</code>, <code>toplam</code>.</p>', sol: "DECLARE @sube INT = 1, @ay CHAR(7) = '2024-12';\nSELECT COUNT(*) AS adet, ROUND(SUM(t.amount), 0) AS toplam\nFROM dbo.bank_txns t\nJOIN dbo.bank_accounts a ON a.account_id = t.account_id\nJOIN dbo.bank_customers c ON c.customer_id = a.customer_id\nWHERE c.branch_id = @sube AND FORMAT(t.txn_time, 'yyyy-MM') = @ay;" },
    { t: 'sql', base: 'tsql', dl: ['tsql'], q: '<p><b>Adım 2.</b> Geçici tablo: 1 numaralı şubenin Aralık 2024 hareketlerini <code>#hareket</code> geçici tablosuna al (txn_type, amount), sonra türe göre adet ve toplamı (tam sayı) getir: <code>txn_type</code>, <code>adet</code>, <code>toplam</code>.</p>', sol: "SELECT t.txn_type, t.amount INTO #hareket\nFROM dbo.bank_txns t\nJOIN dbo.bank_accounts a ON a.account_id = t.account_id\nJOIN dbo.bank_customers c ON c.customer_id = a.customer_id\nWHERE c.branch_id = 1 AND t.txn_time >= '2024-12-01' AND t.txn_time < '2025-01-01';\nSELECT txn_type, COUNT(*) AS adet, ROUND(SUM(amount), 0) AS toplam FROM #hareket GROUP BY txn_type;" },
    { t: 'sql', base: 'tsql', dl: ['tsql'], q: '<p><b>Adım 3.</b> Saklı yordam: <code>dbo.usp_sube_ozet</code> adında, <code>@sube INT</code> ve <code>@ay CHAR(7)</code> parametreli bir yordam yaz; şubenin o ayki hareketlerini türe göre özetlesin (<code>txn_type</code>, <code>adet</code>, <code>toplam</code> tam sayı). Ardından <code>GO</code> ile yığını ayırıp <code>EXEC dbo.usp_sube_ozet @sube = 4, @ay = \'2024-11\';</code> çalıştır.</p>', sol: "CREATE PROCEDURE dbo.usp_sube_ozet @sube INT, @ay CHAR(7)\nAS\nBEGIN\n  SET NOCOUNT ON;\n  SELECT t.txn_type, COUNT(*) AS adet, ROUND(SUM(t.amount), 0) AS toplam\n  FROM dbo.bank_txns t\n  JOIN dbo.bank_accounts a ON a.account_id = t.account_id\n  JOIN dbo.bank_customers c ON c.customer_id = a.customer_id\n  WHERE c.branch_id = @sube AND FORMAT(t.txn_time, 'yyyy-MM') = @ay\n  GROUP BY t.txn_type;\nEND;\nGO\nEXEC dbo.usp_sube_ozet @sube = 4, @ay = '2024-11';" },
    { t: 'sql', base: 'tsql', dl: ['tsql'], q: '<p><b>Adım 4.</b> Hata yönetimi: yordamın başına, şube yoksa <code>THROW 50001, \'Şube bulunamadı\', 1;</code> ile hata fırlatan bir kontrol ekle. Sonra <code>BEGIN TRY ... END TRY BEGIN CATCH ... END CATCH</code> içinde yordamı olmayan bir şubeyle (99) çağır ve CATCH bloğunda hata numarasını ve mesajını <code>SELECT ERROR_NUMBER() AS no, ERROR_MESSAGE() AS mesaj;</code> ile döndür.</p>', sol: "CREATE PROCEDURE dbo.usp_sube_ozet @sube INT, @ay CHAR(7)\nAS\nBEGIN\n  SET NOCOUNT ON;\n  IF NOT EXISTS (SELECT 1 FROM dbo.bank_branches WHERE branch_id = @sube)\n    THROW 50001, 'Şube bulunamadı', 1;\n  SELECT t.txn_type, COUNT(*) AS adet, ROUND(SUM(t.amount), 0) AS toplam\n  FROM dbo.bank_txns t\n  JOIN dbo.bank_accounts a ON a.account_id = t.account_id\n  JOIN dbo.bank_customers c ON c.customer_id = a.customer_id\n  WHERE c.branch_id = @sube AND FORMAT(t.txn_time, 'yyyy-MM') = @ay\n  GROUP BY t.txn_type;\nEND;\nGO\nBEGIN TRY\n  EXEC dbo.usp_sube_ozet @sube = 99, @ay = '2024-11';\nEND TRY\nBEGIN CATCH\n  SELECT ERROR_NUMBER() AS no, ERROR_MESSAGE() AS mesaj;\nEND CATCH;" },
    mc('<p>Yordamda <code>SET NOCOUNT ON</code> neden yazılır?</p>', ['Satır sayısını sıfırlar', '“(n satır etkilendi)” mesajlarını kapatarak ağ trafiğini ve bazı istemci sorunlarını azaltır', 'Hataları gizler', 'İşlemi başlatır'], 1)
  ]
}];
L.push(...projects);

/* Patikalara ekle */
const P = window.SQLP_PATHS; const PA = {}; P.forEach(p => PA[p.id] = p);
const addEnd = (pid, ids) => { const p = PA[pid]; if (!p) return; ids.forEach(id => { if (!p.lessons.includes(id)) p.lessons.push(id); }); };
const ins = (pid, afterId, ids) => { const p = PA[pid]; if (!p) return; ids = ids.filter(x => !p.lessons.includes(x)); const i = p.lessons.indexOf(afterId); p.lessons.splice(i < 0 ? p.lessons.length : i + 1, 0, ...ids); };
const comp = (pid, ids) => { const p = PA[pid]; if (p && p.comp) p.comp.push({ t: 'Bitirme projesi', d: 'Gerçekçi bir senaryoda baştan sona çalışma; portföyüne ekleyebilirsin', l: ids }); };
addEnd('analist', ['proje-analist']); comp('analist', ['proje-analist']);
addEnd('bi', ['proje-bi']); comp('bi', ['proje-bi']);
addEnd('bilimci', ['proje-bilimci']); comp('bilimci', ['proje-bilimci']);
addEnd('muhendis', ['proje-muhendis']); comp('muhendis', ['proje-muhendis']);
addEnd('dba', ['performans-lab', 'proje-dba']); comp('dba', ['proje-dba']);
addEnd('backend', ['proje-backend']); comp('backend', ['proje-backend']);
addEnd('tsql', ['proje-tsql']); comp('tsql', ['proje-tsql']);
addEnd('temel', ['proje-analist']); addEnd('uzman', ['performans-lab', 'proje-muhendis', 'proje-dba']);
ins('muhendis', 'index', ['performans-lab']); ins('backend', 'index', ['performans-lab']); ins('tsql', 'ts-plan', ['performans-lab']);
})();
