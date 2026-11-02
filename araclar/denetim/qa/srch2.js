const {open,go,txt}=require('./lib');
(async()=>{
 const {browser,page,errs}=await open();
 await go(page,'');
 await page.fill('#sideQ','pencere'); await page.press('#sideQ','Enter'); await page.waitForTimeout(600);
 console.log(page.url(), (await txt(page,'main')).slice(0,600).replace(/\n/g,' / '));
 console.log('lessons shown', await page.$$eval('main [data-lesson]',b=>b.length));
 await page.evaluate(()=>location.hash='curr'); await page.waitForTimeout(300);
 await page.fill('#sideQ','index'); await page.press('#sideQ','Enter'); await page.waitForTimeout(800);
 console.log('index typing on curr:', await page.$$eval('main [data-lesson]',b=>b.length), (await txt(page,'main')).slice(0,300).replace(/\n/g,' / '));
 console.log(errs); await browser.close();
})();
