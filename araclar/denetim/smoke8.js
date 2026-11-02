const { chromium } = require('playwright'); const path=require('path'); const fs=require('fs');
(async()=>{
 const URL=process.env.URL||'http://localhost:8765/index.html';
 const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1280,height:900}});
 const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(m.type()==='error' && !/ERR_FAILED|fonts/.test(m.text())) errs.push(m.text()); });
 await p.route('**/sql-asm.js', r=>r.fulfill({contentType:'text/javascript', body: fs.readFileSync(path.join(__dirname,'node_modules/sql.js/dist/sql-asm.js'))}));
 await p.route('**fonts.g**', r=>r.abort());
 const t0=Date.now(); await p.goto(URL);
 const ready=()=>p.waitForFunction(()=>/hazır/.test(document.querySelector('#sideStats')?.innerText||''), null, {timeout:120000});
 await ready(); console.log('motor ms', Date.now()-t0, 'small', await p.evaluate(()=>!!window.SQLP_SMALL), await p.evaluate(()=>{try{return 0}catch(e){return e}}));
 const nav=async h=>{ await p.evaluate(x=>{location.hash=x;},h); await p.waitForTimeout(900); };
 await nav('ders-bv-zaman'); const cb=await p.$$('.codebox'); console.log('bv-zaman boxes', cb.length);
 const run=await p.$('.codebox button'); if(run){ const t=Date.now(); await run.click(); await p.waitForTimeout(4000); console.log('box result', (await p.innerText('.codebox')).slice(-200).replace(/\n/g,' | '), Date.now()-t); }
 await nav('play'); await p.click('[data-ar="flt"][data-v="bisiklet"]'); await p.waitForTimeout(400); console.log('ARENA bisiklet', await p.$$eval('.ar-list .litem', x=>x.length));
 await p.click('[data-ar="flt"][data-v="ik"]'); await p.waitForTimeout(400); console.log('ARENA ik', await p.$$eval('.ar-list .litem', x=>x.length));
 await nav('oyun-dedektif-giden-yetenek'); await p.waitForTimeout(1500);
 console.log('DET4 schema', await p.$$eval('#detSchema summary', x=>x.length));
 for(const v of ['veri ve analitik','Rakip firma','Rıza Karabulut','2,38','6','gülşen ateş']){ await p.fill('#detIn',v); await p.click('[data-ar="det-check"]'); await p.waitForTimeout(1500); }
 console.log('DET4', await p.innerText('.sec-head .chip'));
 await nav('oyun-ch-bk-cakisan'); await p.waitForTimeout(3000); console.log('CH sample', (await p.innerText('#arSample')).slice(0,80).replace(/\n/g,' '));
 await nav('pratik'); const m=await p.innerText('main'); console.log('PRATIK', /İK verisi/.test(m), /Bisiklet verisi/.test(m));
 await nav('yollar'); console.log('PATHS', /Büyük Veriyle Çalışmak/.test(await p.innerText('main')), /İK Analitiği/.test(await p.innerText('main')));
 await p.setViewportSize({width:390,height:844});
 for(const h of ['data','ders-bv-plan','ders-ik-ucret','oyun-dedektif-giden-yetenek','oyun-ch-ik-huni']){ await nav(h); if(h==='data'){await p.click('[data-dset="ik"]'); await p.waitForTimeout(800);} console.log('mobile',h, await p.evaluate(()=>document.documentElement.scrollWidth)); }
 await p.screenshot({path:'mob_det4.png'});
 console.log('ERR', errs); await b.close();
})();
