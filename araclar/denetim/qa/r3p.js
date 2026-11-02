const {open,go,txt}=require('./lib');
(async()=>{
 const {browser,page,errs}=await open();
 await go(page,'data'); await page.waitForTimeout(500);
 console.log(await page.evaluate(()=>[...document.querySelectorAll('main button')].filter(b=>b.offsetParent).slice(0,30).map(b=>b.innerText.slice(0,25).replace(/\n/g,' ')+'['+Object.entries(b.dataset).map(([k,v])=>k+'='+v).join(',')+']').join(' ; ')));
 for(const s of ['Anadolu Market','Ilgaz Bank','Kanat Havayolları','Lezzet Kurye','Pusula İK','Pedal İzmir']){
   await page.click(`main button:text-is("${s}")`); await page.waitForTimeout(500);
   const t=await txt(page,'main');
   const h=t.split('\n').find(l=>/^Veri Seti:/.test(l));
   const cap=t.split('\n').filter(l=>/ · \d+ satır · \d+ sütun/.test(l));
   const tbls=await page.evaluate(()=>[...document.querySelectorAll('main [data-dtable]')].filter(b=>b.offsetParent).map(b=>b.dataset.dtable));
   console.log(s,'|',h,'|',cap.join(' || '),'| tables:',[...new Set(tbls)].join(','),'| sw',await page.ow());
   const last=[...new Set(tbls)].slice(-1)[0];
   if(last){ await page.click(`main [data-dtable="${last}"] >> nth=-1`); await page.waitForTimeout(400); const t2=await txt(page,'main'); console.log('  clicked',last,':', t2.split('\n').filter(l=>/ · \d+ satır · \d+ sütun|Veri, sayfa/.test(l)).join(' || ')); }
   await page.shot('d_data_'+s.split(' ')[0]);
 }
 // create table & paging
 const ct=await page.$('text=CREATE TABLE ifadesini göster'); if(ct){ await ct.click(); await page.waitForTimeout(300); const t=await txt(page,'main'); const i=t.indexOf('CREATE TABLE',t.indexOf('göster')+10); console.log('CT:', t.slice(i,i+300)); }
 const nx=await page.$('main button:has-text("Sonraki")'); if(nx){ await nx.click(); await page.waitForTimeout(300); console.log('page2:', (await txt(page,'main')).split('\n').filter(l=>/Veri, sayfa/.test(l)).join('')); }
 const pl=await page.$('text=Oyun alanında sorgula'); if(pl){ await pl.click(); await page.waitForTimeout(500); console.log('play:', page.url(), (await txt(page,'main')).slice(0,300).replace(/\n/g,' / ')); }
 console.log(errs); await browser.close();
})();
