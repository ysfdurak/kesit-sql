const {open,go,txt}=require('./lib');
const fs=require('fs');
(async()=>{
 const A=await open();
 let page=A.page;
 await go(page,'ders-ilk-sorgu'); await page.click('.pager [data-step="1"]'); await page.click('[data-act=submit]'); await page.waitForTimeout(400);
 await page.evaluate(()=>location.hash='profile'); await page.waitForTimeout(400);
 const [dl]=await Promise.all([page.waitForEvent('download',{timeout:8000}).catch(e=>null), page.click('[data-act=exp]')]);
 let content='';
 if(dl){ const p=__dirname+'/backup_'+dl.suggestedFilename(); await dl.saveAs(p); content=fs.readFileSync(p,'utf8'); console.log('downloaded',dl.suggestedFilename(), content.length, content.slice(0,200)); } else console.log('NO DOWNLOAD');
 console.log('toast:', await page.evaluate(()=>[...document.querySelectorAll('.toast')].map(t=>t.innerText).join('|')));
 console.log(A.errs); await A.browser.close();
 // new clean context: paste
 const B=await open(); page=B.page;
 await go(page,'profile'); await page.waitForTimeout(400);
 console.log('fresh XP:', (await txt(page,'#sideStats')).split('\n')[0]);
 await page.click('[data-act=imp-show]'); await page.waitForTimeout(300);
 await page.shot('d_profile_paste');
 const ta=await page.$('main textarea'); console.log('textarea?',!!ta, ta? await ta.getAttribute('aria-label'):'' , ta? await ta.getAttribute('placeholder'):'');
 // invalid first
 await ta.fill('bu geçersiz bir metin'); 
 console.log(await page.evaluate(()=>[...document.querySelectorAll('main button')].filter(b=>b.offsetParent).map(b=>b.innerText+'['+(b.dataset.act||'')+']').slice(-6).join(' ; ')));
 const imp=await page.$('[data-act=imp-do]'); 
 if(imp){ await imp.click(); await page.waitForTimeout(400); console.log('invalid ->', await page.evaluate(()=>[...document.querySelectorAll('.toast')].map(t=>t.innerText).join('|')), (await txt(page,'main')).slice(-300).replace(/\n/g,' / ')); }
 await ta.fill(content); await imp.click(); await page.waitForTimeout(600);
 console.log('valid ->', await page.evaluate(()=>[...document.querySelectorAll('.toast')].map(t=>t.innerText).join('|')));
 console.log('XP after import:', (await txt(page,'#sideStats')).replace(/\n/g,' '));
 // also file import
 const [fc]=await Promise.all([page.waitForEvent('filechooser',{timeout:5000}).catch(()=>null), page.click('[data-act=imp-file]')]);
 console.log('filechooser:', !!fc);
 if(fc){ await fc.setFiles(fs.readdirSync(__dirname).filter(f=>f.startsWith('backup_')).map(f=>__dirname+'/'+f)[0]); await page.waitForTimeout(600); console.log('file import toast:', await page.evaluate(()=>[...document.querySelectorAll('.toast')].map(t=>t.innerText).join('|')), (await txt(page,'#sideStats')).split('\n')[0]); }
 // reset
 await page.click('[data-act=reset-ask]'); await page.waitForTimeout(300);
 console.log('reset ask:', await page.evaluate(()=>[...document.querySelectorAll('main button')].filter(b=>b.offsetParent).map(b=>b.innerText+'['+(b.dataset.act||'')+']').slice(-4).join(' ; ')));
 console.log(B.errs); await B.browser.close();
})();
