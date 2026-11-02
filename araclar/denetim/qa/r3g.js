const {open,go,txt}=require('./lib');
const tries=[
 ["hardcode","SELECT name, stock FROM products WHERE name IN ('Hediye Kartı 500 TL','Spor Ayakkabı') ORDER BY stock"],
 ["<=20","SELECT name, stock FROM products WHERE stock <= 20 ORDER BY stock, name"],
 ["no tiebreak","SELECT name, stock FROM products WHERE stock < 20 ORDER BY stock"],
 ["correct","SELECT name, stock FROM products WHERE stock < 20 ORDER BY stock, name"],
 ["correct again","SELECT name, stock FROM products WHERE stock < 20 ORDER BY stock ASC, name ASC"],
];
(async()=>{
 const {browser,page,errs}=await open();
 await go(page,'oyun-ch-stok-alarmi'); await page.waitForTimeout(500);
 for(const [l,q] of tries){
  await page.fill('#sqlEditor',q); await page.click('[data-ar=submit]'); await page.waitForTimeout(1500);
  const r=await page.evaluate(()=>{const m=document.querySelector('main'); const t=m.innerText; const i=t.indexOf('Gönder\n'); return t.slice(i+7,i+700);});
  console.log('==',l,'::',r.replace(/\n/g,' / ').slice(0,500));
 }
 await page.shot('d_ch_done');
 await page.click('[data-ar=hub]'); await page.waitForTimeout(400);
 console.log('hub stats:', (await txt(page,'main')).slice(0,400).replace(/\n/g,' / '));
 // hint on another
 await go(page,'oyun-ch-sehir-sampiyonu'); await page.waitForTimeout(400);
 await page.click('[data-ar=hint]'); await page.waitForTimeout(400); 
 console.log('after hint:', (await txt(page,'main')).slice(0,1500).replace(/\n/g,' / '));
 await page.click('[data-ar=schema]'); await page.waitForTimeout(400); await page.shot('d_ch_schema');
 console.log(errs); await browser.close();
})();
