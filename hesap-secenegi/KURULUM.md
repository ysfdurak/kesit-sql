# Kesit SQL: hesaplı yayın kurulumu

Bu rehber, uygulamayı kendi alan adında, kullanıcı hesaplarıyla yayınlamak için gereken adımları sırayla anlatır. Toplam süre yaklaşık 1–2 saat. Kod yazman gerekmiyor; yalnızca bir dosyaya iki değer yazacaksın.

**Ne kuruyoruz?**
- **Site:** `site/` klasöründeki dosyalar. Sunucu kodu yok; herhangi bir sabit site barındırma hizmetinde çalışır.
- **Hesap ve veritabanı:** Supabase. Giriş (e-posta bağlantısı / kodu, istersen Google) ve kullanıcı başına tek satırlık ilerleme kaydı.
- İlerleme her zaman önce tarayıcıda tutulur; girişliyken birkaç saniye içinde hesaba yazılır. İnternet kesilse de uygulama çalışmaya devam eder.

---

## 1. Supabase projesi aç
1. https://supabase.com adresinde hesap aç ve **New project** de.
2. Ad: `kesit-sql`. Veritabanı şifresini güvenli bir yere kaydet.
3. **Region:** Avrupa'da bir bölge seç (ör. *Central EU – Frankfurt*). Bu, aydınlatma metnindeki "yurt dışına aktarım" bölümünü de belirler.
4. Proje hazır olunca **SQL Editor → New query** aç, `supabase.sql` dosyasının tamamını yapıştır ve **Run** de. "Success" görmelisin.

## 2. Uygulamayı Supabase'e bağla
1. **Project Settings → API** sayfasından iki değeri kopyala: **Project URL** ve **anon public** anahtarı.
2. `site/config.js` dosyasını aç ve bu iki değeri yaz:
   ```js
   supabaseUrl: 'https://xxxxxxxx.supabase.co',
   supabaseAnonKey: 'eyJhbGciOi...',
   ```
   Bu anahtar tarayıcıda görünecek şekilde tasarlanmıştır; verileri 1. adımda kurduğun güvenlik kuralları korur. **service_role** anahtarını asla bu dosyaya yazma.

## 3. Giriş e-postasını ayarla
1. **Authentication → URL Configuration**
   - **Site URL:** sitenin adresi (ör. `https://kesitsql.com`).
   - **Redirect URLs:** aynı adresi `https://kesitsql.com/**` biçiminde ekle. Önce geçici bir adreste deneyeceksen onu da ekle.
2. **Authentication → Emails → Templates → Magic Link** şablonunu Türkçeleştir ve 6 haneli kodu da ekle. Kod, kullanıcı e-postayı başka bir cihazda açtığında işe yarar:
   - Konu: `Kesit SQL giriş bağlantın`
   - İçerik:
     ```html
     <h2>Kesit SQL'e giriş</h2>
     <p>Giriş yapmak için bağlantıya tıkla:</p>
     <p><a href="{{ .ConfirmationURL }}">Giriş yap</a></p>
     <p>Ya da uygulamaya bu kodu yaz: <b>{{ .Token }}</b></p>
     <p>Bu isteği sen yapmadıysan e-postayı yok sayabilirsin.</p>
     ```
   **Confirm signup** şablonuna da aynı içeriği koy; ilk girişte bu şablon kullanılabilir.
3. **Gerçek kullanıcılara açmadan önce kendi e-posta servisini bağla.** Supabase'in yerleşik e-postası yalnızca deneme içindir ve saatte çok az e-posta gönderir. **Authentication → Emails → SMTP Settings** bölümünden Resend, Brevo, Amazon SES gibi bir servisin SMTP bilgilerini gir. Gönderen adres alan adından olsun (ör. `giris@kesitsql.com`); servisin istediği DNS kayıtlarını (SPF/DKIM) ekle, yoksa e-postalar istenmeyen klasörüne düşer.

