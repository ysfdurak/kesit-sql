/* Kesit SQL: Sorgu Optimizasyonu dersleri. Plan çıktıları plan-ciktilari.js dosyasından gelir (araclar/denetim/opt_cikti.mjs gerçek motorda üretir).
   SQL alıştırmalarında plan alanı (dialect.js planFail) sonucu doğru ama yavaş kalan cevabı reddeder; ynl alanı denetimde reddedilmesi gereken cevapları tutar (opt_denetim.js). */
(function () {
'use strict';
const LS = window.SQLP_LESSONS, PLAN = window.SQLP_PLAN;
const MOD = 'Sorgu Optimizasyonu';
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const box = s => '<pre class="code">' + esc(s) + '</pre>';
const eqp = s => '<pre class="code" data-na="tsql pg mysql oracle bq">' + esc(s) + '</pre>';
const nor = s => '<pre class="code" data-norun>' + esc(s) + '</pre>';
const PG = k => { const x = PLAN.q[k]; if (!x) throw new Error('c37: plan yok ' + k); return nor((x.kur ? x.kur + ';\n' : '') + 'EXPLAIN (ANALYZE, BUFFERS, TIMING OFF, SUMMARY OFF)\n' + x.q + ';') + '<p class="plan-etiket">Gerçek çıktı</p><pre class="plan-cikti" tabindex="0">' + esc(x.cikti) + '</pre>'; };
const PGS = k => '<pre class="plan-cikti" tabindex="0">' + esc(PLAN.q[k].cikti) + '</pre>';
const trn = n => Number(n).toLocaleString('tr-TR');
const B = k => { const m = PLAN.q[k].cikti.match(/shared hit=(\d+)/); if (!m) throw new Error('c37: buffers yok ' + k); return trn(m[1]); };
const TAH = k => PLAN.q[k].cikti.match(/rows=(\d+) width/g).map(x => x.match(/\d+/)[0]);
const GER = k => PLAN.q[k].cikti.match(/actual rows=(\d+)/g).map(x => x.match(/\d+/)[0]);
const mc = (q, o, a, why) => ({ t: 'mc', q: '<p>' + q + '</p>', o, a, why });
const sq = (q, sol, hint, x) => Object.assign({ t: 'sql', q: '<p>' + q + '</p>', sol, hint }, x || {});
const SQLITE = { base: 'sqlite', dl: ['sqlite'] };
const IDX = ['sqlite', 'tsql', 'pg', 'mysql', 'oracle'];
const OLCUM = '<div class="note"><b>Süreler hakkında</b>Kod kutusunun altındaki süre bu tarayıcıda, SQLite motorunda ölçülür. Kendi ortamında farklı olur. Burada yalnız yönüne bak. Planlar da motordan motora değişir.</div>';
const PGNOT = '<div class="note"><b>PostgreSQL çıktıları</b>Bu derslerdeki PostgreSQL planları elle yazılmadı. Aynı veriyle ' + PLAN.surum + ' üzerinde (PGlite, tarayıcıda çalışan WASM sürümü) üretildi. <code>VACUUM ANALYZE</code> çalıştırıldı, planlama satırları kısalık için çıkarıldı. Sayılar kendi sunucunda farklı olur; okuma biçimi aynıdır.</div>';
const lesson = (id, lv, title, sum, en, body, ex, mod) => LS.push({ id, lv, mod: mod || MOD, min: 20, title, sum, en, body, ex });

/* ------------------------------------------------------------------ 1. Önce ölç */
const RAPOR_ESKI = `SELECT txn_type, COUNT(*) AS adet, ROUND(SUM(amount)) AS toplam
FROM bank_txns
WHERE strftime('%Y-%m', txn_time) = '2024-11'
GROUP BY txn_type;`;
const RAPOR_YENI = `SELECT txn_type, COUNT(*) AS adet, ROUND(SUM(amount)) AS toplam
FROM bank_txns
WHERE txn_time >= '2024-11-01' AND txn_time < '2024-12-01'
GROUP BY txn_type;`;
lesson('opt-olc', 'B2', 'Önce ölç, sonra düzelt: yavaş sorguda çalışma akışı',
  'Yavaş sorguda tahminle değil ölçümle ilerlemek: temel ölçüm, plan, tek değişiklik, yeniden ölçüm ve sonuç sağlaması.',
  'query tuning baseline measure',
`<h2>Senaryo: "Rapor yavaş, indeks ekleyelim"</h2>
<p>Ilgaz Bank'ta operasyon ekibi aylık hareket raporunun yavaşladığını söylüyor. Biri hemen "indeks ekleyelim" diyor. Belki doğrudur, ama henüz kimse hangi sorgunun neden yavaş olduğunu görmedi. Optimizasyon işi tahminle başlarsa yanlış yere indeks eklersin, yazmayı yavaşlatırsın, rapor yine yavaş kalır.</p>
<h2>Altı adımlık akış</h2>
<ol>
<li><b>Sorunu tanımla.</b> Hangi sorgu? Ne sıklıkla çalışıyor? Kabul edilebilir süre ne? Günde bir çalışan rapor ile saniyede yüz kez çalışan ekran aynı öncelikte değildir.</li>
<li><b>Temel ölçümü al (baseline).</b> Süreyi birkaç kez ölç. İş ölçüsünü de yaz: okunan sayfa ya da satır. Sonucun sağlamasını sakla: satır sayısı ve toplam.</li>
<li><b>Planı oku.</b> Tabloyu baştan sona mı okuyor, indeks mi kullanıyor, nerede satır çok?</li>
<li><b>Tek değişiklik yap.</b> Aynı anda üç şey değiştirirsen hangisinin işe yaradığını bilemezsin.</li>
<li><b>Yeniden ölç ve sonucu karşılaştır.</b> Hızlı ama yanlış sorgu, yavaş ve doğru sorgudan kötüdür.</li>
<li><b>Bedeli yaz.</b> İndeks yazmayı yavaşlatır ve yer kaplar. Kararı ve ölçümü bir yere not et.</li>
</ol>
<h2>Bu raporla deneyelim</h2>
${box(RAPOR_ESKI)}
${OLCUM}
<p>Planı görelim. Bu görevlerde tarayıcıdaki motor SQLite olduğu için <code>EXPLAIN QUERY PLAN</code> kullanıyoruz:</p>
${eqp("EXPLAIN QUERY PLAN\n" + RAPOR_ESKI)}
<p>Satırları oku: <code>SCAN bank_txns</code> tablonun tamamını okuduğunu, <code>USE TEMP B-TREE FOR GROUP BY</code> gruplama için geçici yapı kurduğunu söylüyor. Üstelik bir ay isteniyor. Peki okunan satırların ne kadarı gerçekten kullanılıyor? Bunu da sorguyla ölçebilirsin:</p>
${box(`SELECT COUNT(*) AS okunan,
       SUM(CASE WHEN txn_time >= '2024-11-01' AND txn_time < '2024-12-01' THEN 1 ELSE 0 END) AS kullanilan
FROM bank_txns;`)}
<h2>Tek değişiklik: sütunu serbest bırak ve indeks ekle</h2>
${eqp("CREATE INDEX ix_txn_time ON bank_txns (txn_time);\nEXPLAIN QUERY PLAN\n" + RAPOR_YENI)}
<p>Plan <code>SEARCH bank_txns USING INDEX ix_txn_time (txn_time&gt;? AND txn_time&lt;?)</code> oldu: motor yalnız o ayın satırlarına gidiyor.</p>
<h2>Sonuç aynı mı?</h2>
<p>Sağlama yapmadan bitmedi. İki sorgunun farkı boş kalmalı. Her iki yönü de dene:</p>
${box(`SELECT txn_type, COUNT(*) AS adet FROM bank_txns WHERE strftime('%Y-%m', txn_time) = '2024-11' GROUP BY txn_type
EXCEPT
SELECT txn_type, COUNT(*) AS adet FROM bank_txns WHERE txn_time >= '2024-11-01' AND txn_time < '2024-12-01' GROUP BY txn_type;`)}
<h2>Gerçek bir PostgreSQL'de aynı değişiklik</h2>
${PGNOT}
<p>İndeks yokken:</p>
${PG('pg-tarih-seq')}
<p>İndeks varken:</p>
${PG('pg-tarih-ix')}
<p>Süre yerine iş ölçüsüne bak: <code>Buffers: shared hit</code> okunan sayfa sayısıdır ve bu sayı ${B('pg-tarih-seq')}'den ${B('pg-tarih-ix')}'e indi. Filtrenin elediği satırlar da (<code>Rows Removed by Filter</code>) kayboldu. İki çıktının gerçek satır sayısı aynı: ${trn(GER('pg-tarih-seq')[1])}.</p>
<h2>Her SQL türünde ne ölçülür?</h2>
<table>
<tr><th>SQL türü</th><th>Plan ve ölçüm</th><th>Asıl bakılacak sayı</th></tr>
<tr><td>SQL Server</td><td>Gerçek plan (SSMS'te Ctrl+M), <code>SET STATISTICS IO, TIME ON</code></td><td>Mantıksal okuma (logical reads)</td></tr>
<tr><td>PostgreSQL</td><td><code>EXPLAIN (ANALYZE, BUFFERS)</code></td><td>Buffers, tahmini ve gerçek satır</td></tr>
<tr><td>MySQL</td><td><code>EXPLAIN ANALYZE</code> (8.0.18 ve sonrası)</td><td>Tahmini ve gerçek satır, döngü sayısı</td></tr>
<tr><td>Oracle</td><td><code>DBMS_XPLAN.DISPLAY_CURSOR</code>, <code>ALLSTATS LAST</code> biçimi</td><td><code>E-Rows</code> ve <code>A-Rows</code></td></tr>
<tr><td>BigQuery</td><td>Kuru çalıştırma (dry run), yürütme ayrıntıları</td><td>İşlenen bayt</td></tr>
<tr><td>SQLite</td><td><code>EXPLAIN QUERY PLAN</code></td><td>SCAN ve SEARCH, geçici yapılar</td></tr>
</table>
<div class="tip"><b>Mülakatta</b>"Bu sorgu yavaş, ne yaparsın?" sorusuna "indeks eklerim" ile başlama. "Önce ne kadar yavaş ve ne sıklıkla çalıştığını öğrenir, planı okur, tek değişiklik yapar, ölçer ve sonucun aynı kaldığını doğrularım" de. Ardından indeksten söz et.</div>`,
[
  mc('Rapor yavaş şikâyeti geldi. Hangi adım diğerlerinden önce gelir?', ['Rapordaki tarih sütununa hemen indeks eklemek', 'Sorgunun süresini, sıklığını ve planını görüp temel ölçümü almak', 'Tabloyu aylara bölüp raporu yeni tablolardan okutmak', 'Sunucunun belleğini artırıp raporu yeniden denemek'], 1, 'Ölçüm olmadan neyin işe yaradığını bilemezsin. İndeks ya da bölümleme ancak planı gördükten sonra anlamlı bir karardır.'),
  sq('Rapor bir ayı istiyor ama tüm tabloyu okuyor. <code>bank_txns</code> için darboğazı sayıyla göster: toplam satır (<code>okunan</code>), Kasım 2024 satırları (<code>kullanilan</code>) ve kullanılan satırların yüzdesi (<code>oran</code>, 1 basamak).',
    "SELECT COUNT(*) AS okunan, SUM(CASE WHEN txn_time >= '2024-11-01' AND txn_time < '2024-12-01' THEN 1 ELSE 0 END) AS kullanilan, ROUND(100.0 * SUM(CASE WHEN txn_time >= '2024-11-01' AND txn_time < '2024-12-01' THEN 1 ELSE 0 END) / COUNT(*), 1) AS oran FROM bank_txns;",
    '<code>WHERE</code> yazarsan <code>COUNT(*)</code> artık tüm tabloyu saymaz. Koşulu <code>CASE</code> içine al.',
    { ynl: ["SELECT COUNT(*) AS okunan, COUNT(*) AS kullanilan, 100.0 AS oran FROM bank_txns WHERE txn_time >= '2024-11-01' AND txn_time < '2024-12-01';", "SELECT COUNT(*) AS okunan, SUM(CASE WHEN txn_time >= '2024-11-01' AND txn_time < '2024-12-01' THEN 1 ELSE 0 END) AS kullanilan, ROUND(SUM(CASE WHEN txn_time >= '2024-11-01' AND txn_time < '2024-12-01' THEN 1 ELSE 0 END) / COUNT(*), 1) AS oran FROM bank_txns;"] }),
  sq('Aşağıdaki raporun SQLite planını getir. Görev raporu çalıştırmak değil, planını görmek: <code>' + esc("SELECT txn_type, COUNT(*) FROM bank_txns WHERE strftime('%Y-%m', txn_time) = '2024-11' GROUP BY txn_type") + '</code>',
    "EXPLAIN QUERY PLAN SELECT txn_type, COUNT(*) FROM bank_txns WHERE strftime('%Y-%m', txn_time) = '2024-11' GROUP BY txn_type;",
    "Sorgunun başına <code>EXPLAIN QUERY PLAN</code> ekle.",
    Object.assign({ ynl: ["SELECT txn_type, COUNT(*) FROM bank_txns WHERE strftime('%Y-%m', txn_time) = '2024-11' GROUP BY txn_type;", "EXPLAIN QUERY PLAN SELECT txn_type, COUNT(*) FROM bank_txns WHERE txn_time >= '2024-11-01' GROUP BY txn_type ORDER BY 2;"] }, SQLITE)),
  mc('Önceki görevdeki plan <code>SCAN bank_txns</code> ve <code>USE TEMP B-TREE FOR GROUP BY</code> satırlarını gösteriyor. Rapor yalnız bir ayı istiyor. Darboğazın ilk şüphelisi hangisi?', ['GROUP BY ifadesi; gruplama kaldırılırsa rapor hızlanır', 'Tablonun tamamının okunması; filtre hiçbir arama yapamıyor', 'COUNT fonksiyonu; yerine COUNT(1) yazılmalı', 'Sonuç tablosunun sütun sayısı; daha az sütun seçilmeli'], 1, 'Ayın payı küçükken bütün satırların okunması en büyük iştir. Gruplama raporun zaten istediği şeydir, COUNT(1) ise hiçbir şeyi değiştirmez.'),
  sq('Aynı raporu tarih sütununu fonksiyona sokmadan yaz: Kasım 2024 için <code>txn_type</code>, <code>adet</code>, <code>toplam</code> (tam sayı). Bu görevde <code>txn_time</code> üzerinde indeks hazır; plan arama yapmalı.',
    RAPOR_YENI.replace(/\s+/g, ' '),
    'Yarı açık aralık: ayın ilk günü dahil, sonraki ayın ilk günü hariç.',
    { plan: { setup: 'CREATE INDEX IF NOT EXISTS ix_gizli_tt ON bank_txns (txn_time)', must: 'SEARCH bank_txns', msg: 'Plan hâlâ tabloyu ya da indeksi baştan sona tarıyor. txn_time sütununu fonksiyondan çıkar, tarih aralığı yaz.' },
      ynl: [RAPOR_ESKI, "SELECT txn_type, COUNT(*) AS adet, ROUND(SUM(amount)) AS toplam FROM bank_txns WHERE date(txn_time) >= '2024-11-01' AND date(txn_time) < '2024-12-01' GROUP BY txn_type;", "SELECT txn_type, COUNT(*) AS adet, ROUND(SUM(amount)) AS toplam FROM bank_txns WHERE txn_time >= '2024-11-01' AND txn_time <= '2024-11-30' GROUP BY txn_type;"] }),
  sq('İki yazımın aynı sonucu verdiğini tek satırda doğrula: eski filtreyle (<code>strftime</code>) ve yeni aralıkla Kasım 2024 işlem sayısı ve tam sayı toplamı. Sütunlar: <code>eski_adet</code>, <code>yeni_adet</code>, <code>eski_toplam</code>, <code>yeni_toplam</code>.',
    "SELECT SUM(CASE WHEN strftime('%Y-%m', txn_time) = '2024-11' THEN 1 ELSE 0 END) AS eski_adet, SUM(CASE WHEN txn_time >= '2024-11-01' AND txn_time < '2024-12-01' THEN 1 ELSE 0 END) AS yeni_adet, ROUND(SUM(CASE WHEN strftime('%Y-%m', txn_time) = '2024-11' THEN amount ELSE 0 END)) AS eski_toplam, ROUND(SUM(CASE WHEN txn_time >= '2024-11-01' AND txn_time < '2024-12-01' THEN amount ELSE 0 END)) AS yeni_toplam FROM bank_txns;",
    'Tek tablo taraması, dört koşullu toplama. <code>CASE</code> ile hepsi tek satırda biter.',
    { ynl: ["SELECT COUNT(*) AS eski_adet, COUNT(*) AS yeni_adet, ROUND(SUM(amount)) AS eski_toplam, ROUND(SUM(amount)) AS yeni_toplam FROM bank_txns;", "SELECT SUM(CASE WHEN strftime('%Y-%m', txn_time) = '2024-11' THEN 1 ELSE 0 END) AS eski_adet, SUM(CASE WHEN txn_time >= '2024-11-01' AND txn_time <= '2024-11-30' THEN 1 ELSE 0 END) AS yeni_adet, ROUND(SUM(CASE WHEN strftime('%Y-%m', txn_time) = '2024-11' THEN amount ELSE 0 END)) AS eski_toplam, ROUND(SUM(CASE WHEN txn_time >= '2024-11-01' AND txn_time <= '2024-11-30' THEN amount ELSE 0 END)) AS yeni_toplam FROM bank_txns;"] }),
  mc('Sorgu ilk çalıştırmada yavaş, hemen ikincisinde çok daha hızlı döndü. Hiçbir şey değiştirmedin. Doğru yorum hangisi?', ['Sorun çözüldü; veritabanı sorguyu kendiliğinden düzeltti', 'İkinci çalıştırma büyük olasılıkla önbellekten yararlandı; tek ölçümle karar verilmez', 'İlk çalıştırmadaki sonuç yanlıştı, ikinci doğrudur', 'Sorgu planı ikinci çalıştırmada kesin olarak değişmiştir'], 1, 'Veri ve plan önbelleği süreyi çok etkiler. Bu yüzden birkaç kez ölçülür ve okunan sayfa gibi iş ölçüleri de izlenir.'),
  mc('Yeni sorgu üç kat az sayfa okuyor ama sonuç satır sayısı eskisinden 12 eksik. Ne yaparsın?', ['Hız kazancı değerli olduğu için yeni sorguyu yayına alırım', 'Yeni sorguyu geri alır, farkı veren satırları EXCEPT ile bulurum', 'Eksik 12 satırı raporun altına elle eklerim', 'Eski sorguya bir LIMIT ekleyip satır sayısını eşitlerim'], 1, 'Optimizasyon sonucu değiştirmemelidir. Önce farkı bul: genellikle tarih aralığı sınırı, NULL ya da JOIN türü çıkar.')
]);

/* ------------------------------------------------------------------ 2. Plan okuma */
lesson('opt-plan', 'B2', 'Sorgu planı okumak (query plan): tarama, arama, birleştirme, tahmin ve gerçek',
  'SCAN ve SEARCH, Seq Scan ve Index Scan, Nested Loop, Hash Join, Merge Join, tahmini ve gerçek satır, döngü sayısı.',
  'query plan execution plan explain analyze nested loop hash join merge join seq scan index seek',
`<h2>Plan neyi söyler?</h2>
<p>Sorgu iyileştirici (optimizer) aynı sonucu verecek birçok yol arasından en ucuz görüneni seçer. Plan bu seçimdir. Sana dört şey söyler: <b>hangi tablo nasıl okunuyor</b>, <b>tablolar hangi yöntemle birleşiyor</b>, <b>motor kaç satır bekliyor</b>, <b>gerçekte kaç satır çıktı</b>.</p>
${PGNOT}
<h2>SQLite planı</h2>
<p>Her satır bir adımdır. Birleştirmede üstteki tablo dış döngü, alttaki iç döngüdür.</p>
${eqp(`EXPLAIN QUERY PLAN
SELECT s.name, COUNT(*) AS yolculuk
FROM bk_trips t
JOIN bk_stations s ON s.station_id = t.start_station
GROUP BY s.name;`)}
<table>
<tr><th>Çıktı</th><th>Anlamı</th></tr>
<tr><td><code>SCAN t</code></td><td>Tablonun tamamı okunuyor</td></tr>
<tr><td><code>SCAN t USING COVERING INDEX ix</code></td><td>Tablo yerine indeksin tamamı okunuyor. Yine tam tarama, yalnız daha dar</td></tr>
<tr><td><code>SEARCH t USING INDEX ix (a=?)</code></td><td>İndeksle yalnız ilgili satırlara gidiliyor. Parantez hangi sütunların aramada kullanıldığını söyler</td></tr>
<tr><td><code>SEARCH t USING COVERING INDEX ix (a=?)</code></td><td>Aynı arama, üstelik tabloya hiç gidilmiyor</td></tr>
<tr><td><code>USE TEMP B-TREE FOR GROUP BY</code> (ya da ORDER BY, DISTINCT)</td><td>Sıra indeksten gelmiyor, geçici yapı kuruluyor</td></tr>
<tr><td><code>CORRELATED SCALAR SUBQUERY</code></td><td>Alt sorgu dış sorgunun her satırı için yeniden çalışıyor</td></tr>
<tr><td><code>AUTOMATIC COVERING INDEX</code></td><td>Uygun indeks yok, motor sorgu boyunca geçici indeks kuruyor. Kalıcı indeks için güçlü bir işaret</td></tr>
</table>
<div class="note"><b>SQLite'ın sınırı</b>SQLite planı tahmini ya da gerçek satır sayısı göstermez ve çıktı biçimi sürümden sürüme değişebilir. Tahmin ve gerçek farkını görmek için aşağıdaki PostgreSQL çıktılarına bakacağız.</div>
<h2>Aynı kavram, farklı adlar</h2>
<table>
<tr><th></th><th>SQLite</th><th>PostgreSQL</th><th>SQL Server</th><th>MySQL</th><th>Oracle</th></tr>
<tr><td>Tam tarama</td><td>SCAN</td><td>Seq Scan</td><td>Table Scan, Clustered Index Scan</td><td>type: ALL</td><td>TABLE ACCESS FULL</td></tr>
<tr><td>İndeks araması</td><td>SEARCH</td><td>Index Scan, Bitmap Index Scan</td><td>Index Seek</td><td>type: ref, range</td><td>INDEX RANGE SCAN</td></tr>
<tr><td>Yalnız indeks</td><td>COVERING INDEX</td><td>Index Only Scan</td><td>Index Seek, Key Lookup olmadan</td><td>Using index</td><td>INDEX RANGE SCAN, tabloya erişim olmadan</td></tr>
</table>
<p>SQL Server, MySQL, Oracle ve BigQuery planlarını bu uygulamada üretemiyoruz, bu yüzden çıktı örneği göstermiyoruz. Adları resmî belgelerde geçtiği gibi veriyoruz. Motor burada SQLite, başka SQL türü seçsen de plan SQLite planıdır.</p>
<h2>PostgreSQL planını okumak</h2>
<p>En içteki (en sağa girintili) düğüm önce çalışır, sonuç yukarı akar. Her düğümde iki parantez vardır: ilki tahmin, ikincisi gerçek.</p>
${PG('pg-tek-gun')}
<ul>
<li><code>cost=...</code>: maliyet birimi keyfidir, milisaniye değildir. Yalnız planları karşılaştırmak içindir.</li>
<li><code>rows=${TAH('pg-tek-gun')[0]}</code> tahmin, <code>actual rows=${GER('pg-tek-gun')[0]}</code> gerçek.</li>
<li><code>Index Cond</code> indeksle aranan koşul, <code>Filter</code> okunduktan sonra elenen koşuldur. <code>Filter</code> çok satır eliyorsa (<code>Rows Removed by Filter</code>) boşa okuma vardır.</li>
<li><code>Buffers: shared hit=${B('pg-tek-gun')}</code> düğümün ve altındakilerin okuduğu sayfa sayısıdır.</li>
<li><code>loops</code> değeri 1'den büyükse <code>rows</code> döngü başına ortalamadır. Toplam için çarp.</li>
</ul>
<div class="tip"><b>Dikkat: ANALYZE sorguyu çalıştırır</b>PostgreSQL ve MySQL'de <code>EXPLAIN ANALYZE</code> sorguyu gerçekten yürütür. <code>UPDATE</code> ya da <code>DELETE</code> için PostgreSQL'de <code>BEGIN; EXPLAIN ANALYZE ...; ROLLBACK;</code> yaz.</div>
<h2>Birleştirme türleri (join algorithms)</h2>
<table>
<tr><th>Tür</th><th>Nasıl çalışır</th><th>İyi olduğu durum</th><th>Şüphelen</th></tr>
<tr><td><b>Nested Loop</b></td><td>Dış tablonun her satırı için iç tabloda arama</td><td>Dış taraf az satır, iç tarafta indeks var</td><td>Dış taraf beklenenden çok satır çıkıyorsa</td></tr>
<tr><td><b>Hash Join</b></td><td>Küçük taraftan bellekte karma tablo kurar, büyük tarafı tarar</td><td>Büyük ve sırasız girdiler, eşitlik koşulu</td><td>Bellek yetmezse diske taşar</td></tr>
<tr><td><b>Merge Join</b></td><td>İki sıralı girdiyi yan yana yürütür</td><td>İki taraf da birleştirme sütununa göre sıralı</td><td>Sıralama için ek maliyet gerekiyorsa</td></tr>
</table>
<p>SQLite birleştirmeyi iç içe döngüyle yapar. PostgreSQL ise üçünü de seçebilir. Aşağıdaki planların üçü de aynı veride üretildi.</p>
<h3>Nested Loop: tek hesabın hareketleri</h3>
${PG('pg-nested')}
<h3>Hash Join: bütün hareketler ve bütün hesaplar</h3>
${PG('pg-hash')}
<h3>Merge Join: iki taraf da sıralı</h3>
${PG('pg-merge')}
<h3>Döngü sayısı</h3>
${PG('pg-loops')}
<p>Dış taraftan gelen her hesap için iç taraf bir kez çalışır: <code>loops</code> değeri bunu gösterir. İç düğümdeki <code>rows</code> döngü başına ortalamadır. Toplam için çarp: ${GER('pg-loops')[2]} × ${GER('pg-loops')[1]} = ${GER('pg-loops')[0]}, en üstteki <code>Nested Loop</code> satırıyla aynı sayı.</p>
<h2>Tahmin ile gerçek ayrışınca</h2>
${PG('pg-tarih-fn')}
<p>Motor ${TAH('pg-tarih-fn')[1]} satır bekliyor, ${trn(GER('pg-tarih-fn')[1])} satır çıkıyor. Sütun fonksiyonun içinde olduğu için istatistikler işe yaramıyor ve motor körlemesine tahmin yapıyor. Bu örnekte zarar yok, çünkü tek tablo var. Birleştirmeli bir sorguda bu yanlış tahmin "1 satır için iç içe döngü yeter" kararına yol açar ve binlerce döngüye dönüşür. Planda ilk aranacak şey budur: <b>tahmin ve gerçek arasındaki büyük fark</b>.</p>
<p>SQL Server'da tahmini planı Ctrl+L, gerçek planı Ctrl+M verir. Oracle'da <code>E-Rows</code> ve <code>A-Rows</code> sütunlarını karşılaştırırsın. MySQL'de <code>EXPLAIN ANALYZE</code> ağacında her düğümde tahmini satır ve gerçek satır yan yana yazar.</p>`,
[
  sq('Aşağıdaki sorgunun SQLite planını getir: <code>SELECT s.name, COUNT(*) FROM bk_trips t JOIN bk_stations s ON s.station_id = t.start_station GROUP BY s.name</code>',
    'EXPLAIN QUERY PLAN SELECT s.name, COUNT(*) FROM bk_trips t JOIN bk_stations s ON s.station_id = t.start_station GROUP BY s.name;',
    'Sorgunun önüne <code>EXPLAIN QUERY PLAN</code> ekle.',
    Object.assign({ ynl: ['SELECT s.name, COUNT(*) FROM bk_trips t JOIN bk_stations s ON s.station_id = t.start_station GROUP BY s.name;'] }, SQLITE)),
  mc('Az önceki planda <code>SCAN t</code>, <code>SEARCH s USING INTEGER PRIMARY KEY (rowid=?)</code>, <code>USE TEMP B-TREE FOR GROUP BY</code> satırları var. Hangisi doğru?', ['Yolculuklar dış döngü; her yolculuk için istasyon birincil anahtarla bulunuyor', 'İstasyonlar dış döngü; her istasyon için yolculuklar taranıyor', 'İki tablo da baştan sona taranıp sonra eşleştiriliyor', 'Birleştirme hiç yapılmıyor; sonuç geçici yapıdan okunuyor'], 0, 'Üstteki SCAN t dış döngüdür. SEARCH s, her satır için bk_stations birincil anahtarında yapılan aramadır.'),
  mc('PostgreSQL planında <code>Seq Scan on bank_txns ... (actual rows=3590 loops=1)</code> ve <code>Rows Removed by Filter: 38694</code> görüyorsun. Bu ne anlatır?', ['3.590 satır okundu, 38.694 satır önbellekten geldi', 'Yaklaşık 42.000 satır okundu; yalnız 3.590 tanesi filtreden geçti, okuma büyük ölçüde boşa', '38.694 satır silindi; sorgu veriyi değiştirdi', 'Filtre 3.590 kez çalıştırıldı, bu yüzden tablo 38.694 sayfa'], 1, 'Rows Removed by Filter okunup atılan satırdır. Elenen satır çoksa uygun indeks ya da yazım aranır.'),
  mc('Planda iç düğüm <code>rows=4 loops=2500</code> diyor. Bu düğümden toplam kaç satır çıkmış?', ['4', '2.500', '10.000', '2.504'], 2, 'PostgreSQL rows değerini döngü başına ortalama olarak yazar. Toplam için loops ile çarpılır.'),
  mc('Tahmin <code>rows=1</code>, gerçek <code>actual rows=3590</code>. Filtre <code>EXTRACT(year FROM txn_time) = 2024</code>. En olası neden nedir?', ['Tablo bozuk; yeniden oluşturulmalı', 'Sütun fonksiyonun içinde olduğu için motor istatistikleri kullanamıyor ve kaba tahmin yapıyor', 'Bellek yetmediği için satırlar diske taşmış', 'EXTRACT fonksiyonu yalnız 1 satır döndürür'], 1, 'İstatistikler sütunun kendi değerleri içindir. İfadenin sonucu için bilgi olmayınca motor sabit bir oran varsayar. Aralık koşulu hem aramayı hem tahmini düzeltir.'),
  mc('İki büyük tablo eşitlikle birleşiyor, ikisi de birleştirme sütununa göre sıralı değil ve indeks yok. Hangi yöntemi görmeyi beklersin?', ['Nested Loop', 'Hash Join', 'Merge Join', 'Index Seek'], 1, 'Küçük taraftan karma tablo kurup büyük tarafı bir kez taramak bu durumda en ucuz yoldur. Index Seek birleştirme yöntemi değil, okuma yöntemidir. SQLite ise hash join kullanmaz; geçici otomatik indeks kurar.'),
  sq('Her müşteri için hesabı var mı diye bakan <code>EXISTS</code> sorgusunda alt sorgu <code>SCAN a</code> yapıyor, yani müşteri başına bütün hesaplar taranıyor. Şu sorgunun alt sorgusunda indeks araması yapılmasını sağlayan indeksi oluştur (adı serbest): <code>SELECT c.customer_id FROM bank_customers c WHERE EXISTS (SELECT 1 FROM bank_accounts a WHERE a.customer_id = c.customer_id)</code>',
    'CREATE INDEX ix_hesap_musteri ON bank_accounts (customer_id);',
    'Alt sorgunun koşulunda hangi sütunla aranıyor?',
    { nr: 1, dl: IDX, plan: { q: 'SELECT c.customer_id FROM bank_customers c WHERE EXISTS (SELECT 1 FROM bank_accounts a WHERE a.customer_id = c.customer_id)', must: 'SEARCH a USING (COVERING )?INDEX', msg: 'Alt sorgu hâlâ bank_accounts tablosunu tarıyor. İndeks, alt sorgunun aradığı sütunda olmalı.' },
      ynl: ['CREATE INDEX ix_y ON bank_accounts (account_type);', 'CREATE INDEX ix_y ON bank_customers (customer_id);', 'SELECT 1;'] }),
  mc('Bu plan neden şüphe uyandırır? <code>SCAN r</code>, <code>BLOOM FILTER ON t (bike_id=?)</code>, <code>SEARCH t USING AUTOMATIC COVERING INDEX (bike_id=?)</code>', ['t tablosu bozuk olduğu için Bloom filtresi kullanılıyor', 'Motor bike_id için indeks bulamayıp sorgu boyunca geçici indeks kuruyor; sık çalışıyorsa kalıcı indeks düşünülür', 'SEARCH görülen her plan zaten kötüdür', 'r tablosu indeksli okunduğu için t gereksizdir'], 1, 'AUTOMATIC COVERING INDEX, indeksin bu sorgu için her çalıştırmada yeniden kurulduğunu söyler. Sorgu sıksa kalıcı indeks daha ucuz olur. Sorgu nadirse bu otomatik yol kabul edilebilir.')
]);

/* ------------------------------------------------------------------ 3. Tür ve fonksiyon */
lesson('opt-tur', 'C1', 'Tür dönüşümü ve fonksiyon tuzakları: indeks var ama kullanılmıyor',
  'Sütunu sargan fonksiyon ve dönüşümler, sabiti dönüştürmek, ifade indeksi, yeniden yazarken sonucu bozmamak.',
  'implicit conversion sargable function expression index computed column',
`<h2>Senaryo: "İndeks var ama sorgu yine tarıyor"</h2>
<p>Bir mühendis <code>txn_time</code> üzerine indeks eklemiş, rapor hızlanmamış. Sebep çoğu zaman indeksin kendisi değil, koşulun yazımıdır. İndeks sütunun <b>ham değerlerine</b> göre sıralıdır. Sütunu bir ifadenin içine koyarsan motor o sıradan yararlanamaz.</p>
${eqp(`CREATE INDEX ix_txn_time ON bank_txns (txn_time);
EXPLAIN QUERY PLAN SELECT COUNT(*) FROM bank_txns WHERE date(txn_time) = '2024-12-31';
EXPLAIN QUERY PLAN SELECT COUNT(*) FROM bank_txns WHERE txn_time >= '2024-12-31' AND txn_time < '2025-01-01';`)}
<p>İlkinde <code>SCAN bank_txns USING COVERING INDEX</code> görürsün: indeks baştan sona okunuyor, arama yok. "Index" sözcüğü seni yanıltmasın, önemli olan <code>SCAN</code> ve <code>SEARCH</code> ayrımıdır.</p>
<h2>Sık görülen biçimler</h2>
<table>
<tr><th>Tuzak</th><th>Sorun</th><th>Düzeltme</th></tr>
<tr><td><code>WHERE date(txn_time) = '2024-12-31'</code></td><td>Tarih fonksiyonu</td><td>Yarı açık aralık</td></tr>
<tr><td><code>WHERE amount * -1 &gt; 1000</code></td><td>Sütunda aritmetik</td><td>Sabit tarafa taşı: <code>amount &lt; -1000</code></td></tr>
<tr><td><code>WHERE COALESCE(merchant_category, '') = 'market'</code></td><td>NULL dönüşümü</td><td><code>merchant_category = 'market'</code> (NULL zaten eşleşmez)</td></tr>
<tr><td><code>WHERE CAST(account_id AS TEXT) = '100019'</code></td><td>Sütunda tür dönüşümü</td><td><code>account_id = 100019</code></td></tr>
<tr><td><code>WHERE account_id + 0 = 100019</code></td><td>Etkisiz işlem</td><td><code>account_id = 100019</code></td></tr>
<tr><td><code>WHERE LOWER(channel) = 'atm'</code></td><td>Harf dönüşümü</td><td>Veriyi standart tut ya da ifade indeksi kur</td></tr>
</table>
<h2>Gerçek çıktı: dönüşüm hangi tarafta?</h2>
${PGNOT}
<p>Sabit sütunun türüne uyunca:</p>
${PG('pg-tur-iyi')}
<p>Sütun metne dönüştürülünce aynı indeksin tamamı okunuyor, koşul <code>Filter</code> satırına düşüyor:</p>
${PG('pg-tur-kotu')}
<h2>Örtük dönüşüm (implicit conversion)</h2>
<p>Dönüşümü sen yazmasan da motor yapabilir. SQL türleri burada çok farklıdır:</p>
<table>
<tr><th>SQL türü</th><th>Davranış</th></tr>
<tr><td>SQL Server</td><td>Karşılaştırmada veri türü önceliği (data type precedence) kuralı geçerlidir: düşük öncelikli taraf yüksek olana çevrilir. <code>nvarchar</code>, <code>varchar</code>'dan yüksektir. <code>varchar</code> sütunu <code>N'...'</code> ya da <code>nvarchar</code> parametreyle karşılaştırılırsa sütun çevrilir, arama yapılamayabilir. Planda <code>CONVERT_IMPLICIT</code> olarak görünür. Uygulama sürücüsünün metin parametrelerini <code>nvarchar</code> gönderip göndermediğine bak.</td></tr>
<tr><td>MySQL</td><td>Belgeye göre metin sütunu sayıyla karşılaştırılırsa o sütundaki indeks arama için kullanılamaz, çünkü farklı metinler aynı sayıya dönüşebilir (<code>'1'</code>, <code>' 1'</code>, <code>'1a'</code>). Sabiti tırnak içinde yaz.</td></tr>
<tr><td>PostgreSQL</td><td>Sayı ve metin arasında örtük karşılaştırma yoktur, hata verir. Tırnaklı sabit ise sütunun türüne uyarlanır, indeks kullanılır.</td></tr>
<tr><td>SQLite</td><td>Sütun yakınlığı (type affinity) sabite uygulanır: <code>account_id = '100019'</code> yine arama yapar. Sütuna dönüşüm yazarsan yapamaz.</td></tr>
<tr><td>BigQuery</td><td>İndeks yerine bölüm kullanılır. Bölüm sütununu yalnız bırak: belgedeki desteklenen fonksiyonlar dışında bölüm eleme yapılmaz, tablonun tamamı taranır.</td></tr>
</table>
<h2>Fonksiyon şartsa: ifade indeksi</h2>
<p>Bazen sorguyu değiştiremezsin (hazır rapor aracı, ORM). O zaman indeksi ifadeye kurarsın. Sorgudaki ifade, indeksteki ifadeyle aynı yazılmalıdır.</p>
${eqp(`CREATE INDEX ix_gun ON bank_txns (date(txn_time));
EXPLAIN QUERY PLAN SELECT COUNT(*) FROM bank_txns WHERE date(txn_time) = '2024-12-31';`)}
${PG('pg-ifade-ix')}
<p>SQL Server'da aynı iş hesaplanmış sütun (computed column) üzerine indeksle, Oracle'da fonksiyon tabanlı indeksle yapılır. Her ifade indeksi bir indeks daha demektir: yazma bedeli aynen ödenir.</p>
<h2>Yeniden yazarken sonucu bozma</h2>
<ul>
<li><b>Tarih sınırı:</b> <code>txn_time BETWEEN '2024-11-01' AND '2024-11-30'</code>, saatli sütunda 30 Kasım'ın saatli kayıtlarını kaçırır. Yarı açık aralık kullan.</li>
<li><b>NULL:</b> <code>WHERE COALESCE(stok, 0) &lt; 20</code> NULL olanı da alır; <code>stok &lt; 20</code> almaz. Eşdeğeri <code>stok &lt; 20 OR stok IS NULL</code> olur.</li>
<li><b>Negatif çarpım:</b> <code>amount * -1 &gt; 1000</code> yeniden yazılırken eşitsizlik yön değiştirir: <code>amount &lt; -1000</code>.</li>
<li><b>LIKE ve harf:</b> SQLite varsayılan ayarda <code>LIKE</code> harf duyarsız çalıştığı için normal indeksten yararlanamaz. <code>name LIKE 'Ko%'</code> diğer motorlarda aramaya dönebilse de burada <code>SCAN</code> görürsün. <code>LIKE '%ko'</code> ise normal B-tree indeksle aramaya dönüşmez.</li>
</ul>`,
[
  sq("Bu sorgu <code>txn_time</code> indeksinden yararlanamıyor: <code>SELECT COUNT(*) AS adet FROM bank_txns WHERE date(txn_time) = '2024-12-31'</code>. Aynı sonucu aramalı planla yaz (indeks bu görevde hazır).",
    "SELECT COUNT(*) AS adet FROM bank_txns WHERE txn_time >= '2024-12-31' AND txn_time < '2025-01-01';",
    'Günün başı dahil, ertesi günün başı hariç.',
    { plan: { setup: 'CREATE INDEX IF NOT EXISTS ix_gizli_tt ON bank_txns (txn_time)', must: 'SEARCH bank_txns', msg: 'Plan arama yapmıyor. Sütunu fonksiyondan çıkar, tarih aralığı yaz.' },
      ynl: ["SELECT COUNT(*) AS adet FROM bank_txns WHERE date(txn_time) = '2024-12-31';", "SELECT COUNT(*) AS adet FROM bank_txns WHERE txn_time BETWEEN '2024-12-31' AND '2024-12-31';", "SELECT COUNT(*) AS adet FROM bank_txns WHERE substr(txn_time, 1, 10) = '2024-12-31';"] }),
  sq('Aşağıdaki koşulda sütun aritmetiğe girmiş. Sütunu serbest bırakarak aynı sonucu ver (<code>amount</code> üzerinde indeks hazır): <code>SELECT COUNT(*) AS adet FROM bank_txns WHERE amount * -1 &gt; 1000</code>',
    'SELECT COUNT(*) AS adet FROM bank_txns WHERE amount < -1000;',
    '-1 ile çarpınca eşitsizliğin yönü ters döner.',
    { plan: { setup: 'CREATE INDEX IF NOT EXISTS ix_gizli_am ON bank_txns (amount)', must: 'SEARCH bank_txns', msg: 'Sütun hâlâ bir işlemin içinde. amount tek başına kalmalı.' },
      ynl: ['SELECT COUNT(*) AS adet FROM bank_txns WHERE amount * -1 > 1000;', 'SELECT COUNT(*) AS adet FROM bank_txns WHERE amount > 1000;', 'SELECT COUNT(*) AS adet FROM bank_txns WHERE ABS(amount) > 1000;', 'SELECT COUNT(*) AS adet FROM bank_txns WHERE amount <= -1000;'] }),
  sq("Sütunu sarmadan yeniden yaz (<code>merchant_category</code> üzerinde indeks hazır): <code>SELECT COUNT(*) AS adet FROM bank_txns WHERE COALESCE(merchant_category, 'bilinmiyor') = 'market'</code>",
    "SELECT COUNT(*) AS adet FROM bank_txns WHERE merchant_category = 'market';",
    "NULL zaten 'market' olmadığı için COALESCE burada sonucu değiştirmiyor.",
    { plan: { setup: 'CREATE INDEX IF NOT EXISTS ix_gizli_mc ON bank_txns (merchant_category)', must: 'SEARCH bank_txns', msg: 'Sütun hâlâ COALESCE içinde.' },
      ynl: ["SELECT COUNT(*) AS adet FROM bank_txns WHERE COALESCE(merchant_category, 'bilinmiyor') = 'market';", "SELECT COUNT(*) AS adet FROM bank_txns WHERE merchant_category = 'market' OR merchant_category IS NULL;"] }),
  sq("Başka bir koşulda <code>COALESCE</code> sonucu değiştirir. <code>SELECT COUNT(*) AS adet FROM bank_txns WHERE COALESCE(merchant_category, 'market') = 'market'</code> sorgusunu <code>COALESCE</code> kullanmadan, aynı sayıyı verecek biçimde yaz.",
    "SELECT COUNT(*) AS adet FROM bank_txns WHERE merchant_category = 'market' OR merchant_category IS NULL;",
    "Burada NULL olanlar 'market' sayılıyor. Onları ayrıca almalısın.",
    { mustNot: [{ re: '\\b(COALESCE|IFNULL|ISNULL|NVL)\\b', msg: 'Görev bu koşulu sütunu sarmadan yazmanı istiyor.' }],
      ynl: ["SELECT COUNT(*) AS adet FROM bank_txns WHERE merchant_category = 'market';", "SELECT COUNT(*) AS adet FROM bank_txns WHERE COALESCE(merchant_category, 'market') = 'market';"] }),
  sq("Hazır rapor aracı <code>WHERE date(txn_time) = ...</code> yazıyor, sorguyu değiştiremiyorsun. Şu sorgunun arama yapmasını sağlayan ifade indeksini oluştur (adı serbest): <code>SELECT COUNT(*) FROM bank_txns WHERE date(txn_time) = '2024-12-31'</code>",
    'CREATE INDEX ix_gun ON bank_txns (date(txn_time));',
    'İndeksteki ifade sorgudakiyle aynı olmalı.',
    Object.assign({ nr: 1, plan: { q: "SELECT COUNT(*) FROM bank_txns WHERE date(txn_time) = '2024-12-31'", must: 'SEARCH bank_txns USING (COVERING )?INDEX', msg: 'Sorgu hâlâ arama yapmıyor. Düz txn_time indeksi bu ifadeye yaramaz; indeksi ifadenin kendisine kur.' },
      ynl: ['CREATE INDEX ix_y ON bank_txns (txn_time);', "CREATE INDEX ix_y ON bank_txns (strftime('%Y-%m-%d', txn_time));"] }, SQLITE)),
  mc('Sütun <code>tax_no VARCHAR</code>, indeks var. SQL Server uygulaması sorguyu <code>WHERE tax_no = @p</code> biçiminde <code>@p NVARCHAR</code> ile gönderiyor. Plan indeksi tarıyor. Önce neye bakarsın?', ['Tablodaki satır sayısını azaltmaya', 'Parametre türünü: sütun nvarchar türüne çevriliyor olabilir, parametreyi varchar gönder', 'Sorguya WITH (NOLOCK) eklemeye', 'İndeksi yeniden oluşturmaya'], 1, 'Veri türü önceliğinde nvarchar, varchar sütununu çevirir. Çözüm parametre türünü sütunla eşlemektir. Planda CONVERT_IMPLICIT buna işaret eder.'),
  mc('PostgreSQL\'de <code>bank_txns.account_id</code> tam sayı. Aşağıdakilerden hangisi indeksi aramalı kullanabilir?', ["<code>WHERE account_id::text = '100019'</code>", "<code>WHERE account_id = '100019'</code>", "<code>WHERE account_id + 0 = 100019</code>", "<code>WHERE CAST(account_id AS text) LIKE '100019'</code>"], 1, "Tırnaklı sabitin türü bağlamdan belirlenir ve tam sayıya çevrilir. Dönüşüm sabittedir, sütun serbesttir. Diğerlerinde sütun bir ifadenin içindedir."),
  mc('<code>WHERE txn_time BETWEEN \'2024-11-01\' AND \'2024-11-30\'</code> yazımı indeksi kullanır ama yine de hatalıdır. Neden?', ['BETWEEN indeks kullanamaz', 'Saat bilgisi olan sütunda 30 Kasım\'ın gece yarısından sonraki kayıtları dışarıda kalır', 'Sınırlar BETWEEN içinde dahil sayılmaz', 'BETWEEN yalnız sayılarda çalışır'], 1, 'Üst sınır 2024-11-30 00:00 sayılır. Doğru yazım: txn_time >= \'2024-11-01\' AND txn_time &lt; \'2024-12-01\'.')
]);

/* ------------------------------------------------------------------ 4. Bileşik ve kapsayan indeks */
lesson('opt-indeks', 'C1', 'İndeks tasarımı: bileşik ve kapsayan indeks (covering index), sütun sırası, bedel',
  'Eşitlik, aralık ve sıralama için sütun sırası, soldan önek, kapsayan indeks, filtreli indeks ve yazma bedeli.',
  'composite index covering index include partial filtered index column order',
`<h2>Senaryo: mobil hesap ekranı</h2>
<p>Ilgaz Bank mobil uygulamasında kullanıcı hesabına girince son hareketleri görüyor. Sorgu saniyede çok kez çalışıyor. Tek sütunlu <code>account_id</code> indeksi var ama plan bir sıralama adımı daha yapıyor. Bu derste doğru indeksi seçmeyi öğreneceksin.</p>
<h2>Sütun sırası: eşitlik, aralık, sıralama</h2>
<p>Bileşik indeks telefon rehberi gibidir: önce soyada, sonra ada göre sıralı. Ada göre aramak için rehberin tamamını okursun. Bu <b>soldan önek</b> kuralıdır. Sıralama kuralı da buradan çıkar:</p>
<ol>
<li><b>Eşitlikle aranan sütunlar önce.</b> Aranan bölge tek bir dilime iner.</li>
<li><b>Aralıkla aranan sütun sonra.</b> Aralıktan sonraki sütunlar arama için kullanılamaz.</li>
<li><b>ORDER BY eşitlik sütunlarının ardından geliyorsa</b> sıralama adımı kalkar.</li>
<li><b>Yalnız okunan sütunlar en sona</b> ya da <code>INCLUDE</code> içine.</li>
</ol>
<p>Parantez içindeki yazıyı oku. İkinci planda aramayı yalnız tarih yapıyor, tür okunduktan sonra eleniyor:</p>
${eqp(`CREATE INDEX ix_iyi ON bank_txns (txn_type, txn_time);
EXPLAIN QUERY PLAN SELECT SUM(amount) FROM bank_txns
WHERE txn_type = 'maas' AND txn_time >= '2024-11-01' AND txn_time < '2024-12-01';`)}
${eqp(`CREATE INDEX ix_kotu ON bank_txns (txn_time, txn_type);
EXPLAIN QUERY PLAN SELECT SUM(amount) FROM bank_txns
WHERE txn_type = 'maas' AND txn_time >= '2024-11-01' AND txn_time < '2024-12-01';`)}
<h3>Aynı fark PostgreSQL'de</h3>
${PGNOT}
${PG('pg-sira-iyi')}
${PG('pg-sira-kotu')}
<p>İkisi de aynı ${GER('pg-sira-iyi')[1]} satırı buluyor. İyi sırada ${B('pg-sira-iyi')} sayfa, ters sırada ${B('pg-sira-kotu')} sayfa okunuyor. Tablo büyüdükçe bu fark açılır, çünkü ters sırada aralıktaki bütün türler taranır.</p>
<div class="note"><b>"En seçici sütun önce" kuralı</b>Sık duyulur ama eksiktir. Eşitlik koşullarında seçicilik sırası sonucu pek değiştirmez. Asıl belirleyici, hangi sütunun eşitlikle, hangisinin aralıkla arandığıdır ve aynı indeksi başka hangi sorguların kullanacağıdır.</div>
<h2>Kapsayan indeks (covering index)</h2>
<p>İndeks, sorgunun istediği bütün sütunları içeriyorsa tabloya gidilmez. SQL Server'da bunun yokluğu <code>Key Lookup</code> olarak görünür.</p>
${PG('pg-kapsama-yok')}
${PG('pg-kapsama-var')}
<p>İlk planda yeni indeks seçilmedi bile. Motor var olan <code>account_id</code> indeksiyle satırlara gidiyor ve ${B('pg-kapsama-yok')} sayfa okuyor. <code>INCLUDE</code> eklenince ${B('pg-kapsama-var')} sayfada bitiyor. <code>Index Only Scan</code>, <code>Heap Fetches: 0</code> "tabloya hiç gidilmedi" demektir.</p>
<table>
<tr><th>SQL türü</th><th>Kapsayan indeks yazımı</th></tr>
<tr><td>SQL Server</td><td><code>CREATE INDEX ix ON t (a, b) INCLUDE (c);</code></td></tr>
<tr><td>PostgreSQL</td><td><code>CREATE INDEX ix ON t (a, b) INCLUDE (c);</code></td></tr>
<tr><td>MySQL, Oracle, SQLite</td><td><code>INCLUDE</code> yok, sütun anahtarın sonuna eklenir: <code>(a, b, c)</code></td></tr>
<tr><td>BigQuery</td><td>Klasik indeks yok, bölüm ve kümeleme kullanılır</td></tr>
</table>
<p>SQL Server belgesi çok sütunlu kapsayan indeksin yararı azalttığını, yer, giriş çıkış ve bellek maliyetini büyüttüğünü özellikle uyarır. <code>SELECT *</code> kullanan sorgu için kapsayan indeks kurma: önce sütunları daralt.</p>
<h2>Filtreli (kısmi) indeks</h2>
<p>Çoğu sorgu satırların küçük bir kısmıyla ilgiliyse yalnız onu indeksle. İptal edilen siparişler buna iyi örnektir:</p>
${eqp(`CREATE INDEX ix_acik ON lk_orders (placed_at) WHERE status = 'iptal';
EXPLAIN QUERY PLAN SELECT COUNT(*) FROM lk_orders WHERE status = 'iptal' AND placed_at >= '2024-12-01';`)}
<p>SQLite ve PostgreSQL'de kısmi indeks (partial index), SQL Server'da filtreli indeks (filtered index) olarak geçer. Daha küçüktür ve yalnız ilgili satır değiştiğinde güncellenir. MySQL'de bu özellik yoktur.</p>
<h2>İndeksin bedeli</h2>
<ul>
<li>Her <code>INSERT</code>, <code>DELETE</code> ve indeksli sütuna <code>UPDATE</code> indeksi de değiştirir.</li>
<li>Disk ve bellek ister. Çalışan sorguların sayfaları önbelleği paylaşır.</li>
<li>Çakışan indeksler boşa gider: <code>(a)</code> varken <code>(a, b)</code> kurduysan <code>(a)</code> genellikle silinebilir.</li>
</ul>
<p>Bedeli kendin gör. Kutu indeks kurmadan önceki ve sonraki sayfa sayısını gösterir, yazma süresini kutunun altında okursun:</p>
${eqp(`SELECT page_count FROM pragma_page_count;
CREATE INDEX ix_1 ON bank_txns (txn_time);
CREATE INDEX ix_2 ON bank_txns (txn_type, txn_time);
CREATE INDEX ix_3 ON bank_txns (channel, txn_time, amount);
SELECT page_count FROM pragma_page_count;`)}
<div class="tip"><b>Karar sorusu</b>Bu indeks hangi sorguyu hızlandırıyor? O sorgu ne sıklıkla çalışıyor? Tablo saniyede kaç kez yazılıyor? Yanıtlayamıyorsan indeksi ekleme. SQL Server belgesi de "indeksleri tahminle oluşturma, kullanımı izle, kullanılmayanı kaldır" der.</div>`,
[
  sq("Şu sorgu için doğru bileşik indeksi oluştur (adı serbest): <code>SELECT COUNT(*) FROM bank_txns WHERE channel = 'mobil' AND txn_time &gt;= '2024-11-01' AND txn_time &lt; '2024-12-01'</code>. Hem kanal hem tarih aramada kullanılmalı.",
    'CREATE INDEX ix_kanal_zaman ON bank_txns (channel, txn_time);',
    'Eşitlik önce, aralık sonra.',
    { nr: 1, dl: IDX, plan: { q: "SELECT COUNT(*) FROM bank_txns WHERE channel = 'mobil' AND txn_time >= '2024-11-01' AND txn_time < '2024-12-01'", must: 'channel=\\? AND txn_time>\\?', msg: 'Planın parantezine bak: hem channel=? hem txn_time>? görünmeli. Eşitlik sütunu önce gelmeli.' },
      ynl: ['CREATE INDEX ix_y ON bank_txns (txn_time, channel);', 'CREATE INDEX ix_y ON bank_txns (txn_time);', 'CREATE INDEX ix_y ON bank_txns (channel);'] }),
  sq("Şu sorgu tabloya hiç gitmeden çalışsın; kapsayan indeksi oluştur (adı serbest): <code>SELECT SUM(amount) FROM bank_txns WHERE account_id = 100019 AND txn_time &gt;= '2024-07-01'</code>",
    'CREATE INDEX ix_hesap_zaman_tutar ON bank_txns (account_id, txn_time, amount);',
    'Üç sütun da indekste olmalı. Sıra: eşitlik, aralık, sadece okunan.',
    { nr: 1, dl: ['sqlite', 'mysql', 'oracle'], plan: { q: "SELECT SUM(amount) FROM bank_txns WHERE account_id = 100019 AND txn_time >= '2024-07-01'", must: 'SEARCH bank_txns USING COVERING INDEX .*account_id=\\? AND txn_time>\\?', msg: 'Plan COVERING INDEX ile hem account_id hem txn_time üzerinden aramalı. amount da indekste olmalı.' },
      ynl: ['CREATE INDEX ix_y ON bank_txns (account_id, txn_time);', 'CREATE INDEX ix_y ON bank_txns (txn_time, account_id, amount);', 'CREATE INDEX ix_y ON bank_txns (account_id, amount, txn_time);'] }),
  sq("Mobil ekran bir hesabın son 20 hareketini getiriyor. Şu sorgu hem arama yapsın hem geçici sıralama kurmasın; indeksi oluştur (adı serbest): <code>SELECT txn_id, amount, txn_time FROM bank_txns WHERE account_id = 100019 ORDER BY txn_time DESC LIMIT 20</code>",
    'CREATE INDEX ix_hesap_zaman ON bank_txns (account_id, txn_time);',
    'Eşitlik sütunundan sonra sıralama sütunu.',
    { nr: 1, dl: IDX, plan: { q: 'SELECT txn_id, amount, txn_time FROM bank_txns WHERE account_id = 100019 ORDER BY txn_time DESC LIMIT 20', must: 'SEARCH bank_txns', not: 'TEMP B-TREE', msg: 'Planda USE TEMP B-TREE olmamalı ve arama yapılmalı. İndeks önce hesaba, sonra zamana göre sıralı olmalı.' },
      ynl: ['CREATE INDEX ix_y ON bank_txns (txn_time);', 'CREATE INDEX ix_y ON bank_txns (txn_time, account_id);', 'CREATE INDEX ix_y ON bank_txns (account_id, amount);'] }),
  sq("Lezzet Kurye'de operasyon yalnız iptal edilen siparişlerin tarihine bakıyor. <code>status = 'iptal'</code> satırlarıyla sınırlı, <code>placed_at</code> üzerinde kısmi indeks oluştur: adı <code>ix_iptal</code>. Şu sorgu bu indeksi kullanmalı: <code>SELECT COUNT(*) FROM lk_orders WHERE status = 'iptal' AND placed_at &gt;= '2024-12-01'</code>",
    "CREATE INDEX ix_iptal ON lk_orders (placed_at) WHERE status = 'iptal';",
    '<code>CREATE INDEX ... ON tablo (sütun) WHERE koşul</code>',
    Object.assign({ check: "SELECT name, sql LIKE '%WHERE%' AS kismi FROM sqlite_master WHERE type = 'index' AND name = 'ix_iptal'", plan: { q: "SELECT COUNT(*) FROM lk_orders WHERE status = 'iptal' AND placed_at >= '2024-12-01'", must: 'SEARCH lk_orders USING (COVERING )?INDEX ix_iptal', msg: 'Sorgu ix_iptal indeksiyle arama yapmalı.' },
      ynl: ['CREATE INDEX ix_iptal ON lk_orders (placed_at);', "CREATE INDEX ix_iptal ON lk_orders (status, placed_at);", "CREATE INDEX ix_baska ON lk_orders (placed_at) WHERE status = 'iptal';"] }, SQLITE)),
  mc('İndeks <code>(a, b, c)</code>. Hangi koşul indeksten en az yararlanır?', ['<code>WHERE a = 1</code>', '<code>WHERE a = 1 AND b = 2</code>', '<code>WHERE b = 2 AND c = 3</code>', '<code>WHERE a = 1 AND b &gt; 2</code>'], 2, 'İlk sütun aramada yoksa soldan önek kuralı bozulur. Motor en iyi ihtimalle indeksin tamamını tarar.'),
  mc('İndeks <code>(a, b, c)</code>, koşul <code>a = 1 AND b &gt; 2 AND c = 3</code>. Aramada hangi sütunlar kullanılır?', ['Yalnız a', 'a ve b; c okunduktan sonra süzülür', 'a, b ve c', 'Yalnız c'], 1, 'Aralık koşulundan sonra indeks sırası bozulur. Bu yüzden aralık sütunu mümkünse eşitlik sütunlarından sonra gelir. SQLite planında parantezde a=? AND b>? görürsün.'),
  mc('Tabloda hem <code>(customer_id)</code> hem <code>(customer_id, order_date)</code> indeksi var. Tablo sık yazılıyor. En mantıklı adım hangisi?', ['Üçüncü bir indeks olarak (order_date, customer_id) eklemek', 'Kullanımı izleyip (customer_id) indeksini kaldırmayı değerlendirmek', 'İkisini de silmek', 'Birini clustered yapmak için tabloyu baştan yazmak'], 1, 'Soldan önek sayesinde (customer_id, order_date), customer_id aramasını da karşılar. Tek sütunlu indeks çoğunlukla fazladan yazma bedelidir. Önce kullanımını doğrula.'),
  mc('Saniyede binlerce satır yazılan olay tablosuna analist raporu için 6 indeks eklenmek isteniyor. Rapor günde bir çalışıyor. Hangisi daha iyi?', ['6 indeksi de eklemek', 'Raporu özet tablo ya da ayrı rapor kopyası üzerinden çalıştırmak', 'Yazmaları durdurup raporu öyle almak', 'İndeksleri rapordan önce ekleyip her gün silmek zorundayız'], 1, 'Yazma ağırlıklı tabloda her indeks her yazmaya biner. Günde bir çalışan rapor için özet tablo ya da okuma kopyası daha ucuzdur.')
]);

/* ------------------------------------------------------------------ 5. Seçicilik ve istatistik */
lesson('opt-secicilik', 'C1', 'Seçicilik (selectivity) ve istatistikler: motor neden o planı seçti?',
  'Seçicilik hesabı, çarpık dağılım, indeksin işe yaramadığı değerler, ANALYZE, sqlite_stat1, bayat istatistik.',
  'selectivity cardinality statistics analyze histogram skew',
`<h2>Senaryo: aynı sorgu, iki farklı değer</h2>
<p><code>txn_type</code> sütununa indeks kuruldu. Faiz işlemleri raporu çok hızlandı. Kart harcaması raporu ise hiç hızlanmadı. Aynı sorgu, aynı indeks. Fark değerin <b>seçiciliğinde</b>.</p>
<h2>Seçicilik nedir?</h2>
<p>Koşulun tabloyu ne kadar daralttığıdır: <code>eşleşen satır / toplam satır</code>. Oran küçükse seçicilik yüksektir. Sütunun kaç farklı değeri olduğu <b>kardinalite</b> (cardinality) adını alır.</p>
${box(`SELECT txn_type, COUNT(*) AS adet,
       ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pay
FROM bank_txns
GROUP BY txn_type
ORDER BY adet DESC;`)}
<p>Veri çarpık: kart harcaması tablonun yarısına yakın, faiz ise çok küçük bir pay. Bu yüzden "bu sütunun seçiciliği" değil, <b>bu değerin seçiciliği</b> diye düşünmek gerekir.</p>
<h2>Gerçek çıktı: nadir ve yaygın değer</h2>
${PGNOT}
<p>Tablonun tamamını okumak (<code>Seq Scan</code>) bu veride ${B('pg-tarih-seq')} sayfa tutuyor. Nadir değer:</p>
${PG('pg-secici-nadir')}
<p>Yaygın değer:</p>
${PG('pg-secici-yaygin')}
<p>Yaygın değerde indeks kullanılıyor ama ${B('pg-secici-yaygin')} sayfa okunuyor. Bu sayı tablonun tamamını okumaktan fazladır, çünkü üstüne indeks sayfaları biniyor. Satırların yarısı isteniyorsa neredeyse her sayfaya gidilir. Bu durumda motorun indeksi atlayıp tam tarama seçmesi hata değildir. "İndeks var ama kullanmıyor" şikâyetinin önemli bir kısmı budur.</p>
<h2>İstatistikler</h2>
<p>Motor kaç satır çıkacağını çalıştırmadan önce istatistiklerden tahmin eder. Plan seçimi bu tahmine dayanır.</p>
<table>
<tr><th>SQL türü</th><th>İstatistik toplama</th><th>Bakma yeri</th></tr>
<tr><td>SQLite</td><td><code>ANALYZE</code>; önerilen yol <code>PRAGMA optimize</code></td><td><code>sqlite_stat1</code></td></tr>
<tr><td>PostgreSQL</td><td><code>ANALYZE</code>, otomatik vacuum süreci</td><td><code>pg_stats</code>: <code>n_distinct</code>, <code>most_common_vals</code>, <code>histogram_bounds</code></td></tr>
<tr><td>SQL Server</td><td>Varsayılan olarak otomatik, elle <code>UPDATE STATISTICS</code></td><td><code>DBCC SHOW_STATISTICS</code></td></tr>
<tr><td>MySQL</td><td><code>ANALYZE TABLE</code></td><td><code>information_schema.STATISTICS</code></td></tr>
<tr><td>Oracle</td><td><code>DBMS_STATS.GATHER_TABLE_STATS</code></td><td><code>ALL_TAB_STATISTICS</code>, <code>ALL_TAB_COL_STATISTICS</code></td></tr>
<tr><td>BigQuery</td><td>Yönetilir, indeks seçimi yok. Taranan baytı bölüm ve kümeleme belirler</td><td>Yürütme ayrıntıları</td></tr>
</table>
<p>SQLite'ta istatistik tablosunu kendin okuyabilirsin. <code>stat</code> sütunundaki ilk sayı toplam satır, ikincisi indeksin ilk sütununda bir değere düşen ortalama satırdır:</p>
${eqp(`CREATE INDEX ix_tip ON bank_txns (txn_type);
CREATE INDEX ix_hesap_zaman ON bank_txns (account_id, txn_time);
ANALYZE;
SELECT tbl, idx, stat FROM sqlite_stat1 WHERE tbl = 'bank_txns';`)}
<h2>Bayat istatistik (stale statistics)</h2>
<p>Bir batch işi tablonun yapısını değiştirdi ama istatistik yenilenmedi. Aşağıda kart harcamalarının hepsi tek hesaba taşındı (yalnız bu deney için). <code>ANALYZE</code> çalışmadan önce motor ${TAH('pg-bayat')[1]} satır bekliyor, ${trn(GER('pg-bayat')[1])} satır geliyor, üstelik indeks yolunu seçiyor:</p>
${PGS('pg-bayat')}
<p><code>ANALYZE</code> sonrası tahmin neredeyse tam oturuyor ve plan <code>Seq Scan</code> oluyor:</p>
${PGS('pg-taze')}
<p>Dikkat et: bu çıktıda taze planın okuduğu sayfa sayısı daha yüksek (${B('pg-taze')} ve ${B('pg-bayat')}). Toplu <code>UPDATE</code> tabloda ölü satır bıraktı ve bitmap yolu yalnız gerekli sayfaları okudu. Plan tahmine göre seçilir, doğru tahmin her zaman daha az sayfa demek değildir. Tek sorguyla hüküm verme: asıl risk, yanlış tahminin iç içe döngüye ya da küçük bellek ayrılmasına dönüştüğü birleştirmeli sorgulardır. Batch sonrasında <code>ANALYZE</code> iyi bir alışkanlıktır.</p>
<h2>Parametreyle ilişkisi</h2>
<p>Aynı sorgunun iki değeri farklı planı hak ediyorsa ve motor planı bir kez seçip saklıyorsa sorun çıkar. SQL Server'da buna parametre koklama (parameter sniffing) denir. Ayrıntısı <b>SQL türüne özgü optimizasyon</b> dersinde.</p>`,
[
  sq('İndeks adaylarını karşılaştır. <code>bank_txns</code> için <code>txn_type</code>, <code>channel</code> ve <code>account_id</code> sütunlarının farklı değer sayısını ve bir değere düşen ortalama satırı (tam sayı) getir: <code>sutun</code>, <code>farkli</code>, <code>ort_satir</code>. Farklı değer sayısına göre azalan sırala.',
    "SELECT sutun, farkli, ROUND(1.0 * toplam / farkli) AS ort_satir FROM (SELECT 'txn_type' AS sutun, COUNT(DISTINCT txn_type) AS farkli, COUNT(*) AS toplam FROM bank_txns UNION ALL SELECT 'channel', COUNT(DISTINCT channel), COUNT(*) FROM bank_txns UNION ALL SELECT 'account_id', COUNT(DISTINCT account_id), COUNT(*) FROM bank_txns) t ORDER BY farkli DESC;",
    'Her sütun için bir satır üreten üç <code>SELECT</code>ü <code>UNION ALL</code> ile birleştir.',
    { ord: true, ynl: ["SELECT 'txn_type' AS sutun, COUNT(DISTINCT txn_type) AS farkli, COUNT(*) AS ort_satir FROM bank_txns UNION ALL SELECT 'channel', COUNT(DISTINCT channel), COUNT(*) FROM bank_txns UNION ALL SELECT 'account_id', COUNT(DISTINCT account_id), COUNT(*) FROM bank_txns ORDER BY farkli DESC;"] }),
  sq('Çarpıklığı göster: <code>lk_orders</code> için durum başına sipariş sayısı ve yüzde payı (1 basamak): <code>status</code>, <code>adet</code>, <code>pay</code>. Adede göre azalan.',
    'SELECT status, COUNT(*) AS adet, ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pay FROM lk_orders GROUP BY status ORDER BY adet DESC;',
    'Genel toplam için pencere: <code>SUM(COUNT(*)) OVER ()</code>.',
    { ord: true, ynl: ['SELECT status, COUNT(*) AS adet, ROUND(COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pay FROM lk_orders GROUP BY status ORDER BY adet DESC;', 'SELECT status, COUNT(*) AS adet, COUNT(*) AS pay FROM lk_orders GROUP BY status ORDER BY adet DESC;'] }),
  mc("Önceki sonuca göre <code>status</code> üzerinde tek sütunlu indeks hangi sorguya en çok yarar?", ["<code>WHERE status = 'teslim'</code>", "<code>WHERE status = 'iptal'</code>", '<code>WHERE status IS NOT NULL</code>', 'Hepsine eşit yarar'], 1, "Teslim satırların çok büyük kısmı; o değer için indeks neredeyse her sayfaya gider. İptal ise nadir olduğu için indeks gerçek bir daraltma sağlar. Bu tür sütunda kısmi indeks de değerlendirilir."),
  sq('SQLite istatistiklerini üret ve oku. <code>bank_txns</code> üzerinde <code>txn_type</code> sütununa <code>ix_tip</code> adlı indeks oluştur, <code>ANALYZE</code> çalıştır, ardından <code>sqlite_stat1</code> tablosundan bu indeksin satırını getir: <code>idx</code>, <code>stat</code>.',
    "CREATE INDEX ix_tip ON bank_txns (txn_type); ANALYZE; SELECT idx, stat FROM sqlite_stat1 WHERE idx = 'ix_tip';",
    'Üç ifade: indeks, ANALYZE, SELECT.',
    Object.assign({ ynl: ["CREATE INDEX ix_tip ON bank_txns (txn_type); SELECT name AS idx, '' AS stat FROM sqlite_master WHERE name = 'ix_tip';", "CREATE INDEX ix_tip ON bank_txns (txn_type); SELECT idx, stat FROM sqlite_stat1 WHERE idx = 'ix_tip';"] }, SQLITE)),
  mc('Önceki görevin çıktısı <code>42284 5286</code>. Bu ne söylüyor?', ['Tabloda 42.284 satır var; bir txn_type değerine ortalama 5.286 satır düşüyor', 'İndeks 42.284 sayfa, tablo 5.286 sayfa', '42.284 sorgu indeksi kullandı, 5.286 sorgu kullanmadı', 'Tabloda 5.286 farklı txn_type var'], 0, 'İlk sayı satır, ikincisi indeksin ilk sütununda değer başına ortalama satırdır. Ortalama çarpıklığı gizler: gerçekte kart harcaması 20.520, faiz 1.262 satırdır.'),
  mc('PostgreSQL planında tahmin <code>rows=119</code>, gerçek <code>actual rows=20562</code>. Tablo az önce toplu güncellendi. İlk ne denenir?', ['Tablonun <code>ANALYZE</code> ile istatistiğini yenilemek', 'Sunucuyu yeniden başlatmak', 'Sorguya LIMIT eklemek', 'Sütun türünü değiştirmek'], 0, 'Büyük değişiklikten sonra istatistik bayat kalır. ANALYZE ucuz ve güvenli bir ilk adımdır. MySQL belgesi de benzer durum için ANALYZE TABLE önerir.'),
  mc('Bir meslektaşın "<code>txn_type</code> indeksi var ama motor <code>kart_harcama</code> için tam tarama seçiyor, motor hatalı" diyor. Tablonun neredeyse yarısı bu değer. Nasıl yanıtlarsın?', ['Haklı; indeks kullanmaya zorlayan bir ipucu ekleyelim', 'Bu değer için tam tarama makul olabilir; yarı tabloyu indeks üzerinden okumak daha çok sayfa tutabilir, ölçelim', 'İndeksi silip yeniden kurarsak kullanır', 'Sütun türü metin olduğu için indeks hiç çalışmaz'], 1, 'Seçiciliği düşük değerde indeks kazandırmaz, hatta bu verideki PostgreSQL ölçümünde ' + B('pg-tarih-seq') + ' yerine ' + B('pg-secici-yaygin') + ' sayfa okutmuştur. Zorlamadan önce ölç.'),
  mc('Çok farklı değerli sütun <code>customer_id</code> üzerinde indeks var, dağılım dengeli. Yine de <code>WHERE customer_id &gt; 0</code> planında tam tarama çıktı. Neden şaşırmamak gerekir?', ['customer_id tam sayı olduğu için', 'Koşul neredeyse bütün satırları seçiyor; sütunun kardinalitesi değil koşulun seçiciliği belirleyicidir', 'Büyüktür işareti indeks kullanamaz', 'Yüksek kardinaliteli sütunda indeks çalışmaz'], 1, 'Sütun çok seçici olabilir, ama bu koşul hiç daraltmıyor. Plan koşula bakar.')
]);

/* ------------------------------------------------------------------ 6. JOIN, EXISTS, IN */
const ESKI_ALT = `SELECT c.customer_id, c.city,
       (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.customer_id) AS siparis
FROM customers c;`;
lesson('opt-join', 'C1', 'JOIN, EXISTS, IN ve alt sorgu maliyeti: erken süzme, gereksiz DISTINCT, SELECT *',
  'Aynı sonucu veren yazımların planı, ilişkili alt sorgu, WHERE ve HAVING, DISTINCT ile örtülen çoğalma, SELECT * bedeli.',
  'exists in semi join correlated subquery distinct select star early filter cte materialized',
`<h2>Senaryo: "Hesabı olan müşteriler"</h2>
<p>Bu soruyu üç biçimde yazabilirsin. Hangisi hızlı? İnternette kesin cevaplar göreceksin. Doğrusu: <b>motora ve veriye bağlı, ölç.</b></p>
${box(`-- 1) EXISTS
SELECT c.customer_id FROM bank_customers c
WHERE EXISTS (SELECT 1 FROM bank_accounts a WHERE a.customer_id = c.customer_id);`)}
${box(`-- 2) IN
SELECT c.customer_id FROM bank_customers c
WHERE c.customer_id IN (SELECT a.customer_id FROM bank_accounts a);`)}
${box(`-- 3) JOIN + DISTINCT
SELECT DISTINCT c.customer_id FROM bank_customers c
JOIN bank_accounts a ON a.customer_id = c.customer_id;`)}
<h3>PostgreSQL ne yapıyor?</h3>
${PGNOT}
<p>EXISTS ve IN için plan <b>birebir aynı</b>: motor ikisini de yarı birleştirmeye (semi join) çevirdi.</p>
${PG('pg-exists')}
${PG('pg-in')}
<p>JOIN + DISTINCT ise önce satırları çoğaltıyor (${GER('pg-distinct')[1]} eşleşme), sonra tekilleştiriyor (${GER('pg-distinct')[0]} müşteri):</p>
${PG('pg-distinct')}
<h3>SQLite ne yapıyor?</h3>
<p>Aynı üç sorgunun planlarına bak ve süreleri karşılaştır. Burada indeks yokken <code>EXISTS</code> her müşteri için hesap tablosunu ilk eşleşmeye kadar tarar. "EXISTS her zaman hızlıdır" kuralının bu motorda geçerli olmadığını kendin görürsün.</p>
${eqp(`EXPLAIN QUERY PLAN SELECT c.customer_id FROM bank_customers c
WHERE EXISTS (SELECT 1 FROM bank_accounts a WHERE a.customer_id = c.customer_id);
EXPLAIN QUERY PLAN SELECT c.customer_id FROM bank_customers c
WHERE c.customer_id IN (SELECT a.customer_id FROM bank_accounts a);`)}
<p>Çıkarım: kuralı ezberleme. <code>bank_accounts (customer_id)</code> indeksi eklenince SQLite'ta <code>EXISTS</code> de arama yapar. Yöntemi anlama göre seç: varlık soruyorsan <code>EXISTS</code> ya da <code>IN</code>, satırı çoğaltmak gerekmiyorsa <code>JOIN + DISTINCT</code> yazma.</p>
<div class="note"><b>NOT IN başka bir konu</b><code>NOT IN</code> ile <code>NOT EXISTS</code> farkı hız değil anlamdır. Alt sorguda tek bir NULL varsa <code>NOT IN</code> hiç satır döndürmez. Bu yüzden <code>NOT EXISTS</code> tercih edilir.</div>
<h2>İlişkili alt sorgu (correlated subquery)</h2>
<p><code>SELECT</code> listesindeki ilişkili alt sorgu dış sorgunun her satırı için çalışır. İç tarafta indeks yoksa satır × satır iş çıkar.</p>
${eqp("EXPLAIN QUERY PLAN\n" + ESKI_ALT)}
<p>Plandaki <code>CORRELATED SCALAR SUBQUERY</code> ve altındaki <code>SCAN a</code> satırları bunu söylüyor. Önce toplayıp sonra birleştirince alt sorgu bir kez çalışır:</p>
${box(`SELECT c.customer_id, c.city, COALESCE(o.siparis, 0) AS siparis
FROM customers c
LEFT JOIN (SELECT customer_id, COUNT(*) AS siparis FROM orders GROUP BY customer_id) o
  ON o.customer_id = c.customer_id;`)}
<p><code>LEFT JOIN</code> ve <code>COALESCE</code> önemli: siparişi olmayan müşteride alt sorgu 0 veriyordu, düz <code>JOIN</code> o satırı kaybederdi.</p>
<h2>Erken süzme</h2>
<p>Mantıksal sırada <code>HAVING</code> gruplamadan sonra çalışır. Grup sütunu üzerindeki koşul için öğüt nettir: <code>WHERE</code>'de yaz. Ama hız farkı beklemeden önce planlara bak:</p>
${eqp(`CREATE INDEX ix_tip ON bank_txns (txn_type);
EXPLAIN QUERY PLAN SELECT txn_type, COUNT(*) FROM bank_txns GROUP BY txn_type HAVING txn_type = 'faiz';
EXPLAIN QUERY PLAN SELECT txn_type, COUNT(*) FROM bank_txns WHERE txn_type = 'faiz' GROUP BY txn_type;`)}
<p>İki kutu da aynı planı veriyor: bu basit durumda motor koşulu kendisi öne alıyor. PostgreSQL de aynı şeyi yapıyor:</p>
${PG('pg-having')}
<p>Yine de <code>WHERE</code> yaz. Niyetin açık kalır, ayrıca motorun koşulu öne alamadığı durumlar vardır. Birleştirmeli sorgularda da sor: "Bu büyük tablo birleşmeden önce daralabilir mi?" İyileştiriciler <code>WHERE</code> koşulunu çoğunlukla kendileri aşağı iter, ama <code>LEFT JOIN</code>, pencere fonksiyonu ve <code>DISTINCT</code> içeren alt sorgular bunu engelleyebilir. Emin olmanın yolu plandır.</p>
<h2>CTE her zaman bedava değildir</h2>
<p>PostgreSQL'de CTE (12 ve sonrası) tek kullanılıyorsa sorguya gömülür, <code>MATERIALIZED</code> yazarsan önce hesaplanıp saklanır:</p>
${PG('pg-cte-acik')}
${PG('pg-cte-mat')}
<p>Birinde ${B('pg-cte-acik')} sayfa, diğerinde ${B('pg-cte-mat')} sayfa. <code>MATERIALIZED</code> her zaman kötü de değildir: pahalı bir alt sonuç birkaç kez kullanılıyorsa kazandırabilir. BigQuery belgesi de CTE'nin okunabilirlik için olduğunu, performans için olmadığını ve birden çok kez değerlendirilebileceğini yazar.</p>
<h2>Gereksiz DISTINCT ve SELECT *</h2>
<ul>
<li><b>DISTINCT çoğalmayı gizler.</b> Birleştirme satırları çoğaltıyorsa önce nedenini düzelt. Sonuç doğru görünse bile iş iki kat yapılmıştır.</li>
<li><b>SELECT *</b> kapsayan indeksi işe yaramaz hâle getirir ve sıralama belleğini büyütür. Aşağıdaki iki planda satır sayısı aynı, sıralama belleği farklı.</li>
<li><b>Sütun tabanlı ambarda fatura farkı:</b> BigQuery'de okunan sütun kadar ödersin. Belgeye göre <code>SELECT *</code> sorgusuna <code>LIMIT</code> eklemek okunan veri miktarını değiştirmez.</li>
</ul>
${PG('pg-yildiz')}
${PG('pg-iki-sutun')}`,
[
  sq("Bu rapor her müşteri için alt sorgu çalıştırıyor. Aynı sonucu ilişkili alt sorgu olmadan yaz: <code>" + esc(ESKI_ALT.replace(/\s+/g, ' ')) + "</code>",
    "SELECT c.customer_id, c.city, COALESCE(o.siparis, 0) AS siparis FROM customers c LEFT JOIN (SELECT customer_id, COUNT(*) AS siparis FROM orders GROUP BY customer_id) o ON o.customer_id = c.customer_id;",
    'Önce siparişleri müşteri başına topla, sonra müşterilere <code>LEFT JOIN</code> ile bağla.',
    { plan: { not: 'CORRELATED', msg: 'Planda hâlâ CORRELATED görünüyor. Alt sorgu her müşteri için çalışıyor.' },
      ynl: [ESKI_ALT, "SELECT c.customer_id, c.city, COUNT(*) AS siparis FROM customers c LEFT JOIN orders o ON o.customer_id = c.customer_id GROUP BY c.customer_id, c.city;", "SELECT c.customer_id, c.city, COUNT(*) AS siparis FROM customers c JOIN orders o ON o.customer_id = c.customer_id GROUP BY c.customer_id, c.city;"] }),
  sq("Koşulu niyetine uygun yere taşı. <code>SELECT txn_type, COUNT(*) AS adet FROM bank_txns GROUP BY txn_type HAVING txn_type = 'faiz'</code> sorgusunu <code>HAVING</code> olmadan, aynı sonucu verecek biçimde yaz. (Plan bu basit durumda aynı kalır; alışkanlık için.)",
    "SELECT txn_type, COUNT(*) AS adet FROM bank_txns WHERE txn_type = 'faiz' GROUP BY txn_type;",
    'Grup sütunundaki koşul <code>WHERE</code> içine taşınabilir.',
    { mustNot: [{ re: '\\bHAVING\\b', msg: 'Görev bu koşulu HAVING olmadan yazmanı istiyor.' }],
      ynl: ["SELECT txn_type, COUNT(*) AS adet FROM bank_txns GROUP BY txn_type HAVING txn_type = 'faiz';", "SELECT txn_type, COUNT(*) AS adet FROM bank_txns GROUP BY txn_type;"] }),
  sq("Bu sorgu satırları çoğaltıp sonra tekilleştiriyor. <code>DISTINCT</code> ve <code>JOIN</code> kullanmadan aynı sonucu ver: <code>SELECT DISTINCT c.customer_id, c.city FROM customers c JOIN orders o ON o.customer_id = c.customer_id</code>",
    "SELECT c.customer_id, c.city FROM customers c WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id);",
    'Müşteri satırı çoğalmasın; yalnız varlığını sor.',
    { mustNot: [{ re: '\\bDISTINCT\\b|\\bJOIN\\b', msg: 'Görev DISTINCT ve JOIN kullanmadan yazmanı istiyor.' }],
      ynl: ['SELECT DISTINCT c.customer_id, c.city FROM customers c JOIN orders o ON o.customer_id = c.customer_id;', 'SELECT c.customer_id, c.city FROM customers c;'] }),
  sq("Yönetici olmayan çalışanları sayan bu sorgu 0 döndürüyor: <code>SELECT COUNT(*) AS adet FROM employees WHERE emp_id NOT IN (SELECT manager_id FROM employees)</code>. Birisi 'NOT IN yavaş, EXISTS'e çevirdik, sonuç değişti' diyor. Doğru sayıyı <code>NOT EXISTS</code> ile getir.",
    "SELECT COUNT(*) AS adet FROM employees e WHERE NOT EXISTS (SELECT 1 FROM employees m WHERE m.manager_id = e.emp_id);",
    'Alt sorguda NULL olduğu için NOT IN hiçbir satır döndürmez. Sonuç değişimi hız değil anlam farkıdır.',
    { must: [{ re: '\\bNOT\\s+EXISTS\\b', msg: 'Görev NOT EXISTS kullanmanı istiyor.' }],
      ynl: ['SELECT COUNT(*) AS adet FROM employees WHERE emp_id NOT IN (SELECT manager_id FROM employees);'] }),
  sq("Kurye ekranı yalnız sipariş numaralarını gösteriyor ama kod tüm sütunları çekiyor: <code>SELECT * FROM lk_orders WHERE courier_id = 5</code>. Yalnız <code>order_id</code> getir. <code>courier_id</code> indeksi zaten var; plan tabloya gitmemeli.",
    'SELECT order_id FROM lk_orders WHERE courier_id = 5;',
    'SQLite indeksi satır kimliğini de taşır. Başka sütun istemezsen tabloya gitmeye gerek kalmaz.',
    { plan: { must: 'USING COVERING INDEX', msg: 'Plan COVERING INDEX göstermiyor. Yalnız order_id seç.' },
      ynl: ['SELECT * FROM lk_orders WHERE courier_id = 5;', 'SELECT order_id, status FROM lk_orders WHERE courier_id = 5;'] }),
  mc('PostgreSQL\'de EXISTS ve IN yazımları aynı planı üretti. Ne sonuca varırsın?', ['Bu motorda bu sorgu için yazım farkı performans farkı değil; okunabilirliğe göre seçerim', 'EXISTS her zaman IN\'den hızlıdır', 'IN her zaman EXISTS\'ten hızlıdır', 'Plan aynıysa sonuç yanlış olmalı'], 0, 'Motor ikisini de yarı birleştirmeye çevirdi. Başka motorda ya da başka veride durum değişebilir, bu yüzden genel kural yerine ölçüm gerekir.'),
  mc('<code>WHERE o.order_date &gt;= \'2024-01-01\'</code> koşulu <code>LEFT JOIN orders o</code> yapan sorguda çalışıyor, hızlandı ama siparişi olmayan müşteriler kayboldu. Sebep nedir?', ['LEFT JOIN indeks kullanamaz', 'Sağ tablodaki WHERE koşulu NULL satırları eler; koşul ON içine taşınmalı', 'Tarih biçimi yanlış', 'Plan önbelleği eski kalmış'], 1, 'Bu hızlandırma değil, sonucu değiştiren bir hatadır. Sağ tablo koşulu ON içinde yazılınca eşleşmeyen sol satırlar korunur.'),
  mc('BigQuery\'de <code>SELECT * FROM olaylar LIMIT 10</code> için doğru olan hangisi?', ['LIMIT sayesinde yalnız 10 satırlık veri okunur ve faturalanır', 'Kümelenmemiş tabloda LIMIT okunan baytı azaltmaz; gereken sütunları seçmek ve bölüm filtresi yazmak gerekir', 'SELECT * sütun tabanlı depolamada ücretsizdir', 'LIMIT sorguyu kuru çalıştırmaya çevirir'], 1, 'Belgeye göre LIMIT eklemek SELECT * sorgusunda okunan veriyi değiştirmez. Kümelenmiş tablolarda LIMIT taranan baytı azaltabilir, ama temel çözüm sütun ve bölüm seçimidir.')
]);

