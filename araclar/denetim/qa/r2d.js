const {open,go,txt}=require('./lib');
(async()=>{
 const {browser,page,errs}=await open();
 await go(page,'pratik'); await page.waitForTimeout(500);
 await page.shot('d_pratik');
 console.log((await txt(page,'main')).slice(0,2500));
 console.log(await page.evaluate(()=>document.querySelector('main').innerHTML.replace(/<button class="prow[\s\S]*?<\/button>/g,'').slice(0,4000)));
 console.log(errs); await browser.close();
})();
