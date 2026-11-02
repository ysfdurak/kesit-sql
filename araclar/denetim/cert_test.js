const { chromium } = require('playwright'); const path=require('path'); const fs=require('fs');
const OUT=require('./yol.js').OUT+'/belge'; fs.mkdirSync(OUT,{recursive:true});
const CFG="window.KESIT_CONFIG={siteUrl:'https://kullaniciadi.github.io/kesit-sql/',author:{name:'Ad Soyad'},giscus:{}};";
(async()=>{ const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:1280,height:900}, acceptDownloads:true}); const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(m.type()==='error'&&!/Failed to load resource/.test(m.text())) errs.push('c:'+m.text()); });
 await p.route('**/sql-asm.js', r=>r.fulfill({contentType:'text/javascript', body: fs.readFileSync(path.join(__dirname,'node_modules/sql.js/dist/sql-asm.js'))}));
 await p.route('**/config.js', r=>r.fulfill({contentType:'text/javascript', body:CFG}));
 await p.goto('http://localhost:8765/index.html'); await p.waitForFunction(()=>document.querySelector('#sideStats .engine .dot.ok'),null,{timeout:180000}); await p.waitForTimeout(500);
 // eksikken panel olmamalı
 await p.evaluate(()=>{ const P=window.KESIT_APP.getP(); P.dialectChosen=true; P.goalChosen=true; window.KESIT_APP.replaceP(P); location.hash='patika-temel'; }); await p.waitForTimeout(800);
 console.log('eksikken panel:', await p.$('.cert-panel')!==null);
 // bir ders eksik
 await p.evaluate(()=>{ const P=window.KESIT_APP.getP(); const ids=window.SQLP_PATHS.find(x=>x.id==='temel').lessons; ids.slice(0,-1).forEach(id=>P.done[id]=1); window.KESIT_APP.replaceP(P); }); await p.waitForTimeout(600);
 console.log('bir ders eksikken panel:', await p.$('.cert-panel')!==null);
 await p.evaluate(()=>{ const P=window.KESIT_APP.getP(); window.SQLP_PATHS.find(x=>x.id==='temel').lessons.forEach(id=>P.done[id]=1); P.xp=2000; window.KESIT_APP.replaceP(P); }); await p.waitForTimeout(800);
 console.log('tamamken panel:', await p.$('.cert-panel')!==null);
 await p.screenshot({path:OUT+'/panel_bos.png'});
 await p.fill('.cert-form input','Elif Yılmaz'); await p.click('.cert-form button'); await p.waitForTimeout(2500);
 await p.screenshot({path:OUT+'/panel_dolu.png', fullPage:false});
 const st=await p.evaluate(()=>{ const P=window.KESIT_APP.getP(); return P.certs.temel; }); console.log('kayit', JSON.stringify(st));
 const [dl]=await Promise.all([p.waitForEvent('download'), p.click('[data-cert="png"]')]); await dl.saveAs(OUT+'/ornek-belge.png'); console.log('indirilen', dl.suggestedFilename());
 // LinkedIn bağlantıları
 await p.evaluate(()=>{ window.__op=[]; window.open=(u)=>{ window.__op.push(u); return null; }; });
 await p.click('[data-cert="li-profile"]'); await p.click('[data-cert="li-share"]'); console.log('linkedin', JSON.stringify(await p.evaluate(()=>window.__op.map(decodeURIComponent))));
 await p.click('[data-cert="print"]'); await p.waitForTimeout(300);
 // yeniden ziyaret: tarih ve no korunuyor, ad güncellenebilir
 await p.evaluate(()=>{ location.hash='profile'; }); await p.waitForTimeout(600); console.log('profil listesi:', (await p.innerText('main')).match(/Tamamlama belgelerin[\s\S]{0,60}/)?.[0].replace(/\n/g,' '));
 await p.evaluate(()=>{ location.hash='patika-temel'; }); await p.waitForTimeout(1500); console.log('tekrar ziyarette canvas çizili:', await p.evaluate(()=>{ const c=document.getElementById('certCanvas'); return c&&c.width===1600; }));
 // uzun ad
 await p.fill('.cert-form input','Ayşegül Gülşen Çağlayan-Öztürkoğlu Şimşekoğlu'); await p.click('.cert-form button'); await p.waitForTimeout(1500);
 const [dl2]=await Promise.all([p.waitForEvent('download'), p.click('[data-cert="png"]')]); await dl2.saveAs(OUT+'/uzun-ad.png');
 console.log('ad güncellenince tarih aynı:', JSON.stringify(await p.evaluate(()=>window.KESIT_APP.getP().certs.temel)));
 // mobil ve koyu
 await p.setViewportSize({width:390,height:844}); await p.evaluate(()=>{ const P=window.KESIT_APP.getP(); P.theme='dark'; window.KESIT_APP.replaceP(P); location.hash='patika-temel'; }); await p.waitForTimeout(1500);
 await p.evaluate(()=>document.querySelector('.cert-panel').scrollIntoView()); await p.screenshot({path:OUT+'/mobil_koyu.png'}); console.log('mobil sw', await p.evaluate(()=>document.documentElement.scrollWidth));
 // başka patika (analist) tamamlanmamışsa panel yok
 await p.evaluate(()=>{ location.hash='patika-analist'; }); await p.waitForTimeout(600); console.log('analist panel:', await p.$('.cert-panel')!==null);
 console.log('errs', errs); await b.close(); })();
