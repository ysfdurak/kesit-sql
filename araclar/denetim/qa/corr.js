const {open,go,txt}=require('./lib');
(async()=>{
 const {browser,page,errs}=await open();
 for(const D of ['pg','sqlite']){
 await go(page,''); await page.selectOption('aside select',D);
 await page.evaluate(()=>location.hash='ders-correlated'); await page.waitForTimeout(400);
 console.log('title:', (await txt(page,'h1')));
 await page.click('.steps button[data-step="7"]'); await page.waitForTimeout(300);
 console.log('TASK:', await txt(page,'.brief .q'));
 await page.click('[data-act=sol]'); await page.click('#solBox >> text=Editöre kopyala');
 console.log('SOL:', await page.inputValue('#sqlEditor'));
 const t0=Date.now();
 await page.click('[data-act=submit]',{timeout:90000,noWaitAfter:true}).catch(e=>console.log('click err'));
 await page.waitForFunction(()=>/Doğru|Henüz|hata/.test(document.querySelector('.work').innerText),null,{timeout:120000}).catch(()=>console.log('no fb'));
 console.log(D,'elapsed ms', Date.now()-t0, (await page.evaluate(()=>[...document.querySelector('.work').children].filter(d=>!/ed-shell|ed-actions|result/.test(d.className)).map(d=>d.innerText).join('|').slice(0,150))).replace(/\n/g,' '));
 }
 console.log(errs); await browser.close();
})();