/* ------------------------------------------------------------------ 7. Toplama ve pencere */
lesson('opt-toplama', 'C1', 'Toplama ve pencere fonksiyonu maliyeti: önce topla, sırala, özetle',
  'GROUP BY ve pencere fonksiyonunda sıralama maliyeti, indeksle sıralamayı kaldırmak, önce toplama, COUNT DISTINCT, özet tablo.',
  'aggregate window function cost sort hashaggregate groupaggregate summary table materialized view',
`<h2>Senaryo: Pedal İzmir yönetim panosu</h2>
<p>Pano her yenilendiğinde 116.000 yolculuk üzerinden istasyon toplamları ve kullanıcı sıralamaları hesaplıyor. Toplama ve pencere fonksiyonları satırları sıralamayı ya da gruplamayı gerektirir. Maliyetin büyük kısmı filtreden sonra burada oluşur.</p>
<h2>GROUP BY: sıralı mı, karma mı?</h2>
<p>İki yöntem vardır: karma tablo (<code>HashAggregate</code>) ya da sıralı girdiyi yürüyerek gruplama (<code>GroupAggregate</code>). SQLite'ta indeks yoksa <code>USE TEMP B-TREE FOR GROUP BY</code> görürsün. Uygun indeks bu adımı kaldırır:</p>
${eqp(`EXPLAIN QUERY PLAN SELECT start_station, COUNT(*) FROM bk_trips GROUP BY start_station;
CREATE INDEX ix_baslangic ON bk_trips (start_station);
EXPLAIN QUERY PLAN SELECT start_station, COUNT(*) FROM bk_trips GROUP BY start_station;`)}
<h2>Önce topla, sonra birleştir: işe yarar mı?</h2>
<p>Yaygın öğüt: büyük tabloyu birleştirmeden önce özetle. Ölçelim.</p>
${PGNOT}
${PG('pg-once-birlestir')}
${PG('pg-once-topla')}
<p>Dürüst sonuç: bu veride okunan sayfa neredeyse aynı (${B('pg-once-birlestir')} ve ${B('pg-once-topla')}), planlar farklı. PostgreSQL iki yazımı da makul biçimde çözüyor. "Önce topla" burada hız kazandırmadı, yine de iki önemli yararı var:</p>
<ul>
<li><b>Doğruluk:</b> Birden çok tabloyu birleştirip toplarken satır çoğalması (fan-out) tutarları şişirir. Önce toplamak bunu önler.</li>
<li><b>Motorun yeteneği:</b> Daha basit iyileştiricilerde ve dağıtık ambarlarda fark büyür. BigQuery belgesi GROUP BY ve JOIN içeren sorgularda erken toplamayı önerir.</li>
</ul>
<p>Kutuları sırayla çalıştırıp SQLite süresini kendin karşılaştırabilirsin:</p>
${box(`SELECT s.name, COUNT(*) AS yolculuk
FROM bk_trips t JOIN bk_stations s ON s.station_id = t.start_station
GROUP BY s.name;`)}
${box(`WITH g AS (SELECT start_station, COUNT(*) AS yolculuk FROM bk_trips GROUP BY start_station)
SELECT s.name, g.yolculuk FROM g JOIN bk_stations s ON s.station_id = g.start_station;`)}
<h2>Pencere fonksiyonları</h2>
<p>Bir pencere fonksiyonu <code>PARTITION BY</code> ve <code>ORDER BY</code> sırasına göre satırları dizmek zorundadır. Sıra indeksten gelmezse sıralama yapılır.</p>
${PG('pg-pencere')}
<p>Aynı sıraya sahip indeksle sıralama adımı kalkar:</p>
${PG('pg-pencere-ix')}
<p>Bu iki çıktıda okunan sayfa neredeyse aynı. Çünkü tablodaki bütün satırlar isteniyor ve indeks üzerinden tablo sayfalarına tek tek gidiliyor. Kazanç yalnız sıralama adımının kalkmasıdır. Ölçmeden "indeks koydum, kesin hızlandı" deme.</p>
<ul>
<li><b>Aynı pencereyi tekrarlama.</b> Bir sorguda aynı <code>OVER (...)</code> tanımı aynı sıralamayı paylaşabilir. Farklı sıralamalı her pencere ek bir sıralama demek olabilir.</li>
<li><b>Grup başına ilk N:</b> <code>ROW_NUMBER()</code> tüm satırları numaralar. Tek hesabın son 20 hareketi gerekiyorsa pencere yerine indeksli <code>ORDER BY ... LIMIT</code> daha ucuzdur.</li>
<li><b>Satır başına alt sorgu yerine pencere:</b> "Her hesabın son işlemi" için ilişkili alt sorgu yerine pencere çoğunlukla daha iyi plan verir.</li>
</ul>
<h2>COUNT(DISTINCT) ve özet tablo</h2>
<p><code>COUNT(DISTINCT x)</code> değerleri sıralar ya da karma tabloda tutar. Tam sayı gerekmiyorsa yaklaşık fonksiyonlar vardır: BigQuery ve SQL Server'da <code>APPROX_COUNT_DISTINCT</code>.</p>
<p>Aynı ağır toplama günde yüzlerce kez çalışıyorsa sorguyu iyileştirmek yerine sonucu saklamak daha iyi olabilir: özet tablo, ya da PostgreSQL ve Oracle'da materialized view, SQL Server'da indexed view. Bedeli tazeliktir: kim, ne sıklıkla yeniliyor, gecikme kabul edilebilir mi?</p>
${box(`CREATE TABLE ozet_gun AS
SELECT date(started_at) AS gun, start_station, COUNT(*) AS yolculuk
FROM bk_trips
GROUP BY date(started_at), start_station;

SELECT gun, SUM(yolculuk) AS yolculuk FROM ozet_gun
WHERE gun >= '2024-07-01' AND gun < '2024-07-08'
GROUP BY gun ORDER BY gun;`)}`,
[
  sq("Bu sorgu geçici yapı kuruyor: <code>SELECT end_station, COUNT(*) FROM bk_trips GROUP BY end_station</code>. Planda <code>TEMP B-TREE</code> kalmaması için indeksi oluştur (adı serbest).",
    'CREATE INDEX ix_bitis ON bk_trips (end_station);',
    'Gruplanan sütunla başlayan indeks, grupları sıralı verir.',
    { nr: 1, dl: IDX, plan: { q: 'SELECT end_station, COUNT(*) FROM bk_trips GROUP BY end_station', not: 'TEMP B-TREE', must: 'USING (COVERING )?INDEX', msg: 'Planda hâlâ TEMP B-TREE var. İndeks gruplanan sütunla başlamalı.' },
      ynl: ['CREATE INDEX ix_y ON bk_trips (start_station);', 'CREATE INDEX ix_y ON bk_trips (bike_id, end_station);'] }),
  sq("Pano her kullanıcının yolculuklarını zamana göre numaralıyor: <code>SELECT trip_id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY started_at) AS sira FROM bk_trips</code>. Planda <code>TEMP B-TREE</code> kalmaması için indeksi oluştur (adı serbest).",
    'CREATE INDEX ix_kullanici_zaman ON bk_trips (user_id, started_at);',
    'Sıra önce <code>PARTITION BY</code>, sonra <code>ORDER BY</code> sütunu.',
    { nr: 1, dl: IDX, plan: { q: 'SELECT trip_id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY started_at) AS sira FROM bk_trips', not: 'TEMP B-TREE', msg: 'Planda hâlâ TEMP B-TREE var. Mevcut user_id indeksi tek başına yetmiyor; pencerenin sırasını veren indeks gerekli.' },
      ynl: ['CREATE INDEX ix_y ON bk_trips (started_at, user_id);', 'CREATE INDEX ix_y ON bk_trips (started_at);'] }),
  sq("Her hesabın son işlem zamanını ilişkili alt sorgu ile bulan rapor: <code>SELECT a.account_id, (SELECT MAX(t.txn_time) FROM bank_txns t WHERE t.account_id = a.account_id) AS son FROM bank_accounts a</code>. Alt sorgusuz, aynı sonucu ver. Hiç işlemi olmayan hesap da kalmalı.",
    'SELECT a.account_id, m.son FROM bank_accounts a LEFT JOIN (SELECT account_id, MAX(txn_time) AS son FROM bank_txns GROUP BY account_id) m ON m.account_id = a.account_id;',
    'İşlemleri hesap başına topla, sonra hesaplara <code>LEFT JOIN</code>.',
    { plan: { not: 'CORRELATED', msg: 'Plan hâlâ CORRELATED gösteriyor.' },
      ynl: ['SELECT a.account_id, (SELECT MAX(t.txn_time) FROM bank_txns t WHERE t.account_id = a.account_id) AS son FROM bank_accounts a;', 'SELECT a.account_id, MAX(t.txn_time) AS son FROM bank_accounts a JOIN bank_txns t ON t.account_id = a.account_id GROUP BY a.account_id;'] }),
  sq("Fan-out tuzağı: her müşterinin hesap sayısı ve işlem sayısı isteniyor. Şu sorgu hesap sayısını şişiriyor: <code>SELECT a.customer_id, COUNT(a.account_id) AS hesap, COUNT(t.txn_id) AS islem FROM bank_accounts a LEFT JOIN bank_txns t ON t.account_id = a.account_id GROUP BY a.customer_id</code>. Önce toplayarak doğru sonucu ver: <code>customer_id</code>, <code>hesap</code>, <code>islem</code>.",
    'SELECT a.customer_id, COUNT(*) AS hesap, COALESCE(SUM(t.islem), 0) AS islem FROM bank_accounts a LEFT JOIN (SELECT account_id, COUNT(*) AS islem FROM bank_txns GROUP BY account_id) t ON t.account_id = a.account_id GROUP BY a.customer_id;',
    'İşlemleri önce hesap başına say, sonra hesap düzeyinde topla.',
    { ynl: ['SELECT a.customer_id, COUNT(a.account_id) AS hesap, COUNT(t.txn_id) AS islem FROM bank_accounts a LEFT JOIN bank_txns t ON t.account_id = a.account_id GROUP BY a.customer_id;', 'SELECT a.customer_id, COUNT(a.account_id) AS hesap, SUM(t.islem) AS islem FROM bank_accounts a JOIN (SELECT account_id, COUNT(*) AS islem FROM bank_txns GROUP BY account_id) t ON t.account_id = a.account_id GROUP BY a.customer_id;'] }),
  sq("Pano için özet tablo kur: <code>ozet_gun</code> tablosu gün (<code>gun</code>, YYYY-AA-GG) ve başlangıç istasyonu (<code>start_station</code>) başına yolculuk sayısını (<code>yolculuk</code>) tutsun. Ardından özet tablonun toplamı ham tabloyla tutuyor mu diye tek satırda getir: <code>ozet</code>, <code>ham</code>.",
    "CREATE TABLE ozet_gun AS SELECT date(started_at) AS gun, start_station, COUNT(*) AS yolculuk FROM bk_trips GROUP BY date(started_at), start_station; SELECT (SELECT SUM(yolculuk) FROM ozet_gun) AS ozet, (SELECT COUNT(*) FROM bk_trips) AS ham;",
    'Özet tablo kurmak yetmez, ham veriyle mutabakat yap.',
    Object.assign({ must: [{ re: '\\bozet_gun\\b', msg: 'Sonuç özet tablodan da okunmalı.' }],
      ynl: ["SELECT COUNT(*) AS ozet, COUNT(*) AS ham FROM bk_trips;", "CREATE TABLE ozet_gun AS SELECT date(started_at) AS gun, start_station, COUNT(*) AS yolculuk FROM bk_trips WHERE started_at >= '2024-07-01' GROUP BY date(started_at), start_station; SELECT (SELECT SUM(yolculuk) FROM ozet_gun) AS ozet, (SELECT COUNT(*) FROM bk_trips) AS ham;"] }, SQLITE)),
  mc('Bu dersteki PostgreSQL ölçümünde "önce topla" yazımı ' + B('pg-once-topla') + ', "önce birleştir" yazımı ' + B('pg-once-birlestir') + ' sayfa okudu. Ne dersin?', ['Önce toplamak hiçbir zaman işe yaramaz', 'Bu veride ve motorda hız farkı yok; önce toplamanın değeri burada çoğalmayı önlemesi. Başka motorda ölçülür', 'Bu kadar küçük fark önce birleştirmeyi kesin üstün kılar', 'Ölçüm yanlış, önce toplama her zaman kazanır'], 1, 'Genel kurallar ölçümle sınanır. İyileştirici iki yazımı da iyi çözebilir. Önce toplamak yine de fan-out hatasına karşı güvenlidir.'),
  mc('Tek hesabın son 20 hareketi için hangisi genellikle daha ucuz olur?', ['Tüm tabloda <code>ROW_NUMBER() OVER (PARTITION BY account_id ORDER BY txn_time DESC)</code> hesaplayıp 20\'ye süzmek', '<code>WHERE account_id = ? ORDER BY txn_time DESC LIMIT 20</code> ve <code>(account_id, txn_time)</code> indeksi', 'Hesabın tüm hareketlerini uygulamaya çekip orada sıralamak', 'Pencere fonksiyonunu CTE içine almak'], 1, 'İndeks istenen bölgeye gider ve 20 satırda durur. Pencere yaklaşımı süzmeden önce çok daha fazla satırı numaralar.'),
  mc('Ağır bir özet sorgusu günde 500 kez çalışıyor, veri günde bir kez yükleniyor. En mantıklı seçenek hangisi?', ['Her çalıştırmada sıfırdan hesaplamaya devam etmek', 'Yükleme sonrası yenilenen özet tablo ya da materialized view kullanmak', 'Sorguya DISTINCT eklemek', 'Sunucudaki tüm indeksleri silmek'], 1, 'Veri günde bir değişiyorsa hesabı bir kez yapıp saklamak büyük iş tasarrufudur. Tazelik gereksinimi burada sorun çıkarmıyor.')
]);

