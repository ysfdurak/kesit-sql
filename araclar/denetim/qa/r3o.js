const {open,go,txt}=require('./lib');
(async()=>{
 const {browser,page,errs}=await open();
 await go(page,'data'); await page.waitForTimeout(500);
 await page.shot('d_data');
 console.log((await txt(page,'main')).slice(0,1800));
 console.log(await page.$$eval('main [data-dset],main [data-dtable]',b=>b.map(x=>(x.dataset.dset?'set='+x.dataset.dset:'tbl='+x.dataset.dtable)+':'+x.innerText.slice(0,30).replace(/\n/g,' ')).join(' ; ')));
 console.log(errs); await browser.close();
})();
