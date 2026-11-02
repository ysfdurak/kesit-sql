const c=require('./load.js');const initSqlJs=require('sql.js/dist/sql-asm.js');
initSqlJs().then(SQL=>{ const S=c.SQLP_SEED; const k=S.indexOf('CREATE TABLE lk_restaurants');
 for(const [nm,txt] of [['without',S.slice(0,k)],['lkonly',S.slice(k)]]){ const db=new SQL.Database(); const t=Date.now(); db.exec(txt); console.log(nm, txt.length, Date.now()-t); db.close(); } });
