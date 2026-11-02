const {open,go,txt}=require('./lib');
const mobile=process.argv[2]==='m'; const tag=mobile?'m_':'d_';
(async()=>{
 const {browser,page,errs}=await open({mobile});
 await go(page,'sinav'); await page.waitForTimeout(400);
 await page.click('[data-exam="genel-temel"]'); await page.waitForTimeout(500);
 for(let i=0;i<12;i++){
   const q=await page.evaluate(()=>document.querySelector('.panel.brief').innerText.replace(/\n/g,' '));
   console.log('Q'+(i+1)+':',q.slice(0,260));
   const n=await page.$$eval('.mc button',b=>b.length);
   await page.click(`.mc button >> nth=${i%n}`); await page.waitForTimeout(150);
   if(i==2) await page.click('[data-act=ex-flag]');
   await page.click('.pager .btn.pri'); await page.waitForTimeout(200);
 }
 await page.shot(tag+'exam_mid');
 if(mobile){ console.log('sw',await page.ow()); }
 console.log('footer:', await page.evaluate(()=>document.querySelector('main p.muted:last-child')?.innerText));
 await page.click('[data-act=ex-fin-ask]'); await page.waitForTimeout(300);
 console.log('confirm:', await txt(page,'#exFin'));
 await page.shot(tag+'exam_confirm');
 const btns=await page.$$eval('#exFin button',b=>b.map(x=>x.innerText+'|'+x.dataset.act)); console.log(btns);
 await page.click('#exFin button >> nth=0'); await page.waitForTimeout(600);
 await page.shotFull(tag+'exam_report');
 console.log('REPORT:', (await txt(page,'main')).slice(0,5000));
 console.log('sw',await page.ow());
 console.log(errs); await browser.close();
})();
