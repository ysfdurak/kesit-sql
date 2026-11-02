const {open,go,txt}=require('./lib');
(async()=>{
 const {browser,page,errs}=await open();
 await go(page,'play'); await page.click('[data-ar=mode][data-id=hiz]'); await page.waitForTimeout(500);
 console.log((await txt(page,'main')).slice(0,600).replace(/\n/g,' / '));
 const st=await page.$('[data-ar=speed-start], [data-ar=hiz-start]'); console.log(await page.$$eval('main [data-ar]',b=>b.map(x=>x.dataset.ar+':'+x.innerText.slice(0,20)).join(' ; ')));
 const s=await page.$('main [data-ar*=start]'); if(s){ await s.click(); await page.waitForTimeout(500); console.log('STARTED:', (await txt(page,'main')).slice(0,700).replace(/\n/g,' / ')); console.log(await page.$$eval('main [data-ar]',b=>b.map(x=>x.dataset.ar+':'+x.innerText.slice(0,20)).join(' ; '))); }
 await page.shot('d_hiz');
 console.log(errs); await browser.close();
})();
