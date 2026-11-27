# Kesit SQL: derleme ve test

Bu dal (`kaynak`), yayındaki sitenin (`main` dalı) bütün dosyalarını ve bunlara ek olarak sitenin üretiminde ve denetiminde kullanılan araçları içerir. GitHub Pages `main` dalından yayınlanır. Bu dal yayınlanmaz.

## Klasörler
| Yer | İçerik |
|---|---|
| Kök | Sitenin kendisi. Derleme adımı yoktur; dosyalar olduğu gibi sunulur. |
| `index.html` | Uygulama: arayüz, yönlendirme, ilerleme kaydı. Betikleri sırayla yükler. |
| `db.js`, `hv.js`, `lk.js`, `ik.js`, `bk.js`, `ops.js`, `sis.js` | Veri setleri: e-ticaret ve banka, havayolu, yemek teslimatı, İK, bisiklet paylaşımı. `ops.js` kurgusal operasyon günlüğüdür (`ops_` tabloları), `sis.js` sistem görünümü kopyaları ve ETL senaryosudur (`sys_`, `msdb_`, `etl_`); ikisi yalnız bu uygulamada vardır, kendi tohumlu üretecini kullanır. |
| `dialect.js` | SQL Server, PostgreSQL, MySQL, Oracle ve BigQuery yazımını SQLite'a çeviren katman. |
| `c1.js` … `c44.js`, `cx.js` | Dersler, öğrenme yolları, pratik görevleri, sınavlar. Sonra yüklenen dosya öncekileri yerinde değiştirebilir. `c35.js` son düzeltme katmanıdır: yol sırası, seviye testi, yöntem kuralları, yeni dersler. `c36.js` BT İş Analisti yolu ve onun on bir dersidir; metindeki sayılar `SQLP_BA_SAYI` nesnesinden gelir, `ba_sayilar.js` denetler. `c37.js` Sorgu Optimizasyonu dersleri, `c38.js` mevcut performans derslerinin genişletilmesi, yeni bitirme projeleri (`opt-proje`, `bv-proje`, `ai-proje`), `op*` pratik görevleri, sözlük ve yol bağlantılarıdır. `c39.js` SQL Server Operasyon ve Güvenlik yolu (`ops-*` dersleri, `sg*` pratik görevleri). |
| `plan-ciktilari.js` | Derslerdeki PostgreSQL plan çıktıları. Üretilen dosya: `araclar/denetim/opt_cikti.mjs` PGlite ile çalıştırır, sorgular `opt_sorgular.json` içinde. Elle düzenlenmez. |
| `ipuclari.js` | Alıştırma ipuçları. `araclar/denetim/ipucu_uret.js` üretir; elle yazılanlar `araclar/denetim/ipucu_elle.json` içinde. |
| `bilinen-sinirlar.js` | Veri setleri sayfasındaki “Bilerek bırakılanlar ve bilinen sınırlamalar” metinleri. |
| `arena-data.js` | SQL Arena: meydan okumalar, dedektif vakaları, tahmin, bulmaca. |
| `belge.js` | Tamamlama belgesi. |
| `config.js` | Yayın ayarları: yazar, adresler, Giscus, GoatCounter, geri bildirim formu. |
| `sw.js` | Service worker. Kurulumda çekirdek dosyaları önbelleğe alır (betikler `index.html`'den, yazı tipleri `fonts.css`'ten okunur; veritabanı adı `BASE` sabitinde, `make_base.js` günceller). Önbellek sürümü `CACHE` sabitinde; sürüm değişince eski `kesit-sql-*` önbellekleri silinir. |
| `base-<özet>.b64.txt` | Önceden kurulmuş veritabanı (gzip + base64). Veri dosyalarından üretilir, elle düzenlenmez. |
| `vendor/` | sql.js (asm sürümü) ve yazı tipleri. Siteye gömülüdür. |
| `araclar/denetim/` | Veritabanı üretimi ve otomatik denetimler (Node). |
| `araclar/denetim/qa/` | Tarayıcıda kullanıcı akışı testleri (Playwright). |
| `araclar/denetim/sonuclar/` | Son temiz denetimlerin çıktısı. Yeni çalıştırmalarla karşılaştırmak içindir. |
| `araclar/vendor-kaynak/` | `vendor/` klasörünün hangi npm paketlerinden alındığı. |
| `araclar/uretim-notlari/` | İçerik üretirken kullanılan görev notları ve ara dosyalar. Arşiv amaçlıdır; çalıştırılmaz. |

## Gereksinimler
- Node.js 18 veya üstü (son denetim 22 ile çalıştırıldı).
- Tarayıcı testleri için Playwright ve Chromium (son denetimde Playwright 1.63).
- Yerel sunucu için Python 3 ya da başka bir statik sunucu.

```bash
cd araclar/denetim
npm install                        # sql.js ve @electric-sql/pglite
npm install --no-save playwright   # yalnızca tarayıcı testleri için
npx playwright install chromium
```

## Yollar
Betikler depo kökünü kendi konumlarından bulur (`araclar/denetim/yol.js`). İstersen ortam değişkenleriyle değiştir:
- `KESIT_KOK`: site dosyalarının klasörü. Varsayılan: depo kökü.
- `KESIT_CIKTI`: ekran görüntüleri ve belge çıktıları. Varsayılan: `araclar/denetim/cikti/`.

Bütün komutlar `araclar/denetim` klasöründen çalıştırılır.

## Derleme
### Veritabanını yeniden üret
Bir veri dosyasını (`db.js`, `hv.js`, `lk.js`, `ik.js`, `bk.js`, `ops.js`, `sis.js`) ya da tablo kuran bir içerik dosyasını değiştirdiysen bu adım gerekir:
```bash
node make_base.js
```
- Kökteki eski `base-*.b64.txt` dosyasını siler ve veri dosyalarının özetiyle adlandırılmış yenisini yazar.
- Denetimler için `base.sqlite` ve `base.hash` dosyalarını da yazar.
- Yaklaşık 40 saniye sürer.
- Uygulama doğru dosyayı özetten kendisi bulur; dosya adını hiçbir yerde elle değiştirmen gerekmez.
- Veri değişmediyse aynı adla, aynı içerikte dosya çıkar.

### Simgeler ve önizleme görseli
```bash
python3 -m http.server 8765 --directory ../..   # ayrı bir terminalde, kökten sunar
node icons.js
```
`favicon.svg` dosyasından `icon-192.png`, `icon-512.png`, `icon-512-maskable.png`, `apple-touch-icon.png` ve `og.png` dosyalarını üretir.

### vendor/
- `vendor/sql-asm.js`: `sql.js` paketinin `dist/sql-asm.js` dosyası.
- `vendor/fonts/*.woff2`: `@fontsource` paketlerinden alınmıştır. Paket sürümleri `araclar/vendor-kaynak/package-lock.json` dosyasında.
- `vendor/fonts.css`: elle yazılmıştır.

