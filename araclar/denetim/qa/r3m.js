const {open,go,txt}=require('./lib');
const ars=async page=>page.$$eval('main [data-ar]',b=>b.filter(x=>x.offsetParent).map(x=>x.dataset.ar+'|'+(x.dataset.id||x.dataset.i||'')+':'+x.innerText.slice(0,30).replace(/\n/g,' ')).join(' ; '));
(async()=>{
 const {browser,page,errs}=await open();
 await go(page,'oyun-turnuva'); await page.waitForTimeout(400);
 await page.click('[data-ar=tour-start]'); await page.waitForTimeout(600);
 console.log((await txt(page,'main')).slice(0,1200)); console.log(await ars(page));
 await page.shot('d_tour');
 // problem 2 Ortalama sepet: need description
 const tabs=await page.$$('[data-ar=tour-go]'); console.log('tabs',tabs.length);
 if(tabs[1]){ await tabs[1].click(); await page.waitForTimeout(400); console.log('P2:',(await txt(page,'main')).slice(0,900)); }
 console.log(errs); await browser.close();
})();
