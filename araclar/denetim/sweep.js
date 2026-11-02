const { chromium } = require('playwright'); const path=require('path'); const fs=require('fs');
const c=require('./load.js'); global.window=c; require(require('./yol.js').ROOT+'arena-data.js'); const A=c.SQLP_ARENA;
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1280,height:900}}); const errs=[]; let cur='';
 p.on('pageerror',e=>errs.push(cur+' :: '+e.message)); p.on('console',m=>{ if(m.type()==='error'&&!/Failed to load resource/.test(m.text())) errs.push(cur+' :: c:'+m.text()); });
 await p.route('**/sql-asm.js', r=>r.fulfill({contentType:'text/javascript', body: fs.readFileSync(path.join(__dirname,'node_modules/sql.js/dist/sql-asm.js'))}));
 await p.route('**fonts.g**', r=>r.abort());
 await p.goto('http://localhost:8765/index.html'); await p.waitForFunction(()=>document.querySelector('#sideStats .engine .dot.ok'),null,{timeout:180000});
 await p.evaluate(()=>{ const P=window.KESIT_APP.getP(); P.dialectChosen=true; P.goalChosen=true; window.KESIT_APP.replaceP(P); });
 let n=0, noEd=[];
 for(const l of c.SQLP_LESSONS){ for(let i=0;i<=(l.ex||[]).length;i++){ cur=l.id+'#'+i; await p.evaluate(([id,st])=>{ location.hash='ders-'+id; }, [l.id,i]); if(i>0){ await p.waitForTimeout(60); await p.evaluate(st=>{ const bt=document.querySelector('.steps [data-step="'+st+'"]'); if(bt) bt.click(); }, i); } await p.waitForTimeout(90); n++;
   if(i>0 && l.ex[i-1].t!=='mc'){ const ok=await p.evaluate(()=>!!document.querySelector('#ed')); if(!ok) noEd.push(cur); } } }
 console.log('ders adimlari', n, 'editor yok', noEd.slice(0,10), noEd.length);
 for(const pr of c.SQLP_PRACTICE){ cur='pratik-'+pr.id; await p.evaluate(id=>{location.hash='pratik-'+id}, pr.id); await p.waitForTimeout(80); }
 for(const ch of A.ch){ cur='ch-'+ch.id; await p.evaluate(id=>{location.hash='oyun-ch-'+id}, ch.id); await p.waitForTimeout(150); }
 for(const d of A.det){ cur='det-'+d.id; await p.evaluate(id=>{location.hash='oyun-dedektif-'+id}, d.id); await p.waitForTimeout(300); }
 for(const pa of c.SQLP_PATHS){ cur='patika-'+pa.id; await p.evaluate(id=>{location.hash='patika-'+id}, pa.id); await p.waitForTimeout(100); }
 for(const v of ['','paths','curr','pratik','sinav','review','data','play','test','dict','profile','hakkinda','serbest']){ cur='view-'+v; await p.evaluate(x=>{location.hash=x},v); await p.waitForTimeout(250); }
 console.log('pratik',c.SQLP_PRACTICE.length,'ch',A.ch.length,'det',A.det.length,'patika',c.SQLP_PATHS.length);
 console.log('HATALAR', errs.length); errs.slice(0,30).forEach(e=>console.log(' ', e.slice(0,220)));
 await b.close(); })();
