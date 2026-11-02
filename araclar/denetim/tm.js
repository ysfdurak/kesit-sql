const c=require('./load.js');const initSqlJs=require('sql.js/dist/sql-asm.js');
initSqlJs().then(SQL=>{const db=new SQL.Database(require("./base.js")(SQL,c));c.SQLP_REGISTER(db);
for(const q of process.argv.slice(2)){const a=Date.now();const r=db.exec(q);console.log(Date.now()-a,'ms',JSON.stringify(r[0]&&r[0].values.slice(0,4)));}});
