const {open,go,txt}=require('./lib');
(async()=>{
 const {browser,page,errs}=await open();
 await go(page,'oyun-turnuva'); await page.waitForTimeout(400);
 await page.click('[data-ar=tour-start]'); await page.waitForTimeout(500);
 await page.click('[data-ar=tour-go] >> nth=1'); await page.waitForTimeout(300);
 await page.fill('#sqlEditor',"SELECT ROUND(AVG(n)::numeric, 2) AS ort_kalem FROM (SELECT o.order_id, COUNT(*) AS n FROM orders o JOIN order_items oi ON oi.order_id = o.order_id WHERE o.status = 'delivered' GROUP BY o.order_id) t;");
 await page.click('[data-ar=tour-submit]'); await page.waitForTimeout(1500);
 let t=await txt(page,'main'); console.log('SUB:', t.slice(t.indexOf('Gönder')+6, t.indexOf('Gönder')+400).replace(/\n/g,' / '));
 console.log('head:', t.slice(0,80).replace(/\n/g,' '));
 await page.click('[data-ar=tour-end]'); await page.waitForTimeout(500);
 t=await txt(page,'main'); console.log('END1:', t.slice(0,600).replace(/\n/g,' / '));
 const c=await page.$('[data-ar=tour-end-yes], [data-ar=tour-end-ok], [data-ar=tour-fin]'); if(c){ await c.click(); await page.waitForTimeout(500); t=await txt(page,'main'); console.log('END2:', t.slice(0,800).replace(/\n/g,' / ')); }
 console.log(await page.$$eval('main [data-ar]',b=>b.filter(x=>x.offsetParent).map(x=>x.dataset.ar+':'+x.innerText.slice(0,20)).join(' ; ')));
 await page.shot('d_tour_end');
 console.log(errs); await browser.close();
})();
