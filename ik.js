/* Kesit SQL — Pusula A.Ş. İnsan Kaynakları veri seti (hayali; deterministik üretim)
   2019–2024 arası 2.199 çalışanın işe giriş, görev, maaş, performans, izin, işe alım, anket ve eğitim kayıtları.
   İçine gerçekçi örüntüler yerleştirilmiştir: ilk yılda yüksek ayrılma, bant altı maaş ve zayıf yönetici puanıyla artan
   gönüllü ayrılma, seviye karışımından doğan ham ücret farkı, Pazartesi hastalık izni yığılması, referans kaynağının kalitesi. */
(function (root) {
  function rng(seed) { return function () { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const R = rng(20190101);
  const bi = (a, b) => a + Math.floor(R() * (b - a + 1));
  const bp = a => a[Math.floor(R() * a.length)];
  const wc = arr => { const tot = arr.reduce((a, x) => a + x[1], 0); let v = R() * tot; for (const x of arr) { v -= x[1]; if (v < 0) return x[0]; } return arr[0][0]; };
  const q = v => v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : "'" + String(v).replace(/'/g, "''") + "'";
  const pad = n => String(n).padStart(2, '0');
  const ds = t => { const d = new Date(t); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); };
  const DAY = 86400000, T0 = Date.UTC(2019, 0, 1), TEND = Date.UTC(2024, 11, 31);
  const ins = (t, cols, rows) => { let s = ''; for (let i = 0; i < rows.length; i += 500) s += 'INSERT INTO ' + t + ' (' + cols.join(',') + ') VALUES\n' + rows.slice(i, i + 500).map(r => '(' + r.map(q).join(',') + ')').join(',\n') + ';\n'; return s; };
  const r100 = x => Math.round(x / 100) * 100;
  const wd = t => new Date(t).getUTCDay();
  const nextWork = t => { while (wd(t) === 0 || wd(t) === 6) t += DAY; return t; };
  const anyWork = t => { const k = wd(t); return k === 0 || k === 6 ? t + (1 + Math.floor(R() * 5) + (k === 0 ? 0 : 1)) * DAY - (k === 0 ? 0 : 0) : t; };

  let sql = `
CREATE TABLE ik_departments (dept_id INTEGER PRIMARY KEY, name TEXT NOT NULL, function_area TEXT NOT NULL, parent_id INTEGER REFERENCES ik_departments(dept_id));
CREATE TABLE ik_positions (position_id INTEGER PRIMARY KEY, title TEXT NOT NULL, dept_id INTEGER NOT NULL REFERENCES ik_departments(dept_id), level INTEGER NOT NULL, band_min REAL NOT NULL, band_max REAL NOT NULL);
CREATE TABLE ik_employees (emp_id INTEGER PRIMARY KEY, full_name TEXT NOT NULL, gender TEXT NOT NULL, birth_year INTEGER, city TEXT NOT NULL, education TEXT, hire_date TEXT NOT NULL, term_date TEXT, term_type TEXT, term_reason TEXT, position_id INTEGER NOT NULL REFERENCES ik_positions(position_id), manager_id INTEGER REFERENCES ik_employees(emp_id), hire_source TEXT NOT NULL, work_mode TEXT NOT NULL);
CREATE TABLE ik_job_history (emp_id INTEGER NOT NULL REFERENCES ik_employees(emp_id), position_id INTEGER NOT NULL REFERENCES ik_positions(position_id), start_date TEXT NOT NULL, end_date TEXT, change_type TEXT NOT NULL, PRIMARY KEY (emp_id, start_date));
CREATE TABLE ik_salaries (emp_id INTEGER NOT NULL REFERENCES ik_employees(emp_id), effective_date TEXT NOT NULL, monthly_gross REAL NOT NULL, reason TEXT NOT NULL, PRIMARY KEY (emp_id, effective_date));
CREATE TABLE ik_reviews (emp_id INTEGER NOT NULL REFERENCES ik_employees(emp_id), review_year INTEGER NOT NULL, rating INTEGER NOT NULL, potential TEXT, reviewer_id INTEGER REFERENCES ik_employees(emp_id), PRIMARY KEY (emp_id, review_year));
CREATE TABLE ik_leaves (leave_id INTEGER PRIMARY KEY, emp_id INTEGER NOT NULL REFERENCES ik_employees(emp_id), leave_type TEXT NOT NULL, start_date TEXT NOT NULL, days INTEGER NOT NULL);
CREATE TABLE ik_requisitions (req_id INTEGER PRIMARY KEY, position_id INTEGER NOT NULL REFERENCES ik_positions(position_id), opened_date TEXT NOT NULL, closed_date TEXT, status TEXT NOT NULL);
CREATE TABLE ik_candidates (cand_id INTEGER PRIMARY KEY, req_id INTEGER NOT NULL REFERENCES ik_requisitions(req_id), source TEXT NOT NULL, applied_date TEXT NOT NULL, stage TEXT NOT NULL, stage_date TEXT, emp_id INTEGER REFERENCES ik_employees(emp_id));
CREATE TABLE ik_survey (emp_id INTEGER NOT NULL REFERENCES ik_employees(emp_id), wave TEXT NOT NULL, enps INTEGER, engagement REAL, manager_score REAL, PRIMARY KEY (emp_id, wave));
CREATE TABLE ik_training (emp_id INTEGER NOT NULL REFERENCES ik_employees(emp_id), course TEXT NOT NULL, completed_date TEXT NOT NULL, hours INTEGER NOT NULL);
`;
  /* Organizasyon */
  const DEPTS = [
    [1, 'Genel Müdürlük', 'Yönetim', null], [2, 'Satış', 'Ticari', 1], [3, 'Kurumsal Satış', 'Ticari', 2], [4, 'Mağaza Operasyonları', 'Operasyon', 1],
    [5, 'Çağrı Merkezi', 'Operasyon', 4], [6, 'Lojistik', 'Operasyon', 4], [7, 'Yazılım Geliştirme', 'Teknoloji', 1], [8, 'Veri ve Analitik', 'Teknoloji', 7],
    [9, 'BT Altyapı', 'Teknoloji', 7], [10, 'Finans', 'Destek', 1], [11, 'İnsan Kaynakları', 'Destek', 1], [12, 'Pazarlama', 'Ticari', 2]
  ];
  sql += ins('ik_departments', ['dept_id', 'name', 'function_area', 'parent_id'], DEPTS);
  const LVN = { 1: 'Uzman Yardımcısı', 2: 'Uzman', 3: 'Kıdemli Uzman', 4: 'Takım Lideri', 5: 'Müdür', 6: 'Direktör' };
  const DT = { 2: 'Satış', 3: 'Kurumsal Satış', 4: 'Mağaza', 5: 'Müşteri Temsilcisi', 6: 'Lojistik', 7: 'Yazılım', 8: 'Veri', 9: 'Sistem', 10: 'Finans', 11: 'İK', 12: 'Pazarlama', 1: 'Strateji' };
  const BASE = { 1: 34000, 2: 30000, 3: 36000, 4: 26000, 5: 22000, 6: 25000, 7: 45000, 8: 47000, 9: 41000, 10: 38000, 11: 34000, 12: 35000 };
  const LMULT = { 1: 0.8, 2: 1, 3: 1.3, 4: 1.65, 5: 2.2, 6: 3.1 };
  const pos = []; const PM = {}; let pid = 0;
  DEPTS.forEach(([d]) => { const maxL = d === 1 ? 6 : [5, 6].includes(d) ? 5 : 6; for (let lv = 1; lv <= maxL; lv++) { if (d === 1 && lv < 4) continue; pid++; const mid = BASE[d] * LMULT[lv]; const row = [pid, (lv >= 4 ? LVN[lv] + ' · ' : '') + (lv < 4 ? (lv === 1 ? DT[d] + ' Uzman Yardımcısı' : lv === 2 ? DT[d] + ' Uzmanı' : 'Kıdemli ' + DT[d] + ' Uzmanı') : DT[d]), d, lv, r100(mid * 0.85), r100(mid * 1.2)]; pos.push(row); PM[d + '-' + lv] = row; } });

  /* Kişiler */
  const fm = ['Ahmet', 'Mehmet', 'Mustafa', 'Ali', 'Emre', 'Burak', 'Can', 'Murat', 'Kerem', 'Yusuf', 'Oğuz', 'Serkan', 'Deniz', 'Barış', 'Tolga', 'Onur', 'Eren', 'Kaan', 'Hakan', 'Selim', 'Umut', 'Arda', 'Efe', 'Mert', 'Cem', 'Volkan', 'Sinan', 'Levent'];
  const ff = ['Ayşe', 'Fatma', 'Zeynep', 'Elif', 'Merve', 'Esra', 'Selin', 'Ebru', 'Derya', 'Gamze', 'Buse', 'Ece', 'Damla', 'İrem', 'Melis', 'Özge', 'Pınar', 'Sevgi', 'Tuğba', 'Yasemin', 'Nur', 'Cansu', 'Defne', 'Ilgın', 'Aslı', 'Burcu'];
  const ln = ['Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Yıldız', 'Yıldırım', 'Öztürk', 'Aydın', 'Özdemir', 'Arslan', 'Doğan', 'Kılıç', 'Aslan', 'Çetin', 'Kara', 'Koç', 'Kurt', 'Özkan', 'Şimşek', 'Polat', 'Güneş', 'Ergin', 'Tunç', 'Bal', 'Ekici', 'Acar', 'Uysal', 'Bozkurt', 'Karaca', 'Toprak', 'Sezer'];
  /* Bölüm ağırlıkları ve davranış katsayıları */
  const DW = [[2, 9], [3, 4], [4, 16], [5, 14], [6, 9], [7, 11], [8, 6], [9, 5], [10, 6], [11, 4], [12, 5]];
  const ATT = { 2: 1.5, 3: 1.0, 4: 1.4, 5: 2.1, 6: 1.3, 7: 0.9, 8: 1.0, 9: 0.7, 10: 0.6, 11: 0.8, 12: 1.0 };
  const CITY = { 4: [['İstanbul', 45], ['Ankara', 20], ['İzmir', 15], ['Bursa', 10], ['Antalya', 10]], 5: [['İstanbul', 40], ['Kocaeli', 35], ['Eskişehir', 25]], 6: [['Kocaeli', 60], ['İstanbul', 25], ['İzmir', 15]] };
  const emps = []; const E = {}; let eid = 0;
  const mkEmp = (dept, lv, hireT, o) => {
    eid++; const g = R() < (dept === 5 ? 0.62 : dept === 7 || dept === 9 ? 0.3 : 0.47) ? 'K' : 'E';
    const name = o.name || (g === 'K' ? bp(ff) : bp(fm)) + ' ' + bp(ln);
    const age = Math.max(21, Math.min(60, Math.round(23 + lv * 4.5 + (R() - 0.5) * 10)));
    const city = CITY[dept] ? wc(CITY[dept]) : wc([['İstanbul', 75], ['Ankara', 15], ['İzmir', 10]]);
    const edu = wc(lv >= 4 ? [['Lisans', 60], ['Yüksek lisans', 38], ['Doktora', 2]] : dept === 5 || dept === 4 || dept === 6 ? [['Lise', 45], ['Ön lisans', 25], ['Lisans', 30]] : [['Lisans', 70], ['Yüksek lisans', 25], ['Ön lisans', 5]]);
    const src = o.src || wc([['kariyer sitesi', 38], ['LinkedIn', 22], ['referans', 18], ['ajans', 10], ['üniversite', 7], ['iç başvuru', 5]]);
    const mode = [7, 8, 9, 12, 10].includes(dept) ? wc([['hibrit', 60], ['uzaktan', 20], ['ofis', 20]]) : dept === 4 || dept === 6 ? 'ofis' : wc([['ofis', 70], ['hibrit', 30]]);
    const e = { id: eid, name, g, by: new Date(hireT).getUTCFullYear() - age, city, edu, hire: hireT, dept, lv, src, mode, mgr: null, term: null, ttype: null, treason: null, jobs: [], sal: [], att: ATT[dept] * (src === 'referans' ? 0.6 : src === 'ajans' ? 1.2 : 1) * (0.6 + R() * 0.8), perf: Math.max(1, Math.min(5, 3 + (R() - 0.5) * 2.4 + (src === 'referans' ? 0.35 : 0))) };
    if (o.manager) e.isMgr = true;
    emps.push(e); E[eid] = e; return e;
  };
  /* Genel müdür ve yöneticiler (2019 öncesi işe girenler) */
  const gm = mkEmp(1, 6, Date.UTC(2012, 2, 1), { name: 'Nevzat Aydın', manager: true }); gm.g = 'E';
  const heads = {};
  DEPTS.slice(1).forEach(([d]) => { const lv = [2, 4, 7, 10].includes(d) ? 6 : 5; const h = mkEmp(d, lv, Date.UTC(bi(2010, 2018), bi(0, 11), bi(1, 28)), { manager: true }); h.mgr = [3, 12].includes(d) ? null : [5, 6].includes(d) ? null : gm.id; heads[d] = h; });
  [3, 12].forEach(d => heads[d].mgr = heads[2].id); [5, 6].forEach(d => heads[d].mgr = heads[4].id); [8, 9].forEach(d => heads[d].mgr = heads[7].id);
  /* Hikaye: Veri ve Analitik'in yöneticisi 2023 ortasında değişiyor */
  const oldVeri = heads[8]; oldVeri.name = 'Gülşen Ateş'; oldVeri.g = 'K';
  oldVeri.term = Date.UTC(2023, 5, 30); oldVeri.ttype = 'gönüllü'; oldVeri.treason = 'yurt dışı';
  const newVeri = mkEmp(8, 5, Date.UTC(2023, 6, 3), { name: 'Rıza Karabulut', manager: true, src: 'ajans' }); newVeri.g = 'E'; newVeri.mgr = heads[7].id; newVeri.att = 0.1; newVeri.perf = 3.2;
  /* Takım liderleri */
  const leads = {};
  DEPTS.slice(1).forEach(([d]) => { const k = d === 4 ? 6 : d === 5 ? 5 : [2, 6, 7].includes(d) ? 3 : 2; leads[d] = []; for (let i = 0; i < k; i++) { const l = mkEmp(d, 4, Date.UTC(bi(2013, 2019), bi(0, 11), bi(1, 28)), { manager: true }); l.mgr = heads[d].id; l.att = 0.5; leads[d].push(l); } });
  /* İşe alım akışı: başlangıç kadrosu + yıllık alımlar */
  const pickLv = () => wc([[1, 34], [2, 33], [3, 22]]);
  const startStaff = 820;
  for (let i = 0; i < startStaff; i++) { const d = wc(DW); mkEmp(d, pickLv(), Date.UTC(bi(2012, 2018), bi(0, 11), bi(1, 28)), {}); }
  const hireYears = { 2019: 230, 2020: 140, 2021: 220, 2022: 280, 2023: 240, 2024: 210 };
  const hiresByYear = [];
  Object.keys(hireYears).forEach(y => { for (let i = 0; i < hireYears[y]; i++) { const d = wc(DW); const t = nextWork(Date.UTC(+y, 0, 1) + Math.floor(R() * 360) * DAY); hiresByYear.push(mkEmp(d, pickLv(), t, {})); } });
  /* Hikaye için Veri ekibine 2022–2023'te ek alım */
  for (let i = 0; i < 14; i++) hiresByYear.push(mkEmp(8, wc([[1, 3], [2, 5], [3, 3]]), nextWork(Date.UTC(2022, 0, 10) + i * 40 * DAY), { src: i % 3 ? 'LinkedIn' : 'referans' }));
  /* Yönetici atama */
  const mgrOf = (e, t) => { if (e.dept === 8 && !e.isMgr) return t >= Date.UTC(2023, 6, 3) ? newVeri.id : oldVeri.id; const ls = leads[e.dept] || []; return ls.length ? ls[e.id % ls.length].id : heads[e.dept] ? heads[e.dept].id : gm.id; };
  /* Kariyer, maaş, ayrılma simülasyonu */
  const bandOf = (d, lv) => PM[d + '-' + lv];
  const yearInc = { 2019: 0.16, 2020: 0.14, 2021: 0.22, 2022: 0.55, 2023: 0.48, 2024: 0.38 };
  const comp = { mid: (d, lv, y) => { const p = bandOf(d, lv); return (p[4] + p[5]) / 2 * idx(y); } };
  function idx(y) { let f = 1; for (let k = 2019; k <= Math.min(y, 2024); k++) f *= k === 2019 ? 1 : (1 + yearInc[k] * 0.92); return f / 1.9; }
  emps.forEach(e => {
    const startT = Math.max(e.hire, T0); const sy = new Date(startT).getUTCFullYear();
    let lv = e.lv; let d = e.dept;
    let cr = e.isMgr ? 0.95 + R() * 0.2 : wc([[0.82, 25], [0.9, 30], [1.0, 30], [1.08, 15]]) * (e.g === 'K' ? 0.975 : 1) * (0.97 + R() * 0.06);
    if (e.dept === 8 && !e.isMgr && R() < 0.6) cr *= 0.93;
    let sal = r100(comp.mid(d, lv, sy) * cr);
    e.sal.push([e.id, ds(e.hire < T0 ? T0 : e.hire), sal, e.hire < T0 ? 'devir (2019 açılış)' : 'işe giriş']);
    e.jobs.push({ p: bandOf(d, lv)[0], s: e.hire, type: 'işe giriş' });
    for (let y = sy + 1; y <= 2025; y++) {
      const t = Date.UTC(y, 0, 1);
      /* ayrılma kontrolü (her yıl) */
      if (!e.term && !e.isMgr) {
        const tenure = (t - e.hire) / (365 * DAY);
        const bandLow = cr < 0.88 ? 1.7 : cr < 0.95 ? 1.2 : 0.85;
        let p = 0.09 * e.att * bandLow * (tenure < 1.2 ? 1.9 : tenure > 6 ? 0.6 : 1) * (e.perf < 2.2 ? 1.6 : 1);
        if (e.dept === 8 && y === 2025) p = 0.27;
        if (y === 2020) p *= 0.6;
        if (R() < p) {
          const vol = R() < (e.perf < 2.2 ? 0.45 : 0.82);
          const tt = nextWork(Date.UTC(y - 1, 0, 1) + Math.floor((0.05 + R() * 0.9) * 365) * DAY);
          if (tt > e.hire + 20 * DAY && tt <= TEND) { e.term = tt; e.ttype = vol ? 'gönüllü' : 'gönülsüz'; e.treason = vol ? wc(e.dept === 8 && y === 2025 ? [['rakip firma', 55], ['yönetici', 30], ['ücret', 15]] : [['ücret', 30], ['rakip firma', 25], ['kariyer gelişimi', 20], ['yönetici', 10], ['taşınma', 8], ['eğitim', 7]]) : wc([['performans', 55], ['yeniden yapılanma', 30], ['disiplin', 15]]); }
        }
      }
      if (e.term && e.term < t) break;
      if (y > 2024) break;
      /* terfi */
      const maxL = d === 1 ? 6 : [5, 6].includes(d) ? 5 : 6;
      if (!e.isMgr && lv < 3 && R() < 0.12 + (e.perf - 3) * 0.06) { lv++; const pt = nextWork(t + bi(60, 200) * DAY); if (!e.term || pt < e.term) { e.jobs.push({ p: bandOf(d, lv)[0], s: pt, type: 'terfi' }); sal = r100(Math.max(sal * 1.18, comp.mid(d, lv, y) * cr)); e.sal.push([e.id, ds(pt), sal, 'terfi']); } else lv--; }
      /* bölüm değişikliği */
      if (!e.isMgr && R() < 0.025 && d !== 8) { const nd = wc(DW); if (nd !== d && bandOf(nd, lv)) { const tt = nextWork(t + bi(30, 300) * DAY); if (!e.term || tt < e.term) { d = nd; e.jobs.push({ p: bandOf(d, lv)[0], s: tt, type: 'yatay geçiş' }); } } }
      /* yıllık zam (Ocak) ve 2022–2023 ara zam (Temmuz) */
      const inc = yearInc[y] * (0.8 + (e.perf - 3) * 0.1 + R() * 0.15) * (e.dept === 8 && y >= 2024 ? 0.85 : 1);
      sal = r100(sal * (1 + inc * (y >= 2022 ? 0.62 : 1)));
      e.sal.push([e.id, ds(t), sal, 'yıllık zam']);
      if (y === 2022 || y === 2023) { const tj = Date.UTC(y, 6, 1); if (!e.term || tj < e.term) { sal = r100(sal * (1 + yearInc[y] * 0.38 * (0.9 + R() * 0.2))); e.sal.push([e.id, ds(tj), sal, 'ara zam']); } }
    }
    e.jobs.sort((a, b) => a.s - b.s); e.jobs = e.jobs.filter((j, i, arr) => !arr[i + 1] || ds(arr[i + 1].s) !== ds(j.s));
    e.d = d; e.lvl = lv; e.pos = e.jobs[e.jobs.length - 1].p;
  });
  /* 2024 maaş bantları: pozisyondaki aktif çalışanların medyan maaşına göre */
  pos.forEach(p => { const xs = emps.filter(e => e.pos === p[0] && !e.term).map(e => e.sal[e.sal.length - 1][2]).sort((a, b) => a - b); const med = xs.length ? xs[Math.floor(xs.length / 2)] : p[4] * 2.2; const mid = med / 0.97; p[4] = r100(mid * 0.85); p[5] = r100(mid * 1.2); });
  sql += ins('ik_positions', ['position_id', 'title', 'dept_id', 'level', 'band_min', 'band_max'], pos);
  /* Bant dışına çok taşan maaşlar için Temmuz 2024 düzeltmesi */
  const PB = {}; pos.forEach(p => PB[p[0]] = p);
  emps.forEach(e => { if (e.term && e.term < Date.UTC(2024, 6, 1)) return; const p = PB[e.pos]; const mid = (p[4] + p[5]) / 2; const last = e.sal[e.sal.length - 1][2]; const lo = mid * (0.78 + R() * 0.04), hi = mid * (1.22 + R() * 0.04); if (last < lo) e.sal.push([e.id, '2024-07-01', r100(lo), 'düzeltme']); else if (last > hi) e.sal.push([e.id, '2024-07-01', r100(hi), 'düzeltme']); });
  /* yöneticiler: zaman içinde sabit kabul (yalnızca Veri ekibinde değişim) */
  emps.forEach(e => { if (!e.mgr && e !== gm && !e.isMgr) e.mgr = mgrOf(e, e.term || TEND); if (e.isMgr && e.lv === 4) e.mgr = heads[e.dept].id; });
  sql += ins('ik_employees', ['emp_id', 'full_name', 'gender', 'birth_year', 'city', 'education', 'hire_date', 'term_date', 'term_type', 'term_reason', 'position_id', 'manager_id', 'hire_source', 'work_mode'],
    emps.map(e => [e.id, e.name, e.g, e.by, e.city, e.edu, ds(e.hire), e.term ? ds(e.term) : null, e.ttype, e.treason, e.pos, e.mgr, e.src, e.mode]));
  const jh = []; emps.forEach(e => e.jobs.forEach((j, i) => { const nx = e.jobs[i + 1]; jh.push([e.id, j.p, ds(j.s), nx ? ds(nx.s - DAY) : e.term ? ds(e.term) : null, j.type]); }));
  sql += ins('ik_job_history', ['emp_id', 'position_id', 'start_date', 'end_date', 'change_type'], jh);
  const salRows = []; emps.forEach(e => { const seen = new Set(); e.sal.forEach(s => { if (seen.has(s[1])) return; seen.add(s[1]); salRows.push(s); }); });
  sql += ins('ik_salaries', ['emp_id', 'effective_date', 'monthly_gross', 'reason'], salRows);
  /* Performans değerlendirmeleri (yıl sonu; o yıl en az 6 ay çalışanlar). Bir yönetici herkese yüksek puan verir. */
  const rev = []; const generous = leads[2][1];
  emps.forEach(e => { for (let y = 2019; y <= 2024; y++) { const ys = Date.UTC(y, 0, 1), ye = Date.UTC(y, 11, 31); if (e.hire > ye - 180 * DAY) continue; if (e.term && e.term < ye) continue; if (e === gm) continue; const mg = e.dept === 8 && !e.isMgr ? (y >= 2023 ? newVeri : oldVeri) : E[e.mgr] || gm; let r = Math.round(e.perf + (R() - 0.5) * 1.4); if (mg === generous) r = R() < 0.8 ? 5 : 4; r = Math.max(1, Math.min(5, r)); const pv = e.perf + (R() - 0.5) * 1.8 + (2024 - e.by < 32 ? 0.3 : 0); const pot = R() < 0.12 ? null : pv > 3.5 ? 'yüksek' : pv < 2.6 ? 'düşük' : 'orta'; rev.push([e.id, y, r, pot, mg.id]); } });
  sql += ins('ik_reviews', ['emp_id', 'review_year', 'rating', 'potential', 'reviewer_id'], rev);
  /* İzinler: yıllık izin, hastalık (Pazartesi yığılması), mazeret, ücretsiz */
  const lv = []; let lid = 0;
  emps.forEach(e => { for (let y = 2022; y <= 2024; y++) { const ys = Math.max(Date.UTC(y, 0, 1), e.hire), ye = Math.min(Date.UTC(y, 11, 31), e.term || TEND); if (ye - ys < 60 * DAY) continue; const span = (ye - ys) / DAY;
    const ann = R() < 0.07 ? 0 : bi(1, 3); for (let k = 0; k < ann; k++) { const t = anyWork(ys + 3 * DAY + Math.floor(R() * (span - 12)) * DAY); lv.push([++lid, e.id, 'yıllık', ds(t), bi(2, 7)]); }
    const sk = Math.round(R() * 3 * e.att); for (let k = 0; k < sk; k++) { let t = anyWork(ys + 3 * DAY + Math.floor(R() * (span - 6)) * DAY); if (R() < 0.16) { while (wd(t) !== 1) t += DAY; } lv.push([++lid, e.id, 'hastalık', ds(t), wc([[1, 55], [2, 25], [3, 12], [5, 8]])]); }
    if (R() < 0.3) lv.push([++lid, e.id, 'mazeret', ds(nextWork(ys + Math.floor(R() * (span - 3)) * DAY)), bi(1, 3)]);
    if (R() < 0.03) lv.push([++lid, e.id, 'ücretsiz', ds(nextWork(ys + Math.floor(R() * (span - 20)) * DAY)), bi(5, 20)]); } });
  lv.sort((a, b) => a[3] < b[3] ? -1 : a[3] > b[3] ? 1 : a[1] - b[1]); lv.forEach((r, i) => r[0] = i + 1);
  sql += ins('ik_leaves', ['leave_id', 'emp_id', 'leave_type', 'start_date', 'days'], lv);
  /* İşe alım: her 2022–2024 alımı için bir kadro talebi ve aday hunisi; ayrıca açık ve iptal talepler */
  const reqs = [], cands = []; let rq = 0, cd = 0;
  const stageFlow = ['başvuru', 'ön eleme', 'mülakat', 'teklif', 'işe alındı'];
  const srcQ = { 'referans': 0.32, 'LinkedIn': 0.16, 'kariyer sitesi': 0.09, 'ajans': 0.22, 'üniversite': 0.12, 'iç başvuru': 0.4 };
  const addFunnel = (req, opened, hiredEmp, until) => {
    const n = bi(8, 26) + ([7, 8].includes(PM ? 0 : 0) ? 0 : 0);
    for (let k = 0; k < n; k++) { cd++; const src = wc([['kariyer sitesi', 40], ['LinkedIn', 28], ['referans', 10], ['ajans', 9], ['üniversite', 9], ['iç başvuru', 4]]); const ap = opened + Math.floor(R() * 25) * DAY; let st = 0; while (st < 3 && R() < (st === 0 ? 0.45 + srcQ[src] : st === 1 ? 0.5 + srcQ[src] / 2 : 0.35 + srcQ[src])) st++; const stage = st === 3 ? (R() < 0.25 ? 'teklif reddedildi' : 'reddedildi') : st === 0 ? 'reddedildi' : 'reddedildi'; const finalStage = st === 0 ? 'başvuru' : stageFlow[st]; cands.push([cd, req, src, ds(ap), st === 0 ? 'reddedildi' : stage === 'teklif reddedildi' ? 'teklif reddedildi' : 'reddedildi', ds(Math.min(ap + (st + 1) * 6 * DAY, until || TEND)), null, finalStage]); }
    if (hiredEmp) { cd++; cands.push([cd, req, hiredEmp.src === 'iç başvuru' ? 'iç başvuru' : hiredEmp.src === 'üniversite' ? 'üniversite' : hiredEmp.src, ds(opened + bi(2, 15) * DAY), 'işe alındı', ds(hiredEmp.hire), hiredEmp.id, 'işe alındı']); }
  };
  emps.filter(e => e.hire >= Date.UTC(2022, 0, 1) && !e.isMgr).forEach(e => { rq++; const ttf = Math.round((e.src === 'referans' ? 24 : e.src === 'ajans' ? 30 : e.src === 'iç başvuru' ? 18 : 41) * (0.6 + R() * 0.9) * ([7, 8, 9].includes(e.dept) ? 1.35 : 1)); const op = e.hire - ttf * DAY; reqs.push([rq, e.jobs[0].p, ds(op), ds(e.hire), 'dolduruldu']); addFunnel(rq, op, e, e.hire); });
  for (let k = 0; k < 38; k++) { rq++; const d = wc(DW); const p = bandOf(d, pickLv()); const op = nextWork(Date.UTC(2024, 8, 15) + Math.floor(R() * 105) * DAY); reqs.push([rq, p[0], ds(op), null, 'açık']); addFunnel(rq, op, null, TEND); }
  for (let k = 0; k < 25; k++) { rq++; const d = wc(DW); const p = bandOf(d, pickLv()); const op = nextWork(Date.UTC(2022, 0, 1) + Math.floor(R() * 900) * DAY); const cl = op + bi(20, 90) * DAY; reqs.push([rq, p[0], ds(op), ds(cl), 'iptal']); addFunnel(rq, op, null, cl); }
  reqs.sort((a, b) => a[2] < b[2] ? -1 : 1); const RQM = {}; reqs.forEach((r, i) => { RQM[r[0]] = i + 1; r[0] = i + 1; });
  cands.forEach(c => c[1] = RQM[c[1]]); cands.sort((a, b) => a[3] < b[3] ? -1 : a[3] > b[3] ? 1 : a[0] - b[0]); cands.forEach((c, i) => c[0] = i + 1);
  sql += ins('ik_requisitions', ['req_id', 'position_id', 'opened_date', 'closed_date', 'status'], reqs);
  sql += ins('ik_candidates', ['cand_id', 'req_id', 'source', 'applied_date', 'stage', 'stage_date', 'emp_id'], cands.map(c => [c[0], c[1], c[2], c[3], c[7] === 'işe alındı' ? 'işe alındı' : c[4] === 'teklif reddedildi' ? 'teklif reddedildi' : c[7] === 'başvuru' ? 'başvuru' : c[7], c[5], c[6]]));
  /* Bağlılık anketi: 2024-Q2 ve 2024-Q4; katılım ~%80, bazı yanıtlar eksik */
  const sv = [];
  [['2024-Q2', Date.UTC(2024, 4, 15)], ['2024-Q4', Date.UTC(2024, 10, 15)]].forEach(([w, t]) => emps.forEach(e => { if (e.hire > t || (e.term && e.term < t)) return; if (R() > 0.8) return; const mg = e.dept === 8 && !e.isMgr ? newVeri : E[e.mgr]; let ms = 3.9 + (R() - 0.5) * 1.6; if (mg === newVeri) ms -= 1.5; if (mg === generous) ms += 0.3; ms = Math.max(1, Math.min(5, Math.round(ms * 10) / 10)); let eng = Math.max(1, Math.min(5, Math.round((3.6 + (e.perf - 3) * 0.2 + (ms - 3.9) * 0.45 + (R() - 0.5) * 1.2) * 10) / 10)); let en = Math.max(0, Math.min(10, Math.round(7.5 + (eng - 3.6) * 2 + (R() - 0.5) * 3))); sv.push([e.id, w, R() < 0.04 ? null : en, R() < 0.03 ? null : eng, R() < 0.06 ? null : ms]); }));
  sql += ins('ik_survey', ['emp_id', 'wave', 'enps', 'engagement', 'manager_score'], sv);
  /* Eğitimler */
  const COURSES = [['Bilgi Güvenliği Farkındalığı', 2], ['İş Sağlığı ve Güvenliği', 4], ['Etkili Geri Bildirim', 6], ['SQL ile Veri Analizi', 12], ['Satış Görüşmesi Teknikleri', 8], ['Liderliğe Giriş', 16], ['Müşteri Deneyimi', 6], ['Excel İleri Düzey', 10], ['KVKK Temel', 2]];
  const tr = [];
  emps.forEach(e => { const ys = Math.max(e.hire, Date.UTC(2022, 0, 1)), ye = e.term || TEND; if (ye <= ys) return; const n = bi(0, 4); const used = new Set(); for (let k = 0; k < n; k++) { const c = k === 0 ? COURSES[k % 2] : bp(COURSES); if (used.has(c[0])) continue; if (c[0] === 'Liderliğe Giriş' && e.lvl < 3) continue; if (c[0] === 'SQL ile Veri Analizi' && ![7, 8, 9, 10, 12].includes(e.d)) continue; used.add(c[0]); tr.push([e.id, c[0], ds(nextWork(ys + Math.floor(R() * ((ye - ys) / DAY - 1)) * DAY)), c[1]]); } });
  sql += ins('ik_training', ['emp_id', 'course', 'completed_date', 'hours'], tr);

  sql += '\nCREATE INDEX ik_leaves_emp ON ik_leaves (emp_id);\nCREATE INDEX ik_training_emp ON ik_training (emp_id);\nCREATE INDEX ik_cand_req ON ik_candidates (req_id);\nCREATE INDEX ik_emp_mgr ON ik_employees (manager_id);\nCREATE INDEX ik_emp_pos ON ik_employees (position_id);\n';
  root.SQLP_SEED = (root.SQLP_SEED || '') + sql;
  Object.assign(root.SQLP_SCHEMA_NOTES = root.SQLP_SCHEMA_NOTES || {}, {
    ik_departments: 'Pusula A.Ş. bölümleri (12); parent_id üst bölüm (hiyerarşi)',
    ik_positions: 'Pozisyonlar: bölüm ve seviye (1 Uzman Yardımcısı … 6 Direktör); band_min / band_max 2024 maaş bandı (aylık brüt, TL)',
    ik_employees: 'Çalışanlar (2019 öncesi işe girenler dahil); term_date doluysa ayrılmıştır. position_id güncel ya da son pozisyon',
    ik_job_history: 'Görev geçmişi: işe giriş, terfi, yatay geçiş. end_date boşsa hâlâ o görevde',
    ik_salaries: 'Maaş geçmişi: her değişiklik bir satır (işe giriş, yıllık zam, ara zam, terfi). Bir tarihteki maaş = o tarihten önceki en son kayıt',
    ik_reviews: 'Yıl sonu performans değerlendirmeleri (1–5); potential bazen boş',
    ik_leaves: 'İzinler (2022–2024): yıllık, hastalık, mazeret, ücretsiz; days iş günü',
    ik_requisitions: 'Kadro talepleri (2022–2024): dolduruldu / açık / iptal',
    ik_candidates: 'Adaylar ve ulaştıkları son aşama; işe alınanlarda emp_id dolu',
    ik_survey: 'Bağlılık anketi (2024-Q2, 2024-Q4); enps 0–10, engagement ve manager_score 1–5; bazı yanıtlar boş',
    ik_training: 'Tamamlanan eğitimler (2022–2024)'
  });
  Object.assign(root.SQLP_COLMETA = root.SQLP_COLMETA || {}, {
    ik_departments: [['dept_id', 'int', 'Bölüm numarası', 'pk'], ['name', 'text(40)', 'Bölüm adı'], ['function_area', 'text(20)', 'Fonksiyon: Yönetim / Ticari / Operasyon / Teknoloji / Destek'], ['parent_id', 'int', 'Üst bölüm', 'fk:ik_departments.dept_id']],
    ik_positions: [['position_id', 'int', 'Pozisyon numarası', 'pk'], ['title', 'text(60)', 'Unvan'], ['dept_id', 'int', 'Bölüm', 'fk:ik_departments.dept_id'], ['level', 'int', 'Seviye (1–6)'], ['band_min', 'money', 'Bant alt sınırı (2024, aylık brüt)'], ['band_max', 'money', 'Bant üst sınırı (2024, aylık brüt)']],
    ik_employees: [['emp_id', 'int', 'Sicil numarası', 'pk'], ['full_name', 'text(60)', 'Ad soyad'], ['gender', 'text(1)', 'K / E'], ['birth_year', 'int', 'Doğum yılı'], ['city', 'text(30)', 'Çalıştığı şehir'], ['education', 'text(20)', 'Eğitim düzeyi'], ['hire_date', 'date', 'İşe giriş tarihi'], ['term_date', 'date', 'Ayrılış tarihi (çalışıyorsa boş)'], ['term_type', 'text(10)', 'gönüllü / gönülsüz'], ['term_reason', 'text(30)', 'Ayrılış nedeni'], ['position_id', 'int', 'Güncel / son pozisyon', 'fk:ik_positions.position_id'], ['manager_id', 'int', 'Yöneticisi', 'fk:ik_employees.emp_id'], ['hire_source', 'text(20)', 'İşe alım kaynağı'], ['work_mode', 'text(10)', 'ofis / hibrit / uzaktan']],
    ik_job_history: [['emp_id', 'int', 'Çalışan', 'fk:ik_employees.emp_id'], ['position_id', 'int', 'Pozisyon', 'fk:ik_positions.position_id'], ['start_date', 'date', 'Görev başlangıcı'], ['end_date', 'date', 'Görev bitişi (devam ediyorsa boş)'], ['change_type', 'text(15)', 'işe giriş / terfi / yatay geçiş']],
    ik_salaries: [['emp_id', 'int', 'Çalışan', 'fk:ik_employees.emp_id'], ['effective_date', 'date', 'Geçerlilik tarihi'], ['monthly_gross', 'money', 'Aylık brüt maaş (TL)'], ['reason', 'text(20)', 'Değişiklik nedeni']],
    ik_reviews: [['emp_id', 'int', 'Çalışan', 'fk:ik_employees.emp_id'], ['review_year', 'int', 'Değerlendirme yılı'], ['rating', 'int', 'Performans puanı (1–5)'], ['potential', 'text(10)', 'düşük / orta / yüksek (bazen boş)'], ['reviewer_id', 'int', 'Değerlendiren yönetici', 'fk:ik_employees.emp_id']],
    ik_leaves: [['leave_id', 'int', 'İzin kaydı', 'pk'], ['emp_id', 'int', 'Çalışan', 'fk:ik_employees.emp_id'], ['leave_type', 'text(10)', 'yıllık / hastalık / mazeret / ücretsiz'], ['start_date', 'date', 'Başlangıç'], ['days', 'int', 'İş günü']],
    ik_requisitions: [['req_id', 'int', 'Kadro talebi', 'pk'], ['position_id', 'int', 'Pozisyon', 'fk:ik_positions.position_id'], ['opened_date', 'date', 'Açılış'], ['closed_date', 'date', 'Kapanış (açıksa boş)'], ['status', 'text(12)', 'dolduruldu / açık / iptal']],
    ik_candidates: [['cand_id', 'int', 'Aday', 'pk'], ['req_id', 'int', 'Kadro talebi', 'fk:ik_requisitions.req_id'], ['source', 'text(20)', 'Kaynak'], ['applied_date', 'date', 'Başvuru'], ['stage', 'text(20)', 'Ulaştığı son aşama / sonuç'], ['stage_date', 'date', 'Son aşama tarihi'], ['emp_id', 'int', 'İşe alındıysa sicil', 'fk:ik_employees.emp_id']],
    ik_survey: [['emp_id', 'int', 'Çalışan', 'fk:ik_employees.emp_id'], ['wave', 'text(8)', 'Anket dönemi'], ['enps', 'int', 'Tavsiye puanı (0–10)'], ['engagement', 'dec', 'Bağlılık (1–5)'], ['manager_score', 'dec', 'Yöneticiye puan (1–5)']],
    ik_training: [['emp_id', 'int', 'Çalışan', 'fk:ik_employees.emp_id'], ['course', 'text(40)', 'Eğitim'], ['completed_date', 'date', 'Tamamlanma'], ['hours', 'int', 'Saat']]
  });
})(typeof window !== 'undefined' ? window : globalThis);
