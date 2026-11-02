const {open,go,txt}=require('./lib');
(async()=>{
 const {browser,page,errs}=await open();
 await go(page,'review'); await page.waitForTimeout(400);
 console.log('EMPTY REVIEW:', (await txt(page,'main')).slice(0,1500));
 await page.shot('d_review_empty');
 // create some progress: finish lesson ilk-sorgu with a wrong attempt
 await go(page,'ders-ilk-sorgu');
 await page.click('.pager [data-step="1"]'); await page.click('[data-act=submit]'); await page.waitForTimeout(300);
 await page.click('.pager >> text=Sonraki alıştırma'); await page.fill('#sqlEditor','SELECT name FROM products'); await page.click('[data-act=submit]'); await page.waitForTimeout(300);
 await page.fill('#sqlEditor','SELECT name, category FROM products'); await page.click('[data-act=submit]'); await page.waitForTimeout(300);
 await page.click('.pager >> text=Sonraki alıştırma'); await page.fill('#sqlEditor','SELECT name, price FROM products WHERE price > 1000'); await page.click('[data-act=submit]'); await page.waitForTimeout(400);
 // a practice task wrong
 await page.evaluate(()=>location.hash='pratik-t002'); await page.waitForTimeout(300); await page.fill('#sqlEditor','SELECT 1'); await page.click('[data-act=submit]'); await page.waitForTimeout(300);
 await page.evaluate(()=>location.hash='review'); await page.waitForTimeout(400);
 console.log('REVIEW after:', (await txt(page,'main')).slice(0,2500));
 await page.shotFull('d_review');
 console.log(await page.evaluate(()=>[...document.querySelectorAll('main button')].map(b=>b.innerText.replace(/\n/g,' ').slice(0,40)+'['+Object.keys(b.dataset).join(',')+']').join(' ; ')));
 // try review buttons
 const rv=await page.$('[data-rv]'); if(rv){ await rv.click(); await page.waitForTimeout(400); console.log('after rv click:', page.url(), (await txt(page,'main')).slice(0,800)); await page.shot('d_review_click'); }
 console.log(errs); await browser.close();
})();
