/* Kesit SQL: SQL Server Operasyon ve Güvenlik öğrenme yolu. Veri: ops.js (tamamen kurgusal, tohumlu).
   SQL Server davranışları Microsoft Learn'den alındı, burada çalıştırılmadı. Metindeki veri sayıları say() ile yazılır, opt_denetim.js yeniden hesaplar.
   ynl: reddedilmesi gereken yanlış cevaplar; plan: SQLite planı denetimi; dn: şık dengesi denetimi. */
(function () {
'use strict';
const LS = window.SQLP_LESSONS;
const MOD = 'SQL Server Operasyon';
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const box = s => '<pre class="code">' + esc(s) + '</pre>';
const eqp = s => '<pre class="code" data-na="tsql pg mysql oracle bq">' + esc(s) + '</pre>';
const nor = s => '<pre class="code" data-norun>' + esc(s) + '</pre>';
const trn = n => Number(n).toLocaleString('tr-TR');
const SAY = window.SQLP_OPT_SAYI = window.SQLP_OPT_SAYI || [];
const say = (ad, deger, sql) => { SAY.push({ ad, deger, sql }); return typeof deger === 'number' ? trn(deger) : String(deger); };
const mc = (q, o, a, why) => ({ t: 'mc', q: '<p>' + q + '</p>', o, a, why, dn: 1 });
const sq = (q, sol, hint, x) => Object.assign({ t: 'sql', q: '<p>' + q + '</p>', sol, hint }, x || {});
const IDX = ['sqlite', 'tsql', 'pg', 'mysql', 'oracle'];
const SQLITE = { base: 'sqlite', dl: ['sqlite'] };
const TSQL = { base: 'tsql', dl: ['tsql'] };
const KURGU = '<div class="note"><b>Veri kurgudur</b><code>ops_</code> tabloları hayali bir portal için tohumlu üreteçle kuruldu. Gerçek bir sistemden alınmadı; süre ve okuma değerleri ölçüm değildir. Motor SQLite olduğu için günlükteki SQL Server sorguları çalıştırılmaz, metin olarak incelenir. Tabloları sorgularsın, sistem yönetimi komutlarını yalnız okursun.</div>';
const FP = "REGEXP_REPLACE(REGEXP_REPLACE(query_text, '''[^'']*''', '?'), '[0-9]+', '?')";
const SALI0 = "'2024-11-12 08:00:00'", SALI1 = "'2024-11-12 12:00:00'";
const ders = (id, title, sum, en, body, ex) => LS.push({ id, lv: 'C1', mod: MOD, min: 25, title, sum, en, body, ex });

/* ------------------------------------------------------------------ 1. Kaynak kodu değişmeyen uygulama */
const AGIRLIK = `SELECT query_name, plan_id,
       SUM(exec_count) AS calisma,
       ROUND(1.0 * SUM(exec_count * avg_reads) / SUM(exec_count)) AS ort_okuma
FROM ops_plan_stats
GROUP BY query_name, plan_id
ORDER BY query_name, plan_id;`;
ders('ops-kaynak', 'Kaynak kodu değiştirilemeyen uygulamada performans: indeks, Query Store, plan zorlama',
  'Sorgu metnine dokunamadığında elinde kalan seçenekler, sırası, geri alınması ve riskleri. Araya giren ağ geçidi mimarisi de kavram olarak.',
  'query store force plan plan guide query store hints missing index vendor application reverse proxy gateway',
`<h2>Senaryo: sorgu metni senin değil</h2>
<p>Satın alınmış bir uygulama yavaşladı. Üretici sorguyu değiştirmiyor ya da sürüm aylar sonra gelecek. Elinde kod yok, ama veritabanı senin. Peki neye dokunabilirsin? Bu dersin konusu seçenekleri ve özellikle <b>riskini</b> bilmek.</p>
${KURGU}
<div class="tip"><b>Önkoşul</b>Plan okuma ve sütun sırası burada tekrar anlatılmıyor: <b>Sorgu planı okumak</b> ve <b>İndeks tasarımı</b> derslerine bak. Sunucu tarafında "şu an ne çalışıyor" sorusu <b>İzleme: DMV'ler</b> dersindedir.</div>
<h2>Seçenekler, ucuzdan pahalıya</h2>
<table>
<tr><th>Seçenek</th><th>Neyi değiştirir</th><th>Riski</th><th>Geri alma</th></tr>
<tr><td>İstatistik güncelleme</td><td>Motorun satır tahminini</td><td>Planlar değişebilir, tersine de dönebilir</td><td>Eski istatistiğe dönmek zordur, plan zorlama gerekir</td></tr>
<tr><td>İndeks</td><td>Okuma yolunu</td><td>Her yazmaya biner, yer kaplar, başka sorgunun planını da değiştirebilir</td><td><code>DROP INDEX</code></td></tr>
<tr><td>Query Store ile plan zorlama</td><td>Tek sorgunun planını</td><td>Veri değişince plan eskir, zorlama başarısız olabilir</td><td><code>sp_query_store_unforce_plan</code></td></tr>
<tr><td>Query Store ipucu (hint)</td><td>Tek sorgunun derleme davranışını</td><td>Belge son çare der, veri değişince yeniden değerlendir</td><td><code>sys.sp_query_store_clear_hints</code></td></tr>
<tr><td>Plan kılavuzu (plan guide)</td><td>Metni eşleşen sorguyu</td><td>Belge son çare der; bazı türlerde metin karakter karakter eşleşmeli</td><td>Kılavuzu kaldır</td></tr>
<tr><td>Uyumluluk düzeyi, zorunlu parametreleme</td><td>Bütün veritabanını</td><td>Etki alanı geniş, bütün yük için test ister</td><td>Ayarı geri al</td></tr>
</table>
<p>Hangisini seçersen seç, üreticinin destek koşullarını oku: bazı sözleşmeler şemaya eklenen nesneleri sınırlar. Eklediğin nesneyi kayıt altına al, yeni sürüm yüklemesinde kaybolabilir ya da çakışabilir.</p>
<h2>İndeks: en sık çözüm, kör uygulanırsa en sık hata</h2>
<p>Sorgu metni sabitse indeks tasarımı o metne uyar. Planda sıralama kalkıyor mu, arama yapılıyor mu, ölç:</p>
${eqp(`EXPLAIN QUERY PLAN
SELECT event_at, record_id FROM ops_access_log
WHERE login_name = 'svc_portal' AND event_at >= '2024-11-12';`)}
${eqp(`CREATE INDEX ix_hesap_zaman ON ops_access_log (login_name, event_at);
EXPLAIN QUERY PLAN
SELECT event_at, record_id FROM ops_access_log
WHERE login_name = 'svc_portal' AND event_at >= '2024-11-12';`)}
<h3>Eksik indeks önerileri</h3>
<p>SQL Server planda ve <code>sys.dm_db_missing_index_details</code> görünümünde indeks önerir. Belgeye göre bunlar <b>reçete değildir</b>:</p>
<ul>
<li>Tek sorgunun çalışmadan önceki tahminine dayanır, sonradan sınanmaz.</li>
<li>Anahtar sütunları sırasız listelenir. Sırayı sen verirsin: eşitlik sütunları önce, eşitsizlik sonra.</li>
<li>Benzer öneriler çoğalır. Var olan indeksle karşılaştır, mümkünse birleştir.</li>
<li>Sunucu yeniden başlayınca veriler silinir. Query Store açıksa saklanan planlarda kalır.</li>
</ul>
<h3>Koşul fonksiyon içeriyorsa</h3>
<p>Sorguyu <code>WHERE date(event_at) = ...</code> diye yazıyorsa ve değiştiremiyorsan indeksi ifadeye kurarsın. SQLite ve PostgreSQL ifade indeksi, SQL Server hesaplanmış sütun üzerinde indeks, Oracle fonksiyon tabanlı indeks kullanır. Ayrıntısı <b>Tür dönüşümü ve fonksiyon tuzakları</b> dersinde.</p>
<h2>Query Store: planın geçmişi</h2>
<p>Query Store sorguları, planları ve çalışma istatistiklerini veritabanı başına saklar. Belgeye göre SQL Server 2016-2019'da varsayılan olarak kapalıdır, SQL Server 2022'de yeni veritabanlarında açıktır. Planı önbellekten silinse de geçmişi kalır: "Dün hızlıydı" sorusunu yanıtlamanın yolu budur.</p>
${nor(`-- Yalnız okumak için: bu komutlar burada çalışmaz
SELECT q.query_id, p.plan_id, t.query_sql_text,
       rs.count_executions, rs.avg_duration, rs.avg_logical_io_reads
FROM sys.query_store_plan p
JOIN sys.query_store_query q ON q.query_id = p.query_id
JOIN sys.query_store_query_text t ON t.query_text_id = q.query_text_id
JOIN sys.query_store_runtime_stats rs ON rs.plan_id = p.plan_id;`)}
<p>Bu derste aynı mantığı kurgusal <code>ops_plan_stats</code> tablosunda çalıştırıyoruz. Dikkat: satırlar saat başınadır, bu yüzden ortalamaların ortalaması yanlış sonuç verir. Çalışma sayısıyla <b>ağırlıklandır</b>:</p>
${box(AGIRLIK)}
<p>Üç farklı durum görüyorsun:</p>
<ul>
<li><code>rapor_ay_tur</code>: plan değişince okuma büyümüş. <b>Gerileme</b> budur.</li>
<li><code>rapor_sube_ozet</code>: plan değişmiş, okuma düşmüş. Plan değişimi tek başına kötü değildir.</li>
<li><code>rapor_sube_detay</code>: ortalamalar yakın, ama soru değerden değere değişiyor. Şubeler çok farklı büyüklükte, bir plan küçük şubede iyi, büyük şubede kötü olabilir. Tek plana zorlamak diğer değeri bozar. Bu <b>parametre koklama</b> konusudur.</li>
</ul>
<h2>Plan zorlama ve riskleri</h2>
${nor(`-- Yalnız okumak için
EXEC sp_query_store_force_plan @query_id = 8, @plan_id = 11;
EXEC sp_query_store_unforce_plan @query_id = 8, @plan_id = 11;

-- Zorlanan planları düzenli denetle
SELECT p.plan_id, p.query_id, p.force_failure_count, p.last_force_failure_reason_desc
FROM sys.query_store_plan p
WHERE p.is_forced_plan = 1;`)}
<p>Belgeden öğrendiklerimiz:</p>
<ul>
<li>Zorlama <b>garanti değildir</b>. Başarısız olursa motor sorguyu normal biçimde derler ve neden <code>sys.query_store_plan</code> içinde görünür.</li>
<li>Sonuç plan zorlanan planla aynı değil, <b>benzer</b> olabilir. Nadiren performans belirgin biçimde kötüleşir, o zaman zorlama kaldırılır.</li>
<li>Planın kullandığı nesne değişir ya da silinirse (indeks kaldırılması gibi) zorlama başarısız olmaya başlar.</li>
<li>Zorlanan plan unutulursa, veri dağılımı değiştiğinde kötü plana kilitli kalırsın. Takvime bağla.</li>
</ul>
<p>Yeni sürümlerde <b>Query Store ipuçları</b> (SQL Server 2022 ve sonrası) uygulama metnine dokunmadan ipucu ekler. Belge bunları plan kılavuzlarına göre daha kolay bulur, yine de istatistik ve indeks bakımından sonra, son çare olarak önerir.</p>
${nor(`-- Yalnız okumak için
EXEC sys.sp_query_store_set_hints @query_id = 8, @query_hints = N'OPTION (RECOMPILE)';
EXEC sys.sp_query_store_clear_hints @query_id = 8;`)}
<h2>Araya ağ geçidi koymak (reverse proxy)</h2>
<p>Uygulama ile veritabanı arasına bir ara katman koymak, koda dokunmadan sorguyu görme fırsatı verir. Bu bölüm kavramsaldır: SQL Server istemcileri TDS protokolüyle konuşur ve bu trafik tarayıcıda yakalanamaz, burada çalışan bir örneği yoktur.</p>
<table>
<tr><th>Fayda</th><th>Bedel ve risk</th></tr>
<tr><td>Kod değişmeden günlük ve ölçüm</td><td><b>Gecikme:</b> her istek ek bir ağ adımından geçer, her işlev ek süre ekler</td></tr>
<tr><td>Yönlendirme, ör. okumaları kopyaya göndermek</td><td><b>Tek hata noktası:</b> geçit düşerse uygulama düşer. Birden çok kopya ve bağlantı boşaltma gerekir</td></tr>
<tr><td>Merkezî kural, ör. bilinen kötü sorguyu engellemek</td><td><b>Darboğaz:</b> ortalamaya değil en yoğun ana göre boyutlandırılmalı</td></tr>
<tr><td>Bazı sonuçları önbellekten vermek</td><td><b>Güvenlik:</b> sorguları ve belki kişisel veriyi gördüğü için değerli bir hedeftir. Sertleştir, ayrı izle, doğrudan bağlantıyı kapat</td></tr>
</table>
<p>Şifreli bağlantıda sorguyu görmek için geçidin şifrelemeyi çözmesi gerekir; bu da güven sınırını taşır. Bağlantı durumu taşıyan bir protokolde (oturum ayarları, geçici tablolar, açık işlemler) yönlendirme de sanıldığından zordur. Karar sorusu: Query Store ve denetim günlüğü bu ihtiyacı karşılıyor mu? Çoğu zaman yeni bir parça eklemeden başla.</p>`,
[
  sq("Uygulama şu sorguyu değiştirilemez biçimde çalıştırıyor: <code>SELECT event_at, record_id FROM ops_access_log WHERE login_name = 'svc_portal' AND event_at &gt;= '2024-11-12'</code>. Hem hesap hem zaman aramada kullanılacak indeksi oluştur (adı serbest).",
    'CREATE INDEX ix_hesap_zaman ON ops_access_log (login_name, event_at);', 'Eşitlik sütunu önce, aralık sonra.',
    { nr: 1, dl: IDX, plan: { q: "SELECT event_at, record_id FROM ops_access_log WHERE login_name = 'svc_portal' AND event_at >= '2024-11-12'", must: 'login_name=\\? AND event_at>\\?', msg: 'Planın parantezinde login_name=? ve event_at>? görünmeli.' },
      ynl: ['CREATE INDEX ix_y ON ops_access_log (event_at, login_name);', 'CREATE INDEX ix_y ON ops_access_log (event_at);', 'CREATE INDEX ix_y ON ops_access_log (login_name);'] }),
  sq("Hazır rapor şu sorguyu çalıştırıyor, metni değiştiremezsin: <code>SELECT COUNT(*) FROM ops_query_log WHERE date(logged_at) = '2024-11-12'</code>. SQLite'ta bu sorgunun arama yapmasını sağlayan indeksi oluştur (adı serbest).",
    'CREATE INDEX ix_log_gun ON ops_query_log (date(logged_at));', 'İndeksteki ifade sorgudakiyle aynı olmalı.',
    Object.assign({ nr: 1, plan: { q: "SELECT COUNT(*) FROM ops_query_log WHERE date(logged_at) = '2024-11-12'", must: 'SEARCH ops_query_log', msg: 'Sorgu hâlâ arama yapmıyor. Düz logged_at indeksi bu ifadeye yaramaz.' }, ynl: ['CREATE INDEX ix_y ON ops_query_log (logged_at);', 'CREATE INDEX ix_y ON ops_query_log (login_name, logged_at);'] }, SQLITE)),
  sq('Plan başına ağırlıklı ortalama okumayı hesapla: <code>query_name</code>, <code>plan_id</code>, <code>calisma</code>, <code>ort_okuma</code> (tam sayı). Satırlar saat başına olduğu için çalışma sayısıyla ağırlıklandır. Sorgu adı ve plana göre sırala.',
    AGIRLIK.replace(/\s+/g, ' '), 'Toplam okuma bölü toplam çalışma: <code>SUM(exec_count * avg_reads) / SUM(exec_count)</code>.',
    { ord: true, ynl: ['SELECT query_name, plan_id, SUM(exec_count) AS calisma, ROUND(AVG(avg_reads)) AS ort_okuma FROM ops_plan_stats GROUP BY query_name, plan_id ORDER BY query_name, plan_id;', 'SELECT query_name, plan_id, COUNT(*) AS calisma, ROUND(AVG(avg_reads)) AS ort_okuma FROM ops_plan_stats GROUP BY query_name, plan_id ORDER BY query_name, plan_id;'] }),
  sq('Gerilemeyi bul: Birden çok planı olan sorgularda en iyi ve en kötü planın ağırlıklı ortalama okumasını yan yana getir, oranı (<code>kat</code>, 1 basamak) 2\'den büyük olanları listele: <code>query_name</code>, <code>en_iyi</code>, <code>en_kotu</code>, <code>kat</code>.',
    'WITH p AS (SELECT query_name, plan_id, 1.0 * SUM(exec_count * avg_reads) / SUM(exec_count) AS ort FROM ops_plan_stats GROUP BY query_name, plan_id) SELECT query_name, ROUND(MIN(ort)) AS en_iyi, ROUND(MAX(ort)) AS en_kotu, ROUND(MAX(ort) / MIN(ort), 1) AS kat FROM p GROUP BY query_name HAVING COUNT(*) > 1 AND MAX(ort) / MIN(ort) > 2;',
    'Önce plan başına ağırlıklı ortalama, sonra sorgu başına <code>MIN</code> ve <code>MAX</code>.',
    { ynl: ['SELECT query_name, MIN(avg_reads) AS en_iyi, MAX(avg_reads) AS en_kotu, ROUND(1.0 * MAX(avg_reads) / MIN(avg_reads), 1) AS kat FROM ops_plan_stats GROUP BY query_name HAVING MAX(avg_reads) > 2 * MIN(avg_reads);'] }),
  mc('<code>rapor_ay_tur</code> plan değişince kötüleşti ve eski plan iyi çalışıyordu. Koda dokunamıyorsun. En mantıklı ilk adım hangisi?', ['Eski planı zorlayıp sonucu izlemek, zorlamayı takvime bağlamak', 'Tablodaki bütün sütunlara indeks ekleyip planı beklemek', 'Veritabanının uyumluluk düzeyini en eski değere indirmek', 'Sunucuyu yeniden başlatıp plan önbelleğini temizlemek'], 0, 'Dar kapsamlı ve geri alınabilir. Belge bu durumu plan zorlamanın kullanım alanı olarak verir. Yeniden başlatma aynı planı getirebilir, uyumluluk düzeyi bütün veritabanını etkiler.'),
  mc('Bir sorgunun planı değerden değere çok farklı performans veriyor. Hangisi en az güvenli hamledir?', ['Parametreye duyarlı davranışı ölçüp değer gruplarını ayrı incelemek', 'Yalnız bugün iyi çalışan planı sürüme bağlı kalıcı olarak zorlamak', 'SQL Server 2022 özelliği olan Parameter Sensitive Plan seçeneğini denemek', 'Üreticiden sorguyu parametreye göre ayırmasını talep etmek'], 1, 'Tek plan bir değerde iyi, diğerinde kötü olabilir. Üstelik zorlanan plan kayıt altında değilse unutulur.'),
  mc('Planda eksik indeks önerisi çıktı: 2 anahtar, 9 içerilen sütun. Ne yaparsın?', ['Öneriyi olduğu gibi oluşturur, önerinin motor tarafından sınandığını varsayarım', 'Var olan indekslerle karşılaştırır, sırayı ben verir, sütunları tartar, sonra ölçerim', 'Öneriyi yok sayarım, çünkü eksik indeks görünümü yalnız eski sürümlerde güvenilirdir', 'Önerideki bütün sütunları anahtar yapıp indeksi tablonun clustered indeksi yaparım'], 1, 'Belge önerileri reçete saymaz: sıra verilmez, tahmine dayanır, içerilen sütunların büyüklüğü tartılmaz, çakışan öneriler çoğalır.'),
  mc('Zorlanan bir plan aylar sonra <code>force_failure_count</code> artışı gösteriyor. En olası neden?', ['Query Store dolunca zorlanan planları sırayla siler', 'Planın dayandığı indeks değişmiş ya da kaldırılmış olabilir', 'Zorlanan planlar 30 gün sonra kendiliğinden geçersiz olur', 'Sorgu artık hiç çalışmadığı için sayaç kendi kendine artıyor'], 1, 'Belge: planın başvurduğu nesneler değişir ya da silinirse zorlama başarısız olmaya başlar ve motor normal derlemeye döner.'),
  mc('Kurum, koda dokunmadan sorguları görmek için araya bir ağ geçidi koymak istiyor. Hangisi doğru bir itirazdır?', ['Geçit eklemek sorgu metnini kalıcı olarak değiştirir ve sonucu bozar', 'Yeni bir tek hata noktası ve değerli bir saldırı hedefi eklenir, gecikme artar', 'Bu mimari yalnız MySQL için vardır, SQL Server istemcileriyle kurulamaz', 'Geçit veritabanı istatistiklerini silip bütün planları yeniden derletir'], 1, 'Mimari tasarımda bu üç bedel sayılır: ek ağ adımı, yüksek erişilebilirlik gereği ve merkezde toplanan güvenlik riski. Çoğu ihtiyaç Query Store ve denetimle karşılanabilir.')
]);

/* ------------------------------------------------------------------ 2. Sorgu parmak izi */
const UST10 = `WITH n AS (SELECT ${FP} AS parmak_izi, logical_reads, duration_ms FROM ops_query_log)
SELECT parmak_izi, COUNT(*) AS calisma, SUM(logical_reads) AS toplam_okuma, ROUND(AVG(duration_ms)) AS ort_ms
FROM n
GROUP BY parmak_izi
ORDER BY toplam_okuma DESC, parmak_izi
LIMIT 10`;
ders('ops-parmak-izi', 'Sorgu parmak izi (query fingerprint): sorguları normalleştir, en maliyetli 10 sorguyu bul',
  'Sabit değerleri ayıklayıp aynı biçimdeki sorguları gruplamak, toplam ve ortalama maliyeti ayırmak, query_hash, kişisel veri riski.',
  'query fingerprint query hash normalize top queries sys.dm_exec_query_stats',
`<h2>Sorun: aynı sorgu binlerce farklı metin</h2>
<p>Günlükte şu iki satır aynı sorgudur, ama metinleri farklıdır:</p>
${nor(`SELECT customer_id, full_name, segment FROM bank_customers WHERE customer_id = 412
SELECT customer_id, full_name, segment FROM bank_customers WHERE customer_id = 87`)}
<p>Metne göre gruplarsan her biri tek satır görünür ve pahalı olan gizlenir: tek çağrısı ucuz, bin çağrısı pahalı bir sorguyu göremezsin. Çözüm, sabitleri atıp <b>parmak izi</b> çıkarmaktır:</p>
${nor(`SELECT customer_id, full_name, segment FROM bank_customers WHERE customer_id = ?`)}
${KURGU}
<h2>Ne kadar sıkışıyor?</h2>
<p>Günlükte ${say('pz-satir', 7607, 'SELECT COUNT(*) FROM ops_query_log')} satır, ${say('pz-ham', 3057, 'SELECT COUNT(DISTINCT query_text) FROM ops_query_log')} farklı metin var. Parmak izi sayısına kendin bak:</p>
${box(`SELECT COUNT(*) AS satir,
       COUNT(DISTINCT query_text) AS farkli_metin,
       COUNT(DISTINCT ${FP}) AS parmak_izi
FROM ops_query_log;`)}
<h2>Adım adım normalleştirme</h2>
<ol>
<li>Tırnaklı metinleri <code>?</code> yap: <code>'[^']*'</code>. Önce bu adım gelir, çünkü metnin içinde rakam olabilir.</li>
<li>Sayıları <code>?</code> yap: <code>[0-9]+</code>.</li>
<li>Değişken uzunluklu listeyi tek biçime indir: <code>IN (?, ?, ?)</code> ile <code>IN (?, ?)</code> aynı sorgudur.</li>
</ol>
${box(`SELECT DISTINCT ${FP} AS parmak_izi
FROM ops_query_log
WHERE query_text LIKE '%IN (%';`)}
<div class="note"><b>SQL türü farkı</b>PostgreSQL <code>REGEXP_REPLACE</code> için <code>'g'</code> bayrağı ister, yoksa yalnız ilk eşleşmeyi değiştirir. Otomatik çeviri bunu ekler. Belgeye göre SQL Server'da <code>REGEXP_REPLACE</code> 2025 sürümüyle gelir, Azure SQL'de de vardır; 2022 ve öncesinde yoktur.</div>
<h2>En maliyetli 10 sorgu</h2>
${box(UST10 + ';')}
<p>Bu haftalık listede ilk sırayı gece ETL'i alır. Bu bir sorun mu? Kullanıcı gündüz şikâyet ediyorsa değil. Liste <b>hangi zaman dilimi için</b> sorusu olmadan anlamsızdır. Salı sabahı için filtrele, sonuç değişir.</p>
<h2>Hangi "maliyet"?</h2>
<table>
<tr><th>Ölçü</th><th>Yakaladığı</th><th>Kaçırdığı</th></tr>
<tr><td>Toplam okuma</td><td>Sunucuya en çok yük bindiren</td><td>Tek çağrısı yavaş ama seyrek olan</td></tr>
<tr><td>Ortalama süre</td><td>Kullanıcının beklediği</td><td>Çok sık çalışan ucuz sorgu; sıkışıklıkta herkes yavaşlar</td></tr>
<tr><td>Çalışma sayısı</td><td>Önbellek ya da toplu okuma adayı</td><td>Az çalışan pahalı sorgu</td></tr>
</table>
<p>Süre sıkışıklıktan etkilenir: suçsuz sorgu da uzar. Okuma sayısı yapılan işi gösterir. Bu yüzden önce okumaya, sonra süreye bak.</p>
<h2>SQL Server'ın hazır parmak izi: query_hash</h2>
<p>Normalleştirmeyi elle yapmak zorunda değilsin. Belgeye göre <code>sys.dm_exec_query_stats</code> içindeki <code>query_hash</code>, yalnız sabit değerleri farklı olan sorguların toplam kaynak kullanımını bulmak içindir. <b>İzleme: DMV'ler</b> dersindeki sorgu plan başına listeler; bu sorgu biçim başına toplar.</p>
${nor(`-- Yalnız okumak için
SELECT TOP 10 qs.query_hash,
       SUM(qs.execution_count) AS calisma,
       SUM(qs.total_logical_reads) AS toplam_okuma,
       MIN(t.text) AS ornek_metin
FROM sys.dm_exec_query_stats qs
CROSS APPLY sys.dm_exec_sql_text(qs.sql_handle) t
GROUP BY qs.query_hash
ORDER BY toplam_okuma DESC;`)}
<ul>
<li>Bu görünümde satırın ömrü plana bağlıdır: plan önbellekten çıkınca kayıt da gider. Geçmişi saklamak için Query Store gerekir.</li>
<li>Yalnız biten sorguları gösterir, süren sorgular yoktur.</li>
<li>Belge, farklı <code>query_hash</code> sayısının toplam sorgu sayısına oranını iş yükünün parametresiz olup olmadığını anlamak için kullanır. Yüksek çeşitlilik, plan önbelleğinin boşa harcandığına işaret eder.</li>
</ul>
<h2>Sınırlar ve kişisel veri</h2>
<ul>
<li>Basit düzenli ifade her şeyi çözmez: yorumlar, büyük ve küçük harf, boşluk farkı, adında rakam olan sütunlar. Gerçek araçlar sorguyu ayrıştırır.</li>
<li>Sorgu metni sabit değerlerle kişisel veri taşıyabilir. Ad ya da kimlik numarası günlüğe düşer. Normalleştirilmiş metni sakla, ham metne erişimi kısıtla, saklama süresi koy.</li>
</ul>`,
[
  sq('Normalleştirmenin etkisini ölç. Tek satırda: <code>satir</code>, <code>farkli_metin</code>, <code>parmak_izi</code> (tırnaklı metinler ve sayılar <code>?</code> olduktan sonraki farklı sorgu sayısı).',
    `SELECT COUNT(*) AS satir, COUNT(DISTINCT query_text) AS farkli_metin, COUNT(DISTINCT ${FP}) AS parmak_izi FROM ops_query_log;`,
    'İki iç içe <code>REGEXP_REPLACE</code>: önce <code>\'\'\'[^\'\']*\'\'\'</code>, sonra <code>\'[0-9]+\'</code>.',
    { ynl: ["SELECT COUNT(*) AS satir, COUNT(DISTINCT query_text) AS farkli_metin, COUNT(DISTINCT REGEXP_REPLACE(query_text, '[0-9]+', '?')) AS parmak_izi FROM ops_query_log;", 'SELECT COUNT(*) AS satir, COUNT(DISTINCT query_text) AS farkli_metin, COUNT(DISTINCT query_text) AS parmak_izi FROM ops_query_log;'] }),
  sq('Toplam okumaya göre en maliyetli 10 parmak izi: <code>parmak_izi</code>, <code>calisma</code>, <code>toplam_okuma</code>, <code>ort_ms</code> (tam sayı). Toplam okumaya göre azalan, eşitlikte parmak izine göre.',
    UST10.replace(/\s+/g, ' ') + ';', 'Önce normalleştir, sonra grupla.',
    { ord: true, ynl: ['SELECT query_text AS parmak_izi, COUNT(*) AS calisma, SUM(logical_reads) AS toplam_okuma, ROUND(AVG(duration_ms)) AS ort_ms FROM ops_query_log GROUP BY query_text ORDER BY toplam_okuma DESC, parmak_izi LIMIT 10;', `SELECT ${FP} AS parmak_izi, COUNT(*) AS calisma, AVG(logical_reads) AS toplam_okuma, ROUND(AVG(duration_ms)) AS ort_ms FROM ops_query_log GROUP BY ${FP} ORDER BY toplam_okuma DESC, parmak_izi LIMIT 10;`] }),
  sq(`Zaman dilimini doğru yaz. <code>logged_at</code> indeksi bu görevde hazır. Salı 12 Kasım 09:00-11:00 arasındaki toplam okuma ve satır sayısını, sütunu fonksiyona sokmadan getir: <code>calisma</code>, <code>toplam_okuma</code>.`,
    `SELECT COUNT(*) AS calisma, SUM(logical_reads) AS toplam_okuma FROM ops_query_log WHERE logged_at >= '2024-11-12 09:00:00' AND logged_at < '2024-11-12 11:00:00';`,
    'Yarı açık aralık.',
    { plan: { setup: 'CREATE INDEX IF NOT EXISTS ix_gizli_la ON ops_query_log (logged_at)', must: 'SEARCH ops_query_log', msg: 'Plan arama yapmıyor. logged_at fonksiyona girmemeli.' },
      ynl: [`SELECT COUNT(*) AS calisma, SUM(logical_reads) AS toplam_okuma FROM ops_query_log WHERE strftime('%Y-%m-%d %H', logged_at) BETWEEN '2024-11-12 09' AND '2024-11-12 10';`, `SELECT COUNT(*) AS calisma, SUM(logical_reads) AS toplam_okuma FROM ops_query_log WHERE logged_at >= '2024-11-12 09:00:00';`, `SELECT COUNT(*) AS calisma, SUM(logical_reads) AS toplam_okuma FROM ops_query_log WHERE logged_at >= '2024-11-12 09:00:00' AND logged_at <= '2024-11-12 10:00:00';`] }),
  sq(`Salı 08:00-12:00 penceresinde en maliyetli 3 parmak izi ve toplam okumadaki payı (<code>pay</code>, %, 1 basamak): <code>parmak_izi</code>, <code>toplam_okuma</code>, <code>pay</code>. Okumaya göre azalan.`,
    `WITH n AS (SELECT ${FP} AS parmak_izi, logical_reads FROM ops_query_log WHERE logged_at >= ${SALI0} AND logged_at < ${SALI1}) SELECT parmak_izi, SUM(logical_reads) AS toplam_okuma, ROUND(100.0 * SUM(logical_reads) / SUM(SUM(logical_reads)) OVER (), 1) AS pay FROM n GROUP BY parmak_izi ORDER BY toplam_okuma DESC LIMIT 3;`,
    'Genel toplam için <code>SUM(SUM(...)) OVER ()</code>. Pencere, LIMIT uygulanmadan önce hesaplanır.',
    { ord: true, ynl: [`WITH n AS (SELECT ${FP} AS parmak_izi, logical_reads FROM ops_query_log) SELECT parmak_izi, SUM(logical_reads) AS toplam_okuma, ROUND(100.0 * SUM(logical_reads) / SUM(SUM(logical_reads)) OVER (), 1) AS pay FROM n GROUP BY parmak_izi ORDER BY toplam_okuma DESC LIMIT 3;`] }),
  sq("Değişken uzunluklu liste tek biçime insin. Üçüncü adım olarak <code>[(][?](, [?])*[)]</code> desenini <code>(?)</code> ile değiştir. <code>IN (</code> içeren satırlarda iki aşamalı ve üç aşamalı farklı biçim sayısını getir: <code>iki_adim</code>, <code>uc_adim</code>.",
    `SELECT COUNT(DISTINCT ${FP}) AS iki_adim, COUNT(DISTINCT REGEXP_REPLACE(${FP}, '[(][?](, [?])*[)]', '(?)')) AS uc_adim FROM ops_query_log WHERE query_text LIKE '%IN (%';`,
    'İki adımlı ifadeyi bir <code>REGEXP_REPLACE</code> içine daha al.',
    { ynl: [`SELECT COUNT(DISTINCT ${FP}) AS iki_adim, COUNT(DISTINCT ${FP}) AS uc_adim FROM ops_query_log WHERE query_text LIKE '%IN (%';`] }),
  mc('Haftalık en maliyetli sorgu gece ETL çıktı. Kullanıcılar salı sabahı şikâyet ediyor. Ne yaparsın?', ['ETL sorgusunu hemen durdurup sabahı yeniden gözlemlerim', 'Şikâyetin saat aralığına süzüp listeyi yeniden çıkarırım', 'ETL için indeks ekleyip haftalık sıralamayı yeniden alırım', 'Haftalık sıralama değişmediği için sorunu kullanıcıda ararım'], 1, 'Maliyet sıralaması zaman dilimine bağlıdır. Gece çalışan iş gündüz şikâyetini açıklamaz.'),
  mc('Sıkışık bir saatte ucuz bir sorgunun ortalama süresi 4 kat arttı, okunan sayfası aynı kaldı. Ne anlarsın?', ['Sorgu bozulmuştur, planı zorlanmalıdır', 'Büyük olasılıkla başka bir yükün sırasını bekliyor', 'Okuma sayısı yanlış ölçülmüştür', 'Tablodaki satır sayısı dört katına çıkmıştır'], 1, 'Yapılan iş değişmediyse süre artışı kaynak baskısından gelir. Asıl sorumluyu okuması artan sorgularda ara.'),
  mc('<code>sys.dm_exec_query_stats</code> ile en maliyetli listeyi çıkardın ama gece yeniden başlatma oldu ve sorgu görünmüyor. Neden?', ['Görünüm yalnız saklı yordamların istatistiğini tutar', 'Satırlar plana bağlıdır; plan önbellekten çıkınca gider', 'Görünüm yalnız sistem yöneticisi rolünde satır döndürür', 'Görünüm yalnız şu anda çalışan sorguları listeler'], 1, 'Belge: satırların ömrü plana bağlıdır. Geçmiş için Query Store kullanılır. Süren sorgular ise bu görünümde değil, istekler görünümündedir.'),
  mc('Sorgu metinleri ham hâliyle uzun süre saklanacak. En önemli risk hangisi?', ['Normalleştirme ileride daha yavaş çalışır', 'Sabit değerler kişisel veri taşıyabilir; erişim ve süre sınırı gerekir', 'Ham metin saklanırsa planlar önbellekten daha erken çıkar', 'Ham metin saklanırsa Query Store otomatik olarak kapanır'], 1, 'Arama değeri, ad ya da kimlik numarası günlüğe düşebilir. Normalleştirilmiş biçim çoğu analiz için yeter.')
]);

/* ------------------------------------------------------------------ 3. Önbellek kararı */
const ISABET = `WITH o AS (
  SELECT event_at, LAG(event_at) OVER (PARTITION BY record_id ORDER BY event_at, event_id) AS onceki
  FROM ops_access_log
  WHERE event_type = 'read' AND login_name = 'svc_portal'
)`;
const SN = '(julianday(event_at) - julianday(onceki)) * 86400';
ders('ops-onbellek', 'Önbellek kararı: ne zaman önbelleklenir, bayat veri riski nasıl ölçülür',
  'Okuma ve yazma oranı, tekrar oranı, tazelik gereği ve hassas veri. Isabet oranını günlükten tahmin etmek, bayat okuma riskini saymak.',
  'cache caching cache aside ttl stale data hit ratio invalidation',
`<h2>Senaryo: "Önbellek koyalım"</h2>
<p>Sistem yavaş, biri önbellek öneriyor. Önbellek hızlı bir kısayol gibi görünür ama iki soruna yol açar: <b>yanlış veri</b> ve <b>sorunu örtmek</b>. Salı sabahı pahalı sorguyu önbelleğe alsan okuma düşer, ama hatalı sorgu yerinde durur ve önbellek boşaldığı anda yük geri gelir.</p>
${KURGU}
<h2>Karar soruları</h2>
<table>
<tr><th>Soru</th><th>Önbelleğe uygun</th><th>Uygun değil</th></tr>
<tr><td>Aynı veri tekrar okunuyor mu?</td><td>Çok tekrar</td><td>Çoğu istek ıskalıyor: kontrol maliyeti kazancı geçer</td></tr>
<tr><td>Veri ne sıklıkla değişiyor?</td><td>Seyrek</td><td>Sık yazılıyor</td></tr>
<tr><td>Bayat değerin bedeli ne?</td><td>Düşük: ürün kategorisi, şube listesi</td><td>Yüksek: hesap bakiyesi, stok, yetki</td></tr>
<tr><td>Hassas mı?</td><td>Hayır</td><td>Güvenlik verisi kaynaktan okunur</td></tr>
<tr><td>Asıl sorun çözüldü mü?</td><td>Sorgu zaten iyi, yalnız çok sık</td><td>Sorgu hatalı: önce onu düzelt</td></tr>
</table>
<p>Son iki satır önemli. Mimari rehberi hassas ve güvenlik verisini önbelleğe almamayı, her zaman birincil kaynaktan okumayı önerir. Çoğu isteğin ıskaladığı durumda da önbellek zarar eder.</p>
<h2>Hangi önbellek?</h2>
<table>
<tr><th>Katman</th><th>Örnek</th><th>Kim yönetir</th><th>Nerede anlatıldı</th></tr>
<tr><td>Veritabanı belleği</td><td>Tampon havuzu, plan önbelleği</td><td>Motor, otomatik</td><td><b>Mimari</b> ve <b>Yürütme planı</b> dersleri</td></tr>
<tr><td>Hesaplanmış sonuç</td><td>Özet tablo, materialized view, indexed view</td><td>Sen, yenileme ile</td><td><b>Görünümler</b> ve <b>Toplama</b> dersleri</td></tr>
<tr><td>Uygulama önbelleği</td><td>Anahtar-değer deposu, süreç içi bellek</td><td>Uygulama</td><td>Bu ders</td></tr>
</table>
<h2>İsabet oranını önceden tahmin et</h2>
<p>Önbelleği kurmadan önce günlükten bir tahmin alırsın. Soru: <b>Bir kayıt, kendisinin önceki okumasından en çok N saniye sonra yine okunuyor mu?</b> Öyleyse önbellekten gelebilirdi.</p>
${box(ISABET + `
SELECT COUNT(*) AS okuma,
       SUM(CASE WHEN onceki IS NOT NULL AND ${SN} <= 60 THEN 1 ELSE 0 END) AS isabet_60sn,
       SUM(CASE WHEN onceki IS NOT NULL AND ${SN} <= 300 THEN 1 ELSE 0 END) AS isabet_5dk,
       SUM(CASE WHEN onceki IS NOT NULL AND ${SN} <= 900 THEN 1 ELSE 0 END) AS isabet_15dk
FROM o;`)}
<p>Bu kaba bir tahmindir: Sonsuz kapasite varsayar, önbellekten atılmayı (eviction) hesaba katmaz, süreyi son okumadan sayar (kayan süre). Süreyi uzatmanın ne kazandırdığını görmek için asıl kullanılır: bir noktadan sonra süre uzar, isabet artmaz, yalnız bayat kalma riski büyür.</p>
<h2>Bayat veri riski</h2>
<p>Yazma olduğunda önbellekteki kopya eskir. Yazmadan sonraki süre içinde gelen okumalar eski değeri görebilir:</p>
${box(`SELECT COUNT(*) AS riskli_okuma
FROM ops_access_log w
JOIN ops_access_log r
  ON r.record_id = w.record_id AND r.event_type = 'read'
 AND (julianday(r.event_at) - julianday(w.event_at)) * 86400 BETWEEN 1 AND 300
WHERE w.event_type = 'write';`)}
<p>Bu üst sınırdır: Kayıt yazmadan önce önbellekte olmayabilir. Ölçüm kararı destekler, kararı vermez. Sayı küçük olsa da o veri hesap bakiyesiyse kabul edilemez, ürün açıklamasıysa sorun değildir.</p>
<h2>Bayatlığı yönetmek</h2>
<ul>
<li><b>Süre (TTL):</b> Çok kısa olursa sürekli yeniden okursun, çok uzun olursa veri bayatlar. Süreyi erişim desenine göre seç.</li>
<li><b>Yazınca sil:</b> Önce veritabanına yaz, sonra önbellek anahtarını sil. Sıra ters olursa araya giren okuma eski değeri önbelleğe geri koyar.</li>
<li><b>Tutarlılık garantisi yok:</b> Önbelleğe sormadan başka süreç veritabanını değiştirirse önbellek bunu bilmez. Yazmadan sonra tazelik zorunluysa bu desen uygun değildir.</li>
<li><b>Boşalma:</b> Önbellek düştüğünde bütün yük veritabanına biner. Veritabanı önbelleksiz yükü taşıyamıyorsa kırılgan bir sistem kurmuşsundur.</li>
</ul>
<div class="tip"><b>Karar notu</b>Hangi veri, hangi süre, kim siliyor, önbellek düşerse ne olur, bayat veri kimi nasıl etkiler? Beş soruyu yazamıyorsan önbelleği ekleme.</div>`,
[
  sq("Kayıt başına okuma ve yazma, tek satırda özet: <code>read</code> olay sayısı (<code>okuma</code>), <code>write</code> olay sayısı (<code>yazma</code>), yazma başına okuma (<code>oran</code>, 1 basamak). Yalnız <code>svc_portal</code>.",
    "SELECT SUM(CASE WHEN event_type = 'read' THEN 1 ELSE 0 END) AS okuma, SUM(CASE WHEN event_type = 'write' THEN 1 ELSE 0 END) AS yazma, ROUND(1.0 * SUM(CASE WHEN event_type = 'read' THEN 1 ELSE 0 END) / SUM(CASE WHEN event_type = 'write' THEN 1 ELSE 0 END), 1) AS oran FROM ops_access_log WHERE login_name = 'svc_portal';",
    'Koşullu toplama. Tam sayı bölmesine dikkat.',
    { ynl: ["SELECT SUM(CASE WHEN event_type = 'read' THEN 1 ELSE 0 END) AS okuma, SUM(CASE WHEN event_type = 'write' THEN 1 ELSE 0 END) AS yazma, ROUND(1.0 * SUM(CASE WHEN event_type = 'read' THEN 1 ELSE 0 END) / SUM(CASE WHEN event_type = 'write' THEN 1 ELSE 0 END), 1) AS oran FROM ops_access_log;", "SELECT COUNT(*) AS okuma, COUNT(*) AS yazma, 1.0 AS oran FROM ops_access_log WHERE login_name = 'svc_portal';"] }),
  sq('5 dakikalık önbellek için isabet tahmini: <code>svc_portal</code> okumalarında aynı kaydın önceki okumasından en çok 300 saniye sonra gelenler. Tek satırda: <code>okuma</code>, <code>isabet</code>, <code>oran</code> (%, 1 basamak).',
    (ISABET + ` SELECT COUNT(*) AS okuma, SUM(CASE WHEN onceki IS NOT NULL AND ${SN} <= 300 THEN 1 ELSE 0 END) AS isabet, ROUND(100.0 * SUM(CASE WHEN onceki IS NOT NULL AND ${SN} <= 300 THEN 1 ELSE 0 END) / COUNT(*), 1) AS oran FROM o;`).replace(/\s+/g, ' '),
    '<code>LAG</code> her kayıt için ayrı: <code>PARTITION BY record_id</code>.',
    { ynl: [(`WITH o AS (SELECT event_at, LAG(event_at) OVER (ORDER BY event_at, event_id) AS onceki FROM ops_access_log WHERE event_type = 'read' AND login_name = 'svc_portal') SELECT COUNT(*) AS okuma, SUM(CASE WHEN onceki IS NOT NULL AND ${SN} <= 300 THEN 1 ELSE 0 END) AS isabet, ROUND(100.0 * SUM(CASE WHEN onceki IS NOT NULL AND ${SN} <= 300 THEN 1 ELSE 0 END) / COUNT(*), 1) AS oran FROM o;`), (`WITH o AS (SELECT event_at, LAG(event_at) OVER (PARTITION BY record_id ORDER BY event_at, event_id) AS onceki FROM ops_access_log WHERE event_type = 'read') SELECT COUNT(*) AS okuma, SUM(CASE WHEN onceki IS NOT NULL AND ${SN} <= 300 THEN 1 ELSE 0 END) AS isabet, ROUND(100.0 * SUM(CASE WHEN onceki IS NOT NULL AND ${SN} <= 300 THEN 1 ELSE 0 END) / COUNT(*), 1) AS oran FROM o;`)] }),
  sq('Bayat okuma üst sınırı: Bir yazmadan sonra 1-300 saniye içinde aynı kayda gelen okuma sayısı (<code>riskli_okuma</code>). Çıktı tek satır.',
    "SELECT COUNT(*) AS riskli_okuma FROM ops_access_log w JOIN ops_access_log r ON r.record_id = w.record_id AND r.event_type = 'read' AND (julianday(r.event_at) - julianday(w.event_at)) * 86400 BETWEEN 1 AND 300 WHERE w.event_type = 'write';",
    'Tabloyu kendisiyle birleştir: biri yazma, biri okuma.',
    { ynl: ["SELECT COUNT(*) AS riskli_okuma FROM ops_access_log w JOIN ops_access_log r ON r.record_id = w.record_id AND r.event_type = 'read' WHERE w.event_type = 'write';", "SELECT COUNT(*) AS riskli_okuma FROM ops_access_log WHERE event_type = 'write';"] }),
  mc('Bir müşterinin kart limiti ekranı çok sık okunuyor ve yavaş. Önbellek önerisi için doğru değerlendirme hangisi?', ['Limit sık değişmediği için uzun süreli önbellek güvenlidir', 'Bayat limitin bedeli yüksek; önce sorguyu düzelt', 'Her türlü okuma ağırlıklı veri önbelleğe alınmalıdır', 'Önbellek süresi uzadıkça veri daha tutarlı hâle gelir'], 1, 'Karar okuma sıklığına değil bayatlığın bedeline dayanır. Önce sorgunun neden yavaş olduğuna bakılır.'),
  mc('Önbellekli veri güncellenecek. Hangi sıra doğrudur?', ['Önce veritabanına yaz, sonra anahtarı sil', 'Önce anahtarı sil, sonra veritabanına yaz', 'Önce önbelleğe yaz, veritabanına süre bitince yaz', 'Yalnız veritabanına yaz, önbellek kendisi fark eder'], 0, 'Sıra ters olursa ikisinin arasına giren okuma eski değeri önbelleğe geri koyar. Mimari rehberindeki öneri budur.'),
  mc('Salı sabahı pahalı yeni sorgu sunucuyu yoruyor. Biri önbellek ekleyelim diyor. Hangisi en iyi yanıttır?', ['Önbellek eklenirse sorgunun neden pahalı olduğu önemini yitirir', 'Önce hatalı sorguyu düzeltelim; önbellek boşalınca yük geri döner', 'Pahalı her sorgu önce önbelleğe alınır, düzeltme sonra planlanır', 'Süre yeterince uzun olursa önbellek hiçbir zaman boşalmaz'], 1, 'Önbellek hatayı örter. Boşaldığında ya da süre dolduğunda sorun aynen döner.'),
  mc('İsabet tahmini 15 dakikada 5 dakikadan neredeyse hiç yüksek çıkmadı. Ne yaparsın?', ['Daha çok isabet için süreyi yine de 15 dakikaya çıkarırım', 'Uzatmanın kazancı yok, bayatlık artar; kısa süreyi seçerim', 'Tahmin hatalı olmalı, süre uzadıkça isabet hep büyür', 'Önbelleği iptal ederim, çünkü iki sayı birbirine eşit çıktı'], 1, 'Süre uzadıkça isabet doyuma ulaşır, bayat kalma riski büyümeye devam eder.')
]);

/* ------------------------------------------------------------------ 4. SQL injection */
const INJ_GIRDI = "N'a'' OR ''1''=''1'";
ders('ops-injection', 'SQL injection ve doğru savunma: parametreli sorgu, en az yetki, işe yaramayan savunmalar',
  'Girdinin kod olarak yorumlanmasını tanımak, katmanlı savunma kurmak, yanlış savunmaları ayırmak ve iz bulmak. Savunma odaklı.',
  'sql injection parameterized query least privilege sp_executesql defense',
`<h2>Bu dersin sınırı</h2>
<p>Amaç savunmak. Saldırıyı yalnız tanımak için en küçük örnek gösterilir. Başkasının sistemini denemek suçtur; sınama yalnız sana ait ya da yazılı izin aldığın ortamda yapılır.</p>
${KURGU}
<h2>Sorun tek cümle</h2>
<p>Kullanıcı girdisi metin birleştirmeyle sorguya girdiğinde motor neyin veri, neyin kod olduğunu ayıramaz. Temeli <b>Güvenlik</b> dersinde, dinamik SQL tarafı <b>Dinamik SQL</b> dersinde. Burada savunmayı bir bütün olarak kuruyoruz.</p>
${nor(`-- YANLIŞ: girdi metne ekleniyor
DECLARE @sql NVARCHAR(MAX) = N'SELECT COUNT(*) FROM bank_customers WHERE full_name = ''' + @ara + N'''';
EXEC (@sql);
-- @ara değeri  a' OR '1'='1  olursa koşul her satırda doğru olur`)}
<h2>Katmanlı savunma</h2>
<table>
<tr><th>Katman</th><th>Ne yapar</th><th>Tek başına yeter mi?</th></tr>
<tr><td><b>Parametreli sorgu</b></td><td>Değer kod olarak yorumlanmaz, tür ve uzunluk denetlenir</td><td>Değerler için asıl savunma budur</td></tr>
<tr><td><b>İzin listesi (beyaz liste)</b></td><td>Tablo ve sütun adı parametre olamaz, kabul edilenleri say</td><td>Adlar için şart; <code>QUOTENAME</code> ile birlikte</td></tr>
<tr><td><b>Girdi doğrulama</b></td><td>Tür, uzunluk, biçim, aralık. Her güven sınırında, yalnız istemcide değil</td><td>Hayır, ek katman</td></tr>
<tr><td><b>En az yetki</b></td><td>Uygulama hesabı <code>sysadmin</code> olmaz, yalnız gerekeni yapar</td><td>Açığı kapatmaz, zararı sınırlar</td></tr>
<tr><td><b>Hata mesajı</b></td><td>Ayrıntıyı kullanıcıya gösterme, günlüğe yaz</td><td>Hayır, yalnız bilgi sızıntısını azaltır</td></tr>
<tr><td><b>Kod inceleme ve izleme</b></td><td><code>EXEC</code>, <code>sp_executesql</code> kullanan yordamları gözden geçir, günlüğü izle</td><td>Hayır, açığı bulmak içindir</td></tr>
</table>
<h3>Doğru yazım</h3>
${nor(`-- Dinamik SQL şart değilse kullanma
SELECT COUNT(*) FROM bank_customers WHERE full_name = @ara;

-- Şartsa değeri parametre olarak ver
EXEC sp_executesql N'SELECT COUNT(*) FROM bank_customers WHERE full_name = @a',
     N'@a NVARCHAR(100)', @a = @ara;`)}
<h2>İşe yaramayan ya da eksik savunmalar</h2>
<table>
<tr><th>Yöntem</th><th>Neden yetmez</th></tr>
<tr><td>Tek tırnağı silmek ya da çiftlemek</td><td>Sayısal alanda tırnak gerekmez; kaçışlama asıl savunma olamaz. Belge süzmeyi güvenilir birincil savunma saymaz</td></tr>
<tr><td>Yalnız arayüzde doğrulama</td><td>İstemci atlanır, istek doğrudan gönderilebilir</td></tr>
<tr><td>Yasak sözcük listesi (<code>DROP</code>, <code>OR</code>)</td><td>Eksik kalır, meşru girdiyi de bozar: "Orhan" adı gibi</td></tr>
<tr><td>Saklı yordama geçmek</td><td>Yordam içinde metin birleştiriyorsa sorun aynen sürer</td></tr>
<tr><td>Hata mesajını gizlemek</td><td>Açık yerinde kalır, yalnız görünmesi zorlaşır</td></tr>
<tr><td>ORM kullanmak</td><td>ORM'in ham SQL yolunda birleştirme yaparsan korunmazsın</td></tr>
</table>
<h2>En az yetki günlükle nasıl kurulur?</h2>
<p>"Bu hesap ne yapıyor?" sorusunu tahminle değil günlükle yanıtla. Hesap başına okuma ve yazma sayısı, hangi izinlerin gereksiz olduğunu gösterir. Uygulama hesabı yalnız gereken yordamlara <code>EXECUTE</code> almalı; ayrıntısı <b>SQL Server güvenliği</b> dersinde. Belge ayrıca <code>xp_cmdshell</code> kullanımını hiçbir ortamda önermez.</p>
${box(`SELECT l.login_name, l.kind,
       SUM(CASE WHEN a.event_type = 'read' THEN 1 ELSE 0 END) AS okuma,
       SUM(CASE WHEN a.event_type = 'write' THEN 1 ELSE 0 END) AS yazma
FROM ops_logins l
LEFT JOIN ops_access_log a ON a.login_name = l.login_name
GROUP BY l.login_name, l.kind
ORDER BY l.login_name;`)}
<h2>Günlükte iz: parmak izi işe yarar</h2>
<p>Parametreli bir sorgu her çağrıda aynı biçimdedir. Girdi koda dönüşünce biçim değişir ve <b>yeni bir parmak izi</b> doğar. Kurgusal günlüğümüzde pazartesi akşamı arama sorgusunda bunu göreceksin. Portal aramayı parametresiz kuruyor, bu yüzden günlükte girdinin izi var. Bu aynı zamanda bir bulgudur: günlükte sabit değer gördüğün her sorgu, inceleme adayıdır.</p>
<p>İz bir kanıt başlangıcıdır, hüküm değildir: görünen adres uygulama sunucusudur, denemeyi yapan kişi günlükte yoktur. Girişleri uygulama katmanı günlüğüyle eşleştirmen gerekir.</p>`,
[
  sq(`Şu yazımı düzelt. Saldırı girdisiyle (<code>${esc(INJ_GIRDI)}</code>) sorgu hiçbir satır saymamalı: <code>adet</code> 0 çıkmalı. <code>sp_executesql</code> ile değeri parametre olarak ver.`,
    `DECLARE @ara NVARCHAR(100) = ${INJ_GIRDI};\nDECLARE @sql NVARCHAR(MAX) = N'SELECT COUNT(*) AS adet FROM bank_customers WHERE full_name = @a;';\nEXEC sp_executesql @sql, N'@a NVARCHAR(100)', @a = @ara;`,
    'Sorgu metninde <code>@a</code> dursun, değer ayrı geçsin.',
    Object.assign({ start: `DECLARE @ara NVARCHAR(100) = ${INJ_GIRDI};\nDECLARE @sql NVARCHAR(MAX) = N'SELECT COUNT(*) AS adet FROM bank_customers WHERE full_name = ''' + @ara + N''';';\nEXEC (@sql);`,
      must: [{ re: '\\bsp_executesql\\b', msg: 'Görev sp_executesql ile parametre vermeni istiyor.' }], mustNot: [{ re: '\\+\\s*@ara|@ara\\s*\\+', msg: 'Girdi hâlâ metne ekleniyor.' }],
      ynl: [`DECLARE @ara NVARCHAR(100) = ${INJ_GIRDI};\nDECLARE @sql NVARCHAR(MAX) = N'SELECT COUNT(*) AS adet FROM bank_customers WHERE full_name = ''' + @ara + N''';';\nEXEC (@sql);`, `DECLARE @ara NVARCHAR(100) = ${INJ_GIRDI};\nDECLARE @sql NVARCHAR(MAX) = N'SELECT COUNT(*) AS adet FROM bank_customers WHERE full_name = ''' + @ara + N''';';\nEXEC sp_executesql @sql;`] }, TSQL)),
  sq(`Bu sorguda dinamik SQL'e hiç gerek yok. Aynı girdiyle <code>EXEC</code> ve dinamik metin olmadan, değişkeni doğrudan kullanarak say: <code>adet</code>.`,
    `DECLARE @ara NVARCHAR(100) = ${INJ_GIRDI};\nSELECT COUNT(*) AS adet FROM bank_customers WHERE full_name = @ara;`,
    'En güvenli dinamik SQL yazılmayan dinamik SQL\'dir.',
    Object.assign({ mustNot: [{ re: '\\bEXEC(UTE)?\\b|\\bsp_executesql\\b', msg: 'Görev dinamik SQL olmadan yazmanı istiyor.' }],
      ynl: [`DECLARE @ara NVARCHAR(100) = ${INJ_GIRDI};\nDECLARE @sql NVARCHAR(MAX) = N'SELECT COUNT(*) AS adet FROM bank_customers WHERE full_name = @a;';\nEXEC sp_executesql @sql, N'@a NVARCHAR(100)', @a = @ara;`] }, TSQL)),
  sq('Günlükte izi bul. <code>svc_portal</code> hesabının çalıştırdığı, en çok 5 kez görülen parmak izlerini listele: <code>parmak_izi</code>, <code>calisma</code>, <code>hata</code> (<code>status = \'hata\'</code> sayısı), <code>ilk</code> (ilk zaman). İlk zamana göre.',
    `WITH n AS (SELECT ${FP} AS parmak_izi, status, logged_at FROM ops_query_log WHERE login_name = 'svc_portal') SELECT parmak_izi, COUNT(*) AS calisma, SUM(CASE WHEN status = 'hata' THEN 1 ELSE 0 END) AS hata, MIN(logged_at) AS ilk FROM n GROUP BY parmak_izi HAVING COUNT(*) <= 5 ORDER BY ilk, parmak_izi;`,
    'Az görülen biçim, olağan dışı biçimdir.',
    { ord: true, ynl: [`WITH n AS (SELECT query_text AS parmak_izi, status, logged_at FROM ops_query_log WHERE login_name = 'svc_portal') SELECT parmak_izi, COUNT(*) AS calisma, SUM(CASE WHEN status = 'hata' THEN 1 ELSE 0 END) AS hata, MIN(logged_at) AS ilk FROM n GROUP BY parmak_izi HAVING COUNT(*) <= 5 ORDER BY ilk, parmak_izi;`, `SELECT query_text AS parmak_izi, 1 AS calisma, 1 AS hata, logged_at AS ilk FROM ops_query_log WHERE status = 'hata' ORDER BY ilk;`] }),
  sq("En az yetki için kanıt topla. <code>ops_logins</code> içinde aktif olup günlükte hiç <code>write</code> olayı olmayan hesapları listele: <code>login_name</code>, <code>kind</code>. Hesap adına göre.",
    "SELECT l.login_name, l.kind FROM ops_logins l WHERE l.status = 'aktif' AND NOT EXISTS (SELECT 1 FROM ops_access_log a WHERE a.login_name = l.login_name AND a.event_type = 'write') ORDER BY l.login_name;",
    'Varlık yokluğu için <code>NOT EXISTS</code>.',
    { ord: true, ynl: ["SELECT l.login_name, l.kind FROM ops_logins l WHERE NOT EXISTS (SELECT 1 FROM ops_access_log a WHERE a.login_name = l.login_name AND a.event_type = 'write') ORDER BY l.login_name;", "SELECT login_name, kind FROM ops_logins WHERE status = 'aktif' ORDER BY login_name;"] }),
  mc('Ekip, "yordama geçtik, artık injection riski yok" diyor. Yordam içinde <code>EXEC(@sql)</code> ile metin birleştiriliyor. Yanıtın ne olur?', ['Yordamlar girdiyi kendiliğinden veri olarak ele alır, risk kalmamıştır', 'Birleştirme sürdüğü için risk sürer; değeri parametreyle ver', 'Yordamın sahibi dbo ise birleştirme güvenli kabul edilir', 'Riski kaldırmak için yordama yalnız yeni bir ad vermek yeter'], 1, 'Belge: EXEC, EXECUTE ve sp_executesql kullanan her yordam gözden geçirilmeli. Yordam olmak değil, parametre kullanmak korur.'),
  mc('Kullanıcının seçtiği sıralama sütunu sorguya girecek. Doğru savunma hangisi?', ['Sütun adını <code>sp_executesql</code> parametresi olarak vermek', 'İzin listesiyle denetleyip <code>QUOTENAME</code> ile eklemek', 'Sütun adındaki tek tırnak karakterlerini silip eklemek', 'Yalnız arayüzdeki açılır listeye güvenip doğrudan eklemek'], 1, 'Ad parametre olamaz. İzin listesi kabul edilenleri sınırlar, QUOTENAME adı güvenle sarar. Arayüz atlanabilir.'),
  mc('Parametreli sorguya geçildi. En az yetki hâlâ neden gerekli?', ['Parametreli sorgular yalnız okuma sorgularında çalışır', 'Bir açık başka yerde kalırsa zararı sınırlar', 'En az yetki sorguları belirgin biçimde hızlandırır', 'Parametre kullanımı yetkileri sıfırladığı için yeniden verilir'], 1, 'Savunma katmanlıdır. Gözden kaçan bir yordam ya da çalınan parola durumunda hesap ne kadar az yapabiliyorsa zarar o kadar küçüktür.'),
  mc('Arama kutusunda <code>a\' OR \'1\'=\'1</code> yazıldığında sorgu 500 satır döndü. Ekip hata mesajını kapatıp konuyu kapatmak istiyor. Hangisi doğru?', ['Hata mesajı görünmediği sürece bu açık sömürülemez', 'Açık yerinde; sorguyu parametreli yap, geçmiş günlüğü incele', 'Satır sayısı sınırı koymak açığı kalıcı olarak kapatır', 'Arama kutusunun karakter sınırını kısaltmak açığı kapatır'], 1, 'Hata gizlemek ve sınır koymak açığı kapatmaz. Burada hata bile yoktu: sorgu başarıyla fazla veri döndürdü.')
]);

/* ------------------------------------------------------------------ 5. Anomali avı */
const MESAI_DISI = "(CAST(strftime('%H', a.event_at) AS INTEGER) NOT BETWEEN 8 AND 17 OR CAST(strftime('%w', a.event_at) AS INTEGER) IN (0, 6))";
const ARDISIK = `WITH o AS (
  SELECT login_name, client_ip, event_at, record_id,
         record_id - LAG(record_id) OVER (PARTITION BY login_name, client_ip ORDER BY event_at, event_id) AS fark
  FROM ops_access_log
  WHERE event_type = 'read'
)`;
ders('ops-anomali', 'Log tablosunda anomali avı: mesai dışı erişim, ardışık ID taraması, parola deneme',
  'Erişim günlüğünden üç temel sinyali SQL ile çıkarmak, yanlış alarmı ayırmak, sinyali kanıta çevirmek.',
  'anomaly detection log analysis brute force password spray off hours enumeration audit',
`<h2>Sinyal kanıt değildir</h2>
<p>Bir SQL sorgusu şüphe üretir, hüküm vermez. Her sinyal için üç soru sor: <b>Normal hâli ne?</b> <b>Masum açıklaması var mı?</b> <b>Başka hangi kayıt bunu doğrular?</b></p>
${KURGU}
<h2>Sinyal 1: Mesai dışı erişim</h2>
<p>Burada mesai hafta içi 08:00-18:00. Düz sorgu servis hesaplarıyla dolar: gece ETL'i zaten mesai dışında çalışır. Bu yüzden hesap listesiyle birleştir: <code>off_hours_ok = 0</code> olanlar kim?</p>
${box(`SELECT a.login_name, a.event_at, a.client_ip
FROM ops_access_log a
JOIN ops_logins l ON l.login_name = a.login_name
WHERE a.event_type = 'login_ok' AND l.off_hours_ok = 0
  AND ${MESAI_DISI}
ORDER BY a.event_at;`)}
<p>Çıkan üç kaydı karşılaştır: biri akşam 18:22, biri cumartesi, biri salı sabaha karşı. Hepsi sorulur ama aciliyetleri aynı değildir. Aradaki fark adres sütunundadır.</p>
<h2>Sinyal 2: Parola deneme</h2>
<p>Başarısız girişi adrese göre say. İki desen vardır:</p>
<table>
<tr><th>Desen</th><th>Görünüşü</th><th>Hangi gruplama yakalar</th></tr>
<tr><td>Kaba kuvvet (brute force)</td><td>Tek hesaba çok deneme</td><td>Hesap başına</td></tr>
<tr><td>Parola püskürtme (password spray)</td><td>Çok hesaba az deneme, hesap kilidine takılmamak için</td><td>Adres başına farklı hesap sayısı</td></tr>
</table>
${box(`SELECT client_ip, COUNT(*) AS deneme, COUNT(DISTINCT login_name) AS hesap,
       MIN(event_at) AS ilk, MAX(event_at) AS son
FROM ops_access_log
WHERE event_type = 'login_fail'
GROUP BY client_ip
ORDER BY deneme DESC;`)}
<p>En çok denemeli adres saldırgan değil: <code>svc_eski</code> kapalı bir hesap, eski bir iş 30 dakikada bir bağlanmaya çalışıyor. İçeriden, tek hesaptan, düzenli aralıkla. Ama bu da bir bulgudur: işi kapatan yok ve gürültüsü gerçek saldırıyı gizler. <b>En kritik soru</b> sayı değil, <b>başarısızlıklardan sonra başarı geldi mi?</b></p>
<h2>Sinyal 3: Ardışık kayıt okuma</h2>
<p>Gerçek kullanıcı müşterileri rastgele okur. Numarayı birer artırarak okuyan biri büyük olasılıkla listeyi çekiyordur (enumeration). <code>LAG</code> ile önceki kayıttan farkı al:</p>
${box(ARDISIK + `
SELECT login_name, client_ip, COUNT(*) AS ardisik, MIN(event_at) AS ilk, MAX(event_at) AS son
FROM o
WHERE fark = 1
GROUP BY login_name, client_ip
HAVING COUNT(*) >= 20
ORDER BY ardisik DESC;`)}
<p>İki sonuç çıkar. Biri haftalık ETL: planlı, içeriden, servis hesabı. Diğeri bir analist hesabı, dış adresten. Aynı sorgu, farklı anlam. Bağlam olmadan alarm kurarsan her pazar yanlış alarm gelir.</p>
<h2>Sinyalleri zincirle</h2>
<p>Tek başına zayıf sinyaller, aynı adres ve hesapta sırayla geliyorsa güçlü bir hikâye olur: çok deneme, sonra başarı, sonra toplu okuma. Bu sırayı tek bir zaman çizelgesine dök.</p>
<h2>Kaynak nereden gelir?</h2>
<p>Bu tablolar kurgu. Gerçek SQL Server'da karşılıkları (burada çalışmaz):</p>
${nor(`-- Sunucu denetimi: başarısız girişler (yalnız okumak için)
CREATE SERVER AUDIT denetim_giris TO FILE (FILEPATH = 'E:\\Denetim\\');
CREATE SERVER AUDIT SPECIFICATION giris_ozeti
    FOR SERVER AUDIT denetim_giris ADD (FAILED_LOGIN_GROUP) WITH (STATE = ON);
ALTER SERVER AUDIT denetim_giris WITH (STATE = ON);`)}
<ul>
<li><b>SQL Server Audit:</b> Belge, başarısız girişleri denetleyen bu örneği verir. Yeni denetim belirtimi kapalı başlar, açmayı unutma. Hassas sütunlu tabloları da denetlemeyi önerir.</li>
<li><b>Giriş denetimi ayarı:</b> Başarısız, başarılı ya da ikisini hata günlüğüne yazar. Değişiklik için sunucu yeniden başlatılmalıdır.</li>
<li><b>SQL Trace:</b> Eski <code>Audit Login Failed</code> olayı kullanımdan kalkmakta olan SQL Trace'e aittir; yeni kurulumda denetim ya da Extended Events tercih edilir.</li>
</ul>
<div class="tip"><b>Günlüğü de koru</b>Saldırgan izini siler. Denetim kaydını ayrı konuma yaz, yazma yetkisini sınırla, saklama süresini belirle. Denetim hedefini ağ paylaşımına yazarken gecikmeye dikkat et: Belge, bunun sunucuyu yavaşlatabileceğini söyler.</div>`,
[
  sq('Mesai dışında giriş yapan, ama mesai dışı çalışması beklenmeyen hesaplar (<code>off_hours_ok = 0</code>). Mesai: hafta içi 08:00-17:59. <code>login_ok</code> olayları: <code>login_name</code>, <code>event_at</code>, <code>client_ip</code>. Zamana göre.',
    `SELECT a.login_name, a.event_at, a.client_ip FROM ops_access_log a JOIN ops_logins l ON l.login_name = a.login_name WHERE a.event_type = 'login_ok' AND l.off_hours_ok = 0 AND ${MESAI_DISI} ORDER BY a.event_at;`,
    'Saat ve hafta günü koşulunu <code>OR</code> ile bağla, parantezi unutma.',
    { ord: true, ynl: [`SELECT a.login_name, a.event_at, a.client_ip FROM ops_access_log a WHERE a.event_type = 'login_ok' AND ${MESAI_DISI} ORDER BY a.event_at;`, `SELECT a.login_name, a.event_at, a.client_ip FROM ops_access_log a JOIN ops_logins l ON l.login_name = a.login_name WHERE a.event_type = 'login_ok' AND l.off_hours_ok = 0 AND CAST(strftime('%H', a.event_at) AS INTEGER) NOT BETWEEN 8 AND 17 ORDER BY a.event_at;`] }),
  sq('Parola püskürtme adayları: en az 3 farklı hesabı deneyen adresler. <code>client_ip</code>, <code>deneme</code>, <code>hesap</code>. Denemeye göre azalan.',
    "SELECT client_ip, COUNT(*) AS deneme, COUNT(DISTINCT login_name) AS hesap FROM ops_access_log WHERE event_type = 'login_fail' GROUP BY client_ip HAVING COUNT(DISTINCT login_name) >= 3 ORDER BY deneme DESC;",
    'Toplam deneme değil, farklı hesap sayısı belirleyici.',
    { ord: true, ynl: ["SELECT client_ip, COUNT(*) AS deneme, COUNT(DISTINCT login_name) AS hesap FROM ops_access_log WHERE event_type = 'login_fail' GROUP BY client_ip HAVING COUNT(*) >= 3 ORDER BY deneme DESC;", "SELECT login_name AS client_ip, COUNT(*) AS deneme, COUNT(DISTINCT client_ip) AS hesap FROM ops_access_log WHERE event_type = 'login_fail' GROUP BY login_name ORDER BY deneme DESC;"] }),
  sq('Başarısızlıktan sonra başarı: Bir <code>login_ok</code> olayından önceki 60 dakikada aynı adres ve hesaptan en az 10 <code>login_fail</code> gelmiş olayları bul: <code>login_name</code>, <code>client_ip</code>, <code>event_at</code>, <code>onceki_hata</code>.',
    "SELECT o.login_name, o.client_ip, o.event_at, COUNT(*) AS onceki_hata FROM ops_access_log o JOIN ops_access_log f ON f.login_name = o.login_name AND f.client_ip = o.client_ip AND f.event_type = 'login_fail' AND f.event_at < o.event_at AND (julianday(o.event_at) - julianday(f.event_at)) * 1440 <= 60 WHERE o.event_type = 'login_ok' GROUP BY o.event_id, o.login_name, o.client_ip, o.event_at HAVING COUNT(*) >= 10;",
    'Tabloyu kendisiyle birleştir, başarılı girişe göre grupla.',
    { ynl: ["SELECT login_name, client_ip, MAX(event_at) AS event_at, COUNT(*) AS onceki_hata FROM ops_access_log WHERE event_type = 'login_fail' GROUP BY login_name, client_ip HAVING COUNT(*) >= 10;", "SELECT o.login_name, o.client_ip, o.event_at, COUNT(*) AS onceki_hata FROM ops_access_log o JOIN ops_access_log f ON f.login_name = o.login_name AND f.event_type = 'login_fail' AND f.event_at < o.event_at WHERE o.event_type = 'login_ok' GROUP BY o.event_id, o.login_name, o.client_ip, o.event_at HAVING COUNT(*) >= 3;"] }),
  sq('Ardışık okuma: Hesap ve adres başına, önceki okunan kayıttan farkı tam 1 olan okuma sayısı en az 20 olanlar: <code>login_name</code>, <code>client_ip</code>, <code>ardisik</code>. Sayıya göre azalan.',
    (ARDISIK + ' SELECT login_name, client_ip, COUNT(*) AS ardisik FROM o WHERE fark = 1 GROUP BY login_name, client_ip HAVING COUNT(*) >= 20 ORDER BY ardisik DESC;').replace(/\s+/g, ' '),
    '<code>LAG</code> hesap ve adrese göre ayrı çalışmalı.',
    { ord: true, must: [{ re: '\\bPARTITION\\s+BY\\b', msg: 'LAG hesap ve adrese göre ayrı çalışmalı: PARTITION BY kullan. Başka hesabın okuması araya girerse fark yanlış çıkar.' }], ynl: ["WITH o AS (SELECT login_name, client_ip, record_id - LAG(record_id) OVER (ORDER BY event_at, event_id) AS fark FROM ops_access_log WHERE event_type = 'read') SELECT login_name, client_ip, COUNT(*) AS ardisik FROM o WHERE fark = 1 GROUP BY login_name, client_ip HAVING COUNT(*) >= 20 ORDER BY ardisik DESC;", "SELECT login_name, client_ip, COUNT(*) AS ardisik FROM ops_access_log WHERE event_type = 'read' GROUP BY login_name, client_ip HAVING COUNT(*) >= 20 ORDER BY ardisik DESC;"] }),
  sq('Alarmı daralt: Önceki sonucu kurumun iç ağı dışındaki adreslerle sınırla (<code>client_ip</code>, <code>10.</code> ile başlamayan). <code>event_at</code> ve <code>event_type</code> üzerinde indeks bu görevde hazır; <code>ops_access_log</code> için plan arama yapmalı. Salı 12 Kasım 00:00 sonrası: <code>login_name</code>, <code>client_ip</code>, <code>okuma</code> (<code>read</code> sayısı).',
    "SELECT login_name, client_ip, COUNT(*) AS okuma FROM ops_access_log WHERE event_type = 'read' AND event_at >= '2024-11-12' AND client_ip NOT LIKE '10.%' GROUP BY login_name, client_ip;",
    'Tarihi aralık olarak yaz, sütunu fonksiyona sokma.',
    { plan: { setup: 'CREATE INDEX IF NOT EXISTS ix_gizli_tz ON ops_access_log (event_type, event_at)', must: 'event_type=\\? AND event_at>\\?', msg: 'Planın parantezinde event_type=? ve event_at>? görünmeli. event_at fonksiyona girmemeli.' },
      ynl: ["SELECT login_name, client_ip, COUNT(*) AS okuma FROM ops_access_log WHERE event_type = 'read' AND date(event_at) = '2024-11-12' AND client_ip NOT LIKE '10.%' GROUP BY login_name, client_ip;", "SELECT login_name, client_ip, COUNT(*) AS okuma FROM ops_access_log WHERE event_type = 'read' AND event_at >= '2024-11-12' GROUP BY login_name, client_ip;"] }),
  mc('En çok başarısız girişi olan adres içeriden, tek hesaptan, 30 dakikada bir deniyor; hesap kapalı. Doğru yorum hangisi?', ['Saldırganın en güçlü adresi budur, hemen olay ilan edilir', 'Büyük olasılıkla eski bir iş; yine de sahibini bulup kapat', 'Kapalı hesaba deneme zararsızdır, kayıt silinebilir', 'İç adresten gelen kayıtlar denetim dışında tutulmalıdır'], 1, 'Düzenli aralık ve tek hesap otomatik bir işi gösterir. Yine de bulgudur: gürültüsü gerçek saldırıyı gizler. Kaydı silmek ise kanıtı siler.'),
  mc('Parola püskürtmeyi kaçıran gruplama hangisidir?', ['Adres başına farklı hesap sayısı', 'Hesap başına başarısız deneme sayısı', 'Adres ve saat başına toplam deneme', 'Adres başına ilk ve son deneme zamanı'], 1, 'Püskürtme her hesaba az deneme yapar, hesap başına sayımda eşiğin altında kalır.'),
  mc('Bir analist cumartesi 11:15\'te ofis adresinden girip 5 müşteri kaydı okudu. Ne yaparsın?', ['Hesabı hemen kapatır, olayı ihlal olarak bildiririm', 'Kişiye ve yöneticisine sorar, cevabı kayda geçiririm', 'Mesai dışı her erişimi otomatik yok sayan kural yazarım', 'Kaydı silip bir sonraki haftanın raporunu beklerim'], 1, 'Zayıf sinyal: tek hesap, iç adres, az okuma, deneme yok. Önce doğrula. Belgelenmiş cevap sonraki alarmı da kolaylaştırır.'),
  mc('Bütün başarısız girişler için anlık alarm kuruldu, günde yüzlerce bildirim geliyor. Sonuç ne olur?', ['Bildirim çoğaldıkça ekibin dikkati ve güvenliği artar', 'Ekip alarmları görmezden gelir; bağlam ve eşik gerekir', 'Saldırganlar bildirim sayısını görüp denemeyi bırakır', 'Sunucu aşırı bildirim yüzünden otomatik kilitlenir'], 1, 'Alarm yorgunluğu gerçek sinyali gömer. Başarıyla biten denemeler ve dış adresler gibi bağlam eklenir.')
]);

/* ------------------------------------------------------------------ 6. Bitirme */
const P_FP = `WITH n AS (SELECT ${FP} AS parmak_izi, logical_reads, duration_ms FROM ops_query_log WHERE logged_at >= ${SALI0} AND logged_at < ${SALI1})`;
LS.push({ id: 'ops-proje', lv: 'C1', mod: 'Bitirme Projeleri', min: 70,
  title: 'Bitirme projesi (SQL Server Operasyon): Salı sabahı sistem yavaş ve şüpheli erişim var',
  sum: 'Kurgusal günlükle teşhis, kanıt ve karar: yavaşlığın nedenleri, şüpheli erişimin zinciri, ikisinin ilişkisi, yönetime not.',
  en: 'incident response slow system suspicious access project',
  body: `<h2>Senaryo</h2>
<p>Salı 12 Kasım 2024, sabah 09:30. Ilgaz Bank portal ekibi "sistem çok yavaş" diyor. Aynı saatlerde güvenlik ekibi şüpheli bir girişten söz ediyor. Herkesin ilk tahmini aynı: "Saldırı sistemi yavaşlattı." Senden üç şey isteniyor: <b>Teşhis, kanıt, karar.</b></p>
${KURGU}
<h2>Veri</h2>
<table><tr><th>Tablo</th><th>Satır</th><th>İçerik</th></tr>
<tr><td><code>ops_query_log</code></td><td>${say('pr-sorgu', 7607, 'SELECT COUNT(*) FROM ops_query_log')}</td><td>Sorgu günlüğü</td></tr>
<tr><td><code>ops_access_log</code></td><td>${say('pr-eris', 3991, 'SELECT COUNT(*) FROM ops_access_log')}</td><td>Giriş, okuma, yazma</td></tr>
<tr><td><code>ops_plan_stats</code></td><td>${say('pr-plan', 335, 'SELECT COUNT(*) FROM ops_plan_stats')}</td><td>Plan ve saat başına istatistik (Query Store taklidi)</td></tr>
<tr><td><code>ops_logins</code></td><td>${say('pr-hesap', 10, 'SELECT COUNT(*) FROM ops_logins')}</td><td>Hesap listesi</td></tr></table>
<h2>Yol haritası</h2>
<table><tr><th>Adım</th><th>Soru</th><th>Sonuç türü</th></tr>
<tr><td>1</td><td>Gerçekten yavaş mı, geçen salıya göre ne değişti?</td><td>Teşhis</td></tr>
<tr><td>2-3</td><td>Yükü kim bindiriyor, bu sorgular yeni mi?</td><td>Teşhis</td></tr>
<tr><td>4</td><td>Plan değişti mi, ne zaman?</td><td>Teşhis</td></tr>
<tr><td>5</td><td>Şüpheli adres ne yaptı?</td><td>Kanıt</td></tr>
<tr><td>6-7</td><td>Hangi kayıtlar okundu, hesabın sahibi aynı anda neredeydi?</td><td>Kanıt</td></tr>
<tr><td>8</td><td>Saldırı yavaşlığı açıklıyor mu?</td><td>Ayrım</td></tr>
<tr><td>9-11</td><td>Zaman çizelgesi, öncelik ve yönetime not</td><td>Karar</td></tr></table>
<div class="note"><b>Sınır</b>Bu bir eğitim senaryosudur. Veride kimin yaptığı bilgisi yoktur, yalnız hesap ve adres vardır. Hesabın ele geçirildiği de bir çıkarımdır; kişinin kendisiyle doğrulanır. KVKK ve bildirim kararları hukuk ve uyum ekibiyle verilir, bu proje onların yerine geçmez.</div>
<h3>Kanıtı koru</h3>
<p>Müdahaleden önce günlükleri kopyala, saklama süresi dolmasın, kopyayı salt okunur tut. Kayıt silme ve "temizleme" yapma. Her adımı saatle birlikte yaz.</p>
<h3>Kendini değerlendir</h3>
<table><tr><th>Ölçüt</th><th>Başlangıç</th><th>İyi</th><th>Mükemmel</th></tr>
<tr><td>Teşhis</td><td>Yavaş sorgu bulundu</td><td>Geçen salıyla karşılaştırıldı, iki neden ayrıldı</td><td>Süre ve okuma ayrımı yapıldı</td></tr>
<tr><td>Kanıt</td><td>Şüpheli adres bulundu</td><td>Zincir kuruldu, kapsam sayıldı</td><td>Yanlış alarmlar elenip gerekçesi yazıldı</td></tr>
<tr><td>Karar</td><td>Liste</td><td>Öncelikli eylem planı</td><td>Bilinen ve bilinmeyenler ayrı, geri alma yazılı</td></tr></table>`,
  ex: [
    sq(`<b>Adım 1.</b> Temel karşılaştırma. Geçen salı (5 Kasım) ile bu salı (12 Kasım), 08:00-12:00: <code>gun</code> (YYYY-AA-GG), <code>calisma</code>, <code>toplam_okuma</code>, <code>ort_ms</code> (tam sayı). Güne göre.`,
      "SELECT date(logged_at) AS gun, COUNT(*) AS calisma, SUM(logical_reads) AS toplam_okuma, ROUND(AVG(duration_ms)) AS ort_ms FROM ops_query_log WHERE (logged_at >= '2024-11-05 08:00:00' AND logged_at < '2024-11-05 12:00:00') OR (logged_at >= '2024-11-12 08:00:00' AND logged_at < '2024-11-12 12:00:00') GROUP BY date(logged_at) ORDER BY gun;",
      'İki aralık <code>OR</code> ile. Aynı haftanın günü, aynı saat.',
      { ord: true, ynl: ["SELECT date(logged_at) AS gun, COUNT(*) AS calisma, SUM(logical_reads) AS toplam_okuma, ROUND(AVG(duration_ms)) AS ort_ms FROM ops_query_log WHERE logged_at >= '2024-11-05' GROUP BY date(logged_at) ORDER BY gun;", "SELECT date(logged_at) AS gun, COUNT(*) AS calisma, SUM(logical_reads) AS toplam_okuma, ROUND(AVG(duration_ms)) AS ort_ms FROM ops_query_log WHERE date(logged_at) IN ('2024-11-05', '2024-11-12') GROUP BY date(logged_at) ORDER BY gun;"] }),
    sq(`<b>Adım 2.</b> Bu salı 08:00-12:00, toplam okumaya göre en maliyetli 5 parmak izi: <code>parmak_izi</code>, <code>calisma</code>, <code>toplam_okuma</code>, <code>ort_ms</code> (tam sayı). Okumaya göre azalan.`,
      (P_FP + ' SELECT parmak_izi, COUNT(*) AS calisma, SUM(logical_reads) AS toplam_okuma, ROUND(AVG(duration_ms)) AS ort_ms FROM n GROUP BY parmak_izi ORDER BY toplam_okuma DESC LIMIT 5;'),
      'Önce pencereyi süz, sonra normalleştirip grupla.',
      { ord: true, ynl: [`WITH n AS (SELECT ${FP} AS parmak_izi, logical_reads, duration_ms FROM ops_query_log) SELECT parmak_izi, COUNT(*) AS calisma, SUM(logical_reads) AS toplam_okuma, ROUND(AVG(duration_ms)) AS ort_ms FROM n GROUP BY parmak_izi ORDER BY toplam_okuma DESC LIMIT 5;`, (P_FP + ' SELECT parmak_izi, COUNT(*) AS calisma, SUM(logical_reads) AS toplam_okuma, ROUND(AVG(duration_ms)) AS ort_ms FROM n GROUP BY parmak_izi ORDER BY ort_ms DESC LIMIT 5;')] }),
    sq('<b>Adım 3.</b> Yeni sorgular. Günlükte ilk kez 12 Kasım\'da görülen parmak izleri: <code>parmak_izi</code>, <code>login_sayisi</code> (farklı hesap), <code>calisma</code>, <code>ilk</code>. İlk zamana göre.',
      `WITH n AS (SELECT ${FP} AS parmak_izi, login_name, logged_at FROM ops_query_log) SELECT parmak_izi, COUNT(DISTINCT login_name) AS login_sayisi, COUNT(*) AS calisma, MIN(logged_at) AS ilk FROM n GROUP BY parmak_izi HAVING MIN(logged_at) >= '2024-11-12' ORDER BY ilk;`,
      'İlk görülme <code>MIN</code>, koşul <code>HAVING</code> içinde.',
      { ord: true, ynl: [`WITH n AS (SELECT ${FP} AS parmak_izi, login_name, logged_at FROM ops_query_log WHERE logged_at >= '2024-11-12') SELECT parmak_izi, COUNT(DISTINCT login_name) AS login_sayisi, COUNT(*) AS calisma, MIN(logged_at) AS ilk FROM n GROUP BY parmak_izi ORDER BY ilk;`] }),
    sq('<b>Adım 4.</b> Plan değişimi. <code>rapor_ay_tur</code> için plan başına ilk ve son saat, toplam çalışma, ağırlıklı ortalama okuma (tam sayı): <code>plan_id</code>, <code>ilk</code>, <code>son</code>, <code>calisma</code>, <code>ort_okuma</code>. Plana göre.',
      "SELECT plan_id, MIN(window_start) AS ilk, MAX(window_start) AS son, SUM(exec_count) AS calisma, ROUND(1.0 * SUM(exec_count * avg_reads) / SUM(exec_count)) AS ort_okuma FROM ops_plan_stats WHERE query_name = 'rapor_ay_tur' GROUP BY plan_id ORDER BY plan_id;",
      'Ağırlıklı ortalama. Satırlar saat başınadır.',
      { ord: true, ynl: ["SELECT plan_id, MIN(window_start) AS ilk, MAX(window_start) AS son, SUM(exec_count) AS calisma, ROUND(AVG(avg_reads)) AS ort_okuma FROM ops_plan_stats WHERE query_name = 'rapor_ay_tur' GROUP BY plan_id ORDER BY plan_id;"] }),
    sq("<b>Adım 5.</b> Şüpheli adres. <code>203.0.113.77</code> için olay türü başına: <code>event_type</code>, <code>olay</code>, <code>hesap</code> (farklı hesap), <code>ilk</code>, <code>son</code>. İlk zamana göre.",
      "SELECT event_type, COUNT(*) AS olay, COUNT(DISTINCT login_name) AS hesap, MIN(event_at) AS ilk, MAX(event_at) AS son FROM ops_access_log WHERE client_ip = '203.0.113.77' GROUP BY event_type ORDER BY ilk;",
      'Tek adresin bütün hareketi: önce deneme, sonra giriş, sonra okuma.',
      { ord: true, ynl: ["SELECT event_type, COUNT(*) AS olay, COUNT(DISTINCT login_name) AS hesap, MIN(event_at) AS ilk, MAX(event_at) AS son FROM ops_access_log WHERE login_name = 'an_mert' GROUP BY event_type ORDER BY ilk;"] }),
    sq("<b>Adım 6.</b> Kapsam. O adresten okunan müşterileri segmente göre say (bildirim kararı için gerekli): <code>segment</code>, <code>musteri</code>. Müşteriye göre azalan.",
      "SELECT c.segment, COUNT(DISTINCT a.record_id) AS musteri FROM ops_access_log a JOIN bank_customers c ON c.customer_id = a.record_id WHERE a.client_ip = '203.0.113.77' AND a.event_type = 'read' GROUP BY c.segment ORDER BY musteri DESC;",
      'Olay sayısı değil, farklı müşteri.',
      { ord: true, ynl: ["SELECT c.segment, COUNT(DISTINCT a.record_id) AS musteri FROM ops_access_log a JOIN bank_customers c ON c.customer_id = a.record_id WHERE a.login_name = 'an_mert' AND a.event_type = 'read' GROUP BY c.segment ORDER BY musteri DESC;"] }),
    sq("<b>Adım 7.</b> Hesabın sahibi. 12 Kasım'da <code>an_mert</code> için başarılı girişler: <code>event_at</code>, <code>client_ip</code>, <code>sonraki_okuma</code> (o adresten o gün yapılan okuma sayısı). Zamana göre.",
      "SELECT g.event_at, g.client_ip, (SELECT COUNT(*) FROM ops_access_log r WHERE r.login_name = g.login_name AND r.client_ip = g.client_ip AND r.event_type = 'read' AND r.event_at >= '2024-11-12') AS sonraki_okuma FROM ops_access_log g WHERE g.login_name = 'an_mert' AND g.event_type = 'login_ok' AND g.event_at >= '2024-11-12' ORDER BY g.event_at;",
      'Aynı hesap, iki farklı adres. Adresler ne söylüyor?',
      { ord: true, ynl: ["SELECT event_at, client_ip, 0 AS sonraki_okuma FROM ops_access_log WHERE login_name = 'an_mert' AND event_type = 'login_ok' ORDER BY event_at;"] }),
    sq(`<b>Adım 8.</b> Ayrım. Şüpheli adresin okuduğu toplam sayfa ve 08:00-12:00 penceresine düşen payı. Tek satırda: <code>saldiri_okuma</code> (o adresin günlükteki toplam <code>logical_reads</code>), <code>pencere_saldiri</code> (pencereye düşen), <code>pencere_toplam</code> (penceredeki bütün okuma).`,
      `SELECT SUM(CASE WHEN client_ip = '203.0.113.77' THEN logical_reads ELSE 0 END) AS saldiri_okuma, SUM(CASE WHEN client_ip = '203.0.113.77' AND logged_at >= ${SALI0} AND logged_at < ${SALI1} THEN logical_reads ELSE 0 END) AS pencere_saldiri, SUM(CASE WHEN logged_at >= ${SALI0} AND logged_at < ${SALI1} THEN logical_reads ELSE 0 END) AS pencere_toplam FROM ops_query_log;`,
      'Üç koşullu toplam. Aynı tablo, farklı süzgeç.',
      { ynl: [`SELECT SUM(logical_reads) AS saldiri_okuma, SUM(logical_reads) AS pencere_saldiri, SUM(logical_reads) AS pencere_toplam FROM ops_query_log WHERE client_ip = '203.0.113.77';`] }),
    mc('Adım 8\'in sonucuna göre "saldırı sistemi yavaşlattı" iddiası için ne dersin?', ['Saldırı yavaşlığın ana nedenidir, başka inceleme gerekmez', 'Veri desteklemiyor: okumalar pencereden önce bitmiş, iki ayrı olay', 'Yavaşlık saldırıyı gizlemek için bilerek oluşturulmuştur', 'Bu sayılardan bir sonuç çıkmaz, hiçbir yorum yapılamaz'], 1, 'Okuma pencereden önce bitti ve miktarı çok küçük. Yine de aynı sabah olması tesadüf müdür sorusu kapanmaz, ama yavaşlığın kanıtlanmış nedeni plan ve sürümdür.'),
    mc('Eylemlerin en doğru sırası hangisi?', ['Günlüğü kopyala, hesabı kapat, güvenliği ara; planı da düzelt', 'Önce yavaşlığı gider, güvenlik konusunu haftaya raporla', 'Şüpheli kayıtları temizle, sonra herkese haber ver', 'Sunucuyu yeniden başlat, sorun kendiliğinden düzelirse kapat'], 0, 'Veri açığı sürüyor olabilir, önce kanıt ve kapatma gelir. Yeniden başlatma plan önbelleğini ve görünümleri sıfırlar, kanıtı azaltır. Plan zorlama ve sürüm geri alma paralel yürür.'),
    mc('Yönetime yazılacak en dürüst cümle hangisi?', ['"Saldırgan 291 müşterinin bilgilerini çaldı ve sistemi yavaşlattı."', '"291 kayıt dış adresten okundu; kimin yaptığı ve verinin çıkışı henüz bilinmiyor."', '"Olayda veri kaybı yoktur, yavaşlık da tamamen giderilmiştir."', '"Bütün sorunlar SQL Server\'daki bir hatadan kaynaklanmaktadır."'], 1, 'Bildiğini söyle, bilmediğini ayır. Günlük okumayı gösterir, çalındığını ya da yavaşlıkla bağını kanıtlamaz.')
  ] });

/* ------------------------------------------------------------------ Mülakat */
{ const l = LS.find(x => x.id === 'mk-opt');
  l.body += `<h2>Operasyon ve güvenlik soruları</h2>
<table><tr><th>Soru</th><th>Kısa yanıt</th></tr>
<tr><td>Kodu değiştiremiyorum, sorgu yavaş</td><td>İstatistik ve indeks, sonra Query Store ile plan zorlama ya da ipucu. Hepsi geri alınabilir olmalı, takvime bağlanmalı.</td></tr>
<tr><td>En pahalı sorguları nasıl bulursun?</td><td>Sabitleri ayıklayıp gruplarım: <code>query_hash</code> ya da Query Store. Şikâyetin saat aralığına süzerim.</td></tr>
<tr><td>Önbellek ne zaman yanlış?</td><td>Bayat verinin bedeli yüksekse, çoğu istek ıskalıyorsa, sorgu hatalıysa.</td></tr>
<tr><td>SQL injection nasıl önlenir?</td><td>Parametreli sorgu, adlar için izin listesi, en az yetki. Süzme asıl savunma değildir.</td></tr>
<tr><td>Parola denemesini nasıl görürsün?</td><td>Adres başına farklı hesap, hesap başına deneme, başarısızlıktan sonra başarı.</td></tr>
</table>
<p>Ayrıntı <b>SQL Server Operasyon ve Güvenlik</b> yolunda.</p>`;
  l.ex.push(
    mc('Mülakatçı: "Üretici yazılımında sorgu kötüleşti, kodu değiştiremiyorsun." İlk yanıtın ne olur?', ['"Eski planı Query Store\'dan bulur, kanıtlayıp zorlar ve izlerim."', '"Sunucuyu büyütür, sorunun kendiliğinden çözülmesini beklerim."', '"Bütün tablolara NOLOCK ipucunu plan kılavuzuyla eklerim."', '"Sorguyu önbelleğe alır, altındaki planı hiç incelemem."'], 0, 'Dar kapsamlı, ölçülebilir ve geri alınabilir bir adım. Plan zorlamanın da garanti olmadığını ve izlenmesi gerektiğini eklemek artı puandır.'),
    mc('Mülakatçı: "Yordam kullanıyoruz, injection riskimiz yok, değil mi?" En iyi yanıt hangisi?', ['"Evet, saklı yordamlar girdiyi her durumda veri olarak işler."', '"İçinde metin birleştirme varsa risk sürer; koda bakmak gerekir."', '"Evet, yordama yalnız EXECUTE yetkisi vermek bunu tam çözer."', '"Hayır, yordam kullanmak riski yalnızca daha da artırır."'], 1, 'Doğru cevap koşula bağlıdır. Parametresiz dinamik SQL içeren yordam açıktır. En az yetki zararı azaltır, açığı kapatmaz.'),
    sq('Mülakat görevi: Başarısız giriş sayısı en yüksek 3 hesap: <code>login_name</code>, <code>deneme</code>, <code>farkli_adres</code>. Denemeye göre azalan, eşitlikte hesaba göre.',
      "SELECT login_name, COUNT(*) AS deneme, COUNT(DISTINCT client_ip) AS farkli_adres FROM ops_access_log WHERE event_type = 'login_fail' GROUP BY login_name ORDER BY deneme DESC, login_name LIMIT 3;",
      'Süz, grupla, sırala, sınırla.',
      { ord: true, ynl: ["SELECT login_name, COUNT(*) AS deneme, COUNT(DISTINCT client_ip) AS farkli_adres FROM ops_access_log GROUP BY login_name ORDER BY deneme DESC, login_name LIMIT 3;"] })
  ); }

/* ------------------------------------------------------------------ Pratik */
{ const T = window.SQLP_PRACTICE_TOPICS; T.ops = 'Operasyon günlüğü';
  const PR = window.SQLP_PRACTICE; let n = 0;
  const p = (L, d, title, q, sol, hint, x) => { n++; PR.push(Object.assign({ id: 'sg' + String(n).padStart(2, '0'), L, t: 'ops', d, title, q: '<p>' + q + '</p>', sol, hint, type: 'sql' }, x || {})); };
  p('orta', 1, 'Hata veren sorgular', "<code>ops_query_log</code> içinde <code>status = 'hata'</code> olan satır sayısı hesap başına: <code>login_name</code>, <code>hata</code>.", "SELECT login_name, COUNT(*) AS hata FROM ops_query_log WHERE status = 'hata' GROUP BY login_name;", 'Süz ve grupla.', { ynl: ['SELECT login_name, COUNT(*) AS hata FROM ops_query_log GROUP BY login_name;'] });
  p('orta', 1, 'Sürekli başarısız hesap', "Hesap listesinde kapalı olup günlükte başarısız girişi olan hesaplar: <code>login_name</code>, <code>deneme</code>.", "SELECT l.login_name, COUNT(*) AS deneme FROM ops_logins l JOIN ops_access_log a ON a.login_name = l.login_name AND a.event_type = 'login_fail' WHERE l.status = 'kapalı' GROUP BY l.login_name;", 'İki tablo, iki koşul.', { ynl: ["SELECT login_name, COUNT(*) AS deneme FROM ops_access_log WHERE event_type = 'login_fail' GROUP BY login_name;"] });
  p('orta', 2, 'Listede olmayan hesaplar', 'Giriş denenen ama <code>ops_logins</code> tablosunda olmayan hesap adları: <code>login_name</code>, <code>deneme</code>. Ada göre.', 'SELECT a.login_name, COUNT(*) AS deneme FROM ops_access_log a LEFT JOIN ops_logins l ON l.login_name = a.login_name WHERE l.login_name IS NULL GROUP BY a.login_name ORDER BY a.login_name;', '<code>LEFT JOIN</code> ve <code>IS NULL</code>.', { ord: true, ynl: ['SELECT a.login_name, COUNT(*) AS deneme FROM ops_access_log a JOIN ops_logins l ON l.login_name = a.login_name GROUP BY a.login_name ORDER BY a.login_name;'] });
  p('ileri', 2, 'Saat başına okuma', '12 Kasım için saat başına toplam okunan sayfa: <code>saat</code> (tam sayı), <code>toplam_okuma</code>. Saate göre.', "SELECT CAST(strftime('%H', logged_at) AS INTEGER) AS saat, SUM(logical_reads) AS toplam_okuma FROM ops_query_log WHERE logged_at >= '2024-11-12' GROUP BY CAST(strftime('%H', logged_at) AS INTEGER) ORDER BY saat;", 'Sıçramanın başladığı saati gör.', { ord: true, ynl: ["SELECT CAST(strftime('%H', logged_at) AS INTEGER) AS saat, SUM(logical_reads) AS toplam_okuma FROM ops_query_log GROUP BY CAST(strftime('%H', logged_at) AS INTEGER) ORDER BY saat;"] });
  p('ileri', 2, 'Tek seferlik mi, sürekli mi?', 'Parmak izi başına kaç farklı günde görüldüğü; en az 5 çalışması olup yalnız 1 günde görülenler: <code>parmak_izi</code>, <code>calisma</code>. Çalışmaya göre azalan.', `WITH n AS (SELECT ${FP} AS parmak_izi, logged_at FROM ops_query_log) SELECT parmak_izi, COUNT(*) AS calisma FROM n GROUP BY parmak_izi HAVING COUNT(*) >= 5 AND COUNT(DISTINCT date(logged_at)) = 1 ORDER BY calisma DESC;`, 'Farklı gün sayısı <code>COUNT(DISTINCT ...)</code>.', { ord: true, ynl: [`WITH n AS (SELECT ${FP} AS parmak_izi, logged_at FROM ops_query_log) SELECT parmak_izi, COUNT(*) AS calisma FROM n GROUP BY parmak_izi HAVING COUNT(DISTINCT date(logged_at)) = 1 ORDER BY calisma DESC;`] });
  p('ileri', 2, 'Hızlı denemeler', 'Ardışık başarısız girişi arasında 30 saniyeden az olan satır sayısı, adres başına; en az 10 olanlar: <code>client_ip</code>, <code>hizli</code>.', "WITH f AS (SELECT client_ip, event_at, LAG(event_at) OVER (PARTITION BY client_ip ORDER BY event_at, event_id) AS onceki FROM ops_access_log WHERE event_type = 'login_fail') SELECT client_ip, COUNT(*) AS hizli FROM f WHERE onceki IS NOT NULL AND (julianday(event_at) - julianday(onceki)) * 86400 < 30 GROUP BY client_ip HAVING COUNT(*) >= 10;", 'Adres başına <code>LAG</code>.', { ynl: ["SELECT client_ip, COUNT(*) AS hizli FROM ops_access_log WHERE event_type = 'login_fail' GROUP BY client_ip HAVING COUNT(*) >= 10;"] });
  p('ileri', 3, 'Hesabın alışılmadık adresi', 'Bir hesabın <code>read</code> olaylarında, o hesabın en çok kullandığı adres dışından gelen okuma sayısı; 0\'dan büyük olanlar: <code>login_name</code>, <code>diger_adres</code>. Sayıya göre azalan, eşitlikte hesaba göre.', "WITH s AS (SELECT login_name, client_ip, COUNT(*) AS n, ROW_NUMBER() OVER (PARTITION BY login_name ORDER BY COUNT(*) DESC, client_ip) AS sira FROM ops_access_log WHERE event_type = 'read' GROUP BY login_name, client_ip) SELECT login_name, SUM(n) AS diger_adres FROM s WHERE sira > 1 GROUP BY login_name ORDER BY diger_adres DESC, login_name;", 'Hesap başına adresleri sırala, birinciyi dışla.', { ord: true, ynl: ["SELECT login_name, COUNT(DISTINCT client_ip) AS diger_adres FROM ops_access_log WHERE event_type = 'read' GROUP BY login_name HAVING COUNT(DISTINCT client_ip) > 1 ORDER BY diger_adres DESC, login_name;"] });
  p('ileri', 2, 'Hesap ve zaman indeksi', 'Şu sorgu için indeks oluştur (adı serbest), hem hesap hem zaman aramada kullanılsın: <code>SELECT duration_ms FROM ops_query_log WHERE login_name = \'svc_rapor\' AND logged_at &gt;= \'2024-11-12\'</code>', 'CREATE INDEX ix_log_hesap_zaman ON ops_query_log (login_name, logged_at);', 'Eşitlik önce.', { nr: 1, dl: IDX, plan: { q: "SELECT duration_ms FROM ops_query_log WHERE login_name = 'svc_rapor' AND logged_at >= '2024-11-12'", must: 'login_name=\\? AND logged_at>\\?', msg: 'Parantezde login_name=? ve logged_at>? görünmeli.' }, ynl: ['CREATE INDEX ix_y ON ops_query_log (logged_at, login_name);', 'CREATE INDEX ix_y ON ops_query_log (logged_at);'] });
}

/* ------------------------------------------------------------------ Var olan dersler */
{ const v = LS.find(x => x.id === 'veri-seti'); v.body += '<div class="note"><b>Operasyon günlüğü</b>Şirket verilerine ek olarak kurgusal bir operasyon günlüğü de var: <code>ops_</code> tabloları. Hayali bir portalın sorgu ve erişim kayıtlarıdır, <b>SQL Server Operasyon ve Güvenlik</b> yolunda kullanılır.</div>'; }
/* ------------------------------------------------------------------ Öğrenme yolları */
const PA = {}; window.SQLP_PATHS.forEach(p => PA[p.id] = p);
const insAfter = (id, after, ids) => { const p = PA[id]; const i = p.lessons.indexOf(after); if (i < 0) throw new Error('c39: ' + id + ' yolunda yok ' + after); const yeni = ids.filter(x => !p.lessons.includes(x)); p.lessons.splice(i + 1, 0, ...yeni); p.opt = (p.opt || []).filter(x => !yeni.includes(x)); };
const optEkle = (id, ids) => { const p = PA[id]; p.opt = (p.opt || []).concat(ids.filter(x => !p.lessons.includes(x) && !(p.opt || []).includes(x))); };
const compEkle = (id, ad, ids) => { const c = (PA[id].comp || []).find(x => x.t === ad); if (!c) throw new Error('c39: yetkinlik yok ' + id + ' ' + ad); ids.forEach(x => { if (PA[id].lessons.includes(x) && !c.l.includes(x)) c.l.push(x); }); };
/* DBA: son dersler izlemeden sonra; pencerede önceki satır için lag-lead önkoşul */
insAfter('dba', 'ranking', ['lag-lead']);
insAfter('dba', 'dba-izleme', ['ops-kaynak', 'ops-parmak-izi', 'ops-onbellek', 'ops-injection', 'ops-anomali']);
PA.dba.lessons.push('ops-proje');
compEkle('dba', 'Performans', ['ops-kaynak', 'ops-parmak-izi', 'ops-onbellek']);
compEkle('dba', 'Güvenlik', ['ops-injection', 'ops-anomali']);
PA.dba.comp.find(x => x.t === 'Bitirme projesi').l.push('ops-proje');
/* T-SQL: dinamik SQL ve güvenlikten sonra injection; performans derslerinden sonra kaynak */
{ const L = PA.tsql.lessons; const son = Math.max(L.indexOf('ts-dinamik'), L.indexOf('ts-guvenlik')); L.splice(son + 1, 0, 'ops-injection');
  const pl = Math.max(L.indexOf('opt-turler'), L.indexOf('ts-plan')); L.splice(pl + 1, 0, 'ops-kaynak'); }
optEkle('tsql', ['ops-parmak-izi', 'ops-onbellek', 'ops-anomali', 'ops-proje']);
compEkle('tsql', 'Performans ve güvenlik', ['ops-kaynak', 'ops-injection']);
/* Uzman: izleme ve güvenlik derslerinin ardından */
insAfter('uzman', 'dba-izleme', ['ops-kaynak', 'ops-parmak-izi', 'ops-onbellek']);
insAfter('uzman', 'ts-guvenlik', ['ops-injection', 'ops-anomali']);
PA.uzman.lessons.push('ops-proje');
compEkle('uzman', 'Performans', ['ops-kaynak', 'ops-parmak-izi', 'ops-onbellek']);
compEkle('uzman', 'SQL türleri ve güvenlik', ['ops-injection', 'ops-anomali', 'ops-proje']);
optEkle('mulakat', ['ops-injection', 'ops-anomali']);
window.SQLP_PATHS.splice(window.SQLP_PATHS.findIndex(p => p.id === 'optimizasyon') + 1, 0, {
  id: 'sql-operasyon', name: 'SQL Server Operasyon ve Güvenlik', short: 'OPS', color: '#7C3AED', kind: 'konu',
  desc: 'Kodu değiştirilemeyen uygulamada performans, sorgu parmak izi, önbellek kararı, SQL injection savunması, günlükte anomali avı ve "Salı sabahı" bitirme projesi.',
  long: 'CTE, pencere fonksiyonu, indeks ve plan okumayı bildiğini varsayar: önce Sorgu Optimizasyonu yolunun ilk derslerine bak. Veri tamamen kurgusaldır: hayali bir portalın sorgu ve erişim günlüğü. SQL Server komutları (Query Store, denetim) Microsoft Learn\'e dayanır ve burada çalıştırılmaz, okunur. Sorgular kurgusal tablolar üzerinde çalışır.',
  skills: ['Plan zorlama ve riski', 'Sorgu parmak izi', 'En maliyetli sorgular', 'Önbellek kararı', 'Parametreli sorgu', 'En az yetki', 'Anomali avı', 'Olay teşhisi'],
  lessons: ['ops-kaynak', 'ops-parmak-izi', 'ops-onbellek', 'ops-injection', 'ops-anomali', 'ops-proje'],
  opt: ['index', 'opt-plan', 'opt-indeks', 'lag-lead', 'dba-izleme', 'ts-plan', 'opt-turler', 'ts-dinamik', 'ts-guvenlik', 'guvenlik', 'view-ileri'],
  comp: [
    { t: 'Performans', d: 'Kodsuz seçenekler, parmak izi, önbellek', l: ['ops-kaynak', 'ops-parmak-izi', 'ops-onbellek'] },
    { t: 'Güvenlik', d: 'SQL injection savunması ve anomali avı', l: ['ops-injection', 'ops-anomali'] },
    { t: 'Bitirme projesi', d: 'Teşhis, kanıt, karar', l: ['ops-proje'] }
  ],
  beyond: ['Gerçek SQL Server üzerinde Query Store ve denetim kurmak', 'Olay müdahale süreci ve hukuk, uyum ekipleriyle çalışma', 'SIEM ve merkezî günlük araçları']
});
})();
