const { chromium } = require('playwright'); const path=require('path'); const fs=require('fs');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push('c:'+m.text())});
 await p.route('**/sql-asm.js', r=>r.fulfill({contentType:'text/javascript', body: fs.readFileSync(path.join(__dirname,'node_modules/sql.js/dist/sql-asm.js'))}));
 await p.route('**fonts.g**', r=>r.abort());
 await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(25000);
 console.log(errs.slice(0,5), await p.evaluate(()=>document.querySelector('#sideStats')?.innerText.slice(-60))); await b.close(); })();
