const {open,go,txt}=require('./lib');
(async()=>{
 const {browser,page,errs}=await open();
 await go(page,'oyun-ch-stok-alarmi'); await page.waitForTimeout(500);
 for(const q of ["SELECT name, stock FROM products WHERE stock < 20 ORDER BY stock, name DESC","SELECT name, stock FROM products WHERE stock < 20 ORDER BY stock, product_id DESC"]){
  await page.fill('#sqlEditor',q); await page.click('[data-ar=submit]'); await page.waitForTimeout(1500);
  const r=await page.evaluate(()=>{const t=document.querySelector('main').innerText; const i=t.indexOf('Gönder\n'); return t.slice(i+7,i+400);});
  console.log(q,'::',r.replace(/\n/g,' / '));
 }
 await page.evaluate(()=>location.hash='oyun-ch-sehir-sampiyonu'); await page.waitForTimeout(800);
 console.log(page.url(), (await txt(page,'main')).slice(0,300).replace(/\n/g,' / '));
 await go(page,'oyun-ch-sehir-sampiyonu'); await page.waitForTimeout(800);
 console.log('via goto:', page.url(), (await txt(page,'main')).slice(0,300).replace(/\n/g,' / '));
 console.log(errs); await browser.close();
})();
