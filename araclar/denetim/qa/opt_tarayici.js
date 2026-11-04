// Sorgu Optimizasyonu ve yeni projeler: gerçek tarayıcıda 1280 ve 390 genişlikte ders, doğru ve yanlış cevap denemesi.
// Kullanım: kökü sun (python3 -m http.server 8811 --directory ../../..) sonra NODE_PATH=$(npm root -g) node opt_tarayici.js
// Her ders için: taşma, plan kutuları, ilk kod kutusu; her SQL alıştırması için örnek çözüm kabul edilir, ynl içindeki yanlış cevaplar reddedilir; çoktan seçmelide yanlış şık reddedilir.
const { chromium } = require('playwright');
const U = process.env.URL || 'http://localhost:8811/index.html';
const LESSONS = (process.env.DERS || 'opt-olc,opt-plan,opt-tur,opt-indeks,opt-secicilik,opt-join,opt-toplama,opt-turler,opt-yanlis,mk-opt,opt-proje,bv-proje,ai-proje,index,performans,sargable,be-sayfalama,de-partition,proje-tsql,proje-backend').split(',');
const ARENA_ID = process.env.ARENA || 'opt-ay-raporu';
const TAMLAR = process.env.TAM ? process.env.TAM.split(',') : ['1280'];
const bekle = (p, ms) => p.waitForTimeout(ms);
(async () => {
  const b = await chromium.launch(); const sonuc = { ders: 0, tasma: [], cozumKabul: 0, cozumRed: [], yanlisRed: 0, yanlisGecti: [], mc: 0, mcSorun: [], kutu: 0, kutuHata: [], plan: 0, hata: [] };
  for (const w of [1280, 390]) {
    const c = await b.newContext({ viewport: { width: w, height: 900 }, serviceWorkers: 'block' }); const p = await c.newPage(); await p.addInitScript(() => { if (!localStorage.getItem('sqlpatika.v1')) localStorage.setItem('sqlpatika.v1', JSON.stringify({ dialect: 'sqlite', dialectChosen: true, goalChosen: true })); });
    p.on('pageerror', e => sonuc.hata.push(w + ' ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|fonts|404/.test(m.text())) sonuc.hata.push(w + ' ' + m.text().slice(0, 200)); });
    await p.goto(U); await p.waitForFunction(() => /hazır/.test(document.querySelector('#sideStats')?.innerText || '') || window.SQL_READY, null, { timeout: 180000 }).catch(() => {});
    await bekle(p, 1500); await p.waitForFunction(() => document.querySelector('[data-needs-engine]') ? !document.querySelector('[data-needs-engine]').disabled : true, null, { timeout: 120000 }).catch(() => {});
        const nav = async h => { await p.evaluate(x => { location.hash = x; }, h); await bekle(p, 350); };
    const tasma = async yer => { const o = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); if (o > 1) sonuc.tasma.push(w + ' ' + yer + ' +' + o); };
    const dene = async (kod) => { await p.fill('#ed textarea', kod); await p.click('[data-act="submit"]'); await p.waitForFunction(() => document.querySelector('#fb .msg'), null, { timeout: 90000 }).catch(() => {}); await bekle(p, 100); return p.evaluate(() => { const m = document.querySelector('#fb .msg'); return m ? { ok: m.classList.contains('ok'), t: m.innerText.slice(0, 160) } : { ok: null, t: 'geri bildirim yok' }; }); };
    for (const id of LESSONS) {
      await nav('ders-' + id); sonuc.ders++; await p.waitForSelector('.theory', { timeout: 20000 }).catch(() => sonuc.hata.push(w + ' ' + id + ' teori yok'));
      await tasma(id); sonuc.plan += await p.$$eval('.plan-cikti', x => x.length);
      const k = await p.$('.codebox [data-act="ex-run"]'); if (k) { await k.click(); await bekle(p, 1200); const t = await p.evaluate(() => (document.querySelector('.codebox .out') || {}).innerText || ''); sonuc.kutu++; if (/hata verdi/.test(t)) sonuc.kutuHata.push(w + ' ' + id + ' ' + t.slice(0, 100)); await tasma(id + ' kutu'); }
      const ex = await p.evaluate(i => { const l = SQLP_LESSONS.find(x => x.id === i); return l.ex.map(e => ({ t: e.t, sol: e.sol, ynl: e.ynl || [], a: e.a, n: (e.o || []).length, base: e.base, dl: e.dl })); }, id);
      for (let n = 0; n < ex.length; n++) {
        if (w === 390 && n > 2) break; /* mobilde ilk üç adım, masaüstünde hepsi */
        const e = ex[n]; await nav('ders-' + id + '/' + (n + 1)); await tasma(id + '/' + (n + 1));
        if (e.t === 'mc') {
          const ynlis = (e.a + 1) % e.n; await p.click('#mc button[data-mc="' + ynlis + '"]'); await bekle(p, 120);
          const yr = await p.evaluate(() => { const m = document.querySelector('#mcFb .msg'); return m ? m.classList.contains('ok') : null; });
          await nav('ders-' + id); await nav('ders-' + id + '/' + (n + 1));
          await p.click('#mc button[data-mc="' + e.a + '"]'); await bekle(p, 120);
          const dr = await p.evaluate(() => { const m = document.querySelector('#mcFb .msg'); return m ? m.classList.contains('ok') : null; });
          sonuc.mc++; if (yr === true || dr !== true) sonuc.mcSorun.push(w + ' ' + id + '/' + (n + 1) + ' yanlis:' + yr + ' dogru:' + dr); continue;
        }
        if (w === 390 && n > 1) continue;
        const ynl = e.ynl.slice(0, w === 390 ? 1 : 3);
        for (const yz of ynl) { const r = await dene(yz); if (r.ok === true) sonuc.yanlisGecti.push(w + ' ' + id + '/' + (n + 1) + ' ' + yz.slice(0, 80)); else sonuc.yanlisRed++; }
        const st = await p.evaluate(({ i, n }) => { const l = SQLP_LESSONS.find(x => x.id === i), e = l.ex[n]; return e.sol; }, { i: id, n });
        const r = await dene(st); if (r.ok === true) sonuc.cozumKabul++; else sonuc.cozumRed.push(w + ' ' + id + '/' + (n + 1) + ' ' + r.t);
      }
    }
    /* Pratik: plan denetimli iki görev */
    for (const id of (process.env.PRATIK || 'op01,op06,op12').split(',')) {
      await nav('pratik-' + id); await bekle(p, 300); await tasma('pratik ' + id);
      const e = await p.evaluate(i => { const x = SQLP_PRACTICE.find(y => y.id === i); return { sol: x.sol, ynl: x.ynl || [] }; }, id);
      for (const yz of e.ynl.slice(0, 2)) { const r = await dene(yz); if (r.ok === true) sonuc.yanlisGecti.push(w + ' pratik ' + id); else sonuc.yanlisRed++; }
      const r = await dene(e.sol); if (r.ok === true) sonuc.cozumKabul++; else sonuc.cozumRed.push(w + ' pratik ' + id + ' ' + r.t);
    }
    /* Arena: plan denetimi ve gizli test */
    { const A = await p.evaluate(i => { const c = SQLP_ARENA.ch.find(x => x.id === i); return { sol: c.sol, ynl: c.ynl }; }, ARENA_ID);
      await nav('oyun-ch-' + ARENA_ID); await bekle(p, 2500); await tasma('arena');
      const ar = async kod => { await p.fill('#ed textarea', kod); await p.click('[data-ar="submit"]'); await bekle(p, 7000); return p.evaluate(() => { const m = [...document.querySelectorAll('.msg')].pop(); return m ? { ok: m.classList.contains('ok'), t: m.innerText.slice(0, 220) } : { ok: null, t: '' }; }); };
      for (const yz of A.ynl) { const r = await ar(yz); if (r.ok === true) sonuc.yanlisGecti.push(w + ' arena ' + yz.slice(0, 60)); else sonuc.yanlisRed++; }
      const r = await ar(A.sol); if (r.ok === true) sonuc.cozumKabul++; else sonuc.cozumRed.push(w + ' arena ' + r.t); }
    await c.close();
  }
  await b.close(); console.log(JSON.stringify(sonuc, null, 1)); process.exit(sonuc.mcSorun.length || sonuc.cozumRed.length || sonuc.yanlisGecti.length || sonuc.tasma.length || sonuc.hata.length ? 1 : 0);
})();
