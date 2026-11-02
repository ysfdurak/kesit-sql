const { chromium } = require('playwright'); const path=require('path'); const fs=require('fs');
(async()=>{
 const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1280,height:900}});
 const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(m.type()==='error' && !/ERR_FAILED|fonts/.test(m.text())) errs.push(m.text()); });
 await p.route('**/sql-asm.js', r=>r.fulfill({contentType:'text/javascript', body: fs.readFileSync(path.join(__dirname,'node_modules/sql.js/dist/sql-asm.js'))}));
 await p.route('**fonts.g**', r=>r.abort());
 const t0=Date.now(); await p.goto('http://localhost:8765/index.html');
 const ready=()=>p.waitForFunction(()=>/hazır/.test(document.querySelector('#sideStats')?.innerText||''), null, {timeout:90000});
 await ready(); console.log('motor ms', Date.now()-t0, 'small', await p.evaluate(()=>!!window.SQLP_SMALL));
 const nav=async h=>{ await p.evaluate(x=>{location.hash=x;},h); await p.waitForTimeout(900); };
 for(const k of ['ik','bisiklet']){ await nav('data'); await p.click('[data-dset="'+k+'"]'); await p.waitForTimeout(1500);
   console.log('DATA',k, await p.innerText('main h1'), '| boxes', await p.$$eval('.er .tbox', x=>x.length));
   await p.screenshot({path:k+'data.png', fullPage:false}); }
 for(const id of ['bv-giris','bv-plan','bv-zaman','bv-istasyon','bv-gelir']){ await nav('ders-'+id); console.log('LES',id, (await p.innerText('main h1')).slice(0,60), 'pres', await p.$$eval('main pre.code',x=>x.length)); }
 // run the plan lesson boxes
 await nav('ders-bv-plan'); const btns=await p.$$('main pre.code + * button, main .runbox button'); console.log('runbtns',btns.length);
 await p.screenshot({path:'bvplan.png'});
 await nav('arena'); await p.waitForTimeout(500); await p.screenshot({path:'arena_hub2.png'});
 await nav('yol-buyuk-veri'); console.log('PATH', (await p.innerText('main h1')).slice(0,60));
 console.log('ERRS', errs.slice(0,10));
 await b.close();
})();
