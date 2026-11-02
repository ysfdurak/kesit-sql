const {open,go,txt}=require('./lib');
(async()=>{
 const {browser,page,errs}=await open();
 await go(page,'oyun-ch-sehir-sampiyonu'); await page.waitForTimeout(600);
 console.log('hint btn:', await page.$$eval('[data-ar]',b=>b.map(x=>x.dataset.ar+':'+x.innerText.slice(0,30)).join(' ; ')));
 const h=await page.$('[data-ar=hint]'); if(h){ await h.click(); await page.waitForTimeout(400); const t=await txt(page,'main'); const i=t.indexOf('İpucu'); console.log('HINT:', t.slice(i,i+300).replace(/\n/g,' / ')); }
 await page.fill('#sqlEditor',"SELECT city, COUNT(*) AS musteri FROM customers WHERE city IS NOT NULL GROUP BY city ORDER BY musteri DESC, city LIMIT 1");
 await page.click('[data-ar=submit]'); await page.waitForTimeout(1500);
 let t=await txt(page,'main'); let i=t.indexOf('Gönder\n'); console.log('SUBMIT:', t.slice(i+7,i+300).replace(/\n/g,' / '));
 // detective
 await page.evaluate(()=>location.hash='play'); await page.waitForTimeout(400);
 await page.click('[data-ar=mode][data-id=dedektif-kayip-kargo]'); await page.waitForTimeout(600);
 console.log('DET URL', page.url());
 await page.shot('d_det');
 console.log('DET:', (await txt(page,'main')).slice(0,2500));
 console.log(await page.$$eval('main [data-ar], main button',b=>b.filter(x=>x.offsetParent).map(x=>(x.dataset.ar||'')+':'+x.innerText.slice(0,25).replace(/\n/g,' ')).join(' ; ')));
 console.log(errs); await browser.close();
})();
