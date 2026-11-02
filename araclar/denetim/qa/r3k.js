const {open,go,txt}=require('./lib');
const ars=async page=>page.$$eval('main [data-ar]',b=>b.filter(x=>x.offsetParent).map(x=>x.dataset.ar+'|'+(x.dataset.id||x.dataset.i||x.dataset.v||'')+':'+x.innerText.slice(0,40).replace(/\n/g,' ')).join(' ; '));
(async()=>{
 const {browser,page,errs}=await open();
 await go(page,'oyun-tahmin'); await page.waitForTimeout(500);
 for(let i=0;i<4;i++){
  const q=await page.evaluate(()=>{const t=document.querySelector('main').innerText; return t;});
  const sql=q.split('\n').find(l=>/^(SELECT|WITH)/.test(l));
  // compute real answer by running it in sqlite engine via page? just pick 0
  await page.click('[data-ar=pred-pick] >> nth=0'); await page.waitForTimeout(500);
  const after=(await txt(page,'main')); 
  console.log('Q',i+1,sql,'\n  ->',after.split('Bu sorgu hangi değeri döndürür?')[1]?.slice(0,400).replace(/\n/g,' / '));
  console.log('  ARS:',await ars(page));
  const nx=await page.$('[data-ar=pred-next]'); if(nx) { await nx.click(); await page.waitForTimeout(400);} 
 }
 await page.shot('d_tahmin_after');
 // switch program in tahmin
 await page.selectOption('main select','tsql').catch(e=>console.log('no select')); await page.waitForTimeout(600);
 console.log('after tsql switch:', (await txt(page,'main')).slice(0,500).replace(/\n/g,' / '));
 // puzzle
 await page.evaluate(()=>location.hash='oyun-bulmaca'); await page.waitForTimeout(500);
 for(const l of ['SELECT name, price','FROM products',"WHERE category = 'Kitap'",'AND price > 100','ORDER BY price DESC;']){ await page.click(`[data-ar=pz-add]:has-text("${l}")`); await page.waitForTimeout(100);} 
 await page.click('[data-ar=pz-check]'); await page.waitForTimeout(500);
 console.log('PUZZLE:', (await txt(page,'main')).split('SENİN SORGUN')[1]?.slice(0,500).replace(/\n/g,' / '));
 await page.shot('d_puzzle_done');
 // puzzle 2 wrong attempt
 await page.click('[data-ar=pz-go]:has-text("Sonraki bulmaca")').catch(()=>{}); await page.waitForTimeout(400);
 console.log('PZ2:', (await txt(page,'main')).slice(0,900).replace(/\n/g,' / '));
 const adds=await page.$$('[data-ar=pz-add]'); await adds[0].click(); await page.click('[data-ar=pz-check]'); await page.waitForTimeout(400);
 console.log('PZ2 wrong:', (await txt(page,'main')).split('SENİN SORGUN')[1]?.slice(0,400).replace(/\n/g,' / '));
 console.log(errs); await browser.close();
})();
