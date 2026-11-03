// Sorgu Optimizasyonu ve yeni proje alıştırmalarının denetimi:
// 1) Örnek çözüm her izin verilen SQL türünde sonuç, yöntem ve plan kuralını geçer.
// 2) "ynl" alanındaki her yanlış cevap reddedilir (sonuç farkı, yöntem kuralı ya da plan kuralıyla). Sebep "hata" ise cevap hiç çalışmamıştır; kasıtlı değilse yazım yanlışıdır.
// 3) SQLP_OPT_SAYI içindeki her sayı veritabanından yeniden hesaplanır.
// Kapsam: ynl ya da plan alanı olan bütün ders, pratik ve Arena görevleri; opt-, -proje dersleri için yanlış cevabı olmayan SQL görevi listelenir.
// Çalıştırma: node opt_denetim.js   Beklenen: GECEN_YANLIS 0, COZUM_RED 0, SAYI_FARK 0, YANLISSIZ 0
const c=require('./load.js'); const fs=require('fs'); const initSqlJs=require('sql.js/dist/sql-asm.js');
require('vm').runInContext(fs.readFileSync(require('./yol.js').ROOT+'arena-data.js','utf8'),c);
const DX=c.SQLP_DIALECT, DIDS=DX.DIALECTS.map(d=>d.id);
{ const dc=[],tc=[],all=[],dt=[]; for(const t of Object.keys(c.SQLP_COLMETA)) for(const [col,ty] of c.SQLP_COLMETA[t]){ all.push(col); if(/date/.test(ty)) dc.push(col); if(ty==='datetime') dt.push(col); if(/^text/.test(ty)) tc.push(col);} DX.setSchemaHints(dc,tc,all,dt); }
const FL=process.env.FILTER?new RegExp(process.env.FILTER):null;
const norm=v=>{ if(v===null||v===undefined) return '∅'; if(typeof v==='number') return String(Math.round(v*100)/100); if(typeof v==='string'){ const t=v.trim(); if(t!==''&&/^-?\d+(\.\d+)?$/.test(t)) return String(Math.round(+t*100)/100); return v;} return String(v); };
function esit(u,s,ord){ if(!s) return true; if(!u) return false; if(u.columns.length!==s.columns.length||u.values.length!==s.values.length) return false; const A=u.values.map(r=>r.map(norm).join('␟')),B=s.values.map(r=>r.map(norm).join('␟')); if(ord&&A.every((x,i)=>x===B[i])) return true; return [...A].sort().join('\n')===[...B].sort().join('\n'); }
initSqlJs().then(SQL=>{
  const BASE=require('./base.js')(SQL,c);
  const fresh=()=>{ const db=new SQL.Database(BASE); c.SQLP_REGISTER(db); DX.register(db); return db; };
  const env=()=>({env:{procs:{},funcs:{},tvfs:{},tran:0,nocount:false}});
  const degerlendir=(e,code,d,beklenen)=>{ const db=fresh(); let r; const t0=Date.now(); try{ r=DX.runDialect(db,code,d,env()); if(Date.now()-t0>6000) console.log('YAVAS',Date.now()-t0,'ms',d,String(code).slice(0,90)); }catch(er){ db.close(); return {sebep:'hata',ayrinti:er.message}; } if(r.error){ db.close(); return {sebep:'hata',ayrinti:r.error}; }
    let u=r.sets&&r.sets.length?r.sets[r.sets.length-1]:null; if(e.check){ try{ u=db.exec(e.check).pop()||null; }catch(er){ u=null; } }
    const pf=e.plan?DX.planFail(e,db,r):null; db.close();
    if(!esit(u,beklenen,e.ord)) return {sebep:'sonuc'}; const mf=DX.mustFail(e,code,d); if(mf) return {sebep:'yontem',ayrinti:mf}; if(pf) return {sebep:'plan',ayrinti:pf.plan}; return {sebep:null}; };
  const items=[]; c.SQLP_LESSONS.forEach(l=>(l.ex||[]).forEach((e,i)=>{ if(e.t!=='mc') items.push({id:l.id+'#'+(i+1),e}); }));
  c.SQLP_PRACTICE.forEach(p=>items.push({id:'P:'+p.id,e:p})); (c.SQLP_ARENA?c.SQLP_ARENA.ch:[]).forEach(a=>items.push({id:'A:'+a.id,e:a}));
  let cozum=0,yanlis=0,gecen=0,red=0,hata=0; const sebepler={}; const yeni=/^(opt-|mk-opt|bv-proje|ai-proje)/;
  const yanlissiz=[];
  for(const {id,e} of items){ if(FL&&!FL.test(id)) continue; if(process.env.PROG) console.error('>',id); if(!e.ynl&&!e.plan){ if(yeni.test(id)) yanlissiz.push(id); continue; }
    const b=e.base||'sqlite'; const allow=process.env.TEK?[b]:(e.dl||(b==='sqlite'?DIDS:[b])); const db=fresh(); const r=DX.runDialect(db,e.sol,b,env()); let S=r.sets&&r.sets.length?r.sets[r.sets.length-1]:null; if(e.check&&!r.error){ try{ S=db.exec(e.check).pop()||null; }catch(er){ S=null; console.log('CHECK HATA',id,er.message); red++; } } db.close();
    if(r.error){ console.log('COZUM HATA',id,r.error); red++; continue; }
    for(const d of allow){ const t=d===b?e.sol:(e.solv&&e.solv[d])||(b==='sqlite'?DX.forward(e.sol,d):null); if(t===null) continue; const v=degerlendir(e,t,d,S); cozum++; if(v.sebep){ red++; console.log('COZUM RED',id,d,v.sebep,v.ayrinti||'',String(t).slice(0,160)); } }
    for(const w of e.ynl||[]){ let v=degerlendir(e,w,b,S); yanlis++;
      if(!v.sebep&&e.tests&&e.tests.length){ for(const t of e.tests){ const d1=fresh(); try{ d1.exec(t.sql); }catch(er){} const rs=DX.runDialect(d1,e.sol,b,env()); const su=rs.sets&&rs.sets.length?rs.sets[rs.sets.length-1]:null; d1.close(); const d2=fresh(); try{ d2.exec(t.sql); }catch(er){} const ru=DX.runDialect(d2,w,b,env()); const uu=ru.sets&&ru.sets.length?ru.sets[ru.sets.length-1]:null; d2.close(); if(ru.error||!esit(uu,su,e.ord)){ v={sebep:'gizliTest'}; break; } } }
      if(!v.sebep){ gecen++; console.log('GECEN YANLIS',id,w.slice(0,200)); } else { sebepler[v.sebep]=(sebepler[v.sebep]||0)+1; if(v.sebep==='hata'){ hata++; console.log('hata ile red',id,String(v.ayrinti).slice(0,110),'|',w.slice(0,110)); } } }
  }
  let fark=0; const SAY=c.SQLP_OPT_SAYI||[]; for(const s of SAY){ const db=fresh(); let got; try{ got=db.exec(s.sql)[0].values[0][0]; }catch(er){ got='HATA '+er.message; } db.close(); const a=norm(got),b=norm(s.deger); if(a!==b){ fark++; console.log('SAYI FARK',s.ad,'metin',b,'veri',a); } }
  if(!FL&&yanlissiz.length) console.log('Yanlış cevabı olmayan:',yanlissiz.join(' '));
  console.log('cozum',cozum,'COZUM_RED',red,'yanlis',yanlis,'GECEN_YANLIS',gecen,'sebep',JSON.stringify(sebepler),'sayi',SAY.length,'SAYI_FARK',fark,'YANLISSIZ',FL?'-':yanlissiz.length);
  process.exit(gecen||red||fark?1:0);
});
