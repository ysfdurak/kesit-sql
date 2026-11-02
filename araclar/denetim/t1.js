const initSqlJs=require('sql.js/dist/sql-asm.js'); global.window=globalThis; require(require('./yol.js').ROOT+'lk.js');
initSqlJs().then(SQL=>{ const db=new SQL.Database(); let t=Date.now(); db.exec(window.SQLP_SEED); console.log('seed ms',Date.now()-t);
 for(const q of process.argv.slice(2)){ t=Date.now(); const r=db.exec(q); console.log(Date.now()-t,'ms', JSON.stringify(r[0]&&r[0].values.slice(0,4))); } });
