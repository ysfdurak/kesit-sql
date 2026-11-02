const {open,go,txt}=require('./lib');
(async()=>{
 const {browser,page,errs}=await open();
 await go(page,''); await page.selectOption('aside select','tsql'); 
 await page.evaluate(()=>location.hash='oyun-tahmin'); await page.waitForTimeout(500);
 for(let i=0;i<20;i++){
  const t=await txt(page,'main');
  if(/JOIN SONRASI SUM/.test(t)||/order_id > 0/.test(t)){ console.log('FOUND at',i+1,'\n',t.slice(0,700)); await page.shot('d_tahmin_sumbool_tsql'); break; }
  await page.click('[data-ar=pred-pick] >> nth=0'); await page.waitForTimeout(250);
  const nx=await page.$('[data-ar=pred-next]'); if(nx){ await nx.click(); await page.waitForTimeout(300);} 
 }
 const t=await txt(page,'main'); if(/Sonuç|tamamlandı|bitti/i.test(t)) console.log('END:', t.slice(0,600));
 console.log(errs); await browser.close();
})();
