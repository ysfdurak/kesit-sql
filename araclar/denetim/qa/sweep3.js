const {open,go}=require('./lib');
const fs=require('fs');
const D=process.argv[2]||'pg'; const ONLY=process.argv[3]?process.argv[3].split(','):null;
(async()=>{
 const {browser,page,errs}=await open();
 await go(page,'');
 // set default dialect via sidebar select
 const sel=await page.$('aside select'); if(sel){ await sel.selectOption(D); await page.waitForTimeout(300);} 
 let ids=await page.evaluate(()=>window.SQLP_PRACTICE.map(p=>p.id)); if(ONLY) ids=ONLY;
 const out=[]; const stat={ok:0,bad:0};
 for(const id of ids){
   await page.evaluate(id=>location.hash='pratik-'+id,id);
   await page.waitForSelector('#sqlEditor',{timeout:5000}).catch(()=>{});
   const cur=await page.$eval('#exD',e=>e.value).catch(()=>'?');
   if(cur!==D){ const has=await page.$eval('#exD',(e,D)=>[...e.options].map(o=>o.value).includes(D),D); if(!has){ const opts=await page.$eval('#exD',e=>[...e.options].map(o=>o.value).join(',')); out.push(id+' SKIP: dialect not offered; options='+opts); continue; } await page.selectOption('#exD',D);}
   await page.click('[data-act=sol]'); await page.waitForTimeout(80);
   const solTxt=await page.evaluate(()=>document.querySelector('#solBox pre')?.innerText||document.querySelector('#solBox').innerText);
   const cp=await page.$('#solBox >> text=Editöre kopyala'); if(cp) await cp.click(); else out.push(id+' NO COPY BTN');
   await page.waitForTimeout(80);
   await page.click('[data-act=submit]').catch(()=>{});
   let fb='';
   for(let k=0;k<60;k++){ await page.waitForTimeout(100); fb=await page.evaluate(()=>{const w=document.querySelector('.work'); const fbs=[...w.querySelectorAll('.fb,.feedback,[class*="fb-"],.ok,.bad')]; const t=[...w.children].filter(d=>!d.classList.contains('ed-shell')&&!d.classList.contains('ed-actions')&&!d.classList.contains('result')).map(d=>d.innerText).join('|'); return t.replace(/\n/g,' ').slice(0,300);}); if(/Doğru|Henüz|hata|Hata/.test(fb)) break; }
   if(/^\s*\|?\s*Doğru/.test(fb)||/^Doğru/.test(fb.trim())) stat.ok++; else { stat.bad++; out.push(id+' :: '+fb+'\n   SOL: '+solTxt.replace(/\n/g,' ').slice(0,400)); console.log(id, fb.slice(0,200)); }
 }
 fs.writeFileSync('sweepB_'+D+'.txt', out.join('\n')+'\nERRS:\n'+errs.join('\n'));
 console.log('DONE',D,stat,'errs',errs.length, errs.slice(0,5));
 await browser.close();
})();
