# Kesit SQL: derleme ve test

Bu dal (`kaynak`), yayındaki sitenin (`main` dalı) bütün dosyalarını ve bunlara ek olarak sitenin üretiminde ve denetiminde kullanılan araçları içerir. GitHub Pages `main` dalından yayınlanır. Bu dal yayınlanmaz.

## Klasörler
| Yer | İçerik |
|---|---|
| Kök | Sitenin kendisi. Derleme adımı yoktur; dosyalar olduğu gibi sunulur. |
| `index.html` | Uygulama: arayüz, yönlendirme, ilerleme kaydı. Betikleri sırayla yükler. |
| `db.js`, `hv.js`, `lk.js`, `ik.js`, `bk.js` | Veri setleri: e-ticaret ve banka, havayolu, yemek teslimatı, İK, bisiklet paylaşımı. |
| `dialect.js` | SQL Server, PostgreSQL, MySQL, Oracle ve BigQuery yazımını SQLite'a çeviren katman. |
| `c1.js` … `c38.js`, `cx.js` | Dersler, öğrenme yolları, pratik görevleri, sınavlar. Sonra yüklenen dosya öncekileri yerinde değiştirebilir. `c35.js` son düzeltme katmanıdır: yol sırası, seviye testi, yöntem kuralları, yeni dersler. `c36.js` BT İş Analisti yolu ve onun on bir dersidir; metindeki sayılar `SQLP_BA_SAYI` nesnesinden gelir, `ba_sayilar.js` denetler. `c37.js` Sorgu Optimizasyonu dersleri, `c38.js` mevcut performans derslerinin genişletilmesi, yeni bitirme projeleri (`opt-proje`, `bv-proje`, `ai-proje`), `op*` pratik görevleri, sözlük ve yol bağlantılarıdır. |
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
Bir veri dosyasını (`db.js`, `hv.js`, `lk.js`, `ik.js`, `bk.js`) ya da tablo kuran bir içerik dosyasını değiştirdiysen bu adım gerekir:
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
node opt_cikti.mjs --denetle # plan-ciktilari.js ile gerçek motoru karşılaştırır. Beklenen: FARK 0
node opt_cikti.mjs           # sorgu değişince dosyayı yeniden üretir
```
- `opt_denetim.js`, `plan` ya da `ynl` alanı olan bütün ders, pratik ve Arena görevlerinde çözümü her izin verilen SQL türünde, yanlış cevapları temel türünde çalıştırır. Metindeki veri sayılarını (`SQLP_OPT_SAYI`) veritabanından yeniden hesaplar.
- PGlite'ın varsayılanı `enable_seqscan = off`'tur. `opt_cikti.mjs` bunu açar, yoksa planlar gerçek bir PostgreSQL'e benzemez. `VACUUM ANALYZE` çalıştırır, sorguyu iki kez çalıştırıp ikinciyi yazar ve planlama satırlarını atar.
- SQL Server, MySQL, Oracle ve BigQuery için plan çıktısı yazılmaz. Bu ürünlerin bilgileri resmî belgeden alınmıştır.
- Tarayıcıda: kökü 8811 portunda sun, `qa` içinde `NODE_PATH=$(npm root -g) node opt_tarayici.js`. 1280 ve 390 genişlikte dersleri açar, doğru cevabın kabul edildiğini, yanlışların reddedildiğini sınar.

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
- Gerekçesi yazılı farklar `pg_bilinen.json` dosyasındadır. Temiz sonuç: `BILINMEYEN 0` ve `gereksiz bilinen kayit 0` (son tur: 1.670 çözüm, 1.663 aynı, 7 bilinen; `sonuclar/pg.txt`).
- Yapısal denetimi SQLite kataloğuna bakan DDL görevlerinde (pragma_table_info) yalnız DDL'in çalıştığı sınanır.
- Tarih türü ile yapılan sıralamalar ve yerel ayara bağlı `UPPER`/`LOWER` farkı karşılaştırmada i/İ/ı/I harfleri eşit sayılarak ele alınır.

SQL Server, MySQL, Oracle ve BigQuery için bu denetimin karşılığı yoktur; bu türler yalnız taklit katmanında sınanır.

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

Site dosyaları (tam liste): `index.html`, `db.js`, `hv.js`, `lk.js`, `ik.js`, `bk.js`, `dialect.js`, `c1.js` … `c38.js`, `cx.js`, `plan-ciktilari.js`, `ipuclari.js`, `arena-data.js`, `config.js`, `bilinen-sinirlar.js`, `belge.js`, `sw.js`, `base-<özet>.b64.txt`, `manifest.webmanifest`, `favicon.svg`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `icon-512-maskable.png`, `og.png`, `vendor/`, `ekran/`, `README.md`, `LICENSE`, `LICENSE-ICERIK.md`, `.nojekyll`.

Eski sürümden kaldırılacaklar: `hesap.js`, `hesap-secenegi/`, `YAYIN.md`.

```bash
git checkout main
git checkout kaynak -- index.html db.js hv.js lk.js ik.js bk.js dialect.js c[0-9]*.js cx.js plan-ciktilari.js ipuclari.js arena-data.js config.js bilinen-sinirlar.js belge.js sw.js manifest.webmanifest favicon.svg apple-touch-icon.png icon-192.png icon-512.png icon-512-maskable.png og.png vendor ekran README.md LICENSE LICENSE-ICERIK.md .nojekyll base-*.b64.txt
git rm -r --ignore-unmatch hesap.js hesap-secenegi YAYIN.md
git rm --cached --ignore-unmatch base-<eski-özet>.b64.txt   # veritabanı yenilendiyse eskisini kaldır
git commit -m "..." && git push origin main
git checkout kaynak
```
GitHub Pages bir iki dakika içinde güncellenir.

`sw.js` ağ öncelikli çalışır; ziyaretçiler yeni sürümü bir sonraki açılışta alır. Önbellek biçimini değiştirirsen `CACHE` sabitinin sürümünü artır; eski önbellek etkinleşmede silinir. Yeni `base-*.b64.txt` alınınca eskisi önbellekten çıkar.

## Ortak veri setleri
Ilgaz Bank, Kanat Havayolları, Lezzet Kurye, Pusula İK ve Pedal İzmir üç uygulamada satır satır aynıdır; SQL'in Anadolu Market `web_events` tablosu Python `anadolu_market` ile aynıdır (Power BI `WebOlaylari` ayrı veridir). Kaynak bu depodaki üreteçlerdir (`db.js` içindeki banka bölümü, `hv.js`, `lk.js`, `ik.js`, `bk.js`); diğer iki depo bunlardan türer:
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
