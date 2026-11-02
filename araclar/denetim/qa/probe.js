const {open,go}=require('./lib');
(async()=>{
 const {browser,page,errs}=await open();
 await go(page,'');
 const r=await page.evaluate(()=>{const P=window.SQLP_PRACTICE; return {n:P.length, keys:Object.keys(P[0]), withHint:P.filter(p=>p.hint||p.h).length, sample:JSON.stringify(P[0]).slice(0,600)};});
 console.log(r);
 await browser.close();
})();
