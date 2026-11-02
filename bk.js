/* Kesit SQL — Pedal İzmir bisiklet paylaşımı veri seti (hayali; deterministik üretim)
   Haziran–Ağustos 2024: 60 istasyon, 700 bisiklet, 6.000 kullanıcı, saatlik hava durumu ve yaklaşık 120.000 yolculuk.
   Büyük tablo SQLite içinde özyinelemeli sorguyla üretilir: tohum metni küçük kalır, veri tam ve tekrarlanabilir.
   Örüntüler: hafta içi sabah ve akşam iş çıkışı zirvesi, hafta sonu öğleden sonra; yağmurda düşüş; elektrikli bisikletler daha hızlı;
   sahil istasyonları çekici; bazı yolculuklar kapanmamış; bazı bisikletler aynı anda iki yolculukta görünür (veri kalitesi). */
(function (root) {
  function rng(seed) { return function () { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const R = rng(20240601);
  const q = v => v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : "'" + String(v).replace(/'/g, "''") + "'";
  const pad = n => String(n).padStart(2, '0');
  const ins = (t, cols, rows) => { let s = ''; for (let i = 0; i < rows.length; i += 500) s += 'INSERT INTO ' + t + ' (' + cols.join(',') + ') VALUES\n' + rows.slice(i, i + 500).map(r => '(' + r.map(q).join(',') + ')').join(',\n') + ';\n'; return s; };

  let sql = `
CREATE TABLE bk_stations (station_id INTEGER PRIMARY KEY, name TEXT NOT NULL, district TEXT NOT NULL, lat REAL NOT NULL, lon REAL NOT NULL, capacity INTEGER NOT NULL, is_coastal INTEGER NOT NULL);
CREATE TABLE bk_bikes (bike_id INTEGER PRIMARY KEY, model TEXT NOT NULL, commissioned TEXT NOT NULL);
CREATE TABLE bk_users (user_id INTEGER PRIMARY KEY, user_type TEXT NOT NULL, signup_date TEXT NOT NULL, birth_year INTEGER, gender TEXT);
CREATE TABLE bk_weather (obs_hour TEXT PRIMARY KEY, temp_c REAL NOT NULL, rain_mm REAL NOT NULL, wind_kmh REAL NOT NULL);
CREATE TABLE bk_trips (trip_id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES bk_users(user_id), bike_id INTEGER NOT NULL REFERENCES bk_bikes(bike_id), start_station INTEGER NOT NULL REFERENCES bk_stations(station_id), end_station INTEGER REFERENCES bk_stations(station_id), started_at TEXT NOT NULL, ended_at TEXT, distance_km REAL, fare REAL);
CREATE TABLE bk_maintenance (ticket_id INTEGER PRIMARY KEY, bike_id INTEGER NOT NULL REFERENCES bk_bikes(bike_id), opened_at TEXT NOT NULL, closed_at TEXT, issue TEXT NOT NULL);
`;
  /* İstasyonlar: İzmir'in sahil ve merkez ilçeleri */
  const D = [['Konak', 38.4189, 27.1287, 1], ['Alsancak', 38.4370, 27.1430, 1], ['Karşıyaka', 38.4560, 27.1100, 1], ['Bostanlı', 38.4600, 27.0950, 1], ['Bornova', 38.4620, 27.2170, 0], ['Buca', 38.3880, 27.1750, 0], ['Bayraklı', 38.4620, 27.1650, 1], ['Göztepe', 38.4000, 27.0900, 1], ['Balçova', 38.3900, 27.0500, 0], ['Narlıdere', 38.3950, 27.0050, 1]];
  const ST = []; let sid = 0;
  const SN = ['Meydan', 'İskele', 'Park', 'Çarşı', 'Metro', 'Kordon', 'Kampüs'];
  D.forEach(([d, la, lo, co]) => { const n = d === 'Bornova' || d === 'Konak' || d === 'Alsancak' ? 8 : d === 'Narlıdere' || d === 'Balçova' ? 4 : 6; for (let i = 0; i < n; i++) { sid++; const coastal = co && i < Math.ceil(n / 2) ? 1 : 0; ST.push([sid, d + ' ' + SN[i % SN.length] + (i >= SN.length ? ' 2' : ''), d, +(la + (R() - 0.5) * 0.014).toFixed(5), +(lo + (R() - 0.5) * 0.018).toFixed(5), [15, 20, 25, 30][Math.floor(R() * 4)], coastal]); } });
  sql += ins('bk_stations', ['station_id', 'name', 'district', 'lat', 'lon', 'capacity', 'is_coastal'], ST);
  /* Saatlik hava durumu */
  const W = []; const start = Date.UTC(2024, 5, 1);
  const rainDays = new Set([3, 4, 17, 29, 30, 52, 70, 71, 85]);
  for (let h = 0; h < 92 * 24; h++) { const t = new Date(start + h * 3600000); const day = Math.floor(h / 24), hr = h % 24; const base = 27 + Math.sin((day / 92) * Math.PI) * 5; const temp = base + 5.5 * Math.sin(((hr - 9) / 24) * 2 * Math.PI) + (R() - 0.5) * 2; const rain = rainDays.has(day) && hr >= 10 && hr <= 19 && R() < 0.75 ? +(0.5 + R() * 6).toFixed(1) : 0; const wind = +(8 + R() * 14 + (hr >= 13 && hr <= 18 ? 8 : 0) + (rain ? 6 : 0)).toFixed(1); W.push([t.getUTCFullYear() + '-' + pad(t.getUTCMonth() + 1) + '-' + pad(t.getUTCDate()) + ' ' + pad(hr) + ':00:00', +temp.toFixed(1), rain, wind]); }
  sql += ins('bk_weather', ['obs_hour', 'temp_c', 'rain_mm', 'wind_kmh'], W);
  /* Yardımcı tablolar: saat ağırlıkları (hafta içi / hafta sonu), istasyon çekiciliği, istasyon arası mesafe */
  const HW = { 0: [0, 1, 2, 2, 1, 1], 1: [3, 2, 1, 1, 0, 0], 2: [1, 1, 0, 0, 0, 0], 3: [1, 0, 0, 0, 0, 0], 4: [1, 0, 0, 0, 0, 0], 5: [2, 1, 0, 0, 0, 0], 6: [8, 2], 7: [26, 4], 8: [38, 7], 9: [22, 12], 10: [12, 18], 11: [12, 24], 12: [14, 28], 13: [13, 30], 14: [12, 31], 15: [14, 32], 16: [20, 33], 17: [36, 34], 18: [44, 32], 19: [32, 30], 20: [22, 26], 21: [14, 20], 22: [8, 12], 23: [4, 6] };
  const hrow = []; ['wd', 'we'].forEach((k, ki) => { let acc = 0; const tot = Array.from({ length: 24 }, (_, h) => (HW[h][ki] !== undefined ? HW[h][ki] : HW[h][0])).reduce((a, b) => a + b, 0); for (let h = 0; h < 24; h++) { const w = HW[h][ki] !== undefined ? HW[h][ki] : HW[h][0]; const lo = Math.round(acc / tot * 10000); acc += w; const hi = Math.round(acc / tot * 10000); if (hi > lo) hrow.push([k, h, lo, hi]); } });
  const srow = []; { let acc = 0; const ws = ST.map(s => (s[6] ? 2.2 : 1) * (['Alsancak', 'Konak', 'Bornova'].includes(s[2]) ? 1.6 : 1) * (0.6 + R() * 0.8)); const tot = ws.reduce((a, b) => a + b, 0); ST.forEach((s, i) => { const lo = Math.round(acc / tot * 10000); acc += ws[i]; srow.push([s[0], lo, Math.round(acc / tot * 10000)]); }); }
  const drow = []; ST.forEach(a => { const nb = ST.filter(b => b[2] === a[2] && b[0] !== a[0]); ST.forEach(b => { const km = Math.sqrt(((a[3] - b[3]) * 111) ** 2 + ((a[4] - b[4]) * 111 * 0.783) ** 2) * 1.3; const k = nb.indexOf(b); drow.push([a[0], b[0], +km.toFixed(2), a[2] === b[2] ? 1 : 0, k >= 0 ? k : null, nb.length]); }); });
  /* Eşitlikle birleştirilecek arama tabloları (aralık birleştirmesi yerine; büyük üretimi hızlandırır) */
  const hk = [], sk = [], nb = [];
  hrow.forEach(([k, h, lo, hi]) => { for (let x = lo; x < hi; x++) hk.push([k === 'we' ? 1 : 0, x, h]); });
  srow.forEach(([st, lo, hi]) => { for (let x = lo; x < hi; x++) sk.push([x, st]); });
  drow.forEach(r => { if (r[4] !== null) nb.push([r[0], r[4], r[1]]); });
  const cnt = {}; nb.forEach(r => cnt[r[0]] = (cnt[r[0]] || 0) + 1);
  sql += `CREATE TABLE bk__h (we INTEGER, key INTEGER, h INTEGER, PRIMARY KEY (we, key)); CREATE TABLE bk__s (key INTEGER PRIMARY KEY, station_id INTEGER); CREATE TABLE bk__nb (a INTEGER, rn INTEGER, b INTEGER, PRIMARY KEY (a, rn)); CREATE TABLE bk__nc (a INTEGER PRIMARY KEY, cnt INTEGER); CREATE TABLE bk__d (a INTEGER, b INTEGER, km REAL, PRIMARY KEY (a, b));\n`;
  sql += ins('bk__h', ['we', 'key', 'h'], hk) + ins('bk__s', ['key', 'station_id'], sk) + ins('bk__nb', ['a', 'rn', 'b'], nb) + ins('bk__nc', ['a', 'cnt'], Object.keys(cnt).map(k => [+k, cnt[k]])) + ins('bk__d', ['a', 'b', 'km'], drow.map(r => [r[0], r[1], r[2]]));
  /* Bisikletler ve kullanıcılar (SQL ile) */
  sql += `INSERT INTO bk_bikes (bike_id, model, commissioned)
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 700)
SELECT i, CASE WHEN i % 4 = 0 THEN 'elektrikli' ELSE 'klasik' END, date('2022-03-01', '+' || ((i * 7919) % 820) || ' days') FROM n;
INSERT INTO bk_users (user_id, user_type, signup_date, birth_year, gender)
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 6000)
SELECT i, CASE WHEN (i * 2654435761) % 100 < 58 THEN 'abone' ELSE 'tek seferlik' END,
       CASE WHEN i <= 3600 THEN date('2021-01-01', '+' || ((i * 48271) % 1240) || ' days') ELSE date('2024-06-01', '+' || CAST((i - 3600) * 92 / 2400 AS INTEGER) || ' days', '-' || (i % 4) || ' days') END,
       CASE WHEN (i * 69069) % 100 < 7 THEN NULL ELSE 1955 + ((i * 69069) % 50) END,
       CASE WHEN (i * 1103515245) % 100 < 5 THEN NULL WHEN (i * 1103515245) % 100 < 52 THEN 'E' ELSE 'K' END FROM n;
`;
  /* Yolculuklar: her satır için bağımsız sözde rastgele sayılar (doğrusal eşlik üreteci) */
  sql += `CREATE TABLE bk__n AS
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < /*BK_N*/132000)
SELECT i,
       ((i * 1103515245 + 12345) % 2147483648) / 7 % 92 AS gun,
       ((i * 22695477 + 1) % 4294967296) / 3 % 10000 AS hkey,
       ((i * 214013 + 2531011) % 4294967296) AS c,
       ((i * 134775813 + 1) % 4294967296) / 5 % 10000 AS skey,
       ((i * 69069 + 362437) % 4294967296) AS e,
       (((i * 2246822519 + 3266489917) % 4294967296) / 1000 % 100000) / 100000.0 AS r
FROM n;
CREATE TABLE bk__raw2 AS
SELECT x.i AS i, x.gun AS gun, h.h AS saat, (x.c / 13) % 3600 AS sn, s.station_id AS bas, x.c AS c, x.e AS e,
       CASE WHEN (x.e / 11) % 100 < 6 THEN s.station_id
            WHEN (x.e / 11) % 100 < 46 THEN nb.b
            ELSE s2.station_id END AS bit,
       1 + CAST((3600 + 2400 * x.gun / 92.0) * CASE WHEN (x.e / 13) % 100 < 55 THEN x.r * sqrt(x.r) ELSE x.r END AS INTEGER) AS user_id,
       1 + (x.e / 3) % 700 AS bike_id
FROM bk__n x
JOIN bk__h h ON h.we = CASE WHEN (6 + x.gun) % 7 IN (0, 6) THEN 1 ELSE 0 END AND h.key = x.hkey
JOIN bk__s s ON s.key = x.skey
JOIN bk__s s2 ON s2.key = (x.c / 7) % 10000
LEFT JOIN bk__nc nc ON nc.a = s.station_id
LEFT JOIN bk__nb nb ON nb.a = s.station_id AND nb.rn = x.i % nc.cnt;
ALTER TABLE bk__raw2 ADD COLUMN bas_zaman TEXT;
UPDATE bk__raw2 SET bas_zaman = datetime('2024-06-01', '+' || (gun * 86400 + saat * 3600 + sn) || ' seconds');
INSERT INTO bk_trips (trip_id, user_id, bike_id, start_station, end_station, started_at, ended_at, distance_km, fare)
SELECT NULL,
       t.user_id, t.bike_id, t.bas,
       CASE WHEN (t.i * 31) % 1000 < 3 THEN NULL ELSE COALESCE(t.bit, t.bas) END,
       t.bas_zaman,
       CASE WHEN (t.i * 31) % 1000 < 3 THEN NULL ELSE datetime(t.bas_zaman, '+' || CAST(t.dk * 60 AS INTEGER) || ' seconds') END,
       CASE WHEN (t.i * 31) % 1000 < 3 THEN NULL ELSE ROUND(t.km, 2) END,
       CASE WHEN (t.i * 31) % 1000 < 3 THEN NULL
            WHEN u.user_type = 'abone' THEN CASE WHEN t.dk > 30 THEN ROUND((t.dk - 30) * 2, 2) ELSE 0 END
            ELSE ROUND(10 + t.dk * 1.5, 2) END
FROM (
  SELECT y.*, d.km,
         CASE WHEN y.bas = COALESCE(y.bit, y.bas) THEN 18 + (y.c % 47)
              ELSE d.km / (CASE WHEN y.bike_id % 4 = 0 THEN 17.0 ELSE 12.0 END) * 60 * (0.9 + (y.e % 40) / 100.0) + 2 END AS dk
  FROM bk__raw2 y
  JOIN bk__d d ON d.a = y.bas AND d.b = COALESCE(y.bit, y.bas)
) t
JOIN bk_users u ON u.user_id = t.user_id
LEFT JOIN bk_weather w ON w.obs_hour = strftime('%Y-%m-%d %H:00:00', t.bas_zaman)
WHERE NOT (COALESCE(w.rain_mm, 0) > 1 AND (t.i * 17) % 10 < 7)
  AND NOT (COALESCE(w.temp_c, 25) > 33 AND t.saat BETWEEN 12 AND 16 AND (t.i * 13) % 10 < 4)
ORDER BY t.bas_zaman, t.i;
UPDATE bk_trips SET distance_km = ROUND(distance_km + 1.5 + (trip_id % 30) / 10.0, 2) WHERE start_station = end_station;
INSERT INTO bk_maintenance (ticket_id, bike_id, opened_at, closed_at, issue)
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 1400)
SELECT i, 1 + ((i * 2654435761) % 700),
       datetime('2024-06-01', '+' || ((i * 48271) % 2200) || ' hours'),
       CASE WHEN i % 23 = 0 THEN NULL ELSE datetime('2024-06-01', '+' || ((i * 48271) % 2200 + 2 + (i * 7) % 70) || ' hours') END,
       CASE (i * 69069) % 10 WHEN 0 THEN 'batarya' WHEN 1 THEN 'batarya' WHEN 2 THEN 'fren' WHEN 3 THEN 'fren' WHEN 4 THEN 'lastik' WHEN 5 THEN 'lastik' WHEN 6 THEN 'zincir' WHEN 7 THEN 'kilit' ELSE 'temizlik' END
FROM n;
UPDATE bk_maintenance SET issue = 'fren' WHERE issue = 'batarya' AND bike_id % 4 <> 0;
DROP TABLE bk__n; DROP TABLE bk__raw2; DROP TABLE bk__h; DROP TABLE bk__s; DROP TABLE bk__nb; DROP TABLE bk__nc; DROP TABLE bk__d;
CREATE INDEX bk_trips_started ON bk_trips (started_at);
CREATE INDEX bk_trips_user ON bk_trips (user_id);
`;
  root.SQLP_SEED = (root.SQLP_SEED || '') + sql;
  Object.assign(root.SQLP_SCHEMA_NOTES = root.SQLP_SCHEMA_NOTES || {}, {
    bk_stations: 'Pedal İzmir istasyonları (62); is_coastal sahil istasyonu (1/0), capacity yuva sayısı',
    bk_bikes: 'Bisikletler (700); model klasik / elektrikli',
    bk_users: 'Kullanıcılar (6.000); abone / tek seferlik; doğum yılı ve cinsiyet bazen boş',
    bk_weather: 'Saatlik hava durumu (Haziran–Ağustos 2024); obs_hour saat başı',
    bk_trips: 'Yolculuklar (~120.000): büyük tablo. Kapanmamış yolculukta end_station, ended_at, distance_km ve fare boştur. started_at ve user_id üzerinde indeks vardır; istasyon sütunlarında yoktur',
    bk_maintenance: 'Bakım kayıtları; closed_at boşsa bakım sürüyor'
  });
  Object.assign(root.SQLP_COLMETA = root.SQLP_COLMETA || {}, {
    bk_stations: [['station_id', 'int', 'İstasyon numarası', 'pk'], ['name', 'text(40)', 'İstasyon adı'], ['district', 'text(20)', 'İlçe / semt'], ['lat', 'coord', 'Enlem'], ['lon', 'coord', 'Boylam'], ['capacity', 'int', 'Yuva sayısı'], ['is_coastal', 'bit', 'Sahil istasyonu (1/0)']],
    bk_bikes: [['bike_id', 'int', 'Bisiklet numarası', 'pk'], ['model', 'text(12)', 'klasik / elektrikli'], ['commissioned', 'date', 'Hizmete giriş']],
    bk_users: [['user_id', 'int', 'Kullanıcı', 'pk'], ['user_type', 'text(15)', 'abone / tek seferlik'], ['signup_date', 'date', 'Kayıt tarihi'], ['birth_year', 'int', 'Doğum yılı (bazen boş)'], ['gender', 'text(1)', 'K / E (bazen boş)']],
    bk_weather: [['obs_hour', 'datetime', 'Gözlem saati', 'pk'], ['temp_c', 'real', 'Sıcaklık (°C)'], ['rain_mm', 'real', 'Yağış (mm/saat)'], ['wind_kmh', 'real', 'Rüzgâr (km/saat)']],
    bk_trips: [['trip_id', 'int', 'Yolculuk', 'pk'], ['user_id', 'int', 'Kullanıcı', 'fk:bk_users.user_id'], ['bike_id', 'int', 'Bisiklet', 'fk:bk_bikes.bike_id'], ['start_station', 'int', 'Başlangıç istasyonu', 'fk:bk_stations.station_id'], ['end_station', 'int', 'Bitiş istasyonu (kapanmamışsa boş)', 'fk:bk_stations.station_id'], ['started_at', 'datetime', 'Başlangıç'], ['ended_at', 'datetime', 'Bitiş (kapanmamışsa boş)'], ['distance_km', 'real', 'Yaklaşık mesafe (km)'], ['fare', 'money', 'Ücret (TL); abonelikte ilk 30 dakika ücretsiz']],
    bk_maintenance: [['ticket_id', 'int', 'Bakım kaydı', 'pk'], ['bike_id', 'int', 'Bisiklet', 'fk:bk_bikes.bike_id'], ['opened_at', 'datetime', 'Açılış'], ['closed_at', 'datetime', 'Kapanış (sürüyorsa boş)'], ['issue', 'text(12)', 'batarya / fren / lastik / zincir / kilit / temizlik']]
  });
  root.SQLP_TYPEMAP = root.SQLP_TYPEMAP || {};
  if (!root.SQLP_TYPEMAP.real) root.SQLP_TYPEMAP.real = { tsql: 'FLOAT', pg: 'DOUBLE PRECISION', mysql: 'DOUBLE', oracle: 'BINARY_DOUBLE', bq: 'FLOAT64', sqlite: 'REAL' };
})(typeof window !== 'undefined' ? window : globalThis);
