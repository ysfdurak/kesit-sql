const {open,go,txt}=require('./lib');
(async()=>{
 const {browser,page,errs}=await open();
 await go(page,''); await page.selectOption('aside select','oracle'); await page.waitForTimeout(200);
 console.log('home note:', (await txt(page,'main')).match(/Örnekler şu an[^\n]*/)?.[0] || (await txt(page,'main')).match(/Varsayılan program[^\n]*/)?.[0]);
 await page.evaluate(()=>location.hash='pratik-t024'); await page.waitForSelector('#sqlEditor');
 await page.fill('#sqlEditor','select name,price from products order by price desc fetch first 5 rows only');
 await page.click('[data-act=fmt]'); await page.waitForTimeout(200); console.log('formatted:', await page.inputValue('#sqlEditor'));
 await page.click('[data-act=cmp]'); await page.waitForTimeout(800);
 const t=await txt(page,'main'); const i=t.indexOf('SQL Server',t.indexOf('Sıfırla')); console.log('CMP:', t.slice(i, i+900));
 await page.shot('d_cmp');
 await page.click('text=Sıfırla'); await page.waitForTimeout(200); console.log('after reset:', JSON.stringify(await page.inputValue('#sqlEditor')));
 console.log(errs); await browser.close();
})();
