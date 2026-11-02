const {open,go,txt}=require('./lib');
(async()=>{
 const {browser,page}=await open();
 await go(page,'curr'); await page.waitForTimeout(500);
 console.log(await page.evaluate(()=>Object.keys(window).filter(k=>/^SQLP|^KESIT/.test(k)).join(',')));
 const t=await txt(page,'main'); console.log(t.slice(0,600));
 const n=await page.evaluate(()=>[...document.querySelectorAll('main [data-lesson]')].length); console.log('lesson buttons',n);
 const sumEx=await page.evaluate(()=>[...document.querySelectorAll('main [data-lesson]')].map(b=>{const m=b.innerText.match(/(\d+) alıştırma/); return m?+m[1]:0}).reduce((a,b)=>a+b,0)); console.log('sum ex from list',sumEx);
 await browser.close();
})();
