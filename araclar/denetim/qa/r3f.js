const {open,go,txt}=require('./lib');
(async()=>{
 const {browser,page,errs}=await open();
 await go(page,'play'); await page.waitForTimeout(300);
 await page.click('[data-ar=ch][data-id=stok-alarmi]'); await page.waitForTimeout(600);
 console.log(page.url());
 await page.shot('d_ch_open');
 console.log((await txt(page,'main')).slice(0,2000));
 console.log(await page.evaluate(()=>[...document.querySelectorAll('main button')].filter(b=>b.offsetParent).map(b=>b.innerText.replace(/\n/g,' ').slice(0,30)+'['+Object.entries(b.dataset).map(([k,v])=>k+'='+v).join(',')+']').join(' ; ')));
 console.log(await page.evaluate(()=>[...document.querySelectorAll('main textarea, main input')].map(e=>e.id+':'+e.tagName).join(',')));
 console.log(errs); await browser.close();
})();
