const { chromium } = require('playwright'); const path=require('path'); const fs=require('fs');
const MOCK=fs.readFileSync(path.join(__dirname,'mocksb.js'),'utf8');
async function dev(b, srvInit){
  const ctx=await b.newContext({viewport:{width:1280,height:900}}); const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.route('**/sql-asm.js', r=>r.fulfill({contentType:'text/javascript', body: fs.readFileSync(path.join(__dirname,'node_modules/sql.js/dist/sql-asm.js'))}));
  await p.route('**fonts.g**', r=>r.abort());
  await p.route('**/config.js', r=>r.fulfill({contentType:'text/javascript', body:"window.KESIT_CONFIG={supabaseUrl:'https://x.supabase.co',supabaseAnonKey:'anon',google:true,privacyUrl:'gizlilik.html'};"}));
  await p.route('**/supabase.min.js', r=>r.fulfill({contentType:'text/javascript', body:MOCK}));
  if(srvInit) await ctx.addInitScript(s=>localStorage.setItem('__srvInit', s), JSON.stringify(srvInit));
  await p.goto('http://localhost:8765/index.html'); await p.waitForFunction(()=>document.querySelector('#sideStats .engine .dot.ok'),null,{timeout:180000}); await p.waitForTimeout(800);
  return {p,errs};
}
const srv=p=>p.evaluate(()=>window.__srv);
const P=p=>p.evaluate(()=>window.KESIT_APP.getP());
async function login(p, code){ await p.click('#acctSide [data-acct="open"]'); await p.fill('#acctModal input[type=email]','ali@ornek.com'); await p.click('#acctModal button[type=submit]'); await p.waitForTimeout(400); await p.fill('#acctModal input[name=code]', code||'123456'); await p.click('#acctModal button[type=submit]'); await p.waitForTimeout(1500); }
(async()=>{ const b=await chromium.launch();
 // Cihaz A
 const A=await dev(b); await A.p.screenshot({path:'acct_home.png'});
 await A.p.evaluate(()=>{ const P=window.KESIT_APP.getP(); window.KESIT_APP.replaceP(Object.assign(P,{xp:50, done:{select:1,where:1}, dialect:'tsql', dialectChosen:true, goalChosen:true, goal:'temel'})); });
 await A.p.click('#acctSide [data-acct="open"]'); await A.p.waitForTimeout(300); await A.p.screenshot({path:'acct_modal.png'});
 await A.p.click('[data-acct="close"]');
 await login(A.p,'000000'); console.log('yanlış kod mesajı:', (await A.p.innerText('#acctModal .msg').catch(()=>'YOK')).slice(0,60));
 await A.p.fill('#acctModal input[name=code]','123456'); await A.p.click('#acctModal button[type=submit]'); await A.p.waitForTimeout(1500);
 let s=await srv(A.p); console.log('A giriş sonrası sunucu xp', s.row&&s.row.data.xp, 'done', s.row&&Object.keys(s.row.data.done));
 console.log('A kenar:', (await A.p.innerText('#acctSide')).trim());
 // A'da ilerleme: kaydet tetikle
 await A.p.evaluate(()=>{ const P=window.KESIT_APP.getP(); P.xp=70; P.done.having=1; window.KESIT_SYNC.dirty(); }); await A.p.waitForTimeout(3500);
 s=await srv(A.p); console.log('A otomatik eşitleme xp', s.row.data.xp, Object.keys(s.row.data.done).join(','), 'push', s.pushes);
 // Cihaz B: boş tarayıcı
 const B=await dev(b, s); await login(B.p);
 let pb=await P(B.p); console.log('B yeni cihaz: xp', pb.xp, 'dialect', pb.dialect, 'done', Object.keys(pb.done).join(','), 'goal', pb.goal);
 // B'de ilerleme, sonra A'ya aktar
 await B.p.evaluate(()=>{ const P=window.KESIT_APP.getP(); P.xp=95; P.done['group-by']=1; window.KESIT_SYNC.dirty(); }); await B.p.waitForTimeout(3500);
 const sb2=await srv(B.p); await A.p.evaluate(x=>{ window.__srv.row=x.row; }, sb2);
 await A.p.evaluate(()=>{ const P=window.KESIT_APP.getP(); P.done.aggregate=1; }); // A'da eşitlenmemiş yerel ders
 await A.p.evaluate(()=>{ location.hash='profile'; }); await A.p.waitForTimeout(800); await A.p.click('[data-acct="sync"]'); await A.p.waitForTimeout(1500);
 const pa=await P(A.p); console.log('A birleşim: xp', pa.xp, 'done', Object.keys(pa.done).sort().join(','));
 await A.p.screenshot({path:'acct_profile.png'});
 // çıkış
 await A.p.click('[data-acct="logout"]'); await A.p.waitForTimeout(1200); const pl=await P(A.p); console.log('çıkış sonrası yerel xp', pl.xp, 'done', Object.keys(pl.done).length, 'sunucu korunuyor xp', (await srv(A.p)).row.data.xp);
 // B'de hesap silme
 await B.p.evaluate(()=>{ location.hash='profile'; }); await B.p.waitForTimeout(800); await B.p.click('[data-acct="delete"]'); await B.p.fill('#acctModal input[name=ok]','sil'); await B.p.click('#acctModal button[type=submit]'); await B.p.waitForTimeout(1200);
 const sd=await srv(B.p); console.log('silme: row', sd.row, 'deleted', sd.deleted, 'yerel xp', (await P(B.p)).xp);
 // mobil
 const M=await dev(b); await M.p.setViewportSize({width:390,height:844}); await M.p.evaluate(()=>{ location.hash='profile'; }); await M.p.waitForTimeout(800); await M.p.screenshot({path:'acct_mob_profile.png'}); await M.p.click('.acct-panel [data-acct="open"]'); await M.p.waitForTimeout(300); await M.p.screenshot({path:'acct_mob_modal.png'}); console.log('mobil sw', await M.p.evaluate(()=>document.documentElement.scrollWidth));
 console.log('hatalar', A.errs, B.errs, M.errs); await b.close(); })();
