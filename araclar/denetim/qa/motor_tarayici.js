// Motor gerçeği: uyarı kutusu, yabancı anahtar, sistem kataloğu, view'e yazma, yeni dersler. Kökü 8811 portunda sun: NODE_PATH=$(npm root -g) node motor_tarayici.js. Beklenen: HATA 0
const { chromium } = require('playwright'); const U = process.env.URL || 'http://localhost:8811/index.html';
const bekle = (p, ms) => p.waitForTimeout(ms); let hata = 0; const dogru = (ad, kos, ek) => { console.log((kos ? 'tamam ' : 'HATA  ') + ad + (ek !== undefined ? ' | ' + String(ek).slice(0, 120) : '')); if (!kos) hata++; };
const hazir = p => p.waitForFunction(() => /hazır/.test(document.querySelector('#sideStats')?.innerText || ''), null, { timeout: 180000 });
(async () => { const b = await chromium.launch();
 for (const w of [1280, 390]) { console.log('--', w);
  const c = await b.newContext({ viewport: { width: w, height: 900 }, serviceWorkers: 'block' }); const p = await c.newPage(); const er = [];
  p.on('pageerror', e => er.push(e.message));
  await p.addInitScript(() => { if (!localStorage.getItem('sqlpatika.v1')) localStorage.setItem('sqlpatika.v1', JSON.stringify({ done: {}, ex: {}, xp: 0, dialect: 'tsql', dialectChosen: true, goalChosen: true })); });
  await p.goto(U); await hazir(p); const nav = async h => { await p.evaluate(x => { location.hash = x; }, h); await bekle(p, 400); };
  const sol = async (id, n) => { await nav('ders-' + id + '/' + (n + 1)); return p.evaluate(a => { const e = SQLP_LESSONS.find(x => x.id === a[0]).ex[a[1]]; return (e.solv && e.solv.tsql) || e.sol; }, [id, n]); };
  const dene = async k => { await p.fill('#ed textarea', k); await p.evaluate(() => { document.querySelector('#fb').innerHTML = ''; }); await p.click('[data-act="submit"]'); await p.waitForSelector('#fb .msg', { timeout: 90000 }); await bekle(p, 100); return { fb: await p.innerText('#fb'), res: await p.innerText('#res') }; };
  const satir = async (id, kod) => { const i = await p.evaluate(a => SQLP_LESSONS.find(x => x.id === a).ex.findIndex(e => e.t !== 'mc'), id); await nav('ders-' + id + '/' + (i + 1)); return dene(kod); };
  let t = await satir('ts-hata-ileri', "SET TRANSACTION ISOLATION LEVEL SERIALIZABLE; SELECT TOP (1) dept_id FROM departments WITH (NOLOCK);");
  dogru('izolasyon uyarısı ekranda', /Bu motorda etkisi yok/.test(t.res) && /İzolasyon düzeyi/.test(t.res) && /kilit ipucu/.test(t.res), t.res.slice(0, 80));
  t = await satir('ts-hata-ileri', 'SELECT TOP (1) dept_id FROM departments;'); dogru('normal sorguda uyarı yok', !/Bu motorda etkisi yok/.test(t.res));
  t = await satir('ts-dml-join', "UPDATE p SET p.price = 1 FROM products p JOIN price_updates u ON u.product_id = p.product_id; SELECT @@ROWCOUNT AS n;"); dogru('UPDATE FROM çalışır, görev reddedilir', /Henüz değil|değerler farklı/.test(t.fb), t.fb.slice(0, 60));
  t = await satir('dba-engelleme', 'SELECT * FROM sys.dm_db_missing_index_details;'); dogru('kopyası olmayan görünüm açık hata', /Invalid object name 'sys\.dm_db_missing_index_details'/.test(t.fb) && /gerçek sistem görünümü/.test(t.fb), t.fb.slice(0, 80));
  for (const [id, n] of [['ts-nesne-ileri', 3], ['ts-hata-ileri', 2], ['dba-engelleme', 1], ['dba-yedek-zincir', 3], ['dba-yetki', 3], ['etl-boyut', 5], ['dba-dmv', 0], ['dba-indeks-bakim', 1]]) { const s = await sol(id, n); const r = await dene(s); dogru('çözüm kabul ' + id + '#' + n, /Doğru/.test(r.fb), r.fb.slice(0, 80)); }
  await nav('ders-kisitlar'); dogru('kısıt dersi uyarısı', /yalnız aynı çalıştırmada/.test(await p.innerText('#main')));
  const son = await p.evaluate(() => SQLP_LESSONS.find(x => x.id === 'kisitlar').ex.length); const fk = await sol('kisitlar', son - 2); t = await dene(fk); dogru('FK CASCADE kabul', /Doğru/.test(t.fb), t.fb.slice(0, 80));
  t = await dene(fk.replace(' ON DELETE CASCADE', '')); dogru('FK CASCADE yoksa reddedilir', !/Doğru!/.test(t.fb) && /FOREIGN KEY/.test(t.fb), t.fb.slice(0, 90));
  await nav('data'); await bekle(p, 300); const dsb = await p.$('[data-dset="sis"]'); dogru('veri seti düğmesi', !!dsb); if (dsb) { await dsb.click(); await bekle(p, 500); const m = await p.innerText('#main'); dogru('kurgu açıklaması', /Tamamen kurgusal/.test(m) && /sys_dm_exec_requests/.test(m)); }
  dogru('taşma yok', await p.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 1); dogru('sayfa hatası yok', !er.length, er.slice(0, 2).join(';'));
  await nav('ders-pg-ozel'); await bekle(p, 200); const pg = await p.innerText('#main'); dogru('pg-ozel metni düzeldi', /DISTINCT ON ve generate_series çalışır/.test(pg));
  await nav('ders-ts-izolasyon'); await bekle(p, 200); dogru('deadlock notu tek', (await p.evaluate(() => (document.querySelector('#main').innerText.match(/Deadlock grafiği/g) || []).length)) === 1);
  await c.close(); }
 await b.close(); console.log('HATA', hata); process.exit(hata ? 1 : 0); })();
