const { chromium } = require('playwright'); const path=require('path'); const fs=require('fs');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1280,height:900}});
 await p.route('**/sql-asm.js', r=>r.fulfill({contentType:'text/javascript', body: fs.readFileSync(path.join(__dirname,'node_modules/sql.js/dist/sql-asm.js'))}));
 await p.route('**fonts.g**', r=>r.abort());
 await p.goto('http://localhost:8765/index.html'); await p.waitForFunction(()=>/hazır/.test(document.querySelector('#sideStats')?.innerText||''),null,{timeout:120000}); await p.waitForTimeout(800);
 for(const g of ['paths','curr','test','profile']){ await p.click('[data-go="'+g+'"]'); await p.waitForTimeout(1000); console.log(g, location=await p.evaluate(()=>location.hash)); await p.screenshot({path:'ux3_'+g+'.png'}); }
 await p.click('[data-go="paths"]'); await p.waitForTimeout(600); const card=await p.$('[data-go="path"]'); if(card){ await card.click(); await p.waitForTimeout(900); console.log('path', await p.evaluate(()=>location.hash)); await p.screenshot({path:'ux3_path.png', fullPage:true}); }
 await b.close(); })();
