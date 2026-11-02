const {open,go,txt,buttons}=require('./lib');
const mobile=process.argv[2]==='m'; const tag=mobile?'m_':'d_';
(async()=>{
 const {browser,page,errs}=await open({mobile});
 await go(page);
 await page.click('text=Biraz biliyorum'); await page.waitForTimeout(400);
 const plan=['c','c','c','c','c','c','c','c','w','k','c','w','k','k','k']; // correct/wrong/bilmiyorum
 for(let i=0;i<15;i++){
   const info=await page.evaluate(()=>({q:document.querySelector('.panel.brief .q').innerText, lv:document.querySelector('.panel.brief .lv').innerText, n:document.querySelector('.panel.brief .eyebrow').innerText}));
   const a=await page.evaluate(i=>window.SQLP_PLACEMENT[i].a,i);
   const nOpt=await page.evaluate(i=>window.SQLP_PLACEMENT[i].o.length,i);
   const pick= plan[i]==='c'? a : plan[i]==='w' ? (a+1)%nOpt : nOpt;
   console.log(info.n,info.lv,'|',info.q.replace(/\n/g,' ').slice(0,140),'| opts:',(await page.$$eval('.mc button',bs=>bs.map(b=>b.innerText.replace(/\n/g,' ')).join(' ; '))).slice(0,300));
   if(i==7){ await page.shot(tag+'r2_testmid'); const w=await page.ow(); if(w>(mobile?390:1280)) console.log('OVERFLOW test',w);}
   // leave and return mid-test
   if(i==5){ await page.evaluate(()=>location.hash=''); await page.waitForTimeout(300); await page.evaluate(()=>location.hash='test'); await page.waitForTimeout(300); console.log('after leave/return:', await txt(page,'.panel.brief .eyebrow')); }
   await page.click(`.mc button[data-tq="${pick}"]`); await page.waitForTimeout(150);
 }
 await page.waitForTimeout(400);
 await page.shot(tag+'r2_testresult');
 console.log('RESULT:', (await txt(page,'.panel.finish')).replace(/\n/g,' / '));
 console.log('side', (await txt(page,'#sideStats')).replace(/\n/g,' '));
 const b=await page.$('.panel.finish .btn.pri'); if(b){ await b.click(); await page.waitForTimeout(500); console.log('went to', page.url(), (await txt(page,'main')).slice(0,200).replace(/\n/g,' / ')); }
 await page.evaluate(()=>location.hash=''); await page.waitForTimeout(400);
 console.log('HOME after test:', (await txt(page,'main')).slice(0,800).replace(/\n/g,' / '));
 await page.shot(tag+'r2_homeafter');
 console.log(errs); await browser.close();
})();
