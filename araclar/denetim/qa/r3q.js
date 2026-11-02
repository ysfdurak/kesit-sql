const {open,go,txt}=require('./lib');
(async()=>{
 const {browser,page,errs}=await open();
 await go(page,'dict'); await page.waitForTimeout(400);
 const t=await txt(page,'main'); console.log('DICT len',t.length, t.slice(0,300).replace(/\n/g,' / '));
 console.log('terms:', await page.$$eval('#glList .term',x=>x.length));
 for(const q of ['index','kohort','ACID','İNDEKS','ındex','zzz','pencere']){ await page.fill('#dictQ',q); await page.waitForTimeout(300); console.log('q',q,'->',await page.$$eval('#glList .term',x=>x.length), (await txt(page,'#glList')).slice(0,80).replace(/\n/g,' ')); }
 console.log('focus kept?', await page.evaluate(()=>document.activeElement.id));
 await page.shot('d_dict');
 // global search ctrl+k
 await page.keyboard.press('Control+k'); await page.waitForTimeout(300);
 console.log('active after ctrl-k:', await page.evaluate(()=>document.activeElement.outerHTML.slice(0,150)));
 await page.keyboard.type('pencere'); await page.waitForTimeout(500);
 await page.shot('d_search');
 console.log('search results:', await page.evaluate(()=>{const r=document.querySelector('.sres, .search-results, [role=listbox]'); return r? r.innerText.slice(0,500):'(no results container)';}));
 await page.keyboard.press('Enter'); await page.waitForTimeout(500); console.log('after enter', page.url());
 console.log(errs); await browser.close();
})();
