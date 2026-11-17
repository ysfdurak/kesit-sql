# İngilizce tanıtım turu

Bu uygulama Türkçe konuşanlar için yazıldı ve **çevrilmedi**. İngilizce okuyan bir ziyaretçi (ör. ysfdurak.com'un İngilizce sürümünden gelen bir işveren) uygulamayı yine de anlayabilsin diye üstüne ince bir tanıtım katmanı eklendi.

## Ziyaretçi ne görür?

| Adres | Sonuç |
| --- | --- |
| `https://ysfdurak.github.io/kesit-sql/?lang=en` | Tur açılır ve aynı sekmede gezerken açık kalır (`sessionStorage` anahtarı `kesit_lang`); ana sayfada açılan tur uygulamalara geçince de sürer. Yeni bir ziyarette uygulamalar yine Türkçe açılır. |
| `https://ysfdurak.github.io/kesit-sql/?lang=tr` | Tur kapanır. Paneldeki **Turn off** bağlantısı da aynı işi yapar. |

Tur açıkken sağ altta **English guide** paneli bulunulan bölümün ne işe yaradığını anlatır; menü, kart ve başlıkların altında küçük İngilizce karşılıklar görünür. Türkçe metin yerinde kalır. Kullanıcı bir alana yazmaya başlayınca panel küçülür; yazdırırken görünmez. Tur kapalıyken uygulamada hiçbir şey değişmez.

## Dosya

Her şey `en-tour.js` içindedir. Dosya iki parçadır:

1. **`CONFIG` (üst kısım, bu uygulamaya özel):**
   - `intro`: ilk açılışta gösterilen tanıtım paragrafı.
   - `gloss`: Türkçe metin → İngilizce karşılık sözlüğü. Anahtar ekranda görünen metindir (baştaki simge ve sondaki ok atılır).
   - `glossSelector`: karşılık eklenecek öğeleri seçen CSS seçicisi.
   - `guide`: bölüm anahtarı → `{ t: başlık, p: açıklama, try: denenecek adım }`.
   - `route` / `clickRoute`: hangi bölümde olunduğunu bulan fonksiyonlar.
2. **Motor (alt kısım, “Tur motoru” yorumundan sonrası):** İngilizce Atölyesi, dört Kesit uygulaması ve Kesit ana sayfasında birebir aynıdır.

## Nasıl çalışır? (kod rehberi)

- **Açma/kapama:** Dosyanın ilk satırları adresteki `?lang=` değerine bakar. Tur açılmamışsa hiçbir şey yapmadan çıkar.
- **Karşılıklar:** `MutationObserver` sayfadaki değişiklikleri izler. `glossSelector` ile seçilen bir öğenin metni `gloss` sözlüğünde varsa altına `<span class="en-gloss">` eklenir; öğe `data-en-gloss` ile işaretlenir ki iki kez eklenmesin.
- **Bölüm tespiti:** Uygulama adres çubuğundaki `#` kısmına göre ekranı bulur (ör. `#curr`, `#/lessons`, `#library`); ders ekranları `lesson` anahtarına düşer. Farklı adlar `alias` tablosunda tek anahtara bağlanır.
- **Yeni bir karşılık eklemek:** `gloss` içine `'Türkçe metin': 'English text'` satırı ekle.
- **Yeni bir bölüm açıklamak:** `guide` içine bölüm anahtarıyla `{ t, p, try }` ekle.

## Service worker ve yayın

`sw.js` önbellek listesini `index.html`'deki betiklerden okur; önbellek sürümü `kesit-sql-v17` oldu. `release-manifest.json` içinde `index.html`, `sw.js` ve `en-tour.js` özetleri güncellendi.


## Üretim

Bu dosya elle düzenlenmez. Dört Kesit uygulamasının ve Kesit ana sayfasının `en-tour.js` dosyaları, ana sayfa deposundaki (`ysfdurak/ysfdurak.github.io`) `araclar/en-tour/kesit-tours.mjs` betiğiyle üretilir: metni orada değiştir, `node araclar/en-tour/kesit-tours.mjs` çalıştır, çıkan dosyayı ilgili depoya kopyala. Tur seçimi (`kesit_lang`) aynı adreste (ysfdurak.github.io) çalışan bütün Kesit uygulamalarında ortaktır: ana sayfada açılan tur, aynı sekmede uygulamalara geçince de açık kalır.