/* ------------------------------------------------------------------ 8. SQL türüne özgü */
lesson('opt-turler', 'C1', 'SQL türüne özgü optimizasyon: parametre koklama, EXPLAIN ANALYZE, bayt maliyeti',
  'SQL Server parameter sniffing ve Query Store, PostgreSQL ANALYZE ve BUFFERS, MySQL EXPLAIN ANALYZE, Oracle DISPLAY_CURSOR, BigQuery dry run ve bayt maliyeti.',
  'parameter sniffing query store explain analyze buffers dbms_xplan display_cursor bigquery dry run bytes processed',
`<h2>Bu dersin sınırı</h2>
<p>Bu uygulamanın motoru SQLite. SQL Server, MySQL, Oracle ve BigQuery yazımları taklit edilir ama planları üretilemez. Aşağıdaki bilgiler bu ürünlerin resmî belgelerine dayanır, burada çalıştırılmamıştır. Bu yüzden o ürünler için plan çıktısı örneği yazmıyoruz. PostgreSQL çıktıları gerçek motordan (PGlite) gelir.</p>
<h2>SQL Server: parametre koklama (parameter sniffing)</h2>
<p>Belge bunu şöyle tanımlar: motor derleme sırasında parametrenin o anki değerine bakar ve iyileştiriciye verir. Saklı yordamın planı ilk çalıştırmada derlenir ve önbellekte kaldığı sürece yeniden kullanılır. Aynı plan başka değerler için kötü olabilir.</p>
<p>Senaryo: Ilgaz Bank'ta bir şube diğerlerinden çok büyük. Şube başına müşteri sayısına bak:</p>
${box(`SELECT branch_id, COUNT(*) AS musteri
FROM bank_customers
GROUP BY branch_id
ORDER BY musteri DESC;`)}
<p>Yordam önce küçük şubeyle çağrılırsa plan az satıra göre kurulur. Sonra büyük şube aynı planı kullanır ve yavaşlar. Tersi de olabilir. "Dün hızlıydı, bugün yavaş, kod değişmedi" denince akla gelecek ilk sebeplerden biridir.</p>
${nor(`CREATE OR ALTER PROCEDURE dbo.usp_sube_hareket @sube INT
AS
SELECT c.customer_id, COUNT(*) AS islem
FROM dbo.bank_customers c
JOIN dbo.bank_accounts a ON a.customer_id = c.customer_id
JOIN dbo.bank_txns t ON t.account_id = a.account_id
WHERE c.branch_id = @sube
GROUP BY c.customer_id;`)}
<table>
<tr><th>Çözüm</th><th>Ne yapar</th><th>Bedeli</th></tr>
<tr><td><code>OPTION (RECOMPILE)</code></td><td>Her çalıştırmada o anki değere göre yeni, geçici plan kurar</td><td>Derleme maliyeti. Belge, yük üzerindeki etkisini değerlendirmeden kullanmamayı önerir</td></tr>
<tr><td><code>OPTIMIZE FOR (@p = değer)</code></td><td>Plan belirtilen değere göre kurulur</td><td>Veri değişirse değer eskir</td></tr>
<tr><td><code>OPTIMIZE FOR UNKNOWN</code></td><td>Ortalama seçicilikle plan kurar</td><td>Hiçbir değer için en iyi olmayabilir</td></tr>
<tr><td>Yerel değişken</td><td>Değer koklanmaz, ortalama yoğunluktan tahmin edilir</td><td>Etkisi <code>OPTIMIZE FOR UNKNOWN</code> ile benzer, niyeti kodda gizli kalır</td></tr>
<tr><td>Parameter Sensitive Plan (SQL Server 2022)</td><td>Aynı ifade için birden çok önbellekli plan tutar</td><td>Sürüm ve uyumluluk düzeyi ister</td></tr>
<tr><td>Query Store</td><td>Plan geçmişini saklar, gerileyeni gösterir, plan zorlamaya izin verir</td><td>SQL Server 2022'de yeni veritabanlarında varsayılan olarak açıktır</td></tr>
</table>
<p>Belge sorgu ipuçlarını (hint) deneyimli geliştirici ve yöneticiler için son çare olarak önerir. Önce indeks ve yazımı düzelt.</p>
<h3>Mantıksal okuma</h3>
${nor(`SET STATISTICS IO, TIME ON;
SELECT COUNT(*) FROM dbo.orders WHERE order_date >= '2024-01-01';`)}
<p>Mesajlar sekmesinde her tablo için okuma sayıları gelir. Değişikliğin etkisini <code>logical reads</code> ile karşılaştır. Süre sunucu yüküne göre oynar.</p>
<h2>PostgreSQL</h2>
${PGNOT}
<ul>
<li><code>EXPLAIN</code> yalnız planı gösterir. <code>EXPLAIN ANALYZE</code> sorguyu çalıştırır ve gerçek satırları ekler. Değişiklik yapan sorguda <code>BEGIN ... ROLLBACK</code> kullan.</li>
<li><code>BUFFERS</code> okunan sayfaları gösterir. Sayılar birikimlidir: üst düğüm altındakileri içerir. PostgreSQL 18 belgesine göre <code>ANALYZE</code> bunu kendiliğinden açar. Eski sürümlerde açıkça yaz.</li>
<li>Toplu yüklemeden sonra <code>ANALYZE</code> çalıştır.</li>
</ul>
<p>Tek hesabın hareketleri, <code>bank_txns</code> üzerinde hazır indeksle:</p>
${PG('pg-nested')}
<h2>MySQL</h2>
<p><code>EXPLAIN ANALYZE</code> 8.0.18'den beri vardır ve sorguyu gerçekten çalıştırır. Çıktı ağaç biçimindedir ve her düğümde tahmini maliyet, tahmini satır, gerçek süre, gerçek satır ve döngü sayısı yazar. Düz <code>EXPLAIN</code> tablosunda <code>type</code> sütununa bak: <code>ALL</code> tam taramadır. Tahmin ve gerçek çok ayrışıyorsa belge <code>ANALYZE TABLE</code> önerir.</p>
<h2>Oracle</h2>
<p><code>EXPLAIN PLAN</code> sorguyu çalıştırmaz, seçilecek planı tahmin eder. Belge bu planın gerçek yürütmedekinden farklı olabileceğini söyler. Gerçekte kullanılan planı <code>DBMS_XPLAN.DISPLAY_CURSOR</code> gösterir. Çalışma zamanı istatistikleri varsa <code>E-Rows</code> ve <code>A-Rows</code> sütunlarını karşılaştır.</p>
${nor(`EXPLAIN PLAN FOR SELECT * FROM orders WHERE customer_id = 42;
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY);

