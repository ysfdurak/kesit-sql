// Gerçek PostgreSQL denetimi (PGlite, WASM). Ders alıştırmaları, pratik görevleri ve Arena çözümleri
// DX.forward çıktısıyla gerçek motorda çalıştırılır, sonuç taklit motorun beklenen sonucuyla karşılaştırılır.
// bk_* tabloları ve DML/DDL çözümleri dahil. Çalıştırma: node pg_denetim.mjs   (FILTER=^ik- ile daraltılır)
// Takılan sorgu 45 saniyede öldürülür, "zamanasimi" diye yazılır. Sonuç: pg_audit.json, özet ekrana.
// Bilinen, gerekçesi yazılı farklar pg_bilinen.json dosyasındadır; temiz sonuç "BILINMEYEN 0" demektir.
import {createRequire} from 'module'; import fs from 'fs'; import {spawn} from 'child_process'; import {fileURLToPath} from 'url'; import path from 'path';
const here=path.dirname(fileURLToPath(import.meta.url)); process.chdir(here); const require=createRequire(import.meta.url);
const OUT='pg_audit.json', CUR='pg_cur.txt', TAR='pg_taban.tgz', PART='pg_parca.jsonl';
if(!process.argv.includes('--child')){
  for(const f of [PART,CUR]) try{ fs.unlinkSync(f); }catch(e){}
  const skip=[]; const t0=Date.now();
  const loop=()=>new Promise(res=>{ const p=spawn(process.execPath,[fileURLToPath(import.meta.url),'--child'],{stdio:['ignore','inherit','inherit'],env:{...process.env,PG_SKIP:JSON.stringify(skip)}});
    let last='',ch=Date.now(); const iv=setInterval(()=>{ let c=''; try{c=fs.readFileSync(CUR,'utf8');}catch(e){} if(c!==last){last=c;ch=Date.now();} if(c&&Date.now()-ch>45000){ fs.appendFileSync(PART,JSON.stringify({id:c,status:'zamanasimi'})+'\n'); skip.push(c); p.kill('SIGKILL'); } },2000);
    p.on('exit',code=>{ clearInterval(iv); res(code); }); });
  let code, n=0; do{ const before=skip.length; code=await loop(); if(code!==0&&skip.length===before){ console.error('alt surec beklenmedik sekilde bitti'); process.exit(1); } }while(code!==0);
  const res=fs.readFileSync(PART,'utf8').trim().split('\n').map(x=>JSON.parse(x)); fs.writeFileSync(OUT,JSON.stringify(res,null,1)); try{fs.unlinkSync(PART);fs.unlinkSync(CUR);}catch(e){}
  const known=JSON.parse(fs.readFileSync('pg_bilinen.json','utf8')); const by={}; res.forEach(r=>by[r.status]=(by[r.status]||0)+1);
  const bad=res.filter(r=>r.status!=='ayni'&&!known[r.id]); const gone=Object.keys(known).filter(k=>!res.some(r=>r.id===k&&r.status!=='ayni'));
  console.log('toplam',res.length,by); console.log('bilinen fark',res.filter(r=>r.status!=='ayni'&&known[r.id]).length,'gereksiz bilinen kayit',gone.length, gone.join(' ')); console.log('BILINMEYEN',bad.length); bad.slice(0,400).forEach(r=>console.log(r.status,r.id,(r.msg||JSON.stringify(r.diff)||'').slice(0,140)));
  console.log('sure',Math.round((Date.now()-t0)/1000)+'s'); process.exit(0);
}
const c=require('./load.js'); const initSqlJs=require('sql.js/dist/sql-asm.js');
const DX=c.SQLP_DIALECT;
{ const dc=[],tc=[],all=[],dt=[]; for(const t of Object.keys(c.SQLP_COLMETA)) for(const [col,ty] of c.SQLP_COLMETA[t]){ all.push(col); if(/date/.test(ty)) dc.push(col); if(ty==='datetime') dt.push(col); if(/^text/.test(ty)) tc.push(col); } DX.setSchemaHints(dc,tc,all,dt); }
require('vm').runInContext(fs.readFileSync(require('./yol.js').ROOT+'arena-data.js','utf8'),c);
const SQL=await initSqlJs(); const BASE=require('./base.js')(SQL,c);
const fresh=()=>{ const db=new SQL.Database(BASE); c.SQLP_REGISTER(db); DX.register(db); return db; };
const {PGlite}=await import('@electric-sql/pglite');
let pg;
if(fs.existsSync(TAR) && fs.statSync(TAR).mtimeMs>fs.statSync('base.sqlite').mtimeMs){ pg=await PGlite.create({loadDataDir:new Blob([fs.readFileSync(TAR)])}); }
else {
  pg=await PGlite.create(); const db=new SQL.Database(BASE);
  const tabs=db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")[0].values.map(r=>r[0]);
  for(const t of tabs){ const M=Object.fromEntries((c.SQLP_COLMETA[t]||[]).map(x=>[x[0],x[1]])); const r=db.exec('SELECT * FROM "'+t+'"')[0]; const cols=r?r.columns:db.exec(`SELECT name FROM pragma_table_info('${t}')`)[0].values.map(x=>x[0]);
    const pk=(c.SQLP_COLMETA[t]||[]).filter(x=>x[3]==='pk').map(x=>'"'+x[0]+'"'); await pg.exec(`CREATE TABLE ${t} (${cols.map(x=>`"${x}" ${M[x]?c.SQLP_TYPE(M[x],'pg'):'TEXT'}`).join(',')}${pk.length?', PRIMARY KEY ('+pk.join(',')+')':''})`); if(!r) continue;
    const isb=cols.map(x=>M[x]==='bit'); const lit=(v,j)=>v===null?'NULL':isb[j]?(v?'TRUE':'FALSE'):typeof v==='number'?String(v):"'"+String(v).replace(/'/g,"''")+"'";
    for(let i=0;i<r.values.length;i+=2000) await pg.exec(`INSERT INTO ${t} VALUES ${r.values.slice(i,i+2000).map(x=>'('+x.map(lit).join(',')+')').join(',')}`); }
  for(const q of ['orders(customer_id)','order_items(order_id)','lk_orders(customer_id)','lk_orders(restaurant_id)','lk_orders(courier_id)','lk_order_lines(order_id)','bank_txns(account_id)','ik_salaries(emp_id)','hv_flights(route_id)','hv_flights(aircraft_id)','bk_trips(bike_id)','bk_trips(user_id)','bk_trips(start_station)']) try{ await pg.exec(`CREATE INDEX ON ${q}`);}catch(e){}
  await pg.exec('ANALYZE'); const blob=await pg.dumpDataDir('gzip'); fs.writeFileSync(TAR,Buffer.from(await blob.arrayBuffer())); db.close();
}
const p2=x=>String(x).padStart(2,'0');
function nv(v){ if(v===null||v===undefined) return '∅'; if(v instanceof Date){ const d=v.getUTCFullYear()+'-'+p2(v.getUTCMonth()+1)+'-'+p2(v.getUTCDate()), t=p2(v.getUTCHours())+':'+p2(v.getUTCMinutes())+':'+p2(v.getUTCSeconds()); return t==='00:00:00'?d:d+' '+t; }
  if(typeof v==='boolean') return v?'1':'0'; if(typeof v==='object') v=JSON.stringify(v); if(typeof v==='bigint') v=String(v);
  if(typeof v==='number') return String(Math.round(v*100)/100);
  let s=String(v).trim(); if(/^-?\d+(\.\d+)?$/.test(s)) return String(Math.round(+s*100)/100); if(/^-?\d+(\.\d+)?e[+-]?\d+$/i.test(s)) return String(Math.round(+s*100)/100);
  s=s.replace(/^(\d{4}-\d\d-\d\d)[ T](\d\d:\d\d)(:00)?(\.0+)?$/,'$1 $2:00').replace(/^(\d{4}-\d\d-\d\d) 00:00:00$/,'$1'); if(/^[\[{]/.test(s)) s=s.replace(/([:,])\s+/g,'$1'); return s; }
const fold=s=>s.replace(/[İIı]/g,'i').toLocaleLowerCase('en');
const eqSet=(A,B)=>{ const a=[...A].sort(),b=[...B].sort(); let k=a.findIndex((x,i)=>x!==b[i]); return k<0?null:{pg:a[k],em:b[k]}; };
const exBase=e=>e.base||'sqlite', DIDS=DX.DIALECTS.map(d=>d.id), exAllowed=e=>e.dl||(exBase(e)==='sqlite'?DIDS:[exBase(e)]);
const items=[]; const FL=process.env.FILTER?new RegExp(process.env.FILTER):null;
c.SQLP_LESSONS.forEach(l=>(l.ex||[]).forEach((e,i)=>{ if(e.t!=='mc'&&e.sol) items.push({id:l.id+'#'+i,e}); }));
c.SQLP_PRACTICE.forEach(p=>{ if(p.sol) items.push({id:'P:'+p.id,e:p}); });
(c.SQLP_ARENA||{ch:[]}).ch.forEach(x=>{ if(x.sol) items.push({id:'A:'+x.id,e:{sol:x.sol,ord:x.ord}}); });
const skip=new Set(JSON.parse(process.env.PG_SKIP||'[]'));
let doneIds=new Set(); try{ fs.readFileSync(PART,'utf8').trim().split('\n').forEach(x=>{ if(x) doneIds.add(JSON.parse(x).id); }); }catch(e){}
// İşlem komutları dış BEGIN…ROLLBACK'i bozmasın: her çözüm tek bir dış işlem içinde çalışır, veri asla kalıcı değişmez.
const txSafe=sql=>{ let out='',cur=''; for(const t of DX.tokenize(sql)){ if(t.v===';'&&t.k!=='s'&&t.k!=='com'){ const st=cur.trim(); out+=/^(BEGIN(\s+TRANSACTION)?|START\s+TRANSACTION)$/i.test(st)?'SAVEPOINT tx_d;':/^COMMIT$/i.test(st)?'RELEASE SAVEPOINT tx_d;':/^ROLLBACK$/i.test(st)?'ROLLBACK TO SAVEPOINT tx_d;':cur+';'; cur=''; } else cur+=t.v; } const st=cur.trim(); return out+(/^COMMIT$/i.test(st)?'RELEASE SAVEPOINT tx_d;':/^ROLLBACK$/i.test(st)?'ROLLBACK TO SAVEPOINT tx_d;':cur); };
const emptyEnv=()=>({procs:{},funcs:{},tvfs:{},tran:0,nocount:false});
for(const it of items){ const {id,e}=it; if(FL&&!FL.test(id)) continue; if(doneIds.has(id)||skip.has(id)) continue; if(!exAllowed(e).includes('pg')&&!(e.solv&&e.solv.pg)) continue;
  const b=exBase(e); let text; try{ text=(e.solv&&e.solv.pg)||(b==='pg'?e.sol:b==='sqlite'?DX.forward(e.sol,'pg'):null); }catch(er){ text=null; } if(!text) continue;
  fs.writeFileSync(CUR,id);
  const db=fresh(); const r=DX.runDialect(db,e.sol,b,{env:emptyEnv()}); let set=r.sets&&r.sets.length?r.sets[r.sets.length-1]:null; if(!r.error&&e.check){ try{ set=db.exec(e.check).pop()||null; }catch(er){ r.error=er.message; } } db.close();
  const rec={id,sql:text}; const cs=/\b(UPPER|LOWER|INITCAP)\s*\(/i.test(text);
  try{ await pg.exec('BEGIN'); const out=await pg.exec(txSafe(text),{rowMode:'array'}); let last=null; for(const x of out) if(x.fields&&x.fields.length) last=x;
    if(e.check&&/pragma_|sqlite_master|sqlite_schema/i.test(e.check)){ last=null; set=null; rec.not='yapı denetimi SQLite kataloğuna bakıyor; yalnız DDL çalıştı'; }
    else if(e.check){ const ck=await pg.exec(DX.forward(e.check,'pg'),{rowMode:'array'}); last=ck.filter(x=>x.fields&&x.fields.length).pop()||null; }
    await pg.exec('ROLLBACK');
    if(r.error){ rec.status='emuHata'; rec.msg=r.error; }
    else if(!set&&!last){ rec.status='ayni'; }
    else if(!set||!last){ rec.status='fark'; rec.diff={sonuc:'biri bos',pg:!!last,em:!!set}; }
    else if(last.fields.length!==set.columns.length){ rec.status='fark'; rec.diff={sutun:[last.fields.length,set.columns.length]}; }
    else { let A=last.rows.map(x=>x.map(nv).join('␟')), B=set.values.map(x=>x.map(nv).join('␟')); if(cs){A=A.map(fold);B=B.map(fold);}
      if(A.length!==B.length){ rec.status='fark'; rec.diff={satir:[A.length,B.length]}; } else { const d=eqSet(A,B); rec.status=d?'fark':'ayni'; if(d) rec.diff=d; } }
  }catch(er){ try{ await pg.exec('ROLLBACK'); }catch(_){} rec.status='pgHata'; rec.msg=er.message; }
  if(rec.status==='ayni') delete rec.sql;
  fs.appendFileSync(PART,JSON.stringify(rec)+'\n');
}
if(!fs.existsSync(PART)) fs.writeFileSync(PART,'');
process.exit(0);
