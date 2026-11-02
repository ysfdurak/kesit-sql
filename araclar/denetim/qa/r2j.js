const {open,go,txt}=require('./lib');
(async()=>{
 const {browser,ctx,page,errs}=await open();
 await go(page,'ders-ilk-sorgu');
 await page.click('.pager [data-step="1"]'); await page.click('[data-act=submit]'); await page.waitForTimeout(300);
 await page.click('.pager >> text=Sonraki alıştırma'); await page.fill('#sqlEditor','SELECT name, category FROM products'); await page.click('[data-act=submit]'); await page.waitForTimeout(300);
 await page.click('.pager >> text=Sonraki alıştırma'); await page.fill('#sqlEditor','SELECT name, price FROM products WHERE price > 1000'); await page.click('[data-act=submit]'); await page.waitForTimeout(400);
 const p2=await ctx.newPage();
 await p2.clock.install({time: new Date('2026-10-31T10:00:00')});
 const errs2=[]; p2.on('pageerror',e=>errs2.push(e.message));
 await p2.route('**/sql-asm.js', r=>r.fulfill({contentType:'text/javascript', body: require('fs').readFileSync(__dirname+'/../node_modules/sql.js/dist/sql-asm.js')}));
 await p2.route('**fonts.g**', r=>r.abort());
 await p2.goto('http://localhost:8811/index.html#review');
 await p2.waitForSelector('#sideStats .engine .dot.ok',{state:'attached',timeout:30000});
 await p2.waitForTimeout(500);
 console.log('REVIEW +3d:', (await p2.evaluate(()=>document.querySelector('main').innerText)).slice(0,1500));
 console.log(await p2.evaluate(()=>[...document.querySelectorAll('main button')].map(b=>b.innerText.replace(/\n/g,' ').slice(0,40)+'['+Object.keys(b.dataset).join(',')+'='+Object.values(b.dataset).join(',')+']').join(' ; ')));
 const b=await p2.$('main .btn.pri'); if(b){ await b.click(); await p2.waitForTimeout(500); console.log('after start:', p2.url(), (await p2.evaluate(()=>document.querySelector('main').innerText)).slice(0,900)); await p2.screenshot({path:'shots/d_review_session.png'});
   const ed=await p2.$('#sqlEditor'); if(ed){ await p2.fill('#sqlEditor','SELECT * FROM products'); await p2.click('[data-act=submit]'); await p2.waitForTimeout(500); console.log('after submit:', (await p2.evaluate(()=>document.querySelector('main').innerText)).slice(0,1200)); await p2.screenshot({path:'shots/d_review_after.png'}); }
 }
 console.log(errs, errs2); await browser.close();
})();
