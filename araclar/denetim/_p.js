const c=require('./load.js');const initSqlJs=require('sql.js/dist/sql-asm.js');const DX=c.SQLP_DIALECT;
const [d,coll,q]=process.argv.slice(2); DX.setCollation(coll,d);
initSqlJs().then(SQL=>{const BASE=require('./base.js')(SQL,c);const db=new SQL.Database(BASE);c.SQLP_REGISTER(db);DX.register(db);
const r=DX.runDialect(db,q,d);console.log(JSON.stringify(r).slice(0,900));});
