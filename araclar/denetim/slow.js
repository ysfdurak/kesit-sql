const c=require('./load.js');const initSqlJs=require('sql.js/dist/sql-asm.js');
initSqlJs().then(SQL=>{const BASE=require("./base.js")(SQL,c);let db=new SQL.Database(BASE);c.SQLP_REGISTER(db);
const items=[];c.SQLP_LESSONS.forEach(l=>(l.ex||[]).forEach((e,i)=>{if(e.t!=='mc'&&/ik_|bk_/.test(e.sol||''))items.push([l.id+'#'+(i+1),e.sol]);}));
c.SQLP_PRACTICE.forEach(p=>{if(/ik_|bk_/.test(p.sol||''))items.push([p.id,p.sol]);});
let tot=0;for(const [id,s] of items){const a=Date.now();let n='';try{const r=db.exec(s);n=r.length?r[r.length-1].values.length:'-';}catch(e){n='ERR '+e.message}const t=Date.now()-a;tot+=t; if(t>700||/ERR|^0$/.test(String(n)))console.log(t,id,n); if(/CREATE|INSERT|UPDATE|DELETE|DROP/i.test(s)){db.close();db=new SQL.Database(BASE);c.SQLP_REGISTER(db);}}
console.log('total',items.length,tot+'ms');});
