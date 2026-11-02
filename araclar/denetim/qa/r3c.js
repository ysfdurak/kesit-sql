const {open,go,txt}=require('./lib');
(async()=>{
 const {browser,page,errs}=await open();
 await go(page,'pratik-t029');
 await page.fill('#sqlEditor','SELECT salary FROM employees ORDER BY salary DESC OFFSET 1 LIMIT 1'); await page.click('[data-act=run]'); await page.waitForTimeout(1200);
 await page.evaluate(()=>document.querySelector('.ed-actions').scrollIntoView()); await page.shot('d_pg_err_run');
 await page.click('[data-act=submit]'); await page.waitForTimeout(1200);
 await page.shot('d_pg_err_submit');
 console.log(await page.evaluate(()=>[...document.querySelector('.work').children].map(c=>c.className+' :: '+c.innerText.replace(/\n/g,' / ').slice(0,200)).join('\n')));
 // AI coach
 const b=await page.$('text=İpucu ver'); if(b){ await b.click(); await page.waitForTimeout(1500); console.log('COACH:', await page.evaluate(()=>[...document.querySelector('.work').children].map(c=>c.innerText).join('\n').slice(-600))); await page.shot('d_coach'); }
 const bb=await page.$('text=Hatalıysa bildir'); if(bb){ await bb.click(); await page.waitForTimeout(800); console.log('BILDIR ->', page.url(), (await txt(page,'body')).slice(0,0)); const t=await page.evaluate(()=>[...document.querySelectorAll('.toast, dialog[open], .modal')].map(e=>e.innerText).join('|')); console.log('bildir ui:',t); await page.shot('d_bildir'); }
 console.log(errs); await browser.close();
})();
