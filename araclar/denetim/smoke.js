const { chromium } = require('playwright'); const path=require('path'); const fs=require('fs');
(async()=>{
 const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1280,height:900}});
 const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(m.type()==='error') errs.push(m.text()); });
 await p.route('**/sql-asm.js', r=>r.fulfill({contentType:'text/javascript', body: fs.readFileSync(path.join(__dirname,'node_modules/sql.js/dist/sql-asm.js'))}));
 await p.route('**fonts.g**', r=>r.abort());
 await p.goto('file://'+require('./yol.js').ROOT+'index.html'); await p.waitForTimeout(4000);
 const st=await p.evaluate(()=>document.querySelector('#sideStats')?.innerText||''); console.log('STATS', st.replace(/\s+/g,' '));
 for(const id of ['metin-birlestir','lateral','null-guvenli','like-escape','proje-temel','dml']){
   await p.evaluate(i=>{location.hash='ders-'+i;},id); await p.reload(); await p.waitForTimeout(2500);
   const t=await p.evaluate(()=>document.querySelector('main h1, main h2')?.innerText); console.log(id,'=>',t);
 }
 // solve lateral ex1 in pg
 await p.evaluate(()=>{location.hash='ders-lateral';}); await p.reload(); await p.waitForTimeout(2500);
 await p.click('.steps button:nth-child(2)'); await p.waitForTimeout(800);
 await p.screenshot({path:'lat.png'});
 // mc shuffle check on first mc lesson
 await p.evaluate(()=>{location.hash='ders-iliskiler';}); await p.reload(); await p.waitForTimeout(2500);
 await p.click('.steps button:nth-child(2)'); await p.waitForTimeout(500);
 const opts=await p.$$eval('#mc button', bs=>bs.map(b=>b.dataset.mc+':'+b.innerText.replace(/\s+/g,' ')));
 console.log('MC', opts.join(' | '));
 await p.click('#mc button[data-mc="2"]'); await p.waitForTimeout(400);
 console.log('FB', (await p.innerText('#mcFb')).slice(0,80));
 await p.setViewportSize({width:390,height:844}); await p.evaluate(()=>{location.hash='ders-metin-birlestir';}); await p.reload(); await p.waitForTimeout(2500);
 await p.screenshot({path:'mob.png'});
 const sw=await p.evaluate(()=>document.documentElement.scrollWidth); console.log('scrollWidth',sw);
 console.log('ERR', errs.slice(0,10)); await b.close();
})();
