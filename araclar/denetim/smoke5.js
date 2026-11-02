const { chromium } = require('playwright'); const path=require('path'); const fs=require('fs');
(async()=>{
 const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1280,height:900}});
 const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(m.type()==='error' && !/ERR_FAILED/.test(m.text())) errs.push(m.text()); });
 await p.route('**/sql-asm.js', r=>r.fulfill({contentType:'text/javascript', body: fs.readFileSync(path.join(__dirname,'node_modules/sql.js/dist/sql-asm.js'))}));
 await p.route('**fonts.g**', r=>r.abort());
 await p.goto('file://'+require('./yol.js').ROOT+'index.html');
 const ready=()=>p.waitForFunction(()=>/hazır/.test(document.querySelector('#sideStats')?.innerText||''), null, {timeout:30000});
 await ready();
 const nav=async h=>{ await p.evaluate(x=>{location.hash=x;},h); await p.reload(); await ready(); await p.waitForTimeout(600); };
 await nav('play'); console.log('MODES', await p.$$eval('.ar-mode h3', x=>x.map(y=>y.innerText).join(' | '))); console.log('LIST', await p.$$eval('.ar-list .litem', x=>x.length));
 await nav('oyun-turnuva'); console.log('TOUR intro', await p.$$eval('.ar-q .litem', x=>x.map(y=>y.innerText.replace(/\s+/g,' ')).join(' / ')));
 await p.click('[data-ar="tour-start"]'); await p.waitForTimeout(800);
 const ids=await p.evaluate(()=>{ const wk=null; return null; });
 // solve all with solutions
 for(let i=0;i<5;i++){
   const sol=await p.evaluate(()=>{ const t=document.querySelector('.ar-desc h1').innerText; const s=window.SQLP_ARENA.ch.find(c=>c.title===t).sol; const d=document.querySelector('#ed').closest('.work').querySelector('.ed-top span').innerText; return d==='SQLite'?s:window.SQLP_DIALECT.forward(s, window.SQLP_DIALECT.DIALECTS.find(x=>x.name===d).id); });
   await p.fill('#ed textarea', sol); await p.click('[data-ar="tour-submit"]'); await p.waitForTimeout(2500);
 }
 await p.screenshot({path:'tour.png', fullPage:true}); console.log('TOUR state', (await p.innerText('main')).slice(0,400).replace(/\n/g,' | '));
 await p.screenshot({path:'tour.png', fullPage:true});
 await nav('oyun-dedektif-hayalet-havale'); await p.waitForTimeout(800);
 console.log('DET2 schema', await p.$$eval('#detSchema summary', x=>x.map(y=>y.innerText.split('\n')[0]).join(',')));
 for(const v of ['5021','3','d-7731','cenk bulut','antalya','185.44.12.7']){ await p.fill('#detIn',v); await p.click('[data-ar="det-check"]'); await p.waitForTimeout(700); }
 console.log('DET2', await p.innerText('.sec-head .chip'), (await p.innerText('main')).includes('Vaka çözüldü'));
 await p.screenshot({path:'det2.png', fullPage:true});
 console.log('ERR', errs); await b.close();
})();