SELECT /*+ GATHER_PLAN_STATISTICS */ * FROM orders WHERE customer_id = 42;
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY_CURSOR(format => 'ALLSTATS LAST'));`)}
<h2>BigQuery: süre değil bayt</h2>
<p>İsteğe bağlı fiyatlandırmada okunan bayt faturayı belirler. Klasik indeks yerine bölümleme ve kümeleme vardır. Belgelerde şunlar yazar:</p>
<ul>
<li><b>Kuru çalıştırma (dry run)</b> sorguyu çalıştırmadan işlenecek baytı söyler.</li>
<li>Kümelenmemiş tabloda <code>LIMIT</code> okunan baytı azaltmaz. Kümelenmiş tabloda azaltabilir.</li>
<li><code>SELECT *</code> yerine gereken sütunları seç. <code>SELECT * EXCEPT</code> istemediğin sütunları düşürür.</li>
<li><b>Maximum bytes billed</b> ayarı tahmin sınırı aşarsa sorguyu ücret almadan başarısız yapar.</li>
<li>Bölüm eleme için bölüm sütununu sabit ifadeyle süz. Alt sorgu sonucuyla karşılaştırmak ve <code>OR</code> ile başka sütuna bağlamak eleme yapmaz. Bölüm filtresini zorunlu kılan ayar da vardır.</li>
</ul>
${nor(`-- Kuru çalıştırma: sorgu çalışmaz, işlenecek bayt yazılır
bq query --use_legacy_sql=false --dry_run \\
  'SELECT user_id FROM analytics.events WHERE event_date = "2024-12-01"'`)}
<h2>Karşılaştırma</h2>
<table>
<tr><th>Soru</th><th>SQL Server</th><th>PostgreSQL</th><th>BigQuery</th></tr>
<tr><td>İş ölçüsü</td><td>Mantıksal okuma</td><td>Buffers</td><td>İşlenen bayt, slot süresi</td></tr>
<tr><td>Temel araç</td><td>İndeks, istatistik</td><td>İndeks, istatistik</td><td>Bölüm, kümeleme, sütun seçimi</td></tr>
<tr><td>Plan geçmişi</td><td>Query Store</td><td><code>pg_stat_statements</code> eklentisi (sorgu istatistikleri)</td><td><code>INFORMATION_SCHEMA.JOBS</code></td></tr>
</table>`,
[
  sq('Parametre koklama riskini veride gör: müşteri sayısına göre en büyük şube ile en küçük şube arasındaki oranı (1 basamak) getir: <code>en_buyuk</code>, <code>en_kucuk</code>, <code>oran</code>.',
    'SELECT MAX(musteri) AS en_buyuk, MIN(musteri) AS en_kucuk, ROUND(1.0 * MAX(musteri) / MIN(musteri), 1) AS oran FROM (SELECT branch_id, COUNT(*) AS musteri FROM bank_customers GROUP BY branch_id) t;',
    'Önce şube başına say, sonra <code>MAX</code> ve <code>MIN</code>. Tam sayı bölmesine dikkat.',
    { ynl: ['SELECT MAX(musteri) AS en_buyuk, MIN(musteri) AS en_kucuk, ROUND(MAX(musteri) / MIN(musteri), 1) AS oran FROM (SELECT branch_id, COUNT(*) AS musteri FROM bank_customers GROUP BY branch_id) t;', 'SELECT COUNT(*) AS en_buyuk, COUNT(*) AS en_kucuk, 1.0 AS oran FROM bank_customers;'] }),
  sq('SQL Server: Şube raporunu yordam olarak yaz ve her çağrıda o anki değere göre plan kurulmasını sağla. <code>dbo.usp_sube_musteri</code>, parametre <code>@sube INT</code>; şubedeki müşteri sayısını döndürsün (<code>musteri</code>) ve sorgu sonunda <code>OPTION (RECOMPILE)</code> olsun. Sonra <code>GO</code> ile ayırıp 12. şube için çağır.',
    "CREATE OR ALTER PROCEDURE dbo.usp_sube_musteri @sube INT AS\nBEGIN\n  SET NOCOUNT ON;\n  SELECT COUNT(*) AS musteri FROM bank_customers WHERE branch_id = @sube OPTION (RECOMPILE);\nEND;\nGO\nEXEC dbo.usp_sube_musteri @sube = 12;",
    'İpucu sorgunun en sonuna yazılır: <code>OPTION (RECOMPILE)</code>.',
    { base: 'tsql', dl: ['tsql'], must: [{ re: 'OPTION\\s*\\(\\s*RECOMPILE\\s*\\)', msg: 'Sorgunun sonunda OPTION (RECOMPILE) olmalı.' }, { re: '\\bPROCEDURE\\b|\\bPROC\\b', msg: 'Görev yordam yazmanı istiyor.' }],
      ynl: ["CREATE OR ALTER PROCEDURE dbo.usp_sube_musteri @sube INT AS\nBEGIN\n  SELECT COUNT(*) AS musteri FROM bank_customers WHERE branch_id = @sube;\nEND;\nGO\nEXEC dbo.usp_sube_musteri @sube = 12;", 'SELECT COUNT(*) AS musteri FROM bank_customers WHERE branch_id = 12 OPTION (RECOMPILE);'] }),
  sq('BigQuery: Rapor her çalıştığında bütün sütunları okuyor: <code>SELECT * FROM bank_txns WHERE txn_time &gt;= \'2024-12-01\'</code>. Fatura için yalnız gereken sütunları oku: <code>txn_id</code>, <code>amount</code> ve aynı filtre.',
    "SELECT txn_id, amount FROM bank_txns WHERE txn_time >= '2024-12-01';",
    'Sütun tabanlı depoda okunan sütun kadar ödersin.',
    { base: 'bq', dl: ['bq'], mustNot: [{ re: 'SELECT\\s+\\*', msg: 'SELECT * kullanma, yalnız gereken sütunları seç.' }],
      ynl: ["SELECT * FROM bank_txns WHERE txn_time >= '2024-12-01';", "SELECT txn_id, amount FROM bank_txns;"] }),
  mc('Yordam dün hızlıydı, bugün yavaş; kod ve veri çok değişmedi. Plan önbelleği dün gece temizlenmiş ve ilk çağrı küçük bir şube ile gelmiş. En olası neden?', ['Parametre koklama: plan küçük şubeye göre kuruldu ve büyük şube için de kullanılıyor', 'Bellek arızası', 'Tablo tipinin değişmesi', 'Birincil anahtarın silinmesi'], 0, 'Klasik parametre koklama belirtisidir. Query Store ile plan değişimi görülür.'),
  mc('Saniyede yüzlerce kez çalışan kısa bir sorguya <code>OPTION (RECOMPILE)</code> eklemek için en önemli itiraz hangisi?', ['Sorgu sonucu değişir', 'Her çalıştırmada derleme maliyeti ödenir; belge yük üzerindeki etkisini değerlendirmeden kullanmamayı önerir', 'RECOMPILE yalnız INSERT için geçerlidir', 'Sorgu kilit alamaz'], 1, 'RECOMPILE seyrek ve değişken sorgular için makuldür. Sık çalışan kısa sorguda derleme maliyeti kazancı geçer.'),
  mc('PostgreSQL\'de <code>EXPLAIN ANALYZE DELETE FROM olaylar WHERE ...</code> çalıştırdın. Ne olur?', ['Yalnız plan gösterilir, satır silinmez', 'Satırlar gerçekten silinir; denemek için BEGIN ve ROLLBACK arasına almalısın', 'PostgreSQL DELETE için ANALYZE kabul etmez, hata verir', 'Yalnız 1 satır silinir'], 1, 'EXPLAIN ANALYZE sorguyu gerçekten yürütür. Belgedeki öneri işlemi geri almaktır.'),
  mc('Oracle\'da <code>EXPLAIN PLAN</code> hızlı bir plan gösteriyor ama sorgu yavaş. Gerçekte kullanılan planı nereden görürsün?', ['PLAN_TABLE tablosundan', 'DBMS_XPLAN.DISPLAY_CURSOR ile imleç önbelleğinden', 'ALL_TABLES görünümünden', 'Aynı EXPLAIN PLAN komutunu tekrar çalıştırarak'], 1, 'EXPLAIN PLAN tahmindir. Gerçek plan imleç önbelleğindedir. ALLSTATS LAST ile tahmini ve gerçek satırları karşılaştırırsın.'),
  mc('BigQuery\'de tarihe göre bölümlenmiş tabloda hangi filtre bölüm eleme yapar?', ["<code>WHERE event_date = '2024-12-01'</code>", '<code>WHERE event_date = (SELECT MAX(d) FROM takvim)</code>', "<code>WHERE event_date = '2024-12-01' OR user_id = 42</code>", '<code>WHERE event_date &gt;= ts2</code> (başka bir sütun)'], 0, 'Belge: alt sorgu sonucu ya da başka sütunla karşılaştırma eleme yapmaz, bölüm koşulunu OR ile başka sütuna bağlamak da yapmaz. Sabit ifadeyle süz.')
]);

