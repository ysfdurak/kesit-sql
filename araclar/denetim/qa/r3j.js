const {open,go,txt}=require('./lib');
const ars=async page=>page.$$eval('main [data-ar]',b=>b.filter(x=>x.offsetParent).map(x=>x.dataset.ar+'|'+(x.dataset.id||x.dataset.i||x.dataset.v||'')+':'+x.innerText.slice(0,40).replace(/\n/g,' ')).join(' ; '));
(async()=>{
 const {browser,page,errs}=await open();
 for(const m of ['tahmin','bulmaca','turnuva']){
  await go(page,'play'); await page.waitForTimeout(300);
  await page.click(`[data-ar=mode][data-id=${m}]`); await page.waitForTimeout(600);
  console.log('=====',m,page.url()); console.log((await txt(page,'main')).slice(0,1500)); console.log('ARS:',await ars(page));
  await page.shot('d_play_'+m);
 }
 console.log(errs); await browser.close();
})();
