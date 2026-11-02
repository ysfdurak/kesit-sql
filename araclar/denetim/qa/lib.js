const { chromium } = require('playwright');
const fs=require('fs');
const SQLJS=fs.readFileSync(__dirname+'/../node_modules/sql.js/dist/sql-asm.js');
const DIR=__dirname+'/shots/';
async function open(opts={}){
  const browser=await chromium.launch();
  const ctx=await browser.newContext({viewport: opts.mobile?{width:390,height:844}:{width:1280,height:900}, colorScheme: opts.dark?'dark':'light', isMobile:!!opts.mobile, hasTouch:!!opts.mobile});
  const page=await ctx.newPage();
  const errs=[];
  page.on('pageerror',e=>errs.push('PAGEERROR '+e.message));
  page.on('console',m=>{ if(m.type()==='error'){ const t=m.text(); if(!/Failed to load resource/.test(t)) errs.push('CONSOLE '+t);} });
  await page.route('**/sql-asm.js', r=>r.fulfill({contentType:'text/javascript', body: SQLJS}));
  await page.route('**fonts.g**', r=>r.abort());
  page.errs=errs;
  page.shot=async(n)=>{await page.screenshot({path:DIR+n+'.png'});};
  page.shotFull=async(n)=>{await page.screenshot({path:DIR+n+'.png', fullPage:true});};
  page.ow=async()=>page.evaluate(()=>document.documentElement.scrollWidth);
  return {browser,ctx,page,errs};
}
async function go(page,hash=''){
  await page.goto('http://localhost:8811/index.html'+(hash?'#'+hash:''));
  await page.waitForSelector('#sideStats .engine .dot.ok',{timeout:30000, state:'attached'}).catch(()=>console.log('engine not ready?'));
}
async function txt(page,sel='body'){ return page.evaluate(s=>document.querySelector(s)?.innerText||'',sel); }
async function buttons(page){ return page.evaluate(()=>[...document.querySelectorAll('main button, main a, #app button, button')].filter(b=>b.offsetParent).map(b=>(b.innerText||b.getAttribute('aria-label')||'').trim().replace(/\s+/g,' ').slice(0,50))); }
module.exports={open,go,txt,buttons};
