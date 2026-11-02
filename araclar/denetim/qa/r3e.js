const {open,go,txt}=require('./lib');
(async()=>{
 const {browser,page,errs}=await open();
 await go(page,'play'); await page.waitForTimeout(500);
 await page.shotFull('d_play');
 console.log((await txt(page,'main')).slice(0,4000));
 console.log(await page.evaluate(()=>[...document.querySelectorAll('main button')].filter(b=>b.offsetParent).map(b=>b.innerText.replace(/\n/g,' ').slice(0,40)+'['+Object.entries(b.dataset).map(([k,v])=>k+'='+v).join(',')+']').join(' ; ')));
 console.log(errs); await browser.close();
})();