Güncellemek için paketleri kur ve aynı adlı dosyaların üzerine kopyala.

### Ekran görüntüleri (README)
Sunucu çalışırken çalıştır:
```bash
node shots.js ../../ekran
```

### Yeni içerik dosyası eklersen
1. Dosyayı `index.html` içindeki betik listesine ekle.
2. Aynı sırayla `araclar/denetim/load.js` içindeki listeye de ekle. Bunu yapmazsan denetimler yeni dosyayı görmez.

## Testler
### 1. Alıştırma denetimi (asıl test)
```bash
node run.js
```
- Her dersin her SQL alıştırmasını, izin verilen her SQL türünde çalıştırır.
- Örnek çözümün hatasız çalıştığını, beklenen sonucu verdiğini ve görevin yöntem kurallarını (`must`, `mustNot`) geçtiğini denetler.
- Sonucu `sql_audit.json` dosyasına yazar.
- Son temiz sonuç: `calistirilan 9800`, hata yok.
- Altındaki `orderByVarOrdYok` ve `ordAmaOrderByYok` satırları sıralama uyarısıdır, hata değildir (`sonuclar/run.txt`).

Daraltmak için:
```bash
FILTER='^ik-' node run.js        # ders kimliği düzenli ifadesi
SOLF='PIVOT' node run.js         # çözüm metninde geçen ifade
PROG=1 node run.js               # ilerlemeyi yazdır
```

### 2. Ders içindeki örnek kutuları
```bash
node boxes.js            # FILTER ile daraltılabilir
```
Konu anlatımlarındaki çalıştırılabilir örnekleri bütün SQL türlerinde çalıştırır. Son temiz sonuç: `kutu 569 calistirma 2633 hata 0`.

### 3. SQL Arena
```bash
node arena.js            # SETS (küme adları, virgülle) ve IDS (kimlik düzenli ifadesi) ile daraltılabilir
```
Meydan okumaları, dedektif vakalarını, tahmin ve bulmacaları denetler. Son temiz sonuçta `PROBLEMS 0` yazar (`sonuclar/arena.txt`).

### 4. Statik içerik denetimi
```bash
node static.js
```
- Yinelenen kimlik ve başlıkları, öğrenme yolu sırasını, şıkların dağılımını denetler.
- Çıktı uyarı listesidir.
- Son durumda bilinen ve kabul edilmiş uyarılar: `hicbirPatikadaDegil: 1`, `patikaSeviyeGeriDonus: 13`, `ayniCozumluPratik: 8`, `sinavAyniSecenek: 1`. Bu sayılar artarsa bak. Ayrıntılı liste `static.txt` dosyasına yazılır (son hali: `sonuclar/static.txt`).

### 4a. BT İş Analisti sayıları
```bash
node ba_sayilar.js   # c36.js metnindeki sayıları veritabanından yeniden hesaplar. Beklenen: fark 0
```

