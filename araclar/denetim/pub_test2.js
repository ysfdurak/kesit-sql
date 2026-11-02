const { chromium } = require('playwright'); const fs=require('fs');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1280,height:900}}); const ext=[]; const errs=[];
 p.on('request',r=>{ const u=r.url(); if(!u.startsWith('http://localhost:8792')) ext.push(u); }); p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(m.type()==='error') errs.push('c:'+m.text()); });
 const t=Date.now(); await p.goto('http://localhost:8792/index.html'); await p.waitForFunction(()=>document.querySelector('#sideStats .engine .dot.ok'),null,{timeout:180000}); console.log('motor ms', Date.now()-t);
 await p.waitForTimeout(1500);
 console.log('lang', await p.evaluate(()=>document.documentElement.lang), '| yazı tipi yüklü', await p.evaluate(()=>document.fonts.check('800 20px "Bricolage Grotesque"') && [...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family+' '+f.weight).join(', ')));
 console.log('sw', await p.evaluate(async()=>{ const r=await navigator.serviceWorker.getRegistration(); return r?r.active?'aktif':'kayıtlı':'yok'; }));
 const m=await p.evaluate(async()=>{ const r=await fetch('manifest.webmanifest'); const j=await r.json(); const ok=await Promise.all(j.icons.map(i=>fetch(i.src).then(x=>x.ok))); return {name:j.name, icons:ok}; }); console.log('manifest', JSON.stringify(m));
 console.log('og', await p.evaluate(()=>[...document.querySelectorAll('meta[property^="og:"]')].length), '| favicon', await p.evaluate(()=>fetch('favicon.svg').then(r=>r.ok)));
 // çevrimdışı: yenile
 await p.reload(); await p.waitForFunction(()=>document.querySelector('#sideStats .engine .dot.ok'),null,{timeout:180000}); await p.waitForTimeout(2500); await p.context().setOffline(true); await p.reload().catch(e=>console.log('reload hata', e.message.slice(0,60))); await p.waitForTimeout(8000); console.log('çevrimdışı açılış:', await p.evaluate(()=>document.title), await p.evaluate(()=>document.querySelector('#sideStats .engine')?.innerText), 'small', await p.evaluate(()=>!!window.SQLP_SMALL));
 await p.context().setOffline(false);
 console.log('dış istekler', ext); console.log('errs', errs.filter(e=>!/net::ERR_INTERNET_DISCONNECTED|Failed to load/.test(e)));
 await b.close(); })();
