/* Veri setleri sayfasındaki "Bilerek bırakılanlar ve bilinen sınırlamalar" bölümünün metinleri. Üç uygulamada aynı metin; sayılar son veriden hesaplandı.
   Anahtarlar: market, bank, hava, kurye, ik, bisiklet, ops (ops yalnız Kesit SQL'de). Değer: { bilerek: [...], sinir: [...] }. */
window.KESIT_SINIRLAR = {
 "sis": {
  "bilerek": [
   "etl_stg_hareket içinde bozuk tutar, bozuk tarih, boş hesap, mükerrer kayıt ve boyutta olmayan şube bilerek var.",
   "Engelleme anlık görüntüsünde tepedeki oturum boşta: sys.dm_exec_requests içinde görünmez, bu bilerek öğretilen tuzaktır.",
   "IX_accounts_durum indeksinin kullanım satırı yok, ilgaz_arsiv günlük zinciri bir yerde kırık, ilgaz_portal günlük yedekleri bir gece iki saat durmuş."
  ],
  "sinir": [
   "Bütünüyle kurgu: elle kuruldu, gerçek bir sistemden alınmadı. Sayılar ölçüm değildir.",
   "Görünümlerin yalnız seçili sütunları var. Motor gerçek DMV, BACKUP, GRANT, SQL Agent çalıştırmaz; kopyası olmayan görünüm hata verir.",
   "sys.dm_exec_sql_text ve sys.dm_db_index_physical_stats gerçekte işlevdir; burada tabloya çevrilir, parametreleri yok sayılır.",
   "Motor birleştirmeli view'e doğrudan yazdırmaz; gerçek sunucu tek tablonun sütununa dokunan UPDATE'e izin verir. Tetikleyici satır başına çalışır, gerçek sunucuda ifade başınadır. Bir hata bütün çalıştırmayı durdurur; gerçek sunucuda XACT_ABORT kapalıyken sonraki satır sürer.",
   "GRANT, BACKUP, ALTER INDEX, UPDATE STATISTICS, DBCC gibi komutlar burada çalışmaz, ekranda 'Bu motor desteklemiyor' yazar; yazımın yanlış olduğu anlamına gelmez. sys.indexes yalnız object_id, index_id ya da fill_factor geçen sorguda kurgu kopyaya gider, yoksa motorun kendi indekslerini gösterir."
  ]
 },
 "ops": {
  "bilerek": [
   "Tek sorunun iki nedeni var: Salı 12 Kasım sabahı rapor sorgusunun planı değişiyor ve aynı sabah portal sürümüyle pahalı bir sorgu geliyor. Süre bütün sorgularda artar, okunan sayfa yalnız bu ikisinde.",
   "Yanıltıcı örüntüler bilerek kondu: kapalı svc_eski hesabının 30 dakikada bir başarısız girişi, pazar gecesi ETL'in müşterileri sırayla okuması, an_selin'in üç yazım hatası, an_derya'nın cumartesi girişi.",
   "Parola deneme, ardışık okuma ve arama kutusu denemesi aynı kişiye bağlanamaz: portal kayıtlarında görünen adres uygulama sunucusudur."
  ],
  "sinir": [
   "Bütünüyle kurgu: tohumlu üreteçten gelir, gerçek bir sistemden alınmadı. Süre ve okuma değerleri ölçüm değildir, bu sayıları gerçek bir SQL Server'a taşıma.",
   "IP adresleri özel ağ (10.0.0.0/8) ve belgeleme (203.0.113.0/24) aralıklarındandır.",
   "ops_plan_stats, Query Store'u basitleştirerek taklit eder; gerçek katalog görünümleri değildir. Uygulama motoru SQLite olduğu için günlükte yazan sorgular çalıştırılmaz, metin olarak incelenir.",
   "Bu veri yalnız Kesit SQL'dedir; Kesit Power BI ve Kesit Python'da yoktur."
  ]
 },
 "market": {
  "bilerek": [
   "raw_signups (52 satır) kirli bırakıldı: boşluk, büyük ve küçük harf karışıklığı, tekrar ve karışık tarih biçimi temizlik pratiği içindir.",
   "2023 satışlarının birim fiyatı liste fiyatının %10 altındadır (550 satış satırı); 2022 ve 2024 satışları liste fiyatındadır. Üreteçte bilinçli, ama gerçek bir fiyat politikası gibi yorumlama.",
   "web_events içinde tam 40 olay iki kez gönderilmiştir (aynı kullanıcı, tür, zaman ve cihaz; 8'i purchase). 24 kullanıcıda istemci saati kaymış, iki huni adımının zamanı yer değiştirmiştir; 17 kullanıcının ilk ürün görüntülemesi ilk ziyaretinden önce görünür. Tekilleştirme ve sıra denetimi içindir: silmeden say ve raporla."
  ],
  "sinir": [
   "Kesit SQL ile Kesit Power BI aynı şirketi ve aynı siparişleri kullanır: sipariş, müşteri, ürün, adet ve tarih aynı, ciro iki tarafta da 1.346.189,85. Power BI modeli hedef, gider, talep, tedarik ve proje tablolarıyla zenginleştirildi. Kesit Python ikisini de ayrı veri seti olarak verir: Anadolu Market ve Anadolu Market (Power BI modeli).",
   "İki model birebir aynı değildir. Ürün stoğu 40 üründe de farklıdır (toplam 5.682 ve 311). web_events (2.819 satır) ile WebOlaylari (2.019 satır) ayrı verilerdir. 28-31 Aralık 2024'teki 8 satış satırının durumu farklıdır (delivered 1.269, shipped 120; Teslim Edildi 1.261, Kargoda 128). Departman sayısı 7 ve 8'dir.",
   "order_id kronolojik değildir: siparişler müşteriye göre yazıldığı için ardışık 909 geçişin 120'sinde tarih geri gider. Son siparişi en büyük numaradan değil, tarihten bul.",
   "web_events'te tekrar ziyaret ve tekrar olay vardır (2.819 satır, 600 kullanıcı), oturum numarası yoktur. Huni tekil kullanıcıyla sayılır: 600, 453, 183, 109, 67. Bu tablo orders ile bağlı değildir: kullanıcı numaraları müşteri numaralarıyla eşleşmez."
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
   "Uçak zinciri iki tabloyla tamamlanır: hv_flights yanında 443 boş konumlandırma uçuşu hv_repositioning tablosundadır (719 saat, yolcu uçuşlarının blok saatinin %11'i). Sefer saatleri 15 uçak için dengesizdir, bu kadar boş uçuş gerçek bir havayolu için yüksektir. Yalnız hv_flights'a bakarsan 433 kopukluk görürsün, iptaller dahil 502.",
   "Yön değiştiren 9 seferden sonra uçağın hedefe dönüşü kayıtlı değildir; uçak, sonraki seferinden önce en az 4 saat o havalimanına dönmüş sayılır.",
   "İptal seferin uçağı planlanan uçaktır, uçağı taşımaz. 62 iptalin 32'sinde planlanan uçak kalkış saatinde başka havalimanındadır.",
   "gec_gelen_ucak (342 satır) yalnız aynı uçağın önceki seferi en az 15 dakika geç indiyse yazılır. Filo seyrek uçtuğu için önceki iniş ile planlanan kalkış arası medyan 472 dakikadır; uçağın planlanan saatte gerçekten hazır olmadığı satır 12'dir. Rötar zinciri ölçülebilir ama nedensellik zayıftır: önceki sefer geç indiyse sonraki sefer %48,0, zamanında indiyse %32,6 oranında geç kalkar.",
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
   "116.517 yolculuğun 316'sı kapanmamıştır: bitiş istasyonu, bitiş zamanı, mesafe ve ücret boştur. Bisikleti saha ekibi 9-83 saat içinde toplar; bu hareket bk_rebalancing'de from_station = başlangıç istasyonu ile görünür.",
   "Tam 25 çift yolculukta aynı bisiklet aynı anda iki yolculukta görünür (4'ü 1-3 Haziran arasında). Kayıt hatasıdır, veri kalitesi pratiği içindir; konum zincirini bozmaz.",
   "Doğum yılı ve cinsiyet bazı kullanıcılarda boştur."
  ],
  "sinir": [
   "Bisiklet son bıraktığı istasyondan kalkar ve bakımdayken yola çıkmaz; bu, kamyonet taşımalarıyla birlikte geçerlidir: bk_rebalancing 28.180 satır, 7.422 yük, yük başına ortalama 3,8 bisiklet (2.039 yük tek bisiklet). Benzetim günde iki turla çalışır ve talebi önceden bilir, gerçek bir operasyon bu kadar isabetli olmaz.",
   "Kullanıcı hiç boş istasyonla karşılaşmaz: bisiklet bulamadığı için başlamayan yolculuk veride yoktur, karşılanmayan talep ölçülemez.",
   "700 bisikletin hepsi yola çıkar (bisiklet başına en az 44, medyan 168, en çok 219 yolculuk). Aynı anda yolda en çok 101 bisiklet olur, geri kalanı istasyonda bekler. Günde iki turla filo 660'a indiğinde elektrikliler yetmez, çünkü tip korunur.",
   "Kısa süreli yuva taşması vardır: 349 anda istasyondaki bisiklet sayısı yuva sayısını aşar (bakımdaki bisiklet yuva tutmaz).",
   "Bakım 1.400 kayıttır, 690 bisiklete 1-6 kayıt düşer, yolculuk sayısıyla ilişkisi zayıftır (korelasyon 0,32). 60 kayıt açıktır, bu bisikletler dönem sonuna kadar servis dışıdır."
  ]
 }
};
