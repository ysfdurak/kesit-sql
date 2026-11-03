const c=require('./load.js'); const fs=require('fs');
const initSqlJs=require('sql.js/dist/sql-asm.js');
const DX=c.SQLP_DIALECT, DIDS=DX.DIALECTS.map(d=>d.id);
(function hints(){ const dc=[], tc=[], all=[], dt=[]; for(const t of Object.keys(c.SQLP_COLMETA)) for(const [col,ty] of c.SQLP_COLMETA[t]){ all.push(col); if(/date/.test(ty)) dc.push(col); if(ty==='datetime') dt.push(col); if(/^text/.test(ty)) tc.push(col);} DX.setSchemaHints(dc,tc,all,dt); })();
const exBase=e=>e.base||'sqlite';
const exAllowed=e=>e.dl||(exBase(e)==='sqlite'?DIDS:[exBase(e)]);
function exText(src,e,d,v){ if(!src) return ''; if(v&&v[d]) return v[d]; const b=exBase(e); if(b===d) return src; if(b==='sqlite') return DX.forward(src,d); return null; }
function norm(v){ if(v===null||v===undefined) return '∅'; if(typeof v==='number') return String(Math.round(v*100)/100); if(typeof v==='string'){ const t=v.trim(); if(t!==''&&/^-?\d+(\.\d+)?$/.test(t)) return String(Math.round(+t*100)/100); return v;} return String(v); }
function same(u,s,ord){ if(!u&&!s) return true; if(!u||!s) return false; if(u.columns.length!==s.columns.length||u.values.length!==s.values.length) return false; const A=u.values.map(r=>r.map(norm).join('␟')),B=s.values.map(r=>r.map(norm).join('␟')); if(ord) return A.every((x,i)=>x===B[i]) || [...A].sort().join('\n')===[...B].sort().join('\n'); return [...A].sort().join('\n')===[...B].sort().join('\n'); }
// Arayüzle aynı yöntem kuralı: tek kaynak dialect.js
const mustFail=DX.mustFail;
initSqlJs().then(SQL=>{
  const BASE=require("./base.js")(SQL,c);
  const fresh=()=>{ const db=new SQL.Database(BASE); c.SQLP_REGISTER(db); DX.register(db); return db; };
  let SH=null; const RO=(c,e)=>!e.check&&/^\s*(--[^\n]*\n\s*)*(WITH|SELECT)\b/i.test(c)&&!/\b(INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|INTO)\b/i.test(c);
  const runOne=(code,d,e)=>{ const ro=RO(code,e); if(ro&&!SH) SH=fresh(); const db=ro?SH:fresh(); let r; try{ r=DX.runDialect(db,code,d,{env:{procs:{},funcs:{},tvfs:{},tran:0,nocount:false}}); }catch(er){ r={error:'THROW '+er.message}; } let set=r&&r.sets&&r.sets.length?r.sets[r.sets.length-1]:null; if(!r.error&&e.check){ try{ set=db.exec(e.check).pop()||null; }catch(er){ r.error='CHECK '+er.message; } } let pf=null; if(!r.error&&e.plan){ const dbp=ro?fresh():db; if(ro) try{ DX.runDialect(dbp,code,d,{env:{procs:{},funcs:{},tvfs:{},tran:0,nocount:false}}); }catch(er){} pf=DX.planFail(e,dbp,r); if(ro) dbp.close(); } if(!ro) db.close(); if(pf) out.push({id:e.__id,kind:'planKurali',d,err:pf.msg,plan:pf.plan}); return {error:r.error,set}; };
  const items=[];
  const FL=process.env.FILTER?new RegExp(process.env.FILTER):null; const SF=process.env.SOLF?new RegExp(process.env.SOLF):null; const ok=(id,e)=>(!FL||FL.test(id))&&(!SF||SF.test(e.sol||''));
  c.SQLP_LESSONS.forEach(l=>(l.ex||[]).forEach((e,i)=>{ if(!ok(l.id,e)) return; if(e.t!=='mc') items.push({src:'ders',id:l.id+'#'+(i+1),lv:l.lv,e}); }));
  c.SQLP_PRACTICE.forEach(p=>!ok(p.id,p)||items.push({src:'pratik',id:p.id,lv:p.L,e:p}));
  const out=[]; let n=0;
  // sw.js'teki veritabanı dosyası adı gerçekten olmalı (ilk ziyarette önbelleğe alınır)
  { const R=require('./yol.js').ROOT+'', m=fs.readFileSync(R+'sw.js','utf8').match(/const BASE = '([^']+)'/); if(!m||!fs.existsSync(R+m[1])) out.push({id:'sw.js',src:'site',kind:'swTabanYok',err:m&&m[1]}); }
  for(const it of items){ const e=it.e; e.__id=it.id; const T0=Date.now(); process.on('exit',()=>{}); if(process.env.PROG) process.stderr.write('> '+it.id+'\n'); if(!e.sol){ out.push({...it,kind:'cozumYok'}); continue; }
    const b=exBase(e); const ref=runOne(e.sol,b,e); n++; { const mf=mustFail(e,e.sol,b); if(mf) out.push({id:it.id,src:it.src,kind:'yontemKurali',d:b,err:mf}); }
    if(ref.error){ out.push({id:it.id,src:it.src,kind:'cozumHata',d:b,err:ref.error}); continue; }
    // check'li görevde çözüm tablonun durumunu değiştirmiyorsa ve yöntem kuralı yoksa her cevap "Doğru" sayılır
    if(e.check && !(e.must&&e.must.length)){ const db0=fresh(); let once=null,hata=false; try{ once=db0.exec(e.check).pop()||null; }catch(er){ hata=true; } db0.close(); if(!hata&&same(once,ref.set,false)) out.push({id:it.id,src:it.src,kind:'checkDegismiyor',d:b}); }
    if(!ref.set && !e.check && !e.nr) out.push({id:it.id,src:it.src,kind:'sonucYok',d:b});
    else if(ref.set && ref.set.values.length===0) out.push({id:it.id,src:it.src,kind:'bosSonuc',d:b});
    if(e.ord && !/ORDER\s+BY/i.test(e.sol)) out.push({id:it.id,src:it.src,kind:'ordAmaOrderByYok'});
    if(!e.ord && /ORDER\s+BY/i.test(e.sol.replace(/OVER\s*\([^)]*\)/gi,'')) && ref.set && ref.set.values.length>1 && !/LIMIT|TOP|FETCH/i.test(e.sol)) out.push({id:it.id,src:it.src,kind:'orderByVarOrdYok'});
    for(const d of exAllowed(e)){ if(d===b) continue; const t=exText(e.sol,e,d,e.solv); if(t===null){ out.push({id:it.id,src:it.src,kind:'ceviriYok',d}); continue; } const r=runOne(t,d,e); n++;
      const mf=mustFail(e,t,d); if(mf) out.push({id:it.id,src:it.src,kind:'yontemKurali',d,err:mf,sql:t.slice(0,200)});
      if(r.error) out.push({id:it.id,src:it.src,kind:'lehceHata',d,err:String(r.error).slice(0,160),sql:t.slice(0,300)});
      else if(!same(r.set,ref.set,e.ord)) out.push({id:it.id,src:it.src,kind:'lehceFarkli',d,sql:t.slice(0,300)});
    } }
  if(process.env.PROG) console.error('items done'); fs.writeFileSync('sql_audit.json',JSON.stringify(out,null,1));
  const by={}; out.forEach(o=>{by[o.kind]=(by[o.kind]||0)+1}); console.log('calistirilan',n,'oge',items.length,by);
  const byd={}; out.filter(o=>/lehce/.test(o.kind)).forEach(o=>byd[o.d]=(byd[o.d]||0)+1); console.log(byd);
});
