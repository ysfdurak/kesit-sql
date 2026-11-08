// Sabit cevap taraması: her görev için beklenen sonucu SELECT sabitler FROM <görev tablosu> ... ile yazar, geçerse listeler.
// Kapsam: FILTER (düzenli ifade) ya da bütün SQL görevleri. Beklenen: SABIT_GECEN yalnız gerekçesi bilinenler (sonuç veriden bağımsız, varyantta değişmeyen).
const fs=require('fs'); const src=fs.readFileSync(__dirname+'/opt_denetim.js','utf8').split('\n');
eval(src.find(l=>l.startsWith('const norm=')).replace('const norm=','var norm=')+'\n'+src.find(l=>l.startsWith('function esit(')).replace('function esit(','var esit=function('));
const c=require('./load.js'); const DX=c.SQLP_DIALECT; const FL=process.env.FILTER?new RegExp(process.env.FILTER):null;
require('sql.js/dist/sql-asm.js')().then(SQL=>{ const BASE=require('./base.js')(SQL,c); const fresh=()=>{const db=new SQL.Database(BASE); c.SQLP_REGISTER(db); DX.register(db); return db;}; const env=()=>({env:{procs:{},funcs:{},tvfs:{},tran:0,nocount:false}});
 const items=[]; c.SQLP_LESSONS.forEach(l=>(l.ex||[]).forEach((e,i)=>{ if(e.t!=='mc'&&e.t!=='plan-cikti') items.push({id:l.id+'#'+(i+1),e}); })); c.SQLP_PRACTICE.forEach(p=>items.push({id:'P:'+p.id,e:p}));
 const lit=v=>v===null?'NULL':typeof v==='number'?String(v):"'"+String(v).replace(/'/g,"''")+"'"; let n=0,gec=[],varyantsiz=[];
 for(const {id,e} of items){ if(FL&&!FL.test(id)) continue; if(e.check||!e.sol) continue; const b=e.base||'sqlite'; const db=fresh(); const r=DX.runDialect(db,e.sol,b,env()); const S=r.sets&&r.sets.length?r.sets[r.sets.length-1]:null; const T=db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")[0].values.map(x=>x[0]); db.close(); if(r.error||!S||!S.values.length||S.values.length>300) continue; const m=T.filter(t=>new RegExp('\\b'+t+'\\b','i').test(e.sol.replace(/\bsys\s*\.\s*/gi,'sys_').replace(/\bmsdb\s*\.\s*dbo\s*\.\s*/gi,'msdb_'))); if(!m.length) continue; n++;
  const ad=/^(sys|msdb)_/.test(m[0])?m[0].replace(/^sys_/,'sys.').replace(/^msdb_/,'msdb.dbo.'):m[0];
  const kod=S.values.map(x=>'SELECT '+x.map((v,i)=>lit(v)+' AS "'+String(S.columns[i]).replace(/"/g,'')+'"').join(', ')+' FROM (SELECT TOP (1) 1 AS x FROM '+ad+') q').join(' UNION ALL ')+';';
  const kod2=b==='tsql'?kod:kod.replace(/TOP \(1\) /g,'').replace(/\) q/g,' LIMIT 1) q');
  const db2=fresh(); const r2=DX.runDialect(db2,kod2,b,env()); db2.close(); if(r2.error) continue; const u=r2.sets&&r2.sets[r2.sets.length-1]; if(!esit(u,S,false)) continue; if(DX.mustFail(e,kod2,b)) continue; if(DX.varyantFail(e,kod2,b,{fresh,run:(x,q,dd)=>DX.runDialect(x,q,dd,env()),esit,beklenen:S})) continue; gec.push(id); }
 console.log('sinanan',n,'SABIT_GECEN',gec.length,gec.join(' ')); process.exit(gec.length ? 1 : 0); });