### 4c. Sorgu Optimizasyonu denetimi
Alıştırmalarda iki ek alan vardır. `plan`: sonuç doğru olduktan sonra sorgunun SQLite planına bakılır (`dialect.js` içinde `planFail`). Alanları: `setup` (gizli hazırlık, ör. indeks), `q` (sabit sorgu; yoksa cevabın son SELECT'i), `must`, `not` (düzenli ifade), `msg`. `ynl`: reddedilmesi gereken yanlış cevaplar; arayüzde kullanılmaz, yalnız denetim içindir.
```bash
node opt_denetim.js          # Beklenen: COZUM_RED 0, GECEN_YANLIS 0, SAYI_FARK 0, YANLISSIZ 0. Dakikalar sürer; FILTER='^opt-' ile daraltılır
YALNIZ_YAPI=1 node opt_denetim.js  # yalnız şık dengesi ve yol sırası, saniyeler sürer. Beklenen: SIVRI 0, SIRA_HATA 0
node opt_cikti.mjs --denetle # plan-ciktilari.js ile gerçek motoru karşılaştırır. Beklenen: FARK 0
node opt_cikti.mjs           # sorgu değişince dosyayı yeniden üretir
```
- `opt_denetim.js`, `plan` ya da `ynl` alanı olan bütün ders, pratik ve Arena görevlerinde çözümü her izin verilen SQL türünde, yanlış cevapları temel türünde çalıştırır. Metindeki veri sayılarını (`SQLP_OPT_SAYI`) veritabanından yeniden hesaplar.
- Şık dengesi: `c37.js` ve `c38.js` çoktan seçmelilerinde (`dn` alanı) doğru şık en uzun olan pay %15 ile %35 arasında, en kısa olan en çok %35 olmalı; diğerlerinden belirgin sivrilen şık hata sayılır. Yol sırası: `opt-*` dersleri indeks ve plan okuma dersinden sonra gelmeli.
- PGlite'ın varsayılanı `enable_seqscan = off`'tur. `opt_cikti.mjs` bunu açar, yoksa planlar gerçek bir PostgreSQL'e benzemez. `VACUUM ANALYZE` çalıştırır, sorguyu iki kez çalıştırıp ikinciyi yazar ve planlama satırlarını atar.
- SQL Server, MySQL, Oracle ve BigQuery için plan çıktısı yazılmaz. Bu ürünlerin bilgileri resmî belgeden alınmıştır.
- Tarayıcıda: kökü 8811 portunda sun, `qa` içinde `NODE_PATH=$(npm root -g) node opt_tarayici.js`. 1280 ve 390 genişlikte dersleri açar, doğru cevabın kabul edildiğini, yanlışların reddedildiğini sınar.

### 4d. Pilot özeti
Sunucu ve ağ isteği yoktur. Her şey `sqlpatika.v1` içindeki geri uyumlu `pilot` alanındadır: `tests` (en çok 20 kayıt, ilk test silinmez), `aktifDk` (sayfa görünür ve son 60 saniyede etkileşim varken), `dersBaslangic`, `dersBitis`, `takilma`. Profil'deki "Pilot özeti" kutusu ve "Özeti kopyala" düğmesi bu alandan düz JSON üretir. Yedek ve içe aktarma alanı birleştirir, sıfırlama temizler.
- `index.html` içindeki `PILOT_SURUM`, `sw.js` önbellek sürümüyle birlikte artırılır.
- Tarayıcıda: kökü 8811 portunda sun, `qa` içinde `NODE_PATH=$(npm root -g) node pilot_tarayici.js`. 1280 ve 390 genişlikte yükleme mesajını, Türkçe klavye ipucunu, "Devam et"i, seviye testinin karışmasını, kaydı, kopyalamayı, içe aktarmayı, sıfırlamayı dener. Beklenen: `HATA 0`.

### 4e. Motor gerçeği
- **Yabancı anahtar:** Veri setlerinde kapalıdır, mevcut alıştırmalar buna dayanır (açınca 9 görev bozuluyor). Çalıştırma kendi tablosunda `FOREIGN KEY` ya da `REFERENCES` tanımlıyorsa o çalıştırma boyunca açılır (`runDialect`).
- **Etkisiz komutlar:** `SET TRANSACTION ISOLATION LEVEL`, kilit ipuçları, `LOCK_TIMEOUT`, `DEADLOCK_PRIORITY`, `FILLFACTOR`, `COLUMNSTORE`, bölümleme hatasız geçer; `res.uyari` döner ve sonuç ekranında "Bu motorda etkisi yok" kutusu çıkar (`ETKISIZ`).
- **Sistem görünümleri:** Gerçek DMV yok. T-SQL modunda `sys.dm_*`, `sys.query_store_*`, `sys.database_*`, `msdb.dbo.*`, `sis.js` kopyalarına yönlenir (`revKatalog`). `sys.indexes` yalnız sorguda `object_id`, `index_id`, `fill_factor` gibi sütun geçiyorsa kopyaya gider, yoksa eski davranış.
- **T-SQL'de eklenenler:** `UPDATE ... FROM JOIN`, `DELETE ... JOIN`, `DELETE/UPDATE TOP`, `UPDATE OUTPUT deleted`, `MERGE OUTPUT $action` ve `INTO`, parametresiz `THROW;`, `XACT_STATE`, `XACT_ABORT` ile işlenemez işlem, `@@NESTLEVEL` ve 32 sınırı, `WITH RECOMPILE` yazımı, çok ifadeli tablo işlevi, view üzerinde `INSTEAD OF`, tek tablolu view'e yazma ve `WITH CHECK OPTION` (son ikisi pg, mysql, oracle'da da).
- Tarayıcıda: `qa` içinde `NODE_PATH=$(npm root -g) node motor_tarayici.js` (uyarı kutusu, FK, kopya görünüm, yeni dersler). Beklenen: `HATA 0`.
- **Gizli varyant:** `DX.varyantFail`, sonuç doğru çıkınca görevin tablolarından satır silip (FK ile bağlı alt satırlar da silinir) çözüm ve cevabı yeniden karşılaştırır. Elle yazılmış sabit sonuç burada düşer. Yalnız silme yapıldığı için veride her zaman doğru olan koşul doğru kalır. Arayüzde ve kodlama sınavında ilk çalıştırmanın süresinden bağımsız uygulanır. TOP, LIMIT ya da başka SQL türünde eşitlikte sıra ve yuvarlama geçerli cevabı ayırabilir; orada yalnız cevabın veriye tepki vermesi aranır.
- **Desteklenmeyen komut:** `DESTEKSIZ` listesi "Incorrect syntax" yerine "Bu motor desteklemiyor" der.
- `node alternatif.js`: bağımsız denetimden gelen elle yazılmış yanlış ve geçerli cevaplar. Beklenen: `YANLIS_GECEN 0`, `DOGRU_RED 0`.
- **Yok:** TVP, DDL trigger, trigger gövdesinde IF, `CROSS APPLY` ile çok ifadeli işlev, gerçek kilit ve eşzamanlılık.

### 4f. Çoklu çözüm, deneme, merdiven
- **Çoklu çözüm:** Görevin `alt` alanı başka geçerli çözümlerdir (`{ad, sql, not}`), `kenar` mülakatta sorulacak kenar durumdur. `opt_denetim.js` her `alt` çözümü cevap gibi sınar (`ALT RED`). Çözünce ve süreli set sonunda ekranda görünür; süre tarayıcıda ölçülür.
- **Süreli setler:** `kod-mk-kolay`, `kod-mk-orta`, `kod-mk-zor`. Kodlama sınavı notu da artık `mustFail` ve gizli varyanttan geçer.
- **Paylaşılabilir deneme (`#fiddle=`):** Şema ve sorgu JSON olarak base64url ile adresin `#` kısmına yazılır, en çok 8.000 karakter. Sunucu yok. Bağlantıdan gelen kod kendiliğinden çalışmaz. GoatCounter'a `#fiddle` olarak gider, içerik gönderilmez. Sonuç `esc` ile basılır.
- **Merdiven ve desen haritası:** `SQLP_MERDIVEN`, `SQLP_DESEN` (`c42.js`) var olan görevlere bağlanır. Yeni görev eklemez.
- Tarayıcıda: `qa` içinde `node kiyas_tarayici.js`. Beklenen: `HATA 0`.

### 4b. Önkoşul taraması
```bash
node onkosul.js
```
Her öğrenme yolunda çözümü, anlatılmamış yapı isteyen dersleri listeler. Rol yollarında beklenen: `temel`, `analist`, `is-analisti`, `bilimci`, `muhendis`, `bi`, `backend` 0; `tsql` ve `dba` 1 (`ts-giris` giriş dersi). Konu ve sertifika yolları temelleri bildiğini varsayar. İleri görev işaretli alıştırmalar sayılmaz.

### 5. Gerçek PostgreSQL denetimi
```bash
node pg_denetim.mjs              # FILTER='^ik-' ile daraltılır
```
- Ders alıştırmalarını, pratik görevlerini ve Arena çözümlerini `DX.forward` çıktısıyla PGlite (WASM) üstünde çalıştırır, taklit motorun sonucuyla karşılaştırır. `bk_*` tabloları ve DML/DDL dahildir.
- Her çözüm dış bir işlem içinde çalışıp geri alınır. Kendi `BEGIN`/`COMMIT` komutları kayıt noktasına çevrilir, veri kalıcı değişmez.
- İlk çalıştırmada veritabanını kurar ve `pg_taban.tgz` olarak saklar (`base.sqlite` yenilenince kendini yeniler). Tam tur yaklaşık 3 dakika.
- 45 saniyeyi aşan sorgu `zamanasimi` diye yazılır. Tüm sonuç `pg_audit.json` dosyasındadır.
- Gerekçesi yazılı farklar `pg_bilinen.json` dosyasındadır. Temiz sonuç: `BILINMEYEN 0` ve `gereksiz bilinen kayit 0` (son tur: 1.738 çözüm, 1.731 aynı, 7 bilinen; `sonuclar/pg.txt`).
- Yapısal denetimi SQLite kataloğuna bakan DDL görevlerinde (pragma_table_info) yalnız DDL'in çalıştığı sınanır.
- Tarih türü ile yapılan sıralamalar ve yerel ayara bağlı `UPPER`/`LOWER` farkı karşılaştırmada i/İ/ı/I harfleri eşit sayılarak ele alınır.

MySQL, Oracle ve BigQuery için bu denetimin karşılığı yoktur; bu türler yalnız taklit katmanında sınanır. SQL Server için aşağıdaki 5a'ya bak.

### 5a. Gerçek SQL Server denetimi (Windows bilgisayarda)
Gerçek sunucu bu kapsayıcıda çalışmaz; denetim iki adımdır.
```bash
node mssql_gen.js /tmp/mssql                                   # ddl.json + beklenen.json (Turkish_CI_AS)
node mssql_gen.js /tmp/mssql SQL_Latin1_General_CP1_CI_AS      # beklenen_L.json
```
- `ddl.json`, `beklenen*.json`, `base.sqlite` ve `mssql_kontrol.py` aynı klasöre, SQL Server kurulu bilgisayara kopyalanır (pyodbc gerekir).
- `python mssql_kontrol.py` → KesitSQL veritabanını (sunucunun varsayılan harmanlaması, Türkçe kurulumda Turkish_CI_AS) kurar, her çözümü bir işlem içinde çalıştırıp geri alır ve sonucu taklit motorla karşılaştırır. `--yukle` veritabanını yeniden kurar.
- `python mssql_kontrol.py beklenen_L.json --latin` → aynı işi `COLLATE SQL_Latin1_General_CP1_CI_AS` ile kurulan KesitSQL_L veritabanında yapar (ilk kurulum yaklaşık 10 dakika).
- Çıktı: `sonuc.txt` / `sonuc.json` (Latin için `sonuc_L.*`). Sınıflar: `ayni`, `fark`, `sira` (aynı satırlar, sıra farklı), `sqlHata` (gerçek sunucu reddetti), `emuHata`, `surum` (yalnız SQL Server 2022 ve sonrası özellik), `(ortam)` (DMV ve msdb gibi taklit ortamı), `(işlem)` (işlem komutlu, sarmalayıcıdan etkilenen madde). Farklı maddelerde gerçek sunucunun ilk 40 satırı `ss` alanına yazılır.
- Son tur (21 Kasım 2026, SQL Server 2019): 1.917 madde. Kalanlar ortam, işlem sarmalayıcısı ve `DIFFERENCE` puanıdır.

### 5a-2. Gerçek PostgreSQL ve MySQL denetimi (Windows bilgisayarda)
PostgreSQL 15 ve MySQL 9.7, Anaconda ile `D:\Users\YsF\kesitdb` klasörüne taşınabilir kuruldu (hizmet ve parola yok). Bilgisayar yeniden başlarsa `db_baslat.py` ikisini de açar.
```bash
node db_gen.js /tmp/dbk pg          # ddl_pg.json + beklenen_pg.json (C harmanlaması)
node db_gen.js /tmp/dbk pg tr       # beklenen_pg_tr.json (Turkish_Türkiye.1254)
node db_gen.js /tmp/dbk mysql       # ddl_mysql.json + beklenen_mysql.json (utf8mb4_0900_ai_ci)
node db_gen.js /tmp/dbk mysql tr    # beklenen_mysql_tr.json (utf8mb4_tr_0900_ai_ci)
```
- PC'de: `python db_karsilastir.py pg|mysql [tr] [--yukle]`. Veritabanları: PostgreSQL `kesitsql_c` / `kesitsql_tr`, MySQL `kesitsql` / `kesitsql_tr`.
- PostgreSQL'de her çözüm bir işlem içinde çalışıp geri alınır. MySQL'de DDL işlemi kapattığı için veri değiştiren çözüm, kullandığı tabloların `kx_tmp` kopyasında çalışır.
- Çıktı `sonuc_<tür>[_tr].txt/json`; sınıflar SQL Server'dakiyle aynı. `db_yokla2.py` harmanlama yoklamasıdır (sıralama, UPPER/LOWER/INITCAP, LIKE/ILIKE, REPLACE, LOCATE).
- Bulunup giderilenler: MySQL `TIMESTAMPDIFF` tam birim sayar (kesme), JSON nesne anahtarları uzunluğa sonra ikili sıraya dizilir, `CAST(x AS VARCHAR)` MySQL'de hatadır (CHAR), `ROW_NUMBER()` işaretsizdir (çıkarmada SIGNED), `ROUND` NUMERIC/DECIMAL'de tam yarıda yukarı; PostgreSQL 15 alt sorguya takma ad ister, boolean doğrudan sayıya çevrilmez.
- Son sonuçlar (21.11.2026): PostgreSQL C 1.733/1.738, Turkish 1.732/1.738; MySQL 0900_ai_ci 1.723/1.726, tr_0900_ai_ci 1.723/1.726 aynı (`sonuclar/pg_gercek_*.txt`, `sonuclar/mysql_gercek_*.txt`). MySQL turunda ayrıca bulunup giderilenler: tamsayı `AVG`'sinin 4 basamağa yuvarlanması yalnız dış sorgunun doğrudan seçim sütununda olur (`ROUND(AVG(x), 2)` ve CTE'de tam duyarlık kalır); birleşik sorgunun `ORDER BY`'ı artık `SELECT * FROM (...)` içine alınıp harmanlamaya göre sıralanır; karşılaştırma betiği bağlantı harmanlamasını veritabanınınkine eşitler.
- İkinci turda giderilenler: MySQL kesin bölmesi `mydiv_` ile bölünenin ölçeği + 4 basamağa yuvarlanır (ölçek sütun türünden, değişmezden ya da çalışma anında değerin türünden bulunur; kayan noktalı taraf varsa yuvarlanmaz). `ROW_NUMBER/RANK/DENSE_RANK/NTILE` ile eksiye düşen çıkarma MySQL'deki gibi ERROR 1690 verir. PostgreSQL'de `CREATE EXTENSION` kabul edilir (soundex görevinin PG çözümü eklentiyi açar). JSON dizi sırası görevine PG (`json_agg(... ORDER BY ...)`) ve MySQL (pencere biçimli `JSON_ARRAYAGG`) çözümleri eklendi. Windows Türkçe harmanlamasında sondaki kısa çizgi en son düzeyde karşılaştırılır (309 dizenin tamamı tutuyor). Birleşik sorguda `ORDER BY 2` gibi sıra numaraları da harmanlamaya göre sıralanır; `x IN (SELECT y ...)` harmanlamalı karşılaştırılır.
- `db_karsilastir.py` eşit değerlerin farklı dizilişini uygulamanın kabul ettiği gibi (`keyCols`) aynı sayar.
- Hız: SQL Server ve MySQL kipinde iki temel tablo sütunu arasındaki `=`/`<>` karşılaştırması, sütun değerleri harmanlamada çakışmıyorsa `ck_` ile sarılmaz (`collStable`; veri değişince yeniden bakılır). Metin anahtarla öz-birleştirme 29 sn'den 1,8 sn'ye indi. Gizli veri senaryoları ağır sorguda bir senaryo doğrulandıktan sonra 4 sn'de durur; sonucu veriden bağımsız ve çok yavaş görevlerde `noVar: true` ile hiç çalışmaz.
- T-SQL: `||` zinciri SQL Server'a çevrilirken metin olduğu kesin olmayan parçalar `CAST(... AS NVARCHAR(4000))` ile sarılır; öğrencinin `metin + sayı` ifadesi gerçek sunucudaki gibi Msg 245 verir. `mssql_kontrol.py` de eşit değer sırasını `keyCols` ile kabul eder.
- Bilinen farklar: eşit değerlerin sırası (uygulama kabul eder).

### 5a-3. Gerçek Oracle denetimi (CI ya da Windows bilgisayar)
Oracle Database Free (26ai, 23.26) ile karşılaştırma. En kolayı GitHub Actions: **Gerçek Oracle denetimi** iş akışı (`.github/workflows/oracle-denetim.yml`) `gvenzl/oracle-free` kapsayıcısını açar, `db_gen.js` ve `db_karsilastir.py`'yi çalıştırır, farkları günlüğe yazar. `dialect.js`, `db_gen.js`, `db_karsilastir.py` ya da `ora_yokla.*` değişen PR'de kendiliğinden, istenince **Run workflow** ile çalışır (yaklaşık 6 dakika).
```bash
node db_gen.js /tmp/dbk oracle      # ddl_oracle.json + beklenen_oracle.json
pip install oracledb                # ince kip: Oracle istemcisi gerekmez
python db_karsilastir.py oracle --kur   # SYSTEM parolasını sorar, KESIT ve KESIT_TMP kullanıcılarını açar, veriyi yükler
python db_karsilastir.py oracle     # karşılaştırma -> sonuc_oracle.txt/json
python ora_yokla.py                 # ora_yokla.sql'deki ifadeleri (';;' ile ayrılır) tek tek dener
```
- Bağlantı: `KESIT_ORA_DSN` (varsayılan `127.0.0.1:1521/FREEPDB1`). KESIT/KESIT_TMP parolası `--kur`'da rastgele üretilir ve `%LOCALAPPDATA%\kesit_ora.json` dosyasında durur (depoya girmez). CI'da SYSTEM parolası her çalıştırmada rastgeledir.
- Tablo ve sütun adları tırnaklı BÜYÜK harfle kurulur (tırnaksız sorgu adlarıyla aynı, ayrılmış sözcükler de kurulabilir). Oracle DDL işlemi kapattığı için veri ya da nesne değiştiren çözüm KESIT_TMP şemasında, kullandığı tabloların kopyasında çalışır; sonra o şemadaki her nesne silinir.
- Oturum varsayımları: `NLS_LENGTH_SEMANTICS = CHAR` (Türkçe harfler UTF-8'de 2 bayt; bayt anlamında `VARCHAR2(10)`'a 'İstifa...' sığmıyor, ORA-12899) ve ISO tarih biçimi (`NLS_DATE_FORMAT = 'YYYY-MM-DD'`). Uygulamanın Oracle kipi tarihleri ISO gösterir; varsayılan `DD-MON-RR` oturumda tarih-metin karşılaştırmaları farklı davranır.
- Taklit motor Oracle'da boş metni ('') NULL sayar; bu dönüşüm `db_gen.js`'te taban için bir kez yapılır (madde başına ~1 sn kazanç).
- İlk tur (23.11.2026, Oracle 23.26.4): 1.726/1.773 aynı. Bulunup giderilenler: `ROUND` NUMBER'da tam ondalık (4,225 → 4,23); `UPPER`/`LOWER` dilden bağımsız (i ve ı → I, İ ve I → i; Türkçe kural `NLS_UPPER`); `TO_CHAR` biçimindeki çift tırnaklı metin (`'YYYY-"Q"Q'`) ve strftime çevirisinde düz metnin tırnaklanması (`'HH24":00:00"'`, yoksa ORA-01821); GROUP BY'sız toplama sorgusunda skaler alt sorgu ORA-00937 verir, çeviri `MAX((...))` içine alır; özyinelemeli WITH'e sütun listesi (ORA-32039); `comment`/`level`/`resource` sütunları tırnaklanır (ORA-00936/03050); `INSERT ... SELECT ... WHERE`'de `FROM dual` WHERE'den önce; `ALTER TABLE ADD (x TEXT)` tür eşlemesi; `datetime(x, n || ' hours')` → `x + n / 24` ve DATE + kesirli gün; `UPDATE t ... (SELECT ... FROM t x ...)` alt sorgusu güncelleme öncesi veriyi görür (SQLite satır satır güncellenmiş tabloyu görüyordu; PostgreSQL için de geçerli).
- Son tur: 1.772/1.773 aynı (`z071-nesneler#7`'de indeks ifadesindeki `UPPER` de giderildi). Kalan `ai-ml#3` gerçek Oracle'ın yanlış sonucu: `WITH m AS (... GROUP BY customer_id HAVING MIN(order_date) < ...) SELECT 1 - sonra, COUNT(*) FROM m GROUP BY 1 - sonra` 114 müşterinin hepsini `sonra = 0` sayıyor, oysa aynı veride 91 müşterinin Temmuz sonrası siparişi var (yoklamayla doğrulandı). CTE'ye `/*+ MATERIALIZE */` ipucu verilince Oracle da doğru sonucu (91/23) veriyor; HAVING'li gruplamanın dış gruplamayla birleştirilmesindeki iyileştirici hatası. Taklit motor doğru sonucu veriyor.

### 5b. SQL Server harmanlama (collation) taklidi
sql.js'te `create_collation` olmadığı için T-SQL kipinde metin karşılaştırmaları `dialect.js` içindeki `collateSql` geçişiyle yeniden yazılır:
- `=`, `<>`, `<`, `IN (...)`, `BETWEEN`, basit `CASE x WHEN`, `ORDER BY`, `GROUP BY`, `PARTITION BY`, `COUNT(DISTINCT ...)` ve `SELECT DISTINCT` noktalarında metin `ck_(x)` anahtar işlevinden geçer. `MIN`/`MAX(metin)` → `tmin_`/`tmax_`, `LIKE` → `tlike_`, `UPPER`/`LOWER`/`REPLACE`/`CHARINDEX` harmanlamaya göre çalışır.
- `collKey` dört katmanlı anahtar üretir: harf (Türkçe'de ç ğ ı ö ş ü ayrı harf; Latin'de aksanlı harf), aksan, büyük/küçük (yalnız `_CS`), kelime sıralaması (kesme işareti ve kısa çizgi en sona bırakılır). Sondaki boşluk yok sayılır. `_BIN` harmanlamasında anahtar metnin kendisidir.
- Kurallar gerçek sunucudaki yoklamayla (`araclar/denetim/sorgu.py` + `sorgu.json`) çıkarıldı: 220 dizenin iki harmanlamadaki sırası, `UPPER`/`LOWER`, 13 `LIKE` deseni, `REPLACE` ve `CHARINDEX` birebir tutuyor.
- Uygulamada kenar çubuğundaki **Harmanlama** seçimi (yalnız SQL Server seçiliyken görünür) `DX.setCollation` çağırır: Turkish_CI_AS (varsayılan) veya SQL_Latin1_General_CP1_CI_AS. Sorgudaki `x COLLATE Ad` o karşılaştırmada seçimi ezer.
- Bilinen sınırlar: birleşik sorguda adı bulunamayan ifadeye sıra numarasıyla verilen `ORDER BY` ve `DISTINCT`li `IN (SELECT DISTINCT ...)` harmanlamasız kalır; `MIN`/`MAX` pencere işlevinde ikili karşılaştırma kullanır; `DIFFERENCE` 4'ün altındaki puanlarda gerçek sunucudan ayrılabilir (gerçek sunucuda puan, argümanların sırasına göre değişiyor). `SOUNDEX` birebir tutar.
- MySQL: `utf8mb4_0900_ai_ci` (varsayılan) ve `utf8mb4_tr_0900_ai_ci` büyük/küçük harf ve aksan duyarsızdır, sondaki boşluk sayılır (NO PAD); karşılaştırma, gruplama, DISTINCT, LIKE, LOCATE/INSTR harmanlamaya göre, REPLACE ikilidir. UPPER/LOWER iki harmanlamada da Türkçe kural kullanmaz (UPPER('i') = 'I'). 309 dizenin sırası, harf dönüşümü ve LIKE gerçek MySQL 9.7 ile birebir tuttu.
- PostgreSQL: eşitlik her zaman ikilidir; harmanlama yalnız sıralamayı (ORDER BY, <, >, MIN/MAX) ve UPPER/LOWER/INITCAP/ILIKE'ı etkiler. `C`: ikili sıra, harf dönüşümü yalnız ASCII. `Turkish_Türkiye.1254` (Windows kurulumunun varsayılanı): ç ğ ö ş ü ayrı harf, ı ve İ'ye harf dönüşümünde dokunulmaz. Gerçek PostgreSQL 15 (Windows) ile 309 dizede yalnız `ab-` gibi sondaki kısa çizgi sırası ayrıldı. Linux'taki tr_TR/en_US yerel ayarları farklı davranır.
- `run.js` SQL Server sonucu SQLite referansından yalnız harmanlama ya da son basamak yuvarlamasıyla ayrılıyorsa bunu `harmanlama` (harmanlama kapatılınca SQLite ile aynı) ya da `<tür>Yuvarlama` diye ayrı yazar; MySQL'in `TIMESTAMPDIFF` kesmesi ve `JSON_OBJECT` anahtar sırası `mysqlSemantik` olarak ayrılır. Bunlar hata sayılmaz.

### 6. İpucu kapsamı
```bash
node ipucu_uret.js               # ipuclari.js dosyasını yeniden yazar, "uretilen N elle M" yazar
node ipucu_uret.js --ornek 40    # üretilen ipuçlarından örnek gösterir
```
Bütün SQL alıştırmaları ve pratik görevlerinde ipucu olmalı. Elle yazılan her ipucu `ipucu_elle.json` içinde (`ders#sira` ya da `P:kimlik`) ve üretilenin önüne geçer. İçerik değişince yeniden çalıştır.

### 7. Tarayıcı testleri
Önce kökü 8765 portunda sun:
```bash
python3 -m http.server 8765 --directory ../..
```
Sonra:
```bash
node smoke8.js       # masaüstü ve mobil: ana ekranlar, taşma ve konsol hataları. Beklenen: ERR []
node pub_test.js     # yayın denetimi. Beklenen: sw aktif, 3 simge, dış istekler [], errs []
node fr.js           # ilk kullanım akışı ("Hiç bilmiyorum" → ilk ders → Kontrol et)
node cert_test.js    # tamamlama belgesi. Görselleri $KESIT_CIKTI/belge/ klasörüne yazar
node pf_test.js      # Hakkında sayfası ve config.js alanları
node gc_test.js      # GoatCounter: kod doluyken sayaç yükleniyor ve olaylar gönderiliyor
node sweep.js        # SQL Arena'nın bütün öğelerini tarayıcıda açar
node mobsweep.js ders-ik-ucret,data   # verilen sayfaları mobilde açar
node final_check.js  # Hakkında sayfasının ekran görüntüsü
```
- `smoke8.js` başka bir adresi `URL=https://... node smoke8.js` ile dener.
- `smoke8.js`, `URL=` ile; `pub_test.js`, `icons.js` ve `shots.js`, `KESIT_BASE=http://localhost:PORT` ile başka porta yönlendirilir.
- `pub_test.js` ve `final_check.js` gerçek `config.js` ile çalışır.
- Diğer testler `config.js` dosyasını kendi deneme değerleriyle değiştirerek çalışır.

### 8. Kullanıcı akışı testleri (qa/)
Bu testler 8811 portunu kullanır:
```bash
python3 -m http.server 8811 --directory ../..
cd qa
node sweep3.js pg          # bütün pratik görevleri seçilen SQL türünde (tsql, pg, mysql, oracle, bq, sqlite)
node lsweep2.js pg         # dersleri baştan sona çözerek ilerleme
node a11y.js               # ana sayfalardaki tıklanabilir öğelerin taraması
```
`r1`, `r2*`, `r3*`, `m*`, `s*` dosyaları belirli turların kullanıcı senaryolarıdır; ekran görüntülerini `qa/shots/` klasörüne yazar.

### Önerilen sıra (bir değişiklikten sonra)
1. Veri değiştiyse `node make_base.js`.
2. İçerik değiştiyse `node ipucu_uret.js`.
3. `node run.js`, `node boxes.js`, `node arena.js`, `node static.js` ve `node pg_denetim.mjs`. Birbirinden bağımsızdırlar; aynı anda da çalışabilirler. Üçü aynı anda çalıştırıldığında, sınırlı sunucu kaynağı olan bir makinede, tam takım yaklaşık 25 dakika sürdü. Geliştirirken `FILTER` ile yalnızca değişen dersleri denetle.
4. Sunucuyu aç; `node smoke8.js` ve `node pub_test.js`.

### Tek seferlik betikler
`t1`–`t7`, `err*`, `dx*`, `probe*`, `dump*`, `smoke`–`smoke7`, `*_c30`–`*_c33`, `fix_test` ve benzerleri belirli bir hatayı ya da içerik partisini incelemek için yazıldı. Örnek olarak tutuluyorlar; eski bir duruma göre yazılmış olabilirler.

### Süre tahmini
Ders ve yol süreleri `index.html` içindeki `sureDk`, `dkAralik`, `saatAralik` ile hesaplanır: okuma (600 karakter/dk, en az 3 dk) + SQL görevi başına 2-3 dk + çoktan seçmeli başına 0,5-1 dk. Üç uygulamada aynı formül. Ölçülmüş değildir; ders dosyasındaki `min` alanı ekranda kullanılmaz. Pilotla ölçüm yapılırsa katsayılar burada değişir.

## Yayına alma
Site `main` dalından sunulur. `main` dalına **yalnız aşağıdaki dosyalar** gider; `araclar/` ve `NASIL.md` gitmez.

Site dosyaları (tam liste): `index.html`, `db.js`, `hv.js`, `lk.js`, `ik.js`, `bk.js`, `ops.js`, `sis.js`, `dialect.js`, `c1.js` … `c44.js`, `cx.js`, `plan-ciktilari.js`, `ipuclari.js`, `arena-data.js`, `config.js`, `bilinen-sinirlar.js`, `belge.js`, `sw.js`, `base-<özet>.b64.txt`, `manifest.webmanifest`, `favicon.svg`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `icon-512-maskable.png`, `og.png`, `vendor/`, `ekran/`, `README.md`, `LICENSE`, `LICENSE-ICERIK.md`, `.nojekyll`.

Eski sürümden kaldırılacaklar: `hesap.js`, `hesap-secenegi/`, `YAYIN.md`.

```bash
git checkout main
git checkout kaynak -- veri index.html db.js hv.js lk.js ik.js bk.js ops.js sis.js dialect.js c[0-9]*.js cx.js plan-ciktilari.js ipuclari.js arena-data.js config.js bilinen-sinirlar.js belge.js sw.js manifest.webmanifest favicon.svg apple-touch-icon.png icon-192.png icon-512.png icon-512-maskable.png og.png vendor ekran README.md LICENSE LICENSE-ICERIK.md .nojekyll base-*.b64.txt
git rm -r --ignore-unmatch hesap.js hesap-secenegi YAYIN.md
git rm --cached --ignore-unmatch base-<eski-özet>.b64.txt   # veritabanı yenilendiyse eskisini kaldır
git commit -m "..." && git push origin main
git checkout kaynak
```
GitHub Pages bir iki dakika içinde güncellenir.

`sw.js` ağ öncelikli çalışır; ziyaretçiler yeni sürümü bir sonraki açılışta alır. Önbellek biçimini değiştirirsen `CACHE` sabitinin sürümünü artır; eski önbellek etkinleşmede silinir. Yeni `base-*.b64.txt` alınınca eskisi önbellekten çıkar.

## Kendi veritabanında çalış paketleri (veri/)
```bash
cd araclar/denetim && npm install && node make_base.js   # base.sqlite
node ../paket/paket.js                                 # kökte veri/kesit-sql-<set>.zip ve veri/paketler.json
```
- Yedi paket: anadolu-market, ilgaz-bank, kanat-havayollari, lezzet-kurye, pusula-ik, pedal-izmir, operasyon. Tablo → paket eşlemesi `paket.js` › `SETLER`; yeni bir tablo hiçbir pakete düşmezse betik durur.
- Her pakette SQL Server, PostgreSQL, MySQL, Oracle betiği, hazır `.sqlite`, `BENIOKU.md`, `DOGRULAMA.md`. Türler `SQLP_COLMETA` + `SQLP_TYPE` (Veri setleri sayfasındaki CREATE TABLE ile aynı). Yabancı anahtarlar veriye uyuyorsa sonda `ALTER TABLE` ile eklenir; uymayanlar BENIOKU'da listelenir.
- Zip içi belirlenimcidir (sabit tarih); veri değişmedikçe aynı dosya çıkar. Büyük paketin (pedal-izmir ~16 MB) boyutu `index.html` › `PAKET_MB` içinde elle yazılıdır; veri değişirse güncelle.
- Doğrulama (27 Kasım 2026): PostgreSQL betikleri PGlite'ta, MySQL betikleri MariaDB 10.11'de yedi paketin hepsinde hatasız kuruldu; satır sayıları ve kontrol toplamları tuttu. SQL Server ve Oracle betikleri gerçek sunucuda denenmedi (Windows bilgisayarda 5a ve 5a-3'teki gibi denenmeli).
- Görev kâğıdı tarayıcıda üretilir (`index.html` › `gorevKagidi`): dersin SQL görevleri, seçili türde beklenen sonuç (`solResult`) ve çözümler. 296 dersin hepsinin kâğıdı hatasız üretiliyor (yaklaşık 2,5 dakikada bütün dersler).

## Az uygulamalı dersler ve şema tasarlama (c44.js)
- DBA, köprü, sertifika ve genel derslere 57 SQL görevi; 3'ten az uygulamalı görevli ders 24 → 1 (`opt-plan`, plan görevleri var).
- T-SQL görevleri `sys.*`, `msdb.dbo.*` yazımıyla; motor kopyalara yönlendirir (4e). Şema tasarlama görevleri `check` ile `pragma_table_info` ve `pragma_foreign_key_list` okur.
- Denetim: `run.js`, `sabit_tara.js` (SABIT_GECEN 0), `sabit_regresyon.js` (HATA 0), `pg_denetim.mjs` (1.766 çözüm, BILINMEYEN 0).

## Ortak veri setleri
Ilgaz Bank, Kanat Havayolları, Lezzet Kurye, Pusula İK ve Pedal İzmir üç uygulamada satır satır aynıdır (`ops_` tabloları yalnız Kesit SQL'dedir); SQL'in Anadolu Market `web_events` tablosu Python `anadolu_market` ile aynıdır (Power BI `WebOlaylari` ayrı veridir). Kaynak bu depodaki üreteçlerdir (`db.js` içindeki banka bölümü, `hv.js`, `lk.js`, `ik.js`, `bk.js`); diğer iki depo bunlardan türer:
1. Burada üreteci değiştir, `node make_base.js`.
2. Kesit Power BI: dosyayı `scratchpad/sqlsrc/` içine kopyala, `scratchpad/ds` içinde `node seed.js <sqlsrc yolu>`, `python3 mk.py`, SQLite kopyalarını `kur.sh`'taki gibi üret, `node build/vdpack.js`, `.b64.txt` kopyalarını yenile. Yeni tablo eklendiyse `vd_*.js` içindeki `tables` listesine de ekle; pakette yalnız o liste çıkar.
3. Kesit Python: değişen CSV'leri Power BI `ds/csv` klasöründen BOM'suz kopyala (`web_events.csv` dahil, `ds/csv/db` altında), `data/manifest.json` içinde satır ve bayt sayılarını güncelle (`name` alanlarına dokunma; yeni tabloya `cols` ve `note` da yaz).

Üreteçte mevcut rastgele üreteci (`R`, `B`) tüketen çağrıların sırasını değiştirme: diğer bütün veriler kayar. Düzeltmeleri rastgele sayı tüketmeyen son işlem olarak ya da ayrı üreteçle ekle (`lk.js` yorum metinleri `RY`, `db.js` web olayları `RW` ile seçilir).

### Uçak ve bisiklet ataması
`hv.js` ve `bk.js` içindeki `ATAMA` blokları üretilmiş veridir, elle düzenlenmez. Sefer ya da yolculuk saatleri değişirse yeniden hesapla (scipy gerekir, sonuç deterministiktir; `base.sqlite` tabanı atamadan bağımsız sütunlar için okunur):
```bash
python3 veri_atama_hv.py base.sqlite /tmp/hv_atama.json      # 15 uçağa sefer, hv_repositioning, gec_gelen_ucak düzeltmesi
node i_esleme.js                                              # trip_id -> üreteç sırası: /tmp/bk_imap.json
python3 veri_atama_bk.py base.sqlite /tmp/bk_imap.json /tmp/bk_atama.json   # bisiklet, bk_rebalancing, bk_maintenance, 25 bilinçli çakışma
node veri_gom.js /tmp/hv_atama.json /tmp/bk_atama.json && node make_base.js
python3 veri_tutarlilik.py                                    # Beklenen: SORUN 0
```
`veri_tutarlilik.py` uçak ve bisiklet ışınlanmasını, çakışmayı, dönüş süresini, bakımda yolculuğu ve bilerek bırakılan izlerin sayısını denetler. Yeni tablolar: `hv_repositioning` (Kanat), `bk_rebalancing` (Pedal).

Veride bilerek bırakılanlar ve bilinen sınırlamalar `bilinen-sinirlar.js` içindedir; metin üç uygulamada aynıdır, sayılar değişirse üçünü birden güncelle.

## Statik ders sayfaları
Yayın paketi kurulduktan sonra paket klasörü sunulurken çalıştır: `BASE=http://localhost:PORT node araclar/statik.js <paket>`. Üç uygulamaya `ders/` ve `sitemap.xml`, paket köküne `sitemap.xml` ve `sitemap-ana.xml` yazar. Kök dosyalar ana sayfa reposuna, `robots.txt` kaydıyla birlikte gider.

## 8 Kasım 2026: sabit sonuç düzeltmesi

`c43.js`, 4 Kasım yayınındaki 67 ve kaynak dalındaki ek 3 kayıt için doğrulama kuralları ekler; yeni ders oluşturmaz. Ders, pratik ve kodlama sınavı aynı `mustFail` / `varyantFail` denetimini kullanır.

- `noLiteralResult`: gerçek tabloyu FROM içinde anıp bütün çıktı hücrelerini sabitlerden kurmayı engeller; tek başına genel SQL güvenlik sınırı değildir.
- `variants`: her iki çözüm için ayrı taban kopyasında çalışır. `sql` veriyi hazırlar; `beforeLast` geçici tablo kurulduktan sonra son sorgudan önce bozuk veriyi ekler; `tail` aynı yordam ortamında ek çağrı yapar. Hata veren senaryoda başarı verilmez. Bütün özel senaryolar karşılaştırılır; bu görevlerde eski genel silme desenleri ayrıca tekrarlanmaz.
- `explainResult`: son ifadenin gerçekten EXPLAIN QUERY PLAN olmasını ister. `plan.index`, gereken indeksin sütunlarını da katalogdan doğrular.
- `node sabit_regresyon.js`: kayıtlı 70 hedefin izinli lehçelerdeki örnek ve alternatif çözümleri, sabit ve hesap görünümlü sahte cevaplar, sarmalayıcılar ve eksik indeks denetlenir. Veriye bağlı her hedefte en az bir özel senaryonun referans sonucunu değiştirmesi zorunludur. Ana yayında henüz olmayan üç hedef otomatik atlanır.
- `node sabit_tara.js`: bulunan sahte geçişte çıkış kodu 1. Taramanın kapsam sınırları (check, boş sonuç, 300 satır üstü vb.) devam eder; sıfır bulgu bütün olası yanlış cevapların yokluğu anlamına gelmez.
- `npm test`: regresyon, alternatifler, tam sabit taraması ve çözüm çalıştırması. GitHub Actions kaynak dalı ve ona açılan PR'larda bu dört betiği **ayrı, paralel işlerde** çalıştırır (`sql-kontrol.yml` matrisi). Neden: sırayla 36–45 dk sürüyor ve 45 dk sınırında iş iptal oluyordu; paralelde en uzun betik kadar sürer ve hangi betiğin düştüğü iş adından görünür.

Sonuçlar `araclar/denetim/sonuclar/` içinde saklanır.

8 Kasım doğrulaması: 70 hedef, 346 doğru/alternatif çözüm, 146 sahte/eksik işlem kontrolü, 65 özel senaryo; hata 0. Tam sabit taraması: 1.835 deneme, geçiş 0. Plan denetimi: 70 çözüm ve 31 yanlış cevapta hata 0. DOM entegrasyonu (jsdom; gerçek tarayıcı çizimi değil): hata 0. `qa/sabit_dom.cjs` için `npm install --no-save jsdom` gerekir; `KESIT_KOK` ile yayın paketi seçilebilir. Tarayıcı ikilisi bu ortamda indirilemediği için görsel tarayıcı testi yapılmadı.

Genel çözüm taraması: 10.230 çalıştırma, 2.059 SQL görev kaydı, hata 0. 17 orderByVarOrdYok ve 4 ordAmaOrderByYok uyarısı ayrı tutuldu; sıralama metadata uyarılarıdır.

## Uçtan uca depo vakası (vaka/depo/)
`vaka/depo/` Kesit'in dört uygulamasını birleştiren vakanın 1. adımıdır; derleme adımı yoktur, `main`'e olduğu gibi kopyalanır. Sayfa elle düzenlenmez: üreteç `ysfdurak.github.io` deposunda `vaka/depo-kaynak/` altındadır. Denetim `node tests/vaka-depo.cjs` (CI). `araclar/statik.js` site haritasına `vaka/depo/` adresini, sayfa varsa, ekler.

### BigQuery'nin yeri (21.11.2026)
- BigQuery genel "SQL türü" seçiminde yok: `index.html` içinde `GENEL_DISI = ['bq']`. Kenar çubuğu, ilk seçim ekranı, Arena, sorgu editörü ve paylaşılabilir deneme yalnız `DIAL`/`DIDS` (BigQuery'siz) listesini kullanır.
- BigQuery modülü (`bq-*`), `cert-gda`, `lab-gda` ve `base: 'bq'` ya da `dl`'inde `bq` olan görevler BigQuery'de çalışmaya devam eder (`exAllowed`).
- Kod kutularındaki sekmeler ve "Diğer SQL türlerinde gör" paneli `DIDS_ALL` kullanır; BigQuery sekmesi yalnız yazımı gösterir, çalıştırmaz.
- Geri açmak için `GENEL_DISI` dizisini boşalt. Denetim betikleri (run.js vb.) BigQuery çevirisini sınamaya devam eder.
- Sessiz farklar: `where`, `order-limit`, `aggregate`, `hesaplama`, `ranking`, `metin`, `json`, `collation` derslerinde "Sunucuya göre değişir" kutuları; `lehceler` dersinde özet tablo.

