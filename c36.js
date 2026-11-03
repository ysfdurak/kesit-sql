/* Kesit SQL: BT İş Analisti öğrenme yolu. Tek senaryo: Lezzet Kurye'de geç teslim edilen siparişlere otomatik telafi kuponu.
   Metindeki sayılar N nesnesinden gelir; araclar/denetim/ba_sayilar.js her birini veritabanından yeniden hesaplayıp karşılaştırır. */
(function () {
'use strict';
const LS = window.SQLP_LESSONS;
const MOD = 'BT İş Analizi';
const N = window.SQLP_BA_SAYI = {
  q4Teslim: 6637, q4Iptal: 356, q4Iade: 182, q4Gec: 1508, q4Gec60: 222, q4Gec45: 1286, q4Zaman: 5129, q4IptalKuryesiz: 195,
  disiSiparis: 3, tam45: 3, gecIade: 35, kesilen: 153, kesilenTL: 4590, maliyet: 51900, gecMusteri: 858,
  musteriAy: 32, fazlaKupon: 35, kuponSinirli: 1473,
  hazGec: '19,8', hazZaman: '14,1', yolGec: '33,2', yolZaman: '19,2', puanGec: '3,86', puanZaman: '4,41',
  bisiklet: '48,6', araba: '34,1', motosiklet: '21,0', firin: '50,0',
  donusGec: '84,9', donusZaman: '86,4', ekimOran: '23,1', kasimOran: '21,6', aralikOran: '23,3', kasimGec: 469, aralikGec: 592,
  kasimMaliyet: 15990, aralikMaliyet: 20640, ekimMaliyet: 15270, aralikZirve: 49, indirimliGec: 247,
  sepetEsik: 400, sepetAltMax: 395, ucretsiz: 3972, ucretli: 3206,
  ciro: 3391530, restoranTL: 9600, platformTL: 42300, restoranAdet: 274, hazirlikSinir: 3
};
const f = n => typeof n === 'number' ? n.toLocaleString('tr-TR') : n;
const SN = 'ROUND((julianday(delivered_at) - julianday(placed_at)) * 86400)';
/* Senaryonun ortak başlangıcı: dönem ve süre (saniye) tek yerde tanımlı */
const CTE = `WITH t AS (
  SELECT order_id, customer_id, restaurant_id, courier_id, status, placed_at,
         ${SN} AS sure_sn
  FROM lk_orders
  WHERE placed_at >= '2024-10-01' AND placed_at < '2025-01-01'
)
`;
const START = CTE + '-- t: dönemdeki siparişler ve teslim süresi (saniye). Buradan devam et.\n';
const inl = s => s.replace(/\s+/g, ' ').trim();
const box = s => '<pre class="code">' + s.replace(/</g, '&lt;') + '</pre>';
const nor = s => '<pre class="code" data-norun>' + s.replace(/</g, '&lt;') + '</pre>';
const mc = (q, o, a, why) => ({ t: 'mc', q: '<p>' + q + '</p>', o, a, why });
const sq = (q, sol, hint, x) => Object.assign({ t: 'sql', q: '<p>' + q + '</p>', sol: inl(sol), hint }, x || {});

/* ---------- Şema çizimleri: boyutlar telefon genişliğine göre seçildi, renkler temadan gelir ---------- */
const FONT = 'font-family:var(--f-body);font-size:11px';
const X = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const label = (cx, cy, lines, opt) => { const o = opt || {}; const L = [].concat(lines); const lh = o.lh || 13; const y0 = cy - (L.length - 1) * lh / 2 + 4; return '<text text-anchor="' + (o.a || 'middle') + '" fill="' + (o.c || 'var(--ink)') + '"' + (o.w ? ' font-weight="' + o.w + '"' : '') + (o.s ? ' font-size="' + o.s + '"' : '') + '>' + L.map((t, i) => '<tspan x="' + cx + '" y="' + (y0 + i * lh) + '">' + X(t) + '</tspan>').join('') + '</text>'; };
const task = (cx, cy, w, h, lines) => '<rect x="' + (cx - w / 2) + '" y="' + (cy - h / 2) + '" width="' + w + '" height="' + h + '" rx="7" fill="var(--surface)" stroke="var(--ink)" stroke-width="1.2"/>' + label(cx, cy, lines);
const gate = (cx, cy, r, lines) => '<path d="M' + cx + ' ' + (cy - r) + ' L' + (cx + r * 1.5) + ' ' + cy + ' L' + cx + ' ' + (cy + r) + ' L' + (cx - r * 1.5) + ' ' + cy + ' Z" fill="var(--warn-soft)" stroke="var(--warn)" stroke-width="1.4"/>' + label(cx, cy, lines);
const ev = (cx, cy, r, kind) => '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="var(--surface)" stroke="' + (kind === 'end' ? 'var(--err)' : 'var(--ok)') + '" stroke-width="' + (kind === 'end' ? 3 : 1.5) + '"/>';
const arrow = (pts, c) => { const a = pts[pts.length - 2], b = pts[pts.length - 1]; const ang = Math.atan2(b[1] - a[1], b[0] - a[0]); const hx = (d, t) => [b[0] - d * Math.cos(ang - t), b[1] - d * Math.sin(ang - t)]; const p1 = hx(8, .42), p2 = hx(8, -.42); const col = c || 'var(--muted)'; return '<polyline points="' + pts.map(p => p.join(',')).join(' ') + '" fill="none" stroke="' + col + '" stroke-width="1.3"/><polygon points="' + b.join(',') + ' ' + p1.join(',') + ' ' + p2.join(',') + '" fill="' + col + '"/>'; };
const svg = (w, h, title, inner, maxw) => '<div class="ba-sekil" style="margin:14px 0;text-align:center"><svg viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + X(title) + '" style="width:100%;max-width:' + (maxw || 520) + 'px;height:auto;' + FONT + '">' + inner + '</svg></div>';

const bpmn = (() => {
  const W = 360, H = 520, c = [60, 180, 300]; let s = '';
  ['Müşteri', 'Platform', 'Operasyon'].forEach((t, i) => { s += '<rect x="' + (i * 120) + '.5" y=".5" width="119" height="' + (H - 1) + '" fill="' + (i === 1 ? 'var(--surface-2)' : 'var(--surface)') + '" stroke="var(--line)"/>' + label(c[i], 15, t, { w: 700 }); });
  const cx = c[1];
  s += ev(cx, 46, 9, 'start') + label(cx + 14, 46, ['Teslim', 'kaydı'], { a: 'start', c: 'var(--muted)', lh: 12 });
  s += arrow([[cx, 55], [cx, 74]]);
  s += task(cx, 94, 100, 38, ['Teslim süresini', 'hesapla']);
  s += arrow([[cx, 113], [cx, 134]]);
  s += gate(cx, 160, 26, ['Geç', 'mi?']);
  s += arrow([[cx + 39, 160], [c[2], 160], [c[2], 188]]) + label(cx + 50, 153, 'Hayır', { c: 'var(--muted)' });
  s += ev(c[2], 198, 9, 'end') + label(c[2], 222, ['Kupon yok'], { c: 'var(--muted)' });
  s += arrow([[cx, 186], [cx, 208]]) + label(cx + 8, 198, 'Evet', { a: 'start', c: 'var(--muted)' });
  s += gate(cx, 234, 26, ['Sınır', 'dolu mu?']);
  s += arrow([[cx + 39, 234], [c[2], 234], [c[2], 262]]) + label(cx + 50, 227, 'Evet', { c: 'var(--muted)' });
  s += task(c[2], 282, 100, 38, ['Kuponsuz', 'kaydı logla']);
  s += arrow([[c[2], 301], [c[2], 322]]) + ev(c[2], 332, 9, 'end');
  s += arrow([[cx, 260], [cx, 284]]) + label(cx + 8, 272, 'Hayır', { a: 'start', c: 'var(--muted)' });
  s += task(cx, 304, 100, 38, ['Kupon', 'oluştur']);
  s += arrow([[cx, 323], [cx, 346]]);
  s += gate(cx, 372, 26, ['Kayıt', 'tamam mı?']);
  s += arrow([[cx + 39, 372], [c[2], 372], [c[2], 396]]) + label(cx + 50, 365, 'Hata', { c: 'var(--muted)' });
  s += task(c[2], 416, 100, 38, ['Hata kuyruğunu', 'incele']);
  s += arrow([[c[2], 435], [c[2], 456]]) + ev(c[2], 466, 9, 'end');
  s += arrow([[cx, 398], [cx, 424]]) + label(cx + 8, 411, 'Tamam', { a: 'start', c: 'var(--muted)' });
  s += task(cx, 444, 100, 38, ['Bildirim', 'gönder']);
  s += arrow([[cx - 50, 444], [c[0], 444], [c[0], 424]]);
  s += task(c[0], 402, 92, 38, ['Kuponu', 'görür']);
  s += arrow([[c[0], 383], [c[0], 352]]);
  s += ev(c[0], 342, 9, 'end');
  return svg(W, H, 'TO-BE süreç şeması: teslim kaydı geldiğinde süre hesaplanır, geç ve sınır dolmamışsa kupon oluşturulur, bildirim gönderilir; hatada operasyon kuyruğu incelenir.', s, 460);
})();

const sekans = (() => {
  const W = 360, H = 366, c = [45, 135, 225, 315], ad = ['Sipariş', 'Kupon', 'Veritabanı', 'Bildirim']; let s = '';
  ad.forEach((t, i) => { s += '<rect x="' + (c[i] - 40) + '" y="4" width="80" height="26" rx="6" fill="var(--surface-2)" stroke="var(--ink)"/>' + label(c[i], 17, t, { w: 700 }) + '<line x1="' + c[i] + '" y1="30" x2="' + c[i] + '" y2="' + (H - 6) + '" stroke="var(--line)" stroke-dasharray="4 4"/>'; });
  const msg = (a, b, y, t, ret) => { const d = a < b ? -1 : 1; const line = '<polyline points="' + c[a] + ',' + y + ' ' + (c[b] + d * 6) + ',' + y + '" fill="none" stroke="var(--muted)" stroke-width="1.3"' + (ret ? ' stroke-dasharray="4 3"' : '') + '/><polygon points="' + c[b] + ',' + y + ' ' + (c[b] + d * 8) + ',' + (y - 4) + ' ' + (c[b] + d * 8) + ',' + (y + 4) + '" fill="var(--muted)"/>'; const mx = (c[a] + c[b]) / 2; return label(mx, y - 11, t, { s: 10.5 }) + line; };
  s += msg(0, 1, 62, 'POST /kuponlar') + msg(1, 2, 92, 'Kupon var mı?') + msg(2, 1, 122, 'Yok', true) + msg(1, 2, 152, 'INSERT') + msg(1, 3, 182, 'Kupon bildirimi') + msg(1, 0, 212, '201 Created', true);
  s += '<rect x="6" y="232" width="348" height="124" rx="6" fill="none" stroke="var(--warn)" stroke-dasharray="5 3"/>' + label(14, 244, 'Aynı istek ikinci kez gelirse', { a: 'start', c: 'var(--muted)', s: 10.5 });
  s += msg(0, 1, 274, 'POST /kuponlar') + msg(1, 2, 304, 'Kupon var mı?') + msg(2, 1, 322, 'Var', true) + msg(1, 0, 344, '200 OK', true);
  return svg(W, H, 'Sıra diyagramı: Sipariş servisi kupon ister, kupon servisi veritabanına sorar, yoksa ekler, bildirim gönderir ve 201 döner. Aynı istek tekrar gelirse yeni kupon üretmeden 200 döner.', s, 460);
})();

const erSema = (() => {
  const W = 360, H = 262; let s = '';
  const tablo = (x, y, w, ad, sat, yeni) => { const h = 22 + sat.length * 15 + 4; let r = '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="6" fill="var(--surface)" stroke="' + (yeni ? 'var(--accent)' : 'var(--ink)') + '" stroke-width="1.3"' + (yeni ? ' stroke-dasharray="5 3"' : '') + '/><line x1="' + x + '" y1="' + (y + 21) + '" x2="' + (x + w) + '" y2="' + (y + 21) + '" stroke="' + (yeni ? 'var(--accent)' : 'var(--ink)') + '"/>' + label(x + w / 2, y + 11, ad, { w: 700 }); sat.forEach((t, i) => { r += label(x + 8, y + 32 + i * 15, t, { a: 'start', s: 10.5 }); }); return r; };
  s += tablo(6, 8, 138, 'lk_customers', ['customer_id PK', 'full_name', 'is_premium']);
  s += tablo(216, 8, 138, 'lk_orders', ['order_id PK', 'customer_id FK', 'placed_at', 'delivered_at', 'status']);
  s += tablo(216, 142, 138, 'ba_kupon (öneri)', ['kupon_id PK', 'order_id FK, UNIQUE', 'customer_id FK', 'tutar', 'olusturma', 'kullanim (boş olabilir)'], true);
  /* 1 — N: müşteri → sipariş */
  s += '<polyline points="144,50 216,50" fill="none" stroke="var(--muted)" stroke-width="1.4"/><path d="M152 44 V56 M157 44 V56 M206 50 L216 44 M206 50 L216 56 M203 44 V56" stroke="var(--muted)" stroke-width="1.4" fill="none"/>';
  /* 1 — 0..1: sipariş → kupon */
  s += '<polyline points="285,108 285,142" fill="none" stroke="var(--muted)" stroke-width="1.4"/><path d="M279 116 H291 M279 121 H291 M279 132 H291" stroke="var(--muted)" stroke-width="1.4" fill="none"/><circle cx="285" cy="126" r="3.4" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.4"/>';
  s += label(296, 124, ['1 : 0..1'], { a: 'start', c: 'var(--muted)', s: 10 }) + label(180, 40, '1 : N', { c: 'var(--muted)', s: 10 });
  s += label(6, 170, ['Düz çizgi: bugün var.', 'Kesikli kutu: önerilen', 'tablo. Tasarımın son', 'hâli geliştirme ekibinin', 'kararıdır.'], { a: 'start', c: 'var(--muted)', lh: 14 });
  return svg(W, H, 'ER şeması: bir müşterinin çok siparişi olur; bir siparişin en fazla bir kuponu olur. ba_kupon önerilen yeni tablodur.', s, 460);
})();
const add = o => { o.mod = o.mod || MOD; LS.push(o); };

/* ---------- 1. Rol ---------- */
add({ id: 'ba-rol', lv: 'A1', min: 14,
  title: 'BT iş analisti (IT business analyst) ne yapar?',
  sum: 'Talepten teslime iş analistinin işi; veri analisti, ürün sahibi, proje yöneticisi ve sistem analistinden farkı; RACI.',
  en: 'business analyst it ba role raci product owner project manager system analyst iiba babok ecba ccba cbap iş analisti',
  body: `<p>Müşteri hizmetleri ekibi şöyle yazıyor: <i>“Geç teslim edilen siparişlerde müşteriye otomatik telafi kuponu verelim.”</i> Bir yazılımcı bu cümleyle işe başlayamaz. Geç ne demek? Kupon kaç lira? İptal edilen sipariş ne olacak? Bir müşteri ayda kaç kupon alabilir? Bu soruları sorup cevabı herkesin aynı anladığı, test edilebilir bir yazıya çeviren kişi <b>BT iş analistidir</b> (IT business analyst, kısaca BA).</p>
<p>Bu yolda tek bir talebi, bu kupon talebini, baştan sona götüreceksin. Senaryo Lezzet Kurye adlı hayali yemek teslimat platformunun Ekim-Aralık 2024 verisi üzerinde geçer. Çıkan sayılar eğitim verisinden gelir, gerçek bir pazarı anlatmaz.</p>
<h2>Talep, çözüm, teslim</h2>
<table><tr><th>Aşama</th><th>İş analisti ne yapar?</th><th>Ortaya ne çıkar?</th></tr>
<tr><td><b>Talep</b></td><td>Asıl sorunu bulur, paydaşlarla görüşür, sorunu veriyle boyutlandırır, kapsamı çizer.</td><td>Talep özeti, kapsam</td></tr>
<tr><td><b>Çözüm</b></td><td>Gereksinimleri ve iş kurallarını yazar, süreci çizer, veri ve API tarafını geliştirme ekibiyle netleştirir.</td><td>BRD (business requirements document, iş gereksinimleri dokümanı), kullanıcı hikâyeleri (user story), kabul kriterleri (acceptance criteria)</td></tr>
<tr><td><b>Teslim</b></td><td>Test senaryolarını hazırlar, kullanıcı kabul testini (UAT, user acceptance testing) yürütür, canlıya geçişi izler, sonucu ölçer.</td><td>UAT onayı, canlı sonrası rapor</td></tr></table>
<h2>Benzer unvanlardan farkı</h2>
<p>Bu unvanların sınırı şirketten şirkete değişir. Küçük bir ekipte aynı kişi ikisini birden yapabilir. Bir iş ilanını okurken unvana değil görev listesine bak. Aşağıdaki tablo yaygın ayrımı gösterir.</p>
<table><tr><th>Rol</th><th>Asıl sorusu</th><th>Kupon talebinde</th></tr>
<tr><td><b>BT iş analisti</b></td><td>Ne yapılmalı ve doğru yapıldığını nasıl anlarız?</td><td>Kuralları, kabul kriterlerini ve testleri yazar</td></tr>
<tr><td><b>Veri analisti</b></td><td>Veri ne söylüyor?</td><td>Geç teslimin nedenini ve kuponun etkisini derinlemesine analiz eder</td></tr>
<tr><td><b>Ürün sahibi</b> (product owner)</td><td>Önce hangisi yapılmalı?</td><td>Öncelik verir, iş listesini (backlog) yönetir, kabul kararını verir</td></tr>
<tr><td><b>Proje yöneticisi</b> (project manager)</td><td>Ne zaman, kaç kişiyle, hangi riskle?</td><td>Plan, bütçe ve bağımlılıkları yönetir</td></tr>
<tr><td><b>Sistem analisti</b></td><td>Sistem bunu teknik olarak nasıl yapacak?</td><td>Servis, tablo ve entegrasyon tasarımını ayrıntılandırır</td></tr></table>
<h2>Kim, neyin neresinde: RACI</h2>
<p><b>RACI</b> bir işte kimin ne rolü olduğunu gösteren tablodur: <b>R</b> (Responsible) işi yapan, <b>A</b> (Accountable) sonucun hesabını veren, <b>C</b> (Consulted) görüşü alınan, <b>I</b> (Informed) bilgilendirilen. Her satırda tek bir A olmalı.</p>
<table><tr><th>İş</th><th>BA</th><th>Geliştirici</th><th>Test uzmanı</th><th>İş birimi</th></tr>
<tr><td>Gereksinimi yazmak</td><td>R, A</td><td>C</td><td>C</td><td>C</td></tr>
<tr><td>Teknik tasarım ve kod</td><td>C</td><td>R, A</td><td>I</td><td>I</td></tr>
<tr><td>Sistem testi</td><td>C</td><td>C</td><td>R, A</td><td>I</td></tr>
<tr><td>UAT'yi yürütmek</td><td>R, A</td><td>C</td><td>C</td><td>C</td></tr>
<tr><td>UAT onayı</td><td>C</td><td>I</td><td>I</td><td>R, A</td></tr></table>
<p>Bu bir örnektir; her kurumda aynı değildir. Yine de şu ayrım değişmez: iş analisti gereksinimin hesabını verir, işin kabul edilip edilmeyeceğine iş birimi karar verir.</p>
<h2>Bu yol neden SQL ile başlıyor?</h2>
<p>İş analisti çoğu ekipte sorgu yazmak zorunda değildir, ama yazabilen analist sorunu kendi boyutlandırır, kenar durumları veriden bulur ve testin sonucunu kendisi doğrular. Hiç SQL bilmiyorsan sorun değil: yol önce SQL'i öğretir, sonra aynı talebi yedi derste sürdürür.</p>
<div class="note"><b>Bu yol neyi yapmaz?</b>Görüşme yönetmek, toplantıda ikna etmek ve kurum süreçlerini öğrenmek uygulamayla gelir; bir ders bunların yerini tutmaz. Yol iş garantisi vermez. Bitirince alacağın belge bu uygulamanın tamamlama belgesidir, sertifika değildir.</div>
<div class="note"><b>BABOK ve sertifikalar</b>BABOK Guide, International Institute of Business Analysis (IIBA) tarafından yayımlanan iş analizi bilgi kılavuzudur. IIBA'nın üç temel sertifikası vardır. ECBA için deneyim şartı aranmaz. CCBA son 7 yılda 3.750 saat iş analizi deneyimi ve 21 saat mesleki gelişim, CBAP son 10 yılda 7.500 saat deneyim ve 35 saat mesleki gelişim ister. Bu bilgiyi Kasım 2026'da IIBA'nın sitesinden kontrol ettik; başvurmadan önce güncelini oradan oku. Bu uygulama bu sınavlara hazırlık değildir.</div>`,
  ex: [
    { t: 'sql', q: '<p>İlk bakış. Kutudaki sorgu 1 numaralı siparişi getiriyor. Hiçbir şeyi değiştirmeden <b>Kontrol et</b>\'e bas, sonra sütunlara bak: sipariş ne zaman verilmiş, ne zaman teslim edilmiş?</p>', sol: 'SELECT order_id, status, placed_at, delivered_at FROM lk_orders WHERE order_id = 1;', start: 'SELECT order_id, status, placed_at, delivered_at\nFROM lk_orders\nWHERE order_id = 1;', hint: 'Bu adımda yazman gereken bir şey yok; Kontrol et düğmesine basman yeterli.', norv: true },
    { t: 'sql', q: '<p>Şimdi tek bir sayıyı değiştir: <b>7177</b> numaralı siparişi getir. <code>delivered_at</code> sütununa dikkat et.</p>', sol: 'SELECT order_id, status, placed_at, delivered_at FROM lk_orders WHERE order_id = 7177;', start: 'SELECT order_id, status, placed_at, delivered_at\nFROM lk_orders\nWHERE order_id = 1;', hint: 'Son satırdaki 1 yerine yeni sipariş numarasını yaz.' },
    mc('7177 numaralı siparişte <code>delivered_at</code> boş. Kupon talebi açısından bu ne anlama gelir?', ['Sipariş iptal edilmiş; bu kayıtta teslim süresi hesaplanamaz', 'Veritabanı bozulmuş; kayıt silinip yeniden girilmeli', 'Teslimat tamamlanmış ama saati bilinmiyor; süre sıfır sayılır', 'Kurye atanmamış; sipariş hâlâ yolda ve gecikmiş sayılır'], 0, 'Durum sütunu iptal diyor. Boş değer burada hata değil, olmamış bir olayı anlatır. İş analisti bunu görünce gereksinime “iptal edilen sipariş ne olacak?” sorusunu ekler.'),
    mc('Müşteri hizmetleri “kupon verelim” diyor. İş analistinin ilk işi hangisi?', ['Kupon tablosunu tasarlayıp geliştiriciye iletmek', 'Kuponun maliyetini finansa onaylatıp tarih vermek', 'Asıl sorunu ve başarı ölçüsünü netleştirmek', 'Test senaryolarını yazıp UAT ortamını hazırlamak'], 2, 'Talep çoğu zaman hazır bir çözüm olarak gelir. Önce çözülmek istenen sorun anlaşılır; tablo, tarih ve test sonra gelir.'),
    mc('“Bu ay kupon mu önce yapılsın, kurye uygulaması mı?” sorusuna kim karar verir?', ['Çoğu kurumda ürün sahibi, analist bilgi verir', 'Sistem analisti; teknik olarak kolay olanı seçer', 'Test uzmanı; önce test edilebilir olanı seçer', 'Veri analisti; en çok satırı etkileyeni seçer'], 0, 'Öncelik kararı ürün sahibinin işidir. İş analisti etki ve maliyet bilgisini getirir, kararı tek başına vermez.'),
    mc('RACI tablosunda bir satırda iki kişi <b>A</b> işaretlenmiş. Sorun nedir?', ['A yalnız yöneticilere verilebilir, unvan yanlıştır', 'Sonucun hesabını kimin vereceği belirsiz kalır', 'R sayısı az kalır, işi yapan kişi bulunamaz', 'C ve I kişileri kimden bilgi alacağını bilemez'], 1, 'A sonucun hesabını veren kişidir ve satır başına bir tane olur. İki A, sorun çıktığında herkesin diğerine bakması demektir.'),
    mc('Kupon sonrası müşterilerin yeniden sipariş davranışının derin analizi en çok kimin işidir?', ['Proje yöneticisinin; plana yeni bir madde ekler', 'Test uzmanının; UAT sonuçlarına bakarak yorumlar', 'Sistem analistinin; servis kayıtlarından çıkarır', 'Veri analistinin; soruyu iş analisti getirir'], 3, 'İş analisti de basit sorgularla sayıya bakar, ama nedensellik ve derin analiz veri analistinin uzmanlığıdır. Sorunun tanımı ikisinin ortak işidir.')
  ] });

/* ---------- 2. Talep ---------- */
add({ id: 'ba-talep', lv: 'B1', min: 24,
  title: 'Talebi anlamak: asıl sorun, görüşme soruları ve sorunu SQL ile boyutlandırmak',
  sum: 'İstenen çözümün arkasındaki sorun, paydaş görüşmesi, geç teslimin sayısı ve maliyeti, kapsam içi ve dışı.',
  en: 'requirements elicitation stakeholder interview problem statement scope in out sizing talep kapsam paydaş',
  body: `<p>Talep elimizde: <i>“Geç teslim edilen siparişlerde müşteriye otomatik telafi kuponu verelim.”</i> Bu cümle bir sorun değil, bir <b>çözüm önerisidir</b>. Kupon geç teslimi azaltmaz; olsa olsa sonucunu yumuşatır. İş analisti önce şunu sorar: hangi sorunu çözmeye çalışıyoruz?</p>
<h2>Görüşmede ne sorulur?</h2>
<p>Paydaş (stakeholder), işten etkilenen ya da işe karar veren kişidir. Burada müşteri hizmetleri, operasyon, finans ve pazarlama. Soruları açık uçlu sor, cevabı kendi önerinle kapatma.</p>
<table><tr><th>Amaç</th><th>Soru</th><th>Neden?</th></tr>
<tr><td>Sorun</td><td>Bunu şimdi istemenize ne yol açtı? Son olarak hangi şikâyet geldi?</td><td>Gerçek olayı anlatır, varsayımı ayıklar</td></tr>
<tr><td>Ölçü</td><td>Bu iş başarılı olursa hangi sayı nasıl değişir?</td><td>Sonradan “işe yaradı mı?” sorusunu cevaplanabilir kılar</td></tr>
<tr><td>Tanım</td><td>Sizin için “geç” kaç dakika? Saat ne zaman başlar?</td><td>Ekipler aynı kelimeyle farklı şeyi kastedebilir</td></tr>
<tr><td>Sınır</td><td>Kim kupon almamalı? Toplam bütçe nedir?</td><td>İstisnaları ve kötüye kullanımı ortaya çıkarır</td></tr>
<tr><td>Bugün</td><td>Şu anda bu durumda ne yapıyorsunuz?</td><td>Mevcut süreci ve elle yapılan işi gösterir</td></tr>
<tr><td>Bedel</td><td>Hiç yapılmazsa ne olur?</td><td>Önceliği dürüst tartışmayı sağlar</td></tr></table>
<div class="warn"><b>Yönlendirici soru sorma</b>“45 dakika geç sayılır, değil mi?” sorusu cevabı sana verdirir. “Müşteri kaç dakikadan sonra geç kaldı der?” sorusu bilgi getirir.</div>
<h2>Sorunu veriyle boyutlandır</h2>
<p>Müşteri hizmetleri “çok şikâyet var” diyor. “Çok” bir sayı değil. Geçici bir çalışma tanımı alalım: <b>sipariş verildikten teslime kadar 45 dakikayı (2.700 saniye) aşan teslimat geçtir.</b> Bu tanım henüz karar değil, görüşmede sınanacak bir varsayım. Dönemi Ekim-Aralık 2024 olarak sabitleyelim. Süreyi saniyeyle hesaplıyoruz; nedenini bir sonraki derste göreceksin.</p>
${box(CTE + `SELECT status, COUNT(*) AS siparis,
       SUM(CASE WHEN sure_sn > 2700 THEN 1 ELSE 0 END) AS gec
FROM t
GROUP BY status
ORDER BY status;`)}
<p>Teslim edilen ${f(N.q4Teslim)} siparişin ${f(N.q4Gec)} tanesi (%${(100 * N.q4Gec / N.q4Teslim).toFixed(1).replace('.', ',')}) bu tanıma göre geç. Sayının yanında şunlar da çıktı: ${f(N.q4Iptal)} iptal siparişin teslim zamanı yok, ${f(N.gecIade)} iade edilmiş sipariş de 45 dakikayı aşmış. Bunlar birazdan gereksinim sorusu olacak.</p>
<h3>Sorun nerede oluşuyor?</h3>
<p>Kupon kararı vermeden önce gecikmenin kaynağına bak. Süreyi ikiye böl: hazırlık (sipariş → kuryenin alışı) ve yol (alış → teslim).</p>
${box(`SELECT CASE WHEN ${SN} > 2700 THEN 'geç' ELSE 'zamanında' END AS durum,
       COUNT(*) AS siparis,
       ROUND(AVG((julianday(picked_at) - julianday(placed_at)) * 86400) / 60.0, 1) AS hazirlik_dk,
       ROUND(AVG((julianday(delivered_at) - julianday(picked_at)) * 86400) / 60.0, 1) AS yol_dk
FROM lk_orders
WHERE status = 'teslim' AND placed_at >= '2024-10-01' AND placed_at < '2025-01-01'
GROUP BY CASE WHEN ${SN} > 2700 THEN 'geç' ELSE 'zamanında' END;`)}
<p>Geç siparişlerde hazırlık ${N.hazGec}, yol ${N.yolGec} dakika; zamanında olanlarda ${N.hazZaman} ve ${N.yolZaman}. Fark en çok yolda. Araç türüne bakınca geç oranı bisiklette %${N.bisiklet}, arabada %${N.araba}, motosiklette %${N.motosiklet}. Fırın Pizza'da oran %${N.firin}. Bunu alıştırmalarda kendin hesaplayacaksın.</p>
<div class="note"><b>Sayının söylemediği</b>Veride mesafe yok. Bisikletin gecikmesi araçtan değil, bisikletlerin daha uzak ya da daha yoğun bölgede çalışmasından da gelebilir. Bu yüzden toplantıya “bisiklet yavaş” diye değil, “bisikletli teslimatlarda geç oranı iki kattan fazla, nedeni için mesafe verisine ihtiyacımız var” diye gidersin.</div>
<h3>Kupon gerçekten ne sağlar?</h3>
<p>Talebin varsayımı şu: geç teslim alan müşteri kaçıyor. Veride bunun izine bak. Ekim-Kasım teslimatlarından sonraki 30 gün içinde yeniden sipariş veren müşteri payı, geç teslimlerde %${N.donusGec}, zamanında olanlarda %${N.donusZaman}.</p>
${box(`WITH s AS (
  SELECT order_id, customer_id, placed_at,
         CASE WHEN ${SN} > 2700 THEN 'geç' ELSE 'zamanında' END AS durum
  FROM lk_orders
  WHERE status = 'teslim' AND placed_at >= '2024-10-01' AND placed_at < '2024-12-01'
)
SELECT durum, COUNT(*) AS teslimat,
       ROUND(100.0 * SUM(CASE WHEN EXISTS (
         SELECT 1 FROM lk_orders n
         WHERE n.customer_id = s.customer_id AND n.placed_at > s.placed_at
           AND (julianday(n.placed_at) - julianday(s.placed_at)) * 86400 <= 2592000
       ) THEN 1 ELSE 0 END) / COUNT(*), 1) AS donus_yuzde
FROM s
GROUP BY durum;`)}
<p>Fark küçük. Müşteri puanı ise belirgin düşüyor: geç teslimlerde kurye puanı ortalaması ${N.puanGec}, diğerlerinde ${N.puanZaman}. Dürüst özet: <i>geç teslim memnuniyeti düşürüyor; yeniden siparişe etkisi bu veride küçük görünüyor.</i> Bu gözlemdir, neden-sonuç kanıtı değildir ve kuponun getirisini garanti etmez. Bunu talep sahibine söylemek senin işindir. Kupon yine yapılabilir, ama başarı ölçüsü buna göre yazılır.</p>
<h3>Bedeli ne kadar?</h3>
<p>Görüşmeden çıkan tutar önerisi: 45-60 dakika arası 30 TL, 60 dakikayı aşan 60 TL. Bu kuralla dönemin kupon bedeli üst sınırda ${f(N.maliyet)} TL. Karşılaştırma için aynı dönemde teslim edilen siparişlerin sepet toplamı ${f(N.ciro)} TL. Üst sınır diyoruz, çünkü her kupon kullanılmayabilir ve bir aylık sınır gelebilir.</p>
<h2>Kapsamı çiz</h2>
<table><tr><th>Kapsam içi</th><th>Kapsam dışı (bu sürümde)</th></tr>
<tr><td>Teslim edilmiş siparişte süre hesabı ve kupon üretimi</td><td>Geç teslimi azaltacak kurye ve restoran iyileştirmeleri</td></tr>
<tr><td>Kuponun müşteriye bildirilmesi</td><td>Kuponu ödeme ekranında kullanma ekranının yeniden tasarımı</td></tr>
<tr><td>Operasyon için kupon raporu</td><td>Restoranı kupon bedeline ortak etme (ayrı talep)</td></tr></table>
<p>Kapsam dışı listesi en az kapsam içi kadar değerlidir. “Bunu kastetmemiştik” tartışmasını baştan keser. Çıktın tek sayfalık <b>talep özetidir</b>: sorun, kanıt sayıları, başarı ölçüsü, kapsam, açık sorular.</p>`,
  ex: [
    sq('Başlangıç kodundaki <code>t</code>, dönemin siparişlerini ve teslim süresini (<code>sure_sn</code>, saniye) verir. Teslim edilen sipariş sayısını ve bunların 45 dakikayı (2.700 saniye) <b>aşanlarını</b> bul: <code>teslim</code>, <code>gec</code>.', CTE + "SELECT COUNT(*) AS teslim, SUM(CASE WHEN sure_sn > 2700 THEN 1 ELSE 0 END) AS gec FROM t WHERE status = 'teslim';", 'Yalnız teslim durumundaki satırlara bak. Geç olanları saymak için toplama fonksiyonunun içine koşullu bir ifade yaz.', { start: START }),
    sq('Aynı ölçüyü aya göre aç: <code>ay</code> (YYYY-AA), <code>teslim</code>, <code>gec</code>, <code>oran</code> (yüzde, 1 basamak). Aya göre sırala.', CTE + "SELECT strftime('%Y-%m', placed_at) AS ay, COUNT(*) AS teslim, SUM(CASE WHEN sure_sn > 2700 THEN 1 ELSE 0 END) AS gec, ROUND(100.0 * SUM(CASE WHEN sure_sn > 2700 THEN 1 ELSE 0 END) / COUNT(*), 1) AS oran FROM t WHERE status = 'teslim' GROUP BY strftime('%Y-%m', placed_at) ORDER BY ay;", 'Ay için bir tarih fonksiyonu kullan ve aynı ifadeye göre grupla. Oranda tam sayı bölmesine düşmemek için ondalıklı bir sayıyla çarp.', { start: START, ord: true }),
    sq('Sorun araçla ilgili olabilir mi? Kuryenin aracına göre (<code>lk_couriers.vehicle</code>) teslim, geç ve geç oranını (yüzde, 1 basamak) getir; orana göre azalan sırala: <code>vehicle</code>, <code>teslim</code>, <code>gec</code>, <code>oran</code>.', CTE + "SELECT c.vehicle, COUNT(*) AS teslim, SUM(CASE WHEN t.sure_sn > 2700 THEN 1 ELSE 0 END) AS gec, ROUND(100.0 * SUM(CASE WHEN t.sure_sn > 2700 THEN 1 ELSE 0 END) / COUNT(*), 1) AS oran FROM t JOIN lk_couriers c ON c.courier_id = t.courier_id WHERE t.status = 'teslim' GROUP BY c.vehicle ORDER BY oran DESC;", '<code>t</code> ile kurye tablosunu kurye numarası üzerinden bağla. Bir önceki alıştırmanın oran ifadesi burada da işe yarar.', { start: START, ord: true }),
    sq('Geç oranı en yüksek 5 restoran. Küçük örnekler yanıltmasın: en az 50 teslimi olanlar. <code>name</code>, <code>teslim</code>, <code>gec</code>, <code>oran</code> (yüzde, 1 basamak). Orana göre azalan, eşitlikte ada göre sırala.', CTE + "SELECT r.name, COUNT(*) AS teslim, SUM(CASE WHEN t.sure_sn > 2700 THEN 1 ELSE 0 END) AS gec, ROUND(100.0 * SUM(CASE WHEN t.sure_sn > 2700 THEN 1 ELSE 0 END) / COUNT(*), 1) AS oran FROM t JOIN lk_restaurants r ON r.restaurant_id = t.restaurant_id WHERE t.status = 'teslim' GROUP BY r.name HAVING COUNT(*) >= 50 ORDER BY oran DESC, r.name LIMIT 5;", 'En az 50 teslim koşulu grup üstünde çalışır, bu yüzden WHERE içine giremez. Sıralamadan sonra ilk beş satırı al.', { start: START, ord: true }),
    sq('Talebin bedeli. Tutar önerisi: 45 dakikayı aşıp 60 dakikayı (3.600 saniye) aşmayan teslimata 30 TL, 60 dakikayı aşana 60 TL. Toplam kupon sayısı ve toplam tutar: <code>kupon</code>, <code>maliyet</code>.', CTE + "SELECT COUNT(*) AS kupon, SUM(CASE WHEN sure_sn > 3600 THEN 60 ELSE 30 END) AS maliyet FROM t WHERE status = 'teslim' AND sure_sn > 2700;", 'Önce yalnız kupon alacak satırları süz. Kalan satırlarda tutarı koşullu bir ifadeyle seç ve topla.', { start: START }),
    mc('Hangisi “çözüm önerisi” değil, “sorun” cümlesidir?', ['Geç teslimde müşteriye otomatik kupon gönderilmeli', 'Kurye uygulamasına kupon ekranı eklenmeli', 'Geç teslimlerde kurye puanı belirgin düşüyor', 'Destek ekibine kupon tanımlama yetkisi verilmeli'], 2, 'Üç seçenek ne yapılacağını söylüyor. Doğru seçenek ise ne olduğunu söylüyor; farklı çözümleri tartışmaya açık bırakıyor.'),
    mc('İlk görüşmede hangi soru en çok bilgi getirir?', ['Bir müşteri kaç dakikadan sonra geç kaldı der?', '45 dakika geç sayılır, bunu kabul ediyor muyuz?', 'Kuponu 30 TL yapsak bütçeye uyar, değil mi?', 'Bu işi kasım sonuna kadar bitirebiliriz, tamam mı?'], 0, 'Diğerleri cevabı içinde taşıyan yönlendirici sorular. Açık uçlu soru, paydaşın gerçekten ne düşündüğünü ortaya çıkarır.'),
    mc('Araç kırılımında bisiklet teslimatlarının geç oranı yüksek çıktı. En doğru cümle hangisi?', ['Bisikletler yavaş, kaldırılmaları gerektiği kanıtlandı', 'Bisikletli işlerde oran yüksek; nedeni için mesafe gerekli', 'Oran hataya bağlıdır, araç türü sorgudan çıkarılmalı', 'Kupon yalnız bisikletli teslimatlara verilmeli diye okunur'], 1, 'Sorgu farkı gösterir, nedeni göstermez. Veride mesafe olmadığı için neden hakkında yargıya varamazsın; eksik veriyi söylemek de analizin parçasıdır.'),
    mc('Hangisi bu sürüm için <b>kapsam dışı</b> yazılmalıdır?', ['Teslim edilen siparişte süreyi hesaplamak', 'Kuponu üretip müşteriye bildirmek', 'Üretilen kuponları operasyona raporlamak', 'Restoran hazırlığını kısaltacak ekranlar'], 3, 'Bu değerli bir iş olabilir, ama ayrı bir talep. Kapsam dışına yazmak onu unutmak değil, bu sürümde beklenmediğini herkese söylemektir.')
  ] });

/* ---------- 3. Gereksinim ---------- */
add({ id: 'ba-gereksinim', lv: 'B1', min: 28,
  title: 'Gereksinim yazmak (requirements): iş kuralı, kullanıcı hikâyesi, kabul kriteri, kenar durumlar',
  sum: 'İşlevsel ve işlevsel olmayan gereksinim, test edilebilir ifade, INVEST, Given/When/Then, kenar durumları veriden bulmak.',
  en: 'functional non-functional requirement business rule user story invest acceptance criteria given when then gherkin edge case işlevsel gereksinim kabul kriteri kullanıcı hikayesi',
  body: `<p>Görüşmeler bitti. Şimdi konuşulanları, başka biri okuyup aynı şeyi yapacak hâle getiriyorsun. İyi bir gereksinimin ölçüsü basit: geliştirici ve test uzmanı birbirine sormadan aynı sonuca varır.</p>
<h2>Üç tür ifade</h2>
<table><tr><th>Tür</th><th>Neyi söyler?</th><th>Kupon örneği</th></tr>
<tr><td><b>İşlevsel gereksinim</b> (functional)</td><td>Sistem ne yapar</td><td>Sistem, geç teslim edilen siparişte müşteriye kupon oluşturur.</td></tr>
<tr><td><b>İşlevsel olmayan gereksinim</b> (non-functional)</td><td>Sistem bunu hangi nitelikte yapar: hız, güvenlik, kayıt, erişilebilirlik</td><td>Kupon, teslim kaydından en geç 5 dakika sonra görünür.</td></tr>
<tr><td><b>İş kuralı</b> (business rule)</td><td>Sistemden bağımsız şirket kararı</td><td>Bir müşteri bir takvim ayında en çok 2 kupon alır.</td></tr></table>
<p>Tutar değişirse kod değil, kural değişmelidir. Bu ayrımı yazmak, geliştiriciye “bu değer sabit mi, ayar mı?” sorusunu baştan sordurur.</p>
<h2>Belirsizden açığa</h2>
<table><tr><th>Belirsiz</th><th>Neden sorunlu?</th><th>Test edilebilir hâli</th></tr>
<tr><td>Geç teslimlerde hızlıca kupon verilir.</td><td>Geç ve hızlı kişiye göre değişir</td><td>Teslim süresi 2.700 saniyeyi aşan siparişte kupon, teslim kaydından en geç 5 dakika sonra oluşur.</td></tr>
<tr><td>Kupon makul bir tutarda olur.</td><td>Makul bir sayı değil</td><td>Süre 2.700 saniyeyi aşıp 3.600 saniyeyi aşmıyorsa 30 TL, 3.600 saniyeyi aşıyorsa 60 TL.</td></tr>
<tr><td>Kötüye kullanım engellenir.</td><td>Hangi davranış, ne olur?</td><td>Takvim ayında 2 kupon almış müşteriye yeni kupon üretilmez, kayıt “sınır dolu” nedeniyle loglanır.</td></tr>
<tr><td>Müşteri bilgilendirilir.</td><td>Hangi kanal, hangi metin?</td><td>Kupon oluşunca uygulama içi bildirim gider; metin ve kanal EK-2'dedir.</td></tr></table>
<p>“Hızlı, kolay, uygun, gerektiğinde, vb.” sözcüklerini gördüğünde dur. Yerine sayı, koşul ya da liste yaz.</p>
<h2>Kullanıcı hikâyesi (user story)</h2>
<p>Çevik (agile) ekiplerde iş çoğu zaman şu kalıpla yazılır: <b>Bir [kim] olarak, [ne] istiyorum, böylece [neden].</b></p>
${nor(`Bir müşteri olarak,
siparişim söz verilen süreyi aştığında otomatik telafi kuponu almak istiyorum,
böylece destek ekibine yazmadan hakkım olanı alırım.`)}
<p>Hikâyenin yeterince iyi olup olmadığını <b>INVEST</b> ile sınarsın:</p>
<table><tr><th>Harf</th><th>Soru</th><th>Kuponda</th></tr>
<tr><td><b>I</b>ndependent (bağımsız)</td><td>Başka hikâyeyi beklemeden yapılabilir mi?</td><td>Kupon üretimi ödeme ekranı değişikliğini beklemez</td></tr>
<tr><td><b>N</b>egotiable (konuşulabilir)</td><td>Ayrıntı ekiple netleşebilir mi?</td><td>Bildirim metni birlikte yazılır</td></tr>
<tr><td><b>V</b>aluable (değerli)</td><td>Birine değer sağlıyor mu?</td><td>Müşteri ve destek ekibi kazanır</td></tr>
<tr><td><b>E</b>stimable (tahmin edilebilir)</td><td>Ekip büyüklüğünü kestirebilir mi?</td><td>Kurallar yazılıysa evet</td></tr>
<tr><td><b>S</b>mall (küçük)</td><td>Bir iterasyona sığıyor mu?</td><td>“Kupon sistemini kur” değil, “geç teslimde kupon üret”</td></tr>
<tr><td><b>T</b>estable (test edilebilir)</td><td>Bitti diyebilir miyiz?</td><td>Kabul kriterleri var</td></tr></table>
<h2>Kabul kriteri (acceptance criteria): Given / When / Then</h2>
<p><b>Given</b> başlangıç durumu, <b>When</b> olay, <b>Then</b> beklenen sonuçtur. Türkçe çalışan ekipler bunu “Diyelim ki / Eğer ki / O zaman” diye de yazabilir.</p>
${nor(`Senaryo: 60 dakikayı aşan teslim
Given durumu "teslim" olan bir sipariş var
  And sipariş ile teslim arası 3.601 saniye
  And müşterinin bu ay aldığı kupon sayısı 1
When teslim kaydı oluşur
Then müşteriye 60 TL kupon oluşur
  And kupon teslim kaydından en geç 5 dakika sonra görünür

Senaryo: İade edilmiş sipariş
Given durumu "iade" olan bir sipariş var
  And sipariş ile teslim arası 4.000 saniye
When kupon işi çalışır
Then kupon oluşmaz`)}
<h2>Kenar durumları veriden bul</h2>
<p>Toplantıda aklına gelmeyen durumları veri söyler. Her biri bir soru üretir, cevabı bir kural olur.</p>
${box(`SELECT status, COUNT(*) AS siparis,
       SUM(CASE WHEN delivered_at IS NULL THEN 1 ELSE 0 END) AS teslim_zamani_bos,
       SUM(CASE WHEN courier_id IS NULL THEN 1 ELSE 0 END) AS kurye_bos
FROM lk_orders
WHERE placed_at >= '2024-10-01' AND placed_at < '2025-01-01'
GROUP BY status
ORDER BY status;`)}
<table><tr><th>Veride gördüğün</th><th>Doğan soru</th><th>Kural</th></tr>
<tr><td>${f(N.q4Iptal)} iptal siparişte teslim zamanı boş, ${f(N.q4IptalKuryesiz)} tanesinde kurye de yok</td><td>Süre hesaplanmayan kayıt ne olacak?</td><td>İptalde kupon yok; süre hesaplanmaz</td></tr>
<tr><td>${f(N.gecIade)} iade siparişi de 45 dakikayı aşmış</td><td>Parası iade edilene bir de kupon mu?</td><td>Yalnız “teslim” durumu kupon alır</td></tr>
<tr><td>${f(N.tam45)} teslimat tam 2.700 saniye sürmüş</td><td>“Aşan” mı, “ve üzeri” mi?</td><td>2.700 geç değildir; sınır dahil değil</td></tr>
<tr><td>${f(N.musteriAy)} müşteri-ayda 2'den çok geç teslim var</td><td>Sınır gerçekten çalışır mı?</td><td>Ayda en çok 2; ${f(N.fazlaKupon)} kupon sınırdan düşer</td></tr>
<tr><td>Dönem sınırında ${f(N.disiSiparis)} sipariş 1 Ocak 2025'e sarkmış</td><td>Hangi aya yazılır?</td><td>Ay, sipariş zamanına göre belirlenir</td></tr></table>
<div class="warn"><b>Dakika mı, saniye mi?</b>Süreyi dakikaya kesen bir hesapla “45'ten büyük” yazarsan 45 dakika 30 saniye süren teslimat geç sayılmaz. Bu veride ${f(N.kesilen)} teslimat tam bu aralıkta: toplam ${f(N.kesilenTL)} TL'lik kupon sessizce kaybolur. SQL türlerinin dakika farkı fonksiyonları da aynı davranmaz; SQL Server'ın <code>DATEDIFF(minute, ...)</code> ifadesi dakika sınırı geçişlerini sayar. Bu yüzden kural saniye ile yazıldı. Böyle bir ayrıntı gereksinimde açık yazılmazsa testte değil canlıda ortaya çıkar.</div>
<p>Çıktın: numaralı gereksinim listesi, iş kuralları tablosu, hikâyeler ve her hikâyenin kabul kriterleri. Bunlar BRD'nin kalbidir.</p>`,
  ex: [
    mc('Hangisi <b>işlevsel olmayan</b> gereksinimdir?', ['Kupon en geç 5 dakikada görünür', 'Geç teslim edilen siparişe otomatik olarak kupon oluşturulur', 'Müşteri kuponlarını uygulamada listeleyebilir', 'İade edilen siparişe kupon oluşturulmaz'], 0, 'Süre sınırı sistemin ne yaptığını değil, bunu hangi nitelikte yaptığını söyler. Diğerleri davranış tanımlıyor.'),
    mc('Hangi ifade test edilebilir?', ['Kupon uygun bir sürede müşteriye iletilir', 'Süre 2.700 saniyeyi aşınca kupon oluşur', 'Sistem geç teslimleri hızlı biçimde algılar', 'Kullanıcı kupon ekranını kolayca kullanabilir'], 1, 'Test edilebilir ifade tek bir doğru sonuç bırakır. “Uygun”, “hızlı”, “kolay” kişiye göre değişir.'),
    mc('“Bir yönetici olarak kupon, kampanya, puan ve sadakat sistemini yönetmek istiyorum.” INVEST\'in hangi harfini en açık biçimde bozuyor?', ['V, çünkü yöneticiye hiçbir değer sağlamıyor', 'N, çünkü üzerinde konuşulamayacak kadar kesin', 'S, çünkü tek iterasyona sığmayacak boyutta', 'I, çünkü başka hikâyelere hiç bağlı olamaz'], 2, 'Bu tek hikâye değil, bir epik (epic): birden çok hikâyeye bölünmesi gerekir. Bölününce tahmin etmek ve test etmek de kolaylaşır.'),
    mc('Given/When/Then kalıbında “kupon oluşur” hangi bölüme yazılır?', ['Given, çünkü başlangıçta bilinen bir durumdur', 'When, çünkü senaryoyu başlatan olaydır', 'Bu kalıba yazılmaz, ayrı bir iş kuralıdır', 'Then, çünkü beklenen sonuçtur'], 3, 'Then beklenen sonuçtur. Durum Given, tetikleyen olay When bölümüne yazılır.'),
    sq('Kenar durumları bul. Dönemdeki (Ekim-Aralık 2024) siparişleri duruma göre grupla: <code>status</code>, <code>siparis</code>, teslim zamanı boş olan sipariş sayısı <code>teslim_zamani_bos</code>. Duruma göre sırala.', "SELECT status, COUNT(*) AS siparis, SUM(CASE WHEN delivered_at IS NULL THEN 1 ELSE 0 END) AS teslim_zamani_bos FROM lk_orders WHERE placed_at >= '2024-10-01' AND placed_at < '2025-01-01' GROUP BY status ORDER BY status;", 'Boşluğu IS NULL ile yakala ve koşullu toplama yap. Dönem sınırlarını iki tarih karşılaştırmasıyla yaz; üst sınır dahil değil.', { ord: true }),
    sq('Sınır değer. Tam 2.700 saniye süren teslim edilmiş sipariş sayısı: <code>tam_sinir</code>. Kural “aşan” dediği için bunlar kupon almaz.', CTE + "SELECT COUNT(*) AS tam_sinir FROM t WHERE status = 'teslim' AND sure_sn = 2700;", 'Bu sefer karşılaştırma “büyüktür” değil, eşitlik.', { start: START }),
    sq('Yeni soru: iade edilen siparişlerden kaçı 45 dakikayı aşmış? Kural “yalnız teslim” olmasaydı bunlar kupon alırdı: <code>iade_gec</code>.', CTE + "SELECT COUNT(*) AS iade_gec FROM t WHERE status = 'iade' AND sure_sn > 2700;", 'Durum değerleri teslim, iptal ve iade. İki koşulu AND ile birleştir.', { start: START }),
    sq('Aylık sınır sorusu: bir müşterinin aynı takvim ayında 2\'den fazla geç teslim aldığı <b>müşteri-ay</b> sayısı ve sınır yüzünden üretilmeyecek kupon sayısı: <code>musteri_ay</code>, <code>dusen_kupon</code>.', CTE + ", g AS (SELECT customer_id, strftime('%Y-%m', placed_at) AS ay, COUNT(*) AS n FROM t WHERE status = 'teslim' AND sure_sn > 2700 GROUP BY customer_id, strftime('%Y-%m', placed_at) HAVING COUNT(*) > 2) SELECT COUNT(*) AS musteri_ay, SUM(n - 2) AS dusen_kupon FROM g;", 'İkinci bir CTE ile önce müşteri ve aya göre grupla, 2\'den fazlasını HAVING ile ayır. Dışta hem satırları say hem de fazlalığı topla. Yeni CTE için WITH yazmak yerine başlangıç kodundan sonra virgülle devam et.', { start: CTE + '-- t\'nin arkasına virgülle ikinci bir CTE ekleyerek devam et.\n' }),
    sq('Dakikaya kesmenin bedeli. Süresi 2.700 saniyeyi aşan ama 2.760 saniyenin altında kalan teslimatlar, dakikaya kesen bir hesapta “45 dakika” görünür ve kupon alamaz. Bu teslimatların sayısı: <code>kaybolan</code>.', CTE + "SELECT COUNT(*) AS kaybolan FROM t WHERE status = 'teslim' AND sure_sn > 2700 AND sure_sn < 2760;", 'İki sınır da dahil değil. Durumu da süzmeyi unutma.', { start: START }),
    mc('Kabul kriterinde “Given müşterinin bu ay aldığı kupon sayısı 2” yazıyor. Bu senaryonun beklenen sonucu ne olmalı?', ['60 TL kupon oluşur, sınır yalnız 30 TL için geçerlidir', 'Kupon oluşmaz, kayıt sınır nedeniyle loglanır', 'Kupon oluşur, müşteri ertesi ay kullanabilir', 'İşlem hata verir, destek ekibi elle kupon tanımlar'], 1, 'İş kuralı ayda en çok 2 kupon diyor. İyi kriter yalnız “üretilmez” demez, izlenebilirlik için ne kaydedileceğini de söyler.')
  ] });

/* ---------- 4. Süreç ---------- */
const SEPET = `WITH sepet AS (
  SELECT order_id, SUM(qty * unit_price) AS tutar
  FROM lk_order_lines
  GROUP BY order_id
)
`;
add({ id: 'ba-surec', lv: 'B1', min: 26,
  title: 'Süreci çizmek: AS-IS, TO-BE, BPMN, sıra diyagramı (sequence diagram), karar tablosu',
  sum: 'Bugünkü ve hedef süreç, BPMN temel öğeleri, servisler arası mesajlaşma, karar tablosu, kuralı veriden çıkarmak.',
  en: 'as-is to-be process bpmn swimlane gateway event task sequence diagram decision table süreç kulvar karar tablosu',
  body: `<p>Yazılı kurallar tek tek doğru olsa bile bütün akışı göstermez. Süreç şeması, “bu noktada ne olur?” sorusunu görünür kılar. Çoğu boşluk iki kutunun arasındaki okta yakalanır.</p>
<h2>AS-IS ve TO-BE</h2>
<p><b>AS-IS</b> bugünkü süreç, <b>TO-BE</b> hedef süreçtir. Önce AS-IS yaz: neyin değişeceğini ve kimin işinin etkileneceğini ancak böyle görürsün. Kupon talebinde bugünkü durumu destek ekibinden dinledik:</p>
<table><tr><th>Adım</th><th>AS-IS (bugün)</th><th>TO-BE (hedef)</th></tr>
<tr><td>Fark etme</td><td>Müşteri şikâyet yazarsa fark edilir</td><td>Teslim kaydı gelince sistem süreyi hesaplar</td></tr>
<tr><td>Karar</td><td>Destek çalışanı kendi yorumuyla karar verir</td><td>Karar tablosu uygulanır</td></tr>
<tr><td>Telafi</td><td>Çalışan elle kupon tanımlar</td><td>Kupon otomatik oluşur, müşteriye bildirilir</td></tr>
<tr><td>İzleme</td><td>Kaç kupon verildiği bilinmez</td><td>Her kupon sipariş numarasıyla kayıtlıdır</td></tr></table>
<div class="note"><b>Bu tablonun kaynağı</b>Lezzet Kurye hayalidir; AS-IS sütunu senaryonun parçasıdır. Gerçek işte bunu görüşme ve gözlemle doğrularsın. Veride bugün teslim sonrası kupon izi yok: indirim, sipariş anında belirlenen bir alan. Geç siparişlerin ${f(N.indirimliGec)} tanesinde indirim görünmesi telafi olduğunu göstermez.</div>
<h2>BPMN temel öğeleri</h2>
<p><b>BPMN</b> (Business Process Model and Notation) süreç çizmek için yaygın kullanılan standart gösterimdir. İşin büyük kısmı dört öğeyle çözülür.</p>
<table><tr><th>Öğe</th><th>Çizimi</th><th>Anlamı</th></tr>
<tr><td><b>Olay</b> (event)</td><td>Daire: ince başlangıç, kalın bitiş</td><td>Bir şey olur: teslim kaydı geldi, süreç bitti</td></tr>
<tr><td><b>Görev</b> (task)</td><td>Köşesi yuvarlak dikdörtgen</td><td>Birinin ya da sistemin yaptığı iş</td></tr>
<tr><td><b>Karar</b> (gateway)</td><td>Baklava</td><td>Akış koşula göre ayrılır; her çıkışın adı olur</td></tr>
<tr><td><b>Kulvar</b> (lane)</td><td>Yüzme kulvarı gibi şerit</td><td>İşi kimin yaptığını gösterir</td></tr></table>
${bpmn}
<p>Şemayı okurken her baklavanın bütün çıkışlarının adı var mı, her yol bir bitişe varıyor mu diye bak. Bu çizim “kayıt tamam değilse ne olur?” sorusunu görünür kıldı: gereksinimde olmayan bir operasyon kuyruğu doğdu. BPMN'de çok daha fazla öğe vardır; bu ders okuyup temel akış çizecek kadarını verir.</p>
<h2>Sıra diyagramı (sequence diagram)</h2>
<p>BPMN işin akışını, <b>sıra diyagramı</b> sistemlerin birbirine hangi sırayla mesaj attığını gösterir. Dikey çizgiler katılımcılar, oklar mesajlar, kesikli oklar cevaplardır. Zaman yukarıdan aşağı akar.</p>
${sekans}
<p>Alttaki bölüm önemli: ağ koptuğu için aynı istek ikinci kez gelirse ikinci kupon üretilmez. Bu davranışın adı <b>idempotency</b>; API dersinde ayrıntısına gireceğiz. Çizim bu soruyu toplantıda sormanı sağlar.</p>
<h2>Karar tablosu (decision table)</h2>
<p>Çok koşullu kuralı cümleyle yazmak hata getirir. Karar tablosu bütün birleşimleri listeler, boş kalan kutu eksik kuraldır.</p>
<table><tr><th>Kural</th><th>Durum</th><th>Süre (saniye)</th><th>Aylık kupon &lt; 2</th><th>Sonuç</th></tr>
<tr><td>K1</td><td>iptal, iade</td><td>fark etmez</td><td>fark etmez</td><td>Kupon yok</td></tr>
<tr><td>K2</td><td>teslim</td><td>2.700 ve altı</td><td>fark etmez</td><td>Kupon yok</td></tr>
<tr><td>K3</td><td>teslim</td><td>2.701 - 3.600</td><td>evet</td><td>30 TL</td></tr>
<tr><td>K4</td><td>teslim</td><td>3.601 ve üstü</td><td>evet</td><td>60 TL</td></tr>
<tr><td>K5</td><td>teslim</td><td>2.701 ve üstü</td><td>hayır</td><td>Kupon yok, “sınır dolu” kaydı</td></tr></table>
<p>K1-K4'ü SQL'e dökmek, kuralın veride neye karşılık geldiğini gösterir. Sıra önemli: <code>CASE</code> ilk doğru koşulda durur.</p>
${box(CTE + `SELECT CASE WHEN status <> 'teslim' THEN 'K1 durum uygun değil'
            WHEN sure_sn <= 2700 THEN 'K2 zamanında'
            WHEN sure_sn <= 3600 THEN 'K3 30 TL'
            ELSE 'K4 60 TL' END AS kural,
       COUNT(*) AS siparis
FROM t
GROUP BY CASE WHEN status <> 'teslim' THEN 'K1 durum uygun değil'
              WHEN sure_sn <= 2700 THEN 'K2 zamanında'
              WHEN sure_sn <= 3600 THEN 'K3 30 TL'
              ELSE 'K4 60 TL' END
ORDER BY kural;`)}
<h2>Kuralı veriden çıkarmak</h2>
<p>Yazılı olmayan kural çoğu zaman veride durur. Veri sözlüğünde “400 TL üzeri teslimat ücretsiz” yazıyor. Doğru mu, sınır dahil mi? Sor:</p>
${box(SEPET + `SELECT CASE WHEN o.delivery_fee = 0 THEN 'ücretsiz' ELSE 'ücretli' END AS teslimat,
       COUNT(*) AS siparis, MIN(s.tutar) AS en_kucuk, MAX(s.tutar) AS en_buyuk
FROM lk_orders o
JOIN sepet s ON s.order_id = o.order_id
GROUP BY CASE WHEN o.delivery_fee = 0 THEN 'ücretsiz' ELSE 'ücretli' END
ORDER BY teslimat;`)}
<p>Ücretsiz teslimatların en küçüğü ${f(N.sepetEsik)} TL, ücretlilerin en büyüğü ${f(N.sepetAltMax)} TL. Tek istisna yok. Yani kural “400 TL ve üzeri ücretsiz” diye yazılmalı, sözlükteki “üzeri” sözcüğü sınırı yanlış anlatıyor. Veri kuralı doğrular ya da çürütür, ama kuralın neden öyle olduğunu söylemez: onu iş birimine sorarsın.</p>`,
  ex: [
    mc('BPMN şemasında baklava neyi gösterir?', ['Süreci başlatan dış olayı', 'Akışın koşulla ayrıldığı yeri', 'Bir kişinin yaptığı tek görevi', 'Sürecin bittiği son noktayı'], 1, 'Baklava karar noktasıdır (gateway). Her çıkışın adı olmalı; adı olmayan çıkış, gereksinimde eksik koşul demektir.'),
    mc('Süreç şemasında kulvar (lane) ne işe yarar?', ['Görevlerin kaç dakika sürdüğünü gösterir', 'Hangi görevin önce yapılacağını belirler', 'İşi kimin yaptığını ayırır', 'Karar noktalarının sonucunu kaydeder'], 2, 'Kulvar işi yapanı gösterir. Bir ok kulvar değiştirdiğinde iş el değiştirir; gecikme ve iletişim sorunu çoğunlukla bu noktalarda doğar.'),
    mc('Kupon ve sipariş servisi arasında hangi mesajın hangi sırayla gideceğini tartışıyorsun. Hangi çizim uygun?', ['Sıra diyagramı', 'ER diyagramı (varlık ilişki)', 'Karar tablosu', 'RACI tablosu'], 0, 'Sıra diyagramı katılımcılar arasındaki mesajların zaman sırasını gösterir. ER veriyi, karar tablosu kuralı, RACI sorumluluğu anlatır.'),
    mc('Üç seçenekli bir koşul ile iki seçenekli bir koşul için karar tablosunda en çok kaç birleşim vardır?', ['5 birleşim', '8 birleşim', '9 birleşim', '6 birleşim'], 3, '3 × 2 = 6. Her birleşimi bir kurala bağlamak unutulan durumu ortaya çıkarır; bazıları “fark etmez” ile tek satırda birleşebilir.'),
    mc('Süreci yeniden tasarlamadan önce AS-IS yazmanın en önemli nedeni hangisi?', ['Neyin ve kimin etkileneceğini görmek', 'Dokümanı uzatıp projeyi resmî göstermek', 'Geliştirici için kod iskeletini çıkarmak', 'Kuponun tutarını bütçeye göre belirlemek'], 0, 'Bugünkü işi bilmeden değişikliğin etkisi anlaşılmaz. Destek çalışanının elle yaptığı iş kalkıyorsa bu hem kazanç hem değişiklik yönetimi konusudur.'),
    sq('Karar tablosunu veriye uygula: dönemdeki her siparişi K1-K4 kurallarından birine yaz ve say. <code>kural</code>, <code>siparis</code>. Kural adları tam olarak: <code>K1</code> (teslim değil), <code>K2</code> (2.700 saniye ve altı), <code>K3</code> (3.600 ve altı), <code>K4</code> (üstü). Kurala göre sırala.', CTE + "SELECT CASE WHEN status <> 'teslim' THEN 'K1' WHEN sure_sn <= 2700 THEN 'K2' WHEN sure_sn <= 3600 THEN 'K3' ELSE 'K4' END AS kural, COUNT(*) AS siparis FROM t GROUP BY CASE WHEN status <> 'teslim' THEN 'K1' WHEN sure_sn <= 2700 THEN 'K2' WHEN sure_sn <= 3600 THEN 'K3' ELSE 'K4' END ORDER BY kural;", 'CASE ilk doğru koşulda durur, bu yüzden durum koşulunu en başa koy. Gruplamada aynı ifadeyi tekrarla.', { start: START, ord: true }),
    sq('AS-IS kanıtı: geç teslim edilen siparişlerde indirim önceden var mıydı? Teslim edilen siparişlerde <code>durum</code> (\'geç\' ya da \'zamanında\'), <code>siparis</code>, <code>indirimli</code> (<code>discount</code> sıfırdan büyük olanlar). <code>t</code> indirimi taşımıyor, <code>lk_orders</code> ile bağla. Duruma göre sırala.', CTE + "SELECT CASE WHEN t.sure_sn > 2700 THEN 'geç' ELSE 'zamanında' END AS durum, COUNT(*) AS siparis, SUM(CASE WHEN o.discount > 0 THEN 1 ELSE 0 END) AS indirimli FROM t JOIN lk_orders o ON o.order_id = t.order_id WHERE t.status = 'teslim' GROUP BY CASE WHEN t.sure_sn > 2700 THEN 'geç' ELSE 'zamanında' END ORDER BY durum;", 'Aynı siparişin indirim bilgisini almak için sipariş numarasıyla bağla. Satır sayısı değişmez, çünkü iki tarafta da sipariş başına tek satır var.', { start: START, ord: true }),
    sq('Süreç adımı hangi şehirde uzuyor? Teslim edilen ve dönem içindeki siparişlerde şehre göre (<code>lk_restaurants.city</code>) ortalama hazırlık süresi (<code>placed_at</code> → <code>picked_at</code>) ve yol süresi (<code>picked_at</code> → <code>delivered_at</code>), dakika, 1 basamak: <code>city</code>, <code>hazirlik_dk</code>, <code>yol_dk</code>. Şehre göre sırala.', "SELECT r.city, ROUND(AVG((julianday(o.picked_at) - julianday(o.placed_at)) * 86400) / 60.0, 1) AS hazirlik_dk, ROUND(AVG((julianday(o.delivered_at) - julianday(o.picked_at)) * 86400) / 60.0, 1) AS yol_dk FROM lk_orders o JOIN lk_restaurants r ON r.restaurant_id = o.restaurant_id WHERE o.status = 'teslim' AND o.placed_at >= '2024-10-01' AND o.placed_at < '2025-01-01' GROUP BY r.city ORDER BY r.city;", 'Derste “Sorun nerede oluşuyor?” başlığındaki süre ifadelerini kullan; kutunun çevirisi seçtiğin SQL türüne uyar. Saniyeyi 60.0 ile böl.', { ord: true }),
    sq('Kuralı veriden doğrula: “400 TL ve üzeri sepette teslimat ücretsiz”. Bu kuralı <b>bozan</b> sipariş sayısı (sepet 400 ve üzeri ama ücret var, ya da sepet 400 altı ama ücret yok): <code>istisna</code>. Sepet tutarını başlangıç kodu hesaplıyor.', SEPET + "SELECT COUNT(*) AS istisna FROM lk_orders o JOIN sepet s ON s.order_id = o.order_id WHERE (s.tutar >= 400 AND o.delivery_fee > 0) OR (s.tutar < 400 AND o.delivery_fee = 0);", 'Kuralın tersini iki parça olarak yaz ve OR ile birleştir, her parçayı parantez içine al. Sonuç sıfırsa kural veride istisnasız geçerli.', { start: SEPET + '-- sepet: her siparişin satır toplamı\n' })
  ] });

/* ---------- 5. Veri ---------- */
const ADAY = `CREATE TABLE ba_aday AS
SELECT order_id, customer_id, status, placed_at,
       ${SN} AS sure_sn
FROM lk_orders
WHERE placed_at >= '2024-12-01' AND placed_at < '2025-01-01';
`;
const KUPON_DDL = `CREATE TABLE ba_kupon (
  order_id    INT NOT NULL,
  customer_id INT NOT NULL,
  tutar       DECIMAL(10, 2) NOT NULL,
  neden       VARCHAR(20) NOT NULL
);
`;
const YUKLE = "INSERT INTO ba_kupon (order_id, customer_id, tutar, neden) SELECT order_id, customer_id, CASE WHEN sure_sn > 3600 THEN 60 ELSE 30 END, 'gec_teslim' FROM ba_aday WHERE status = 'teslim' AND sure_sn > 2700;";
add({ id: 'ba-veri', lv: 'B1', min: 26,
  title: 'Veriyi konuşmak: ER ve veri sözlüğü, alan eşleme (field mapping), yeni tablo önerisi, göç kontrolleri',
  sum: 'ER ve veri sözlüğü okuma, kaynaktan hedefe alan eşleme, kupon için tablo önerisi, veri göçü kontrolleri, sınırın nerede olduğu.',
  en: 'er diagram data dictionary field mapping source target migration ddl reconciliation veri sözlüğü alan eşleme veri göçü nullable',
  body: `<p>Kupon nereden okuyacak, nereye yazılacak? İş analisti veritabanı tasarlamaz, ama “bu alan nereden geliyor, boş olabilir mi, kim dolduruyor?” sorularını sormadan gereksinim bitmez.</p>
<h2>Bugünkü model ve öneri</h2>
${erSema}
<p>Şemayı şöyle oku: bir müşterinin çok siparişi olabilir, bir siparişin tek müşterisi vardır (1:N). Bir siparişin en çok bir kuponu olur, çoğunun hiç olmaz (1:0..1). Bu son cümle iş kuralıdır ve tabloda <code>UNIQUE</code> olarak yaşar.</p>
<h2>Veri sözlüğü (data dictionary)</h2>
<p>Her alanın anlamını, tipini ve boş olup olamayacağını yazar. Bu uygulamada <b>Veri setleri</b> sayfası bu işi görür; orada <code>lk_orders</code> tablosunu aç. Sözlük yazılan değil, doğrulanan bir şeydir:</p>
${box(`SELECT status, COUNT(*) AS siparis,
       SUM(CASE WHEN picked_at IS NULL THEN 1 ELSE 0 END) AS alis_bos,
       SUM(CASE WHEN delivered_at IS NULL THEN 1 ELSE 0 END) AS teslim_bos,
       SUM(CASE WHEN courier_id IS NULL THEN 1 ELSE 0 END) AS kurye_bos
FROM lk_orders
GROUP BY status
ORDER BY status;`)}
<div class="note"><b>Eksik alan da bulgudur</b>Kullanıcı hikâyesinde “söz verilen süre” geçiyordu, ama <code>lk_orders</code> tablosunda söz verilen süre diye bir alan yok. Bu yüzden 45 dakikalık sabit kural yazdık. Bunu BRD'ye “varsayım” olarak yaz: müşteriye uygulamada başka bir süre söyleniyorsa kural çelişir.</div>
<h2>Alan eşleme (field mapping)</h2>
<p>Her hedef alanın nereden, hangi dönüşümle geldiğini tablo olarak yazarsın. Geliştirici bunu kodlar, test uzmanı bununla sınar.</p>
<table><tr><th>Hedef alan</th><th>Tip</th><th>Boş olabilir mi?</th><th>Kaynak</th><th>Dönüşüm</th></tr>
<tr><td><code>order_id</code></td><td>tam sayı</td><td>hayır</td><td><code>lk_orders.order_id</code></td><td>yok</td></tr>
<tr><td><code>customer_id</code></td><td>tam sayı</td><td>hayır</td><td><code>lk_orders.customer_id</code></td><td>yok</td></tr>
<tr><td><code>tutar</code></td><td>para, 2 ondalık</td><td>hayır</td><td><code>placed_at</code>, <code>delivered_at</code></td><td>süre 3.600 saniyeyi aşıyorsa 60, 2.700'ü aşıyorsa 30</td></tr>
<tr><td><code>olusturma</code></td><td>tarih-saat</td><td>hayır</td><td>sistem saati</td><td>kupon oluşma anı</td></tr>
<tr><td><code>kullanim</code></td><td>tarih-saat</td><td>evet</td><td>ödeme servisi</td><td>kupon kullanılana kadar boş</td></tr></table>
<h2>DDL önerisini okumak</h2>
<p>DDL (data definition language), tablo yapısını tanımlayan SQL'dir. Geliştirici ekibin önerisini okuyup kuralların yansıyıp yansımadığını kontrol edersin:</p>
${nor(`CREATE TABLE ba_kupon (
  kupon_id    BIGINT PRIMARY KEY,
  order_id    BIGINT NOT NULL UNIQUE REFERENCES lk_orders(order_id),
  customer_id BIGINT NOT NULL REFERENCES lk_customers(customer_id),
  tutar       DECIMAL(10, 2) NOT NULL CHECK (tutar > 0),
  olusturma   TIMESTAMP NOT NULL,
  kullanim    TIMESTAMP NULL
);`)}
<table><tr><th>Satır</th><th>Hangi kurala denk geliyor?</th></tr>
<tr><td><code>order_id ... UNIQUE</code></td><td>Sipariş başına en çok bir kupon. İki kez çalışan iş ikinci kupon üretemez.</td></tr>
<tr><td><code>REFERENCES</code></td><td>Var olmayan siparişe kupon yazılamaz.</td></tr>
<tr><td><code>DECIMAL(10, 2)</code></td><td>Para kesin ondalık tipte tutulur; kayan noktalı tipte yuvarlama hatası olur.</td></tr>
<tr><td><code>kullanim ... NULL</code></td><td>Kullanılmamış kupon için boş değer anlamlıdır.</td></tr></table>
<div class="warn"><b>Sınır nerede?</b>Senin işin “sipariş başına tek kupon” kuralını söylemek ve DDL'de bunu görmektir. İndeks seçimi, bölümleme, kilitleme ve anahtar tipi geliştirici ya da veritabanı yöneticisinin kararıdır. Eksik görürsen soru sor, tasarımı üstüne alma. Bu derste tablo kurmanın amacı da kuralı denemektir.</div>
<h2>Veri göçü (data migration) kontrolleri</h2>
<p>Yeni sistem açılırken eski kayıtlar da taşınacaksa ya da geçmiş dönem için kupon üretilecekse (backfill), üç soru sorulur: satır sayısı tuttu mu, toplam tuttu mu, kural dışı kayıt var mı? Aşağıda Aralık 2024 için aday siparişleri hazırlayan bir kutu var. Alıştırmalarda bunu tabloya yükleyip kontrol edeceksin.</p>
${box(`SELECT COUNT(*) AS kaynak_aday,
       SUM(CASE WHEN ${SN} > 3600 THEN 60 ELSE 30 END) AS kaynak_tutar
FROM lk_orders
WHERE status = 'teslim' AND placed_at >= '2024-12-01' AND placed_at < '2025-01-01'
  AND ${SN} > 2700;`)}
<p>Yüklemeden sonra hedef tablodan aynı iki sayı çıkmalı. Çıkmıyorsa göç bitmemiştir.</p>`,
  ex: [
    sq('Veri sözlüğünü doğrula: <code>courier_id</code> sözlükte “iptalde boş olabilir” diye geçiyor. Durumlara göre boş kurye sayısı: <code>status</code>, <code>kurye_bos</code>. Duruma göre sırala.', "SELECT status, SUM(CASE WHEN courier_id IS NULL THEN 1 ELSE 0 END) AS kurye_bos FROM lk_orders GROUP BY status ORDER BY status;", 'Duruma göre grupla, boşları koşullu toplamayla say. Sonuç sözlükteki cümleyi destekliyor mu, sonra kendin yorumla.', { ord: true }),
    sq('Referans bütünlüğü: <code>lk_orders</code> tablosunda müşterisi <code>lk_customers</code> tablosunda bulunmayan sipariş sayısı: <code>yetim</code>.', "SELECT COUNT(*) AS yetim FROM lk_orders o LEFT JOIN lk_customers c ON c.customer_id = o.customer_id WHERE c.customer_id IS NULL;", 'Eşi olmayanı bulmanın kalıbı: LEFT JOIN yap, sağ tablonun anahtarı boş olanları say.', { must: [{ re: '\\bLEFT\\s+(OUTER\\s+)?JOIN\\b|\\bNOT\\s+EXISTS\\b', msg: 'Eşi olmayan kayıtları bulmak için LEFT JOIN ya da NOT EXISTS kullan.' }] }),
    sq('Alan eşlemeyi sorguya çevir. 5045 ve 5242 numaralı siparişler için hedef kayıtları üret: <code>order_id</code>, <code>musteri</code> (<code>lk_customers.full_name</code>), <code>uyelik</code> (<code>is_premium</code> 1 ise \'premium\', değilse \'standart\'), <code>ilce</code> (<code>district</code>, boşsa \'Belirtilmemiş\'). Sipariş numarasına göre sırala.', "SELECT o.order_id, c.full_name AS musteri, CASE WHEN c.is_premium = 1 THEN 'premium' ELSE 'standart' END AS uyelik, COALESCE(c.district, 'Belirtilmemiş') AS ilce FROM lk_orders o JOIN lk_customers c ON c.customer_id = o.customer_id WHERE o.order_id IN (5045, 5242) ORDER BY o.order_id;", 'Her dönüşüm bir sütundur: biri CASE, biri boşluğu karşılayan fonksiyon. Siparişi müşteriyle bağla.', { ord: true }),
    sq('Başlangıç kodu Aralık 2024 için aday tabloyu (<code>ba_aday</code>) ve geliştirici önerisinin sade hâlini (<code>ba_kupon</code>) kuruyor. Kuralı uygulayarak kuponları yükle: yalnız teslim ve 2.700 saniyeyi aşanlar, tutar 60 ya da 30, <code>neden</code> değeri \'gec_teslim\'.', ADAY + KUPON_DDL + YUKLE, '<code>INSERT INTO ... SELECT</code> kullan. Sütun sırası hedef listesiyle aynı olmalı. Tutar için CASE, süzme için WHERE.', { start: ADAY + KUPON_DDL + '-- Kuponları buraya yükle.\n', check: 'SELECT order_id, customer_id, tutar, neden FROM ba_kupon' }),
    sq('Göç kontrolü. Başlangıç kodu kuponları yüklüyor. Kaynak ve hedefi yan yana koy: iki satır (<code>kontrol</code>, <code>adet</code>, <code>tutar</code>). İlk satır \'kaynak\' (aday tablodan kural ile hesaplanmış), ikinci satır \'hedef\' (<code>ba_kupon</code> tablosundan). İki satırın sayıları aynı olmalı.', ADAY + KUPON_DDL + YUKLE + "\nSELECT 'kaynak' AS kontrol, COUNT(*) AS adet, SUM(CASE WHEN sure_sn > 3600 THEN 60 ELSE 30 END) AS tutar FROM ba_aday WHERE status = 'teslim' AND sure_sn > 2700 UNION ALL SELECT 'hedef', COUNT(*), SUM(tutar) FROM ba_kupon;", 'İki sonucu alt alta koymak için küme işlemi kullan. İlk SELECT sütun adlarını belirler; ikincisinde sabit metin de bir sütundur.', { start: ADAY + KUPON_DDL + YUKLE + '\n-- Mutabakat sorgusunu buraya yaz.\n' }),
    sq('Kural dışı kayıt testi. Başlangıç kodu kuponları yüklüyor. <code>ba_kupon</code> tablosunda aynı siparişe birden çok kupon yazılmış sipariş sayısını bul; bu bir hata sayacı olacak, kalite testi gibi: <code>tekrar_eden</code>.', ADAY + KUPON_DDL + YUKLE + "\nSELECT COUNT(*) AS tekrar_eden FROM (SELECT order_id FROM ba_kupon GROUP BY order_id HAVING COUNT(*) > 1) AS x;", 'İç sorguda sipariş başına grupla, birden çok geçenleri HAVING ile ayır. Dış sorguda onları say; alt sorguya takma ad ver. Sonuç sıfır olmalı.', { start: ADAY + KUPON_DDL + YUKLE + '\n-- Testi buraya yaz.\n' }),
    mc('DDL\'de <code>order_id ... UNIQUE</code> hangi iş kuralını korur?', ['Bir siparişe en çok bir kupon yazılır', 'Bir müşteri ayda en çok iki kupon alır', 'Kuponun tutarı sıfırdan büyük olur', 'Yalnız teslim edilmiş sipariş kupon alır'], 0, 'UNIQUE tek sütunun tekrarını engeller. Aylık sınır ve durum koşulu tek bir satıra bakarak denetlenemez; onlar uygulamada ya da kupon üretim işinde çözülür.'),
    mc('<code>kullanim</code> sütunu neden boş olabilir (NULL)?', ['Tablo tasarımı eksik kalmış, zorunlu olmalıydı', 'Boş değer sıfır lira anlamına gelir, tutarı düşürür', 'Boş değer kuponun iptal edildiğini kaydetmek içindir', 'Kullanılmamış kuponda bu an henüz yaşanmamıştır'], 3, 'NULL burada olmamış bir olayı anlatır. Bunu sıfırla ya da sahte tarihle doldurmak “kullanılmadı” sorgularını bozar.'),
    mc('Geliştirici <code>order_id</code> üzerinde hangi indeks türünün kullanılacağını soruyor. İş analisti olarak en doğru cevap hangisi?', ['İndeks türünü kendin seçip BRD\'ye zorunlu olarak yazarsın', 'İndeks istemediğini söyler, performansı sonra konuşursun', 'Kararı ona bırakır, gerekirse sorgu sıklığını paylaşırsın', 'Kararı iş birimine sorup onay alana kadar işi durdurursun'], 2, 'Fiziksel tasarım teknik ekibin kararıdır. Senin katkın iş bilgisidir: günde kaç sipariş, hangi rapor, ne kadar geriye dönük sorgu.'),
    mc('Para alanı neden <code>DECIMAL(10, 2)</code> gibi kesin bir tiple önerilir?', ['Daha az yer kapladığı için her zaman daha hızlıdır', 'Kayan noktalı tipte yuvarlama hatası olur', 'Yalnız kesin tipler NOT NULL kısıtını destekler', 'Kesin tipler SQL türleri arasında aynı yazılır'], 1, 'Kayan noktalı sayılar ikilik tabanda tutulur, bazı ondalıklar tam gösterilemez. Toplamlar kuruş kaçırır, mutabakat tutmaz.')
  ] });

/* ---------- 6. API ---------- */
const LOG = `CREATE TABLE ba_api_log (
  istek_id INT,
  order_id INT,
  kod      INT
);
INSERT INTO ba_api_log VALUES (1, 5045, 201);
INSERT INTO ba_api_log VALUES (2, 5242, 201);
INSERT INTO ba_api_log VALUES (3, 5242, 200);
INSERT INTO ba_api_log VALUES (4, 6426, 500);
INSERT INTO ba_api_log VALUES (5, 6426, 201);
INSERT INTO ba_api_log VALUES (6, 6589, 500);
INSERT INTO ba_api_log VALUES (7, 1, 422);
`;
add({ id: 'ba-api', lv: 'B1', min: 24,
  title: 'API sözleşmesini okumak (API contract): REST, JSON, durum kodları, idempotency, hata durumları',
  sum: 'Bir iş analisti için REST ve JSON, durum kodları, aynı isteğin tekrarı, hata senaryoları ve API alanlarını tablolara eşlemek.',
  en: 'api contract rest json http status code idempotency idempotent get post put patch delete openapi swagger entegrasyon durum kodu',
  body: `<p>Kupon servisi, sipariş servisi ve bildirim servisi birbirini <b>API</b> (application programming interface) üzerinden çağırır. Sözleşmeyi (contract) geliştirici yazar, sen okursun: yazdığın kural sözleşmede bir yere oturuyor mu? Bu tarayıcıda gerçek bir servis çalışmıyor; bu ders okumaya ve çıkan veriyi SQL ile doğrulamaya dayanır.</p>
<h2>REST'in dört fiili</h2>
<table><tr><th>Fiil (verb)</th><th>Ne yapar?</th><th>Kupon örneği</th></tr>
<tr><td><code>GET</code></td><td>Okur, hiçbir şey değiştirmez</td><td><code>GET /musteriler/162/kuponlar</code></td></tr>
<tr><td><code>POST</code></td><td>Yeni kayıt ya da işlem başlatır</td><td><code>POST /kuponlar</code></td></tr>
<tr><td><code>PUT</code> / <code>PATCH</code></td><td>Günceller (tamamını / bir kısmını)</td><td><code>PATCH /kuponlar/88</code> ile kullanım zamanı</td></tr>
<tr><td><code>DELETE</code></td><td>Siler ya da pasifleştirir</td><td><code>DELETE /kuponlar/88</code></td></tr></table>
<h2>İstek ve cevap</h2>
<p>JSON, anahtar-değer çiftlerinden oluşan metin biçimidir. Aşağıdaki sözleşme parçasını oku:</p>
${nor(`POST /kuponlar
Idempotency-Key: siparis-5045

{
  "order_id": 5045,
  "neden": "gec_teslim"
}

201 Created
{
  "kupon_id": 88,
  "order_id": 5045,
  "customer_id": 162,
  "tutar": 30.00,
  "para_birimi": "TRY",
  "son_kullanim": "2025-01-07T14:01:48+03:00"
}`)}
<p>Okurken soracakların: Tutarı kim hesaplıyor, çağıran mı, servis mi? (Burada servis; iyi, kural tek yerde kalır.) Saat dilimi yazıyor mu? (Evet, <code>+03:00</code>.) Tutar sayı mı, metin mi? <code>son_kullanim</code> bir iş kuralı getirdi: 30 gün mü, bu BRD'de yazıyor mu?</p>
<h2>Durum kodları</h2>
<table><tr><th>Kod</th><th>Anlamı</th><th>Kuponda ne zaman?</th></tr>
<tr><td><code>200 OK</code></td><td>İstek başarılı</td><td>Aynı istek ikinci kez geldi, mevcut kupon döndü</td></tr>
<tr><td><code>201 Created</code></td><td>Yeni kayıt oluştu</td><td>Kupon ilk kez üretildi</td></tr>
<tr><td><code>400 Bad Request</code></td><td>İstek biçimi bozuk</td><td><code>order_id</code> metin geldi</td></tr>
<tr><td><code>401</code> / <code>403</code></td><td>Kimlik yok / yetki yok</td><td>Çağıran servisin izni yok</td></tr>
<tr><td><code>404 Not Found</code></td><td>Kayıt yok</td><td>Böyle bir sipariş yok</td></tr>
<tr><td><code>409 Conflict</code></td><td>Mevcut durumla çakışıyor</td><td>Aynı siparişe farklı anahtarla ikinci kupon</td></tr>
<tr><td><code>422 Unprocessable Content</code></td><td>Biçim doğru, iş kuralı uymuyor</td><td>Sipariş iptal, kupon verilemez</td></tr>
<tr><td><code>500</code> / <code>503</code></td><td>Sunucu tarafı hata</td><td>Veritabanı yanıt vermedi; yeniden denenebilir</td></tr></table>
<p>Sınır çizgisi ekipten ekibe değişir: bazı ekipler iş kuralı ihlalini <code>400</code> ile döner. Önemli olan her hata senaryosunun sözleşmede yazılı olması ve aynı anlamda kullanılmasıdır.</p>
<h2>Idempotency</h2>
<p>Ağ kopar, çağıran taraf cevabı alamadığı için isteği tekrarlar. Servis ikinci kupon üretirse şirket para kaybeder. <b>Idempotent</b> işlem, kaç kez çalışırsa çalışsın sonucu aynı olan işlemdir. <code>GET</code> doğası gereği böyledir; <code>POST</code> için özel önlem gerekir: <code>Idempotency-Key</code> başlığı ya da tablodaki <code>UNIQUE</code> kısıtı. Gereksinim cümlesi: “Aynı sipariş için tekrarlanan istek yeni kupon üretmez, ilk kuponu döner.”</p>
<h2>Hata durumları tablosu</h2>
<table><tr><th>Durum</th><th>Çağıran ne yapar?</th><th>Müşteri ne görür?</th></tr>
<tr><td>Kupon servisi 5 saniyede cevap vermedi</td><td>En çok 3 kez yeniden dener</td><td>Hiçbir şey; kupon sonra gelir</td></tr>
<tr><td>3 denemede de <code>500</code></td><td>Kaydı hata kuyruğuna yazar</td><td>Operasyon inceler, sonra kupon gelir</td></tr>
<tr><td><code>422</code> (kural dışı)</td><td>Yeniden denemez, loglar</td><td>Kupon yok</td></tr></table>
<p>Yeniden denenecek ve denenmeyecek hataları ayırmak iş kararıdır. Sayıları (3 deneme, 5 saniye) burada önerdik, senin projende ekip belirler.</p>
<h2>API'yi tablolara eşle</h2>
<table><tr><th>API alanı</th><th>Tablo ve sütun</th><th>Not</th></tr>
<tr><td><code>order_id</code></td><td><code>lk_orders.order_id</code></td><td>İstekle gelir, varlığı kontrol edilir</td></tr>
<tr><td><code>customer_id</code></td><td><code>lk_orders.customer_id</code></td><td>İstekle gelmez, siparişten bulunur</td></tr>
<tr><td><code>tutar</code></td><td>hesaplanır, <code>ba_kupon.tutar</code></td><td>Karar tablosundan</td></tr>
<tr><td><code>son_kullanim</code></td><td>kaynak yok</td><td>Açık soru: tabloda alan yok, karar gerekli</td></tr></table>
<p>Son satır sözleşmeyi okumanın kazancıdır: API'de olan alanın tabloda karşılığı yok. Bunu geliştirme başlamadan yakalamak ucuzdur. Gerçek API'lerle Python'dan çalışmak istersen Kesit Python'daki BT İş Analisti yolunda HTTP dersi var.</p>`,
  ex: [
    mc('Müşterinin kuponlarını listeleyen uç (endpoint) hangi fiille tanımlanır?', ['POST', 'GET', 'DELETE', 'PATCH'], 1, 'Listelemek veri okur, hiçbir şeyi değiştirmez. GET bu iş içindir ve tekrarlanması güvenlidir.'),
    mc('Derste verilen JSON cevabında kuponun sahibini hangi alan söyler?', ['<code>order_id</code> alanı', '<code>kupon_id</code> alanı', '<code>para_birimi</code> alanı', '<code>customer_id</code> alanı'], 3, 'Sipariş numarası hangi sipariş için üretildiğini, customer_id ise kuponun kime ait olduğunu söyler. Sözleşmeyi okurken alan adını tahmin etme, tanımını sor.'),
    mc('İptal edilmiş bir sipariş için kupon istendi, istek biçimi doğru. Dersteki tabloya göre hangi kod uygun?', ['200 OK', '404 Not Found', '422 Unprocessable Content', '503 Service Unavailable'], 2, 'Sipariş var, istek düzgün, ama iş kuralı izin vermiyor. Ekibin başka bir kod seçmesi de mümkün; önemli olan sözleşmede yazılı olmasıdır.'),
    mc('Çağıran servis cevap alamayınca <code>POST /kuponlar</code> isteğini tekrarlıyor. Doğru gereksinim hangisi?', ['İkinci istek yeni kupon üretir, müşteri fazlasını kullanır', 'İkinci istek hata verir ve kupon akışı tamamen durur', 'Aynı sipariş için tekrar eden istek ilk kuponu döndürür', 'Çağıran servis hiçbir zaman yeniden deneme yapmamalıdır'], 2, 'Bu idempotency kuralıdır. Yeniden denemeyi yasaklamak geçici hatalarda müşteriyi kuponsuz bırakır.'),
    mc('Hangi hata yeniden denemeye en uygundur?', ['<code>400</code>: istek biçimi bozuk', '<code>403</code>: yetki yok', '<code>422</code>: iş kuralı uymuyor', '<code>503</code>: servis geçici yok'], 3, 'Geçici sunucu hatası sonra düzelebilir. Diğerlerinde aynı istek aynı sonucu verir; yeniden denemek yalnız yükü artırır.'),
    sq('Sözleşmedeki cevap tutuyor mu? 5045 numaralı sipariş için API\'nin döndürmesi gereken alanları veriden üret: <code>order_id</code>, <code>customer_id</code>, <code>tutar</code> (karar tablosu: 3.600 saniyeyi aşarsa 60, değilse 30). Derste verilen cevapla karşılaştır.', CTE + "SELECT order_id, customer_id, CASE WHEN sure_sn > 3600 THEN 60 ELSE 30 END AS tutar FROM t WHERE order_id = 5045;", 'Tek bir sipariş için CASE yeterli. Bulduğun tutar, dersteki JSON ile aynı mı?', { start: START }),
    sq('<code>GET /musteriler/162/kuponlar</code> ne döndürmeli? 162 numaralı müşterinin Aralık 2024\'te geç teslim aldığı siparişler: <code>order_id</code>, <code>tutar</code>, <code>teslim</code> (<code>delivered_at</code>). Sipariş numarasına göre sırala. Aylık sınırı henüz uygulama.', "SELECT order_id, CASE WHEN ROUND((julianday(delivered_at) - julianday(placed_at)) * 86400) > 3600 THEN 60 ELSE 30 END AS tutar, delivered_at AS teslim FROM lk_orders WHERE customer_id = 162 AND status = 'teslim' AND placed_at >= '2024-12-01' AND placed_at < '2025-01-01' AND ROUND((julianday(delivered_at) - julianday(placed_at)) * 86400) > 2700 ORDER BY order_id;", 'Süre ifadesini derste kutudan al. Dört satır çıkacak; aylık sınır 2 olduğu için bunun iki satırı aslında kupon almamalı, bunu kendine not et.', { ord: true }),
    sq('Aynı istek iki kez geldi. Başlangıç kodu boş kupon tablosunu kuruyor. 5045 numaralı sipariş için kuponu, <b>henüz yoksa</b> ekleyen <code>INSERT ... SELECT ... WHERE NOT EXISTS</code> ifadesini yaz ve iki kez çalıştır. Tabloda tek satır kalmalı. Tutar 30, müşteri 162.', "CREATE TABLE ba_kupon (order_id INT NOT NULL, customer_id INT NOT NULL, tutar DECIMAL(10, 2) NOT NULL); INSERT INTO ba_kupon (order_id, customer_id, tutar) SELECT order_id, customer_id, 30 FROM lk_orders o WHERE o.order_id = 5045 AND NOT EXISTS (SELECT 1 FROM ba_kupon k WHERE k.order_id = o.order_id); INSERT INTO ba_kupon (order_id, customer_id, tutar) SELECT order_id, customer_id, 30 FROM lk_orders o WHERE o.order_id = 5045 AND NOT EXISTS (SELECT 1 FROM ba_kupon k WHERE k.order_id = o.order_id);", 'Eklenecek satırı <code>lk_orders</code> tablosundan seç. WHERE içinde hem sipariş numarasını hem de kuponda aynı siparişin bulunmamasını iste. Aynı ifadeyi iki kez yaz.', { start: 'CREATE TABLE ba_kupon (order_id INT NOT NULL, customer_id INT NOT NULL, tutar DECIMAL(10, 2) NOT NULL);\n-- Aynı INSERT ifadesini iki kez yaz.\n', check: 'SELECT order_id, customer_id, tutar FROM ba_kupon', must: [{ re: '\\bNOT\\s+EXISTS\\b', msg: 'Görev tekrarı NOT EXISTS ile engellemeni istiyor.' }] }),
    sq('Entegrasyon kaydı (log) okuma. Başlangıç kodu <code>ba_api_log</code> tablosunu kuruyor. Durum koduna göre istek sayısı: <code>kod</code>, <code>adet</code>. Koda göre sırala.', LOG + 'SELECT kod, COUNT(*) AS adet FROM ba_api_log GROUP BY kod ORDER BY kod;', 'Basit bir gruplama; koda göre say ve sırala.', { start: LOG + '-- Sorgunu buraya yaz.\n', ord: true }),
    sq('Aynı kayıtta asıl soru: en az bir kez <code>500</code> almış ama hiç <code>201</code> ya da <code>200</code> alamamış, yani kuponu hâlâ üretilmemiş siparişler: <code>order_id</code>.', LOG + 'SELECT DISTINCT order_id FROM ba_api_log WHERE kod = 500 AND order_id NOT IN (SELECT order_id FROM ba_api_log WHERE kod IN (200, 201));', 'Önce başarılı olanları alt sorguyla listele. Sonra 500 alanlardan bu listede olmayanları seç. Bir sipariş birden çok kez geçebilir, tekrarı at.', { start: LOG + '-- Sorgunu buraya yaz.\n' })
  ] });

/* ---------- 7. UAT ---------- */
const TEST0 = `CREATE TABLE ba_test (
  senaryo     VARCHAR(30),
  status      VARCHAR(10),
  sure_sn     INT,
  aylik_kupon INT,
  beklenen    INT
);
INSERT INTO ba_test VALUES ('olumlu-30', 'teslim', 3000, 0, 30);
INSERT INTO ba_test VALUES ('olumlu-60', 'teslim', 4000, 0, 60);
INSERT INTO ba_test VALUES ('olumsuz-zamaninda', 'teslim', 1800, 0, 0);
INSERT INTO ba_test VALUES ('olumsuz-iptal', 'iptal', NULL, 0, 0);
INSERT INTO ba_test VALUES ('olumsuz-iade', 'iade', 4000, 0, 0);
`;
const TEST1 = TEST0 + `INSERT INTO ba_test VALUES ('sinir-2700', 'teslim', 2700, 0, 0);
INSERT INTO ba_test VALUES ('sinir-2701', 'teslim', 2701, 0, 30);
INSERT INTO ba_test VALUES ('sinir-3600', 'teslim', 3600, 0, 30);
INSERT INTO ba_test VALUES ('sinir-3601', 'teslim', 3601, 0, 60);
INSERT INTO ba_test VALUES ('aylik-sinir', 'teslim', 4000, 2, 0);
`;
const SONUC = `CREATE TABLE ba_sonuc (senaryo VARCHAR(30), gerceklesen INT);
INSERT INTO ba_sonuc VALUES ('olumlu-30', 30);
INSERT INTO ba_sonuc VALUES ('olumlu-60', 60);
INSERT INTO ba_sonuc VALUES ('olumsuz-zamaninda', 0);
INSERT INTO ba_sonuc VALUES ('olumsuz-iptal', 0);
INSERT INTO ba_sonuc VALUES ('olumsuz-iade', 60);
INSERT INTO ba_sonuc VALUES ('sinir-2700', 30);
INSERT INTO ba_sonuc VALUES ('sinir-2701', 30);
INSERT INTO ba_sonuc VALUES ('sinir-3600', 30);
INSERT INTO ba_sonuc VALUES ('sinir-3601', 60);
INSERT INTO ba_sonuc VALUES ('aylik-sinir', 60);
`;
const HATALI = `CREATE TABLE ba_kupon AS
SELECT order_id, customer_id,
       CASE WHEN ${SN} >= 3600 THEN 60 ELSE 30 END AS tutar
FROM lk_orders
WHERE status IN ('teslim', 'iade')
  AND placed_at >= '2024-12-02' AND placed_at < '2025-01-01'
  AND ${SN} >= 2700;
`;
const BEKLENEN = `WITH b AS (
  SELECT order_id,
         CASE WHEN ${SN} > 3600 THEN 60 ELSE 30 END AS tutar
  FROM lk_orders
  WHERE status = 'teslim'
    AND placed_at >= '2024-12-01' AND placed_at < '2025-01-01'
    AND ${SN} > 2700
)
`;
add({ id: 'ba-uat', lv: 'B1', min: 28,
  title: 'Kullanıcı kabul testi (UAT): senaryolar, test verisi, mutabakat, hata kaydı, onay',
  sum: 'Kabul kriterinden test senaryosuna, olumlu, olumsuz ve sınır durumları, SQL ile test verisi ve mutabakat, iyi hata kaydı, önem ve öncelik, UAT onayı.',
  en: 'uat user acceptance test scenario positive negative boundary test data reconciliation defect bug report severity priority sign-off kabul testi mutabakat hata kaydı',
  body: `<p>Geliştirici “bitti” dedi, sistem testi geçti. Sıra <b>kullanıcı kabul testinde</b> (UAT, user acceptance testing): iş birimi, sistemin kendi işini gerçekten çözüp çözmediğine karar verir. İş analisti çoğu ekipte senaryoları hazırlar, testi yürütür ve kararı destekler. Onayı iş birimi verir.</p>
<table><tr><th>Test</th><th>Soru</th><th>Kim?</th></tr>
<tr><td>Birim ve entegrasyon testi</td><td>Kod doğru çalışıyor mu?</td><td>Geliştirici</td></tr>
<tr><td>Sistem testi</td><td>Sistem gereksinimi karşılıyor mu?</td><td>Test uzmanı</td></tr>
<tr><td>UAT</td><td>Bu işi kabul ediyor muyuz?</td><td>İş birimi, iş analisti destekler</td></tr></table>
<h2>Kabul kriterinden senaryoya</h2>
<p>Her kabul kriteri en az bir senaryo olur. Üç tür düşün:</p>
<ul><li><b>Olumlu</b> (positive): kural işlemeli. 3.000 saniyelik teslimat 30 TL alır.</li>
<li><b>Olumsuz</b> (negative): sistem bir şey yapmamalı. İptal edilen sipariş kupon almaz.</li>
<li><b>Sınır</b> (boundary): hatalar en çok sınırda çıkar. 2.700, 2.701, 3.600, 3.601.</li></ul>
<table><tr><th>Senaryo</th><th>Durum</th><th>Süre</th><th>Bu ayki kupon</th><th>Beklenen</th></tr>
<tr><td>olumlu-30</td><td>teslim</td><td>3.000</td><td>0</td><td>30</td></tr>
<tr><td>olumsuz-iptal</td><td>iptal</td><td>boş</td><td>0</td><td>0</td></tr>
<tr><td>sinir-2700</td><td>teslim</td><td>2.700</td><td>0</td><td>0</td></tr>
<tr><td>sinir-2701</td><td>teslim</td><td>2.701</td><td>0</td><td>30</td></tr>
<tr><td>aylik-sinir</td><td>teslim</td><td>4.000</td><td>2</td><td>0</td></tr></table>
<h2>Test verisi</h2>
<p>Sınır durumu canlı veride her zaman bulunmaz. Test ortamında kendi verini kurarsın. Kişisel veri içeren canlı kaydı test ortamına kopyalama; gerekirse maskele (<b>KVKK</b> dersi isteğe bağlı bölümde). Burada test verisini küçük bir tablo olarak tutuyoruz:</p>
${box(TEST1 + `SELECT senaryo, status, sure_sn, aylik_kupon, beklenen FROM ba_test ORDER BY senaryo;`)}
<p>Kuralı SQL ile yazıp her senaryoda sonucu karşılaştırmak, geliştiriciden bağımsız ikinci bir hesap demektir. Boş dönen fark sorgusu testin geçtiğini gösterir; bu <b>Veri kalitesi</b> ve <b>SQL kodunu test etmek</b> derslerindeki “hata varsa satır döndür” kalıbıdır.</p>
<h2>Mutabakat (reconciliation)</h2>
<p>Test verisi kuralı sınar, mutabakat işi sınar: gerçek dönem verisinde üretilen kuponlar beklenenle aynı mı? Bağımsız bir “beklenen” listesi kur, sonra üç soru sor: fazla kim, eksik kim, tutarı farklı kim?</p>
${box(BEKLENEN + `SELECT COUNT(*) AS beklenen_kupon, SUM(tutar) AS beklenen_tutar FROM b;`)}
<p>Alıştırmalarda hatalı bir kupon işinin çıktısını bu listeyle karşılaştırıp hataları bulacaksın.</p>
<h2>İyi hata kaydı (defect report)</h2>
<p>Hata kaydını okuyan, sana sormadan hatayı yeniden üretebilmeli.</p>
${nor(`Başlık: Tam 2.700 saniyelik teslimata 30 TL kupon üretiliyor
Ortam: UAT, sürüm 1.4.0, 12.03 tarihli veri
Adımlar:
  1. Teslim süresi tam 2.700 saniye olan sipariş oluştur (test kaydı: sinir-2700)
  2. Kupon işini çalıştır
  3. ba_kupon tablosunu sipariş numarasıyla sorgula
Beklenen: Kupon yok (Kural K2: "aşan" sınırı dahil etmez; GRS-04)
Gerçekleşen: 30 TL kupon oluştu
Etki: Dönem verisine göre birkaç sipariş; tutar etkisi küçük ama kural yanlış
Ek: Sorgu ve ekran görüntüsü`)}
<p>“Kupon çalışmıyor” başlığı hata kaydı değildir. Yorum yazma, gözlem yaz. Gereksinim numarasına bağla: bu izlenebilirlik (traceability) sayesinde hangi kuralın test edildiği belli olur.</p>
<h2>Önem ve öncelik (severity, priority)</h2>
<p><b>Önem</b> hatanın sistem üzerindeki etkisidir, teknik olarak değerlendirilir. <b>Öncelik</b> ne zaman düzeltileceğidir, iş kararıdır. İkisi farklı şeydir.</p>
<table><tr><th>Örnek</th><th>Önem</th><th>Öncelik</th></tr>
<tr><td>Kupon işi her gece duruyor</td><td>yüksek</td><td>yüksek</td></tr>
<tr><td>Bildirim metninde şirket adı yanlış</td><td>düşük</td><td>yüksek</td></tr>
<tr><td>Yılda bir kez çalışan arşiv raporu hata veriyor</td><td>yüksek</td><td>düşük</td></tr></table>
<h2>Onay (UAT sign-off)</h2>
<p>Onay kapısı baştan yazılır, test bitince tartışılmaz. Örnek çıkış ölçütü: bütün senaryolar çalıştı, yüksek önemli açık hata yok, açık kalan düşük hatalar sahibi ve tarihiyle listelendi, mutabakat farkı sıfır. Onayı veren kişi iş birimidir, belge kayıt altına alınır. Şartlı onay da mümkündür: “şu iki hata ilk haftada kapanacak” yazılır.</p>`,
  ex: [
    sq('Başlangıç kodu <code>ba_test</code> tablosuna beş senaryo koyuyor. Sınırları sen ekle: <code>sinir-2700</code> (teslim, 2700 saniye, aylık kupon 0, beklenen 0) ve <code>sinir-2701</code> (teslim, 2701 saniye, aylık kupon 0, beklenen 30).', TEST0 + "INSERT INTO ba_test VALUES ('sinir-2700', 'teslim', 2700, 0, 0); INSERT INTO ba_test VALUES ('sinir-2701', 'teslim', 2701, 0, 30);", 'Başlangıç kodundaki INSERT satırlarının kalıbını kullan. Metin değerler tek tırnaklı, sayılar tırnaksız.', { start: TEST0 + '-- İki sınır senaryosunu buraya ekle.\n', check: 'SELECT senaryo, status, sure_sn, aylik_kupon, beklenen FROM ba_test' }),
    sq('Başlangıç kodu on senaryoyu (<code>ba_test</code>) ve kupon işinin çıktısını (<code>ba_sonuc</code>) kuruyor. Beklenenle gerçekleşenin <b>farklı</b> olduğu senaryoları bul: <code>senaryo</code>, <code>beklenen</code>, <code>gerceklesen</code>. Senaryoya göre sırala.', TEST1 + SONUC + 'SELECT t.senaryo, t.beklenen, s.gerceklesen FROM ba_test t JOIN ba_sonuc s ON s.senaryo = t.senaryo WHERE t.beklenen <> s.gerceklesen ORDER BY t.senaryo;', 'İki tabloyu senaryo adıyla bağla ve eşit olmayanları süz.', { start: TEST1 + SONUC + '-- Fark sorgusunu buraya yaz.\n', ord: true }),
    sq('Bağımsız ikinci hesap. Kuralı sen yaz: durum teslim değilse ya da aylık kupon 2 ve üzeriyse 0, süre 3.600\'ü aşıyorsa 60, 2.700\'ü aşıyorsa 30, diğerlerinde 0. Kurala göre sonucu <code>beklenen</code> ile uyuşmayan senaryo sayısı: <code>hata</code>. Doğru yazdıysan 0 çıkmalı.', TEST1 + "SELECT COUNT(*) AS hata FROM ba_test WHERE beklenen <> CASE WHEN status <> 'teslim' OR aylik_kupon >= 2 THEN 0 WHEN sure_sn > 3600 THEN 60 WHEN sure_sn > 2700 THEN 30 ELSE 0 END;", 'CASE ifadesi WHERE içinde karşılaştırmanın bir tarafı olabilir. Koşulları karar tablosundaki sırayla yaz; en kısıtlayıcı en başta. Boş süre hiçbir sınırı aşmaz.', { start: TEST1 + '-- Kuralı yazıp sonucu karşılaştır.\n', must: [{ re: '\\bCASE\\b', msg: 'Kuralı CASE ile yaz.' }, { re: '\\bWHERE\\b', msg: 'Uyuşmayan satırları WHERE ile süz.' }] }),
    sq('Canlı benzeri veride mutabakat. Başlangıç kodu hatalı bir işin Aralık çıktısını (<code>ba_kupon</code>) üretiyor, <code>b</code> ise beklenen kupon listesi. <code>b</code> listesinde olmayan, yani <b>fazladan</b> üretilmiş kupon sayısı: <code>fazla</code>.', HATALI + BEKLENEN + "SELECT COUNT(*) AS fazla FROM ba_kupon k LEFT JOIN b ON b.order_id = k.order_id WHERE b.order_id IS NULL;", 'Eşi olmayanı bulma kalıbı: kupon tablosu solda, beklenen sağda. Sağ anahtarı boş olanları say.', { start: HATALI + BEKLENEN + '-- Sorgunu buraya yaz.\n' }),
    sq('Aynı veride ters yön: beklendiği hâlde üretilmemiş, yani <b>eksik</b> kupon sayısı: <code>eksik</code>.', HATALI + BEKLENEN + "SELECT COUNT(*) AS eksik FROM b LEFT JOIN ba_kupon k ON k.order_id = b.order_id WHERE k.order_id IS NULL;", 'Bir öncekinin aynası: bu sefer beklenen liste solda.', { start: HATALI + BEKLENEN + '-- Sorgunu buraya yaz.\n' }),
    sq('İki listede de olup tutarı farklı olan kupon sayısı: <code>tutar_farkli</code>. Sonra başlangıç kodundaki işe bak ve hataların nedenini kendin söyle: fazla, eksik ve tutar farkı hangi koşuldan geliyor?', HATALI + BEKLENEN + "SELECT COUNT(*) AS tutar_farkli FROM ba_kupon k JOIN b ON b.order_id = k.order_id WHERE k.tutar <> b.tutar;", 'Bu sefer eşleşenler gerekli, normal JOIN yeterli. Tutarlar eşit olmayanları say.', { start: HATALI + BEKLENEN + '-- Sorgunu buraya yaz.\n' }),
    mc('Bildirim metninde şirket adı yanlış yazılmış. Kupon doğru oluşuyor. En olası sınıflandırma hangisi?', ['Önem yüksek, öncelik düşük', 'Önem düşük, öncelik yüksek', 'Önem yüksek, öncelik yüksek', 'Önem düşük, öncelik düşük'], 1, 'Sistem çalışıyor, teknik etki düşük. Ama müşterinin gördüğü bir metin olduğu için çabuk düzeltilmesi istenir. Öncelik iş kararıdır.'),
    mc('Hangisi iyi bir hata başlığıdır?', ['Kupon çalışmıyor, acil bakılsın', 'Geçen haftadan beri sistem çok tuhaf', 'Tam 2.700 saniyede 30 TL kupon üretiliyor', 'Geliştirici sınırı yanlış kodlamış olabilir'], 2, 'İyi başlık gözlemi ve koşulu söyler. Suçlu ya da kök neden tahmini, hatayı yeniden üretmeye yardım etmez.'),
    mc('Teslim süresi kuralı için en az hangi değerler sınanmalı?', ['1.000 ve 5.000 saniye', '2.700 ve 3.600 saniye', 'Yalnız 3.000 saniye', 'Her iki sınırın iki yanı'], 3, 'Sınırın iki tarafını da denemek gerekir. Yalnız sınır değeri denersen “aşan” ile “ve üzeri” hatasının bir tarafını kaçırabilirsin.'),
    mc('UAT\'de iş birimi “şu ek rapor da olsun” diyor. Bu istek gereksinimde yok. Ne yaparsın?', ['Değişiklik talebi açar, etkisini tartıştırırsın', 'Hata kaydı açıp geliştiriciye bugün düzelttirirsin', 'İstek UAT\'de geldiği için doğrudan kapsama eklersin', 'Yazılı olmadığı için hiçbir kayıt tutmadan reddedersin'], 0, 'Eksik gereksinim ile yeni istek farklıdır. Değişiklik talebi kapsam, süre ve önceliği görünür tartıştırır; sessizce eklemek sürümü riske atar.'),
    mc('UAT onayını kim verir?', ['Testi yürüttüğü için iş analisti', 'Kodu bildiği için geliştirici', 'İşi kabul edecek olan iş birimi', 'Hataları kapattığı için test uzmanı'], 2, 'İş analisti kanıtı hazırlar ve görüş bildirir, ama sistemin işi çözdüğünü kabul eden taraf iş birimidir.')
  ] });

/* ---------- 8. Canlıya geçiş ---------- */
const KUPON = `CREATE TABLE ba_kupon AS
SELECT o.order_id, o.customer_id, o.status,
       CASE WHEN ${SN} > 3600 THEN 60 ELSE 30 END AS tutar
FROM lk_orders o
WHERE o.status = 'teslim'
  AND o.placed_at >= '2024-12-01' AND o.placed_at < '2025-01-01'
  AND ${SN} > 2700;
`;
add({ id: 'ba-canli', lv: 'B1', min: 28,
  title: 'Canlıya geçiş (go-live) ve sonrası: geçiş planı, duman testi, KPI, geri alma, kapanış',
  sum: 'Geçiş kontrol listesi, SQL ile duman testi, önce-sonra KPI, geri alma ölçütleri, Jira ve Confluence akışı, değişiklik yönetimi, mini BRD.',
  en: 'go-live cutover smoke test rollback kpi before after jira confluence change management brd business requirements document definition of done geçiş duman testi geri alma',
  body: `<p>UAT onaylandı. Canlıya geçiş bir düğme değil, sırası önceden yazılmış bir plandır. İş analisti kodu yayına almaz, ama işin canlıda doğru çalıştığını gösteren kanıtı hazırlar.</p>
<h2>Geçiş planı (cutover checklist)</h2>
<table><tr><th>Ne zaman?</th><th>Madde</th><th>Sahibi</th></tr>
<tr><td>Önce</td><td>UAT onayı ve açık hata listesi kayıtlı</td><td>BA, iş birimi</td></tr>
<tr><td>Önce</td><td>Destek ekibine metin ve yönlendirme iletildi</td><td>BA</td></tr>
<tr><td>Önce</td><td>Tutar ve sınır ayarları kontrol edildi, bütçe onayı var</td><td>Finans, BA</td></tr>
<tr><td>Önce</td><td>Geri alma adımları yazıldı ve denendi</td><td>Geliştirici</td></tr>
<tr><td>Sırasında</td><td>Yayına alma, özellik anahtarı açma (önce küçük pilot)</td><td>Geliştirici</td></tr>
<tr><td>Hemen sonra</td><td>Duman testleri çalıştı, sonuç sıfır hata</td><td>BA, test uzmanı</td></tr>
<tr><td>İlk hafta</td><td>Günlük KPI ve bütçe takibi</td><td>BA</td></tr></table>
<h2>Duman testi (smoke test) SQL ile</h2>
<p>Duman testi, “ayakta mı, en kritik şey doğru mu?” diye bakan kısa kontroldür. Bütün testlerin yerine geçmez. Yine “hata varsa sayı döner” kalıbı:</p>
${box(KUPON + `SELECT 'teslim_disi_kupon' AS test, COUNT(*) AS hata FROM ba_kupon WHERE status <> 'teslim'
UNION ALL
SELECT 'tutar_gecersiz', COUNT(*) FROM ba_kupon WHERE tutar NOT IN (30, 60)
UNION ALL
SELECT 'tekrar_eden', COUNT(*) FROM (SELECT order_id FROM ba_kupon GROUP BY order_id HAVING COUNT(*) > 1) AS x;`)}
<h2>Önce ve sonra</h2>
<p>Başarı ölçüsü talep aşamasında yazılmıştı: kuponun geçerli olduğu dönemde destek şikâyeti ve müşteri puanı nasıl değişti? Kupon verimizde gerçekten olmadığı için burada yalnız yöntemi gösteriyoruz: canlıya geçişi 1 Aralık 2024 varsayıyoruz.</p>
${box(CTE + `SELECT strftime('%Y-%m', placed_at) AS ay,
       COUNT(*) AS teslim,
       SUM(CASE WHEN sure_sn > 2700 THEN 1 ELSE 0 END) AS gec,
       SUM(CASE WHEN sure_sn > 3600 THEN 60 WHEN sure_sn > 2700 THEN 30 ELSE 0 END) AS kupon_tutar
FROM t
WHERE status = 'teslim'
GROUP BY strftime('%Y-%m', placed_at)
ORDER BY ay;`)}
<div class="warn"><b>Önce-sonra kanıt değildir</b>Kasım'da ${f(N.kasimGec)}, Aralık'ta ${f(N.aralikGec)} geç teslim var. Oran %${N.kasimOran}'dan %${N.aralikOran}'e çıkmış. Bu fark kuponla ilgili olamaz, çünkü veride kupon yok; sipariş hacmi ve mevsim değişmiş. Gerçek işte de “kupon geldi, puan yükseldi” demek için pilot grup ile karşılaştırma ister. Elinde yalnız önce-sonra varsa bunu açıkça yaz.</div>
<h2>Geri alma ölçütleri (rollback criteria)</h2>
<p>Geri alma kararı, sorun çıktığında değil, önceden yazılır. Baskı altında “biraz daha bekleyelim” denmesini önler. Eşikleri geçmiş veriye dayandır: Aralık'ta bir günde en çok ${f(N.aralikZirve)} geç teslim olmuş.</p>
<table><tr><th>Ölçüt</th><th>Eşik</th><th>Karar</th></tr>
<tr><td>Teslim dışı siparişe kupon</td><td>1 kayıt bile</td><td>Özelliği kapat, inceleme başlat</td></tr>
<tr><td>Bir günde üretilen kupon</td><td>100'ü aşarsa (geçmiş zirvenin yaklaşık iki katı)</td><td>Özelliği kapat, iş birimine bildir</td></tr>
<tr><td>Aylık kupon tutarı</td><td>Onaylı bütçeyi aşarsa</td><td>Finans kararına kadar durdur</td></tr>
<tr><td>Bildirim gönderilemeyen kupon</td><td>%5'i aşarsa</td><td>Kupon kalır, bildirim düzeltilir</td></tr></table>
<p>Geri almak yalnız kodu geri çekmek değildir: verilmiş kuponlar ne olacak? Bunu da yaz. Çoğu durumda müşteriye verilen kupon geri alınmaz. Eşikler bu senaryo için önerimizdir; senin projende iş birimi ve finans belirler.</p>
<h2>Jira ve Confluence: işin izi</h2>
<p>Birçok ekip iş takibi için Jira, doküman için Confluence kullanır. Araç başka olabilir, mantık aynıdır.</p>
<table><tr><th>Nerede?</th><th>Ne durur?</th></tr>
<tr><td>Epik (epic)</td><td>Geç teslim telafi kuponu: bütün iş</td></tr>
<tr><td>Hikâye (story)</td><td>Geç teslimde kupon üret; kuponu bildir; kupon raporu. Kabul kriterleri içinde</td></tr>
<tr><td>Hata (bug)</td><td>UAT ve canlı hataları, hikâyeye bağlı</td></tr>
<tr><td>Doküman sayfası</td><td>BRD, karar tablosu, süreç şeması, toplantı kararları; hikâyelere bağlantılı</td></tr>
<tr><td>Durum akışı</td><td>Yapılacak → Geliştiriliyor → Testte → UAT → Bitti</td></tr></table>
<p>“Bitti”nin tanımı (definition of done) yazılı olsun: kod gözden geçirildi, testler geçti, doküman güncellendi. Tutarı değiştiren bir karar yalnız bir toplantıda ya da mesajda kalırsa altı ay sonra kimse nedenini bilemez.</p>
<h2>Değişiklik yönetimi (change management)</h2>
<p>Yazılım çalışsa da insanlar eski yolu sürdürebilir. Destek çalışanı elle kupon vermeye devam ederse müşteri iki kupon alır. Kime ne değişiyor, kim ne zaman bilgilendirilecek, sorular kime gidecek: bunları tek sayfada topla. Destek ekibine örnek cevaplar hazırla.</p>
<h2>Mini BRD</h2>
<p>Her şey bir araya geldi. Şablon olarak kullanabileceğin kısa BRD:</p>
<table><tr><th>Bölüm</th><th>İçerik</th></tr>
<tr><td>1. Özet ve sorun</td><td>Dönemde teslim edilen ${f(N.q4Teslim)} siparişin ${f(N.q4Gec)} tanesi 45 dakikayı aşıyor. Geç teslimlerde kurye puanı ${N.puanGec}, diğerlerinde ${N.puanZaman}. Bugün telafi elle ve kişiye göre yapılıyor.</td></tr>
<tr><td>2. Amaç ve başarı ölçüsü</td><td>Geç teslim alan müşterinin 5 dakika içinde kupon alması, bu konudaki destek taleplerinin azalması. Yeniden sipariş artışı garanti edilmiyor; pilotla ölçülecek.</td></tr>
<tr><td>3. Kapsam</td><td>İçi: süre hesabı, kupon, bildirim, rapor. Dışı: kurye ve restoran iyileştirmeleri, restorana kesinti.</td></tr>
<tr><td>4. Paydaşlar ve RACI</td><td>Müşteri hizmetleri (talep sahibi), operasyon, finans, geliştirme, test.</td></tr>
<tr><td>5. İş kuralları</td><td>Yalnız “teslim”. Süre saniye ile, sipariş zamanından teslime. 2.700 saniyeyi aşan 30 TL, 3.600 saniyeyi aşan 60 TL. Sipariş başına bir, ayda en çok iki kupon. Karar tablosu ekte.</td></tr>
<tr><td>6. Gereksinimler</td><td>GRS-01...: işlevsel. NFR-01: kupon en geç 5 dakikada. Kullanıcı hikâyeleri ve kabul kriterleri.</td></tr>
<tr><td>7. Süreç ve veri</td><td>TO-BE şeması, sıra diyagramı, alan eşleme, API sözleşmesi bağlantısı.</td></tr>
<tr><td>8. Varsayım ve riskler</td><td>Müşteriye söz verilen süre verisi yok, 45 dakika varsayımdır. Tutar bedeli üst sınırda ${f(N.maliyet)} TL. Kuponun getirisi kanıtlı değil.</td></tr>
<tr><td>9. Test ve kabul</td><td>Senaryo listesi, mutabakat sorguları, çıkış ölçütü.</td></tr>
<tr><td>10. Geçiş ve kapanış</td><td>Geçiş planı, geri alma ölçütleri, ilk ay raporu, kapanış tarihi.</td></tr></table>
<p>BRD'deki sayılar elle yazılmaz, tekrar üretilebilir sorgudan gelir. Aşağıdaki sorgu 1. ve 8. bölümlerin sayılarını verir. Bir yıl sonra biri “bu sayı nereden çıktı?” diye sorduğunda cevabın budur.</p>
${box(CTE + `SELECT 'teslim' AS olcu, COUNT(*) AS deger FROM t WHERE status = 'teslim'
UNION ALL
SELECT 'gec', COUNT(*) FROM t WHERE status = 'teslim' AND sure_sn > 2700
UNION ALL
SELECT 'ust_sinir_tutar', SUM(CASE WHEN sure_sn > 3600 THEN 60 ELSE 30 END) FROM t WHERE status = 'teslim' AND sure_sn > 2700
UNION ALL
SELECT 'etkilenen_musteri', COUNT(DISTINCT customer_id) FROM t WHERE status = 'teslim' AND sure_sn > 2700;`)}
<p>İşin kapanışı: ilk ay raporu sunulur, açık konular sahiplerine devredilir, doküman son hâliyle bırakılır, “ne öğrendik?” toplantısı yapılır. Sonraki talep büyük ihtimalle bu kuponun başka bir yönüyle gelir. Bitirme projesinde tam olarak bunu yapacaksın.</p>`,
  ex: [
    sq('Duman testi. Başlangıç kodu Aralık kuponlarını üretiyor. Tek raporda üç test: <code>teslim_disi_kupon</code> (durum teslim değil), <code>tutar_gecersiz</code> (tutar 30 ya da 60 değil), <code>bos_musteri</code> (müşteri boş). Sütunlar: <code>test</code>, <code>hata</code>.', KUPON + "SELECT 'teslim_disi_kupon' AS test, COUNT(*) AS hata FROM ba_kupon WHERE status <> 'teslim' UNION ALL SELECT 'tutar_gecersiz', COUNT(*) FROM ba_kupon WHERE tutar NOT IN (30, 60) UNION ALL SELECT 'bos_musteri', COUNT(*) FROM ba_kupon WHERE customer_id IS NULL;", 'Her test ayrı bir SELECT; ilk sütun testin adı olan sabit metin. Sonuçları küme işlemiyle alt alta koy. Tekrarları yok saymayan biçimi kullan.', { start: KUPON + '-- Testleri buraya yaz.\n', must: [{ re: '\\bUNION\\s+ALL\\b', msg: 'Testleri UNION ALL ile tek raporda birleştir.' }] }),
    sq('Önce ve sonra: Kasım ve Aralık 2024 için teslim sayısı, geç sayısı ve geç oranı (yüzde, 1 basamak): <code>ay</code>, <code>teslim</code>, <code>gec</code>, <code>oran</code>. Aya göre sırala.', CTE + "SELECT strftime('%Y-%m', placed_at) AS ay, COUNT(*) AS teslim, SUM(CASE WHEN sure_sn > 2700 THEN 1 ELSE 0 END) AS gec, ROUND(100.0 * SUM(CASE WHEN sure_sn > 2700 THEN 1 ELSE 0 END) / COUNT(*), 1) AS oran FROM t WHERE status = 'teslim' AND placed_at >= '2024-11-01' GROUP BY strftime('%Y-%m', placed_at) ORDER BY ay;", 'Dönem <code>t</code> içinde Ekim\'den başlıyor; WHERE ile Kasım başına çek. Oran kalıbını ba-talep dersinden hatırla.', { start: START, ord: true }),
    sq('Memnuniyet KPI\'ı: Kasım ve Aralık 2024\'te teslim edilip puanlanan siparişlerde ortalama kurye puanı (2 basamak) ve puan sayısı: <code>ay</code>, <code>ort_puan</code>, <code>puan_sayisi</code>. Aya göre sırala.', "SELECT strftime('%Y-%m', o.placed_at) AS ay, ROUND(AVG(r.courier_score), 2) AS ort_puan, COUNT(*) AS puan_sayisi FROM lk_orders o JOIN lk_ratings r ON r.order_id = o.order_id WHERE o.status = 'teslim' AND o.placed_at >= '2024-11-01' AND o.placed_at < '2025-01-01' GROUP BY strftime('%Y-%m', o.placed_at) ORDER BY ay;", 'Puanlar ayrı tabloda; siparişle bağla. Puansız siparişler ortalamaya girmesin, bu yüzden normal JOIN yeterli.', { ord: true }),
    sq('Bütçe takibi. Aylık kupon tutarını hesapla, onaylı aylık bütçe 18.000 TL. <code>ay</code>, <code>tutar</code>, <code>durum</code> (bütçeyi aşıyorsa \'aşım\', aşmıyorsa \'uygun\'). Aya göre sırala.', CTE + ", a AS (SELECT strftime('%Y-%m', placed_at) AS ay, SUM(CASE WHEN sure_sn > 3600 THEN 60 ELSE 30 END) AS tutar FROM t WHERE status = 'teslim' AND sure_sn > 2700 GROUP BY strftime('%Y-%m', placed_at)) SELECT ay, tutar, CASE WHEN tutar > 18000 THEN 'aşım' ELSE 'uygun' END AS durum FROM a ORDER BY ay;", 'Önce aylık toplamı ikinci bir CTE ile hesapla. Dış sorguda bu toplamı bütçeyle karşılaştıran bir CASE yaz.', { start: CTE + '-- t\'nin arkasına virgülle aylık toplamı veren ikinci bir CTE ekle.\n', ord: true }),
    sq('Geri alma eşiği için geçmişe bak: Aralık 2024\'te en çok geç teslim olan 3 gün: <code>gun</code>, <code>gec</code>. Geç sayısına göre azalan, eşitlikte güne göre sırala.', CTE + "SELECT date(placed_at) AS gun, COUNT(*) AS gec FROM t WHERE status = 'teslim' AND sure_sn > 2700 AND placed_at >= '2024-12-01' GROUP BY date(placed_at) ORDER BY gec DESC, gun LIMIT 3;", 'Sipariş zamanından günü çıkaran tarih fonksiyonunu kullan ve aynı ifadeye göre grupla. Sıralamadan sonra üç satır al.', { start: START, ord: true }),
    sq('Mini BRD\'nin kanıt sorgusu. Tek raporda dört ölçü: <code>teslim</code>, <code>gec</code>, <code>ust_sinir_tutar</code>, <code>etkilenen_musteri</code> (kuponu hak eden farklı müşteri). Sütunlar: <code>olcu</code>, <code>deger</code>.', CTE + "SELECT 'teslim' AS olcu, COUNT(*) AS deger FROM t WHERE status = 'teslim' UNION ALL SELECT 'gec', COUNT(*) FROM t WHERE status = 'teslim' AND sure_sn > 2700 UNION ALL SELECT 'ust_sinir_tutar', SUM(CASE WHEN sure_sn > 3600 THEN 60 ELSE 30 END) FROM t WHERE status = 'teslim' AND sure_sn > 2700 UNION ALL SELECT 'etkilenen_musteri', COUNT(DISTINCT customer_id) FROM t WHERE status = 'teslim' AND sure_sn > 2700;", 'Her ölçü ayrı bir SELECT. Farklı müşteriyi saymak için toplama fonksiyonunun içinde tekrarları at.', { start: START }),
    mc('Duman testi için en doğru tanım hangisi?', ['Bütün senaryoların yeniden çalıştırıldığı tam regresyon', 'Geçişten hemen sonra en kritik işlerin kısa kontrolü', 'İş biriminin sistemi kabul ettiği resmî onay toplantısı', 'Performansın yük altında ölçüldüğü uzun süreli sınama'], 1, 'Duman testi kısa ve seçicidir: ayakta mı, en kritik kural doğru mu? Tam test ve UAT yerine geçmez.'),
    mc('Geri alma ölçütleri ne zaman yazılmalı?', ['Canlıda sorun çıktıktan sonra, duruma göre', 'İlk ay raporu tamamlandıktan sonra', 'Canlıya geçmeden önce, planla birlikte', 'Yalnız bütçe aşılırsa, finansın talebiyle'], 2, 'Baskı altında karar vermek zordur. Önceden yazılı eşik, “biraz daha bekleyelim” tartışmasını keser.'),
    mc('Canlıya geçtikten sonra destek çalışanları elle kupon vermeye devam ediyor. Bu hangi konuda bir eksikliktir?', ['Değişiklik yönetimi', 'Veri göçü', 'Sıra diyagramı', 'Sınır değer testi ve sistem testi'], 0, 'Sistem doğru çalışıyor, ama insanların süreci değişmemiş. Eğitim, yönlendirme ve eski yolun kapatılması bu işin parçasıdır.'),
    mc('Kupon tutarını değiştiren karar bir toplantıda alındı. İş analisti olarak ne yaparsın?', ['Geliştiriciye sözlü iletmek yeterlidir, kodda görünür', 'BRD ve hikâyeyi günceller, kararı sahibiyle yazarsın', 'Sonraki sürüme kadar bekler, o zaman dokümana eklersin', 'Toplantı notu sende kalır, gerekirse hatırlatırsın'], 1, 'İzlenebilirlik (traceability) böyle sağlanır. Kod ne yapıldığını söyler, ama neden yapıldığını ve kimin karar verdiğini doküman söyler.'),
    mc('Aralık\'ta geç oranı Kasım\'dan yüksek çıktı. Kupon Aralık başında açılmış olsaydı en dürüst yorum hangisi olurdu?', ['Kupon teslimatları yavaşlattı, kapatılmalı', 'Kupon işe yaramadı, çünkü oran yükseldi', 'Oran değişimi kuponu kanıtlar, başka analiz gerekmez', 'Önce-sonra yetmez, karşılaştırma grubu gerekir'], 3, 'Aynı dönemde hacim ve mevsim de değişiyor. Kuponun etkisini ayırmak için karşılaştırma grubu gerekir.')
  ] });

/* ---------- Bitirme projesi ---------- */
const KOST = `WITH k AS (
  SELECT order_id, restaurant_id,
         ROUND((julianday(picked_at) - julianday(placed_at)) * 86400) AS hazirlik_sn,
         CASE WHEN ${SN} > 3600 THEN 60 ELSE 30 END AS tutar
  FROM lk_orders
  WHERE status = 'teslim' AND placed_at >= '2024-10-01' AND placed_at < '2025-01-01'
    AND ${SN} > 2700
)
`;
const KTAB = `CREATE TABLE ba_k AS
SELECT order_id, restaurant_id,
       ROUND((julianday(picked_at) - julianday(placed_at)) * 86400) AS hazirlik_sn,
       CASE WHEN ${SN} > 3600 THEN 60 ELSE 30 END AS tutar
FROM lk_orders
WHERE status = 'teslim' AND placed_at >= '2024-10-01' AND placed_at < '2025-01-01'
  AND ${SN} > 2700;
CREATE TABLE ba_kesinti (order_id INT NOT NULL, restaurant_id INT NOT NULL, tutar DECIMAL(10, 2) NOT NULL);
`;
const KYUK = "INSERT INTO ba_kesinti (order_id, restaurant_id, tutar) SELECT order_id, restaurant_id, tutar FROM ba_k WHERE hazirlik_sn > 1500;";
const KTEST = `CREATE TABLE ba_test2 (senaryo VARCHAR(20), hazirlik_sn INT, beklenen VARCHAR(10));
INSERT INTO ba_test2 VALUES ('kisa', 600, 'platform');
INSERT INTO ba_test2 VALUES ('sinir-1500', 1500, 'platform');
INSERT INTO ba_test2 VALUES ('sinir-1501', 1501, 'restoran');
INSERT INTO ba_test2 VALUES ('uzun', 2400, 'restoran');
`;
add({ id: 'proje-is-analisti', lv: 'B2', mod: 'Bitirme Projeleri', min: 60,
  title: 'Bitirme projesi (BT İş Analisti): kupon bedelini kim karşılayacak?',
  sum: 'Finansın değişiklik talebini baştan sona götür: boyut, kural, test, yükleme, mutabakat, komisyon etkisi ve BRD özeti.',
  en: 'capstone brd change request business analyst reconciliation bitirme iş analisti',
  body: `<h2>Senaryo</h2>
<p>Kupon canlıda. Finans müdürü yeni bir değişiklik talebi (change request) yazıyor: <i>“Gecikme restorandan kaynaklanıyorsa kuponun bedelini biz değil restoran karşılasın. Hazırlık süresi uzunsa bedeli restoranın komisyon ödemesinden düşelim.”</i> Kuralı ve kanıtı sen hazırlayacaksın.</p>
<div class="note"><b>Brif: Finans müdürü</b>“Yönetim kuruluna tek sayfa götüreceğim. Kaç lira restorana yansır, platformda ne kalır, hangi restoran bundan en çok etkilenir? Sayıları tekrar üretebileyim. Sözleşme konusunu hukukla sen koordine et.”</div>
<h2>Teslim edilecekler</h2>
<ol><li>Sorumluluk kuralı ve talebin boyutu</li><li>Sınır durumları ve kenar kontroller</li><li>Kural testi</li><li>Kesinti tablosunun yüklenmesi</li><li>Mutabakat</li><li>Restoran etkisi</li><li>Tek sayfalık BRD eki için kanıt sorgusu</li></ol>
<h3>Çalışma planı</h3>
<ol>
<li><b>Tanımı yaz.</b> Çalışma tanımı: hazırlık (sipariş → kuryenin alışı) 25 dakikayı (1.500 saniye) <b>aşıyorsa</b> restoran sorumlu, aşmıyorsa platform. Eşiği görüşmede sınayacaksın; önerdiğin rakamın sonucunu gösterirsen tartışma somutlaşır.</li>
<li><b>Boyutlandır.</b> Dönem aynı: Ekim-Aralık 2024. Kupon listesi aynı karar tablosundan gelir. Aylık sınırı bu projede uygulamıyoruz; üst sınır hesabı yapıyoruz ve bunu BRD'ye varsayım olarak yazıyoruz.</li>
<li><b>Kenarları bul.</b> Tam sınırdaki kayıtlar kimde kalıyor? Hazırlık süresi hesaplanamayan kayıt var mı?</li>
<li><b>Test et, yükle, doğrula.</b> Önce küçük test tablosu, sonra gerçek yükleme, sonra mutabakat.</li>
<li><b>Etkiyi söyle.</b> Bir restoranın toplam kesintisi, ona ödenecek komisyon gelirine göre ne kadar? Dikkat: sipariş satırlarıyla birleştirince kupon tutarları çoğalır.</li>
</ol>
<div class="warn"><b>Satır çoğalması burada para kaybettirir</b>Kesintiyi sipariş satırlarıyla doğrudan birleştirirsen bir sipariş kaç kalemse o kadar kez sayılır. Önce iki tarafı restoran düzeyine topla, sonra birleştir (<b>Çoklu JOIN</b> dersi).</div>
<h3>Kontrol listesi</h3>
<ul><li><b>Mutabakat.</b> Restoran ve platform tutarlarının toplamı, kupon bedeline eşit olmalı: ${f(N.restoranTL)} + ${f(N.platformTL)} = ${f(N.maliyet)} TL.</li>
<li><b>Sınır.</b> Tam 1.500 saniyelik ${f(N.hazirlikSinir)} kayıt platformda kalır; kural “aşan” diyor.</li>
<li><b>Hukuk ve sözleşme.</b> Kesinti restoran sözleşmesini etkiler. Sen hukuki yorum yapmazsın, soruyu ve kapsamı doğru kişiye götürürsün.</li>
<li><b>Dürüstlük.</b> Uzun hazırlık, restoranın kusurunu kanıtlamaz: kurye geç gelmiş olabilir. <code>picked_at</code> kuryenin aldığı andır, yemeğin hazır olduğu an değildir. Bu, projenin en önemli varsayımıdır; BRD'de açıkça yaz ve yemeğin hazır olduğu anı tutan bir alan iste.</li>
<li><b>Portföy.</b> BRD, karar tablosu ve kanıt sorgularını kendi dosyanda topla. Lezzet Kurye'nin hayali olduğunu belirt.</li></ul>`,
  ex: [
    sq('<b>Adım 1.</b> Başlangıç kodundaki <code>k</code> kuponları, hazırlık süresini ve tutarı verir. Sorumluya göre kupon sayısı ve tutar: <code>sorumlu</code> (hazırlık 1.500 saniyeyi aşıyorsa \'restoran\', değilse \'platform\'), <code>kupon</code>, <code>tutar</code>. Sorumluya göre sırala.', KOST + "SELECT CASE WHEN hazirlik_sn > 1500 THEN 'restoran' ELSE 'platform' END AS sorumlu, COUNT(*) AS kupon, SUM(tutar) AS tutar FROM k GROUP BY CASE WHEN hazirlik_sn > 1500 THEN 'restoran' ELSE 'platform' END ORDER BY sorumlu;", 'Sorumlu bir CASE ifadesi; gruplamada da aynısını kullan. Sayı için COUNT, para için SUM.', { start: KOST + '-- Buradan devam et.\n', ord: true }),
    sq('<b>Adım 2.</b> Sınır ve kenar kontrolü: tam 1.500 saniyelik kupon sayısı (<code>tam_sinir</code>) ve hazırlık süresi hesaplanamayan kupon sayısı (<code>hazirlik_bos</code>), tek satırda.', KOST + "SELECT SUM(CASE WHEN hazirlik_sn = 1500 THEN 1 ELSE 0 END) AS tam_sinir, SUM(CASE WHEN hazirlik_sn IS NULL THEN 1 ELSE 0 END) AS hazirlik_bos FROM k;", 'Bir satırda iki koşullu sayım. Boş kontrolünde eşittir kullanılmaz.', { start: KOST + '-- Buradan devam et.\n' }),
    sq('<b>Adım 3.</b> Kural testi. Başlangıç kodu <code>ba_test2</code> tablosunu kuruyor. Kuralını yaz ve beklenenle uyuşmayan senaryo sayısını bul: <code>hata</code>. 0 çıkmalı.', KTEST + "SELECT COUNT(*) AS hata FROM ba_test2 WHERE beklenen <> CASE WHEN hazirlik_sn > 1500 THEN 'restoran' ELSE 'platform' END;", 'CASE sonucunu beklenen sütunuyla WHERE içinde karşılaştır.', { start: KTEST + '-- Testi buraya yaz.\n', must: [{ re: '\\bCASE\\b', msg: 'Kuralı CASE ile yaz.' }] }),
    sq('<b>Adım 4.</b> Başlangıç kodu kaynağı (<code>ba_k</code>) ve boş hedefi (<code>ba_kesinti</code>) kuruyor. Restoran sorumlu olan kuponları hedefe yükle: <code>order_id</code>, <code>restaurant_id</code>, <code>tutar</code>.', KTAB + KYUK, '<code>INSERT INTO ... SELECT</code> kullan; WHERE koşulu kuralın restoran tarafı.', { start: KTAB + '-- Yüklemeyi buraya yaz.\n', check: 'SELECT order_id, restaurant_id, tutar FROM ba_kesinti' }),
    sq('<b>Adım 5.</b> Mutabakat. Başlangıç kodu yüklemeyi yapıyor. İki satır: <code>kontrol</code>, <code>adet</code>, <code>tutar</code>. İlki \'kaynak\' (<code>ba_k</code>, hazırlık 1.500 saniyeyi aşanlar), ikincisi \'hedef\' (<code>ba_kesinti</code>).', KTAB + KYUK + "\nSELECT 'kaynak' AS kontrol, COUNT(*) AS adet, SUM(tutar) AS tutar FROM ba_k WHERE hazirlik_sn > 1500 UNION ALL SELECT 'hedef', COUNT(*), SUM(tutar) FROM ba_kesinti;", 'İki SELECT, aynı sütun sayısı. İlk sütun sabit metin.', { start: KTAB + KYUK + '\n-- Mutabakat sorgusunu buraya yaz.\n' }),
    sq('<b>Adım 6.</b> Restoran etkisi. Kesintinin, dönemdeki teslim siparişlerinden doğan komisyona oranı en yüksek 5 restoran. Komisyon = satır tutarı (<code>qty * unit_price</code>) × <code>commission_pct</code> / 100. Sütunlar: <code>name</code>, <code>kesinti</code>, <code>komisyon</code> (tam sayı), <code>oran</code> (yüzde, 1 basamak). Orana göre azalan sırala. <b>İki tarafı ayrı CTE ile restoran düzeyine topla.</b>', KOST + ", ke AS (SELECT restaurant_id, SUM(tutar) AS kesinti FROM k WHERE hazirlik_sn > 1500 GROUP BY restaurant_id), ko AS (SELECT o.restaurant_id, SUM(l.qty * l.unit_price * r.commission_pct / 100.0) AS komisyon FROM lk_orders o JOIN lk_order_lines l ON l.order_id = o.order_id JOIN lk_restaurants r ON r.restaurant_id = o.restaurant_id WHERE o.status = 'teslim' AND o.placed_at >= '2024-10-01' AND o.placed_at < '2025-01-01' GROUP BY o.restaurant_id) SELECT r.name, ke.kesinti, ROUND(ko.komisyon, 0) AS komisyon, ROUND(100.0 * ke.kesinti / ko.komisyon, 1) AS oran FROM ke JOIN ko ON ko.restaurant_id = ke.restaurant_id JOIN lk_restaurants r ON r.restaurant_id = ke.restaurant_id ORDER BY oran DESC, r.name LIMIT 5;", 'Üç adım: restoran başına kesinti, restoran başına komisyon, sonra ikisini ve restoran adını birleştir. Komisyon CTE\'sinde dönem ve durum koşullarını tekrar yazman gerekir.', { start: KOST + '-- k\'nin arkasına virgülle iki CTE ekle: kesinti ve komisyon.\n', ord: true }),
    sq('<b>Adım 7.</b> BRD eki. Tek raporda dört ölçü: <code>toplam_kupon_tutari</code>, <code>restorana_yansiyan</code>, <code>platformda_kalan</code>, <code>etkilenen_restoran</code> (kesinti alan farklı restoran). Sütunlar: <code>olcu</code>, <code>deger</code>.', KOST + "SELECT 'toplam_kupon_tutari' AS olcu, SUM(tutar) AS deger FROM k UNION ALL SELECT 'restorana_yansiyan', SUM(tutar) FROM k WHERE hazirlik_sn > 1500 UNION ALL SELECT 'platformda_kalan', SUM(tutar) FROM k WHERE hazirlik_sn <= 1500 UNION ALL SELECT 'etkilenen_restoran', COUNT(DISTINCT restaurant_id) FROM k WHERE hazirlik_sn > 1500;", 'Dört SELECT; son ölçüde tekrarları atarak say. İlk ikisinin toplamı için kontrol listesindeki sayılara bak.', { start: KOST + '-- Buradan devam et.\n' }),
    mc('<b>Adım 8.</b> Finans müdürü BRD\'ye “hazırlık 25 dakikayı aşınca kusur restoranındır” yazmanı istiyor. En doğru tutum hangisi?', ['Müdür istediği için cümleyi olduğu gibi yazarsın', '<code>picked_at</code> hazır olma anı değil; varsayımı yazarsın', 'Kuralı iptal edip talebin yapılamayacağını bildirirsin', 'Hukuka sormadan sözleşme maddesini kendin yeniden yazarsın'], 1, 'Veri kusuru kanıtlamıyor: kurye geç gelmiş olabilir. Dürüst yol, sınırı söylemek ve hangi verinin eksik olduğunu göstermektir. Karar yine iş birimininkidir.')
  ] });

/* ---------- Mülakat ---------- */
add({ id: 'ba-mulakat', lv: 'B2', mod: 'Mülakat Hazırlığı', min: 30,
  title: 'Mülakat: BT iş analisti için SQL ve senaryo soruları',
  sum: 'İş analisti görüşmelerinde sık geçen senaryo soruları ve bir analistten beklenen pratik SQL.',
  en: 'business analyst interview questions ba mülakat senaryo sql scenario stakeholder conflict change request',
  body: `<p>İş analisti görüşmeleri iki ayaklıdır. Birinde “şu durumda ne yaparsın?” diye sorulur, öbüründe bazı şirketler SQL ya da veri okuma görevi verir. Soru türleri şirkete ve sektöre göre değişir; buradaki liste bir kalıptır, sınav kılavuzu değil.</p>
<h2>Senaryo sorusuna cevap iskeleti</h2>
<ol><li><b>Netleştir.</b> “Önce şunu sorardım...” diye başla. Hemen çözüm söylemek zayıf görünür.</li>
<li><b>Kanıt iste.</b> Hangi sayıya bakacağını söyle.</li>
<li><b>Tarafları say.</b> Kim karar verir, kim etkilenir?</li>
<li><b>Kararı ve kaydı söyle.</b> Ne yazılır, nerede tutulur?</li>
<li><b>Gerçek örnek ver.</b> Kendi projenden ya da bu yoldaki kupon senaryosundan. Yapmadığın işi yapmış gibi anlatma; “bir eğitim projesinde çalıştım” demek yeterince değerlidir.</li></ol>
<h2>SQL'de ne bakılır?</h2>
<p>Analistten çoğu zaman karmaşık sorgu değil doğru düşünme beklenir: filtre, gruplama, JOIN, NULL ve mutabakat. Yazarken sesli düşün: “Bir satır neyi temsil ediyor? Bu JOIN satır sayısını değiştirir mi?” Sonuca güvenmeden önce basit bir kontrol toplamı söyle.</p>
<h2>Kendini anlatırken</h2>
<p>Bu yoldaki BRD'yi portföy olarak gösterebilirsin. Kullandığın verinin hayali ve eğitim amaçlı olduğunu belirt. Sayıların nereden geldiğini gösteren sorguyu yanında tut; bir sayı sorulduğunda onu göstermek güven verir.</p>
<div class="note"><b>Hazırlık önerisi</b>Aşağıdaki senaryo sorularını önce şıklara bakmadan sesli cevapla, sonra kendi cevabını doğru şıkla karşılaştır. Gerçek görüşmede şık olmaz.</div>`,
  ex: [
    mc('İki paydaş aynı alan için çelişen kural istiyor: pazarlama “kupon 30 gün geçerli”, finans “7 gün”. İlk adımın ne olur?', ['Ortasını bulup ikisine de uyacağını umarak 18 gün yazarsın', 'Gerekçe ve etkiyi toplayıp kararı sahibine götürürsün', 'Üst yöneticiye e-posta atıp seni bu işten çıkarmasını istersin', 'Geliştiriciye iki kuralı da ayar olarak koymasını söylersin'], 1, 'Kararı iş analisti tek başına vermez ama karar için gerekli bilgiyi toplar: maliyet, kullanım oranı, müşteri etkisi. Sonra kararı sahibine götürür ve kayda alır.'),
    mc('Geliştirici “bu gereksinim yanlış, öyle olmaz” diyor. Ne yaparsın?', ['Sözleşme gibi yazıldığı için uygulamasını istersin', 'Hemen gereksinimi siler, teknik bilgisine güvenirsin', 'Gerekçesini dinler, alternatifi birlikte tartışırsın', 'Konuyu toplantıda herkesin önünde tartışmaya açarsın'], 2, 'Geliştirici çoğu zaman görmediğin bir kısıtı görür. Amaç gereksinimi korumak değil, iş amacına uygun çözümü bulmaktır. Değişiklik olursa kayda geçer.'),
    mc('İterasyonun ortasında üst düzey bir yönetici “şunu da ekleyin” diyor. En iyi cevap hangisi?', ['Olur der, ekibe akşam fazla mesai yazdırırsın', 'Yetkin olmadığını söyleyip konuyu kapatırsın', 'Kaydı açmadan geliştiriciye doğrudan iletirsin', 'Etkisini çıkarır, önceliği ürün sahibine götürürsün'], 3, 'Yeni istek yok sayılmaz, sessizce de eklenmez. Etki ve ödünleşim görünür olunca öncelik kararı doğru kişide kalır.'),
    mc('Canlıya çıktıktan bir saat sonra iki katı kupon üretildiğini fark ettin. İlk adımın hangisi?', ['Geri alma ölçütüne bakıp sorumluyu haberdar edersin', 'Sorunu kendi başına çözmek için sorgularla neden aramaya başlarsın', 'Yarın yapılacak toplantının gündemine bir madde eklersin', 'Fazla kuponları veritabanından elle silmeye başlarsın'], 0, 'Önce etkiyi durduracak kararı tetiklersin; önceden yazılmış ölçüt bunun içindir. Kök neden analizi sonra gelir. Canlıda elle veri silmek izinsiz yapılmaz.'),
    mc('Finans raporu ile senin sorgun farklı ciro veriyor. Nasıl ilerlersin?', ['Finans raporunun yanlış olduğunu yazıp sorgunu kullanırsın', 'İki tanımı karşılaştırır: dönem, durum, indirim, tarih alanı', 'Farkı yuvarlayıp ortalamasını raporda paylaşırsın', 'Finans sistemine güvenip kendi sorgunu silersin'], 1, 'Çoğu fark tanımdan gelir: iptal dahil mi, hangi tarih, hangi saat dilimi? Önce tanımı hizala, sonra satır düzeyinde küçük bir örnekle farkı bul.'),
    mc('İş analisti ile ürün sahibi arasındaki temel fark sorulduğunda en dürüst cevap hangisi?', ['İkisi aynı iştir; yalnız şirket içi unvan değişir', 'Ürün sahibi kod yazar, iş analisti dokümanı onaylar', 'Şirkete göre değişir; öncelik çoğunlukla ürün sahibinde', 'İş analisti öncelik verir, ürün sahibi test senaryosu yazar'], 2, 'Sınır kuruma göre değişir ve bunu söylemek dürüstlüktür. Bazı ekiplerde tek kişi ikisini yapar. Kendi deneyiminden örnek vererek tamamla.'),
    mc('Kabul kriteri “sistem hızlı olmalı” yazılmış ve test ekibi bunu test edemiyor. Ne yaparsın?', ['Kriteri silersin, çünkü hız işlevsel gereksinim değildir', 'Test ekibinden sezgisel olarak karar vermesini istersin', 'Geliştiriciye en hızlı çözümü yapmasını söylersin', 'Paydaşa ölçü sorar, sayıya çevirip yeniden yazarsın'], 3, 'Örnek: “Kupon, teslim kaydından en geç 5 dakika sonra görünür.” Sayı iş biriminden gelir, teknik ekiple yapılabilirliği konuşulur.'),
    mc('“BRD ile kullanıcı hikâyesi arasındaki fark nedir?” sorusuna en iyi cevap hangisi?', ['BRD işin bütününü, hikâye tek parçayı anlatır', 'BRD yalnız şelale projelerinde vardır; çevik ekipler hiç yazmaz', 'Hikâye yöneticiler için, BRD yalnız geliştiriciler için yazılır', 'İkisi aynı bilgiyi taşır, biri yalnızca Türkçe yazılır'], 0, 'Birçok çevik ekip de işin bütününü anlatan bir özet doküman tutar; biçimi ve adı değişebilir. Önemli olan kapsam, gerekçe ve parçalar arasındaki izlenebilirliktir.'),
    sq('<b>SQL.</b> Hiç siparişi olmayan müşteri sayısı: <code>siparissiz</code>. (<code>lk_customers</code>, <code>lk_orders</code>)', "SELECT COUNT(*) AS siparissiz FROM lk_customers c LEFT JOIN lk_orders o ON o.customer_id = c.customer_id WHERE o.order_id IS NULL;", 'Klasik eşi olmayan soru. Müşteri solda; sağ tarafın anahtarı boş olanları say.'),
    sq('<b>SQL.</b> Satır çoğalması. Teslim edilmiş siparişlerden tek satırda: sipariş sayısı <code>siparis</code>, kalem sayısı <code>kalem</code>, sepet toplamı <code>tutar</code>. (<code>lk_orders</code>, <code>lk_order_lines</code>)', "SELECT COUNT(DISTINCT o.order_id) AS siparis, COUNT(*) AS kalem, SUM(l.qty * l.unit_price) AS tutar FROM lk_orders o JOIN lk_order_lines l ON l.order_id = o.order_id WHERE o.status = 'teslim';", 'JOIN sonrası bir satır bir sipariş değil bir kalemdir. Sipariş sayısında tekrarları at.'),
    sq('<b>SQL.</b> Ay kayması: sipariş ayı ile teslim ayı farklı olan teslim edilmiş sipariş sayısı. Rapor hangi tarihe göre yazılıyorsa bu kayıtlar farklı aya düşer: <code>ay_kayan</code>.', "SELECT COUNT(*) AS ay_kayan FROM lk_orders WHERE status = 'teslim' AND strftime('%Y-%m', placed_at) <> strftime('%Y-%m', delivered_at);", 'Her iki tarihten de yıl-ay çıkar ve karşılaştır. İki raporun neden farklı ay toplamı verdiğini açıklayan tipik bir kontrol.'),
    sq('<b>SQL.</b> Müşterileri dönem içi teslim sipariş sayısına göre ayır: 1-2 \'az\', 3-9 \'orta\', 10 ve üzeri \'cok\'. Segment başına müşteri sayısı: <code>segment</code>, <code>musteri</code>. Segmente göre sırala. Dönem: Ekim-Aralık 2024.', "WITH m AS (SELECT customer_id, COUNT(*) AS n FROM lk_orders WHERE status = 'teslim' AND placed_at >= '2024-10-01' AND placed_at < '2025-01-01' GROUP BY customer_id) SELECT CASE WHEN n >= 10 THEN 'cok' WHEN n >= 3 THEN 'orta' ELSE 'az' END AS segment, COUNT(*) AS musteri FROM m GROUP BY CASE WHEN n >= 10 THEN 'cok' WHEN n >= 3 THEN 'orta' ELSE 'az' END ORDER BY segment;", 'İki kademe: önce müşteri başına sipariş sayısı, sonra bu sayıyı CASE ile segmente çevirip say.', { ord: true }),
    sq('<b>SQL.</b> Veri kalitesi: hiç kalemi olmayan sipariş sayısı. Sonuç sıfırsa da söylemek değerlidir: <code>kalemsiz</code>.', "SELECT COUNT(*) AS kalemsiz FROM lk_orders o WHERE NOT EXISTS (SELECT 1 FROM lk_order_lines l WHERE l.order_id = o.order_id);", 'Sipariş tablosundan başla. Karşılığı olmayanları LEFT JOIN ya da NOT EXISTS ile bulabilirsin.'),
    sq('<b>SQL.</b> Hangi restoran iptal oranında en kötü? En az 100 siparişi olanlardan iptal oranı (yüzde, 1 basamak) en yüksek 3 restoran: <code>name</code>, <code>siparis</code>, <code>oran</code>. Orana göre azalan, eşitlikte ada göre sırala.', "SELECT r.name, COUNT(*) AS siparis, ROUND(100.0 * SUM(CASE WHEN o.status = 'iptal' THEN 1 ELSE 0 END) / COUNT(*), 1) AS oran FROM lk_orders o JOIN lk_restaurants r ON r.restaurant_id = o.restaurant_id GROUP BY r.name HAVING COUNT(*) >= 100 ORDER BY oran DESC, r.name LIMIT 3;", 'Koşullu toplamayla oran hesapla; alt sınırı grup koşulu olarak yaz, sıralayıp ilk üçü al.', { ord: true })
  ] });

/* ---------- Öğrenme yolu ---------- */
const W = s => s.trim().split(/\s+/);
const PA = {}; window.SQLP_PATHS.forEach(p => PA[p.id] = p);
const yol = {
  id: 'is-analisti', name: 'BT İş Analisti', short: 'BA', color: '#1F5F8B', kind: 'rol',
  desc: 'Bir iş talebini gereksinime, teste ve canlıya taşı; SQL ile sorunu boyutlandır, sonucu doğrula.',
  long: 'BT iş analisti, iş biriminin talebini geliştirme ekibinin yapabileceği, test ekibinin sınayabileceği yazılı gereksinime çevirir, işi canlıya kadar izler. Bu yol SQL bilmeyen birinden başlar: önce sorgu yazma, JOIN ve NULL; sonra ER okuma, kısıtlar, normalizasyon ve veri kalitesi. Sekiz özel ders tek bir talebi, geç teslimde otomatik kupon talebini, görüşmeden BRD\'ye, süreç şemasından API sözleşmesine, UAT\'den canlı sonrası ölçüme götürür. Görüşme yönetmeyi ve Jira ya da Confluence kullanmayı burada yalnız okuyarak öğrenirsin; bunlar pratikle gelişir. Yol iş garantisi vermez.',
  skills: ['Talep analizi', 'Gereksinim ve kabul kriteri', 'BPMN okuma ve çizme', 'Alan eşleme', 'API sözleşmesi okuma', 'UAT', 'SQL ile mutabakat', 'BRD'],
  lessons: W(`ba-rol ilk-sorgu veritabani veri-seti select alias-distinct hesaplama where mantik in-between-like null order-limit aggregate group-by having case coalesce tarih-fn tarih-filtre iliskiler inner-join left-join coklu-join subquery toplama-tuzak set-ops cte ba-talep ba-gereksinim ba-surec dml ddl-create er-modelleme kisitlar normalizasyon ba-veri ba-api transaction de-kalite sql-test ba-uat ba-canli proje-is-analisti ba-mulakat`),
  opt: W(`metin sayi-tip kosullu sorgu-sirasi self-cross-join join-ozet correlated exists-anyall sik-hatalar hata-ayiklama an-kpi view window-intro ranking index acid kvkk`),
  comp: [
    { t: 'SQL temeli', d: 'Filtre, gruplama, NULL, CASE, tarih', l: ['select', 'where', 'null', 'group-by', 'case', 'tarih-filtre'] },
    { t: 'Birleştirme ve kontrol', d: 'JOIN, satır çoğalması, alt sorgu, CTE', l: ['inner-join', 'left-join', 'coklu-join', 'subquery', 'set-ops', 'cte'] },
    { t: 'Rol ve talep', d: 'Rolün sınırı, asıl sorun, boyut, kapsam', l: ['ba-rol', 'ba-talep'] },
    { t: 'Gereksinim ve süreç', d: 'Kural, hikâye, kabul kriteri, BPMN, sıra diyagramı, karar tablosu', l: ['ba-gereksinim', 'ba-surec'] },
    { t: 'Veri ve entegrasyon', d: 'ER okuma, kısıt, normalizasyon, alan eşleme, API sözleşmesi', l: ['er-modelleme', 'kisitlar', 'normalizasyon', 'ba-veri', 'ba-api'] },
    { t: 'Test ve kalite', d: 'İşlem mantığı, veri kalitesi, UAT, mutabakat', l: ['transaction', 'de-kalite', 'sql-test', 'ba-uat'] },
    { t: 'Canlı ve kapanış', d: 'Geçiş planı, duman testi, KPI, geri alma, BRD', l: ['ba-canli'] },
    { t: 'Bitirme ve mülakat', d: 'Değişiklik talebini baştan sona götür, görüşmeye hazırlan', l: ['proje-is-analisti', 'ba-mulakat'] }
  ],
  beyond: ['Paydaş görüşmesi ve toplantı yönetimi', 'Jira, Confluence ya da kurumunun kullandığı araçlar', 'BPMN aracı (draw.io, Camunda Modeler gibi) ile çizim pratiği', 'Çalıştığın sektörün iş kuralları ve mevzuatı', 'Rapor okuma ve yazma: Kesit Power BI\'daki BT İş Analisti yolu', 'İsteğe bağlı: dosya, Excel ve API işleri için Kesit Python\'daki BT İş Analisti yolu']
};
window.SQLP_PATHS.splice(window.SQLP_PATHS.findIndex(p => p.id === 'bi') + 1, 0, yol);
PA.mulakat.opt = (PA.mulakat.opt || []).concat(['ba-mulakat']);

/* ---------- Sözlük ve arama ---------- */
[
  ['BRD (business requirements document)', 'İş gereksinimleri dokümanı. Sorunu, kapsamı, iş kurallarını, gereksinimleri ve kabul koşullarını tek yerde toplar.'],
  ['Kullanıcı hikâyesi (user story)', '“Bir [kim] olarak, [ne] istiyorum, böylece [neden]” kalıbıyla yazılan küçük gereksinim parçası.'],
  ['Kabul kriteri (acceptance criteria)', 'Bir işin kabul edilmesi için sağlanması gereken, test edilebilir koşullar. Çoğu zaman Given/When/Then kalıbıyla yazılır.'],
  ['Given / When / Then', 'Kabul kriteri kalıbı: başlangıç durumu, olay, beklenen sonuç.'],
  ['INVEST', 'İyi kullanıcı hikâyesinin ölçütleri: Independent, Negotiable, Valuable, Estimable, Small, Testable.'],
  ['UAT (user acceptance testing)', 'Kullanıcı kabul testi. İş biriminin, sistemin kendi işini çözdüğünü doğruladığı son test aşaması.'],
  ['BPMN (Business Process Model and Notation)', 'Süreç çizmek için yaygın standart gösterim. Temel öğeleri: olay, görev, karar, kulvar.'],
  ['Sıra diyagramı (sequence diagram)', 'Sistemlerin ya da kişilerin birbirine hangi sırayla mesaj gönderdiğini gösteren çizim.'],
  ['AS-IS ve TO-BE', 'Sürecin bugünkü hâli ve hedeflenen hâli.'],
  ['Karar tablosu (decision table)', 'Koşul birleşimlerini ve her birinin sonucunu listeleyen tablo. Boş kalan satır eksik kuraldır.'],
  ['RACI', 'Sorumluluk tablosu: Responsible (yapan), Accountable (hesap veren), Consulted (görüşü alınan), Informed (bilgilendirilen).'],
  ['Alan eşleme (field mapping)', 'Hedefteki her alanın nereden, hangi tip ve dönüşümle geldiğini gösteren liste.'],
  ['Idempotency', 'Bir işlemin kaç kez çalışırsa çalışsın aynı sonucu vermesi. Yeniden denenen isteğin ikinci kayıt üretmemesi için gerekir.'],
  ['Mutabakat (reconciliation)', 'İki kaynağın sayı ve tutarlarını karşılaştırıp farkı açıklama işi.'],
  ['Duman testi (smoke test)', 'Geçişten hemen sonra en kritik işlerin çalıştığını gösteren kısa kontrol.'],
  ['Önem ve öncelik (severity, priority)', 'Önem hatanın etkisini, öncelik ne zaman düzeltileceğini anlatır; ikisi farklıdır.'],
  ['Geçiş planı (cutover)', 'Canlıya geçişin sıralı, sahipli adım listesi.'],
  ['Değişiklik talebi (change request)', 'Onaylanmış kapsamın dışındaki isteğin etkisiyle birlikte kayda alınması.'],
  ['Değişiklik yönetimi (change management)', 'Yeni sürecin insanlar tarafından benimsenmesi için yapılan iletişim, eğitim ve geçiş işleri.']
].forEach(g => window.SQLP_GLOSSARY.push(g));
Object.assign(window.SQLP_SEARCH_SYN, { 'business analyst': ['iş analisti'], ba: ['iş analisti'], brd: ['brd'], 'user story': ['kullanıcı hikâyesi'], 'acceptance criteria': ['kabul kriteri'], uat: ['uat', 'kabul testi'], bpmn: ['bpmn'], 'sequence diagram': ['sıra diyagramı'], requirements: ['gereksinim'], stakeholder: ['paydaş'], 'smoke test': ['duman testi'], rollback: ['geri alma'], reconciliation: ['mutabakat'], idempotency: ['idempotency'], 'field mapping': ['alan eşleme'] });
})();
