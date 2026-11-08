// Sabit sonuç, hesap görünümlü sabit, görev senaryoları ve geçerli çözümler.
const fs=require('fs'),c=require('./load.js'),DX=c.SQLP_DIALECT;
const norm=v=>v===null?'null':typeof v==='number'?String(Math.round(v*100)/100):String(v);
const same=(a,b,ord)=>{if(!a||!b)return a===b; if(a.columns.length!==b.columns.length||a.values.length!==b.values.length)return false;const A=a.values.map(r=>JSON.stringify(r.map(norm))),B=b.values.map(r=>JSON.stringify(r.map(norm)));return (ord?A.join('\n')===B.join('\n'):[...A].sort().join('\n')===[...B].sort().join('\n'));};
const lit=v=>v===null?'NULL':typeof v==='number'?String(v):"'"+String(v).replace(/'/g,"''")+"'";
const allItems=c.SQLP_SABIT_HEDEFLER.map(id=>{const [l,n]=id.split('#');return {id,e:id.startsWith('P:')?c.SQLP_PRACTICE.find(x=>x.id===id.slice(2)):c.SQLP_LESSONS.find(x=>x.id===l).ex[n-1]};});
const items=process.env.FILTER?allItems.filter(x=>new RegExp(process.env.FILTER).test(x.id)):allItems;
require('sql.js/dist/sql-asm.js')().then(SQL=>{
 const B=require('./base.js')(SQL,c);const fresh=()=>{const db=new SQL.Database(B);c.SQLP_REGISTER(db);DX.register(db);return db;};
 const run=(db,q,d)=>DX.runDialect(db,q,d,{env:{procs:{},funcs:{},tvfs:{},tran:0,nocount:false}});
 const exec=(q,d,e)=>{const db=fresh();try{const r=run(db,q,d);return {r,set:r.sets?.at(-1)||null,plan:DX.planFail(e,db,r)};}finally{db.close();}};
 let good=0,bad=0,variant=0;const errors=[],details=[];
 for(const {id,e} of items){
  console.error(id);
  const base=e.base||'sqlite';const ref=exec(e.sol,base,e);if(ref.r.error){errors.push([id,'reference',ref.r.error]);continue;}
  const judge=(q,d,spy)=>{const r=exec(q,d,e);return r.r.error||!same(r.set,ref.set,e.ord)||DX.mustFail(e,q,d)||r.plan||DX.varyantFail(e,q,d,{fresh,run,esit:spy||same,beklenen:ref.set});};
  let changed=0,cmp=0;
  const spy=(a,b,ord)=>{if(cmp++<(e.variants||[]).length&&!same(b,ref.set,e.ord))changed++;return same(a,b,ord);};
  for(const d of e.dl||(base==='sqlite'?DX.DIALECTS.map(x=>x.id):[base])){
   const q=d===base?e.sol:(e.solv&&e.solv[d])||(base==='sqlite'?DX.forward(e.sol,d):null);if(!q)continue;
   const err=judge(q,d,d===base?spy:null);good++;if(err)errors.push([id,'correct',d,err]);
  }
  for(const al of e.alt||[]){good++;const err=judge(al.sql,base);if(err)errors.push([id,'alternative',al.ad,err]);}
  if(e.variants?.length){variant+=e.variants.length;if(!changed)errors.push([id,'non-discriminating variants']);}
  const table=(e.sol.match(/\bFROM\s+([a-z_]\w*)/i)||[])[1];if(!table||!ref.set?.values.length)continue;
  for(const disguise of [false,true]){
   const q=ref.set.values.map(row=>'SELECT '+row.map((v,i)=>(disguise?'CASE WHEN COUNT(*) >= 0 THEN '+lit(v)+' ELSE '+lit(v)+' END':lit(v))+' AS "'+ref.set.columns[i].replace(/"/g,'')+'"').join(', ')+' FROM '+(disguise?table:'(SELECT '+(base==='tsql'?'TOP (1) ':'')+'1 AS x FROM '+table+(base==='tsql'?'':' LIMIT 1')+') q')).join(' UNION ALL ')+';';
   const err=judge(q,base);bad++;if(!err)errors.push([id,disguise?'disguised accepted':'literal accepted']);
  }
  details.push({id,variants:e.variants?.length||0,changed}); fs.writeFileSync(__dirname+'/sabit_regresyon.json',JSON.stringify({good,bad,variant,errors,details}));
 }
 // Somut atlatmalar: yorum, sahte EXPLAIN metni, CTE ve gereksiz ön SELECT.
 const e=allItems.find(x=>x.id==='alias-distinct#1').e; const r=exec(e.sol,'sqlite',e).set;
 const fake=r.values.map(v=>'SELECT '+lit(v[0])+' AS segment FROM (SELECT 1 FROM customers LIMIT 1)').join(' UNION ALL ');
 for(const q of ["SELECT segment FROM customers WHERE 1=0; "+fake, 'WITH q AS ('+fake+') SELECT * FROM q;', 'SELECT * FROM ('+fake+');']){bad++;if(!judgeExtra(e,q,r))errors.push(['wrapper accepted',q]);}
 function judgeExtra(e,q,ref){const r=exec(q,'sqlite',e);return r.r.error||!same(r.set,ref)||DX.mustFail(e,q,'sqlite')||DX.varyantFail(e,q,'sqlite',{fresh,run,esit:same,beklenen:ref});}
 for(const id of ['performans-lab#1','performans-lab#8','bv-plan#2']){const e=allItems.find(x=>x.id===id).e;const q=e.sol.slice(e.sol.indexOf('EXPLAIN'));const r=exec(q,'sqlite',e);bad++;if(!r.plan)errors.push([id,'missing index accepted']);}
 console.log(JSON.stringify({hedef:items.length,dogru:good,sahte:bad,senaryo:variant,HATA:errors.length,errors,details},null,2));process.exit(errors.length?1:0);
});
