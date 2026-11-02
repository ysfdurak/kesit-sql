/* Kesit SQL içerik 16: ikinci değerlendirme turu
   - öğrenme yollarında seviye sırası düzeltmeleri
   - (aşağıdaki bölümler: kısa ders metinleri, T-SQL ve teknik derslere alıştırmalar, şık dengeleme) */
(function () {
const L = window.SQLP_LESSONS;
const LM = id => L.find(l => l.id === id);
const PA = {}; (window.SQLP_PATHS || []).forEach(p => PA[p.id] = p);
/* Bir dersi öğrenme yolunda başka bir dersin ardına (ya da önüne) taşır; ders veya bağlantı yoksa dokunmaz */
const moveAfter = (pid, id, anchor) => { const p = PA[pid]; if (!p) return; const i = p.lessons.indexOf(id), j = p.lessons.indexOf(anchor); if (i < 0 || j < 0) return; p.lessons.splice(i, 1); p.lessons.splice(p.lessons.indexOf(anchor) + 1, 0, id); };
const moveBefore = (pid, id, anchor) => { const p = PA[pid]; if (!p) return; const i = p.lessons.indexOf(id), j = p.lessons.indexOf(anchor); if (i < 0 || j < 0) return; p.lessons.splice(i, 1); p.lessons.splice(p.lessons.indexOf(anchor), 0, id); };

/* Veri tipleri ayrıntılı (B2) temel bölümün ortasında kalmasın */
moveAfter('temel', 'veri-tipleri', 'collation');
moveAfter('analist', 'veri-tipleri', 'collation');
/* Temel seviyeye taşınan DML, temel konuların hemen ardından */
moveAfter('tsql', 'dml', 'kosullu');
moveAfter('muhendis', 'dml', 'kosullu');
moveAfter('dba', 'dml', 'group-by');
moveAfter('backend', 'dml', 'coalesce');
/* DBA: harmanlama temel sorgulardan sonra */
moveAfter('dba', 'collation', 'group-by');
/* Sertifika: ER modelleme ilişkiler dersinin yanında */
moveAfter('sertifika', 'er-modelleme', 'iliskiler');
/* Mühendis: modelleme normalizasyondan önce; veri tipleri tablo oluşturmadan önce; hiyerarşi CTE'den sonra; BigQuery bulut ambarlarından önce */
moveBefore('muhendis', 'er-modelleme', 'normalizasyon');
moveBefore('muhendis', 'veri-tipleri', 'ddl-create');
moveAfter('muhendis', 'hiyerarsi', 'cte');
moveBefore('muhendis', 'bq-giris', 'dwh-bulut');
moveAfter('muhendis', 'bq-dizi', 'bq-giris');
moveAfter('muhendis', 'bq-maliyet', 'bq-dizi');
/* Backend: veri tipleri tablo oluşturmadan önce */
moveBefore('backend', 'veri-tipleri', 'ddl-create');
/* Uzman: önce sorgu konuları, sonra mimari */
moveBefore('uzman', 'exists-anyall', 'ddl-create');
moveAfter('uzman', 'ardisik-seri', 'pencere-cerceve');
/* Veri bilimci ve YZ: BigQuery girişi YZ derslerinden önce */
moveBefore('bilimci', 'bq-giris', 'ai-giris');
moveAfter('bilimci', 'bq-dizi', 'bq-giris');
moveBefore('yz', 'bq-giris', 'ai-vektor');
/* JSON'dan sonra Python */
moveBefore('bilimci', 'json', 'cografi');
})();

