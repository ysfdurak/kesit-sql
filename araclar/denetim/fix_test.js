const { chromium } = require('playwright'); const path=require('path'); const fs=require('fs');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1280,height:900}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(m.type()==='error'&&!/Failed to load resource/.test(m.text())) errs.push('c:'+m.text()); });
 await p.route('**/sql-asm.js', r=>r.fulfill({contentType:'text/javascript', body: fs.readFileSync(path.join(__dirname,'node_modules/sql.js/dist/sql-asm.js'))}));
 await p.route('**fonts.g**', r=>r.abort());
 // 10: doğrudan pratik açılışı
 await p.goto('http://localhost:8765/index.html#pratik-t029'); await p.waitForFunction(()=>document.querySelector('#sideStats .engine .dot.ok'),null,{timeout:180000}); await p.waitForTimeout(800);
 console.log('10 önizleme takılı mı:', /Motor yükleniyor/.test(await p.innerText('main')));
 const setD=async d=>{ await p.evaluate(d=>{ const P=window.KESIT_APP.getP(); P.dialect=d; P.dialectChosen=true; P.goalChosen=true; window.KESIT_APP.replaceP(P); }, d); await p.waitForTimeout(500); };
 const check=async(hash,code)=>{ await p.evaluate(h=>{location.hash=h},hash); await p.waitForTimeout(900); await p.fill('#ed textarea', code); await p.click('main [data-act="submit"]'); await p.waitForTimeout(1500); return (await p.innerText('#fb').catch(()=>'')).replace(/\n/g,' ').slice(0,90); };
 await setD('oracle'); console.log('1 oracle tarih:', await check('pratik-t071', "SELECT COUNT(*) AS adet FROM orders WHERE order_date >= DATE '2024-12-31' - 29"));
 await setD('pg'); console.log('2 pg offset-limit:', await check('pratik-t029', 'SELECT DISTINCT salary AS maas FROM employees ORDER BY salary DESC OFFSET 1 LIMIT 1'));
 console.log('9 hata tek mi:', await p.evaluate(async()=>{ return null; }));
 await p.fill('#ed textarea','SELEC salary FROM employees'); await p.click('main [data-act="submit"]'); await p.waitForTimeout(1000); console.log('9 hata kutusu sayısı:', await p.$$eval('main .msg.err', x=>x.length));
 await setD('mysql'); console.log('3 mysql substring_index:', await check('pratik-t062', "SELECT SUBSTRING_INDEX(email,'@',1) AS kullanici FROM customers WHERE email IS NOT NULL"));
 // 4: stok alarmı yanlış sıra
 await setD('sqlite'); await p.evaluate(()=>{location.hash='oyun-ch-stok-alarmi'}); await p.waitForTimeout(1000); await p.fill('#ed textarea','SELECT name, stock FROM products WHERE stock < 20 ORDER BY stock'); await p.click('[data-ar="submit"]'); await p.waitForFunction(()=>document.querySelector('#arFb')&&document.querySelector('#arFb').innerText.length>0,null,{timeout:60000}); console.log('4 eşitlik sırası yok:', (await p.innerText('#arFb')).replace(/\n/g,' ').slice(0,110));
 await p.evaluate(()=>{document.querySelector('#arFb').innerHTML=''}); await p.fill('#ed textarea','SELECT name, stock FROM products WHERE stock < 20 ORDER BY stock, name'); await p.click('[data-ar="submit"]'); await p.waitForFunction(()=>document.querySelector('#arFb')&&document.querySelector('#arFb').innerText.length>0,null,{timeout:60000}); console.log('4 doğru çözüm:', (await p.innerText('#arFb')).replace(/\n/g,' ').slice(0,60));
 // 6: correlated#7 süresi
 await setD('pg'); await p.evaluate(()=>{location.hash='ders-correlated'}); await p.waitForTimeout(800); await p.click('.steps [data-step="7"]'); await p.waitForTimeout(600);
 await p.fill('#ed textarea', "SELECT COUNT(*) AS adet FROM hv_flights f WHERE f.status <> 'cancelled' AND f.pax > (SELECT AVG(f2.pax) FROM hv_flights f2 WHERE f2.route_id = f.route_id AND f2.status <> 'cancelled')");
 let t=Date.now(); await p.click('main [data-act="submit"]'); await p.waitForFunction(()=>document.querySelector('#fb')&&document.querySelector('#fb').innerText.length>0,null,{timeout:90000}); console.log('6 süre ms', Date.now()-t, (await p.innerText('#fb')).slice(0,20));
 // 12/11 seviye testi (hepsi bilmiyorum değil; orta)
 // 13 sözlük
 await p.evaluate(()=>{location.hash='dict'}); await p.waitForTimeout(600); await p.fill('#dictQ','index'); await p.waitForTimeout(400); console.log('13 sözlük index:', (await p.innerText('#glList')).slice(0,60).replace(/\n/g,' '));
 // 7 mobil tekrar
 await p.setViewportSize({width:390,height:844}); await p.evaluate(()=>{location.hash='profile'}); await p.waitForTimeout(600); console.log('7 mobil diğer sayfalar:', await p.$$eval('.more-nav button', x=>x.map(y=>y.innerText).join(', ')), '| sekme:', await p.$$eval('#tabbar button span', x=>x.map(y=>y.innerText).join(', ')));
 await p.evaluate(()=>{location.hash='oyun-tahmin'}); await p.waitForTimeout(1500); await p.screenshot({path:'fix_pred_m.png'}); console.log('24 mobil sw', await p.evaluate(()=>document.documentElement.scrollWidth));
 console.log('errs', errs); await b.close(); })();
