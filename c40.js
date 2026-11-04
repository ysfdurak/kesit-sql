/* Kesit SQL: kapsam boşlukları 1. ETL işletimi, veri ambarı modelleme, yordam derinliği, T-SQL DML ve hata kalıpları, nesne özellikleri.
   Bütün T-SQL görevleri tarayıcıdaki taklit motorda çalışır; gerçek SQL Server davranışı Microsoft Learn'den alındı, burada çalıştırılmadı.
   Veri: sis.js (etl_ tabloları kurgudur) ve mevcut veri setleri. ynl: reddedilmesi gereken yanlış cevaplar; dn: şık dengesi denetimi. */
(function () {
'use strict';
const LS = window.SQLP_LESSONS;
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const ts = s => '<pre class="code" data-base="tsql">' + esc(s) + '</pre>';
const hata = s => '<pre class="code" data-base="tsql" data-err>' + esc(s) + '</pre>';
const nor = s => '<pre class="code" data-norun>' + esc(s) + '</pre>';
let mcSay = 0;
/* Doğru şıkkın konumu dengeli olsun: seçenekler sayaca göre döndürülür */
const mc = (q, o, a, why) => { const k = (mcSay++ * 3) % o.length; const o2 = o.slice(k).concat(o.slice(0, k)); return { t: 'mc', q: '<p>' + q + '</p>', o: o2, a: (a - k + o.length) % o.length, why, dn: 1 }; };
const TSQL = { base: 'tsql', dl: ['tsql'] };
const sq = (q, sol, hint, x) => Object.assign({ t: 'sql', q: '<p>' + q + '</p>', sol, hint }, TSQL, x || {});
const sqg = (q, sol, hint, x) => Object.assign({ t: 'sql', q: '<p>' + q + '</p>', sol, hint }, x || {}); /* genel: her SQL türü */
const ders = (id, mod, lv, min, title, sum, en, body, ex) => LS.push({ id, lv, mod, min, title, sum, en, body, ex });
const KURGU_ETL = '<div class="note"><b>Veri kurgudur</b><code>etl_</code> tabloları hayali bir gece yüklemesi için elle kuruldu. Gerçek bir sistemden alınmadı; bozuk satırlar bilerek kondu.</div>';

/* ------------------------------------------------------------------ ETL 1: hatalı satır ve günlük */
const RED_SQL = `INSERT INTO etl_red (stg_id, neden, batch_id)
SELECT stg_id,
       CASE WHEN hesap_no IS NULL THEN 'hesap bos'
            WHEN TRY_CONVERT(DATE, islem_tarihi) IS NULL THEN 'tarih bozuk'
            ELSE 'tutar bozuk' END,
       43
FROM etl_stg_hareket
WHERE hesap_no IS NULL
   OR TRY_CONVERT(DATE, islem_tarihi) IS NULL
   OR TRY_CONVERT(DECIMAL(12, 2), tutar) IS NULL;`;
ders('etl-hata', 'Veri Mühendisliği', 'B2', 30, 'ETL işletimi: hatalı satır tablosu, mükerrer kayıt ve yükleme günlüğü',
  'Bir bozuk satır bütün yüklemeyi durdurmasın; ne okunduğu, ne yüklendiği ve ne reddedildiği hesapça tutsun.',
  'etl reject hatalı satır batch log yükleme günlüğü try_convert mutabakat staging',
`<h2>Gece yüklemesi neden yarıda kalır?</h2>
<p>Kaynak dosyada bir satırın tutarı <code>abc</code> ise <code>CAST</code> hata verir ve bütün yükleme durur. Sabah rapor boştur, üstelik hangi satır yüzünden olduğunu kimse bilmez. İşletilen bir boru hattı üç şeyi ayırır: temiz satırlar yüklenir, bozuklar nedeniyle ayrı tabloya yazılır, her çalışma günlüğe bir satır bırakır.</p>
${KURGU_ETL}
<div class="tip"><b>Önkoşul</b>Katmanlar ve idempotent yükleme için <b>ETL ve ELT</b> dersine bak; burada tekrar anlatılmıyor.</div>
<h2>Bozuk satırı ayıklamak: TRY_CONVERT</h2>
<p><code>TRY_CONVERT</code> dönüşemeyen değerde hata vermez, NULL döner. Bu yüzden bozuk satır bulmanın temel aracıdır.</p>
${ts(`SELECT stg_id, kaynak_no, tutar, TRY_CONVERT(DECIMAL(12, 2), tutar) AS sayi, islem_tarihi, TRY_CONVERT(DATE, islem_tarihi) AS tarih
FROM etl_stg_hareket
ORDER BY stg_id;`)}
<h2>Nedeniyle reddetmek</h2>
<p>Red tablosu yalnız "bozuk" demez, neden yazar. Sabah ilk bakılan şey hangi nedenin arttığıdır.</p>
${ts(RED_SQL + `
SELECT neden, COUNT(*) AS satir FROM etl_red GROUP BY neden ORDER BY neden;`)}
<h2>Mükerrer kayıt</h2>
<p>Kaynak aynı kaydı iki kez gönderebilir. Hangi satırın kalacağı kurala bağlanır: burada <code>kaynak_no</code> başına en küçük <code>stg_id</code>.</p>
${ts(`SELECT stg_id, kaynak_no, ROW_NUMBER() OVER (PARTITION BY kaynak_no ORDER BY stg_id) AS sira
FROM etl_stg_hareket
WHERE kaynak_no = 'K1007';`)}
<h2>Yükleme günlüğü ve batch_id</h2>
<p>Her çalışma <code>batch_id</code> alır. Fact ve red satırı bu numarayı taşır, böylece hatalı bir yüklemeyi yalnız o numarayla geri almak mümkün olur.</p>
<table><tr><th>Alan</th><th>Neden tutulur</th></tr>
<tr><td><code>okunan</code>, <code>yuklenen</code>, <code>reddedilen</code></td><td>Mutabakat: okunan = yüklenen + reddedilen olmalı. Tutmuyorsa satır kaybolmuştur.</td></tr>
<tr><td><code>baslangic</code>, <code>bitis</code></td><td>Süre artışı sorunun erken işaretidir.</td></tr>
<tr><td><code>durum</code></td><td>Hata alan çalışma da satır bırakır; günlükte yoksa hiç başlamamış demektir.</td></tr></table>
<div class="note"><b>Zamanlama</b>Bu işi gece kim çalıştırır? SQL Server'da genellikle SQL Agent işi. Tarayıcıda zamanlayıcı yok; bak: <b>SQL Agent ve iş geçmişi</b> dersi.</div>
<h2>Sıra önemli</h2>
<p>Red kaydı yüklemeden önce yazılır, fact yüklemesi de reddedilenleri dışlar. Tersi yapılırsa bozuk satır <code>CAST</code> hatasıyla her şeyi durdurur. Aynı batch yeniden çalışırsa önce o batch'in satırları silinir: yeniden çalıştırmak çift satır üretmemeli.</p>`,
[
  sq('Bozuk satırları bul: <code>etl_stg_hareket</code> içinde tutarı sayıya dönüşmeyen satırlar: <code>stg_id</code>, <code>tutar</code>. <code>stg_id</code> sırasıyla.', "SELECT stg_id, tutar FROM etl_stg_hareket WHERE TRY_CONVERT(DECIMAL(12, 2), tutar) IS NULL ORDER BY stg_id;", 'TRY_CONVERT dönüşemeyince NULL döner.', { ord: true, must: [{ re: 'TRY_CONVERT|TRY_CAST', msg: 'Görev TRY_CONVERT ile dönüşümü sınamanı istiyor.' }], ynl: ["SELECT stg_id, tutar FROM etl_stg_hareket WHERE tutar = 'abc' ORDER BY stg_id;", "SELECT stg_id, tutar FROM etl_stg_hareket WHERE CAST(tutar AS DECIMAL(12, 2)) IS NULL ORDER BY stg_id;"] }),
  sq('Red tablosunu doldur (<code>batch_id</code> 43). Neden önceliği: hesap boşsa <code>hesap bos</code>, değilse tarih dönüşmüyorsa <code>tarih bozuk</code>, değilse tutar dönüşmüyorsa <code>tutar bozuk</code>.', RED_SQL, 'Üç koşul WHERE içinde OR ile, neden CASE ile. CASE ilk doğru kolu alır.', { check: 'SELECT stg_id, neden, batch_id FROM etl_red ORDER BY stg_id', ynl: ["INSERT INTO etl_red (stg_id, neden, batch_id) SELECT stg_id, 'tutar bozuk', 43 FROM etl_stg_hareket WHERE TRY_CONVERT(DECIMAL(12, 2), tutar) IS NULL;", "INSERT INTO etl_red (stg_id, neden, batch_id) SELECT stg_id, CASE WHEN hesap_no IS NULL THEN 'hesap bos' WHEN TRY_CONVERT(DATE, islem_tarihi) IS NULL THEN 'tarih bozuk' ELSE 'tutar bozuk' END, 43 FROM etl_stg_hareket WHERE hesap_no IS NULL OR TRY_CONVERT(DATE, islem_tarihi) IS NULL;"] }),
  sq('Mükerrerleri bul: <code>kaynak_no</code> başına en küçük <code>stg_id</code> kalacak; atılacak satırlar: <code>stg_id</code>, <code>kaynak_no</code>.', "WITH s AS (SELECT stg_id, kaynak_no, ROW_NUMBER() OVER (PARTITION BY kaynak_no ORDER BY stg_id) AS sira FROM etl_stg_hareket) SELECT stg_id, kaynak_no FROM s WHERE sira > 1;", 'ROW_NUMBER, kaynak_no başına.', { must: [{ re: 'ROW_NUMBER', msg: 'Görev ROW_NUMBER kullanmanı istiyor.' }], ynl: ["WITH s AS (SELECT stg_id, kaynak_no, ROW_NUMBER() OVER (PARTITION BY kaynak_no ORDER BY stg_id) AS sira FROM etl_stg_hareket) SELECT stg_id, kaynak_no FROM s WHERE sira = 1;"] }),
  sq('Temiz satırları yükle: dönüşmeyenleri ve mükerrerleri dışla, <code>etl_fact_hareket</code> tablosuna <code>batch_id</code> 43 ile yaz. <code>sube_key</code> şimdilik -1 (vekil anahtar sonraki derste). Tarih ve tutar dönüştürülmüş olsun.', "WITH s AS (SELECT *, ROW_NUMBER() OVER (PARTITION BY kaynak_no ORDER BY stg_id) AS sira FROM etl_stg_hareket WHERE hesap_no IS NOT NULL AND TRY_CONVERT(DATE, islem_tarihi) IS NOT NULL AND TRY_CONVERT(DECIMAL(12, 2), tutar) IS NOT NULL)\nINSERT INTO etl_fact_hareket (kaynak_no, sube_key, hesap_no, islem_tarihi, tutar, batch_id)\nSELECT kaynak_no, -1, hesap_no, TRY_CONVERT(DATE, islem_tarihi), TRY_CONVERT(DECIMAL(12, 2), tutar), 43 FROM s WHERE sira = 1;", 'Önce süz, sonra numaralandır: sıra süzülmüş satırlardan verilsin.', { check: 'SELECT kaynak_no, hesap_no, islem_tarihi, tutar, batch_id FROM etl_fact_hareket ORDER BY kaynak_no', ynl: ["INSERT INTO etl_fact_hareket (kaynak_no, sube_key, hesap_no, islem_tarihi, tutar, batch_id) SELECT kaynak_no, -1, hesap_no, TRY_CONVERT(DATE, islem_tarihi), TRY_CONVERT(DECIMAL(12, 2), tutar), 43 FROM etl_stg_hareket WHERE hesap_no IS NOT NULL AND TRY_CONVERT(DATE, islem_tarihi) IS NOT NULL AND TRY_CONVERT(DECIMAL(12, 2), tutar) IS NOT NULL;"] }),
  sq('Günlük satırı: <code>etl_yukleme_log</code> tablosuna batch 43 için satır yaz. <code>is_adi</code> <code>hareket</code>, başlangıç <code>2024-11-12 03:00:00</code>, bitiş <code>2024-11-12 03:04:00</code>, <code>okunan</code> ham satır sayısı, <code>reddedilen</code> dönüşmeyen ya da hesabı boş satır sayısı, <code>yuklenen</code> okunandan kalan farklı <code>kaynak_no</code> sayısı, durum <code>tamam</code>. Sayıları elle yazma, sorguyla hesapla.', "WITH t AS (SELECT * FROM etl_stg_hareket WHERE hesap_no IS NOT NULL AND TRY_CONVERT(DATE, islem_tarihi) IS NOT NULL AND TRY_CONVERT(DECIMAL(12, 2), tutar) IS NOT NULL)\nINSERT INTO etl_yukleme_log (batch_id, is_adi, baslangic, bitis, okunan, yuklenen, reddedilen, durum)\nSELECT 43, 'hareket', '2024-11-12 03:00:00', '2024-11-12 03:04:00', (SELECT COUNT(*) FROM etl_stg_hareket), (SELECT COUNT(DISTINCT kaynak_no) FROM t), (SELECT COUNT(*) FROM etl_stg_hareket) - (SELECT COUNT(*) FROM t), 'tamam';", 'Temiz satırları CTE yap, alt sorgularla say.', { check: 'SELECT batch_id, okunan, yuklenen, reddedilen, durum FROM etl_yukleme_log WHERE batch_id = 43', must: [{ re: 'COUNT', msg: 'Sayıları sorguyla hesapla.' }], ynl: ["INSERT INTO etl_yukleme_log (batch_id, is_adi, baslangic, bitis, okunan, yuklenen, reddedilen, durum) SELECT 43, 'hareket', '2024-11-12 03:00:00', '2024-11-12 03:04:00', COUNT(*), COUNT(*), 0, 'tamam' FROM etl_stg_hareket;"] }),
  sq('Mutabakat: günlükte <code>okunan</code> ile <code>yuklenen + reddedilen</code> tutmayan çalışmaları bul: <code>batch_id</code>, <code>okunan</code>, <code>fark</code> (okunan - yüklenen - reddedilen).', "SELECT batch_id, okunan, okunan - yuklenen - reddedilen AS fark FROM etl_yukleme_log WHERE okunan <> yuklenen + reddedilen;", 'Üç sütunu karşılaştır.', { ynl: ["SELECT batch_id, okunan, okunan - yuklenen - reddedilen AS fark FROM etl_yukleme_log WHERE durum = 'tamam';"] }),
  sq('Yordama bağla: <code>dbo.usp_YuklemeBaslat</code> yordamını yaz: <code>@batch INT</code> alsın. <code>TRY</code> içinde bir işlem açıp <code>etl_fact_hareket</code> tablosuna, tutarı <code>CAST</code> ile dönüştürerek <b>bütün</b> ham satırları yazmayı denesin (bozuk satır hata verecek). <code>CATCH</code> içinde açık işlemi geri alsın ve günlüğe <code>@batch</code>, <code>is_adi</code> <code>hareket</code>, <code>durum</code> <code>hata</code> yazsın. Sonra <code>EXEC dbo.usp_YuklemeBaslat @batch = 44;</code>', "CREATE PROCEDURE dbo.usp_YuklemeBaslat @batch INT AS\nBEGIN\n  SET NOCOUNT ON;\n  BEGIN TRY\n    BEGIN TRANSACTION;\n    INSERT INTO etl_fact_hareket (kaynak_no, sube_key, hesap_no, islem_tarihi, tutar, batch_id)\n    SELECT kaynak_no, -1, hesap_no, islem_tarihi, CAST(tutar AS DECIMAL(12, 2)), @batch FROM etl_stg_hareket;\n    COMMIT TRANSACTION;\n  END TRY\n  BEGIN CATCH\n    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;\n    INSERT INTO etl_yukleme_log (batch_id, is_adi, durum) VALUES (@batch, 'hareket', 'hata');\n  END CATCH;\nEND;\nGO\nEXEC dbo.usp_YuklemeBaslat @batch = 44;", 'Geri alma günlük yazımından önce olmalı; yoksa günlük satırı da geri alınır.', { check: "SELECT (SELECT COUNT(*) FROM etl_fact_hareket) AS fact, batch_id, durum FROM etl_yukleme_log WHERE batch_id = 44", ynl: ["CREATE PROCEDURE dbo.usp_YuklemeBaslat @batch INT AS\nBEGIN\n  INSERT INTO etl_fact_hareket (kaynak_no, sube_key, hesap_no, islem_tarihi, tutar, batch_id)\n  SELECT kaynak_no, -1, hesap_no, islem_tarihi, TRY_CONVERT(DECIMAL(12, 2), tutar), @batch FROM etl_stg_hareket;\n  INSERT INTO etl_yukleme_log (batch_id, is_adi, durum) VALUES (@batch, 'hareket', 'tamam');\nEND;\nGO\nEXEC dbo.usp_YuklemeBaslat @batch = 44;"] }),
  mc('Yükleme <code>CATCH</code> bloğunda önce günlüğe yazıyor, sonra <code>ROLLBACK</code> yapıyor. Ne olur?', ['Günlük satırı da geri alınır, hata iz bırakmaz', 'Günlük satırı kalır, yalnız fact satırları gider', 'İşlem hatadan sonra zaten kapanmıştır, fark etmez', 'SQL Server sırayı kendisi düzeltip önce geri alır'], 0, 'Günlük yazımı aynı açık işlemin içindedir; ROLLBACK onu da götürür. Önce geri al, sonra yaz.'),
  mc('Aynı batch yanlışlıkla iki kez çalıştı. Hangi tasarım zararsız kılar?', ['Önce bu batch_id satırlarını silmek', 'Fact tablosuna DISTINCT içeren bir view koymak', 'İşi çalıştıran zamanlayıcıyı kapalı tutmak', 'Fact tablosundan birincil anahtarı kaldırmak'], 0, 'Yeniden çalıştırma aynı sonucu vermeli: idempotent yükleme. batch_id bu silmeyi tek koşula indirir.'),
  mc('<code>TRY_CONVERT(DECIMAL(12,2), tutar)</code> NULL döndü. Bundan kesin olarak ne çıkar?', ['Değer ya dönüşmedi ya da zaten NULL idi', 'Değer kesinlikle metin içeriyor demektir', 'Kaynak dosyanın tamamı bozuk demektir', 'Sütunun veri türü yanlış tanımlanmıştır'], 0, 'NULL girdi de NULL verir. Boş değerle bozuk değeri ayırmak istiyorsan ikisini ayrı koşulla sına.')
]);

/* ------------------------------------------------------------------ ETL 2: vekil anahtar, geç gelen boyut, SCD 2 */
const SCD_KAPA = `UPDATE d SET d.gecerli_bit = '2024-11-11', d.guncel = 0
FROM etl_dim_sube d
JOIN etl_stg_sube s ON s.sube_kodu = d.sube_kodu
WHERE d.guncel = 1 AND (s.sube_adi <> d.sube_adi OR s.sehir <> d.sehir);`;
const SCD_AC = `INSERT INTO etl_dim_sube (sube_kodu, sube_adi, sehir, gecerli_bas, gecerli_bit, guncel)
SELECT s.sube_kodu, s.sube_adi, s.sehir, '2024-11-12', '9999-12-31', 1
FROM etl_stg_sube s
LEFT JOIN etl_dim_sube d ON d.sube_kodu = s.sube_kodu AND d.guncel = 1
WHERE d.sube_key IS NULL;`;
ders('etl-boyut', 'Veri Mühendisliği', 'B2', 30, 'Boyut yüklemesi: vekil anahtar eşleme, geç gelen boyut, SCD 2 kapat-aç',
  'Fact satırını doğru boyut sürümüne bağlamak, boyutta olmayan şubeyi kaybetmemek, değişen boyutu kapatıp yeniden açmak.',
  'surrogate key vekil anahtar late arriving dimension geç gelen boyut bilinmeyen üye scd2 kapat aç inferred member',
`<h2>Fact iş anahtarıyla değil, vekil anahtarla bağlanır</h2>
<p>Kaynak <code>S01</code> diyor. Fact ise <code>sube_key</code> tutar, çünkü aynı şubenin birden çok sürümü olabilir. Bu derste S01 Haziran sonuna kadar Ankara'da, Temmuzdan beri Bursa'da. Mart hareketi Ankara sürümüne, Kasım hareketi Bursa sürümüne bağlanmalı.</p>
${KURGU_ETL}
<div class="tip"><b>Önkoşul</b>SCD türleri için <b>Yavaş değişen boyutlar</b> dersine bak. Orada geçmiş LEAD ile okunuyor; burada yükleme yazıyoruz.</div>
${ts(`SELECT h.kaynak_no, h.sube_kodu, h.islem_tarihi, d.sube_key, d.sehir
FROM etl_stg_hareket h
JOIN etl_dim_sube d ON d.sube_kodu = h.sube_kodu
 AND TRY_CONVERT(DATE, h.islem_tarihi) BETWEEN d.gecerli_bas AND d.gecerli_bit
WHERE h.sube_kodu = 'S01'
ORDER BY h.stg_id;`)}
<div class="warn"><b>Sık hata</b><code>guncel = 1</code> ile eşlemek bütün geçmiş hareketleri bugünkü sürüme yazar. Rapor "Mart'ta Bursa'da hareket" gösterir ve kimse fark etmez, çünkü toplam tutar değişmez.</div>
<h2>Boyutta olmayan şube: geç gelen boyut</h2>
<p>Hareket gelmiş ama şube S99 henüz boyutta yok. <code>JOIN</code> bu satırı sessizce atar, toplam eksik çıkar. İki yaygın çözüm:</p>
<table><tr><th>Yol</th><th>Nasıl</th><th>Bedel</th></tr>
<tr><td>Bilinmeyen üye</td><td><code>LEFT JOIN</code>, eşleşmezse <code>-1</code></td><td>Sonra şube gelince fact güncellemesi gerekir</td></tr>
<tr><td>Tahmini üye (inferred)</td><td>Boyuta iskelet satır ekle, gerçek veri gelince tamamla</td><td>Boyutta eksik alanlı satır olur</td></tr></table>
<h2>SCD 2: önce kapat, sonra aç</h2>
<p>Sıra önemli. Önce değişen güncel satır kapatılır, sonra güncel sürümü kalmayan her şube için yeni satır açılır. Böylece hem değişen hem tamamen yeni şube aynı INSERT ile açılır.</p>
${ts(SCD_KAPA + '\n' + SCD_AC + `
SELECT sube_key, sube_kodu, sehir, gecerli_bas, gecerli_bit, guncel FROM etl_dim_sube ORDER BY sube_kodu, gecerli_bas;`)}
<div class="note"><b>NULL tuzağı</b><code>s.sehir &lt;&gt; d.sehir</code>, alanlardan biri NULL ise doğru dönmez ve değişiklik kaçar. Gerçek yüklemede NULL olabilen sütunları ayrıca karşılaştır.</div>
<h2>Sıralama</h2>
<p>Boyutlar önce, fact sonra yüklenir. Tersi olursa yeni gelen şube fact yüklemesinde bilinmeyen sayılır.</p>`,
[
  sq('As-of eşleme: <code>S01</code> ve <code>S02</code> şubeli, tarihi ve tutarı temiz ham hareketleri, işlem tarihindeki boyut sürümüne bağla: <code>kaynak_no</code>, <code>sube_key</code>. <code>kaynak_no</code> sırasıyla, mükerrerler tek görünsün.', "SELECT DISTINCT h.kaynak_no, d.sube_key FROM etl_stg_hareket h JOIN etl_dim_sube d ON d.sube_kodu = h.sube_kodu AND TRY_CONVERT(DATE, h.islem_tarihi) BETWEEN d.gecerli_bas AND d.gecerli_bit WHERE h.sube_kodu IN ('S01', 'S02') AND TRY_CONVERT(DECIMAL(12, 2), h.tutar) IS NOT NULL ORDER BY h.kaynak_no;", 'JOIN koşuluna tarih aralığını da koy.', { ord: true, must: [{ re: 'gecerli_bas', msg: 'İşlem tarihini geçerlilik aralığıyla karşılaştır.' }], ynl: ["SELECT DISTINCT h.kaynak_no, d.sube_key FROM etl_stg_hareket h JOIN etl_dim_sube d ON d.sube_kodu = h.sube_kodu AND d.guncel = 1 WHERE h.sube_kodu IN ('S01', 'S02') AND TRY_CONVERT(DECIMAL(12, 2), h.tutar) IS NOT NULL ORDER BY h.kaynak_no;"] }),
  sq('Bilinmeyen üye: temiz ve tekil satırlar için şube anahtarını bul; boyutta karşılığı yoksa <code>-1</code>: <code>kaynak_no</code>, <code>sube_key</code>. Sırala.', "SELECT DISTINCT h.kaynak_no, COALESCE(d.sube_key, -1) AS sube_key FROM etl_stg_hareket h LEFT JOIN etl_dim_sube d ON d.sube_kodu = h.sube_kodu AND TRY_CONVERT(DATE, h.islem_tarihi) BETWEEN d.gecerli_bas AND d.gecerli_bit WHERE h.hesap_no IS NOT NULL AND TRY_CONVERT(DATE, h.islem_tarihi) IS NOT NULL AND TRY_CONVERT(DECIMAL(12, 2), h.tutar) IS NOT NULL ORDER BY h.kaynak_no;", 'LEFT JOIN ve COALESCE.', { ord: true, ynl: ["SELECT DISTINCT h.kaynak_no, d.sube_key FROM etl_stg_hareket h JOIN etl_dim_sube d ON d.sube_kodu = h.sube_kodu AND TRY_CONVERT(DATE, h.islem_tarihi) BETWEEN d.gecerli_bas AND d.gecerli_bit WHERE h.hesap_no IS NOT NULL AND TRY_CONVERT(DATE, h.islem_tarihi) IS NOT NULL AND TRY_CONVERT(DECIMAL(12, 2), h.tutar) IS NOT NULL ORDER BY h.kaynak_no;"] }),
  sq('Tam yükleme: temiz ve tekil satırları (kural: <code>kaynak_no</code> başına en küçük <code>stg_id</code>) doğru <code>sube_key</code> ile <code>etl_fact_hareket</code> tablosuna yaz, <code>batch_id</code> 43. Boyutta yoksa -1.', "WITH s AS (SELECT *, ROW_NUMBER() OVER (PARTITION BY kaynak_no ORDER BY stg_id) AS sira FROM etl_stg_hareket WHERE hesap_no IS NOT NULL AND TRY_CONVERT(DATE, islem_tarihi) IS NOT NULL AND TRY_CONVERT(DECIMAL(12, 2), tutar) IS NOT NULL)\nINSERT INTO etl_fact_hareket (kaynak_no, sube_key, hesap_no, islem_tarihi, tutar, batch_id)\nSELECT s.kaynak_no, COALESCE(d.sube_key, -1), s.hesap_no, TRY_CONVERT(DATE, s.islem_tarihi), TRY_CONVERT(DECIMAL(12, 2), s.tutar), 43 FROM s LEFT JOIN etl_dim_sube d ON d.sube_kodu = s.sube_kodu AND TRY_CONVERT(DATE, s.islem_tarihi) BETWEEN d.gecerli_bas AND d.gecerli_bit WHERE s.sira = 1;", 'Önceki derste yazdığın CTE, üstüne LEFT JOIN.', { check: 'SELECT kaynak_no, sube_key, tutar FROM etl_fact_hareket ORDER BY kaynak_no', ynl: ["WITH s AS (SELECT *, ROW_NUMBER() OVER (PARTITION BY kaynak_no ORDER BY stg_id) AS sira FROM etl_stg_hareket WHERE hesap_no IS NOT NULL AND TRY_CONVERT(DATE, islem_tarihi) IS NOT NULL AND TRY_CONVERT(DECIMAL(12, 2), tutar) IS NOT NULL)\nINSERT INTO etl_fact_hareket (kaynak_no, sube_key, hesap_no, islem_tarihi, tutar, batch_id)\nSELECT s.kaynak_no, d.sube_key, s.hesap_no, TRY_CONVERT(DATE, s.islem_tarihi), TRY_CONVERT(DECIMAL(12, 2), s.tutar), 43 FROM s JOIN etl_dim_sube d ON d.sube_kodu = s.sube_kodu AND d.guncel = 1 WHERE s.sira = 1;"] }),
  sq('Tahmini üye: ham hareketlerde geçip boyutta hiç olmayan şube kodlarını iskelet satır olarak ekle: <code>sube_adi</code> <code>bilinmiyor</code>, <code>sehir</code> NULL, başlangıç <code>1900-01-01</code>, bitiş <code>9999-12-31</code>, <code>guncel</code> 1.', "INSERT INTO etl_dim_sube (sube_kodu, sube_adi, sehir, gecerli_bas, gecerli_bit, guncel)\nSELECT DISTINCT h.sube_kodu, 'bilinmiyor', NULL, '1900-01-01', '9999-12-31', 1\nFROM etl_stg_hareket h LEFT JOIN etl_dim_sube d ON d.sube_kodu = h.sube_kodu\nWHERE d.sube_key IS NULL;", 'Karşılığı olmayanı LEFT JOIN ile bul, DISTINCT ile tekille.', { check: 'SELECT sube_kodu, sube_adi, guncel FROM etl_dim_sube WHERE sube_key > 4 ORDER BY sube_kodu', ynl: ["INSERT INTO etl_dim_sube (sube_kodu, sube_adi, sehir, gecerli_bas, gecerli_bit, guncel) SELECT DISTINCT h.sube_kodu, 'bilinmiyor', NULL, '1900-01-01', '9999-12-31', 1 FROM etl_stg_hareket h;"] }),
  sq('Kapat: <code>etl_stg_sube</code> içinde adı ya da şehri farklı olan güncel boyut satırlarını kapat: <code>gecerli_bit</code> <code>2024-11-11</code>, <code>guncel</code> 0. <code>UPDATE ... FROM</code> kullan.', SCD_KAPA, 'Yalnız güncel satırları, yalnız değişenleri.', { check: 'SELECT sube_key, gecerli_bit, guncel FROM etl_dim_sube ORDER BY sube_key', must: [{ re: 'UPDATE[\\s\\S]+FROM', msg: 'Görev UPDATE ... FROM yazımını istiyor.' }], ynl: ["UPDATE d SET d.gecerli_bit = '2024-11-11', d.guncel = 0 FROM etl_dim_sube d JOIN etl_stg_sube s ON s.sube_kodu = d.sube_kodu WHERE s.sube_adi <> d.sube_adi OR s.sehir <> d.sehir;", "UPDATE d SET d.gecerli_bit = '2024-11-11', d.guncel = 0 FROM etl_dim_sube d JOIN etl_stg_sube s ON s.sube_kodu = d.sube_kodu WHERE d.guncel = 1;"] }),
  sq('Kapat ve aç: aynı çalıştırmada önce değişen satırları kapat (önceki görev), sonra güncel sürümü kalmayan her kaynak şube için <code>2024-11-12</code> başlangıçlı yeni güncel satır aç. Yeni şube S05 de açılsın.', SCD_KAPA + '\n' + SCD_AC, 'Tek INSERT: güncel sürümü olmayan kaynak şubeler.', { check: 'SELECT sube_kodu, sehir, gecerli_bas, gecerli_bit, guncel FROM etl_dim_sube ORDER BY sube_kodu, gecerli_bas', ynl: [SCD_AC + '\n' + SCD_KAPA, SCD_KAPA + "\nINSERT INTO etl_dim_sube (sube_kodu, sube_adi, sehir, gecerli_bas, gecerli_bit, guncel) SELECT sube_kodu, sube_adi, sehir, '2024-11-12', '9999-12-31', 1 FROM etl_stg_sube;"] }),
  mc('Kapat-aç sırasını ters yazarsan (önce INSERT, sonra UPDATE) ne olur?', ['Değişen şube yeni sürüm almaz', 'İki adım da hatasız ve aynı sonuçla biter', 'Motor UPDATE adımını otomatik önce çalıştırır', 'Fact tablosundaki anahtarlar kendiliğinden bozulur'], 0, 'INSERT güncel sürümü olmayanı arar; henüz kapatılmamış satır güncel göründüğü için değişen şube açılmaz, sonra UPDATE onu kapatır ve güncel satır kalmaz.'),
  mc('Geç gelen şube için -1 yazıldı, şube bugün boyuta geldi. Sonra ne gerekir?', ['Fact satırlarındaki -1 değerini güncellemek', 'Bilinmeyen üyeyi boyuttan silip işi kapatmak', 'Fact tablosunu baştan sona yeniden kurmak', 'Hiçbir şey, rapor kendiliğinden düzelir'], 0, 'Fact hâlâ -1 tutar. İş anahtarını da saklıyorsan yalnız o satırları güncellersin; bu yüzden ham kaynak ya da red bilgisi saklanır.')
]);

/* ------------------------------------------------------------------ DWH 1: fact türleri */
const CAPRAZ = `WITH satis AS (
  SELECT strftime('%Y-%m', o.order_date) AS ay, SUM(i.quantity * i.unit_price * (1 - i.discount)) AS ciro
  FROM orders o JOIN order_items i ON i.order_id = o.order_id
  WHERE o.status <> 'cancelled'
  GROUP BY strftime('%Y-%m', o.order_date)
), ziyaret AS (
  SELECT strftime('%Y-%m', event_time) AS ay, COUNT(*) AS olay
  FROM web_events
  GROUP BY strftime('%Y-%m', event_time)
)
SELECT s.ay, ROUND(s.ciro, 2) AS ciro, z.olay
FROM satis s JOIN ziyaret z ON z.ay = s.ay
ORDER BY s.ay;`;
const SQL_ALL = { base: 'sqlite', dl: ['sqlite'] };
ders('dwh-fact', 'Veri Ambarı', 'B2', 25, 'Fact türleri: işlem, periyodik, biriken; factless ve uyumlu boyut',
  'Yanlış fact türü toplamları bozar. Üç tür, toplanabilirlik, kapsam tablosu ve iki fact tablosunu güvenle birleştirmek.',
  'fact türleri transaction periodic snapshot accumulating snapshot factless conformed dimension uyumlu boyut role playing degenerate junk köprü',
`<h2>Üç fact türü</h2>
<p>Yıldız şema ve tanecik için <b>Veri ambarı temelleri</b> dersine bak. Burada fact'in kendisi: aynı iş sürecinden üç farklı tablo çıkar.</p>
<table><tr><th>Tür</th><th>Bir satır</th><th>Örnek</th><th>Satır değişir mi?</th></tr>
<tr><td>İşlem (transaction)</td><td>Bir olay</td><td><code>bank_txns</code>: bir hareket</td><td>Hayır, yalnız eklenir</td></tr>
<tr><td>Periyodik anlık görüntü</td><td>Dönem sonunda durum</td><td>Hesabın ay sonu bakiyesi</td><td>Hayır, her dönem yeni satır</td></tr>
<tr><td>Biriken anlık görüntü</td><td>Bir sürecin yaşamı</td><td>Bir siparişin alınma, yola çıkma, teslim zamanı</td><td>Evet, adım tamamlandıkça güncellenir</td></tr></table>
<h2>Toplanabilirlik</h2>
<table><tr><th>Ölçü</th><th>Ne üzerinden toplanır</th><th>Örnek</th></tr>
<tr><td>Toplanabilir</td><td>Her boyut</td><td>Tutar, adet</td></tr>
<tr><td>Yarı toplanabilir</td><td>Zaman hariç</td><td>Bakiye: şubeler toplanır, aylar toplanmaz</td></tr>
<tr><td>Toplanamaz</td><td>Hiçbiri</td><td>Oran, birim fiyat: payı ve paydayı sakla</td></tr></table>
<h2>Factless, degenerate, junk, köprü</h2>
<ul><li><b>Factless:</b> ölçüsü olmayan fact. "Bu çalışan bu eğitimi aldı" gibi yalnız olayı kaydeder. <code>COUNT(*)</code> ölçüdür; olmamış şeyi bulmak için kapsam tablosuyla karşılaştırılır.</li>
<li><b>Degenerate boyut:</b> fact içinde duran, ayrı tablosu olmayan kimlik: fiş no.</li>
<li><b>Junk boyut:</b> düşük çeşitli bayrakların (ödeme türü, kanal, iade mi) tek küçük boyutta birleştirilmesi.</li>
<li><b>Köprü tablosu:</b> çoka çok ilişki: bir hesabın birden çok sahibi. Toplamı katlamamak için ağırlık tutulabilir.</li></ul>
<h2>Uyumlu boyut ve çapraz inceleme</h2>
<p>İki süreç (satış ve web ziyareti) aynı <b>uyumlu</b> tarih ve ürün boyutunu kullanırsa karşılaştırılabilir. Fact'ler doğrudan birleştirilmez, satırlar katlanır. Her biri aynı boyut düzeyine toplanır, sonra birleştirilir.</p>
<pre class="code" data-na="tsql pg mysql oracle bq">${esc(CAPRAZ)}</pre>
<h2>Role-playing boyut</h2>
<p>Aynı boyut bir fact'te iki rol oynar: uçuşun kalkış ve varış havalimanı. Tek tablo, iki takma ad.</p>`,
[
  sqg('Periyodik görüntü: <code>fact_hesap_ay</code> tablosunu <code>CREATE TABLE ... AS</code> ile kur: hesap başına ay başına net hareket toplamı (<code>account_id</code>, <code>ay</code> <code>YYYY-MM</code> metni, <code>net</code>), yalnız 2024-01 ve 2024-02.', "CREATE TABLE fact_hesap_ay AS\nSELECT account_id, strftime('%Y-%m', txn_time) AS ay, SUM(amount) AS net\nFROM bank_txns\nWHERE txn_time >= '2024-01-01' AND txn_time < '2024-03-01'\nGROUP BY account_id, strftime('%Y-%m', txn_time);", 'Tanecik: hesap ve ay.', Object.assign({ check: 'SELECT COUNT(*) AS satir, ROUND(SUM(net), 2) AS toplam FROM fact_hesap_ay', ynl: ["CREATE TABLE fact_hesap_ay AS SELECT account_id, strftime('%Y-%m', txn_time) AS ay, SUM(amount) AS net FROM bank_txns WHERE txn_time >= '2024-01-01' AND txn_time < '2024-03-01' GROUP BY strftime('%Y-%m', txn_time);"] }, SQL_ALL)),
  sqg('Biriken görüntü: <code>lk_orders</code> teslim edilen 3 siparişi için süreç satırı: <code>order_id</code>, alınma-yola çıkma dakikası <code>hazirlik_dk</code>, yola çıkma-teslim dakikası <code>yol_dk</code>. <code>order_id</code> en küçük 3 teslim edilmiş sipariş. Dakikalar tam sayıya yuvarlansın.', "SELECT order_id, ROUND((julianday(picked_at) - julianday(placed_at)) * 1440) AS hazirlik_dk, ROUND((julianday(delivered_at) - julianday(picked_at)) * 1440) AS yol_dk\nFROM lk_orders WHERE delivered_at IS NOT NULL ORDER BY order_id LIMIT 3;", 'Bir satır bir siparişin yaşamı; farkları dakikaya çevir.', Object.assign({ ord: true, ynl: ["SELECT order_id, ROUND((julianday(picked_at) - julianday(placed_at)) * 1440) AS hazirlik_dk, ROUND((julianday(delivered_at) - julianday(placed_at)) * 1440) AS yol_dk FROM lk_orders WHERE delivered_at IS NOT NULL ORDER BY order_id LIMIT 3;"] }, SQL_ALL)),
  sqg('Factless kapsam: <code>ik_training</code> bir factless fact. <code>ik_employees</code> içinde hiç eğitim kaydı olmayan çalışan sayısı: <code>egitimsiz</code>.', "SELECT COUNT(*) AS egitimsiz FROM ik_employees e LEFT JOIN ik_training t ON t.emp_id = e.emp_id WHERE t.emp_id IS NULL;", 'Kapsam: boyut tablosundan olmayanı ara.', Object.assign({ ynl: ["SELECT COUNT(*) AS egitimsiz FROM ik_training t WHERE NOT EXISTS (SELECT 1 FROM ik_employees e WHERE t.emp_id = e.emp_id);"] }, SQL_ALL)),
  sqg('Çapraz inceleme: ay başına ciro (<code>quantity * unit_price * (1 - discount)</code>, iptal hariç) ile web olay sayısını tek satırda göster: <code>ay</code>, <code>ciro</code> (2 ondalık), <code>olay</code>. Ay sırasıyla. İki fact önce ayrı ayrı toplanmalı.', CAPRAZ, 'İki CTE, sonra ay üzerinden JOIN.', Object.assign({ ord: true, ynl: ["SELECT strftime('%Y-%m', o.order_date) AS ay, ROUND(SUM(i.quantity * i.unit_price * (1 - i.discount)), 2) AS ciro, COUNT(w.event_id) AS olay FROM orders o JOIN order_items i ON i.order_id = o.order_id JOIN web_events w ON strftime('%Y-%m', w.event_time) = strftime('%Y-%m', o.order_date) WHERE o.status <> 'cancelled' GROUP BY strftime('%Y-%m', o.order_date) ORDER BY ay;"] }, SQL_ALL)),
  sqg('Role-playing: <code>hv_routes</code> içinde kalkış şehri ile varış şehrini aynı <code>hv_airports</code> tablosundan iki kez çek: <code>route_id</code>, <code>kalkis</code>, <code>varis</code>. İlk 3 rota, <code>route_id</code> sırasıyla.', "SELECT r.route_id, a.city AS kalkis, b.city AS varis FROM hv_routes r JOIN hv_airports a ON a.airport_code = r.origin JOIN hv_airports b ON b.airport_code = r.dest ORDER BY r.route_id LIMIT 3;", 'Aynı tablo, iki takma ad.', Object.assign({ ord: true, ynl: ["SELECT r.route_id, a.city AS kalkis, a.city AS varis FROM hv_routes r JOIN hv_airports a ON a.airport_code = r.origin ORDER BY r.route_id LIMIT 3;"] }, SQL_ALL)),
  mc('Ay sonu bakiye tablosunda bir hesabın 12 ayını <code>SUM</code> ile toplamak neden yanlış?', ['Bakiye durumdur; zaman üzerinden toplanmaz', 'SUM ondalıklı sayılarda yuvarlama hatası yapar', 'Ay sonu tablolarında SUM hiç çalışmaz', 'Hesapların para birimleri her zaman farklıdır'], 0, 'Yarı toplanabilir ölçü. Aylar üzerinden ortalama ya da son değer anlamlıdır, toplam değil.'),
  mc('Bir siparişin alındı, yolda, teslim zamanlarını tek satırda tutan ve adım oldukça güncellenen tablo hangisidir?', ['Biriken anlık görüntü', 'Periyodik anlık görüntü', 'İşlem fact tablosu', 'Junk boyut tablosu'], 0, 'Biriken görüntü sürecin yaşamını izler ve UPDATE alan tek fact türüdür.'),
  mc('İki fact tablosunu boyuta inmeden satır düzeyinde birleştirmenin riski nedir?', ['Satırlar katlanır, toplam şişer', 'Sorgu yalnız yavaşlar, sonuç değişmez', 'Birleştirme söz dizimi hata verir', 'Boyut tabloları kilitlenir ve bekler'], 0, 'Aynı aydaki her satış her ziyaretle eşleşir. Önce aynı düzeye topla, sonra birleştir: çapraz inceleme.'),
  mc('Fiş numarasının fact tablosunda ayrı boyutu olmadan durmasına ne denir?', ['Degenerate boyut', 'Role-playing boyut', 'Uyumlu boyut', 'Köprü tablosu'], 0, 'Fiş no ek özelliği olmayan bir kimliktir, gruplama ve iz sürme için fact içinde kalır.')
]);

/* ------------------------------------------------------------------ DWH 2: iş ihtiyacından şema */
const TAS_SOL = `CREATE TABLE dim_kurye (kurye_key INTEGER PRIMARY KEY, courier_id INTEGER NOT NULL, ad TEXT);
INSERT INTO dim_kurye (courier_id, ad) SELECT courier_id, full_name FROM lk_couriers;
CREATE TABLE dim_tarih (tarih_key INTEGER PRIMARY KEY, tarih TEXT NOT NULL, ay TEXT NOT NULL);
INSERT INTO dim_tarih (tarih_key, tarih, ay) SELECT DISTINCT CAST(strftime('%Y%m%d', placed_at) AS INTEGER), date(placed_at), strftime('%Y-%m', placed_at) FROM lk_orders;
CREATE TABLE fact_teslimat (order_id INTEGER PRIMARY KEY, kurye_key INTEGER NOT NULL, tarih_key INTEGER NOT NULL, teslim_ucreti REAL, bahsis REAL);
INSERT INTO fact_teslimat (order_id, kurye_key, tarih_key, teslim_ucreti, bahsis)
SELECT o.order_id, k.kurye_key, CAST(strftime('%Y%m%d', o.placed_at) AS INTEGER), o.delivery_fee, o.tip
FROM lk_orders o JOIN dim_kurye k ON k.courier_id = o.courier_id
WHERE o.status = 'teslim';`;
const TAS_CHECK = `SELECT (SELECT COUNT(*) FROM fact_teslimat) AS fact_satir,
       (SELECT ROUND(SUM(teslim_ucreti), 2) FROM fact_teslimat) AS ucret,
       (SELECT COUNT(*) FROM pragma_table_info('dim_kurye') WHERE pk > 0) AS kurye_pk,
       (SELECT COUNT(*) FROM pragma_table_info('dim_tarih') WHERE pk > 0) AS tarih_pk,
       (SELECT COUNT(*) FROM pragma_table_info('fact_teslimat') WHERE name IN ('city', 'name', 'ad', 'sehir', 'tarih', 'ay')) AS factte_metin,
       (SELECT COUNT(*) FROM dim_kurye) - (SELECT COUNT(DISTINCT courier_id) FROM lk_couriers) AS kurye_fark`;
ders('dwh-tasarim', 'Veri Ambarı', 'B2', 30, 'İş ihtiyacından şema: tanecik, boyut ve anahtar kararını sen ver',
  'Müşteri cümlesinden tablo çıkarmak. Sütunlar verilmez; denetim tanecik, anahtar ve ayrışmayı sınar.',
  'veri modelleme şema tasarımı iş ihtiyacı tanecik grain boyut fact vekil anahtar veri sözlüğü',
`<h2>Dört soru</h2>
<p>İlanlarda "veri modelleme" yazınca beklenen, hazır sütun listesini DDL'e çevirmek değil, cümleden tablo çıkarmaktır. Sıra hep aynı:</p>
<ol><li><b>Süreç:</b> Hangi iş olayını ölçüyoruz?</li><li><b>Tanecik:</b> Bir satır tam olarak nedir? Bunu tek cümleyle söyleyemiyorsan tasarım başlamamıştır.</li><li><b>Boyutlar:</b> Kim, ne, nerede, ne zaman? "... bazında" dediği her şey.</li><li><b>Ölçüler:</b> Toplanacak sayılar. Tanecikle uyumlu olmayan ölçü aynı tabloya girmez.</li></ol>
<h2>Örnek cümle</h2>
<div class="note"><b>Operasyon müdürü</b>"Her kuryenin her ay kaç teslimat yaptığını, ne kadar teslim ücreti ve bahşiş getirdiğini görmek istiyorum. Ayrıntıya inebilmeliyim."</div>
<table><tr><th>Karar</th><th>Seçim</th><th>Neden</th></tr>
<tr><td>Tanecik</td><td>Bir teslim edilmiş sipariş</td><td>"Ayrıntıya inebilmeliyim": ay özeti buradan türer, tersi olmaz</td></tr>
<tr><td>Boyut</td><td>Kurye, tarih</td><td>"Kurye" ve "ay"</td></tr>
<tr><td>Ölçü</td><td>Ücret, bahşiş</td><td>İkisi de bir siparişe ait, toplanabilir</td></tr>
<tr><td>Anahtar</td><td>Boyutta vekil anahtar</td><td>Kaynak kimliği değişebilir, sürüm tutmak gerekebilir</td></tr></table>
<div class="warn"><b>Sık hata</b>Aylık özeti fact yapmak. Bugünkü soru cevaplanır, yarın "gün bazında" denince tablo yeniden kurulur. En ince tanecikte sakla, özeti view yap.</div>
<h2>Veri sözlüğü</h2>
<p>Her sütun için bir cümle yaz: ne, hangi birimde, nereden geliyor. Ambar teslim edilirken istenen şey budur; <code>ba-veri</code> dersinde iş analizi tarafı var.</p>
<div class="note"><b>Denetim ne yapar?</b>Görevde sütun adını büyük ölçüde sen seçersin. Denetim yalnız söylenen adları ve şunları arar: satır sayısı doğru tanecikte mi, toplam tutuyor mu, boyutlarda birincil anahtar var mı, fact tablosunda açıklama metni kalmış mı.</div>`,
[
  sqg('Yukarıdaki cümle için şemayı kur ve doldur. Üç tablo adı sabit: <code>dim_kurye</code>, <code>dim_tarih</code>, <code>fact_teslimat</code>. Fact: yalnız <code>status = \'teslim\'</code> siparişler; ölçü sütunları <code>teslim_ucreti</code> ve <code>bahsis</code>. Kurye boyutu <code>courier_id</code> sütununu da tutsun. Anahtarları ve geri kalan sütunları sen seç; fact tablosunda ad, şehir, tarih ya da ay metni tutma, tarih anahtarı kullan.', TAS_SOL, 'Önce tanecik. Sonra boyutlar, en son fact.', Object.assign({ check: TAS_CHECK, ynl: [`CREATE TABLE dim_kurye (kurye_key INTEGER PRIMARY KEY, courier_id INTEGER NOT NULL, ad TEXT);
INSERT INTO dim_kurye (courier_id, ad) SELECT courier_id, full_name FROM lk_couriers;
CREATE TABLE dim_tarih (tarih_key INTEGER PRIMARY KEY, ay TEXT);
CREATE TABLE fact_teslimat AS SELECT courier_id, strftime('%Y-%m', placed_at) AS ay, SUM(delivery_fee) AS teslim_ucreti, SUM(tip) AS bahsis FROM lk_orders WHERE status = 'teslim' GROUP BY courier_id, ay;`, `CREATE TABLE dim_kurye (courier_id INTEGER, ad TEXT);
INSERT INTO dim_kurye SELECT courier_id, full_name FROM lk_couriers;
CREATE TABLE dim_tarih (tarih TEXT);
CREATE TABLE fact_teslimat AS SELECT order_id, courier_id, placed_at AS tarih, delivery_fee AS teslim_ucreti, tip AS bahsis FROM lk_orders WHERE status = 'teslim';`] }, SQL_ALL)),
  sqg('Ay özetini view yap: kurduğun şemadan türetilebildiğini göster. Önce üstteki şemayı aynı çalıştırmada yeniden kur, sonra <code>v_kurye_ay</code> view: <code>courier_id</code>, <code>ay</code>, <code>teslimat</code>, <code>toplam_ucret</code>.', TAS_SOL + `
CREATE VIEW v_kurye_ay AS
SELECT k.courier_id, t.ay, COUNT(*) AS teslimat, SUM(f.teslim_ucreti) AS toplam_ucret
FROM fact_teslimat f JOIN dim_kurye k ON k.kurye_key = f.kurye_key JOIN dim_tarih t ON t.tarih_key = f.tarih_key
GROUP BY k.courier_id, t.ay;`, 'İki boyuta JOIN ve GROUP BY.', Object.assign({ check: 'SELECT COUNT(*) AS satir, SUM(teslimat) AS teslimat, ROUND(SUM(toplam_ucret), 2) AS ucret FROM v_kurye_ay', ynl: [TAS_SOL + `
CREATE VIEW v_kurye_ay AS SELECT k.courier_id, t.ay, COUNT(*) AS teslimat, SUM(f.teslim_ucreti) AS toplam_ucret FROM fact_teslimat f JOIN dim_kurye k ON k.kurye_key = f.kurye_key JOIN dim_tarih t ON t.tarih_key = f.tarih_key GROUP BY t.ay;`] }, SQL_ALL)),
  mc('Müşteri: "Şube bazında aylık mevduat toplamını görmek istiyorum." İlk sorulacak soru hangisi?', ['Bakiye ay sonu mu, ortalama mı?', 'Rapor hangi renklerle gösterilecek olsun?', 'Sunucuda kaç işlemci çekirdeği bulunuyor?', 'Tablolara hangi adlandırma öneki verilsin?'], 0, 'Tanecik ve ölçü tanımı olmadan tablo yazılamaz. Mevduat yarı toplanabilir: tanım sonucu değiştirir.'),
  mc('"Bir satır nedir?" sorusuna "bir müşteri ve ay, bazen de bir sipariş" cevabı veriliyor. Sorun ne?', ['Karışık tanecik, güvenilmez toplam', 'Müşteri tablosu fazladan büyümüş olur', 'Sipariş kimliği artık tekil kalamaz olur', 'Sorun yok, esnek bir tasarım sayılır'], 0, 'Tek tabloda tek tanecik. Farklı taneciği ayrı fact yap.'),
  mc('Müşteri ileride "gün bazında" da isteyebilir ama şu an yalnız ay diyor. Fact taneciği ne olmalı?', ['En ince mevcut olay, ay özeti view olsun', 'Yalnız ay, ihtiyaç doğunca tablo yeniden kurulur', 'Gün ve ay için aynı tabloda karışık satırlar', 'Önce rapor yazılır, tanecik sonra düşünülür'], 0, 'İnce tanecikten kaba özet türetilir, tersi mümkün değildir. Depolama bedeli çoğu zaman buna değer.'),
  mc('Kaynak sistem kimliği varken boyuta neden ayrıca vekil anahtar konur?', ['Kayıt birden çok sürüm tutabilir', 'Vekil anahtar sorguları her zaman on kat hızlandırır', 'SQL standardı boyutta doğal anahtarı yasaklar', 'Kaynak kimlikleri tam sayı olamayacağı için'], 0, 'SCD 2 sürümleri ve kaynak değişimi vekil anahtarı gerektirir. Hız farkı garantili değildir.')
]);

/* ------------------------------------------------------------------ T-SQL: yordam derinliği */
ders('ts-proc-ileri', 'T-SQL (SQL Server)', 'B2', 25, 'Saklı yordam derinliği: varsayılan parametre, iç içe çağrı, INSERT EXEC',
  'Gerçek yordamlar birbirini çağırır, sonuçları tabloya alır ve hata anında temiz çıkar.',
  'stored procedure varsayılan parametre nested nestlevel insert exec recompile try catch',
`<h2>Varsayılan parametre</h2>
<p>Temel yazım için <b>Saklı yordamlar</b> dersine bak. Varsayılan değer verilen parametre çağrıda atlanabilir. <code>NULL</code> varsayılan ve <code>(@p IS NULL OR sutun = @p)</code>, isteğe bağlı filtrenin yaygın kalıbıdır; ama <a href="#ders-opt-turler">parametre koklama</a> riski taşır.</p>
${ts(`CREATE PROCEDURE dbo.usp_Urunler @kategori NVARCHAR(50) = NULL, @en_az DECIMAL(12, 2) = 0 AS
BEGIN
  SET NOCOUNT ON;
  SELECT name, price FROM products WHERE (@kategori IS NULL OR category = @kategori) AND price >= @en_az ORDER BY price DESC, name;
END;
GO
EXEC dbo.usp_Urunler @kategori = N'Kitap';
EXEC dbo.usp_Urunler @en_az = 5000;`)}
<h2>İç içe çağrı</h2>
<p>Bir yordam diğerini çağırabilir. <code>@@NESTLEVEL</code> kaçıncı derinlikte olduğunu verir. Sınır 32'dir; aşılınca Msg 217 alınır, bu motor da aynı hatayı verir.</p>
${ts(`CREATE PROCEDURE dbo.usp_Ic AS BEGIN SELECT @@NESTLEVEL AS derinlik; END;
GO
CREATE PROCEDURE dbo.usp_Dis AS BEGIN EXEC dbo.usp_Ic; END;
GO
EXEC dbo.usp_Dis;`)}
<h2>INSERT ... EXEC</h2>
<p>Yordamın sonuç kümesini tabloya alır. Sütun sayısı ve sırası uymalı. Sınırı: yordam birden çok sonuç kümesi döndürüyorsa işler karışır ve iç içe INSERT EXEC gerçek SQL Server'da yasaktır. Satır tablo değerli işlev çoğu zaman daha temizdir.</p>
${ts(`CREATE PROCEDURE dbo.usp_Kitap AS BEGIN SELECT product_id, price FROM products WHERE category = N'Kitap'; END;
GO
CREATE TABLE #kitap (product_id INT, price DECIMAL(12, 2));
INSERT INTO #kitap EXEC dbo.usp_Kitap;
SELECT COUNT(*) AS adet, MAX(price) AS en_pahali FROM #kitap;`)}
<h2>WITH RECOMPILE ve TVP</h2>
<table><tr><th>Özellik</th><th>Ne yapar</th><th>Bu motorda</th></tr>
<tr><td><code>WITH RECOMPILE</code></td><td>Yordam her çağrıda yeniden derlenir, plan önbelleğe yazılmaz</td><td>Yazım kabul edilir, plan etkisi görülmez</td></tr>
<tr><td>Tablo değerli parametre</td><td><code>CREATE TYPE ... AS TABLE</code>, <code>READONLY</code> ile çok satır geçirme</td><td>Çalışmaz: <code>CREATE TYPE</code> reddedilir</td></tr></table>
<h2>Yordamda güvenli işlem</h2>
<p>Hata yönetimi kalıbı için <b>Hata yönetimi ileri</b> dersine bak: <code>SET XACT_ABORT ON</code>, <code>TRY/CATCH</code>, geri al, yeniden fırlat.</p>`,
[
  sq('<code>dbo.usp_Calisanlar</code> yordamı: <code>@dept INT = NULL</code> ve <code>@en_az DECIMAL(12,2) = 0</code> alsın. <code>employees</code> içinden departman verilmişse ona, en az maaşa göre <code>first_name</code>, <code>salary</code> döndürsün; maaşa göre azalan, sonra ada göre. Sonra <code>EXEC dbo.usp_Calisanlar @en_az = 90000;</code>', "CREATE PROCEDURE dbo.usp_Calisanlar @dept INT = NULL, @en_az DECIMAL(12, 2) = 0 AS\nBEGIN\n  SET NOCOUNT ON;\n  SELECT first_name, salary FROM employees WHERE (@dept IS NULL OR dept_id = @dept) AND salary >= @en_az ORDER BY salary DESC, first_name;\nEND;\nGO\nEXEC dbo.usp_Calisanlar @en_az = 90000;", 'NULL varsayılan ve (@dept IS NULL OR ...).', { ord: true, must: [{ re: '@dept\\s+INT\\s*=\\s*NULL', msg: 'Görev @dept için NULL varsayılan istiyor.' }], ynl: ["CREATE PROCEDURE dbo.usp_Calisanlar @dept INT = NULL, @en_az DECIMAL(12, 2) = 0 AS\nBEGIN\n  SELECT first_name, salary FROM employees WHERE dept_id = @dept AND salary >= @en_az ORDER BY salary DESC, first_name;\nEND;\nGO\nEXEC dbo.usp_Calisanlar @en_az = 90000;"] }),
  sq('İç içe: <code>dbo.usp_Sayac</code> yordamı <code>@@NESTLEVEL</code> değerini <code>derinlik</code> adıyla döndürsün. <code>dbo.usp_Orta</code> onu, <code>dbo.usp_Ust</code> de <code>usp_Orta</code>\'yı çağırsın. Sonunda <code>EXEC dbo.usp_Ust;</code>', "CREATE PROCEDURE dbo.usp_Sayac AS BEGIN SELECT @@NESTLEVEL AS derinlik; END;\nGO\nCREATE PROCEDURE dbo.usp_Orta AS BEGIN EXEC dbo.usp_Sayac; END;\nGO\nCREATE PROCEDURE dbo.usp_Ust AS BEGIN EXEC dbo.usp_Orta; END;\nGO\nEXEC dbo.usp_Ust;", 'İçten dışa oluştur.', { must: [{ re: '@@NESTLEVEL', msg: 'Görev @@NESTLEVEL istiyor.' }], ynl: ["CREATE PROCEDURE dbo.usp_Sayac AS BEGIN SELECT @@NESTLEVEL AS derinlik; END;\nGO\nEXEC dbo.usp_Sayac;"] }),
  sq('INSERT EXEC: <code>dbo.usp_SehirSayi</code> şehir başına müşteri sayısını (<code>city</code>, <code>adet</code>) döndürsün. Geçici <code>#sehir</code> tablosuna <code>INSERT ... EXEC</code> ile al, 20\'den çok müşterisi olan şehirleri çoktan aza, sonra ada göre listele.', "CREATE PROCEDURE dbo.usp_SehirSayi AS BEGIN SELECT city, COUNT(*) AS adet FROM customers GROUP BY city; END;\nGO\nCREATE TABLE #sehir (city NVARCHAR(50), adet INT);\nINSERT INTO #sehir EXEC dbo.usp_SehirSayi;\nSELECT city, adet FROM #sehir WHERE adet > 20 ORDER BY adet DESC, city;", 'Önce yordam, sonra tablo, sonra INSERT EXEC.', { ord: true, must: [{ re: 'INSERT\\s+(INTO\\s+)?#sehir\\s+EXEC', msg: 'Görev INSERT ... EXEC istiyor.' }], ynl: ["SELECT city, COUNT(*) AS adet FROM customers GROUP BY city HAVING COUNT(*) >= 20 ORDER BY adet DESC, city;"] }),
  sq('Çağrı kodu: <code>dbo.usp_StokKontrol</code> <code>@id INT</code> ve <code>@adet INT</code> alsın; stok yetmiyorsa <code>RETURN 1</code>, yetiyorsa <code>RETURN 0</code>. <code>dbo.usp_Satis</code> onu çağırıp kodu <code>@k</code> değişkenine alsın ve 0 ise stoğu düşsün. <code>EXEC dbo.usp_Satis @id = 1, @adet = 2;</code> ve <code>EXEC dbo.usp_Satis @id = 39, @adet = 100000;</code> çalıştır.', "CREATE PROCEDURE dbo.usp_StokKontrol @id INT, @adet INT AS\nBEGIN\n  IF (SELECT stock FROM products WHERE product_id = @id) < @adet RETURN 1;\n  RETURN 0;\nEND;\nGO\nCREATE PROCEDURE dbo.usp_Satis @id INT, @adet INT AS\nBEGIN\n  DECLARE @k INT;\n  EXEC @k = dbo.usp_StokKontrol @id = @id, @adet = @adet;\n  IF @k = 0 UPDATE products SET stock = stock - @adet WHERE product_id = @id;\nEND;\nGO\nEXEC dbo.usp_Satis @id = 1, @adet = 2;\nEXEC dbo.usp_Satis @id = 39, @adet = 100000;", 'EXEC @k = yordam ...', { check: 'SELECT product_id, stock FROM products WHERE product_id IN (1, 39) ORDER BY product_id', ynl: ["CREATE PROCEDURE dbo.usp_Satis @id INT, @adet INT AS\nBEGIN\n  UPDATE products SET stock = stock - @adet WHERE product_id = @id;\nEND;\nGO\nEXEC dbo.usp_Satis @id = 1, @adet = 2;\nEXEC dbo.usp_Satis @id = 39, @adet = 100000;"] }),
  mc('<code>@p IS NULL OR sutun = @p</code> kalıbının bilinen riski nedir?', ['Tek plan her parametreye uymayabilir', 'NULL parametre gerçek sunucuda hata verir', 'OR kullanan yordam derlenmeyi reddeder', 'Yordam sonuç kümesi döndüremez hâle gelir'], 0, 'Plan ilk çağrıya göre derlenir. Seçicilik farkı büyükse OPTION (RECOMPILE) ya da dinamik SQL düşünülür.'),
  mc('Bir yordam başka yordamı sonsuza dek çağırıyor. Ne olur?', ['32 düzeyde Msg 217 ile durur', 'Sunucu belleği bitene dek sürer', 'Kendiliğinden döngüyü kırıp başarılı döner', 'Yalnız uyarı yazar, çalışmaya devam eder'], 0, 'İç içe düzey sınırı 32. @@NESTLEVEL ile izlenebilir.'),
  mc('İki sonuç kümesi döndüren yordama <code>INSERT ... EXEC</code> uyguluyorsun. Temel koşul nedir?', ['Her küme hedef sütunlara uyumlu olmalı', 'Yordamda yalnız tek SELECT izin verilir', 'Hedef her zaman geçici tablo olmalı', 'EXEC yerine sp_executesql gerekmektedir'], 0, 'Bütün kümeler aynı hedefe eklenir; yapıları uymazsa hata alınır. Yordamları bu yüzden tek küme döndürecek yazmak iyi alışkanlıktır.')
]);

/* ------------------------------------------------------------------ T-SQL: DML ve JOIN */
ders('ts-dml-join', 'T-SQL (SQL Server)', 'B2', 25, 'T-SQL DML kalıpları: UPDATE FROM, DELETE JOIN, TOP ile parça parça silme, OUTPUT',
  'Günlük T-SQL\'in en sık yazımları: başka tabloya göre güncelle, sil; büyük silmeyi böl; neyin değiştiğini yakala.',
  'update from join delete join delete top output inserted deleted merge action batch silme',
`<h2>Başka tabloya göre güncellemek</h2>
<p>T-SQL'e özgü yazım: hedef <code>FROM</code> içinde tekrar yer alır, <code>UPDATE</code> sonrasında takma ad yazılır. Bu yazım ISO standardı değildir; aynı işi PostgreSQL <code>UPDATE t ... FROM s</code>, MySQL <code>UPDATE t JOIN s ... SET</code> ile yapar.</p>
${ts(`UPDATE p SET p.price = u.new_price
FROM products p
JOIN price_updates u ON u.product_id = p.product_id
WHERE u.new_price > p.price;
SELECT @@ROWCOUNT AS guncellenen;`)}
<div class="warn"><b>Belirsizlik</b>Bir hedef satırı birden çok kaynak satırıyla eşleşirse hangisinin yazılacağı belirsizdir; hata da vermez. Önce kaynağı tekilleştir. Yukarıdaki sorguda bir ürünün birden çok fiyat kaydı varsa sonuç garanti değildir. Bu yüzden <b>MERGE</b> dersinde önce son kayıt seçiliyordu.</div>
<h2>Başka tabloya göre silmek</h2>
<p>Hedef <code>DELETE</code> ile <code>FROM</code> arasına takma adla yazılır.</p>
${ts(`DELETE i
FROM order_items i
JOIN orders o ON o.order_id = i.order_id
WHERE o.status = 'cancelled';
SELECT @@ROWCOUNT AS silinen;`)}
<h2>Parça parça silmek</h2>
<p>Milyonlarca satırı tek işlemde silmek günlüğü şişirir, kilitleri uzun tutar. <code>DELETE TOP (n)</code> döngüde çalıştırılır. <code>TOP</code> burada <code>ORDER BY</code> almaz, hangi satırların gideceği belirsizdir; bu silmede sorun değildir, çünkü hepsi gidecektir.</p>
${ts(`DECLARE @n INT = 1, @tur INT = 0;
WHILE @n > 0
BEGIN
  DELETE TOP (500) FROM bank_txns WHERE txn_time < '2023-03-01';
  SET @n = @@ROWCOUNT;
  SET @tur = @tur + 1;
END;
SELECT @tur AS tur, COUNT(*) AS kalan FROM bank_txns WHERE txn_time < '2023-03-01';`)}
<h2>OUTPUT: neyin değiştiğini yakala</h2>
<p><code>inserted</code> yeni, <code>deleted</code> eski değerdir. Trigger yazmadan denetim kaydı almanın kısa yolu.</p>
${ts(`UPDATE departments SET city = N'Ankara'
OUTPUT deleted.dept_id, deleted.city AS eski, inserted.city AS yeni
WHERE dept_id = 2;`)}
<h2>MERGE OUTPUT ve $action</h2>
<p>MERGE'te <code>$action</code> satıra ne yapıldığını yazar: <code>INSERT</code>, <code>UPDATE</code> ya da <code>DELETE</code>. Sıra garanti değildir, sıralama gerekiyorsa sonucu tabloya alıp sırala. <code>OUTPUT ... INTO</code> hedefi tablo ya da tablo değişkenidir.</p>
${ts(`DECLARE @d TABLE (islem NVARCHAR(10), dept_id INT, eski NVARCHAR(50), yeni NVARCHAR(50));
MERGE departments AS t
USING (SELECT 2 AS dept_id, N'Pazarlama' AS name, N'Ankara' AS city UNION ALL SELECT 50, N'Veri', N'İzmir') AS s
   ON t.dept_id = s.dept_id
WHEN MATCHED THEN UPDATE SET city = s.city
WHEN NOT MATCHED THEN INSERT (dept_id, name, city) VALUES (s.dept_id, s.name, s.city)
OUTPUT $action, COALESCE(inserted.dept_id, deleted.dept_id), deleted.city, inserted.city INTO @d;
SELECT * FROM @d ORDER BY dept_id;`)}
<div class="note"><b>Bu motorda</b>Bu yazımlar tarayıcıdaki taklit motorda SQLite'a çevrilerek çalışır; söz dizimi ve sonuç öğretilir, günlük ve kilit etkisi görülmez.</div>`,
[
  sq('<code>UPDATE ... FROM</code>: <code>price_updates</code> tablosundaki yeni fiyatı <code>products.price</code> sütununa yaz; ürün başına en son <code>updated_at</code> kaydı kullanılsın. Kaynağı önce tekilleştir.', "WITH son AS (SELECT product_id, new_price, ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY updated_at DESC) AS rn FROM price_updates)\nUPDATE p SET p.price = s.new_price\nFROM products p JOIN son s ON s.product_id = p.product_id\nWHERE s.rn = 1;", 'CTE, ROW_NUMBER, sonra UPDATE ... FROM.', { check: 'SELECT product_id, price FROM products ORDER BY product_id', must: [{ re: 'UPDATE[\\s\\S]+FROM[\\s\\S]+JOIN', msg: 'Görev UPDATE ... FROM ... JOIN yazımını istiyor.' }], ynl: ["UPDATE p SET p.price = u.new_price FROM products p JOIN price_updates u ON u.product_id = p.product_id WHERE u.new_price = 1;", "WITH son AS (SELECT product_id, new_price, ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY updated_at) AS rn FROM price_updates)\nUPDATE p SET p.price = s.new_price FROM products p JOIN son s ON s.product_id = p.product_id WHERE s.rn = 1;"] }),
  sq('Şartlı: İstanbul\'daki müşterilerin iptal edilmemiş siparişlerinin <code>channel</code> değerini <code>sube</code> yap (<code>UPDATE ... FROM</code>).', "UPDATE o SET o.channel = 'sube'\nFROM orders o JOIN customers c ON c.customer_id = o.customer_id\nWHERE c.city = N'İstanbul' AND o.status <> 'cancelled';", 'İki tablo, iki koşul.', { check: "SELECT channel, COUNT(*) AS n FROM orders GROUP BY channel ORDER BY channel", must: [{ re: 'FROM[\\s\\S]+JOIN', msg: 'Görev JOIN ile güncellemeyi istiyor.' }], ynl: ["UPDATE o SET o.channel = 'sube' FROM orders o JOIN customers c ON c.customer_id = o.customer_id WHERE c.city = N'İstanbul';"] }),
  sq('<code>DELETE ... JOIN</code>: kategorisi <code>Kitap</code> olan ürünlerin <code>order_items</code> satırlarını sil.', "DELETE i FROM order_items i JOIN products p ON p.product_id = i.product_id WHERE p.category = N'Kitap';", 'DELETE takma_ad FROM ...', { check: 'SELECT COUNT(*) AS kalan, SUM(quantity) AS adet FROM order_items', must: [{ re: 'DELETE\\s+\\w+\\s+FROM[\\s\\S]+JOIN', msg: 'Görev DELETE takma_ad FROM ... JOIN yazımını istiyor.' }], ynl: ["DELETE i FROM order_items i JOIN products p ON p.product_id = i.product_id WHERE p.category <> N'Kitap';"] }),
  sq('Sınırlı silme: <code>web_events</code> tablosundan <code>device = \'desktop\'</code> olan satırlardan en fazla 100 tanesini sil, <code>@@ROWCOUNT</code> değerini <code>silinen</code> adıyla göster.', "DELETE TOP (100) FROM web_events WHERE device = 'desktop';\nSELECT @@ROWCOUNT AS silinen;", 'DELETE TOP (n) FROM ...', { must: [{ re: 'DELETE\\s+TOP\\s*\\(\\s*100', msg: 'Görev DELETE TOP (100) istiyor.' }], ynl: ["SELECT TOP (100) COUNT(*) AS silinen FROM web_events WHERE device = 'desktop';", "DELETE TOP (10) FROM web_events WHERE device = 'desktop';\nSELECT @@ROWCOUNT AS silinen;"] }),
  sq('Döngü: <code>bank_txns</code> içinde 2023 Mart öncesi hareketleri 2000\'erli parçalarla sil, bitince kaç tur döndüğünü <code>tur</code> adıyla göster. Son, boş dönen tur da sayılsın.', "DECLARE @n INT = 1, @tur INT = 0;\nWHILE @n > 0\nBEGIN\n  DELETE TOP (2000) FROM bank_txns WHERE txn_time < '2023-03-01';\n  SET @n = @@ROWCOUNT;\n  SET @tur = @tur + 1;\nEND;\nSELECT @tur AS tur;", 'WHILE, DELETE TOP, @@ROWCOUNT.', { must: [{ re: 'WHILE', msg: 'Görev döngü istiyor.' }, { re: 'DELETE\\s+TOP', msg: 'Görev DELETE TOP istiyor.' }], ynl: ["DELETE FROM bank_txns WHERE txn_time < '2023-03-01';\nSELECT 1 AS tur;"] }),
  sq('OUTPUT: 7 numaralı departmanın şehrini <code>Bursa</code> yap, eski ve yeni değeri aynı ifadede döndür: <code>dept_id</code>, <code>eski</code>, <code>yeni</code>.', "UPDATE departments SET city = N'Bursa'\nOUTPUT deleted.dept_id, deleted.city AS eski, inserted.city AS yeni\nWHERE dept_id = 7;", 'OUTPUT, SET ile WHERE arasına yazılır.', { must: [{ re: 'OUTPUT', msg: 'Görev OUTPUT istiyor.' }], ynl: ["SELECT dept_id, city AS eski, N'Bursa' AS yeni FROM departments WHERE dept_id = 6;"] }),
  sq('MERGE OUTPUT: <code>departments</code> tablosunu (1, <code>Satış</code>, <code>Bursa</code>) ve (60, <code>Lojistik</code>, <code>Mersin</code>) ile eşitle: eşleşende şehir güncellensin, olmayan eklensin. Yapılanı <code>@d</code> tablosuna (<code>islem</code>, <code>dept_id</code>, <code>yeni</code>) al ve <code>dept_id</code> sırasıyla seç.', "DECLARE @d TABLE (islem NVARCHAR(10), dept_id INT, yeni NVARCHAR(50));\nMERGE departments AS t\nUSING (SELECT 1 AS dept_id, N'Satış' AS name, N'Bursa' AS city UNION ALL SELECT 60, N'Lojistik', N'Mersin') AS s\n   ON t.dept_id = s.dept_id\nWHEN MATCHED THEN UPDATE SET city = s.city\nWHEN NOT MATCHED THEN INSERT (dept_id, name, city) VALUES (s.dept_id, s.name, s.city)\nOUTPUT $action, inserted.dept_id, inserted.city INTO @d;\nSELECT * FROM @d ORDER BY dept_id;", 'OUTPUT $action ... INTO @d.', { ord: true, must: [{ re: '\\$action', msg: 'Görev $action istiyor.' }], ynl: ["DECLARE @d TABLE (islem NVARCHAR(10), dept_id INT, yeni NVARCHAR(50));\nMERGE departments AS t USING (SELECT 1 AS dept_id, N'Bursa' AS city) AS s ON t.dept_id = s.dept_id WHEN MATCHED THEN UPDATE SET city = s.city OUTPUT $action, inserted.dept_id, inserted.city INTO @d;\nSELECT * FROM @d ORDER BY dept_id;"] }),
  mc('<code>UPDATE ... FROM</code> içinde bir hedef satırı üç kaynak satırıyla eşleşti. Ne olur?', ['Biri yazılır, hangisi belirsizdir', 'Üçü sırayla yazılır, en sonuncu kalır', 'Sunucu her zaman hata verip durur', 'Hedef satır üç kopyaya çoğaltılır'], 0, 'MERGE bu durumda hata verirken UPDATE ... FROM sessizce birini seçer. Bu yüzden kaynak önce tekilleştirilir.'),
  mc('Büyük silmeyi <code>DELETE TOP</code> döngüsüne bölmenin amacı nedir?', ['Kilitleri ve günlüğü kısa işlemlere bölmek', 'Silinen satırları sırayla geri getirebilmek', 'Silme sırasında indeksleri devre dışı bırakmak', 'Silinen veriyi otomatik yedeğe taşımak'], 0, 'Her tur ayrı işlemdir: başkaları tur aralarında çalışır, günlük yedeği alanı boşaltabilir.'),
  mc('<code>OUTPUT</code> ile dönen satırların sırası için hangisi doğrudur?', ['Garanti yoktur, tabloya alıp sırala', 'Her zaman birincil anahtar sırasındadır', 'INSERT, UPDATE, DELETE sırasıyla gelir', 'WHERE koşulundaki sıraya göre gelir'], 0, 'Microsoft Learn: DML ile dönen OUTPUT satırlarının sırası garanti edilmez.')
]);

/* ------------------------------------------------------------------ T-SQL: hata ileri */
ders('ts-hata-ileri', 'T-SQL (SQL Server)', 'B2', 20, 'Hata yönetimi ileri: yeniden fırlatma, XACT_STATE, XACT_ABORT, yeniden deneme',
  'CATCH bloğunda hatayı yutmamak, işlemin hâlâ geçerli olup olmadığını bilmek.',
  'throw rethrow xact_state xact_abort uncommittable 3930 retry deadlock 1205',
`<h2>Hatayı yutma, yeniden fırlat</h2>
<p>TRY/CATCH temeli için <b>Hata yönetimi</b> dersine bak. <code>CATCH</code> içinde parametresiz <code>THROW;</code> yakalanan hatayı aynı numarayla çağırana iletir. <code>THROW</code> öncesindeki satır noktalı virgülle bitmelidir.</p>
${ts(`BEGIN TRY
  BEGIN TRY
    SELECT 1 / 0;
  END TRY
  BEGIN CATCH
    PRINT N'Kayda yazıldı: ' + ERROR_MESSAGE();
    THROW;
  END CATCH;
END TRY
BEGIN CATCH
  SELECT ERROR_NUMBER() AS dista_yakalanan;
END CATCH;`)}
<h2>XACT_STATE</h2>
<table><tr><th>Değer</th><th>Anlam</th><th>Yapılabilecek</th></tr>
<tr><td>1</td><td>Açık, işlenebilir işlem</td><td>COMMIT ya da ROLLBACK</td></tr>
<tr><td>0</td><td>Açık işlem yok</td><td>Geri alınacak bir şey yok</td></tr>
<tr><td>-1</td><td>Açık ama işlenemez işlem</td><td>Okuma ve tam ROLLBACK; yazma ve COMMIT yok</td></tr></table>
<p><code>@@TRANCOUNT</code> işlem var mı der ama işlenebilir mi demez. <code>XACT_STATE</code> ise iç içe sayısını söylemez.</p>
<h2>SET XACT_ABORT ON</h2>
<p>Çalışma zamanı hatasında işlemi geri alır; <code>TRY</code> içindeyse işlem işlenemez duruma geçer ve <code>CATCH</code>'te <code>XACT_STATE() = -1</code> görülür. Uygulama zaman aşımında bile kilit bırakmak için yordamların başına konması önerilir.</p>
${ts(`SET XACT_ABORT ON;
BEGIN TRY
  BEGIN TRANSACTION;
  DELETE FROM departments WHERE dept_id = 7;
  SELECT 1 / 0;
  COMMIT TRANSACTION;
END TRY
BEGIN CATCH
  SELECT XACT_STATE() AS durum;
  IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
END CATCH;
SELECT COUNT(*) AS hukuk_duruyor_mu FROM departments WHERE dept_id = 7;`)}
<div class="note"><b>Bu motorda</b><code>XACT_STATE</code> -1'i yalnız <code>XACT_ABORT ON</code> iken üretir ve o durumda COMMIT ya da yazma Msg 3930 verir. Gerçek sunucuda bazı hatalar XACT_ABORT kapalıyken de işlemi işlenemez yapabilir. Motor ayrıca hatada bütün çalıştırmayı durdurur; gerçek sunucuda birçok hata yalnız o ifadeyi durdurur, <code>XACT_ABORT OFF</code> ise sonraki satır çalışmaya devam eder.</div>
<h2>Yeniden deneme kalıbı</h2>
<p>Deadlock kurbanı 1205 alır ve işlem geri alınmıştır; yeniden denemek güvenlidir. Learn kısa, rastgele bir bekleme öneriyor. Burada 1205 üretemeyiz (tek bağlantı), bu yüzden hatayı <code>THROW</code> ile <b>taklit ediyoruz</b>.</p>
${ts(`DECLARE @deneme INT = 0, @bitti INT = 0;
WHILE @bitti = 0 AND @deneme < 3
BEGIN
  SET @deneme = @deneme + 1;
  BEGIN TRY
    IF @deneme < 3 THROW 51205, N'Taklit: kurban seçildi', 1;
    SET @bitti = 1;
  END TRY
  BEGIN CATCH
    PRINT N'Deneme ' + CAST(@deneme AS NVARCHAR(5)) + N' başarısız';
    IF ERROR_NUMBER() <> 51205 THROW;
  END CATCH;
END;
SELECT @deneme AS deneme, @bitti AS bitti;`)}`,
[
  sq('Yeniden fırlat: bir <code>TRY</code> içinde <code>departments</code> tablosuna var olan <code>dept_id = 1</code> ile satır eklemeyi dene. <code>CATCH</code> içinde <code>ERROR_NUMBER()</code> değerini <code>etl_yukleme_log</code> tablosuna <code>batch_id</code> olarak, <code>durum</code> <code>hata</code> ile yaz. Hatayı yeniden fırlatma, önce kaydın durduğunu göstermek için seç: <code>batch_id</code>, <code>durum</code>.', "BEGIN TRY\n  INSERT INTO departments (dept_id, name, city) VALUES (1, N'x', N'y');\nEND TRY\nBEGIN CATCH\n  INSERT INTO etl_yukleme_log (batch_id, durum) VALUES (ERROR_NUMBER(), 'hata');\nEND CATCH;\nSELECT batch_id, durum FROM etl_yukleme_log WHERE durum = 'hata' AND batch_id > 100;", 'CATCH içinde ERROR_NUMBER().', { must: [{ re: 'ERROR_NUMBER', msg: 'Görev ERROR_NUMBER istiyor.' }], ynl: ["INSERT INTO etl_yukleme_log (batch_id, durum) VALUES (999, 'hata');\nSELECT batch_id, durum FROM etl_yukleme_log WHERE durum = 'hata' AND batch_id > 100;"] }),
  Object.assign(sq('Parametresiz THROW: <code>SELECT 1 / 0</code> çalıştıran <code>TRY</code>, <code>CATCH</code> içinde önce <code>@n</code> değişkenine <code>ERROR_NUMBER()</code> alsın, <code>etl_red</code> tablosuna (<code>stg_id</code> 0, <code>neden</code> <code>sifira bolme</code>, <code>batch_id</code> @n) yazsın. Hatayı yutmamak için sonra dış bir <code>TRY</code> içinde yeniden fırlatılsın ve dış <code>CATCH</code> <code>@@TRANCOUNT</code> ve <code>ERROR_NUMBER()</code> değerlerini seçsin: <code>acik</code>, <code>no</code>.', "BEGIN TRY\n  BEGIN TRY\n    SELECT 1 / 0;\n  END TRY\n  BEGIN CATCH\n    DECLARE @n INT = ERROR_NUMBER();\n    INSERT INTO etl_red (stg_id, neden, batch_id) VALUES (0, 'sifira bolme', @n);\n    THROW;\n  END CATCH;\nEND TRY\nBEGIN CATCH\n  SELECT @@TRANCOUNT AS acik, ERROR_NUMBER() AS no;\nEND CATCH;", 'İç içe TRY; içte THROW;', { must: [{ re: 'THROW\\s*;', msg: 'Görev parametresiz THROW; istiyor.' }], ynl: ["BEGIN TRY\n  SELECT 1 / 0;\nEND TRY\nBEGIN CATCH\n  SELECT @@TRANCOUNT AS acik, 50000 AS no;\nEND CATCH;"] })),
  sq('XACT_STATE: <code>SET XACT_ABORT ON</code> ile işlem aç, 7 numaralı departmanı sil, <code>THROW 50001, N\'dur\', 1;</code> ile hata fırlat. <code>CATCH</code> içinde <code>XACT_STATE()</code> değerini <code>durum</code> adıyla seç ve geri al. Son olarak 7 numaralı departman sayısını <code>kalan</code> adıyla seç.', "SET XACT_ABORT ON;\nBEGIN TRY\n  BEGIN TRANSACTION;\n  DELETE FROM departments WHERE dept_id = 7;\n  THROW 50001, N'dur', 1;\n  COMMIT TRANSACTION;\nEND TRY\nBEGIN CATCH\n  SELECT XACT_STATE() AS durum;\n  IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;\nEND CATCH;\nSELECT COUNT(*) AS kalan FROM departments WHERE dept_id = 7;", 'CATCH içinde önce oku, sonra geri al.', { must: [{ re: 'XACT_STATE', msg: 'Görev XACT_STATE istiyor.' }, { re: 'XACT_ABORT\\s+ON', msg: 'Görev SET XACT_ABORT ON istiyor.' }], ynl: ["BEGIN TRY\n  BEGIN TRANSACTION;\n  DELETE FROM departments WHERE dept_id = 7;\n  THROW 50001, N'dur', 1;\n  COMMIT TRANSACTION;\nEND TRY\nBEGIN CATCH\n  SELECT XACT_STATE() AS durum;\n  COMMIT TRANSACTION;\nEND CATCH;\nSELECT COUNT(*) AS kalan FROM departments WHERE dept_id = 7;"] }),
  sq('Yeniden deneme (taklit): en çok 4 deneme yapan döngü yaz. <code>@deneme</code> 3 olana kadar <code>THROW 51205, N\'taklit\', 1;</code> ile hata üretilsin, <code>CATCH</code> yakalasın; hata numarası 51205 değilse <code>THROW;</code> ile çıksın. Başarıda <code>@bitti = 1</code>. Sonunda <code>@deneme</code>, <code>@bitti</code> seç: <code>deneme</code>, <code>bitti</code>.', "DECLARE @deneme INT = 0, @bitti INT = 0;\nWHILE @bitti = 0 AND @deneme < 4\nBEGIN\n  SET @deneme = @deneme + 1;\n  BEGIN TRY\n    IF @deneme < 3 THROW 51205, N'taklit', 1;\n    SET @bitti = 1;\n  END TRY\n  BEGIN CATCH\n    IF ERROR_NUMBER() <> 51205 THROW;\n  END CATCH;\nEND;\nSELECT @deneme AS deneme, @bitti AS bitti;", 'WHILE içinde TRY/CATCH.', { must: [{ re: 'WHILE', msg: 'Görev döngü istiyor.' }, { re: 'BEGIN\\s+CATCH', msg: 'Görev TRY/CATCH istiyor.' }], ynl: ["DECLARE @deneme INT = 0, @bitti INT = 0;\nWHILE @bitti = 0 AND @deneme < 4\nBEGIN\n  SET @deneme = @deneme + 1;\n  SET @bitti = 1;\nEND;\nSELECT @deneme AS deneme, @bitti AS bitti;"] }),
  mc('<code>XACT_STATE()</code> -1 dönüyor. Hangisi yapılabilir?', ['Okuma ve tam ROLLBACK', 'COMMIT ve sonra yeni yazma', 'Kayıt noktasına geri dönme', 'Yazmaya devam edip sonra COMMIT'], 0, 'İşlenemez işlemde yazma, COMMIT ve kayıt noktasına dönüş yoktur. Tam geri alınca oturum yeniden yazabilir.'),
  mc('<code>@@TRANCOUNT</code> 1 ise bundan ne çıkar?', ['İşlem açık; işlenebilir olduğu bilinmez', 'İşlem açık ve kesinlikle işlenebilirdir', 'İşlem geri alınmıştır, yeni başlatılmalı', 'Yalnız okuma işlemi yapılabilir demektir'], 0, 'İşlenebilirliği XACT_STATE söyler; iç içe sayıyı da @@TRANCOUNT.'),
  mc('Deadlock kurbanı bir işlem 1205 aldı. Uygulama ne yapmalı?', ['Kısa rastgele bekleyip işlemi baştan denemeli', 'İşlemin kalan satırlarını çalıştırmaya devam etmeli', 'Sunucuyu yeniden başlatıp kilitleri temizlemeli', 'Hatayı kaydedip işlemi başarılı saymalı'], 0, 'Kurbanın işlemi zaten geri alınmıştır. Microsoft Learn rastgele kısa bekleme ve yeniden gönderme önerir.')
]);

/* ------------------------------------------------------------------ T-SQL: nesne özellikleri */
ders('ts-nesne-ileri', 'T-SQL (SQL Server)', 'B2', 25, 'Çok ifadeli tablo işlevi, güncellenebilir view, CHECK OPTION, INSTEAD OF',
  'View üzerinden yazmanın koşulları, filtre dışına çıkan satırı engellemek ve yazılamayan view\'i yazılabilir yapmak.',
  'multi statement table valued function updatable view with check option instead of trigger 4405 550',
`<h2>Çok ifadeli tablo işlevi</h2>
<p>Satır içi işlev (<b>Fonksiyonlar</b> dersi) tek SELECT'tir ve sorguya açılır. Çok ifadeli işlev bir tablo değişkeni doldurur, birden çok adım içerebilir. Karşılığında iyileştirici içine bakamaz; satır tahmini zayıftır. Tek SELECT'le yazılabiliyorsa satır içi işlev yeğlenir.</p>
${ts(`CREATE FUNCTION dbo.fn_UrunSeviye (@kategori NVARCHAR(50))
RETURNS @t TABLE (urun INT, fiyat DECIMAL(12, 2), seviye NVARCHAR(10))
AS
BEGIN
  INSERT INTO @t (urun, fiyat, seviye)
  SELECT product_id, price, N'normal' FROM products WHERE category = @kategori;
  UPDATE @t SET seviye = N'yüksek' WHERE fiyat > (SELECT AVG(fiyat) FROM @t);
  RETURN;
END;
GO
SELECT seviye, COUNT(*) AS adet FROM dbo.fn_UrunSeviye(N'Kitap') GROUP BY seviye;`)}
<div class="note"><b>Bu motorda</b>İşlev argümanı sabit ya da değişken olmalı. Gerçek sunucuda <code>CROSS APPLY dbo.fn(sutun)</code> de çalışır, burada çalışmaz. İşlev içinde yan etki yasağının tamamı denetlenmez; yalnız istemciye SELECT döndürmek reddedilir.</div>
<h2>View üzerinden yazmak</h2>
<p>Learn'e göre koşullar: değişiklik tek taban tablonun sütunlarına dokunmalı; sütunlar doğrudan olmalı (toplama ya da hesaplama değil); <code>GROUP BY</code>, <code>HAVING</code>, <code>DISTINCT</code> etkilememeli.</p>
${ts(`CREATE VIEW dbo.v_kitap AS
SELECT product_id, name, price, category, cost FROM products WHERE category = N'Kitap';
GO
UPDATE dbo.v_kitap SET price = price * 1.1 WHERE product_id IN (SELECT TOP (2) product_id FROM dbo.v_kitap ORDER BY product_id);
SELECT @@ROWCOUNT AS guncellenen;`)}
<h2>Filtre dışına kaçan satır</h2>
<p>View yalnız Kitap gösteriyor ama üzerinden kategori değiştirilebilir ya da başka kategori eklenebilir; satır bir daha görünmez. <code>WITH CHECK OPTION</code> bunu engeller: view üzerinden yapılan değişiklikten sonra satır view'de görünmeye devam etmeli. Doğrudan tabloya yazmayı kapsamaz.</p>
${hata(`CREATE VIEW dbo.v_kitap2 AS
SELECT product_id, name, price, category, cost FROM products WHERE category = N'Kitap'
WITH CHECK OPTION;
GO
INSERT INTO dbo.v_kitap2 (product_id, name, price, category, cost) VALUES (900, N'Fare', 10, N'Elektronik', 5);`)}
<h2>Yazılamayan view: INSTEAD OF</h2>
<p>Birleştirme içeren view'e doğrudan yazılamaz (Msg 4405). <code>INSTEAD OF</code> tetikleyici yazma isteğini yakalar, ne yapılacağına sen karar verirsin. <code>inserted</code> ve <code>deleted</code> burada da vardır.</p>
${ts(`CREATE VIEW dbo.v_siparis AS
SELECT o.order_id, o.status, c.city FROM orders o JOIN customers c ON c.customer_id = o.customer_id;
GO
CREATE TRIGGER trg_v_siparis ON dbo.v_siparis INSTEAD OF UPDATE AS
BEGIN
  UPDATE orders SET status = (SELECT status FROM inserted) WHERE order_id = (SELECT order_id FROM inserted);
END;
GO
UPDATE dbo.v_siparis SET status = 'teslim' WHERE order_id = 1;
SELECT order_id, status FROM orders WHERE order_id = 1;`)}
<div class="warn"><b>Burada satır satır, sunucuda ifade başına</b>Bu motorda tetikleyici her satır için bir kez çalışır; bu yüzden örnekteki tekil alt sorgu geçer. Gerçek SQL Server'da tetikleyici <b>ifade başına</b> bir kez çalışır ve <code>inserted</code> bütün satırları içerir; çok satırlı güncellemede bu alt sorgu hata verir. Gerçek kodda <code>JOIN inserted</code> yaz. Motor ayrıca INSTEAD OF'u yalnız view üzerinde kabul eder ve gövdede IF gibi akış komutu çalıştırmaz.</div>`,
[
  sq('Çok ifadeli işlev: <code>dbo.fn_SehirOzet(@en_az INT)</code> şehir başına müşteri sayısını tablo olarak döndürsün (<code>sehir</code>, <code>adet</code>, <code>grup</code>). Önce satırları doldur (<code>grup</code> <code>kucuk</code>), sonra <code>adet &gt;= @en_az</code> olanların grubunu <code>buyuk</code> yap. <code>SELECT grup, COUNT(*) AS sehir_sayisi FROM dbo.fn_SehirOzet(30) GROUP BY grup ORDER BY grup</code> çalıştır.', "CREATE FUNCTION dbo.fn_SehirOzet (@en_az INT)\nRETURNS @t TABLE (sehir NVARCHAR(50), adet INT, grup NVARCHAR(10))\nAS\nBEGIN\n  INSERT INTO @t (sehir, adet, grup) SELECT city, COUNT(*), N'kucuk' FROM customers GROUP BY city;\n  UPDATE @t SET grup = N'buyuk' WHERE adet >= @en_az;\n  RETURN;\nEND;\nGO\nSELECT grup, COUNT(*) AS sehir_sayisi FROM dbo.fn_SehirOzet(30) GROUP BY grup ORDER BY grup;", 'RETURNS @t TABLE (...) AS BEGIN ... RETURN; END', { ord: true, must: [{ re: 'RETURNS\\s+@\\w+\\s+TABLE', msg: 'Görev çok ifadeli tablo işlevi istiyor.' }], ynl: ["SELECT CASE WHEN COUNT(*) >= 30 THEN 'buyuk' ELSE 'kucuk' END AS grup, COUNT(*) AS sehir_sayisi FROM customers GROUP BY city ORDER BY grup;"] }),
  sq('Güncellenebilir view: <code>dbo.v_ankara</code> yalnız Ankara\'daki departmanları göstersin (<code>dept_id</code>, <code>name</code>, <code>city</code>). View üzerinden Ankara\'daki departmanların adının sonuna <code>N\' (AN)\'</code> ekle.', "CREATE VIEW dbo.v_ankara AS SELECT dept_id, name, city FROM departments WHERE city = N'Ankara';\nGO\nUPDATE dbo.v_ankara SET name = name + N' (AN)';", 'Tek tablo, hesaplama yok: doğrudan yazılabilir.', { check: 'SELECT dept_id, name FROM departments ORDER BY dept_id', must: [{ re: 'UPDATE\\s+(dbo\\s*\\.\\s*)?v_ankara', msg: 'Görev view üzerinden güncellemeyi istiyor.' }], ynl: ["UPDATE departments SET name = name + N' (AN)';"] }),
  sq('CHECK OPTION: <code>dbo.v_pahali</code> view fiyatı 1000 üstü ürünleri göstersin (<code>product_id</code>, <code>price</code>) ve <code>WITH CHECK OPTION</code> taşısın. <code>TRY</code> içinde view üzerinden 1 numaralı olmayan fiyatı 1000 üstü ilk ürünün fiyatını 5 yapmayı dene; <code>CATCH</code> içinde <code>ERROR_NUMBER()</code> değerini <code>hata</code> adıyla seç.', "CREATE VIEW dbo.v_pahali AS SELECT product_id, price FROM products WHERE price > 1000 WITH CHECK OPTION;\nGO\nDECLARE @ilk INT = (SELECT MIN(product_id) FROM dbo.v_pahali);\nBEGIN TRY\n  UPDATE dbo.v_pahali SET price = 5 WHERE product_id = @ilk;\nEND TRY\nBEGIN CATCH\n  SELECT ERROR_NUMBER() AS hata;\nEND CATCH;", 'Satır filtreden çıkacağı için reddedilir.', { must: [{ re: 'WITH\\s+CHECK\\s+OPTION', msg: 'Görev WITH CHECK OPTION istiyor.' }], ynl: ["CREATE VIEW dbo.v_pahali AS SELECT product_id, price FROM products WHERE price > 1000;\nGO\nDECLARE @ilk INT = (SELECT MIN(product_id) FROM dbo.v_pahali);\nBEGIN TRY\n  UPDATE dbo.v_pahali SET price = 5 WHERE product_id = @ilk;\n  SELECT 0 AS hata;\nEND TRY\nBEGIN CATCH\n  SELECT ERROR_NUMBER() AS hata;\nEND CATCH;"] }),
  sq('INSTEAD OF: <code>dbo.v_calisan</code> view çalışan adını departman adıyla birleştirsin (<code>emp_id</code>, <code>first_name</code>, <code>dept_name</code>). Bu view\'e <code>INSTEAD OF DELETE</code> tetikleyici yaz: <code>employees</code> satırını silmesin, <code>salary</code> değerini 0 yapsın. Sonra view\'den <code>emp_id = 1</code> satırını sil.', "CREATE VIEW dbo.v_calisan AS SELECT e.emp_id, e.first_name, d.name AS dept_name FROM employees e JOIN departments d ON d.dept_id = e.dept_id;\nGO\nCREATE TRIGGER trg_v_calisan ON dbo.v_calisan INSTEAD OF DELETE AS\nBEGIN\n  UPDATE employees SET salary = 0 WHERE emp_id IN (SELECT emp_id FROM deleted);\nEND;\nGO\nDELETE FROM dbo.v_calisan WHERE emp_id = 1;", 'deleted ile eşleşen satırı güncelle.', { check: 'SELECT emp_id, salary FROM employees WHERE emp_id IN (1, 2) ORDER BY emp_id', must: [{ re: 'INSTEAD\\s+OF\\s+DELETE', msg: 'Görev INSTEAD OF DELETE istiyor.' }], ynl: ["UPDATE employees SET salary = 0 WHERE emp_id IN (1, 2);"] }),
  mc('Satır içi işlev yazılabiliyorken çok ifadeli işlevin bedeli nedir?', ['İyileştirici içine bakamaz', 'Çok ifadeli işlev parametre kabul edemez', 'Sonuç kümesi en fazla bin satır olabilir', 'Bir sorguda en çok bir kez kullanılabilir'], 0, 'Satır içi işlev sorguya açılır, çok ifadeli işlev ara tablo doldurur.'),
  mc('<code>WITH CHECK OPTION</code> olan view\'in taban tablosuna doğrudan yazılırsa ne olur?', ['Denetlenmez; seçenek yalnız view için', 'View otomatik silinir ve yazma başarılı olur', 'Aynı Msg 550 hatası doğrudan yazmada da alınır', 'Tablo salt okunur duruma geçer, yazılamaz'], 0, 'Learn: CHECK OPTION yalnız view üzerinden yapılan değişiklikler için geçerlidir.'),
  mc('Hangi view doğrudan güncellenemez?', ['GROUP BY ile toplayan view', 'Tek tablodan sütun seçen view', 'WHERE ile süzen tek tablolu view', 'Sütuna takma ad veren tek tablolu view'], 0, 'Toplanmış değer tek satıra karşılık gelmez.'),
  mc('Gerçek SQL Server\'da <code>INSTEAD OF UPDATE</code> tetikleyicisi 10 satırı değiştiren ifadede kaç kez çalışır?', ['Bir kez, 10 satırla', 'On kez; her satır için bir kez', 'Hiç çalışmaz; view güncellenemez', 'İki kez; biri önce, biri sonra'], 0, 'SQL Server tetikleyicileri ifade başınadır. Bu motor SQLite üzerinde satır başına çalışır: farkı metin uyarısı olarak hatırla.')
]);

/* ------------------------------------------------------------------ Var olan dersler: gerçek davranış */
{ const l = LS.find(x => x.id === 'kisitlar');
  l.body += `<h2>Yabancı anahtarı gerçekten denemek</h2>
<div class="warn"><b>Bu motorda</b>Yabancı anahtar, <b>yalnız aynı çalıştırmada <code>FOREIGN KEY</code> ya da <code>REFERENCES</code> içeren bir tablo oluşturursan</b> denetlenir. Yoksa denetim kapalıdır: hazır veri setlerinde <code>DELETE FROM customers</code> hatasız geçer ve yetim satır bırakır; alıştırmalar bu yüzden bozulmasın diye böyledir. Gerçek sunucuda aynı silme reddedilir. MySQL satır içi <code>REFERENCES</code> yazımını yok sayar, orada tablo düzeyinde <code>FOREIGN KEY</code> yazılır; bu yüzden kutular MySQL'de kapalı.</div>
<pre class="code" data-na="bq mysql" data-err>CREATE TABLE siparis (siparis_id INTEGER PRIMARY KEY);
CREATE TABLE satir (satir_id INTEGER PRIMARY KEY, siparis_id INTEGER NOT NULL REFERENCES siparis (siparis_id));
INSERT INTO siparis VALUES (1);
INSERT INTO satir VALUES (10, 1);
-- Bağlı satır varken ana satır silinemez
DELETE FROM siparis WHERE siparis_id = 1;</pre>
<pre class="code" data-na="bq mysql">CREATE TABLE siparis (siparis_id INTEGER PRIMARY KEY);
CREATE TABLE satir (satir_id INTEGER PRIMARY KEY, siparis_id INTEGER NOT NULL REFERENCES siparis (siparis_id) ON DELETE CASCADE);
INSERT INTO siparis VALUES (1);
INSERT INTO satir VALUES (10, 1);
INSERT INTO satir VALUES (11, 1);
DELETE FROM siparis WHERE siparis_id = 1;
SELECT COUNT(*) AS kalan_satir FROM satir;</pre>`;
  const G = { dl: ['sqlite', 'tsql', 'pg', 'oracle'] };
  l.ex.push(
    sqg('ON DELETE CASCADE: <code>siparis</code> (<code>siparis_id</code> birincil anahtar) ve <code>satir</code> (<code>satir_id</code> birincil anahtar, <code>siparis_id</code> yabancı anahtar, silinince satırlar da gitsin) tablolarını kur. <code>siparis</code>\'e 1 ve 2, <code>satir</code>\'a (10,1), (11,1), (12,2) ekle. 1 numaralı siparişi sil.', "CREATE TABLE siparis (siparis_id INTEGER PRIMARY KEY);\nCREATE TABLE satir (satir_id INTEGER PRIMARY KEY, siparis_id INTEGER REFERENCES siparis (siparis_id) ON DELETE CASCADE);\nINSERT INTO siparis VALUES (1);\nINSERT INTO siparis VALUES (2);\nINSERT INTO satir VALUES (10, 1);\nINSERT INTO satir VALUES (11, 1);\nINSERT INTO satir VALUES (12, 2);\nDELETE FROM siparis WHERE siparis_id = 1;", 'REFERENCES ... ON DELETE CASCADE.', Object.assign({ check: 'SELECT satir_id, siparis_id FROM satir ORDER BY satir_id', ynl: ["CREATE TABLE siparis (siparis_id INTEGER PRIMARY KEY);\nCREATE TABLE satir (satir_id INTEGER PRIMARY KEY, siparis_id INTEGER REFERENCES siparis (siparis_id));\nINSERT INTO siparis VALUES (1);\nINSERT INTO siparis VALUES (2);\nINSERT INTO satir VALUES (10, 1);\nINSERT INTO satir VALUES (11, 1);\nINSERT INTO satir VALUES (12, 2);\nDELETE FROM siparis WHERE siparis_id = 1;"] }, G)),
    sqg('ON DELETE SET NULL: <code>ekip</code> (<code>ekip_id</code>) ve <code>uye</code> (<code>uye_id</code>, <code>ekip_id</code> yabancı anahtar, ekip silinince boşalsın) kur. <code>ekip</code>\'e 1, <code>uye</code>\'ye (5,1) ve (6,1) ekle, 1 numaralı ekibi sil.', "CREATE TABLE ekip (ekip_id INTEGER PRIMARY KEY);\nCREATE TABLE uye (uye_id INTEGER PRIMARY KEY, ekip_id INTEGER REFERENCES ekip (ekip_id) ON DELETE SET NULL);\nINSERT INTO ekip VALUES (1);\nINSERT INTO uye VALUES (5, 1);\nINSERT INTO uye VALUES (6, 1);\nDELETE FROM ekip WHERE ekip_id = 1;", 'ON DELETE SET NULL.', Object.assign({ check: 'SELECT uye_id, ekip_id FROM uye ORDER BY uye_id', ynl: ["CREATE TABLE ekip (ekip_id INTEGER PRIMARY KEY);\nCREATE TABLE uye (uye_id INTEGER PRIMARY KEY, ekip_id INTEGER REFERENCES ekip (ekip_id) ON DELETE CASCADE);\nINSERT INTO ekip VALUES (1);\nINSERT INTO uye VALUES (5, 1);\nINSERT INTO uye VALUES (6, 1);\nDELETE FROM ekip WHERE ekip_id = 1;"] }, G))
  );
}

/* ------------------------------------------------------------------ Pratik: yordam, işlev, tetikleyici */
{ const T = window.SQLP_PRACTICE_TOPICS; T.nesne = 'Yordam, işlev, tetikleyici';
  const PR = window.SQLP_PRACTICE; let n = 0;
  const p = (L, d, title, q, sol, hint, x) => { n++; PR.push(Object.assign({ id: 'sh' + String(n).padStart(2, '0'), L, t: 'nesne', d, title, q: '<p>' + q + '</p>', sol, hint, type: 'sql', base: 'tsql', dl: ['tsql'] }, x || {})); };
  p('orta', 1, 'İsteğe bağlı filtre', '<code>dbo.usp_Musteri</code>: <code>@sehir NVARCHAR(50) = NULL</code> alsın, şehir verilmişse ona, verilmemişse hepsine ait müşteri sayısını <code>adet</code> adıyla döndürsün. <code>EXEC dbo.usp_Musteri;</code> ve <code>EXEC dbo.usp_Musteri @sehir = N\'İzmir\';</code>', "CREATE PROCEDURE dbo.usp_Musteri @sehir NVARCHAR(50) = NULL AS\nBEGIN\n  SELECT COUNT(*) AS adet FROM customers WHERE @sehir IS NULL OR city = @sehir;\nEND;\nGO\nEXEC dbo.usp_Musteri;\nEXEC dbo.usp_Musteri @sehir = N'İzmir';", 'NULL varsayılan.', { ynl: ["CREATE PROCEDURE dbo.usp_Musteri @sehir NVARCHAR(50) = NULL AS\nBEGIN\n  SELECT COUNT(*) AS adet FROM customers;\nEND;\nGO\nEXEC dbo.usp_Musteri;\nEXEC dbo.usp_Musteri @sehir = N'İzmir';"] });
  p('orta', 2, 'OUTPUT parametresi', '<code>dbo.usp_SubeOzet</code>: <code>@kategori NVARCHAR(50)</code> alsın, ürün sayısını <code>@adet OUTPUT</code> ile döndürsün. <code>Kitap</code> için çağır, sonucu <code>adet</code> adıyla seç.', "CREATE PROCEDURE dbo.usp_SubeOzet @kategori NVARCHAR(50), @adet INT OUTPUT AS\nBEGIN\n  SELECT @adet = COUNT(*) FROM products WHERE category = @kategori;\nEND;\nGO\nDECLARE @a INT;\nEXEC dbo.usp_SubeOzet @kategori = N'Kitap', @adet = @a OUTPUT;\nSELECT @a AS adet;", 'Çağrıda da OUTPUT yaz.', { must: [{ re: 'OUTPUT', msg: 'Görev OUTPUT parametresi istiyor.' }], ynl: ["DECLARE @a INT = 8;\nSELECT @a AS adet;"] });
  p('ileri', 2, 'Yordamda işlem', '<code>dbo.usp_Transfer</code>: <code>@kaynak INT</code>, <code>@hedef INT</code>, <code>@adet INT</code> alsın. <code>products</code> stoğunu kaynaktan düşüp hedefe eklesin; kaynak stok yetmezse <code>THROW 50100, N\'stok yok\', 1;</code>. Hata olursa geri alsın, <code>ERROR_NUMBER()</code> seçsin: <code>hata</code>. <code>EXEC dbo.usp_Transfer 1, 2, 100000;</code>', "CREATE PROCEDURE dbo.usp_Transfer @kaynak INT, @hedef INT, @adet INT AS\nBEGIN\n  BEGIN TRY\n    BEGIN TRANSACTION;\n    IF (SELECT stock FROM products WHERE product_id = @kaynak) < @adet THROW 50100, N'stok yok', 1;\n    UPDATE products SET stock = stock - @adet WHERE product_id = @kaynak;\n    UPDATE products SET stock = stock + @adet WHERE product_id = @hedef;\n    COMMIT TRANSACTION;\n  END TRY\n  BEGIN CATCH\n    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;\n    SELECT ERROR_NUMBER() AS hata;\n  END CATCH;\nEND;\nGO\nEXEC dbo.usp_Transfer 1, 2, 100000;", 'TRY içinde işlem, CATCH içinde geri al.', { must: [{ re: 'ROLLBACK', msg: 'Görev geri almayı istiyor.' }], ynl: ["SELECT 50000 AS hata;"] });
  p('ileri', 3, 'Çağrı zinciri ve tablo', '<code>dbo.usp_Aday</code> stoğu 10\'dan az ürünleri (<code>product_id</code>, <code>stock</code>) döndürsün. <code>dbo.usp_Liste</code>, geçici <code>#a</code> tablosuna <code>INSERT ... EXEC</code> ile alıp adayların sayısını <code>adet</code> adıyla seçsin. <code>EXEC dbo.usp_Liste;</code>', "CREATE PROCEDURE dbo.usp_Aday AS BEGIN SELECT product_id, stock FROM products WHERE stock < 10; END;\nGO\nCREATE PROCEDURE dbo.usp_Liste AS\nBEGIN\n  CREATE TABLE #a (product_id INT, stock INT);\n  INSERT INTO #a EXEC dbo.usp_Aday;\n  SELECT COUNT(*) AS adet FROM #a;\nEND;\nGO\nEXEC dbo.usp_Liste;", 'INSERT #a EXEC.', { must: [{ re: 'INSERT\\s+(INTO\\s+)?#a\\s+EXEC', msg: 'Görev INSERT ... EXEC istiyor.' }], ynl: ["SELECT COUNT(*) AS adet FROM products WHERE stock <= 10;"] });
  p('orta', 2, 'Skaler işlev', '<code>dbo.fn_Kdv(@tutar DECIMAL(12,2))</code>: tutarın %20 eklenmiş hâlini döndürsün. Fiyata göre ilk 3 üründe <code>name</code>, <code>kdvli</code> (fiyat azalan, sonra ad).', "CREATE FUNCTION dbo.fn_Kdv (@tutar DECIMAL(12, 2)) RETURNS DECIMAL(12, 2) AS\nBEGIN\n  RETURN @tutar * 1.20;\nEND;\nGO\nSELECT TOP (3) name, dbo.fn_Kdv(price) AS kdvli FROM products ORDER BY price DESC, name;", 'RETURNS tip AS BEGIN RETURN ... END', { ord: true, must: [{ re: 'CREATE\\s+FUNCTION', msg: 'Görev işlev yazmanı istiyor.' }], ynl: ["SELECT TOP (3) name, price * 1.20 AS kdvli FROM products ORDER BY price, name;"] });
  p('ileri', 2, 'Tablo işlevi', '<code>dbo.fn_Satis(@yil INT)</code> satır içi tablo işlevi: o yılın sipariş sayısını şehir başına döndürsün (<code>city</code>, <code>adet</code>). 2024 için çok sipariş alan ilk 3 şehir (adet azalan, sonra şehir).', "CREATE FUNCTION dbo.fn_Satis (@yil INT) RETURNS TABLE AS RETURN (\n  SELECT c.city, COUNT(*) AS adet FROM orders o JOIN customers c ON c.customer_id = o.customer_id WHERE YEAR(o.order_date) = @yil GROUP BY c.city\n);\nGO\nSELECT TOP (3) city, adet FROM dbo.fn_Satis(2024) ORDER BY adet DESC, city;", 'RETURNS TABLE AS RETURN (...)', { ord: true, must: [{ re: 'RETURNS\\s+TABLE', msg: 'Görev satır içi tablo işlevi istiyor.' }], ynl: ["SELECT TOP (3) c.city, COUNT(*) AS adet FROM orders o JOIN customers c ON c.customer_id = o.customer_id GROUP BY c.city ORDER BY adet DESC, c.city;"] });
  p('orta', 2, 'Denetim tetikleyicisi', '<code>fiyat_iz(product_id INT, eski DECIMAL(12,2), yeni DECIMAL(12,2))</code> tablosunu kur. <code>products</code> fiyatı değişince satır yazan <code>trg_fiyat_iz</code> yaz. Kitap kategorisinin fiyatını %10 artır.', "CREATE TABLE fiyat_iz (product_id INT, eski DECIMAL(12, 2), yeni DECIMAL(12, 2));\nGO\nCREATE TRIGGER trg_fiyat_iz ON products AFTER UPDATE AS\nBEGIN\n  INSERT INTO fiyat_iz (product_id, eski, yeni) SELECT d.product_id, d.price, i.price FROM deleted d JOIN inserted i ON i.product_id = d.product_id WHERE d.price <> i.price;\nEND;\nGO\nUPDATE products SET price = price * 1.10 WHERE category = N'Kitap';", 'deleted ile inserted arasında JOIN.', { check: 'SELECT COUNT(*) AS n, ROUND(SUM(yeni - eski), 2) AS fark FROM fiyat_iz', must: [{ re: 'AFTER\\s+UPDATE', msg: 'Görev AFTER UPDATE tetikleyici istiyor.' }], ynl: ["CREATE TABLE fiyat_iz (product_id INT, eski DECIMAL(12, 2), yeni DECIMAL(12, 2));\nGO\nUPDATE products SET price = price * 1.10 WHERE category = N'Kitap';"] });
  p('ileri', 3, 'Yetim satır engeli', '<code>dept_gecmis(dept_id INT, name NVARCHAR(50))</code> tablosunu kur. <code>departments</code> satırı silinince bu tabloya eski hâlini yazan tetikleyici ekle. 1 satırdan çok silindiğinde de doğru çalışsın. 6 ve 7 numaralı departmanları tek ifadeyle sil.', "CREATE TABLE dept_gecmis (dept_id INT, name NVARCHAR(50));\nGO\nCREATE TRIGGER trg_dept_gecmis ON departments AFTER DELETE AS\nBEGIN\n  INSERT INTO dept_gecmis (dept_id, name) SELECT dept_id, name FROM deleted;\nEND;\nGO\nDELETE FROM departments WHERE dept_id IN (6, 7);", 'deleted tablosundan küme olarak yaz.', { check: 'SELECT dept_id, name FROM dept_gecmis ORDER BY dept_id', must: [{ re: 'AFTER\\s+DELETE', msg: 'Görev AFTER DELETE tetikleyici istiyor.' }], ynl: ["CREATE TABLE dept_gecmis (dept_id INT, name NVARCHAR(50));\nGO\nINSERT INTO dept_gecmis (dept_id, name) SELECT dept_id, name FROM departments WHERE dept_id = 6;\nDELETE FROM departments WHERE dept_id IN (6, 7);"] });
}
})();
