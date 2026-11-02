/* Kesit SQL — Lezzet Kurye örnek veritabanı (hayali; deterministik üretim)
   Bir yemek siparişi ve teslimat platformunun Ekim–Aralık 2024 verisi: İstanbul, Ankara ve İzmir.
   Zamanlar Türkiye saatiyle tutulur. İçinde Arena'daki dedektif vakasının izleri de vardır. */
(function (root) {
  function rng(seed) { return function () { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const R = rng(20241001);
  const bi = (a, b) => a + Math.floor(R() * (b - a + 1));
  const bp = a => a[Math.floor(R() * a.length)];
  const wc = arr => { const tot = arr.reduce((a, x) => a + x[1], 0); let v = R() * tot; for (const x of arr) { v -= x[1]; if (v < 0) return x[0]; } return arr[0][0]; };
  const q = v => v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : "'" + String(v).replace(/'/g, "''") + "'";
  const pad = n => String(n).padStart(2, '0');
  const ts = d => d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()) + ' ' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ':' + pad(d.getUTCSeconds());
  const ds = d => d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
  const addMin = (d, m) => new Date(d.getTime() + Math.round(m * 60) * 1000);
  const ins = (t, cols, rows) => { let s = ''; for (let i = 0; i < rows.length; i += 400) s += 'INSERT INTO ' + t + ' (' + cols.join(',') + ') VALUES\n' + rows.slice(i, i + 400).map(r => '(' + r.map(q).join(',') + ')').join(',\n') + ';\n'; return s; };
  const r2 = x => Math.round(x * 100) / 100;

  let sql = `
CREATE TABLE lk_restaurants (
  restaurant_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  cuisine TEXT NOT NULL,
  city TEXT NOT NULL,
  district TEXT NOT NULL,
  opened_date TEXT,
  commission_pct REAL NOT NULL,
  is_active INTEGER NOT NULL
);
CREATE TABLE lk_menu_items (
  item_id INTEGER PRIMARY KEY,
  restaurant_id INTEGER NOT NULL REFERENCES lk_restaurants(restaurant_id),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price REAL NOT NULL,
  is_vegetarian INTEGER NOT NULL
);
CREATE TABLE lk_customers (
  customer_id INTEGER PRIMARY KEY,
  full_name TEXT NOT NULL,
  city TEXT NOT NULL,
  district TEXT,
  signup_date TEXT NOT NULL,
  referred_by INTEGER REFERENCES lk_customers(customer_id),
  is_premium INTEGER NOT NULL
);
CREATE TABLE lk_couriers (
  courier_id INTEGER PRIMARY KEY,
  full_name TEXT NOT NULL,
  city TEXT NOT NULL,
  vehicle TEXT NOT NULL,
  hired_date TEXT NOT NULL,
  rating REAL
);
CREATE TABLE lk_orders (
  order_id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES lk_customers(customer_id),
  restaurant_id INTEGER NOT NULL REFERENCES lk_restaurants(restaurant_id),
  courier_id INTEGER REFERENCES lk_couriers(courier_id),
  placed_at TEXT NOT NULL,
  picked_at TEXT,
  delivered_at TEXT,
  status TEXT NOT NULL,
  payment TEXT NOT NULL,
  delivery_fee REAL NOT NULL,
  discount REAL NOT NULL,
  tip REAL NOT NULL
);
CREATE TABLE lk_order_lines (
  order_id INTEGER NOT NULL REFERENCES lk_orders(order_id),
  item_id INTEGER NOT NULL REFERENCES lk_menu_items(item_id),
  qty INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  PRIMARY KEY (order_id, item_id)
);
CREATE TABLE lk_ratings (
  order_id INTEGER PRIMARY KEY REFERENCES lk_orders(order_id),
  food_score INTEGER NOT NULL,
  courier_score INTEGER NOT NULL,
  comment TEXT
);
`;
  /* Şehirler ve ilçeler */
  const CITY = {
    'İstanbul': ['Kadıköy', 'Beşiktaş', 'Şişli', 'Üsküdar', 'Ataşehir', 'Bakırköy', 'Maltepe', 'Sarıyer'],
    'Ankara': ['Çankaya', 'Keçiören', 'Yenimahalle', 'Etimesgut', 'Mamak'],
    'İzmir': ['Karşıyaka', 'Bornova', 'Konak', 'Buca', 'Bayraklı']
  };
  const CW = [['İstanbul', 55], ['Ankara', 25], ['İzmir', 20]];

  /* Restoranlar ve menüler */
  const CUIS = {
    'Döner': [['Tavuk Döner Dürüm', 'Ana yemek', 165, 0], ['Et Döner Porsiyon', 'Ana yemek', 285, 0], ['İskender', 'Ana yemek', 345, 0], ['Ayran', 'İçecek', 35, 1], ['Patates Kızartması', 'Yan ürün', 75, 1], ['Künefe', 'Tatlı', 140, 1]],
    'Pizza': [['Margarita', 'Ana yemek', 260, 1], ['Karışık Pizza', 'Ana yemek', 330, 0], ['Sucuklu Pizza', 'Ana yemek', 310, 0], ['Sebzeli Pizza', 'Ana yemek', 290, 1], ['Kola', 'İçecek', 45, 1], ['Sarımsaklı Ekmek', 'Yan ürün', 85, 1], ['Tiramisu', 'Tatlı', 150, 1]],
    'Burger': [['Klasik Burger', 'Ana yemek', 240, 0], ['Cheeseburger', 'Ana yemek', 265, 0], ['Tavuk Burger', 'Ana yemek', 215, 0], ['Sebze Burger', 'Ana yemek', 225, 1], ['Soğan Halkası', 'Yan ürün', 80, 1], ['Milkshake', 'İçecek', 110, 1]],
    'Ev Yemekleri': [['Kuru Fasulye Pilav', 'Ana yemek', 190, 1], ['Karnıyarık', 'Ana yemek', 210, 0], ['Mercimek Çorbası', 'Çorba', 85, 1], ['Tavuk Sote', 'Ana yemek', 225, 0], ['Sütlaç', 'Tatlı', 90, 1], ['Ayran', 'İçecek', 30, 1]],
    'Uzak Doğu': [['Tavuk Noodle', 'Ana yemek', 245, 0], ['Sebzeli Noodle', 'Ana yemek', 220, 1], ['Suşi Tabağı', 'Ana yemek', 420, 0], ['Bahar Rulosu', 'Yan ürün', 110, 1], ['Yeşil Çay', 'İçecek', 50, 1]],
    'Kebap': [['Adana Kebap', 'Ana yemek', 360, 0], ['Urfa Kebap', 'Ana yemek', 360, 0], ['Lahmacun', 'Ana yemek', 95, 0], ['Çoban Salata', 'Yan ürün', 70, 1], ['Şalgam', 'İçecek', 35, 1], ['Baklava', 'Tatlı', 180, 1]],
    'Tatlı ve Kahve': [['Latte', 'İçecek', 95, 1], ['Türk Kahvesi', 'İçecek', 70, 1], ['Cheesecake', 'Tatlı', 165, 1], ['Profiterol', 'Tatlı', 145, 1], ['Kruvasan', 'Yan ürün', 85, 1]],
    'Vegan': [['Falafel Tabağı', 'Ana yemek', 230, 1], ['Kinoa Salatası', 'Ana yemek', 215, 1], ['Mercimek Köftesi', 'Yan ürün', 95, 1], ['Humus', 'Yan ürün', 90, 1], ['Limonata', 'İçecek', 60, 1]]
  };
  const RNAME = { 'Döner': ['Köşe Dönercisi', 'Usta Döner', 'Dürümcü Hakkı', 'Döner Durağı', 'Sultan Döner'], 'Pizza': ['Fırın Pizza', 'Pizza Atölyesi', 'İnce Hamur', 'Napoli Köşesi'], 'Burger': ['Burger Garajı', 'Izgara Burger', 'Büyük Isırık', 'Burger Sokağı'], 'Ev Yemekleri': ['Anne Eli', 'Tencere Lokantası', 'Esnaf Sofrası', 'Bizim Mutfak', 'Günün Yemeği'], 'Uzak Doğu': ['Wok Durağı', 'Tokyo Kasesi', 'Bambu'], 'Kebap': ['Ocakbaşı Mehmet', 'Kebapçı Halil', 'Adana Sofrası', 'Antep Mutfağı'], 'Tatlı ve Kahve': ['Kahve Molası', 'Tatlı Durak', 'Fincan'], 'Vegan': ['Yeşil Tabak', 'Bostan Mutfak'] };
  const rest = [], menu = []; let rid = 0, mid = 0; const RMENU = {}, RINFO = {};
  Object.keys(RNAME).forEach(cu => RNAME[cu].forEach(nm => {
    rid++; const city = rid === 1 ? 'İstanbul' : wc(CW); const dist = rid === 1 ? 'Kadıköy' : bp(CITY[city]);
    const opened = (rid % 9 === 0) ? null : `20${bi(16, 24)}-${pad(bi(1, 12))}-${pad(bi(1, 28))}`;
    const comm = r2([12, 15, 18, 20, 22][bi(0, 4)]);
    const active = rid === 31 ? 0 : 1;
    rest.push([rid, nm, cu, city, dist, opened, comm, active]);
    const mult = 0.85 + R() * 0.35; RMENU[rid] = [];
    CUIS[cu].forEach(([n, cat, p, veg]) => { if (R() < 0.12 && cat !== 'Ana yemek') return; mid++; const price = Math.round(p * mult / 5) * 5; menu.push([mid, rid, n, cat, price, veg]); RMENU[rid].push([mid, price, cat]); });
    RINFO[rid] = { city, prep: bi(8, 22), pop: cu === 'Döner' || cu === 'Pizza' || cu === 'Burger' ? 3 : cu === 'Kebap' || cu === 'Ev Yemekleri' ? 2 : 1, cancel: rid === 17 ? 0.16 : 0.04 };
  }));
  sql += ins('lk_restaurants', ['restaurant_id', 'name', 'cuisine', 'city', 'district', 'opened_date', 'commission_pct', 'is_active'], rest);
  sql += ins('lk_menu_items', ['item_id', 'restaurant_id', 'name', 'category', 'price', 'is_vegetarian'], menu);

  /* Kişiler */
  const fm = ['Ahmet', 'Mehmet', 'Mustafa', 'Ali', 'Emre', 'Burak', 'Can', 'Murat', 'Kerem', 'Yusuf', 'Oğuz', 'Serkan', 'Deniz', 'Barış', 'Tolga', 'Onur', 'Eren', 'Kaan', 'Hakan', 'Selim', 'Umut', 'Arda', 'Efe', 'Mert'];
  const ff = ['Ayşe', 'Fatma', 'Zeynep', 'Elif', 'Merve', 'Esra', 'Selin', 'Ebru', 'Derya', 'Gamze', 'Buse', 'Ece', 'Damla', 'İrem', 'Melis', 'Özge', 'Pınar', 'Sevgi', 'Tuğba', 'Yasemin', 'Nur', 'Cansu', 'Defne', 'Ilgın'];
  const ln = ['Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Yıldız', 'Yıldırım', 'Öztürk', 'Aydın', 'Özdemir', 'Arslan', 'Doğan', 'Kılıç', 'Aslan', 'Çetin', 'Kara', 'Koç', 'Kurt', 'Özkan', 'Şimşek', 'Polat', 'Güneş', 'Ergin', 'Tunç', 'Bal', 'Ekici'];
  const person = () => (R() < 0.5 ? bp(fm) : bp(ff)) + ' ' + bp(ln);
  const cust = []; const CC = {};
  for (let i = 1; i <= 1200; i++) {
    const city = wc(CW); const dist = R() < 0.06 ? null : bp(CITY[city]);
    const sd = new Date(Date.UTC(2021, 0, 1) + Math.floor(R() * (Date.UTC(2024, 9, 31) - Date.UTC(2021, 0, 1))));
    const ref = i > 30 && R() < 0.22 ? bi(1, i - 1) : null;
    cust.push([i, person(), city, dist, ds(sd), ref, R() < 0.18 ? 1 : 0]); CC[i] = city;
  }
  /* Vaka: Kasım'da aynı kişinin davetiyle açılan 9 hesap (Kadıköy) */
  const RING_HOST = 214; cust[RING_HOST - 1][1] = 'Bora Keskin'; cust[RING_HOST - 1][2] = 'İstanbul'; cust[RING_HOST - 1][3] = 'Kadıköy'; CC[RING_HOST] = 'İstanbul';
  const RING = [];
  for (let j = 0; j < 9; j++) { const id = 1201 + j; cust.push([id, person(), 'İstanbul', 'Kadıköy', `2024-11-${pad(4 + j * 2)}`, RING_HOST, 0]); CC[id] = 'İstanbul'; RING.push(id); }
  sql += ins('lk_customers', ['customer_id', 'full_name', 'city', 'district', 'signup_date', 'referred_by', 'is_premium'], cust);

  const cour = []; const CR = { 'İstanbul': [], 'Ankara': [], 'İzmir': [] }; const SPEED = {};
  for (let i = 1; i <= 60; i++) {
    const city = i === 47 ? 'İstanbul' : wc(CW); const veh = wc([['motosiklet', 70], ['bisiklet', 15], ['araba', 15]]);
    const hd = `20${bi(21, 24)}-${pad(bi(1, 12))}-${pad(bi(1, 28))}`;
    cour.push([i, i === 47 ? 'Serdar Yalın' : person(), city, veh, i === 47 ? '2024-08-19' : hd, null]);
    CR[city].push(i); SPEED[i] = (veh === 'bisiklet' ? 1.3 : veh === 'araba' ? 1.12 : 1) * (0.85 + R() * 0.35);
  }

  /* Siparişler */
  const orders = [], lines = [], rat = []; let oid = 0;
  const RCITY = { 'İstanbul': [], 'Ankara': [], 'İzmir': [] }; rest.forEach(r => { for (let k = 0; k < RINFO[r[0]].pop; k++) RCITY[r[3]].push(r[0]); });
  const start = Date.UTC(2024, 9, 1), days = 92;
  const comments = { 5: ['Harika, sıcacık geldi', 'Çok lezzetliydi', 'Kurye çok nazikti', null, null], 4: ['Güzeldi', 'Biraz geç geldi ama lezzetli', null, null], 3: ['Ortalama', 'Porsiyon küçüktü', null], 2: ['Soğuk geldi', 'Eksik ürün vardı', 'Çok geç geldi'], 1: ['Sipariş yanlış geldi', 'Hiç memnun kalmadım', 'Yemek dökülmüştü'] };
  const mk = (c, r, placed, opt) => {
    oid++; const info = RINFO[r]; const city = rest[r - 1][3];
    const pool = CR[city]; const courier = opt.courier || pool[Math.floor(R() * pool.length)];
    const rain = [12, 13, 28, 41, 42, 55, 63, 64, 77, 85].includes(Math.floor((placed - start) / 86400000));
    let status = opt.status || (R() < info.cancel ? 'iptal' : R() < 0.025 ? 'iade' : 'teslim');
    const pay = opt.pay || wc([['kart', 66], ['nakit', 14], ['cüzdan', 20]]);
    let cid = courier, pk = null, dl = null;
    if (status === 'iptal') { if (R() < 0.55) cid = null; else pk = null; }
    else {
      const prep = info.prep * (0.7 + R() * 0.7) + (rain ? 4 : 0); const pkd = addMin(new Date(placed), prep);
      const trav = opt.trav !== undefined ? opt.trav : (9 + R() * 22) * SPEED[courier] + (rain ? 8 : 0) + (R() < 0.04 ? 25 : 0);
      pk = ts(pkd); dl = ts(addMin(pkd, trav));
    }
    const menuR = RMENU[r]; const mains0 = menuR.filter(m => m[2] === 'Ana yemek'); const mains = mains0.length ? mains0 : menuR; const n = opt.lines || bi(1, 4); const used = new Set(); let sub = 0;
    for (let k = 0; k < n; k++) { const m = k === 0 ? bp(mains) : bp(menuR); if (used.has(m[0])) continue; used.add(m[0]); const qty = R() < 0.8 ? 1 : bi(2, 3); lines.push([oid, m[0], qty, m[1]]); sub += qty * m[1]; }
    const fee = sub >= 400 ? 0 : [19.9, 24.9, 29.9][bi(0, 2)];
    const disc = opt.disc !== undefined ? opt.disc : (R() < 0.15 ? r2(Math.round(sub * [0.1, 0.15, 0.2][bi(0, 2)])) : 0);
    const tip = status === 'teslim' && R() < 0.3 ? [10, 15, 20, 25, 30][bi(0, 4)] : 0;
    orders.push([oid, c, r, cid, ts(new Date(placed)), pk, dl, status, pay, fee, disc, tip]);
    if (status === 'teslim' && R() < 0.58) { const late = dl && (new Date(dl.replace(' ', 'T') + 'Z') - placed) / 60000 > 55; const fs = Math.max(1, Math.min(5, Math.round(4.3 - (late ? 1.4 : 0) + (R() - 0.5) * 2.2))); const cs = Math.max(1, Math.min(5, Math.round(4.4 - (late ? 1.8 : 0) + (R() - 0.5) * 2))); rat.push([oid, fs, cs, bp(comments[Math.min(fs, cs)])]); }
    if (status === 'iade' && R() < 0.7) rat.push([oid, bi(1, 2), bi(1, 3), bp(comments[1])]);
  };
  const events = [];
  for (let d = 0; d < days; d++) {
    const day = new Date(start + d * 86400000); const wd = day.getUTCDay(); const wk = wd === 0 || wd === 6;
    const n = Math.round((wk ? 78 : 58) * (1 + d / 200) * (0.85 + R() * 0.3));
    for (let k = 0; k < n; k++) {
      const hr = wc([[11, 4], [12, 12], [13, 10], [14, 4], [15, 2], [16, 2], [17, 4], [18, 9], [19, 14], [20, 12], [21, 7], [22, 4], [23, 2], [0, 1]]);
      const t = start + d * 86400000 + (hr === 0 ? 86400000 : hr * 3600000) + Math.floor(R() * 3600000);
      const c = bi(1, 1200); const city = CC[c]; const rs = RCITY[city]; let r = rs[Math.floor(R() * rs.length)]; if (r === 31 && d > 60) r = rs[0];
      events.push([t, c, r, {}]);
    }
  }
  /* Vaka siparişleri: Aralık'ta halka hesaplarından Köşe Dönercisi'ne, kurye 47, iade + cüzdan */
  let ringN = 0;
  for (let d = 61; d < 92; d += 1) { if (d % 3 === 2) continue; const c = RING[ringN % RING.length]; ringN++; const t = start + d * 86400000 + (19 + (d % 3)) * 3600000 + 600000 * (d % 5); events.push([t, c, 1, { courier: 47, status: 'iade', pay: 'cüzdan', trav: 2.5 + (d % 3), lines: 3, disc: 0 }]); }
  /* Kurye 47'nin olağan işleri */
  events.forEach(e => { if (CC[e[1]] === 'İstanbul' && !e[3].courier && R() < 0.02) e[3].courier = 47; });
  events.sort((a, b) => a[0] - b[0]).forEach(e => mk(e[1], e[2], e[0], e[3]));
  /* Kurye puanı: verilen kurye puanlarının ortalaması (kurye 47 ve hiç puanı olmayanlar NULL) */
  const csum = {}; const OM = {}; orders.forEach(o => OM[o[0]] = o);
  rat.forEach(r => { const o = OM[r[0]]; if (o[3]) { (csum[o[3]] = csum[o[3]] || []).push(r[2]); } });
  cour.forEach(c => { const a = csum[c[0]]; c[5] = c[0] === 47 || !a ? null : r2(a.reduce((x, y) => x + y, 0) / a.length); });
  sql += ins('lk_couriers', ['courier_id', 'full_name', 'city', 'vehicle', 'hired_date', 'rating'], cour);
  sql += ins('lk_orders', ['order_id', 'customer_id', 'restaurant_id', 'courier_id', 'placed_at', 'picked_at', 'delivered_at', 'status', 'payment', 'delivery_fee', 'discount', 'tip'], orders);
  sql += ins('lk_order_lines', ['order_id', 'item_id', 'qty', 'unit_price'], lines);
  sql += ins('lk_ratings', ['order_id', 'food_score', 'courier_score', 'comment'], rat);

  sql += '\nCREATE INDEX ix_lk_orders_customer ON lk_orders (customer_id);\nCREATE INDEX ix_lk_orders_restaurant ON lk_orders (restaurant_id);\nCREATE INDEX ix_lk_orders_courier ON lk_orders (courier_id);\nCREATE INDEX ix_lk_lines_order ON lk_order_lines (order_id);\n';
  root.SQLP_SEED = (root.SQLP_SEED || '') + sql;
  Object.assign(root.SQLP_SCHEMA_NOTES = root.SQLP_SCHEMA_NOTES || {}, {
    lk_restaurants: 'Platformdaki restoranlar (36); commission_pct platformun aldığı komisyon (%), is_active 0 ise kapanmış',
    lk_menu_items: 'Restoran menüleri; price güncel fiyat (TL), is_vegetarian 1/0',
    lk_customers: 'Müşteriler; referred_by onları davet eden müşteri (kendine birleştirme), district bazen boş',
    lk_couriers: 'Kuryeler; rating müşterilerin verdiği kurye puanlarının ortalaması (puanı olmayanlarda boş)',
    lk_orders: 'Siparişler (Ekim–Aralık 2024); status teslim / iptal / iade. İptalde courier_id veya picked_at boş olabilir. Tutar = satırlar − discount + delivery_fee; tip kuryeye gider',
    lk_order_lines: 'Sipariş satırları; unit_price sipariş anındaki fiyat',
    lk_ratings: 'Sipariş değerlendirmeleri (1–5); comment çoğunlukla boş'
  });
  root.SQLP_TYPEMAP = root.SQLP_TYPEMAP || {};
  Object.assign(root.SQLP_COLMETA = root.SQLP_COLMETA || {}, {
    lk_restaurants: [['restaurant_id', 'int', 'Restoran numarası', 'pk'], ['name', 'text(60)', 'Restoran adı'], ['cuisine', 'text(30)', 'Mutfak türü'], ['city', 'text(30)', 'Şehir'], ['district', 'text(30)', 'İlçe'], ['opened_date', 'date', 'Platforma katılma tarihi (bazen boş)'], ['commission_pct', 'dec', 'Komisyon yüzdesi'], ['is_active', 'bit', 'Aktif mi (1/0)']],
    lk_menu_items: [['item_id', 'int', 'Ürün numarası', 'pk'], ['restaurant_id', 'int', 'Restoran', 'fk:lk_restaurants.restaurant_id'], ['name', 'text(60)', 'Ürün adı'], ['category', 'text(20)', 'Ana yemek / Yan ürün / İçecek / Tatlı / Çorba'], ['price', 'money', 'Güncel fiyat (TL)'], ['is_vegetarian', 'bit', 'Vejetaryen mi (1/0)']],
    lk_customers: [['customer_id', 'int', 'Müşteri numarası', 'pk'], ['full_name', 'text(60)', 'Ad soyad'], ['city', 'text(30)', 'Şehir'], ['district', 'text(30)', 'İlçe (bazen boş)'], ['signup_date', 'date', 'Kayıt tarihi'], ['referred_by', 'int', 'Davet eden müşteri', 'fk:lk_customers.customer_id'], ['is_premium', 'bit', 'Premium üye mi (1/0)']],
    lk_couriers: [['courier_id', 'int', 'Kurye numarası', 'pk'], ['full_name', 'text(60)', 'Ad soyad'], ['city', 'text(30)', 'Çalıştığı şehir'], ['vehicle', 'text(20)', 'motosiklet / bisiklet / araba'], ['hired_date', 'date', 'İşe başlama tarihi'], ['rating', 'dec', 'Ortalama kurye puanı (boş olabilir)']],
    lk_orders: [['order_id', 'int', 'Sipariş numarası', 'pk'], ['customer_id', 'int', 'Müşteri', 'fk:lk_customers.customer_id'], ['restaurant_id', 'int', 'Restoran', 'fk:lk_restaurants.restaurant_id'], ['courier_id', 'int', 'Kurye (iptalde boş olabilir)', 'fk:lk_couriers.courier_id'], ['placed_at', 'datetime', 'Sipariş zamanı'], ['picked_at', 'datetime', 'Kuryenin restorandan aldığı an'], ['delivered_at', 'datetime', 'Teslim anı'], ['status', 'text(10)', 'teslim / iptal / iade'], ['payment', 'text(10)', 'kart / nakit / cüzdan'], ['delivery_fee', 'money', 'Teslimat ücreti (400 TL üzeri 0)'], ['discount', 'money', 'İndirim (TL)'], ['tip', 'money', 'Kuryeye bahşiş (TL)']],
    lk_order_lines: [['order_id', 'int', 'Sipariş', 'fk:lk_orders.order_id'], ['item_id', 'int', 'Ürün', 'fk:lk_menu_items.item_id'], ['qty', 'int', 'Adet'], ['unit_price', 'money', 'Sipariş anındaki birim fiyat']],
    lk_ratings: [['order_id', 'int', 'Sipariş', 'pk'], ['food_score', 'int', 'Yemek puanı (1–5)'], ['courier_score', 'int', 'Kurye puanı (1–5)'], ['comment', 'text(200)', 'Yorum (çoğunlukla boş)']]
  });
})(typeof window !== 'undefined' ? window : globalThis);
