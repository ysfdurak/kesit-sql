const {open,go,txt,buttons}=require('./lib');
(async()=>{
 const {browser,page,errs}=await open();
 await go(page);
 await page.click('text=Biraz biliyorum'); await page.waitForTimeout(500);
 console.log(page.url());
 await page.shot('d_r2_test0');
 console.log(await txt(page,'main'));
 console.log(await page.evaluate(()=>document.querySelector('main').innerHTML.slice(0,3000)));
 console.log(errs); await browser.close();
})();
