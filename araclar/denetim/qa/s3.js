const {open,go,txt,buttons}=require('./lib');
(async()=>{
 const {browser,page,errs}=await open();
 await go(page,'ders-ilk-sorgu');
 await page.click('[data-act=ex-run]');
 await page.waitForTimeout(500);
 console.log('OUT:', (await txt(page,'.codebox .out')).slice(0,300));
 await page.click('.pager [data-step="1"]');
 await page.waitForTimeout(600);
 await page.shot('03ex1');
 console.log(await txt(page,'main'));
 console.log(await page.evaluate(()=>document.querySelector('main').innerHTML.replace(/<pre[\s\S]*?<\/pre>/g,'<pre/>').slice(0,5000)));
 console.log(errs);
 await browser.close();
})();