/* ------------------------------------------------------------------ 9. Yanlış optimizasyon */
lesson('opt-yanlis', 'C1', 'Yanlış optimizasyon: hızlı görünen ama işe yaramayan ya da sonucu bozan değişiklikler',
  'Sonucu değiştiren yeniden yazımlar, efsaneler (COUNT(1), EXISTS), NOLOCK, her sütuna indeks, ipucu kullanımı, ölçmeden karar.',
  'anti pattern nolock count(1) myth over indexing hint premature optimization',
`<h2>En tehlikeli optimizasyon sonucu değiştirendir</h2>
<p>Yavaş rapor can sıkar, yanlış rapor kararı bozar. Aşağıdakilerin hepsi gerçek işlerde sık görülür. Önce sonucu bozanlara, sonra işe yaramayanlara bakalım.</p>
<h2>Sonucu bozan "hızlandırmalar"</h2>
<table>
<tr><th>Değişiklik</th><th>Neden yapılır</th><th>Ne bozulur</th></tr>
<tr><td><code>UNION</code> yerine <code>UNION ALL</code></td><td>Tekilleştirme adımı kalksın</td><td>İki kolda da çıkan satır iki kez sayılır</td></tr>
<tr><td><code>OR</code> yerine iki kollu <code>UNION ALL</code></td><td>Her kol kendi indeksini kullansın</td><td>Aynı sebeple çoğalma</td></tr>
<tr><td><code>LEFT JOIN</code> yerine <code>JOIN</code></td><td>Daha hızlı plan</td><td>Eşleşmeyen satırlar kaybolur</td></tr>
<tr><td><code>COUNT(DISTINCT x)</code> yerine <code>COUNT(x)</code></td><td>Tekilleştirme pahalı</td><td>Çoğalan satırlar sayılır</td></tr>
<tr><td><code>BETWEEN</code> ile tarih aralığı</td><td>Kısa yazım</td><td>Son günün saatli kayıtları düşer</td></tr>
<tr><td><code>NOT IN</code> ile <code>NOT EXISTS</code> arasında geçiş</td><td>"Biri daha hızlı"</td><td>Alt sorguda NULL varsa sonuç değişir</td></tr>
<tr><td><code>WITH (NOLOCK)</code></td><td>Kilit beklemesin</td><td>Kirli okuma: geri alınacak değişiklikler okunur, satır atlanabilir ya da iki kez okunabilir</td></tr>
</table>
<p>Son satır için not: SQL Server'da <code>NOLOCK</code>, <code>READUNCOMMITTED</code> demektir. Kilit beklemesi sorununu hız sorunu sanıp bir finansal raporun sonucunu riske atma. Çoğu zaman satır sürümlemeye dayalı okuma (<code>READ COMMITTED SNAPSHOT</code>) daha doğru yoldur.</p>
<h2>İşe yaramayanlar: efsaneler</h2>
<h3>"COUNT(1), COUNT(*)'tan hızlıdır"</h3>
<p>Aynı tablodaki iki plan aşağıda. Aynı işlem, aynı sayfa sayısı.</p>
${PGNOT}
${PG('pg-count-yildiz')}
${PG('pg-count-bir')}
<h3>"İndeks her zaman hızlandırır"</h3>
<p>Seçiciliği düşük koşulda indeks yararsız kalabilir. Bu veride yaygın bir değerle yapılan okuma, <code>Bitmap Heap Scan</code> kullansa da tablonun tamamından çok sayfa okudu:</p>
${PGS('pg-secici-yaygin')}
<h3>"Her sütuna indeks ekleyelim"</h3>
<p>Her indeks her yazmaya biner, çakışan indeksler boşa yer kaplar. SQL Server belgesi "iyileştiriciye seçenek olsun" diye çok sayıda indeks oluşturmaya karşı uyarır: veri değişikliğini yavaşlatır, eşzamanlılık sorunu çıkarabilir.</p>
<h3>"Sorguya ipucu yazarım, motor doğru planı bulur"</h3>
<p>İpucu bugünkü veriye göre kilitler. Veri büyüyünce doğru plan değişir, ipucu kalır. SQL Server belgesi ipuçlarını son çare sayar. PostgreSQL'de ise standart bir sorgu ipucu sözdizimi yoktur.</p>
<h3>"LIMIT ekledim, fatura düştü"</h3>
<p>BigQuery belgesine göre kümelenmemiş tabloda düşmez. Sıralı sorguda da <code>LIMIT</code> her zaman işi azaltmaz: tüm satırlar sıralanmak zorunda kalabilir.</p>
<h3>"CTE'ye alınca hızlandı"</h3>
<p>Yazım değiştirmek işi azaltmaz. Motor CTE'yi gömüyorsa plan aynı kalır, saklıyorsa kötüleşebilir. Ölç.</p>
<h2>Ölçme hataları</h2>
<ul>
<li>İkinci çalıştırmayı "iyileşme" sanmak: önbellek.</li>
<li>Küçük test verisinde ölçüp üretime genellemek: plan satır sayısına göre değişir.</li>
<li>Yalnız ortalamaya bakmak: yavaş olan uçtaki değerlerdir (çarpık veri).</li>
<li>Yazma tarafını ölçmemek: okuma hızlanır, gece yüklemesi uzar.</li>
<li>Sonucu karşılaştırmamak.</li>
</ul>
<div class="tip"><b>Kontrol sorusu</b>"Bu değişiklikten sonra sonuç aynı mı, hangi sayı düştü, karşılığında ne ödedim?" Bu üçünü söyleyemiyorsan optimizasyon bitmedi.</div>`,
[
  sq("Birisi OR sorgusunu 'indeks kullansın' diye ikiye böldü ve sayı arttı: <code>SELECT COUNT(*) AS adet FROM (SELECT txn_id FROM bank_txns WHERE channel = 'pos' UNION ALL SELECT txn_id FROM bank_txns WHERE merchant_category = 'market') t</code>. Doğru sayı OR ile aynıdır. Bölünmüş yapıyı koru, çoğalmayı düzelt.",
    "SELECT COUNT(*) AS adet FROM (SELECT txn_id FROM bank_txns WHERE channel = 'pos' UNION SELECT txn_id FROM bank_txns WHERE merchant_category = 'market') t;",
    'İki kolda da çıkan işlem bir kez sayılmalı. Satırı tekilleştiren küme işlemi hangisi?',
    { must: [{ re: '\\bUNION\\b', msg: 'Görev iki kollu yapıyı korumanı istiyor.' }],
      ynl: ["SELECT COUNT(*) AS adet FROM (SELECT txn_id FROM bank_txns WHERE channel = 'pos' UNION ALL SELECT txn_id FROM bank_txns WHERE merchant_category = 'market') t;", "SELECT COUNT(*) AS adet FROM bank_txns WHERE channel = 'pos' OR merchant_category = 'market';"] }),
  sq("Birisi müşteri raporunu <code>LEFT JOIN</code> yerine <code>JOIN</code> yaparak 'hızlandırdı'. Kaç müşteri rapordan düştü? Hesabı hiç olmayan müşteri olabileceğini de düşünerek <code>bank_customers</code> ve <code>bank_txns</code> üzerinden işlemi hiç olmayan müşteri sayısını getir: <code>kayip</code>.",
    'SELECT COUNT(*) AS kayip FROM bank_customers c WHERE NOT EXISTS (SELECT 1 FROM bank_accounts a JOIN bank_txns t ON t.account_id = a.account_id WHERE a.customer_id = c.customer_id);',
    'Hesap ve işlem tablosunu birlikte düşün. <code>NOT EXISTS</code> ya da <code>LEFT JOIN ... IS NULL</code>.',
    { ynl: ['SELECT COUNT(*) AS kayip FROM bank_customers c WHERE NOT EXISTS (SELECT 1 FROM bank_accounts a WHERE a.customer_id = c.customer_id);', 'SELECT COUNT(*) AS kayip FROM bank_customers;'] }),
  sq("Birisi 'DISTINCT pahalı' deyip şunu yazdı: <code>SELECT COUNT(o.customer_id) AS musteri FROM lk_orders o WHERE o.status = 'teslim'</code>. Soru teslim alınmış siparişi olan müşteri sayısıydı. Doğrusunu yaz.",
    "SELECT COUNT(DISTINCT o.customer_id) AS musteri FROM lk_orders o WHERE o.status = 'teslim';",
    'Bir müşterinin birden çok siparişi vardır.',
    { ynl: ["SELECT COUNT(o.customer_id) AS musteri FROM lk_orders o WHERE o.status = 'teslim';", 'SELECT COUNT(DISTINCT o.customer_id) AS musteri FROM lk_orders o;'] }),
  sq("Aralık raporunu 'kısaltan' biri son günü kaybetti: <code>SELECT COUNT(*) AS adet FROM bank_txns WHERE txn_time BETWEEN '2024-12-01' AND '2024-12-31'</code>. Aralık 2024'ün tamamını arama yapabilen biçimde say (<code>txn_time</code> indeksi hazır).",
    "SELECT COUNT(*) AS adet FROM bank_txns WHERE txn_time >= '2024-12-01' AND txn_time < '2025-01-01';",
    "Üst sınırı sonraki ayın ilk günü olarak, hariç biçimde yaz.",
    { plan: { setup: 'CREATE INDEX IF NOT EXISTS ix_gizli_tt ON bank_txns (txn_time)', must: 'SEARCH bank_txns', msg: 'Plan arama yapmıyor. Sütunu fonksiyona sokma.' },
      ynl: ["SELECT COUNT(*) AS adet FROM bank_txns WHERE txn_time BETWEEN '2024-12-01' AND '2024-12-31';", "SELECT COUNT(*) AS adet FROM bank_txns WHERE strftime('%Y-%m', txn_time) = '2024-12';", "SELECT COUNT(*) AS adet FROM bank_txns WHERE txn_time >= '2024-12-01' AND txn_time < '2024-12-31';"] }),
  mc('Muhasebe raporu kilitlere takılıyor. Biri her tabloya <code>WITH (NOLOCK)</code> eklemeyi öneriyor. Doğru itiraz hangisi?', ['NOLOCK sözdizimi eskidir, yalnız görünüm sorunudur', 'Kirli okumaya izin verir; geri alınan veri okunabilir, satır atlanabilir. Finansal raporda kabul edilemez, önce engelleyen sorguyu ve satır sürümlemeyi incele', 'NOLOCK sorguyu her zaman yavaşlatır', 'NOLOCK yalnız INSERT için geçerlidir'], 1, 'Sorun hız değil kilit beklemesidir. NOLOCK tutarlılıktan ödün verir. Doğru çözüm uzun işlemleri kısaltmak, indekslemek ya da READ COMMITTED SNAPSHOT değerlendirmektir.'),
  mc('Bu derste aynı tabloda <code>COUNT(*)</code> ve <code>COUNT(1)</code> planları birebir aynı çıktı. Ne söyleyebilirsin?', ['COUNT(1) yazmak bu motorda kazanç sağlamıyor; okunabilir olanı seç', 'COUNT(1) her motorda iki kat hızlıdır', 'COUNT(*) NULL satırları saymaz', 'Plan aynıysa ölçüm hatalıdır'], 0, 'İkisi de satır sayar. COUNT(sütun) ise NULL olmayanları sayar, o ayrı bir anlamdır.'),
  mc('Test ortamında 1.000 satırla ölçtün: indeks kazandırmadı, sen de eklemedin. Üretimde 50 milyon satır var. Değerlendirmen?', ['Ölçüm yeterli, üretimde de aynı sonuç çıkar', 'Plan satır sayısına göre değişir; ölçüm üretime benzeyen veri hacmiyle tekrarlanmalı', 'Küçük tablo daha güvenilirdir, çünkü hata payı düşüktür', 'Hacim planı etkilemez, yalnız süreyi etkiler'], 1, 'Küçük tabloda tam tarama zaten ucuzdur. Karar, üretim hacmi ve dağılımına yakın veriyle verilir.'),
  mc('Sorgu 40 saniyeden 2 saniyeye indi, ama gecelik yükleme 20 dakikadan 2 saate çıktı. Hangisi doğru?', ['Sorun yok, sorgu hızlandı', 'Değişiklik bedelsiz değil; sorgunun sıklığı ve gece penceresi birlikte değerlendirilir, gerekirse indeks sadeleştirilir ya da yükleme öncesi kapatılır', 'Gece yüklemesi önemli değildir', 'Tabloyu silip yeniden kurmak gerekir'], 1, 'Optimizasyon toplam işi hesaba katar. Okuma kazancı ile yazma bedeli birlikte tartılır.')
]);

