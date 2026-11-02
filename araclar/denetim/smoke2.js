const { chromium } = require('playwright'); const path=require('path'); const fs=require('fs');
(async()=>{
 const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1280,height:900}});
 const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(m.type()==='error' && !/ERR_FAILED/.test(m.text())) errs.push(m.text()); });
 await p.route('**/sql-asm.js', r=>r.fulfill({contentType:'text/javascript', body: fs.readFileSync(path.join(__dirname,'node_modules/sql.js/dist/sql-asm.js'))}));
 await p.route('**fonts.g**', r=>r.abort());
 await p.goto('file://'+require('./yol.js').ROOT+'index.html'); await p.waitForTimeout(4000);
 console.log('STATS', (await p.innerText('#sideStats')).replace(/\s+/g,' '));
 // solve the new trigger exercise in T-SQL
 const solveLast = async (id)=>{
   await p.evaluate(i=>{location.hash='ders-'+i;},id); await p.reload(); await p.waitForTimeout(2500);
   const n=await p.$$eval('.steps button', bs=>bs.length);
   await p.click('.steps button:nth-child('+n+')'); await p.waitForTimeout(700);
   await p.click('[data-act="sol"]'); await p.waitForTimeout(300);
   const sol=await p.evaluate(()=>document.querySelector('#solBox pre')?.innerText||'');
   await p.fill('#ed textarea', sol); await p.click('[data-act="submit"]'); await p.waitForTimeout(1500);
   console.log(id, '=>', (await p.innerText('#fb')).split('\n')[0]);
 };
 for(const id of ['ts-trigger','collation','pencere-cerceve','kisitlar','proje-temel']) await solveLast(id);
 // altered MC
 await p.evaluate(()=>{location.hash='ders-view';}); await p.reload(); await p.waitForTimeout(2000);
 await p.click('.steps button:nth-child(3)'); await p.waitForTimeout(500);
 console.log('MC', (await p.$$eval('#mc button', bs=>bs.map(b=>b.innerText.replace(/\s+/g,' ')))).join(' | '));
 await p.evaluate(()=>{location.hash='ders-proje-tsql';}); await p.reload(); await p.waitForTimeout(2000);
 await p.screenshot({path:'tsqlproj.png', fullPage:false});
 console.log('ERR', errs); await b.close();
})();
