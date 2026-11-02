const c=require('./load.js');global.window=c;require(require('./yol.js').ROOT+'arena-data.js');
const A=c.SQLP_ARENA||global.window.SQLP_ARENA;
const initSqlJs=require('sql.js/dist/sql-asm.js');
initSqlJs().then(SQL=>{const db=new SQL.Database(require("./base.js")(SQL,c));c.SQLP_REGISTER(db);
const t=Date.now;
for(const d of A.det.filter(x=>x.id==='giden-yetenek')) d.steps.forEach((s,i)=>{const r=db.exec(s.sol);console.log('det',i+1,JSON.stringify(r[0]&&r[0].values.slice(0,3)));});
for(const ch of A.ch.filter(x=>x.set==='ik'||x.set==='bisiklet')){const a=t();try{const r=db.exec(ch.sol);console.log(ch.id,(t()-a)+'ms',JSON.stringify(r[0]&&r[0].values.slice(0,5)));}catch(e){console.log(ch.id,'ERR',e.message)}}
for(const p of A.pred.filter(x=>/t1[7-9]|t20/.test(x.id))) for(const q of [p.sql,...p.traps]){try{console.log(p.id,JSON.stringify(db.exec(q)[0].values[0]))}catch(e){console.log(p.id,'ERR',e.message)}}
for(const p of A.pz.filter(x=>/b1[3-5]/.test(x.id))){try{console.log(p.id,JSON.stringify(db.exec(p.lines.join('\n'))[0].values.slice(0,2)))}catch(e){console.log(p.id,'ERR',e.message)}}
});
