const {open,go,txt}=require('./lib');
(async()=>{
 const {browser,page,errs}=await open();
 await go(page,'sinav'); await page.waitForTimeout(500);
 await page.shotFull('d_sinav');
 console.log((await txt(page,'main')).slice(0,3500));
 console.log(await page.evaluate(()=>[...document.querySelectorAll('main [data-exam]')].map(b=>b.dataset.exam+'='+b.innerText.replace(/\n/g,' ').slice(0,60)).join('\n')));
 console.log(errs); await browser.close();
})();
