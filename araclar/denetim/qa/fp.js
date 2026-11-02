const {open,go}=require('./lib');
const C=[
 ['t023','SELECT name, price FROM products ORDER BY price, name DESC','wrong tie order'],
 ['t023','SELECT name, price FROM products ORDER BY price DESC, name','wrong direction'],
 ['t023','SELECT name, price FROM products','no order'],
 ['t024','SELECT name, price FROM products ORDER BY price DESC LIMIT 6','6 rows'],
 ['t026','SELECT category, name, price FROM products ORDER BY category, price','asc price'],
 ['t029','SELECT salary AS maas FROM employees ORDER BY salary DESC LIMIT 1 OFFSET 1','no distinct'],
 ['t027',"SELECT order_id, order_date FROM orders ORDER BY order_date LIMIT 3",'no tiebreak'],
 ['t001','SELECT name, price, category FROM products','col order swapped'],
 ['t001','SELECT name, category, price FROM products WHERE price > 0','extra filter (no effect)'],
];
(async()=>{
 const {browser,page,errs}=await open();
 await go(page,'');
 for(const [id,q,l] of C){
  await page.evaluate(id=>location.hash='pratik-'+id,id); await page.waitForSelector('#sqlEditor');
  await page.fill('#sqlEditor',q); await page.click('[data-act=submit]');
  let fb=''; for(let k=0;k<40;k++){ await page.waitForTimeout(100); fb=await page.evaluate(()=>[...document.querySelector('.work').children].filter(d=>!/ed-shell|ed-actions|result/.test(d.className)).map(d=>d.innerText).join('|').replace(/\n/g,' ').slice(0,200)); if(/Doğru|Henüz|hata/.test(fb)) break; }
  const task=await page.evaluate(()=>document.querySelector('.brief .q').innerText);
  console.log(id,l,'=>',fb.slice(0,140),' | TASK:',task.slice(0,120));
 }
 console.log(errs); await browser.close();
})();
