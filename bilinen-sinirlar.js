/* Veri setleri sayfasındaki "Bilerek bırakılanlar ve bilinen sınırlamalar" bölümünün metinleri. Üç uygulamada aynı metin; sayılar son veriden hesaplandı.
   Anahtarlar: market, bank, hava, kurye, ik, bisiklet. Değer: { bilerek: [...], sinir: [...] }. */
window.KESIT_SINIRLAR = {
 "market": {
  "bilerek": [
   "raw_signups (52 satır) kirli bırakıldı: boşluk, büyük ve küçük harf karışıklığı, tekrar ve karışık tarih biçimi temizlik pratiği içindir.",
   "2023 satışlarının birim fiyatı liste fiyatının %10 altındadır (550 satış satırı); 2022 ve 2024 satışları liste fiyatındadır. Üreteçte bilinçli, ama gerçek bir fiyat politikası gibi yorumlama."
  ],
  "sinir": [
   "Kesit SQL ile Kesit Power BI aynı şirketi ve aynı siparişleri kullanır: sipariş, müşteri, ürün, adet ve tarih aynı, ciro iki tarafta da 1.346.189,85. Power BI modeli hedef, gider, talep, tedarik ve proje tablolarıyla zenginleştirildi. Kesit Python ikisini de ayrı veri seti olarak verir: Anadolu Market ve Anadolu Market (Power BI modeli).",
   "İki model birebir aynı değildir. Ürün stoğu 40 üründe de farklıdır (toplam 5.682 ve 311). web_events (1.412 satır) ile WebOlaylari (2.019 satır) ayrı verilerdir. 28-31 Aralık 2024'teki 8 satış satırının durumu farklıdır (delivered 1.269, shipped 120; Teslim Edildi 1.261, Kargoda 128). Departman sayısı 7 ve 8'dir.",
   "order_id kronolojik değildir: siparişler müşteriye göre yazıldığı için ardışık 909 geçişin 120'sinde tarih geri gider. Son siparişi en büyük numaradan değil, tarihten bul.",
   "web_events fazla temizdir: 600 kullanıcının her biri her olay türünde en çok bir kez görünür, huni sırası hiç bozulmaz. Tekilleştirme ve sıra tuzakları burada görünmez; gerçek veride bekle."
  ]
 },
 "bank": {
  "bilerek": [
   "5 hesabın kapanış tarihi açılış tarihinden önce.",
   "172 hareket hesabın açılışından önce, 84 hareket kapanışından sonra görünür.",
   "231 hesap-ayda kart harcaması limiti aşar.",
   "Bunlar veri kalitesi pratiği içindir: silmeden say ve raporla."
  ],
  "sinir": [
   "Havale, ATM ve fatura tutarları aralık içinde düz dağılır: havale çıkışı 500 ile 20.000 TL arasında, medyan 10.300, çarpıklık yok. Gerçek işlem tutarları sağa çarpıktır; histogram ve aykırı değer yorumunu bu veriden genelleme."
  ]
 },
 "hava": {
  "bilerek": [
   "hv_delays bir seferde birden çok neden taşır: 1.350 satır 1.228 seferi anlatır. Doğrudan sayarsan seferler iki kez girer.",
   "62 iptal seferde gerçek zamanlar, 9 yön değiştiren seferde gerçek varış boştur."
  ],
  "sinir": [
   "Uçak ataması rastgeledir: iptaller dışında 3.111 seferin 632'si aynı uçağın başka bir seferiyle zaman olarak çakışır. Örnek: TC-KMA, 16 Eylül 06:00'da iki ayrı rotada.",
   "Rotasyon bitişik değildir: ardışık 3.158 geçişin yalnız 741'inde (%23) uçak son indiği yerden kalkar.",
   "Bu yüzden uçak rotasyonu, dönüş süresi ve rötar zinciri dersleri yöntemi gösterir; çıkan sayılar gerçek filo analizi değildir. gec_gelen_ucak nedeni (510 kayıt) uçak takibiyle doğrulanamaz.",
   "Aynı seferde aynı koltuğa iki geçerli rezervasyon düşen 20 sefer-koltuk çifti var."
  ]
 },
 "kurye": {
  "bilerek": [
   "Kurye 47, 214 numaralı müşterinin davet zinciri ve Aralık iadeleri soruşturma vakalarının izleridir, hata değildir. Boş kurye puanı ve imkânsız kısa teslimler de bu vakanın parçasıdır.",
   "comment serbest metindir: yazım hatası, Türkçe karaktersiz yazım ve büyük harf vardır; 3.979 değerlendirmenin 2.366'sında yorum bulunur. Puanla ilişkisi gürültülüdür: yüksek puanda şikâyet, düşük puanda övgü görebilirsin."
  ],
  "sinir": [
   "Yorumlar hayalidir ve yaklaşık 300 metinlik bir havuzdan seçilir: 2.366 yorumda 275 farklı metin vardır, tekrarlar gerçek bir platformdan fazladır. Metin analizini yöntem için kullan, sonuçları gerçek müşteri davranışı sanma.",
   "Davet tarihleri tutarlı değildir: 294 davetli müşterinin 136'sı onu davet edenden önce kaydolmuş görünür.",
   "30 restoranın hiçbiri kapanmamıştır (is_active hep 1), 3 restoranda platforma katılma tarihi boştur."
  ]
 },
 "ik": {
  "bilerek": [
   "123 ayrılmış çalışanın ayrılış tarihinden sonra 129 maaş kaydı (114 ara zam, 15 terfi) ve 17 görev kaydı var; bu 17 satırda end_date, start_date'ten önce. Veri kalitesi pratiği içindir.",
   "Bir takım lideri değerlendirmelerinin çoğunda 5 verir: değerlendirici etkisi bilinçlidir."
  ],
  "sinir": [
   "2019 öncesinde ayrılanlar veride yoktur (hayatta kalan yanlılığı); kohort analizini 2019 ve sonrasıyla sınırla.",
   "Maaş bantları 2024 maaşlarından hesaplandı; önceki yılların maaşını bu banda bölme.",
   "En az 7 izin kaydı ayrılıştan önce başlar ama gün sayısı ayrılış tarihini aşar."
  ]
 },
 "bisiklet": {
  "bilerek": [
   "116.517 yolculuğun 316'sı kapanmamıştır: bitiş istasyonu, bitiş zamanı, mesafe ve ücret boştur.",
   "Doğum yılı ve cinsiyet bazı kullanıcılarda boştur."
  ],
  "sinir": [
   "Bisiklet ataması rastgeledir: her bisikletin yolculukları sıralanınca 18.493 yolculuk önceki yolculuk bitmeden başlar. Power BI paketi bunu veri kalitesi örneği olarak da kullanır.",
   "700 bisikletin yalnız 300'ü yolculuklarda geçer.",
   "Yolculukların %98,5'i bisikletin son bıraktığı istasyondan başlamaz; bisiklet konumu izlenmemiştir.",
   "Bakım yapaydır: her bisiklete tam 2 kayıt düşer (1.400 kayıt, hiç yola çıkmayan 400 bisiklet dahil) ve bakım açıkken başlayan 8.455 yolculuk görünür.",
   "İstasyon net akışı hesaplanabilir ama fiziksel anlamı yoktur: konum zinciri tutmadığı için dengeleme ve kamyon rotası kararı bu veriden çıkarılamaz. Bu dersler ve görevler yöntemi öğretir."
  ]
 }
};
