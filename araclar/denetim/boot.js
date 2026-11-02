const { chromium } = require('playwright'); const path=require('path'); const fs=require('fs');
(async()=>{ const b=await chromium.launch();
 for(const url of ['http://localhost:8765/index.html','file://'+require('./yol.js').ROOT+'index.html']){
  const p=await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.route('**/sql-asm.js', r=>r.fulfill({contentType:'text/javascript', body: fs.readFileSync(path.join(__dirname,'node_modules/sql.js/dist/sql-asm.js'))}));
  await p.route('**fonts.g**', r=>r.abort());
  const t0=Date.now(); await p.goto(url);
  await p.waitForFunction(()=>/hazır|yüklenemedi/.test(document.querySelector('#sideStats')?.innerText||''), null, {timeout:180000});
  const small=await p.evaluate(()=>!!window.SQLP_SMALL);
  console.log(url.slice(0,10),'ready ms',Date.now()-t0,'small',small, errs);
  await p.evaluate(()=>{location.hash='ders-ntile-dist';}); await p.reload();
  await p.waitForFunction(()=>/hazır/.test(document.querySelector('#sideStats')?.innerText||''), null, {timeout:180000});
  const n=await p.evaluate(async()=>{ const r=[]; for(let i=0;i<15;i++){ document.querySelector('[data-act="ex-run"]').click(); await new Promise(z=>setTimeout(z,50)); } return document.querySelectorAll('.codebox .out:not([hidden])').length; });
  console.log('runs ok', n, errs.slice(0,3)); await p.close(); }
 await b.close(); })();
