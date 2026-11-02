/* Kesit SQL içerik 27: İK Analitiği modülü (Pusula A.Ş. veri seti)
   Kadro, devir hızı, ücret, performans, işe alım, devamsızlık, bağlılık ve bitirme vakası. */
(function () {
const L = window.SQLP_LESSONS;
const sq = (q, sol, o) => Object.assign({ t: 'sql', q: '<p>' + q + '</p>', sol }, o || {});
const mc = (q, o, a, why) => ({ t: 'mc', q, o, a, why });
const O = { ord: true };
const MOD = 'İK Analitiği';
const ACT = (d, a) => `${a || 'e'}.hire_date <= '${d}' AND (${a || 'e'}.term_date IS NULL OR ${a || 'e'}.term_date > '${d}')`;
const CUR = "cur AS (SELECT s.emp_id, s.monthly_gross FROM ik_salaries s WHERE s.effective_date = (SELECT MAX(x.effective_date) FROM ik_salaries x WHERE x.emp_id = s.emp_id))";
const DEPT = "JOIN ik_positions p ON p.position_id = e.position_id JOIN ik_departments d ON d.dept_id = p.dept_id";

const lessons = [
{
  id: 'ik-giris', lv: 'B1', mod: MOD, min: 15,
  title: 'İK analitiğine giriş: Pusula A.Ş. verisini tanımak',
  sum: 'İnsan kaynakları verisinin yapısı: çalışan, görev, maaş ve olay tabloları; “o tarihte aktif” mantığı ve ilk metrikler.',
  body: `
<h2>İK verisi neden farklı?</h2>
<p>Satış verisinde her satır bir olaydır (sipariş). İK verisinde ise çoğu bilgi bir <b>zaman aralığında</b> geçerlidir: bir kişi bir tarihte işe girer, belli bir tarihe kadar bir görevde kalır, maaşı belli bir tarihten itibaren değişir. Bu yüzden İK sorularının neredeyse hepsi şu kalıba dayanır: <b>“X tarihinde durum neydi?”</b></p>
<table><tr><th>Tablo</th><th>Bir satır</th><th>Zaman mantığı</th></tr>
<tr><td>ik_employees</td><td>bir çalışan (ayrılanlar dahil)</td><td>hire_date … term_date</td></tr>
<tr><td>ik_job_history</td><td>bir kişinin bir görevi</td><td>start_date … end_date</td></tr>
<tr><td>ik_salaries</td><td>bir maaş değişikliği</td><td>effective_date’ten bir sonraki kayda kadar</td></tr>
<tr><td>ik_reviews</td><td>bir kişinin bir yılki değerlendirmesi</td><td>yıl</td></tr>
<tr><td>ik_leaves, ik_training</td><td>bir olay</td><td>tarih</td></tr>
<tr><td>ik_candidates</td><td>bir aday başvurusu</td><td>son aşama</td></tr></table>
<h2>“O tarihte aktif” koşulu</h2>
<p>Bir çalışan <code>t</code> tarihinde aktiftir, eğer o tarihte ya da önce işe girmiş ve o tarihten önce ayrılmamışsa:</p>
<pre class="code">SELECT COUNT(*) AS aktif
FROM ik_employees e
WHERE e.hire_date <= '2024-12-31'
  AND (e.term_date IS NULL OR e.term_date > '2024-12-31');</pre>
<p><code>term_date IS NULL</code> “hâlâ çalışıyor” demektir. Bu koşulu unutmak ya da <code>term_date &gt; t</code> yazıp NULL’ları kaybetmek İK raporlarındaki en yaygın hatadır.</p>
<h2>Kişisel veri</h2>
<div class="note"><b>Etik ve hukuk</b>İK verisi kişisel veridir (KVKK). Gerçek işte ad, doğum yılı ve maaş gibi alanlar yalnızca yetkili kişilerce, amaca uygun ve mümkünse toplulaştırılarak kullanılır. Küçük gruplarda (ör. 5 kişiden az) ortalama vermek kişiyi tanınır hâle getirebilir; raporlarda alt sınır koy. Bu veri setindeki kişiler hayalidir.</div>
`,
  ex: [
    sq('31 Aralık 2024 itibarıyla aktif çalışan sayısı: <code>aktif</code>.', `SELECT COUNT(*) AS aktif FROM ik_employees e WHERE ${ACT('2024-12-31')};`),
    sq('Bugüne kadar ayrılmış çalışan sayısı ve bunların gönüllü/gönülsüz dağılımı: <code>term_type</code>, <code>adet</code>.', 'SELECT term_type, COUNT(*) AS adet FROM ik_employees WHERE term_date IS NOT NULL GROUP BY term_type;'),
    sq('Aktif çalışanların bölümlere göre sayısı (güncel pozisyonun bölümü); sayıya göre azalan: <code>name</code>, <code>aktif</code>.', `SELECT d.name, COUNT(*) AS aktif FROM ik_employees e ${DEPT} WHERE e.term_date IS NULL GROUP BY d.dept_id, d.name ORDER BY aktif DESC, d.name;`, O),
    sq('Aktif çalışanların çalışma biçimi dağılımı (ofis, hibrit, uzaktan) ve yüzdesi (1 basamak): <code>work_mode</code>, <code>kisi</code>, <code>yuzde</code>.', 'SELECT work_mode, COUNT(*) AS kisi, ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS yuzde FROM ik_employees WHERE term_date IS NULL GROUP BY work_mode;'),
    sq('Her tabloda kaç satır var? ik_employees, ik_salaries, ik_leaves, ik_candidates: <code>tablo</code>, <code>satir</code>.', "SELECT 'ik_employees' AS tablo, COUNT(*) AS satir FROM ik_employees UNION ALL SELECT 'ik_salaries', COUNT(*) FROM ik_salaries UNION ALL SELECT 'ik_leaves', COUNT(*) FROM ik_leaves UNION ALL SELECT 'ik_candidates', COUNT(*) FROM ik_candidates;"),
    mc('<p>“30 Haziran 2024’te aktif çalışan” için hangisi doğrudur?</p>', ["<code>term_date IS NULL OR term_date &gt; '2024-06-30'</code> (işe giriş tarihine bakmadan)", "<code>hire_date &lt;= '2024-06-30' AND (term_date IS NULL OR term_date &gt; '2024-06-30')</code>", "<code>term_date IS NULL</code> (bugün aktif olan herkes o gün de aktifti)", "<code>hire_date BETWEEN '2024-01-01' AND '2024-06-30'</code>"], 1, 'Hem işe giriş tarihine hem ayrılış tarihine bakmak gerekir; ayrılmamış kişilerin term_date değeri NULL olduğu için ayrıca IS NULL koşulu yazılır.')
  ]
},
{
  id: 'ik-kadro', lv: 'B1', mod: MOD, min: 18,
  title: 'Kadro (headcount): bir tarihte, her ay ve kırılımlarıyla',
  sum: 'Belirli bir tarihteki kadro, aylık kadro serisi için takvimle birleştirme, giriş–çıkış köprüsü ve kıdem dağılımı.',
  body: `
<h2>Aylık kadro serisi</h2>
<p>Her ay sonu için aktif kişi sayısı: önce ay sonlarından bir takvim üret, sonra her tarih için “o tarihte aktif” koşuluyla say. Bu bir <b>eşit olmayan birleştirmedir</b>: takvimin her satırı, o tarihte aktif olan tüm çalışanlarla eşleşir.</p>
<pre class="code" data-na="tsql pg">WITH RECURSIVE ay(son) AS (
  SELECT '2024-01-31'
  UNION ALL
  SELECT date(son, '+1 day', '+1 month', '-1 day') FROM ay WHERE son &lt; '2024-12-31'
)
SELECT ay.son, COUNT(e.emp_id) AS kadro
FROM ay
LEFT JOIN ik_employees e
  ON e.hire_date &lt;= ay.son AND (e.term_date IS NULL OR e.term_date &gt; ay.son)
GROUP BY ay.son
ORDER BY ay.son;</pre>
<p><code>date(son, '+1 day', '+1 month', '-1 day')</code> bir sonraki ayın son gününü verir (31 Ocak → 29 Şubat → 31 Mart).</p>
<h2>Kadro köprüsü</h2>
<p>Yönetim “yıl başında 1.400 kişiydik, yıl sonunda neden 1.360?” diye sorar. Cevap köprüdür: <b>başlangıç + giriş − çıkış = bitiş</b>.</p>
<pre class="code">SELECT
  SUM(CASE WHEN hire_date &lt;= '2023-12-31' AND (term_date IS NULL OR term_date &gt; '2023-12-31') THEN 1 ELSE 0 END) AS baslangic,
  SUM(CASE WHEN hire_date BETWEEN '2024-01-01' AND '2024-12-31' THEN 1 ELSE 0 END) AS giris,
  SUM(CASE WHEN term_date BETWEEN '2024-01-01' AND '2024-12-31' THEN 1 ELSE 0 END) AS cikis,
  SUM(CASE WHEN hire_date &lt;= '2024-12-31' AND (term_date IS NULL OR term_date &gt; '2024-12-31') THEN 1 ELSE 0 END) AS bitis
FROM ik_employees;</pre>
<div class="tip"><b>Kontrol</b>Köprü tutmuyorsa (başlangıç + giriş − çıkış ≠ bitiş) tarih sınırlarında bir tutarsızlık vardır: ör. aynı gün girip çıkan kişi ya da sınır tarihinde &lt; ile &lt;= karışıklığı.</div>
<h2>Kıdem</h2>
<p>Kıdem, işe girişten bugüne (ya da ayrılışa) geçen süredir. Yıl olarak: <code>(julianday('2024-12-31') - julianday(hire_date)) / 365.25</code>.</p>
`,
  ex: [
    sq('2024\'ün her ay sonundaki kadroyu getir: <code>son</code>, <code>kadro</code>. Tarihe göre sırala.', `WITH RECURSIVE ay(son) AS (SELECT '2024-01-31' UNION ALL SELECT date(son, '+1 day', '+1 month', '-1 day') FROM ay WHERE son < '2024-12-31') SELECT ay.son, COUNT(e.emp_id) AS kadro FROM ay LEFT JOIN ik_employees e ON e.hire_date <= ay.son AND (e.term_date IS NULL OR e.term_date > ay.son) GROUP BY ay.son ORDER BY ay.son;`, { ord: true, dl: ['sqlite'] }),
    sq('2024 kadro köprüsü: <code>baslangic</code>, <code>giris</code>, <code>cikis</code>, <code>bitis</code>.', "SELECT SUM(CASE WHEN hire_date <= '2023-12-31' AND (term_date IS NULL OR term_date > '2023-12-31') THEN 1 ELSE 0 END) AS baslangic, SUM(CASE WHEN hire_date >= '2024-01-01' AND hire_date <= '2024-12-31' THEN 1 ELSE 0 END) AS giris, SUM(CASE WHEN term_date >= '2024-01-01' AND term_date <= '2024-12-31' THEN 1 ELSE 0 END) AS cikis, SUM(CASE WHEN hire_date <= '2024-12-31' AND (term_date IS NULL OR term_date > '2024-12-31') THEN 1 ELSE 0 END) AS bitis FROM ik_employees;"),
    sq('Fonksiyon alanına göre (Ticari, Operasyon, Teknoloji, Destek, Yönetim) 31.12.2023 ve 31.12.2024 kadrosu yan yana: <code>function_area</code>, <code>k2023</code>, <code>k2024</code>. Alana göre sırala.', `SELECT d.function_area, SUM(CASE WHEN ${ACT('2023-12-31')} THEN 1 ELSE 0 END) AS k2023, SUM(CASE WHEN ${ACT('2024-12-31')} THEN 1 ELSE 0 END) AS k2024 FROM ik_employees e ${DEPT} GROUP BY d.function_area ORDER BY d.function_area;`, O),
    sq('Aktif çalışanların kıdem dağılımı: 0–1, 1–3, 3–5, 5+ yıl (31.12.2024 itibarıyla): <code>kidem</code>, <code>kisi</code>.', "SELECT CASE WHEN k < 1 THEN '0-1' WHEN k < 3 THEN '1-3' WHEN k < 5 THEN '3-5' ELSE '5+' END AS kidem, COUNT(*) AS kisi FROM (SELECT (julianday('2024-12-31') - julianday(hire_date)) / 365.25 AS k FROM ik_employees WHERE term_date IS NULL) t GROUP BY CASE WHEN k < 1 THEN '0-1' WHEN k < 3 THEN '1-3' WHEN k < 5 THEN '3-5' ELSE '5+' END;"),
    sq('Aktif çalışanlarda kadın oranı, seviyeye göre (yüzde, 1 basamak; güncel pozisyonun seviyesi): <code>level</code>, <code>kisi</code>, <code>kadin_orani</code>. Seviyeye göre sırala.', "SELECT p.level, COUNT(*) AS kisi, ROUND(100.0 * SUM(CASE WHEN e.gender = 'K' THEN 1 ELSE 0 END) / COUNT(*), 1) AS kadin_orani FROM ik_employees e JOIN ik_positions p ON p.position_id = e.position_id WHERE e.term_date IS NULL GROUP BY p.level ORDER BY p.level;", O),
    sq('Yöneticisi başına doğrudan bağlı aktif çalışan sayısı (yönetim aralığı); en geniş ekibe sahip 5 yönetici (eşitlikte sicil): <code>full_name</code>, <code>ekip</code>.', 'SELECT m.full_name, COUNT(*) AS ekip FROM ik_employees e JOIN ik_employees m ON m.emp_id = e.manager_id WHERE e.term_date IS NULL GROUP BY m.emp_id, m.full_name ORDER BY ekip DESC, m.emp_id LIMIT 5;', O)
  ]
},
{
  id: 'ik-devir', lv: 'B2', mod: MOD, min: 22,
  title: 'Devir hızı (turnover): kim, ne zaman, neden ayrılıyor?',
  sum: 'Yıllık devir hızı formülü, gönüllü ve gönülsüz ayrılma, ilk yılda kayıp, bölüm ve yönetici kırılımı, işe giriş kohortlarında elde tutma.',
  body: `
<h2>Formül</h2>
<p>Yıllık devir hızı = <b>yıl içinde ayrılan kişi sayısı / ortalama kadro</b>. Ortalama kadro genellikle (yıl başı kadrosu + yıl sonu kadrosu) / 2 alınır; daha hassası aylık kadroların ortalamasıdır.</p>
<pre class="code">WITH k AS (
  SELECT
    SUM(CASE WHEN hire_date &lt;= '2023-12-31' AND (term_date IS NULL OR term_date &gt; '2023-12-31') THEN 1 ELSE 0 END) AS bas,
    SUM(CASE WHEN hire_date &lt;= '2024-12-31' AND (term_date IS NULL OR term_date &gt; '2024-12-31') THEN 1 ELSE 0 END) AS son,
    SUM(CASE WHEN term_date BETWEEN '2024-01-01' AND '2024-12-31' THEN 1 ELSE 0 END) AS ayrilan,
    SUM(CASE WHEN term_date BETWEEN '2024-01-01' AND '2024-12-31' AND term_type = 'gönüllü' THEN 1 ELSE 0 END) AS gonullu
  FROM ik_employees
)
SELECT ROUND(100.0 * ayrilan / ((bas + son) / 2.0), 1) AS devir,
       ROUND(100.0 * gonullu / ((bas + son) / 2.0), 1) AS gonullu_devir
FROM k;</pre>
<h2>Neden ayrı ayrı bakılır?</h2>
<ul><li><b>Gönüllü</b> ayrılma (kişi kendisi ayrılır) bağlılık, ücret ve yönetici kalitesiyle ilgilidir; şirketin kontrolündedir.</li>
<li><b>Gönülsüz</b> ayrılma (işten çıkarma) performans ve yeniden yapılanmayla ilgilidir.</li>
<li><b>İlk yıl devri</b>: işe girdikten sonraki 12 ay içinde ayrılanlar. Yüksekse işe alım ya da uyum (onboarding) sorunu vardır.</li></ul>
<h2>Kohort elde tutma</h2>
<p>Aynı çeyrekte işe girenlerin yüzde kaçı 12 ay sonra hâlâ şirkette? Bu, işe alım kalitesini zaman içinde izlemenin en adil yoludur, çünkü herkes aynı süre izlenir. Son 12 ay içinde işe girenler henüz 12 ay doldurmadığı için hesaba katılmamalıdır.</p>
<div class="note"><b>Küçük ekip uyarısı</b>10 kişilik bir ekipte 2 ayrılma %20 devir demektir. Oranın yanında her zaman kişi sayısını da göster.</div>
`,
  ex: [
    sq('2024 yılı toplam ve gönüllü devir hızı (yüzde, 1 basamak; ortalama kadro = (yıl başı + yıl sonu) / 2): <code>devir</code>, <code>gonullu_devir</code>.', "WITH k AS (SELECT SUM(CASE WHEN hire_date <= '2023-12-31' AND (term_date IS NULL OR term_date > '2023-12-31') THEN 1 ELSE 0 END) AS bas, SUM(CASE WHEN hire_date <= '2024-12-31' AND (term_date IS NULL OR term_date > '2024-12-31') THEN 1 ELSE 0 END) AS son, SUM(CASE WHEN term_date >= '2024-01-01' AND term_date <= '2024-12-31' THEN 1 ELSE 0 END) AS ayrilan, SUM(CASE WHEN term_date >= '2024-01-01' AND term_date <= '2024-12-31' AND term_type = 'gönüllü' THEN 1 ELSE 0 END) AS gonullu FROM ik_employees) SELECT ROUND(100.0 * ayrilan / ((bas + son) / 2.0), 1) AS devir, ROUND(100.0 * gonullu / ((bas + son) / 2.0), 1) AS gonullu_devir FROM k;"),
    sq('Yıllara göre (2019–2024) ayrılan kişi sayısı ve gönüllü payı (yüzde, 1 basamak): <code>yil</code>, <code>ayrilan</code>, <code>gonullu_pay</code>. Yıla göre sırala.', "SELECT strftime('%Y', term_date) AS yil, COUNT(*) AS ayrilan, ROUND(100.0 * SUM(CASE WHEN term_type = 'gönüllü' THEN 1 ELSE 0 END) / COUNT(*), 1) AS gonullu_pay FROM ik_employees WHERE term_date IS NOT NULL GROUP BY strftime('%Y', term_date) ORDER BY yil;", O),
    sq('Bölüm bazında 2024 devir hızı (yüzde, 1 basamak) ve ayrılan kişi sayısı; yalnızca yıl başında en az 20 kişilik bölümler, devire göre azalan: <code>name</code>, <code>ayrilan</code>, <code>devir</code>.', `WITH b AS (SELECT d.name, SUM(CASE WHEN ${ACT('2023-12-31')} THEN 1 ELSE 0 END) AS bas, SUM(CASE WHEN ${ACT('2024-12-31')} THEN 1 ELSE 0 END) AS son, SUM(CASE WHEN e.term_date >= '2024-01-01' AND e.term_date <= '2024-12-31' THEN 1 ELSE 0 END) AS ayrilan FROM ik_employees e ${DEPT} GROUP BY d.dept_id, d.name) SELECT name, ayrilan, ROUND(100.0 * ayrilan / ((bas + son) / 2.0), 1) AS devir FROM b WHERE bas >= 20 ORDER BY devir DESC, name;`, O),
    sq('İlk yıl devri: 2021–2023 arasında işe girenlerden işe girişten sonraki 365 gün içinde ayrılanların oranı, işe giriş yılına göre (yüzde, 1 basamak): <code>yil</code>, <code>giren</code>, <code>ilk_yil_oran</code>.', "SELECT strftime('%Y', hire_date) AS yil, COUNT(*) AS giren, ROUND(100.0 * SUM(CASE WHEN term_date IS NOT NULL AND julianday(term_date) - julianday(hire_date) <= 365 THEN 1 ELSE 0 END) / COUNT(*), 1) AS ilk_yil_oran FROM ik_employees WHERE hire_date >= '2021-01-01' AND hire_date < '2024-01-01' GROUP BY strftime('%Y', hire_date) ORDER BY yil;", O),
    sq('Gönüllü ayrılma nedenlerinin dağılımı (2024): <code>term_reason</code>, <code>kisi</code>. Sayıya göre azalan.', "SELECT term_reason, COUNT(*) AS kisi FROM ik_employees WHERE term_type = 'gönüllü' AND term_date >= '2024-01-01' GROUP BY term_reason ORDER BY kisi DESC, term_reason;", O),
    sq('Kohort elde tutma: 2022 ve 2023\'te işe girenler için, işe giriş çeyreğine göre 12 ay sonra hâlâ şirkette olanların oranı (yüzde, 1 basamak): <code>ceyrek</code> (YYYY-Q1 gibi), <code>giren</code>, <code>kalan_12ay</code>. Çeyreğe göre sırala.', "SELECT strftime('%Y', hire_date) || '-Q' || ((CAST(strftime('%m', hire_date) AS INTEGER) + 2) / 3) AS ceyrek, COUNT(*) AS giren, ROUND(100.0 * SUM(CASE WHEN term_date IS NULL OR julianday(term_date) - julianday(hire_date) > 365 THEN 1 ELSE 0 END) / COUNT(*), 1) AS kalan_12ay FROM ik_employees WHERE hire_date >= '2022-01-01' AND hire_date < '2024-01-01' GROUP BY 1 ORDER BY ceyrek;", { ord: true, dl: ['sqlite'] }),
    mc('<p>Bir bölümde yıl başında 8, yıl sonunda 10 kişi var ve yıl içinde 3 kişi ayrılmış. Devir hızı için en doğru ifade?</p>', ['%30; 3 / 10, çünkü dönem başındaki kadro her zaman doğru paydadır', '%33; 3 / ortalama kadro (9); küçük ekipte kişi sayısıyla birlikte raporlanmalı', '%37,5; 3 / 8, çünkü payda dönem sonunda kalan kişi sayısı olmalıdır', '%3; ayrılan kişi sayısı'], 1, 'Devir hızı ortalama kadroya göre hesaplanır. Küçük ekiplerde oranlar oynaktır; yanında kişi sayısını vermek yanlış yorumu önler.')
  ]
},
{
  id: 'ik-ucret', lv: 'B2', mod: MOD, min: 22,
  title: 'Ücret analitiği: güncel maaş, bant konumu ve ücret eşitliği',
  sum: 'Maaş geçmişinden güncel ve bir tarihteki maaşı bulmak, compa-ratio ile bant konumu, zam oranları ve ham ile seviye içi cinsiyet ücret farkı.',
  body: `
<h2>Güncel maaş: en son kayıt</h2>
<p><code>ik_salaries</code> bir değişiklik günlüğüdür. Bir kişinin bir tarihteki maaşı, o tarihten önceki <b>en son</b> kayıttır. İki yazım:</p>
<pre class="code">-- ilişkili alt sorgu
SELECT s.emp_id, s.monthly_gross
FROM ik_salaries s
WHERE s.effective_date = (SELECT MAX(x.effective_date) FROM ik_salaries x
                          WHERE x.emp_id = s.emp_id AND x.effective_date &lt;= '2024-12-31');

-- pencere fonksiyonu
SELECT emp_id, monthly_gross FROM (
  SELECT emp_id, monthly_gross,
         ROW_NUMBER() OVER (PARTITION BY emp_id ORDER BY effective_date DESC) AS rn
  FROM ik_salaries WHERE effective_date &lt;= '2024-12-31'
) t WHERE rn = 1;</pre>
<h2>Compa-ratio: bant içinde nerede?</h2>
<p><b>compa-ratio = maaş / bant ortası</b>. 1,00 bandın tam ortası; 0,90’ın altı genellikle “bandın altında”, 1,10’un üstü “bandın üstünde” kabul edilir. Bant ortası burada (band_min + band_max) / 2.</p>
<h2>Ücret farkı: ham ve düzeltilmiş</h2>
<p><b>Ham fark</b>, kadınların ve erkeklerin ortalama maaşları arasındaki farktır. Ama gruplar farklı seviyelerde yoğunlaşmışsa (ör. üst seviyelerde daha az kadın), ham fark seviye karışımını da içerir. <b>Seviye içi (düzeltilmiş) fark</b>, aynı seviye ve bölümde karşılaştırma yapar. İkisi de önemlidir: ham fark temsil sorununu, seviye içi fark eşit işe eşit ücret sorununu gösterir.</p>
<pre class="code" data-norun>WITH cur AS (...güncel maaş...)
SELECT p.level,
       ROUND(AVG(CASE WHEN e.gender = 'K' THEN c.monthly_gross END)) AS kadin,
       ROUND(AVG(CASE WHEN e.gender = 'E' THEN c.monthly_gross END)) AS erkek
FROM ik_employees e JOIN cur c ON c.emp_id = e.emp_id
JOIN ik_positions p ON p.position_id = e.position_id
WHERE e.term_date IS NULL
GROUP BY p.level;</pre>
<div class="note"><b>Yorum</b>Ortalama yerine medyan kullanmak birkaç yüksek maaşın etkisini azaltır. Ayrıca bir seviyede bir cinsiyetten 5’ten az kişi varsa o hücreyi raporlama.</div>
`,
  ex: [
    sq('Aktif çalışanların güncel maaşlarının ortalaması ve en yüksek maaş (tam sayı): <code>ort</code>, <code>en_yuksek</code>.', `WITH ${CUR} SELECT ROUND(AVG(c.monthly_gross)) AS ort, MAX(c.monthly_gross) AS en_yuksek FROM ik_employees e JOIN cur c ON c.emp_id = e.emp_id WHERE e.term_date IS NULL;`),
    sq('Her bölümün aktif çalışanlarının medyan değil <b>ortalama</b> güncel maaşı ve kişi sayısı; ortalamaya göre azalan (tam sayı): <code>name</code>, <code>kisi</code>, <code>ort</code>.', `WITH ${CUR} SELECT d.name, COUNT(*) AS kisi, ROUND(AVG(c.monthly_gross)) AS ort FROM ik_employees e JOIN cur c ON c.emp_id = e.emp_id ${DEPT} WHERE e.term_date IS NULL GROUP BY d.dept_id, d.name ORDER BY ort DESC, d.name;`, O),
    sq('Compa-ratio: aktif çalışanları bant konumuna göre sınıflandır (0,90 altı <b>altında</b>, 1,10 üstü <b>üstünde</b>, arası <b>bantta</b>): <code>konum</code>, <code>kisi</code>.', `WITH ${CUR}, r AS (SELECT c.monthly_gross / ((p.band_min + p.band_max) / 2.0) AS cr FROM ik_employees e JOIN cur c ON c.emp_id = e.emp_id JOIN ik_positions p ON p.position_id = e.position_id WHERE e.term_date IS NULL) SELECT CASE WHEN cr < 0.9 THEN 'altında' WHEN cr > 1.1 THEN 'üstünde' ELSE 'bantta' END AS konum, COUNT(*) AS kisi FROM r GROUP BY CASE WHEN cr < 0.9 THEN 'altında' WHEN cr > 1.1 THEN 'üstünde' ELSE 'bantta' END;`),
    sq('Ham cinsiyet ücret farkı: aktif kadın ve erkeklerin ortalama güncel maaşı ve farkın erkek ortalamasına oranı (yüzde, 1 basamak): <code>kadin</code>, <code>erkek</code>, <code>fark_yuzde</code>.', `WITH ${CUR}, g AS (SELECT AVG(CASE WHEN e.gender = 'K' THEN c.monthly_gross END) AS k, AVG(CASE WHEN e.gender = 'E' THEN c.monthly_gross END) AS m FROM ik_employees e JOIN cur c ON c.emp_id = e.emp_id WHERE e.term_date IS NULL) SELECT ROUND(k) AS kadin, ROUND(m) AS erkek, ROUND(100.0 * (m - k) / m, 1) AS fark_yuzde FROM g;`),
    sq('Seviye içi fark: her seviyede kadın ve erkek ortalamaları ve fark yüzdesi (1 basamak); yalnızca her iki cinsiyetten en az 5 kişi olan seviyeler: <code>level</code>, <code>kadin</code>, <code>erkek</code>, <code>fark_yuzde</code>. Seviyeye göre.', `WITH ${CUR}, g AS (SELECT p.level, AVG(CASE WHEN e.gender = 'K' THEN c.monthly_gross END) AS k, AVG(CASE WHEN e.gender = 'E' THEN c.monthly_gross END) AS m, SUM(CASE WHEN e.gender = 'K' THEN 1 ELSE 0 END) AS nk, SUM(CASE WHEN e.gender = 'E' THEN 1 ELSE 0 END) AS nm FROM ik_employees e JOIN cur c ON c.emp_id = e.emp_id JOIN ik_positions p ON p.position_id = e.position_id WHERE e.term_date IS NULL GROUP BY p.level) SELECT level, ROUND(k) AS kadin, ROUND(m) AS erkek, ROUND(100.0 * (m - k) / m, 1) AS fark_yuzde FROM g WHERE nk >= 5 AND nm >= 5 ORDER BY level;`, O),
    sq('Zam oranı: 2024 Ocak yıllık zammında ortalama artış yüzdesi (önceki maaşa göre, LAG ile; 1 basamak): <code>ort_zam</code>.', "WITH s AS (SELECT emp_id, effective_date, monthly_gross, reason, LAG(monthly_gross) OVER (PARTITION BY emp_id ORDER BY effective_date) AS onceki FROM ik_salaries) SELECT ROUND(AVG(100.0 * (monthly_gross - onceki) / onceki), 1) AS ort_zam FROM s WHERE reason = 'yıllık zam' AND effective_date = '2024-01-01' AND onceki IS NOT NULL;"),
    sq('31 Aralık 2022 itibarıyla aktif olanların o tarihteki maaşlarının ortalaması (tarihteki maaş = o tarihten önceki son kayıt; tam sayı): <code>ort_2022</code>.', "SELECT ROUND(AVG(s.monthly_gross)) AS ort_2022 FROM ik_employees e JOIN ik_salaries s ON s.emp_id = e.emp_id AND s.effective_date = (SELECT MAX(x.effective_date) FROM ik_salaries x WHERE x.emp_id = e.emp_id AND x.effective_date <= '2022-12-31') WHERE e.hire_date <= '2022-12-31' AND (e.term_date IS NULL OR e.term_date > '2022-12-31');")
  ]
},
{
  id: 'ik-performans', lv: 'B2', mod: MOD, min: 18,
  title: 'Performans analitiği: dağılım, kalibrasyon ve 9-kutu',
  sum: 'Puan dağılımı, değerlendiren yöneticiye göre sapma (kalibrasyon), performans × potansiyel matrisi ve “kaçırılmaması gereken” ayrılmalar.',
  body: `
<h2>Dağılım ve kalibrasyon</h2>
<p>Performans puanlarının şirket genelinde makul bir dağılımı olmalı. Bir yöneticinin ortalaması şirket ortalamasından belirgin biçimde yüksek ya da düşükse, ya ekibi gerçekten farklıdır ya da <b>puanlama alışkanlığı</b> farklıdır. Kalibrasyon toplantılarından önce bu sapmayı veriyle göstermek analistin işidir.</p>
<pre class="code">SELECT reviewer_id, COUNT(*) AS kisi, ROUND(AVG(rating), 2) AS ort,
       ROUND(AVG(rating) - (SELECT AVG(rating) FROM ik_reviews WHERE review_year = 2024), 2) AS sapma
FROM ik_reviews
WHERE review_year = 2024
GROUP BY reviewer_id
HAVING COUNT(*) &gt;= 10
ORDER BY sapma DESC;</pre>
<h2>9-kutu (performans × potansiyel)</h2>
<p>Performansı düşük–orta–yüksek (1–2, 3, 4–5) ve potansiyeli düşük–orta–yüksek diye ikiye çapraz tablo yap. Sağ üst köşe (yüksek performans, yüksek potansiyel) yedekleme ve terfi planlarının adaylarıdır.</p>
<h2>Kaçırılmaması gereken ayrılma</h2>
<p>Gönüllü ayrılan ve son değerlendirmesinde 4–5 almış kişiler <b>istenmeyen kayıp</b> (regretted attrition) sayılır. Toplam devirden çok daha önemli bir göstergedir.</p>
`,
  ex: [
    sq('2024 performans puanı dağılımı ve yüzdesi (1 basamak): <code>rating</code>, <code>kisi</code>, <code>yuzde</code>. Puana göre.', 'SELECT rating, COUNT(*) AS kisi, ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS yuzde FROM ik_reviews WHERE review_year = 2024 GROUP BY rating ORDER BY rating;', O),
    sq('Kalibrasyon: 2024\'te en az 10 kişiyi değerlendiren yöneticilerden ortalaması şirket ortalamasından en çok sapan 3\'ü (mutlak sapma; 2 basamak): <code>full_name</code>, <code>kisi</code>, <code>ort</code>, <code>sapma</code>.', 'WITH g AS (SELECT AVG(rating) AS sirket FROM ik_reviews WHERE review_year = 2024), r AS (SELECT reviewer_id, COUNT(*) AS kisi, AVG(rating) AS ort FROM ik_reviews WHERE review_year = 2024 GROUP BY reviewer_id HAVING COUNT(*) >= 10) SELECT m.full_name, r.kisi, ROUND(r.ort, 2) AS ort, ROUND(r.ort - g.sirket, 2) AS sapma FROM r CROSS JOIN g JOIN ik_employees m ON m.emp_id = r.reviewer_id ORDER BY ABS(r.ort - g.sirket) DESC, m.full_name LIMIT 3;', O),
    sq('9-kutu: 2024 değerlendirmelerinde performans grubu (düşük 1–2, orta 3, yüksek 4–5) × potansiyel çapraz sayımı; potansiyeli boş olanlar hariç: <code>perf</code>, <code>dusuk</code>, <code>orta</code>, <code>yuksek</code>. Performans grubuna göre.', "SELECT CASE WHEN rating <= 2 THEN '1 düşük' WHEN rating = 3 THEN '2 orta' ELSE '3 yüksek' END AS perf, SUM(CASE WHEN potential = 'düşük' THEN 1 ELSE 0 END) AS dusuk, SUM(CASE WHEN potential = 'orta' THEN 1 ELSE 0 END) AS orta, SUM(CASE WHEN potential = 'yüksek' THEN 1 ELSE 0 END) AS yuksek FROM ik_reviews WHERE review_year = 2024 AND potential IS NOT NULL GROUP BY CASE WHEN rating <= 2 THEN '1 düşük' WHEN rating = 3 THEN '2 orta' ELSE '3 yüksek' END ORDER BY perf;", O),
    sq('İstenmeyen kayıp: 2024\'te gönüllü ayrılanlardan, ayrılmadan önceki son değerlendirmesinde 4 veya 5 alanların sayısı ve tüm gönüllü ayrılanlara oranı (yüzde, 1 basamak): <code>istenmeyen</code>, <code>oran</code>.', "WITH a AS (SELECT e.emp_id, (SELECT r.rating FROM ik_reviews r WHERE r.emp_id = e.emp_id ORDER BY r.review_year DESC LIMIT 1) AS son_puan FROM ik_employees e WHERE e.term_type = 'gönüllü' AND e.term_date >= '2024-01-01') SELECT SUM(CASE WHEN son_puan >= 4 THEN 1 ELSE 0 END) AS istenmeyen, ROUND(100.0 * SUM(CASE WHEN son_puan >= 4 THEN 1 ELSE 0 END) / COUNT(*), 1) AS oran FROM a;"),
    sq('Performans ve ayrılma: 2023 değerlendirmesinde puanı 1–2, 3 ve 4–5 olan (2023 sonunda aktif) kişilerin 2024\'te ayrılma oranı (yüzde, 1 basamak): <code>grup</code>, <code>kisi</code>, <code>ayrilma</code>.', "SELECT CASE WHEN r.rating <= 2 THEN '1-2' WHEN r.rating = 3 THEN '3' ELSE '4-5' END AS grup, COUNT(*) AS kisi, ROUND(100.0 * SUM(CASE WHEN e.term_date >= '2024-01-01' AND e.term_date <= '2024-12-31' THEN 1 ELSE 0 END) / COUNT(*), 1) AS ayrilma FROM ik_reviews r JOIN ik_employees e ON e.emp_id = r.emp_id WHERE r.review_year = 2023 AND (e.term_date IS NULL OR e.term_date > '2023-12-31') GROUP BY CASE WHEN r.rating <= 2 THEN '1-2' WHEN r.rating = 3 THEN '3' ELSE '4-5' END ORDER BY grup;", O)
  ]
},
{
  id: 'ik-alim', lv: 'B2', mod: MOD, min: 18,
  title: 'İşe alım analitiği: huni, kaynak etkinliği ve doldurma süresi',
  sum: 'Aday hunisinde aşama aşama dönüşüm, kaynaklara göre işe alım oranı ve kalıcılık, kadro talebinin doldurulma süresi ve açık taleplerin yaşı.',
  body: `
<h2>Huni</h2>
<p><code>ik_candidates.stage</code> adayın ulaştığı <b>son</b> aşamadır. Bir aşamaya ulaşan sayısı, o aşamada ya da sonrasında kalan herkesin toplamıdır. Bu yüzden aşamalara bir sıra numarası verip “bu sıraya ulaşmış mı?” diye saymak gerekir.</p>
<pre class="code">WITH a AS (
  SELECT CASE stage WHEN 'başvuru' THEN 1 WHEN 'ön eleme' THEN 2 WHEN 'mülakat' THEN 3
                    WHEN 'teklif' THEN 4 WHEN 'teklif reddedildi' THEN 4 WHEN 'işe alındı' THEN 5 END AS sira
  FROM ik_candidates
)
SELECT SUM(CASE WHEN sira &gt;= 1 THEN 1 ELSE 0 END) AS basvuru,
       SUM(CASE WHEN sira &gt;= 2 THEN 1 ELSE 0 END) AS on_eleme,
       SUM(CASE WHEN sira &gt;= 3 THEN 1 ELSE 0 END) AS mulakat,
       SUM(CASE WHEN sira &gt;= 4 THEN 1 ELSE 0 END) AS teklif,
       SUM(CASE WHEN sira &gt;= 5 THEN 1 ELSE 0 END) AS ise_alim
FROM a;</pre>
<h2>Kaynak etkinliği</h2>
<p>Bir kaynağın değeri yalnızca kaç aday getirdiği değil; <b>işe alınma oranı</b>, <b>doldurma süresi</b> ve işe alınanların <b>kalıcılığı</b> ve <b>performansıdır</b>. Çok aday getiren bir kaynak, düşük dönüşüm ve yüksek ilk yıl devriyle pahalı olabilir.</p>
<h2>Doldurma süresi (time to fill)</h2>
<p>Kadro talebinin açılışı ile kapanışı arasındaki gün sayısı. Dağılım çarpık olduğu için ortalama yerine <b>medyan</b> raporlanır.</p>
`,
  ex: [
    sq('Aday hunisi: her aşamaya ulaşan aday sayısı (aşama sırası: başvuru 1, ön eleme 2, mülakat 3, teklif ve teklif reddedildi 4, işe alındı 5): <code>basvuru</code>, <code>on_eleme</code>, <code>mulakat</code>, <code>teklif</code>, <code>ise_alim</code>.', "WITH a AS (SELECT CASE stage WHEN 'başvuru' THEN 1 WHEN 'ön eleme' THEN 2 WHEN 'mülakat' THEN 3 WHEN 'teklif' THEN 4 WHEN 'teklif reddedildi' THEN 4 WHEN 'işe alındı' THEN 5 END AS sira FROM ik_candidates) SELECT SUM(CASE WHEN sira >= 1 THEN 1 ELSE 0 END) AS basvuru, SUM(CASE WHEN sira >= 2 THEN 1 ELSE 0 END) AS on_eleme, SUM(CASE WHEN sira >= 3 THEN 1 ELSE 0 END) AS mulakat, SUM(CASE WHEN sira >= 4 THEN 1 ELSE 0 END) AS teklif, SUM(CASE WHEN sira >= 5 THEN 1 ELSE 0 END) AS ise_alim FROM a;"),
    sq('Teklif kabul oranı: teklif alan adaylardan (teklif, teklif reddedildi, işe alındı) işe alınanların oranı (yüzde, 1 basamak): <code>kabul</code>.', "SELECT ROUND(100.0 * SUM(CASE WHEN stage = 'işe alındı' THEN 1 ELSE 0 END) / SUM(CASE WHEN stage IN ('teklif', 'teklif reddedildi', 'işe alındı') THEN 1 ELSE 0 END), 1) AS kabul FROM ik_candidates;"),
    sq('Kaynak etkinliği: kaynağa göre aday sayısı ve işe alınma oranı (yüzde, 2 basamak); orana göre azalan: <code>source</code>, <code>aday</code>, <code>ise_alim_orani</code>.', "SELECT source, COUNT(*) AS aday, ROUND(100.0 * SUM(CASE WHEN stage = 'işe alındı' THEN 1 ELSE 0 END) / COUNT(*), 2) AS ise_alim_orani FROM ik_candidates GROUP BY source ORDER BY ise_alim_orani DESC, source;", O),
    sq('Kaynağın kalıcılığa etkisi: 2022–2023\'te işe girenlerin işe alım kaynağına göre ilk 12 ayda ayrılma oranı (yüzde, 1 basamak): <code>hire_source</code>, <code>giren</code>, <code>ilk_yil_ayrilma</code>.', "SELECT hire_source, COUNT(*) AS giren, ROUND(100.0 * SUM(CASE WHEN term_date IS NOT NULL AND julianday(term_date) - julianday(hire_date) <= 365 THEN 1 ELSE 0 END) / COUNT(*), 1) AS ilk_yil_ayrilma FROM ik_employees WHERE hire_date >= '2022-01-01' AND hire_date < '2024-01-01' GROUP BY hire_source ORDER BY ilk_yil_ayrilma, hire_source;", O),
    sq('Doldurma süresi medyanı (gün; doldurulan talepler; FLOOR ile taşınabilir medyan, tam sayı): <code>medyan_gun</code>.', "WITH t AS (SELECT julianday(closed_date) - julianday(opened_date) AS gun FROM ik_requisitions WHERE status = 'dolduruldu'), r AS (SELECT gun, ROW_NUMBER() OVER (ORDER BY gun) AS rn, COUNT(*) OVER () AS n FROM t) SELECT ROUND(AVG(gun)) AS medyan_gun FROM r WHERE rn IN (FLOOR((n + 1) / 2), FLOOR((n + 2) / 2));"),
    sq('31 Aralık 2024 itibarıyla açık kadro taleplerinin yaşı: 30 gün altı, 30–60, 60 gün üstü: <code>yas</code>, <code>talep</code>.', "SELECT CASE WHEN g < 30 THEN '0-30' WHEN g <= 60 THEN '30-60' ELSE '60+' END AS yas, COUNT(*) AS talep FROM (SELECT julianday('2024-12-31') - julianday(opened_date) AS g FROM ik_requisitions WHERE status = 'açık') t GROUP BY CASE WHEN g < 30 THEN '0-30' WHEN g <= 60 THEN '30-60' ELSE '60+' END;")
  ]
},
{
  id: 'ik-devamsizlik', lv: 'B1', mod: MOD, min: 15,
  title: 'Devamsızlık ve izin analitiği: Bradford faktörü ve Pazartesi etkisi',
  sum: 'İzin türlerine göre gün sayıları, sık ve kısa devamsızlığı öne çıkaran Bradford faktörü, haftanın gününe göre hastalık izinleri ve kullanılmayan yıllık izin.',
  body: `
<h2>Kısa ama sık devamsızlık</h2>
<p>Bir yılda 10 gün hastalık izni iki biçimde olabilir: tek seferde 10 gün (ameliyat) ya da 10 ayrı 1 günlük izin. İkincisi işin akışını çok daha fazla bozar. <b>Bradford faktörü</b> bunu ölçer: <b>B = S² × D</b>; S izin sayısı (kaç kez), D toplam gün.</p>
<table><tr><th>Örüntü</th><th>S</th><th>D</th><th>B</th></tr><tr><td>1 × 10 gün</td><td>1</td><td>10</td><td>10</td></tr><tr><td>5 × 2 gün</td><td>5</td><td>10</td><td>250</td></tr><tr><td>10 × 1 gün</td><td>10</td><td>10</td><td>1.000</td></tr></table>
<pre class="code">SELECT emp_id, COUNT(*) AS s, SUM(days) AS d, COUNT(*) * COUNT(*) * SUM(days) AS bradford
FROM ik_leaves
WHERE leave_type = 'hastalık' AND start_date &gt;= '2024-01-01'
GROUP BY emp_id
ORDER BY bradford DESC
LIMIT 10;</pre>
<div class="note"><b>Dikkat</b>Bradford faktörü bir konuşma başlatmak içindir, otomatik yaptırım için değil. Kronik hastalık ya da engellilik durumları ayrıca ele alınmalıdır.</div>
<h2>Haftanın günü</h2>
<p>Hastalık izinlerinin Pazartesi günleri belirgin biçimde yoğunlaşması yaygın bir örüntüdür; hafta sonunu uzatma eğilimine işaret edebilir. SQLite’ta <code>strftime('%w', tarih)</code> pazar için 0, pazartesi için 1 döndürür.</p>
`,
  ex: [
    sq('2024\'te izin türüne göre toplam izin günü ve kayıt sayısı: <code>leave_type</code>, <code>kayit</code>, <code>gun</code>. Güne göre azalan.', "SELECT leave_type, COUNT(*) AS kayit, SUM(days) AS gun FROM ik_leaves WHERE start_date >= '2024-01-01' AND start_date < '2025-01-01' GROUP BY leave_type ORDER BY gun DESC;", O),
    sq('Bradford faktörü: 2024 hastalık izinlerinde en yüksek 5 çalışan (eşitlikte sicil): <code>emp_id</code>, <code>s</code>, <code>d</code>, <code>bradford</code>.', "SELECT emp_id, COUNT(*) AS s, SUM(days) AS d, COUNT(*) * COUNT(*) * SUM(days) AS bradford FROM ik_leaves WHERE leave_type = 'hastalık' AND start_date >= '2024-01-01' AND start_date < '2025-01-01' GROUP BY emp_id ORDER BY bradford DESC, emp_id LIMIT 5;", O),
    sq('Pazartesi etkisi: hastalık izinlerinin başladığı haftanın gününe göre sayısı (SQLite: 1 = pazartesi … 5 = cuma): <code>gun</code>, <code>izin</code>. Güne göre.', "SELECT CAST(strftime('%w', start_date) AS INTEGER) AS gun, COUNT(*) AS izin FROM ik_leaves WHERE leave_type = 'hastalık' GROUP BY CAST(strftime('%w', start_date) AS INTEGER) ORDER BY gun;", { ord: true, dl: ['sqlite'] }),
    sq('Çalışan başına ortalama hastalık günü, bölüme göre (2024; 2024 sonunda aktif olanlar; 2 basamak; hiç hastalık izni olmayan 0 sayılır): <code>name</code>, <code>ort_gun</code>. Azalan.', `WITH h AS (SELECT emp_id, SUM(days) AS g FROM ik_leaves WHERE leave_type = 'hastalık' AND start_date >= '2024-01-01' GROUP BY emp_id) SELECT d.name, ROUND(AVG(COALESCE(h.g, 0)), 2) AS ort_gun FROM ik_employees e ${DEPT} LEFT JOIN h ON h.emp_id = e.emp_id WHERE e.term_date IS NULL GROUP BY d.dept_id, d.name ORDER BY ort_gun DESC, d.name;`, O),
    sq('Yıllık izinde 2024\'te hiç izin kullanmamış, 2024 boyunca çalışmış (2024 öncesi giren, 2024 sonunda aktif) çalışan sayısı: <code>kisi</code>.', "SELECT COUNT(*) AS kisi FROM ik_employees e WHERE e.hire_date < '2024-01-01' AND e.term_date IS NULL AND NOT EXISTS (SELECT 1 FROM ik_leaves l WHERE l.emp_id = e.emp_id AND l.leave_type = 'yıllık' AND l.start_date >= '2024-01-01');")
  ]
},
{
  id: 'ik-baglilik', lv: 'B2', mod: MOD, min: 18,
  title: 'Bağlılık anketi analitiği: eNPS, katılım ve yönetici etkisi',
  sum: 'eNPS hesabı, anket katılım oranı, dalgalar arası değişim, yöneticiye göre puanlar ve anket sonuçlarının sonraki ayrılmalarla ilişkisi.',
  body: `
<h2>eNPS</h2>
<p>“Bu şirketi bir arkadaşına çalışma yeri olarak ne kadar tavsiye edersin?” sorusuna 0–10 arası cevap. <b>Destekçi</b> 9–10, <b>pasif</b> 7–8, <b>eleştirmen</b> 0–6. <b>eNPS = %destekçi − %eleştirmen</b>; −100 ile +100 arasında bir sayıdır. Payda yalnızca bu soruyu cevaplayanlardır (NULL’lar hariç).</p>
<pre class="code">SELECT wave,
       ROUND(100.0 * (SUM(CASE WHEN enps &gt;= 9 THEN 1 ELSE 0 END)
                    - SUM(CASE WHEN enps &lt;= 6 THEN 1 ELSE 0 END)) / COUNT(enps), 1) AS enps
FROM ik_survey
GROUP BY wave;</pre>
<h2>Katılım oranı</h2>
<p>Bir dalganın katılım oranı = yanıt veren / anket tarihinde aktif olan. Katılımı düşük bir ekibin sonuçları temsil gücü zayıftır; ayrıca anonimliği korumak için küçük ekiplerin sonuçları raporlanmaz.</p>
<h2>Yönetici etkisi</h2>
<p>“İnsanlar şirketten değil yöneticiden ayrılır” sözünü veriyle sınayabilirsin: yöneticiye verilen ortalama puan ile o yöneticinin ekibindeki sonraki ayrılma oranını yan yana koy.</p>
`,
  ex: [
    sq('Her anket dalgası için eNPS (1 basamak) ve yanıt sayısı: <code>wave</code>, <code>yanit</code>, <code>enps</code>.', 'SELECT wave, COUNT(enps) AS yanit, ROUND(100.0 * (SUM(CASE WHEN enps >= 9 THEN 1 ELSE 0 END) - SUM(CASE WHEN enps <= 6 THEN 1 ELSE 0 END)) / COUNT(enps), 1) AS enps FROM ik_survey GROUP BY wave ORDER BY wave;', O),
    sq('2024-Q4 katılım oranı: anket tarihinde (15.11.2024) aktif olanlardan yanıt verenlerin oranı (yüzde, 1 basamak): <code>katilim</code>.', "SELECT ROUND(100.0 * (SELECT COUNT(*) FROM ik_survey WHERE wave = '2024-Q4') / COUNT(*), 1) AS katilim FROM ik_employees e WHERE e.hire_date <= '2024-11-15' AND (e.term_date IS NULL OR e.term_date > '2024-11-15');"),
    sq('Bölüm bazında 2024-Q4 ortalama bağlılık puanı (2 basamak) ve yanıt sayısı; en az 10 yanıtı olan bölümler, puana göre artan: <code>name</code>, <code>yanit</code>, <code>baglilik</code>.', `SELECT d.name, COUNT(s.engagement) AS yanit, ROUND(AVG(s.engagement), 2) AS baglilik FROM ik_survey s JOIN ik_employees e ON e.emp_id = s.emp_id ${DEPT} WHERE s.wave = '2024-Q4' GROUP BY d.dept_id, d.name HAVING COUNT(s.engagement) >= 10 ORDER BY baglilik, d.name;`, O),
    sq('Dalgalar arası değişim: her iki dalgaya da yanıt veren kişilerde ortalama bağlılık puanı Q2 ve Q4 (2 basamak): <code>q2</code>, <code>q4</code>, <code>kisi</code>.', "SELECT ROUND(AVG(a.engagement), 2) AS q2, ROUND(AVG(b.engagement), 2) AS q4, COUNT(*) AS kisi FROM ik_survey a JOIN ik_survey b ON b.emp_id = a.emp_id AND b.wave = '2024-Q4' WHERE a.wave = '2024-Q2' AND a.engagement IS NOT NULL AND b.engagement IS NOT NULL;"),
    sq('Yönetici etkisi: 2024-Q2\'de yöneticisine verdiği puan 3\'ün altında olanlarla 3 ve üzeri olanların 2024 içinde (anketten sonra) gönüllü ayrılma oranı (yüzde, 1 basamak): <code>grup</code>, <code>kisi</code>, <code>ayrilma</code>.', "SELECT CASE WHEN s.manager_score < 3 THEN 'düşük' ELSE 'normal' END AS grup, COUNT(*) AS kisi, ROUND(100.0 * SUM(CASE WHEN e.term_type = 'gönüllü' AND e.term_date > '2024-05-15' THEN 1 ELSE 0 END) / COUNT(*), 1) AS ayrilma FROM ik_survey s JOIN ik_employees e ON e.emp_id = s.emp_id WHERE s.wave = '2024-Q2' AND s.manager_score IS NOT NULL GROUP BY CASE WHEN s.manager_score < 3 THEN 'düşük' ELSE 'normal' END;")
  ]
},
{
  id: 'ik-proje', lv: 'C1', mod: MOD, min: 30,
  title: 'İK vakası: Veri ve Analitik ekibinde ne oldu?',
  sum: 'Açık uçlu bir İK sorusunu adım adım çözmek: belirtiyi doğrula, ekibi karşılaştır, olası nedenleri (yönetici, ücret, piyasa) veriyle sına ve öneri yaz.',
  body: `
<h2>Vaka</h2>
<div class="note"><b>İK direktörü</b>“2024’te Veri ve Analitik ekibinden çok kişi ayrıldı, teknoloji direktörü ‘piyasa çok hareketli, herkes gidiyor’ diyor. Gerçekten öyle mi? Bir sayfalık bir analiz istiyorum.”</div>
<p>Bu vakada tek bir doğru sorgu yok; bir analistin izlediği yol var:</p>
<ol><li><b>Belirtiyi doğrula:</b> Veri ekibinin 2024 devri gerçekten diğer teknoloji ekiplerinden yüksek mi? Kaç kişi?</li>
<li><b>Zamanla:</b> Ayrılmalar ne zaman başladı? Bir olayla (yönetici değişikliği, zam dönemi) çakışıyor mu?</li>
<li><b>Nedenler:</b> Ayrılma nedenleri, ücret bant konumu, yönetici puanları. “Piyasa” açıklaması doğruysa diğer teknoloji ekiplerinde de benzer devir ve “rakip firma” nedeni görmeliyiz.</li>
<li><b>Kimi kaybettik?</b> İstenmeyen kayıp (yüksek performanslı gönüllü ayrılma).</li>
<li><b>Öneri:</b> Bulguları üç cümlede özetle ve bir aksiyon öner.</li></ol>
<div class="tip"><b>İpucu</b>Her adımda karşılaştırma grubu kullan: Veri ekibini tek başına değil, Yazılım Geliştirme ve BT Altyapı ile yan yana göster.</div>
`,
  ex: [
    sq('Adım 1: teknoloji bölümlerinin (Yazılım Geliştirme, Veri ve Analitik, BT Altyapı) 2024 devir hızı ve ayrılan sayısı (yüzde, 1 basamak): <code>name</code>, <code>ayrilan</code>, <code>devir</code>. Devire göre azalan.', `WITH b AS (SELECT d.name, SUM(CASE WHEN ${ACT('2023-12-31')} THEN 1 ELSE 0 END) AS bas, SUM(CASE WHEN ${ACT('2024-12-31')} THEN 1 ELSE 0 END) AS son, SUM(CASE WHEN e.term_date >= '2024-01-01' AND e.term_date <= '2024-12-31' THEN 1 ELSE 0 END) AS ayrilan FROM ik_employees e ${DEPT} WHERE d.function_area = 'Teknoloji' GROUP BY d.dept_id, d.name) SELECT name, ayrilan, ROUND(100.0 * ayrilan / ((bas + son) / 2.0), 1) AS devir FROM b ORDER BY devir DESC;`, O),
    sq('Adım 2: Veri ve Analitik bölümünden (dept_id 8) ayrılanların çeyreklere göre sayısı (2023–2024): <code>ceyrek</code>, <code>ayrilan</code>. Sırala.', "SELECT strftime('%Y', e.term_date) || '-Q' || ((CAST(strftime('%m', e.term_date) AS INTEGER) + 2) / 3) AS ceyrek, COUNT(*) AS ayrilan FROM ik_employees e JOIN ik_positions p ON p.position_id = e.position_id WHERE p.dept_id = 8 AND e.term_date >= '2023-01-01' GROUP BY 1 ORDER BY ceyrek;", { ord: true, dl: ['sqlite'] }),
    sq('Adım 3: yönetici değişikliği. Veri ve Analitik bölümünde “Müdür” seviyesindeki (5) kişilerin adı, işe giriş ve ayrılış tarihi: <code>full_name</code>, <code>hire_date</code>, <code>term_date</code>. İşe girişe göre.', 'SELECT e.full_name, e.hire_date, e.term_date FROM ik_employees e JOIN ik_positions p ON p.position_id = e.position_id WHERE p.dept_id = 8 AND p.level = 5 ORDER BY e.hire_date;', O),
    sq('Adım 4: teknoloji bölümlerinde 2024 gönüllü ayrılma nedenleri; “rakip firma” ve “yönetici” nedenlerinin payı (yüzde, 1 basamak): <code>name</code>, <code>gonullu</code>, <code>rakip</code>, <code>yonetici</code>.', `SELECT d.name, COUNT(*) AS gonullu, ROUND(100.0 * SUM(CASE WHEN e.term_reason = 'rakip firma' THEN 1 ELSE 0 END) / COUNT(*), 1) AS rakip, ROUND(100.0 * SUM(CASE WHEN e.term_reason = 'yönetici' THEN 1 ELSE 0 END) / COUNT(*), 1) AS yonetici FROM ik_employees e ${DEPT} WHERE d.function_area = 'Teknoloji' AND e.term_type = 'gönüllü' AND e.term_date >= '2024-01-01' GROUP BY d.dept_id, d.name ORDER BY d.name;`, O),
    sq('Adım 5: yöneticiye verilen puan. 2024-Q2 anketinde teknoloji bölümlerinin ortalama yönetici puanı (2 basamak): <code>name</code>, <code>yonetici_puani</code>.', `SELECT d.name, ROUND(AVG(s.manager_score), 2) AS yonetici_puani FROM ik_survey s JOIN ik_employees e ON e.emp_id = s.emp_id ${DEPT} WHERE s.wave = '2024-Q2' AND d.function_area = 'Teknoloji' GROUP BY d.dept_id, d.name ORDER BY yonetici_puani;`, O),
    mc('<p>Bulgular: Veri ekibinin devri diğer teknoloji ekiplerinin birkaç katı; ayrılmalar yeni müdürün gelişinden sonra yoğunlaşıyor; yönetici puanı belirgin düşük; ayrılanların önemli kısmı “yönetici” nedenini veriyor. “Piyasa çok hareketli” açıklaması için en doğru değerlendirme?</p>', ['Tamamen doğru; ayrılma nedenlerinde rakip firma da öne çıktığı için piyasa açıklaması yeterlidir', 'Yetersiz: piyasa etkisi diğer teknoloji ekiplerinde de görülmeliydi; sorun ekibe özgü', 'Veri hiçbir şey söylemiyor', 'Sorun ücrettir; yönetici puanı anket katılımı düşük olduğu için önemsizdir ve göz ardı edilmelidir'], 1, 'Karşılaştırma grubu (aynı piyasadaki diğer teknoloji ekipleri) benzer bir artış göstermiyorsa açıklama ekibe özgü olmalıdır. Zamanlama ve yönetici puanı birlikte güçlü bir işarettir; yine de ücret konumu da kontrol edilmelidir.')
  ]
}
];
const at = L.findIndex(l => l.id === 'an-rfm');
L.splice(at < 0 ? L.length : at + 1, 0, ...lessons);

const P = window.SQLP_PATHS;
P.push({ id: 'ik-analitigi', name: 'İK Analitiği', short: 'İK', color: '#BE185D',
  desc: 'İnsan kaynakları verisiyle kadro, devir hızı, ücret eşitliği, performans, işe alım ve bağlılık analizleri.',
  long: 'İK analisti, İK iş ortağı ya da İK verisiyle çalışan veri analistleri için. Pusula A.Ş.\'nin altı yıllık İK verisiyle “o tarihte durum neydi?” mantığını, kadro ve devir hızı hesaplarını, ücret bantları ve ücret eşitliğini, performans kalibrasyonunu, işe alım hunisini, devamsızlığı ve anket analizini öğrenirsin. Patika, gerçekçi bir vaka ve Arena\'daki İK problemleriyle biter.',
  skills: ['O tarihte aktif mantığı', 'Kadro ve köprü', 'Devir hızı ve elde tutma', 'Compa-ratio ve ücret eşitliği', 'Performans kalibrasyonu', 'İşe alım hunisi', 'Bradford faktörü', 'eNPS'],
  lessons: ['ik-giris', 'ik-kadro', 'ik-devir', 'ik-ucret', 'ik-performans', 'ik-alim', 'ik-devamsizlik', 'ik-baglilik', 'ik-proje'],
  comp: [
    { t: 'Temel', d: 'Veri yapısı, kadro ve devir', l: ['ik-giris', 'ik-kadro', 'ik-devir'] },
    { t: 'Ücret ve performans', d: 'Bantlar, eşitlik, kalibrasyon', l: ['ik-ucret', 'ik-performans'] },
    { t: 'Süreçler', d: 'İşe alım, devamsızlık, bağlılık', l: ['ik-alim', 'ik-devamsizlik', 'ik-baglilik'] },
    { t: 'Vaka', d: 'Açık uçlu İK analizi', l: ['ik-proje'] }
  ],
  beyond: ['Arena: İK meydan okumaları ve “Giden Yetenekler” vakası', 'Alıştırma: İK verisi konusu', 'İstatistik: hayatta kalma analizi (Kaplan–Meier) ve regresyonla ücret farkı', 'KVKK ve İK verisinde anonimleştirme'] });
['analist'].forEach(pid => { const p = P.find(x => x.id === pid); if (p) ['ik-giris', 'ik-devir', 'ik-ucret'].forEach(id => { if (!p.lessons.includes(id)) p.lessons.push(id); }); });
})();
