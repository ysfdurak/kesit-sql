const c=require('./load.js');const initSqlJs=require('sql.js/dist/sql-asm.js');
initSqlJs().then(SQL=>{const db=new SQL.Database(); let t=Date.now();
const parts=c.SQLP_SEED.split(/;\n/); console.log('stmts',parts.length, 'len', c.SQLP_SEED.length);
let i=0; for(const p of parts){ const t0=Date.now(); try{ db.exec(p); }catch(e){} const dt=Date.now()-t0; if(dt>2000){ console.log('slow',i,dt,p.slice(0,120)); break; } i++; }
console.log('done', Date.now()-t);});
