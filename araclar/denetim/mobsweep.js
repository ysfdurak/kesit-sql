const { chromium } = require('playwright'); const path=require('path'); const fs=require('fs');
const ids=process.argv[2].split(',');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:390,height:844}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.route('**/sql-asm.js', r=>r.fulfill({contentType:'text/javascript', body: fs.readFileSync(path.join(__dirname,'node_modules/sql.js/dist/sql-asm.js'))}));
 await p.route('**fonts.g**', r=>r.abort());
 await p.goto('http://localhost:8765/index.html'); await p.waitForFunction(()=>document.querySelector('#miniStats .dot.ok'),null,{timeout:180000});
 const bad=[]; for(const id of ids){ await p.evaluate(x=>{location.hash='ders-'+x;},id); await p.waitForTimeout(350); const sw=await p.evaluate(()=>document.documentElement.scrollWidth); if(sw>392) bad.push(id+':'+sw); }
 console.log('checked',ids.length,'overflow',bad,'errs',errs.slice(0,5)); await b.close(); })();
