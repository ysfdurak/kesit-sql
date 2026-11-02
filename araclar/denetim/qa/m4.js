const {open,go,txt}=require('./lib');
(async()=>{
 const {browser,page,errs}=await open({mobile:true});
 await go(page,'ders-ilk-sorgu'); await page.click('.pager [data-step="1"]'); await page.click('[data-act=submit]'); await page.waitForTimeout(400);
 const all=new Set();
 for(const h of ['','profile','play','pratik','curr','paths','hakkinda','sinav','data','dict','patika-temel']){
   await page.evaluate(h=>location.hash=h,h); await page.waitForTimeout(400);
   const g=await page.evaluate(()=>[...document.querySelectorAll('[data-go]')].filter(b=>b.offsetParent||getComputedStyle(b).position==='fixed').map(b=>b.dataset.go));
   g.forEach(x=>all.add(x));
 }
 console.log('reachable data-go on mobile:', [...all].sort().join(','));
 // option 3 İşim için lazım
 const b2=await open({mobile:false}); await go(b2.page,''); await b2.page.click('text=İşim için lazım'); await b2.page.waitForTimeout(500); console.log('isim icin:', b2.page.url(), (await txt(b2.page,'main')).slice(0,600).replace(/\n/g,' / ')); await b2.page.shot('d_isim'); 
 await b2.browser.close();
 console.log(errs); await browser.close();
})();
