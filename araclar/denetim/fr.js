const { chromium } = require('playwright'); const path=require('path'); const fs=require('fs');
(async()=>{ const b=await chromium.launch();
 for(const [w,h,tag] of [[1280,900,'d'],[390,844,'m']]){
 const p=await b.newPage({viewport:{width:w,height:h}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.route('**/sql-asm.js', r=>r.fulfill({contentType:'text/javascript', body: fs.readFileSync(path.join(__dirname,'node_modules/sql.js/dist/sql-asm.js'))}));
 await p.route('**fonts.g**', r=>r.abort());
 await p.goto('http://localhost:8765/index.html'); await p.waitForFunction(()=>/hazır/.test(document.querySelector('#sideStats')?.innerText||'')||document.querySelector('#miniStats .dot.ok'),null,{timeout:120000}); await p.waitForTimeout(800);
 await p.screenshot({path:'fr_'+tag+'_home.png'});
 await p.click('[data-k="yeni"]'); await p.waitForTimeout(1200); await p.screenshot({path:'fr_'+tag+'_lesson.png'});
 console.log(tag,'hash',await p.evaluate(()=>location.hash), 'title', (await p.innerText('main h1')).slice(0,40));
 await p.click('.steps button:nth-child(2)'); await p.waitForTimeout(800);
 await p.click('[data-act="submit"]').catch(e=>console.log('nocheck')); await p.waitForTimeout(1500);
 console.log(tag,'fb', (await p.innerText('#fb').catch(()=>'')).slice(0,80).replace(/\n/g,' '));
 await p.screenshot({path:'fr_'+tag+'_ex1.png'});
 await p.evaluate(()=>{location.hash='patika-temel'}); await p.waitForTimeout(900); await p.screenshot({path:'fr_'+tag+'_path.png', fullPage: tag==='d'});
 console.log(tag,'sw', await p.evaluate(()=>document.documentElement.scrollWidth), 'errs', errs);
 await p.evaluate(()=>{location.hash=''}); await p.waitForTimeout(800); await p.screenshot({path:'fr_'+tag+'_home2.png', fullPage: tag==='d'});
 await p.close(); }
 await b.close(); })();
