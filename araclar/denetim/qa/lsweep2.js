const {open,go}=require('./lib');
const fs=require('fs');
const D=process.argv[2]||'pg';
(async()=>{
 const {browser,page,errs}=await open();
 await go(page,'');
 await page.selectOption('aside select',D); await page.waitForTimeout(300);
 let L=await page.evaluate(()=>window.SQLP_LESSONS.map(l=>l.id)); const START=process.argv[3]; if(START) L=L.slice(L.indexOf(START));
 const out=[]; const stat={ok:0,bad:0,skip:0};
 for(const id of L){
  await page.evaluate(id=>location.hash='ders-'+id,id); await page.waitForTimeout(150);
  const steps=await page.$$eval('.steps button',b=>b.length);
  for(let s=1;s<steps;s++){
   await page.click(`.steps button[data-step="${s}"]`).catch(()=>{}); await page.waitForTimeout(120);
   const hasEd=await page.$('#sqlEditor');
   if(!hasEd){ // maybe MC
     const mc=await page.$$('[data-mc]'); stat.skip++; continue; }
   const cur=await page.$eval('#exD',e=>e.value).catch(()=>'?');
   if(cur!==D){ const has=await page.$eval('#exD',(e,D)=>[...e.options].map(o=>o.value).includes(D),D).catch(()=>false); if(!has){stat.skip++; continue;} await page.selectOption('#exD',D); }
   await page.click('[data-act=sol]').catch(()=>{}); await page.waitForTimeout(60);
   const cp=await page.$('#solBox >> text=Editöre kopyala'); if(!cp){ out.push(id+'#'+s+' NO SOLUTION COPY'); stat.bad++; continue; }
   await cp.click(); await page.waitForTimeout(50);
   fs.appendFileSync('lprog_'+D+'.txt', id+'#'+s+'\n'); const t0=Date.now(); await page.click('[data-act=submit]',{timeout:20000}).catch(e=>{out.push(id+'#'+s+' CLICK TIMEOUT (page frozen?)'); console.log(id+'#'+s+' CLICK TIMEOUT');});
   let fb='';
   for(let k=0;k<60;k++){ await page.waitForTimeout(100); fb=await page.evaluate(()=>{const w=document.querySelector('.work'); if(!w) return ''; return [...w.children].filter(d=>!/ed-shell|ed-actions|result/.test(d.className)).map(d=>d.innerText).join('|').replace(/\n/g,' ').slice(0,300);}); if(/Doğru|Henüz|hata|Hata/.test(fb)) break; }
   if(Date.now()-t0>8000) console.log(id+'#'+s+' SLOW '+(Date.now()-t0)+'ms');
   if(/^\|?\s*Doğru/.test(fb.trim())) stat.ok++; else { stat.bad++; const sol=await page.evaluate(()=>document.querySelector('#solBox pre')?.innerText||''); out.push(id+'#'+s+' :: '+fb+'\n   SOL: '+sol.replace(/\n/g,' ').slice(0,400)); console.log(id+'#'+s, fb.slice(0,160)); }
  }
 }
 fs.writeFileSync('lsweep_'+D+'.txt', JSON.stringify(stat)+'\n'+out.join('\n')+'\nERRS:\n'+errs.join('\n'));
 console.log('DONE',D,stat,'errs',errs.length);
 await browser.close();
})();
