const { chromium } = require('playwright'); const path=require('path'); const fs=require('fs');
const CFG="window.KESIT_CONFIG={author:{name:'Örnek Ad',title:'Veri Analisti',bio:'SQL ve veri analitiği üzerine çalışıyorum.',linkedin:'https://www.linkedin.com/in/ornek',github:'https://github.com/ornek',repo:'https://github.com/ornek/kesit-sql'},story:'Deneme hikâyesi.',license:'',feedbackFormUrl:'https://docs.google.com/forms/d/e/ABC/viewform?usp=pp_url&entry.1={ders}',giscus:{repo:'ornek/kesit-sql',repoId:'R_1',category:'Dersler',categoryId:'DIC_1'},supabaseUrl:'',supabaseAnonKey:''};";
(async()=>{ const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:1280,height:900}, acceptDownloads:true}); const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.route('**/sql-asm.js', r=>r.fulfill({contentType:'text/javascript', body: fs.readFileSync(path.join(__dirname,'node_modules/sql.js/dist/sql-asm.js'))}));
 await p.route('**fonts.g**', r=>r.abort()); await p.route('**giscus.app/**', r=>r.fulfill({contentType:'text/javascript', body:"document.currentScript&&document.currentScript.insertAdjacentHTML('afterend','<div id=gsFake>giscus</div>')"}));
 await p.route('**/config.js', r=>r.fulfill({contentType:'text/javascript', body:CFG}));
 await p.goto('http://localhost:8765/index.html'); await p.waitForFunction(()=>document.querySelector('#sideStats .engine .dot.ok'),null,{timeout:180000}); await p.waitForTimeout(500);
 console.log('side links', await p.innerText('.side-links'));
 await p.click('.side-links [data-go="hakkinda"]'); await p.waitForTimeout(600); await p.screenshot({path:'pf_about.png', fullPage:true}); console.log('about h1', await p.innerText('main h1'), '| sections', await p.$$eval('.about-card h3', x=>x.map(y=>y.innerText).join(', ')));
 await p.evaluate(()=>{location.hash='ders-group-by'}); await p.waitForTimeout(1200);
 console.log('giscus attrs', await p.evaluate(()=>{const s=document.querySelector('#gsBox script'); return s? s.getAttribute('data-term')+' '+s.getAttribute('data-repo')+' '+s.getAttribute('data-lang'):'YOK'}));
 await p.evaluate(()=>{window.open=(u)=>{window.__opened=u;}}); await p.click('main [data-act="feedback"]'); console.log('form url', decodeURIComponent(await p.evaluate(()=>window.__opened)));
 await p.screenshot({path:'pf_lesson.png', fullPage:true});
 // 10 ders bitmiş say: hatırlatma
 await p.evaluate(()=>{ const P=window.KESIT_APP.getP(); ['select','where','null','order-limit','aggregate','group-by','having','case','coalesce','metin','dml'].forEach(id=>P.done[id]=1); P.xp=300; window.KESIT_APP.replaceP(P); location.hash=''; }); await p.waitForTimeout(800);
 console.log('home reminder', await p.evaluate(()=>[...document.querySelectorAll('.continue b')].map(x=>x.innerText).join(' | ')));
 const [dl]=await Promise.all([p.waitForEvent('download'), p.click('.today [data-act="exp"]')]); const f=await dl.path(); const txt=fs.readFileSync(f,'utf8'); console.log('indirilen', dl.suggestedFilename(), 'done', Object.keys(JSON.parse(txt).done).length);
 await p.waitForTimeout(500); console.log('hatırlatma sonrası', await p.evaluate(()=>[...document.querySelectorAll('.continue b')].map(x=>x.innerText).join(' | ')));
 // yeni cihaz: sıfırla ve dosyadan yükle (birleştirme)
 await p.evaluate(()=>{ const P=window.KESIT_APP.fresh(); P.done={ranking:1}; P.xp=20; P.dialectChosen=true; P.goalChosen=true; window.KESIT_APP.replaceP(P); location.hash='profile'; }); await p.waitForTimeout(800);
 const fcP=p.waitForEvent('filechooser'); await p.click('[data-act="imp-file"]'); const fc=await fcP; await fc.setFiles(f); await p.waitForTimeout(800);
 const P2=await p.evaluate(()=>window.KESIT_APP.getP()); console.log('yükleme sonrası done', Object.keys(P2.done).length, 'ranking korundu', !!P2.done.ranking, 'xp', P2.xp);
 await p.screenshot({path:'pf_profile.png'});
 console.log('persist', await p.evaluate(()=>navigator.storage.persisted()));
 await p.setViewportSize({width:390,height:844}); for(const h of ['hakkinda','ders-group-by','profile','']){ await p.evaluate(x=>{location.hash=x},h); await p.waitForTimeout(700); console.log('mobil',h||'home', await p.evaluate(()=>document.documentElement.scrollWidth)); }
 await p.evaluate(()=>{location.hash='hakkinda'}); await p.waitForTimeout(600); await p.screenshot({path:'pf_about_m.png', fullPage:true});
 console.log('errs', errs); await b.close(); })();
