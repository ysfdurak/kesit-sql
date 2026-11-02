/* Metin doğrulayıcı. Yazarın HTML'i ham basılan alanlarda düz "<" &lt; olmalı ve ekranda ham etiket/varlık kalmamalı;
   kaçışlanarak (esc) basılan alanlarda etiket ve varlık olmamalı. Sonra gerçek sayfada ipucu, neden, SSS, sık hata DOM'u taranır.
   Çalıştırma: NODE_PATH=$(npm root -g) node <bu dosya>. Çıkış kodu 1 = sorun var. */
const http=require('http'), fs=require('fs'), path=require('path'); const {chromium}=require('playwright');
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.txt':'text/plain; charset=utf-8','.woff2':'font/woff2','.png':'image/png','.webmanifest':'application/json'};
const TAGS='code|b|i|em|strong|small|br|kbd|sub|sup|a|span|p|ul|ol|li|pre|div|h[1-6]|table|thead|tbody|tr|td|th|details|summary|u|mark|hr|svg|path|img|blockquote|label|input|button|section|dl|dt|dd';
async function main(CFG){
  const srv=http.createServer((q,r)=>{ let f=decodeURIComponent(q.url.split('?')[0]); if(f.endsWith('/')) f+='index.html'; fs.readFile(path.join(CFG.root,f),(e,b)=>{ if(e){ r.writeHead(404); r.end(); return; } r.writeHead(200,{'content-type':MIME[path.extname(f)]||'application/octet-stream'}); r.end(b); }); });
  await new Promise(a=>srv.listen(0,'127.0.0.1',a)); const U='http://127.0.0.1:'+srv.address().port+'/index.html';
  const b=await chromium.launch(); const c=await b.newContext({viewport:{width:1280,height:900},serviceWorkers:'block'}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto(U); await p.waitForTimeout(CFG.wait||4000);
  const res=await p.evaluate(({RAW,ESC,TAGS,SKIP})=>{
    const tag=new RegExp('</?('+TAGS+')\\b[^<>]*>','gi'), lit=/<\/?(code|b|i|em|strong|p|br|pre|span|div)\b[^<>]*>|&(lt|gt|amp|quot);/;
    const each=(o,parts,fn,ctx)=>{ if(o==null) return; if(!parts.length){ if(typeof o==='string') fn(o,ctx); return; } const [h,...t]=parts; if(h==='[]'){ if(Array.isArray(o)) o.forEach(x=>each(x,t,fn,(x&&typeof x==='object')?x:ctx)); return; } each(o[h],t,fn,(o&&typeof o==='object')?o:ctx); };
    const split=s=>s.replace(/\[\]/g,'.[].').split('.').filter(Boolean);
    const out=[], d=document.createElement('div'); let n=0;
    for(const spec of RAW){ const [pathS,cond]=spec.split('@'); const parts=split(pathS); each(window,parts,(s,ctx)=>{ if(cond&&ctx&&!new Function('e','return '+cond)(ctx)) return; n++; const rest=s.replace(tag,''); if(rest.includes('<')) out.push({f:pathS,k:'duz<',s}); d.innerHTML=s; d.querySelectorAll('code,pre').forEach(x=>x.remove()); const m=d.textContent.match(lit); if(m) out.push({f:pathS,k:'hamMetin',s,m:m[0]}); }); }
    for(const spec of ESC){ const [pathS,cond]=spec.split('@'); const parts=split(pathS); each(window,parts,(s,ctx)=>{ if(cond&&ctx&&!new Function('e','return '+cond)(ctx)) return; n++; tag.lastIndex=0; if(/<\/?(code|b|i|em|strong|br)\b[^<>]*>|&(lt|gt|amp|quot);/.test(s)) out.push({f:pathS,k:'escEtiket',s}); }); }
    return {n,out};
  },{RAW:CFG.RAW,ESC:CFG.ESC,TAGS});
  let dom=0, domBad=[];
  const BAD=/<\/?(code|b|strong|em|br)\b[^<>]*>|&(lt|gt|amp|quot);/;
  const scan=async(sel,where)=>{ const t=await p.evaluate(s=>[...document.querySelectorAll(s)].map(x=>{ const y=x.cloneNode(true); y.querySelectorAll('code,pre,.codebox').forEach(z=>z.remove()); return y.textContent; }).join('\n'),sel); dom++; const m=t.match(BAD); if(m) domBad.push({where,m:m[0],near:t.slice(Math.max(0,m.index-50),m.index+50)}); };
  if(CFG.dom) await CFG.dom(p,scan);
  await b.close(); srv.close();
  if(CFG.dump) fs.writeFileSync(CFG.dump,JSON.stringify(res.out,null,0));
  const by={}; res.out.forEach(o=>{ const k=o.f+' '+o.k; by[k]=(by[k]||0)+1; });
  console.log('alan metni',res.n,'sorun',res.out.length,JSON.stringify(by)); res.out.slice(0,process.env.GOSTER?+process.env.GOSTER:8).forEach(o=>console.log(' ',o.f,o.k,String(o.s).replace(/\n/g,' ').slice(0,110)));
  console.log('DOM tarama',dom,'sorun',domBad.length); domBad.slice(0,10).forEach(o=>console.log(' ',o.where,o.m,'…'+o.near.replace(/\n/g,' ')+'…')); if(errs.length) console.log('sayfa hatası',errs.slice(0,3));
  process.exit(res.out.length||domBad.length||errs.length?1:0);
}
module.exports=main;