/* ------------------------------------------------------------------ Mülakat */
lesson('mk-opt', 'C1', 'Mülakat: yavaş sorgu ve performans soruları',
  'Mülakatta yavaş sorgu sorusuna yapılı yanıt, sık sorulan kısa sorular, planı yorumlama ve yeniden yazma görevleri.',
  'interview slow query performance tuning',
`<h2>Sorunun amacı</h2>
<p>"Bu sorgu yavaş, ne yaparsın?" sorusu ezber ölçmez. Mülakatı yapan kişi yönteme bakar: Önce soru mu soruyorsun, ölçüyor musun, kararın bedelini biliyor musun?</p>
<h2>Yanıt iskeleti</h2>
<ol>
<li><b>Netleştir:</b> "Ne kadar yavaş, hedef ne, ne sıklıkla çalışıyor, tablo kaç satır, okuma ağırlıklı mı?"</li>
<li><b>Ölç:</b> "Planı alır, temel ölçümü yazarım: süre ve okunan sayfa."</li>
<li><b>Darboğazı bul:</b> "Büyük tablo taranıyor mu, tahmin ile gerçek ayrışıyor mu, geçici sıralama var mı, alt sorgu her satırda mı çalışıyor?"</li>
<li><b>Yazımı düzelt:</b> "Sütunu fonksiyondan çıkarır, gereksiz DISTINCT ve SELECT * kaldırırım."</li>
<li><b>İndeksi tasarla:</b> "Eşitlik, aralık, sıralama, sonra kapsama."</li>
<li><b>Doğrula:</b> "Sonuç aynı mı, sayı düştü mü, yazma bedeli ne?"</li>
</ol>
<h2>Sık sorulan kısa sorular</h2>
<table>
<tr><th>Soru</th><th>Kısa yanıt</th></tr>
<tr><td>Clustered ve nonclustered farkı</td><td>Clustered satırların kendisini anahtar sırasında tutar, tabloda tek olur. Nonclustered ayrı yapıdır ve satıra işaret eder.</td></tr>
<tr><td>Kapsayan indeks</td><td>Sorgunun bütün sütunları indekste, tabloya gidilmez.</td></tr>
<tr><td>Sargable</td><td>İndeks aramasına uygun koşul. Sütun yalın kalır.</td></tr>
<tr><td>Index Scan ve Index Seek</td><td>Seek ilgili bölgeye gider, Scan indeksin tamamını okur.</td></tr>
<tr><td>Key Lookup neden pahalı</td><td>Bulunan her satır için tabloya ayrı gidilir. Çok satırda büyür.</td></tr>
<tr><td>Hash ve Nested Loop</td><td>Hash büyük sırasız girdiler için, Nested Loop az dış satır ve indeksli iç taraf için.</td></tr>
<tr><td>OFFSET neden yavaşlar</td><td>Atlanan satırlar yine hesaplanır. Keyset son anahtardan devam eder.</td></tr>
<tr><td>Parametre koklama</td><td>Plan ilk değere göre kurulup diğer değerlere de uygulanır.</td></tr>
<tr><td>Bölüm eleme</td><td>Bölüm sütunu süzülünce ilgisiz bölümler okunmaz.</td></tr>
<tr><td>Tahmin ve gerçek farkı</td><td>Bayat istatistik, fonksiyonlu koşul ya da çarpık veri belirtisi.</td></tr>
</table>
<h2>Tuzaklar</h2>
<ul>
<li>"EXISTS her zaman hızlıdır" deme. "Çoğu motor ikisini aynı plana çevirir, ölçerim" de.</li>
<li>"Her sütuna indeks" deme. Yazma bedelini anlat.</li>
<li>"NOLOCK eklerim" deme. Kirli okumayı anlat.</li>
<li>Sonucun aynı kaldığını doğrulamayı unutma. Bu cümle seni çoğu adaydan ayırır.</li>
</ul>
<p>Motor burada SQLite olduğundan görevlerin planları SQLite planıdır. Mülakatta hangi motor sorulursa onun adlarıyla konuş.</p>`,
[
  mc('Mülakatçı "şu sorgu yavaş" dedi ve sorguyu tahtaya yazdı. En iyi ilk cümle hangisi?', ['"Sütunlara indeks eklerim."', '"Ne kadar yavaş, ne sıklıkla çalışıyor ve tablo ne kadar büyük? Sonra planına bakarım."', '"Sunucu belleğini artırırım."', '"Sorguyu saklı yordama çeviririm."'], 1, 'Önce sorunu ve ölçümü netleştirmek yöntemi gösterir. Çözüm ondan sonra gelir.'),
  mc('<code>WHERE YEAR(tarih) = 2024</code> neden sorun olabilir? En iyi yanıt hangisi?', ['YEAR yalnız SQL Server\'da vardır', 'Sütun fonksiyonun içinde olduğu için indeks araması yapılamaz; yarı açık tarih aralığı yazarım, sonucu da karşılaştırırım', 'Sonuç yanlış yıl verir', 'Tam sayı karşılaştırması yavaştır'], 1, 'Neden ve çözüm birlikte verilmiş, doğrulama da eklenmiş.'),
  mc('Planda Key Lookup maliyetin büyük kısmını oluşturuyor. Sorgu iki sütun daha döndürüyor. Ne önerirsin?', ['İndeksi silmek', 'Sorgu gerçekten o sütunları istiyorsa INCLUDE ile kapsayan indeks; önce sütunları daraltmayı denemek', 'Sorguya NOLOCK eklemek', 'Tabloyu heap yapmak'], 1, 'Kapsayan indeks tabloya dönüşü kaldırır. Gereksiz sütunları kaldırmak daha da ucuzdur.'),
  mc('Sayfa 1 hızlı, sayfa 5000 çok yavaş. Sebep ve çözüm hangisi?', ['Veri bozuk; tablo yeniden kurulmalı', 'OFFSET önceki satırları da işler; son anahtardan devam eden keyset sayfalama', 'Sayfa boyutu büyük; 1 yapılmalı', 'ORDER BY kaldırılmalı'], 1, 'OFFSET atlanan satırları yine okur. Keyset indeksle doğrudan sonraki satıra gider. ORDER BY kaldırmak sonucu tutarsız yapar.'),
  mc('İndeks <code>(status, created_at)</code> var. <code>WHERE created_at &gt; ?</code> sorgusu neden faydalanamıyor?', ['Tarih sütunu indekslenemez', 'İlk sütun aramada yok; soldan önek kuralı. Bu sorgu sıksa (created_at) ile başlayan indeks gerekir', 'Büyüktür işareti indeks kullanamaz', 'İndeks yalnız eşitlik içindir'], 1, 'Sıra önce status, sonra created_at. status belirtilmeden tarih sırası kullanılamaz.'),
  mc('"DISTINCT kaldırınca hızlandı ama satır sayısı arttı." Ne söylersin?', ['Hız kazancını kabul edelim', 'Çoğalma var demektir; JOIN nedenini bulur, EXISTS ya da önce toplama ile düzeltirim', 'LIMIT eklerim', 'ORDER BY eklerim'], 1, 'DISTINCT sorunu gizliyordu. Çoğalmanın kaynağı düzeltilir.'),
  sq('Mülakat görevi: <code>SELECT COUNT(*) AS adet FROM lk_orders WHERE substr(placed_at, 1, 7) = \'2024-12\'</code> sorgusunu aynı sonucu verecek ve <code>placed_at</code> indeksini kullanabilecek biçimde yaz (indeks hazır).',
    "SELECT COUNT(*) AS adet FROM lk_orders WHERE placed_at >= '2024-12-01' AND placed_at < '2025-01-01';",
    'Yarı açık aralık.',
    { plan: { setup: 'CREATE INDEX IF NOT EXISTS ix_gizli_pa ON lk_orders (placed_at)', must: 'SEARCH lk_orders', msg: 'Plan arama yapmıyor. Sütunu fonksiyondan çıkar.' },
      ynl: ["SELECT COUNT(*) AS adet FROM lk_orders WHERE substr(placed_at, 1, 7) = '2024-12';", "SELECT COUNT(*) AS adet FROM lk_orders WHERE placed_at >= '2024-12-01' AND placed_at <= '2024-12-31';"] }),
  sq("Mülakat görevi: Şu sorgu için tek bir indeks öner ve oluştur (adı serbest): <code>SELECT order_id, placed_at FROM lk_orders WHERE restaurant_id = 3 AND status = 'teslim' ORDER BY placed_at DESC LIMIT 10</code>. Geçici sıralama olmamalı, iki eşitlik de aramada kullanılmalı.",
    'CREATE INDEX ix_rest_durum_zaman ON lk_orders (restaurant_id, status, placed_at);',
    'İki eşitlik sütunu, sonra sıralama sütunu.',
    { nr: 1, dl: IDX, plan: { q: "SELECT order_id, placed_at FROM lk_orders WHERE restaurant_id = 3 AND status = 'teslim' ORDER BY placed_at DESC LIMIT 10", must: 'restaurant_id=\\? AND status=\\?|status=\\? AND restaurant_id=\\?', not: 'TEMP B-TREE', msg: 'Planda iki eşitlik de görünmeli ve TEMP B-TREE olmamalı.' },
      ynl: ['CREATE INDEX ix_y ON lk_orders (placed_at, restaurant_id, status);', 'CREATE INDEX ix_y ON lk_orders (restaurant_id, placed_at, status);', 'CREATE INDEX ix_y ON lk_orders (restaurant_id, status);'] }),
  sq("Mülakat görevi: Hiç siparişi olmayan müşteri sayısı <code>NOT IN</code> ile yazılmış ve NULL riski taşıyor: <code>SELECT COUNT(*) AS adet FROM customers WHERE customer_id NOT IN (SELECT customer_id FROM orders)</code>. <code>NOT EXISTS</code> ile yaz.",
    'SELECT COUNT(*) AS adet FROM customers c WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id);',
    'Varlık sor. NULL sorun olmaz.',
    { must: [{ re: '\\bNOT\\s+EXISTS\\b', msg: 'Görev NOT EXISTS kullanmanı istiyor.' }],
      ynl: ['SELECT COUNT(*) AS adet FROM customers WHERE customer_id NOT IN (SELECT customer_id FROM orders);', 'SELECT COUNT(*) AS adet FROM customers c WHERE NOT EXISTS (SELECT 1 FROM orders o);'] })
], 'Mülakat Hazırlığı');
})();
