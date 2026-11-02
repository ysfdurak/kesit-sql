const { chromium } = require('playwright'); const path=require('path'); const fs=require('fs');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:390,height:844}});
 await p.route('**/sql-asm.js', r=>r.fulfill({contentType:'text/javascript', body: fs.readFileSync(path.join(__dirname,'node_modules/sql.js/dist/sql-asm.js'))}));
 await p.route('**fonts.g**', r=>r.abort());
 await p.goto('http://localhost:8765/index.html#'+process.argv[2]); await p.waitForFunction(()=>/hazır/.test(document.querySelector('#sideStats')?.innerText||''),null,{timeout:120000}); await p.waitForTimeout(3000);
 console.log(await p.evaluate(()=>{const o=[];document.querySelectorAll('main *').forEach(e=>{const r=e.getBoundingClientRect(); if(r.right>392&&r.width>0) o.push(e.tagName+'.'+e.className+' '+Math.round(r.right)+' '+(e.innerText||'').slice(0,40).replace(/\n/g,' '));}); return o.slice(0,12).join('\n');}));
 await p.screenshot({path:'ov.png'}); await b.close(); })();