/* ======================= Kısa ders metinlerinin genişletilmesi ======================= */
(function () {
const LM = id => (window.SQLP_LESSONS || []).find(l => l.id === id);
const more = (id, html) => { const l = LM(id); if (l) l.body = l.body + html; };
const NOT = src => CODE(src, null, { norun: true });

more('mulakat-2', `
<h2>Çözüm şablonu: dört adım</h2>
<ol>
<li><b>Tanecik:</b> Sonuçta bir satır neyi temsil edecek? (müşteri, ay, müşteri × ay)</li>
<li><b>Ara tablo:</b> O taneciğe indiren CTE'yi yaz ve tek başına çalıştırıp satır sayısını kontrol et.</li>
<li><b>Pencere veya birleştirme:</b> Karşılaştırma (önceki ay, ilk sipariş, sıra) gerekiyorsa pencere fonksiyonu ya da self join ekle.</li>
<li><b>Son filtre ve biçim:</b> WHERE, yuvarlama, sıralama ve sütun adları en sonda.</li>
</ol>
<h2>Bu derste geçen kalıplar</h2>
<table>
<tr><th>Soru tipi</th><th>Kalıp</th><th>Tuzak</th></tr>
<tr><td>Kümülatif toplam</td><td><code>SUM(x) OVER (ORDER BY tarih ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)</code></td><td>Aynı tarihte birden çok satır varsa varsayılan RANGE çerçevesi eşit satırları birlikte toplar; ROWS yaz ve sıralamaya benzersiz bir sütun ekle.</td></tr>
<tr><td>Aydan aya değişim</td><td>Aylık CTE + <code>LAG(n) OVER (ORDER BY ay)</code></td><td>Sipariş olmayan ay atlanırsa LAG bir önceki <b>dolu</b> aya bakar. Gerekirse takvim tablosuyla boşlukları doldur.</td></tr>
<tr><td>Ardışık dönemler</td><td>Dönem numarası − <code>ROW_NUMBER()</code> = grup anahtarı</td><td>Aynı ay iki kez sayılmasın diye önce <code>DISTINCT</code> ile müşteri × ay tekilleştir.</td></tr>
<tr><td>Elde tutma</td><td>İlk sipariş CTE'si + sonraki dönemle eşleştirme</td><td>Payda “ilk siparişi o dönemde olanlar”dır, tüm müşteriler değil.</td></tr>
<tr><td>Ortalama sepet</td><td>Önce sipariş düzeyinde topla, sonra ortalama al</td><td>Satır düzeyinde AVG almak çok kalemli siparişleri fazla ağırlıklandırır.</td></tr>
</table>
<h2>Örnek: satır ortalaması ile sipariş ortalaması farkı</h2>
<pre class="code">WITH s AS (
  SELECT order_id, SUM(quantity) AS adet
  FROM order_items
  GROUP BY order_id
)
SELECT ROUND(AVG(adet), 2) AS siparis_basina_adet,
       (SELECT ROUND(AVG(quantity), 2) FROM order_items) AS satir_basina_adet
FROM s;</pre>
<p>İki sayı farklıdır; mülakatta “ortalama sepet büyüklüğü” sorulduğunda beklenen birincisidir. Hangisini hesapladığını sesli söylemek, görüşmecinin en çok dikkat ettiği şeylerden biridir.</p>
<div class="note"><b>Sınır durumları sor</b>Sorgu yazmadan önce sor: iptal edilen siparişler dahil mi? Aynı gün iki sipariş varsa ne olur? Sipariş olmayan ay 0 mı görünmeli, hiç mi görünmemeli? Bu sorular çözümün kendisi kadar puan getirir.</div>
`);

more('ds-zaman', `
<h2>Özellik türleri</h2>
<table>
<tr><th>Tür</th><th>Örnek</th><th>SQL</th></tr>
<tr><td>Gecikme (lag)</td><td>Dünün, geçen haftanın aynı gününün değeri</td><td><code>LAG(y, 1)</code>, <code>LAG(y, 7)</code></td></tr>
<tr><td>Hareketli istatistik</td><td>Son 7 günün ortalaması, en büyüğü</td><td><code>AVG(y) OVER (ORDER BY d ROWS BETWEEN 7 PRECEDING AND 1 PRECEDING)</code></td></tr>
<tr><td>Takvim</td><td>Haftanın günü, ay, hafta sonu, tatil</td><td>Tarih fonksiyonları ve bir tatil tablosuyla birleştirme</td></tr>
<tr><td>Fark ve oran</td><td>Geçen haftaya göre değişim</td><td><code>y - LAG(y, 7)</code>, <code>y * 1.0 / NULLIF(LAG(y, 7), 0)</code></td></tr>
</table>
<h2>Boş günleri doldurmak şart</h2>
<p>Sipariş olmayan günler tabloda yoksa <code>LAG(y, 7)</code> yedi takvim günü öncesine değil, yedi <b>satır</b> öncesine bakar. Bu yüzden yukarıdaki örnek önce özyinelemeli CTE ile tüm günleri üretiyor, siparişleri LEFT JOIN ile bağlıyor ve eksik günler 0 sayılıyor.</p>
<h2>Eğitim ve test ayrımı zamana göre yapılır</h2>
<p>Zaman serisinde satırları rastgele bölmek, modelin geleceği görerek geçmişi tahmin etmesine yol açar. Bir kesim tarihi seçilir: öncesi eğitim, sonrası test.</p>
<pre class="code">WITH m AS (
  SELECT strftime('%Y-%m', order_date) AS ay, COUNT(*) AS y
  FROM orders
  GROUP BY strftime('%Y-%m', order_date)
)
SELECT ay, y,
       LAG(y) OVER (ORDER BY ay) AS lag_1,
       CASE WHEN ay < '2024-10' THEN 'egitim' ELSE 'test' END AS bolum
FROM m
ORDER BY ay;</pre>
<div class="warn"><b>Özellikler de kesim tarihine uymalı</b>Test dönemindeki bir satırın özellikleri yalnızca o satırdan önceki veriden hesaplanabilir. Pencere çerçevesini <code>1 PRECEDING</code>'de bitirmek bu kuralın SQL'deki karşılığıdır.</div>
`);

const KAMP = (tablolar, kaliplar) => `
<h2>Nasıl çalışmalı?</h2>
<ol>
<li>Soruyu oku ve sonuçta hangi sütunların, kaç satırın bekleneceğini tahmin et.</li>
<li>Önce <code>SELECT *</code> ile ilgili satırlara bak; sonra sütunları ve koşulları ekle.</li>
<li><b>Kontrol et</b>'e basmadan önce <b>Sadece çalıştır</b> ile sonucu incele.</li>
<li>İki denemede çözemezsen ipucuna bak; çözümü görmek XP'yi azaltır ama soruyu Tekrar listesine ekler.</li>
</ol>
<h2>Bu kampta en çok kullanacağın kalıplar</h2>
<table><tr><th>İhtiyaç</th><th>Kalıp</th></tr>${kaliplar.map(k => '<tr><td>' + k[0] + '</td><td><code>' + k[1] + '</code></td></tr>').join('')}</table>
<div class="note"><b>Tablolar</b>${tablolar} Sütunların açıklamaları ve örnek satırlar Veri setleri sayfasında.</div>
`;
more('kamp-musteri', KAMP('Yalnızca <code>customers</code>.', [
  ['Filtre', "WHERE city = 'İzmir' AND gender = 'K'"],
  ['Boş değer', 'WHERE city IS NULL'],
  ['Desen', "WHERE first_name LIKE 'E%'"],
  ['Grup ve sayı', 'GROUP BY city HAVING COUNT(*) >= 5'],
  ['Koşullu sayım', "SUM(CASE WHEN segment = 'Premium' THEN 1 ELSE 0 END)"],
  ['Metin parçası', "SUBSTR(email, INSTR(email, '@') + 1)"]
]));
more('kamp-ik', KAMP('<code>employees</code> ve <code>departments</code>. Yönetici ilişkisi <code>employees.manager_id → employees.emp_id</code> ile kurulur.', [
  ['Departman adı', 'JOIN departments d ON d.dept_id = e.dept_id'],
  ['Yönetici adı', 'LEFT JOIN employees m ON m.emp_id = e.manager_id'],
  ['Eşi olmayan da kalsın', 'departments d LEFT JOIN employees e ... COUNT(e.emp_id)'],
  ['Ortalamaya göre', 'WHERE salary > (SELECT AVG(salary) FROM employees)'],
  ['Departman içi sıra', 'DENSE_RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC)'],
  ['Departman ortalaması', 'AVG(salary) OVER (PARTITION BY dept_id)']
]));
more('kamp-eticaret', KAMP('<code>customers</code>, <code>orders</code>, <code>order_items</code>, <code>products</code>. Sipariş satırları <code>order_items</code>\'tadır; ciro her zaman satır düzeyinde hesaplanıp toplanır.', [
  ['Net tutar', 'SUM(oi.quantity * oi.unit_price * (1 - oi.discount))'],
  ['Teslim edilenler', "WHERE o.status = 'delivered'"],
  ['Hiç satılmamış', 'LEFT JOIN order_items oi ... WHERE oi.product_id IS NULL'],
  ['Sipariş sayısı şişmesin', 'COUNT(DISTINCT o.order_id)'],
  ['Müşterinin ilk siparişi', 'ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date, order_id)'],
  ['Önceki ay', 'LAG(ciro) OVER (ORDER BY ay)']
]));

more('proje-backend', `
<h2>Adımlar ve beklenen çıktı</h2>
<table>
<tr><th>Adım</th><th>Ne yapacaksın?</th><th>Ders</th></tr>
<tr><td>1. Şema</td><td>Sepet ve sepet satırı tabloları; tekillik, yabancı anahtar ve CHECK kısıtları</td><td>Kısıtlar ayrıntılı</td></tr>
<tr><td>2. Sepete ekle</td><td>Ürün sepette varsa adedi artıran, yoksa ekleyen tek ifade (upsert)</td><td>UPSERT ve MERGE</td></tr>
<tr><td>3. Ürün listesi</td><td>OFFSET yerine son görülen anahtardan devam eden sayfalama</td><td>Uygulamalarda sayfalama</td></tr>
<tr><td>4. Sepet özeti</td><td>Satır tutarları ve genel toplam</td><td>JOIN ile özetleme</td></tr>
<tr><td>5–6. Tasarım soruları</td><td>İşlem bütünlüğü ve tekrar eden istekler</td><td>Transaction, Uygulama veritabanı desenleri</td></tr>
</table>
<h2>Tasarım notları</h2>
<ul>
<li><b>“Bir müşterinin tek açık sepeti”</b> kuralı <code>UNIQUE (customer_id)</code> ile veritabanında korunur.</li>
<li><b>“Aynı ürün sepette bir kez”</b> kuralı bileşik birincil anahtarla sağlanır: <code>PRIMARY KEY (cart_id, product_id)</code>. Bu aynı zamanda upsert'in çakışma hedefidir.</li>
<li><b>Adet sınırı</b> <code>CHECK (quantity BETWEEN 1 AND 20)</code> ile yazılır; uygulama bir hata yapsa bile geçersiz adet kaydedilemez.</li>
</ul>
<h2>Siparişe çevirme işleminin iskeleti</h2>
${NOT(`BEGIN;
-- 1) Sipariş başlığı
INSERT INTO orders (order_id, customer_id, order_date, status, channel)
VALUES (:yeni_id, :musteri, :bugun, 'shipped', 'mobile');
-- 2) Sepet satırlarını sipariş satırına kopyala (fiyat o anki fiyattır)
INSERT INTO order_items (order_id, product_id, quantity, unit_price, discount)
SELECT :yeni_id, ci.product_id, ci.quantity, p.price, 0
FROM cart_item ci JOIN products p ON p.product_id = ci.product_id
WHERE ci.cart_id = :sepet;
-- 3) Stok düş; stok yetmezse işlemi geri al
UPDATE products SET stock = stock - (SELECT ci.quantity FROM cart_item ci
                                     WHERE ci.cart_id = :sepet AND ci.product_id = products.product_id)
WHERE product_id IN (SELECT product_id FROM cart_item WHERE cart_id = :sepet);
-- 4) Sepeti boşalt
DELETE FROM cart_item WHERE cart_id = :sepet;
COMMIT;`)}
<p>Adımlardan biri hata verirse uygulama <code>ROLLBACK</code> çalıştırır ve hiçbir tablo değişmez. Stok kontrolü için 3. adımdan önce yetersiz stoklu satır olup olmadığı sorgulanabilir ya da <code>CHECK (stock &gt;= 0)</code> kısıtı ihlali hatası yakalanabilir.</p>
`);

more('proje-tsql', `
<h2>Kullanacağın tablolar</h2>
<table>
<tr><th>Tablo</th><th>Sütunlar</th><th>Bağlantı</th></tr>
<tr><td><code>bank_branches</code></td><td>branch_id, name, city, opened_year</td><td></td></tr>
<tr><td><code>bank_customers</code></td><td>customer_id, full_name, city, segment, branch_id, …</td><td>branch_id → bank_branches</td></tr>
<tr><td><code>bank_accounts</code></td><td>account_id, customer_id, account_type, currency, status, …</td><td>customer_id → bank_customers</td></tr>
<tr><td><code>bank_txns</code></td><td>txn_id, account_id, txn_time, amount, txn_type, channel</td><td>account_id → bank_accounts</td></tr>
</table>
<p>Bir şubenin hareketlerine ulaşmak için dört tablo zincirlenir: şube → müşteri → hesap → hareket. Ay filtresi için yarı açık aralık kullan: <code>txn_time &gt;= @bas AND txn_time &lt; DATEADD(month, 1, @bas)</code>.</p>
<h2>Adımlar</h2>
<table>
<tr><th>Adım</th><th>T-SQL konusu</th></tr>
<tr><td>1. Değişkenlerle sorgu</td><td><code>DECLARE</code>, tarih hesabı</td></tr>
<tr><td>2. Geçici tablo</td><td><code>SELECT ... INTO #hareket</code></td></tr>
<tr><td>3. Saklı yordam</td><td><code>CREATE OR ALTER PROCEDURE</code>, parametreler, <code>SET NOCOUNT ON</code></td></tr>
<tr><td>4. Hata yönetimi</td><td><code>THROW</code>, <code>BEGIN TRY ... END CATCH</code></td></tr>
</table>
<h2>Yordam iskeleti</h2>
${CODE(`CREATE OR ALTER PROCEDURE dbo.usp_ornek
  @sube INT,
  @ay   CHAR(7)          -- 'YYYY-AA'
AS
BEGIN
  SET NOCOUNT ON;
  IF NOT EXISTS (SELECT 1 FROM dbo.bank_branches WHERE branch_id = @sube)
    THROW 50001, N'Şube bulunamadı', 1;

  DECLARE @bas DATE = CAST(@ay + '-01' AS DATE);

  SELECT t.txn_type, COUNT(*) AS adet
  FROM dbo.bank_txns t
  JOIN dbo.bank_accounts a  ON a.account_id = t.account_id
  JOIN dbo.bank_customers c ON c.customer_id = a.customer_id
  WHERE c.branch_id = @sube
    AND t.txn_time >= @bas AND t.txn_time < DATEADD(month, 1, @bas)
  GROUP BY t.txn_type;
END;`, null, { norun: true, base: 'tsql' })}
<div class="tip"><b>Önce sorgu, sonra yordam</b>Yordamın gövdesini önce değişkenli bir sorgu olarak çalıştır ve sonucu doğrula (Adım 1–2). Doğru çalışan sorguyu yordama sarmak en az hatalı yoldur.</div>
`);
})();

