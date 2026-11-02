const {open,go,txt}=require('./lib');
const Q={
 tsql:{
  t024:"SELECT TOP 5 name, price FROM products ORDER BY price DESC;",
  t028:"SELECT product_id, name FROM products ORDER BY product_id OFFSET 10 ROWS FETCH NEXT 10 ROWS ONLY;",
  t029:"SELECT MAX(salary) AS maas FROM employees WHERE salary < (SELECT MAX(salary) FROM employees);",
  t059:"SELECT TOP 5 first_name + ' ' + last_name AS ad_soyad FROM customers ORDER BY customer_id;",
  t062:"SELECT TOP 5 LEFT(email, CHARINDEX('@', email) - 1) AS kullanici FROM customers WHERE email IS NOT NULL ORDER BY customer_id;",
  t066:"SELECT YEAR(order_date) AS yil, COUNT(*) AS siparis FROM orders GROUP BY YEAR(order_date);",
  t067:"SELECT FORMAT(order_date, 'yyyy-MM') AS ay, COUNT(*) AS siparis FROM orders WHERE order_date >= '2024-01-01' AND order_date < '2025-01-01' GROUP BY FORMAT(order_date, 'yyyy-MM') ORDER BY ay;",
  t068:"SELECT first_name, 2024 - YEAR(hire_date) AS kidem FROM employees;",
  t069:"SELECT DATEDIFF(day, c.signup_date, MIN(o.order_date)) AS gun FROM customers c JOIN orders o ON o.customer_id = c.customer_id WHERE c.customer_id = 1 GROUP BY c.signup_date;",
  t070:"SELECT COUNT(*) AS adet FROM orders WHERE DATENAME(weekday, order_date) IN ('Saturday','Sunday');",
  t071:"SELECT COUNT(*) AS adet FROM orders WHERE order_date >= DATEADD(day, -29, '2024-12-31');",
  t058:"SELECT UPPER(last_name) AS soyad FROM employees;",
  t060:"SELECT name, LEN(name) AS uzunluk FROM products WHERE category = 'Kitap' AND LEN(name) > 6;",
 },
 oracle:{
  t024:"SELECT name, price FROM products ORDER BY price DESC FETCH FIRST 5 ROWS ONLY",
  t028:"SELECT product_id, name FROM products ORDER BY product_id OFFSET 10 ROWS FETCH NEXT 10 ROWS ONLY",
  t029:"SELECT MAX(salary) AS maas FROM employees WHERE salary < (SELECT MAX(salary) FROM employees)",
  t059:"SELECT first_name || ' ' || last_name AS ad_soyad FROM customers ORDER BY customer_id FETCH FIRST 5 ROWS ONLY",
  t062:"SELECT SUBSTR(email, 1, INSTR(email, '@') - 1) AS kullanici FROM customers WHERE email IS NOT NULL ORDER BY customer_id FETCH FIRST 5 ROWS ONLY",
  t066:"SELECT EXTRACT(YEAR FROM order_date) AS yil, COUNT(*) AS siparis FROM orders GROUP BY EXTRACT(YEAR FROM order_date)",
  t067:"SELECT TO_CHAR(order_date, 'YYYY-MM') AS ay, COUNT(*) AS siparis FROM orders WHERE order_date >= DATE '2024-01-01' AND order_date < DATE '2025-01-01' GROUP BY TO_CHAR(order_date, 'YYYY-MM') ORDER BY ay",
  t068:"SELECT first_name, 2024 - EXTRACT(YEAR FROM hire_date) AS kidem FROM employees",
  t069:"SELECT MIN(o.order_date) - c.signup_date AS gun FROM customers c JOIN orders o ON o.customer_id = c.customer_id WHERE c.customer_id = 1 GROUP BY c.signup_date",
  t070:"SELECT COUNT(*) AS adet FROM orders WHERE TO_CHAR(order_date, 'DY', 'NLS_DATE_LANGUAGE=ENGLISH') IN ('SAT','SUN')",
  t071:"SELECT COUNT(*) AS adet FROM orders WHERE order_date >= DATE '2024-12-31' - 29",
  t058:"SELECT UPPER(last_name) AS soyad FROM employees",
  t060:"SELECT name, LENGTH(name) AS uzunluk FROM products WHERE category = 'Kitap' AND LENGTH(name) > 6",
 },
 bq:{
  t024:"SELECT name, price FROM products ORDER BY price DESC LIMIT 5;",
  t028:"SELECT product_id, name FROM products ORDER BY product_id LIMIT 10 OFFSET 10;",
  t029:"SELECT DISTINCT salary AS maas FROM employees ORDER BY salary DESC LIMIT 1 OFFSET 1;",
  t059:"SELECT CONCAT(first_name, ' ', last_name) AS ad_soyad FROM customers ORDER BY customer_id LIMIT 5;",
  t062:"SELECT SPLIT(email, '@')[OFFSET(0)] AS kullanici FROM customers WHERE email IS NOT NULL ORDER BY customer_id LIMIT 5;",
  t066:"SELECT EXTRACT(YEAR FROM order_date) AS yil, COUNT(*) AS siparis FROM orders GROUP BY yil;",
  t067:"SELECT FORMAT_DATE('%Y-%m', order_date) AS ay, COUNT(*) AS siparis FROM orders WHERE order_date >= '2024-01-01' AND order_date < '2025-01-01' GROUP BY ay ORDER BY ay;",
  t068:"SELECT first_name, 2024 - EXTRACT(YEAR FROM hire_date) AS kidem FROM employees;",
  t069:"SELECT DATE_DIFF(MIN(o.order_date), c.signup_date, DAY) AS gun FROM customers c JOIN orders o ON o.customer_id = c.customer_id WHERE c.customer_id = 1 GROUP BY c.signup_date;",
  t070:"SELECT COUNT(*) AS adet FROM orders WHERE EXTRACT(DAYOFWEEK FROM order_date) IN (1, 7);",
  t071:"SELECT COUNT(*) AS adet FROM orders WHERE order_date >= DATE_SUB(DATE '2024-12-31', INTERVAL 29 DAY);",
  t058:"SELECT UPPER(last_name) AS soyad FROM employees;",
  t060:"SELECT name, LENGTH(name) AS uzunluk FROM products WHERE category = 'Kitap' AND LENGTH(name) > 6;",
 },
 pg:{
  t062:"SELECT split_part(email, '@', 1) AS kullanici FROM customers WHERE email IS NOT NULL ORDER BY customer_id LIMIT 5;",
  t066:"SELECT EXTRACT(YEAR FROM order_date) AS yil, COUNT(*) AS siparis FROM orders GROUP BY 1;",
  t067:"SELECT to_char(order_date, 'YYYY-MM') AS ay, COUNT(*) AS siparis FROM orders WHERE order_date >= '2024-01-01' AND order_date < '2025-01-01' GROUP BY 1 ORDER BY 1;",
  t069:"SELECT MIN(o.order_date) - c.signup_date AS gun FROM customers c JOIN orders o ON o.customer_id = c.customer_id WHERE c.customer_id = 1 GROUP BY c.signup_date;",
  t070:"SELECT COUNT(*) AS adet FROM orders WHERE EXTRACT(DOW FROM order_date) IN (0, 6);",
  t071:"SELECT COUNT(*) AS adet FROM orders WHERE order_date >= DATE '2024-12-31' - INTERVAL '29 days';",
  t029:"SELECT salary AS maas FROM employees GROUP BY salary ORDER BY salary DESC OFFSET 1 LIMIT 1;",
 },
 mysql:{
  t062:"SELECT SUBSTRING_INDEX(email, '@', 1) AS kullanici FROM customers WHERE email IS NOT NULL ORDER BY customer_id LIMIT 5;",
  t066:"SELECT YEAR(order_date) AS yil, COUNT(*) AS siparis FROM orders GROUP BY YEAR(order_date);",
  t067:"SELECT DATE_FORMAT(order_date, '%Y-%m') AS ay, COUNT(*) AS siparis FROM orders WHERE order_date >= '2024-01-01' AND order_date < '2025-01-01' GROUP BY ay ORDER BY ay;",
  t069:"SELECT DATEDIFF(MIN(o.order_date), c.signup_date) AS gun FROM customers c JOIN orders o ON o.customer_id = c.customer_id WHERE c.customer_id = 1 GROUP BY c.signup_date;",
  t070:"SELECT COUNT(*) AS adet FROM orders WHERE DAYOFWEEK(order_date) IN (1, 7);",
  t071:"SELECT COUNT(*) AS adet FROM orders WHERE order_date >= DATE_SUB('2024-12-31', INTERVAL 29 DAY);",
  t059:"SELECT CONCAT(first_name, ' ', last_name) AS ad_soyad FROM customers ORDER BY customer_id LIMIT 5;",
 }
};
(async()=>{
 const {browser,page,errs}=await open();
 await go(page,'');
 for(const D of Object.keys(Q)){
  await page.selectOption('aside select',D); await page.waitForTimeout(200);
  for(const [id,sql] of Object.entries(Q[D])){
   await page.evaluate(id=>location.hash='pratik-'+id,id); await page.waitForSelector('#sqlEditor');
   const cur=await page.$eval('#exD',e=>e.value); if(cur!==D) console.log('!! exD not default',cur);
   await page.fill('#sqlEditor',sql); await page.click('[data-act=submit]');
   let fb='';
   for(let k=0;k<50;k++){ await page.waitForTimeout(100); fb=await page.evaluate(()=>[...document.querySelector('.work').children].filter(d=>!/ed-shell|ed-actions|result/.test(d.className)).map(d=>d.innerText).join('|').replace(/\n/g,' ').slice(0,260)); if(/Doğru|Henüz|hata|Hata/.test(fb)) break; }
   console.log(D,id, /^\|?\s*Doğru/.test(fb.trim())?'OK':'FAIL :: '+fb);
  }
 }
 console.log(errs); await browser.close();
})();
