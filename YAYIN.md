# Kesit SQL'i GitHub Pages'te yayınlama

Ücretsiz, hesapsız, portföy amaçlı yayın. Yaklaşık 30–45 dakika sürer. Kod yazman gerekmiyor; yalnızca `config.js` dosyasını düzenleyeceksin.

## 1. Depoyu oluştur ve dosyaları yükle
1. https://github.com adresinde giriş yap → sağ üstte **+ → New repository**.
2. **Repository name:** `kesit-sql` · **Public** seç · README ekleme seçeneğini işaretleme → **Create repository**.
3. Açılan sayfada **uploading an existing file** bağlantısına tıkla.
4. Zip'ten çıkardığın `kesit-sql` klasörünün **içindekilerin tamamını** (klasörün kendisini değil) sürükleyip bırak. `ekran` ve `hesap-secenegi` klasörleri de gelsin. `.nojekyll` dosyası gizli olduğu için görünmeyebilir; görünmezse sorun değil.
5. Alttaki **Commit changes** düğmesine bas.

## 2. Sayfayı aç
1. Depoda **Settings → Pages**.
2. **Source:** *Deploy from a branch* · **Branch:** `main`, klasör `/ (root)` → **Save**.
3. 1–2 dakika sonra sayfanın üstünde adres çıkar: `https://ysfdurak.github.io/kesit-sql/`. Aç; sol altta “SQL motoru hazır” görünmeli.

## 3. Bilgilerin hazır
Adın, unvanın, tanıtımın, LinkedIn ve GitHub adreslerin, sitenin adresi (`https://ysfdurak.github.io/kesit-sql/`), README, lisans dosyaları ve LinkedIn önizleme kartının etiketleri zaten dolduruldu. Değiştirmek istersen depoda `config.js` dosyasını aç → sağ üstteki kalem simgesi (**Edit**) → düzenle → **Commit changes**; bir iki dakika içinde siteye yansır.

**Önemli:** Bu adresler GitHub kullanıcı adının `ysfdurak` ve deponun adının `kesit-sql` olduğunu varsayıyor. Depoyu başka bir adla açarsan `config.js`, `index.html` (en üstteki `og:image` ve `og:url` satırları) ve `README.md` içindeki adresleri de değiştir.

Site yayına girdikten sonra https://www.linkedin.com/post-inspector/ sayfasına sitenin adresini yazıp paylaşım önizleme kartını kontrol edebilirsin.

## 4. Geri bildirim formu (Google Forms)
1. https://forms.google.com → boş form. Başlık: *Kesit SQL geri bildirim*.
2. Sorular:
   - **Ders** (kısa yanıt)
   - **Ne oldu?** (çoktan seçmeli: Hata buldum / Anlatım eksik ya da anlaşılmaz / Öneri / Diğer)
   - **Ayrıntı** (paragraf)
   - **Sana ulaşmamı ister misin? İstersen e-posta adresin** (kısa yanıt, isteğe bağlı)
3. Ayarlar → Yanıtlar: **E-posta adreslerini toplama** kapalı olsun.
4. Sağ üstte **⋮ → Önceden doldurulmuş bağlantı al** → **Ders** alanına tam olarak `{ders}` yaz → **Bağlantı al → Bağlantıyı kopyala**.
5. `config.js` içinde `feedbackFormUrl` alanına bu bağlantıyı yapıştır.

## 5. Ders yorumları (Giscus)
1. Depoda **Settings → General → Features → Discussions** kutusunu işaretle.
2. **Discussions** sekmesinde kategori düzenleme simgesinden yeni kategori aç: Ad: `Dersler`, biçim: **Announcement**. Bu biçimde yeni başlığı yalnızca sen ve Giscus açabilir, ziyaretçiler yalnızca yorum yazar.
3. https://github.com/apps/giscus → **Install** → yalnızca `kesit-sql` deposunu seç.
4. https://giscus.app/tr sayfasında:
   - **Depo:** `ysfdurak/kesit-sql`
   - **Sayfa ↔ Tartışma eşlemesi:** *Tartışma başlığı belirli bir terimi içersin*
   - **Kategori:** `Dersler`
   - Sayfanın altında oluşan kodda `data-repo-id` ve `data-category-id` değerlerini kopyala.
