# Kesit SQL: derleme ve test

Bu dal (`kaynak`), yayındaki sitenin (`main` dalı) bütün dosyalarını ve bunlara ek olarak sitenin üretiminde ve denetiminde kullanılan araçları içerir. GitHub Pages `main` dalından yayınlanır. Bu dal yayınlanmaz.

## Klasörler
| Yer | İçerik |
|---|---|
| Kök | Sitenin kendisi. Derleme adımı yoktur; dosyalar olduğu gibi sunulur. |
| `index.html` | Uygulama: arayüz, yönlendirme, ilerleme kaydı. Betikleri sırayla yükler. |
| `db.js`, `hv.js`, `lk.js`, `ik.js`, `bk.js` | Veri setleri: e-ticaret ve banka, havayolu, yemek teslimatı, İK, bisiklet paylaşımı. |
| `dialect.js` | SQL Server, PostgreSQL, MySQL, Oracle ve BigQuery yazımını SQLite'a çeviren katman. |
| `c1.js` … `c34.js`, `cx.js` | Dersler, patikalar, pratik görevleri, sınavlar. Sonra yüklenen dosya öncekileri yerinde değiştirebilir. |
| `arena-data.js` | Oyun alanı: meydan okumalar, dedektif vakaları, tahmin, bulmaca. |
| `belge.js`, `hesap.js` | Tamamlama belgesi; isteğe bağlı hesap modülü (portföy sürümünde kapalı). |
| `config.js` | Yayın ayarları: yazar, site adresi, Giscus, GoatCounter, geri bildirim formu. |
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
npm install                        # sql.js
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
- Her dersin her SQL alıştırmasını, izin verilen her SQL programında çalıştırır.
- Örnek çözümün hatasız çalıştığını ve beklenen sonucu verdiğini denetler.
- Sonucu `sql_audit.json` dosyasına yazar.
- Son temiz sonuç: `calistirilan 8992`, hata yok.
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
Konu anlatımlarındaki çalıştırılabilir örnekleri bütün programlarda çalıştırır. Son temiz sonuç: `kutu 518 calistirma 2412 hata 0`.

### 3. Oyun alanı
```bash
node arena.js            # SETS (küme adları, virgülle) ve IDS (kimlik düzenli ifadesi) ile daraltılabilir
```
Meydan okumaları, dedektif vakalarını, tahmin ve bulmacaları denetler. Son temiz sonuçta `PROBLEMS 0` yazar (`sonuclar/arena.txt`).

### 4. Statik içerik denetimi
```bash
node static.js
```
- Yinelenen kimlik ve başlıkları, patika sırasını, şıkların dağılımını denetler.
- Çıktı uyarı listesidir.
- Son durumda bilinen ve kabul edilmiş uyarılar: `hicbirPatikadaDegil: 1`, `patikaSeviyeGeriDonus: 11`, `ayniCozumluPratik: 8`, `sinavAyniSecenek: 1`. Bu sayılar artarsa bak. Ayrıntılı liste `static.txt` dosyasına yazılır (son hali: `sonuclar/static.txt`).

### 5. Tarayıcı testleri
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
node sweep.js        # oyun alanının bütün öğelerini tarayıcıda açar
node mobsweep.js ders-ik-ucret,data   # verilen sayfaları mobilde açar
node final_check.js  # Hakkında sayfasının ekran görüntüsü
```
- `smoke8.js` başka bir adresi `URL=https://... node smoke8.js` ile dener.
- `pub_test.js` ve `final_check.js` gerçek `config.js` ile çalışır.
- Diğer testler `config.js` dosyasını kendi deneme değerleriyle değiştirerek çalışır.

### 6. Kullanıcı akışı testleri (qa/)
Bu testler 8811 portunu kullanır:
```bash
python3 -m http.server 8811 --directory ../..
cd qa
node sweep3.js pg          # bütün pratik görevleri seçilen programda (tsql, pg, mysql, oracle, bq, sqlite)
node lsweep2.js pg         # dersleri baştan sona çözerek ilerleme
node a11y.js               # ana sayfalardaki tıklanabilir öğelerin taraması
```
`r1`, `r2*`, `r3*`, `m*`, `s*` dosyaları belirli turların kullanıcı senaryolarıdır; ekran görüntülerini `qa/shots/` klasörüne yazar.

### Önerilen sıra (bir değişiklikten sonra)
1. Veri değiştiyse `node make_base.js`.
2. `node run.js`, `node boxes.js`, `node arena.js` ve `node static.js`. Birbirinden bağımsızdırlar; aynı anda da çalışabilirler. Üçü aynı anda çalıştırıldığında, sınırlı sunucu kaynağı olan bir makinede, tam takım yaklaşık 25 dakika sürdü. Geliştirirken `FILTER` ile yalnızca değişen dersleri denetle.
3. Sunucuyu aç; `node smoke8.js` ve `node pub_test.js`.

### Tek seferlik betikler
`t1`–`t7`, `err*`, `dx*`, `probe*`, `dump*`, `smoke`–`smoke7`, `*_c30`–`*_c33`, `acct_test`, `mocksb`, `fix_test` ve benzerleri belirli bir hatayı ya da içerik partisini incelemek için yazıldı. Örnek olarak tutuluyorlar; eski bir duruma göre yazılmış olabilirler.

## Yayına alma
Site `main` dalından sunulur. Bu dalda değişikliği yapıp testleri geçirdikten sonra yalnızca site dosyalarını `main` dalına taşı. `araclar/` ve `NASIL.md` `main` dalına gitmez:
```bash
git checkout main
git checkout kaynak -- index.html c34.js config.js base-*.b64.txt   # değişen site dosyaları
git rm --cached base-<eski-özet>.b64.txt   # veritabanı yenilendiyse eskisini kaldır
git commit -m "..." && git push origin main
git checkout kaynak
```
GitHub Pages bir iki dakika içinde güncellenir.

`sw.js` ağ öncelikli çalışır; ziyaretçiler yeni sürümü bir sonraki açılışta alır. Önbellek sürümünü değiştirmen gerekmez.
