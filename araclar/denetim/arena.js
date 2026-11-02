const c=require('./load.js'); const fs=require('fs');
global.window=global.window||{}; 
eval(fs.readFileSync(require('./yol.js').ROOT+'arena-data.js','utf8'));
const A=window.SQLP_ARENA; const DX=c.SQLP_DIALECT; const DIDS=DX.DIALECTS.map(d=>d.id);
const initSqlJs=require('sql.js/dist/sql-asm.js');
(function(){ const dc=[], tc=[], all=[], dt=[]; for(const t of Object.keys(c.SQLP_COLMETA)) for(const [col,ty] of c.SQLP_COLMETA[t]){ all.push(col); if(/date/.test(ty)) dc.push(col); if(ty==='datetime') dt.push(col); if(/^text/.test(ty)) tc.push(col);} DX.setSchemaHints(dc,tc,all,dt); })();
function norm(v){ if(v===null||v===undefined) return '∅'; if(typeof v==='number') return String(Math.round(v*100)/100); if(typeof v==='string'){ const t=v.trim(); if(t!==''&&/^-?\d+(\.\d+)?$/.test(t)) return String(Math.round(+t*100)/100); return v;} return String(v); }
const key=s=>s?s.values.map(r=>r.map(norm).join('␟')).sort().join('\n'):'NONE';
const keyo=s=>s?s.values.map(r=>r.map(norm).join('␟')).join('\n'):'NONE';
const ONLY=process.env.ONLY;
initSqlJs().then(SQL=>{
 const B=require("./base.js")(SQL,c);
 const fresh=()=>{ const db=new SQL.Database(B); c.SQLP_REGISTER(db); DX.register(db); return db; };
 const runD=(db,code,d)=>{ const r=DX.runDialect(db,code,d,{env:{procs:{},funcs:{},tvfs:{},tran:0,nocount:false}}); return r.error?{error:r.error}:{set:r.sets&&r.sets.length?r.sets[r.sets.length-1]:null}; };
 let prob=0;
 if(!ONLY||ONLY==='ch') for(const ch of A.ch.filter(x=>!process.env.SETS||process.env.SETS.split(',').includes(x.set))){
   const db=fresh(); const base=runD(db,ch.sol,'sqlite'); db.close();
   if(base.error){ console.log('CH ERR',ch.id,base.error); prob++; continue; }
   const n=base.set?base.set.values.length:0; let line=ch.id+' rows='+n+' | '+(base.set?base.set.values.slice(0,2).map(v=>v.join('/')).join(' ; '):'');
   if(!n){ console.log('CH EMPTY',ch.id); prob++; }
   ch.tests.forEach((t,i)=>{ const db=fresh(); try{ db.exec(t.sql); }catch(e){ console.log('TEST SQL ERR',ch.id,i,e.message); prob++; db.close(); return; } const r=runD(db,ch.sol,'sqlite');
     if(r.error){ console.log('TEST SOL ERR',ch.id,i,r.error); prob++; }
     else if(key(r.set)===key(base.set) && keyo(r.set)===keyo(base.set)){ console.log('test no effect (bilinçli olabilir)',ch.id,i,t.ad); }
     for(const d of DIDS){ if(d==='sqlite') continue; const tx=DX.forward(ch.sol,d); const db2=fresh(); db2.exec(t.sql); const r2=runD(db2,tx,d); db2.close(); if(r2.error){ console.log('DIAL ERR',ch.id,'t'+i,d,r2.error.slice(0,120)); prob++; } else if((ch.ord?keyo:key)(r2.set)!==(ch.ord?keyo:key)(r.set)){ console.log('DIAL DIFF',ch.id,'t'+i,d); prob++; } }
     db.close(); });
   for(const d of DIDS){ if(d==='sqlite') continue; const tx=DX.forward(ch.sol,d); const db2=fresh(); const r2=runD(db2,tx,d); db2.close(); if(r2.error){ console.log('DIAL ERR',ch.id,d,r2.error.slice(0,120)); prob++; } else if((ch.ord?keyo:key)(r2.set)!==(ch.ord?keyo:key)(base.set)){ console.log('DIAL DIFF',ch.id,d); prob++; } }
   console.log(line.slice(0,160));
 }
 if(!ONLY||ONLY==='pred') for(const p of A.pred.filter(x=>!process.env.IDS||new RegExp(process.env.IDS).test(x.id))){ for(const d of DIDS){ const vals=[p.sql,...p.traps].map(s=>{ const db=fresh(); const r=runD(db,d==='sqlite'?s:DX.forward(s,d),d); db.close(); return r.error?'ERR:'+r.error.slice(0,60):r.set&&r.set.values[0]?norm(r.set.values[0][0]):'∅'; }); const uniq=new Set(vals); if(vals.some(v=>/^ERR/.test(v))||uniq.size<3||vals.slice(1).includes(vals[0])){ console.log('PRED',p.id,d,vals.join(' | ')); prob++; } else if(d==='sqlite') console.log('pred',p.id,vals.join(' | ')); } }
 if(!ONLY||ONLY==='pz') for(const z of A.pz.filter(x=>!process.env.IDS||new RegExp(process.env.IDS).test(x.id))){ const db=fresh(); const r=runD(db,z.lines.join('\n'),'sqlite'); db.close(); if(r.error||!r.set||!r.set.values.length){ console.log('PZ',z.id,r.error||'empty'); prob++; } else console.log('pz',z.id,r.set.values.length); 
   for(const x of z.extra){ /* bir fazlalığı ekleyince sonuç aynı kalmamalı ya da hata vermeli */ } }
 if(!ONLY||ONLY==='det') for(const dc of A.det.filter(x=>!process.env.IDS||new RegExp(process.env.IDS).test(x.id))){ for(const d of DIDS){ const ans=dc.steps.map(st=>{ const db=fresh(); if(dc.seed) db.exec(dc.seed); const r=runD(db,d==='sqlite'?st.sol:DX.forward(st.sol,d),d); db.close(); if(r.error) return 'ERR:'+r.error.slice(0,80); if(!r.set||r.set.values.length!==1) return 'ROWS:'+(r.set?r.set.values.length:0)+':'+(r.set?r.set.values.map(v=>v[0]).join(','):''); return norm(r.set.values[0][0]); }); console.log('det',dc.id,d,ans.join(' | ')); } }
 console.log('PROBLEMS',prob);
});
