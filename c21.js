/* Kesit SQL içerik 21: Teknik mülakat hazırlığı (ayrıntılı)
   Her ders bir soru kalıbını işler: soru, netleştirme soruları, yaklaşım, iki çözüm, sınır durumları,
   takip soruları ve görüşmecinin neye baktığı. Alıştırmalar üç veri setinden gelir. */
(function () {
const L = window.SQLP_LESSONS;
const MOD = 'Mülakat Hazırlığı';
const sq = (q, sol, o) => Object.assign({ t: 'sql', q: '<p>' + q + '</p>', sol }, o || {});
const mc = (q, o, a, why) => ({ t: 'mc', q, o, a, why });
const NET = 'oi.quantity * oi.unit_price * (1 - oi.discount)';
const DLY = 'ROUND((julianday(f.actual_dep) - julianday(f.sched_dep)) * 1440)';
/* Ders gövdesi şablonu */
const KALIP = o => `
<h2>Soru</h2>
<div class="note"><b>Görüşmeci</b>${o.soru}</div>
<h2>Önce netleştir</h2>
<p>Kod yazmadan önce sorulacak sorular. Her biri farklı bir sorguya götürür; sormamak en sık puan kaybıdır.</p>
<ul>${o.netlestir.map(x => '<li>' + x + '</li>').join('')}</ul>
<h2>Yaklaşım</h2>
<ol>${o.yaklasim.map(x => '<li>' + x + '</li>').join('')}</ol>
<h2>Çözüm 1: ${o.c1[0]}</h2>
<pre class="code">${o.c1[1]}</pre>
<h2>Çözüm 2: ${o.c2[0]}</h2>
<pre class="code">${o.c2[1]}</pre>
<p>${o.karsilastir}</p>
<h2>Sınır durumları</h2>
<table><tr><th>Durum</th><th>Ne olur?</th></tr>${o.sinir.map(r => '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td></tr>').join('')}</table>
<h2>Takip soruları</h2>
<ul>${o.takip.map(x => '<li>' + x + '</li>').join('')}</ul>
<div class="tip"><b>Görüşmeci neye bakıyor?</b>${o.bakilan}</div>
`;

const lessons = [
{
  id: 'mk-yontem', lv: 'B2', mod: MOD, min: 12,
  title: 'SQL mülakatı: nasıl düşünülür, nasıl anlatılır?',
  sum: 'Canlı kodlama mülakatında beş adımlık çalışma düzeni, sesli düşünme ve sık yapılan hatalar.',
  body: `
<h2>Mülakatta değerlendirilen dört şey</h2>
<table><tr><th>Ölçüt</th><th>Görüşmecinin aradığı</th></tr>
<tr><td>Doğruluk</td><td>Sorgunun doğru sonucu vermesi; sınır durumlarını (NULL, eşitlik, boş grup) düşünmüş olmak</td></tr>
<tr><td>Yaklaşım</td><td>Problemi adımlara bölmek, taneciği doğru seçmek</td></tr>
<tr><td>İletişim</td><td>Varsayımları söylemek, netleştirme soruları sormak, yaptığını anlatmak</td></tr>
<tr><td>Okunabilirlik</td><td>CTE ve anlamlı adlarla okunur kod; gereksiz karmaşıklıktan kaçınmak</td></tr>
</table>
<h2>Beş adım</h2>
<ol>
<li><b>Tekrar et:</b> Soruyu kendi cümlelerinle tekrar et. “Her departmanın en yüksek maaşlı çalışanını, eşitlik varsa hepsini istiyorsunuz, doğru mu?”</li>
<li><b>Netleştir:</b> Tanımları sor. İptal edilen siparişler dahil mi? “Ay” takvim ayı mı, son 30 gün mü? Aynı değerde iki satır varsa ne olsun?</li>
<li><b>Örnek kur:</b> Üç–dört satırlık küçük bir örnek üzerinde beklenen çıktıyı söyle. Bu, yanlış anlamayı kod yazmadan yakalar.</li>
<li><b>Adım adım yaz:</b> Önce iskelet (CTE adları), sonra her adım. Her adımda “bu adımın çıktısında bir satır şudur” de.</li>
<li><b>Test et ve iyileştir:</b> Sınır durumlarını sesli kontrol et, sonra performans ve alternatif çözümden bahset.</li>
</ol>
<h2>Sık hatalar</h2>
<ul>
<li>WHERE içinde pencere fonksiyonu ya da takma ad kullanmak.</li>
<li>JOIN sonrası satır çoğalmasını fark etmeden SUM veya COUNT almak.</li>
<li>Eşitlik durumunu düşünmeden ROW_NUMBER kullanmak (ya da tersine, tek satır istenirken RANK kullanmak).</li>
<li>Oranlarda tam sayı bölmesi: <code>5 / 10 = 0</code>. <code>100.0 *</code> ile başla.</li>
<li>LEFT JOIN'in sağ tablosuna WHERE ile koşul yazıp onu INNER JOIN'e çevirmek.</li>
</ul>
<div class="note"><b>Bu modülün yapısı</b>Sonraki derslerin her biri bir soru kalıbını işler: soru, netleştirme soruları, yaklaşım, iki çözüm ve karşılaştırması, sınır durumları ve takip soruları. Alıştırmalar aynı kalıbı üç farklı veri setinde uygular. Kendini denemek için <b>Oyun Alanı</b>'ndaki süreli <b>Mülakat simülasyonu</b>'nu kullan.</div>
`,
  ex: [
    mc('<p>Görüşmeci “Geçen ay en çok harcama yapan 3 müşteriyi bul” diyor. İlk yapman gereken nedir?</p>', ['Hemen ORDER BY ... LIMIT 3 ile sorguyu yazıp sonra açıklamak', '“Geçen ay”, iptal ve eşitlik tanımlarını netleştirmek', 'Tablonun boyutunu ve indekslerini sorup performansı konuşmak', 'Hangi programın kullanılacağını sorup ezber kalıp seçmek'], 1,
      'Tanım belirsizlikleri çözülmeden yazılan sorgu doğru çalışsa bile yanlış soruyu cevaplar. Görüşmeciler netleştirme sorularını açıkça puanlar.'),
    mc('<p>Hangisi mülakatta <b>en az</b> önemlidir?</p>', ['Sınır durumlarını (NULL, eşitlik, boş grup) sesli kontrol etmek', 'Her yan cümleyi ayrı satıra yazıp anlamlı takma adlar kullanmak', 'Bir fonksiyonun programa özgü tam adını ezbere bilmek', 'Taneciği (bir satırın neyi temsil ettiğini) söylemek'], 2,
      'Görüşmeciler genellikle “bu fonksiyonun SQL Server karşılığı neydi” gibi ayrıntılarda esnektir; düşünme biçimi, doğruluk ve iletişim çok daha ağır basar.'),
    sq('Isınma: her departmanın adını, çalışan sayısını ve ortalama maaşını (tam sayı) getir; çalışanı olmayan departman da 0 ile görünsün. Ortalama maaşa göre azalan, eşitlikte ada göre sırala; NULL ortalamalar en sonda olsun: <code>name</code>, <code>calisan</code>, <code>ort_maas</code>.',
      'SELECT d.name, COUNT(e.emp_id) AS calisan, ROUND(AVG(e.salary)) AS ort_maas FROM departments d LEFT JOIN employees e ON e.dept_id = d.dept_id GROUP BY d.dept_id, d.name ORDER BY CASE WHEN AVG(e.salary) IS NULL THEN 1 ELSE 0 END, ort_maas DESC, d.name;',
      { ord: true, hint: 'NULL\'ları sona atmak için ORDER BY içinde önce CASE WHEN ... IS NULL THEN 1 ELSE 0 END; çünkü programlar NULL sırasında farklı davranır.' })
  ]
},
{
  id: 'mk-topn', lv: 'B2', mod: MOD, min: 20,
  title: 'Mülakat kalıbı: grup başına ilk N ve N\'inci en yüksek değer',
  sum: 'ROW_NUMBER, RANK ve DENSE_RANK farkı; eşitlik, NULL ve “N\'inci en yüksek yoksa” durumları.',
  body: KALIP({
    soru: '“Her departmanda en yüksek maaşı alan ilk 2 çalışanı getir.” Takip olarak: “Şirketteki 3. en yüksek <b>farklı</b> maaş nedir?”',
    netlestir: ['Eşit maaşta iki çalışan varsa ikisi de mi dönsün, yoksa tam 2 satır mı?', 'Departmanı olmayan çalışan (Genel Müdür) dahil mi?', '“3. en yüksek” farklı değerler arasında mı (DENSE_RANK) yoksa sıra numarası mı (ROW_NUMBER)?', 'Departmanda 2\'den az çalışan varsa ne olsun?'],
    yaklasim: ['Her satıra departman içinde maaşa göre sıra numarası ver.', 'Eşitlik kuralına göre fonksiyonu seç: tam N satır → ROW_NUMBER (eşitlikte ikinci bir sıralama sütunu ekle), eşitler dahil → DENSE_RANK veya RANK.', 'Pencere sonucunu dış sorguda filtrele (WHERE içinde pencere fonksiyonu kullanılamaz).'],
    c1: ['pencere fonksiyonu', `WITH s AS (
  SELECT dept_id, first_name, salary,
         DENSE_RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS sira
  FROM employees
  WHERE dept_id IS NOT NULL
)
SELECT dept_id, first_name, salary, sira
FROM s
WHERE sira <= 2
ORDER BY dept_id, sira, first_name;`],
    c2: ['ilişkili alt sorgu (pencere fonksiyonu bilinmiyorsa)', `SELECT e.dept_id, e.first_name, e.salary
FROM employees e
WHERE e.dept_id IS NOT NULL
  AND (SELECT COUNT(DISTINCT e2.salary)
       FROM employees e2
       WHERE e2.dept_id = e.dept_id AND e2.salary > e.salary) < 2
ORDER BY e.dept_id, e.salary DESC, e.first_name;`],
    karsilastir: 'İkinci çözüm, “benden yüksek kaç farklı maaş var?” sorusunu sorar; 2\'den azsa ilk ikidedir. DENSE_RANK ile aynı sonucu verir ama her satır için alt sorgu çalıştığından büyük tablolarda yavaştır. Mülakatta önce pencere çözümünü yaz, alternatifi sözlü anlat.',
    sinir: [['Eşit maaşlar', 'DENSE_RANK ikisini de 1 yapar; ROW_NUMBER birini 2. sıraya iter (hangisi olacağı belirsiz, ikinci sıralama sütunu ekle)'], ['Departmanda tek çalışan', 'Yalnızca o çalışan döner; hata yok'], ['NULL maaş', 'Sıralamada programa göre en başa veya sona düşer; gerekirse WHERE salary IS NOT NULL'], ['3. farklı maaş yoksa', 'Alt sorgu çözümünde NULL dönmesi istenir; MAX(...) ile sarmak boş sonuç yerine NULL verir']],
    takip: ['N parametre olsaydı nasıl yazardın? (değişken / sorgu parametresi)', 'Büyük tabloda hangi indeks yardımcı olur? (dept_id, salary DESC)', 'SQL Server\'da aynı iş TOP ve CROSS APPLY ile nasıl yazılır?'],
    bakilan: 'Eşitlik sorusunu kendiliğinden sorman ve ROW_NUMBER / RANK / DENSE_RANK farkını tek cümleyle açıklayabilmen.'
  }),
  ex: [
    sq('Her kategoride <b>en pahalı 2 ürünü</b> getir; eşit fiyatta tüm eşitler dahil olsun (DENSE_RANK): <code>category</code>, <code>name</code>, <code>price</code>, <code>sira</code>. Kategoriye, sıraya ve ada göre sırala.',
      'WITH s AS (SELECT category, name, price, DENSE_RANK() OVER (PARTITION BY category ORDER BY price DESC) AS sira FROM products) SELECT category, name, price, sira FROM s WHERE sira <= 2 ORDER BY category, sira, name;', { ord: true }),
    sq('Şirketteki <b>3. en yüksek farklı maaşı</b> getir; böyle bir maaş yoksa NULL dönmeli (boş sonuç değil): <code>ucuncu</code>.',
      'SELECT MAX(salary) AS ucuncu FROM (SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS r FROM employees) t WHERE r = 3;',
      { hint: 'Filtrelenmiş sonucu MAX ile sarmak, satır yoksa NULL döndürür.' }),
    sq('Kanat Havayolları: her uçak tipi için <b>en çok uçuş yapan</b> uçağı getir; eşitlikte küçük tescil seçilsin (tam 1 satır): <code>model</code>, <code>tail_no</code>, <code>ucus</code>. Tipe göre sırala.',
      'WITH u AS (SELECT a.model, f.tail_no, COUNT(*) AS ucus FROM hv_flights f JOIN hv_aircraft a ON a.tail_no = f.tail_no GROUP BY a.model, f.tail_no), s AS (SELECT model, tail_no, ucus, ROW_NUMBER() OVER (PARTITION BY model ORDER BY ucus DESC, tail_no) AS rn FROM u) SELECT model, tail_no, ucus FROM s WHERE rn = 1 ORDER BY model;', { ord: true }),
    sq('Ilgaz Bank: her şubenin en yüksek risk puanlı <b>2 müşterisini</b> getir; eşitlikte küçük müşteri numarası öne geçsin ve şube başına tam 2 satır dönsün: <code>branch_id</code>, <code>customer_id</code>, <code>risk_score</code>. Şubeye, sonra sıraya göre sırala.',
      'WITH s AS (SELECT branch_id, customer_id, risk_score, ROW_NUMBER() OVER (PARTITION BY branch_id ORDER BY risk_score DESC, customer_id) AS rn FROM bank_customers) SELECT branch_id, customer_id, risk_score FROM s WHERE rn <= 2 ORDER BY branch_id, rn;', { ord: true }),
    sq('Pencere fonksiyonu kullanmadan: her departmanın <b>en yüksek maaşlı</b> çalışan(lar)ını getir (eşitler dahil): <code>dept_id</code>, <code>first_name</code>, <code>salary</code>. Departmana, sonra ada göre sırala.',
      'SELECT e.dept_id, e.first_name, e.salary FROM employees e WHERE e.dept_id IS NOT NULL AND e.salary = (SELECT MAX(e2.salary) FROM employees e2 WHERE e2.dept_id = e.dept_id) ORDER BY e.dept_id, e.first_name;', { ord: true })
  ]
},
{
  id: 'mk-ardisik', lv: 'C1', mod: MOD, min: 20,
  title: 'Mülakat kalıbı: ardışık günler, seriler ve “en az 3 gün üst üste”',
  sum: 'Boşluklar ve adalar sorusunun iki çözümü: tarih − ROW_NUMBER ve LAG ile işaretle-topla.',
  body: KALIP({
    soru: '“Ilgaz Bank\'ta en az 3 gün üst üste işlem yapılmış hesapları bul.” Takip: “Her hesabın en uzun ardışık serisi kaç gün?”',
    netlestir: ['Aynı gün birden çok işlem varsa tek gün sayılır mı? (Evet olmalı: önce gün düzeyine tekilleştir.)', 'Tüm işlem türleri mi (faiz tahakkuku gibi otomatik olanlar dahil)?', 'Seri takvim günüyle mi, iş günüyle mi ölçülüyor?'],
    yaklasim: ['Hesap × gün düzeyine indir (DISTINCT, zaman damgasını date() ile güne çevir).', 'Her hesapta günleri sırala ve ROW_NUMBER ver.', 'Gün numarası − sıra numarası, aynı serideki her gün için sabit kalır: bu değer seri anahtarıdır.', 'Hesap × seri anahtarına göre grupla, uzunluğu say, filtrele.'],
    c1: ['tarih − ROW_NUMBER', `WITH g AS (
  SELECT DISTINCT account_id, date(txn_time) AS gun
  FROM bank_txns
),
n AS (
  SELECT account_id, gun,
         julianday(gun) - julianday('2000-01-01')
           - ROW_NUMBER() OVER (PARTITION BY account_id ORDER BY gun) AS seri
  FROM g
)
SELECT account_id, MIN(gun) AS baslangic, MAX(gun) AS bitis, COUNT(*) AS gun_sayisi
FROM n
GROUP BY account_id, seri
HAVING COUNT(*) >= 3
ORDER BY gun_sayisi DESC, account_id
LIMIT 10;`],
    c2: ['LAG ile işaretle ve kümülatif topla', `WITH g AS (
  SELECT DISTINCT account_id, date(txn_time) AS gun FROM bank_txns
),
i AS (
  SELECT account_id, gun,
         CASE WHEN julianday(gun) - julianday(LAG(gun) OVER (PARTITION BY account_id ORDER BY gun)) = 1
              THEN 0 ELSE 1 END AS yeni
  FROM g
),
s AS (
  SELECT account_id, gun,
         SUM(yeni) OVER (PARTITION BY account_id ORDER BY gun ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS seri
  FROM i
)
SELECT account_id, COUNT(*) AS gun_sayisi
FROM s
GROUP BY account_id, seri
HAVING COUNT(*) >= 3
ORDER BY gun_sayisi DESC, account_id
LIMIT 10;`],
    karsilastir: 'İki çözüm aynı sonucu verir. Birincisi daha kısadır; ikincisi “1 günlük boşluğu tolere et” ya da “30 dakikadan uzun ara yeni oturum başlatır” gibi eşik içeren varyasyonlara daha kolay uyarlanır. Görüşmeci genellikle ikinci varyasyonu takip sorusu olarak sorar.',
    sinir: [['Aynı gün iki işlem', 'DISTINCT olmazsa ROW_NUMBER iki kez artar, seri kırılmış görünür'], ['Tek günlük seri', 'Seri uzunluğu 1; HAVING ile elenir'], ['Ay ve yıl geçişi', 'Tarihi gün numarasına çevirmek ay sonlarını doğru ele alır'], ['Saatli zaman damgası', 'Önce güne indir; yoksa aynı gün farklı satırlar olur']],
    takip: ['Bir günlük boşluğa izin verilseydi (31 Ocak ve 2 Şubat aynı seri)?', 'Her hesabın yalnızca en uzun serisi nasıl alınır? (ROW_NUMBER ile ikinci kez sırala)', 'Milyonlarca satırda hangi indeks gerekir? (account_id, txn_time)'],
    bakilan: 'Önce gün düzeyine tekilleştirmeyi kendiliğinden yapman ve “tarih eksi sıra numarası neden sabit kalır?” sorusunu açıklayabilmen.'
  }),
  ex: [
    sq('Ilgaz Bank: <b>en az 3 gün üst üste</b> işlem yapılmış hesap sayısını getir (aynı gün birden çok işlem tek gün sayılır): <code>hesap</code>.',
      "WITH g AS (SELECT DISTINCT account_id, date(txn_time) AS gun FROM bank_txns), n AS (SELECT account_id, julianday(gun) - julianday('2000-01-01') - ROW_NUMBER() OVER (PARTITION BY account_id ORDER BY gun) AS seri FROM g), s AS (SELECT account_id FROM n GROUP BY account_id, seri HAVING COUNT(*) >= 3) SELECT COUNT(DISTINCT account_id) AS hesap FROM s;"),
    sq('Her hesabın <b>en uzun</b> ardışık işlem serisini (gün) bul ve en uzun serisi olan 5 hesabı getir: <code>account_id</code>, <code>en_uzun</code>. Seriye göre azalan, eşitlikte hesap numarasına göre sırala.',
      "WITH g AS (SELECT DISTINCT account_id, date(txn_time) AS gun FROM bank_txns), n AS (SELECT account_id, julianday(gun) - julianday('2000-01-01') - ROW_NUMBER() OVER (PARTITION BY account_id ORDER BY gun) AS seri FROM g), s AS (SELECT account_id, COUNT(*) AS uzunluk FROM n GROUP BY account_id, seri) SELECT account_id, MAX(uzunluk) AS en_uzun FROM s GROUP BY account_id ORDER BY en_uzun DESC, account_id LIMIT 5;", { ord: true }),
    sq('Kanat Havayolları: <b>IST → ESB</b> rotasında kalkış gecikmesi 15 dakikayı aşan uçuşların <b>art arda</b> gerçekleştiği en uzun seriyi (uçuş sayısı) bul. Uçuşları planlanan kalkışa göre sırala; iptaller hariç. Tek değer: <code>en_uzun_seri</code>.',
      `WITH u AS (SELECT f.sched_dep, CASE WHEN ${DLY} > 15 THEN 1 ELSE 0 END AS gec FROM hv_flights f JOIN hv_routes r ON r.route_id = f.route_id WHERE r.origin = 'IST' AND r.dest = 'ESB' AND f.actual_dep IS NOT NULL), n AS (SELECT sched_dep, gec, ROW_NUMBER() OVER (ORDER BY sched_dep) - ROW_NUMBER() OVER (PARTITION BY gec ORDER BY sched_dep) AS grp FROM u) SELECT MAX(c) AS en_uzun_seri FROM (SELECT COUNT(*) AS c FROM n WHERE gec = 1 GROUP BY grp) t;`,
      { hint: 'Tarih yerine sıra numarası farkı kullan: tüm uçuşların sırası − yalnızca geç uçuşların kendi içindeki sırası. Aynı geç seri boyunca bu fark sabit kalır.' }),
    sq('LAG ile işaretle-topla yöntemini kullan: yalnızca <b>kart_harcama</b> işlemlerinde, en az 3 gün üst üste kartla harcama yapılan hesap sayısını getir: <code>hesap</code>.',
      "WITH g AS (SELECT DISTINCT account_id, date(txn_time) AS gun FROM bank_txns WHERE txn_type = 'kart_harcama'), i AS (SELECT account_id, gun, CASE WHEN julianday(gun) - julianday(LAG(gun) OVER (PARTITION BY account_id ORDER BY gun)) = 1 THEN 0 ELSE 1 END AS yeni FROM g), s AS (SELECT account_id, SUM(yeni) OVER (PARTITION BY account_id ORDER BY gun ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS seri FROM i) SELECT COUNT(DISTINCT account_id) AS hesap FROM (SELECT account_id FROM s GROUP BY account_id, seri HAVING COUNT(*) >= 3) t;"),
    mc('<p>Anadolu Market\'te “en az 2 gün üst üste sipariş veren müşteri” sorgusu 0 döndürüyor. En doğru tepki hangisi?</p>', ['Sorguda hata vardır; DISTINCT kaldırılıp tekrar denenmeli', 'Ardışık günler arasındaki en kısa farkla sonucu doğrulamak', 'Seri koşulunu 1 güne indirip çıkan sayıyı raporlamak', 'Pencere fonksiyonu yerine GROUP BY ile yeniden yazmak'], 1,
      'Beklenmedik boş ya da sıfır sonuç her zaman hata değildir. Mülakatta küçük bir kontrol sorgusuyla (ör. LAG ile ardışık sipariş günleri arasındaki en kısa fark) sonucu doğrulamak güven verir.')
  ]
},
{
  id: 'mk-oran', lv: 'B2', mod: MOD, min: 20,
  title: 'Mülakat kalıbı: oranlar, paydalar ve dönüşüm',
  sum: 'Doğru paydayı seçmek, tam sayı bölmesi, oranların ortalaması tuzağı ve koşullu sayım.',
  body: KALIP({
    soru: '“Her cihaz için ziyaretçilerin yüzde kaçı satın almış?” Takip: “Peki A/B testinde B varyantı A\'ya göre ne kadar iyi?”',
    netlestir: ['Payda ne: ziyaret eden <b>kullanıcı</b> mı, <b>oturum</b> mu, <b>olay</b> mı?', 'Bir kullanıcı iki cihaz kullandıysa hangisine yazılır?', 'Satın alma ziyaretten önce kaydedilmişse (veri hatası) sayılır mı?', 'Oran yüzde mi, ondalık mı; kaç basamak?'],
    yaklasim: ['Payda kümesini tanımla (ziyaret eden kullanıcılar).', 'Pay kümesini aynı tanecikte tanımla (satın alan kullanıcılar).', 'Koşullu sayımla ikisini tek geçişte hesapla.', '100.0 ile çarparak tam sayı bölmesinden kaç.'],
    c1: ['koşullu COUNT DISTINCT', `SELECT device,
       COUNT(DISTINCT CASE WHEN event_type = 'visit' THEN user_id END) AS ziyaretci,
       COUNT(DISTINCT CASE WHEN event_type = 'purchase' THEN user_id END) AS alici,
       ROUND(100.0 * COUNT(DISTINCT CASE WHEN event_type = 'purchase' THEN user_id END)
             / COUNT(DISTINCT CASE WHEN event_type = 'visit' THEN user_id END), 2) AS donusum
FROM web_events
GROUP BY device;`],
    c2: ['kullanıcı düzeyinde bayraklar', `WITH k AS (
  SELECT device, user_id,
         MAX(CASE WHEN event_type = 'visit' THEN 1 ELSE 0 END) AS ziyaret,
         MAX(CASE WHEN event_type = 'purchase' THEN 1 ELSE 0 END) AS aldi
  FROM web_events
  GROUP BY device, user_id
)
SELECT device, SUM(ziyaret) AS ziyaretci, SUM(aldi) AS alici,
       ROUND(100.0 * SUM(CASE WHEN ziyaret = 1 AND aldi = 1 THEN 1 ELSE 0 END) / SUM(ziyaret), 2) AS donusum
FROM k
GROUP BY device;`],
    karsilastir: 'İkinci çözüm önce kullanıcı düzeyine iner; “ziyaret edip satın alan” gibi birleşik koşullar ve huni adımları için daha esnektir. Birinci çözüm daha kısadır ama payda ile payın aynı kişiler olduğunu garanti etmez (ziyareti olmayan bir alıcı paya girer).',
    sinir: [['Tam sayı bölmesi', '7 / 10 = 0 (SQL Server, PostgreSQL, SQLite). 100.0 * ile başla'], ['Payda sıfır', 'NULLIF(payda, 0) ile sıfıra bölmeyi önle'], ['Oranların ortalaması', 'Günlük oranların ortalaması, toplam dönüşüm / toplam ziyaret ile aynı değildir'], ['Çift sayım', 'Aynı kullanıcının birden çok satın alması: COUNT(DISTINCT user_id)']],
    takip: ['Sonuç istatistiksel olarak anlamlı mı? (iki oran z-testi)', 'Dönüşümü 7 günlük pencereyle (ziyaretten sonraki 7 gün içinde) nasıl hesaplarsın?', 'Mobil ile masaüstü arasındaki farkın nedeni ne olabilir? (veri değil, ürün sorusu)'],
    bakilan: 'Paydayı netleştirmen, tam sayı bölmesini kendiliğinden önlemen ve “oranların ortalaması” tuzağını bilmen.'
  }),
  ex: [
    sq('Her cihaz için <b>sepete ekleyen</b> kullanıcıların yüzde kaçının satın aldığını getir (2 basamak); payda: en az bir add_to_cart olayı olan kullanıcılar: <code>device</code>, <code>sepet</code>, <code>alan</code>, <code>oran</code>.',
      "WITH k AS (SELECT device, user_id, MAX(CASE WHEN event_type = 'add_to_cart' THEN 1 ELSE 0 END) AS sepet, MAX(CASE WHEN event_type = 'purchase' THEN 1 ELSE 0 END) AS aldi FROM web_events GROUP BY device, user_id) SELECT device, SUM(sepet) AS sepet, SUM(CASE WHEN sepet = 1 AND aldi = 1 THEN 1 ELSE 0 END) AS alan, ROUND(100.0 * SUM(CASE WHEN sepet = 1 AND aldi = 1 THEN 1 ELSE 0 END) / SUM(sepet), 2) AS oran FROM k GROUP BY device;"),
    sq('“Oranların ortalaması” tuzağını göster: Kasım 2024 için günlük dönüşüm oranlarının (satın alan kullanıcı / ziyaret eden kullanıcı) <b>basit ortalamasını</b> ve tüm ayın <b>toplam</b> oranını yan yana getir (yüzde, 2 basamak): <code>gunluk_ortalama</code>, <code>toplam_oran</code>.',
      "WITH g AS (SELECT date(event_time) AS gun, COUNT(DISTINCT CASE WHEN event_type = 'visit' THEN user_id END) AS z, COUNT(DISTINCT CASE WHEN event_type = 'purchase' THEN user_id END) AS a FROM web_events WHERE event_time >= '2024-11-01' AND event_time < '2024-12-01' GROUP BY date(event_time)), t AS (SELECT COUNT(DISTINCT CASE WHEN event_type = 'visit' THEN user_id END) AS z, COUNT(DISTINCT CASE WHEN event_type = 'purchase' THEN user_id END) AS a FROM web_events WHERE event_time >= '2024-11-01' AND event_time < '2024-12-01') SELECT ROUND(AVG(100.0 * a / NULLIF(z, 0)), 2) AS gunluk_ortalama, (SELECT ROUND(100.0 * a / z, 2) FROM t) AS toplam_oran FROM g;",
      { why: 'İki sayı farklı: günlük oranların ortalaması her günü eşit ağırlıklandırır, toplam oran ise her kullanıcıyı. Ayrıca bir kullanıcı ay içinde birden çok gün geldiyse günlük toplamlar onu birden çok kez sayar.' }),
    sq('Kanat Havayolları: ücret sınıfına göre <b>iptal oranını</b> hesapla (havayolunun iptal ettiği uçuşlardaki rezervasyonlar paydadan ve paydan çıkarılsın; yalnızca yolcunun iptal ettikleri sayılsın). Yüzde, 2 basamak: <code>fare_class</code>, <code>rezervasyon</code>, <code>iptal_orani</code>.',
      "SELECT b.fare_class, COUNT(*) AS rezervasyon, ROUND(100.0 * SUM(CASE WHEN b.status = 'cancelled' THEN 1 ELSE 0 END) / COUNT(*), 2) AS iptal_orani FROM hv_bookings b JOIN hv_flights f ON f.flight_id = b.flight_id WHERE f.status <> 'cancelled' GROUP BY b.fare_class;",
      { hint: 'Havayolunun iptal ettiği uçuşlardaki rezervasyonlar da cancelled görünür; onları uçuş durumuna bakarak WHERE ile ayır.' }),
    sq('A/B testi: B\'nin A\'ya göre dönüşüm oranındaki <b>mutlak farkı</b> (yüzde puan, 2 basamak) ve <b>göreli artışı</b> (yüzde, 1 basamak) tek satırda getir: <code>mutlak_fark</code>, <code>goreli_artis</code>.',
      "WITH g AS (SELECT variant, 100.0 * SUM(converted) / COUNT(*) AS oran FROM ab_test GROUP BY variant) SELECT ROUND(b.oran - a.oran, 2) AS mutlak_fark, ROUND(100.0 * (b.oran - a.oran) / a.oran, 1) AS goreli_artis FROM g a JOIN g b ON a.variant = 'A' AND b.variant = 'B';"),
    mc('<p>Pazartesi 100 ziyaretçiden 10\'u, Salı 900 ziyaretçiden 18\'i satın aldı. Görüşmeci “iki günün dönüşüm oranı nedir?” diye soruyor. En iyi cevap hangisi?</p>', ['%6; günlük oranlar %10 ve %2, ortalamaları %6', '%2,8; toplam 28 satın alma / 1000 ziyaretçi', '%10; en yüksek günün oranı potansiyeli gösterir', '%2; son günün oranı en güncel bilgidir'], 1,
      'Toplam oran her ziyaretçiyi eşit sayar. Ortalama oran, 100 ziyaretçili günü 900 ziyaretçili günle eşit ağırlıklandırır ve yanıltır.')
  ]
},
{
  id: 'mk-tekrar', lv: 'B2', mod: MOD, min: 18,
  title: 'Mülakat kalıbı: tekrarlar, ilk ve son kayıt, ikinci sipariş',
  sum: 'Tekrar bulma, tekrar silme, her grubun ilk/son kaydı ve “ikinci siparişe kaç gün sonra döndü?”',
  body: KALIP({
    soru: '“Tabloda tekrarlanan e-posta adreslerini bul ve her birinden yalnızca en eski kaydı tutacak şekilde temizle.” Takip: “Müşteriler ilk siparişten ikinci siparişe ortalama kaç günde dönüyor?”',
    netlestir: ['“Aynı e-posta” büyük/küçük harf ve boşluk farkını yok sayıyor mu?', '“En eski” kayıt tarihine mi, kimliğe mi göre?', 'Silme mi istiyorsunuz, yoksa tekilleştirilmiş bir görünüm mü?', 'Tek siparişi olan müşteriler ortalamaya nasıl girer? (girmez)'],
    yaklasim: ['Anahtarı normalize et: LOWER(TRIM(email)).', 'GROUP BY + HAVING COUNT(*) > 1 ile tekrarları bul.', 'ROW_NUMBER() OVER (PARTITION BY anahtar ORDER BY kimlik) ile her grupta 1 numaralıyı tut.', 'İkinci sipariş için aynı ROW_NUMBER kalıbı: rn = 1 ve rn = 2\'yi yan yana getir.'],
    c1: ['tekrarları bulmak ve sıralamak', `WITH s AS (
  SELECT id, LOWER(TRIM(email)) AS anahtar,
         ROW_NUMBER() OVER (PARTITION BY LOWER(TRIM(email)) ORDER BY id) AS rn,
         COUNT(*) OVER (PARTITION BY LOWER(TRIM(email))) AS adet
  FROM raw_signups
  WHERE email IS NOT NULL
)
SELECT anahtar, adet, id AS tutulacak_id
FROM s
WHERE rn = 1 AND adet > 1
ORDER BY adet DESC, anahtar;`],
    c2: ['ikinci sipariş: koşullu toplama', `WITH s AS (
  SELECT customer_id, order_date,
         ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date, order_id) AS rn
  FROM orders
),
p AS (
  SELECT customer_id,
         MAX(CASE WHEN rn = 1 THEN order_date END) AS ilk,
         MAX(CASE WHEN rn = 2 THEN order_date END) AS ikinci
  FROM s
  GROUP BY customer_id
)
SELECT COUNT(ikinci) AS donen, ROUND(AVG(julianday(ikinci) - julianday(ilk)), 1) AS ort_gun
FROM p;`],
    karsilastir: 'Aynı ROW_NUMBER kalıbı iki farklı soruyu çözer: tekrar temizlemede “1 numara kalır”, sıralı olaylarda “1 ve 2 numarayı yan yana koy”. MAX(CASE WHEN rn = 2 ...) uzun formattan geniş formata çevirmenin taşınabilir yoludur; LEAD ile de yazılabilir.',
    sinir: [['NULL e-posta', 'PARTITION BY NULL değerleri tek grup sayar; WHERE email IS NOT NULL ile ayır'], ['Aynı gün iki sipariş', 'ORDER BY order_date tek başına belirsiz; order_id ekle'], ['Tek siparişli müşteri', 'ikinci NULL olur; AVG NULL\'u atlar, COUNT(ikinci) dönenleri sayar'], ['Tam tekrar satırlar', 'Kimlik de aynıysa rowid ya da tüm sütunlarla GROUP BY gerekir']],
    takip: ['DELETE ile nasıl silersin? (WHERE id NOT IN (SELECT MIN(id) ... GROUP BY anahtar))', 'Silmeden önce ne yaparsın? (aynı WHERE ile SELECT, yedek, işlem)', 'Medyan dönüş süresi ortalamadan neden daha anlamlı olabilir?'],
    bakilan: 'Anahtarı normalize etmeyi düşünmen, silmeden önce görüntülemeyi önermen ve eşitlikte belirleyici bir sıralama eklemen.'
  }),
  ex: [
    sq('<code>customers</code> tablosunda aynı <b>ad ve soyada</b> sahip birden fazla müşteri olan grupları getir: <code>first_name</code>, <code>last_name</code>, <code>adet</code>. Adede göre azalan, eşitlikte ad ve soyada göre sırala.',
      'SELECT first_name, last_name, COUNT(*) AS adet FROM customers GROUP BY first_name, last_name HAVING COUNT(*) > 1 ORDER BY adet DESC, first_name, last_name;', { ord: true }),
    sq('Her müşterinin <b>en son</b> siparişini getir (aynı gün birden çok sipariş varsa büyük order_id); yalnızca 1–8 numaralı müşteriler: <code>customer_id</code>, <code>order_id</code>, <code>order_date</code>, <code>status</code>.',
      'WITH s AS (SELECT customer_id, order_id, order_date, status, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date DESC, order_id DESC) AS rn FROM orders WHERE customer_id <= 8) SELECT customer_id, order_id, order_date, status FROM s WHERE rn = 1 ORDER BY customer_id;', { ord: true }),
    sq('Müşterilerin ilk siparişten ikinci siparişe ortalama kaç günde döndüğünü ve dönen müşteri sayısını getir (1 basamak): <code>donen</code>, <code>ort_gun</code>.',
      'WITH s AS (SELECT customer_id, order_date, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date, order_id) AS rn FROM orders), p AS (SELECT customer_id, MAX(CASE WHEN rn = 1 THEN order_date END) AS ilk, MAX(CASE WHEN rn = 2 THEN order_date END) AS ikinci FROM s GROUP BY customer_id) SELECT COUNT(ikinci) AS donen, ROUND(AVG(julianday(ikinci) - julianday(ilk)), 1) AS ort_gun FROM p;'),
    sq('Kanat Havayolları: her üyenin <b>ilk ve ikinci</b> gerçekleşen uçuşunun ücret sınıfını yan yana getir ve ilk uçuşu Eko olup ikinci uçuşu Business olan üye sayısını bul: <code>yukselen</code>.',
      "WITH s AS (SELECT b.passenger_id, b.fare_class, ROW_NUMBER() OVER (PARTITION BY b.passenger_id ORDER BY f.sched_dep, b.booking_id) AS rn FROM hv_bookings b JOIN hv_flights f ON f.flight_id = b.flight_id WHERE b.status = 'flown'), p AS (SELECT passenger_id, MAX(CASE WHEN rn = 1 THEN fare_class END) AS ilk, MAX(CASE WHEN rn = 2 THEN fare_class END) AS ikinci FROM s GROUP BY passenger_id) SELECT COUNT(*) AS yukselen FROM p WHERE ilk = 'Eko' AND ikinci = 'Business';"),
    sq('<code>raw_signups</code> tablosunu tekilleştir: normalize e-posta (LOWER(TRIM)) başına <b>en küçük id\'li</b> kaydı tutan, diğerlerini silen DELETE ifadesini yaz. E-postası NULL olanlara dokunma.',
      'DELETE FROM raw_signups WHERE email IS NOT NULL AND rowid NOT IN (SELECT MIN(rowid) FROM raw_signups r WHERE r.email IS NOT NULL AND r.id = (SELECT MIN(r2.id) FROM raw_signups r2 WHERE LOWER(TRIM(r2.email)) = LOWER(TRIM(r.email))) GROUP BY LOWER(TRIM(r.email)));',
      { base: 'sqlite', dl: ['sqlite'], check: "SELECT COUNT(*) AS satir, COUNT(DISTINCT LOWER(TRIM(email))) AS tekil, SUM(CASE WHEN email IS NULL THEN 1 ELSE 0 END) AS bos FROM raw_signups", hint: 'Her normalize e-posta için en küçük id\'yi taşıyan satırlardan birini (MIN(rowid)) tut. Tabloda tamamen aynı satırlar da olduğu için id tek başına yetmez; SQLite\'ın gizli rowid sütunu satırı benzersiz tanımlar.' })
  ]
},
{
  id: 'mk-zaman', lv: 'C1', mod: MOD, min: 20,
  title: 'Mülakat kalıbı: zaman pencereleri, büyüme ve “son 30 gün”',
  sum: 'Aydan aya büyüme, kümülatif toplam, hareketli pencere ve kayan “son N gün” sorularında doğru çerçeve.',
  body: KALIP({
    soru: '“Her ay için teslim edilen ciroyu, bir önceki aya göre büyümeyi ve yılbaşından bu yana kümülatif ciroyu getir.” Takip: “Her gün için son 7 günün cirosu nedir? Sipariş olmayan günler de görünmeli.”',
    netlestir: ['Ciro tanımı: net mi (indirim düşülmüş), hangi durumlar dahil?', 'Kümülatif toplam her yıl sıfırlansın mı?', '“Son 7 gün” bugünü içeriyor mu?', 'Sipariş olmayan ay/gün 0 olarak görünmeli mi?'],
    yaklasim: ['Önce aylık (ya da günlük) toplam tablosunu kur.', 'LAG ile bir önceki dönemi getir, farkı yüzdeye çevir.', 'SUM OVER (PARTITION BY yıl ORDER BY ay) ile yılbaşından bu yana kümülatif.', 'Boş günler için önce takvim üret, sonra LEFT JOIN; çerçeveyi ROWS BETWEEN 6 PRECEDING AND CURRENT ROW yap.'],
    c1: ['aylık tablo + LAG + kümülatif', `WITH a AS (
  SELECT strftime('%Y', o.order_date) AS yil, strftime('%Y-%m', o.order_date) AS ay,
         SUM(${NET}) AS ciro
  FROM orders o JOIN order_items oi ON oi.order_id = o.order_id
  WHERE o.status = 'delivered'
  GROUP BY strftime('%Y', o.order_date), strftime('%Y-%m', o.order_date)
)
SELECT ay, ROUND(ciro) AS ciro,
       ROUND(100.0 * (ciro - LAG(ciro) OVER (ORDER BY ay)) / LAG(ciro) OVER (ORDER BY ay), 1) AS buyume,
       ROUND(SUM(ciro) OVER (PARTITION BY yil ORDER BY ay ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)) AS ytd
FROM a
WHERE ay >= '2024-01'
ORDER BY ay;`],
    c2: ['takvim + LEFT JOIN + hareketli pencere', `WITH RECURSIVE takvim(gun) AS (
  SELECT '2024-12-01' UNION ALL SELECT date(gun, '+1 day') FROM takvim WHERE gun < '2024-12-31'
),
g AS (
  SELECT o.order_date AS gun, SUM(${NET}) AS ciro
  FROM orders o JOIN order_items oi ON oi.order_id = o.order_id
  WHERE o.status = 'delivered' AND o.order_date >= '2024-11-25'
  GROUP BY o.order_date
)
SELECT t.gun, ROUND(COALESCE(g.ciro, 0)) AS ciro,
       ROUND(SUM(COALESCE(g.ciro, 0)) OVER (ORDER BY t.gun ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)) AS son7
FROM takvim t LEFT JOIN g ON g.gun = t.gun
ORDER BY t.gun;`],
    karsilastir: 'İkinci çözümdeki takvim adımı çok önemlidir: boş günler tabloda olmazsa “6 PRECEDING” altı <i>satır</i> öncesine, yani belki on gün öncesine bakar. Ayrıca ilk 6 gün eksik pencereyle hesaplanır; bunu görüşmeciye söylemek ya da takvimi 6 gün geriden başlatmak gerekir.',
    sinir: [['Önceki dönem yok', 'LAG NULL döner; büyüme NULL kalmalı, 0 değil'], ['Önceki dönem 0', 'Sıfıra bölme: NULLIF(LAG(...), 0)'], ['Boş günler', 'Takvim olmadan pencere yanlış genişler'], ['Varsayılan çerçeve', 'ORDER BY olan SUM OVER varsayılanı RANGE\'dir; aynı tarihli satırlar birlikte toplanır']],
    takip: ['Geçen yılın aynı ayıyla (YoY) nasıl karşılaştırırsın? (LAG(ciro, 12) ya da yıl − 1 ile self join)', 'Ay içinde bugüne kadar (MTD) ciro nasıl hesaplanır?', 'Bu sorguyu bir BI aracına verecek olsan hangi taneciği seçerdin?'],
    bakilan: 'Boş dönemleri ve pencere çerçevesini kendiliğinden düşünmen; büyümede NULL ile 0 farkını gözetmen.'
  }),
  ex: [
    sq('2024 için her ayın teslim edilen net cirosunu (tam sayı) ve <b>geçen yılın aynı ayına</b> göre büyümeyi (yüzde, 1 basamak) getir: <code>ay</code> (YYYY-AA), <code>ciro</code>, <code>yoy</code>. Aya göre sırala.',
      `WITH a AS (SELECT strftime('%Y-%m', o.order_date) AS ay, SUM(${NET}) AS ciro FROM orders o JOIN order_items oi ON oi.order_id = o.order_id WHERE o.status = 'delivered' AND o.order_date >= '2023-01-01' AND o.order_date < '2025-01-01' GROUP BY strftime('%Y-%m', o.order_date)), l AS (SELECT ay, ciro, LAG(ciro, 12) OVER (ORDER BY ay) AS gecen FROM a) SELECT ay, ROUND(ciro) AS ciro, ROUND(100.0 * (ciro - gecen) / gecen, 1) AS yoy FROM l WHERE ay >= '2024-01' ORDER BY ay;`,
      { ord: true, hint: 'LAG(ciro, 12) yalnızca 2023\'ün 12 ayının hepsinde ciro varsa doğru çalışır. Emin değilsen yıl − 1 ile self join daha güvenlidir.' }),
    sq('Kanat Havayolları: Aralık 2024\'ün her günü için o güne kadar ayın <b>kümülatif</b> yolcu sayısını ve <b>son 7 günün</b> toplam yolcusunu getir: <code>gun</code>, <code>yolcu</code>, <code>kumulatif</code>, <code>son7</code>. Güne göre sırala.',
      "WITH d AS (SELECT date(sched_dep) AS gun, SUM(pax) AS yolcu FROM hv_flights WHERE sched_dep >= '2024-12-01' AND sched_dep < '2025-01-01' GROUP BY date(sched_dep)) SELECT gun, yolcu, SUM(yolcu) OVER (ORDER BY gun ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS kumulatif, SUM(yolcu) OVER (ORDER BY gun ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS son7 FROM d ORDER BY gun;", { ord: true }),
    sq('Ilgaz Bank: her hesabın 2024 Aralık ayındaki <b>gün sonu bakiyesindeki değişimi</b> değil, aylık net akışını hesapla (girişler artı, çıkışlar eksi) ve net akışı bir önceki aya göre en çok <b>düşen</b> 5 hesabı getir (tam sayı): <code>account_id</code>, <code>kasim</code>, <code>aralik</code>, <code>degisim</code>. Değişime göre artan, eşitlikte hesaba göre sırala.',
      "WITH m AS (SELECT account_id, strftime('%Y-%m', txn_time) AS ay, SUM(amount) AS akis FROM bank_txns WHERE txn_time >= '2024-11-01' AND txn_time < '2025-01-01' GROUP BY account_id, strftime('%Y-%m', txn_time)), p AS (SELECT account_id, SUM(CASE WHEN ay = '2024-11' THEN akis ELSE 0 END) AS kasim, SUM(CASE WHEN ay = '2024-12' THEN akis ELSE 0 END) AS aralik FROM m GROUP BY account_id) SELECT account_id, ROUND(kasim) AS kasim, ROUND(aralik) AS aralik, ROUND(aralik - kasim) AS degisim FROM p ORDER BY aralik - kasim, account_id LIMIT 5;", { ord: true }),
    sq('Takvim tuzağını göster: Aralık 2024 için yalnızca <b>sipariş olan günlerden</b> hesaplanan “son 7 satır” cirosu ile <b>takvimle</b> hesaplanan “son 7 gün” cirosunun farklı olduğu gün sayısını getir: <code>farkli_gun</code>.',
      `WITH RECURSIVE t(gun) AS (SELECT '2024-12-01' UNION ALL SELECT date(gun, '+1 day') FROM t WHERE gun < '2024-12-31'), g AS (SELECT o.order_date AS gun, SUM(${NET}) AS ciro FROM orders o JOIN order_items oi ON oi.order_id = o.order_id WHERE o.status = 'delivered' AND o.order_date >= '2024-12-01' AND o.order_date < '2025-01-01' GROUP BY o.order_date), satir AS (SELECT gun, SUM(ciro) OVER (ORDER BY gun ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS s7 FROM g), takvim AS (SELECT t.gun, SUM(COALESCE(g.ciro, 0)) OVER (ORDER BY t.gun ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS k7 FROM t LEFT JOIN g ON g.gun = t.gun) SELECT COUNT(*) AS farkli_gun FROM satir s JOIN takvim k ON k.gun = s.gun WHERE ROUND(s.s7, 2) <> ROUND(k.k7, 2);`,
      { hint: 'İki ayrı CTE: biri yalnızca dolu günler üzerinde ROWS penceresi, diğeri takvim üzerinde. Sonra güne göre birleştirip farklı olanları say.' })
  ]
},
{
  id: 'mk-selfjoin', lv: 'B2', mod: MOD, min: 18,
  title: 'Mülakat kalıbı: kendine birleştirme klasikleri',
  sum: 'Yöneticisinden fazla kazananlar, karşılıklı ilişkiler, birlikte satın alınan ürün çiftleri ve aynı gün iki olay.',
  body: KALIP({
    soru: '“Yöneticisinden fazla kazanan çalışanları bul.” Takip: “En sık birlikte satın alınan ürün çiftleri hangileri?”',
    netlestir: ['Yöneticisi olmayan (en üstteki) çalışan sonuçta görünmeli mi?', 'Ürün çiftinde (A, B) ile (B, A) aynı çift mi?', 'Aynı siparişte aynı ürün iki satırda olabilir mi?', 'Kaç çift isteniyor; eşitlikte ne olsun?'],
    yaklasim: ['Tabloyu iki takma adla birleştir; her takma ad bir rolü temsil eder (çalışan, yönetici).', 'Çiftlerde tekrarı önlemek için a.id < b.id koşulu ekle.', 'Önce sipariş × ürün düzeyinde tekilleştir, sonra çiftleri üret ve say.'],
    c1: ['yöneticiden fazla kazananlar', `SELECT e.first_name AS calisan, e.salary, m.first_name AS yonetici, m.salary AS yonetici_maas
FROM employees e
JOIN employees m ON m.emp_id = e.manager_id
WHERE e.salary > m.salary
ORDER BY e.salary DESC;`],
    c2: ['birlikte satın alınan ürün çiftleri', `WITH s AS (
  SELECT DISTINCT order_id, product_id FROM order_items
)
SELECT a.product_id AS urun_a, b.product_id AS urun_b, COUNT(*) AS birlikte
FROM s a
JOIN s b ON b.order_id = a.order_id AND a.product_id < b.product_id
GROUP BY a.product_id, b.product_id
ORDER BY birlikte DESC, urun_a, urun_b
LIMIT 5;`],
    karsilastir: 'İkisi de aynı fikir: bir tabloyu iki farklı rolde kullanmak. Anadolu Market\'te birinci sorgu <b>boş</b> döner, çünkü kimse yöneticisinden fazla kazanmıyor; boş sonuç da geçerli bir cevaptır, bunu görüşmeciye söyleyip sorgunun doğru çalıştığını <code>&gt;=</code> ya da oranla gösterebilirsin. İkinci sorguda <code>a.product_id &lt; b.product_id</code> hem bir ürünün kendisiyle eşleşmesini hem de (A, B) / (B, A) çift sayımını önler. Ürün sayısı büyüdükçe çift sayısı karesel büyür; büyük veride önce popüler ürünlerle sınırlamak gerekir.',
    sinir: [['Yöneticisi olmayan', 'INNER JOIN onu düşürür; istenirse LEFT JOIN'], ['Eşit maaş', '> yerine >= kullanılırsa sonuç değişir; soruyu netleştir'], ['Aynı ürün iki satırda', 'DISTINCT olmazsa çift sayısı şişer'], ['Kendisiyle eşleşme', 'a.id < b.id ya da a.id <> b.id koşulu gerekir']],
    takip: ['Çiftin “kaldıraç” (lift) değerini nasıl hesaplarsın?', 'Yönetim zinciri çok seviyeliyse (yöneticinin yöneticisi) ne kullanırsın? (özyinelemeli CTE)', 'Bu sorgu 10 milyon sipariş satırında nasıl hızlandırılır?'],
    bakilan: 'Rolleri doğru adlandırman (e ve m), çift tekrarını kendiliğinden önlemen ve satır patlaması riskini fark etmen.'
  }),
  ex: [
    sq('Anadolu Market\'te kimse yöneticisinden fazla kazanmıyor (klasik sorgu boş döner). Görüşmeci soruyu değiştiriyor: maaşı yöneticisinin maaşının <b>%80\'i veya üzeri</b> olan çalışanları getir: <code>calisan</code>, <code>maas</code>, <code>yonetici</code>, <code>yonetici_maas</code>, <code>oran</code> (yüzde, tam sayı). Orana göre azalan, eşitlikte çalışan adına göre sırala.',
      'SELECT e.first_name AS calisan, e.salary AS maas, m.first_name AS yonetici, m.salary AS yonetici_maas, ROUND(100.0 * e.salary / m.salary) AS oran FROM employees e JOIN employees m ON m.emp_id = e.manager_id WHERE e.salary >= 0.8 * m.salary ORDER BY e.salary * 1.0 / m.salary DESC, e.first_name;', { ord: true }),
    sq('En sık birlikte satın alınan 5 ürün çiftini <b>ürün adlarıyla</b> getir: <code>urun_a</code>, <code>urun_b</code>, <code>birlikte</code>. Sayıya göre azalan, eşitlikte adlara göre sırala.',
      'WITH s AS (SELECT DISTINCT order_id, product_id FROM order_items), c AS (SELECT a.product_id AS pa, b.product_id AS pb, COUNT(*) AS birlikte FROM s a JOIN s b ON b.order_id = a.order_id AND a.product_id < b.product_id GROUP BY a.product_id, b.product_id) SELECT x.name AS urun_a, y.name AS urun_b, c.birlikte FROM c JOIN products x ON x.product_id = c.pa JOIN products y ON y.product_id = c.pb ORDER BY c.birlikte DESC, x.name, y.name LIMIT 5;', { ord: true }),
    sq('Kanat Havayolları: <b>aynı uçuşta</b> en sık birlikte seyahat eden üye çiftini bul (ikisinin de flown rezervasyonu olan uçuşlar); en az 2 ortak uçuşu olan çift sayısını getir: <code>cift</code>.',
      "WITH s AS (SELECT DISTINCT flight_id, passenger_id FROM hv_bookings WHERE status = 'flown'), c AS (SELECT a.passenger_id AS p1, b.passenger_id AS p2, COUNT(*) AS ortak FROM s a JOIN s b ON b.flight_id = a.flight_id AND a.passenger_id < b.passenger_id GROUP BY a.passenger_id, b.passenger_id) SELECT COUNT(*) AS cift FROM c WHERE ortak >= 2;"),
    sq('Ilgaz Bank: <b>aynı gün içinde</b> önce para girişi (havale_giris), ardından 2 saat içinde aynı hesaptan 5.000 TL üzeri çıkış (havale_cikis veya atm) olan durumların sayısını getir: <code>vaka</code>.',
      "WITH g AS (SELECT account_id, txn_time FROM bank_txns WHERE txn_type = 'havale_giris'), c AS (SELECT account_id, txn_time FROM bank_txns WHERE txn_type IN ('havale_cikis', 'atm') AND amount < -5000) SELECT COUNT(*) AS vaka FROM g JOIN c ON c.account_id = g.account_id AND c.txn_time > g.txn_time AND c.txn_time <= datetime(g.txn_time, '+2 hours');",
      { hint: 'Önce iki küçük CTE kur: g (girişler) ve c (5.000 TL üzeri çıkışlar; çıkış tutarları eksi işaretlidir). Sonra hesap ve zaman koşuluyla birleştir. Büyük tabloyu kendisiyle doğrudan birleştirmek yavaştır.' })
  ]
},
{
  id: 'mk-medyan', lv: 'C1', mod: MOD, min: 16,
  title: 'Mülakat kalıbı: medyan, yüzdelik ve mod',
  sum: 'Programdan bağımsız medyan hesabı, grup başına medyan, en sık değer ve yüzdelik dilimler.',
  body: KALIP({
    soru: '“Her kategoride ürün fiyatlarının medyanını hesapla. MEDIAN fonksiyonu kullanma.” Takip: “En sık görülen sipariş tutarı aralığı (mod) hangisi?”',
    netlestir: ['Çift sayıda değer varsa medyan ortadaki iki değerin ortalaması mı?', 'NULL fiyatlar dahil mi?', 'Mod için eşit sıklıkta birden çok değer varsa hepsi mi?'],
    yaklasim: ['Her grupta değerleri sırala: ROW_NUMBER ile sıra, COUNT OVER ile grup büyüklüğü.', 'Ortadaki sıraları seç: tek sayıda (n+1)/2, çift sayıda n/2 ve n/2+1.', 'Seçilen değerlerin ortalaması medyandır.', 'Mod: GROUP BY değer, COUNT, en yüksek sayıyı RANK ile seç.'],
    c1: ['ROW_NUMBER ile taşınabilir medyan', `WITH s AS (
  SELECT category, price,
         ROW_NUMBER() OVER (PARTITION BY category ORDER BY price) AS rn,
         COUNT(*) OVER (PARTITION BY category) AS n
  FROM products
)
SELECT category, ROUND(AVG(price), 2) AS medyan
FROM s
WHERE rn IN ((n + 1) / 2, (n + 2) / 2)
GROUP BY category
ORDER BY category;`],
    c2: ['programın yerleşik fonksiyonu (destekleniyorsa)', `-- PostgreSQL, Oracle, SQL Server 2022:
-- PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price)
-- BigQuery: APPROX_QUANTILES(price, 2)[OFFSET(1)]  (yaklaşık)
SELECT category, MEDIAN(price) AS medyan   -- Oracle ve bu uygulama
FROM products
GROUP BY category
ORDER BY category;`],
    karsilastir: 'Birinci çözümün püf noktası <code>(n + 1) / 2</code> ve <code>(n + 2) / 2</code> ifadeleridir: tam sayı bölmesiyle n tekken ikisi de ortadaki sırayı, n çiftken ortadaki iki sırayı verir. Bu ifade MySQL, Oracle ve BigQuery\'de ondalıklı bölündüğü için orada FLOOR ile sarılmalıdır. Mülakatta yerleşik fonksiyonu bildiğini söyle, ama genellikle elle yazmanı isterler.',
    sinir: [['Çift sayıda değer', 'Ortadaki iki değerin ortalaması'], ['Tek değerli grup', 'O değerin kendisi'], ['NULL', 'COUNT(*) yerine COUNT(price) ve WHERE price IS NOT NULL'], ['Tam sayı bölmesi farkı', 'MySQL / Oracle / BigQuery\'de FLOOR gerekir']],
    takip: ['90. yüzdelik nasıl hesaplanır? (NTILE(10) veya PERCENT_RANK)', 'Medyan neden çarpık dağılımlarda ortalamadan daha iyi bir özet?', 'Çok büyük veride kesin medyan pahalıysa ne yaparsın? (yaklaşık yüzdelik)'],
    bakilan: 'Tek ve çift sayıda değeri tek bir koşulla ele alman ve tam sayı bölmesinin programlara göre farkını bilmen.'
  }),
  ex: [
    sq('MEDIAN kullanmadan her departmanın <b>medyan maaşını</b> hesapla (departmanı olmayanlar hariç, tam sayı): <code>dept_id</code>, <code>medyan</code>. Departmana göre sırala.',
      'WITH s AS (SELECT dept_id, salary, ROW_NUMBER() OVER (PARTITION BY dept_id ORDER BY salary) AS rn, COUNT(*) OVER (PARTITION BY dept_id) AS n FROM employees WHERE dept_id IS NOT NULL) SELECT dept_id, ROUND(AVG(salary)) AS medyan FROM s WHERE rn IN (FLOOR((n + 1) / 2), FLOOR((n + 2) / 2)) GROUP BY dept_id ORDER BY dept_id;',
      { ord: true, hint: 'Ortadaki sıralar: FLOOR((n + 1) / 2) ve FLOOR((n + 2) / 2).' }),
    sq('Kanat Havayolları: rota başına kalkış gecikmesinin <b>medyanını</b> (iptaller hariç) hesapla ve medyanı en yüksek 5 rotayı getir: <code>origin</code>, <code>dest</code>, <code>medyan</code> (1 basamak). Medyana göre azalan, eşitlikte origin ve dest\'e göre sırala.',
      `WITH g AS (SELECT r.origin, r.dest, ${DLY} AS gecikme FROM hv_flights f JOIN hv_routes r ON r.route_id = f.route_id WHERE f.actual_dep IS NOT NULL), s AS (SELECT origin, dest, gecikme, ROW_NUMBER() OVER (PARTITION BY origin, dest ORDER BY gecikme) AS rn, COUNT(*) OVER (PARTITION BY origin, dest) AS n FROM g), m AS (SELECT origin, dest, AVG(gecikme) AS medyan FROM s WHERE rn IN (FLOOR((n + 1) / 2), FLOOR((n + 2) / 2)) GROUP BY origin, dest) SELECT origin, dest, ROUND(medyan, 1) AS medyan FROM m ORDER BY medyan DESC, origin, dest LIMIT 5;`, { ord: true }),
    sq('Mod: teslim edilen siparişlerin net tutarlarını 500 TL\'lik aralıklara böl (0–499 → 0, 500–999 → 500 …) ve <b>en sık</b> görülen aralığı (eşitlik varsa hepsini) getir: <code>aralik</code>, <code>siparis</code>.',
      `WITH t AS (SELECT o.order_id, SUM(${NET}) AS tutar FROM orders o JOIN order_items oi ON oi.order_id = o.order_id WHERE o.status = 'delivered' GROUP BY o.order_id), a AS (SELECT FLOOR(tutar / 500) * 500 AS aralik, COUNT(*) AS siparis FROM t GROUP BY FLOOR(tutar / 500) * 500), r AS (SELECT aralik, siparis, RANK() OVER (ORDER BY siparis DESC) AS rk FROM a) SELECT aralik, siparis FROM r WHERE rk = 1;`),
    sq('Banka müşterilerinin risk puanının <b>üst %10</b> sınırını (90. yüzdelik dilimin başladığı en küçük değer) NTILE ile bul: <code>esik</code>.',
      'WITH d AS (SELECT risk_score, NTILE(10) OVER (ORDER BY risk_score, customer_id) AS dilim FROM bank_customers) SELECT MIN(risk_score) AS esik FROM d WHERE dilim = 10;')
  ]
},
{
  id: 'mk-vaka', lv: 'C1', mod: MOD, min: 30,
  title: 'Mülakat: açık uçlu ürün analitiği vakası',
  sum: '“Rezervasyonlar düştü, neden?” gibi açık uçlu bir soruyu metrik tanımına, hipotezlere ve sorgulara bölmek.',
  body: `
<h2>Vaka</h2>
<div class="note"><b>Görüşmeci</b>“Kanat Havayolları'nda Kasım ayında üyelerin gerçekleşen uçuş sayısı Ekim'e göre düştü. Ürün yöneticisi nedenini soruyor. Nasıl incelersin?”</div>
<p>Bu tür sorularda tek bir doğru sorgu yoktur. Görüşmeci senin <b>problemi parçalara ayırma</b> biçimini, hangi metriklere baktığını ve hipotezlerini veriyle nasıl sınadığını değerlendirir.</p>
<h2>1. Metriği tanımla</h2>
<p>“Gerçekleşen uçuş” = status = 'flown' olan rezervasyon, uçuş tarihine göre aya yazılır. Önce düşüşün gerçek olduğunu doğrula:</p>
<pre class="code">SELECT strftime('%Y-%m', f.sched_dep) AS ay, COUNT(*) AS ucus, COUNT(DISTINCT b.passenger_id) AS uye
FROM hv_bookings b JOIN hv_flights f ON f.flight_id = b.flight_id
WHERE b.status = 'flown'
GROUP BY strftime('%Y-%m', f.sched_dep)
ORDER BY ay;</pre>
<h2>2. Metriği ayrıştır</h2>
<p>Uçuş sayısı = <b>aktif üye sayısı × üye başına uçuş</b>. Düşüş hangisinden geliyor? Sonra boyutlara böl: seviye, rota, ücret sınıfı, yurt içi / yurt dışı.</p>
<h2>3. Hipotezler</h2>
<table><tr><th>Hipotez</th><th>Nasıl sınanır?</th></tr>
<tr><td>Arz düştü (daha az sefer)</td><td>Aylık planlanan uçuş sayısı</td></tr>
<tr><td>İptaller arttı</td><td>Havayolu iptalleri ve yolcu iptalleri ayrı ayrı</td></tr>
<tr><td>Belirli bir segment uzaklaştı</td><td>Seviyeye göre aktif üye ve üye başına uçuş</td></tr>
<tr><td>Mevsimsellik</td><td>Eylül–Ekim–Kasım–Aralık eğilimi; mümkünse geçen yıl</td></tr>
<tr><td>Ölçüm sorunu</td><td>Rezervasyonun uçuş ayına mı, rezervasyon ayına mı yazıldığı</td></tr>
</table>
<h2>4. Bulguyu ve önerini anlat</h2>
<p>“Kasım'daki düşüşün yaklaşık üçte ikisi aktif üye sayısındaki azalmadan geliyor ve büyük kısmı Classic seviyede. Planlanan sefer yalnızca %3 azalmış; iptal oranı %1\'den %1,7\'ye çıkmış ama bu da düşüşün küçük bir kısmını açıklıyor. Öneri: Classic üyeler için Kasım kampanyasının etkisini ölçecek bir A/B testi.” Sayılar senin sorgularından gelmeli.</p>
<div class="tip"><b>Görüşmeci neye bakıyor?</b>Önce veriyi doğrulaman, metriği bileşenlerine ayırman, birden çok hipotez kurman ve sonucu bir karar önerisine bağlaman.</div>
`,
  ex: [
    sq('Adım 1: aylık gerçekleşen uçuş sayısı, aktif üye sayısı ve üye başına uçuş (2 basamak): <code>ay</code>, <code>ucus</code>, <code>uye</code>, <code>uye_basina</code>. Aya göre sırala.',
      "SELECT strftime('%Y-%m', f.sched_dep) AS ay, COUNT(*) AS ucus, COUNT(DISTINCT b.passenger_id) AS uye, ROUND(1.0 * COUNT(*) / COUNT(DISTINCT b.passenger_id), 2) AS uye_basina FROM hv_bookings b JOIN hv_flights f ON f.flight_id = b.flight_id WHERE b.status = 'flown' GROUP BY strftime('%Y-%m', f.sched_dep) ORDER BY ay;", { ord: true }),
    sq('Adım 2: arz hipotezi. Her ay planlanan uçuş sayısı ve havayolu iptal oranı (yüzde, 2 basamak): <code>ay</code>, <code>planlanan</code>, <code>iptal_orani</code>. Aya göre sırala.',
      "SELECT strftime('%Y-%m', sched_dep) AS ay, COUNT(*) AS planlanan, ROUND(100.0 * SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) / COUNT(*), 2) AS iptal_orani FROM hv_flights GROUP BY strftime('%Y-%m', sched_dep) ORDER BY ay;", { ord: true }),
    sq('Adım 3: segment hipotezi. Ekim ve Kasım 2024 için seviyeye göre aktif üye sayılarını yan yana ve farkı getir: <code>tier</code>, <code>ekim</code>, <code>kasim</code>, <code>fark</code>. Farka göre artan sırala.',
      "WITH u AS (SELECT DISTINCT b.passenger_id, strftime('%Y-%m', f.sched_dep) AS ay FROM hv_bookings b JOIN hv_flights f ON f.flight_id = b.flight_id WHERE b.status = 'flown' AND f.sched_dep >= '2024-10-01' AND f.sched_dep < '2024-12-01') SELECT p.tier, SUM(CASE WHEN u.ay = '2024-10' THEN 1 ELSE 0 END) AS ekim, SUM(CASE WHEN u.ay = '2024-11' THEN 1 ELSE 0 END) AS kasim, SUM(CASE WHEN u.ay = '2024-11' THEN 1 ELSE 0 END) - SUM(CASE WHEN u.ay = '2024-10' THEN 1 ELSE 0 END) AS fark FROM u JOIN hv_passengers p ON p.passenger_id = u.passenger_id GROUP BY p.tier ORDER BY fark, p.tier;", { ord: true }),
    sq('Adım 4: ölçüm hipotezi. Aynı rezervasyonları <b>rezervasyon ayına</b> göre sayarsan aylık tablo nasıl değişir? Rezervasyon ayına göre gerçekleşen rezervasyon sayısı: <code>ay</code>, <code>rezervasyon</code>. Aya göre sırala.',
      "SELECT strftime('%Y-%m', booked_at) AS ay, COUNT(*) AS rezervasyon FROM hv_bookings WHERE status = 'flown' GROUP BY strftime('%Y-%m', booked_at) ORDER BY ay;",
      { ord: true, why: 'Aynı olayı farklı bir tarihe yazmak eğilimi tamamen değiştirebilir. Mülakatta “bu metrik hangi tarihe göre?” sorusunu sormak, ölçüm hatasını erkenden yakalar.' }),
    mc('<p>Vakada “uçuş sayısı = aktif üye × üye başına uçuş” ayrıştırmasının faydası nedir?</p>', ['Sorguyu daha az tablo taradığı için hızlandırır', 'Düşüşün hangi bileşenden geldiğini ayırır', 'Aylar arasındaki mevsimsel etkiyi ortadan kaldırır', 'İptal edilen uçuşları otomatik olarak dışarıda bırakır'], 1,
      'Bir metriği çarpanlarına ayırmak, değişimin hangi bileşenden geldiğini gösterir. Daha az aktif üye kazanma/geri getirme sorununa, üye başına daha az uçuş ise sıklık ve fiyat sorununa işaret eder.')
  ]
}
];
const at = L.findIndex(l => l.id === 'mulakat-2');
L.splice(at < 0 ? L.length : at + 1, 0, ...lessons);

const P = window.SQLP_PATHS = window.SQLP_PATHS || [];
P.push({ id: 'mulakat', name: 'Teknik Mülakat Hazırlığı', short: 'MK', color: '#0F766E',
  desc: 'Veri analisti, analitik mühendisi ve veri bilimci mülakatları için soru kalıpları, ayrıntılı çözümler ve süreli simülasyon.',
  long: 'Mülakatlarda en sık çıkan SQL soru kalıplarını tek tek işler: grup başına ilk N, ardışık seriler, oranlar, tekrarlar, zaman pencereleri, kendine birleştirme, medyan ve açık uçlu vaka. Her derste netleştirme soruları, iki çözüm, sınır durumları, takip soruları ve görüşmecinin neye baktığı var. Sonunda Oyun Alanı\'ndaki süreli mülakat simülasyonu ve kodlama sınavıyla kendini dene.',
  skills: ['Netleştirme soruları', 'Pencere fonksiyonları', 'Boşluklar ve adalar', 'Doğru payda', 'Kendine birleştirme', 'Medyan ve yüzdelik', 'Vaka analizi'],
  lessons: ['mk-yontem', 'mulakat-1', 'mk-topn', 'mk-tekrar', 'mk-oran', 'mk-selfjoin', 'mk-zaman', 'mk-ardisik', 'mk-medyan', 'mulakat-2', 'mk-vaka', 'vaka-yilsonu', 'vaka-kayip'],
  comp: [
    { t: 'Yöntem', d: 'Düşünme ve anlatma düzeni', l: ['mk-yontem'] },
    { t: 'Klasik kalıplar', d: 'İlk N, tekrar, oran, kendine birleştirme', l: ['mulakat-1', 'mk-topn', 'mk-tekrar', 'mk-oran', 'mk-selfjoin'] },
    { t: 'İleri kalıplar', d: 'Zaman pencereleri, seriler, medyan', l: ['mk-zaman', 'mk-ardisik', 'mk-medyan', 'mulakat-2'] },
    { t: 'Vaka', d: 'Açık uçlu analitik sorular', l: ['mk-vaka', 'vaka-yilsonu', 'vaka-kayip'] }
  ],
  beyond: ['Oyun Alanı: süreli mülakat simülasyonu', 'Sınavlar: Teknik Mülakat kodlama sınavı', 'İstatistik temelleri (A/B testi, güven aralığı)', 'Ürün metrikleri ve sesli problem çözme pratiği']
});
})();
