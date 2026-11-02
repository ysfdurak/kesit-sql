const { chromium } = require('playwright'); const path=require('path'); const fs=require('fs');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage();
 await p.route('**/sql-asm.js', r=>r.fulfill({contentType:'text/javascript', body: fs.readFileSync(path.join(__dirname,'node_modules/sql.js/dist/sql-asm.js'))}));
 await p.route('**fonts.g**', r=>r.abort()); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://localhost:8765/index.html#oyun-ch-bk-net'); await p.waitForFunction(()=>/hazır/.test(document.querySelector('#sideStats')?.innerText||''),null,{timeout:120000}); await p.waitForTimeout(2000);
 const m0=await p.evaluate(()=>performance.memory.usedJSHeapSize/1e6);
 const sol=await p.evaluate(()=>window.SQLP_DIALECT.forward(window.SQLP_ARENA.ch.find(c=>c.id==='bk-net').sol,'tsql')); await p.fill('#ed textarea', sol);
 for(let i=0;i<4;i++){ const t=Date.now(); const btn=await p.$('[data-ar="submit"]'); if(!btn){console.log('no submit');break;} await btn.click(); await p.waitForFunction(()=>document.querySelector('#arFb')&&document.querySelector('#arFb').innerText.length>0,null,{timeout:120000}); console.log('submit',i,Date.now()-t,'ms', (await p.innerText('#arFb')).slice(0,80).replace(/\n/g,' ')); await p.evaluate(()=>{document.querySelector('#arFb').innerHTML='';}); }
 console.log('heap MB', m0.toFixed(0), (await p.evaluate(()=>performance.memory.usedJSHeapSize/1e6)).toFixed(0), errs); await b.close(); })();
