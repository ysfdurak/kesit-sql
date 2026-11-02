/* Kesit SQL: öğrenme yolu tamamlama belgesi
   - Bir öğrenme yolunun çekirdek dersleri bitince öğrenme yolu sayfasında belge paneli açılır.
   - Belge tamamen tarayıcıda çizilir (canvas). Ad yalnızca kullanıcının tarayıcısında saklanır.
   - Hesap olmadığı için belge doğrulanabilir değildir; üzerinde bu açıkça yazar. */
(function () {
  const W = 1600, H = 1131;                 // A4 yatay oran (1:1.414)
  const FD = '"Bricolage Grotesque", "Segoe UI", system-ui, sans-serif';
  const FB = '"IBM Plex Sans", "Segoe UI", system-ui, sans-serif';
  const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const app = () => window.KESIT_APP;
  const trDate = iso => { const [y, m, d] = iso.split('-').map(Number); return d + ' ' + AYLAR[m - 1] + ' ' + y; };
  const certNo = (pid, name, date) => {
    let h = 2166136261; const s = pid + '|' + name.toLocaleLowerCase('tr') + '|' + date;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return 'KS-' + pid.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) + '-' + date.replace(/-/g, '') + '-' + (h >>> 0).toString(36).toUpperCase().slice(0, 5);
  };
  const siteUrl = () => { const C = window.KESIT_CONFIG || {}; if (C.siteUrl) return C.siteUrl; if (/^https?:/.test(location.protocol) && !/claude\.ai|claudeusercontent/.test(location.host)) return location.origin + location.pathname.replace(/index\.html$/, ''); return ''; };

  /* ---------- çizim ---------- */
  function fit(ctx, text, max, size, weight, family) {
    let s = size; do { ctx.font = weight + ' ' + s + 'px ' + family; if (ctx.measureText(text).width <= max) break; s -= 2; } while (s > 28);
    return s;
  }
  function logo(ctx, x, y, s) {             // köşesi çapraz kesilmiş kare (marka işareti)
    const r = s * 0.27;
    ctx.save(); ctx.translate(x, y); ctx.scale(s / 26, s / 26);
    ctx.fillStyle = '#D3352C'; ctx.beginPath(); ctx.roundRect(0.5, 0.5, 25, 25, 7); ctx.fill();
    ctx.fillStyle = '#FBFAF7'; ctx.beginPath(); ctx.moveTo(0.5, 15.5); ctx.lineTo(15.5, 0.5); ctx.lineTo(20.5, 0.5); ctx.lineTo(0.5, 20.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.beginPath(); ctx.roundRect(13, 13, 8, 2.2, 1.1); ctx.fill(); ctx.beginPath(); ctx.roundRect(13, 17.5, 5, 2.2, 1.1); ctx.fill();
    ctx.restore(); void r;
  }
  function resolveColor(col) {
    if (!col || !/var\(|^--/.test(col)) return col;
    const L = { l1: '#2F9A5A', l2: '#0F8A7E', l3: '#3866D1', l4: '#7A4FD0', l5: '#B8418F', l6: '#D3352C' }; const m = col.match(/--(l\d)/); if (m && L[m[1]]) return L[m[1]];
    try { const el = document.createElement('span'); el.style.color = col; document.body.appendChild(el); const v = getComputedStyle(el).color; el.remove(); return v || '#D3352C'; } catch (e) { return '#D3352C'; }
  }
  function draw(canvas, o) {
    o = Object.assign({}, o, { color: resolveColor(o.color) || '#D3352C' });
    canvas.width = W; canvas.height = H;
    const c = canvas.getContext('2d');
    const INK = '#141C27', MUTED = '#5A6576', LINE = '#D8DEE6', ACC = '#D3352C', BG = '#FBFAF7';
    c.fillStyle = BG; c.fillRect(0, 0, W, H);
    // kenarlık ve öğrenme yolu rengi şeridi
    c.fillStyle = o.color || ACC; c.fillRect(0, 0, 18, H);
    c.strokeStyle = LINE; c.lineWidth = 2; c.strokeRect(56, 56, W - 112, H - 112);
    c.strokeStyle = INK; c.lineWidth = 1; c.strokeRect(70, 70, W - 140, H - 140);
    // sağ üst köşede “kesit” motifi
    c.save(); c.beginPath(); c.rect(70, 70, W - 140, H - 140); c.clip();
    c.fillStyle = 'rgba(211,53,44,.07)'; c.beginPath(); c.moveTo(W - 520, 70); c.lineTo(W - 70, 70); c.lineTo(W - 70, 520); c.closePath(); c.fill();
    c.fillStyle = 'rgba(211,53,44,.12)'; c.beginPath(); c.moveTo(W - 300, 70); c.lineTo(W - 70, 70); c.lineTo(W - 70, 300); c.closePath(); c.fill();
    c.restore();
    // logo ve marka
    logo(c, 130, 128, 64);
    c.fillStyle = INK; c.font = '800 44px ' + FD; c.textBaseline = 'middle'; c.fillText('Kesit', 214, 161);
    const kw = c.measureText('Kesit ').width; c.fillStyle = ACC; c.font = '700 44px ' + FD; c.fillText('SQL', 214 + kw, 161);
    c.textAlign = 'center';
    // başlık
    c.fillStyle = ACC; c.font = '700 26px ' + FB; c.letterSpacing = '8px'; c.fillText('TAMAMLAMA BELGESİ', W / 2, 330); c.letterSpacing = '0px';
    c.fillStyle = MUTED; c.font = '400 30px ' + FB; c.fillText('Bu belge', W / 2, 400);
    // ad
    const ns = fit(c, o.name, 1180, 96, '800', FD);
    c.fillStyle = INK; c.font = '800 ' + ns + 'px ' + FD; c.fillText(o.name, W / 2, 492);
    c.strokeStyle = LINE; c.lineWidth = 2; c.beginPath(); c.moveTo(W / 2 - 420, 560); c.lineTo(W / 2 + 420, 560); c.stroke();
    // açıklama
    c.fillStyle = MUTED; c.font = '400 32px ' + FB; c.fillText('Kesit SQL\'de', W / 2, 622);
    const ps = fit(c, o.path, 1240, 54, '700', FD);
    c.fillStyle = INK; c.font = '700 ' + ps + 'px ' + FD; c.fillText(o.path, W / 2, 686);
    c.fillStyle = MUTED; c.font = '400 32px ' + FB; c.fillText('öğrenme yolunun tüm çekirdek derslerini tamamladığını gösterir.', W / 2, 748);
    // sayılar
    const stats = [[o.lessons + ' ders', 'tamamlandı'], [o.exercises + ' alıştırma', 'çözüldü'], ['~' + o.hours + ' saat', 'çalışma']];
    const bw = 300, gap = 36, sx = W / 2 - (bw * 3 + gap * 2) / 2;
    stats.forEach(([a, b], i) => {
      const x = sx + i * (bw + gap); c.fillStyle = '#F1F3F6'; c.beginPath(); c.roundRect(x, 790, bw, 104, 14); c.fill();
      c.fillStyle = o.color || ACC; c.font = '800 38px ' + FD; c.fillText(a, x + bw / 2, 830);
      c.fillStyle = MUTED; c.font = '400 22px ' + FB; c.fillText(b, x + bw / 2, 870);
    });
    // beceriler
    if (o.skills && o.skills.length) {
      c.font = '500 22px ' + FB; const items = o.skills.slice(0, 6); const pad = 18, gp = 12;
      const ws = items.map(s => c.measureText(s).width + pad * 2); let tot = ws.reduce((a, b) => a + b, 0) + gp * (items.length - 1);
      while (tot > 1300 && items.length > 3) { items.pop(); ws.pop(); tot = ws.reduce((a, b) => a + b, 0) + gp * (items.length - 1); }
      let x = W / 2 - tot / 2;
      items.forEach((s, i) => { c.strokeStyle = LINE; c.lineWidth = 2; c.beginPath(); c.roundRect(x, 914, ws[i], 40, 20); c.stroke(); c.fillStyle = INK; c.fillText(s, x + ws[i] / 2, 935); x += ws[i] + gp; });
    }
    // alt bilgi
    c.textAlign = 'left'; c.fillStyle = INK; c.font = '600 22px ' + FB; c.fillText(trDate(o.date), 130, 990);
    c.fillStyle = MUTED; c.font = '400 18px ' + FB; c.fillText('Tarih  ·  Belge no: ' + o.no, 130, 1018);
    c.textAlign = 'right';
    if (o.author) { c.fillStyle = INK; c.font = '600 22px ' + FB; c.fillText(o.author, W - 130, 990); c.fillStyle = MUTED; c.font = '400 18px ' + FB; c.fillText('Kesit SQL\'i hazırlayan', W - 130, 1018); }
    if (o.url) { c.textAlign = 'center'; c.fillStyle = INK; c.font = '600 20px ' + FB; c.fillText(o.url.replace(/^https?:\/\//, '').replace(/\/$/, ''), W / 2, 990); c.fillStyle = MUTED; c.font = '400 18px ' + FB; c.fillText('Kesit SQL', W / 2, 1018); }
    c.textAlign = 'center'; c.fillStyle = '#8A94A3'; c.font = '400 16px ' + FB;
    c.fillText('Kesit SQL ücretsiz bir öğrenme projesidir. Bu belge resmî bir sertifika değildir ve doğrulanamaz; ilerleme kişinin kendi tarayıcısında tutulur.', W / 2, 1044);
    return canvas;
  }

  /* ---------- arayüz ---------- */
  function data(pid) {
    const A = app(); const info = A.pathInfo(pid); if (!info) return null;
    const P = A.getP(); const rec = (P.certs || {})[pid];
    return Object.assign({}, info, { rec });
  }
  function panelHTML(pid) {
    const d = data(pid); if (!d || !d.complete) return '';
    const name = (d.rec && d.rec.name) || (app().getP().certName || '');
    let h = '<section class="panel cert-panel"><div class="sec-head"><div><span class="eyebrow">Tebrikler</span><h2 style="margin:2px 0 0">Tamamlama belgen hazır</h2></div>' + (d.rec ? '<span class="chip okc">' + esc(trDate(d.rec.date)) + '</span>' : '') + '</div>';
    h += '<p class="muted" style="margin:0">' + esc(d.name) + ' öğrenme yolunun ' + d.lessons + ' çekirdek dersini bitirdin. Belgede görünecek adını yaz; ad yalnızca bu tarayıcıda saklanır.</p>';
    h += '<form class="cert-form" data-cert-form="' + esc(pid) + '"><input class="input" name="ad" maxlength="60" required autocomplete="name" aria-label="Belgede görünecek ad" placeholder="Ad Soyad" value="' + esc(name) + '"><button class="btn pri" type="submit">' + (d.rec ? 'Belgeyi güncelle' : 'Belgeyi oluştur') + '</button></form>';
    h += '<div class="cert-out" id="certOut"' + (d.rec ? '' : ' hidden') + '><canvas id="certCanvas" aria-label="Tamamlama belgesi önizlemesi"></canvas><div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn" data-cert="png" data-p="' + esc(pid) + '">Görsel olarak indir (PNG)</button><button class="btn" data-cert="print" data-p="' + esc(pid) + '">Yazdır / PDF kaydet</button><button class="btn" data-cert="li-share" data-p="' + esc(pid) + '">LinkedIn\'de paylaş</button><button class="btn ghost" data-cert="li-profile" data-p="' + esc(pid) + '">LinkedIn profiline ekle</button></div>';
    h += '<p class="muted" style="margin:0;font-size:.82rem">LinkedIn paylaşımında görseli kendin eklemen gerekir: önce PNG olarak indir, paylaşım penceresinde görsel ekle. “Profiline ekle” LinkedIn\'in Lisanslar ve sertifikalar formunu doldurulmuş olarak açar. Bu belge resmî bir sertifika değildir.</p></div></section>';
    return h;
  }
  function opts(pid) {
    const d = data(pid); const C = window.KESIT_CONFIG || {};
    return { name: d.rec.name, path: d.name, color: d.color, lessons: d.lessons, exercises: d.exercises, hours: d.hours, skills: d.skills, date: d.rec.date, no: d.rec.no, author: (C.author && C.author.name) || '', url: siteUrl() };
  }
  async function mount(pid) {
    const d = data(pid); if (!d || !d.complete || !d.rec) return;
    const cv = document.getElementById('certCanvas'); if (!cv) return;
    try { if (document.fonts && document.fonts.ready) await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1500))]); } catch (e) { }
    draw(cv, opts(pid));
  }
  function save(pid, name) {
    const A = app(); const P = A.getP(); P.certs = P.certs || {}; P.certName = name;
    const old = P.certs[pid]; const date = old ? old.date : new Date().toISOString().slice(0, 10);
    P.certs[pid] = { name, date, no: certNo(pid, name, date) }; A.save();
    if (A.event) A.event('belge/' + pid, 'Belge oluşturuldu: ' + pid);
  }
  function download(pid) {
    const cv = document.getElementById('certCanvas'); if (!cv) return;
    const fn = 'kesit-sql-belge-' + pid + '.png';
    cv.toBlob(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = fn; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800); }, 'image/png');
  }
  function printIt(pid) {
    const cv = document.getElementById('certCanvas'); if (!cv) return;
    const url = cv.toDataURL('image/png'); const w = window.open('', '_blank');
    if (!w) { if (app()) app().toast('Açılır pencere engellendi; görsel olarak indirip yazdırabilirsin'); return; }
    w.document.write('<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>Kesit SQL · Tamamlama belgesi</title><style>@page{size:A4 landscape;margin:0}html,body{margin:0;background:#fff}img{width:100vw;height:auto;display:block}@media screen{body{padding:24px;background:#EEF1F4}img{max-width:1100px;margin:0 auto;box-shadow:0 8px 30px rgba(0,0,0,.15)}}</style></head><body><img src="' + url + '" alt="Tamamlama belgesi" onload="setTimeout(function(){window.print()},300)"></body></html>');
    w.document.close();
  }
  function linkedIn(pid, kind) {
    const o = opts(pid); const site = o.url || 'https://github.com';
    if (kind === 'li-share') { window.open('https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(site), '_blank', 'noopener'); return; }
    const [y, m] = o.date.split('-');
    const u = 'https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=' + encodeURIComponent('Kesit SQL: ' + o.path + ' (tamamlama belgesi)') + '&organizationName=' + encodeURIComponent('Kesit SQL') + '&issueYear=' + y + '&issueMonth=' + Number(m) + (o.url ? '&certUrl=' + encodeURIComponent(o.url) : '') + '&certId=' + encodeURIComponent(o.no);
    window.open(u, '_blank', 'noopener');
  }
  function listHTML() {
    const A = app(); if (!A) return ''; const P = A.getP(); const certs = P.certs || {}; const ids = Object.keys(certs).filter(id => { const i = A.pathInfo(id); return i && i.complete; });
    if (!ids.length) return '';
    return '<section class="panel" style="padding:18px;display:flex;flex-direction:column;gap:10px"><div class="sec-head"><h3>Tamamlama belgelerin</h3><span class="muted" style="font-size:.85rem">' + ids.length + '</span></div><div class="row" style="gap:8px;flex-wrap:wrap">' + ids.map(id => '<button class="btn sm" data-go="path" data-id="' + esc(id) + '">' + esc(A.pathInfo(id).name) + ' · ' + esc(trDate(certs[id].date)) + '</button>').join('') + '</div></section>';
  }

  document.addEventListener('submit', ev => {
    const f = ev.target.closest('[data-cert-form]'); if (!f) return; ev.preventDefault();
    const name = f.ad.value.replace(/\s+/g, ' ').trim(); if (name.length < 2) { app().toast('Belgede görünecek adını yaz'); return; }
    const pid = f.dataset.certForm; save(pid, name);
    const out = document.getElementById('certOut'); if (out) out.hidden = false;
    const b = f.querySelector('button'); if (b) b.textContent = 'Belgeyi güncelle';
    mount(pid).then(() => { if (out) out.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); });
  }, true);
  document.addEventListener('click', ev => {
    const t = ev.target.closest('[data-cert]'); if (!t) return; ev.preventDefault(); ev.stopPropagation();
    const k = t.dataset.cert, pid = t.dataset.p;
    if (k === 'png') download(pid); else if (k === 'print') printIt(pid); else linkedIn(pid, k);
  }, true);

  window.KESIT_CERT = { panelHTML, mount, listHTML, draw, _certNo: certNo };
})();
