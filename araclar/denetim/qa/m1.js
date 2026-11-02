const {open,go,txt,buttons}=require('./lib');
(async()=>{
 const {browser,page,errs}=await open({mobile:true});
 await go(page);
 const vis=await page.evaluate(()=>{const out=[];for(const e of document.querySelectorAll('button,a,select,input')){const r=e.getBoundingClientRect(); if(r.width&&r.height&&r.top<120&&getComputedStyle(e).visibility!=='hidden') out.push(e.tagName+' '+(e.innerText||e.getAttribute('aria-label')||e.id||'').trim().slice(0,30)+' @'+Math.round(r.left)+','+Math.round(r.top)+' '+Math.round(r.width)+'x'+Math.round(r.height));} return out;});
 console.log(vis);
 const bottom=await page.evaluate(()=>{const out=[];for(const e of document.querySelectorAll('button,a')){const r=e.getBoundingClientRect(); if(r.width&&r.top>780) out.push((e.innerText||e.getAttribute('aria-label')||'').trim()+' '+e.outerHTML.slice(0,120));} return out;});
 console.log(bottom);
 // home page bottom
 await page.evaluate(()=>window.scrollTo(0,99999)); await page.waitForTimeout(300);
 await page.shot('m_home_bottom');
 console.log((await txt(page,'main')).slice(-600));
 await browser.close();
})();
