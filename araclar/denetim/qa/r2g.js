const {open,go,txt}=require('./lib');
const mobile=process.argv[2]==='m'; const tag=mobile?'m_':'d_';
(async()=>{
 const {browser,page,errs}=await open({mobile});
 await go(page,'sinav'); await page.waitForTimeout(400);
 await page.click('[data-exam="genel-temel"]'); await page.waitForTimeout(500);
 await page.shot(tag+'exam_q1');
 console.log((await txt(page,'main')).slice(0,1200));
 console.log(await page.evaluate(()=>document.querySelector('main').innerHTML.slice(0,3000)));
 console.log(errs); await browser.close();
})();
