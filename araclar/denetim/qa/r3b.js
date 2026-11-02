const {open,go,txt}=require('./lib');
const cases=[['oracle','t071',"SELECT COUNT(*) AS adet FROM orders WHERE order_date >= DATE '2024-12-31' - 29"],
 ['oracle','t071',"SELECT COUNT(*) AS adet FROM orders WHERE order_date >= DATE '2024-12-31' - INTERVAL '29' DAY"],
 ['pg','t029',"SELECT salary AS maas FROM employees GROUP BY salary ORDER BY salary DESC OFFSET 1 LIMIT 1;"],
 ['mysql','t062',"SELECT SUBSTRING_INDEX(email, '@', 1) AS kullanici FROM customers WHERE email IS NOT NULL ORDER BY customer_id LIMIT 5;"]];
(async()=>{
 const {browser,page,errs}=await open();
 await go(page,'');
 for(const [D,id,sql] of cases){
  await page.selectOption('aside select',D); 
  await page.evaluate(id=>location.hash='pratik-'+id,id); await page.waitForSelector('#sqlEditor');
  await page.fill('#sqlEditor',sql); await page.click('[data-act=run]'); await page.waitForTimeout(1500);
  const r=await page.evaluate(()=>document.querySelector('.work').innerText.split('\n').filter(x=>x.trim()).slice(-30).join(' / '));
  console.log(D,id,'RUN:',r.slice(0,700));
  const m=await page.$('text=Motorun çalıştırdığı SQL'); if(m){ await m.click(); await page.waitForTimeout(200); console.log('ENGINE SQL:', await page.evaluate(()=>{const d=[...document.querySelectorAll('details,.engsql,pre')].map(e=>e.innerText).filter(t=>/SELECT/i.test(t)); return d.slice(-1)[0];})); }
 }
 await page.shot('d_oracle_t071');
 console.log(errs); await browser.close();
})();
