const { chromium } = require('playwright'); const path=require('path'); const fs=require('fs');
(async()=>{
 const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1280,height:900}});
 const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(m.type()==='error' && !/ERR_FAILED/.test(m.text())) errs.push(m.text()); });
 await p.route('**/sql-asm.js', r=>r.fulfill({contentType:'text/javascript', body: fs.readFileSync(path.join(__dirname,'node_modules/sql.js/dist/sql-asm.js'))}));
 await p.route('**fonts.g**', r=>r.abort());
 const t0=Date.now(); await p.goto('file://'+require('./yol.js').ROOT+'index.html');
 await p.waitForFunction(()=>/hazır/.test(document.querySelector('#sideStats')?.innerText||''), null, {timeout:30000}); console.log('motor hazir ms', Date.now()-t0);
 console.log('STATS', (await p.innerText('#sideStats')).replace(/\s+/g,' '));
 await p.evaluate(()=>{location.hash='data';}); await p.reload(); await p.waitForTimeout(2500);
 await p.click('[data-dset="hava"]'); await p.waitForTimeout(1500);
 console.log('DATA', (await p.innerText('main h1')), '| boxes', await p.$$eval('.er .tbox', x=>x.length));
 await p.screenshot({path:'hvdata.png'});
 await p.evaluate(()=>{location.hash='patika-hava';}); await p.reload(); await p.waitForTimeout(2000);
 console.log('PATH', (await p.innerText('main h1')), '| ders', await p.$$eval('main [data-lesson]', x=>x.length));
 const solveLast = async (id, n)=>{
   await p.evaluate(i=>{location.hash='ders-'+i;},id); await p.reload(); await p.waitForTimeout(2500);
   await p.click('.steps button:nth-child('+(n+1)+')'); await p.waitForTimeout(700);
   await p.click('[data-act="sol"]'); await p.waitForTimeout(300);
   const sol=await p.evaluate(()=>document.querySelector('#solBox pre')?.innerText||'');
   await p.fill('#ed textarea', sol); await p.click('[data-act="submit"]'); await p.waitForTimeout(2500);
   console.log(id, n, '=>', (await p.innerText('#fb')).split('\n')[0]);
 };
 await solveLast('hv-zaman', 5); await solveLast('hv-self', 5); await solveLast('proje-hava', 1); await solveLast('hv-pencere', 2);
 await p.evaluate(()=>{location.hash='pratik';}); await p.reload(); await p.waitForTimeout(2000);
 const txt=await p.innerText('main'); console.log('PRATIK havayolu konusu var mi', /Havayolu verisi/.test(txt));
 console.log('ERR', errs); await b.close();
})();
