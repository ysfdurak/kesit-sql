/* Kesit SQL — örnek veritabanı üreteci (deterministik) */
(function (root) {
  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const R = rng(20241021);
  const pick = a => a[Math.floor(R() * a.length)];
  const int = (a, b) => a + Math.floor(R() * (b - a + 1));
  const q = v => v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : "'" + String(v).replace(/'/g, "''") + "'";
  const pad = n => String(n).padStart(2, '0');
  const dstr = d => d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
  const tstr = d => dstr(d) + ' ' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ':' + pad(d.getUTCSeconds());
  const addDays = (d, n) => new Date(d.getTime() + n * 86400000);
  const ins = (t, cols, rows) => {
    let s = '';
    for (let i = 0; i < rows.length; i += 400) {
      s += 'INSERT INTO ' + t + ' (' + cols.join(',') + ') VALUES\n' + rows.slice(i, i + 400).map(r => '(' + r.map(q).join(',') + ')').join(',\n') + ';\n';
    }
    return s;
  };

  const firstM = ['Ahmet','Mehmet','Mustafa','Ali','Hüseyin','Hasan','Emre','Burak','Can','Murat','Kerem','Yusuf','Oğuz','Serkan','Deniz','Barış','Tolga','Onur','Eren','Kaan'];
  const firstF = ['Ayşe','Fatma','Zeynep','Elif','Emine','Merve','Esra','Selin','Ece','Derya','Buse','Gamze','İrem','Seda','Nur','Defne','Ceren','Aslı','Pınar','Duygu'];
  const lastN = ['Yılmaz','Kaya','Demir','Şahin','Çelik','Yıldız','Yıldırım','Öztürk','Aydın','Özdemir','Arslan','Doğan','Kılıç','Aslan','Çetin','Kara','Koç','Kurt','Özkan','Şimşek','Polat','Erdem','Güneş','Aksoy'];
  const cities = ['İstanbul','İstanbul','İstanbul','Ankara','Ankara','İzmir','İzmir','Bursa','Antalya','Adana','Konya','Gaziantep','Eskişehir','Trabzon','Kayseri','Samsun'];
  const asciiTr = s => s.toLowerCase().replace(/ı/g,'i').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ö/g,'o').replace(/ç/g,'c').replace(/i̇/g,'i');

  let sql = `
CREATE TABLE departments (
  dept_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT
);
CREATE TABLE employees (
  emp_id INTEGER PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  dept_id INTEGER REFERENCES departments(dept_id),
  manager_id INTEGER REFERENCES employees(emp_id),
  title TEXT,
  salary REAL,
  hire_date TEXT,
  email TEXT
);
CREATE TABLE customers (
  customer_id INTEGER PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  gender TEXT,
  birth_year INTEGER,
  city TEXT,
  email TEXT,
  signup_date TEXT,
  segment TEXT
);
CREATE TABLE products (
  product_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price REAL NOT NULL,
  cost REAL NOT NULL,
  stock INTEGER
);
CREATE TABLE orders (
  order_id INTEGER PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(customer_id),
  order_date TEXT NOT NULL,
  status TEXT NOT NULL,
  channel TEXT
);
CREATE TABLE order_items (
  item_id INTEGER PRIMARY KEY,
  order_id INTEGER REFERENCES orders(order_id),
  product_id INTEGER REFERENCES products(product_id),
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  discount REAL DEFAULT 0
);
CREATE TABLE web_events (
  event_id INTEGER PRIMARY KEY,
  user_id INTEGER,
  event_type TEXT,
  event_time TEXT,
  device TEXT
);
CREATE TABLE ab_test (
  user_id INTEGER PRIMARY KEY,
  variant TEXT,
  converted INTEGER,
  revenue REAL
);
CREATE TABLE raw_signups (
  id INTEGER,
  full_name TEXT,
  email TEXT,
  city TEXT,
  signup_date TEXT
);
CREATE TABLE price_updates (
  product_id INTEGER,
  new_price REAL,
  updated_at TEXT
);
CREATE TABLE bank_branches (
  branch_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  opened_year INTEGER
);
CREATE TABLE bank_customers (
  customer_id INTEGER PRIMARY KEY,
  full_name TEXT NOT NULL,
  gender TEXT,
  birth_date TEXT,
  city TEXT,
  segment TEXT,
  branch_id INTEGER REFERENCES bank_branches(branch_id),
  joined_date TEXT,
  risk_score INTEGER,
  kvkk_consent INTEGER
);
CREATE TABLE bank_accounts (
  account_id INTEGER PRIMARY KEY,
  customer_id INTEGER REFERENCES bank_customers(customer_id),
  account_type TEXT NOT NULL,
  currency TEXT NOT NULL,
  opened_date TEXT,
  closed_date TEXT,
  credit_limit REAL,
  status TEXT
);
CREATE TABLE bank_txns (
  txn_id INTEGER PRIMARY KEY,
  account_id INTEGER REFERENCES bank_accounts(account_id),
  txn_time TEXT NOT NULL,
  amount REAL NOT NULL,
  txn_type TEXT NOT NULL,
  channel TEXT,
  merchant_category TEXT
);
CREATE TABLE bank_fx (
  rate_date TEXT,
  currency TEXT,
  try_rate REAL,
  PRIMARY KEY (currency, rate_date)
);
CREATE INDEX ix_bank_txns_account ON bank_txns (account_id);
`;

  // departments
  const depts = [[1,'Satış','İstanbul'],[2,'Pazarlama','İstanbul'],[3,'Veri Analitiği','Ankara'],[4,'Yazılım','İzmir'],[5,'İnsan Kaynakları','İstanbul'],[6,'Finans','Ankara'],[7,'Hukuk','İstanbul']];
  sql += ins('departments', ['dept_id','name','city'], depts);

  // employees (Hukuk boş)
  const emps = [];
  const titles = {1:['Satış Uzmanı','Satış Temsilcisi'],2:['Pazarlama Uzmanı','İçerik Uzmanı'],3:['Veri Analisti','Veri Bilimci','Veri Mühendisi'],4:['Yazılım Geliştirici','Kıdemli Geliştirici'],5:['İK Uzmanı'],6:['Finans Uzmanı','Muhasebeci']};
  emps.push([1,'Selim','Aksoy',null,null,'Genel Müdür',145000,'2015-03-01','selim.aksoy@anadolumarket.com']);
  const mgrs = {};
  const mgrTitles = {1:'Satış Müdürü',2:'Pazarlama Müdürü',3:'Analitik Müdürü',4:'Yazılım Müdürü',5:'İK Müdürü',6:'Finans Müdürü'};
  let eid = 2;
  for (let d = 1; d <= 6; d++) {
    const f = R() < .5 ? pick(firstF) : pick(firstM), l = pick(lastN);
    emps.push([eid, f, l, d, 1, mgrTitles[d], int(80, 98) * 1000, dstr(addDays(new Date(Date.UTC(2016,0,1)), int(0, 900))), asciiTr(f) + '.' + asciiTr(l) + '@anadolumarket.com']);
    mgrs[d] = eid++;
  }
  const empCount = {1:5,2:3,3:4,4:4,5:2,6:2};
  for (let d = 1; d <= 6; d++) for (let k = 0; k < empCount[d]; k++) {
    const f = R() < .5 ? pick(firstF) : pick(firstM), l = pick(lastN);
    const ttl = pick(titles[d]);
    let sal = int(38, 72) * 1000; if (/Kıdemli|Veri Bilimci|Mühendis/.test(ttl)) sal += 15000;
    emps.push([eid++, f, l, d, mgrs[d], ttl, sal, dstr(addDays(new Date(Date.UTC(2018,0,1)), int(0, 2400))), R() < .9 ? asciiTr(f) + '.' + asciiTr(l) + '@anadolumarket.com' : null]);
  }
  sql += ins('employees', ['emp_id','first_name','last_name','dept_id','manager_id','title','salary','hire_date','email'], emps);

  // products
  const prods = [
    ['Kablosuz Kulaklık','Elektronik',1299],['Akıllı Saat','Elektronik',3499],['Bluetooth Hoparlör','Elektronik',899],['Powerbank 20000mAh','Elektronik',649],['Mekanik Klavye','Elektronik',1899],['Oyuncu Mouse','Elektronik',749],['27" Monitör','Elektronik',7499],['USB-C Hub','Elektronik',549],
    ['Suç ve Ceza','Kitap',145],['Kürk Mantolu Madonna','Kitap',95],['Tutunamayanlar','Kitap',260],['İnce Memed','Kitap',180],['Saatleri Ayarlama Enstitüsü','Kitap',165],['SQL ile Veri Analizi','Kitap',420],['İstatistiğe Giriş','Kitap',380],
    ['Türk Kahvesi Makinesi','Ev & Yaşam',2199],['Çaydanlık Seti','Ev & Yaşam',899],['Pamuk Nevresim Takımı','Ev & Yaşam',1150],['Bakır Cezve','Ev & Yaşam',320],['Seramik Kupa Seti','Ev & Yaşam',275],['Robot Süpürge','Ev & Yaşam',8999],
    ['Basic Tişört','Giyim',249],['Kot Pantolon','Giyim',799],['Mont','Giyim',2499],['Spor Ayakkabı','Giyim',1899],['Yün Atkı','Giyim',349],['Keten Gömlek','Giyim',649],
    ['Yoga Matı','Spor',399],['Dambıl Seti 10kg','Spor',899],['Koşu Bandı','Spor',15999],['Termos 750ml','Spor',459],['Bisiklet Kaskı','Spor',1099],['Kamp Çadırı','Spor',3299],
    ['Nemlendirici Krem','Kozmetik',289],['Güneş Kremi SPF50','Kozmetik',349],['Parfüm 100ml','Kozmetik',1799],['Şampuan','Kozmetik',129],['Dudak Balmı','Kozmetik',79],
    ['Hediye Kartı 500 TL','Hediye',500],['Gurme Lokum Kutusu','Hediye',350]
  ];
  const prodRows = prods.map((p, i) => [i + 1, p[0], p[1], p[2], Math.round(p[2] * (0.45 + R() * 0.25)), i === 38 ? 0 : int(0, 250)]);
  sql += ins('products', ['product_id','name','category','price','cost','stock'], prodRows);
  const neverOrdered = new Set([30, 40]); // Koşu Bandı? hayır: id 30 = Koşu Bandı, 40 = Gurme Lokum
  const popular = []; prodRows.forEach(p => { if (neverOrdered.has(p[0])) return; const w = p[3] < 400 ? 5 : p[3] < 1500 ? 3 : p[3] < 5000 ? 2 : 1; for (let k = 0; k < w; k++) popular.push(p); });

  // customers
  const custs = [];
  const segs = ['Bireysel','Bireysel','Bireysel','Kurumsal','Premium'];
  const NC = 150;
  for (let i = 1; i <= NC; i++) {
    const g = R() < .5 ? 'K' : 'E';
    const f = g === 'K' ? pick(firstF) : pick(firstM), l = pick(lastN);
    const sd = addDays(new Date(Date.UTC(2022, 5, 1)), int(0, 850));
    const domain = pick(['gmail.com','gmail.com','hotmail.com','outlook.com','yandex.com','icloud.com']);
    custs.push([i, f, l, g, int(1960, 2005), R() < .06 ? null : pick(cities), R() < .08 ? null : asciiTr(f) + '.' + asciiTr(l) + (R() < .5 ? int(1, 99) : '') + '@' + domain, dstr(sd), pick(segs)]);
  }
  sql += ins('customers', ['customer_id','first_name','last_name','gender','birth_year','city','email','signup_date','segment'], custs);

  // orders + items
  const orders = [], items = [];
  let oid = 1, iid = 1;
  const end = new Date(Date.UTC(2024, 11, 31));
  const inactive = new Set(); for (let k = 0; k < 14; k++) inactive.add(int(1, NC));
  for (const c of custs) {
    if (inactive.has(c[0])) continue;
    const sd = new Date(c[7] + 'T00:00:00Z');
    const base = c[8] === 'Premium' ? 3.2 : c[8] === 'Kurumsal' ? 2.2 : 1;
    let d = addDays(sd, int(0, 40));
    const stop = R() < .38 ? addDays(sd, int(90, 640)) : end;
    const last = stop < end ? stop : end;
    while (d <= last) {
      const m = d.getUTCMonth();
      orders.push([oid, c[0], d, null, null]);
      const st = R(); const status = st < .80 ? 'delivered' : st < .88 ? 'cancelled' : st < .93 ? 'returned' : 'shipped';
      const ch = R(); const channel = ch < .45 ? 'mobile' : ch < .85 ? 'web' : 'store';
      orders[orders.length - 1][3] = status; orders[orders.length - 1][4] = channel;
      const n = int(1, R() < .3 ? 4 : 2);
      const used = new Set();
      for (let k = 0; k < n; k++) {
        const p = pick(popular); if (used.has(p[0])) continue; used.add(p[0]);
        const disc = R() < .25 ? pick([0.05, 0.1, 0.15, 0.2]) : 0;
        const qty = p[3] < 500 ? int(1, 3) : 1;
        const priceAtSale = d.getUTCFullYear() === 2023 ? Math.round(p[3] * 0.9) : p[3];
        items.push([iid++, oid, p[0], qty, priceAtSale, disc]);
      }
      oid++;
      let gap = Math.round((60 + R() * 140) / base);
      if (m === 9 || m === 10) gap = Math.round(gap * 0.6);
      d = addDays(d, Math.max(5, gap));
    }
  }
  // tarih string + saat
  orders.forEach(o => { o[2] = dstr(o[2]); });
  sql += ins('orders', ['order_id','customer_id','order_date','status','channel'], orders);
  sql += ins('order_items', ['item_id','order_id','product_id','quantity','unit_price','discount'], items);

  // web events (funnel), 2024 Q4
  const ev = []; let evid = 1;
  for (let u = 1001; u <= 1600; u++) {
    const dev = R() < .6 ? 'mobile' : 'desktop';
    let t = new Date(Date.UTC(2024, 9, 1) + int(0, 60 * 24 * 3600) * 1000);
    const steps = ['visit','product_view','add_to_cart','checkout','purchase'];
    const pr = dev === 'mobile' ? [1, .72, .38, .55, .62] : [1, .78, .45, .62, .74];
    for (let s = 0; s < steps.length; s++) {
      if (R() > pr[s]) break;
      ev.push([evid++, u, steps[s], tstr(t), dev]);
      t = new Date(t.getTime() + int(20, 900) * 1000);
    }
  }
  /* Huni fazla temiz kalmasın: tekrar ziyaret, tekrar sayfa ve sepet olayı, birkaç sıra dışı zaman ve çift gönderim.
     Ayrı üreteç (RW): R akışı kaymaz. Kullanıcı başına ulaşılan en ileri huni adımı ve kullanıcı kümesi değişmez. */
  {
    const RW = (function (seed) { return function () { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })(20241001);
    const ri = (a, b) => a + Math.floor(RW() * (b - a + 1));
    const adim = ['visit','product_view','add_to_cart','checkout','purchase'];
    const BIT = Date.UTC(2024, 10, 29, 23, 59, 0), kul = new Map();
    ev.forEach(e => { if (!kul.has(e[1])) kul.set(e[1], []); kul.get(e[1]).push({ tur: e[2], t: new Date(e[3].replace(' ', 'T') + 'Z').getTime(), dev: e[4] }); });
    const us = [...kul.keys()];
    const yeni = [];
    for (const u of us) {
      const ana = kul.get(u), enIleri = ana.length - 1, dev = ana[0].dev, ek = [];
      /* Aynı oturumda tekrar: ürün sayfası ve sepet olayı (ikinci ürün), ödeme denemesi */
      const buOturum = [];
      for (const o of ana) {
        buOturum.push(o);
        if (o.tur === 'product_view') { let k = RW() < .55 ? ri(1, 3) : 0, t = o.t; while (k-- > 0) { t += ri(15, 120) * 1000; buOturum.push({ tur: 'product_view', t, dev }); } }
        if (o.tur === 'add_to_cart' && RW() < .22) buOturum.push({ tur: 'add_to_cart', t: o.t + ri(10, 90) * 1000, dev });
        if (o.tur === 'checkout' && RW() < .12) buOturum.push({ tur: 'checkout', t: o.t + ri(30, 150) * 1000, dev });
      }
      /* Sonraki adımlar tekrar olaylarından sonra gelsin */
      buOturum.sort((a, b) => adim.indexOf(a.tur) - adim.indexOf(b.tur) || a.t - b.t);
      let son = 0; for (const o of buOturum) { if (o.t <= son) o.t = son + ri(10, 60) * 1000; son = o.t; }
      /* Tekrar ziyaretler: kullanıcının daha önce ulaştığı adımı geçmez; satın alma tekrarlanmaz */
      const tekrar = RW() < .38 ? ri(1, 3) : 0; let t = son;
      for (let k = 0; k < tekrar; k++) {
        t += ri(3 * 3600, 9 * 86400) * 1000;
        if (t > BIT) break;
        ek.push({ tur: 'visit', t, dev }); let c = t;
        for (let s = 1; s <= Math.min(enIleri, 3); s++) {
          const gec = s === 1 ? .7 : .35; if (RW() > gec) break;
          c += ri(20, 400) * 1000; if (c > BIT) break;
          ek.push({ tur: adim[s], t: c, dev });
          if (s === 1) { let m = ri(0, 2); while (m-- > 0) { c += ri(15, 120) * 1000; if (c < BIT) ek.push({ tur: 'product_view', t: c, dev }); } }
        }
        t = c;
      }
      yeni.push({ u, ana: buOturum, ek });
    }
    /* Bilerek: tam 24 kullanıcıda istemci saati kayar, iki ardışık huni adımının zamanı yer değiştirir */
    const huni = yeni.filter(x => x.ana.length >= 3); const kay = []; while (kay.length < 24) { const x = huni[ri(0, huni.length - 1)]; if (!kay.includes(x)) kay.push(x); }
    kay.forEach(x => { const A = x.ana; let i = 0; for (let g = 0; g < 200; g++) { i = ri(0, A.length - 2); if (A[i].tur !== A[i + 1].tur) break; } const tt = A[i].t; A[i].t = A[i + 1].t; A[i + 1].t = tt; });
    ev.length = 0; let eid = 1; const cift = [];
    yeni.forEach(x => { x.ana.concat(x.ek).forEach(o => { ev.push([eid++, x.u, o.tur, tstr(new Date(o.t)), o.dev]); }); });
    /* Bilerek: tam 40 olay iki kez gönderilmiş (aynı kullanıcı, tür, zaman, cihaz; yeni event_id). 8 tanesi purchase */
    const pur = ev.filter(e => e[2] === 'purchase'), dig = ev.filter(e => e[2] !== 'purchase'); const sec = (L, n) => { const o = []; while (o.length < n) { const e = L[ri(0, L.length - 1)]; if (!o.includes(e)) o.push(e); } return o; };
    sec(pur, 8).concat(sec(dig, 32)).forEach(e => cift.push(e));
    cift.sort((a, b) => a[0] - b[0]);
    const say = ev.length; cift.forEach((e, i) => ev.push([say + i + 1, e[1], e[2], e[3], e[4]]));
  }
  sql += ins('web_events', ['event_id','user_id','event_type','event_time','device'], ev);

  // a/b test
  const ab = [];
  for (let u = 1; u <= 2000; u++) {
    const v = R() < .5 ? 'A' : 'B';
    const conv = R() < (v === 'A' ? 0.10 : 0.125) ? 1 : 0;
    ab.push([u, v, conv, conv ? Math.round((150 + R() * 600) * 100) / 100 : 0]);
  }
  sql += ins('ab_test', ['user_id','variant','converted','revenue'], ab);

  // raw_signups (kirli veri)
  const raw = [];
  const variants = n => [n, '  ' + n + ' ', n.toUpperCase(), n.toLowerCase()];
  for (let i = 1; i <= 40; i++) {
    const f = R() < .5 ? pick(firstF) : pick(firstM), l = pick(lastN);
    const name = pick(variants(f + ' ' + l));
    const em = asciiTr(f) + '.' + asciiTr(l) + '@gmail.com';
    const city = pick(['İstanbul', 'istanbul', 'ISTANBUL', ' Ankara', 'ankara', 'İzmir', 'izmir ', null, '']);
    const dt = addDays(new Date(Date.UTC(2024, 0, 1)), int(0, 300));
    const dfmt = pick([dstr(dt), dstr(dt), pad(dt.getUTCDate()) + '.' + pad(dt.getUTCMonth() + 1) + '.' + dt.getUTCFullYear()]);
    raw.push([i, name, R() < .5 ? em.toUpperCase() : em, city, dfmt]);
    if (R() < .25) raw.push([i, name, em, city, dfmt]); // tekrar eden satır
  }
  sql += ins('raw_signups', ['id','full_name','email','city','signup_date'], raw);

  // price updates (SCD / incremental)
  const pu = [];
  for (let k = 0; k < 18; k++) {
    const p = pick(prodRows);
    pu.push([p[0], Math.round(p[3] * (0.85 + R() * 0.35)), tstr(new Date(Date.UTC(2024, 9, 1) + int(0, 80 * 86400) * 1000))]);
  }
  sql += ins('price_updates', ['product_id','new_price','updated_at'], pu);


  // ---------------- Banka veri seti (ayrı rastgele üreteç; önceki veriyi değiştirmez) ----------------
  {
    const B = rng(5150);
    const bp = a => a[Math.floor(B() * a.length)];
    const bi = (a, b) => a + Math.floor(B() * (b - a + 1));
    const branches = [[1,'Kadıköy Şubesi','İstanbul',2005],[2,'Levent Ticari Şube','İstanbul',2008],[3,'Bakırköy Şubesi','İstanbul',2011],[4,'Kızılay Şubesi','Ankara',2006],[5,'Çankaya Şubesi','Ankara',2014],[6,'Alsancak Şubesi','İzmir',2007],[7,'Nilüfer Şubesi','Bursa',2012],[8,'Muratpaşa Şubesi','Antalya',2013],[9,'Seyhan Şubesi','Adana',2015],[10,'Selçuklu Şubesi','Konya',2016],[11,'Şahinbey Şubesi','Gaziantep',2018],[12,'Dijital Şube','İstanbul',2020]];
    sql += ins('bank_branches', ['branch_id','name','city','opened_year'], branches);
    const bc = [], NB = 500;
    for (let i = 1; i <= NB; i++) {
      const g = B() < .5 ? 'K' : 'E'; const f = g === 'K' ? bp(firstF) : bp(firstM), l = bp(lastN);
      const br = B() < .22 ? 12 : bi(1, 11); const seg = B() < .1 ? 'KOBİ' : B() < .1 ? 'Özel Bankacılık' : 'Bireysel';
      const by = bi(1950, 2005), bm = bi(1, 12), bd = bi(1, 28);
      bc.push([i, f + ' ' + l, g, by + '-' + pad(bm) + '-' + pad(bd), branches[br - 1][2], seg, br, dstr(addDays(new Date(Date.UTC(2012, 0, 1)), bi(0, 4700))), bi(1, 10), B() < .85 ? 1 : 0]);
    }
    /* Hesap açılışında (müşteri olma tarihi, en erken hesap) 18 yaşını doldurmayan müşterilerin doğum yılı öne alınır; ay ve gün aynı, 18 ile 25 yaş arası dağılır */
    bc.forEach(c => { const by = +c[3].slice(0, 4), md = c[3].slice(4); const y18 = String(by + 18) + md; if (y18 > c[7]) { const son = +c[7].slice(0, 4) - 18 - (md > c[7].slice(4) ? 1 : 0); c[3] = String(son - c[0] % 8) + md; } });
    sql += ins('bank_customers', ['customer_id','full_name','gender','birth_date','city','segment','branch_id','joined_date','risk_score','kvkk_consent'], bc);
    const acc = []; let aid = 100001;
    for (const c of bc) {
      const opened = c[7]; const n = c[5] === 'Özel Bankacılık' ? 3 : B() < .55 ? 2 : 1;
      acc.push([aid++, c[0], 'vadesiz', 'TRY', opened, null, null, 'aktif']);
      if (n >= 2) { const kk = B() < .7; acc.push([aid++, c[0], kk ? 'kredi_karti' : 'vadeli', kk ? 'TRY' : bp(['TRY','TRY','USD','EUR']), dstr(addDays(new Date(opened + 'T00:00:00Z'), bi(30, 900))), null, kk ? bp([10000, 20000, 30000, 50000, 75000]) : null, 'aktif']); }
      if (n >= 3) acc.push([aid++, c[0], 'vadeli', bp(['USD','EUR']), dstr(addDays(new Date(opened + 'T00:00:00Z'), bi(30, 900))), null, null, 'aktif']);
    }
    acc.forEach(a => { if (B() < .06) { a[5] = dstr(addDays(new Date(Date.UTC(2024, 0, 1)), bi(0, 330))); a[7] = 'kapali'; } if (a[4] > '2024-11-30') a[4] = '2024-11-30'; });
    sql += ins('bank_accounts', ['account_id','customer_id','account_type','currency','opened_date','closed_date','credit_limit','status'], acc);
    const tx = []; let tid = 1;
    const at = (y, m, d, h, mi) => tstr(new Date(Date.UTC(y, m, d, h, mi, bi(0, 59))));
    const mcat = [['market', 120, 1800], ['market', 80, 900], ['akaryakit', 400, 2500], ['restoran', 150, 1500], ['e_ticaret', 100, 6000], ['ulasim', 20, 300], ['saglik', 200, 4000], ['giyim', 300, 4500], ['elektronik', 800, 25000], ['egitim', 500, 12000]];
    const custById = {}; bc.forEach(c => custById[c[0]] = c);
    const salaried = new Set(bc.filter(c => c[5] === 'Bireysel' && B() < .7).map(c => c[0]));
    const salary = {}; bc.forEach(c => salary[c[0]] = c[5] === 'Özel Bankacılık' ? bi(120, 400) * 1000 : c[5] === 'KOBİ' ? bi(60, 250) * 1000 : bi(17, 85) * 1000);
    for (const a of acc) {
      const c = custById[a[1]]; const startM = a[4] >= '2024-01-01' ? +a[4].slice(5, 7) - 1 : 0; const endM = a[5] ? +a[5].slice(5, 7) - 1 : 11;
      const active = B() < .9; if (!active) continue;
      for (let m = startM; m <= endM; m++) {
        const dim = new Date(Date.UTC(2024, m + 1, 0)).getUTCDate();
        if (a[2] === 'vadesiz') {
          if (salaried.has(c[0])) tx.push([tid++, a[0], at(2024, m, bi(1, 5), 9, bi(0, 59)), salary[c[0]], 'maas', 'internet', null]);
          else if (c[5] === 'KOBİ') for (let k = 0, nk = bi(2, 5); k < nk; k++) tx.push([tid++, a[0], at(2024, m, bi(1, dim), bi(9, 17), bi(0, 59)), bi(20, 400) * 100, 'havale_giris', bp(['internet', 'sube', 'mobil']), null]);
          else if (B() < .6) tx.push([tid++, a[0], at(2024, m, bi(1, dim), bi(9, 20), bi(0, 59)), bi(30, 300) * 100, 'havale_giris', 'mobil', null]);
          const nsp = bi(1, 4);
          for (let k = 0; k < nsp; k++) { const mc = bp(mcat); tx.push([tid++, a[0], at(2024, m, bi(1, dim), bi(7, 23), bi(0, 59)), -Math.round((mc[1] + B() * (mc[2] - mc[1])) * 100) / 100, 'kart_harcama', bp(['pos', 'pos', 'internet', 'mobil']), mc[0]]); }
          for (let k = 0, nf = bi(1, 2); k < nf; k++) tx.push([tid++, a[0], at(2024, m, bi(10, 25), bi(8, 22), bi(0, 59)), -Math.round((150 + B() * 1400) * 100) / 100, 'fatura', bp(['mobil', 'internet']), null]);
          if (B() < .55) tx.push([tid++, a[0], at(2024, m, bi(1, dim), bi(8, 23), bi(0, 59)), -bi(2, 40) * 100, 'atm', 'atm', null]);
          if (B() < .35) tx.push([tid++, a[0], at(2024, m, bi(1, dim), bi(8, 23), bi(0, 59)), -bi(5, 200) * 100, 'havale_cikis', bp(['mobil', 'internet', 'sube']), null]);
        } else if (a[2] === 'kredi_karti') {
          const nsp = bi(2, 5); let tot = 0;
          for (let k = 0; k < nsp; k++) { const mc = bp(mcat); const v = Math.round((mc[1] + B() * (mc[2] - mc[1])) * 100) / 100; tot += v; tx.push([tid++, a[0], at(2024, m, bi(1, dim), bi(7, 23), bi(0, 59)), -v, 'kart_harcama', bp(['pos', 'internet', 'mobil']), mc[0]]); }
          if (m < 11) tx.push([tid++, a[0], at(2024, m + 1, bi(8, 15), bi(9, 21), bi(0, 59)), Math.round(tot * (B() < .8 ? 1 : 0.3 + B() * 0.5) * 100) / 100, 'kart_odeme', bp(['mobil', 'internet']), null]);
        } else {
          tx.push([tid++, a[0], at(2024, m, dim, 23, 59), Math.round((a[3] === 'TRY' ? bi(30, 400) : bi(2, 40)) * 10) / 10, 'faiz', 'sistem', null]);
        }
      }
    }
    // şüpheli işlemler: gece yarısı yüksek tutarlı e-ticaret harcamaları
    for (let k = 0; k < 25; k++) { const a = bp(acc.filter(x => x[2] !== 'vadeli')); tx.push([tid++, a[0], at(2024, bi(0, 11), bi(1, 28), bi(1, 4), bi(0, 59)), -bi(400, 950) * 100, 'kart_harcama', 'internet', 'e_ticaret']); }
    tx.sort((x, y) => x[2] < y[2] ? -1 : x[2] > y[2] ? 1 : x[0] - y[0]); tx.forEach((t, i) => t[0] = i + 1);
    sql += ins('bank_txns', ['txn_id','account_id','txn_time','amount','txn_type','channel','merchant_category'], tx);
    const fx = []; let usd = 29.5, eur = 32.0;
    for (let d = new Date(Date.UTC(2024, 0, 1)); d <= new Date(Date.UTC(2024, 11, 31)); d = addDays(d, 1)) { usd += 0.012 + (B() - .5) * 0.05; eur += 0.010 + (B() - .5) * 0.07; if (d.getUTCDay() === 0 || d.getUTCDay() === 6) continue; fx.push([dstr(d), 'USD', Math.round(usd * 10000) / 10000]); fx.push([dstr(d), 'EUR', Math.round(eur * 10000) / 10000]); }
    sql += ins('bank_fx', ['rate_date','currency','try_rate'], fx);
  }

  root.SQLP_SEED = sql;

  root.SQLP_SCHEMA_NOTES = {
    departments: 'Departmanlar (7 kayıt, Hukuk departmanında çalışan yok)',
    employees: 'Çalışanlar; manager_id aynı tablodaki yöneticiyi gösterir',
    customers: 'Müşteriler; bazı city/email değerleri NULL',
    products: 'Ürün kataloğu; price satış, cost maliyet fiyatı',
    orders: 'Siparişler (2022–2024); status: delivered, shipped, cancelled, returned',
    order_items: 'Sipariş satırları; ciro = quantity * unit_price * (1 - discount)',
    web_events: 'Web olayları (Ekim–Kasım 2024): visit → product_view → add_to_cart → checkout → purchase. Kullanıcı aynı adımı tekrar edebilir; 40 olay iki kez gönderilmiştir, 24 kullanıcıda iki adımın zamanı yer değiştirmiştir',
    ab_test: 'A/B testi sonuçları: variant A/B, converted 0/1, revenue',
    raw_signups: 'Kirli kayıt verisi: boşluk, büyük/küçük harf, tekrar, karışık tarih biçimi',
    price_updates: 'Ürün fiyat güncellemeleri (artımlı yükleme ve SCD dersleri için)',
    bank_branches: 'Ilgaz Bank şubeleri (12 şube, biri dijital)',
    bank_customers: 'Banka müşterileri (500 kişi); segment: Bireysel / KOBİ / Özel Bankacılık',
    bank_accounts: 'Hesaplar: vadesiz, vadeli, kredi_karti; para birimi TRY / USD / EUR',
    bank_txns: '2024 hesap hareketleri (büyük tablo); amount girişte artı, çıkışta eksi',
    bank_fx: 'Günlük döviz kurları 2024 (yalnızca iş günleri): 1 birim = try_rate TL'
  };

  /* Veri sözlüğü: sütun açıklamaları ve mantıksal tipler (Veri Seti sayfası için) */
  root.SQLP_COLMETA = {
    customers: [['customer_id', 'int', 'Müşteri numarası', 'pk'], ['first_name', 'text(50)', 'Ad'], ['last_name', 'text(50)', 'Soyad'], ['gender', 'text(1)', 'Cinsiyet (E / K)'], ['birth_year', 'int', 'Doğum yılı'], ['city', 'text(50)', 'Şehir (bazıları boş)'], ['email', 'text(100)', 'E-posta (bazıları boş)'], ['signup_date', 'date', 'Kayıt tarihi'], ['segment', 'text(20)', 'Bireysel / Kurumsal / Premium']],
    orders: [['order_id', 'int', 'Sipariş numarası', 'pk'], ['customer_id', 'int', 'Siparişi veren müşteri', 'fk:customers.customer_id'], ['order_date', 'date', 'Sipariş tarihi'], ['status', 'text(20)', 'delivered / shipped / cancelled / returned'], ['channel', 'text(20)', 'web / mobile / store']],
    order_items: [['item_id', 'int', 'Sipariş satırı numarası', 'pk'], ['order_id', 'int', 'Bağlı olduğu sipariş', 'fk:orders.order_id'], ['product_id', 'int', 'Satılan ürün', 'fk:products.product_id'], ['quantity', 'int', 'Adet'], ['unit_price', 'money', 'Satış anındaki birim fiyat'], ['discount', 'dec', 'İndirim oranı (0.10 = %10)']],
    products: [['product_id', 'int', 'Ürün numarası', 'pk'], ['name', 'text(100)', 'Ürün adı'], ['category', 'text(50)', 'Kategori'], ['price', 'money', 'Güncel satış fiyatı (TL)'], ['cost', 'money', 'Birim maliyet (TL)'], ['stock', 'int', 'Stok adedi']],
    employees: [['emp_id', 'int', 'Çalışan numarası', 'pk'], ['first_name', 'text(50)', 'Ad'], ['last_name', 'text(50)', 'Soyad'], ['dept_id', 'int', 'Departman', 'fk:departments.dept_id'], ['manager_id', 'int', 'Yöneticisi (yine bir çalışan)', 'fk:employees.emp_id'], ['title', 'text(100)', 'Unvan'], ['salary', 'money', 'Aylık brüt maaş (TL)'], ['hire_date', 'date', 'İşe giriş tarihi'], ['email', 'text(100)', 'Kurumsal e-posta']],
    departments: [['dept_id', 'int', 'Departman numarası', 'pk'], ['name', 'text(50)', 'Departman adı'], ['city', 'text(50)', 'Bulunduğu şehir']],
    web_events: [['event_id', 'int', 'Olay numarası', 'pk'], ['user_id', 'int', 'Ziyaretçi numarası'], ['event_type', 'text(30)', 'visit / product_view / add_to_cart / checkout / purchase'], ['event_time', 'datetime', 'Olay zamanı'], ['device', 'text(20)', 'mobile / desktop']],
    ab_test: [['user_id', 'int', 'Kullanıcı numarası', 'pk'], ['variant', 'text(1)', 'Deney grubu: A (kontrol) / B (yeni tasarım)'], ['converted', 'bit', 'Satın aldı mı? (1 / 0)'], ['revenue', 'money', 'Kullanıcının getirdiği gelir']],
    raw_signups: [['id', 'int', 'Form kayıt numarası (tekrar edebilir)'], ['full_name', 'text(100)', 'Ad soyad (boşluk / harf karmaşası)'], ['email', 'text(100)', 'E-posta (karışık harf)'], ['city', 'text(50)', 'Şehir (tutarsız yazım)'], ['signup_date', 'text(20)', 'Tarih metni (iki farklı biçim)']],
    price_updates: [['product_id', 'int', 'Fiyatı değişen ürün', 'fk:products.product_id'], ['new_price', 'money', 'Yeni fiyat'], ['updated_at', 'datetime', 'Değişiklik zamanı']],
    bank_branches: [['branch_id', 'int', 'Şube numarası', 'pk'], ['name', 'text(60)', 'Şube adı'], ['city', 'text(50)', 'Şehir'], ['opened_year', 'int', 'Açılış yılı']],
    bank_customers: [['customer_id', 'int', 'Banka müşteri numarası', 'pk'], ['full_name', 'text(100)', 'Ad soyad'], ['gender', 'text(1)', 'E / K'], ['birth_date', 'date', 'Doğum tarihi'], ['city', 'text(50)', 'Şehir'], ['segment', 'text(30)', 'Bireysel / KOBİ / Özel Bankacılık'], ['branch_id', 'int', 'Bağlı olduğu şube', 'fk:bank_branches.branch_id'], ['joined_date', 'date', 'Müşteri olma tarihi'], ['risk_score', 'int', 'Kredi risk puanı (1 düşük – 10 yüksek)'], ['kvkk_consent', 'bit', 'Pazarlama izni (1 / 0)']],
    bank_accounts: [['account_id', 'int', 'Hesap numarası', 'pk'], ['customer_id', 'int', 'Hesap sahibi', 'fk:bank_customers.customer_id'], ['account_type', 'text(20)', 'vadesiz / vadeli / kredi_karti'], ['currency', 'text(3)', 'TRY / USD / EUR'], ['opened_date', 'date', 'Açılış tarihi'], ['closed_date', 'date', 'Kapanış tarihi (açıksa boş)'], ['credit_limit', 'money', 'Kart limiti (yalnızca kredi kartı)'], ['status', 'text(10)', 'aktif / kapali']],
    bank_txns: [['txn_id', 'int', 'Hareket numarası', 'pk'], ['account_id', 'int', 'Hesap', 'fk:bank_accounts.account_id'], ['txn_time', 'datetime', 'İşlem zamanı'], ['amount', 'money', 'Tutar (hesap para biriminde; giriş +, çıkış −)'], ['txn_type', 'text(20)', 'maas / havale_giris / havale_cikis / kart_harcama / kart_odeme / fatura / atm / faiz'], ['channel', 'text(20)', 'mobil / internet / sube / atm / pos / sistem'], ['merchant_category', 'text(20)', 'Kart harcamalarında işyeri kategorisi']],
    bank_fx: [['rate_date', 'date', 'Kur tarihi (iş günü)'], ['currency', 'text(3)', 'USD / EUR'], ['try_rate', 'dec', '1 birimin TL karşılığı']]
  };
  root.SQLP_TYPEMAP = {
    int: { tsql: 'INT', pg: 'INTEGER', mysql: 'INT', oracle: 'NUMBER(10)', bq: 'INT64', sqlite: 'INTEGER' },
    money: { tsql: 'DECIMAL(12,2)', pg: 'NUMERIC(12,2)', mysql: 'DECIMAL(12,2)', oracle: 'NUMBER(12,2)', bq: 'NUMERIC', sqlite: 'REAL' },
    dec: { tsql: 'DECIMAL(4,2)', pg: 'NUMERIC(4,2)', mysql: 'DECIMAL(4,2)', oracle: 'NUMBER(4,2)', bq: 'NUMERIC', sqlite: 'REAL' },
    date: { tsql: 'DATE', pg: 'DATE', mysql: 'DATE', oracle: 'DATE', bq: 'DATE', sqlite: 'TEXT' },
    datetime: { tsql: 'DATETIME2', pg: 'TIMESTAMP', mysql: 'DATETIME', oracle: 'TIMESTAMP', bq: 'DATETIME', sqlite: 'TEXT' },
    bit: { tsql: 'BIT', pg: 'BOOLEAN', mysql: 'TINYINT(1)', oracle: 'NUMBER(1)', bq: 'INT64', sqlite: 'INTEGER' }
  };
  root.SQLP_TYPE = function (logical, d) { const m = logical.match(/^text\((\d+)\)$/); if (m) return { tsql: 'NVARCHAR(' + m[1] + ')', pg: 'VARCHAR(' + m[1] + ')', mysql: 'VARCHAR(' + m[1] + ')', oracle: 'VARCHAR2(' + m[1] + ')', bq: 'STRING', sqlite: 'TEXT' }[d]; return (root.SQLP_TYPEMAP[logical] || {})[d] || logical; };

  // Ek fonksiyonlar: istatistik toplamaları
  root.SQLP_REGISTER = function (db) {
    const mk = fin => ({ init: () => [], step: (s, v) => { if (v !== null && v !== undefined && !isNaN(+v)) s.push(+v); return s; }, finalize: fin });
    const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
    const varS = a => { if (a.length < 2) return null; const m = mean(a); return a.reduce((x, y) => x + (y - m) ** 2, 0) / (a.length - 1); };
    const varP = a => { if (!a.length) return null; const m = mean(a); return a.reduce((x, y) => x + (y - m) ** 2, 0) / a.length; };
    try {
      db.create_aggregate('median', mk(a => { if (!a.length) return null; a.sort((x, y) => x - y); const h = a.length >> 1; return a.length % 2 ? a[h] : (a[h - 1] + a[h]) / 2; }));
      db.create_aggregate('variance', mk(varS));
      db.create_aggregate('var_samp', mk(varS));
      db.create_aggregate('var_pop', mk(varP));
      db.create_aggregate('stddev', mk(a => { const v = varS(a); return v === null ? null : Math.sqrt(v); }));
      db.create_aggregate('stddev_samp', mk(a => { const v = varS(a); return v === null ? null : Math.sqrt(v); }));
      db.create_aggregate('stddev_pop', mk(a => { const v = varP(a); return v === null ? null : Math.sqrt(v); }));
      db.create_function('ln', x => x === null || x <= 0 ? null : Math.log(x));
    } catch (e) { console.warn('Ek fonksiyonlar yüklenemedi', e); }
  };
  /* Büyük tohum metnini parça parça çalıştır (tek seferde çok büyük exec, asm.js motorunda çok yavaşlıyor) */
  root.SQLP_EXEC_SEED = function (db, opt) { const parts = String(root.SQLP_SEED).replace(/\/\*BK_N\*\/\d+/g, opt && opt.small ? '13200' : '132000').split(/;\n(?=INSERT INTO |CREATE |DROP |UPDATE |ALTER |\n|$)/); let buf = ''; for (const p of parts) { buf += p + ';\n'; if (buf.length > 300000) { db.exec(buf); buf = ''; } } if (buf.trim()) db.exec(buf); };
  /* Tohum metninin özeti: önceden kurulmuş veritabanı dosyasının adı bu özete göre seçilir (eski dosya kullanılmaz) */
  root.SQLP_SEED_HASH = function () { const t = String(root.SQLP_SEED); let h = 0x811c9dc5; for (let i = 0; i < t.length; i += 3) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return (h >>> 0).toString(16) + '-' + t.length.toString(36); };
})(typeof window !== 'undefined' ? window : globalThis);
