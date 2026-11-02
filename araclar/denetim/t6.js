const initSqlJs=require('sql.js/dist/sql-asm.js'); global.window=globalThis; require(process.argv[2]);
initSqlJs().then(SQL=>{ const db=new SQL.Database(); let t=Date.now(); db.exec(window.SQLP_SEED); console.log('seed ms',Date.now()-t,'len',window.SQLP_SEED.length);
 for(const q of process.argv.slice(3)){ try{const r=db.exec(q); console.log('>',q.slice(0,80)); r[0]&&r[0].values.slice(0,14).forEach(v=>console.log('  ',v.join(' | ')));}catch(e){console.log('ERR',e.message)} } });
