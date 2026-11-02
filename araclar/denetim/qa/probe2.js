const {open,go}=require('./lib');
(async()=>{
 const {browser,page}=await open();
 await go(page,'');
 const r=await page.evaluate(()=>window.SQLP_PRACTICE.filter(p=>['sir','tar','met'].includes(p.t)).map(p=>p.id+' | '+p.q.replace(/<[^>]+>/g,'')+' | '+p.sol).join('\n'));
 console.log(r);
 await browser.close();
})();
