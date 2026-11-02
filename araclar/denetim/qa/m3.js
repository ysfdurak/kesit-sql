const {open,go,txt}=require('./lib');
(async()=>{
 const {browser,page,errs}=await open({mobile:true});
 await go(page);
 for(const h of ['','profile','play','pratik','curr','paths','hakkinda']){
   await page.evaluate(h=>location.hash=h,h); await page.waitForTimeout(400);
   const r=await page.evaluate(()=>{const vis=[...document.querySelectorAll('button,a')].filter(b=>b.offsetParent!==null||getComputedStyle(b).position==='fixed'); const go=new Set(vis.map(b=>b.dataset.go).filter(Boolean)); const th=vis.filter(b=>/^(Koyu|Açık|Otomatik|Tema)/.test(b.innerText.trim())).map(b=>b.innerText.trim()); return {go:[...go].join(','), theme:th.join(','), sw:document.documentElement.scrollWidth};});
   console.log(h||'home', JSON.stringify(r));
 }
 console.log(errs); await browser.close();
})();
