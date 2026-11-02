const {open,go,txt,buttons}=require('./lib');
(async()=>{
 const {browser,page,errs}=await open();
 await go(page);
 await page.click('text=Hiç bilmiyorum');
 await page.waitForTimeout(800);
 console.log('URL',page.url());
 await page.shot('02after_hic');
 console.log(await page.evaluate(()=>document.querySelector('main')?.innerText || document.body.innerText));
 console.log(await page.evaluate(()=>document.querySelector('main')?.innerHTML.slice(0,6000)));
 console.log(errs);
 await browser.close();
})();
