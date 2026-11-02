const { chromium } = require('playwright'); const path=require('path'); const fs=require('fs');
(async()=>{
 const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1280,height:900}});
 const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(m.type()==='error' && !/ERR_FAILED/.test(m.text())) errs.push(m.text()); });
 await p.route('**/sql-asm.js', r=>r.fulfill({contentType:'text/javascript', body: fs.readFileSync(path.join(__dirname,'node_modules/sql.js/dist/sql-asm.js'))}));
 await p.route('**fonts.g**', r=>r.abort());
 const t0=Date.now(); await p.goto('file://'+require('./yol.js').ROOT+'index.html');
 const ready=()=>p.waitForFunction(()=>/hazır/.test(document.querySelector('#sideStats')?.innerText||''), null, {timeout:60000});
 await ready(); console.log('motor ms', Date.now()-t0);
 const nav=async h=>{ await p.evaluate(x=>{location.hash=x;},h); await p.reload(); await ready(); await p.waitForTimeout(700); };
 await nav('data'); await p.click('[data-dset="kurye"]'); await p.waitForTimeout(1500);
 console.log('DATA', await p.innerText('main h1'), '| boxes', await p.$$eval('.er .tbox', x=>x.length), '| chips', await p.$$eval('#dsChips button', x=>x.length));
 await p.screenshot({path:'lkdata.png'});
 const solve = async (id, n)=>{ await nav('ders-'+id); await p.click('.steps button:nth-child('+(n+1)+')'); await p.waitForTimeout(700); await p.click('[data-act="sol"]'); await p.waitForTimeout(300); const sol=await p.evaluate(()=>document.querySelector('#solBox pre')?.innerText||''); await p.fill('#ed textarea', sol); await p.click('[data-act="submit"]'); await p.waitForTimeout(2500); console.log(id, n, '=>', (await p.innerText('#fb')).split('\n')[0]); };
 await solve('case', 6); await solve('zaman-araligi', 2); await solve('son-deger', 1); await solve('frames', 5);
 await nav('ders-zaman-araligi'); console.log('ZA boxes', await p.$$eval('.codebox', x=>x.length));
 await nav('play'); await p.click('[data-ar="flt"][data-v="kurye"]'); await p.waitForTimeout(400); console.log('ARENA kurye list', await p.$$eval('.ar-list .litem', x=>x.length));
 console.log('MODES', await p.$$eval('.ar-mode h3', x=>x.map(y=>y.innerText).join(' | ')));
 await nav('oyun-dedektif-sahte-iade'); await p.waitForTimeout(1200);
 console.log('DET3 schema', await p.$$eval('#detSchema summary', x=>x.length));
 for(const v of ['köşe dönercisi','Serdar Yalın','9','bora keskin','3','10065']){ await p.fill('#detIn',v); await p.click('[data-ar="det-check"]'); await p.waitForTimeout(900); }
 console.log('DET3', await p.innerText('.sec-head .chip'));
 await nav('oyun-ch-es-zamanli'); await p.waitForTimeout(800); console.log('CH sample', (await p.innerText('#arSample')).slice(0,40).replace(/\n/g,' '));
 await nav('pratik'); console.log('PRATIK Lezzet konusu', /Lezzet Kurye verisi/.test(await p.innerText('main')));
 await p.setViewportSize({width:390,height:844}); await nav('data'); await p.click('[data-dset="kurye"]'); await p.waitForTimeout(800); console.log('mobile data sw', await p.evaluate(()=>document.documentElement.scrollWidth));
 await nav('ders-unpivot'); console.log('mobile lesson sw', await p.evaluate(()=>document.documentElement.scrollWidth));
 console.log('ERR', errs); await b.close();
})();