/* ======================= T-SQL modülüne alıştırmalar ======================= */
(function () {
const LM = id => (window.SQLP_LESSONS || []).find(l => l.id === id);
const add = (id, ...ex) => { const l = LM(id); if (l) l.ex.push(...ex); };
const ts = (q, sol, o) => Object.assign({ t: 'sql', base: 'tsql', dl: ['tsql'], q: '<p>' + q + '</p>', sol }, o || {});

add('ts-giris',
  ts('Unvanında (<code>title</code>) <b>Müdür</b> geçen çalışanların adını ve unvanını getir. Şema adını (<code>dbo.</code>) ve Unicode metin sabitini kullan: <code>first_name</code>, <code>title</code>.',
    "SELECT first_name, title FROM dbo.employees WHERE title LIKE N'%Müdür%';",
    { hint: "LIKE N'%Müdür%' — N öneki Türkçe karakterleri korur." }),
  ts('Müşterileri kayıt yılına göre say; yılı <code>YEAR()</code> fonksiyonuyla al: <code>yil</code>, <code>musteri</code>. Yıla göre sırala.',
    'SELECT YEAR(signup_date) AS yil, COUNT(*) AS musteri FROM dbo.customers GROUP BY YEAR(signup_date) ORDER BY yil;',
    { ord: true, hint: 'SQL Server\'da GROUP BY içinde SELECT takma adı kullanılamaz; YEAR(signup_date) ifadesini tekrar yaz.' }));

add('ts-donusum',
  ts('Siparişleri çeyreklere ayır: <code>DATEPART(quarter, order_date)</code> değerini <code>CHOOSE</code> ile <b>Ç1</b>, <b>Ç2</b>, <b>Ç3</b>, <b>Ç4</b> etiketine çevir ve 2024 siparişlerini çeyreğe göre say: <code>ceyrek</code>, <code>siparis</code>.',
    "SELECT CHOOSE(DATEPART(quarter, order_date), N'Ç1', N'Ç2', N'Ç3', N'Ç4') AS ceyrek, COUNT(*) AS siparis FROM orders WHERE order_date >= '2024-01-01' AND order_date < '2025-01-01' GROUP BY CHOOSE(DATEPART(quarter, order_date), N'Ç1', N'Ç2', N'Ç3', N'Ç4');",
    { hint: "CHOOSE(sıra, değer1, değer2, ...) sıradaki değeri döndürür: CHOOSE(2, 'a', 'b') = 'b'." }));

add('ts-gecici',
  ts('<code>#sehir</code> geçici tablosunu açıkça tanımla (<code>city NVARCHAR(50)</code>, <code>musteri INT</code>), şehir başına müşteri sayısıyla doldur (şehri boş olanlar hariç) ve en kalabalık 3 şehri getir: <code>city</code>, <code>musteri</code>. Eşitlikte şehir adına göre sırala.',
    'CREATE TABLE #sehir (city NVARCHAR(50), musteri INT); INSERT INTO #sehir (city, musteri) SELECT city, COUNT(*) FROM customers WHERE city IS NOT NULL GROUP BY city; SELECT TOP 3 city, musteri FROM #sehir ORDER BY musteri DESC, city;',
    { ord: true, hint: 'Önce CREATE TABLE #sehir, sonra INSERT INTO ... SELECT, en sonda SELECT TOP 3.' }));

add('ts-pivot',
  ts('PIVOT ile her kanal için durumlara göre sipariş sayılarını sütunlara çevir: <code>channel</code>, <code>delivered</code>, <code>shipped</code>, <code>cancelled</code>, <code>returned</code> (bu sırayla).',
    'SELECT channel, [delivered], [shipped], [cancelled], [returned] FROM (SELECT channel, status, order_id FROM orders) AS k PIVOT (COUNT(order_id) FOR status IN ([delivered], [shipped], [cancelled], [returned])) AS p;',
    { hint: 'Kaynak alt sorguda yalnızca channel, status ve sayılacak sütun (order_id) olsun.' }),
  ts('UNPIVOT ile Kitap kategorisindeki ürünlerin <code>price</code> ve <code>cost</code> sütunlarını satırlara çevir: <code>name</code>, <code>tur</code> (sütun adı), <code>deger</code>. Ada, sonra türe göre sırala.',
    "SELECT name, tur, deger FROM (SELECT name, price, cost FROM products WHERE category = N'Kitap') AS k UNPIVOT (deger FOR tur IN (price, cost)) AS u ORDER BY name, tur;",
    { ord: true, hint: 'UNPIVOT (değer_sütunu FOR ad_sütunu IN (sütun1, sütun2)).' }));

add('ts-apply',
  ts('1–5 numaralı müşterilerin her biri için satın aldığı <b>en yüksek birim fiyatlı</b> ürünü CROSS APPLY ile getir: <code>customer_id</code>, <code>name</code>, <code>unit_price</code>. Eşitlikte küçük product_id seçilsin.',
    'SELECT c.customer_id, x.name, x.unit_price FROM customers c CROSS APPLY (SELECT TOP 1 p.name, oi.unit_price FROM orders o JOIN order_items oi ON oi.order_id = o.order_id JOIN products p ON p.product_id = oi.product_id WHERE o.customer_id = c.customer_id ORDER BY oi.unit_price DESC, p.product_id) AS x WHERE c.customer_id <= 5;',
    { hint: 'APPLY alt sorgusunda dış tabloya WHERE o.customer_id = c.customer_id ile bağlan; TOP 1 ve ORDER BY birlikte.' }));

add('ts-sistem',
  ts('<code>INFORMATION_SCHEMA.COLUMNS</code> ile <code>customer_id</code> sütunu bulunan tabloların adlarını getir: <code>TABLE_NAME</code>. Ada göre sırala.',
    "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE COLUMN_NAME = 'customer_id' ORDER BY TABLE_NAME;",
    { ord: true, hint: 'Hangi tabloların bir sütunu paylaştığını bulmak, yabancı anahtar ilişkilerini keşfetmenin hızlı yoludur.' }));

add('ts-sequence',
  ts('<code>fatura</code> tablosunu <code>no INT IDENTITY(100, 10)</code> ve <code>tutar DECIMAL(12,2)</code> sütunlarıyla oluştur; 250 ve 400 tutarlı iki satır ekle (no sütununu yazmadan) ve tabloyu getir: <code>no</code>, <code>tutar</code>.',
    'CREATE TABLE fatura (no INT IDENTITY(100, 10), tutar DECIMAL(12, 2)); INSERT INTO fatura (tutar) VALUES (250), (400); SELECT no, tutar FROM fatura ORDER BY no;',
    { ord: true, hint: 'IDENTITY(başlangıç, artış). INSERT sütun listesine no yazılmaz; değer otomatik üretilir.' }),
  ts('<code>siparis_no</code> adında, 1 ile başlayıp 1 artan bir sequence oluştur ve tek bir SELECT içinde art arda üç kez <code>NEXT VALUE FOR</code> çağırmak yerine, üç satırlık bir kümeye numara ver: (\'a\'), (\'b\'), (\'c\') değerleri için <code>harf</code>, <code>no</code>.',
    "CREATE SEQUENCE siparis_no AS INT START WITH 1 INCREMENT BY 1; SELECT harf, NEXT VALUE FOR siparis_no AS no FROM (VALUES ('a'), ('b'), ('c')) AS t(harf);",
    { hint: 'NEXT VALUE FOR her satır için bir sonraki değeri verir.' }));

add('ts-merge',
  ts('MERGE ile <code>price_updates</code> tablosundaki <b>en son</b> fiyatları <code>products</code> tablosuna uygula: kaynak her ürün için en son <code>updated_at</code>\'a sahip satır olsun; eşleşen ürünün fiyatını güncelle.',
    'MERGE INTO products AS t USING (SELECT product_id, new_price FROM (SELECT product_id, new_price, ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY updated_at DESC) AS rn FROM price_updates) AS x WHERE rn = 1) AS s ON t.product_id = s.product_id WHEN MATCHED THEN UPDATE SET price = s.new_price;',
    { check: 'SELECT product_id, price FROM products ORDER BY product_id', hint: 'Kaynakta her ürün tek satır olmalı; yoksa MERGE aynı hedef satırı birden çok kez güncellemeye çalışır ve hata verir.' }),
  ts('MERGE ile <code>departments</code> tablosunu şu kaynakla <b>tam eşitle</b>: (1, \'Satış\', \'İstanbul\'), (2, \'Pazarlama\', \'Ankara\'), (12, \'Lojistik\', \'Kocaeli\'). Eşleşeni güncelle, kaynakta olmayanı ekle, hedefte olup kaynakta olmayanı sil.',
    "MERGE INTO departments AS t USING (SELECT 1 AS dept_id, N'Satış' AS name, N'İstanbul' AS city UNION ALL SELECT 2, N'Pazarlama', N'Ankara' UNION ALL SELECT 12, N'Lojistik', N'Kocaeli') AS s ON t.dept_id = s.dept_id WHEN MATCHED THEN UPDATE SET name = s.name, city = s.city WHEN NOT MATCHED THEN INSERT (dept_id, name, city) VALUES (s.dept_id, s.name, s.city) WHEN NOT MATCHED BY SOURCE THEN DELETE;",
    { check: 'SELECT dept_id, name, city FROM departments ORDER BY dept_id', hint: 'Üçüncü kol: WHEN NOT MATCHED BY SOURCE THEN DELETE.' }));

add('ts-proc',
  ts('<code>dbo.usp_UrunVarMi</code> adında, <code>@id INT</code> alan ve ürün varsa <code>RETURN 0</code>, yoksa <code>RETURN 1</code> döndüren bir yordam yaz. 999 numaralı ürün için çalıştır ve dönüş kodunu <code>durum</code> adıyla getir.',
    'CREATE OR ALTER PROCEDURE dbo.usp_UrunVarMi @id INT AS BEGIN IF EXISTS (SELECT 1 FROM products WHERE product_id = @id) RETURN 0; RETURN 1; END;\nGO\nDECLARE @r INT; EXEC @r = dbo.usp_UrunVarMi @id = 999; SELECT @r AS durum;',
    { hint: 'Dönüş kodu EXEC @degisken = yordam_adı ... biçiminde alınır.' }));

add('ts-func',
  ts('<code>dbo.fn_Yas(@dogum INT)</code> adında, 2024 yılına göre yaşı döndüren (INT) bir skaler fonksiyon yaz. Sonra 1–5 numaralı müşterilerin adını ve yaşını getir: <code>first_name</code>, <code>yas</code>.',
    'CREATE OR ALTER FUNCTION dbo.fn_Yas (@dogum INT) RETURNS INT AS BEGIN RETURN 2024 - @dogum; END;\nGO\nSELECT first_name, dbo.fn_Yas(birth_year) AS yas FROM customers WHERE customer_id <= 5;',
    { hint: 'Fonksiyonu çağırırken şema adını yaz: dbo.fn_Yas(...).' }));

add('ts-hata',
  ts('Sıfıra bölme yapan <code>SELECT 10 / 0</code> ifadesini TRY bloğunda çalıştır; CATCH bloğunda hata numarasını <code>hata_no</code>, mesajını <code>mesaj</code> adıyla döndür.',
    'BEGIN TRY SELECT 10 / 0; END TRY BEGIN CATCH SELECT ERROR_NUMBER() AS hata_no, ERROR_MESSAGE() AS mesaj; END CATCH;',
    { hint: 'ERROR_NUMBER(), ERROR_MESSAGE(), ERROR_LINE() yalnızca CATCH bloğunda anlamlıdır.' }));

add('ts-cursor',
  ts('Bir geliştirici 1–10 numaralı müşterileri imleçle dolaşıp her biri için sipariş sayısını hesaplıyor. Aynı sonucu imleçsiz, tek bir sorguyla getir; siparişi olmayan müşteri 0 görünsün: <code>customer_id</code>, <code>siparis</code>.',
    'SELECT c.customer_id, COUNT(o.order_id) AS siparis FROM customers c LEFT JOIN orders o ON o.customer_id = c.customer_id WHERE c.customer_id <= 10 GROUP BY c.customer_id;',
    { hint: 'LEFT JOIN ve COUNT(o.order_id); imleçteki “her satır için” mantığı GROUP BY ile kurulur.' }));

add('ts-trigger',
  ts('<code>fiyat_log(product_id INT, eski DECIMAL(12,2), yeni DECIMAL(12,2))</code> tablosunu oluştur. <code>products</code> tablosunda fiyat güncellendiğinde eski ve yeni fiyatı bu tabloya yazan <code>trg_fiyat</code> trigger\'ını yaz (inserted ile deleted\'ı product_id üzerinden birleştir). Ardından Kitap ürünlerinin fiyatını %10 artır.',
    "CREATE TABLE fiyat_log (product_id INT, eski DECIMAL(12, 2), yeni DECIMAL(12, 2));\nGO\nCREATE TRIGGER trg_fiyat ON products AFTER UPDATE AS BEGIN INSERT INTO fiyat_log (product_id, eski, yeni) SELECT d.product_id, d.price, i.price FROM inserted i JOIN deleted d ON d.product_id = i.product_id; END;\nGO\nUPDATE products SET price = price * 1.10 WHERE category = N'Kitap';",
    { check: 'SELECT product_id, ROUND(eski, 2) AS eski, ROUND(yeni, 2) AS yeni FROM fiyat_log ORDER BY product_id', hint: 'Bir UPDATE birden çok satırı değiştirebilir; trigger her satır için değil, ifade başına bir kez çalışır. Bu yüzden inserted ve deleted küme olarak birleştirilir.' }),
  ts('<code>dept_arsiv(dept_id INT, name NVARCHAR(50), city NVARCHAR(50))</code> tablosunu oluştur. <code>departments</code> tablosuna eklenen her departmanı bu tabloya da yazan <code>trg_dept_ekle</code> adlı bir AFTER INSERT trigger\'ı yaz (<code>inserted</code> tablosundan oku). Ardından tek bir INSERT ile iki departman ekle: (20, \'Ar-Ge\', \'İzmir\') ve (21, \'Kalite\', \'Bursa\').',
    "CREATE TABLE dept_arsiv (dept_id INT, name NVARCHAR(50), city NVARCHAR(50));\nGO\nCREATE TRIGGER trg_dept_ekle ON departments AFTER INSERT AS BEGIN INSERT INTO dept_arsiv (dept_id, name, city) SELECT dept_id, name, city FROM inserted; END;\nGO\nINSERT INTO departments (dept_id, name, city) VALUES (20, N'Ar-Ge', N'İzmir'), (21, N'Kalite', N'Bursa');",
    { check: 'SELECT dept_id, name, city FROM dept_arsiv ORDER BY dept_id', hint: 'SQL Server\'da trigger ifade başına bir kez çalışır; iki satırlık INSERT\'te inserted tablosunda iki satır olur. Bu yüzden VALUES yerine SELECT ... FROM inserted yazılır.' }));

add('ts-dinamik',
  ts('Tablo adını değişkenden alan dinamik bir sorgu yaz: <code>@tablo SYSNAME = N\'products\'</code>; sorgu metnini <code>QUOTENAME</code> ile güvenli oluştur ve <code>sp_executesql</code> ile tablonun satır sayısını <code>satir</code> adıyla döndür.',
    "DECLARE @tablo SYSNAME = N'products'; DECLARE @sql NVARCHAR(MAX) = N'SELECT COUNT(*) AS satir FROM ' + QUOTENAME(@tablo) + N';'; EXEC sp_executesql @sql;",
    { hint: 'Tablo ve sütun adları parametre olamaz; QUOTENAME adı köşeli paranteze alıp kaçırır.' }),
  ts('İki parametreli dinamik sorgu: <code>@kat NVARCHAR(50)</code> ve <code>@min DECIMAL(12,2)</code> parametreleriyle, kategorisi @kat olan ve fiyatı @min ve üzerinde olan ürünleri sayan sorguyu sp_executesql ile çalıştır (Elektronik, 1000): <code>adet</code>.',
    "DECLARE @sql NVARCHAR(MAX) = N'SELECT COUNT(*) AS adet FROM products WHERE category = @kat AND price >= @min;'; EXEC sp_executesql @sql, N'@kat NVARCHAR(50), @min DECIMAL(12, 2)', @kat = N'Elektronik', @min = 1000;",
    { hint: "Parametre tanımları tek bir metinde virgülle yazılır: N'@kat NVARCHAR(50), @min DECIMAL(12, 2)'." }));

add('ts-index',
  ts('Yalnızca iptal edilen siparişleri kapsayan, <code>order_date</code> üzerinde <code>ix_orders_iptal</code> adlı <b>filtreli</b> bir nonclustered indeks oluştur.',
    "CREATE NONCLUSTERED INDEX ix_orders_iptal ON orders (order_date) WHERE status = 'cancelled';",
    { check: "SELECT name, tbl_name FROM sqlite_master WHERE type = 'index' AND name = 'ix_orders_iptal'", hint: 'Filtreli indeks: CREATE INDEX ... ON tablo (sütun) WHERE koşul;' }),
  ts('Çalışan e-postalarının tekrar etmemesi için <code>employees</code> tablosunda <code>email</code> üzerinde <code>ux_employees_email</code> adlı benzersiz nonclustered indeks oluştur.',
    'CREATE UNIQUE NONCLUSTERED INDEX ux_employees_email ON employees (email);',
    { check: "SELECT name, \"unique\" FROM pragma_index_list('employees') WHERE name = 'ux_employees_email'", hint: 'CREATE UNIQUE NONCLUSTERED INDEX ad ON tablo (sütun);' }));

add('ts-plan',
  ts('Aşağıdaki SARGable olmayan sorguyu aynı sonucu verecek ve indeks kullanabilecek biçimde yeniden yaz: <code>SELECT COUNT(*) AS adet FROM products WHERE LEFT(name, 3) = N\'Kot\';</code>',
    "SELECT COUNT(*) AS adet FROM products WHERE name LIKE N'Kot%';",
    { hint: "Baştaki sabit kısımla LIKE N'Kot%' indeks aralığı olarak kullanılabilir." }),
  ts('Aşağıdaki sorguyu sütunu fonksiyona sokmadan yeniden yaz: <code>SELECT COUNT(*) AS adet FROM products WHERE ISNULL(stock, 0) &lt; 20;</code>',
    'SELECT COUNT(*) AS adet FROM products WHERE stock < 20 OR stock IS NULL;',
    { hint: 'ISNULL(stock, 0) < 20, “stok 20\'den az ya da bilinmiyor” demektir.' }));
})();

