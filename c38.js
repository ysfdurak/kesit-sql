/* Kesit SQL: mevcut performans derslerinin genişletilmesi, yeni bitirme projeleri, Sorgu Optimizasyonu pratik görevleri, öğrenme yolu bağlantıları.
   Metindeki veri sayıları say() ile yazılır; araclar/denetim/opt_denetim.js her birini veritabanından yeniden hesaplar. */
(function () {
'use strict';
const LS = window.SQLP_LESSONS, PLAN = window.SQLP_PLAN;
const LM = id => { const l = LS.find(x => x.id === id); if (!l) throw new Error('c38: ders yok ' + id); return l; };
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const box = s => '<pre class="code">' + esc(s) + '</pre>';
const eqp = s => '<pre class="code" data-na="tsql pg mysql oracle bq">' + esc(s) + '</pre>';
const nor = s => '<pre class="code" data-norun>' + esc(s) + '</pre>';
const PGS = k => '<pre class="plan-cikti" tabindex="0">' + esc(PLAN.q[k].cikti) + '</pre>';
const PG = k => { const x = PLAN.q[k]; return nor((x.kur ? x.kur + ';\n' : '') + 'EXPLAIN (ANALYZE, BUFFERS, TIMING OFF, SUMMARY OFF)\n' + x.q + ';') + '<p class="plan-etiket">Gerçek çıktı (' + PLAN.surum + ', PGlite)</p>' + PGS(k); };
const trn = n => Number(n).toLocaleString('tr-TR');
const B = k => trn(PLAN.q[k].cikti.match(/shared hit=(\d+)/)[1]);
const GER = k => PLAN.q[k].cikti.match(/actual rows=(\d+)/g).map(x => x.match(/\d+/)[0]);
const mc = (q, o, a, why) => ({ t: 'mc', q: '<p>' + q + '</p>', o, a, why });
const sq = (q, sol, hint, x) => Object.assign({ t: 'sql', q: '<p>' + q + '</p>', sol, hint }, x || {});
const SQLITE = { base: 'sqlite', dl: ['sqlite'] };
const IDX = ['sqlite', 'tsql', 'pg', 'mysql', 'oracle'];
const SAY = window.SQLP_OPT_SAYI = [];
const say = (ad, deger, sql) => { SAY.push({ ad, deger, sql }); return typeof deger === 'number' ? trn(deger) : deger; };
const rep = (id, a, b) => { const l = LM(id); if (!l.body.includes(a)) throw new Error('c38: metin yok ' + id + ': ' + a.slice(0, 40)); l.body = l.body.replace(a, b); };
const ek = (id, fark) => { const l = LM(id); Object.assign(l.ex[fark.i], fark.x); };
const srch = (setup, tablo, msg) => ({ setup, must: 'SEARCH ' + tablo, msg: msg || 'Plan arama yapmıyor. Sütunu fonksiyondan çıkar, aralık yaz.' });
const NOOFF = [{ re: '\\bOFFSET\\b', msg: 'Görev OFFSET kullanmadan yazmanı istiyor.' }];

/* ------------------------------------------------------------------ Mevcut derslerde denetim sıkılaştırma: yavaş sorgu artık kabul edilmez */
ek('performans', { i: 1, x: { plan: srch('CREATE INDEX IF NOT EXISTS ix_gizli_od ON orders (order_date)', 'orders'), ynl: ["SELECT COUNT(*) FROM orders WHERE strftime('%Y-%m', order_date) = '2024-11';", "SELECT COUNT(*) FROM orders WHERE substr(order_date, 1, 7) = '2024-11';"] } });
ek('sargable', { i: 0, x: { plan: srch('CREATE INDEX IF NOT EXISTS ix_gizli_od ON orders (order_date)', 'orders'), ynl: ["SELECT COUNT(*) AS adet FROM orders WHERE strftime('%Y-%m', order_date) = '2024-11';"] } });
ek('sargable', { i: 1, x: { plan: srch('CREATE INDEX IF NOT EXISTS ix_gizli_pr ON products (price)', 'products', 'Sütun hâlâ işlem içinde. price tek başına kalmalı.'), ynl: ['SELECT COUNT(*) AS adet FROM products WHERE price * 1.2 > 6000;'] } });
ek('sargable', { i: 4, x: { mustNot: [{ re: '\\b(SUBSTR|SUBSTRING|LEFT)\\s*\\(', msg: 'Görev sütuna fonksiyon uygulamadan yazmanı istiyor.' }], ynl: ["SELECT COUNT(*) AS adet FROM products WHERE substr(name, 1, 2) = 'Ko';"] } });
ek('performans-lab', { i: 5, x: { plan: srch('CREATE INDEX IF NOT EXISTS ix_gizli_tt ON bank_txns (txn_time)', 'bank_txns'), ynl: ["SELECT COUNT(*) AS islem FROM bank_txns WHERE strftime('%Y-%m', txn_time) = '2024-11';"] } });
ek('bv-plan', { i: 2, x: { plan: srch(null, 'bk_trips'), ynl: ["SELECT COUNT(*) AS yolculuk FROM bk_trips WHERE date(started_at) = '2024-07-15';"] } });
ek('de-partition', { i: 2, x: { plan: srch('CREATE INDEX IF NOT EXISTS ix_gizli_pa ON lk_orders (placed_at)', 'lk_orders'), ynl: ["SELECT COUNT(*) AS adet FROM lk_orders WHERE strftime('%Y-%m', placed_at) = '2024-12';"] } });
ek('de-partition', { i: 5, x: { plan: srch('CREATE INDEX IF NOT EXISTS ix_gizli_tt ON bank_txns (txn_time)', 'bank_txns'), ynl: ["SELECT COUNT(*) AS adet, ROUND(SUM(amount)) AS toplam FROM bank_txns WHERE strftime('%Y', txn_time) = '2024' AND strftime('%m', txn_time) = '03';"] } });
ek('ts-plan', { i: 0, x: { plan: srch('CREATE INDEX IF NOT EXISTS ix_gizli_od ON orders (order_date)', 'orders'), ynl: ['SELECT COUNT(*) AS adet FROM orders WHERE YEAR(order_date) = 2024 AND MONTH(order_date) = 12;'] } });
ek('ts-plan', { i: 4, x: { mustNot: [{ re: '\\b(LEFT|SUBSTRING)\\s*\\(', msg: 'Görev sütuna fonksiyon uygulamadan yazmanı istiyor.' }], ynl: ["SELECT COUNT(*) AS adet FROM products WHERE LEFT(name, 3) = N'Kot';"] } });
ek('ts-plan', { i: 5, x: { mustNot: [{ re: '\\b(ISNULL|COALESCE)\\s*\\(', msg: 'Görev sütunu fonksiyona sokmadan yazmanı istiyor.' }], ynl: ['SELECT COUNT(*) AS adet FROM products WHERE ISNULL(stock, 0) < 20;'] } });
ek('proje-dba', { i: 0, x: { plan: srch('CREATE INDEX IF NOT EXISTS ix_gizli_tt ON bank_txns (txn_time)', 'bank_txns'), ynl: ["SELECT date(txn_time) AS gun, txn_type, COUNT(*) AS adet, ROUND(SUM(amount), 0) AS toplam FROM bank_txns WHERE strftime('%Y-%m', txn_time) = '2024-12' GROUP BY date(txn_time), txn_type ORDER BY gun, txn_type;"] } });
ek('be-sayfalama', { i: 1, x: { mustNot: NOOFF, ynl: ['SELECT order_id, order_date, status FROM orders ORDER BY order_id LIMIT 5 OFFSET 900;'] } });
ek('be-sayfalama', { i: 2, x: { mustNot: NOOFF } });
ek('proje-backend', { i: 2, x: { mustNot: NOOFF, ynl: ['SELECT product_id, name, price FROM products ORDER BY product_id LIMIT 8 OFFSET 16;'] } });

/* ------------------------------------------------------------------ ts-plan: uydurma sayı içeren çıktı örneği kaldırılır */
{ const l = LM('ts-plan'); const m = l.body.match(/-- Table 'orders'\. Scan count 1[^<]*?elapsed time = 18 ms\./); if (!m) throw new Error('c38: ts-plan örneği yok');
  l.body = l.body.replace(m[0], "-- Her tablo için okuma sayıları: Scan count, logical reads, physical reads ...\n-- Sürenin altında: CPU time, elapsed time"); }

/* ------------------------------------------------------------------ sargable, performans-lab, sözcük ve iddia düzeltmeleri */
rep('performans-lab', 'gerçek sistemlerde milyonlarca satırda fark saniyelerden dakikalara çıkar. Burada amaç', 'farkın büyüklüğü tablo boyutuna, belleğe ve donanıma bağlıdır, buradaki süreyi başka sisteme taşıma. Burada amaç');
rep('sargable', '<h2>Örtük tip dönüşümü</h2>', '<div class="note"><b>SQLite\'ta LIKE</b>Baştaki sabitli <code>LIKE \'ayse%\'</code> çoğu motorda aralık aramasına döner. SQLite varsayılan ayarda <code>LIKE</code> harf duyarsız çalıştığı için normal indeksten yararlanmaz, planda <code>SCAN</code> görürsün. Sütunu serbest bırakmak yine doğru alışkanlıktır.</div>\n<h2>Örtük tip dönüşümü</h2>');

/* ------------------------------------------------------------------ index: iş senaryosu ve plan denetimli görevler */
LM('index').body += `
<h2>İş senaryosu: müşteri ekranı</h2>
<p>Anadolu Market çağrı merkezi müşterinin siparişlerini açıyor. Sorgu <code>customer_id</code> ile arıyor ve günde binlerce kez çalışıyor. Önce planı oku, sonra indeks ekle. Plan <code>SCAN</code> iken indeks yoksa, indeks eklendikten sonra <code>SEARCH</code> olmalıdır. Hem <code>status</code> hem tarih aranıyorsa ve sütun sırası yanlışsa plan parantezinde tek sütun görünür.</p>
${eqp(`CREATE INDEX ix_orders_tarih_durum ON orders (order_date, status);
EXPLAIN QUERY PLAN SELECT COUNT(*) FROM orders
WHERE status = 'delivered' AND order_date >= '2024-11-01';`)}
${eqp(`CREATE INDEX ix_orders_durum_tarih ON orders (status, order_date);
EXPLAIN QUERY PLAN SELECT COUNT(*) FROM orders
WHERE status = 'delivered' AND order_date >= '2024-11-01';`)}
<p>Devamı için <b>Sorgu Optimizasyonu</b> öğrenme yoluna bak: plan okuma, sütun sırası, kapsayan indeks, seçicilik ve yanlış optimizasyon örnekleri orada ayrı derslerdir.</p>`;
LM('index').ex.push(
  sq('Çağrı merkezi ekranı için indeks oluştur (adı serbest). Şu sorgu arama yapmalı: <code>SELECT order_id, order_date FROM orders WHERE customer_id = 42</code>',
    'CREATE INDEX ix_siparis_musteri ON orders (customer_id);',
    'Sorgu hangi sütunla arıyor?',
    { nr: 1, dl: IDX, plan: { q: 'SELECT order_id, order_date FROM orders WHERE customer_id = 42', must: 'SEARCH orders USING (COVERING )?INDEX', msg: 'Sorgu hâlâ tabloyu tarıyor. İndeks aranan sütunda olmalı.' },
      ynl: ['CREATE INDEX ix_y ON orders (order_date);', 'CREATE INDEX ix_y ON orders (order_date, customer_id);', 'SELECT 1;'] }),
  sq("Şu sorgu için doğru sütun sırasıyla indeks oluştur (adı serbest): <code>SELECT COUNT(*) FROM orders WHERE status = 'delivered' AND order_date &gt;= '2024-11-01'</code>. İki sütun da aramada kullanılmalı.",
    'CREATE INDEX ix_durum_tarih ON orders (status, order_date);',
    'Eşitlik sütunu önce, aralık sütunu sonra.',
    { nr: 1, dl: IDX, plan: { q: "SELECT COUNT(*) FROM orders WHERE status = 'delivered' AND order_date >= '2024-11-01'", must: 'status=\\? AND order_date>\\?', msg: 'Planın parantezinde hem status=? hem order_date>? görünmeli.' },
      ynl: ['CREATE INDEX ix_y ON orders (order_date, status);', 'CREATE INDEX ix_y ON orders (status);', 'CREATE INDEX ix_y ON orders (order_date);'] }),
  mc("Planda <code>SEARCH orders USING INDEX ix (status=?)</code> yazıyor. Koşul <code>status = 'delivered' AND order_date &gt;= '2024-11-01'</code>. Ne anlarsın?", ['İki koşul da indeksle aranıyor', 'İndeks yalnız durumla daralıyor; tarih koşulu her satır okunduktan sonra süzülüyor', 'Sorgu tabloyu baştan sona tarıyor', 'Tarih koşulu sonucu etkilemiyor'], 1, 'Parantez aramada kullanılan sütunları söyler. Tarih orada yoksa satırlar okunup sonra elenir. (status, order_date) indeksi ikisini birlikte arar.')
);

/* ------------------------------------------------------------------ performans: kontrol listesi */
rep('performans', '<li><b>EXISTS ile IN</b>: Büyük alt sorgularda EXISTS genelde daha öngörülebilirdir; NOT IN\'in NULL tuzağı da yoktur.</li>', '<li><b>EXISTS ile IN</b>: Hangisinin hızlı olduğu motora bağlıdır, çoğu zaman plan aynıdır. Asıl fark <code>NOT IN</code> tarafındadır: alt sorguda NULL varsa hiç satır dönmez, bu yüzden <code>NOT EXISTS</code> tercih edilir.</li>');
rep('performans', '<li><b>Önce topla, sonra birleştir.</b> Büyük bir olay tablosunu boyut tablosuyla birleştirmeden önce özetle.</li>', '<li><b>Önce topla, sonra birleştir.</b> Satır çoğalmasını önler. Hız kazancı motora bağlıdır, ölç.</li>');
LM('performans').body += `
<h2>Yavaş sorgu kontrol listesi</h2>
<table>
<tr><th>Planda gördüğün</th><th>Olası sebep</th><th>İlk deneme</th></tr>
<tr><td>Büyük tabloda tam tarama, az satır dönüyor</td><td>Uygun indeks yok ya da koşul sütunu sarıyor</td><td>Koşulu sade yaz, sonra indeks</td></tr>
<tr><td>Filtre çok satır eliyor</td><td>Bileşik indeks eksik ya da sütun sırası yanlış</td><td>Eşitlik, aralık, sıralama</td></tr>
<tr><td>Tahmin ve gerçek çok farklı</td><td>Bayat istatistik, fonksiyonlu koşul, çarpık veri</td><td>İstatistiği yenile, koşulu düzelt</td></tr>
<tr><td>Her satır için alt sorgu</td><td>İlişkili alt sorgu</td><td>Önce topla ve birleştir, ya da iç tarafa indeks</td></tr>
<tr><td>Sıralama ya da geçici yapı</td><td>Sıra indeksten gelmiyor</td><td>Sıralama sütununu indekse ekle</td></tr>
<tr><td>Tabloya geri dönüş (Key Lookup)</td><td>İndeks sütunları kapsamıyor</td><td>Sütunları daralt, sonra <code>INCLUDE</code></td></tr>
<tr><td>DISTINCT ve çok satır</td><td>Birleştirme çoğaltıyor</td><td><code>EXISTS</code> ya da önce toplama</td></tr>
<tr><td>Derin OFFSET</td><td>Atlanan satırlar yine işleniyor</td><td>Keyset sayfalama</td></tr>
</table>
<p>Her satırın ayrı dersi <b>Sorgu Optimizasyonu</b> öğrenme yolunda. Değişiklikten sonra üç soruyu yanıtla: Sonuç aynı mı? Hangi sayı düştü? Karşılığında ne ödedim?</p>`;
LM('performans').ex.push(
  sq("Maaş ve faiz işlemleri birbirini dışlar, tekilleştirme gereksiz. <code>SELECT COUNT(*) AS adet FROM (SELECT txn_id FROM bank_txns WHERE txn_type = 'maas' UNION SELECT txn_id FROM bank_txns WHERE txn_type = 'faiz') t</code> sorgusunu tekilleştirme adımı olmadan yaz.",
    "SELECT COUNT(*) AS adet FROM (SELECT txn_id FROM bank_txns WHERE txn_type = 'maas' UNION ALL SELECT txn_id FROM bank_txns WHERE txn_type = 'faiz') t;",
    'İki kol ortak satır veremiyorsa <code>UNION ALL</code> yeterli.',
    { must: [{ re: '\\bUNION\\s+ALL\\b', msg: 'Görev UNION ALL kullanmanı istiyor.' }], ynl: ["SELECT COUNT(*) AS adet FROM (SELECT txn_id FROM bank_txns WHERE txn_type = 'maas' UNION SELECT txn_id FROM bank_txns WHERE txn_type = 'faiz') t;"] }),
  sq("Hesap başına hareket sayısı, indekslenmiş sütun tabloya gitmeden okunabilir: <code>SELECT account_id, COUNT(*) AS adet, MAX(channel) AS k FROM bank_txns GROUP BY account_id</code>. Bu sorguda <code>channel</code> gereksiz; çıkar ve yalnız <code>account_id</code>, <code>adet</code> getir. Plan yalnız indeksi okumalı.",
    'SELECT account_id, COUNT(*) AS adet FROM bank_txns GROUP BY account_id;',
    'İndekste olmayan sütun istemezsen tabloya gidilmez.',
    { plan: { must: 'COVERING INDEX', not: 'TEMP B-TREE', msg: 'Plan COVERING INDEX göstermeli. Gereksiz sütunu çıkar.' }, ynl: ['SELECT account_id, COUNT(*) AS adet, MAX(channel) AS k FROM bank_txns GROUP BY account_id;'] }),
  mc('Planda <code>Sort</code> en pahalı adım, sorgu <code>SELECT * ... ORDER BY tarih</code> ve yalnız iki sütun kullanılıyor. Hangi sıra en mantıklı?', ['Önce sütunları daralt, sonra sıralama sütununa indeks düşün, sonra yeniden ölç', 'Önce RAM artır, sonra planı oku', 'Önce ORDER BY kaldır, sonucun sırasını uygulama düzeltsin', 'Önce DISTINCT ekle, satır azalsın'], 0, 'Ucuz olan önce: sütun daraltmak sıralamanın belleğini küçültür. İndeks sıralamayı tamamen kaldırabilir. Sonra ölç.')
);

/* ------------------------------------------------------------------ be-sayfalama: gerçek çıktı ve plan */
LM('be-sayfalama').body += `
<h2>Ölçelim: OFFSET ve keyset aynı sayfayı nasıl okur?</h2>
<p>Aynı veriyle ${PLAN.surum} üzerinde üretilen gerçek planlar. Önce OFFSET:</p>
${PG('pg-offset')}
<p>İç düğümde <code>actual rows=${GER('pg-offset')[1]}</code>: 10 satır için ${trn(GER('pg-offset')[1])} satır okundu. Keyset:</p>
${PG('pg-keyset')}
<p>Okunan sayfa ${B('pg-offset')} yerine ${B('pg-keyset')}. PostgreSQL belgesi de OFFSET ile atlanan satırların sunucuda yine hesaplandığını, bu yüzden büyük OFFSET'in verimsiz olabileceğini yazar. Fark sayfa derinleştikçe büyür. Kendi tarayıcında SQLite planını da gör:</p>
${eqp(`EXPLAIN QUERY PLAN SELECT order_id, placed_at FROM lk_orders ORDER BY placed_at DESC LIMIT 10 OFFSET 5000;
CREATE INDEX ix_zaman ON lk_orders (placed_at, order_id);
EXPLAIN QUERY PLAN SELECT order_id, placed_at FROM lk_orders
WHERE placed_at < '2024-11-15 12:00:00'
   OR (placed_at = '2024-11-15 12:00:00' AND order_id < 3000)
ORDER BY placed_at DESC, order_id DESC LIMIT 10;`)}
<div class="note"><b>Keyset'in bedelleri</b>Belirli sayfaya atlayamazsın. Sıralama değişirse imleç de değişir. Sıralama sütunlarının ve eşitlik bozucunun indeksi gerekir. Yönetim panelinde küçük tablo için OFFSET çoğu zaman yeterlidir: gereksiz karmaşıklık da yanlış optimizasyondur.</div>`;
LM('be-sayfalama').ex.push(
  sq('Lezzet Kurye sipariş akışı derin sayfada yavaşlıyor: <code>SELECT order_id, placed_at FROM lk_orders ORDER BY order_id LIMIT 10 OFFSET 5000</code>. Bir önceki sayfa <code>order_id = 5000</code> ile bitti. Aynı satırları OFFSET olmadan getir.',
    'SELECT order_id, placed_at FROM lk_orders WHERE order_id > 5000 ORDER BY order_id LIMIT 10;',
    'Son görülen anahtardan sonrasını iste.',
    { ord: true, mustNot: NOOFF, plan: { must: 'SEARCH lk_orders', msg: 'Plan arama yapmalı.' },
      ynl: ['SELECT order_id, placed_at FROM lk_orders ORDER BY order_id LIMIT 10 OFFSET 5000;', 'SELECT order_id, placed_at FROM lk_orders WHERE order_id >= 5000 ORDER BY order_id LIMIT 10;'] }),
  sq("Akış en yeniden eskiye gösteriliyor ve aynı saniyede birden çok sipariş olabiliyor. Önceki sayfa <code>placed_at = '2024-11-15 12:00:00'</code>, <code>order_id = 3000</code> satırıyla bitti. Sıralama <code>placed_at DESC, order_id DESC</code>. Sonraki 5 kaydı OFFSET olmadan getir: <code>order_id</code>, <code>placed_at</code>.",
    "SELECT order_id, placed_at FROM lk_orders WHERE placed_at < '2024-11-15 12:00:00' OR (placed_at = '2024-11-15 12:00:00' AND order_id < 3000) ORDER BY placed_at DESC, order_id DESC LIMIT 5;",
    'İki koşul: daha eski zaman ya da aynı zaman ve daha küçük numara.',
    { ord: true, mustNot: NOOFF, ynl: ["SELECT order_id, placed_at FROM lk_orders WHERE order_id < 3000 ORDER BY placed_at DESC, order_id DESC LIMIT 5;", "SELECT order_id, placed_at FROM lk_orders WHERE placed_at > '2024-11-15 12:00:00' ORDER BY placed_at DESC, order_id DESC LIMIT 5;", "SELECT order_id, placed_at FROM lk_orders ORDER BY placed_at DESC, order_id DESC LIMIT 5;"] }),
  mc('Yönetim panelinde 400 satırlık tablo sayfalanıyor, kullanıcılar "sayfa 7" düğmesine basıyor. Ne yaparsın?', ['Hemen keyset\'e geçerim, OFFSET her zaman kötüdür', 'OFFSET yeterlidir; keyset sayfaya atlamayı zorlaştırır, bu küçük tablo için kazancı yok', 'Tüm tabloyu uygulamaya çekerim', 'İndeksleri silerim'], 1, 'Keyset derin sayfa ve büyük tablo içindir. Küçük tabloda sayfaya atlamayı kaybetmek kazançtan büyüktür. Bu da ölçüme dayanan bir karardır.')
);

/* ------------------------------------------------------------------ de-partition: gerçek bölüm eleme */
LM('de-partition').body += `
<h2>Bölüm eleme (partition pruning): gerçek çıktı</h2>
<p><code>bank_txns</code> verisini PostgreSQL'de çeyreklere bölünmüş bir tabloya aldık (<code>tx_bolum</code>). Aşağıdakiler ${PLAN.surum} üzerinde üretilen gerçek planlardır.</p>
<h3>Bölüm sütunu yalın: tek bölüm okunur</h3>
${PG('pg-bolum-iyi')}
<h3>Sütun fonksiyonda: bütün bölümler okunur</h3>
${PG('pg-bolum-fn')}
<p>Aynı sonuç, ama ${B('pg-bolum-iyi')} yerine ${B('pg-bolum-fn')} sayfa.</p>
<h3>Alt sorgudan gelen tarih: çalışma anında eleme</h3>
${PG('pg-bolum-alt')}
<p>PostgreSQL değeri planlama sırasında bilmiyor, ama çalışırken bölümleri eliyor. Bu yüzden diğer bölümler <code>never executed</code> yazıyor. Motordan motora değişen konu budur: BigQuery belgesine göre alt sorgu sonucuyla karşılaştırma bölüm elemez, tarih sabit bir ifade olmalıdır.</p>
<h2>BigQuery bölüm kuralları (belgeden)</h2>
<ul>
<li>Filtre bölüm sütunu üzerinde olmalı, sütun karşılaştırmanın bir tarafında yalın kalmalı.</li>
<li>Sütunu başka bir sütunla ya da alt sorguyla karşılaştırmak eleme yapmaz.</li>
<li>Başka sütunlarla <code>AND</code> ile birleşebilir, <code>OR</code> elemeyi bozar.</li>
<li>Bazı yerleşik zaman fonksiyonları desteklenir, diğer fonksiyonlar ve karmaşık matematik tam tarama ister.</li>
<li>Elemeyi doğrulamak için kuru çalıştırma (dry run) ile tahmini baytı kontrol et.</li>
</ul>
<p>SQLite'ın bölümleme özelliği yok. Bu yüzden görevlerde mantığı aralık koşulu ve indeksle çalıştırıyoruz, gerçek bölüm davranışını yukarıdaki çıktılardan okuyoruz.</p>`;
LM('de-partition').ex.push(
  mc('Çeyreklere bölünmüş tabloda <code>WHERE EXTRACT(MONTH FROM txn_time) = 11</code> planı dört bölümü de tarıyor. Düzeltme hangisi?', ["<code>WHERE txn_time &gt;= '2024-11-01' AND txn_time &lt; '2024-12-01'</code>", 'Sorguya <code>LIMIT</code> eklemek', 'Bölüm sayısını artırmak', 'Sorguyu CTE içine almak'], 0, 'Bölüm sütunu yalın ve sınırlar sabit olunca motor tek bölümü okur. LIMIT ve CTE okunan bölümü değiştirmez. Bölüm artırmak yazımı düzeltmez.'),
  mc('PostgreSQL planında üç bölümün altında <code>(never executed)</code> yazıyor. Anlamı nedir?', ['Sorgu hata verdi, o bölümler bozuk', 'Çalışma anında elendiler, hiç okunmadılar', 'Bölümler boş', 'Tahmin hesaplanamadı'], 1, 'Değer çalışma anında belli olunca PostgreSQL gereksiz bölümleri yürütmez. Bu BigQuery gibi her motorda geçerli değildir.'),
  mc("BigQuery'de bölüm sütunu <code>event_date</code>. Hangisi tam taramaya yol açar?", ["<code>WHERE event_date = '2024-12-01' AND user_id = 42</code>", "<code>WHERE event_date = '2024-12-01' OR user_id = 42</code>", "<code>WHERE event_date &gt;= '2024-12-01'</code>", "<code>WHERE event_date BETWEEN '2024-12-01' AND '2024-12-07'</code>"], 1, 'Belgeye göre bölüm koşulu AND ile bağlanmalıdır. OR ile başka sütuna bağlanırsa eleme yapılmaz.')
);

/* ------------------------------------------------------------------ Var olan projeleri güçlendirme */
LM('proje-tsql').ex.push(
  sq("<b>Adım 5.</b> Performans: Adım 3'teki yordam <code>FORMAT(t.txn_time, 'yyyy-MM') = @ay</code> ile süzüyor, tarih sütunu fonksiyona girdiği için indeks araması yapılamaz. Değişkenlerle aralık kur ve 1. şubenin Aralık 2024 hareket sayısını getir: <code>adet</code>. <code>@bas</code> ayın ilk günü, üst sınır <code>DATEADD(month, 1, @bas)</code> olsun.",
    "DECLARE @bas DATE = '2024-12-01';\nSELECT COUNT(*) AS adet\nFROM dbo.bank_txns t\nJOIN dbo.bank_accounts a ON a.account_id = t.account_id\nJOIN dbo.bank_customers c ON c.customer_id = a.customer_id\nWHERE c.branch_id = 1 AND t.txn_time >= @bas AND t.txn_time < DATEADD(month, 1, @bas);",
    'Sütun yalın kalsın, ay hesabı sabit tarafa geçsin.',
    { base: 'tsql', dl: ['tsql'], mustNot: [{ re: '\\b(FORMAT|YEAR|MONTH|CONVERT)\\s*\\(', msg: 'Sütunu fonksiyona sokma. @bas ile aralık yaz.' }], must: [{ re: '\\bDATEADD\\b', msg: 'Üst sınırı DATEADD ile hesapla.' }],
      ynl: ["SELECT COUNT(*) AS adet FROM dbo.bank_txns t JOIN dbo.bank_accounts a ON a.account_id = t.account_id JOIN dbo.bank_customers c ON c.customer_id = a.customer_id WHERE c.branch_id = 1 AND FORMAT(t.txn_time, 'yyyy-MM') = '2024-12';"] }),
  sq('<b>Adım 6.</b> Mutabakat: Aralık 2024 için şubelerin hareket sayılarının toplamı, hareket tablosundaki doğrudan sayıya eşit olmalı. Tek satırda getir: <code>subelerden</code>, <code>dogrudan</code>. (Fark çıkarsa şubesi olmayan müşteri ya da hesabı aranır.)',
    "SELECT (SELECT COUNT(*) FROM dbo.bank_txns t JOIN dbo.bank_accounts a ON a.account_id = t.account_id JOIN dbo.bank_customers c ON c.customer_id = a.customer_id JOIN dbo.bank_branches b ON b.branch_id = c.branch_id WHERE t.txn_time >= '2024-12-01' AND t.txn_time < '2025-01-01') AS subelerden, (SELECT COUNT(*) FROM dbo.bank_txns WHERE txn_time >= '2024-12-01' AND txn_time < '2025-01-01') AS dogrudan;",
    'İki skaler alt sorgu, biri dört tablodan, diğeri doğrudan.',
    { base: 'tsql', dl: ['tsql'], ynl: ["SELECT COUNT(*) AS subelerden, COUNT(*) AS dogrudan FROM dbo.bank_txns;"] }),
  sq('<b>Adım 7.</b> Karar: Müdürler kurulu Aralık 2024 için hareket sayısı en yüksek 3 şubeyi görmek istiyor. <code>name</code>, <code>adet</code>, toplam içindeki pay (<code>pay</code>, %, 1 basamak). Adede göre azalan.',
    "SELECT TOP 3 b.name, COUNT(*) AS adet, ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pay FROM dbo.bank_txns t JOIN dbo.bank_accounts a ON a.account_id = t.account_id JOIN dbo.bank_customers c ON c.customer_id = a.customer_id JOIN dbo.bank_branches b ON b.branch_id = c.branch_id WHERE t.txn_time >= '2024-12-01' AND t.txn_time < '2025-01-01' GROUP BY b.branch_id, b.name ORDER BY adet DESC;",
    'Pay için pencere: <code>SUM(COUNT(*)) OVER ()</code>. Pencere, TOP uygulanmadan önce hesaplanır.',
    { base: 'tsql', dl: ['tsql'], ord: true, ynl: ["SELECT TOP 3 b.name, COUNT(*) AS adet, 0 AS pay FROM dbo.bank_txns t JOIN dbo.bank_accounts a ON a.account_id = t.account_id JOIN dbo.bank_customers c ON c.customer_id = a.customer_id JOIN dbo.bank_branches b ON b.branch_id = c.branch_id GROUP BY b.branch_id, b.name ORDER BY adet DESC;"] })
);
LM('proje-backend').ex.push(
  sq("<b>Adım 5.</b> Ürün listesi kategori içinde fiyata göre sıralı ve anahtar tabanlı sayfalanıyor. Şu uç nokta sorgusu arama yapmalı ve geçici sıralama kurmamalı; indeksi oluştur (adı serbest): <code>SELECT product_id, name, price FROM products WHERE category = 'Elektronik' AND price &gt; 500 ORDER BY price LIMIT 8</code>",
    'CREATE INDEX ix_kategori_fiyat ON products (category, price);',
    'Eşitlik sütunu, sonra aralık ve sıralama sütunu.',
    { nr: 1, dl: IDX, plan: { q: "SELECT product_id, name, price FROM products WHERE category = 'Elektronik' AND price > 500 ORDER BY price LIMIT 8", must: 'category=\\? AND price>\\?', not: 'TEMP B-TREE', msg: 'Parantezde category=? ve price>? görünmeli, TEMP B-TREE kalmamalı.' },
      ynl: ['CREATE INDEX ix_y ON products (price, category);', 'CREATE INDEX ix_y ON products (category);'] })
);
LM('proje-backend').body += '<h3>Karar</h3><p>Uç noktaları yayına almadan önce sepet okuma ve ürün listesi sorgularının planını al, indeks kararını ve yazma bedelini kısa bir notla ekibe yaz. Sorgu ne sıklıkla çalışıyor, tablo ne sıklıkla yazılıyor? Bu proje sonunda şema, sorgular ve indeks birlikte teslim edilir.</p>';
LM('proje-tsql').body += '<h3>Karar ve teslim</h3><p>Son üç adım projeyi rapordan karara taşır: Yordamın filtresini indekse uygun hâle getirirsin, şube toplamlarını doğrudan sayıyla sağlarsın, ardından kurula hangi şubelerin yükü taşıdığını gösterirsin. Teslim: yordam kodu, mutabakat sonucu ve ilk üç şube tablosu.</p>';

/* ------------------------------------------------------------------ Bitirme: Sorgu Optimizasyonu */
const AY = "strftime('%Y-%m', t.txn_time) = '2024-12' AND t.txn_type = 'kart_harcama'";
const ALT = `t.account_id IN (SELECT a.account_id FROM bank_accounts a WHERE a.customer_id = c.customer_id)
     AND ${AY}`;
const ESKI = `SELECT DISTINCT c.customer_id, c.segment,
  (SELECT COUNT(*) FROM bank_txns t
   WHERE ${ALT}) AS islem,
  (SELECT ROUND(SUM(t.amount)) FROM bank_txns t
   WHERE ${ALT}) AS toplam
FROM bank_customers c
JOIN bank_accounts x ON x.customer_id = c.customer_id`;
const AY_YENI = `SELECT a.customer_id, COUNT(*) AS islem, ROUND(SUM(t.amount)) AS toplam
FROM bank_txns t
JOIN bank_accounts a ON a.account_id = t.account_id
WHERE t.txn_type = 'kart_harcama' AND t.txn_time >= '2024-12-01' AND t.txn_time < '2025-01-01'
GROUP BY a.customer_id`;
const YENI = `SELECT c.customer_id, c.segment, COALESCE(k.islem, 0) AS islem, k.toplam
FROM bank_customers c
LEFT JOIN (${AY_YENI}) k ON k.customer_id = c.customer_id`;
const inl = s => s.replace(/\s+/g, ' ').trim();
LS.push({ id: 'opt-proje', lv: 'C1', mod: 'Bitirme Projeleri', min: 60,
  title: 'Bitirme projesi (Sorgu Optimizasyonu): yavaş müşteri raporunu ölç, oku, düzelt, kanıtla',
  sum: 'Gerçekçi yavaş bir rapor üzerinde temel ölçüm, plan okuma, yeniden yazma, indeks tasarımı, mutabakat ve karar notu.',
  en: 'query tuning project case study',
  body: `<h2>Senaryo</h2>
<p>Ilgaz Bank kart ekibi her ay müşteri başına kart harcaması raporu alıyor. Rapor yıllar içinde büyüdü, çalışırken ekran bekliyor. Birim yöneticisi soruyor: <b>"Bu raporu hızlandırabilir miyiz? Ne kadar güvenle, karşılığında ne ödeyerek?"</b> Senden sonuç değişmeden hızlandırılmış sorgu ve bir karar notu bekleniyor.</p>
<h2>Rapor</h2>
${box(ESKI + ';')}
<p>Çalıştır ve süreye bak. Bu süre bu tarayıcıda ölçülür, kendi ortamında farklı olur. Karşılaştırmayı süre yerine plana ve sağlamaya dayandıracağız.</p>
<h2>Veri</h2>
<table><tr><th>Tablo</th><th>Satır</th><th>Mevcut indeks</th></tr>
<tr><td><code>bank_customers</code></td><td>${say('opt-musteri', 500, 'SELECT COUNT(*) FROM bank_customers')}</td><td>Birincil anahtar</td></tr>
<tr><td><code>bank_accounts</code></td><td>${say('opt-hesap', 849, 'SELECT COUNT(*) FROM bank_accounts')}</td><td>Birincil anahtar</td></tr>
<tr><td><code>bank_txns</code></td><td>${say('opt-txn', 42284, 'SELECT COUNT(*) FROM bank_txns')}</td><td>Birincil anahtar, <code>account_id</code></td></tr></table>
<h2>Adımlar</h2>
<table><tr><th>Adım</th><th>Çıktı</th></tr>
<tr><td>1. Temel ölçüm</td><td>Satır sayısı, işlem toplamı, tutar toplamı: her değişiklik bunlarla sağlanır</td></tr>
<tr><td>2. Plan</td><td>Eski raporun planı</td></tr>
<tr><td>3. Darboğaz</td><td>Hangi satır sorun, neden</td></tr>
<tr><td>4. Çekirdek sorgu</td><td>Aylık toplam, aranabilir filtre</td></tr>
<tr><td>5. İndeks</td><td>Çekirdek sorguya kapsayan indeks</td></tr>
<tr><td>6. Yeni rapor</td><td>İlişkili alt sorgu ve DISTINCT yok</td></tr>
<tr><td>7. Mutabakat</td><td>Eski ve yeni arasında fark 0</td></tr>
<tr><td>8-9. Karar</td><td>İndeks bedeli ve yönetici notu</td></tr></table>
<div class="note"><b>Sınır</b>Motor SQLite. Planlar SQLite planıdır, başka motorda aynı yazım başka plan alabilir. Projedeki yaklaşım her motorda geçerlidir: Ölç, oku, tek değişiklik, sağla.</div>
<h3>Teslim</h3>
<p>Tek sayfa: eski ve yeni plan, mutabakat sonucu, eklenen indeks ve bedeli, öneri. Hız kazancını kendi ortamında ölçmeden yazma.</p>
<h3>Kendini değerlendir</h3>
<table><tr><th>Ölçüt</th><th>Başlangıç</th><th>İyi</th><th>Mükemmel</th></tr>
<tr><td>Ölçüm</td><td>Süre yazılmış</td><td>Plan ve sağlama da var</td><td>Birkaç ölçüm, önbellek etkisi not edilmiş</td></tr>
<tr><td>Doğruluk</td><td>Satır sayısı aynı</td><td>Toplamlar aynı</td><td>İki yönlü EXCEPT sıfır</td></tr>
<tr><td>Karar</td><td>İndeks eklenmiş</td><td>Bedel yazılmış</td><td>Sıklık, yazma yükü ve alternatif birlikte tartılmış</td></tr></table>`,
  ex: [
    sq('<b>Adım 1.</b> Sağlama değerlerini al. Eski raporu alt sorgu yap ve tek satırda getir: <code>satir</code> (satır sayısı), <code>islem</code> (işlem toplamı), <code>tutar</code> (tutar toplamı, tam sayı).',
      inl('SELECT COUNT(*) AS satir, SUM(islem) AS islem, ROUND(SUM(toplam)) AS tutar FROM (' + ESKI + ') r;'),
      'Raporu <code>FROM (...) r</code> içine al, dışta topla.',
      { start: 'SELECT COUNT(*) AS satir, SUM(islem) AS islem, ROUND(SUM(toplam)) AS tutar\nFROM (\n' + ESKI + '\n) r;',
        ynl: ['SELECT COUNT(*) AS satir, COUNT(*) AS islem, ROUND(SUM(amount)) AS tutar FROM bank_txns;', "SELECT COUNT(*) AS satir, SUM(CASE WHEN txn_type = 'kart_harcama' THEN 1 ELSE 0 END) AS islem, ROUND(SUM(amount)) AS tutar FROM bank_txns;"] }),
    sq('<b>Adım 2.</b> Eski raporun SQLite planını getir.',
      'EXPLAIN QUERY PLAN ' + inl(ESKI) + ';',
      'Rapor başına <code>EXPLAIN QUERY PLAN</code>.',
      Object.assign({ start: 'EXPLAIN QUERY PLAN\n' + ESKI + ';', ynl: [inl(ESKI) + ';', 'EXPLAIN QUERY PLAN ' + inl(YENI) + ';'] }, SQLITE)),
    mc('Planda iki kez <code>CORRELATED SCALAR SUBQUERY</code>, altlarında <code>CORRELATED LIST SUBQUERY</code> ve <code>SCAN a</code>, sonda <code>USE TEMP B-TREE FOR DISTINCT</code> var. En büyük şüpheli hangisi?', ['DISTINCT; kaldırınca her şey çözülür', 'Her müşteri ve hesap satırı için iki kez çalışan alt sorgular; her seferinde hesap tablosu da taranıyor', 'ROUND fonksiyonu', 'Sütun sayısı'], 1, 'Alt sorgular birleştirme çoğaltmasından sonraki her satırda iki kez çalışır ve içlerinde tarih fonksiyonla süzülür. DISTINCT ise bu çoğaltmayı örten ikinci sorundur.'),
    sq('<b>Adım 4.</b> Çekirdek sorguyu yaz: Aralık 2024 kart harcamaları, müşteri başına <code>customer_id</code>, <code>islem</code>, <code>toplam</code> (tam sayı). Tarih sütunu fonksiyona girmesin (<code>txn_time</code> indeksi bu adımda hazır).',
      inl(AY_YENI) + ';',
      "Yarı açık aralık, sonra müşteri başına <code>GROUP BY</code>.",
      { plan: { setup: 'CREATE INDEX IF NOT EXISTS ix_gizli_tt ON bank_txns (txn_time)', must: 'SEARCH t', msg: 'Plan bank_txns üzerinde arama yapmıyor. Tarihi aralık olarak yaz.' },
        ynl: [inl(AY_YENI).replace("t.txn_time >= '2024-12-01' AND t.txn_time < '2025-01-01'", "strftime('%Y-%m', t.txn_time) = '2024-12'") + ';', inl(AY_YENI).replace("< '2025-01-01'", "<= '2024-12-31'") + ';', inl(AY_YENI).replace("t.txn_type = 'kart_harcama' AND ", '') + ';'] }),
    sq("<b>Adım 5.</b> Çekirdek sorgu için tabloya gitmeyen indeks tasarla (adı serbest): <code>" + esc(inl(AY_YENI)) + "</code>. Tür ve tarih aramada kullanılmalı, plan <code>bank_txns</code> için kapsayan indeks göstermeli.",
      'CREATE INDEX ix_tur_zaman_hesap_tutar ON bank_txns (txn_type, txn_time, account_id, amount);',
      'Eşitlik, aralık, sonra sadece okunan sütunlar.',
      { nr: 1, dl: ['sqlite', 'mysql', 'oracle'], plan: { q: inl(AY_YENI), must: 'SEARCH t USING COVERING INDEX .*txn_type=\\? AND txn_time>\\?', msg: 'Plan t için COVERING INDEX ve parantezde txn_type=? AND txn_time>? göstermeli. account_id ve amount da indekste olmalı.' },
        ynl: ['CREATE INDEX ix_y ON bank_txns (txn_time);', 'CREATE INDEX ix_y ON bank_txns (txn_type, txn_time);', 'CREATE INDEX ix_y ON bank_txns (txn_time, txn_type, account_id, amount);'] }),
    sq('<b>Adım 6.</b> Yeni raporu yaz: sütunlar eski raporla aynı (<code>customer_id</code>, <code>segment</code>, <code>islem</code>, <code>toplam</code>). Harcaması olmayan müşteri de <code>islem = 0</code> ile görünmeli, <code>toplam</code> NULL kalmalı. İlişkili alt sorgu ve DISTINCT olmasın.',
      inl(YENI) + ';',
      'Adım 4 çekirdek sorgusunu müşterilere <code>LEFT JOIN</code> ile bağla.',
      { plan: { not: 'CORRELATED|FOR DISTINCT', msg: 'Planda CORRELATED ya da DISTINCT için geçici yapı kalmamalı.' },
        ynl: [inl(ESKI) + ';', inl(YENI).replace('LEFT JOIN', 'JOIN') + ';', inl(YENI).replace('COALESCE(k.islem, 0)', 'k.islem') + ';'] }),
    sq('<b>Adım 7.</b> Mutabakat. Eski ve yeni rapor arasında iki yönde fark satırı sayısını getir: <code>eskide_fazla</code>, <code>yenide_fazla</code>. İkisi de 0 olmalı. Eski rapor burada iki kez çalıştığı için cevap birkaç saniye sürebilir.',
      inl('SELECT (SELECT COUNT(*) FROM (' + ESKI + ' EXCEPT ' + YENI + ') x) AS eskide_fazla, (SELECT COUNT(*) FROM (' + YENI + ' EXCEPT ' + ESKI + ') y) AS yenide_fazla;'),
      'Her yön için bir <code>EXCEPT</code>, ikisini de say.',
      { must: [{ re: '\\bEXCEPT\\b|\\bMINUS\\b', msg: 'Görev farkı EXCEPT ile hesaplamanı istiyor.' }], ynl: ['SELECT 0 AS eskide_fazla, 0 AS yenide_fazla FROM bank_customers;', 'SELECT 0 AS eskide_fazla, 0 AS yenide_fazla;'] }),
    mc('Rapor ayda bir çalışıyor. <code>bank_txns</code> gün boyu yazılıyor. Dört sütunlu kapsayan indeks için en dengeli karar hangisi?', ['Ne olursa olsun ekle, rapor hızlanacak', 'Önce yeniden yazımı al; indeksi yazma bedeliyle tart, gerekirse raporu özet tablo ya da rapor kopyasında çalıştır', 'Yazmaları raporda durdur', 'Bütün indeksleri kaldırıp yeniden yazıma güven'], 1, 'Yazım düzeltmesi bedelsizdir, önce o alınır. Ayda bir çalışan rapor için her yazmaya binen indeks pahalı olabilir. Bu tartıyı ölçümle yap.'),
    mc('Yöneticiye yazılacak en dürüst özet hangisi?', ['"Rapor kesinlikle 100 kat hızlandı."', '"Sonuç değişmedi (iki yönlü fark 0). Alt sorgular kalktı, tarih filtresi arama yapıyor. Süre kazancını üretimde ölçeceğiz, indeks için yazma etkisini de izleyeceğiz."', '"Sorgu artık modern SQL ile yazıldı."', '"İndeks eklendi, sorun bitti."'], 1, 'Kanıtladığını söyle, ölçmediğini söyleme. Tarayıcı süresini üretime taşımak yanıltır.')
  ] });

/* ------------------------------------------------------------------ Bitirme: Pedal İzmir kamyonet */
const NET = `WITH giden AS (SELECT start_station AS st, COUNT(*) AS n FROM bk_trips GROUP BY start_station),
     gelen AS (SELECT end_station AS st, COUNT(*) AS n FROM bk_trips WHERE end_station IS NOT NULL GROUP BY end_station)`;
const NETK = NET + `,
     kin AS (SELECT to_station AS st, COUNT(*) AS n FROM bk_rebalancing GROUP BY to_station),
     kout AS (SELECT from_station AS st, COUNT(*) AS n FROM bk_rebalancing GROUP BY from_station),
     a AS (SELECT s.station_id, s.name, s.district, s.capacity,
                  COALESCE(gelen.n, 0) - COALESCE(giden.n, 0) AS net,
                  COALESCE(kin.n, 0) - COALESCE(kout.n, 0) AS kamyon
           FROM bk_stations s
           LEFT JOIN giden ON giden.st = s.station_id
           LEFT JOIN gelen ON gelen.st = s.station_id
           LEFT JOIN kin ON kin.st = s.station_id
           LEFT JOIN kout ON kout.st = s.station_id)`;
LS.push({ id: 'bv-proje', lv: 'C1', mod: 'Bitirme Projeleri', min: 60,
  title: 'Bitirme projesi (Büyük Veri): Pedal İzmir kamyonet bütçesi nereden kısılır?',
  sum: 'Yolculuk ve kamyonet taşımalarıyla istasyon dengesizliği, zamanlama ve aynı ilçe taşımaları; sağlamalı adımlar ve karar önerisi.',
  en: 'rebalancing project net flow station imbalance',
  body: `<h2>Senaryo</h2>
<p>Pedal İzmir yönetimi kamyonet maliyetini kısmak istiyor. Operasyon müdürü soruyor: <b>"Taşımaların nereden kısılması en az zarar verir? Hangi istasyonlar kamyonete gerçekten bağımlı, hangi taşımalar başka yolla azaltılabilir?"</b> Üç aylık veriyle bir öneri hazırlayacaksın.</p>
<h2>Veri</h2>
<table><tr><th>Tablo</th><th>Satır</th><th>İçerik</th></tr>
<tr><td><code>bk_trips</code></td><td>${say('bv-trip', 116517, 'SELECT COUNT(*) FROM bk_trips')}</td><td>Yolculuklar: <code>start_station</code>, <code>end_station</code>, <code>started_at</code></td></tr>
<tr><td><code>bk_rebalancing</code></td><td>${say('bv-reb', 28180, 'SELECT COUNT(*) FROM bk_rebalancing')}</td><td>Kamyonet taşımaları: <code>from_station</code>, <code>to_station</code>, <code>moved_at</code></td></tr>
<tr><td><code>bk_stations</code></td><td>${say('bv-ist', 62, 'SELECT COUNT(*) FROM bk_stations')}</td><td>İstasyon, ilçe, kapasite</td></tr></table>
<h2>Adımlar</h2>
<table><tr><th>Adım</th><th>Çıktı</th><th>Sağlama</th></tr>
<tr><td>1</td><td>Kapsam ve veri kontrolü</td><td>Kapanmamış yolculuk sayısı biliniyor</td></tr>
<tr><td>2</td><td>Net akış tablosu</td><td>Büyük tabloda birleştirmeden önce topla</td></tr>
<tr><td>3</td><td>Net akış mutabakatı</td><td>Net akış toplamı, kapanmamış yolculuğun eksilisine eşit</td></tr>
<tr><td>4</td><td>Kamyonet ne kadar dengeliyor?</td><td>Karşılama oranı</td></tr>
<tr><td>5</td><td>Kapasiteye göre baskı</td><td>Mutlak sayı yerine karşılaştırılabilir ölçü</td></tr>
<tr><td>6</td><td>Zamanlama</td><td>En sorunlu istasyonda kayıp ve taşıma saatleri</td></tr>
<tr><td>7-8</td><td>Aynı ilçe taşımaları ve senaryo</td><td>Varsayım açıkça yazılı</td></tr>
<tr><td>9-10</td><td>Karar</td><td>Öneri ve riskleri</td></tr></table>
<p>Kapanmamış yolculuğun bitiş istasyonu yoktur, bu yüzden net akış toplamı sıfır olmaz. Bu farkı açıklayamıyorsan sonraki adımlara geçme.</p>
<div class="note"><b>Sınır</b>Veri kurgudur ve maliyet bilgisi içermez. Bu yüzden öneri taşıma adedi üzerinden yapılır. Teşvik senaryosundaki azalma oranı varsayımdır, ölçüm değil: gerçek etki pilotla ölçülür.</div>
<h3>Teslim</h3>
<p>Tek sayfa: Kamyonete bağımlı istasyonlar, aynı ilçe taşıma payı, önerilen pilot ve neyi ölçeceğin.</p>
<h3>Kendini değerlendir</h3>
<table><tr><th>Ölçüt</th><th>Başlangıç</th><th>İyi</th><th>Mükemmel</th></tr>
<tr><td>Doğruluk</td><td>Net akış hesaplandı</td><td>Mutabakat yapıldı</td><td>Kapanmamış yolculuk farkı açıklandı</td></tr>
<tr><td>Analiz</td><td>Mutlak sıralama</td><td>Kapasiteye göre baskı</td><td>Zamanlama ve ilçe boyutu da var</td></tr>
<tr><td>Karar</td><td>Liste</td><td>Öneri</td><td>Varsayım, risk ve ölçüm planı açık</td></tr></table>`,
  ex: [
    sq('<b>Adım 1.</b> Kapsamı doğrula. Tek satırda: <code>yolculuk</code>, <code>kapanmamis</code> (<code>end_station</code> boş), <code>tasima</code> (kamyonet taşıması), <code>ilk</code> ve <code>son</code> (yolculuk başlangıç tarihleri, YYYY-AA-GG).',
      "SELECT COUNT(*) AS yolculuk, SUM(CASE WHEN end_station IS NULL THEN 1 ELSE 0 END) AS kapanmamis, (SELECT COUNT(*) FROM bk_rebalancing) AS tasima, MIN(date(started_at)) AS ilk, MAX(date(started_at)) AS son FROM bk_trips;",
      'Kamyonet sayısı için skaler alt sorgu.',
      { ynl: ["SELECT COUNT(*) AS yolculuk, COUNT(end_station) AS kapanmamis, (SELECT COUNT(*) FROM bk_rebalancing) AS tasima, MIN(date(started_at)) AS ilk, MAX(date(started_at)) AS son FROM bk_trips;", "SELECT COUNT(*) AS yolculuk, SUM(CASE WHEN end_station IS NULL THEN 1 ELSE 0 END) AS kapanmamis, COUNT(*) AS tasima, MIN(date(started_at)) AS ilk, MAX(date(started_at)) AS son FROM bk_trips;"] }),
    sq('<b>Adım 2.</b> Net akış: <code>gelen − giden</code>. En çok boşalan 5 istasyon: <code>name</code>, <code>net</code>. Küçükten büyüğe, eşitlikte ada göre. Yolculuk tablosunu istasyonlara <code>OR</code> ile birleştirme, ilişkili alt sorgu da kullanma: önce topla.',
      inl(NET + ` SELECT s.name, COALESCE(gelen.n, 0) - COALESCE(giden.n, 0) AS net FROM bk_stations s LEFT JOIN giden ON giden.st = s.station_id LEFT JOIN gelen ON gelen.st = s.station_id ORDER BY net, s.name LIMIT 5;`),
      'Biri başlangıca, biri bitişe göre iki CTE.',
      { ord: true, start: NET + `\nSELECT s.name, COALESCE(gelen.n, 0) - COALESCE(giden.n, 0) AS net\nFROM bk_stations s\n-- buradan devam et\n`, mustNot: [{ re: '\\bOR\\b', msg: 'OR ile birleştirme. Görev önce toplamanı istiyor.' }], plan: { not: 'CORRELATED', msg: 'Planda CORRELATED kalmamalı.' },
        ynl: ["SELECT s.name, SUM(CASE WHEN t.end_station = s.station_id THEN 1 ELSE 0 END) - SUM(CASE WHEN t.start_station = s.station_id THEN 1 ELSE 0 END) AS net FROM bk_stations s JOIN bk_trips t ON t.start_station = s.station_id OR t.end_station = s.station_id GROUP BY s.station_id, s.name ORDER BY net, s.name LIMIT 5;", "SELECT s.name, (SELECT COUNT(*) FROM bk_trips t WHERE t.end_station = s.station_id) - (SELECT COUNT(*) FROM bk_trips t WHERE t.start_station = s.station_id) AS net FROM bk_stations s ORDER BY net, s.name LIMIT 5;", inl(NET + ` SELECT s.name, COALESCE(giden.n, 0) - COALESCE(gelen.n, 0) AS net FROM bk_stations s LEFT JOIN giden ON giden.st = s.station_id LEFT JOIN gelen ON gelen.st = s.station_id ORDER BY net, s.name LIMIT 5;`)] }),
    sq('<b>Adım 3.</b> Mutabakat. Tüm istasyonların net akış toplamı, kapanmamış yolculuk sayısının eksilisine eşit olmalı. Tek satırda: <code>net_toplam</code>, <code>kapanmamis</code>, <code>tutuyor</code> (eşitse 1, değilse 0).',
      inl(NET + ` SELECT t.net_toplam, k.kapanmamis, CASE WHEN t.net_toplam = -k.kapanmamis THEN 1 ELSE 0 END AS tutuyor FROM (SELECT COALESCE((SELECT SUM(n) FROM gelen), 0) - COALESCE((SELECT SUM(n) FROM giden), 0) AS net_toplam) t CROSS JOIN (SELECT COUNT(*) AS kapanmamis FROM bk_trips WHERE end_station IS NULL) k;`),
      'Toplam gelen eksi toplam giden; ayrıca boş bitişli yolculuk sayısı.',
      { ynl: ['SELECT 0 AS net_toplam, COUNT(*) AS kapanmamis, 1 AS tutuyor FROM bk_trips WHERE end_station IS NULL;', 'SELECT COUNT(*) AS net_toplam, COUNT(*) AS kapanmamis, 1 AS tutuyor FROM bk_trips WHERE end_station IS NULL;'] }),
    sq('<b>Adım 4.</b> Kamyonet ne kadar dengeliyor? İstasyon başına <code>net</code> ve kamyonet neti (<code>kamyon</code> = gelen taşıma − giden taşıma) hesapla. Tek satırda: <code>mutlak_net</code> (mutlak net akışların toplamı), <code>mutlak_kalan</code> (<code>net + kamyon</code> mutlak toplamı), <code>karsilama</code> (dengelenen pay, %, 1 basamak).',
      inl(NETK + ` SELECT SUM(ABS(net)) AS mutlak_net, SUM(ABS(net + kamyon)) AS mutlak_kalan, ROUND(100.0 * (SUM(ABS(net)) - SUM(ABS(net + kamyon))) / SUM(ABS(net)), 1) AS karsilama FROM a;`),
      'Dört CTE: giden, gelen, kamyonet gelen, kamyonet giden.',
      { start: NETK + `\n-- a tablosu hazır: station_id, name, district, capacity, net, kamyon\nSELECT\n  FROM a;`, ynl: [inl(NETK + ` SELECT SUM(net) AS mutlak_net, SUM(net + kamyon) AS mutlak_kalan, 100.0 AS karsilama FROM a;`), inl(NETK + ` SELECT SUM(ABS(net)) AS mutlak_net, SUM(ABS(kamyon)) AS mutlak_kalan, ROUND(100.0 * SUM(ABS(kamyon)) / SUM(ABS(net)), 1) AS karsilama FROM a;`)] }),
    sq('<b>Adım 5.</b> Kapasiteye göre baskı: <code>net / 92 / capacity</code> (92 gün). En baskılı 5 istasyon: <code>name</code>, <code>capacity</code>, <code>net</code>, <code>baski</code> (2 basamak). Baskıya göre artan, eşitlikte ada göre.',
      inl(NETK + ` SELECT name, capacity, net, ROUND(net / 92.0 / capacity, 2) AS baski FROM a ORDER BY baski, name LIMIT 5;`),
      '92.0 yaz, tam sayı bölmesine düşme.',
      { ord: true, start: NETK + `\n-- a tablosu hazır: station_id, name, district, capacity, net, kamyon\nSELECT name, capacity, net\nFROM a;`, ynl: [inl(NETK + ` SELECT name, capacity, net, ROUND(net / 92 / capacity, 2) AS baski FROM a ORDER BY baski, name LIMIT 5;`), inl(NETK + ` SELECT name, capacity, net, ROUND(net / 92.0 / capacity, 2) AS baski FROM a ORDER BY net, name LIMIT 5;`)] }),
    sq("<b>Adım 6.</b> Zamanlama. En baskılı istasyon Alsancak Çarşı (<code>station_id = 12</code>). Dört dilimde (saat 00-05 <code>1-gece</code>, 06-11 <code>2-sabah</code>, 12-18 <code>3-ogle</code>, 19-23 <code>4-aksam</code>) yolculuk neti ve kamyonet neti: <code>dilim</code>, <code>yolculuk_net</code>, <code>kamyon_net</code>. Dilime göre sırala; hiç taşıma olmayan dilimde 0 yaz.",
      inl(`WITH d AS (SELECT '1-gece' AS dilim, '00' AS bas, '06' AS bit UNION ALL SELECT '2-sabah', '06', '12' UNION ALL SELECT '3-ogle', '12', '19' UNION ALL SELECT '4-aksam', '19', '24'),
y AS (SELECT strftime('%H', started_at) AS h, SUM(CASE WHEN end_station = 12 THEN 1 ELSE 0 END) - SUM(CASE WHEN start_station = 12 THEN 1 ELSE 0 END) AS n FROM bk_trips WHERE start_station = 12 OR end_station = 12 GROUP BY strftime('%H', started_at)),
k AS (SELECT strftime('%H', moved_at) AS h, SUM(CASE WHEN to_station = 12 THEN 1 ELSE 0 END) - SUM(CASE WHEN from_station = 12 THEN 1 ELSE 0 END) AS n FROM bk_rebalancing WHERE from_station = 12 OR to_station = 12 GROUP BY strftime('%H', moved_at))
SELECT d.dilim, COALESCE((SELECT SUM(y.n) FROM y WHERE y.h >= d.bas AND y.h < d.bit), 0) AS yolculuk_net, COALESCE((SELECT SUM(k.n) FROM k WHERE k.h >= d.bas AND k.h < d.bit), 0) AS kamyon_net FROM d ORDER BY d.dilim;`),
      'Önce saat başına iki özet, sonra dilim tablosuna göre topla. Hem başlangıcı hem bitişi 12 olan yolculuk neti değiştirmez.',
      Object.assign({ ord: true, ynl: ["SELECT '1-gece' AS dilim, 0 AS yolculuk_net, 0 AS kamyon_net;", "SELECT strftime('%H', started_at) AS dilim, COUNT(*) AS yolculuk_net, 0 AS kamyon_net FROM bk_trips WHERE start_station = 12 GROUP BY 1 ORDER BY 1;"] }, SQLITE)),
    mc('Önceki sonuçta Alsancak Çarşı en çok öğleden akşama kadar bisiklet kaybediyor. Kamyonet ise gece ve öğlen dilimlerinde geliyor, akşam dilimine hiç taşıma yok. Bu ne düşündürür?', ['Kamyonet tamamen gereksiz', 'Akşam kaybı ertesi geceye kadar karşılanmıyor olabilir; akşam zirvesinde boş kalma süresi ölçülmeli', 'Veri hatalı olmalı, çünkü zamanlar eşleşmiyor', 'Sorun yalnız sabahtır'], 1, 'Toplamda dengelenmesi, gün içinde hiç boş kalmadığı anlamına gelmez. Bu veride anlık doluluk yok; bu yüzden öneri "ölçülmeli" der, kesin hüküm vermez.'),
    sq('<b>Adım 7.</b> Kamyonet taşımalarının aynı ilçe içinde kalan payı. Tek satırda: <code>toplam</code>, <code>ayni_ilce</code>, <code>pay</code> (%, 1 basamak).',
      'SELECT COUNT(*) AS toplam, SUM(CASE WHEN f.district = t.district THEN 1 ELSE 0 END) AS ayni_ilce, ROUND(100.0 * SUM(CASE WHEN f.district = t.district THEN 1 ELSE 0 END) / COUNT(*), 1) AS pay FROM bk_rebalancing r JOIN bk_stations f ON f.station_id = r.from_station JOIN bk_stations t ON t.station_id = r.to_station;',
      'İstasyon tablosunu iki kez, farklı takma adlarla bağla.',
      { ynl: ['SELECT COUNT(*) AS toplam, COUNT(*) AS ayni_ilce, 100.0 AS pay FROM bk_rebalancing;', 'SELECT COUNT(*) AS toplam, SUM(CASE WHEN r.from_station = r.to_station THEN 1 ELSE 0 END) AS ayni_ilce, 0 AS pay FROM bk_rebalancing r;'] }),
    sq('<b>Adım 8.</b> Senaryo. Aynı ilçe içinde en çok taşınan 5 çifte fiyat teşviki koyduğumuzu ve bu çiftlerde taşımanın %30 azaldığını <b>varsayalım</b>. Tek satırda: <code>bes_cift</code> (bu çiftlerin taşıması), <code>tasarruf</code> (%30\'u, tam sayı), <code>genel_pay</code> (tasarrufun tüm taşımaya oranı, %, 1 basamak).',
      "WITH c AS (SELECT r.from_station, r.to_station, COUNT(*) AS n FROM bk_rebalancing r JOIN bk_stations f ON f.station_id = r.from_station JOIN bk_stations t ON t.station_id = r.to_station WHERE f.district = t.district GROUP BY r.from_station, r.to_station ORDER BY n DESC, r.from_station, r.to_station LIMIT 5) SELECT SUM(n) AS bes_cift, ROUND(SUM(n) * 0.3) AS tasarruf, ROUND(100.0 * SUM(n) * 0.3 / (SELECT COUNT(*) FROM bk_rebalancing), 1) AS genel_pay FROM c;",
      'Önce ilçe içi çiftleri grupla, ilk 5\'i al, sonra topla.',
      { ynl: ["SELECT COUNT(*) AS bes_cift, ROUND(COUNT(*) * 0.3) AS tasarruf, 30.0 AS genel_pay FROM bk_rebalancing;", "WITH c AS (SELECT r.from_station, r.to_station, COUNT(*) AS n FROM bk_rebalancing r GROUP BY r.from_station, r.to_station ORDER BY n DESC LIMIT 5) SELECT SUM(n) AS bes_cift, ROUND(SUM(n) * 0.3) AS tasarruf, 0 AS genel_pay FROM c;"] }),
    sq('<b>Adım 9.</b> Karar tablosu. Baskıya göre istasyonları sınıflandır: baskı −0,25 veya altı <code>kamyonete bağımlı</code>, +0,25 veya üstü <code>sürekli dolan</code>, diğerleri <code>dengeli</code>. Sınıf başına <code>sinif</code>, <code>istasyon</code>, <code>tasima</code> (o sınıftaki istasyonların mutlak kamyonet neti toplamı). <code>tasima</code>ya göre azalan.',
      inl(NETK + ` SELECT CASE WHEN net / 92.0 / capacity <= -0.25 THEN 'kamyonete bağımlı' WHEN net / 92.0 / capacity >= 0.25 THEN 'sürekli dolan' ELSE 'dengeli' END AS sinif, COUNT(*) AS istasyon, SUM(ABS(kamyon)) AS tasima FROM a GROUP BY CASE WHEN net / 92.0 / capacity <= -0.25 THEN 'kamyonete bağımlı' WHEN net / 92.0 / capacity >= 0.25 THEN 'sürekli dolan' ELSE 'dengeli' END ORDER BY tasima DESC;`),
      'Aynı <code>CASE</code> hem seçimde hem gruplamada.',
      { ord: true, start: NETK + `\n-- a tablosu hazır: station_id, name, district, capacity, net, kamyon\nSELECT\n  FROM a;`, ynl: [inl(NETK + ` SELECT CASE WHEN net <= -0.25 THEN 'kamyonete bağımlı' WHEN net >= 0.25 THEN 'sürekli dolan' ELSE 'dengeli' END AS sinif, COUNT(*) AS istasyon, SUM(ABS(kamyon)) AS tasima FROM a GROUP BY 1 ORDER BY tasima DESC;`)] }),
    mc('Önceki adımlara göre operasyon müdürüne en sağlam öneri hangisi?', ['Kamyonetleri %50 azalt, veriye göre sorun çıkmaz', 'Baskısı yüksek istasyonlarda kamyoneti koru ya da kapasiteyi incele; dengeli sınıftaki ilçe içi taşımalarda fiyat teşviki pilotu yap; azalma oranını varsayım olarak yaz ve pilotta ölç', 'Bütün taşımaları geceye al', 'En çok yolculuk yapılan istasyonları kapat'], 1, 'Karar sınıflara dayanıyor ve varsayımı açıkça söylüyor. Veride maliyet ve anlık doluluk olmadığı için kesin tasarruf rakamı vermek yanıltıcı olur.')
  ] });

/* ------------------------------------------------------------------ Bitirme: YZ çıktısını doğrulama */
const SN = 'ROUND((julianday(o.delivered_at) - julianday(o.placed_at)) * 86400)';
const YZ_TASLAK = `SELECT c.full_name, COUNT(*) AS teslimat,
       ROUND(100.0 * SUM(CASE WHEN (julianday(o.delivered_at) - julianday(o.placed_at)) * 1440 <= 45 THEN 1 ELSE 0 END) / COUNT(*), 1) AS oran
FROM lk_orders o
JOIN lk_couriers c ON c.courier_id = o.courier_id
JOIN lk_order_lines l ON l.order_id = o.order_id
GROUP BY c.full_name
HAVING COUNT(*) >= 100 AND ROUND(100.0 * SUM(CASE WHEN (julianday(o.delivered_at) - julianday(o.placed_at)) * 1440 <= 45 THEN 1 ELSE 0 END) / COUNT(*), 1) >= 85
ORDER BY oran DESC`;
const YZ_DOGRU = `SELECT c.courier_id, c.full_name, COUNT(*) AS teslimat, ROUND(100.0 * SUM(CASE WHEN ${SN} <= 2700 THEN 1 ELSE 0 END) / COUNT(*), 1) AS oran FROM lk_orders o JOIN lk_couriers c ON c.courier_id = o.courier_id WHERE o.status = 'teslim' GROUP BY c.courier_id, c.full_name HAVING COUNT(*) >= 100 AND ROUND(100.0 * SUM(CASE WHEN ${SN} <= 2700 THEN 1 ELSE 0 END) / COUNT(*), 1) >= 85`;
LS.push({ id: 'ai-proje', lv: 'B2', mod: 'Bitirme Projeleri', min: 50,
  title: 'Bitirme projesi (Yapay Zekâ Destekli SQL): asistanın yazdığı prim sorgusunu doğrula',
  sum: 'Yapay zekâ asistanının ürettiği makul görünen sorgudaki hataları sağlamayla bulmak, düzeltmek, etkisini ölçmek ve karar vermek.',
  en: 'ai generated sql validation project',
  body: `<h2>Senaryo</h2>
<p>Lezzet Kurye operasyon müdürü yapay zekâ asistanına şunu sordu: <b>"Kuryeleri zamanında teslim oranına göre sırala. En az 100 teslimatı olan ve oranı %85 ve üstü olanlara prim vereceğiz."</b> Asistan aşağıdaki sorguyu yazdı. Sonuç listesi makul görünüyor, müdür listeyi insan kaynaklarına göndermek üzere. Senden önce bir kontrol istiyor.</p>
${box(YZ_TASLAK + ';')}
<p>İş kuralı: Zamanında teslim, sipariş verildikten sonra en çok 45 dakika (2.700 saniye) demektir. Yalnız <code>status = 'teslim'</code> sayılır: <code>iptal</code> ve <code>iade</code> teslimat değildir. Kurye kimliği <code>courier_id</code> ile belirlenir.</p>
<h2>Adımlar</h2>
<table><tr><th>Adım</th><th>Soru</th></tr>
<tr><td>1</td><td>Asistana ne verilmeliydi?</td></tr>
<tr><td>2</td><td>Satır sayısı neyi saydığını söylüyor mu?</td></tr>
<tr><td>3</td><td>Her durumdan kaçı sayılmış?</td></tr>
<tr><td>4</td><td>Ad ile gruplamak güvenli mi?</td></tr>
<tr><td>5</td><td>Düzeltilmiş sorgu</td></tr>
<tr><td>6</td><td>Düzeltilmiş sonuç kaynakla tutuyor mu?</td></tr>
<tr><td>7</td><td>Hata kimi etkiledi?</td></tr>
<tr><td>8</td><td>Tek tanım: görünüm</td></tr>
<tr><td>9-10</td><td>Karar ve güvenli kullanım</td></tr></table>
<div class="note"><b>Sınır</b>Bu projede gerçek bir yapay zekâ modeli çalışmıyor: taslak sorgu sabittir ve yaygın hatalar bilerek konmuştur. Öğrendiğin doğrulama yöntemi hangi aracı kullanırsan kullan geçerlidir.</div>
<h3>Teslim</h3>
<p>Kısa not: Bulunan hatalar, her birinin sayısal etkisi, doğru liste ve bundan sonra kullanılacak görünüm.</p>
<h3>Kendini değerlendir</h3>
<table><tr><th>Ölçüt</th><th>Başlangıç</th><th>İyi</th><th>Mükemmel</th></tr>
<tr><td>Doğrulama</td><td>Sorgu çalıştı</td><td>Toplamlar kaynakla sağlandı</td><td>Her hatanın etkisi sayıyla gösterildi</td></tr>
<tr><td>Düzeltme</td><td>Liste düzeldi</td><td>İş kuralı yazılı</td><td>Tek tanım görünüme alındı</td></tr>
<tr><td>Karar</td><td>Liste gönderildi</td><td>Etkilenenler söylendi</td><td>İnsan onayı ve veri paylaşım kuralı belirlendi</td></tr></table>`,
  ex: [
    mc('Asistana sorudan önce hangi bilgi verilseydi bu hatalar en çok azalırdı?', ['Şirketin kuruluş yılı', 'Şema, tablo ilişkileri ve iş kuralları: teslim tanımı, 45 dakika sınırı, kurye kimliği', 'Tablolardaki bütün müşteri adları ve adresleri', 'Yalnız "dikkatli yaz" uyarısı'], 1, 'Model eksik tanımı tahminle doldurur. Şema ve kural yeterlidir, kişisel veriyi paylaşmak gerekmez.'),
    sq('<b>Adım 2.</b> Fan-out kontrolü. Taslak <code>lk_order_lines</code> ile birleşiyor. Tek satırda: teslim edilen sipariş sayısı (<code>siparis</code>) ve taslağın aynı siparişlerde saydığı satır (<code>taslak_satir</code>).',
      "SELECT (SELECT COUNT(*) FROM lk_orders WHERE status = 'teslim') AS siparis, (SELECT COUNT(*) FROM lk_orders o JOIN lk_order_lines l ON l.order_id = o.order_id WHERE o.status = 'teslim') AS taslak_satir;",
      'İki sayım, biri kalemlerle birleşmiş.',
      { ynl: ["SELECT COUNT(*) AS siparis, COUNT(*) AS taslak_satir FROM lk_orders WHERE status = 'teslim';", "SELECT (SELECT COUNT(*) FROM lk_orders) AS siparis, (SELECT COUNT(*) FROM lk_orders o JOIN lk_order_lines l ON l.order_id = o.order_id) AS taslak_satir;"] }),
    sq('<b>Adım 3.</b> Taslak durum süzmüyor. Durum başına sipariş sayısı ve teslim zamanı boş olanlar (taslakta bunlar "zamanında değil" sayılıyor): <code>status</code>, <code>siparis</code>, <code>teslim_zamani_bos</code>. Duruma göre sırala.',
      'SELECT status, COUNT(*) AS siparis, SUM(CASE WHEN delivered_at IS NULL THEN 1 ELSE 0 END) AS teslim_zamani_bos FROM lk_orders GROUP BY status ORDER BY status;',
      'İptal siparişte teslim zamanı yoktur: fark NULL olur ve <code>CASE</code> onu "zamanında değil" sayar.',
      { ord: true, ynl: ['SELECT status, COUNT(*) AS siparis, COUNT(delivered_at) AS teslim_zamani_bos FROM lk_orders GROUP BY status ORDER BY status;'] }),
    sq('<b>Adım 4.</b> Ad ile gruplamak güvenli mi? Birden çok kuryede geçen ad sayısını bul: <code>tekrar_eden_ad</code>. Sonuç 0 olsa bile <code>courier_id</code> kullanacağız, çünkü yarın değişebilir.',
      'SELECT COUNT(*) AS tekrar_eden_ad FROM (SELECT full_name FROM lk_couriers GROUP BY full_name HAVING COUNT(*) > 1) t;',
      'Ada göre grupla, 1\'den çok olanları say.',
      { ynl: ['SELECT COUNT(*) AS tekrar_eden_ad FROM lk_couriers;', 'SELECT COUNT(DISTINCT full_name) AS tekrar_eden_ad FROM lk_couriers;'] }),
    sq('<b>Adım 5.</b> Düzelt. Yalnız teslim edilen siparişler, kalem birleşimi yok, kimlikle grupla, sınır saniye olarak. En az 100 teslimat ve oran %85 ve üstü: <code>courier_id</code>, <code>full_name</code>, <code>teslimat</code>, <code>oran</code> (1 basamak). Orana göre azalan, eşitlikte <code>courier_id</code>.',
      YZ_DOGRU + ' ORDER BY oran DESC, c.courier_id;',
      'Taslaktan <code>lk_order_lines</code> birleşimini çıkar, <code>WHERE</code> ekle.',
      { ord: true, start: YZ_TASLAK + ';', mustNot: [{ re: '\\blk_order_lines\\b', msg: 'Kalem birleşimi sayıları şişiriyor. Çıkar.' }],
        ynl: [YZ_TASLAK + ';', YZ_DOGRU.replace("WHERE o.status = 'teslim' ", '') + ' ORDER BY oran DESC, c.courier_id;', YZ_DOGRU.replace('COUNT(*) >= 100 AND ', '') + ' ORDER BY oran DESC, c.courier_id;'] }),
    sq('<b>Adım 6.</b> Sağlama: Filtreden önceki kurye özetinin toplamı kaynakla tutmalı. Tek satırda: <code>kurye</code>, <code>ozet_toplam</code> (kuryelerin teslimat toplamı), <code>kaynak</code> (doğrudan teslim sayısı).',
      "SELECT COUNT(*) AS kurye, SUM(n) AS ozet_toplam, (SELECT COUNT(*) FROM lk_orders WHERE status = 'teslim') AS kaynak FROM (SELECT courier_id, COUNT(*) AS n FROM lk_orders WHERE status = 'teslim' GROUP BY courier_id) t;",
      'Kurye başına say, dışta topla, skaler alt sorguyla karşılaştır.',
      { ynl: ["SELECT COUNT(*) AS kurye, COUNT(*) AS ozet_toplam, COUNT(*) AS kaynak FROM lk_orders WHERE status = 'teslim';", "SELECT COUNT(*) AS kurye, SUM(n) AS ozet_toplam, (SELECT COUNT(*) FROM lk_orders) AS kaynak FROM (SELECT courier_id, COUNT(*) AS n FROM lk_orders GROUP BY courier_id) t;"] }),
    sq('<b>Adım 7.</b> Hata kimi etkiledi? Taslağa göre prim alan kişi sayısı (<code>taslak</code>), doğru listeye göre (<code>dogru</code>), ve doğru listede olup taslakta olmayanlar (<code>haksiz_elenen</code>). Ad üzerinden karşılaştır.',
      inl(`WITH ta AS (${YZ_TASLAK}), dg AS (${YZ_DOGRU}) SELECT (SELECT COUNT(*) FROM ta) AS taslak, (SELECT COUNT(*) FROM dg) AS dogru, (SELECT COUNT(*) FROM dg WHERE full_name NOT IN (SELECT full_name FROM ta)) AS haksiz_elenen;`),
      'İki sorguyu CTE yap, sonra karşılaştır.',
      { ynl: ['SELECT 0 AS taslak, 0 AS dogru, 0 AS haksiz_elenen FROM lk_couriers;', inl(`WITH ta AS (${YZ_TASLAK}) SELECT (SELECT COUNT(*) FROM ta) AS taslak, (SELECT COUNT(*) FROM ta) AS dogru, 0 AS haksiz_elenen;`)] }),
    sq("<b>Adım 8.</b> Tek tanım. Asistan ve raporlar hep aynı hesabı kullansın: <code>v_kurye_performans</code> görünümünü oluştur (kurye başına <code>courier_id</code>, <code>teslimat</code>, <code>oran</code>; yalnız teslim, sınır 2.700 saniye, filtre yok). Sonra görünümden primi hak eden kurye sayısını getir: <code>prim_alan</code>.",
      `CREATE VIEW v_kurye_performans AS SELECT o.courier_id, COUNT(*) AS teslimat, ROUND(100.0 * SUM(CASE WHEN ${SN} <= 2700 THEN 1 ELSE 0 END) / COUNT(*), 1) AS oran FROM lk_orders o WHERE o.status = 'teslim' GROUP BY o.courier_id; SELECT COUNT(*) AS prim_alan FROM v_kurye_performans WHERE teslimat >= 100 AND oran >= 85;`,
      'Önce <code>CREATE VIEW</code>, sonra görünümden say.',
      { must: [{ re: '\\bv_kurye_performans\\b', msg: 'Sonuç görünümden okunmalı.' }], ynl: [`SELECT COUNT(*) AS prim_alan FROM lk_couriers;`, `CREATE VIEW v_kurye_performans AS SELECT o.courier_id, COUNT(*) AS teslimat, ROUND(100.0 * SUM(CASE WHEN ${SN} <= 2700 THEN 1 ELSE 0 END) / COUNT(*), 1) AS oran FROM lk_orders o GROUP BY o.courier_id; SELECT COUNT(*) AS prim_alan FROM v_kurye_performans WHERE teslimat >= 100 AND oran >= 85;`] }),
    mc('Liste doğrulandı. Müdüre ne önerirsin?', ['Asistanın ilk listesini gönderelim, fark küçük', 'Doğru listeyi gönderelim; kuralı ve görünümü yazılı tutalım; para etkili çıktıda yapay zekâ taslağı insan onayı ve sağlama olmadan kullanılmasın', 'Primi bu ay iptal edelim', 'Asistanı tamamen yasaklayalım'], 1, 'Araç hızlıdır, sorumluluk insandadır. Doğru liste, tek tanım ve onay adımı sorunu kökten çözer.'),
    mc('Asistana soru sorarken hangisi kişisel veri açısından doğrudur?', ['Doğruluk için kurye ad, telefon ve adreslerini paylaşmak', 'Şema, sütun açıklaması ve iş kuralını paylaşmak; kişisel veriyi paylaşmamak ya da maskelemek', 'Tüm tabloyu dosya olarak yüklemek', 'Parolaları da eklemek'], 1, 'Sorgu yazdırmak için satırlara gerek yoktur. Paylaşılacak veri kurum politikası ve KVKK ile sınırlıdır.')
  ] });

/* ------------------------------------------------------------------ Pratik: Sorgu optimizasyonu */
{ const T = window.SQLP_PRACTICE_TOPICS; T.opt = 'Sorgu optimizasyonu';
  const PR = window.SQLP_PRACTICE; let n = 0;
  const p = (L, d, title, q, sol, hint, x) => { n++; PR.push(Object.assign({ id: 'op' + String(n).padStart(2, '0'), L, t: 'opt', d, title, q: '<p>' + q + '</p>', sol, hint, type: 'sql' }, x || {})); };
  const araStr = (t, c) => ({ setup: 'CREATE INDEX IF NOT EXISTS ix_gizli_' + c + ' ON ' + t + ' (' + c + ')', must: 'SEARCH ' + t, msg: 'Plan arama yapmıyor. Sütunu serbest bırak.' });
  p('orta', 1, 'Olay günlüğünde ay filtresi', "Bu sorgu indeksten yararlanamaz: <code>SELECT COUNT(*) AS adet FROM web_events WHERE strftime('%Y-%m', event_time) = '2024-10'</code>. Aynı sonucu aramalı planla yaz (<code>event_time</code> indeksi hazır).",
    "SELECT COUNT(*) AS adet FROM web_events WHERE event_time >= '2024-10-01' AND event_time < '2024-11-01';", 'Yarı açık aralık.',
    { plan: araStr('web_events', 'event_time'), ynl: ["SELECT COUNT(*) AS adet FROM web_events WHERE strftime('%Y-%m', event_time) = '2024-10';", "SELECT COUNT(*) AS adet FROM web_events WHERE event_time >= '2024-10-01';"] });
  p('orta', 1, 'Büyük tabloda tek gün', "<code>bk_trips</code> üzerinde <code>started_at</code> indeksi zaten var. <code>SELECT COUNT(*) AS yolculuk FROM bk_trips WHERE date(started_at) = '2024-08-01'</code> sorgusunu indeks arayacak biçimde yaz.",
    "SELECT COUNT(*) AS yolculuk FROM bk_trips WHERE started_at >= '2024-08-01' AND started_at < '2024-08-02';", 'Günün başı dahil, ertesi günün başı hariç.',
    { plan: { must: 'SEARCH bk_trips', msg: 'Plan arama yapmıyor.' }, ynl: ["SELECT COUNT(*) AS yolculuk FROM bk_trips WHERE date(started_at) = '2024-08-01';", "SELECT COUNT(*) AS yolculuk FROM bk_trips WHERE started_at BETWEEN '2024-08-01' AND '2024-08-01';"] });
  p('orta', 1, 'Uçuşlarda metin kesme', "<code>SELECT COUNT(*) AS ucus FROM hv_flights WHERE substr(sched_dep, 1, 7) = '2024-10'</code> sorgusunu <code>sched_dep</code> indeksini kullanabilecek biçimde yaz (indeks hazır).",
    "SELECT COUNT(*) AS ucus FROM hv_flights WHERE sched_dep >= '2024-10-01' AND sched_dep < '2024-11-01';", 'Tarih metni yarı açık aralıkla süzülür.',
    { plan: araStr('hv_flights', 'sched_dep'), ynl: ["SELECT COUNT(*) AS ucus FROM hv_flights WHERE substr(sched_dep, 1, 7) = '2024-10';", "SELECT COUNT(*) AS ucus FROM hv_flights WHERE sched_dep >= '2024-10-01' AND sched_dep <= '2024-10-31';"] });
  p('orta', 2, 'İzin yılında fonksiyon', "<code>SELECT COUNT(*) AS izin FROM ik_leaves WHERE strftime('%Y', start_date) = '2023'</code> sorgusunu <code>start_date</code> indeksini kullanabilecek biçimde yaz (indeks hazır).",
    "SELECT COUNT(*) AS izin FROM ik_leaves WHERE start_date >= '2023-01-01' AND start_date < '2024-01-01';", 'Yılın başı ve sonraki yılın başı.',
    { plan: araStr('ik_leaves', 'start_date'), ynl: ["SELECT COUNT(*) AS izin FROM ik_leaves WHERE strftime('%Y', start_date) = '2023';", "SELECT COUNT(*) AS izin FROM ik_leaves WHERE start_date >= '2023-01-01';"] });
  p('orta', 2, 'Sütunda aritmetik', "<code>SELECT COUNT(*) AS adet FROM hv_bookings WHERE price * 2 &gt;= 3000</code> sorgusunda sütunu serbest bırak (<code>price</code> indeksi hazır).",
    'SELECT COUNT(*) AS adet FROM hv_bookings WHERE price >= 1500;', 'İşlemi sabit tarafa taşı.',
    { plan: araStr('hv_bookings', 'price'), ynl: ['SELECT COUNT(*) AS adet FROM hv_bookings WHERE price * 2 >= 3000;', 'SELECT COUNT(*) AS adet FROM hv_bookings WHERE price > 1500;'] });
  p('orta', 2, 'Uçuş ekranı için indeks', "Bu sorgu için doğru bileşik indeksi oluştur (adı serbest): <code>SELECT flight_id FROM hv_flights WHERE route_id = 7 AND sched_dep &gt;= '2024-11-01'</code>. İki sütun da aramada kullanılmalı.",
    'CREATE INDEX ix_rota_kalkis ON hv_flights (route_id, sched_dep);', 'Eşitlik sütunu önce.',
    { nr: 1, dl: IDX, plan: { q: "SELECT flight_id FROM hv_flights WHERE route_id = 7 AND sched_dep >= '2024-11-01'", must: 'route_id=\\? AND sched_dep>\\?', msg: 'Parantezde route_id=? ve sched_dep>? görünmeli.' }, ynl: ['CREATE INDEX ix_y ON hv_flights (sched_dep, route_id);', 'CREATE INDEX ix_y ON hv_flights (sched_dep);'] });
  p('ileri', 3, 'İstasyon gelirinde kapsayan indeks', "Bu sorgu tabloya gitmesin; kapsayan indeksi oluştur (adı serbest): <code>SELECT SUM(fare) FROM bk_trips WHERE start_station = 5 AND started_at &gt;= '2024-07-01'</code>",
    'CREATE INDEX ix_ist_zaman_ucret ON bk_trips (start_station, started_at, fare);', 'Eşitlik, aralık, sadece okunan.',
    { nr: 1, dl: ['sqlite', 'mysql', 'oracle'], plan: { q: "SELECT SUM(fare) FROM bk_trips WHERE start_station = 5 AND started_at >= '2024-07-01'", must: 'COVERING INDEX .*start_station=\\? AND started_at>\\?', msg: 'Plan COVERING INDEX ve iki aranan sütunu göstermeli.' }, ynl: ['CREATE INDEX ix_y ON bk_trips (start_station, started_at);', 'CREATE INDEX ix_y ON bk_trips (started_at, start_station, fare);'] });
  p('ileri', 3, 'Son yolculukları sıralamasız getir', "Bu sorguda arama yapılsın ve geçici sıralama kurulmasın; indeksi oluştur (adı serbest): <code>SELECT trip_id, started_at FROM bk_trips WHERE bike_id = 5 ORDER BY started_at DESC LIMIT 5</code>",
    'CREATE INDEX ix_bisiklet_zaman ON bk_trips (bike_id, started_at);', 'Eşitlik sütunu, sonra sıralama sütunu.',
    { nr: 1, dl: IDX, plan: { q: 'SELECT trip_id, started_at FROM bk_trips WHERE bike_id = 5 ORDER BY started_at DESC LIMIT 5', must: 'SEARCH bk_trips', not: 'TEMP B-TREE', msg: 'TEMP B-TREE kalmamalı ve arama yapılmalı.' }, ynl: ['CREATE INDEX ix_y ON bk_trips (bike_id);', 'CREATE INDEX ix_y ON bk_trips (started_at, bike_id);'] });
  p('ileri', 2, 'Gruplamada geçici yapıyı kaldır', "Planda <code>TEMP B-TREE</code> kalmasın; indeksi oluştur (adı serbest): <code>SELECT fare_class, COUNT(*) FROM hv_bookings GROUP BY fare_class</code>",
    'CREATE INDEX ix_sinif ON hv_bookings (fare_class);', 'Gruplanan sütunla başlayan indeks.',
    { nr: 1, dl: IDX, plan: { q: 'SELECT fare_class, COUNT(*) FROM hv_bookings GROUP BY fare_class', not: 'TEMP B-TREE', msg: 'TEMP B-TREE kalmamalı.' }, ynl: ['CREATE INDEX ix_y ON hv_bookings (booked_at);', 'CREATE INDEX ix_y ON hv_bookings (passenger_id, fare_class);'] });
  p('orta', 2, 'DISTINCT gerekmiyor', '<code>SELECT DISTINCT p.passenger_id, p.city FROM hv_passengers p JOIN hv_bookings b ON b.passenger_id = p.passenger_id</code> sorgusunu DISTINCT ve JOIN kullanmadan yaz.',
    'SELECT p.passenger_id, p.city FROM hv_passengers p WHERE EXISTS (SELECT 1 FROM hv_bookings b WHERE b.passenger_id = p.passenger_id);', 'Varlık sor.',
    { mustNot: [{ re: '\\bDISTINCT\\b|\\bJOIN\\b', msg: 'DISTINCT ve JOIN kullanmadan yaz.' }], ynl: ['SELECT DISTINCT p.passenger_id, p.city FROM hv_passengers p JOIN hv_bookings b ON b.passenger_id = p.passenger_id;', 'SELECT p.passenger_id, p.city FROM hv_passengers p;'] });
  p('ileri', 2, 'Rota başına uçuş', '<code>SELECT r.route_id, (SELECT COUNT(*) FROM hv_flights f WHERE f.route_id = r.route_id) AS ucus FROM hv_routes r</code> sorgusunu ilişkili alt sorgu olmadan yaz. Uçuşu olmayan rota da 0 ile kalmalı.',
    'SELECT r.route_id, COALESCE(f.ucus, 0) AS ucus FROM hv_routes r LEFT JOIN (SELECT route_id, COUNT(*) AS ucus FROM hv_flights GROUP BY route_id) f ON f.route_id = r.route_id;', 'Önce topla, <code>LEFT JOIN</code> ile bağla.',
    { plan: { not: 'CORRELATED', msg: 'CORRELATED kalmamalı.' }, ynl: ['SELECT r.route_id, (SELECT COUNT(*) FROM hv_flights f WHERE f.route_id = r.route_id) AS ucus FROM hv_routes r;', 'SELECT r.route_id, COUNT(*) AS ucus FROM hv_routes r JOIN hv_flights f ON f.route_id = r.route_id GROUP BY r.route_id;', 'SELECT r.route_id, COUNT(*) AS ucus FROM hv_routes r LEFT JOIN hv_flights f ON f.route_id = r.route_id GROUP BY r.route_id;'] });
  p('ileri', 2, 'Derin sayfa', "Önceki sayfa <code>trip_id = 50000</code> ile bitti. Sonraki 5 yolculuğu OFFSET olmadan getir: <code>trip_id</code>, <code>started_at</code>. Numaraya göre.",
    'SELECT trip_id, started_at FROM bk_trips WHERE trip_id > 50000 ORDER BY trip_id LIMIT 5;', 'Son anahtardan sonrası.',
    { ord: true, mustNot: NOOFF, plan: { must: 'SEARCH bk_trips', msg: 'Plan arama yapmalı.' }, ynl: ['SELECT trip_id, started_at FROM bk_trips ORDER BY trip_id LIMIT 5 OFFSET 50000;', 'SELECT trip_id, started_at FROM bk_trips WHERE trip_id >= 50000 ORDER BY trip_id LIMIT 5;'] });
  p('ileri', 3, 'Eşitlik bozuculu keyset', "Rezervasyon listesi fiyata göre azalan, eşitlikte numaraya göre azalan. Önceki sayfa <code>price = 1500</code>, <code>booking_id = 2000</code> ile bitti. Sonraki 5 kayıt: <code>booking_id</code>, <code>price</code>. OFFSET yok.",
    'SELECT booking_id, price FROM hv_bookings WHERE price < 1500 OR (price = 1500 AND booking_id < 2000) ORDER BY price DESC, booking_id DESC LIMIT 5;', 'Daha düşük fiyat ya da aynı fiyatta daha küçük numara.',
    { ord: true, mustNot: NOOFF, ynl: ['SELECT booking_id, price FROM hv_bookings WHERE price < 1500 ORDER BY price DESC, booking_id DESC LIMIT 5;', 'SELECT booking_id, price FROM hv_bookings WHERE booking_id < 2000 ORDER BY price DESC, booking_id DESC LIMIT 5;'] });
  p('ileri', 3, 'Kullanıcının ilk yolculuğu', '<code>SELECT u.user_id, (SELECT MIN(t.started_at) FROM bk_trips t WHERE t.user_id = u.user_id) AS ilk FROM bk_users u</code> sorgusunu ilişkili alt sorgu olmadan yaz. Yolculuğu olmayan kullanıcı NULL ile kalmalı.',
    'SELECT u.user_id, m.ilk FROM bk_users u LEFT JOIN (SELECT user_id, MIN(started_at) AS ilk FROM bk_trips GROUP BY user_id) m ON m.user_id = u.user_id;', 'Önce kullanıcı başına <code>MIN</code>.',
    { plan: { not: 'CORRELATED', msg: 'CORRELATED kalmamalı.' }, ynl: ['SELECT u.user_id, MIN(t.started_at) AS ilk FROM bk_users u JOIN bk_trips t ON t.user_id = u.user_id GROUP BY u.user_id;', 'SELECT u.user_id, (SELECT MIN(t.started_at) FROM bk_trips t WHERE t.user_id = u.user_id) AS ilk FROM bk_users u;'] });
  p('orta', 2, 'NOT IN tuzağı', 'Kimseye yöneticilik yapmayan çalışanların sayısı. Bu sorgu 0 döndürüyor: <code>SELECT COUNT(*) AS adet FROM ik_employees WHERE emp_id NOT IN (SELECT manager_id FROM ik_employees)</code>. <code>NOT EXISTS</code> ile doğrusunu yaz.',
    'SELECT COUNT(*) AS adet FROM ik_employees e WHERE NOT EXISTS (SELECT 1 FROM ik_employees m WHERE m.manager_id = e.emp_id);', 'Alt sorguda NULL var.',
    { must: [{ re: '\\bNOT\\s+EXISTS\\b', msg: 'NOT EXISTS kullan.' }], ynl: ['SELECT COUNT(*) AS adet FROM ik_employees WHERE emp_id NOT IN (SELECT manager_id FROM ik_employees);'] });
  p('orta', 1, 'SELECT * yerine kimlik', '<code>SELECT * FROM ik_leaves WHERE emp_id = 418</code> yerine yalnız <code>leave_id</code> getir. <code>emp_id</code> indeksi var; plan tabloya gitmemeli.',
    'SELECT leave_id FROM ik_leaves WHERE emp_id = 418;', 'İndeks satır kimliğini taşır.',
    { plan: { must: 'COVERING INDEX', msg: 'Plan COVERING INDEX göstermeli.' }, ynl: ['SELECT * FROM ik_leaves WHERE emp_id = 418;', 'SELECT leave_id, days FROM ik_leaves WHERE emp_id = 418;'] });
  p('ileri', 2, 'İfade indeksi', "Rapor aracı değiştirilemiyor. Şu sorgu arama yapsın; ifade indeksi oluştur (adı serbest): <code>SELECT COUNT(*) FROM hv_flights WHERE date(sched_dep) = '2024-11-05'</code>",
    'CREATE INDEX ix_ucus_gun ON hv_flights (date(sched_dep));', 'İndeksteki ifade sorgudakiyle aynı olmalı.',
    { nr: 1, base: 'sqlite', dl: ['sqlite'], plan: { q: "SELECT COUNT(*) FROM hv_flights WHERE date(sched_dep) = '2024-11-05'", must: 'SEARCH hv_flights', msg: 'Sorgu hâlâ arama yapmıyor. İndeksi ifadeye kur.' }, ynl: ['CREATE INDEX ix_y ON hv_flights (sched_dep);'] });
  p('ileri', 2, 'Kısmi indeks', "İptal uçuşlar nadir ve operasyon yalnız onları tarihe göre arıyor. <code>status = 'cancelled'</code> ile sınırlı, <code>sched_dep</code> üzerinde <code>ix_iptal_ucus</code> indeksi oluştur.",
    "CREATE INDEX ix_iptal_ucus ON hv_flights (sched_dep) WHERE status = 'cancelled';", '<code>CREATE INDEX ... WHERE koşul</code>',
    { base: 'sqlite', dl: ['sqlite'], check: "SELECT name, sql LIKE '%WHERE%' AS kismi FROM sqlite_master WHERE type = 'index' AND name = 'ix_iptal_ucus'", plan: { q: "SELECT COUNT(*) FROM hv_flights WHERE status = 'cancelled' AND sched_dep >= '2024-11-01'", must: 'INDEX ix_iptal_ucus', msg: 'Sorgu ix_iptal_ucus indeksini kullanmalı.' }, ynl: ['CREATE INDEX ix_iptal_ucus ON hv_flights (sched_dep);', "CREATE INDEX ix_iptal_ucus ON hv_flights (status, sched_dep);"] });
  p('orta', 2, 'UNION ALL hızlı ama yanlış', "<code>SELECT COUNT(*) AS adet FROM (SELECT booking_id FROM hv_bookings WHERE fare_class = 'Business' UNION ALL SELECT booking_id FROM hv_bookings WHERE price &gt; 2000) t</code> iki koşulu da sağlayanı iki kez sayıyor. Doğru sayıyı <code>OR</code> kullanmadan, iki kollu yapıyı koruyarak ver.",
    "SELECT COUNT(*) AS adet FROM (SELECT booking_id FROM hv_bookings WHERE fare_class = 'Business' UNION SELECT booking_id FROM hv_bookings WHERE price > 2000) t;", 'Tekilleştiren küme işlemi.',
    { mustNot: [{ re: '\\bOR\\b|\\bUNION\\s+ALL\\b', msg: 'OR ve UNION ALL kullanmadan yaz.' }], ynl: ["SELECT COUNT(*) AS adet FROM (SELECT booking_id FROM hv_bookings WHERE fare_class = 'Business' UNION ALL SELECT booking_id FROM hv_bookings WHERE price > 2000) t;"] });
  p('ileri', 3, 'Çoğalan toplam', 'Rota başına uçuş sayısı ve toplam rötar dakikası isteniyor. Bu sorgu uçuş sayısını şişiriyor: <code>SELECT f.route_id, COUNT(*) AS ucus, SUM(d.minutes) AS rotar FROM hv_flights f LEFT JOIN hv_delays d ON d.flight_id = f.flight_id GROUP BY f.route_id</code>. Önce toplayarak düzelt: <code>route_id</code>, <code>ucus</code>, <code>rotar</code> (rötarı yoksa 0).',
    'SELECT f.route_id, COUNT(*) AS ucus, COALESCE(SUM(d.dk), 0) AS rotar FROM hv_flights f LEFT JOIN (SELECT flight_id, SUM(minutes) AS dk FROM hv_delays GROUP BY flight_id) d ON d.flight_id = f.flight_id GROUP BY f.route_id;', 'Rötarları uçuş başına tek satıra indir.',
    { ynl: ['SELECT f.route_id, COUNT(*) AS ucus, SUM(d.minutes) AS rotar FROM hv_flights f LEFT JOIN hv_delays d ON d.flight_id = f.flight_id GROUP BY f.route_id;', 'SELECT f.route_id, COUNT(*) AS ucus, COALESCE(SUM(d.minutes), 0) AS rotar FROM hv_flights f LEFT JOIN hv_delays d ON d.flight_id = f.flight_id GROUP BY f.route_id;'] });
  p('orta', 2, 'Değerin seçiciliği', 'Hangi değerde indeks işe yarar? <code>hv_bookings</code> için durum başına rezervasyon sayısı ve payı (%, 1 basamak): <code>status</code>, <code>adet</code>, <code>pay</code>. Adede göre azalan.',
    'SELECT status, COUNT(*) AS adet, ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pay FROM hv_bookings GROUP BY status ORDER BY adet DESC;', 'Genel toplam için pencere.',
    { ord: true, ynl: ['SELECT status, COUNT(*) AS adet, ROUND(COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pay FROM hv_bookings GROUP BY status ORDER BY adet DESC;'] });
  p('ileri', 2, 'Planı oku', "Şu sorgunun SQLite planını getir: <code>SELECT p.category, COUNT(*) FROM order_items oi JOIN products p ON p.product_id = oi.product_id GROUP BY p.category</code>",
    'EXPLAIN QUERY PLAN SELECT p.category, COUNT(*) FROM order_items oi JOIN products p ON p.product_id = oi.product_id GROUP BY p.category;', 'Sorgunun önüne <code>EXPLAIN QUERY PLAN</code>.',
    { base: 'sqlite', dl: ['sqlite'], ynl: ['SELECT p.category, COUNT(*) FROM order_items oi JOIN products p ON p.product_id = oi.product_id GROUP BY p.category;'] });
}

/* ------------------------------------------------------------------ Sözlük ve kopya kâğıdı */
{ const G = window.SQLP_GLOSSARY; const var_ = new Set(G.map(g => g[0].toLocaleLowerCase('tr').replace(/\s*\(.*\)$/, '')));
  [['Sorgu planı (query plan)', 'Motorun sorguyu nasıl çalıştıracağını gösteren adımlar: okuma yöntemi, birleştirme türü, tahmin edilen satır.'],
   ['Kapsayan indeks (covering index)', 'Sorgunun istediği bütün sütunları içeren indeks. Tabloya gidilmez.'],
   ['Bileşik indeks (composite index)', 'Birden çok sütunlu indeks. Soldan önek kuralıyla çalışır: önce eşitlik, sonra aralık sütunu.'],
   ['Seçicilik (selectivity)', 'Koşulun tabloyu ne kadar daralttığı. Eşleşen satır bölü toplam satır.'],
   ['Kardinalite (cardinality)', 'Sütundaki farklı değer sayısı ya da planda bir adımın ürettiği satır sayısı.'],
   ['İstatistikler (statistics)', 'Motorun satır tahmini için sakladığı veri dağılımı özeti. ANALYZE gibi komutlarla yenilenir.'],
   ['Parametre koklama (parameter sniffing)', 'SQL Server\'ın planı derlerken parametrenin o anki değerine bakması. Plan sonra başka değerlere de uygulanır.'],
   ['Bölüm eleme (partition pruning)', 'Motorun süzgece bakarak ilgisiz bölümleri okumaması.'],
   ['İfade indeksi (expression index)', 'Sütunun kendisine değil, bir ifadesine kurulan indeks. Oracle\'da fonksiyon tabanlı indeks, SQL Server\'da hesaplanmış sütun üzerinde indeks.'],
   ['Kısmi indeks (partial index)', 'Yalnız koşula uyan satırları içeren indeks. SQL Server\'da filtreli indeks.'],
   ['Nested Loop', 'Dış tablonun her satırı için iç tabloda arama yapan birleştirme yöntemi.'],
   ['Hash Join', 'Küçük taraftan karma tablo kurup büyük tarafı tarayan birleştirme yöntemi.'],
   ['Merge Join', 'Sıralı iki girdiyi yan yana yürüten birleştirme yöntemi.'],
   ['Kuru çalıştırma (dry run)', 'BigQuery\'de sorguyu çalıştırmadan işlenecek baytı öğrenme.']
  ].forEach(g => { if (!var_.has(g[0].toLocaleLowerCase('tr').replace(/\s*\(.*\)$/, ''))) G.push(g); });
  G.sort((a, b) => a[0].localeCompare(b[0], 'tr'));
  window.SQLP_CHEATS.push({ h: 'Yavaş sorgu akışı', code: "-- 1) Ölç ve planı al\nEXPLAIN QUERY PLAN SELECT ...;           -- SQLite\nEXPLAIN (ANALYZE, BUFFERS) SELECT ...;   -- PostgreSQL\nSET STATISTICS IO, TIME ON;              -- SQL Server\n-- 2) Sütunu serbest bırak\nWHERE tarih >= '2024-11-01' AND tarih < '2024-12-01'\n-- 3) İndeks: eşitlik, aralık, sıralama, okunan\nCREATE INDEX ix ON t (durum, tarih, tutar);\n-- 4) Sonucu karşılaştır\n(eski EXCEPT yeni), (yeni EXCEPT eski)" });
  Object.assign(window.SQLP_SEARCH_SYN, { optimization: ['optimizasyon', 'plan'], optimizasyon: ['performans', 'plan', 'indeks'], 'query plan': ['sorgu planı'], explain: ['plan'], sniffing: ['koklama'], covering: ['kapsayan'], selectivity: ['seçicilik'], rebalancing: ['kamyonet', 'denge'], 'partition pruning': ['bölüm eleme'] });
}

/* ------------------------------------------------------------------ Öğrenme yolları */
const PA = {}; window.SQLP_PATHS.forEach(p => PA[p.id] = p);
const insAfter = (id, after, ids) => { const p = PA[id]; const i = p.lessons.indexOf(after); if (i < 0) throw new Error('c38: ' + id + ' yolunda yok ' + after); const yeni = ids.filter(x => !p.lessons.includes(x)); p.lessons.splice(i + 1, 0, ...yeni); p.opt = (p.opt || []).filter(x => !yeni.includes(x)); };
const optEkle = (id, ids) => { const p = PA[id]; p.opt = (p.opt || []).concat(ids.filter(x => !p.lessons.includes(x) && !(p.opt || []).includes(x))); };
const compEkle = (id, ad, ids) => { const c = (PA[id].comp || []).find(x => x.t === ad); if (!c) throw new Error('c38: yetkinlik yok ' + id + ' ' + ad); ids.forEach(x => { if (PA[id].lessons.includes(x) && !c.l.includes(x)) c.l.push(x); }); };
insAfter('analist', 'index', ['opt-olc', 'opt-plan', 'sargable', 'opt-join']);
optEkle('analist', ['opt-indeks', 'opt-toplama', 'opt-yanlis', 'opt-proje']);
insAfter('muhendis', 'sargable', ['opt-olc', 'opt-plan', 'opt-tur', 'opt-indeks', 'opt-secicilik', 'opt-join', 'opt-toplama']);
optEkle('muhendis', ['opt-turler', 'opt-yanlis', 'opt-proje']);
compEkle('muhendis', 'Ambar ve performans', ['opt-olc', 'opt-plan', 'opt-tur', 'opt-indeks', 'opt-secicilik', 'opt-join', 'opt-toplama']);
insAfter('uzman', 'index', ['opt-olc', 'opt-plan', 'sargable', 'opt-tur', 'opt-indeks', 'opt-secicilik']);
insAfter('uzman', 'performans', ['opt-join', 'opt-toplama', 'opt-turler', 'opt-yanlis']);
insAfter('uzman', 'performans-lab', ['opt-proje']);
compEkle('uzman', 'Performans', ['opt-olc', 'opt-plan', 'sargable', 'opt-tur', 'opt-indeks', 'opt-secicilik', 'opt-join', 'opt-toplama', 'opt-turler', 'opt-yanlis', 'opt-proje']);
insAfter('dba', 'index', ['opt-olc']);
insAfter('dba', 'ts-plan', ['opt-plan', 'opt-tur', 'opt-indeks', 'opt-secicilik', 'opt-turler']);
insAfter('dba', 'performans', ['opt-yanlis']);
insAfter('dba', 'performans-lab', ['opt-proje']);
optEkle('dba', ['opt-join', 'opt-toplama']);
compEkle('dba', 'Performans', ['opt-olc', 'opt-plan', 'opt-tur', 'opt-indeks', 'opt-secicilik', 'opt-turler', 'opt-yanlis', 'opt-proje']);
insAfter('bi', 'sargable', ['opt-olc', 'opt-plan']);
insAfter('bi', 'performans', ['opt-toplama']);
optEkle('bi', ['opt-indeks', 'opt-join', 'opt-secicilik', 'opt-yanlis', 'opt-proje']);
compEkle('bi', 'Performans ve uygulama', ['opt-olc', 'opt-plan', 'opt-toplama']);
const tsPlanVar = PA.tsql.lessons.includes('ts-plan') ? 'ts-plan' : 'index';
insAfter('tsql', tsPlanVar, ['opt-olc', 'opt-secicilik', 'opt-turler']);
optEkle('tsql', ['opt-plan', 'opt-tur', 'opt-indeks', 'opt-join', 'opt-yanlis', 'opt-proje']);
compEkle('tsql', 'Performans ve güvenlik', ['opt-olc', 'opt-secicilik', 'opt-turler']);
insAfter('backend', 'sargable', ['opt-plan', 'opt-indeks']);
insAfter('backend', 'performans', ['opt-join']);
optEkle('backend', ['opt-olc', 'opt-secicilik', 'opt-yanlis']);
compEkle('backend', 'Performans', ['opt-plan', 'opt-indeks', 'opt-join']);
optEkle('bilimci', ['index', 'opt-olc', 'opt-plan', 'opt-join', 'opt-toplama']);
insAfter('mulakat', 'mk-medyan', ['mk-opt']);
optEkle('mulakat', ['opt-plan', 'opt-indeks', 'opt-yanlis']);
PA.yz.lessons.push('ai-proje'); PA.yz.comp.find(x => x.t === 'Doğrulama').l.push('ai-proje');
PA['buyuk-veri'].lessons.push('bv-proje'); PA['buyuk-veri'].comp.push({ t: 'Bitirme projesi', d: 'İstasyon dengesizliği ve kamyonet kararı', l: ['bv-proje'] });
optEkle('buyuk-veri', ['opt-plan', 'opt-indeks', 'opt-toplama']);
window.SQLP_PATHS.splice(window.SQLP_PATHS.findIndex(p => p.id === 'uzman') + 1, 0, {
  id: 'optimizasyon', name: 'Sorgu Optimizasyonu', short: 'OPT', color: '#B45309', kind: 'konu',
  desc: 'Yavaş sorguyu ölçmek, planını okumak, yeniden yazmak ve doğru indeksi seçmek. Mülakat soruları ve bitirme projesiyle.',
  long: 'JOIN, alt sorgu, CTE ve pencere fonksiyonlarını bildiğini varsayar. Analist ve mühendis olarak yavaş bir sorguyla karşılaştığında tahminle değil ölçümle ilerlemeyi öğrenirsin. Uygulama motoru SQLite olduğu için görevlerde plan denetimi SQLite üzerinden yapılır; PostgreSQL planları aynı veriyle gerçek motordan üretilmiştir. SQL Server, MySQL, Oracle ve BigQuery konuları resmî belgelere dayanır ve burada çalıştırılmaz.',
  skills: ['Temel ölçüm', 'Plan okuma', 'Sargable yazım', 'Bileşik ve kapsayan indeks', 'Seçicilik ve istatistik', 'Keyset sayfalama', 'Bölüm eleme', 'Parametre koklama'],
  lessons: ['opt-olc', 'index', 'opt-plan', 'sargable', 'opt-tur', 'opt-indeks', 'opt-secicilik', 'performans-lab', 'opt-join', 'be-sayfalama', 'opt-toplama', 'performans', 'de-partition', 'bq-maliyet', 'opt-turler', 'opt-yanlis', 'mk-opt', 'opt-proje'],
  opt: ['ts-index', 'ts-plan', 'bv-plan', 'dba-bakim'],
  comp: [
    { t: 'Yöntem', d: 'Ölç, planı oku, tek değişiklik, sağla', l: ['opt-olc', 'opt-plan', 'performans'] },
    { t: 'İndeks', d: 'Temel, sütun sırası, kapsama, bedel', l: ['index', 'opt-indeks', 'performans-lab'] },
    { t: 'Yazım', d: 'Sargable, tür dönüşümü, JOIN ve EXISTS, sayfalama', l: ['sargable', 'opt-tur', 'opt-join', 'be-sayfalama'] },
    { t: 'Motorun kararı', d: 'Seçicilik, istatistik, toplama ve pencere maliyeti', l: ['opt-secicilik', 'opt-toplama'] },
    { t: 'Ölçek ve SQL türleri', d: 'Bölüm eleme, BigQuery maliyeti, parametre koklama', l: ['de-partition', 'bq-maliyet', 'opt-turler'] },
    { t: 'Karar', d: 'Yanlış optimizasyon, mülakat ve proje', l: ['opt-yanlis', 'mk-opt', 'opt-proje'] }
  ],
  beyond: ['Üretim sisteminde izleme: Query Store, pg_stat_statements, yavaş sorgu günlüğü', 'Donanım ve yapılandırma ayarı (bellek, disk, paralellik)', 'Yük testi araçları']
});
})();
