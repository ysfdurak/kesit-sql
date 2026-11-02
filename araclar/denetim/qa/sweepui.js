const {open,go,txt}=require('./lib');
const mode=process.argv[2]; // d-dark, m-light, m-dark
const mobile=mode.startsWith('m'), dark=mode.endsWith('dark');
const pages=['','paths','patika-temel','curr','ders-ilk-sorgu','ders-pencere-giris','pratik','pratik-t001','sinav','review','data','play','oyun-ch-stok-alarmi','oyun-dedektif-kayip-kargo','oyun-tahmin','oyun-bulmaca','oyun-turnuva','serbest','test','dict','profile','hakkinda'];
(async()=>{
 const {browser,page,errs}=await open({mobile,dark});
 await go(page,'');
 if(dark){ await page.evaluate(()=>{const b=document.querySelector('[data-theme-set=dark]'); b&&b.click();}); await page.waitForTimeout(200);} 
 for(const h of pages){
   await page.evaluate(h=>location.hash=h,h); await page.waitForTimeout(600);
   if(h==='ders-ilk-sorgu'){ await page.click('.pager [data-step="1"]').catch(()=>{}); await page.click('[data-act=submit]').catch(()=>{}); await page.waitForTimeout(500);} 
   if(h==='pratik-t001'){ await page.fill('#sqlEditor','SELECT x FROM nope').catch(()=>{}); await page.click('[data-act=submit]').catch(()=>{}); await page.waitForTimeout(500);} 
   const r=await page.evaluate((W)=>{
     const lum=c=>{const m=c.match(/[\d.]+/g); if(!m) return null; const [r,g,b]=m.slice(0,3).map(Number).map(v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)}); return {L:0.2126*r+0.7152*g+0.0722*b, a:m[3]===undefined?1:+m[3]};};
     const bgOf=e=>{while(e){const s=getComputedStyle(e); const c=s.backgroundColor; const l=lum(c); if(l&&l.a>0.5) return c; if(s.backgroundImage&&s.backgroundImage!=='none') return null; e=e.parentElement;} return getComputedStyle(document.body).backgroundColor;};
     const bad=[]; const seen=new Set();
     const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
     while(walker.nextNode()){const n=walker.currentNode; if(!n.textContent.trim()) continue; const e=n.parentElement; if(!e||seen.has(e)) continue; seen.add(e); const rc=e.getBoundingClientRect(); if(!rc.width||!rc.height) continue; const s=getComputedStyle(e); if(s.visibility==='hidden'||+s.opacity===0) continue; if(e.closest('[hidden]')) continue; const bg=bgOf(e); if(!bg) continue; const a=lum(s.color), b=lum(bg); if(!a||!b) continue; const cr=(Math.max(a.L,b.L)+0.05)/(Math.min(a.L,b.L)+0.05); if(cr<3 && a.a>0.5) bad.push(cr.toFixed(2)+' "'+n.textContent.trim().slice(0,30)+'" '+s.color+' on '+bg);}
     const over=[]; for(const e of document.querySelectorAll('body *')){const rc=e.getBoundingClientRect(); if(rc.right>W+1 && rc.width>0 && getComputedStyle(e).position!=='fixed'){ let p=e.parentElement, clipped=false; while(p){const o=getComputedStyle(p).overflowX; if(o==='auto'||o==='scroll'||o==='hidden'){clipped=true;break;} p=p.parentElement;} if(!clipped) over.push(e.tagName+'.'+e.className.toString().slice(0,20)+' r='+Math.round(rc.right));}}
     return {sw:document.documentElement.scrollWidth, bad:bad.slice(0,8), nbad:bad.length, over:over.slice(0,5)};
   }, mobile?390:1280);
   const W=mobile?390:1280;
   console.log(`[${h||'home'}] sw=${r.sw}${r.sw>W?' OVERFLOW':''} lowcontrast=${r.nbad}`, r.nbad? '\n   '+r.bad.join('\n   '):'', r.over.length? '\n   OVER: '+r.over.join(' | '):'');
   await page.shot(mode+'_'+(h||'home'));
 }
 console.log('ERRS',errs); await browser.close();
})();