/* ======================= Diğer teknik derslere alıştırmalar ======================= */
(function () {
const LM = id => (window.SQLP_LESSONS || []).find(l => l.id === id);
const add = (id, ...ex) => { const l = LM(id); if (l) l.ex.push(...ex); };
const sq = (q, sol, o) => Object.assign({ t: 'sql', q: '<p>' + q + '</p>', sol }, o || {});
const NET = 'oi.quantity * oi.unit_price * (1 - oi.discount)';
const DDL = ['tsql', 'pg', 'mysql', 'oracle', 'sqlite'];
const SEHIR = "WITH sehir AS (\n  SELECT 'İstanbul' AS ad, 41.0082 AS enlem, 28.9784 AS boylam UNION ALL\n  SELECT 'İzmir', 38.4237, 27.1428 UNION ALL\n  SELECT 'Bursa', 40.1885, 29.0610 UNION ALL\n  SELECT 'Eskişehir', 39.7767, 30.5206 UNION ALL\n  SELECT 'Konya', 37.8746, 32.4932\n)\n";
const EMB = "WITH emb AS (\n    SELECT 5 AS product_id, 0.70 AS x, 0.30 AS y, 0.10 AS z UNION ALL\n    SELECT 6, 0.75, 0.25, 0.05 UNION ALL\n    SELECT 12, 0.10, 0.85, 0.30 UNION ALL\n    SELECT 22, 0.20, 0.10, 0.90 UNION ALL\n    SELECT 2, 0.60, 0.20, 0.40\n)\n";
const one = s => s.replace(/\s+/g, ' ').trim();

add('veri-tipleri',
  sq('Ürün fiyatlarının toplamını iki ondalık basamaklı kesin sayı tipine çevirerek getir: <code>toplam</code>. CAST ile <code>DECIMAL(12,2)</code> kullan.',
    'SELECT CAST(SUM(price) AS DECIMAL(12, 2)) AS toplam FROM products;',
    { hint: 'CAST(ifade AS DECIMAL(12, 2)). Oracle\'da DECIMAL, NUMBER(12,2) olarak karşılanır.' }),
  sq('Adı en uzun 3 ürünü karakter sayısıyla getir: <code>name</code>, <code>uzunluk</code>. Uzunluğa göre azalan, eşitlikte ada göre sırala.',
    'SELECT name, LENGTH(name) AS uzunluk FROM products ORDER BY uzunluk DESC, name LIMIT 3;',
    { ord: true, hint: 'SQL Server\'da LEN, diğerlerinde LENGTH (MySQL\'de bayt değil karakter için CHAR_LENGTH). Türkçe karakterler tek karakter sayılır.' }));

add('collation',
  sq('<code>raw_signups</code> şehirlerini <code>UPPER(TRIM(city))</code> ile standartlaştırıp grupla ve her anahtar için kayıt sayısını getir (boş ve NULL hariç): <code>anahtar</code>, <code>kayit</code>. Anahtara göre sırala. Sonuçta “İSTANBUL” ile “ISTANBUL”un neden ayrı kaldığına dikkat et.',
    "SELECT UPPER(TRIM(city)) AS anahtar, COUNT(*) AS kayit FROM raw_signups WHERE LENGTH(TRIM(city)) > 0 GROUP BY UPPER(TRIM(city)) ORDER BY anahtar;",
    { ord: true, hint: 'Boş metni ayıklamak için TRIM(city) <> \'\' yerine LENGTH(TRIM(city)) > 0 yaz; Oracle boş metni NULL saydığı için ilki tüm satırları eler. Varsayılan (Türkçe olmayan) harmanlamada küçük “i” büyük “I” olur, “İ” ise “İ” kalır. Bu yüzden istanbul ve İstanbul aynı anahtara düşmez.', why: 'Türkçe metinlerde UPPER/LOWER tek başına yetmez; Türkçe harmanlama ya da TRANSLATE ile karakter eşleme gerekir.' }));

add('er-modelleme',
  sq('Bire-çok ilişkinin “sıfır” tarafını kontrol et: hiç siparişi olmayan müşterilerin sayısını getir: <code>siparissiz</code>.',
    'SELECT COUNT(*) AS siparissiz FROM customers c LEFT JOIN orders o ON o.customer_id = c.customer_id WHERE o.order_id IS NULL;',
    { hint: 'ER diyagramında müşteri tarafı “bir”, sipariş tarafı “sıfır veya çok” olarak gösterilir. LEFT JOIN ile eşi olmayanları bul.' }),
  sq('Kendine referans veren ilişkiyi sorgula: yöneticisi olan çalışanların ve yöneticilerinin adını getir: <code>calisan</code>, <code>yonetici</code>. Çalışan adına göre sırala.',
    'SELECT e.first_name AS calisan, m.first_name AS yonetici FROM employees e JOIN employees m ON m.emp_id = e.manager_id ORDER BY e.first_name, e.emp_id;',
    { ord: true, hint: 'Aynı tabloyu iki takma adla birleştir: e (çalışan) ve m (yönetici).' }));

add('kisitlar',
  sq('<code>urun_yorum</code> tablosunu oluştur: <code>yorum_id</code> birincil anahtar, <code>product_id</code> products tablosuna yabancı anahtar, <code>puan</code> boş olamaz ve 1–5 arasında olmalı (CHECK). İki yorum ekle: (1, 5, 4) ve (2, 9, 5).',
    'CREATE TABLE urun_yorum (yorum_id INTEGER PRIMARY KEY, product_id INTEGER REFERENCES products(product_id), puan INTEGER NOT NULL CHECK (puan BETWEEN 1 AND 5)); INSERT INTO urun_yorum VALUES (1, 5, 4); INSERT INTO urun_yorum VALUES (2, 9, 5);',
    { dl: DDL, check: 'SELECT yorum_id, product_id, puan FROM urun_yorum ORDER BY yorum_id', hint: 'CHECK (puan BETWEEN 1 AND 5) ve REFERENCES products(product_id).' }),
  sq('<code>kampanya</code> tablosunu oluştur: <code>kod</code> (en fazla 20 karakter, birincil anahtar) ve <code>aktif</code> (tam sayı, varsayılan 1). Yalnızca kodu yazarak \'YAZ24\' kampanyasını ekle ve tabloyu getir.',
    "CREATE TABLE kampanya (kod VARCHAR(20) PRIMARY KEY, aktif INTEGER DEFAULT 1); INSERT INTO kampanya (kod) VALUES ('YAZ24');",
    { dl: DDL, check: 'SELECT kod, aktif FROM kampanya', hint: 'INSERT sütun listesinde aktif yazılmazsa DEFAULT değeri kullanılır.' }));

add('tasarim-kaliplari',
  sq('EAV tasarımının bedelini gör: aşağıdaki <code>ozellik</code> tablosundan her ürün için renk ve beden değerlerini <b>sütunlara</b> çevir: <code>urun_id</code>, <code>renk</code>, <code>beden</code>. Başlangıç kodundaki CTE\'yi kullan.',
    "WITH ozellik AS (SELECT 1 AS urun_id, 'renk' AS ad, 'Mavi' AS deger UNION ALL SELECT 1, 'beden', 'M' UNION ALL SELECT 2, 'renk', 'Siyah' UNION ALL SELECT 2, 'beden', 'L' UNION ALL SELECT 3, 'renk', 'Beyaz') SELECT urun_id, MAX(CASE WHEN ad = 'renk' THEN deger END) AS renk, MAX(CASE WHEN ad = 'beden' THEN deger END) AS beden FROM ozellik GROUP BY urun_id;",
    { start: "WITH ozellik AS (\n  SELECT 1 AS urun_id, 'renk' AS ad, 'Mavi' AS deger UNION ALL\n  SELECT 1, 'beden', 'M' UNION ALL\n  SELECT 2, 'renk', 'Siyah' UNION ALL\n  SELECT 2, 'beden', 'L' UNION ALL\n  SELECT 3, 'renk', 'Beyaz'\n)\n", hint: 'Her özellik için MAX(CASE WHEN ad = ... THEN deger END). Her yeni özellik sorguya bir sütun daha ekletir; EAV\'nin raporlama maliyeti budur.' }));

add('trigger',
  sq('<code>silinen_urun(product_id, name)</code> tablosunu oluştur. <code>products</code> tablosundan bir ürün silindiğinde silinen ürünün numarasını ve adını bu tabloya yazan <code>trg_urun_sil</code> trigger\'ını yaz. Ardından Hediye kategorisindeki ürünleri sil.',
    "CREATE TABLE silinen_urun (product_id INTEGER, name TEXT); CREATE TRIGGER trg_urun_sil AFTER DELETE ON products BEGIN INSERT INTO silinen_urun VALUES (OLD.product_id, OLD.name); END; DELETE FROM products WHERE category = 'Hediye';",
    { dl: ['tsql', 'sqlite'], check: 'SELECT product_id, name FROM silinen_urun ORDER BY product_id', solv: { tsql: "CREATE TABLE silinen_urun (product_id INT, name NVARCHAR(100));\nGO\nCREATE TRIGGER trg_urun_sil ON products\nAFTER DELETE\nAS\nBEGIN\n  INSERT INTO silinen_urun (product_id, name)\n  SELECT product_id, name FROM deleted;\nEND;\nGO\nDELETE FROM products WHERE category = N'Hediye';" }, hint: 'SQLite: OLD.sütun, SQL Server: deleted sanal tablosu.' }));

add('performans',
  sq('Siparişi olan müşteri sayısını <b>EXISTS</b> ile bul (JOIN ve DISTINCT kullanmadan): <code>musteri</code>.',
    'SELECT COUNT(*) AS musteri FROM customers c WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id);',
    { hint: 'EXISTS ilk eşleşmede durur; JOIN + DISTINCT ise tüm siparişleri birleştirip sonra tekilleştirir.' }),
  sq('Önce filtrele, sonra birleştir: 2024 Aralık ayında teslim edilen siparişlerin net cirosunu (tam sayı) kategori bazında getir; yalnızca gereken sütunları seç: <code>category</code>, <code>ciro</code>.',
    `SELECT p.category, ROUND(SUM(${NET})) AS ciro FROM orders o JOIN order_items oi ON oi.order_id = o.order_id JOIN products p ON p.product_id = oi.product_id WHERE o.status = 'delivered' AND o.order_date >= '2024-12-01' AND o.order_date < '2025-01-01' GROUP BY p.category;`,
    { hint: 'Tarih ve durum filtresini WHERE\'de aralık olarak yaz; SELECT * kullanma.' }));

add('performans-lab',
  sq('SQLite\'ta: <code>bank_txns</code> üzerinde <code>(account_id, txn_time)</code> sütunlarına <code>ix_hesap_zaman</code> adlı bileşik indeks oluştur; ardından 100019 numaralı hesabın Aralık 2024 işlem sayısını getir: <code>islem</code>.',
    "CREATE INDEX ix_hesap_zaman ON bank_txns (account_id, txn_time); SELECT COUNT(*) AS islem FROM bank_txns WHERE account_id = 100019 AND txn_time >= '2024-12-01' AND txn_time < '2025-01-01';",
    { base: 'sqlite', dl: ['sqlite'], hint: 'Bileşik indekste önce eşitlikle aranan sütun (account_id), sonra aralıkla aranan (txn_time) gelir.' }));

add('be-orm',
  sq('Bir ekran 2024-12-31 tarihli siparişleri listeliyor ve her satır için müşteri adını ve kalem sayısını ayrı sorgularla çekiyor (N+1). Hepsini tek sorguda getir: <code>order_id</code>, <code>first_name</code>, <code>kalem</code>.',
    "SELECT o.order_id, c.first_name, COUNT(oi.item_id) AS kalem FROM orders o JOIN customers c ON c.customer_id = o.customer_id LEFT JOIN order_items oi ON oi.order_id = o.order_id WHERE o.order_date = '2024-12-31' GROUP BY o.order_id, c.first_name;",
    { hint: 'Müşteriyi JOIN ile, kalem sayısını LEFT JOIN + COUNT ile aynı sorguda al.' }),
  sq('Sayfalı API için: aktif ürünleri fiyata göre listelerken (eşitlikte product_id) ikinci sayfayı getir; sayfa başına 5 ürün: <code>product_id</code>, <code>name</code>, <code>price</code>.',
    'SELECT product_id, name, price FROM products ORDER BY price, product_id LIMIT 5 OFFSET 5;',
    { ord: true, hint: 'Sıralama benzersiz olmalı; eşit fiyatlar sayfalar arasında kaymasın diye product_id ekle.' }));

add('be-desenler',
  sq('Tekrarlanabilir (idempotent) istek: başlangıç kodu <code>istek</code> tablosunu oluşturuyor. Aynı istek kimliğiyle (\'r-101\', ürün 5, adet 2) gelen isteği <b>iki kez</b> çalıştırıldığında yalnızca bir kez kaydeden INSERT ifadesini yaz ve iki kez çalıştır.',
    "CREATE TABLE istek (istek_id VARCHAR(20) PRIMARY KEY, urun INTEGER, adet INTEGER); INSERT INTO istek (istek_id, urun, adet) SELECT 'r-101', 5, 2 WHERE NOT EXISTS (SELECT 1 FROM istek WHERE istek_id = 'r-101'); INSERT INTO istek (istek_id, urun, adet) SELECT 'r-101', 5, 2 WHERE NOT EXISTS (SELECT 1 FROM istek WHERE istek_id = 'r-101');",
    { dl: ['sqlite', 'pg', 'tsql'], start: "CREATE TABLE istek (istek_id VARCHAR(20) PRIMARY KEY, urun INTEGER, adet INTEGER);\n-- Aşağıya aynı INSERT ifadesini iki kez yaz.\n", check: 'SELECT COUNT(*) AS satir, SUM(adet) AS adet FROM istek', hint: 'INSERT ... SELECT ... WHERE NOT EXISTS (SELECT 1 FROM istek WHERE istek_id = ...). Birincil anahtar da ikinci eklemeyi engeller ama hata verir; NOT EXISTS sessizce atlar.' }));

add('be-migration',
  sq('Daraltmadan önce doğrula: <code>customers</code> tablosuna <code>full_name</code> sütununu ekle, “ad soyad” biçiminde doldur ve ardından toplam satır sayısı ile dolu full_name sayısını yan yana getir. İkisi eşit değilse eski sütunlar kaldırılmamalıdır.',
    "ALTER TABLE customers ADD COLUMN full_name VARCHAR(100); UPDATE customers SET full_name = first_name || ' ' || last_name; SELECT COUNT(*) AS toplam, COUNT(full_name) AS dolu FROM customers;",
    { dl: DDL, hint: 'Son adım bir kontrol sorgusu: COUNT(*) ve COUNT(full_name).' }),
  sq('Yeni bir sözlük tablosu ekleyen migration: <code>musteri_segment(segment VARCHAR(30) birincil anahtar)</code> tablosunu oluştur ve customers tablosundaki tekrarsız segmentlerle doldur.',
    'CREATE TABLE musteri_segment (segment VARCHAR(30) PRIMARY KEY); INSERT INTO musteri_segment (segment) SELECT DISTINCT segment FROM customers WHERE segment IS NOT NULL;',
    { dl: DDL, check: 'SELECT segment FROM musteri_segment ORDER BY segment', hint: 'INSERT INTO ... SELECT DISTINCT ...' }));

add('cografi',
  sq('Başlangıç kodundaki şehirlerden Ankara\'ya (39.9334, 32.8597) <b>300 km\'den yakın</b> olanları mesafeleriyle getir (km, tam sayı): <code>ad</code>, <code>km</code>. Mesafeye göre sırala.',
    one(SEHIR) + ' SELECT ad, km FROM (SELECT ad, ROUND(6371 * 2 * ASIN(SQRT(POWER(SIN((enlem - 39.9334) * 0.0174532925 / 2), 2) + COS(39.9334 * 0.0174532925) * COS(enlem * 0.0174532925) * POWER(SIN((boylam - 32.8597) * 0.0174532925 / 2), 2))), 0) AS km FROM sehir) t WHERE km < 300 ORDER BY km;',
    { ord: true, start: SEHIR, hint: 'Mesafeyi alt sorguda hesapla; takma ad WHERE içinde doğrudan kullanılamaz.' }),
  sq('Başlangıç kodundaki şehirler arasında birbirine <b>en yakın</b> iki şehri bul: <code>a</code>, <code>b</code>, <code>km</code> (tam sayı). Her çifti bir kez say (a &lt; b).',
    one(SEHIR) + ' SELECT x.ad AS a, y.ad AS b, ROUND(6371 * 2 * ASIN(SQRT(POWER(SIN((y.enlem - x.enlem) * 0.0174532925 / 2), 2) + COS(x.enlem * 0.0174532925) * COS(y.enlem * 0.0174532925) * POWER(SIN((y.boylam - x.boylam) * 0.0174532925 / 2), 2))), 0) AS km FROM sehir x JOIN sehir y ON x.ad < y.ad ORDER BY km LIMIT 1;',
    { start: SEHIR, hint: 'Şehir listesini kendisiyle birleştir (x.ad < y.ad) ve Haversine formülünü iki noktanın koordinatlarıyla yaz.' }));

add('dwh',
  sq('Tarih boyutu (dimension) hazırla: 2024 Aralık ayında sipariş verilen günlerden tekrarsız bir liste üret: <code>tarih</code>, <code>yil</code>, <code>ay</code>, <code>gun</code>. Tarihe göre sırala.',
    "SELECT DISTINCT order_date AS tarih, CAST(strftime('%Y', order_date) AS INTEGER) AS yil, CAST(strftime('%m', order_date) AS INTEGER) AS ay, CAST(strftime('%d', order_date) AS INTEGER) AS gun FROM orders WHERE order_date >= '2024-12-01' AND order_date < '2025-01-01' ORDER BY tarih;",
    { ord: true, hint: 'Tarih parçaları için SQL türünün yıl/ay/gün fonksiyonlarını kullan.' }),
  sq('Yıldız şema sorgusu: fact (<code>order_items</code>) tablosunu iki boyutla (<code>products</code> ve <code>orders</code>) birleştirip teslim edilen net ciroyu kategori ve kanal kırılımında getir (tam sayı): <code>category</code>, <code>channel</code>, <code>ciro</code>.',
    `SELECT p.category, o.channel, ROUND(SUM(${NET})) AS ciro FROM order_items oi JOIN products p ON p.product_id = oi.product_id JOIN orders o ON o.order_id = oi.order_id WHERE o.status = 'delivered' GROUP BY p.category, o.channel;`,
    { hint: 'Ölçü (ciro) fact tablosundan, kırılımlar (kategori, kanal) boyutlardan gelir.' }));

add('guvenlik',
  sq('SQL injection\'ı gör: bir uygulama şehir aramasını metin birleştirerek kuruyor ve kullanıcı arama kutusuna <code>\' OR \'1\'=\'1</code> yazıyor. Oluşan sorgu şudur; çalıştır ve kaç müşterinin döndüğünü gör: <code>SELECT COUNT(*) AS adet FROM customers WHERE city = \'\' OR \'1\'=\'1\';</code>',
    "SELECT COUNT(*) AS adet FROM customers WHERE city = '' OR '1'='1';",
    { why: 'Koşul her satır için doğru olduğu için tüm müşteriler döndü. Parametreli sorguda aynı girdi yalnızca şehir adı olarak aranır ve sonuç 0 olur.', hint: 'Sorguyu olduğu gibi çalıştır.' }),
  sq('En az yetki ilkesiyle analistlere açılacak <code>v_musteri_analiz</code> görünümünü oluştur: yalnızca <code>customer_id</code>, <code>city</code>, <code>segment</code> ve <code>birth_year</code> sütunları olsun (ad, soyad ve e-posta olmasın).',
    'CREATE VIEW v_musteri_analiz AS SELECT customer_id, city, segment, birth_year FROM customers;',
    { check: 'SELECT * FROM v_musteri_analiz ORDER BY customer_id LIMIT 3', hint: 'Analist bu görünüme SELECT yetkisi alır; temel tabloya değil.' }));

add('kvkk',
  sq('Saklama süresi dolan veriyi imha et: 2024-01-01 öncesinde verilmiş ve iptal edilmiş siparişlerin satırlarını (<code>order_items</code>) ve ardından siparişlerin kendisini sil.',
    "DELETE FROM order_items WHERE order_id IN (SELECT order_id FROM orders WHERE status = 'cancelled' AND order_date < '2024-01-01'); DELETE FROM orders WHERE status = 'cancelled' AND order_date < '2024-01-01';",
    { check: "SELECT (SELECT COUNT(*) FROM orders) AS siparis, (SELECT COUNT(*) FROM order_items) AS satir, (SELECT COUNT(*) FROM orders WHERE status = 'cancelled' AND order_date < '2024-01-01') AS kalan", hint: 'Önce çocuk tabloyu (order_items), sonra ebeveyni (orders) sil; aksi halde yabancı anahtar engelleyebilir.' }));

add('sql-test',
  sq('Referans bütünlüğü testi: <code>orders</code> tablosunda <code>customers</code> tablosunda karşılığı olmayan <code>customer_id</code> değerlerini say: <code>hata</code>. Test geçerse sonuç 0\'dır.',
    'SELECT COUNT(*) AS hata FROM orders o WHERE NOT EXISTS (SELECT 1 FROM customers c WHERE c.customer_id = o.customer_id);',
    { hint: 'NOT EXISTS ile eşi olmayan siparişleri bul.' }));

add('tam-metin',
  sq('SQLite FTS ile: ürün adlarından <code>ara2</code> adında bir fts4 tablosu oluştur (docid = product_id), tüm ürünleri ekle ve adında <b>seti</b> kelimesi geçen ürünleri getir: <code>product_id</code>, <code>name</code>. Ürün numarasına göre sırala.',
    "CREATE VIRTUAL TABLE ara2 USING fts4(name); INSERT INTO ara2 (docid, name) SELECT product_id, name FROM products; SELECT docid AS product_id, name FROM ara2 WHERE ara2 MATCH 'seti' ORDER BY docid;",
    { base: 'sqlite', dl: ['sqlite'], ord: true, hint: 'FTS büyük/küçük harfe duyarsız kelime eşleştirmesi yapar; “Seti” de bulunur.' }));

add('python-sql',
  sq('pandas\'a aktarılacak müşteri özeti: 1–10 numaralı müşteriler için sipariş sayısı ve teslim edilen net ciro (2 basamak, yoksa 0): <code>customer_id</code>, <code>siparis</code>, <code>ciro</code>. Toplamayı SQL\'de yap.',
    `SELECT c.customer_id, COUNT(DISTINCT o.order_id) AS siparis, ROUND(COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN ${NET} END), 0), 2) AS ciro FROM customers c LEFT JOIN orders o ON o.customer_id = c.customer_id LEFT JOIN order_items oi ON oi.order_id = o.order_id WHERE c.customer_id <= 10 GROUP BY c.customer_id;`,
    { hint: 'COUNT(DISTINCT o.order_id) satır çoğalmasını önler; ciroyu koşullu SUM ile hesapla.' }),
  sq('Büyük veriyi Python\'a taşımadan: <code>web_events</code> tablosunda 2024 Kasım\'ın her günü için olay sayısını getir: <code>gun</code>, <code>olay</code>. Güne göre sırala.',
    "SELECT date(event_time) AS gun, COUNT(*) AS olay FROM web_events WHERE event_time >= '2024-11-01' AND event_time < '2024-12-01' GROUP BY date(event_time) ORDER BY gun;",
    { ord: true, hint: 'Saatli sütundan günü çıkar ve gruplandır; filtreyi yarı açık aralıkla yaz.' }));

add('ds-ornekleme',
  sq('Tekrarlanabilir %20 örnek: <code>customer_id % 5 = 0</code> olan müşterileri seç ve örnekteki segment dağılımını getir: <code>segment</code>, <code>musteri</code>.',
    'SELECT segment, COUNT(*) AS musteri FROM customers WHERE customer_id % 5 = 0 GROUP BY segment;',
    { hint: 'Kimliğe dayalı örnekleme her çalıştırmada aynı müşterileri seçer; RANDOM() ise her seferinde değişir.' }),
  sq('Tabakalı örnek: her segmentten customer_id sırasına göre ilk 3 müşteriyi seç: <code>segment</code>, <code>customer_id</code>. Segmente, sonra müşteri numarasına göre sırala.',
    'WITH s AS (SELECT segment, customer_id, ROW_NUMBER() OVER (PARTITION BY segment ORDER BY customer_id) AS rn FROM customers) SELECT segment, customer_id FROM s WHERE rn <= 3 ORDER BY segment, customer_id;',
    { ord: true, hint: 'ROW_NUMBER() OVER (PARTITION BY segment ...) ile her tabakada ayrı numara ver.' }));

add('de-etl',
  sq('Temiz katman: <code>raw_signups</code> şehirlerini standartlaştır; kırpılmış ve küçük harfe çevrilmiş değer \'istanbul\' ise \'İstanbul\', \'izmir\' ise \'İzmir\', \'ankara\' ise \'Ankara\', boş veya NULL ise \'Bilinmiyor\' olsun. Standart şehir başına kayıt sayısını getir: <code>sehir</code>, <code>kayit</code>.',
    "SELECT CASE WHEN COALESCE(LENGTH(TRIM(city)), 0) = 0 THEN 'Bilinmiyor' WHEN LOWER(TRIM(city)) = 'istanbul' OR TRIM(city) = 'İstanbul' THEN 'İstanbul' WHEN LOWER(TRIM(city)) = 'izmir' OR TRIM(city) = 'İzmir' THEN 'İzmir' WHEN LOWER(TRIM(city)) = 'ankara' THEN 'Ankara' ELSE TRIM(city) END AS sehir, COUNT(*) AS kayit FROM raw_signups GROUP BY CASE WHEN COALESCE(LENGTH(TRIM(city)), 0) = 0 THEN 'Bilinmiyor' WHEN LOWER(TRIM(city)) = 'istanbul' OR TRIM(city) = 'İstanbul' THEN 'İstanbul' WHEN LOWER(TRIM(city)) = 'izmir' OR TRIM(city) = 'İzmir' THEN 'İzmir' WHEN LOWER(TRIM(city)) = 'ankara' THEN 'Ankara' ELSE TRIM(city) END;",
    { hint: 'Önce NULL ve boş kontrolü, sonra LOWER(TRIM(city)) ile karşılaştırma. “İ” harfi LOWER ile her SQL türünde “i” olmayabilir; bu yüzden asıl yazımı da ayrıca kontrol et.' }),
  sq('İdempotent yükleme: başlangıç kodu <code>gunluk_ozet(gun, siparis)</code> tablosunu oluşturuyor. 2024-12-31 gününün özetini “önce sil, sonra ekle” yöntemiyle yükle; ifadeleri iki kez çalıştırsan da tek satır kalmalı.',
    "CREATE TABLE gunluk_ozet (gun VARCHAR(10), siparis INTEGER); DELETE FROM gunluk_ozet WHERE gun = '2024-12-31'; INSERT INTO gunluk_ozet (gun, siparis) SELECT '2024-12-31', COUNT(*) FROM orders WHERE order_date = '2024-12-31'; DELETE FROM gunluk_ozet WHERE gun = '2024-12-31'; INSERT INTO gunluk_ozet (gun, siparis) SELECT '2024-12-31', COUNT(*) FROM orders WHERE order_date = '2024-12-31';",
    { dl: ['sqlite', 'pg', 'mysql', 'tsql'], start: "CREATE TABLE gunluk_ozet (gun VARCHAR(10), siparis INTEGER);\n-- DELETE + INSERT ifadelerini yaz; iki kez tekrarlayarak sonucu dene.\n", check: 'SELECT gun, siparis FROM gunluk_ozet', hint: "DELETE FROM gunluk_ozet WHERE gun = '2024-12-31'; ardından INSERT ... SELECT ..." }));

add('ai-giris',
  sq('İyi bir istemle şu sorguyu istedin: “Yalnızca teslim edilen siparişler; 2024 için aylık net ciro (tam sayı); sütunlar ay (YYYY-AA) ve ciro; aya göre sıralı.” Doğru sorguyu yaz.',
    `SELECT strftime('%Y-%m', o.order_date) AS ay, ROUND(SUM(${NET})) AS ciro FROM orders o JOIN order_items oi ON oi.order_id = o.order_id WHERE o.status = 'delivered' AND o.order_date >= '2024-01-01' AND o.order_date < '2025-01-01' GROUP BY strftime('%Y-%m', o.order_date) ORDER BY ay;`,
    { ord: true, hint: 'İstemdeki her kural sorguda bir parçaya karşılık gelir: durum filtresi, tarih aralığı, gruplama, yuvarlama ve sıralama.' }),
  sq('Yapay zekâya “şehir ve segment kırılımında müşteri sayısı, en kalabalık 5 grup” dedin. Sorguyu kendin yaz (şehri boş olanlar hariç): <code>city</code>, <code>segment</code>, <code>musteri</code>. Sayıya göre azalan, eşitlikte şehre ve segmente göre sırala.',
    'SELECT city, segment, COUNT(*) AS musteri FROM customers WHERE city IS NOT NULL GROUP BY city, segment ORDER BY musteri DESC, city, segment LIMIT 5;',
    { ord: true, hint: 'Eşitlik durumunda sıralamayı belirtmezsen yapay zekâ da sen de her seferinde farklı 5 grup görebilirsin.' }));

add('ai-vektor',
  sq('Başlangıç kodundaki <code>emb</code> tablosunu kullanarak 5 numaralı ürüne <b>en az benzeyen</b> ürünü kosinüs benzerliğine göre bul: <code>product_id</code>, <code>benzerlik</code> (3 basamak).',
    one(EMB) + ' SELECT b.product_id, ROUND((a.x * b.x + a.y * b.y + a.z * b.z) / (SQRT(a.x * a.x + a.y * a.y + a.z * a.z) * SQRT(b.x * b.x + b.y * b.y + b.z * b.z)), 3) AS benzerlik FROM emb a JOIN emb b ON b.product_id <> a.product_id WHERE a.product_id = 5 ORDER BY benzerlik LIMIT 1;',
    { start: EMB, hint: 'Önceki alıştırmanın aynısı; yalnızca sıralama artan olsun ve ilk satırı al.' }));

add('ai-ml',
  sq('Kayıp (churn) modeli için etiket üret: 2024-07-01 öncesinde en az bir siparişi olan müşteriler için, 2024-07-01 ve sonrasında hiç sipariş vermemişse <code>churn = 1</code>, vermişse 0. Her etiketteki müşteri sayısını getir: <code>churn</code>, <code>musteri</code>.',
    "WITH m AS (SELECT customer_id, MAX(CASE WHEN order_date >= '2024-07-01' THEN 1 ELSE 0 END) AS sonra FROM orders GROUP BY customer_id HAVING MIN(order_date) < '2024-07-01') SELECT 1 - sonra AS churn, COUNT(*) AS musteri FROM m GROUP BY 1 - sonra;",
    { hint: 'Müşteri başına “kesimden sonra sipariş var mı” bayrağını MAX(CASE ...) ile hesapla; etiket bunun tersidir.' }));

add('bq-maliyet',
  sq('BigQuery yazımıyla, yalnızca gereken sütunları okuyup tarih filtresiyle tarananı azalt: 2024-11-29 gününde cihaz başına olay sayısını getir: <code>device</code>, <code>olay</code>.',
    "SELECT device, COUNT(*) AS olay FROM web_events WHERE event_time >= '2024-11-29' AND event_time < '2024-11-30' GROUP BY device;",
    { base: 'bq', dl: ['bq'], hint: 'SELECT * yerine yalnızca device sütunu okunur; bölümlenmiş tabloda tarih filtresi yalnızca o günün bölümünü taratır.' }));

add('metin-benzerlik',
  sq('SQL Server yazımıyla: <code>DIFFERENCE</code> fonksiyonu “Elif” ile en az 3 puan benzerlik veren çalışan adlarını getir: <code>emp_id</code>, <code>first_name</code>, <code>puan</code>. Puana göre azalan, eşitlikte emp_id\'ye göre sırala.',
    "SELECT emp_id, first_name, DIFFERENCE(first_name, 'Elif') AS puan FROM employees WHERE DIFFERENCE(first_name, 'Elif') >= 3 ORDER BY puan DESC, emp_id;",
    { base: 'tsql', dl: ['tsql'], ord: true, hint: 'DIFFERENCE iki SOUNDEX kodunu karşılaştırır ve 0–4 arası puan verir (4 en benzer).' }));
})();