5. `config.js` içindeki `giscus` alanını doldur:
   ```js
   giscus: { repo: 'ysfdurak/kesit-sql', repoId: 'R_...', category: 'Dersler', categoryId: 'DIC_...' },
   ```
Her ders için ilk yorum yazıldığında o derse ait tartışma başlığı (`ders-<ders-kodu>`) otomatik açılır.

## 6. Ziyaretçi sayacı (GoatCounter)
GitHub Pages ziyaretçi istatistiği vermez (depodaki Insights → Traffic yalnızca deponun kendi sayfasını sayar). Bunun için GoatCounter: ticari olmayan kullanımda ücretsiz, çerez kullanmaz, onay bandı gerektirmez.
1. https://www.goatcounter.com → **Sign up**. **Code** alanına kısa bir ad yaz (ör. `kesitsql`); panelin adresi `https://kesitsql.goatcounter.com` olur.
2. `config.js` içinde `goatcounter: 'kesitsql'` yaz (yalnızca kod, adresin tamamı değil) → **Commit changes**.
3. Siteyi aç, birkaç sayfa gez; birkaç dakika içinde panelde görünür.

Panelde göreceklerin:
- **Sayfalar:** her ders, patika ve oyun ayrı satır (ör. `#ders-group-by · GROUP BY: gruplara göre özet`), görüntülenme ve tekil ziyaretçi sayısı.
- **Olaylar:** `karsilama/yeni` (Hiç bilmiyorum'u seçenler), `ders-bitti/<ders>` (bitirilen dersler), `seviye-testi/<seviye>`, `geri-bildirim-acildi`. “Kaç kişi geldi, kaçı ilk dersi bitirdi, en çok hangi dersler bitiyor?” sorularının cevabı burada.
- **Nereden geldiler:** LinkedIn, GitHub, arama motoru; ayrıca ülke, tarayıcı, cihaz ve ekran boyutu.
Kişiyi tanımlayan bir bilgi tutulmaz; ziyaretçi kimin olduğunu göremezsin, yalnızca toplu sayıları görürsün.

## 7. Yayından sonra kontrol listesi
- [ ] Sayfa açılıyor, “SQL motoru hazır” yazıyor.
- [ ] **Veri Seti → Pedal İzmir** sayfası “yaklaşık 116.000 satırlık” diyor (büyük veritabanı yüklendi).
- [ ] “Hiç bilmiyorum” → ilk ders → **Kontrol et** çalışıyor.
- [ ] Hakkında sayfasında adın ve bağlantıların doğru.
- [ ] Bir derste **Geri bildirim** formu, ders adı dolu olarak açılıyor.
- [ ] Bir dersin konu anlatımının altında yorum alanı görünüyor; deneme yorumu yaz, sonra sil.
- [ ] Profil → **İlerlemeyi dosyaya kaydet** dosya indiriyor, **Dosyadan yükle** geri yüklüyor.
- [ ] GoatCounter panelinde ziyaretin göründü.
- [ ] Telefondan da aç; tarayıcı menüsünde “Uygulamayı yükle / Ana ekrana ekle” çıkıyor.
- [ ] LinkedIn Post Inspector'da önizleme kartı görünüyor.

## 8. LinkedIn'de portföy olarak
- Profilinde **Öne çıkanlar (Featured) → Bağlantı ekle** → sitenin adresi. Başlık: *Kesit SQL: tarayıcıda çalışan Türkçe SQL eğitimi*. Görsel olarak `ekran/alistirma.png` kullanabilirsin.
- İstersen **Projeler** bölümüne de ekle: ne yaptığını, kaç ders/alıştırma olduğunu, hangi kararları aldığını iki üç cümleyle yaz.

## Güncelleme
Bir dosyayı değiştirmek için depoda dosyayı aç → kalem simgesi → düzenle → **Commit changes**. Birden çok dosya için **Add file → Upload files** ile aynı adlı dosyaları yeniden yükle; eskilerinin yerine geçer.

## İleride hesap sistemi istersen
`hesap-secenegi/` klasöründe Supabase ile hesaplı kullanımın rehberi (`KURULUM.md`), veritabanı dosyası ve aydınlatma metni taslağı var. Hesap açılırsa kişisel veri işlenmeye başlanır; o zaman KVKK yükümlülükleri doğar.
