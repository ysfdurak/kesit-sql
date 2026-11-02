/* Kesit SQL içerik 33: bitirme projeleri ve alıştırma kampları için "Derinleş" bölümleri (brif, çalışma planı, doğrulama, teslim, değerlendirme ölçütü) ve ek görevler */
(function () {
const L = window.SQLP_LESSONS; const LM = id => L.find(l => l.id === id);
const sq = (q, sol, o) => Object.assign({ t: 'sql', q: '<p>' + q + '</p>', sol }, o || {});
const X = (id, list) => { const l = LM(id); if (l) l.ex = (l.ex || []).concat(list); };
const more = (id, html) => { const l = LM(id); if (l) l.body += html; };
const C = (src) => '<pre class="code">' + src.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre>';
const D = (title, html) => `<h2>Derinleş: ${title}</h2>${html}`;
const O = { ord: true };
const BRIF = (kim, metin) => `<div class="note"><b>Brif: ${kim}</b>${metin}</div>`;
const OZET = (metin) => `<div class="tip"><b>Yönetici özeti örneği</b>${metin}</div>`;
const R = (rows) => '<table><tr><th>Ölçüt</th><th>Başlangıç</th><th>İyi</th><th>Mükemmel</th></tr>' + rows.map(r => '<tr>' + r.map(c => '<td>' + c + '</td>').join('') + '</tr>').join('') + '</table>';
const NET = 'oi.quantity * oi.unit_price * (1 - oi.discount)';

/* ---------- proje-temel ---------- */
more('proje-temel', D('işi baştan sona yapmak', `
${BRIF('Satış müdürü', '“Perşembe yıl sonu toplantısı var. Hangi kanala, hangi kategoriye yatırım yapacağımıza karar vereceğiz. Bana tek sayfa yeter: altı sorunun sonucu, her birinin altında bir cümle yorum.”')}
<h3>Çalışma planı</h3>
<ol>
<li><b>Veriyi tanı.</b> Soruya başlamadan önce tablonun kaç satır olduğunu, tarih aralığını ve boş değerleri gör. Aşağıdaki sorgu <code>orders</code> için bunu tek satırda verir: 910 sipariş, 2022-06-22 ile 2024-12-31 arası.</li>
<li><b>Varsayımlarını yaz.</b> Örneğin “2024 = 1 Ocak dahil, 1 Ocak 2025 hariç”, “iptal edilen siparişler de sayılıyor”. Müdür aynı sayıyı başka biçimde hesaplarsa farkın nedenini bu notlar açıklar.</li>
<li><b>Soruyu böl.</b> “Kanal performansı” aslında iki sorudur: kaç sipariş geldi, kaçı iptal oldu? Önce sayıyı, sonra oranı hesapla.</li>
</ol>
${C(`SELECT COUNT(*) AS satir, MIN(order_date) AS ilk_tarih, MAX(order_date) AS son_tarih,
       SUM(CASE WHEN channel IS NULL THEN 1 ELSE 0 END) AS kanal_bos,
       COUNT(DISTINCT status) AS durum_cesidi
FROM orders;`)}
<h3>Kontrol listesi</h3>
<ul>
<li><b>Toplam tutuyor mu?</b> Kanal sayıları toplanınca 2024'ün toplam sipariş sayısını (537) vermeli. Vermiyorsa NULL kanal ya da yanlış tarih aralığı var.</li>
<li><b>Payda doğru mu?</b> Gmail oranında payda tüm müşteriler (150) mi, e-postası bilinenler (139) mi? %31,3 ile %33,8 arasındaki fark bu seçimden doğar; hangisini kullandığını yaz.</li>
<li><b>Uç değerler.</b> Stoğu 0 olan ürün hata mı, gerçekten tükenmiş mi? Fiyatı maliyetinden düşük ürün var mı?</li>
</ul>
<h3>Teslim</h3>
<p>Her soru için küçük bir tablo; kanal karşılaştırmasına sütun grafik yeter. En üste üç cümle:</p>
${OZET('2024\'te 537 sipariş alındı; mobil (235) ve web (224) siparişlerin %85\'inden fazlasını getiriyor. Web\'de iptal oranı %11,2 ile mağazanın (%3,8) yaklaşık üç katı; ödeme ve teslimat adımları incelenmeli. Elektronikte en düşük marj Powerbank\'ta (%31,9); fiyatı ya da tedarikçisi gözden geçirilmeli.')}
<h3>Kendini değerlendir</h3>
${R([
  ['Doğruluk', 'Sorgular çalışıyor', 'Tarih aralığı ve NULL doğru ele alınmış', 'Varsayımlar yazılı, eşitlik bozucu sıralama var'],
  ['Doğrulama', 'Kontrol yok', 'Toplamlar karşılaştırılmış', 'Her oranın paydası açıkça belirtilmiş'],
  ['Sunum', 'Ham sonuç tabloları', 'Her tabloya bir cümle yorum', 'Karara bağlanan üç cümlelik özet']
])}
<p>Aşağıdaki ek görevler, raporu “sayım”dan “karar”a taşıyan iki soru ekliyor.</p>`));
X('proje-temel', [
  sq('<b>Ek görev 1: Kanal kalitesi.</b> 2024 siparişlerini kanala göre say, iptal edilenleri ve iptal oranını (yüzde, 1 basamak) ekle: <code>channel</code>, <code>siparis</code>, <code>iptal</code>, <code>iptal_orani</code>. Sipariş sayısına göre azalan; eşitlikte kanal adına göre.', "SELECT channel, COUNT(*) AS siparis, SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS iptal, ROUND(100.0 * SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) / COUNT(*), 1) AS iptal_orani FROM orders WHERE order_date >= '2024-01-01' AND order_date < '2025-01-01' GROUP BY channel ORDER BY siparis DESC, channel;", Object.assign({ hint: "Koşullu sayım: SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END). Oranın paydası o kanalın tüm siparişleri." }, O)),
  sq('<b>Ek görev 2: Hangi marj?</b> Her kategori için ürün sayısı, ürün marjlarının basit ortalaması ve fiyat ağırlıklı marj (Σ(fiyat − maliyet) × 100 ÷ Σ fiyat), ikisi de yüzde ve 1 basamak: <code>category</code>, <code>urun</code>, <code>basit_marj</code>, <code>agirlikli_marj</code>. Ağırlıklı marja göre artan; eşitlikte kategori adına göre.', 'SELECT category, COUNT(*) AS urun, ROUND(AVG((price - cost) * 100.0 / price), 1) AS basit_marj, ROUND(SUM(price - cost) * 100.0 / SUM(price), 1) AS agirlikli_marj FROM products GROUP BY category ORDER BY agirlikli_marj, category;', Object.assign({ hint: 'Basit ortalamada her ürün eşit ağırlıktadır; ağırlıklı marjda pahalı ürün sonucu daha çok etkiler. İkisi farklı sıralama verebilir.' }, O))
]);

/* ---------- proje-hava ---------- */
more('proje-hava', D('yönetim kuruluna giden rapor', `
${BRIF('Operasyon direktörü ve gelir müdürü', '“Kurul, kış tarifesinde ek yedek uçak ve hava koşulu planı için bütçe isteyip istemeyeceğimize karar verecek. Bize altı slayt lazım; her slaytta bir sayı, bir neden, bir öneri.”')}
<h3>Çalışma planı</h3>
<ol>
<li><b>Dönemi ve tanımları sabitle.</b> Veri 2024-09-01 ile 2024-12-31 arasında 3.173 planlı uçuş içeriyor. “Zamanında” = planlanan kalkıştan en fazla 15 dakika sonra; iptal edilen 62 uçuşun gerçek kalkışı NULL'dır.</li>
<li><b>Tablo grain düzeyini (tanecik) öğren.</b> <code>hv_delays</code>'te bir uçuşun birden fazla rötar satırı olabilir. Aşağıdaki sorgu bunu gösterir: 1.350 satır ama yalnızca 1.228 uçuş.</li>
<li><b>Operasyon ve gelir sorularını ayır.</b> Gelir sorularında yalnızca <code>status = 'flown'</code> rezervasyonlar sayılır; iptal edilen uçuşların rezervasyonları zaten iptal durumundadır.</li>
</ol>
${C(`SELECT COUNT(*) AS satir, COUNT(DISTINCT flight_id) AS ucus, SUM(minutes) AS dakika
FROM hv_delays;`)}
<h3>Kontrol listesi</h3>
<ul>
<li><b>JOIN şişmesi.</b> Uçuşları rötarlarla birleştirip <code>AVG(gecikme)</code> alırsan iki nedenli uçuşlar iki kez sayılır. Uçuş düzeyindeki ölçüyü JOIN'den önce hesapla.</li>
<li><b>Mutabakat.</b> Rötar kayıtlarındaki dakikaların toplamı, aynı uçuşların gerçek kalkış gecikmesine eşit olmalı (Ek görev 1). Eşitse neden dağılımına güvenebilirsin.</li>
<li><b>Payda.</b> OTP'nin paydası kalkan uçuşlardır, iptal oranının paydası planlanan uçuşlar. İkisini karıştırmak oranı birkaç puan oynatır.</li>
<li><b>Küçük hacim.</b> 3 uçuşluk bir rotada 1 iptal %33 eder; bu yüzden en az 20 uçuş eşiği var.</li>
</ul>
<h3>Teslim</h3>
<p>Aylık gecikme için çizgi grafik, rötar nedenleri için yığılmış sütun, riskli rotalar için kısa tablo.</p>
${OZET('Aralık\'ta ortalama kalkış gecikmesi 35,2 dakikaya çıktı (Eylül: 20,2); artışın en büyük kaynakları hava (9.199 dk) ve geç gelen uçak (9.160 dk). Dönem genelinde iptal oranı %1,95, ancak 62 iptalin 24\'ü Aralık\'ta. Kış için GZT–IST hattı (%8,6 iptal) öncelikli izlemeye alınmalı ve geç gelen uçak zincirini kırmak için yedek uçak planlanmalı.')}
<h3>Kendini değerlendir</h3>
${R([
  ['Doğruluk', 'Sonuçlar çıkıyor', 'Paydalar ve iptal hariç tutma doğru', 'JOIN grain düzeyi kontrol edilmiş, mutabakat sıfır fark veriyor'],
  ['Yorum', 'Sayı listesi', 'Her slaytta bir neden', 'Neden + önerilen aksiyon + beklenen etki'],
  ['Sunum', 'Tablolar', 'Uygun grafik türü', 'Kurulun kararına bağlanan tek sayfalık özet']
])}`));
X('proje-hava', [
  sq('<b>Ek görev 1: Rötar mutabakatı.</b> Rötar kaydı olan uçuşlar için tek satırda: uçuş sayısı, kayıtlı rötar dakikalarının toplamı, aynı uçuşların gerçek kalkış gecikmesi toplamı (dakika) ve aradaki fark: <code>ucus</code>, <code>kayitli_dk</code>, <code>gercek_dk</code>, <code>fark</code>.', 'WITH d AS (SELECT flight_id, SUM(minutes) AS dk FROM hv_delays GROUP BY flight_id) SELECT COUNT(*) AS ucus, SUM(d.dk) AS kayitli_dk, SUM(ROUND((julianday(f.actual_dep) - julianday(f.sched_dep)) * 1440)) AS gercek_dk, SUM(d.dk) - SUM(ROUND((julianday(f.actual_dep) - julianday(f.sched_dep)) * 1440)) AS fark FROM d JOIN hv_flights f ON f.flight_id = d.flight_id;', { hint: 'Önce rötarları uçuş düzeyine topla (CTE), sonra uçuşlarla birleştir; böylece JOIN satırları çoğaltmaz.' }),
  sq('<b>Ek görev 2: Doluluk.</b> Gerçekleşen uçuşlarda (<code>landed</code> ve <code>diverted</code>) uçak modeline göre uçuş sayısı ve doluluk oranı (Σ yolcu × 100 ÷ Σ koltuk, 1 basamak): <code>model</code>, <code>ucus</code>, <code>doluluk</code>. Doluluğa göre azalan; eşitlikte modele göre.', "SELECT a.model, COUNT(*) AS ucus, ROUND(100.0 * SUM(f.pax) / SUM(a.seats), 1) AS doluluk FROM hv_flights f JOIN hv_aircraft a ON a.tail_no = f.tail_no WHERE f.status IN ('landed', 'diverted') GROUP BY a.model ORDER BY doluluk DESC, a.model;", Object.assign({ hint: 'Uçuş başına oranların ortalaması yerine toplam yolcuyu toplam koltuğa böl: büyük uçaklar hak ettiği ağırlığı alır.' }, O))
]);

/* ---------- kamp-musteri ---------- */
more('kamp-musteri', D('kampı gerçek bir iş gibi çalışmak', `
<p>Bu on soru ayrı ayrı alıştırma gibi görünür, ama bir arada bir müşteri tabanı raporu oluşturur. Kampı aşağıdaki brifle çözersen hem hız hem iş refleksi kazanırsın.</p>
${BRIF('CRM uzmanı', '“Gelecek ay e-posta ve SMS kampanyası başlatıyoruz. Kaç kişiye ulaşabiliriz, kimler, hangi şehirlerde? Cuma günü bana kısa bir müşteri tabanı kartı gönder.”')}
<h3>Çalışma planı</h3>
<ol>
<li><b>Önce veriyi tanı.</b> <code>COUNT(*)</code> ile <code>COUNT(sütun)</code> arasındaki fark, o sütundaki boş değer sayısıdır. Aşağıdaki sorgu 150 müşteriden 143'ünün şehrinin bilindiğini ve 12 farklı şehir olduğunu gösterir.</li>
<li><b>Soruyu grupla.</b> Filtre soruları (1–4), gruplama soruları (5–6, 8–9) ve dönüşüm soruları (7, 10) ayrı beceriler ister. Takıldığın grubu not et.</li>
<li><b>Varsayımı yaz.</b> Yaş için referans yıl 2024; e-postası boş müşteri kampanyaya giremez.</li>
</ol>
${C(`SELECT COUNT(*) AS satir, COUNT(city) AS sehir_dolu,
       COUNT(DISTINCT city) AS farkli_sehir, COUNT(email) AS email_dolu
FROM customers;`)}
<h3>Kontrol listesi</h3>
<ul>
<li><b>Gruplar toplamı veriyor mu?</b> Yaş gruplarının toplamı 150 olmalı. “bilinmiyor” grubunu unutursan toplam eksik kalır.</li>
<li><b>NULL nereye gitti?</b> <code>WHERE city = 'İzmir'</code> şehri boş olanları zaten dışlar; ama <code>city &lt;&gt; 'İzmir'</code> de onları dışlar. Bu ikinci durum çoğu kişiyi şaşırtır.</li>
<li><b>Yazım farkları.</b> “İzmir” ile “izmir” farklı grup oluşturur; şehir listesine bir kez göz at.</li>
</ul>
<h3>Teslim</h3>
${OZET('150 müşterinin %56,7\'si Bireysel, kalanı Premium ve Kurumsal arasında neredeyse eşit bölünüyor. 11 müşterinin e-postası boş; e-posta kampanyası en fazla 139 kişiye ulaşır. En kalabalık şehir İstanbul (28 müşteri); şehir hedeflemesi için ilk dört şehir tabanın yarıdan fazlasını kapsıyor.')}
<h3>Kendini değerlendir</h3>
${R([
  ['Doğruluk', '10 sorunun 6–7\'si', '10 sorunun hepsi, ipucuyla', 'Hepsi ipucusuz ve ilk denemede'],
  ['NULL farkındalığı', 'Boş değerler gözden kaçmış', 'IS NULL doğru kullanılmış', 'Her sonuçta boşların nereye gittiği açıklanabiliyor'],
  ['Hız', 'Soru başına 10+ dakika', '5 dakika', '2–3 dakika ve kalıp ezberde']
])}`));
X('kamp-musteri', [
  sq('<b>Ek görev 1: Veri kalitesi kartı.</b> Tek satırda: toplam müşteri, şehri boş olan, e-postası boş olan ve aynı e-postayı tekrar kullanan fazla satır sayısı (dolu e-posta sayısı − farklı e-posta sayısı): <code>toplam</code>, <code>sehir_bos</code>, <code>email_bos</code>, <code>email_tekrar</code>.', 'SELECT COUNT(*) AS toplam, SUM(CASE WHEN city IS NULL THEN 1 ELSE 0 END) AS sehir_bos, SUM(CASE WHEN email IS NULL THEN 1 ELSE 0 END) AS email_bos, COUNT(email) - COUNT(DISTINCT email) AS email_tekrar FROM customers;', { hint: 'COUNT(email) boşları saymaz, COUNT(DISTINCT email) tekrarları bir kez sayar.' }),
  sq('<b>Ek görev 2: Segment payı.</b> Her segmentin müşteri sayısı ve tüm müşteriler içindeki payı (yüzde, 1 basamak): <code>segment</code>, <code>musteri</code>, <code>pay</code>. Müşteri sayısına göre azalan; eşitlikte segment adına göre.', 'SELECT segment, COUNT(*) AS musteri, ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM customers), 1) AS pay FROM customers GROUP BY segment ORDER BY musteri DESC, segment;', Object.assign({ hint: 'Payda tüm tablo: (SELECT COUNT(*) FROM customers) alt sorgusu.' }, O))
]);

/* ---------- kamp-eticaret ---------- */
more('kamp-eticaret', D('dört tabloyla güvenli çalışmak', `
${BRIF('Kategori müdürü', '“Gelecek yılın bütçesini kategorilere ve segmentlere dağıtacağız. Hangi kategori ciro getiriyor, hangi müşteri grubu daha değerli? Sayılarının doğru olduğundan emin olmak istiyorum; bütçe buna göre bölünecek.”')}
<h3>Çalışma planı</h3>
<ol>
<li><b>Tanecikliği belirle.</b> <code>orders</code>'ta bir satır bir sipariş, <code>order_items</code>'ta bir satır bir sipariş kalemidir. JOIN'den sonra satır sayısı kalem sayısına çıkar. Aşağıdaki sorgu bunu gösterir: teslim edilen 712 sipariş, birleşince 1.269 satır olur.</li>
<li><b>Ölçüyü doğru düzeyde hesapla.</b> Ciro kalem düzeyinde toplanır; sipariş sayısı <code>COUNT(DISTINCT o.order_id)</code> ile sayılır; müşteri başı ciro için önce müşteri düzeyine toplanır.</li>
<li><b>Durumu sabitle.</b> Ciro = yalnızca <code>delivered</code>. Sipariş sayısında iptaller dahil mi? Soruda yazmıyorsa varsayımını not et.</li>
</ol>
${C(`SELECT COUNT(*) AS satir, COUNT(DISTINCT o.order_id) AS siparis
FROM orders o
JOIN order_items oi ON oi.order_id = o.order_id
WHERE o.status = 'delivered';`)}
<h3>Kontrol listesi</h3>
<ul>
<li><b>Mutabakat.</b> Kategori cirolarının toplamı, kategorisiz hesaplanan toplam teslim cirosuna eşit olmalı. Eşit değilse ürünü eşleşmeyen satır var demektir.</li>
<li><b>Satır sayısı.</b> Her JOIN'den sonra <code>COUNT(*)</code> ile <code>COUNT(DISTINCT anahtar)</code> karşılaştır. Beklenmeyen artış = çoğalma.</li>
<li><b>Kayıp satırlar.</b> INNER JOIN, hiç siparişi olmayan 14 müşteriyi sessizce düşürür. “Müşterilerin yüzde kaçı” gibi sorularda LEFT JOIN gerekir.</li>
<li><b>Uç değer.</b> İndirim 0 ile 0,2 arasında, adet 1–3. Bunların dışında bir değer görürsen veri hatasıdır.</li>
</ul>
<h3>Teslim</h3>
${OZET('2024\'te teslim edilen net ciro 636.316 TL. Sipariş başına sepet segmentler arasında birbirine yakın (1.364–1.625 TL), ama müşteri başına ciro Premium\'da 10.833 TL, Bireysel\'de 3.028 TL. Fark sepet büyüklüğünden değil alışveriş sıklığından geliyor; bütçe sadakat ve tekrar satın alma programlarına kaydırılmalı.')}
<h3>Kendini değerlendir</h3>
${R([
  ['Doğruluk', 'Sorgular çalışıyor', 'Ciro satır düzeyinde, DISTINCT doğru yerde', 'Her sonuç bir mutabakatla doğrulanmış'],
  ['JOIN seçimi', 'Hep INNER JOIN', 'LEFT JOIN gerektiğinde fark ediliyor', 'Kaybolan ve çoğalan satırlar sayıyla gösteriliyor'],
  ['Yorum', 'Tablo', 'Tabloya bir cümle', 'Ölçüler arasındaki farkın nedeni açıklanmış']
])}`));
X('kamp-eticaret', [
  sq('<b>Ek görev 1: Kaç müşteri alışveriş yaptı?</b> Her segment için toplam müşteri, en az bir siparişi olan müşteri ve bunların oranı (yüzde, 1 basamak). Siparişi olmayan müşteriler de paydada olmalı: <code>segment</code>, <code>musteri</code>, <code>siparis_veren</code>, <code>oran</code>.', 'SELECT c.segment, COUNT(DISTINCT c.customer_id) AS musteri, COUNT(DISTINCT o.customer_id) AS siparis_veren, ROUND(100.0 * COUNT(DISTINCT o.customer_id) / COUNT(DISTINCT c.customer_id), 1) AS oran FROM customers c LEFT JOIN orders o ON o.customer_id = c.customer_id GROUP BY c.segment;', { hint: 'LEFT JOIN siparişsiz müşterileri tutar; COUNT(DISTINCT o.customer_id) onların NULL değerini saymaz.' }),
  sq('<b>Ek görev 2: Müşteri başına ciro.</b> 2024\'te teslim edilen siparişlerden, her segmentte alışveriş yapan müşteri sayısı ve müşteri başına ortalama net ciro (tam sayı): <code>segment</code>, <code>musteri</code>, <code>ciro_kisi</code>. Ciroya göre azalan; eşitlikte segment adına göre.', `WITH m AS (SELECT o.customer_id, SUM(${NET}) AS ciro FROM orders o JOIN order_items oi ON oi.order_id = o.order_id WHERE o.status = 'delivered' AND o.order_date >= '2024-01-01' AND o.order_date < '2025-01-01' GROUP BY o.customer_id) SELECT c.segment, COUNT(*) AS musteri, ROUND(AVG(m.ciro), 0) AS ciro_kisi FROM m JOIN customers c ON c.customer_id = m.customer_id GROUP BY c.segment ORDER BY ciro_kisi DESC, c.segment;`, Object.assign({ hint: 'Önce müşteri düzeyine topla (CTE), sonra segment düzeyinde ortalama al. Doğrudan AVG(kalem tutarı) kalem başına ortalama verir.' }, O))
]);

/* ---------- proje-analist ---------- */
more('proje-analist', D('analizi karara bağlamak', `
${BRIF('Pazarlama direktörü', '“Yeni yıl kampanyasının bütçesi sınırlı. Hangi segmente, hangi kategoriyle, hangi kanaldan gideceğimize karar vereceğim. Bana tek sayfalık özet ve kampanyaya alınabilecek müşteri sayısını getir.”')}
<h3>Çalışma planı</h3>
<ol>
<li><b>Veriyi tanı.</b> <code>bank_txns</code> 42.284 hareket, 2024'ün tamamı. Aşağıdaki sorgu türlere göre adedi, toplamı ve kategorinin boş olduğu satırları verir: işyeri kategorisi yalnızca kart harcamalarında dolu, diğer tüm türlerde NULL. Bu hata değil, tasarım.</li>
<li><b>İşareti sabitle.</b> Harcamalar eksi işaretli; raporda pozitif göstermek için <code>-amount</code> kullan ve bunu not et.</li>
<li><b>Satırın neyi temsil ettiğine karar ver.</b> Müşteri başına ortalama istiyorsan önce müşteri düzeyine topla; bir müşterinin birden fazla hesabı vardır (500 müşteri, 849 hesap).</li>
<li><b>Varsayımlar.</b> “Maaşlı” = yıl içinde en az bir <code>maas</code> hareketi; harcaması olmayan müşteri 0 sayılır.</li>
</ol>
${C(`SELECT txn_type, COUNT(*) AS adet, ROUND(SUM(amount), 0) AS toplam,
       SUM(CASE WHEN merchant_category IS NULL THEN 1 ELSE 0 END) AS kategori_bos
FROM bank_txns
GROUP BY txn_type
ORDER BY adet DESC, txn_type;`)}
<h3>Kontrol listesi</h3>
<ul>
<li><b>Mutabakat.</b> Aylık harcamaların toplamı, segment toplamlarının toplamı ve ham tablodaki kart harcaması toplamı aynı olmalı: 63.840.506 TL (Ek görev 1).</li>
<li><b>JOIN sonrası satır sayısı.</b> Hareket → hesap → müşteri birleşimi hareket sayısını değiştirmemeli (her hareketin tek hesabı var). Müşteri sayarken <code>COUNT(DISTINCT customer_id)</code> kullan.</li>
<li><b>Payda.</b> “Maaş oranı” müşterinin oranıdır, hesabın değil. KOBİ ve Özel Bankacılık'ta oran 0: bu bir hata mı, yoksa bu segmentlerin maaş ödemesi mi yok? Yorumda belirt.</li>
<li><b>Uç değer.</b> Kişi başı harcamada birkaç çok yüksek müşteri ortalamayı yukarı çeker; en büyük 5 değere bak.</li>
</ul>
<h3>Teslim</h3>
<p>Segment özeti tablosu, aylık trend için çizgi grafik, maaşlı/maaşsız için iki sütunluk karşılaştırma.</p>
${OZET('Kart harcaması 2024\'te 63,8 milyon TL; aylık seviye 4,9–5,8 milyon TL bandında, belirgin bir mevsimsellik yok. Bireysel segmentte maaş müşterileri yılda kişi başı 134.992 TL harcıyor, maaşsızlardan %26 fazla; her segmentte ilk kategori elektronik. Kampanya için pazarlama izni olan, maaşsız ve yıllık 100.000 TL üstü harcayan 49 Bireysel müşteri öncelikli hedef: maaş taşıma teklifi elektronik kampanyasıyla birleştirilmeli.')}
<h3>Kendini değerlendir</h3>
${R([
  ['Doğruluk', 'Adımlar çalışıyor', 'İşaret, payda ve müşteri düzeyi doğru', 'Üç yoldan mutabakat sıfır fark veriyor'],
  ['Analiz', 'Her adım ayrı', 'Adımlar birbirine bağlanmış', 'Bulgular hedef kitle önerisine dönüşmüş'],
  ['Teslim', 'Sorgu dosyası', 'Tablo + grafik', 'Tek sayfa: özet, kitle büyüklüğü, varsayımlar']
])}`));
X('proje-analist', [
  sq('<b>Ek görev 1: Mutabakat.</b> Kart harcamasının (pozitif, tam sayı) ham tablodan hesaplanan toplamı ile hareket → hesap → müşteri birleşiminden sonra hesaplanan toplamını ve farkını tek satırda getir: <code>ham_toplam</code>, <code>segment_toplam</code>, <code>fark</code>.', "SELECT (SELECT ROUND(SUM(-amount), 0) FROM bank_txns WHERE txn_type = 'kart_harcama') AS ham_toplam, (SELECT ROUND(SUM(-t.amount), 0) FROM bank_txns t JOIN bank_accounts a ON a.account_id = t.account_id JOIN bank_customers c ON c.customer_id = a.customer_id WHERE t.txn_type = 'kart_harcama') AS segment_toplam, (SELECT ROUND(SUM(-amount), 0) FROM bank_txns WHERE txn_type = 'kart_harcama') - (SELECT ROUND(SUM(-t.amount), 0) FROM bank_txns t JOIN bank_accounts a ON a.account_id = t.account_id JOIN bank_customers c ON c.customer_id = a.customer_id WHERE t.txn_type = 'kart_harcama') AS fark;", { hint: 'İki skaler alt sorgu yaz; farkı yuvarlanmış iki değer üzerinden al.' }),
  sq('<b>Ek görev 2: Kampanya kitlesi.</b> Bireysel segmentte pazarlama izni olan (<code>kvkk_consent = 1</code>), hiç <code>maas</code> hareketi olmayan ve yıllık kart harcaması 100.000 TL\'den fazla olan müşterilerin sayısı ve toplam harcaması (tam sayı): <code>aday</code>, <code>toplam_harcama</code>.', "WITH c AS (SELECT cu.customer_id, MAX(CASE WHEN t.txn_type = 'maas' THEN 1 ELSE 0 END) AS maasli, COALESCE(SUM(CASE WHEN t.txn_type = 'kart_harcama' THEN -t.amount END), 0) AS harcama FROM bank_customers cu LEFT JOIN bank_accounts a ON a.customer_id = cu.customer_id LEFT JOIN bank_txns t ON t.account_id = a.account_id WHERE cu.segment = 'Bireysel' AND cu.kvkk_consent = 1 GROUP BY cu.customer_id) SELECT COUNT(*) AS aday, ROUND(SUM(harcama), 0) AS toplam_harcama FROM c WHERE maasli = 0 AND harcama > 100000;", { hint: 'Adım 4\'teki müşteri düzeyi CTE\'yi yeniden kullan; filtreyi müşteri düzeyinde uygula.' })
]);

/* ---------- proje-bi ---------- */
more('proje-bi', D('panoya güvenilir veri vermek', `
${BRIF('Genel müdür ve BI ekibi', '“Panoyu her ayın ilk iş günü açıp büyüme ve iptal trendine göre satış ekibinin hedeflerini güncelleyeceğim. Panodaki sayı ile finansın sayısı tutmazsa panoya kimse bakmaz.” BI ekibi ekliyor: “Bize ay düzeyinde, sütun adları sabit tablolar ver.”')}
<h3>Çalışma planı</h3>
<ol>
<li><b>KPI sözlüğünü kilitle.</b> Her ölçüyü bir cümleyle tanımla ve hangi durumların dahil olduğunu yaz (ciro = yalnızca teslim; sipariş = tüm durumlar).</li>
<li><b>Ölçüyü kendi grain düzeyinde hesapla.</b> Sipariş sayısı <code>orders</code>'tan, ciro <code>order_items</code>'tan gelir. İkisini aynı JOIN'de hesaplarsan sipariş sayısı kalem sayısına şişer (Ek görev 1).</li>
<li><b>Boş ayları düşün.</b> Bir ayda hiç değer yoksa GROUP BY o ayı hiç üretmez; panoda çizgi “kopar”. Ek görev 2'de Kasım ve Aralık bu yüzden görünmez.</li>
</ol>
<h3>Kontrol listesi</h3>
<ul>
<li><b>Yıllık mutabakat.</b> Aylık net cirolar toplanınca yıllık toplamı vermeli. Aşağıdaki sorgu yıl düzeyinde hesaplar: 2024 için 636.316 TL; Adım 1'deki 12 ayın toplamı da bu olmalı.</li>
<li><b>Paylar 100'e tamamlanıyor mu?</b> Kanal payları toplamı yuvarlama farkıyla 100,0 olmalı.</li>
<li><b>Payda.</b> Ortalama sepet = ciro ÷ <b>teslim edilen</b> sipariş; tüm siparişe bölmek sepeti küçük gösterir.</li>
<li><b>Uç değer.</b> 2023 Ocak gibi düşük tabanlı aylarda %200+ büyüme normaldir; panoda bu aylar için mutlak farkı da göster.</li>
</ul>
${C(`SELECT strftime('%Y', o.order_date) AS yil,
       COUNT(DISTINCT o.order_id) AS teslim_siparis,
       ROUND(SUM(oi.quantity * oi.unit_price * (1 - oi.discount)), 0) AS net_ciro
FROM orders o
JOIN order_items oi ON oi.order_id = o.order_id
WHERE o.status = 'delivered' AND o.order_date >= '2023-01-01'
GROUP BY strftime('%Y', o.order_date)
ORDER BY yil;`)}
<h3>Teslim</h3>
<p>BI ekibine görünüm(ler) + KPI sözlüğü; genel müdüre panonun üstünde dört KPI kartı ve aylık çizgi grafik.</p>
${OZET('2024 net cirosu 636.316 TL ile 2023\'e göre %89,6 arttı. Son çeyrek yılın %35\'ini getirdi; zirve Kasım (82.740 TL). İptal oranı Nisan\'daki %13,8\'den Aralık\'ta %6,5\'e indi; mobil kanal cironun %47,2\'siyle en büyük pay.')}
<h3>Kendini değerlendir</h3>
${R([
  ['Tanımlar', 'Örtük', 'KPI sözlüğü yazılı', 'Her sütun sözlükle birebir, durum filtreleri açık'],
  ['Doğrulama', 'Yok', 'Yıllık toplam mutabık', 'Tanecik, pay ve boş ay kontrolleri yapılmış'],
  ['Teslim', 'Tek seferlik sorgu', 'Görünüm', 'Görünüm + sözlük + pano taslağı']
])}`));
X('proje-bi', [
  sq('<b>Ek görev 1: Şişme testi.</b> 2024 için tek satırda: <code>orders</code>\'tan sayılan sipariş, <code>order_items</code> ile birleştikten sonraki satır sayısı ve aynı birleşimde tekil sipariş sayısı: <code>siparis</code>, <code>join_satir</code>, <code>tekil_siparis</code>.', "SELECT (SELECT COUNT(*) FROM orders WHERE order_date >= '2024-01-01' AND order_date < '2025-01-01') AS siparis, (SELECT COUNT(*) FROM orders o JOIN order_items oi ON oi.order_id = o.order_id WHERE o.order_date >= '2024-01-01' AND o.order_date < '2025-01-01') AS join_satir, (SELECT COUNT(DISTINCT o.order_id) FROM orders o JOIN order_items oi ON oi.order_id = o.order_id WHERE o.order_date >= '2024-01-01' AND o.order_date < '2025-01-01') AS tekil_siparis;", { hint: 'Üç skaler alt sorgu. join_satir ile siparis arasındaki fark, JOIN\'in ürettiği fazladan satırlardır.' }),
  sq('<b>Ek görev 2: Yeni müşteri KPI\'ı.</b> İlk siparişi (tüm durumlar dahil) 2024\'te olan müşterileri ilk siparişlerinin ayına göre say: <code>ay</code> (YYYY-AA), <code>yeni_musteri</code>. Aya göre sırala.', "WITH f AS (SELECT customer_id, MIN(order_date) AS ilk FROM orders GROUP BY customer_id) SELECT strftime('%Y-%m', ilk) AS ay, COUNT(*) AS yeni_musteri FROM f WHERE ilk >= '2024-01-01' AND ilk < '2025-01-01' GROUP BY strftime('%Y-%m', ilk) ORDER BY ay;", Object.assign({ hint: 'Önce her müşterinin ilk sipariş tarihini bul (MIN), sonra 2024\'e düşenleri aya göre grupla. Filtreyi MIN\'den önce uygularsan eski müşteriler “yeni” görünür.' }, O))
]);

/* ---------- proje-bilimci ---------- */
more('proje-bilimci', D('modele hazır veri teslim etmek', `
${BRIF('Risk ekibi lideri', '“Ay sonunda dolandırıcılık ve pasifleşme modelleri için bütçe isteyeceğiz. Önce SQL ile ne kadar sinyal olduğunu görelim: şüpheli işlemler gerçekten ayrışıyor mu, özellik tablosu etiketle ilişkili mi? Bana özellik tablosu ve iki sayfalık bulgu notu lazım.”')}
<h3>Çalışma planı</h3>
<ol>
<li><b>Kesim tarihini sabitle.</b> Özellikler 2024-12-01 öncesinden, etiket Aralık'tan. Aşağıdaki sorgu öncesi dönemi tanır: 18.771 kart harcaması, 477 müşteri, son işlem 2024-11-30.</li>
<li><b>Dağılıma bak.</b> Ortalama 3.111 TL ama en büyük işlem 93.500 TL: dağılım sağa çarpık; ortalama + 3 standart sapma kaba bir eşiktir, kesin değildir.</li>
<li><b>Hipotezleri yaz.</b> “Gece işlemleri olağandışı”, “uzun süredir harcamayan müşteri pasifleşir”. Her biri bir sorguyla sınanabilir.</li>
</ol>
${C(`SELECT COUNT(*) AS islem, COUNT(DISTINCT a.customer_id) AS musteri,
       MIN(t.txn_time) AS ilk, MAX(t.txn_time) AS son
FROM bank_txns t
JOIN bank_accounts a ON a.account_id = t.account_id
WHERE t.txn_type = 'kart_harcama' AND t.txn_time < '2024-12-01';`)}
<h3>Kontrol listesi</h3>
<ul>
<li><b>Bir müşteri = bir satır.</b> Özellik tablosunun satır sayısı tekil müşteri sayısına (477) eşit olmalı; etiket tablosunun toplamı da.</li>
<li><b>Sızıntı testi.</b> <code>son_gun</code> negatifse kesimden sonraki veri özelliğe girmiş demektir. Sıfır olmalı.</li>
<li><b>Bölme hatası.</b> z-skoru için standart sapma 0 olan ve az işlemli hesaplar dışarıda bırakılmalı.</li>
<li><b>Sınıf dengesi.</b> Pasif müşteri yalnızca 13; model başarısını doğruluk (accuracy) ile değil, yakalama oranıyla ölç.</li>
</ul>
<h3>Teslim</h3>
<p>Özellik tablosu (müşteri başına bir satır, sütun sözlüğüyle) ve bulgu notu: işaret sayıları, kesişim, etiketle ilişki tablosu.</p>
${OZET('Kasım sonuna kadar harcaması olan 477 müşteri için özellik tablosu hazırlandı; 13 müşteri Aralık\'ta pasifleşti. Son harcamasının üzerinden 30 günden fazla geçen 13 müşterinin 12\'si pasif kaldı; <code>son_gun</code> tek başına çok güçlü bir sinyal. Kural skoru 25 işlemi işaretledi; bunların 19\'u hesap bazında z-skoruyla da olağandışı. Bu 25 işlemin hepsi gece saatlerinde, 45.400 TL üstünde ve her biri farklı bir hesapta: dolandırıcılık ekibine öncelikli inceleme listesi olarak gönderilmeli.')}
<h3>Kendini değerlendir</h3>
${R([
  ['Doğruluk', 'Özellikler hesaplanmış', 'Kesim tarihi her yerde aynı', 'Sızıntı ve satır sayısı testleri sıfır hata'],
  ['Analiz', 'Tek yöntem', 'Kural ve istatistik karşılaştırılmış', 'Kesişim ve etiketle ilişki sayıyla gösterilmiş'],
  ['Teslim', 'Sorgular', 'Tablo + sütun sözlüğü', 'Tablo, sözlük ve modelin neyi tahmin edeceğine dair net not']
])}`));
X('proje-bilimci', [
  sq('<b>Ek görev 1: Özellik ile etiket ilişkisi.</b> Kasım sonuna kadar kart harcaması olan müşterileri, son harcamalarından 2024-12-01\'e kadar geçen güne göre üç gruba ayır (<code>\'0-7\'</code>, <code>\'8-30\'</code>, <code>\'31+\'</code>) ve her grupta müşteri sayısını, Aralık\'ta hiç harcaması olmayan (pasif) müşteri sayısını ve pasif oranını (yüzde, 1 basamak) getir: <code>grup</code>, <code>musteri</code>, <code>pasif</code>, <code>pasif_orani</code>.', "WITH f AS (SELECT a.customer_id, julianday('2024-12-01') - julianday(MAX(date(t.txn_time))) AS son_gun FROM bank_txns t JOIN bank_accounts a ON a.account_id = t.account_id WHERE t.txn_type = 'kart_harcama' AND t.txn_time < '2024-12-01' GROUP BY a.customer_id), ar AS (SELECT DISTINCT a.customer_id FROM bank_txns t JOIN bank_accounts a ON a.account_id = t.account_id WHERE t.txn_type = 'kart_harcama' AND t.txn_time >= '2024-12-01'), g AS (SELECT CASE WHEN f.son_gun <= 7 THEN '0-7' WHEN f.son_gun <= 30 THEN '8-30' ELSE '31+' END AS grup, CASE WHEN ar.customer_id IS NULL THEN 1 ELSE 0 END AS pasif FROM f LEFT JOIN ar ON ar.customer_id = f.customer_id) SELECT grup, COUNT(*) AS musteri, SUM(pasif) AS pasif, ROUND(100.0 * SUM(pasif) / COUNT(*), 1) AS pasif_orani FROM g GROUP BY grup;", { hint: 'Adım 4\'teki son_gun ile Adım 5\'teki etiketi aynı müşteri listesinde birleştir; sonra CASE ile grupla.' }),
  sq('<b>Ek görev 2: İki yöntem ne kadar örtüşüyor?</b> Her kart harcaması için iki işaret hesapla: hesap bazında z-skoru 4\'ten büyük (en az 10 harcaması olan ve standart sapması 0\'dan büyük hesaplarda) ve Adım 3\'teki kural skoru 4 ve üstü. Tek satırda z ile işaretlenen, kuralla işaretlenen ve ikisiyle birden işaretlenen işlem sayısı: <code>z_isaret</code>, <code>kural_isaret</code>, <code>ikisi</code>.', "WITH s AS (SELECT -amount AS tutar, txn_time, channel, AVG(-amount) OVER (PARTITION BY account_id) AS ort, SQRT(AVG(amount * amount) OVER (PARTITION BY account_id) - AVG(amount) OVER (PARTITION BY account_id) * AVG(amount) OVER (PARTITION BY account_id)) AS sd, COUNT(*) OVER (PARTITION BY account_id) AS n FROM bank_txns WHERE txn_type = 'kart_harcama'), f AS (SELECT CASE WHEN n >= 10 AND sd > 0 AND (tutar - ort) / sd > 4 THEN 1 ELSE 0 END AS z, CASE WHEN (CASE WHEN tutar > 20000 THEN 2 ELSE 0 END) + (CASE WHEN CAST(strftime('%H', txn_time) AS INTEGER) < 6 THEN 2 ELSE 0 END) + (CASE WHEN channel = 'internet' THEN 1 ELSE 0 END) >= 4 THEN 1 ELSE 0 END AS k FROM s) SELECT SUM(z) AS z_isaret, SUM(k) AS kural_isaret, SUM(z * k) AS ikisi FROM f;", { hint: 'Önce pencere fonksiyonlarıyla hesap ortalamasını ve standart sapmayı her satıra yaz; sonra iki işareti 0/1 olarak hesaplayıp topla. İki işaretin çarpımı “ikisi birden”dir.' })
]);

/* ---------- proje-muhendis ---------- */
more('proje-muhendis', D('boru hattını teslim etmek', `
${BRIF('Veri platformu yöneticisi', '“Pazarlama, form kayıtlarını her gece CRM\'e aktarmak istiyor. Temiz tabloyu ve testleri cuma günü üretime alacağız; test kırmızıysa yükleme durmalı. Bana model kodu, test listesi ve bir sayfalık değişiklik notu ver.”')}
<h3>Çalışma planı</h3>
<ol>
<li><b>Ham veriyi profille.</b> Aşağıdaki sorgu: 52 satır, 40 tekil id, 20 satır GG.AA.YYYY biçiminde, 10 satırda şehir boş ya da boşluk.</li>
<li><b>İş anahtarını belirle.</b> Tekilleştirme <code>id</code> üzerinden mi, e-posta üzerinden mi? İkisi farklı sonuç verir; karar iş biriminindir, sen veriyle soruyu hazırlarsın (Ek görev 2).</li>
<li><b>Kuralları yaz, sonra kodla.</b> “E-posta küçük harf ve kırpılmış”, “boş şehir NULL”, “tarih ISO biçiminde”. Her kural bir teste dönüşür.</li>
</ol>
${C(`SELECT COUNT(*) AS satir, COUNT(DISTINCT id) AS tekil_id,
       SUM(CASE WHEN signup_date LIKE '__.__.____' THEN 1 ELSE 0 END) AS nokta_bicim,
       SUM(CASE WHEN city IS NULL OR TRIM(city) = '' THEN 1 ELSE 0 END) AS sehir_bos
FROM raw_signups;`)}
<h3>Kontrol listesi</h3>
<ul>
<li><b>Satır mutabakatı.</b> ham satır − elenen tekrar = temiz satır: 52 − 12 = 40. Elenen her satırın nedeni bilinmeli.</li>
<li><b>Benzersizlik testi.</b> Temiz tabloda <code>id</code> tekrarı sıfır olmalı (Adım 5'teki testin temiz tabloya uygulanmışı).</li>
<li><b>Değer kümesi testi.</b> Standart şehir sütunu yalnızca beklenen değerleri içermeli (Ek görev 1).</li>
<li><b>Tekrar çalıştırma.</b> Model iki kez çalışınca aynı sonucu vermeli (idempotent); artımlı yüklemede aynı güncelleme iki kez uygulanırsa fiyat değişmemeli.</li>
</ul>
<h3>Teslim</h3>
<p>Değişiklik notu: katmanlar, kurallar, test listesi (ad, sorgu, beklenen = 0) ve açık sorular.</p>
${OZET('Ham 52 satır 40 tekil kayda indi; 12 id tekrarlıydı ve 20 satırın tarihi ISO biçimine çevrildi. Şehir alanındaki 7 farklı yazım 3 standart değere indirildi; 6 kaydın şehri bilinmiyor. Açık soru: can.kaya@gmail.com iki farklı id\'de kayıtlı; aynı kişi mi, iş biriminin kararı gerekiyor.')}
<h3>Kendini değerlendir</h3>
${R([
  ['Temizlik', 'Biçimler düzeltilmiş', 'Tekilleştirme kuralı yazılı', 'İş anahtarı çatışmaları raporlanmış'],
  ['Testler', 'Yok', 'Ham veride üç test', 'Her katmanda test, beklenen değer 0 ve satır mutabakatı'],
  ['Teslim', 'SQL dosyası', 'Katmanlı modeller', 'Modeller + testler + değişiklik notu + açık sorular']
])}`));
X('proje-muhendis', [
  sq('<b>Ek görev 1: Değer kümesi testi.</b> Tekil kayıtlar (<code>DISTINCT id</code> ve standart şehir) üzerinden standart şehir dağılımı: şehir kırpılıp büyük harfe çevrilmiş, İ→I dönüştürülmüş; boş ya da NULL ise <code>\'BILINMIYOR\'</code>. Sütunlar: <code>city</code>, <code>kayit</code>.', "WITH s AS (SELECT DISTINCT id, COALESCE(NULLIF(REPLACE(UPPER(TRIM(city)), 'İ', 'I'), ''), 'BILINMIYOR') AS city FROM raw_signups) SELECT city, COUNT(*) AS kayit FROM s GROUP BY city;", { hint: 'Adım 1\'deki şehir ifadesini COALESCE ile sar; tekrarları DISTINCT id ile ele.' }),
  sq('<b>Ek görev 2: İş anahtarı çatışması.</b> Kırpılıp küçük harfe çevrilmiş aynı e-postanın birden fazla farklı <code>id</code>\'ye ait olduğu durumları bul: <code>email</code>, <code>id_sayisi</code>.', 'SELECT LOWER(TRIM(email)) AS email, COUNT(DISTINCT id) AS id_sayisi FROM raw_signups GROUP BY LOWER(TRIM(email)) HAVING COUNT(DISTINCT id) > 1;', { hint: 'E-postaya göre grupla ve farklı id sayısı 1\'den büyük olanları HAVING ile tut.' })
]);

/* ---------- proje-dba ---------- */
more('proje-dba', D('değişikliği güvenle üretime almak', `
${BRIF('BT müdürü ve iç denetim', '“Gün sonu raporu sabah ekibini bekletiyor ve denetim raporunda analistlerin ham müşteri verisine eriştiği yazıyor. Değişiklik kurulunda onay isteyeceksin: ne değişiyor, sonuç aynı kalıyor mu, geri alma planı ne?”')}
<h3>Çalışma planı</h3>
<ol>
<li><b>Ölç, sonra değiştir.</b> Değişiklikten önce raporun süresini, okuduğu satır sayısını ve sorgu planını kaydet. Ölçüm yoksa “hızlandı” iddiası da yoktur.</li>
<li><b>Sonucun aynı kaldığını kanıtla.</b> SARGable yazım bir yeniden yazımdır; çıktı satır satır aynı olmalı (Ek görev 1).</li>
<li><b>İndeksi seçerken seçiciliğe bak.</b> 8 farklı değeri olan <code>txn_type</code> tek başına zayıf bir indekstir; tarih ya da hesap sütunu çok daha seçicidir (Ek görev 2).</li>
<li><b>Geri alma planı.</b> <code>DROP INDEX</code> ve <code>DROP VIEW</code> komutlarını değişiklik notuna önceden yaz.</li>
</ol>
<h3>Kontrol listesi</h3>
<ul>
<li><b>Aralık sınırı.</b> <code>txn_time &lt;= '2024-12-31'</code> yazmak 31 Aralık'ı gece yarısında keser. Aşağıdaki sorgu farkı gösterir: doğru aralık 3.584 hareket, hatalı aralık 3.383; 201 hareket sessizce kaybolur.</li>
<li><b>Satır ve toplam mutabakatı.</b> Eski ve yeni rapor aynı adet ve tutarı vermeli: 3.584 hareket, 10.832.255 TL net.</li>
<li><b>Yetki testi.</b> Analist rolüyle ham tabloya SELECT denemesi hata vermeli; görünüme SELECT çalışmalı.</li>
<li><b>Yazma maliyeti.</b> Her yeni indeks INSERT'leri yavaşlatır; günde kaç hareket yazıldığını not et.</li>
</ul>
${C(`SELECT SUM(CASE WHEN txn_time >= '2024-12-01' AND txn_time < '2025-01-01' THEN 1 ELSE 0 END) AS dogru_aralik,
       SUM(CASE WHEN txn_time >= '2024-12-01' AND txn_time <= '2024-12-31' THEN 1 ELSE 0 END) AS hatali_aralik
FROM bank_txns;`)}
<p>Planı görmek için SQL türüne göre <code>EXPLAIN</code> (PostgreSQL, MySQL), <code>EXPLAIN QUERY PLAN</code> (SQLite) ya da gerçek yürütme planı (SQL Server) kullan; indeks öncesi ve sonrası planı yan yana koy.</p>
<h3>Teslim</h3>
<p>Değişiklik kuruluna tek sayfa: önce/sonra ölçüm tablosu, mutabakat sonucu, yetki matrisi (rol × nesne × izin), geri alma komutları.</p>
${OZET('Gün sonu raporu tarih filtresi SARGable yazılarak ve <code>txn_time</code> indeksi eklenerek tam tablo taraması yerine aralık taraması yapıyor; çıktı eskisiyle birebir aynı (153 satır, 3.584 hareket). Analistler artık ham tablolar yerine iki görünüme erişiyor ve ad soyad maskeli. Kalan risk raporun canlı sistemde çalışması; okuma replikasına taşınmasını öneriyoruz.')}
<h3>Kendini değerlendir</h3>
${R([
  ['Performans', 'İndeks eklenmiş', 'Önce/sonra plan karşılaştırılmış', 'Ölçüm, plan ve yazma maliyeti birlikte değerlendirilmiş'],
  ['Doğruluk', 'Rapor çalışıyor', 'Satır sayısı aynı', 'Adet ve tutar mutabakatı sıfır fark'],
  ['Güvenlik', 'Görünüm var', 'Kişisel veri maskeli', 'Yetki matrisi, test ve geri alma planı hazır']
])}`));
X('proje-dba', [
  sq('<b>Ek görev 1: Önce/sonra mutabakatı.</b> Eski filtreyle (<code>strftime(\'%Y-%m\', txn_time) = \'2024-12\'</code>) ve yeni aralık filtresiyle hesaplanan Aralık 2024 hareket sayısı ile net tutarını (tam sayı) tek satırda getir: <code>eski_adet</code>, <code>yeni_adet</code>, <code>eski_toplam</code>, <code>yeni_toplam</code>.', "SELECT (SELECT COUNT(*) FROM bank_txns WHERE strftime('%Y-%m', txn_time) = '2024-12') AS eski_adet, (SELECT COUNT(*) FROM bank_txns WHERE txn_time >= '2024-12-01' AND txn_time < '2025-01-01') AS yeni_adet, (SELECT ROUND(SUM(amount), 0) FROM bank_txns WHERE strftime('%Y-%m', txn_time) = '2024-12') AS eski_toplam, (SELECT ROUND(SUM(amount), 0) FROM bank_txns WHERE txn_time >= '2024-12-01' AND txn_time < '2025-01-01') AS yeni_toplam;", { hint: 'Dört skaler alt sorgu; eski ve yeni sütunlar eşit çıkmalı.' }),
  sq('<b>Ek görev 2: Seçicilik.</b> İndeks adaylarının <code>bank_txns</code>\'teki farklı değer sayısı: <code>txn_type</code>, <code>channel</code>, <code>account_id</code> ve gün (<code>date(txn_time)</code>, adı <code>gun</code>). Sütunlar: <code>sutun</code>, <code>farkli</code>.', "SELECT 'txn_type' AS sutun, COUNT(DISTINCT txn_type) AS farkli FROM bank_txns UNION ALL SELECT 'channel', COUNT(DISTINCT channel) FROM bank_txns UNION ALL SELECT 'account_id', COUNT(DISTINCT account_id) FROM bank_txns UNION ALL SELECT 'gun', COUNT(DISTINCT date(txn_time)) FROM bank_txns;", { hint: 'Her aday için bir SELECT yaz ve UNION ALL ile alt alta koy. Farklı değer çoksa sütun seçicidir.' })
]);
})();
