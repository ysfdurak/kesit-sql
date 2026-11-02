const {open,go,txt}=require('./lib');
(async()=>{
 const {browser,page,errs}=await open();
 await go(page,'hakkinda'); await page.waitForTimeout(400);
 console.log('HAKKINDA:', (await txt(page,'main')).slice(0,2500));
 for(const h of ['','pratik','play','data','oyun-bulmaca','ders-ilk-sorgu','sinav','profile','oyun-ch-stok-alarmi']){
  await page.evaluate(h=>location.hash=h,h); await page.waitForTimeout(500);
  const r=await page.evaluate(()=>{const sel='[data-go],[data-lesson],[data-step],[data-act],[data-mc],[data-tq],[data-lvf],[data-hist],[data-btab],[data-ctab],[data-setd],[data-prev],[data-dtable],[data-tr],[data-goal],[data-theme-set],[data-rv],[data-dset],[data-pr],[data-prl],[data-prs],[data-prd],[data-exam],[data-exq],[data-exa],[data-ar]';
   const nf=[...document.querySelectorAll(sel)].filter(e=>e.offsetParent && !['BUTTON','A','INPUT','SELECT','TEXTAREA'].includes(e.tagName) && e.tabIndex<0).map(e=>e.tagName+'.'+e.className+':'+e.innerText.slice(0,20));
   const unl=[...document.querySelectorAll('input,select,textarea')].filter(e=>e.offsetParent && !e.getAttribute('aria-label') && !(e.id && document.querySelector('label[for="'+e.id+'"]')) && !e.closest('label')).map(e=>e.tagName+'#'+e.id+' ph='+e.placeholder);
   const emptyBtn=[...document.querySelectorAll('button')].filter(b=>b.offsetParent && !b.innerText.trim() && !b.getAttribute('aria-label') && !b.title).map(b=>b.className);
   return {nf:nf.slice(0,5), nnf:nf.length, unl, emptyBtn:emptyBtn.slice(0,5)};});
  console.log(h||'home', JSON.stringify(r));
 }
 // focus visibility test
 await page.evaluate(()=>location.hash=''); await page.waitForTimeout(400);
 for(let i=0;i<4;i++) await page.keyboard.press('Tab');
 console.log('focused:', await page.evaluate(()=>{const e=document.activeElement; const s=getComputedStyle(e); return e.tagName+':'+e.innerText.slice(0,20)+' outline='+s.outlineStyle+' '+s.outlineWidth+' shadow='+s.boxShadow;}));
 await page.shot('d_focus');
 console.log(errs); await browser.close();
})();
