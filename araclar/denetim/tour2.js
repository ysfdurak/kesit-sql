const { chromium } = require('playwright'); const path=require('path'); const fs=require('fs');
(async()=>{ const b=await chromium.launch();
 for(const [w,h,tag] of [[1280,900,'d'],[390,844,'m']]){
 const p=await b.newPage({viewport:{width:w,height:h}});
 await p.route('**/sql-asm.js', r=>r.fulfill({contentType:'text/javascript', body: fs.readFileSync(path.join(__dirname,'node_modules/sql.js/dist/sql-asm.js'))}));
 await p.route('**fonts.g**', r=>r.abort());
 await p.goto('http://localhost:8765/index.html'); await p.waitForFunction(()=>/hazır/.test(document.querySelector('#sideStats')?.innerText||''),null,{timeout:120000}).catch(()=>{}); await p.waitForTimeout(1200);
 for(const hsh of ['', 'yollar','yol-temel','ders-select','ders-group-by','pratik','sinav','tekrar','profil','seviye','sozluk']){
   await p.evaluate(x=>{location.hash=x;},hsh); await p.waitForTimeout(1000);
   await p.screenshot({path:'ux_'+tag+'_'+(hsh||'home')+'.png', fullPage: tag==='d'});
 }
 if(tag==='d'){ await p.evaluate(()=>{location.hash='ders-group-by';}); await p.waitForTimeout(800); const s=await p.$$('.steps button'); if(s[1]) { await s[1].click(); await p.waitForTimeout(800); await p.screenshot({path:'ux_d_ex.png'}); } }
 await p.close(); }
 await b.close(); })();
