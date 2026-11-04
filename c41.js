/* Kesit SQL: kapsam boşlukları 2. İndeks bakımı, sistem görünümleri, engelleme, yedek zinciri, yetki ve dürüst köprü dersleri.
   Motor gerçek DMV, BACKUP, GRANT, SQL Agent çalıştırmaz. Görevler sis.js içindeki kurgu kopyalar üzerinde yazılır; yazım gerçek sistem görünümüyle aynıdır, sayılar ölçüm değildir.
   SQL Server davranışları Microsoft Learn'den alındı, burada çalıştırılmadı. PL/SQL köprüsündeki yazımlar Oracle belgesinden doğrulanamadı (sayfa erişime kapalıydı), genel bilgidir. */
(function () {
'use strict';
const LS = window.SQLP_LESSONS;
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const ts = s => '<pre class="code" data-base="tsql">' + esc(s) + '</pre>';
const nor = s => '<pre class="code" data-norun>' + esc(s) + '</pre>';
let mcSay = 1;
const mc = (q, o, a, why) => { const k = (mcSay++ * 3) % o.length; const o2 = o.slice(k).concat(o.slice(0, k)); return { t: 'mc', q: '<p>' + q + '</p>', o: o2, a: (a - k + o.length) % o.length, why, dn: 1 }; };
const sq = (q, sol, hint, x) => Object.assign({ t: 'sql', q: '<p>' + q + '</p>', sol, hint, base: 'tsql', dl: ['tsql'] }, x || {});
const ders = (id, mod, lv, min, title, sum, en, body, ex) => LS.push({ id, lv, mod, min, title, sum, en, body, ex });
const DBA = 'Veritabanı Yönetimi (DBA)';
const KOPYA = '<div class="warn"><b>Burası kurgu kopya</b>Bu tarayıcı motoru gerçek sistem görünümü çalıştırmaz. T-SQL modunda <code>sys.dm_*</code>, <code>sys.query_store_*</code>, <code>msdb.dbo.*</code> yazımı, hayali bir portal için elle kurulmuş tablolara yönlenir. Yazım ve sütun adları gerçekle aynıdır, ama yalnız seçili sütunlar var ve sayılar ölçüm değildir. Parametre alan görünümlerde (<code>sys.dm_db_index_physical_stats</code>) parametreler yok sayılır, bütün satırlar döner; süzmek için <code>WHERE</code> yaz. Gerçek sunucuda aynı sorgu için yetki gerekir: SQL Server 2022 ve sonrasında <code>VIEW SERVER PERFORMANCE STATE</code>, öncesinde <code>VIEW SERVER STATE</code>.</div>';

/* ------------------------------------------------------------------ İndeks bakımı */
const HAM = `SELECT OBJECT_NAME(ips.object_id) AS tablo, i.name AS indeks,
       ips.avg_fragmentation_in_percent AS parcalanma,
       ips.avg_page_space_used_in_percent AS doluluk,
       ips.page_count AS sayfa
FROM sys.dm_db_index_physical_stats(DB_ID(), NULL, NULL, NULL, 'SAMPLED') AS ips
JOIN sys.indexes AS i ON i.object_id = ips.object_id AND i.index_id = ips.index_id
ORDER BY ips.page_count DESC`;
const KULLANIM = `SELECT OBJECT_NAME(i.object_id) AS tablo, i.name AS indeks, COALESCE(s.user_updates, 0) AS yazma
FROM sys.indexes AS i
LEFT JOIN sys.dm_db_index_usage_stats AS s
  ON s.object_id = i.object_id AND s.index_id = i.index_id AND s.database_id = DB_ID()
WHERE i.type_desc = 'NONCLUSTERED' AND i.is_unique = 0
  AND COALESCE(s.user_seeks, 0) + COALESCE(s.user_scans, 0) + COALESCE(s.user_lookups, 0) = 0
ORDER BY tablo, indeks`;
ders('dba-indeks-bakim', DBA, 'B2', 25, 'İndeks bakımı kararı: parçalanma, doluluk, REBUILD, FILLFACTOR, kullanılmayan indeks',
  'Sabit eşikle değil, kanıtla karar vermek: hangi indeks bakım ister, hangisi silinir, hangisine hiç dokunulmaz.',
  'index maintenance fragmentation rebuild reorganize fillfactor page density sayfa bölünmesi kullanılmayan indeks dm_db_index_usage_stats physical_stats',
`<h2>Eski kural: yüzde 5 ve 30</h2>
<p>Yıllarca "%5-30 yeniden düzenle, %30 üstü yeniden kur" denildi. Microsoft'un güncel rehberi bu sayıları anmıyor ve kararın yalnız sabit parçalanma ya da doluluk eşiğine dayanmaması gerektiğini yazıyor: önce bakımın gerçekten sorgu performansını iyileştirdiğini ölç, yalnız etkilenen indekslere dokun.</p>
${KOPYA}
<table><tr><th>İşlem</th><th>Ne yapar</th><th>Bedel</th></tr>
<tr><td><code>REORGANIZE</code></td><td>Yaprak düzeyini düzenler, sayfaları doluluk değerine sıkıştırır. Her zaman çevrim içi</td><td>Az kaynak; rehberin varsayılan önerisi</td></tr>
<tr><td><code>REBUILD</code></td><td>İndeksi yeniden kurar, bütün düzeylerde parçalanmayı giderir, anahtar istatistiklerini tarayarak günceller</td><td>İki kopya kadar alan; çevrim dışıysa nesne kilidi</td></tr></table>
<div class="tip"><b>Önce istatistiği dene</b>Yeniden kurma sonrası sorgu hızlandıysa sebep çoğu zaman parçalanma değil, güncellenen istatistiktir. <code>UPDATE STATISTICS ... WITH FULLSCAN</code> çok daha ucuzdur; önce onu sına.</div>
<h2>Parçalanma ve doluluk</h2>
<p><code>avg_fragmentation_in_percent</code> sıra dışı sayfa oranıdır. <code>avg_page_space_used_in_percent</code> sayfa doluluğudur; rehbere göre birçok iş yükünde doluluğu artırmak parçalanmayı azaltmaktan daha çok kazandırır, çünkü daha az sayfa daha az I/O ve bellek demektir.</p>
${ts(HAM + ';')}
<h2>Küçük indeks</h2>
<p>Küçük indeksi yeniden kurmak parçalanmayı çoğu zaman düşürmez, yüzde 66 görünse bile. <code>portal_oturum</code> 40 sayfa: dokunma.</p>
<h2>FILLFACTOR ve sayfa bölünmesi</h2>
<p>Dolu sayfaya satır gelince motor satırların yaklaşık yarısını yeni sayfaya taşır: pahalıdır ve parçalanma üretir. <code>FILLFACTOR</code> yaprak sayfalarda boşluk bırakır. 0 ve 100 aynıdır: tam dolu. Bedeli okumadır: 50 değeri okuma I/O'sunu ve belleği iki katına çıkarır. Rehber, 100 dışında bir değeri yalnız bölünmesi yüksek indekslerde, örneğin ardışık olmayan GUID öncelikli indekste önerir. Sona eklenen artan anahtarda (IDENTITY) boşluk kullanılmaz, işe yaramaz.</p>
${nor(`-- Çalışmaz, başvuru: motor fiziksel sayfa tutmaz
ALTER INDEX IX_customers_guid ON dbo.bank_customers REBUILD WITH (FILLFACTOR = 85);
ALTER INDEX IX_txns_hesap_zaman ON dbo.bank_txns REORGANIZE;`)}
<h2>Kullanılmayan indeks</h2>
<p>Yazma maliyeti verir, okuma getirmez. Ama iki tuzak var:</p>
<ul><li><b>Satırı olmayan indeks:</b> Hiç dokunulmamış indeksin <code>sys.dm_db_index_usage_stats</code> içinde satırı olmayabilir; <code>LEFT JOIN</code> şarttır.</li>
<li><b>Gözlem penceresi:</b> Sayaçlar motor başlayınca sıfırlanır. Dün açılan sunucuda sıfır okuma, aylık rapor indeksinin gereksiz olduğunu göstermez. <code>sys.dm_os_sys_info.sqlserver_start_time</code> bak.</li></ul>
${ts(KULLANIM + ';')}
<p><code>user_updates</code> satır sayısı değil işlem sayısıdır: 1.000 satır silen tek ifade 1 artırır.</p>`,
[
  sq('Bakım adayları: <code>sys.dm_db_index_physical_stats</code> ile <code>sys.indexes</code> birleştir. En az 1.000 sayfa ve parçalanması 10 ve üstü indeksler: <code>tablo</code>, <code>indeks</code>, <code>parcalanma</code>, <code>sayfa</code>. Sayfaya göre azalan.', "SELECT OBJECT_NAME(ips.object_id) AS tablo, i.name AS indeks, ips.avg_fragmentation_in_percent AS parcalanma, ips.page_count AS sayfa\nFROM sys.dm_db_index_physical_stats(DB_ID(), NULL, NULL, NULL, 'SAMPLED') AS ips\nJOIN sys.indexes AS i ON i.object_id = ips.object_id AND i.index_id = ips.index_id\nWHERE ips.page_count >= 1000 AND ips.avg_fragmentation_in_percent >= 10\nORDER BY ips.page_count DESC;", 'İki koşul: boyut ve parçalanma.', { ord: true, ynl: ["SELECT OBJECT_NAME(ips.object_id) AS tablo, i.name AS indeks, ips.avg_fragmentation_in_percent AS parcalanma, ips.page_count AS sayfa FROM sys.dm_db_index_physical_stats(DB_ID(), NULL, NULL, NULL, 'SAMPLED') AS ips JOIN sys.indexes AS i ON i.object_id = ips.object_id AND i.index_id = ips.index_id WHERE ips.avg_fragmentation_in_percent >= 10 ORDER BY ips.page_count DESC;"] }),
  sq('Kullanılmayan: birincil anahtar ve tekil olmayan kümelenmemiş indekslerden okuması olmayanlar; hiç satırı olmayan da gelsin: <code>tablo</code>, <code>indeks</code>, <code>yazma</code>. Tablo ve indekse göre sırala.', KULLANIM + ';', 'LEFT JOIN ve COALESCE.', { ord: true, must: [{ re: 'LEFT\\s+(OUTER\\s+)?JOIN', msg: 'Satırı olmayan indeksi kaçırmamak için LEFT JOIN gerekir.' }], ynl: ["SELECT OBJECT_NAME(i.object_id) AS tablo, i.name AS indeks, s.user_updates AS yazma FROM sys.indexes AS i JOIN sys.dm_db_index_usage_stats AS s ON s.object_id = i.object_id AND s.index_id = i.index_id WHERE i.type_desc = 'NONCLUSTERED' AND i.is_unique = 0 AND s.user_seeks + s.user_scans + s.user_lookups = 0 ORDER BY tablo, indeks;"] }),
  sq('Gözlem penceresi: sayaçlar kaç saatlik? <code>sys.dm_os_sys_info</code> ile, şimdiki an <code>2024-11-12 10:00:00</code> kabul edilerek: <code>saat</code>.', "SELECT DATEDIFF(HOUR, sqlserver_start_time, '2024-11-12 10:00:00') AS saat FROM sys.dm_os_sys_info;", 'DATEDIFF.', { must: [{ re: 'DATEDIFF', msg: 'Süreyi DATEDIFF ile hesapla.' }], ynl: ["SELECT DATEDIFF(DAY, sqlserver_start_time, '2024-11-12 10:00:00') AS saat FROM sys.dm_os_sys_info;"] }),
  sq('Okuma-yazma oranı: kümelenmemiş, tekil olmayan ve kullanım satırı olan indekslerde <code>okuma</code> (seek + scan + lookup) ile <code>yazma</code>; okuması yazmanın yüzde birinden az olanlar: <code>indeks</code>, <code>okuma</code>, <code>yazma</code>. Yazmaya göre azalan, sonra indekse göre.', "SELECT i.name AS indeks, s.user_seeks + s.user_scans + s.user_lookups AS okuma, s.user_updates AS yazma\nFROM sys.dm_db_index_usage_stats AS s\nJOIN sys.indexes AS i ON i.object_id = s.object_id AND i.index_id = s.index_id\nWHERE i.type_desc = 'NONCLUSTERED' AND i.is_unique = 0\n  AND (s.user_seeks + s.user_scans + s.user_lookups) * 100 < s.user_updates\nORDER BY yazma DESC, indeks;", 'Bölme yerine çarparak karşılaştır.', { ord: true, ynl: ["SELECT i.name AS indeks, s.user_seeks AS okuma, s.user_updates AS yazma FROM sys.dm_db_index_usage_stats AS s JOIN sys.indexes AS i ON i.object_id = s.object_id AND i.index_id = s.index_id WHERE i.type_desc = 'NONCLUSTERED' AND i.is_unique = 0 AND s.user_seeks * 100 < s.user_updates ORDER BY yazma DESC, indeks;"] }),
  sq('Ekip kuralı (örnek bir ekip kararı, Microsoft eşiği değildir): en az 1.000 sayfa olmayan <code>dokunma</code>; doluluk 75\'in altındaysa <code>yeniden kur</code>; parçalanma 30 ve üstüyse <code>yeniden duzenle</code>; gerisi <code>dokunma</code>. Kümelenmiş ve kümelenmemiş bütün indeksler için: <code>indeks</code>, <code>karar</code>. Karar <code>dokunma</code> olmayanlar, indekse göre sıralı.', "WITH k AS (\n  SELECT i.name AS indeks,\n         CASE WHEN ips.page_count < 1000 THEN 'dokunma'\n              WHEN ips.avg_page_space_used_in_percent < 75 THEN 'yeniden kur'\n              WHEN ips.avg_fragmentation_in_percent >= 30 THEN 'yeniden duzenle'\n              ELSE 'dokunma' END AS karar\n  FROM sys.dm_db_index_physical_stats(DB_ID(), NULL, NULL, NULL, 'SAMPLED') AS ips\n  JOIN sys.indexes AS i ON i.object_id = ips.object_id AND i.index_id = ips.index_id\n  WHERE i.index_id > 0\n)\nSELECT indeks, karar FROM k WHERE karar <> 'dokunma' ORDER BY indeks;", 'CASE sırası kuraldır: ilk doğru kol kazanır.', { ord: true, must: [{ re: 'CASE', msg: 'Görev CASE ile karar istiyor.' }], ynl: ["SELECT i.name AS indeks, CASE WHEN ips.avg_fragmentation_in_percent >= 30 THEN 'yeniden duzenle' WHEN ips.avg_page_space_used_in_percent < 75 THEN 'yeniden kur' ELSE 'dokunma' END AS karar FROM sys.dm_db_index_physical_stats(DB_ID(), NULL, NULL, NULL, 'SAMPLED') AS ips JOIN sys.indexes AS i ON i.object_id = ips.object_id AND i.index_id = ips.index_id WHERE i.index_id > 0 AND (ips.avg_fragmentation_in_percent >= 30 OR ips.avg_page_space_used_in_percent < 75) ORDER BY indeks;"] }),
  mc('<code>IX_txns_ay_sonu</code> iki gündür hiç okunmamış, sunucu iki gün önce açılmış. Karar?', ['Silme; pencere ay sonunu kapsamıyor', 'Hemen sil; sıfır okuma kesin kanıttır', 'Yeniden kur; sayaç böylece düzelir', 'FILLFACTOR ver; okuma sayısı artar'], 0, 'Sayaçlar başlatmadan beri birikir. Pencere iş döngüsünü kapsamadan silme kararı verilmez; adı da ipucu.'),
  mc('Artan IDENTITY anahtarlı indekse <code>FILLFACTOR = 70</code> veriliyor. Sonuç?', ['Boşluk dolmaz, okuma boşuna artar', 'Sayfa bölünmeleri tamamen sıfıra iner', 'Sona ekleme hızı iki katına çıkar', 'İstatistikler otomatik güncellenir'], 0, 'Yeni satır hep sona gider; sayfa ortasındaki boşluk dolmaz. Değer yalnız satırlar indekse dağılarak geliyorsa işe yarar.'),
  mc('REBUILD sonrası sorgu hızlandı. Parçalanmanın sebep olduğu kesin mi?', ['Hayır; istatistik de güncellenir', 'Evet; rebuild yalnız parçalanmayı etkiler', 'Evet; başka hiçbir etkisi olamaz', 'Hayır; rebuild plan önbelleğini hiçbir zaman silemez'], 0, 'Rehberin önerisi: UPDATE STATISTICS ... WITH FULLSCAN ile aynı kazanç var mı bak, çok daha ucuzdur.'),
  mc('<code>portal_oturum</code>: 40 sayfa, parçalanma yüzde 66. Ne yaparsın?', ['Dokunmam; bu kadar küçük indekste etkisi olmaz', 'Hemen yeniden kurarım; yüzde 30 üstü kuraldır', 'Tabloyu silip, sonra baştan oluşturup doldururum', 'FILLFACTOR değerini 10 yaparım'], 0, 'Yüzde tek başına yanıltır: 40 sayfa okuma süresini değiştirmez.')
]);

/* ------------------------------------------------------------------ Sistem görünümleri */
const USTCPU = `SELECT TOP (3) st.text AS sorgu, qs.execution_count AS calisma,
       qs.total_worker_time / 1000 AS toplam_cpu_ms
FROM sys.dm_exec_query_stats AS qs
CROSS APPLY sys.dm_exec_sql_text(qs.sql_handle) AS st
ORDER BY qs.total_worker_time DESC`;
const QSPLAN = `SELECT q.query_id, p.plan_id, SUM(rs.count_executions) AS calisma,
       SUM(rs.count_executions * rs.avg_duration) / SUM(rs.count_executions) / 1000 AS ort_ms,
       SUM(rs.count_executions * rs.avg_logical_io_reads) / SUM(rs.count_executions) AS ort_okuma
FROM sys.query_store_query AS q
JOIN sys.query_store_plan AS p ON p.query_id = q.query_id
JOIN sys.query_store_runtime_stats AS rs ON rs.plan_id = p.plan_id
WHERE q.query_id = 8
GROUP BY q.query_id, p.plan_id
ORDER BY p.plan_id`;
ders('dba-dmv', DBA, 'B2', 25, 'Gerçek görünümler: DMV, bekleme istatistiği, Query Store kataloğu',
  'Operasyon yolunda kurgu günlükle öğrendiğin teşhisi gerçek sistem görünümü yazımıyla yazmak.',
  'dmv dm_exec_query_stats dm_exec_sql_text cross apply dm_os_wait_stats query store query_store_runtime_stats extended events',
`<h2>Hangi soru, hangi görünüm</h2>
<table><tr><th>Soru</th><th>Görünüm</th><th>Ömür</th></tr>
<tr><td>En çok kaynak yiyen sorgu</td><td><code>sys.dm_exec_query_stats</code> + <code>sys.dm_exec_sql_text</code></td><td>Plan önbellekte kaldığı sürece</td></tr>
<tr><td>Sunucu neyi bekliyor</td><td><code>sys.dm_os_wait_stats</code></td><td>Başlatmadan beri toplam</td></tr>
<tr><td>Bu sorgu dün nasıldı, plan değişti mi</td><td><code>sys.query_store_*</code></td><td>Veritabanında kalıcı, saklama ayarına bağlı</td></tr></table>
${KOPYA}
<div class="tip"><b>Önkoşul</b>Teşhis mantığı <b>SQL Server Operasyon ve Güvenlik</b> yolundaki parmak izi ve plan değişimi derslerinde. Burada aynı mantığın gerçek yazımı var.</div>
<h2>En pahalı sorgular</h2>
<p><code>sys.dm_exec_sql_text</code> tablo değerli işlevdir, her satır için <code>CROSS APPLY</code> ile çağrılır. Süre ve CPU sütunları <b>mikrosaniyedir</b>; sütun toplamdır, ortalama için çalışma sayısına böl.</p>
${ts(USTCPU + ';')}
<div class="warn"><b>Kör nokta</b>Görünüm önbellekteki planları gösterir. Yordam düzeyinde <code>WITH RECOMPILE</code> ile çalışan ya da önbellekten düşen sorgu görünmez, sunucu yeniden başlayınca hepsi gider. Kalıcı geçmiş için Query Store.</div>
<h2>Bekleme istatistiği</h2>
<p>Toplam bekleme <code>wait_time_ms</code>; bunun <code>signal_wait_time_ms</code> kısmı kaynağı aldıktan sonra işlemci sırası beklemektir. Listenin başında zararsız arka plan beklemeleri olur, süz. Küçük örnek:</p>
${ts(`SELECT TOP (4) wait_type, wait_time_ms, signal_wait_time_ms
FROM sys.dm_os_wait_stats
WHERE wait_type NOT IN ('LAZYWRITER_SLEEP', 'SLEEP_TASK', 'BROKER_TO_FLUSH')
ORDER BY wait_time_ms DESC;`)}
<table><tr><th>Bekleme</th><th>İlk bakılacak yer</th></tr><tr><td><code>LCK_M_*</code></td><td>Engelleme: uzun işlem</td></tr><tr><td><code>PAGEIOLATCH_*</code></td><td>Diskten okuma: eksik indeks, tarama, bellek</td></tr><tr><td><code>SOS_SCHEDULER_YIELD</code></td><td>CPU baskısı</td></tr><tr><td><code>WRITELOG</code></td><td>Günlük diski</td></tr></table>
<h2>Query Store kataloğu</h2>
<p>Yol: metin → sorgu → plan → çalışma istatistiği → zaman aralığı. <code>avg_duration</code> mikrosaniye, <code>avg_logical_io_reads</code> 8 KB sayfadır. Bir plan her aralık için ayrı satır verir; toplamken çalışma sayısıyla ağırlıklandır. Aralık zamanları UTC'dir.</p>
${ts(QSPLAN + ';')}
${nor(`-- Çalışmaz, başvuru: motorda plan yok
EXEC sp_query_store_force_plan @query_id = 8, @plan_id = 21;`)}
<h2>Extended Events</h2>
<p>Oturumu tanımlarsın, olayları hedefe (dosya, halka tampon) yazar. Varsayılan <code>system_health</code> oturumu deadlock kayıtlarını zaten tutar. Motorda çalışmaz; deadlock kaydı okuma <b>Engelleme, deadlock, izolasyon</b> dersinde.</p>`,
[
  sq('Toplam CPU\'su en yüksek 3 sorgu: <code>sorgu</code>, <code>calisma</code>, <code>toplam_cpu_ms</code> (mikrosaniyeden çevrilmiş). <code>CROSS APPLY sys.dm_exec_sql_text</code> kullan.', USTCPU + ';', 'total_worker_time mikrosaniye.', { ord: true, must: [{ re: 'CROSS\\s+APPLY\\s+sys\\s*\\.\\s*dm_exec_sql_text', msg: 'Görev CROSS APPLY sys.dm_exec_sql_text istiyor.' }], ynl: ["SELECT TOP (3) st.text AS sorgu, qs.execution_count AS calisma, qs.total_worker_time AS toplam_cpu_ms FROM sys.dm_exec_query_stats AS qs CROSS APPLY sys.dm_exec_sql_text(qs.sql_handle) AS st ORDER BY qs.total_worker_time DESC;", "SELECT TOP (3) st.text AS sorgu, qs.execution_count AS calisma, qs.total_worker_time / 1000 AS toplam_cpu_ms FROM sys.dm_exec_query_stats AS qs CROSS APPLY sys.dm_exec_sql_text(qs.sql_handle) AS st ORDER BY qs.total_elapsed_time / qs.execution_count DESC;"] }),
  sq('Çalışma başına en çok sayfa okuyan 2 sorgu; günde iki kez çalışan toplu işi gözden kaçırma: <code>sorgu</code>, <code>ort_okuma</code>.', "SELECT TOP (2) st.text AS sorgu, qs.total_logical_reads / qs.execution_count AS ort_okuma\nFROM sys.dm_exec_query_stats AS qs\nCROSS APPLY sys.dm_exec_sql_text(qs.sql_handle) AS st\nORDER BY ort_okuma DESC;", 'Toplamı çalışma sayısına böl.', { ord: true, ynl: ["SELECT TOP (2) st.text AS sorgu, qs.total_logical_reads AS ort_okuma FROM sys.dm_exec_query_stats AS qs CROSS APPLY sys.dm_exec_sql_text(qs.sql_handle) AS st ORDER BY ort_okuma DESC;"] }),
  sq('Sürüm sonrası derlenen planlar: <code>creation_time</code> 12 Kasım ve sonrası olan sorgular: <code>sorgu</code>, <code>creation_time</code>, <code>calisma</code>.', "SELECT st.text AS sorgu, qs.creation_time, qs.execution_count AS calisma\nFROM sys.dm_exec_query_stats AS qs\nCROSS APPLY sys.dm_exec_sql_text(qs.sql_handle) AS st\nWHERE qs.creation_time >= '2024-11-12';", 'creation_time süz.', { ynl: ["SELECT st.text AS sorgu, qs.creation_time, qs.execution_count AS calisma FROM sys.dm_exec_query_stats AS qs CROSS APPLY sys.dm_exec_sql_text(qs.sql_handle) AS st WHERE qs.last_execution_time >= '2024-11-12';"] }),
  sq('Bekleme payı: zararsız üç beklemeyi (<code>LAZYWRITER_SLEEP</code>, <code>SLEEP_TASK</code>, <code>BROKER_TO_FLUSH</code>) çıkar; her türün kalan toplam içindeki yüzdesi: <code>wait_type</code>, <code>yuzde</code> (1 ondalık). Yüzdeye göre azalan.', "WITH w AS (SELECT wait_type, wait_time_ms FROM sys.dm_os_wait_stats WHERE wait_type NOT IN ('LAZYWRITER_SLEEP', 'SLEEP_TASK', 'BROKER_TO_FLUSH'))\nSELECT wait_type, ROUND(100.0 * wait_time_ms / (SELECT SUM(wait_time_ms) FROM w), 1) AS yuzde\nFROM w\nORDER BY yuzde DESC;", 'Payda süzülmüş toplam olmalı.', { ord: true, ynl: ["SELECT wait_type, ROUND(100.0 * wait_time_ms / (SELECT SUM(wait_time_ms) FROM sys.dm_os_wait_stats), 1) AS yuzde FROM sys.dm_os_wait_stats WHERE wait_type NOT IN ('LAZYWRITER_SLEEP', 'SLEEP_TASK', 'BROKER_TO_FLUSH') ORDER BY yuzde DESC;"] }),
  sq('CPU baskısı işareti: kalan beklemelerde sinyal beklemesinin toplam içindeki yüzdesi en yüksek olan tür: <code>wait_type</code>, <code>sinyal_yuzde</code> (1 ondalık). Tek satır.', "SELECT TOP (1) wait_type, ROUND(100.0 * signal_wait_time_ms / wait_time_ms, 1) AS sinyal_yuzde\nFROM sys.dm_os_wait_stats\nWHERE wait_type NOT IN ('LAZYWRITER_SLEEP', 'SLEEP_TASK', 'BROKER_TO_FLUSH')\nORDER BY sinyal_yuzde DESC;", 'signal_wait_time_ms, wait_time_ms içindedir.', { ynl: ["SELECT TOP (1) wait_type, ROUND(100.0 * signal_wait_time_ms / wait_time_ms, 1) AS sinyal_yuzde FROM sys.dm_os_wait_stats ORDER BY wait_time_ms DESC;"] }),
  sq('Plan karşılaştırması: 8 numaralı sorgunun her planı için ağırlıklı ortalama: <code>query_id</code>, <code>plan_id</code>, <code>calisma</code>, <code>ort_ms</code>, <code>ort_okuma</code>. Plan sırasıyla.', QSPLAN + ';', 'Üç tablo, ağırlıklı ortalama.', { ord: true, must: [{ re: 'query_store_runtime_stats', msg: 'Görev sys.query_store_runtime_stats istiyor.' }], ynl: ["SELECT q.query_id, p.plan_id, SUM(rs.count_executions) AS calisma, AVG(rs.avg_duration) / 1000 AS ort_ms, AVG(rs.avg_logical_io_reads) AS ort_okuma FROM sys.query_store_query AS q JOIN sys.query_store_plan AS p ON p.query_id = q.query_id JOIN sys.query_store_runtime_stats AS rs ON rs.plan_id = p.plan_id WHERE q.query_id = 3 GROUP BY q.query_id, p.plan_id ORDER BY p.plan_id;"] }),
  sq('Zaman aralığıyla: 12 Kasım 06:00 sonrasında (aralık başlangıcı) ortalama süresi 1 saniyeyi aşan planların sorgu metni: <code>query_sql_text</code>, <code>plan_id</code>, <code>en_yuksek_ms</code>. <code>en_yuksek_ms</code> azalan.', "SELECT qt.query_sql_text, p.plan_id, MAX(rs.avg_duration) / 1000 AS en_yuksek_ms\nFROM sys.query_store_query_text AS qt\nJOIN sys.query_store_query AS q ON q.query_text_id = qt.query_text_id\nJOIN sys.query_store_plan AS p ON p.query_id = q.query_id\nJOIN sys.query_store_runtime_stats AS rs ON rs.plan_id = p.plan_id\nJOIN sys.query_store_runtime_stats_interval AS i ON i.runtime_stats_interval_id = rs.runtime_stats_interval_id\nWHERE i.start_time >= '2024-11-12 06:00:00' AND rs.avg_duration > 1000000\nGROUP BY qt.query_sql_text, p.plan_id\nORDER BY en_yuksek_ms DESC;", 'Beş tablo: metin, sorgu, plan, istatistik, aralık. 1 saniye 1.000.000 µs.', { ord: true, must: [{ re: 'runtime_stats_interval', msg: 'Zaman için aralık görünümünü bağla.' }], ynl: ["SELECT qt.query_sql_text, p.plan_id, MAX(rs.avg_duration) / 1000 AS en_yuksek_ms FROM sys.query_store_query_text AS qt JOIN sys.query_store_query AS q ON q.query_text_id = qt.query_text_id JOIN sys.query_store_plan AS p ON p.query_id = q.query_id JOIN sys.query_store_runtime_stats AS rs ON rs.plan_id = p.plan_id JOIN sys.query_store_runtime_stats_interval AS i ON i.runtime_stats_interval_id = rs.runtime_stats_interval_id WHERE i.start_time >= '2024-11-12 06:00:00' AND rs.avg_duration > 1000 GROUP BY qt.query_sql_text, p.plan_id ORDER BY en_yuksek_ms DESC;"] }),
  mc('<code>sys.dm_exec_query_stats</code> boş döndü, sunucu yeni açılmış. Dünkü yavaşlığı nereden bakarsın?', ['Query Store: veritabanında kalıcıdır', 'sys.dm_os_wait_stats: süre tutar', 'sys.dm_exec_requests: geçmiş tutar', 'Hiçbir yerden: bilgi kaybolmuştur'], 0, 'DMV sayaçları başlatmayla sıfırlanır; Query Store saklama ayarına kadar kalır, açıksa.'),
  mc('<code>total_elapsed_time</code> değeri 4.000.000. Süre nedir?', ['4 saniye: birim mikrosaniyedir', '4.000 saniye: birim milisaniyedir', '4 dakika: birim saniye altıdır', '4 milisaniye: birim nanosaniyedir'], 0, 'Query_stats süreleri mikrosaniyedir; requests.total_elapsed_time ise milisaniye: aynı adlı sütunun birimi görünüme göre değişir.'),
  mc('<code>SOS_SCHEDULER_YIELD</code> beklemesinin sinyal payı çok yüksek. Bu ne düşündürür?', ['CPU baskısı: işlemci sırası', 'Disk yavaş: daha hızlı disk gerekir', 'Kilit: uzun işlem var demektir', 'Ağ: istemci veriyi yavaş alıyor'], 0, 'Sinyal beklemesi kaynak hazırken işlemci sırasıdır.')
]);

/* ------------------------------------------------------------------ Engelleme */
const TEPE = `SELECT s.session_id, s.login_name, s.status, s.open_transaction_count
FROM sys.dm_exec_sessions AS s
WHERE s.session_id IN (SELECT blocking_session_id FROM sys.dm_exec_requests WHERE blocking_session_id > 0)
  AND s.session_id NOT IN (SELECT session_id FROM sys.dm_exec_requests WHERE blocking_session_id > 0)`;
const DEADLOCK = `<deadlock>
  <victim-list><victimProcess id="process7"/></victim-list>
  <process-list>
    <process id="process7" spid="62" transactionname="transfer" lockMode="X" isolationlevel="read committed (2)">
      <inputbuf>UPDATE bank_accounts SET balance = balance - 100 WHERE account_id = 100002</inputbuf>
    </process>
    <process id="process9" spid="70" transactionname="mutabakat" lockMode="X" isolationlevel="read committed (2)">
      <inputbuf>UPDATE bank_accounts SET balance = balance + 100 WHERE account_id = 100001</inputbuf>
    </process>
  </process-list>
  <resource-list>
    <keylock objectname="bank_accounts" indexname="PK_bank_accounts" mode="X">
      <owner-list><owner id="process9" mode="X"/></owner-list>
      <waiter-list><waiter id="process7" mode="X" requestType="wait"/></waiter-list>
    </keylock>
    <keylock objectname="bank_accounts" indexname="PK_bank_accounts" mode="X">
      <owner-list><owner id="process7" mode="X"/></owner-list>
      <waiter-list><waiter id="process9" mode="X" requestType="wait"/></waiter-list>
    </keylock>
  </resource-list>
</deadlock>`;
ders('dba-engelleme', DBA, 'B2', 30, 'Engelleme, deadlock, izolasyon: iki oturumu kafanda çalıştırmak',
  'Tarayıcıda tek bağlantı var; kilit gösterilemez. Bu yüzden zaman çizelgesi, anlık görüntü sorgusu ve deadlock kaydı okuyoruz.',
  'blocking engelleme blocking_session_id head blocker deadlock 1205 isolation izolasyon rcsi snapshot intent lock escalation kill opentran',
`<h2>Neden burada denenemiyor?</h2>
<div class="warn"><b>Motor sınırı</b>Bu motor tek bağlantıdır. <code>SET TRANSACTION ISOLATION LEVEL</code>, <code>WITH (NOLOCK)</code>, <code>LOCK_TIMEOUT</code> hatasız kabul edilir ama hiçbir davranış üretmez; sonuç ekranında bunu söyleyen uyarı görürsün. Aşağıdaki çizelgeler gerçek sunucuda olacakları anlatır, burada çalıştırılmadı.</div>
<h2>Engelleme: normal bir bekleme</h2>
<table><tr><th>Zaman</th><th>Oturum 61</th><th>Oturum 62</th></tr>
<tr><td>09:06</td><td><code>BEGIN TRAN; UPDATE bank_accounts ... WHERE account_id = 100002;</code></td><td></td></tr>
<tr><td>09:11</td><td>(COMMIT unutuldu, boşta)</td><td><code>UPDATE bank_accounts ... WHERE account_id = 100002;</code> bekliyor</td></tr>
<tr><td>09:40</td><td>hâlâ boşta, kilit duruyor</td><td>29 dakikadır bekliyor</td></tr></table>
<p>Tutan bitince bekleyen devam eder. Varsayılan bekleme süresi sınırsızdır, <code>LOCK_TIMEOUT</code> verilmedikçe zaman aşımı olmaz. Teşhis: <code>blocking_session_id</code> zincirini tepeye kadar izle.</p>
${KOPYA.replace('Burası kurgu kopya', 'Sorgular kurgu anlık görüntü üzerinde')}
${ts(`SELECT r.session_id, r.blocking_session_id, r.wait_type, r.wait_time / 1000 AS bekleme_sn, r.wait_resource, st.text AS sorgu
FROM sys.dm_exec_requests AS r
CROSS APPLY sys.dm_exec_sql_text(r.sql_handle) AS st
WHERE r.blocking_session_id > 0
ORDER BY r.wait_time DESC;`)}
<p><code>sys.dm_exec_requests</code> yalnız çalışan istekleri gösterir. Tepedeki suçlu sıklıkla <b>boşta</b> ve açık işlemi olan oturumdur; onu <code>sys.dm_exec_sessions</code> gösterir. <code>blocking_session_id</code> 0 engel yok, -2 ile -5 özel durumlardır: bu yüzden <code>&gt; 0</code> süzülür.</p>
<table><tr><th>Belirti</th><th>Durum</th><th>Hareket</th></tr>
<tr><td>Çalışıyor, okuma artıyor</td><td>Uzun sorgu</td><td>Bekle ya da sorguyu iyileştir</td></tr>
<tr><td><code>sleeping</code>, açık işlem &gt; 0</td><td>Kapatılmamış işlem</td><td>Sahibine sor; gerekirse <code>KILL</code>. Uygulamada hata yolunda geri al</td></tr>
<tr><td><code>KILLED/ROLLBACK</code></td><td>Geri alınıyor</td><td>Bekle. Yeniden başlatma daha uzun sürer</td></tr></table>
<h2>Deadlock: döngüsel bekleme</h2>
<table><tr><th>Zaman</th><th>Oturum 62</th><th>Oturum 70</th></tr>
<tr><td>1</td><td><code>UPDATE ... account_id = 100001</code> kilit alır</td><td></td></tr>
<tr><td>2</td><td></td><td><code>UPDATE ... account_id = 100002</code> kilit alır</td></tr>
<tr><td>3</td><td><code>UPDATE ... 100002</code> 70'i bekler</td><td></td></tr>
<tr><td>4</td><td></td><td><code>UPDATE ... 100001</code> 62'yi bekler: döngü</td></tr></table>
<p>Motor döngüyü bulur, kurbanı seçer: önce düşük <code>DEADLOCK_PRIORITY</code>, eşitse geri alması ucuz olan. Kurban 1205 alır, işlemi geri alınır. Uygulama kısa ve rastgele bekleyip yeniden dener. Kalıcı çözüm: nesnelere aynı sırayla erişmek, işlemi kısa tutmak, işlem içinde kullanıcı beklememek, satır sürümlemeyi düşünmek.</p>
<h2>Deadlock kaydını okumak</h2>
<p>Üç bölüm: <code>victim-list</code>, <code>process-list</code>, <code>resource-list</code>. <code>system_health</code> oturumu bu kaydı varsayılan olarak tutar. Elle kurulmuş örnek:</p>
${nor(DEADLOCK)}
<h2>İzolasyon düzeyleri: hangi anomali kalır</h2>
<table><tr><th>Düzey</th><th>Kirli okuma</th><th>Tekrarlanamayan</th><th>Hayalet</th><th>Nasıl</th></tr>
<tr><td>READ UNCOMMITTED, <code>NOLOCK</code></td><td>Var</td><td>Var</td><td>Var</td><td>Paylaşımlı kilit almaz</td></tr>
<tr><td>READ COMMITTED (varsayılan)</td><td>Yok</td><td>Var</td><td>Var</td><td>Kilit ya da RCSI ile sürüm</td></tr>
<tr><td>REPEATABLE READ</td><td>Yok</td><td>Yok</td><td>Var</td><td>Okunan satırda kilit tutar</td></tr>
<tr><td>SNAPSHOT</td><td>Yok</td><td>Yok</td><td>Yok</td><td>İşlem başındaki sürümü okur; yazma çakışması hata verir</td></tr>
<tr><td>SERIALIZABLE</td><td>Yok</td><td>Yok</td><td>Yok</td><td>Aralık kilidi</td></tr></table>
<h2>Niyet kilidi ve kilit yükseltme</h2>
<p>Satırı kilitlemeden önce sayfa ve tabloya niyet kilidi (IS, IX) konur: başkası tablo kilidi isterse her satırı taramadan çakışmayı görür. Bir ifade çok fazla satır kilidi alırsa motor bellek için bunları tablo kilidine yükseltebilir; bu yüzden büyük toplu güncelleme bütün tabloyu kilitleyebilir, parçalara bölmek bu riski de azaltır.</p>
${nor(`-- Çalışmaz, başvuru
SET DEADLOCK_PRIORITY LOW;
SET LOCK_TIMEOUT 5000;
KILL 61;
DBCC OPENTRAN;`)}`,
[
  sq('Bekleyenler: engellenen istekler: <code>session_id</code>, <code>blocking_session_id</code>, <code>bekleme_sn</code> (saniye, tam bölme yeter). Beklemeye göre azalan.', "SELECT session_id, blocking_session_id, wait_time / 1000 AS bekleme_sn FROM sys.dm_exec_requests WHERE blocking_session_id > 0 ORDER BY wait_time DESC;", 'wait_time milisaniyedir.', { ord: true, ynl: ["SELECT session_id, blocking_session_id, wait_time AS bekleme_sn FROM sys.dm_exec_requests WHERE blocking_session_id > 0 ORDER BY wait_time DESC;"] }),
  sq('Tepedeki engelleyen: başkasını engelleyen ama kendisi engellenmeyen oturum: <code>session_id</code>, <code>login_name</code>, <code>status</code>, <code>open_transaction_count</code>.', TEPE + ';', 'sys.dm_exec_sessions gerekir: boşta oturum isteklerde görünmez.', { must: [{ re: 'dm_exec_sessions', msg: 'Boşta oturumu sys.dm_exec_sessions gösterir.' }], ynl: ["SELECT r.session_id, s.login_name, s.status, s.open_transaction_count FROM sys.dm_exec_requests r JOIN sys.dm_exec_sessions s ON s.session_id = r.session_id WHERE r.blocking_session_id > 0 ORDER BY r.wait_time DESC;"] }),
  sq('Engelleme ağacı: tepedeki 61\'den başlayıp özyinelemeli CTE ile bütün zinciri çıkar: <code>session_id</code>, <code>engelleyen</code>, <code>derinlik</code> (61\'in doğrudan bekleyenleri 1). Derinlik sonra oturum sırasıyla.', "WITH z AS (\n  SELECT session_id, blocking_session_id AS engelleyen, 1 AS derinlik FROM sys.dm_exec_requests WHERE blocking_session_id = 61\n  UNION ALL\n  SELECT r.session_id, r.blocking_session_id, z.derinlik + 1 FROM sys.dm_exec_requests r JOIN z ON r.blocking_session_id = z.session_id\n)\nSELECT session_id, engelleyen, derinlik FROM z ORDER BY derinlik, session_id;", 'Çapa: doğrudan bekleyenler.', { ord: true, must: [{ re: 'UNION\\s+ALL', msg: 'Görev özyinelemeli CTE istiyor.' }], ynl: ["SELECT session_id, blocking_session_id AS engelleyen, 1 AS derinlik FROM sys.dm_exec_requests WHERE blocking_session_id = 61 ORDER BY derinlik, session_id;"] }),
  sq('Açık işlem süresi: şimdiki an <code>2024-11-12 09:40:00</code>. Her açık işlem için <code>session_id</code>, <code>login_name</code>, <code>dakika</code>. Dakikaya göre azalan.', "SELECT tst.session_id, s.login_name, DATEDIFF(MINUTE, tat.transaction_begin_time, '2024-11-12 09:40:00') AS dakika\nFROM sys.dm_tran_active_transactions AS tat\nJOIN sys.dm_tran_session_transactions AS tst ON tst.transaction_id = tat.transaction_id\nJOIN sys.dm_exec_sessions AS s ON s.session_id = tst.session_id\nORDER BY dakika DESC;", 'Üç tablo: işlem, oturum eşlemesi, oturum.', { ord: true, ynl: ["SELECT s.session_id, s.login_name, DATEDIFF(MINUTE, s.last_request_start_time, '2024-11-12 09:40:00') AS dakika FROM sys.dm_exec_sessions AS s ORDER BY dakika DESC;"] }),
  sq('Kim ne bekliyor: bekleyen ve engelleyen oturumun hesabı aynı satırda: <code>bekleyen</code>, <code>bekleyen_hesap</code>, <code>engelleyen</code>, <code>engelleyen_hesap</code>. Bekleyene göre.', "SELECT r.session_id AS bekleyen, a.login_name AS bekleyen_hesap, r.blocking_session_id AS engelleyen, b.login_name AS engelleyen_hesap\nFROM sys.dm_exec_requests AS r\nJOIN sys.dm_exec_sessions AS a ON a.session_id = r.session_id\nJOIN sys.dm_exec_sessions AS b ON b.session_id = r.blocking_session_id\nWHERE r.blocking_session_id > 0\nORDER BY bekleyen;", 'sys.dm_exec_sessions iki kez.', { ord: true, ynl: ["SELECT r.session_id AS bekleyen, a.login_name AS bekleyen_hesap, r.blocking_session_id AS engelleyen, a.login_name AS engelleyen_hesap FROM sys.dm_exec_requests AS r JOIN sys.dm_exec_sessions AS a ON a.session_id = r.session_id WHERE r.blocking_session_id > 0 ORDER BY bekleyen;"] }),
  mc('Örnek deadlock kaydında kurban hangisidir?', ['spid 62 (process7)', 'spid 70 (process9)', 'İkisi birden', 'Kayıttan anlaşılmaz'], 0, 'victim-list içinde process7 yazıyor, process-list\'te process7 spid 62.'),
  mc('Kayıttaki iki işlem aynı tabloda ters sırayla satır güncelliyor. Kalıcı çözüm?', ['İki kod yolu hesapları aynı sırada kilitlesin', 'Her iki işleme WITH (NOLOCK) eklensin', 'Sunucu belleği artırılıp yeniden başlatılsın', 'DEADLOCK_PRIORITY iki işlemde de HIGH olsun'], 0, 'Aynı sıra döngüyü kırar. Yazma için NOLOCK işlemez; öncelik yalnız kurbanı seçer.'),
  mc('<code>sp_who2</code> sonucu: bir oturum boşta ama işlem sayısı 1, üç oturum onu bekliyor. En olası durum?', ['İşlem açık kalmış; COMMIT ya da ROLLBACK unutulmuş', 'Oturum uzun bir sorgu çalıştırıyor, bitmesini beklemek yeter', 'Sunucu kilit tablosunu otomatik temizleyecek', 'Boşta oturum kilit tutamaz, başka neden aranmalı'], 0, 'Boşta ve açık işlemli oturum kilidi bırakmaz. Learn: sleeping + open_transaction_count > 0.'),
  mc('READ COMMITTED altında aynı satırı iki kez okudun, arada başkası değiştirdi, değer farklı. Bu nedir?', ['Tekrarlanamayan okuma', 'Onaylanmamış kirli okuma', 'Satır kümesi hayalet okuma', 'Ardışık kayıp güncelleme'], 0, 'Onaylanmış değişiklik iki okuma arasına girdi. Kirli okuma onaylanmamış veridir, hayalet okuma satır kümesi değişimidir.'),
  mc('<code>SET TRANSACTION ISOLATION LEVEL SERIALIZABLE</code> bu sitedeki editörde çalıştı. Bundan ne çıkar?', ['Yalnız yazım kabul edildi, davranış yok', 'Sorgu gerçekten aralık kilidiyle çalıştı', 'Hayalet okuma artık engellendi demektir', 'Sunucu tüm oturumları sıraya aldı'], 0, 'Tek bağlantıda başka oturum yok. Motor bunu uyarı olarak yazar.'),
  mc('Bir oturum <code>KILLED/ROLLBACK</code> durumunda ve çok uzun sürüyor. Ne yaparsın?', ['Beklerim; geri almayı durduramam, sürer', 'Yeniden KILL ile geri almayı keserim', 'Sunucuyu yeniden başlatıp hızlandırırım', 'Kilitleri elle kaldırıp işleme devam ederim'], 0, 'Geri alma durdurulamaz; yeniden başlatma kurtarmada sürer ve daha uzun olabilir.')
]);

/* ------------------------------------------------------------------ Yedek zinciri */
const ZINCIR = `WITH t AS (
  SELECT MAX(backup_finish_date) AS bitis FROM msdb.dbo.backupset
  WHERE database_name = 'ilgaz_portal' AND type = 'D' AND is_copy_only = 0 AND backup_finish_date <= '2024-11-13 14:37:00'
), f AS (
  SELECT MAX(backup_finish_date) AS bitis FROM msdb.dbo.backupset, t
  WHERE database_name = 'ilgaz_portal' AND type = 'I' AND backup_finish_date <= '2024-11-13 14:37:00' AND backup_finish_date > t.bitis
)
SELECT b.type, COUNT(*) AS adet, MIN(b.backup_start_date) AS ilk, MAX(b.backup_finish_date) AS son
FROM msdb.dbo.backupset AS b, t, f
WHERE b.database_name = 'ilgaz_portal' AND b.is_copy_only = 0
  AND ((b.type = 'D' AND b.backup_finish_date = t.bitis)
    OR (b.type = 'I' AND b.backup_finish_date = f.bitis)
    OR (b.type = 'L' AND b.backup_finish_date > f.bitis AND b.backup_finish_date <= '2024-11-13 14:37:00'))
GROUP BY b.type
ORDER BY CASE b.type WHEN 'D' THEN 1 WHEN 'I' THEN 2 ELSE 3 END`;
ders('dba-yedek-zincir', DBA, 'B2', 25, 'Yedek zinciri: geri yükleme planı, RPO hesabı, kırık zincir',
  'Yedek almak iş değil, geri dönebilmek iştir. Geçmiş kaydından hangi dosyaların, hangi sırayla gerektiğini çıkar.',
  'backup restore tail log rpo rto msdb backupset lsn copy only recovery model zincir verifyonly stopat',
`<h2>Temel</h2>
<p>RPO, RTO, modeller ve yedek türleri <b>Yedekleme ve geri yükleme</b> dersinde. Burada olaydan sonra sorulan soru var: elimizde ne var, kaç dakikalık veri gider?</p>
<div class="warn"><b>Motor sınırı</b><code>BACKUP</code> ve <code>RESTORE</code> burada çalışmaz. Görevlerde gerçek geçmiş tablosunun <code>msdb.dbo.backupset</code> kurgu kopyasını okursun. Hiçbir dosya yoktur, hiçbir şey geri yüklenmez.</div>
<table><tr><th>Model</th><th>Günlük yedeği</th><th>Kayıp penceresi</th><th>Belirli ana dönüş</th></tr>
<tr><td>SIMPLE</td><td>Yok</td><td>Son yedekten beri her şey</td><td>Yok, yalnız yedeğin sonu</td></tr>
<tr><td>FULL</td><td>Gerekli</td><td>Normalde yok; günlük sonu hasarlıysa son günlük yedeğinden beri</td><td>Var</td></tr>
<tr><td>BULK_LOGGED</td><td>Gerekli</td><td>Toplu işlem varsa o yedekten beri</td><td>Yok</td></tr></table>
<h2>Geri yükleme sırası</h2>
<ol><li>Günlüğe erişiliyorsa <b>son günlük</b> (tail-log) yedeği: <code>WITH NORECOVERY</code></li><li>En son tam yedek</li><li>En son fark yedeği, varsa: günlük sayısını azaltır</li><li>Sonraki günlük yedekleri sırayla</li><li>Kurtar: <code>WITH RECOVERY</code></li></ol>
${nor(`-- Çalışmaz, başvuru
USE master;
BACKUP LOG ilgaz_portal TO DISK = 'kuyruk.trn' WITH NORECOVERY;
RESTORE DATABASE ilgaz_portal FROM DISK = 'tam.bak'  WITH NORECOVERY;
RESTORE DATABASE ilgaz_portal FROM DISK = 'fark.bak' WITH NORECOVERY;
RESTORE LOG ilgaz_portal FROM DISK = 'g1.trn' WITH NORECOVERY;
RESTORE LOG ilgaz_portal FROM DISK = 'kuyruk.trn' WITH STOPAT = '2024-11-13 14:36:00', RECOVERY;
RESTORE VERIFYONLY FROM DISK = 'tam.bak' WITH CHECKSUM;`)}
<div class="tip"><b>Doğrulama</b><code>RESTORE VERIFYONLY</code> yedeğin okunabilir olduğunu sınar, veritabanını kurmaz. Yedeğin işe yaradığının tek kanıtı başka sunucuda düzenli geri yükleme denemesidir: süresi de RTO ölçümün olur.</div>
<h2>msdb kaydını okumak</h2>
<p><code>type</code>: D tam, I fark, L günlük. <code>first_lsn</code> ilk kayıt, <code>last_lsn</code> sonraki kayıt: günlük zincirinde her yedeğin <code>first_lsn</code> değeri bir öncekinin <code>last_lsn</code> değerine eşit olmalı. <code>is_copy_only</code> 1 olan yedek normal zincire girmez, fark yedeğinin tabanı olmaz.</p>
${ts(`SELECT database_name, recovery_model, type, COUNT(*) AS adet, MAX(backup_finish_date) AS son
FROM msdb.dbo.backupset
GROUP BY database_name, recovery_model, type
ORDER BY database_name, type;`)}
<h2>Senaryo</h2>
<p><code>ilgaz_portal</code> diski 13 Kasım 14:37'de bozuldu, günlük dosyasına ulaşılamıyor; son günlük yedeği alınamaz. RPO hedefi 15 dakika. Aşağıdaki görevlerde durumu çıkaracaksın.</p>`,
[
  sq('Model riski: her veritabanı için kurtarma modeli ve son yedeğin bitişi: <code>database_name</code>, <code>recovery_model</code>, <code>son_yedek</code>. Veritabanı adına göre.', "SELECT database_name, recovery_model, MAX(backup_finish_date) AS son_yedek FROM msdb.dbo.backupset GROUP BY database_name, recovery_model ORDER BY database_name;", 'Grupla, en büyük bitiş.', { ord: true, ynl: ["SELECT database_name, recovery_model, MAX(backup_finish_date) AS son_yedek FROM msdb.dbo.backupset WHERE type = 'D' GROUP BY database_name, recovery_model ORDER BY database_name;"] }),
  sq('Olay anındaki veri kaybı: 14:37 anında her veritabanının son herhangi yedeğinden geçen dakika: <code>database_name</code>, <code>kayip_dk</code>. Çoktan aza.', "SELECT database_name, DATEDIFF(MINUTE, MAX(backup_finish_date), '2024-11-13 14:37:00') AS kayip_dk\nFROM msdb.dbo.backupset\nWHERE backup_finish_date <= '2024-11-13 14:37:00'\nGROUP BY database_name\nORDER BY kayip_dk DESC;", 'DATEDIFF, MAX.', { ord: true, ynl: ["SELECT database_name, DATEDIFF(MINUTE, MIN(backup_finish_date), '2024-11-13 14:37:00') AS kayip_dk FROM msdb.dbo.backupset WHERE backup_finish_date <= '2024-11-13 14:37:00' GROUP BY database_name ORDER BY kayip_dk DESC;"] }),
  sq('En büyük pencere: <code>ilgaz_portal</code> günlük yedekleri arasında ardışık iki yedeğin başlangıçları arasındaki en büyük boşluk: <code>baslangic</code> (boşluktan sonraki yedeğin başlangıcı), <code>bosluk_dk</code>. Tek satır.', "WITH g AS (\n  SELECT backup_start_date, DATEDIFF(MINUTE, LAG(backup_start_date) OVER (ORDER BY backup_start_date), backup_start_date) AS bosluk\n  FROM msdb.dbo.backupset WHERE database_name = 'ilgaz_portal' AND type = 'L'\n)\nSELECT TOP (1) backup_start_date AS baslangic, bosluk AS bosluk_dk FROM g ORDER BY bosluk DESC;", 'LAG ile önceki günlük yedeği.', { must: [{ re: 'LAG', msg: 'Görev LAG kullanmanı istiyor.' }], ynl: ["SELECT TOP (1) backup_start_date AS baslangic, 15 AS bosluk_dk FROM msdb.dbo.backupset WHERE database_name = 'ilgaz_portal' AND type = 'L' ORDER BY backup_start_date DESC;"] }),
  sq('Geri yükleme planı: 14:37 için <code>ilgaz_portal</code>: en son normal tam yedek, ondan sonraki en son fark, ondan sonraki bütün günlükler: <code>type</code>, <code>adet</code>, <code>ilk</code> (ilk başlangıç), <code>son</code> (son bitiş). Sıra D, I, L. Copy-only dışarıda.', ZINCIR + ';', 'İki CTE: tam ve fark bitişi. Sonra üç koldan seçim.', { ord: true, ynl: ["SELECT type, COUNT(*) AS adet, MIN(backup_start_date) AS ilk, MAX(backup_finish_date) AS son FROM msdb.dbo.backupset WHERE database_name = 'ilgaz_portal' AND backup_finish_date <= '2024-11-13 14:37:00' GROUP BY type ORDER BY CASE type WHEN 'D' THEN 1 WHEN 'I' THEN 2 ELSE 3 END;"] }),
  sq('Kırık zincir: <code>ilgaz_arsiv</code> günlük yedeklerinde <code>first_lsn</code> önceki <code>last_lsn</code> ile uyuşmayanlar: <code>backup_start_date</code>, <code>first_lsn</code>, <code>beklenen</code>.', "WITH z AS (\n  SELECT backup_start_date, first_lsn, LAG(last_lsn) OVER (ORDER BY backup_start_date) AS beklenen\n  FROM msdb.dbo.backupset WHERE database_name = 'ilgaz_arsiv' AND type = 'L'\n)\nSELECT backup_start_date, first_lsn, beklenen FROM z WHERE first_lsn <> beklenen;", 'LAG(last_lsn).', { must: [{ re: 'LAG', msg: 'Görev LAG istiyor.' }], ynl: ["WITH z AS (SELECT backup_start_date, first_lsn, LAG(first_lsn) OVER (ORDER BY backup_start_date) AS beklenen FROM msdb.dbo.backupset WHERE database_name = 'ilgaz_arsiv' AND type = 'L') SELECT backup_start_date, first_lsn, beklenen FROM z WHERE first_lsn <> beklenen;"] }),
  mc('14:37\'de disk bozuldu, son günlük yedeği 14:15\'te. Günlük dosyası da yok. Kaç dakikalık veri gider?', ['En az 22 dakika', 'En az 15 dakika', 'Hiç veri gitmez, kurtarılır', 'En az 24 saat kayıp'], 0, 'Son günlük yedeğinden sonrası yalnız kuyruk yedeğiyle kurtarılırdı; ona ulaşılamıyor. Hedef 15 dakikaydı, aşıldı.'),
  mc('Gece iki saat günlük yedeği işi çalışmadı ama zincir kırılmadı. Etkisi nedir?', ['Kayıp penceresi o sürede iki saate çıkar, RPO aşılır', 'Geri yükleme imkânsız olur, tam yedek baştan alınır', 'Hiç etkisi yoktur, günlük dosyası bunu telafi eder', 'Fark yedekleri bundan dolayı kullanılamaz olur'], 0, 'Sonraki günlük yedeği aradaki her şeyi taşır, zincir sürer. Ama pencere o sürede büyür: RPO ihlali izlenmelidir.'),
  mc('Geliştirici geçici kopya için tam yedek aldı, gece fark yedeği bu tabana bağlandı. Önlem neydi?', ['WITH COPY_ONLY ile almak', 'WITH CHECKSUM ile almak', 'WITH COMPRESSION ile almak', 'NORECOVERY ile almak'], 0, 'Copy-only normal sırayı etkilemez, fark yedeği tabanını değiştirmez.'),
  mc('<code>raporlama</code> SIMPLE modelde, haftalık tam yedek alınıyor. Hangi söz doğru?', ['Son tam yedekten sonrası kaybedilebilir', 'Günlük yedeği alınırsa belirli ana da dönülebilir', 'SIMPLE modelde veri kaybı olmaz, günlük otomatik saklanır', 'Tam yedek gerekmez, fark yedeği yeterlidir'], 0, 'Learn: SIMPLE günlük yedeğini desteklemez, yalnız yedeğin sonuna dönülür. Veri kaynaktan yeniden üretilebiliyorsa kabul edilebilir.'),
  mc('RTO hedefinin tutulduğunu ne gösterir?', ['Geri yükleme denemesinin ölçülen süresi', 'Yedek dosyasının diskte olması', 'Yedek işinin başarılı görünmesi', 'RESTORE VERIFYONLY sonucunun temiz olması'], 0, 'Başarılı yedek süre söylemez. Düzenli geri yükleme denemesi hem çalıştığını hem süresini kanıtlar.')
]);

/* ------------------------------------------------------------------ Yetki */
const ETKILI = `WITH roller AS (
  SELECT u.principal_id AS kimlik FROM sys.database_principals u WHERE u.name = 'an_mert'
  UNION
  SELECT m.role_principal_id FROM sys.database_role_members m JOIN sys.database_principals u ON u.principal_id = m.member_principal_id WHERE u.name = 'an_mert'
), y AS (
  SELECT p.major_id, p.permission_name, p.state FROM sys.database_permissions p JOIN roller r ON r.kimlik = p.grantee_principal_id
)
SELECT OBJECT_NAME(g.major_id) AS nesne, g.permission_name AS yetki
FROM y g
WHERE g.state = 'G' AND NOT EXISTS (SELECT 1 FROM y d WHERE d.state = 'D' AND d.major_id = g.major_id AND d.permission_name = g.permission_name)
ORDER BY nesne, yetki`;
ders('dba-yetki', DBA, 'B2', 25, 'Yetki denetimi: bu kullanıcı gerçekte ne yapabilir?',
  'LOGIN, USER, rol ve GRANT\'ı kataloğu okuyarak denetlemek. En az yetki ilkesine göre karar vermek.',
  'login user role grant deny revoke en az yetki least privilege sys.database_permissions sys.database_principals db_owner',
`<h2>Temel</h2>
<p>Login, user, rol farkı <b>SQL Server güvenliği</b> dersinde. Burada asıl iş soru: bir yıl sonra hesaba bakıp "bu kişi neye erişiyor, neden?" diyebilmek.</p>
<div class="warn"><b>Motor sınırı</b>Motorda tek kullanıcı var: <code>CREATE LOGIN</code>, <code>GRANT</code>, <code>DENY</code> çalışmaz, hata verir. Görevlerde gerçek katalog görünümlerinin kurgu kopyalarını sorgularsın. Yetki gerçekte uygulanmaz.</div>
${nor(`-- Çalışmaz, başvuru. Yetki kişiye değil role verilir
CREATE LOGIN rapor_login WITH PASSWORD = N'<guclu parola>';
CREATE USER rapor_user FOR LOGIN rapor_login;
CREATE ROLE rol_rapor;
GRANT SELECT ON dbo.rapor_ozet TO rol_rapor;
ALTER ROLE rol_rapor ADD MEMBER rapor_user;
DENY SELECT ON dbo.bank_customers TO rapor_user;
REVOKE SELECT ON dbo.rapor_ozet FROM rol_rapor;`)}
<h2>Kural: DENY kazanır</h2>
<ul><li>DENY, GRANT'ın ve rolden gelenin önüne geçer.</li><li>Nesne sahibi ve <code>sysadmin</code> üyesi için DENY işlemez.</li><li>Eskiden kalma istisna: tablo düzeyi DENY, sütun düzeyi GRANT'ın önüne geçmez.</li><li>REVOKE yasaklamaz, yalnız kaydı siler: başka yerden gelen izin kalır.</li></ul>
<h2>Katalog</h2>
<table><tr><th>Görünüm</th><th>Ne var</th></tr><tr><td><code>sys.database_principals</code></td><td>Kullanıcı ve roller. <code>type</code> S kullanıcı, R rol</td></tr><tr><td><code>sys.database_role_members</code></td><td>Kim hangi rolde</td></tr><tr><td><code>sys.database_permissions</code></td><td><code>major_id</code> nesne, <code>grantee_principal_id</code> alan, <code>state</code> G ya da D</td></tr></table>
${ts(`SELECT r.name AS rol, u.name AS uye
FROM sys.database_role_members AS m
JOIN sys.database_principals AS r ON r.principal_id = m.role_principal_id
JOIN sys.database_principals AS u ON u.principal_id = m.member_principal_id
ORDER BY rol, uye;`)}
<h2>En az yetki</h2>
<p>Hesap işini yapacak kadar yetki alır, fazlası saldırı yüzeyidir: ele geçirilen raporlama hesabı silememeli. Saldırı senaryosu için <b>SQL injection savunması</b> dersine bak. Kısa kontrol listesi:</p>
<ul><li>Servis hesabı <code>db_owner</code> olmasın.</li><li>Yetki role verilsin, doğrudan kişiye verilen yetki istisnadır ve gerekçe ister.</li><li>Kapalı hesaplar kaldırılsın.</li></ul>`,
[
  sq('Rol üyeleri: <code>rol_analist</code> üyeleri: <code>uye</code>. Ada göre.', "SELECT u.name AS uye\nFROM sys.database_role_members AS m\nJOIN sys.database_principals AS r ON r.principal_id = m.role_principal_id\nJOIN sys.database_principals AS u ON u.principal_id = m.member_principal_id\nWHERE r.name = 'rol_analist'\nORDER BY uye;", 'sys.database_principals iki kez.', { ord: true, ynl: ["SELECT u.name AS uye FROM sys.database_role_members AS m JOIN sys.database_principals AS u ON u.principal_id = m.role_principal_id WHERE u.name = 'rol_analist' ORDER BY uye;"] }),
  sq('Fazla yetki: <code>db_owner</code> üyesi hesaplar: <code>hesap</code>. Ada göre.', "SELECT u.name AS hesap\nFROM sys.database_role_members AS m\nJOIN sys.database_principals AS r ON r.principal_id = m.role_principal_id\nJOIN sys.database_principals AS u ON u.principal_id = m.member_principal_id\nWHERE r.name = 'db_owner'\nORDER BY hesap;", 'Yukarıdaki kalıp.', { ord: true, ynl: ["SELECT u.name AS hesap FROM sys.database_role_members AS m JOIN sys.database_principals AS r ON r.principal_id = m.role_principal_id JOIN sys.database_principals AS u ON u.principal_id = m.member_principal_id WHERE r.name = 'db_datareader' ORDER BY hesap;"] }),
  sq('Doğrudan kişiye verilen yetki: alanı rol değil kullanıcı olan satırlar: <code>hesap</code>, <code>nesne</code>, <code>yetki</code>, <code>durum</code>. Hesap sırasıyla.', "SELECT u.name AS hesap, OBJECT_NAME(p.major_id) AS nesne, p.permission_name AS yetki, p.state_desc AS durum\nFROM sys.database_permissions AS p\nJOIN sys.database_principals AS u ON u.principal_id = p.grantee_principal_id\nWHERE u.type = 'S'\nORDER BY hesap;", "type = 'S'.", { ord: true, ynl: ["SELECT u.name AS hesap, OBJECT_NAME(p.major_id) AS nesne, p.permission_name AS yetki, p.state_desc AS durum FROM sys.database_permissions AS p JOIN sys.database_principals AS u ON u.principal_id = p.grantee_principal_id WHERE u.type = 'R' ORDER BY hesap;"] }),
  sq('Etkili yetki: <code>an_mert</code> hem doğrudan hem rolden aldıkları üzerinden, DENY düşüldükten sonra ne yapabilir: <code>nesne</code>, <code>yetki</code>. Sırala.', ETKILI + ';', 'Önce kimlikleri topla (kendisi + rolleri), sonra DENY olanı düş.', { ord: true, must: [{ re: "NOT\\s+EXISTS|NOT\\s+IN|EXCEPT|LEFT\\s+JOIN", msg: 'DENY edilenleri düşmen gerekiyor.' }], mustNot: [{ re: '\\b100[1-5]\\b', msg: 'Nesne kimliğini elle yazma, DENY satırından bul.' }], ynl: ["SELECT OBJECT_NAME(p.major_id) AS nesne, p.permission_name AS yetki FROM sys.database_permissions p JOIN sys.database_role_members m ON m.role_principal_id = p.grantee_principal_id JOIN sys.database_principals u ON u.principal_id = m.member_principal_id WHERE u.name = 'an_mert' ORDER BY nesne, yetki;"] }),
  sq('Yetki matrisi: <code>rol_portal</code> için nesne başına: <code>nesne</code>, <code>okuma</code>, <code>ekleme</code>, <code>guncelleme</code> (1 ya da 0). Nesneye göre.', "SELECT OBJECT_NAME(p.major_id) AS nesne,\n       MAX(CASE WHEN p.permission_name = 'SELECT' THEN 1 ELSE 0 END) AS okuma,\n       MAX(CASE WHEN p.permission_name = 'INSERT' THEN 1 ELSE 0 END) AS ekleme,\n       MAX(CASE WHEN p.permission_name = 'UPDATE' THEN 1 ELSE 0 END) AS guncelleme\nFROM sys.database_permissions AS p\nJOIN sys.database_principals AS r ON r.principal_id = p.grantee_principal_id\nWHERE r.name = 'rol_portal' AND p.state = 'G'\nGROUP BY p.major_id\nORDER BY nesne;", 'Koşullu toplama.', { ord: true, ynl: ["SELECT OBJECT_NAME(p.major_id) AS nesne, COUNT(*) AS okuma, 0 AS ekleme, 0 AS guncelleme FROM sys.database_permissions AS p JOIN sys.database_principals AS r ON r.principal_id = p.grantee_principal_id WHERE r.name = 'rol_portal' GROUP BY p.major_id ORDER BY nesne;"] }),
  mc('Kullanıcıya rolden GRANT SELECT, doğrudan DENY SELECT verilmiş. Sonuç?', ['Okuyamaz; DENY hepsinin önüne geçer', 'Okur; GRANT daha yakın tarihli', 'Okur; rol yetkisi kişiyi ezer', 'İkisi birbirini iptal eder, düzey yok'], 0, 'DENY rolden geleni de engeller. Sysadmin ve nesne sahibi istisnadır.'),
  mc('REVOKE ile kişideki GRANT kaldırıldı, kişi hâlâ okuyor. En olası neden?', ['Üyesi olduğu rolde de izin var', 'REVOKE yeniden başlatma bekliyor', 'REVOKE yalnız sysadmin için geçerli', 'Tablo sahibine ait önbellek duruyor'], 0, 'REVOKE yalnız o izin kaydını siler; başka yerden gelen izin sürer. Yasak için DENY gerekir.'),
  mc('ETL hesabı gece yalnız üç tabloya yazıyor ama <code>db_owner</code>. Doğru düzeltme?', ['Yalnız o tablolara yetkili role almak', 'db_owner kalıp ağ erişimini daraltmak', 'db_datareader rolüne de ayrıca almak', 'İşi sa hesabı ile çalıştırmak'], 0, 'En az yetki: ele geçirilen ETL hesabı veritabanını silememeli.'),
  mc('Kapalı bir servis hesabının kullanıcısı veritabanında duruyor ve hâlâ db_owner. Risk nedir?', ['Login açılırsa yetki aynen döner', 'Yedek zinciri bu yüzden kırılır', 'Veritabanı salt okunur konuma geçer', 'Hiçbir risk yok, kapalı hesap sayılmaz'], 0, 'Kullanıcı ve üyelik kalıcıdır. Hesap kapanınca yetkiler de temizlenir.')
]);

/* ------------------------------------------------------------------ Köprü dersleri */
const KOPRU = 'Köprü Dersleri';
const KN = t => '<div class="note"><b>Bu bir köprü dersi</b>' + t + '</div>';
ders('kopru-hadr', KOPRU, 'B2', 15, 'Köprü: HA ve felaket kurtarma seçimi',
  'Always On, FCI, log shipping, replikasyon: hangi sorunu çözerler, neyi çözmezler. Kurulum yok, karar var.',
  'always on availability group failover cluster log shipping mirroring replikasyon ha dr listener',
`${KN('Tarayıcıda küme kurulamaz, failover denenemez. Bu ders mülakatta ve toplantıda doğru kelimeyi kullanmana yeter, kurmayı öğretmez. Devamı: Microsoft Learn "Always On availability groups" bölümü ve bir deneme ortamı.')}
<p>Temel tablo <b>Yüksek erişilebilirlik ve ölçekleme</b> dersinde. Burada karar soruları var.</p>
<table><tr><th>Seçenek</th><th>Korunan</th><th>Korumadığı</th><th>Tipik kullanım</th></tr>
<tr><td>Availability Group</td><td>Bir grup veritabanı; birincil ve 1-8 ikincil, eşzamanlı işlemede birincil dahil en çok beş kopya</td><td>Sunucu düzeyi nesneler (login, Agent işi) kendiliğinden gitmez</td><td>Okunabilir ikincil, otomatik devralma, tek <b>dinleyici</b> adı</td></tr>
<tr><td>Failover Cluster Instance</td><td>Bütün instance; paylaşımlı disk</td><td>Disk hasarı: tek veri kopyası var</td><td>Sunucu arızası</td></tr>
<tr><td>Log Shipping</td><td>Günlük yedeklerini başka sunucuya taşır</td><td>Otomatik devralma yok, gecikme dakikalar</td><td>Ucuz DR</td></tr>
<tr><td>Replikasyon</td><td>Seçilen tablolar</td><td>Bütün veritabanı DR'ı değildir</td><td>Raporlama sunucusu besleme</td></tr>
<tr><td>Database Mirroring</td><td>Tek veritabanı</td><td>Kullanımdan kaldırılma yolunda, yeni kurulumda seçilmez</td><td>Eski sistemlerde görürsün</td></tr></table>
<h2>Eşzamanlı mı eşzamansız mı</h2>
<p>Eşzamanlı işlemede birincil, ikincilin günlüğü yazmasını bekler: veri kaybı yok, işlem biraz yavaş, aynı veri merkezinde mantıklı. Eşzamansızda beklemez: uzak bölge için uygun, devralmada veri kaybı olabilir. Otomatik devralma eşzamanlı ikincil ister.</p>
<h2>HA yedek değildir</h2>
<p><code>DELETE</code> hatası saniyeler içinde bütün ikincillere gider. Yanlış silmeye karşı koruma yedektir. <b>Test edilmemiş devralma planı plan değildir</b>: düzenli deneme, izleme (<code>sys.dm_hadr_*</code> görünümleri) ve login ile Agent işlerinin eşitlenmesi işin parçası.</p>`,
[
  mc('Bir geliştirici yanlışlıkla tablo sildi. Availability Group birincilden ikincile geçmek işe yarar mı?', ['Hayır; silme ikincile de gitti, yedek gerekir', 'Evet; ikincil silmeyi uygulamaz', 'Evet; dinleyici silmeyi engeller', 'Hayır; yalnız yeniden başlatmak yeter'], 0, 'Çoğaltma hatayı da çoğaltır. HA ile yedek ayrı işlerdir.'),
  mc('RPO sıfıra yakın, RTO saniyeler, iki sunucu aynı veri merkezinde. Hangisi uygun?', ['Eşzamanlı AG, otomatik devralma', 'Eşzamansız AG, elle yapılan devralma', 'Saatlik log shipping düzeni', 'Gecelik yedek ve geri yükleme'], 0, 'Eşzamanlı işleme veri kaybını önler, otomatik devralma süresini kısaltır.'),
  mc('Bütçe düşük, uzak bir sunucuya DR, 15-30 dakika kayıp kabul. Hangisi uygun?', ['Log Shipping düzeni', 'Failover Cluster Instance', 'Eşzamanlı Availability Group', 'Satır düzeyi güvenlik'], 0, 'Günlük yedeği alıp başka yerde yükler; kurulumu basit, gecikmesi kabul edilen pencerededir.'),
  mc('AG devralmasından sonra uygulama "login failed" alıyor, veri tamam. Sıradaki bakılacak yer?', ['Login ikincil sunucuda eksik ya da SID uyuşmuyor', 'İkincilde veritabanı dosyaları bozulmuş', 'Dinleyici DNS adı silinmiş olmalı', 'Parola ilkesi devralmada süresi dolmuş sayar'], 0, 'Login sunucu düzeyindedir ve grupla taşınmaz; bilinen bir devralma tuzağıdır.')
]);

ders('kopru-plsql', KOPRU, 'B2', 20, 'Köprü: T-SQL bilenler için Oracle PL/SQL',
  'Prosedür, IN OUT, açık imleç, BULK COLLECT, FORALL, EXECUTE IMMEDIATE, koleksiyon: okuma düzeyi.',
  'plsql oracle prosedür in out imleç ref cursor bulk collect forall execute immediate koleksiyon paket',
`${KN('Tarayıcıda PL/SQL yorumlayıcısı yok; bu kodlar çalışmaz, denetlenmez. Hedef, ilanda ya da mevcut kodda gördüğünde okuyabilmek. Yazmayı öğrenmek için ücretsiz Oracle ortamı gerekir. Blok, tip ve basit imleç için <b>Oracle PL/SQL ile programlama</b> dersine bak. Yazımlar genel bilgiye dayanır, Oracle belgesi bu dersi yazarken açılamadı.')}
<table><tr><th>İş</th><th>T-SQL</th><th>PL/SQL</th></tr>
<tr><td>Çıkış parametresi</td><td><code>@p INT OUTPUT</code></td><td><code>p OUT NUMBER</code>, iki yönlü <code>IN OUT</code></td></tr>
<tr><td>Sonuç kümesi döndürme</td><td><code>SELECT</code> yeter</td><td><code>OUT SYS_REFCURSOR</code></td></tr>
<tr><td>Dinamik SQL</td><td><code>sp_executesql</code></td><td><code>EXECUTE IMMEDIATE ... USING</code></td></tr>
<tr><td>Toplu okuma</td><td>Küme tabanlı <code>SELECT</code></td><td><code>BULK COLLECT INTO</code></td></tr>
<tr><td>Toplu yazma</td><td>Küme tabanlı DML</td><td><code>FORALL</code></td></tr>
<tr><td>Hata</td><td><code>THROW</code></td><td><code>RAISE_APPLICATION_ERROR(-20001, ...)</code></td></tr></table>
${nor(`CREATE OR REPLACE PROCEDURE zam_yap (p_dept IN NUMBER, p_oran IN NUMBER, p_adet OUT NUMBER) AS
  TYPE t_id IS TABLE OF employees.emp_id%TYPE;
  v_id t_id;
BEGIN
  SELECT emp_id BULK COLLECT INTO v_id FROM employees WHERE dept_id = p_dept;
  FORALL i IN 1 .. v_id.COUNT
    UPDATE employees SET salary = salary * (1 + p_oran) WHERE emp_id = v_id(i);
  p_adet := SQL%ROWCOUNT;
  COMMIT;
EXCEPTION
  WHEN OTHERS THEN
    ROLLBACK;
    RAISE;
END;
/`)}
<h2>Neden BULK COLLECT ve FORALL?</h2>
<p>PL/SQL motoru ile SQL motoru ayrıdır; döngüde her satırda iki motor arasında geçiş olur. Bu iki yazım geçişi topluca yapar, büyük hacimde belirgin hızlandırır. Tek SQL ifadesiyle yazılabiliyorsa o yine en iyisidir.</p>
${nor(`-- Açık imleç: OPEN, FETCH, CLOSE
DECLARE
  CURSOR c IS SELECT name, price FROM products WHERE category = 'Kitap';
  v c%ROWTYPE;
BEGIN
  OPEN c;
  LOOP
    FETCH c INTO v;
    EXIT WHEN c%NOTFOUND;
    DBMS_OUTPUT.PUT_LINE(v.name);
  END LOOP;
  CLOSE c;
END;
/
-- Dinamik SQL, bağlı değişkenle
EXECUTE IMMEDIATE 'UPDATE products SET stock = 0 WHERE product_id = :1' USING v_id;`)}`,
[
  mc('Yukarıdaki <code>zam_yap</code> yordamında <code>p_adet</code> neyi döndürür?', ['FORALL ile güncellenen toplam satır', 'BULK COLLECT ile okunan bellek boyutu', 'Departmandaki en yüksek maaşı', 'Hep 1; yalnız son satırı sayar'], 0, 'SQL%ROWCOUNT son DML\'in etkilediği satırdır; FORALL bütün turları toplar.'),
  mc('Bir PL/SQL döngüsü 1 milyon satırı tek tek UPDATE ediyor, çok yavaş. İlk bakılacak yöntem?', ['Tek UPDATE ifadesi ya da FORALL', 'Her turda ayrı bir COMMIT eklemek', 'İmleci iki kez açıp kapatmak', 'İmleci FOR döngüsüne çevirmek'], 0, 'Motor geçişini azalt. Mümkünse tek SQL ifadesi.'),
  mc('<code>FETCH c INTO v; EXIT WHEN c%NOTFOUND;</code> satırlarının sırası ters olursa ne olur?', ['Okumadan önce çıkış denetlenir, mantık bozulur', 'Derleyici sırayı kendiliğinden düzeltir', 'Sonuç aynıdır, sıra hiç önemli değildir', 'İmleç otomatik kapanır ve kod başa döner'], 0, '%NOTFOUND son FETCH\'in sonucudur; önce okunmalı.'),
  mc('Kullanıcı girdisini <code>EXECUTE IMMEDIATE</code> içine nasıl vermelisin?', ['USING ile bağlı değişken', 'Metne birleştirerek doğrudan', 'DBMS_OUTPUT üzerinden', 'Tek tırnakları silerek'], 0, 'Parametre, injection savunmasının temeli: T-SQL\'de sp_executesql ile aynı fikir.'),
  mc('<code>IN OUT</code> parametre neyi ifade eder?', ['Değer alınır, değiştirilip geri verilir', 'Yalnız dışarı değer verir, içeri almaz', 'Sabittir, yordam değiştiremez', 'Yalnız imleçler için kullanılır'], 0, 'IN yalnız okunur; OUT yalnız yazılır; IN OUT ikisi.'),
  mc('T-SQL\'deki <code>SELECT</code> ile sonuç döndüren yordamın PL/SQL karşılığı hangisi?', ['OUT SYS_REFCURSOR parametresi', 'DBMS_OUTPUT ile satır satır yazmak', 'Paket gövdesinde genel değişken', 'FORALL ile dış tabloya yazmak'], 0, 'Klasik kalıpta REF CURSOR açılıp istemciye verilir. Oracle 12c ve sonrasında DBMS_SQL.RETURN_RESULT de vardır; okuma düzeyinde bilmen yeter.')
]);

ders('kopru-ssis-adf', KOPRU, 'B2', 20, 'Köprü: SSIS ve Azure Data Factory, SQL gözüyle',
  'Araç kavramlarını bildiğin SQL\'e eşlemek. Lookup bir JOIN, no match çıkışı bir LEFT JOIN süzgecidir.',
  'ssis integration services control flow data flow lookup no match azure data factory adf pipeline activity linked service integration runtime',
`${KN('SSIS Windows masaüstü aracı ister, ADF Azure hesabı ister; burada ikisi de açılmaz. Kavramları ve ne zaman hangisinin seçildiğini öğretir. Kullanmak için Visual Studio SSDT ya da Azure deneme aboneliğiyle öğrenme bölümlerini izle. ETL mantığı için <b>ETL işletimi</b> ve <b>Boyut yüklemesi</b> derslerine bak.')}
<h2>SSIS</h2>
<table><tr><th>Kavram</th><th>Anlamı</th><th>SQL karşılığı</th></tr>
<tr><td>Control flow</td><td>Görevlerin sırası, bağımlılığı</td><td>Saklı yordamdaki adım sırası</td></tr>
<tr><td>Data flow</td><td>Kaynak, dönüşüm, hedef boru hattı</td><td><code>INSERT ... SELECT</code></td></tr>
<tr><td>Lookup</td><td>Referansla eşleme (eşitlik)</td><td><code>JOIN</code>, bak: vekil anahtar eşleme</td></tr>
<tr><td>No Match çıkışı</td><td>Eşleşmeyen satırlar</td><td><code>LEFT JOIN ... IS NULL</code></td></tr>
<tr><td>Error çıkışı</td><td>İşlenemeyen satır</td><td>Red tablosu</td></tr></table>
<p>Lookup'ta iki tuzak: varsayılan olarak eşleşmeyen satır <b>hata</b> sayılır, Redirect seçilmezse paket durur. Tam önbellek modunda karşılaştırma büyük/küçük harfe duyarlıdır; birden çok eşleşmede yalnız ilki döner.</p>
<h2>Azure Data Factory</h2>
<table><tr><th>Kavram</th><th>Anlamı</th></tr><tr><td>Pipeline</td><td>Etkinliklerin mantıksal grubu</td></tr><tr><td>Activity</td><td>Tek adım: kopyala, yordam çalıştır</td></tr><tr><td>Linked service</td><td>Bağlantı bilgisi</td></tr><tr><td>Dataset</td><td>Bağlantıdaki verinin tarifi</td></tr><tr><td>Integration runtime</td><td>İşin çalıştığı altyapı</td></tr><tr><td>Trigger</td><td>Ne zaman başlayacağı</td></tr></table>
<p>Seçim çoğu zaman altyapıdan gelir: şirket içi SQL Server ve mevcut paket birikimi SSIS'te tutar, bulut ağırlıklı kurulum ADF'ye gider. ADF var olan SSIS paketlerini de çalıştırabilir. Hangi araç olursa olsun iş kuralı SQL'dedir: <b>Bir paket hatasının çoğu veri sorunudur</b>, araç menüsü değil.</p>`,
[
  { t: 'sql', q: '<p>Lookup match çıkışı: temiz tutarlı ham hareketleri güncel şube sürümüyle eşle; <code>kaynak_no</code>, <code>sube_key</code>. Yalnız eşleşenler, sırala, tekil.</p>', sol: "SELECT DISTINCT h.kaynak_no, d.sube_key FROM etl_stg_hareket h JOIN etl_dim_sube d ON d.sube_kodu = h.sube_kodu AND d.guncel = 1 WHERE TRY_CONVERT(DECIMAL(12, 2), h.tutar) IS NOT NULL ORDER BY h.kaynak_no;", hint: 'Lookup eşitliği JOIN.', base: 'tsql', dl: ['tsql'], ord: true, ynl: ["SELECT DISTINCT h.kaynak_no, d.sube_key FROM etl_stg_hareket h LEFT JOIN etl_dim_sube d ON d.sube_kodu = h.sube_kodu AND d.guncel = 1 WHERE TRY_CONVERT(DECIMAL(12, 2), h.tutar) IS NOT NULL ORDER BY h.kaynak_no;"] },
  sq('Lookup no match çıkışı: boyutta eşleşmeyen ham hareketler, Redirect edilmiş gibi: <code>kaynak_no</code>, <code>sube_kodu</code>. Sırala.', "SELECT h.kaynak_no, h.sube_kodu FROM etl_stg_hareket h LEFT JOIN etl_dim_sube d ON d.sube_kodu = h.sube_kodu WHERE d.sube_key IS NULL ORDER BY h.kaynak_no;", 'LEFT JOIN ... IS NULL.', { ord: true, ynl: ["SELECT h.kaynak_no, h.sube_kodu FROM etl_stg_hareket h JOIN etl_dim_sube d ON d.sube_kodu = h.sube_kodu ORDER BY h.kaynak_no;"] }),
  mc('SSIS Lookup\'ta eşleşmeyen satır için hiçbir ayar yapılmadı. Ne olur?', ['Hata sayılır, paket varsayılanda başarısız olur', 'Sessizce atılır, paket başarıyla biter', 'Hedefe NULL anahtarla yazılır, uyarı yok', 'Lookup satırı otomatik referansa ekler'], 0, 'Varsayılan davranış hatadır. Redirect rows to no match output ile ayrılır.'),
  mc('ADF\'de sunucu adı ve kimlik bilgisini tutan nesne hangisi?', ['Linked service', 'Dataset tanımı', 'Pipeline etkinliği', 'Trigger nesnesi'], 0, 'Dataset veriyi tarif eder, bağlantıyı linked service tutar.'),
  mc('Lookup referans verisi yüz milyon satır, girdi bin satır. Hangi önbellek modu makul?', ['Kısmi ya da önbelleksiz', 'Tam önbellek, her zaman', 'Önbellek dosyasını elle silmek', 'Fark etmez, sonuçlar aynı olur'], 0, 'Tam önbellek bütün referansı belleğe alır. Az satırda sorgulamak daha ucuz olabilir. Ayrıca karşılaştırma kuralı moda göre değişir: sonuç da değişebilir.')
]);

const JOB_SORGU = `SELECT j.name AS is_adi, h.step_name AS adim, h.sql_message_id AS hata_no, h.message AS ileti, h.run_date AS tarih
FROM msdb.dbo.sysjobhistory AS h
JOIN msdb.dbo.sysjobs AS j ON j.job_id = h.job_id
WHERE h.run_status = 0 AND h.step_id > 0
ORDER BY h.run_date DESC, h.instance_id`;
ders('kopru-agent', KOPRU, 'B2', 15, 'Köprü: SQL Agent ve iş geçmişi',
  'Gece işi neden düştü? İş, adım, zamanlama, operatör ve geçmiş tablosunu okumak.',
  'sql server agent job step schedule operator alert sysjobhistory sysjobs run_status',
`${KN('Zamanlayıcı burada çalışmaz; iş tanımlanamaz. Görevlerde gerçek tablonun <code>msdb.dbo.sysjobhistory</code> kurgu kopyasını okursun.')}
<table><tr><th>Kavram</th><th>Anlamı</th></tr><tr><td>İş (job)</td><td>Çalıştırılacak adımlar bütünü</td></tr><tr><td>Adım (step)</td><td>T-SQL, PowerShell, paket; başarı ve hatada ne olacağı tanımlanır</td></tr><tr><td>Zamanlama</td><td>Ne zaman</td></tr><tr><td>Operatör</td><td>Bildirim alan kişi</td></tr><tr><td>Uyarı (alert)</td><td>Belirli hata ya da eşik olunca tetiklenir</td></tr></table>
<h2>Geçmiş tablosu</h2>
<p><code>run_status</code>: 0 başarısız, 1 başarılı, 2 yeniden deneme, 3 iptal, 4 sürüyor. <code>step_id</code> 0 işin genel sonucudur. <code>run_date</code> <code>yyyyMMdd</code>, <code>run_time</code> ve <code>run_duration</code> <code>HHmmss</code> biçiminde <b>tam sayıdır</b>: 10203, 1 saat 2 dakika 3 saniye.</p>
${ts(JOB_SORGU + ';')}
<div class="tip"><b>İzleme</b>Başarısızlık bildirimi tanımlı değilse iş günlerce sessizce düşebilir. Üstteki kayıtta aynı adım iki gündür düşüyor. İzleme adımı sorgu kadar işin parçasıdır.</div>`,
[
  sq('Düşen adımlar: başarısız adımlar: <code>is_adi</code>, <code>adim</code>, <code>hata_no</code>, <code>ileti</code>, <code>tarih</code>. Yeni tarih önce, sonra <code>instance_id</code>.', JOB_SORGU + ';', 'step_id 0 işin özetidir, çıkar.', { ord: true, ynl: ["SELECT j.name AS is_adi, h.step_name AS adim, h.sql_message_id AS hata_no, h.message AS ileti, h.run_date AS tarih FROM msdb.dbo.sysjobhistory AS h JOIN msdb.dbo.sysjobs AS j ON j.job_id = h.job_id WHERE h.run_status = 0 ORDER BY h.run_date DESC, h.instance_id;"] }),
  sq('Başarı oranı: her iş için son sonuç satırlarında (<code>step_id = 0</code>) çalışma ve başarı: <code>is_adi</code>, <code>calisma</code>, <code>basarili</code>. İş adına göre. Hiç çalışmamış iş de <code>0</code> ile görünsün.', "SELECT j.name AS is_adi, COUNT(h.instance_id) AS calisma, COALESCE(SUM(CASE WHEN h.run_status = 1 THEN 1 ELSE 0 END), 0) AS basarili\nFROM msdb.dbo.sysjobs AS j\nLEFT JOIN msdb.dbo.sysjobhistory AS h ON h.job_id = j.job_id AND h.step_id = 0\nGROUP BY j.name\nORDER BY is_adi;", 'LEFT JOIN, koşul ON içinde.', { ord: true, ynl: ["SELECT j.name AS is_adi, COUNT(h.instance_id) AS calisma, SUM(CASE WHEN h.run_status = 1 THEN 1 ELSE 0 END) AS basarili FROM msdb.dbo.sysjobs AS j JOIN msdb.dbo.sysjobhistory AS h ON h.job_id = j.job_id WHERE h.step_id = 0 GROUP BY j.name ORDER BY is_adi;"] }),
  sq('Süre çevirme: <code>run_duration</code> <code>HHmmss</code> tam sayı. <code>ETL gunluk yukleme</code> işinin genel sonuç satırlarında süreyi saniyeye çevir: <code>run_date</code>, <code>saniye</code>. Tarih sırasıyla.', "SELECT h.run_date, (h.run_duration / 10000) * 3600 + ((h.run_duration % 10000) / 100) * 60 + (h.run_duration % 100) AS saniye\nFROM msdb.dbo.sysjobhistory AS h\nJOIN msdb.dbo.sysjobs AS j ON j.job_id = h.job_id\nWHERE j.name = 'ETL gunluk yukleme' AND h.step_id = 0\nORDER BY h.run_date;", 'Bölme ve mod ile saat, dakika, saniye.', { ord: true, must: [{ re: '10000', msg: 'HHmmss değerini parçala.' }], ynl: ["SELECT h.run_date, h.run_duration AS saniye FROM msdb.dbo.sysjobhistory AS h JOIN msdb.dbo.sysjobs AS j ON j.job_id = h.job_id WHERE j.name = 'ETL gunluk yukleme' AND h.step_id = 0 ORDER BY h.run_date;"] }),
  mc('<code>run_duration</code> 13000 yazıyor. Süre nedir?', ['1 saat 30 dakika', '13 saniye', '13 dakika', '13.000 milisaniye'], 0, 'HHmmss: 01 30 00. Baştaki sıfır tam sayıda düşer.'),
  mc('Adım 2 iki gündür aynı NULL hatasıyla düşüyor, kimsenin haberi yok. İlk eksik ne?', ['İşe bildirim tanımlamak', 'Adım 2\'yi işten kaldırmak', 'Sunucuyu yeniden başlatmak', 'İşi hafta sonuna ertelemek'], 0, 'Düzeltme ikinci adım; önce hatanın duyulması gerekir.')
]);

ders('kopru-kurulum', KOPRU, 'B2', 15, 'Köprü: kurulum, yama, göç ve kapasite kontrol listesi',
  'DBA ilanlarında geçen işlerin kavramsal listesi. Yapmayı değil, ne sorulacağını bilmeyi hedefler.',
  'sql server kurulum yapılandırma max server memory tempdb cumulative update yama göç migration kapasite planlama sp_configure',
`${KN('Bu site sunucu kurmaz. Bu sayfa bir kontrol listesidir, kurulum dersi değildir. DBA olmak hedefinse bir deneme makinesine Developer Edition kurmak ve bu listeyi elle yapmak gerekir; Kesit veri ve BI odaklıdır, DBA kursu yerine geçmez.')}
<h2>Kurulum ve ilk ayarlar</h2>
<ul><li><b>Kimlik:</b> Servisleri düşük yetkili ayrı hesaplarla çalıştır.</li><li><b>Disk:</b> Veri, günlük ve yedek ayrı; yedek aynı diskte olursa olayda birlikte gider.</li><li><b>Sıralama (collation):</b> Sonradan değiştirmek zahmetlidir, baştan doğru seç.</li><li><b>Bellek:</b> <code>max server memory</code> ile işletim sistemine pay bırak.</li><li><b>tempdb:</b> Kurulum ekranında dosya sayısı ve yerini gözden geçir.</li></ul>
${nor(`-- Çalışmaz, başvuru: motorda sunucu ayarı yok
EXEC sp_configure 'show advanced options', 1;
RECONFIGURE;
EXEC sp_configure 'max server memory (MB)', 57344;
RECONFIGURE;
SELECT @@VERSION;`)}
<h2>Yama</h2>
<p>SQL Server güncellemeleri toplu güncellemelerle (CU) gelir. Önce test ortamı, önce yedek, sonra bakım penceresi; AG'de önce ikincil. Geri dönüş planı olmadan yama yapılmaz.</p>
<h2>Sürüm yükseltme ve göç</h2>
<ol><li>Envanter: login, Agent işi, bağlı sunucu, uç nokta: veritabanı dışındakiler de taşınır.</li><li>Uyumluluk değerlendirmesi.</li><li>Query Store açıkken önce eski <b>uyumluluk düzeyinde</b> taşı, sonra yükselt: plan değişimi yakalanabilsin.</li><li>Prova, süre ölçümü, geri dönüş.</li></ol>
<h2>Kapasite</h2>
<p>Yedek boyutu geçmişi, büyümeyi kaba tahmin için kullanılabilen ve hemen elde olan bir veridir. Disk, bellek ve CPU için büyüme eğilimi izlenir; sınır görünmeden satın alma süreci başlar.</p>`,
[
  sq('Büyüme: <code>ilgaz_portal</code> fark yedeklerinin boyutu (<code>backup_size</code> bayttır, 1048576\'ya böl): <code>tarih</code> (tarih kısmı), <code>boyut_mb</code>, önceki güne göre <code>artis_mb</code>. Tarih sırasıyla.', "SELECT CAST(backup_start_date AS DATE) AS tarih, backup_size / 1048576 AS boyut_mb, (backup_size - LAG(backup_size) OVER (ORDER BY backup_start_date)) / 1048576 AS artis_mb\nFROM msdb.dbo.backupset\nWHERE database_name = 'ilgaz_portal' AND type = 'I'\nORDER BY tarih;", 'LAG.', { ord: true, must: [{ re: 'LAG', msg: 'Görev LAG istiyor.' }], ynl: ["SELECT CAST(backup_start_date AS DATE) AS tarih, backup_size / 1048576 AS boyut_mb, 0 AS artis_mb FROM msdb.dbo.backupset WHERE database_name = 'ilgaz_portal' AND type = 'I' ORDER BY tarih;"] }),
  sq('Kaba tahmin: yedek diskinde 500 GB (512.000 MB) boş var. Haftalık tam yedek <code>ilgaz_portal</code> ve <code>raporlama</code> son tam yedek boyutlarının toplamı kadar yer tutuyor (copy-only hariç). Kaç hafta yeter: <code>hafta</code> (tam sayı, aşağı yuvarla).', "WITH son AS (\n  SELECT database_name, backup_size, ROW_NUMBER() OVER (PARTITION BY database_name ORDER BY backup_start_date DESC) AS rn\n  FROM msdb.dbo.backupset\n  WHERE type = 'D' AND is_copy_only = 0 AND database_name IN ('ilgaz_portal', 'raporlama')\n)\nSELECT FLOOR(512000.0 / (SUM(backup_size) / 1048576.0)) AS hafta FROM son WHERE rn = 1;", 'ROW_NUMBER, sonra toplam.', { must: [{ re: 'ROW_NUMBER|MAX', msg: 'Son yedeği seç.' }], ynl: ["SELECT FLOOR(512000.0 / (SUM(backup_size) / 1048576.0)) AS hafta FROM msdb.dbo.backupset WHERE type = 'D' AND database_name IN ('ilgaz_portal', 'raporlama');"] }),
  mc('Yedek dosyaları veri ile aynı diskte. Risk nedir?', ['Disk bozulunca yedek de gider', 'Yedek işi daha uzun sürer', 'Yedekler sıkıştırılamaz hâle gelir', 'Geri yükleme yetkisi kaybolur'], 0, 'Yedeğin amacı arızadan bağımsız kalmak.'),
  mc('Sürüm yükseltmede plan değişimi riskini azaltan yaygın sıra hangisi?', ['Eski uyumluluk düzeyinde taşı, Query Store topla, sonra yükselt', 'Önce uyumluluğu yükselt, sorun çıkarsa tabloları yeniden kur', 'Query Store kapat, istatistikleri sil, sonra yükselt', 'Uyumluluk düzeyini hiç değiştirme, sonsuza dek eskide kal'], 0, 'Query Store önce-sonra karşılaştırması verir; gerileyen sorguda eski plan zorlanabilir.'),
  mc('Göçte kolay unutulan hangisidir?', ['Login ve Agent işleri', 'Tablo sütunları ve veri tipleri', 'Birincil anahtar tanımları', 'Görünüm tanımları'], 0, 'Bunlar veritabanının dışında, sunucu düzeyindedir: yedek onları taşımaz.')
]);

/* ------------------------------------------------------------------ Öğrenme yolları */
const PA = {}; window.SQLP_PATHS.forEach(p => PA[p.id] = p);
const sonra = (pid, ref, ids) => { const p = PA[pid]; const i = p.lessons.indexOf(ref); if (i < 0) throw new Error('c41: ' + pid + ' yolunda yok ' + ref); const yeni = ids.filter(x => !p.lessons.includes(x)); p.lessons.splice(i + 1, 0, ...yeni); p.opt = (p.opt || []).filter(x => !yeni.includes(x)); };
const optE = (pid, ids) => { const p = PA[pid]; p.opt = (p.opt || []).concat(ids.filter(x => !p.lessons.includes(x) && !(p.opt || []).includes(x))); };
const comp = (pid, ad, ids) => { const c = (PA[pid].comp || []).find(x => x.t === ad); if (!c) throw new Error('c41: yetkinlik yok ' + pid + ' ' + ad); ids.forEach(x => { if (PA[pid].lessons.includes(x) && !c.l.includes(x)) c.l.push(x); }); };
/* T-SQL */
sonra('tsql', 'ts-proc', ['ts-proc-ileri']); sonra('tsql', 'ts-hata', ['ts-hata-ileri']); sonra('tsql', 'ts-merge', ['ts-dml-join']); sonra('tsql', 'ts-trigger', ['ts-nesne-ileri']);
comp('tsql', 'Programlama', ['ts-proc-ileri', 'ts-hata-ileri']); comp('tsql', 'Veritabanı nesneleri', ['ts-nesne-ileri']); comp('tsql', 'Veri değiştirme ve işlemler', ['ts-dml-join']);
optE('tsql', ['dba-engelleme', 'dba-dmv', 'etl-hata', 'kopru-agent']);
/* DBA */
sonra('dba', 'ts-proc', ['ts-proc-ileri']); sonra('dba', 'ts-hata', ['ts-hata-ileri']);
sonra('dba', 'dba-yedek', ['dba-yedek-zincir']); sonra('dba', 'dba-bakim', ['dba-indeks-bakim', 'kopru-agent']); sonra('dba', 'dba-izleme', ['dba-dmv', 'dba-engelleme']); sonra('dba', 'ts-guvenlik', ['dba-yetki']); sonra('dba', 'dba-ha', ['kopru-hadr', 'kopru-kurulum']);
comp('dba', 'Koruma', ['dba-yedek-zincir']); comp('dba', 'Operasyon', ['dba-indeks-bakim', 'kopru-agent', 'kopru-kurulum']); comp('dba', 'Performans', ['dba-dmv']); comp('dba', 'İşlemler ve kilitler', ['dba-engelleme']); comp('dba', 'Güvenlik', ['dba-yetki']); comp('dba', 'Süreklilik ve ölçek', ['kopru-hadr']); comp('dba', 'SQL ve T-SQL temeli', ['ts-proc-ileri', 'ts-hata-ileri']);
optE('dba', ['ts-dml-join', 'ts-nesne-ileri']);
/* Veri mühendisi */
sonra('muhendis', 'de-etl', ['etl-hata']); sonra('muhendis', 'de-scd', ['etl-boyut']); sonra('muhendis', 'dwh', ['dwh-fact', 'dwh-tasarim']); sonra('muhendis', 'de-dbt', ['kopru-ssis-adf']);
comp('muhendis', 'Veri boru hatları', ['etl-hata', 'kopru-ssis-adf']); comp('muhendis', 'Değişen veri', ['etl-boyut']); comp('muhendis', 'Ambar ve performans', ['dwh-fact', 'dwh-tasarim']);
optE('muhendis', ['ts-dml-join', 'ts-proc-ileri', 'ts-hata-ileri']);
/* BI ve diğerleri */
sonra('bi', 'cte', ['dwh-fact', 'dwh-tasarim']); comp('bi', 'Veri modeli', ['dwh-fact', 'dwh-tasarim']); optE('bi', ['etl-hata', 'etl-boyut', 'kopru-ssis-adf']);
sonra('uzman', 'plsql', ['kopru-plsql']);
optE('uzman', ['dba-engelleme', 'dba-dmv', 'ts-dml-join', 'ts-proc-ileri', 'ts-hata-ileri', 'ts-nesne-ileri', 'dwh-fact', 'etl-boyut']);
optE('analist', ['dwh-fact']); optE('backend', ['dba-engelleme', 'ts-dml-join']); optE('mulakat', ['ts-dml-join', 'dba-engelleme', 'dwh-fact', 'etl-boyut']);
optE('sql-operasyon', ['dba-dmv', 'dba-yetki', 'dba-engelleme', 'dba-indeks-bakim']);
})();
