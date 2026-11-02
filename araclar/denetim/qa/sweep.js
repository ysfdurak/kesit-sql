const {open,go}=require('./lib');
const fs=require('fs');
(async()=>{
 const {browser,page,errs}=await open();
 await go(page,'');
 const ids=await page.evaluate(()=>window.SQLP_PRACTICE.map(p=>p.id));
 const types=await page.evaluate(()=>{const c={};window.SQLP_PRACTICE.forEach(p=>c[p.type]=(c[p.type]||0)+1);return c;});
 console.log(types);
 const out=[];
 for(const id of ids){
   await page.evaluate(id=>location.hash='pratik-'+id,id);
   await page.waitForSelector('#sqlEditor',{timeout:5000}).catch(()=>{});
   const sol=await page.evaluate(id=>window.SQLP_PRACTICE.find(p=>p.id===id).sol,id);
   await page.fill('#sqlEditor',sol).catch(e=>out.push(id+' NOEDITOR'));
   await page.click('[data-act=submit]').catch(()=>{});
   let fb='';
   for(let k=0;k<40;k++){ await page.waitForTimeout(100); fb=await page.evaluate(()=>[...document.querySelectorAll('.work > div')].map(d=>d.innerText).filter(t=>/Doğru|Henüz|değil|Hata|hata/.test(t)).join('|').replace(/\n/g,' ').slice(0,250)); if(fb) break; }
   if(!/^Doğru/.test(fb)) { out.push(id+' :: '+fb); console.log(id,fb); }
 }
 fs.writeFileSync('sweep_out.txt', out.join('\n')+'\nERRS:\n'+errs.join('\n'));
 console.log('DONE fails',out.length, 'errs',errs.length);
 await browser.close();
})();
