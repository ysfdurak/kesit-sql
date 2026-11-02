const { chromium } = require('playwright');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1280,height:900}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://localhost:8765/index.html#hakkinda'); await p.waitForFunction(()=>document.querySelector('#sideStats .engine .dot.ok'),null,{timeout:180000}); await p.waitForTimeout(800);
 console.log('yapan:', (await p.innerText('.about-card')).replace(/\n/g,' | ').slice(0,200));
 console.log('bağlantılar:', JSON.stringify(await p.$$eval('.about-card a', x=>x.map(a=>a.textContent+' → '+a.href))));
 console.log('yorum alanı kapalı (kimlikler boş):', await p.evaluate(()=>!document.querySelector('#gsBox')));
 await p.screenshot({path:require('./yol.js').OUT+'/hakkinda-son.png'});
 console.log('errs', errs); await b.close(); })();
