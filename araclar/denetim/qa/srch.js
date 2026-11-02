const {open,go,txt}=require('./lib');
(async()=>{
 const {browser,page,errs}=await open();
 await go(page,'');
 await page.fill('#sideQ','pencere'); await page.waitForTimeout(600);
 console.log(page.url()); await page.shot('d_search2');
 console.log((await txt(page,'main')).slice(0,700).replace(/\n/g,' / '));
 await page.fill('#sideQ','index'); await page.waitForTimeout(600);
 console.log('index:', (await txt(page,'main')).slice(0,500).replace(/\n/g,' / '));
 console.log(errs); await browser.close();
})();
