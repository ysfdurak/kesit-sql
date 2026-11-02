/* Kesit SQL — Kanat Havayolları örnek veritabanı (hayali; deterministik üretim)
   Eylül–Aralık 2024 uçuşları. Tüm zamanlar Türkiye saatiyle (UTC+3) tutulur. */
(function (root) {
  function rng(seed) { return function () { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const R = rng(20240901);
  const bi = (a, b) => a + Math.floor(R() * (b - a + 1));
  const bp = a => a[Math.floor(R() * a.length)];
  const q = v => v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : "'" + String(v).replace(/'/g, "''") + "'";
  const pad = n => String(n).padStart(2, '0');
  const ts = d => d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()) + ' ' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ':00';
  const ds = d => d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
  const addMin = (d, m) => new Date(d.getTime() + m * 60000);
  const ins = (t, cols, rows) => { let s = ''; for (let i = 0; i < rows.length; i += 400) s += 'INSERT INTO ' + t + ' (' + cols.join(',') + ') VALUES\n' + rows.slice(i, i + 400).map(r => '(' + r.map(q).join(',') + ')').join(',\n') + ';\n'; return s; };

  let sql = `
CREATE TABLE hv_airports (
  airport_code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  tz_offset INTEGER NOT NULL,
  lat REAL,
  lon REAL
);
CREATE TABLE hv_aircraft (
  tail_no TEXT PRIMARY KEY,
  model TEXT NOT NULL,
  seats INTEGER NOT NULL,
  year_built INTEGER
);
CREATE TABLE hv_routes (
  route_id INTEGER PRIMARY KEY,
  origin TEXT NOT NULL REFERENCES hv_airports(airport_code),
  dest TEXT NOT NULL REFERENCES hv_airports(airport_code),
  distance_km INTEGER,
  block_min INTEGER
);
CREATE TABLE hv_flights (
  flight_id INTEGER PRIMARY KEY,
  flight_no TEXT NOT NULL,
  route_id INTEGER NOT NULL REFERENCES hv_routes(route_id),
  tail_no TEXT REFERENCES hv_aircraft(tail_no),
  sched_dep TEXT NOT NULL,
  sched_arr TEXT NOT NULL,
  actual_dep TEXT,
  actual_arr TEXT,
  status TEXT NOT NULL,
  pax INTEGER
);
CREATE TABLE hv_delays (
  flight_id INTEGER NOT NULL REFERENCES hv_flights(flight_id),
  reason TEXT NOT NULL,
  minutes INTEGER NOT NULL
);
CREATE TABLE hv_passengers (
  passenger_id INTEGER PRIMARY KEY,
  full_name TEXT NOT NULL,
  gender TEXT,
  birth_year INTEGER,
  city TEXT,
  tier TEXT NOT NULL,
  joined_date TEXT,
  email TEXT
);
CREATE TABLE hv_bookings (
  booking_id INTEGER PRIMARY KEY,
  passenger_id INTEGER NOT NULL REFERENCES hv_passengers(passenger_id),
  flight_id INTEGER NOT NULL REFERENCES hv_flights(flight_id),
  booked_at TEXT NOT NULL,
  fare_class TEXT NOT NULL,
  price REAL NOT NULL,
  status TEXT NOT NULL,
  bags INTEGER,
  seat TEXT
);
`;
  /* Havalimanları */
  const AP = [
    ['IST', 'İstanbul Havalimanı', 'İstanbul', 'Türkiye', 3, 41.2753, 28.7519],
    ['SAW', 'Sabiha Gökçen', 'İstanbul', 'Türkiye', 3, 40.8986, 29.3092],
    ['ESB', 'Esenboğa', 'Ankara', 'Türkiye', 3, 40.1281, 32.9951],
    ['ADB', 'Adnan Menderes', 'İzmir', 'Türkiye', 3, 38.2924, 27.1570],
    ['AYT', 'Antalya', 'Antalya', 'Türkiye', 3, 36.8987, 30.8005],
    ['DLM', 'Dalaman', 'Muğla', 'Türkiye', 3, 36.7131, 28.7925],
    ['TZX', 'Trabzon', 'Trabzon', 'Türkiye', 3, 40.9951, 39.7897],
    ['GZT', 'Gaziantep', 'Gaziantep', 'Türkiye', 3, 36.9472, 37.4787],
    ['DIY', 'Diyarbakır', 'Diyarbakır', 'Türkiye', 3, 37.8939, 40.2010],
    ['ERZ', 'Erzurum', 'Erzurum', 'Türkiye', 3, 39.9565, 41.1702],
    ['VAN', 'Van Ferit Melen', 'Van', 'Türkiye', 3, 38.4682, 43.3323],
    ['ADA', 'Adana Şakirpaşa', 'Adana', 'Türkiye', 3, 36.9822, 35.2804],
    ['FRA', 'Frankfurt', 'Frankfurt', 'Almanya', 1, 50.0379, 8.5622],
    ['BER', 'Berlin Brandenburg', 'Berlin', 'Almanya', 1, 52.3667, 13.5033],
    ['AMS', 'Schiphol', 'Amsterdam', 'Hollanda', 1, 52.3105, 4.7683],
    ['LHR', 'Heathrow', 'Londra', 'Birleşik Krallık', 0, 51.4700, -0.4543],
    ['CDG', 'Charles de Gaulle', 'Paris', 'Fransa', 1, 49.0097, 2.5479],
    ['DXB', 'Dubai', 'Dubai', 'BAE', 4, 25.2532, 55.3657],
    ['BAK', 'Haydar Aliyev', 'Bakü', 'Azerbaycan', 4, 40.4675, 50.0467]
  ];
  sql += ins('hv_airports', ['airport_code', 'name', 'city', 'country', 'tz_offset', 'lat', 'lon'], AP);
  const APM = {}; AP.forEach(a => APM[a[0]] = a);

  /* Filo */
  const FLEET = [
    ['TC-KNA', 'A320neo', 180, 2019], ['TC-KNB', 'A320neo', 180, 2019], ['TC-KNC', 'A320neo', 180, 2020], ['TC-KND', 'A320neo', 180, 2021],
    ['TC-KNE', 'A321neo', 220, 2021], ['TC-KNF', 'A321neo', 220, 2022], ['TC-KNG', 'A321neo', 220, 2023],
    ['TC-KBA', 'B737-800', 189, 2012], ['TC-KBB', 'B737-800', 189, 2013], ['TC-KBC', 'B737-800', 189, 2015],
    ['TC-KMA', 'B737 MAX 8', 189, 2022], ['TC-KMB', 'B737 MAX 8', 189, 2023],
    ['TC-KWA', 'A330-300', 289, 2014], ['TC-KWB', 'A330-300', 289, 2016],
    ['TC-KYA', 'A320neo', 180, 2024]
  ];
  sql += ins('hv_aircraft', ['tail_no', 'model', 'seats', 'year_built'], FLEET);
  const SEATS = {}; FLEET.forEach(f => SEATS[f[0]] = f[2]);

  /* Rotalar (her çift iki yönlü) ve haftalık sıklık */
  const PAIRS = [
    ['IST', 'ESB', 7], ['IST', 'ADB', 7], ['IST', 'AYT', 7], ['IST', 'TZX', 5], ['IST', 'GZT', 4], ['IST', 'DIY', 4], ['IST', 'ERZ', 3], ['IST', 'VAN', 3], ['IST', 'ADA', 4],
    ['IST', 'FRA', 5], ['IST', 'AMS', 4], ['IST', 'LHR', 4], ['IST', 'CDG', 3], ['IST', 'DXB', 4], ['IST', 'BAK', 3],
    ['SAW', 'ADB', 5], ['SAW', 'AYT', 4], ['SAW', 'TZX', 3], ['SAW', 'BER', 3], ['ESB', 'ADB', 4], ['ESB', 'AYT', 3], ['ESB', 'DLM', 2]
  ];
  const hav = (a, b) => { const r = x => x * Math.PI / 180; const d = Math.sin(r(b[5] - a[5]) / 2) ** 2 + Math.cos(r(a[5])) * Math.cos(r(b[5])) * Math.sin(r(b[6] - a[6]) / 2) ** 2; return Math.round(6371 * 2 * Math.asin(Math.sqrt(d))); };
  const routes = []; let rid = 1;
  for (const [o, d, f] of PAIRS) {
    const km = hav(APM[o], APM[d]); const blk = Math.round(km / 12 + 30);
    routes.push({ id: rid++, o, d, km, blk, f }); routes.push({ id: rid++, o: d, d: o, km, blk, f });
  }
  /* Planlanmış ama henüz uçuşu olmayan rota (LEFT JOIN alıştırmaları için) */
  routes.push({ id: rid++, o: 'ADB', d: 'FRA', km: hav(APM.ADB, APM.FRA), blk: Math.round(hav(APM.ADB, APM.FRA) / 12 + 30), f: 0 });
  sql += ins('hv_routes', ['route_id', 'origin', 'dest', 'distance_km', 'block_min'], routes.map(r => [r.id, r.o, r.d, r.km, r.blk]));

  /* Uçuşlar */
  const intl = c => APM[c][3] !== 'Türkiye';
  const flights = [], delays = [];
  let fid = 1;
  const start = Date.UTC(2024, 8, 1), end = Date.UTC(2024, 11, 31);
  routes.forEach((r, ri) => {
    if (!r.f) return;
    const wide = r.o === 'DXB' || r.d === 'DXB';
    const pool = wide ? ['TC-KWA', 'TC-KWB'] : intl(r.o) || intl(r.d) ? ['TC-KNE', 'TC-KNF', 'TC-KNG', 'TC-KMA', 'TC-KMB', 'TC-KND'] : ['TC-KNA', 'TC-KNB', 'TC-KNC', 'TC-KND', 'TC-KBA', 'TC-KBB', 'TC-KBC', 'TC-KMA', 'TC-KYA'];
    const fno = 'KN' + (100 + r.id);
    const depH = [6, 7, 8, 9, 10, 12, 14, 16, 18, 19, 20, 21][(ri * 5) % 12]; const depM = [0, 15, 30, 45][ri % 4];
    const days = [0, 1, 2, 3, 4, 5, 6].filter((_, i) => r.f >= 7 || ((i * 3 + ri) % 7) < r.f);
    for (let t = start; t <= end; t += 86400000) {
      const day = new Date(t); if (!days.includes(day.getUTCDay())) continue;
      const dep = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), depH, depM));
      const arr = addMin(dep, r.blk);
      const tail = pool[(fid + ri) % pool.length];
      const month = day.getUTCMonth();
      const winter = month === 11 ? 1.6 : month === 10 ? 1.2 : 1;
      const evening = depH >= 18 ? 1.4 : 1;
      const east = ['ERZ', 'VAN', 'TZX'].includes(r.o) || ['ERZ', 'VAN', 'TZX'].includes(r.d);
      let status = 'landed', ad = null, aa = null, pax;
      const u = R();
      if (u < 0.014 * winter * winter * (east ? 2 : 1)) { status = 'cancelled'; pax = 0; }
      else {
        const v = 1 - (1 - R()) / (winter * evening); let dly;
        if (v < 0.62) dly = bi(-3, 5); else if (v < 0.88) dly = bi(6, 30); else if (v < 0.975) dly = bi(31, 120); else dly = bi(121, 290);
        ad = addMin(dep, dly);
        const seats = SEATS[tail];
        const base = intl(r.o) || intl(r.d) ? 0.82 : 0.76;
        const season = month === 8 ? 0.06 : month === 11 ? 0.05 : 0;
        const wk = [5, 0].includes(day.getUTCDay()) ? 0.06 : 0;
        pax = Math.min(seats, Math.round(seats * Math.max(0.35, Math.min(0.99, base + season + wk + (R() - 0.5) * 0.25))));
        if (R() < 0.003) { status = 'diverted'; aa = null; }
        else aa = addMin(ad, r.blk + bi(-12, 15));
        if (dly >= 15) {
          const rs = dly > 90 && R() < 0.5 ? ['hava', 'gec_gelen_ucak'] : [bp(['gec_gelen_ucak', 'gec_gelen_ucak', 'hava', 'teknik', 'yer_hizmetleri', 'hava_trafik'])];
          if (east && winter > 1 && R() < 0.6) rs[0] = 'hava';
          if (rs.length === 1) delays.push([fid, rs[0], dly]);
          else { const a = Math.round(dly * (0.4 + R() * 0.3)); delays.push([fid, rs[0], a]); delays.push([fid, rs[1], dly - a]); }
        }
      }
      flights.push([fid, fno, r.id, tail, ts(dep), ts(arr), ad ? ts(ad) : null, aa ? ts(aa) : null, status, pax, r]);
      fid++;
    }
  });
  sql += ins('hv_flights', ['flight_id', 'flight_no', 'route_id', 'tail_no', 'sched_dep', 'sched_arr', 'actual_dep', 'actual_arr', 'status', 'pax'], flights.map(f => f.slice(0, 10)));
  sql += ins('hv_delays', ['flight_id', 'reason', 'minutes'], delays);

  /* Yolcular (Kanat Mil üyeleri) */
  const fm = ['Ahmet', 'Mehmet', 'Mustafa', 'Ali', 'Emre', 'Burak', 'Can', 'Murat', 'Kerem', 'Yusuf', 'Oğuz', 'Serkan', 'Deniz', 'Barış', 'Tolga', 'Onur', 'Eren', 'Kaan', 'Hakan', 'Selim', 'Umut', 'İlker'];
  const ff = ['Ayşe', 'Fatma', 'Zeynep', 'Elif', 'Merve', 'Esra', 'Selin', 'Ebru', 'Derya', 'Gamze', 'Buse', 'Ece', 'Damla', 'İrem', 'Melis', 'Özge', 'Pınar', 'Sevgi', 'Tuğba', 'Yasemin', 'Nur', 'Cansu'];
  const ln = ['Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Yıldız', 'Yıldırım', 'Öztürk', 'Aydın', 'Özdemir', 'Arslan', 'Doğan', 'Kılıç', 'Aslan', 'Çetin', 'Kara', 'Koç', 'Kurt', 'Özkan', 'Şimşek', 'Polat', 'Erdoğan', 'Güneş', 'Aksoy'];
  const pcity = [['İstanbul', 34], ['Ankara', 14], ['İzmir', 11], ['Antalya', 7], ['Trabzon', 4], ['Gaziantep', 4], ['Adana', 5], ['Diyarbakır', 3], ['Erzurum', 2], ['Van', 2], ['Muğla', 2], ['Bursa', 4], ['Kocaeli', 3]];
  const wc = arr => { const tot = arr.reduce((a, x) => a + x[1], 0); let v = R() * tot; for (const x of arr) { v -= x[1]; if (v < 0) return x[0]; } return arr[0][0]; };
  const tr = s => s.toLowerCase().replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/i̇/g, 'i');
  const pax = [];
  for (let i = 1; i <= 900; i++) {
    const g = R() < 0.48 ? 'K' : 'E'; const f = g === 'K' ? bp(ff) : bp(fm); const l = bp(ln);
    const tier = wc([['Classic', 62], ['Silver', 22], ['Gold', 11], ['Elite', 5]]);
    const jd = new Date(Date.UTC(2016 + bi(0, 8), bi(0, 11), bi(1, 28)));
    const email = R() < 0.07 ? null : tr(f) + '.' + tr(l) + (R() < 0.3 ? bi(1, 99) : '') + '@' + bp(['gmail.com', 'gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'icloud.com']);
    pax.push([i, f + ' ' + l, g, bi(1950, 2006), R() < 0.04 ? null : wc(pcity), tier, ds(jd > new Date(Date.UTC(2024, 10, 30)) ? new Date(Date.UTC(2024, 5, 1)) : jd), email]);
  }
  sql += ins('hv_passengers', ['passenger_id', 'full_name', 'gender', 'birth_year', 'city', 'tier', 'joined_date', 'email'], pax);

  /* Rezervasyonlar */
  const bookings = []; let bid = 1;
  const nFor = { Classic: [0, 6], Silver: [3, 12], Gold: [6, 18], Elite: [12, 30] };
  const homeAp = { 'İstanbul': ['IST', 'SAW'], 'Ankara': ['ESB'], 'İzmir': ['ADB'], 'Antalya': ['AYT'], 'Trabzon': ['TZX'], 'Gaziantep': ['GZT'], 'Adana': ['ADA'], 'Diyarbakır': ['DIY'], 'Erzurum': ['ERZ'], 'Van': ['VAN'], 'Muğla': ['DLM'], 'Bursa': ['IST', 'SAW'], 'Kocaeli': ['SAW', 'IST'] };
  const byOrigin = {}; flights.forEach(f => { (byOrigin[f[10].o] = byOrigin[f[10].o] || []).push(f); });
  const allF = flights;
  for (const p of pax) {
    const [lo, hi] = nFor[p[5]]; const n = p[0] % 37 === 0 ? 0 : bi(lo, hi);
    const home = homeAp[p[4]] || ['IST'];
    const used = new Set();
    for (let k = 0; k < n; k++) {
      let cand = R() < 0.7 ? (byOrigin[bp(home)] || allF) : allF;
      let f = bp(cand), guard = 0;
      while (used.has(f[0]) && guard++ < 5) f = bp(cand);
      if (used.has(f[0])) continue; used.add(f[0]);
      const r = f[10]; const dep = new Date(f[4].replace(' ', 'T') + 'Z');
      const lead = Math.max(0, Math.round(-Math.log(1 - R() * 0.97) * 22));
      const bat = addMin(dep, -(lead * 1440 + bi(60, 900)));
      const cls = p[5] === 'Elite' && R() < 0.35 ? 'Business' : R() < (intl(r.o) || intl(r.d) ? 0.1 : 0.05) ? 'Business' : R() < 0.3 ? 'EkoFlex' : 'Eko';
      const leadF = lead < 3 ? 1.6 : lead < 7 ? 1.3 : lead < 21 ? 1.05 : 0.85;
      const clsF = cls === 'Business' ? 3.2 : cls === 'EkoFlex' ? 1.35 : 1;
      const price = Math.round((350 + r.km * 1.15) * leadF * clsF * (0.9 + R() * 0.2) / 5) * 5;
      let st;
      if (f[8] === 'cancelled') st = 'cancelled';
      else { const v = R(); st = v < 0.06 ? 'cancelled' : v < 0.09 ? 'no_show' : 'flown'; }
      const bags = cls === 'Business' ? bi(1, 2) : R() < 0.35 ? 0 : bi(1, 2);
      const seat = st === 'flown' || st === 'no_show' ? (cls === 'Business' ? bi(1, 3) : bi(4, 32)) + bp(['A', 'B', 'C', 'D', 'E', 'F']) : null;
      bookings.push([0, p[0], f[0], ts(bat), cls, price, st, bags, seat]);
    }
  }
  bookings.sort((a, b) => a[3] < b[3] ? -1 : a[3] > b[3] ? 1 : a[1] - b[1]); bookings.forEach(b => b[0] = bid++);
  sql += ins('hv_bookings', ['booking_id', 'passenger_id', 'flight_id', 'booked_at', 'fare_class', 'price', 'status', 'bags', 'seat'], bookings);

  sql += '\nCREATE INDEX ix_hv_flights_route ON hv_flights (route_id);\nCREATE INDEX ix_hv_bookings_flight ON hv_bookings (flight_id);\nCREATE INDEX ix_hv_bookings_pax ON hv_bookings (passenger_id);\n';
  root.SQLP_SEED = (root.SQLP_SEED || '') + sql;
  Object.assign(root.SQLP_SCHEMA_NOTES = root.SQLP_SCHEMA_NOTES || {}, {
    hv_airports: 'Kanat Havayolları\'nın uçtuğu havalimanları (19); tz_offset UTC farkı (saat, kış saati)',
    hv_aircraft: 'Filo (15 uçak); seats koltuk sayısı',
    hv_routes: 'Rotalar: her şehir çifti iki yönlü; ADB → FRA henüz uçuşu olmayan planlı rota',
    hv_flights: 'Eylül–Aralık 2024 uçuşları; zamanlar Türkiye saati; status: landed / cancelled / diverted; pax uçağa binen yolcu',
    hv_delays: 'Rötar nedenleri: 15 dakika ve üzeri kalkış gecikmelerinde, bir uçuşta birden çok neden olabilir',
    hv_passengers: 'Kanat Mil üyeleri (900 yolcu); tier: Classic / Silver / Gold / Elite',
    hv_bookings: 'Üyelerin rezervasyonları; status: flown / cancelled / no_show; price TL'
  });
  root.SQLP_TYPEMAP = root.SQLP_TYPEMAP || {};
  root.SQLP_TYPEMAP.coord = { tsql: 'DECIMAL(9,6)', pg: 'NUMERIC(9,6)', mysql: 'DECIMAL(9,6)', oracle: 'NUMBER(9,6)', bq: 'NUMERIC', sqlite: 'REAL' };
  Object.assign(root.SQLP_COLMETA = root.SQLP_COLMETA || {}, {
    hv_airports: [['airport_code', 'text(3)', 'IATA kodu (IST, ESB, FRA…)', 'pk'], ['name', 'text(60)', 'Havalimanı adı'], ['city', 'text(40)', 'Şehir'], ['country', 'text(40)', 'Ülke'], ['tz_offset', 'int', 'UTC farkı (saat)'], ['lat', 'coord', 'Enlem'], ['lon', 'coord', 'Boylam']],
    hv_aircraft: [['tail_no', 'text(8)', 'Kuyruk tescili (TC-…)', 'pk'], ['model', 'text(20)', 'Uçak tipi'], ['seats', 'int', 'Koltuk sayısı'], ['year_built', 'int', 'Üretim yılı']],
    hv_routes: [['route_id', 'int', 'Rota numarası', 'pk'], ['origin', 'text(3)', 'Kalkış havalimanı', 'fk:hv_airports.airport_code'], ['dest', 'text(3)', 'Varış havalimanı', 'fk:hv_airports.airport_code'], ['distance_km', 'int', 'Büyük çember mesafesi (km)'], ['block_min', 'int', 'Planlanan uçuş süresi (dakika)']],
    hv_flights: [['flight_id', 'int', 'Uçuş kaydı', 'pk'], ['flight_no', 'text(8)', 'Sefer numarası (KN…)'], ['route_id', 'int', 'Rota', 'fk:hv_routes.route_id'], ['tail_no', 'text(8)', 'Uçak', 'fk:hv_aircraft.tail_no'], ['sched_dep', 'datetime', 'Planlanan kalkış'], ['sched_arr', 'datetime', 'Planlanan varış'], ['actual_dep', 'datetime', 'Gerçek kalkış (iptalde boş)'], ['actual_arr', 'datetime', 'Gerçek varış (iptal ve yön değişikliğinde boş)'], ['status', 'text(10)', 'landed / cancelled / diverted'], ['pax', 'int', 'Uçağa binen yolcu sayısı']],
    hv_delays: [['flight_id', 'int', 'Uçuş', 'fk:hv_flights.flight_id'], ['reason', 'text(20)', 'gec_gelen_ucak / hava / teknik / yer_hizmetleri / hava_trafik'], ['minutes', 'int', 'Bu nedene bağlanan gecikme (dakika)']],
    hv_passengers: [['passenger_id', 'int', 'Üye numarası', 'pk'], ['full_name', 'text(80)', 'Ad soyad'], ['gender', 'text(1)', 'E / K'], ['birth_year', 'int', 'Doğum yılı'], ['city', 'text(40)', 'Yaşadığı şehir (bazıları boş)'], ['tier', 'text(10)', 'Classic / Silver / Gold / Elite'], ['joined_date', 'date', 'Üyelik tarihi'], ['email', 'text(120)', 'E-posta (bazıları boş)']],
    hv_bookings: [['booking_id', 'int', 'Rezervasyon numarası', 'pk'], ['passenger_id', 'int', 'Yolcu', 'fk:hv_passengers.passenger_id'], ['flight_id', 'int', 'Uçuş', 'fk:hv_flights.flight_id'], ['booked_at', 'datetime', 'Rezervasyon zamanı'], ['fare_class', 'text(10)', 'Eko / EkoFlex / Business'], ['price', 'money', 'Ödenen tutar (TL)'], ['status', 'text(10)', 'flown / cancelled / no_show'], ['bags', 'int', 'Bagaj adedi'], ['seat', 'text(4)', 'Koltuk (12C gibi; iptalde boş)']]
  });
})(typeof window !== 'undefined' ? window : globalThis);
