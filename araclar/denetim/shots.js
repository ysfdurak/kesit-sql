const KESIT_BASE=process.env.KESIT_BASE||KESIT_BASE;
const { chromium } = require('playwright'); const path=require('path'); const fs=require('fs');
const OUT=process.argv[2];
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1280,height:800}, deviceScaleFactor:1});
 await p.route('**/sql-asm.js', r=>r.fulfill({contentType:'text/javascript', body: fs.readFileSync(path.join(__dirname,'node_modules/sql.js/dist/sql-asm.js'))}));
 await p.route('**fonts.g**', r=>r.abort());
 await p.goto(KESIT_BASE+'/index.html'); await p.waitForFunction(()=>document.querySelector('#sideStats .engine .dot.ok'),null,{timeout:180000}); await p.waitForTimeout(500);
 await p.screenshot({path:OUT+'/karsilama.png'});
 await p.evaluate(()=>{ const P=window.KESIT_APP.getP(); P.dialectChosen=true; P.goalChosen=true; P.goal='temel'; window.KESIT_APP.replaceP(P); location.hash='ders-group-by'; }); await p.waitForTimeout(900);
 await p.click('.steps button:nth-child(2)'); await p.waitForTimeout(600);
 await p.fill('#ed textarea', "SELECT city, COUNT(*) AS sayi\nFROM customers\nGROUP BY city\nORDER BY sayi DESC;").catch(()=>{});
 const run=await p.$('[data-act="run"]'); if(run){ await run.click(); await p.waitForTimeout(1200); }
 await p.screenshot({path:OUT+'/alistirma.png'});
 await p.evaluate(()=>{ location.hash='data'; }); await p.waitForTimeout(800); await p.click('[data-dset="ik"]'); await p.waitForTimeout(1200); await p.screenshot({path:OUT+'/veri-seti.png'});
 await p.evaluate(()=>{ location.hash='oyun-dedektif-giden-yetenek'; }); await p.waitForTimeout(1500); await p.screenshot({path:OUT+'/dedektif.png'});
 await b.close(); })();
