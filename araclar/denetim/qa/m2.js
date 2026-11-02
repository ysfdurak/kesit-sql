const {open,go,txt,buttons}=require('./lib');
(async()=>{
 const {browser,page,errs}=await open({mobile:true});
 await go(page);
 const b=await page.evaluate(()=>{const e=[...document.querySelectorAll('button')].find(b=>/XP/.test(b.innerText)&&b.getBoundingClientRect().top<60); return e.outerHTML;}); console.log(b);
 await page.locator('header button, .mtop button, .topbar button').filter({hasText:'XP'}).first().click().catch(e=>console.log('noclick',e.message.slice(0,100)));
 await page.waitForTimeout(500); console.log(page.url());
 await page.shot('m_xpclick');
 console.log((await txt(page,'body')).slice(0,500));
 // Is sidebar hidden or drawer?
 console.log(await page.evaluate(()=>{const s=document.querySelector('#sideStats'); let e=s; while(e&&getComputedStyle(e).display!=='none') e=e.parentElement; return e? e.tagName+'.'+e.className : 'visible';}));
 await browser.close();
})();
