const { chromium } = require('playwright'); const path=require('path'); const fs=require('fs');
(async()=>{
 const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1280,height:900}});
 const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(m.type()==='error' && !/ERR_FAILED/.test(m.text())) errs.push(m.text()); });
 await p.route('**/sql-asm.js', r=>r.fulfill({contentType:'text/javascript', body: fs.readFileSync(path.join(__dirname,'node_modules/sql.js/dist/sql-asm.js'))}));
 await p.route('**fonts.g**', r=>r.abort());
 await p.goto('file://'+require('./yol.js').ROOT+'index.html');
 await p.waitForFunction(()=>/hazır/.test(document.querySelector('#sideStats')?.innerText||''), null, {timeout:30000});
 const nav=async h=>{ await p.evaluate(x=>{location.hash=x;},h); await p.reload(); await p.waitForFunction(()=>/hazır/.test(document.querySelector('#sideStats')?.innerText||''), null, {timeout:30000}); await p.waitForTimeout(600); };
 await nav('play'); console.log('HUB', await p.innerText('main h1'), '| list', await p.$$eval('.ar-list .litem', x=>x.length)); await p.screenshot({path:'arena_hub.png', fullPage:true});
 // challenge: wrong then right
 await p.click('.ar-list .litem'); await p.waitForTimeout(1200);
 console.log('CH', await p.innerText('.ar-desc h1'), '| sample', (await p.innerText('#arSample')).slice(0,60).replace(/\n/g,' '));
 await p.fill('#ed textarea', 'SELECT name, stock FROM products WHERE stock <= 20 ORDER BY stock, name;'); await p.click('[data-ar="submit"]'); await p.waitForTimeout(1500);
 console.log('WRONG =>', (await p.innerText('#arFb')).replace(/\n/g,' | ').slice(0,250));
 await p.fill('#ed textarea', 'SELECT name, stock FROM products WHERE stock < 20 ORDER BY stock, name;'); await p.click('[data-ar="submit"]'); await p.waitForTimeout(1500);
 console.log('RIGHT =>', (await p.innerText('#arFb')).replace(/\n/g,' | ').slice(0,200));
 await p.screenshot({path:'arena_ch.png', fullPage:true});
 // hardcode cheat on another challenge
 await nav('oyun-ch-cok-yillik'); await p.fill('#ed textarea','SELECT 24 AS musteri;'); await p.click('[data-ar="submit"]'); await p.waitForTimeout(2000);
 console.log('HARDCODE =>', (await p.innerText('#arFb')).replace(/\n/g,' | ').slice(0,250));
 // dialect switch on challenge (tsql) and solve
 await nav('oyun-ch-yogun-meydan'); await p.selectOption('#arD','tsql'); await p.waitForTimeout(800);
 await p.fill('#ed textarea', "WITH h AS (SELECT r.origin AS a FROM hv_flights f JOIN hv_routes r ON r.route_id = f.route_id WHERE f.status <> 'cancelled' UNION ALL SELECT r.dest FROM hv_flights f JOIN hv_routes r ON r.route_id = f.route_id WHERE f.status <> 'cancelled') SELECT TOP (3) a, COUNT(*) AS ucus FROM h GROUP BY a ORDER BY ucus DESC, a;");
 await p.click('[data-ar="submit"]'); await p.waitForTimeout(3000); console.log('TSQL =>', (await p.innerText('#arFb')).replace(/\n/g,' | ').slice(0,200));
 // speed round
 await nav('oyun-hiz'); await p.click('[data-ar="speed-start"]'); await p.waitForTimeout(800);
 for(let i=0;i<3;i++){ const id=await p.evaluate(()=>{ return null; }); await p.click('[data-ar="speed-skip"]'); await p.waitForTimeout(300); }
 console.log('SPEED hud', (await p.innerText('.ar-hud')).replace(/\n/g,' '));
 await p.click('[data-ar="speed-end"]'); await p.waitForTimeout(500); console.log('SPEED end', await p.innerText('main h1'));
 // predict
 await nav('oyun-tahmin'); await p.waitForTimeout(800); console.log('PRED opts', await p.$$eval('.ar-opt', x=>x.map(y=>y.innerText).join(' / ')));
 await p.click('.ar-opt'); await p.waitForTimeout(400); console.log('PRED fb', (await p.innerText('.ar-q .msg')).slice(0,120).replace(/\n/g,' '));
 await p.screenshot({path:'arena_pred.png', fullPage:true});
 // puzzle: solve first via correct lines
 await nav('oyun-bulmaca'); 
 const lines=await p.evaluate(()=>window.SQLP_ARENA.pz[0].lines);
 for(const L of lines){ const bt=await p.$$('.pz-box:not(.pz-ans) .pz-line'); for(const x of bt){ if((await x.innerText())===L){ await x.click(); break; } } await p.waitForTimeout(100); }
 await p.click('[data-ar="pz-check"]'); await p.waitForTimeout(800); console.log('PZ =>', (await p.innerText('#arFb')).replace(/\n/g,' '));
 await p.screenshot({path:'arena_pz.png', fullPage:true});
 // detective
 await nav('oyun-dedektif-kayip-kargo'); await p.waitForTimeout(800);
 await p.fill('#ed textarea',"SELECT shipment_id FROM det_shipments WHERE status = 'kayıp';"); await p.click('[data-ar="det-run"]'); await p.waitForTimeout(800);
 console.log('DET run', (await p.innerText('#res')).slice(0,80).replace(/\n/g,' '));
 await p.fill('#detIn','4471'); await p.click('[data-ar="det-check"]'); await p.waitForTimeout(800);
 await p.fill('#detIn','kaan aydemir'); await p.click('[data-ar="det-check"]'); await p.waitForTimeout(800);
 await p.fill('#detIn','99'); await p.click('[data-ar="det-check"]'); await p.waitForTimeout(500); console.log('DET wrong', (await p.innerText('#detFb')).slice(0,40));
 console.log('DET steps', await p.innerText('.sec-head .chip'));
 await p.screenshot({path:'arena_det.png', fullPage:true});
 await nav('serbest'); console.log('SERBEST', await p.innerText('main h1'));
 await nav('play'); console.log('HUB2', (await p.innerText('.ar-rank')).replace(/\n/g,' '));
 // mobile
 await p.setViewportSize({width:390,height:844}); await nav('play'); await p.screenshot({path:'arena_mob.png', fullPage:false});
 const ov=await p.evaluate(()=>document.documentElement.scrollWidth); console.log('mobile scrollWidth', ov);
 await nav('oyun-ch-aktarma'); const ov2=await p.evaluate(()=>document.documentElement.scrollWidth); console.log('mobile ch scrollWidth', ov2);
 await nav('sinav'); console.log('SINAV sections', await p.$$eval('main h2', x=>x.map(y=>y.innerText).join(' | ')));
 console.log('ERR', errs); await b.close();
})();
