const initSqlJs=require('sql.js/dist/sql-asm.js'); global.window=globalThis; require(require('./yol.js').ROOT+'bk.js');
initSqlJs().then(SQL=>{ const db=new SQL.Database(); const S=window.SQLP_SEED; const parts=S.split(/;\n(?=INSERT INTO |CREATE |DROP |UPDATE |ALTER |\n|$)/);
 for(const p of parts){ if(!p.trim()) continue; const t=Date.now(); db.exec(p); const dt=Date.now()-t; if(dt>300) console.log(dt,'ms',p.replace(/\s+/g,' ').slice(0,90)); } });
