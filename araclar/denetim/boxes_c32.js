const c=require('./load.js'); const fs=require('fs'); const DX=c.SQLP_DIALECT; const DIDS=DX.DIALECTS.map(d=>d.id);
const dec=s=>s.replace(/<[A-Za-z\/!][^>]*>/g,'').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&');
require('./one.js').then(q=>{
  const out=[]; let n=0, boxes=0;
  const FL=process.env.FILTER?new RegExp(process.env.FILTER):null;
  for(const l of c.SQLP_LESSONS){ if(FL&&!FL.test(l.id)) continue; const re=/<pre class="code"([^>]*)>([\s\S]*?)<\/pre>/g; let m;
    while((m=re.exec(l.body))){ const at=m[1]; if(/data-norun/.test(at)) continue; boxes++;
      const g=k=>{ const r=at.match(new RegExp(k+'="([^"]*)"')); return r?dec(r[1]):null; };
      const base=g('data-base')||'sqlite', v=g('data-v')?JSON.parse(g('data-v')):{}, na=(g('data-na')||'').split(' '), err=/data-err/.test(at), nr=(g('data-nr')||'').split(' ');
      const src=dec(m[2]).replace(/^\n+|\s+$/g,'');
      for(const d of DIDS){ if(na.includes(d)) continue; let t= d===base?src: v[d]? v[d] : base==='sqlite'? DX.forward(src,d): null; if(t===null) continue; if(nr.includes(d)) continue;
        let r; try{ r=q(t,d); }catch(e){ r={error:'THROW '+e.message}; } n++;
        if(r&&r.error&&!err) out.push({id:l.id,d,err:String(r.error).slice(0,140),sql:t.replace(/\s+/g,' ').slice(0,160)}); } } }
  fs.writeFileSync('boxes_c32.json',JSON.stringify(out,null,1));
  console.log('kutu',boxes,'calistirma',n,'hata',out.length); const by={}; out.forEach(o=>by[o.d]=(by[o.d]||0)+1); console.log(by);
  const byl={}; out.forEach(o=>byl[o.id]=(byl[o.id]||0)+1); console.log(Object.entries(byl).sort((a,b)=>b[1]-a[1]).slice(0,40).map(x=>x.join(':')).join(' '));
});
