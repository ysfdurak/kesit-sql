const {open,go,txt,buttons}=require('./lib');
(async()=>{
 const {browser,page,errs}=await open();
 await go(page);
 await page.waitForTimeout(1000);
 await page.shot('01welcome');
 console.log(await txt(page));
 console.log(await buttons(page));
 console.log(errs);
 await browser.close();
})();
