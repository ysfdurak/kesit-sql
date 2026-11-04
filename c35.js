/* Kesit SQL — son düzeltme katmanı (denetim bulguları). Önceki dosyaları yerinde değiştirir.
   Ders kimlikleri ve alıştırma sıraları değişmez; kayıtlı ilerleme korunur. */
(function () {
'use strict';
const LS = window.SQLP_LESSONS; const LM = id => LS.find(l => l.id === id);
const EX = (id, i) => { const l = LM(id); const e = l && l.ex && l.ex[i]; if (!e) throw new Error('c35: alıştırma yok ' + id + '#' + i); return e; };
const PR = id => { const p = window.SQLP_PRACTICE.find(x => x.id === id); if (!p) throw new Error('c35: pratik yok ' + id); return p; };
const SUB = (o, k, a, b) => { if (!String(o[k]).includes(a)) throw new Error('c35: metin bulunamadı: ' + a.slice(0, 50)); o[k] = String(o[k]).split(a).join(b); };
const BODY = (id, a, b) => SUB(LM(id), 'body', a, b);

/* ---------- Şema: bank_fx.try_rate dört ondalıklıdır (örn. 35,5027); DECIMAL(4,2) değil ---------- */
window.SQLP_TYPEMAP.rate = { tsql: 'DECIMAL(10,4)', pg: 'NUMERIC(10,4)', mysql: 'DECIMAL(10,4)', oracle: 'NUMBER(10,4)', bq: 'NUMERIC', sqlite: 'REAL' };
(window.SQLP_COLMETA.bank_fx || []).forEach(c => { if (c[0] === 'try_rate') c[1] = 'rate'; });

/* ---------- Gerçek motorda farklı sonuç veren ya da çalışmayan çözümler ---------- */
/* LIKE harf duyarlılığı motordan motora değişir: sonucu değişmeyen bir terim */
{ const e = EX('in-between-like', 6); e.q = '<p>Adında <b>Pizza</b> geçen menü ürünlerini getir: <code>name</code>, <code>price</code>.</p>'; e.sol = "SELECT name, price FROM lk_menu_items WHERE name LIKE '%Pizza%';"; }
/* Eşit sched_dep satırları: sıra belirsiz kalmasın */
{ const p = PR('k204'); SUB(p, 'sol', 'SELECT f.tail_no, f.sched_dep,', 'SELECT f.tail_no, f.flight_id, f.sched_dep,'); SUB(p, 'sol', 'ORDER BY sched_dep)', 'ORDER BY sched_dep, flight_id)'); }
/* Özyinelemeli CTE: iki kolun tipi aynı olmalı */
SUB(PR('i158'), 'sol', 'first_name AS zincir', 'CAST(first_name AS TEXT) AS zincir');
{ const p = PR('n016'); SUB(p, 'sol', "SELECT 'IST', 0", "SELECT CAST('IST' AS TEXT), 0"); SUB(p, 'sol', 'SELECT r.dest, y.adim', 'SELECT CAST(r.dest AS TEXT), y.adim'); }
/* rowid yalnız SQLite ve Oracle'da var; PostgreSQL'de ctid */
{ const e = EX('de-dedup', 0); e.q = "<p><code>raw_signups</code> için normalize edilmiş e-posta (<code>LOWER(TRIM(email))</code>) başına <b>tek satır</b> bırak; en küçük <code>id</code>'yi seç. Sütunlar: <code>id</code>, <code>email</code> (normalize).</p>"; e.sol = 'WITH s AS (SELECT id, LOWER(TRIM(email)) AS email, ROW_NUMBER() OVER (PARTITION BY LOWER(TRIM(email)) ORDER BY id) AS rn FROM raw_signups) SELECT id, email FROM s WHERE rn = 1;'; }
EX('de-dedup', 1).dl = ['pg', 'oracle', 'sqlite'];
SUB(EX('de-incremental', 2), 'check', 'product_id || updated_at', "product_id || '|' || updated_at");
/* Standart sapma: tutarlar eşitse sıfıra yakın payda taşma yaratmasın */
SUB(EX('proje-bilimci', 1), 'sol', 'WHERE n >= 10 AND sd > 0 AND', 'WHERE n >= 10 AND sd > 0.01 AND');

/* Türkçe duyarlı UPPER/LOWER: anahtar önce büyütülür, sonra Türkçe harfler sadeleşir; her yerelde aynı sonuç */
{ const e = EX('metin-benzerlik', 0), chain = u => "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(" + u + ", 'İ', 'I'), 'Ş', 'S'), 'Ğ', 'G'), 'Ü', 'U'), 'Ö', 'O'), 'Ç', 'C')", x = "TRANSLATE(UPPER(TRIM(city)), 'İŞĞÜÖÇ', 'ISGUOC')", tail = (k, g) => ' AS anahtar, COUNT(*) AS kayit FROM raw_signups WHERE ' + k + '(TRIM(city)) > 0 GROUP BY ' + g + ';';
  const tq = "TRANSLATE(UPPER(TRIM(city)), N'İŞĞÜÖÇ', N'ISGUOC')"; e.sol = 'SELECT ' + tq + tail('LEN', tq);
  e.solv = { pg: 'SELECT ' + x + tail('LENGTH', '1'), oracle: 'SELECT ' + x + tail('LENGTH', x), sqlite: 'SELECT ' + chain('UPPER(TRIM(city))') + tail('LENGTH', '1'), mysql: 'SELECT ' + chain('UPPER(TRIM(city))') + tail('CHAR_LENGTH', '1'), bq: 'SELECT ' + chain('UPPER(TRIM(city))') + tail('LENGTH', '1') }; }
SUB(EX('de-etl', 3), 'sol', "LOWER(TRIM(city)) = 'istanbul' OR TRIM(city) = 'İstanbul'", "LOWER(TRIM(city)) = 'istanbul' OR UPPER(TRIM(city)) = 'ISTANBUL'");
SUB(PR('i211'), 'sol', 'ROUND(AVG(price) - percentile_cont(0.5) WITHIN GROUP (ORDER BY price), 2)', 'ROUND(CAST(AVG(price) - percentile_cont(0.5) WITHIN GROUP (ORDER BY price) AS NUMERIC), 2)');


/* ---------- Kavram düzeltmeleri ---------- */
/* sargable: UNION ALL tekrar üretir */
BODY('sargable', '<code>UNION ALL</code> ile ikiye bölmek bazen hızlandırır.', 'her kolu kendi indeksiyle çalışan <code>UNION</code> sorgusuna bölmek bazen hızlandırır. <code>UNION ALL</code> kullanacaksan ikinci kola <code>AND a &lt;&gt; 1</code> ekle (a NULL olabiliyorsa <code>a IS DISTINCT FROM 1</code>); yoksa iki koşulu da sağlayan satırlar iki kez gelir.');
/* veri-tipleri: ondalık sabitler çoğu motorda kesin türdedir */
BODY('veri-tipleri', `<pre class="code">SELECT 0.1 + 0.2                        AS toplam,
       CASE WHEN 0.1 + 0.2 = 0.3 THEN 'eşit' ELSE 'eşit değil' END AS karsilastirma,
       ROUND(0.1 + 0.2, 2)              AS yuvarlanmis;</pre>`, `<pre class="code" data-v="${String(JSON.stringify({ oracle: "SELECT CAST(0.1 AS BINARY_DOUBLE) + CAST(0.2 AS BINARY_DOUBLE) AS toplam,\n       CASE WHEN CAST(0.1 AS BINARY_DOUBLE) + CAST(0.2 AS BINARY_DOUBLE) = CAST(0.3 AS BINARY_DOUBLE) THEN 'eşit' ELSE 'eşit değil' END AS karsilastirma\nFROM dual;" })).replace(/&/g, '&amp;').replace(/"/g, '&quot;')}">SELECT CAST(0.1 AS FLOAT) + CAST(0.2 AS FLOAT) AS toplam,
       CASE WHEN CAST(0.1 AS FLOAT) + CAST(0.2 AS FLOAT) = CAST(0.3 AS FLOAT) THEN 'eşit' ELSE 'eşit değil' END AS karsilastirma;</pre>
<p>Tipi açıkça <code>FLOAT</code> yazdık, çünkü <code>0.1</code> gibi ondalık sabitler PostgreSQL, SQL Server, MySQL ve Oracle'da kesin türdedir: orada <code>0.1 + 0.2 = 0.3</code> doğru çıkar. Sorun sütun ya da ifade kayan noktalı olduğunda başlar. Bu örnekteki eşitsizliği PostgreSQL'de gerçek motorda doğruladık. Bu uygulamanın motoru SQLite olduğu için burada sabitler de kayan noktalı çalışır; bu, taklidin bilinen sınırlarından biridir.</p>`);
/* metin: UPPER ve LOWER */
BODY('metin', "SQLite'ın UPPER/LOWER fonksiyonları yalnızca İngilizce harfleri dönüştürür. SQL Server, PostgreSQL ve Oracle'da doğru <i>collation</i> (harmanlama) ile Türkçe <code>İ/ı</code> düzgün çalışır; yine de “i” ile “İ” dönüşümünü mutlaka test et.", "Bu uygulamada <code>UPPER</code> ve <code>LOWER</code> Türkçe kurala göre çalışır: i ↔ İ, ı ↔ I (içinde @ geçen metinlerde, yani e-postalarda, İngilizce kurala göre). Gerçek sunucuda sonucu <i>collation</i> ya da yerel ayarı belirler: Yerel ayarı Türkçe olmayan bir PostgreSQL <code>UPPER('inci')</code> için <code>INCI</code> döndürür, saf SQLite ise yalnız İngilizce harfleri çevirir. İşe başladığın sunucuda “i” ile “İ” dönüşümünü mutlaka test et.");
/* T-SQL + işlemi */
/* ipucu: yalnız SQLite kalıbı öğretilmesin */
EX('sayi-tip', 1).hint = "Paya <code>100.0 *</code> ekleyerek tam sayı bölmesinden kurtul. İptalleri saymak için <code>SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END)</code> her SQL türünde çalışır; <code>SUM(status = 'cancelled')</code> yalnız SQLite ve MySQL'de geçerlidir.";
/* dba-yedek: tail-log */
BODY('dba-yedek', "<pre class=\"code\" data-norun>RESTORE DATABASE anadolu FROM DISK = N'...full.bak' WITH NORECOVERY;   -- Pazar tam", "<p>Veritabanı hâlâ ayaktaysa ilk iş <b>son günlük yedeği (tail-log backup)</b> almaktır: son günlük yedeğinden sonraki işlemler başka yerde yoktur, geri yükleme başlayınca kaybolur. <code>WITH NORECOVERY</code> veritabanını geri yüklemeye hazır duruma alır; dosyalar hasarlıysa <code>NO_TRUNCATE</code> eklenir.</p>\n<pre class=\"code\" data-norun>BACKUP LOG anadolu TO DISK = N'...tail.trn' WITH NORECOVERY;   -- önce son günlük yedeği\nRESTORE DATABASE anadolu FROM DISK = N'...full.bak' WITH NORECOVERY;   -- Pazar tam");
/* ts-index ile dba-bakim aynı eşikleri söylesin */
BODY('ts-index', "%30 üzeri için <code>ALTER INDEX ... REBUILD</code>, daha az için <code>REORGANIZE</code> önerilir.", "yaygın başlangıç kuralı %5–30 için <code>REORGANIZE</code>, %30 üzeri için <code>ALTER INDEX ... REBUILD</code>, 1000 sayfadan küçük indekse dokunmamaktır; ayrıntı ve bu eşiklerin tartışması <b>Bakım</b> dersinde (<code>dba-bakim</code>).");
/* performans: var olmayan önceki ders */
BODY('performans', 'Tam tarama, iç içe döngü ve tahmini satır sayılarını incele (önceki ders).', 'Tam tarama, iç içe döngü ve tahmini satır sayılarını incele (<b>İndeksler ve sorgu planı</b> dersi).');
/* deadlock grafiği */
BODY('ts-izolasyon', '<h2>Deadlock', `<div class="note"><b>Deadlock grafiği</b>Hangi iki oturumun neden kilitlendiğini grafik gösterir. SQL Server'da varsayılan <code>system_health</code> Extended Events oturumu deadlock kayıtlarını tutar; XML kaydını SSMS'te açınca süreçler ve kaynaklar çizilir. Okurken sor: kurban kim, hangi iki nesneye ters sırayla erişildi? Çözüm çoğunlukla nesnelere aynı sırayla erişmek ve işlemi kısaltmaktır.
<pre class="code" data-norun>SELECT CAST(event_data AS XML) AS olay
FROM sys.fn_xe_file_target_read_file('system_health*.xel', NULL, NULL, NULL)
WHERE object_name = 'xml_deadlock_report';</pre></div>
<h2>Deadlock`.replace(/^/, ''));
/* upsert: aynı tablo iki kez */
{ const l = LM('upsert'); const t2 = "<table><tr><th>SQL türü</th><th>Yazım</th></tr><tr><td>PostgreSQL, SQLite</td><td><code>INSERT ... ON CONFLICT (anahtar) DO UPDATE SET ...</code></td></tr><tr><td>MySQL</td><td><code>INSERT ... ON DUPLICATE KEY UPDATE ...</code></td></tr><tr><td>SQL Server, Oracle, BigQuery</td><td><code>MERGE INTO hedef USING kaynak ON ... WHEN MATCHED ... WHEN NOT MATCHED ...</code></td></tr></table>"; if (!l.body.includes(t2)) throw new Error('upsert tablosu'); l.body = l.body.replace(t2, ''); BODY('upsert', '<tr><td>SQL Server, Oracle</td><td><code>MERGE INTO hedef', '<tr><td>SQL Server, Oracle, BigQuery</td><td><code>MERGE INTO hedef'); }

/* ---------- Yeni dersler ---------- */
const newLesson = (after, o) => { const i = LS.findIndex(l => l.id === after); LS.splice(i + 1, 0, o); };
newLesson('be-desenler', { id: 'be-kilit', lv: 'B2', mod: 'Uygulama Geliştirme', min: 15,
  title: 'Eşzamanlılık uygulaması: çift rezervasyon, FOR UPDATE, SKIP LOCKED',
  sum: 'Aynı satırı iki istek aynı anda değiştirirse ne olur; koşullu güncelleme, satır kilidi, iş kuyruğu ve yeniden deneme.',
  en: 'concurrency race condition double booking lost update select for update skip locked job queue retry deadlock',
  body: `<p>İki kullanıcı son koltuğu aynı anda alıyor. İki istek de “stok 1” okuyor, ikisi de satış yapıyor: <b>çift rezervasyon</b>. Sorun SQL'in yanlış yazılması değil, okuma ile yazma arasındaki boşluk. Bu derste bu boşluğu kapatmanın dört yolunu görürsün.</p>
<div class="warn"><b>Bu tarayıcıda deneyemezsin</b>Buradaki motorda tek bağlantı var, yani gerçek eşzamanlılık yok. Kilit örnekleri bu yüzden çalıştırılabilir kutuda değil. Sözdizimini PostgreSQL'de doğruladık; davranışı kendi sunucunda iki oturum açarak dene.</div>
<h2>1. Tek ifadede koşullu güncelleme</h2>
<p>Çoğu durumda en basit ve en güvenli yol budur. Okumayı ve yazmayı tek ifadede birleştir, sonra etkilenen satır sayısına bak: 0 ise stok bitmiştir.</p>
<pre class="code">UPDATE products SET stock = stock - 1 WHERE product_id = 7 AND stock >= 1;</pre>
<h2>2. Kötümser kilit: FOR UPDATE</h2>
<p>Okuduğun değere göre uygulamada karar vereceksen satırı okurken kilitle. İkinci oturum, birincisi işlemi bitirene kadar bekler.</p>
<pre class="code" data-norun>BEGIN;
SELECT stock FROM products WHERE product_id = 7 FOR UPDATE;
-- uygulama kararını verir
UPDATE products SET stock = stock - 1 WHERE product_id = 7;
COMMIT;</pre>
<table><tr><th>SQL türü</th><th>Satırı kilitleyerek okuma</th><th>Kilitli satırı atlama</th></tr>
<tr><td>PostgreSQL, MySQL 8+, Oracle</td><td><code>FOR UPDATE</code></td><td><code>FOR UPDATE SKIP LOCKED</code></td></tr>
<tr><td>SQL Server</td><td><code>WITH (UPDLOCK, ROWLOCK)</code></td><td><code>WITH (UPDLOCK, READPAST)</code></td></tr>
<tr><td>SQLite, BigQuery</td><td>Yok</td><td>Yok</td></tr></table>
<h2>3. İş kuyruğu: SKIP LOCKED</h2>
<p>Birden çok işçi aynı kuyruktan iş çekiyorsa <code>FOR UPDATE</code> onları sıraya dizer. <code>SKIP LOCKED</code> kilitli satırı atlar, her işçi boşta olan bir sonraki işi alır.</p>
<pre class="code" data-norun>BEGIN;
SELECT job_id FROM jobs
WHERE status = 'bekliyor'
ORDER BY job_id
LIMIT 1
FOR UPDATE SKIP LOCKED;
UPDATE jobs SET status = 'calisiyor' WHERE job_id = :secilen;
COMMIT;</pre>
<h2>4. İyimser kilit ve yeniden deneme</h2>
<p>Çakışma seyrekse kilit tutmak yerine sürüm sütunu kullan: <code>UPDATE ... SET surum = surum + 1 WHERE id = :id AND surum = :okunan</code>. Etkilenen satır 0 ise başkası önce davranmıştır; yeniden oku ve dene.</p>
<p>Deadlock ve serileştirme hataları normaldir, kod bunlara hazır olmalı: PostgreSQL <code>40P01</code> ve <code>40001</code>, SQL Server <code>1205</code> döndürür. İşlemi baştan, az sayıda ve kısa beklemeyle yeniden dene. Tek ifadenin bir bölümünü değil, <b>bütün işlemi</b> tekrarla.</p>
<div class="tip"><b>Hangisini seçmeli?</b>Tek satır ve basit koşul: koşullu UPDATE. Uygulama kararı gerekiyor: FOR UPDATE, işlemi kısa tut. Birden çok işçi: SKIP LOCKED. Çakışma seyrek, işlem uzun: sürüm sütunu.</div>`,
  ex: [
    { t: 'sql', q: '<p>7 numaralı üründen 1 adet düş; stok yoksa hiçbir satır değişmesin. Okuma ve yazmayı tek <code>UPDATE</code> ifadesinde birleştir.</p>', sol: 'UPDATE products SET stock = stock - 1 WHERE product_id = 7 AND stock >= 1;', check: 'SELECT product_id, stock FROM products WHERE product_id = 7', must: [{ re: '\\bWHERE\\b[\\s\\S]*\\bstock\\b', msg: 'Stok kontrolü WHERE içinde olmalı; iki isteğin aynı anda satış yapmasını engelleyen bu koşul.' }], hint: 'WHERE içinde iki koşul gerekir: hangi ürün ve stokun yeterli olması.' },
    { t: 'mc', q: '<p>Uygulama önce <code>SELECT stock</code> yapıp stok 1 ise ayrı bir <code>UPDATE</code> gönderiyor. Sorun nedir?</p>', o: ['UPDATE yavaş çalışır', 'İki istek aynı değeri okuyup ikisi de satış yapabilir', 'SELECT tabloyu kilitler', 'Sorun yoktur'], a: 1, why: 'Okuma ile yazma arasında başka bir işlem araya girebilir. Buna kayıp güncelleme (lost update) denir.' },
    { t: 'mc', q: '<p><code>SKIP LOCKED</code> en çok hangi iş için uygundur?</p>', o: ['Raporlama sorgusunu hızlandırmak', 'Birden çok işçinin aynı kuyruktan çakışmadan iş çekmesi', 'Tablodaki bütün kilitleri kaldırmak', 'Deadlock grafiğini okumak'], a: 1, why: 'Kilitli satır beklenmeden atlanır; her işçi boşta olan işi alır. Tutarlı rapor için uygun değildir, çünkü satırları atlar.' },
    { t: 'mc', q: '<p>İyimser kilitte <code>UPDATE ... WHERE id = 5 AND surum = 3</code> 0 satır etkiledi. Ne yapmalısın?</p>', o: ['Hatayı yok say', 'Satırı yeniden oku, kararı yeniden ver, yeniden dene', 'surum koşulunu kaldır', 'Tabloyu kilitle'], a: 1, why: 'Başka bir işlem satırı senden önce değiştirmiş. Eski değere göre yazmak o değişikliği ezer.' }
  ] });
newLesson('de-incremental', { id: 'de-cdc', lv: 'C1', mod: 'Veri Mühendisliği', min: 14,
  title: 'Değişen veriyi yakalamak (CDC, change data capture)',
  sum: 'Sorgulayarak mı günlükten mi okumalı; silmeler, sıra, tekrar eden olaylar ve zamanlama.',
  en: 'cdc change data capture debezium wal binlog logical replication watermark polling airflow orkestrasyon orchestration',
  body: `<p>Kaynak sistemdeki her değişikliği ambara taşımak istiyorsun, ama her gece tüm tabloyu kopyalamak pahalı. <b>CDC</b> (change data capture) yalnız değişen satırları yakalar.</p>
<h2>İki yol</h2>
<table><tr><th>Yol</th><th>Nasıl</th><th>Kaçırdığı ya da bedeli</th></tr>
<tr><td><b>Sorgulayarak (polling)</b></td><td><code>WHERE updated_at &gt; :watermark</code> ile değişenleri çeker</td><td>Fiziksel silmeleri görmez; aynı satırın iki değişimi arasındaki ara hâli kaçırır; <code>updated_at</code> güncellenmiyorsa hiçbir şey görmez</td></tr>
<tr><td><b>Günlükten (log-based)</b></td><td>Veritabanının işlem günlüğünü okur: PostgreSQL mantıksal çoğaltma (<code>wal_level = logical</code>), MySQL binlog, SQL Server CDC (<code>sys.sp_cdc_enable_table</code>). Debezium gibi araçlar bunları olay akışına çevirir</td><td>Silmeler dahil her değişikliği sırayla görür; ama kurulum ve yetki ister, günlük saklama süresi dolarsa olay kaybolur</td></tr></table>
<h2>Olayları hedefe uygulamak</h2>
<p>Bir değişiklik olayı en az şunları taşır: anahtar, işlem türü (ekleme, güncelleme, silme), yeni değerler, sıra bilgisi. Üç kural:</p>
<ul><li><b>Sıra:</b> Aynı anahtarın olayları sırayla uygulanır, yoksa eski değer yeniyi ezer.</li>
<li><b>Tekrar:</b> Çoğu boru hattı “en az bir kez” teslim eder. Uygulama idempotent olmalı: aynı olay iki kez gelse de sonuç değişmemeli (<code>MERGE</code>, sıra numarası kontrolü).</li>
<li><b>Sıkıştırma:</b> Toplu uygularken anahtar başına yalnız son olay yeter.</li></ul>
<pre class="code">WITH s AS (
  SELECT product_id, new_price, updated_at,
         ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY updated_at DESC) AS sira
  FROM price_updates
)
SELECT product_id, new_price, updated_at
FROM s
WHERE sira = 1;</pre>
<div class="note"><b>Zamanlama</b>Bu işleri Airflow gibi bir orkestrasyon aracı sıraya koyar: bağımlılık, yeniden deneme ve izleme onun işidir. SQL tarafında senin sorumluluğun, bir adım iki kez çalışsa da sonucu bozmayan sorgu yazmaktır. Toplu yüklemede watermark: <b>Artımlı yükleme</b> dersi.</div>`,
  ex: [
    { t: 'sql', q: '<p><code>price_updates</code> bir değişiklik akışı gibi düşün. Anahtar başına son olayı bırak: her ürün için en son <code>new_price</code>. Sütunlar: <code>product_id</code>, <code>new_price</code>.</p>', sol: 'WITH s AS (SELECT product_id, new_price, ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY updated_at DESC) AS sira FROM price_updates) SELECT product_id, new_price FROM s WHERE sira = 1;', hint: 'Her ürünün olaylarını en yeniden eskiye numaralandır, 1 numaralıları al.' },
    { t: 'mc', q: '<p><code>updated_at &gt; :watermark</code> ile sorgulayan CDC neyi göremez?</p>', o: ['Yeni eklenen satırları', 'Güncellenen satırları', 'Fiziksel olarak silinen satırları', 'Sayısal sütun değişikliklerini'], a: 2, why: 'Silinen satır sorguya hiç gelmez. Yumuşak silme (silindi işareti) kullanılmıyorsa günlük tabanlı CDC gerekir.' },
    { t: 'mc', q: '<p>Boru hattı aynı olayı iki kez teslim edebiliyor. Hedefteki yükleme nasıl olmalı?</p>', o: ['Her olayı INSERT ile eklemeli', 'Idempotent olmalı: aynı olay iki kez gelse de sonuç değişmemeli', 'İkinci olay gelince boru hattını durdurmalı', 'Olayları sırasız uygulamalı'], a: 1, why: 'En az bir kez teslimde tekrar normaldir. MERGE ve sıra numarası kontrolü sonucu korur.' },
    { t: 'mc', q: '<p>Aynı anahtarın iki olayı ters sırada uygulanırsa ne olur?</p>', o: ['Fark etmez', 'Eski değer yeniyi ezer', 'Veritabanı hata verir', 'Satır silinir'], a: 1, why: 'Bu yüzden olaylar sıra bilgisi taşır ve anahtar başına sırayla uygulanır.' }
  ] });

/* ---------- Öğrenme yolları: önkoşul sırası, rol ve konu ayrımı ---------- */
const PA = {}; window.SQLP_PATHS.forEach(p => PA[p.id] = p);
const W = s => s.trim().split(/\s+/);
function setPath(id, core, opt) { const p = PA[id]; const before = new Set(p.lessons.concat(p.opt || [])); p.lessons = W(core); p.opt = W(opt || ''); p.opt = p.opt.filter(x => x); p.lessons.concat(p.opt).forEach(x => { if (!LM(x)) throw new Error('c35: yolda ders yok ' + x); before.delete(x); }); if (before.size) p.opt = p.opt.concat([...before]); }
setPath('temel', `ilk-sorgu veritabani select veri-seti alias-distinct hesaplama where mantik in-between-like null order-limit aggregate group-by having case coalesce kosullu metin sayi-tip tarih-fn tarih-filtre sorgu-sirasi iliskiler inner-join left-join self-cross-join coklu-join kamp-musteri set-ops subquery correlated cte window-intro ranking lag-lead frames dml ddl-create kisitlar kamp-eticaret proje-temel`);
setPath('analist', `veritabani veri-seti araclar select alias-distinct hesaplama where mantik in-between-like null order-limit aggregate group-by having toplama-tuzak case coalesce null-guvenli kosullu metin sayi-tip tarih-fn tarih-filtre sorgu-sirasi iliskiler inner-join left-join self-cross-join coklu-join an-temizlik an-eda subquery correlated exists-anyall set-ops cte sik-hatalar hata-ayiklama an-kpi proje-temel window-intro ranking lag-lead frames recursive-cte takvim son-deger an-dashboard bi-pay ytd an-buyume pivot rollup an-pareto an-kohort an-funnel an-aktif an-churn an-rfm ds-tanimsal ds-dagilim ds-ab index view performans dwh bi-hazirlik ai-giris mulakat-1 mulakat-2 vaka-kayip kvkk proje-analist`,
  `like-escape metin-birlestir stil join-ozet kamp-musteri kamp-eticaret first-last pencere-cerceve ntile-dist an-sepet ai-dogrulama vaka-yilsonu regex metin-benzerlik collation veri-tipleri non-equi lateral python-sql unpivot ardisik-seri zaman-araligi lehceler bq-giris cert-gda bq-dizi bq-kisayol bs-giris bs-kohort bs-oturum bs-rfm bs-ops bs-aml bs-scd ik-giris ik-devir ik-ucret`);
setPath('muhendis', `veritabani veri-seti araclar select where mantik null order-limit aggregate group-by having metin tarih-fn case coalesce kosullu dml null-guvenli iliskiler inner-join left-join self-cross-join coklu-join set-ops subquery correlated lateral sik-hatalar hata-ayiklama cte recursive-cte hiyerarsi takvim window-intro ranking lag-lead frames son-deger pivot veri-tipleri regex sayi-tip ddl-create kisitlar upsert alter-drop transaction er-modelleme normalizasyon tasarim-kaliplari index performans-lab sargable view view-ileri trigger performans acid dwh de-etl de-kalite sql-test de-dedup de-incremental de-cdc de-scd de-dbt python-sql bq-giris bq-dizi bq-maliyet dwh-bulut cert-dbx-snow json kvkk de-partition veri-aktarim lehceler guvenlik modern-ekosistem proje-muhendis`,
  `ts-sequence ts-merge ts-proc ts-hata bs-giris bs-kohort bs-oturum bs-rfm bs-ops bs-aml bs-scd`);
setPath('dba', `araclar ts-giris select where mantik null order-limit ts-top aggregate group-by having case coalesce collation dml inner-join left-join subquery cte window-intro ranking set-ops dba-mimari ts-degisken ts-gecici ts-sistem ts-sequence ddl-create kisitlar alter-drop transaction acid normalizasyon tasarim-kaliplari view ts-proc ts-hata ts-cursor ts-trigger ts-dinamik index sargable ts-index ts-plan performans ts-izolasyon guvenlik ts-guvenlik kvkk ts-temporal dba-yedek dba-bakim dba-izleme dba-ha veri-aktarim tam-metin azure-sql dp300-yonetim de-partition lehceler performans-lab proje-dba`);
setPath('backend', `veritabani araclar select where mantik null order-limit aggregate group-by having case coalesce metin tarih-fn dml null-guvenli like-escape iliskiler er-modelleme inner-join left-join self-cross-join coklu-join set-ops subquery correlated lateral cte window-intro ranking veri-tipleri ddl-create kisitlar normalizasyon alter-drop upsert transaction acid be-kilit index performans-lab sargable view view-ileri trigger json performans be-orm be-sayfalama be-desenler tasarim-kaliplari tam-metin cografi be-migration sql-test kvkk ai-giris ai-vektor ai-guvenli ts-sequence collation guvenlik lehceler proje-backend`);
setPath('bi', `veri-seti araclar select alias-distinct hesaplama where mantik in-between-like like-escape null order-limit aggregate group-by having metin-birlestir case coalesce null-guvenli kosullu metin tarih-fn tarih-filtre sorgu-sirasi stil iliskiler er-modelleme inner-join left-join self-cross-join coklu-join join-ozet dwh bi-hazirlik set-ops subquery correlated proje-temel cte recursive-cte takvim window-intro ranking lag-lead frames son-deger an-kpi an-dashboard bq-giris bi-pay an-buyume ytd pivot unpivot rollup an-pareto view view-ileri index sargable performans dwh-bulut vaka-yilsonu kvkk proje-bi`,
  `python-sql ai-guvenli`);
setPath('tsql', `ts-giris araclar veri-seti select where mantik in-between-like like-escape null order-limit ts-top sozdizimi aggregate group-by having metin-birlestir case coalesce null-guvenli kosullu dml ts-metin collation regex metin-benzerlik ts-tarih veri-tipleri ts-donusum iliskiler inner-join left-join self-cross-join coklu-join set-ops subquery correlated sik-hatalar hata-ayiklama cte recursive-cte hiyerarsi takvim window-intro ranking lag-lead frames son-deger ts-degisken ts-gecici rollup ts-pivot ts-apply lateral ts-liste ts-sistem ts-sequence ddl-create kisitlar alter-drop normalizasyon transaction view view-ileri ts-merge ts-proc ts-func ts-hata ts-cursor ts-trigger ts-guvenlik kvkk ts-temporal ts-dinamik ts-json index ts-index sargable ts-plan performans-lab ts-izolasyon cert-tsql lab-tsql mulakat-1 mulakat-2 kamp-ik proje-tsql`);
setPath('bilimci', `veritabani veri-seti select alias-distinct hesaplama where mantik in-between-like like-escape null order-limit aggregate group-by having metin-birlestir sayi-tip tarih-fn case coalesce null-guvenli kosullu sorgu-sirasi inner-join left-join coklu-join subquery correlated lateral exists-anyall sik-hatalar hata-ayiklama ds-tanimsal ds-olasilik cte recursive-cte takvim window-intro ranking lag-lead first-last frames son-deger pencere-cerceve ntile-dist ardisik-seri zaman-araligi pivot unpivot ds-dagilim ds-outlier ds-ornekleme ds-korelasyon ds-ab ds-feature an-sepet ds-zaman python-sql json cografi bq-giris bq-dizi ai-giris ai-dogrulama ai-vektor ai-ml mulakat-1 mulakat-2 vaka-kayip proje-bilimci`);
/* Yetkinlik haritası yalnız yolun çekirdek derslerini göstersin */
window.SQLP_PATHS.forEach(p => { if (!p.comp) return; p.comp.forEach(c => { c.l = c.l.filter(x => p.lessons.includes(x)); }); p.comp = p.comp.filter(c => c.l.length); });
/* Yol türü: rol, konu, sertifika */
const KIND = { temel: 'rol', analist: 'rol', bilimci: 'rol', muhendis: 'rol', bi: 'rol', dba: 'rol', backend: 'rol', tsql: 'rol', uzman: 'konu', yz: 'konu', hava: 'konu', buyuk: 'konu', mulakat: 'konu', 'ik-analitigi': 'konu', 'buyuk-veri': 'konu', sertifika: 'sertifika', 'sert-mssql': 'sertifika', 'sert-bulut': 'sertifika' };
window.SQLP_PATHS.forEach(p => { p.kind = KIND[p.id] || 'konu'; });
PA.uzman.short = 'İLERİ';
PA.bi.name = 'İş Zekâsı ve Raporlama Uzmanı';
PA.hava.desc = 'SQL Temelleri\'nden sonra: bir havayolu şirketinin verisiyle 10 derslik uygulama ve bitirme projesi.';
PA.hava.long = 'SQL Temelleri\'ni bitirdikten sonra aç; JOIN, alt sorgu ve CTE bildiğini varsayar. ' + (PA.hava.long || '');
PA.backend.comp && PA.backend.comp.push({ t: 'Eşzamanlılık', d: 'Çift rezervasyon, satır kilidi, iş kuyruğu, yeniden deneme', l: ['transaction', 'acid', 'be-kilit'] });
PA.muhendis.comp && PA.muhendis.comp.push({ t: 'Değişen veri', d: 'CDC, watermark, sıra ve tekrar', l: ['de-incremental', 'de-cdc'] });
PA.analist.comp && PA.analist.comp.push({ t: 'A/B testi ve istatistik', d: 'Tanımsal istatistik, dağılım, deney analizi', l: ['ds-tanimsal', 'ds-dagilim', 'ds-ab'] });

/* ---------- Önkoşul: SQL Temelleri sırasında öğretilmemiş yapı isteyen alıştırmalar "ileri görev" olur, ders bitişini engellemez ---------- */
{ const order = PA.temel.lessons, idx = {}; order.forEach((id, i) => idx[id] = i);
  const strip = s => String(s || '').replace(/--.*$/gm, ' ').replace(/'[^']*'/g, "''");
  const C = [['JOIN', /\bJOIN\b/i, 'inner-join', 'INNER JOIN'], ['LEFT JOIN', /\bLEFT\s+(OUTER\s+)?JOIN\b/i, 'left-join', 'LEFT JOIN'], ['GROUP BY', /\bGROUP\s+BY\b/i, 'group-by', 'GROUP BY'], ['HAVING', /\bHAVING\b/i, 'having', 'HAVING'], ['CASE', /\bCASE\s+WHEN\b/i, 'case', 'CASE WHEN'], ['pencere fonksiyonu', /\bOVER\s*\(/i, 'window-intro', 'Pencere fonksiyonları'], ['CTE', /^\s*WITH\s/i, 'cte', 'CTE'], ['alt sorgu', /\(\s*SELECT\b/i, 'subquery', 'Alt sorgular'], ['EXISTS', /\bEXISTS\s*\(/i, 'correlated', 'İlişkili alt sorgular'], ['UNION', /\bUNION\b/i, 'set-ops', 'UNION']];
  order.forEach((id, i) => { const l = LM(id); (l.ex || []).forEach(e => { if (e.t === 'mc' || !e.sol) return; const s = strip(e.sol); const hit = C.filter(c => c[2] !== id && idx[c[2]] > i && c[1].test(s)).sort((a, b) => idx[b[2]] - idx[a[2]])[0]; if (hit) e.adv = hit[0] + ' henüz anlatılmadı (' + hit[3] + ' dersinde gelecek).'; }); });
  window.SQLP_ADV_SAYI = order.reduce((a, id) => a + (LM(id).ex || []).filter(e => e.adv).length, 0);
}

/* Rol yollarında çözümü henüz anlatılmamış yapı isteyen dersi, önkoşulunun arkasına al (giriş dersleri yerinde kalır) */
PA.bilimci.lessons.splice(PA.bilimci.lessons.indexOf('correlated') + 1, 0, 'set-ops');
{ const strip = s => String(s || '').replace(/--.*$/gm, ' ').replace(/'[^']*'/g, "''");
  const REQ = [[/\bJOIN\b/i, ['inner-join']], [/\bLEFT\s+(OUTER\s+)?JOIN\b/i, ['left-join']], [/\bGROUP\s+BY\b/i, ['group-by']], [/\bHAVING\b/i, ['having']], [/\bCASE\s+WHEN\b/i, ['case']], [/\bOVER\s*\(/i, ['window-intro']], [/^\s*WITH\s+\w+\s+AS\s*\(/im, ['cte']], [/\b(ROWS|RANGE)\s+(BETWEEN|UNBOUNDED|\d)/i, ['frames', 'pencere-cerceve']], [/\b(LAG|LEAD)\s*\(/i, ['lag-lead']], [/\b(ROW_NUMBER|DENSE_RANK|RANK)\s*\(/i, ['ranking', 'window-intro']], [/\(\s*SELECT\b/i, ['subquery']], [/\bEXISTS\s*\(/i, ['correlated', 'exists-anyall', 'subquery']]];
  const need = {}; LS.forEach(l => { const t = (l.ex || []).filter(e => !e.adv).map(e => strip(e.sol)).join('\n'); need[l.id] = REQ.filter(r => r[0].test(t)).map(r => r[1]); });
  for (const pid of ['analist', 'bilimci', 'muhendis', 'bi', 'dba', 'backend', 'tsql']) { const L = PA[pid].lessons; for (let pass = 0; pass < 4; pass++) { let moved = false; for (const id of L.slice()) { if (id === 'ts-giris' || !need[id]) continue; let at = L.indexOf(id), to = -1; for (const alt of need[id]) { if (alt.includes(id)) { to = -1; break; } const ix = alt.map(x => L.indexOf(x)).filter(x => x >= 0); if (ix.length) to = Math.max(to, Math.min(...ix)); } if (to > at) { L.splice(at, 1); L.splice(L.indexOf(LS.find(x => x.id === L[to - 1]).id) + 1, 0, id); moved = true; } } if (!moved) break; } }
}
/* Yetkinlik haritası tekrar: sıralama değişse de üyelik değişmez */

/* ---------- Seviye testi: JOIN sorusu ve konu haritası ---------- */
{ const PL = window.SQLP_PLACEMENT; const META = [['SELECT temelleri', ['select']], ['NULL karşılaştırma', ['null']], ['HAVING', ['having']], ['COUNT ve NULL', ['aggregate']], ['GROUP BY', ['group-by']], ['LEFT JOIN ile eşi olmayanlar', ['left-join']], ['NOT IN ve NULL', ['subquery']], ['Grup başına ilk satır (ROW_NUMBER)', ['ranking']], ['Kümülatif toplam', ['frames']], ['CTE', ['cte']], ['Normalizasyon', ['normalizasyon']], ['Bileşik indeks', ['index']], ['MVCC', ['acid']], ['Ardışık seriler (gaps and islands)', ['ardisik-seri']], ['Transaction', ['transaction']]];
  if (PL.length !== META.length) throw new Error('c35: seviye testi sayısı');
  PL.forEach((q, i) => { q.topic = META[i][0]; q.ls = META[i][1]; });
  PL.push({ lv: 'A2', topic: 'INNER JOIN', ls: ['inner-join'], q: '<p>Her siparişin yanında müşterisinin adını göstermek için <code>orders</code> ile <code>customers</code> nasıl birleştirilir?</p>', o: ['<code>FROM orders o JOIN customers c ON c.customer_id = o.customer_id</code>', '<code>FROM orders UNION customers</code>', '<code>FROM orders GROUP BY customers</code>', '<code>FROM orders WHERE customers</code>'], a: 0 }); }

/* ---------- Yöntem kuralları: görev yöntemi istiyorsa sonuç tek başına yetmez ---------- */
{ const TX = { re: '\\b(BEGIN|START\\s+TRANSACTION)\\b', msg: 'Görev işlem (transaction) içinde istiyor. BEGIN ile başla, COMMIT ile bitir.', d: ['pg', 'mysql', 'sqlite', 'tsql', 'bq'] };
  const R = (id, i, re, msg, d) => { const e = EX(id, i); (e.must = e.must || []).push(d ? { re, msg, d } : { re, msg }); };
  const NO = (id, i, re, msg) => { const e = EX(id, i); (e.mustNot = e.mustNot || []).push({ re, msg }); };
  for (const [id, i] of [['transaction', 0], ['transaction', 1], ['transaction', 3], ['transaction', 4], ['hv-veri', 1], ['z071-dml-tcl', 4]]) { EX(id, i).must = (EX(id, i).must || []).concat([TX]); }
  R('transaction', 1, '\\bROLLBACK\\b', 'Görev değişikliği geri almanı istiyor: ROLLBACK kullan.');
  R('transaction', 4, '\\bROLLBACK\\b', 'Görev değişikliği geri almanı istiyor: ROLLBACK kullan.');
  R('transaction', 3, '\\b(SAVEPOINT|SAVE\\s+TRAN)', 'Görev bir kayıt noktası istiyor: SAVEPOINT s1 yaz.');
  R('z071-dml-tcl', 5, '\\bSAVEPOINT\\b', 'Görev SAVEPOINT kullanmanı istiyor.');
  R('in-between-like', 0, '\\bIN\\s*\\(', 'Görev IN ile yazmanı istiyor; OR zinciri aynı sonucu verir ama burada IN öğreniyoruz.');
  R('be-sayfalama', 0, '\\b(OFFSET|TOP)\\b', 'Görev OFFSET yöntemini istiyor.');
  NO('be-sayfalama', 2, '\\bOFFSET\\b', 'Görev anahtar tabanlı (keyset) sayfalama istiyor; OFFSET kullanma.');
  R('correlated', 1, '\\bNOT\\s+EXISTS\\b', 'Görev NOT EXISTS kullanmanı istiyor.');
  R('hv-alt', 1, '\\bNOT\\s+EXISTS\\b', 'Görev NOT EXISTS kullanmanı istiyor.');
  R('subquery', 4, '\\bIN\\s*\\(', 'Görev IN ile alt sorgu istiyor.');
  R('exists-anyall', 1, '\\bEXISTS\\b', 'Görev EXISTS kullanmanı istiyor.');
  R('performans', 2, '\\bEXISTS\\b', 'Görev EXISTS kullanmanı istiyor.'); NO('performans', 2, '\\bJOIN\\b|\\bDISTINCT\\b', 'Görev JOIN ve DISTINCT kullanmadan yazmanı istiyor.');
  R('left-join', 7, '\\bLEFT\\s+(OUTER\\s+)?JOIN\\b', 'Görev LEFT JOIN ile yazmanı istiyor.');
  R('self-cross-join', 5, '\\bCROSS\\s+JOIN\\b', 'Görev CROSS JOIN ile iskelet kurmanı istiyor.');
  R('set-ops', 7, '\\bUNION\\s+ALL\\b', 'Görev UNION ALL istiyor.');
  for (const [id, i] of [['stil', 3], ['stil', 5], ['cte', 0], ['cte', 1], ['cte', 2], ['cte', 4], ['cte', 5], ['cte', 6]]) R(id, i, '\\bWITH\\b', 'Görev CTE (WITH) ile yazmanı istiyor.');
  R('recursive-cte', 0, '\\bWITH\\b', 'Görev özyinelemeli CTE istiyor.'); R('recursive-cte', 3, '\\bWITH\\b', 'Görev özyinelemeli CTE istiyor.');
  R('ik-ucret', 5, '\\bLAG\\b', 'Görev LAG kullanmanı istiyor.'); R('mk-ardisik', 3, '\\bLAG\\b', 'Görev LAG yöntemini istiyor.'); R('bs-aml', 2, '\\bLAG\\b', 'Görev LAG ile yeniden yazmanı istiyor.');
  R('mk-medyan', 4, '\\bROW_NUMBER\\b', 'Görev ROW_NUMBER ile yazmanı istiyor.'); R('proje-muhendis', 1, '\\bROW_NUMBER\\b', 'Görev ROW_NUMBER ile yazmanı istiyor.');
  R('ts-top', 2, '\\bOFFSET\\b', 'Görev OFFSET ... FETCH istiyor.'); R('ts-top', 4, '\\bTOP\\b', 'Görev TOP ve WHERE istiyor.'); NO('ts-top', 4, '\\bOFFSET\\b', 'Görev OFFSET kullanmadan yazmanı istiyor.');
  R('cert-tsql', 4, '\\bOFFSET\\b', 'Görev OFFSET ... FETCH istiyor.'); R('lab-z071', 6, '\\bOFFSET\\b', 'Görev OFFSET ve FETCH istiyor.');
  for (const i of [0, 1, 2]) R('ts-merge', i, '\\bMERGE\\b', 'Görev MERGE istiyor.'); R('oracle-1z0', 7, '\\bMERGE\\b', 'Görev MERGE istiyor.');
  R('pg-ozel', 0, '\\bFILTER\\b', 'Görev FILTER kullanmanı istiyor.'); R('pg-ozel', 1, '\\bILIKE\\b', 'Görev ILIKE kullanmanı istiyor.');
  R('rollup', 0, '\\bROLLUP\\b', 'Görev ROLLUP istiyor.'); R('rollup', 4, '\\bROLLUP\\b', 'Görev ROLLUP istiyor.');
}

/* ---------- Sözlük: yinelenen terimler birleşir (uzun olan tanım kalır) ---------- */
{ const G = window.SQLP_GLOSSARY; const seen = {}; for (let i = G.length - 1; i >= 0; i--) { /* sondan başla, ilk geçiş sırası korunsun */ } const out = []; G.forEach(g => { const k = g[0].toLocaleLowerCase('tr').replace(/\s*\(.*\)$/, ''); if (seen[k]) { if (String(g[1]).length > String(seen[k][1]).length) seen[k][1] = g[1]; return; } seen[k] = g; out.push(g); }); G.length = 0; out.forEach(g => G.push(g)); }

/* ---------- Terim dili: İngilizce karşılık başlıkta ve aramada ---------- */
const TITLE = { 'window-intro': 'Pencere fonksiyonlarına giriş (window functions): OVER ve PARTITION BY', frames: 'Kümülatif toplam ve hareketli ortalama (running total, moving average)', 'recursive-cte': 'Özyinelemeli CTE (recursive CTE, WITH RECURSIVE)', correlated: 'İlişkili alt sorgular (correlated subquery) ve EXISTS', index: 'İndeksler (index) ve sorgu planı', kisitlar: 'Kısıtlar (constraints) ayrıntılı: NOT NULL, UNIQUE, CHECK, DEFAULT, FOREIGN KEY eylemleri', trigger: 'Trigger', 'ardisik-seri': LM('ardisik-seri').title + ' (gaps and islands)' };
for (const [id, t] of Object.entries(TITLE)) LM(id).title = t;
const EN = { 'window-intro': 'window function over partition', ranking: 'window function row_number rank', 'lag-lead': 'window function offset', frames: 'window frame running total', 'pencere-cerceve': 'window frame', cte: 'common table expression with', subquery: 'nested query', correlated: 'correlated subquery', aggregate: 'aggregate function', 'alias-distinct': 'alias takma ad', null: 'null three valued logic', index: 'index query plan execution plan', sargable: 'sargable index seek', transaction: 'transaction isolation', 'ts-izolasyon': 'deadlock isolation', acid: 'acid mvcc', normalizasyon: 'normalization normal form', 'ts-proc': 'stored procedure', 'dba-yedek': 'backup restore tail log', 'be-sayfalama': 'pagination keyset', 'dwh': 'data warehouse star schema fact dimension', 'de-scd': 'slowly changing dimension', 'an-kohort': 'cohort retention', 'an-funnel': 'funnel conversion', 'ds-ab': 'ab test experiment', dml: 'insert update delete', 'ddl-create': 'create table ddl', 'iliskiler': 'relationship primary key foreign key', 'er-modelleme': "er diagram crow's foot", 'self-cross-join': 'self join cross join', 'bi-hazirlik': 'grain star schema', 'view': 'view materialized view' };
for (const [id, t] of Object.entries(EN)) { const l = LM(id); if (l) l.en = ((l.en || '') + ' ' + t).trim(); }
window.SQLP_SEARCH_SYN = { window: ['pencere'], 'window function': ['pencere'], 'window functions': ['pencere'], subquery: ['alt sorgu'], 'stored procedure': ['saklı yordam'], constraint: ['kısıt'], index: ['indeks'], grain: ['tanecik', 'grain'], normalization: ['normalizasyon'], backup: ['yedek'], restore: ['geri yükleme', 'yedek'], cohort: ['kohort'], deadlock: ['deadlock', 'kilitlenme'], aggregate: ['toplama'], alias: ['takma ad'], duplicate: ['tekrar'], join: ['join', 'birleştir'], date: ['tarih'], string: ['metin'], transaction: ['transaction', 'işlem'], partition: ['partition', 'bölüm'], funnel: ['huni', 'funnel'], pagination: ['sayfalama'], 'data warehouse': ['veri ambarı'], pencere: ['window'], indeks: ['index'] };

})();
