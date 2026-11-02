const {open,go,txt}=require('./lib');
const fs=require('fs');
// usage: node det.js "<sql1>;;<sql2>" answers(comma)  -- uses persistent storage state file
(async()=>{
 const {browser,page,errs}=await open();
 await go(page,'oyun-dedektif-kayip-kargo'); await page.waitForTimeout(600);
 const answers=(process.argv[3]||'').split('|').filter(Boolean);
 for(let i=0;i<answers.length;i++){
   const inp=await page.$$('main input'); 
   const vis=[]; for(const x of inp){ if(await x.isVisible() && await x.isEnabled()) vis.push(x);} 
   await vis[vis.length-1].fill(answers[i]);
   const btns=await page.$$('[data-ar=det-check]'); await btns[btns.length-1].click(); await page.waitForTimeout(500);
   console.log('after answer',answers[i],':', (await txt(page,'main')).split('VAKA TABLOLARI')[0].slice(-700).replace(/\n/g,' / '));
 }
 for(const q of (process.argv[2]||'').split(';;').filter(Boolean)){
   await page.fill('#sqlEditor',q); await page.click('[data-ar=det-run]'); await page.waitForTimeout(800);
   const t=await txt(page,'main'); const k=t.lastIndexOf('Çalıştır\n'); console.log('Q:',q,'\n',t.slice(k+9,k+1500));
 }
 await page.shot('d_det_state');
 console.log(errs); await browser.close();
})();
