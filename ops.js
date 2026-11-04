/* Kesit SQL: Operasyon günlüğü. Tamamen kurgusal, tohumlu ve yeniden üretilebilir örnek veri (rastgele üreteç diğer veri setlerinden bağımsızdır).
   Hayali Ilgaz Bank portalının 4-12 Kasım 2024 sorgu ve erişim günlüğü. Gerçek bir sistemden alınmadı, süre ve okuma değerleri üreteçten gelir.
   IP adresleri belgeleme ve özel ağ aralıklarındandır (RFC 5737: 203.0.113.0/24; özel ağ: 10.0.0.0/8).
   Bilerek konan örüntüler: Salı sabahı sürüm sonrası yeni pahalı sorgu, plan değişimiyle kötüleşen rapor, parola deneme, ardışık kayıt taraması,
   arama kutusunda enjeksiyon denemesi. Yanıltıcı olsun diye konanlar: kapalı hesabın sürekli başarısız girişi, gece ETL'in ardışık okuması, yazım hatası yapan analist. */
(function (root) {
  function rng(seed) { return function () { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const R = rng(20241112);
  const bi = (a, b) => a + Math.floor(R() * (b - a + 1));
  const bp = a => a[Math.floor(R() * a.length)];
  const var_ = (m, p) => Math.max(1, Math.round(m * (1 - p + 2 * p * R())));
  const q = v => v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : "'" + String(v).replace(/'/g, "''") + "'";
  const ins = (t, cols, rows) => { let s = ''; for (let i = 0; i < rows.length; i += 500) s += 'INSERT INTO ' + t + ' (' + cols.join(',') + ') VALUES\n' + rows.slice(i, i + 500).map(r => '(' + r.map(q).join(',') + ')').join(',\n') + ';\n'; return s; };
  const pad = n => String(n).padStart(2, '0');
  const fmt = t => { const d = new Date(t); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()) + ' ' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ':' + pad(d.getUTCSeconds()); };
  const gun = (d, h, m, s) => Date.UTC(2024, 10, d, h || 0, m || 0, s || 0);
  const HOUR = 3600000, MIN = 60000, T0 = gun(4), TEND = gun(12, 12), YAYIN = gun(12, 7, 55), BAKIM = gun(12, 5, 58), SIKISIK0 = gun(12, 8), TARAMA0 = gun(12, 7, 5);
  const QL = [], AL = [], PS = {};
  const IP_APP = ['10.20.0.11', '10.20.0.12'], IP_ETL = '10.20.0.30', IP_RAPOR = '10.20.0.40', IP_BAKIM = '10.20.0.50', IP_ESKI = '10.20.0.55', IP_DIS = '203.0.113.77';
  const AN = { an_derya: '10.30.1.21', an_ece: '10.30.1.22', an_mert: '10.30.1.23', an_selin: '10.30.1.24' };
  const IZ = { 3: 'portal_son_hareket', 7: 'rapor_sube_ozet', 8: 'rapor_ay_tur', 9: 'rapor_sube_detay', 10: 'etl_gunluk_yukleme', 11: 'portal_hareket_yeni' };
  const kaynaktaSikisik = t => t >= SIKISIK0 && t < TEND;
  /* Sıkışıklık süreyi uzatır, okunan sayfayı değiştirmez: asıl sorumluyu süre değil okuma gösterir */
  const sure = (t, ms) => kaynaktaSikisik(t) ? var_(ms * 4, 0.3) : ms;
  function sor(t, login, ip, text, ms, reads, rows, o) { o = o || {}; QL.push([t, login, ip, text, sure(t, var_(ms, 0.35)), var_(reads, 0.15), rows, o.durum || 'ok']);
    if (o.qid && IZ[o.qid]) { const k = o.qid + '|' + o.plan + '|' + Math.floor(t / HOUR) * HOUR; const p = PS[k] = PS[k] || { qid: o.qid, plan: o.plan, h: Math.floor(t / HOUR) * HOUR, n: 0, ms: 0, rd: 0 }; const son = QL[QL.length - 1]; p.n++; p.ms += son[4]; p.rd += son[5]; } }
  const eris = (t, login, ip, tur, kaynak, kayit) => AL.push([t, login, ip, tur, kaynak, kayit === undefined ? null : kayit]);
  const musteriOku = (t, login, ip) => { const c = 1 + Math.floor(500 * R() * R()); sor(t, login, ip, 'SELECT customer_id, full_name, segment FROM bank_customers WHERE customer_id = ' + c, 3, 4, 1); eris(t, login, ip, 'read', 'bank_customers', c); return c; };
  const hesap = () => 100001 + bi(0, 848);
  const AD = ['Ay', 'Ka', 'De', 'Ce', 'Me', 'Yi', 'Ha', 'Ze'], SEH = ['Ankara', 'Bursa', 'İzmir', 'Kayseri', 'Konya'];
  function oturum(t0) { const ip = bp(IP_APP); let t = t0 + bi(0, 50) * MIN; const c = 1 + Math.floor(500 * R() * R());
    for (let i = bi(1, 4); i > 0; i--) { sor(t, 'svc_portal', ip, 'SELECT customer_id, full_name, segment FROM bank_customers WHERE customer_id = ' + c, 3, 4, 1); eris(t, 'svc_portal', ip, 'read', 'bank_customers', c); t += bi(40, 200) * 1000; }
    sor(t, 'svc_portal', ip, 'SELECT account_id, account_type, status FROM bank_accounts WHERE customer_id = ' + c, 4, 6, bi(1, 3)); t += bi(5, 40) * 1000;
    for (let i = bi(1, 2); i > 0; i--) { const h = hesap();
      if (t >= YAYIN) sor(t, 'svc_portal', ip, "SELECT * FROM bank_txns WHERE CAST(account_id AS VARCHAR(10)) = '" + h + "' ORDER BY txn_time DESC", 180, 390, 20, { qid: 11, plan: 41 });
      else sor(t, 'svc_portal', ip, 'SELECT TOP 20 txn_id, txn_time, amount FROM bank_txns WHERE account_id = ' + h + ' ORDER BY txn_time DESC', 12, 40, 20, { qid: 3, plan: 5 });
      t += bi(5, 60) * 1000; }
    if (R() < 0.25) { sor(t, 'svc_portal', ip, "SELECT customer_id, full_name FROM bank_customers WHERE full_name LIKE '" + bp(AD) + "%'", 10, 30, bi(2, 20)); t += 2000; }
    if (R() < 0.1) { sor(t, 'svc_portal', ip, "UPDATE bank_customers SET city = '" + bp(SEH) + "' WHERE customer_id = " + c, 5, 8, 1); eris(t, 'svc_portal', ip, 'write', 'bank_customers', c); t += bi(30, 120) * 1000; if (R() < 0.7) { sor(t, 'svc_portal', ip, 'SELECT customer_id, full_name, segment FROM bank_customers WHERE customer_id = ' + c, 3, 4, 1); eris(t, 'svc_portal', ip, 'read', 'bank_customers', c); t += 2000; } }
    sor(t, 'svc_portal', ip, "INSERT INTO app_session (customer_id, started_at) VALUES (" + c + ", '" + fmt(t) + "')", 3, 3, 1); }
  /* Uygulama trafiği, gün ve saate göre */
  for (let t = T0; t < TEND; t += HOUR) { const d = new Date(t), hr = d.getUTCHours(), wd = d.getUTCDay(), tatil = wd === 0 || wd === 6;
    const oran = (hr >= 8 && hr < 18 ? 1 : hr >= 18 && hr < 23 ? 0.35 : 0.05) * (tatil ? 0.4 : 1); const n = Math.floor(11 * oran + R()); for (let i = 0; i < n; i++) oturum(t);
    if (!tatil && hr >= 7 && hr <= 18) { const plan = t >= gun(12, 6) ? 12 : 11;
      const adet = bi(1, 3); for (let i = 0; i < adet; i++) { const ay = (i % 2) ? "'2024-11-01' AND t.txn_time < '2024-12-01'" : "'2024-10-01' AND t.txn_time < '2024-11-01'"; sor(t + (5 + i * 18) * MIN, 'svc_rapor', IP_RAPOR, 'SELECT t.txn_type, SUM(t.amount) AS toplam FROM bank_txns t WHERE t.txn_time >= ' + ay + ' GROUP BY t.txn_type', plan === 11 ? 40 : 1800, plan === 11 ? 60 : 9000, 8, { qid: 8, plan }); }
      const pk = (d.getUTCDate() % 2) ? 31 : 32; for (let i = bi(1, 6); i > 0; i--) { const s = R() < 0.3 ? 12 : bi(1, 11); sor(t + bi(0, 55) * MIN, 'svc_rapor', IP_RAPOR, 'SELECT c.customer_id, COUNT(*) AS islem FROM bank_customers c JOIN bank_accounts a ON a.customer_id = c.customer_id WHERE c.branch_id = ' + s + ' GROUP BY c.customer_id', pk === 32 ? 90 : s === 12 ? 300 : 15, pk === 32 ? 391 : s === 12 ? 1500 : 40, s === 12 ? 95 : 30, { qid: 9, plan: pk }); } }
    if (!tatil && hr === 7) { const plan = t >= gun(6) ? 22 : 21; sor(t + 30 * MIN, 'svc_rapor', IP_RAPOR, "SELECT branch_id, COUNT(*) AS musteri FROM bank_customers WHERE joined_date >= '2024-01-01' GROUP BY branch_id", plan === 21 ? 60 : 20, plan === 21 ? 200 : 70, 12, { qid: 7, plan }); }
    if (hr === 0) { for (const l of ['svc_portal', 'svc_rapor']) eris(t + bi(1, 8) * MIN, l, l === 'svc_portal' ? IP_APP[0] : IP_RAPOR, 'login_ok', 'sunucu'); }
    if (hr === 2) { const dun = new Date(t - 86400000).toISOString().slice(0, 10), bug = d.toISOString().slice(0, 10); eris(t, 'svc_etl', IP_ETL, 'login_ok', 'sunucu'); sor(t + 2 * MIN, 'svc_etl', IP_ETL, "INSERT INTO dw_hareket SELECT * FROM bank_txns WHERE txn_time >= '" + dun + "' AND txn_time < '" + bug + "'", 45000, 60000, 3500, { qid: 10, plan: 51 }); }
  }
  /* Haftalık ETL: pazar gecesi müşterileri sırayla okur. Tarama gibi görünür ama planlı iştir. */
  { const t0 = gun(10, 3); eris(t0 - 5000, 'svc_etl', IP_ETL, 'login_ok', 'sunucu'); for (let c = 1; c <= 500; c++) { const t = t0 + c * 1000; sor(t, 'svc_etl', IP_ETL, 'SELECT customer_id, full_name, segment FROM bank_customers WHERE customer_id = ' + c, 3, 4, 1); eris(t, 'svc_etl', IP_ETL, 'read', 'bank_customers', c); } }
  /* Analistler */
  for (let d = 4; d <= 12; d++) { const wd = new Date(gun(d)).getUTCDay(); if (wd === 0 || wd === 6) continue;
    for (const a of Object.keys(AN)) { const ip = AN[a]; let t = gun(d, 8, bi(25, 59), bi(0, 59)); if (d === 6 && a === 'an_selin') { for (let i = 0; i < 3; i++) { eris(gun(d, 9, 2, 5 + i * 14), a, ip, 'login_fail', 'sunucu'); } t = gun(d, 9, 2, 50); }
      if (d === 12 && t >= TEND) continue; eris(t, a, ip, 'login_ok', 'sunucu');
      for (let i = bi(3, 7); i > 0; i--) { t += bi(8, 70) * MIN; if (t >= TEND) break; const k = R();
        if (k < 0.4) sor(t, a, ip, "SELECT COUNT(*) AS adet FROM bank_txns WHERE txn_type = '" + bp(['fatura', 'atm', 'maas', 'faiz']) + "' AND txn_time >= '2024-11-0" + bi(1, 4) + "'", 40, 391, 1);
        else if (k < 0.7) { const n = bi(2, 5); const ids = []; for (let j = 0; j < n; j++) ids.push(bi(1, 42284)); sor(t, a, ip, 'SELECT txn_id, amount FROM bank_txns WHERE txn_id IN (' + ids.join(', ') + ')', 3, 3 * n, n); }
        else musteriOku(t, a, ip); } } }
  eris(gun(6, 18, 22), 'an_ece', AN.an_ece, 'login_ok', 'sunucu');
  /* Cumartesi çalışan analist: mesai dışı ama saldırı işareti yok. Sormadan hüküm verilmez. */
  { let t = gun(9, 11, 15); eris(t, 'an_derya', AN.an_derya, 'login_ok', 'sunucu'); for (let i = 0; i < 5; i++) { t += 4 * MIN; musteriOku(t, 'an_derya', AN.an_derya); } }
  /* Bakım */
  eris(gun(9, 1), 'dba_kaan', '10.30.2.10', 'login_ok', 'sunucu'); sor(gun(9, 1, 5), 'dba_kaan', '10.30.2.10', 'ALTER INDEX ALL ON bank_txns REBUILD', 90000, 30000, 0); sor(gun(9, 1, 20), 'dba_kaan', '10.30.2.10', 'UPDATE STATISTICS bank_customers', 4000, 800, 0);
  eris(BAKIM - 60000, 'svc_bakim', IP_BAKIM, 'login_ok', 'sunucu'); sor(BAKIM, 'svc_bakim', IP_BAKIM, 'UPDATE STATISTICS bank_txns', 20000, 4000, 0);
  /* Kapalı hesap: eski iş her 30 dakikada bir bağlanmayı deniyor. Çok başarısız giriş, ama saldırı değil. */
  for (let t = T0 + 7 * MIN; t < TEND; t += 30 * MIN) eris(t, 'svc_eski', IP_ESKI, 'login_fail', 'sunucu');
  /* Pazartesi akşamı arama kutusunda enjeksiyon denemesi: portal aramayı metin birleştirerek kuruyor (yalnız günlükte iz bırakır) */
  { const A = "SELECT customer_id, full_name FROM bank_customers WHERE full_name LIKE '"; let t = gun(11, 21, 10, 12);
    [[A + "a'%'", 'hata', 0], [A + "a''%'", 'ok', 0], [A + "a'%'", 'hata', 0], [A + "a' OR '1'='1%'", 'ok', 500], [A + "a' OR '1'='1%'", 'ok', 500], [A + "a'--%'", 'hata', 0]].forEach(x => { sor(t, 'svc_portal', IP_APP[0], x[0], 10, x[2] ? 45 : 30, x[2], { durum: x[1] }); t += bi(40, 110) * 1000; }); }
  /* Salı sabahı: dış adresten parola deneme, sonra başarılı giriş ve ardışık okuma */
  { let t = gun(12, 5, 48, 3); const hedef = ['sa', 'admin', 'an_derya', 'an_ece', 'svc_rapor', 'an_selin'];
    for (const h of hedef) for (let i = 0; i < 4; i++) { eris(t, h, IP_DIS, 'login_fail', 'sunucu'); t += bi(4, 11) * 1000; }
    for (let i = 0; i < 64; i++) { eris(t, 'an_mert', IP_DIS, 'login_fail', 'sunucu'); t += bi(5, 11) * 1000; }
    eris(t, 'an_mert', IP_DIS, 'login_ok', 'sunucu');
    t = TARAMA0; for (let c = 120; c <= 410; c++) { sor(t, 'an_mert', IP_DIS, 'SELECT * FROM bank_customers WHERE customer_id = ' + c, 3, 3, 1); eris(t, 'an_mert', IP_DIS, 'read', 'bank_customers', c); t += bi(5, 9) * 1000; } }
  const zs = (a, b) => a[0] - b[0];
  const ql = QL.filter(r => r[0] < TEND).sort(zs).map((r, i) => [i + 1, fmt(r[0]), r[1], r[2], r[3], r[4], r[5], r[6], r[7]]);
  const al = AL.filter(r => r[0] < TEND).sort(zs).map((r, i) => [i + 1, fmt(r[0]), r[1], r[2], r[3], r[4], r[5]]);
  const ps = Object.values(PS).filter(p => p.h < TEND).sort((a, b) => a.h - b.h || a.qid - b.qid || a.plan - b.plan).map(p => [p.qid, IZ[p.qid], p.plan, fmt(p.h), p.n, Math.round(p.ms / p.n), Math.round(p.rd / p.n)]);
  const lg = [['svc_portal', 'uygulama', 'Portal', 1, 'aktif'], ['svc_rapor', 'servis', 'Raporlama', 1, 'aktif'], ['svc_etl', 'servis', 'Veri', 1, 'aktif'], ['svc_bakim', 'servis', 'DBA', 1, 'aktif'], ['svc_eski', 'servis', 'Veri', 1, 'kapalı'], ['dba_kaan', 'dba', 'DBA', 1, 'aktif'], ['an_derya', 'analist', 'Analitik', 0, 'aktif'], ['an_ece', 'analist', 'Analitik', 0, 'aktif'], ['an_mert', 'analist', 'Analitik', 0, 'aktif'], ['an_selin', 'analist', 'Analitik', 0, 'aktif']];
  let sql = `
CREATE TABLE ops_logins (login_name TEXT PRIMARY KEY, kind TEXT NOT NULL, team TEXT NOT NULL, off_hours_ok INTEGER NOT NULL, status TEXT NOT NULL);
CREATE TABLE ops_query_log (log_id INTEGER PRIMARY KEY, logged_at TEXT NOT NULL, login_name TEXT NOT NULL, client_ip TEXT NOT NULL, query_text TEXT NOT NULL, duration_ms INTEGER NOT NULL, logical_reads INTEGER NOT NULL, row_count INTEGER NOT NULL, status TEXT NOT NULL);
CREATE TABLE ops_access_log (event_id INTEGER PRIMARY KEY, event_at TEXT NOT NULL, login_name TEXT NOT NULL, client_ip TEXT NOT NULL, event_type TEXT NOT NULL, resource TEXT NOT NULL, record_id INTEGER);
CREATE TABLE ops_plan_stats (query_id INTEGER NOT NULL, query_name TEXT NOT NULL, plan_id INTEGER NOT NULL, window_start TEXT NOT NULL, exec_count INTEGER NOT NULL, avg_ms INTEGER NOT NULL, avg_reads INTEGER NOT NULL, PRIMARY KEY (query_id, plan_id, window_start));
`;
  sql += ins('ops_logins', ['login_name', 'kind', 'team', 'off_hours_ok', 'status'], lg);
  sql += ins('ops_query_log', ['log_id', 'logged_at', 'login_name', 'client_ip', 'query_text', 'duration_ms', 'logical_reads', 'row_count', 'status'], ql);
  sql += ins('ops_access_log', ['event_id', 'event_at', 'login_name', 'client_ip', 'event_type', 'resource', 'record_id'], al);
  sql += ins('ops_plan_stats', ['query_id', 'query_name', 'plan_id', 'window_start', 'exec_count', 'avg_ms', 'avg_reads'], ps);
  root.SQLP_SEED = (root.SQLP_SEED || '') + sql;
  Object.assign(root.SQLP_SCHEMA_NOTES = root.SQLP_SCHEMA_NOTES || {}, {
    ops_logins: 'KURGU. Hayali portalın veritabanı hesapları. off_hours_ok: mesai dışında çalışması beklenen hesap (1/0). Denemelerde geçen sa ve admin bu tabloda yoktur',
    ops_query_log: 'KURGU. Sorgu günlüğü (4-12 Kasım 2024). query_text sabit değerleri açık hâliyle tutar; süre ve okuma üreteçten gelir, gerçek ölçüm değildir. Yalnız birincil anahtar var, indeks görevleri içindir',
    ops_access_log: 'KURGU. Erişim günlüğü: login_ok, login_fail, read, write. record_id okunan ya da yazılan bank_customers kaydıdır. IP adresleri belgeleme ve özel ağ aralıklarındandır',
    ops_plan_stats: 'KURGU. Query Store çalışma istatistiklerini basitleştirerek taklit eder: izlenen altı sorgunun plan ve saat başına çalışma sayısı, ortalama süre (ms) ve okuma. Gerçek katalog görünümü değildir'
  });
  Object.assign(root.SQLP_COLMETA = root.SQLP_COLMETA || {}, {
    ops_logins: [['login_name', 'text(20)', 'Hesap', 'pk'], ['kind', 'text(10)', 'uygulama / servis / analist / dba'], ['team', 'text(12)', 'Ekip'], ['off_hours_ok', 'int', 'Mesai dışı çalışması beklenir (1/0)'], ['status', 'text(8)', 'aktif / kapalı']],
    ops_query_log: [['log_id', 'int', 'Kayıt', 'pk'], ['logged_at', 'datetime', 'Zaman'], ['login_name', 'text(20)', 'Hesap'], ['client_ip', 'text(15)', 'Bağlanan adres'], ['query_text', 'text(300)', 'Sorgu metni (sabitler açık)'], ['duration_ms', 'int', 'Süre (ms)'], ['logical_reads', 'int', 'Okunan sayfa'], ['row_count', 'int', 'Dönen ya da değişen satır'], ['status', 'text(4)', 'ok / hata']],
    ops_access_log: [['event_id', 'int', 'Olay', 'pk'], ['event_at', 'datetime', 'Zaman'], ['login_name', 'text(20)', 'Hesap'], ['client_ip', 'text(15)', 'Bağlanan adres'], ['event_type', 'text(10)', 'login_ok / login_fail / read / write'], ['resource', 'text(20)', 'sunucu ya da tablo'], ['record_id', 'int', 'Okunan ya da yazılan kayıt (girişte boş)', 'fk:bank_customers.customer_id']],
    ops_plan_stats: [['query_id', 'int', 'İzlenen sorgu', 'pk'], ['query_name', 'text(24)', 'Sorgunun adı'], ['plan_id', 'int', 'Plan', 'pk'], ['window_start', 'datetime', 'Saat başlangıcı', 'pk'], ['exec_count', 'int', 'Çalışma sayısı'], ['avg_ms', 'int', 'Ortalama süre (ms)'], ['avg_reads', 'int', 'Ortalama okuma']]
  });
})(typeof window !== 'undefined' ? window : globalThis);
