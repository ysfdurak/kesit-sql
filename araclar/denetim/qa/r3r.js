const {open,go,txt}=require('./lib');
(async()=>{
 const {browser,ctx,page,errs}=await open();
 await go(page,'ders-ilk-sorgu'); await page.click('.pager [data-step="1"]'); await page.click('[data-act=submit]'); await page.waitForTimeout(400);
 await page.evaluate(()=>location.hash='profile'); await page.waitForTimeout(500);
 await page.shotFull('d_profile');
 const t=await txt(page,'main'); console.log(t.slice(t.indexOf('Yedek')-200>0?t.indexOf('Yedek')-200:0).slice(0,2500));
 console.log(await page.evaluate(()=>[...document.querySelectorAll('main button, main textarea, main input')].filter(b=>b.offsetParent).map(b=>b.tagName+':'+(b.innerText||b.placeholder||'').slice(0,30).replace(/\n/g,' ')+'['+Object.entries(b.dataset).map(([k,v])=>k+'='+v).join(',')+']').join(' ; ')));
 console.log(errs); await browser.close();
})();
