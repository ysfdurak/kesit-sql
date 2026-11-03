// veri_atama_bk.py için trip_id -> üreteç sırası (i) eşlemesi: tohumda bisiklet sütununa geçici olarak i yazıp SQLite'ta çalıştırır.
// Kullanım: node i_esleme.js [cikti.json]   (varsayılan /tmp/bk_imap.json)
const fs=require('fs');const R=require('./yol.js').ROOT+'';const initSqlJs=require('sql.js/dist/sql-asm.js');
globalThis.SQLP_SEED='';require(R+'bk.js');
let s=globalThis.SQLP_SEED.replace(/\/\*BK_N\*\/\d+/g,'132000').replace('t.user_id, COALESCE(a.b, t.bike_id), t.bas,','t.user_id, t.i, t.bas,');
initSqlJs().then(SQL=>{const d=new SQL.Database();d.exec(s);const m={};const r=d.exec('select trip_id,bike_id from bk_trips')[0].values;r.forEach(x=>m[x[0]]=x[1]);fs.writeFileSync(process.argv[2]||'/tmp/bk_imap.json',JSON.stringify(m));console.log('esleme',r.length);});
