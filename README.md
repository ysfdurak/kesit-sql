# Kesit SQL

**Sıfırdan ileri seviyeye Türkçe SQL eğitimi. Kurulum yok, hesap yok.** Tarayıcında gerçek bir veritabanıyla çalışırsın; yazdığın her sorgu anında denetlenir.

**Dene:** https://ysfdurak.github.io/kesit-sql/

![Alıştırma ekranı](ekran/alistirma.png)

## Neler var?
- **245 ders, 1.400'ü aşkın alıştırma, 540 pratik görevi.** İlk sorgudan pencere fonksiyonlarına, sorgu planına, veri ambarına ve mülakat kalıplarına kadar.
- **Altı SQL programı:** SQL Server, PostgreSQL, MySQL, Oracle, BigQuery ve SQLite. Her sorgu seçtiğin programın yazımıyla gösterilir, alıştırmalar o programın kurallarına göre denetlenir.
- **Altı hayali veri seti:** e-ticaret, banka, havayolu, yemek teslimatı, insan kaynakları ve yaklaşık 116.000 satırlık bisiklet paylaşımı.
- **18 kariyer patikası:** veri analisti, SQL Server uzmanı, veri mühendisi, veri bilimci, iş zekâsı, İK analitiği ve diğerleri.
- **Oyun alanı:** gizli testli meydan okumalar, SQL dedektif vakaları, sonuç tahmini, sorgu bulmacaları ve haftalık turnuva.
- Seviye testi, deneme sınavları, aralıklı tekrar ve rozetler.

| Karşılama | Veri setleri | SQL dedektif |
|---|---|---|
| ![](ekran/karsilama.png) | ![](ekran/veri-seti.png) | ![](ekran/dedektif.png) |

## Nasıl çalışıyor?
- Sunucu yok: SQLite, [sql.js](https://github.com/sql-js/sql.js) ile tarayıcıda çalışıyor. Diğer beş programın yazımı bir çeviri katmanıyla SQLite'a aktarılıp çalıştırılıyor.
- İlerleme yalnızca kullanıcının tarayıcısında saklanıyor; Profil sayfasından dosyaya kaydedilip başka cihazda yüklenebiliyor. Kişisel veri toplanmıyor; ziyaretler yalnızca çerezsiz ve anonim olarak sayılıyor (GoatCounter).
- Alıştırmalar, otomatik bir denetim setiyle altı programda çalıştırılarak doğrulanıyor.
- Dış bağımlılık yok: SQL motoru ve yazı tipleri sitenin içinde. Kurulan uygulama internet yokken de son açılan içerikle çalışıyor.
- Bir patikayı bitirenler LinkedIn'de paylaşılabilen bir tamamlama belgesi oluşturabiliyor.

## Geri bildirim
Her dersin başlığının yanında geri bildirim bağlantısı, konu anlatımının altında yorum alanı var. Genel fikirler için bu deponun **Discussions** sekmesini kullanabilirsin.

## Sorumluluk notu
Ücretsiz, ticari olmayan bir eğitim ve portföy projesidir; içerik “olduğu gibi” sunulur. Veri setlerindeki tüm şirketler, kişiler ve kayıtlar hayalidir. Sertifika denemeleri ilgili kurumların resmî sınavları değildir.

## Lisans
- Kullanılan açık kaynak bileşenler: [sql.js](https://github.com/sql-js/sql.js) (MIT), Bricolage Grotesque, IBM Plex Sans ve JetBrains Mono yazı tipleri (SIL Open Font License; lisans metinleri `vendor/fonts/` klasöründe).
- Uygulama kodu: [MIT](LICENSE)
- Ders içerikleri ve veri setleri: [CC BY-NC 4.0](LICENSE-ICERIK.md)
