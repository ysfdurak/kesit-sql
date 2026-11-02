const {open,go,txt}=require('./lib');
(async()=>{
 const {browser,page,errs}=await open();
 await go(page,'test');
 for(let i=0;i<15;i++){ const a=await page.evaluate(i=>window.SQLP_PLACEMENT[i].a,i); const n=await page.evaluate(i=>window.SQLP_PLACEMENT[i].o.length,i); await page.click(`.mc button[data-tq="${i<5?a:n}"]`); await page.waitForTimeout(80);}
 console.log('RESULT:', (await txt(page,'.panel.finish')).replace(/\n/g,' / '));
 console.log('side now', (await txt(page,'#sideStats')).replace(/\n/g,' '));
 await page.evaluate(()=>location.hash='paths'); await page.waitForTimeout(300);
 console.log('side after nav', (await txt(page,'#sideStats')).replace(/\n/g,' '));
 await page.reload(); await page.waitForTimeout(1500);
 console.log('side after reload', (await txt(page,'#sideStats')).replace(/\n/g,' '));
 // test again
 await page.evaluate(()=>location.hash='test'); await page.waitForTimeout(300);
 console.log('test page after done:', (await txt(page,'main')).slice(0,300).replace(/\n/g,' / '));
 await page.click('[data-act=test-again]').catch(()=>console.log('no test-again'));
 await page.waitForTimeout(300);
 console.log('after again:', (await txt(page,'main')).slice(0,300).replace(/\n/g,' / '));
 // all bilmiyorum
 for(let i=0;i<15;i++){ const n=await page.evaluate(i=>window.SQLP_PLACEMENT[i].o.length,i); await page.click(`.mc button[data-tq="${n}"]`); await page.waitForTimeout(60);} 
 console.log('ALL-BILMIYORUM:', (await txt(page,'.panel.finish')).replace(/\n/g,' / '));
 for(const sel of ['.panel.finish .btn.pri']) { await page.click(sel); await page.waitForTimeout(300); console.log(page.url()); }
 console.log(errs); await browser.close();
})();
