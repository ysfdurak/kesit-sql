const {open,go,txt}=require('./lib');
(async()=>{
 const {browser,page,errs}=await open();
 for(const h of ['pratik-t029','ders-ilk-sorgu','ders-veritabani']){
 await page.goto('http://localhost:8811/index.html#'+h);
 await page.waitForSelector('#sideStats .engine .dot.ok',{state:'attached',timeout:30000});
 await page.waitForTimeout(3000);
 console.log(h,'prevbox:', JSON.stringify(await page.evaluate(()=>[...document.querySelectorAll('.prevbox')].map(p=>p.innerText.slice(0,80)))), 'engine:', await txt(page,'#sideStats .engine'));
 if(h==='ders-ilk-sorgu'){ await page.click('.pager [data-step="1"]'); await page.waitForTimeout(500); console.log(' after step nav prevbox:', (await txt(page,'.prevbox')).slice(0,80)); }
 }
 // aside chip click
 await page.goto('http://localhost:8811/index.html#pratik-t029'); await page.waitForSelector('#sideStats .engine .dot.ok',{state:'attached'}); await page.waitForTimeout(1000);
 await page.click('.usedata .chip'); await page.waitForTimeout(400); console.log('after chip toggle:', (await txt(page,'.prevbox')).slice(0,80));
 await page.click('.usedata .chip'); await page.waitForTimeout(400); console.log('after chip toggle2:', (await txt(page,'.prevbox')).slice(0,80));
 console.log(errs); await browser.close();
})();
