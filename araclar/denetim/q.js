const c=require('./load.js');const initSqlJs=require('sql.js/dist/sql-asm.js');
initSqlJs().then(SQL=>{const db=new SQL.Database(require("./base.js")(SQL,c));c.SQLP_REGISTER(db);
for(const q of process.argv.slice(2)){const r=db.exec(q);console.log(r.length?[r[0].columns.join('|'),...r[0].values.slice(0,25).map(v=>v.join('|'))].join('\n'):'(bos)');console.log('--');}});
