const c=require('./load.js');const initSqlJs=require('sql.js/dist/sql-asm.js');const FL=new RegExp(process.env.FILTER);
initSqlJs().then(SQL=>{const B=require("./base.js")(SQL,c);
c.SQLP_LESSONS.filter(l=>FL.test(l.id)).forEach(l=>(l.ex||[]).forEach((e,i)=>{if(e.t==='mc')return;const db=new SQL.Database(B);c.SQLP_REGISTER(db);c.SQLP_DIALECT.register(db);
let r;try{r=db.exec(e.sol);if(e.check)r=db.exec(e.check);}catch(x){console.log(l.id,i,'ERR',x.message);return;}const s=r.pop();
db.close();console.log(l.id+'#'+i, s?s.values.length+' rows: '+s.columns.join(',')+' | '+s.values.slice(0,3).map(v=>v.join('/')).join(' ; '):'-');}));
(c.SQLP_PRACTICE||[]).filter(p=>FL.test(p.id)).forEach(e=>{const db=new SQL.Database(B);c.SQLP_REGISTER(db);c.SQLP_DIALECT.register(db);let r;try{r=db.exec(e.sol);if(e.check)r=db.exec(e.check);}catch(x){console.log(e.id,'ERR',x.message);return;}const s=r.pop();db.close();console.log(e.id, s?s.values.length+' rows: '+s.columns.join(',')+' | '+s.values.slice(0,3).map(v=>v.join('/')).join(' ; '):'-');});});