/* ======================= Son eklemeler: çerçeve, ara toplam, görünüm ======================= */
(function () {
const LM = id => (window.SQLP_LESSONS || []).find(l => l.id === id);
const add = (id, ...ex) => { const l = LM(id); if (l) l.ex.push(...ex); };
add('pencere-cerceve', { t: 'sql', q: '<p>Her ürün için, aynı kategoride fiyatı kendi fiyatının <b>100 TL altı ile 100 TL üstü</b> arasında olan ürün sayısını (kendisi dahil) <code>RANGE</code> çerçevesiyle hesapla: <code>category</code>, <code>name</code>, <code>price</code>, <code>yakin</code>.</p>',
  sol: 'SELECT category, name, price, COUNT(*) OVER (PARTITION BY category ORDER BY price RANGE BETWEEN 100 PRECEDING AND 100 FOLLOWING) AS yakin FROM products;',
  dl: ['sqlite', 'pg', 'mysql', 'oracle', 'bq'], hint: 'RANGE değer aralığına bakar (fiyat ± 100), ROWS ise satır sayısına. SQL Server RANGE ile sayısal uzaklık desteklemez.' });
add('rollup', { t: 'sql', base: 'tsql', dl: ['tsql', 'pg', 'oracle'], q: '<p><code>GROUPING SETS</code> ile tek sorguda hem kategori başına ürün sayısını hem de genel toplamı getir; toplam satırında kategori yerine <b>\'TOPLAM\'</b> yazsın: <code>kategori</code>, <code>urun</code>.</p>',
  sol: "SELECT CASE WHEN GROUPING(category) = 1 THEN N'TOPLAM' ELSE category END AS kategori, COUNT(*) AS urun FROM products GROUP BY GROUPING SETS ((category), ());",
  solv: { pg: "SELECT CASE WHEN GROUPING(category) = 1 THEN 'TOPLAM' ELSE category END AS kategori, COUNT(*) AS urun FROM products GROUP BY GROUPING SETS ((category), ());", oracle: "SELECT CASE WHEN GROUPING(category) = 1 THEN 'TOPLAM' ELSE category END AS kategori, COUNT(*) AS urun FROM products GROUP BY GROUPING SETS ((category), ());" },
  hint: 'GROUPING(sütun) toplam satırında 1 döner; CASE ile etiketle. () boş grup genel toplamı üretir.' });
add('view-ileri', { t: 'sql', q: '<p>Materialized view\'ı elle taklit et: kategori başına ürün sayısını tutan <code>mv_kategori</code> tablosunu oluştur (<code>category</code>, <code>urun</code>). Ardından 5 numaralı ürünü sil ve tabloyu <b>yenile</b> (içini boşaltıp yeniden doldur).</p>',
  sol: 'CREATE TABLE mv_kategori AS SELECT category, COUNT(*) AS urun FROM products GROUP BY category; DELETE FROM order_items WHERE product_id = 5; DELETE FROM products WHERE product_id = 5; DELETE FROM mv_kategori; INSERT INTO mv_kategori SELECT category, COUNT(*) FROM products GROUP BY category;',
  dl: ['sqlite', 'pg', 'mysql', 'oracle'], check: 'SELECT category, urun FROM mv_kategori ORDER BY category',
  hint: 'Yenileme = DELETE FROM mv_kategori; INSERT INTO mv_kategori SELECT ... Ürünü silmeden önce satış satırlarını (order_items) silmen gerekebilir. PostgreSQL ve Oracle\'da gerçek karşılığı REFRESH MATERIALIZED VIEW / DBMS_MVIEW.REFRESH\'tir.' });
})();