## 4. (İsteğe bağlı) Google ile giriş
1. Google Cloud Console'da bir proje aç → **APIs & Services → OAuth consent screen**'i doldur → **Credentials → Create credentials → OAuth client ID → Web application**.
2. **Authorized redirect URIs:** `https://xxxxxxxx.supabase.co/auth/v1/callback`
3. Oluşan Client ID ve Client secret değerlerini Supabase'de **Authentication → Providers → Google** bölümüne gir ve etkinleştir.
4. `site/config.js` içinde `google: true` yap.
Herkese açmadan önce Google'ın onay ekranı doğrulamasını tamamlaman gerekebilir.

## 5. Aydınlatma metnini tamamla
`site/gizlilik.html` bir **taslaktır**. Köşeli parantezli alanları doldur, metni bir KVKK danışmanına ya da avukata kontrol ettir ve en üstteki "TASLAK" kutusunu sil. Özellikle yurt dışına aktarım (Supabase sunucuları ve e-posta servisi) bölümünü teyit ettir. Uygulamada giriş penceresi bu sayfaya bağlantı verir; kullanıcılar Profil sayfasından verilerini indirebilir ve hesaplarını silebilir.

## 6. Siteyi yayınla
Herhangi bir sabit site hizmeti olur. En kolayları:
- **Cloudflare Pages:** Workers & Pages → Create → Pages → *Upload assets* → `site/` klasörünü sürükle.
- **Netlify:** app.netlify.com → *Add new site → Deploy manually* → `site/` klasörünü sürükle.

Sonra hizmetin **Custom domain** bölümünden alan adını bağla (ör. `kesitsql.com`); HTTPS otomatik gelir. Alan adı değişirse 3.1'deki adresleri de güncelle.

## 7. Yayından sonra kontrol listesi
- [ ] Site açılıyor; sol altta "SQL motoru hazır" yazıyor ve Veri Seti → Pedal İzmir sayfası "yaklaşık 116.000 satırlık" diyor (büyük veritabanı yüklendi).
- [ ] Sol altta **Giriş yap** düğmesi görünüyor.
- [ ] Kendi e-postanla giriş yap: bağlantı da kod da çalışıyor.
- [ ] Bir ders bitir; Supabase → Table Editor → `progress` tablosunda satırın göründüğünü ve `updated_at` alanının güncellendiğini kontrol et.
- [ ] Başka bir cihazda aynı hesapla giriş yap; ilerleme geliyor.
- [ ] Profil → Verilerimi indir ve Hesabımı sil çalışıyor (deneme hesabıyla).
- [ ] gizlilik.html dolduruldu ve TASLAK kutusu silindi.

## Sık sorulanlar
- **Maliyet:** Supabase ve Cloudflare Pages/Netlify'ın ücretsiz katmanları başlangıç için yeterli. Supabase'in ücretsiz projeleri bir hafta hiç kullanılmazsa duraklatılır; kullanıcı açınca bu bir sorun olur. Gerçek kullanıcı geldiğinde ücretli plana geçmeyi planla. Güncel limitleri ve fiyatları Supabase'in fiyat sayfasından kontrol et.
- **Hesap açmadan kullanılabilir mi?** Evet. Giriş yapmayanların ilerlemesi yalnızca kendi tarayıcılarında kalır. İlk girişte o tarayıcıdaki ilerleme hesaba aktarılır.
- **İki cihazda aynı anda çalışılırsa?** İlerleme birleştirilir; biten dersler ve alıştırmalar kaybolmaz, puanlarda büyük olan kalır.
- **Kullanıcı sayısını nasıl görürüm?** Supabase → Authentication → Users. `supabase.sql` dosyasının sonunda örnek bir özet sorgusu da var.
- **Hesap sistemini kapatmak istersem?** `config.js` içindeki iki alanı boşalt; uygulama hesapsız çalışmaya döner.
